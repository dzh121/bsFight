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
  enabled: true,
  masterVolume: 1,

  events: {
    // Battle flow
    battleStart: { src: "/sounds/Dmmm.mp3", volume: 0.8 },
    countdown: { src: "/sounds/Tick Tock.mp3", volume: 0.7 },
    turnStart: { src: "/sounds/whopuuuuf.mp3", volume: 0.3 },

    // Attacks
    normalHit: { src: "/sounds/punch.mp3" },
    criticalHit: { src: "/sounds/BOOMMMM.mp3", volume: 0.9 },
    specialMove: { src: "/sounds/Grrrtr.mp3", volume: 0.9 },
    combo: { src: "/sounds/Wuhddsh.mp3", volume: 0.8 },

    // Defense
    dodge: { src: "/sounds/WHoosh.mp3" },
    counter: { src: "/sounds/SWSFF.mp3", volume: 0.7 },

    // Status
    heal: { src: "/sounds/wiIIP.mp3" },
    poison: { src: "/sounds/WuWuWuWu.mp3" },
    buff: { src: "/sounds/wiIIP.mp3" },

    // Outcome
    ko: { src: "/sounds/punch wuch.mp3", volume: 1.0 },
    victory: { src: "/sounds/Tinnn.mp3", volume: 0.9 },
    championCrown: { src: "/sounds/TOONTunTunTOON.mp3", volume: 1.0 },
  },
};

export default soundConfig;
