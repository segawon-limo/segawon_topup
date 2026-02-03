/**
 * Database Migration untuk Duitku Transactions
 * Sesuaikan dengan database yang Anda gunakan (PostgreSQL/MySQL/MongoDB)
 */

-- PostgreSQL Migration
-- File: migrations/create_duitku_transactions_table.sql

CREATE TABLE IF NOT EXISTS duitku_transactions (
  id SERIAL PRIMARY KEY,
  
  -- Order Information
  merchant_order_id VARCHAR(255) UNIQUE NOT NULL,
  reference VARCHAR(255),
  
  -- Payment Details
  payment_amount DECIMAL(15, 2) NOT NULL,
  payment_method VARCHAR(10) NOT NULL,
  payment_method_name VARCHAR(100),
  
  -- Customer Information
  customer_name VARCHAR(255),
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50) NOT NULL,
  
  -- Product Information
  product_details TEXT NOT NULL,
  
  -- Payment Data
  va_number VARCHAR(100),
  qr_string TEXT,
  payment_url TEXT,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- pending, success, failed, expired
  result_code VARCHAR(10),
  status_message TEXT,
  
  -- Callback Data
  additional_param TEXT,
  merchant_user_id VARCHAR(255),
  publisher_order_id VARCHAR(255),
  sp_user_hash VARCHAR(255),
  settlement_date TIMESTAMP,
  issuer_code VARCHAR(10),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  paid_at TIMESTAMP,
  failed_at TIMESTAMP,
  expires_at TIMESTAMP,
  
  -- Indexes
  INDEX idx_merchant_order_id (merchant_order_id),
  INDEX idx_reference (reference),
  INDEX idx_customer_email (customer_email),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);

-- Trigger untuk auto update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_duitku_transactions_updated_at 
  BEFORE UPDATE ON duitku_transactions 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Table untuk menyimpan log callback dari Duitku
CREATE TABLE IF NOT EXISTS duitku_callback_logs (
  id SERIAL PRIMARY KEY,
  merchant_order_id VARCHAR(255) NOT NULL,
  callback_data JSONB NOT NULL,
  signature VARCHAR(255),
  is_valid BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_merchant_order_id (merchant_order_id),
  INDEX idx_created_at (created_at)
);

-- Comments
COMMENT ON TABLE duitku_transactions IS 'Tabel untuk menyimpan transaksi pembayaran Duitku';
COMMENT ON TABLE duitku_callback_logs IS 'Tabel untuk menyimpan log callback dari Duitku untuk audit';