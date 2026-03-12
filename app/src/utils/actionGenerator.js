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
 * Build a weighted action pool based on fighter stats and battle state.
 * Stats don't just gate actions — they influence HOW LIKELY each action
 * is to appear in the player's options.
 *
 * - Luck: rare/powerful options (special, precision, chain lightning)
 * - Power: normal attack frequency + damage scaling
 * - Defense: shield, reflect
 * - Wit: poison, sabotage, strategic picks; also more choices
 * - Chaos: burn, stun, chain lightning; unpredictable choice count
 * - Hype: buff, lifesteal, intimidate
 * - Swagger: taunt, intimidate, siphon
 * - Focus: precision, special, siphon; also more choices
 * - Stamina: heal, cleanse
 * - Grit: berserker, endure
 * - Speed: chain lightning
 */
function buildWeightedPool(aS, dS, state) {
  const pool = [];
  const add = (id, weight) => { if (weight > 0.05) pool.push({ id, weight }); };

  // Normal attack — power makes it appear more often
  add("normal_attack", 2.5 + aS.power / 15);

  // Special move — luck + focus; hard req: 60 NRG
  if (state.nrg >= 60)
    add("special_move", 0.4 + aS.luck / 22 + aS.focus / 35);

  // Heal — stamina + grit when hurt; more weight the lower HP
  if (state.hp < 75) {
    const hpUrgency = state.hp < 30 ? 2.5 : state.hp < 50 ? 1.2 : 0.3;
    add("heal", hpUrgency + aS.stamina / 28);
  }

  // Buff — hype driven, free action
  add("buff", 0.3 + aS.hype / 28);

  // Shield — defense driven; only if no active shield
  if (state.shield === 0)
    add("shield", 0.3 + aS.defense / 22);

  // Stun — chaos driven; not if enemy already stunned
  if (!state.enemyStunned)
    add("stun_attack", 0.2 + aS.chaos / 25);

  // Lifesteal — hype + swagger; only when hurt
  if (state.hp < 85)
    add("lifesteal", 0.3 + aS.hype / 30 + aS.swagger / 45);

  // Siphon — focus + swagger; enemy must have energy
  if (state.enemyNrg > 10)
    add("siphon_energy", 0.2 + aS.focus / 30 + aS.swagger / 40);

  // Chain lightning — chaos + speed; luck boosts as rare action
  add("chain_lightning", 0.15 + aS.chaos / 28 + aS.speed / 40 + aS.luck / 60);

  // Armor break — power + wit; needs enemy to have defense
  if (state.enemyDefense > 8)
    add("armor_break", 0.2 + aS.power / 28 + aS.wit / 40);

  // Berserker — grit + power; risky, need HP to spare
  if (state.hp > 15)
    add("berserker_strike", 0.15 + aS.grit / 22 + aS.power / 40);

  // Soul swap — hype + swagger; only when behind on HP
  if (state.hp < state.enemyHp - 5)
    add("soul_swap", 0.1 + aS.hype / 30 + aS.swagger / 35);

  // Reflect — defense; only if no active reflect
  if (state.reflect === 0)
    add("reflect", 0.2 + aS.defense / 25);

  // Burn — chaos; not if already burning
  if (!state.enemyBurning)
    add("burn_attack", 0.2 + aS.chaos / 24);

  // Poison — wit; not if already poisoned
  if (!state.enemyPoisoned)
    add("poison_attack", 0.2 + aS.wit / 24);

  // Sabotage — wit + chaos; not if already sabotaged
  if (!state.enemySabotaged)
    add("sabotage", 0.15 + aS.wit / 28 + aS.chaos / 40);

  // Intimidate — swagger + hype
  add("intimidate", 0.15 + aS.swagger / 24 + aS.hype / 40);

  // Taunt — swagger-heavy
  add("taunt", 0.1 + aS.swagger / 20);

  // Precision strike — focus; RARE — luck amplifies heavily
  add("precision_strike", 0.05 + aS.focus / 20 * (1 + aS.luck / 50));

  // Cleanse — stamina + wit; only with active debuffs
  if (state.hasDebuffs)
    add("cleanse", 1.8 + aS.stamina / 25 + aS.wit / 40);

  return pool;
}

/**
 * Determine how many action choices this fighter gets (1–5).
 * Wit and Focus increase choices. Chaos adds swing. Luck helps slightly.
 */
function rollNumChoices(aS) {
  // Base: random 1-3
  let n = 1 + Math.floor(Math.random() * 3);

  // Wit: strategic mind sees more options
  if (aS.wit > 45 && Math.random() < 0.55) n++;
  if (aS.wit > 70 && Math.random() < 0.35) n++;

  // Focus: concentration reveals options
  if (aS.focus > 50 && Math.random() < 0.4) n++;

  // Luck: might stumble onto an extra option
  if (aS.luck > 55 && Math.random() < 0.3) n++;

  // Chaos: unpredictable — could add or remove an option
  if (aS.chaos > 40) {
    const swing = Math.random();
    if (swing < 0.25) n--;
    else if (swing > 0.75) n++;
  }

  // Low overall stats = fewer options
  const avgStat = (aS.power + aS.speed + aS.wit + aS.luck + aS.focus) / 5;
  if (avgStat < 35 && Math.random() < 0.4) n--;

  return Math.max(1, Math.min(5, n));
}

/**
 * Weighted random selection without replacement.
 * Picks `count` items from a weighted pool.
 */
function weightedSample(pool, count) {
  const remaining = [...pool];
  const selected = [];
  const pick = Math.min(count, remaining.length);

  for (let i = 0; i < pick; i++) {
    const total = remaining.reduce((s, item) => s + item.weight, 0);
    let r = Math.random() * total;
    let idx = 0;
    for (let j = 0; j < remaining.length; j++) {
      r -= remaining[j].weight;
      if (r <= 0) { idx = j; break; }
    }
    selected.push(remaining[idx]);
    remaining.splice(idx, 1);
  }
  return selected;
}

/**
 * Generate action options for a player-controlled turn.
 * Returns 1–5 action option objects. Stats deeply influence both
 * WHICH actions appear and HOW MANY choices the player gets.
 *
 * @param {object} aS - attacker stats
 * @param {object} dS - defender stats
 * @param {object} state - battle state
 * @returns {Array<{id, name, emoji, desc, cat}>}
 */
export function generateActionOptions(aS, dS, state) {
  // Taunted: only normal attack
  if (state.isTaunted) {
    return [ACTION_MAP["normal_attack"]];
  }

  const numChoices = rollNumChoices(aS);
  const pool = buildWeightedPool(aS, dS, state);
  const selected = weightedSample(pool, numChoices);

  // Convert to action objects, deduplicate just in case
  const seen = new Set();
  const options = [];
  for (const item of selected) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      options.push(ACTION_MAP[item.id]);
    }
  }

  // Fallback: if somehow empty, give normal attack
  if (options.length === 0) options.push(ACTION_MAP["normal_attack"]);

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
