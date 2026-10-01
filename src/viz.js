import { bgCss } from './themes.js';

export class Viz {
  constructor(canvas, stage) {
    this.canvas = canvas;
    this.stage = stage;
    this.ctx = canvas.getContext('2d');
    this.rot = 0;
    this.particles = [];
    this.beatAvg = 0;
    this.bassPulse = 0;
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
    const baseR = Math.min(W, H) * 0.16;
    const maxBar = Math.min(W, H) * 0.26;

    // 背景径向光（随贝斯呼吸，颜色跟随主题）
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.5);
    glow.addColorStop(0, o.palAt(0.30, 0.10 + this.bassPulse * 0.22));
    glow.addColorStop(0.4, o.palAt(0.02, 0.05 + this.bassPulse * 0.10));
    glow.addColorStop(1, bgCss(o.bgRGB, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    this.rot += (0.003 + this.bassPulse * 0.02) * k;

    if (o.mode === 'ring' || o.mode === 'fusion') this.drawRing(cx, cy, baseR, maxBar, freqArr, o.palAt);
    if (o.mode === 'bars' || o.mode === 'fusion') this.drawBars(W, H, freqArr, o.palAt);
    if (o.mode === 'wave' || o.mode === 'fusion') this.drawWave(W, H, waveArr, o.palAt);
    if (o.mode === 'fusion') this.drawCenter(cx, cy, baseR, o.palAt);

    if (freqArr) {
      this.beatAvg += (bass - this.beatAvg) * Math.min(1, 0.1 * k);
      if (bass - this.beatAvg > 0.18 && bass > 0.45) this.spawnBeat(cx, cy, baseR);
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

  drawCenter(cx, cy, baseR, palAt) {
    const ctx = this.ctx;
    const r = baseR * 0.72 + this.bassPulse * 8;
    ctx.shadowBlur = 30;
    ctx.shadowColor = palAt(0.25, .5 + this.bassPulse * .4);
    const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
    g.addColorStop(0, palAt(0.3, 0.42));
    g.addColorStop(0.55, 'rgba(0,0,0,0.55)');
    g.addColorStop(1, 'rgba(0,0,0,0.9)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = palAt(0.25, 0.12);
    ctx.lineWidth = 1;
    for (let i = 1; i <= 6; i++) {
      ctx.beginPath(); ctx.arc(cx, cy, r * i / 7, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.rot * 4);
    ctx.fillStyle = palAt(this.rot * 0.05, 0.9);
    ctx.beginPath(); ctx.arc(0, 0, r * 0.18, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  spawnBeat(cx, cy, baseR) {
    const n = 14;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 2 + Math.random() * 4;
      this.particles.push({
        x: cx + Math.cos(a) * baseR, y: cy + Math.sin(a) * baseR,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
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
