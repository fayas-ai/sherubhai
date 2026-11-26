import { GameSettings } from '../types/game';
import {
  AmbientContext,
  AmbientSchedulerState,
  KeralaAmbientSoundId,
  createInitialAmbientSchedulerState,
  pickWeightedAmbientSound,
  stepAmbientScheduler,
} from './ambientAudioLogic';

export type { AmbientContext, KeralaAmbientSoundId };

class SoundEngine {
  private ctx: AudioContext | null = null;
  private musicTimer: number | null = null;
  private musicStep = 0;
  private ambientState: AmbientSchedulerState = createInitialAmbientSchedulerState(3.8);
  private ambientContext: AmbientContext = {
    district: 'Main Junction',
    timePhase: 'day',
    weather: 'sunny',
    indoors: false,
    airborne: false,
  };
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

  private getAmbientAudioContext(): AudioContext | null {
    if (this.settings.muted || this.settings.sfxVolume <= 0.02) return null;
    if (!this.ctx || this.ctx.state !== 'running') return null;
    return this.ctx;
  }

  /**
   * Distant bronze Kerala temple bell (mani) with warm metallic overtones and soft second chime.
   */
  public playTempleBells() {
    const ctx = this.getAmbientAudioContext();
    if (!ctx) return;
    try {
      const baseVol = this.settings.sfxVolume * 0.075;
      const strike = (offsetSec: number, rootHz: number, gainScale: number) => {
        const now = ctx.currentTime + offsetSec;
        const partials = [
          { ratio: 1.0, amp: 1.0, dur: 2.1 },
          { ratio: 2.03, amp: 0.48, dur: 1.5 },
          { ratio: 3.07, amp: 0.24, dur: 0.95 },
        ];
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1950, now);
        filter.connect(ctx.destination);

        for (const p of partials) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(rootHz * p.ratio, now);
          const peak = Math.max(0.0008, baseVol * gainScale * p.amp);
          gain.gain.setValueAtTime(0.0005, now);
          gain.gain.linearRampToValueAtTime(peak, now + 0.018);
          gain.gain.exponentialRampToValueAtTime(0.0004, now + p.dur);
          osc.connect(gain);
          gain.connect(filter);
          osc.start(now);
          osc.stop(now + p.dur + 0.04);
        }
      };

      const root = 432 + (Math.random() - 0.5) * 32;
      strike(0, root, 1.0);
      strike(0.58 + Math.random() * 0.16, root * 1.12, 0.62);
    } catch {
      // Ignore if Web Audio nodes unavailable
    }
  }

  /**
   * Warm distant Kerala chaya kada (tea stall) murmur with soft stainless-steel glass clinks.
   */
  public playTeaStallChatter() {
    const ctx = this.getAmbientAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const sr = ctx.sampleRate;
      const dur = 1.65;
      const len = Math.floor(sr * dur);
      const buf = ctx.createBuffer(1, len, sr);
      const d = buf.getChannelData(0);

      // Modulated low-volume crowd murmur envelope
      let smooth = 0;
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const fade = Math.sin((i / len) * Math.PI);
        const syllable =
          0.55 +
          0.3 * Math.sin(t * 17.5) +
          0.15 * Math.sin(t * 29.0 + 1.2);
        const white = Math.random() * 2 - 1;
        smooth = smooth * 0.72 + white * 0.28;
        d[i] = smooth * fade * syllable;
      }

      const src = ctx.createBufferSource();
      src.buffer = buf;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(640 + Math.random() * 140, now);
      bp.Q.setValueAtTime(1.4, now);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(Math.max(0.004, this.settings.sfxVolume * 0.07), now);
      src.connect(bp);
      bp.connect(gain);
      gain.connect(ctx.destination);
      src.start(now);

      // Subtle steel chaya tumbler clink-clink!
      const clinkOffsets = [0.28, 0.56 + Math.random() * 0.25];
      for (const off of clinkOffsets) {
        const t0 = now + off;
        const osc = ctx.createOscillator();
        const cg = ctx.createGain();
        osc.type = 'sine';
        const f = 2250 + Math.random() * 520;
        osc.frequency.setValueAtTime(f, t0);
        osc.frequency.exponentialRampToValueAtTime(f * 0.94, t0 + 0.09);
        const cPeak = Math.max(0.001, this.settings.sfxVolume * 0.036);
        cg.gain.setValueAtTime(cPeak, t0);
        cg.gain.exponentialRampToValueAtTime(0.0004, t0 + 0.11);
        osc.connect(cg);
        cg.connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + 0.12);
      }
    } catch {
      // Ignore if Web Audio nodes unavailable
    }
  }

  /**
   * Lush Kerala monsoon rain wash & crisp rooftop droplet patter.
   */
  public playMonsoonRain(intense = false) {
    const ctx = this.getAmbientAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const sr = ctx.sampleRate;
      const dur = intense ? 2.3 : 1.75;
      const len = Math.floor(sr * dur);
      const buf = ctx.createBuffer(1, len, sr);
      const d = buf.getChannelData(0);

      for (let i = 0; i < len; i++) {
        const env = Math.sin((i / len) * Math.PI);
        const white = Math.random() * 2 - 1;
        const patter = Math.random() > 0.992 ? (Math.random() * 2 - 1) * 1.4 : 0;
        d[i] = (white * 0.45 + patter) * env;
      }

      const src = ctx.createBufferSource();
      src.buffer = buf;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(intense ? 520 : 680, now);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(intense ? 3400 : 2700, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(
        Math.max(0.005, this.settings.sfxVolume * (intense ? 0.125 : 0.085)),
        now,
      );
      src.connect(hp);
      hp.connect(lp);
      lp.connect(gain);
      gain.connect(ctx.destination);
      src.start(now);
    } catch {
      // Ignore if Web Audio nodes unavailable
    }
  }

  /**
   * Gentle Arabian Sea surf swell with occasional distant coastal gull glide.
   */
  public playCoastalWaves() {
    const ctx = this.getAmbientAudioContext();
    if (!ctx) return;
    this.playSeaWaveSoft();
    if (this.ambientContext.timePhase !== 'night' && Math.random() < 0.35) {
      try {
        const now = ctx.currentTime + 0.32;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1180, now);
        osc.frequency.exponentialRampToValueAtTime(760, now + 0.36);
        const peak = Math.max(0.001, this.settings.sfxVolume * 0.032);
        gain.gain.setValueAtTime(0.0005, now);
        gain.gain.linearRampToValueAtTime(peak, now + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.0004, now + 0.38);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
      } catch {
        // Ignore if audio unavailable
      }
    }
  }

  /**
   * Rhythmic tropical Kerala night cricket chirps among coconut palms.
   */
  public playNightCrickets() {
    const ctx = this.getAmbientAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const baseFreq = 3850 + Math.random() * 320;
      const bursts = 4;
      for (let i = 0; i < bursts; i++) {
        const t0 = now + i * 0.17;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq, t0);
        osc.frequency.linearRampToValueAtTime(baseFreq + 90, t0 + 0.045);
        osc.frequency.linearRampToValueAtTime(baseFreq - 40, t0 + 0.095);
        const peak = Math.max(0.0008, this.settings.sfxVolume * 0.028);
        gain.gain.setValueAtTime(0.0004, t0);
        gain.gain.linearRampToValueAtTime(peak, t0 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0004, t0 + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + 0.11);
      }
    } catch {
      // Ignore if audio unavailable
    }
  }

  /**
   * Sweet rising Malabar koel (kuyil) two-phrase tropical bird call.
   */
  public playTropicalBirds() {
    const ctx = this.getAmbientAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const phrases = [
        { off: 0.0, f1: 620, f2: 910, dur: 0.24 },
        { off: 0.34, f1: 690, f2: 1020, dur: 0.28 },
      ];
      for (const p of phrases) {
        const t0 = now + p.off;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(p.f1, t0);
        osc.frequency.exponentialRampToValueAtTime(p.f2, t0 + p.dur);
        const peak = Math.max(0.001, this.settings.sfxVolume * 0.044);
        gain.gain.setValueAtTime(0.0005, t0);
        gain.gain.linearRampToValueAtTime(peak, t0 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0004, t0 + p.dur + 0.03);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + p.dur + 0.05);
      }
    } catch {
      // Ignore if audio unavailable
    }
  }

  /**
   * Muffled, distant Kerala bazaar auto-rickshaw beep.
   */
  public playBazaarDistantHorn() {
    const ctx = this.getAmbientAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(920, now);
      filter.connect(ctx.destination);

      const tones = [
        { off: 0, freq: 385, dur: 0.14 },
        { off: 0.16, freq: 472, dur: 0.16 },
      ];
      for (const t of tones) {
        const t0 = now + t.off;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(t.freq, t0);
        const peak = Math.max(0.001, this.settings.sfxVolume * 0.045);
        gain.gain.setValueAtTime(0.0005, t0);
        gain.gain.linearRampToValueAtTime(peak, t0 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0005, t0 + t.dur);
        osc.connect(gain);
        gain.connect(filter);
        osc.start(t0);
        osc.stop(t0 + t.dur + 0.02);
      }
    } catch {
      // Ignore if audio unavailable
    }
  }

  /**
   * Soft distant jet turbine pass over Kerala International Airport.
   */
  public playAirportJetHum() {
    const ctx = this.getAmbientAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const sr = ctx.sampleRate;
      const dur = 2.1;
      const len = Math.floor(sr * dur);
      const buf = ctx.createBuffer(1, len, sr);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        const env = Math.sin((i / len) * Math.PI);
        d[i] = (Math.random() * 2 - 1) * env;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(160, now);
      filter.frequency.linearRampToValueAtTime(340, now + dur * 0.45);
      filter.frequency.linearRampToValueAtTime(140, now + dur);
      filter.Q.setValueAtTime(2.2, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(Math.max(0.004, this.settings.sfxVolume * 0.085), now);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      src.start(now);
    } catch {
      // Ignore if audio unavailable
    }
  }

  public setAmbientContext(ctx: AmbientContext) {
    this.ambientContext = { ...ctx };
  }

  public resetAmbientScheduler(initialDelaySec = 3.8) {
    this.ambientState = createInitialAmbientSchedulerState(initialDelaySec);
  }

  public playAmbientSound(id: KeralaAmbientSoundId) {
    switch (id) {
      case 'temple_bells':
        this.playTempleBells();
        break;
      case 'tea_stall_chatter':
        this.playTeaStallChatter();
        break;
      case 'monsoon_rain':
        this.playMonsoonRain(this.ambientContext.weather === 'monsoon');
        break;
      case 'coastal_waves':
        this.playCoastalWaves();
        break;
      case 'night_crickets':
        this.playNightCrickets();
        break;
      case 'tropical_birds':
        this.playTropicalBirds();
        break;
      case 'bazaar_distant_horn':
        this.playBazaarDistantHorn();
        break;
      case 'airport_jet_hum':
        this.playAirportJetHum();
        break;
    }
  }

  public triggerRandomAmbient(ctx?: AmbientContext): KeralaAmbientSoundId | null {
    const activeCtx = ctx ?? this.ambientContext;
    if (ctx) {
      this.ambientContext = { ...ctx };
    }
    const picked = pickWeightedAmbientSound(activeCtx, this.ambientState.lastSoundId);
    if (!picked) return null;
    this.ambientState = {
      ...this.ambientState,
      lastSoundId: picked,
      triggerCount: this.ambientState.triggerCount + 1,
    };
    this.playAmbientSound(picked);
    return picked;
  }

  public updateAmbient(
    dt: number,
    ctx: AmbientContext,
    active: boolean,
  ): KeralaAmbientSoundId | null {
    this.ambientContext.district = ctx.district;
    this.ambientContext.timePhase = ctx.timePhase;
    this.ambientContext.weather = ctx.weather;
    this.ambientContext.indoors = ctx.indoors;
    this.ambientContext.airborne = ctx.airborne;
    const canPlay =
      active &&
      !this.settings.muted &&
      this.settings.sfxVolume > 0.02 &&
      Boolean(this.ctx && this.ctx.state === 'running');

    const step = stepAmbientScheduler(this.ambientState, dt, this.ambientContext, canPlay);
    this.ambientState = step.state;
    if (step.triggeredSound) {
      this.playAmbientSound(step.triggeredSound);
    }
    return step.triggeredSound;
  }
}

export const soundEngine = new SoundEngine();
