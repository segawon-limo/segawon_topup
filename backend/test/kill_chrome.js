#!/usr/bin/env node
/**
 * kill_chrome.js
 *
 * Kill semua proses Chrome/Chromium yang hang (dari Puppeteer/html-pdf-node).
 * Aman dijalankan tanpa restart backend.
 *
 * Jalankan:
 *   node kill_chrome.js
 */

const { execSync } = require('child_process');

const C = {
  green:  (s) => `\x1b[32m${s}\x1b[0m`,
  red:    (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan:   (s) => `\x1b[36m${s}\x1b[0m`,
  bold:   (s) => `\x1b[1m${s}\x1b[0m`,
  dim:    (s) => `\x1b[2m${s}\x1b[0m`,
};

console.log(C.bold('\n══════════════════════════════════════════════'));
console.log(C.bold('  KILL HANGING CHROME/PUPPETEER PROCESSES'));
console.log(C.bold('══════════════════════════════════════════════\n'));

// Cari semua proses chrome yang berjalan
let procs = [];
try {
  const out = execSync("pgrep -a chrome 2>/dev/null || true").toString().trim();
  if (out) {
    procs = out.split('\n').filter(Boolean).map(line => {
      const [pid, ...rest] = line.trim().split(/\s+/);
      return { pid, cmd: rest.join(' ') };
    });
  }
} catch (e) {}

// Juga cari chromium
try {
  const out = execSync("pgrep -a chromium 2>/dev/null || true").toString().trim();
  if (out) {
    out.split('\n').filter(Boolean).forEach(line => {
      const [pid, ...rest] = line.trim().split(/\s+/);
      procs.push({ pid, cmd: rest.join(' ') });
    });
  }
} catch (e) {}

if (procs.length === 0) {
  console.log(C.yellow('  Tidak ada proses Chrome/Chromium yang berjalan.\n'));
  process.exit(0);
}

console.log(C.cyan(`  Ditemukan ${procs.length} proses:\n`));
procs.forEach(p => {
  console.log(C.dim(`  [${p.pid}] ${p.cmd.slice(0, 80)}...`));
});
console.log('');

// Kill semua
let killed = 0;
procs.forEach(p => {
  try {
    execSync(`kill -9 ${p.pid} 2>/dev/null || true`);
    console.log(C.green(`  ✓ Killed PID ${p.pid}`));
    killed++;
  } catch (e) {
    console.log(C.red(`  ✗ Gagal kill PID ${p.pid}: ${e.message}`));
  }
});

console.log(C.bold(`\n  ${killed}/${procs.length} proses berhasil dihentikan.`));

// Verifikasi
try {
  execSync("pgrep chrome chromium 2>/dev/null", { stdio: 'ignore' });
  console.log(C.yellow('  ⚠️  Masih ada proses Chrome tersisa.\n'));
} catch {
  console.log(C.green('  ✅ Semua proses Chrome sudah bersih.\n'));
}