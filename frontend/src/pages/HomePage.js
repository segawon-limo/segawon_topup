import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { FaGamepad, FaRocket, FaClock, FaShieldAlt } from 'react-icons/fa';

const API_URL = process.env.REACT_APP_API_URL;

function HomePage() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/games`);
      setGames(response.data.games);
    } catch (error) {
      console.error('Error fetching games:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
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

      {/* Games Section */}
      <section id="games" className="py-16 bg-gray-50">
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
  );
}

export default HomePage;
