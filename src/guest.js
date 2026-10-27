'use strict';

var VIEW={players:[],mobs:[],boss:null,projs:[],pickups:[],zones:[],coffee:[3,3],init:false,paused:false};
function guestApplySnapshot(s){
  var i,j,found;
  for(i=0;i<s.p.length;i++){var sp=s.p[i];
    found=null;
    for(j=0;j<VIEW.players.length;j++)if(VIEW.players[j].id===sp.id){found=VIEW.players[j];break;}
    if(!found){found=newPlayer(sp.id,sp.cls);found.x=sp.x;found.y=sp.y;found.look=classLook(sp.cls,i);found.coins=sp.co||0;VIEW.players.push(found);}
    found.tgt={x:sp.x,y:sp.y,face:sp.face,burn:sp.burn,cof:sp.cof,cls:sp.cls,sh:sp.sh,qt:sp.qt,dd:sp.dd,cd1:sp.c1,cd2:sp.c2,cdQ:sp.cq,cdS:sp.cs||0,cm:sp.cm,mv:sp.mv,st:sp.st,as:sp.as||0,ct:sp.ct||0,co:sp.co||0};
  }
  for(i=VIEW.players.length-1;i>=0;i--){var keep=false;
    for(j=0;j<s.p.length;j++)if(s.p[j].id===VIEW.players[i].id)keep=true;
    if(!keep)VIEW.players.splice(i,1);
  }
  for(i=0;i<s.m.length;i++){var sm=s.m[i];
    found=null;
    for(j=0;j<VIEW.mobs.length;j++)if(VIEW.mobs[j].id===sm[0]){found=VIEW.mobs[j];break;}
    if(!found){found={id:sm[0],type:sm[1]?'deadline':'intern',r:sm[1]?11:13,x:sm[2],y:sm[3],tint:sm[6]||0,tilt:(sm[0]*2.399)%6};VIEW.mobs.push(found);}
    found.elite=sm[12]?1:0;
    if(found.elite)found.r=16;
    found.tgt={x:sm[2],y:sm[3],hp:sm[4],stun:sm[5],face:sm[7],ch:sm[8]||0,cf:sm[9]||0,mk:sm[10]||0,chS:(sm[11]===undefined?-1:sm[11])};
  }
  for(i=VIEW.mobs.length-1;i>=0;i--){var k=false;
    for(j=0;j<s.m.length;j++)if(s.m[j][0]===VIEW.mobs[i].id)k=true;
    if(!k)VIEW.mobs.splice(i,1);
  }
  if(s.b){
    if(!VIEW.boss)VIEW.boss={x:s.b.x,y:s.b.y,r:44,face:0,phase:1,step:0};
    VIEW.boss.tgt=s.b;
  }else VIEW.boss=null;
  var newPr=[];
  for(i=0;i<s.pr.length;i++){var spr=s.pr[i];var old=null;
    for(j=0;j<VIEW.projs.length;j++)if(VIEW.projs[j].id===spr[0]){old=VIEW.projs[j];break;}
    var kname=spr[1]===0?'ticket':(spr[1]===2?'tg':(spr[1]===3?'ig':(spr[1]===4?'key':(spr[1]===5?'comic':'tw'))));
    if(old){old.kind=kname;old.tgt={x:spr[2],y:spr[3]};old.vx=spr[4];old.vy=spr[5];newPr.push(old);}
    else newPr.push({id:spr[0],kind:kname,x:spr[2],y:spr[3],vx:spr[4],vy:spr[5],tgt:null,rot:R()*TAU});
  }
  VIEW.projs=newPr;
  VIEW.pickups=s.pk.map(function(p){return{id:p[0],kind:p[1],x:p[2],y:p[3],t:G.t};});
  VIEW.zones=s.z.map(function(z){return{x:z[0],y:z[1],w:z[2],h:z[3],tl:z[4]};});
  VIEW.coffee=s.cf;
  G.wave=s.w;G.waveState=s.ws;G.okr=s.okr;G.grade=s.gr;G.bossN=s.bn||1;
  G.combo=s.cb||0;G.comboT=s.cbt||0;
  if(s.lv&&s.lv>G.level)G.perkQueue=Math.min(3,G.perkQueue+(s.lv-G.level));
  G.level=s.lv||G.level;G.xp=s.xp||0;G.xpN=s.xpN||40;
  if(s.msg&&s.msgT>0){G.msg=s.msg;G.msgT=Math.min(G.msgT+0.2,1.5);}
  else G.msgT-=0.066;
  G.caption=s.cap||'';VIEW.paused=!!s.pz;
  if(s.fu)for(i=0;i<s.fu.length;i++){
    for(j=0;j<FURN.length;j++){var f2=FURN[j];
      if(f2.id===s.fu[i]&&!f2.dead){
        f2.dead=true;paintDestroy(f2);
        if(f2.t==='desk'||f2.t==='rtable')spawnHalves(f2);
      }
    }
  }
  for(i=0;i<s.ev.length;i++)guestEvent(s.ev[i]);
  if(s.st==='dead'&&G.state!=='dead'){G.state='dead';showDeadStats(s.stats);}
  if(s.st==='win'&&G.state!=='win'){G.state='win';showOv('bwin');document.getElementById('bcontinue').classList.add('hidden');}
  if(s.st==='playing'&&(G.state==='win')){G.state='playing';showOv(null);document.getElementById('bcontinue').classList.remove('hidden');}
}
function guestEvent(e){
  var x=e.x,y=e.y;
  if(e.k==='map'){
    buildMap(e.seed);
    VIEW.mobs.length=0;VIEW.projs.length=0;VIEW.pickups.length=0;VIEW.zones.length=0;
    G.fx.length=0;G.texts.length=0;
    DEBRIS.length=0;WATER.length=0;PFX.length=0;STONES.length=0;
    G.waveState='calm';G.interT=0;G.fadeT=0.9;
    var lb=lobbySpawn();
    for(var mi=0;mi<VIEW.players.length;mi++){var mp=VIEW.players[mi];
      mp.x=lb.x+lb.w/2;mp.y=lb.y+lb.h/2;mp.tgt=null;
    }
    return;
  }
  if(e.k==='die'){
    for(var j=0;j<6;j++)G.fx.push({type:'paper',x:x,y:y,vx:R()*160-80,vy:R()*160-80,rot:R()*3,vr:R()*6-3,t:0,life:0.7+R()*0.4});
    dramaOfDeath(x,y,e.tp,e.elite);
  }else if(e.k==='ring'){
    G.fx.push({type:'ring',x:x,y:y,rad:10,radMax:e.rm,t:0,life:0.4,blue:e.blue,orange:e.orange,yellow:e.yellow,green:e.green});
  }else if(e.k==='slash'){
    G.fx.push({type:'slash',cls:e.cls,x:x,y:y,a:e.a,arc:e.arc*Math.PI/180,rad:e.rad,t:0,life:e.big?0.18:0.16,big:e.big});
  }else if(e.k==='stamp'){
    G.fx.push({type:'stamp',x:x,y:y,rad:e.rad,t:0,life:5});G.shake+=10;
  }else if(e.k==='txt'){
    if(G.texts.length>=40){
      var lowI=0;
      for(var ti=1;ti<G.texts.length;ti++){
        var pf=TXPRIO[G.texts[ti].ch]||0,pl=TXPRIO[G.texts[lowI].ch]||0;
        if(pf<pl||(pf===pl&&G.texts[ti].t>G.texts[lowI].t))lowI=ti;
      }
      G.texts.splice(lowI,1);
    }
    G.texts.push({x:x,y:y,text:e.t,color:e.c,size:e.s,t:0,life:TXLIFE[e.ch]||1.4,vy:-15,ch:e.ch});
  }else if(e.k==='spawn'){
    G.fx.push({type:'ring',x:x,y:y,rad:26,radMax:8,t:0,life:0.5,purple:1});
  }else if(e.k==='furn'){
    for(var j2=0;j2<12;j2++)G.fx.push({type:'paper',x:x,y:y,vx:R()*240-120,vy:R()*240-120,rot:R()*3,vr:R()*8-4,t:0,life:0.8+R()*0.5});
    G.shake+=5;
  }else if(e.k==='pkup'){
    for(var pj=VIEW.pickups.length-1;pj>=0;pj--)if(VIEW.pickups[pj].id===e.id)VIEW.pickups.splice(pj,1);
  }else if(e.k==='hs'){
    G.hitStop=Math.max(G.hitStop||0,e.v||0.04);
  }else if(e.k==='plates'){
    critBurst(e.x,e.y,e.n);
  }else if(e.k==='stone'){
    spawnDebris({kind:'stone',word:e.w,x:e.x,y:e.y,sx:e.x,sy:e.y,tx:e.tx,ty:e.ty,
      dur:Math.max(0.22,Math.hypot(e.tx-e.x,e.ty-e.y)/620),life:Math.max(0.22,Math.hypot(e.tx-e.x,e.ty-e.y)/620)+0.02});
  }else if(e.k==='water'){
    WATER.push({x:e.x,y:e.y,r:12,rMax:92,t:0,life:9});
  }else if(e.k==='pstart'){
    PFX.push({x:e.x,y:e.y,t:0,life:5,acc:0});
  }
}
function guestUpdate(dt){
  if(G.hitStop>0){G.hitStop-=dt;return;}
  if(G.state!=='playing'&&G.state!=='win')return;
  if(G.waveState==='cleared'){G.interT-=dt;if(G.interT<0)G.interT=0;}
  if(G.fadeT>0)G.fadeT-=dt;
  var i,k=1-Math.exp(-10*dt);
  for(i=0;i<VIEW.players.length;i++){var p=VIEW.players[i],tg=p.tgt;
    if(!tg)continue;
    if(tg.sc!==undefined)p.superC=tg.sc;
    var isMe=p.id===NET.myId;
    if(isMe&&G.state==='playing'){
      var l=Math.hypot(INPUT.ix,INPUT.iy);
      p.moving=l>0.01;
      if(p.moving){
        var spd=(p.spd||195)*(inZone(p.x,p.y)?0.55:1)*Math.min(1,l);
        p.x+=INPUT.ix/l*spd*dt;p.y+=INPUT.iy/l*spd*dt;
        p.step+=dt*spd*0.012;
      }
      var err=Math.hypot(tg.x-p.x,tg.y-p.y);
      if(err>90){p.x=tg.x;p.y=tg.y;}
      else{p.x+=(tg.x-p.x)*(1-Math.exp(-4*dt));p.y+=(tg.y-p.y)*(1-Math.exp(-4*dt));}
      p.aim=INPUT.aim;
    }else{
      p.x+=(tg.x-p.x)*k;p.y+=(tg.y-p.y)*k;
      p.aim=tg.face;p.moving=!!tg.mv;p.step=tg.st||0;
    }
    p.face=p.aim;
    p.burnout=tg.burn;p.coffee=tg.cof;p.cls=tg.cls;p.shield=tg.shield;p.qT=tg.qt;p.dead=tg.dd;
    p.cd1=tg.cd1;p.cd2=tg.cd2;p.cdQ=tg.cdQ;p.cdS=tg.cdS;p.coffeeMax=tg.cm;
    p.haste=tg.as;p.castT=tg.ct;
    if(!isMe)p.coins=tg.co||0;
    else p.coins=Math.max(p.coins||0,tg.co||0);
    p.atkT=Math.max(0,p.atkT-dt);
  }
  for(i=0;i<VIEW.mobs.length;i++){var m=VIEW.mobs[i];
    if(!m.tgt)continue;
    m.x+=(m.tgt.x-m.x)*k;m.y+=(m.tgt.y-m.y)*k;
    m.hpF=m.tgt.hp;m.stun=m.tgt.stun;m.face=m.tgt.face;
    m.ch=m.tgt.ch;m.cf=m.tgt.cf;m.mk=m.tgt.mk;m.chS=m.tgt.chS;
  }
  if(VIEW.boss&&VIEW.boss.tgt){var b=VIEW.boss,bt=b.tgt;
    b.x+=(bt.x-b.x)*k;b.y+=(bt.y-b.y)*k;b.face=bt.f;b.hpF=bt.hp;b.phase=bt.ph;b.windup=bt.wu?bt.wt:0;b.tx=bt.tx;b.ty=bt.ty;b.wuT=bt.wt||0;b.step+=dt*2;
  }
  for(i=0;i<VIEW.projs.length;i++){var pr=VIEW.projs[i];
    pr.x+=pr.vx*dt;pr.y+=pr.vy*dt;pr.rot+=dt*12;
    if(pr.tgt){pr.x+=(pr.tgt.x-pr.x)*k;pr.y+=(pr.tgt.y-pr.y)*k;}
  }
  updateFx(dt);
  var me=localPlayer();
  if(me&&INPUT.cf&&G.state==='playing'){G.fx.push({type:'ring',x:me.x,y:me.y,rad:8,radMax:56,t:0,life:0.4,green:true});INPUT.cf=false;}
  if(me&&!me.dead){
    for(var pk2=VIEW.pickups.length-1;pk2>=0;pk2--){var pk3=VIEW.pickups[pk2];
      if(Math.hypot(pk3.x-me.x,pk3.y-me.y)<22){
        VIEW.pickups.splice(pk2,1);
        SFX.pickup();
        G.fx.push({type:'flash',x:pk3.x,y:pk3.y,r:24,t:0,life:0.18});
      }
    }
  }
}
function guestLocalAttackCosmetics(){
  var me=localPlayer();
  if(!me)return;
  var C=CLS[me.cls]||CLS.mgr;
  if(me.cls==='mgr'||me.cls==='mkt'){
    if(INPUT.f1&&me.cd1<=0){me.cd1=C.s1.cd;me.atkT=0.18;if(me.cls==='mgr'){SFX.whoosh();SFX.stapler();}else SFX.notif();}
    if(INPUT.f2&&me.cd2<=0){me.cd2=C.s2.cd;me.atkT=0.25;
      if(me.cls==='mgr'){G.fx.push({type:'slash',cls:me.cls,x:me.x,y:me.y,a:me.aim,arc:100*Math.PI/180,rad:80,t:0,life:0.18,big:true});SFX.thudFlesh();}
      else{G.fx.push({type:'ring',x:me.x,y:me.y,rad:240,radMax:40,t:0,life:0.35,purple:true});SFX.whoosh();}
    }
  }else{
    var arc=me.cls==='dsn'?110:130,rad=me.cls==='dsn'?74:86;
    if(INPUT.f1&&me.cd1<=0){me.cd1=C.s1.cd;me.atkT=0.18;G.fx.push({type:'slash',cls:me.cls,x:me.x,y:me.y,a:me.aim,arc:arc*Math.PI/180,rad:rad,t:0,life:0.16});SFX.swing();if(me.cls==='dev'&&R()<0.6)SFX.clack();}
    if(INPUT.f2&&me.cd2<=0){me.cd2=C.s2.cd;me.atkT=0.25;
      if(me.cls==='dev'){G.fx.push({type:'ring',x:me.x,y:me.y,rad:10,radMax:100,t:0,life:0.3});SFX.slam();}
      else{G.fx.push({type:'slash',cls:me.cls,x:me.x,y:me.y,a:me.aim,arc:200*Math.PI/180,rad:95,t:0,life:0.2,big:true});SFX.bell();SFX.slam();}
    }
  }
  if(INPUT.sk&&me.cdQ<=0&&me.qT<=0){me.cdQ=0.5;}
  if(INPUT.sk2&&me.cdS<=0){me.cdS=0.5;}
}

function sendSnapshot(){
  if(!NET.conns.length)return;
  var p=G.players.map(function(pl,i){return{id:pl.id,cls:pl.cls,x:Math.round(pl.x),y:Math.round(pl.y),face:Math.round(pl.aim*100)/100,
    burn:Math.round(pl.burnout),cof:Math.round(pl.coffee),sh:Math.round(pl.shield*10)/10,qt:Math.round(pl.qT*10)/10,
    dd:pl.dead?1:0,c1:Math.round(pl.cd1*100)/100,c2:Math.round(pl.cd2*100)/100,cq:Math.round(pl.cdQ*10)/100,cs:Math.round(pl.cdS*10)/100,cm:pl.coffeeMax,sc:Math.round(clamp(pl.superC||0,0,1)*100)/100,
    mv:pl.moving?1:0,st:Math.round(pl.step*10)/10,as:Math.round(pl.haste*10)/10,ct:Math.round(pl.castT*10)/10,co:pl.coins||0};});
  var m=G.mobs.map(function(mo){return[mo.id,mo.type==='intern'?0:1,Math.round(mo.x),Math.round(mo.y),Math.round(clamp(mo.hp/mo.hpMax,0,1)*100),mo.stun>0?1:0,mo.tint||0,Math.round(mo.face*100)/100,
    Math.round((mo.ch||0)*10)/10,Math.round((mo.cf||0)*10)/10,mo.mk>0?1:0,mo.chSrc===undefined?-1:mo.chSrc,mo.elite?1:0];});
  var b=null;
  if(G.boss)b={x:Math.round(G.boss.x),y:Math.round(G.boss.y),hp:Math.round(clamp(G.boss.hp/G.boss.hpMax,0,1)*100),ph:G.boss.phase,f:Math.round(G.boss.face*100)/100,
    wu:G.boss.windup>0?1:0,wt:Math.round(G.boss.wuT*100)/100,tx:Math.round(G.boss.tx),ty:Math.round(G.boss.ty)};
  var KINDIDX={ticket:0,tw:1,tg:2,ig:3,plane:1,key:4,comic:5};
  var pr=G.projs.map(function(q){return[q.id,KINDIDX[q.kind]===undefined?0:KINDIDX[q.kind],Math.round(q.x),Math.round(q.y),Math.round(q.vx),Math.round(q.vy)];});
  var pk=G.pickups.map(function(q){return[q.id,q.kind,Math.round(q.x),Math.round(q.y)];});
  var z=G.zones.map(function(zz){return[Math.round(zz.x),Math.round(zz.y),Math.round(zz.w),Math.round(zz.h),Math.round(zz.t*10)/10];});
  var cf=COFFEES.map(function(c){return c.charges;});
  var fu=[];
  for(var fi=0;fi<FURN.length;fi++)if(FURN[fi].dead)fu.push(FURN[fi].id);
  var ev=NET.events;NET.events=[];
  var snap={t:'st',p:p,m:m,b:b,pr:pr,pk:pk,z:z,cf:cf,fu:fu,ev:ev,
    w:G.wave,ws:G.waveState,okr:G.okr,gr:G.grade,bn:G.bossN,cb:G.combo,cbt:G.comboT,
    lv:G.level,xp:G.xp,xpN:G.xpN,
    msg:(G.msgT>0&&G.msg)?G.msg:null,msgT:G.msgT,cap:G.caption,st:G.state,pz:(G.state==='paused')?1:0};
  broadcast(snap);
}
function broadcast(d){
  relayBroadcast(d);
}
