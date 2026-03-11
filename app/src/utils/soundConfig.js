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
    countdownFight: { src: "/sounds/Ready Fight.mp3", volume: 0.9 },

    // Attacks
    normalHit: { src: "/sounds/punch.mp3" },
    criticalHit: { src: "/sounds/BOOMMMM.mp3", volume: 0.9 },
    specialMove: { src: "/sounds/Grrrtr.mp3", volume: 0.9 },
    specialCharge: { src: "/sounds/Sword Sdiiin.mp3", volume: 0.7 },
    specialImpact: { src: "/sounds/Sword Boom.mp3", volume: 0.9 },
    combo: { src: "/sounds/Wuhddsh.mp3", volume: 0.8 },
    doubleStrike: { src: "/sounds/Sword Ssswit.mp3", volume: 0.7 },

    // Defense
    dodge: { src: "/sounds/WHoosh.mp3" },
    counter: { src: "/sounds/SWSFF.mp3", volume: 0.7 },
    counterImpact: { src: "/sounds/Sword Ting.mp3", volume: 0.8 },
    shieldBlock: { src: "/sounds/Sword Ting.mp3", volume: 0.6 },
    shieldBreak: { src: "/sounds/Sword Boom.mp3", volume: 0.7 },

    // Status effects
    heal: { src: "/sounds/wiIIP.mp3" },
    poison: { src: "/sounds/WuWuWuWu.mp3" },
    buff: { src: "/sounds/wiIIP.mp3" },
    stun: { src: "/sounds/dragon-studio-lightning-strike-386161.mp3", volume: 0.6 },
    lifesteal: { src: "/sounds/Grrrtr.mp3", volume: 0.7 },
    shield: { src: "/sounds/Sword Sdiiin.mp3", volume: 0.6 },
    rage: { src: "/sounds/BOOMMMM.mp3", volume: 0.8 },
    reflect: { src: "/sounds/Sword Ting.mp3", volume: 0.6 },
    reflectBounce: { src: "/sounds/SWSFF.mp3", volume: 0.6 },
    burn: { src: "/sounds/Grrrtr.mp3", volume: 0.6 },

    // New mechanics
    execute: { src: "/sounds/Sword Boom.mp3", volume: 1.0 },
    sabotage: { src: "/sounds/WuWuWuWu.mp3", volume: 0.6 },
    momentum: { src: "/sounds/Whoooss.mp3", volume: 0.5 },
    intimidate: { src: "/sounds/Dmmm.mp3", volume: 0.6 },
    cleanse: { src: "/sounds/wiIIP.mp3", volume: 0.7 },
    crowdEvent: { src: "/sounds/Crowd Woouu.mp3", volume: 0.6 },
    luckySave: { src: "/sounds/Woooho.mp3", volume: 0.8 },
    backfire: { src: "/sounds/BOOMMMM.mp3", volume: 0.5 },

    // Crowd reactions
    crowdCheer: { src: "/sounds/Cheer.mp3", volume: 0.5 },
    crowdWoo: { src: "/sounds/Crowd Wooo.mp3", volume: 0.4 },
    crowdClap: { src: "/sounds/Claps.mp3", volume: 0.5 },
    crowdNoise: { src: "/sounds/Crowd Noise.mp3", volume: 0.3 },
    crowdWoouu: { src: "/sounds/Crowd Woouu.mp3", volume: 0.4 },

    // Pain / KO
    painDie: { src: "/sounds/Man die.mp3", volume: 0.6 },

    // Outcome
    ko: { src: "/sounds/punch wuch.mp3", volume: 1.0 },
    victory: { src: "/sounds/Tinnn.mp3", volume: 0.9 },
    victoryCheer: { src: "/sounds/VICtoory.mp3", volume: 0.8 },
    championCrown: { src: "/sounds/TOONTunTunTOON.mp3", volume: 1.0 },
  },
};

export default soundConfig;
