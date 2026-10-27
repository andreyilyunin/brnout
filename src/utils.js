'use strict';

var root=document.getElementById('burnout');

var TAU=Math.PI*2;
function clamp(v,a,b){return v<a?a:(v>b?b:v);}
function dist(a,b){var dx=a.x-b.x,dy=a.y-b.y;return Math.sqrt(dx*dx+dy*dy);}
function angTo(a,b){return Math.atan2(b.y-a.y,b.x-a.x);}
function angDiff(a,b){var d=(b-a)%TAU;if(d>Math.PI)d-=TAU;else if(d<-Math.PI)d+=TAU;return d;}
var _seed=987654321;
function rnd(){_seed=(_seed*1664525+1013904223)>>>0;return _seed/4294967296;}
function R(){return Math.random();}
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
function inRect(px,py,r){return px>=r.x&&px<=r.x+r.w&&py>=r.y&&py<=r.y+r.h;}
function genCode(){var a='abcdefghjkmnpqrstuvwxyz23456789',s='';for(var i=0;i<4;i++)s+=a[(R()*a.length)|0];return s;}
function shade(hex,amt){
  var n=parseInt(hex.slice(1),16),r=(n>>16)+amt,g=((n>>8)&255)+amt,b=(n&255)+amt;
  r=clamp(r,0,255);g=clamp(g,0,255);b=clamp(b,0,255);
  return 'rgb('+r+','+g+','+b+')';
}
