'use strict';
// ============================== audio ==============================
var AC=null,master=null,muted=false,amb=null;
// настройки звука: общий / музыка / эффекты (persist в localStorage)
var SET={master:0.85,music:0.5,sfx:1.0};
try{var _s=JSON.parse(localStorage.getItem('brnt_snd')||'null');if(_s)for(var _k in SET)if(typeof _s[_k]==='number')SET[_k]=_s[_k];}catch(e){}
var sfxBus=null,musGain=null;
function applyVolumes(){
  if(master)master.gain.value=muted?0:SET.master;
  if(sfxBus)sfxBus.gain.value=SET.sfx;
  if(musGain)musGain.gain.value=SET.music;
}
function saveVolumes(){try{localStorage.setItem('brnt_snd',JSON.stringify(SET));}catch(e){}}
function audioInit(){
  if(!AC){try{
    AC=new (window.AudioContext||window.webkitAudioContext)();
    master=AC.createGain();
    sfxBus=AC.createGain();
    musGain=AC.createGain();
    sfxBus.connect(master);musGain.connect(master);master.connect(AC.destination);
    applyVolumes();
  }catch(e){}}
  if(AC&&AC.state==='suspended')AC.resume();
}
function tone(f,dur,type,vol,slide,delay){
  if(!AC||muted)return;delay=delay||0;
  var t0=AC.currentTime+delay,o=AC.createOscillator(),g=AC.createGain();
  o.type=type||'sine';o.frequency.setValueAtTime(f,t0);
  if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(24,f+slide),t0+dur);
  g.gain.setValueAtTime(vol||0.2,t0);g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
  o.connect(g);g.connect(sfxBus||master);o.start(t0);o.stop(t0+dur+0.03);
}
function noiz(dur,vol,freq,q,delay){
  if(!AC||muted)return;delay=delay||0;
  var t0=AC.currentTime+delay,len=Math.max(1,(dur*AC.sampleRate)|0);
  var buf=AC.createBuffer(1,len,AC.sampleRate),d=buf.getChannelData(0);
  for(var i=0;i<len;i++)d[i]=Math.random()*2-1;
  var n=AC.createBufferSource();n.buffer=buf;
  var f=AC.createBiquadFilter();f.type='bandpass';f.frequency.value=freq||800;f.Q.value=q||1;
  var g=AC.createGain();g.gain.setValueAtTime(vol||0.2,t0);g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
  n.connect(f);f.connect(g);g.connect(sfxBus||master);n.start(t0);n.stop(t0+dur+0.03);
}
var SFX={
  stapler:function(){tone(1250,0.03,'square',0.2);tone(950,0.04,'square',0.16,0,0.045);noiz(0.04,0.14,2400,3);},
  thudFlesh:function(){tone(80,0.16,'sine',0.5,-35);noiz(0.1,0.22,240,0.8);},
  levelUp:function(){tone(784,0.1,'triangle',0.16);tone(988,0.1,'triangle',0.16,0,0.09);tone(1319,0.16,'triangle',0.15,0,0.18);},
  plan:function(){tone(523,0.1,'square',0.08);tone(659,0.1,'square',0.08,0,0.1);tone(784,0.1,'square',0.08,0,0.2);tone(1047,0.2,'triangle',0.14,0,0.3);},
  demon:function(){tone(100,0.5,'sawtooth',0.3,-55);tone(160,0.4,'sawtooth',0.2,-80,0.1);tone(58,0.6,'sawtooth',0.26,-20,0.22);},
  shufut:function(){ // шансонный аккорд «третьего сентября» (своя фраза, ля-минор)
    tone(220,0.5,'sawtooth',0.07);tone(262,0.5,'sawtooth',0.06);tone(330,0.5,'triangle',0.12);
    tone(208,0.5,'sawtooth',0.06,0,0.45);tone(247,0.5,'sawtooth',0.05,0,0.45);tone(311,0.5,'triangle',0.11,0,0.45);
    tone(196,0.6,'sawtooth',0.07,0,0.9);tone(247,0.6,'sawtooth',0.06,0,0.9);tone(294,0.6,'triangle',0.12,0,0.9);
  },
  dodge:function(){noiz(0.14,0.2,1400,1.4);tone(300,0.12,'sine',0.14,260);},
  notif:function(){ // звуки уведомлений телефона: случайно один из трёх
    var n=(R()*3)|0;
    if(n===0){tone(1319,0.09,'triangle',0.15);tone(1047,0.13,'triangle',0.13,0,0.08);}       // «ду-дин»
    else if(n===1){tone(520,0.05,'sine',0.16,400);tone(1040,0.08,'sine',0.11,0,0.05);}        // «поп» телеграма
    else{tone(880,0.05,'sine',0.14);tone(1175,0.07,'sine',0.12,0,0.06);}                      // двойной блип
  },


  bell:function(){tone(660,0.5,'triangle',0.2,-15);tone(1320,0.35,'sine',0.1,-20,0.02);},
  soulAgony:function(pitch){ // муки: нисходящий стон-стонания
    if(!AC||muted)return;
    var t0=AC.currentTime,p=(pitch||1);
    var o=AC.createOscillator(),g=AC.createGain(),f=AC.createBiquadFilter();
    o.type='sawtooth';
    o.frequency.setValueAtTime(p*300,t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(50,p*85),t0+0.6);
    var lfo=AC.createOscillator(),lg=AC.createGain();
    lfo.frequency.value=7.5;lg.gain.value=26;
    lfo.connect(lg);lg.connect(o.detune);
    f.type='bandpass';f.frequency.value=520;f.Q.value=1.4;
    g.gain.setValueAtTime(0.0001,t0);
    g.gain.exponentialRampToValueAtTime(0.14,t0+0.05);
    g.gain.exponentialRampToValueAtTime(0.0001,t0+0.68);
    o.connect(f);f.connect(g);g.connect(sfxBus||master);
    o.start(t0);o.stop(t0+0.72);lfo.start(t0);lfo.stop(t0+0.72);
    noiz(0.4,0.09,420,0.9);
  },
  deathCry:function(pitch){ // диаблоподобный предсмертный стон
    if(!AC||muted)return;
    var t0=AC.currentTime,f0=(pitch||1)*185;
    var o=AC.createOscillator(),g=AC.createGain(),fl=AC.createBiquadFilter();
    o.type='sawtooth';
    o.frequency.setValueAtTime(f0,t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(40,f0*0.42),t0+0.38);
    var lfo=AC.createOscillator(),lg=AC.createGain();
    lfo.frequency.value=6.3;lg.gain.value=14;
    lfo.connect(lg);lg.connect(o.detune);
    fl.type='bandpass';fl.frequency.value=680;fl.Q.value=1.1;
    g.gain.setValueAtTime(0.0001,t0);
    g.gain.exponentialRampToValueAtTime(0.15,t0+0.03);
    g.gain.exponentialRampToValueAtTime(0.0001,t0+0.42);
    o.connect(fl);fl.connect(g);g.connect(sfxBus||master);
    o.start(t0);o.stop(t0+0.46);lfo.start(t0);lfo.stop(t0+0.46);
  },
  soulSigh:function(pitch){ // улетающая душа: выдох «аааах»
    if(!AC||muted)return;
    var t0=AC.currentTime,p=(pitch||1);
    noiz(0.55,0.11,850,0.8);
    var o=AC.createOscillator(),g=AC.createGain();
    o.type='triangle';
    o.frequency.setValueAtTime(p*520,t0+0.05);
    o.frequency.exponentialRampToValueAtTime(Math.max(90,p*150),t0+0.55);
    g.gain.setValueAtTime(0.0001,t0+0.05);
    g.gain.exponentialRampToValueAtTime(0.15,t0+0.13);
    g.gain.exponentialRampToValueAtTime(0.0001,t0+0.62);
    o.connect(g);g.connect(sfxBus||master);
    o.start(t0+0.05);o.stop(t0+0.66);
    tone(p*262,0.55,'sine',0.08,-150,0.05);
    tone(p*392,0.45,'sine',0.055,-190,0.08);
  },
  whisper:function(){ // мистический шёпот опенспейса
    if(!AC||muted)return;
    var t0=AC.currentTime;
    for(var i=0;i<3;i++){
      var o=AC.createOscillator(),g=AC.createGain();
      o.type='sine';o.frequency.value=196+i*2.5+R()*5;
      g.gain.setValueAtTime(0.0001,t0);
      g.gain.linearRampToValueAtTime(0.011,t0+1.3);
      g.gain.linearRampToValueAtTime(0.0001,t0+2.8);
      o.connect(g);g.connect(sfxBus||master);
      o.start(t0);o.stop(t0+2.9);
    }
    noiz(1.8,0.013,560,0.5);
  },
  pickup:function(){tone(760,0.07,'triangle',0.24);tone(1140,0.1,'triangle',0.2,0,0.05);},
  crit:function(){tone(880,0.08,'square',0.16);tone(1320,0.12,'square',0.13,0,0.05);noiz(0.06,0.15,1800,2);},
  crack:function(){noiz(0.08,0.32,450,1.2);tone(180,0.07,'square',0.16,-60);},
  swing:function(){noiz(0.12,0.36,900,1.5);},
  clack:function(){noiz(0.03,0.22,2600,6);tone(1600+R()*700,0.03,'square',0.05);},
  clacks:function(n){for(var i=0;i<n;i++)setTimeout(function(){SFX.clack();},i*55+R()*30);},
  whoosh:function(){noiz(0.16,0.22,650,2);},
  hit:function(){tone(120,0.12,'sine',0.4,-60);noiz(0.05,0.2,320,1);},
  thump:function(){tone(90,0.18,'sine',0.55,-40);noiz(0.08,0.15,180,0.8);},
  slurp:function(){tone(520,0.26,'sine',0.16,-280);tone(320,0.2,'triangle',0.1,-120,0.06);},
  ring:function(){tone(425,0.13,'sine',0.22);tone(425,0.13,'sine',0.22,0,0.18);tone(425,0.4,'sine',0.22,0,0.36);},
  slam:function(){noiz(0.4,0.5,130,0.8);tone(60,0.4,'sine',0.5,-30);},
  splat:function(){noiz(0.14,0.2,520,1);},
  heart:function(){tone(55,0.12,'sine',0.45,-8);tone(50,0.14,'sine',0.35,-8,0.16);},
  grade:function(){tone(392,0.12,'triangle',0.18);tone(311,0.14,'triangle',0.18,0,0.13);tone(262,0.3,'triangle',0.18,0,0.27);},

  explode:function(){noiz(0.3,0.4,220,0.7);tone(70,0.3,'sine',0.4,-30);},
  die:function(){tone(220,1.3,'sawtooth',0.22,-170);tone(110,1.6,'sawtooth',0.15,-80,0.1);}
};
function startAmbient(){
  if(!AC||amb)return;
  var o1=AC.createOscillator(),o2=AC.createOscillator(),g=AC.createGain(),f=AC.createBiquadFilter();
  o1.type='sawtooth';o1.frequency.value=55;o2.type='sawtooth';o2.frequency.value=55.7;
  f.type='lowpass';f.frequency.value=150;g.gain.value=0.045;
  o1.connect(f);o2.connect(f);f.connect(g);g.connect(musGain||master);
  o1.start();o2.start();amb={o1:o1,o2:o2,g:g};
}
// неактивная вкладка не должна орать: музыка на setInterval и эмбиент-дрон живут без rAF
document.addEventListener('visibilitychange',function(){
  if(!AC)return;
  if(document.hidden){if(AC.state==='running')AC.suspend();}
  else if(AC.state==='suspended')AC.resume();
});
