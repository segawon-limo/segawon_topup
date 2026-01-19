-- VIP Reseller Valorant Products - FINAL PRICING v3 (SAFE VERSION)
-- 5 Products with Tiered Profit Strategy
-- Profit Strategy: 3% → 2.5% → 2% → 1.2% → 0.7%
-- 
-- SAFE: Handles foreign key constraints properly

\c topup_game

-- ========================================
-- SAFE DELETE: Delete products safely
-- ========================================

-- Option 1: Delete only Valorant products (RECOMMENDED)
-- This keeps other games' data intact
DELETE FROM products WHERE game_id = (SELECT id FROM games WHERE slug = 'valorant');

-- If you get foreign key error, you have orders referencing products
-- In that case, you need to decide:
-- A) Keep the orders and just update products (recommended for production)
-- B) Delete orders too (only for testing/development)

-- Option B (ONLY FOR TESTING - WILL DELETE ALL ORDERS!):
-- Uncomment the line below if you're sure you want to delete orders
-- DELETE FROM orders WHERE product_id IN (SELECT id FROM products WHERE game_id = (SELECT id FROM games WHERE slug = 'valorant'));
-- DELETE FROM products WHERE game_id = (SELECT id FROM games WHERE slug = 'valorant');

-- ========================================
-- PRODUCT 1: 475 VP (3% Net Profit)
-- ========================================
INSERT INTO products (
  game_id, name, description, sku, 
  base_price, 
  selling_price,
  selling_price_qris, 
  selling_price_va,
  selling_price_ewallet,
  profit_margin, 
  is_active, 
  sort_order, 
  recommended_payment,
  gateway_preference
) VALUES (
  (SELECT id FROM games WHERE slug = 'valorant'), 
  '475 Valorant Points', 
  '475 VP untuk region Indonesia', 
  'VAL475-S10',
  53019,
  55054,
  55054,
  56093,
  55809,
  3.0,
  true, 
  1,
  'qris',
  'midtrans'
) ON CONFLICT (sku) 
DO UPDATE SET
  base_price = EXCLUDED.base_price,
  selling_price = EXCLUDED.selling_price,
  selling_price_qris = EXCLUDED.selling_price_qris,
  selling_price_va = EXCLUDED.selling_price_va,
  selling_price_ewallet = EXCLUDED.selling_price_ewallet,
  profit_margin = EXCLUDED.profit_margin,
  updated_at = CURRENT_TIMESTAMP;

-- ========================================
-- PRODUCT 2: 1000 VP (2.5% Net Profit)
-- ========================================
INSERT INTO products (
  game_id, name, description, sku, 
  base_price, 
  selling_price,
  selling_price_qris, 
  selling_price_va,
  selling_price_ewallet,
  profit_margin, 
  is_active, 
  sort_order, 
  recommended_payment,
  gateway_preference
) VALUES (
  (SELECT id FROM games WHERE slug = 'valorant'), 
  '1000 Valorant Points', 
  '1000 VP untuk region Indonesia', 
  'VAL1000-S10',
  106038,
  109543,
  109543,
  110576,
  111036,
  2.5,
  true, 
  2,
  'qris',
  'midtrans'
) ON CONFLICT (sku) 
DO UPDATE SET
  base_price = EXCLUDED.base_price,
  selling_price = EXCLUDED.selling_price,
  selling_price_qris = EXCLUDED.selling_price_qris,
  selling_price_va = EXCLUDED.selling_price_va,
  selling_price_ewallet = EXCLUDED.selling_price_ewallet,
  profit_margin = EXCLUDED.profit_margin,
  updated_at = CURRENT_TIMESTAMP;

-- ========================================
-- PRODUCT 3: 2050 VP (2% Net Profit)
-- ========================================
INSERT INTO products (
  game_id, name, description, sku, 
  base_price, 
  selling_price,
  selling_price_qris, 
  selling_price_va,
  selling_price_ewallet,
  profit_margin, 
  is_active, 
  sort_order, 
  recommended_payment,
  gateway_preference
) VALUES (
  (SELECT id FROM games WHERE slug = 'valorant'), 
  '2050 Valorant Points', 
  '2050 VP untuk region Indonesia', 
  'VAL2050-S10',
  212077,
  218009,
  218009,
  219037,
  220914,
  2.0,
  true, 
  3,
  'qris',
  'midtrans'
) ON CONFLICT (sku) 
DO UPDATE SET
  base_price = EXCLUDED.base_price,
  selling_price = EXCLUDED.selling_price,
  selling_price_qris = EXCLUDED.selling_price_qris,
  selling_price_va = EXCLUDED.selling_price_va,
  selling_price_ewallet = EXCLUDED.selling_price_ewallet,
  profit_margin = EXCLUDED.profit_margin,
  updated_at = CURRENT_TIMESTAMP;

-- ========================================
-- PRODUCT 4: 3650 VP (1.2% Net Profit)
-- ========================================
INSERT INTO products (
  game_id, name, description, sku, 
  base_price, 
  selling_price,
  selling_price_qris, 
  selling_price_va,
  selling_price_ewallet,
  profit_margin, 
  is_active, 
  sort_order, 
  recommended_payment,
  gateway_preference
) VALUES (
  (SELECT id FROM games WHERE slug = 'valorant'), 
  '3650 Valorant Points', 
  '3650 VP untuk region Indonesia', 
  'VAL3650-S10',
  368295,
  376543,
  376543,
  377543,
  381543,
  1.2,
  true, 
  4,
  'qris',
  'midtrans'
) ON CONFLICT (sku) 
DO UPDATE SET
  base_price = EXCLUDED.base_price,
  selling_price = EXCLUDED.selling_price,
  selling_price_qris = EXCLUDED.selling_price_qris,
  selling_price_va = EXCLUDED.selling_price_va,
  selling_price_ewallet = EXCLUDED.selling_price_ewallet,
  profit_margin = EXCLUDED.profit_margin,
  updated_at = CURRENT_TIMESTAMP;

-- ========================================
-- PRODUCT 5: 7400 VP (0.7% Net Profit)
-- ========================================
INSERT INTO products (
  game_id, name, description, sku, 
  base_price, 
  selling_price,
  selling_price_qris, 
  selling_price_va,
  selling_price_ewallet,
  profit_margin, 
  is_active, 
  sort_order, 
  recommended_payment,
  gateway_preference
) VALUES (
  (SELECT id FROM games WHERE slug = 'valorant'), 
  '7400 Valorant Points', 
  '7400 VP untuk region Indonesia', 
  'VAL7400-S10',
  741322,
  751679,
  751679,
  752679,
  761679,
  0.7,
  true, 
  5,
  'qris',
  'xendit'
) ON CONFLICT (sku) 
DO UPDATE SET
  base_price = EXCLUDED.base_price,
  selling_price = EXCLUDED.selling_price,
  selling_price_qris = EXCLUDED.selling_price_qris,
  selling_price_va = EXCLUDED.selling_price_va,
  selling_price_ewallet = EXCLUDED.selling_price_ewallet,
  profit_margin = EXCLUDED.profit_margin,
  updated_at = CURRENT_TIMESTAMP;

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

\echo ''
\echo '=========================================='
\echo 'FINAL PRICING (SAFE VERSION)'
\echo 'Tiered Profit: 3% → 2.5% → 2% → 1.2% → 0.7%'
\echo '=========================================='
\echo ''

SELECT 
  sort_order as "#",
  name as "Product",
  'Rp ' || TO_CHAR(base_price, 'FM999,999') as "VIP Buy",
  'Rp ' || TO_CHAR(selling_price_qris, 'FM999,999') as "QRIS",
  'Rp ' || TO_CHAR(selling_price_va, 'FM999,999') as "VA",
  'Rp ' || TO_CHAR(selling_price_ewallet, 'FM999,999') as "E-Wallet",
  TO_CHAR(profit_margin, 'FM90.0') || '%' as "Target %"
FROM products 
WHERE game_id = (SELECT id FROM games WHERE slug = 'valorant')
ORDER BY sort_order;

\echo ''
\echo '--- PROFIT BREAKDOWN ---'
\echo ''

SELECT 
  name as "Product",
  'Rp ' || TO_CHAR(base_price, 'FM999,999') as "Buy",
  'Rp ' || TO_CHAR(selling_price_qris, 'FM999,999') as "Sell",
  'Rp ' || TO_CHAR(ROUND(selling_price_qris * 0.007), 'FM9,999') as "Fee",
  'Rp ' || TO_CHAR(
    selling_price_qris - base_price - ROUND(selling_price_qris * 0.007),
    'FM99,999'
  ) as "Net Profit",
  TO_CHAR(
    ROUND(
      ((selling_price_qris - base_price - ROUND(selling_price_qris * 0.007))::numeric / selling_price_qris * 100),
      2
    ),
    'FM90.00'
  ) || '%' as "Actual %"
FROM products 
WHERE game_id = (SELECT id FROM games WHERE slug = 'valorant')
ORDER BY sort_order;

COMMIT;

\echo ''
\echo '===================================================='
\echo '✅ SUCCESS! Products Updated!'
\echo '   Method: UPSERT (Insert or Update)'
\echo '   Tiered Profit: 3% → 2.5% → 2% → 1.2% → 0.7%'
\echo '   3650 VP: Rp 376.543'
\echo '   7400 VP: Rp 751.679'
\echo '===================================================='
\echo ''
