import { useState, useRef, useCallback, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import "./styles/battle.css";
import {
  normalizeNames,
  buildFighterObjects,
  getEmoji,
  shuffle,
  MAX_HP,
  MAX_NRG,
  spawnConfetti,
  rand,
  pick,
} from "./utils/helpers";
import {
  animatedFight,
  renderStatBars,
  updateHpBar,
  updateNrgBar,
} from "./utils/battleEngine";
import { playSound } from "./utils/soundEngine";

function scaleStats(qrStats) {
  const scaled = {};
  for (const k of Object.keys(qrStats)) {
    scaled[k] = Math.round(qrStats[k] * 9 + 10);
  }
  return scaled;
}

function getWsUrl() {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${location.host}/game-ws`;
}

const SAMPLE_PEOPLE = [
  "Daniel",
  "Noa",
  "Aviv",
  "Yoav",
  "Ron",
  "Sapir",
  "Ori",
  "Tomer",
  "Eliav",
  "Guy",
  "Barak",
  "Micha",
  "Noam",
  "Binyamin",
  "Tal",
  "Maor",
  "Nir",
  "Eyal",
  "Udi",
  "Boris",
  "Amir",
  "Tali",
  "Alex",
];

function App() {
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState("setup"); // setup | battle | done
  const [allFighters, setAllFighters] = useState([]);
  const [eliminated, setEliminated] = useState(new Set());
  const [currentPair, setCurrentPair] = useState(null);
  const [progressLabel, setProgressLabel] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [champion, setChampion] = useState(null);
  const [showLog, setShowLog] = useState(false);

  // QR mode state
  const [setupMode, setSetupMode] = useState("manual"); // manual | qr
  const [lobbyPlayers, setLobbyPlayers] = useState([]);
  const [manualAddName, setManualAddName] = useState("");
  const hostWsRef = useRef(null);

  const roundRef = useRef({
    current: [],
    next: [],
    matchIdx: 0,
    roundNum: 1,
    totalPlayed: 0,
  });
  const autoRunRef = useRef(null);
  const fightFnRef = useRef(null);
  const phaseRef = useRef("setup");

  // DOM refs for imperative animations
  const mainRef = useRef(null);
  const arenaStageRef = useRef(null);
  const particleRef = useRef(null);
  const fighterARef = useRef(null);
  const fighterBRef = useRef(null);
  const hpBarARef = useRef(null);
  const hpBarBRef = useRef(null);
  const hpTextARef = useRef(null);
  const hpTextBRef = useRef(null);
  const nrgBarARef = useRef(null);
  const nrgBarBRef = useRef(null);
  const nrgTextARef = useRef(null);
  const nrgTextBRef = useRef(null);
  const statsARef = useRef(null);
  const statsBRef = useRef(null);
  const vsRef = useRef(null);
  const logBodyRef = useRef(null);
  const turnRef = useRef(null);
  const countdownOverlayRef = useRef(null);
  const countdownNumberRef = useRef(null);
  const countdownSubRef = useRef(null);
  const bannerStageRef = useRef(null);
  const buffsARef = useRef(null);
  const buffsBRef = useRef(null);
  const flashRef = useRef(null);
  const vignetteRef = useRef(null);

  const getRefs = useCallback(
    () => ({
      fighterA: fighterARef.current,
      fighterB: fighterBRef.current,
      hpBarA: hpBarARef.current,
      hpBarB: hpBarBRef.current,
      hpTextA: hpTextARef.current,
      hpTextB: hpTextBRef.current,
      nrgBarA: nrgBarARef.current,
      nrgBarB: nrgBarBRef.current,
      nrgTextA: nrgTextARef.current,
      nrgTextB: nrgTextBRef.current,
      statsA: statsARef.current,
      statsB: statsBRef.current,
      vsText: vsRef.current,
      arenaWrapper: arenaStageRef.current,
      particleContainer: particleRef.current,
      battleLogBody: logBodyRef.current,
      turnCounter: turnRef.current,
      mainContainer: mainRef.current,
      countdownOverlay: countdownOverlayRef.current,
      countdownNumber: countdownNumberRef.current,
      countdownSub: countdownSubRef.current,
      bannerStage: bannerStageRef.current,
      buffsBarA: buffsARef.current,
      buffsBarB: buffsBRef.current,
      flashOverlay: flashRef.current,
      vignetteOverlay: vignetteRef.current,
    }),
    [],
  );

  const stopAutoRun = useCallback(() => {
    if (autoRunRef.current !== null) {
      clearTimeout(autoRunRef.current);
      autoRunRef.current = null;
    }
  }, []);

  const setupMatch = useCallback(
    (fighters, elim, round) => {
      const r = round;
      if (r.current.length === 1) return { done: true, champion: r.current[0] };
      if (r.matchIdx >= r.current.length) {
        r.current = r.next;
        r.next = [];
        r.matchIdx = 0;
        r.roundNum++;
      }
      if (r.current.length === 1) return { done: true, champion: r.current[0] };
      if (r.matchIdx === r.current.length - 1) {
        r.next.push(r.current[r.matchIdx]);
        r.matchIdx++;
        return setupMatch(fighters, elim, round);
      }

      const f1 = r.current[r.matchIdx],
        f2 = r.current[r.matchIdx + 1];
      setCurrentPair([f1, f2]);
      setProgressLabel(
        `Round ${r.roundNum} // Match ${Math.floor(r.matchIdx / 2) + 1}`,
      );
      setShowLog(false);

      // Reset fighter UI via refs after render
      setTimeout(() => {
        const refs = getRefs();
        if (refs.fighterA) refs.fighterA.className = "fighter side-a";
        if (refs.fighterB) refs.fighterB.className = "fighter side-b";
        renderStatBars(refs.statsA, { ...f1.stats });
        renderStatBars(refs.statsB, { ...f2.stats });
        updateHpBar(refs.hpBarA, refs.hpTextA, MAX_HP, MAX_HP);
        updateHpBar(refs.hpBarB, refs.hpTextB, MAX_HP, MAX_HP);
        updateNrgBar(refs.nrgBarA, refs.nrgTextA, 0);
        updateNrgBar(refs.nrgBarB, refs.nrgTextB, 0);
      }, 50);

      return { done: false };
    },
    [getRefs],
  );

  const showChampionUI = useCallback(
    (champ, fighters, totalPlayed) => {
      stopAutoRun();
      setCurrentPair(null);
      setChampion(champ);
      setPhase("done");
      spawnConfetti();
      playSound("championCrown");
      const ws = hostWsRef.current;
      if (ws && ws.readyState === 1) {
        ws.send(
          JSON.stringify({
            type: "tournamentEnd",
            data: {
              champion: { name: champ.name, emoji: champ.emoji },
              totalPlayed,
            },
          }),
        );
      }
    },
    [stopAutoRun],
  );

  // ── WebSocket connection — always on so /bet spectators work in any mode ──
  useEffect(() => {
    const ws = new WebSocket(getWsUrl());
    hostWsRef.current = ws;
    ws.onopen = () => ws.send(JSON.stringify({ type: "registerHost" }));
    ws.onmessage = (e) => {
      let msg;
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }
      if (msg.type === "playerJoined") {
        setLobbyPlayers((prev) => [...prev, msg.player]);
      }
      if (msg.type === "playerLeft") {
        setLobbyPlayers((prev) => prev.filter((p) => p.id !== msg.player.id));
      }
      if (msg.type === "playerList") {
        setLobbyPlayers(msg.players);
      }
    };
    return () => {
      ws.close();
      hostWsRef.current = null;
    };
  }, []);

  const removeLobbyPlayer = useCallback((playerId) => {
    setLobbyPlayers((prev) => prev.filter((p) => p.id !== playerId));
    if (hostWsRef.current && hostWsRef.current.readyState === 1) {
      hostWsRef.current.send(
        JSON.stringify({ type: "removePlayer", playerId }),
      );
    }
  }, []);

  const addManualPlayer = useCallback(() => {
    if (!manualAddName.trim()) return;
    const p = {
      id: crypto.randomUUID(),
      name: manualAddName.trim(),
      emoji: getEmoji(manualAddName.trim()),
      stats: {
        power: 5,
        speed: 5,
        hype: 5,
        chaos: 5,
        luck: 5,
        defense: 5,
        focus: 5,
        stamina: 5,
        wit: 5,
        grit: 5,
        swagger: 5,
      },
      manual: true,
    };
    setLobbyPlayers((prev) => [...prev, p]);
    setManualAddName("");
  }, [manualAddName]);

  const startTournament = useCallback(() => {
    let built;
    if (setupMode === "qr") {
      const all = [...lobbyPlayers];
      if (all.length < 2) {
        alert("You need at least 2 players to start a tournament.");
        return;
      }
      built = shuffle(
        all.map((p) => ({
          name: p.name,
          wins: 0,
          stats: scaleStats(p.stats),
          emoji: p.emoji,
        })),
      );
    } else {
      const names = normalizeNames(input);
      if (names.length < 2) {
        alert("You need at least 2 names to start a tournament.");
        return;
      }
      built = buildFighterObjects(names);
    }
    // Broadcast fighter list for /bet spectators (works in both modes)
    if (hostWsRef.current && hostWsRef.current.readyState === 1) {
      hostWsRef.current.send(
        JSON.stringify({
          type: "gameStarted",
          fighters: built.map((f) => ({
            name: f.name,
            emoji: f.emoji,
            stats: f.stats,
          })),
        }),
      );
    }
    stopAutoRun();
    setAllFighters(built);
    setEliminated(new Set());
    setChampion(null);
    setIsBusy(false);
    setPhase("battle");

    const r = {
      current: [...built],
      next: [],
      matchIdx: 0,
      roundNum: 1,
      totalPlayed: 0,
    };
    roundRef.current = r;

    setTimeout(() => {
      const result = setupMatch(built, new Set(), r);
      if (result.done) showChampionUI(result.champion, built, r.totalPlayed);
    }, 100);
  }, [input, setupMode, lobbyPlayers, stopAutoRun, setupMatch, showChampionUI]);

  const fightCurrentMatch = useCallback(async () => {
    if (!currentPair || isBusy || phase === "done") return;
    setIsBusy(true);
    setShowLog(true);
    // Wait for React to render the log DOM before reading refs
    await new Promise((res) => setTimeout(res, 60));
    const refs = getRefs();
    const broadcastEvent = (data) => {
      const ws = hostWsRef.current;
      if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({ type: "fightEvent", data }));
      }
    };
    const result = await animatedFight(
      currentPair[0],
      currentPair[1],
      refs,
      broadcastEvent,
    );
    result.winner.wins++;
    const newElim = new Set(eliminated);
    newElim.add(result.loser.name);

    const r = roundRef.current;
    r.next.push(result.winner);
    r.matchIdx += 2;
    r.totalPlayed++;

    // Broadcast elimination with survivors list for phone betting
    const survivors = allFighters
      .filter((f) => !newElim.has(f.name))
      .map((f) => ({ name: f.name, emoji: f.emoji, wins: f.wins }));
    broadcastEvent({
      event: "elimination",
      loser: { name: result.loser.name, emoji: result.loser.emoji },
      survivors,
    });

    // Batch all state updates together to avoid intermediate re-render
    // that would reset fighter className and cause flicker
    setEliminated(newElim);
    setIsBusy(false);
    const matchResult = setupMatch(allFighters, newElim, r);
    if (matchResult.done)
      showChampionUI(matchResult.champion, allFighters, r.totalPlayed);
  }, [
    currentPair,
    isBusy,
    phase,
    getRefs,
    eliminated,
    allFighters,
    setupMatch,
    showChampionUI,
  ]);

  fightFnRef.current = fightCurrentMatch;
  phaseRef.current = phase;

  const skipFight = useCallback(async () => {
    if (!currentPair || isBusy || phase === "done") return;
    setIsBusy(true);
    const s1 = currentPair[0].stats,
      s2 = currentPair[1].stats;
    const scoreStats = (s) =>
      s.power * 0.2 +
      s.speed * 0.12 +
      s.hype * 0.1 +
      s.chaos * 0.08 +
      s.luck * 0.1 +
      s.defense * 0.1 +
      s.focus * 0.08 +
      s.stamina * 0.07 +
      s.wit * 0.07 +
      s.grit * 0.1 +
      s.swagger * 0.05 +
      Math.random() * 25;
    const t1 = scoreStats(s1);
    const t2 = scoreStats(s2);
    const winner = t1 >= t2 ? currentPair[0] : currentPair[1];
    const loser = winner === currentPair[0] ? currentPair[1] : currentPair[0];
    winner.wins++;
    const newElim = new Set(eliminated);
    newElim.add(loser.name);

    // Broadcast skip result to phones
    const broadcastEvent = (data) => {
      const ws = hostWsRef.current;
      if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({ type: "fightEvent", data }));
      }
    };
    broadcastEvent({
      event: "matchEnd",
      winner: { name: winner.name, emoji: winner.emoji },
      loser: { name: loser.name, emoji: loser.emoji },
      winnerHp: MAX_HP,
    });
    const survivors = allFighters
      .filter((f) => !newElim.has(f.name))
      .map((f) => ({ name: f.name, emoji: f.emoji, wins: f.wins }));
    broadcastEvent({
      event: "elimination",
      loser: { name: loser.name, emoji: loser.emoji },
      survivors,
    });

    setEliminated(newElim);

    const refs = getRefs();
    const wEl = winner === currentPair[0] ? refs.fighterA : refs.fighterB;
    const lEl = winner === currentPair[0] ? refs.fighterB : refs.fighterA;
    updateHpBar(
      winner === currentPair[0] ? refs.hpBarB : refs.hpBarA,
      winner === currentPair[0] ? refs.hpTextB : refs.hpTextA,
      0,
      MAX_HP,
    );
    if (wEl) wEl.classList.add("winner-glow");
    if (lEl) lEl.classList.add("loser-fade");

    const r = roundRef.current;
    r.next.push(winner);
    r.matchIdx += 2;
    r.totalPlayed++;

    await new Promise((res) => setTimeout(res, 600));
    if (wEl) wEl.classList.remove("winner-glow");
    if (lEl) lEl.classList.remove("loser-fade");
    setIsBusy(false);

    const matchResult = setupMatch(allFighters, newElim, r);
    if (matchResult.done)
      showChampionUI(matchResult.champion, allFighters, r.totalPlayed);
  }, [
    currentPair,
    isBusy,
    phase,
    getRefs,
    eliminated,
    allFighters,
    setupMatch,
    showChampionUI,
  ]);

  const runWholeTournament = useCallback(() => {
    if (phase === "done" || !currentPair || isBusy) return;
    stopAutoRun();
    async function step() {
      if (phaseRef.current === "done") {
        stopAutoRun();
        return;
      }
      if (fightFnRef.current) {
        await fightFnRef.current();
        if (phaseRef.current !== "done") {
          autoRunRef.current = setTimeout(step, 800);
        }
      }
    }
    step();
  }, [phase, currentPair, isBusy, stopAutoRun]);

  const getBracketClass = (f) => {
    if (eliminated.has(f.name)) return "bracket-chip eliminated";
    if (
      currentPair &&
      (currentPair[0].name === f.name || currentPair[1].name === f.name)
    )
      return "bracket-chip fighting";
    return "bracket-chip alive";
  };

  const sorted = champion
    ? [...allFighters].sort(
        (a, b) => b.wins - a.wins || a.name.localeCompare(b.name, "en"),
      )
    : [];

  return (
    <div ref={mainRef}>
      {/* Cyberpunk background */}
      <div className="cyber-bg" />

      {/* Flash overlay for big hits */}
      <div className="flash-overlay" ref={flashRef} />

      {/* ═══ SETUP PHASE ═══ */}
      {phase === "setup" && (
        <div className="setup-page phase-enter">
          <h1 className="setup-title">Office Battle Royale</h1>
          <p className="setup-subtitle">
            Set up your tournament. Choose QR mode for custom fighters or manual
            mode for quick start.
          </p>

          {/* Mode toggle */}
          <div className="setup-mode-toggle">
            <button
              className={`setup-mode-btn${setupMode === "manual" ? " active" : ""}`}
              onClick={() => setSetupMode("manual")}
            >
              Manual Entry
            </button>
            <button
              className={`setup-mode-btn${setupMode === "qr" ? " active" : ""}`}
              onClick={() => setSetupMode("qr")}
            >
              QR Code Join
            </button>
          </div>

          <div className="setup-card">
            {setupMode === "manual" ? (
              <>
                <label>Fighter Names</label>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={"Daniel\nNoah\nShira\nGil\nIdo"}
                />
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                    marginTop: 16,
                  }}
                >
                  <button className="btn-cyber" onClick={startTournament}>
                    ⚔ Enter Arena
                  </button>
                  <button
                    className="btn-ghost"
                    onClick={() => setInput(SAMPLE_PEOPLE.join("\n"))}
                  >
                    Load Example
                  </button>
                  <button className="btn-danger" onClick={() => setInput("")}>
                    Clear
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* QR Code */}
                <div className="qr-section">
                  <QRCodeSVG
                    value={`${window.location.origin}/join`}
                    size={180}
                    bgColor="#ffffff"
                    fgColor="#0a0a12"
                    level="M"
                  />
                  <div className="qr-url">{window.location.origin}/join</div>
                </div>

                {/* Player Lobby */}
                <div className="player-lobby">
                  <div className="player-lobby-title">
                    <span>Players Joined</span>
                    <span className="player-lobby-count">
                      {lobbyPlayers.length}
                    </span>
                  </div>
                  {lobbyPlayers.length === 0 ? (
                    <div className="lobby-empty">
                      Waiting for players to scan the QR code...
                    </div>
                  ) : (
                    lobbyPlayers.map((p) => (
                      <div key={p.id} className="lobby-player">
                        <span className="lobby-player-emoji">{p.emoji}</span>
                        <span className="lobby-player-name">{p.name}</span>
                        <button
                          className="lobby-player-remove"
                          onClick={() => removeLobbyPlayer(p.id)}
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Manual add in QR mode */}
                <div className="manual-add-form">
                  <label className="join-label">Add Player Manually</label>
                  <div className="manual-add-row">
                    <input
                      type="text"
                      placeholder="Player name..."
                      value={manualAddName}
                      onChange={(e) => setManualAddName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addManualPlayer()}
                    />
                    <button className="btn-cyber" onClick={addManualPlayer}>
                      Add
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                    marginTop: 8,
                  }}
                >
                  <button
                    className="btn-cyber"
                    onClick={startTournament}
                    disabled={lobbyPlayers.length < 2}
                  >
                    ⚔ Start Tournament ({lobbyPlayers.length} players)
                  </button>
                  <button
                    className="btn-danger"
                    onClick={() => setLobbyPlayers([])}
                    disabled={lobbyPlayers.length === 0}
                  >
                    Clear All
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══ BATTLE PHASE ═══ */}
      {phase === "battle" && currentPair && (
        <div className="battle-screen phase-enter">
          {/* Bracket strip */}
          <div className="bracket-strip">
            <span className="match-info">{progressLabel}</span>
            {allFighters.map((f) => (
              <span key={f.name} className={getBracketClass(f)}>
                {f.name}
              </span>
            ))}
          </div>

          {/* HUD Bar */}
          <div className="hud-bar">
            {/* Fighter A HUD */}
            <div className="hud-fighter">
              <div className="hud-avatar">
                {currentPair[0].emoji || getEmoji(currentPair[0].name)}
              </div>
              <div className="hud-bars">
                <div className="hud-name">{currentPair[0].name}</div>
                <div className="hp-bar-outer">
                  <div
                    className="hp-bar-inner"
                    ref={hpBarARef}
                    style={{ width: "100%" }}
                  />
                </div>
                <div className="hp-text" ref={hpTextARef}>
                  100/100
                </div>
                <div className="nrg-bar-outer">
                  <div
                    className="nrg-bar-inner"
                    ref={nrgBarARef}
                    style={{ width: "0%" }}
                  />
                </div>
              </div>
            </div>

            {/* Center VS */}
            <div className="hud-center">
              <div className="hud-vs" ref={vsRef}>
                VS
              </div>
              <div className="hud-turn" ref={turnRef}>
                Turn 0
              </div>
            </div>

            {/* Fighter B HUD */}
            <div className="hud-fighter right">
              <div className="hud-avatar">
                {currentPair[1].emoji || getEmoji(currentPair[1].name)}
              </div>
              <div className="hud-bars">
                <div className="hud-name">{currentPair[1].name}</div>
                <div className="hp-bar-outer">
                  <div
                    className="hp-bar-inner"
                    ref={hpBarBRef}
                    style={{ width: "100%" }}
                  />
                </div>
                <div className="hp-text" ref={hpTextBRef}>
                  100/100
                </div>
                <div className="nrg-bar-outer">
                  <div
                    className="nrg-bar-inner"
                    ref={nrgBarBRef}
                    style={{ width: "0%" }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Arena Stage */}
          <div className="arena-stage" ref={arenaStageRef}>
            <div className="arena-bg" />
            <div className="arena-floor" />
            <div className="particle-container" ref={particleRef} />
            <div className="major-event-vignette" ref={vignetteRef} />
            <div className="countdown-overlay" ref={countdownOverlayRef}>
              <div className="countdown-number" ref={countdownNumberRef}>
                3
              </div>
              <div className="countdown-sub" ref={countdownSubRef} />
            </div>

            {/* Fighters */}
            <div className="arena-fighters">
              <div className="fighter side-a" ref={fighterARef}>
                <div className="fighter-emoji">
                  {currentPair[0].emoji || getEmoji(currentPair[0].name)}
                </div>
                <div className="fighter-name">{currentPair[0].name}</div>
                <div className="fighter-buffs" ref={buffsARef} />
                <div className="fighter-wins">Wins: {currentPair[0].wins}</div>
                <div className="fighter-stats" ref={statsARef} />
              </div>

              <div className="arena-vs">VS</div>

              <div className="fighter side-b" ref={fighterBRef}>
                <div className="fighter-emoji">
                  {currentPair[1].emoji || getEmoji(currentPair[1].name)}
                </div>
                <div className="fighter-name">{currentPair[1].name}</div>
                <div className="fighter-buffs" ref={buffsBRef} />
                <div className="fighter-wins">Wins: {currentPair[1].wins}</div>
                <div className="fighter-stats" ref={statsBRef} />
              </div>
            </div>

            {/* Scrolling Battle Log Overlay */}
            {showLog && <div className="log-overlay" ref={logBodyRef} />}

            {/* Action Banner Stage — now at bottom */}
            <div className="banner-stage" ref={bannerStageRef} />
          </div>

          {/* Bet QR overlay */}
          <div className="bet-qr-float">
            <QRCodeSVG
              value={`${window.location.origin}/bet`}
              size={64}
              bgColor="#ffffff"
              fgColor="#0a0a12"
              level="L"
            />
            <span className="bet-qr-label">Bet Here</span>
          </div>

          {/* Battle Controls */}
          <div className="battle-controls">
            <button
              className="fight-btn"
              disabled={!currentPair || isBusy}
              onClick={fightCurrentMatch}
            >
              Fight
            </button>
            <button
              className="btn-ghost"
              disabled={!currentPair || isBusy}
              onClick={skipFight}
            >
              Skip
            </button>
            <button
              className="btn-cyber"
              disabled={!currentPair}
              onClick={runWholeTournament}
            >
              Auto Run
            </button>
            <button className="btn-ghost" onClick={startTournament}>
              Restart
            </button>
          </div>
        </div>
      )}

      {/* ═══ CHAMPION PHASE ═══ */}
      {phase === "done" && champion && (
        <div className="champion-screen phase-enter">
          <div className="champion-label">Office Champion</div>
          <div className="champion-emoji">
            {champion.emoji || getEmoji(champion.name)}
          </div>
          <div className="champion-name">{champion.name}</div>
          <p className="champion-subtitle">
            After {roundRef.current.totalPlayed} battles, {champion.name} stands
            victorious. No appeals.
          </p>

          {/* Leaderboard */}
          <div className="leaderboard">
            {sorted.map((f, i) => (
              <div
                key={f.name}
                className="lb-row"
                style={{ animation: `logIn .4s ease ${i * 0.08}s both` }}
              >
                <span className="lb-name">
                  <span>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "▪"}
                  </span>
                  <span>
                    {f.emoji || getEmoji(f.name)} {f.name}
                  </span>
                </span>
                <span className="lb-wins">{f.wins}W</span>
              </div>
            ))}
          </div>

          <button className="btn-cyber" onClick={() => setPhase("setup")}>
            New Tournament
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
