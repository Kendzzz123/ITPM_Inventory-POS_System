
CREATE TABLE Users (
  User_ID   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  Name      VARCHAR(100) NOT NULL,
  Username  VARCHAR(50)  NOT NULL UNIQUE,
  Password  VARCHAR(255) NOT NULL,
  Role      ENUM('manager','cashier') NOT NULL DEFAULT 'cashier',
  Status    ENUM('active','suspended') NOT NULL DEFAULT 'active',
  Email     VARCHAR(150) NULL UNIQUE,
  Phone     VARCHAR(20)  NULL,
  Employment_Date  DATE NOT NULL
) ENGINE=InnoDB;

CREATE TABLE OTP_Codes (
  OTP_ID      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  User_ID     INT UNSIGNED NOT NULL,
  Code_Hash   VARCHAR(255) NOT NULL,
  Purpose     ENUM('password_reset','verify_account') NOT NULL,
  Expires_At  DATETIME NOT NULL,
  Attempts    TINYINT UNSIGNED NOT NULL DEFAULT 0,
  Used        BOOLEAN NOT NULL DEFAULT FALSE,
  Created_At  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (User_ID) REFERENCES Users(User_ID) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE Menu_Items (
  Item_ID    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  Item_Name  VARCHAR(100) NOT NULL,
  Price      DECIMAL(10,2) NOT NULL,
  Category   VARCHAR(50) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE Stock_Items (
  Stock_ID          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  Stock_Name        VARCHAR(100) NOT NULL UNIQUE,
  Unit              ENUM('kg','pcs','L','g','packs') NOT NULL,
  Current_Quantity  DECIMAL(12,3) NOT NULL DEFAULT 0,
  Minimum_Level     DECIMAL(12,3) NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE Recipe_Portions (
  Item_ID        INT UNSIGNED NOT NULL,
  Stock_ID       INT UNSIGNED NOT NULL,
  Quantity_Used  DECIMAL(12,3) NOT NULL,
  PRIMARY KEY (Item_ID, Stock_ID),
  FOREIGN KEY (Item_ID) REFERENCES Menu_Items(Item_ID) ON DELETE CASCADE,
  FOREIGN KEY (Stock_ID) REFERENCES Stock_Items(Stock_ID)
) ENGINE=InnoDB;

CREATE TABLE Orders (
  Order_ID         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  User_ID          INT UNSIGNED NOT NULL,
  Order_Date_Time  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  Total_Amount     DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (User_ID) REFERENCES Users(User_ID),
  INDEX idx_orders_date (Order_Date_Time)
) ENGINE=InnoDB;

CREATE TABLE Order_Details (
  Order_ID  INT UNSIGNED NOT NULL,
  Item_ID   INT UNSIGNED NOT NULL,
  Quantity  INT UNSIGNED NOT NULL,
  Subtotal  DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (Order_ID, Item_ID),
  FOREIGN KEY (Order_ID) REFERENCES Orders(Order_ID) ON DELETE CASCADE,
  FOREIGN KEY (Item_ID) REFERENCES Menu_Items(Item_ID)
) ENGINE=InnoDB;

CREATE TABLE Payments (
  Payment_ID       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  Order_ID         INT UNSIGNED NOT NULL,
  Amount_Received  DECIMAL(10,2) NOT NULL,
  Change_Amount    DECIMAL(10,2) NOT NULL DEFAULT 0,
  FOREIGN KEY (Order_ID) REFERENCES Orders(Order_ID) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE Stock_Movements (
  Movement_ID  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  Stock_ID     INT UNSIGNED NOT NULL,
  Type         ENUM('Sale','Stock-In','Adjustment','Waste') NOT NULL,
  Quantity     DECIMAL(12,3) NOT NULL,
  Date         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  User_ID      INT UNSIGNED NULL,
  FOREIGN KEY (Stock_ID) REFERENCES Stock_Items(Stock_ID),
  FOREIGN KEY (User_ID) REFERENCES Users(User_ID) ON DELETE SET NULL,
  INDEX idx_movement_stock_date (Stock_ID, Date)
) ENGINE=InnoDB;

CREATE TABLE Waste_Log (
  Waste_ID  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  Stock_ID  INT UNSIGNED NOT NULL,
  Quantity  DECIMAL(12,3) NOT NULL,
  Reason    VARCHAR(255) NOT NULL,
  Date      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  User_ID   INT UNSIGNED NOT NULL,
  FOREIGN KEY (Stock_ID) REFERENCES Stock_Items(Stock_ID),
  FOREIGN KEY (User_ID) REFERENCES Users(User_ID)
) ENGINE=InnoDB;

CREATE TABLE Suppliers (
  Supplier_ID    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  Supplier_Name  VARCHAR(100) NOT NULL,
  Contact        VARCHAR(100) NULL
) ENGINE=InnoDB;

CREATE TABLE Purchase_Orders (
  PO_ID        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  Supplier_ID  INT UNSIGNED NOT NULL,
  Order_Date   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (Supplier_ID) REFERENCES Suppliers(Supplier_ID)
) ENGINE=InnoDB;

CREATE TABLE Purchase_Order_Items (
  PO_ID     INT UNSIGNED NOT NULL,
  Stock_ID  INT UNSIGNED NOT NULL,
  Quantity  DECIMAL(12,3) NOT NULL,
  PRIMARY KEY (PO_ID, Stock_ID),
  FOREIGN KEY (PO_ID) REFERENCES Purchase_Orders(PO_ID) ON DELETE CASCADE,
  FOREIGN KEY (Stock_ID) REFERENCES Stock_Items(Stock_ID)
) ENGINE=InnoDB;

INSERT INTO Stock_Items (Stock_Name, Unit, Current_Quantity, Minimum_Level) VALUES
  ('Raw Meat',       'kg',    0, 5),
  ('Marinated Meat', 'pcs',   0, 20),
  ('Soy Sauce',      'L',     0, 2),
  ('Kalamansi',      'g',     0, 500),
  ('Chili',          'g',     0, 200),
  ('Plastic Bags',   'packs', 0, 5);
