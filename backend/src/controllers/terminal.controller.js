/**
 * terminal.controller.js
 * WebSocket-based server control panel
 */

const { spawn }  = require('child_process');
const WebSocket  = require('ws');
const jwt        = require('jsonwebtoken');
const path       = require('path');

const JWT_SECRET   = process.env.JWT_SECRET || 'segawon-admin-secret-key-change-in-production';
const BACKEND_DIR  = '/home/segawon/apps/segawon_topup/backend';
const FRONTEND_DIR = '/home/segawon/apps/segawon_topup/frontend';
const APP_ROOT     = '/home/segawon/apps/segawon_topup';
const DB_NAME      = process.env.DB_NAME   || 'segawon_topup2';
const DB_USER      = process.env.DB_USER   || 'postgre';
const DB_HOST      = process.env.DB_HOST   || 'localhost';
const DB_PASS      = process.env.DB_PASS   || "Seg@wonlim0";

const COMMANDS = {
  pm2_status:       { label:'PM2 Status',           cmd:'pm2',        args:['list'],                                         color:'#48bb78', icon:'📊', group:'PM2'                   },
  pm2_restart:      { label:'PM2 Restart Backend',    cmd:'pm2',        args:['restart','segawon-backend'],                    color:'#ed8936', icon:'🔄', group:'PM2',     confirm:true  },
  pm2_logs:         { label:'PM2 Logs (80)',          cmd:'pm2',        args:['logs','segawon-backend','--nostream','--lines','80'],  color:'#4299e1', icon:'📋', group:'PM2'             },
  git_pull:         { label:'Git Pull (production)',   cmd:'git',        args:['pull','origin','production'], cwd:APP_ROOT,  color:'#68d391', icon:'🔀', group:'Build',   confirm:true  },
  npm_build:        { label:'npm run build',          cmd:'npm',        args:['run','build'],      cwd:FRONTEND_DIR,           color:'#f6ad55', icon:'🔨', group:'Build',   confirm:true  },
  expire_orders:    { label:'Run: Expire Orders',     cmd:'node',       args:[`${BACKEND_DIR}/expire-orders.js`],             color:'#9f7aea', icon:'⏰', group:'Scripts', confirm:true  },
  seller_check:     { label:'Run: Seller Check',      cmd:'node',       args:[`${BACKEND_DIR}/check-seller-status.js`],       color:'#9f7aea', icon:'🔍', group:'Scripts', confirm:true  },
  disk_usage:       { label:'Disk Usage',             cmd:'df',         args:['-h'],                                          color:'#38b2ac', icon:'💾', group:'System'                },
  memory:           { label:'Memory',                 cmd:'free',       args:['-m'],                                          color:'#38b2ac', icon:'🧠', group:'System'                },
  uptime:           { label:'Uptime',                 cmd:'uptime',     args:[],                                              color:'#38b2ac', icon:'⏱️', group:'System'                },
  nginx_status:     { label:'Nginx Status',           cmd:'systemctl',  args:['status','nginx','--no-pager','-l'],            color:'#68d391', icon:'🌐', group:'Nginx'                 },
  nginx_reload:     { label:'Nginx Reload',           cmd:'sudo',       args:['systemctl','reload','nginx'],                  color:'#f6ad55', icon:'🔃', group:'Nginx',   confirm:true  },
  nginx_error_log:  { label:'Nginx Error Log',        cmd:'tail',       args:['-n','80','/var/log/nginx/error.log'],          color:'#fc8181', icon:'🔴', group:'Nginx'                 },
  nginx_access_log: { label:'Nginx Access Log',       cmd:'tail',       args:['-n','80','/var/log/nginx/access.log'],         color:'#68d391', icon:'🟢', group:'Nginx'                 },
  log_expire:       { label:'Log: Expire Orders',     cmd:'tail',       args:['-n','80','/home/segawon/logs/expire-orders.log'], color:'#b794f4', icon:'📄', group:'Logs'              },
  log_seller:       { label:'Log: Seller Check',      cmd:'tail',       args:['-n','80','/home/segawon/logs/seller-check.log'],  color:'#b794f4', icon:'📄', group:'Logs'              },
};

const INPUT_COMMANDS = {
  psql: {
    label:'PostgreSQL Query', icon:'🐘', group:'Database', color:'#63b3ed', confirm:true,
    inputLabel:'SQL Query', placeholder:'SELECT * FROM orders LIMIT 10;',
  },
  rm: {
    label:'Remove File', icon:'🗑️', group:'Files', color:'#fc8181', confirm:true,
    inputLabel:'Path file (relatif dari /home/segawon/apps/segawon_topup/)',
    placeholder:'frontend/public/images/header/old-header.jpg',
  },
};

const toPublic = (map) => Object.entries(map).reduce((acc, [k, v]) => {
  acc[k] = { label:v.label, color:v.color, icon:v.icon, group:v.group, confirm:v.confirm||false,
    ...(v.inputLabel ? { inputLabel:v.inputLabel, placeholder:v.placeholder } : {}) };
  return acc;
}, {});

function runProc(ws, cmd, args, cwd, env = {}) {
  const proc = spawn(cmd, args, {
    cwd: cwd || BACKEND_DIR,
    env: { ...process.env, ...env, FORCE_COLOR: '0', TERM: 'xterm' },
    shell: false,
  });
  proc.stdout.on('data', d => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify({ type:'stdout', data:d.toString() })));
  proc.stderr.on('data', d => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify({ type:'stderr', data:d.toString() })));
  proc.on('close', code => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify({ type:'done', code, success:code===0 })));
  proc.on('error', err => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify({ type:'error', message:err.message })));
}

function initWebSocket(server) {
  const wss = new WebSocket.Server({ server, path: '/ws/terminal' });

  wss.on('connection', (ws) => {
    console.log('[Terminal WS] Client connected');
    let authed = false;

    ws.send(JSON.stringify({ type:'init', commands:toPublic(COMMANDS), inputCommands:toPublic(INPUT_COMMANDS) }));

    ws.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw); } catch { return; }

      if (msg.type === 'auth') {
        try {
          jwt.verify(msg.token, JWT_SECRET);
          authed = true;
          ws.send(JSON.stringify({ type:'auth', success:true }));
        } catch {
          ws.send(JSON.stringify({ type:'auth', success:false, message:'Token invalid' }));
          ws.close();
        }
        return;
      }

      if (!authed) { ws.send(JSON.stringify({ type:'error', message:'Tidak terautentikasi' })); return; }

      // Static command
      if (msg.type === 'run') {
        const def = COMMANDS[msg.command];
        if (!def) { ws.send(JSON.stringify({ type:'error', message:'Command tidak dikenal' })); return; }
        console.log(`[Terminal] run: ${def.cmd} ${def.args.join(' ')}`);
        ws.send(JSON.stringify({ type:'start', command:msg.command, label:def.label }));
        runProc(ws, def.cmd, def.args, def.cwd || BACKEND_DIR);
        return;
      }

      // psql
      if (msg.type === 'run_psql') {
        const query = (msg.query || '').trim();
        if (!query) { ws.send(JSON.stringify({ type:'error', message:'Query kosong' })); return; }
        console.log(`[Terminal] psql: ${query.substring(0,80)}`);
        ws.send(JSON.stringify({ type:'start', command:'psql', label:'PostgreSQL Query' }));
        ws.send(JSON.stringify({ type:'stdout', data:`Query: ${query}\n` }));
        runProc(ws, 'psql', ['-h',DB_HOST,'-U',DB_USER,'-d',DB_NAME,'-c',query], APP_ROOT, { PGPASSWORD: DB_PASS });
        return;
      }

      // rm
      if (msg.type === 'run_rm') {
        const filePath = (msg.path || '').trim();
        if (!filePath) { ws.send(JSON.stringify({ type:'error', message:'Path kosong' })); return; }
        const resolved = path.resolve(APP_ROOT, filePath);
        if (!resolved.startsWith(APP_ROOT + '/')) {
          ws.send(JSON.stringify({ type:'error', message:`❌ Akses ditolak: harus dalam ${APP_ROOT}` })); return;
        }
        console.log(`[Terminal] rm: ${resolved}`);
        ws.send(JSON.stringify({ type:'start', command:'rm', label:'Remove File' }));
        ws.send(JSON.stringify({ type:'stdout', data:`Menghapus: ${resolved}\n` }));
        runProc(ws, 'rm', ['-v', resolved], APP_ROOT);
        return;
      }
    });

    ws.on('close', () => console.log('[Terminal WS] Client disconnected'));
    ws.on('error', err => console.error('[Terminal WS] Error:', err.message));
  });

  console.log('[Terminal WS] Ready at /ws/terminal');
}

module.exports = { initWebSocket };