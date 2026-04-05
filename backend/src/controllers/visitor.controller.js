/**
 * Visitor Controller
 * Handles page view tracking and visitor statistics for admin dashboard.
 *
 * Data yang dikumpulkan: path, session_id, device_type, browser, os, referrer.
 * Tidak menyimpan IP address.
 */

const { pool } = require('../config/database');

// ─── Helper: parse User-Agent string ─────────────────────────────────────────

function parseUserAgent(ua = '') {
  // Device type
  let device_type = 'desktop';
  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    device_type = 'tablet';
  } else if (/mobile|iphone|ipod|android|blackberry|mini|windows\sce|palm/i.test(ua)) {
    device_type = 'mobile';
  }

  // Browser
  let browser = 'Other';
  if (/edg\//i.test(ua))          browser = 'Edge';
  else if (/opr\//i.test(ua))     browser = 'Opera';
  else if (/chrome/i.test(ua))    browser = 'Chrome';
  else if (/safari/i.test(ua))    browser = 'Safari';
  else if (/firefox/i.test(ua))   browser = 'Firefox';
  else if (/msie|trident/i.test(ua)) browser = 'IE';
  else if (/samsung/i.test(ua))   browser = 'Samsung';
  else if (/ucbrowser/i.test(ua)) browser = 'UC Browser';

  // OS
  let os = 'Other';
  if (/windows nt/i.test(ua))     os = 'Windows';
  else if (/android/i.test(ua))   os = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/mac os/i.test(ua))    os = 'macOS';
  else if (/linux/i.test(ua))     os = 'Linux';

  return { device_type, browser, os };
}

// ─── POST /api/track/pageview ─────────────────────────────────────────────────

/**
 * Record a page view.
 * Body: { session_id, path, page_title, referrer }
 */
exports.trackPageView = async (req, res) => {
  try {
    const { session_id, path, page_title, referrer } = req.body;

    if (!session_id || !path) {
      return res.status(400).json({ success: false, message: 'session_id dan path wajib diisi' });
    }

    const ua = req.headers['user-agent'] || '';
    const { device_type, browser, os } = parseUserAgent(ua);

    // Truncate referrer to avoid storing overly long URLs
    const cleanReferrer = referrer ? referrer.substring(0, 500) : null;

    await pool.query(
      `INSERT INTO page_views (session_id, path, page_title, device_type, browser, os, referrer)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [session_id, path, page_title || null, device_type, browser, os, cleanReferrer]
    );

    return res.json({ success: true });
  } catch (error) {
    console.error('trackPageView Error:', error);
    // Return 200 tetap agar tidak blok user experience
    return res.json({ success: false });
  }
};

// ─── GET /api/admin/visitors/stats ───────────────────────────────────────────

/**
 * Visitor summary stats untuk dashboard card.
 * Returns: total views, unique sessions, breakdown per path, device, browser, os
 */
exports.getVisitorStats = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;

    // Total views & unique sessions
    const summary = await pool.query(`
      SELECT
        COUNT(*)                          AS total_views,
        COUNT(DISTINCT session_id)        AS unique_sessions,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 day'  THEN 1 END) AS views_today,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) AS views_7days
      FROM page_views
      WHERE created_at >= NOW() - ($1 || ' days')::INTERVAL
    `, [days]);

    // Per-path breakdown
    const byPath = await pool.query(`
      SELECT
        path,
        page_title,
        COUNT(*)                   AS total_views,
        COUNT(DISTINCT session_id) AS unique_sessions
      FROM page_views
      WHERE created_at >= NOW() - ($1 || ' days')::INTERVAL
      GROUP BY path, page_title
      ORDER BY total_views DESC
    `, [days]);

    // Per-device breakdown
    const byDevice = await pool.query(`
      SELECT device_type, COUNT(*) AS total
      FROM page_views
      WHERE created_at >= NOW() - ($1 || ' days')::INTERVAL
      GROUP BY device_type ORDER BY total DESC
    `, [days]);

    // Per-browser breakdown
    const byBrowser = await pool.query(`
      SELECT browser, COUNT(*) AS total
      FROM page_views
      WHERE created_at >= NOW() - ($1 || ' days')::INTERVAL
      GROUP BY browser ORDER BY total DESC
    `, [days]);

    // Per-OS breakdown
    const byOS = await pool.query(`
      SELECT os, COUNT(*) AS total
      FROM page_views
      WHERE created_at >= NOW() - ($1 || ' days')::INTERVAL
      GROUP BY os ORDER BY total DESC
    `, [days]);

    // Daily trend (views per day)
    const dailyTrend = await pool.query(`
      SELECT
        DATE(created_at) AS date,
        COUNT(*)                   AS total_views,
        COUNT(DISTINCT session_id) AS unique_sessions
      FROM page_views
      WHERE created_at >= NOW() - ($1 || ' days')::INTERVAL
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, [days]);

    return res.json({
      success: true,
      data: {
        summary:     summary.rows[0],
        by_path:     byPath.rows,
        by_device:   byDevice.rows,
        by_browser:  byBrowser.rows,
        by_os:       byOS.rows,
        daily_trend: dailyTrend.rows,
      }
    });
  } catch (error) {
    console.error('getVisitorStats Error:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil statistik visitor' });
  }
};

// ─── GET /api/admin/visitors/log ─────────────────────────────────────────────

/**
 * Paginated visitor log untuk halaman detail.
 * Query params: page, limit, path, device_type, browser, date_from, date_to
 */
exports.getVisitorLog = async (req, res) => {
  try {
    const page       = Math.max(1, parseInt(req.query.page)  || 1);
    const limit      = Math.min(100, parseInt(req.query.limit) || 50);
    const offset     = (page - 1) * limit;
    const pathFilter = req.query.path        || null;
    const device     = req.query.device_type || null;
    const browser    = req.query.browser     || null;
    const dateFrom   = req.query.date_from   || null;
    const dateTo     = req.query.date_to     || null;

    const conditions = [];
    const params     = [];

    if (pathFilter) { params.push(`%${pathFilter}%`); conditions.push(`path ILIKE $${params.length}`); }
    if (device)     { params.push(device);             conditions.push(`device_type = $${params.length}`); }
    if (browser)    { params.push(browser);            conditions.push(`browser = $${params.length}`); }
    if (dateFrom)   { params.push(dateFrom);           conditions.push(`created_at >= $${params.length}`); }
    if (dateTo)     { params.push(dateTo);             conditions.push(`created_at <= $${params.length}::date + INTERVAL '1 day'`); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total
    const countResult = await pool.query(
      `SELECT COUNT(*) AS total FROM page_views ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Fetch rows
    params.push(limit);
    params.push(offset);
    const rows = await pool.query(
      `SELECT id, session_id, path, page_title, device_type, browser, os, referrer, created_at
       FROM page_views ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return res.json({
      success: true,
      data: {
        rows:        rows.rows,
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      }
    });
  } catch (error) {
    console.error('getVisitorLog Error:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil log visitor' });
  }
};