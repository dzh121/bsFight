// Action Generator — produces eligible action options for player-controlled turns

const ACTION_DEFS = [
  { id: "normal_attack", name: "Attack", emoji: "👊", desc: "Standard strike", cat: "offensive" },
  { id: "special_move", name: "Special Move", emoji: "⚡", desc: "High-damage energy blast (60 NRG)", cat: "offensive" },
  { id: "heal", name: "Heal", emoji: "💚", desc: "Recover HP", cat: "defensive" },
  { id: "buff", name: "Power Up", emoji: "✨", desc: "Boost a random stat (free action)", cat: "utility" },
  { id: "shield", name: "Shield", emoji: "🛡️", desc: "Absorb incoming damage", cat: "defensive" },
  { id: "stun_attack", name: "Stun", emoji: "😵", desc: "Skip enemy's next turn", cat: "offensive" },
  { id: "lifesteal", name: "Lifesteal", emoji: "🩸", desc: "Drain HP from enemy", cat: "offensive" },
  { id: "siphon_energy", name: "Siphon", emoji: "🔋", desc: "Steal enemy energy", cat: "utility" },
  { id: "chain_lightning", name: "Chain Lightning", emoji: "⚡", desc: "Multi-hit shock attack", cat: "offensive" },
  { id: "armor_break", name: "Armor Break", emoji: "🔨", desc: "Permanently reduce enemy defense", cat: "offensive" },
  { id: "berserker_strike", name: "Berserker", emoji: "💢", desc: "Trade own HP for massive damage", cat: "offensive" },
  { id: "soul_swap", name: "Soul Swap", emoji: "🔄", desc: "Swap a portion of HP with enemy", cat: "utility" },
  { id: "reflect", name: "Reflect", emoji: "🪞", desc: "Bounce damage back for 2-3 turns", cat: "defensive" },
  { id: "burn_attack", name: "Burn", emoji: "🔥", desc: "Set enemy on fire (DoT)", cat: "offensive" },
  { id: "poison_attack", name: "Poison", emoji: "🧪", desc: "Poison enemy (DoT)", cat: "offensive" },
  { id: "sabotage", name: "Sabotage", emoji: "🔧", desc: "Reduce a random enemy stat", cat: "utility" },
  { id: "intimidate", name: "Intimidate", emoji: "😤", desc: "Weaken enemy attacks + minor damage", cat: "utility" },
  { id: "taunt", name: "Taunt", emoji: "😏", desc: "Force enemy to basic attack next turn", cat: "utility" },
  { id: "precision_strike", name: "Precision Strike", emoji: "🎯", desc: "Ignores all damage reductions", cat: "offensive" },
  { id: "cleanse", name: "Cleanse", emoji: "🧹", desc: "Remove all debuffs + small heal", cat: "defensive" },
];

const ACTION_MAP = Object.fromEntries(ACTION_DEFS.map(a => [a.id, a]));

/**
 * Check which actions a fighter is eligible for this turn.
 * @param {object} aS - attacker stats
 * @param {object} dS - defender stats
 * @param {object} state - current battle state for this fighter
 *   { hp, maxHp, nrg, maxNrg, shield, reflect, isTaunted,
 *     hasDebuffs, enemyHp, enemyStunned, enemyBurning, enemyPoisoned,
 *     enemySabotaged, enemyNrg, enemyDefense }
 * @returns {string[]} list of eligible action IDs (excluding normal_attack)
 */
function getEligibleActions(aS, dS, state) {
  const eligible = [];

  if (state.nrg >= 60)
    eligible.push("special_move");

  if (state.hp < 60)
    eligible.push("heal");

  if (aS.hype > 35)
    eligible.push("buff");

  if (aS.defense > 35 && state.shield === 0)
    eligible.push("shield");

  if (aS.chaos > 45 && !state.enemyStunned)
    eligible.push("stun_attack");

  if (aS.hype > 30 && state.hp < 75)
    eligible.push("lifesteal");

  if (aS.focus > 35 && aS.swagger > 25 && state.enemyNrg > 15)
    eligible.push("siphon_energy");

  if (aS.chaos > 40 && aS.speed > 30)
    eligible.push("chain_lightning");

  if (aS.power > 40 && aS.wit > 30 && state.enemyDefense > 15)
    eligible.push("armor_break");

  if (aS.grit > 40 && aS.power > 35 && state.hp > 20)
    eligible.push("berserker_strike");

  if (aS.hype > 35 && aS.swagger > 30 && state.hp < state.enemyHp - 10)
    eligible.push("soul_swap");

  if (aS.defense > 40 && state.reflect === 0)
    eligible.push("reflect");

  if (aS.chaos > 35 && !state.enemyBurning)
    eligible.push("burn_attack");

  if (aS.wit > 35 && !state.enemyPoisoned)
    eligible.push("poison_attack");

  if (aS.wit > 40 && aS.chaos > 30 && !state.enemySabotaged)
    eligible.push("sabotage");

  if (aS.swagger > 35 && aS.hype > 25)
    eligible.push("intimidate");

  if (aS.swagger > 40 && aS.hype > 30)
    eligible.push("taunt");

  if (aS.focus > 50)
    eligible.push("precision_strike");

  if (state.hasDebuffs)
    eligible.push("cleanse");

  return eligible;
}

/** Fisher-Yates shuffle (in-place) */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Generate action options for a player-controlled turn.
 * Returns 2–5 action option objects, always including normal_attack first.
 *
 * @param {object} aS - attacker stats
 * @param {object} dS - defender stats
 * @param {object} state - battle state (see getEligibleActions)
 * @returns {Array<{id, name, emoji, desc, cat}>}
 */
export function generateActionOptions(aS, dS, state) {
  // Taunted: only normal attack
  if (state.isTaunted) {
    return [ACTION_MAP["normal_attack"]];
  }

  const eligible = getEligibleActions(aS, dS, state);
  shuffle(eligible);

  // Pick up to 4 extra options (total 5 with normal_attack)
  const picked = eligible.slice(0, Math.min(4, eligible.length));
  const options = [ACTION_MAP["normal_attack"], ...picked.map(id => ACTION_MAP[id])];

  return options;
}

/**
 * NPC auto-selection: weighted random from available options.
 * Slightly prefers heal when low HP, special when available.
 */
export function npcAutoSelect(options, state) {
  if (options.length === 1) return options[0].id;

  // Build weighted list
  const weights = options.map(opt => {
    let w = 1;
    if (opt.id === "heal" && state.hp < 30) w = 3;
    else if (opt.id === "heal") w = 1.5;
    if (opt.id === "special_move") w = 2;
    if (opt.id === "cleanse" && state.hasDebuffs) w = 2;
    if (opt.id === "shield" && state.hp < 40) w = 1.5;
    if (opt.id === "berserker_strike" && state.hp < 30) w = 0.3;
    return w;
  });

  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < options.length; i++) {
    r -= weights[i];
    if (r <= 0) return options[i].id;
  }
  return options[options.length - 1].id;
}

export { ACTION_MAP, ACTION_DEFS };
