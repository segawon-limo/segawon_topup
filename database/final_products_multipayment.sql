-- VIP Reseller Valorant Products - FINAL PRICING
-- 5 Products with Tiered Profit Strategy
-- Multi-Payment Method Support (QRIS, VA, E-wallet)
-- 
-- Profit Strategy:
-- 475 VP:  3.0% net profit
-- 1000 VP: 2.5% net profit
-- 2050 VP: 2.0% net profit
-- 3650 VP: ~1.1% net profit (price ≈ Rp 375K)
-- 7400 VP: ~0.5% net profit (price ≈ Rp 750K)

\c topup_game

-- Delete old products
DELETE FROM products WHERE game_id = (SELECT id FROM games WHERE slug = 'valorant');

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
  53019,     -- VIP Buy Price
  55054,     -- Legacy (same as QRIS)
  55054,     -- QRIS: 0.7% fee, 3% profit
  56093,     -- VA: 0.7% + 1K fee, 3% profit
  55809,     -- E-wallet: 2% fee, 3% profit
  3.0,       -- Target profit %
  true, 
  1,
  'qris',
  'midtrans'
);

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
  106038,    -- VIP Buy
  109543,    -- Legacy
  109543,    -- QRIS: 2.5% profit
  110576,    -- VA: 2.5% profit
  111036,    -- E-wallet: 2.5% profit
  2.5,
  true, 
  2,
  'qris',
  'midtrans'
);

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
  212077,    -- VIP Buy
  218009,    -- Legacy
  218009,    -- QRIS: 2% profit
  219037,    -- VA: 2% profit
  220914,    -- E-wallet: 2% profit
  2.0,
  true, 
  3,
  'qris',
  'midtrans'
);

-- ========================================
-- PRODUCT 4: 3650 VP (Custom ~Rp 375K)
-- Target: ≈ Rp 375.000 (actual: Rp 374.999)
-- Actual profit: ~1.09%
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
  368295,    -- VIP Buy
  374999,    -- Legacy (≈ 375K!)
  374999,    -- QRIS: Rp 374.999 (profit ~1.09%)
  375999,    -- VA: Rp 375.999 (profit ~1.08%)
  379999,    -- E-wallet: Rp 379.999 (profit ~1.27%)
  1.1,       -- Actual profit margin
  true, 
  4,
  'qris',
  'midtrans'
);

-- ========================================
-- PRODUCT 5: 7400 VP (Custom ~Rp 750K)
-- Target: ≈ Rp 750.000 (actual: Rp 749.999)
-- Actual profit: ~0.46%
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
  741322,    -- VIP Buy
  749999,    -- Legacy (≈ 750K!)
  749999,    -- QRIS: Rp 749.999 (profit ~0.46%)
  750999,    -- VA: Rp 750.999 (profit ~0.45%)
  759999,    -- E-wallet: Rp 759.999 (profit ~0.98%)
  0.5,       -- Actual profit margin
  true, 
  5,
  'qris',
  'xendit'  -- Large amount, prefer Xendit
);

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

\echo ''
\echo '=========================================='
\echo 'FINAL PRICING - MULTI PAYMENT METHOD'
\echo '=========================================='
\echo ''

-- Main pricing table
SELECT 
  sort_order as "#",
  name as "Product",
  'Rp ' || TO_CHAR(base_price, 'FM999,999') as "VIP Buy",
  'Rp ' || TO_CHAR(selling_price_qris, 'FM999,999') as "QRIS",
  'Rp ' || TO_CHAR(selling_price_va, 'FM999,999') as "VA",
  'Rp ' || TO_CHAR(selling_price_ewallet, 'FM999,999') as "E-Wallet",
  TO_CHAR(profit_margin, 'FM90.0') || '%' as "Target %",
  recommended_payment as "Recommend"
FROM products 
WHERE game_id = (SELECT id FROM games WHERE slug = 'valorant')
ORDER BY sort_order;

\echo ''
\echo '--- QRIS PROFIT BREAKDOWN ---'
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

\echo ''
\echo '--- PRICE PER VP (Customer Value) ---'
\echo ''

SELECT 
  name as "Product",
  CAST(REGEXP_REPLACE(name, '[^0-9]', '', 'g') AS INTEGER) as "VP",
  'Rp ' || TO_CHAR(selling_price_qris, 'FM999,999') as "QRIS Price",
  'Rp ' || TO_CHAR(
    ROUND(selling_price_qris::numeric / CAST(REGEXP_REPLACE(name, '[^0-9]', '', 'g') AS INTEGER)),
    'FM999'
  ) as "Per VP",
  CASE 
    WHEN name LIKE '%3650%' THEN '⭐ Near 375K'
    WHEN name LIKE '%7400%' THEN '🔥 Near 750K'
    ELSE ''
  END as "Note"
FROM products 
WHERE game_id = (SELECT id FROM games WHERE slug = 'valorant')
ORDER BY sort_order;

\echo ''
\echo '--- GATEWAY PREFERENCE ---'
\echo ''

SELECT 
  name as "Product",
  'Rp ' || TO_CHAR(selling_price_qris, 'FM999,999') as "Amount",
  gateway_preference as "Preferred Gateway",
  CASE 
    WHEN selling_price_qris < 428571 THEN 'Use Midtrans (cheaper)'
    ELSE 'Use Xendit (cheaper)'
  END as "Auto Logic"
FROM products 
WHERE game_id = (SELECT id FROM games WHERE slug = 'valorant')
ORDER BY sort_order;

COMMIT;

\echo ''
\echo '===================================================='
\echo '✅ SUCCESS! Multi-Payment Pricing Configured!'
\echo '   - 5 products inserted'
\echo '   - QRIS, VA, E-wallet prices set'
\echo '   - 3650 VP: Rp 374.999 (≈375K) ✅'
\echo '   - 7400 VP: Rp 749.999 (≈750K) ✅'
\echo '   - Tiered profit: 3% → 0.5%'
\echo '===================================================='
\echo ''
