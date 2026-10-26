'use strict';
// ============================== camera ==============================
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

// ============================== render ==============================
var DPR=1;
var lightCv=document.createElement('canvas'),lctx=lightCv.getContext('2d');
// пре-рендер «дырки» света: один радиальный спрайт вместо createRadialGradient на каждый свет каждый кадр
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
    if(!FOG.explored[i]){d[o]=4;d[o+1]=6;d[o+2]=11;d[o+3]=255;md[o]=6;md[o+1]=8;md[o+2]=13;md[o+3]=225;}
    else if(!FOG.vis[i]){d[o]=4;d[o+1]=7;d[o+2]=13;d[o+3]=150;md[o]=6;md[o+1]=9;md[o+2]=15;md[o+3]=100;}
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
function drawWorld(){
  var mobs=worldPool('mobs'),players=worldPool('players'),projs=worldPool('projs'),
      pickups=(NET.mode==='guest')?VIEW.pickups:G.pickups,zones=(NET.mode==='guest')?VIEW.zones:G.zones,
      boss=(NET.mode==='guest')?VIEW.boss:G.boss;
  applyScreenT();
  var W=cv.width/DPR,H=cv.height/DPR;
  ctx.fillStyle='#05070a';ctx.fillRect(0,0,W,H);
  applyWorldT();
  ctx.drawImage(floorCv,0,0);
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
  if(G.plan>0){ // планёрка: золотые кольца команды
    for(i=0;i<players.length;i++){var pp2=players[i];
      ctx.strokeStyle='rgba(255,207,92,'+(0.35+0.2*Math.sin(G.t*6)).toFixed(3)+')';ctx.lineWidth=2.5;
      ctx.beginPath();ctx.arc(pp2.x,pp2.y,26+Math.sin(G.t*4)*4,0,TAU);ctx.stroke();
    }
  }
  if(G.demon){ // демон Comic Sans
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
    if(!tileVis(mobs[i].x,mobs[i].y))continue; // в тумане мобов не видно
    ctx.globalAlpha=1-Math.max(0,mobs[i].fade||0);
    if(mobs[i].type==='deadline')drawDeadline(mobs[i],NET.mode==='guest');
    else drawIntern(mobs[i],NET.mode==='guest');
    ctx.globalAlpha=1;
  }
  // легаси-цепи + метки таргетинга на всех мобах
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
    if(pj.kind==='key'){ // клавиша клавиатуры (ульта прогера)
      ctx.fillStyle='#e8e8ee';rr(ctx,-6,-6,12,12,2.5);ctx.fill();
      ctx.fillStyle='#c8ccd4';rr(ctx,-6,-6,12,3.5,2);ctx.fill();
      ctx.fillStyle='#3a3f4a';ctx.font='bold 9px monospace';ctx.textAlign='center';
      ctx.fillText('QWERTYASDFG'[(pj.lt||0)%11],0,3.4);ctx.textAlign='left';
    }else if(pj.kind==='comic'){ // метрика от демона Comic Sans
      ctx.rotate(Math.sin((pj.rot||0)*6)*0.3);
      ctx.fillStyle='#e88ac8';ctx.font='bold 13px "Comic Sans MS","IBM Plex Mono",cursive';ctx.textAlign='center';
      ctx.strokeStyle='rgba(40,10,30,0.8)';ctx.lineWidth=3;ctx.strokeText('POW',0,4);
      ctx.fillText('POW',0,4);ctx.textAlign='left';
    }else if(pj.kind==='tw'||pj.kind==='tg'||pj.kind==='ig'){ // соц-снаряды маркетолога
      var fa=Math.atan2(pj.vy,pj.vx);
      ctx.rotate(fa-pj.rot+Math.sin((pj.rot||0)*3+G.t*8)*0.15);
      if(pj.kind==='tw'){ // твит: птичка
      ctx.fillStyle='#1d9bf0';
      ctx.beginPath();ctx.ellipse(0,0,7,5.4,-0.2,0,TAU);ctx.fill();
      ctx.beginPath();ctx.arc(4.6,-2.6,3,0,TAU);ctx.fill();
      ctx.fillStyle='#e8f6ff';
      ctx.beginPath();ctx.moveTo(7.4,-3.4);ctx.lineTo(10.6,-2.4);ctx.lineTo(7.2,-1.4);ctx.closePath();ctx.fill();
      ctx.beginPath();ctx.moveTo(-1,-1);ctx.quadraticCurveTo(-7,-6,-2,2.6);ctx.closePath();ctx.fill();
      ctx.strokeStyle='#e8f6ff';ctx.lineWidth=1.4;
      ctx.beginPath();ctx.moveTo(-6.5,1.5);ctx.quadraticCurveTo(-9,3.5,-7,5);ctx.stroke();
      ctx.fillStyle='#0c2a40';ctx.beginPath();ctx.arc(5.4,-3,0.9,0,TAU);ctx.fill();
      }else if(pj.kind==='tg'){ // телеграм: бумажный самолётик
      ctx.fillStyle='#2aabee';
      ctx.beginPath();ctx.moveTo(-9,-5);ctx.lineTo(10,0);ctx.lineTo(-9,5);ctx.lineTo(-5.5,0);ctx.closePath();ctx.fill();
      ctx.fillStyle='#1d84c9';
      ctx.beginPath();ctx.moveTo(-5.5,0);ctx.lineTo(10,0);ctx.lineTo(-9,5);ctx.closePath();ctx.fill();
      ctx.fillStyle='#e8f6ff';
      ctx.beginPath();ctx.moveTo(-6.5,-1.2);ctx.lineTo(6,-0.4);ctx.lineTo(-6.5,1.4);ctx.closePath();ctx.fill();
      }else{ // инстаграм: квадратик-камера
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
      // JIRA-тикет: карточка кувыркается по полёту, шеврон Jira всегда вертикален и вписан
      var fa2=Math.atan2(pj.vy,pj.vx);
      var tilt=fa2-pj.rot+Math.sin((pj.rot||0)*3+G.t*8)*0.15;
      ctx.rotate(tilt);
      ctx.fillStyle='#fbfcfe';rr(ctx,-14,-9,28,18,3);ctx.fill();
      ctx.strokeStyle='#2684FF';ctx.lineWidth=2;rr(ctx,-14,-9,28,18,3);ctx.stroke();
      ctx.fillStyle='#2684FF';ctx.fillRect(-14,-9,28,4);
      ctx.save();
      ctx.rotate(-tilt);          // глиф держим вертикально к экрану, как логотип
      ctx.translate(0,0.5);
      drawJiraIcon(ctx,1.28);     // вписан в карточку (не вылезает за края)
      ctx.restore();
    }
    ctx.restore();
  }
  for(i=0;i<G.fx.length;i++)drawFx(G.fx[i]);
  drawDebris();
  for(i=0;i<G.texts.length;i++){var t=G.texts[i];
    var hold=t.life*0.7; // плато читаемости, затем плавный фейд
    ctx.globalAlpha=t.t<hold?1:1-(t.t-hold)/(t.life-hold);
    ctx.font='bold '+t.size+'px "IBM Plex Mono",Arial,monospace';
    if(t.w===undefined)t.w=ctx.measureText(t.text).width;
    if(t.ch==='C'||t.ch==='I'||t.ch==='S'||!t.ch){ // плашка+обводка только важным каналам
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
  ctx.fillStyle='rgba(0,0,0,0.3)';ctx.beginPath();ctx.ellipse(cp.x,cp.y+8,22,10,0,0,TAU);ctx.fill();
  ctx.fillStyle='#3a404c';rr(ctx,cp.x-20,cp.y-6,40,14,3);ctx.fill();
  ctx.fillStyle='#22262e';ctx.fillRect(cp.x-13,cp.y-36,26,32);
  ctx.fillStyle='#3a4049';ctx.fillRect(cp.x-9,cp.y-30,18,14);
  ctx.fillStyle=charges>0?'#3fb950':'#555';ctx.fillRect(cp.x-7,cp.y-27,4,3);
  ctx.fillStyle='#c9d1d9';ctx.fillRect(cp.x+7,cp.y-30,3,20);
  for(var i=0;i<charges;i++){
    ctx.fillStyle='#d8dce2';ctx.fillRect(cp.x-16+i*7,cp.y-14+bob*0.3,5,8);
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
    ctx.strokeStyle='rgba(223,230,238,'+(0.9*(1-k))+')';
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
  }else if(f.type==='ghost'){
    ctx.globalAlpha=0.35*(1-k);
    ctx.fillStyle='#8bd17c';
    ctx.beginPath();ctx.arc(f.x,f.y,13,0,TAU);ctx.fill();
    ctx.beginPath();ctx.arc(f.x,f.y-14,7,0,TAU);ctx.fill();
    ctx.globalAlpha=1;
  }else if(f.type==='flash'){
    ctx.globalCompositeOperation='lighter';
    var g3=ctx.createRadialGradient(f.x,f.y,0,f.x,f.y,f.r*(0.5+k));
    g3.addColorStop(0,'rgba(255,250,220,'+(0.8*(1-k))+')');
    g3.addColorStop(1,'rgba(255,250,220,0)');
    ctx.fillStyle=g3;ctx.beginPath();ctx.arc(f.x,f.y,f.r*(0.5+k),0,TAU);ctx.fill();
    ctx.globalCompositeOperation='source-over';
  }else if(f.type==='spark2'){
    ctx.strokeStyle='rgba(235,240,248,'+(0.8*(1-k))+')';ctx.lineWidth=2;
    var rr3=20+k*46;
    ctx.beginPath();ctx.moveTo(f.x+Math.cos(f.a)*rr3*0.4,f.y+Math.sin(f.a)*rr3*0.4);
    ctx.lineTo(f.x+Math.cos(f.a)*rr3,f.y+Math.sin(f.a)*rr3);ctx.stroke();
  }
}
// свет: статичные лампы «пекутся» в слой карты (ре-бейк 2 раза в секунду — переживает
// и переезд в новый офис), в кадре остаются только живые дырки: герои, кофе, дедлайны.
// ?light=legacy — старый покадровый путь для A/B-сравнения глазами.
var LIGHT_LEGACY=/[?&]light=legacy/.test(location.search);
var bakeCv=document.createElement('canvas'),bakeCtx=bakeCv.getContext('2d'),bakeT=-9;
function rebakeLights(){
  bakeT=G.t;
  var bs=0.0625; // 1/16 мирового пикселя: свет и так радиальная размытость
  var bw=Math.max(2,Math.round(MAP_W*bs)),bh=Math.max(2,Math.round(MAP_H*bs));
  if(bakeCv.width!==bw||bakeCv.height!==bh){bakeCv.width=bw;bakeCv.height=bh;}
  bakeCtx.setTransform(1,0,0,1,0,0);
  bakeCtx.clearRect(0,0,bw,bh);
  bakeCtx.globalCompositeOperation='source-over'; // заготовка — прозрачный фон + альфа-дырки
  bakeCtx.setTransform(bs,0,0,bs,0,0);
  for(var i=0;i<LIGHTS.length;i++){var L=LIGHTS[i];
    if(L.dead)continue;
    var inten=L.dim; // мерцание ламп оставлено легаси-пути: разница глазу не читается
    if(inten<=0.03)continue;
    bakeCtx.globalAlpha=Math.min(1,inten+0.3);
    bakeCtx.drawImage(holeCv,L.x-215,L.y-215,430,430);
  }
  bakeCtx.globalAlpha=1;
}
function drawLighting(){
  var sc=LIGHT_LEGACY?0.5:0.25; // четверть-разрешение: свет мягкий, пикселей хватит
  if(lightCv.width!==Math.max(2,Math.round(cv.width*sc))||lightCv.height!==Math.max(2,Math.round(cv.height*sc))){lightCv.width=Math.max(2,Math.round(cv.width*sc));lightCv.height=Math.max(2,Math.round(cv.height*sc));}
  lctx.setTransform(1,0,0,1,0,0);
  lctx.clearRect(0,0,lightCv.width,lightCv.height);
  lctx.fillStyle='rgba(3,6,12,0.45)';lctx.fillRect(0,0,lightCv.width,lightCv.height); // офис жилой, а не склеп
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
      if(inten>0.03)hole(L.x,L.y,215*Math.min(1,inten+0.3),Math.min(1,inten+0.3));
    }
  }else{
    if(G.t-bakeT>0.5)rebakeLights();
    lctx.drawImage(bakeCv,0,0,MAP_W,MAP_H); // весь статичный свет одной командой
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
    ctx.save();ctx.globalCompositeOperation='saturation';ctx.globalAlpha=b2*0.9; // ч/б с ростом выгорания
    ctx.fillStyle='#808080';ctx.fillRect(0,0,W,H);ctx.restore();
    if(meB.burnout>45){ // трещины по экрану
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
    var rIn=Math.min(W,H)*(0.85-0.5*b2); // туннельное зрение
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
    if(!drawPost.rg){ // форма пульса кэширована — дышит только alpha
      drawPost.rg=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.3,W/2,H/2,Math.max(W,H)*0.7);
      drawPost.rg.addColorStop(0,'rgba(180,30,30,0)');
      drawPost.rg.addColorStop(1,'rgba(180,30,30,1)');
    }
    ctx.globalAlpha=a;
    ctx.fillStyle=drawPost.rg;ctx.fillRect(0,0,W,H);
    ctx.globalAlpha=1;
  }
}
function pixFont(px,bold){
  return (bold?'700 ':'500 ')+px+'px "IBM Plex Mono",Arial,monospace';
}
function drawCup(x,y,s,fill){
  hctx.save();hctx.translate(x,y);hctx.scale(s,s);
  hctx.strokeStyle='#c9d1d9';hctx.lineWidth=2;
  hctx.fillStyle='#12161c';rr(hctx,-14,-18,28,34,4);hctx.fill();hctx.stroke();
  var fh=30*clamp(fill,0,1);
  hctx.fillStyle='#6f4a23';hctx.fillRect(-12,14-fh,24,fh);
  if(fill>0.05){hctx.fillStyle='#8a5a2b';hctx.fillRect(-12,14-fh,24,2);}
  hctx.beginPath();hctx.arc(16,-2,7,-1.3,1.3);hctx.stroke();
  if(fill>0.25){
    hctx.strokeStyle='rgba(200,200,200,0.35)';hctx.lineWidth=1.5;
    hctx.beginPath();hctx.moveTo(-5,-22);hctx.quadraticCurveTo(-8,-28,-5,-34);
    hctx.moveTo(5,-22);hctx.quadraticCurveTo(2,-28,5,-34);hctx.stroke();
  }
  hctx.restore();
}
  // === тач-HUD: одна верхняя строка, всё остальное — кнопки ===
  function drawHudTouch(p,W){
    var H2=bhud.height/DPR;
    var topY=H2<480?34:64; // ландшафт (низкий экран): строка сразу под кнопками
    // выгорание
    hctx.fillStyle='rgba(10,13,18,0.7)';rr(hctx,10,topY,132,12,6);hctx.fill();
    var jit=p.burnout>70?R()*3-1.5:0;
    hctx.fillStyle=p.burnout>70?'#dc2626':'#b45309';
    hctx.fillRect(12+jit,topY+2,128*clamp(p.burnout/100,0,1),8);
    hctx.font=pixFont(13,true);hctx.fillStyle=p.burnout>70?'#e5534b':'#c9d1d9';
    hctx.fillText(Math.round(p.burnout)+'%',146,topY+10);
    // кофе в той же строке
    drawCup(176,topY+5,0.75,p.coffee/(p.coffeeMax||100));
    hctx.fillStyle='rgba(10,13,18,0.7)';rr(hctx,190,topY+2,92,8,3);hctx.fill();
    hctx.fillStyle='#3fb950';hctx.fillRect(191,topY+3,90*clamp(p.coffee/(p.coffeeMax||100),0,1),6);
    // спринт и враги — вторая строка слева: статистика боя обязательна и на телефоне
    var hi=window.__hudInfo;
    if(hi){
      hctx.font=pixFont(12,true);hctx.fillStyle='#8b949e';
      hctx.fillText('СПРИНТ '+hi.wave+' · ур.'+G.level+' · закрыто '+Math.max(0,hi.wave-1),12,topY+30);
      hctx.fillStyle='#12161c';hctx.fillRect(12,topY+35,110,3);
      hctx.fillStyle='#d29922';hctx.fillRect(12,topY+35,110*clamp(G.xp/G.xpN,0,1),3);
      hctx.font=pixFont(16,true);
      if(hi.cleared){hctx.fillStyle='#8bd17c';hctx.fillText('ВСЕ ЗАДАЧИ ЗАКРЫТЫ ✓',12,topY+57);}
      else if(hi.boss){hctx.fillStyle='#e5534b';hctx.fillText('АУДИТ ИДЁТ',12,topY+57);}
      else{
        var hot=hi.remain<=3;
        hctx.fillStyle=hi.remain===0?'#8bd17c':(hot?'#e5534b':'#e6edf3');
        hctx.fillText('ВРАГОВ: '+hi.remain+(hot&&hi.remain>0?' — зачистка!':''),12,topY+57);
      }
    }
    // КД-состояние тач-кнопок (затемнение) и заряд СУПЕРа
    // DOM трогаем только при изменении: запись стиля каждый кадр гоняет пересчёт layout и жжёт батарею
    var tb={btnAlt:[p.cd2||0,CLS[p.cls].s2.cd],btnSkill:[p.cdD||0,2.6],btnSkill2:[p.cdS||0,CLS[p.cls].sk.cd],btnFU:[Math.max(p.cdQ||0,p.qT||0),CLS[p.cls].ult.cd],btnR:[p.cdU||0,25]};
    for(var tk in tb){var el=document.getElementById(tk);if(!el)continue;
      var cd=tb[tk][0],cdm=tb[tk][1]||1;
      var pct=clamp(cd/cdm,0,1);
      var step=(pct*50)|0; // квант 2%: глазу неотличимо, DOM спит 50 из 51 кадра
      if(el._cd!==step){el._cd=step;el.style.background='conic-gradient(rgba(6,8,12,.82) '+(step*2)+'%, rgba(33,38,45,.72) 0)';}
      var onc=cd>0.05;
      if(el._onc!==onc){el._onc=onc;el.classList.toggle('oncd',onc);}
    }
    var rBtn=document.getElementById('btnR');
    if(rBtn){
      var nch=(p.superC||0)<1||G.wave<G.ultAt;
      if(rBtn._nochg!==nch){rBtn._nochg=nch;rBtn.classList.toggle('nochg',nch);}
      var chg=(0.15+0.5*clamp(p.superC||0,0,1));
      var chq=Math.round(chg*25); // квант 4%
      if(rBtn._chg!==chq){rBtn._chg=chq;rBtn.style.background='radial-gradient(circle at 50% 120%,rgba(255,206,0,'+chg.toFixed(2)+'),rgba(60,50,10,.8))';}
    }
    // итоги спринта + кнопка дальше: карточка компактная, телефон в высоту узкий
    if(G.waveState==='cleared'&&G.state==='playing'){
      var st=G.interStats||{w:G.wave,ki:0,kd:0,okr:G.okr,co:(p.coins||0)};
      var left=Math.max(0,Math.ceil(G.interT));
      var cw=Math.min(370,W-24),cx=W/2-cw/2,cy=topY+66;
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
      window.__interRect={x:cx,y:cy,w:cw,h:64}; // тесты следят за итогами и на таче
      var bw=Math.min(340,W-40),bx=W/2-bw/2,by=cy+72;
      var mmR=window.__mmRect; // узкий портрет: миникарта сверху-справа — кнопку под неё
      if(mmR&&by<mmR.y+mmR.h&&by+44>mmR.y&&bx+bw>mmR.x&&bx<mmR.x+mmR.w)by=Math.ceil(mmR.y+mmR.h)+8;
      root.classList.add('noatk'); // боевые кнопки гаснут — главный герой «ДАЛЬШЕ»
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
  hctx.textAlign='left';
  var narrow=W<640;
  var okrX=(W<1100)?Math.max(W-280,216):W-160; // узкий экран: панель OKR уходит влево от DOM-кнопок #btnPauseM/#btnFS, но не в sprint-панель (она до x=208)
  var bx=16,by=H-58,bw=narrow?130:210,bh=18;
  if(!isTouch){ // PC-панель выгорания внизу: на таче вместо неё верхняя строка
  hctx.fillStyle='rgba(10,13,18,0.75)';rr(hctx,bx-8,by-26,narrow?bw+96:bw+120,bh+40,6);hctx.fill();
  var jit=p.burnout>70?R()*3-1.5:0;
  hctx.font=pixFont(13,true);hctx.fillStyle=p.burnout>70?'#e5534b':'#8b949e';
  hctx.fillText('ВЫГОРАНИЕ',bx,by-12);
  hctx.fillStyle='#12161c';rr(hctx,bx,by,bw,bh,3);hctx.fill();
  hctx.strokeStyle='#333b47';hctx.lineWidth=1;rr(hctx,bx,by,bw,bh,3);hctx.stroke();
  var fillW=bw*clamp(p.burnout/100,0,1);
  if(fillW>2){
    hctx.save();rr(hctx,bx,by,bw,bh,3);hctx.clip();
    var grad=hctx.createLinearGradient(bx,0,bx+bw,0);
    grad.addColorStop(0,'#6b7280');grad.addColorStop(0.5,'#b45309');grad.addColorStop(1,'#dc2626');
    hctx.fillStyle=grad;hctx.fillRect(bx+jit,by+jit*0.5,fillW,bh);hctx.restore();
  }
  hctx.font=pixFont(15,true);hctx.fillStyle='#e6edf3';
  hctx.fillText(Math.round(p.burnout)+'%',bx+bw+8,by+14);
  drawCup(bx+bw+(narrow?42:58),by+10,narrow?0.85:1.05,p.coffee/(p.coffeeMax||100));
  hctx.font=pixFont(13,true);hctx.fillStyle='#8b949e';
  hctx.fillText(narrow?('☕'+Math.round(p.coffee)):('КОФЕ '+Math.round(p.coffee)),bx+bw+(narrow?64:80),by+38);
  }
  drawMinimap(); // до тач-return: миникарта обязательна на любой платформе
  if(NET.mode==='guest'&&G.state==='playing'){ // живой индикатор связи: свежесть снапшотов
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
  // спринт-счётчик нужен всем платформам (и тестам): считаем до раскладки панелей
  var remG=(NET.mode==='guest')?VIEW.mobs.length:(G.spawnQ.length+G.mobs.length);
  var cleared=G.waveState==='cleared';
  window.__hudInfo={wave:Math.max(1,G.wave),remain:remG,cleared:cleared,boss:!!(G.boss||((NET.mode==='guest')&&VIEW.boss))};
  if(!cleared)window.__interRect=null; // панель итогов живёт только в cleared — и на ПК, и на таче
  if(!isTouch){ // слоты, панели и счётчики ПК-раскладки
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
  var slotW=isTouch?48:66,gap=isTouch?5:7;
  var sx0=isTouch?12:W/2-((slots.length*(slotW+gap)-8)/2);
  for(var i=0;i<slots.length;i++){var s=slots[i],x=sx0+i*(slotW+gap);
    hctx.fillStyle='rgba(10,13,18,0.75)';rr(hctx,x,sy,slotW,52,6);hctx.fill();
    hctx.strokeStyle='#333b47';rr(hctx,x,sy,slotW,52,6);hctx.stroke();
    if(s.cd>0){hctx.fillStyle='rgba(0,0,0,0.6)';hctx.fillRect(x,sy,slotW,52*Math.min(1,s.cd/s.cdm));}
    hctx.font=pixFont(11,true);hctx.fillStyle='#d29922';hctx.textAlign='center';
    var KL=isTouch?['АТК','ПРИЁМ','РЫВОК','СКИЛ','УЛЬТА','R']:['ЛКМ','ПКМ','ПРОБЕЛ','F','Q','R'];
    hctx.fillText(isTouch?KL[i]:'['+KL[i]+']',x+slotW/2,sy+16);
    hctx.font=pixFont(11);
    if(s.cd===-1){ // СУПЕР ещё закрыт
      hctx.fillStyle='rgba(0,0,0,0.55)';hctx.fillRect(x,sy,slotW,52);
      hctx.fillStyle='#6e7681';hctx.fillText('с '+G.ultAt+'-го',x+slotW/2,sy+30);
    }else if(s.chg!==undefined){ // сектор заряда СУПЕРа
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
  }
  if(p.haste>0){
    hctx.fillStyle='rgba(139,209,124,'+(0.7+0.3*Math.sin(G.t*10))+')';hctx.font='bold 11px Arial';
    hctx.fillText('АСАП! +55%',bx+bw+(narrow?64:80),by-6);
  }
  // === спринт + враги: явный счётчик, чтобы смена локации не была внезапной ===
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
  // комбо-счётчик
  if(G.combo>1){
    var cbs=1+0.1*Math.sin(G.t*12);
    hctx.save();
    hctx.translate(W/2,86);
    hctx.scale(cbs,cbs);
    hctx.font=pixFont(24,true);
    hctx.fillStyle='rgba(255,207,92,'+(0.75+0.25*Math.sin(G.t*9))+')';
    hctx.strokeStyle='rgba(0,0,0,0.6)';hctx.lineWidth=3;
    hctx.textAlign='center';
    var cbt='×'+G.combo+' '+(COMBONAMES[G.combo]||'');
    hctx.strokeText(cbt,0,0);
    hctx.fillText(cbt,0,0);
    hctx.restore();
    hctx.textAlign='left';
    // таймер-полоса
    hctx.fillStyle='rgba(10,13,18,0.6)';rr(hctx,W/2-40,96,80,5,2);hctx.fill();
    hctx.fillStyle='#ffcf5c';hctx.fillRect(W/2-40,96,80*clamp(G.comboT/3,0,1),5);
  }
  if(p.adr){
    hctx.fillStyle='rgba(229,83,75,'+(0.6+0.4*Math.sin(G.t*10))+')';
    hctx.font='bold 12px Arial';
    hctx.fillText('ПЕРЕДОЗ КОФЕИНА: +20% скор, +25% урон',bx,by-34);
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

  } // конец ПК-раскладки
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
  if(G.msgT>0){
    var msgFs=17,msgMaxW=W-40,msgLines=[G.msg];
    hctx.globalAlpha=Math.min(1,G.msgT);hctx.font=pixFont(msgFs,true);hctx.fillStyle='#e6edf3';hctx.textAlign='center';
    if(hctx.measureText(G.msg).width>msgMaxW){ // длинное объявление: рвём у пробела ближе к середине, при нужде ужимаем (не ниже 13px)
      var msgMid=G.msg.length/2,msgSp=-1;
      for(var mi=0;mi<G.msg.length;mi++)if(G.msg.charAt(mi)===' '&&(msgSp<0||Math.abs(mi-msgMid)<Math.abs(msgSp-msgMid)))msgSp=mi;
      if(msgSp>0)msgLines=[G.msg.slice(0,msgSp),G.msg.slice(msgSp+1)];
      while(msgFs>13&&(hctx.measureText(msgLines[0]).width>msgMaxW||hctx.measureText(msgLines[1]||'').width>msgMaxW)){msgFs--;hctx.font=pixFont(msgFs,true);}
    }
    for(var li=0;li<msgLines.length;li++)hctx.fillText(msgLines[li],W/2,H*0.24+li*(msgFs+4));
    hctx.textAlign='left';hctx.globalAlpha=1;
  }
  if(G.waveState==='calm'&&G.wave>=1&&G.state==='playing'&&G.waveT>0.5){
    hctx.textAlign='center';hctx.font=pixFont(15,true);hctx.fillStyle='rgba(230,237,243,'+(0.55+0.3*Math.sin(G.t*4)).toFixed(3)+')';
    hctx.fillText('новый спринт через '+Math.ceil(G.waveT)+'…',W/2,H*0.24+30);hctx.textAlign='left';
  }
  if(G.sepT>0){ // «3 сентября» на весь экран
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
  if(isTouch){drawHudTouch(p,W);return;} // тач: компактный HUD со счётчиком врагов и итогами спринта
  // === межспринтовая пауза (ПК): НЕ блокирует — собирайте лут; старт кнопкой/Enter/таймером ===
  if(G.waveState==='cleared'&&G.state==='playing'){
    var st=G.interStats||{w:G.wave,ki:0,kd:0,okr:G.okr,co:(p.coins||0)};
    var pw=Math.min(620,W-40),px0=W/2-pw/2,py0=10; // сверху: центр свободен для боя и лута
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
    hctx.fillText('СТАРТ: СЛЕДУЮЩИЙ СПРИНТ [ENTER] · авто '+left+'с',W/2,by0+23); // без ▶-глифа: на iOS он тофу
    window.__nextBtnRect={x:bx0,y:by0,w:bw,h:34}; // хит-зона для тача
    hctx.textAlign='left';
    if(hov&&mouse.down)G.interT=Math.min(G.interT,0.05);
    window.__interRect={x:px0,y:py0,w:pw,h:218}; // тесты следят за итоговой панелью
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
  // touch: карта в правом верхнем; на низких ландшафтах — в левый верх, подальше от дуги кнопок
  var low=isTouch&&H<520;
  var mx=low?14:W-mw-14,my=isTouch?76:H-mh-14;
  hctx.globalAlpha=0.92;
  hctx.fillStyle='rgba(14,18,26,0.88)';rr(hctx,mx-6,my-6,mw+12,mh+12,4);hctx.fill();
  hctx.strokeStyle='#7d8a99';hctx.lineWidth=2;rr(hctx,mx-6,my-6,mw+12,mh+12,4);hctx.stroke();
  hctx.drawImage(mmCv,mx,my,mw,mh);
  hctx.fillStyle='rgba(230,237,243,0.07)';hctx.fillRect(mx,my,mw,mh); // карту чуть подсветить: читается с первого взгляда
  window.__mmRect={x:mx,y:my,w:mw,h:mh}; // хит-зона для layout-тестов (QA следит за миникартой)
  hctx.globalAlpha=1;
  var sc=mw/MAP_W;
  // туман на миникарте: один кэшированный слой (1px на тайл) вместо fillRect на каждый тайл каждый кадр
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
  if(G.waveState==='active'&&mobs.length>0&&mobs.length<=3){ // хвост волны: последние стажёры пульсируют сквозь туман — бег не растягивается
    hctx.fillStyle='#e5534b';
    for(i=0;i<mobs.length;i++){
      hctx.beginPath();hctx.arc(mx+mobs[i].x*sc,my+mobs[i].y*sc,2.5+Math.sin(G.t*8),0,TAU);hctx.fill();
    }
    var capY=my+mh+17;if(capY>H-2)capY=my+mh-5; // ПК ставит карту в самый низ — тогда подпись внутрь рамки
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
  if(G.t-menuCam.lastVis>0.15){ // «камера наблюдения» открывает обзор
    menuCam.lastVis=G.t;
    computeVis(menuCam.x,menuCam.y);
  }
  drawWorld();drawLighting();drawPost();
}
function render(){
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,cv.width,cv.height);
  hctx.setTransform(DPR,0,0,DPR,0,0);
  hctx.clearRect(0,0,bhud.width/DPR,bhud.height/DPR);
  if(localPlayer()||VIEW.players.length){
    drawWorld();drawLighting();drawPost();
    drawSouls();
    drawHUD();
  }else{
    renderMenu();
  }
}
