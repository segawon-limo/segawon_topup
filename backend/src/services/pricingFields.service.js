/**
 * pricingFields.service.js
 *
 * SATU-SATUNYA tempat yang boleh menghitung profit_price, margin_percent,
 * dan fixed_profit_amount dari base_price + selling_price + pricing_mode.
 *
 * Dipanggil oleh:
 *  - catalog.controller.js  (manual edit/create produk lewat admin panel)
 *  - check-seller-status.js (auto-reprice tiap 6 jam dari harga Digiflazz)
 *
 * Kenapa harus satu tempat: kalau logic ini diduplikasi di tiap file yang
 * nulis ke tabel products, salah satu pasti lupa di-update kalau aturan
 * berubah — itu yang bikin kasus PLN100K (fixed_profit_amount basi setelah
 * edit manual lewat form lama). Jangan duplikasi fungsi ini di tempat lain.
 */

const MARGIN_DECIMALS = 3; // simpan margin_percent sampai 3 desimal

/**
 * Dipanggil setelah admin SIMPAN dari form Catalog (base_price & selling_price
 * final sudah diketahui). Menghasilkan profit_price + margin_percent/fixed_profit_amount
 * yang konsisten, sesuai pricing_mode produk.
 */
function computePricingFields(basePrice, sellingPrice, pricingMode) {
  const base = parseFloat(basePrice);
  const sell = parseFloat(sellingPrice);
  const profit = Math.round(sell - base);

  const fields = {
    profit_price: profit,
    margin_percent: null,
    fixed_profit_amount: null,
  };

  if (pricingMode === 'fixed_amount') {
    fields.fixed_profit_amount = profit;
  } else {
    // percentage — markup-on-cost (profit / base_price), konsisten dengan
    // logic live-calculation di form Edit Product (3 dari 4 titik kalkulasi
    // di Catalog.js pakai formula ini, bukan gross-margin)
    fields.margin_percent = base > 0
      ? Math.round((profit / base) * 100 * 10 ** MARGIN_DECIMALS) / 10 ** MARGIN_DECIMALS
      : 0;
  }

  return fields;
}

/**
 * Dipanggil oleh cron auto-reprice: dari base_price BARU (harga Digiflazz
 * terkini) + konfigurasi pricing produk yang sudah tersimpan, hitung
 * selling_price baru yang mempertahankan margin/profit asli produk.
 *
 * Sengaja TIDAK ada fallback diam-diam kalau data kosong — return skip:true
 * supaya caller bisa lewati produk itu & beri tahu admin, bukan menebak.
 */
function calculateNewSellingPrice(product, newBasePrice) {
  if (product.pricing_mode === 'fixed_amount') {
    if (product.fixed_profit_amount === null || product.fixed_profit_amount === undefined) {
      return { skip: true, reason: 'fixed_profit_amount belum diisi' };
    }
    const newSelling = Math.round(newBasePrice + parseFloat(product.fixed_profit_amount));
    return { skip: false, newSelling };
  }

  // default: percentage
  if (product.margin_percent === null || product.margin_percent === undefined) {
    return { skip: true, reason: 'margin_percent belum diisi' };
  }
  const marginPct = parseFloat(product.margin_percent);
  if (marginPct < 0) {
    return { skip: true, reason: `margin_percent tidak valid (${marginPct}%)` };
  }
  const newSelling = Math.round(newBasePrice * (1 + marginPct / 100));
  return { skip: false, newSelling };
}

module.exports = { computePricingFields, calculateNewSellingPrice };