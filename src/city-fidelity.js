(function (root) {
  'use strict';

  const BaseRenderer = root.AnomalyGardenCityRenderer;
  if (!BaseRenderer) return;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  class AdaptiveCityRenderer extends BaseRenderer {
    constructor(canvas, onSelect, onEnter) {
      super(canvas, onSelect, onEnter);
      this.detailPolicy = 'auto';
      this.detail = 'full';
      this.detailReason = 'measuring draw cost';
      this.detailSlowWindows = 0;
      this.detailFastWindows = 0;
      this.detailThresholds = Object.freeze({ leanAboveMs: 8, recoverBelowMs: 4, windowSamples: 24 });
      this.installDetailControls();
      this.updateDetailStatus();
    }

    installDetailControls() {
      const slot = document.getElementById('city-motion-slot');
      if (!slot || document.getElementById('city-detail')) return;

      const label = document.createElement('label');
      label.setAttribute('for', 'city-detail');
      label.append(document.createTextNode('Detail '));
      const select = document.createElement('select');
      select.id = 'city-detail';
      select.setAttribute('aria-describedby', 'city-detail-state');
      for (const [value, text] of [['auto', 'Auto'], ['full', 'Full'], ['lean', 'Lean']]) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = text;
        select.appendChild(option);
      }
      label.appendChild(select);

      const status = document.createElement('span');
      status.id = 'city-detail-state';
      status.className = 'city-detail-state';
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      slot.append(label, status);

      select.addEventListener('change', () => this.setDetailPolicy(select.value));

      if (!document.getElementById('city-detail-style')) {
        const style = document.createElement('style');
        style.id = 'city-detail-style';
        style.textContent = `
          .city-dock #city-motion-slot{display:flex;align-items:center;justify-content:flex-end;gap:.55rem;flex-wrap:wrap}
          .city-dock #city-detail{width:76px}
          .city-detail-state{color:#9fbaa1;font:9px ui-monospace,monospace;letter-spacing:.055em;text-transform:uppercase;white-space:nowrap}
          .city-detail-state[data-detail="lean"]{color:#d5e5a6}
          @media(max-width:620px){.city-dock #city-motion-slot{width:100%;justify-content:flex-start}.city-detail-state{white-space:normal;line-height:1.35}.city-dock #city-detail{min-height:44px}}
          @media(prefers-contrast:more){.city-detail-state{color:#fff}.city-detail-state[data-detail="lean"]{color:#fff7ad}}
        `;
        document.head.appendChild(style);
      }
    }

    setDetailPolicy(policy) {
      if (!['auto', 'full', 'lean'].includes(policy)) return false;
      this.detailPolicy = policy;
      this.detailSlowWindows = 0;
      this.detailFastWindows = 0;
      this.frames = [];
      if (policy === 'auto') this.setResolvedDetail('full', 'measuring draw cost', false);
      else this.setResolvedDetail(policy, 'user selected', false);
      this.draw(performance.now());
      this.updateDetailStatus();
      return true;
    }

    setResolvedDetail(detail, reason, resetSamples = true) {
      if (!['full', 'lean'].includes(detail)) return false;
      const changed = this.detail !== detail;
      this.detail = detail;
      this.detailReason = reason;
      if (changed && resetSamples) this.frames = [];
      if (changed) {
        this.detailSlowWindows = 0;
        this.detailFastWindows = 0;
      }
      return changed;
    }

    syncDetailPolicy() {
      if (this.detailPolicy !== 'auto') return;
      const size = this.detailThresholds.windowSamples;
      if (this.frames.length < size) {
        this.detailReason = 'measuring draw cost';
        return;
      }
      const samples = this.frames.slice(-size);
      const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
      if (this.detail === 'full') {
        this.detailFastWindows = 0;
        this.detailSlowWindows = mean > this.detailThresholds.leanAboveMs ? this.detailSlowWindows + 1 : 0;
        this.detailReason = this.detailSlowWindows ? 'draw budget under pressure' : 'draw budget healthy';
        if (this.detailSlowWindows >= 3) this.setResolvedDetail('lean', 'draw budget protected');
      } else {
        this.detailSlowWindows = 0;
        this.detailFastWindows = mean < this.detailThresholds.recoverBelowMs ? this.detailFastWindows + 1 : 0;
        this.detailReason = this.detailFastWindows ? 'testing full-detail recovery' : 'draw budget protected';
        if (this.detailFastWindows >= 5) this.setResolvedDetail('full', 'draw budget recovered');
      }
    }

    realizationSnapshot() {
      const samples = this.frames.slice(-this.detailThresholds.windowSamples);
      const mean = samples.length ? samples.reduce((sum, value) => sum + value, 0) / samples.length : 0;
      return Object.freeze({
        policy: this.detailPolicy,
        detail: this.detail,
        reason: this.detailReason,
        sampleCount: samples.length,
        drawMeanMs: Number(mean.toFixed(2)),
        thresholds: this.detailThresholds,
        authority: 'EXPRESSION_ONLY'
      });
    }

    updateDetailStatus() {
      const snapshot = this.realizationSnapshot();
      const status = document.getElementById('city-detail-state');
      const select = document.getElementById('city-detail');
      if (select && select.value !== snapshot.policy) select.value = snapshot.policy;
      if (status) {
        status.dataset.detail = snapshot.detail;
        status.textContent = `${snapshot.policy.toUpperCase()} · ${snapshot.detail.toUpperCase()} · ${snapshot.sampleCount ? snapshot.drawMeanMs.toFixed(2) + ' MS' : 'MEASURING'} · EXPRESSION ONLY`;
        status.title = snapshot.reason;
      }
      if (this.canvas) {
        this.canvas.dataset.detailPolicy = snapshot.policy;
        this.canvas.dataset.detail = snapshot.detail;
        this.canvas.dataset.detailReason = snapshot.reason;
        this.canvas.dataset.detailDrawMeanMs = snapshot.drawMeanMs.toFixed(2);
      }
    }

    backdrop(width, height) {
      if (this.detail !== 'lean') return super.backdrop(width, height);
      const c = this.ctx, palette = this.colors;
      const phase = this.scene.dayPhase, light = .15 + Math.sin(phase * Math.PI) * .1;
      const background = c.createLinearGradient(0, 0, 0, height);
      background.addColorStop(0, palette.sky);
      background.addColorStop(.58, palette.ground);
      background.addColorStop(1, '#010605');
      c.fillStyle = background;
      c.fillRect(0, 0, width, height);
      const towers = 18;
      for (let i = 0; i < towers; i++) {
        const value = root.AnomalyGardenCityProjection.hash(this.scene.seed + ':' + this.scene.key + ':sky:lean:' + i);
        const block = width / 17;
        const x = i * width / towers;
        const tall = 35 + value % 135;
        c.fillStyle = i % 2 ? '#10221d' : '#091914';
        c.fillRect(x, height * .36 - tall, block, tall);
        for (let row = 0; row < 4; row++) {
          c.fillStyle = `rgba(123,205,139,${light * ((value >> row) & 1)})`;
          c.fillRect(x + block * .25, height * .36 - tall + row * 28, block * .5, 2);
        }
      }
      c.fillStyle = palette.accent + '18';
      c.fillRect(0, height * .36, width, 1);
    }

    box(x, y, w, d, height, accent, type) {
      if (this.detail !== 'lean') return super.box(x, y, w, d, height, accent, type);
      const code = this.mode === 'code';
      const a = this.point(x, y), b = this.point(x + w, y), cc = this.point(x + w, y + d), dd = this.point(x, y + d);
      const A = this.point(x, y, height), B = this.point(x + w, y, height), C = this.point(x + w, y + d, height), D = this.point(x, y + d, height);
      this.poly([a, b, cc, dd], '#00000044');
      this.poly([b, cc, C, B], code ? '#04150dee' : '#122321', code ? '#34734a' : '#29423a');
      this.poly([dd, cc, C, D], code ? '#061b12ee' : '#1d302c', code ? '#34734a' : '#345448');
      this.poly([A, B, C, D], code ? '#0d2e1d' : '#2e4840', code ? '#67c58a' : '#517261');
      if (type !== 'park') {
        const c = this.ctx;
        const p = this.point(x + w * .5, y + d + .004, clamp(height * .45, 10, height - 6));
        c.fillStyle = code ? '#4ce78366' : accent;
        c.fillRect(p.x - 2 * this.scale, p.y - 2 * this.scale, 4 * this.scale, 4 * this.scale);
      }
    }

    draw(now) {
      this.syncDetailPolicy();
      super.draw(now);
      this.updateDetailStatus();
    }
  }

  root.AnomalyGardenCityRenderer = AdaptiveCityRenderer;
})(window);
