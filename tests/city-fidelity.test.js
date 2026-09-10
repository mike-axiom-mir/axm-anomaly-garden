const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

let work = 0;
const gradient = { addColorStop() {} };
const ctx = new Proxy({
  createLinearGradient: () => gradient,
  fillRect: () => { work++; }
}, { get(target, key) { return key in target ? target[key] : (() => { work++; }); } });

class BaseRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.colors = { sky:'#000', ground:'#111', accent:'#7fc' };
    this.scene = { seed:'proof', key:'outer', dayPhase:.5 };
    this.scale = 1;
    this.mode = 'city';
    this.frames = [];
  }
  backdrop(width, height) {
    const g = this.ctx.createLinearGradient(0, 0, 0, height); g.addColorStop(0, '#000');
    this.ctx.fillRect(0, 0, width, height);
    for (let i = 0; i < 42; i++) {
      this.ctx.fillRect(i, 0, 2, 20);
      for (let row = 0; row < 8; row++) this.ctx.fillRect(i, row, 1, 1);
    }
  }
  box() { for (let i = 0; i < 28; i++) this.ctx.fillRect(0, 0, 1, 1); }
  poly() { work += 2; }
  point(x, y, z = 0) { return { x:x * 10, y:y * 5 - z }; }
  draw() { this.backdrop(800, 500); for (let i = 0; i < 12; i++) this.box(i, i, .5, .5, 40, '#abc'); }
}

const slot = null;
const document = {
  getElementById(id) { return id === 'city-motion-slot' ? slot : null; },
  createElement() { throw new Error('UI creation should be skipped without a slot'); },
  createTextNode() { return {}; },
  head: { appendChild() {} }
};
const context = {
  window: {
    AnomalyGardenCityRenderer: BaseRenderer,
    AnomalyGardenCityProjection: { hash(value) { let h=0; for (const ch of String(value)) h=(h*31+ch.charCodeAt(0))>>>0; return h; } }
  },
  document,
  performance: { now: () => 100 }
};
vm.runInNewContext(fs.readFileSync(require.resolve('../src/city-fidelity'), 'utf8'), context);
const Renderer = context.window.AnomalyGardenCityRenderer;
const renderer = new Renderer({ dataset:{} });
const canonicalBefore = JSON.stringify(renderer.scene);

renderer.setDetailPolicy('full');
work = 0; renderer.draw(100); const fullWork = work;
renderer.setDetailPolicy('lean');
work = 0; renderer.draw(100); const leanWork = work;
assert(leanWork < fullWork * .45, `lean realization should materially reduce decorative work (${leanWork} vs ${fullWork})`);
assert.equal(JSON.stringify(renderer.scene), canonicalBefore, 'realization switching must not mutate source scene truth');
assert.equal(renderer.realizationSnapshot().authority, 'EXPRESSION_ONLY');

renderer.setDetailPolicy('auto');
for (let i = 0; i < 3; i++) { renderer.frames = Array(24).fill(10); renderer.syncDetailPolicy(); }
assert.equal(renderer.detail, 'lean', 'auto policy should degrade expression under sustained draw pressure');
for (let i = 0; i < 5; i++) { renderer.frames = Array(24).fill(2); renderer.syncDetailPolicy(); }
assert.equal(renderer.detail, 'full', 'auto policy should restore detail only after sustained recovery headroom');
assert.equal(renderer.setDetailPolicy('invented'), false, 'unknown policy must fail closed');
assert.equal(JSON.stringify(renderer.scene), canonicalBefore, 'adaptive policy must remain realization-only');
console.log(`City fidelity: PASS (decorative work ${fullWork} -> ${leanWork}; truth unchanged; hysteretic auto degrade/recover)`);
