#!/usr/bin/env node

'use strict';
const puppeteer = require('puppeteer');

const fs = require('fs');
const CHROME = process.env.QA_CHROME || (fs.existsSync('/usr/sbin/chromium') ? '/usr/sbin/chromium' : undefined);
const BASE = process.env.COOP_BASE || 'http://127.0.0.1:8099';

const FLAGS = ['--no-sandbox','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding','--disable-background-timer-throttling'];
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  let fails = 0;
  const ok = m => console.log('  ✓ ' + m);
  const fail = m => { console.log('  ✗ ' + m); fails++; };
  const bH = await puppeteer.launch({ executablePath: CHROME, args: FLAGS });
  const bG = await puppeteer.launch({ executablePath: CHROME, args: FLAGS });
  const h = await (await bH.createBrowserContext()).newPage();
  const g = await (await bG.createBrowserContext()).newPage();
  for (const p of [h, g]) {
    p.on('pageerror', e => fail('JS: ' + String(e).slice(0, 120)));
    await p.setViewport({ width: 900, height: 500 });
  }
  await h.goto(BASE + '/?cooph', { waitUntil: 'domcontentloaded' });
  await g.goto(BASE + '/?coopg', { waitUntil: 'domcontentloaded' });
  await sleep(1500);
  await h.evaluate(() => { document.getElementById('mCoop').click(); document.getElementById('cHost').click(); });
  let code = '';
  for (let i = 0; i < 10; i++) {
    await sleep(500);
    code = await h.evaluate(() => window.__bo.NET.code);
    if (/^[a-z0-9]{4}$/.test(code)) break;
  }
  if (!/^[a-z0-9]{4}$/.test(code)) { console.log('✗ хост не создал комнату: ' + await h.evaluate(() => document.getElementById('shareHint').textContent)); process.exit(1); }
  ok('хост: комната ' + code + ' (trystero P2P)');
  await g.evaluate(c => { location.href = '/?join=' + c; }, code);
  await sleep(2500);
  await g.evaluate(() => {
    window.__msgLog = [];
    const og = window.guestOnMsg;
    window.guestOnMsg = d => { window.__msgLog.push(d.t + (d.seed ? ':' + String(d.seed).slice(0, 3) : '')); return og(d); };
  });
  await g.evaluate(() => { document.getElementById('rdsn').click(); document.getElementById('mStart').click(); });
  let joined = false;
  for (let i = 0; i < 30; i++) {
    await sleep(1000);
    joined = await g.evaluate(() => !!(window.__bo.NET.hostPid || window.__bo.NET.started));
    if (joined) break;
  }
  if (!joined) {
    const diag = await g.evaluate(() => JSON.stringify({ status: document.getElementById('netStatus').textContent, err: document.getElementById('joinErr').textContent }));
    fail('гость не подключился за 30с: ' + diag);
    await bH.close(); await bG.close();
    process.exit(1);
  }
  ok('гость: P2P-соединение установлено');
  let lobbyOk = false;
  for (let i = 0; i < 15; i++) {
    await sleep(1000);
    const gLobby = await g.evaluate(() => document.getElementById('lobbyList2').innerText.replace(/\n/g, ';'));
    if (gLobby.split('●').length - 1 === 2) { lobbyOk = true; break; }
  }
  const gLobbyFinal = await g.evaluate(() => document.getElementById('lobbyList2').innerText.replace(/\n/g, ';'));
  if (!lobbyOk) fail('в лобби гостя не двое: ' + gLobbyFinal);
  else ok('лобби: ' + gLobbyFinal);
  console.log('  хост до старта: ' + await h.evaluate(() => document.getElementById('lobbyList').innerText.replace(/\n/g, ';') + ' conns=' + window.__bo.NET.conns.length));

  await h.evaluate(() => { document.getElementById('bstart').click(); });
  let started = false;
  for (let i = 0; i < 15; i++) {
    await sleep(1000);
    const gs = await g.evaluate(() => JSON.stringify({ state: window.__bo.G.state, vP: window.VIEW.players.length }));
    const st = JSON.parse(gs);
    if (st.state === 'playing' && st.vP >= 2) { started = true; break; }
  }
  const gsFinal = await g.evaluate(() => JSON.stringify({ state: window.__bo.G.state, vP: window.VIEW.players.length, vM: window.VIEW.mobs.length, recv: Math.round(performance.now() - window.__bo.NET.lastRecv) }));
  if (!started) fail('гость не в игре: ' + gsFinal);
  else ok('гость в игре, снапшоты идут (' + JSON.parse(gsFinal).recv + 'мс от последнего)');

  await g.evaluate(() => {
    window.__sent = 0;
    const oc = window.__bo.NET.hostConn.send.bind(window.__bo.NET.hostConn);
    window.__bo.NET.hostConn.send = m => { if (m.t === 'in') window.__sent++; return oc(m); };
  });
  await h.evaluate(() => { window.__recvIn = 0; const orh = window.hostOnRelay; window.hostOnRelay = (pid, d) => { if (d && d.t === 'in') window.__recvIn++; return orh(pid, d); }; });
  const before = await h.evaluate(() => { const p = window.__bo.G.players.find(p => p.id !== 'me'); return Math.round(p.x) + ',' + Math.round(p.y) + ' iy=' + p.iy; });
  await g.evaluate(() => { window.keys = window.keys || {}; window.keys.KeyS = true; });
  await sleep(2000);
  const counters = await Promise.all([
    g.evaluate(() => JSON.stringify({ sent: window.__sent, input: window.INPUT.iy, touch: window.isTouch })),
    h.evaluate(() => 'recvIn=' + window.__recvIn)
  ]);
  const inFlight = await h.evaluate(() => { const p = window.__bo.G.players.find(p => p.id !== 'me'); return 'iy=' + p.iy; });
  await g.evaluate(() => { window.keys.KeyS = false; });
  await sleep(400);
  const after = await h.evaluate(() => { const p = window.__bo.G.players.find(p => p.id !== 'me'); return Math.round(p.x) + ',' + Math.round(p.y) + ' iy=' + p.iy; });
  console.log('  счётчики: ' + counters.join(' | '));
  const [bx, by] = before.split(' ')[0].split(',').map(Number);
  const [ax, ay] = after.split(' ')[0].split(',').map(Number);
  const moved = Math.hypot(ax - bx, ay - by);
  if (moved < 40) fail('ГОСТЬ НЕ ДВИГАЕТСЯ на хосте: ' + before + ' → ' + after + ' (инпут доходит: ' + inFlight + ', дистанция ' + Math.round(moved) + ')');
  else ok('гость двигается на хосте: ' + Math.round(moved) + 'px за 2с (' + inFlight + ')');

  const self = await g.evaluate(() => JSON.stringify({
    self: (() => { const b = window.__bo, v = window.VIEW; const me = v.players.find(p => p.id === b.NET.myId); return (me ? Math.round(me.x) + ',' + Math.round(me.y) : 'no-me') + ' myId=' + b.NET.myId + ' ids=' + v.players.map(p=>p.id).join(','); })(),
    msgs: window.__msgLog.slice(-12), seed: window.__bo.G.wave
  }));
  console.log('  гость видит себя: ' + self);
  await bH.close(); await bG.close();
  console.log(fails ? 'COOP E2E: ✗ ' + fails : 'COOP E2E: ✓ всё чисто');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('E2E упал:', e.message); process.exit(1); });
