#!/usr/bin/env node
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const CHROME = process.env.QA_CHROME || (fs.existsSync('/usr/sbin/chromium') ? '/usr/sbin/chromium' : undefined);
const BASE = process.env.QA_BASE;
const PORT = process.env.QA_PORT ? parseInt(process.env.QA_PORT, 10) : 0;
const ROOT = path.join(__dirname, '..');

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg'
};

function serve(req, res) {
  let url = req.url.split('?')[0];
  if (url === '/') url = '/index.html';
  if (url === '/favicon.ico') { res.statusCode = 204; res.end(); return; }
  const file = path.join(ROOT, url);
  if (!file.startsWith(ROOT)) { res.statusCode = 403; res.end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.statusCode = 404; res.end('not found'); return; }
    const ext = path.extname(file).toLowerCase();
    res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
    res.end(data);
  });
}

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer(serve);
    server.listen(PORT, '127.0.0.1', () => {
      const addr = server.address();
      console.log('server: http://127.0.0.1:' + addr.port);
      resolve({ server, url: 'http://127.0.0.1:' + addr.port });
    });
    server.on('error', reject);
  });
}

(async () => {
  let server = null;
  let browser = null;
  try {
    const base = BASE || (await startServer()).url;

    browser = await puppeteer.launch({ executablePath: CHROME, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    const pageErrors = [];
    const consoleErrors = [];
    page.on('pageerror', e => pageErrors.push(String(e).slice(0, 200)));
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 200)); });

    await page.goto(base + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 600));

    let state = await page.evaluate(() => window.G ? G.state : 'no-G');
    if (state !== 'menu') throw new Error('expected menu, got ' + state);
    console.log('  ✓ menu');

    await page.evaluate(() => { document.getElementById('mStart').click(); });
    await new Promise(r => setTimeout(r, 1500));
    state = await page.evaluate(() => window.G ? G.state : 'no-G');
    if (state !== 'playing') throw new Error('expected playing after start, got ' + state);
    console.log('  ✓ start -> playing');

    await new Promise(r => setTimeout(r, 2500));
    const mobs = await page.evaluate(() => G.mobs.length);
    if (!(mobs > 0)) throw new Error('no active mobs after start');
    console.log('  ✓ active mobs: ' + mobs);

    await page.evaluate(() => {
      G.training = false; G.wave = 4; G.ultAt = 4;
      const p = G.players[0];
      p.coffee = 100; p.cdQ = 0; p.qT = 0; p.shield = 0;
      p.cdS = 0; p.haste = 0; p.cdD = 0; p.cdU = 0; p.superC = 0;
      G.plan = 0;
    });

    await page.keyboard.down('KeyQ'); await new Promise(r => setTimeout(r, 80)); await page.keyboard.up('KeyQ');
    await new Promise(r => setTimeout(r, 80));
    let s = await page.evaluate(() => G.players[0].shield);
    if (!(s > 0)) throw new Error('Q did not activate skill');
    console.log('  ✓ ability Q');

    await page.evaluate(() => { const p = G.players[0]; p.cdS = 0; p.haste = 0; });
    await page.keyboard.down('KeyE'); await new Promise(r => setTimeout(r, 80)); await page.keyboard.up('KeyE');
    await new Promise(r => setTimeout(r, 80));
    s = await page.evaluate(() => G.players[0].haste);
    if (!(s > 0)) throw new Error('E did not activate skill2');
    console.log('  ✓ ability E');

    await page.evaluate(() => { G.players[0].cdD = 0; });
    await page.keyboard.down('Space'); await new Promise(r => setTimeout(r, 80)); await page.keyboard.up('Space');
    await new Promise(r => setTimeout(r, 80));
    s = await page.evaluate(() => G.players[0].cdD);
    if (!(s > 0)) throw new Error('Space did not dodge');
    console.log('  ✓ dodge Space');

    await page.evaluate(() => { const p = G.players[0]; p.cdU = 0; p.superC = 1; G.plan = 0; });
    await page.keyboard.press('KeyR');
    await new Promise(r => setTimeout(r, 120));
    s = await page.evaluate(() => ({ plan: G.plan, superC: G.players[0].superC }));
    if (!(s.plan > 0 && s.superC === 0)) throw new Error('R did not activate super');
    console.log('  ✓ super R');

    await page.evaluate(() => { if (typeof togglePause === 'function') togglePause(); });
    await new Promise(r => setTimeout(r, 400));
    state = await page.evaluate(() => G.state);
    if (state !== 'paused') throw new Error('pause failed: ' + state);
    console.log('  ✓ pause');

    await page.evaluate(() => { if (typeof togglePause === 'function') togglePause(); });
    await new Promise(r => setTimeout(r, 400));
    state = await page.evaluate(() => G.state);
    if (state !== 'playing') throw new Error('resume failed: ' + state);
    console.log('  ✓ resume');

    if (pageErrors.length) throw new Error('page errors: ' + pageErrors.slice(0, 3).join(' | '));
    if (consoleErrors.length) throw new Error('console errors: ' + consoleErrors.slice(0, 3).join(' | '));
    console.log('  ✓ no page/console errors');

    console.log('smoke: ✓ all checks passed');
  } catch (e) {
    console.error('smoke: ✗ ' + e.message);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (server) server.close();
    process.exit(process.exitCode || 0);
  }
})();
