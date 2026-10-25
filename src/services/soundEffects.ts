// Procedural Web Audio API Sound Generator & Modular Audio Loader
// Supports theme skin overrides in src/styles/<skin>/Sounds/ with automatic zero-dependency synth fallbacks
import { styleService } from './styleService';

class SoundEffectsService {
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.5;
  private customAudioCache: Map<string, HTMLAudioElement> = new Map();

  constructor() {
    const savedMute = localStorage.getItem('anytoken_sound_muted');
    if (savedMute !== null) {
      this.isMuted = savedMute === 'true';
    }

    // Invalidate audio cache on skin switch so new theme sounds take effect immediately
    styleService.onStyleChange(() => {
      this.customAudioCache.clear();
    });
  }

  private initContext() {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    localStorage.setItem('anytoken_sound_muted', String(muted));
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  public getVolume(): number {
    return this.volume;
  }

  // Tries to play skin-resolved sound (Active Theme -> Default Theme -> /sounds/), falling back to synth
  private playWithCustomFallback(filename: string, fallback: () => void) {
    if (this.isMuted) return;
    try {
      const soundUrl = styleService.getSound(filename);
      if (!soundUrl) {
        fallback();
        return;
      }

      let audio = this.customAudioCache.get(soundUrl);
      if (!audio) {
        audio = new Audio(soundUrl);
        audio.preload = 'auto';
        this.customAudioCache.set(soundUrl, audio);
      }
      audio.volume = this.volume;
      audio.currentTime = 0;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          fallback();
        });
      }
    } catch {
      fallback();
    }
  }

  // Metallic token clink sound
  public playTokenClink() {
    this.playWithCustomFallback('token_clink.mp3', () => {
      try {
        this.initContext();
        if (!this.audioCtx) return;

        const now = this.audioCtx.currentTime;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        const baseFreq = 1800 + Math.random() * 600;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.05);

        gain.gain.setValueAtTime(0.2 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.12);
      } catch { }
    });
  }

  // Swoosh + heavy impact for dropping a batch of tokens
  public playBetDrop() {
    this.playWithCustomFallback('bet_drop.mp3', () => {
      try {
        this.initContext();
        if (!this.audioCtx) return;

        const now = this.audioCtx.currentTime;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.2);

        gain.gain.setValueAtTime(0.35 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.25);

        setTimeout(() => this.playTokenClink(), 80);
        setTimeout(() => this.playTokenClink(), 160);
      } catch { }
    });
  }

  // Lock buzzer / chime when bets lock
  public playLockBuzzer() {
    this.playWithCustomFallback('lock.mp3', () => {
      try {
        this.initContext();
        if (!this.audioCtx) return;

        const now = this.audioCtx.currentTime;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.25);

        gain.gain.setValueAtTime(0.25 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.35);
      } catch { }
    });
  }

  // Celebratory winner fanfare!
  public playWinnerFanfare() {
    this.playWithCustomFallback('winner_fanfare.mp3', () => {
      try {
        this.initContext();
        if (!this.audioCtx) return;

        const now = this.audioCtx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        const noteDuration = 0.14;

        notes.forEach((freq, idx) => {
          if (!this.audioCtx) return;
          const noteStart = now + idx * noteDuration;
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, noteStart);

          const duration = idx === notes.length - 1 ? 0.6 : noteDuration;
          gain.gain.setValueAtTime(0.3 * this.volume, noteStart);
          gain.gain.exponentialRampToValueAtTime(0.001, noteStart + duration);

          osc.connect(gain);
          gain.connect(this.audioCtx.destination);

          osc.start(noteStart);
          osc.stop(noteStart + duration);
        });
      } catch { }
    });
  }

  // Cashout / Register ding sound
  public playCashout() {
    this.playWithCustomFallback('cashout.mp3', () => {
      try {
        this.initContext();
        if (!this.audioCtx) return;

        const now = this.audioCtx.currentTime;
        const freqs = [1200, 1600, 2400];

        freqs.forEach((freq, i) => {
          if (!this.audioCtx) return;
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.05);

          gain.gain.setValueAtTime(0.25 * this.volume, now + i * 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35 + i * 0.05);

          osc.connect(gain);
          gain.connect(this.audioCtx.destination);

          osc.start(now + i * 0.05);
          osc.stop(now + 0.4 + i * 0.05);
        });
      } catch { }
    });
  }

  // Defeat / bust sound
  public playLoseSound() {
    this.playWithCustomFallback('lose.mp3', () => {
      try {
        this.initContext();
        if (!this.audioCtx) return;

        const now = this.audioCtx.currentTime;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.3);

        gain.gain.setValueAtTime(0.2 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.35);
      } catch { }
    });
  }

  // Shimmer / Shine lens flare sound effect
  public playShineSound() {
    this.playWithCustomFallback('shine.mp3', () => {
      try {
        this.initContext();
        if (!this.audioCtx) return;

        const now = this.audioCtx.currentTime;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1800, now);
        osc.frequency.exponentialRampToValueAtTime(3200, now + 0.2);

        gain.gain.setValueAtTime(0.18 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.3);
      } catch { }
    });
  }

  // Rapid soft tick / token clink for the tally count-up
  public playTallyTick() {
    this.playWithCustomFallback('tally_tick.mp3', () => {
      try {
        this.initContext();
        if (!this.audioCtx) return;

        const now = this.audioCtx.currentTime;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400 + Math.random() * 400, now);

        gain.gain.setValueAtTime(0.12 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.04);
      } catch { }
    });
  }
}

export const soundEffects = new SoundEffectsService();
