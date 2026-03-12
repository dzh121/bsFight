import { useState, useEffect, useRef, useCallback } from "react";
import "./styles/battle.css";

const STAT_KEYS = ["power", "speed", "hype", "chaos", "luck", "defense", "focus", "stamina", "wit", "grit", "swagger"];
const STAT_LABELS = {
  power: "Power",
  speed: "Speed",
  hype: "Hype",
  chaos: "Chaos",
  luck: "Luck",
  defense: "Defense",
  focus: "Focus",
  stamina: "Stamina",
  wit: "Wit",
  grit: "Grit",
  swagger: "Swagger",
};
const STAT_DESCRIPTIONS = {
  power: "Raw damage output. Affects base damage, special move power, and Execute finisher damage (synergizes with Grit).",
  speed: "Dodge chance, Double Strike, and Momentum buildup. Fast fighters get a first-strike bonus in early turns and reduce burn damage.",
  hype: "Fuels Buff triggers, Lifesteal, and Intimidate (with Swagger). High hype boosts rage damage and crowd reactions.",
  chaos: "Critical hits, Stun attacks, and Burn. Boosts Sabotage amount (with Wit). Warning: high chaos has a backfire risk!",
  luck: "Healing triggers, Counter Attacks, and Lucky Save (5% chance to survive a killing blow at 1 HP). Adds random bonus damage.",
  defense: "Reduces all incoming damage. Enables Shield and Reflect. Also reduces poison/burn tick damage and resists Sabotage.",
  focus: "Boosts energy gain and Special Move rate. Increases crit damage multiplier. At high focus, combo threshold drops to 2 hits.",
  stamina: "Heal amount, Shield HP, and Cleanse trigger (with Wit). High stamina resists stun duration.",
  wit: "Cleverness stat. Powers Counter damage, Sabotage, Poison (moved from Chaos), and Cleanse. Adds a small dodge bonus and extends debuffs.",
  grit: "Resilience stat. Comeback damage when below 30% HP. Enables Execute (with Power), resists burn/poison, and boosts Momentum.",
  swagger: "Intimidation stat. Triggers Intimidate (weakens enemy attacks), boosts Lifesteal, enables crowd favor buffs, and Morale Break.",
};
const STAT_ICONS = {
  power: "💪", speed: "⚡", hype: "🔥", chaos: "🌀",
  luck: "🎲", defense: "🛡", focus: "🎯", stamina: "🏋️",
  wit: "🧠", grit: "💎", swagger: "😏",
};
const TOTAL_BUDGET = 55;
const MIN_STAT = 1;
const MAX_STAT = 10;
const INITIAL_STATS = Object.fromEntries(STAT_KEYS.map((k) => [k, MIN_STAT]));

const EMOJI_OPTIONS = [
  "😎",
  "🤖",
  "👾",
  "🦾",
  "🧙",
  "🥷",
  "🦊",
  "🐉",
  "👻",
  "💀",
  "🔥",
  "⚡",
  "🌟",
  "🎯",
  "🗡️",
  "🛡️",
  "🏴‍☠️",
  "🦁",
  "🐺",
  "🦅",
  "🧛",
  "🧟",
  "🧞",
  "🦸",
  "🦹",
  "🤺",
  "🏋️",
  "🚀",
  "💎",
  "🎪",
  "🐍",
  "🦈",
  "🐙",
  "🦂",
  "🐲",
  "🌪️",
  "☄️",
  "🌋",
  "🎭",
  "🃏",
];

export default function JoinPage() {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("😎");
  const [stats, setStats] = useState({ ...INITIAL_STATS });
  const [status, setStatus] = useState("idle"); // idle | connecting | joined | started | removed | champion
  const [confirmedPlayer, setConfirmedPlayer] = useState(null);
  const [expandedStat, setExpandedStat] = useState(null);
  const wsRef = useRef(null);

  // Live fight state
  const [match, setMatch] = useState(null);
  const [actionLog, setActionLog] = useState([]);
  const [championData, setChampionData] = useState(null);

  // Player-controlled turn state
  const [turnOptions, setTurnOptions] = useState(null); // action options from host
  const [turnTimer, setTurnTimer] = useState(0);
  const [selectedAction, setSelectedAction] = useState(null);
  const [turnPhase, setTurnPhase] = useState("spectating"); // spectating | choosing | chosen | waiting
  const [turnBattleState, setTurnBattleState] = useState(null);
  const turnTimerRef = useRef(null);

  // Betting state
  const [survivors, setSurvivors] = useState([]);
  const [amEliminated, setAmEliminated] = useState(false);
  const [bet, setBet] = useState(null);         // { name, emoji }
  const [betWins, setBetWins] = useState(0);
  const [betLocked, setBetLocked] = useState(false);
  const bannerKeyRef = useRef(0);
  const betRef = useRef(null);
  const matchClearTimerRef = useRef(null);

  const usedPoints = Object.values(stats).reduce((a, b) => a + b, 0);
  const remaining = TOTAL_BUDGET - usedPoints;

  const changeStat = useCallback((key, delta) => {
    setStats((prev) => {
      const next = { ...prev };
      const val = next[key] + delta;
      if (val < MIN_STAT || val > MAX_STAT) return prev;
      const newUsed =
        Object.values(next).reduce((a, b) => a + b, 0) - next[key] + val;
      if (newUsed > TOTAL_BUDGET) return prev;
      next[key] = val;
      return next;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (matchClearTimerRef.current) clearTimeout(matchClearTimerRef.current);
      if (turnTimerRef.current) clearInterval(turnTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!wsRef.current) return;
    const ws = wsRef.current;
    const handler = (e) => {
      let msg;
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }
      if (msg.type === "joinConfirmed") {
        setConfirmedPlayer(msg.player);
        setStatus("joined");
      }
      if (msg.type === "gameStarted") {
        setStatus("started");
        setAmEliminated(false);
        setBet(null);
        betRef.current = null;
        setBetWins(0);
        setBetLocked(false);
        if (msg.fighters) setSurvivors(msg.fighters);
      }
      if (msg.type === "removed") setStatus("removed");
      if (msg.type === "roomReset") setStatus("removed");
      if (msg.type === "fightEvent") {
        const d = msg.data;
        if (d.event === "matchStart") {
          if (matchClearTimerRef.current) {
            clearTimeout(matchClearTimerRef.current);
            matchClearTimerRef.current = null;
          }
          setMatch({
            f1: d.f1,
            f2: d.f2,
            hp1: d.hp1,
            hp2: d.hp2,
            turn: 0,
            banner: "",
            winner: null,
          });
          setActionLog([]);
          // Reset turn state for new match
          setTurnPhase("spectating");
          setTurnOptions(null);
          setSelectedAction(null);
          if (turnTimerRef.current) { clearInterval(turnTimerRef.current); turnTimerRef.current = null; }
        }
        if (d.event === "action") {
          bannerKeyRef.current++;
          setMatch((prev) =>
            prev
              ? {
                  ...prev,
                  hp1: d.hp1,
                  hp2: d.hp2,
                  banner: d.banner,
                  bannerZone: d.bannerZone || "center",
                  bannerType: d.bannerType || "",
                  bannerKey: bannerKeyRef.current,
                }
              : prev,
          );
          if (d.banner) {
            setActionLog((prev) => [
              { text: d.banner, zone: d.bannerZone || "center", type: d.bannerType || "" },
              ...prev,
            ].slice(0, 10));
          }
        }
        if (d.event === "turn") {
          setMatch((prev) =>
            prev
              ? { ...prev, hp1: d.hp1, hp2: d.hp2, turn: d.turn }
              : prev,
          );
        }
        if (d.event === "matchEnd") {
          setMatch((prev) => {
            if (!prev) return prev;
            const w = d.winner.name;
            return {
              ...prev,
              winner: d.winner,
              hp1: prev.f1.name === w ? d.winnerHp : 0,
              hp2: prev.f2.name === w ? d.winnerHp : 0,
            };
          });
          setActionLog((prev) =>
            [{ text: `🏆 ${d.winner.name} WINS!`, zone: "center", type: "ko" }, ...prev].slice(0, 10),
          );
          // Track own elimination
          if (d.loser.name === myName) {
            setAmEliminated(true);
          }
          // Clear match after delay to show between-matches waiting screen
          if (matchClearTimerRef.current) clearTimeout(matchClearTimerRef.current);
          matchClearTimerRef.current = setTimeout(() => setMatch(null), 2800);
          // Reset turn state after match ends
          setTurnPhase("spectating");
          setTurnOptions(null);
          if (turnTimerRef.current) { clearInterval(turnTimerRef.current); turnTimerRef.current = null; }
          // Track bet wins via ref (avoids stale closure)
          const currentBet = betRef.current;
          if (currentBet) {
            if (d.winner.name === currentBet.name) setBetWins((w) => w + 1);
            if (d.loser.name === currentBet.name) setBetLocked(true);
          }
        }
        if (d.event === "elimination") {
          setSurvivors(d.survivors || []);
        }
      }
      if (msg.type === "tournamentEnd") {
        setChampionData(msg.data);
        setStatus("champion");
        setTurnPhase("spectating");
        setTurnOptions(null);
        if (turnTimerRef.current) clearInterval(turnTimerRef.current);
      }
      // Player-controlled turn: host asks us to choose an action
      if (msg.type === "yourTurn") {
        setTurnOptions(msg.options || []);
        setTurnBattleState(msg.battleState || null);
        setSelectedAction(null);
        setTurnPhase("choosing");
        setTurnTimer(msg.turnTimer || 12);
        // Start countdown
        if (turnTimerRef.current) clearInterval(turnTimerRef.current);
        const startTime = Date.now();
        const totalMs = (msg.turnTimer || 12) * 1000;
        turnTimerRef.current = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const remaining = Math.max(0, Math.ceil((totalMs - elapsed) / 1000));
          setTurnTimer(remaining);
          if (remaining <= 0) {
            clearInterval(turnTimerRef.current);
            turnTimerRef.current = null;
          }
        }, 250);
      }
      if (msg.type === "waitTurn") {
        setTurnPhase("waiting");
        setTurnOptions(null);
        if (turnTimerRef.current) { clearInterval(turnTimerRef.current); turnTimerRef.current = null; }
      }
      if (msg.type === "turnSkipped") {
        setTurnPhase("spectating");
        setTurnOptions(null);
        if (turnTimerRef.current) { clearInterval(turnTimerRef.current); turnTimerRef.current = null; }
      }
    };
    ws.addEventListener("message", handler);
    return () => ws.removeEventListener("message", handler);
  }, [status]);

  const handleJoin = () => {
    if (!name.trim()) return;
    setStatus("connecting");
    const ws = new WebSocket(getWsUrl());
    wsRef.current = ws;
    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "join",
          player: { name: name.trim(), emoji, stats },
        }),
      );
    };
    ws.onerror = () => setStatus("idle");
    ws.onclose = () => {
      if (status === "connecting") setStatus("idle");
    };
  };

  const handleSelectAction = useCallback((actionId) => {
    if (selectedAction || turnPhase !== "choosing") return;
    setSelectedAction(actionId);
    setTurnPhase("chosen");
    if (turnTimerRef.current) { clearInterval(turnTimerRef.current); turnTimerRef.current = null; }
    const ws = wsRef.current;
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({ type: "selectAction", actionId }));
    }
  }, [selectedAction, turnPhase]);

  const myName = confirmedPlayer?.name;

  // ── Champion screen ──
  if (status === "champion" && championData) {
    const isMe = championData.champion.name === myName;
    return (
      <div className="join-page">
        <div className="cyber-bg" />
        <div className="join-card">
          <div className="join-status-emoji">
            {championData.champion.emoji || "🏆"}
          </div>
          <h2 className="join-title">
            {isMe ? "YOU ARE THE CHAMPION!" : "TOURNAMENT OVER"}
          </h2>
          <p className="join-player-name">{championData.champion.name}</p>
          <p className="join-subtitle">
            {isMe
              ? `After ${championData.totalPlayed} battles, you stand victorious!`
              : `${championData.champion.name} won after ${championData.totalPlayed} battles.`}
          </p>
          {bet && (
            <div className="spec-bet-result">
              <div className="spec-bet-badge">🎰 YOUR BET</div>
              <div className="spec-bet-target">{bet.emoji} {bet.name}</div>
              <div className="spec-bet-wins">
                {bet.name === championData.champion.name
                  ? `🏆 WINNER! ${betWins} wins`
                  : `${betWins} win${betWins !== 1 ? "s" : ""} before elimination`}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Live spectator view ──
  if (status === "started") {
    const isMyFight =
      match && (match.f1?.name === myName || match.f2?.name === myName);
    const amF1 = match?.f1?.name === myName;
    return (
      <div className="join-page">
        <div className="cyber-bg" />
        <div className="spec-card">
          {isMyFight && <div className="spec-your-fight">YOUR FIGHT!</div>}
          {!match ? (
            <div className="spec-waiting">
              <div className="join-status-emoji">⚔️</div>
              <h2 className="join-title">TOURNAMENT STARTED</h2>
              <p className="join-subtitle">Waiting for next match...</p>
            </div>
          ) : (
            <>
              {/* Fighter cards */}
              <div className="spec-fighters">
                <div
                  className={`spec-fighter${amF1 ? " spec-me" : ""}${match.winner && match.winner.name === match.f1.name ? " spec-winner" : ""}${match.winner && match.winner.name !== match.f1.name ? " spec-loser" : ""}`}
                >
                  <div className="spec-emoji">{match.f1.emoji || "🧑‍💼"}</div>
                  <div className="spec-name">{match.f1.name}</div>
                  <div className="spec-hp-bar">
                    <div
                      className="spec-hp-fill"
                      style={{ width: `${match.hp1}%` }}
                    />
                  </div>
                  <div className="spec-hp-text">{match.hp1} HP</div>
                </div>

                <div className="spec-vs">
                  {match.winner
                    ? "🏆"
                    : match.turn > 0
                      ? `T${match.turn}`
                      : "VS"}
                </div>

                <div
                  className={`spec-fighter${!amF1 && isMyFight ? " spec-me" : ""}${match.winner && match.winner.name === match.f2.name ? " spec-winner" : ""}${match.winner && match.winner.name !== match.f2.name ? " spec-loser" : ""}`}
                >
                  <div className="spec-emoji">{match.f2.emoji || "🧑‍💼"}</div>
                  <div className="spec-name">{match.f2.name}</div>
                  <div className="spec-hp-bar">
                    <div
                      className="spec-hp-fill"
                      style={{ width: `${match.hp2}%` }}
                    />
                  </div>
                  <div className="spec-hp-text">{match.hp2} HP</div>
                </div>
              </div>

              {/* Banner with color & animation */}
              {match.banner && (
                <div
                  key={match.bannerKey || 0}
                  className={`spec-banner spec-zone-${match.bannerZone || "center"} spec-type-${match.bannerType || "attack"}`}
                >
                  <span className="spec-banner-text">{match.banner}</span>
                </div>
              )}

              {/* Action log with colored entries */}
              {actionLog.length > 0 && (
                <div className="spec-log">
                  {actionLog.map((entry, i) => (
                    <div
                      key={i}
                      className={`spec-log-line spec-log-${entry.zone || "center"} spec-log-type-${entry.type || "attack"}`}
                      style={{ opacity: 1 - i * 0.12 }}
                    >
                      {entry.text || entry}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Player-controlled turn: action selection */}
          {isMyFight && turnPhase === "choosing" && turnOptions && (
            <div className="turn-panel">
              <div className="turn-header">
                <span className="turn-label">YOUR TURN!</span>
                <span className={`turn-timer${turnTimer <= 3 ? " urgent" : ""}`}>
                  {turnTimer}s
                </span>
              </div>
              <div className="turn-timer-bar">
                <div
                  className={`turn-timer-fill${turnTimer <= 3 ? " urgent" : ""}`}
                  style={{ width: `${(turnTimer / 12) * 100}%` }}
                />
              </div>
              {turnBattleState && (
                <div className="turn-state-row">
                  <span className="turn-state-item">❤️ {Math.round(turnBattleState.hp)}/{turnBattleState.maxHp}</span>
                  <span className="turn-state-item">⚡ {Math.round(turnBattleState.nrg)}/{turnBattleState.maxNrg}</span>
                  <span className="turn-state-item">👤 {Math.round(turnBattleState.enemyHp)} HP</span>
                </div>
              )}
              <div className="turn-actions">
                {turnOptions.map((opt) => {
                  const catClass = opt.cat === "offensive" ? "action-offensive"
                    : opt.cat === "defensive" ? "action-defensive" : "action-utility";
                  return (
                    <button
                      key={opt.id}
                      className={`action-card ${catClass}`}
                      onClick={() => handleSelectAction(opt.id)}
                    >
                      <span className="action-emoji">{opt.emoji}</span>
                      <span className="action-name">{opt.name}</span>
                      <span className="action-desc">{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {isMyFight && turnPhase === "chosen" && (
            <div className="turn-panel turn-chosen">
              <span className="turn-chosen-text">Action selected! Waiting...</span>
            </div>
          )}
          {isMyFight && turnPhase === "waiting" && (
            <div className="turn-panel turn-waiting">
              <span className="turn-waiting-text">Opponent's turn...</span>
            </div>
          )}

          {/* Betting UI for eliminated players */}
          {amEliminated && !bet && !betLocked && survivors.length > 0 && (
            <div className="spec-bet-panel">
              <div className="spec-bet-title">YOU'RE OUT! BET ON A FIGHTER</div>
              <div className="spec-bet-grid">
                {survivors
                  .filter((s) => s.name !== myName)
                  .map((s) => (
                    <button
                      key={s.name}
                      className="spec-bet-btn"
                      onClick={() => { const b = { name: s.name, emoji: s.emoji }; setBet(b); betRef.current = b; setBetWins(0); }}
                    >
                      <span className="spec-bet-emoji">{s.emoji || "🧑‍💼"}</span>
                      <span className="spec-bet-name">{s.name}</span>
                    </button>
                  ))}
              </div>
            </div>
          )}
          {bet && !betLocked && (
            <div className="spec-bet-active">
              <span className="spec-bet-badge">🎰 BETTING ON</span>
              <span className="spec-bet-target">{bet.emoji} {bet.name}</span>
              <span className="spec-bet-wins">{betWins} win{betWins !== 1 ? "s" : ""}</span>
            </div>
          )}
          {bet && betLocked && (
            <div className="spec-bet-locked">
              <span className="spec-bet-badge">💀 BET OVER</span>
              <span className="spec-bet-target">{bet.emoji} {bet.name} was eliminated</span>
              <span className="spec-bet-wins">Final: {betWins} win{betWins !== 1 ? "s" : ""}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (status === "removed") {
    return (
      <div className="join-page">
        <div className="cyber-bg" />
        <div className="join-card">
          <div className="join-status-emoji">🚫</div>
          <h2 className="join-title">DISCONNECTED</h2>
          <p className="join-subtitle">
            You were removed or the room was reset.
          </p>
          <button
            className="btn-cyber"
            onClick={() => {
              setStatus("idle");
              setConfirmedPlayer(null);
            }}
          >
            REJOIN
          </button>
        </div>
      </div>
    );
  }

  if (status === "joined" && confirmedPlayer) {
    return (
      <div className="join-page">
        <div className="cyber-bg" />
        <div className="join-card">
          <div className="join-status-emoji">{confirmedPlayer.emoji}</div>
          <h2 className="join-title">YOU'RE IN!</h2>
          <p className="join-player-name">{confirmedPlayer.name}</p>
          <div className="join-stat-summary">
            {STAT_KEYS.map((k) => (
              <div key={k} className="join-stat-row-summary">
                <span className="join-stat-label-sm">{STAT_LABELS[k]}</span>
                <div className="join-stat-bar-bg">
                  <div
                    className={`stat-bar-fill ${k}`}
                    style={{ width: `${confirmedPlayer.stats[k] * 10}%` }}
                  />
                </div>
                <span className="join-stat-val-sm">
                  {confirmedPlayer.stats[k]}
                </span>
              </div>
            ))}
          </div>
          <p className="join-subtitle">
            Waiting for the host to start the tournament...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="join-page">
      <div className="cyber-bg" />
      <div className="join-card">
        <h1 className="join-title">JOIN THE ARENA</h1>
        <p className="join-subtitle">
          Create your fighter and enter the battle
        </p>

        {/* Name */}
        <div className="join-section">
          <label className="join-label">FIGHTER NAME</label>
          <input
            className="join-input"
            type="text"
            maxLength={20}
            placeholder="Enter your name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Emoji picker */}
        <div className="join-section">
          <label className="join-label">CHOOSE YOUR ICON</label>
          <div className="join-emoji-grid">
            {EMOJI_OPTIONS.map((e) => (
              <button
                key={e}
                className={`join-emoji-btn${emoji === e ? " selected" : ""}`}
                onClick={() => setEmoji(e)}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Stat allocation */}
        <div className="join-section">
          <label className="join-label">
            ALLOCATE STATS{" "}
            <span className={`join-budget${remaining === 0 ? " full" : ""}`}>
              {remaining} pts left
            </span>
          </label>
          {STAT_KEYS.map((k) => (
            <div key={k} className="join-stat-block">
              <div className="join-stat-row">
                <button
                  className={`join-stat-info-btn${expandedStat === k ? " active" : ""}`}
                  onClick={() => setExpandedStat(expandedStat === k ? null : k)}
                  title={`What does ${STAT_LABELS[k]} do?`}
                >
                  {STAT_ICONS[k]}
                </button>
                <span className="join-stat-label">{STAT_LABELS[k]}</span>
                <button
                  className="join-stat-btn"
                  onClick={() => changeStat(k, -1)}
                  disabled={stats[k] <= MIN_STAT}
                >
                  -
                </button>
                <div className="join-stat-bar-bg">
                  <div
                    className={`stat-bar-fill ${k}`}
                    style={{ width: `${stats[k] * 10}%` }}
                  />
                </div>
                <span className="join-stat-val">{stats[k]}</span>
                <button
                  className="join-stat-btn"
                  onClick={() => changeStat(k, 1)}
                  disabled={stats[k] >= MAX_STAT || remaining <= 0}
                >
                  +
                </button>
              </div>
              {expandedStat === k && (
                <div className="join-stat-desc">
                  {STAT_DESCRIPTIONS[k]}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Submit */}
        <button
          className="fight-btn join-submit"
          onClick={handleJoin}
          disabled={!name.trim() || status === "connecting"}
        >
          {status === "connecting" ? "CONNECTING..." : "ENTER THE ARENA"}
        </button>
      </div>
    </div>
  );
}
