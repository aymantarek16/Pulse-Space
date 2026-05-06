'use client';

type ToneStep = {
  frequency: number;
  start: number;
  duration: number;
  volume?: number;
  type?: OscillatorType;
};

type WebAudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  const audioWindow = window as WebAudioWindow;
  const AudioContextClass = audioWindow.AudioContext || audioWindow.webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new AudioContextClass();
  }

  return audioContext;
}

export async function unlockAppAudio(): Promise<boolean> {
  const context = getAudioContext();
  if (!context) return false;

  try {
    if (context.state === 'suspended') {
      await context.resume();
    }

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;

    gain.gain.setValueAtTime(0.0001, now);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.01);

    return true;
  } catch (error) {
    console.warn('Audio unlock failed:', error);
    return false;
  }
}

function playToneSequence(steps: ToneStep[]): boolean {
  const context = getAudioContext();
  if (!context) return false;

  try {
    if (context.state === 'suspended') {
      void context.resume();
    }

    const startAt = context.currentTime + 0.015;

    steps.forEach((step) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const toneStart = startAt + step.start;
      const toneEnd = toneStart + step.duration;
      const volume = step.volume ?? 0.075;

      oscillator.type = step.type ?? 'sine';
      oscillator.frequency.setValueAtTime(step.frequency, toneStart);
      gain.gain.setValueAtTime(0.0001, toneStart);
      gain.gain.exponentialRampToValueAtTime(volume, toneStart + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, toneEnd);

      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(toneStart);
      oscillator.stop(toneEnd + 0.02);
    });

    return true;
  } catch (error) {
    console.warn('Audio playback failed:', error);
    return false;
  }
}

export function playMessageSound(enabled = true): boolean {
  if (!enabled) return false;

  return playToneSequence([
    { frequency: 620, start: 0, duration: 0.07, volume: 0.06, type: 'sine' },
    { frequency: 920, start: 0.075, duration: 0.11, volume: 0.08, type: 'triangle' },
  ]);
}

export function playNotificationSound(enabled = true): boolean {
  if (!enabled) return false;

  return playToneSequence([
    { frequency: 740, start: 0, duration: 0.08, volume: 0.055, type: 'triangle' },
    { frequency: 980, start: 0.085, duration: 0.08, volume: 0.065, type: 'sine' },
    { frequency: 1240, start: 0.17, duration: 0.1, volume: 0.05, type: 'triangle' },
  ]);
}
