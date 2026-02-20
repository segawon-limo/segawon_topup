const pool = require('../config/database');

// ══════════════════════════════════════════════════════════════
// GAMES
// ══════════════════════════════════════════════════════════════

/**
 * GET /api/admin/catalog/games
 * List all games (active + inactive), ordered by sort_order
 */
exports.getGames = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id, name, slug, description, icon_url,
        category, product_type, digiflazz_format_key,
        form_config, is_active, sort_order,
        created_at, updated_at,
        (SELECT COUNT(*) FROM products p WHERE p.game_id = games.id AND p.is_active = true) AS active_products
      FROM games
      ORDER BY sort_order ASC, name ASC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('getGames error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/admin/catalog/games/:id
 * Get single game with its products
 */
exports.getGame = async (req, res) => {
  try {
    const { id } = req.params;
    const gameRes = await pool.query(`SELECT * FROM games WHERE id = $1`, [id]);
    if (!gameRes.rows.length) return res.status(404).json({ success: false, message: 'Game not found' });

    const productsRes = await pool.query(`
      SELECT * FROM products WHERE game_id = $1 ORDER BY sort_order ASC, selling_price ASC
    `, [id]);

    res.json({ success: true, data: { ...gameRes.rows[0], products: productsRes.rows } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/admin/catalog/games
 * Create new game
 */
exports.createGame = async (req, res) => {
  try {
    const {
      name, slug, description, icon_url,
      category, product_type, digiflazz_format_key,
      form_config, is_active, sort_order
    } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ success: false, message: 'name dan slug wajib diisi' });
    }

    // Cek slug duplicate
    const existing = await pool.query(`SELECT id FROM games WHERE slug = $1`, [slug]);
    if (existing.rows.length) {
      return res.status(400).json({ success: false, message: `Slug "${slug}" sudah dipakai` });
    }

    const result = await pool.query(`
      INSERT INTO games (
        name, slug, description, icon_url,
        category, product_type, digiflazz_format_key,
        form_config, is_active, sort_order,
        created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, NOW(), NOW())
      RETURNING *
    `, [
      name, slug, description || null, icon_url || null,
      category || 'games',
      product_type || 'topup_game',
      digiflazz_format_key || 'userId_only',
      form_config ? JSON.stringify(form_config) : null,
      is_active !== false,
      sort_order || 0
    ]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('createGame error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PUT /api/admin/catalog/games/:id
 * Update game
 */
exports.updateGame = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, slug, description, icon_url,
      category, product_type, digiflazz_format_key,
      form_config, is_active, sort_order
    } = req.body;

    // Cek slug duplicate (exclude diri sendiri)
    if (slug) {
      const existing = await pool.query(
        `SELECT id FROM games WHERE slug = $1 AND id != $2`, [slug, id]
      );
      if (existing.rows.length) {
        return res.status(400).json({ success: false, message: `Slug "${slug}" sudah dipakai game lain` });
      }
    }

    const result = await pool.query(`
      UPDATE games SET
        name               = COALESCE($1, name),
        slug               = COALESCE($2, slug),
        description        = $3,
        icon_url           = $4,
        category           = COALESCE($5, category),
        product_type       = COALESCE($6, product_type),
        digiflazz_format_key = COALESCE($7, digiflazz_format_key),
        form_config        = $8,
        is_active          = COALESCE($9, is_active),
        sort_order         = COALESCE($10, sort_order),
        updated_at         = NOW()
      WHERE id = $11
      RETURNING *
    `, [
      name, slug, description, icon_url,
      category, product_type, digiflazz_format_key,
      form_config ? JSON.stringify(form_config) : null,
      is_active,
      sort_order,
      id
    ]);

    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Game not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('updateGame error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * DELETE /api/admin/catalog/games/:id
 * Soft delete (set is_active = false) — hard delete hanya jika tidak ada orders
 */
exports.deleteGame = async (req, res) => {
  try {
    const { id } = req.params;
    const { hard } = req.query; // ?hard=true untuk hard delete

    if (hard === 'true') {
      // Cek apakah ada orders terkait
      const ordersCheck = await pool.query(`
        SELECT COUNT(*) FROM orders o
        JOIN products p ON p.id = o.product_id
        WHERE p.game_id = $1
      `, [id]);

      if (parseInt(ordersCheck.rows[0].count) > 0) {
        return res.status(400).json({
          success: false,
          message: 'Tidak bisa hard delete — game ini punya order. Gunakan soft delete (is_active=false).'
        });
      }

      await pool.query(`DELETE FROM games WHERE id = $1`, [id]);
      return res.json({ success: true, message: 'Game dihapus permanen' });
    }

    // Soft delete
    await pool.query(
      `UPDATE games SET is_active = false, updated_at = NOW() WHERE id = $1`, [id]
    );
    res.json({ success: true, message: 'Game dinonaktifkan' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// ══════════════════════════════════════════════════════════════
// PRODUCTS
// ══════════════════════════════════════════════════════════════

/**
 * GET /api/admin/catalog/products?game_id=...&search=...
 * List products, optional filter by game
 */
exports.getProducts = async (req, res) => {
  try {
    const { game_id, search } = req.query;
    const params = [];
    let where = [];

    if (game_id) { params.push(game_id); where.push(`p.game_id = $${params.length}`); }
    if (search)  { params.push(`%${search}%`); where.push(`(p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length})`); }

    const whereStr = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const result = await pool.query(`
      SELECT
        p.id, p.name, p.description, p.sku,
        p.base_price, p.selling_price, p.profit_price,
        p.is_active, p.sort_order,
        g.icon_product_url,
        p.game_id,
        p.created_at, p.updated_at,
        g.name AS game_name, g.slug AS game_slug
      FROM products p
      JOIN games g ON g.id = p.game_id
      ${whereStr}
      ORDER BY g.sort_order ASC, p.sort_order ASC, p.selling_price ASC
    `, params);

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('getProducts error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/admin/catalog/products
 * Create new product
 */
exports.createProduct = async (req, res) => {
  try {
    const {
      game_id, name, description, sku,
      base_price, selling_price, profit_price,
      is_active, sort_order, icon_product_url
    } = req.body;

    if (!game_id || !name || !sku || !selling_price) {
      return res.status(400).json({ success: false, message: 'game_id, name, sku, selling_price wajib diisi' });
    }

    // Cek SKU duplicate
    const existing = await pool.query(`SELECT id FROM products WHERE sku = $1`, [sku]);
    if (existing.rows.length) {
      return res.status(400).json({ success: false, message: `SKU "${sku}" sudah ada` });
    }

    // Auto-hitung profit_price jika tidak diisi
    const computedProfit = profit_price || (selling_price - (base_price || 0));

    const result = await pool.query(`
      INSERT INTO products (
        game_id, name, description, sku,
        base_price, selling_price, profit_price,
        is_active, sort_order, icon_product_url,
        created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, NOW(), NOW())
      RETURNING *
    `, [
      game_id, name, description || null, sku,
      base_price || 0,
      parseFloat(selling_price),
      computedProfit,
      is_active !== false,
      sort_order || 0,
      icon_product_url || null
    ]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('createProduct error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PUT /api/admin/catalog/products/:id
 * Update product
 */
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      game_id, name, description, sku,
      base_price, selling_price, profit_price,
      is_active, sort_order, icon_product_url
    } = req.body;

    // Cek SKU duplicate (exclude diri sendiri)
    if (sku) {
      const existing = await pool.query(
        `SELECT id FROM products WHERE sku = $1 AND id != $2`, [sku, id]
      );
      if (existing.rows.length) {
        return res.status(400).json({ success: false, message: `SKU "${sku}" sudah dipakai produk lain` });
      }
    }

    const result = await pool.query(`
      UPDATE products SET
        game_id          = COALESCE($1, game_id),
        name             = COALESCE($2, name),
        description      = $3,
        sku              = COALESCE($4, sku),
        base_price       = COALESCE($5, base_price),
        selling_price    = COALESCE($6, selling_price),
        profit_price     = COALESCE($7, profit_price),
        is_active        = COALESCE($8, is_active),
        sort_order       = COALESCE($9, sort_order),
        icon_product_url = $10,
        updated_at       = NOW()
      WHERE id = $11
      RETURNING *
    `, [
      game_id, name, description, sku,
      base_price, selling_price, profit_price,
      is_active, sort_order, icon_product_url,
      id
    ]);

    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('updateProduct error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * DELETE /api/admin/catalog/products/:id
 * Soft delete product
 */
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { hard } = req.query;

    if (hard === 'true') {
      const ordersCheck = await pool.query(
        `SELECT COUNT(*) FROM orders WHERE product_id = $1`, [id]
      );
      if (parseInt(ordersCheck.rows[0].count) > 0) {
        return res.status(400).json({
          success: false,
          message: 'Tidak bisa hard delete — produk ini punya order. Gunakan soft delete.'
        });
      }
      await pool.query(`DELETE FROM products WHERE id = $1`, [id]);
      return res.json({ success: true, message: 'Product dihapus permanen' });
    }

    await pool.query(
      `UPDATE products SET is_active = false, updated_at = NOW() WHERE id = $1`, [id]
    );
    res.json({ success: true, message: 'Product dinonaktifkan' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/admin/catalog/products/bulk
 * Bulk insert products untuk satu game (berguna saat tambah game baru dari Digiflazz)
 * Body: { game_id, products: [{ name, sku, base_price, selling_price, sort_order }] }
 */
exports.bulkCreateProducts = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { game_id, products } = req.body;

    if (!game_id || !Array.isArray(products) || !products.length) {
      return res.status(400).json({ success: false, message: 'game_id dan products[] wajib diisi' });
    }

    const results = { created: 0, skipped: 0, errors: [] };

    for (const p of products) {
      try {
        const existing = await client.query(`SELECT id FROM products WHERE sku = $1`, [p.sku]);
        if (existing.rows.length) { results.skipped++; continue; }

        const profit = p.profit_price || (parseFloat(p.selling_price) - parseFloat(p.base_price || 0));
        await client.query(`
          INSERT INTO products (game_id, name, description, sku, base_price, selling_price, profit_price, is_active, sort_order, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,true,$8,NOW(),NOW())
        `, [game_id, p.name, p.description || null, p.sku, p.base_price || 0, p.selling_price, profit, p.sort_order || 0]);
        results.created++;
      } catch (err) {
        results.errors.push({ sku: p.sku, error: err.message });
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, data: results });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
};