require('dotenv').config();
const https = require('https');
const crypto = require('crypto');
const USERNAME = process.env.DIGIFLAZZ_USERNAME;
const API_KEY = process.env.DIGIFLAZZ_PRODUCTION_KEY;
const sign = crypto.createHash('md5').update(USERNAME + API_KEY + 'pricelist').digest('hex');
const body = JSON.stringify({ cmd: 'prepaid', username: USERNAME, sign });
const req = https.request({ hostname: 'api.digiflazz.com', path: '/v1/price-list', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }}, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => console.log(d)); });
req.write(body); req.end();