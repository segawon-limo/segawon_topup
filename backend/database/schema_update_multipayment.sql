-- Updated Schema: Multi-Payment Method Pricing Support
-- Add new columns to products table for different payment methods

\c topup_game

-- Add new columns to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS selling_price_qris DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS selling_price_va DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS selling_price_ewallet DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS recommended_payment VARCHAR(50) DEFAULT 'qris',
ADD COLUMN IF NOT EXISTS gateway_preference VARCHAR(50);

-- Update existing selling_price to be QRIS price (default/cheapest)
UPDATE products SET selling_price_qris = selling_price WHERE selling_price_qris IS NULL;

-- Create index for faster payment method queries
CREATE INDEX IF NOT EXISTS idx_products_recommended_payment ON products(recommended_payment);
CREATE INDEX IF NOT EXISTS idx_products_gateway_preference ON products(gateway_preference);

-- Add payment gateway column to orders
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_gateway VARCHAR(50),
ADD COLUMN IF NOT EXISTS gateway_fee DECIMAL(10,2);

-- Update comments
COMMENT ON COLUMN products.selling_price IS 'Legacy price, use selling_price_qris instead';
COMMENT ON COLUMN products.selling_price_qris IS 'Price for QRIS payment (0.7% fee)';
COMMENT ON COLUMN products.selling_price_va IS 'Price for Virtual Account (0.7% + Rp 1K fee)';
COMMENT ON COLUMN products.selling_price_ewallet IS 'Price for E-wallet (2% fee)';
COMMENT ON COLUMN products.recommended_payment IS 'Recommended payment method: qris, va, ewallet';
COMMENT ON COLUMN products.gateway_preference IS 'Preferred gateway: midtrans, xendit, auto';

COMMENT ON COLUMN orders.payment_gateway IS 'Gateway used: midtrans or xendit';
COMMENT ON COLUMN orders.gateway_fee IS 'Actual fee charged by payment gateway';

-- Migration complete
\echo 'Schema updated for multi-payment support!'
