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
test('genCode: 5 символов из алфавита', () => {
  const c = genCode();
  eq(c.length, 5);
  ok(/^[a-z0-9]+$/.test(c));
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
  for (const th of THEMES) ok(th.floor && th.neonA && th.steel, 'поля темы');
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
test('папок при уроне: 2 (было 8)', () => {
  ok(fs2.readFileSync('src/chaos.js', 'utf8').includes('spawnFolders(x,y,2)'), 'константа');
});
test('дроб кофе с мобов: 12% (хорды съедают кофе-экономику)', () => {
  ok(fs2.readFileSync('src/combat.js', 'utf8').includes("if(R()<0.12)dropPickup(m.x,m.y,'coffee')"), 'кофе 0.12');
});
test('тайминги надписей: приоритетные каналы TXLIFE вместо общего 2.4с', () => {
  const src = fs2.readFileSync('src/combat.js', 'utf8');
  ok(src.includes('TXLIFE'), 'TXLIFE есть');
  ok(src.includes("ch:ch,life:TXLIFE[ch]"), 'floatText живёт по каналу');
});
test('души: настроение agony|relief', () => {
  const src = fs2.readFileSync('src/combat.js', 'utf8');
  ok(src.includes("mood:agony?'agony':'relief'"), 'mood в драме');
  ok(fs2.readFileSync('src/chaos.js', 'utf8').includes("agony=d.mood==='agony'"), 'mood в отрисовке');
});
test('классовые звуки определены', () => {
  const au = fs2.readFileSync('src/audio.js', 'utf8');
  for (const s of ['stapler', 'thudFlesh', 'notif', 'bell', 'soulAgony'])
    ok(au.includes(s + ':function'), s);
});
test('ротация локаций: regenLocation существует и чистит', () => {
  const sm = fs2.readFileSync('src/sim.js', 'utf8');
  ok(sm.includes('function regenLocation'), 'функция');
  ok(sm.includes("NET.events.push({k:'map',seed:seed})"), 'событие гостю');
});
test('подбор кружек: радиус 22 и событие pkup', () => {
  const sm = fs2.readFileSync('src/sim.js', 'utf8');
  ok(sm.includes('pk.y-me.y)<22'), 'радиус');
  ok(sm.includes("NET.events.push({k:'pkup"), 'событие');
});

console.log('menu v11:');
test('меню: отдельные настройки, углы, старт', () => {
  const ih = require('fs').readFileSync('index.html', 'utf8');
  ok(ih.includes('id="bset"'), 'оверлей настроек');
  ok(ih.includes('id="mSettings"'), 'кнопка настроек');
  ok(ih.includes('id="mStart"'), 'кнопка старт');
  ok(ih.includes('id="mSolo"') && ih.includes('id="mCoop"'), 'режимы');
  const i0 = ih.indexOf('id="bmenu"'), i1 = ih.indexOf('id="bset"');
  const menuBlock = ih.slice(Math.max(0, i0 - 200), i1);
  ok(menuBlock.includes('sndMaster') === false, 'слайдеры НЕ в главном меню');
  ok((ih.slice(ih.indexOf('id="bset"'), ih.indexOf('id="bset"') + 900)).includes('sndMaster'), 'слайдеры в настройках');
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
test('кооп-конфетка: реконнект, heartbeat-детект, индикатор связи', () => {
  const nj = fsL.readFileSync('src/net.js', 'utf8');
  ok(nj.indexOf('bye-host') > 0, 'хост явно прощается при выходе');
  ok(nj.indexOf('Хост завершил игру') > 0, 'гость выходит по bye-host');
  ok(nj.indexOf('},1500);') > 0, 'heartbeat 1.5с: смерть хоста видна за секунды');
  ok(nj.indexOf('deadChk') > 0, 'watchdog с двойной проверкой — переживает сворачивание приложения');
  ok(nj.indexOf('NET.reconnectTries<3') > 0, 'до 3 автопереподключений');
  ok(nj.indexOf('hostRetries<3') > 0, 'хост тоже восстанавливает комнату');
  ok(nj.indexOf('Связь восстановлена') > 0, 'успешный возврат отмечается');
  ok(/guestInIv=setInterval[\s\S]{0,400}?\},33\)/.test(nj), 'ввод гостя 30 Гц (8 Гц = рывки на хосте и телепорты у гостя)');
  ok(/sendSnapshot\(\);},70\)/.test(nj), 'снапшоты ~14 Гц (8 Гц = дёрганые мобы у гостей)');
  const rj = fsL.readFileSync('src/render.js', 'utf8');
  ok(rj.indexOf('ПЕРЕПОДКЛЮЧЕНИЕ') > 0, 'баннер переподключения в HUD');
  ok(rj.indexOf('связь') > 0 && rj.indexOf('#3fb950') > 0, 'индикатор связи зелёный-жёлтый-красный');
});
test('гость сканирует брокеры, пока не услышит комнату', () => {
  const nj = require('fs').readFileSync('src/net.js', 'utf8');
  ok(nj.indexOf('urls:[br]') > 0, 'guestJoin пробует брокеров по одному');
  ok(nj.indexOf('tryBroker') > 0, 'есть переход к следующему брокеру при тишине');
  const mj = require('fs').readFileSync('src/mqtt.js', 'utf8');
  ok(mj.indexOf('mqttBrokerList') > 0, 'единый порядок брокеров вынесен в mqttBrokerList');
});
test('гость строит уровень по событию map из снапшота (синхрон сидов)', () => {
  const gj = require('fs').readFileSync('src/guest.js', 'utf8');
  ok(gj.indexOf("e.k==='map'") > 0, 'guestEvent обрабатывает k=map (иначе гость остаётся на старом уровне)');
  ok(/k==='map'[\s\S]*?buildMap\(e\.seed\)/.test(gj), 'по событию вызывается buildMap с сидом хоста');
  load('src/guest.js');
  global.DEBRIS=[];global.WATER=[];global.PFX=[];global.STONES=[];
  buildMap(424242);
  VIEW.mobs.push({id:1});VIEW.projs.push({id:1});VIEW.pickups.push({id:1});
  G.fx.push({type:'ring'});G.texts.push({x:0,y:0});
  guestEvent({k:'map',seed:7777});
  eq(MAPSEED, 7777);
  eq(VIEW.mobs.length, 0);
  eq(VIEW.projs.length, 0);
  eq(VIEW.pickups.length, 0);
  eq(G.fx.length, 0);
  eq(G.waveState, 'calm');
  ok(gj.indexOf('found.tvx=clamp((sp.x-found.ptgt.x)/dts') > 0, 'скорость игрока считается из снапшотов');
  ok(gj.indexOf('var exx=tg.x+(p.tvx||0)*age') > 0, 'свой игрок экстраполируется по скорости — без телепортов при отдаче');
  ok(gj.indexOf('err>140') > 0, 'жёсткий снап только при большой ошибке (140px)');
});
test('инвайт-флоу живёт вне render-цикла (регресс-страж)', () => {
  const mjs = require('fs').readFileSync('src/main.js', 'utf8');
  const loopBody = mjs.slice(mjs.indexOf('function loop('), mjs.indexOf('var PERKSEL=[]'));
  ok(loopBody.indexOf('join') < 0, 'в loop() нет кода инвайта — иначе каждый кадр сносит оверлеи');
  ok(mjs.indexOf("PENDING_JOIN=_jc.toLowerCase()") > 0, 'инвайт-ссылка открывает меню с выбором класса');
  ok(mjs.indexOf('ВОЙТИ В КОМНАТУ') > 0, 'кнопка входа в комнату в join-режиме');
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
  G.wave = 6; G.okr = 77; G.level = 4; G.players = []; NET.mode = 'solo';
  careerEndRun(false);
  eq(CAREER.bestSprint, 5);
  ok(CAREER.bestOkr >= 77);
  eq(CAREER.runs >= 1, true);
});
test('addXp: уровень ставит выбор буста в очередь', () => {
  global.SFX = { levelUp() {}, grade() {}, crit() {}, hit() {} };
  G.xp = 0; G.xpN = 40; G.level = 1; G.perkQueue = 0; NET.events = [];
  addXp(95, 0, 0);
  eq(G.level, 3);
  eq(G.perkQueue, 2);
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
