/**
 * @file ensureSchema.js
 * @description Automatic database upgrades, run when the server starts.
 * Each step runs only once (recorded in the Schema_Migrations table), so it is
 * safe for both new databases and ones created from an older pos_schema.sql.
 * After the steps, syncCatalog() adds any new items from catalog.js (every start).
 */

'use strict';

const pool = require('./db');
const { MENU_ITEMS, STOCK_ITEMS, DEFAULT_PORTIONS, WHOLE_UNITS } = require('./catalog');
const { schemaStatement } = require('../utils/sqlFile');

/** Adds a column only if it is missing. */
async function addColumnIfMissing(table, column, definition) {
  const [rows] = await pool.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  if (rows.length === 0) {
    await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  }
}

/**
 * Changes the Users foreign key on <table>.User_ID to ON DELETE SET NULL, so a
 * staff member can be deleted even when they have transaction history: the
 * history rows stay, their User_ID just becomes NULL (unattributed). InnoDB
 * runs the SET NULL itself and does NOT fire the append-only triggers, so the
 * ledger / waste history are never actually edited by hand.
 */
async function makeUserFkSetNull(table) {
  const [[fk]] = await pool.query(
    `SELECT rc.CONSTRAINT_NAME AS name, rc.DELETE_RULE AS rule
       FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
       JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
         ON kcu.CONSTRAINT_SCHEMA = rc.CONSTRAINT_SCHEMA
        AND kcu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
      WHERE rc.CONSTRAINT_SCHEMA = DATABASE()
        AND rc.TABLE_NAME = ?
        AND rc.REFERENCED_TABLE_NAME = 'Users'
        AND kcu.COLUMN_NAME = 'User_ID'
      LIMIT 1`,
    [table]
  );
  if (!fk || fk.rule === 'SET NULL') return; // already done or no such FK

  await pool.query(`ALTER TABLE \`${table}\` DROP FOREIGN KEY \`${fk.name}\``);
  await pool.query(`ALTER TABLE \`${table}\` MODIFY User_ID INT UNSIGNED NULL`);
  await pool.query(
    `ALTER TABLE \`${table}\` ADD CONSTRAINT \`${fk.name}\`
       FOREIGN KEY (User_ID) REFERENCES Users(User_ID) ON DELETE SET NULL`
  );
}

/**
 * Changes one stock balance and records the change in the ledger as an
 * Adjustment (the same two steps as sp_adjust_stock), inside the caller's transaction.
 */
async function adjustStock(conn, stockId, delta, note) {
  await conn.query('UPDATE Stock_Items SET Current_Quantity = Current_Quantity + ? WHERE Stock_ID = ?', [
    delta,
    stockId,
  ]);
  await conn.query(
    "INSERT INTO Stock_Movements (Stock_ID, Type, Quantity, User_ID, Note) VALUES (?, 'Adjustment', ?, NULL, ?)",
    [stockId, delta, note]
  );
}

/**
 * Migration 007, part 1: Half Juicy Chicken gets its own stock (it used 0.5 of a
 * Whole Juicy Chicken). The new stock starts at 0, except that a leftover half in
 * the Whole Juicy Chicken stock (e.g. 8.5 after selling halves) becomes 1 Half.
 */
async function giveHalfChickenOwnStock(conn) {
  const half = STOCK_ITEMS.find((s) => s.name === 'Half Juicy Chicken');
  await conn.query(
    'INSERT IGNORE INTO Stock_Items (Stock_Name, Unit, Current_Quantity, Minimum_Level) VALUES (?, ?, 0, ?)',
    [half.name, half.unit, half.minLevel]
  );
  const [[halfStock]] = await conn.query('SELECT Stock_ID AS id FROM Stock_Items WHERE Stock_Name = ? FOR UPDATE', [
    half.name,
  ]);

  // One order of Half Juicy Chicken now uses 1 Half Juicy Chicken.
  await conn.query(
    'DELETE r FROM Recipe_Portions r JOIN Menu_Items m ON m.Item_ID = r.Item_ID WHERE m.Item_Name = ?',
    [half.name]
  );
  await conn.query(
    'INSERT INTO Recipe_Portions (Item_ID, Stock_ID, Quantity_Used) SELECT Item_ID, ?, 1 FROM Menu_Items WHERE Item_Name = ?',
    [halfStock.id, half.name]
  );

  const [[whole]] = await conn.query(
    `SELECT Stock_ID AS id, Current_Quantity - FLOOR(Current_Quantity) AS fraction
       FROM Stock_Items WHERE Stock_Name = 'Whole Juicy Chicken' FOR UPDATE`
  );
  const fraction = Number(whole?.fraction) || 0;
  if (fraction > 0) {
    await adjustStock(conn, whole.id, -fraction, 'Leftover half chicken moved to Half Juicy Chicken stock');
    const halves = Math.floor(fraction * 2 + 1e-9);
    if (halves > 0) {
      await adjustStock(conn, halfStock.id, halves, 'Leftover half chicken from Whole Juicy Chicken stock');
    }
  }
}

/** Migration 007, part 2: Sarsa (Gravy) is counted in packs (it was liters), 1 pack per order. */
async function countSarsaInPacks(conn) {
  const sarsa = STOCK_ITEMS.find((s) => s.name === 'Sarsa (Gravy)');
  const [[row]] = await conn.query('SELECT Stock_ID AS id, Unit AS unit FROM Stock_Items WHERE Stock_Name = ? FOR UPDATE', [
    sarsa.name,
  ]);
  if (!row) return;
  if (row.unit !== sarsa.unit) {
    await conn.query('UPDATE Stock_Items SET Unit = ?, Minimum_Level = ? WHERE Stock_ID = ?', [
      sarsa.unit,
      sarsa.minLevel,
      row.id,
    ]);
  }
  await conn.query(
    `UPDATE Recipe_Portions r JOIN Menu_Items m ON m.Item_ID = r.Item_ID
        SET r.Quantity_Used = 1
      WHERE m.Item_Name = ? AND r.Stock_ID = ?`,
    [sarsa.name, row.id]
  );
}

/** Migration 007, part 3: any stock counted in pieces or packs is rounded down to a whole number. */
async function roundDownToWholeNumbers(conn) {
  const [rows] = await conn.query(
    `SELECT Stock_ID AS id, Current_Quantity - FLOOR(Current_Quantity) AS fraction
       FROM Stock_Items
      WHERE Unit IN (?) AND Current_Quantity <> FLOOR(Current_Quantity)
      FOR UPDATE`,
    [WHOLE_UNITS]
  );
  for (const r of rows) {
    await adjustStock(conn, r.id, -Number(r.fraction), 'Rounded down: stock is counted in whole numbers');
  }
}

/** Ordered list of one-time upgrades. Never edit or reorder old entries — add new ones. */
const MIGRATIONS = [
  {
    id: '001_users_suspended_until',
    description: 'Users.Suspended_Until column (timed suspensions)',
    run: () => addColumnIfMissing('Users', 'Suspended_Until', 'DATETIME NULL AFTER Employment_Date'),
  },
  {
    id: '002_store_menu_and_portions',
    description: 'Mr. Liempo menu (store prices), stock items and default portions',
    run: async () => {
      await pool.query('INSERT IGNORE INTO Menu_Items (Item_Name, Price, Category) VALUES ?', [
        MENU_ITEMS.map((m) => [m.name, m.price, m.category]),
      ]);
      // Earlier seed had Half Juicy Chicken at 285; the store price is 165.
      await pool.query(
        "UPDATE Menu_Items SET Price = 165 WHERE Item_Name = 'Half Juicy Chicken' AND Price = 285"
      );
      await pool.query(
        'INSERT IGNORE INTO Stock_Items (Stock_Name, Unit, Current_Quantity, Minimum_Level) VALUES ?',
        [STOCK_ITEMS.map((s) => [s.name, s.unit, 0, s.minLevel])]
      );
      // Only adds a portion where the item has no recipe yet (never overwrites yours).
      for (const p of DEFAULT_PORTIONS) {
        await pool.query(
          `INSERT INTO Recipe_Portions (Item_ID, Stock_ID, Quantity_Used)
           SELECT m.Item_ID, s.Stock_ID, ?
             FROM Menu_Items m JOIN Stock_Items s ON s.Stock_Name = ?
            WHERE m.Item_Name = ?
              AND NOT EXISTS (SELECT 1 FROM Recipe_Portions r WHERE r.Item_ID = m.Item_ID)`,
          [p.quantityUsed, p.stock, p.item]
        );
      }
    },
  },
  {
    id: '003_delete_staff_with_history',
    description: 'Allow deleting staff who have transactions (history kept, unattributed)',
    run: async () => {
      await makeUserFkSetNull('Orders');
      await makeUserFkSetNull('Stock_Movements');
      await makeUserFkSetNull('Waste_Log');
    },
  },
  {
    id: '004_stock_items_match_menu',
    description: 'Stock items = POS menu items (hides Raw Chicken, Raw Pork and other non-menu stock)',
    run: async () => {
      // Hide instead of delete: restock / sale / waste history still points at the
      // old rows, and that history is append-only (it can never be deleted).
      await addColumnIfMissing('Stock_Items', 'Is_Active', 'BOOLEAN NOT NULL DEFAULT TRUE');

      // Stock for menu items that used to draw from raw stock (starts at 0 — use Restock).
      await pool.query(
        'INSERT IGNORE INTO Stock_Items (Stock_Name, Unit, Current_Quantity, Minimum_Level) VALUES ?',
        [STOCK_ITEMS.map((s) => [s.name, s.unit, 0, s.minLevel])]
      );

      // Only stock named exactly like an active menu item stays visible.
      await pool.query(
        `UPDATE Stock_Items s
            SET s.Is_Active = EXISTS (
                  SELECT 1 FROM Menu_Items m WHERE m.Item_Name = s.Stock_Name AND m.Is_Active = 1)`
      );

      // Portions that used hidden stock (e.g. Whole Juicy Chicken -> Raw Chicken) are
      // replaced with the defaults (Whole -> Whole Juicy Chicken, Half -> 0.5 of it, ...).
      // Portions that already use a visible stock are left as you set them.
      await pool.query(
        `DELETE r FROM Recipe_Portions r
           JOIN Stock_Items s ON s.Stock_ID = r.Stock_ID
          WHERE s.Is_Active = 0`
      );
      for (const p of DEFAULT_PORTIONS) {
        await pool.query(
          `INSERT INTO Recipe_Portions (Item_ID, Stock_ID, Quantity_Used)
           SELECT m.Item_ID, s.Stock_ID, ?
             FROM Menu_Items m JOIN Stock_Items s ON s.Stock_Name = ? AND s.Is_Active = 1
            WHERE m.Item_Name = ?
              AND NOT EXISTS (SELECT 1 FROM Recipe_Portions r WHERE r.Item_ID = m.Item_ID)`,
          [p.quantityUsed, p.stock, p.item]
        );
      }
    },
  },
  {
    id: '005_waste_on_chosen_date',
    description: 'Record Waste saves the date picked on the screen (sp_record_waste_on)',
    run: async () => {
      // Same SQL as database/pos_schema.sql. No DELIMITER needed: each CREATE is sent on its own.
      await pool.query('DROP PROCEDURE IF EXISTS sp_record_waste_on');
      await pool.query(
        `CREATE PROCEDURE sp_record_waste_on(IN p_user INT UNSIGNED, IN p_req CHAR(36), IN p_stock INT UNSIGNED,
                                             IN p_qty DECIMAL(12,3), IN p_reason VARCHAR(255), IN p_date DATE,
                                             OUT o_waste_id INT UNSIGNED)
         BEGIN
           DECLARE v_bal DECIMAL(12,3);
           DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
           IF p_date > CURDATE() THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Waste date cannot be in the future'; END IF;
           START TRANSACTION;
           SELECT Current_Quantity INTO v_bal FROM Stock_Items WHERE Stock_ID=p_stock FOR UPDATE;
           IF v_bal IS NULL OR v_bal < p_qty THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Unknown stock item or waste exceeds balance'; END IF;
           INSERT INTO Waste_Log(Stock_ID, Quantity, Reason, Date, User_ID, Client_Request_ID)
             VALUES (p_stock, p_qty, p_reason, COALESCE(TIMESTAMP(p_date, CURTIME()), NOW()), p_user, p_req);
           SET o_waste_id = LAST_INSERT_ID();
           UPDATE Stock_Items SET Current_Quantity = Current_Quantity - p_qty WHERE Stock_ID=p_stock;
           INSERT INTO Stock_Movements(Stock_ID, Type, Quantity, User_ID, Waste_ID) VALUES (p_stock,'Waste',-p_qty,p_user,o_waste_id);
           COMMIT;
         END`
      );
      await pool.query('DROP PROCEDURE IF EXISTS sp_record_waste');
      await pool.query(
        `CREATE PROCEDURE sp_record_waste(IN p_user INT UNSIGNED, IN p_req CHAR(36), IN p_stock INT UNSIGNED,
                                          IN p_qty DECIMAL(12,3), IN p_reason VARCHAR(255), OUT o_waste_id INT UNSIGNED)
         BEGIN
           CALL sp_record_waste_on(p_user, p_req, p_stock, p_qty, p_reason, NULL, o_waste_id);
         END`
      );
    },
  },
  {
    id: '006_order_temp_table_primary_key',
    description: 'Saving an order works on online MySQL too (sp_create_order temp table has a primary key)',
    run: async () => {
      // The exact procedure from database/pos_schema.sql, so the two never differ.
      const createOrder = schemaStatement(/^CREATE\s+PROCEDURE\s+sp_create_order\b/i);
      await pool.query('DROP PROCEDURE IF EXISTS sp_create_order');
      await pool.query(createOrder);
    },
  },
  {
    id: '007_half_chicken_stock_and_whole_numbers',
    description: 'Half Juicy Chicken has its own stock; Sarsa (Gravy) is counted in whole packs',
    run: async () => {
      // One transaction: every balance change is recorded in the ledger, or none is.
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        await giveHalfChickenOwnStock(conn);
        await countSarsaInPacks(conn);
        await roundDownToWholeNumbers(conn);
        await conn.commit();
      } catch (err) {
        await conn.rollback().catch(() => {});
        throw err;
      } finally {
        conn.release();
      }
    },
  },
];

/**
 * Adds items that are new in catalog.js. Runs on every start, so adding an item
 * to the catalog and restarting the backend is enough. Safe to repeat:
 * - menu and stock rows are only inserted if missing (prices you changed stay);
 * - a stock item is visible only while an active menu item has the same name;
 * - a default portion is added only to a menu item that has none yet.
 */
async function syncCatalog() {
  const [menuResult] = await pool.query(
    'INSERT IGNORE INTO Menu_Items (Item_Name, Price, Category) VALUES ?',
    [MENU_ITEMS.map((m) => [m.name, m.price, m.category])]
  );
  const [stockResult] = await pool.query(
    'INSERT IGNORE INTO Stock_Items (Stock_Name, Unit, Current_Quantity, Minimum_Level) VALUES ?',
    [STOCK_ITEMS.map((s) => [s.name, s.unit, 0, s.minLevel])]
  );
  await pool.query(
    `UPDATE Stock_Items s
        SET s.Is_Active = EXISTS (
              SELECT 1 FROM Menu_Items m WHERE m.Item_Name = s.Stock_Name AND m.Is_Active = 1)`
  );
  let portionsAdded = 0;
  for (const p of DEFAULT_PORTIONS) {
    const [r] = await pool.query(
      `INSERT INTO Recipe_Portions (Item_ID, Stock_ID, Quantity_Used)
       SELECT m.Item_ID, s.Stock_ID, ?
         FROM Menu_Items m JOIN Stock_Items s ON s.Stock_Name = ? AND s.Is_Active = 1
        WHERE m.Item_Name = ?
          AND NOT EXISTS (SELECT 1 FROM Recipe_Portions r WHERE r.Item_ID = m.Item_ID)`,
      [p.quantityUsed, p.stock, p.item]
    );
    portionsAdded += r.affectedRows;
  }
  if (menuResult.affectedRows || stockResult.affectedRows || portionsAdded) {
    console.log(
      `Catalog synced: ${menuResult.affectedRows} new menu item(s), ` +
        `${stockResult.affectedRows} new stock item(s), ${portionsAdded} new portion(s).`
    );
  }
}

async function ensureSchema() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS Schema_Migrations (
       Migration_ID VARCHAR(100) PRIMARY KEY,
       Applied_At   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
     ) ENGINE=InnoDB`
  );
  const [done] = await pool.query('SELECT Migration_ID FROM Schema_Migrations');
  const applied = new Set(done.map((r) => r.Migration_ID));

  for (const m of MIGRATIONS) {
    if (applied.has(m.id)) continue;
    await m.run();
    await pool.query('INSERT INTO Schema_Migrations (Migration_ID) VALUES (?)', [m.id]);
    console.log(`Database updated: ${m.description}`);
  }

  await syncCatalog();
}

module.exports = ensureSchema;

// TEST: migration 007 on a database with Whole Juicy Chicken 8.5 -> Whole 8, Half Juicy Chicken stock 1,
//       Half's portion = 1 of its own stock, and two Adjustment rows in Stock_Movements
// TEST: migration 007 with Sarsa 4.9 L -> Sarsa 4 packs (minimum 10), portion 1, one Adjustment row of -0.9
// TEST: migration 007 on a new database changes nothing (catalog already has the new values)
