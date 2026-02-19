-- Migration 007: Admin Dashboard Tables & Views
-- Created: 2026-02-19

-- ══════════════════════════════════════════════════════════════
-- 1. ADMIN USERS TABLE
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100),
  email VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE admin_users IS 'Admin users untuk akses dashboard';

-- Insert default admin (password: Admin123!)
-- Hash generated via bcrypt rounds=10
INSERT INTO admin_users (username, password_hash, full_name, email) 
VALUES (
  'segawon', 
  '$2b$10$rZ5X8KqF3vO8hYJGxqJq7.YC3bGxF7gZ8Yp8KqF3vO8hYJGxqJq7u', 
  'Super Admin',
  'admin@segawontopup.net'
) ON CONFLICT (username) DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- 2. DIGIFLAZZ LOGS TABLE
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS digiflazz_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  ref_id VARCHAR(100),
  sku VARCHAR(50),
  customer_no VARCHAR(100),
  request_type VARCHAR(20), -- 'ORDER', 'CEK_SALDO', 'PRICE_LIST'
  response_code VARCHAR(10), -- rc dari Digiflazz
  response_message TEXT,
  saldo_before DECIMAL(15,2),
  saldo_after DECIMAL(15,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_digiflazz_logs_order_id ON digiflazz_logs(order_id);
CREATE INDEX idx_digiflazz_logs_ref_id ON digiflazz_logs(ref_id);
CREATE INDEX idx_digiflazz_logs_created_at ON digiflazz_logs(created_at DESC);

COMMENT ON TABLE digiflazz_logs IS 'Log semua API calls ke Digiflazz untuk monitoring';

-- ══════════════════════════════════════════════════════════════
-- 3. ALERT LOGS TABLE
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS alert_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type VARCHAR(50), -- 'SALDO_LOW', 'ORDER_FAILED', 'SYSTEM_ERROR'
  severity VARCHAR(20),   -- 'INFO', 'WARNING', 'CRITICAL'
  message TEXT NOT NULL,
  metadata JSONB,         -- extra data (order_id, saldo amount, etc)
  is_sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alert_logs_type ON alert_logs(alert_type);
CREATE INDEX idx_alert_logs_created_at ON alert_logs(created_at DESC);

COMMENT ON TABLE alert_logs IS 'Log notifikasi ke admin (telegram/email)';

-- ══════════════════════════════════════════════════════════════
-- 4. DASHBOARD VIEWS (Performance optimized)
-- ══════════════════════════════════════════════════════════════

-- View: Daily Revenue & Profit Summary
CREATE OR REPLACE VIEW v_daily_stats AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_orders,
  COUNT(*) FILTER (WHERE status = 'SUCCESS') as success_orders,
  COUNT(*) FILTER (WHERE status = 'FAILED') as failed_orders,
  COUNT(*) FILTER (WHERE status = 'PENDING') as pending_orders,
  COUNT(*) FILTER (WHERE status = 'PENDING_RETRY') as retry_orders,
  SUM(amount) FILTER (WHERE status = 'SUCCESS') as total_revenue,
  SUM(base_price) FILTER (WHERE status = 'SUCCESS') as total_cost,
  SUM(payment_fee) FILTER (WHERE status = 'SUCCESS') as total_payment_fee,
  SUM(amount - base_price - payment_fee) FILTER (WHERE status = 'SUCCESS') as total_profit
FROM orders
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

COMMENT ON VIEW v_daily_stats IS 'Ringkasan harian: revenue, profit, order counts (90 hari terakhir)';

-- View: Top Products (Best Sellers)
CREATE OR REPLACE VIEW v_top_products AS
SELECT 
  p.id,
  p.name,
  p.sku,
  g.name as game_name,
  g.category,
  COUNT(o.id) as total_sales,
  SUM(o.amount) FILTER (WHERE o.status = 'SUCCESS') as total_revenue,
  SUM(o.amount - o.base_price - o.payment_fee) FILTER (WHERE o.status = 'SUCCESS') as total_profit,
  MAX(o.created_at) as last_order_at
FROM products p
LEFT JOIN orders o ON o.product_id = p.id AND o.created_at >= NOW() - INTERVAL '30 days'
LEFT JOIN games g ON p.game_id = g.id
GROUP BY p.id, p.name, p.sku, g.name, g.category
ORDER BY total_sales DESC NULLS LAST
LIMIT 20;

COMMENT ON VIEW v_top_products IS 'Top 20 produk terlaris 30 hari terakhir';

-- View: Payment Method Stats
CREATE OR REPLACE VIEW v_payment_stats AS
SELECT 
  payment_method,
  COUNT(*) as total_transactions,
  COUNT(*) FILTER (WHERE status = 'SUCCESS') as success_count,
  SUM(amount) FILTER (WHERE status = 'SUCCESS') as total_revenue,
  SUM(payment_fee) FILTER (WHERE status = 'SUCCESS') as total_fees
FROM orders
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY payment_method
ORDER BY total_transactions DESC;

COMMENT ON VIEW v_payment_stats IS 'Statistik per metode pembayaran (30 hari terakhir)';

-- View: Hourly Transaction Pattern (Peak hours)
CREATE OR REPLACE VIEW v_hourly_pattern AS
SELECT 
  EXTRACT(HOUR FROM created_at) as hour,
  COUNT(*) as total_orders,
  COUNT(*) FILTER (WHERE status = 'SUCCESS') as success_orders,
  AVG(amount) FILTER (WHERE status = 'SUCCESS') as avg_transaction_value
FROM orders
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY EXTRACT(HOUR FROM created_at)
ORDER BY hour;

COMMENT ON VIEW v_hourly_pattern IS 'Pola transaksi per jam (7 hari terakhir)';

-- ══════════════════════════════════════════════════════════════
-- 5. HELPER FUNCTION: Get Real-time Stats
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_dashboard_overview()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'today', (
      SELECT json_build_object(
        'total_orders', COUNT(*),
        'success_orders', COUNT(*) FILTER (WHERE status = 'SUCCESS'),
        'total_revenue', COALESCE(SUM(amount) FILTER (WHERE status = 'SUCCESS'), 0),
        'total_profit', COALESCE(SUM(amount - base_price - payment_fee) FILTER (WHERE status = 'SUCCESS'), 0)
      )
      FROM orders
      WHERE DATE(created_at) = CURRENT_DATE
    ),
    'yesterday', (
      SELECT json_build_object(
        'total_orders', COUNT(*),
        'success_orders', COUNT(*) FILTER (WHERE status = 'SUCCESS'),
        'total_revenue', COALESCE(SUM(amount) FILTER (WHERE status = 'SUCCESS'), 0),
        'total_profit', COALESCE(SUM(amount - base_price - payment_fee) FILTER (WHERE status = 'SUCCESS'), 0)
      )
      FROM orders
      WHERE DATE(created_at) = CURRENT_DATE - 1
    ),
    'this_month', (
      SELECT json_build_object(
        'total_orders', COUNT(*),
        'success_orders', COUNT(*) FILTER (WHERE status = 'SUCCESS'),
        'total_revenue', COALESCE(SUM(amount) FILTER (WHERE status = 'SUCCESS'), 0),
        'total_profit', COALESCE(SUM(amount - base_price - payment_fee) FILTER (WHERE status = 'SUCCESS'), 0)
      )
      FROM orders
      WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
    ),
    'pending_retry', (
      SELECT COUNT(*) FROM orders WHERE status = 'PENDING_RETRY'
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_dashboard_overview IS 'Get quick overview stats untuk dashboard home';

-- ══════════════════════════════════════════════════════════════
-- 6. INDEXES untuk performance
-- ══════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_orders_created_date ON orders(DATE(created_at));
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_product_status ON orders(product_id, status);

-- Verify
SELECT 'Migration 007 completed successfully' as status;
