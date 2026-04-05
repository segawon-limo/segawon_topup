import React from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
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

// Admin Dashboard
import AdminLogin from './pages/admin/Login';
import AdminDashboard from './pages/admin/Dashboard';
import AdminOrders from './pages/admin/Orders';
import AdminCatalog  from './pages/admin/Catalog';
import AdminTerminal from './pages/admin/Terminal';
import AdminVouchers from './pages/admin/VoucherPage';
import CekTransaksiPage from './pages/CekTransaksiPage';
import PascabayarPage from './pages/PascabayarPage';
import FAQPage from './pages/FAQPage';
import FeedbackWidget from './components/FeedbackWidget';
import AdminFeedback from './pages/admin/AdminFeedback';
import AdminVisitors from './pages/admin/VisitorPage'; // [ADDED]

function AppContent() {
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {!isAdminPage && <Navbar />}
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/order/:gameSlug" element={<OrderPage />} />
          <Route path="/status/:orderNumber" element={<StatusPage />} />
          <Route path="/order/success" element={<SuccessPage />} />
          // <Route path="/order/payment" element={<PaymentPage />} />
          <Route path="/payment/:orderNumber" element={<PaymentPage />} />
          <Route path="/order/qr" element={<QRPaymentPage />} />
          <Route path="/admin/login"     element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/orders"    element={<AdminOrders />} />
          <Route path="/admin/terminal"  element={<AdminTerminal />} />
          <Route path="/admin/catalog"   element={<AdminCatalog />} />
          <Route path="/admin/vouchers"  element={<AdminVouchers />} />
          <Route path="/admin/feedback"  element={<AdminFeedback />} />
          <Route path="/admin/visitors"  element={<AdminVisitors />} /> {/* [ADDED] */}
          <Route path="/cek-transaksi"   element={<CekTransaksiPage />} />
          <Route path="/pascabayar"      element={<PascabayarPage />} />
          <Route path="/faq"             element={<FAQPage />} />
        </Routes>
      </main>
      {!isAdminPage && <Footer />}
      {!isAdminPage && <FeedbackWidget />}
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
  );
}

function App() {
  return (
    <HelmetProvider>
      <Router>
        <AppContent />
      </Router>
    </HelmetProvider>
  );
}

export default App;