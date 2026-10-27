#!/usr/bin/env node

'use strict';
const puppeteer = require('puppeteer');

const fs = require('fs');
const CHROME = process.env.QA_CHROME || (fs.existsSync('/usr/sbin/chromium') ? '/usr/sbin/chromium' : undefined);

const BASE = process.env.QA_BASE || 'http://127.0.0.1:8099';
const OUT = __dirname + '/shots';
const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 720, mobile: false },
  { name: 'phone-portrait', width: 390, height: 700, mobile: true },
  { name: 'phone-landscape', width: 740, height: 420, mobile: true },
  { name: 'phone-landscape-max', width: 844, height: 390, mobile: true },
];
const SCENES = ['menu', 'game', 'wave', 'interstitial', 'pause'];

let failures = 0;
const fail = msg => { console.log('  ✗ ' + msg); failures++; };
const ok = msg => console.log('  ✓ ' + msg);

const AUDIT_SRC = () => {
  const els = [];
  const W = innerWidth, H = innerHeight;
  const push = (id, kind, r) => els.push({ id, kind, l: r.left, t: r.top, r: r.right, b: r.bottom });
  for (const b of document.querySelectorAll('.tbtn,#btnPauseM,#btnFS')) {
    if (b.classList.contains('hidden')) continue;
    const r = b.getBoundingClientRect();
    if (r.width < 2) continue;
    if (b.classList.contains('tbtn'))
      els.push({ id: b.id, kind: 'circle', cx: r.x + r.width / 2, cy: r.y + r.height / 2, rad: Math.min(r.width, r.height) / 2, l: r.left, t: r.top, r: r.right, b: r.bottom });
    else push(b.id, 'rect', r);
  }
  for (const ov of document.querySelectorAll('.bgov')) {
    if (ov.classList.contains('bghidden')) continue;
    for (const b of ov.querySelectorAll('button,input,.bgmodebtn,#roomCode')) {
      const r = b.getBoundingClientRect();
      if (r.width < 2) continue;
      push(b.id || ('ov:' + (b.textContent || b.placeholder || '').trim().slice(0, 16)), 'rect', r);
    }
  }
  if (window.__mmRect) push('__mmRect', 'rect', { left: __mmRect.x, top: __mmRect.y, right: __mmRect.x + __mmRect.w, bottom: __mmRect.y + __mmRect.h });
  if (window.__nextBtnRect) push('__nextBtnRect', 'rect', { left: __nextBtnRect.x, top: __nextBtnRect.y, right: __nextBtnRect.x + __nextBtnRect.w, bottom: __nextBtnRect.y + __nextBtnRect.h });
  const out = { outside: [], overlap: [], count: els.length, mm: !!window.__mmRect, W, H };
  const rootR = document.getElementById('burnout').getBoundingClientRect();
  if (rootR.bottom > H + 1 || rootR.top < -1) out.outside.push('игровой контейнер обрезан: ' + Math.round(rootR.top) + '..' + Math.round(rootR.bottom) + ' / ' + H + 'px — кнопки внизу недоступны');
  for (const e of els)
    if (e.l < -1 || e.t < -1 || e.r > W + 1 || e.b > H + 1) out.outside.push(e.id + ' за экраном (' + Math.round(e.l) + ',' + Math.round(e.t) + ',' + Math.round(e.r) + ',' + Math.round(e.b) + ' / ' + W + 'x' + H + ')');
  const contains = (p, q) => p.l <= q.l && p.t <= q.t && p.r >= q.r && p.b >= q.b;
  for (let i = 0; i < els.length; i++)
    for (let j = i + 1; j < els.length; j++) {
      const a = els[i], b2 = els[j];
      if (contains(a, b2) || contains(b2, a)) continue;
      let hit = false;
      if (a.kind === 'circle' && b2.kind === 'circle')
        hit = Math.hypot(a.cx - b2.cx, a.cy - b2.cy) < a.rad + b2.rad + 2;
      else if (a.kind === 'circle' || b2.kind === 'circle') {
        const c = a.kind === 'circle' ? a : b2, q = a.kind === 'circle' ? b2 : a;
        const nx = Math.max(q.l, Math.min(c.cx, q.r)), ny = Math.max(q.t, Math.min(c.cy, q.b));
        hit = Math.hypot(c.cx - nx, c.cy - ny) < c.rad + 2;
      } else {
        const x = Math.min(a.r, b2.r) - Math.max(a.l, b2.l), y = Math.min(a.b, b2.b) - Math.max(a.t, b2.t);
        hit = x > 4 && y > 4;
      }
      if (hit) out.overlap.push(a.id + ' × ' + b2.id);
    }
  return out;
};
async function auditLayout(page, scene, need) {
  const res = await page.evaluate(AUDIT_SRC);
  if (res.outside.length) fail('[' + scene + '] ' + res.outside.join('; '));
  else ok('[' + scene + '] все ' + res.count + ' элементов внутри экрана');
  if (res.overlap.length) fail('[' + scene + '] наезды: ' + res.overlap.join('; '));
  else ok('[' + scene + '] наездов нет');
  if (need === 'mm' && !res.mm) fail('[' + scene + '] миникарта отсутствует (__mmRect не создан)');
}

(async () => {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: CHROME, args: ['--no-sandbox'] });

  for (const vp of VIEWPORTS) {
    console.log('\n[' + vp.name + ' ' + vp.width + 'x' + vp.height + ']');
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height, isMobile: vp.mobile, hasTouch: vp.mobile });
    const pageErrors = [];
    page.on('pageerror', e => pageErrors.push(String(e).slice(0, 120)));

    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1200));
    await page.screenshot({ path: OUT + '/' + vp.name + '-menu.png' });
    await auditLayout(page, 'menu');

    await page.evaluate(() => { document.getElementById('mStart').click(); });
    await new Promise(r => setTimeout(r, 1800));
    const gameState = await page.evaluate(() => window.G ? G.state : 'no-G');
    if (gameState !== 'playing') fail('после старта state=' + gameState + ' (ожидался playing)');
    else ok('игра запустилась');
    await page.screenshot({ path: OUT + '/' + vp.name + '-game.png' });
    await auditLayout(page, 'game', 'mm');

    await page.evaluate(() => {
      G.waveState = 'active'; G.wave = 2; startWave();
      const p = G.players[0]; p.inv = 999; p.burnout = 5;
    });
    await new Promise(r => setTimeout(r, 2500));
    await page.screenshot({ path: OUT + '/' + vp.name + '-wave.png' });
    await auditLayout(page, 'wave', 'mm');
    const hudInfo = await page.evaluate(() => window.__hudInfo);
    if (!hudInfo || hudInfo.wave < 1) fail('счётчик спринта не экспортирован (__hudInfo)');
    else if (!(hudInfo.remain > 0)) fail('счётчик врагов пуст в бою: remain=' + hudInfo.remain);
    else ok('счётчик спринт/врагов на месте: спринт ' + hudInfo.wave + ', врагов ' + hudInfo.remain);

    if (vp.mobile) {
      const overlap = await page.evaluate(() => {
        enableTouch();

        const btns = [...document.querySelectorAll('.tbtn')]
          .filter(b => !b.classList.contains('hidden'))
          .map(b => { const r = b.getBoundingClientRect();
            return { id: b.id, cx: r.x + r.width / 2, cy: r.y + r.height / 2, rad: Math.min(r.width, r.height) / 2 }; });
        for (let i = 0; i < btns.length; i++)
          for (let j = i + 1; j < btns.length; j++) {
            const a = btns[i], b = btns[j];
            const d = Math.hypot(a.cx - b.cx, a.cy - b.cy);
            if (d < a.rad + b.rad + 2) return btns[i].id + ' × ' + btns[j].id + ' (d=' + d.toFixed(0) + ')';
          }
        return null;
      });
      if (overlap) fail('кнопки пересекаются: ' + overlap);
      else ok('тач-кнопки не пересекаются');
      const inside = await page.evaluate(() => {
        const r = document.getElementById('burnout').getBoundingClientRect();
        const out = [];
        for (const b of document.querySelectorAll('.tbtn')) {
          if (b.classList.contains('hidden')) continue;
          const t = b.getBoundingClientRect();
          if (t.top < r.top || t.bottom > r.bottom || t.left < r.left || t.right > r.right)
            out.push(b.id + ' вылезает за экран');
        }
        return out;
      });
      if (inside.length) fail(inside.join(', '));
      else ok('все тач-кнопки внутри экрана');
    }

    await page.evaluate(() => {
      G.mobs.length = 0; G.spawnQ.length = 0; G.boss = null;
      G.interStats = { w: 2, ki: 9, kd: 3, okr: 4, co: 120 };
      G.nextTheme = 'Ретро-архив';
    });
    await new Promise(r => setTimeout(r, 900));
    await page.screenshot({ path: OUT + '/' + vp.name + '-interstitial.png' });
    await auditLayout(page, 'interstitial', 'mm');
    const btnRect = await page.evaluate(() => window.__nextBtnRect ? 1 : 0);
    if (!btnRect) fail('хит-зона кнопки следующего спринта не создана');
    else ok('кнопка следующего спринта отрисована');
    const interRect = await page.evaluate(() => window.__interRect);
    if (!interRect) fail('итоговая статистика спринта не отрисована (__interRect)');
    else ok('итоги спринта на месте (' + Math.round(interRect.w) + 'x' + Math.round(interRect.h) + ')');

    await page.evaluate(() => { G.waveState = 'calm'; G.waveT = 9; togglePause(); });
    await new Promise(r => setTimeout(r, 400));
    await page.screenshot({ path: OUT + '/' + vp.name + '-pause.png' });
    await auditLayout(page, 'pause');
    const paused = await page.evaluate(() => G.state);
    if (paused !== 'paused') fail('пауза не открылась: ' + paused);
    else ok('пауза работает');

    if (pageErrors.length) fail('JS-ошибки: ' + pageErrors.slice(0, 3).join(' | '));
    else ok('JS-ошибок нет');
    await page.close();
  }

  await browser.close();
  const total = VIEWPORTS.length * SCENES.length;
  console.log('\nскриншотов: ' + total + ' → ' + OUT);
  if (failures) { console.log('QA: ✗ ' + failures + ' проблем'); process.exit(1); }
  console.log('QA: ✓ всё чисто');
})().catch(e => { console.error('QA упал:', e); process.exit(1); });
