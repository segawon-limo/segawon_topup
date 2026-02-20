-- ============================================================
-- Migration: Tambah kolom digiflazz_format_key ke tabel games
-- Tujuan: Backend tahu cara menyusun customer_no sebelum kirim ke Digiflazz
-- ============================================================

-- 1. Tambah kolom
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS digiflazz_format_key VARCHAR(50) DEFAULT 'userId_only';

-- Enum format_key yang tersedia:
--   userId_only          → customer_no = userId
--   userId_concat_zoneId → customer_no = userId + zoneId (tanpa separator) — khusus ML
--   userId_pipe_server   → customer_no = userId + '|' + server  — GIP, HSR, ZZZ
--   roleId_pipe_server   → customer_no = roleId + '|' + server  — PGR
--   riotId_hash_tag      → customer_no = riotId + '#' + tag     — Valorant, LoL

-- Juga tambah server_label_map di form_config agar frontend bisa tampilkan
-- dropdown server yang user-friendly dan backend konversi ke kode Digiflazz


-- 2. Update digiflazz_format_key + server config per game

-- ── Arena of Valor ─────────────────────────────────────────────────────────
UPDATE games SET
  digiflazz_format_key = 'userId_only'
WHERE slug = 'arena-of-valor';

-- ── Free Fire ──────────────────────────────────────────────────────────────
UPDATE games SET
  digiflazz_format_key = 'userId_only'
WHERE slug = 'free-fire';

-- ── Haikyu Fly High ────────────────────────────────────────────────────────
UPDATE games SET
  digiflazz_format_key = 'userId_only'
WHERE slug = 'haikyu-fly-high';

-- ── Honor of Kings ─────────────────────────────────────────────────────────
UPDATE games SET
  digiflazz_format_key = 'userId_only'
WHERE slug = 'honor-of-kings';

-- ── Marvel Rivals ──────────────────────────────────────────────────────────
UPDATE games SET
  digiflazz_format_key = 'userId_only'
WHERE slug = 'marvel-rivals';

-- ── PUBG Mobile ────────────────────────────────────────────────────────────
-- Digiflazz hanya minta UID (tidak ada zone id untuk PUBG)
UPDATE games SET
  digiflazz_format_key = 'userId_only',
  form_config = form_config || '{
    "fields": [
      { "name": "userId", "label": "User ID", "placeholder": "Contoh: 5123456789", "type": "number" }
    ],
    "displayFormat": "userId"
  }'::jsonb
WHERE slug = 'pubg-mobile';

-- ── Mobile Legends ─────────────────────────────────────────────────────────
-- ⚠️ PENTING: customer_no = userId + zoneId digabung TANPA separator
-- Contoh: userId=123456789, zoneId=1234 → customer_no="1234567891234"
UPDATE games SET
  digiflazz_format_key = 'userId_concat_zoneId'
WHERE slug = 'mobile-legends';

-- ── Genshin Impact ─────────────────────────────────────────────────────────
-- customer_no = userId|server  (pakai os_asia bukan Asia — lebih universal)
UPDATE games SET
  digiflazz_format_key = 'userId_pipe_server',
  form_config = form_config || '{
    "fields": [
      { "name": "userId", "label": "UID", "placeholder": "Contoh: 123456789", "type": "number" },
      { "name": "zoneId", "label": "Server", "placeholder": "Pilih server", "type": "select",
        "options": [
          { "label": "Asia",      "value": "os_asia" },
          { "label": "America",   "value": "os_usa"  },
          { "label": "Europe",    "value": "os_euro" },
          { "label": "TW/HK/MO", "value": "os_cht"  }
        ]
      }
    ],
    "displayFormat": "userId (zoneId)"
  }'::jsonb
WHERE slug = 'genshin-impact';

-- ── Honkai Star Rail ───────────────────────────────────────────────────────
-- customer_no = userId|prod_official_asia  (lebih konsisten dari os_asia untuk HSR)
UPDATE games SET
  digiflazz_format_key = 'userId_pipe_server',
  form_config = form_config || '{
    "fields": [
      { "name": "userId", "label": "UID", "placeholder": "Contoh: 123456789", "type": "number" },
      { "name": "zoneId", "label": "Server", "placeholder": "Pilih server", "type": "select",
        "options": [
          { "label": "Asia",      "value": "prod_official_asia" },
          { "label": "America",   "value": "prod_official_usa"  },
          { "label": "Europe",    "value": "prod_official_eur"  },
          { "label": "TW/HK/MO", "value": "prod_official_cht"  }
        ]
      }
    ],
    "displayFormat": "userId (zoneId)"
  }'::jsonb
WHERE slug = 'honkai-star-rail';

-- ── Zenless Zone Zero ──────────────────────────────────────────────────────
-- customer_no = userId|os_asia  (format paling universal untuk ZZZ)
UPDATE games SET
  digiflazz_format_key = 'userId_pipe_server',
  form_config = form_config || '{
    "fields": [
      { "name": "userId", "label": "User ID", "placeholder": "Contoh: 123456789", "type": "number" },
      { "name": "zoneId", "label": "Server", "placeholder": "Pilih server", "type": "select",
        "options": [
          { "label": "Asia",      "value": "os_asia" },
          { "label": "America",   "value": "os_usa"  },
          { "label": "Europe",    "value": "os_euro" },
          { "label": "TW/HK/MO", "value": "os_cht"  }
        ]
      }
    ],
    "displayFormat": "userId (zoneId)"
  }'::jsonb
WHERE slug = 'zenless-zone-zero';

-- ── Punishing Gray Raven ───────────────────────────────────────────────────
-- customer_no = roleId|Asia-Pacific  (pakai label region, BUKAN kode os_asia)
UPDATE games SET
  digiflazz_format_key = 'roleId_pipe_server',
  form_config = form_config || '{
    "fields": [
      { "name": "userId", "label": "Role ID", "placeholder": "Contoh: 12345678", "type": "number" },
      { "name": "zoneId", "label": "Server", "placeholder": "Pilih server", "type": "select",
        "options": [
          { "label": "Asia-Pacific",  "value": "Asia-Pacific"  },
          { "label": "Europe",        "value": "Europe"        },
          { "label": "North America", "value": "North America" }
        ]
      }
    ],
    "displayFormat": "userId (zoneId)"
  }'::jsonb
WHERE slug = 'punishing-gray-raven';

-- ── Valorant ───────────────────────────────────────────────────────────────
-- customer_no = riotId#tag
UPDATE games SET
  digiflazz_format_key = 'riotId_hash_tag'
WHERE slug = 'valorant';

-- ── League of Legends (Wild Rift) ──────────────────────────────────────────
-- customer_no = riotId#tag (sama persis dengan Valorant)
UPDATE games SET
  digiflazz_format_key = 'riotId_hash_tag'
WHERE slug = 'league-of-legends';


-- 3. Verifikasi
-- SELECT slug, digiflazz_format_key, form_config->'fields'->1->'options' as server_options
-- FROM games
-- ORDER BY slug;