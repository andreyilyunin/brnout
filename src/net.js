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

var RELAY_PRE='brnt4/';
var relay=null,guestPid=null;
var hostHbIv=null,hostSweepIv=null,hostSnapIv=null,hostWatchIv=null,guestHbIv=null,guestInIv=null,guestHiIv=null,guestWatchIv=null;
function relayH(code){return RELAY_PRE+code+'/h';}
function relayG(code){return RELAY_PRE+code+'/g';}
function relayKill(){
  if(hostHbIv){clearInterval(hostHbIv);hostHbIv=null;}
  if(hostSweepIv){clearInterval(hostSweepIv);hostSweepIv=null;}
  if(hostSnapIv){clearInterval(hostSnapIv);hostSnapIv=null;}
  if(hostWatchIv){clearInterval(hostWatchIv);hostWatchIv=null;}
  if(guestHbIv){clearInterval(guestHbIv);guestHbIv=null;}
  if(guestInIv){clearInterval(guestInIv);guestInIv=null;}
  if(guestHiIv){clearInterval(guestHiIv);guestHiIv=null;}
  if(guestWatchIv){clearInterval(guestWatchIv);guestWatchIv=null;}
  if(relay){try{relay.cli.destroy();}catch(e){}relay=null;}
}
function lobbyRender(){
  var el;
  if(NET.mode==='host')el=document.getElementById('lobbyList');
  else el=document.getElementById('lobbyList2');
  var html='';
  for(var i=0;i<LOBBY.length;i++){
    html+='<div><span style="color:'+PCOLORS[i]+'">●</span> '+(CLS[LOBBY[i].cls]?CLS[LOBBY[i].cls].name:'???')+(LOBBY[i].id==='me'?' (вы — хост)':'')+'</div>';
  }
  el.innerHTML=html;
  document.getElementById('bstart').textContent='Начать спринт ('+LOBBY.length+'/4)';
}

function relayBroadcast(d){
  if(relay&&NET.mode==='host')relay.publish(relayH(NET.code),JSON.stringify({d:d}));
}
var hostRetries=0;
function hostCreate(cb){
  var code=genCode();
  hostConnect(code,cb,true);
}

function hostConnect(code,cb,first){
  var brokerName='…';
  var cli=mqttClient({
    clientId:'brnt-h-'+code+'-'+((R()*1e9)|0).toString(36),
    sub:relayG(code),
    onReady:function(name){
      brokerName=name;NET.broker=name;
      relay={cli:cli,publish:function(topic,str){cli.publish(topic,str);}};
      NET.code=code;NET.mode='host';
      NET.peer={destroy:function(){relayKill();}};
      hostRetries=0;
      if(first){
        document.getElementById('roomCode').textContent=code;
        LOBBY=[{id:'me',cls:NET.cls}];
        lobbyRender();
        hostHbIv=setInterval(function(){relayBroadcast({t:'hb',n:LOBBY.length,st:NET.started});},1500);
        hostSweepIv=setInterval(hostSweep,3000);
        hostSnapIv=setInterval(function(){if(NET.mode==='host'&&NET.started&&G.state==='playing')sendSnapshot();},125);
        if(!hostWatchIv)hostWatchIv=setInterval(function(){
          if(NET.mode!=='host'||!relay||!NET.conns.length)return;
          var last=0;
          for(var wi=0;wi<NET.conns.length;wi++)last=Math.max(last,NET.conns[wi].last);
          if(performance.now()-last>8000&&hostRetries<3){
            hostRetries++;
            try{relay.cli.destroy();}catch(e){}
            relay=null;
            hostConnect(NET.code,null,false);
          }
        },2000);
        if(cb)cb(null,code);
      }else{
        msg('Связь восстановлена',2);
        relayBroadcast({t:'hb',n:LOBBY.length,st:NET.started});
        if(NET.started)relayBroadcast({t:'start',seed:MAPSEED});
      }
    },
    onMsg:function(topic,str){
      var o=null;try{o=JSON.parse(str);}catch(e){return;}
      if(o&&o.pid&&o.d)hostOnRelay(o.pid,o.d);
    },
    onDown:function(reason){
      if(!relay){if(cb)cb(reason==='nobroker'?'nobroker':'broker-down');return;}
      if(NET.mode==='host'&&hostRetries<3){
        hostRetries++;
        setTimeout(function(){hostConnect(code,cb,false);},1000);
        return;
      }
      netLost('Связь с комнатой потеряна ('+brokerName+')');
    }
  });
}
function hostOnRelay(pid,d){
  var c=null,i;
  for(i=0;i<NET.conns.length;i++)if(NET.conns[i].peer===pid)c=NET.conns[i];
  if(d.t==='bye'){if(c)hostDropConn(c);return;}
  if(!c){
    if(LOBBY.length>=4)return;
    c={peer:pid,open:true,last:performance.now(),
       send:function(m){if(relay)relay.publish(relayH(NET.code),JSON.stringify({to:pid,d:m}));},
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
    if(pc)pc.coins=(pc.coins||0)+1;
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
  gCode=code;NET.reconnectTries=0;NET.reconnecting=false;
  guestConnect(code,cb);
}
var gCode=null;
function guestConnect(code,cb){
  var list=mqttBrokerList();
  var idx=0,done=false,cbCalled=false,timer=null,cli=null;
  function finish(err){if(done)return;done=true;if(timer)clearTimeout(timer);if(err)cb(err);}
  function tryBroker(){
    if(done)return;
    if(idx>=list.length){
      if(NET.started&&NET.mode==='guest'&&NET.reconnectTries<3){
        NET.reconnectTries++;idx=0;
        setTimeout(tryBroker,900);
        return;
      }
      finish('nobroker');return;
    }
    var br=list[idx];idx++;
    var st=document.getElementById('netStatus');
    if(st)st.textContent=(NET.reconnecting?('Переподключение '+NET.reconnectTries+'/3 · '):'')+('поиск комнаты ('+br.name+')…');
    var heard=false,opened=false;
    cli=mqttClient({
      clientId:'brnt-g-'+code+'-'+guestPid.slice(1),
      sub:relayH(code),
      urls:[br],
      onReady:function(){
        if(done)return;
        opened=true;NET.broker=br.name;
        relay={cli:cli,publish:function(topic,str){cli.publish(topic,str);}};
        NET.peer={destroy:function(){relayKill();}};
        NET.hostConn={open:true,
          send:function(m){if(relay)relay.publish(relayG(code),JSON.stringify({pid:guestPid,d:m}));},
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
        },125);

        var hiN=0;
        if(guestHiIv)clearInterval(guestHiIv);
        guestHiIv=setInterval(function(){
          if(NET.started||LOBBY.length||hiN++>12||!NET.hostConn){clearInterval(guestHiIv);guestHiIv=null;return;}
          NET.hostConn.send({t:'hi',cls:NET.cls});
        },2000);
        if(!cbCalled){cbCalled=true;cb(null,'connected');}
        timer=setTimeout(function(){
          if(done||heard||NET.started)return;
          try{cli.destroy();}catch(e){}
          relay=null;NET.hostConn=null;NET.peer=null;
          tryBroker();
        },4500);
      },
      onMsg:function(topic,str){
        var o=null;try{o=JSON.parse(str);}catch(e){return;}
        if(!o)return;
        if(o.to&&o.to!==guestPid)return;
        heard=true;NET.lastRecv=performance.now();clearTimeout(timer);
        if(o.d&&o.d.t==='hb-echo'&&NET.hostConn&&!LOBBY.length)NET.hostConn.send({t:'hi',cls:NET.cls});
        if(NET.reconnecting){NET.reconnecting=false;NET.reconnectTries=0;msg('Связь восстановлена',2);}
        if(!guestWatchIv)guestWatchIv=setInterval(function(){

          if(performance.now()-NET.lastRecv>6000){
            if(!NET.deadChk)NET.deadChk=setTimeout(function(){
              NET.deadChk=null;
              if(performance.now()-NET.lastRecv>6000)netLost('Хост не отвечает — проверьте код комнаты');
            },1600);
          }
        },2000);
        if(o.d)guestOnMsg(o.d);
      },
      onDown:function(reason){
        if(done)return;
        clearTimeout(timer);
        if(opened&&heard){
          if(NET.started&&NET.mode==='guest'&&NET.reconnectTries<3){
            NET.reconnectTries++;NET.reconnecting=true;
            try{cli.destroy();}catch(e){}
            relay=null;NET.hostConn=null;NET.peer=null;
            setTimeout(function(){if(!done){idx=0;tryBroker();}},800);
            return;
          }
          done=true;netLost('Связь с комнатой потеряна');return;
        }
        try{cli.destroy();}catch(e){}
        relay=null;NET.hostConn=null;NET.peer=null;
        if(reason==='nobroker'){finish('nobroker');return;}
        tryBroker();
      }
    });
  }
  if(!guestPid)guestPid='p'+((R()*1e9)|0).toString(36);
  tryBroker();
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
  el.innerHTML=html;
}
function netLost(reason){
  if(G.state==='playing'||G.state==='paused')G.state='menu';
  destroyNet();
  document.getElementById('netStatus').textContent=reason||'Соединение потеряно';
  showOv('bwait');
}
function destroyNet(){
  if(NET.mode==='host'&&relay)relayBroadcast({t:'bye-host'});
  relayKill();
  NET.peer=null;NET.conns=[];NET.hostConn=null;NET.started=false;NET.code='';
  NET.mode='solo';NET.myId='me';guestPid=null;
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
