'use strict';

var DEBRIS=[],WATER=[],PFX=[],STONES=[];
var CRITWORDS=['ПРАВКА!','ДЕДЛАЙН!','УВОЛЕН!'];
function drawHoverTag(){
  if(isTouch)return;
  var mwx=mouse.x/DPR/G.zoom+G.camX,mwy=mouse.y/DPR/G.zoom+G.camY;
  var best=null,bd=34;
  var mobs=worldPool('mobs');
  for(var i=0;i<mobs.length;i++){var m=mobs[i];
    var d=Math.hypot(m.x-mwx,m.y-mwy);
    if(d<bd+m.r){bd=d;best=m;}
  }
  var boss=(NET.mode==='guest')?VIEW.boss:G.boss;
  if(boss){var db=Math.hypot(boss.x-mwx,boss.y-mwy);if(db<bd+boss.r){best=boss;bd=db;}}
  if(!best)return;
  if(!tileVis(best.x,best.y))return;
  var name=mobName(best);
  ctx.font='bold 11px Arial';
  var tw2=ctx.measureText(name).width;
  var hx=best.x,hy=best.y-best.r-26;
  ctx.fillStyle='rgba(10,13,18,0.85)';
  rr(ctx,hx-tw2/2-6,hy-11,tw2+12,17,4);ctx.fill();
  ctx.strokeStyle='rgba(90,100,115,0.8)';ctx.lineWidth=1;rr(ctx,hx-tw2/2-6,hy-11,tw2+12,17,4);ctx.stroke();
  ctx.fillStyle='#dfe6ee';ctx.textAlign='center';
  ctx.fillText(name,hx,hy+2);
  ctx.textAlign='left';
}
var STONEWORDS=['Я ВАС УСЛЫШАЛ','ЭТО НЕ БЛОКЕР','ДАВАЙ СИНХРОНИЗИРУЕМСЯ','АСАП ПО ЭТОМУ'];
function spawnDebris(d){
  d.t=0;d.vx=d.vx||0;d.vy=d.vy||0;d.rot=d.rot||0;d.vr=d.vr||0;
  if(DEBRIS.length>220)DEBRIS.shift();
  DEBRIS.push(d);
}

function spawnCoinBurst(x,y,n){
  for(var i=0;i<n;i++){
    spawnDebris({kind:'coin',x:x+R()*20-10,y:y-10,vx:R()*220-110,vy:-150-R()*170,vr:0,
      floorY:y+18+R()*30,g:980,phys:1,coined:1,t:0,life:7+R()*2});
  }
}

function critBurst(x,y,n){
  floatText(x+R()*30-15,y-30,CRITWORDS[(R()*CRITWORDS.length)|0],'#ff6a5c',16);
  spawnCoinBurst(x,y,n);
}
function spawnFolders(x,y,n){
  for(var i=0;i<n;i++){
    var a=R()*TAU,sp=90+R()*160;
    spawnDebris({kind:'folder',x:x,y:y-6,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-120,vr:R()*8-4,
      floorY:y+18+R()*40,g:800,phys:1,life:1.4+R()*0.8});
  }
}
function spawnHalves(f){
  spawnDebris({kind:'half',x:f.x+f.w*0.25,y:f.y+f.h/2,vx:-90-R()*70,vy:-120-R()*80,vr:-3-R()*3,
    floorY:f.y+f.h+26+R()*30,g:1300,phys:1,life:2.6});
  spawnDebris({kind:'half',x:f.x+f.w*0.75,y:f.y+f.h/2,vx:90+R()*70,vy:-120-R()*80,vr:3+R()*3,
    floorY:f.y+f.h+26+R()*30,g:1300,phys:1,life:2.6});
  for(var i=0;i<8;i++){
    var a=R()*TAU;
    G.fx.push({type:'spark2',x:f.x+f.w/2,y:f.y+f.h/2,t:0,life:0.35,a:a});
  }
  G.fx.push({type:'flash',x:f.x+f.w/2,y:f.y+f.h/2,r:50,t:0,life:0.2});
}
function spawnStone(x,y,tx,ty,word,hostDmg,tgtId){
  var d=Math.hypot(tx-x,ty-y)||1;
  spawnDebris({kind:'stone',word:word,x:x,y:y,sx:x,sy:y,tx:tx,ty:ty,
    dur:Math.max(0.22,d/620),life:Math.max(0.22,d/620)+0.02});
  if(hostDmg!==undefined)STONES.push({t:0,dur:Math.max(0.22,d/620),tgtId:tgtId,dmg:hostDmg,tx:tx,ty:ty});
  NET.events.push({k:'stone',x:Math.round(x),y:Math.round(y),tx:Math.round(tx),ty:Math.round(ty),w:word});
}
function stoneImpact(x,y){
  G.shake+=6;hitStopFx(0.05);
  spawnFolders(x,y,2);
  SFX.slam();SFX.thump();
}
function spawnWater(x,y){
  WATER.push({x:x,y:y,r:12,rMax:92,t:0,life:9});
  NET.events.push({k:'water',x:Math.round(x),y:Math.round(y)});
  SFX.slurp();
}
function spawnPrinterJet(x,y){
  PFX.push({x:x,y:y,t:0,life:5,acc:0});
  NET.events.push({k:'pstart',x:Math.round(x),y:Math.round(y)});
}
function inWater(x,y){
  for(var i=0;i<WATER.length;i++){var w=WATER[i];
    if(Math.hypot(x-w.x,y-w.y)<w.r)return true;
  }
  return false;
}
function updateChaos(dt){
  var i;
  for(i=DEBRIS.length-1;i>=0;i--){var d=DEBRIS[i];
    d.t+=dt;
    if(d.kind==='stone'){
      var k=Math.min(1,d.t/d.dur);
      d.x=d.sx+(d.tx-d.sx)*k;d.y=d.sy+(d.ty-d.sy)*k-Math.sin(k*Math.PI)*26;
      if(k>=1){stoneImpact(d.tx,d.ty);DEBRIS.splice(i,1);}
      continue;
    }
    if(d.kind==='soul'){
      d.y-=dt*(d.elite?60:40);
      d.x+=Math.sin(d.t*4)*26*dt;
      if(d.t>d.life){DEBRIS.splice(i,1);}
      continue;
    }
    if(d.phys){
      d.vy+=(d.g||900)*dt;
      d.x+=d.vx*dt;d.y+=d.vy*dt;d.rot+=d.vr*dt;
      if(d.y>d.floorY){
        d.y=d.floorY;
        if(Math.abs(d.vy)>60){d.vy*=-0.42;d.vx*=0.65;d.vr*=0.5;SFX.clack();}
        else{
          d.vy=0;d.vx*=0.82;d.vr=0;

          if(d.kind==='plate'&&!d.coined){d.coined=1;d.kind='coin';d.life=d.t+8;SFX.clack();}
        }
      }
      if(blockedAt(d.x,d.y,3)&&d.kind==='plate'){d.vx*=-0.55;d.vr*=-0.6;d.x+=d.vx*dt*2;}

      if(d.kind==='coin'){
        var me=localPlayer();
        if(me&&!me.dead){
          var dd2=Math.hypot(d.x-me.x,d.y-me.y);
          if(dd2<74){d.x+=(me.x-d.x)*10*dt;d.y+=(me.y-d.y)*10*dt;}
          if(dd2<18){
            DEBRIS.splice(i,1);
            me.coins=(me.coins||0)+1;
            me._coinAcc=(me._coinAcc||0)+1;me._coinT=0.5;
            G.fx.push({type:'flash',x:d.x,y:d.y,r:18,t:0,life:0.14});
            SFX.pickup();
            if(NET.mode==='guest'&&NET.hostConn&&NET.hostConn.open)NET.hostConn.send({t:'coin'});
            continue;
          }
        }
      }
    }
    if(d.t>d.life)DEBRIS.splice(i,1);
  }
  for(i=WATER.length-1;i>=0;i--){var w2=WATER[i];
    w2.t+=dt;
    w2.r+=(w2.rMax-w2.r)*(1-Math.exp(-2.5*dt));
    if(w2.t>w2.life)WATER.splice(i,1);
  }
  for(i=PFX.length-1;i>=0;i--){var pf=PFX[i];
    pf.t+=dt;pf.acc+=dt;
    if(pf.t>pf.life){PFX.splice(i,1);continue;}
    if(pf.acc>0.055){
      pf.acc=0;
      if(G.fx.length<220){
        var a=R()*TAU,sp=60+R()*220;
        G.fx.push({type:'paper',st:1,x:pf.x,y:pf.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-40,rot:R()*3,vr:R()*10-5,t:0,life:1.4+R()*1.2});
      }
    }
  }
  var meC=localPlayer();
  if(meC&&meC._coinAcc){
    meC._coinT-=dt;
    if(meC._coinT<=0){
      floatText(meC.x,meC.y-30,'+'+meC._coinAcc+' ✦','#ffcf5c',11,'D');
      meC._coinAcc=0;
    }
  }
  for(i=STONES.length-1;i>=0;i--){var st=STONES[i];
    st.t+=dt;
    if(st.t>=st.dur){
      var tgt=null;
      for(var pi2=0;pi2<G.players.length;pi2++)if(G.players[pi2].id===st.tgtId)tgt=G.players[pi2];

      if(tgt&&!tgt.dead&&Math.hypot(tgt.x-st.tx,tgt.y-st.ty)<30){
        addBurnout(tgt,st.dmg,'stone');
        stoneImpact(tgt.x,tgt.y);
      }else if(tgt){
        stoneImpact(st.tx,st.ty);
      }
      STONES.splice(i,1);
    }
  }
}
function drawChaos(){
  var i;

  for(i=0;i<WATER.length;i++){var w=WATER[i];
    var al=Math.min(0.4,0.55*(1-w.t/w.life)+0.15);
    ctx.fillStyle='rgba(70,120,180,'+al+')';
    ctx.beginPath();
    for(var an=0;an<=TAU+0.01;an+=0.35){
      var wob=w.r*(0.86+0.14*Math.sin(an*3+G.t*1.5+w.x));
      var px=w.x+Math.cos(an)*wob,py=w.y+Math.sin(an)*wob*0.7;
      if(an===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
    }
    ctx.closePath();ctx.fill();
    ctx.strokeStyle='rgba(140,190,240,'+al*0.6+')';ctx.lineWidth=1.5;ctx.stroke();
    ctx.fillStyle='rgba(200,230,255,0.12)';
    ctx.beginPath();ctx.ellipse(w.x-w.r*0.25,w.y-w.r*0.15,w.r*0.3,w.r*0.16,0,0,TAU);ctx.fill();
  }

  for(i=0;i<PFX.length;i++){
    ctx.fillStyle='rgba(200,210,225,0.25)';
    ctx.beginPath();ctx.arc(PFX[i].x,PFX[i].y,6+Math.sin(G.t*9+i)*2,0,TAU);ctx.fill();
  }
}
function drawDebris(){
  var i;
  for(i=0;i<DEBRIS.length;i++){var d=DEBRIS[i];
    if(d.kind!=='stone'&&!tileVis(d.x,d.y))continue;
    ctx.save();ctx.translate(d.x,d.y);
    if(d.kind==='coin'){
      var bob2=Math.sin(d.t*6+d.x)*1.2;
      ctx.translate(0,bob2);
      ctx.fillStyle='#8a6a1e';ctx.beginPath();ctx.arc(0,0,4.4,0,TAU);ctx.fill();
      ctx.fillStyle='#ffcf5c';ctx.beginPath();ctx.arc(-0.5,-0.5,3.6,0,TAU);ctx.fill();
      ctx.fillStyle='#8a6a1e';ctx.font='bold 6px Arial';ctx.textAlign='center';
      ctx.fillText('₽',0,2);ctx.textAlign='left';
      if(Math.sin(d.t*4+d.y)>0.92){ctx.fillStyle='#fff3c4';ctx.fillRect(2,-4,1.6,1.6);}
    }else if(d.kind==='plate'){
      ctx.rotate(Math.sin(d.t*3)*0.08+d.rot*0.06);
      var wdt=26+d.word.length*6.4;
      ctx.fillStyle='#2c3540';rr(ctx,-wdt/2,-9,wdt,18,3);ctx.fill();
      ctx.strokeStyle='#ffcf5c';ctx.lineWidth=1.5;rr(ctx,-wdt/2,-9,wdt,18,3);ctx.stroke();
      ctx.fillStyle='#ffcf5c';ctx.font='bold 9px Arial';ctx.textAlign='center';
      ctx.fillText(d.word,0,3);ctx.textAlign='left';
    }else if(d.kind==='folder'){
      ctx.rotate(d.rot);

      ctx.fillStyle='#f2efe6';ctx.fillRect(-6,-7,12,10);
      ctx.fillStyle='#cbb98e';rr(ctx,-8,-5,16,10,1);ctx.fill();
      ctx.strokeStyle='#a08c5a';ctx.lineWidth=1;rr(ctx,-8,-5,16,10,1);ctx.stroke();
      ctx.fillStyle='#f2efe6';ctx.fillRect(-3,-4,7,3);
      ctx.strokeStyle='#a08c5a';ctx.strokeRect(-3,-4,7,3);
    }else if(d.kind==='half'){
      ctx.rotate(d.rot);
      ctx.fillStyle='#3a404c';rr(ctx,-19,-8,38,15,2);ctx.fill();
      ctx.fillStyle='#454c59';ctx.fillRect(-19,-8,38,4);
      ctx.strokeStyle='#22262e';ctx.lineWidth=1.5;rr(ctx,-19,-8,38,15,2);ctx.stroke();
      ctx.fillStyle='#14171c';ctx.fillRect(-10,-4,14,9);
      if(d.vx>0){ctx.fillStyle='rgba(150,190,220,0.35)';ctx.fillRect(-8,-3,10,7);}
    }else if(d.kind==='stone'){

      ctx.strokeStyle='rgba(255,138,61,'+(0.3+0.2*Math.sin(G.t*10)).toFixed(2)+')';
      ctx.lineWidth=1.5;ctx.setLineDash([4,4]);
      ctx.beginPath();ctx.moveTo(d.x,d.y);ctx.lineTo(d.tx,d.ty);ctx.stroke();ctx.setLineDash([]);
      ctx.fillStyle='rgba(255,138,61,0.16)';
      ctx.beginPath();ctx.arc(d.tx,d.ty,13+3*Math.sin(G.t*8),0,TAU);ctx.fill();
      ctx.strokeStyle='rgba(255,170,80,0.8)';ctx.lineWidth=1.5;
      ctx.beginPath();ctx.arc(d.tx,d.ty,10,0,TAU);ctx.stroke();

      var k=Math.min(1,d.t/d.dur);
      var wx=d.sx+(d.tx-d.sx)*k,wy=d.sy+(d.ty-d.sy)*k;
      ctx.font='bold '+(15+3*Math.sin(G.t*12))+'px Georgia,serif';
      ctx.strokeStyle='rgba(40,10,4,0.9)';ctx.lineWidth=3;
      ctx.strokeText(d.word,wx,wy);
      ctx.fillStyle=(k>0.75)?'#ff5f45':'#ff9a3d';
      ctx.fillText(d.word,wx,wy);
    }
    ctx.restore();
  }
}

function drawSouls(){
  applyWorldT();
  for(var i=0;i<DEBRIS.length;i++){var d=DEBRIS[i];
    if(d.kind!=='soul')continue;
    if(!tileVis(d.x,d.y))continue;
    var k4=1-d.t/d.life,al4=0.85*k4;
    var agony=d.mood==='agony';
    ctx.save();
    ctx.translate(d.x,d.y);
    ctx.globalCompositeOperation='lighter';
    if(d.elite){
      ctx.strokeStyle='rgba(255,207,92,'+(al4*0.6)+')';ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(0,0,12+Math.sin(d.t*6)*2,0,TAU);ctx.stroke();
    }
    for(var tr=1;tr<=3;tr++){
      var cr=agony?255:150,cg=agony?140:210,cb2=agony?140:255;
      ctx.fillStyle='rgba('+cr+','+cg+','+cb2+','+(al4*0.3*(4-tr)/3).toFixed(3)+')';
      ctx.beginPath();ctx.ellipse(0,tr*7*(2-k4),(5-tr)*k4+1,(7-tr)*k4+1,0,0,TAU);ctx.fill();
    }
    ctx.fillStyle=agony?('rgba(255,170,170,'+al4.toFixed(3)+')'):('rgba(190,230,255,'+al4.toFixed(3)+')');
    ctx.beginPath();ctx.ellipse(0,0,(d.elite?7:5.5)*k4+1.5,(d.elite?10:8)*k4+1.5,0,0,TAU);ctx.fill();
    ctx.fillStyle='rgba(255,255,255,'+(al4*0.9).toFixed(3)+')';
    ctx.beginPath();ctx.ellipse(-1.5,-3,2*k4+0.5,3*k4+0.5,0,0,TAU);ctx.fill();
    ctx.restore();
  }
}
