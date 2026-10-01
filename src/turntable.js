// 霓虹玻璃唱机：Canvas 2D 伪 3D 黑胶唱片
// 投影方式：局部圆形经矩阵 [1,0; skew, squash] 变换成带视差倾斜的椭圆盘

const BASE_SQUASH = 0.62;

export class Turntable {
  constructor() {
    this.angle = 0;      // 盘面旋转角
    this.speed = 0;      // 0..1 播放速度（含惯性）
    this.tiltX = 0; this.tiltY = 0;
    this.tx = 0; this.ty = 0;
    this.hover = 0; this.hoverT = 0;
    this.geom = { cx: 0, cy: 0, rx: 1, ry: 1 };
  }

  setPointer(nx, ny, over) {
    this.tx = over ? nx * 0.55 : 0;
    this.ty = over ? ny * 0.30 : 0;
    this.hoverT = over ? 1 : 0;
  }

  // 命中测试用屏幕空间椭圆（pointermove 里判定悬停）
  hit(x, y) {
    const g = this.geom;
    const dx = (x - g.cx) / g.rx;
    const dy = (y - g.cy) / g.ry;
    return dx * dx + dy * dy <= 1;
  }

  update(dt, playing) {
    const target = playing ? 1 : 0;
    // 起转快、停转慢，做出电机惯性
    this.speed += (target - this.speed) * Math.min(1, dt * (playing ? 2.6 : 1.0));
    this.angle += this.speed * dt * 2.2;
    this.tiltX += (this.tx - this.tiltX) * Math.min(1, dt * 5);
    this.tiltY += (this.ty - this.tiltY) * Math.min(1, dt * 5);
    this.hover += (this.hoverT - this.hover) * Math.min(1, dt * 7);
  }

  draw(ctx, o) {
    const { cx, cy, r, palAt, bass } = o;
    const rr = r * (1 + this.hover * 0.03 + bass * 0.02);
    const squash = BASE_SQUASH + this.tiltY * 0.10;
    const skew = this.tiltX * 0.20;

    this.geom = { cx, cy, rx: rr * (1 + Math.abs(skew) * 0.1), ry: rr * squash };

    ctx.save();
    ctx.translate(cx, cy);
    ctx.transform(1, 0, skew, squash, 0, 0);

    // 底座（玻璃唱机机身）
    ctx.beginPath(); ctx.arc(0, 0, rr * 1.22, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.028)';
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = palAt(0.02, 0.16 + this.speed * 0.10);
    ctx.stroke();

    // 盘下投影
    const sh = ctx.createRadialGradient(0, rr * 0.16, rr * 0.2, 0, rr * 0.16, rr * 1.12);
    sh.addColorStop(0, 'rgba(0,0,0,0.45)');
    sh.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sh;
    ctx.beginPath(); ctx.arc(0, rr * 0.16, rr * 1.12, 0, Math.PI * 2); ctx.fill();

    // 盘体
    const body = ctx.createRadialGradient(-rr * 0.28, -rr * 0.28, rr * 0.06, 0, 0, rr);
    body.addColorStop(0, 'rgba(46,50,66,0.98)');
    body.addColorStop(0.55, 'rgba(16,18,28,0.98)');
    body.addColorStop(1, 'rgba(6,7,12,0.99)');
    ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2);
    ctx.fillStyle = body; ctx.fill();

    // 沟槽
    ctx.lineWidth = 0.9;
    for (let i = 0; i < 26; i++) {
      const k = 0.36 + (i / 26) * 0.62;
      ctx.beginPath(); ctx.arc(0, 0, rr * k, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.022 + (i % 4 === 0 ? 0.026 : 0)) + ')';
      ctx.stroke();
    }
    // 曲目分隔带
    [0.72, 0.88].forEach(k => {
      ctx.beginPath(); ctx.arc(0, 0, rr * k, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 2.4; ctx.stroke();
      ctx.lineWidth = 0.9;
    });

    // 随盘转动的细纹（静止时几乎不可见，转起来才成为运动线索）
    ctx.save();
    ctx.rotate(this.angle);
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.018 + this.speed * 0.045) + ')';
    ctx.lineWidth = rr * 0.18;
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      ctx.beginPath();
      ctx.arc(0, 0, rr * 0.62, a, a + 0.16);
      ctx.stroke();
    }
    ctx.restore();

    // 各向异性高光：两瓣扫光，随视差倾斜而移动
    ctx.globalCompositeOperation = 'lighter';
    if (ctx.createConicGradient) {
      const sheen = ctx.createConicGradient(this.tiltX * 0.9 - 0.5, 0, 0);
      const stops = [[0, 0], [0.07, 0.26], [0.16, 0], [0.5, 0], [0.57, 0.22], [0.66, 0], [1, 0]];
      stops.forEach(([p, a]) => sheen.addColorStop(p, 'rgba(200,225,255,' + a + ')'));
      ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2);
      ctx.fillStyle = sheen; ctx.fill();
    } else {
      const lg = ctx.createLinearGradient(-rr, -rr, rr, rr);
      lg.addColorStop(0.32, 'rgba(200,225,255,0)');
      lg.addColorStop(0.5, 'rgba(200,225,255,0.12)');
      lg.addColorStop(0.68, 'rgba(200,225,255,0)');
      ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2);
      ctx.fillStyle = lg; ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';

    // 中心标签（主题渐变，随盘转）
    ctx.save();
    ctx.rotate(this.angle);
    const lab = rr * 0.34;
    const lg2 = ctx.createLinearGradient(-lab, -lab, lab, lab);
    lg2.addColorStop(0, palAt(0.02, 0.95));
    lg2.addColorStop(0.55, palAt(0.34, 0.95));
    lg2.addColorStop(1, palAt(0.62, 0.95));
    ctx.beginPath(); ctx.arc(0, 0, lab, 0, Math.PI * 2);
    ctx.fillStyle = lg2; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, lab * 0.97, 0.6, 1.5);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.restore();

    // 主轴
    ctx.beginPath(); ctx.arc(0, 0, rr * 0.022 + 1.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fill();

    // 盘缘霓虹（随贝斯呼吸）
    ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2);
    ctx.strokeStyle = palAt(0.05, 0.28 + this.speed * 0.22 + bass * 0.30);
    ctx.lineWidth = 1.8 + bass * 1.6;
    ctx.shadowBlur = 16 + bass * 26;
    ctx.shadowColor = palAt(0.18, 0.55);
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.restore();

    this.drawToneArm(ctx, cx, cy, rr, squash, skew, palAt);
  }

  // 屏幕空间绘制唱臂：支点固定在机身右上，针头随播放进度内移
  drawToneArm(ctx, cx, cy, rr, squash, skew, palAt) {
    const toScreen = (lx, ly) => [cx + lx + skew * ly, cy + squash * ly];
    const pivot = toScreen(rr * 1.42, -rr * 0.86);
    const ta = -0.58;
    const tr = (0.95 - 0.38 * this.speed) * rr;
    const tip = toScreen(Math.cos(ta) * tr, Math.sin(ta) * tr);

    const [px, py] = pivot, [tx, ty] = tip;
    const ang = Math.atan2(ty - py, tx - px);
    const len = Math.hypot(tx - px, ty - py);

    ctx.save();
    // 支点底座
    ctx.beginPath(); ctx.arc(px, py, rr * 0.17, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.045)'; ctx.fill();
    ctx.strokeStyle = palAt(0.05, 0.26); ctx.lineWidth = 1.2; ctx.stroke();
    ctx.beginPath(); ctx.arc(px, py, rr * 0.10, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(8,10,18,0.75)'; ctx.fill();

    // 配重（沿臂轴反方向的短金属柱）
    const cwx = px + Math.cos(ang + Math.PI) * len * 0.16;
    const cwy = py + Math.sin(ang + Math.PI) * len * 0.16;
    ctx.save();
    ctx.translate(cwx, cwy); ctx.rotate(ang);
    const cw = rr * 0.15, ch = rr * 0.085;
    const bar = (x, y, w, h, r) => {
      if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); }
      else ctx.fillRect(x, y, w, h);
    };
    ctx.fillStyle = 'rgba(96,106,132,0.85)';
    bar(-cw / 2, -ch / 2, cw, ch, ch / 2);
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    bar(-cw / 2, -ch / 2, cw, ch * 0.34, ch / 3);
    ctx.restore();

    // 臂身
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(tx, ty);
    ctx.strokeStyle = 'rgba(150,162,190,0.55)'; ctx.lineWidth = Math.max(3, rr * 0.045); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px, py - 1.2); ctx.lineTo(tx, ty - 1.2);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = Math.max(1, rr * 0.014); ctx.stroke();

    // 唱头
    ctx.translate(tx, ty); ctx.rotate(ang);
    ctx.fillStyle = 'rgba(225,232,248,0.72)';
    ctx.fillRect(-rr * 0.05, -rr * 0.035, rr * 0.10, rr * 0.07);
    ctx.restore();

    // 主轴帽
    ctx.beginPath(); ctx.arc(px, py, rr * 0.035, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(235,240,255,0.55)'; ctx.fill();
  }
}
