/**
 * Sound Configuration
 *
 * Map game events to sound files. Place your .mp3/.wav/.ogg files
 * in the /public/sounds/ folder and reference them here.
 *
 * Set `enabled` to true once you have sounds ready.
 * Set `masterVolume` (0.0 – 1.0) to control overall loudness.
 *
 * Each event maps to { src, volume? }:
 *   src    – path relative to /public (e.g. "/sounds/hit.mp3")
 *   volume – optional per-sound volume override (0.0 – 1.0)
 */

const soundConfig = {
  enabled: false,
  masterVolume: 0.6,

  events: {
    // Battle flow
    battleStart:   { src: "/sounds/battle-start.mp3", volume: 0.8 },
    countdown:     { src: "/sounds/countdown.mp3", volume: 0.7 },
    turnStart:     { src: "/sounds/turn-start.mp3", volume: 0.3 },

    // Attacks
    normalHit:     { src: "/sounds/hit.mp3" },
    criticalHit:   { src: "/sounds/critical.mp3", volume: 0.9 },
    specialMove:   { src: "/sounds/special.mp3", volume: 0.9 },
    combo:         { src: "/sounds/combo.mp3", volume: 0.8 },

    // Defense
    dodge:         { src: "/sounds/dodge.mp3" },
    counter:       { src: "/sounds/counter.mp3", volume: 0.7 },

    // Status
    heal:          { src: "/sounds/heal.mp3" },
    poison:        { src: "/sounds/poison.mp3" },
    buff:          { src: "/sounds/buff.mp3" },

    // Outcome
    ko:            { src: "/sounds/ko.mp3", volume: 1.0 },
    victory:       { src: "/sounds/victory.mp3", volume: 0.9 },
    championCrown: { src: "/sounds/champion.mp3", volume: 1.0 },
  },
};

export default soundConfig;
