// Synthesised sound effects, WebAudio only: no audio files, no network. Every
// sound is a short oscillator or noise burst shaped by an envelope. The mixer
// is created lazily on the first user gesture, so autoplay rules never block it.

export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (context) {
      if (context.state === 'suspended') context.resume();
      return true;
    }
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.35;
      master.connect(context.destination);
      return true;
    } catch {
      return false;
    }
  }

  function tone({ frequency, frequencyEnd, duration, type = 'sine', volume = 0.5, delay = 0 }) {
    if (muted || !ensure()) return;
    const t0 = context.currentTime + delay;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, t0);
    if (frequencyEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(20, frequencyEnd), t0 + duration);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(volume, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  function noise({ duration, volume = 0.4, delay = 0, lowpass = 1200 }) {
    if (muted || !ensure()) return;
    const t0 = context.currentTime + delay;
    const length = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(t0);
  }

  return {
    get muted() { return muted; },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    /** Call from any user gesture so the context exists before the first effect. */
    unlock() { ensure(); },
    jump() { tone({ frequency: 420, frequencyEnd: 760, duration: 0.16, type: 'triangle', volume: 0.4 }); },
    land() { noise({ duration: 0.08, volume: 0.18, lowpass: 700 }); },
    corn() { tone({ frequency: 880, duration: 0.09, type: 'sine', volume: 0.45 }); tone({ frequency: 1320, duration: 0.12, type: 'sine', volume: 0.35, delay: 0.06 }); },
    goldenCorn() { tone({ frequency: 660, duration: 0.1, type: 'triangle', volume: 0.45 }); tone({ frequency: 990, duration: 0.1, type: 'triangle', volume: 0.45, delay: 0.07 }); tone({ frequency: 1480, duration: 0.16, type: 'triangle', volume: 0.4, delay: 0.14 }); },
    boost() { tone({ frequency: 300, frequencyEnd: 1200, duration: 0.3, type: 'sawtooth', volume: 0.22 }); },
    hide() { tone({ frequency: 520, frequencyEnd: 260, duration: 0.22, type: 'sine', volume: 0.4 }); },
    nearMiss() { noise({ duration: 0.18, volume: 0.25, lowpass: 2400 }); },
    hit() {
      noise({ duration: 0.22, volume: 0.5, lowpass: 900 });
      tone({ frequency: 220, frequencyEnd: 70, duration: 0.3, type: 'sawtooth', volume: 0.4 });
      tone({ frequency: 620, frequencyEnd: 300, duration: 0.18, type: 'square', volume: 0.22, delay: 0.05 });
    },
    knife() { tone({ frequency: 1800, frequencyEnd: 900, duration: 0.12, type: 'sine', volume: 0.18 }); },
    caught() {
      tone({ frequency: 392, duration: 0.22, type: 'triangle', volume: 0.45 });
      tone({ frequency: 311, duration: 0.22, type: 'triangle', volume: 0.45, delay: 0.2 });
      tone({ frequency: 233, duration: 0.4, type: 'triangle', volume: 0.45, delay: 0.4 });
    },
    escaped() {
      [523, 659, 784, 1047].forEach((f, i) => tone({ frequency: f, duration: 0.22, type: 'triangle', volume: 0.45, delay: i * 0.11 }));
    },
    click() { tone({ frequency: 700, duration: 0.06, type: 'sine', volume: 0.3 }); },
  };
}
