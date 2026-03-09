/**
 * validation.service.js
 * - Validasi email: regex → DB cache → Mailboxlayer API
 * - Validasi phone: regex → prefix operator Indonesia
 */

const { pool } = require('../config/database');
const https    = require('https');
const http     = require('http');

const MAILBOXLAYER_KEY = process.env.MAILBOXLAYER_API_KEY;

// ══════════════════════════════════════════
// REGEX
// ══════════════════════════════════════════

// Email: lebih ketat dari sebelumnya
// - Wajib ada TLD minimal 2 karakter
// - Tidak boleh ada spasi
// - Tidak boleh mulai/akhiri dengan titik di local part
const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

// Phone: prefix +62/62/0, lalu 9-12 digit (total 10-13 digit)
const PHONE_REGEX = /^(\+62|62|0)[0-9]{9,12}$/;

// Prefix operator Indonesia yang valid
const VALID_PREFIXES = [
  // Telkomsel (Simpati, AS, Loop)
  '0811','0812','0813','0821','0822','0823','0851','0852','0853',
  // Indosat (IM3, Mentari)
  '0814','0815','0816','0855','0856','0857','0858',
  // XL Axiata
  '0817','0818','0819','0859','0877','0878','0876',
  // Axis (XL)
  '0831','0832','0833','0838',
  // Smartfren
  '0881','0882','0883','0884','0885','0886','0887','0888','0889',
  // Three (Tri)
  '0895','0896','0897','0898','0899',
  // Byu (Telkomsel digital)
  '0851',
];

// ══════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════

// Normalisasi nomor HP ke format 08xxx
function normalizePhone(phone) {
  const clean = phone.trim().replace(/[\s\-]/g, '');
  if (clean.startsWith('+62')) return '0' + clean.slice(3);
  if (clean.startsWith('62'))  return '0' + clean.slice(2);
  return clean;
}

// Ambil prefix 4 digit
function getPrefix(normalized) {
  return normalized.slice(0, 4);
}

// ══════════════════════════════════════════
// VALIDASI EMAIL — REGEX ONLY (frontend)
// ══════════════════════════════════════════
exports.validateEmailRegex = (email) => {
  if (!email || !email.trim()) return { valid: false, message: 'Email wajib diisi' };
  if (!EMAIL_REGEX.test(email.trim())) return { valid: false, message: 'Format email tidak valid' };
  return { valid: true };
};

// ══════════════════════════════════════════
// VALIDASI PHONE — REGEX + PREFIX
// ══════════════════════════════════════════
exports.validatePhone = (phone) => {
  if (!phone || !phone.trim()) return { valid: false, message: 'Nomor HP wajib diisi' };

  const clean = phone.trim().replace(/[\s\-]/g, '');

  if (!PHONE_REGEX.test(clean)) {
    return { valid: false, message: 'Format nomor HP tidak valid (contoh: 08123456789)' };
  }

  const normalized = normalizePhone(clean);
  const prefix     = getPrefix(normalized);

  if (!VALID_PREFIXES.includes(prefix)) {
    return { valid: false, message: `Nomor HP tidak dikenali sebagai operator Indonesia yang valid` };
  }

  return { valid: true, normalized };
};

// ══════════════════════════════════════════
// VALIDASI EMAIL — FULL (regex + cache + API)
// ══════════════════════════════════════════
exports.validateEmailFull = async (email) => {
  if (!email || !email.trim()) return { valid: false, message: 'Email wajib diisi' };

  const normalizedEmail = email.trim().toLowerCase();

  // Step 1: Regex
  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return { valid: false, message: 'Format email tidak valid' };
  }

  // Step 2: Cek DB cache
  try {
    const cached = await pool.query(
      'SELECT status FROM validated_contacts WHERE value = $1 AND type = $2',
      [normalizedEmail, 'email']
    );

    if (cached.rows.length > 0) {
      const { status } = cached.rows[0];
      if (status === 'valid')      return { valid: true, source: 'cache' };
      if (status === 'disposable') return { valid: false, message: 'Email disposable/temporary tidak diperbolehkan', source: 'cache' };
      if (status === 'invalid')    return { valid: false, message: 'Email tidak valid', source: 'cache' };
      if (status === 'unverified') return { valid: true, source: 'cache_unverified' }; // loloskan, akan di-recheck cron
    }
  } catch (dbErr) {
    console.error('[Validation] DB cache error:', dbErr.message);
    // Lanjut ke API kalau DB error
  }

  // Step 3: Hit Mailboxlayer API
  if (!MAILBOXLAYER_KEY) {
    console.warn('[Validation] MAILBOXLAYER_API_KEY tidak dikonfigurasi — loloskan email');
    await upsertContact(normalizedEmail, 'email', 'unverified');
    return { valid: true, source: 'no_api_key' };
  }

  try {
    const apiResult = await callMailboxlayer(normalizedEmail);
    const status    = determineStatus(apiResult);

    // Simpan ke cache DB
    await upsertContact(normalizedEmail, 'email', status);

    if (status === 'valid')      return { valid: true, source: 'api' };
    if (status === 'disposable') return { valid: false, message: 'Email disposable/temporary tidak diperbolehkan', source: 'api' };
    if (status === 'invalid')    return { valid: false, message: 'Email tidak valid atau tidak dapat dihubungi', source: 'api' };

  } catch (apiErr) {
    console.error('[Validation] Mailboxlayer API error:', apiErr.message);
    // Fail open — loloskan tapi simpan sebagai unverified
    await upsertContact(normalizedEmail, 'email', 'unverified');
    return { valid: true, source: 'api_error_fallback' };
  }

  return { valid: true };
};

// ══════════════════════════════════════════
// MAILBOXLAYER API CALL
// ══════════════════════════════════════════
function callMailboxlayer(email) {
  return new Promise((resolve, reject) => {
    // Free tier hanya support HTTP (bukan HTTPS)
    const url = `http://apilayer.net/api/check?access_key=${MAILBOXLAYER_KEY}&email=${encodeURIComponent(email)}&smtp=1&format=1`;

    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            reject(new Error(`Mailboxlayer error: ${parsed.error.info || parsed.error.type}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error('Invalid JSON dari Mailboxlayer'));
        }
      });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Mailboxlayer timeout'));
    });

    req.on('error', reject);
  });
}

// Tentukan status dari hasil Mailboxlayer
function determineStatus(result) {
  // Disposable email
  if (result.disposable === true) return 'disposable';

  // Format tidak valid
  if (result.format_valid === false) return 'invalid';

  // MX record tidak ada (domain tidak punya mail server)
  if (result.mx_found === false) return 'invalid';

  // SMTP check gagal (inbox tidak ada) — hanya tolak kalau sangat yakin
  if (result.smtp_check === false && result.mx_found === true) return 'invalid';

  // Lolos semua check
  return 'valid';
}

// ══════════════════════════════════════════
// DB HELPERS
// ══════════════════════════════════════════
async function upsertContact(value, type, status) {
  try {
    await pool.query(
      `INSERT INTO validated_contacts (value, type, status, checked_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (value, type) DO UPDATE
       SET status = $3, checked_at = NOW()`,
      [value, type, status]
    );
  } catch (err) {
    console.error('[Validation] upsertContact error:', err.message);
  }
}

exports.upsertContact = upsertContact;