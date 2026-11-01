#!/usr/bin/env node

'use strict';
const puppeteer = require('puppeteer');
const fs = require('fs');
const CHROME = process.env.QA_CHROME || (fs.existsSync('/usr/sbin/chromium') ? '/usr/sbin/chromium' : undefined);
const BASE = process.env.QA_BASE || 'http://127.0.0.1:8099';
const OUT = __dirname + '/shots';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CASES = [
  { type: 'audit', wave: 5 },
  { type: 'review', wave: 5 },
  { type: 'pub', wave: 5 },
  { type: 'release', wave: 10, seed: 42 }
];

let failures = 0;
const fail = msg => { console.log('  ✗ ' + msg); failures++; };
const ok = msg => console.log('  ✓ ' + msg);

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: CHROME, args: ['--no-sandbox'] });

  for (const c of CASES) {
    console.log('\n[' + c.type + ' · спринт ' + c.wave + ']');
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    const pageErrors = [];
    page.on('pageerror', e => pageErrors.push(String(e).slice(0, 120)));
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(1000);

    const seed = c.seed || await page.evaluate((want, wave) => {
      for (let s = 1; s < 500; s++) {
        buildMap(s);
        if (pickSpecial(wave).id === want) return s;
      }
      return 0;
    }, c.type, c.wave);
    if (!seed) fail('нет сида для особого спринта ' + c.type);
    else ok('сид выбора: ' + seed);

    await page.evaluate((s, wave) => {
      CAREER.tutorialDone = 1;
      startLocal();
      G.training = false;
      G.wave = wave - 1;
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
    }, seed, c.wave);
    await page.evaluate(() => {
      const hint = document.getElementById('deskHint');
      if (hint) hint.classList.add('hidden');
      const target = G.boss || G.mobs[0];
      if (target) {
        const p = G.players[0];
        p.x = target.x + 130;
        p.y = target.y;
        p.inv = 999;
        if (G.boss) G.fx.push({ type: 'stamp', x: target.x, y: target.y, rad: 180, t: 0, life: 5 });
        computeVis(p.x, p.y);
        FOG.dirty = true;
        updateCamera(0.016, true);
      }
    });
    await sleep(250);
    await page.screenshot({ path: OUT + '/special-' + c.type + '.png' });

    const info = await page.evaluate(() => ({
      special: G.special,
      boss: !!G.boss,
      bossKind: G.boss ? G.boss.kind : null,
      bossHp: G.boss ? G.boss.hp : 0,
      mobs: G.mobs.length,
      roles: G.mobs.reduce((a, m) => { a[m.type] = (a[m.type] || 0) + 1; return a; }, {}),
      theme: MAPTHEME.name,
      pubTheme: !!MAPTHEME.pub,
      hud: window.__hudInfo,
      msg: G.msg
    }));
    if (info.special !== c.type) fail('спринт=' + info.special + ', ожидался ' + c.type);
    else ok('тип спринта в игре: ' + info.special);
    if (!info.hud || info.hud.wave !== c.wave) fail('HUD не на спринте ' + c.wave + ': ' + JSON.stringify(info.hud));
    else ok('HUD: спринт ' + c.wave + ', целей ' + info.hud.remain);

    if (c.type === 'audit' || c.type === 'release') {
      if (!info.boss || info.bossHp <= 0) fail(c.type + ' без живого босса');
      else ok(c.type + ': босс ' + (info.bossKind || 'audit') + ', ' + Math.round(info.bossHp) + ' HP плюс ' + info.mobs + ' обычных целей');
      if (c.type === 'release' && info.bossKind !== 'release') fail('финальный босс не помечен как release');
    } else {
      if (info.boss) fail(c.type + ' не должен спавнить босса');
      else ok(c.type + ': босса нет, роли ' + JSON.stringify(info.roles));
    }
    if (c.type === 'pub' && !info.pubTheme) fail('паб-спринт не переключил тему паба: ' + info.theme);
    if (c.type === 'pub' && info.pubTheme) ok('локация: «' + info.theme + '»');

    await page.evaluate(() => {
      for (const m of G.mobs.slice()) damageMob(m, 1e9);
      if (G.boss) damageMob(G.boss, 1e9);
      G.spawnQ.length = 0;
      G.perkQueue = 0;
      showOv(null);
    });
    await sleep(300);
    const cleared = await page.evaluate(() => ({ state: G.waveState, winT: G.winT, stats: G.interStats }));
    if (cleared.state !== 'cleared') fail(c.type + ' не завершается: ' + JSON.stringify(cleared));
    else ok(c.type + ' завершён, итоги: ' + JSON.stringify(cleared.stats));

    await page.evaluate(() => { G.winShown = true; G.winT = 0.01; });
    await sleep(200);
    const win = await page.evaluate(() => ({ state: G.state, title: document.getElementById('winTitle').textContent, tag: document.getElementById('winTag').textContent }));
    if (win.state !== 'win' || win.title !== 'ПРОЕКТ ЗАВЕРШЁН') fail('финальный экран: ' + JSON.stringify(win));
    else ok('финальный экран: «' + win.title + '» / ' + win.tag);

    if (pageErrors.length) fail('JS-ошибки: ' + pageErrors.slice(0, 3).join(' | '));
    else ok('JS-ошибок нет');
    await page.close();
  }

  await browser.close();
  console.log('\nскриншотов: 4 → ' + OUT);
  if (failures) { console.log('SPECIALS QA: ✗ ' + failures + ' проблем'); process.exit(1); }
  console.log('SPECIALS QA: ✓ всё чисто');
})().catch(e => { console.error('QA упал:', e); process.exit(1); });
