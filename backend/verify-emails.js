/**
 * verify-emails.js
 * Cron: 0 2 * * * (setiap hari jam 02.00 WIB)
 * - Ambil semua email dengan status 'unverified' dari validated_contacts
 * - Hit Mailboxlayer API satu per satu
 * - Update status di DB
 *
 * Setup cron (crontab -e):
 * 0 2 * * * /usr/bin/node /home/segawon/apps/segawon_topup/backend/verify-emails.js >> /home/segawon/logs/verify-emails.log 2>&1
 */

'use strict';

const fs    = require('fs');
const path  = require('path');
const http  = require('http');
const { Pool } = require('pg');

// ── Load .env manual ──────────────────────────────────────────
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const [key, ...rest] = line.trim().split('=');
    if (key && !key.startsWith('#') && rest.length) {
      process.env[key.trim()] = rest.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
}

const MAILBOXLAYER_KEY = process.env.MAILBOXLAYER_API_KEY;
const DB_URL           = process.env.DATABASE_URL;
const BATCH_SIZE       = 10;   // proses N email per run (hemat API quota)
const DELAY_MS         = 1000; // jeda antar request ke API (rate limit friendly)

const pool = new Pool({ connectionString: DB_URL });

// ── Helpers ───────────────────────────────────────────────────
function log(msg) {
  const ts = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
  console.log(`[${ts}] ${msg}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Mailboxlayer API ──────────────────────────────────────────
function callMailboxlayer(email) {
  return new Promise((resolve, reject) => {
    const url = `http://apilayer.net/api/check?access_key=${MAILBOXLAYER_KEY}&email=${encodeURIComponent(email)}&smtp=1&format=1`;

    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            reject(new Error(`API error: ${parsed.error.info || parsed.error.type}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error('Invalid JSON response'));
        }
      });
    });

    req.setTimeout(8000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.on('error', reject);
  });
}

function determineStatus(result) {
  if (result.disposable === true)                                  return 'disposable';
  if (result.format_valid === false)                               return 'invalid';
  if (result.mx_found === false)                                   return 'invalid';
  if (result.smtp_check === false && result.mx_found === true)     return 'invalid';
  return 'valid';
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  log('=== verify-emails.js START ===');

  if (!MAILBOXLAYER_KEY) {
    log('ERROR: MAILBOXLAYER_API_KEY tidak dikonfigurasi di .env');
    process.exit(1);
  }

  let checked = 0, valid = 0, invalid = 0, disposable = 0, errors = 0;

  try {
    // Ambil email unverified, prioritaskan yang paling lama belum dicek
    const { rows } = await pool.query(
      `SELECT id, value FROM validated_contacts
       WHERE type = 'email' AND status = 'unverified'
       ORDER BY created_at ASC
       LIMIT $1`,
      [BATCH_SIZE]
    );

    if (rows.length === 0) {
      log('Tidak ada email unverified. Selesai.');
      await pool.end();
      return;
    }

    log(`Memproses ${rows.length} email unverified...`);

    for (const row of rows) {
      try {
        log(`  Cek: ${row.value}`);
        const result = await callMailboxlayer(row.value);
        const status = determineStatus(result);

        await pool.query(
          `UPDATE validated_contacts
           SET status = $1, checked_at = NOW()
           WHERE id = $2`,
          [status, row.id]
        );

        checked++;
        if (status === 'valid')       valid++;
        if (status === 'invalid')     invalid++;
        if (status === 'disposable')  disposable++;

        log(`  → ${row.value}: ${status}`);

      } catch (err) {
        errors++;
        log(`  → ERROR untuk ${row.value}: ${err.message}`);
        // Tetap unverified, akan dicoba lagi besok
      }

      // Jeda antar request
      await sleep(DELAY_MS);
    }

  } catch (err) {
    log(`ERROR fatal: ${err.message}`);
  } finally {
    await pool.end();
  }

  log(`=== SELESAI === checked:${checked} valid:${valid} invalid:${invalid} disposable:${disposable} errors:${errors}`);
}

main();