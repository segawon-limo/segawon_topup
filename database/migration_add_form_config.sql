-- ============================================================
-- Migration: Tambah kolom form_config ke tabel games
-- Tujuan: Hapus hardcode gameConfigs dari OrderPage.js
--         supaya game baru bisa ditambah langsung dari DB
-- ============================================================

-- 1. Tambah kolom
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS form_config JSONB DEFAULT NULL;

-- Penjelasan struktur form_config:
-- {
--   "fields": [
--     { "name": "userId", "label": "Riot ID", "placeholder": "Contoh: segawon", "type": "text" },
--     { "name": "zoneId", "label": "Tagline",  "placeholder": "Contoh: limo",    "type": "text" }
--   ],
--   "displayFormat": "userId#zoneId",   -- template string: userId, zoneId, atau userId#zoneId / userId (zoneId)
--   "validation": "riot_id",            -- null | "riot_id" | "pln_meter"  (enum, biar backend bisa routing)
--   "headerImage": "valorant-header.jpg",
--   "iconFile": "val.webp",
--   "pageTitle": "Points"
-- }


-- 2. Isi data untuk semua game yang sudah ada
--    Jalankan satu per satu atau sekaligus — aman karena pakai WHERE slug = '...'

UPDATE games SET form_config = '{
  "fields": [
    { "name": "userId", "label": "Riot ID",  "placeholder": "Contoh: segawon", "type": "text" },
    { "name": "zoneId", "label": "Tagline",  "placeholder": "Contoh: limo",    "type": "text" }
  ],
  "displayFormat": "userId#zoneId",
  "validation": "riot_id",
  "headerImage": "valorant-header.jpg",
  "iconFile": "val.webp",
  "pageTitle": "Points"
}'::jsonb
WHERE slug = 'valorant';

UPDATE games SET form_config = '{
  "fields": [
    { "name": "userId", "label": "User ID", "placeholder": "Contoh: 123456789", "type": "number" },
    { "name": "zoneId", "label": "Zone ID", "placeholder": "Contoh: 1234",      "type": "number" }
  ],
  "displayFormat": "userId (zoneId)",
  "validation": null,
  "headerImage": "mobile-legends-header.jpg",
  "iconFile": "mlb.webp",
  "pageTitle": "Diamonds"
}'::jsonb
WHERE slug = 'mobile-legends';

UPDATE games SET form_config = '{
  "fields": [
    { "name": "userId", "label": "User ID", "placeholder": "Contoh: 1234567890", "type": "number" }
  ],
  "displayFormat": "userId",
  "validation": null,
  "headerImage": "free-fire-header.jpg",
  "iconFile": "ffr.webp",
  "pageTitle": "Diamonds"
}'::jsonb
WHERE slug = 'free-fire';

UPDATE games SET form_config = '{
  "fields": [
    { "name": "userId", "label": "User ID", "placeholder": "Contoh: 123456789", "type": "number" }
  ],
  "displayFormat": "userId",
  "validation": null,
  "headerImage": "arena-of-valor-header.jpg",
  "iconFile": "aov.webp",
  "pageTitle": "Vouchers"
}'::jsonb
WHERE slug = 'arena-of-valor';

UPDATE games SET form_config = '{
  "fields": [
    { "name": "userId", "label": "User ID",  "placeholder": "Contoh: 5123456789", "type": "number" },
    { "name": "zoneId", "label": "Zone ID",  "placeholder": "Contoh: 1234",       "type": "number" }
  ],
  "displayFormat": "userId (zoneId)",
  "validation": null,
  "headerImage": "pubg-mobile-header.jpg",
  "iconFile": null,
  "pageTitle": "UC"
}'::jsonb
WHERE slug = 'pubg-mobile';

UPDATE games SET form_config = '{
  "fields": [
    { "name": "userId", "label": "UID",    "placeholder": "Contoh: 800123456",      "type": "number" },
    { "name": "zoneId", "label": "Server", "placeholder": "Asia / America / Europe", "type": "text" }
  ],
  "displayFormat": "userId (zoneId)",
  "validation": null,
  "headerImage": "genshin-impact-header.jpg",
  "iconFile": "gip.webp",
  "pageTitle": "Genesis Crystals"
}'::jsonb
WHERE slug = 'genshin-impact';

UPDATE games SET form_config = '{
  "fields": [
    { "name": "userId", "label": "Riot ID", "placeholder": "Contoh: segawon", "type": "text" },
    { "name": "zoneId", "label": "Tagline", "placeholder": "Contoh: limo",    "type": "text" }
  ],
  "displayFormat": "userId#zoneId",
  "validation": null,
  "headerImage": "league-of-leagends-header.jpg",
  "iconFile": "lol.webp",
  "pageTitle": "Riot Points"
}'::jsonb
WHERE slug = 'league-of-legends';

UPDATE games SET form_config = '{
  "fields": [
    { "name": "userId", "label": "UID",    "placeholder": "Contoh: 800123456",      "type": "number" },
    { "name": "zoneId", "label": "Server", "placeholder": "Asia / America / Europe", "type": "text" }
  ],
  "displayFormat": "userId (zoneId)",
  "validation": null,
  "headerImage": "honkai-star-rail-header.jpg",
  "iconFile": "hsr.webp",
  "pageTitle": "Oneiric Shards"
}'::jsonb
WHERE slug = 'honkai-star-rail';

UPDATE games SET form_config = '{
  "fields": [
    { "name": "userId", "label": "UserID", "placeholder": "Contoh: 1234567890", "type": "number" }
  ],
  "displayFormat": "userId",
  "validation": null,
  "headerImage": "honor-of-kings-header.jpg",
  "iconFile": "hok.webp",
  "pageTitle": "Tokens"
}'::jsonb
WHERE slug = 'honor-of-kings';

UPDATE games SET form_config = '{
  "fields": [
    { "name": "userId", "label": "RoleID", "placeholder": "Contoh: 800123456",      "type": "number" },
    { "name": "zoneId", "label": "Server", "placeholder": "Asia / America / Europe", "type": "text" }
  ],
  "displayFormat": "userId (zoneId)",
  "validation": null,
  "headerImage": "punishing-gray-raven-header.jpg",
  "iconFile": "pgr.webp",
  "pageTitle": "Rainbow Cards"
}'::jsonb
WHERE slug = 'punishing-gray-raven';

UPDATE games SET form_config = '{
  "fields": [
    { "name": "userId", "label": "UserID", "placeholder": "Contoh: 800123456",      "type": "number" },
    { "name": "zoneId", "label": "Server", "placeholder": "Asia / America / Europe", "type": "text" }
  ],
  "displayFormat": "userId (zoneId)",
  "validation": null,
  "headerImage": "zenless-zone-zero-header.jpg",
  "iconFile": "zzz.webp",
  "pageTitle": "Monochrome"
}'::jsonb
WHERE slug = 'zenless-zone-zero';

UPDATE games SET form_config = '{
  "fields": [
    { "name": "userId", "label": "UserID", "placeholder": "Contoh: 1234567890", "type": "number" }
  ],
  "displayFormat": "userId",
  "validation": null,
  "headerImage": "marvel-rivals-header.jpg",
  "iconFile": "mrv.webp",
  "pageTitle": "Lattices"
}'::jsonb
WHERE slug = 'marvel-rivals';

UPDATE games SET form_config = '{
  "fields": [
    { "name": "userId", "label": "UserID", "placeholder": "Contoh: 1234567890", "type": "number" }
  ],
  "displayFormat": "userId",
  "validation": null,
  "headerImage": "haikyu-fly-high-header.jpg",
  "iconFile": "hfh.webp",
  "pageTitle": "Diamonds"
}'::jsonb
WHERE slug = 'haikyu-fly-high';

-- Voucher / produk tanpa form ID
UPDATE games SET form_config = '{
  "fields": [],
  "displayFormat": "—",
  "validation": null,
  "headerImage": "steam-wallet-header.jpg",
  "iconFile": "stm.webp",
  "pageTitle": "Steam Wallet"
}'::jsonb
WHERE slug = 'steam-wallet';

-- Token PLN — form_config hanya untuk header/icon;
-- fields & validation dioverride oleh product_type = token_pln di frontend
UPDATE games SET form_config = '{
  "fields": [
    { "name": "userId", "label": "Nomor Meter / ID Pelanggan", "placeholder": "Contoh: 515300012345", "type": "text" }
  ],
  "displayFormat": "userId",
  "validation": "pln_meter",
  "headerImage": "pln.jpg",
  "iconFile": "pln.webp",
  "pageTitle": "Token PLN"
}'::jsonb
WHERE slug = 'pln' OR slug = 'token-pln';

-- Pulsa / Paket Data — satu template untuk semua provider
-- (telkomsel, indosat, xl-axis, dll — cukup UPDATE slug masing-masing)
UPDATE games SET form_config = '{
  "fields": [
    { "name": "userId", "label": "Nomor HP", "placeholder": "Contoh: 08123456789", "type": "text" }
  ],
  "displayFormat": "userId",
  "validation": null,
  "headerImage": "telkomsel-header.jpg",
  "iconFile": "tlk.webp",
  "pageTitle": "Pulsa & Paket Data Telkomsel"
}'::jsonb
WHERE slug = 'telkomsel';

UPDATE games SET form_config = '{
  "fields": [
    { "name": "userId", "label": "Nomor HP", "placeholder": "Contoh: 08123456789", "type": "text" }
  ],
  "displayFormat": "userId",
  "validation": null,
  "headerImage": "indosat-header.jpg",
  "iconFile": "ioo.webp",
  "pageTitle": "Pulsa & Paket Data Indosat"
}'::jsonb
WHERE slug = 'indosat';

UPDATE games SET form_config = '{
  "fields": [
    { "name": "userId", "label": "Nomor HP", "placeholder": "Contoh: 08123456789", "type": "text" }
  ],
  "displayFormat": "userId",
  "validation": null,
  "headerImage": "xl-axis-header.jpg",
  "iconFile": "xla.webp",
  "pageTitle": "Pulsa & Paket Data XL/Axis"
}'::jsonb
WHERE slug = 'xl-axis';


-- 3. Verifikasi hasil
-- Jalankan ini untuk cek apakah semua game sudah terisi:
-- SELECT slug, product_type, form_config IS NOT NULL as has_config FROM games ORDER BY slug;
