#!/usr/bin/env node

const http = require('http');
const WebSocket = require('ws');
const Aedes = require('aedes').Aedes;

const aedes = new Aedes();
aedes.on('client', c => console.log('client connect', c.id));
aedes.on('publish', (p, c) => console.log('pub', p.topic, p.payload && p.payload.length));
aedes.on('subscribe', (s, c) => console.log('sub', s.map(x => x.topic).join(',')));
aedes.on('clientError', (c, e) => console.log('clientError', c && c.id, e.message));
aedes.on('connectionError', (c, e) => console.log('connectionError', e.message));

const server = http.createServer();
const wss = new WebSocket.Server({ server });
wss.on('connection', (ws) => {
  const stream = WebSocket.createWebSocketStream(ws);

  let buf = [], flush = null;
  stream.write = ((orig) => (chunk, enc, cb) => {
    buf.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, enc));
    if (!flush) flush = setImmediate(() => {
      const out = buf.length > 1 ? Buffer.concat(buf) : buf[0];
      buf = []; flush = null;
      orig(out);
    });
    return true;
  })(stream.write.bind(stream));
  stream.on('error', () => {});
  aedes.handle(stream);
});

aedes.listen().then(() => {
  server.listen(9001, '127.0.0.1', () => console.log('mqtt-ws on ws://127.0.0.1:9001/'));
}).catch(e => { console.error('aedes.listen failed', e); process.exit(1); });
