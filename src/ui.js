import { THEMES, buildPalette, makePalAt, coverGrad } from './themes.js';

const fmt = s => {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const x = Math.floor(s % 60);
  return m + ':' + (x < 10 ? '0' : '') + x;
};
const uid = () => Math.random().toString(36).slice(2, 9);
const escapeHtml = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function createUI({ store, engine, els }) {
  const { audio } = els;

  const ui = {
    palAt: makePalAt(buildPalette('neon').pal),
    bgRGB: buildPalette('neon').bgRGB,

    toast(msg) {
      els.toastEl.textContent = msg;
      els.toastEl.classList.add('show');
      clearTimeout(ui.toast._t);
      ui.toast._t = setTimeout(() => els.toastEl.classList.remove('show'), 1800);
    },

    renderThemes() {
      const bar = els.themeBar;
      bar.innerHTML = '<span class="lbl">THEME</span>';
      Object.keys(THEMES).forEach(key => {
        const th = THEMES[key];
        const b = document.createElement('button');
        b.className = 'sw';
        b.dataset.t = key;
        b.title = th.name;
        b.style.background = 'linear-gradient(135deg,' + th.c1 + ',' + th.c2 + ',' + th.c3 + ')';
        b.addEventListener('click', () => { ui.applyTheme(key); ui.toast('主题：' + th.name); });
        bar.appendChild(b);
      });
    },

    applyTheme(key) {
      if (!THEMES[key]) key = 'neon';
      const th = THEMES[key];
      const { pal, bgRGB } = buildPalette(key);
      ui.palAt = makePalAt(pal);
      ui.bgRGB = bgRGB;
      const r = document.documentElement.style;
      r.setProperty('--c1', th.c1); r.setProperty('--c2', th.c2);
      r.setProperty('--c3', th.c3); r.setProperty('--c4', th.c4);
      r.setProperty('--bg', th.bg); r.setProperty('--bg2', th.bg2);
      els.themeName.textContent = th.name;
      document.querySelectorAll('.theme-bar .sw').forEach(s => s.classList.toggle('on', s.dataset.t === key));
      store.set({ theme: key });
      ui.renderList();
      const s = store.state;
      if (s.currentId) {
        const it = s.playlist.find(p => p.id === s.currentId);
        if (it) els.npCover.style.background = coverGrad(it.name, ui.palAt);
      }
      try { localStorage.setItem('aurora-theme', key); } catch (e) {}
    },

    renderList() {
      const s = store.state;
      els.countEl.textContent = s.playlist.length;
      if (!s.playlist.length) {
        els.listEmpty.style.display = 'block';
        els.listEl.innerHTML = '';
        els.listEl.appendChild(els.listEmpty);
        return;
      }
      els.listEmpty.style.display = 'none';
      els.listEl.innerHTML = '';
      s.playlist.forEach(it => {
        const active = it.id === s.currentId;
        const playing = active && !audio.paused;
        const row = document.createElement('div');
        row.className = 'track' + (active ? ' active' : '') + (playing ? ' playing' : '');
        row.innerHTML = `
          <div class="cover" style="background:${coverGrad(it.name, ui.palAt)}"></div>
          <div class="meta"><div class="name">${escapeHtml(it.name)}</div><div class="dur">${fmt(it.dur)}</div></div>
          <div class="eq"><i></i><i></i><i></i></div>
          <button class="rm" title="移除">✕</button>
        `;
        row.addEventListener('click', e => {
          if (e.target.classList.contains('rm')) return;
          ui.load(it.id, true);
        });
        row.querySelector('.rm').addEventListener('click', e => {
          e.stopPropagation();
          ui.removeTrack(it.id);
        });
        els.listEl.appendChild(row);
      });
    },

    addFiles(files) {
      const arr = Array.from(files).filter(f => f.type.startsWith('audio/') || /\.mp3$/i.test(f.name));
      if (!arr.length) { ui.toast('请选择音频文件（mp3 等）'); return; }
      const playlist = store.state.playlist.slice();
      arr.forEach(f => {
        const url = URL.createObjectURL(f);
        const item = { id: uid(), file: f, url, name: f.name.replace(/\.[^.]+$/, ''), dur: 0 };
        playlist.push(item);
        const tmp = new Audio();
        tmp.src = url;
        tmp.addEventListener('loadedmetadata', () => {
          item.dur = tmp.duration;
          ui.renderList();
        });
      });
      store.set({ playlist });
      ui.renderList();
      els.dropHint.classList.add('hide');
      if (store.state.currentId === null) ui.load(playlist[0].id, false);
      ui.toast('已添加 ' + arr.length + ' 首');
    },

    removeTrack(id) {
      const s = store.state;
      const idx = s.playlist.findIndex(p => p.id === id);
      if (idx < 0) return;
      const it = s.playlist[idx];
      URL.revokeObjectURL(it.url);
      const wasCurrent = id === s.currentId;
      const playlist = s.playlist.slice();
      playlist.splice(idx, 1);
      store.set({ playlist, currentId: wasCurrent ? null : s.currentId });
      if (wasCurrent) {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
        if (playlist.length) {
          ui.load(playlist[Math.min(idx, playlist.length - 1)].id, false);
        } else {
          els.npTitle.textContent = '未在播放';
          els.npSub.textContent = '等待你上传音频';
          els.npCover.style.background = '';
          els.npCover.classList.add('empty');
          els.dropHint.classList.remove('hide');
        }
      }
      ui.renderList();
    },

    load(id, autoplay) {
      const it = store.state.playlist.find(p => p.id === id);
      if (!it) return;
      store.set({ currentId: id });
      audio.src = it.url;
      audio.load();
      els.npTitle.textContent = it.name;
      els.npSub.textContent = '本地文件 · MP3';
      els.npCover.style.background = coverGrad(it.name, ui.palAt);
      ui.renderList();
      engine.ensure();
      if (autoplay) ui.play();
      else ui.updatePlayBtn();
    },

    currentIndex() { return store.state.playlist.findIndex(p => p.id === store.state.currentId); },
    next() {
      const pl = store.state.playlist;
      if (!pl.length) return;
      let i = ui.currentIndex() + 1;
      if (i >= pl.length) i = 0;
      ui.load(pl[i].id, true);
    },
    prev() {
      const pl = store.state.playlist;
      if (!pl.length) return;
      let i = ui.currentIndex() - 1;
      if (i < 0) i = pl.length - 1;
      ui.load(pl[i].id, true);
    },

    async play() {
      const s = store.state;
      if (!s.currentId) { if (s.playlist.length) { ui.load(s.playlist[0].id, true); } return; }
      engine.ensure();
      await engine.resume();
      try { await audio.play(); } catch (e) { ui.toast('无法播放：' + e.message); }
      ui.updatePlayBtn();
      ui.renderList();
    },
    pause() {
      audio.pause();
      ui.updatePlayBtn();
      ui.renderList();
    },
    toggle() { audio.paused ? ui.play() : ui.pause(); },
    updatePlayBtn() {
      els.playBtn.textContent = audio.paused ? '▶' : '⏸';
      document.body.classList.toggle('playing', !audio.paused);
      store.set({ playing: !audio.paused });
    },

    init() {
      els.addBtn.addEventListener('click', () => els.fileIn.click());
      els.fileIn.addEventListener('change', e => { ui.addFiles(e.target.files); els.fileIn.value = ''; });
      els.playBtn.addEventListener('click', () => ui.toggle());
      els.nextBtn.addEventListener('click', () => ui.next());
      els.prevBtn.addEventListener('click', () => ui.prev());
      audio.addEventListener('ended', () => ui.next());
      audio.addEventListener('play', () => { ui.updatePlayBtn(); ui.renderList(); });
      audio.addEventListener('pause', () => { ui.updatePlayBtn(); ui.renderList(); });
      audio.addEventListener('loadedmetadata', () => { els.totT.textContent = fmt(audio.duration); });
      audio.addEventListener('timeupdate', () => {
        els.curT.textContent = fmt(audio.currentTime);
        const p = audio.duration ? audio.currentTime / audio.duration : 0;
        els.seekFill.style.width = (p * 100) + '%';
        els.seekEl.style.setProperty('--p', (p * 100) + '%');
        els.seekIn.value = Math.round(p * 1000);
      });

      els.seekIn.addEventListener('input', () => {
        if (!audio.duration) return;
        const p = els.seekIn.value / 1000;
        audio.currentTime = p * audio.duration;
        els.seekFill.style.width = (p * 100) + '%';
        els.seekEl.style.setProperty('--p', (p * 100) + '%');
      });
      els.volIn.addEventListener('input', () => { audio.volume = +els.volIn.value; });
      audio.volume = +els.volIn.value;

      document.querySelectorAll('.mode-bar button').forEach(b => {
        b.addEventListener('click', () => {
          store.set({ mode: b.dataset.mode });
          document.querySelectorAll('.mode-bar button').forEach(x => x.classList.remove('on'));
          b.classList.add('on');
        });
      });

      let dragDepth = 0;
      ['dragenter', 'dragover'].forEach(ev => els.stage.addEventListener(ev, e => {
        e.preventDefault();
        if (ev === 'dragenter') dragDepth++;
        els.stage.classList.add('drag');
      }));
      els.stage.addEventListener('dragleave', () => {
        dragDepth--;
        if (dragDepth <= 0) { dragDepth = 0; els.stage.classList.remove('drag'); }
      });
      els.stage.addEventListener('drop', e => {
        e.preventDefault();
        dragDepth = 0;
        els.stage.classList.remove('drag');
        if (e.dataTransfer.files.length) ui.addFiles(e.dataTransfer.files);
      });
      window.addEventListener('dragover', e => e.preventDefault());
      window.addEventListener('drop', e => e.preventDefault());

      window.addEventListener('keydown', e => {
        if (e.target.tagName === 'INPUT') return;
        if (e.code === 'Space') { e.preventDefault(); ui.toggle(); }
        else if (e.code === 'ArrowRight') { audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 5); }
        else if (e.code === 'ArrowLeft') { audio.currentTime = Math.max(0, audio.currentTime - 5); }
        else if (e.code === 'ArrowUp') { els.volIn.value = Math.min(1, +els.volIn.value + 0.05); audio.volume = +els.volIn.value; }
        else if (e.code === 'ArrowDown') { els.volIn.value = Math.max(0, +els.volIn.value - 0.05); audio.volume = +els.volIn.value; }
        else if (e.code === 'KeyN') { ui.next(); }
        else if (e.code === 'KeyP') { ui.prev(); }
      });

      ui.renderThemes();
      let savedTheme = 'neon';
      try { savedTheme = localStorage.getItem('aurora-theme') || 'neon'; } catch (e) {}
      ui.applyTheme(savedTheme);
    },
  };

  return ui;
}
