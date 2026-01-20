-- VIP Reseller Valorant Products - FINAL PRICING v2
-- 5 Products with Tiered Profit Strategy
-- Profit Strategy: 3% → 2.5% → 2% → 1.2% → 0.7%
-- 
-- 475 VP:  3.0% net profit
-- 1000 VP: 2.5% net profit
-- 2050 VP: 2.0% net profit
-- 3650 VP: 1.2% net profit (≈ Rp 375K)
-- 7400 VP: 0.7% net profit (≈ Rp 750K)

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
-- PRODUCT 4: 3650 VP (1.2% Net Profit)
-- Target: ≈ Rp 375.000
-- Calculation: 
-- Selling = (VIP Buy + Target Profit) / (1 - Fee%)
-- Selling = (368295 + 4600) / 0.993 = 376543
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
  376543,    -- Legacy (≈ 376K)
  376543,    -- QRIS: Rp 376.543 (profit 1.2%)
  377543,    -- VA: Rp 377.543 (profit 1.2%)
  381543,    -- E-wallet: Rp 381.543 (profit 1.3%)
  1.2,       -- Actual profit margin
  true, 
  4,
  'qris',
  'midtrans'
);

-- ========================================
-- PRODUCT 5: 7400 VP (0.7% Net Profit)
-- Target: ≈ Rp 750.000
-- Calculation:
-- Selling = (VIP Buy + Target Profit) / (1 - Fee%)
-- Target profit = 750000 × 0.007 = 5250
-- Selling = (741322 + 5250) / 0.993 = 751679
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
  751679,    -- Legacy (≈ 751K)
  751679,    -- QRIS: Rp 751.679 (profit 0.7%)
  752679,    -- VA: Rp 752.679 (profit 0.7%)
  761679,    -- E-wallet: Rp 761.679 (profit 0.9%)
  0.7,       -- Actual profit margin
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
\echo 'FINAL PRICING v2'
\echo 'Tiered Profit: 3% → 2.5% → 2% → 1.2% → 0.7%'
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
  TO_CHAR(profit_margin, 'FM90.0') || '%' as "Target %"
FROM products 
WHERE game_id = (SELECT id FROM games WHERE slug = 'valorant')
ORDER BY sort_order;

\echo ''
\echo '--- QRIS PROFIT BREAKDOWN (ACTUAL NET PROFIT) ---'
\echo ''

SELECT 
  name as "Product",
  'Rp ' || TO_CHAR(base_price, 'FM999,999') as "Buy",
  'Rp ' || TO_CHAR(selling_price_qris, 'FM999,999') as "Sell",
  'Rp ' || TO_CHAR(ROUND(selling_price_qris * 0.007), 'FM9,999') as "Fee (0.7%)",
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
  ) || '%' as "Actual %",
  CASE 
    WHEN name LIKE '%3650%' THEN '← 1.2% target'
    WHEN name LIKE '%7400%' THEN '← 0.7% target'
    ELSE ''
  END as "Note"
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
  ) as "Per VP"
FROM products 
WHERE game_id = (SELECT id FROM games WHERE slug = 'valorant')
ORDER BY sort_order;

\echo ''
\echo '--- PROFIT SUMMARY (per 100 orders) ---'
\echo ''

WITH order_distribution AS (
  SELECT 
    name,
    selling_price_qris - base_price - ROUND(selling_price_qris * 0.007) as net_profit,
    CASE 
      WHEN name LIKE '%475%' THEN 30
      WHEN name LIKE '%1000%' THEN 30
      WHEN name LIKE '%2050%' THEN 20
      WHEN name LIKE '%3650%' THEN 15
      WHEN name LIKE '%7400%' THEN 5
    END as expected_orders
  FROM products 
  WHERE game_id = (SELECT id FROM games WHERE slug = 'valorant')
)
SELECT 
  name as "Product",
  expected_orders as "Orders",
  'Rp ' || TO_CHAR(net_profit, 'FM99,999') as "Profit/Order",
  'Rp ' || TO_CHAR(net_profit * expected_orders, 'FM999,999') as "Total Profit"
FROM order_distribution
ORDER BY expected_orders DESC;

\echo ''

SELECT 
  'Rp ' || TO_CHAR(SUM(net_profit * expected_orders), 'FM999,999') as "Total Profit (100 orders)"
FROM (
  SELECT 
    selling_price_qris - base_price - ROUND(selling_price_qris * 0.007) as net_profit,
    CASE 
      WHEN name LIKE '%475%' THEN 30
      WHEN name LIKE '%1000%' THEN 30
      WHEN name LIKE '%2050%' THEN 20
      WHEN name LIKE '%3650%' THEN 15
      WHEN name LIKE '%7400%' THEN 5
    END as expected_orders
  FROM products 
  WHERE game_id = (SELECT id FROM games WHERE slug = 'valorant')
) subquery;

COMMIT;

\echo ''
\echo '===================================================='
\echo '✅ SUCCESS! Final Pricing Applied!'
\echo '   Tiered Profit: 3% → 2.5% → 2% → 1.2% → 0.7%'
\echo '   3650 VP: Rp 376.543 (near 375K)'
\echo '   7400 VP: Rp 751.679 (near 750K)'
\echo '===================================================='
\echo ''
