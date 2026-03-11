import {
  rand,
  pick,
  MAX_HP,
  MAX_NRG,
  TURN_DELAY,
  atkNames,
  specialNames,
  critLines,
  dodgeLines,
  crowdLines,
  healLines,
  poisonLines,
  counterLines,
  buffLines,
  stunLines,
  lifestealLines,
  shieldLines,
  rageLines,
  reflectLines,
  burnLines,
  doubleStrikeLines,
  getEmoji,
} from "./helpers";
import { playSound } from "./soundEngine";

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function spawnParticles(container, x, y, color, count = 8) {
  if (!container) return;
  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    p.className = "particle";
    const sz = rand(4, 12);
    p.style.cssText = `width:${sz}px;height:${sz}px;background:${color};left:${x}px;top:${y}px;--px:${rand(-80, 80)}px;--py:${rand(-80, 80)}px;`;
    container.appendChild(p);
    setTimeout(() => p.remove(), 800);
  }
}

function spawnTextParticle(container, x, y, text, color = "#facc15") {
  if (!container) return;
  const p = document.createElement("div");
  p.className = "text-particle";
  p.textContent = text;
  p.style.cssText = `left:${x}px;top:${y}px;color:${color};`;
  container.appendChild(p);
  setTimeout(() => p.remove(), 1200);
}

function showPopup(el, text, cls = "") {
  if (!el) return;
  const d = document.createElement("div");
  d.className = "dmg-popup " + cls;
  d.textContent = text;
  d.style.left = rand(15, 65) + "%";
  d.style.top = rand(5, 25) + "%";
  el.appendChild(d);
  setTimeout(() => d.remove(), 800);
}

function setStatus(el, icon) {
  if (!el) return;
  el.querySelectorAll(".status-icon").forEach((s) => s.remove());
  if (!icon) return;
  const s = document.createElement("div");
  s.className = "status-icon";
  s.textContent = icon;
  el.appendChild(s);
}

function applyAnim(el, cls, dur = 400) {
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), dur);
}

function screenShake(mainEl, big = false) {
  if (!mainEl) return;
  mainEl.classList.remove("screen-shake", "screen-big-shake");
  void mainEl.offsetWidth;
  mainEl.classList.add(big ? "screen-big-shake" : "screen-shake");
  setTimeout(
    () => mainEl.classList.remove("screen-shake", "screen-big-shake"),
    500,
  );
}

function triggerFlash(flashEl, color = "red") {
  if (!flashEl) return;
  flashEl.className = `flash-overlay flash-${color} active`;
  setTimeout(() => {
    flashEl.className = "flash-overlay";
  }, 180);
}

function clearBanners(stage) {
  if (stage) {
    stage.innerHTML = "";
    stage.classList.remove("major-event");
  }
}

function setBannerZone(stage, zone, text, type = "") {
  if (!stage) return;
  const dir = zone === "a" ? "from-a" : zone === "b" ? "from-b" : "from-center";
  // For center zone events (impacts, KO), clear previous cards
  if (zone === "center") {
    stage.innerHTML = "";
  }
  const card = document.createElement("div");
  card.className = `banner-card ${dir}` + (type ? ` action-${type}` : "");
  card.innerHTML = text;
  stage.prepend(card);
  // Fade & shrink older cards, keep max 4
  const cards = stage.querySelectorAll(".banner-card");
  for (let i = 0; i < cards.length; i++) {
    cards[i].style.opacity = Math.max(0.1, 1 - i * 0.3);
    cards[i].style.transform = `scale(${Math.max(0.75, 1 - i * 0.07)})`;
  }
  if (cards.length > 4) {
    for (let i = 4; i < cards.length; i++) cards[i].remove();
  }
}

function setActiveTurn(aEl, dEl, label = "⚔️ ATTACKING") {
  if (aEl) {
    aEl.classList.add("active-turn");
    let tag = aEl.querySelector(".turn-tag");
    if (!tag) {
      tag = document.createElement("div");
      tag.className = "turn-tag";
      aEl.prepend(tag);
    }
    tag.textContent = label;
    tag.className = "turn-tag turn-tag-atk";
    // Re-trigger pop animation
    tag.style.animation = "none";
    void tag.offsetWidth;
    tag.style.animation = "";
  }
  if (dEl) {
    dEl.classList.remove("active-turn");
    const tag = dEl.querySelector(".turn-tag");
    if (tag) tag.remove();
  }
}

function updateTurnLabel(el, label) {
  if (!el) return;
  const tag = el.querySelector(".turn-tag");
  if (tag) {
    tag.textContent = label;
    tag.style.animation = "none";
    void tag.offsetWidth;
    tag.style.animation = "";
  }
}

function swapActiveTurn(aEl, dEl, label = "↩️ COUNTERING") {
  if (dEl) {
    dEl.classList.add("active-turn");
    let tag = dEl.querySelector(".turn-tag");
    if (!tag) {
      tag = document.createElement("div");
      tag.className = "turn-tag";
      dEl.prepend(tag);
    }
    tag.textContent = label;
    tag.className = "turn-tag turn-tag-def";
  }
  if (aEl) {
    aEl.classList.remove("active-turn");
    const tag = aEl.querySelector(".turn-tag");
    if (tag) tag.remove();
  }
}

function clearActiveTurn(aEl, dEl) {
  if (aEl) {
    aEl.classList.remove("active-turn");
    const tag = aEl.querySelector(".turn-tag");
    if (tag) tag.remove();
  }
  if (dEl) {
    dEl.classList.remove("active-turn");
    const tag = dEl.querySelector(".turn-tag");
    if (tag) tag.remove();
  }
}

function getElCenter(el, wrapperEl) {
  if (!el || !wrapperEl) return { x: 0, y: 0 };
  const r = el.getBoundingClientRect();
  const w = wrapperEl.getBoundingClientRect();
  return { x: r.left - w.left + r.width / 2, y: r.top - w.top + r.height / 3 };
}

function updateHpBar(barEl, textEl, hp, mx) {
  if (!barEl) return;
  const p = Math.max(0, Math.round((hp / mx) * 100));
  barEl.style.width = p + "%";
  barEl.classList.remove("medium", "low");
  if (p <= 25) barEl.classList.add("low");
  else if (p <= 55) barEl.classList.add("medium");
  if (textEl) textEl.textContent = `${Math.max(0, Math.round(hp))}/${mx}`;
}

function updateNrgBar(barEl, textEl, nrg) {
  if (!barEl) return;
  const p = Math.max(0, Math.min(100, Math.round(nrg)));
  barEl.style.width = p + "%";
  if (textEl) textEl.textContent = `${p}/${MAX_NRG}`;
}

function renderStatBars(el, stats) {
  if (!el) return;
  const items = [
    { k: "power", label: "Power", v: stats.power },
    { k: "speed", label: "Speed", v: stats.speed },
    { k: "hype", label: "Hype", v: stats.hype },
    { k: "chaos", label: "Chaos", v: stats.chaos },
    { k: "luck", label: "Luck", v: stats.luck },
    { k: "defense", label: "Defns", v: stats.defense },
    { k: "focus", label: "Focus", v: stats.focus },
    { k: "stamina", label: "Stmna", v: stats.stamina },
  ];
  el.innerHTML = items
    .map(
      (i) =>
        `<div style="display:flex;align-items:center;gap:6px;font-size:0.65rem;">
      <span style="width:42px;color:var(--muted);font-weight:700;letter-spacing:0.5px;text-transform:uppercase;font-family:var(--font-display);">${i.label}</span>
      <div style="flex:1;height:4px;background:rgba(0,0,0,.4);border-radius:2px;overflow:hidden;">
        <div class="stat-bar-fill ${i.k}" style="width:0%;height:100%;"></div>
      </div>
      <span style="width:24px;text-align:center;color:var(--muted);font-weight:700;font-family:var(--font-display);">${i.v}</span>
    </div>`,
    )
    .join("");
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      el.querySelectorAll(".stat-bar-fill").forEach(
        (b, idx) => (b.style.width = items[idx].v + "%"),
      );
    }),
  );
}

function addLog(bodyEl, icon, text, cls = "") {
  if (!bodyEl) return;
  const e = document.createElement("div");
  e.className = "log-entry " + (cls || "");
  e.innerHTML = `<span class="shrink-0 w-5 text-center">${icon}</span><span class="flex-1">${text}</span>`;
  bodyEl.appendChild(e);
  bodyEl.scrollTop = bodyEl.scrollHeight;
}

export async function runCountdown(overlayEl, numberEl, subEl, n1, n2) {
  if (!overlayEl) return;
  overlayEl.classList.add("active");
  subEl.textContent = `${n1} vs ${n2}`;
  playSound("countdown");
  for (const n of ["3", "2", "1", "FIGHT!"]) {
    numberEl.textContent = n;
    numberEl.style.animation = "none";
    void numberEl.offsetWidth;
    numberEl.style.animation = "cpop 0.6s ease";
    numberEl.style.color = n === "FIGHT!" ? "var(--danger)" : "var(--gold)";
    numberEl.style.textShadow =
      n === "FIGHT!"
        ? "0 0 100px rgba(255,51,51,.7)"
        : "0 0 80px rgba(255,215,0,.5)";
    await delay(700);
  }
  await delay(400);
  overlayEl.classList.remove("active");
}

function hpStatusText(hp) {
  if (hp <= 0) return "💀 KO!";
  if (hp <= 15) return "🔴 Critical...";
  if (hp <= 30) return "🟠 Badly Hurt";
  if (hp <= 50) return "🟡 Wounded";
  if (hp <= 75) return "🟢 OK";
  return "💚 Full Power";
}

function logHpStatus(bodyEl, f1Name, hp1, f2Name, hp2) {
  addLog(
    bodyEl,
    "📋",
    `<b>${f1Name}</b> ${hpStatusText(hp1)} (${Math.max(0, Math.round(hp1))} HP) │ <b>${f2Name}</b> ${hpStatusText(hp2)} (${Math.max(0, Math.round(hp2))} HP)`,
    "crowd",
  );
}

export async function animatedFight(f1, f2, refs, onEvent) {
  const emit = onEvent || (() => {});
  const {
    fighterA,
    fighterB,
    hpBarA,
    hpBarB,
    hpTextA,
    hpTextB,
    nrgBarA,
    nrgBarB,
    nrgTextA,
    nrgTextB,
    statsA,
    statsB,
    vsText,
    arenaWrapper,
    particleContainer,
    battleLogBody,
    turnCounter,
    mainContainer,
    countdownOverlay,
    countdownNumber,
    countdownSub,
    bannerStage,
    buffsBarA,
    buffsBarB,
    flashOverlay,
    vignetteOverlay,
  } = refs;

  // Wrapper for setBannerZone on the single banner stage
  function banner(zone, text, type = "") {
    setBannerZone(bannerStage, zone, text, type);
  }

  // Helper: dramatic pause for major events (crit, special, KO)
  function startMajorEvent() {
    if (bannerStage) bannerStage.classList.add("major-event");
    if (vignetteOverlay) vignetteOverlay.classList.add("active");
  }
  function endMajorEvent() {
    if (bannerStage) bannerStage.classList.remove("major-event");
    if (vignetteOverlay) vignetteOverlay.classList.remove("active");
  }

  // Update the buff/status indicator bar on a fighter card
  function updateBuffBars() {
    const makeIcons = (poison, stun, shield, rage, reflect, burn) => {
      let html = "";
      if (shield > 0) html += `<span class="buff-icon buff-shield">🛡️ ${shield}</span>`;
      if (rage > 0) html += `<span class="buff-icon buff-rage">🔥 ${rage}t</span>`;
      if (reflect > 0) html += `<span class="buff-icon buff-reflect">🪞 ${reflect}t</span>`;
      if (poison > 0) html += `<span class="buff-icon buff-poison">☠️ ${poison}t</span>`;
      if (burn > 0) html += `<span class="buff-icon buff-burn">🔥 ${burn}t</span>`;
      if (stun) html += `<span class="buff-icon buff-stun">😵 STUN</span>`;
      return html;
    };
    if (buffsBarA) buffsBarA.innerHTML = makeIcons(poison1, stun1, shield1, rage1, reflect1, burn1);
    if (buffsBarB) buffsBarB.innerHTML = makeIcons(poison2, stun2, shield2, rage2, reflect2, burn2);
  }

  const s1 = { ...f1.stats },
    s2 = { ...f2.stats };
  let hp1 = MAX_HP,
    hp2 = MAX_HP,
    nrg1 = 0,
    nrg2 = 0;
  let poison1 = 0,
    poison2 = 0,
    combo1 = 0,
    combo2 = 0;
  let stun1 = false,
    stun2 = false;
  let shield1 = 0,
    shield2 = 0;
  let rage1 = 0,
    rage2 = 0;
  let reflect1 = 0,
    reflect2 = 0;
  let burn1 = 0,
    burn2 = 0;
  const maxTurns = rand(8, 15);
  let turn = 0;

  battleLogBody.innerHTML = "";
  addLog(battleLogBody, "🔔", `<b>═══════ NEW BATTLE! ═══════</b>`, "crowd");
  addLog(
    battleLogBody,
    "🆚",
    `<b>${f1.name}</b> ${getEmoji(f1.name)} vs <b>${f2.name}</b> ${getEmoji(f2.name)}`,
    "crowd",
  );
  await delay(300);
  addLog(
    battleLogBody,
    "📊",
    `<b>${f1.name}</b>: 💪${s1.power} ⚡${s1.speed} 🛡${s1.defense} 🎲${s1.luck} 🌀${s1.chaos} 🔥${s1.hype} 🎯${s1.focus} 🏋${s1.stamina}`,
    "crowd",
  );
  addLog(
    battleLogBody,
    "📊",
    `<b>${f2.name}</b>: 💪${s2.power} ⚡${s2.speed} 🛡${s2.defense} 🎲${s2.luck} 🌀${s2.chaos} 🔥${s2.hype} 🎯${s2.focus} 🏋${s2.stamina}`,
    "crowd",
  );
  addLog(
    battleLogBody,
    "📋",
    `Both fighters start with ${MAX_HP} HP. Let the battle begin!`,
    "crowd",
  );
  turnCounter.textContent = "Turn 0";
  setStatus(fighterA, null);
  setStatus(fighterB, null);
  arenaWrapper.classList.remove("intense");
  banner(
    "center",
    `${getEmoji(f1.name)} ${f1.name} &nbsp;⚔️&nbsp; ${f2.name} ${getEmoji(f2.name)}`,
  );
  playSound("battleStart");

  await runCountdown(
    countdownOverlay,
    countdownNumber,
    countdownSub,
    f1.name,
    f2.name,
  );
  vsText.classList.add("fire");
  emit({
    event: "matchStart",
    f1: { name: f1.name, emoji: f1.emoji },
    f2: { name: f2.name, emoji: f2.emoji },
    hp1: MAX_HP,
    hp2: MAX_HP,
  });

  while (hp1 > 0 && hp2 > 0 && turn < maxTurns * 2) {
    turn++;
    const turnNum = Math.ceil(turn / 2);
    turnCounter.textContent = `Turn ${turnNum}`;
    const isA = turn % 2 === 1;
    const atk = isA ? f1 : f2,
      def = isA ? f2 : f1;
    const aS = isA ? s1 : s2,
      dS = isA ? s2 : s1;
    const aEl = isA ? fighterA : fighterB,
      dEl = isA ? fighterB : fighterA;

    // Turn announcement
    setActiveTurn(aEl, dEl);
    playSound("turnStart");
    addLog(
      battleLogBody,
      "🎬",
      `<b>── Turn ${turnNum} │ ${atk.name} attacks ──</b>`,
      "crowd",
    );
    updateBuffBars();
    await delay(500);

    // STUN CHECK — skip turn if stunned
    const amIStunned = isA ? stun1 : stun2;
    if (amIStunned) {
      updateTurnLabel(aEl, "😵 STUNNED");
      if (isA) stun1 = false;
      else stun2 = false;
      aEl.classList.remove("stunned");
      banner(
        isA ? "a" : "b",
        `😵 Still stunned... <b>[skip]</b>`,
        "stun",
      );
      playSound("stunSkip");
      addLog(
        battleLogBody,
        "😵",
        `${atk.name} is still dazed and can't move! Turn skipped.`,
        "stun",
      );
      applyAnim(aEl, "stun-zap", 600);
      if (isA) combo1 = 0;
      else combo2 = 0;
      updateBuffBars();
      await delay(TURN_DELAY);
      continue;
    }

    // Rage tick — decrement rage counter
    const myRage = isA ? rage1 : rage2;
    if (myRage > 0) {
      if (isA) rage1--;
      else rage2--;
      if ((isA ? rage1 : rage2) <= 0) {
        aEl.classList.remove("enraged");
        setStatus(aEl, null);
        addLog(battleLogBody, "🧊", `${atk.name}'s rage has faded.`, "crowd");
      }
    }

    // Reflect tick
    const myReflect = isA ? reflect1 : reflect2;
    if (myReflect > 0) {
      if (isA) reflect1--;
      else reflect2--;
      if ((isA ? reflect1 : reflect2) <= 0) {
        addLog(battleLogBody, "🪞", `${atk.name}'s reflect faded.`, "crowd");
      }
    }

    if (hp1 <= 35 || hp2 <= 35) arenaWrapper.classList.add("intense");

    // Poison tick
    const myPoison = isA ? poison1 : poison2;
    if (myPoison > 0) {
      const pd = rand(3, 6);
      if (isA) {
        hp1 = Math.max(0, hp1 - pd);
        poison1--;
        updateHpBar(hpBarA, hpTextA, hp1, MAX_HP);
      } else {
        hp2 = Math.max(0, hp2 - pd);
        poison2--;
        updateHpBar(hpBarB, hpTextB, hp2, MAX_HP);
      }
      applyAnim(aEl, "poison-pulse", 500);
      banner(
        isA ? "a" : "b",
        `☠️ Poison tick <b>[-${pd}hp]</b>`,
        "poison",
      );
      playSound("poisonTick");
      addLog(
        battleLogBody,
        "☠️",
        `${atk.name} takes <b>${pd}</b> poison damage! (${isA ? poison1 : poison2} turns left)`,
        "poison",
      );
      if ((isA ? hp1 : hp2) <= 0) break;
      await delay(500);
    }

    // Burn tick — damage increases each tick
    const myBurn = isA ? burn1 : burn2;
    if (myBurn > 0) {
      const bd = rand(2, 5) + (3 - myBurn); // increases as turns decrease
      if (isA) {
        hp1 = Math.max(0, hp1 - bd);
        burn1--;
        updateHpBar(hpBarA, hpTextA, hp1, MAX_HP);
        if (burn1 <= 0) aEl.classList.remove("burning");
      } else {
        hp2 = Math.max(0, hp2 - bd);
        burn2--;
        updateHpBar(hpBarB, hpTextB, hp2, MAX_HP);
        if (burn2 <= 0) aEl.classList.remove("burning");
      }
      applyAnim(aEl, "burn-pulse", 500);
      playSound("burnTick");
      banner(
        isA ? "a" : "b",
        `🔥 Burn tick <b>[-${bd}hp]</b>`,
        "burn",
      );
      addLog(
        battleLogBody,
        "🔥",
        `${atk.name} takes <b>${bd}</b> burn damage! (${isA ? burn1 : burn2} turns left)`,
        "burn",
      );
      if ((isA ? hp1 : hp2) <= 0) break;
      await delay(400);
    }

    // Energy gain (focus boosts energy)
    const focusBonus = Math.round((isA ? s1.focus : s2.focus) / 15);
    const nrgGain = rand(12, 22) + focusBonus;
    if (isA) {
      nrg1 = Math.min(MAX_NRG, nrg1 + nrgGain);
      updateNrgBar(nrgBarA, nrgTextA, nrg1);
    } else {
      nrg2 = Math.min(MAX_NRG, nrg2 + nrgGain);
      updateNrgBar(nrgBarB, nrgTextB, nrg2);
    }

    const roll = Math.random() * 100;
    const myNrg = isA ? nrg1 : nrg2;
    const myHp = isA ? hp1 : hp2;

    // SPECIAL MOVE
    if (myNrg >= 60 && roll < 20 + aS.focus / 20) {
      updateTurnLabel(aEl, "⚡ SPECIAL MOVE");
      if (isA) nrg1 -= 60;
      else nrg2 -= 60;
      updateNrgBar(
        isA ? nrgBarA : nrgBarB,
        isA ? nrgTextA : nrgTextB,
        isA ? nrg1 : nrg2,
      );
      const rawDmg = rand(20, 32) + aS.power / 7;
      const dmg = Math.round(Math.max(5, rawDmg - dS.defense / 10));
      banner(
        isA ? "a" : "b",
        `⚡ Charging energy...`,
        "special",
      );
      playSound("specialCharge");
      addLog(
        battleLogBody,
        "⚡",
        `${atk.name} is charging energy...`,
        "special",
      );
      await delay(600);
      playSound("specialMove");
      const spName = pick(specialNames);
      banner(
        isA ? "a" : "b",
        `⭐ ${spName} <b>[-${dmg}hp]</b>`,
        "special",
      );
      addLog(
        battleLogBody,
        "⭐",
        `<b>${atk.name} unleashes ${spName}!</b>`,
        "special",
      );
      applyAnim(aEl, isA ? "satk-r" : "satk-l", 500);
      await delay(450);
      applyAnim(dEl, "big-shake", 500);
      applyAnim(dEl, "hit-flash", 300);
      showPopup(dEl, "-" + dmg + " ⭐", "special-pop");
      const c = getElCenter(dEl, arenaWrapper);
      spawnParticles(particleContainer, c.x, c.y, "#ffd700", 24);
      triggerFlash(flashOverlay, "gold");
      playSound("specialImpact");
      spawnTextParticle(
        particleContainer,
        c.x + rand(-30, 30),
        c.y + rand(-20, 20),
        "SPECIAL!",
        "#fde68a",
      );
      screenShake(mainContainer, true);
      await delay(350);
      if (isA) {
        hp2 = Math.max(0, hp2 - dmg);
        updateHpBar(hpBarB, hpTextB, hp2, MAX_HP);
      } else {
        hp1 = Math.max(0, hp1 - dmg);
        updateHpBar(hpBarA, hpTextA, hp1, MAX_HP);
      }
      banner(
        "center",
        `💫 ${def.name} <b>[-${dmg}hp dmg]</b> — SPECIAL!`,
        "special",
      );
      startMajorEvent();
      addLog(
        battleLogBody,
        "💫",
        `${def.name} took <b>${dmg}</b> special damage!`,
        "special",
      );
      if (isA) combo1 = 0;
      else combo2 = 0;
      await delay(600);
      endMajorEvent();
      if (Math.random() < 0.5)
        addLog(battleLogBody, "📢", pick(crowdLines), "crowd");
      logHpStatus(battleLogBody, f1.name, hp1, f2.name, hp2);
      await delay(TURN_DELAY);
      continue;
    }

    // HEAL
    if (myHp < 50 && roll < 22 + aS.luck / 6) {
      updateTurnLabel(aEl, "💚 HEALING");
      const staminaBonus = Math.round(aS.stamina / 12);
      const heal = rand(10, 20) + staminaBonus;
      banner(
        isA ? "a" : "b",
        `🧘 Taking a breather...`,
        "heal",
      );
      playSound("heal");
      addLog(battleLogBody, "🧘", `${atk.name} takes a breather...`, "heal");
      await delay(500);
      if (isA) {
        hp1 = Math.min(MAX_HP, hp1 + heal);
        updateHpBar(hpBarA, hpTextA, hp1, MAX_HP);
      } else {
        hp2 = Math.min(MAX_HP, hp2 + heal);
        updateHpBar(hpBarB, hpTextB, hp2, MAX_HP);
      }
      applyAnim(aEl, "heal-glow", 600);
      showPopup(aEl, "+" + heal + " HP", "heal-pop");
      const c = getElCenter(aEl, arenaWrapper);
      spawnParticles(particleContainer, c.x, c.y, "#39ff14", 12);
      banner(
        isA ? "a" : "b",
        `💚 ${pick(healLines)} <b>[+${heal}hp heal]</b>`,
        "heal",
      );
      addLog(
        battleLogBody,
        "💚",
        `${atk.name} ${pick(healLines)} <b>+${heal} HP</b> (now ${Math.round(
          isA ? hp1 : hp2,
        )} HP)`,
        "heal",
      );
      if (isA) combo1 = 0;
      else combo2 = 0;
      await delay(TURN_DELAY);
      continue;
    }

    // BUFF
    if (roll > 88 && aS.hype > 35) {
      updateTurnLabel(aEl, "✨ POWERING UP");
      banner(
        isA ? "a" : "b",
        `🔋 Powering up...`,
        "buff",
      );
      playSound("buff");
      addLog(
        battleLogBody,
        "🔋",
        `${atk.name} focuses and powers up...`,
        "buff",
      );
      await delay(500);
      applyAnim(aEl, "buff-glow", 600);
      const bStat = pick(["power", "speed", "chaos", "focus", "stamina"]);
      const bAmt = rand(5, 14);
      aS[bStat] = Math.min(99, aS[bStat] + bAmt);
      renderStatBars(isA ? statsA : statsB, aS);
      setStatus(aEl, "💪");
      const label = { power: "Power", speed: "Speed", chaos: "Chaos", focus: "Focus", stamina: "Stamina" }[bStat];
      banner(
        isA ? "a" : "b",
        `✨ ${pick(buffLines)} <b>[${label} +${bAmt}]</b>`,
        "buff",
      );
      addLog(
        battleLogBody,
        "✨",
        `${atk.name} ${pick(buffLines)} — ${label} <b>+${bAmt}</b>! (now ${aS[bStat]})`,
        "buff",
      );
      if (isA) combo1 = 0;
      else combo2 = 0;
      await delay(TURN_DELAY);
      continue;
    }

    // SHIELD
    const myShield = isA ? shield1 : shield2;
    if (roll > 84 && aS.defense > 35 && myShield === 0) {
      updateTurnLabel(aEl, "🛡️ SHIELDING");
      const shieldHp = rand(10, 20) + Math.round(aS.stamina / 6);
      banner(
        isA ? "a" : "b",
        `🛡️ Raising defenses...`,
        "shield",
      );
      playSound("shield");
      addLog(
        battleLogBody,
        "🛡️",
        `${atk.name} ${pick(shieldLines)}...`,
        "shield",
      );
      await delay(500);
      applyAnim(aEl, "shield-glow", 600);
      aEl.classList.add("shielded");
      if (isA) shield1 = shieldHp;
      else shield2 = shieldHp;
      setStatus(aEl, "🛡️");
      banner(
        isA ? "a" : "b",
        `🛡️ ${pick(shieldLines)} <b>[${shieldHp}hp shield]</b>`,
        "shield",
      );
      addLog(
        battleLogBody,
        "🛡️",
        `${atk.name} gained a <b>${shieldHp} HP</b> shield!`,
        "shield",
      );
      if (isA) combo1 = 0;
      else combo2 = 0;
      await delay(TURN_DELAY);
      continue;
    }

    // STUN ATTACK
    const defStunned = isA ? stun2 : stun1;
    if (roll > 78 && aS.chaos > 45 && !defStunned) {
      updateTurnLabel(aEl, "⚡ STUNNING");
      banner(
        isA ? "a" : "b",
        `⚡ Preparing disruption...`,
        "stun",
      );
      playSound("stun");
      addLog(
        battleLogBody,
        "⚡",
        `${atk.name} ${pick(stunLines)}...`,
        "stun",
      );
      await delay(500);
      applyAnim(aEl, isA ? "atk-r" : "atk-l", 350);
      await delay(350);
      applyAnim(dEl, "stun-zap", 600);
      triggerFlash(flashOverlay, "gold");
      const c = getElCenter(dEl, arenaWrapper);
      spawnParticles(particleContainer, c.x, c.y, "#fbbf24", 14);
      spawnTextParticle(particleContainer, c.x, c.y - 20, "STUNNED!", "#fbbf24");
      if (isA) stun2 = true;
      else stun1 = true;
      dEl.classList.add("stunned");
      setStatus(dEl, "😵");
      banner(
        isA ? "a" : "b",
        `😵 ${pick(stunLines)} <b>[stunned!]</b>`,
        "stun",
      );
      addLog(
        battleLogBody,
        "😵",
        `${def.name} is <b>STUNNED</b>! They'll skip their next turn!`,
        "stun",
      );
      if (isA) combo1 = 0;
      else combo2 = 0;
      await delay(TURN_DELAY);
      continue;
    }

    // LIFESTEAL
    if (roll > 70 && roll <= 78 && aS.hype > 30 && myHp < 75) {
      updateTurnLabel(aEl, "🩸 DRAINING");
      const lsDmg = rand(6, 13) + Math.round(aS.hype / 10);
      const lsHeal = Math.round(lsDmg * 0.5);
      banner(
        isA ? "a" : "b",
        `🩸 Going for the drain...`,
        "lifesteal",
      );
      playSound("lifesteal");
      addLog(
        battleLogBody,
        "🩸",
        `${atk.name} ${pick(lifestealLines)}...`,
        "lifesteal",
      );
      await delay(500);
      applyAnim(aEl, isA ? "atk-r" : "atk-l", 350);
      await delay(350);
      applyAnim(dEl, "lifesteal-drain", 500);
      showPopup(dEl, "-" + lsDmg + " 🩸", "");
      const c = getElCenter(dEl, arenaWrapper);
      spawnParticles(particleContainer, c.x, c.y, "#dc2626", 12);
      if (isA) {
        hp2 = Math.max(0, hp2 - lsDmg);
        updateHpBar(hpBarB, hpTextB, hp2, MAX_HP);
      } else {
        hp1 = Math.max(0, hp1 - lsDmg);
        updateHpBar(hpBarA, hpTextA, hp1, MAX_HP);
      }
      await delay(300);
      applyAnim(aEl, "lifesteal-heal", 500);
      showPopup(aEl, "+" + lsHeal + " HP", "heal-pop");
      if (isA) {
        hp1 = Math.min(MAX_HP, hp1 + lsHeal);
        updateHpBar(hpBarA, hpTextA, hp1, MAX_HP);
      } else {
        hp2 = Math.min(MAX_HP, hp2 + lsHeal);
        updateHpBar(hpBarB, hpTextB, hp2, MAX_HP);
      }
      banner(
        "center",
        `🩸 ${pick(lifestealLines)} <b>[-${lsDmg}hp / +${lsHeal}hp]</b>`,
        "lifesteal",
      );
      addLog(
        battleLogBody,
        "🩸",
        `${atk.name} drained <b>${lsDmg} HP</b> and healed <b>${lsHeal} HP</b>!`,
        "lifesteal",
      );
      if (isA) combo1 = 0;
      else combo2 = 0;
      logHpStatus(battleLogBody, f1.name, hp1, f2.name, hp2);
      await delay(TURN_DELAY);
      continue;
    }

    // REFLECT (defensive buff — bounces damage back)
    const myReflectNow = isA ? reflect1 : reflect2;
    if (roll > 64 && roll <= 70 && aS.defense > 40 && myReflectNow === 0) {
      updateTurnLabel(aEl, "🪞 REFLECTING");
      const rTurns = rand(2, 3);
      banner(
        isA ? "a" : "b",
        `🪞 Setting up a mirror...`,
        "reflect",
      );
      playSound("shield");
      addLog(
        battleLogBody,
        "🪞",
        `${atk.name} ${pick(reflectLines)}`,
        "reflect",
      );
      await delay(500);
      applyAnim(aEl, "reflect-flash", 500);
      if (isA) reflect1 = rTurns;
      else reflect2 = rTurns;
      setStatus(aEl, "🪞");
      banner(
        isA ? "a" : "b",
        `🪞 ${pick(reflectLines)} <b>[reflect ${rTurns}t]</b>`,
        "reflect",
      );
      addLog(
        battleLogBody,
        "🪞",
        `${atk.name} will reflect damage for <b>${rTurns}</b> turns!`,
        "reflect",
      );
      if (isA) combo1 = 0;
      else combo2 = 0;
      await delay(TURN_DELAY);
      continue;
    }

    // BURN ATTACK (DoT that increases each tick)
    const defBurn = isA ? burn2 : burn1;
    if (roll > 60 && roll <= 64 && aS.chaos > 35 && defBurn === 0) {
      updateTurnLabel(aEl, "🔥 BURNING");
      const bTurns = 3;
      const bDmg = rand(3, 7);
      banner(
        isA ? "a" : "b",
        `🔥 Lighting the fuse...`,
        "burn",
      );
      playSound("stun");
      addLog(
        battleLogBody,
        "🔥",
        `${atk.name} ${pick(burnLines)}`,
        "burn",
      );
      await delay(500);
      applyAnim(aEl, isA ? "atk-r" : "atk-l", 350);
      await delay(350);
      applyAnim(dEl, "burn-pulse", 500);
      if (isA) {
        burn2 = bTurns;
        hp2 = Math.max(0, hp2 - bDmg);
        updateHpBar(hpBarB, hpTextB, hp2, MAX_HP);
      } else {
        burn1 = bTurns;
        hp1 = Math.max(0, hp1 - bDmg);
        updateHpBar(hpBarA, hpTextA, hp1, MAX_HP);
      }
      dEl.classList.add("burning");
      showPopup(dEl, "-" + bDmg + " 🔥", "");
      setStatus(dEl, "🔥");
      const c = getElCenter(dEl, arenaWrapper);
      spawnParticles(particleContainer, c.x, c.y, "#fb923c", 12);
      banner(
        isA ? "a" : "b",
        `🔥 ${pick(burnLines)} <b>[-${bDmg}hp + ${bTurns}t burn]</b>`,
        "burn",
      );
      addLog(
        battleLogBody,
        "🔥",
        `${def.name} is <b>BURNING</b>! -${bDmg} HP + burn for ${bTurns} turns!`,
        "burn",
      );
      if (isA) combo1 = 0;
      else combo2 = 0;
      logHpStatus(battleLogBody, f1.name, hp1, f2.name, hp2);
      await delay(TURN_DELAY);
      continue;
    }

    // POISON ATTACK
    const defPoison = isA ? poison2 : poison1;
    if (roll > 82 && aS.chaos > 40 && defPoison === 0) {
      updateTurnLabel(aEl, "🧪 POISONING");
      banner(
        isA ? "a" : "b",
        `🧪 Plotting something nasty...`,
        "poison",
      );
      playSound("poison");
      addLog(
        battleLogBody,
        "🧪",
        `${atk.name} is plotting something nasty...`,
        "poison",
      );
      await delay(500);
      applyAnim(aEl, isA ? "atk-r" : "atk-l", 350);
      await delay(350);
      applyAnim(dEl, "poison-pulse", 500);
      const pTurns = rand(2, 4),
        pDmg = rand(4, 9);
      if (isA) poison2 = pTurns;
      else poison1 = pTurns;
      if (isA) {
        hp2 = Math.max(0, hp2 - pDmg);
        updateHpBar(hpBarB, hpTextB, hp2, MAX_HP);
      } else {
        hp1 = Math.max(0, hp1 - pDmg);
        updateHpBar(hpBarA, hpTextA, hp1, MAX_HP);
      }
      showPopup(dEl, "-" + pDmg + " ☠️", "");
      setStatus(dEl, "☠️");
      const c = getElCenter(dEl, arenaWrapper);
      spawnParticles(particleContainer, c.x, c.y, "#cc44ff", 10);
      banner(
        isA ? "a" : "b",
        `☠️ ${pick(poisonLines)} <b>[-${pDmg}hp + ${pTurns}t poison]</b>`,
        "poison",
      );
      addLog(
        battleLogBody,
        "☠️",
        `${atk.name} — ${pick(poisonLines)} <b>-${pDmg} HP</b> + poison for ${pTurns} turns!`,
        "poison",
      );
      if (isA) combo1 = 0;
      else combo2 = 0;
      logHpStatus(battleLogBody, f1.name, hp1, f2.name, hp2);
      await delay(TURN_DELAY);
      continue;
    }

    // DODGE
    const dodgeChance = dS.speed / 280;
    if (Math.random() < dodgeChance) {
      updateTurnLabel(aEl, "👊 ATTACKING");
      const moveName = pick(atkNames);
      banner(
        isA ? "a" : "b",
        `⚔️ ${moveName}...`,
        "attack",
      );
      addLog(
        battleLogBody,
        "⚔️",
        `${atk.name} attempts <b>${moveName}</b>...`,
        isA ? "hit-a" : "hit-b",
      );
      await delay(500);
      applyAnim(aEl, isA ? "atk-r" : "atk-l", 350);
      await delay(350);
      // Visual: attacker whiffs past, defender sidesteps
      applyAnim(aEl, isA ? "atk-miss" : "atk-miss-left", 500);
      applyAnim(dEl, isA ? "dodge-sidestep" : "dodge-sidestep-left", 500);
      swapActiveTurn(aEl, dEl, "💨 DODGED");
      const dc = getElCenter(dEl, arenaWrapper);
      spawnTextParticle(particleContainer, dc.x, dc.y - 25, "MISS!", "#67e8f9");
      spawnParticles(particleContainer, dc.x, dc.y, "#67e8f9", 6);
      banner(
        isA ? "b" : "a",
        `💨 ${pick(dodgeLines)} <b>[miss]</b>`,
        "dodge",
      );
      playSound("dodge");
      addLog(battleLogBody, "💨", `${def.name} ${pick(dodgeLines)}`, "dodge");
      if (isA) combo1 = 0;
      else combo2 = 0;
      await delay(TURN_DELAY);
      continue;
    }

    // NORMAL ATTACK
    const baseDmg = rand(6, 14) + aS.power / 8;
    const isCrit = Math.random() < aS.chaos / 200;
    let dmg = Math.round(
      Math.max(3, (isCrit ? baseDmg * 1.9 : baseDmg) - dS.defense / 12),
    );
    const moveName = pick(atkNames);

    if (isA) combo1++;
    else combo2++;
    const curCombo = isA ? combo1 : combo2;
    let isCombo = curCombo >= 3;
    if (isCombo) dmg = Math.round(dmg * 1.4);

    // Rage damage boost
    const atkRage = isA ? rage1 : rage2;
    if (atkRage > 0) dmg = Math.round(dmg * 1.5);

    updateTurnLabel(aEl, "👊 ATTACKING");
    // Wind-up
    banner(
      isA ? "a" : "b",
      `👊 <b>${moveName}</b>...`,
      "attack",
    );
    playSound("windUp");
    addLog(
      battleLogBody,
      "👊",
      `${atk.name} winds up <b>${moveName}</b>...`,
      isA ? "hit-a" : "hit-b",
    );
    applyAnim(aEl, isA ? "atk-r" : "atk-l", 350);
    await delay(500);

    // Impact
    playSound(isCrit ? "criticalHit" : "normalHit");
    applyAnim(
      dEl,
      isCrit || isCombo ? "big-shake" : "shake",
      isCrit || isCombo ? 500 : 400,
    );
    applyAnim(dEl, "hit-flash", 300);

    const popText = isCombo
      ? "-" + dmg + " 🌀"
      : isCrit
        ? "💥-" + dmg
        : "-" + dmg;
    const popCls = isCombo ? "combo-pop" : isCrit ? "special-pop" : "";
    showPopup(dEl, popText, popCls);

    const c = getElCenter(dEl, arenaWrapper);
    spawnParticles(
      particleContainer,
      c.x,
      c.y,
      isCrit ? "#ffd700" : isCombo ? "#ff00e5" : "#ff3333",
      isCrit || isCombo ? 20 : 10,
    );
    if (isCrit || isCombo) {
      screenShake(mainContainer, isCrit && isCombo);
      triggerFlash(flashOverlay, isCrit ? "gold" : "red");
    }

    // Shield absorption
    let absorbed = 0;
    const defShield = isA ? shield2 : shield1;
    if (defShield > 0) {
      absorbed = Math.min(defShield, dmg);
      dmg -= absorbed;
      if (isA) shield2 -= absorbed;
      else shield1 -= absorbed;
      if ((isA ? shield2 : shield1) <= 0) {
        dEl.classList.remove("shielded");
        applyAnim(dEl, "shield-break", 400);
        setStatus(dEl, null);
        banner(
          isA ? "b" : "a",
          `🛡️💥 Shield shattered! <b>[blocked ${absorbed}hp]</b>`,
          "shield",
        );
        addLog(
          battleLogBody,
          "🛡️",
          `${def.name}'s shield shattered! Blocked <b>${absorbed}</b> damage.`,
          "shield",
        );
      } else {
        banner(
          isA ? "b" : "a",
          `🛡️ Shield absorbed <b>[${absorbed}hp blocked]</b>`,
          "shield",
        );
        addLog(
          battleLogBody,
          "🛡️",
          `${def.name}'s shield absorbed <b>${absorbed}</b> damage! (${isA ? shield2 : shield1} HP left on shield)`,
          "shield",
        );
      }
      playSound((isA ? shield2 : shield1) <= 0 ? "shieldBreak" : "shieldBlock");
      const sc = getElCenter(dEl, arenaWrapper);
      spawnParticles(particleContainer, sc.x, sc.y, "#38bdf8", 8);
      await delay(300);
    }

    if (isA) {
      hp2 = Math.max(0, hp2 - dmg);
      updateHpBar(hpBarB, hpTextB, hp2, MAX_HP);
    } else {
      hp1 = Math.max(0, hp1 - dmg);
      updateHpBar(hpBarA, hpTextA, hp1, MAX_HP);
    }

    await delay(350);
    const rageTag = atkRage > 0 ? " — ENRAGED!" : "";
    banner(
      "center",
      `💥 ${moveName} → ${def.name} <b>[-${dmg}hp]</b>` +
        (absorbed > 0 ? ` (🛡️${absorbed})` : "") +
        (isCrit ? " — CRITICAL!" : "") +
        (isCombo ? ` — COMBO x${curCombo}!` : "") +
        rageTag,
      isCrit ? "special" : "attack",
    );
    if (isCrit || isCombo) startMajorEvent();

    const logCls = isA ? "hit-a" : "hit-b";
    addLog(
      battleLogBody,
      "💥",
      `HIT! ${def.name} took <b>-${dmg} HP</b> (${Math.max(
        0,
        Math.round(isA ? hp2 : hp1),
      )} HP left)`,
      logCls,
    );
    if (isCrit) {
      await delay(350);
      addLog(battleLogBody, "💥", `<b>${pick(critLines)}</b>`, "critical");
    }
    if (isCombo) {
      playSound("combo");
      await delay(350);
      addLog(
        battleLogBody,
        "🌀",
        `<b>COMBO x${curCombo}!</b> Boosted damage!`,
        "combo",
      );
      spawnTextParticle(
        particleContainer,
        c.x + rand(-20, 20),
        c.y - 20,
        `COMBO x${curCombo}!`,
        "#f472b6",
      );
    }
    if (isCrit || isCombo) {
      await delay(300);
      endMajorEvent();
    }

    // REFLECT — bounce damage back to attacker
    const defReflect = isA ? reflect2 : reflect1;
    if (defReflect > 0 && dmg > 0) {
      swapActiveTurn(aEl, dEl, "🪞 REFLECTING");
      playSound("reflectBounce");
      const reflDmg = Math.round(dmg * 0.35);
      applyAnim(dEl, "reflect-flash", 500);
      const rc2 = getElCenter(aEl, arenaWrapper);
      spawnParticles(particleContainer, rc2.x, rc2.y, "#60a5fa", 10);
      showPopup(aEl, "-" + reflDmg + " 🪞", "");
      spawnTextParticle(particleContainer, rc2.x, rc2.y - 25, "REFLECTED!", "#93c5fd");
      if (isA) {
        hp1 = Math.max(0, hp1 - reflDmg);
        updateHpBar(hpBarA, hpTextA, hp1, MAX_HP);
      } else {
        hp2 = Math.max(0, hp2 - reflDmg);
        updateHpBar(hpBarB, hpTextB, hp2, MAX_HP);
      }
      banner(
        isA ? "b" : "a",
        `🪞 ${pick(reflectLines)} <b>[${reflDmg}hp reflected]</b>`,
        "reflect",
      );
      addLog(
        battleLogBody,
        "🪞",
        `${def.name} reflected <b>${reflDmg}</b> damage back!`,
        "reflect",
      );
      await delay(350);
      setActiveTurn(aEl, dEl);
    }

    // COUNTER ATTACK
    if (Math.random() < dS.luck / 250 && (isA ? hp2 : hp1) > 0) {
      await delay(400);
      swapActiveTurn(aEl, dEl, "↩️ COUNTERING");
      // Visual: defender parries
      applyAnim(dEl, "counter-parry", 400);
      banner(
        isA ? "b" : "a",
        `↩️ Counter attack!`,
        "counter",
      );
      playSound("counter");
      addLog(
        battleLogBody,
        "⚡",
        `${def.name} parries and strikes back!`,
        "counter",
      );
      await delay(350);
      const cDmg = rand(4, 10);
      applyAnim(dEl, isA ? "atk-l" : "atk-r", 350);
      await delay(350);
      applyAnim(aEl, "big-shake", 500);
      applyAnim(aEl, "hit-flash", 300);
      playSound("counterImpact");
      showPopup(aEl, "-" + cDmg + " ↩️", "");
      spawnTextParticle(particleContainer, getElCenter(aEl, arenaWrapper).x, getElCenter(aEl, arenaWrapper).y - 25, "COUNTER!", "#fb923c");
      const ac = getElCenter(aEl, arenaWrapper);
      spawnParticles(particleContainer, ac.x, ac.y, "#ff6600", 14);
      triggerFlash(flashOverlay, "red");
      screenShake(mainContainer, false);
      if (isA) {
        hp1 = Math.max(0, hp1 - cDmg);
        updateHpBar(hpBarA, hpTextA, hp1, MAX_HP);
      } else {
        hp2 = Math.max(0, hp2 - cDmg);
        updateHpBar(hpBarB, hpTextB, hp2, MAX_HP);
      }
      addLog(
        battleLogBody,
        "↩️",
        `${def.name} ${pick(counterLines)} <b>-${cDmg} HP</b>`,
        "counter",
      );
      banner(
        isA ? "b" : "a",
        `↩️ ${pick(counterLines)} <b>[-${cDmg}hp]</b>`,
        "counter",
      );
      setActiveTurn(aEl, dEl);
    }

    // RAGE TRIGGER — defender enters rage when HP drops below 30%
    const defHpNow = isA ? hp2 : hp1;
    const defRageNow = isA ? rage2 : rage1;
    if (defHpNow > 0 && defHpNow < 30 && defRageNow === 0 && Math.random() < 0.5) {
      await delay(350);
      if (isA) rage2 = 3;
      else rage1 = 3;
      playSound("rage");
      applyAnim(dEl, "rage-aura", 700);
      dEl.classList.add("enraged");
      triggerFlash(flashOverlay, "red");
      setStatus(dEl, "🔥");
      const rc = getElCenter(dEl, arenaWrapper);
      spawnParticles(particleContainer, rc.x, rc.y, "#ef4444", 16);
      spawnTextParticle(particleContainer, rc.x, rc.y - 25, "RAGE!", "#ef4444");
      banner(
        isA ? "b" : "a",
        `🔥 ${pick(rageLines)} <b>[+50% dmg, 3 turns]</b>`,
        "rage",
      );
      addLog(
        battleLogBody,
        "🔥",
        `<b>${def.name} ${pick(rageLines)}</b> Damage boosted for 3 turns!`,
        "rage",
      );
      await delay(400);
    }

    // DOUBLE STRIKE — speed-based chance for a second hit
    if (Math.random() < aS.speed / 400 && (isA ? hp2 : hp1) > 0) {
      setActiveTurn(aEl, dEl, "⚡ DOUBLE STRIKE");
      await delay(300);
      const dsDmg = rand(4, 9) + Math.round(aS.speed / 15);
      banner(
        isA ? "a" : "b",
        `⚡ ${pick(doubleStrikeLines)} <b>[-${dsDmg}hp]</b>`,
        "doublestrike",
      );
      playSound("doubleStrike");
      addLog(
        battleLogBody,
        "⚡",
        `${atk.name} ${pick(doubleStrikeLines)} — extra <b>-${dsDmg} HP</b>!`,
        isA ? "hit-a" : "hit-b",
      );
      applyAnim(aEl, isA ? "atk-r" : "atk-l", 350);
      await delay(300);
      applyAnim(dEl, "shake", 400);
      applyAnim(dEl, "hit-flash", 300);
      showPopup(dEl, "-" + dsDmg + " ⚡", "combo-pop");
      const dsc = getElCenter(dEl, arenaWrapper);
      spawnParticles(particleContainer, dsc.x, dsc.y, "#c084fc", 10);
      spawnTextParticle(particleContainer, dsc.x, dsc.y - 25, "DOUBLE!", "#c084fc");
      if (isA) {
        hp2 = Math.max(0, hp2 - dsDmg);
        updateHpBar(hpBarB, hpTextB, hp2, MAX_HP);
      } else {
        hp1 = Math.max(0, hp1 - dsDmg);
        updateHpBar(hpBarA, hpTextA, hp1, MAX_HP);
      }
      await delay(300);
    }

    await delay(300);
    dEl.classList.remove("hit-flash", "shake", "big-shake");

    if (Math.random() < 0.3) {
      const crowdSounds = ["crowdCheer", "crowdWoo", "crowdClap", "crowdWoouu"];
      playSound(pick(crowdSounds));
      await delay(200);
      addLog(battleLogBody, "📢", pick(crowdLines), "crowd");
    }
    if ((isA ? hp2 : hp1) <= 20 && (isA ? hp2 : hp1) > 0) {
      playSound("heartbeat");
    }
    if (isCrit && Math.random() < 0.4) {
      playSound("painScream");
    }

    // Show HP status every few turns
    if (turn % 3 === 0) {
      logHpStatus(battleLogBody, f1.name, hp1, f2.name, hp2);
    }

    updateBuffBars();
    emit({
      event: "turn",
      turn: Math.ceil(turn / 2),
      hp1: Math.max(0, Math.round(hp1)),
      hp2: Math.max(0, Math.round(hp2)),
      banner: bannerStage?.textContent || "",
    });
    await delay(TURN_DELAY);
  }

  vsText.classList.remove("fire");
  arenaWrapper.classList.remove("intense");

  // Determine winner
  let winner, loser, wEl, lEl;
  if (hp1 <= 0) {
    winner = f2;
    loser = f1;
    wEl = fighterB;
    lEl = fighterA;
  } else if (hp2 <= 0) {
    winner = f1;
    loser = f2;
    wEl = fighterA;
    lEl = fighterB;
  } else {
    winner = hp1 >= hp2 ? f1 : f2;
    loser = winner === f1 ? f2 : f1;
    wEl = winner === f1 ? fighterA : fighterB;
    lEl = winner === f1 ? fighterB : fighterA;
  }

  emit({
    event: "matchEnd",
    winner: { name: winner.name, emoji: winner.emoji },
    loser: { name: loser.name, emoji: loser.emoji },
    winnerHp: Math.max(0, Math.round(winner === f1 ? hp1 : hp2)),
  });

  // Clean up persistent mechanic classes
  fighterA.classList.remove("stunned", "shielded", "enraged", "burning");
  fighterB.classList.remove("stunned", "shielded", "enraged", "burning");
  if (buffsBarA) buffsBarA.innerHTML = "";
  if (buffsBarB) buffsBarB.innerHTML = "";

  // Extended KO sequence with slow-mo feel
  clearActiveTurn(fighterA, fighterB);
  playSound("ko");
  playSound("painDie");
  triggerFlash(flashOverlay, "white");
  clearBanners(bannerStage);
  banner("center", `🔔 BATTLE OVER!`, "ko");
  startMajorEvent();
  addLog(battleLogBody, "🔔", `<b>═══════ BATTLE OVER! ═══════</b>`, "ko");
  await delay(600);
  // Slow-mo KO: darken arena, spin loser
  arenaWrapper.style.transition = "filter 0.5s";
  arenaWrapper.style.filter = "brightness(0.4)";
  await delay(500);
  applyAnim(lEl, "ko-spin", 800);
  addLog(
    battleLogBody,
    "💀",
    `<b>${loser.name}</b> goes down! It's over...`,
    "ko",
  );
  await delay(1000);
  triggerFlash(flashOverlay, "gold");
  screenShake(mainContainer, true);
  arenaWrapper.style.filter = "brightness(1)";
  playSound("victory");
  playSound("victoryCheer");
  banner(
    "center",
    `🏆 ${getEmoji(winner.name)} ${winner.name} WINS! 🏆`,
    "ko",
  );
  addLog(
    battleLogBody,
    "🏆",
    `<b>${winner.name}</b> defeats <b>${loser.name}</b>! ${getEmoji(winner.name)}`,
    "ko",
  );
  const wc = getElCenter(wEl, arenaWrapper);
  spawnParticles(particleContainer, wc.x, wc.y, "#ffd700", 35);
  spawnTextParticle(particleContainer, wc.x, wc.y - 30, "WINNER!", "#ffd700");
  await delay(900);
  endMajorEvent();

  const winHp = winner === f1 ? hp1 : hp2;
  addLog(
    battleLogBody,
    "📊",
    `<b>${winner.name}</b> finished with <b>${Math.max(0, Math.round(winHp))} HP</b> ${hpStatusText(
      winHp,
    )}`,
    "ko",
  );

  wEl.classList.add("winner-glow");
  lEl.classList.add("loser-fade");
  await delay(2500);
  // Leave animation classes on — setupMatch will reset className via refs
  setStatus(fighterA, null);
  setStatus(fighterB, null);
  arenaWrapper.style.filter = "";
  arenaWrapper.style.transition = "";

  return { winner, loser };
}

export { renderStatBars, updateHpBar, updateNrgBar };
