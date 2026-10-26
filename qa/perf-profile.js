#!/usr/bin/env node
// QA: профилирование кадров — какой этап конвейера жжёт CPU.
// Сценарии: menu / battle. Замер через performance.now() вокруг этапов
// render/update (JS-время), плюс итоговое rAF-время кадра.
'use strict';
const puppeteer = require('puppeteer');
// хром: приоритет QA_CHROME; на CI работает дефолтный кэш puppeteer,
// локально кэш бывает пуст — тогда системный chromium, если он есть
const fs = require('fs');
const CHROME = process.env.QA_CHROME || (fs.existsSync('/usr/sbin/chromium') ? '/usr/sbin/chromium' : undefined);

const BASE = process.env.QA_BASE || 'http://127.0.0.1:8099';

// обёртка-инжект: патчим функции под таймеры, копим статистику в __prof
const INJECT = () => {
  const stages = ['update','updateCamera','drawWorld','drawChaos','drawFog','drawLighting','drawPost','drawSouls','drawHUD','drawMinimap'];
  window.__prof = { acc: {}, n: 0, frames: [], raf: [] };
  for (const s of stages) window.__prof.acc[s] = [0, 0]; // [sum, count]
  const wrap = (obj, name) => {
    const orig = obj[name];
    if (typeof orig !== 'function') return;
    obj[name] = function (...args) {
      const t0 = performance.now();
      try { return orig.apply(this, args); }
      finally {
        const d = performance.now() - t0;
        const a = window.__prof.acc[name];
        a[0] += d; a[1]++;
      }
    };
  };
  wrap(window, 'update');
  wrap(window, 'updateCamera');
  wrap(window, 'drawWorld');
  wrap(window, 'drawChaos');
  wrap(window, 'drawFog');
  wrap(window, 'drawLighting');
  wrap(window, 'drawPost');
  wrap(window, 'drawSouls');
  wrap(window, 'drawHUD');
  wrap(window, 'drawMinimap');
  // rAF-тайминг: длина кадра глазами браузера (включая compositor-долю)
  let last = performance.now();
  const rafLoop = (ts) => {
    window.__prof.raf.push(ts - last);
    last = ts;
    requestAnimationFrame(rafLoop);
  };
  requestAnimationFrame(rafLoop);
  // полный кадр: патчим render целиком
  const origRender = window.render;
  window.render = function (...args) {
    const t0 = performance.now();
    try { return origRender.apply(this, args); }
    finally { window.__prof.frames.push(performance.now() - t0); }
  };
};

const stats = (arr) => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const sum = s.reduce((a, b) => a + b, 0);
  return { n: s.length, mean: sum / s.length, p50: s[(s.length / 2) | 0], p95: s[(s.length * 0.95) | 0], max: s[s.length - 1] };
};

async function profileScene(page, scene, label) {
  // (пере)загрузка страницы и запуск сцены
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__bo && window.G, { timeout: 10000 });
  if (scene === 'battle') {
    await page.evaluate(() => { window.__bo.startLocal(); });
    // прогрев: добиваемся активного спринта с мобами
    await new Promise(r => setTimeout(r, 6000));
  } else {
    await new Promise(r => setTimeout(r, 3000));
  }
  await page.evaluate(INJECT);
  const dur = scene === 'battle' ? 8000 : 5000;
  await new Promise(r => setTimeout(r, dur));
  const out = await page.evaluate(() => {
    const bo = window.__bo;
    return {
      counts: {
        mobs: bo.G.mobs.length,
        players: bo.G.players.length,
        projs: bo.G.projs.length,
        fx: bo.G.fx.length,
        obst: bo.obst().length,
        furn: bo.furn().length,
        pfx: bo.pfx().length,
        debris: bo.debris().length,
      },
      acc: window.__prof.acc,
      frames: window.__prof.frames,
      raf: window.__prof.raf,
      state: window.G.state,
      wave: window.G.wave,
    };
  });
  const st = stats(out.frames);
  const rafSt = stats(out.raf.slice(2));
  console.log(`\n=== ${label} (state=${out.state}, wave=${out.wave}, mobs=${out.counts.mobs}, fx=${out.counts.fx}) ===`);
  console.log(`render() JS: n=${st.n} mean=${st.mean.toFixed(2)}ms p50=${st.p50.toFixed(2)} p95=${st.p95.toFixed(2)} max=${st.max.toFixed(2)}`);
  if (rafSt) console.log(`кадр (rAF delta): mean=${rafSt.mean.toFixed(2)}ms p95=${rafSt.p95.toFixed(2)} (=${(1000/rafSt.mean).toFixed(0)}fps avg)`);
  console.log(`объекты: OBST=${out.counts.obst} FURN=${out.counts.furn} DEBRIS=${out.counts.debris} PFX=${out.counts.pfx}`);
  const rows = Object.entries(out.acc).filter(([, v]) => v[1] > 0)
    .map(([k, v]) => [k, v[0] / v[1], v[1]])
    .sort((a, b) => b[1] - a[1]);
  for (const [name, mean, n] of rows) console.log(`  ${name.padEnd(14)} ${mean.toFixed(3).padStart(8)} ms/вызов × ${n}`);
  return out;
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--enable-gpu-rasterization'] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 2 });
    page.on('pageerror', e => console.log('PAGEERROR:', e.message));
    await profileScene(page, 'menu', 'МЕНЮ 1280×720 @2x');
    await profileScene(page, 'battle', 'БОЙ 1280×720 @2x');
    // телефонный вьюпорт: айфон X ~ 375×812 @3x (DPR у нас capped 2)
    const page2 = await browser.newPage();
    await page2.setViewport({ width: 390, height: 700, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    page2.on('pageerror', e => console.log('PAGEERROR:', e.message));
    await page2.goto(BASE, { waitUntil: 'load' });
    await page2.waitForFunction(() => window.__bo && window.G);
    await page2.evaluate(() => { window.__bo.startLocal(); });
    await new Promise(r => setTimeout(r, 6000));
    await page2.evaluate(INJECT);
    await new Promise(r => setTimeout(r, 8000));
    const out = await page2.evaluate(() => ({
      counts: { mobs: window.__bo.G.mobs.length, fx: window.G.fx.length },
      acc: window.__prof.acc, frames: window.__prof.frames, raf: window.__prof.raf,
      state: window.G.state, wave: window.G.wave,
    }));
    const st = stats(out.frames); const rafSt = stats(out.raf.slice(2));
    console.log(`\n=== БОЙ-ТАЧ 390×700 @2x (state=${out.state}, wave=${out.wave}, mobs=${out.counts.mobs}) ===`);
    console.log(`render() JS: mean=${st.mean.toFixed(2)}ms p50=${st.p50.toFixed(2)} p95=${st.p95.toFixed(2)}`);
    if (rafSt) console.log(`кадр: mean=${rafSt.mean.toFixed(2)}ms p95=${rafSt.p95.toFixed(2)}`);
    for (const [name, mean, n] of Object.entries(out.acc).filter(([, v]) => v[1] > 0)
      .map(([k, v]) => [k, v[0] / v[1], v[1]]).sort((a, b) => b[1] - a[1]))
      console.log(`  ${name.padEnd(14)} ${mean.toFixed(3).padStart(8)} ms/вызов × ${n}`);
  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e); process.exit(1); });
