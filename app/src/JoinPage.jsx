import { useState, useEffect, useRef, useCallback } from "react";
import "./styles/battle.css";

const STAT_KEYS = ["power", "speed", "hype", "chaos", "luck", "defense", "focus", "stamina"];
const STAT_LABELS = {
  power: "Power",
  speed: "Speed",
  hype: "Hype",
  chaos: "Chaos",
  luck: "Luck",
  defense: "Defense",
  focus: "Focus",
  stamina: "Stamina",
};
const STAT_DESCRIPTIONS = {
  power: "Raw damage output. Higher power means your normal attacks and combos hit harder. Affects base damage on every strike.",
  speed: "Determines dodge chance and enables Double Strike — a bonus second hit after your normal attack. Fast fighters are hard to pin down.",
  hype: "Fuels Lifesteal (drain HP from enemies) and Buff triggers. High hype fighters power up more often and steal health when low.",
  chaos: "Increases critical hit chance, Stun attacks, Poison, and Burn triggers. Chaotic fighters are unpredictable and dangerous.",
  luck: "Boosts healing triggers when HP is low and powers Counter Attacks — striking back right after being hit.",
  defense: "Reduces incoming damage and enables Shield (absorbs hits) and Reflect (bounces damage back). Tanky fighters last longer.",
  focus: "Boosts energy gain each turn and increases Special Move trigger rate. Focused fighters unleash powerful specials more often.",
  stamina: "Increases heal amount and Shield HP. High stamina fighters recover more and build stronger barriers.",
};
const STAT_ICONS = {
  power: "💪", speed: "⚡", hype: "🔥", chaos: "🌀",
  luck: "🎲", defense: "🛡", focus: "🎯", stamina: "🏋️",
};
const TOTAL_BUDGET = 40;
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

function getWsUrl() {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${location.host}/game-ws`;
}

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
      if (msg.type === "gameStarted") setStatus("started");
      if (msg.type === "removed") setStatus("removed");
      if (msg.type === "roomReset") setStatus("removed");
      if (msg.type === "fightEvent") {
        const d = msg.data;
        if (d.event === "matchStart") {
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
        }
        if (d.event === "turn") {
          setMatch((prev) =>
            prev
              ? {
                  ...prev,
                  hp1: d.hp1,
                  hp2: d.hp2,
                  turn: d.turn,
                  banner: d.banner,
                }
              : prev,
          );
          setActionLog((prev) => [d.banner, ...prev].slice(0, 8));
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
            [`🏆 ${d.winner.name} WINS!`, ...prev].slice(0, 8),
          );
        }
      }
      if (msg.type === "tournamentEnd") {
        setChampionData(msg.data);
        setStatus("champion");
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

              {/* Banner */}
              {match.banner && (
                <div className="spec-banner">{match.banner}</div>
              )}

              {/* Action log */}
              {actionLog.length > 0 && (
                <div className="spec-log">
                  {actionLog.map((line, i) => (
                    <div
                      key={i}
                      className="spec-log-line"
                      style={{ opacity: 1 - i * 0.1 }}
                    >
                      {line}
                    </div>
                  ))}
                </div>
              )}
            </>
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
