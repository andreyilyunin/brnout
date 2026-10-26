#!/usr/bin/env node
// QA-эксперимент: почему drawLighting жжёт кадр — считаем LIGHTS/дырки за кадр,
// меряем варианты (baseline vs viewport-culling vs полускейл) на живой игре.
'use strict';
const puppeteer = require('puppeteer');
const BASE = 'http://127.0.0.1:8099';

(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/sbin/chromium', headless: 'new', args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 700, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    page.on('pageerror', e => console.log('PAGEERROR:', e.message));
    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__bo && window.G, { timeout: 10000 });
    await page.evaluate(() => { window.__bo.startLocal(); });
    await new Promise(r => setTimeout(r, 5000));

    const facts = await page.evaluate(() => {
      // сколько ламп всего и сколько реально попадает в кадр
      const Wc = cv.width / (DPR * G.zoom), Hc = cv.height / (DPR * G.zoom);
      let inView = 0, inView2x = 0;
      for (const L of LIGHTS) {
        if (L.dead) continue;
        if (L.x > G.camX - 300 && L.x < G.camX + Wc + 300 && L.y > G.camY - 300 && L.y < G.camY + Hc + 300) inView++;
        if (L.x > G.camX - 100 && L.x < G.camX + Wc + 100 && L.y > G.camY - 100 && L.y < G.camY + Hc + 100) inView2x++;
      }
      return { total: LIGHTS.length, dead: LIGHTS.filter(l => l.dead).length, inView, inView2x, zoom: G.zoom, lightCv: [lightCv.width, lightCv.height], mainCv: [cv.width, cv.height] };
    });
    console.log('СВЕТА:', JSON.stringify(facts));

    // === вариант A: baseline (как в игре) ===
    const timeVariant = async (label, patchFn) => {
      await page.evaluate(patchFn);
      await new Promise(r => setTimeout(r, 1500)); // разгон
      const res = await page.evaluate(() => new Promise(resolve => {
        const N = 200; const times = [];
        const orig = window.render;
        let counted = 0;
        const t0 = performance.now();
        // меряем сам drawLighting через обёртку
        const dl = window.drawLighting;
        let acc = 0, n = 0;
        window.drawLighting = function (...a) {
          const s = performance.now();
          try { return dl.apply(this, a); } finally { acc += performance.now() - s; n++; }
        };
        setTimeout(() => { window.drawLighting = dl; resolve({ mean: acc / n, n }); }, 4000);
      }));
      console.log(`${label}: drawLighting mean=${res.mean.toFixed(2)}ms × ${res.n}`);
      return res;
    };

    await timeVariant('A. baseline (все лампы карты)', () => {});

    // === вариант B: culling по видимой области + запас ===
    await timeVariant('B. culling viewport', () => {
      window.drawLighting = function () {
        var sc = 0.5;
        if (lightCv.width !== Math.max(2, Math.round(cv.width * sc)) || lightCv.height !== Math.max(2, Math.round(cv.height * sc))) { lightCv.width = Math.max(2, Math.round(cv.width * sc)); lightCv.height = Math.max(2, Math.round(cv.height * sc)); }
        lctx.setTransform(1, 0, 0, 1, 0, 0);
        lctx.clearRect(0, 0, lightCv.width, lightCv.height);
        lctx.fillStyle = 'rgba(3,6,12,0.45)'; lctx.fillRect(0, 0, lightCv.width, lightCv.height);
        lctx.globalCompositeOperation = 'destination-out';
        lctx.setTransform(DPR * G.zoom * sc, 0, 0, DPR * G.zoom * sc, -G.camX * DPR * G.zoom * sc, -G.camY * DPR * G.zoom * sc);
        function hole(x, y, r, i2) { lctx.globalAlpha = i2; lctx.drawImage(holeCv, x - r, y - r, r * 2, r * 2); lctx.globalAlpha = 1; }
        var i;
        var Wc = cv.width / (DPR * G.zoom), Hc = cv.height / (DPR * G.zoom);
        var M = 320; // запас: радиус дырки ~280
        for (i = 0; i < LIGHTS.length; i++) { var L = LIGHTS[i];
          if (L.dead) continue;
          if (L.x < G.camX - M || L.x > G.camX + Wc + M || L.y < G.camY - M || L.y > G.camY + Hc + M) continue;
          var inten = L.dim * (0.82 + 0.18 * Math.sin(G.t * 7 + L.ph) + 0.08 * Math.sin(G.t * 23 + L.sd * 7));
          if (L.sput > 0) { L.sput -= 1 / 60; inten *= (Math.sin(G.t * 60 + L.sd) > 0 ? 1 : 0.15); }
          else if (R() < 0.0015) L.sput = 0.25 + R() * 0.3;
          if (inten > 0.03) hole(L.x, L.y, 215 * Math.min(1, inten + 0.3), Math.min(1, inten + 0.3));
        }
        var players = worldPool('players');
        for (i = 0; i < players.length; i++) if (!players[i].dead) hole(players[i].x, players[i].y, 230, 0.95);
        if (G.state === 'menu') hole(menuCam.x, menuCam.y, 240, 0.85);
        for (i = 0; i < COFFEES.length; i++) if (COFFEES[i].charges > 0) hole(COFFEES[i].x, COFFEES[i].y, 100, 0.55 + 0.1 * Math.sin(G.t * 3));
        var mobs = worldPool('mobs');
        for (i = 0; i < mobs.length; i++) if (mobs[i].type === 'deadline') hole(mobs[i].x, mobs[i].y, 80, 0.5);
        lctx.globalCompositeOperation = 'source-over';
        applyScreenT();
        ctx.drawImage(lightCv, 0, 0, cv.width / DPR, cv.height / DPR);
      };
    });

    // === вариант C: culling + четверть-скейл буфер (sc=0.25) ===
    await timeVariant('C. culling + sc=0.25', () => {
      var sc2 = 0.25;
      var cv2 = document.createElement('canvas'), cx2 = cv2.getContext('2d');
      var _orig = window.drawLighting;
      window.drawLighting = function () {
        if (cv2.width !== Math.max(2, Math.round(cv.width * sc2)) || cv2.height !== Math.max(2, Math.round(cv.height * sc2))) { cv2.width = Math.max(2, Math.round(cv.width * sc2)); cv2.height = Math.max(2, Math.round(cv.height * sc2)); }
        // используем основной lightCv, но с меньшим буфером нельзя (переиспользуется) — рисуем во временный
        var keep = [lightCv.width, lightCv.height];
        lightCv.width = cv2.width; lightCv.height = cv2.height;
        _orig();
        // вернём размер и результат скопируем не будем — просто мерим время оригинала на мелком буфере
        // (визуал не важен — важен тайминг)
        lightCv.width = keep[0]; lightCv.height = keep[1];
      };
    });

    // восстановить оригинал не нужно — страница живёт в этом контексте до закрытия
  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e); process.exit(1); });
