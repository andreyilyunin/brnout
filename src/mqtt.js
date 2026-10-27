'use strict';

var MQTT_BROKERS=[
  {url:'wss://broker.hivemq.com:8884/mqtt',name:'hivemq'},
  {url:'wss://test.mosquitto.org:8081/',name:'mosquitto'},
  {url:'wss://broker.emqx.io:8084/mqtt',name:'emqx'}
];
function mqttBytes(str){
  if(window.TextEncoder)return Array.from(new TextEncoder().encode(str));
  var out=[],s=unescape(encodeURIComponent(str));
  for(var i=0;i<s.length;i++)out.push(s.charCodeAt(i)&255);
  return out;
}
function mqttUtf8(arr,off,len){
  if(window.TextDecoder)return new TextDecoder('utf-8').decode(arr.subarray(off,off+len));
  var s='';for(var i=0;i<len;i++)s+=String.fromCharCode(arr[off+i]);
  return decodeURIComponent(escape(s));
}
function mqttStr(s){var b=mqttBytes(s);return [b.length>>8,b.length&255].concat(b);}
function mqttRemain(n){var b=[];do{var d=n&127;n>>=7;if(n>0)d|=128;b.push(d);}while(n>0);return b;}
function mqttPacket(typeFlags,body){
  var h=[typeFlags].concat(mqttRemain(body.length));
  var u=new Uint8Array(h.length+body.length);
  u.set(h,0);u.set(body,h.length);
  return u;
}

function mqttBrokerList(){
  var override=null;
  try{var _q=new URL(location.href).searchParams.get('broker');if(_q)override=_q;}catch(e){}
  try{if(!override&&window.localStorage&&localStorage.getItem('brnt_broker'))override=localStorage.getItem('brnt_broker');}catch(e){}
  return override?[{url:override,name:'custom'}].concat(MQTT_BROKERS):MQTT_BROKERS;
}
function mqttClient(opts){
  var list=opts.urls||mqttBrokerList();
  var DBG=window.__mqttDbg;
  function dbg(ev){if(DBG)DBG.push(Date.now()%100000+' '+ev);}
  var idx=0,ws=null,alive=false,stopped=false,pingIv=null,lastPing=0,lastPong=1;
  function cleanup(){
    clearInterval(pingIv);pingIv=null;
    try{if(ws){ws.onclose=ws.onerror=ws.onmessage=ws.onopen=null;ws.close();}}catch(e){}
    ws=null;
  }
  function tryNext(){
    if(stopped)return;
    if(idx>=list.length){opts.onDown('nobroker');return;}
    var u=list[idx++].url;
    try{ws=new WebSocket(u,'mqtt');}catch(e){tryNext();return;}
    ws.binaryType='arraybuffer';
    var connack=false;
    var to=setTimeout(function(){if(!connack){cleanup();tryNext();}},9000);
    ws.onopen=function(){
      dbg('open '+(list[idx-1].name));

      var flags=0x02;
      var body=[].concat(mqttStr('MQTT'),[4,flags,0,60],mqttStr(opts.clientId));
      if(opts.will){
        flags|=0x04;
        body=[].concat(mqttStr('MQTT'),[4,flags,0,60],mqttStr(opts.clientId),mqttStr(opts.will.topic),mqttStr(opts.will.str));
      }
      try{ws.send(mqttPacket(0x10,body));}catch(e){cleanup();tryNext();}
    };
    ws.onmessage=function(ev){
      var arr=new Uint8Array(ev.data);
      var type=arr[0]>>4;
      if(type===2&&!connack){
        dbg('connack '+(arr.length>3?arr[3]:'?'));
        if(arr.length<4||arr[3]!==0){clearTimeout(to);cleanup();tryNext();return;}
        connack=true;clearTimeout(to);alive=true;
        var body=[0,1].concat(mqttStr(opts.sub),[0]);
        try{ws.send(mqttPacket(0x82,body));}catch(e){}

        lastPong=Date.now();lastPing=0;
        pingIv=setInterval(function(){
          if(!alive)return;
          try{ws.send(new Uint8Array([0xC0,0]));}catch(e){return;}
          lastPing=Date.now();
          if(lastPong<lastPing-6000){alive=false;cleanup();opts.onDown('ping');}
        },5000);
        opts.onReady(list[idx-1].name);
        return;
      }
      if(type===13){lastPong=Date.now();return;}
      if(type===9)dbg('suback '+(arr[arr.length-1]));
      if(type===3){
        var p=1,mul=1,rem=0,d;
        do{d=arr[p];p++;rem+=(d&127)*mul;mul*=128;}while((d&128)&&p<5);
        var tl=arr[p]*256+arr[p+1];p+=2;
        var topic=mqttUtf8(arr,p,tl);p+=tl;
        if(arr[0]&0x06)p+=2;
        var plen=rem-2-tl-((arr[0]&0x06)?2:0);
        if(plen>0)opts.onMsg(topic,mqttUtf8(arr,p,plen));
      }
    };
    ws.onclose=function(ev){
      dbg('close '+(ev&&ev.code));
      if(alive){alive=false;cleanup();opts.onDown('closed');}
      else{clearTimeout(to);cleanup();tryNext();}
    };
    ws.onerror=function(){};
  }
  tryNext();
  return {
    publish:function(topic,str){
      if(!alive||stopped){dbg('pub-skip alive='+alive);return;}
      try{ws.send(mqttPacket(0x30,mqttStr(topic).concat(mqttBytes(str))));dbg('pub '+(str.length));}catch(e){dbg('pub-err');}
    },
    destroy:function(){stopped=true;alive=false;cleanup();}
  };
}
