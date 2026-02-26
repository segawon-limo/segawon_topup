import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './Terminal.css';

const WS_URL = (() => {
  const base = process.env.REACT_APP_API_URL || 'https://segawontopup.net';
  return base.replace('https://', 'wss://').replace('http://', 'ws://');
})();

const GROUP_ICONS = { PM2:'⚙️', Build:'🔨', Scripts:'📜', System:'🖥️', Nginx:'🌐', Logs:'📄', Database:'🐘', Files:'🗑️' };
const GROUP_ORDER = ['PM2','Build','Scripts','System','Nginx','Logs','Database','Files'];

function stripAnsi(s) { return s.replace(/\x1B\[[0-9;]*[mGKHF]/g, ''); }

export default function AdminTerminal() {
  const navigate     = useNavigate();
  const wsRef        = useRef(null);
  const outputRef    = useRef(null);
  const reconnTimer  = useRef(null);

  const [connected,    setConnected]    = useState(false);
  const [authed,       setAuthed]       = useState(false);
  const [commands,     setCommands]     = useState({});
  const [inputCmds,    setInputCmds]    = useState({});
  const [running,      setRunning]      = useState(null);
  const [output,       setOutput]       = useState([{ line:'Menghubungkan ke server...', type:'system' }]);
  const [confirmCmd,   setConfirmCmd]   = useState(null);
  const [inputPanel,   setInputPanel]   = useState(null);

  // Collapsible state: semua group terbuka by default
  const [openGroups,   setOpenGroups]   = useState({});

  const token = localStorage.getItem('admin_token');

  const append = useCallback((line, type = 'stdout') => {
    setOutput(prev => [...prev, { line: stripAnsi(line), type }]);
  }, []);

  useEffect(() => {
    if (!token) { navigate('/admin/login'); return; }
    connect();
    return () => { wsRef.current?.close(); clearTimeout(reconnTimer.current); };
  }, []);

  // Semua group tertutup by default, buka hanya PM2 pertama kali
  useEffect(() => {
    const groups = {};
    [...Object.values(commands), ...Object.values(inputCmds)].forEach(cmd => {
      const g = cmd.group || 'Other';
      if (!(g in groups)) groups[g] = false; // false = tertutup by default
    });
    // Buka group PM2 saja by default
    if ('PM2' in groups) groups['PM2'] = true;
    setOpenGroups(groups);
  }, [commands, inputCmds]);

  const isAtBottom = useRef(true);

  const handleOutputScroll = () => {
    const el = outputRef.current;
    if (!el) return;
    isAtBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  };

  useEffect(() => {
    if (outputRef.current && isAtBottom.current)
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [output]);

  function connect() {
    const ws = new WebSocket(`${WS_URL}/ws/terminal`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({ type:'auth', token }));
    };

    ws.onclose = () => {
      setConnected(false);
      setAuthed(false);
      setRunning(null);
      append('── Koneksi terputus. Reconnect dalam 3s...', 'system');
      reconnTimer.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => append('── WebSocket error', 'error');

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      switch (msg.type) {
        case 'init':
          setCommands(msg.commands || {});
          setInputCmds(msg.inputCommands || {});
          break;
        case 'auth':
          if (msg.success) { setAuthed(true); append('── Siap. Pilih command di kiri.', 'system'); }
          else append('── Auth gagal: ' + msg.message, 'error');
          break;
        case 'start':
          setRunning(msg.command);
          isAtBottom.current = true;
          outputRef.current && (outputRef.current.scrollTop = outputRef.current.scrollHeight);
          append(`\n▶ ${msg.label}`, 'system');
          append('─'.repeat(55), 'divider');
          break;
        case 'stdout':
          msg.data.split('\n').forEach(l => l && append(l, 'stdout'));
          break;
        case 'stderr':
          msg.data.split('\n').forEach(l => l && append(l, 'stderr'));
          break;
        case 'done':
          setRunning(null);
          append('─'.repeat(55), 'divider');
          append(msg.success ? '✓ Selesai (exit 0)' : `✗ Exit code: ${msg.code}`, msg.success ? 'success' : 'error');
          append('', 'stdout');
          break;
        case 'error':
          setRunning(null);
          append('✗ Error: ' + msg.message, 'error');
          break;
        default: break;
      }
    };
  }

  function send(payload) {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      append('✗ WebSocket tidak terhubung', 'error'); return;
    }
    wsRef.current.send(JSON.stringify(payload));
  }

  function clickCmd(key) {
    const cmd = commands[key];
    if (!cmd || running || !authed) return;
    if (cmd.confirm) { setConfirmCmd({ key, label: cmd.label, msgType:'run', payload:{ type:'run', command:key } }); return; }
    send({ type:'run', command:key });
  }

  function clickInputCmd(key) {
    const cmd = inputCmds[key];
    if (!cmd || running || !authed) return;
    setInputPanel({ key, ...cmd, value:'' });
  }

  function buildPayload(key, value) {
    switch(key) {
      case 'psql':       return { type:'run_psql',       query: value };
      case 'rm':         return { type:'run_rm',         path:  value };
      case 'cat':        return { type:'run_cat',        path:  value };
      case 'head':       return { type:'run_head',       path:  value };
      case 'tail':       return { type:'run_tail',       path:  value };
      case 'grep':       return { type:'run_grep',       path:  value };
      case 'node_exec':  return { type:'run_node_exec',  path:  value };
      default:           return null;
    }
  }

  function submitInput() {
    if (!inputPanel) return;
    const { key, value, label } = inputPanel;
    if (!value.trim()) return;

    const payload = buildPayload(key, value);
    if (!payload) return;

    if (inputPanel.confirm) {
      setInputPanel(null);
      setConfirmCmd({ key, label, msgType:'input', payload });
      return;
    }
    setInputPanel(null);
    send(payload);
  }

  function execConfirm() {
    if (!confirmCmd) return;
    send(confirmCmd.payload);
    setConfirmCmd(null);
  }

  function toggleGroup(group) {
    setOpenGroups(prev => ({ ...prev, [group]: !prev[group] }));
  }

  function groupBy(obj) {
    return Object.entries(obj).reduce((acc, [k, v]) => {
      const g = v.group || 'Other';
      if (!acc[g]) acc[g] = [];
      acc[g].push({ key:k, ...v });
      return acc;
    }, {});
  }

  const staticGroups = groupBy(commands);
  const inputGroups  = groupBy(inputCmds);
  const allGroups    = { ...staticGroups };
  Object.entries(inputGroups).forEach(([g, items]) => {
    if (!allGroups[g]) allGroups[g] = [];
    allGroups[g].push(...items.map(i => ({ ...i, isInput:true })));
  });

  const sortedGroups = Object.entries(allGroups).sort(([a],[b]) => {
    const ai = GROUP_ORDER.indexOf(a), bi = GROUP_ORDER.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  return (
    <div className="terminal-page">

      {/* Confirm Modal */}
      {confirmCmd && (
        <div className="term-overlay" onClick={() => setConfirmCmd(null)}>
          <div className="term-confirm" onClick={e => e.stopPropagation()}>
            <div className="term-confirm-icon">⚠️</div>
            <h3>Konfirmasi</h3>
            <p>Jalankan <strong>{confirmCmd.label}</strong>?</p>
            {confirmCmd.payload?.query && (
              <code className="term-confirm-code">{confirmCmd.payload.query}</code>
            )}
            {confirmCmd.payload?.path && confirmCmd.payload?.type === 'run_rm' && (
              <code className="term-confirm-code">rm {confirmCmd.payload.path}</code>
            )}
            {confirmCmd.payload?.path && confirmCmd.payload?.type === 'run_node_exec' && (
              <code className="term-confirm-code">$ {confirmCmd.payload.path}</code>
            )}
            <div className="term-confirm-btns">
              <button className="btn-cancel" onClick={() => setConfirmCmd(null)}>Batal</button>
              <button className="btn-run"    onClick={execConfirm}>▶ Jalankan</button>
            </div>
          </div>
        </div>
      )}

      {/* Input Panel Modal */}
      {inputPanel && (
        <div className="term-overlay" onClick={() => setInputPanel(null)}>
          <div className="term-input-modal" onClick={e => e.stopPropagation()}>
            <div className="term-input-header">
              <span>{inputPanel.icon} {inputPanel.label}</span>
              <button className="modal-close-btn" onClick={() => setInputPanel(null)}>✕</button>
            </div>
            <label className="term-input-label">{inputPanel.inputLabel}</label>
            {inputPanel.key === 'psql' ? (
              <textarea
                className="term-input-textarea"
                placeholder={inputPanel.placeholder}
                value={inputPanel.value}
                onChange={e => setInputPanel(p => ({ ...p, value: e.target.value }))}
                onKeyDown={e => { if (e.ctrlKey && e.key === 'Enter') submitInput(); }}
                autoFocus
                rows={5}
              />
            ) : (
              <input
                className="term-input-text"
                placeholder={inputPanel.placeholder}
                value={inputPanel.value}
                onChange={e => setInputPanel(p => ({ ...p, value: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') submitInput(); }}
                autoFocus
              />
            )}
            {inputPanel.key === 'psql' && (
              <p className="term-input-hint">Ctrl+Enter untuk submit</p>
            )}
            <div className="term-confirm-btns" style={{ marginTop:16 }}>
              <button className="btn-cancel" onClick={() => setInputPanel(null)}>Batal</button>
              <button className="btn-run" onClick={submitInput} disabled={!inputPanel.value.trim()}>
                ▶ Jalankan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="term-header">
        <div className="term-header-left">
          <button className="term-back" onClick={() => navigate('/admin/dashboard')}>← Dashboard</button>
          <div className="term-brand">
            <img
              src="/images/logo/logo-navbar.png"
              alt="Segawon"
              className="term-brand-logo"
            />
            <div className="term-brand-text">
              <span className="term-brand-name">Segawon</span>
              <h1 className="term-title">Server Control</h1>
            </div>
          </div>
        </div>
        <div className="term-status">
          <span className={`status-dot ${connected ? (authed ? 'dot-green' : 'dot-yellow') : 'dot-red'}`} />
          <span className="status-text">
            {!connected ? 'Disconnected' : !authed ? 'Authenticating...' : 'Connected'}
          </span>
        </div>
      </div>

      <div className="term-layout">
        {/* Sidebar */}
        <div className="term-sidebar">
          {sortedGroups.map(([group, items]) => {
            const isOpen = openGroups[group] !== false; // default terbuka
            return (
              <div key={group} className="cmd-group">
                {/* Accordion Header */}
                <button
                  className="cmd-group-label cmd-group-toggle"
                  onClick={() => toggleGroup(group)}
                  title={isOpen ? 'Tutup' : 'Buka'}
                >
                  <span className="cmd-group-left">
                    <span className="cmd-group-icon">{GROUP_ICONS[group] || '⚡'}</span>
                    <span>{group}</span>
                  </span>
                  <span className={`cmd-group-chevron ${isOpen ? 'chevron-open' : ''}`}>›</span>
                </button>

                {/* Accordion Content */}
                <div className={`cmd-group-items ${isOpen ? 'cmd-group-items-open' : ''}`}>
                  {items.map(cmd => (
                    <button
                      key={cmd.key}
                      className={`cmd-btn ${running === cmd.key ? 'cmd-running' : ''} ${cmd.isInput ? 'cmd-input-type' : ''}`}
                      style={{ '--cmd-color': cmd.color }}
                      onClick={() => cmd.isInput ? clickInputCmd(cmd.key) : clickCmd(cmd.key)}
                      disabled={!!running || !authed}
                      title={cmd.label}
                    >
                      <span className="cmd-icon">{cmd.icon}</span>
                      <span className="cmd-label">{cmd.label}</span>
                      {running === cmd.key && <span className="cmd-spinner" />}
                      {cmd.confirm && !cmd.isInput && <span className="cmd-warn" title="Butuh konfirmasi">!</span>}
                      {cmd.isInput && <span className="cmd-input-indicator" title="Butuh input">✎</span>}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Output */}
        <div className="term-output-wrap">
          <div className="term-output-header">
            <span className="term-output-title">
              {running ? `▶ ${commands[running]?.label || inputCmds[running]?.label || running}...` : '● Output'}
            </span>
            <button className="btn-clear" onClick={() => setOutput([])} disabled={!!running}>🗑 Clear</button>
          </div>
          <div className="term-output" ref={outputRef} onScroll={handleOutputScroll}>
            {output.length === 0 && (
              <div className="term-empty">Pilih command di kiri untuk menjalankannya</div>
            )}
            {output.map((item, i) => (
              <div key={i} className={`term-line term-${item.type}`}>
                {item.type === 'divider'
                  ? <span className="term-divider">{item.line}</span>
                  : <span>{item.line}</span>}
              </div>
            ))}
            {running && <div className="term-line term-system term-blink"><span>█</span></div>}
          </div>
        </div>
      </div>
    </div>
  );
}