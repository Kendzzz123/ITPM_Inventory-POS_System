-- 003_delete_staff_with_history.sql
-- Lets a manager delete a cashier even if they already have transactions.
-- The past orders / stock movements / waste stay as history; their User_ID is
-- set to NULL (unattributed) instead of blocking the delete.
--
-- You normally do NOT need to run this by hand: the backend applies it
-- automatically on start (src/config/ensureSchema.js). This file is for a
-- manual run if you prefer:  mysql -u root -p myapp_db < database/migrations/003_delete_staff_with_history.sql
--
-- InnoDB performs ON DELETE SET NULL itself without firing the append-only
-- triggers, so the ledger and waste history are never edited by hand.

ALTER TABLE Orders          DROP FOREIGN KEY fk_orders_user;
ALTER TABLE Orders          MODIFY User_ID INT UNSIGNED NULL;
ALTER TABLE Orders          ADD CONSTRAINT fk_orders_user
  FOREIGN KEY (User_ID) REFERENCES Users(User_ID) ON DELETE SET NULL;

ALTER TABLE Stock_Movements DROP FOREIGN KEY fk_sm_user;
ALTER TABLE Stock_Movements MODIFY User_ID INT UNSIGNED NULL;
ALTER TABLE Stock_Movements ADD CONSTRAINT fk_sm_user
  FOREIGN KEY (User_ID) REFERENCES Users(User_ID) ON DELETE SET NULL;

ALTER TABLE Waste_Log       DROP FOREIGN KEY fk_waste_user;
ALTER TABLE Waste_Log       MODIFY User_ID INT UNSIGNED NULL;
ALTER TABLE Waste_Log       ADD CONSTRAINT fk_waste_user
  FOREIGN KEY (User_ID) REFERENCES Users(User_ID) ON DELETE SET NULL;
