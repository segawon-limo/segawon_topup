/**
 * Feedback Controller
 * POST   /api/feedback          — public, kirim feedback + upload gambar
 * GET    /api/admin/feedbacks   — protected admin, list semua feedback
 * DELETE /api/admin/feedbacks/:id — protected admin, hapus feedback + gambar
 */

const { pool } = require('../config/database');
const path  = require('path');
const fs    = require('fs');
const UAParser = require('ua-parser-js');

// Folder simpan gambar feedback (di dalam frontend/public agar langsung accessible)
const FEEDBACK_UPLOAD_DIR = process.env.FEEDBACK_UPLOAD_PATH
  || path.resolve(__dirname, '..', '..', '..', 'frontend', 'public', 'uploads', 'feedback');

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_FILES     = 3;
const ALLOWED_EXTS  = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

// ══════════════════════════════════════════
// POST /api/feedback
// Body: { message, images: [ { filename, data } ] }
// ══════════════════════════════════════════
exports.submitFeedback = async (req, res) => {
  try {
    const { message, images = [] } = req.body;

    // Validasi pesan
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Pesan tidak boleh kosong' });
    }
    if (message.trim().length < 5) {
      return res.status(400).json({ success: false, message: 'Pesan terlalu pendek (minimal 5 karakter)' });
    }
    if (message.trim().length > 2000) {
      return res.status(400).json({ success: false, message: 'Pesan terlalu panjang (maksimal 2000 karakter)' });
    }

    // Validasi jumlah gambar
    if (!Array.isArray(images) || images.length > MAX_FILES) {
      return res.status(400).json({ success: false, message: `Maksimal ${MAX_FILES} gambar` });
    }

    // Parse User-Agent
    const ua         = req.headers['user-agent'] || '';
    const parser     = new UAParser(ua);
    const uaResult   = parser.getResult();
    const browser    = uaResult.browser.name && uaResult.browser.version
      ? `${uaResult.browser.name} ${uaResult.browser.version}`
      : (uaResult.browser.name || 'Unknown');
    const os         = uaResult.os.name && uaResult.os.version
      ? `${uaResult.os.name} ${uaResult.os.version}`
      : (uaResult.os.name || 'Unknown');
    const deviceType = uaResult.device.type === 'mobile'  ? 'Mobile'
                     : uaResult.device.type === 'tablet'  ? 'Tablet'
                     : 'Desktop';

    // IP address
    const ipAddress = req.ip || req.connection?.remoteAddress || null;

    // Proses upload gambar
    const savedImages = [];

    // Pastikan folder ada
    fs.mkdirSync(FEEDBACK_UPLOAD_DIR, { recursive: true });

    for (let i = 0; i < images.length; i++) {
      const { filename, data } = images[i];

      if (!filename || !data) continue;

      // Sanitize filename
      const safeName = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '');
      if (!safeName) continue;

      // Validasi ekstensi
      const ext = path.extname(safeName).toLowerCase();
      if (!ALLOWED_EXTS.includes(ext)) {
        return res.status(400).json({
          success: false,
          message: `File "${safeName}" tidak didukung. Gunakan jpg, png, webp.`
        });
      }

      // Decode base64
      const base64Data = data.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      // Validasi ukuran
      if (buffer.length > MAX_FILE_SIZE) {
        return res.status(400).json({
          success: false,
          message: `File "${safeName}" melebihi batas 2MB`
        });
      }

      // Generate unique filename: timestamp_random_originalname
      const uniqueName = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}${ext}`;
      const targetPath = path.join(FEEDBACK_UPLOAD_DIR, uniqueName);

      fs.writeFileSync(targetPath, buffer);

      savedImages.push({
        filename: uniqueName,
        url:      `/uploads/feedback/${uniqueName}`,
      });
    }

    // Simpan ke DB
    const result = await pool.query(
      `INSERT INTO feedbacks (message, images, ip_address, browser, os, device_type, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, created_at`,
      [
        message.trim(),
        JSON.stringify(savedImages),
        ipAddress,
        browser,
        os,
        deviceType,
        ua,
      ]
    );

    console.log(`[FEEDBACK] #${result.rows[0].id} dari ${ipAddress} (${deviceType} · ${os} · ${browser})`);

    return res.json({
      success: true,
      message: 'Feedback berhasil dikirim, terima kasih!',
      id:      result.rows[0].id,
    });

  } catch (err) {
    console.error('submitFeedback error:', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

// ══════════════════════════════════════════
// GET /api/admin/feedbacks
// ══════════════════════════════════════════
exports.getFeedbacks = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, message, images, ip_address, browser, os, device_type, created_at
       FROM feedbacks
       ORDER BY created_at DESC`
    );

    return res.json({
      success:   true,
      feedbacks: result.rows,
      total:     result.rowCount,
    });

  } catch (err) {
    console.error('getFeedbacks error:', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

// ══════════════════════════════════════════
// DELETE /api/admin/feedbacks/:id
// ══════════════════════════════════════════
exports.deleteFeedback = async (req, res) => {
  try {
    const { id } = req.params;

    // Ambil data gambar dulu sebelum hapus
    const selectResult = await pool.query(
      'SELECT id, images FROM feedbacks WHERE id = $1',
      [id]
    );

    if (selectResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Feedback tidak ditemukan' });
    }

    const feedback = selectResult.rows[0];
    const images   = feedback.images || [];

    // Hapus file gambar dari disk
    for (const img of images) {
      if (img.filename) {
        const filePath = path.join(FEEDBACK_UPLOAD_DIR, img.filename);
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`[FEEDBACK] Hapus gambar: ${img.filename}`);
          }
        } catch (fileErr) {
          // Log tapi lanjut — jangan gagalkan delete hanya karena file sudah hilang
          console.warn(`[FEEDBACK] Gagal hapus file ${img.filename}:`, fileErr.message);
        }
      }
    }

    // Hapus record dari DB
    await pool.query('DELETE FROM feedbacks WHERE id = $1', [id]);

    console.log(`[FEEDBACK] Feedback #${id} dihapus`);

    return res.json({ success: true, message: 'Feedback berhasil dihapus' });

  } catch (err) {
    console.error('deleteFeedback error:', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};