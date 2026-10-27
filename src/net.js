'use strict';

function initPlayersFromLobby(){
  G.players=[];
  for(var i=0;i<LOBBY.length;i++){
    var p=newPlayer(LOBBY[i].id,LOBBY[i].cls);
    p.look=classLook(LOBBY[i].cls,i);
    G.players.push(p);
  }
}
function startLocal(){
  LOBBY=[{id:'me',cls:NET.cls}];
  var seed=(R()*1e9)|0;
  buildMap(seed);
  initPlayersFromLobby();
  resetWorld();
  NET.mode='solo';NET.myId='me';
  G.state='playing';showOv(null);G.fadeT=0.9;
  if(window.touchLearnStart)touchLearnStart();
  updateCamera(0.016,true);
}
function hostStartGame(){
  LOBBY=LOBBY.slice(0,4);
  var seed=(R()*1e9)|0;
  buildMap(seed);
  initPlayersFromLobby();
  resetWorld();
  NET.mode='host';NET.myId='me';NET.started=true;
  G.state='playing';showOv(null);G.fadeT=0.9;
  updateCamera(0.016,true);
  relayBroadcast({t:'start',seed:seed});
  msg('Команда собрана. Спринт 1 начинается.');
}
function resetWorld(){
  G.mobs.length=0;G.projs.length=0;G.fx.length=0;G.texts.length=0;G.pickups.length=0;G.zones.length=0;
  G.boss=null;G.wave=0;G.waveState='calm';G.waveT=2;G.spawnQ.length=0;
  G.okr=0;G.grade=1;G.killsI=0;G.killsD=0;G.bossN=0;G.winShown=false;G.winT=0;
  G.level=1;G.xp=0;G.xpN=40;G.perkQueue=0;
  G.shake=0;G.hitStop=0;G.msg='';G.msgT=0;G.capT=10;G.caption='';
  G.t=0;G.delays.length=0;G.combo=0;G.comboT=0;G.sweepT=0;G.hordeBatch=0;
  DEBRIS.length=0;STONES.length=0;
  NET.events=[];
}
function guestStart(seed){
  buildMap(seed);
  VIEW.players=[];VIEW.mobs=[];VIEW.projs=[];VIEW.boss=null;
  G.fx.length=0;G.texts.length=0;
  resetWorld();
  NET.mode='guest';NET.myId=guestPid;NET.started=true;
  G.state='playing';showOv(null);G.fadeT=0.9;
  updateCamera(0.016,true);
}

var TRY_APP='brnout-corporate-hell';
var TRY_STRATS=['nostr','torrent'];
var tryRooms={},trySends={},guestPid=null;
var hostHbIv=null,hostSweepIv=null,hostSnapIv=null,guestHbIv=null,guestInIv=null,guestWatchIv=null;
function tryLib(strat){return strat==='nostr'?TrysteroNostr:TrysteroTorrent;}
function tryWrap(code,strat){
  var room=tryLib(strat).joinRoom({appId:TRY_APP},code);
  var act=room.makeAction('m');
  tryRooms[strat]=room;trySends[strat]=act[0];
  NET.peer={destroy:function(){relayKill();}};
  return act[1];
}
function relayKill(){
  if(hostHbIv){clearInterval(hostHbIv);hostHbIv=null;}
  if(hostSweepIv){clearInterval(hostSweepIv);hostSweepIv=null;}
  if(hostSnapIv){clearInterval(hostSnapIv);hostSnapIv=null;}
  if(guestHbIv){clearInterval(guestHbIv);guestHbIv=null;}
  if(guestInIv){clearInterval(guestInIv);guestInIv=null;}
  if(guestWatchIv){clearInterval(guestWatchIv);guestWatchIv=null;}
  for(var s in tryRooms){try{tryRooms[s].leave();}catch(e){}}
  tryRooms={};trySends={};
}
function lobbyRender(){
  var el;
  if(NET.mode==='host')el=document.getElementById('lobbyList');
  else el=document.getElementById('lobbyList2');
  var html='';
  for(var i=0;i<LOBBY.length;i++){
    html+='<div><span style="color:'+PCOLORS[i]+'">●</span> '+(CLS[LOBBY[i].cls]?CLS[LOBBY[i].cls].name:'???')+(LOBBY[i].id==='me'?' (вы — хост)':'')+'</div>';
  }
  el.innerHTML=html; /*safe*/
  document.getElementById('bstart').textContent='Начать спринт ('+LOBBY.length+'/4)';
}

function relayBroadcast(d){
  if(NET.mode!=='host')return;
  for(var i=0;i<NET.conns.length;i++){
    var send=trySends[NET.conns[i].strat];
    if(send)send({d:d},NET.conns[i].peer);
  }
}
function hostCreate(cb){
  var code=genCode();
  NET.code=code;NET.mode='host';
  for(var si=0;si<TRY_STRATS.length;si++){
    var strat=TRY_STRATS[si],recv;
    try{recv=tryWrap(code,strat);}catch(e){continue;}
    (function(strat,recv){
      recv(function(d,pid){if(d&&d.d)hostOnRelay(pid,d.d,strat);});
      tryRooms[strat].onPeerLeave(function(pid){
        var c=null,i;
        for(i=0;i<NET.conns.length;i++)if(NET.conns[i].peer===pid&&NET.conns[i].strat===strat)c=NET.conns[i];
        if(c)hostDropConn(c);
      });
    })(strat,recv);
  }
  if(!Object.keys(tryRooms).length){cb('nosignal');return;}
  document.getElementById('roomCode').textContent=code;
  LOBBY=[{id:'me',cls:NET.cls}];
  lobbyRender();
  hostHbIv=setInterval(function(){relayBroadcast({t:'hb',n:LOBBY.length,st:NET.started});},1500);
  hostSweepIv=setInterval(hostSweep,3000);
  hostSnapIv=setInterval(function(){if(NET.mode==='host'&&NET.started&&G.state==='playing')sendSnapshot();},70);
  cb(null,code);
}
function hostOnRelay(pid,d,strat){
  var c=null,i;
  for(i=0;i<NET.conns.length;i++)if(NET.conns[i].peer===pid)c=NET.conns[i];
  if(d.t==='bye'){if(c)hostDropConn(c);return;}
  if(!c){
    if(LOBBY.length>=4)return;
    c={peer:pid,strat:strat,open:true,last:performance.now(),
       send:function(m){var s2=trySends[strat];if(s2)s2({d:m},pid);},
       close:function(){}};
    NET.conns.push(c);
  }
  c.last=performance.now();
  hostOnMsg(c,d);
}
function hostSweep(){
  var now=performance.now();
  for(var i=NET.conns.length-1;i>=0;i--)
    if(now-NET.conns[i].last>20000)hostDropConn(NET.conns[i]);
}
function hostOnMsg(c,d){
  if(!d)return;
  var i;
  if(d.t==='hb'&&!c.hiDone){
    c.send({t:'hb-echo'});
    return;
  }
  if(d.t==='hi'){
    c.hiDone=true;
    for(i=0;i<LOBBY.length;i++)if(LOBBY[i].id===c.peer)LOBBY.splice(i,1);
    if(LOBBY.length>=4){c.send({t:'full'});return;}
    var ncls=CLS[d.cls]?d.cls:'mgr';
    LOBBY.push({id:c.peer,cls:ncls});
    lobbyRender();
    c.send({t:'lobby',list:LOBBY.map(function(l){return{cls:l.cls,me:l.id===c.peer};}),started:NET.started});
    if(NET.started){
      var np=newPlayer(c.peer,ncls);
      np.look=classLook(ncls,G.players.length);
      G.players.push(np);
      floatText(np.x,np.y-40,'новый сотрудник в чате','#8bd17c',13);
      c.send({t:'start',seed:MAPSEED});
    }
  }
  if(d.t==='in'){
    var pl=null;
    for(i=0;i<G.players.length;i++)if(G.players[i].id===c.peer)pl=G.players[i];
    if(!pl)return;
    pl.ix=d.x;pl.iy=d.y;pl.aim=d.a;pl.f1=!!d.f1;pl.f2=!!d.f2;pl.sk=!!d.sk;pl.sk2=!!d.s2;pl.fk=!!d.fk;pl.cf=!!d.cf;
    if(d.u)pl.ult=true;
  }
  if(d.t==='coin'){
    var pc=null;
    for(i=0;i<G.players.length;i++)if(G.players[i].id===c.peer)pc=G.players[i];
    if(pc)pc.coins=(pc.coins||0)+(d.n||1);
  }
  if(d.t==='perk'){
    var pp=null;
    for(i=0;i<G.players.length;i++)if(G.players[i].id===c.peer)pp=G.players[i];
    var pk=PERKBY[d.p];
    if(pp&&pk){pk.f(pp);pp.perks.push(pk.id);}
  }
  if(d.t==='leave'){hostDropConn(c);}
}
function hostDropConn(c){
  var i;
  for(i=NET.conns.length-1;i>=0;i--)if(NET.conns[i]===c)NET.conns.splice(i,1);
  for(i=LOBBY.length-1;i>=0;i--)if(LOBBY[i].id===c.peer)LOBBY.splice(i,1);
  for(i=G.players.length-1;i>=0;i--)if(G.players[i].id===c.peer)G.players.splice(i,1);
  lobbyRender();
}
function guestJoin(code,cb){
  if(!guestPid)guestPid='p'+((R()*1e9)|0).toString(36);
  var st=document.getElementById('netStatus');
  if(st)st.textContent='ищу комнату '+code.toUpperCase()+'…';
  var done=false,cbCalled=false;
  function fail(err){
    if(cbCalled)return;
    cbCalled=true;relayKill();NET.hostConn=null;cb(err);
  }
  function guestWire(strat,recv){
    recv(function(d,pid){
      if(pid!==NET.hostPid||!d||!d.d)return;
      NET.lastRecv=performance.now();
      if(d.d.t==='hb-echo'&&NET.hostConn&&!LOBBY.length)NET.hostConn.send({t:'hi',cls:NET.cls});
      if(NET.reconnecting){NET.reconnecting=false;NET.reconnectTries=0;msg('Связь восстановлена',2);}
      guestOnMsg(d.d);
    });
    tryRooms[strat].onPeerJoin(function(pid){
      if(done||NET.hostPid)return;
      done=true;
      guestPid=tryLib(strat).selfId;
      NET.hostPid=pid;NET.hostStrat=strat;
      NET.hostConn={open:true,
        send:function(m){var s2=trySends[strat];if(s2)s2({d:m},pid);},
        close:function(){}};
      NET.lastRecv=performance.now();
      var wc=document.getElementById('waitCode');
      if(wc){wc.textContent='комната '+code.toUpperCase();wc.classList.remove('hidden');}
      NET.hostConn.send({t:'hi',cls:NET.cls});
      if(!guestHbIv)guestHbIv=setInterval(function(){if(NET.hostConn)NET.hostConn.send({t:'hb'});},1500);
      if(!guestInIv)guestInIv=setInterval(function(){
        if(!NET.hostConn||NET.mode!=='guest')return;
        NET.hostConn.send({t:'in',x:Math.round(INPUT.ix*100)/100,y:Math.round(INPUT.iy*100)/100,
          a:Math.round(INPUT.aim*100)/100,f1:(INPUT.f1||INPUT.f1Tap)?1:0,f2:INPUT.f2?1:0,sk:INPUT.sk?1:0,s2:INPUT.sk2?1:0,fk:INPUT.fk?1:0,cf:INPUT.cf?1:0,u:(INPUT.ultTap?1:0)});
        INPUT.f1Tap=false;INPUT.ultTap=false;
      },33);
      if(!guestWatchIv)guestWatchIv=setInterval(function(){
        if(performance.now()-NET.lastRecv>6000){
          if(!NET.deadChk)NET.deadChk=setTimeout(function(){
            NET.deadChk=null;
            if(performance.now()-NET.lastRecv>6000)netLost('Хост не отвечает — проверьте код комнаты');
          },1600);
        }
      },2000);
      if(cb&&!cbCalled){cbCalled=true;cb(null,'connected');}
    });
    tryRooms[strat].onPeerLeave(function(pid){
      if(pid!==NET.hostPid)return;
      netLost('Хост покинул комнату');
    });
  }
  var opened=0;
  for(var si=0;si<TRY_STRATS.length;si++){
    (function(strat){
      try{guestWire(strat,tryWrap(code,strat));opened++;}
      catch(e){}
    })(TRY_STRATS[si]);
  }
  if(!opened){fail('nosignal');return;}
  var watchdog=setTimeout(function(){fail('nobody');},20000);
}
function guestOnMsg(d){
  if(!d)return;
  if(d.t==='full'){netLost('Комната заполнена');return;}
  if(d.t==='bye-host'){netLost('Хост завершил игру');return;}
  if(d.t==='map'){
    buildMap(d.seed);
    VIEW.mobs.length=0;VIEW.projs.length=0;VIEW.pickups.length=0;VIEW.zones.length=0;
    G.fx.length=0;G.texts.length=0;
    DEBRIS.length=0;WATER.length=0;PFX.length=0;STONES.length=0;
    G.waveState='calm';G.interT=0;G.fadeT=0.9;
  }
  if(d.t==='inter'){
    G.waveState='cleared';G.interT=d.d;G.nextTheme=d.th;G.interStats=d.st;
  }
  if(d.t==='lobby'){
    LOBBY=d.list.map(function(l,i){return{id:l.me?guestPid:'p'+i,cls:l.cls};});
    document.getElementById('netStatus').textContent='В лобби. Ждём хоста…';
    lobbyRenderGuest();
  }
  if(d.t==='start'){guestStart(d.seed||1);}
  if(d.t==='st'){NET.started=true;guestApplySnapshot(d);}
  if(d.t==='stt'){
    if(d.s==='paused')VIEW.paused=true;
    if(d.s==='playing'&&G.state==='paused'){G.state='playing';showOv(null);VIEW.paused=false;}
  }
  if(d.t==='over')showDeadStats(d.stats);
}
function lobbyRenderGuest(){
  var el=document.getElementById('lobbyList2');
  var html='';
  for(var i=0;i<LOBBY.length;i++){
    html+='<div><span style="color:'+PCOLORS[i]+'">●</span> '+(CLS[LOBBY[i].cls]?CLS[LOBBY[i].cls].name:'???')+(LOBBY[i].id===guestPid?' (вы)':'')+'</div>';
  }
  el.innerHTML=html; /*safe*/
}
function netLost(reason){
  if(G.state==='playing'||G.state==='paused')G.state='menu';
  destroyNet();
  document.getElementById('netStatus').textContent=reason||'Соединение потеряно';
  showOv('bwait');
}
function destroyNet(){
  if(NET.mode==='host')relayBroadcast({t:'bye-host'});
  relayKill();
  NET.peer=null;NET.conns=[];NET.hostConn=null;NET.started=false;NET.code='';
  NET.mode='solo';NET.myId='me';guestPid=null;NET.hostPid=null;NET.hostStrat=null;
}

function inviteLink(){
  return location.origin+location.pathname+'?join='+(NET.code||'');
}
function shareInvite(btn){
  if(!NET.code||!btn)return;
  var url=inviteLink();
  function ok(){btn.textContent='Ссылка скопирована ✓';setTimeout(function(){btn.textContent='Поделиться ссылкой';},2200);}
  if(navigator.share){
    navigator.share({title:'brnout: corporate hell',text:'Заходи в комнату '+NET.code,url:url}).then(ok,ok);
    return;
  }
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(url).then(ok,function(){fallbackCopy(url);ok();});
    return;
  }
  fallbackCopy(url);ok();
}
function fallbackCopy(url){
  var i=document.createElement('input');
  i.value=url;i.style.position='fixed';i.style.opacity='0';
  document.body.appendChild(i);i.select();
  try{document.execCommand('copy');}catch(e){}
  document.body.removeChild(i);
}
