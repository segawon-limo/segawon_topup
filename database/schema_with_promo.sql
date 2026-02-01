-- Database Schema for Instant Game Topup System
-- PostgreSQL 14+
-- CORRECTED VERSION - Proper table creation order
-- Updated with Promo Code System

-- Extension for UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- PART 1: CORE TABLES (No dependencies)
-- ========================================

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

-- Settings table (untuk konfigurasi sistem)
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(255) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- PART 2: DEPENDENT TABLES (Level 1)
-- ========================================

-- Products table (depends on games)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sku VARCHAR(100) UNIQUE NOT NULL,
    base_price DECIMAL(10,2) NOT NULL,
    selling_price DECIMAL(10,2) NOT NULL,
    profit_margin DECIMAL(5,2),
    is_active BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Promo Codes table (depends on users)
CREATE TABLE promo_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL,
    discount_value DECIMAL(10,2) NOT NULL,
    max_discount_amount DECIMAL(10,2),
    min_order_amount DECIMAL(10,2),
    max_usage_total INT,
    max_usage_per_user INT DEFAULT 1,
    current_usage_count INT DEFAULT 0,
    valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP,
    applicable_products JSONB,
    applicable_payment_methods JSONB,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- PART 3: ORDERS TABLE (Level 2)
-- ========================================

-- Orders table (depends on products)
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    product_id UUID REFERENCES products(id),
    
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    customer_name VARCHAR(255),
    
    game_user_id VARCHAR(255) NOT NULL,
    game_user_tag VARCHAR(50),
    game_zone_id VARCHAR(50),
    
    amount DECIMAL(10,2) NOT NULL,
    admin_fee DECIMAL(10,2) DEFAULT 0,
    payment_fee DECIMAL(10,2) DEFAULT 0,
    subtotal DECIMAL(10,2),
    promo_code VARCHAR(50),
    promo_discount DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    
    payment_method VARCHAR(100),
    payment_channel VARCHAR(100),
    payment_gateway VARCHAR(50),
    gateway_fee DECIMAL(10,2),
    payment_status VARCHAR(50) DEFAULT 'pending',
    payment_url TEXT,
    payment_expires_at TIMESTAMP,
    paid_at TIMESTAMP,
    
    order_status VARCHAR(50) DEFAULT 'pending',
    provider_order_id VARCHAR(255),
    provider_serial_number TEXT,
    provider_response TEXT,
    processed_at TIMESTAMP,
    
    ip_address VARCHAR(50),
    user_agent TEXT,
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- PART 4: DEPENDENT TABLES (Level 3)
-- ========================================

-- Transactions table (depends on orders)
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    transaction_id VARCHAR(255) UNIQUE NOT NULL,
    payment_type VARCHAR(100),
    payment_method VARCHAR(100),
    gross_amount DECIMAL(10,2) NOT NULL,
    transaction_status VARCHAR(50),
    transaction_time TIMESTAMP,
    settlement_time TIMESTAMP,
    fraud_status VARCHAR(50),
    status_message TEXT,
    raw_response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table (depends on orders)
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    notification_type VARCHAR(50),
    recipient VARCHAR(255),
    subject VARCHAR(255),
    message TEXT,
    status VARCHAR(50),
    sent_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Promo Code Usage History (depends on promo_codes AND orders)
CREATE TABLE promo_code_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    promo_code_id UUID REFERENCES promo_codes(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    user_email VARCHAR(255),
    user_ip VARCHAR(50),
    discount_amount DECIMAL(10,2) NOT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- PART 5: INDEXES
-- ========================================

-- Orders indexes
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_customer_email ON orders(customer_email);
CREATE INDEX idx_orders_order_status ON orders(order_status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- Transactions indexes
CREATE INDEX idx_transactions_transaction_id ON transactions(transaction_id);
CREATE INDEX idx_transactions_order_id ON transactions(order_id);

-- Products indexes
CREATE INDEX idx_products_game_id ON products(game_id);
CREATE INDEX idx_products_sku ON products(sku);

-- Promo codes indexes
CREATE INDEX idx_promo_codes_code ON promo_codes(code);
CREATE INDEX idx_promo_codes_active ON promo_codes(is_active, valid_until);
CREATE INDEX idx_promo_usage_code ON promo_code_usage(promo_code_id);
CREATE INDEX idx_promo_usage_email ON promo_code_usage(user_email);

-- ========================================
-- PART 6: INITIAL DATA
-- ========================================

-- Default admin user (password: admin123)
INSERT INTO users (email, password, full_name, role) VALUES 
('admin@topup.com', '$2b$10$rKvVJvqK.6YqVqKqG7FgKuXJ8xqP0xGkqL5f0pQxLZlYGZqXZqXZq', 'Admin', 'admin');

-- Valorant game
INSERT INTO games (name, slug, description, icon_url, is_active) VALUES 
('Valorant', 'valorant', 'Valorant adalah game FPS 5v5 tactical shooter dari Riot Games', 'https://example.com/valorant-icon.png', true);

-- Valorant products
INSERT INTO products (game_id, name, description, sku, base_price, selling_price, profit_margin, is_active, sort_order) 
VALUES 
((SELECT id FROM games WHERE slug = 'valorant'), '125 Valorant Points', '125 VP untuk region Indonesia', 'VALORANT125', 12000, 14000, 16.67, true, 1),
((SELECT id FROM games WHERE slug = 'valorant'), '420 Valorant Points', '420 VP untuk region Indonesia', 'VALORANT420', 40000, 46000, 15.00, true, 2),
((SELECT id FROM games WHERE slug = 'valorant'), '700 Valorant Points', '700 VP untuk region Indonesia', 'VALORANT700', 66000, 76000, 15.15, true, 3),
((SELECT id FROM games WHERE slug = 'valorant'), '1375 Valorant Points', '1375 VP untuk region Indonesia', 'VALORANT1375', 130000, 149000, 14.62, true, 4),
((SELECT id FROM games WHERE slug = 'valorant'), '2400 Valorant Points', '2400 VP untuk region Indonesia', 'VALORANT2400', 225000, 259000, 15.11, true, 5),
((SELECT id FROM games WHERE slug = 'valorant'), '4000 Valorant Points', '4000 VP untuk region Indonesia', 'VALORANT4000', 375000, 429000, 14.40, true, 6);

-- Sample promo codes
INSERT INTO promo_codes (code, description, discount_type, discount_value, max_discount_amount, min_order_amount, max_usage_total, max_usage_per_user, valid_until) 
VALUES 
('WELCOME10', 'Welcome discount 10% for new users', 'percentage', 10.00, 50000, 20000, 1000, 1, CURRENT_TIMESTAMP + INTERVAL '30 days'),
('NEWUSER50K', 'Flat Rp 50K discount for first order', 'fixed_amount', 50000, NULL, 100000, 500, 1, CURRENT_TIMESTAMP + INTERVAL '30 days'),
('VALORANT5', '5% discount for Valorant products', 'percentage', 5.00, 25000, 50000, NULL, 3, CURRENT_TIMESTAMP + INTERVAL '90 days');

-- Default settings
INSERT INTO settings (setting_key, setting_value, description) VALUES 
('site_name', 'TopupGame.id', 'Nama website'),
('site_description', 'Topup game instant 24/7', 'Deskripsi website'),
('contact_email', 'support@topupgame.id', 'Email kontak support'),
('contact_whatsapp', '628123456789', 'Nomor WhatsApp untuk support'),
('admin_fee', '0', 'Biaya admin tambahan (dalam rupiah)'),
('min_order_amount', '10000', 'Minimal nominal order (dalam rupiah)'),
('auto_process_order', 'true', 'Otomatis proses order setelah payment success'),
('maintenance_mode', 'false', 'Mode maintenance');

-- ========================================
-- PART 7: FUNCTIONS & TRIGGERS
-- ========================================

-- Function: Update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON games FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_promo_codes_updated_at BEFORE UPDATE ON promo_codes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function: Update promo usage count
CREATE OR REPLACE FUNCTION update_promo_usage_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE promo_codes 
    SET current_usage_count = current_usage_count + 1
    WHERE id = NEW.promo_code_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for promo usage
CREATE TRIGGER trigger_update_promo_usage
AFTER INSERT ON promo_code_usage
FOR EACH ROW
EXECUTE FUNCTION update_promo_usage_count();

-- Function: Generate order number
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

-- Function: Validate promo code
CREATE OR REPLACE FUNCTION is_promo_code_valid(
    p_code VARCHAR(50),
    p_user_email VARCHAR(255),
    p_order_amount DECIMAL(10,2)
)
RETURNS TABLE (
    is_valid BOOLEAN,
    discount_type VARCHAR(20),
    discount_value DECIMAL(10,2),
    max_discount DECIMAL(10,2),
    message TEXT
) AS $$
DECLARE
    v_promo RECORD;
    v_usage_count INT;
BEGIN
    SELECT * INTO v_promo 
    FROM promo_codes 
    WHERE code = p_code 
    AND is_active = true;
    
    IF v_promo IS NULL THEN
        RETURN QUERY SELECT false, NULL::VARCHAR, NULL::DECIMAL, NULL::DECIMAL, 'Promo code not found'::TEXT;
        RETURN;
    END IF;
    
    IF v_promo.valid_until IS NOT NULL AND v_promo.valid_until < CURRENT_TIMESTAMP THEN
        RETURN QUERY SELECT false, NULL::VARCHAR, NULL::DECIMAL, NULL::DECIMAL, 'Promo code has expired'::TEXT;
        RETURN;
    END IF;
    
    IF v_promo.valid_from > CURRENT_TIMESTAMP THEN
        RETURN QUERY SELECT false, NULL::VARCHAR, NULL::DECIMAL, NULL::DECIMAL, 'Promo code not yet valid'::TEXT;
        RETURN;
    END IF;
    
    IF v_promo.min_order_amount IS NOT NULL AND p_order_amount < v_promo.min_order_amount THEN
        RETURN QUERY SELECT false, NULL::VARCHAR, NULL::DECIMAL, NULL::DECIMAL, 
            format('Minimum order amount is Rp %s', v_promo.min_order_amount)::TEXT;
        RETURN;
    END IF;
    
    IF v_promo.max_usage_total IS NOT NULL AND v_promo.current_usage_count >= v_promo.max_usage_total THEN
        RETURN QUERY SELECT false, NULL::VARCHAR, NULL::DECIMAL, NULL::DECIMAL, 'Promo code usage limit reached'::TEXT;
        RETURN;
    END IF;
    
    IF p_user_email IS NOT NULL THEN
        SELECT COUNT(*) INTO v_usage_count
        FROM promo_code_usage
        WHERE promo_code_id = v_promo.id
        AND user_email = p_user_email;
        
        IF v_promo.max_usage_per_user IS NOT NULL AND v_usage_count >= v_promo.max_usage_per_user THEN
            RETURN QUERY SELECT false, NULL::VARCHAR, NULL::DECIMAL, NULL::DECIMAL, 'You have already used this promo code'::TEXT;
            RETURN;
        END IF;
    END IF;
    
    RETURN QUERY SELECT true, v_promo.discount_type, v_promo.discount_value, 
                        v_promo.max_discount_amount, 'Promo code valid'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- PART 8: VIEWS
-- ========================================

CREATE VIEW dashboard_stats AS
SELECT 
    COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE) as today_orders,
    COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE AND order_status = 'success') as today_success,
    COALESCE(SUM(total_amount) FILTER (WHERE created_at::date = CURRENT_DATE AND payment_status = 'success'), 0) as today_revenue,
    COALESCE(SUM(promo_discount) FILTER (WHERE created_at::date = CURRENT_DATE AND payment_status = 'success'), 0) as today_promo_discount,
    COUNT(*) FILTER (WHERE order_status = 'pending') as pending_orders,
    COUNT(*) FILTER (WHERE order_status = 'processing') as processing_orders,
    COUNT(DISTINCT promo_code) FILTER (WHERE created_at::date = CURRENT_DATE AND promo_code IS NOT NULL) as promos_used_today
FROM orders;

-- ========================================
-- PART 9: COMMENTS
-- ========================================

COMMENT ON TABLE promo_codes IS 'Promo code master data';
COMMENT ON TABLE promo_code_usage IS 'Track promo code usage history';
COMMENT ON COLUMN promo_codes.discount_type IS 'percentage or fixed_amount';
COMMENT ON COLUMN orders.subtotal IS 'Order amount before any discounts';
COMMENT ON COLUMN orders.promo_discount IS 'Discount amount from promo code';
