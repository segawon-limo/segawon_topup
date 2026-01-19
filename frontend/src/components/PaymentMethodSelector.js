import React, { useState } from 'react';
import { 
  FaQrcode, 
  FaWallet, 
  FaUniversity, 
  FaChevronDown, 
  FaChevronUp,
  FaStar 
} from 'react-icons/fa';
import './PaymentMethodSelector.css';

const PaymentMethodSelector = ({ product, onPaymentSelect }) => {
  const [expandedSection, setExpandedSection] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState(null);

  // Calculate prices for different payment methods
  const calculatePrices = () => {
    // FIXED: Support both naming conventions
    const basePrice = product.base_price || product.basePrice || 0;
    
    console.log('Product:', product);
    console.log('Base Price:', basePrice);
    
    if (!basePrice || basePrice === 0) {
      console.error('Base price is missing!');
      return { qris: 0, ewallet: 0, va: 0 };
    }
    
    // Calculate prices
    const qrisPrice = Math.round(basePrice / (1 - 0.007));
    const ewalletPrice = Math.round(basePrice / (1 - 0.02));
    const vaPrice = Math.round((basePrice + 1000) / (1 - 0.007));
    
    console.log('Prices:', { qrisPrice, ewalletPrice, vaPrice });
    
    return {
      qris: qrisPrice,
      ewallet: ewalletPrice,
      va: vaPrice,
    };
  };

  const prices = calculatePrices();

  // Payment methods configuration
  const paymentMethods = {
    qris: {
      id: 'qris',
      name: 'QRIS PAY',
      icon: <FaQrcode size={40} />,
      price: prices.qris,
      badge: 'Tercepat',
      description: 'Scan QR dengan aplikasi e-wallet atau mobile banking',
      recommended: true,
      channels: [
        { id: 'qris', name: 'QRIS', logo: '/images/qris-logo.png' }
      ]
    },
    ewallet: {
      id: 'ewallet',
      name: 'E-Wallet',
      icon: <FaWallet size={40} />,
      price: prices.ewallet,
      badge: 'Populer',
      description: 'Bayar langsung dari saldo e-wallet',
      channels: [
        { 
          id: 'dana', 
          name: 'DANA', 
          logo: '/images/dana-logo.png',
          type: 'DANA INSTANT'
        },
        { 
          id: 'gopay', 
          name: 'GoPay', 
          logo: '/images/gopay-logo.png',
          type: 'GOPAY'
        },
        { 
          id: 'ovo', 
          name: 'OVO', 
          logo: '/images/ovo-logo.png',
          type: 'OVO'
        },
        { 
          id: 'shopeepay', 
          name: 'ShopeePay', 
          logo: '/images/shopeepay-logo.png',
          type: 'SHOPEEPAY'
        },
      ]
    },
    va: {
      id: 'va',
      name: 'Virtual Account',
      icon: <FaUniversity size={40} />,
      price: prices.va,
      description: 'Transfer ke nomor Virtual Account',
      channels: [
        { 
          id: 'bca', 
          name: 'BCA Virtual Account', 
          logo: '/images/bca-logo.png',
          bankCode: 'BCA'
        },
        { 
          id: 'bni', 
          name: 'BNI Virtual Account', 
          logo: '/images/bni-logo.png',
          bankCode: 'BNI'
        },
        { 
          id: 'mandiri', 
          name: 'Mandiri Virtual Account', 
          logo: '/images/mandiri-logo.png',
          bankCode: 'MANDIRI'
        },
        { 
          id: 'permata', 
          name: 'Permata Virtual Account', 
          logo: '/images/permata-logo.png',
          bankCode: 'PERMATA'
        },
        { 
          id: 'bri', 
          name: 'BRI Virtual Account', 
          logo: '/images/bri-logo.png',
          bankCode: 'BRI'
        },
        { 
          id: 'cimb', 
          name: 'CIMB Niaga Virtual Account', 
          logo: '/images/cimb-logo.png',
          bankCode: 'CIMB'
        },
      ]
    }
  };

  const toggleSection = (sectionId) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  const handleMethodSelect = (method, channel) => {
    // Build the complete payment method string
    let paymentMethod;
    
    if (method.id === 'qris') {
      paymentMethod = 'qris';
    } else if (method.id === 'ewallet') {
      paymentMethod = channel.id;  // gopay, dana, ovo, shopeepay
    } else if (method.id === 'va') {
      paymentMethod = `va_${channel.id}`;  // ✅ va_bca, va_bri, va_bni
    }
    
    const selected = {
      paymentMethod: paymentMethod,  // ✅ This is what backend needs!
      methodType: method.id,
      methodName: method.name,
      channelId: channel.id,
      channelName: channel.name,
      price: method.price,
      bankCode: channel.bankCode,
      type: channel.type,
    };
    
    console.log('Payment method selected:', paymentMethod);
    
    setSelectedMethod(`${method.id}-${channel.id}`);
    onPaymentSelect(selected);
  };

  return (
    <div className="payment-method-selector">
      <h3 className="section-title">Pilih Pembayaran</h3>
      
      <div className="payment-methods-list">
        {/* QRIS */}
        <div className="payment-method-group">
          <div 
            className={`payment-method-header ${expandedSection === 'qris' ? 'expanded' : ''}`}
            onClick={() => toggleSection('qris')}
          >
            <div className="method-info">
              <div className="method-icon qris-icon">
                {paymentMethods.qris.icon}
              </div>
              <div className="method-details">
                <div className="method-name-row">
                  <span className="method-name">{paymentMethods.qris.name}</span>
                  {paymentMethods.qris.recommended && (
                    <span className="recommended-badge">
                      <FaStar size={12} /> Rekomendasi
                    </span>
                  )}
                  {paymentMethods.qris.badge && (
                    <span className="badge badge-fastest">{paymentMethods.qris.badge}</span>
                  )}
                </div>
                <p className="method-description">{paymentMethods.qris.description}</p>
              </div>
            </div>
            <div className="method-price-expand">
              <span className="method-price">
                Rp {paymentMethods.qris.price.toLocaleString('id-ID')}
              </span>
              {expandedSection === 'qris' ? <FaChevronUp /> : <FaChevronDown />}
            </div>
          </div>
          
          {expandedSection === 'qris' && (
            <div className="payment-channels">
              <div 
                className={`payment-channel ${selectedMethod === 'qris-qris' ? 'selected' : ''}`}
                onClick={() => handleMethodSelect(paymentMethods.qris, paymentMethods.qris.channels[0])}
              >
                <div className="channel-logo">
                  <FaQrcode size={40} color="#6B46C1" />
                </div>
                <div className="channel-name">QRIS</div>
                <div className="channel-price">
                  Rp {paymentMethods.qris.price.toLocaleString('id-ID')}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* E-Wallet */}
        <div className="payment-method-group">
          <div 
            className={`payment-method-header ${expandedSection === 'ewallet' ? 'expanded' : ''}`}
            onClick={() => toggleSection('ewallet')}
          >
            <div className="method-info">
              <div className="method-icon ewallet-icon">
                {paymentMethods.ewallet.icon}
              </div>
              <div className="method-details">
                <div className="method-name-row">
                  <span className="method-name">{paymentMethods.ewallet.name}</span>
                  {paymentMethods.ewallet.badge && (
                    <span className="badge badge-popular">{paymentMethods.ewallet.badge}</span>
                  )}
                </div>
                <p className="method-description">{paymentMethods.ewallet.description}</p>
              </div>
            </div>
            <div className="method-price-expand">
              <span className="method-price">
                Rp {paymentMethods.ewallet.price.toLocaleString('id-ID')}
              </span>
              {expandedSection === 'ewallet' ? <FaChevronUp /> : <FaChevronDown />}
            </div>
          </div>
          
          {expandedSection === 'ewallet' && (
            <div className="payment-channels">
              {paymentMethods.ewallet.channels.map((channel) => (
                <div 
                  key={channel.id}
                  className={`payment-channel ${selectedMethod === `ewallet-${channel.id}` ? 'selected' : ''}`}
                  onClick={() => handleMethodSelect(paymentMethods.ewallet, channel)}
                >
                  <div className="channel-logo">
                    <img src={channel.logo} alt={channel.name} />
                  </div>
                  <div className="channel-name">{channel.type || channel.name}</div>
                  <div className="channel-price">
                    Rp {paymentMethods.ewallet.price.toLocaleString('id-ID')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Virtual Account */}
        <div className="payment-method-group">
          <div 
            className={`payment-method-header ${expandedSection === 'va' ? 'expanded' : ''}`}
            onClick={() => toggleSection('va')}
          >
            <div className="method-info">
              <div className="method-icon va-icon">
                {paymentMethods.va.icon}
              </div>
              <div className="method-details">
                <span className="method-name">{paymentMethods.va.name}</span>
                <p className="method-description">{paymentMethods.va.description}</p>
              </div>
            </div>
            <div className="method-price-expand">
              <span className="method-price">
                Rp {paymentMethods.va.price.toLocaleString('id-ID')}
              </span>
              {expandedSection === 'va' ? <FaChevronUp /> : <FaChevronDown />}
            </div>
          </div>
          
          {expandedSection === 'va' && (
            <div className="payment-channels grid-3">
              {paymentMethods.va.channels.map((channel) => (
                <div 
                  key={channel.id}
                  className={`payment-channel ${selectedMethod === `va-${channel.id}` ? 'selected' : ''}`}
                  onClick={() => handleMethodSelect(paymentMethods.va, channel)}
                >
                  <div className="channel-logo">
                    <img src={channel.logo} alt={channel.name} />
                  </div>
                  <div className="channel-price">
                    Rp {paymentMethods.va.price.toLocaleString('id-ID')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodSelector;
