#!/usr/bin/env node

'use strict';
const puppeteer = require('puppeteer');
const fs = require('fs');
const CHROME = process.env.QA_CHROME || (fs.existsSync('/usr/sbin/chromium') ? '/usr/sbin/chromium' : undefined);
const BASE = process.env.QA_BASE || 'http://127.0.0.1:8099';
const OUT = __dirname + '/shots';
const sleep = ms => new Promise(r => setTimeout(r, ms));

let failures = 0;
const fail = msg => { console.log('  ✗ ' + msg); failures++; };
const ok = msg => console.log('  ✓ ' + msg);

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: CHROME, args: ['--no-sandbox'] });

  for (const type of ['audit', 'review', 'pub']) {
    console.log('\n[' + type + ']');
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    const pageErrors = [];
    page.on('pageerror', e => pageErrors.push(String(e).slice(0, 120)));
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(1000);

    const seed = await page.evaluate(want => {
      for (let s = 1; s < 500; s++) {
        buildMap(s);
        if (pickSpecial(5).id === want) return s;
      }
      return 0;
    }, type);
    if (!seed) fail('нет сида для особого спринта ' + type);
    else ok('сид выбора: ' + seed);

    await page.evaluate(s => {
      CAREER.tutorialDone = 1;
      startLocal();
      G.training = false;
      G.wave = 4;
      G.waveState = 'active';
      regenLocation(s);
      G.waveState = 'active';
      G.spawnQ.length = 0;
      G.mobs.length = 0;
      G.boss = null;
      G.special = null;
      G.campaign = 10;
      startWave();
      while (G.spawnQ.length) spawnMob(G.spawnQ.shift());
      for (const p of G.players) { p.inv = 999; p.burnout = 5; p.dead = false; }
    }, seed);
    await page.evaluate(() => {
      const hint = document.getElementById('deskHint');
      if (hint) hint.classList.add('hidden');
      const target = G.boss || G.mobs[0];
      if (target) {
        const p = G.players[0];
        p.x = target.x + 130;
        p.y = target.y;
        p.inv = 999;
        computeVis(p.x, p.y);
        FOG.dirty = true;
        updateCamera(0.016, true);
      }
    });
    await sleep(250);
    await page.screenshot({ path: OUT + '/special-' + type + '.png' });

    const info = await page.evaluate(() => ({
      special: G.special,
      boss: !!G.boss,
      bossHp: G.boss ? G.boss.hp : 0,
      mobs: G.mobs.length,
      roles: G.mobs.reduce((a, m) => { a[m.type] = (a[m.type] || 0) + 1; return a; }, {}),
      theme: MAPTHEME.name,
      pubTheme: !!MAPTHEME.pub,
      hud: window.__hudInfo,
      msg: G.msg
    }));
    if (info.special !== type) fail('спринт=' + info.special + ', ожидался ' + type);
    else ok('тип спринта в игре: ' + info.special);
    if (!info.hud || info.hud.wave !== 5) fail('HUD не на 5-м спринте: ' + JSON.stringify(info.hud));
    else ok('HUD: спринт 5, целей ' + info.hud.remain);

    if (type === 'audit') {
      if (!info.boss || info.bossHp <= 0) fail('аудит без живого босса');
      else ok('аудит: босс ' + Math.round(info.bossHp) + ' HP плюс ' + info.mobs + ' обычных целей');
    } else {
      if (info.boss) fail(type + ' не должен спавнить босса');
      else ok(type + ': босса нет, роли ' + JSON.stringify(info.roles));
    }
    if (type === 'pub' && !info.pubTheme) fail('паб-спринт не переключил тему паба: ' + info.theme);
    if (type === 'pub' && info.pubTheme) ok('локация: «' + info.theme + '»');

    await page.evaluate(() => {
      for (const m of G.mobs.slice()) damageMob(m, 1e9);
      if (G.boss) damageMob(G.boss, 1e9);
      G.spawnQ.length = 0;
      G.perkQueue = 0;
      showOv(null);
    });
    await sleep(300);
    const cleared = await page.evaluate(() => ({ state: G.waveState, winT: G.winT, stats: G.interStats }));
    if (cleared.state !== 'cleared') fail(type + ' не завершается: ' + JSON.stringify(cleared));
    else ok(type + ' завершён, итоги: ' + JSON.stringify(cleared.stats));

    if (pageErrors.length) fail('JS-ошибки: ' + pageErrors.slice(0, 3).join(' | '));
    else ok('JS-ошибок нет');
    await page.close();
  }

  await browser.close();
  console.log('\nскриншотов: 3 → ' + OUT);
  if (failures) { console.log('SPECIALS QA: ✗ ' + failures + ' проблем'); process.exit(1); }
  console.log('SPECIALS QA: ✓ всё чисто');
})().catch(e => { console.error('QA упал:', e); process.exit(1); });
