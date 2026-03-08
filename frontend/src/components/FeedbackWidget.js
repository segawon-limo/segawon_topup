import React, { useState, useRef, useEffect } from 'react';
import './FeedbackWidget.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://segawontopup.net';
const MAX_FILES     = 3;
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

export default function FeedbackWidget() {
  const [isOpen,     setIsOpen]     = useState(false);
  const [isHovered,  setIsHovered]  = useState(false);
  const [message,    setMessage]    = useState('');
  const [images,     setImages]     = useState([]); // [{ file, preview, filename, data }]
  const [status,     setStatus]     = useState('idle'); // idle | submitting | success | error
  const [errorMsg,   setErrorMsg]   = useState('');
  const [lightbox,   setLightbox]   = useState(null); // preview src
  const [isMobile,   setIsMobile]   = useState(false);

  const fileInputRef = useRef(null);
  const panelRef     = useRef(null);

  // Detect mobile (touch device)
  useEffect(() => {
    setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // Tutup panel kalau klik di luar
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const togglePanel = () => {
    setIsOpen(prev => !prev);
    if (status === 'success') resetForm();
  };

  const resetForm = () => {
    setMessage('');
    setImages([]);
    setStatus('idle');
    setErrorMsg('');
  };

  // ── Image handling ────────────────────────────────────────
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    processFiles(files);
    e.target.value = ''; // reset input
  };

  const processFiles = (files) => {
    setErrorMsg('');
    const remaining = MAX_FILES - images.length;
    const toProcess = files.slice(0, remaining);

    toProcess.forEach(file => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setErrorMsg('Format tidak didukung. Gunakan JPG, PNG, atau WebP.');
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setErrorMsg(`"${file.name}" melebihi batas 2MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        const data = ev.target.result; // base64 data URL
        setImages(prev => {
          if (prev.length >= MAX_FILES) return prev;
          return [...prev, {
            preview:  data,
            filename: file.name,
            data:     data,
          }];
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (idx) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
  };

  // ── Drag & drop ───────────────────────────────────────────
  const handleDragOver = (e) => { e.preventDefault(); };
  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };

  // ── Submit ────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!message.trim() || message.trim().length < 5) {
      setErrorMsg('Pesan minimal 5 karakter.');
      return;
    }
    setStatus('submitting');
    setErrorMsg('');

    try {
      const payload = {
        message: message.trim(),
        images:  images.map(img => ({
          filename: img.filename,
          data:     img.data,
        })),
      };

      const res = await fetch(`${API_URL}/api/feedback`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });

      const result = await res.json();

      if (result.success) {
        setStatus('success');
      } else {
        setErrorMsg(result.message || 'Gagal mengirim feedback.');
        setStatus('idle');
      }
    } catch (err) {
      setErrorMsg('Terjadi kesalahan. Coba lagi.');
      setStatus('idle');
    }
  };

  const charCount   = message.length;
  const canSubmit   = message.trim().length >= 5 && status === 'idle';
  const showExpand  = !isMobile && isHovered && !isOpen;

  return (
    <>
      {/* Lightbox */}
      {lightbox && (
        <div className="fb-lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Preview" onClick={e => e.stopPropagation()} />
          <button className="fb-lightbox-close" onClick={() => setLightbox(null)}>✕</button>
        </div>
      )}

      <div className="fb-widget" ref={panelRef}>
        {/* Panel */}
        <div className={`fb-panel ${isOpen ? 'fb-panel--open' : ''}`}>
          <div className="fb-panel-header">
            <div>
              <div className="fb-panel-title">💬 Kritik & Saran</div>
              <div className="fb-panel-sub">Bantu kami jadi lebih baik!</div>
            </div>
            <button className="fb-panel-close" onClick={() => setIsOpen(false)}>✕</button>
          </div>

          {status === 'success' ? (
            <div className="fb-success">
              <div className="fb-success-icon">🙏</div>
              <div className="fb-success-title">Terima kasih!</div>
              <div className="fb-success-sub">Feedback kamu sudah kami terima dan akan kami pertimbangkan.</div>
              <button className="fb-btn-secondary" onClick={() => { resetForm(); setIsOpen(false); }}>
                Tutup
              </button>
            </div>
          ) : (
            <div className="fb-panel-body">
              {/* Textarea */}
              <label className="fb-label">Pesan kamu</label>
              <textarea
                className="fb-textarea"
                placeholder="Tulis kritik, saran, atau apapun yang kamu rasakan saat menggunakan website ini..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                maxLength={2000}
                rows={4}
              />
              <div className={`fb-char ${charCount > 1800 ? 'fb-char--warn' : ''}`}>
                {charCount} / 2000
              </div>

              {/* Upload area */}
              <label className="fb-label">
                Lampiran gambar <span className="fb-label-hint">(opsional, maks. {MAX_FILES} · 2MB each)</span>
              </label>

              {images.length < MAX_FILES && (
                <div
                  className="fb-dropzone"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <span className="fb-dropzone-icon">🖼️</span>
                  <span className="fb-dropzone-text">
                    Klik atau drag gambar ke sini
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    style={{ display: 'none' }}
                    onChange={handleFileSelect}
                  />
                </div>
              )}

              {/* Preview thumbnails */}
              {images.length > 0 && (
                <div className="fb-thumbs">
                  {images.map((img, idx) => (
                    <div key={idx} className="fb-thumb">
                      <img
                        src={img.preview}
                        alt={`preview-${idx}`}
                        onClick={() => setLightbox(img.preview)}
                      />
                      <button
                        className="fb-thumb-remove"
                        onClick={() => removeImage(idx)}
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Error */}
              {errorMsg && <div className="fb-error">{errorMsg}</div>}

              {/* Submit */}
              <button
                className="fb-btn-submit"
                onClick={handleSubmit}
                disabled={!canSubmit}
              >
                {status === 'submitting' ? '⏳ Mengirim...' : '📤 Kirim Feedback'}
              </button>
            </div>
          )}
        </div>

        {/* FAB Button */}
        <button
          className={`fb-fab ${isOpen ? 'fb-fab--open' : ''} ${showExpand ? 'fb-fab--expanded' : ''}`}
          onClick={togglePanel}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          aria-label="Kritik & Saran"
        >
          <span className="fb-fab-icon">{isOpen ? '✕' : '💬'}</span>
          <span className="fb-fab-label">Kritik &amp; Saran</span>
        </button>
      </div>
    </>
  );
}