'use strict';

var MUS={on:false,timer:null,next:0,step:0,chord:0,bus:null,dly:null};
function kickAt(t){
  var o=AC.createOscillator(),g=AC.createGain();
  o.type='sine';
  o.frequency.setValueAtTime(120,t);
  o.frequency.exponentialRampToValueAtTime(38,t+0.12);
  g.gain.setValueAtTime(0.3,t);
  g.gain.exponentialRampToValueAtTime(0.0001,t+0.2);
  o.connect(g);g.connect(MUS.bus);
  o.start(t);o.stop(t+0.24);
}
function leadAt(t,midi,len){
  var o=AC.createOscillator(),g=AC.createGain(),f=AC.createBiquadFilter();
  o.type='sawtooth';o.frequency.value=mtof(midi);
  var lfo=AC.createOscillator(),lg=AC.createGain();
  lfo.frequency.value=5.2;lg.gain.value=5;
  lfo.connect(lg);lg.connect(o.detune);
  f.type='lowpass';f.frequency.value=1500;f.Q.value=0.8;
  g.gain.setValueAtTime(0.0001,t);
  g.gain.exponentialRampToValueAtTime(0.07,t+0.028);
  g.gain.setValueAtTime(0.07,t+len*0.55);
  g.gain.exponentialRampToValueAtTime(0.0001,t+len);
  o.connect(f);f.connect(g);
  g.connect(MUS.dly);g.connect(MUS.bus);
  o.start(t);o.stop(t+len+0.05);
  lfo.start(t);lfo.stop(t+len+0.05);
}
function bassAt(t,midi,len,inten){
  var o=AC.createOscillator(),g=AC.createGain(),f=AC.createBiquadFilter();
  o.type='sawtooth';o.frequency.value=mtof(midi);
  f.type='lowpass';f.frequency.value=180+inten*380;
  g.gain.setValueAtTime(0.0001,t);
  g.gain.exponentialRampToValueAtTime(0.14,t+0.012);
  g.gain.exponentialRampToValueAtTime(0.0001,t+len);
  o.connect(f);f.connect(g);g.connect(MUS.bus);
  o.start(t);o.stop(t+len+0.05);
}
function musicTick(){
  if(!AC||muted||!MUS.on)return;
  var dt16=60/MBPM/4;
  while(MUS.next<AC.currentTime+0.16){
    var t=MUS.next,stepAbs=MUS.step,s=stepAbs%16;
    var bar=((stepAbs/16)|0)%8;
    var sec=bar<2?0:(bar<4?1:(bar<6?2:3));
    var pr=PROG[bar];
    var mobsN=(NET.mode==='guest')?VIEW.mobs.length:G.mobs.length;
    var inten=clamp(mobsN/8+G.wave*0.04+((NET.mode==='guest'?VIEW.boss:G.boss)?0.35:0),0,1);

    for(var b=0;b<BPAT.length;b++){var bn=BPAT[b];
      if(bn.s!==s)continue;
      if(sec===0&&bn.s!==0&&bn.s!==8)continue;
      bassAt(t,pr[0]-12+bn.n,bn.l*dt16,inten);
    }

    if(sec>=1&&inten>0.12){
      if(s%4===0)kickAt(t);
      if(s===4||s===12)noiz(0.09,0.13,1600,1.2,t-AC.currentTime);
      if(inten>0.45&&s%4===2)noiz(0.03,0.02,5000,1.2,t-AC.currentTime);
      if(bar===7&&s>=12){
        noiz(0.05,0.1,1800,1,t-AC.currentTime);
        if(s%2===0)kickAt(t);
      }
    }else if(sec===0&&s===0){
      kickAt(t);
    }

    if(sec>=2&&ARPPAT[s]){
      var vi=pr[1][(s*3+stepAbs)%pr[1].length]+12;
      var o2=AC.createOscillator(),g2=AC.createGain();
      o2.type='triangle';o2.frequency.value=mtof(vi);
      g2.gain.setValueAtTime(0.0001,t);
      g2.gain.exponentialRampToValueAtTime(0.016+inten*0.016,t+0.006);
      g2.gain.exponentialRampToValueAtTime(0.0001,t+dt16*0.9);
      o2.connect(g2);g2.connect(MUS.dly);g2.connect(MUS.bus);
      o2.start(t);o2.stop(t+dt16*1.1);
    }

    if(sec>=2){
      for(var m2=0;m2<MEL.length;m2++){var nt=MEL[m2];
        if(nt[0]===bar&&nt[1]===s)leadAt(t,nt[2],nt[3]*dt16*0.95);
      }
    }

    if(s===0){
      for(var pi=0;pi<pr[1].length;pi++){
        var po=AC.createOscillator(),pg=AC.createGain();
        po.type='sawtooth';po.frequency.value=mtof(pr[1][pi]);
        po.detune.value=(pi-1.5)*11;
        pg.gain.setValueAtTime(0.0001,t);
        pg.gain.linearRampToValueAtTime(sec===0?0.028:0.018,t+0.6);
        pg.gain.linearRampToValueAtTime(0.0001,t+dt16*15);
        po.connect(pg);pg.connect(MUS.bus);
        po.start(t);po.stop(t+dt16*15.5);
      }
    }

    if(s===0&&stepAbs%64===0){
      for(var dj=0;dj<2;dj++){
        var dr=AC.createOscillator(),dg2=AC.createGain();
        dr.type='sine';dr.frequency.value=mtof(33)+(dj?0.7:0);
        dg2.gain.setValueAtTime(0.0001,t);
        dg2.gain.linearRampToValueAtTime(0.055,t+1.8);
        dg2.gain.linearRampToValueAtTime(0.0001,t+dt16*63);
        dr.connect(dg2);dg2.connect(MUS.bus);
        dr.start(t);dr.stop(t+dt16*64);
      }
    }
    MUS.step++;MUS.next+=dt16;
  }
}
function bossStinger(){
  if(!AC||muted)return;
  var t0=AC.currentTime;
  [0,1,6,13].forEach(function(sm,i){
    tone(mtof(45+sm-12),1.6,'sawtooth',0.1,-2,0.05*i);
  });
  noiz(0.8,0.12,300,0.7,0.02);
}
