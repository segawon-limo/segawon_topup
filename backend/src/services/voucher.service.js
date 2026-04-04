/**
 * Voucher Service
 * Handles voucher validation and discount calculation
 * UPDATED: Use profit_price for admin voucher (simpler & more flexible)
 */

const { pool } = require('../config/database');

/**
 * Validate voucher code and calculate discount
 * @param {string} code - Voucher code
 * @param {number} orderAmount - Order amount before discount (selling_price)
 * @param {number} profitPrice - Profit price of product (for admin voucher)
 * @param {string} customerEmail - Customer email (for per-user limit check)
 * @param {string} customerPhone - Customer phone (for per-user limit check)
 * @returns {Object} - Validation result with discount info
 */
exports.validateVoucher = async (code, orderAmount, profitPrice = null, customerEmail = null, customerPhone = null) => {
  try {
    // Get voucher from database
    const result = await pool.query(`
      SELECT * FROM vouchers 
      WHERE UPPER(code) = UPPER($1) 
      AND is_active = true
    `, [code]);

    if (result.rows.length === 0) {
      return {
        valid: false,
        message: 'Kode voucher tidak valid'
      };
    }

    const voucher = result.rows[0];

    // Check if voucher is within valid date range
    const now = new Date();
    if (voucher.valid_from && new Date(voucher.valid_from) > now) {
      return {
        valid: false,
        message: 'Voucher belum dapat digunakan'
      };
    }

    if (voucher.valid_until && new Date(voucher.valid_until) < now) {
      return {
        valid: false,
        message: 'Voucher sudah kadaluarsa'
      };
    }

    // Check usage limit (total)
    if (voucher.usage_limit && voucher.used_count >= voucher.usage_limit) {
      return {
        valid: false,
        message: 'Voucher sudah mencapai batas penggunaan'
      };
    }

    // Check per-user limit (by email OR phone)
    if (voucher.per_user_limit && (customerEmail || customerPhone)) {
      const conditions = [];
      const params = [voucher.id];
      if (customerEmail) { params.push(customerEmail.toLowerCase()); conditions.push(`LOWER(customer_email) = $${params.length}`); }
      if (customerPhone) { params.push(customerPhone);               conditions.push(`customer_phone = $${params.length}`); }

      const usageCheck = await pool.query(`
        SELECT COUNT(*) AS cnt FROM voucher_usages
        WHERE voucher_id = $1 AND (${conditions.join(' OR ')})
      `, params);

      const usedByUser = parseInt(usageCheck.rows[0].cnt);
      if (usedByUser >= voucher.per_user_limit) {
        return {
          valid: false,
          message: 'Kamu sudah pernah menggunakan voucher ini sebelumnya'
        };
      }
    }

    // Check minimum purchase (skip for base_price type)
    if (voucher.discount_type !== 'base_price' && voucher.min_purchase && orderAmount < parseFloat(voucher.min_purchase)) {
      return {
        valid: false,
        message: `Minimal pembelian Rp ${parseFloat(voucher.min_purchase).toLocaleString('id-ID')} untuk menggunakan voucher ini`
      };
    }

    // Calculate discount based on type
    let discountAmount = 0;
    
    if (voucher.discount_type === 'percentage') {
      discountAmount = Math.round(orderAmount * parseFloat(voucher.discount_value) / 100);
      
      // Apply max discount limit if exists
      if (voucher.max_discount && discountAmount > parseFloat(voucher.max_discount)) {
        discountAmount = parseFloat(voucher.max_discount);
      }
    } 
    else if (voucher.discount_type === 'fixed') {
      discountAmount = parseFloat(voucher.discount_value);
    }
    else if (voucher.discount_type === 'base_price') {
      // UPDATED: Admin voucher - use profit_price directly as discount
      if (profitPrice === null || profitPrice === undefined) {
        return {
          valid: false,
          message: 'Harga Profit tidak ditemukan.'
        };
      }
      
      // Discount = profit_price (sudah dihitung di database)
      discountAmount = profitPrice;
      
      // Ensure discount is not negative
      if (discountAmount < 0) {
        discountAmount = 0;
      }
    }

    // Discount cannot exceed order amount
    if (discountAmount > orderAmount) {
      discountAmount = orderAmount;
    }

    return {
      valid: true,
      voucher: {
        id: voucher.id,
        code: voucher.code,
        discount_type: voucher.discount_type,
        discount_value: parseFloat(voucher.discount_value),
        is_admin_only: voucher.is_admin_only,
        description: voucher.description
      },
      discount: Math.round(discountAmount),
      finalPrice: orderAmount - Math.round(discountAmount),
      message: voucher.discount_type === 'base_price' 
        ? 'Voucher admin diterapkan - Harga Base'
        : 'Voucher berhasil diterapkan'
    };

  } catch (error) {
    console.error('Validate Voucher Error:', error);
    return {
      valid: false,
      message: 'Terjadi kesalahan saat memvalidasi voucher'
    };
  }
};

/**
 * Increment voucher usage count
 * @param {string} code - Voucher code
 */
exports.incrementVoucherUsage = async (code) => {
  try {
    await pool.query(`
      UPDATE vouchers 
      SET used_count = used_count + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE UPPER(code) = UPPER($1)
    `, [code]);
  } catch (error) {
    console.error('Increment Voucher Usage Error:', error);
  }
};

/**
 * Record voucher usage per user (for per_user_limit tracking)
 * @param {string} code - Voucher code
 * @param {string} orderNumber - Order number
 * @param {string} customerEmail - Customer email
 * @param {string} customerPhone - Customer phone
 */
exports.recordVoucherUsage = async (code, orderNumber, customerEmail, customerPhone) => {
  try {
    const voucherResult = await pool.query(
      `SELECT id, per_user_limit FROM vouchers WHERE UPPER(code) = UPPER($1)`, [code]
    );
    if (!voucherResult.rows.length) return;
    const voucher = voucherResult.rows[0];

    // Hanya catat jika voucher punya per_user_limit
    if (!voucher.per_user_limit) return;

    await pool.query(`
      INSERT INTO voucher_usages (voucher_id, voucher_code, order_id, customer_email, customer_phone)
      VALUES ($1, UPPER($2), $3, $4, $5)
    `, [
      voucher.id,
      code,
      orderNumber   || null,
      customerEmail ? customerEmail.toLowerCase() : null,
      customerPhone || null,
    ]);
  } catch (error) {
    console.error('Record Voucher Usage Error:', error);
  }
};

/**
 * Get all active vouchers (for admin/display purposes)
 * @param {boolean} includeAdminOnly - Include admin-only vouchers
 */
exports.getActiveVouchers = async (includeAdminOnly = false) => {
  try {
    const query = `
      SELECT 
        id, code, discount_type, discount_value, 
        min_purchase, max_discount, usage_limit, 
        used_count, valid_from, valid_until, 
        is_admin_only, description
      FROM vouchers
      WHERE is_active = true
      ${includeAdminOnly ? '' : 'AND is_admin_only = false'}
      AND (valid_from IS NULL OR valid_from <= CURRENT_TIMESTAMP)
      AND (valid_until IS NULL OR valid_until >= CURRENT_TIMESTAMP)
      AND (usage_limit IS NULL OR used_count < usage_limit)
      ORDER BY is_admin_only DESC, created_at DESC
    `;

    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.error('Get Active Vouchers Error:', error);
    return [];
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// RESERVATION SYSTEM
// Mencegah race condition (dual-tab abuse) pada penggunaan voucher.
//
// Flow:
//   1. reserveVoucher()   — dipanggil saat user klik "Pakai Voucher"
//                           SELECT FOR UPDATE + INSERT ke voucher_reservations (TTL 10 menit).
//                           Tab kedua dengan email/phone yang sama → langsung ditolak.
//   2. claimReservation() — dipanggil di dalam transaksi createOrder / pascabayar.pay
//                           Ubah status reservation → 'claimed' agar tidak bisa dipakai lagi.
//   3. releaseReservation()— dipanggil saat user klik tombol "Hapus" voucher
//                           DELETE reservation 'active' → voucher bebas dipakai di tempat lain.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reserve a voucher slot for a specific user session.
 * Dipanggil saat user klik "Pakai Voucher" — menggantikan validateVoucher di controller.
 * @param {string} code
 * @param {number} orderAmount
 * @param {number|null} profitPrice
 * @param {string|null} customerEmail
 * @param {string|null} customerPhone
 * @param {string} sessionToken - UUID unik per tab, dibuat di frontend saat mount
 */
exports.reserveVoucher = async (code, orderAmount, profitPrice = null, customerEmail = null, customerPhone = null, sessionToken) => {
  if (!sessionToken) {
    return { success: false, message: 'Session token wajib ada untuk reservasi voucher' };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock row voucher supaya tidak ada race condition antar request bersamaan
    const result = await client.query(
      `SELECT * FROM vouchers WHERE UPPER(code) = UPPER($1) AND is_active = true FOR UPDATE`,
      [code]
    );
    const voucher = result.rows[0];
    if (!voucher) {
      await client.query('ROLLBACK');
      return { success: false, message: 'Kode voucher tidak valid' };
    }

    // Cek tanggal valid
    const now = new Date();
    if (voucher.valid_from && new Date(voucher.valid_from) > now) {
      await client.query('ROLLBACK');
      return { success: false, message: 'Voucher belum dapat digunakan' };
    }
    if (voucher.valid_until && new Date(voucher.valid_until) < now) {
      await client.query('ROLLBACK');
      return { success: false, message: 'Voucher sudah kadaluarsa' };
    }

    // Cek usage limit total
    if (voucher.usage_limit && voucher.used_count >= voucher.usage_limit) {
      await client.query('ROLLBACK');
      return { success: false, message: 'Voucher sudah mencapai batas penggunaan' };
    }

    // Cek per-user limit via voucher_usages (riwayat order yang sudah selesai)
    if (voucher.per_user_limit && (customerEmail || customerPhone)) {
      const conditions = [];
      const params = [voucher.id];
      if (customerEmail) { params.push(customerEmail.toLowerCase()); conditions.push(`LOWER(customer_email) = $${params.length}`); }
      if (customerPhone) { params.push(customerPhone);               conditions.push(`customer_phone = $${params.length}`); }
      const usageCheck = await client.query(
        `SELECT COUNT(*) AS cnt FROM voucher_usages WHERE voucher_id = $1 AND (${conditions.join(' OR ')})`,
        params
      );
      if (parseInt(usageCheck.rows[0].cnt) >= voucher.per_user_limit) {
        await client.query('ROLLBACK');
        return { success: false, message: 'Kamu sudah pernah menggunakan voucher ini sebelumnya' };
      }
    }

    // Cek minimum purchase
    if (voucher.discount_type !== 'base_price' && voucher.min_purchase && orderAmount < parseFloat(voucher.min_purchase)) {
      await client.query('ROLLBACK');
      return { success: false, message: `Minimal pembelian Rp ${parseFloat(voucher.min_purchase).toLocaleString('id-ID')} untuk menggunakan voucher ini` };
    }

    // base_price type butuh profitPrice
    if (voucher.discount_type === 'base_price' && (profitPrice === null || profitPrice === undefined)) {
      await client.query('ROLLBACK');
      return { success: false, message: 'Harga Profit tidak ditemukan.' };
    }

    // Hapus reservation yang sudah expired
    await client.query(`DELETE FROM voucher_reservations WHERE expires_at < NOW()`);

    // Cek apakah user ini sudah punya reservation aktif untuk voucher ini
    if (customerEmail || customerPhone) {
      const conditions = [];
      const params = [voucher.id];
      if (customerEmail) { params.push(customerEmail.toLowerCase()); conditions.push(`LOWER(customer_email) = $${params.length}`); }
      if (customerPhone) { params.push(customerPhone);               conditions.push(`customer_phone = $${params.length}`); }

      const existing = await client.query(
        `SELECT id, session_token, status FROM voucher_reservations
         WHERE voucher_id = $1 AND (${conditions.join(' OR ')}) AND expires_at > NOW()`,
        params
      );

      if (existing.rows.length > 0) {
        const existingRes = existing.rows[0];

        if (existingRes.status === 'claimed') {
          // Sudah dipakai untuk order yang berhasil
          await client.query('ROLLBACK');
          return { success: false, message: 'Kamu sudah pernah menggunakan voucher ini sebelumnya' };
        }

        if (existingRes.session_token !== sessionToken) {
          // Tab lain sedang memegang slot ini
          await client.query('ROLLBACK');
          return { success: false, message: 'Voucher ini sedang digunakan di sesi lain. Tutup tab lain dan coba lagi.' };
        }

        // Session sama (misal user klik "Pakai" ulang) → perpanjang TTL saja
        await client.query(
          `UPDATE voucher_reservations SET expires_at = NOW() + INTERVAL '10 minutes' WHERE id = $1`,
          [existingRes.id]
        );
      } else {
        // Belum ada reservation aktif → buat baru
        await client.query(
          `INSERT INTO voucher_reservations (voucher_id, voucher_code, customer_email, customer_phone, session_token, expires_at)
           VALUES ($1, UPPER($2), $3, $4, $5, NOW() + INTERVAL '10 minutes')`,
          [voucher.id, code, customerEmail ? customerEmail.toLowerCase() : null, customerPhone || null, sessionToken]
        );
      }
    }

    await client.query('COMMIT');

    // Hitung diskon (sama persis dengan validateVoucher)
    let discountAmount = 0;
    if (voucher.discount_type === 'percentage') {
      discountAmount = Math.round(orderAmount * parseFloat(voucher.discount_value) / 100);
      if (voucher.max_discount && discountAmount > parseFloat(voucher.max_discount)) discountAmount = parseFloat(voucher.max_discount);
    } else if (voucher.discount_type === 'fixed') {
      discountAmount = parseFloat(voucher.discount_value);
    } else if (voucher.discount_type === 'base_price') {
      discountAmount = profitPrice;
      if (discountAmount < 0) discountAmount = 0;
    }
    if (discountAmount > orderAmount) discountAmount = orderAmount;

    return {
      success: true,
      sessionToken,
      voucher: { id: voucher.id, code: voucher.code, discount_type: voucher.discount_type, discount_value: parseFloat(voucher.discount_value), is_admin_only: voucher.is_admin_only, description: voucher.description },
      discount: Math.round(discountAmount),
      finalPrice: orderAmount - Math.round(discountAmount),
      message: voucher.discount_type === 'base_price' ? 'Voucher admin diterapkan - Harga Base' : 'Voucher berhasil diterapkan'
    };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('reserveVoucher Error:', error);
    return { success: false, message: 'Terjadi kesalahan saat mereservasi voucher' };
  } finally {
    client.release();
  }
};

/**
 * Claim an active reservation as part of order creation.
 * WAJIB dipanggil di dalam DB transaction yang sudah aktif (setelah BEGIN).
 * @param {object} client       - pg PoolClient (sudah dalam transaksi)
 * @param {string} code         - Voucher code
 * @param {string} sessionToken - Token dari frontend
 * @param {string} orderNumber  - Nomor order yang baru dibuat
 */
exports.claimReservation = async (client, code, sessionToken, orderNumber) => {
  try {
    const result = await client.query(
      `SELECT id, status FROM voucher_reservations
       WHERE UPPER(voucher_code) = UPPER($1) AND session_token = $2 AND expires_at > NOW()
       FOR UPDATE`,
      [code, sessionToken]
    );

    if (result.rows.length === 0) {
      return { success: false, message: 'Reservasi voucher tidak ditemukan atau sudah expired. Kembali ke form dan terapkan voucher kembali.' };
    }
    if (result.rows[0].status === 'claimed') {
      return { success: false, message: 'Voucher ini sudah digunakan di sesi lain.' };
    }

    await client.query(
      `UPDATE voucher_reservations SET status = 'claimed', order_number = $1, claimed_at = NOW() WHERE id = $2`,
      [orderNumber, result.rows[0].id]
    );

    return { success: true };
  } catch (error) {
    console.error('claimReservation Error:', error);
    return { success: false, message: 'Terjadi kesalahan saat mengklaim reservasi voucher' };
  }
};

/**
 * Release an active reservation (dipanggil saat user klik tombol "Hapus" voucher).
 * Setelah release, voucher bebas dipakai di produk/tab lain tanpa tunggu 10 menit.
 * @param {string} code         - Voucher code
 * @param {string} sessionToken - Token dari frontend
 */
exports.releaseReservation = async (code, sessionToken) => {
  try {
    await pool.query(
      `DELETE FROM voucher_reservations
       WHERE UPPER(voucher_code) = UPPER($1) AND session_token = $2 AND status = 'active'`,
      [code, sessionToken]
    );
    // rowCount 0 = sudah expired / tidak ada — tidak dianggap error
    return { success: true };
  } catch (error) {
    console.error('releaseReservation Error:', error);
    return { success: false, message: 'Terjadi kesalahan saat melepas reservasi' };
  }
};

module.exports = exports;