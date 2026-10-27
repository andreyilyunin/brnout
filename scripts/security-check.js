#!/usr/bin/env node

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FILES = ['index.html', 'style.css']
  .concat(fs.readdirSync(path.join(ROOT, 'src')).map(f => 'src/' + f))
  .concat(fs.readdirSync(path.join(ROOT, 'tests')).map(f => 'tests/' + f));

const RULES = [
  ['eval', /\beval\s*\(/, 'не использовать eval — исполнять пользовательский ввод нельзя'],
  ['new Function', /new\s+Function\s*\(/, 'конструктор функций = скрытый eval'],
  ['document.write', /document\.write\s*\(/, 'document.write ломает загрузку и открыт XSS'],
  ['dangerous innerHTML', /innerHTML\s*=\s*[^'"`\s].*(?!\/\*safe)/, 'innerHTML только с константной строкой, не с данными (после аудита помечать /*safe*/)'],
  ['http:// external', /src\s*=\s*["']http:\/\//i, 'внешние ресурсы только по https'],
  ['target=_blank без noopener', /target\s*=\s*["']_blank["'](?![^>]*rel=)/i, 'добавить rel="noopener noreferrer"'],
  ['credentials', /(api[_-]?key|secret|password|token)\s*[:=]\s*["'][A-Za-z0-9+/_-]{16,}["']/i, 'в репозитории не должно быть секретов'],
];

let problems = 0;
for (const rel of FILES) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const lines = src.split('\n');
  lines.forEach((line, i) => {
    for (const [name, re, advice] of RULES) {
      if (/\/\*safe/.test(line)) continue;
      if (re.test(line)) {
        problems++;
        console.log(`  [${name}] ${rel}:${i + 1}  ${line.trim().slice(0, 90)}`);
        console.log(`      → ${advice}`);
      }
    }
  });
}

if (problems) {
  console.log(`\nsecurity: ✗ ${problems} замечаний`);
  process.exit(1);
}
console.log('security: ✓ подозрительных паттернов нет (' + FILES.length + ' файлов)');
