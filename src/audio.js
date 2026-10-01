export class AudioEngine {
  constructor(audioEl) {
    this.audio = audioEl;
    this.ctx = null;
    this.analyser = null;
    this.freq = null;
    this.wave = null;
  }

  ensure() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      const source = this.ctx.createMediaElementSource(this.audio);
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.82;
      source.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
      this.freq = new Uint8Array(this.analyser.frequencyBinCount);
      this.wave = new Uint8Array(this.analyser.fftSize);
    } catch (e) {
      console.warn('AudioContext init failed', e);
    }
  }

  async resume() {
    if (this.ctx && this.ctx.state === 'suspended') await this.ctx.resume();
  }

  sample(active) {
    if (!this.analyser || !active) return null;
    this.analyser.getByteFrequencyData(this.freq);
    this.analyser.getByteTimeDomainData(this.wave);
    return { freq: this.freq, wave: this.wave };
  }
}
