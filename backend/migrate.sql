-- migrate.sql  — run as a privileged migration account. SOURCE schema = pos_old (untouched), TARGET = pos_new (pos_schema_v2.sql loaded).
-- Nothing is deleted from pos_old. Rows that violate v2 rules go to pos_new.Migration_Conflicts and are NOT copied.
CREATE TABLE pos_new.Migration_Conflicts (
  Conflict_ID INT AUTO_INCREMENT PRIMARY KEY, Source_Table VARCHAR(40) NOT NULL, Source_Key VARCHAR(80) NOT NULL,
  Rule VARCHAR(80) NOT NULL, Detected_At DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE pos_new.Legacy_Stock_Movements LIKE pos_old.Stock_Movements;    -- preserved verbatim; cannot be linked to a source event
CREATE TABLE pos_new.Legacy_Order_Details_Subtotals (Order_ID INT UNSIGNED, Item_ID INT UNSIGNED, Old_Subtotal DECIMAL(10,2), PRIMARY KEY(Order_ID,Item_ID));

-- 1. detect conflicts (pre-migration queries; same SELECTs can be run standalone for review)
INSERT INTO pos_new.Migration_Conflicts(Source_Table,Source_Key,Rule)
SELECT 'Users', User_ID, 'username untrimmed or <3 chars'  FROM pos_old.Users WHERE Username<>TRIM(Username) OR CHAR_LENGTH(Username)<3
UNION ALL SELECT 'Users', User_ID, 'email blank/untrimmed/invalid' FROM pos_old.Users WHERE Email IS NOT NULL AND (Email<>TRIM(Email) OR Email NOT LIKE '_%@_%.__%')
UNION ALL SELECT 'Users', User_ID, 'Password not a >=60 char hash (plaintext?)' FROM pos_old.Users WHERE CHAR_LENGTH(Password)<60
UNION ALL SELECT 'Menu_Items', Item_ID, 'price <= 0' FROM pos_old.Menu_Items WHERE Price<=0
UNION ALL SELECT 'Menu_Items', Item_ID, 'blank/untrimmed category' FROM pos_old.Menu_Items WHERE Category<>TRIM(Category) OR Category=''
UNION ALL SELECT 'Menu_Items', Item_ID, 'duplicate Item_Name (later id)' FROM pos_old.Menu_Items m WHERE EXISTS (SELECT 1 FROM pos_old.Menu_Items k WHERE k.Item_Name=m.Item_Name AND k.Item_ID<m.Item_ID)
UNION ALL SELECT 'Orders', Order_ID, 'no order lines' FROM pos_old.Orders o WHERE NOT EXISTS (SELECT 1 FROM pos_old.Order_Details d WHERE d.Order_ID=o.Order_ID)
UNION ALL SELECT 'Orders', o.Order_ID, 'header total <> sum(subtotal)' FROM pos_old.Orders o JOIN pos_old.Order_Details d USING(Order_ID) GROUP BY o.Order_ID,o.Total_Amount HAVING o.Total_Amount<>SUM(d.Subtotal)
UNION ALL SELECT 'Order_Details', CONCAT(Order_ID,'-',Item_ID), 'qty out of 1..1000, subtotal<=0 or unit price not exact to 2dp' FROM pos_old.Order_Details WHERE Quantity NOT BETWEEN 1 AND 1000 OR Subtotal<=0 OR ROUND(Subtotal/Quantity,2)*Quantity<>Subtotal
UNION ALL SELECT 'Payments', Order_ID, 'order has <>1 payment' FROM pos_old.Payments GROUP BY Order_ID HAVING COUNT(*)<>1
UNION ALL SELECT 'Payments', Payment_ID, 'amount<=0, bad change, or underpaid' FROM pos_old.Payments p JOIN pos_old.Orders o USING(Order_ID) WHERE Amount_Received<=0 OR Change_Amount<0 OR Change_Amount>=Amount_Received OR Amount_Received-Change_Amount<>o.Total_Amount
UNION ALL SELECT 'Orders', Order_ID, 'no payment' FROM pos_old.Orders o WHERE NOT EXISTS (SELECT 1 FROM pos_old.Payments p WHERE p.Order_ID=o.Order_ID)
UNION ALL SELECT 'Stock_Items', Stock_ID, 'negative balance' FROM pos_old.Stock_Items WHERE Current_Quantity<0 OR Minimum_Level<0
UNION ALL SELECT 'Stock_Items', s.Stock_ID, 'balance <> sum(ledger) (informational)' FROM pos_old.Stock_Items s LEFT JOIN pos_old.Stock_Movements m USING(Stock_ID) GROUP BY s.Stock_ID,s.Current_Quantity HAVING s.Current_Quantity<>COALESCE(SUM(m.Quantity),0)
UNION ALL SELECT 'Waste_Log', Waste_ID, 'qty<=0 or blank reason' FROM pos_old.Waste_Log WHERE Quantity<=0 OR CHAR_LENGTH(TRIM(Reason))=0
UNION ALL SELECT 'Waste_Log', Waste_ID, 'possible duplicate of earlier entry (informational, still copied)' FROM pos_old.Waste_Log w WHERE EXISTS (SELECT 1 FROM pos_old.Waste_Log k WHERE k.Stock_ID=w.Stock_ID AND k.User_ID=w.User_ID AND k.Quantity=w.Quantity AND k.Reason=w.Reason AND k.Date=w.Date AND k.Waste_ID<w.Waste_ID)
UNION ALL SELECT 'Purchase_Order_Items', CONCAT(PO_ID,'-',Stock_ID), 'qty<=0' FROM pos_old.Purchase_Order_Items WHERE Quantity<=0
UNION ALL SELECT 'Recipe_Portions', CONCAT(Item_ID,'-',Stock_ID), 'qty<=0' FROM pos_old.Recipe_Portions WHERE Quantity_Used<=0;

-- 2. copy clean rows
START TRANSACTION;
DELETE FROM pos_new.Stock_Items;   -- drop v2 seed rows; real ones are copied below
INSERT INTO pos_new.Users(User_ID,Name,Username,Password_Hash,Role,Status,Email,Phone,Employment_Date)
  SELECT User_ID,Name,Username,Password,Role,Status,Email,Phone,Employment_Date FROM pos_old.Users u
  WHERE NOT EXISTS (SELECT 1 FROM pos_new.Migration_Conflicts c WHERE c.Source_Table='Users' AND c.Source_Key=CAST(u.User_ID AS CHAR));
INSERT INTO pos_new.Menu_Items(Item_ID,Item_Name,Price,Category)
  SELECT Item_ID,Item_Name,Price,Category FROM pos_old.Menu_Items m
  WHERE NOT EXISTS (SELECT 1 FROM pos_new.Migration_Conflicts c WHERE c.Source_Table='Menu_Items' AND c.Source_Key=CAST(m.Item_ID AS CHAR));
INSERT INTO pos_new.Stock_Items SELECT * FROM pos_old.Stock_Items WHERE Current_Quantity>=0 AND Minimum_Level>=0;
INSERT INTO pos_new.Recipe_Portions SELECT r.* FROM pos_old.Recipe_Portions r WHERE r.Quantity_Used>0 AND r.Item_ID IN (SELECT Item_ID FROM pos_new.Menu_Items);
-- orders: only fully consistent orders (lines + one exact payment + matching total + known user) migrate
INSERT INTO pos_new.Orders(Order_ID,User_ID,Client_Request_ID,Order_Date_Time,Total_Amount)
  SELECT o.Order_ID,o.User_ID,UUID(),o.Order_Date_Time,o.Total_Amount FROM pos_old.Orders o
  WHERE o.User_ID IN (SELECT User_ID FROM pos_new.Users)
    AND NOT EXISTS (SELECT 1 FROM pos_new.Migration_Conflicts c WHERE c.Source_Table IN ('Orders','Order_Details','Payments') AND c.Source_Key=CAST(o.Order_ID AS CHAR))
    AND NOT EXISTS (SELECT 1 FROM pos_new.Migration_Conflicts c JOIN pos_old.Order_Details d ON c.Source_Table='Order_Details' AND c.Source_Key=CONCAT(d.Order_ID,'-',d.Item_ID) WHERE d.Order_ID=o.Order_ID)
    AND NOT EXISTS (SELECT 1 FROM pos_new.Migration_Conflicts c JOIN pos_old.Payments p ON c.Source_Table='Payments' AND c.Source_Key=CAST(p.Payment_ID AS CHAR) WHERE p.Order_ID=o.Order_ID)
    AND NOT EXISTS (SELECT 1 FROM pos_old.Order_Details d WHERE d.Order_ID=o.Order_ID AND d.Item_ID NOT IN (SELECT Item_ID FROM pos_new.Menu_Items));
INSERT INTO pos_new.Order_Details(Order_ID,Item_ID,Quantity,Unit_Price)
  SELECT Order_ID,Item_ID,Quantity,ROUND(Subtotal/Quantity,2) FROM pos_old.Order_Details WHERE Order_ID IN (SELECT Order_ID FROM pos_new.Orders);
INSERT INTO pos_new.Legacy_Order_Details_Subtotals SELECT Order_ID,Item_ID,Subtotal FROM pos_old.Order_Details WHERE Order_ID IN (SELECT Order_ID FROM pos_new.Orders);
INSERT INTO pos_new.Payments(Payment_ID,Order_ID,Amount_Received,Change_Amount) SELECT Payment_ID,Order_ID,Amount_Received,Change_Amount FROM pos_old.Payments WHERE Order_ID IN (SELECT Order_ID FROM pos_new.Orders);
-- legacy ledger kept verbatim; the new ledger opens with one Adjustment per stock item carrying its current balance
INSERT INTO pos_new.Legacy_Stock_Movements SELECT * FROM pos_old.Stock_Movements;
INSERT INTO pos_new.Stock_Movements(Stock_ID,Type,Quantity,User_ID,Note)
  SELECT Stock_ID,'Adjustment',Current_Quantity,(SELECT MIN(User_ID) FROM pos_new.Users WHERE Role='manager'),'Migration opening balance'
  FROM pos_new.Stock_Items WHERE Current_Quantity<>0;
INSERT INTO pos_new.Waste_Log(Waste_ID,Stock_ID,Quantity,Reason,Date,User_ID,Client_Request_ID)
  SELECT Waste_ID,Stock_ID,Quantity,Reason,Date,User_ID,UUID() FROM pos_old.Waste_Log
  WHERE Quantity>0 AND CHAR_LENGTH(TRIM(Reason))>0 AND User_ID IN (SELECT User_ID FROM pos_new.Users);
INSERT INTO pos_new.Purchase_Orders(PO_ID,Supplier_Name,Order_Date)
  SELECT p.PO_ID,TRIM(s.Supplier_Name),p.Order_Date FROM pos_old.Purchase_Orders p LEFT JOIN pos_old.Suppliers s USING(Supplier_ID);
INSERT INTO pos_new.Purchase_Order_Items SELECT * FROM pos_old.Purchase_Order_Items WHERE Quantity>0;
COMMIT;
-- Active OTPs are intentionally NOT migrated: they are short-lived; users re-request after cut-over.
