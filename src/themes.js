export const THEMES = {
  neon:   { name: '霓虹', c1: '#22d3ee', c2: '#a855f7', c3: '#f43f5e', c4: '#facc15', bg: '#070912', bg2: '#0d1024' },
  sunset: { name: '日落', c1: '#ff8a3c', c2: '#ff4d8d', c3: '#a855f7', c4: '#ffd166', bg: '#0c0710', bg2: '#1a0d18' },
  ocean:  { name: '深海', c1: '#38bdf8', c2: '#3b82f6', c3: '#22d3ee', c4: '#a5f3fc', bg: '#04101f', bg2: '#08203a' },
  forest: { name: '森林', c1: '#34d399', c2: '#10b981', c3: '#a3e635', c4: '#facc15', bg: '#06140d', bg2: '#0b1f17' },
  candy:  { name: '糖果', c1: '#f472b6', c2: '#c084fc', c3: '#fb7185', c4: '#fcd34d', bg: '#120a14', bg2: '#1f1024' },
  mono:   { name: '极简', c1: '#e5e7eb', c2: '#9ca3af', c3: '#6b7280', c4: '#fbbf24', bg: '#0a0a0c', bg2: '#141418' },
};

export function hex2rgb(h) {
  h = h.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function buildPalette(key) {
  const th = THEMES[key] || THEMES.neon;
  return {
    pal: [hex2rgb(th.c1), hex2rgb(th.c2), hex2rgb(th.c3), hex2rgb(th.c4)],
    bgRGB: hex2rgb(th.bg),
  };
}

// t∈[0,1] 在 c1→c2→c3→c4→c1 间循环插值
export function makePalAt(pal) {
  return function palAt(t, a) {
    const n = pal.length;
    const s = (t % 1 + 1) % 1 * n;
    const i = Math.floor(s) % n;
    const j = (i + 1) % n;
    const f = s - Math.floor(s);
    const A = pal[i], B = pal[j];
    return 'rgba(' + ((A[0] + (B[0] - A[0]) * f) | 0) + ',' + ((A[1] + (B[1] - A[1]) * f) | 0) + ',' + ((A[2] + (B[2] - A[2]) * f) | 0) + ',' + a + ')';
  };
}

export function bgCss(bgRGB, a) {
  return 'rgba(' + bgRGB[0] + ',' + bgRGB[1] + ',' + bgRGB[2] + ',' + a + ')';
}

export function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0; }
  return h >>> 0;
}

// 由曲名哈希生成渐变封面（颜色取自当前主题调色板）
export function coverGrad(name, palAt) {
  const h = hashStr(name || 'audio');
  const a = (h % 1000) / 1000;
  const c = ((h >> 20) % 1000) / 1000;
  return 'linear-gradient(135deg,' + palAt(a, 1) + ' 0%,' + palAt((a + 0.3) % 1, 1) + ' 55%,' + palAt(c, 1) + ' 100%)';
}
