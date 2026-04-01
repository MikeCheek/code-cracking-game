const AudioContext = window.AudioContext || (window as any).webkitAudioContext;

function createAudioContext(): AudioContext | null {
  try {
    return new AudioContext();
  } catch {
    return null;
  }
}

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (!ctx || ctx.state === "closed") {
    ctx = createAudioContext();
  }
  return ctx;
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  gainValue = 0.3,
  delay = 0
) {
  const audioCtx = getCtx();
  if (!audioCtx) return;

  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime + delay);

  gainNode.gain.setValueAtTime(0, audioCtx.currentTime + delay);
  gainNode.gain.linearRampToValueAtTime(gainValue, audioCtx.currentTime + delay + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + delay + duration);

  oscillator.start(audioCtx.currentTime + delay);
  oscillator.stop(audioCtx.currentTime + delay + duration);
}

export const sounds = {
  click: () => playTone(800, 0.1, "square", 0.2),

  digitPress: () => playTone(440 + Math.random() * 200, 0.08, "sine", 0.15),

  correct: () => {
    playTone(523, 0.15, "sine", 0.3);
    playTone(659, 0.15, "sine", 0.3, 0.15);
    playTone(784, 0.25, "sine", 0.3, 0.3);
  },

  wrong: () => {
    playTone(300, 0.15, "sawtooth", 0.2);
    playTone(200, 0.2, "sawtooth", 0.2, 0.15);
  },

  win: () => {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      playTone(freq, 0.3, "sine", 0.4, i * 0.12);
    });
    playTone(1047, 0.5, "sine", 0.5, 0.5);
  },

  lose: () => {
    playTone(400, 0.2, "sawtooth", 0.3);
    playTone(350, 0.2, "sawtooth", 0.3, 0.2);
    playTone(300, 0.3, "sawtooth", 0.3, 0.4);
  },

  rps: () => {
    playTone(600, 0.05, "square", 0.2);
    playTone(800, 0.05, "square", 0.2, 0.1);
    playTone(1000, 0.05, "square", 0.2, 0.2);
  },

  penalize: () => {
    playTone(150, 0.4, "sawtooth", 0.5);
    playTone(100, 0.4, "sawtooth", 0.5, 0.2);
  },

  join: () => {
    playTone(523, 0.1, "sine", 0.3);
    playTone(659, 0.15, "sine", 0.3, 0.1);
  },

  notification: () => {
    playTone(880, 0.1, "sine", 0.25);
    playTone(1100, 0.1, "sine", 0.25, 0.12);
  },

  submit: () => playTone(660, 0.15, "sine", 0.3),
};
