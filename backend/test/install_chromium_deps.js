#!/usr/bin/env node
/**
 * install_chromium_deps.js
 *
 * Install system dependencies yang dibutuhkan Chromium/Puppeteer.
 * Jalankan via admin panel atau terminal:
 *   node install_chromium_deps.js
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

const PACKAGES = [
  'libatk1.0-0',
  'libatk-bridge2.0-0',
  'libcups2',
  'libxkbcommon0',
  'libxcomposite1',
  'libxdamage1',
  'libxfixes3',
  'libxrandr2',
  'libgbm1',
  'libasound2',
  'libpango-1.0-0',
  'libcairo2',
  'libnspr4',
  'libnss3',
];

console.log(C.bold('\n══════════════════════════════════════════════'));
console.log(C.bold('  INSTALL CHROMIUM SYSTEM DEPENDENCIES'));
console.log(C.bold('══════════════════════════════════════════════\n'));
console.log(C.dim('  Packages: ' + PACKAGES.join(', ') + '\n'));

try {
  console.log(C.cyan('📦 Running apt-get update...'));
  execSync('sudo apt-get update -qq', { stdio: 'inherit' });

  console.log(C.cyan('\n📦 Installing packages...'));
  execSync(
    `sudo apt-get install -y ${PACKAGES.join(' ')}`,
    { stdio: 'inherit' }
  );

  console.log(C.green('\n✅ Semua dependency berhasil diinstall!'));
  console.log(C.dim('   Jalankan kembali: node test/test_pascabayar_email.js\n'));

} catch (err) {
  console.log(C.red('\n❌ Gagal: ' + err.message));
  console.log(C.yellow('   Pastikan user memiliki akses sudo.\n'));
  process.exit(1);
}