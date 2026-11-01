'use strict';

var OVERLAYS=['bmenu','bset','bcareer','bcoop','bjoin','bhost','bwait','bpause','bdead','bwin','bperk'];
var OV_BACK={bset:'bmenu',bcareer:'bmenu',bcoop:'bmenu',bjoin:'bcoop',bhost:'bcoop',bwait:'bmenu',bpause:'bmenu'};
var OV_OPEN=null;
function showOv(id){
  for(var i=0;i<OVERLAYS.length;i++){var el=document.getElementById(OVERLAYS[i]);if(el)el.classList.add('bghidden');}
  if(id)document.getElementById(id).classList.remove('bghidden');
  OV_OPEN=id||null;
  tuiSync();
  try{window.scrollTo(0,0);}catch(e){}
}

function tuiSync(){
  var show=isTouch&&!OV_OPEN;
  var tui=document.getElementById('tui');
  if(tui)tui.classList.toggle('hidden',!show);
  var pm=document.getElementById('btnPauseM');
  if(pm)pm.classList.toggle('hidden',!show);
  var jh=document.getElementById('joyHint');
  if(jh)jh.classList.toggle('hidden',!(show&&!joyHinted));
}

var LEARN_SHOWN=false;
function touchLearnStart(){
  if(LEARN_SHOWN)return;
  LEARN_SHOWN=true;
  var root=document.getElementById('burnout');
  if(!root||G.training)return;
  if(isTouch){
    root.classList.add('tlearn');
    setTimeout(function(){root.classList.remove('tlearn');},12000);
  }else{
    var dh=document.getElementById('deskHint');
    if(dh){dh.classList.remove('hidden');setTimeout(function(){dh.classList.add('hidden');},10000);}
  }
}
function updateCoach(){
  var el=document.getElementById('coach');if(!el)return;
  var text='';
  if(G.training&&G.state==='playing'&&!OV_OPEN){
    if(G.wave===0)text=isTouch?'1 · Двигайся пальцем по левой половине экрана':'1 · Двигайся: WASD или стрелки';
    else if(G.wave===1&&G.waveState==='cleared')text='Спринт закрыт · забери кофе и выбери усиление';
    else if(G.wave===1&&G.killsI>0)text='3 · Не дай выгоранию достичь 100%';
    else if(G.wave===1)text=isTouch?'2 · УДАР · прицел выбирается автоматически':'2 · Атакуй мышью: ЛКМ';
    else if(G.wave===2)text=isTouch?'ПРИЁМ + РЫВОК открыты · рывок спасает от удара':'ПКМ + ПРОБЕЛ открыты · рывок спасает от удара';
    else if(G.wave===3)text=isTouch?'СКИЛ + УМЕНИЕ открыты · они тратят кофе':'Q + E открыты · приёмы тратят кофе';
  }
  if(el._text!==text){el._text=text;el.textContent=text;el.classList.toggle('hidden',!text);}
}
function syncTouchAbilities(){
  var map={btnAlt:'secondary',btnSkill:'dodge',btnSkill2:'skill',btnFU:'skill',btnR:'super'};
  for(var id in map){var el=document.getElementById(id);if(el)el.classList.toggle('hidden',!abilityUnlocked(map[id]));}
}
function showDeadStats(st){
  st=st||{sprint:Math.max(0,G.wave-1),okr:G.okr,ki:G.killsI,kd:G.killsD,gr:G.grade};
  document.getElementById('dSprint').textContent=st.sprint;
  document.getElementById('dOkr').textContent=st.okr;
  document.getElementById('dIntern').textContent=st.ki;
  document.getElementById('dDeadline').textContent=st.kd;
  document.getElementById('dGrade').textContent=st.gr;

  var board=document.getElementById('dBoard');
  var players=worldPool('players');
  if(players.length>1){
    var rows=players.map(function(p,i){
      return{name:(CLS[p.cls]?CLS[p.cls].name:'???'),okr:G.okr,me:p.id===NET.myId,pi:i};
    }).map(function(r){r.score=r.okr*10;return r;})
      .sort(function(a,b){return b.score-a.score;});
    var html='<div style="text-align:center;color:#8b949e;font-size:11px;margin-bottom:4px">ЛИДЕРБОРД</div>';
    for(var i2=0;i2<rows.length;i2++){var r2=rows[i2];
      html+='<div class="row'+(r2.me?' me':'')+'"><span>'+(i2+1)+'. '+r2.name+(r2.me?' (вы)':'')+'</span><span><b>'+r2.score+'</b> OKR</span></div>';
    }
    board.innerHTML=html; /*safe*/
    board.classList.remove('hidden');
  }else board.classList.add('hidden');
  var me=localPlayer(),causes={deadline:'Причина: взрыв дедлайна · держи дистанцию',stone:'Причина: словесный удар · уходи с красной линии',boss:'Причина: аудит · уходи из красной зоны',hr:'Причина: фидбэк HR · уходи с линии броска',rival:'Причина: удар конкурента · рывок спасает от замаха',lead:'Причина: разбор полётов тимлида · держи дистанцию'};
  document.getElementById('dCause').textContent=causes[me&&me.lastDamage]||'Причина: выгорание достигло 100%';
  var next=careerNextUnlock(),goal=document.getElementById('dGoal');
  goal.textContent=next?('Следующая награда: «'+next.n+'» — ещё '+Math.max(1,next.at-CAREER.bestSprint)+' спр.'):'Все косметические награды открыты · побей свой рекорд';
  var unlocked=document.getElementById('dUnlock');
  if(G.newUnlocks&&G.newUnlocks.length){unlocked.textContent='ОТКРЫТО: '+G.newUnlocks[G.newUnlocks.length-1].n;unlocked.classList.remove('hidden');}
  else unlocked.classList.add('hidden');
  var again=document.getElementById('bagain');
  again.classList.toggle('hidden',NET.mode==='guest');
  document.getElementById('dHr').textContent=HRPHRASES[(Math.random()*HRPHRASES.length)|0];
  showOv('bdead');
}
function showVictory(){
  var te=document.getElementById('winTitle'),tg=document.getElementById('winTag');
  if(te)te.textContent='ПРОЕКТ ЗАВЕРШЁН';
  if(tg)tg.textContent='Проект сдан. Первая правка от заказчика уже ждёт нового героя.';
  showOv('bwin');
}
function togglePause(){
  if(G.state==='playing'){
    G.state='paused';showOv('bpause');
    if(NET.mode==='host')broadcast({t:'stt',s:'paused'});
  }else if(G.state==='paused'){
    G.state='playing';showOv(null);
    if(NET.mode==='host')broadcast({t:'stt',s:'playing'});
  }else if(NET.mode==='guest'){
    if(!document.getElementById('bpause').classList.contains('bghidden'))showOv(null);
    else showOv('bpause');
  }

  var pn=document.getElementById('pauseNet'),pc=document.getElementById('pauseCode'),ps=document.getElementById('pauseShare');
  var isHost=NET.mode==='host'&&!!NET.code;
  if(pn)pn.classList.toggle('hidden',!isHost);
  if(ps)ps.classList.toggle('hidden',!isHost);
  if(isHost&&pc)pc.textContent=NET.code;
}
