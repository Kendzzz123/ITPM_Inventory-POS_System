-- Run this once if your database was created from the OLD pos_schema.sql
-- (before the Suspended_Until column existed):
--   mysql -u root -p myapp_db < database/migrations/001_add_suspended_until.sql
ALTER TABLE Users ADD COLUMN Suspended_Until DATETIME NULL AFTER Employment_Date;
