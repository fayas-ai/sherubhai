import { GameSettings } from '../types/game';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private musicTimer: number | null = null;
  private musicStep = 0;
  private settings: GameSettings = {
    musicVolume: 0.35,
    sfxVolume: 0.7,
    muted: false,
    graphicsQuality: 'medium',
    mouseSensitivity: 1.0,
    mobileSensitivity: 1.0,
    showTouchControls: false,
  };

  public updateSettings(s: GameSettings) {
    this.settings = { ...s };
    if (s.muted || s.musicVolume <= 0.01) {
      this.stopMusic();
    }
  }

  private ensureContext(): AudioContext | null {
    if (this.settings.muted) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlockAndStartMusic() {
    if (this.settings.muted || this.settings.musicVolume <= 0.01) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (this.musicTimer !== null) return;

    // Cheerful playful Kerala-inspired pentatonic bass & marimba groove
    const melody = [261.63, 293.66, 329.63, 392.0, 440.0, 392.0, 329.63, 293.66];
    const bass = [130.81, 130.81, 146.83, 146.83, 164.81, 164.81, 196.0, 146.83];

    this.musicTimer = window.setInterval(() => {
      if (this.settings.muted || this.settings.musicVolume <= 0.01 || !this.ctx) return;
      if (this.ctx.state !== 'running') return;
      const now = this.ctx.currentTime;
      const vol = this.settings.musicVolume * 0.08;
      const idx = this.musicStep % melody.length;

      // Plucked melody note
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(melody[idx], now);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.34);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.36);

      // Warm bass pulse on even beats
      if (this.musicStep % 2 === 0) {
        const bOsc = this.ctx.createOscillator();
        const bGain = this.ctx.createGain();
        bOsc.type = 'sine';
        bOsc.frequency.setValueAtTime(bass[idx], now);
        bGain.gain.setValueAtTime(vol * 0.8, now);
        bGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.45);
        bOsc.connect(bGain);
        bGain.connect(this.ctx.destination);
        bOsc.start(now);
        bOsc.stop(now + 0.46);
      }

      this.musicStep++;
    }, 380);
  }

  public stopMusic() {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  private playTone(
    freq: number,
    endFreq: number,
    duration: number,
    type: OscillatorType,
    volumeScale: number,
    delay = 0,
  ) {
    if (this.settings.muted || this.settings.sfxVolume <= 0.01) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    const jitter = 0.96 + Math.random() * 0.08;
    osc.frequency.setValueAtTime(freq * jitter, now);
    if (endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq * jitter), now + duration);
    }
    const peak = Math.max(0.001, this.settings.sfxVolume * volumeScale);
    gain.gain.setValueAtTime(peak, now);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public playFootstep(running: boolean) {
    this.playTone(running ? 145 : 115, 60, 0.06, 'triangle', running ? 0.1 : 0.06);
  }

  public playJump() {
    this.playTone(220, 480, 0.14, 'sine', 0.16);
  }

  public playLand() {
    this.playTone(130, 52, 0.09, 'triangle', 0.15);
  }

  public playInteract() {
    this.playTone(440, 660, 0.09, 'triangle', 0.16);
  }

  public playCameraShutter() {
    this.playTone(1320, 420, 0.032, 'square', 0.12, 0);
    this.playTone(860, 260, 0.045, 'triangle', 0.14, 0.045);
  }

  public playCash() {
    this.playTone(880, 1320, 0.09, 'sine', 0.18, 0);
    this.playTone(1174, 1760, 0.14, 'triangle', 0.18, 0.08);
  }

  public playBuild() {
    this.playTone(180, 90, 0.1, 'square', 0.14, 0);
    this.playTone(220, 110, 0.1, 'square', 0.14, 0.12);
    this.playTone(523, 784, 0.22, 'triangle', 0.18, 0.24);
  }

  private sirenTimer: number | null = null;
  private sirenStep = 0;

  public startSiren(kind: 'ambulance' | 'police' | 'fire' = 'ambulance') {
    if (this.sirenTimer !== null) return;
    const playPulse = () => {
      if (this.settings.muted || this.settings.sfxVolume <= 0.01) return;
      if (kind === 'ambulance') {
        // Iconic Kerala 108 Hi-Lo two-tone Wee-Woo siren!
        const hi = this.sirenStep % 2 === 0;
        this.playTone(hi ? 880 : 660, hi ? 920 : 640, 0.36, 'sawtooth', 0.11);
      } else if (kind === 'police') {
        // Fast rising-falling yelp
        const hi = this.sirenStep % 2 === 0;
        this.playTone(hi ? 620 : 1080, hi ? 1080 : 620, 0.28, 'triangle', 0.11);
      } else {
        // Deep fire engine wail
        const hi = this.sirenStep % 2 === 0;
        this.playTone(hi ? 420 : 720, hi ? 740 : 410, 0.42, 'sawtooth', 0.12);
      }
      this.sirenStep++;
    };
    playPulse();
    this.sirenTimer = window.setInterval(playPulse, kind === 'police' ? 300 : 400);
  }

  public stopSiren() {
    if (this.sirenTimer !== null) {
      window.clearInterval(this.sirenTimer);
      this.sirenTimer = null;
    }
  }

  public playHorn() {
    this.playTone(370, 390, 0.16, 'sawtooth', 0.12, 0);
    this.playTone(466, 480, 0.18, 'sawtooth', 0.12, 0.14);
  }

  public playBusHorn() {
    // Classic loud Kerala private bus multi-tone air horn!
    this.playTone(260, 275, 0.18, 'sawtooth', 0.14, 0);
    this.playTone(330, 340, 0.2, 'sawtooth', 0.14, 0.12);
    this.playTone(392, 405, 0.24, 'sawtooth', 0.15, 0.24);
  }

  public playPalmBump() {
    // Hollow wooden palm trunk thump + leafy crown rustle
    this.playTone(135, 68, 0.14, 'triangle', 0.24, 0);
    this.playTone(290, 175, 0.12, 'sine', 0.12, 0.05);
  }

  public playCoconutThud() {
    // Ground bounce thud when Sheru dodges a falling coconut
    this.playTone(170, 75, 0.12, 'triangle', 0.2, 0);
    this.playTone(130, 80, 0.09, 'sine', 0.12, 0.12);
  }

  public playCoconutBonk() {
    // Cartoon coconut bonk + dizzy wobble!
    this.playTone(320, 120, 0.14, 'triangle', 0.24, 0);
    this.playTone(640, 420, 0.22, 'sine', 0.16, 0.14);
    this.playTone(540, 740, 0.2, 'sine', 0.14, 0.3);
  }

  public playBrakeScreech() {
    this.playTone(980, 620, 0.16, 'sawtooth', 0.08, 0);
  }

  public playSplash() {
    this.playTone(240, 520, 0.14, 'sine', 0.16, 0);
    this.playTone(410, 180, 0.18, 'triangle', 0.14, 0.08);
  }

  public playEventPop() {
    this.playTone(392, 587, 0.12, 'triangle', 0.18, 0);
    this.playTone(587, 784, 0.16, 'triangle', 0.18, 0.11);
  }

  public playPlaneBlast() {
    // Deep cinematic explosion sub-boom + fiery crackle noise burst!
    this.playTone(115, 22, 0.72, 'sawtooth', 0.34, 0);
    this.playTone(72, 18, 0.9, 'triangle', 0.32, 0.04);
    this.playTone(210, 42, 0.42, 'square', 0.18, 0.08);
    if (this.settings.muted || this.settings.sfxVolume <= 0.01) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const sampleRate = ctx.sampleRate;
      const len = Math.floor(sampleRate * 0.85);
      const buffer = ctx.createBuffer(1, len, sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) {
        const decay = Math.pow(1 - i / len, 1.8);
        data[i] = (Math.random() * 2 - 1) * decay;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(950, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.8);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(Math.max(0.01, this.settings.sfxVolume * 0.38), ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.85);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start();
    } catch {
      // Ignore if audio buffer unavailable
    }
  }

  public playFanfare() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.playTone(n, n, 0.18, 'triangle', 0.2, idx * 0.1);
    });
  }

  public playCartoonBlaster() {
    // Playful golden sci-fi stun zap!
    this.playTone(980, 260, 0.16, 'sawtooth', 0.2, 0);
    this.playTone(1420, 520, 0.12, 'triangle', 0.18, 0.02);
    this.playTone(320, 140, 0.14, 'square', 0.12, 0.07);
  }

  public playSlapHand() {
    // Booming Kerala comedy mass slap + cartoon star boing!
    this.playTone(260, 58, 0.14, 'square', 0.3, 0);
    this.playTone(140, 42, 0.22, 'sawtooth', 0.26, 0.02);
    this.playTone(620, 960, 0.18, 'sine', 0.14, 0.09);
  }

  public playPoliceArrest() {
    // Kerala police whistle chirp + heroic victory chord!
    this.playTone(1180, 1480, 0.12, 'sine', 0.2, 0);
    this.playTone(1480, 1180, 0.14, 'sine', 0.2, 0.13);
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.playTone(n, n, 0.18, 'triangle', 0.22, 0.26 + idx * 0.09);
    });
  }

  public playTrainHorn() {
    // Classic resonant Indian Railways dual-tone horn!
    this.playTone(233, 231, 0.72, 'sawtooth', 0.16, 0);
    this.playTone(294, 292, 0.72, 'sawtooth', 0.14, 0.02);
    this.playTone(466, 462, 0.65, 'triangle', 0.08, 0.03);
  }

  public playStationAnnouncement(spokenText?: string) {
    // Iconic 4-note Kerala railway station PA chime (Ding-Dong-Ding-Dong!)
    this.playTone(659.25, 659.25, 0.24, 'sine', 0.18, 0);
    this.playTone(523.25, 523.25, 0.24, 'sine', 0.18, 0.24);
    this.playTone(587.33, 587.33, 0.24, 'sine', 0.18, 0.48);
    this.playTone(392.0, 392.0, 0.42, 'sine', 0.18, 0.72);

    if (
      spokenText &&
      !this.settings.muted &&
      this.settings.sfxVolume > 0.05 &&
      typeof window !== 'undefined' &&
      'speechSynthesis' in window
    ) {
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(spokenText);
        utter.rate = 0.96;
        utter.pitch = 1.04;
        utter.volume = Math.min(0.65, this.settings.sfxVolume);
        window.speechSynthesis.speak(utter);
      } catch {
        // Fallback silently to procedural chime if speech synthesis blocked
      }
    }
  }

  public playRailClack() {
    // Gentle rhythmic train-on-track clack-clack!
    this.playTone(145, 78, 0.055, 'triangle', 0.07, 0);
    this.playTone(132, 72, 0.055, 'triangle', 0.06, 0.11);
  }

  public playSeaWaveSoft() {
    // Soft rolling Arabian Sea wave hiss (filtered noise swell)
    if (this.settings.muted || this.settings.sfxVolume <= 0.02) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const sr = ctx.sampleRate;
      const len = Math.floor(sr * 1.4);
      const buf = ctx.createBuffer(1, len, sr);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        const env = Math.sin((i / len) * Math.PI);
        d[i] = (Math.random() * 2 - 1) * env * 0.4;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(520, ctx.currentTime);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(Math.max(0.005, this.settings.sfxVolume * 0.09), ctx.currentTime);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      src.start();
    } catch {
      // Ignore if audio unavailable
    }
  }

  public playThunderSoft() {
    // Distant low Kerala monsoon thunder rumble (filtered brown-ish noise + sub-bass swell)
    if (this.settings.muted || this.settings.sfxVolume <= 0.02) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const sr = ctx.sampleRate;
      const len = Math.floor(sr * 1.9);
      const buf = ctx.createBuffer(1, len, sr);
      const d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.04 * white) / 1.04;
        const t = i / len;
        const env = Math.sin(Math.min(1, t * 3.5) * Math.PI * 0.5) * Math.pow(1 - t, 1.35);
        d[i] = last * 3.4 * env;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(165, ctx.currentTime);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(Math.max(0.01, this.settings.sfxVolume * 0.24), ctx.currentTime);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      src.start();
    } catch {
      // Ignore if audio unavailable
    }
  }
}

export const soundEngine = new SoundEngine();
