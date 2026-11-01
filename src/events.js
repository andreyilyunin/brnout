'use strict';

var GAME_EVENTS={};
function onGameEvent(name,fn){
  if(typeof name!=='string')throw new Error('onGameEvent: name must be string');
  if(typeof fn!=='function')throw new Error('onGameEvent: fn must be function');
  (GAME_EVENTS[name]=GAME_EVENTS[name]||[]).push(fn);
  return function(){
    var arr=GAME_EVENTS[name];
    if(!arr)return;
    var i=arr.indexOf(fn);
    if(i>=0)arr.splice(i,1);
  };
}
function emitGameEvent(name,ev){
  if(typeof name!=='string')throw new Error('emitGameEvent: name must be string');
  var arr=GAME_EVENTS[name];
  if(!arr)return;
  for(var i=0;i<arr.length;i++)arr[i](ev);
}
