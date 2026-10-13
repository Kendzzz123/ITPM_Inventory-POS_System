
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS=0;

CREATE TABLE Users (
  User_ID         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  Name            VARCHAR(100) NOT NULL,
  Username        VARCHAR(50)  NOT NULL,
  Password_Hash   VARCHAR(255) NOT NULL,          -- renamed from Password; bcrypt/argon2 output only
  Role            ENUM('manager','cashier') NOT NULL DEFAULT 'cashier',
  Status          ENUM('active','suspended') NOT NULL DEFAULT 'active',
  Email           VARCHAR(150) NULL,
  Phone           VARCHAR(20)  NULL,
  Employment_Date DATE NOT NULL,
  Created_At      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_users_username UNIQUE (Username),
  CONSTRAINT uq_users_email    UNIQUE (Email),
  CONSTRAINT ck_users_username CHECK (Username = TRIM(Username) AND CHAR_LENGTH(Username) >= 3),
  CONSTRAINT ck_users_email    CHECK (Email IS NULL OR (Email = TRIM(Email) AND Email LIKE '_%@_%.__%')),
  CONSTRAINT ck_users_pwhash   CHECK (CHAR_LENGTH(Password_Hash) >= 60)   -- rejects plaintext / short digests
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE OTP_Codes (
  OTP_ID        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  User_ID       INT UNSIGNED NOT NULL,
  Code_Hash     VARCHAR(255) NOT NULL,
  Purpose       ENUM('password_reset','verify_account') NOT NULL,
  Created_At    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  Expires_At    DATETIME NOT NULL,
  Attempts      TINYINT UNSIGNED NOT NULL DEFAULT 0,
  Closed_At     DATETIME NULL,                      -- replaces Used; set when used, superseded or locked
  Closed_Reason ENUM('used','superseded','locked') NULL,
  Active_Slot   TINYINT AS (IF(Closed_At IS NULL, 1, NULL)) VIRTUAL,
  CONSTRAINT fk_otp_user FOREIGN KEY (User_ID) REFERENCES Users(User_ID) ON DELETE RESTRICT,
  CONSTRAINT uq_otp_one_active UNIQUE (User_ID, Purpose, Active_Slot),   -- NULLs (closed rows) never collide
  CONSTRAINT ck_otp_attempts CHECK (Attempts <= 5),
  CONSTRAINT ck_otp_expiry   CHECK (Expires_At > Created_At),
  CONSTRAINT ck_otp_closed   CHECK ((Closed_At IS NULL) = (Closed_Reason IS NULL)),
  INDEX idx_otp_expiry (Expires_At)
) ENGINE=InnoDB;

CREATE TABLE Menu_Items (
  Item_ID    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  Item_Name  VARCHAR(100) NOT NULL,
  Price      DECIMAL(10,2) NOT NULL,
  Category   VARCHAR(50) NOT NULL,
  Is_Active  BOOLEAN NOT NULL DEFAULT TRUE,          -- retire items instead of deleting them
  CONSTRAINT uq_menu_name UNIQUE (Item_Name),
  CONSTRAINT ck_menu_price CHECK (Price > 0),
  CONSTRAINT ck_menu_cat   CHECK (Category = TRIM(Category) AND Category <> ''),
  INDEX idx_menu_category (Category)
) ENGINE=InnoDB;

CREATE TABLE Stock_Items (
  Stock_ID          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  Stock_Name        VARCHAR(100) NOT NULL,
  Unit              ENUM('kg','pcs','L','g','packs') NOT NULL,
  Current_Quantity  DECIMAL(12,3) NOT NULL DEFAULT 0,   -- controlled balance; only changed together with a ledger row
  Minimum_Level     DECIMAL(12,3) NOT NULL DEFAULT 0,
  CONSTRAINT uq_stock_name UNIQUE (Stock_Name),
  CONSTRAINT ck_stock_qty CHECK (Current_Quantity >= 0),
  CONSTRAINT ck_stock_min CHECK (Minimum_Level >= 0)
) ENGINE=InnoDB;

CREATE TABLE Recipe_Portions (
  Item_ID        INT UNSIGNED NOT NULL,
  Stock_ID       INT UNSIGNED NOT NULL,
  Quantity_Used  DECIMAL(12,3) NOT NULL,
  PRIMARY KEY (Item_ID, Stock_ID),
  CONSTRAINT fk_rp_item  FOREIGN KEY (Item_ID)  REFERENCES Menu_Items(Item_ID)   ON DELETE CASCADE,
  CONSTRAINT fk_rp_stock FOREIGN KEY (Stock_ID) REFERENCES Stock_Items(Stock_ID) ON DELETE RESTRICT,
  CONSTRAINT ck_rp_qty CHECK (Quantity_Used > 0),
  INDEX idx_rp_stock (Stock_ID)
) ENGINE=InnoDB;

CREATE TABLE Orders (
  Order_ID          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  User_ID           INT UNSIGNED NOT NULL,
  Client_Request_ID CHAR(36) NOT NULL,               -- idempotency key (UUID generated once per cart)
  Order_Date_Time   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  Total_Amount      DECIMAL(10,2) NOT NULL,          -- validated snapshot of SUM(Order_Details.Subtotal)
  CONSTRAINT fk_orders_user FOREIGN KEY (User_ID) REFERENCES Users(User_ID) ON DELETE RESTRICT,
  CONSTRAINT uq_orders_idem UNIQUE (User_ID, Client_Request_ID),
  CONSTRAINT ck_orders_total CHECK (Total_Amount >= 0),
  INDEX idx_orders_date (Order_Date_Time),
  INDEX idx_orders_user (User_ID, Order_Date_Time)
) ENGINE=InnoDB;

CREATE TABLE Order_Details (
  Order_ID    INT UNSIGNED NOT NULL,
  Item_ID     INT UNSIGNED NOT NULL,
  Quantity    INT UNSIGNED NOT NULL,
  Unit_Price  DECIMAL(10,2) NOT NULL,                -- historical price snapshot
  Subtotal    DECIMAL(10,2) AS (Quantity * Unit_Price) STORED,
  PRIMARY KEY (Order_ID, Item_ID),                   -- one line per item; app merges quantities
  CONSTRAINT fk_od_order FOREIGN KEY (Order_ID) REFERENCES Orders(Order_ID)     ON DELETE RESTRICT,
  CONSTRAINT fk_od_item  FOREIGN KEY (Item_ID)  REFERENCES Menu_Items(Item_ID)  ON DELETE RESTRICT,
  CONSTRAINT ck_od_qty   CHECK (Quantity BETWEEN 1 AND 1000),
  CONSTRAINT ck_od_price CHECK (Unit_Price > 0),
  INDEX idx_od_item (Item_ID)
) ENGINE=InnoDB;

CREATE TABLE Payments (
  Payment_ID       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  Order_ID         INT UNSIGNED NOT NULL,
  Amount_Received  DECIMAL(10,2) NOT NULL,
  Change_Amount    DECIMAL(10,2) NOT NULL DEFAULT 0,
  Created_At       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pay_order FOREIGN KEY (Order_ID) REFERENCES Orders(Order_ID) ON DELETE RESTRICT,
  CONSTRAINT uq_pay_order UNIQUE (Order_ID),         -- ASSUMPTION: one payment per order (see report for split-tender alternative)
  CONSTRAINT ck_pay_amt    CHECK (Amount_Received > 0),
  CONSTRAINT ck_pay_change CHECK (Change_Amount >= 0 AND Change_Amount < Amount_Received)
) ENGINE=InnoDB;

CREATE TABLE Purchase_Orders (
  PO_ID         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,              
  Order_Date    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  Received_At   DATETIME NULL,                       -- set once, atomically, by sp_receive_po
) ENGINE=InnoDB;

CREATE TABLE Purchase_Order_Items (
  PO_ID     INT UNSIGNED NOT NULL,
  Stock_ID  INT UNSIGNED NOT NULL,
  Quantity  DECIMAL(12,3) NOT NULL,
  PRIMARY KEY (PO_ID, Stock_ID),
  CONSTRAINT fk_poi_po    FOREIGN KEY (PO_ID)    REFERENCES Purchase_Orders(PO_ID)  ON DELETE RESTRICT,
  CONSTRAINT fk_poi_stock FOREIGN KEY (Stock_ID) REFERENCES Stock_Items(Stock_ID)   ON DELETE RESTRICT,
  CONSTRAINT ck_poi_qty CHECK (Quantity > 0),
  INDEX idx_poi_stock (Stock_ID)
) ENGINE=InnoDB;

CREATE TABLE Waste_Log (
  Waste_ID          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  Stock_ID          INT UNSIGNED NOT NULL,
  Quantity          DECIMAL(12,3) NOT NULL,          -- positive magnitude of the event
  Reason            VARCHAR(255) NOT NULL,
  Date              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  User_ID           INT UNSIGNED NOT NULL,
  Client_Request_ID CHAR(36) NOT NULL,
  CONSTRAINT fk_waste_stock FOREIGN KEY (Stock_ID) REFERENCES Stock_Items(Stock_ID) ON DELETE RESTRICT,
  CONSTRAINT fk_waste_user  FOREIGN KEY (User_ID)  REFERENCES Users(User_ID)        ON DELETE RESTRICT,
  CONSTRAINT uq_waste_idem  UNIQUE (User_ID, Client_Request_ID),
  CONSTRAINT ck_waste_qty    CHECK (Quantity > 0),
  CONSTRAINT ck_waste_reason CHECK (CHAR_LENGTH(TRIM(Reason)) > 0),
  INDEX idx_waste_stock_date (Stock_ID, Date)
) ENGINE=InnoDB;

CREATE TABLE Stock_Movements (                         -- authoritative inventory ledger (append-only)
  Movement_ID  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  Stock_ID     INT UNSIGNED NOT NULL,
  Type         ENUM('Sale','Stock-In','Adjustment','Waste') NOT NULL,
  Quantity     DECIMAL(12,3) NOT NULL,               -- SIGNED delta: Sale/Waste < 0, Stock-In > 0, Adjustment <> 0
  Date         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  User_ID      INT UNSIGNED NOT NULL,
  Order_ID     INT UNSIGNED NULL,
  Waste_ID     INT UNSIGNED NULL,
  PO_ID        INT UNSIGNED NULL,
  Note         VARCHAR(255) NULL,
  CONSTRAINT fk_sm_stock FOREIGN KEY (Stock_ID) REFERENCES Stock_Items(Stock_ID)    ON DELETE RESTRICT,
  CONSTRAINT fk_sm_user  FOREIGN KEY (User_ID)  REFERENCES Users(User_ID)           ON DELETE RESTRICT,
  CONSTRAINT fk_sm_order FOREIGN KEY (Order_ID) REFERENCES Orders(Order_ID)         ON DELETE RESTRICT,
  CONSTRAINT fk_sm_waste FOREIGN KEY (Waste_ID) REFERENCES Waste_Log(Waste_ID)      ON DELETE RESTRICT,
  CONSTRAINT fk_sm_po    FOREIGN KEY (PO_ID)    REFERENCES Purchase_Orders(PO_ID)   ON DELETE RESTRICT,
  CONSTRAINT uq_sm_sale  UNIQUE (Order_ID, Stock_ID),   -- one deduction per stock per order
  CONSTRAINT uq_sm_waste UNIQUE (Waste_ID),             -- one ledger row per waste event
  CONSTRAINT uq_sm_po    UNIQUE (PO_ID, Stock_ID),      -- ASSUMPTION: a PO line is received once
  CONSTRAINT ck_sm_shape CHECK (
       (Type='Sale'       AND Quantity < 0 AND Order_ID IS NOT NULL AND Waste_ID IS NULL AND PO_ID IS NULL)
    OR (Type='Waste'      AND Quantity < 0 AND Waste_ID IS NOT NULL AND Order_ID IS NULL AND PO_ID IS NULL)
    OR (Type='Stock-In'   AND Quantity > 0 AND Order_ID IS NULL AND Waste_ID IS NULL)
    OR (Type='Adjustment' AND Quantity <> 0 AND Note IS NOT NULL AND Order_ID IS NULL AND Waste_ID IS NULL AND PO_ID IS NULL)),
  INDEX idx_movement_stock_date (Stock_ID, Date),
  INDEX idx_sm_user (User_ID)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS=1;

INSERT INTO Stock_Items (Stock_Name, Unit, Current_Quantity, Minimum_Level) VALUES
  ('Raw Meat','kg',0,5),('Marinated Meat','pcs',0,20),('Soy Sauce','L',0,2),
  ('Kalamansi','g',0,500),('Chili','g',0,200),('Plastic Bags','packs',0,5);

-- ---------- append-only guards (history is never edited/deleted; correct with new ledger rows) ----------
DELIMITER $$
CREATE TRIGGER trg_orders_nodel   BEFORE DELETE ON Orders          FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Orders are immutable history: void, do not delete'$$
CREATE TRIGGER trg_od_noupd       BEFORE UPDATE ON Order_Details   FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Order_Details are immutable'$$
CREATE TRIGGER trg_od_nodel       BEFORE DELETE ON Order_Details   FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Order_Details are immutable'$$
CREATE TRIGGER trg_pay_noupd      BEFORE UPDATE ON Payments        FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Payments are immutable'$$
CREATE TRIGGER trg_pay_nodel      BEFORE DELETE ON Payments        FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Payments are immutable'$$
CREATE TRIGGER trg_sm_noupd       BEFORE UPDATE ON Stock_Movements FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Ledger is append-only'$$
CREATE TRIGGER trg_sm_nodel       BEFORE DELETE ON Stock_Movements FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Ledger is append-only'$$
CREATE TRIGGER trg_waste_noupd    BEFORE UPDATE ON Waste_Log       FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Waste_Log is immutable'$$
CREATE TRIGGER trg_waste_nodel    BEFORE DELETE ON Waste_Log       FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Waste_Log is immutable'$$

-- ---------- critical operations ----------
CREATE PROCEDURE sp_create_order(IN p_user INT UNSIGNED, IN p_req CHAR(36), IN p_items JSON,
                                 IN p_received DECIMAL(10,2), OUT o_order_id INT UNSIGNED, OUT o_change DECIMAL(10,2))
BEGIN
  DECLARE v_total DECIMAL(10,2); DECLARE v_req INT; DECLARE v_lines INT; DECLARE v_short INT;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; DROP TEMPORARY TABLE IF EXISTS tmp_need; RESIGNAL; END;
  DROP TEMPORARY TABLE IF EXISTS tmp_need;
  START TRANSACTION;
  IF NOT EXISTS (SELECT 1 FROM Users WHERE User_ID=p_user AND Status='active') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Cashier not found or suspended';
  END IF;
  INSERT INTO Orders(User_ID, Client_Request_ID, Total_Amount) VALUES (p_user, p_req, 0);   -- 1062 on a retry/replay
  SET o_order_id = LAST_INSERT_ID();
  INSERT INTO Order_Details(Order_ID, Item_ID, Quantity, Unit_Price)
    SELECT o_order_id, m.Item_ID, SUM(jt.qty), m.Price
      FROM JSON_TABLE(p_items,'$[*]' COLUMNS (item_id INT UNSIGNED PATH '$.item_id', qty INT UNSIGNED PATH '$.qty')) jt
      JOIN Menu_Items m ON m.Item_ID=jt.item_id AND m.Is_Active
     GROUP BY m.Item_ID, m.Price;
  SELECT COUNT(DISTINCT item_id) INTO v_req FROM JSON_TABLE(p_items,'$[*]' COLUMNS (item_id INT UNSIGNED PATH '$.item_id')) j;
  SELECT COUNT(*), SUM(Subtotal) INTO v_lines, v_total FROM Order_Details WHERE Order_ID=o_order_id;
  IF v_lines = 0 OR v_lines <> v_req THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Empty order or unknown/inactive item'; END IF;
  IF p_received < v_total THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Underpayment'; END IF;
  UPDATE Orders SET Total_Amount=v_total WHERE Order_ID=o_order_id;
  SET o_change = p_received - v_total;
  INSERT INTO Payments(Order_ID, Amount_Received, Change_Amount) VALUES (o_order_id, p_received, o_change);
  CREATE TEMPORARY TABLE tmp_need AS
    SELECT rp.Stock_ID, SUM(od.Quantity*rp.Quantity_Used) AS Need
      FROM Order_Details od JOIN Recipe_Portions rp ON rp.Item_ID=od.Item_ID
     WHERE od.Order_ID=o_order_id GROUP BY rp.Stock_ID;
  SELECT s.Stock_ID FROM Stock_Items s JOIN tmp_need n ON n.Stock_ID=s.Stock_ID ORDER BY s.Stock_ID FOR UPDATE;  -- deterministic lock order
  SELECT COUNT(*) INTO v_short FROM Stock_Items s JOIN tmp_need n ON n.Stock_ID=s.Stock_ID WHERE s.Current_Quantity < n.Need FOR UPDATE;  -- locking read sees latest committed balance, not the tx snapshot
  IF v_short > 0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Insufficient stock'; END IF;
  UPDATE Stock_Items s JOIN tmp_need n ON n.Stock_ID=s.Stock_ID SET s.Current_Quantity = s.Current_Quantity - n.Need;
  INSERT INTO Stock_Movements(Stock_ID, Type, Quantity, User_ID, Order_ID)
    SELECT Stock_ID, 'Sale', -Need, p_user, o_order_id FROM tmp_need;
  DROP TEMPORARY TABLE tmp_need;
  COMMIT;
END$$

CREATE PROCEDURE sp_record_waste(IN p_user INT UNSIGNED, IN p_req CHAR(36), IN p_stock INT UNSIGNED,
                                 IN p_qty DECIMAL(12,3), IN p_reason VARCHAR(255), OUT o_waste_id INT UNSIGNED)
BEGIN
  DECLARE v_bal DECIMAL(12,3);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
  START TRANSACTION;
  SELECT Current_Quantity INTO v_bal FROM Stock_Items WHERE Stock_ID=p_stock FOR UPDATE;
  IF v_bal IS NULL OR v_bal < p_qty THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Unknown stock item or waste exceeds balance'; END IF;
  INSERT INTO Waste_Log(Stock_ID, Quantity, Reason, User_ID, Client_Request_ID) VALUES (p_stock, p_qty, p_reason, p_user, p_req);
  SET o_waste_id = LAST_INSERT_ID();
  UPDATE Stock_Items SET Current_Quantity = Current_Quantity - p_qty WHERE Stock_ID=p_stock;
  INSERT INTO Stock_Movements(Stock_ID, Type, Quantity, User_ID, Waste_ID) VALUES (p_stock,'Waste',-p_qty,p_user,o_waste_id);
  COMMIT;
END$$

CREATE PROCEDURE sp_receive_po(IN p_po INT UNSIGNED, IN p_user INT UNSIGNED)
BEGIN
  DECLARE v_rcv DATETIME; DECLARE v_found INT;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
  START TRANSACTION;
  SELECT COUNT(*), MAX(Received_At) INTO v_found, v_rcv FROM Purchase_Orders WHERE PO_ID=p_po FOR UPDATE;
  IF v_found = 0 OR v_rcv IS NOT NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='PO missing or already received'; END IF;
  SELECT s.Stock_ID FROM Stock_Items s JOIN Purchase_Order_Items i ON i.Stock_ID=s.Stock_ID WHERE i.PO_ID=p_po ORDER BY s.Stock_ID FOR UPDATE;
  UPDATE Stock_Items s JOIN Purchase_Order_Items i ON i.Stock_ID=s.Stock_ID AND i.PO_ID=p_po SET s.Current_Quantity = s.Current_Quantity + i.Quantity;
  INSERT INTO Stock_Movements(Stock_ID, Type, Quantity, User_ID, PO_ID) SELECT Stock_ID,'Stock-In',Quantity,p_user,PO_ID FROM Purchase_Order_Items WHERE PO_ID=p_po;
  UPDATE Purchase_Orders SET Received_At=NOW() WHERE PO_ID=p_po;
  COMMIT;
END$$

CREATE PROCEDURE sp_adjust_stock(IN p_user INT UNSIGNED, IN p_stock INT UNSIGNED, IN p_delta DECIMAL(12,3), IN p_note VARCHAR(255))
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
  START TRANSACTION;
  SELECT Stock_ID FROM Stock_Items WHERE Stock_ID=p_stock FOR UPDATE;
  UPDATE Stock_Items SET Current_Quantity = Current_Quantity + p_delta WHERE Stock_ID=p_stock;   -- CHECK >= 0 is the backstop
  INSERT INTO Stock_Movements(Stock_ID, Type, Quantity, User_ID, Note) VALUES (p_stock,'Adjustment',p_delta,p_user,p_note);
  COMMIT;
END$$
DELIMITER ;
