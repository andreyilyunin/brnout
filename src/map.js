'use strict';
// ============================== procedural office map ==============================
// Tile dungeon: rooms + corridors, seeded => identical on all peers. Among Us / Diablo vibe.
var TILE=56,GW=44,GH=44;
var MAP_W=GW*TILE,MAP_H=GH*TILE;
var MAPSEED=1;
var grid=null;      // 1 = floor
var ROOMS=[];       // {x,y,w,h,type} px
var WALLS=[];       // merged wall rects (collide + minimap)
var FURN=[];        // furniture rects (collide)
var OBST=[];        // WALLS + FURN
var LIGHTS=[],COFFEES=[],SPAWNS=[],RUGS=[],DOORS=[],DOORT=[]; // RUGS — ковры (визуал), DOORS — зоны дверей без мебели, DOORT — тайлы дверей между залами
var floorCv=null,mmCv=null;

function buildMap(seed){
  MAPSEED=seed>>>0;if(!MAPSEED)MAPSEED=1;
  _seed=MAPSEED;
  MAPTHEME=THEMES[(rnd()*THEMES.length)|0]; // тема детерминирована сидом
  grid=[];ROOMS=[];WALLS=[];FURN=[];OBST=[];LIGHTS=[];COFFEES=[];SPAWNS=[];RUGS=[];DOORS=[];DOORT=[];
  var i,j,x,y;
  for(j=0;j<GH;j++){grid[j]=[];for(i=0;i<GW;i++)grid[j][i]=0;}
  // залы: зазор 1 тайл = линия стены между залами; связь — только двери, коридоров нет
  var halls=[],nH=6+((rnd()*2)|0),k,t,oo;
  function sharedSeg(a,b){
    var seg=null;
    if(a.x+a.w+1===b.x||b.x+b.w+1===a.x){
      var s=Math.max(a.y,b.y),e=Math.min(a.y+a.h,b.y+b.h);
      if(e-s>=5)seg={v:1,s:s,e:e,gx:(a.x+a.w+1===b.x)?a.x+a.w:b.x+b.w};
    }
    if(!seg&&(a.y+a.h+1===b.y||b.y+b.h+1===a.y)){
      var s2=Math.max(a.x,b.x),e2=Math.min(a.x+a.w,b.x+b.w);
      if(e2-s2>=5)seg={v:0,s:s2,e:e2,gy:(a.y+a.h+1===b.y)?a.y+a.h:b.y+b.h};
    }
    return seg;
  }
  function clearOf(c){
    for(var q=0;q<halls.length;q++){var H=halls[q];
      if(c.x-1<H.x+H.w&&c.x+c.w+1>H.x&&c.y-1<H.y+H.h&&c.y+c.h+1>H.y)return false;}
    return true;
  }
  function attachHall(PB){
    // пристройка к PB: стык ≥5 тайлов гарантирован диапазонами; несколько попыток размеров/позиций
    for(var att=0;att<8;att++){
      var fw=11+((rnd()*3)|0),fh=9+((rnd()*2)|0);
      for(var sd=(rnd()*4)|0,rot=0;rot<4;rot++,sd=(sd+1)&3){
        var lo,hi,fx2,fy2;
        if(sd<2){
          fy2=sd===0?PB.y+PB.h+1:PB.y-fh-1;
          if(fy2<2||fy2+fh>GH-2)continue;
          lo=Math.max(2,PB.x-fw+5);hi=Math.min(GW-fw-2,PB.x+PB.w-5);
          if(lo>hi)continue;
          for(var tr2=0;tr2<4;tr2++){
            fx2=lo+((rnd()*(hi-lo+1))|0);
            var Ca={x:fx2,y:fy2,w:fw,h:fh};
            if(clearOf(Ca)&&sharedSeg(Ca,PB))return Ca;
          }
        }else{
          fx2=sd===2?PB.x+PB.w+1:PB.x-fw-1;
          if(fx2<2||fx2+fw>GW-2)continue;
          lo=Math.max(2,PB.y-fh+5);hi=Math.min(GH-fh-2,PB.y+PB.h-5);
          if(lo>hi)continue;
          for(var tr3=0;tr3<4;tr3++){
            fy2=lo+((rnd()*(hi-lo+1))|0);
            var Cb={x:fx2,y:fy2,w:fw,h:fh};
            if(clearOf(Cb)&&sharedSeg(Cb,PB))return Cb;
          }
        }
      }
    }
    return null;
  }
  for(k=0;k<nH;k++){
    var cand2=null;
    for(t=0;t<240&&!cand2;t++){
      var hw=11+((rnd()*4)|0),hh2=9+((rnd()*3)|0);
      var hx=2+((rnd()*(GW-hw-4))|0),hy=2+((rnd()*(GH-hh2-4))|0);
      var C={x:hx,y:hy,w:hw,h:hh2};
      if(!clearOf(C))continue;
      if(k===0){cand2=C;break;}
      for(var q2=0;q2<halls.length&&!cand2;q2++)
        if(sharedSeg(C,halls[q2]))cand2=C;
    }
    if(!cand2){ // пристройка вплотную к случайному залу — стык гарантирован
      var order=[];
      for(q2=0;q2<halls.length;q2++)order.push(q2);
      for(q2=order.length-1;q2>0;q2--){var jx=(rnd()*(q2+1))|0;var tmp=order[q2];order[q2]=order[jx];order[jx]=tmp;}
      for(var oi=0;oi<order.length&&!cand2;oi++)cand2=attachHall(halls[order[oi]]);
    }
    if(!cand2)break; // карта плотная — меньше залов, но каждый со стыком под дверь
    halls.push(cand2);
  }
  halls[0].lobby=1;
  for(k=0;k<halls.length;k++){var H2=halls[k];
    for(j=H2.y;j<H2.y+H2.h;j++)for(i=H2.x;i<H2.x+H2.w;i++)grid[j][i]=1;
    ROOMS.push({x:H2.x*TILE,y:H2.y*TILE,w:H2.w*TILE,h:H2.h*TILE,tx:H2.x,ty:H2.y,tw:H2.w,th:H2.h,type:H2.lobby?'lobby':'openspace',hall:k});
  }
  var arenaR=null;
  for(k=0;k<ROOMS.length;k++)
    if(ROOMS[k].type==='openspace'&&(!arenaR||ROOMS[k].w*ROOMS[k].h>arenaR.w*arenaR.h))arenaR=ROOMS[k];
  arenaR.arena=1;halls[arenaR.hall].arena=1;
  // --- стеклянные боксы ВНУТРИ опенспейса: кухня и санузел — часть зала, а не связка ---
  var BOXES=[];
  function boxOK(bx,by,bw,bh){
    if(bx<3||by<3||bx+bw>GW-3||by+bh>GH-3)return false;
    var host=false,q;
    for(q=0;q<halls.length;q++){var Hq=halls[q];
      if(Hq.lobby)continue; // ресепшн чистый; большие опенспейсы (вкл. арену) принимают боксы
      // кольцо стен бокса + 2 тайла прохода с каждой стороны: никаких узких коридоров вокруг бокса
      if(bx-3>=Hq.x&&by-3>=Hq.y&&bx+bw+2<=Hq.x+Hq.w&&by+bh+2<=Hq.y+Hq.h)host=true;}
    if(!host)return false;
    var R2={x:bx-1,y:by-1,w:bw+2,h:bh+2};
    for(q=0;q<BOXES.length;q++){var Bq=BOXES[q];
      if(R2.x<Bq.x+Bq.w+3&&R2.x+R2.w+3>Bq.x&&R2.y<Bq.y+Bq.h+3&&R2.y+R2.h+3>Bq.y)return false;}
    return true;
  }
  function pickHostHall(){
    // вес = площадь: большие опенспейсы чаще получают стеклянный бокс
    var tot=0,q;
    for(q=0;q<halls.length;q++)if(!halls[q].lobby)tot+=halls[q].w*halls[q].h;
    var r=rnd()*tot;
    for(q=0;q<halls.length;q++){var H=halls[q];
      if(H.lobby)continue;
      r-=H.w*H.h;
      if(r<=0)return H;}
    return halls[0];
  }
  function addBox(bw,bh,type){
    if(bw<5)bw=5; // минимальная комната — 5 клеток в ширину
    var sizes=[[bw,bh]];
    if(bh>3)sizes.push([bw,bh-1]); // ширину не сжимаем: только высота
    for(var sv=0;sv<sizes.length;sv++){
      var bwx=sizes[sv][0],bhx=sizes[sv][1];
      for(var tt=0;tt<200;tt++){
        var Hc=pickHostHall();
        // валидный диапазон: кольцо бокса + 2 тайла прохода внутри зала
        var xlo=Hc.x+3,xhi=Hc.x+Hc.w-bwx-3,ylo=Hc.y+3,yhi=Hc.y+Hc.h-bhx-3;
        if(xlo>xhi||ylo>yhi)continue;
        var bx=xlo+((rnd()*(xhi-xlo+1))|0),by=ylo+((rnd()*(yhi-ylo+1))|0);
        if(type==='wc'){ // санузел прижат к стене зала: не плавает по центру опенспейса
          var sd=(rnd()*4)|0;
          if(sd===0)bx=xlo;else if(sd===1)bx=xhi;else if(sd===2)by=ylo;else by=yhi;
        }
        if(!boxOK(bx,by,bwx,bhx))continue;
        BOXES.push({x:bx,y:by,w:bwx,h:bhx,type:type,host:Hc});
        return true;
      }
    }
    return false;
  }
  addBox(5,3,'pantry');
  addBox(5,3,'pantry');
  addBox(5,3,'wc');addBox(5,3,'wc');
  addBox(6,3,'meeting');
  addBox(6,3,'meeting');
  addBox(5,3,'office');
  for(k=0;k<BOXES.length;k++){var B3=BOXES[k];
    for(j=B3.y-1;j<=B3.y+B3.h;j++)for(i=B3.x-1;i<=B3.x+B3.w;i++)grid[j][i]=0; // кольцо стены
    for(j=B3.y;j<B3.y+B3.h;j++)for(i=B3.x;i<B3.x+B3.w;i++)grid[j][i]=1;       // интерьер
    // проём — в сторону центра зала-хоста: широкие «стеклянные двери»
    var hcx=B3.host.x+B3.host.w/2,hcy=B3.host.y+B3.host.h/2;
    var bcx=B3.x+B3.w/2,bcy=B3.y+B3.h/2;
    var side=Math.abs(hcx-bcx)>Math.abs(hcy-bcy)?(hcx<bcx?0:1):(hcy<bcy?2:3);
    var opw=Math.max(2,Math.min(3,(side<2?B3.h:B3.w)-1));
    var oSt;
    if(side<2){oSt=B3.y+clamp(((B3.h-opw)/2)|0,0,B3.h-opw);
      for(oo=0;oo<opw;oo++)grid[oSt+oo][side===0?B3.x-1:B3.x+B3.w]=1;}
    else{oSt=B3.x+clamp(((B3.w-opw)/2)|0,0,B3.w-opw);
      for(oo=0;oo<opw;oo++)grid[side===2?B3.y-1:B3.y+B3.h][oSt+oo]=1;}
    ROOMS.push({x:B3.x*TILE,y:B3.y*TILE,w:B3.w*TILE,h:B3.h*TILE,tx:B3.x,ty:B3.y,tw:B3.w,th:B3.h,type:B3.type,glass:B3.type==='wc'?0:1,openSide:side,hostHall:B3.host.hall});
  }
  // двери — единственная связь залов: остовное дерево + петли (степень ≥2), кайт без тупиков
  var edges=[];
  for(var a1=0;a1<halls.length;a1++)for(var b1=a1+1;b1<halls.length;b1++){
    var sg=sharedSeg(halls[a1],halls[b1]);
    if(sg)edges.push({a:a1,b:b1,seg:sg,used:0});
  }
  var deg=[];
  for(k=0;k<halls.length;k++)deg[k]=0;
  function carveDoor(ed,second){
    if(ed.used&&!second)return;
    var sg=ed.seg,dw=(halls[ed.a].arena||halls[ed.b].arena)?3:2;
    var len=sg.e-sg.s;
    ed.doors=ed.doors||[];
    var st;
    if(ed.doors.length){
      // позиция с максимальным отрывом от уже вырезанных дверей сегмента
      var best=-1,bestGap=-1,p,di,gap;
      for(p=sg.s;p<=sg.e-dw;p++){
        gap=1e9;
        for(di=0;di<ed.doors.length;di++)gap=Math.min(gap,Math.max(0,Math.abs(p-ed.doors[di].st)-dw));
        if(gap>bestGap){bestGap=gap;best=p;}
      }
      if(bestGap<2)return; // стена короткая: вторая дверь вплотную не нужна
      st=best;
    }else{
      st=sg.s+clamp(((len-dw)/2)|0+(((rnd()*3)|0)-1),0,len-dw);
    }
    var d2;
    if(sg.v){for(d2=0;d2<dw;d2++)grid[st+d2][sg.gx]=1;
      DOORT.push({x:sg.gx,y:st,w:1,h:dw});
      DOORS.push({x:(sg.gx-1)*TILE-10,y:(st-1)*TILE-10,w:3*TILE+20,h:(dw+2)*TILE+20});}
    else{for(d2=0;d2<dw;d2++)grid[sg.gy][st+d2]=1;
      DOORT.push({x:st,y:sg.gy,w:dw,h:1});
      DOORS.push({x:(st-1)*TILE-10,y:(sg.gy-1)*TILE-10,w:(dw+2)*TILE+20,h:3*TILE+20});}
    ed.doors.push({st:st,dw:dw});
    ed.used=1;
    deg[ed.a]++;deg[ed.b]++;
  }
  function widestEdge(k,any){
    var bestE=null,bl=0;
    for(var e3=0;e3<edges.length;e3++){var E3=edges[e3];
      if(!any&&E3.used)continue;
      if(E3.a!==k&&E3.b!==k)continue;
      if(E3.seg.e-E3.seg.s>bl){bl=E3.seg.e-E3.seg.s;bestE=E3;}}
    return bestE;
  }
  var conn={};conn[0]=1;
  var grew=true;
  while(grew){grew=false;
    for(var e1=0;e1<edges.length;e1++){var E=edges[e1];
      if(E.used)continue;
      if((conn[E.a]&&!conn[E.b])||(conn[E.b]&&!conn[E.a])){
        carveDoor(E);conn[E.a]=1;conn[E.b]=1;grew=true;
      }
    }
  }
  for(k=1;k<halls.length;k++){
    if(deg[k]>=2)continue;
    var unusedE=widestEdge(k,false)||widestEdge(k,true);
    if(unusedE)carveDoor(unusedE,unusedE.used);
  }
  // страховка петель: дверей не меньше, чем залов — кайт по кругу возможен всегда
  for(var lp=0;lp<halls.length&&DOORT.length<halls.length;lp++){
    var cands=[];
    for(var e4=0;e4<edges.length;e4++)cands.push(edges[e4]);
    cands.sort(function(a2,b2){return (b2.seg.e-b2.seg.s)-(a2.seg.e-a2.seg.s);});
    var carved=0;
    for(var c4=0;c4<cands.length&&!carved;c4++){
      var before=DOORT.length;
      carveDoor(cands[c4],true);
      if(DOORT.length>before)carved=1;
    }
    if(carved)continue;
    // все стены уже по двери: короткий широкий проход-прорез между близкими залами
    var tunnelOK=function(h1,h2){
      // горизонтальный зазор: h1 левее, зазор ≤4 тайлов, перекрытие по y ≥3
      var gap,st,y0,y1,x0,x1,t2,i2,j2;
      if(h1.x+h1.w+1<=h2.x&&h2.x-(h1.x+h1.w+1)<=4){
        gap=h2.x-(h1.x+h1.w+1);x0=h1.x+h1.w+1;x1=h2.x-1;
        y0=Math.max(h1.y,h2.y);y1=Math.min(h1.y+h1.h,h2.y+h2.h)-1;
        if(y1-y0>=1){st=y0+(((y1-y0-1)/2)|0);
          for(t2=0;t2<2;t2++)for(i2=x0-1;i2<=x1+1;i2++)grid[st+t2][i2]=1;
          DOORT.push({x:x0-1,y:st,w:(x1-x0+3),h:2});
          DOORS.push({x:(x0-2)*TILE-10,y:(st-1)*TILE-10,w:((x1-x0+5))*TILE+20,h:4*TILE+20});
          return true;}
      }
      if(h2.x+h2.w+1<=h1.x&&h1.x-(h2.x+h2.w+1)<=4){
        gap=h1.x-(h2.x+h2.w+1);x0=h2.x+h2.w+1;x1=h1.x-1;
        y0=Math.max(h1.y,h2.y);y1=Math.min(h1.y+h1.h,h2.y+h2.h)-1;
        if(y1-y0>=1){st=y0+(((y1-y0-1)/2)|0);
          for(t2=0;t2<2;t2++)for(i2=x0-1;i2<=x1+1;i2++)grid[st+t2][i2]=1;
          DOORT.push({x:x0-1,y:st,w:(x1-x0+3),h:2});
          DOORS.push({x:(x0-2)*TILE-10,y:(st-1)*TILE-10,w:((x1-x0+5))*TILE+20,h:4*TILE+20});
          return true;}
      }
      if(h1.y+h1.h+1<=h2.y&&h2.y-(h1.y+h1.h+1)<=4){
        gap=h2.y-(h1.y+h1.h+1);y0=h1.y+h1.h+1;y1=h2.y-1;
        x0=Math.max(h1.x,h2.x);x1=Math.min(h1.x+h1.w,h2.x+h2.w)-1;
        if(x1-x0>=1){st=x0+(((x1-x0-1)/2)|0);
          for(t2=0;t2<2;t2++)for(j2=y0-1;j2<=y1+1;j2++)grid[j2][st+t2]=1;
          DOORT.push({x:st,y:y0-1,w:2,h:(y1-y0+3)});
          DOORS.push({x:(st-1)*TILE-10,y:(y0-2)*TILE-10,w:4*TILE+20,h:((y1-y0+5))*TILE+20});
          return true;}
      }
      if(h2.y+h2.h+1<=h1.y&&h1.y-(h2.y+h2.h+1)<=4){
        gap=h1.y-(h2.y+h2.h+1);y0=h2.y+h2.h+1;y1=h1.y-1;
        x0=Math.max(h1.x,h2.x);x1=Math.min(h1.x+h1.w,h2.x+h2.w)-1;
        if(x1-x0>=1){st=x0+(((x1-x0-1)/2)|0);
          for(t2=0;t2<2;t2++)for(j2=y0-1;j2<=y1+1;j2++)grid[j2][st+t2]=1;
          DOORT.push({x:st,y:y0-1,w:2,h:(y1-y0+3)});
          DOORS.push({x:(st-1)*TILE-10,y:(y0-2)*TILE-10,w:4*TILE+20,h:((y1-y0+5))*TILE+20});
          return true;}
      }
      return false;
    };
    var tun=0;
    outer3:
    for(var a5=0;a5<halls.length;a5++)for(var b5=a5+1;b5<halls.length;b5++){
      // без общей стены — carveDoor тут не работает; короткая общая стена тоже не возьмёт вторую дверь
      var __ss=sharedSeg(halls[a5],halls[b5]);
      if(__ss&&__ss.e-__ss.s>=7)continue;
      if(tunnelOK(halls[a5],halls[b5])){tun=1;break outer3;}
    }
    if(!tun)break;
  }
  for(k=1;k<halls.length;k++){
    if(deg[k]===0){ // фолбэк размещения без стыка: ломаем стену к любому соседнему по прямой
      var HK=halls[k],bestD=null,bdd=1e9;
      for(var q3=0;q3<halls.length;q3++){
        if(q3===k)continue;
        var D3=sharedSeg(HK,halls[q3]);
        if(D3){var dd3=Math.abs(halls[q3].x-HK.x)+Math.abs(halls[q3].y-HK.y);if(dd3<bdd){bdd=dd3;bestD=D3;edges.push({a:q3,b:k,seg:D3,used:0});}}
      }
      if(bestD)carveDoor(edges[edges.length-1]);
    }
  }
  // страховка кухни ДО меблировки: ретайп после furnishRoom оставлял парты вместо кухни
  var hasPantry=false;
  for(var rp=0;rp<ROOMS.length;rp++)if(ROOMS[rp].type==='pantry')hasPantry=true;
  if(!hasPantry){
    var big=ROOMS[0];
    for(rp=1;rp<ROOMS.length;rp++)if(ROOMS[rp].w*ROOMS[rp].h>big.w*big.h&&ROOMS[rp].type!=='lobby'&&ROOMS[rp].type!=='wc'&&ROOMS[rp].type!=='meeting'&&!ROOMS[rp].arena)big=ROOMS[rp];
    if(big.type!=='lobby'&&big.type!=='wc')big.type='pantry';
  }
  // --- furniture + coffee + lights + spawn points
  var fid=1;
  for(i=0;i<ROOMS.length;i++)fid=furnishRoom(ROOMS[i],fid);
  for(var guard3=0;guard3<24&&FURN.length;guard3++){
    if(roomPathOK(null))break;
    FURN.pop();
  }
  // второй шанс кухне: гард мог выкинуть мебель, запечатывавшую комнату в момент расстановки
  for(i=0;i<ROOMS.length;i++){var rmP=ROOMS[i];
    if(rmP.type!=='pantry')continue;
    var has=false,q4;
    for(q4=0;q4<FURN.length;q4++)if(FURN[q4].t==='cstand'&&FURN[q4].x>=rmP.x&&FURN[q4].y>=rmP.y&&FURN[q4].x+FURN[q4].w<=rmP.x+rmP.w&&FURN[q4].y+FURN[q4].h<=rmP.y+rmP.h)has=true;
    if(has)continue;
    var px=[rmP.x+rmP.w/2-25,rmP.x+8,rmP.x+rmP.w-58,rmP.x+rmP.w/2-25];
    var py=[rmP.y+16,rmP.y+rmP.h/2-19,rmP.y+rmP.h/2-19,rmP.y+rmP.h-46];
    if(rmP.openSide===3)py[0]=rmP.y+16; // проём снизу — стойка сверху
    for(q4=0;q4<px.length;q4++){
      fid=placeFurn(rmP,fid,'cstand',px[q4],py[q4],50,38);
      var ok2=false,qq;
      for(qq=0;qq<FURN.length;qq++)if(FURN[qq].t==='cstand'&&FURN[qq].x===px[q4]&&FURN[qq].y===py[q4])ok2=true;
      if(ok2)break;
    }
  }
  for(i=0;i<FURN.length;i++)FURN[i].hp=FPROPS[FURN[i].t].hp;
  // coffee machines: 1-2 for the whole office (user request), one per pantry max
  var pantries=[];
  for(i=0;i<ROOMS.length;i++)if(ROOMS[i].type==='pantry')pantries.push(ROOMS[i]);
  for(i=0;i<Math.min(2,pantries.length);i++)COFFEES.push({x:pantries[i].x+pantries[i].w/2,y:pantries[i].y+70,charges:2,t:0});
  var lobR=lobbyRoom();
  SPAWNS.push({x:lobR.x+lobR.w/2,y:lobR.y+lobR.h/2,tag:'ресепшн'});
  // corridor lights
  for(j=1;j<GH-1;j++)for(i=1;i<GW-1;i++){
    if(grid[j][i]&&!roomAtTile(i,j)){
      if((i*7+j*13)%5===0&&rnd()<0.5){
        var dead=rnd()<0.25,dim=dead?0:(rnd()<0.3?0.5:1);
        LIGHTS.push({x:i*TILE+TILE/2,y:j*TILE+TILE/2,dead:dead,dim:dim,ph:rnd()*10,sd:rnd()*100,sput:0});
      }
    }
  }
  var WT=26;
  // --- thin walls: strips on the void side of every floor tile edge
  for(j=0;j<GH;j++)for(i=0;i<GW;i++){
    if(!grid[j][i])continue;
    var L=(i>0?grid[j][i-1]:0),Rr=(i<GW-1?grid[j][i+1]:0),U=(j>0?grid[j-1][i]:0),D=(j<GH-1?grid[j+1][i]:0);
    if(!L)WALLS.push({x:i*TILE-WT,y:j*TILE,w:WT,h:TILE,dir:0});
    if(!Rr)WALLS.push({x:(i+1)*TILE,y:j*TILE,w:WT,h:TILE,dir:1});
    if(!U)WALLS.push({x:i*TILE,y:j*TILE-WT,w:TILE,h:WT,dir:2});
    if(!D)WALLS.push({x:i*TILE,y:(j+1)*TILE,w:TILE,h:WT,dir:3});
  }
  for(var wgi=0;wgi<WALLS.length;wgi++)WALLS[wgi].glass=wallGlass(WALLS[wgi]);
  buildWallBuckets();
  resetFog();
  rebuildObst();
  validateSpawns();
  buildHallSpawns();
  prerenderFloor();
  buildMinimapBase();
}
function buildHallSpawns(){
  for(var i=0;i<ROOMS.length;i++){var rS=ROOMS[i];
    if(rS.type!=='openspace')continue;
    var inHall=[];
    for(var st=0;st<REACH_LIST.length;st++){var tl=REACH_LIST[st];
      if(roomAtTile((tl.x/TILE)|0,(tl.y/TILE)|0)===rS)inHall.push(tl);}
    if(!inHall.length)continue;
    var step=Math.max(1,(inHall.length/4)|0),picks=0;
    for(var si=0;si<inHall.length&&picks<4;si+=step){
      SPAWNS.push({x:inHall[si].x,y:inHall[si].y,tag:'зал',sp:1});picks++;
    }
  }
}

// ---- гарантия досягаемости: спавны и кофе только в связной зоне, свободной от мебели ----
var REACH=new Uint8Array(GW*GH); // структурно досягаемые тайлы (стены+мебель)
var REACH_LIST=[];                // центры таких тайлов — безопасный фолбэк спавна
function tileFree(tx,ty,r){
  if(!grid[ty]||!grid[ty][tx])return false;
  return !blockedAt(tx*TILE+TILE/2,ty*TILE+TILE/2,r);
}
function buildReach(){
  REACH.fill(0);REACH_LIST.length=0;
  var c0=roomCenter(lobbyRoom()),sx=c0[0],sy=c0[1];
  if(!tileFree(sx,sy,16)){ // центр лобби может быть занят мебелью — ищем ближайший свободный
    search: for(var r2=1;r2<6;r2++)
      for(var dy=-r2;dy<=r2;dy++)for(var dx=-r2;dx<=r2;dx++){
        var xx=sx+dx,yy=sy+dy;
        if(xx>=0&&yy>=0&&xx<GW&&yy<GH&&tileFree(xx,yy,16)){sx=xx;sy=yy;break search;}
      }
  }
  var q=[sx+sy*GW];REACH[sx+sy*GW]=1;
  for(var head=0;head<q.length;head++){
    var cur=q[head],cx=cur%GW,cy=(cur/GW)|0;
    REACH_LIST.push({x:cx*TILE+TILE/2,y:cy*TILE+TILE/2});
    for(var k=0;k<4;k++){
      var nx=cx+(k===0?1:(k===1?-1:0)),ny=cy+(k===2?1:(k===3?-1:0));
      if(nx<0||ny<0||nx>=GW||ny>=GH)continue;
      var ni=nx+ny*GW;
      if(REACH[ni]||!grid[ny][nx]||!tileFree(nx,ny,16))continue;
      REACH[ni]=1;q.push(ni);
    }
  }
}
var WBUCK=null,_losStamp=0;
function buildWallBuckets(){
  WBUCK=new Array(GW*GH);
  for(var wI=0;wI<WALLS.length;wI++){var W=WALLS[wI];W._id=wI;
    var tx0=Math.max(0,((W.x-2)/TILE)|0),tx1=Math.min(GW-1,((W.x+W.w+2)/TILE)|0);
    var ty0=Math.max(0,((W.y-2)/TILE)|0),ty1=Math.min(GH-1,((W.y+W.h+2)/TILE)|0);
    for(var ty=ty0;ty<=ty1;ty++)for(var tx=tx0;tx<=tx1;tx++){
      var bi=tx+ty*GW;
      if(!WBUCK[bi])WBUCK[bi]=[];
      WBUCK[bi].push(W);
    }
  }
}
function snapReachable(p){ // ближайший досягаемый свободный тайл-центр
  var tx=clamp((p.x/TILE)|0,0,GW-1),ty=clamp((p.y/TILE)|0,0,GH-1);
  if(REACH[tx+ty*GW]&&!blockedAt(p.x,p.y,16))return{x:p.x,y:p.y};
  var best=null,bd=1e18;
  for(var i=0;i<REACH_LIST.length;i++){
    var t=REACH_LIST[i],dd=(t.x-p.x)*(t.x-p.x)+(t.y-p.y)*(t.y-p.y);
    if(dd<bd){bd=dd;best=t;}
  }
  return best?{x:best.x,y:best.y}:{x:p.x,y:p.y};
}
function reachOK(x,y){
  var tx=clamp((x/TILE)|0,0,GW-1),ty=clamp((y/TILE)|0,0,GH-1);
  return !!REACH[tx+ty*GW];
}
function validateSpawns(){
  buildReach();
  for(var i=0;i<SPAWNS.length;i++){
    var sn=snapReachable(SPAWNS[i]);
    SPAWNS[i]={x:sn.x,y:sn.y,tag:SPAWNS[i].tag,sp:SPAWNS[i].sp};
  }
  for(i=0;i<COFFEES.length;i++){
    var cc=snapReachable(COFFEES[i]);
    COFFEES[i].x=cc.x;COFFEES[i].y=cc.y;
  }
}
var FURNG=new Uint8Array(GW*GH);
function rebuildObst(){
  OBST.length=0;
  for(var i=0;i<WALLS.length;i++)OBST.push(WALLS[i]);
  for(i=0;i<FURN.length;i++){var f=FURN[i];
    if(!f.dead&&FPROPS[f.t].solid)OBST.push(f);
  }
  FURNG.fill(0);
  for(i=0;i<FURN.length;i++){var f2=FURN[i];
    if(f2.dead||!FPROPS[f2.t].solid)continue;
    var tx0=Math.max(0,(f2.x/TILE)|0),tx1=Math.min(GW-1,((f2.x+f2.w)/TILE)|0);
    var ty0=Math.max(0,(f2.y/TILE)|0),ty1=Math.min(GH-1,((f2.y+f2.h)/TILE)|0);
    for(var ty=ty0;ty<=ty1;ty++)for(var tx=tx0;tx<=tx1;tx++){
      var cx2=tx*TILE+TILE/2,cy2=ty*TILE+TILE/2;
      var qx=Math.max(f2.x,Math.min(cx2,f2.x+f2.w)),qy=Math.max(f2.y,Math.min(cy2,f2.y+f2.h));
      if((cx2-qx)*(cx2-qx)+(cy2-qy)*(cy2-qy)<26*26)FURNG[tx+ty*GW]=1;
    }
  }
  for(var dI=0;dI<DOORT.length;dI++){var DT=DOORT[dI];
    for(var dy2=0;dy2<DT.h;dy2++)for(var dx2=0;dx2<DT.w;dx2++)
      for(var oy=-1;oy<=1;oy++)for(var ox=-1;ox<=1;ox++){
        var ddx=DT.x+dx2+ox,ddy=DT.y+dy2+oy;
        if(ddx>=0&&ddy>=0&&ddx<GW&&ddy<GH)FURNG[ddx+ddy*GW]=0;
      }
  }
  FLOW.t=0;
}
function roomAtTile(i,j){
  var best=null;
  for(var r=0;r<ROOMS.length;r++){var rm=ROOMS[r];
    if(i>=rm.tx&&i<rm.tx+rm.tw&&j>=rm.ty&&j<rm.ty+rm.th){
      // стеклянные боксы лежат внутри залов — побеждает меньшая комната
      if(!best||rm.tw*rm.th<best.tw*best.th)best=rm;
    }
  }
  return best;
}
// furniture properties: solid = blocks movement; hp > 0 = destructible
var FPROPS={
  desk:{solid:1,hp:40},rtable:{solid:1,hp:60},cabinet:{solid:1,hp:30},stall:{solid:1,hp:50},
  printer:{solid:1,hp:30},cooler:{solid:0,hp:25},
  couch:{solid:1,hp:45},lamp:{solid:1,hp:20},box:{solid:1,hp:15},pillar:{solid:1,hp:0},
  cstand:{solid:0,hp:0},sink:{solid:0,hp:0},rstand:{solid:0,hp:0},plant:{solid:0,hp:0}
};
function furnRoom(rm,type){return rm.type===type;}
// placement with overlap protection: мебель не налезает друг на друга
// свободен ли тайл для тела r16: кромки стен + вся мебель (+ виртуальная extra [x,y,w,h])
function tileFreeV(tx,ty,ex){
  if(!grid[ty]||!grid[ty][tx])return false;
  var cx=tx*TILE+TILE/2,cy=ty*TILE+TILE/2,r=16,e=[];
  if(!grid[ty][tx-1])e.push([tx*TILE-26,ty*TILE,26,TILE]);
  if(!grid[ty][tx+1])e.push([(tx+1)*TILE,ty*TILE,26,TILE]);
  if(!grid[ty-1]||!grid[ty-1][tx])e.push([tx*TILE,ty*TILE-26,TILE,26]);
  if(!grid[ty+1]||!grid[ty+1][tx])e.push([tx*TILE,(ty+1)*TILE,TILE,26]);
  var i2,er,qx,qy;
  for(i2=0;i2<e.length;i2++){er=e[i2];
    qx=Math.max(er[0],Math.min(cx,er[0]+er[2]));qy=Math.max(er[1],Math.min(cy,er[1]+er[3]));
    if((cx-qx)*(cx-qx)+(cy-qy)*(cy-qy)<r*r)return false;
  }
  var obs=FURN.concat(ex?[ex]:[]);
  for(i2=0;i2<obs.length;i2++){var o2=obs[i2];
    qx=Math.max(o2.x,Math.min(cx,o2.x+o2.w));qy=Math.max(o2.y,Math.min(cy,o2.y+o2.h));
    if((cx-qx)*(cx-qx)+(cy-qy)*(cy-qy)<r*r)return false;
  }
  return true;
}
// все ли комнаты достижимы (хотя бы один тайл) при гипотетической мебели ex
function roomPathOK(ex){
  var start=null,lb=lobbyRoom();
  for(var ty=lb.ty;ty<lb.ty+lb.th&&!start;ty++)
    for(var tx=lb.tx;tx<lb.tx+lb.tw;tx++)
      if(tileFreeV(tx,ty,ex)){start=[tx,ty];break;}
  if(!start)return false;
  var seen=new Uint8Array(GW*GH),q=[start[0]+start[1]*GW];
  seen[q[0]]=1;
  for(var h=0;h<q.length;h++){
    var c=q[h],cx2=c%GW,cy2=(c/GW)|0;
    var nb=[[cx2+1,cy2],[cx2-1,cy2],[cx2,cy2+1],[cx2,cy2-1]];
    for(var n2=0;n2<4;n2++){var nx=nb[n2][0],ny=nb[n2][1];
      if(nx<0||ny<0||nx>=GW||ny>=GH||seen[nx+ny*GW]||!tileFreeV(nx,ny,ex))continue;
      seen[nx+ny*GW]=1;q.push(nx+ny*GW);
    }
  }
  var cov=0;
  for(var rI=0;rI<ROOMS.length;rI++){var rD2=ROOMS[rI],got=0;
    for(ty=rD2.ty;ty<rD2.ty+rD2.th&&!got;ty++)
      for(tx=rD2.tx;tx<rD2.tx+rD2.tw;tx++)
        if(seen[tx+ty*GW]){got=1;break;}
    if(got)cov++;
  }
  return cov===ROOMS.length;
}
// мебель — только на полу своей комнаты (стеклянные боксы внутри залов — не место для парт)
function furnOnRoomFloor(rm,x,y,w,h){
  var ts=[[x+4,y+4],[x+w-4,y+4],[x+4,y+h-4],[x+w-4,y+h-4],[x+w/2,y+h/2]];
  for(var q=0;q<ts.length;q++){
    var ti=(ts[q][0]/TILE)|0,tj=(ts[q][1]/TILE)|0;
    if(ti<0||tj<0||ti>=GW||tj>=GH||!grid[tj][ti])return false;
    var rO=roomAtTile(ti,tj);
    if(rO&&rO!==rm)return false;
  }
  return true;
}
function placeFurn(rm,fid,t,x,y,w,h,margin,forbid){
  margin=margin||10;
  for(var k=0;k<16;k++){
    var ok=true;
    if(x<rm.x+8||x+w>rm.x+rm.w-8||y<rm.y+8||y+h>rm.y+rm.h-8)ok=false;
    if(ok&&forbid&&forbid(x,y,w,h))ok=false;
    if(ok&&!furnOnRoomFloor(rm,x,y,w,h))ok=false;
    if(ok)for(var f=0;f<FURN.length;f++){var o=FURN[f];
      if(x<o.x+o.w+margin&&x+w+margin>o.x&&y<o.y+o.h+margin&&y+h+margin>o.y){ok=false;break;}
    }
    if(ok)for(var dI=0;dI<DOORS.length;dI++){var dr=DOORS[dI];
      if(x<dr.x+dr.w-4&&x+w+4>dr.x&&y<dr.y+dr.h-4&&y+h+4>dr.y){ok=false;break;}
    }
    if(ok&&!roomPathOK([x,y,w,h]))ok=false; // мебель не запечатывает ни одну комнату
    if(ok){FURN.push({id:fid++,t:t,x:x,y:y,w:w,h:h});return fid;}
    x=rm.x+12+((rnd()*(rm.w-w-24))|0);
    y=rm.y+12+((rnd()*(rm.h-h-24))|0);
  }
  return fid;
}
function furnishRoom(rm,fid){
  var i,j;
  // ceiling lights in room
  var warmRoom=(rm.type==='pantry'||rm.type==='meeting')?1:0;
  for(j=rm.ty;j<rm.ty+rm.th;j+=3)for(i=rm.tx;i<rm.tx+rm.tw;i+=3){
    var dead=rnd()<0.22,dim=dead?0:(rnd()<0.3?0.5:1);
    LIGHTS.push({x:i*TILE+TILE*1.5,y:j*TILE+TILE*1.5,dead:dead,dim:dim,ph:rnd()*10,sd:rnd()*100,sput:0,
      warm:warmRoom||rnd()<0.3});
  }
  if(furnRoom(rm,'openspace')){
    var laneY=rm.y+rm.h*(0.32+rnd()*0.36);
    var noEdge=function(x,y,w,h){
      if(Math.abs(y+h/2-laneY)<66)return true;                 // центральная аллея свободна
      return (x<rm.x+90)||(x+w>rm.x+rm.w-90)||(y<rm.y+90)||(y+h>rm.y+rm.h-90); // и периметр зала
    };
    var character=(rm.hall||0)%4;
    var laneOnly=function(x,y,w,h){return Math.abs(y+h/2-laneY)<66;};
    if(rm.arena){
      var ccx=rm.x+rm.w/2,ccy=rm.y+rm.h/2;
      var arx=Math.max(90,rm.w/2-100),ary=Math.max(80,rm.h/2-90);
      for(var pa=0;pa<8;pa++){
        var pang=(pa/8)*TAU+((rnd()-0.5)*0.35);
        fid=placeFurn(rm,fid,'pillar',ccx+Math.cos(pang)*arx-17,ccy+Math.sin(pang)*ary-17,34,34,10);
      }
      fid=placeFurn(rm,fid,'plant',rm.x+30,rm.y+30,22,22);
      fid=placeFurn(rm,fid,'plant',rm.x+rm.w-52,rm.y+rm.h-52,22,22);
    }else if(character===2){ // «СКЛАД МЕРЧА»: коробки с худи и стикерами — свэг компании
      for(j=rm.y+90;j<rm.y+rm.h-80;j+=140){
        var stacks=2+((rnd()*2)|0);
        for(i=rm.x+70,i2=0;i<rm.x+rm.w-120&&i2<stacks;i+=130,i2++){
          if(rnd()<0.25)continue;
          fid=placeFurn(rm,fid,'box',i,j,26,22,8,noEdge);
          fid=placeFurn(rm,fid,'box',i+34,j-6,26,22,8,noEdge);
          if(rnd()<0.5)fid=placeFurn(rm,fid,'box',i+16,j+26,26,22,8,noEdge);
          if(rnd()<0.6)fid=placeFurn(rm,fid,'cabinet',i+80,j+4,64,30,8,noEdge);
        }
      }
      fid=placeFurn(rm,fid,'printer',rm.x+20+rnd()*(rm.w-80),rm.y+14+rnd()*(rm.h-62),44,38,8,noEdge);
    }else if(character===1){
      var rl,i2;
      for(j=rm.y+90;j<rm.y+rm.h-80;j+=150){
        rl=2+((rnd()*2)|0);
        for(i=rm.x+70,i2=0;i<rm.x+rm.w-150&&i2<rl;i+=150,i2++){
          if(rnd()<0.2)continue;
          fid=placeFurn(rm,fid,'cabinet',i,j,64,30,8,noEdge);
          fid=placeFurn(rm,fid,'cabinet',i+74,j,64,30,8,noEdge);
        }
      }
      fid=placeFurn(rm,fid,'box',rm.x+18,rm.y+rm.h-44,26,22);
      fid=placeFurn(rm,fid,'box',rm.x+rm.w-46,rm.y+18,26,22);
    }else{
      for(j=rm.y+70;j<rm.y+rm.h-90;j+=152){
        for(i=rm.x+60;i<rm.x+rm.w-180;i+=232){
          if(rnd()<0.12)continue;
          if(Math.abs(j+48-laneY)>=110){
            fid=placeFurn(rm,fid,'desk',i,j,118,46,10,noEdge);
            if(rnd()<0.65)fid=placeFurn(rm,fid,'desk',i,j+58,118,46,10,noEdge);
          }
        }
      }
      var np2=1+((rnd()*2)|0);
      for(i=0;i<np2;i++)fid=placeFurn(rm,fid,'printer',rm.x+20+rnd()*(rm.w-80),rm.y+14+rnd()*(rm.h-62),44,38,8,noEdge);
      fid=placeFurn(rm,fid,'box',rm.x+18,rm.y+rm.h-44,26,22,8,noEdge);
      fid=placeFurn(rm,fid,'plant',rm.x+rm.w-44,rm.y+18,22,22,8,noEdge);
    }
  }else if(furnRoom(rm,'office')){
    var n=1+((rnd()*2)|0);
    for(i=0;i<n;i++){
      var dx2=rm.x+60+rnd()*(rm.w-260),dy2=rm.y+60+rnd()*(rm.h-160);
      fid=placeFurn(rm,fid,'desk',dx2,dy2,118,46);
    }
    if(rnd()<0.6)fid=placeFurn(rm,fid,'printer',rm.x+16+rnd()*(rm.w-80),rm.y+16+rnd()*(rm.h-62),44,38);
    if(rnd()<0.5)fid=placeFurn(rm,fid,'cabinet',rm.x+20,rm.y+rm.h-56,64,28);
    if(rnd()<0.6)fid=placeFurn(rm,fid,'plant',rm.x+rm.w-42,rm.y+18,22,22);
    if(rnd()<0.4)fid=placeFurn(rm,fid,'box',rm.x+18,rm.y+18,26,22);
  }else if(furnRoom(rm,'meeting')){
    if(!ROOMS.some(function(r){return r.lounge;})&&rnd()<0.75){
      // ЛАУНЖ: биофильный уголок — ковёр, диван, торшер, низкий столик, растения
      rm.lounge=true;
      RUGS.push({x:rm.x+30,y:rm.y+30,w:rm.w-60,h:rm.h-60,c:'#5a3a44',c2:'#6b4652'});
      fid=placeFurn(rm,fid,'couch',rm.x+rm.w/2-55,rm.y+34,110,36);
      fid=placeFurn(rm,fid,'rtable',rm.x+rm.w/2-38,rm.y+rm.h/2-6,76,44,10);
      fid=placeFurn(rm,fid,'lamp',rm.x+18,rm.y+18,18,18);
      fid=placeFurn(rm,fid,'plant',rm.x+rm.w-44,rm.y+24,24,24);
      fid=placeFurn(rm,fid,'plant',rm.x+rm.w-44,rm.y+rm.h-48,24,24);
      LIGHTS.push({x:rm.x+27,y:rm.y+27,dead:false,dim:0,warm:true,ph:rnd()*10,sd:rnd()*100,sput:0,lamp:1});
    }else{
      RUGS.push({x:rm.x+rm.w/2-70,y:rm.y+rm.h/2-40,w:140,h:80,c:'#44384a',c2:'#52445a'});
      fid=placeFurn(rm,fid,'rtable',rm.x+rm.w/2-45,rm.y+rm.h/2-28,90,56,14);
      fid=placeFurn(rm,fid,'plant',rm.x+16,rm.y+16,22,22);
      fid=placeFurn(rm,fid,'plant',rm.x+rm.w-38,rm.y+rm.h-38,22,22);
    }
  }else if(furnRoom(rm,'pantry')){
    // кофе-стенд — у стены напротив стеклянного проёма: не воюет с дверной зоной
    var cx0=rm.x+rm.w/2-25,cy0=rm.y+16;
    if(rm.glass&&rm.openSide===0)cx0=rm.x+rm.w-58;
    else if(rm.glass&&rm.openSide===1)cx0=rm.x+8;
    else if(rm.glass&&rm.openSide===2)cy0=rm.y+rm.h-46;
    fid=placeFurn(rm,fid,'cstand',cx0,cy0,50,38);
    fid=placeFurn(rm,fid,'cooler',rm.x+rm.w-46,rm.y+rm.h-50,26,26);
  }else if(furnRoom(rm,'lobby')){
    RUGS.push({x:rm.x+rm.w/2-90,y:rm.y+70,w:180,h:110,c:'#463a50',c2:'#554762'});
    fid=placeFurn(rm,fid,'rstand',rm.x+rm.w/2-36,rm.y+30,72,32);
    fid=placeFurn(rm,fid,'couch',rm.x+16,rm.y+rm.h-64,96,34);
    fid=placeFurn(rm,fid,'plant',rm.x+rm.w-46,rm.y+20,24,24);
    fid=placeFurn(rm,fid,'plant',rm.x+rm.w-46,rm.y+rm.h-50,24,24);
    fid=placeFurn(rm,fid,'box',rm.x+rm.w/2+50,rm.y+36,26,22);
  }else if(furnRoom(rm,'wc')){
    // сантехника через placeFurn: не запечатывает дверь (зоны DOORS)
    var sh=Math.max(16,(rm.h-46)/2); // вертикальные кабинки вдоль стены
    fid=placeFurn(rm,fid,'stall',rm.x+8,rm.y+8,34,sh,6);
    fid=placeFurn(rm,fid,'stall',rm.x+8,rm.y+16+sh,34,sh,6);
    fid=placeFurn(rm,fid,'sink',rm.x+10,rm.y+rm.h-26,48,20,6);
    fid=placeFurn(rm,fid,'sink',rm.x+rm.w-58,rm.y+rm.h-26,48,20,6);
  }
  if(rm.type!=='wc'&&rnd()<0.6)fid=placeFurn(rm,fid,'plant',rm.x+24+rnd()*(rm.w-54),rm.y+24+rnd()*(rm.h-54),22,22,6);
  return fid;
}
// стеклянная ли стена: соседний пол принадлежит боксу (кухня/санузел/переговорка)
function wallGlass(w){
  var fx,fy;
  if(w.dir===0){fx=w.x+w.w+6;fy=w.y+w.h/2;}
  else if(w.dir===1){fx=w.x-6;fy=w.y+w.h/2;}
  else if(w.dir===2){fx=w.x+w.w/2;fy=w.y+w.h+6;}
  else{fx=w.x+w.w/2;fy=w.y-6;}
  var rm=roomAtTile((fx/TILE)|0,(fy/TILE)|0);
  return rm&&rm.glass;
}
function prerenderFloor(){
  floorCv=document.createElement('canvas');floorCv.width=MAP_W;floorCv.height=MAP_H;
  var c=floorCv.getContext('2d');
  var i,j,rm;
  // void
  c.fillStyle='#06080c';c.fillRect(0,0,MAP_W,MAP_H);
  // floors + walls per tile
  for(j=0;j<GH;j++)for(i=0;i<GW;i++){
    var x=i*TILE,y=j*TILE;
    if(grid[j][i]){
      rm=roomAtTile(i,j);
      var base=MAPTHEME.floor,alt=MAPTHEME.alt;
      if(rm){
        if(rm.type==='pantry'){base=shade(MAPTHEME.floor,6);alt=shade(MAPTHEME.alt,6);}
        else if(rm.type==='meeting'){base=shade(MAPTHEME.floor,-4);alt=shade(MAPTHEME.alt,-4);}
        else if(rm.type==='lobby'){base=shade(MAPTHEME.floor,8);alt=shade(MAPTHEME.alt,8);}
        else if(rm.type==='wc'){base=shade(MAPTHEME.floor,14);alt=shade(MAPTHEME.alt,14);}
        else if(rm.type==='office'){base=shade(MAPTHEME.floor,-8);alt=shade(MAPTHEME.alt,-8);}
        else if(rm.type==='openspace'){var hsh=((rm.hall||0)%3)*5-5;base=shade(MAPTHEME.floor,hsh);alt=shade(MAPTHEME.alt,hsh);}
      }else{base=MAPTHEME.corr;alt=MAPTHEME.corrAlt;}
      c.fillStyle=((i+j)%2===0)?base:alt;
      c.fillRect(x,y,TILE,TILE);
      if(!rm){ // corridor seams
        c.strokeStyle='rgba(0,0,0,0.18)';c.lineWidth=1;
        c.strokeRect(x+0.5,y+0.5,TILE-1,TILE-1);
      }
    }
  }
  for(i=0;i<DOORT.length;i++){var DT2=DOORT[i];
    for(j=0;j<DT2.h;j++)for(var dii=0;dii<DT2.w;dii++){
      var ddx=(DT2.x+dii)*TILE,ddy=(DT2.y+j)*TILE;
      c.fillStyle='rgba(66,224,255,0.10)';c.fillRect(ddx,ddy,TILE,TILE);
      c.strokeStyle='rgba(66,224,255,0.30)';c.lineWidth=2;c.strokeRect(ddx+2,ddy+2,TILE-4,TILE-4);
    }
  }
  // --- псевдо-3D: фронты стен (высота), затем верхние грани ---
  var EH=12,wi,w3;
  for(wi=0;wi<WALLS.length;wi++){w3=WALLS[wi];
    c.fillStyle=shade(MAPTHEME.wall,-6);
    c.fillRect(w3.x,w3.y+w3.h-1,w3.w,EH);
    c.fillStyle=shade(MAPTHEME.wallIn,-8);
    c.fillRect(w3.x+1,w3.y+w3.h,w3.w-2,EH-2);
    // отблеск неона на низе фронта
    c.fillStyle='rgba(232,58,156,0.10)';
    c.fillRect(w3.x+1,w3.y+w3.h+EH-3,w3.w-2,2);
  }
  // --- псевдо-3D: фронты мебели ---
  for(wi=0;wi<FURN.length;wi++){var f3=FURN[wi];
    c.fillStyle='rgba(0,0,0,0.42)';
    c.fillRect(f3.x+2,f3.y+f3.h-1,f3.w,9);
  }
  // coffee stains — irregular splatters, not circles
  // верхние грани стен (после фронтов, поверх)
  for(wi=0;wi<WALLS.length;wi++){w3=WALLS[wi];
    c.fillStyle=shade(MAPTHEME.wall,6);c.fillRect(w3.x,w3.y,w3.w,w3.h);
    c.fillStyle=MAPTHEME.wallIn;c.fillRect(w3.x+1,w3.y+1,w3.w-2,w3.h-2);
    var neon=rnd();
    var gl=wallGlass(w3);
    c.fillStyle=gl?'rgba(126,190,224,0.34)':(neon<0.10?MAPTHEME.neonA:(neon<0.20?MAPTHEME.neonB:MAPTHEME.steel));
    if(w3.dir===0)c.fillRect(w3.x+w3.w-3,w3.y,3,w3.h);
    else if(w3.dir===1)c.fillRect(w3.x,w3.y,3,w3.h);
    else if(w3.dir===2)c.fillRect(w3.x,w3.y+w3.h-3,w3.w,3);
    else c.fillRect(w3.x,w3.y,w3.w,3);
    if(gl){c.fillStyle='rgba(150,210,240,0.15)';c.fillRect(w3.x+2,w3.y+2,w3.w-4,w3.h-4);}
    c.fillStyle='rgba(0,0,0,0.25)';
    if(w3.h>w3.w)c.fillRect(w3.x,w3.y,2,w3.h);else c.fillRect(w3.x,w3.y,w3.w,2);
  }
  // coffee stains — irregular splatters, not circles
  for(i=0;i<40;i++){
    var sx=0,sy=0,tries=0;
    do{sx=40+rnd()*(MAP_W-80);sy=40+rnd()*(MAP_H-80);tries++;}
    while(tries<20&&!floorOpenAt(sx,sy));
    var al=0.16+rnd()*0.26;
    // random walk of blobs + a couple of far drips
    var bx=sx,by=sy,dir=rnd()*TAU;
    for(var bl=0;bl<6;bl++){
      var br2=4+rnd()*9;
      c.fillStyle='rgba(58,42,24,'+(al*(1-bl*0.1)).toFixed(3)+')';
      c.beginPath();
      c.moveTo(bx+br2,by);
      for(var an=0;an<TAU;an+=0.5){
        var wob=br2*(0.62+rnd()*0.55);
        c.lineTo(bx+Math.cos(an+dir)*wob,by+Math.sin(an+dir)*wob*0.8);
      }
      c.closePath();c.fill();
      dir+=(rnd()-0.5)*1.4;
      bx+=Math.cos(dir)*(4+rnd()*8);by+=Math.sin(dir)*(3+rnd()*6);
    }
    for(var dp=0;dp<2;dp++){
      var dx3=(rnd()-0.5)*36,dy3=(rnd()-0.5)*26;
      c.fillStyle='rgba(58,42,24,'+(al*0.7).toFixed(3)+')';
      c.beginPath();c.ellipse(sx+dx3,sy+dy3,1.5+rnd()*3,1.5+rnd()*3,rnd()*3,0,TAU);c.fill();
    }
  }
  // ковры: тёплые островки зонирования (под мебелью)
  for(i=0;i<RUGS.length;i++){var rg=RUGS[i];
    c.fillStyle=rg.c;rr(c,rg.x,rg.y,rg.w,rg.h,14);c.fill();
    c.strokeStyle=rg.c2;c.lineWidth=3;rr(c,rg.x+5,rg.y+5,rg.w-10,rg.h-10,10);c.stroke();
    c.fillStyle='rgba(0,0,0,0.12)';rr(c,rg.x+3,rg.y+3,rg.w-6,rg.h-6,12);c.fill();
  }
  // furniture decals
  for(i=0;i<FURN.length;i++)drawFurnDecal(c,FURN[i]);
  // тёплые постеры на стенах (биофилия/мотивация — следы жизни)
  function wallBehind(tx,ty){var row=grid[ty-1];return !row||!row[tx];} // над верхним рядом — стена
  for(i=0;i<ROOMS.length;i++){
    rm=ROOMS[i];
    if((rm.type==='office'||rm.type==='openspace')&&rnd()<0.65){
      var px2=rm.x+24+rnd()*(rm.w-90),py2=rm.y+3;
      if(!wallBehind(clamp(((px2+30)/TILE)|0,0,GW-1),rm.ty))continue;
      var pg=c.createLinearGradient(px2,py2,px2+54,py2+40);
      pg.addColorStop(0,rnd()<0.5?'#c4703a':'#8a5aa0');pg.addColorStop(1,'#3a2a4a');
      c.fillStyle='#d8c9b8';c.fillRect(px2-3,py2-2,60,46);
      c.fillStyle=pg;c.fillRect(px2,py2+1,54,40);
      c.fillStyle='rgba(255,235,200,0.8)';c.beginPath();c.arc(px2+42,py2+10,5,0,TAU);c.fill(); // «закат»
      c.fillStyle='rgba(20,12,26,0.6)';c.fillRect(px2+6,py2+26,30,3);c.fillRect(px2+6,py2+32,20,3);
    }
  }
  // wall decals: whiteboards/posters on room top walls
  for(i=0;i<ROOMS.length;i++){
    rm=ROOMS[i];
    if(rm.type==='meeting'||(rm.type==='office'&&(i%2===0))){
      var wx=rm.x+30,wy=rm.y+2;
      if(wallBehind(clamp(((wx+60)/TILE)|0,0,GW-1),rm.ty)){
      c.fillStyle='#d8dce2';c.fillRect(wx,wy,120,26);
      c.strokeStyle='#9aa0a8';c.lineWidth=2;c.strokeRect(wx,wy,120,26);
      c.strokeStyle='#7a828c';c.lineWidth=1.5;
      c.beginPath();c.moveTo(wx+8,wy+8);c.lineTo(wx+60,wy+8);c.moveTo(wx+8,wy+16);c.lineTo(wx+90,wy+16);c.stroke();
      if(rm.type==='meeting'){c.fillStyle='#c23b32';c.font='bold 10px Arial';c.fillText('OKR?',wx+96,wy+18);}
      }
    }
    if(rm.type==='lobby'){
      if(wallBehind(clamp(((rm.x+rm.w/2)/TILE)|0,0,GW-1),rm.ty)){
        c.fillStyle='#2c3540';c.fillRect(rm.x+rm.w/2-70,rm.y+2,140,34);
        c.fillStyle='#c9d1d9';c.font='bold 13px Arial';c.textAlign='center';
        c.fillText('WE ARE A FAMILY',rm.x+rm.w/2,rm.y+24);c.textAlign='left';
      }
    }
  }
}
function floorOpenAt(x,y){
  var i=(x/TILE)|0,j=(y/TILE)|0;
  if(i<0||j<0||i>=GW||j>=GH)return false;
  if(!grid[j][i])return false;
  for(var k=0;k<FURN.length;k++){var f=FURN[k];
    if(x>f.x-8&&x<f.x+f.w+8&&y>f.y-8&&y<f.y+f.h+8)return false;
  }
  return true;
}
function drawFurnDecal(c,f){
  if(f.t==='desk'){
    c.fillStyle='rgba(0,0,0,0.3)';c.fillRect(f.x+4,f.y+6,f.w,f.h);
    c.fillStyle='#3a404c';c.fillRect(f.x,f.y,f.w,f.h);
    c.fillStyle='#454c59';c.fillRect(f.x,f.y,f.w,6);
    c.strokeStyle='#22262e';c.lineWidth=2;c.strokeRect(f.x,f.y,f.w,f.h);
    c.fillStyle='#14171c';c.fillRect(f.x+12,f.y+12,36,26);
    c.fillStyle='rgba(150,190,220,0.25)';c.fillRect(f.x+14,f.y+14,32,22);
    c.fillStyle='#14171c';c.fillRect(f.x+27,f.y+38,6,8);
    c.fillStyle='rgba(220,224,230,0.7)';c.save();c.translate(f.x+95,f.y+30);c.rotate(0.2);c.fillRect(-9,-6,18,12);c.restore();
    c.fillStyle='rgba(210,214,222,0.5)';c.save();c.translate(f.x+110,f.y+40);c.rotate(-0.3);c.fillRect(-8,-5,16,10);c.restore();
    c.fillStyle='#6f4a23';c.beginPath();c.arc(f.x+72,f.y+20,5,0,TAU);c.fill();
    chair(c,f.x+75,f.y+92);chair(c,f.x+40,f.y-24);
  }else if(f.t==='rtable'){
    c.fillStyle='rgba(0,0,0,0.3)';c.beginPath();c.ellipse(f.x+f.w/2+4,f.y+f.h/2+5,f.w/2,f.h/2,0,0,TAU);c.fill();
    c.fillStyle='#4a4238';c.beginPath();c.ellipse(f.x+f.w/2,f.y+f.h/2,f.w/2,f.h/2,0,0,TAU);c.fill();
    c.strokeStyle='#2c261f';c.lineWidth=2;c.stroke();
    c.fillStyle='rgba(220,224,230,0.55)';c.fillRect(f.x+f.w/2-16,f.y+f.h/2-9,26,18);
    c.fillStyle='#6f4a23';c.beginPath();c.arc(f.x+f.w/2+26,f.y+f.h/2+4,6,0,TAU);c.fill();
    chair(c,f.x-26,f.y+f.h/2);chair(c,f.x+f.w+26,f.y+f.h/2);chair(c,f.x+f.w/2,f.y-26);chair(c,f.x+f.w/2,f.y+f.h+26);
  }else if(f.t==='printer'){
    c.fillStyle='rgba(0,0,0,0.3)';c.fillRect(f.x+3,f.y+4,f.w,f.h);
    c.fillStyle='#565e6a';rr(c,f.x,f.y,f.w,f.h,3);c.fill();
    c.fillStyle='#3a4049';c.fillRect(f.x+6,f.y+6,f.w-12,14);
    c.fillStyle='#22262e';c.fillRect(f.x+6,f.y+26,f.w-12,8);
    c.fillStyle='rgba(220,224,230,0.7)';c.fillRect(f.x+16,f.y+28,f.w-32,2);
    c.fillStyle='#8bd17c';c.fillRect(f.x+f.w-12,f.y+8,3,3);
  }else if(f.t==='cstand'){
    c.fillStyle='rgba(0,0,0,0.3)';c.fillRect(f.x+4,f.y+6,f.w,f.h);
    c.fillStyle='#3d434e';c.fillRect(f.x,f.y,f.w,f.h);
    c.fillStyle='#4d5462';c.fillRect(f.x,f.y,f.w,7);
    c.strokeStyle='#22262e';c.lineWidth=2;c.strokeRect(f.x,f.y,f.w,f.h);
    // coffee machine
    c.fillStyle='#22262e';c.fillRect(f.x+f.w/2-24,f.y-34,48,34);
    c.fillStyle='#3a4049';c.fillRect(f.x+f.w/2-18,f.y-28,36,16);
    c.fillStyle='#3fb950';c.fillRect(f.x+f.w/2-14,f.y-26,5,3);
  }else if(f.t==='cabinet'){
    c.fillStyle='#39404b';c.fillRect(f.x,f.y,f.w,f.h);
    c.strokeStyle='#20242b';c.lineWidth=2;c.strokeRect(f.x,f.y,f.w,f.h);
    c.strokeStyle='#282e38';c.beginPath();
    for(var k=1;k<3;k++){c.moveTo(f.x+k*f.w/3,f.y+4);c.lineTo(f.x+k*f.w/3,f.y+f.h-4);}
    c.stroke();
  }else if(f.t==='plant'){
    c.fillStyle='#4a3a26';c.fillRect(f.x-4,f.y-4,f.w+8,f.h+4);
    c.fillStyle='#2f4a33';c.beginPath();c.arc(f.x+2,f.y,10,0,TAU);c.arc(f.x+f.w-2,f.y,10,0,TAU);c.arc(f.x+f.w/2,f.y-10,11,0,TAU);c.fill();
    c.fillStyle='#3a5a40';c.beginPath();c.arc(f.x+f.w/2,f.y,7,0,TAU);c.fill();
  }else if(f.t==='cooler'){
    c.fillStyle='#4d5462';c.fillRect(f.x,f.y,f.w,f.h);
    c.fillStyle='#7aa2c8';c.fillRect(f.x+5,f.y+4,f.w-10,12);
    c.fillStyle='#22262e';c.fillRect(f.x+4,f.y+18,f.w-8,8);
  }else if(f.t==='rstand'){
    c.fillStyle='rgba(0,0,0,0.3)';c.fillRect(f.x+3,f.y+4,f.w,f.h);
    c.fillStyle='#423a30';c.fillRect(f.x,f.y,f.w,f.h);
    c.fillStyle='#544a3d';c.fillRect(f.x,f.y,f.w,6);
    c.strokeStyle='#2c261f';c.lineWidth=2;c.strokeRect(f.x,f.y,f.w,f.h);
    c.fillStyle='#8bd17c';c.font='bold 9px Arial';c.textAlign='center';
    c.fillText('RECEPTION',f.x+f.w/2,f.y+f.h/2+3);c.textAlign='left';
  }else if(f.t==='stall'){
    c.fillStyle='#3d4650';c.fillRect(f.x,f.y,f.w,f.h);
    c.strokeStyle='#22262e';c.lineWidth=2;c.strokeRect(f.x,f.y,f.w,f.h);
    c.fillStyle='#2a3038';c.fillRect(f.x+f.w-9,f.y+6,4,f.h-12);
    c.fillStyle='#c9d1d9';c.fillRect(f.x+f.w/2-2,f.y+f.h/2-2,4,4);
  }else if(f.t==='couch'){
    c.fillStyle='rgba(0,0,0,0.3)';c.fillRect(f.x+4,f.y+6,f.w,f.h);
    c.fillStyle='#5a4a56';rr(c,f.x,f.y,f.w,f.h,9);c.fill();
    c.fillStyle='#6b5a66';rr(c,f.x+4,f.y+4,f.w-8,12,6);c.fill();
    c.strokeStyle='#3a2f3c';c.lineWidth=2;rr(c,f.x,f.y,f.w,f.h,9);c.stroke();
    c.fillStyle='#7a6876';c.beginPath();c.arc(f.x+16,f.y-6,7,0,TAU);c.arc(f.x+f.w-16,f.y-6,7,0,TAU);c.fill(); // подушки
  }else if(f.t==='lamp'){ // торшер: тёплый свет
    c.fillStyle='rgba(255,190,110,0.13)';c.beginPath();c.arc(f.x+9,f.y+2,26,0,TAU);c.fill();
    c.fillStyle='#3a3340';c.fillRect(f.x+7,f.y+8,4,12);
    c.fillStyle='#ffcf7a';c.beginPath();c.moveTo(f.x+1,f.y+8);c.lineTo(f.x+17,f.y+8);c.lineTo(f.x+13,f.y-4);c.lineTo(f.x+5,f.y-4);c.closePath();c.fill();
  }else if(f.t==='pillar'){ // несущая колонна: укрытие для кайтинга
    c.fillStyle='rgba(0,0,0,0.35)';c.fillRect(f.x+3,f.y+4,f.w,f.h);
    c.fillStyle='#343b46';c.fillRect(f.x,f.y,f.w,f.h);
    c.fillStyle='#454e5c';c.fillRect(f.x+3,f.y+3,f.w-6,f.h-6);
    c.fillStyle='rgba(150,190,220,0.12)';c.fillRect(f.x+3,f.y+3,5,f.h-6);
    c.fillStyle='rgba(0,0,0,0.25)';c.fillRect(f.x+3,f.y+f.h-7,f.w-6,4);
  }else if(f.t==='box'){
    c.fillStyle='rgba(0,0,0,0.28)';c.fillRect(f.x+3,f.y+4,f.w,f.h);
    c.fillStyle='#8a6f4d';c.fillRect(f.x,f.y,f.w,f.h);
    c.strokeStyle='#5d4a32';c.lineWidth=2;c.strokeRect(f.x,f.y,f.w,f.h);
    c.strokeStyle='rgba(255,255,255,0.25)';c.lineWidth=1.5;
    c.beginPath();c.moveTo(f.x,f.y);c.lineTo(f.x+f.w,f.y+f.h);c.moveTo(f.x+f.w,f.y);c.lineTo(f.x,f.y+f.h);c.stroke();
  }else if(f.t==='sink'){
    c.fillStyle='#454c56';c.fillRect(f.x,f.y,f.w,f.h);
    c.strokeStyle='#22262e';c.lineWidth=2;c.strokeRect(f.x,f.y,f.w,f.h);
    var ns=Math.max(2,(f.w/56)|0);
    for(var sk=0;sk<ns;sk++){
      var sx2=f.x+10+sk*(f.w-20)/ns;
      c.fillStyle='#5c6570';c.beginPath();c.ellipse(sx2+14,f.y+f.h/2,12,8,0,0,TAU);c.fill();
      c.fillStyle='#7aa2c8';c.beginPath();c.ellipse(sx2+14,f.y+f.h/2,8,5,0,0,TAU);c.fill();
      c.fillStyle='#8b949e';c.fillRect(sx2+12,f.y-6,4,8);
    }
  }
  function chair(cx2,cy2){c.fillStyle='#2c313b';c.beginPath();c.arc(cx2,cy2,13,0,TAU);c.fill();c.strokeStyle='#1c2027';c.lineWidth=3;c.beginPath();c.arc(cx2,cy2,13,0,TAU);c.stroke();}
}
function roomLabel(rm){
  if(!rm)return '';
  if(rm.type==='lobby')return 'РЕСЕПШН';
  if(rm.type==='pantry')return 'КУХНЯ';
  if(rm.type==='wc')return 'САНУЗЕЛ';
  if(rm.type==='meeting')return 'ПЕРЕГОВОРНАЯ';
  if(rm.type==='office')return 'КАБИНЕТ ДИРЕКТОРА';
  if(rm.arena)return 'АРЕНА АУДИТА';
  var ch=(rm.hall||0)%4;
  return ch===1?'СЕРВЕРНАЯ':(ch===2?'СКЛАД МЕРЧА':'ОПЕНСПЕЙС');
}
function buildMinimapBase(){
  mmCv=document.createElement('canvas');
  var mmw=200,mmh=Math.round(mmw*MAP_H/MAP_W);
  mmCv.width=mmw;mmCv.height=mmh;
  var c=mmCv.getContext('2d'),sc=mmw/MAP_W;
  c.fillStyle='rgba(8,10,14,0.9)';c.fillRect(0,0,mmw,mmh);
  // floor tiles
  for(var j=0;j<GH;j++)for(var i=0;i<GW;i++){
    if(!grid[j][i])continue;
    var rm=roomAtTile(i,j);
    var col='#232830';
    if(rm){
      if(rm.type==='pantry')col='#2e3a33';
      else if(rm.type==='meeting')col='#33302a';
      else if(rm.type==='wc')col='#33404a';
      else if(rm.type==='office')col='#40342e';
      else if(rm.type==='lobby')col='#3a3427';
      else if(rm.arena)col='#3a2c33';
      else{var ch=(rm.hall||0)%4;col=ch===1?'#2e3f52':(ch===2?'#3e3428':'#2a3038');}
    }
    c.fillStyle=col;
    c.fillRect(i*TILE*sc,j*TILE*sc,TILE*sc+0.5,TILE*sc+0.5);
  }
  // walls
  c.fillStyle='#454e5c';
  for(i=0;i<WALLS.length;i++){var w=WALLS[i];c.fillRect(w.x*sc,w.y*sc,Math.max(1,w.w*sc),Math.max(1,w.h*sc));}
}

// связность: флуд от комнаты, центр комнаты, список недостижимых (от лобби)
function floodFrom(tx,ty){
  var seen={},q=[[tx,ty]];
  seen[tx+','+ty]=1;
  while(q.length){
    var cur=q.pop(),x=cur[0],y=cur[1];
    var nb=[[x+1,y],[x-1,y],[x,y+1],[x,y-1]];
    for(var n=0;n<4;n++){var nx=nb[n][0],ny=nb[n][1];
      if(nx<0||ny<0||nx>=GW||ny>=GH||!grid[ny][nx])continue;
      var k=nx+','+ny;
      if(!seen[k]){seen[k]=1;q.push([nx,ny]);}
    }
  }
  return seen;
}
function roomCenter(rm){return[rm.tx+((rm.tw/2)|0),rm.ty+((rm.th/2)|0)];}
function lobbyRoom(){
  for(var i=0;i<ROOMS.length;i++)if(ROOMS[i].type==='lobby')return ROOMS[i];
  return ROOMS[0];
}
function unreachableRooms(){
  var lb=lobbyRoom();
  var seen=floodFrom.apply(null,roomCenter(lb));
  var bad=[];
  for(var i=0;i<ROOMS.length;i++){
    var r=ROOMS[i],got=false;
    for(var ty=r.ty;ty<r.ty+r.th&&!got;ty++)
      for(var tx=r.tx;tx<r.tx+r.tw;tx++)
        if(seen[tx+','+ty]){got=true;break;}
    if(!got)bad.push(r);
  }
  return bad;
}


// ---- flow-field: поле расстояний до игрока (BFS по тайлам), мобы идут по градиенту ----
var FLOW={d:new Int16Array(GW*GH),tx:-1,ty:-1,t:0};
function computeFlow(px,py){
  var d=FLOW.d;
  for(var i=0;i<d.length;i++)d[i]=-1;
  var sx=clamp((px/TILE)|0,0,GW-1),sy=clamp((py/TILE)|0,0,GH-1);
  if(!grid[sy][sx]){
    search: for(var r2=1;r2<5;r2++)
      for(var dy=-r2;dy<=r2;dy++)for(var dx=-r2;dx<=r2;dx++){
        var yy=sy+dy,xx=sx+dx;
        if(yy>=0&&yy<GH&&xx>=0&&xx<GW&&grid[yy][xx]){sy=yy;sx=xx;break search;}
      }
  }
  var q=[sx+sy*GW];d[sx+sy*GW]=0;
  for(var k0=0;k0<4;k0++){ // старт в мебельном кармане: поле всё равно выходит наружу
    var nx0=sx+(k0===0?1:(k0===1?-1:0)),ny0=sy+(k0===2?1:(k0===3?-1:0));
    if(nx0<0||ny0<0||nx0>=GW||ny0>=GH||!grid[ny0][nx0])continue;
    var ni0=nx0+ny0*GW;
    if(d[ni0]===-1){d[ni0]=1;q.push(ni0);}
  }
  for(var head=0;head<q.length;head++){
    var c=q[head],cx=c%GW,cy=(c/GW)|0,dc=d[c]+1;
    for(var k=0;k<4;k++){
      var nx=cx+(k===0?1:(k===1?-1:0)),ny=cy+(k===2?1:(k===3?-1:0));
      if(nx<0||ny<0||nx>=GW||ny>=GH||!grid[ny][nx])continue;
      var ni=nx+ny*GW;
      if(d[ni]===-1&&!FURNG[ni]){d[ni]=dc;q.push(ni);}
    }
  }
}
function flowDir(x,y){
  var cx=clamp((x/TILE)|0,0,GW-1),cy=clamp((y/TILE)|0,0,GH-1);
  var here=FLOW.d[cx+cy*GW];
  if(here===-1)return null;
  var best=here,bx=cx,by=cy;
  for(var dy=-1;dy<=1;dy++)for(var dx=-1;dx<=1;dx++){
    if(!dx&&!dy)continue;
    var nx=cx+dx,ny=cy+dy;
    if(nx<0||ny<0||nx>=GW||ny>=GH||!grid[ny][nx])continue;
    if(dx&&dy&&(!grid[cy][nx]||!grid[ny][cx]))continue;
    var nd=FLOW.d[nx+ny*GW];
    if(nd!==-1&&nd<best){best=nd;bx=nx;by=ny;}
  }
  if(bx===cx&&by===cy)return null;
  return Math.atan2((by+0.5)*TILE-y,(bx+0.5)*TILE-x);
}


// ---- темы локаций: каждый спринт — новый офис в своей стилистике ----
var THEMES=[
 {name:'Пурпурный опенспейс',floor:'#171226',alt:'#1b1630',corr:'#120e20',corrAlt:'#150f28',wall:'#0d0a18',wallIn:'#181231',neonA:'#e83a9c',neonB:'#1fc4ae',steel:'#41336a'},
 {name:'Ретро-архив',floor:'#1c1424',alt:'#221832',corr:'#150f1e',corrAlt:'#191226',wall:'#0d0916',wallIn:'#1a1230',neonA:'#ff8a3d',neonB:'#c43ed8',steel:'#4e3660'},
 {name:'Фиолетовый корпоратив',floor:'#131028',alt:'#171340',corr:'#0e0b20',corrAlt:'#110e2c',wall:'#0a0818',wallIn:'#161244',neonA:'#7a6aff',neonB:'#2ab8d8',steel:'#302c62'},
 {name:'Мятная лаборатория',floor:'#122020',alt:'#16282a',corr:'#0d181a',corrAlt:'#101e20',wall:'#081212',wallIn:'#123032',neonA:'#2ee8a8',neonB:'#b8e83a',steel:'#24504a'},
 {name:'Розовая тревога',floor:'#1e0f1c',alt:'#251424',corr:'#170b16',corrAlt:'#1c0e1b',wall:'#0e0710',wallIn:'#221028',neonA:'#ff2a7a',neonB:'#ff8a3d',steel:'#5c2450'}
];
var MAPTHEME=THEMES[0];

// имя темы по сиду без постройки карты (первый rnd() после посева = выбор темы)
function themeNameFor(seed){
  _seed=(seed>>>0)||1;
  return THEMES[(rnd()*THEMES.length)|0].name;
}

// ---- туман войны (герои-3 стиль): терра инкогнита + затемнённая обстановка + обзор ----
var FOG={explored:new Uint8Array(GW*GH),vis:new Uint8Array(GW*GH),t:0,dirty:true};
var SIGHT_TILES=5.5; // радиус обзора в тайлах
function segHitsRect(x1,y1,x2,y2,r){
  var dx=x2-x1,dy=y2-y1,t0=0,t1=1;
  var px=[-dx,dx,-dy,dy],qx=[x1-r.x,r.x+r.w-x1,y1-r.y,r.y+r.h-y1];
  for(var i=0;i<4;i++){
    if(px[i]===0){if(qx[i]<0)return false;}
    else{var tt=qx[i]/px[i];
      if(px[i]<0){if(tt>t1)return false;if(tt>t0)t0=tt;}
      else{if(tt<t0)return false;if(tt<t1)t1=tt;}
    }
  }
  return true;
}
function losClear(x1,y1,x2,y2,solid){
  if(!WBUCK){
    for(var i0=0;i0<WALLS.length;i0++){
      if(WALLS[i0].glass&&!solid)continue;
      if(segHitsRect(x1,y1,x2,y2,WALLS[i0]))return false;
    }
    return true;
  }
  _losStamp++;
  var dx=x2-x1,dy=y2-y1,steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/24));
  for(var s=0;s<=steps;s++){
    var px=x1+dx*s/steps,py=y1+dy*s/steps;
    var tx=clamp((px/TILE)|0,0,GW-1),ty=clamp((py/TILE)|0,0,GH-1);
    for(var oy=-1;oy<=1;oy++)for(var ox=-1;ox<=1;ox++){
      var bx=tx+ox,by=ty+oy;
      if(bx<0||by<0||bx>=GW||by>=GH)continue;
      var bk=WBUCK[bx+by*GW];
      if(!bk)continue;
      for(var wi=0;wi<bk.length;wi++){var W2=bk[wi];
        if((W2.glass&&!solid)||W2._st===_losStamp)continue;
        W2._st=_losStamp;
        if(segHitsRect(x1,y1,x2,y2,W2))return false;
      }
    }
  }
  return true;
}
function resetFog(){
  for(var i=0;i<GW*GH;i++){FOG.explored[i]=0;FOG.vis[i]=0;}
  FOG.dirty=true;
}
function computeVis(px,py){
  for(var i=0;i<GW*GH;i++)FOG.vis[i]=0;
  var cx=(px/TILE)|0,cy=(py/TILE)|0;
  var R=SIGHT_TILES;
  for(var dy=-6;dy<=6;dy++)for(var dx=-6;dx<=6;dx++){
    var tx=cx+dx,ty=cy+dy;
    if(tx<0||ty<0||tx>=GW||ty>=GH)continue;
    if(dx*dx+dy*dy>R*R)continue;
    if(!grid[ty][tx])continue;
    var tcx=(tx+0.5)*TILE,tcy=(ty+0.5)*TILE;
    // угол тайла чуть ближе к игроку — смягчает «ступеньки» у кромок
    var mx=tcx+(px-tcx)*0.15,my=tcy+(py-tcy)*0.15;
    if(losClear(px,py,mx,my)){
      var ti=tx+ty*GW;
      FOG.vis[ti]=1;FOG.explored[ti]=1;
    }
  }
  FOG.dirty=true;
}
function tileVis(x,y){
  var tx=(x/TILE)|0,ty=(y/TILE)|0;
  if(tx<0||ty<0||tx>=GW||ty>=GH)return 0;
  return FOG.vis[tx+ty*GW];
}
function tileExplored(x,y){
  var tx=(x/TILE)|0,ty=(y/TILE)|0;
  if(tx<0||ty<0||tx>=GW||ty>=GH)return 0;
  return FOG.explored[tx+ty*GW];
}

function blockedAt(x,y,r){
  if(x<r||x>MAP_W-r||y<r||y>MAP_H-r)return true;
  for(var i=0;i<OBST.length;i++){var o=OBST[i];
    var cx=clamp(x,o.x,o.x+o.w),cy=clamp(y,o.y,o.y+o.h),dx=x-cx,dy=y-cy;
    if(dx*dx+dy*dy<r*r)return true;
  }return false;
}
function freeSpotNear(x,y,minD,maxD,r){
  for(var t=0;t<80;t++){
    var px=40+r+R()*(MAP_W-80-2*r),py=40+r+R()*(MAP_H-80-2*r);
    var d=Math.hypot(px-x,py-y);
    if(d>=minD&&d<=maxD&&!blockedAt(px,py,r+8)&&reachOK(px,py))return{x:px,y:py};
  }
  // фолбэк: досягаемый тайл из REACH_LIST, ближайший к желаемой дистанции
  var best=null,bd=1e18;
  for(var i=0;i<REACH_LIST.length;i++){var tl=REACH_LIST[i];
    var dd=Math.abs(Math.hypot(tl.x-x,tl.y-y)-minD);
    if(dd<bd&&!blockedAt(tl.x,tl.y,r+8)){bd=dd;best=tl;}}
  if(best)return{x:best.x,y:best.y};
  return{x:clamp(x+300,60,MAP_W-60),y:clamp(y,60,MAP_H-60)};
}
function lobbySpawn(){
  for(var i=0;i<ROOMS.length;i++)if(ROOMS[i].type==='lobby')return ROOMS[i];
  return ROOMS[0]||{x:MAP_W/2,y:MAP_H/2,w:200,h:200};
}
function bossArena(){
  var best=ROOMS[0];
  for(var i=1;i<ROOMS.length;i++)if(ROOMS[i].w*ROOMS[i].h>best.w*best.h)best=ROOMS[i];
  return best;
}

// ============================== movement ==============================
function collideMove(e,dx,dy){
  e.x+=dx;e.y+=dy;
  e.x=clamp(e.x,e.r,MAP_W-e.r);e.y=clamp(e.y,e.r,MAP_H-e.r);
  for(var i=0;i<OBST.length;i++){var o=OBST[i];
    var cx=clamp(e.x,o.x,o.x+o.w),cy=clamp(e.y,o.y,o.y+o.h),ddx=e.x-cx,ddy=e.y-cy;
    var d2=ddx*ddx+ddy*ddy;
    if(d2<e.r*e.r){
      var d=Math.sqrt(d2);
      if(d<0.001){e.y=o.y-e.r;continue;}
      var push=e.r-d;e.x+=ddx/d*push;e.y+=ddy/d*push;
    }
  }
}
function inZone(x,y){
  for(var i=0;i<G.zones.length;i++){var z=G.zones[i];if(z.friendly)continue;if(x>z.x&&x<z.x+z.w&&y>z.y&&y<z.y+z.h)return true;}
  return false;
}
