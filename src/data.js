'use strict';

var CLS={
  mgr:{name:'менеджер',weapon:'tickets',role:'дальний бой · командные бафы',
    bio:'Пережил три ребрендинга, две смены руководства и один настоящий аудит. Дерётся тем, что всегда под рукой: чужими тикетами и собственной массой. В резюме — «стрессоустойчивый». В жизни — да.',
    s1:{n:'тикет',cd:0.36,cost:0,d:'JIRA-тикет, запущенный прямо во врага. Приоритет: критический. Исполнитель: противник. Срок: вчера.'},
    s2:{n:'жир панч',cd:0.55,cost:6,d:'Хлёсткий удар всей корпоративной массой. Слышно на этаж выше, чувствуется на два грейда ниже.'},
    ult:{n:'созвон',cd:8,cost:35,d:'«Так, у меня созвон» — и вокруг менеджера образуется зона, куда никто не решается подойти. Даже стажёры с горящими дедлайнами.'},
    sk:{n:'АСАП',cd:10,cost:25,d:'Крик «АСАП!» ускоряет менеджера и коллег рядом. Паника — тоже стимулятор, и он бесплатный.'}},
  dev:{name:'программист',weapon:'keyboard',role:'ближний бой · контроль',
    bio:'Пишет код так, что он переживёт ребрендинг, кризис и саму компанию. В худи потому, что в опенспейсе дует, а не потому, что мрачный. Пятничный деплой — не безрассудство, а спокойная уверенность в тестах.',
    s1:{n:'клава',cd:0.42,cost:0,d:'Механическая клавиатура на синих свитчах. Слышно с соседнего этажа — и это часть урона.'},
    s2:{n:'хоткей',cd:0.85,cost:10,d:'Ctrl+Shift+Esc по площади: всех вокруг отбрасывает и больно бьёт. Кто не выучил хоткеи — идёт в окно. Буквально.'},
    ult:{n:'звук клавы',cd:7,cost:30,d:'Три секунды непрерывного клацанья на 140 знаков в минуту. Враги замирают, заворожённые звуком чужой продуктивности.'},
    sk:{n:'легаси-код',cd:9,cost:25,d:'Цепляет до шести врагов легаси-кодом. Дальше боль передаётся по цепочке — как правки от архитектора.'}},
  mkt:{name:'маркетолог',weapon:'plane',role:'дальний бой · дебаффы',
    bio:'Ведёт канал «Как выжить в корпоративном аду» изнутри корпоративного ада. Никого не спас, зато охваты. Искренне верит, что делает мир лучше.',
    s1:{n:'твит',cd:0.3,cost:0,d:'Пост прямо во врага. Урона немного, зато он навсегда останется в интернете.'},
    s2:{n:'воронка',cd:0.9,cost:8,d:'Стягивает всех в конусе ближе: теперь они не враги, а лиды. Дальше по воронке — только боль.'},
    ult:{n:'ребрендинг',cd:12,cost:35,d:'Меняет врагам миссию, слоган и ценности. Четыре секунды мобы не понимают, зачем вообще пришли на работу.'},
    sk:{n:'таргетинг',cd:9,cost:20,d:'Метит до пяти врагов персонализированной рекламой. Помеченные получают на 50% больше урона: big data не прощает.'}},
  dsn:{name:'дизайнер',weapon:'stylus',role:'скорость · ближний бой',
    bio:'Сделала логотип за вечер — пять лет оправдывается. Визор не снимает даже ночью: где-то в темноте может оказаться Comic Sans.',
    s1:{n:'стилус',cd:0.28,cost:0,d:'Стилус по хребту врага. Защитное стекло не снимает даже в бою: стекло — часть личности.'},
    s2:{n:'критика',cd:1.0,cost:8,d:'Волна правок на 200 градусов. Отбрасывает всех, кто хоть раз говорил «а можно логотип побольше».'},
    ult:{n:'мудборд',cd:10,cost:35,d:'Раскрывает мудборд: палитра, шрифты, вдохновение. Враги получают урон и полторы секунды осознания, что их бренд никогда не взлетит.'},
    sk:{n:'логотип побольше',cd:8,cost:15,d:'Кричит то, что слышит каждый день. Волна на 360° отбрасывает всех вокруг и сбивает замахи: клиенты разлетаются, правки отменяются.'}}
};
var NET={mode:'solo',peer:null,conns:[],hostConn:null,code:'',myId:'me',snapT:0,events:[],cls:'mgr',lastSent:0,started:false,broker:'',lastRecv:0,reconnecting:false,reconnectTries:0};
var PCOLORS=['#e6edf3','#d29922','#7aa2c8','#3fb950'];
var G={state:'menu',t:0,players:[],mobs:[],projs:[],fx:[],texts:[],pickups:[],zones:[],
  boss:null,wave:0,waveState:'calm',waveT:1.5,rushT:0,spawnQ:[],spawnT:0,okr:0,grade:1,
  interT:0,fadeT:0,pendSeed:0,nextTheme:'',interStats:null,
  level:1,xp:0,xpN:40,plan:0,sepT:0,demon:null,ultAt:4,campaign:10,perkQueue:0,
  killsI:0,killsD:0,bossN:0,winShown:false,winT:0,shake:0,hitStop:0,msg:'',msgT:0,caption:'',capT:8,delays:[],
  combo:0,comboT:0,hsCd:0,flavorT:0,
  camX:0,camY:0,zoom:1,mobSeq:0,pkSeq:0};
var COMBONAMES=['','синергия!','пролистал инбокс!','закрыл спринт!','переработал!','тимлид года!','выгорел красиво!','легенда офиса!','машина задач!','БОГ ВЫГОРАНИЯ!'];
var KILLQUOTES=['отчислен','нашёл работу получше','ушёл на обед','передумал гореть','сбегал в Дубай','отпуск за свой счёт','это не его роль'];
var SPRINTNAMES=['обычный спринт','спринт горящих дедлайнов','квартальный отчёт','пятничный деплой','аудит недели','хакатон ночами','планёрка без конца'];
var HRPHRASES=['HR передаёт: «мы ценим каждого». Кроме вас.','Ваш грейд перенесён в архив. Вместе с вами.','Соболезнуем. Письмо о закрытии задач уже отправлено.','На вашем месте уже видят другого. Он моложе.'];
var LOBBY=[];
function localPlayer(){
  var pool=(NET.mode==='guest')?VIEW.players:G.players;
  for(var i=0;i<pool.length;i++)if(pool[i].id===NET.myId)return pool[i];
  return pool[0];
}

var LOOKS=[
 {skin:'#e8c39e',hair:'#3a2a1a',hs:0,shirt:'#33303a',accent:'#7a1f1f'},
 {skin:'#d9b48f',hair:'#1e1a16',hs:1,shirt:'#2b2a2e',accent:'#54483c'},
 {skin:'#f0d0b0',hair:'#7a4a20',hs:2,shirt:'#3e3040',accent:'#8a6d3b'},
 {skin:'#c99a75',hair:'#101010',hs:3,shirt:'#2e3c34',accent:'#7a8a74'},
 {skin:'#e8c39e',hair:'#c9c9c9',hs:2,shirt:'#4a2626',accent:'#c49a3d'},
 {skin:'#d9b48f',hair:'#5a3a1a',hs:1,shirt:'#2e3a44',accent:'#6e8a9a'},
 {skin:'#f0d0b0',hair:'#2a2a2a',hs:0,shirt:'#3c3228',accent:'#8ba36e'},
 {skin:'#c99a75',hair:'#8a2a2a',hs:2,shirt:'#333840',accent:'#c47a54'}
];
var HOODIES=[
 {skin:'#e8c39e',hair:'#3a2a1a',hs:1,shirt:'#3a3d42',accent:'#4d5158'},
 {skin:'#d9b48f',hair:'#20180f',hs:1,shirt:'#34373c',accent:'#45494f'},
 {skin:'#f0d0b0',hair:'#6a3a1a',hs:0,shirt:'#40434a',accent:'#53575e'},
 {skin:'#c99a75',hair:'#111111',hs:2,shirt:'#2f3236',accent:'#404449'}
];

var SKINS=['#e8c39e','#d9b48f','#f0d0b0','#c99a75'];
var CLSLOOKS={
 mgr:{hair:'#4a3220',hs:0,shirt:'#6e747a',accent:'#8b2020'},
 dev:{hair:'#3a2a1a',hs:1,shirt:'#39445c',accent:'#c9cede'},
 mkt:{hair:'#6a4a2c',hs:2,shirt:'#f06aa2',accent:'#f2e8ee'},
 dsn:{hair:'#2e262b',hs:2,shirt:'#e08a30',accent:'#5fd0c0'}

};
function classLook(cls,seat){
  var L={};
  for(var k in CLSLOOKS[cls]||CLSLOOKS.mgr)L[k]=CLSLOOKS[cls][k];
  L.skin=SKINS[(seat||0)%SKINS.length];
  return L;
}
function newPlayer(id,cls){
  var lb=lobbySpawn();
  return{id:id,cls:cls,x:lb.x+lb.w/2+(R()*120-60),y:lb.y+lb.h/2+(R()*120-60),r:18,spd:210,spdMult:1,dmgMult:1,
    burnout:0,coffee:60,coffeeMax:100,face:0,
    dmgBonus:0,critBonus:0,cdMult:1,costMult:1,dodgeCdMult:1,vamp:0,coffeeRegen:0,superRate:1,drMult:1,perks:[],
    cd1:0,cd2:0,cdQ:0,cdS:0,cdU:0,cdD:0,root:0,ult:false,fk:false,superC:0,shield:0,qT:0,qPulse:0,haste:0,castT:0,inv:0,flash:0,heart:0,kx:0,ky:0,step:0,atkT:0,hintT:14,
    dead:false,respT:0,
    ix:0,iy:0,aim:0,f1:false,f2:false,sk:false,sk2:false,cf:false,
    look:LOOKS[0],moving:false};
}
var PERKS=[
  {id:'vpn',n:'корпоративный VPN',d:'+15% скорость',r:'c',f:function(p){p.spdMult+=0.15;}},
  {id:'ot',n:'овертайм',d:'+12% урон',r:'c',f:function(p){p.dmgBonus+=0.12;}},
  {id:'kpi',n:'премия за KPI',d:'+10% шанс крита',r:'c',f:function(p){p.critBonus+=0.10;}},
  {id:'async',n:'асинхронность',d:'−12% перезарядка приёмов',r:'c',f:function(p){p.cdMult*=0.88;}},
  {id:'barista',n:'друг баристы',d:'приёмы дешевле на 20%',r:'c',f:function(p){p.costMult*=0.8;}},
  {id:'dress',n:'дресс-код',d:'−15% выгорания от удара',r:'c',f:function(p){p.drMult*=0.85;}},
  {id:'iv',n:'капельница кофе',d:'+70% реген кофе',r:'c',f:function(p){p.coffeeRegen+=1.5;}},
  {id:'kofein',n:'кофеиновый патч',d:'+25% реген кофе',r:'c',f:function(p){p.coffeeRegen+=0.55;}},
  {id:'dash',n:'дедлайн завтра',d:'рывок чаще на 30%',r:'c',f:function(p){p.dodgeCdMult*=0.7;}},
  {id:'lunch',n:'обед за счёт фирмы',d:'убийства гасят выгорание',r:'c',f:function(p){p.vamp+=0.5;}},
  {id:'stock',n:'опционы',d:'СУПЕР заряжается на 30% быстрее',r:'c',f:function(p){p.superRate+=0.3;}},
  {id:'dbl',n:'двойной тикет',d:'основная атака бьёт двойным выстрелом',r:'r',cls:['mgr'],f:function(p){p.dblShot=1;}},
  {id:'thread',n:'твит становится тредом',d:'снаряды раздваиваются при первом попадании',r:'r',cls:['mkt'],f:function(p){p.splitShot=1;}},
  {id:'echo',n:'эхо-коммит',d:'удары клавой повторяются через мгновение',r:'r',cls:['dev'],f:function(p){p.echoSwing=1;}},
  {id:'trail',n:'след стилуса',d:'уворот оставляет жгучий след правок',r:'r',cls:['dsn'],f:function(p){p.dashTrail=1;}}
];
var PERKBY={};
for(var _pk=0;_pk<PERKS.length;_pk++)PERKBY[PERKS[_pk].id]=PERKS[_pk];

var CAREER={runs:0,deaths:0,bestSprint:0,bestOkr:0,bestCoins:0,bestLevel:0,totalInterns:0,totalDeadlines:0,totalBoss:0,totalFurn:0,wins:0,ach:{}};
try{var _cr=JSON.parse(localStorage.getItem('brnt_career')||'null');if(_cr)for(var _ck in CAREER)if(_ck!=='ach')CAREER[_ck]=_cr[_ck]||0;if(_cr&&_cr.ach)CAREER.ach=_cr.ach;}catch(e){}
function saveCareer(){try{localStorage.setItem('brnt_career',JSON.stringify(CAREER));}catch(e){}}
var ACHS=[
  {id:'day1',n:'первый рабочий день',d:'пережить спринт 1'},
  {id:'spr5',n:'пятница близко',d:'дожить до спринта 5'},
  {id:'boss1',n:'замечаний нет',d:'пройти аудит'},
  {id:'win',n:'идеальный сотрудник',d:'пройти все 10 спринтов'},
  {id:'combo9',n:'бог выгорания',d:'комбо ×9'},
  {id:'grade5',n:'грейд-менеджер',d:'грейд 5'},
  {id:'lvl10',n:'мидл на минималках',d:'уровень 10'},
  {id:'k100',n:'сотня отчисленных',d:'100 стажёров за карьеру'},
  {id:'furn50',n:'ремонт за свой счёт',d:'50 мебели за карьеру'},
  {id:'dead10',n:'синдром самозванца',d:'сгореть 10 раз'},
  {id:'coop',n:'тимбилдинг',d:'спринт в коопе'}
];
function award(id){
  if(CAREER.ach[id])return false;
  var a=null;
  for(var i=0;i<ACHS.length;i++)if(ACHS[i].id===id)a=ACHS[i];
  if(!a)return false;
  CAREER.ach[id]=1;saveCareer();
  msg('ДОСТИЖЕНИЕ: '+a.n,4);
  return true;
}
function careerEndRun(coopMode){
  CAREER.runs++;
  CAREER.bestSprint=Math.max(CAREER.bestSprint,Math.max(0,G.wave-1));
  CAREER.bestOkr=Math.max(CAREER.bestOkr,G.okr);
  CAREER.bestLevel=Math.max(CAREER.bestLevel,G.level);
  CAREER.totalInterns+=G.killsI;CAREER.totalDeadlines+=G.killsD;
  if(CAREER.totalInterns>=100)award('k100');
  if(coopMode)award('coop');
  saveCareer();
}

var MOBNAMES={
  intern:['стажёр-ибшник','стажёр-фронтендер','стажёр-QA','стажёр-аналитик'],
  deadline:['дедлайн: релиз','дедлайн: демо','дедлайн: аудит']
};
function mobName(m){
  if(m.type==='boss')return'АУДИТ';
  var list=MOBNAMES[m.type]||MOBNAMES.intern;
  return list[(m.tint||0)%list.length];
}

var PROG=[
  [45,[52,57,60,64]],[40,[52,55,59,64]],[41,[53,57,60,65]],[38,[50,57,62,65]],
  [45,[52,57,60,64]],[43,[50,55,59,62]],[41,[53,57,60,65]],[40,[52,56,59,64]]
];

var MEL=[
  [0,0,76,4],[0,6,74,2],[0,8,72,5],[0,15,71,1],
  [1,0,71,3],[1,4,67,2],[1,6,64,2],[1,8,67,5],
  [2,0,69,3],[2,4,72,2],[2,6,74,2],[2,8,72,5],
  [3,0,74,3],[3,4,72,2],[3,6,71,2],[3,8,69,5],
  [4,0,76,4],[4,6,74,2],[4,8,77,4],[4,14,76,1],
  [5,0,79,3],[5,4,74,2],[5,6,71,2],[5,8,67,6],
  [6,0,69,3],[6,4,72,2],[6,6,77,2],[6,8,81,4],[6,14,79,1],
  [7,0,80,2],[7,2,79,2],[7,4,76,4],[7,8,71,4],[7,12,68,3]
];

var BPAT=[{s:0,n:0,l:3},{s:3,n:0,l:1},{s:6,n:7,l:2},{s:8,n:0,l:3},{s:10,n:0,l:1},{s:12,n:3,l:2},{s:14,n:12,l:1}];
var ARPPAT=[1,0,1,0,1,0,1,1,1,0,1,0,1,1,1,0];
var MBPM=88;
function mtof(m){return 440*Math.pow(2,(m-69)/12);}
function musicInit(){
  if(!AC||MUS.bus)return;
  MUS.bus=AC.createGain();MUS.bus.gain.value=0.5;MUS.bus.connect(master);
  var d=AC.createDelay(1.0);d.delayTime.value=0.29;
  var fb=AC.createGain();fb.gain.value=0.42;
  var df=AC.createBiquadFilter();df.type='lowpass';df.frequency.value=1800;
  d.connect(df);df.connect(fb);fb.connect(d);
  var dg=AC.createGain();dg.gain.value=0.5;
  d.connect(dg);dg.connect(MUS.bus);
  MUS.dly=d;
}
function startMusic(){
  if(!AC)return;
  musicInit();
  if(MUS.on)return;
  MUS.on=true;MUS.next=AC.currentTime+0.1;MUS.step=0;MUS.chord=0;
  MUS.timer=setInterval(musicTick,50);
}
function stopMusic(){
  MUS.on=false;
  if(MUS.timer){clearInterval(MUS.timer);MUS.timer=null;}
}
