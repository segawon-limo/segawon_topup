import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Pages
import HomePage from './pages/HomePage';
import OrderPage from './pages/OrderPage';
import StatusPage from './pages/StatusPage';
import SuccessPage from './pages/SuccessPage';
import PaymentPage from './pages/PaymentPage';
import QRPaymentPage from './pages/QRPaymentPage';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/order/:gameSlug" element={<OrderPage />} />
            <Route path="/status/:orderNumber" element={<StatusPage />} />
            <Route path="/order/success" element={<SuccessPage />} />
            <Route path="/order/payment" element={<PaymentPage />} />
            <Route path="/order/qr" element={<QRPaymentPage />} />
          </Routes>
        </main>
        <Footer />
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
      </div>
    </Router>
  );
}

export default App;
