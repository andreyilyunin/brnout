'use strict';
// ============================== loop ==============================
var lastT=0;
var CAP_MS=1000/60-2; // 120Гц ProMotion без капа жгут конвейер вдвое; −2мс — джиттер-запас для честных 60Гц
// ?fps=1 — маленький счётчик кадров: разницу до/после оптимизаций видно глазами
var FPS_EL=null,fpsN=0,fpsMark=0;
try{
  if(/[?&]fps=1/.test(location.search)){
    FPS_EL=document.createElement('div');
    FPS_EL.style.cssText='position:fixed;top:2px;left:50%;transform:translateX(-50%);z-index:99;background:rgba(5,7,10,.75);color:#8bd17c;font:11px "IBM Plex Mono",monospace;padding:2px 7px;border-radius:4px;pointer-events:none';
    document.body.appendChild(FPS_EL);
  }
}catch(e){}
function loop(ts){
  requestAnimationFrame(loop);
  if(FPS_EL){fpsN++;if(ts-fpsMark>=500){FPS_EL.textContent=Math.round(fpsN*1000/(ts-fpsMark))+' fps';fpsN=0;fpsMark=ts;}}
  if(lastT&&ts-lastT<CAP_MS)return; // ждём свой слот: dt честно накопится к следующему кадру
  var dt=Math.min(0.05,(ts-lastT)/1000||0.016);
  lastT=ts;
  if(G.state==='playing'&&!MUS.on)startMusic();
  if(G.state!=='playing'&&G.state!=='win'&&MUS.on)stopMusic();
  if(G.state==='playing'||G.state==='win'||NET.mode==='guest'){
    keysToInput();
    refreshAim();
    if(NET.mode!=='guest'){
      var me=localPlayer();
      if(me){me.ix=INPUT.ix;me.iy=INPUT.iy;me.aim=INPUT.aim;me.f1=INPUT.f1||INPUT.f1Tap;INPUT.f1Tap=false;me.ult=INPUT.ultTap;INPUT.ultTap=false;me.fk=INPUT.fk;me.f2=INPUT.f2;me.sk=INPUT.sk;me.sk2=INPUT.sk2;me.cf=INPUT.cf;INPUT.cf=false;}
    }else guestLocalAttackCosmetics();
    try{update(dt);updateCamera(dt,false);}
    catch(e){console.error('update:',e);}
  }
  perkMaybe();
  try{render();
    var fsB=document.getElementById('btnFS');
    if(fsB)fsB.classList.toggle('hidden',G.state==='playing'&&!isTouch); // тачу кнопка нужна и в бою; десктоп — от случайных кликов прячем
  }catch(e){console.error('render:',e);}
}

// ============================== perks ==============================
var PERKSEL=[];
function rollPerks(){
  PERKSEL=[];
  var meL=localPlayer();
  var owned={};
  if(meL)for(var oi=0;oi<meL.perks.length;oi++)owned[meL.perks[oi]]=1;
  var rares=[],commons=[],stale=[];
  for(var pi=0;pi<PERKS.length;pi++){
    var pk=PERKS[pi];
    if(pk.cls&&pk.cls.indexOf(NET.cls)<0)continue; // поведенческие — только своему классу
    if(pk.r==='r'){if(!owned[pk.id])rares.push(pk);}
    else(owned[pk.id]?stale:commons).push(pk); // взятые обычные — в запас на случай пустого пула
  }
  if(rares.length&&R()<0.45)PERKSEL.push(rares.splice((R()*rares.length)|0,1)[0]);
  var pool=rares.concat(commons);
  while(PERKSEL.length<2&&pool.length){
    var idx=(R()*pool.length)|0;
    PERKSEL.push(pool.splice(idx,1)[0]);
  }
  while(PERKSEL.length<2&&stale.length){ // пул исчерпан — повтор лучше пустой карточки
    var si=(R()*stale.length)|0;
    PERKSEL.push(stale.splice(si,1)[0]);
  }
}
function perkMaybe(){
  if(G.perkQueue<=0||G.state!=='playing'||OV_OPEN)return;
  rollPerks();
  var el=$('perkCards');
  el.innerHTML='';
  for(var i=0;i<PERKSEL.length;i++)(function(i,pk){
    var b=document.createElement('button');
    b.className='perkcard'+(pk.r==='r'?' rare':'');
    b.innerHTML='<b>'+pk.n+'</b><span>'+pk.d+'</span>'+(pk.r==='r'?'<i>РЕДКИЙ</i>':'');
    b.addEventListener('click',function(){pickPerk(i);});
    el.appendChild(b);
  })(i,PERKSEL[i]);
  $('perkSub').textContent='уровень '+G.level+' · '+clsName(NET.cls)+(G.perkQueue>1?' · осталось выборов: '+G.perkQueue:'');
  showOv('bperk');
}
function pickPerk(i){
  var pk=PERKSEL[i];if(!pk||OV_OPEN!=='bperk')return;
  var me=localPlayer();
  if(me){pk.f(me);me.perks.push(pk.id);}
  if(NET.mode==='guest'&&NET.hostConn){try{NET.hostConn.send({t:'perk',p:pk.id});}catch(e){}}
  G.perkQueue=Math.max(0,G.perkQueue-1);
  SFX.grade();
  if(me)floatText(me.x,me.y-40,pk.n,'#ffcf5c',14);
  if(G.perkQueue>0){showOv(null);perkMaybe();}
  else showOv(null);
}
function clsName(c){return CLS[c]?CLS[c].name:'???';}
window.addEventListener('keydown',function(e){
  if(OV_OPEN!=='bperk')return;
  if(e.code==='Digit1')pickPerk(0);
  else if(e.code==='Digit2')pickPerk(1);
});

// ============================== menu wiring ==============================
function $(id){return document.getElementById(id);}
var menuMode='solo';
var selCls='mgr';
function refreshMenuUI(){
  for(var i=0;i<_cards.length;i++){
    var el=document.getElementById(_cards[i][0]);
    if(el){
      var on=_cards[i][1]===selCls;
      el.classList.toggle('sel',on);
      el.setAttribute('aria-pressed',on?'true':'false');
    }
  }
  var joining=!!PENDING_JOIN;
  $('mSolo').classList.toggle('on',!joining&&menuMode==='solo');
  $('mCoop').classList.toggle('on',!joining&&menuMode==='coop');
  $('mSolo').classList.toggle('hidden',joining);
  $('mCoop').classList.toggle('hidden',joining);
  $('mStart').textContent=joining?('ВОЙТИ В КОМНАТУ '+PENDING_JOIN.toUpperCase()+' →'):(menuMode==='solo'?'НАЧАТЬ СМЕНУ':'В КОМНАТУ →');
}
function selectClass(cls){
  selCls=cls;
  NET.cls=cls;
  audioInit();SFX.clsPick(); // сочный аккорд на выбор класса (ТЗ UI)
  refreshMenuUI();
  updateDetail();
}
function updateDetail(){
  var C=CLS[selCls];
  if(!C)return;
  $('detName').textContent=(C.name||'').toUpperCase();
  $('detRole').textContent=C.role||'';
  $('detBio').textContent=C.bio||'';
  var ph=$('bgPhoto');
  if(ph&&PHOTOSRC[selCls]){
    ph.src=PHOTOSRC[selCls];
    ph.classList.toggle('photo-pix',!PORTRAIT_FILES[selCls]); // процедурные 88×156 — только pixelated
  }
  var box=$('detSkills');
  if(!box)return;
  box.innerHTML='';
  var list=[C.s1,C.s2,C.ult,C.sk];
  for(var i=0;i<list.length;i++){
    var s=list[i];
    if(!s)continue;
    var row=document.createElement('div');row.className='bskill';
    var nm=document.createElement('b');nm.textContent=s.n;
    var ds=document.createElement('p');ds.textContent=s.d||'';
    row.appendChild(nm);row.appendChild(ds);
    box.appendChild(row);
  }
}
var _cards=[['rmgr','mgr'],['rdev','dev'],['rmkt','mkt'],['rdsn','dsn']];
for(var _ci=0;_ci<_cards.length;_ci++)(function(cid,cls){
  var el=document.getElementById(cid);
  el.addEventListener('click',function(){selectClass(cls);});
})(_cards[_ci][0],_cards[_ci][1]);
document.getElementById('classCards').addEventListener('keydown',function(e){
  var idx=-1;
  for(var i=0;i<_cards.length;i++)if(_cards[i][1]===selCls)idx=i;
  if(e.code==='ArrowRight'||e.code==='ArrowLeft'||e.code==='ArrowUp'||e.code==='ArrowDown'){
    e.preventDefault();
    var ni=(idx+(e.code==='ArrowRight'||e.code==='ArrowDown'?1:_cards.length-1))%_cards.length;
    selectClass(_cards[ni][1]);
    var nel=document.getElementById(_cards[ni][0]);
    if(nel)nel.focus();
  }else if(e.code==='Enter'&&OV_OPEN==='bmenu'){document.getElementById('mStart').click();}
});
$('mSolo').addEventListener('click',function(){menuMode='solo';refreshMenuUI();});
$('mCoop').addEventListener('click',function(){menuMode='coop';refreshMenuUI();});
function connectGuest(code){
  audioInit();
  showOv('bwait');
  $('netStatus').textContent='Подключение…';
  guestJoin(code,function(err){
    if(err){
      $('netStatus').textContent='';
      showOv('bjoin'); // код известен — пусть правит в форме, там есть строка ошибки
      document.getElementById('joinCode').value=code;
      $('joinErr').textContent=err==='nobroker'?'Брокеры недоступны — проверьте интернет':'Комната не отвечает. Хост ещё в игре?';
      destroyNet();
    }else{
      audioInit();startAmbient();
      $('netStatus').textContent='Подключено. Ждём хоста…';
    }
  });
}
$('mStart').addEventListener('click',function(){
  audioInit();
  if(PENDING_JOIN){connectGuest(PENDING_JOIN);return;}
  if(menuMode==='solo')startLocal();
  else showOv('bcoop');
});
$('mSettings').addEventListener('click',function(){showOv('bset');});
$('bsetBack').addEventListener('click',function(){showOv('bmenu');});
$('mCareer').addEventListener('click',function(){careerRender();showOv('bcareer');});
$('bcareerBack').addEventListener('click',function(){showOv('bmenu');});
function careerRender(){
  $('crRuns').textContent=CAREER.runs;
  $('crSprint').textContent=CAREER.bestSprint;
  $('crOkr').textContent=CAREER.bestOkr;
  $('crCoins').textContent=CAREER.bestCoins;
  $('crInterns').textContent=CAREER.totalInterns+CAREER.totalDeadlines;
  $('crBoss').textContent=CAREER.totalBoss;
  $('crFurn').textContent=CAREER.totalFurn;
  $('crDeaths').textContent=CAREER.deaths;
  var got=0;
  for(var k in CAREER.ach)if(CAREER.ach[k])got++;
  var html='<div class="crtitle">ДОСТИЖЕНИЯ · '+got+'/'+ACHS.length+'</div>';
  for(var i=0;i<ACHS.length;i++){var a=ACHS[i],on=CAREER.ach[a.id];
    html+='<div class="crrow'+(on?' on':'')+'"><b>'+(on?a.n:'???')+'</b><span>'+a.d+'</span></div>';
  }
  $('crAch').innerHTML=html; /*safe: имена/описания только из констант ACHS*/
}
refreshMenuUI();
renderClassPortraits();
updateDetail();
$('cHost').addEventListener('click',function(){
  showOv('bhost');
  $('roomCode').textContent='…';
  $('shareHint').textContent='соединяемся с брокером…';
  destroyNet();LOBBY=[]; // повторный клик не должен течь прошлой комнатой
  hostCreate(function(err){
    if(err){$('roomCode').textContent='-----';
      $('shareHint').textContent=(err==='nobroker'?'ни один брокер недоступен — проверьте интернет':'брокер недоступен, попробуйте ещё раз');
      return;}
    audioInit();startAmbient();
    $('shareHint').textContent='ссылка сама введёт код другу · или продиктуйте код';
  });
});
$('bshare').addEventListener('click',function(){shareInvite($('bshare'));});
$('pauseShare').addEventListener('click',function(){shareInvite($('pauseShare'));});
$('bBack2').addEventListener('click',function(){showOv('bmenu');});   // кооп -> меню
$('bBack3').addEventListener('click',function(){showOv('bcoop');});   // ввод кода -> кооп
$('bBack4').addEventListener('click',function(){                       // выход из лобби хоста
  try{broadcast({t:'stt',s:'paused'});}catch(e){}
  destroyNet();LOBBY=[];showOv('bmenu');
});
$('joinCode').addEventListener('keydown',function(e){if(e.code==='Enter')$('bjoinGo').click();});
$('cJoin').addEventListener('click',function(){showOv('bjoin');$('joinErr').textContent='';});
$('bjoinGo').addEventListener('click',function(){
  var code=$('joinCode').value.trim().toLowerCase();
  if(code.length!==5||!/^[a-z0-9]{5}$/.test(code)){$('joinErr').textContent='Код из 5 символов (латиница)';return;}
  connectGuest(code);
});
$('bLeaveWait').addEventListener('click',function(){
  try{if(NET.hostConn)NET.hostConn.send({t:'leave'});}catch(e){}
  destroyNet();LOBBY=[];showOv('bmenu');
});
$('bstart').addEventListener('click',function(){if(NET.mode==='host')hostStartGame();});
$('bresume').addEventListener('click',function(){togglePause();});
$('brestart').addEventListener('click',function(){
  if(NET.mode==='host')hostStartGame();
  else startLocal();
});
$('bmute').addEventListener('click',function(){
  muted=!muted;
  applyVolumes();
  $('bmute').textContent='Звук: '+(muted?'выкл':'вкл');
});
function sndUI(id,key){
  var el=$(id);if(!el)return;
  el.value=Math.round(SET[key]*100);
  var lab=$(id+'V');
  if(lab)lab.textContent=Math.round(SET[key]*100)+'%';
  el.addEventListener('input',function(){
    SET[key]=el.value/100;applyVolumes();saveVolumes();
    if(lab)lab.textContent=el.value+'%';
  });
}
sndUI('sndMaster','master');sndUI('sndMusic','music');sndUI('sndSfx','sfx');
$('bleave').addEventListener('click',function(){
  try{if(NET.hostConn)NET.hostConn.send({t:'leave'});}catch(e){}
  try{broadcast({t:'stt',s:'dead'});}catch(e){}
  destroyNet();LOBBY=[];G.state='menu';VIEW.players=[];VIEW.mobs=[];VIEW.boss=null;
  showOv('bmenu');
});
$('bagain').addEventListener('click',function(){
  if(NET.mode==='host')hostStartGame();
  else if(NET.mode==='solo')startLocal();
});
$('bmenu2').addEventListener('click',function(){
  destroyNet();LOBBY=[];G.state='menu';VIEW.players=[];VIEW.mobs=[];VIEW.boss=null;
  showOv('bmenu');
});
$('bcontinue').addEventListener('click',function(){
  if(NET.mode==='guest')return;
  G.state='playing';showOv(null);G.fadeT=0.9;
});
window.addEventListener('blur',function(){
  INPUT.f1=false;INPUT.f2=false;INPUT.sk=false;
  keys={};
});

// ============================== init ==============================
function resize(){
  var r=root.getBoundingClientRect();
  DPR=Math.min(2,window.devicePixelRatio||1);
  cv.width=Math.max(320,Math.round(r.width*DPR));
  cv.height=Math.max(240,Math.round(r.height*DPR));
  ctx.imageSmoothingEnabled=true;
  bhud.width=Math.max(320,Math.round(r.width*DPR));
  bhud.height=Math.max(240,Math.round(r.height*DPR));
  G.zoom=clamp(r.width/900,0.55,1.15);
  drawPost.vg=null;
}
window.addEventListener('resize',resize);
if(window.ResizeObserver){new ResizeObserver(resize).observe(root);}
buildMap(20261020);
for(var mi=0;mi<GW*GH;mi++)FOG.explored[mi]=1; // фон меню: офис виден до старта
resize();
window.__bo={G:G,NET:NET,VIEW:VIEW,INPUT:INPUT,startLocal:startLocal,hostStartGame:hostStartGame,buildMap:buildMap,
  spawns:function(){return SPAWNS;},rooms:function(){return ROOMS;},blockedAt:blockedAt,
  furn:function(){return FURN;},obst:function(){return OBST;},coffees:function(){return COFFEES;},damageFurn:damageFurn,damageMob:damageMob,
  debris:function(){return DEBRIS;},water:function(){return WATER;},pfx:function(){return PFX;},spawnStone:spawnStone,spawnWater:spawnWater,
  connCheck:function(){return unreachableRooms().length;},
  connDetail:function(){
    var bad=unreachableRooms();
    var out={badRooms:[],gridDump:[]};
    for(var i=0;i<bad.length;i++)
      out.badRooms.push({i:ROOMS.indexOf(bad[i]),t:bad[i].type,cx:bad[i].tx+((bad[i].tw/2)|0),cy:bad[i].ty+((bad[i].th/2)|0)});
    if(out.badRooms.length){
      var lb=lobbyRoom();
      var seen=floodFrom.apply(null,roomCenter(lb));
      var b0=out.badRooms[0];
      for(var yy=Math.max(0,b0.cy-3);yy<=Math.min(GH-1,b0.cy+3);yy++){
        var row='';
        for(var xx=Math.max(0,b0.cx-5);xx<=Math.min(GW-1,b0.cx+5);xx++)
          row+=grid[yy][xx]?(seen[xx+','+yy]?'o':'x'):'#';
        out.gridDump.push(row);
      }
    }
    return out;
  },
  spawns:function(){return SPAWNS;},rooms:function(){return ROOMS;},blockedAt:blockedAt,
  furn:function(){return FURN;},obst:function(){return OBST;},coffees:function(){return COFFEES;},damageFurn:damageFurn,damageMob:damageMob,
  debris:function(){return DEBRIS;},water:function(){return WATER;},pfx:function(){return PFX;},spawnStone:spawnStone,spawnWater:spawnWater,
  step:function(n){
    for(var i=0;i<(n||1);i++){
      if(NET.mode!=='guest'){
        var me=localPlayer();
        if(me){me.ix=INPUT.ix;me.iy=INPUT.iy;me.aim=INPUT.aim;me.f1=INPUT.f1||INPUT.f1Tap;INPUT.f1Tap=false;me.ult=INPUT.ultTap;INPUT.ultTap=false;me.fk=INPUT.fk;me.f2=INPUT.f2;me.sk=INPUT.sk;me.sk2=INPUT.sk2;me.cf=INPUT.cf;INPUT.cf=false;}
      }
      update(1/60);
    }
  }};
requestAnimationFrame(loop);
// вход по инвайт-ссылке: ?join=code — друг выбирает класс в меню и жмёт «ВОЙТИ В КОМНАТУ»
var PENDING_JOIN=null;
try{
  var _jc=new URL(location.href).searchParams.get('join');
  if(_jc&&/^[a-z0-9]{5}$/i.test(_jc)){
    PENDING_JOIN=_jc.toLowerCase();
    var _tag=document.querySelector('#bmenu .bgtag');
    if(_tag)_tag.textContent='вас позвали в комнату '+PENDING_JOIN.toUpperCase()+' — выберите класс';
    refreshMenuUI();
  }
}catch(e){}

// бут: меню открыто по HTML — фиксируем OV_OPEN, иначе тач-HUD рисуется поверх меню
try{showOv('bmenu');}catch(e){}

// телефон в руках с первого кадра: тач-HUD не ждёт первого касания (гибриды откатит движение мыши)
try{
  if(navigator.maxTouchPoints>0&&window.matchMedia&&matchMedia('(pointer:coarse)').matches)enableTouch();
}catch(e){}
