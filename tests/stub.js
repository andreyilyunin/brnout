'use strict';

function noopCtx() {
  return new Proxy({}, {
    get(t, p) {
      if (p === 'canvas') return { width: 0, height: 0 };
      return typeof t[p] !== 'undefined' ? t[p] : function () { return noopCtx(); };
    },
    set(t, p, v) { t[p] = v; return true; }
  });
}
global.document = {
  createElement() { return { getContext: () => noopCtx(), width: 0, height: 0 }; },
  getElementById() { return null; }
};
global.window = global;
global.performance = { now: () => Date.now() };
global.location = { href: 'http://localhost/' };
global.requestAnimationFrame = () => {};

const fs = require('fs'), path = require('path');
function load(rel) {
  const code = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

  (0, eval)(code.replace(/^'use strict';\n?/, ''));
}
module.exports = { load };
