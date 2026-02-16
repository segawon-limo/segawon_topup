import React, { useState } from 'react';
import { FaUniversity, FaQrcode, FaWallet } from 'react-icons/fa';

const PaymentMethodSelector = ({ basePrice, onPaymentSelect, disabled }) => {
  const [expandedSection, setExpandedSection] = useState('va');
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState(null);

  const calculatePrices = (price) => {
    if (!price || price <= 0) return { va: 0 };
    const vaPrice = price + 2500; // biaya VA flat Rp 2.500 (default, override per bank di backend)
    return { va: vaPrice };
  };

  const prices = calculatePrices(basePrice);

  // ── VA banks sesuai kode Duitku ──────────────────────────
  const paymentMethods = {
    va: {
      id: 'va',
      name: 'Virtual Account',
      icon: <FaUniversity size={40} />,
      price: prices.va,
      description: 'Transfer ke nomor Virtual Account bank',
      channels: [
        { id: 'bri',     name: 'BRI Virtual Account',          duitkuCode: 'BR', logo: '/images/bri-logo.png'     },
        { id: 'mandiri', name: 'Mandiri Virtual Account',       duitkuCode: 'M2', logo: '/images/mandiri-logo.png' },
        { id: 'bnc',     name: 'Bank Neo Commerce (BNC)',       duitkuCode: 'NC', logo: '/images/bnc-logo.png'     },
        { id: 'bni',     name: 'BNI Virtual Account',          duitkuCode: 'I1', logo: '/images/bni-logo.png'     },
        { id: 'bsi',     name: 'BSI Virtual Account',          duitkuCode: 'BV', logo: '/images/bsi-logo.png'     },
        { id: 'cimb',    name: 'CIMB Niaga Virtual Account',   duitkuCode: 'B1', logo: '/images/cimb-logo.png'    },
        { id: 'danamon', name: 'Danamon Virtual Account',      duitkuCode: 'DM', logo: '/images/danamon-logo.png' },
        { id: 'permata', name: 'Permata Bank Virtual Account', duitkuCode: 'BT', logo: '/images/permata-logo.png' },
      ]
    },
    qris: {
      id: 'qris',
      name: 'QRIS',
      icon: <FaQrcode size={40} />,
      disabled: true,
      comingSoon: true,
      description: 'Coming soon — dalam proses aktivasi',
      channels: []
    },
    ewallet: {
      id: 'ewallet',
      name: 'E-Wallet',
      icon: <FaWallet size={40} />,
      disabled: true,
      comingSoon: true,
      description: 'Coming soon — dalam proses aktivasi',
      channels: []
    },
  };

  const toggleSection = (sectionId) => {
    const method = paymentMethods[sectionId];
    if (method.disabled) return; // jangan expand kalau disabled
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  const handleMethodSelect = (method, channel) => {
    if (method.disabled) return;
    setSelectedMethod(method.id);
    setSelectedChannel(channel.id);

    // Kirim duitkuCode langsung ke parent
    onPaymentSelect({
      paymentMethod: channel.duitkuCode,
      paymentMethodName: channel.name,
      paymentFee: 2500,
    });
  };

  const isSelected = (methodId, channelId) =>
    selectedMethod === methodId && selectedChannel === channelId;

  return (
    <div className="payment-method-selector">
      {Object.values(paymentMethods).map((method) => (
        <div
          key={method.id}
          className={`payment-method-section ${method.disabled ? 'method-disabled' : ''}`}
        >
          {/* Header section */}
          <div
            className={`payment-method-header ${expandedSection === method.id ? 'expanded' : ''} ${method.disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            onClick={() => toggleSection(method.id)}
          >
            <div className="payment-method-icon">
              {method.icon}
            </div>
            <div className="payment-method-info">
              <div className="payment-method-name">
                {method.name}
                {method.comingSoon && (
                  <span className="badge-coming-soon">Coming Soon</span>
                )}
              </div>
              <div className="payment-method-desc">{method.description}</div>
            </div>
            {!method.disabled && (
              <div className="payment-method-chevron">
                {expandedSection === method.id ? '▲' : '▼'}
              </div>
            )}
          </div>

          {/* Channels */}
          {!method.disabled && expandedSection === method.id && (
            <div className="payment-channels">
              {method.channels.map((channel) => (
                <div
                  key={channel.id}
                  className={`payment-channel ${isSelected(method.id, channel.id) ? 'selected' : ''}`}
                  onClick={() => !disabled && handleMethodSelect(method, channel)}
                >
                  <img
                    src={channel.logo}
                    alt={channel.name}
                    className="channel-logo"
                    onError={e => { e.target.style.display='none'; }}
                  />
                  <span className="channel-name">{channel.name}</span>
                  {isSelected(method.id, channel.id) && (
                    <span className="channel-check">✓</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default PaymentMethodSelector;