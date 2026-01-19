-- Complete Database Schema Fix
-- This will add missing columns and fix the structure

\c topup_game

-- ========================================
-- FIX GAMES TABLE
-- ========================================

-- Check if sort_order column exists, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'games' AND column_name = 'sort_order'
    ) THEN
        ALTER TABLE games ADD COLUMN sort_order INTEGER DEFAULT 0;
    END IF;
END $$;

-- Check if icon_url column exists, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'games' AND column_name = 'icon_url'
    ) THEN
        ALTER TABLE games ADD COLUMN icon_url VARCHAR(500);
    END IF;
END $$;

-- ========================================
-- FIX PRODUCTS TABLE
-- ========================================

-- Add multi-payment columns if they don't exist
DO $$ 
BEGIN
    -- selling_price_qris
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'selling_price_qris'
    ) THEN
        ALTER TABLE products ADD COLUMN selling_price_qris DECIMAL(15,2);
    END IF;

    -- selling_price_va
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'selling_price_va'
    ) THEN
        ALTER TABLE products ADD COLUMN selling_price_va DECIMAL(15,2);
    END IF;

    -- selling_price_ewallet
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'selling_price_ewallet'
    ) THEN
        ALTER TABLE products ADD COLUMN selling_price_ewallet DECIMAL(15,2);
    END IF;

    -- recommended_payment
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'recommended_payment'
    ) THEN
        ALTER TABLE products ADD COLUMN recommended_payment VARCHAR(50) DEFAULT 'qris';
    END IF;

    -- gateway_preference
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'gateway_preference'
    ) THEN
        ALTER TABLE products ADD COLUMN gateway_preference VARCHAR(50) DEFAULT 'midtrans';
    END IF;

    -- sort_order
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'sort_order'
    ) THEN
        ALTER TABLE products ADD COLUMN sort_order INTEGER DEFAULT 0;
    END IF;
END $$;

-- ========================================
-- FIX ORDERS TABLE
-- ========================================

-- Add multi-payment columns if they don't exist
DO $$ 
BEGIN
    -- payment_gateway
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'payment_gateway'
    ) THEN
        ALTER TABLE orders ADD COLUMN payment_gateway VARCHAR(50);
    END IF;

    -- gateway_fee
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'gateway_fee'
    ) THEN
        ALTER TABLE orders ADD COLUMN gateway_fee DECIMAL(15,2) DEFAULT 0;
    END IF;

    -- payment_url
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'payment_url'
    ) THEN
        ALTER TABLE orders ADD COLUMN payment_url TEXT;
    END IF;

    -- payment_expires_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'payment_expires_at'
    ) THEN
        ALTER TABLE orders ADD COLUMN payment_expires_at TIMESTAMP;
    END IF;
END $$;

-- ========================================
-- INSERT OR UPDATE GAMES
-- ========================================

-- Valorant
INSERT INTO games (name, slug, description, icon_url, is_active, sort_order)
VALUES (
    'Valorant',
    'valorant',
    'Top-up Valorant Points (VP) untuk region Indonesia',
    '/images/valorant-icon.png',
    true,
    1
)
ON CONFLICT (slug) 
DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon_url = EXCLUDED.icon_url,
    is_active = EXCLUDED.is_active,
    sort_order = EXCLUDED.sort_order,
    updated_at = CURRENT_TIMESTAMP;

-- Mobile Legends (optional)
INSERT INTO games (name, slug, description, icon_url, is_active, sort_order)
VALUES (
    'Mobile Legends',
    'mobile-legends',
    'Top-up Diamonds Mobile Legends: Bang Bang',
    '/images/ml-icon.png',
    true,
    2
)
ON CONFLICT (slug) 
DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon_url = EXCLUDED.icon_url,
    is_active = EXCLUDED.is_active,
    sort_order = EXCLUDED.sort_order,
    updated_at = CURRENT_TIMESTAMP;

-- Free Fire (optional)
INSERT INTO games (name, slug, description, icon_url, is_active, sort_order)
VALUES (
    'Free Fire',
    'free-fire',
    'Top-up Diamonds Free Fire',
    '/images/ff-icon.png',
    true,
    3
)
ON CONFLICT (slug) 
DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon_url = EXCLUDED.icon_url,
    is_active = EXCLUDED.is_active,
    sort_order = EXCLUDED.sort_order,
    updated_at = CURRENT_TIMESTAMP;

-- ========================================
-- VERIFICATION
-- ========================================

\echo ''
\echo '=========================================='
\echo 'DATABASE SCHEMA FIXED!'
\echo '=========================================='
\echo ''

-- Show games table structure
\echo '--- Games Table Columns ---'
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'games'
ORDER BY ordinal_position;

\echo ''
\echo '--- Current Games ---'
SELECT id, name, slug, is_active, sort_order
FROM games
ORDER BY sort_order;

\echo ''
\echo '--- Products Table Multi-Payment Columns ---'
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'products'
AND column_name IN ('selling_price_qris', 'selling_price_va', 'selling_price_ewallet', 'recommended_payment', 'gateway_preference', 'sort_order')
ORDER BY column_name;

\echo ''
\echo '=========================================='
\echo '✅ Schema Fixed Successfully!'
\echo 'You can now:'
\echo '1. Run the products SQL to add Valorant products'
\echo '2. Test GET /api/games endpoint'
\echo '=========================================='
\echo ''

COMMIT;
