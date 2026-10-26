#!/usr/bin/env node
// QA: сравнение вариантов drawLighting на живой игре (390×700, canvas ~1960×3516,
// как на реальном телефоне без meta viewport) + скриншот для проверки UI-скейла.
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
    await page.screenshot({ path: 'qa/perf-phone-nometa.png' });

    const DL_SRC = (sc, useBaked) => {
      // полностью автономная копия drawLighting с параметрами: масштаб буфера,
      // опционально «запечённые» статические дырки (обновляются раз в 0.5с).
      window.__bakeCv = window.__bakeCv || null;
      window.__bakeT = -1;
      window.drawLighting = function () {
        var W = Math.max(2, Math.round(cv.width * sc)), H = Math.max(2, Math.round(cv.height * sc));
        if (lightCv.width !== W || lightCv.height !== H) { lightCv.width = W; lightCv.height = H; }
        lctx.setTransform(1, 0, 0, 1, 0, 0);
        lctx.clearRect(0, 0, W, H);
        lctx.fillStyle = 'rgba(3,6,12,0.45)'; lctx.fillRect(0, 0, W, H);
        lctx.globalCompositeOperation = 'destination-out';
        lctx.setTransform(DPR * G.zoom * sc, 0, 0, DPR * G.zoom * sc, -G.camX * DPR * G.zoom * sc, -G.camY * DPR * G.zoom * sc);
        function hole(x, y, r, i2) { lctx.globalAlpha = i2; lctx.drawImage(holeCv, x - r, y - r, r * 2, r * 2); lctx.globalAlpha = 1; }
        var i;
        if (!useBaked) {
          for (i = 0; i < LIGHTS.length; i++) { var L = LIGHTS[i];
            if (L.dead) continue;
            var inten = L.dim * (0.82 + 0.18 * Math.sin(G.t * 7 + L.ph) + 0.08 * Math.sin(G.t * 23 + L.sd * 7));
            if (L.sput > 0) { L.sput -= 1 / 60; inten *= (Math.sin(G.t * 60 + L.sd) > 0 ? 1 : 0.15); }
            else if (R() < 0.0015) L.sput = 0.25 + R() * 0.3;
            if (inten > 0.03) hole(L.x, L.y, 215 * Math.min(1, inten + 0.3), Math.min(1, inten + 0.3));
          }
        } else {
          // статические лампы — один слой, перерисовывается редко (мерцание жертвуем)
          if (!window.__bakeCv) { window.__bakeCv = document.createElement('canvas'); }
          var bc = window.__bakeCv, bx = bc.getContext('2d');
          var BW = Math.max(2, Math.round(MAP_W * sc * 0.25)), BH = Math.max(2, Math.round(MAP_H * sc * 0.25));
          if (bc.width !== BW || bc.height !== BH) { bc.width = BW; bc.height = BH; window.__bakeT = -1; }
          if (G.t - window.__bakeT > 0.5) {
            window.__bakeT = G.t;
            bx.setTransform(1, 0, 0, 1, 0, 0);
            bx.clearRect(0, 0, BW, BH);
            bx.globalCompositeOperation = 'source-over';
            bx.setTransform(sc * 0.25, 0, 0, sc * 0.25, 0, 0);
            for (i = 0; i < LIGHTS.length; i++) { var L2 = LIGHTS[i];
              if (L2.dead) continue;
              var it2 = L2.dim;
              if (it2 > 0.03) { bx.globalAlpha = Math.min(1, it2 + 0.3); bx.drawImage(holeCv, L2.x - 215, L2.y - 215, 430, 430); }
            }
            bx.globalAlpha = 1;
          }
          var Wc = cv.width / (DPR * G.zoom), Hc = cv.height / (DPR * G.zoom);
          lctx.drawImage(bc, 0, 0, MAP_W, MAP_H); // весь запечённый слой одной quad-командой
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
    };

    const measure = async (label) => {
      await new Promise(r => setTimeout(r, 1200));
      const res = await page.evaluate(() => new Promise(resolve => {
        const dl = window.drawLighting;
        let acc = 0, n = 0;
        window.drawLighting = function (...a) {
          const s = performance.now();
          try { return dl.apply(this, a); } finally { acc += performance.now() - s; n++; }
        };
        setTimeout(() => { window.drawLighting = dl; resolve({ mean: acc / n, n }); }, 3000);
      }));
      console.log(`${label}: drawLighting mean=${res.mean.toFixed(2)}ms × ${res.n}`);
    };

    await measure('A. baseline sc=0.5, все лампы каждый кадр     ');
    await page.evaluate(DL_SRC, 0.5, false); await measure('B. sc=0.5 (контроль копии функции)         ');
    await page.evaluate(DL_SRC, 0.25, false); await measure('C. sc=0.25, все лампы                      ');
    await page.evaluate(DL_SRC, 0.5, true); await measure('D. sc=0.5 + запечённые лампы (ре-бейк 0.5с)');
    await page.evaluate(DL_SRC, 0.25, true); await measure('E. sc=0.25 + запечённые лампы              ');
    await page.screenshot({ path: 'qa/perf-phone-baked.png' });
  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e); process.exit(1); });
