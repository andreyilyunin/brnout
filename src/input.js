'use strict';

var INPUT={ix:0,iy:0,aim:0,f1:false,f2:false,sk:false,sk2:false,fk:false,cf:false,f1Tap:false,ultTap:false};
var keys={},mouse={x:0,y:0,down:false,rdown:false};
var isTouch=false;
function refreshAim(){
  var me=localPlayer();
  if(isTouch){
    if(!me)return;
    var best=null,bd=460;
    var pool=(NET.mode==='guest')?VIEW.mobs:G.mobs;
    for(var i=0;i<pool.length;i++){var m=pool[i];
      var d=Math.hypot(m.x-me.x,m.y-me.y);
      if(d<bd){bd=d;best=m;}
    }
    var boss=(NET.mode==='guest')?VIEW.boss:G.boss;
    if(boss){var db=dist(me,boss);if(db<bd){best=boss;}}
    if(best)INPUT.aim=angTo(me,best);
    else if(Math.hypot(INPUT.ix,INPUT.iy)>0.1)INPUT.aim=Math.atan2(INPUT.iy,INPUT.ix);
  }else{
    var mx=mouse.x/DPR/G.zoom+G.camX,my2=mouse.y/DPR/G.zoom+G.camY;
    if(me)INPUT.aim=Math.atan2(my2-me.y,mx-me.x);
  }
}
var cv=document.getElementById('bcv'),ctx=cv.getContext('2d');
var bhud=document.getElementById('bhud'),hctx=bhud.getContext('2d');
cv.addEventListener('mousemove',function(e){
  var r=cv.getBoundingClientRect();
  mouse.x=(e.clientX-r.left)*(cv.width/r.width);mouse.y=(e.clientY-r.top)*(cv.height/r.height);
});
cv.addEventListener('mousedown',function(e){
  audioInit();
  if(isTouch)return;
  if(e.button===0){mouse.down=true;INPUT.f1=true;INPUT.f1Tap=true;}
  if(e.button===2){mouse.rdown=true;INPUT.f2=true;}
});
window.addEventListener('mouseup',function(e){
  if(e.button===0){mouse.down=false;INPUT.f1=false;}
  if(e.button===2){mouse.rdown=false;INPUT.f2=false;}
});
cv.addEventListener('contextmenu',function(e){e.preventDefault();});
window.addEventListener('keydown',function(e){
  if(G.state!=='menu'){
    if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD','KeyE'].indexOf(e.code)>=0)e.preventDefault();
  }
  keys[e.code]=true;
  if(e.repeat)return;
  if(e.code==='Enter'&&G.state==='playing'&&G.waveState==='cleared')G.interT=0.05;
  if(e.code==='Escape'){
    if(OV_OPEN&&OV_BACK[OV_OPEN]){showOv(OV_BACK[OV_OPEN]);return;}
    togglePause();
  }
  if(e.code==='Space'&&G.state==='playing')INPUT.sk=true;
  if(e.code==='KeyQ'&&G.state==='playing')INPUT.sk2=true;
  if(e.code==='KeyF'&&G.state==='playing')INPUT.fk=true;
  if(e.code==='KeyR'&&G.state==='playing')INPUT.ultTap=true;
  if(e.code==='KeyE'&&G.state==='playing')INPUT.cf=true;
});
window.addEventListener('keyup',function(e){
  keys[e.code]=false;
  if(e.code==='Space')INPUT.sk=false;
  if(e.code==='KeyQ')INPUT.sk2=false;
  if(e.code==='KeyF')INPUT.fk=false;
  if(e.code==='KeyE')INPUT.cf=false;
});
function keysToInput(){
  if(isTouch&&joyId!==null)return;
  INPUT.ix=0;INPUT.iy=0;
  if(keys.KeyW||keys.ArrowUp)INPUT.iy-=1;
  if(keys.KeyS||keys.ArrowDown)INPUT.iy+=1;
  if(keys.KeyA||keys.ArrowLeft)INPUT.ix-=1;
  if(keys.KeyD||keys.ArrowRight)INPUT.ix+=1;
}
var joy=document.getElementById('joy'),joyk=document.getElementById('joyk');
var joyId=null,joyCx=0,joyCy=0;
var joyHinted=false;
function enableTouch(){
  if(isTouch)return;
  isTouch=true;
  if(window.tuiSync)tuiSync();
}

root.addEventListener('pointermove',function(e){
  if(e.pointerType==='mouse'&&isTouch&&joyId===null){
    isTouch=false;
    if(window.tuiSync)tuiSync();
    joy.style.display='none';
    INPUT.ix=0;INPUT.iy=0;
  }
});
root.addEventListener('touchstart',function(e){
  enableTouch();audioInit();
  for(var i=0;i<e.changedTouches.length;i++){
    var t=e.changedTouches[i];
    if(t.target.closest&&t.target.closest('.tbtn'))continue;
    if(t.target.closest&&t.target.closest('.bgov'))continue;
    if(t.target.closest&&t.target.closest('#btnPauseM'))continue;
    if(t.target.closest&&t.target.closest('#btnFS'))continue;

    if(window.__nextBtnRect&&G.state==='playing'&&G.waveState==='cleared'){
      var rr2=root.getBoundingClientRect();
      var tx2=t.clientX-rr2.left,ty2=t.clientY-rr2.top;
      var R2=window.__nextBtnRect;
      if(tx2>=R2.x&&tx2<=R2.x+R2.w&&ty2>=R2.y&&ty2<=R2.y+R2.h){
        G.interT=0.05;
        continue;
      }
    }
    if(joyId===null){
      joyId=t.identifier;
      if(!joyHinted){joyHinted=true;var jh2=document.getElementById('joyHint');if(jh2)jh2.classList.add('hidden');}
      var r=root.getBoundingClientRect();

      joyCx=clamp(t.clientX-r.left,90,r.width*0.5);
      joyCy=clamp(t.clientY-r.top,r.height*0.3,r.height-90);
      joy.style.display='block';
      joy.style.left=(joyCx-60)+'px';joy.style.top=(joyCy-60)+'px';
      joyk.style.transform='translate(0px,0px)';
      e.preventDefault();
    }
  }
},{passive:false});
root.addEventListener('touchmove',function(e){
  for(var i=0;i<e.changedTouches.length;i++){
    var t=e.changedTouches[i];
    if(t.identifier===joyId){
      var r=root.getBoundingClientRect();
      var dx=t.clientX-r.left-joyCx,dy=t.clientY-r.top-joyCy;
      var d=Math.hypot(dx,dy),max=55;
      if(d>max){dx=dx/d*max;dy=dy/d*max;}
      joyk.style.transform='translate('+dx+'px,'+dy+'px)';
      INPUT.ix=dx/max;INPUT.iy=dy/max;
      e.preventDefault();
    }
  }
},{passive:false});
function joyEnd(e){
  for(var i=0;i<e.changedTouches.length;i++){
    if(e.changedTouches[i].identifier===joyId){
      joyId=null;joy.style.display='none';
      INPUT.ix=0;INPUT.iy=0;
    }
  }
}
root.addEventListener('touchend',joyEnd);
root.addEventListener('touchcancel',joyEnd);
function bindBtn(id,down,up){
  var el=document.getElementById(id);
  el.addEventListener('touchstart',function(e){e.preventDefault();audioInit();down();},{passive:false});
  el.addEventListener('touchend',function(e){e.preventDefault();if(up)up();},{passive:false});
  el.addEventListener('mousedown',function(e){e.preventDefault();down();});
  el.addEventListener('mouseup',function(e){if(up)up();});
}
bindBtn('btnAtk',function(){INPUT.f1=true;},function(){INPUT.f1=false;});
bindBtn('btnAlt',function(){INPUT.f2=true;},function(){INPUT.f2=false;});
bindBtn('btnSkill',function(){INPUT.sk=true;},function(){INPUT.sk=false;});
bindBtn('btnSkill2',function(){INPUT.sk2=true;},function(){INPUT.sk2=false;});
bindBtn('btnFU',function(){INPUT.fk=true;},function(){INPUT.fk=false;});
bindBtn('btnR',function(){INPUT.ultTap=true;},function(){});
(function(){
  var fs=document.getElementById('btnFS');
  var fakeOK=true;
  function toggle(){
    if(document.fullscreenElement||document.webkitFullscreenElement||root.classList.contains('zfsfake')){
      root.classList.remove('zfsfake');
      if(document.fullscreenElement||document.webkitFullscreenElement)(document.exitFullscreen||document.webkitExitFullscreen).call(document);
      return;
    }
    if(root.requestFullscreen||root.webkitRequestFullscreen){
      var pr=(root.requestFullscreen||root.webkitRequestFullscreen).call(root);
      if(screen.orientation&&screen.orientation.lock)screen.orientation.lock('landscape').catch(function(){});
      setTimeout(function(){
        if(!(document.fullscreenElement||document.webkitFullscreenElement)){root.classList.add('zfsfake');if(window.__fsFakeHint)__fsFakeHint();}
      },350);
    }else if(fakeOK){
      root.classList.toggle('zfsfake');
      if(root.classList.contains('zfsfake')&&window.__fsFakeHint)__fsFakeHint();
    }
  }
  fs.addEventListener('click',function(e){e.preventDefault();toggle();});
  fs.addEventListener('touchstart',function(e){e.preventDefault();e.stopPropagation();toggle();},{passive:false});
  window.__fsToggle=function(){toggle();};
  var pb=document.getElementById('bfsToggle');
  if(pb)pb.addEventListener('click',function(){
    toggle();
    setTimeout(function(){
      var on=document.fullscreenElement||document.webkitFullscreenElement||root.classList.contains('zfsfake');
      pb.textContent=on?'Выйти из полного экрана':'Полный экран';
    },250);
  });

  root.addEventListener('classchange',function(){},true);
})();
document.getElementById('btnPauseM').addEventListener('touchstart',function(e){e.preventDefault();togglePause();},{passive:false});
document.getElementById('btnPauseM').addEventListener('mousedown',function(e){e.preventDefault();togglePause();});

if(('ontouchstart' in window)||navigator.maxTouchPoints>0)enableTouch();
