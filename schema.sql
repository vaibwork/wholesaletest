-- Database schema for VSOL-MiNi

-- Users table stores login credentials. Only one default user is created by default.
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId VARCHAR(100) UNIQUE,
  password VARCHAR(100)
);

-- Insert a default user with credentials 123456/123456. If the user already exists
-- update the password. This provides an initial login which can be changed
-- through the Settings page.
INSERT INTO users (userId, password) VALUES ('123456','123456')
  ON DUPLICATE KEY UPDATE password='123456';

-- Company settings holds a single row with business information and default
-- credentials. The record has an id of 1 for easy upsert.
CREATE TABLE IF NOT EXISTS company_settings (
  id INT PRIMARY KEY,
  company_name VARCHAR(255),
  address VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  zip VARCHAR(20),
  gstin VARCHAR(30),
  contact VARCHAR(255),
  bank_name VARCHAR(255),
  bank_account_name VARCHAR(255),
  bank_account_number VARCHAR(100),
  ifsc VARCHAR(50),
  branch VARCHAR(100),
  default_user VARCHAR(100),
  default_password VARCHAR(100)
);

-- Inventory records stock items along with category-specific specifications
-- stored as a JSON string in the specs column. The quantity field reflects
-- available stock and is updated automatically by purchase and sales APIs.
CREATE TABLE IF NOT EXISTS inventory (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_name VARCHAR(255),
  category VARCHAR(100),
  hsn_sac VARCHAR(50),
  quantity DECIMAL(12,2),
  rate DECIMAL(12,2),
  specs TEXT
);

-- Purchases table stores incoming stock transactions. Each record is linked
-- to an inventory item. When a purchase is recorded the quantity in the
-- inventory table is automatically increased.
CREATE TABLE IF NOT EXISTS purchases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_id INT,
  quantity DECIMAL(12,2),
  rate DECIMAL(12,2),
  date DATE,
  vendor_name VARCHAR(255),
  invoice_number VARCHAR(255),
  cgst DECIMAL(12,2),
  sgst DECIMAL(12,2),
  igst DECIMAL(12,2),
  FOREIGN KEY (item_id) REFERENCES inventory(id) ON DELETE SET NULL
);

-- Sales table stores tax invoices. The items column is stored as a JSON
-- document which includes item details, quantities and rates. When an
-- invoice is saved the corresponding quantities are deducted from inventory.
CREATE TABLE IF NOT EXISTS sales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_number VARCHAR(50),
  customer_name VARCHAR(255),
  customer_address VARCHAR(255),
  customer_gstin VARCHAR(50),
  place_of_supply VARCHAR(255),
  vehicle_no VARCHAR(50),
  items JSON,
  taxable_total DECIMAL(12,2),
  cgst DECIMAL(12,2),
  sgst DECIMAL(12,2),
  igst DECIMAL(12,2),
  grand_total DECIMAL(12,2),
  date DATE
);

-- Expenses table stores miscellaneous expenses like salaries, utilities and rent.
CREATE TABLE IF NOT EXISTS expenses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  description VARCHAR(255),
  amount DECIMAL(12,2),
  category VARCHAR(100),
  date DATE
);