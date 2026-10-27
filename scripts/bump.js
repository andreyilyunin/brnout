#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(file, 'utf8');
const vers = Array.from(html.matchAll(/\?v=(\d+)/g), m => +m[1]);
const arg = process.argv[2];
const next = arg !== undefined ? +arg : Math.max(0, ...vers) + 1;
if (!Number.isInteger(next) || next <= 0 || !vers.length) {
  console.error('usage: node scripts/bump.js [N]  — проставляет ?v=N у всех скриптов и стилей в index.html');
  process.exit(1);
}
fs.writeFileSync(file, html.replace(/\?v=\d+/g, '?v=' + next));
console.log('bump: ?v=' + next);
