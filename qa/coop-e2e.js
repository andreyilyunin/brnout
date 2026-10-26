#!/usr/bin/env node
// E2E коопа в двух независимых headless-браузерах (анти-троттлинг флаги):
// хост создаёт комнату, гость входит по коду, старт, проверка движения гостя.
'use strict';
const puppeteer = require('puppeteer');
const BASE = process.env.COOP_BASE || 'http://127.0.0.1:8099';
// COOP_BROKER: ws(s)-url локального брокера — детерминированный прогон без публичных брокеров
const BROKER = process.env.COOP_BROKER || '';
const FLAGS = ['--no-sandbox','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding','--disable-background-timer-throttling'];
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  let fails = 0;
  const ok = m => console.log('  ✓ ' + m);
  const fail = m => { console.log('  ✗ ' + m); fails++; };
  const bH = await puppeteer.launch({ executablePath: process.env.QA_CHROME || '/usr/sbin/chromium', args: FLAGS });
  const bG = await puppeteer.launch({ executablePath: process.env.QA_CHROME || '/usr/sbin/chromium', args: FLAGS });
  const h = await (await bH.createBrowserContext()).newPage();
  const g = await (await bG.createBrowserContext()).newPage();
  for (const p of [h, g]) {
    p.on('pageerror', e => fail('JS: ' + String(e).slice(0, 120)));
    await p.setViewport({ width: 900, height: 500 });
  }
  await h.goto(BASE + '/?cooph' + (BROKER ? '&broker=' + encodeURIComponent(BROKER) : ''), { waitUntil: 'domcontentloaded' });
  await g.goto(BASE + '/?coopg', { waitUntil: 'domcontentloaded' });
  if (BROKER) await g.evaluate(b => localStorage.setItem('brnt_broker', b), BROKER); // переживёт переход на ?join=
  await sleep(1500);
  await h.evaluate(() => { document.getElementById('mCoop').click(); document.getElementById('cHost').click(); });
  let code = '';
  for (let i = 0; i < 20; i++) { // публичные брокеры иногда коннектят по 10с+ — ждём честно
    await sleep(1000);
    code = await h.evaluate(() => window.__bo.NET.code);
    if (/^[a-z0-9]{5}$/.test(code)) break;
  }
  if (!/^[a-z0-9]{5}$/.test(code)) { console.log('✗ хост не создал комнату за 20с: ' + await h.evaluate(() => document.getElementById('shareHint').textContent)); process.exit(1); }
  ok('хост: комната ' + code + ' на ' + (await h.evaluate(() => window.__bo.NET.broker)));
  await g.evaluate(c => { location.href = '/?join=' + c; }, code);
  await sleep(2500); // дождаться перехода: контекст страницы пересоздаётся
  await g.evaluate(() => { window.__mqttDbg = []; });
  for (let i = 0; i < 15; i++) { // гость тоже может коннектиться долго
    await sleep(1000);
    const ok = await g.evaluate(() => window.__bo.NET.mode === 'guest' || window.__bo.NET.broker);
    if (ok) break;
  }
  await g.evaluate(() => {
    window.__msgLog = [];
    const og = window.guestOnMsg;
    window.guestOnMsg = d => { window.__msgLog.push(d.t + (d.seed ? ':' + String(d.seed).slice(0, 3) : '')); return og(d); };
  });
  await g.evaluate(() => { document.getElementById('bdsn').click(); document.getElementById('mStart').click(); });
  await sleep(4500);
  const diag = await g.evaluate(() => JSON.stringify({
    mode: window.__bo.NET.mode, started: window.__bo.NET.started, broker: window.__bo.NET.broker,
    status: document.getElementById('netStatus').textContent, err: document.getElementById('joinErr').textContent,
    lobby: document.getElementById('lobbyList2').innerText.replace(/\n/g, ';'),
    waitCode: (document.getElementById('waitCode') || {}).textContent
  }));
  console.log('  гость до старта: ' + diag);
  const hLobby = await h.evaluate(() => document.getElementById('lobbyList').innerText.replace(/\n/g, ';') + ' conns=' + window.__bo.NET.conns.length);
  console.log('  хост до старта: ' + hLobby);
  const gLobby = await g.evaluate(() => document.getElementById('lobbyList2').innerText.replace(/\n/g, ';'));
  if (gLobby.split('●').length - 1 !== 2) fail('в лобби гостя не двое: ' + gLobby);
  else ok('лобби: ' + gLobby);
  // старт хоста
  await h.evaluate(() => document.getElementById('bstart').click());
  await sleep(2500);
  const gs = await g.evaluate(() => JSON.stringify({ state: window.__bo.G.state, vP: window.VIEW.players.length, vM: window.VIEW.mobs.length, recv: Math.round(performance.now() - window.__bo.NET.lastRecv) }));
  console.log('  гость после старта: ' + gs);
  const st = JSON.parse(gs);
  if (st.state !== 'playing' || st.vP < 2) fail('гость не в игре: ' + gs);
  else ok('гость в игре, снапшоты идут (recv ' + st.recv + 'мс)');
  // ДВИЖЕНИЕ гостя: позиция на ХОСТЕ до/после зажатой клавиши на госте
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
  console.log('  гостевой mqtt-журнал: ' + await g.evaluate(() => JSON.stringify((window.__mqttDbg||[]).slice(-24))));
  const [bx, by] = before.split(' ')[0].split(',').map(Number);
  const [ax, ay] = after.split(' ')[0].split(',').map(Number);
  const moved = Math.hypot(ax - bx, ay - by);
  if (moved < 40) fail('ГОСТЬ НЕ ДВИГАЕТСЯ на хосте: ' + before + ' → ' + after + ' (инпут доходит: ' + inFlight + ', дистанция ' + Math.round(moved) + ')');
  else ok('гость двигается на хосте: ' + Math.round(moved) + 'px за 2с (' + inFlight + ')');
  // и гость видит своё новое положение
  const self = await g.evaluate(() => JSON.stringify({
    self: (() => { const b = window.__bo, v = window.VIEW; const me = v.players.find(p => p.id === b.NET.myId); return me ? Math.round(me.x) + ',' + Math.round(me.y) : 'no-me'; })(),
    msgs: window.__msgLog, seed: window.__bo.G.wave
  }));
  console.log('  гость видит себя: ' + self);
  await bH.close(); await bG.close();
  console.log(fails ? 'COOP E2E: ✗ ' + fails : 'COOP E2E: ✓ всё чисто');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('E2E упал:', e.message); process.exit(1); });
