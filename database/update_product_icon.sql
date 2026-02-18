-- Migration 006: Tambah kolom icon_product_url di tabel games
-- Icon khusus untuk ditampilkan di card produk (nominal)
-- Berbeda dari icon_url yang dipakai di navbar/header game

-- Step 1: Tambah kolom
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS icon_product_url VARCHAR(500);

COMMENT ON COLUMN games.icon_product_url IS 
  'Icon untuk card produk/nominal. Berbeda dari icon_url (icon game di navbar). '
  'Contoh: koin VP Valorant, gem MLBB, token PLN, dsb. Path: /images/icon_product/';

-- Step 2: Populate icon_product_url untuk semua games
UPDATE games SET icon_product_url = '/images/icon_product/val-icon.webp' WHERE slug = 'valorant';
UPDATE games SET icon_product_url = '/images/icon_product/mlb-icon.webp' WHERE slug = 'mobile-legends';
UPDATE games SET icon_product_url = '/images/icon_product/ffr-icon.webp' WHERE slug = 'free-fire';
UPDATE games SET icon_product_url = '/images/icon_product/aov-icon.webp' WHERE slug = 'arena-of-valor';
UPDATE games SET icon_product_url = '/images/icon_product/gip-icon.webp' WHERE slug = 'genshin-impact';
UPDATE games SET icon_product_url = '/images/icon_product/hfh-icon.webp' WHERE slug = 'haikyu-fly-high';
UPDATE games SET icon_product_url = '/images/icon_product/hok-icon.webp' WHERE slug = 'honor-of-kings';
UPDATE games SET icon_product_url = '/images/icon_product/lol-icon.webp' WHERE slug = 'league-of-legends';
UPDATE games SET icon_product_url = '/images/icon_product/mrv-icon.webp' WHERE slug = 'marvel-rivals';
UPDATE games SET icon_product_url = '/images/icon_product/pgr-icon.webp' WHERE slug = 'punishing-gray-raven';
UPDATE games SET icon_product_url = '/images/icon_product/zzz-icon.webp' WHERE slug = 'zenless-zone-zero';
UPDATE games SET icon_product_url = '/images/icon_product/hsr-icon.webp' WHERE slug = 'honkai-star-rail';
UPDATE games SET icon_product_url = '/images/icon_product/pgm-icon.webp' WHERE slug = 'pubg-mobile';
