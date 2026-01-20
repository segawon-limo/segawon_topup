-- VIP Reseller Valorant Products - ALL 22 PRODUCTS
-- Pricing Strategy: 5% NET PROFIT (after Xendit fee)
-- Xendit Fee: 2.9% + Rp 2.000
-- Formula: Selling Price = (Buy Price + 2000) / 0.921

\c topup_game

-- Delete old products
DELETE FROM products WHERE game_id = (SELECT id FROM games WHERE slug = 'valorant');

-- Insert ALL 22 Valorant products with 5% net profit pricing

-- 1. 475 VP
-- Buy: 53019, Calculated Sell: 59762
INSERT INTO products (game_id, name, description, sku, base_price, selling_price, profit_margin, is_active, sort_order) 
VALUES (
  (SELECT id FROM games WHERE slug = 'valorant'), 
  '475 Valorant Points', 
  '475 VP untuk region Indonesia', 
  'VAL475-S10',
  53019,
  59762,
  12.7,
  true, 
  1
);

-- 2. 1000 VP
-- Buy: 106038, Calculated Sell: 117280
INSERT INTO products (game_id, name, description, sku, base_price, selling_price, profit_margin, is_active, sort_order) 
VALUES (
  (SELECT id FROM games WHERE slug = 'valorant'), 
  '1000 Valorant Points', 
  '1000 VP untuk region Indonesia', 
  'VAL1000-S10',
  106038,
  117280,
  10.6,
  true, 
  2
);

-- 3. 1475 VP
-- Buy: 159057, Calculated Sell: 174844
INSERT INTO products (game_id, name, description, sku, base_price, selling_price, profit_margin, is_active, sort_order) 
VALUES (
  (SELECT id FROM games WHERE slug = 'valorant'), 
  '1475 Valorant Points', 
  '1475 VP untuk region Indonesia', 
  'VAL1475-S10',
  159057,
  174844,
  9.9,
  true, 
  3
);

-- 4. 2050 VP
-- Buy: 212077, Calculated Sell: 232498
INSERT INTO products (game_id, name, description, sku, base_price, selling_price, profit_margin, is_active, sort_order) 
VALUES (
  (SELECT id FROM games WHERE slug = 'valorant'), 
  '2050 Valorant Points', 
  '2050 VP untuk region Indonesia', 
  'VAL2050-S10',
  212077,
  232498,
  9.6,
  true, 
  4
);

-- 5. 2525 VP
-- Buy: 265096, Calculated Sell: 290052
INSERT INTO products (game_id, name, description, sku, base_price, selling_price, profit_margin, is_active, sort_order) 
VALUES (
  (SELECT id FROM games WHERE slug = 'valorant'), 
  '2525 Valorant Points', 
  '2525 VP untuk region Indonesia', 
  'VAL2525-S10',
  265096,
  290052,
  9.4,
  true, 
  5
);

-- 6. 3050 VP
-- Buy: 318115, Calculated Sell: 347606
INSERT INTO products (game_id, name, description, sku, base_price, selling_price, profit_margin, is_active, sort_order) 
VALUES (
  (SELECT id FROM games WHERE slug = 'valorant'), 
  '3050 Valorant Points', 
  '3050 VP untuk region Indonesia', 
  'VAL3050-S10',
  318115,
  347606,
  9.3,
  true, 
  6
);

-- 7. 3650 VP
-- Buy: 368295, Calculated Sell: 402054
INSERT INTO products (game_id, name, description, sku, base_price, selling_price, profit_margin, is_active, sort_order) 
VALUES (
  (SELECT id FROM games WHERE slug = 'valorant'), 
  '3650 Valorant Points', 
  '3650 VP untuk region Indonesia', 
  'VAL3650-S10',
  368295,
  402054,
  9.2,
  true, 
  7
);

-- 8. 4125 VP
-- Buy: 421314, Calculated Sell: 459687
INSERT INTO products (game_id, name, description, sku, base_price, selling_price, profit_margin, is_active, sort_order) 
VALUES (
  (SELECT id FROM games WHERE slug = 'valorant'), 
  '4125 Valorant Points', 
  '4125 VP untuk region Indonesia', 
  'VAL4125-S10',
  421314,
  459687,
  9.1,
  true, 
  8
);

-- 9. 4650 VP
-- Buy: 474333, Calculated Sell: 517320
INSERT INTO products (game_id, name, description, sku, base_price, selling_price, profit_margin, is_active, sort_order) 
VALUES (
  (SELECT id FROM games WHERE slug = 'valorant'), 
  '4650 Valorant Points', 
  '4650 VP untuk region Indonesia', 
  'VAL4650-S10',
  474333,
  517320,
  9.1,
  true, 
  9
);

-- 10. 5350 VP
-- Buy: 529245, Calculated Sell: 576954
INSERT INTO products (game_id, name, description, sku, base_price, selling_price, profit_margin, is_active, sort_order) 
VALUES (
  (SELECT id FROM games WHERE slug = 'valorant'), 
  '5350 Valorant Points', 
  '5350 VP untuk region Indonesia', 
  'VAL5350-S10',
  529245,
  576954,
  9.0,
  true, 
  10
);

-- 11. 5700 VP
-- Buy: 580371, Calculated Sell: 632481
INSERT INTO products (game_id, name, description, sku, base_price, selling_price, profit_margin, is_active, sort_order) 
VALUES (
  (SELECT id FROM games WHERE slug = 'valorant'), 
  '5700 Valorant Points', 
  '5700 VP untuk region Indonesia', 
  'VAL5700-S10',
  580371,
  632481,
  9.0,
  true, 
  11
);

-- 12. 5825 VP
-- Buy: 582265, Calculated Sell: 634539
INSERT INTO products (game_id, name, description, sku, base_price, selling_price, profit_margin, is_active, sort_order) 
VALUES (
  (SELECT id FROM games WHERE slug = 'valorant'), 
  '5825 Valorant Points', 
  '5825 VP untuk region Indonesia', 
  'VAL5825-S10',
  582265,
  634539,
  9.0,
  true, 
  12
);

-- 13. 6350 VP
-- Buy: 635284, Calculated Sell: 692167
INSERT INTO products (game_id, name, description, sku, base_price, selling_price, profit_margin, is_active, sort_order) 
VALUES (
  (SELECT id FROM games WHERE slug = 'valorant'), 
  '6350 Valorant Points', 
  '6350 VP untuk region Indonesia', 
  'VAL6350-S10',
  635284,
  692167,
  9.0,
  true, 
  13
);

-- 14. 7400 VP
-- Buy: 741322, Calculated Sell: 807318
INSERT INTO products (game_id, name, description, sku, base_price, selling_price, profit_margin, is_active, sort_order) 
VALUES (
  (SELECT id FROM games WHERE slug = 'valorant'), 
  '7400 Valorant Points', 
  '7400 VP untuk region Indonesia', 
  'VAL7400-S10',
  741322,
  807318,
  8.9,
  true, 
  14
);

-- 15. 9000 VP
-- Buy: 897540, Calculated Sell: 976797
INSERT INTO products (game_id, name, description, sku, base_price, selling_price, profit_margin, is_active, sort_order) 
VALUES (
  (SELECT id FROM games WHERE slug = 'valorant'), 
  '9000 Valorant Points', 
  '9000 VP untuk region Indonesia', 
  'VAL9000-S10',
  897540,
  976797,
  8.8,
  true, 
  15
);

-- 16. 11000 VP
-- Buy: 1040502, Calculated Sell: 1131848
INSERT INTO products (game_id, name, description, sku, base_price, selling_price, profit_margin, is_active, sort_order) 
VALUES (
  (SELECT id FROM games WHERE slug = 'valorant'), 
  '11000 Valorant Points', 
  '11000 VP untuk region Indonesia', 
  'VAL11000-S10',
  1040502,
  1131848,
  8.8,
  true, 
  16
);

-- 17. 11475 VP
-- Buy: 1093521, Calculated Sell: 1189435
INSERT INTO products (game_id, name, description, sku, base_price, selling_price, profit_margin, is_active, sort_order) 
VALUES (
  (SELECT id FROM games WHERE slug = 'valorant'), 
  '11475 Valorant Points', 
  '11475 VP untuk region Indonesia', 
  'VAL11475-S10',
  1093521,
  1189435,
  8.8,
  true, 
  17
);

-- 18. 12000 VP
-- Buy: 1146540, Calculated Sell: 1247023
INSERT INTO products (game_id, name, description, sku, base_price, selling_price, profit_margin, is_active, sort_order) 
VALUES (
  (SELECT id FROM games WHERE slug = 'valorant'), 
  '12000 Valorant Points', 
  '12000 VP untuk region Indonesia', 
  'VAL12000-S10',
  1146540,
  1247023,
  8.8,
  true, 
  18
);

-- 19. 13050 VP
-- Buy: 1252580, Calculated Sell: 1362177
INSERT INTO products (game_id, name, description, sku, base_price, selling_price, profit_margin, is_active, sort_order) 
VALUES (
  (SELECT id FROM games WHERE slug = 'valorant'), 
  '13050 Valorant Points', 
  '13050 VP untuk region Indonesia', 
  'VAL13050-S10',
  1252580,
  1362177,
  8.7,
  true, 
  19
);

-- 20. 14650 VP
-- Buy: 1408797, Calculated Sell: 1531764
INSERT INTO products (game_id, name, description, sku, base_price, selling_price, profit_margin, is_active, sort_order) 
VALUES (
  (SELECT id FROM games WHERE slug = 'valorant'), 
  '14650 Valorant Points', 
  '14650 VP untuk region Indonesia', 
  'VAL14650-S10',
  1408797,
  1531764,
  8.7,
  true, 
  20
);

-- 21. 16350 VP
-- Buy: 1569748, Calculated Sell: 1706302
INSERT INTO products (game_id, name, description, sku, base_price, selling_price, profit_margin, is_active, sort_order) 
VALUES (
  (SELECT id FROM games WHERE slug = 'valorant'), 
  '16350 Valorant Points', 
  '16350 VP untuk region Indonesia', 
  'VAL16350-S10',
  1569748,
  1706302,
  8.7,
  true, 
  21
);

-- 22. 22000 VP
-- Buy: 2081005, Calculated Sell: 2261314
INSERT INTO products (game_id, name, description, sku, base_price, selling_price, profit_margin, is_active, sort_order) 
VALUES (
  (SELECT id FROM games WHERE slug = 'valorant'), 
  '22000 Valorant Points', 
  '22000 VP untuk region Indonesia', 
  'VAL22000-S10',
  2081005,
  2261314,
  8.7,
  true, 
  22
);

-- ========================================
-- VERIFICATION WITH NET PROFIT CALCULATION
-- ========================================

-- Show all products with NET profit (after Xendit fee)
SELECT 
  sort_order as "#",
  name,
  sku,
  'Rp ' || TO_CHAR(base_price, 'FM999,999,999') as "Buy Price",
  'Rp ' || TO_CHAR(selling_price, 'FM999,999,999') as "Sell Price",
  'Rp ' || TO_CHAR(selling_price - base_price, 'FM999,999,999') as "Gross Profit",
  'Rp ' || TO_CHAR(ROUND((selling_price * 0.029) + 2000), 'FM999,999,999') as "Xendit Fee",
  'Rp ' || TO_CHAR(
    ROUND(selling_price - base_price - ((selling_price * 0.029) + 2000)), 
    'FM999,999,999'
  ) as "NET PROFIT",
  TO_CHAR(
    ROUND(
      ((selling_price - base_price - ((selling_price * 0.029) + 2000)) / selling_price * 100)::numeric, 
      2
    ), 
    'FM90.00'
  ) || '%' as "Net %"
FROM products 
WHERE game_id = (SELECT id FROM games WHERE slug = 'valorant')
ORDER BY sort_order;

-- Summary: Verify all products have ~5% net profit
SELECT 
  COUNT(*) as "Total Products",
  TO_CHAR(
    AVG(
      ROUND(
        ((selling_price - base_price - ((selling_price * 0.029) + 2000)) / selling_price * 100)::numeric, 
        2
      )
    ), 
    'FM90.00'
  ) || '%' as "Average Net Margin",
  TO_CHAR(
    MIN(
      ROUND(
        ((selling_price - base_price - ((selling_price * 0.029) + 2000)) / selling_price * 100)::numeric, 
        2
      )
    ), 
    'FM90.00'
  ) || '%' as "Min Net Margin",
  TO_CHAR(
    MAX(
      ROUND(
        ((selling_price - base_price - ((selling_price * 0.029) + 2000)) / selling_price * 100)::numeric, 
        2
      )
    ), 
    'FM90.00'
  ) || '%' as "Max Net Margin"
FROM products 
WHERE game_id = (SELECT id FROM games WHERE slug = 'valorant');

-- Revenue projection (100 orders evenly distributed)
SELECT 
  'Rp ' || TO_CHAR(SUM(selling_price * 100 / 22)::integer, 'FM999,999,999') as "Total Revenue (100 orders)",
  'Rp ' || TO_CHAR(
    SUM(
      ROUND(selling_price - base_price - ((selling_price * 0.029) + 2000)) * 100 / 22
    )::integer, 
    'FM999,999,999'
  ) as "Total NET Profit (100 orders)"
FROM products 
WHERE game_id = (SELECT id FROM games WHERE slug = 'valorant');

COMMIT;

\echo ''
\echo '=============================================='
\echo 'SUCCESS! 22 Products with 5% NET PROFIT'
\echo 'All prices calculated for 5% after Xendit fee'
\echo '=============================================='
\echo ''
