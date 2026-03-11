export const emojiMap = {
  Daniel: "🧔",
  Noah: "👨‍💼",
  Yuval: "🧑‍💻",
  Shira: "👩‍💼",
  Gil: "🕺",
  Tamar: "💃",
  Ido: "🤓",
  Maya: "👩‍🔬",
  Or: "😎",
  Lior: "🦸",
  Ron: "🏋️",
  Noa: "🧠",
  Amit: "🤠",
  Tal: "🎯",
  Jonathan: "🦊",
  Alon: "🌲",
  Shahar: "🌅",
  Dor: "💪",
  Itai: "🔥",
  Gal: "🌊",
  Adi: "⚡",
  Roy: "🎸",
  Ariel: "🦁",
  Nir: "🗡️",
  Ben: "🎩",
  Aviv: "☀️",
  Nadav: "🛡️",
  Inbar: "💎",
  Michal: "🌸",
  Yael: "🦅",
  Assaf: "🎭",
  David: "👑",
  Moshe: "📜",
  Yaron: "🚀",
  Omer: "🎪",
  Kobi: "🏆",
};

export const atkNames = [
  "Desk Throw",
  "Keyboard Smash",
  "Chair Spin",
  "Coffee Splash",
  "Stapler Strike",
  "Monitor Drop",
  "Mouse Fling",
  "Cable Whip",
  "Notebook Slam",
  "Tablet Toss",
  "Email Barrage",
  "Stealth Move",
  "Manager Punch",
  "Deadline Kick",
  "Bug Storm",
  "Zoom Attack",
  "Slack Slap",
  "WiFi Sparks",
  "Meeting Wave",
  "PR Strike",
  "Super Commit",
  "Task Tornado",
  "Caffeine Burst",
  "JIRA Launch",
  "Deadline Surge",
  "Deploy Smash",
  "Git Conflict",
  "Code Review Hit",
  "Production Blast",
  "Standup Attack",
];

export const specialNames = [
  "⭐ Super Special Strike",
  "⭐ Final Move",
  "⭐ Ultimate Attack",
  "⭐ Ultimate Tech Strike",
  "⭐ Open Space Assault",
  "⭐ Corporate Fate Blow",
];

export const critLines = [
  "CRITICAL HIT!!!",
  "DEVASTATING BLOW!",
  "Double Damage!",
  "Crushing Strike!",
  "Slammed the Laptop Shut!",
  "BOOM!",
];

export const dodgeLines = [
  "dodged at the last second!",
  "ran to the meeting room!",
  "quick move — avoided!",
  "DODGE!",
  "slipped through the door!",
  "hid behind the monitor!",
];

export const crowdLines = [
  "🔥 The office is going wild!",
  "👀 Everyone's on the edge of their seats!",
  "📢 Shouting from the open space!",
  "🍿 Unbearable tension!",
  "😱 Unbelievable!",
  "💥 What a round!",
  "🎺 Everyone's coming from the kitchen!",
  "🤯 Insane!",
  "📣 Everyone's on their feet!",
  "🥁 Pounding on the desks!",
  "😤 Peak tension!",
  "🎆 What a show!",
];

export const healLines = [
  "grabbed a coffee!",
  "took a smoke break!",
  "recharged!",
  "absorbed energy from the kitchen!",
];

export const poisonLines = [
  "sent a passive-aggressive email!",
  "CC'd the manager!",
  "tagged @all in Slack!",
];

export const counterLines = [
  "Counter Attack!",
  "fired a Reply All!",
  "Boomerang Email!",
];

export const buffLines = [
  "got promoted!",
  "on fire!",
  "coffee power-up!",
  "corporate fighting spirit!",
];

export const MAX_HP = 100;
export const MAX_NRG = 100;
export const TURN_DELAY = 1100;

export function rand(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}
export function pick(arr) {
  return arr[rand(0, arr.length - 1)];
}

export function shuffle(a) {
  const c = [...a];
  for (let i = c.length - 1; i > 0; i--) {
    const j = rand(0, i);
    [c[i], c[j]] = [c[j], c[i]];
  }
  return c;
}

export function normalizeNames(t) {
  return [
    ...new Set(
      t
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ];
}

export function generateBalancedStats() {
  const budget = rand(310, 380);
  let vals = [];
  let remaining = budget;
  for (let i = 0; i < 5; i++) {
    const maxV = Math.min(95, remaining - (5 - i) * 25);
    const v = rand(25, Math.max(25, maxV));
    vals.push(v);
    remaining -= v;
  }
  vals.push(Math.max(25, Math.min(95, remaining)));
  vals = shuffle(vals);
  return {
    power: vals[0],
    speed: vals[1],
    hype: vals[2],
    chaos: vals[3],
    luck: vals[4],
    defense: vals[5],
  };
}

export function buildFighterObjects(names) {
  return shuffle(names).map((name) => ({
    name,
    wins: 0,
    stats: generateBalancedStats(),
  }));
}

export function getEmoji(n) {
  if (emojiMap[n]) return emojiMap[n];
  const f = Object.entries(emojiMap).find(
    ([k]) => n.includes(k) || k.includes(n),
  );
  return f ? f[1] : "🧑‍💼";
}

export function spawnConfetti(n = 120) {
  const c = document.createElement("div");
  c.className = "confetti-container";
  document.body.appendChild(c);
  const cols = [
    "#ef4444",
    "#f59e0b",
    "#22c55e",
    "#3b82f6",
    "#a855f7",
    "#ec4899",
    "#facc15",
    "#06b6d4",
  ];
  for (let i = 0; i < n; i++) {
    const p = document.createElement("div");
    p.className = "confetti-piece";
    p.style.cssText = `left:${rand(0, 100)}%;width:${rand(6, 14)}px;height:${rand(6, 14)}px;background:${pick(cols)};border-radius:${rand(0, 1) ? "50%" : "2px"};animation-duration:${rand(20, 45) / 10}s;animation-delay:${rand(0, 25) / 10}s;`;
    c.appendChild(p);
  }
  setTimeout(() => c.remove(), 6000);
}
