#!/usr/bin/env node
/**
 * cleanup-shortlinks.js
 * Hapus short links yang sudah expired dari DB
 * 
 * Jalankan via cron:
 * 0 3 * * * cd ~/apps/segawon_topup/backend && node scripts/cleanup-shortlinks.js >> logs/cleanup-shortlinks.log 2>&1
 */

require('dotenv').config();
const { pool } = require('./src/config/database');

async function main() {
  const start = new Date().toISOString();
  console.log(`[${start}] Memulai cleanup short links expired...`);

  try {
    const result = await pool.query(
      `DELETE FROM short_links WHERE expires_at < NOW()`
    );
    console.log(`[${new Date().toISOString()}] ✅ ${result.rowCount} short link expired dihapus`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] ❌ Error:`, err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();