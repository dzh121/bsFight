import soundConfig from "./soundConfig.js";

/**
 * Sound Engine
 *
 * Lightweight audio manager that plays sounds based on game events.
 * Uses the Web Audio API with HTMLAudioElement fallback.
 *
 * Usage:
 *   import { playSound, stopAll, setMasterVolume } from "./soundEngine";
 *   playSound("normalHit");
 *   playSound("victory");
 *   stopAll();
 */

const audioCache = new Map();
let masterVolume = soundConfig.masterVolume;

function getAudio(src) {
  if (audioCache.has(src)) return audioCache.get(src);
  const audio = new Audio(src);
  audio.preload = "auto";
  audioCache.set(src, audio);
  return audio;
}

/**
 * Play a sound for the given event name.
 * Does nothing if sounds are disabled or the event is not configured.
 */
export function playSound(eventName) {
  if (!soundConfig.enabled) return;
  const entry = soundConfig.events[eventName];
  if (!entry || !entry.src) return;

  try {
    const audio = getAudio(entry.src);
    audio.volume = (entry.volume ?? 1.0) * masterVolume;
    audio.currentTime = 0;
    audio.play().catch(() => {
      // Silently ignore autoplay restrictions
    });
  } catch {
    // Gracefully handle missing files
  }
}

/**
 * Stop all currently cached audio elements.
 */
export function stopAll() {
  for (const audio of audioCache.values()) {
    audio.pause();
    audio.currentTime = 0;
  }
}

/**
 * Update master volume at runtime (0.0 – 1.0).
 * 
 */
export function setMasterVolume(vol) {
  masterVolume = Math.max(0, Math.min(1, vol));
}

/**
 * Preload all configured sounds so they're ready instantly.
 * Call this once after the page loads.
 */
export function preloadAll() {
  if (!soundConfig.enabled) return;
  for (const entry of Object.values(soundConfig.events)) {
    if (entry?.src) getAudio(entry.src);
  }
}
