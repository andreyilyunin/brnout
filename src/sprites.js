'use strict';
// ============================== sprites (GTA2-style layered humanoids) ==============================
// пиксельный рендер моделей: рисуем в мелкий оффскрин, блиним крупными чанками.
// Мир, свет и тексты остаются чёткими — чанки только у персонажей и дедлайнов.
var SPRCV=document.createElement('canvas');SPRCV.width=160;SPRCV.height=160;
var SPRC=SPRCV.getContext('2d');
var SPR_SCALE=0.38; // 1 модельный пиксель ≈ 2.6 мировых: сочные чанки Dave the Diver
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
// пиксельная обёртка для мировых объектов (стопки-дедлайны и т.п.):
// рисуем тело в мелкий буфер и блиним крупными чанками, как персонажей
function pixAt(x,y,px,fn){
  SPRC.setTransform(1,0,0,1,0,0);
  SPRC.clearRect(0,0,160,160);
  SPRC.save();
  SPRC.translate(80,80);
  SPRC.scale(px,px);
  fn(SPRC);
  SPRC.restore();
  ctx.save();
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(SPRCV,Math.round(x-80),Math.round(y-80));
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
  var sexy=o.cls==='dsn';
  var stride=Math.sin(ph)*15*mv;
  var footLx=-4.6*s,footRx=4.6*s;
  var footLy=-9*s-stride,footRy=-9*s+stride;
  var PANTS={dev:'#3d5a80',mgr:'#2f3542',mkt:'#7a6848',dsn:'#241d2e',intern:'#43506b'}[o.cls]||'#43506b';
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
  if(o.cls==='intern'){ // голова-конверт «правки от заказчика» вместо лица (ТЗ мобов)
    drawInternHead(c,o,s);
  }else{
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
  } // конец обычной головы (не-конверт)
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
// ===== оружия классов по ТЗ пиксель-арта: читаемость с верхнего ракурса =====
// Правило 1 (селективный контур): одежда — глухой тёмный контур, оружие — контур цвета
// RGB-подсветки класса, чтобы оно светилось в темноте офиса.
// Правило 2 (параллакс): у каждого оружия своё пятно тени на полу; при замахе (atkT)
// тень отделяется от тени тела, растёт и вытягивается — иллюзия высоты удара.
function drawWeapon(c,o,s){
  var f=o.face||0;
  var fx=Math.cos(f),fy=Math.sin(f),hx,hy;
  if((o.atkT||0)>0){hx=o.x+fx*13*s;hy=o.y+fy*13*s;}                 // атака: оружие перед головой
  else{hx=o.x+(fx*10-fy*7)*s;hy=o.y+(fy*10+fx*7)*s;}                // покой: у правого бедра
  var frenzy=o.casting==='type';
  var swing=(o.atkT||0)>0?(o.atkT/0.2)*1.1:0;
  var cast=o.castT>0;
  var atk=(o.atkT||0)>0;
  var wsum=atk?(o.atkT/0.2):0; // 1=начало замаха … 0=конец (возврат)
  // --- Правило 2: тень оружия на полу, при замахе отделяется и меняет форму ---
  if(o.weapon!=='laptop'){ // ноутбук стажёра лежит у тела — параллакс не нужен
    c.fillStyle='rgba(0,0,0,0.25)';
    c.beginPath();
    c.ellipse(hx+fx*(4+wsum*9)*s,hy+fy*(4+wsum*9)*s+6*s,(6.5+wsum*7.5)*s,4*s,f,0,TAU);
    c.fill();
  }
  if(o.weapon==='keyboard'){
    // механическая клавиатура наперевес (штурмовая винтовка): приклад к плечу, кабель к спине.
    // Ретро-кремовые клавиши; подсветка — тёплый янтарь, не неон
    var bx=o.x-fx*11*s,by=o.y-fy*11*s+3*s; // точка на спине персонажа
    var px2=-fy,py2=fx;                    // перпендикуляр к направлению
    var wob=Math.sin(G.t*5+(o.step||0)*0.3)*5*s;
    c.strokeStyle='rgba(120,88,58,0.9)';c.lineWidth=2.2*s;c.lineCap='round'; // витой кабель питания
    c.beginPath();c.moveTo(hx-fx*9*s,hy-fy*9*s);
    c.quadraticCurveTo((hx+bx)/2+px2*wob,(hy+by)/2+py2*wob,bx,by);c.stroke();
    if(atk){ // Кадр 1: янтарный bloom под клавиатурой на замахе
      c.save();c.globalCompositeOperation='lighter';
      c.globalAlpha=0.3+0.15*Math.sin(G.t*30);
      c.fillStyle='rgba(255,170,80,0.5)';c.beginPath();c.arc(hx,hy,15*s,0,TAU);c.fill();
      c.restore();c.globalAlpha=1;
    }
    c.save();c.translate(hx,hy);c.rotate(f+Math.PI/2+(swing?Math.sin(swing*3)*0.5:0));
    if(frenzy)c.rotate(Math.sin(G.t*44)*0.13);
    c.translate(0,-4*s);
    c.rotate(-0.45+swing+(cast?-0.9:0));
    // приклад к плечу
    c.fillStyle='#22262e';rr(c,-4*s,7*s,8*s,9*s,2*s);c.fill();
    // корпус
    c.fillStyle='#2b3038';rr(c,-17*s,-8*s,34*s,15*s,2*s);c.fill();
    // клавиши: кремовый ретро; при замахе ряд вспыхивает янтарём
    var rows=atk?['#d8d2c0','#f2c17e','#c2bba6']:['#d8d2c0','#cfc8b4','#c2bba6'];
    for(var ry=0;ry<3;ry++){
      c.fillStyle=rows[ry];
      for(var kx=-15*s;kx<=12*s;kx+=4.4*s)c.fillRect(kx,(-6+ry*4.6)*s,3.2*s,2.8*s);
    }
    // селективный контур: кремовый край, на замахе — янтарный
    c.strokeStyle=atk?'rgba(242,193,126,0.9)':'rgba(226,218,198,0.7)';
    c.lineWidth=1.6;rr(c,-17*s,-8*s,34*s,15*s,2*s);c.stroke();
    if(atk&&o.atkT<0.06){ // Кадр 4: белая вспышка по контуру на возврате
      c.strokeStyle='rgba(255,252,244,'+(0.6+0.4*Math.sin(G.t*60)).toFixed(3)+')';
      c.lineWidth=2.2;rr(c,-17*s,-8*s,34*s,15*s,2*s);c.stroke();
    }
    c.restore();
  }else if(o.weapon==='tickets'){
    // ноутбук-дубина: раскрытый, читаемый сверху «Г»-силуэт — широкая клавиатурная
    // половина + экранная крышка под ясным углом на латунной петле.
    // На экране кровавый график дедлайнов; на замахе крышка распахивается и слепит
    c.save();c.translate(hx,hy-(atk?wsum*6*s:0)); // замах: ноут поднят
    c.rotate(f+Math.PI/2+(swing?Math.sin(swing*3)*0.5:0)+(swing?swing*0.35:0));
    // === экранная крышка ===
    c.save();
    c.translate(0,-5*s);
    c.rotate(-0.62-(atk?wsum*0.5:0)); // при замахе распахивается шире
    c.fillStyle='#1c1214';rr(c,-13*s,-19*s,26*s,19*s,2*s);c.fill();
    c.fillStyle='#2a1518';rr(c,-10.5*s,-16.5*s,21*s,14*s,1.5*s);c.fill(); // экран
    c.strokeStyle='#B3232B';c.lineWidth=1.6; // кровавый график дедлайнов
    c.beginPath();
    for(var gp=0;gp<5;gp++){
      var gx=-8*s+gp*4*s,gy=-13*s+gp*2.4*s+Math.sin(G.t*7-gp)*1.2*s;
      if(gp===0)c.moveTo(gx,gy);else c.lineTo(gx,gy);
    }
    c.stroke();
    if(atk&&wsum>0.5){c.fillStyle='rgba(255,252,244,0.85)';rr(c,-10.5*s,-16.5*s,21*s,14*s,1.5*s);c.fill();}
    c.strokeStyle='rgba(163,38,38,0.9)';c.lineWidth=2;rr(c,-13*s,-19*s,26*s,19*s,2*s);c.stroke();
    c.restore();
    // === клавиатурная половина (в руке) ===
    c.fillStyle='#2b3038';rr(c,-14*s,-8*s,28*s,17*s,2*s);c.fill();
    var mrows=['#d8d2c0','#cfc8b4','#c2bba6'];
    for(var mr=0;mr<3;mr++){
      c.fillStyle=mrows[mr];
      for(var mk=-12*s;mk<=9*s;mk+=4.2*s)c.fillRect(mk,(-5.5+mr*4.6)*s,3.2*s,3*s);
    }
    c.fillStyle='#241d16';rr(c,-5*s,5*s,10*s,3.5*s,1*s);c.fill(); // тачпад
    // латунная петля между половинами — читаемый «hinge»
    c.fillStyle='#C4A24E';c.fillRect(-13*s,-8.8*s,26*s,1.8*s);
    c.strokeStyle=atk?'rgba(242,193,126,0.9)':'rgba(226,218,198,0.7)';
    c.lineWidth=1.6;rr(c,-14*s,-8*s,28*s,17*s,2*s);c.stroke();
    c.restore();
  }else if(o.weapon==='plane'){
    // селфи-палка-арбалет: смартфон на телескопической палке вперёд, экран к врагам —
    // мигает уведомлениями, «стреляет» лайками (снаряды — соц-медиа, спам-конус)
    var ext3=atk?6*s*wsum:-2*s*(0.5+0.5*Math.sin(G.t*1.8)); // телескоп выдвигается на замахе
    c.save();c.translate(hx,hy);c.rotate(f+Math.PI/2+(swing?Math.sin(swing*3)*0.35:0));
    // рукоять у бедра
    c.fillStyle='#33270f';rr(c,-2.5*s,6*s,5*s,9*s,2*s);c.fill();
    // телескопическая палка
    c.strokeStyle='#8a8074';c.lineWidth=2.4*s;c.lineCap='round';
    c.beginPath();c.moveTo(0,6*s);c.lineTo(0,-(8*s+ext3));c.stroke();
    c.strokeStyle='#5a544c';c.lineWidth=1.2*s;
    c.beginPath();c.moveTo(0,2*s);c.lineTo(0,-(2*s+ext3));c.stroke();
    // смартфон
    c.translate(0,-(12*s+ext3));
    c.rotate(Math.sin(G.t*1.6)*0.08);
    c.fillStyle='#1c1610';rr(c,-6*s,-9*s,12*s,18*s,2*s);c.fill();
    c.strokeStyle='rgba(196,162,78,0.9)';c.lineWidth=1.6;rr(c,-6*s,-9*s,12*s,18*s,2*s);c.stroke(); // селективный контур
    c.fillStyle='#241c10';rr(c,-4.6*s,-7.2*s,9.2*s,13*s,1*s);c.fill(); // экран
    if(((G.t*3)|0)%2===0){c.fillStyle='#e8c56a';c.fillRect(-3*s,-5*s,6*s,4*s);} // всплывающий баннер
    c.fillStyle='#c4574e';c.beginPath();c.arc(3.4*s,-5.4*s,1.4*s,0,TAU);c.fill(); // точка уведомлений
    // лайки-пиксели всплывают над экраном
    for(var ht=0;ht<2;ht++){
      var ph5=(G.t*0.9+ht*0.5)%1;
      c.fillStyle='rgba(200,87,78,'+(0.8*(1-ph5)).toFixed(2)+')';
      c.fillRect(Math.sin(G.t*2.4+ht*2)*4*s-1.2*s,-11*s-ph5*8*s,2.4,2.4);
    }
    if(atk){ // Кадр 1: кольца уведомлений, экран слепит
      for(var rg=0;rg<2;rg++){
        var pr3=(G.t*6+rg*0.5)%1;
        c.strokeStyle='rgba(232,197,106,'+(0.6*(1-pr3)).toFixed(3)+')';c.lineWidth=1.4;
        c.beginPath();c.arc(0,-4*s,(4+pr3*11)*s,0,TAU);c.stroke();
      }
      if(wsum>0.55){c.fillStyle='rgba(255,252,244,0.75)';rr(c,-4.6*s,-7.2*s,9.2*s,13*s,1*s);c.fill();}
    }
    c.restore();
  }else if(o.weapon==='stylus'){
    // малярная кисть «перекрас»: древко, латунная обойма, широкий ворс с краской.
    // Широкий ворс отлично читается сверху; краска на кончике циклично перемешивается.
    // Кадры ТЗ: замах — ворс вспыхивает и капает; удар — выпад с выдвижением;
    // импакт — брызги CMYK + клякса на полу; возврат — капли краски
    var ext=atk?7*s*wsum:0;
    c.save();c.translate(hx,hy);c.rotate(f+Math.PI/2+(swing?Math.sin(swing*3)*0.6:0));
    // древко
    c.fillStyle='#5a4028';rr(c,-1.6*s,4*s,3.2*s,12*s,1.5*s);c.fill();
    c.strokeStyle='rgba(196,162,78,0.8)';c.lineWidth=1;rr(c,-1.6*s,4*s,3.2*s,12*s,1.5*s);c.stroke();
    // латунная обойма
    c.fillStyle='#C4A24E';rr(c,-2.6*s,0,5.2*s,5*s,1*s);c.fill();
    c.fillStyle='#8a6a2e';c.fillRect(-2.6*s,3.4*s,5.2*s,1.6*s);
    // ворс: широкий блок, кончик прокрашен
    var brY=-(8*s+ext);
    c.fillStyle='#d8cba8';
    rr(c,-5*s,brY-8*s,10*s,9*s,2*s);c.fill();
    c.strokeStyle='rgba(40,28,16,0.45)';c.lineWidth=0.8;
    for(var hb=-3;hb<=3;hb+=1.6){ // волоски ворса
      c.beginPath();c.moveTo(hb*s,brY+1*s);c.lineTo(hb*s*1.25,brY-7*s);c.stroke();
    }
    var paintCol=['#b85f7a','#5fa8b8','#c4a94e'][((G.t*0.8)|0)%3]; // краска перемешивается
    c.fillStyle=paintCol;
    rr(c,-5.4*s,brY-8.5*s,10.8*s,3.4*s,1.5*s);c.fill();
    if(atk&&wsum>0.5){ // Кадр 1: вспышка краски на замахе
      c.save();c.globalCompositeOperation='lighter';c.globalAlpha=0.35;
      c.fillStyle=paintCol;c.beginPath();c.arc(0,brY-6*s,8*s,0,TAU);c.fill();c.restore();
    }
    // капли краски с ворса (Кадр 4 — возврат тоже капает)
    for(var pd=0;pd<2;pd++){
      var ph4=(G.t*1.6+pd*0.5)%1;
      c.fillStyle=paintCol;c.globalAlpha=0.8*(1-ph4);
      c.fillRect(Math.sin(G.t*2+pd*2)*3*s-1*s,brY-9*s-ph4*8*s,2,2);
      c.globalAlpha=1;
    }
    c.restore();
  }else if(o.weapon==='laptop'){
    c.fillStyle='#33383f';rr(c,-8*s,-7*s,16*s,12*s,1.5*s);c.fill();
    c.fillStyle='rgba(150,190,220,0.5)';c.fillRect(-6*s,-5*s,12*s,8*s);
    c.fillStyle='#22262c';c.fillRect(-2*s,5*s,4*s,2*s);
  }else if(o.weapon==='stamp'){
    c.fillStyle='#3a4049';c.fillRect(-3*s,-26*s,6*s,20*s);
    c.fillStyle='#c23b32';rr(c,-9*s,-10*s,18*s,10*s,2*s);c.fill();
    c.fillStyle='#e8e2d0';c.fillRect(-6*s,-8*s,12*s,3*s);
  }
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
// голова-конверт: глитчащее письмо «правки от заказчика» — пыльный пергамент с сургучом
function drawInternHead(c,o,s){
  var gj=(((G.t*26+(o.step||0)*9)|0)%9===0)?(R()*2-1)*1.6:0; // дёрганье-глитч
  c.save();c.translate(gj,0);
  c.fillStyle='#c7b08a';rr(c,-7.2*s,-11*s,14.4*s,11.5*s,1.5*s);c.fill();
  c.strokeStyle='rgba(40,28,16,0.55)';c.lineWidth=1;rr(c,-7.2*s,-11*s,14.4*s,11.5*s,1.5*s);c.stroke();
  c.strokeStyle='rgba(240,232,214,0.9)';c.lineWidth=1.2;
  c.beginPath();c.moveTo(-6.2*s,-10*s);c.lineTo(0,-4.6*s);c.lineTo(6.2*s,-10*s);c.stroke(); // клапан
  c.fillStyle='#8a1f1f'; // сургучная печать
  c.beginPath();c.arc(0,-8.2*s,1.7*s,0,TAU);c.fill();
  if(Math.sin(G.t*9+(o.step||0)*3)>0){ // мигающее «!»-требование
    c.fillStyle='#A32626';c.font='bold '+Math.round(9*s)+'px "IBM Plex Mono",Arial,monospace';c.textAlign='center';
    c.fillText('!',0,-1.4*s);c.textAlign='left';
  }
  if(o.elite){ // у корпоративного зомби глаза горят мертвенно-белым
    c.save();c.globalCompositeOperation='lighter';
    c.fillStyle='rgba(235,255,255,0.95)';
    c.beginPath();c.arc(-3*s,-7.2*s,1.3*s,0,TAU);c.arc(3*s,-7.2*s,1.3*s,0,TAU);c.fill();
    c.restore();
  }
  c.restore();
}
function drawIntern(m,remote){
  var L=HOODIES[(m.tint||0)%HOODIES.length];
  var wob=Math.sin(G.t*2.4+(m.tilt||0))*0.12;
  var elite=m.elite;
  // шлейф размытия: рывковое движение оставляет призраков (ТЗ «хаотичные рывки»)
  if(!m._tr)m._tr=[];
  m._tr.unshift({x:m.x,y:m.y});
  if(m._tr.length>7)m._tr.pop();
  for(var ti=2;ti<7;ti+=2){
    var tp2=m._tr[ti];if(!tp2)break;
    ctx.globalAlpha=Math.max(0.03,0.15-ti*0.018);
    ctx.fillStyle=elite?'#1c2026':'#2a3038';
    ctx.beginPath();ctx.ellipse(tp2.x,tp2.y,8,12,0,0,TAU);ctx.fill();
  }
  ctx.globalAlpha=1;
  if(elite){ // корпоративный зомби: тащит CRT-монитор на кабеле, руки-кабели (ТЗ мобов №2)
    var zf=m.face||0;
    var tx2=m.x-Math.cos(zf)*30,ty2=m.y-Math.sin(zf)*30+8;
    if(!m._crt)m._crt={x:tx2,y:ty2};
    m._crt.x+=(tx2-m._crt.x)*0.1;m._crt.y+=(ty2-m._crt.y)*0.1;
    ctx.strokeStyle='rgba(60,64,70,0.9)';ctx.lineWidth=2; // кабель на шее
    ctx.beginPath();ctx.moveTo(m.x,m.y-6);
    ctx.quadraticCurveTo((m.x+m._crt.x)/2,(m.y+m._crt.y)/2-8,m._crt.x,m._crt.y-4);
    ctx.stroke();
    ctx.fillStyle='#23262e';rr(ctx,m._crt.x-13,m._crt.y-13,26,22,3);ctx.fill(); // CRT
    ctx.fillStyle='#0a1a10';ctx.fillRect(m._crt.x-9,m._crt.y-9,18,13);
    ctx.strokeStyle='rgba(0,240,120,'+(0.3+0.15*Math.sin(G.t*7)).toFixed(3)+')';ctx.lineWidth=1;
    for(var cl=0;cl<3;cl++){ // бегущие строки развёртки
      var sly=m._crt.y-9+((G.t*22+cl*5)%13);
      ctx.beginPath();ctx.moveTo(m._crt.x-8,sly);ctx.lineTo(m._crt.x+8,sly);ctx.stroke();
    }
    ctx.strokeStyle='rgba(35,38,46,0.95)';ctx.lineWidth=2.4; // руки превратились в кабели
    for(var ca=0;ca<2;ca++){
      var aa2=zf+(ca?0.6:-0.6);
      ctx.beginPath();ctx.moveTo(m.x+Math.cos(aa2+Math.PI)*4,m.y);
      ctx.quadraticCurveTo(m.x+Math.cos(aa2)*13,m.y+Math.sin(aa2)*13,
        m.x+Math.cos(aa2)*21+Math.sin(G.t*6+ca)*2,m.y+Math.sin(aa2)*21+4);
      ctx.stroke();
    }
    if(m.wu>0){ // атака: волна зелёных помех по полу перед монитором
      ctx.strokeStyle='rgba(0,240,120,'+(0.55*(m.wu/0.5)).toFixed(2)+')';ctx.lineWidth=1.5;
      for(var gw3=0;gw3<3;gw3++){
        var yy=m.y-4+gw3*6;
        ctx.beginPath();ctx.moveTo(m.x-24+R()*5,yy);ctx.lineTo(m.x+24,yy+R()*3-1.5);ctx.stroke();
      }
    }
  }
  drawHumanoid(ctx,{x:m.x,y:m.y,face:(m.face||0)+wob,step:remote?G.t*2.6:(m.step||m.tilt||0),look:L,cls:'intern',scale:elite?1.55:1.15,moving:true,
    weapon:'laptop',casting:(m.cf>0)?'type':null,elite:elite});
  if(m.wu>0){ // замах слова: маркер над головой раздувается — кровавое требование
    var wprog=1-m.wu/0.5;
    ctx.font='bold '+Math.round(10+8*wprog)+'px "IBM Plex Mono",Arial,monospace';
    ctx.globalAlpha=0.92;
    if(wprog<0.6){ctx.fillStyle='#8b949e';}
    else{
      ctx.fillStyle='rgba(163,38,38,0.22)';
      ctx.fillRect(m.x-13,m.y-42-4*Math.sin(wprog*Math.PI),26,13);
      ctx.fillStyle='#A32626';
    }
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
  // дедлайн = горящая стопка согласований: веер документов, сургуч «СРОЧНО»,
  // тикающий стикер, угли и дымок. Как и персонажи — рисуется пиксельными чанками
  var t=G.t+(m.tilt||0);
  var hpF=remote?(m.hpF===undefined?1:m.hpF):(m.hp/m.hpMax);
  var inst=hpF<0.55?2:1; // чем ближе срыв — тем сильнее трясёт стопку
  ctx.fillStyle='rgba(0,0,0,0.35)';
  ctx.beginPath();ctx.ellipse(m.x+2.6,m.y+6.5,14,9,0,0,TAU);ctx.fill(); // тень в мире
  pixAt(m.x,m.y,0.62,function(c){
    c.rotate(Math.sin(t*9)*0.06*inst);
    // веер из трёх листов
    var paper=['#c9ba98','#d8cba8','#e8dcc2'];
    for(var k=2;k>=0;k--){
      c.save();c.rotate((k-1)*0.2);
      var w2=17-k*2,h2=21-k*2;
      c.fillStyle=paper[k];
      c.fillRect(-w2/2,-h2/2-2,w2,h2);
      c.strokeStyle='rgba(40,28,16,0.5)';c.lineWidth=1;
      c.strokeRect(-w2/2,-h2/2-2,w2,h2);
      c.strokeStyle='rgba(40,28,16,0.35)'; // строчки согласований
      c.beginPath();
      for(var ln=1;ln<5;ln++){c.moveTo(-w2/2+3,-h2/2-2+ln*3.8);c.lineTo(w2/2-3,-h2/2-2+ln*3.8);}
      c.stroke();
      c.restore();
    }
    // сургучная печать «СРОЧНО»
    c.fillStyle='#8a1f1f';
    c.beginPath();c.arc(0,-2,4.2,0,TAU);c.fill();
    c.fillStyle='#a32626';
    c.beginPath();c.arc(-1,-3,2.6,0,TAU);c.fill();
    // стикер с обратным отсчётом: тикает
    c.save();c.rotate(0.12);
    c.fillStyle='#e8c56a';c.fillRect(4,-12,9,7);
    c.strokeStyle='rgba(40,28,16,0.6)';c.lineWidth=0.8;c.strokeRect(4,-12,9,7);
    c.fillStyle=(Math.sin(t*10)>0)?'#A32626':'#5a1a1a';
    c.font='bold 7px "IBM Plex Mono",Arial,monospace';c.textAlign='center';
    c.fillText('!!',8.5,-6.5);c.textAlign='left';
    c.restore();
    // угли поверх стопки
    for(var i=0;i<4;i++){
      var fx2=-7+i*4.6;
      var hh=4+Math.sin(t*11+i*1.7)*3;
      c.fillStyle='rgba(255,120,40,0.85)';
      c.fillRect(fx2-1.5,-13-hh,3,2.5);
      c.fillStyle='rgba(255,200,110,0.8)';
      c.fillRect(fx2-0.5,-14.5-hh,1.5,2);
    }
    // дымок
    for(var sm=0;sm<2;sm++){
      var ph=(t*0.5+sm*0.5)%1;
      c.fillStyle='rgba(120,110,100,'+(0.35*(1-ph)).toFixed(2)+')';
      c.fillRect(-2+sm*4+Math.sin(t*2+sm)*2,-15-ph*10,2,2);
    }
  });
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


// ===== портреты в стиле Dave the Diver: детальный рендер в буфер,
// апскейл без сглаживания => честные крупные пиксели с плавными тональными переходами.
// Персонаж показан с оружием класса — читаемость образа из карточки меню =====
function renderClassPreviews(){
  var ids=[['mdl-mgr','mgr'],['mdl-dev','dev'],['mdl-mkt','mkt'],['mdl-dsn','dsn']];
  for(var i=0;i<ids.length;i++){
    var el=document.getElementById(ids[i][0]);
    if(!el)continue;
    var cls=ids[i][1];
    var c=el.getContext('2d');
    var W=el.width,H=el.height;
    c.setTransform(1,0,0,1,0,0);
    c.clearRect(0,0,W,H);
    // подножие: тёмный пьедестал с тёплым ободком (герой на витрине подземелья)
    c.fillStyle='rgba(14,10,8,0.55)';
    c.beginPath();c.ellipse(W/2,H-16,54,12,0,0,TAU);c.fill();
    c.strokeStyle='rgba(196,162,78,0.35)';c.lineWidth=2;
    c.beginPath();c.ellipse(W/2,H-16,54,12,0,0,TAU);c.stroke();
    // модель как в игре, головой вверх, с оружием — в общий спрайт-буфер
    SPRC.setTransform(1,0,0,1,0,0);
    SPRC.clearRect(0,0,160,160);
    SPRC.save();
    SPRC.translate(80,80);
    SPRC.scale(SPR_SCALE*6.84,SPR_SCALE*6.84); // множитель скомпенсирован под SPR_SCALE=0.38: размер тот же, чанки крупнее
    drawHumanoidBody(SPRC,{x:0,y:0,cls:cls,look:classLook(cls,0),face:Math.PI/2,step:0,scale:1,moving:false,haste:0,castT:0,casting:null,
      weapon:CLS[cls]?CLS[cls].weapon:null,atkT:0.06}); // лёгкий хват: оружие подано вперёд
    SPRC.restore();
    // блит 1:1 по центру карточки (пиксели остаются чёткими)
    c.imageSmoothingEnabled=false;
    c.drawImage(SPRCV,(W-160)/2,(H-160)/2);
  }
}
