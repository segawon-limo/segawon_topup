-- VIP Reseller Valorant Products - ALL 22 PRODUCTS
-- Complete product lineup from test results
-- Run this in PostgreSQL

\c topup_game

-- Delete old products
DELETE FROM products WHERE game_id = (SELECT id FROM games WHERE slug = 'valorant');

-- Insert ALL 22 Valorant products with VIP Reseller codes

-- 1. 475 VP
INSERT INTO products (game_id, name, description, sku, base_price, selling_price, profit_margin, is_active, sort_order) 
VALUES (
  (SELECT id FROM games WHERE slug = 'valorant'), 
  '475 Valorant Points', 
  '475 VP untuk region Indonesia', 
  'VAL475-S10',
  53019,
  62000,
  16.9,
  true, 
  1
);

-- 2. 1000 VP
INSERT INTO products (game_id, name, description, sku, base_price, selling_price, profit_margin, is_active, sort_order) 
VALUES (
  (SELECT id FROM games WHERE slug = 'valorant'), 
  '1000 Valorant Points', 
  '1000 VP untuk region Indonesia', 
  'VAL1000-S10',
  106038,
  125000,
  17.9,
  true, 
  2
);

-- 3. 1475 VP
INSERT INTO products (game_id, name, description, sku, base_price, selling_price, profit_margin, is_active, sort_order) 
VALUES (
  (SELECT id FROM games WHERE slug = 'valorant'), 
  '1475 Valorant Points', 
  '1475 VP untuk region Indonesia', 
  'VAL1475-S10',
  159057,
  185000,
  16.3,
  true, 
  3
);

-- 4. 2050 VP
INSERT INTO products (game_id, name, description, sku, base_price, selling_price, profit_margin, is_active, sort_order) 
VALUES (
  (SELECT id FROM games WHERE slug = 'valorant'), 
  '2050 Valorant Points', 
  '2050 VP untuk region Indonesia', 
  'VAL2050-S10',
  212077,
  245000,
  15.5,
  true, 
  4
);

-- 5. 2525 VP
INSERT INTO products (game_id, name, description, sku, base_price, selling_price, profit_margin, is_active, sort_order) 
VALUES (
  (SELECT id FROM games WHERE slug = 'valorant'), 
  '2525 Valorant Points', 
  '2525 VP untuk region Indonesia', 
  'VAL2525-S10',
  265096,
  305000,
  15.1,
  true, 
  5
);

-- 6. 3050 VP
INSERT INTO products (game_id, name, description, sku, base_price, selling_price, profit_margin, is_active, sort_order) 
VALUES (
  (SELECT id FROM games WHERE slug = 'valorant'), 
  '3050 Valorant Points', 
  '3050 VP untuk region Indonesia', 
  'VAL3050-S10',
  318115,
  365000,
  14.7,
  true, 
  6
);

-- 7. 3650 VP
INSERT INTO products (game_id, name, description, sku, base_price, selling_price, profit_margin, is_active, sort_order) 
VALUES (
  (SELECT id FROM games WHERE slug = 'valorant'), 
  '3650 Valorant Points', 
  '3650 VP untuk region Indonesia', 
  'VAL3650-S10',
  368295,
  420000,
  14.0,
  true, 
  7
);

-- 8. 4125 VP
INSERT INTO products (game_id, name, description, sku, base_price, selling_price, profit_margin, is_active, sort_order) 
VALUES (
  (SELECT id FROM games WHERE slug = 'valorant'), 
  '4125 Valorant Points', 
  '4125 VP untuk region Indonesia', 
  'VAL4125-S10',
  421314,
  480000,
  13.9,
  true, 
  8
);

-- 9. 4650 VP
INSERT INTO products (game_id, name, description, sku, base_price, selling_price, profit_margin, is_active, sort_order) 
VALUES (
  (SELECT id FROM games WHERE slug = 'valorant'), 
  '4650 Valorant Points', 
  '4650 VP untuk region Indonesia', 
  'VAL4650-S10',
  474333,
  540000,
  13.8,
  true, 
  9
);

-- 10. 5350 VP
INSERT INTO products (game_id, name, description, sku, base_price, selling_price, profit_margin, is_active, sort_order) 
VALUES (
  (SELECT id FROM games WHERE slug = 'valorant'), 
  '5350 Valorant Points', 
  '5350 VP untuk region Indonesia', 
  'VAL5350-S10',
  529245,
  600000,
  13.4,
  true, 
  10
);

-- 11. 5700 VP
INSERT INTO products (game_id, name, description, sku, base_price, selling_price, profit_margin, is_active, sort_order) 
VALUES (
  (SELECT id FROM games WHERE slug = 'valorant'), 
  '5700 Valorant Points', 
  '5700 VP untuk region Indonesia', 
  'VAL5700-S10',
  580371,
  660000,
  13.7,
  true, 
  11
);

-- 12. 5825 VP
INSERT INTO products (game_id, name, description, sku, base_price, selling_price, profit_margin, is_active, sort_order) 
VALUES (
  (SELECT id FROM games WHERE slug = 'valorant'), 
  '5825 Valorant Points', 
  '5825 VP untuk region Indonesia', 
  'VAL5825-S10',
  582265,
  665000,
  14.2,
  true, 
  12
);

-- 13. 6350 VP
INSERT INTO products (game_id, name, description, sku, base_price, selling_price, profit_margin, is_active, sort_order) 
VALUES (
  (SELECT id FROM games WHERE slug = 'valorant'), 
  '6350 Valorant Points', 
  '6350 VP untuk region Indonesia', 
  'VAL6350-S10',
  635284,
  720000,
  13.3,
  true, 
  13
);

-- 14. 7400 VP
INSERT INTO products (game_id, name, description, sku, base_price, selling_price, profit_margin, is_active, sort_order) 
VALUES (
  (SELECT id FROM games WHERE slug = 'valorant'), 
  '7400 Valorant Points', 
  '7400 VP untuk region Indonesia', 
  'VAL7400-S10',
  741322,
  840000,
  13.3,
  true, 
  14
);

-- 15. 9000 VP
INSERT INTO products (game_id, name, description, sku, base_price, selling_price, profit_margin, is_active, sort_order) 
VALUES (
  (SELECT id FROM games WHERE slug = 'valorant'), 
  '9000 Valorant Points', 
  '9000 VP untuk region Indonesia', 
  'VAL9000-S10',
  897540,
  1015000,
  13.1,
  true, 
  15
);

-- 16. 11000 VP
INSERT INTO products (game_id, name, description, sku, base_price, selling_price, profit_margin, is_active, sort_order) 
VALUES (
  (SELECT id FROM games WHERE slug = 'valorant'), 
  '11000 Valorant Points', 
  '11000 VP untuk region Indonesia', 
  'VAL11000-S10',
  1040502,
  1175000,
  12.9,
  true, 
  16
);

-- 17. 11475 VP
INSERT INTO products (game_id, name, description, sku, base_price, selling_price, profit_margin, is_active, sort_order) 
VALUES (
  (SELECT id FROM games WHERE slug = 'valorant'), 
  '11475 Valorant Points', 
  '11475 VP untuk region Indonesia', 
  'VAL11475-S10',
  1093521,
  1235000,
  12.9,
  true, 
  17
);

-- 18. 12000 VP
INSERT INTO products (game_id, name, description, sku, base_price, selling_price, profit_margin, is_active, sort_order) 
VALUES (
  (SELECT id FROM games WHERE slug = 'valorant'), 
  '12000 Valorant Points', 
  '12000 VP untuk region Indonesia', 
  'VAL12000-S10',
  1146540,
  1295000,
  12.9,
  true, 
  18
);

-- 19. 13050 VP
INSERT INTO products (game_id, name, description, sku, base_price, selling_price, profit_margin, is_active, sort_order) 
VALUES (
  (SELECT id FROM games WHERE slug = 'valorant'), 
  '13050 Valorant Points', 
  '13050 VP untuk region Indonesia', 
  'VAL13050-S10',
  1252580,
  1415000,
  13.0,
  true, 
  19
);

-- 20. 14650 VP
INSERT INTO products (game_id, name, description, sku, base_price, selling_price, profit_margin, is_active, sort_order) 
VALUES (
  (SELECT id FROM games WHERE slug = 'valorant'), 
  '14650 Valorant Points', 
  '14650 VP untuk region Indonesia', 
  'VAL14650-S10',
  1408797,
  1590000,
  12.9,
  true, 
  20
);

-- 21. 16350 VP
INSERT INTO products (game_id, name, description, sku, base_price, selling_price, profit_margin, is_active, sort_order) 
VALUES (
  (SELECT id FROM games WHERE slug = 'valorant'), 
  '16350 Valorant Points', 
  '16350 VP untuk region Indonesia', 
  'VAL16350-S10',
  1569748,
  1770000,
  12.8,
  true, 
  21
);

-- 22. 22000 VP
INSERT INTO products (game_id, name, description, sku, base_price, selling_price, profit_margin, is_active, sort_order) 
VALUES (
  (SELECT id FROM games WHERE slug = 'valorant'), 
  '22000 Valorant Points', 
  '22000 VP untuk region Indonesia', 
  'VAL22000-S10',
  2081005,
  2345000,
  12.7,
  true, 
  22
);

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- 1. Count products
SELECT COUNT(*) as total_products 
FROM products 
WHERE game_id = (SELECT id FROM games WHERE slug = 'valorant');

-- 2. Show all products with formatted prices
SELECT 
  sort_order as "#",
  name,
  sku,
  'Rp ' || TO_CHAR(base_price, 'FM999,999,999') as "VIP Price",
  'Rp ' || TO_CHAR(selling_price, 'FM999,999,999') as "Customer Price",
  TO_CHAR(profit_margin, 'FM90.0') || '%' as "Margin"
FROM products 
WHERE game_id = (SELECT id FROM games WHERE slug = 'valorant')
ORDER BY sort_order;

-- 3. Calculate net profits (after Xendit fee)
SELECT 
  name,
  'Rp ' || TO_CHAR(base_price, 'FM999,999,999') as buy_price,
  'Rp ' || TO_CHAR(selling_price, 'FM999,999,999') as sell_price,
  'Rp ' || TO_CHAR(selling_price - base_price, 'FM999,999,999') as gross_profit,
  'Rp ' || TO_CHAR(ROUND((selling_price * 0.029) + 2000), 'FM999,999,999') as xendit_fee,
  'Rp ' || TO_CHAR(
    ROUND(selling_price - base_price - ((selling_price * 0.029) + 2000)), 
    'FM999,999,999'
  ) as net_profit,
  TO_CHAR(
    ROUND(
      ((selling_price - base_price - ((selling_price * 0.029) + 2000)) / selling_price * 100)::numeric, 
      2
    ), 
    'FM90.00'
  ) || '%' as net_margin
FROM products 
WHERE game_id = (SELECT id FROM games WHERE slug = 'valorant')
ORDER BY sort_order;

-- 4. Summary statistics
SELECT 
  COUNT(*) as total_products,
  'Rp ' || TO_CHAR(MIN(selling_price), 'FM999,999,999') as cheapest,
  'Rp ' || TO_CHAR(MAX(selling_price), 'FM999,999,999') as most_expensive,
  'Rp ' || TO_CHAR(AVG(selling_price)::integer, 'FM999,999,999') as average_price
FROM products 
WHERE game_id = (SELECT id FROM games WHERE slug = 'valorant');

-- 5. Expected revenue calculator (example: 10 orders each)
SELECT 
  SUM(selling_price * 10) as total_revenue_10_orders_each,
  SUM((selling_price - base_price) * 10) as gross_profit_10_orders_each,
  SUM(ROUND(selling_price - base_price - ((selling_price * 0.029) + 2000)) * 10) as net_profit_10_orders_each
FROM products 
WHERE game_id = (SELECT id FROM games WHERE slug = 'valorant');

COMMIT;

\echo ''
\echo '============================================'
\echo 'SUCCESS! All 22 Valorant products inserted!'
\echo '============================================'
\echo ''
