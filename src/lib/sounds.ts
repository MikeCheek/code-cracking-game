let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioCtx;
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3) {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch {
    // Audio not supported
  }
}

export const sounds = {
  click: () => playTone(800, 0.1, 'sine', 0.2),
  success: () => {
    playTone(523, 0.15, 'sine', 0.3);
    setTimeout(() => playTone(659, 0.15, 'sine', 0.3), 150);
    setTimeout(() => playTone(784, 0.3, 'sine', 0.3), 300);
  },
  error: () => {
    playTone(300, 0.2, 'sawtooth', 0.3);
    setTimeout(() => playTone(200, 0.3, 'sawtooth', 0.3), 200);
  },
  bull: () => playTone(700, 0.2, 'square', 0.25),
  cow: () => playTone(400, 0.2, 'triangle', 0.25),
  lie: () => {
    playTone(150, 0.3, 'sawtooth', 0.4);
    setTimeout(() => playTone(100, 0.4, 'sawtooth', 0.4), 300);
  },
  win: () => {
    [523, 659, 784, 1047].forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.3, 'sine', 0.3), i * 150);
    });
  },
  rps: () => playTone(600, 0.15, 'square', 0.2),
  join: () => {
    playTone(400, 0.1, 'sine', 0.2);
    setTimeout(() => playTone(600, 0.2, 'sine', 0.2), 100);
  },
};
