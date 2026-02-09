-- Create voucher table
CREATE TABLE IF NOT EXISTS vouchers (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed', 'base_price')),
  discount_value DECIMAL(10,2) NOT NULL,
  min_purchase DECIMAL(10,2) DEFAULT 0,
  max_discount DECIMAL(10,2), -- For percentage type
  usage_limit INT,
  used_count INT DEFAULT 0,
  valid_from TIMESTAMP,
  valid_until TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  is_admin_only BOOLEAN DEFAULT false,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add voucher_code column to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS voucher_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS voucher_discount DECIMAL(10,2) DEFAULT 0;

-- Create index for faster voucher lookups
CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(code);
CREATE INDEX IF NOT EXISTS idx_vouchers_active ON vouchers(is_active, valid_from, valid_until);

-- Insert sample vouchers
INSERT INTO vouchers (code, discount_type, discount_value, min_purchase, max_discount, usage_limit, valid_from, valid_until, is_admin_only, description)
VALUES 
  ('WELCOME10', 'percentage', 10, 50000, 20000, 100, NOW(), NOW() + INTERVAL '30 days', false, 'Diskon 10% untuk semua pembelian, maksimal Rp 20.000'),
  ('HEMAT5K', 'fixed', 5000, 25000, NULL, 500, NOW(), NOW() + INTERVAL '7 days', false, 'Potongan Rp 5.000 untuk pembelian minimal Rp 25.000'),
  ('NEWUSER', 'percentage', 15, 100000, 50000, 50, NOW(), NOW() + INTERVAL '60 days', false, 'Diskon 15% untuk user baru, maksimal Rp 50.000'),
  ('19JAGADRAYA13', 'base_price', 0, 0, NULL, NULL, NULL, NULL, true, 'Voucher Admin - Harga Base')
ON CONFLICT (code) DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for vouchers table
DROP TRIGGER IF EXISTS update_vouchers_updated_at ON vouchers;
CREATE TRIGGER update_vouchers_updated_at
    BEFORE UPDATE ON vouchers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Display created vouchers
SELECT 
  code, 
  discount_type, 
  CASE 
    WHEN discount_type = 'base_price' THEN 'Base Price'
    WHEN discount_type = 'percentage' THEN discount_value || '%'
    WHEN discount_type = 'fixed' THEN 'Rp ' || discount_value
  END as discount,
  is_admin_only,
  CASE 
    WHEN valid_until IS NULL THEN 'Permanent'
    ELSE TO_CHAR(valid_until, 'YYYY-MM-DD')
  END as expires
FROM vouchers
ORDER BY is_admin_only DESC, created_at ASC;
