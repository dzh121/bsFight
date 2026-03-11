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

function setBanner(bannerEl, text, type = "") {
  if (!bannerEl) return;
  bannerEl.className = "action-banner" + (type ? ` action-${type}` : "");
  bannerEl.innerHTML = text;
}

function setActiveTurn(aEl, dEl) {
  if (aEl) aEl.classList.add("active-turn");
  if (dEl) dEl.classList.remove("active-turn");
}

function clearActiveTurn(aEl, dEl) {
  if (aEl) aEl.classList.remove("active-turn");
  if (dEl) dEl.classList.remove("active-turn");
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
    actionBanner,
    flashOverlay,
  } = refs;

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
    `<b>${f1.name}</b>: 💪${s1.power} ⚡${s1.speed} 🛡${s1.defense} 🎲${s1.luck} 🌀${s1.chaos} 🔥${s1.hype}`,
    "crowd",
  );
  addLog(
    battleLogBody,
    "📊",
    `<b>${f2.name}</b>: 💪${s2.power} ⚡${s2.speed} 🛡${s2.defense} 🎲${s2.luck} 🌀${s2.chaos} 🔥${s2.hype}`,
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
  setBanner(
    actionBanner,
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
    setBanner(
      actionBanner,
      `🎬 Turn ${turnNum} — ${getEmoji(atk.name)} <b>${atk.name}</b>'s turn`,
      "attack",
    );
    addLog(
      battleLogBody,
      "🎬",
      `<b>── Turn ${turnNum} │ ${atk.name} attacks ──</b>`,
      "crowd",
    );
    await delay(400);

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
      setBanner(
        actionBanner,
        `☠️ ${atk.name} takes ${pd} poison damage!`,
        "poison",
      );
      playSound("poison");
      addLog(
        battleLogBody,
        "☠️",
        `${atk.name} takes <b>${pd}</b> poison damage! (${isA ? poison1 : poison2} poison turns left)`,
        "poison",
      );
      if ((isA ? hp1 : hp2) <= 0) break;
      await delay(500);
    }

    // Energy gain
    const nrgGain = rand(12, 22);
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
    if (myNrg >= 70 && roll < 16) {
      if (isA) nrg1 -= 70;
      else nrg2 -= 70;
      updateNrgBar(
        isA ? nrgBarA : nrgBarB,
        isA ? nrgTextA : nrgTextB,
        isA ? nrg1 : nrg2,
      );
      const rawDmg = rand(20, 32) + aS.power / 7;
      const dmg = Math.round(Math.max(5, rawDmg - dS.defense / 10));
      setBanner(
        actionBanner,
        `⚡ ${getEmoji(atk.name)} ${atk.name} is charging energy...`,
        "special",
      );
      playSound("specialMove");
      addLog(
        battleLogBody,
        "⚡",
        `${atk.name} is charging energy...`,
        "special",
      );
      await delay(600);
      const spName = pick(specialNames);
      setBanner(actionBanner, `⭐ ${atk.name} unleashes ${spName}!`, "special");
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
      spawnTextParticle(
        particleContainer,
        c.x + rand(-30, 30),
        c.y + rand(-20, 20),
        "SPECIAL!",
        "#fde68a",
      );
      screenShake(mainContainer, true);
      await delay(300);
      if (isA) {
        hp2 = Math.max(0, hp2 - dmg);
        updateHpBar(hpBarB, hpTextB, hp2, MAX_HP);
      } else {
        hp1 = Math.max(0, hp1 - dmg);
        updateHpBar(hpBarA, hpTextA, hp1, MAX_HP);
      }
      setBanner(
        actionBanner,
        `💫 ${def.name} took ${dmg} special damage!`,
        "special",
      );
      addLog(
        battleLogBody,
        "💫",
        `${def.name} took <b>${dmg}</b> special damage!`,
        "special",
      );
      if (isA) combo1 = 0;
      else combo2 = 0;
      await delay(400);
      if (Math.random() < 0.5)
        addLog(battleLogBody, "📢", pick(crowdLines), "crowd");
      logHpStatus(battleLogBody, f1.name, hp1, f2.name, hp2);
      await delay(TURN_DELAY);
      continue;
    }

    // HEAL
    if (myHp < 40 && roll < 16 + aS.luck / 7) {
      const heal = rand(10, 20);
      setBanner(
        actionBanner,
        `🧘 ${getEmoji(atk.name)} ${atk.name} takes a breather...`,
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
      setBanner(actionBanner, `💚 ${atk.name} healed +${heal} HP!`, "heal");
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
    if (roll > 93 && aS.hype > 45) {
      setBanner(
        actionBanner,
        `🔋 ${getEmoji(atk.name)} ${atk.name} focuses and powers up...`,
        "buff",
      );
      playSound("buff");
      addLog(
        battleLogBody,
        "🔋",
        `${atk.name} focuses and powers up...`,
        "buff",
      );
      await delay(400);
      applyAnim(aEl, "buff-glow", 600);
      const bStat = pick(["power", "speed", "chaos"]);
      const bAmt = rand(5, 14);
      aS[bStat] = Math.min(99, aS[bStat] + bAmt);
      renderStatBars(isA ? statsA : statsB, aS);
      setStatus(aEl, "💪");
      const label = { power: "Power", speed: "Speed", chaos: "Chaos" }[bStat];
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

    // POISON ATTACK
    const defPoison = isA ? poison2 : poison1;
    if (roll > 87 && aS.chaos > 50 && defPoison === 0) {
      setBanner(
        actionBanner,
        `🧪 ${getEmoji(atk.name)} ${atk.name} is plotting something nasty...`,
        "poison",
      );
      playSound("poison");
      addLog(
        battleLogBody,
        "🧪",
        `${atk.name} is plotting something nasty...`,
        "poison",
      );
      await delay(400);
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
    const dodgeChance = dS.speed / 350;
    if (Math.random() < dodgeChance) {
      const moveName = pick(atkNames);
      setBanner(
        actionBanner,
        `⚔️ ${atk.name} attempts ${moveName}...`,
        "attack",
      );
      addLog(
        battleLogBody,
        "⚔️",
        `${atk.name} attempts <b>${moveName}</b>...`,
        isA ? "hit-a" : "hit-b",
      );
      await delay(400);
      applyAnim(aEl, isA ? "atk-r" : "atk-l", 350);
      await delay(300);
      setBanner(actionBanner, `💨 ${def.name} ${pick(dodgeLines)}`, "dodge");
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

    // Wind-up
    setBanner(
      actionBanner,
      `👊 ${getEmoji(atk.name)} ${atk.name} winds up <b>${moveName}</b>...`,
      "attack",
    );
    playSound(isCrit ? "criticalHit" : "normalHit");
    addLog(
      battleLogBody,
      "👊",
      `${atk.name} winds up <b>${moveName}</b>...`,
      isA ? "hit-a" : "hit-b",
    );
    applyAnim(aEl, isA ? "atk-r" : "atk-l", 350);
    await delay(400);

    // Impact
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

    if (isA) {
      hp2 = Math.max(0, hp2 - dmg);
      updateHpBar(hpBarB, hpTextB, hp2, MAX_HP);
    } else {
      hp1 = Math.max(0, hp1 - dmg);
      updateHpBar(hpBarA, hpTextA, hp1, MAX_HP);
    }

    await delay(300);
    setBanner(
      actionBanner,
      `💥 HIT! ${def.name} took -${dmg} HP` +
        (isCrit ? " — CRITICAL!" : "") +
        (isCombo ? ` — COMBO x${curCombo}!` : ""),
      isCrit ? "special" : "attack",
    );

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
      await delay(200);
      addLog(battleLogBody, "�", `<b>${pick(critLines)}</b>`, "critical");
    }
    if (isCombo) {
      playSound("combo");
      await delay(200);
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

    // COUNTER ATTACK
    if (Math.random() < dS.luck / 300 && (isA ? hp2 : hp1) > 0) {
      await delay(500);
      setBanner(
        actionBanner,
        `↩️ ${getEmoji(def.name)} ${def.name} rushes to strike back!`,
        "counter",
      );
      playSound("counter");
      addLog(
        battleLogBody,
        "⚡",
        `${def.name} rushes to strike back!`,
        "counter",
      );
      await delay(300);
      const cDmg = rand(4, 10);
      applyAnim(dEl, isA ? "atk-l" : "atk-r", 350);
      await delay(350);
      applyAnim(aEl, "shake", 400);
      applyAnim(aEl, "hit-flash", 300);
      showPopup(aEl, "-" + cDmg + " ↩️", "");
      const ac = getElCenter(aEl, arenaWrapper);
      spawnParticles(particleContainer, ac.x, ac.y, "#ff6600", 10);
      triggerFlash(flashOverlay, "red");
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
    }

    await delay(200);
    dEl.classList.remove("hit-flash", "shake", "big-shake");

    if (Math.random() < 0.3) {
      await delay(200);
      addLog(battleLogBody, "📢", pick(crowdLines), "crowd");
    }

    // Show HP status every few turns
    if (turn % 3 === 0) {
      logHpStatus(battleLogBody, f1.name, hp1, f2.name, hp2);
    }

    emit({
      event: "turn",
      turn: Math.ceil(turn / 2),
      hp1: Math.max(0, Math.round(hp1)),
      hp2: Math.max(0, Math.round(hp2)),
      banner: actionBanner.textContent,
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

  // Extended KO sequence with slow-mo feel
  clearActiveTurn(fighterA, fighterB);
  playSound("ko");
  triggerFlash(flashOverlay, "white");
  setBanner(actionBanner, `🔔 BATTLE OVER!`, "ko");
  addLog(battleLogBody, "🔔", `<b>═══════ BATTLE OVER! ═══════</b>`, "ko");
  await delay(400);
  // Slow-mo KO: darken arena, spin loser
  arenaWrapper.style.transition = "filter 0.5s";
  arenaWrapper.style.filter = "brightness(0.4)";
  await delay(300);
  applyAnim(lEl, "ko-spin", 800);
  addLog(
    battleLogBody,
    "💀",
    `<b>${loser.name}</b> goes down! It's over...`,
    "ko",
  );
  await delay(700);
  triggerFlash(flashOverlay, "gold");
  screenShake(mainContainer, true);
  arenaWrapper.style.filter = "brightness(1)";
  playSound("victory");
  setBanner(
    actionBanner,
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
  await delay(400);

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
