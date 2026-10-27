'use strict';

function updateCamera(dt,snap){
  var me=localPlayer();
  if(!me)return;
  var Wc=cv.width/(DPR*G.zoom),Hc=cv.height/(DPR*G.zoom);
  var tx=me.x-Wc/2,ty=me.y-Hc/2;
  tx=(Wc>=MAP_W)?(MAP_W-Wc)/2:clamp(tx,0,MAP_W-Wc);
  ty=(Hc>=MAP_H)?(MAP_H-Hc)/2:clamp(ty,0,MAP_H-Hc);
  if(snap){G.camX=tx;G.camY=ty;}
  else{G.camX+=(tx-G.camX)*Math.min(1,dt*8);G.camY+=(ty-G.camY)*Math.min(1,dt*8);}
  if(G.shake>0){var sh=G.shake/3;G.camX+=R()*sh-sh/2;G.camY+=R()*sh-sh/2;}
}

var DPR=1;
var lightCv=document.createElement('canvas'),lctx=lightCv.getContext('2d');

var holeCv=document.createElement('canvas');holeCv.width=128;holeCv.height=128;
(function(){var c=holeCv.getContext('2d');
  var g=c.createRadialGradient(64,64,0,64,64,64);
  g.addColorStop(0,'rgba(0,0,0,1)');g.addColorStop(1,'rgba(0,0,0,0)');
  c.fillStyle=g;c.beginPath();c.arc(64,64,64,0,TAU);c.fill();
})();
function worldPool(sel){
  if(NET.mode==='guest')return VIEW[sel];
  return G[sel];
}
function applyWorldT(){ctx.setTransform(DPR*G.zoom,0,0,DPR*G.zoom,-G.camX*DPR*G.zoom,-G.camY*DPR*G.zoom);}
function applyScreenT(){ctx.setTransform(DPR,0,0,DPR,0,0);}
var fogCv=document.createElement('canvas');fogCv.width=GW;fogCv.height=GH;
var fogCtx=fogCv.getContext('2d');
var mmFogCv=document.createElement('canvas');mmFogCv.width=GW;mmFogCv.height=GH;
var mmFogCtx=mmFogCv.getContext('2d');
function rebuildFog(){
  var img=fogCtx.createImageData(GW,GH),mm=mmFogCtx.createImageData(GW,GH);
  var d=img.data,md=mm.data;
  for(var i=0;i<GW*GH;i++){
    var o=i*4;
    if(!FOG.explored[i]){d[o]=14;d[o+1]=10;d[o+2]=8;d[o+3]=255;md[o]=16;md[o+1]=12;md[o+2]=9;md[o+3]=225;}
    else if(!FOG.vis[i]){d[o]=16;d[o+1]=12;d[o+2]=10;d[o+3]=150;md[o]=18;md[o+1]=13;md[o+2]=10;md[o+3]=100;}
    else d[o+3]=md[o+3]=0;
  }
  fogCtx.putImageData(img,0,0);
  mmFogCtx.putImageData(mm,0,0);
}
function drawFog(){
  if(FOG.dirty){FOG.dirty=false;rebuildFog();}
  ctx.imageSmoothingEnabled=true;
  ctx.drawImage(fogCv,-TILE*0.5,-TILE*0.5,MAP_W+TILE,MAP_H+TILE);
}

function drawNeonDecor(){
  var Wc=cv.width/(DPR*G.zoom),Hc=cv.height/(DPR*G.zoom);
  var vx0=G.camX-40,vy0=G.camY-40,vx1=G.camX+Wc+40,vy1=G.camY+Hc+40;
  var i,city=cityStrip();
  for(i=0;i<WINS.length;i++){var wn=WINS[i];
    if(wn.x+wn.w<vx0||wn.x>vx1||wn.y+wn.h<vy0||wn.y>vy1)continue;
    ctx.save();
    ctx.beginPath();ctx.rect(wn.x+2,wn.y+2,wn.w-4,wn.h-4);ctx.clip();
    var par=0.42,cw=640;
    var ox=wn.x-((G.camX*par)%cw),oy=wn.y+wn.h-116+((G.camY*par*0.2)%20);
    ctx.imageSmoothingEnabled=false;
    ctx.drawImage(city,ox-cw,oy);ctx.drawImage(city,ox,oy);ctx.drawImage(city,ox+cw,oy);

    ctx.strokeStyle='rgba(160,170,190,0.28)';ctx.lineWidth=1;
    ctx.beginPath();
    for(var rn=0;rn<8;rn++){
      var rx2=wn.x+((G.t*220+rn*97+wn.x)%(wn.w+20))-10;
      var ry2=wn.y+((G.t*340+rn*53)%(wn.h+20))-10;
      ctx.moveTo(rx2,ry2);ctx.lineTo(rx2-3,ry2+9);
    }
    ctx.stroke();

    if(((G.t*0.13+wn.x*0.0007)%9)<0.08){
      ctx.fillStyle='rgba(220,228,244,0.3)';ctx.fillRect(wn.x,wn.y,wn.w,wn.h);
    }
    ctx.restore();
  }
  for(i=0;i<HOLOS.length;i++){var ho=HOLOS[i];
    if(ho.x+ho.w<vx0||ho.x>vx1||ho.y+ho.h<vy0||ho.y>vy1)continue;
    var fl=0.82+0.18*Math.sin(G.t*17+ho.ph);
    if(R()<0.012)fl=0.25;
    ctx.globalAlpha=Math.min(1,fl);
    ctx.fillStyle='#0d0b08';ctx.fillRect(ho.x,ho.y,ho.w,ho.h);
    ctx.strokeStyle='#d8a94e';ctx.lineWidth=1.4;
    ctx.beginPath();
    for(var g2=0;g2<6;g2++){
      var px4=ho.x+2+(ho.w-4)*g2/5;
      var drop=((G.t*14+ho.ph*3+g2*7)%40)/40;
      var py4=ho.y+3+(ho.h-6)*(0.25+0.6*(g2/10+drop*0.5));
      if(g2===0)ctx.moveTo(px4,py4);else ctx.lineTo(px4,py4);
    }
    ctx.stroke();
    ctx.strokeStyle='rgba(163,38,38,0.85)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(ho.x+2,ho.y+ho.h-4);
    ctx.lineTo(ho.x+ho.w-2,ho.y+ho.h-4-((G.t*26+ho.ph*11)%8));ctx.stroke();
    ctx.fillStyle='rgba(216,207,192,0.5)';
    for(var tick=0;tick<3;tick++){
      var tx3=ho.x+3+((G.t*18+tick*13+ho.ph*7)%(ho.w-6));
      ctx.fillRect(tx3,ho.y+2,3,1.5);
    }
    ctx.fillStyle='rgba(216,169,78,0.08)';
    for(var sl2=0;sl2<ho.h;sl2+=3)ctx.fillRect(ho.x,ho.y+sl2,ho.w,1);
    ctx.globalAlpha=1;
  }
  for(i=0;i<RACKS.length;i++){var rk=RACKS[i];
    if(rk.x+16<vx0||rk.x>vx1||rk.y+28<vy0||rk.y>vy1)continue;
    for(var led=0;led<6;led++){
      var lx2=rk.x+2+(led%2)*9,ly2=rk.y+2+((led/2)|0)*5;
      var on=Math.sin(G.t*(6+led*1.7)+rk.ph+led*2.4)>0.1;
      ctx.fillStyle=on?((led%3===0)?NEON.torch:NEON.green):'#1a1610';
      ctx.fillRect(lx2,ly2,2.4,2.4);
    }
  }
}
function drawWorld(){
  var mobs=worldPool('mobs'),players=worldPool('players'),projs=worldPool('projs'),
      pickups=(NET.mode==='guest')?VIEW.pickups:G.pickups,zones=(NET.mode==='guest')?VIEW.zones:G.zones,
      boss=(NET.mode==='guest')?VIEW.boss:G.boss;
  applyScreenT();
  var W=cv.width/DPR,H=cv.height/DPR;
  ctx.fillStyle='#0E0A08';ctx.fillRect(0,0,W,H);
  applyWorldT();
  ctx.drawImage(floorCv,0,0);
  drawNeonDecor();
  drawChaos();
  var i;
  for(i=0;i<zones.length;i++){var z=zones[i];
    var life=(NET.mode==='guest')?(1-z.tl/7):(1-z.t/z.life);
    var al=Math.min(0.28,0.45*Math.max(0,life));
    if(z.friendly){
      ctx.fillStyle='rgba(232,137,74,'+(al+0.08).toFixed(3)+')';ctx.fillRect(z.x,z.y,z.w,z.h);
      ctx.strokeStyle='rgba(255,170,80,0.75)';ctx.lineWidth=2;ctx.strokeRect(z.x,z.y,z.w,z.h);
      ctx.fillStyle='rgba(255,220,160,0.9)';ctx.font='11px Arial';ctx.fillText('3 СЕНТЯБРЯ · РЯБИНА ГОРИТ',z.x+8,z.y+16);
    }else{
      ctx.fillStyle='rgba(180,40,40,'+al+')';ctx.fillRect(z.x,z.y,z.w,z.h);
      ctx.strokeStyle='rgba(220,70,60,0.6)';ctx.lineWidth=2;ctx.strokeRect(z.x,z.y,z.w,z.h);
      ctx.fillStyle='rgba(255,120,110,0.85)';ctx.font='10px Arial';ctx.fillText('НЕ СОГЛАСОВАНО',z.x+6,z.y+14);
    }
  }
  if(G.plan>0){
    for(i=0;i<players.length;i++){var pp2=players[i];
      ctx.strokeStyle='rgba(255,207,92,'+(0.35+0.2*Math.sin(G.t*6)).toFixed(3)+')';ctx.lineWidth=2.5;
      ctx.beginPath();ctx.arc(pp2.x,pp2.y,26+Math.sin(G.t*4)*4,0,TAU);ctx.stroke();
    }
  }
  if(G.demon){
    var dm=G.demon;
    ctx.save();ctx.translate(dm.x,dm.y);ctx.rotate(Math.sin(dm.ph*1.4)*0.12);
    ctx.font='bold 21px "Comic Sans MS","IBM Plex Mono",cursive';
    ctx.strokeStyle='rgba(60,15,45,0.85)';ctx.lineWidth=5;ctx.textAlign='center';
    ctx.strokeText('Comic Sans',0,0);
    ctx.fillStyle='rgba(232,138,200,'+(0.75+0.2*Math.sin(G.t*7)).toFixed(3)+')';ctx.fillText('Comic Sans',0,0);
    ctx.fillStyle='#e83a9c';
    ctx.beginPath();ctx.moveTo(-26,-14);ctx.lineTo(-20,-26);ctx.lineTo(-15,-13);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(26,-14);ctx.lineTo(20,-26);ctx.lineTo(15,-13);ctx.closePath();ctx.fill();
    ctx.textAlign='left';ctx.restore();
  }
  var cf=(NET.mode==='guest')?VIEW.coffee:null;
  for(i=0;i<COFFEES.length;i++)drawCoffeePoint(COFFEES[i],cf?cf[i]:COFFEES[i].charges);
  for(i=0;i<pickups.length;i++){if(tileVis(pickups[i].x,pickups[i].y))drawPickup(pickups[i]);}
  if(boss&&boss.windup>0){
    var rad=150+20*(boss.phase||1);
    ctx.fillStyle='rgba(200,60,50,'+(0.15+0.1*Math.sin(G.t*12))+')';
    ctx.beginPath();ctx.arc(boss.tx,boss.ty,rad,0,TAU);ctx.fill();
    ctx.strokeStyle='rgba(230,90,80,0.7)';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(boss.tx,boss.ty,rad,0,TAU);ctx.stroke();
  }
  for(i=0;i<G.fx.length;i++){var f=G.fx[i];
    if(f.type==='stamp'&&f.t<1.2){
      ctx.save();ctx.translate(f.x,f.y);ctx.rotate(-0.12);
      ctx.strokeStyle='rgba(200,60,50,'+(0.8*(1-f.t/5))+')';ctx.lineWidth=4;
      var r2=f.rad*0.8;ctx.strokeRect(-r2,-r2*0.5,r2*2,r2);
      ctx.fillStyle='rgba(200,60,50,'+(0.7*(1-f.t/5))+')';ctx.font='bold '+Math.round(r2*0.3)+'px Arial';
      ctx.textAlign='center';ctx.fillText('СВЕДЕНО',0,8);ctx.textAlign='left';ctx.restore();
    }
  }
  for(i=0;i<mobs.length;i++){
    if(!tileVis(mobs[i].x,mobs[i].y))continue;
    ctx.globalAlpha=1-Math.max(0,mobs[i].fade||0);
    if(mobs[i].type==='deadline')drawDeadline(mobs[i],NET.mode==='guest');
    else drawIntern(mobs[i],NET.mode==='guest');
    ctx.globalAlpha=1;
  }

  var playersAll=worldPool('players');
  for(i=0;i<mobs.length;i++){var mc=mobs[i];
    if(mc.mk>0){
      var pl2=0.5+0.5*Math.sin(G.t*6);
      ctx.strokeStyle='rgba(224,112,80,'+(0.5+0.4*pl2)+')';ctx.lineWidth=1.6;
      ctx.beginPath();ctx.arc(mc.x,mc.y,mc.r+7,0,TAU);ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(mc.x-mc.r-14,mc.y);ctx.lineTo(mc.x-mc.r-6,mc.y);ctx.moveTo(mc.x+mc.r+6,mc.y);ctx.lineTo(mc.x+mc.r+14,mc.y);
      ctx.moveTo(mc.x,mc.y-mc.r-14);ctx.lineTo(mc.x,mc.y-mc.r-6);ctx.moveTo(mc.x,mc.y+mc.r+6);ctx.lineTo(mc.x,mc.y+mc.r+14);
      ctx.stroke();
    }
    if(mc.ch>0){
      var src=playersAll[(mc.chS===undefined||mc.chS<0)?0:mc.chS%playersAll.length];
      if(src){
        ctx.strokeStyle='rgba(160,140,90,'+(0.4+0.2*Math.sin(G.t*5+i))+')';
        ctx.lineWidth=2;
        ctx.beginPath();ctx.moveTo(src.x,src.y);
        var segs=5;
        for(var sg=1;sg<segs;sg++){
          var tt=sg/segs;
          var nx=src.x+(mc.x-src.x)*tt,ny=src.y+(mc.y-src.y)*tt;
          var sag=Math.sin(tt*Math.PI)*16+Math.sin(G.t*6+sg*2+i)*4;
          var dxn=-(mc.y-src.y),dyn=(mc.x-src.x);
          var dl=Math.hypot(dxn,dyn)||1;
          ctx.lineTo(nx+dxn/dl*sag,ny+dyn/dl*sag);
        }
        ctx.lineTo(mc.x,mc.y);
        ctx.stroke();
        ctx.fillStyle='rgba(160,140,90,0.8)';
        ctx.beginPath();ctx.arc(mc.x,mc.y-4,3,0,TAU);ctx.fill();
      }
    }
  }
  if(boss&&tileVis(boss.x,boss.y))drawBoss(boss,NET.mode==='guest');
  for(i=0;i<players.length;i++)drawPlayer(players[i],players[i].id===NET.myId);
  for(i=0;i<projs.length;i++){var pj=projs[i];
    ctx.save();ctx.translate(pj.x,pj.y);ctx.rotate(pj.rot||0);
    if(pj.kind==='key'){
      ctx.fillStyle='#e8e8ee';rr(ctx,-6,-6,12,12,2.5);ctx.fill();
      ctx.fillStyle='#c8ccd4';rr(ctx,-6,-6,12,3.5,2);ctx.fill();
      ctx.fillStyle='#3a3f4a';ctx.font='bold 9px monospace';ctx.textAlign='center';
      ctx.fillText('QWERTYASDFG'[(pj.lt||0)%11],0,3.4);ctx.textAlign='left';
    }else if(pj.kind==='comic'){
      ctx.rotate(Math.sin((pj.rot||0)*6)*0.3);
      ctx.fillStyle='#e88ac8';ctx.font='bold 13px "Comic Sans MS","IBM Plex Mono",cursive';ctx.textAlign='center';
      ctx.strokeStyle='rgba(40,10,30,0.8)';ctx.lineWidth=3;ctx.strokeText('POW',0,4);
      ctx.fillText('POW',0,4);ctx.textAlign='left';
    }else if(pj.kind==='tw'||pj.kind==='tg'||pj.kind==='ig'){
      var fa=Math.atan2(pj.vy,pj.vx);
      ctx.rotate(fa-pj.rot+Math.sin((pj.rot||0)*3+G.t*8)*0.15);
      if(pj.kind==='tw'){
      ctx.fillStyle='#1d9bf0';
      ctx.beginPath();ctx.ellipse(0,0,7,5.4,-0.2,0,TAU);ctx.fill();
      ctx.beginPath();ctx.arc(4.6,-2.6,3,0,TAU);ctx.fill();
      ctx.fillStyle='#e8f6ff';
      ctx.beginPath();ctx.moveTo(7.4,-3.4);ctx.lineTo(10.6,-2.4);ctx.lineTo(7.2,-1.4);ctx.closePath();ctx.fill();
      ctx.beginPath();ctx.moveTo(-1,-1);ctx.quadraticCurveTo(-7,-6,-2,2.6);ctx.closePath();ctx.fill();
      ctx.strokeStyle='#e8f6ff';ctx.lineWidth=1.4;
      ctx.beginPath();ctx.moveTo(-6.5,1.5);ctx.quadraticCurveTo(-9,3.5,-7,5);ctx.stroke();
      ctx.fillStyle='#0c2a40';ctx.beginPath();ctx.arc(5.4,-3,0.9,0,TAU);ctx.fill();
      }else if(pj.kind==='tg'){
      ctx.fillStyle='#2aabee';
      ctx.beginPath();ctx.moveTo(-9,-5);ctx.lineTo(10,0);ctx.lineTo(-9,5);ctx.lineTo(-5.5,0);ctx.closePath();ctx.fill();
      ctx.fillStyle='#1d84c9';
      ctx.beginPath();ctx.moveTo(-5.5,0);ctx.lineTo(10,0);ctx.lineTo(-9,5);ctx.closePath();ctx.fill();
      ctx.fillStyle='#e8f6ff';
      ctx.beginPath();ctx.moveTo(-6.5,-1.2);ctx.lineTo(6,-0.4);ctx.lineTo(-6.5,1.4);ctx.closePath();ctx.fill();
      }else{
      var ig=ctx.createLinearGradient(-8,-8,8,8);
      ig.addColorStop(0,'#f5a24b');ig.addColorStop(0.5,'#e1306c');ig.addColorStop(1,'#a437c9');
      ctx.fillStyle=ig;
      rr(ctx,-7.5,-7.5,15,15,4.5);ctx.fill();
      ctx.strokeStyle='#ffffff';ctx.lineWidth=1.6;
      rr(ctx,-4.6,-4.6,9.2,9.2,3);ctx.stroke();
      ctx.beginPath();ctx.arc(0,0,2.4,0,TAU);ctx.stroke();
      ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(4.2,-4.2,0.9,0,TAU);ctx.fill();
      }
    }else{

      var fa2=Math.atan2(pj.vy,pj.vx);
      var tilt=fa2-pj.rot+Math.sin((pj.rot||0)*3+G.t*8)*0.15;
      ctx.rotate(tilt);
      ctx.fillStyle='#fbfcfe';rr(ctx,-14,-9,28,18,3);ctx.fill();
      ctx.strokeStyle='#2684FF';ctx.lineWidth=2;rr(ctx,-14,-9,28,18,3);ctx.stroke();
      ctx.fillStyle='#2684FF';ctx.fillRect(-14,-9,28,4);
      ctx.save();
      ctx.rotate(-tilt);
      ctx.translate(0,0.5);
      drawJiraIcon(ctx,1.28);
      ctx.restore();
    }
    ctx.restore();
  }
  for(i=0;i<G.fx.length;i++)drawFx(G.fx[i]);
  drawDebris();
  for(i=0;i<G.texts.length;i++){var t=G.texts[i];
    var hold=t.life*0.7;
    ctx.globalAlpha=t.t<hold?1:1-(t.t-hold)/(t.life-hold);
    ctx.font='bold '+t.size+'px "IBM Plex Mono",Arial,monospace';
    if(t.w===undefined)t.w=ctx.measureText(t.text).width;
    if(t.ch==='C'||t.ch==='I'||t.ch==='S'||!t.ch){
      ctx.fillStyle='rgba(8,6,12,0.62)';
      rr(ctx,t.x-t.w/2-6,t.y-t.size-3,t.w+12,t.size+8,4);ctx.fill();
    }
    ctx.textAlign='center';
    if(t.ch==='C'||t.ch==='I'||t.ch==='S'||!t.ch){ctx.strokeStyle='rgba(4,3,8,0.9)';ctx.lineWidth=3;ctx.strokeText(t.text,t.x,t.y);}
    ctx.fillStyle=t.color;ctx.fillText(t.text,t.x,t.y);
    ctx.textAlign='left';
    ctx.globalAlpha=1;
  }
  drawFog();
  drawHoverTag();
}
function drawCoffeePoint(cp,charges){
  var bob=Math.sin(G.t*2+cp.x)*2;
  ctx.fillStyle='rgba(0,0,0,0.35)';ctx.beginPath();ctx.ellipse(cp.x,cp.y+8,22,10,0,0,TAU);ctx.fill();

  ctx.fillStyle='#1c1610';rr(ctx,cp.x-20,cp.y-6,40,14,3);ctx.fill();
  ctx.strokeStyle='rgba(196,98,42,0.5)';ctx.lineWidth=1.5;rr(ctx,cp.x-20,cp.y-6,40,14,3);ctx.stroke();
  ctx.fillStyle='#120e0a';ctx.fillRect(cp.x-13,cp.y-36,26,32);
  ctx.fillStyle='#241c14';ctx.fillRect(cp.x-9,cp.y-30,18,14);
  ctx.fillStyle=charges>0?'#7fb069':'#a32626';ctx.fillRect(cp.x-7,cp.y-27,4,3);
  ctx.fillStyle='#c9bfae';ctx.fillRect(cp.x+7,cp.y-30,3,20);
  var lvl=Math.min(1,charges/5);
  ctx.fillStyle='rgba(196,98,42,0.18)';ctx.fillRect(cp.x-11,cp.y-30,4,24);
  if(charges>0){ctx.fillStyle='#f2c17e';ctx.fillRect(cp.x-11,cp.y-30+24*(1-lvl),4,24*lvl);}
  for(var i=0;i<charges;i++){
    ctx.fillStyle='#e8dcc2';ctx.fillRect(cp.x-16+i*7,cp.y-14+bob*0.3,5,8);
  }
  if(charges===0){
    ctx.fillStyle='rgba(139,148,158,0.7)';ctx.font='10px Arial';ctx.textAlign='center';
    ctx.fillText('кофе закончился…',cp.x,cp.y-46);ctx.textAlign='left';
  }
  var me=localPlayer();
  if(me&&charges>0&&dist(me,cp)<60&&!me.dead){
    ctx.fillStyle='#e6edf3';ctx.font='bold 12px Arial';ctx.textAlign='center';
    ctx.fillText(isTouch?'КОФЕ':'E — кофе',cp.x,cp.y-50);ctx.textAlign='left';
  }
}
function drawPickup(pk){
  var age=(NET.mode==='guest')?G.t:pk.t;
  var bob=Math.sin(age*3)*3,al=(NET.mode==='guest')?1:(pk.life<3?(Math.sin(pk.t*12)*0.5+0.5):1);
  ctx.globalAlpha=al;
  var y=pk.y+bob;
  if(pk.kind==='coffee'){
    ctx.fillStyle='#d8dce2';rr(ctx,pk.x-6,y-8,12,14,2);ctx.fill();
    ctx.strokeStyle='#d8dce2';ctx.lineWidth=2;ctx.beginPath();ctx.arc(pk.x+8,y-1,4,-1.2,1.2);ctx.stroke();
    ctx.fillStyle='#6f4a23';ctx.fillRect(pk.x-4,y-2,8,6);
  }else if(pk.kind==='folder'){
    ctx.fillStyle='#d29922';rr(ctx,pk.x-11,y-9,22,17,2);ctx.fill();
    ctx.fillStyle='#8a6a10';ctx.fillRect(pk.x-11,y-9,22,5);
    ctx.fillStyle='#1c1600';ctx.font='bold 10px Arial';ctx.textAlign='center';
    ctx.fillText('ЗАДАЧИ',pk.x,y+6);ctx.textAlign='left';
  }else{
    ctx.fillStyle=pk.kind==='espresso'?'#6f4a23':(pk.kind==='desk'?'#4a6da7':'#3fb950');
    rr(ctx,pk.x-9,y-9,18,18,3);ctx.fill();
    ctx.fillStyle='#0d1117';ctx.font='bold 12px Arial';ctx.textAlign='center';
    ctx.fillText(pk.kind==='espresso'?'Э':(pk.kind==='desk'?'С':'Ц'),pk.x,y+4);ctx.textAlign='left';
  }
  ctx.globalAlpha=1;
}
function drawFx(f){
  var k=f.t/f.life;
  if(f.type==='slash'){
    var scol=f.cls==='dev'?'242,198,140':(f.cls==='dsn'?'192,90,138':(f.cls==='mgr'?'180,50,44':(f.cls==='mkt'?'216,169,78':'223,230,238')));
    if(f.big&&f.cls==='dsn')scol='224,120,160';
    ctx.strokeStyle='rgba('+scol+','+(0.9*(1-k))+')';
    ctx.lineWidth=(f.big?7:4)*(1-k*0.5);
    ctx.beginPath();ctx.arc(f.x,f.y,f.rad*0.85,f.a-f.arc/2,f.a+f.arc/2);ctx.stroke();
  }else if(f.type==='ring'){
    var r=f.rad+((f.radMax-f.rad)*k);
    var col=f.blue?'122,162,200':(f.green?'139,209,124':(f.purple?'200,162,224':(f.red?'224,112,80':(f.orange?'255,140,40':(f.yellow?'210,153,34':'223,230,238')))));
    ctx.strokeStyle='rgba('+col+','+(0.8*(1-k))+')';ctx.lineWidth=3;
    ctx.beginPath();ctx.arc(f.x,f.y,r,0,TAU);ctx.stroke();
  }else if(f.type==='paper'){
    ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.rot);
    ctx.fillStyle='rgba(223,230,238,'+(1-k)+')';ctx.fillRect(-5,-3,10,6);ctx.restore();
  }else if(f.type==='ember'){
    ctx.fillStyle='rgba(255,150,50,'+(0.7*(1-k))+')';
    ctx.beginPath();ctx.arc(f.x,f.y,(f.r||3)*(1-k*0.5),0,TAU);ctx.fill();
  }else if(f.type==='paint'){
    ctx.globalAlpha=0.5*(1-k);
    ctx.fillStyle=f.col;
    ctx.beginPath();
    ctx.moveTo(f.x+f.r,f.y);
    for(var an=0;an<TAU;an+=0.6){
      var wob2=f.r*(0.6+Math.sin(an*7+f.r)*0.3);
      ctx.lineTo(f.x+Math.cos(an)*wob2,f.y+Math.sin(an)*wob2*0.8);
    }
    ctx.closePath();ctx.fill();
    ctx.globalAlpha=1;
  }else if(f.type==='flash'){
    ctx.globalCompositeOperation='lighter';
    var g3=ctx.createRadialGradient(f.x,f.y,0,f.x,f.y,f.r*(0.5+k));
    g3.addColorStop(0,'rgba(255,240,214,'+(0.8*(1-k))+')');
    g3.addColorStop(0.5,'rgba(255,120,40,'+(0.35*(1-k))+')');
    g3.addColorStop(1,'rgba(255,120,40,0)');
    ctx.fillStyle=g3;ctx.beginPath();ctx.arc(f.x,f.y,f.r*(0.5+k),0,TAU);ctx.fill();
    ctx.globalCompositeOperation='source-over';
  }else if(f.type==='spark2'){
    ctx.strokeStyle='rgba(235,240,248,'+(0.8*(1-k))+')';ctx.lineWidth=2;
    var rr3=20+k*46;
    ctx.beginPath();ctx.moveTo(f.x+Math.cos(f.a)*rr3*0.4,f.y+Math.sin(f.a)*rr3*0.4);
    ctx.lineTo(f.x+Math.cos(f.a)*rr3,f.y+Math.sin(f.a)*rr3);ctx.stroke();
  }else if(f.type==='keycap'){
    var kd=(f.dst||30)*k;
    var kx=f.x+Math.cos(f.a)*kd,ky=f.y+Math.sin(f.a)*kd-k*10;
    ctx.save();ctx.translate(kx,ky);ctx.rotate((f.a||0)+Math.sin(k*9)*0.6);
    ctx.globalAlpha=1-k;
    ctx.fillStyle='#3a332a';rr(ctx,-4,-4,8,8,1.5);ctx.fill();
    ctx.fillStyle='#efe5ce';rr(ctx,-4,-4,8,2.5,1);ctx.fill();
    ctx.fillStyle='#2a241c';ctx.font='bold 7px "IBM Plex Mono",Arial,monospace';ctx.textAlign='center';
    ctx.fillText(f.ch||'?',0,2.8);ctx.textAlign='left';
    ctx.restore();ctx.globalAlpha=1;
  }else if(f.type==='grid'){
    ctx.save();ctx.translate(f.x,f.y);
    var ga=0.85*(1-k),gw2=f.r||80,gh2=gw2*0.62;
    ctx.strokeStyle='rgba(180,50,44,'+ga.toFixed(3)+')';ctx.lineWidth=1.5;
    ctx.beginPath();
    for(var gi2=0;gi2<=3;gi2++){ctx.moveTo(-gw2/2+gw2*gi2/3,-gh2/2);ctx.lineTo(-gw2/2+gw2*gi2/3,gh2/2);}
    for(var gj2=0;gj2<=2;gj2++){ctx.moveTo(-gw2/2,-gh2/2+gh2*gj2/2);ctx.lineTo(gw2/2,-gh2/2+gh2*gj2/2);}
    ctx.stroke();
    if(((f.t*18)|0)%2===0){
      ctx.fillStyle='rgba(163,38,38,'+(ga*0.5).toFixed(3)+')';
      ctx.fillRect(-gw2/6-7,-gh2/4-5,14,9);
    }
    ctx.restore();
  }else if(f.type==='spamcone'){
    ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.a||0);
    var sl2=(f.len||66)*(0.5+k*0.8),shw=(f.hw||30)*(0.5+k);
    ctx.fillStyle='rgba(216,169,78,'+(0.15*(1-k)).toFixed(3)+')';
    ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(sl2,-shw);ctx.lineTo(sl2,shw);ctx.closePath();ctx.fill();
    ctx.globalAlpha=1-k;
    for(var si2=0;si2<3;si2++){
      var px3=sl2*(0.5+si2*0.22),py3=(si2-1)*shw*0.5;
      ctx.fillStyle='#33270f';ctx.fillRect(px3-7,py3-5,14,10);
      ctx.strokeStyle=NEON.brass;ctx.lineWidth=1;ctx.strokeRect(px3-7,py3-5,14,10);
      ctx.fillStyle='#e8d9b8';ctx.font='bold 6px "IBM Plex Mono",Arial,monospace';ctx.textAlign='center';
      ctx.fillText(si2===1?'SALE!':'BUY!',px3,py3+2.5);ctx.textAlign='left';
    }
    ctx.globalAlpha=1;ctx.restore();
  }else if(f.type==='cmyk'){
    for(var ci3=0;ci3<4;ci3++){
      var an3=(f.a||0)+ci3*TAU/4,d3=6+k*20;
      ctx.globalAlpha=1-k;
      ctx.fillStyle=['#5fa8b8','#b85f7a','#c4a94e','#2c2620'][ci3];
      ctx.beginPath();ctx.arc(f.x+Math.cos(an3)*d3,f.y+Math.sin(an3)*d3,2.6,0,TAU);ctx.fill();
    }
    ctx.globalAlpha=1;
  }else if(f.type==='smoke'){
    ctx.globalAlpha=0.4*(1-k);
    ctx.fillStyle=f.col||'#6b5a48';
    var sx3=f.x+Math.sin(k*9+f.x)*3,sy3=f.y-k*14;
    ctx.fillRect(sx3-3,sy3-3,6,6);
    ctx.fillRect(sx3-1.5,sy3-7,3,4);
    ctx.globalAlpha=1;
  }else if(f.type==='slang'){
    var sxx=f.x+(f.dir||1)*24*Math.sin(Math.min(1,k*1.3)*Math.PI);
    var syy=f.y-46*k*(1.7-k);
    ctx.save();ctx.translate(sxx,syy);ctx.rotate((f.dir||1)*0.12*Math.sin(k*Math.PI));
    ctx.globalAlpha=Math.pow(1-k,1.4);
    ctx.font='bold 13px "Pixelify Sans","IBM Plex Mono",monospace';ctx.textAlign='center';
    ctx.strokeStyle='rgba(24,12,8,0.9)';ctx.lineWidth=3;
    ctx.strokeText(f.txt,0,0);
    ctx.fillStyle=f.col;ctx.fillText(f.txt,0,0);
    ctx.textAlign='left';ctx.restore();ctx.globalAlpha=1;
  }else if(f.type==='shard'){
    var gy2=f.y+320*k*k;
    ctx.globalAlpha=1-k;
    ctx.fillStyle=(f.vy<0)?'#e8c56a':'#c49a3d';
    ctx.save();ctx.translate(f.x+(f.vx||0)*k,gy2);ctx.rotate(k*7);
    ctx.fillRect(-2.5,-2.5,5,5);
    ctx.restore();ctx.globalAlpha=1;
  }
}

var LIGHT_LEGACY=/[?&]light=legacy/.test(location.search);
var bakeCv=document.createElement('canvas'),bakeCtx=bakeCv.getContext('2d'),bakeT=-9;
function rebakeLights(){
  bakeT=G.t;
  var bs=0.0625;
  var bw=Math.max(2,Math.round(MAP_W*bs)),bh=Math.max(2,Math.round(MAP_H*bs));
  if(bakeCv.width!==bw||bakeCv.height!==bh){bakeCv.width=bw;bakeCv.height=bh;}
  bakeCtx.setTransform(1,0,0,1,0,0);
  bakeCtx.clearRect(0,0,bw,bh);
  bakeCtx.globalCompositeOperation='source-over';
  bakeCtx.setTransform(bs,0,0,bs,0,0);
  for(var i=0;i<LIGHTS.length;i++){var L=LIGHTS[i];
    if(L.dead)continue;
    var inten=L.dim;
    if(inten<=0.03)continue;
    bakeCtx.globalAlpha=Math.min(1,inten+0.3);
    bakeCtx.drawImage(holeCv,L.x-215,L.y-215,430,430);
  }
  bakeCtx.globalAlpha=1;
}
function drawLighting(){
  var sc=LIGHT_LEGACY?0.5:0.25;
  if(lightCv.width!==Math.max(2,Math.round(cv.width*sc))||lightCv.height!==Math.max(2,Math.round(cv.height*sc))){lightCv.width=Math.max(2,Math.round(cv.width*sc));lightCv.height=Math.max(2,Math.round(cv.height*sc));}
  lctx.setTransform(1,0,0,1,0,0);
  lctx.clearRect(0,0,lightCv.width,lightCv.height);
  lctx.fillStyle='rgba(10,6,3,0.55)';lctx.fillRect(0,0,lightCv.width,lightCv.height);
  lctx.globalCompositeOperation='destination-out';
  lctx.setTransform(DPR*G.zoom*sc,0,0,DPR*G.zoom*sc,-G.camX*DPR*G.zoom*sc,-G.camY*DPR*G.zoom*sc);
  function hole(x,y,r,i2){
    lctx.globalAlpha=i2;
    lctx.drawImage(holeCv,x-r,y-r,r*2,r*2);
    lctx.globalAlpha=1;
  }
  var i;
if(LIGHT_LEGACY){
    for(i=0;i<LIGHTS.length;i++){var L=LIGHTS[i];
      if(L.dead)continue;
      var inten=L.dim*(0.82+0.18*Math.sin(G.t*7+L.ph)+0.08*Math.sin(G.t*23+L.sd*7));
      if(L.sput>0){L.sput-=1/60;inten*=(Math.sin(G.t*60+L.sd)>0?1:0.15);}
      else if(R()<0.0015)L.sput=0.25+R()*0.3;
      L._g=Math.max(0,inten);
      if(inten>0.03)hole(L.x,L.y,215*Math.min(1,inten+0.3),Math.min(1,inten+0.3));
    }
  }else{
    if(G.t-bakeT>0.5)rebakeLights();
    lctx.drawImage(bakeCv,0,0,MAP_W,MAP_H);
    for(i=0;i<LIGHTS.length;i++){var LB=LIGHTS[i];
      if(LB.dead)continue;
      LB._g=Math.max(0,LB.dim*(0.82+0.18*Math.sin(G.t*7+LB.ph)));
    }
  }
  var players=worldPool('players');
  for(i=0;i<players.length;i++)if(!players[i].dead)hole(players[i].x,players[i].y,230,0.95);
  if(G.state==='menu')hole(menuCam.x,menuCam.y,240,0.85);
  for(i=0;i<COFFEES.length;i++)if(COFFEES[i].charges>0)hole(COFFEES[i].x,COFFEES[i].y,100,0.55+0.1*Math.sin(G.t*3));
  var mobs=worldPool('mobs');
  for(i=0;i<mobs.length;i++)if(mobs[i].type==='deadline')hole(mobs[i].x,mobs[i].y,80,0.5);
  lctx.globalCompositeOperation='source-over';
  applyScreenT();
  ctx.drawImage(lightCv,0,0,cv.width/DPR,cv.height/DPR);
}

var glowCv=document.createElement('canvas'),gctx=glowCv.getContext('2d');
function drawGlow(){
  var sc=0.5;
  var gw=Math.max(2,Math.round(cv.width*sc)),gh=Math.max(2,Math.round(cv.height*sc));
  if(glowCv.width!==gw||glowCv.height!==gh){glowCv.width=gw;glowCv.height=gh;}
  gctx.setTransform(1,0,0,1,0,0);
  gctx.clearRect(0,0,gw,gh);
  gctx.globalCompositeOperation='lighter';
  gctx.setTransform(DPR*G.zoom*sc,0,0,DPR*G.zoom*sc,-G.camX*DPR*G.zoom*sc,-G.camY*DPR*G.zoom*sc);
  var Wc=cv.width/(DPR*G.zoom),Hc=cv.height/(DPR*G.zoom);
  function orb(x,y,r,col,a){
    gctx.globalAlpha=a;
    gctx.drawImage(glowSprite(col),x-r,y-r,r*2,r*2);
  }
  var i;
  for(i=0;i<LIGHTS.length;i++){var L=LIGHTS[i];
    if(L.dead||L._g===undefined||L._g<0.05)continue;
    if(L.x<G.camX-160||L.x>G.camX+Wc+160||L.y<G.camY-160||L.y>G.camY+Hc+160)continue;
    var gi=Math.min(1,L._g+0.25);
    orb(L.x,L.y,110+40*gi,(i%2)?MAPTHEME.neonB:MAPTHEME.neonA,0.13*gi);
  }
  for(i=0;i<COFFEES.length;i++)if(COFFEES[i].charges>0)
    orb(COFFEES[i].x,COFFEES[i].y,70,NEON.torch,0.2+0.06*Math.sin(G.t*3+i));
  var mobs=worldPool('mobs');
  for(i=0;i<mobs.length;i++)if(mobs[i].type==='deadline')
    orb(mobs[i].x,mobs[i].y,55,NEON.ember,0.22+0.08*Math.sin(G.t*9+i));
  var bsG=(NET.mode==='guest')?VIEW.boss:G.boss;
  if(bsG)orb(bsG.x,bsG.y,130,NEON.blood,0.18+0.08*Math.sin(G.t*5));
  for(i=0;i<HOLOS.length;i++)
    orb(HOLOS[i].x+HOLOS[i].w/2,HOLOS[i].y+HOLOS[i].h/2,42,MAPTHEME.neonA,0.12+0.03*Math.sin(G.t*13+HOLOS[i].ph));
  for(i=0;i<RACKS.length;i++)
    orb(RACKS[i].x+7,RACKS[i].y+13,26,NEON.torch,0.1);
  gctx.globalAlpha=1;
  gctx.globalCompositeOperation='source-over';
  applyScreenT();
  ctx.drawImage(glowCv,0,0,cv.width/DPR,cv.height/DPR);
}
function drawPost(){
  applyScreenT();
  var W=cv.width/DPR,H=cv.height/DPR;
  if(!drawPost.vg||drawPost.vgW!==W||drawPost.vgH!==H){
    var g=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.4,W/2,H/2,Math.max(W,H)*0.72);
    g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,0.38)');
    drawPost.vg=g;drawPost.vgW=W;drawPost.vgH=H;
    drawPost.rg=null;
  }
  ctx.fillStyle=drawPost.vg;ctx.fillRect(0,0,W,H);
  var meB=localPlayer();
  if(meB&&!meB.dead&&meB.burnout>25){
    var b2=clamp((meB.burnout-25)/75,0,1);
    ctx.save();ctx.globalCompositeOperation='saturation';ctx.globalAlpha=b2*0.9;
    ctx.fillStyle='#808080';ctx.fillRect(0,0,W,H);ctx.restore();
    if(meB.burnout>45){
      if(!drawPost.cracks){
        drawPost.cracks=[];
        for(var ci=0;ci<4;ci++){
          var pts=[],cxr=ci%2?W-10:10,cyr=ci<2?10:H*(0.4+0.4*((ci/2)|0));
          var ang=Math.atan2(H/2-cyr,W/2-cxr);
          for(var si=0;si<7;si++){
            pts.push([cxr,cyr]);
            cxr+=Math.cos(ang+(R()-0.5)*1.1)*(40+R()*70);
            cyr+=Math.sin(ang+(R()-0.5)*1.1)*(30+R()*60);
          }
          drawPost.cracks.push(pts);
        }
      }
      var ca=clamp((meB.burnout-45)/55,0,1)*0.85;
      ctx.save();ctx.globalAlpha=ca;ctx.lineCap='round';
      for(var ci2=0;ci2<drawPost.cracks.length;ci2++){var cr=drawPost.cracks[ci2];
        ctx.strokeStyle='#0a0608';ctx.lineWidth=2.6;
        ctx.beginPath();ctx.moveTo(cr[0][0],cr[0][1]);
        for(var sj=1;sj<cr.length;sj++)ctx.lineTo(cr[sj][0],cr[sj][1]);
        ctx.stroke();
        ctx.strokeStyle='#463a44';ctx.lineWidth=1;
        ctx.beginPath();ctx.moveTo(cr[0][0]+1,cr[0][1]+1);
        for(sj=1;sj<cr.length;sj++)ctx.lineTo(cr[sj][0]+1,cr[sj][1]+1);
        ctx.stroke();
      }
      ctx.restore();
    }
    var rIn=Math.min(W,H)*(0.85-0.5*b2);
    var g3=ctx.createRadialGradient(W/2,H/2,rIn,W/2,H/2,Math.max(W,H)*0.72);
    g3.addColorStop(0,'rgba(10,6,8,0)');g3.addColorStop(1,'rgba(10,6,8,'+(0.35+0.42*b2).toFixed(3)+')');
    ctx.fillStyle=g3;ctx.fillRect(0,0,W,H);
  }
  if(G.fadeT>0){
    ctx.fillStyle='rgba(3,2,7,'+Math.pow(Math.min(1,G.fadeT/1.5),1.4).toFixed(3)+')';
    ctx.fillRect(0,0,W,H);
  }
  var me=localPlayer();
  if(me&&me.burnout>65&&!me.dead){
    var a=Math.min(0.3,(me.burnout-65)/35*0.3)*(0.7+0.3*Math.sin(G.t*6));
    if(!drawPost.rg){
      drawPost.rg=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.3,W/2,H/2,Math.max(W,H)*0.7);
      drawPost.rg.addColorStop(0,'rgba(180,30,30,0)');
      drawPost.rg.addColorStop(1,'rgba(180,30,30,1)');
    }
    ctx.globalAlpha=a;
    ctx.fillStyle=drawPost.rg;ctx.fillRect(0,0,W,H);
    ctx.globalAlpha=1;
  }

  var meS=localPlayer();
  var boS=meS?clamp(meS.burnout/100,0,1):0;
  if(!drawPost.ash)drawPost.ash=[];
  if(drawPost.ash.length<12+((boS*10)|0)&&R()<0.4){
    drawPost.ash.push({x:R()*W,y:-4,v:14+R()*22,sw:R()*TAU,r:0.8+R()*1.4});
  }
  ctx.fillStyle='rgba(200,190,178,0.4)';
  for(var as2=0;as2<drawPost.ash.length;as2++){
    var aP=drawPost.ash[as2];
    aP.y+=aP.v/60;aP.x+=Math.sin(G.t*0.8+aP.sw)*0.4;
    if(aP.y>H+4){drawPost.ash.splice(as2,1);as2--;continue;}
    ctx.globalAlpha=0.18+0.2*aP.r*0.3;
    ctx.fillRect(aP.x,aP.y,aP.r,aP.r);
  }
  ctx.globalAlpha=1;
}
function pixFont(px,bold){
  return (bold?'700 ':'500 ')+px+'px "IBM Plex Mono",Arial,monospace';
}
function drawHeart(x,y,r,col){
  hctx.save();hctx.translate(x,y);hctx.scale(r/10,r/10);
  hctx.fillStyle=col;
  hctx.beginPath();
  hctx.moveTo(0,4);
  hctx.bezierCurveTo(-9,-4,-6,-11,0,-6);
  hctx.bezierCurveTo(6,-11,9,-4,0,4);
  hctx.fill();
  hctx.strokeStyle='rgba(0,0,0,0.6)';hctx.lineWidth=1.4;hctx.stroke();
  hctx.restore();
}
function drawCup(x,y,s,fill){

  var me=localPlayer(),moving=me?!!me.moving:false;
  var f=clamp(fill,0,1),i;
  var full=f>=0.999,empty=f<=0.001;
  hctx.save();hctx.translate(x,y);hctx.scale(s,s);

  var slosh=moving?Math.sin(G.t*11)*1.6:0;

  hctx.fillStyle='#d8dce2';rr(hctx,-11,-24,22,5,2);hctx.fill();
  hctx.fillStyle='#aeb4bd';hctx.fillRect(-11,-20,22,2);

  hctx.fillStyle='#e8eaee';
  hctx.beginPath();hctx.moveTo(-10,-20);hctx.lineTo(10,-20);hctx.lineTo(8,16);hctx.lineTo(-8,16);hctx.closePath();hctx.fill();
  hctx.strokeStyle='#b9bec7';hctx.lineWidth=1;hctx.stroke();

  hctx.save();
  hctx.beginPath();hctx.moveTo(-8.5,-17);hctx.lineTo(8.5,-17);hctx.lineTo(6.8,13);hctx.lineTo(-6.8,13);hctx.closePath();hctx.clip();
  var rows=Math.round(11*f);
  for(i=0;i<rows;i++){
    var ry=12-i*2.6;
    var wob=Math.sin(ry*0.7+slosh)*0.7;
    hctx.fillStyle=(i%2===0)?'#4a2f18':'#3d2612';
    hctx.fillRect(-9+wob,ry,18,2.4);
  }
  hctx.restore();

  hctx.fillStyle='#c9a06a';
  hctx.beginPath();hctx.moveTo(-9.4,-4);hctx.lineTo(9.4,-4);hctx.lineTo(7.6,10);hctx.lineTo(-7.6,10);hctx.closePath();hctx.fill();
  var sleeveGlow=0.5+0.15*Math.sin(G.t*4);
  if(empty)sleeveGlow=(((G.t*5)|0)%2===0)?0.8:0.15;
  hctx.strokeStyle='rgba(196,98,42,'+sleeveGlow.toFixed(2)+')';hctx.lineWidth=1.8;
  hctx.beginPath();hctx.moveTo(-9,-1);hctx.lineTo(9,-1);hctx.stroke();
  hctx.strokeStyle='rgba(232,180,110,'+(sleeveGlow*0.5).toFixed(2)+')';hctx.lineWidth=1;
  hctx.beginPath();hctx.moveTo(-8.8,7.4);hctx.lineTo(8.8,7.4);hctx.stroke();

  if(f>0.05)for(i=0;i<3;i++){
    var ph3=(G.t*0.7+i*0.33)%1;
    hctx.fillStyle='rgba(240,244,248,'+(0.4*(1-ph3)).toFixed(2)+')';
    hctx.fillRect(-4+i*4+Math.sin(G.t*3+i)*1.5,-25-ph3*9,1.6,1.6);
  }

  if(full){
    hctx.strokeStyle='rgba(255,220,140,'+(0.5+0.4*Math.sin(G.t*10)).toFixed(2)+')';
    hctx.lineWidth=1.6;rr(hctx,-11,-24,22,5,2);hctx.stroke();
  }
  hctx.restore();
}

  function drawHudTouch(p,W){
    var H2=bhud.height/DPR;
    var topY=H2<480?34:64;

    var barW=Math.min(W-24,340),bx=W/2-barW/2,by=64,bh=20,half=barW/2;
    var fl=clamp(p.burnout/100,0,1),cf=clamp(p.coffee/(p.coffeeMax||100),0,1);
    var jit=p.burnout>70?R()*3-1.5:0;
    hctx.fillStyle='rgba(10,13,18,0.78)';rr(hctx,bx,by,barW,bh,9);hctx.fill();
    hctx.strokeStyle='rgba(138,116,96,0.7)';hctx.lineWidth=1.5;rr(hctx,bx,by,barW,bh,9);hctx.stroke();
    var bCol=p.burnout>70?'#dc2626':(p.burnout>45?'#c47f1a':'#b45309');
    hctx.fillStyle=bCol;rr(hctx,bx+3+jit,by+3,(half-8)*fl,bh-6,6);hctx.fill();
    hctx.fillStyle='#3fb950';rr(hctx,bx+half+5,by+3,(half-8)*cf,bh-6,6);hctx.fill();
    hctx.strokeStyle='rgba(138,116,96,0.9)';hctx.lineWidth=1.5;
    hctx.beginPath();hctx.moveTo(bx+half,by+2);hctx.lineTo(bx+half,by+bh-2);hctx.stroke();
    hctx.textAlign='center';
    hctx.font=pixFont(11,true);
    hctx.strokeStyle='rgba(0,0,0,0.75)';hctx.lineWidth=3;
    var bTxt=Math.round(p.burnout)+'%',cTxt=Math.round(p.coffee)+'%';
    hctx.strokeText(bTxt,bx+half/2,by+bh-5);hctx.fillStyle='#ffd7c9';hctx.fillText(bTxt,bx+half/2,by+bh-5);
    hctx.strokeText(cTxt,bx+half+half/2,by+bh-5);hctx.fillStyle='#b8eec6';hctx.fillText(cTxt,bx+half+half/2,by+bh-5);
    drawHeart(bx+half-6,by+bh/2-1,6,'#e5534b');
    drawCup(bx+half+6,by+bh/2-1,0.62,1);
    hctx.textAlign='left';

    var hi=window.__hudInfo;
    if(hi){
      hctx.font=pixFont(12,true);hctx.fillStyle='#8b949e';
      hctx.fillText('СПРИНТ '+hi.wave+' · ур.'+G.level+' · закрыто '+Math.max(0,hi.wave-1),12,by+bh+20);
      hctx.fillStyle='#12161c';hctx.fillRect(12,by+bh+25,110,4);
      hctx.fillStyle='#d29922';hctx.fillRect(12,by+bh+25,110*clamp(G.xp/G.xpN,0,1),4);
      hctx.font=pixFont(16,true);
      if(hi.cleared){}
      else if(hi.boss){hctx.fillStyle='#e5534b';hctx.fillText('АУДИТ ИДЁТ',12,by+bh+48);}
      else{
        var hot=hi.remain<=3;
        hctx.fillStyle=hi.remain===0?'#8bd17c':(hot?'#e5534b':'#e6edf3');
        hctx.fillText('ВРАГОВ: '+hi.remain+(hot&&hi.remain>0?' — зачистка!':''),12,by+bh+48);
      }
    }

    var tb={btnAlt:[p.cd2||0,CLS[p.cls].s2.cd],btnSkill:[p.cdD||0,2.6],btnSkill2:[p.cdS||0,CLS[p.cls].sk.cd],btnFU:[Math.max(p.cdQ||0,p.qT||0),CLS[p.cls].ult.cd],btnR:[p.cdU||0,25]};
    for(var tk in tb){var el=document.getElementById(tk);if(!el)continue;
      var cd=tb[tk][0],cdm=tb[tk][1]||1;
      var pct=clamp(cd/cdm,0,1);
      var step=(pct*50)|0;
      if(el._cd!==step){el._cd=step;el.style.background='conic-gradient(rgba(6,8,12,.82) '+(step*2)+'%, rgba(33,38,45,.72) 0)';}
      var onc=cd>0.05;
      if(el._onc!==onc){el._onc=onc;el.classList.toggle('oncd',onc);}
    }
    var rBtn=document.getElementById('btnR');
    if(rBtn){
      var nch=(p.superC||0)<1||G.wave<G.ultAt;
      if(rBtn._nochg!==nch){rBtn._nochg=nch;rBtn.classList.toggle('nochg',nch);}
      var chg=(0.15+0.5*clamp(p.superC||0,0,1));
      var chq=Math.round(chg*25);
      if(rBtn._chg!==chq){rBtn._chg=chq;rBtn.style.background='radial-gradient(circle at 50% 120%,rgba(255,206,0,'+chg.toFixed(2)+'),rgba(60,50,10,.8))';}
    }

    if(G.waveState==='cleared'&&G.state==='playing'){
      var st=G.interStats||{w:G.wave,ki:0,kd:0,okr:G.okr,co:(p.coins||0)};
      var left=Math.max(0,Math.ceil(G.interT));
      var cw=Math.min(370,W-24),cx=W/2-cw/2,cy=by+bh+66;
      hctx.fillStyle='rgba(13,10,24,0.93)';rr(hctx,cx,cy,cw,64,10);hctx.fill();
      hctx.strokeStyle='rgba(232,58,156,0.8)';hctx.lineWidth=2;rr(hctx,cx,cy,cw,64,10);hctx.stroke();
      hctx.textAlign='center';
      hctx.font=pixFont(15,true);hctx.fillStyle='#e6edf3';
      hctx.fillText('СПРИНТ '+st.w+' ЗАКРЫТ',W/2,cy+18);
      hctx.font=pixFont(11);hctx.fillStyle='#dfe6ee';
      hctx.fillText('уволено '+st.ki+' · дедлайны '+st.kd+' · OKR '+st.okr+' · ✦ '+st.co+' · ур.'+G.level,W/2,cy+37);
      hctx.font=pixFont(11,true);hctx.fillStyle='#1fc4ae';
      hctx.fillText('→ «'+(G.nextTheme||'офис')+'» · соберите лут',W/2,cy+54);
      hctx.textAlign='left';
      window.__interRect={x:cx,y:cy,w:cw,h:64};
      var bw=Math.min(340,W-40),bx=W/2-bw/2,by=cy+72;
      var mmR=window.__mmRect;
      if(mmR&&by<mmR.y+mmR.h&&by+44>mmR.y&&bx+bw>mmR.x&&bx<mmR.x+mmR.w)by=Math.ceil(mmR.y+mmR.h)+8;
      root.classList.add('noatk');
      hctx.fillStyle='rgba(63,185,80,0.95)';rr(hctx,bx,by,bw,44,10);hctx.fill();
      hctx.strokeStyle='#8effc0';hctx.lineWidth=2.5;rr(hctx,bx,by,bw,44,10);hctx.stroke();
      hctx.font=pixFont(15,true);hctx.fillStyle='#eafff2';hctx.textAlign='center';
      hctx.fillText('ДАЛЬШЕ ▶ СПРИНТ · авто '+left+'с',W/2,by+28);hctx.textAlign='left';
      window.__nextBtnRect={x:bx,y:by,w:bw,h:44};
    }else{root.classList.remove('noatk');window.__nextBtnRect=null;window.__interRect=null;}
  }
function drawHUD(){
  hctx.setTransform(DPR,0,0,DPR,0,0);
  var W=bhud.width/DPR,H=bhud.height/DPR,p=localPlayer();
  if(!p)return;
  if(G.state==='paused'){window.__interRect=null;window.__nextBtnRect=null;window.__mmRect=null;return;}
  hctx.textAlign='left';
  var narrow=W<640;
  var okrX=(W<1100)?Math.max(W-280,216):W-160;
  if(!isTouch){

  var dmgFlash=(p.flash||0)>0.4;
  var gj2=dmgFlash?(R()*4-2):0;
  var y0=104;
  hctx.save();
  hctx.translate(gj2,0);

  drawCup(26,y0,0.72,p.coffee/(p.coffeeMax||100));
  hctx.font=pixFont(13,true);hctx.textAlign='left';
  hctx.strokeStyle='rgba(14,10,8,0.85)';hctx.lineWidth=3;
  hctx.strokeText(Math.round(p.coffee)+'%',42,y0+5);
  hctx.fillStyle='#e8dcc2';hctx.fillText(Math.round(p.coffee)+'%',42,y0+5);

  var bCol=p.burnout>70?'#A32626':(p.burnout>45?'#C47F1A':'#3F7A3A');
  var flc=0.75+0.25*Math.sin(G.t*12);
  hctx.fillStyle=bCol;
  hctx.fillRect(78,y0-2,10,7);
  hctx.fillRect(80,y0-6,6,5);
  hctx.fillRect(82,y0-9-3*flc,3,4);
  hctx.fillStyle='rgba(255,220,160,0.8)';
  hctx.fillRect(81,y0,4,4);
  hctx.strokeStyle='rgba(14,10,8,0.85)';hctx.lineWidth=3;
  hctx.strokeText(Math.round(p.burnout)+'%',92,y0+5);
  hctx.fillStyle=dmgFlash?'#ff8a7a':'#e8dcc2';
  hctx.fillText(Math.round(p.burnout)+'%',92,y0+5);
  hctx.restore();
  }
  drawMinimap();
  if(NET.mode==='guest'&&G.state==='playing'){
    var age=performance.now()-NET.lastRecv;
    var cCol=age<1500?'#3fb950':(age<4500?'#d29922':'#e5534b');
    var tY=H<520?34:64;
    var dotX=isTouch?302:216,dotY=isTouch?tY+6:26;
    hctx.fillStyle=cCol;hctx.beginPath();hctx.arc(dotX,dotY,4.5,0,TAU);hctx.fill();
    hctx.font=pixFont(9,true);hctx.fillStyle='#8b949e';hctx.fillText('связь',dotX+9,dotY+3);
    if(NET.reconnecting){
      hctx.font=pixFont(15,true);hctx.fillStyle='#d29922';hctx.textAlign='center';
      hctx.fillText('ПЕРЕПОДКЛЮЧЕНИЕ… '+NET.reconnectTries+'/3',W/2,H*0.2);hctx.textAlign='left';
    }
  }

  var remG=(NET.mode==='guest')?VIEW.mobs.length:(G.spawnQ.length+G.mobs.length);
  var cleared=G.waveState==='cleared';
  window.__hudInfo={wave:Math.max(1,G.wave),remain:remG,cleared:cleared,boss:!!(G.boss||((NET.mode==='guest')&&VIEW.boss))};
  if(!cleared)window.__interRect=null;
  if(!isTouch){
  var sy=H-70;
  var C=CLS[p.cls]||CLS.mgr;
  var slots=[
    {n:C.s1.n,cd:p.cd1||0,cdm:C.s1.cd,cost:C.s1.cost},
    {n:C.s2.n,cd:p.cd2||0,cdm:C.s2.cd,cost:C.s2.cost},
    {n:'уворот',cd:p.cdD||0,cdm:2.6,cost:0},
    {n:C.ult.n,cd:Math.max(p.cdQ||0,p.qT||0),cdm:C.ult.cd,cost:C.ult.cost},
    {n:C.sk.n,cd:p.cdS||0,cdm:C.sk.cd,cost:C.sk.cost},
    {n:'СУПЕР',cd:G.wave<G.ultAt?-1:Math.max(p.cdU||0,0),cdm:25,cost:0,chg:p.superC||0}
  ];
  var gap=isTouch?5:7;
  var KL=isTouch?['АТК','ПРИЁМ','РЫВОК','СКИЛ','УЛЬТА','R']:['ЛКМ','ПКМ','ПРОБЕЛ','F','Q','R'];
  var widths=slots.map(function(s,i){
    if(isTouch)return 48;
    hctx.font=pixFont(11);
    var nw=hctx.measureText(s.cd===-1?'с '+G.ultAt+'-го':s.n).width+18;
    hctx.font=pixFont(11,true);
    var kw=hctx.measureText('['+KL[i]+']').width+18;
    return Math.max(66,nw,kw);
  });
  var total=widths.reduce(function(a,w){return a+w;},0)+gap*(slots.length-1);
  var sx0=isTouch?12:W/2-total/2;
  var x=sx0;
  for(var i=0;i<slots.length;i++){var s=slots[i],slotW=widths[i];
    hctx.fillStyle='rgba(10,13,18,0.75)';rr(hctx,x,sy,slotW,52,6);hctx.fill();
    hctx.strokeStyle='#333b47';rr(hctx,x,sy,slotW,52,6);hctx.stroke();
    if(s.cd>0){hctx.fillStyle='rgba(0,0,0,0.6)';hctx.fillRect(x,sy,slotW,52*Math.min(1,s.cd/s.cdm));}
    hctx.font=pixFont(11,true);hctx.fillStyle='#d29922';hctx.textAlign='center';
    hctx.fillText(isTouch?KL[i]:'['+KL[i]+']',x+slotW/2,sy+16);
    hctx.font=pixFont(11);
    if(s.cd===-1){
      hctx.fillStyle='rgba(0,0,0,0.55)';hctx.fillRect(x,sy,slotW,52);
      hctx.fillStyle='#6e7681';hctx.fillText('с '+G.ultAt+'-го',x+slotW/2,sy+30);
    }else if(s.chg!==undefined){
      hctx.fillStyle='rgba(0,0,0,0.5)';hctx.fillRect(x,sy+36,slotW,16);
      hctx.fillStyle=(p.superC>=1)?'#ffce00':'#8a7a2a';
      hctx.fillRect(x+2,sy+38,(slotW-4)*clamp(p.superC,0,1),12);
      if(p.superC>=1){hctx.fillStyle='#1c1600';hctx.font=pixFont(9,true);hctx.fillText('ГОТОВ',x+slotW/2,sy+47);}
    }else if(!isTouch){
      hctx.fillStyle='#c9d1d9';
      hctx.fillText(s.n,x+slotW/2,sy+30);
    }
    hctx.font=pixFont(10);hctx.fillStyle=s.cost>0&&p.coffee<s.cost?'#e5534b':'#6e7681';
    hctx.fillText(s.cost>0?s.cost+' ☕':'—',x+slotW/2,sy+44);
    hctx.textAlign='left';
    x+=slotW+gap;
  }
  if(p.haste>0){
    hctx.fillStyle='rgba(139,209,124,'+(0.7+0.3*Math.sin(G.t*10))+')';hctx.font='bold 11px Arial';
    hctx.fillText('АСАП! +55%',16,166);
  }

  hctx.fillStyle='rgba(10,13,18,0.8)';rr(hctx,12,12,196,66,6);hctx.fill();
  hctx.strokeStyle=cleared?'rgba(139,209,124,0.8)':'rgba(232,58,156,0.35)';hctx.lineWidth=1;
  rr(hctx,12,12,196,66,6);hctx.stroke();
  hctx.font=pixFont(13,true);hctx.fillStyle='#8b949e';
  hctx.fillText('СПРИНТ '+Math.max(1,G.wave)+(cleared?' · ЗАЧИЩЕНО ✓':''),24,32);
  hctx.font=pixFont(12);hctx.fillStyle='#6e7681';
  hctx.fillText('ур.'+G.level+' · закрыто: '+Math.max(0,G.wave-1),24,46);
  hctx.fillStyle='#12161c';hctx.fillRect(24,50,120,4);
  hctx.fillStyle='#d29922';hctx.fillRect(24,50,120*clamp(G.xp/G.xpN,0,1),4);
  if(cleared){
    hctx.font=pixFont(15,true);hctx.fillStyle='#8bd17c';
    hctx.fillText('все задачи закрыты',24,68);
  }else if(G.boss||((NET.mode==='guest')&&VIEW.boss)){
    hctx.font=pixFont(15,true);hctx.fillStyle='#e5534b';
    hctx.fillText('АУДИТ ИДЁТ',24,68);
  }else{
    var hot=remG<=3;
    hctx.font=pixFont(18,true);
    hctx.fillStyle=remG===0?'#8bd17c':(hot?('rgba(229,83,75,'+(0.7+0.3*Math.sin(G.t*9)).toFixed(3)+')'):'#e6edf3');
    hctx.fillText('ВРАГОВ: '+remG+(hot&&remG>0?' — зачистка!':''),24,68);
  }
  hctx.fillStyle='rgba(10,13,18,0.75)';rr(hctx,okrX,12,148,52,6);hctx.fill();
  hctx.font=pixFont(16,true);hctx.fillStyle='#d29922';
  hctx.fillText('OKR: '+G.okr,okrX+12,34);
  hctx.font=pixFont(12);hctx.fillStyle='#8b949e';
  hctx.fillText('грейд '+G.grade+' · ✦ '+(p.coins||0),okrX+12,52);

  if(drawHUD.pc===undefined)drawHUD.pc=0;
  if(G.combo>drawHUD.pc&&G.combo>1)drawHUD.popT=0.1;
  if(drawHUD.pc>1&&G.combo<=1){
    for(var sh=0;sh<10;sh++)G.fx.push({type:'shard',x:W-38,y:120,vx:(R()*2-1)*130,vy:-60-R()*140,t:0,life:0.7});
  }
  drawHUD.pc=G.combo;
  drawHUD.popT=Math.max(0,(drawHUD.popT||0)-1/60);  if(G.combo>1){
    var cbs=1+0.3*(drawHUD.popT/0.1);
    hctx.save();
    hctx.translate(W-38,120);
    hctx.transform(1,0,-0.18,1,0,0);
    hctx.scale(cbs,cbs);
    hctx.font='bold 30px "Pixelify Sans","IBM Plex Mono",monospace';
    hctx.textAlign='center';
    hctx.strokeStyle='rgba(20,10,4,0.85)';hctx.lineWidth=5;
    var cbt='×'+G.combo;
    hctx.strokeText(cbt,0,0);
    hctx.fillStyle='rgba(232,197,106,'+(0.8+0.2*Math.sin(G.t*9)).toFixed(3)+')';
    hctx.fillText(cbt,0,0);
    hctx.font=pixFont(11,true);
    hctx.fillStyle='rgba(216,207,192,0.85)';
    hctx.fillText(COMBONAMES[G.combo]||'',0,16);
    hctx.restore();
    hctx.textAlign='left';
    hctx.fillStyle='rgba(14,10,8,0.6)';rr(hctx,W-78,132,80,5,2);hctx.fill();
    hctx.fillStyle='#e8c56a';hctx.fillRect(W-78,132,80*clamp(G.comboT/3,0,1),5);
  }
  if(p.adr){
    hctx.fillStyle='rgba(200,80,60,'+(0.6+0.4*Math.sin(G.t*10))+')';
    hctx.font='bold 12px Arial';
    hctx.fillText('ПЕРЕДОЗ КОФЕИНА: +20% скор, +25% урон',16,180);
  }
  var players=worldPool('players');
  if(players.length>1){
    var tw=0;
    for(var j=0;j<players.length;j++)if(players[j].id!==NET.myId)tw++;
    var tx0=W/2-(tw*110)/2,drawn=0;
    for(j=0;j<players.length;j++){var tp=players[j];
      if(tp.id===NET.myId)continue;
      var x0=tx0+drawn*110;drawn++;
      hctx.fillStyle='rgba(10,13,18,0.7)';rr(hctx,x0,10,104,26,4);hctx.fill();
      var pi=0;
      for(var q=0;q<players.length;q++)if(players[q]===tp)pi=q;
      hctx.fillStyle=PCOLORS[pi%4];hctx.fillRect(x0+6,16,6,6);
      hctx.fillStyle='#12161c';hctx.fillRect(x0+18,22,80,6);
      hctx.fillStyle=tp.dead?'#444':'#c23b32';hctx.fillRect(x0+18,22,80*clamp(tp.burnout/100,0,1),6);
      if(tp.dead){hctx.fillStyle='#8b949e';hctx.font='9px Arial';hctx.fillText('сгорел',x0+20,20);}
      hctx.fillStyle='#8bd17c';hctx.fillRect(x0+18,16,80*clamp(tp.coffee/(tp.coffeeMax||100),0,1),3);
    }
  }

  }
  var boss=(NET.mode==='guest')?VIEW.boss:G.boss;
  if(boss){
    var hpF=(NET.mode==='guest')?(boss.hpF||0):clamp(boss.hp/boss.hpMax,0,1);
    var hpTxt=(NET.mode==='guest')?Math.round(hpF*100)+'%':(Math.max(0,Math.round(boss.hp))+' / '+boss.hpMax);
    var bbw=Math.min(380,W-32),bbx=W/2-bbw/2,bby=54;
    hctx.fillStyle='rgba(10,13,18,0.85)';rr(hctx,bbx-10,bby-8,bbw+20,46,6);hctx.fill();
    hctx.strokeStyle='rgba(229,83,75,0.5)';hctx.lineWidth=1;rr(hctx,bbx-10,bby-8,bbw+20,46,6);hctx.stroke();
    hctx.font=pixFont(13,true);hctx.fillStyle='#e5534b';hctx.textAlign='center';
    hctx.fillText('АУДИТ'+(G.bossN>1?' №'+G.bossN+' (с правками)':''),W/2,bby+8);hctx.textAlign='left';
    hctx.fillStyle='#12161c';rr(hctx,bbx,bby+14,bbw,14,3);hctx.fill();
    hctx.strokeStyle='#333b47';hctx.lineWidth=1;rr(hctx,bbx,bby+14,bbw,14,3);hctx.stroke();
    hctx.save();rr(hctx,bbx,bby+14,bbw,14,3);hctx.clip();
    var bg2=hctx.createLinearGradient(bbx,0,bbx+bbw,0);
    bg2.addColorStop(0,'#8a2f28');bg2.addColorStop(1,'#e5534b');
    hctx.fillStyle=bg2;hctx.fillRect(bbx,bby+14,bbw*hpF,14);
    hctx.fillStyle='rgba(255,255,255,0.22)';hctx.fillRect(bbx,bby+14,bbw*hpF,4);
    hctx.restore();
    hctx.font=pixFont(11,true);hctx.fillStyle='#ffd7d2';hctx.textAlign='center';
    hctx.strokeStyle='rgba(0,0,0,0.7)';hctx.lineWidth=2;
    hctx.strokeText(hpTxt,W/2,bby+25);hctx.fillText(hpTxt,W/2,bby+25);hctx.textAlign='left';
  }
  if(G.msgT>0&&G.waveState!=='cleared'){
    var msgFs=17,msgMaxW=W-40,msgLines=[G.msg];
    var msgY=(isTouch&&H<520)?118:H*0.52;
    hctx.globalAlpha=Math.min(1,G.msgT);hctx.font=pixFont(msgFs,true);hctx.fillStyle='#e6edf3';hctx.textAlign='center';
    if(hctx.measureText(G.msg).width>msgMaxW){
      var msgMid=G.msg.length/2,msgSp=-1;
      for(var mi=0;mi<G.msg.length;mi++)if(G.msg.charAt(mi)===' '&&(msgSp<0||Math.abs(mi-msgMid)<Math.abs(msgSp-msgMid)))msgSp=mi;
      if(msgSp>0)msgLines=[G.msg.slice(0,msgSp),G.msg.slice(msgSp+1)];
      while(msgFs>13&&(hctx.measureText(msgLines[0]).width>msgMaxW||hctx.measureText(msgLines[1]||'').width>msgMaxW)){msgFs--;hctx.font=pixFont(msgFs,true);}
    }
    for(var li=0;li<msgLines.length;li++)hctx.fillText(msgLines[li],W/2,msgY+li*(msgFs+4));
    hctx.textAlign='left';hctx.globalAlpha=1;
  }
  if(G.waveState==='calm'&&G.wave>=1&&G.state==='playing'&&G.waveT>0.5){
    hctx.textAlign='center';hctx.font=pixFont(15,true);hctx.fillStyle='rgba(230,237,243,'+(0.55+0.3*Math.sin(G.t*4)).toFixed(3)+')';
    hctx.fillText('новый спринт через '+Math.ceil(G.waveT)+'…',W/2,H*0.24+30);hctx.textAlign='left';
  }
  if(G.sepT>0){
    var sa=clamp(Math.min(1,G.sepT/0.5),0,1);
    hctx.save();hctx.globalAlpha=sa;hctx.textAlign='center';
    hctx.font='italic bold '+Math.round(W*0.07)+'px Georgia,serif';
    hctx.strokeStyle='rgba(20,8,4,0.85)';hctx.lineWidth=6;
    hctx.strokeText('3 сентября',W/2,H*0.4);
    hctx.fillStyle='#e8894a';hctx.fillText('3 сентября',W/2,H*0.4);
    hctx.restore();hctx.textAlign='left';
  }
  if(p.dead){
    hctx.fillStyle='rgba(10,13,18,0.8)';rr(hctx,W/2-130,H/2-20,260,44,6);hctx.fill();
    hctx.fillStyle='#e5534b';hctx.font='bold 14px Arial';hctx.textAlign='center';
    hctx.fillText('ВЫ СГОРЕЛИ. Возрождение после спринта.',W/2,H/2+6);hctx.textAlign='left';
  }
  if(G.caption){
    hctx.globalAlpha=Math.min(0.8,G.capT*0.3);hctx.font=pixFont(12);hctx.fillStyle='#7d8590';
    if(isTouch){hctx.textAlign='left';hctx.fillText(G.caption,16,H-96);}
    else{hctx.textAlign='center';hctx.fillText(G.caption,W/2,H-12);}
    hctx.textAlign='left';hctx.globalAlpha=1;
  }
  if(NET.mode!=='solo'){
    hctx.fillStyle='rgba(139,148,158,0.8)';hctx.font='10px Arial';
    hctx.fillText(NET.mode==='host'?'P2P-ХОСТ · код '+NET.code:'P2P-КЛИЕНТ',okrX,74);
  }
  if(VIEW.paused&&NET.mode==='guest'){
    hctx.fillStyle='rgba(5,7,10,0.6)';hctx.fillRect(0,0,W,H);
    hctx.fillStyle='#d29922';hctx.font='bold 20px Arial';hctx.textAlign='center';
    hctx.fillText('ХОСТ НА ПАУЗЕ',W/2,H/2);hctx.textAlign='left';
  }
  if(isTouch){drawHudTouch(p,W);return;}

  if(G.waveState==='cleared'&&G.state==='playing'){
    var st=G.interStats||{w:G.wave,ki:0,kd:0,okr:G.okr,co:(p.coins||0)};
    var pw=Math.min(620,W-40),px0=W/2-pw/2,py0=10;
    hctx.fillStyle='rgba(13,10,24,0.93)';rr(hctx,px0,py0,pw,218,14);hctx.fill();
    hctx.strokeStyle='rgba(232,58,156,0.8)';hctx.lineWidth=2.5;rr(hctx,px0,py0,pw,218,14);hctx.stroke();
    hctx.strokeStyle='rgba(31,196,174,0.35)';hctx.lineWidth=1;rr(hctx,px0+6,py0+6,pw-12,206,10);hctx.stroke();
    hctx.textAlign='center';
    hctx.font=pixFont(30,true);
    hctx.strokeStyle='rgba(0,0,0,0.6)';hctx.lineWidth=4;
    hctx.strokeText('СПРИНТ '+st.w+' ЗАКРЫТ',W/2,py0+44);
    hctx.fillStyle='#e6edf3';hctx.fillText('СПРИНТ '+st.w+' ЗАКРЫТ',W/2,py0+44);
    hctx.font=pixFont(16,true);hctx.fillStyle='#8bd17c';
    hctx.fillText('соберите лут — время не тикает против вас',W/2,py0+70);
    hctx.font=pixFont(18,true);hctx.fillStyle='#dfe6ee';
    hctx.fillText('стажёров уволено: '+st.ki+'    ·    дедлайнов сгорело: '+st.kd,W/2,py0+106);
    hctx.fillStyle='#ffcf5c';
    hctx.fillText('OKR: '+st.okr+'    ·    ✦ '+st.co+'    ·    ур.'+G.level,W/2,py0+132);
    hctx.font=pixFont(17,true);hctx.fillStyle='#1fc4ae';
    hctx.fillText('→ следующая локация: «'+(G.nextTheme||'офис')+'»',W/2,py0+160);
    var left=Math.max(0,Math.ceil(G.interT));
    var bw=Math.min(470,pw-40),bx0=W/2-bw/2,by0=py0+172;
    var hov=(mouse.x/DPR)>=bx0&&(mouse.x/DPR)<=bx0+bw&&(mouse.y/DPR)>=by0&&(mouse.y/DPR)<=by0+34;
    hctx.fillStyle=hov?'rgba(63,185,80,0.95)':'rgba(26,58,42,0.92)';
    rr(hctx,bx0,by0,bw,34,8);hctx.fill();
    hctx.strokeStyle='#42e0aa';hctx.lineWidth=2;rr(hctx,bx0,by0,bw,34,8);hctx.stroke();
    hctx.font=pixFont(16,true);hctx.fillStyle='#d8ffe8';
    hctx.fillText('СТАРТ: СЛЕДУЮЩИЙ СПРИНТ [ENTER] · авто '+left+'с',W/2,by0+23);
    window.__nextBtnRect={x:bx0,y:by0,w:bw,h:34};
    hctx.textAlign='left';
    if(hov&&mouse.down)G.interT=Math.min(G.interT,0.05);
    window.__interRect={x:px0,y:py0,w:pw,h:218};
  }
}
function localNearCoffee(){
  var me=localPlayer();
  if(!me)return false;
  var cf=(NET.mode==='guest')?VIEW.coffee:null;
  for(var i=0;i<COFFEES.length;i++){
    var ch=cf?(cf[i]!==undefined?cf[i]:0):COFFEES[i].charges;
    if(ch>0&&dist(me,COFFEES[i])<60)return true;
  }
  return false;
}
function drawMinimap(){
  hctx.setTransform(DPR,0,0,DPR,0,0);
  var W=bhud.width/DPR,H=bhud.height/DPR;
  var mw=200,mh=mmCv.height*(mw/mmCv.width);
  if(mh>190){mw=mw*190/mh;mh=190;}
  if(isTouch)mw=Math.min(mw,150),mh=mh*(mw/200);

  var low=isTouch&&H<520;
  var mx=low?14:W-mw-14,my=isTouch?(low?76:124):H-mh-14;
  hctx.globalAlpha=0.92;
  hctx.fillStyle='rgba(16,12,9,0.88)';rr(hctx,mx-6,my-6,mw+12,mh+12,4);hctx.fill();
  hctx.strokeStyle='#8a7460';hctx.lineWidth=2;rr(hctx,mx-6,my-6,mw+12,mh+12,4);hctx.stroke();
  hctx.drawImage(mmCv,mx,my,mw,mh);
  hctx.fillStyle='rgba(16,12,9,0.18)';hctx.fillRect(mx,my,mw,mh);
  window.__mmRect={x:mx,y:my,w:mw,h:mh};
  hctx.globalAlpha=1;
  var sc=mw/MAP_W;

  var prevSm=hctx.imageSmoothingEnabled;
  hctx.imageSmoothingEnabled=false;
  hctx.drawImage(mmFogCv,mx,my,mw,mh);
  hctx.imageSmoothingEnabled=prevSm;
  var cf=(NET.mode==='guest')?VIEW.coffee:null;
  for(var i=0;i<COFFEES.length;i++){
    var ch=cf?(cf[i]!==undefined?cf[i]:0):COFFEES[i].charges;
    hctx.fillStyle=ch>0?'#3fb950':'#444c56';
    hctx.fillRect(mx+COFFEES[i].x*sc-2,my+COFFEES[i].y*sc-2,4,4);
  }
  var mobs=worldPool('mobs');
  hctx.fillStyle='#c23b32';
  for(i=0;i<mobs.length;i++)if(tileVis(mobs[i].x,mobs[i].y))hctx.fillRect(mx+mobs[i].x*sc-1,my+mobs[i].y*sc-1,2.5,2.5);
  if(G.waveState==='active'&&mobs.length>0&&mobs.length<=3){
    hctx.fillStyle='#e5534b';
    for(i=0;i<mobs.length;i++){
      hctx.beginPath();hctx.arc(mx+mobs[i].x*sc,my+mobs[i].y*sc,2.5+Math.sin(G.t*8),0,TAU);hctx.fill();
    }
    var capY=my+mh+17;if(capY>H-2)capY=my+mh-5;
    hctx.font=pixFont(9,true);hctx.fillStyle='#e5534b';hctx.textAlign='center';
    hctx.fillText('осталось: '+mobs.length,mx+mw/2,capY);
    hctx.textAlign='left';
  }
  var boss=(NET.mode==='guest')?VIEW.boss:G.boss;
  if(boss){hctx.fillStyle='#e5534b';hctx.beginPath();hctx.arc(mx+boss.x*sc,my+boss.y*sc,4,0,TAU);hctx.fill();}
  var players=worldPool('players');
  for(i=0;i<players.length;i++){
    hctx.fillStyle=players[i].id===NET.myId?'#e6edf3':PCOLORS[i%4];
    if(players[i].dead)hctx.fillStyle='#555';
    hctx.beginPath();hctx.arc(mx+players[i].x*sc,my+players[i].y*sc,3,0,TAU);hctx.fill();
  }
}
var menuCam={x:0,y:0,tx:0,ty:0,init:0,lastVis:0};
function renderMenu(){
  if(!menuCam.init){
    menuCam.init=1;menuCam.x=MAP_W/2;menuCam.y=MAP_H/2;
  }
  if(Math.hypot(menuCam.tx-menuCam.x,menuCam.ty-menuCam.y)<60){
    var r=ROOMS[(R()*ROOMS.length)|0];
    menuCam.tx=r.x+r.w/2;menuCam.ty=r.y+r.h/2;
  }
  menuCam.x+=(menuCam.tx-menuCam.x)*0.005;
  menuCam.y+=(menuCam.ty-menuCam.y)*0.005;
  var Wc=cv.width/(DPR*G.zoom),Hc=cv.height/(DPR*G.zoom);
  G.camX=Wc>=MAP_W?(MAP_W-Wc)/2:clamp(menuCam.x-Wc/2,0,MAP_W-Wc);
  G.camY=Hc>=MAP_H?(MAP_H-Hc)/2:clamp(menuCam.y-Hc/2,0,MAP_H-Hc);
  if(G.t-menuCam.lastVis>0.15){
    menuCam.lastVis=G.t;
    computeVis(menuCam.x,menuCam.y);
  }
  drawWorld();drawLighting();drawGlow();drawPost();
}
function render(){
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,cv.width,cv.height);
  hctx.setTransform(DPR,0,0,DPR,0,0);
  hctx.clearRect(0,0,bhud.width/DPR,bhud.height/DPR);
  if(localPlayer()||VIEW.players.length){
    drawWorld();drawLighting();drawGlow();drawPost();
    drawSouls();
    drawHUD();
  }else{
    renderMenu();
  }
}
