'use strict';

function nearestPlayerTo(e){
  var best=null,bd=1e9;
  for(var i=0;i<G.players.length;i++){var p=G.players[i];
    if(p.dead)continue;
    var d=dist(e,p);
    if(d<bd){bd=d;best=p;}
  }
  return best;
}
function updatePlayer(p,dt){
  if(p.dead){
    p.respT+=dt;
    if(p.respT>=9){
      p.dead=false;p.burnout=55;p.coffee=50;p.inv=1.5;p.kx=0;p.ky=0;
      var lb=lobbySpawn();
      var sp=snapReachable({x:lb.x+lb.w/2,y:lb.y+lb.h/2});
      p.x=sp.x;p.y=sp.y;
      floatText(p.x,p.y-40,'вышел из отпуска','#8bd17c',13);
    }
    return;
  }
  var l=Math.hypot(p.ix,p.iy);
  p.moving=l>0.01;
  if(p.haste>0)p.haste-=dt;
  if(p.castT>0)p.castT-=dt;

  p.adr=p.burnout>80;
  p.dmgMult=(1+0.08*(G.grade-1))*(1+0.07*(G.level-1))*(1+(p.dmgBonus||0))*(G.plan>0?1.5:1)*(p.adr?1:1)*(1+0.03*(G.combo||0));
  if(p.adr)p.burnout=Math.min(100,p.burnout+1.0*dt);
  if(p.root>0)p.root-=dt;
  if(p.cdU>0)p.cdU-=dt;
  if(p.moving&&!(p.root>0)){
    var spd=p.spd*p.spdMult*(p.haste>0?1.55:1)*(p.adr?1.15:1)*(G.plan>0?1.15:1)*(inZone(p.x,p.y)?0.55:1)*Math.min(1,l);
    collideMove(p,p.ix/l*spd*dt,p.iy/l*spd*dt);
    p.step+=dt*spd*0.012;
  }
  collideMove(p,p.kx*dt,p.ky*dt);p.kx*=Math.exp(-7*dt);p.ky*=Math.exp(-7*dt);
  p.x=clamp(p.x,p.r,MAP_W-p.r);p.y=clamp(p.y,p.r,MAP_H-p.r);
  p.face=p.aim;
  p.hintT=Math.max(0,(p.hintT||0)-dt);
  p.cd1-=dt;p.cd2-=dt;p.cdQ-=dt;p.cdS-=dt;p.inv-=dt;p.atkT=Math.max(0,p.atkT-dt);p.flash=Math.max(0,p.flash-dt*3);
  p.coffee=Math.min(p.coffeeMax,p.coffee+(2.2+(p.coffeeRegen||0))*dt);
  if(p.shield>0){
    p.shield-=dt;
    for(var i=0;i<G.mobs.length;i++){var m=G.mobs[i];
      var d=dist(p,m);
      if(d<300+m.r){var a=angTo(p,m);m.kx+=Math.cos(a)*260*dt*60*0.12;m.ky+=Math.sin(a)*260*dt*60*0.12;}
    }
  }
  if(p.qT>0){
    p.qT-=dt;p.qPulse-=dt;
    if(p.qPulse<=0){
      p.qPulse=0.8;
      G.fx.push({type:'ring',x:p.x,y:p.y,rad:30,radMax:260,t:0,life:0.4,yellow:true});
      NET.events.push({k:'ring',x:Math.round(p.x),y:Math.round(p.y),rm:260,yellow:1});
      SFX.clacks(5);
      for(i=0;i<G.mobs.length;i++){var m2=G.mobs[i];
        if(dist(p,m2)<260+m2.r)damageMob(m2,8*p.dmgMult,0,0,1.7);
      }
      if(G.boss&&dist(p,G.boss)<260+G.boss.r)damageMob(G.boss,8*p.dmgMult,0,0,0);
    }
  }
  if(p.burnout>70){p.heart-=dt;if(p.heart<=0){p.heart=0.9;SFX.heart();}}
  if(p.f1)tryPrimary(p);
  if(p.f2)trySecondary(p);
  if(p.sk)tryDodge(p);
  if(p.fk)trySkill(p);
  if(p.sk2)trySkill2(p);
  if(p.ult){p.ult=false;tryUlt(p);}
  if(p.cdD>0)p.cdD-=dt;
  for(i=0;i<COFFEES.length;i++){var cp=COFFEES[i];
    if(cp.charges>0&&dist(p,cp)<58&&(p.burnout>2||p.coffee<p.coffeeMax-2)){drinkCoffee(p,cp);}
  }
}

function steerMove(m,ux,uy,step){
  var probes=[0,-0.7,0.7,-1.35,1.35];
  for(var i=0;i<probes.length;i++){
    var a=Math.atan2(uy,ux)+probes[i];
    var ox=m.x,oy=m.y;
    collideMove(m,Math.cos(a)*step,Math.sin(a)*step);
    if(Math.hypot(m.x-ox,m.y-oy)>step*0.45)return;
    m.x=ox;m.y=oy;
  }
  collideMove(m,ux*step,uy*step);
}
function updateMobs(dt){
  for(var i=0;i<G.mobs.length;i++){var m=G.mobs[i];
    if(m.dead)continue;

    if(!m.dead&&m.aggro){
      if(m._stuckT===undefined){m._stuckT=0;m._sx=m.x;m._sy=m.y;m._trav=0;}
      m._trav+=Math.hypot(m.x-m._sx,m.y-m._sy);
      m._sx=m.x;m._sy=m.y;
      m._stuckT+=dt;
      if(m._stuckT>=1.2){
        var tgtP=nearestPlayerTo(m);
        if(m._trav<26&&tgtP&&dist(m,tgtP)>90&&m.stun<=0&&m.cf<=0){
          var tp=freeSpotNear(tgtP.x,tgtP.y,260,420,m.r);
          if(tp){
            G.fx.push({type:'flash',x:m.x,y:m.y,r:40,t:0,life:0.2});
            m.x=tp.x;m.y=tp.y;m.kx=0;m.ky=0;
            G.fx.push({type:'ring',x:m.x,y:m.y,rad:8,radMax:60,t:0,life:0.3,purple:true});
          }
        }
        m._stuckT=0;m._trav=0;
      }
    }
    if(m.dead)continue;
    m.cd-=dt;
    if(m.fade>0)m.fade-=dt;
    if(m.dmgT>0){
      m.dmgT-=dt;
      if(m.dmgT<=0&&m.dmgAcc>0){
        floatText(m.x+(R()*14-7),m.y-m.r-6,m.dmgHits>1?Math.round(m.dmgAcc)+'×'+m.dmgHits:''+Math.round(m.dmgAcc),'#dfe6ee',12,'D');
        SFX.hit();
        m.dmgAcc=0;m.dmgHits=0;
      }
    }
    if(m.aggro||m.type==='deadline')m.step=(m.step||0)+dt*m.spd*0.055;
    if(m.mk>0)m.mk-=dt;
    if(m.ch>0){
      m.ch-=dt;m.chTick-=dt;
      if(m.chTick<=0){m.chTick=0.5;
        m.hp-=m.chDmg;
        m.dmgAcc=(m.dmgAcc||0)+m.chDmg;m.dmgHits=(m.dmgHits||0)+1;m.dmgT=0.25;
        if(m.hp<=0&&!m.dead){m.dead=true;killMob(m);continue;}}
    }
    if(m.stun>0){m.stun-=dt;continue;}
    collideMove(m,m.kx*dt,m.ky*dt);m.kx*=Math.exp(-8*dt);m.ky*=Math.exp(-8*dt);
    var slow=(m.ch>0?0.4:1)*(inWater(m.x,m.y)?0.55:1)*(G.rushT>0?1.3:1)*(G.wave>=4&&G.mobs.length>6?1.08:1);
    if(m.cf>0){
      m.cf-=dt;m.aggro=false;
      m.wt-=dt;
      if(m.wt<=0){m.wt=0.5+R()*0.8;m.wx=R()*2-1;m.wy=R()*2-1;}
      m.face=Math.atan2(m.wy,m.wx);
      steerMove(m,m.wx,m.wy,m.spd*0.6*slow*dt);
      continue;
    }
    var tgt=nearestPlayerTo(m);
    if(!tgt)continue;
    var d=dist(m,tgt);
    if(m.type==='deadline'){
      var a=(d>90&&flowDir(m.x,m.y)!==null)?flowDir(m.x,m.y):angTo(m,tgt);
      m.face=angTo(m,tgt);
      steerMove(m,Math.cos(a),Math.sin(a),m.spd*slow*dt);
      m.emb-=dt;
      if(m.emb<=0){m.emb=0.07;
        G.fx.push({type:'ember',x:m.x+R()*10-5,y:m.y+R()*10-5,vx:R()*20-10,vy:-30-R()*20,t:0,life:0.5,r:2+R()*3});
      }
      if(d<m.r+tgt.r+4){
        addBurnout(tgt,12+1.1*G.wave,'deadline');
        G.fx.push({type:'ring',x:m.x,y:m.y,rad:6,radMax:76,t:0,life:0.35,orange:true});
        G.fx.push({type:'flash',x:m.x,y:m.y,r:60,t:0,life:0.22});
        for(var e2=0;e2<14;e2++)G.fx.push({type:'ember',x:m.x,y:m.y,vx:R()*260-130,vy:R()*260-130,t:0,life:0.6,r:2+R()*4});
        NET.events.push({k:'ring',x:Math.round(m.x),y:Math.round(m.y),rm:76,orange:1});
        NET.events.push({k:'hs',v:0.05});
        G.shake+=5;G.hitStop=Math.max(G.hitStop,0.05);
        SFX.explode();m.dead=true;
      }
    }else{
      m.aggro=true;
      if(m.aggro){
        if(d>m.r+tgt.r+4){
          var a2=(d>90&&flowDir(m.x,m.y)!==null)?flowDir(m.x,m.y):angTo(m,tgt);
          m.face=angTo(m,tgt);
          steerMove(m,Math.cos(a2),Math.sin(a2),m.spd*slow*dt);
        }else if(m.wu>0){
          m.wu-=dt;
          if(m.wu<=0){
            m.cd=1.4;
            var inFlight=0;
            for(var si=0;si<STONES.length;si++)if(STONES[si].tgtId===tgt.id)inFlight++;
          if(inFlight<2+(G.wave>=6?1:0)+(G.wave>=9?1:0)){
              var snapx=tgt.x,snapy=tgt.y;
              spawnStone(m.x,m.y-12,snapx,snapy,STONEWORDS[(R()*STONEWORDS.length)|0],(7+0.7*G.wave)|0,tgt.id);
              SFX.swish&&SFX.swish();
            }
          }
        }else if(m.cd<=0&&G.wave>=2){
          m.wu=0.5;
        }
        if(!m.said&&d<300){m.said=true;if(R()<0.5&&flavorOK())floatText(m.x,m.y-24,['а дизайн уже согласовали?','у меня один вопрос…','а куда нажимать?'][(R()*3)|0],'#8b949e',11,'F');}
      }else{
        m.wt-=dt;
        if(m.wt<=0){m.wt=1+R()*2;m.wx=R()*2-1;m.wy=R()*2-1;}
        steerMove(m,m.wx,m.wy,30*slow*dt);
      }
      for(var j=i+1;j<G.mobs.length;j++){var m2=G.mobs[j];
        if(m2.dead)continue;
        var dd=dist(m,m2);
        if(dd<m.r+m2.r&&dd>0.01){
          var ax=(m.x-m2.x)/dd,ay=(m.y-m2.y)/dd,f=(m.r+m2.r-dd)*2;
          m.x+=ax*f*dt*3;m.y+=ay*f*dt*3;
        }
      }
    }
  }
  G.mobs=G.mobs.filter(function(m){return !m.dead;});
}
function updateBoss(dt){
  var b=G.boss;if(!b)return;
  var p=nearestPlayerTo(b);
  if(!p)return;

  if(b.windup<=0&&!(b.chgT>0)&&!(b.chgWind>0)) {
    if(b._sx===undefined){b._sx=b.x;b._sy=b.y;}
    var bm=Math.hypot(b.x-b._sx,b.y-b._sy);
    b._stuckT=(b._stuckT||0)+dt;
    if(b._stuckT>=1.1){
      b._stuckT=0;b._sx=b.x;b._sy=b.y;
      if(bm<60&&dist(b,p)>120){
        b._stuckN=(b._stuckN||0)+1;
        if(b._stuckN>=2){
          b._stuckN=0;
          var btp=freeSpotNear(p.x,p.y,300,520,b.r);
          G.fx.push({type:'flash',x:b.x,y:b.y,r:80,t:0,life:0.25});
          G.fx.push({type:'ring',x:btp.x,y:btp.y,rad:20,radMax:120,t:0,life:0.5,red:true});
          b.x=btp.x;b.y=btp.y;b.kx=0;b.ky=0;
          floatText(b.x,b.y-70,'АУДИТ ПЕРЕПЛАНИРОВАЛСЯ','#e5534b',13,'C');
          G.shake+=6;SFX.demon();
        }else{
          aoeFurn(b.x,b.y,110,999);
          G.shake+=8;SFX.slam();
          floatText(b.x,b.y-70,'АУДИТ НЕ ЖДЁТ','#e5534b',13,'C');
          for(var sm2=0;sm2<8;sm2++)G.fx.push({type:'paper',x:b.x,y:b.y,vx:R()*260-130,vy:R()*260-130,rot:R()*3,vr:R()*8-4,t:0,life:0.7});
        }
      }else if(bm>=60)b._stuckN=0;
    }
  }
  b.cd-=dt;b.face=angTo(b,p);b.step+=dt*2;
  b.chgCd-=dt;
  if(b.windup>0){
    b.windup-=dt;b.wuT+=dt;

    if(b.windup<=0){
      G.shake+=14;SFX.slam();
      G.hitStop=Math.max(G.hitStop,0.09);
      NET.events.push({k:'hs',v:0.09});
      G.fx.push({type:'stamp',x:b.tx,y:b.ty,rad:150+20*b.phase,t:0,life:5});
      NET.events.push({k:'stamp',x:Math.round(b.tx),y:Math.round(b.ty),rad:150+20*b.phase});
      aoeFurn(b.tx,b.ty,150+20*b.phase,60);
      var d=dist(p,{x:b.tx,y:b.ty});
      if(d<150+20*b.phase+p.r){
        addBurnout(p,30,'boss');
        var a=angTo({x:b.tx,y:b.ty},p);p.kx+=Math.cos(a)*420;p.ky+=Math.sin(a)*420;
      }
    }
    return;
  }
  if(b.chgT>0){
    b.chgT-=dt;
    collideMove(b,Math.cos(b.chgA)*320*dt,Math.sin(b.chgA)*320*dt);
    if(dist(b,p)<b.r+p.r+4&&b.cd<=0){b.cd=1.1;addBurnout(p,18,'boss');}
    if(b.chgT<=0)b.atkCd=Math.max(b.atkCd,1.2);
    return;
  }
  if(b.chgWind>0){
    b.chgWind-=dt;
    if(b.chgWind<=0){b.chgT=0.55;b.chgA=angTo(b,p);SFX.whoosh();}
    return;
  }
  var bDist=dist(b,p);
  var mvA=angTo(b,p);

  if(bDist>140&&!losClear(b.x,b.y,p.x,p.y,true)){
    var fa=flowDir(b.x,b.y);
    if(fa!==null)mvA=fa;
  }
  if(bDist>b.r+p.r+2)steerMove(b,Math.cos(mvA),Math.sin(mvA),b.spd*dt);
  b.atkCd-=dt;b.summonCd-=dt;b.tapeCd-=dt;
  if(b.hp<b.hpMax/2&&b.phase===1){
    b.phase=2;b.spd=95;
    msg('Аудит получил предписание. Аудит ускорился.',3);
  }
  if(b.atkCd<=0&&dist(b,p)<460){
    b.windup=1.0;b.wuT=0;b.tx=p.x;b.ty=p.y;
    b.atkCd=2.8-0.5*b.phase;
  }
  if(b.phase===2&&b.chgCd<=0&&bDist>260){
    b.chgCd=5;
    b.chgWind=0.6;
    floatText(b.x,b.y-70,'ПЕРЕПЛАНИРОВКА!','#e5534b',14);
  }
  if(b.summonCd<=0){
    b.summonCd=b.phase===2?7:9;
    for(var i=0;i<2;i++)spawnMob('intern');
    if(b.phase===2)spawnMob('deadline');
    floatText(b.x,b.y-60,'вызываты стажёров','#c9d1d9',12);
  }
  if(b.tapeCd<=0){
    b.tapeCd=12;
    for(i=0;i<3;i++){
      var zx=clamp(p.x+(R()*300-150),60,MAP_W-160),zy=clamp(p.y+(R()*300-150),60,MAP_H-100);
      var stacked=false;
      for(var zk=0;zk<G.zones.length;zk++){var zE=G.zones[zk];
        if(zE.friendly)continue;
        if(Math.hypot(zE.x+zE.w/2-zx,zE.y+zE.h/2-zy)<170){stacked=true;break;}
      }
      if(stacked)continue;
      G.zones.push({id:++G.pkSeq,x:zx,y:zy,w:120+R()*80,h:46+R()*30,t:0,life:5});
    }
    floatText(b.x,b.y-60,'красная лента','#e5534b',12,'I');
  }
  if(dist(b,p)<b.r+p.r+2&&b.cd<=0){b.cd=1.1;addBurnout(p,13,'boss');}
}
function updateProjs(dt){
  for(var i=0;i<G.projs.length;i++){var pr=G.projs[i];
    pr.x+=pr.vx*dt;pr.y+=pr.vy*dt;pr.life-=dt;pr.rot+=dt*12;
    var dead=pr.life<=0;
    if(!dead){
      if(pr.x<20||pr.x>MAP_W-20||pr.y<20||pr.y>MAP_H-20)dead=true;
      for(var o=0;o<WALLS.length;o++){if(inRect(pr.x,pr.y,WALLS[o])){dead=true;break;}}
      if(!dead)for(o=0;o<FURN.length;o++){var fw=FURN[o];
        if(fw.dead||!FPROPS[fw.t].solid)continue;
        if(inRect(pr.x,pr.y,fw)){damageFurn(fw,pr.dmg);dead=true;break;}
      }
    }
    if(!dead){
      for(var m=0;m<G.mobs.length;m++){var mob=G.mobs[m];
        if(dist(pr,mob)<mob.r+5){
          damageMob(mob,pr.dmg,pr.vx*0.3,pr.vy*0.3,0);
          if(pr.split&&!pr.didSplit){
            pr.didSplit=1;
            for(var sp2=0;sp2<2;sp2++){
              var na=Math.atan2(pr.vy,pr.vx)+(sp2?0.55:-0.55);
              G.projs.push({id:++G.pkSeq,kind:pr.kind,x:pr.x,y:pr.y,vx:Math.cos(na)*Math.hypot(pr.vx,pr.vy),vy:Math.sin(na)*Math.hypot(pr.vx,pr.vy),dmg:pr.dmg*0.5,life:0.8,rot:R()*TAU});
            }
          }
          dead=true;break;
        }
      }
      if(!dead&&G.boss&&dist(pr,G.boss)<G.boss.r+6){damageMob(G.boss,pr.dmg,0,0,0);dead=true;}
    }
    if(dead){G.projs.splice(i,1);i--;}
  }
}
function updateFx(dt){
  updateChaos(dt);

  var me=localPlayer();
  if(me&&!me.dead){
    for(var pi4=G.pickups.length-1;pi4>=0;pi4--){var pk=G.pickups[pi4];
      if(Math.hypot(pk.x-me.x,pk.y-me.y)<22){
        G.pickups.splice(pi4,1);
        NET.events.push({k:'pkup',id:pk.id});
        if(pk.kind==='coffee'){me.burnout=Math.max(0,me.burnout-16);me.coffee=Math.min(me.coffeeMax,me.coffee+40);SFX.slurp();}
        else if(pk.kind==='espresso'){me.coffee=me.coffeeMax;me.burnout=Math.max(0,me.burnout-15);SFX.slurp();SFX.pickup();}
        else if(pk.kind==='folder'){me.superC=Math.min(1,(me.superC||0)+(pk.s||0.5));SFX.grade();floatText(me.x,me.y-40,'папка возвращена','#8bd17c',14);}
        G.fx.push({type:'flash',x:pk.x,y:pk.y,r:24,t:0,life:0.18});
      }
    }
  }

  if(me&&!me.dead){
    G.roomT=(G.roomT||0)-dt;
    var rmNow=roomAtTile(clamp((me.x/TILE)|0,0,GW-1),clamp((me.y/TILE)|0,0,GH-1));
    if(rmNow&&rmNow!==G.lastRoom&&G.roomT<=0&&roomLabel(rmNow)!==roomLabel(G.lastRoom)){
      G.lastRoom=rmNow;G.roomT=2.5;
      floatText(me.x,me.y-34,'«'+roomLabel(rmNow)+'»','#42e0ff',13,'S');
    }else if(rmNow)G.lastRoom=rmNow;
  }

  if(me&&me.moving&&R()<0.12)
    G.fx.push({type:'paper',x:me.x+(R()*10-5),y:me.y+12,vx:R()*20-10,vy:-R()*14,rot:R()*3,vr:R()*2-1,t:0,life:0.35});
  if(me&&R()<0.0012&&flavorOK()){
    var Q={mgr:['давайте синхронизируемся','это не блокер, это возможность','у меня созвон про созвон'],
           dev:['не трогайте мой бранч','работает — не трогай','это фича, не баг','мой код компилируется с первого раза'],
           mkt:['это не фича, это гипотеза','CAC окупится к четвертому тарифу','давайте захейтим конкурентов'],
           dsn:['кегель поехал на полпикселя','это не белый, это сверхбелый','шрифт сам просит кернинг']}[me.cls];
    if(Q)floatText(me.x,me.y-44,Q[(R()*Q.length)|0],'#8bd17c',11,'F');
  }
  FOG.t-=dt;
  if(FOG.t<=0){
    FOG.t=0.12;
    var fwp=localPlayer();
    if(fwp&&!fwp.dead)computeVis(fwp.x,fwp.y);
    else for(var fi2=0;fi2<GW*GH;fi2++)FOG.vis[fi2]=0;
    FOG.dirty=true;
  }
  if(G.rushT>0)G.rushT-=dt;
  if(R()<0.0006)SFX.whisper();
  if(G.comboT>0){G.comboT-=dt;if(G.comboT<=0)G.combo=0;}
  for(var i=0;i<G.fx.length;i++){var f=G.fx[i];
    f.t+=dt;
    if(f.type==='paper'){
      f.x+=f.vx*dt;f.y+=f.vy*dt;
      if(f.st){f.vx*=0.995;f.vy*=0.995;}
      else{f.vx*=0.92;f.vy*=0.92;}
      f.rot+=f.vr*dt;
    }
    if(f.type==='ember'){f.x+=(f.vx||0)*dt;f.y+=(f.vy||0)*dt;}
    if(f.t>=f.life){G.fx.splice(i,1);i--;}
  }
  for(i=0;i<G.texts.length;i++){var t=G.texts[i];t.t+=dt;t.y+=t.vy*dt;if(t.t>=t.life){G.texts.splice(i,1);i--;}}
  for(i=0;i<G.pickups.length;i++){var pk=G.pickups[i];pk.t+=dt;if(pk.t>=pk.life){G.pickups.splice(i,1);i--;}}
  for(i=0;i<G.zones.length;i++){var z=G.zones[i];z.t+=dt;
    if(z.friendly){
      z.tk=(z.tk||0)+dt;
      if(z.tk>0.4){z.tk=0;
        for(var zm=0;zm<G.mobs.length;zm++){var mzf=G.mobs[zm];
          if(mzf.x>z.x&&mzf.x<z.x+z.w&&mzf.y>z.y&&mzf.y<z.y+z.h)damageMob(mzf,7,0,0,0.4);
        }
        if(G.boss&&G.boss.x>z.x&&G.boss.x<z.x+z.w&&G.boss.y>z.y&&G.boss.y<z.y+z.h)damageMob(G.boss,10,0,0,0);
      }
      if(R()<0.5)G.fx.push({type:'ember',x:z.x+R()*z.w,y:z.y+R()*z.h,vx:R()*30-15,vy:-20-R()*40,t:0,life:0.8});
    }
    if(z.t>=z.life){G.zones.splice(i,1);i--;}
  }
  if(G.plan>0)G.plan-=dt;
  if(G.sepT>0)G.sepT-=dt;
  if(G.demon){
    var dm=G.demon;dm.t-=dt;dm.cd-=dt;dm.ph=(dm.ph||0)+dt*2.2;
    var own=dm.owner;
    if(own&&own.dead)dm.t=Math.min(dm.t,0.5);
    if(own){var dx2=own.x+Math.cos(dm.ph)*54,dy2=own.y+Math.sin(dm.ph)*40-34;
      dm.x+=(dx2-dm.x)*Math.min(1,dt*5);dm.y+=(dy2-dm.y)*Math.min(1,dt*5);}
    if(dm.cd<=0&&NET.mode!=='guest'){
      var tgt=null,bd2=1e9;
      for(i=0;i<G.mobs.length;i++){var md=G.mobs[i];var ddd=(md.x-dm.x)*(md.x-dm.x)+(md.y-dm.y)*(md.y-dm.y);if(ddd<bd2){bd2=ddd;tgt=md;}}
      if(G.boss){var db=(G.boss.x-dm.x)*(G.boss.x-dm.x)+(G.boss.y-dm.y)*(G.boss.y-dm.y);if(db<bd2){bd2=db;tgt=G.boss;}}
      if(tgt){var da=Math.atan2(tgt.y-dm.y,tgt.x-dm.x);
        G.projs.push({id:++G.pkSeq,kind:'comic',x:dm.x,y:dm.y,vx:Math.cos(da)*430,vy:Math.sin(da)*430,dmg:12*dm.owner.dmgMult,life:1.4,rot:da});
        SFX.notif();}
      dm.cd=0.5;
    }
    if(dm.t<=0)G.demon=null;
  }
  for(i=0;i<COFFEES.length;i++){var cp=COFFEES[i];if(cp.charges<2){cp.t-=dt;if(cp.t<=0){cp.charges++;if(cp.charges<2)cp.t=90;}}}
  if(NET.mode==='solo')NET.events.length=0;
  if(G.hsCd>0)G.hsCd-=dt;
  if(G.flavorT>0)G.flavorT-=dt;
  G.shake=Math.min(10,Math.max(0,G.shake-dt*45));
  G.msgT-=dt;G.capT-=dt;
  if(G.fadeT>0)G.fadeT-=dt;
  if(G.capT<=0){
    G.capT=20+R()*12;
    G.caption=['19:04. В опенспейсе кто-то плачет. Возможно, ковролин.','Свет мигает в такт сердцебиению. Или это твоё.','В переговорке пусто. Даже эхо ушло домой.','На доске задача открыта с 2019-го. Никто не приходил.','Холодильник гудит. Он последний, кто ещё во что-то верит.','Стикер на мониторе: «вернусь через 5 минут». Прошла неделя.','Кофемашина шепчет: «и это всё, чем ты станешь».','На этаже ниже так же тихо. На всех этажах так же тихо.','Электронные часы показывают 19:04. Уже час.','Где-то звонит телефон. Никогда не возьмёт трубку.'][(R()*10)|0];
  }
}
function updateWaves(dt){
  var anyPlayer=false,i;
  for(i=0;i<G.players.length;i++)if(!G.players[i].dead)anyPlayer=true;
  if(G.waveState==='calm'){
    G.waveT-=dt;
    if(G.waveT<=0&&anyPlayer){G.waveState='active';startWave();}
  }else if(G.waveState==='cleared'){

    G.interT-=dt;
    if(G.interT<=0){
      G.waveState='calm';G.waveT=3.2;
      regenLocation(G.pendSeed);
      G.fadeT=1.5;
      msg('Новый офис. Обустраиваемся…',3);
    }
  }else{

    G.sweepT=(G.sweepT||0)-dt;
    if(G.sweepT<=0&&G.spawnQ.length===0&&G.mobs.length>0&&G.mobs.length<=6){
      G.sweepT=4;
      var anchor=null;
      for(i=0;i<G.players.length;i++)if(!G.players[i].dead)anchor=G.players[i];
      if(anchor){
        for(i=0;i<G.mobs.length;i++){var sw=G.mobs[i];
          if(sw.dead)continue;
          sw.aggro=true;

          if(!reachOK(sw.x,sw.y)||dist(sw,anchor)>1100||
             (G.mobs.length<=3&&!losClear(sw.x,sw.y,anchor.x,anchor.y)&&dist(sw,anchor)>90)||
             (dist(sw,anchor)>240&&!losClear(sw.x,sw.y,anchor.x,anchor.y))){
            var sp2=freeSpotNear(anchor.x,anchor.y,240,420,sw.r);
            G.fx.push({type:'ring',x:sp2.x,y:sp2.y,rad:8,radMax:64,t:0,life:0.35,red:true});
            sw.x=sp2.x;sw.y=sp2.y;sw.kx=0;sw.ky=0;
          }
        }
        if(G.wave>1)floatText(anchor.x,anchor.y-64,'HR вычислил уцелевших','#e07050',12,'I');
      }
    }
    if(G.spawnQ.length>0){
      G.spawnT-=dt;
      if(G.spawnT<=0){
        if(G.hordeBatch){G.spawnT=1.1;for(var hs=0;hs<8&&G.spawnQ.length;hs++)spawnMob(G.spawnQ.shift());}
        else{G.spawnT=0.7;for(var bs=0;bs<5&&G.spawnQ.length;bs++)spawnMob(G.spawnQ.shift());}
      }
    }else if(G.mobs.length===0&&!G.boss){
      G.waveState='cleared';G.interT=20;
      G.pendSeed=(R()*1e9)|0;
      G.nextTheme=themeNameFor(G.pendSeed);
      G.interStats={w:G.wave,ki:G.killsI,kd:G.killsD,okr:G.okr};
      broadcast({t:'inter',d:3.4,th:G.nextTheme,st:G.interStats});
    }
  }
  if(G.winT>0){
    G.winT-=dt;
    if(G.winT<=0){
      G.state='win';showOv('bwin');broadcast({t:'stt',s:'win'});
      if(NET.mode!=='guest'){CAREER.wins++;award('win');careerEndRun(NET.mode!=='solo');saveCareer();}
    }
  }
}
function schedule(fn,delay){G.delays.push({t:delay,fn:fn});}
function update(dt){
  if(G.hitStop>0){G.hitStop-=dt;return;}
  G.t+=dt;
  for(var di=0;di<G.delays.length;di++){G.delays[di].t-=dt;}
  for(di=G.delays.length-1;di>=0;di--){
    if(G.delays[di].t<=0){var fn=G.delays[di].fn;G.delays.splice(di,1);try{fn();}catch(e){}}
  }
  if(NET.mode==='guest'){guestUpdate(dt);return;}
  if(G.state!=='playing')return;
  if(OV_OPEN==='bperk'&&NET.mode==='solo')return;

  FLOW.t-=dt;
  var fp=null;
  for(var i=0;i<G.players.length;i++)if(!G.players[i].dead&&(fp===null||G.players[i].respT<fp.respT))fp=G.players[i];
  if(fp){
    var ftx=(fp.x/TILE)|0,fty=(fp.y/TILE)|0;
    if(ftx!==FLOW.tx||fty!==FLOW.ty||FLOW.t<=0){
      FLOW.tx=ftx;FLOW.ty=fty;FLOW.t=0.4;
      computeFlow(fp.x,fp.y);
    }
  }
  for(i=0;i<G.players.length;i++)updatePlayer(G.players[i],dt);
  updateMobs(dt);updateBoss(dt);updateProjs(dt);updateFx(dt);updateWaves(dt);
}
function gameOver(){
  if(G.state==='dead')return;
  G.state='dead';SFX.die();
  if(NET.mode!=='guest'){
    CAREER.deaths++;
    if(CAREER.deaths>=10)award('dead10');
    careerEndRun(NET.mode!=='solo');
  }
  showDeadStats();
  broadcast({t:'stt',s:'dead',stats:{sprint:Math.max(0,G.wave-1),okr:G.okr,ki:G.killsI,kd:G.killsD,gr:G.grade}});
}

function regenLocation(seed){
  seed=(seed>0)?(seed|0):((R()*1e9)|0);
  buildMap(seed);
  G.mobs.length=0;G.projs.length=0;G.pickups.length=0;G.zones.length=0;
  G.fx.length=0;G.texts.length=0;
  DEBRIS.length=0;WATER.length=0;PFX.length=0;STONES.length=0;
  var lb=lobbySpawn();
  for(var i=0;i<G.players.length;i++){var p=G.players[i];
    p.x=lb.x+lb.w/2+(R()*120-60);p.y=lb.y+lb.h/2+(R()*120-60);
    p.kx=0;p.ky=0;p.inv=Math.max(p.inv,1.5);
  }
  NET.events.push({k:'map',seed:seed});
  floatText(lb.x+lb.w/2,lb.y+lb.h/2-30,'переезд: «'+MAPTHEME.name+'»','#42e0ff',14);
  updateCamera(0.016,true);
}
