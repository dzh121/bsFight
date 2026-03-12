#!/usr/bin/env node
/**
 * bsFight — Balance-of-Powers Simulation
 * Headless battle engine replicating battleEngine.js math (no DOM, no delays).
 * Usage:  node scripts/simulate.js [--sims N] [--verbose]
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const os = require('os');

const MAX_HP  = 100;
const MAX_NRG = 100;

function rand(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function pick(arr)  { return arr[Math.floor(Math.random() * arr.length)]; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// ─── Headless Battle Engine ────────────────────────────────────────────────────
function simulateBattle(f1, f2) {
  const s1 = { ...f1.stats };
  const s2 = { ...f2.stats };

  let hp1 = MAX_HP, hp2 = MAX_HP;
  let nrg1 = 0,    nrg2 = 0;

  let poison1 = 0,   poison2 = 0;
  let burn1   = 0,   burn2   = 0;
  let stun1   = false, stun2 = false;
  let shield1 = 0,   shield2 = 0;
  let rage1   = 0,   rage2   = 0;
  let reflect1 = 0,  reflect2 = 0;
  let intimidate1 = 0, intimidate2 = 0;
  let sabotage1 = 0,   sabotage2 = 0;
  let momentum1 = 0,   momentum2 = 0;
  let combo1  = 0,   combo2  = 0;
  let nextDouble1 = false, nextDouble2 = false;
  let taunt1 = false, taunt2 = false;
  let secondWind1 = false, secondWind2 = false;
  let endure1 = false, endure2 = false;

  const maxTurns = rand(12, 18);
  let turn = 0;
  let suddenDeath = false;
  let totalActions = { f1: {}, f2: {} };

  function logAction(isA, key) {
    const t = isA ? totalActions.f1 : totalActions.f2;
    t[key] = (t[key] || 0) + 1;
  }

  while (hp1 > 0 && hp2 > 0 && turn < maxTurns * 2) {
    turn++;
    const turnNum = Math.ceil(turn / 2);
    const isA = turn % 2 === 1;
    const aS  = isA ? s1 : s2;
    const dS  = isA ? s2 : s1;

    // SUDDEN DEATH — at 80% of max turns
    if (!suddenDeath && turnNum >= Math.round(maxTurns * 0.8)) {
      suddenDeath = true;
      rage1 = 99; rage2 = 99;
    }

    // ENERGY GAIN (before stun check, matching battleEngine.js)
    const focusBonus = Math.round((isA ? s1.focus : s2.focus) / 15);
    const nrgGain = rand(12, 22) + focusBonus;
    if (isA) nrg1 = Math.min(MAX_NRG, nrg1 + nrgGain);
    else     nrg2 = Math.min(MAX_NRG, nrg2 + nrgGain);

    // STUN CHECK
    const amIStunned = isA ? stun1 : stun2;
    if (amIStunned) {
      if (isA) stun1 = false; else stun2 = false;
      if (isA) combo1 = 0; else combo2 = 0;
      logAction(isA, 'stun_skip');
      continue;
    }

    // Rage tick
    if (isA) { if (rage1 > 0) rage1--; }
    else     { if (rage2 > 0) rage2--; }

    // Reflect tick
    if (isA) { if (reflect1 > 0) reflect1--; }
    else     { if (reflect2 > 0) reflect2--; }

    // Sabotage tick
    if (isA) { if (sabotage1 > 0) sabotage1--; }
    else     { if (sabotage2 > 0) sabotage2--; }

    // POISON tick
    const myPoison = isA ? poison1 : poison2;
    if (myPoison > 0) {
      const reduction = Math.round((aS.defense + aS.grit) / 40);
      const pd = Math.max(1, rand(3, 6) - reduction);
      if (isA) { hp1 = Math.max(0, hp1 - pd); poison1--; }
      else     { hp2 = Math.max(0, hp2 - pd); poison2--; }
      logAction(isA, 'poison_tick');
      if ((isA ? hp1 : hp2) <= 0) break;
    }

    // BURN tick
    const myBurn = isA ? burn1 : burn2;
    if (myBurn > 0) {
      const reduction = Math.round((aS.speed + aS.grit) / 50);
      const bd = Math.max(1, rand(2, 5) + (3 - myBurn) - reduction);
      if (isA) { hp1 = Math.max(0, hp1 - bd); burn1--; }
      else     { hp2 = Math.max(0, hp2 - bd); burn2--; }
      logAction(isA, 'burn_tick');
      if ((isA ? hp1 : hp2) <= 0) break;
    }

    const roll   = Math.random() * 100;
    const myNrg  = isA ? nrg1 : nrg2;
    const myHp   = isA ? hp1  : hp2;
    const defHp  = isA ? hp2  : hp1;

    // Taunt enforcement — taunted fighters can only dodge or normal attack
    const isTaunted = isA ? taunt1 : taunt2;
    if (isTaunted) { if (isA) taunt1 = false; else taunt2 = false; logAction(isA, 'taunted'); }

    actionPhase: {
    if (isTaunted) break actionPhase;

    // ── SPECIAL MOVE (energy-based high damage) ──
    if (myNrg >= 60 && roll < 20 + aS.focus / 18) {
      if (isA) nrg1 -= 60; else nrg2 -= 60;
      const rawDmg = rand(14, 22) + aS.power / 14 + aS.focus / 12;
      const dmg = Math.round(Math.max(5, rawDmg - dS.defense / 7));
      if (isA) hp2 = Math.max(0, hp2 - dmg);
      else     hp1 = Math.max(0, hp1 - dmg);
      if (isA) combo1 = 0; else combo2 = 0;
      logAction(isA, 'special_move');
      continue;
    }

    // ── HEAL ──
    if (myHp < 60 && roll < 22 + aS.luck / 6) {
      const staminaBonus  = Math.round(aS.stamina / 6);
      const gritBonus     = myHp < 30 ? Math.round(aS.grit / 14) : 0;
      const swaggerPenalty = Math.round(dS.swagger / 20);
      const heal = Math.max(5, rand(8, 16) + staminaBonus + gritBonus - swaggerPenalty);
      if (isA) hp1 = Math.min(MAX_HP, hp1 + heal);
      else     hp2 = Math.min(MAX_HP, hp2 + heal);
      if (isA) combo1 = 0; else combo2 = 0;
      logAction(isA, 'heal');
      continue;
    }

    // ── BUFF (free action — hype-powered fighters buff AND still attack) ──
    if (roll > 82 && aS.hype > 35) {
      const bStat = pick(['power', 'speed', 'chaos', 'focus', 'stamina', 'grit', 'swagger']);
      const bAmt  = rand(8, 14);
      aS[bStat] = Math.min(99, aS[bStat] + bAmt);
      logAction(isA, 'buff');
      // NOTE: no continue — buff is free, attack still happens below
    }

    // ── SHIELD ──
    const myShield = isA ? shield1 : shield2;
    if (roll > 84 && aS.defense > 35 && myShield === 0) {
      const shieldHp = rand(10, 20) + Math.round(aS.stamina / 4);
      if (isA) shield1 = shieldHp; else shield2 = shieldHp;
      if (isA) combo1 = 0; else combo2 = 0;
      logAction(isA, 'shield');
      continue;
    }

    // ── STUN ATTACK ──
    const defStunned = isA ? stun2 : stun1;
    if (roll > 78 && aS.chaos > 45 && !defStunned) {
      if (isA) stun2 = true; else stun1 = true;
      if (isA) combo1 = 0; else combo2 = 0;
      logAction(isA, 'stun_attack');
      continue;
    }

    // ── LIFESTEAL ──
    if (roll > 70 && roll <= 78 && aS.hype > 30 && myHp < 75) {
      const lsDmg  = rand(5, 10) + Math.round(aS.hype / 8) + Math.round(aS.swagger / 15);
      const lsHeal = Math.round(lsDmg * 0.5);
      if (isA) { hp2 = Math.max(0, hp2 - lsDmg); hp1 = Math.min(MAX_HP, hp1 + lsHeal); }
      else     { hp1 = Math.max(0, hp1 - lsDmg); hp2 = Math.min(MAX_HP, hp2 + lsHeal); }
      if (isA) combo1 = 0; else combo2 = 0;
      logAction(isA, 'lifesteal');
      continue;
    }

    // ── SIPHON ENERGY ──
    const defNrg = isA ? nrg2 : nrg1;
    if (roll > 44 && roll <= 48 && aS.focus > 35 && aS.swagger > 25 && defNrg > 15) {
      const siphonAmt = rand(15, 30) + Math.round(aS.focus / 10);
      const stolen = Math.min(siphonAmt, defNrg);
      if (isA) { nrg2 = Math.max(0, nrg2 - stolen); nrg1 = Math.min(MAX_NRG, nrg1 + stolen); }
      else     { nrg1 = Math.max(0, nrg1 - stolen); nrg2 = Math.min(MAX_NRG, nrg2 + stolen); }
      if (isA) combo1 = 0; else combo2 = 0;
      logAction(isA, 'siphon');
      continue;
    }

    // ── CHAIN LIGHTNING ──
    if (roll > 48 && roll <= 52 && aS.chaos > 40 && aS.speed > 30) {
      const hits = aS.speed > 55 ? 3 : 2;
      let totalDmg = 0;
      for (let h = 0; h < hits; h++) {
        totalDmg += Math.round((rand(4, 8) + aS.chaos / 18) * (1 - h * 0.25));
      }
      if (isA) hp2 = Math.max(0, hp2 - totalDmg);
      else     hp1 = Math.max(0, hp1 - totalDmg);
      if (isA) combo1 = 0; else combo2 = 0;
      logAction(isA, 'chain_lightning');
      continue;
    }

    // ── ARMOR BREAK ──
    if (roll > 40 && roll <= 44 && aS.power > 40 && aS.wit > 30 && dS.defense > 15) {
      const breakAmt = rand(4, 9) + Math.round(aS.power / 20);
      const abDmg    = rand(3, 7);
      dS.defense = Math.max(5, dS.defense - breakAmt);
      if (isA) hp2 = Math.max(0, hp2 - abDmg);
      else     hp1 = Math.max(0, hp1 - abDmg);
      if (isA) combo1 = 0; else combo2 = 0;
      logAction(isA, 'armor_break');
      continue;
    }

    // ── BERSERKER STRIKE ──
    if (roll > 36 && roll <= 40 && aS.grit > 40 && aS.power > 35 && myHp > 20) {
      const selfDmg = rand(6, 12);
      const brkDmg  = rand(14, 22) + Math.round(aS.power / 10) + Math.round(aS.grit / 8);
      if (isA) { hp1 = Math.max(1, hp1 - selfDmg); hp2 = Math.max(0, hp2 - brkDmg); }
      else     { hp2 = Math.max(1, hp2 - selfDmg); hp1 = Math.max(0, hp1 - brkDmg); }
      if (isA) combo1 = 0; else combo2 = 0;
      logAction(isA, 'berserker');
      continue;
    }

    // ── SOUL SWAP ──
    if (roll > 32 && roll <= 36 && aS.hype > 35 && aS.swagger > 30 && myHp < defHp - 10) {
      const swapPct = Math.round(15 + aS.swagger / 8 + aS.hype / 10);
      const swapAmt = Math.round(Math.min(18, (defHp - myHp) * swapPct / 100));
      if (isA) { hp1 = Math.min(MAX_HP, hp1 + swapAmt); hp2 = Math.max(0, hp2 - swapAmt); }
      else     { hp2 = Math.min(MAX_HP, hp2 + swapAmt); hp1 = Math.max(0, hp1 - swapAmt); }
      if (isA) combo1 = 0; else combo2 = 0;
      logAction(isA, 'soul_swap');
      continue;
    }

    // ── REFLECT ──
    const myReflectNow = isA ? reflect1 : reflect2;
    if (roll > 64 && roll <= 70 && aS.defense > 40 && myReflectNow === 0) {
      const rTurns = rand(2, 3);
      if (isA) reflect1 = rTurns; else reflect2 = rTurns;
      if (isA) combo1 = 0; else combo2 = 0;
      logAction(isA, 'reflect');
      continue;
    }

    // ── BURN ATTACK ──
    const defBurn = isA ? burn2 : burn1;
    if (roll > 60 && roll <= 64 && aS.chaos > 35 && defBurn === 0) {
      const bDmg = rand(3, 7);
      if (isA) { burn2 = 3; hp2 = Math.max(0, hp2 - bDmg); }
      else     { burn1 = 3; hp1 = Math.max(0, hp1 - bDmg); }
      if (isA) combo1 = 0; else combo2 = 0;
      logAction(isA, 'burn_attack');
      continue;
    }

    // ── POISON ATTACK ──
    const defPoison = isA ? poison2 : poison1;
    if (roll > 82 && aS.wit > 35 && defPoison === 0) {
      const pTurns = rand(2, 4), pDmg = rand(4, 9);
      if (isA) { poison2 = pTurns; hp2 = Math.max(0, hp2 - pDmg); }
      else     { poison1 = pTurns; hp1 = Math.max(0, hp1 - pDmg); }
      if (isA) combo1 = 0; else combo2 = 0;
      logAction(isA, 'poison_attack');
      continue;
    }

    // ── SABOTAGE ──
    const defSabotage = isA ? sabotage2 : sabotage1;
    if (roll > 56 && roll <= 60 && aS.wit > 40 && aS.chaos > 30 && defSabotage === 0) {
      const sabAmt   = rand(8, 15) + Math.round(aS.chaos / 20);
      const sabResist = dS.defense / 30;
      const finalAmt  = Math.max(3, Math.round(sabAmt - sabResist));
      const statKeys  = ['power','speed','hype','chaos','defense','focus','stamina','wit','grit','swagger'];
      const targetStat = aS.wit > 55
        ? statKeys.reduce((best, k) => dS[k] > dS[best] ? k : best, statKeys[0])
        : pick(statKeys);
      dS[targetStat] = Math.max(5, dS[targetStat] - finalAmt);
      if (isA) sabotage2 = 3; else sabotage1 = 3;
      if (isA) combo1 = 0; else combo2 = 0;
      logAction(isA, 'sabotage');
      continue;
    }

    // ── INTIMIDATE ──
    if (roll > 48 && roll <= 56 && aS.swagger > 35 && aS.hype > 25) {
      if (isA) intimidate2 = 2; else intimidate1 = 2;
      // Intimidation also deals minor psychic damage
      const intimDmg = Math.round(rand(2, 5) + aS.swagger / 18);
      if (isA) hp2 = Math.max(0, hp2 - intimDmg); else hp1 = Math.max(0, hp1 - intimDmg);
      if (isA) combo1 = 0; else combo2 = 0;
      logAction(isA, 'intimidate');
      continue;
    }

    // ── CLEANSE ──
    const hasDebuffs = (isA ? poison1 : poison2) > 0
      || (isA ? burn1 : burn2) > 0
      || (isA ? stun1 : stun2)
      || (isA ? sabotage1 : sabotage2) > 0;
    if (hasDebuffs && Math.random() < (aS.stamina + aS.wit) / 300 + aS.luck / 500) {
      if (isA) { poison1 = 0; burn1 = 0; stun1 = false; sabotage1 = 0; }
      else     { poison2 = 0; burn2 = 0; stun2 = false; sabotage2 = 0; }
      const cleanseHeal = rand(3, 8) + Math.round(aS.stamina / 10);
      if (isA) hp1 = Math.min(MAX_HP, hp1 + cleanseHeal);
      else     hp2 = Math.min(MAX_HP, hp2 + cleanseHeal);
      logAction(isA, 'cleanse');
      continue;
    }

    // ── TAUNT (swagger — forces enemy to only normal attack next turn) ──
    if (roll > 24 && roll <= 28 && aS.swagger > 40 && aS.hype > 30) {
      if (isA) taunt2 = true; else taunt1 = true;
      const tDmg = Math.round(rand(2, 6) + aS.swagger / 16);
      if (isA) hp2 = Math.max(0, hp2 - tDmg); else hp1 = Math.max(0, hp1 - tDmg);
      if (isA) combo1 = 0; else combo2 = 0;
      logAction(isA, 'taunt');
      continue;
    }

    // ── PRECISION STRIKE (focus — ignores all damage reductions) ──
    if (roll > 18 && roll <= 24 && aS.focus > 50) {
      const pDmg = Math.round(rand(10, 18) + aS.focus / 8);
      if (isA) hp2 = Math.max(0, hp2 - pDmg);
      else     hp1 = Math.max(0, hp1 - pDmg);
      if (isA) combo1 = 0; else combo2 = 0;
      logAction(isA, 'precision_strike');
      continue;
    }

    } // end actionPhase (taunted fighters skip here)

    // ── DODGE ──
    const dodgeChance = dS.speed / 260 + dS.wit / 500;
    if (Math.random() < dodgeChance) {
      if (isA) combo1 = 0; else combo2 = 0;
      logAction(isA, 'dodge');
      // Evasion Counter — speed-based counter after dodging
      if (aS.speed > 45 && Math.random() < aS.speed / 250) {
        const evDmg = rand(5, 11) + Math.round(aS.speed / 10);
        if (isA) hp2 = Math.max(0, hp2 - evDmg);
        else     hp1 = Math.max(0, hp1 - evDmg);
        logAction(isA, 'evasion_counter');
      }
      continue;
    }

    // ── NORMAL ATTACK ──
    const firstStrikeBonus = turn <= 6 ? aS.speed / 40 : 0;
    const baseDmg     = rand(7, 12) + aS.power / 22 + firstStrikeBonus;
    const isCrit      = Math.random() < aS.chaos / 220;
    const critMult    = isCrit ? 1.55 + aS.focus / 150 : 1;

    if (isA) combo1++; else combo2++;
    const curCombo = isA ? combo1 : combo2;
    const comboThreshold = aS.focus > 60 ? 2 : 3;
    const isCombo = curCombo >= comboThreshold;

    let dmg = Math.round(Math.max(3, Math.max(1, baseDmg - dS.defense / 17) * critMult));
    if (isCombo) dmg = Math.round(dmg * 1.25);

    // Rage boost
    const atkRage = isA ? rage1 : rage2;
    if (atkRage > 0) dmg = Math.round(dmg * (1.55 + aS.hype / 130));

    // Grit comeback
    if (myHp < 40 && aS.grit > 25) dmg = Math.round(dmg * (1.0 + aS.grit / 200));

    // Intimidate reduction
    const amIntimidated = isA ? intimidate1 : intimidate2;
    if (amIntimidated > 0) {
      const weakenPct = 35 + (isA ? s2.swagger : s1.swagger) / 4;
      dmg = Math.round(dmg * (1 - weakenPct / 100));
      if (isA) intimidate1--; else intimidate2--;
    }

    // Passive swagger resistance (aura — always active)
    if (dS.swagger > 25) dmg = Math.max(3, dmg - Math.round(dS.swagger / 10));

    // Grit toughness (damage reduction when wounded)
    if ((isA ? hp2 : hp1) < MAX_HP * 0.5 && dS.grit > 25) {
      dmg = Math.max(3, dmg - Math.round(dS.grit / 30));
    }

    // Luck bonus
    if (aS.luck > 20) dmg += rand(0, Math.round(aS.luck / 20));

    // Momentum bonus
    const myMomentum = isA ? momentum1 : momentum2;
    if (myMomentum >= 3) {
      dmg += Math.round(dmg * 0.1 * Math.min(myMomentum - 2, 3));
    }

    // Next double crowd event
    const myNextDouble = isA ? nextDouble1 : nextDouble2;
    if (myNextDouble) {
      dmg = Math.round(dmg * 2);
      if (isA) nextDouble1 = false; else nextDouble2 = false;
    }

    // Cap damage
    dmg = Math.min(dmg, Math.round(MAX_HP * 0.6));

    // Shield absorption
    let absorbed = 0;
    const defShield = isA ? shield2 : shield1;
    if (defShield > 0) {
      absorbed = Math.min(defShield, dmg);
      dmg -= absorbed;
      if (isA) shield2 -= absorbed; else shield1 -= absorbed;
    }

    if (isA) hp2 = Math.max(0, hp2 - dmg);
    else     hp1 = Math.max(0, hp1 - dmg);

    logAction(isA, isCrit ? 'crit' : 'normal_hit');

    // ── POST-ATTACK EFFECTS ──

    // REFLECT — bounce 30% damage back
    const defReflect = isA ? reflect2 : reflect1;
    if (defReflect > 0 && dmg > 0) {
      const reflDmg = Math.round(dmg * 0.3);
      if (isA) hp1 = Math.max(0, hp1 - reflDmg);
      else     hp2 = Math.max(0, hp2 - reflDmg);
      logAction(!isA, 'reflect_bounce');
    }

    // COUNTER ATTACK
    if (Math.random() < (dS.luck + dS.wit) / 250 && (isA ? hp2 : hp1) > 0) {
      const cDmg = rand(5, 12) + Math.round(dS.wit / 7);
      if (isA) hp1 = Math.max(0, hp1 - cDmg);
      else     hp2 = Math.max(0, hp2 - cDmg);
      logAction(!isA, 'counter');
    }

    // EXECUTE — finisher at low HP
    const defHpForExec = isA ? hp2 : hp1;
    if (defHpForExec > 0 && defHpForExec < 25 && aS.power > 35 && aS.grit > 30
        && Math.random() < (aS.power + aS.grit) / 400) {
      const execDmg = Math.round(rand(10, 18) + aS.power / 9 + aS.grit / 8);
      if (isA) hp2 = Math.max(0, hp2 - execDmg);
      else     hp1 = Math.max(0, hp1 - execDmg);
      logAction(isA, 'execute');
    }

    // RAGE TRIGGER
    const defHpNow  = isA ? hp2  : hp1;
    const defRageNow = isA ? rage2 : rage1;
    const rageChance = 0.5 + (isA ? s2.grit : s1.grit) / 200;
    if (defHpNow > 0 && defHpNow < 35 && defRageNow === 0 && Math.random() < rageChance) {
      if (isA) rage2 = 3; else rage1 = 3;
      logAction(!isA, 'rage_triggered');
    }

    // DOUBLE STRIKE
    if (Math.random() < aS.speed / 400 && (isA ? hp2 : hp1) > 0) {
      const dsDmg = rand(3, 7) + Math.round(aS.speed / 18);
      if (isA) hp2 = Math.max(0, hp2 - dsDmg);
      else     hp1 = Math.max(0, hp1 - dsDmg);
      logAction(isA, 'double_strike');
    }

    // MOMENTUM
    if (isA) { momentum1++; }
    else     { momentum2++; }
    const oppGrit = isA ? s2.grit : s1.grit;
    if (isA  && momentum2 > 0 && Math.random() > oppGrit / 150) momentum2 = Math.max(0, momentum2 - 1);
    if (!isA && momentum1 > 0 && Math.random() > oppGrit / 150) momentum1 = Math.max(0, momentum1 - 1);

    // CHAOS BACKFIRE
    if (aS.chaos > 50 && Math.random() < 0.05) {
      const bfDmg = rand(3, 7);
      if (isA) hp1 = Math.max(0, hp1 - bfDmg);
      else     hp2 = Math.max(0, hp2 - bfDmg);
      logAction(isA, 'backfire');
    }

    // LUCKY SAVE
    if ((isA ? hp2 : hp1) <= 0) {
      const defLuck = isA ? s2.luck : s1.luck;
      if (Math.random() < defLuck / 2000) {
        if (isA) hp2 = 1; else hp1 = 1;
        logAction(!isA, 'lucky_save');
      }
    }

    // CROWD EVENT (simplified — no DOM effects, values match crowdEventLines)
    if (turnNum > 0 && turnNum % rand(8, 10) === 0 && Math.random() < 0.6) {
      const crowdEvents = [
        { effect: 'healBoth', value: 5 },
        { effect: 'chaosBoth', value: 5 },
        { effect: 'energyReset' },
        { effect: 'nextDouble' },
        { effect: 'healActive', value: 10 },
        { effect: 'burnBoth' },
        { effect: 'stunRandom' },
        { effect: 'debuffRandom' },
      ];
      const evt = pick(crowdEvents);
      const eff = evt.effect;
      const val = evt.value || 0;
      if (eff === 'healBoth')    { hp1 = Math.min(MAX_HP, hp1 + val); hp2 = Math.min(MAX_HP, hp2 + val); }
      if (eff === 'chaosBoth')   { s1.chaos = Math.min(99, s1.chaos + val); s2.chaos = Math.min(99, s2.chaos + val); }
      if (eff === 'energyReset') { nrg1 = 0; nrg2 = 0; }
      if (eff === 'nextDouble')  { if (isA) nextDouble1 = true; else nextDouble2 = true; }
      if (eff === 'healActive')  { if (isA) hp1 = Math.min(MAX_HP, hp1 + val); else hp2 = Math.min(MAX_HP, hp2 + val); }
      if (eff === 'burnBoth')    { burn1 = Math.max(burn1, 2); burn2 = Math.max(burn2, 2); }
      if (eff === 'stunRandom')  { if (Math.random() < 0.5) stun1 = true; else stun2 = true; }
      if (eff === 'debuffRandom') {
        const tgtS = Math.random() < 0.5 ? s1 : s2;
        const dKeys = ['power','speed','defense','focus'];
        const dk = pick(dKeys);
        tgtS[dk] = Math.max(5, tgtS[dk] - rand(5, 12));
      }
    }

    // ── SECOND WIND (stamina passive — one-time emergency heal) ──
    if (hp1 > 0 && hp1 < 20 && !secondWind1 && s1.stamina > 40) {
      const swHeal = rand(8, 15) + Math.round(s1.stamina / 5);
      hp1 = Math.min(MAX_HP, hp1 + swHeal);
      secondWind1 = true;
      logAction(true, 'second_wind');
    }
    if (hp2 > 0 && hp2 < 20 && !secondWind2 && s2.stamina > 40) {
      const swHeal = rand(8, 15) + Math.round(s2.stamina / 5);
      hp2 = Math.min(MAX_HP, hp2 + swHeal);
      secondWind2 = true;
      logAction(false, 'second_wind');
    }

    // ── ENDURE (grit passive — survive killing blow once) ──
    if (hp1 <= 0 && !endure1 && s1.grit > 45 && Math.random() < s1.grit / 200) {
      hp1 = 1;
      endure1 = true;
      logAction(true, 'endure');
    }
    if (hp2 <= 0 && !endure2 && s2.grit > 45 && Math.random() < s2.grit / 200) {
      hp2 = 1;
      endure2 = true;
      logAction(false, 'endure');
    }
  }

  const isKO = hp1 <= 0 || hp2 <= 0;
  let winnerId;
  if (hp1 <= 0 && hp2 <= 0) winnerId = Math.random() < 0.5 ? 'f1' : 'f2'; // tie-break
  else if (hp1 <= 0) winnerId = 'f2';
  else if (hp2 <= 0) winnerId = 'f1';
  else winnerId = hp1 >= hp2 ? 'f1' : 'f2'; // decision

  const winnerHp = winnerId === 'f1' ? Math.max(0, Math.round(hp1)) : Math.max(0, Math.round(hp2));

  return {
    winner: winnerId,
    winnerHp,
    turns: Math.ceil(turn / 2),
    isKO,
    actions: totalActions,
  };
}

// ─── Stat Archetypes ──────────────────────────────────────────────────────────
// Budget ≈ 620 each. Designed as a counter web — every archetype has
// 2-3 favorable and 2-3 unfavorable matchups, the rest ~50/50.
//
// COUNTER WEB:
//   Glass Cannon  →beats→ Iron Wall, Healer       →loses to→ Trickster, Wiseman
//   Iron Wall     →beats→ Berserker, Chaos Master →loses to→ Glass Cannon, Energy Hog
//   Trickster     →beats→ Glass Cannon, Speedster  →loses to→ Intimidator, Berserker
//   Berserker     →beats→ Trickster, Intimidator   →loses to→ Iron Wall, Wiseman
//   Healer        →beats→ Chaos Master, Intimidator→loses to→ Berserker, Glass Cannon
//   Speedster     →beats→ Energy Hog, Chaos Master →loses to→ Trickster, Wiseman
//   Energy Hog    →beats→ Iron Wall, Healer        →loses to→ Speedster, Berserker
//   Intimidator   →beats→ Trickster, Power Creep   →loses to→ Healer, Berserker
//   Chaos Master  →beats→ Balanced, Power Creep    →loses to→ Healer, Iron Wall
//   Wiseman       →beats→ Berserker, Glass Cannon  →loses to→ Chaos Master, Energy Hog
//   Power Creep   →beats→ Speedster, Healer        →loses to→ Intimidator, Chaos Master
//   Balanced      →beats→ nothing strongly         →loses to→ nothing strongly (reference)
const ARCHETYPES = {
  // ── ALL BUDGETS = 620 EXACTLY (verified) ──
  // Power capped at 82 to prevent multiplicative scaling dominance.
  // Dump stats raised to 35+ so every build can survive and fight back.
  'Balanced': {                                                     // =620
    power:56, speed:56, hype:57, chaos:56, luck:57,
    defense:57, focus:56, stamina:56, wit:57, grit:56, swagger:56,
  },
  'Glass Cannon': {                                                 // =620
    // Burst damage via power + chaos crits + focus specials.
    // Beats tanks (crits pierce defense) and slow builds.
    // Weak to: dodge/counter builds (Trickster, Wiseman)
    power:82, speed:72, hype:68, chaos:75, luck:50,
    defense:35, focus:65, stamina:44, wit:44, grit:35, swagger:50,
  },
  'Iron Wall (Tank)': {                                             // =620
    // Wall of defense + stamina + grit. Outlasts damage, rage-triggers often.
    // Beats: Berserker (absorbs rage), Power Creep (too tanky to burst)
    // Weak to: special spam (Energy Hog), chaos bypasses defense (Chaos Master)
    power:38, speed:35, hype:53, chaos:32, luck:60,
    defense:90, focus:50, stamina:85, wit:60, grit:82, swagger:35,
  },
  'Trickster': {                                                    // =620
    // Dodge + counter + crit machine. Punishes slow heavy hitters.
    // Beats: Glass Cannon (dodges burst, counters), Speedster (out-wits speed)
    // Weak to: Intimidator (debuffs speed/wit), Berserker (grit ignores tricks)
    power:38, speed:82, hype:55, chaos:58, luck:72,
    defense:38, focus:55, stamina:38, wit:85, grit:38, swagger:61,
  },
  'Berserker': {                                                    // =620
    // Power + grit = rage beast. Low HP rage triggers are devastating.
    // Beats: Trickster (grit powers through), Healer (burst > sustain)
    // Weak to: Iron Wall (can't break armor), Wiseman (counter-attacks punish rage)
    power:80, speed:65, hype:72, chaos:48, luck:46,
    defense:46, focus:54, stamina:48, wit:35, grit:88, swagger:38,
  },
  'Healer': {                                                       // =620
    // Stamina + luck + defense = unkillable sustain. Cleanses debuffs.
    // Beats: Chaos Master (cleanses DoT), Intimidator (sustains through debuffs)
    // Weak to: Berserker (burst > healing), Power Creep (consistent pressure)
    power:38, speed:45, hype:56, chaos:32, luck:82,
    defense:68, focus:56, stamina:88, wit:55, grit:60, swagger:40,
  },
  'Speedster': {                                                    // =620
    // Blazing speed + focus + luck. First-strike bonus, fast energy, dodgy.
    // Beats: Energy Hog (acts first, disrupts), Intimidator (too fast to debuff)
    // Weak to: Trickster (out-witted), Power Creep (matched speed, more power)
    power:48, speed:88, hype:62, chaos:55, luck:70,
    defense:38, focus:72, stamina:42, wit:59, grit:38, swagger:48,
  },
  'Energy Hog': {                                                   // =620
    // Focus + hype = special move machine. Bypasses conventional defense.
    // Beats: Iron Wall (specials ignore armor), Wiseman (overwhelms counter rhythm)
    // Weak to: Speedster (disrupted), Glass Cannon (burst-killed before specials)
    power:62, speed:45, hype:68, chaos:55, luck:51,
    defense:45, focus:88, stamina:55, wit:55, grit:48, swagger:48,
  },
  'Intimidator': {                                                  // =620
    // Swagger + hype + defense. Weakens opponents' damage output.
    // Beats: Trickster (debuffs speed/wit), Power Creep (debuffs raw power)
    // Weak to: Healer (sustains through debuffs), Speedster (too fast)
    power:48, speed:48, hype:75, chaos:42, luck:55,
    defense:55, focus:52, stamina:52, wit:53, grit:52, swagger:88,
  },
  'Chaos Master': {                                                 // =620
    // Max chaos + luck + hype. Wild crits, unpredictable damage spikes.
    // Beats: Iron Wall (chaos crits bypass defense), Power Creep (disrupts plans)
    // Weak to: Healer (cleanses chaos effects), Wiseman (reads and counters)
    power:63, speed:63, hype:76, chaos:90, luck:73,
    defense:32, focus:58, stamina:35, wit:47, grit:45, swagger:38,
  },
  'Wiseman': {                                                      // =620
    // Max wit + defense + focus. Counter-attacks punish attackers.
    // Beats: Berserker (counters rage strikes), Glass Cannon (reads and punishes burst)
    // Weak to: Energy Hog (special spam overwhelms), Chaos Master (can't predict chaos)
    power:42, speed:52, hype:48, chaos:40, luck:64,
    defense:65, focus:68, stamina:55, wit:88, grit:58, swagger:40,
  },
  'Power Creep': {                                                  // =620
    // Power + speed + grit. Reliable consistent pressure. No gimmicks.
    // Beats: Speedster (matches speed, hits harder), Healer (consistent > sustain)
    // Weak to: Intimidator (debuffs power), Iron Wall (too tanky to kill)
    power:82, speed:75, hype:63, chaos:50, luck:53,
    defense:53, focus:61, stamina:45, wit:38, grit:65, swagger:35,
  },
};

// ─── Tournament Simulation ────────────────────────────────────────────────────
function runTournament(fighters, numSims) {
  // Single-elimination bracket, repeated numSims times
  let wins = Object.fromEntries(fighters.map(f => [f.name, 0]));
  let champWins = Object.fromEntries(fighters.map(f => [f.name, 0]));

  for (let s = 0; s < numSims; s++) {
    // Shuffle fighters for bracket
    const shuffled = [...fighters].sort(() => Math.random() - 0.5);
    let round = [...shuffled];
    while (round.length > 1) {
      const next = [];
      for (let i = 0; i < round.length - 1; i += 2) {
        const result = simulateBattle(round[i], round[i + 1]);
        const winner = result.winner === 'f1' ? round[i] : round[i + 1];
        wins[winner.name]++;
        next.push(winner);
      }
      // Odd fighter gets a bye
      if (round.length % 2 === 1) next.push(round[round.length - 1]);
      round = next;
    }
    champWins[round[0].name]++;
  }

  return { wins, champWins };
}

// ─── Head-to-Head Matrix ──────────────────────────────────────────────────────
function runH2H(archetypes, numSims) {
  const names = Object.keys(archetypes);
  // [attacker][defender] = win rate
  const matrix = {};
  names.forEach(a => {
    matrix[a] = {};
    names.forEach(d => {
      if (a === d) { matrix[a][d] = 0.5; return; }
      let aWins = 0;
      for (let i = 0; i < numSims; i++) {
        const f1 = { name: a, stats: { ...archetypes[a] } };
        const f2 = { name: d, stats: { ...archetypes[d] } };
        const r = simulateBattle(f1, f2);
        if (r.winner === 'f1') aWins++;
      }
      matrix[a][d] = aWins / numSims;
    });
  });
  return matrix;
}

// ─── Stat Correlation Analysis ────────────────────────────────────────────────
function analyzeStatContribution(numSims, numFighters = 500) {
  // Generate random fighters and correlate stats with win rate
  const fighters = [];
  for (let i = 0; i < numFighters; i++) {
    const budget = 625;
    const keys = ['power','speed','hype','chaos','luck','defense','focus','stamina','wit','grit','swagger'];
    const stats = {};
    let remaining = budget;
    for (let k = 0; k < keys.length - 1; k++) {
      const v = Math.floor(Math.random() * Math.min(95, remaining - (keys.length - k - 1) * 20) + 20);
      stats[keys[k]] = clamp(v, 20, 95);
      remaining -= stats[keys[k]];
    }
    stats[keys[keys.length - 1]] = clamp(remaining, 20, 95);
    fighters.push({ name: `F${i}`, stats, wins: 0, totalBattles: 0 });
  }

  // Round-robin mini-tournament
  const sample = fighters.slice(0, Math.min(50, numFighters));
  for (let i = 0; i < sample.length; i++) {
    for (let j = i + 1; j < sample.length; j++) {
      for (let s = 0; s < 4; s++) {
        const r = simulateBattle(
          { name: sample[i].name, stats: { ...sample[i].stats } },
          { name: sample[j].name, stats: { ...sample[j].stats } },
        );
        if (r.winner === 'f1') sample[i].wins++;
        else sample[j].wins++;
        sample[i].totalBattles++;
        sample[j].totalBattles++;
      }
    }
  }

  // Pearson correlation for each stat
  const keys = ['power','speed','hype','chaos','luck','defense','focus','stamina','wit','grit','swagger'];
  const results = {};
  keys.forEach(k => {
    const xs = sample.map(f => f.stats[k]);
    const ys = sample.map(f => f.wins / f.totalBattles);
    const n  = xs.length;
    const mx = xs.reduce((a,b) => a+b, 0) / n;
    const my = ys.reduce((a,b) => a+b, 0) / n;
    const num = xs.reduce((sum, x, i) => sum + (x - mx) * (ys[i] - my), 0);
    const den = Math.sqrt(
      xs.reduce((s, x) => s + (x-mx)**2, 0) *
      ys.reduce((s, y) => s + (y-my)**2, 0)
    );
    results[k] = den === 0 ? 0 : parseFloat((num / den).toFixed(3));
  });
  return results;
}

// ─── Action Rate Analysis ─────────────────────────────────────────────────────
function analyzeActionRates(archetype, numSims = 200) {
  const totals = {};
  let totalTurns = 0;
  for (let i = 0; i < numSims; i++) {
    const opponent = { name: 'Balanced', stats: { ...ARCHETYPES['Balanced'] } };
    const fighter  = { name: archetype,  stats: { ...ARCHETYPES[archetype] } };
    const r = simulateBattle(fighter, opponent);
    totalTurns += r.turns;
    const acts = r.actions.f1;
    Object.entries(acts).forEach(([k, v]) => { totals[k] = (totals[k] || 0) + v; });
  }
  const perTurn = {};
  const avgTurns = totalTurns / numSims;
  Object.entries(totals).forEach(([k, v]) => {
    perTurn[k] = parseFloat((v / totalTurns).toFixed(3));
  });
  return { perTurn, avgTurns };
}

// ─── Random Build Generator ─────────────────────────────────────────────────
function generateRandomBuild(budget = 625) {
  const keys = ['power','speed','hype','chaos','luck','defense','focus','stamina','wit','grit','swagger'];
  const stats = {};
  let remaining = budget;
  for (let k = 0; k < keys.length - 1; k++) {
    const maxV = Math.min(95, remaining - (keys.length - k - 1) * 20);
    const v = Math.floor(Math.random() * (maxV - 20 + 1)) + 20;
    stats[keys[k]] = clamp(v, 20, 95);
    remaining -= stats[keys[k]];
  }
  stats[keys[keys.length - 1]] = clamp(remaining, 20, 95);
  return stats;
}

// ─── Progress Bar ────────────────────────────────────────────────────────────
function showProgress(label, current, total) {
  const pctVal = Math.round(current / total * 100);
  const width = 30;
  const filled = Math.round(current / total * width);
  const progressBar = '\x1b[32m' + '█'.repeat(filled) + '\x1b[0m' + '░'.repeat(width - filled);
  process.stdout.write(`\r  ${label} ${progressBar} ${pctVal}% (${current}/${total})`);
  if (current >= total) process.stdout.write('\n');
}

// ─── H2H with Progress ──────────────────────────────────────────────────────
function runH2HWithProgress(archetypes, numSims) {
  const aNames = Object.keys(archetypes);
  const matrix = {};
  const totalPairs = aNames.length * (aNames.length - 1);
  let pairsDone = 0;
  aNames.forEach(a => {
    matrix[a] = {};
    aNames.forEach(d => {
      if (a === d) { matrix[a][d] = 0.5; return; }
      let aWins = 0;
      for (let i = 0; i < numSims; i++) {
        const f1 = { name: a, stats: { ...archetypes[a] } };
        const f2 = { name: d, stats: { ...archetypes[d] } };
        const r = simulateBattle(f1, f2);
        if (r.winner === 'f1') aWins++;
      }
      matrix[a][d] = aWins / numSims;
      pairsDone++;
      showProgress('H2H:', pairsDone, totalPairs);
    });
  });
  return matrix;
}

// ─── Random Build Tournament ─────────────────────────────────────────────────
function runRandomBuildTournament(numBuilds, numSims) {
  const rFighters = [];
  for (let i = 0; i < numBuilds; i++) {
    rFighters.push({ name: `R${i}`, stats: generateRandomBuild(), wins: 0, total: 0 });
  }
  const sample = rFighters.slice(0, Math.min(30, numBuilds));
  const totalPairs = sample.length * (sample.length - 1) / 2;
  let pairsDone = 0;
  for (let i = 0; i < sample.length; i++) {
    for (let j = i + 1; j < sample.length; j++) {
      for (let s = 0; s < numSims; s++) {
        const r = simulateBattle(
          { name: sample[i].name, stats: { ...sample[i].stats } },
          { name: sample[j].name, stats: { ...sample[j].stats } },
        );
        if (r.winner === 'f1') sample[i].wins++; else sample[j].wins++;
        sample[i].total++;
        sample[j].total++;
      }
      pairsDone++;
      if (pairsDone % 10 === 0 || pairsDone === totalPairs) showProgress('Random builds:', pairsDone, totalPairs);
    }
  }
  return sample.map(f => ({ ...f, winRate: f.total > 0 ? f.wins / f.total : 0 }))
    .sort((a, b) => b.winRate - a.winRate);
}

// ─── Auto-Balance Iterator ───────────────────────────────────────────────────
function autoBalance(archetypes, maxIterations = 10, threshold = 0.60, simsPerPair = 300) {
  const balanced = {};
  Object.keys(archetypes).forEach(k => { balanced[k] = { ...archetypes[k] }; });
  const statKeys = ['power','speed','hype','chaos','luck','defense','focus','stamina','wit','grit','swagger'];

  for (let iter = 0; iter < maxIterations; iter++) {
    console.log(`\n  ── Iteration ${iter + 1}/${maxIterations} ──`);
    const iterH2H = runH2H(balanced, simsPerPair);
    const iterNames = Object.keys(balanced);

    const rates = {};
    iterNames.forEach(a => {
      const opps = iterNames.filter(n => n !== a);
      rates[a] = opps.reduce((sum, d) => sum + iterH2H[a][d], 0) / opps.length;
    });

    const sortedRates = Object.entries(rates).sort(([,a],[,b]) => b - a);
    const best = sortedRates[0];
    const worst = sortedRates[sortedRates.length - 1];
    console.log(`  Best:  ${pad(best[0], 20)} ${pct(best[1])}`);
    console.log(`  Worst: ${pad(worst[0], 20)} ${pct(worst[1])}`);
    console.log(`  Spread: ${pct(best[1] - worst[1])}`);

    if (best[1] <= threshold && worst[1] >= (1 - threshold)) {
      console.log(`  \x1b[32m✓ Balanced! All win rates within ${pct(threshold)} threshold.\x1b[0m`);
      return { archetypes: balanced, iterations: iter + 1, converged: true };
    }

    const strongNames = sortedRates.filter(([,r]) => r > threshold).map(([n]) => n);
    const weakNames = sortedRates.filter(([,r]) => r < (1 - threshold)).map(([n]) => n);

    strongNames.forEach(name => {
      const stats = balanced[name];
      const sorted = statKeys.slice().sort((a, b) => stats[b] - stats[a]);
      const amount = Math.round((rates[name] - 0.5) * 20);
      for (let i = 0; i < 2 && amount > 0; i++) {
        stats[sorted[i]] = Math.max(20, stats[sorted[i]] - Math.ceil(amount / 2));
      }
      console.log(`  \x1b[31m  Nerfed ${name}: ${sorted[0]} -${Math.ceil(amount/2)}, ${sorted[1]} -${Math.ceil(amount/2)}\x1b[0m`);
    });

    weakNames.forEach(name => {
      const stats = balanced[name];
      const sorted = statKeys.slice().sort((a, b) => stats[a] - stats[b]);
      const amount = Math.round((0.5 - rates[name]) * 20);
      for (let i = 0; i < 2 && amount > 0; i++) {
        stats[sorted[i]] = Math.min(95, stats[sorted[i]] + Math.ceil(amount / 2));
      }
      console.log(`  \x1b[32m  Buffed ${name}: ${sorted[0]} +${Math.ceil(amount/2)}, ${sorted[1]} +${Math.ceil(amount/2)}\x1b[0m`);
    });
  }

  return { archetypes: balanced, iterations: maxIterations, converged: false };
}

// ─── Formatting Helpers ─────────────────────────────────────────────────────
function pct(n) { return (n * 100).toFixed(1) + '%'; }
function bar(v, max = 1, width = 20) {
  const filled = Math.max(0, Math.min(width, Math.round((v / max) * width)));
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}
function pad(s, n) { return String(s).padEnd(n); }
function padL(s, n) { return String(s).padStart(n); }

// ─── Shared Constants & Helpers ──────────────────────────────────────────────
const STAT_KEYS = ['power','speed','hype','chaos','luck','defense','focus','stamina','wit','grit','swagger'];
const BUDGET = 620;

function randomFighter() {
  const stats = {};
  let remaining = BUDGET;
  const keys = STAT_KEYS.slice();
  // Shuffle key order for more uniform random distributions
  for (let i = keys.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [keys[i], keys[j]] = [keys[j], keys[i]];
  }
  for (let k = 0; k < keys.length - 1; k++) {
    const slotsLeft = keys.length - k - 1;
    const maxV = Math.min(95, remaining - slotsLeft * 20);
    const v = Math.floor(Math.random() * (maxV - 20 + 1)) + 20;
    stats[keys[k]] = v;
    remaining -= v;
  }
  stats[keys[keys.length - 1]] = clamp(remaining, 20, 95);
  return stats;
}

function getBucket(v) {
  if (v <= 38) return 0;
  if (v <= 56) return 1;
  if (v <= 75) return 2;
  return 3;
}

// ─── Worker Thread: run fights and report back ──────────────────────────────
if (!isMainThread) {
  const { sims } = workerData;
  const wst = {}, lst = {};
  let tw = 0;
  const bw = {}, bt = {};
  STAT_KEYS.forEach(k => { wst[k] = 0; lst[k] = 0; bw[k] = [0,0,0,0]; bt[k] = [0,0,0,0]; });

  for (let i = 0; i < sims; i++) {
    const s1 = randomFighter(), s2 = randomFighter();
    const r = simulateBattle({ name: 'A', stats: {...s1} }, { name: 'B', stats: {...s2} });
    const ws = r.winner === 'f1' ? s1 : s2;
    const ls = r.winner === 'f1' ? s2 : s1;
    STAT_KEYS.forEach(k => { wst[k] += ws[k]; lst[k] += ls[k]; });
    tw++;
    STAT_KEYS.forEach(k => {
      const wb = getBucket(ws[k]), lb = getBucket(ls[k]);
      bw[k][wb]++; bt[k][wb]++; bt[k][lb]++;
    });
  }

  parentPort.postMessage({ wst, lst, tw, bw, bt });
  process.exit(0);
}

// ─── Main Thread: spawn workers, aggregate, display ─────────────────────────
const args = process.argv.slice(2);
const SIMS = parseInt(args.find(a => a.startsWith('--sims='))?.split('=')[1] ?? '10000000', 10);
const numCPUs = os.cpus().length;

console.log('');
console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║    bsFight — Threaded Weighted Random-Build Stat Analysis    ║');
console.log('╚═══════════════════════════════════════════════════════════════╝');
console.log(`  Fights: ${SIMS.toLocaleString()}`);
console.log(`  Workers: ${numCPUs} threads`);
console.log(`  Budget: ${BUDGET} per fighter (random distribution)`);
console.log(`  Method: winner's stats added as weighted points`);
console.log('');
console.log('━━━  RUNNING SIMULATION  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const startTime = Date.now();
const simsPerWorker = Math.ceil(SIMS / numCPUs);

// Aggregate accumulators
const winnerStatTotals = {};
const loserStatTotals = {};
let totalWins = 0;
const bucketWins = {};
const bucketTotal = {};
STAT_KEYS.forEach(k => {
  winnerStatTotals[k] = 0;
  loserStatTotals[k] = 0;
  bucketWins[k] = [0, 0, 0, 0];
  bucketTotal[k] = [0, 0, 0, 0];
});

let workersComplete = 0;
const workerPromises = [];

for (let w = 0; w < numCPUs; w++) {
  const wSims = w < numCPUs - 1 ? simsPerWorker : SIMS - simsPerWorker * (numCPUs - 1);
  workerPromises.push(new Promise((resolve, reject) => {
    const worker = new Worker(__filename, { workerData: { sims: wSims } });
    worker.on('message', (msg) => {
      STAT_KEYS.forEach(k => {
        winnerStatTotals[k] += msg.wst[k];
        loserStatTotals[k] += msg.lst[k];
        for (let b = 0; b < 4; b++) {
          bucketWins[k][b] += msg.bw[k][b];
          bucketTotal[k][b] += msg.bt[k][b];
        }
      });
      totalWins += msg.tw;
      workersComplete++;
      showProgress('Workers:', workersComplete, numCPUs);
    });
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) reject(new Error(`Worker exited with code ${code}`));
      else resolve();
    });
  }));
}

Promise.all(workerPromises).then(() => {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`  Completed in ${elapsed}s (${Math.round(SIMS / ((Date.now() - startTime) / 1000)).toLocaleString()} fights/sec)\n`);

  // ── 1. Average Stat Value: Winners vs Losers ──
  console.log('━━━  WINNER vs LOSER STAT AVERAGES  ━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  (higher = stat helps you win, lower = stat hurts)\n');

  const statEdges = STAT_KEYS.map(k => {
    const avgWin = winnerStatTotals[k] / totalWins;
    const avgLose = loserStatTotals[k] / totalWins;
    const edge = avgWin - avgLose;
    return { stat: k, avgWin, avgLose, edge };
  }).sort((a, b) => b.edge - a.edge);

  const maxEdge = Math.max(...statEdges.map(e => Math.abs(e.edge)));
  statEdges.forEach(e => {
    const col = e.edge > 0.5 ? '\x1b[32m' : e.edge < -0.5 ? '\x1b[31m' : '\x1b[33m';
    const sign = e.edge > 0 ? '+' : '';
    console.log(`  ${col}${pad(e.stat, 12)}\x1b[0m  Win avg: ${e.avgWin.toFixed(1)}  Lose avg: ${e.avgLose.toFixed(1)}  Edge: ${col}${sign}${e.edge.toFixed(2)}\x1b[0m  ${bar(Math.abs(e.edge), maxEdge)}`);
  });

  // ── 2. Weighted Stat Value ──
  console.log('');
  console.log('━━━  STAT VALUE (weighted points from winners)  ━━━━━━━━━━━━━━');
  console.log('  (normalized: highest stat = 100)\n');

  const rawWeights = {};
  STAT_KEYS.forEach(k => { rawWeights[k] = winnerStatTotals[k]; });
  const maxWeight = Math.max(...Object.values(rawWeights));
  const normalizedWeights = {};
  STAT_KEYS.forEach(k => { normalizedWeights[k] = (rawWeights[k] / maxWeight) * 100; });

  const weightsSorted = STAT_KEYS.slice().sort((a, b) => normalizedWeights[b] - normalizedWeights[a]);
  weightsSorted.forEach((k, i) => {
    const v = normalizedWeights[k];
    const col = i < 3 ? '\x1b[32m' : i >= STAT_KEYS.length - 3 ? '\x1b[31m' : '\x1b[0m';
    console.log(`  ${col}${pad(k, 12)}\x1b[0m ${bar(v, 100)} ${v.toFixed(1)}`);
  });

  // ── 3. Stat Bucket Win Rates ──
  console.log('');
  console.log('━━━  STAT BUCKET WIN RATES  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  (win rate when stat is in each range — shows nonlinear effects)\n');
  console.log(`  ${pad('Stat', 12)}  ${padL('20-38', 8)}  ${padL('39-56', 8)}  ${padL('57-75', 8)}  ${padL('76-95', 8)}  ${padL('Spread', 8)}`);
  console.log('  ' + '─'.repeat(60));

  const bucketSpreads = STAT_KEYS.map(k => {
    const rates = bucketWins[k].map((w, i) => bucketTotal[k][i] > 0 ? w / bucketTotal[k][i] : 0);
    const spread = rates[3] - rates[0];
    return { stat: k, rates, spread };
  }).sort((a, b) => b.spread - a.spread);

  bucketSpreads.forEach(e => {
    const col = e.spread > 0.05 ? '\x1b[32m' : e.spread < -0.05 ? '\x1b[31m' : '\x1b[33m';
    const rateStrs = e.rates.map(r => {
      const p = (r * 100).toFixed(1) + '%';
      const c = r > 0.52 ? '\x1b[32m' : r < 0.48 ? '\x1b[31m' : '\x1b[0m';
      return `${c}${padL(p, 8)}\x1b[0m`;
    });
    const spreadStr = `${col}${e.spread > 0 ? '+' : ''}${(e.spread * 100).toFixed(1)}%\x1b[0m`;
    console.log(`  ${pad(e.stat, 12)}  ${rateStrs.join('  ')}  ${padL(spreadStr, 8)}`);
  });

  // ── 4. Ideal Stat Distribution ──
  console.log('');
  console.log('━━━  IDEAL STAT DISTRIBUTION (from weighted averages)  ━━━━━━━');
  console.log('  (what a "perfect" build looks like based on winner data)\n');

  const totalEdge = statEdges.reduce((sum, e) => sum + Math.max(0, e.edge), 0);
  const idealBuild = {};
  let idealTotal = 0;
  statEdges.forEach(e => {
    const weight = Math.max(0, e.edge) / totalEdge;
    idealBuild[e.stat] = Math.round(20 + weight * (BUDGET - 20 * STAT_KEYS.length));
    idealTotal += idealBuild[e.stat];
  });
  const idealKeys = Object.keys(idealBuild).sort((a, b) => idealBuild[b] - idealBuild[a]);
  let diff = BUDGET - idealTotal;
  for (let i = 0; diff !== 0; i = (i + 1) % idealKeys.length) {
    if (diff > 0) { idealBuild[idealKeys[i]]++; diff--; }
    else { idealBuild[idealKeys[i]]--; diff++; }
  }

  console.log('  Stat distribution optimized for winning:');
  idealKeys.forEach(k => {
    console.log(`    ${pad(k, 12)} ${idealBuild[k]}`);
  });
  console.log(`    ${'─'.repeat(20)}`);
  console.log(`    ${pad('TOTAL', 12)} ${Object.values(idealBuild).reduce((a,b) => a+b, 0)}`);

  // ── Summary ──
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Done. ${SIMS.toLocaleString()} random fights analyzed across ${numCPUs} threads.`);
  console.log('  Usage: node scripts/simulate.js [--sims=N]');
  console.log('');
}).catch(err => {
  console.error('Simulation error:', err);
  process.exit(1);
});
