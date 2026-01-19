-- Database Schema for Instant Game Topup System
-- PostgreSQL 14+

-- Extension for UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (untuk admin)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Games table
CREATE TABLE games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    icon_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table (nominal topup)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sku VARCHAR(100) UNIQUE NOT NULL, -- SKU dari Digiflazz
    base_price DECIMAL(10,2) NOT NULL, -- Harga beli dari provider
    selling_price DECIMAL(10,2) NOT NULL, -- Harga jual ke customer
    profit_margin DECIMAL(5,2), -- Persentase margin
    is_active BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    product_id UUID REFERENCES products(id),
    
    -- Customer info
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    customer_name VARCHAR(255),
    
    -- Game account info
    game_user_id VARCHAR(255) NOT NULL, -- Riot ID untuk Valorant
    game_user_tag VARCHAR(50), -- Tagline untuk Valorant (contoh: #RRR)
    game_zone_id VARCHAR(50), -- Zone ID untuk game lain (ML, FF, dll)
    
    -- Pricing
    amount DECIMAL(10,2) NOT NULL,
    admin_fee DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    
    -- Payment
    payment_method VARCHAR(100),
    payment_channel VARCHAR(100), -- qris, bca_va, gopay, dll
    payment_status VARCHAR(50) DEFAULT 'pending', -- pending, success, failed, expired
    payment_url TEXT,
    payment_expires_at TIMESTAMP,
    paid_at TIMESTAMP,
    
    -- Order processing
    order_status VARCHAR(50) DEFAULT 'pending', -- pending, processing, success, failed, refund
    provider_order_id VARCHAR(255), -- Order ID dari Digiflazz
    provider_serial_number TEXT, -- Serial number / kode voucher (jika ada)
    provider_response TEXT, -- Response dari provider
    processed_at TIMESTAMP,
    
    -- Metadata
    ip_address VARCHAR(50),
    user_agent TEXT,
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table (payment records)
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    transaction_id VARCHAR(255) UNIQUE NOT NULL, -- ID dari payment gateway
    payment_type VARCHAR(100),
    payment_method VARCHAR(100),
    gross_amount DECIMAL(10,2) NOT NULL,
    transaction_status VARCHAR(50),
    transaction_time TIMESTAMP,
    settlement_time TIMESTAMP,
    fraud_status VARCHAR(50),
    status_message TEXT,
    raw_response TEXT, -- JSON response dari payment gateway
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Settings table (untuk konfigurasi sistem)
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(255) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table (log notifikasi)
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    notification_type VARCHAR(50), -- whatsapp, email, sms
    recipient VARCHAR(255),
    subject VARCHAR(255),
    message TEXT,
    status VARCHAR(50), -- sent, failed, pending
    sent_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes untuk performa
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_customer_email ON orders(customer_email);
CREATE INDEX idx_orders_order_status ON orders(order_status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_transactions_transaction_id ON transactions(transaction_id);
CREATE INDEX idx_transactions_order_id ON transactions(order_id);
CREATE INDEX idx_products_game_id ON products(game_id);
CREATE INDEX idx_products_sku ON products(sku);

-- Insert default admin user (password: admin123)
-- Hash menggunakan bcrypt dengan cost 10
INSERT INTO users (email, password, full_name, role) VALUES 
('admin@topup.com', '$2b$10$rKvVJvqK.6YqVqKqG7FgKuXJ8xqP0xGkqL5f0pQxLZlYGZqXZqXZq', 'Admin', 'admin');

-- Insert Valorant game
INSERT INTO games (name, slug, description, icon_url, is_active) VALUES 
('Valorant', 'valorant', 'Valorant adalah game FPS 5v5 tactical shooter dari Riot Games', 'https://example.com/valorant-icon.png', true);

-- Insert Valorant products (contoh harga)
-- SKU disesuaikan dengan Digiflazz
INSERT INTO products (game_id, name, description, sku, base_price, selling_price, profit_margin, is_active, sort_order) 
VALUES 
((SELECT id FROM games WHERE slug = 'valorant'), '125 Valorant Points', '125 VP untuk region Indonesia', 'VALORANT125', 12000, 14000, 16.67, true, 1),
((SELECT id FROM games WHERE slug = 'valorant'), '420 Valorant Points', '420 VP untuk region Indonesia', 'VALORANT420', 40000, 46000, 15.00, true, 2),
((SELECT id FROM games WHERE slug = 'valorant'), '700 Valorant Points', '700 VP untuk region Indonesia', 'VALORANT700', 66000, 76000, 15.15, true, 3),
((SELECT id FROM games WHERE slug = 'valorant'), '1375 Valorant Points', '1375 VP untuk region Indonesia', 'VALORANT1375', 130000, 149000, 14.62, true, 4),
((SELECT id FROM games WHERE slug = 'valorant'), '2400 Valorant Points', '2400 VP untuk region Indonesia', 'VALORANT2400', 225000, 259000, 15.11, true, 5),
((SELECT id FROM games WHERE slug = 'valorant'), '4000 Valorant Points', '4000 VP untuk region Indonesia', 'VALORANT4000', 375000, 429000, 14.40, true, 6);

-- Insert default settings
INSERT INTO settings (setting_key, setting_value, description) VALUES 
('site_name', 'TopupGame.id', 'Nama website'),
('site_description', 'Topup game instant 24/7', 'Deskripsi website'),
('contact_email', 'support@topupgame.id', 'Email kontak support'),
('contact_whatsapp', '628123456789', 'Nomor WhatsApp untuk support'),
('admin_fee', '0', 'Biaya admin tambahan (dalam rupiah)'),
('min_order_amount', '10000', 'Minimal nominal order (dalam rupiah)'),
('auto_process_order', 'true', 'Otomatis proses order setelah payment success'),
('maintenance_mode', 'false', 'Mode maintenance');

-- Trigger untuk update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON games FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function untuk generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS VARCHAR(50) AS $$
DECLARE
    new_order_number VARCHAR(50);
    order_exists BOOLEAN;
BEGIN
    LOOP
        new_order_number := 'INV' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
        SELECT EXISTS(SELECT 1 FROM orders WHERE order_number = new_order_number) INTO order_exists;
        EXIT WHEN NOT order_exists;
    END LOOP;
    RETURN new_order_number;
END;
$$ LANGUAGE plpgsql;

-- View untuk dashboard statistics
CREATE VIEW dashboard_stats AS
SELECT 
    COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE) as today_orders,
    COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE AND order_status = 'success') as today_success,
    COALESCE(SUM(total_amount) FILTER (WHERE created_at::date = CURRENT_DATE AND payment_status = 'success'), 0) as today_revenue,
    COUNT(*) FILTER (WHERE order_status = 'pending') as pending_orders,
    COUNT(*) FILTER (WHERE order_status = 'processing') as processing_orders
FROM orders;

COMMENT ON DATABASE topup_game IS 'Database untuk sistem instant topup game';
