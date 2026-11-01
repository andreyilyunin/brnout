'use strict';

// Реестр мобов: один тип — одно определение {create, update}.
// Добавляя моба: registerMob ниже; имя в MOBNAMES и радиус в MOBRAD (src/data.js);
// спрайт в drawColleague (src/sprites.js). spawnMob/combat.js только берёт определение
// из реестра, updateMobs/sim.js делает общий тик и делегирует update — цепочек
// if/else по типам там больше нет. Повторяющиеся куски поведения (дистанционный
// коридор дальнего боя, милишный выпад, радиальный/дуговой удар, рассредоточение)
// живут в helper'ах ниже; различия hr/bartender, rival/waiter, lead/patron — в cfg
// определений (дальности, кулдауны, фразы, цвета, звуки), а не в копипасте кода.
var MOB_DEFS = {};
function registerMob(id, def) {
  def.id = id;
  MOB_DEFS[id] = def;
  return def;
}

// Рассредоточение: толкает m от мобов, стоящих дальше по списку (каждая пара — один вызов).
function sepMob(mi, mm, dt) {
  for (var j = mi + 1; j < G.mobs.length; j++) { var m2 = G.mobs[j];
    if (m2.dead) continue;
    var dd = dist(mm, m2);
    if (dd < mm.r + m2.r && dd > 0.01) {
      var ax = (mm.x - m2.x) / dd, ay = (mm.y - m2.y) / dd, f = (mm.r + m2.r - dd) * 2;
      mm.x += ax * f * dt * 3; mm.y += ay * f * dt * 3;
    }
  }
}

// Общая база «коллег» (hr/rival/lead/bartender/waiter/patron): поля боя + блуждание.
// Порядок R() важен: tint/tilt тянут случайность до статов определения — не переставлять.
function baseColleague(type, p0) {
  return { id: ++G.mobSeq, type: type, x: p0.x, y: p0.y, stun: 0, kx: 0, ky: 0, cd: 0, wt: 0, wx: 0, wy: 0, face: 0, aggro: true, said: false, tint: (R() * 4) | 0, emb: 0, tilt: R() * 6, step: 0, fade: 0.5, elite: 0,
    cf: 0, ch: 0, chTick: 0, chDmg: 0, chSrc: -1, mk: 0, wu: 0 };
}

// Дальний бой с коридором дистанции: держит полосу far..near, на дистанции выстрела
// (540 начать замах, 560 добить) замахивается windup и бросает фразу-камень.
// hr и bartender отличаются только cfg: полоса, кулдаун, слова и надпись замаха.
function rangedWindup(m, tgt, d, dt, slow, cfg) {
  m.face = angTo(m, tgt);
  if (m.wu > 0) {
    m.wu -= dt;
    if (m.wu <= 0) {
      m.cd = cfg.cd;
      if (d < 560) {
        spawnStone(m.x, m.y - 14, tgt.x, tgt.y, m.phrase || cfg.words[(R() * cfg.words.length) | 0], (8 + 0.8 * G.wave) | 0, tgt.id);
        SFX.swish && SFX.swish();
      }
    }
    return;
  }
  if (d > cfg.far) steerMove(m, Math.cos(m.face), Math.sin(m.face), m.spd * slow * dt);
  else if (d < cfg.near) steerMove(m, -Math.cos(m.face), -Math.sin(m.face), m.spd * 0.7 * slow * dt);
  else {
    m.wt -= dt;
    if (m.wt <= 0) { m.wt = 0.7 + R(); m.wx = R() * 2 - 1; m.wy = R() * 2 - 1; }
    var pa = m.face + Math.PI / 2 * ((m.tint % 2) ? 1 : -1);
    steerMove(m, Math.cos(pa) * 0.6 + m.wx * 0.4, Math.sin(pa) * 0.6 + m.wy * 0.4, m.spd * 0.5 * slow * dt);
  }
  if (m.cd <= 0 && d < 540) { m.wu = 0.6; floatText(m.x, m.y - 30, cfg.label, cfg.color, 11, 'I'); }
}

// Милишный выпад: догоняет до контакта, короткий замах, удар с отбросом.
// rival и waiter отличаются только cfg: замах, кулдаун, дальность старта/удара, урон, отброс.
function meleeLunge(m, tgt, d, dt, slow, cfg) {
  m.face = angTo(m, tgt);
  if (m.wu > 0) {
    m.wu -= dt;
    if (m.wu <= 0) {
      m.cd = cfg.cd;
      if (d < m.r + tgt.r + cfg.reach) {
        addBurnout(tgt, cfg.dmgBase + cfg.dmgW * G.wave, cfg.src);
        var ra = angTo(m, tgt);
        tgt.kx += Math.cos(ra) * cfg.knock; tgt.ky += Math.sin(ra) * cfg.knock;
        G.fx.push({ type: 'flash', x: m.x, y: m.y, r: cfg.fxR, t: 0, life: 0.2 });
        SFX.thudFlesh && SFX.thudFlesh();
      }
    }
    return;
  }
  if (d > m.r + tgt.r - 2) steerMove(m, Math.cos(m.face), Math.sin(m.face), m.spd * slow * dt);
  if (d < m.r + tgt.r + cfg.startReach && m.cd <= 0) { m.wu = cfg.windup; floatText(m.x, m.y - 30, cfg.label, cfg.color, 11, 'I'); }
}

// Удар после замаха по всем игрокам: кольцо, звук, тряска, урон + отброс.
// lead — полный круг радиусом rad; patron — дуга arc впереди (cfg.arc) на дистанции m.r+rad.
function slamHit(m, cfg) {
  var ring = { type: 'ring', x: m.x, y: m.y, rad: 12, radMax: cfg.ringMax, t: 0, life: 0.4 };
  ring[cfg.ringKey] = true;
  G.fx.push(ring);
  SFX.slam && SFX.slam();
  G.shake += cfg.shake;
  for (var i = 0; i < G.players.length; i++) { var lp = G.players[i];
    if (lp.dead) continue;
    var dd = dist(m, lp);
    var hit = cfg.arc ? (dd < m.r + lp.r + cfg.rad && Math.abs(angDiff(m.face, angTo(m, lp))) < cfg.arc) : (dd < cfg.rad + lp.r);
    if (hit) {
      addBurnout(lp, cfg.dmgBase + cfg.dmgW * G.wave, cfg.src);
      var la = angTo(m, lp);
      lp.kx += Math.cos(la) * cfg.knock; lp.ky += Math.sin(la) * cfg.knock;
    }
  }
}

registerMob('intern', {
  canElite: true,
  create: function (p0, ctx) {
    var w = ctx.wave, elite = ctx.elite;
    var mm = { id: ++G.mobSeq, type: 'intern', x: p0.x, y: p0.y, r: elite ? 19 : 15, hp: (16 + 2 * w) * (elite ? 2.5 : 1) * ctx.scale, hpMax: (16 + 2 * w) * (elite ? 2.5 : 1) * ctx.scale, spd: (55 + R() * 22 + w * 2) * (elite ? 0.92 : 1), elite: elite ? 1 : 0,
      stun: 0, kx: 0, ky: 0, cd: R(), wt: 0, wx: 0, wy: 0, face: 0, aggro: false, said: false, tint: (R() * 4) | 0, emb: 0, tilt: R() * 6, step: 0, fade: 0.5,
      cf: 0, ch: 0, chTick: 0, chDmg: 0, chSrc: -1, mk: 0 };
    if (mm.elite) {
      mm.ev = (R() * 3) | 0;
      if (mm.ev === 0) { mm.hp *= 1.9; mm.hpMax *= 1.9; mm.spd *= 0.8; mm.r = 23; mm.tint = 2; }
      else if (mm.ev === 1) { mm.hp *= 0.65; mm.spd *= 1.7; mm.tint = 1; }
      else { mm.hp *= 1.3; mm.r = 17; mm.tint = 3; mm.dmgMul = 1.7; }
    }
    return mm;
  },
  update: function (m, tgt, d, dt, ctx) {
    var slow = ctx.slow;
    m.aggro = true;
    if (d > m.r + tgt.r + 4) {
      var a2 = (d > 90 && flowDir(m.x, m.y) !== null) ? flowDir(m.x, m.y) : angTo(m, tgt);
      m.face = angTo(m, tgt);
      steerMove(m, Math.cos(a2), Math.sin(a2), m.spd * slow * dt);
    } else if (m.wu > 0) {
      m.wu -= dt;
      if (m.wu <= 0) {
        m.cd = 1.4;
        var inFlight = 0;
        for (var si = 0; si < STONES.length; si++) if (STONES[si].tgtId === tgt.id) inFlight++;
        if (inFlight < 2 + (G.wave >= 6 ? 1 : 0) + (G.wave >= 9 ? 1 : 0)) {
          var snapx = tgt.x, snapy = tgt.y;
          spawnStone(m.x, m.y - 12, snapx, snapy, STONEWORDS[(R() * STONEWORDS.length) | 0], (7 + 0.7 * G.wave) | 0, tgt.id);
          SFX.swish && SFX.swish();
        }
      }
    } else if (m.cd <= 0 && G.wave >= 2) {
      m.wu = 0.5;
    }
    if (!m.said && d < 300) { m.said = true; if (R() < 0.5 && flavorOK()) floatText(m.x, m.y - 24, ['а дизайн уже согласовали?', 'у меня один вопрос…', 'а куда нажимать?'][(R() * 3) | 0], '#8b949e', 11, 'F'); }
    sepMob(ctx.idx, m, dt);
  }
});

registerMob('deadline', {
  create: function (p0, ctx) {
    var m = { id: ++G.mobSeq, type: 'deadline', x: p0.x, y: p0.y, r: 13, hp: (9 + 1.5 * ctx.wave) * ctx.scale, hpMax: (9 + 1.5 * ctx.wave) * ctx.scale, spd: 150 + R() * 30,
      stun: 0, kx: 0, ky: 0, cd: 0, face: 0, tint: (R() * 3) | 0, emb: 0, tilt: R() * 6, step: 0, elite: 0, aggro: true,
      cf: 0, ch: 0, chTick: 0, chDmg: 0, chSrc: -1, mk: 0 };
    if (R() < 0.3 && flavorOK()) floatText(p0.x, p0.y - 20, ['ДО РЕЛИЗА 3 ЧАСА', 'ПРОД ПОЛЁГ', 'ГОРИТ', 'DEMO ЧЕРЕЗ 10 МИНУТ'][(R() * 4) | 0], '#e07050', 12, 'F');
    return m;
  },
  update: function (m, tgt, d, dt, ctx) {
    var slow = ctx.slow;
    var a = (d > 90 && flowDir(m.x, m.y) !== null) ? flowDir(m.x, m.y) : angTo(m, tgt);
    m.face = angTo(m, tgt);
    steerMove(m, Math.cos(a), Math.sin(a), m.spd * slow * dt);
    m.emb -= dt;
    if (m.emb <= 0) { m.emb = 0.07;
      G.fx.push({ type: 'ember', x: m.x + R() * 10 - 5, y: m.y + R() * 10 - 5, vx: R() * 20 - 10, vy: -30 - R() * 20, t: 0, life: 0.5, r: 2 + R() * 3 });
    }
    if (d < m.r + tgt.r + 4) {
      addBurnout(tgt, 12 + 1.1 * G.wave, 'deadline');
      G.fx.push({ type: 'ring', x: m.x, y: m.y, rad: 6, radMax: 76, t: 0, life: 0.35, orange: true });
      G.fx.push({ type: 'flash', x: m.x, y: m.y, r: 60, t: 0, life: 0.22 });
      for (var e2 = 0; e2 < 14; e2++) G.fx.push({ type: 'ember', x: m.x, y: m.y, vx: R() * 260 - 130, vy: R() * 260 - 130, t: 0, life: 0.6, r: 2 + R() * 4 });
      G.shake += 5; G.hitStop = Math.max(G.hitStop, 0.05);
      SFX.explode(); m.dead = true;
    }
  }
});

var HR_RANGED = { far: 340, near: 210, cd: 2.6, label: 'на 1:1!', color: '#b18ae8', words: HRWORDS };
registerMob('hr', {
  cfg: HR_RANGED,
  create: function (p0, ctx) {
    var cl = baseColleague('hr', p0);
    cl.r = 14; cl.spd = 96 + R() * 22; cl.hp = cl.hpMax = (13 + 1.8 * ctx.wave) * ctx.scale; cl.cd = 1.2 + R() * 1.2;
    cl.phrase = HRWORDS[(R() * HRWORDS.length) | 0];
    if (R() < 0.4 && flavorOK()) floatText(p0.x, p0.y - 22, 'HR выходит на связь', '#b18ae8', 11, 'F');
    return cl;
  },
  update: function (m, tgt, d, dt, ctx) {
    m.aggro = true;
    rangedWindup(m, tgt, d, dt, ctx.slow, HR_RANGED);
    sepMob(ctx.idx, m, dt);
  }
});

var BAR_RANGED = { far: 320, near: 200, cd: 2.4, label: 'на стойку!', color: '#8bd17c', words: PUBWORDS };
registerMob('bartender', {
  cfg: BAR_RANGED,
  create: function (p0, ctx) {
    var cl = baseColleague('bartender', p0);
    cl.r = 15; cl.spd = 88 + R() * 20; cl.hp = cl.hpMax = (14 + 1.9 * ctx.wave) * ctx.scale; cl.cd = 1.4 + R() * 1.2;
    cl.phrase = PUBWORDS[(R() * PUBWORDS.length) | 0];
    if (R() < 0.4 && flavorOK()) floatText(p0.x, p0.y - 22, 'бармен вытирает стойку', '#8bd17c', 11, 'F');
    return cl;
  },
  update: function (m, tgt, d, dt, ctx) {
    m.aggro = true;
    rangedWindup(m, tgt, d, dt, ctx.slow, BAR_RANGED);
    sepMob(ctx.idx, m, dt);
  }
});

var RIVAL_LUNGE = { windup: 0.38, cd: 1.15, reach: 30, startReach: 12, dmgBase: 9, dmgW: 0.9, knock: 280, fxR: 34, label: 'мой грейд!', color: '#e5534b', src: 'rival' };
registerMob('rival', {
  create: function (p0, ctx) {
    var cl = baseColleague('rival', p0);
    cl.r = 15; cl.spd = 222 + R() * 34; cl.hp = cl.hpMax = (10 + 1.4 * ctx.wave) * ctx.scale; cl.cd = R() * 0.6;
    if (R() < 0.4 && flavorOK()) floatText(p0.x, p0.y - 22, 'коллега хочет твой грейд', '#e5534b', 11, 'F');
    return cl;
  },
  update: function (m, tgt, d, dt, ctx) {
    m.aggro = true;
    meleeLunge(m, tgt, d, dt, ctx.slow, RIVAL_LUNGE);
    sepMob(ctx.idx, m, dt);
  }
});

var WAITER_LUNGE = { windup: 0.24, cd: 0.9, reach: 30, startReach: 14, dmgBase: 8, dmgW: 0.9, knock: 240, fxR: 32, label: 'вот ваш заказ!', color: '#d8a24e', src: 'waiter' };
registerMob('waiter', {
  create: function (p0, ctx) {
    var cl = baseColleague('waiter', p0);
    cl.r = 14; cl.spd = 232 + R() * 34; cl.hp = cl.hpMax = (9 + 1.3 * ctx.wave) * ctx.scale; cl.cd = R() * 0.5;
    if (R() < 0.4 && flavorOK()) floatText(p0.x, p0.y - 22, 'официант уже у тебя', '#d8a24e', 11, 'F');
    return cl;
  },
  update: function (m, tgt, d, dt, ctx) {
    m.aggro = true;
    meleeLunge(m, tgt, d, dt, ctx.slow, WAITER_LUNGE);
    sepMob(ctx.idx, m, dt);
  }
});

var LEAD_SLAM = { rad: 92, dmgBase: 15, dmgW: 1.1, knock: 320, src: 'lead', ringMax: 92, ringKey: 'orange', shake: 4 };
registerMob('lead', {
  create: function (p0, ctx) {
    var cl = baseColleague('lead', p0);
    cl.r = 23; cl.spd = 56 + R() * 12; cl.hp = cl.hpMax = (30 + 3 * ctx.wave) * ctx.scale; cl.cd = R() * 0.8;
    if (R() < 0.4 && flavorOK()) floatText(p0.x, p0.y - 24, 'тимлид вышел из переговорки', '#e8c56a', 12, 'F');
    return cl;
  },
  update: function (m, tgt, d, dt, ctx) {
    var slow = ctx.slow;
    m.aggro = true;
    m.face = angTo(m, tgt);
    if (m.wu > 0) {
      m.wu -= dt;
      if (m.wu <= 0) { m.cd = 1.9; slamHit(m, LEAD_SLAM); }
    } else {
      if (d > m.r + tgt.r - 2) steerMove(m, Math.cos(m.face), Math.sin(m.face), m.spd * slow * dt);
      if (d < m.r + tgt.r + 16 && m.cd <= 0) { m.wu = 0.55; floatText(m.x, m.y - 34, 'РАЗБОР ПОЛЁТОВ!', '#e8c56a', 12, 'I'); }
    }
    sepMob(ctx.idx, m, dt);
  }
});

var PATRON_SLAM = { rad: 34, arc: 1.3, dmgBase: 16, dmgW: 1.2, knock: 420, src: 'patron', ringMax: 120, ringKey: 'green', shake: 5 };
registerMob('patron', {
  create: function (p0, ctx) {
    var cl = baseColleague('patron', p0);
    cl.r = 22; cl.spd = 60 + R() * 14; cl.hp = cl.hpMax = (34 + 3.4 * ctx.wave) * ctx.scale; cl.cd = R() * 0.8;
    if (R() < 0.4 && flavorOK()) floatText(p0.x, p0.y - 24, 'посетитель вспомнил всё', '#7ddb4e', 12, 'F');
    return cl;
  },
  update: function (m, tgt, d, dt, ctx) {
    var slow = ctx.slow;
    m.aggro = true;
    m.face = angTo(m, tgt);
    if (m.wu > 0) {
      m.wu -= dt;
      if (m.wu <= 0) { m.cd = 2.1; slamHit(m, PATRON_SLAM); }
    } else {
      m.wt -= dt;
      if (m.wt <= 0) { m.wt = 0.5 + R() * 0.8; m.wx = R() * 2 - 1; m.wy = R() * 2 - 1; }
      var sway = Math.sin(G.t * 3 + (m.tilt || 0)) * 0.7;
      var ux2 = Math.cos(m.face) + (m.wx + sway) * 0.55, uy2 = Math.sin(m.face) + (m.wy - sway) * 0.55;
      var ul2 = Math.hypot(ux2, uy2) || 1;
      if (d > m.r + tgt.r - 2) steerMove(m, ux2 / ul2, uy2 / ul2, m.spd * slow * dt);
      if (d < m.r + tgt.r + 22 && m.cd <= 0) { m.wu = 0.7; floatText(m.x, m.y - 34, 'А Я ТЕБЯ ЗНАЮ?!', '#7ddb4e', 12, 'I'); }
    }
    sepMob(ctx.idx, m, dt);
  }
});
