'use strict';
const { load } = require('./stub');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log('  ✓', name); passed++; }
  catch (e) { console.error('  ✗', name, '\n    ', e.message); failed++; }
}
function eq(a, b, msg) { if (a !== b) throw new Error((msg || '') + ' expected ' + JSON.stringify(b) + ' got ' + JSON.stringify(a)); }
function ok(v, msg) { if (!v) throw new Error(msg || 'expected truthy'); }

load('src/utils.js');
load('src/events.js');
console.log('utils:');
test('clamp', () => { eq(clamp(5, 0, 3), 3); eq(clamp(-1, 0, 3), 0); eq(clamp(2, 0, 3), 2); });
test('dist/angTo', () => {
  eq(dist({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);
  eq(Math.round(angTo({ x: 0, y: 0 }, { x: 1, y: 0 })), 0);
});
test('angDiff зацикливание', () => {
  eq(Math.abs(angDiff(Math.PI * 1.9, -Math.PI * 1.9)) < 0.7, true);
});
test('LCG rnd детерминирован', () => {
  _seed = 42; const a = rnd(); _seed = 42; const b = rnd();
  eq(a, b);
});

load('src/data.js');
console.log('data:');
test('CLS: 4 класса × 4 приёма с именами и кулдаунами', () => {
  const need = ['mgr', 'dev', 'mkt', 'dsn'];
  eq(Object.keys(CLS).length, 4);
  for (const c of need)
    for (const s of ['s1', 's2', 'ult', 'sk'])
      ok(CLS[c][s].n && CLS[c][s].cd > 0, c + '.' + s);
});
test('dsn sk: логотип побольше — волна-отброс вместо рывка (дублировал общий уворот)', () => {
  eq(CLS.dsn.sk.n, 'логотип побольше');
  ok(CLS.dsn.sk.d.includes('отбрасывает'));
  const ab = require('fs').readFileSync('src/abilities.js', 'utf8');
  ok(!ab.includes('пиксель-перфект'), 'старый рывок удалён');
  ok(ab.includes('ЛОГОТИП ПОБОЛЬШЕ'), 'волна реализована в trySkill2');
});
test('COMBONAMES покрывает все уровни комбо', () => {
  eq(COMBONAMES.length, 10);
  ok(COMBONAMES[9].length > 3);
});
test('PROG: 8 тактов гармонии с войсингами', () => {
  eq(PROG.length, 8);
  for (const ch of PROG) { eq(ch[1].length, 4); }
});
test('MEL: ноты в разумном диапазоне midi', () => {
  for (const n of MEL) { ok(n[2] >= 55 && n[2] <= 100, 'midi ' + n[2]); ok(n[3] > 0); }
});
test('MOBNAMES непустые', () => {
  ok(MOBNAMES.intern.length >= 4);
  ok(MOBNAMES.deadline.length >= 3);
});

load('src/map.js');
console.log('map:');
test('buildMap детерминирован по сиду', () => {
  buildMap(12345);
  const r1 = JSON.stringify(ROOMS) + JSON.stringify(WALLS.map(w => [w.x, w.y, w.w, w.h, w.dir]));
  buildMap(12345);
  const r2 = JSON.stringify(ROOMS) + JSON.stringify(WALLS.map(w => [w.x, w.y, w.w, w.h, w.dir]));
  eq(r1, r2);
});
test('карта квадратная', () => {
  eq(GW, GH);
  eq(MAP_W, MAP_H);
});
test('кофе-машины: не больше двух на карту', () => {
  for (let s = 1; s <= 30; s++) {
    buildMap(s * 7919);
    ok(COFFEES.length >= 1 && COFFEES.length <= 2, 'coffee=' + COFFEES.length);
  }
});
test('спавны и кофе досягаемы на 100 сидах', () => {
  let bad = 0;
  for (let s = 1; s <= 100; s++) {
    buildMap(s * 7919 + 13);
    for (const sp of SPAWNS) if (!reachOK(sp.x, sp.y) || blockedAt(sp.x, sp.y, 16)) bad++;
    for (const cf of COFFEES) if (!reachOK(cf.x, cf.y) || blockedAt(cf.x, cf.y, 16)) bad++;
  }
  eq(bad, 0);
});
test('мебель не запечатывает комнаты (двери свободны) на 100 сидах', () => {
  let sealed = 0;
  for (let s = 1; s <= 100; s++) {
    buildMap(s * 7919 + 13);
    for (const rm of ROOMS) {
      let free = 0;
      for (let ty = rm.ty; ty < rm.ty + rm.th && !free; ty++)
        for (let tx = rm.tx; tx < rm.tx + rm.tw; tx++)
          if (REACH[tx + ty * GW]) { free = 1; break; }
      if (!free) sealed++;
    }
  }
  eq(sealed, 0);
});
test('связность: 0 изолированных комнат на 300 сидах', () => {
  let bad = 0;
  for (let s = 1; s <= 300; s++) {
    buildMap(s * 7919 + 13);
    bad += unreachableRooms().length;
  }
  eq(bad, 0);
});
test('мебель без наложений на 100 сидах', () => {
  let overlaps = 0;
  for (let s = 1; s <= 100; s++) {
    buildMap(s * 104729);
    for (let a = 0; a < FURN.length; a++)
      for (let b = a + 1; b < FURN.length; b++) {
        const A = FURN[a], B = FURN[b];
        if (A.x < B.x + B.w && A.x + A.w > B.x && A.y < B.y + B.h && A.y + A.h > B.y) overlaps++;
      }
  }
  eq(overlaps, 0);
});
test('мебель внутри своих комнат', () => {
  for (let s = 1; s <= 50; s++) {
    buildMap(s * 31);
    for (const f of FURN) {
      const inRoom = ROOMS.some(r => f.x >= r.x && f.y >= r.y && f.x + f.w <= r.x + r.w && f.y + f.h <= r.y + r.h);
      ok(inRoom, f.t + ' вне комнаты');
    }
  }
});
test('стены тонкие: полосы 26px', () => {
  buildMap(7);
  ok(WALLS.length > 50);
  for (const w of WALLS) ok(w.w === 26 || w.h === 26, 'толщина ' + w.w + 'x' + w.h);
});
test('стены не перекрывают пол', () => {
  buildMap(7);
  for (const w of WALLS) {
    const ti = Math.floor((w.x + (w.w > w.h ? 13 : w.w / 2)) / TILE);
    const tj = Math.floor((w.y + (w.h > w.w ? 13 : w.h / 2)) / TILE);
    eq(grid[tj][ti], 0, 'пол под стеной');
  }
});
test('спавн-точки на открытом полу', () => {
  for (let s = 1; s <= 40; s++) {
    buildMap(s * 13);
    ok(SPAWNS.length >= 3);
    for (const sp of SPAWNS) ok(!blockedAt(sp.x, sp.y, 16), 'спавн в стене');
  }
});

load('src/data.js');
console.log('locations & style:');
test('карта: 44x44 (залы 11-14, боксы с 2-тайловыми проходами)', () => { eq(GW, 44); eq(GH, 44); });
test('THEMES: 5 непохожих стилей', () => {
  eq(THEMES.length, 5);
  const names = new Set(THEMES.map(t => t.name));
  eq(names.size, 5);
  for (const th of THEMES) ok(th.floor && th.lamp && th.lampCold && th.screen && th.steel, 'поля темы (живой свет)');
});
test('темы ротируются по сидам (>=4 разных на 15 сидов)', () => {
  const seen = new Set();
  for (let s = 1; s <= 15; s++) { buildMap(s * 31337); seen.add(MAPTHEME.name); }
  ok(seen.size >= 4, 'тем: ' + seen.size);
});
test('открытость: коридоров < 50% пола (20 сидов)', () => {
  for (let s = 1; s <= 20; s++) {
    buildMap(s * 777);
    let floor = 0, corr = 0;
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
      if (grid[j][i] === 1) { floor++; if (!ROOMS.some(r => i >= r.tx && i < r.tx + r.tw && j >= r.ty && j < r.ty + r.th)) corr++; }
    }
    ok(corr / floor < 0.5, 'коридоров ' + Math.round(100 * corr / floor) + '%');
  }
});
test('маркетолог кидает твиты, не самолётики', () => {
  eq(CLS.mkt.s1.n, 'твит');
});
test('меню: рейка портретов и детальная панель на месте', () => {
  const ih = require('fs').readFileSync('index.html', 'utf8');
  ok(ih.includes('id="rmgr"') && ih.includes('id="rdsn"'), 'рейка из 4 портретов');
  ok(ih.includes('id="bgPhoto"'), 'большой портрет');
  ok(ih.includes('id="detSkills"'), 'блок скиллов');
  const sp = require('fs').readFileSync('src/sprites.js', 'utf8');
  ok(sp.includes('function renderClassPortraits'), 'портреты рисуются');
  ok(sp.includes('drawPortraitMgr') && sp.includes('drawPortraitDsn'), 'все 4 портрета описаны');
  ok(sp.includes('RAILSRC'), 'мини-версии для рейки');
  const dj = require('fs').readFileSync('src/data.js', 'utf8');
  ok(dj.includes("n:'твит'") && dj.includes('навсегда останется в интернете'), 'твит в описании');
});

console.log('source invariants:');
const fs2 = require('fs');
test('тайминги надписей: приоритетные каналы TXLIFE вместо общего 2.4с', () => {
  const src = fs2.readFileSync('src/combat.js', 'utf8');
  ok(src.includes('TXLIFE'), 'TXLIFE есть');
  ok(src.includes("ch:ch,life:TXLIFE[ch]"), 'floatText живёт по каналу');
});
test('классовые звуки определены', () => {
  const au = fs2.readFileSync('src/audio.js', 'utf8');
  for (const s of ['stapler', 'thudFlesh', 'notif', 'bell', 'soulAgony'])
    ok(au.includes(s + ':function'), s);
});
test('ротация локаций: regenLocation существует и чистит', () => {
  const sm = fs2.readFileSync('src/sim.js', 'utf8');
  ok(sm.includes('function regenLocation'), 'функция');
  ok(sm.includes('DEBRIS.length=0;WATER.length=0;PFX.length=0;STONES.length=0'), 'мир очищается перед переездом');
});
test('подбор кружек: радиус 22', () => {
  const sm = fs2.readFileSync('src/sim.js', 'utf8');
  ok(sm.includes('pk.y-me.y)<22'), 'радиус');
});

console.log('menu v11:');
test('меню: отдельные настройки, углы, старт', () => {
  const ih = require('fs').readFileSync('index.html', 'utf8');
  ok(ih.includes('id="bset"'), 'оверлей настроек');
  ok(ih.includes('id="mSettings"'), 'кнопка настроек');
  ok(ih.includes('id="mStart"'), 'кнопка старт');
  const i0 = ih.indexOf('id="bmenu"'), i1 = ih.indexOf('id="bset"');
  const menuBlock = ih.slice(Math.max(0, i0 - 200), i1);
  ok(menuBlock.includes('sndMaster') === false, 'слайдеры НЕ в главном меню');
  ok((ih.slice(ih.indexOf('id="bset"'), ih.indexOf('id="bset"') + 900)).includes('sndMaster'), 'слайдеры в настройках');
});
test('клавиатура: стандартная схема Q/E/R вместо случайных F/Q', () => {
  const ih = require('fs').readFileSync('index.html', 'utf8');
  const input = require('fs').readFileSync('src/input.js', 'utf8');
  const render = require('fs').readFileSync('src/render.js', 'utf8');
  const ui = require('fs').readFileSync('src/ui.js', 'utf8');
  const main = require('fs').readFileSync('src/main.js', 'utf8');
  ok(input.includes("e.code==='KeyQ'&&G.state==='playing')INPUT.fk=true"), 'Q — скилл');
  ok(input.includes("e.code==='KeyE'&&G.state==='playing')INPUT.sk2=true"), 'E — умение');
  ok(input.includes("e.code==='KeyR'&&G.state==='playing')INPUT.ultTap=true"), 'R — супер');
  ok(!input.includes("e.code==='KeyF'"), 'F не занят боевым действием');
  ok(render.includes("skill:'Q',skill2:'E',super:'R'"), 'HUD показывает Q/E/R');
  ok(ih.includes('Q — скилл · E — умение · R — супер'), 'общая подсказка классов');
  ok(ui.includes('Q + E открыты'), 'тренер использует Q/E');
  ok(main.includes("[C.ult,'Q']") && main.includes("[C.sk,'E']"), 'карточки классов показывают клавиши');
});

console.log('layout guards:');
const fsL = require('fs');
const rjs = fsL.readFileSync('src/render.js', 'utf8');
test('миникарта рисуется до тач-return в drawHUD (регресс-страж)', () => {
  const i0 = rjs.indexOf('function drawHUD');
  const i1 = rjs.indexOf('function localNearCoffee');
  const body = rjs.slice(i0, i1);
  const mm = body.indexOf('drawMinimap();');
  const tr = body.indexOf('if(isTouch){drawHudTouch');
  ok(mm > 0, 'drawMinimap вызывается в drawHUD');
  ok(mm < tr, 'вызов стоит выше раннего return тача — иначе на телефоне миникарты нет');
  eq(body.split('drawMinimap();').length - 1, 1, 'ровно один вызов в drawHUD');
});
test('миникарта экспортирует хит-зону __mmRect для QA', () => {
  const i0 = rjs.indexOf('function drawMinimap');
  const body = rjs.slice(i0, i0 + 2500);
  ok(body.indexOf('__mmRect') > 0, '__mmRect присваивается в drawMinimap');
});
test('дуга тач-кнопок: у всех 5 кнопок заданы позиции right/bottom', () => {
  const css = fsL.readFileSync('style.css', 'utf8');
  for (const sel of ['#burnout .tb-abs', '#burnout .tb-alt', '#burnout .tb-dodge', '#burnout .tb-skill', '#burnout .tb-ult']) {
    const i = css.lastIndexOf(sel + '{');
    ok(i > 0, sel + ' есть');
    ok(css.slice(i, css.indexOf('}', i)).includes('right:calc('), sel + ' имеет right:calc');
    ok(css.slice(i, css.indexOf('}', i)).includes('bottom:calc('), sel + ' имеет bottom:calc');
  }
});
test('контейнер вписывается в высоту экрана (ландшафт телефона)', () => {
  const css = fsL.readFileSync('style.css', 'utf8');
  ok(css.indexOf('width:min(100%,calc(100dvh*16/9))') > 0, 'леттербокс по ширине вместо обрезки низа');
  ok(css.indexOf('overscroll-behavior:contain') > 0, 'скролл панелей не тянет страницу');
  const ujs = fsL.readFileSync('src/ui.js', 'utf8');
  ok(ujs.indexOf('window.scrollTo(0,0)') > 0, 'страница сбрасывается при смене оверлея (iOS)');
  const qa = fsL.readFileSync('qa/shots.js', 'utf8');
  ok(qa.indexOf('844, height: 390') > 0, 'QA проверяет реальный ландшафт телефона');
});
test('счётчик врагов доступен тач-HUD до раннего return', () => {
  const body = rjs.slice(rjs.indexOf('function drawHUD'), rjs.indexOf('function localNearCoffee'));
  ok(body.indexOf('__hudInfo=') > 0, '__hudInfo считается в drawHUD');
  ok(body.indexOf('__hudInfo=') < body.indexOf('if(isTouch){drawHudTouch'), 'экспорт до тач-гейта — иначе на телефоне счётчика нет');
});
test('тач-HUD: строка ВРАГОВ и итоговая карточка спринта', () => {
  const body = rjs.slice(rjs.indexOf('function drawHudTouch'), rjs.indexOf('var boss='));
  ok(body.indexOf('ВРАГОВ') > 0, 'в drawHudTouch есть счётчик врагов');
  ok(body.indexOf('ЗАКРЫТ') > 0, 'в drawHudTouch есть заголовок итогов');
  ok(body.indexOf('__interRect') > 0, 'итоговая карточка экспортирует __interRect');
});
test('босс-бар и смерть рисуются до тач-гейта', () => {
  const body = rjs.slice(rjs.indexOf('function drawHUD'), rjs.indexOf('function localNearCoffee'));
  ok(body.indexOf('АУДИТ') < body.indexOf('if(isTouch){drawHudTouch'), 'полоса аудита доступна на таче');
  ok(body.indexOf('ВЫ СГОРЕЛИ') < body.indexOf('if(isTouch){drawHudTouch'), 'оверлей смерти доступен на таче');
});
test('аудит раскладки встроен в QA по всем сценам', () => {
  const q = fsL.readFileSync('qa/shots.js', 'utf8');
  for (const sc of ['menu', 'game', 'wave', 'interstitial', 'pause'])
    ok(q.includes("auditLayout(page, '" + sc), 'сцена ' + sc + ' под аудитом');
  ok(q.includes('__mmRect'), 'QA знает про миникарту');
  ok(q.includes('__hudInfo'), 'QA следит за счётчиком врагов');
  ok(q.includes('__interRect'), 'QA следит за итоговой статистикой');
});

console.log('perks & career:');
load('src/combat.js');
load('src/mobs.js');
test('PERKS: 15 перков, 11 обычных + 4 редких поведения', () => {
  eq(PERKS.length, 15);
  const ids = new Set(PERKS.map(p => p.id));
  eq(ids.size, 15);
  eq(PERKS.filter(p => p.r === 'r').length, 4);
  for (const p of PERKS) eq(typeof p.f, 'function', p.id + '.f');
});
test('PERKBY: применение перка к игроку', () => {
  const p = newPlayer('t', 'dev');
  eq(p.dmgBonus, 0); eq(p.cdMult, 1); eq(p.perks.length, 0);
  PERKBY.ot.f(p); eq(p.dmgBonus, 0.12);
  PERKBY.async.f(p); ok(p.cdMult < 1, 'cdMult<1');
  PERKBY.dress.f(p); ok(p.drMult < 1, 'drMult<1');
});
test('выбор перка: ровно 2 карточки — договорённость после фокус-группы, не 3', () => {
  const src = fs2.readFileSync('src/main.js', 'utf8');
  eq((src.match(/PERKSEL\.length<2/g) || []).length, 2, 'оба цикла добора на 2');
  ok(!/PERKSEL\.length<3/.test(src), 'вернулись 3 карточки');
  ok(!src.includes('Digit3'), 'хоткей третьей карточки');
});
test('неактивная вкладка молчит: visibilitychange глушит AudioContext', () => {
  const src = fs2.readFileSync('src/audio.js', 'utf8');
  ok(src.includes("addEventListener('visibilitychange'"), 'обработчик visibilitychange');
  ok(src.includes('AC.suspend()'), 'suspend при скрытии вкладки');
  ok(src.includes('AC.resume()'), 'resume при возврате');
});
test('award: однократная выдача достижения', () => {
  eq(award('boss1'), true);
  eq(award('boss1'), false);
  eq(CAREER.ach.boss1, 1);
});
test('careerEndRun: рекорды обновляются', () => {
  G.wave = 6; G.okr = 77; G.level = 4; G.players = [];
  careerEndRun();
  eq(CAREER.bestSprint, 5);
  ok(CAREER.bestOkr >= 77);
  eq(CAREER.runs >= 1, true);
});
test('addXp: уровень ставит выбор буста в очередь', () => {
  global.SFX = { levelUp() {}, grade() {}, crit() {}, hit() {} };
  G.xp = 0; G.xpN = 40; G.level = 1; G.perkQueue = 0;
  addXp(95, 0, 0);
  eq(G.level, 3);
  eq(G.perkQueue, 2);
});
test('обучение: приёмы открываются по спринтам, атака доступна сразу', () => {
  G.training = true; G.wave = 1;
  eq(abilityUnlocked('secondary'), false);
  eq(abilityUnlocked('dodge'), false);
  eq(abilityUnlocked('skill'), false);
  G.wave = 2;
  eq(abilityUnlocked('secondary'), true);
  eq(abilityUnlocked('dodge'), true);
  eq(abilityUnlocked('skill'), false);
  G.wave = 3;
  eq(abilityUnlocked('skill'), true);
  G.training = false; G.wave = 1;
  eq(abilityUnlocked('super'), true);
});
test('награды: разблокировка по рекорду и повторная смерть не дублирует забег', () => {
  CAREER.bestSprint = 0; CAREER.totalInterns = 0; CAREER.totalDeadlines = 0;
  G.runSettled = false; G.wave = 2; G.okr = 5; G.killsI = 5; G.killsD = 0;
  G.careerKi = 0; G.careerKd = 0;
  careerEndRun();
  eq(CAREER.bestSprint, 1);
  eq(G.newUnlocks[0].id, 'gold');
  eq(cosmeticLevel(), 1);
  const runs = CAREER.runs;
  G.wave = 3; G.killsI = 8;
  careerEndRun();
  eq(CAREER.runs, runs);
  eq(CAREER.totalInterns, 8);
  eq(CAREER.bestSprint, 2);
});

console.log('special sprints:');
global.cv = { width: 960, height: 540 };
global.DPR = 1;
global.SFX = new Proxy({}, { get: () => () => {} });
global.spawnDebris = () => {};
global.bossStinger = () => {};
global.DEBRIS = []; global.WATER = []; global.PFX = []; global.STONES = [];
load('src/sim.js');
const seedForSpecial = (w, want) => {
  for (let s = 1; s < 300; s++) { buildMap(s); if (pickSpecial(w).id === want) return s; }
  return 0;
};
const seedAudit5 = seedForSpecial(5, 'audit');
const seedReview5 = seedForSpecial(5, 'review');
const seedPub5 = seedForSpecial(5, 'pub');
test('реестр: случайные средние спринты и отдельный финальный релиз', () => {
  ok(seedAudit5 > 0 && seedReview5 > 0 && seedPub5 > 0, 'audit/review/pub достижимы в середине кампании');
  eq(SPECIAL_ORDER.length, 4);
  ok(SPECIALS.release && SPECIALS.release.final === true, 'release не участвует в случайном пуле');
  ok(SPECIALS.audit.fill && SPECIALS.review.fill && SPECIALS.pub.fill && SPECIALS.release.fill, 'все спринты имеют состав');
});
test('средние спринты 3/5/8 случайны и детерминированы; финал 10 всегда release', () => {
  for (const s of [7, 42, 1337]) {
    buildMap(s);
    const a3 = pickSpecial(3).id, a5 = pickSpecial(5).id, a8 = pickSpecial(8).id;
    buildMap(s);
    eq(pickSpecial(3).id, a3);
    eq(pickSpecial(5).id, a5);
    eq(pickSpecial(8).id, a8);
    eq(specialForWave(10, s).id, 'release', 'финал не зависит от сида');
    eq(specialForWave(4, s), null);
    eq(specialForWave(6, s), null);
  }
  ok(['audit', 'review', 'pub'].indexOf(pickSpecial(10).id) >= 0, 'случайный пул не содержит release');
});
test('кампания: 10 спринтов и единый финальный заголовок проекта', () => {
  eq(G.campaign, 10, 'кампания рассчитана на 10 спринтов');
  const ih = fs2.readFileSync('index.html', 'utf8');
  const dj = fs2.readFileSync('src/data.js', 'utf8');
  const uj = fs2.readFileSync('src/ui.js', 'utf8');
  ok(ih.includes('пережить 10 спринтов'), 'цель в меню обновлена');
  ok(dj.includes('пройти все 10 спринтов'), 'достижение обновлено');
  ok(uj.includes("te.textContent='ПРОЕКТ ЗАВЕРШЁН'"), 'финальный заголовок единый');
  ok(uj.includes('Первая правка от заказчика'), 'финальный текст обновлён');
});
test('перед особым спринтом есть явный брифинг следующего типа', () => {
  global.updateCamera = () => {};
  buildMap(seedAudit5);
  G.training = false; G.wave = 4; G.waveState = 'active';
  G.players = [newPlayer('t', 'mgr')];
  G.spawnQ.length = 0; G.mobs.length = 0; G.boss = null; G.special = null;
  G.pendSeed = seedReview5; G.campaign = 10; G.winShown = false; G.winT = 0;
  const oldR = R;
  R = () => seedReview5 / 1e9;
  updateWaves(0.016);
  R = oldR;
  eq(G.nextSpecial, 'review', 'интермиссия знает тип следующего спринта');
  ok(SPECIALS.review.brief && SPECIALS.review.brief.length > 10, 'у аттестации есть описание');
  updateWaves(20);
  ok(G.msg.indexOf('СЛЕДУЮЩИЙ СПРИНТ') >= 0 && G.msg.indexOf('АТТЕСТАЦИЯ') >= 0, 'перед стартом показывается брифинг');
});
test('5-й спринт: аудит — настоящий босс плюс обычная очередь', () => {
  buildMap(seedAudit5);
  G.training = false; G.wave = 4; G.spawnQ.length = 0; G.mobs.length = 0; G.boss = null; G.special = null;
  G.players = [newPlayer('t', 'mgr')];
  startWave();
  eq(G.wave, 5);
  eq(G.special, 'audit');
  ok(G.boss && G.boss.hp > 0, 'босс заспавнен');
  ok(G.spawnQ.length > 0 && G.spawnQ.every(t => t === 'intern' || t === 'deadline'));
  eq(G.msg.indexOf('АУДИТ') >= 0, true);
});
test('5-й спринт: аттестация — расширенный состав коллег, босса нет', () => {
  buildMap(seedReview5);
  G.training = false; G.wave = 4; G.spawnQ.length = 0; G.mobs.length = 0; G.boss = null; G.special = null;
  G.players = [newPlayer('t', 'mgr')];
  startWave();
  eq(G.wave, 5);
  eq(G.special, 'review');
  eq(G.boss, null);
  const counts = { hr: 0, rival: 0, lead: 0 };
  for (const t of G.spawnQ) counts[t]++;
  eq(G.spawnQ.length, 14, 'аттестация должна быть заметно длиннее');
  eq(counts.hr, 5); eq(counts.rival, 7); eq(counts.lead, 2);
  eq(G.msg.indexOf('АТТЕСТАЦИЯ') >= 0, true);
});
test('финальный спринт 10 — всегда закрытие проекта у владельца продукта', () => {
  for (const s of [1, 7, 42, seedAudit5]) {
    buildMap(s);
    eq(specialForWave(10, s).id, 'release', 'финал не зависит от сида ' + s);
  }
  buildMap(42);
  G.training = false; G.campaign = 10; G.wave = 9; G.spawnQ.length = 0; G.mobs.length = 0; G.boss = null; G.special = null;
  G.players = [newPlayer('t', 'mgr')];
  startWave();
  eq(G.wave, 10);
  eq(G.special, 'release');
  ok(G.boss && G.boss.kind === 'release', 'финальный босс — заказчик');
  eq(bossName(G.boss), 'ЗАКАЗЧИК');
  eq(G.spawnQ.length, 5, 'к боссу добавлена горящая очередь');
  ok(G.msg.indexOf('ЗАКРЫТИЕ ПРОЕКТА') >= 0);
});
test('обычные волны не тронуты: состояние сброшено, только стажёры и дедлайны', () => {
  buildMap(seedReview5);
  G.training = false; G.wave = 1; G.spawnQ.length = 0; G.boss = null; G.special = 'review';
  G.players = [newPlayer('t', 'mgr')];
  startWave();
  eq(G.wave, 2);
  eq(G.special, null, 'special сброшен на обычной волне');
  eq(G.boss, null);
  eq(G.spawnQ.length, 18); // w2: ni=15, nd=3
  ok(G.spawnQ.every(t => t === 'intern' || t === 'deadline'));
});
test('аттестация: спавн коллег — различимые роли, завершение волны и победа', () => {
  buildMap(seedReview5);
  G.training = false; G.wave = 4; G.spawnQ.length = 0; G.mobs.length = 0; G.boss = null; G.special = null;
  const p = newPlayer('t', 'mgr'); p.x = REACH_LIST[0].x; p.y = REACH_LIST[0].y;
  G.players = [p];
  startWave();
  eq(G.special, 'review');
  G.mobs.length = 0;
  for (const t of G.spawnQ.slice()) spawnMob(t);
  eq(G.mobs.length, 14);
  for (const m of G.mobs) {
    ok(m.hp > 0 && m.hpMax === m.hp, m.type + ' hp');
    eq(m.r, MOBRAD[m.type]);
    ok(MOBNAMES[m.type].indexOf(mobName(m)) >= 0, 'имя роли читаемое: ' + mobName(m));
  }
  const roles = {};
  for (const m of G.mobs) roles[m.type] = m;
  ok(roles.rival.spd > roles.hr.spd && roles.hr.spd > roles.lead.spd, 'скорости: конкурент > HR > лид');
  ok(roles.lead.hp > roles.hr.hp && roles.lead.hp > roles.rival.hp, 'лид — тяжёлая роль');
  ok(roles.rival.spd > 200, 'конкурент — быстрый милишник');
  const kc0 = G.killsC, okr0 = G.okr;
  for (const m of G.mobs.slice()) { m.dead = true; killMob(m); }
  G.mobs = G.mobs.filter(m => !m.dead);
  eq(G.killsC, kc0 + 14);
  ok(G.okr > okr0, 'коллеги дают OKR');
  G.spawnQ.length = 0; G.waveState = 'active'; G.campaign = 5; G.winShown = false; G.winT = 0;
  updateWaves(0.016);
  eq(G.waveState, 'cleared');
  ok(G.winT > 0, 'финальная волна без босса завершает забег');
  eq(G.interStats.kc, kc0 + 14);
  G.campaign = 10;
});
test('паб: спринт 5 — бармен/официант/посетитель в очереди, босса нет, анонс пятницы', () => {
  buildMap(seedPub5);
  G.training = false; G.wave = 4; G.spawnQ.length = 0; G.mobs.length = 0; G.boss = null; G.special = null;
  G.players = [newPlayer('t', 'mgr')];
  startWave();
  eq(G.wave, 5);
  eq(G.special, 'pub');
  eq(G.boss, null);
  const counts = { bartender: 0, waiter: 0, patron: 0 };
  for (const t of G.spawnQ) counts[t]++;
  eq(G.spawnQ.length, 7);
  eq(counts.bartender, 2); eq(counts.waiter, 3); eq(counts.patron, 2);
  eq(G.msg.indexOf('ПЯТНИЦА') >= 0, true);
  G.mobs.length = 0;
  for (const t of G.spawnQ.slice()) spawnMob(t);
  eq(G.mobs.length, 7);
  const roles = {};
  for (const m of G.mobs) {
    ok(m.hp > 0 && m.hpMax === m.hp, m.type + ' hp');
    eq(m.r, MOBRAD[m.type]);
    ok(MOBNAMES[m.type].indexOf(mobName(m)) >= 0, 'имя роли читаемое: ' + mobName(m));
    roles[m.type] = m;
  }
  ok(roles.waiter.spd > roles.bartender.spd && roles.bartender.spd > roles.patron.spd, 'скорости: официант > бармен > посетитель');
  ok(roles.patron.hp > roles.bartender.hp && roles.patron.hp > roles.waiter.hp, 'посетитель — тяжёлая роль');
  ok(roles.waiter.spd > 200, 'официант — быстрый милишник');
});
test('паб: тема паба только принудительная — обычные волны её не видят', () => {
  eq(THEMES.indexOf(PUBTHEME), -1, 'PUBTHEME не в общем пуле THEMES');
  let sawPub = 0;
  for (let s = 1; s <= 100; s++) { buildMap(s * 7919 + 13); if (MAPTHEME.pub) sawPub++; }
  eq(sawPub, 0, 'паб-тема не выпадает на обычных волнах');
  buildMap(seedPub5);
  ok(MAPTHEME.name !== PUBTHEME.name, 'до регенерации — обычная тема');
});
test('паб: regenLocation перед 5-й волной форсит тему паба, иначе — обычную', () => {
  global.updateCamera = () => {};
  buildMap(999);
  G.wave = 4; G.special = null;
  regenLocation(seedPub5);
  eq(MAPTHEME.name, PUBTHEME.name, 'перед паб-волной — паб-тема');
  buildMap(999);
  G.wave = 4; G.special = null;
  regenLocation(seedAudit5);
  ok(MAPTHEME.name !== PUBTHEME.name, 'перед аудитом — обычная тема');
});
test('тема следующей особой волны выбирается по pending-сиду, а не по старой карте', () => {
  global.updateCamera = () => {};
  buildMap(seedAudit5);
  G.wave = 4; G.special = null;
  const candidate = 424242;
  const expected = pickSpecial(5, candidate).id;
  regenLocation(candidate);
  eq(G.special, null, 'special ещё не начат');
  if (expected === 'pub') eq(MAPTHEME.name, PUBTHEME.name, 'pending-сид с пабом даёт паб-тему');
  else ok(MAPTHEME.name !== PUBTHEME.name, 'pending-сид без паба не даёт паб-тему');
  buildMap(candidate);
  eq(pickSpecial(5).id, expected, 'старт волны выбирает тот же special, что и тема локации');
});
test('паб: бой, награды и завершение кампании', () => {
  buildMap(seedPub5);
  G.training = false; G.wave = 4; G.spawnQ.length = 0; G.mobs.length = 0; G.boss = null; G.special = null;
  const p = newPlayer('t', 'mgr'); p.x = REACH_LIST[0].x; p.y = REACH_LIST[0].y;
  G.players = [p];
  startWave();
  eq(G.special, 'pub');
  G.mobs.length = 0;
  for (const t of G.spawnQ.slice()) spawnMob(t);
  eq(G.mobs.length, 7);
  const kc0 = G.killsC, okr0 = G.okr, lvl0 = G.level, xp0 = G.xp;
  for (const m of G.mobs.slice()) { m.dead = true; killMob(m); }
  G.mobs = G.mobs.filter(m => !m.dead);
  eq(G.killsC, kc0 + 7);
  ok(G.okr > okr0, 'персонал паба даёт OKR');
  ok(G.level > lvl0 || G.xp > xp0, 'персонал паба даёт опыт');
  G.spawnQ.length = 0; G.waveState = 'active'; G.campaign = 5; G.winShown = false; G.winT = 0;
  updateWaves(0.016);
  eq(G.waveState, 'cleared');
  ok(G.winT > 0, 'финальная паб-волна завершает забег');
  G.campaign = 10;
});
console.log('mob registry:');
global.STONEWORDS = ['АСАП ПО ЭТОМУ'];
global.inWater = () => false; // живёт в chaos.js, который тесты не грузят
const stoneCalls = [];
global.spawnStone = (x, y, tx, ty, word, dmg, tgtId) => { stoneCalls.push({ x, y, tx, ty, word, dmg, tgtId }); };
function mobTestSetup() {
  buildMap(7);
  G.wave = 5; G.t = 0; G.rushT = 0; G.hitStop = 0; G.shake = 0;
  G.mobs.length = 0; G.spawnQ.length = 0; G.texts.length = 0; G.fx.length = 0; G.boss = null;
  const p = newPlayer('t', 'mgr'); p.x = REACH_LIST[0].x; p.y = REACH_LIST[0].y;
  G.players = [p];
  STONES.length = 0; stoneCalls.length = 0;
  return p;
}
test('реестр: все 8 типов зарегистрированы, у каждого create и update', () => {
  eq(Object.keys(MOB_DEFS).length, 8);
  for (const t of MOBTYPES) {
    ok(MOB_DEFS[t], t + ' в реестре');
    eq(typeof MOB_DEFS[t].create, 'function', t + '.create');
    eq(typeof MOB_DEFS[t].update, 'function', t + '.update');
  }
});
test('реестр: create даёт статы по формулам волны и радиусы из MOBRAD', () => {
  const p0 = { x: 400, y: 400 };
  for (const t of MOBTYPES) {
    G.texts.length = 0;
    const m = MOB_DEFS[t].create(p0, { elite: false, wave: 5, scale: 2 });
    eq(m.type, t);
    eq(m.r, MOBRAD[t], t + '.r');
    eq(m.hp, m.hpMax, t + ' hpMax===hp');
    ok(m.hp > 0, t + ' hp>0');
    ok(m.spd > 0, t + ' spd>0');
    eq(m.dead || false, false);
  }
  const it = MOB_DEFS.intern.create(p0, { elite: true, wave: 5, scale: 1 });
  eq(it.elite, 1);
  ok([19, 23, 17].indexOf(it.r) >= 0, 'элитный радиус по варианту');
  ok(it.hp >= (16 + 10) * 2.5 * 0.6, 'элитный HP заметно выше базы');
});
test('spawnMob делегирует реестру: фразы коллегам, неизвестный тип падает явно', () => {
  const p = mobTestSetup();
  const oldR = R; R = () => 0.5; // детерминируем elite off (>= 0.12), позиции/фразы остаются валидными
  for (const t of MOBTYPES) spawnMob(t);
  R = oldR;
  eq(G.mobs.length, 8);
  for (const m of G.mobs) {
    eq(m.r, MOBRAD[m.type], m.type + '.r через spawnMob');
    eq(m.hp, m.hpMax, m.type + ' hp через spawnMob');
    ok(MOBNAMES[m.type].indexOf(mobName(m)) >= 0, m.type + ' имя');
  }
  const byType = {};
  for (const m of G.mobs) byType[m.type] = m;
  ok(HRWORDS.indexOf(byType.hr.phrase) >= 0, 'hr получил фразу HRWORDS');
  ok(PUBWORDS.indexOf(byType.bartender.phrase) >= 0, 'bartender получил фразу PUBWORDS');
  let msg = '';
  try { spawnMob('ceo'); } catch (e) { msg = e.message; }
  ok(/ceo/.test(msg), 'spawnMob("ceo") бросает ошибку с именем типа, а не делает lead');
});
test('симуляция: все типы из spawnMob тикают updateMobs без ошибок', () => {
  mobTestSetup();
  for (const t of MOBTYPES) spawnMob(t);
  eq(G.mobs.length, 8);
  updateMobs(0.016);
  updateMobs(0.016);
  ok(G.mobs.length > 0, 'мобы живы после двух тиков');
});
test('updateMobs: неизвестный тип падает явно, а не молча становится lead', () => {
  const p = mobTestSetup();
  const ghost = { id: 9999, type: 'ceo', x: p.x + 100, y: p.y, r: 15, stun: 0, kx: 0, ky: 0, cd: 0,
    aggro: false, said: false, tint: 0, emb: 0, tilt: 0, step: 0, fade: 0, elite: 0,
    cf: 0, ch: 0, chTick: 0, chDmg: 0, chSrc: -1, mk: 0, wu: 0, spd: 50 };
  G.mobs = [ghost];
  let msg = '';
  try { updateMobs(0.016); } catch (e) { msg = e.message; }
  ok(/ceo/.test(msg), 'ошибка называет тип: ' + msg);
});
test('updateMobs: hr держит дистанцию, замахивается и бросает фразу-камень', () => {
  const p = mobTestSetup();
  const spot = freeSpotNear(p.x, p.y, 360, 430, 14);
  const hr = MOB_DEFS.hr.create(spot, { elite: false, wave: 5, scale: 1 });
  hr.aggro = true; G.mobs = [hr];
  const d0 = dist(hr, p);
  updateMobs(0.016);
  ok(dist(hr, p) < d0, 'hr сокращает дистанцию дальше far=340');
  const spot2 = freeSpotNear(p.x, p.y, 240, 330, 14);
  hr.x = spot2.x; hr.y = spot2.y; hr.cd = 0;
  updateMobs(0.016);
  ok(hr.wu > 0, 'замах начат в полосе выстрела');
  ok(G.texts.some(t => t.text === 'на 1:1!'), 'надпись замаха hr');
  hr.wu = 0.01;
  updateMobs(0.016);
  eq(stoneCalls.length, 1, 'камень брошен');
  eq(stoneCalls[0].word, hr.phrase, 'камень несёт фразу hr');
  eq(stoneCalls[0].dmg, (8 + 0.8 * 5) | 0, 'урон камня по формуле волны');
  eq(hr.cd, 2.6, 'кулдаун hr после броска');
});
test('updateMobs: waiter — выпад с уроном, отбросом и своим кулдауном', () => {
  const p = mobTestSetup();
  const w = MOB_DEFS.waiter.create({ x: p.x + 40, y: p.y }, { elite: false, wave: 5, scale: 1 });
  w.aggro = true; w.cd = 0; G.mobs = [w];
  updateMobs(0.016);
  eq(w.wu, 0.24, 'замах официанта 0.24');
  ok(G.texts.some(t => t.text === 'вот ваш заказ!'), 'надпись замаха waiter');
  w.wu = 0.01;
  const bo0 = p.burnout;
  updateMobs(0.016);
  eq(w.cd, 0.9, 'кулдаун waiter после удара');
  ok(p.burnout > bo0, 'waiter нанёс выгорание');
  ok(Math.hypot(p.kx, p.ky) > 200, 'отброс 240');
});
test('updateMobs: lead — радиальный удар бьёт кругом, кд 1.9, оранжевое кольцо', () => {
  const p = mobTestSetup();
  const lead = MOB_DEFS.lead.create({ x: p.x + 50, y: p.y }, { elite: false, wave: 5, scale: 1 });
  lead.aggro = true; lead.cd = 0; G.mobs = [lead];
  updateMobs(0.016);
  ok(lead.wu > 0, 'замах начат');
  ok(G.texts.some(t => t.text === 'РАЗБОР ПОЛЁТОВ!'), 'надпись замаха lead');
  lead.wu = 0.01;
  const bo0 = p.burnout;
  updateMobs(0.016);
  eq(lead.cd, 1.9, 'кулдаун lead после удара');
  ok(p.burnout > bo0, 'lead нанёс выгорание');
  ok(Math.hypot(p.kx, p.ky) > 250, 'отброс 320');
  ok(G.fx.some(f => f.type === 'ring' && f.orange), 'оранжевое кольцо lead');
});
test('updateMobs: patron бьёт дугой впереди — второй игрок за спиной не страдает', () => {
  const p = mobTestSetup();
  const front = newPlayer('f', 'mgr'); front.x = p.x + 40; front.y = p.y;
  const back = newPlayer('b', 'dev'); back.x = p.x - 40; back.y = p.y;
  G.players = [front, back];
  const pat = MOB_DEFS.patron.create({ x: p.x, y: p.y }, { elite: false, wave: 5, scale: 1 });
  pat.aggro = true; pat.cd = 0; G.mobs = [pat];
  updateMobs(0.016);
  eq(pat.wu, 0.7, 'замах посетителя 0.7');
  pat.wu = 0.01;
  updateMobs(0.016);
  ok(front.burnout > 0, 'игрок впереди ранен');
  eq(back.burnout, 0, 'игрок за спиной цел (дуга, не круг)');
  ok(G.fx.some(f => f.type === 'ring' && f.green), 'зелёное кольцо patron');
});
test('updateMobs: стажёр вблизи замахивается и бросает словом, лимит в полёте', () => {
  const p = mobTestSetup();
  const it = MOB_DEFS.intern.create({ x: p.x + 30, y: p.y }, { elite: false, wave: 5, scale: 1 });
  it.aggro = true; it.cd = 0; G.mobs = [it];
  updateMobs(0.016);
  eq(it.wu, 0.5, 'замах стажёра 0.5');
  it.wu = 0.01;
  updateMobs(0.016);
  eq(stoneCalls.length, 1, 'камень брошен');
  eq(stoneCalls[0].word, 'АСАП ПО ЭТОМУ', 'камень несёт слово стажёра');
  eq(stoneCalls[0].dmg, (7 + 0.7 * 5) | 0, 'урон камня стажёра');
  eq(it.cd, 1.4, 'кулдаун стажёра');
  STONES.push({ t: 0, dur: 1, tgtId: p.id, dmg: 1, tx: 0, ty: 0 }, { t: 0, dur: 1, tgtId: p.id, dmg: 1, tx: 0, ty: 0 });
  it.wu = 0.01; it.cd = 0; stoneCalls.length = 0;
  updateMobs(0.016);
  eq(stoneCalls.length, 0, 'на волне 5 лимит 2 камня в полёте');
});
test('updateMobs: дедлайн взрывается в упор, ранит и пропадает', () => {
  const p = mobTestSetup();
  const dl = MOB_DEFS.deadline.create({ x: p.x + 30, y: p.y }, { elite: false, wave: 5, scale: 1 });
  dl.aggro = true; G.mobs = [dl];
  const bo0 = p.burnout;
  updateMobs(0.016);
  eq(dl.dead, true, 'дедлайн погиб');
  ok(p.burnout > bo0, 'дедлайн нанёс выгорание');
  ok(G.fx.some(f => f.type === 'ring' && f.orange), 'оранжевое кольцо взрыва');
  eq(G.mobs.length, 0, 'труп отфильтрован');
});
test('updateMobs: рассредоточение разводит пересекающихся мобов', () => {
  const p = mobTestSetup();
  const a = MOB_DEFS.rival.create({ x: p.x + 500, y: p.y + 500 }, { elite: false, wave: 5, scale: 1 });
  const b = MOB_DEFS.rival.create({ x: p.x + 500, y: p.y + 500 }, { elite: false, wave: 5, scale: 1 });
  a.aggro = true; b.aggro = true; a.cd = 99; b.cd = 99;
  G.mobs = [a, b];
  updateMobs(0.016);
  ok(dist(a, b) > 1, 'мобы разведены: ' + dist(a, b).toFixed(2));
});

console.log('ability registry:');
load('src/abilities.js');
function abilityTestPlayer(cls) {
  buildMap(7);
  const p = newPlayer('ability-' + cls, cls);
  G.players = [p]; G.mobs.length = 0; G.boss = null;
  G.projs.length = 0; G.fx.length = 0; G.texts.length = 0; G.zones.length = 0; G.delays.length = 0;
  G.wave = 5; G.ultAt = 4;
  return p;
}
function combatFixture(seed) {
  seed = seed || 7;
  buildMap(seed);
  G.mobs.length = 0; G.spawnQ.length = 0; G.boss = null;
  G.projs.length = 0; G.fx.length = 0; G.texts.length = 0; G.zones.length = 0; G.delays.length = 0;
  G.pickups.length = 0;
  G.wave = 5; G.t = 0; G.rushT = 0; G.hitStop = 0; G.shake = 0;
  G.combo = 0; G.comboT = 0; G.okr = 0; G.grade = 1;
  G.killsI = 0; G.killsD = 0; G.killsC = 0;
  G.xp = 0; G.level = 1; G.xpN = 40; G.perkQueue = 0;
  G.plan = 0; G.sepT = 0; G.special = null;
  CAREER.ach = {};
  const p = newPlayer('combat-test', 'mgr');
  p.x = REACH_LIST[0].x; p.y = REACH_LIST[0].y;
  G.players = [p];
  SFX = {
    crit() {}, hit() {}, splat() {}, deathCry() {}, soulAgony() {}, soulSigh() {},
    slam() {}, thump() {}, explode() {}, grade() {}, levelUp() {}, ring() {}, whoosh() {},
    stapler() {}, notif() {}, swish() {}, thudFlesh() {}, hexCrackle() {}, clack() {},
    clacks() {}, bell() {}, dodge() {}, die() {}, sip() {}, slurp() {}, pickup() {},
    shufut() {}, demon() {}, plan() {}, whisper() {}, heart() {}, swing() {}
  };
  STONES.length = 0;
  return p;
}
test('реестр приёмов: у каждого класса пять JS-handler’ов без дублирования cd/cost', () => {
  for (const cls of Object.keys(CLS)) {
    for (const slot of ['primary', 'secondary', 'skill', 'skill2', 'super']) {
      eq(typeof ABILITY_DEFS[cls][slot].cast, 'function', cls + '.' + slot);
      eq(ABILITY_DEFS[cls][slot].cd, undefined);
      eq(ABILITY_DEFS[cls][slot].cost, undefined);
    }
  }
});
test('runner: бесплатный ranged primary создаёт снаряд и соблюдает cooldown', () => {
  const p = abilityTestPlayer('mgr');
  const coffee = p.coffee;
  tryPrimary(p);
  eq(G.projs.length, 1);
  eq(G.projs[0].kind, 'ticket');
  eq(G.projs[0].dmg, 9 * p.dmgMult);
  eq(p.cd1, CLS.mgr.s1.cd * p.cdMult);
  eq(p.coffee, coffee);
  tryPrimary(p);
  eq(G.projs.length, 1, 'повтор во время cooldown не создаёт снаряд');
});
test('runner: платный приём списывает кофе и применяет cdMult, нехватка не ставит cooldown', () => {
  const p = abilityTestPlayer('dev');
  p.coffee = CLS.dev.s2.cost - 1;
  trySecondary(p);
  eq(p.cd2, 0);
  eq(p.coffee, CLS.dev.s2.cost - 1);
  p.coffee = 100; p.cdMult = 0.5;
  trySecondary(p);
  eq(p.coffee, 100 - Math.ceil(CLS.dev.s2.cost * p.costMult));
  eq(p.cd2, CLS.dev.s2.cd * 0.5);
  eq(p.atkT, 0.2);
});
test('runner: классовый skill сохраняет специальный qT-гейт', () => {
  const p = abilityTestPlayer('dev');
  trySkill(p);
  eq(p.qT, 3.2);
  eq(p.cdQ, CLS.dev.ult.cd);
  const coffee = p.coffee;
  p.cdQ = 0;
  trySkill(p);
  eq(p.coffee, coffee, 'активный qT не даёт перезапустить приём даже при нулевом cooldown');
  eq(p.cdQ, 0);
});

console.log('combat mechanics:');
test('damageMob: mark увеличивает урон в 1.5×', () => {
  const p = combatFixture();
  const m = MOB_DEFS.intern.create({ x: p.x + 80, y: p.y }, { elite: false, wave: 5, scale: 1 });
  const oldR = R; R = () => 1;
  damageMob(m, 20, 0, 0, 0);
  const noMark = m.hpMax - m.hp;
  m.hp = m.hpMax; m.mk = 5;
  damageMob(m, 20, 0, 0, 0);
  const mark = m.hpMax - m.hp;
  R = oldR;
  eq(noMark, 20);
  eq(mark, 30);
});
test('damageMob: летальный удар вызывает killMob один раз', () => {
  const p = combatFixture();
  const m = MOB_DEFS.intern.create({ x: p.x + 80, y: p.y }, { elite: false, wave: 5, scale: 1 });
  m.hp = 5;
  const oldR = R; R = () => 1;
  const k0 = G.killsI;
  damageMob(m, 10, 0, 0, 0);
  eq(G.killsI, k0 + 1);
  ok(m.dead);
  damageMob(m, 10, 0, 0, 0);
  eq(G.killsI, k0 + 1);
  R = oldR;
});
test('killMob: стажёр даёт XP, OKR, супер-заряд и комбо', () => {
  const p = combatFixture();
  const m = MOB_DEFS.intern.create({ x: p.x + 80, y: p.y }, { elite: false, wave: 5, scale: 1 });
  m.dead = true;
  const oldR = R; R = () => 1;
  const xp0 = G.xp, okr0 = G.okr, super0 = p.superC, combo0 = G.combo;
  killMob(m);
  R = oldR;
  ok(G.xp > xp0, 'XP');
  ok(G.okr > okr0, 'OKR');
  ok(p.superC > super0, 'super charge');
  eq(G.combo, combo0 + 1);
  eq(G.killsI, 1);
});
test('killMob: вампиризм гасит выгорание', () => {
  const p = combatFixture();
  p.vamp = 2; p.burnout = 5;
  const m = MOB_DEFS.intern.create({ x: p.x + 80, y: p.y }, { elite: false, wave: 5, scale: 1 });
  m.dead = true;
  const oldR = R; R = () => 1;
  killMob(m);
  R = oldR;
  eq(p.burnout, 3);
});
test('addBurnout: shield полностью блокирует урон', () => {
  const p = combatFixture();
  p.shield = 1; p.burnout = 10;
  addBurnout(p, 20, 'test');
  eq(p.burnout, 10);
});
test('addBurnout: invulnerability блокирует урон', () => {
  const p = combatFixture();
  p.inv = 1; p.burnout = 10;
  addBurnout(p, 20, 'test');
  eq(p.burnout, 10);
});
test('killMob: дроб кофе с мобов срабатывает при R<0.12', () => {
  const p = combatFixture();
  const m = MOB_DEFS.intern.create({ x: p.x + 80, y: p.y }, { elite: false, wave: 5, scale: 1 });
  m.dead = true;
  const oldR = R;
  G.pickups.length = 0;
  R = () => 0.06;
  killMob(m);
  const dropped = G.pickups.some(pk => pk.kind === 'coffee');
  G.killsI = 0; G.combo = 0; G.pickups.length = 0;
  const m2 = MOB_DEFS.intern.create({ x: p.x + 80, y: p.y }, { elite: false, wave: 5, scale: 1 });
  m2.dead = true;
  R = () => 0.15;
  killMob(m2);
  R = oldR;
  ok(dropped, 'кофе выпало при R=0.06');
  ok(!G.pickups.some(pk => pk.kind === 'coffee'), 'кофе не выпало при R=0.15');
});
test('dramaOfDeath: душа получает настроение agony|relief', () => {
  const souls = [];
  const oldSpawn = spawnDebris;
  spawnDebris = (d) => { if (d.kind === 'soul') souls.push(d); };
  const oldR = R;
  const p = combatFixture();
  const m = MOB_DEFS.intern.create({ x: p.x + 80, y: p.y }, { elite: false, wave: 5, scale: 1 });
  m.dead = true;
  R = () => 0.2;
  killMob(m);
  eq(souls.length, 1);
  eq(souls[0].mood, 'agony');
  souls.length = 0;
  const m2 = MOB_DEFS.intern.create({ x: p.x + 80, y: p.y }, { elite: false, wave: 5, scale: 1 });
  m2.dead = true;
  R = () => 0.8;
  killMob(m2);
  R = oldR;
  spawnDebris = oldSpawn;
  eq(souls.length, 1);
  eq(souls[0].mood, 'relief');
});
test('spawnFolders: stoneImpact создаёт ровно 2 папки', () => {
  if (typeof spawnFolders !== 'function') load('src/chaos.js');
  const folders = [];
  const oldSpawn = spawnDebris;
  spawnDebris = (d) => { if (d.kind === 'folder') folders.push(d); };
  const oldR = R; R = () => 0;
  const oldSFX = SFX; SFX = Object.assign({}, SFX, { slam() {}, thump() {} });
  stoneImpact(100, 100);
  R = oldR; SFX = oldSFX; spawnDebris = oldSpawn;
  eq(folders.length, 2);
});

console.log('damage attribution:');
test('mobHit эмитится перед mobKill и сообщает killed', () => {
  const p = combatFixture();
  const m = MOB_DEFS.intern.create({ x: p.x + 50, y: p.y }, { elite: false, wave: 5, scale: 1 });
  m.hp = 10;
  const hits = [], kills = [];
  const u1 = onGameEvent('mobHit', ev => hits.push(ev));
  const u2 = onGameEvent('mobKill', ev => kills.push(ev));
  const src = { kind: 'ability', id: 's1', player: p };
  const oldR = R; R = () => 1;
  damageMob(m, 20, 0, 0, 0, src);
  R = oldR;
  u1(); u2();
  eq(hits.length, 1);
  eq(kills.length, 1);
  eq(hits[0].killed, true);
  eq(hits[0].mob, m);
  eq(hits[0].src.id, 's1');
  eq(kills[0].mob, m);
  eq(kills[0].src.id, 's1');
  eq(hits[0].amount, 20);
});
test('повторный damage по мёртвому не эмитит mobHit/mobKill', () => {
  const p = combatFixture();
  const m = MOB_DEFS.intern.create({ x: p.x + 50, y: p.y }, { elite: false, wave: 5, scale: 1 });
  m.dead = true; m._killed = true;
  const hits = [], kills = [];
  const u1 = onGameEvent('mobHit', ev => hits.push(ev));
  const u2 = onGameEvent('mobKill', ev => kills.push(ev));
  const oldR = R; R = () => 1;
  damageMob(m, 10, 0, 0, 0, { kind: 'ability', id: 's2', player: p });
  R = oldR;
  u1(); u2();
  eq(hits.length, 0);
  eq(kills.length, 0);
});
test('снаряд передаёт src в mobHit', () => {
  const p = combatFixture();
  p.cls = 'mgr'; p.aim = 0;
  const m = MOB_DEFS.intern.create({ x: p.x + 100, y: p.y }, { elite: false, wave: 5, scale: 1 });
  G.mobs = [m];
  const hits = [];
  const u = onGameEvent('mobHit', ev => hits.push(ev));
  tryPrimary(p);
  eq(G.projs.length, 1);
  const oldR = R; R = () => 1;
  updateProjs(0.2);
  R = oldR;
  u();
  eq(hits.length, 1);
  eq(hits[0].src.kind, 'ability');
  eq(hits[0].src.id, 's1');
  eq(hits[0].src.player, p);
});
test('direct ability передаёт src в mobHit', () => {
  const p = combatFixture();
  p.cls = 'dev'; p.aim = 0; p.coffee = 100;
  const m = MOB_DEFS.intern.create({ x: p.x + 30, y: p.y }, { elite: false, wave: 5, scale: 1 });
  G.mobs = [m];
  const hits = [];
  const u = onGameEvent('mobHit', ev => hits.push(ev));
  const oldR = R; R = () => 1;
  trySecondary(p);
  R = oldR;
  u();
  eq(hits.length, 1);
  eq(hits[0].src.kind, 'ability');
  eq(hits[0].src.id, 's2');
});
test('dev legacy DoT передаёт src в mobHit', () => {
  const p = combatFixture();
  p.cls = 'dev'; p.coffee = 100;
  const m = MOB_DEFS.intern.create({ x: p.x + 50, y: p.y }, { elite: false, wave: 5, scale: 1 });
  m.hp = 200;
  G.mobs = [m];
  const hits = [];
  const u = onGameEvent('mobHit', ev => hits.push(ev));
  const oldR = R; R = () => 1;
  trySkill2(p);
  updateMobs(0.5);
  R = oldR;
  u();
  ok(hits.some(h => h.src && h.src.kind === 'dot' && h.src.id === 'sk'), 'DoT src');
});
test('friendly zone передаёт src в mobHit', () => {
  const p = combatFixture();
  const m = MOB_DEFS.intern.create({ x: p.x + 50, y: p.y + 50 }, { elite: false, wave: 5, scale: 1 });
  G.mobs = [m];
  const src = { kind: 'ability', id: 'super', player: p };
  G.zones = [{ id: ++G.pkSeq, x: p.x, y: p.y, w: 200, h: 200, t: 0, life: 6, friendly: true, src: src }];
  const hits = [];
  const u = onGameEvent('mobHit', ev => hits.push(ev));
  updateFx(0.5);
  u();
  ok(hits.some(h => h.src && h.src.kind === 'ability' && h.src.id === 'super'), 'zone src');
});
test('blocked hit не эмитит playerHurt', () => {
  const p = combatFixture();
  p.shield = 1;
  const hurts = [];
  const u = onGameEvent('playerHurt', ev => hurts.push(ev));
  addBurnout(p, 20, 'deadline');
  eq(hurts.length, 0);
  p.inv = 1; p.shield = 0;
  addBurnout(p, 20, 'deadline');
  u();
  eq(hurts.length, 0);
});
test('playerHurt нормализует src и сообщает реальный урон', () => {
  const p = combatFixture();
  p.drMult = 0.5;
  const hurts = [];
  const u = onGameEvent('playerHurt', ev => hurts.push(ev));
  addBurnout(p, 20, 'deadline');
  u();
  eq(hurts.length, 1);
  eq(hurts[0].amount, 10);
  eq(hurts[0].src.kind, 'mob');
  eq(hurts[0].src.id, 'deadline');
});
test('playerDodge эмитится один раз за успешный dodge', () => {
  const p = combatFixture();
  p.cdD = 0;
  const dodges = [];
  const u = onGameEvent('playerDodge', ev => dodges.push(ev));
  tryDodge(p);
  u();
  eq(dodges.length, 1);
  eq(dodges[0].player, p);
});
test('подписка mobKill даёт кофе за убийство конкретным приёмом без нового if в combat.js', () => {
  const p = combatFixture();
  p.cls = 'dev'; p.coffee = 100;
  const m = MOB_DEFS.intern.create({ x: p.x + 30, y: p.y }, { elite: false, wave: 5, scale: 1 });
  m.hp = 5; G.mobs = [m];
  G.pickups.length = 0;
  const u = onGameEvent('mobKill', ev => {
    if (ev.src && ev.src.kind === 'ability' && ev.src.id === 's2') {
      G.pickups.push({ id: ++G.pkSeq, x: ev.mob.x, y: ev.mob.y, kind: 'coffee', t: 0, life: 25 });
    }
  });
  const oldR = R; R = () => 1;
  trySecondary(p);
  R = oldR;
  u();
  ok(G.pickups.some(pk => pk.kind === 'coffee'), 'кофе выпало по подписке за s2');
});

console.log('open plan map:');
test('коридоров нет: вне комнат только дверные тайлы (<4%)', () => {
  for (let s = 1; s <= 20; s++) {
    buildMap(s * 777);
    let floor = 0, corr = 0;
    const isDoor = (i, j) => DOORT.some(d => i >= d.x && i < d.x + d.w && j >= d.y && j < d.y + d.h);
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
      if (grid[j][i] === 1) {
        floor++;
        if (!ROOMS.some(r => i >= r.tx && i < r.tx + r.tw && j >= r.ty && j < r.ty + r.th) && !isDoor(i, j)) corr++;
      }
    }
    ok(corr / floor < 0.01, 'вне комнат (не двери) ' + Math.round(100 * corr / floor) + '%');
    ok(DOORT.length >= hallsCount(), 'дверей нет: ' + DOORT.length);
  }
});
function hallsCount(){return ROOMS.filter(r=>r.type==='openspace'||r.type==='lobby').length;}
test('двери связывают все залы (связность через двери)', () => {
  for (let s = 1; s <= 40; s++) {
    buildMap(s * 7919 + 13);
    eq(unreachableRooms().length, 0, 'сид ' + s);
  }
});
test('залов-опенспейсов >= 4 на карту', () => {
  for (let s = 1; s <= 15; s++) {
    buildMap(s * 31337);
    const os = ROOMS.filter(r => r.type === 'openspace').length;
    ok(os >= 4, 'залов ' + os);
  }
});
test('редкие перки привязаны к классам', () => {
  for (const p of PERKS.filter(x => x.r === 'r')) {
    ok(Array.isArray(p.cls) && p.cls.length >= 1, p.id + '.cls');
  }
});
test('кухня настоящая: cstand стоит в pantry-боксе', () => {
  for (let s = 1; s <= 25; s++) {
    buildMap(s * 7919 + 13);
    const pantries = ROOMS.filter(r => r.type === 'pantry');
    ok(pantries.length >= 1, 'pantry есть');
    const cs = FURN.filter(f => f.t === 'cstand');
    ok(cs.length >= 1, 'кофе-стойка стоит');
    for (const c of cs) {
      const host = pantries.find(r => c.x >= r.x && c.y >= r.y && c.x + c.w <= r.x + r.w && c.y + c.h <= r.y + r.h);
      ok(host, 'cstand в pantry');
    }
  }
});
test('стеклянные стены существуют и помечены', () => {
  buildMap(7);
  let glass = 0;
  for (const w of WALLS) if (w.glass) glass++;
  ok(glass > 10, 'glass=' + glass);
});
test('арена с боксами: >= 55% пола зала остаётся открытым', () => {
  for (let s = 1; s <= 15; s++) {
    buildMap(s * 104729);
    const arena = ROOMS.find(r => r.arena);
    ok(arena, 'арена назначена');
    let inBoxes = 0;
    for (const r of ROOMS)
      if (r.glass && r.tx >= arena.tx && r.tx + r.tw <= arena.tx + arena.tw && r.ty >= arena.ty && r.ty + r.th <= arena.ty + arena.th)
        inBoxes += r.tw * r.th;
    ok(inBoxes / (arena.tw * arena.th) <= 0.45, 'боксы занимают ' + Math.round(100 * inBoxes / (arena.tw * arena.th)) + '% арены');
  }
});
test('стеклобоксы в больших залах; санузлы глухие и у стены', () => {
  let glass = 0, inArena = 0, wc = 0, wcBad = 0;
  for (let s = 1; s <= 25; s++) {
    buildMap(s * 7919 + 13);
    const arena = ROOMS.find(r => r.arena);
    glass += ROOMS.filter(r => r.glass).length;
    inArena += ROOMS.filter(r => r.glass && r.tx > arena.tx && r.tx + r.tw < arena.tx + arena.tw && r.ty > arena.ty && r.ty + r.th < arena.ty + arena.th).length;
    for (const r of ROOMS) {
      if (r.type !== 'wc') continue;
      wc++;
      if (r.glass) { wcBad++; continue; }

      const hug = ROOMS.some(h => (h.type === 'openspace' || h.type === 'lobby') &&
        r.tx >= h.tx && r.tx + r.tw <= h.tx + h.tw && r.ty >= h.ty && r.ty + r.th <= h.ty + h.th &&
        (r.tx - 3 <= h.tx || r.tx + r.tw + 3 >= h.tx + h.tw || r.ty - 3 <= h.ty || r.ty + r.th + 3 >= h.ty + h.th));
      if (!hug) wcBad++;
    }
  }
  ok(glass / 25 >= 3, 'стекла avg=' + (glass / 25).toFixed(1));
  ok(wcBad === 0, 'санузлов не у стены/стеклянных: ' + wcBad);
  ok(wc / 25 >= 1.5, 'санузлов avg=' + (wc / 25).toFixed(1));
});
test('каждый зал имеет имя-лейбл для игрока', () => {
  buildMap(7);
  for (const r of ROOMS) ok(typeof roomLabel(r) === 'string' && roomLabel(r).length > 2, r.type);
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
