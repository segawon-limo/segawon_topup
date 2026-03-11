import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { FaGamepad, FaRocket, FaClock, FaShieldAlt } from 'react-icons/fa';
import GameCard from '../components/GameCard';
import { Helmet } from 'react-helmet-async';

const API_URL = process.env.REACT_APP_API_URL;

// Label & urutan tampil di homepage per category
const CATEGORY_CONFIG = {
  games:      { label: 'Pilih Game Favorit Kamu',      icon: '🎮', order: 1 },
  voucher:    { label: 'Voucher & Top Up',              icon: '🎁', order: 2 },
  utilities:  { label: 'Utilitas',                      icon: '⚡', order: 3 },
  pulsa_data: { label: 'Pulsa & Paket Data',            icon: '📱', order: 4 },
};

function HomePage() {
  const [grouped, setGrouped]   = useState({});
  const [games, setGames]       = useState([]);   // flat list (kompatibel lama)
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/games`);
      setGames(response.data.games || []);
      setGrouped(response.data.grouped || {});
    } catch (error) {
      console.error('Error fetching games:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Top Up Game Murah &amp; Cepat 24/7 - Segawon Topup</title>
        <meta name="description" content="Platform top up game terpercaya #1 di Indonesia. Top up Mobile Legends, Free Fire, PUBG, Valorant, Genshin Impact & 100+ game lainnya. Proses otomatis, harga termurah!" />
        <link rel="canonical" href="https://segawontopup.net/" />
        <meta property="og:title" content="Top Up Game Murah & Cepat 24/7 - Segawon Topup" />
        <meta property="og:description" content="Platform top up game terpercaya #1 di Indonesia. Proses otomatis, harga termurah!" />
        <meta property="og:url" content="https://segawontopup.net/" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "Segawon Topup",
          "url": "https://segawontopup.net",
          "logo": "https://segawontopup.net/images/logo/logo-navbar@2x.png",
          "description": "Platform top up game terpercaya di Indonesia",
          "contactPoint": { "@type": "ContactPoint", "contactType": "customer service", "availableLanguage": "Indonesian" }
        })}</script>
      </Helmet>
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-6">
              Topup Game Instan 24/7
            </h1>
            <p className="text-xl mb-8 text-primary-100">
              Proses cepat, harga murah, dan aman. Topup game favoritmu sekarang!
            </p>
            <div className="flex justify-center gap-4">
              <a
                href="#games"
                className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-primary-50 transition"
              >
                Mulai Topup
              </a>
              <a
                href="#features"
                className="bg-primary-700 text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-600 transition border-2 border-primary-500"
              >
                Lihat Fitur
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">
            Mengapa Pilih Kami?
          </h2>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaRocket className="text-3xl text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Proses Instan</h3>
              <p className="text-gray-600">
                Topup langsung masuk dalam hitungan menit setelah pembayaran
              </p>
            </div>
            <div className="text-center">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaClock className="text-3xl text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">24/7 Online</h3>
              <p className="text-gray-600">
                Layanan otomatis yang siap melayani kapan saja
              </p>
            </div>
            <div className="text-center">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaShieldAlt className="text-3xl text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">100% Aman</h3>
              <p className="text-gray-600">
                Transaksi aman dengan payment gateway terpercaya
              </p>
            </div>
            <div className="text-center">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaGamepad className="text-3xl text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Multi Game</h3>
              <p className="text-gray-600">
                Berbagai pilihan game populer tersedia
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Product Sections — dikelompokkan per category */}
      <section id="games" className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
              <p className="mt-4 text-gray-600">Memuat produk...</p>
            </div>
          ) : (
            <>
              {/* Render tiap category sesuai urutan CATEGORY_CONFIG */}
              {Object.entries(CATEGORY_CONFIG)
                .sort((a, b) => a[1].order - b[1].order)
                .map(([catKey, catCfg]) => {
                  const items = grouped[catKey];
                  if (!items || items.length === 0) return null;
                  return (
                    <div key={catKey} className="mb-16">
                      <h2 className="text-3xl font-bold text-center mb-10 text-gray-800">
                        <span className="mr-2">{catCfg.icon}</span>
                        {catCfg.label}
                      </h2>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 max-w-7xl mx-auto">
                        {items.map((game) => (
                          <GameCard key={game.id} game={game} />
                        ))}
                      </div>
                    </div>
                  );
                })
              }

              {/* Fallback: kalau grouped kosong (misal API lama), tampilkan flat */}
              {Object.keys(grouped).length === 0 && (
                <div>
                  <h2 className="text-3xl font-bold text-center mb-10 text-gray-800">
                    🎮 Pilih Game Favorit Kamu
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 max-w-7xl mx-auto">
                    {games.map((game) => (
                      <GameCard key={game.id} game={game} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* <section id="games" className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">
            Pilih Game Favorit Kamu
          </h2>
          
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
              <p className="mt-4 text-gray-600">Loading games...</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {games.map((game) => (
                <Link
                  key={game.id}
                  to={`/order/${game.slug}`}
                  className="bg-white rounded-lg shadow-md hover:shadow-xl transition p-6 text-center group"
                >
                  <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center group-hover:scale-110 transition">
                    <FaGamepad className="text-4xl text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-800">
                    {game.name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">
                    {game.description}
                  </p>
                  <button className="bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700 transition w-full">
                    Topup Sekarang
                  </button>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section> */}

      {/* ── Internet Pascabayar Section ────────────────────────────────── */}
      <section className="py-16 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row items-center gap-10">

              {/* Left: Text */}
              <div className="flex-1 text-center md:text-left">
                <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
                  🌐 Internet Pascabayar
                </div>
                <h2 className="text-3xl font-bold text-gray-800 mb-4">
                  Bayar Tagihan Internet<br />
                  <span className="text-blue-600">Lebih Mudah & Cepat</span>
                </h2>
                <p className="text-gray-500 mb-6 leading-relaxed">
                  Bayar tagihan internet IndiHome, MyRepublic, XL Home, CBN langsung dari satu platform.
                  Proses instan, tersedia berbagai metode pembayaran.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start mb-6">
                  <div className="flex items-center gap-2 text-gray-600 text-sm"><span className="text-green-500 font-bold">✓</span> Proses instan</div>
                  <div className="flex items-center gap-2 text-gray-600 text-sm"><span className="text-green-500 font-bold">✓</span> Tanpa denda keterlambatan</div>
                  <div className="flex items-center gap-2 text-gray-600 text-sm"><span className="text-green-500 font-bold">✓</span> Tersedia voucher diskon</div>
                </div>
                <Link
                  to="/pascabayar"
                  className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  🌐 Bayar Tagihan Sekarang
                </Link>
              </div>

              {/* Right: Provider cards */}
              <div className="flex-shrink-0 grid grid-cols-2 gap-3 w-full max-w-xs">
                {[
                  { name: 'IndiHome',    logo: '/images/pascabayar/indihome-logo.png',    color: '#e67e22' },
                  { name: 'MyRepublic',  logo: '/images/pascabayar/myrepublic-logo.png',  color: '#e74c3c' },
                  { name: 'XL Home',     logo: '/images/pascabayar/xlhome-logo.png',      color: '#2980b9' },
                  { name: 'CBN',         logo: '/images/pascabayar/cbn-logo.png',         color: '#27ae60' },
                ].map(p => (
                  <Link
                    key={p.name}
                    to="/pascabayar"
                    className="bg-white rounded-xl p-4 flex flex-col items-center gap-2 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 border border-gray-100"
                  >
                    <img src={p.logo} alt={p.name}
                      className="h-10 object-contain"
                      onError={e => { e.target.style.display='none'; }}
                    />
                    <span className="text-xs font-semibold text-gray-700">{p.name}</span>
                  </Link>
                ))}
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">
            Cara Topup
          </h2>
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex-1 text-center">
                <div className="bg-primary-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  1
                </div>
                <h3 className="text-lg font-semibold mb-2">Pilih Game & Nominal</h3>
                <p className="text-gray-600">
                  Pilih game dan nominal topup yang kamu inginkan
                </p>
              </div>
              <div className="flex-1 text-center">
                <div className="bg-primary-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  2
                </div>
                <h3 className="text-lg font-semibold mb-2">Input User ID</h3>
                <p className="text-gray-600">
                  Masukkan Riot ID dan tagline akun game kamu
                </p>
              </div>
              <div className="flex-1 text-center">
                <div className="bg-primary-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  3
                </div>
                <h3 className="text-lg font-semibold mb-2">Bayar</h3>
                <p className="text-gray-600">
                  Pilih metode pembayaran dan selesaikan transaksi
                </p>
              </div>
              <div className="flex-1 text-center">
                <div className="bg-primary-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  4
                </div>
                <h3 className="text-lg font-semibold mb-2">Selesai</h3>
                <p className="text-gray-600">
                  Topup otomatis masuk ke akun kamu dalam beberapa menit
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-primary-600 to-primary-800 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Siap untuk Topup?
          </h2>
          <p className="text-xl mb-8 text-primary-100">
            Jutaan gamers sudah mempercayai kami. Bergabunglah sekarang!
          </p>
          <a
            href="#games"
            className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-primary-50 transition inline-block"
          >
            Mulai Topup Sekarang
          </a>
        </div>
      </section>
    </div>
    </>
  );
}

export default HomePage;