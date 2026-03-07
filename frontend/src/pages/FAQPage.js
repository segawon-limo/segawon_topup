import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './FAQPage.css';

const FAQ_DATA = [
  {
    category: 'Topup Game',
    icon: '🎮',
    items: [
      {
        q: 'Berapa lama proses topup setelah pembayaran?',
        a: 'Topup diproses secara otomatis dan biasanya selesai dalam hitungan menit setelah pembayaran dikonfirmasi. Pada jam sibuk, proses bisa memakan waktu hingga 15 menit.',
      },
      {
        q: 'Apakah topup bisa gagal? Apa yang terjadi jika gagal?',
        a: 'Dalam kasus yang sangat jarang, topup bisa gagal karena gangguan server game atau ID yang tidak valid. Jika ini terjadi, tim kami akan segera memproses refund atau pengiriman ulang. Kamu bisa menghubungi CS kami lewat WhatsApp.',
      },
      {
        q: 'Bagaimana cara memastikan User ID saya benar?',
        a: 'Pastikan kamu memasukkan User ID (bukan username/nickname). Untuk Mobile Legends, User ID dan Zone ID bisa ditemukan di profil akun dalam game. Untuk Free Fire, User ID ada di profil akun. Sistem kami akan memverifikasi dan menampilkan nama akun sebelum kamu konfirmasi pembelian.',
      },
      {
        q: 'Apakah topup bisa dilakukan untuk akun orang lain?',
        a: 'Bisa! Cukup masukkan User ID akun yang ingin ditopup. Kamu tidak perlu login ke akun tersebut.',
      },
      {
        q: 'Game apa saja yang tersedia?',
        a: 'Kami mendukung berbagai game populer seperti Mobile Legends, Free Fire, PUBG Mobile, Genshin Impact, Valorant, dan masih banyak lagi. Cek halaman utama untuk daftar lengkap game yang tersedia.',
      },
    ],
  },
  {
    category: 'Pembayaran',
    icon: '💳',
    items: [
      {
        q: 'Metode pembayaran apa saja yang tersedia?',
        a: 'Kami menerima berbagai metode pembayaran: Virtual Account (BRI, Mandiri, BNI, BNC, BSI, CIMB, Danamon, Permata), QRIS (semua aplikasi e-wallet yang support QRIS), dan E-Wallet (OVO, ShopeePay).',
      },
      {
        q: 'Berapa lama batas waktu pembayaran?',
        a: 'Kamu memiliki waktu 24 jam untuk menyelesaikan pembayaran setelah order dibuat. Setelah waktu habis, order akan otomatis dibatalkan dan kamu perlu membuat order baru.',
      },
      {
        q: 'Apakah ada biaya tambahan saat pembayaran?',
        a: 'Ada biaya layanan kecil tergantung metode pembayaran yang dipilih. Virtual Account dikenakan biaya Rp 3.000 (Rp 4.000 untuk Mandiri). QRIS dikenakan 0,7% dari total transaksi. Biaya ini ditampilkan dengan jelas sebelum kamu konfirmasi pembayaran.',
      },
      {
        q: 'Pembayaran saya sudah berhasil tapi status masih "Menunggu"?',
        a: 'Konfirmasi pembayaran biasanya otomatis dalam beberapa menit. Jika lebih dari 10 menit status belum berubah, coba klik tombol "Cek Status" di halaman pembayaran. Jika masih bermasalah, hubungi CS kami dengan menyertakan nomor order.',
      },
      {
        q: 'Bagaimana cara menggunakan kode voucher?',
        a: 'Setelah memilih metode pembayaran, akan muncul kolom "Kode Voucher (Opsional)". Masukkan kode voucher dan klik "Pakai". Diskon akan langsung diterapkan ke total pembayaran.',
      },
    ],
  },
  {
    category: 'Tagihan Internet',
    icon: '🌐',
    items: [
      {
        q: 'Provider internet apa saja yang bisa dibayar?',
        a: 'Saat ini kami mendukung pembayaran tagihan untuk IndiHome (Telkom), MyRepublic, XL Home, dan CBN. Kami terus berupaya menambah provider baru.',
      },
      {
        q: 'Bagaimana cara cek tagihan sebelum membayar?',
        a: 'Di halaman Tagihan Internet, pilih provider dan masukkan nomor pelanggan kamu. Sistem akan otomatis mengambil informasi tagihan terkini termasuk jumlah tagihan, periode, dan detail lainnya.',
      },
      {
        q: 'Apakah pembayaran tagihan internet langsung diproses?',
        a: 'Ya, setelah pembayaran dikonfirmasi, tagihan akan otomatis diproses ke provider. Kamu akan mendapat notifikasi email setelah pembayaran berhasil diproses.',
      },
      {
        q: 'Berapa lama tagihan terbayar tercatat di provider?',
        a: 'Umumnya tagihan akan tercatat di sistem provider dalam 1x24 jam setelah pembayaran sukses. Jika lebih dari itu belum tercatat, hubungi CS kami.',
      },
    ],
  },
  {
    category: 'Akun & Transaksi',
    icon: '🔍',
    items: [
      {
        q: 'Apakah saya perlu membuat akun untuk bertransaksi?',
        a: 'Tidak perlu! Kamu bisa langsung bertransaksi tanpa registrasi. Cukup masukkan email untuk menerima invoice dan notifikasi.',
      },
      {
        q: 'Bagaimana cara cek status order saya?',
        a: 'Kamu bisa cek status order di halaman "Cek Transaksi" dengan memasukkan nomor order atau email yang kamu gunakan saat transaksi. Nomor order ada di email konfirmasi yang kami kirimkan.',
      },
      {
        q: 'Apakah saya akan menerima invoice?',
        a: 'Ya! Invoice akan dikirim otomatis ke email yang kamu daftarkan saat checkout. Invoice berisi detail order, rincian pembayaran, dan informasi produk.',
      },
      {
        q: 'Email invoice tidak saya terima, apa yang harus dilakukan?',
        a: 'Cek folder spam/junk email terlebih dahulu. Jika tidak ada, kamu bisa mengecek status transaksi melalui halaman Cek Transaksi menggunakan nomor order. Jika masih bermasalah, hubungi CS kami.',
      },
    ],
  },
];

export default function FAQPage() {
  const [openItems, setOpenItems] = useState({});
  const [activeCategory, setActiveCategory] = useState(null);

  const toggle = (catIdx, itemIdx) => {
    const key = `${catIdx}-${itemIdx}`;
    setOpenItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const filteredData = activeCategory !== null
    ? [FAQ_DATA[activeCategory]]
    : FAQ_DATA;

  return (
    <div className="faq-page">

      {/* Hero */}
      <div className="faq-hero">
        <div className="faq-hero-inner">
          <span className="faq-hero-badge">❓ Pusat Bantuan</span>
          <h1 className="faq-hero-title">Pertanyaan yang Sering Ditanyakan</h1>
          <p className="faq-hero-sub">
            Temukan jawaban atas pertanyaan seputar topup game, pembayaran, dan layanan kami.
          </p>
          <div className="faq-hero-actions">
            <Link to="/" className="faq-btn-home">🏠 Kembali ke Beranda</Link>
            <a
              href="https://wa.me/6285791464598"
              target="_blank"
              rel="noopener noreferrer"
              className="faq-btn-cs"
            >
              💬 Hubungi CS
            </a>
          </div>
        </div>
      </div>

      <div className="faq-container">

        {/* Category Filter */}
        <div className="faq-categories">
          <button
            className={`faq-cat-btn ${activeCategory === null ? 'active' : ''}`}
            onClick={() => setActiveCategory(null)}
          >
            🗂️ Semua
          </button>
          {FAQ_DATA.map((cat, i) => (
            <button
              key={i}
              className={`faq-cat-btn ${activeCategory === i ? 'active' : ''}`}
              onClick={() => setActiveCategory(activeCategory === i ? null : i)}
            >
              {cat.icon} {cat.category}
            </button>
          ))}
        </div>

        {/* FAQ Items */}
        <div className="faq-sections">
          {filteredData.map((cat, catIdx) => {
            const realCatIdx = activeCategory !== null ? activeCategory : catIdx;
            return (
              <div key={realCatIdx} className="faq-section">
                <div className="faq-section-header">
                  <span className="faq-section-icon">{cat.icon}</span>
                  <h2 className="faq-section-title">{cat.category}</h2>
                </div>

                <div className="faq-list">
                  {cat.items.map((item, itemIdx) => {
                    const key = `${realCatIdx}-${itemIdx}`;
                    const isOpen = !!openItems[key];
                    return (
                      <div
                        key={itemIdx}
                        className={`faq-item ${isOpen ? 'open' : ''}`}
                        onClick={() => toggle(realCatIdx, itemIdx)}
                      >
                        <div className="faq-question">
                          <span className="faq-q-text">{item.q}</span>
                          <span className="faq-chevron">{isOpen ? '▲' : '▼'}</span>
                        </div>
                        {isOpen && (
                          <div className="faq-answer">
                            <p>{item.a}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Still need help */}
        <div className="faq-cta">
          <div className="faq-cta-icon">🤝</div>
          <h3>Masih ada pertanyaan?</h3>
          <p>Tim CS kami siap membantu kamu 24/7 melalui WhatsApp</p>
          <a
            href="https://wa.me/6285791464598"
            target="_blank"
            rel="noopener noreferrer"
            className="faq-cta-btn"
          >
            💬 Chat dengan CS Sekarang
          </a>
        </div>

      </div>
    </div>
  );
}