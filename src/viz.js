import { bgCss } from './themes.js';
import { Turntable } from './turntable.js';

export class Viz {
  constructor(canvas, stage) {
    this.canvas = canvas;
    this.stage = stage;
    this.ctx = canvas.getContext('2d');
    this.rot = 0;
    this.particles = [];
    this.beatAvg = 0;
    this.bassPulse = 0;
    this.tt = new Turntable();
  }

  attachResize() {
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = this.stage.getBoundingClientRect();
      this.canvas.width = Math.max(2, Math.floor(r.width * dpr));
      this.canvas.height = Math.max(2, Math.floor(r.height * dpr));
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    window.addEventListener('resize', resize);
    new ResizeObserver(resize).observe(this.stage);
    resize();
  }

  // 悬停在唱片上 = 指针反馈；点击唱片 = 播放/暂停
  attachInteraction(onToggle) {
    const stage = this.stage;
    stage.addEventListener('pointermove', e => {
      const r = stage.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      const over = this.tt.hit(x, y);
      this.tt.setPointer((x / r.width) * 2 - 1, (y / r.height) * 2 - 1, over);
      stage.style.cursor = over ? 'pointer' : '';
    });
    stage.addEventListener('pointerleave', () => this.tt.setPointer(0, 0, false));
    stage.addEventListener('click', e => {
      if (e.target.closest('.mode-bar')) return;
      const r = stage.getBoundingClientRect();
      if (this.tt.hit(e.clientX - r.left, e.clientY - r.top)) onToggle();
    });
  }

  frame(dt, o) {
    const W = this.stage.clientWidth, H = this.stage.clientHeight;
    if (W < 2 || H < 2) return;
    const ctx = this.ctx;
    // 帧率无关：60fps 时 k=1，与旧版逐帧常量等价
    const k = Math.min(3, Math.max(0.25, dt * 60));

    const freqArr = o.data ? o.data.freq : null;
    const waveArr = o.data ? o.data.wave : null;

    let bass = 0;
    if (freqArr) { for (let i = 0; i < 8; i++) bass += freqArr[i]; bass /= 8 * 255; }
    this.bassPulse += (bass - this.bassPulse) * Math.min(1, 0.18 * k);

    // 拖尾清屏（颜色跟随主题背景）
    ctx.fillStyle = bgCss(o.bgRGB, 1 - Math.pow(1 - 0.28, k));
    ctx.fillRect(0, 0, W, H);

    const cx = W / 2, cy = H / 2;
    const min = Math.min(W, H);
    const baseR = min * 0.26;
    const maxBar = min * 0.20;

    // 背景径向光（随贝斯呼吸，颜色跟随主题）
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.5);
    glow.addColorStop(0, o.palAt(0.30, 0.10 + this.bassPulse * 0.22));
    glow.addColorStop(0.4, o.palAt(0.02, 0.05 + this.bassPulse * 0.10));
    glow.addColorStop(1, bgCss(o.bgRGB, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    this.rot += (0.003 + this.bassPulse * 0.02) * k;

    if (o.mode === 'bars' || o.mode === 'fusion') this.drawBars(W, H, freqArr, o.palAt);
    if (o.mode === 'ring' || o.mode === 'fusion') this.drawRing(cx, cy, baseR, maxBar, freqArr, o.palAt);
    if (o.mode === 'wave' || o.mode === 'fusion') this.drawWave(W, H, waveArr, o.palAt);

    // 唱机：舞台中心的实体
    this.tt.update(dt, o.playing);
    this.tt.draw(ctx, { cx, cy, r: min * 0.19, palAt: o.palAt, bass: this.bassPulse });

    if (freqArr) {
      this.beatAvg += (bass - this.beatAvg) * Math.min(1, 0.1 * k);
      if (bass - this.beatAvg > 0.18 && bass > 0.45) this.spawnBeat(cx, cy, min * 0.20);
    }
    this.updateParticles(k, o.palAt);
  }

  drawRing(cx, cy, baseR, maxBar, freqArr, palAt) {
    const ctx = this.ctx;
    const N = 128;
    const bins = freqArr ? freqArr.length : 0;
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    for (let i = 0; i < N; i++) {
      const a = i / N * Math.PI * 2 - Math.PI / 2 + this.rot;
      const idx = bins ? Math.floor(Math.pow(i / N, 1.4) * bins * 0.7) : 0;
      const v = freqArr ? freqArr[idx] / 255 : 0;
      const len = v * maxBar;
      const r1 = baseR, r2 = baseR + len;
      const x1 = cx + Math.cos(a) * r1, y1 = cy + Math.sin(a) * r1;
      const x2 = cx + Math.cos(a) * r2, y2 = cy + Math.sin(a) * r2;
      const g = ctx.createLinearGradient(x1, y1, x2, y2);
      g.addColorStop(0, palAt(i / N, 0.95));
      g.addColorStop(1, palAt(i / N + 0.08, 0));
      ctx.strokeStyle = g;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      const a2 = -a - Math.PI + this.rot * 2;
      const x3 = cx + Math.cos(a2) * r1, y3 = cy + Math.sin(a2) * r1;
      const x4 = cx + Math.cos(a2) * r2, y4 = cy + Math.sin(a2) * r2;
      ctx.beginPath(); ctx.moveTo(x3, y3); ctx.lineTo(x4, y4); ctx.stroke();
    }
  }

  drawBars(W, H, freqArr, palAt) {
    const ctx = this.ctx;
    const N = 64, bw = W / N;
    const bins = freqArr ? freqArr.length : 0;
    for (let i = 0; i < N; i++) {
      const idx = bins ? Math.floor(Math.pow(i / N, 1.3) * bins * 0.6) : 0;
      const v = freqArr ? freqArr[idx] / 255 : 0;
      const h = v * H * 0.32;
      const x = i * bw;
      const y = H - h;
      const g = ctx.createLinearGradient(0, y, 0, H);
      g.addColorStop(0, palAt(i / N * 0.75, 0.9));
      g.addColorStop(1, palAt(i / N * 0.75 + 0.18, 0.15));
      ctx.fillStyle = g;
      ctx.fillRect(x + 1, y, bw - 2, h);
      ctx.globalAlpha = 0.12;
      ctx.fillRect(x + 1, H, bw - 2, -h * 0.4);
      ctx.globalAlpha = 1;
    }
  }

  drawWave(W, H, waveArr, palAt) {
    if (!waveArr) return;
    const ctx = this.ctx;
    const n = waveArr.length;
    ctx.lineWidth = 2;
    ctx.strokeStyle = palAt(0.02, 0.85);
    ctx.shadowBlur = 12;
    ctx.shadowColor = palAt(0.02, 0.6);
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = i / (n - 1) * W;
      const y = H * 0.5 + (waveArr[i] - 128) / 128 * H * 0.18;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  spawnBeat(cx, cy, baseR) {
    const n = 14;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 2 + Math.random() * 4;
      this.particles.push({
        x: cx + Math.cos(a) * baseR, y: cy + Math.sin(a) * baseR * 0.65,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.65,
        life: 1, t: Math.random(),
      });
    }
    if (this.particles.length > 260) this.particles.splice(0, this.particles.length - 260);
  }

  updateParticles(k, palAt) {
    const ctx = this.ctx;
    const damp = Math.pow(0.97, k);
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * k;
      p.y += p.vy * k;
      p.vx *= damp;
      p.vy *= damp;
      p.life -= 0.018 * k;
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      ctx.fillStyle = palAt(p.t, p.life);
      ctx.beginPath(); ctx.arc(p.x, p.y, 2.4 * p.life + 0.5, 0, Math.PI * 2); ctx.fill();
    }
  }
}
