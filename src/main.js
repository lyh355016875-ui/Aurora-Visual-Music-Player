import './styles.css';
import { createStore } from './store.js';
import { AudioEngine } from './audio.js';
import { Viz } from './viz.js';
import { createUI } from './ui.js';

const $ = id => document.getElementById(id);
const els = {
  audio: $('audio'),
  fileIn: $('fileInput'),
  addBtn: $('addBtn'),
  listEl: $('list'),
  listEmpty: $('listEmpty'),
  countEl: $('count'),
  themeBar: $('themeBar'),
  stage: $('stage'),
  dropHint: $('dropHint'),
  canvas: $('viz'),
  playBtn: $('playBtn'),
  prevBtn: $('prevBtn'),
  nextBtn: $('nextBtn'),
  seekEl: $('seek'),
  seekFill: $('seekFill'),
  seekIn: $('seekInput'),
  volIn: $('volInput'),
  curT: $('curTime'),
  totT: $('totTime'),
  npTitle: $('npTitle'),
  npSub: $('npSub'),
  npCover: $('npCover'),
  themeName: $('themeName'),
  toastEl: $('toast'),
};

const store = createStore({
  playlist: [],
  currentId: null,
  mode: 'fusion',
  theme: 'neon',
  playing: false,
});

const engine = new AudioEngine(els.audio);
const viz = new Viz(els.canvas, els.stage);
const ui = createUI({ store, engine, els });

ui.init();
viz.attachResize();
viz.attachInteraction(() => ui.toggle());

let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const s = store.state;
  const playing = !els.audio.paused;
  viz.frame(dt, {
    data: engine.sample(playing),
    mode: s.mode,
    playing,
    palAt: ui.palAt,
    bgRGB: ui.bgRGB,
  });
}
requestAnimationFrame(loop);
