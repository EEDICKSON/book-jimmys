// lib/sounds.ts
// Generates sounds using the Web Audio API
// No external files needed — sounds are generated programmatically
// This means no loading time and no copyright issues

// Create audio context lazily — browsers require user interaction first
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

// Play a simple tone with given parameters
function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  volume: number = 0.3,
) {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    oscillator.type = type;

    // Fade out smoothly to avoid clicks
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      ctx.currentTime + duration,
    );

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch (error) {
    // Silently fail — sound is enhancement, not critical
    console.warn("Audio playback failed:", error);
  }
}

// ── GAME SOUNDS ──────────────────────────────────────────

export function playCorrectSound() {
  // Happy ascending two-tone chime
  playTone(523, 0.15, "sine", 0.3); // C5
  setTimeout(() => playTone(659, 0.2, "sine", 0.3), 100); // E5
  setTimeout(() => playTone(784, 0.3, "sine", 0.25), 200); // G5
}

export function playWrongSound() {
  // Low descending buzz
  playTone(300, 0.1, "sawtooth", 0.2);
  setTimeout(() => playTone(200, 0.3, "sawtooth", 0.15), 100);
}

export function playTickSound() {
  // Short soft tick for timer warning
  playTone(800, 0.05, "square", 0.1);
}

export function playCompleteSound() {
  // Victory fanfare — ascending arpeggio
  const notes = [523, 659, 784, 1047];
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.3, "sine", 0.25), i * 120);
  });
}

export function playTimeUpSound() {
  // Descending alarm
  playTone(440, 0.2, "square", 0.2);
  setTimeout(() => playTone(350, 0.2, "square", 0.2), 200);
  setTimeout(() => playTone(280, 0.4, "square", 0.15), 400);
}
