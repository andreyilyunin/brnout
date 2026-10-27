'use strict';
// ============================== sprites (GTA2-style layered humanoids) ==============================
// пиксельный рендер моделей: рисуем в мелкий оффскрин, блиним крупными чанками.
// Мир, свет и тексты остаются чёткими — чанки только у персонажей.
var SPRCV=document.createElement('canvas');SPRCV.width=160;SPRCV.height=160;
var SPRC=SPRCV.getContext('2d');
var SPR_SCALE=0.5; // 1 модельный пиксель = 2 мировых
function pixWrap(o,fn){
  var sc=o.scale||1;
  SPRC.setTransform(1,0,0,1,0,0);
  SPRC.clearRect(0,0,160,160);
  SPRC.save();
  SPRC.translate(80,80);
  SPRC.scale(SPR_SCALE*sc,SPR_SCALE*sc);
  var o2={};for(var k in o)o2[k]=o[k];
  o2.x=0;o2.y=0;o2.scale=1;
  fn(SPRC,o2);
  SPRC.restore();
  ctx.save();
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(SPRCV,Math.round(o.x-80),Math.round(o.y-80));
  ctx.restore();
}
function drawHumanoid(c,o){
  if(c===ctx){pixWrap(o,drawHumanoidBody);return;}
  drawHumanoidBody(c,o);
}
function drawHumanoidBody(c,o){
  var s=o.scale||1,L=o.look,f=o.face||0;
  var frenzy=o.casting==='type';
  var cast=o.castT>0;
  c.save();c.translate(o.x,o.y);
  c.fillStyle='rgba(0,0,0,0.38)';c.beginPath();c.ellipse(2*s,4*s,14*s,9*s,0,0,TAU);c.fill();
  // haste trail
  if(o.haste>0){
    c.strokeStyle='rgba(139,209,124,'+(0.3+0.15*Math.sin(G.t*14))+')';c.lineWidth=2;
    c.beginPath();c.arc(0,0,19*s,0,TAU);c.stroke();
  }
  c.rotate(f+Math.PI/2);
  var mv=o.moving?1:0;
  var ph=(o.step||0)*TAU;
  var sw=Math.sin(ph)*3*mv,sway=Math.sin(ph)*0.07*mv;
  c.rotate(sway);
  if(frenzy)c.rotate(Math.sin(G.t*26)*0.04);
  // ===== НОГИ (GTA2): стоят — стопы выглядывают назад из-под торса; шаг — вынос вдоль оси движения =====
  var sexy=false; // по референсу дизайнер в куртке и джинсах, не в платье
  var stride=Math.sin(ph)*15*mv;
  var footLx=-4.6*s,footRx=4.6*s;
  var footLy=-9*s-stride,footRy=-9*s+stride;
  var PANTS={dev:'#262a33',mgr:'#26262c',mkt:'#4c5166',dsn:'#4a6a9c',intern:'#43506b'}[o.cls]||'#43506b';
  function leg(footX,footY){
    c.strokeStyle=PANTS;c.lineWidth=5.5*s;c.lineCap='round';
    c.beginPath();c.moveTo(footX,4.5*s);c.quadraticCurveTo(footX*1.05,(footY+4.5*s)/2,footX,footY-2.5*s);c.stroke();
  }
  function shoe(footX,footY,main,sole,accent,heel){
    c.fillStyle=main;rr(c,footX-3.3*s,footY-4.5*s,6.6*s,9*s,2.6*s);c.fill();
    c.fillStyle=sole;c.fillRect(footX-3.3*s,footY+2.2*s,6.6*s,2.2*s);
    if(accent){c.fillStyle=accent;c.fillRect(footX-3.3*s,footY-0.8*s,6.6*s,1.5*s);}
    if(heel){c.fillStyle=sole;c.fillRect(footX-2.7*s,footY+3.4*s,2.3*s,2.6*s);}
  }
  leg(footLx,footLy);leg(footRx,footRy);
  if(o.cls==='dev'){
    shoe(footLx,footLy,'#e8e8ee','#23262e',L.accent);shoe(footRx,footRy,'#e8e8ee','#23262e',L.accent);
  }else if(o.cls==='mgr'){
    shoe(footLx,footLy,'#3a2a1a','#241a10','#ffcf5c');shoe(footRx,footRy,'#3a2a1a','#241a10','#ffcf5c');
  }else if(o.cls==='mkt'){
    shoe(footLx,footLy,'#8a5a2a','#4a3018','rgba(255,255,255,0.3)');shoe(footRx,footRy,'#8a5a2a','#4a3018','rgba(255,255,255,0.3)');
  }else if(sexy){
    shoe(footLx,footLy,'#241d2e','#171221',L.accent,true);shoe(footRx,footRy,'#241d2e','#171221',L.accent,true);
  }else{
    shoe(footLx,footLy,'#d8d8de','#2a2d34');shoe(footRx,footRy,'#d8d8de','#2a2d34');
  }
  // torso — дизайнер: цельное платье А-силуэта
  if(sexy){
    var gs=c.createLinearGradient(-11*s,0,11*s,0);
    gs.addColorStop(0,shade(L.shirt,-24));gs.addColorStop(0.5,L.shirt);gs.addColorStop(1,shade(L.shirt,-24));
    c.fillStyle=gs;
    c.beginPath();
    c.moveTo(-8.5*s,-10*s);c.lineTo(8.5*s,-10*s);
    c.lineTo(12*s,7*s);c.lineTo(-12*s,7*s);c.closePath();c.fill();
    c.strokeStyle='rgba(0,0,0,0.4)';c.lineWidth=1.5;c.stroke();
    c.fillStyle='#241d2e';c.fillRect(-9.6*s,-3*s,19.2*s,2*s);       // пояс
    c.fillStyle=L.accent;c.fillRect(-1.6*s,-3.5*s,3.2*s,3*s);      // пряжка
    c.fillStyle=shade(L.shirt,26);                                  // воротник
    c.beginPath();c.moveTo(-4*s,-10*s);c.lineTo(0,-6.4*s);c.lineTo(4*s,-10*s);c.closePath();c.fill();
    c.strokeStyle=L.accent;c.lineWidth=1.1*s;                       // кайма подола
    c.beginPath();c.moveTo(-10.4*s,4.8*s);c.lineTo(10.4*s,4.8*s);c.stroke();
    c.fillStyle='#8a4a5e';                                          // сумочка
    rr(c,9*s,-2*s,4.6*s,6*s,1.5*s);c.fill();
    c.strokeStyle='rgba(0,0,0,0.35)';c.lineWidth=0.8*s;
    c.beginPath();c.arc(11.3*s,-2*s,3*s,Math.PI,TAU);c.stroke();
  }else{
    var g1=c.createLinearGradient(-12*s,0,12*s,0);
    g1.addColorStop(0,shade(L.shirt,-22));g1.addColorStop(0.5,L.shirt);g1.addColorStop(1,shade(L.shirt,-22));
    c.fillStyle=g1;
    rr(c,-12*s,-10*s,24*s,19*s,8*s);c.fill();
    c.strokeStyle='rgba(0,0,0,0.45)';c.lineWidth=1.5;c.stroke();
    c.fillStyle='rgba(255,255,255,0.1)';c.fillRect(-9*s,-10*s,18*s,2.2*s); // блик по плечам
  }
  if(o.cls==='mkt'){ // пиджак: лацканы + платок
    c.fillStyle=shade(L.shirt,-32);
    c.beginPath();c.moveTo(-6*s,-10*s);c.lineTo(-1*s,-2*s);c.lineTo(-7.6*s,-1*s);c.closePath();c.fill();
    c.beginPath();c.moveTo(6*s,-10*s);c.lineTo(1*s,-2*s);c.lineTo(7.6*s,-1*s);c.closePath();c.fill();
    c.strokeStyle='rgba(0,0,0,0.35)';c.lineWidth=1;
    c.beginPath();c.moveTo(-6*s,-10*s);c.lineTo(-1*s,-2*s);c.moveTo(6*s,-10*s);c.lineTo(1*s,-2*s);c.stroke();
    c.fillStyle='rgba(255,255,255,0.16)';c.fillRect(-9*s,-7.5*s,2.4*s,2.4*s);
  }
  if(o.cls==='intern'){ // рюкзак с проекта
    c.fillStyle=shade(L.shirt,-26);
    rr(c,-7.5*s,0.5*s,15*s,7*s,2.5*s);c.fill();
    c.strokeStyle='rgba(0,0,0,0.4)';c.lineWidth=1.2;
    rr(c,-7.5*s,0.5*s,15*s,7*s,2.5*s);c.stroke();
    c.fillStyle=L.accent;c.fillRect(-7.5*s,2.6*s,15*s,1.4*s);
    c.fillStyle='rgba(0,0,0,0.25)';c.fillRect(-2.4*s,4.4*s,4.8*s,2.2*s);
  }
  // accent: галстук / шнурки худи
  if(o.cls==='mgr'||o.bossTie){
    // комично длинный галстук — развевается ниже пояса
    var flut=Math.sin(G.t*7)*1.6*s+Math.sin(ph)*1*s*mv;
    c.fillStyle=L.accent;
    c.beginPath();
    c.moveTo(0,-10*s);
    c.lineTo(2.7*s+flut*0.3,-1*s);
    c.lineTo(3.4*s+flut,6*s);
    c.lineTo(0.6*s+flut,7.4*s);
    c.lineTo(-0.6*s+flut*0.8,6*s);
    c.lineTo(-2.7*s+flut*0.3,-1*s);
    c.closePath();c.fill();
    c.fillStyle='rgba(0,0,0,0.25)';c.fillRect(-0.8*s+flut*0.6,2*s,1.6*s,2.4*s); // узор
    if(o.cls==='mgr'){ // воротник рубашки + бейдж на груди
      c.fillStyle='rgba(255,255,255,0.75)';
      c.beginPath();c.moveTo(-4.5*s,-10*s);c.lineTo(-1.2*s,-7.6*s);c.lineTo(-4*s,-6.2*s);c.closePath();c.fill();
      c.beginPath();c.moveTo(4.5*s,-10*s);c.lineTo(1.2*s,-7.6*s);c.lineTo(4*s,-6.2*s);c.closePath();c.fill();
      c.strokeStyle='#8b949e';c.lineWidth=0.8*s;
      c.beginPath();c.moveTo(5*s,-9*s);c.lineTo(4*s,-5.4*s);c.stroke();
      c.fillStyle='#d8dce2';rr(c,2.9*s,-5.6*s,3.4*s,2.6*s,0.6*s);c.fill();
      c.fillStyle='#c23b32';c.fillRect(3.1*s,-5.3*s,1.2*s,0.9*s);
      c.fillStyle='#6e7681';c.fillRect(4.5*s,-5.2*s,1.5*s,0.5*s);
    }
  }else{
    c.strokeStyle=L.accent;c.lineWidth=1.6;c.lineCap='round';
    c.beginPath();c.moveTo(-2*s,-8*s);c.lineTo(-2.4*s,-3*s);c.moveTo(2*s,-8*s);c.lineTo(2.4*s,-3*s);c.stroke();
  }
  // ===== РУКИ (GTA2): покой — вдоль тела; ходьба — махи; атака/созвон — две руки вперёд =====
  var atkP=(o.atkT||0)>0;
  function arm(sx,side){
    var hx1=sx, hy2=2.5*s;
    if(mv)hy2=3.5*s+Math.sin(ph+(side?Math.PI:0))*3.5*s;    // махи в противофазе ногам
    if(cast){hx1=sx*0.34;hy2=-8.5*s;}                        // созвон: руки к лицу
    if(atkP){hx1=sx*0.22;hy2=-11.5*s;}                       // атака: хват двумя перед головой
    if(frenzy&&!atkP){hx1=sx*0.8;hy2=-3*s+Math.sin(G.t*30+side*Math.PI)*4*s;}
    c.strokeStyle=shade(L.shirt,-12);c.lineWidth=5*s;c.lineCap='round';
    c.beginPath();c.moveTo(sx,-6.5*s);c.quadraticCurveTo(sx*1.22,(hy2-6.5*s)/2,hx1,hy2);c.stroke();
    c.fillStyle=L.skin;c.beginPath();c.arc(hx1,hy2,2.5*s,0,TAU);c.fill();
  }
  arm(sexy?-9.5*s:-11.5*s,0);arm(sexy?9.5*s:11.5*s,1);
  // head
  c.fillStyle=L.skin;c.beginPath();c.arc(0,-3*s,7.5*s,0,TAU);c.fill();
  c.strokeStyle='rgba(0,0,0,0.25)';c.lineWidth=1;c.stroke();
  c.fillStyle='rgba(255,255,255,0.15)'; // световой блик на голове
  c.beginPath();c.arc(-1.8*s,-4.6*s,5.2*s,Math.PI*1.05,Math.PI*1.7);c.lineTo(-1.8*s,-4.6*s);c.closePath();c.fill();
  if(sexy){
    // чёлка-полумесяц спереди + высокий хвост НАЗАД
    c.fillStyle=L.hair;
    c.beginPath();
    c.arc(0,-3.2*s,7.5*s,-Math.PI/2+0.72,-Math.PI/2-0.72+TAU,false);
    c.closePath();c.fill();
    c.beginPath();c.arc(0,1.4*s,3.6*s,0,TAU);c.fill();
    c.beginPath();
    c.moveTo(1.6*s,2.2*s);
    c.quadraticCurveTo(4.6*s,4.6*s,3.6*s,8.4*s);
    c.quadraticCurveTo(1.6*s,5.8*s,0.2*s,3*s);
    c.closePath();c.fill();
    c.fillStyle=L.accent;
    c.beginPath();c.arc(0,0.4*s,1.3*s,0,TAU);c.fill();
  }else
  {c.fillStyle=L.hair;
  // шапка волос с клином лица СПЕРЕДИ (-y = направление движения):
  // дуга от -PI/2+fw через затылок до -PI/2-fw, лоб/лицо открыты клином вперёд
  var fw=0.72;
  if(L.hs===0){
    c.beginPath();c.arc(0,-3*s,7.6*s,-Math.PI/2+fw,-Math.PI/2-fw+TAU,false);c.closePath();c.fill();
    // мыски-пряди по краям клина
    c.beginPath();c.moveTo(-3.6*s,-8.6*s);c.lineTo(-2.6*s,-11*s);c.lineTo(-1.2*s,-8.8*s);c.closePath();c.fill();
    c.beginPath();c.moveTo(3.6*s,-8.6*s);c.lineTo(2.6*s,-11*s);c.lineTo(1.2*s,-8.8*s);c.closePath();c.fill();
  }else if(L.hs===1){
    // капюшон: кольцо по голове, лицо открыто клином, внутри тень + очки
    c.beginPath();c.arc(0,-3*s,8.2*s,-Math.PI/2+fw,-Math.PI/2-fw+TAU,false);c.closePath();c.fill();
    c.fillStyle=shade(L.shirt,14);
    c.beginPath();c.arc(0,-4.2*s,5.4*s,-Math.PI/2+fw*0.8,-Math.PI/2-fw*0.8+TAU,false);c.closePath();c.fill();
  }else if(L.hs===2){
    c.beginPath();c.arc(0,2.2*s,3.6*s,0,TAU);c.fill(); // пучок сзади
    c.beginPath();c.arc(0,-3*s,7.5*s,-Math.PI/2+fw,-Math.PI/2-fw+TAU,false);c.closePath();c.fill();
    c.beginPath();c.moveTo(-3.4*s,-8.4*s);c.lineTo(-2.4*s,-10.8*s);c.lineTo(-1*s,-8.6*s);c.closePath();c.fill();
    c.beginPath();c.moveTo(3.4*s,-8.4*s);c.lineTo(2.4*s,-10.8*s);c.lineTo(1*s,-8.6*s);c.closePath();c.fill();
  }else{
    c.fillStyle='#8a2a2a';c.beginPath();c.arc(0,-4.4*s,6.9*s,Math.PI,TAU);c.fill();
    c.fillStyle='#22262e';c.fillRect(-7*s,-5.4*s,14*s,2*s);
    // бантики банданы сзади
    c.fillStyle='#8a2a2a';
    c.beginPath();c.moveTo(-2*s,3*s);c.lineTo(-4.6*s,7*s);c.lineTo(-1.2*s,5.4*s);c.closePath();c.fill();
    c.beginPath();c.moveTo(2*s,3*s);c.lineTo(4.6*s,7*s);c.lineTo(1.2*s,5.4*s);c.closePath();c.fill();
  }
  }
  if(o.cls==='dsn'){ // дизайнер: чокер на шее, визор на лице, серьга, румянец на щеках
    c.fillStyle='#241d2e';
    c.fillRect(-3.4*s,-8.4*s,6.8*s,1.6*s);
    c.fillStyle='#1a1d22';
    rr(c,-6.6*s,-6.4*s,13.2*s,3.2*s,1.6*s);c.fill();
    c.fillStyle='rgba(95,208,192,0.9)';
    c.fillRect(-5.4*s,-6*s,4.4*s,2.4*s);
    c.fillRect(1*s,-6*s,4.4*s,2.4*s);
    c.fillStyle='rgba(212,106,142,0.5)';
    c.beginPath();c.arc(-4.8*s,-2.6*s,1.1*s,0,TAU);c.arc(4.8*s,-2.6*s,1.1*s,0,TAU);c.fill();
    c.fillStyle='#ffcf5c';c.beginPath();c.arc(7*s,-2.2*s,1.2*s,0,TAU);c.fill();
  }else if(o.cls==='dev'){ // мистер робот: очки в тени капюшона + завязки спереди
    c.fillStyle='rgba(20,18,26,0.55)';
    c.beginPath();c.ellipse(0,-5.8*s,4.6*s,2.6*s,0,0,TAU);c.fill();
    c.fillStyle=L.accent;
    c.beginPath();c.arc(-2.2*s,-6*s,1*s,0,TAU);c.arc(2.2*s,-6*s,1*s,0,TAU);c.fill();
    c.strokeStyle=L.accent;c.lineWidth=1.3*s;c.lineCap='round';
    c.beginPath();c.moveTo(-2.2*s,-9.2*s);c.lineTo(-2.8*s,-7*s);c.moveTo(2.2*s,-9.2*s);c.lineTo(2.8*s,-7*s);c.stroke();
  }else if(o.cls==='mkt'){ // шарф на ШЕЕ (под подбородком), хвост вбок-назад
    c.fillStyle=L.accent;
    rr(c,-6.6*s,-8.2*s,13.2*s,3.4*s,1.5*s);c.fill();
    c.fillRect(4.2*s,-5.6*s,2.6*s,6*s);
    c.fillStyle='rgba(0,0,0,0.2)';c.fillRect(4.2*s,-5.6*s,2.6*s,1.2*s);
  }
  c.restore();
  // off-hand phone during shield
  if(o.shieldOn){
    c.save();c.translate(o.x+Math.cos(f+1.9)*13,o.y+Math.sin(f+1.9)*13);c.rotate(f+1.2);
    c.fillStyle='#22262e';rr(c,-3,-6,6,11,1);c.fill();
    c.fillStyle='#3fb950';c.fillRect(-2,-4,4,6);
    c.restore();
  }
  // weapon at hold point (world space, in front)
  if(o.weapon)drawWeapon(c,o,s);
}
// JIRA-значок (Atlassian): фирменный двойной шеврон вверх в градиенте Jira-blue
function drawJiraIcon(c,sc){
  c.save();c.scale(sc,sc);
  var gr=c.createLinearGradient(-7,-6,7,8);
  gr.addColorStop(0,'#2684FF');
  gr.addColorStop(1,'#0052CC');
  c.fillStyle=gr;
  function chev(y0){ // полоса-шеврон толщиной 3.4
    c.beginPath();
    c.moveTo(-7.4,y0+4.2);
    c.lineTo(-7.4,y0+1.2);
    c.lineTo(0,y0-6);
    c.lineTo(7.4,y0+1.2);
    c.lineTo(7.4,y0+4.2);
    c.lineTo(0,y0-2.6);
    c.closePath();c.fill();
  }
  chev(2.4);   // верхний шеврон
  chev(-2.6);  // нижний, чуть ниже — классическая «птичка» Jira
  c.restore();
}
function drawWeapon(c,o,s){
  var f=o.face||0;
  var fx=Math.cos(f),fy=Math.sin(f),hx,hy;
  if((o.atkT||0)>0){hx=o.x+fx*13*s;hy=o.y+fy*13*s;}                 // атака: оружие перед головой
  else{hx=o.x+(fx*10-fy*7)*s;hy=o.y+(fy*10+fx*7)*s;}                // покой: у правого бедра
  var frenzy=o.casting==='type';
  var swing=(o.atkT||0)>0?(o.atkT/0.2)*1.1:0;
  var cast=o.castT>0;
  c.save();c.translate(hx,hy);c.rotate(f+Math.PI/2+(swing?Math.sin(swing*3)*0.5:0));
  if(frenzy)c.rotate(Math.sin(G.t*44)*0.13);
  if(o.weapon==='keyboard'){
    c.translate(0,-6*s);
    c.rotate(-0.5+swing+(cast?-0.9:0));
    c.fillStyle='#3d4148';rr(c,-16*s,-8*s,32*s,15*s,2*s);c.fill();
    c.strokeStyle='#20242a';c.lineWidth=1.5;c.stroke();
    c.fillStyle='#23262c';
    for(var ky=-5*s;ky<=5*s;ky+=3.4*s)for(var kx=-13*s;kx<=11*s;kx+=4.2*s)c.fillRect(kx,ky,3*s,2.4*s);
    c.strokeStyle='#d29922';c.lineWidth=1.4;
    c.strokeRect(-16*s,-8*s,32*s,15*s);
    if(frenzy){
      var ky2=((G.t*16)|0)%2?-5*s:5*s;
      c.fillStyle='#d29922';c.fillRect(-2*s,ky2-1.5*s,5*s,3*s);
      c.fillStyle='rgba(210,153,34,0.5)';
      c.beginPath();c.arc(-9*s,ky2,2.5*s,0,TAU);c.arc(9*s,ky2,2*s,0,TAU);c.fill();
    }
  }else if(o.weapon==='tickets'){
    // один крупный билет с жираф-логотипом
    c.rotate(-0.25+swing*0.5);
    c.fillStyle='#f2e6c8';rr(c,-6*s,-20*s,12*s,19*s,1.5*s);c.fill();
    c.strokeStyle='#b9a86f';c.lineWidth=1;rr(c,-6*s,-20*s,12*s,19*s,1.5*s);c.stroke();
    c.fillStyle='#c23b32';c.fillRect(-6*s,-20*s,12*s,3.4*s);
    c.strokeStyle='rgba(0,0,0,0.28)';c.setLineDash([1.5,1.5]);
    c.beginPath();c.moveTo(3.4*s,-16.6*s);c.lineTo(3.4*s,-1*s);c.stroke();
    c.setLineDash([]);
    c.save();c.translate(-0.6*s,-8.5*s);
    drawJiraIcon(c,0.95*s);
    c.restore();
  }else if(o.weapon==='plane'){ // твит-птичка в руке
    c.rotate(-0.2+swing*0.8);
    c.scale(0.85,0.85);
    c.fillStyle='#1d9bf0';
    c.beginPath();c.ellipse(0,0,6,4.6,-0.2,0,TAU);c.fill();
    c.beginPath();c.arc(4,-2.2,2.6,0,TAU);c.fill();
    c.fillStyle='#e8f6ff';
    c.beginPath();c.moveTo(6.4,-2.9);c.lineTo(9.2,-2);c.lineTo(6.2,-1.2);c.closePath();c.fill();
    c.beginPath();c.moveTo(-0.8,-0.8);c.quadraticCurveTo(-6,-5,-1.6,2.2);c.closePath();c.fill();
    c.fillStyle='#0c2a40';c.beginPath();c.arc(4.6,-2.6,0.8,0,TAU);c.fill();
  }else if(o.weapon==='stylus'){
    c.rotate(-0.4+swing*1.2);
    c.fillStyle='#e07030';rr(c,-2*s,-16*s,4*s,18*s,2*s);c.fill();
    c.fillStyle='#c9d1d9';c.beginPath();c.moveTo(-2*s,-16*s);c.lineTo(0,-21*s);c.lineTo(2*s,-16*s);c.closePath();c.fill();
    c.fillStyle='#22262e';c.fillRect(-2.5*s,0,5*s,3*s);
  }else if(o.weapon==='laptop'){
    c.fillStyle='#33383f';rr(c,-8*s,-7*s,16*s,12*s,1.5*s);c.fill();
    c.fillStyle='rgba(150,190,220,0.5)';c.fillRect(-6*s,-5*s,12*s,8*s);
    c.fillStyle='#22262c';c.fillRect(-2*s,5*s,4*s,2*s);
  }else if(o.weapon==='stamp'){
    c.fillStyle='#3a4049';c.fillRect(-3*s,-26*s,6*s,20*s);
    c.fillStyle='#c23b32';rr(c,-9*s,-10*s,18*s,10*s,2*s);c.fill();
    c.fillStyle='#e8e2d0';c.fillRect(-6*s,-8*s,12*s,3*s);
  }
  c.restore();
}
function drawPlayer(p,isMe){
  if(!p||p.dead)return;
  drawHumanoid(ctx,{x:p.x,y:p.y,face:p.face,step:p.step,look:p.look,cls:p.cls,scale:1.35,moving:p.moving,atkT:p.atkT,
    weapon:CLS[p.cls]?CLS[p.cls].weapon:'laptop',casting:(p.cls==='dev'&&p.qT>0)?'type':null,
    castT:p.castT||0,haste:p.haste||0,shieldOn:p.shield>0});
  if(!isMe){
    var pool=worldPool('players'),pi=0;
    for(var i=0;i<pool.length;i++)if(pool[i]===p)pi=i;
    ctx.strokeStyle=PCOLORS[pi%4];ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(p.x,p.y,21,0,TAU);ctx.stroke();
  }
  if(p.flash>0){ctx.fillStyle='rgba(229,83,75,'+(p.flash*0.5)+')';ctx.beginPath();ctx.arc(p.x,p.y,18,0,TAU);ctx.fill();}
  if(p.shield>0){
    var al=0.25+0.1*Math.sin(G.t*8);
    ctx.strokeStyle='rgba(122,162,200,'+(p.shield<1?p.shield*(al+0.15):(al+0.15))+')';ctx.lineWidth=3;
    ctx.beginPath();ctx.arc(p.x,p.y,300,0,TAU);ctx.stroke();
    if(isMe){
      ctx.fillStyle='rgba(200,220,240,0.8)';ctx.font='10px Arial';ctx.textAlign='center';
      ctx.fillText('☎ созвон…',p.x,p.y-34);ctx.textAlign='left';
    }
  }
}
function drawIntern(m,remote){
  var L=HOODIES[(m.tint||0)%HOODIES.length];
  var wob=Math.sin(G.t*2.4+(m.tilt||0))*0.12;
  var elite=m.elite;
  drawHumanoid(ctx,{x:m.x,y:m.y,face:(m.face||0)+wob,step:remote?G.t*2.6:(m.step||m.tilt||0),look:L,cls:'intern',scale:elite?1.55:1.15,moving:true,
    weapon:'laptop',casting:(m.cf>0)?'type':null});
  if(m.wu>0){ // замах слова: маркер над головой раздувается
    var wprog=1-m.wu/0.5;
    ctx.font='bold '+Math.round(10+8*wprog)+'px Georgia,serif';
    ctx.fillStyle=wprog<0.6?'#8b949e':'#ff9a3d';
    ctx.globalAlpha=0.92;
    ctx.fillText('!',m.x,m.y-30-4*Math.sin(wprog*Math.PI));
    ctx.globalAlpha=1;
  }
  if(elite){
    ctx.strokeStyle='rgba(200,120,60,'+(0.5+0.3*Math.sin(G.t*6))+')';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(m.x,m.y,20,0,TAU);ctx.stroke();
    ctx.strokeStyle='rgba(255,200,140,0.25)';
    ctx.beginPath();ctx.arc(m.x,m.y,26,0,TAU);ctx.stroke();
  }
  if(m.stun>0){
    for(var i=0;i<3;i++){
      var a=G.t*4+i*TAU/3;
      ctx.fillStyle='#d29922';ctx.font='bold 12px Arial';ctx.textAlign='center';
      ctx.fillText('?',m.x+Math.cos(a)*14,m.y-16+Math.sin(a)*5);
      ctx.textAlign='left';
    }
  }
  if(m.cf>0){ // ребрендинг: dizzy spiral
    ctx.save();ctx.translate(m.x,m.y-26);
    ctx.strokeStyle='rgba(200,162,224,0.85)';ctx.lineWidth=1.6;
    ctx.beginPath();
    for(var t2=0;t2<4.5;t2+=0.15){
      var r2=1+t2*2;
      var px=Math.cos(t2+G.t*3)*r2,py=Math.sin(t2+G.t*3)*r2*0.5;
      if(t2===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
    }
    ctx.stroke();ctx.restore();
  }
  var hpF=remote?m.hpF:(m.hp/m.hpMax);
  if(hpF!==undefined&&hpF<1){
    ctx.fillStyle='#1a1e24';ctx.fillRect(m.x-12,m.y-24,24,3);
    ctx.fillStyle='#c23b32';ctx.fillRect(m.x-12,m.y-24,24*Math.max(0,hpF),3);
  }
}
function drawDeadline(m,remote){
  var t=G.t+(m.tilt||0);
  var hpF=remote?(m.hpF===undefined?1:m.hpF):(m.hp/m.hpMax);
  ctx.save();ctx.translate(m.x,m.y);ctx.scale(1.3,1.3);
  ctx.fillStyle='rgba(0,0,0,0.35)';ctx.beginPath();ctx.ellipse(2,5,11,7,0,0,TAU);ctx.fill();
  ctx.rotate(Math.sin(t*9)*0.12);
  for(var k=2;k>=0;k--){
    ctx.save();ctx.rotate((k-1)*0.22);
    var w=19-k*2,h=24-k*2;
    ctx.fillStyle=k===0?'#efe9db':'#e4ddcb';
    ctx.fillRect(-w/2,-h/2-2,w,h);
    ctx.strokeStyle='#b9b2a0';ctx.lineWidth=1;ctx.strokeRect(-w/2,-h/2-2,w,h);
    ctx.strokeStyle='rgba(90,90,100,0.5)';
    ctx.beginPath();
    for(var ln=1;ln<6;ln++){ctx.moveTo(-w/2+3,-h/2-2+ln*3.4);ctx.lineTo(w/2-3,-h/2-2+ln*3.4);}
    ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle='#c23b32';ctx.font='bold 9px Arial';ctx.textAlign='center';ctx.fillText('!!',0,-2);ctx.textAlign='left';
  if(hpF<0.55){
    ctx.fillStyle='rgba(30,26,22,0.85)';
    ctx.beginPath();ctx.moveTo(7,-13);ctx.lineTo(11,-13);ctx.lineTo(11,-9);ctx.closePath();ctx.fill();
  }
  // flames
  for(var i=0;i<4;i++){
    var fx=-7+i*4.6;
    var h=7+Math.sin(t*11+i*1.7)*4;
    ctx.fillStyle='rgba(255,120,30,0.85)';
    ctx.beginPath();ctx.moveTo(fx-3,-14);ctx.quadraticCurveTo(fx-2,-14-h,fx,-15-h);ctx.quadraticCurveTo(fx+2,-14-h,fx+3,-14);ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(255,210,90,0.8)';
    ctx.beginPath();ctx.moveTo(fx-1.4,-14);ctx.quadraticCurveTo(fx-0.7,-14-h*0.55,fx,-14.6-h*0.55);ctx.quadraticCurveTo(fx+0.7,-14-h*0.55,fx+1.4,-14);ctx.closePath();ctx.fill();
  }
  ctx.restore();
}
function drawBoss(b,remote){
  var look={skin:'#c9b8a3',hair:'#b9bcc2',hs:0,shirt:'#232a33',accent:'#8b2020'};
  var hpF=remote?(b.hpF||0):clamp(b.hp/b.hpMax,0,1);
  var wu=b.windup>0?Math.min(1,(b.wuT||0)/1.0):0;
  drawHumanoid(ctx,{x:b.x,y:b.y,face:b.face,step:b.step||0,look:look,cls:'mgr',scale:2.85,moving:true,atkT:wu>0?0.2:0,
    weapon:wu>0?null:'stamp',bossTie:true});
  // glasses
  var gd=14;
  ctx.save();ctx.translate(b.x+Math.cos(b.face)*gd*1.2,b.y+Math.sin(b.face)*gd*1.2);ctx.rotate(b.face+Math.PI/2);
  ctx.strokeStyle=remote&&b.phase===2?'#e5534b':'#9aa4af';ctx.lineWidth=2;
  ctx.beginPath();ctx.arc(-5*s2(),0,4.5,0,TAU);ctx.arc(5*s2(),0,4.5,0,TAU);ctx.stroke();
  ctx.beginPath();ctx.moveTo(-1,0);ctx.lineTo(1,0);ctx.stroke();
  if(remote&&b.phase===2){
    ctx.fillStyle='#e5534b';
    ctx.beginPath();ctx.arc(-5*s2(),0,2,0,TAU);ctx.fill();
    ctx.beginPath();ctx.arc(5*s2(),0,2,0,TAU);ctx.fill();
  }
  ctx.restore();
  // folder stack
  ctx.save();ctx.translate(b.x,b.y);ctx.rotate((b.face||0)+0.3);
  ctx.fillStyle='#8a6d3b';rr(ctx,-10,-62,22,14,2);ctx.fill();
  ctx.fillStyle='#d8dce2';ctx.fillRect(-7,-60,16,2);
  ctx.restore();
  // портфель в левой руке + пуговицы костюма
  ctx.save();ctx.translate(b.x,b.y);ctx.rotate((b.face||0)-1.6);
  ctx.fillStyle='#5a4028';rr(ctx,20*s2()*0.8,-7*s2()*0.8,13*s2()*0.8,14*s2()*0.8,3);ctx.fill();
  ctx.strokeStyle='#3a2a1a';ctx.lineWidth=2.5;
  rr(ctx,20*s2()*0.8,-7*s2()*0.8,13*s2()*0.8,14*s2()*0.8,3);ctx.stroke();
  ctx.strokeStyle='#c9a35a';ctx.lineWidth=2;
  ctx.beginPath();ctx.arc(23*s2()*0.8,0,3,Math.PI*1.2,Math.PI*1.8);ctx.stroke();
  ctx.restore();
  ctx.save();ctx.translate(b.x,b.y);ctx.rotate((b.face||0)+Math.PI/2);
  ctx.fillStyle='#c9a35a';
  ctx.fillRect(-8*s2()*0.5,-2,3,3);ctx.fillRect(5*s2()*0.5,-2,3,3);
  ctx.restore();
  // raised stamp during windup
  if(wu>0){
    var sy=-70+wu*38;
    ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.face+Math.PI/2);
    ctx.fillStyle='#3a4049';ctx.fillRect(-3,sy-16,6,18);
    ctx.fillStyle='#c23b32';rr(ctx,-12,sy-6,24,12,3);ctx.fill();
    ctx.fillStyle='#e8e2d0';ctx.fillRect(-8,sy-3,16,4);
    ctx.restore();
  }
}
function s2(){return 2.6;}


// ===== портреты выбора класса: пиксель-арт по референсам пользователя =====
// буфер 124x154 (4:5), 1 пиксель буфера = 1 арт-пиксель, показывается с pixelated.
// референсы: mgr — бородач с кофе и ноутом на синем; dev — капюшон за столом на сером;
// dsn — девушка в оранжевом жакете на белом; mkt — девушка с телефоном-«лайком» на синем.
var PW=124,PH=154;
var PHOTOSRC={},RAILSRC={};
var PORTRAIT_FILES={mgr:'art/portraits/mgr.png',dev:'art/portraits/dev.png',mkt:'art/portraits/mkt.png',dsn:'art/portraits/dsn.png'}; // файл-фото подменит процедурный портрет класса
function pbg(c,stops){var g=c.createLinearGradient(0,0,0,PH);for(var i=0;i<stops.length;i++)g.addColorStop(stops[i][0],stops[i][1]);c.fillStyle=g;c.fillRect(0,0,PW,PH);}
function pr(c,x,y,w,h,col){c.fillStyle=col;c.fillRect(x,y,w,h);}
function pshadow(c,cx,cy,w,col){c.fillStyle=col;c.beginPath();c.ellipse(cx,cy,w,3.5,0,0,TAU);c.fill();}
// ---- менеджер: бородач, серая футболка, ноут под рукой, стакан с паром ----
function drawPortraitMgr(c){
  pbg(c,[[0,'#6e9cc4'],[1,'#b0cfe6']]);
  var glow=c.createRadialGradient(62,70,10,62,70,70);
  glow.addColorStop(0,'rgba(255,255,255,0.20)');glow.addColorStop(1,'rgba(255,255,255,0)');
  c.fillStyle=glow;c.fillRect(0,0,PW,PH);
  pshadow(c,62,144,24,'rgba(25,45,65,0.4)');
  // ===== ноги =====
  pr(c,46,92,34,10,'#2e3440');                                    // бёдра
  pr(c,46,92,34,3,'#232833');                                     // ремень
  pr(c,48,102,13,34,'#2e3440');pr(c,65,102,13,34,'#343b49');
  pr(c,48,120,13,2,'#262b36');pr(c,65,122,13,2,'#2b323e');      // складки коленей
  pr(c,48,134,13,2,'#3a4150');pr(c,65,134,13,2,'#3f4756');      // манжеты
  // туфли
  c.fillStyle='#1a1b20';
  c.beginPath();c.ellipse(53,139,9,4.5,0,0,TAU);c.fill();
  c.beginPath();c.ellipse(71,139,10,4.5,0,0,TAU);c.fill();
  pr(c,44,141,19,2,'#0a0a0c');pr(c,62,141,20,2,'#0a0a0c');
  // ===== ноут под левой рукой =====
  c.fillStyle='#e8eaed';
  c.beginPath();c.moveTo(30,86);c.lineTo(50,80);c.lineTo(51,92);c.lineTo(31,98);c.closePath();c.fill();
  c.strokeStyle='#a8adb4';c.lineWidth=1;
  c.beginPath();c.moveTo(30.5,86.5);c.lineTo(50.5,80.5);c.stroke();
  c.fillStyle='#7d838a';
  c.beginPath();c.moveTo(31,92);c.lineTo(51,86);c.lineTo(51,92);c.lineTo(31,98);c.closePath();c.fill();
  // ===== торс =====
  c.fillStyle='#757c83';
  c.beginPath();
  c.moveTo(48,50);c.quadraticCurveTo(62,46,76,50);
  c.lineTo(80,60);c.lineTo(81,92);c.lineTo(43,92);c.lineTo(44,60);
  c.closePath();c.fill();
  pr(c,44,60,4,30,'#61686f');                                     // теневая сторона
  pr(c,77,52,4,38,'#82898f');                                     // светлая сторона
  pr(c,50,51,24,3,'#868d94');                                     // свет по плечам
  pr(c,56,52,7,3,'#5f666d');                                      // ворот
  c.strokeStyle='rgba(70,78,86,0.8)';c.lineWidth=0.8;             // складки ткани
  c.beginPath();c.moveTo(58,62);c.quadraticCurveTo(56,74,59,86);c.stroke();
  c.beginPath();c.moveTo(68,60);c.quadraticCurveTo(70,72,67,88);c.stroke();
  c.beginPath();c.moveTo(50,70);c.quadraticCurveTo(49,80,51,90);c.stroke();
  // лямка рюкзака
  c.fillStyle='#4c5258';
  c.beginPath();c.moveTo(70,50);c.lineTo(75,50);c.lineTo(72,84);c.lineTo(67,84);c.closePath();c.fill();
  pr(c,68,80,6,2,'#3a4046');
  // ===== левая рука вниз, кисть на ноутбуке =====
  c.fillStyle='#5f666d';
  c.beginPath();c.moveTo(45,53);c.lineTo(51,54);c.lineTo(47,70);c.lineTo(41,69);c.closePath();c.fill(); // плечо-рукав
  pr(c,49,68,1.5,2,'#565d64');                                   // край рукава
  c.fillStyle='#e0aa7c';
  c.beginPath();c.moveTo(42,69);c.lineTo(47,70);c.lineTo(44,86);c.lineTo(39,85);c.closePath();c.fill(); // предплечье
  pr(c,38,84,9,6,'#e0aa7c');                                      // кисть
  pr(c,38,84,9,2,'#d09a6c');
  // ===== правая рука поднята со стаканом =====
  c.fillStyle='#5f666d';
  c.beginPath();c.moveTo(74,52);c.lineTo(80,53);c.lineTo(85,68);c.lineTo(79,70);c.closePath();c.fill(); // рукав
  c.fillStyle='#e0aa7c';
  c.beginPath();c.moveTo(79,69);c.lineTo(85,67);c.lineTo(87,46);c.lineTo(81,47);c.closePath();c.fill(); // предплечье вверх
  pr(c,81,32,10,7,'#e0aa7c');                                     // кисть
  pr(c,81,32,10,2,'#d09a6c');
  // стакан
  pr(c,80,14,14,19,'#efe8d8');
  pr(c,90,14,4,19,'#e2dbc9');                                    // теневая грань
  pr(c,80,14,14,3,'#8a5a34');                                     // крышка
  pr(c,80,25,14,4,'#b06a3a');                                     // картонная манжета
  pr(c,82,20,2,4,'#d8d1bf');
  // пар
  c.strokeStyle='rgba(255,255,255,0.6)';c.lineWidth=1.4;c.lineCap='round';
  c.beginPath();c.moveTo(84,11);c.quadraticCurveTo(82,7,85,3);c.stroke();
  c.beginPath();c.moveTo(89,12);c.quadraticCurveTo(92,8,90,4);c.stroke();
  c.strokeStyle='rgba(255,255,255,0.35)';
  c.beginPath();c.moveTo(86,9);c.quadraticCurveTo(88,6,86,2);c.stroke();
  // ===== шея и голова =====
  pr(c,57,42,11,8,'#e0aa7c');
  pr(c,57,42,11,2,'rgba(120,70,40,0.35)');                        // тень от челюсти
  // уши
  pr(c,47,30,3,6,'#dfa878');pr(c,74,30,3,6,'#dfa878');
  // лицо
  c.fillStyle='#efbf95';
  c.beginPath();c.ellipse(62,31,13,15,0,0,TAU);c.fill();
  pr(c,55,40,15,4,'#efbf95');                                     // подбородок
  // борода: нижняя часть лица, минус губы
  c.fillStyle='#4a2f1d';
  c.beginPath();
  c.moveTo(49.5,34);c.quadraticCurveTo(50,45,58,49);
  c.quadraticCurveTo(62,50.5,66,49);c.quadraticCurveTo(74,45,74.5,34);
  c.lineTo(71,36);c.lineTo(53,36);c.closePath();c.fill();
  pr(c,57,38,11,2,'#4a2f1d');                                     // усы
  c.strokeStyle='#3a2415';c.lineWidth=0.7;                        // текстура бороды
  c.beginPath();c.moveTo(55,41);c.lineTo(55,46);c.moveTo(59,42);c.lineTo(59,48);
  c.moveTo(63,42);c.lineTo(63,48);c.moveTo(67,41);c.lineTo(67,46);c.stroke();
  pr(c,59,42,7,1.5,'#8a5a3c');                                    // нижняя губа
  // волосы
  c.fillStyle='#4a2f1d';
  c.beginPath();
  c.moveTo(49,28);c.quadraticCurveTo(48,15,62,14);
  c.quadraticCurveTo(76,15,75,28);c.lineTo(75,24);
  c.quadraticCurveTo(72,20,62,20);c.quadraticCurveTo(52,20,49,24);
  c.closePath();c.fill();
  pr(c,49,24,4,8,'#4a2f1d');pr(c,73,24,4,8,'#4a2f1d');          // виски
  c.strokeStyle='#5c3d26';c.lineWidth=0.7;                        // пряди
  c.beginPath();c.moveTo(56,16);c.quadraticCurveTo(58,15,60,16);
  c.moveTo(64,15.5);c.quadraticCurveTo(66,15,68,16.5);c.stroke();
  // брови, глаза
  pr(c,52,24,7,1.8,'#3a2617');pr(c,65,24,7,1.8,'#3a2617');
  pr(c,53,26.5,6,3.5,'#fff');pr(c,66,26.5,6,3.5,'#fff');
  pr(c,55,26.8,2.6,3,'#4a3220');pr(c,68,26.8,2.6,3,'#4a3220');
  pr(c,55.5,27.2,1,1,'#fff');pr(c,68.5,27.2,1,1,'#fff');        // блики
  pr(c,53,26,6,0.8,'#c08c5e');pr(c,66,26,6,0.8,'#c08c5e');      // веки
  // нос
  pr(c,61,29,1.5,5,'#dba26f');
  pr(c,60,34,4,1.2,'#c98f60');
  pr(c,59.5,33.5,1,1,'#b57f52');pr(c,63.5,33.5,1,1,'#b57f52');
  // румянец
  c.fillStyle='rgba(220,140,100,0.28)';
  c.beginPath();c.arc(52,33,2.2,0,TAU);c.fill();
  c.beginPath();c.arc(72.5,33,2.2,0,TAU);c.fill();
  // ===== контровой свет справа =====
  c.strokeStyle='rgba(225,242,255,0.5)';c.lineWidth=1.2;c.lineCap='round';
  c.beginPath();
  c.moveTo(74.5,20);c.quadraticCurveTo(76.5,26,75,32);
  c.moveTo(79.5,54);c.quadraticCurveTo(81.5,60,84.5,66);
  c.moveTo(89,46);c.lineTo(90,36);
  c.stroke();
}
// ---- программист: капюшон, очки в тени, стол с ноутбуком ----
function drawPortraitDev(c){
  pbg(c,[[0,'#c3c0cb'],[1,'#a29fac']]);
  pshadow(c,62,142,34,'rgba(60,55,70,0.4)');
  // стол: столешница и ножки
  pr(c,16,96,92,4,'#c9a878');pr(c,16,100,92,7,'#b08f60');
  pr(c,20,107,6,32,'#4a3b2e');pr(c,98,107,6,32,'#4a3b2e');
  // ноги под столом
  pr(c,42,107,10,26,'#3a2b38');pr(c,72,107,10,26,'#3a2b38');
  pr(c,40,131,13,6,'#241d22');pr(c,71,131,13,6,'#241d22');
  // руки на столе
  pr(c,34,64,9,34,'#4d3b4a');pr(c,30,90,10,8,'#4d3b4a');pr(c,32,94,9,5,'#d9a878');
  pr(c,81,64,9,34,'#4d3b4a');pr(c,84,90,10,8,'#4d3b4a');pr(c,83,94,9,5,'#d9a878');
  // ноутбук: спинка экрана к зрителю + клавиатура
  pr(c,50,60,26,36,'#3a8a84');
  pr(c,52,58,22,3,'#2c6e69');pr(c,50,60,3,36,'#2c6e69');pr(c,73,60,3,36,'#2c6e69');
  pr(c,59,72,8,8,'#8fd8cc');pr(c,61,74,4,4,'#d8f2ea');
  pr(c,48,96,30,3,'#22484a');
  pr(c,44,99,38,5,'#56c0b4');pr(c,46,100,34,2,'#7ad2c6');
  // мышь
  pr(c,88,96,8,6,'#2a2a30');pr(c,89,95,6,2,'#3a3a42');
  // торс в капюшоне
  pr(c,44,52,38,46,'#4d3b4a');
  pr(c,44,52,5,46,'#3a2b38');pr(c,77,52,5,46,'#3a2b38');
  pr(c,61,52,4,46,'#5f4a5c');pr(c,60,52,1,46,'#2e222c');           // молния
  pr(c,68,66,6,7,'#3a2b38');pr(c,69,68,3,2,'#8a7a5a');             // карман с молнией
  pr(c,48,74,4,20,'#5a5a66');                                      // футболка из-под куртки
  // капюшон поверх
  pr(c,44,16,38,14,'#4d3b4a');pr(c,40,24,46,22,'#4d3b4a');
  pr(c,46,12,30,6,'#5f4a5c');pr(c,44,14,4,30,'#5f4a5c');pr(c,78,14,4,30,'#5f4a5c');
  pr(c,44,44,4,8,'#3a2b38');pr(c,78,44,4,8,'#3a2b38');
  // лицо в тени капюшона
  pr(c,52,26,22,20,'#241d22');
  pr(c,54,32,7,5,'#3a2f38');pr(c,65,32,7,5,'#3a2f38');
  pr(c,55,33,5,2,'#e8a05c');pr(c,66,33,5,2,'#e8a05c');             // блик очков
  pr(c,61,34,2,1,'#241d22');pr(c,54,40,18,1,'#1a151c');            // дужка, тень подбородка
  // шнурки капюшона
  pr(c,56,46,2,6,'#8a7a6a');pr(c,68,46,2,6,'#8a7a6a');
}
// ---- дизайнер: оранжевый жакет, белая футболка, рваные джинсы ----
function drawPortraitDsn(c){
  pbg(c,[[0,'#f4f2ee'],[1,'#e4e1da']]);
  pshadow(c,62,142,24,'rgba(120,110,100,0.35)');
  // джинсы
  pr(c,48,86,28,8,'#4a6a9c');
  pr(c,48,92,12,40,'#4a6a9c');pr(c,66,92,12,40,'#50729f');
  pr(c,52,110,3,4,'#e0aa7c');pr(c,69,106,4,3,'#e0aa7c');           // дырки
  pr(c,48,126,12,4,'#8fa8c4');pr(c,66,126,12,4,'#8fa8c4');         // подвёрнутые штанины
  // кроссовки
  pr(c,45,130,16,8,'#e8933c');pr(c,64,130,17,8,'#e8933c');
  pr(c,45,136,16,3,'#f5f0e8');pr(c,64,136,17,3,'#f5f0e8');
  pr(c,47,131,4,3,'#f5f0e8');pr(c,68,131,4,3,'#f5f0e8');
  // футболка с ромбом
  pr(c,54,36,20,54,'#f6f4ef');
  pr(c,58,52,10,10,'#e8933c');pr(c,60,54,6,6,'#f5b45c');pr(c,62,56,2,2,'#fff');
  // жакет: плечи и полы
  pr(c,40,32,46,10,'#e8933c');
  pr(c,40,38,14,56,'#e8933c');pr(c,72,38,14,56,'#e8933c');
  pr(c,40,38,4,56,'#c97f2c');pr(c,82,38,4,56,'#c97f2c');
  pr(c,50,38,4,56,'#c97f2c');pr(c,72,38,4,56,'#d98a30');
  pr(c,40,90,14,4,'#f5b45c');pr(c,72,90,14,4,'#f5b45c');           // низ пола
  pr(c,44,32,10,4,'#f5b45c');pr(c,72,32,10,4,'#f5b45c');           // ворот
  // голова и волосы
  pr(c,58,30,10,4,'#efbf95');                                       // шея
  pr(c,52,12,22,22,'#efbf95');
  pr(c,50,8,26,12,'#3a2e33');pr(c,48,14,4,14,'#3a2e33');pr(c,74,14,4,14,'#3a2e33');
  pr(c,52,20,6,10,'#3a2e33');pr(c,68,20,8,8,'#3a2e33');            // чёлка
  pr(c,46,26,6,36,'#3a2e33');pr(c,74,26,7,34,'#332a2e');           // волосы по бокам
  pr(c,46,58,6,3,'#4a3d42');pr(c,74,56,7,3,'#4a3d42');             // волна на концах
  pr(c,56,22,4,2,'#fff');pr(c,68,22,4,2,'#fff');pr(c,58,22,2,2,'#3a5a7a');pr(c,68,22,2,2,'#3a5a7a');
  pr(c,55,19,6,1,'#2a2024');pr(c,67,19,6,1,'#2a2024');
  pr(c,60,28,7,1,'#c46a5a');                                        // улыбка
  pr(c,53,25,2,2,'rgba(230,150,120,0.5)');pr(c,72,25,2,2,'rgba(230,150,120,0.5)');
  pr(c,50,50,2,3,'#e8b8a0');                                        // серьга
}
// ---- маркетолог: телефон-«лайк» с бабблом, оранжевый верх, юбка в горошек ----
function drawPortraitMkt(c){
  pbg(c,[[0,'#4662c4'],[1,'#3a51ac']]);
  pshadow(c,60,141,20,'rgba(15,20,50,0.45)');
  // ноги и туфли
  pr(c,52,102,9,32,'#efbf95');pr(c,64,102,9,32,'#e8b488');
  pr(c,50,132,12,6,'#2a2026');pr(c,64,132,13,6,'#2a2026');
  pr(c,50,136,12,2,'#171216');pr(c,64,136,13,2,'#171216');
  // юбка в горошек
  pr(c,44,74,38,30,'#3a2a4a');
  for(var sy=0;sy<4;sy++)for(var sx=0;sx<6;sx++)pr(c,46+sx*6+(sy%2?3:0),77+sy*7,2,2,'#cfc6da');
  pr(c,44,100,38,3,'#2e2138');
  // верх — оранжевый кроп
  pr(c,48,50,30,24,'#e8933c');
  pr(c,48,50,4,24,'#c97f2c');pr(c,74,50,4,24,'#c97f2c');
  pr(c,52,50,22,3,'#f5b45c');
  pr(c,48,70,30,4,'#efbf95');                                       // талия
  // левая рука вниз
  pr(c,42,52,7,26,'#e8933c');pr(c,42,74,7,6,'#e8933c');pr(c,42,78,7,6,'#efbf95');
  // правая рука с телефоном вверх
  pr(c,74,52,7,10,'#e8933c');pr(c,76,44,7,10,'#e8933c');pr(c,77,38,7,8,'#e8933c');
  pr(c,77,34,8,6,'#efbf95');
  pr(c,78,24,9,12,'#26160c');pr(c,79,25,7,9,'#4aa8d8');pr(c,80,27,2,2,'#c8e8f8');
  // баббл с сердцем
  pr(c,84,4,34,26,'#26160c');pr(c,85,5,32,24,'#e8933c');
  pr(c,86,42,6,4,'#26160c');pr(c,84,45,5,3,'#26160c');              // хвост к телефону
  pr(c,95,12,6,6,'#f8d8c8');pr(c,105,12,6,6,'#f8d8c8');pr(c,97,17,12,5,'#f8d8c8');pr(c,100,21,6,3,'#f8d8c8');
  // голова и волосы
  pr(c,56,32,12,5,'#efbf95');
  pr(c,52,12,22,24,'#efbf95');
  pr(c,50,8,26,10,'#8a4a28');pr(c,48,12,5,20,'#8a4a28');pr(c,73,12,5,20,'#7a3f20');
  pr(c,46,28,6,52,'#8a4a28');pr(c,74,28,7,50,'#7a3f20');            // волны по бокам
  pr(c,46,58,6,3,'#a05c34');pr(c,74,56,7,3,'#95532e');pr(c,46,72,6,3,'#a05c34');pr(c,74,70,7,3,'#95532e');
  pr(c,52,14,8,8,'#8a4a28');pr(c,66,14,8,6,'#8a4a28');              // чёлка
  pr(c,56,20,4,2,'#fff');pr(c,68,20,4,2,'#fff');pr(c,58,20,2,2,'#2a2018');pr(c,68,20,2,2,'#2a2018');
  pr(c,55,17,6,1,'#5c3018');pr(c,67,17,6,1,'#5c3018');
  pr(c,61,27,5,1,'#c4506a');                                        // губы
  pr(c,53,24,2,2,'rgba(230,150,120,0.5)');pr(c,72,24,2,2,'rgba(230,150,120,0.5)');
}
function portraitCanvas(cls,fn){
  var cv=document.createElement('canvas');cv.width=PW*2;cv.height=PH*2;
  var c=cv.getContext('2d');
  c.scale(2,2);
  fn(c);
  return cv;
}
function renderClassPortraits(){
  var FNS={mgr:drawPortraitMgr,dev:drawPortraitDev,mkt:drawPortraitMkt,dsn:drawPortraitDsn};
  var list=['mgr','dev','mkt','dsn'];
  for(var i=0;i<list.length;i++){
    var cls=list[i];
    if(PORTRAIT_FILES[cls]){PHOTOSRC[cls]=PORTRAIT_FILES[cls];RAILSRC[cls]=PORTRAIT_FILES[cls];continue;}
    var big=portraitCanvas(cls,FNS[cls]);
    PHOTOSRC[cls]=big.toDataURL('image/png');
    var sm=document.createElement('canvas');sm.width=PW/2;sm.height=PH/2; // мини-версия 1:2 без мусора
    var sc=sm.getContext('2d');sc.imageSmoothingEnabled=false;
    sc.drawImage(big,0,0,sm.width,sm.height);
    RAILSRC[cls]=sm.toDataURL('image/png');
  }
  for(var j=0;j<list.length;j++){
    var im=document.getElementById('rp-'+list[j]);
    if(im)im.src=RAILSRC[list[j]];
  }
}
