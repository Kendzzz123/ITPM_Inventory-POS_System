/**
 * @file ensureSchema.js
 * @description Automatic database upgrades, run when the server starts.
 * Each step runs only once (recorded in the Schema_Migrations table), so it is
 * safe for both new databases and ones created from an older pos_schema.sql.
 */

'use strict';

const pool = require('./db');
const { MENU_ITEMS, STOCK_ITEMS, DEFAULT_PORTIONS } = require('./catalog');

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
];

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
}

module.exports = ensureSchema;
