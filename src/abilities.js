'use strict';

function tryPrimary(p){
  if(p.cd1>0)return;
  var C=CLS[p.cls];
  if(p.cls==='mgr'||p.cls==='mkt'){
    p.cd1=C.s1.cd*p.cdMult;p.atkT=0.18;
    var a=p.aim,spd=p.cls==='mgr'?470:540;
    var pk2=p.cls==='mgr'?'ticket':['tw','tg','ig'][(R()*3)|0];
    var shot=function(ang){
      G.projs.push({id:++G.pkSeq,kind:pk2,x:p.x+Math.cos(ang)*22,y:p.y+Math.sin(ang)*22,vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd,dmg:(p.cls==='mgr'?9:8)*p.dmgMult,life:1.5,rot:R()*TAU,split:p.splitShot?1:0});
    };
    shot(a);
    if(p.dblShot)shot(a+(p.cls==='mgr'?0.12:0.09));
    if(p.cls==='mgr'){SFX.whoosh();SFX.stapler();}
    else{
      G.fx.push({type:'spamcone',x:p.x+Math.cos(a)*20,y:p.y+Math.sin(a)*20,a:a,len:60,hw:26,t:0,life:0.28});
      G.fx.push({type:'smoke',x:p.x+Math.cos(a)*18,y:p.y+Math.sin(a)*18,t:0,life:0.6});
      SFX.notif();
    }
  }else{
    p.cd1=C.s1.cd*p.cdMult;p.atkT=0.18;
    var arc=p.cls==='dsn'?110:130,rad=p.cls==='dsn'?74:86;
    var swing=function(mult){
      G.fx.push({type:'slash',cls:p.cls,x:p.x,y:p.y,a:p.aim,arc:arc*Math.PI/180,rad:rad,t:0,life:0.16});
      NET.events.push({k:'slash',cls:p.cls,x:Math.round(p.x),y:Math.round(p.y),a:p.aim,arc:arc,rad:rad});
      meleeArc(p,arc*Math.PI/180,rad,(p.cls==='dsn'?11:14)*mult,p.cls==='dsn'?120:150,0);
    };
    swing(1);
    if(p.echoSwing)schedule(function(){swing(0.6);SFX.swing();},0.18);
    SFX.swing();
    if(p.cls==='dev'){
      if(R()<0.6)SFX.clack();
      var kx0=p.x+Math.cos(p.aim)*rad*0.8,ky0=p.y+Math.sin(p.aim)*rad*0.8;
      for(var kk=0;kk<3;kk++)G.fx.push({type:'keycap',x:kx0,y:ky0,a:p.aim+(kk-1)*0.55,dst:24+R()*20,t:0,life:0.45,ch:'QWERTY'[(R()*6)|0]});
      if(R()<0.3)floatText(kx0,ky0-10,'ERROR 404','#f2c17e',11);
    }else if(p.cls==='dsn'){
      var px4=p.x+Math.cos(p.aim)*rad,py4=p.y+Math.sin(p.aim)*rad;
      G.fx.push({type:'cmyk',x:px4,y:py4,a:p.aim,t:0,life:0.4});
      G.fx.push({type:'paint',x:px4,y:py4,r:9+R()*5,col:['#b85f7a','#5fa8b8','#c4a94e'][(R()*3)|0],t:0,life:0.5});
    }
  }
}
function trySecondary(p){
  if(p.cd2>0)return;
  var C=CLS[p.cls];
  if(p.cls==='mgr'){
    if(!spendCoffee(p,C.s2.cost))return;
    p.cd2=C.s2.cd*p.cdMult;p.atkT=0.2;
    G.fx.push({type:'slash',cls:p.cls,x:p.x,y:p.y,a:p.aim,arc:100*Math.PI/180,rad:80,t:0,life:0.18,big:true});
    NET.events.push({k:'slash',cls:p.cls,x:Math.round(p.x),y:Math.round(p.y),a:p.aim,arc:100,rad:80,big:1});

    var gx0=p.x+Math.cos(p.aim)*62,gy0=p.y+Math.sin(p.aim)*62;
    G.fx.push({type:'grid',x:gx0,y:gy0,r:84,t:0,life:0.55});
    floatText(gx0-14,gy0-8,'%','#c4574e',14);
    floatText(gx0+16,gy0+6,'%','#c4574e',12);
    SFX.thudFlesh();
    meleeArc(p,100*Math.PI/180,80,22,280,0);
  }else if(p.cls==='dev'){
    if(!spendCoffee(p,C.s2.cost))return;
    p.cd2=C.s2.cd*p.cdMult;p.atkT=0.2;
    G.fx.push({type:'ring',x:p.x,y:p.y,rad:10,radMax:100,t:0,life:0.3});
    NET.events.push({k:'ring',x:Math.round(p.x),y:Math.round(p.y),rm:100});
    G.shake+=4;SFX.slam();
    for(var kb=0;kb<5;kb++)G.fx.push({type:'keycap',x:p.x,y:p.y,a:kb*TAU/5,t:0,life:0.5,dst:26+R()*16,ch:'ASDFG'[kb]});
    for(var i=0;i<G.mobs.length;i++){var m=G.mobs[i];
      if(dist(p,m)<100+m.r){var a=angTo(p,m);damageMob(m,30*p.dmgMult,Math.cos(a)*360,Math.sin(a)*360,0.8);}
    }
    if(G.boss&&dist(p,G.boss)<100+G.boss.r)damageMob(G.boss,30*p.dmgMult,0,0,0);
    aoeFurn(p.x,p.y,110,30*p.dmgMult);
  }else if(p.cls==='mkt'){
    if(!spendCoffee(p,C.s2.cost))return;
    p.cd2=C.s2.cd*p.cdMult;p.atkT=0.25;p.castT=0.3;

    G.fx.push({type:'ring',x:p.x,y:p.y,rad:240,radMax:40,t:0,life:0.35,purple:true});
    NET.events.push({k:'ring',x:Math.round(p.x),y:Math.round(p.y),rm:240,rv:40,purple:1});
    SFX.whoosh();
    for(i=0;i<G.mobs.length;i++){var m2=G.mobs[i];
      var d2=dist(p,m2);
      if(d2<260+m2.r&&Math.abs(angDiff(p.aim,angTo(p,m2)))<0.9){
        var a2=angTo(m2,p);
        m2.kx+=Math.cos(a2)*300;m2.ky+=Math.sin(a2)*300;
        damageMob(m2,6*p.dmgMult,0,0,0);
      }
    }
    if(G.boss&&dist(p,G.boss)<260+G.boss.r&&Math.abs(angDiff(p.aim,angTo(p,G.boss)))<0.9)damageMob(G.boss,6*p.dmgMult,0,0,0);
  }else{
    if(!spendCoffee(p,C.s2.cost))return;
    p.cd2=C.s2.cd*p.cdMult;p.atkT=0.25;
    G.fx.push({type:'slash',cls:p.cls,x:p.x,y:p.y,a:p.aim,arc:200*Math.PI/180,rad:95,t:0,life:0.2,big:true});
    NET.events.push({k:'slash',cls:p.cls,x:Math.round(p.x),y:Math.round(p.y),a:p.aim,arc:200,rad:95,big:1});
    G.fx.push({type:'cmyk',x:p.x+Math.cos(p.aim)*70,y:p.y+Math.sin(p.aim)*70,a:p.aim,t:0,life:0.45});
    G.shake+=3;SFX.bell();SFX.slam();
    meleeArc(p,200*Math.PI/180,95,10,430,0);
  }
}
function trySkill(p){
  if(p.cdQ>0||p.qT>0)return;
  var C=CLS[p.cls];
  if(p.cls==='mgr'){
    if(!spendCoffee(p,C.ult.cost))return;
    p.shield=4.5;p.cdQ=C.ult.cd*p.cdMult;p.castT=0.5;
    G.fx.push({type:'ring',x:p.x,y:p.y,rad:20,radMax:300,t:0,life:0.5,blue:true});
    NET.events.push({k:'ring',x:Math.round(p.x),y:Math.round(p.y),rm:300,blue:1});
    floatText(p.x,p.y-40,'«у меня созвон»','#7aa2c8',15);
    SFX.ring();
  }else if(p.cls==='dev'){
    if(!spendCoffee(p,C.ult.cost))return;
    p.qT=3.2;p.qPulse=0;p.cdQ=C.ult.cd*p.cdMult;p.castT=0.5;
    floatText(p.x,p.y-40,'клац-клац-клац','#d29922',15);
    SFX.clacks(14);
  }else if(p.cls==='mkt'){
    if(!spendCoffee(p,C.ult.cost))return;
    p.cdQ=C.ult.cd*p.cdMult;p.castT=0.5;
    var hit=0;
    for(var i=0;i<G.mobs.length;i++){var m=G.mobs[i];
      if(dist(p,m)<420+m.r){m.cf=4;m.aggro=false;hit++;}
    }
    G.fx.push({type:'ring',x:p.x,y:p.y,rad:30,radMax:420,t:0,life:0.6,purple:true});
    NET.events.push({k:'ring',x:Math.round(p.x),y:Math.round(p.y),rm:420,purple:1});
    floatText(p.x,p.y-40,'РЕБРЕНДИНГ!','#c8a2e0',16);
    SFX.grade();
    if(hit)floatText(p.x,p.y-58,'мобы в замешательстве','#c8a2e0',11);
  }else{
    if(!spendCoffee(p,C.ult.cost))return;
    p.cdQ=C.ult.cd*p.cdMult;p.castT=0.6;
    G.fx.push({type:'ring',x:p.x,y:p.y,rad:20,radMax:330,t:0,life:0.5,yellow:true});
    NET.events.push({k:'ring',x:Math.round(p.x),y:Math.round(p.y),rm:330,yellow:1});
    var cols=['#e5534b','#d29922','#7aa2c8','#3fb950','#c8a2e0'];
    for(i=0;i<10;i++){
      var sa=R()*TAU,sr2=60+R()*250;
      G.fx.push({type:'paint',x:p.x+Math.cos(sa)*sr2,y:p.y+Math.sin(sa)*sr2,r:6+R()*10,col:cols[(R()*5)|0],t:0,life:0.8+R()*0.5});
    }
    G.shake+=6;SFX.slam();SFX.clacks(6);
    for(i=0;i<G.mobs.length;i++){var m3=G.mobs[i];
      if(dist(p,m3)<330+m3.r)damageMob(m3,20*p.dmgMult,0,0,1.3);
    }
    if(G.boss&&dist(p,G.boss)<330+G.boss.r)damageMob(G.boss,20*p.dmgMult,0,0,0);
    aoeFurn(p.x,p.y,340,20*p.dmgMult);
    floatText(p.x,p.y-40,'мудборд!!','#d29922',16);
  }
}
function tryDodge(p){
  if(p.cdD>0||p.dead)return;
  p.cdD=2.6*(p.dodgeCdMult||1);
  var l=Math.hypot(p.ix,p.iy);
  var dx=l>0.01?p.ix/l:Math.cos(p.aim),dy=l>0.01?p.iy/l:Math.sin(p.aim);
  if(p.dashTrail)G.zones.push({id:++G.pkSeq,x:p.x-20,y:p.y-20,w:40,h:40,t:0,life:1.6,friendly:true,dmg:9*p.dmgMult});
  p.kx+=dx*1150;p.ky+=dy*1150;
  p.inv=Math.max(p.inv,0.45);
  G.fx.push({type:'ring',x:p.x,y:p.y,rad:12,radMax:70,t:0,life:0.35,cyan:true});
  NET.events.push({k:'ring',x:Math.round(p.x),y:Math.round(p.y),rm:70});
  SFX.dodge();
}
function tryUlt(p){
  if(p.dead)return;
  if(G.wave<G.ultAt){floatText(p.x,p.y-48,'СУПЕР откроется на '+G.ultAt+'-м спринте','#8b949e',13);return;}
  if(p.cdU>0)return;
  if((p.superC||0)<1){floatText(p.x,p.y-48,'СУПЕР не заряжен — бей стажёров','#8b949e',13);return;}
  p.superC=0;
  p.cdU=25*p.cdMult;p.castT=0.6;
  if(p.cls==='mgr'){
    G.plan=8;
    for(var i=0;i<G.players.length;i++){var pl=G.players[i];
      G.fx.push({type:'ring',x:pl.x,y:pl.y,rad:16,radMax:150,t:0,life:0.7,gold:true});
      floatText(pl.x,pl.y-52,'+50% урона','#ffcf5c',14);
    }
    msg('ПЛАНИРОВКА: команда усилилась',3);SFX.plan();
  }else if(p.cls==='dev'){
    p.root=1.3;G.shake+=9;
    for(i=0;i<26;i++){var ka=(i/26)*TAU;
      G.projs.push({id:++G.pkSeq,kind:'key',x:p.x,y:p.y,vx:Math.cos(ka)*300,vy:Math.sin(ka)*300,dmg:16*p.dmgMult,life:0.95,rot:R()*TAU,lt:(R()*26|0)});
    }
    SFX.clacks(10);SFX.slam();
    floatText(p.x,p.y-52,'ВЫГОРАНИЕ!','#e5534b',18);
  }else if(p.cls==='dsn'){
    G.demon={x:p.x,y:p.y-30,t:10,cd:0.8,owner:p,ph:0};
    SFX.demon();
    floatText(p.x,p.y-52,'Comic Sans призван','#e88ac8',16);
  }else{
    var zx=clamp(p.x+Math.cos(p.aim)*240-140,40,MAP_W-320),zy=clamp(p.y+Math.sin(p.aim)*240-140,40,MAP_H-320);
    G.zones.push({id:++G.pkSeq,x:zx,y:zy,w:280,h:280,t:0,life:6,friendly:true});
    G.sepT=2.8;SFX.shufut();
    floatText(p.x,p.y-52,'РЕКЛАМНАЯ КАМПАНИЯ','#e8894a',16);
  }
}
function trySkill2(p){
  if(p.cdS>0)return;
  var C=CLS[p.cls];
  if(p.cls==='mgr'){
    if(!spendCoffee(p,C.sk.cost))return;
    p.cdS=C.sk.cd*p.cdMult;p.castT=0.4;
    var buffed=0;
    for(var i=0;i<G.players.length;i++){var pl=G.players[i];
      if(pl.dead)continue;
      if(dist(p,pl)<230||pl===p){
        pl.haste=3.5;buffed++;
        G.fx.push({type:'ring',x:pl.x,y:pl.y,rad:8,radMax:52,t:0,life:0.4,green:true});
        NET.events.push({k:'ring',x:Math.round(pl.x),y:Math.round(pl.y),rm:52,green:1});
      }
    }
    floatText(p.x,p.y-40,'АСАП ×'+buffed,'#8bd17c',13,'S');
    SFX.grade();
  }else if(p.cls==='dev'){
    if(!spendCoffee(p,C.sk.cost))return;
    p.cdS=C.sk.cd*p.cdMult;p.castT=0.5;
    var seat=-1;
    for(i=0;i<G.players.length;i++)if(G.players[i]===p)seat=i;
    var chained=0,dmg=4*p.dmgMult;
    for(i=0;i<G.mobs.length&&chained<6;i++){var m=G.mobs[i];
      if(dist(p,m)<320+m.r&&m.ch<=0){
        m.ch=4;m.chTick=0;m.chDmg=dmg;m.chSrc=seat;chained++;
      }
    }
    floatText(p.x,p.y-40,'легаси ×'+chained,'#a08c5a',12,'D');
    G.fx.push({type:'ring',x:p.x,y:p.y,rad:20,radMax:320,t:0,life:0.4,yellow:true});
    NET.events.push({k:'ring',x:Math.round(p.x),y:Math.round(p.y),rm:320,yellow:1});
    SFX.clacks(8);SFX.slam();
    if(!chained)floatText(p.x,p.y-36,'не нашлось целей','#8b949e',11);
  }else if(p.cls==='mkt'){
    if(!spendCoffee(p,C.sk.cost))return;
    p.cdS=C.sk.cd*p.cdMult;p.castT=0.4;
    var marked=0;
    for(i=0;i<G.mobs.length&&marked<5;i++){var m2=G.mobs[i];
      if(dist(p,m2)<360+m2.r&&m2.mk<=0){
        m2.mk=5;marked++;
      }
    }
    floatText(p.x,p.y-40,'в таргете ×'+marked,'#e07050',12,'D');
    G.fx.push({type:'ring',x:p.x,y:p.y,rad:20,radMax:360,t:0,life:0.4,red:true});
    NET.events.push({k:'ring',x:Math.round(p.x),y:Math.round(p.y),rm:360,red:1});
    SFX.ring();
    if(!marked)floatText(p.x,p.y-36,'аудитория не найдена','#8b949e',11);
  }else{
    if(!spendCoffee(p,C.sk.cost))return;
    p.cdS=C.sk.cd*p.cdMult;p.atkT=0.25;
    G.fx.push({type:'ring',x:p.x,y:p.y,rad:20,radMax:300,t:0,life:0.45,yellow:true});
    NET.events.push({k:'ring',x:Math.round(p.x),y:Math.round(p.y),rm:300,yellow:1});
    G.shake+=5;SFX.slam();SFX.grade();
    var pushed=0;
    for(i=0;i<G.mobs.length;i++){var m4=G.mobs[i];
      if(dist(p,m4)<300+m4.r){
        var a4=angTo(p,m4);
        m4.kx+=Math.cos(a4)*560;m4.ky+=Math.sin(a4)*560;
        if(m4.wu>0){m4.wu=0;m4.cd=Math.max(m4.cd,1.2);}
        damageMob(m4,12*p.dmgMult,0,0,0);pushed++;
      }
    }
    if(G.boss&&dist(p,G.boss)<300+G.boss.r)damageMob(G.boss,12*p.dmgMult,0,0,0);
    floatText(p.x,p.y-40,'ЛОГОТИП ПОБОЛЬШЕ!!','#d29922',14);
    if(!pushed)floatText(p.x,p.y-56,'критики не нашли','#8b949e',11);
  }
}
function drinkCoffee(p,cp){
  cp.charges--;cp.t=90;
  p.burnout=Math.max(0,p.burnout-18);
  p.coffee=Math.min(p.coffeeMax,p.coffee+45);
  floatText(p.x,p.y-34,'+кофе, −выгорание','#8bd17c',14);
  SFX.slurp();
  G.fx.push({type:'ring',x:p.x,y:p.y,rad:8,radMax:56,t:0,life:0.4,green:true});
}
