'use strict';
// ============================== inferno fx: палитра офиса-подземелья и glow-примитивы ==============================
// Курс: GTA2-вид × Dave the Diver пискель-арт × Diablo-атмосфера.
// Неон и киберпанк убраны: свет — факельный янтарь, кровь, ведьмин огонь, кость/пергамент.
// Все спрайты пре-рендерятся один раз — в кадре только drawImage (прецедент: holeCv в render.js)
var NEON={ // имя оставлено для совместимости вызовов; значения — палитра инферно
  bg:'#0E0A08',bg2:'#241B14',             // тёплая чернильная тьма / тёмное дерево
  torch:'#FF9A3D',ember:'#C4622A',        // факел / тлеющие угли
  blood:'#A32626',witch:'#7FB069',        // кровь / ведьмин огонь
  bone:'#D8CFC0',brass:'#C4A24E',         // кость-пергамент / латунь
  spectral:'#BFE3D4',                     // призрачное сияние (копьё дизайнера)
  gold:'#D8A94E',
  // совместимость старых слотов мира (значения перекрашены, оружие с 2026-10 использует литералы):
  yellow:'#D8A94E',cyan:'#FFB25E',fuchsia:'#7FB069',red:'#A32626',purple:'#8A7BA8',green:'#6FAE4E',
  err:'#A32626'
};
var NEON_RGB={};
function hexRGB(h){
  if(NEON_RGB[h])return NEON_RGB[h];
  var v=parseInt(h.slice(1),16);
  var a=[(v>>16)&255,(v>>8)&255,v&255];
  NEON_RGB[h]=a;return a;
}
var GLOW_CACHE={};
// радиальный ореол света (факел/уголь/кровь): рисуется через globalCompositeOperation='lighter'
function glowSprite(col){
  var g=GLOW_CACHE[col];
  if(g)return g;
  g=document.createElement('canvas');g.width=96;g.height=96;
  var c=g.getContext('2d'),r=hexRGB(col);
  var gr=c.createRadialGradient(48,48,0,48,48,48);
  gr.addColorStop(0,'rgba('+r[0]+','+r[1]+','+r[2]+',0.85)');
  gr.addColorStop(0.35,'rgba('+r[0]+','+r[1]+','+r[2]+',0.28)');
  gr.addColorStop(1,'rgba('+r[0]+','+r[1]+','+r[2]+',0)');
  c.fillStyle=gr;c.beginPath();c.arc(48,48,48,0,TAU);c.fill();
  GLOW_CACHE[col]=g;return g;
}
// грозовая ночь за панорамными окнами (быв. неон-мегаполис): тучи, луна, чёрный skyline,
// редкие тёплые окна. Дождь и молнии — динамикой в render.drawNeonDecor.
var CITY_CV=null;
function cityStrip(){
  if(CITY_CV)return CITY_CV;
  var W2=640,H2=240;
  CITY_CV=document.createElement('canvas');CITY_CV.width=W2;CITY_CV.height=H2;
  var c=CITY_CV.getContext('2d');
  var r2=function(){return Math.random();};
  var sky=c.createLinearGradient(0,0,0,H2);
  sky.addColorStop(0,'#0b0c11');sky.addColorStop(0.65,'#14161d');sky.addColorStop(1,'#1c1a20');
  c.fillStyle=sky;c.fillRect(0,0,W2,H2);
  // клочья туч
  for(var cl=0;cl<26;cl++){
    var cx2=r2()*W2,cy2=r2()*H2*0.5,cw2=50+r2()*90,ch2=14+r2()*26;
    c.fillStyle='rgba('+(20+r2()*10|0)+','+(19+r2()*9|0)+','+(24+r2()*10|0)+',0.5)';
    c.beginPath();c.ellipse(cx2,cy2,cw2,ch2,0,0,TAU);c.fill();
  }
  // мертвая луна
  c.fillStyle='rgba(216,207,192,0.85)';
  c.beginPath();c.arc(500,52,17,0,TAU);c.fill();
  c.fillStyle='rgba(160,152,140,0.5)';
  c.beginPath();c.arc(495,48,4,0,TAU);c.arc(505,58,3,0,TAU);c.fill();
  // дальний skyline: чёрные зубья
  c.fillStyle='#0a0a0e';
  for(var x2=0;x2<W2;){
    var bw=16+((r2()*26)|0),bh=40+((r2()*80)|0);
    c.fillRect(x2,H2-bh,bw,bh);
    x2+=bw+2+((r2()*6)|0);
  }
  // ближние башни: чуть светлее, редкие тёплые окна (город вымер, кто-то ещё работает)
  for(x2=-10;x2<W2+10;){
    var bw2=24+((r2()*34)|0),bh2=80+((r2()*110)|0),bx2=x2,by2=H2-bh2;
    c.fillStyle='#111016';
    c.fillRect(bx2,by2,bw2,bh2);
    c.fillStyle='#18161d';
    c.fillRect(bx2,by2,bw2,4);
    for(var wy=by2+8;wy<H2-8;wy+=8){
      for(var wx=bx2+4;wx<bx2+bw2-4;wx+=7){
        if(r2()<0.1){ // почти все ушли домой
          c.fillStyle=r2()<0.8?'rgba(255,178,94,0.8)':'rgba(143,179,124,0.7)';
          c.fillRect(wx,wy,2,3);
        }
      }
    }
    x2+=bw2+4+((r2()*8)|0);
  }
  // мгла у горизонта
  var haze=c.createLinearGradient(0,H2-50,0,H2);
  haze.addColorStop(0,'rgba(28,26,32,0)');haze.addColorStop(1,'rgba(28,26,32,0.6)');
  c.fillStyle=haze;c.fillRect(0,H2-50,W2,50);
  return CITY_CV;
}
