'use strict';
// ============================== waves & combat ==============================
function msg(t,d){G.msg=t;G.msgT=d||4.5;NET.events.push({k:'msg',t:t,d:d||4.5});}
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
  if(ch!=='F')NET.events.push({k:'txt',x:Math.round(x),y:Math.round(y),t:text,c:color||'#dfe6ee',s:size||13,ch:ch});
}
function hitStopFx(v){
  if((G.hsCd||0)>0)return;
  G.hsCd=0.25;
  G.hitStop=Math.max(G.hitStop,v);
  NET.events.push({k:'hs',v:v});
}
function flavorOK(){
  if((G.flavorT||0)>0)return false;
  G.flavorT=3;
  return true;
}
var WSCALE=[1,1,1.15,1.32,1.5,1.7,1.95,2.3,2.7,3.1,3.5];
function waveScale(w){return WSCALE[Math.max(1,Math.min(10,w))];}
function startWave(){
  try{
  G.wave++;
  var w=G.wave;
  G.spawnQ.length=0;
  var sprintName=SPRINTNAMES[(R()*SPRINTNAMES.length)|0];
  var ni=(w===1)?5:Math.min(4+3*w,34),nd=w>=2?Math.min(2*(w-1),12):0;
  var bossWave=(w===5)||(w>5&&(w-5)%5===0);
  var horde=(w%4===0)&&!bossWave&&w>3;
  if(bossWave){ni=Math.min(ni,5);nd=Math.min(nd,2);spawnBoss();}
  if(horde)ni=Math.round(ni*1.7);
  for(var i=0;i<ni;i++)G.spawnQ.push('intern');
  for(i=0;i<nd;i++)G.spawnQ.push('deadline');
  for(i=G.spawnQ.length-1;i>0;i--){var j=(R()*(i+1))|0;var tmp=G.spawnQ[i];G.spawnQ[i]=G.spawnQ[j];G.spawnQ[j]=tmp;}
  G.spawnT=0.14;
  G.hordeBatch=horde;
  if(w===2)msg('Стажёры выучили новые слова — уходи с линии броска!',5);
  if(w===4)msg('Стажёры ходят пачками — держи дистанцию!',4);
  if(w===6)msg('Элитных стажёров стало больше. Они считают себя мидлами.',4);
  if(w===2)award('day1');
  if(w===5)award('spr5');
  if(horde)msg('СПРИНТ '+w+' · ХАКАТОН: все стажёры разом ('+ni+'). Держи двери!',4.5);
  else if(bossWave)msg('СПРИНТ '+w+' · «'+MAPTHEME.name+'» · АУДИТ НАЧИНАЕТСЯ',4);
  else msg('Спринт '+w+' · «'+MAPTHEME.name+'» · '+sprintName+': '+ni+' стажёров'+(nd?', '+nd+' дедлайнов':'')+'. ДЕДЛАЙН УСКОРЯЕТСЯ!');
  G.rushT=4;
  }catch(e){window.__swerr=(window.__swerr||[]).concat(e.message+' :: '+(e.stack||'').split('\n')[1]);console.error('startWave:',e);}
}
function spawnMob(type){
  var elite=type==='intern'&&R()<(G.wave>=6?0.18:0.12);
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
    if(!reachOK(p0.x,p0.y))p0=snapReachable(p0); // фолбэк мог утащить за стену
    NET.events.push({k:'spawn',x:Math.round(p0.x),y:Math.round(p0.y),tag:pick.tag});
    G.fx.push({type:'ring',x:p0.x,y:p0.y,rad:26,radMax:8,t:0,life:0.5,purple:1});
  }else{
    var anyP=G.players.length?G.players[0]:{x:MAP_W/2,y:MAP_H/2};
    var near2=nearestPlayerTo({x:MAP_W/2,y:MAP_H/2});
    p0=freeSpotNear((near2||anyP).x,(near2||anyP).y,430,900,16);
  }
  var w=G.wave;
  var pScale=waveScale(w);
  var coopScale=1+0.35*Math.max(0,G.players.length-1);
  if(type==='intern'){
    var mm={id:++G.mobSeq,type:'intern',x:p0.x,y:p0.y,r:elite?19:15,hp:(16+2*w)*(elite?2.5:1)*pScale*coopScale,hpMax:(16+2*w)*(elite?2.5:1)*pScale*coopScale,spd:(55+R()*22+w*2)*(elite?0.92:1),elite:elite?1:0,
      stun:0,kx:0,ky:0,cd:R(),wt:0,wx:0,wy:0,face:0,aggro:false,said:false,tint:(R()*4)|0,emb:0,tilt:R()*6,step:0,fade:0.5,
      cf:0,ch:0,chTick:0,chDmg:0,chSrc:-1,mk:0};
    if(mm.elite){ // супер-мобы: три характера
      mm.ev=(R()*3)|0;
      if(mm.ev===0){mm.hp*=1.9;mm.hpMax*=1.9;mm.spd*=0.8;mm.r=23;mm.tint=2;}            // «стажёр года»: танк
      else if(mm.ev===1){mm.hp*=0.65;mm.spd*=1.7;mm.tint=1;}                             // «на энергетиках»: бегун
      else{mm.hp*=1.3;mm.r=17;mm.tint=3;mm.dmgMul=1.7;}                                  // «обиженный»: бьёт больнее
    }
    G.mobs.push(mm);
  }else{
    G.mobs.push({id:++G.mobSeq,type:'deadline',x:p0.x,y:p0.y,r:13,hp:(9+1.5*w)*pScale*coopScale,hpMax:(9+1.5*w)*pScale*coopScale,spd:150+R()*30,
      stun:0,kx:0,ky:0,cd:0,face:0,tint:(R()*3)|0,emb:0,tilt:R()*6,step:0,elite:0,aggro:true,
      cf:0,ch:0,chTick:0,chDmg:0,chSrc:-1,mk:0});
    if(R()<0.3&&flavorOK())floatText(p0.x,p0.y-20,['ДО РЕЛИЗА 3 ЧАСА','ПРОД ПОЛЁГ','ГОРИТ','DEMO ЧЕРЕЗ 10 МИНУТ'][(R()*4)|0],'#e07050',12,'F');
  }
  if(elite){
    floatText(p0.x,p0.y-38,'ЭЛИТНЫЙ стажёр-«скала»','#c88a4a',12);
    SFX.grade();
  }
}
function spawnBoss(){
  var arena=bossArena();
  var cx=arena.x+arena.w/2,cy=arena.y+arena.h/2,p=null;
  // точка арены, максимально дальняя от живых игроков: босс не падает на голову
  var bestScore=-1;
  for(var bi=0;bi<REACH_LIST.length;bi++){var t2=REACH_LIST[bi];
    if(t2.x<arena.x||t2.x>arena.x+arena.w||t2.y<arena.y||t2.y>arena.y+arena.h)continue;
    if(blockedAt(t2.x,t2.y,46))continue;
    var minD=1e9;
    for(var pj=0;pj<G.players.length;pj++){
      if(G.players[pj].dead)continue;
      minD=Math.min(minD,Math.hypot(G.players[pj].x-t2.x,G.players[pj].y-t2.y));
    }
    var score=minD-Math.hypot(t2.x-cx,t2.y-cy)*0.25; // но не в углу: тянем к центру
    if(score>bestScore){bestScore=score;p=t2;}
  }
  if(!p)p=snapReachable({x:cx,y:cy});
  if(blockedAt(p.x,p.y,46)){ // босс ⌀88: тайл из REACH(r16) может быть мебельным карманом
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
  var bh=680*(1+0.4*(G.bossN-1))*waveScale(G.wave)*(1+0.35*Math.max(0,G.players.length-1));
  G.boss={type:'boss',x:p.x,y:p.y,r:44,hp:bh,hpMax:bh,spd:70,phase:1,
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
  p.coffee-=c;return true;
}
function addBurnout(p,n,src){
  if(p.shield>0){floatText(p.x,p.y-30,'заблокировано созвоном','#7aa2c8',12,'I');return;}
  if(p.inv>0)return;
  n*=(p.drMult||1);
  if(G.combo>=5)floatText(p.x,p.y-52,'комбо сброшено','#8b949e',10,'I');
  G.combo=0;G.comboT=0;
  p.burnout+=n;p.inv=0.3;p.flash=1;G.shake+=4;SFX.thump();
  if(window.__tm&&p===localPlayer())__tm.hurt=(__tm.hurt||0)+n,(__tm.src=__tm.src||{})[src||'mob']=((__tm.src[src||'mob']||0)+n);
  floatText(p.x,p.y-34,'+'+Math.round(n)+' выгорания','#e5534b',14,'I');
  if(p.burnout>=100){
    if(G.players.length===1&&!p.revived){ // «переработал(а)»: раз за забег соло-смерть превращается в овертайм
      p.revived=true;p.burnout=55;p.coffee=50;p.inv=2.5;
      floatText(p.x,p.y-40,'переработал(а) — смену не закрыть','#d29922',16,'S');
      G.fx.push({type:'ring',x:p.x,y:p.y,rad:14,radMax:150,t:0,life:0.6,gold:true});
      msg('ОВЕРТАЙМ: вам разрешили «переработать». Один раз.',3.5);
      return;
    }
    p.dead=true;p.respT=0;
    floatText(p.x,p.y-40,'сгорел(а)','#e5534b',16);
    if((p.coins||0)>=10){ // соулс-папка: полплашек и заряд СУПЕРа падают на место гибели
      var dropN=Math.floor(p.coins*0.5);
      p.coins-=dropN;
      var dropS=p.superC||0;p.superC=0;
      G.pickups.push({id:++G.pkSeq,x:p.x,y:p.y,kind:'folder',t:0,life:99999,n:dropN,s:dropS});
      floatText(p.x,p.y-58,'папка задач выпала!','#d29922',13);
    }
    var anyAlive=false,i;
    for(i=0;i<G.players.length;i++)if(!G.players[i].dead)anyAlive=true;
    if(!anyAlive)gameOver();
  }
}
function damageMob(m,dmg,kx,ky,stun){
  if(m.mk>0)dmg*=1.5; // «в таргете»
  var cb=0;
  for(var ci=0;ci<G.players.length;ci++)cb=Math.max(cb,G.players[ci].critBonus||0);
  var crit=R()<(0.15+cb);
  if(crit)dmg*=2.2;
  m.hp-=dmg;
  if(m.type!=='boss'){m.kx+=(kx||0);m.ky+=(ky||0);if(stun)m.stun=Math.max(m.stun,stun);}
  if(crit){
    if(m.type==='boss'){
      var pn=4+((R()*3)|0);
      critBurst(m.x,m.y-20,pn);
      NET.events.push({k:'plates',x:Math.round(m.x),y:Math.round(m.y-20),n:pn});
    }else{
      floatText(m.x+(R()*14-7),m.y-m.r-8,'КРИТ '+Math.round(dmg),'#ff8a5c',15,'C');
    }
    G.shake+=2;hitStopFx(0.03);
    G.fx.push({type:'flash',x:m.x,y:m.y,r:36,t:0,life:0.18});
    SFX.crit();
  }else{
    m.dmgAcc=(m.dmgAcc||0)+dmg;m.dmgHits=(m.dmgHits||0)+1;m.dmgT=0.25;
  }
  if(m.hp<=0&&!m.dead){m.dead=true;killMob(m);}
}
// ---- destructible furniture ----
function paintDestroy(f){
  var c=floorCv.getContext('2d');
  c.fillStyle='#20242c';c.fillRect(f.x-3,f.y-3,f.w+6,f.h+6);
  c.fillStyle='rgba(10,8,6,0.5)';
  c.beginPath();c.ellipse(f.x+f.w/2,f.y+f.h/2,f.w*0.62,f.h*0.62+8,0,0,TAU);c.fill();
  for(var j=0;j<8;j++){
    c.fillStyle='rgba(70,60,45,0.85)';
    c.save();c.translate(f.x+R()*f.w,f.y+R()*f.h);c.rotate(R()*3);
    c.fillRect(-8-R()*6,-2,14+R()*8,3+R()*2);
    c.restore();
  }
  c.fillStyle='rgba(223,230,238,0.4)';
  for(j=0;j<4;j++)c.fillRect(f.x+R()*f.w,f.y+R()*f.h,6,4);
}
function destroyFurn(f){
  if(f.dead)return;
  f.dead=true;rebuildObst();
  CAREER.totalFurn++;
  if(CAREER.totalFurn>=50)award('furn50');
  G.shake+=5;hitStopFx(0.05);
  NET.events.push({k:'furn',x:Math.round(f.x+f.w/2),y:Math.round(f.y+f.h/2),tp:f.t});
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
  floatText(f.x+f.w/2,f.y-4,'разрушено','#b09a72',11);
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
// диабло-смерть: стон, улетающая душа с выдохом, горсть монет
function dramaOfDeath(x,y,tp,elite){
  var pitch=tp==='deadline'?0.75:(elite?0.6:1.15+R()*0.25);
  var agony=R()<0.5; // амазонки Диабло: кто-то корчится, кто-то уходит с облегчением
  SFX.deathCry(pitch);
  spawnDebris({kind:'soul',x:x,y:y-6,pitch:pitch,elite:elite,mood:agony?'agony':'relief',t:0,life:agony?1.6:1.35});
  setTimeout(function(){
    if(agony)SFX.soulAgony(pitch*(elite?0.7:1));
    else SFX.soulSigh(pitch*(elite?0.7:1));
  },120);
  spawnCoinBurst(x,y,2+((R()*3)|0)+(elite?2:0));
}
function killMob(m){
  addXp((m.type==='deadline'?9:6)*(m.elite?2:1),m.x,m.y);
  for(var sci=0;sci<G.players.length;sci++){var pl=G.players[sci];
    pl.superC=Math.min(1,(pl.superC||0)+(m.elite?0.5:0.22)*(pl.superRate||1));
    if(pl.vamp)pl.burnout=Math.max(0,pl.burnout-pl.vamp);
  }
  NET.events.push({k:'die',x:Math.round(m.x),y:Math.round(m.y),tp:m.type,elite:m.elite?1:0});
  // комбо: серия убийств без получения урона
  G.combo=Math.min(9,(G.combo||0)+1);G.comboT=3;
  if(G.combo>=9)award('combo9');
  if(G.combo===5||G.combo===7||G.combo===9){
    var cn=COMBONAMES[G.combo];
    floatText(m.x,m.y-46,'×'+G.combo+' '+cn,'#ffcf5c',13,'C');
    if(G.combo>=3)spawnDebris({kind:'coin',x:m.x,y:m.y-8,vx:R()*120-60,vy:-140,vr:0,floorY:m.y+16,g:900,phys:1,coined:1,t:0,life:8});
  }
  if(R()<0.10&&G.texts.length<20&&flavorOK())floatText(m.x+R()*20-10,m.y-28,KILLQUOTES[(R()*KILLQUOTES.length)|0],'#8b949e',10,'F');
  if(m.elite){
    for(var ek=0;ek<3;ek++)spawnDebris({kind:'coin',x:m.x+R()*24-12,y:m.y-10,vx:R()*180-90,vy:-160-R()*120,vr:0,floorY:m.y+20+R()*20,g:900,phys:1,coined:1,t:0,life:8});
    if(R()<0.25)dropPickup(m.x,m.y,'coffee');
    floatText(m.x,m.y-60,'элитный уволился красиво','#c88a4a',12);
  }
  if(m.type==='intern'){G.killsI++;addOkr(1);}
  else if(m.type==='deadline'){G.killsD++;addOkr(2);}
  else if(m.type==='boss'){
    SFX.deathCry(0.5);
    CAREER.totalBoss++;award('boss1');
    spawnDebris({kind:'soul',x:m.x,y:m.y-10,pitch:0.55,elite:1,mood:R()<0.5?'agony':'relief',t:0,life:2.4});
    setTimeout(function(){if(R()<0.5)SFX.soulAgony(0.55);else SFX.soulSigh(0.55);},150);
  }
  if(m.type!=='boss')dramaOfDeath(m.x,m.y,m.type,m.elite);
  else if(m.type==='boss'){
    G.okr+=10;msg('Аудит завершён. Замечаний нет.',3.5);SFX.explode();G.shake+=10;
    for(var i=0;i<16;i++)spawnDebris({kind:'coin',x:m.x+R()*60-30,y:m.y+R()*40-20,vx:R()*300-150,vy:-180-R()*200,vr:0,floorY:m.y+30+R()*60,g:1000,phys:1,coined:1,t:0,life:9});
    for(var i=0;i<3;i++)dropPickup(m.x+R()*60-30,m.y+R()*60-30,'coffee');
    dropPickup(m.x,m.y,['espresso','desk','cert'][(R()*3)|0]);
    dropPickup(m.x+20,m.y,['espresso','desk','cert'][(R()*3)|0]);
    addXp(150,m.x,m.y);
    if(G.wave>=G.campaign&&!G.winShown){G.winShown=true;G.winT=1.6;}
    else if(G.wave<G.campaign)msg('Аудит пройден. Начальство довольно. Впереди ещё спринты.',4);
    G.boss=null;return;
  }
  for(var j=0;j<12;j++)G.fx.push({type:'paper',x:m.x,y:m.y,vx:R()*240-120,vy:R()*240-120,rot:R()*3,vr:R()*8-4,t:0,life:0.7+R()*0.5});
  for(j=0;j<5;j++)G.fx.push({type:'spark2',x:m.x,y:m.y,t:0,life:0.3,a:R()*TAU});
  G.shake+=2;
  NET.events.push({k:'hs',v:0.02});
  if(R()<0.12)dropPickup(m.x,m.y,'coffee');
  if(R()<0.035)dropPickup(m.x,m.y,['espresso','desk','cert'][(R()*3)|0]);
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
function meleeArc(pl,arc,rad,dmg,knock,stun){
  var hit=false,i;
  for(i=0;i<G.mobs.length;i++){var m=G.mobs[i];
    var d=dist(pl,m);
    if(d<rad+m.r&&Math.abs(angDiff(pl.aim,angTo(pl,m)))<arc/2){
      var a=angTo(pl,m);damageMob(m,dmg*pl.dmgMult,Math.cos(a)*knock,Math.sin(a)*knock,stun);hit=true;
    }
  }
  if(G.boss){var m2=G.boss,d2=dist(pl,m2);
    if(d2<rad+m2.r&&Math.abs(angDiff(pl.aim,angTo(pl,m2)))<arc/2){
      damageMob(m2,dmg*pl.dmgMult,0,0,0);hit=true;
    }
  }
  furnInArc(pl,arc,rad,dmg*pl.dmgMult);
  return hit;
}
