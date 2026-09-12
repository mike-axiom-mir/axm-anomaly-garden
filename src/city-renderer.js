(function (root) {
  'use strict';
  const { hash } = root.AnomalyGardenCityProjection;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const mix = (a, b, t) => a + (b - a) * t;

  class CityRenderer {
    constructor(canvas, onSelect, onEnter) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.onSelect = onSelect;
      this.onEnter = onEnter;
      this.scene = null;
      this.previous = new Map();
      this.targets = new Map();
      this.trails = new Map();
      this.signals = [];
      this.selected = null;
      this.follow = false;
      this.eventFocus = false;
      this.mode = 'city';
      this.zoom = 1;
      this.pan = { x:0, y:0 };
      this.focusPoint = null;
      this.hits = [];
      this.clock = 0;
      this.running = false;
      this.reduced = false;
      this.frames = [];
      this.cadence = [];
      this.width = 1200;
      this.height = 650;
      this.last = 0;
      this.changeAt = 0;
      this.transitionAt = 0;
      this.dead = false;
      this.resize = new ResizeObserver(entries => {
        const rect = entries[0].contentRect;
        this.width = rect.width;
        this.height = rect.height;
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        canvas.width = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);
        this.dpr = dpr;
        this.draw(performance.now());
      });
      this.resize.observe(canvas);
      let drag = null;
      canvas.addEventListener('pointerdown', event => {
        drag = { x:event.clientX, y:event.clientY, px:this.pan.x, py:this.pan.y, moved:false };
        canvas.setPointerCapture(event.pointerId);
      });
      canvas.addEventListener('pointermove', event => {
        if (!drag) return;
        const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
        if (Math.hypot(dx, dy) > 5) drag.moved = true;
        if (drag.moved) {
          this.follow = false;
          this.eventFocus = false;
          this.focusPoint = null;
          this.pan = { x:drag.px + dx, y:drag.py + dy };
        }
      });
      canvas.addEventListener('pointerup', event => {
        if (drag && !drag.moved) {
          const rect = canvas.getBoundingClientRect(), x = event.clientX - rect.left, y = event.clientY - rect.top;
          const hit = this.hits.filter(item => Math.hypot(item.x - x, item.y - y) < item.radius)
            .sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0];
          if (hit) {
            if (hit.portal) this.onEnter(hit.id);
            else this.onSelect(hit.id);
          }
        }
        drag = null;
      });
      canvas.addEventListener('pointercancel', () => { drag = null; });
      canvas.addEventListener('wheel', event => {
        if (!event.ctrlKey && !event.metaKey) return;
        event.preventDefault();
        this.zoom = clamp(this.zoom * Math.exp(-event.deltaY * .001), .65, 2.5);
      }, { passive:false });
      this.loop = time => {
        if (this.dead) return;
        if (!this.last || time - this.last >= 31) {
          const elapsed = this.last ? Math.min(time - this.last, 100) : 0;
          if (this.running && !this.reduced && !document.hidden) this.clock += elapsed;
          if (this.last && !document.hidden) {
            this.cadence.push(time - this.last);
            if (this.cadence.length > 120) this.cadence.shift();
          }
          this.last = time;
          if (!document.hidden) {
            const begin = performance.now();
            this.draw(time);
            this.frames.push(performance.now() - begin);
            if (this.frames.length > 120) this.frames.shift();
          }
        }
        this.frame = requestAnimationFrame(this.loop);
      };
      this.frame = requestAnimationFrame(this.loop);
    }

    setScene(scene) {
      const now = performance.now();
      const reset = !this.scene || this.scene.key !== scene.key || this.scene.seed !== scene.seed || scene.tick < this.scene.tick;
      if (reset) {
        this.signals = [];
        this.trails.clear();
      } else {
        const additions = root.AnomalyGardenCitySignals.changes(this.scene, scene).map((signal, index) => ({ ...signal, at:now, order:index }));
        this.signals = this.signals.filter(signal => now - signal.at < 2400).concat(additions).slice(-28);
      }
      if (reset) {
        this.previous.clear();
        this.targets.clear();
        this.pan = { x:0, y:0 };
        this.zoom = this.width < 620 ? 1.32 : 1;
        this.selected = null;
        this.clock = 0;
        this.focusPoint = null;
        this.transitionAt = now;
      }
      if (reset || scene.tick !== this.scene.tick) {
        const smooth = !reset && scene.tick === this.scene.tick + 1;
        const old = new Map(this.targets);
        this.targets = new Map();
        this.previous = new Map();
        for (const entity of scene.people.concat(scene.repairs, scene.programs)) {
          const target = { x:entity.x, y:entity.y };
          this.targets.set(entity.id, target);
          this.previous.set(entity.id, smooth && old.has(entity.id) ? old.get(entity.id) : target);
          if (scene.people.includes(entity)) {
            const trail = this.trails.get(entity.id) || [];
            const last = trail.at(-1);
            if (!last || last.x !== entity.x || last.y !== entity.y || last.tick !== scene.tick) trail.push({ ...target, tick:scene.tick });
            this.trails.set(entity.id, trail.slice(-12));
          }
        }
        this.changeAt = now;
      }
      this.scene = scene;
    }

    position(entity, now) {
      const start = this.previous.get(entity.id) || entity;
      const t = this.reduced ? 1 : clamp((now - this.changeAt) / 380, 0, 1);
      return { x:mix(start.x, entity.x, t), y:mix(start.y, entity.y, t), moving:Math.abs(start.x - entity.x) + Math.abs(start.y - entity.y) > 0 && t < 1, dx:entity.x - start.x, dy:entity.y - start.y };
    }

    point(x, y, z = 0) {
      return { x:this.ox + (x - y) * this.unit, y:this.oy + (x + y) * this.unit * .5 - z * this.scale };
    }

    poly(points, fill, stroke, width = 1) {
      const c = this.ctx;
      c.beginPath();
      points.forEach((p, index) => index ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y));
      c.closePath();
      if (fill) { c.fillStyle = fill; c.fill(); }
      if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
    }

    line(a, b, color, width = 1) {
      const c = this.ctx;
      c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y);
      c.strokeStyle = color; c.lineWidth = width; c.stroke();
    }

    label(text, point, color = '#b4d8c4', size = 11) {
      const c = this.ctx;
      c.font = `${size}px ui-monospace,monospace`;
      c.textAlign = 'center';
      const width = c.measureText(text).width;
      let y = clamp(point.y, size + 5, this.height - 28);
      let box = { x:point.x - width / 2 - 5, y:y - size - 3, w:width + 10, h:size + 7 };
      for (let attempt = 0; attempt < 5 && (this.labelBoxes || []).some(other => box.x < other.x + other.w && box.x + box.w > other.x && box.y < other.y + other.h && box.y + box.h > other.y); attempt++) {
        y -= size + 7;
        box = { ...box, y:y - size - 3 };
      }
      (this.labelBoxes || (this.labelBoxes = [])).push(box);
      c.fillStyle = '#030a08e6';
      c.fillRect(box.x, box.y, box.w, box.h);
      c.fillStyle = color;
      c.fillText(text, point.x, y);
    }

    palette() {
      if (!this.scene.depth) return { accent:'#75ffc1', dim:'#355f4c', ground:'#10221f', tile:'#132823', sky:'#020b09', glow:'#9cffb3' };
      const sets = [
        { accent:'#8adfff', dim:'#345c6b', ground:'#101d25', tile:'#142630', sky:'#030a10', glow:'#9cecff' },
        { accent:'#c6a2ff', dim:'#5f4e74', ground:'#1c1725', tile:'#271d31', sky:'#09050e', glow:'#d3b5ff' },
        { accent:'#ffcc86', dim:'#735d3c', ground:'#251d13', tile:'#302516', sky:'#0e0903', glow:'#ffdda1' }
      ];
      return sets[(this.scene.depth - 1 + hash(this.scene.key) % sets.length) % sets.length];
    }

    box(x, y, w, d, height, accent, type) {
      const code = this.mode === 'code';
      const a = this.point(x, y), b = this.point(x + w, y), cc = this.point(x + w, y + d), dd = this.point(x, y + d);
      const A = this.point(x, y, height), B = this.point(x + w, y, height), C = this.point(x + w, y + d, height), D = this.point(x, y + d, height);
      this.poly([a, b, cc, dd], '#00000044');
      this.poly([b, cc, C, B], code ? '#04150dee' : '#122321', code ? '#34734a' : '#29423a');
      this.poly([dd, cc, C, D], code ? '#061b12ee' : '#1d302c', code ? '#34734a' : '#345448');
      this.poly([A, B, C, D], code ? '#0d2e1d' : '#2e4840', code ? '#67c58a' : '#517261');
      if (type === 'park') return;
      const rows = Math.max(1, Math.floor(height / 15));
      for (let row = 0; row < rows; row++) for (let column = 0; column < 3; column++) {
        const z = 10 + row * 14, u = (column + .18) / 3, ww = w * .17;
        const color = code ? '#4ce78388' : ((column + row) % 4 === 0 ? '#10251d' : accent);
        this.poly([this.point(x + w * u, y + d + .004, z), this.point(x + w * u + ww, y + d + .004, z), this.point(x + w * u + ww, y + d + .004, z + 6), this.point(x + w * u, y + d + .004, z + 6)], color);
        this.poly([this.point(x + w + .004, y + d * u, z), this.point(x + w + .004, y + d * u + d * .17, z), this.point(x + w + .004, y + d * u + d * .17, z + 6), this.point(x + w + .004, y + d * u, z + 6)], color);
      }
    }

    backdrop(width, height) {
      const c = this.ctx, palette = this.colors;
      const phase = this.scene.dayPhase, light = .15 + Math.sin(phase * Math.PI) * .1;
      const background = c.createLinearGradient(0, 0, 0, height);
      background.addColorStop(0, palette.sky);
      background.addColorStop(.58, palette.ground);
      background.addColorStop(1, '#010605');
      c.fillStyle = background; c.fillRect(0, 0, width, height);
      for (let i = 0; i < 42; i++) {
        const value = hash(this.scene.seed + ':' + this.scene.key + ':sky:' + i), block = width / 38;
        const x = i * width / 40, tall = 35 + value % 155;
        c.fillStyle = i % 2 ? '#10221d' : '#091914';
        c.fillRect(x, height * .36 - tall, block, tall);
        for (let row = 0; row < 8; row++) {
          c.fillStyle = `rgba(123,205,139,${light * ((value >> row) & 1)})`;
          c.fillRect(x + block * .25, height * .36 - tall + row * 18, block * .5, 2);
        }
      }
      c.fillStyle = palette.accent + '18';
      c.fillRect(0, height * .36, width, 1);
    }

    ground() {
      const s = this.scene, c = this.ctx, palette = this.colors;
      const a = this.point(-.6, -.6), b = this.point(s.width - .1, -.6), cc = this.point(s.width - .1, s.height - .1), d = this.point(-.6, s.height - .1);
      this.poly([d, cc, { x:cc.x, y:cc.y + 20 * this.scale }, { x:d.x, y:d.y + 20 * this.scale }], '#0d2420', palette.dim);
      this.poly([b, cc, { x:cc.x, y:cc.y + 20 * this.scale }, { x:b.x, y:b.y + 20 * this.scale }], '#061713', palette.dim);
      this.poly([a, b, cc, d], this.mode === 'code' ? '#04140d' : palette.ground, palette.dim);
      for (let x = 0; x < s.width; x++) for (let y = 0; y < s.height; y++) {
        const tile = [this.point(x - .45, y - .45), this.point(x + .45, y - .45), this.point(x + .45, y + .45), this.point(x - .45, y + .45)];
        this.poly(tile, (x + y) % 2 ? palette.ground : palette.tile, this.mode === 'code' ? palette.accent + '33' : palette.dim + '33');
      }
      for (let x = 0; x < s.width; x++) this.line(this.point(x, -.5), this.point(x, s.height - .25), '#06110f', this.unit * .28);
      for (let y = 0; y < s.height; y++) this.line(this.point(-.5, y), this.point(s.width - .25, y), '#071310', this.unit * .28);
      c.setLineDash([3 * this.scale, 8 * this.scale]);
      for (let x = 0; x < s.width; x++) this.line(this.point(x, -.5), this.point(x, s.height - .25), palette.accent + '1a');
      for (let y = 0; y < s.height; y++) this.line(this.point(-.5, y), this.point(s.width - .25, y), palette.accent + '1a');
      c.setLineDash([]);
      for (let x = 0; x < s.width; x += 2) for (const y of [-.34, s.height - .25]) {
        const base = this.point(x, y), top = this.point(x, y, 18);
        this.line(base, top, palette.dim, 1.2 * this.scale);
        c.fillStyle = palette.glow; c.shadowColor = palette.glow; c.shadowBlur = 5;
        c.fillRect(top.x - 1.5, top.y - 1.5, 3, 2); c.shadowBlur = 0;
      }
      for (const anomaly of s.anomalies) {
        const p = this.point(anomaly.x, anomaly.y), radius = anomaly.radius * this.unit * .52;
        c.save(); c.translate(p.x, p.y); c.scale(1, .5);
        const glow = c.createRadialGradient(0, 0, 1, 0, 0, radius);
        glow.addColorStop(0, palette.glow + '55'); glow.addColorStop(1, palette.glow + '00');
        c.fillStyle = glow; c.beginPath(); c.arc(0, 0, radius, 0, Math.PI * 2); c.fill(); c.restore();
      }
    }

    building(building) {
      const x = building.x - .78, y = building.y - .78, c = this.ctx, k = this.scale;
      const color = building.type === 'home' ? this.colors.accent + '4d' : '#beeaa377';
      const roof = (z, fill) => this.poly([this.point(x - .05, y - .05, z), this.point(x + .65, y - .05, z), this.point(x + .65, y + .65, z), this.point(x - .05, y + .65, z)], fill, this.colors.dim);
      let top = building.height;
      if (building.name === 'Park') {
        top = 32; this.box(x, y, .57, .57, 7, '#2f7849', 'park');
        for (let i = 0; i < 4; i++) {
          const p = this.point(x + .1 + i * .14, y + .18 + (i % 2) * .17, 20 + i % 2 * 4);
          this.line(p, { x:p.x, y:p.y + 16 * k }, '#668863', 3 * k);
          c.fillStyle = i % 2 ? '#508862' : '#3c7453'; c.beginPath(); c.ellipse(p.x, p.y, 8 * k, 11 * k, 0, 0, Math.PI * 2); c.fill();
        }
      } else if (building.name === 'Observatory') {
        top = 102; this.box(x, y, .58, .57, 72, '#65ffc299');
        const p = this.point(x + .29, y + .29, 72);
        c.fillStyle = '#648e7a'; c.strokeStyle = '#b1d6bd'; c.beginPath(); c.ellipse(p.x, p.y, 20 * k, 23 * k, 0, Math.PI, Math.PI * 2); c.closePath(); c.fill(); c.stroke();
        this.line({ x:p.x - 4 * k, y:p.y - 17 * k }, { x:p.x + 24 * k, y:p.y - 32 * k }, '#c3dfce', 5 * k);
      } else if (building.name === 'Market' || building.name === 'Cafe') {
        top = 34; this.box(x, y, .58, .57, 22, color); roof(27, '#718c62');
        for (let i = 0; i < 5; i++) this.poly([this.point(x + i * .12, y + .57, 27), this.point(x + (i + 1) * .12, y + .57, 27), this.point(x + (i + 1) * .12, y + .73, 22), this.point(x + i * .12, y + .73, 22)], i % 2 ? '#b5c896' : '#345d48');
        if (building.name === 'Cafe') {
          const p = this.point(x + .8, y + .35, 8); c.fillStyle = '#b6c7a0'; c.beginPath(); c.ellipse(p.x, p.y, 7 * k, 3 * k, 0, 0, Math.PI * 2); c.fill(); this.line(p, this.point(x + .8, y + .35), '#79957e', 2 * k);
        }
      } else if (building.name === 'Station') {
        top = 43; this.box(x, y, .58, .57, 9, color);
        for (const dx of [0, .56]) for (const dy of [0, .56]) this.line(this.point(x + dx, y + dy, 9), this.point(x + dx, y + dy, 36), '#a4c4ac', 2 * k);
        roof(36, '#3e6858'); roof(40, '#507c66'); this.line(this.point(x, y + .22, 10), this.point(x + .58, y + .22, 10), '#d2dbc1', 2 * k);
      } else if (building.name === 'Workshop' || building.name === 'Repair Depot') {
        top = 62; this.box(x, y, .58, .57, 38, color);
        for (let i = 0; i < 3; i++) this.box(x + i * .18, y, .15, .57, 44 + i % 2 * 7, '#83a98d', 'park');
        this.box(x + .38, y + .1, .12, .12, 60, '#94c8aa', 'park');
      } else this.box(x, y, .58, .57, building.height, color);
      if (building.type !== 'home') {
        this.label(building.name.toUpperCase(), this.point(x + .3, y + .57, top + 8), '#d6f0b9', Math.max(9, 10 * k));
        const stock = Math.max(0, Number(building.stock || 0)), width = Math.min(26, stock * 2.2) * k;
        const p = this.point(x + .3, y + .62, top - 4); c.fillStyle = '#050b09cc'; c.fillRect(p.x - 14 * k, p.y, 28 * k, 3 * k); c.fillStyle = this.colors.accent; c.fillRect(p.x - 14 * k, p.y, width, 3 * k);
      }
    }

    drawTrail(person) {
      if (person.id !== this.selected) return;
      const points = this.trails.get(person.id) || [];
      if (points.length > 1) {
        const c = this.ctx; c.setLineDash([3, 5]); c.beginPath();
        points.forEach((point, index) => { const p = this.point(point.x, point.y); if (index) c.lineTo(p.x, p.y); else c.moveTo(p.x, p.y); });
        c.strokeStyle = this.colors.accent + '88'; c.lineWidth = 1.5; c.stroke(); c.setLineDash([]);
        for (const point of points.slice(-6)) { const p = this.point(point.x, point.y); c.fillStyle = this.colors.accent + '66'; c.fillRect(p.x - 1.5, p.y - 1.5, 3, 3); }
      }
      if (person.target) {
        const start = this.point(person.x, person.y), target = this.point(person.target.x, person.target.y);
        this.line(start, target, this.colors.accent + (this.mode === 'code' ? '77' : '35'));
        const c = this.ctx; c.strokeStyle = this.colors.accent; c.beginPath(); c.ellipse(target.x, target.y, 8 * this.scale, 4 * this.scale, 0, 0, Math.PI * 2); c.stroke();
      }
    }

    socialLinks(now) {
      const people = this.scene.people;
      for (let i = 0; i < people.length; i++) for (let j = i + 1; j < people.length; j++) {
        const a = people[i], b = people[j];
        if (a.activity !== 'social' || b.activity !== 'social' || a.x !== b.x || a.y !== b.y) continue;
        const pa = this.point(this.position(a, now).x, this.position(a, now).y, 23), pb = this.point(this.position(b, now).x, this.position(b, now).y, 23);
        const lift = 8 * this.scale + Math.sin(this.clock * .004 + i) * 2;
        const c = this.ctx; c.beginPath(); c.moveTo(pa.x, pa.y); c.quadraticCurveTo((pa.x + pb.x) / 2, Math.min(pa.y, pb.y) - lift, pb.x, pb.y); c.strokeStyle = '#ffd89888'; c.stroke();
      }
    }

    person(person, now) {
      const c = this.ctx, motion = this.position(person, now), p = this.point(motion.x, motion.y), k = Math.max(.7, this.scale);
      const selected = person.id === this.selected;
      const roleColors = { maker:'#8effcf', maintainer:'#b2ed9d', analyst:'#8fdcff', clerk:'#efcf91', courier:'#ffab88', gardener:'#b9e486', researcher:'#a8d8ff', builder:'#d4c794', harvester:'#b6df91' };
      const hue = person.awakened ? '#c7a0ff' : person.investigating ? '#edca83' : roleColors[person.role] || '#94c3ac';
      const phase = this.clock * .018 + hash(person.id) % 10;
      const stride = motion.moving && !this.reduced ? Math.sin(phase) * 3 : 0;
      const peers = this.scene.people.filter(other => other.x === person.x && other.y === person.y);
      const index = peers.findIndex(other => other.id === person.id);
      p.x += (index - (peers.length - 1) / 2) * 7 * k;
      const facing = motion.dx || motion.dy ? Math.sign(motion.dx - motion.dy) || 1 : person.target ? Math.sign((person.target.x - person.x) - (person.target.y - person.y)) || 1 : 1;
      const idle = this.reduced ? 0 : Math.sin(this.clock * .003 + hash(person.id)) * (person.activity === 'rest' || person.activity === 'home' ? .7 : 1.5);
      c.save(); c.translate(p.x, p.y); c.scale(k, k);
      c.fillStyle = '#0009'; c.beginPath(); c.ellipse(0, 1, 8, 3, 0, 0, Math.PI * 2); c.fill();
      this.line({ x:-2, y:-8 }, { x:-3 + stride, y:0 }, '#a8caba', 2.2);
      this.line({ x:2, y:-8 }, { x:3 - stride, y:0 }, '#7d998d', 2.2);
      c.fillStyle = person.awakened ? '#574169' : person.investigating ? '#5e5741' : '#233e34';
      c.beginPath(); c.moveTo(-4, -17 + idle); c.lineTo(4, -17 + idle); c.lineTo(5 + stride * .15, -7); c.lineTo(-5, -7); c.closePath(); c.fill();
      const gesture = person.activity === 'social' ? Math.sin(phase * .55) * 3 : 0;
      this.line({ x:-4, y:-15 + idle }, { x:-6 - stride * .4, y:-8 - gesture }, hue, 1.7);
      this.line({ x:4, y:-15 + idle }, { x:6 + stride * .4, y:-8 + gesture }, hue, 1.7);
      c.fillStyle = hue; c.beginPath(); c.arc(facing * 1.2, -21 + idle, 3.2, 0, Math.PI * 2); c.fill(); c.fillStyle = '#12201c'; c.fillRect(-3 + facing, -25 + idle, 6, 2);
      if (person.activity === 'work' && !motion.moving) {
        const spark = this.reduced ? 0 : Math.sin(phase * 2) * 3; c.fillStyle = '#e7f5ae'; c.fillRect(7, -12 + spark, 2, 2); c.fillRect(10, -8 - spark, 1, 1);
      }
      if (person.activity === 'investigate') {
        c.strokeStyle = '#edca83aa'; c.beginPath(); c.arc(facing * 7, -16, 8 + (this.reduced ? 0 : Math.sin(phase) * 2), -.7, .7); c.stroke();
      }
      if ((person.activity === 'rest' || person.activity === 'home') && !motion.moving) {
        c.fillStyle = '#a5c4b6'; c.font = '8px monospace'; c.fillText('z', 7, -25 - (this.reduced ? 0 : Math.sin(phase) * 2));
      }
      if (person.awakened) {
        c.strokeStyle = '#c7a0ff99'; c.setLineDash([2, 3]); c.beginPath(); c.arc(0, -15, 12 + (this.reduced ? 0 : Math.sin(phase) * 2), 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
      } else if (person.investigating) {
        c.fillStyle = hue; c.font = '11px monospace'; c.textAlign = 'center'; c.fillText('?', 0, -31);
      }
      if (person.hunger > .78) { c.fillStyle = '#f0a37f'; c.fillRect(-6, 3, 12 * clamp(person.hunger, 0, 1), 2); }
      c.restore();
      this.hits.push({ id:person.id, x:p.x, y:p.y - 12 * k, radius:Math.max(16, 15 * k) });
    }

    portal(portal) {
      const c = this.ctx, anchor = this.point(portal.x, portal.y), k = this.scale, phase = this.clock * .001;
      // Co-located nested layers fan horizontally while keeping their canonical anchor visible.
      const stackOffset = (Number(portal.stackIndex || 0) - (Number(portal.stackTotal || 1) - 1) / 2) * 36 * k;
      const base = { x:anchor.x + stackOffset, y:anchor.y - (portal.depth || 0) * 52 * k };
      if (portal.depth) this.line(anchor, base, this.colors.accent + '44');
      const radius = (portal.gate ? 16 : 23) * k;
      c.save(); c.translate(base.x, base.y - 12 * k); c.strokeStyle = portal.gate ? '#f4d69b' : this.colors.accent; c.lineWidth = 2 * k; c.shadowBlur = 12; c.shadowColor = c.strokeStyle;
      c.beginPath(); c.ellipse(0, 0, radius * .62, radius, 0, 0, Math.PI * 2); c.stroke(); c.shadowBlur = 0;
      c.setLineDash([4, 6]); c.lineDashOffset = -phase * 10; c.beginPath(); c.ellipse(0, 0, radius * .9, radius * 1.2, 0, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
      for (let i = 0; i < 4; i++) { const y = ((phase * .4 + i / 4) % 1) * radius * 1.4 - radius * .7; c.fillStyle = this.colors.accent + '33'; c.fillRect(-radius * .3, y, radius * .6, 2 * k); }
      c.restore();
      const stacked = Number(portal.stackTotal || 1) > 1;
      const title = portal.gate ? 'GATE → ' + portal.destination : stacked && this.mode !== 'code' ? 'D' + Number(portal.depth || 0) : portal.id.toUpperCase();
      this.label(title, { x:base.x, y:base.y - radius * 1.6 - 8 * k }, portal.gate ? '#f4d69b' : this.colors.accent, stacked && this.mode !== 'code' ? 9 : 10);
      if (portal.enterable) this.hits.push({ id:portal.gate ? portal.destination : portal.id, portal:true, x:base.x, y:base.y - 12 * k, radius });
    }

    anomaly(anomaly) {
      const c = this.ctx, p = this.point(anomaly.x, anomaly.y), k = this.scale, time = this.clock * .001, strength = Number(anomaly.intensity || .5);
      c.save(); c.translate(p.x, p.y); c.strokeStyle = anomaly.kind === 'memory-scar' ? '#e2b875' : this.colors.accent; c.lineWidth = 1;
      for (let i = 0; i < 7; i++) {
        const offset = this.reduced ? 0 : Math.sin(time * 3 + i) * (4 + strength * 4) * k;
        c.fillStyle = this.colors.accent + Math.round(24 + strength * 36).toString(16).padStart(2, '0');
        c.fillRect(-15 * k + offset, -i * 7 * k, 30 * k, 2 * k);
      }
      c.setLineDash([2, 3]); c.beginPath(); c.ellipse(0, 0, 22 * k, 11 * k, 0, 0, Math.PI * 2); c.stroke(); c.restore();
      if (this.mode === 'code') this.label((anomaly.kind || 'distortion') + ' ' + Math.round(strength * 100) + '%', { x:p.x, y:p.y - 57 * k }, this.colors.glow, 10);
    }

    program(program, now, repair) {
      const motion = this.position(program, now), p = this.point(motion.x, motion.y), c = this.ctx, k = this.scale;
      const color = program.quarantined ? '#8dabff' : repair || program.kind === 'security' ? '#b4f3da' : '#dcaf91';
      c.save(); c.translate(p.x, p.y); c.fillStyle = '#0008'; c.beginPath(); c.ellipse(0, 0, 10 * k, 4 * k, 0, 0, Math.PI * 2); c.fill();
      const bob = this.reduced ? 0 : Math.sin(this.clock * .002 + hash(program.id)) * 2 * k;
      this.poly([{ x:0, y:-24 * k + bob }, { x:8 * k, y:-16 * k + bob }, { x:0, y:-8 * k + bob }, { x:-8 * k, y:-16 * k + bob }], '#182b25', color);
      this.line({ x:0, y:-22 * k + bob }, { x:0, y:-10 * k + bob }, color); c.fillStyle = color; c.fillRect(-2 * k, -18 * k + bob, 4 * k, 3 * k);
      if (program.quarantined) { c.strokeStyle = '#7c9cf7'; c.setLineDash([2, 3]); c.strokeRect(-12 * k, -29 * k, 24 * k, 30 * k); c.setLineDash([]); }
      if (this.mode === 'code' && program.knownTargets) { c.strokeStyle = color + '44'; c.beginPath(); c.ellipse(0, 0, 22 * k, 11 * k, 0, 0, Math.PI * 2); c.stroke(); }
      c.restore();
      if (this.mode === 'code') this.label(program.quarantined ? 'QUARANTINED' : repair ? 'REPAIR ' + program.actions : (program.role || program.kind) + ' G' + Number(program.generation || 0), { x:p.x, y:p.y - 35 * k }, color, 9);
    }

    institution(institution) {
      const c = this.ctx, p = this.point(institution.x - .45 + institution.index * .08, institution.y - .45, 60 + institution.index * 6), k = this.scale;
      c.strokeStyle = this.colors.accent + '88'; c.beginPath(); c.arc(p.x, p.y, 5 * k, 0, Math.PI * 2); c.stroke();
      this.line(p, { x:p.x, y:p.y - 12 * k }, this.colors.accent + '77');
      if (this.mode === 'code') this.label(institution.narrative.toUpperCase(), { x:p.x, y:p.y - 18 * k }, this.colors.accent, 8);
    }

    drawSignals(now) {
      const c = this.ctx, k = Math.max(.7, this.scale);
      const colors = { break:'#d4a8ff', inquiry:'#f4d08f', quarantine:'#99b8ff', repair:'#aaffd1', program:'#e7b695', glitch:'#83ffb3', stabilize:'#b5ffe2', test:'#ffe69c', memory:'#a8dcff', project:'#fff1a3', replicate:'#efb78e', social:'#ffd49b', share:'#e1bbff', institution:'#b8ddff' };
      this.signals = this.signals.filter(signal => now - signal.at < 2400);
      for (const [index, signal] of this.signals.entries()) {
        const age = Math.max(0, now - signal.at) / 2400, p = this.point(signal.x, signal.y), color = colors[signal.kind] || this.colors.accent;
        c.save(); c.globalAlpha = this.reduced ? 1 : Math.min(1, (1 - age) * 3);
        const radius = (this.reduced ? 20 : 12 + age * 38) * k;
        c.strokeStyle = color; c.lineWidth = 2; c.beginPath(); c.ellipse(p.x, p.y, radius, radius * .5, 0, 0, Math.PI * 2); c.stroke();
        if (index >= this.signals.length - 4) this.label(signal.label, { x:p.x, y:p.y - (65 + (this.reduced ? 0 : age * 20)) * k }, color, 10);
        c.restore();
      }
    }

    tracking(now) {
      const person = this.scene.people.find(item => item.id === this.selected);
      if (!person) return;
      const motion = this.position(person, now), p = this.point(motion.x, motion.y), k = Math.max(.7, this.scale), c = this.ctx;
      const peers = this.scene.people.filter(other => other.x === person.x && other.y === person.y);
      p.x += (peers.findIndex(other => other.id === person.id) - (peers.length - 1) / 2) * 7 * k;
      c.save(); c.setLineDash([2, 4]); this.line(p, { x:p.x, y:p.y - 48 * k }, '#bcffcc99'); c.setLineDash([]);
      c.strokeStyle = '#d0ffdc'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(p.x, p.y, 12 * k, 5 * k, 0, 0, Math.PI * 2); c.stroke();
      this.label((this.mode === 'code' ? person.id : person.name) + ' · ' + person.activity, { x:p.x, y:p.y - 51 * k }, '#d0ffdc', 11); c.restore();
    }

    navigator(width) {
      const c = this.ctx, s = this.scene, mobile = width < 620, mapW = mobile ? 78 : 112, mapH = mobile ? 58 : 76, x = width - mapW - 16, y = mobile ? 72 : 18;
      c.save(); c.fillStyle = '#020806dd'; c.strokeStyle = this.colors.dim; c.fillRect(x, y, mapW, mapH); c.strokeRect(x, y, mapW, mapH);
      const px = value => x + 6 + value / Math.max(1, s.width - 1) * (mapW - 12), py = value => y + 6 + value / Math.max(1, s.height - 1) * (mapH - 12);
      for (const building of s.buildings) { c.fillStyle = '#547767'; c.fillRect(px(building.x) - 1, py(building.y) - 1, 3, 3); }
      for (const anomaly of s.anomalies) { c.fillStyle = '#83ffb3'; c.beginPath(); c.arc(px(anomaly.x), py(anomaly.y), 3, 0, Math.PI * 2); c.fill(); }
      for (const person of s.people) { c.fillStyle = person.id === this.selected ? '#ffffff' : person.awakened ? '#c7a0ff' : '#9ac4ad'; c.fillRect(px(person.x) - 1, py(person.y) - 1, person.id === this.selected ? 4 : 2, person.id === this.selected ? 4 : 2); }
      c.font = '8px monospace'; c.textAlign = 'left'; c.fillStyle = this.colors.accent; c.fillText('WORLD', x + 5, y + mapH - 4); c.restore();
    }

    updateCamera(now, width, height) {
      let target = null;
      if (this.eventFocus) {
        const latest = this.signals.at(-1);
        if (latest && now - latest.at < 2200) target = { x:latest.x, y:latest.y };
      }
      if (!target && this.follow && this.selected) {
        const person = this.scene.people.find(item => item.id === this.selected);
        if (person) {
          const motion = this.position(person, now);
          target = { x:motion.x + motion.dx * .3, y:motion.y + motion.dy * .3 };
        }
      }
      if (target) {
        if (!this.focusPoint) this.focusPoint = target;
        const speed = this.reduced ? 1 : .13;
        this.focusPoint = { x:mix(this.focusPoint.x, target.x, speed), y:mix(this.focusPoint.y, target.y, speed) };
        this.ox = width * .5 - (this.focusPoint.x - this.focusPoint.y) * this.unit;
        this.oy = height * .57 - (this.focusPoint.x + this.focusPoint.y) * this.unit * .5;
      } else this.focusPoint = null;
    }

    draw(now) {
      if (!this.ctx || !this.scene || !this.width) return;
      const c = this.ctx, s = this.scene, width = this.width, height = this.height;
      c.setTransform(this.dpr || 1, 0, 0, this.dpr || 1, 0, 0); c.clearRect(0, 0, width, height);
      this.colors = this.palette(); this.backdrop(width, height);
      this.labelBoxes = [];
      this.unit = Math.min(width / (s.width + s.height + 1.5), (height - 130) / (Math.max(s.width, s.height) * .72 + 3)) * this.zoom;
      this.scale = this.unit / 48;
      this.ox = width / 2 + (s.height - s.width) * this.unit / 2 + this.pan.x;
      this.oy = height * .46 - (s.width + s.height) * this.unit * .13 + this.pan.y;
      this.updateCamera(now, width, height);
      this.ground(); this.hits = [];
      s.people.forEach(person => this.drawTrail(person));
      this.socialLinks(now);
      const drawables = [];
      s.buildings.forEach(building => drawables.push({ depth:building.x + building.y - .45, draw:() => this.building(building) }));
      s.people.forEach(person => { const p = this.position(person, now); drawables.push({ depth:p.x + p.y, draw:() => this.person(person, now) }); });
      s.portals.forEach(portal => drawables.push({ depth:portal.x + portal.y + .05, draw:() => this.portal(portal) }));
      s.anomalies.forEach(anomaly => drawables.push({ depth:anomaly.x + anomaly.y, draw:() => this.anomaly(anomaly) }));
      s.programs.forEach(program => drawables.push({ depth:program.x + program.y, draw:() => this.program(program, now, false) }));
      s.repairs.forEach(repair => drawables.push({ depth:repair.x + repair.y, draw:() => this.program(repair, now, true) }));
      s.institutions.forEach(institution => drawables.push({ depth:institution.x + institution.y - .4, draw:() => this.institution(institution) }));
      drawables.sort((a, b) => a.depth - b.depth).forEach(item => item.draw());
      if (this.mode === 'code') {
        c.font = '11px monospace'; c.textAlign = 'left';
        for (let i = 0; i < Math.ceil(width / 24); i++) {
          const value = hash(s.seed + ':code:' + i);
          for (let row = 0; row < 6; row++) {
            const y = (value % height + this.clock * .032 + row * 19) % height;
            c.fillStyle = row === 5 ? this.colors.accent + '66' : this.colors.accent + '24';
            c.fillText(String((value + row + s.tick) % 2), i * 24, y);
          }
        }
      } else if (!this.reduced) {
        for (let i = 0; i < 65; i++) {
          const value = hash('rain:' + i), x = value % width, y = (value % height + this.clock * .12) % height;
          this.line({ x, y }, { x:x - 2, y:y + 9 }, this.colors.accent + '15');
        }
      }
      this.drawSignals(now); this.tracking(now); this.navigator(width);
      const vignette = c.createRadialGradient(width * .5, height * .5, height * .15, width * .5, height * .5, Math.max(width, height) * .7);
      vignette.addColorStop(0, '#0000'); vignette.addColorStop(1, '#010604bb'); c.fillStyle = vignette; c.fillRect(0, 0, width, height);
      const phaseNames = ['REST CYCLE', 'WORK CYCLE', 'SOCIAL CYCLE', 'HOME CYCLE'];
      const phase = s.dayPhase < 10 / s.dayLength ? 0 : s.dayPhase < 29 / s.dayLength ? 1 : s.dayPhase < 38 / s.dayLength ? 2 : 3;
      c.fillStyle = '#9ab7a9'; c.font = '11px ui-monospace,monospace'; c.textAlign = 'left';
      c.fillText(width < 620 ? 'DRAG · USE + / −' : 'DRAG TO PAN  /  CTRL + SCROLL TO ZOOM  /  SELECT A RESIDENT', 20, height - 20);
      if (width >= 620) { c.textAlign = 'right'; c.fillText((this.mode === 'code' ? 'CODE' : 'CITY') + ' EXPRESSION · ' + phaseNames[phase], width - 20, height - 20); }
      const transition = this.reduced ? 1 : clamp((now - this.transitionAt) / 650, 0, 1);
      if (transition < 1) { c.fillStyle = `rgba(0,5,3,${1 - transition})`; c.fillRect(0, 0, width, height); c.fillStyle = this.colors.accent; c.textAlign = 'center'; c.font = '12px monospace'; c.fillText(s.title, width / 2, height / 2); }
    }

    resetCamera() {
      this.pan = { x:0, y:0 };
      this.zoom = this.width < 620 ? 1.32 : 1;
      this.follow = false;
      this.eventFocus = false;
      this.focusPoint = null;
    }

    destroy() {
      this.dead = true;
      cancelAnimationFrame(this.frame);
      this.resize.disconnect();
    }
  }

  root.AnomalyGardenCityRenderer = CityRenderer;
})(window);
