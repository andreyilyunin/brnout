'use strict';

function msg(t,d){G.msg=t;G.msgT=d||4.5;}
var TXPRIO={F:0,D:1,C:2,I:3,S:4};
var TXLIFE={F:0.9,D:1.4,C:1.1,I:1.6,S:2.4};
function floatText(x,y,text,color,size,ch){
  ch=ch||'D';
  var o={x:x,y:y,text:text,color:color||'#dfe6ee',size:size||13,t:0,vy:-15,ch:ch,life:TXLIFE[ch]||1.4};
  if(G.texts.length>=40){
    var lowI=0;
    for(var fi=1;fi<G.texts.length;fi++){
      var pf=TXPRIO[G.texts[fi].ch]||0,pl=TXPRIO[G.texts[lowI].ch]||0;
      if(pf<pl||(pf===pl&&G.texts[fi].t>G.texts[lowI].t))lowI=fi;
    }
    if((TXPRIO[ch]||0)<=(TXPRIO[G.texts[lowI].ch]||0))return;
    G.texts.splice(lowI,1);
  }
  G.texts.push(o);
}
function hitStopFx(v){
  if((G.hsCd||0)>0)return;
  G.hsCd=0.25;
  G.hitStop=Math.max(G.hitStop,v);
}
function flavorOK(){
  if((G.flavorT||0)>0)return false;
  G.flavorT=3;
  return true;
}
var WSCALE=[1,1,1.15,1.32,1.5,1.7,1.95,2.3,2.7,3.1,3.5];
function waveScale(w){return WSCALE[Math.max(1,Math.min(10,w))];}

var SPECIALS={},SPECIAL_ORDER=[];
// Регистрация особого спринта (5,10,15…): def={n,hud,hudCol,announce(w),fill(w,ctx)}.
// fill возвращает очередь спавна (строки типов мобов); босс, если нужен, ставится сам.
// Не добавляй сюда мобов: новый тип — registerMob в src/mobs.js (статы+поведение в одном def),
// имя в MOBNAMES/data.js, отрисовка в drawColleague/sprites.js. spawnMob/updateMobs берут
// определение из реестра и не знают про типы поимённо.
function registerSpecial(id,def){
  def.id=id;
  SPECIALS[id]=def;
  SPECIAL_ORDER.push(id);
  return def;
}
function specialActive(){
  var sp=G.special?SPECIALS[G.special]:null;
  return (sp&&!G.boss)?sp:null;
}
function specialRoll(w,seed){
  var s=(((seed===undefined?MAPSEED:seed)>>>0)^Math.imul(w,2654435761))>>>0;
  s^=s>>>16;s=Math.imul(s,2246822519)>>>0;s^=s>>>13;s=Math.imul(s,3266489917)>>>0;s=(s^(s>>>16))>>>0;
  return s/4294967296;
}
function pickSpecial(w,seed){
  var pool=[];
  for(var i=0;i<SPECIAL_ORDER.length;i++)if(!SPECIALS[SPECIAL_ORDER[i]].final)pool.push(SPECIAL_ORDER[i]);
  if(!pool.length)return null;
  return SPECIALS[pool[(specialRoll(w,seed)*pool.length)|0]]||null;
}
registerSpecial('audit',{
  n:'АУДИТ',
  hud:'АУДИТ ИДЁТ',
  hudCol:'#e5534b',
  brief:'босс плюс горящие задачи',
  announce:function(w){return 'СПРИНТ '+w+' · «'+MAPTHEME.name+'» · АУДИТ НАЧИНАЕТСЯ';},
  fill:function(w,c){
    var ni=Math.min(c.ni,5),nd=Math.min(c.nd,2);
    spawnBoss('audit');
    var q=[];
    for(var i=0;i<ni;i++)q.push('intern');
    for(i=0;i<nd;i++)q.push('deadline');
    return q;
  }
});
function reviewRoster(w){
  var q=[],tier=(w/5)|0,nHR=4+tier,nRival=6+tier,nLead=2+((tier/3)|0);
  for(var i=0;i<nHR;i++)q.push('hr');
  for(i=0;i<nRival;i++)q.push('rival');
  for(i=0;i<nLead;i++)q.push('lead');
  return q;
}
registerSpecial('review',{
  n:'АТТЕСТАЦИЯ',
  hud:'АТТЕСТАЦИЯ ИДЁТ',
  hudCol:'#b18ae8',
  brief:'длительная аттестация команды',
  announce:function(w){return 'СПРИНТ '+w+' · «'+MAPTHEME.name+'» · АТТЕСТАЦИЯ КОМАНДЫ';},
  fill:function(w){return reviewRoster(w);}
});
function pubRoster(w){
  var q=[],nBar=2,nWait=2+((w/5)|0),nPat=1+((w/5)|0);
  for(var i=0;i<nBar;i++)q.push('bartender');
  for(i=0;i<nWait;i++)q.push('waiter');
  for(i=0;i<nPat;i++)q.push('patron');
  return q;
}
// Пятничный паб. theme — принудительная тема локации: regenLocation строит по ней карту
// до старта волны.
registerSpecial('pub',{
  n:'ПЯТНИЦА',
  hud:'ПЯТНИЦА: КОРПОРАТИВ В ПАБЕ',
  hudCol:'#8bd17c',
  brief:'бар открыт, персонал и посетители бунтуют',
  theme:PUBTHEME.name,
  announce:function(w){return 'СПРИНТ '+w+' · «'+MAPTHEME.name+'» · ПЯТНИЦА: КОРПОРАТИВ БЕЗ ЛИМИТА. БАР ОТКРЫТ';},
  fill:function(w){return pubRoster(w);}
});
// Финальный спринт кампании: не участвует в случайном пуле и всегда закрывает проект.
registerSpecial('release',{
  n:'ЗАКРЫТИЕ ПРОЕКТА',
  hud:'ЗАКАЗЧИК ПРОСИТ ПРАВКУ',
  hudCol:'#42e0ff',
  brief:'финал: заказчик снова придумал правку',
  final:true,
  announce:function(w){return 'ФИНАЛЬНЫЙ СПРИНТ · ЗАКРЫТИЕ ПРОЕКТА: ЗАКАЗЧИК ЖДЁТ ДЕМО И НОВУЮ ПРАВКУ';},
  fill:function(){
    spawnBoss('release');
    return ['intern','intern','intern','deadline','deadline'];
  }
});
function startWave(){
  try{
  G.wave++;
  var w=G.wave;
  if(G.training&&w>=4){G.training=false;CAREER.tutorialDone=1;saveCareer();refreshMenuUI();}
  G.spawnQ.length=0;
  var sprintName=SPRINTNAMES[(R()*SPRINTNAMES.length)|0];
  var ni=(w===1)?(G.training?5:8):Math.min(Math.round((4+3*w)*1.5),48),nd=w>=2?Math.min(Math.round((2*(w-1))*1.5),16):0;
  var special=specialForWave(w);
  var specialWave=!!special;
  var horde=(w%4===0)&&!specialWave&&w>3;
  G.special=null;G.nextSpecial=null;
  if(special){
    G.special=special.id;
    var sq=special.fill(w,{ni:ni,nd:nd});
    for(var qi=0;qi<sq.length;qi++)G.spawnQ.push(sq[qi]);
  }
  if(!special){
    if(horde)ni=Math.round(ni*1.7);
    for(var i=0;i<ni;i++)G.spawnQ.push('intern');
    for(i=0;i<nd;i++)G.spawnQ.push('deadline');
  }
  for(i=G.spawnQ.length-1;i>0;i--){var j=(R()*(i+1))|0;var tmp=G.spawnQ[i];G.spawnQ[i]=G.spawnQ[j];G.spawnQ[j]=tmp;}
  G.spawnT=0.14;
  G.hordeBatch=horde;
  if(w===2)msg('Стажёры выучили новые слова — уходи с линии броска!',5);
  if(w===4)msg('Стажёры ходят пачками — держи дистанцию!',4);
  if(w===6)msg('Элитных стажёров стало больше. Они считают себя мидлами.',4);
  if(w===2)award('day1');
  if(w===5)award('spr5');
  if(horde)msg('СПРИНТ '+w+' · ХАКАТОН: все стажёры разом ('+ni+'). Держи двери!',4.5);
  else if(special)msg(special.announce(w),4);
  else msg('Спринт '+w+' · «'+MAPTHEME.name+'» · '+sprintName+': '+ni+' стажёров'+(nd?', '+nd+' дедлайнов':'')+'. ДЕДЛАЙН УСКОРЯЕТСЯ!');
  G.rushT=4;
  }catch(e){window.__swerr=(window.__swerr||[]).concat(e.message+' :: '+(e.stack||'').split('\n')[1]);console.error('startWave:',e);}
}
function spawnMob(type){
  var def=MOB_DEFS[type];
  if(!def||typeof def.create!=='function')throw new Error('spawnMob: неизвестный тип моба "'+type+'" — добавь registerMob в src/mobs.js');
  var elite=def.canElite&&R()<(G.wave>=6?0.18:0.12);
  var p0=null;
  var spPool=[];
  for(var spi=0;spi<SPAWNS.length;spi++)if(SPAWNS[spi].sp)spPool.push(SPAWNS[spi]);
  var pool=spPool.length?spPool:SPAWNS;
  if(pool.length){
    var tries=0,pick=null;
    var vw=cv.width/(DPR*G.zoom),vh=cv.height/(DPR*G.zoom);
    function bandOK(c){
      var dMin=1e9;
      for(var pi=0;pi<G.players.length;pi++){
        if(G.players[pi].dead)continue;
        var dd=Math.hypot(G.players[pi].x-c.x,G.players[pi].y-c.y);
        if(dd<dMin)dMin=dd;
      }
      return dMin>320&&dMin<900;
    }
    function offscreen(c){
      var sx=c.x-G.camX,sy=c.y-G.camY;
      return sx<-80||sx>vw+80||sy<-80||sy>vh+80;
    }
    while(tries<24&&!pick){
      tries++;
      var cand=pool[(R()*pool.length)|0];
      if(bandOK(cand)&&offscreen(cand)&&reachOK(cand.x,cand.y))pick=cand;
    }
    tries=0;
    while(tries<20&&!pick){
      tries++;
      var cand2=pool[(R()*pool.length)|0];
      if(bandOK(cand2)&&reachOK(cand2.x,cand2.y))pick=cand2;
    }
    if(!pick){
      var rc=REACH_LIST.length?REACH_LIST[(R()*REACH_LIST.length)|0]:null;
      pick=rc?{x:rc.x,y:rc.y,tag:'офис'}:pool[(R()*pool.length)|0];
    }
    p0={x:pick.x+(R()*70-35),y:pick.y+(R()*70-35)};
    if(blockedAt(p0.x,p0.y,18))p0=freeSpotNear(pick.x,pick.y,0,200,16);
    if(!reachOK(p0.x,p0.y))p0=snapReachable(p0);
    G.fx.push({type:'ring',x:p0.x,y:p0.y,rad:26,radMax:8,t:0,life:0.5,purple:1});
  }else{
    var anyP=G.players.length?G.players[0]:{x:MAP_W/2,y:MAP_H/2};
    var near2=nearestPlayerTo({x:MAP_W/2,y:MAP_H/2});
    p0=freeSpotNear((near2||anyP).x,(near2||anyP).y,430,900,16);
  }
  G.mobs.push(def.create(p0,{elite:elite,wave:G.wave,scale:waveScale(G.wave)}));
  if(elite){
    floatText(p0.x,p0.y-38,'ЭЛИТНЫЙ стажёр-«скала»','#c88a4a',12);
    SFX.grade();
  }
}
function spawnBoss(kind){
  var arena=bossArena();
  var cx=arena.x+arena.w/2,cy=arena.y+arena.h/2,p=null;

  var bestScore=-1;
  for(var bi=0;bi<REACH_LIST.length;bi++){var t2=REACH_LIST[bi];
    if(t2.x<arena.x||t2.x>arena.x+arena.w||t2.y<arena.y||t2.y>arena.y+arena.h)continue;
    if(blockedAt(t2.x,t2.y,46))continue;
    var minD=1e9;
    for(var pj=0;pj<G.players.length;pj++){
      if(G.players[pj].dead)continue;
      minD=Math.min(minD,Math.hypot(G.players[pj].x-t2.x,G.players[pj].y-t2.y));
    }
    var score=minD-Math.hypot(t2.x-cx,t2.y-cy)*0.25;
    if(score>bestScore){bestScore=score;p=t2;}
  }
  if(!p)p=snapReachable({x:cx,y:cy});
  if(blockedAt(p.x,p.y,46)){
    var bb=null,bbd=1e18;
    for(var bi2=0;bi2<REACH_LIST.length;bi2++){var rt=REACH_LIST[bi2];
      if(blockedAt(rt.x,rt.y,46))continue;
      var rdd=(rt.x-p.x)*(rt.x-p.x)+(rt.y-p.y)*(rt.y-p.y);
      if(rdd<bbd){bbd=rdd;bb=rt;}
    }
    if(bb)p=bb;
  }
  G.bossN++;
  bossStinger();
  var bh=680*(1+0.4*(G.bossN-1))*waveScale(G.wave);
  G.boss={type:'boss',kind:kind||'audit',x:p.x,y:p.y,r:44,hp:bh,hpMax:bh,spd:70,phase:1,
    atkCd:2.5,summonCd:8,tapeCd:12,windup:0,wuT:0,tx:0,ty:0,face:0,cd:0,step:0,chgCd:5};
}
function addXp(n,x,y){
  G.xp+=n;
  while(G.xp>=G.xpN){
    G.xp-=G.xpN;G.level++;G.xpN=Math.round(G.xpN*1.35);
    if(G.level<=5||G.level%2===0)G.perkQueue++;
    if(G.level>=10)award('lvl10');
    floatText(x,y-58,'УРОВЕНЬ '+G.level+(G.level<=5||G.level%2===0?' — БУСТ':''),'#ffcf5c',17,'S');
    G.fx.push({type:'ring',x:x,y:y,rad:14,radMax:130,t:0,life:0.55,gold:true});
    SFX.levelUp();G.shake+=2;
  }
}
function spendCoffee(p,n){
  var c=Math.ceil(n*(p.costMult||1));
  if(p.coffee<c){floatText(p.x,p.y-30,'НЕ ХВАТАЕТ КОФЕ','#d29922',12,'I');return false;}
  p.coffee-=c;SFX.sip();
  return true;
}
function addBurnout(p,n,src){
  if(p.shield>0){floatText(p.x,p.y-30,'заблокировано созвоном','#7aa2c8',12,'I');return;}
  if(p.inv>0)return;
  n*=(p.drMult||1);
  p.lastDamage=src||'mob';
  if(G.combo>=5)floatText(p.x,p.y-52,'комбо сброшено','#8b949e',10,'I');
  G.combo=0;G.comboT=0;
  p.burnout+=n;p.inv=0.3;p.flash=1;G.shake+=4;SFX.thump();SFX.hexCrackle();
  var hurtSrc=src?(src==='boss'||src==='stone'?{kind:src,id:src}:{kind:'mob',id:src}):null;
  emitGameEvent('playerHurt',{player:p,amount:n,src:hurtSrc});
  if(window.__tm&&p===localPlayer())__tm.hurt=(__tm.hurt||0)+n,(__tm.src=__tm.src||{})[src||'mob']=((__tm.src[src||'mob']||0)+n);
  floatText(p.x,p.y-34,'+'+Math.round(n)+' выгорания','#e5534b',14,'I');
  if(p.burnout>=100){
    if(G.players.length===1&&!p.revived){
      p.revived=true;p.burnout=55;p.coffee=50;p.inv=2.5;
      floatText(p.x,p.y-40,'переработал(а) — смену не закрыть','#d29922',16,'S');
      G.fx.push({type:'ring',x:p.x,y:p.y,rad:14,radMax:150,t:0,life:0.6,gold:true});
      msg('ОВЕРТАЙМ: вам разрешили «переработать». Один раз.',3.5);
      return;
    }
    p.dead=true;p.respT=0;
    floatText(p.x,p.y-40,'сгорел(а)','#e5534b',16);
    if((p.superC||0)>0){
      var dropS=p.superC;p.superC=0;
      G.pickups.push({id:++G.pkSeq,x:p.x,y:p.y,kind:'folder',t:0,life:99999,s:dropS});
      floatText(p.x,p.y-58,'папка задач выпала!','#d29922',13);
    }
    var anyAlive=false,i;
    for(i=0;i<G.players.length;i++)if(!G.players[i].dead)anyAlive=true;
    if(!anyAlive)gameOver();
  }
}
function damageMob(m,dmg,kx,ky,stun,src){
  if(m.dead)return;
  if(m.mk>0)dmg*=1.5;
  var cb=0;
  for(var ci=0;ci<G.players.length;ci++)cb=Math.max(cb,G.players[ci].critBonus||0);
  var crit=R()<(0.15+cb);
  if(crit)dmg*=2.2;
  m.hp-=dmg;
  if(m.type!=='boss'){m.kx+=(kx||0);m.ky+=(ky||0);if(stun)m.stun=Math.max(m.stun,stun);}
  emitGameEvent('mobHit',{mob:m,amount:dmg,crit:crit,killed:m.hp<=0&&!m.dead,src:src||null});
  if(crit){
    if(m.type==='boss'){
      var pn=4+((R()*3)|0);
      critBurst(m.x,m.y-20,pn);
    }else{
      floatText(m.x+(R()*14-7),m.y-m.r-8,'КРИТ '+Math.round(dmg),'#ff8a5c',15,'C');

      var sl=[['ASAP!','#e8c56a'],['DEADLINE!','#c4574e'],['REJECTED!','#a32626'],['FYI','#d8cfc0']][(R()*4)|0];
      G.fx.push({type:'slang',x:m.x,y:m.y-m.r-10,txt:sl[0],col:sl[1],dir:R()<0.5?-1:1,t:0,life:0.45});
    }
    G.shake+=2;hitStopFx(0.03);
    G.fx.push({type:'flash',x:m.x,y:m.y,r:36,t:0,life:0.18});
    SFX.crit();
  }else{
    m.dmgAcc=(m.dmgAcc||0)+dmg;m.dmgHits=(m.dmgHits||0)+1;m.dmgT=0.25;
  }
  if(m.hp<=0&&!m.dead){m.dead=true;killMob(m,src);}
}

// —— вреки (ART-RULES: «обломок = узнаваемая часть предмета, не безликая плашка»)
// деталь на полу: тень + передняя грань + верхняя грань, объём тонами, без контура
function wreckPiece(c,x,y,w,h,rot,topC,faceC){
  c.save();c.translate(x,y);c.rotate(rot);
  c.fillStyle='rgba(0,0,0,0.26)';c.beginPath();c.ellipse(2,3,w*0.62,h*0.6+2,0,0,TAU);c.fill();
  c.fillStyle=faceC;c.fillRect(-w/2,-h/2+1,w,h);
  c.fillStyle=topC;c.fillRect(-w/2,-h/2-2,w,3);
  c.fillStyle='rgba(255,244,224,0.05)';c.fillRect(-w/2,-h/2-2,w,1);
  c.restore();
}
function wreckPapers(c,x,y,n){
  for(var j=0;j<n;j++){var a=R()*TAU,d=6+R()*24;
    c.save();c.translate(x+Math.cos(a)*d,y+Math.sin(a)*d*0.6);c.rotate(R()*3);
    c.fillStyle='rgba(226,224,218,'+(0.5+R()*0.35).toFixed(2)+')';c.fillRect(-6,-4,12,8);
    c.strokeStyle='rgba(40,50,70,0.25)';c.lineWidth=1;
    c.beginPath();c.moveTo(-4,-2);c.lineTo(4,-2);c.stroke();c.restore();}
}
function paintDestroy(f){
  var c=floorCv.getContext('2d');
  var x=f.x+f.w/2,y=f.y+f.h/2,i;
  // пылевой след на полу
  c.fillStyle='rgba(10,8,6,0.30)';c.beginPath();c.ellipse(x,y,f.w*0.62,f.h*0.62+8,0,0,TAU);c.fill();
  c.fillStyle='rgba(0,0,0,0.16)';c.beginPath();c.ellipse(x,y,f.w*0.45,f.h*0.45,0,0,TAU);c.fill();
  if(f.t==='desk'){
    wreckPiece(c,x-26,y+2,54,11,-0.08,'#6a5a42','#4e4231');      // половина столешницы
    wreckPiece(c,x+22,y+6,46,10,0.14,'#6a5a42','#4e4231');       // вторая, съехала
    wreckPiece(c,x-46,y-8,30,12,0.4,'#4e4231','#392f22');        // ящик навыкате
    c.fillStyle='#8a8f9a';c.fillRect(x-53,y-12,9,2);             // ручка ящика
    wreckPiece(c,x+46,y-7,34,8,-0.22,'#23272d','#171b20');       // монитор мордой вниз
    c.save();c.translate(x+46,y-7);c.rotate(-0.22);              // живая задняя панель
    c.strokeStyle='rgba(0,0,0,0.38)';c.lineWidth=1;
    for(i=0;i<3;i++){c.beginPath();c.moveTo(-12+i*4,-3);c.lineTo(-8+i*4,3);c.stroke();}
    c.restore();
    wreckPiece(c,x+44,y+3,11,6,0.5,'#343a42','#23272d');         // подставка отлетела
    wreckPiece(c,x+4,y+14,32,7,0.28,'#1e242b','#161a20');        // клавиатура
    c.fillStyle='rgba(200,215,235,0.14)';
    for(i=0;i<5;i++)c.fillRect(x-11+i*5,y+13,4,3);
    c.fillStyle='#9a5a40';c.beginPath();c.arc(x-22,y+12,4,0,TAU);c.fill(); // кружка на боку
    c.strokeStyle='#6a3a26';c.lineWidth=2;c.beginPath();c.arc(x-18,y+12,3,0,TAU);c.stroke();
    wreckPapers(c,x+8,y+8,4);
  }else if(f.t==='rtable'){
    wreckPiece(c,x-20,y-4,52,16,-0.1,'#544a3e','#463d33');       // половина столешницы
    wreckPiece(c,x+18,y+8,44,14,0.18,'#544a3e','#463d33');
    wreckPiece(c,x-34,y+12,16,5,0.7,'#2c261f','#201b16');       // ножка
    wreckPiece(c,x+34,y-10,16,5,-0.6,'#2c261f','#201b16');
    c.fillStyle='rgba(220,224,230,0.55)';c.save();c.translate(x-4,y+2);c.rotate(0.3);
    c.fillRect(-10,-6,20,12);c.restore();                        // бумаги со стола
    wreckPapers(c,x,y+6,3);
  }else if(f.t==='cabinet'){
    wreckPiece(c,x,y,54,26,0.06,'#39404b','#2e343e');            // шифоньер плашмя
    c.save();c.translate(x,y);c.rotate(0.06);
    c.strokeStyle='rgba(0,0,0,0.28)';c.lineWidth=1;
    c.strokeRect(-21,-11,42,9);c.strokeRect(-21,2,42,9);         // фасады ящиков
    c.fillStyle='#6f7681';c.fillRect(-5,-7,10,2);c.fillRect(-5,6,10,2);
    c.restore();
    wreckPapers(c,x+8,y-12,5);
  }else if(f.t==='stall'){
    wreckPiece(c,x-10,y-8,26,9,-0.35,'#3d4650','#2f3742');       // перегородка навзничь
    wreckPiece(c,x+12,y+6,20,8,0.5,'#353e48','#282f38');
    c.fillStyle='#c9d1d9';c.fillRect(x-12,y+2,4,4);              // фурнитура
  }else if(f.t==='printer'){
    wreckPiece(c,x,y-6,34,14,0.1,'#565e6a','#454c56');           // корпус вскрыт
    c.save();c.translate(x,y-6);c.rotate(0.1);
    c.fillStyle='#22262e';c.fillRect(-12,-5,24,10);              // потроха
    c.fillStyle='#2c313a';c.fillRect(-9,-2,18,5);
    c.fillStyle='#3a2a20';c.beginPath();c.arc(8,-3,4,0,TAU);c.fill(); // тонер
    c.restore();
    wreckPiece(c,x-22,y+10,18,7,-0.4,'#22262e','#1a1e24');       // лоток
    wreckPapers(c,x+6,y+8,7);                                    // бумажный взрыв
  }else if(f.t==='cooler'){
    c.fillStyle='rgba(93,127,150,0.42)';                          // лужа растеклась
    c.beginPath();c.ellipse(x+6,y+4,26,11,0,0,TAU);c.fill();
    c.beginPath();c.ellipse(x-14,y+8,13,6,0,0,TAU);c.fill();
    c.fillStyle='rgba(180,205,220,0.22)';c.beginPath();c.ellipse(x+5,y+3,15,6,0,0,TAU);c.fill();
    c.strokeStyle='rgba(40,55,65,0.25)';c.lineWidth=1.5;
    c.beginPath();c.ellipse(x+6,y+4,26,11,0,0,TAU);c.stroke();   // мокрая кромка
    wreckPiece(c,x-14,y-6,18,11,0.15,'#4d5462','#3a4049');       // корпус без бутыли
    wreckPiece(c,x+16,y-7,20,8,-0.12,'#6f95ad','#54748c');       // бутыль на боку
    c.fillStyle='rgba(255,255,255,0.3)';c.fillRect(x+10,y-10,6,2);
  }else if(f.t==='couch'){
    wreckPiece(c,x,y-6,86,16,0.05,'#5a4a56','#4a3c48');          // база отвалилась
    wreckPiece(c,x-24,y+10,30,12,-0.3,'#6b5a66','#564a52');      // подушка
    wreckPiece(c,x+22,y+12,28,11,0.35,'#6b5a66','#564a52');
    wreckPiece(c,x+40,y-10,20,9,0.6,'#4a3c48','#3a2f3c');        // подлокотник
    c.fillStyle='rgba(255,255,255,0.05)';c.fillRect(x-30,y-12,60,4);
  }else if(f.t==='lamp'){
    c.strokeStyle='#3a3340';c.lineWidth=3;c.lineCap='round';     // стойка погнулась
    c.beginPath();c.moveTo(x-8,y+6);c.quadraticCurveTo(x+2,y-2,x+10,y+2);c.stroke();
    c.fillStyle='#ffcf7a';c.beginPath();                          // плафон на боку
    c.moveTo(x+6,y);c.lineTo(x+18,y-6);c.lineTo(x+16,y+2);c.closePath();c.fill();
    c.fillStyle='rgba(255,207,122,0.10)';c.beginPath();c.arc(x+13,y,16,0,TAU);c.fill();
  }else if(f.t==='box'){
    wreckPiece(c,x-6,y-3,34,14,-0.1,'#8a6f4d','#7d6647');        // картон плашмя
    wreckPiece(c,x+8,y+4,26,11,0.22,'#7d6647','#6e5a3f');
    c.fillStyle='#b5a578';c.fillRect(x-14,y-4,20,3);             // скотч
    wreckPapers(c,x+12,y-6,3);
  }else{
    wreckPiece(c,x-12,y,30,10,-0.15,'#454c59','#3a404c');        // общий случай
    wreckPiece(c,x+12,y+5,24,9,0.3,'#3a4049','#2c313a');
    wreckPapers(c,x,y,3);
  }
}
function destroyFurn(f){
  if(f.dead)return;
  f.dead=true;rebuildObst();
  CAREER.totalFurn++;
  if(CAREER.totalFurn>=50)award('furn50');
  G.shake+=5;hitStopFx(0.05);
  SFX.explode();
  paintDestroy(f);
  for(var j=0;j<12;j++)G.fx.push({type:'paper',x:f.x+f.w/2,y:f.y+f.h/2,vx:R()*240-120,vy:R()*240-120,rot:R()*3,vr:R()*8-4,t:0,life:0.8+R()*0.5});
  for(j=0;j<8;j++)G.fx.push({type:'ember',x:f.x+R()*f.w,y:f.y+R()*f.h,vx:R()*140-70,vy:-40-R()*70,t:0,life:0.6,r:2+R()*3});
  if(f.t==='desk'||f.t==='rtable')spawnHalves(f);
  if(f.t==='cooler'){
    spawnWater(f.x+f.w/2,f.y+f.h/2);
    floatText(f.x,f.y-10,'кулер пробит!','#7aa2c8',12);
  }
  if(f.t==='printer'){
    for(var pji=PFX.length-1;pji>=0;pji--)if(Math.hypot(PFX[pji].x-f.x-f.w/2,PFX[pji].y-f.y-f.h/2)<40)PFX.splice(pji,1);
    for(j=0;j<24;j++){var pa=R()*TAU,ps2=80+R()*260;
      G.fx.push({type:'paper',x:f.x+f.w/2,y:f.y+f.h/2,vx:Math.cos(pa)*ps2,vy:Math.sin(pa)*ps2-60,rot:R()*3,vr:R()*10-5,t:0,life:1.4+R()*1.2});}
  }
  if(R()<0.28)dropPickup(f.x+f.w/2,f.y+f.h/2,'coffee');
  floatText(f.x+f.w/2,f.y-4,'разобрано','#b09a72',11);
}
function damageFurn(f,dmg){
  if(f.dead||FPROPS[f.t].hp<=0)return;
  f.hp-=dmg;
  SFX.crack();
  if(f.t==='printer'&&!f.jet){f.jet=1;spawnPrinterJet(f.x+f.w/2,f.y+f.h/2);}
  if(f.hp<=0)destroyFurn(f);
}
function aoeFurn(x,y,r,dmg){
  for(var i=0;i<FURN.length;i++){var f=FURN[i];
    if(f.dead||FPROPS[f.t].hp<=0)continue;
    var cx=clamp(x,f.x,f.x+f.w),cy=clamp(y,f.y,f.y+f.h);
    if(Math.hypot(x-cx,y-cy)<r)damageFurn(f,dmg);
  }
}
function furnInArc(pl,arc,rad,dmg){
  for(var i=0;i<FURN.length;i++){var f=FURN[i];
    if(f.dead||FPROPS[f.t].hp<=0)continue;
    var cx=clamp(pl.x,f.x,f.x+f.w),cy=clamp(pl.y,f.y,f.y+f.h);
    var dx=cx-pl.x,dy=cy-pl.y;
    if(dx*dx+dy*dy<(rad+12)*(rad+12)&&Math.abs(angDiff(pl.aim,Math.atan2(dy||0.001,dx||0.001)))<arc/2)
      damageFurn(f,dmg);
  }
}

function dramaOfDeath(x,y,tp,elite){
  var pitch=tp==='deadline'?0.75:(elite?0.6:(tp==='lead'?0.85:1.05+R()*0.2));
  var agony=R()<0.5;
  SFX.deathCry(pitch);
  spawnDebris({kind:'soul',x:x,y:y-6,pitch:pitch,elite:elite,mood:agony?'agony':'relief',t:0,life:agony?1.6:1.35});
  setTimeout(function(){
    if(agony)SFX.soulAgony(pitch*(elite?0.7:1));
    else SFX.soulSigh(pitch*(elite?0.7:1));
  },120);
}
function killMob(m,src){
  if(m._killed)return;
  m._killed=true;
  emitGameEvent('mobKill',{mob:m,src:src||null});
  var xpT={deadline:9,lead:10,hr:7,rival:7,bartender:9,waiter:8,patron:11};
  addXp((xpT[m.type]||6)*(m.elite?2:1),m.x,m.y);

  G.combo=Math.min(9,(G.combo||0)+1);G.comboT=3;
  if(G.combo>=9)award('combo9');
  if(G.combo===5||G.combo===7||G.combo===9){
    var cn=COMBONAMES[G.combo];
    floatText(m.x,m.y-46,'×'+G.combo+' '+cn,'#ffcf5c',13,'C');
  }
  if(R()<0.10&&G.texts.length<20&&flavorOK())floatText(m.x+R()*20-10,m.y-28,KILLQUOTES[(R()*KILLQUOTES.length)|0],'#8b949e',10,'F');
  if(m.elite){
    if(R()<0.25)dropPickup(m.x,m.y,'coffee');
    floatText(m.x,m.y-60,'элитный уволился красиво','#c88a4a',12);
  }
  if(m.type==='intern'){G.killsI++;addOkr(1);}
  else if(m.type==='deadline'){G.killsD++;addOkr(2);}
  else if(m.type==='hr'||m.type==='rival'||m.type==='lead'||m.type==='bartender'||m.type==='waiter'||m.type==='patron'){G.killsC++;addOkr(m.type==='lead'||m.type==='patron'?3:2);}
  else if(m.type==='boss'){
    SFX.deathCry(0.5);
    if(m.kind!=='release'){CAREER.totalBoss++;award('boss1');}
    spawnDebris({kind:'soul',x:m.x,y:m.y-10,pitch:0.55,elite:1,mood:R()<0.5?'agony':'relief',t:0,life:2.4});
    setTimeout(function(){if(R()<0.5)SFX.soulAgony(0.55);else SFX.soulSigh(0.55);},150);
  }
  if(m.type!=='boss')dramaOfDeath(m.x,m.y,m.type,m.elite);
  else if(m.type==='boss'){
    G.okr+=10;msg(m.kind==='release'?'Проект сдан. Заказчик уже придумал первую правку.':'Аудит завершён. Замечаний нет.',3.5);SFX.explode();G.shake+=10;
    for(var i=0;i<3;i++)dropPickup(m.x+R()*60-30,m.y+R()*60-30,'coffee');
    dropPickup(m.x,m.y,'espresso');
    dropPickup(m.x+20,m.y,'espresso');
    addXp(150,m.x,m.y);
    if(G.wave>=G.campaign&&!G.winShown){G.winShown=true;G.winT=1.6;}
    else if(G.wave<G.campaign)msg(m.kind==='release'?'Демо прошло. Релиз откладывается до лучших времён.':'Аудит пройден. Начальство довольно. Впереди ещё спринты.',4);
    G.boss=null;return;
  }
  if(m.type==='intern')floatText(m.x,m.y-44,'ASAP','#FF3355',13);
  else if(m.type==='hr')floatText(m.x,m.y-44,'КАДРОВЫЙ ВОПРОС ЗАКРЫТ','#b18ae8',12);
  else if(m.type==='rival')floatText(m.x,m.y-44,'ГРЕЙД ДОСТАЛСЯ ТЕБЕ','#8bd17c',12);
  else if(m.type==='lead')floatText(m.x,m.y-44,'РЕЛИЗ ВЫШЕЛ БЕЗ НЕГО','#e8c56a',12);
  else if(m.type==='bartender')floatText(m.x,m.y-44,'ЗАКАЗ ОТМЕНЁН','#8bd17c',12);
  else if(m.type==='waiter')floatText(m.x,m.y-44,'ЧАЕВЫХ НЕ БУДЕТ','#d8a24e',12);
  else if(m.type==='patron'){floatText(m.x,m.y-44,'ПОСАЖЕН НА ТАКСИ','#7ddb4e',12);if(R()<0.3)dropPickup(m.x,m.y,'espresso');}
  for(var j=0;j<12;j++)G.fx.push({type:'paper',x:m.x,y:m.y,vx:R()*240-120,vy:R()*240-120,rot:R()*3,vr:R()*8-4,t:0,life:0.7+R()*0.5});
  for(j=0;j<5;j++)G.fx.push({type:'spark2',x:m.x,y:m.y,t:0,life:0.3,a:R()*TAU});
  G.shake+=2;
  if(R()<0.12)dropPickup(m.x,m.y,'coffee');
  if(R()<0.035)dropPickup(m.x,m.y,'espresso');
  SFX.splat();
}
function dropPickup(x,y,kind){
  x=clamp(x,60,MAP_W-60);y=clamp(y,60,MAP_H-60);
  G.pickups.push({id:++G.pkSeq,x:x,y:y,kind:kind,t:0,life:25});
}
function addOkr(n){
  G.okr+=n;
  while(G.okr>=15*G.grade){
    G.grade++;
    if(G.grade>=5)award('grade5');
    for(var i=0;i<G.players.length;i++){var p=G.players[i];
      p.spdMult+=0.04;
      floatText(p.x,p.y-40,'ПОВЫШЕНИЕ! ГРЕЙД '+G.grade,'#3fb950',15,'S');
    }
    SFX.grade();
  }
}
function meleeArc(pl,arc,rad,dmg,knock,stun,src){
  var hit=false,i;
  for(i=0;i<G.mobs.length;i++){var m=G.mobs[i];
    var d=dist(pl,m);
    if(d<rad+m.r&&Math.abs(angDiff(pl.aim,angTo(pl,m)))<arc/2){
      var a=angTo(pl,m);damageMob(m,dmg*pl.dmgMult,Math.cos(a)*knock,Math.sin(a)*knock,stun,src);hit=true;
    }
  }
  if(G.boss){var m2=G.boss,d2=dist(pl,m2);
    if(d2<rad+m2.r&&Math.abs(angDiff(pl.aim,angTo(pl,m2)))<arc/2){
      damageMob(m2,dmg*pl.dmgMult,0,0,0,src);hit=true;
    }
  }
  furnInArc(pl,arc,rad,dmg*pl.dmgMult);
  return hit;
}
