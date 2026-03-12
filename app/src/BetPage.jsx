import { useState, useEffect, useRef } from "react";
import "./styles/battle.css";

const STAT_ICONS = {
  power: "💪",
  speed: "⚡",
  hype: "🔥",
  chaos: "🌀",
  luck: "🎲",
  defense: "🛡",
  focus: "🎯",
  stamina: "🏋️",
  wit: "🧠",
  grit: "💎",
  swagger: "😏",
};

const STAT_KEYS = Object.keys(STAT_ICONS);

function getWsUrl() {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${location.host}/game-ws`;
}

export default function BetPage() {
  const [status, setStatus] = useState("waiting"); // waiting | betting | live | done
  const [fighters, setFighters] = useState([]);
  const [survivors, setSurvivors] = useState([]);

  // Champion bet
  const [champBet, setChampBet] = useState(null);
  const [champLocked, setChampLocked] = useState(false);

  // Per-fight bet
  const [fightBet, setFightBet] = useState(null);
  const [fightBetLocked, setFightBetLocked] = useState(false);
  const [fightBetResult, setFightBetResult] = useState(null); // "won" | "lost" | null
  const [betCountdown, setBetCountdown] = useState(0);

  // Score tracking
  const [score, setScore] = useState({ fightWins: 0, fightTotal: 0 });

  // Live match state
  const [match, setMatch] = useState(null);
  const [actionLog, setActionLog] = useState([]);
  const [championData, setChampionData] = useState(null);

  // Expanded fighter card
  const [expandedFighter, setExpandedFighter] = useState(null);

  const wsRef = useRef(null);
  const champBetRef = useRef(null);
  const fightBetRef = useRef(null);
  const bannerKeyRef = useRef(0);
  const betTimerRef = useRef(null);
  const matchClearTimerRef = useRef(null);

  const BET_WINDOW_SECS = 8;

  useEffect(() => {
    const ws = new WebSocket(getWsUrl());
    wsRef.current = ws;
    ws.onopen = () => ws.send(JSON.stringify({ type: "betSpectator" }));

    ws.onmessage = (e) => {
      let msg;
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }

      if (msg.type === "gameStarted") {
        const f = msg.fighters || [];
        setFighters(f);
        setSurvivors(f);
        setStatus("betting");
        setChampBet(null);
        setChampLocked(false);
        setFightBet(null);
        setFightBetLocked(false);
        setFightBetResult(null);
        setScore({ fightWins: 0, fightTotal: 0 });
        setMatch(null);
        setActionLog([]);
        setChampionData(null);
        setExpandedFighter(null);
        champBetRef.current = null;
        fightBetRef.current = null;
      }

      if (msg.type === "fightEvent") {
        const d = msg.data;

        if (d.event === "matchStart") {
          if (matchClearTimerRef.current) {
            clearTimeout(matchClearTimerRef.current);
            matchClearTimerRef.current = null;
          }
          setStatus("live");
          setFightBet(null);
          setFightBetLocked(false);
          setFightBetResult(null);
          fightBetRef.current = null;
          setMatch({
            f1: d.f1,
            f2: d.f2,
            hp1: d.hp1,
            hp2: d.hp2,
          });
          setActionLog([]);

          // Start bet countdown timer
          if (betTimerRef.current) clearInterval(betTimerRef.current);
          let remaining = BET_WINDOW_SECS;
          setBetCountdown(remaining);
          betTimerRef.current = setInterval(() => {
            remaining--;
            setBetCountdown(remaining);
            if (remaining <= 0) {
              clearInterval(betTimerRef.current);
              betTimerRef.current = null;
              setFightBetLocked(true);
            }
          }, 1000);
        }

        if (d.event === "fightInProgress") {
          setFightBetLocked(true);
          setBetCountdown(0);
          if (betTimerRef.current) {
            clearInterval(betTimerRef.current);
            betTimerRef.current = null;
          }
          if (!champLocked) {
            setChampLocked(true);
          }
        }

        if (d.event === "tournamentInProgress") {
          setStatus("live");
          setChampLocked(true);
          if (d.survivors) setSurvivors(d.survivors);
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
            setActionLog((prev) =>
              [
                {
                  text: d.banner,
                  zone: d.bannerZone || "center",
                  type: d.bannerType || "",
                },
                ...prev,
              ].slice(0, 10),
            );
          }
        }

        if (d.event === "turn") {
          setMatch((prev) =>
            prev ? { ...prev, hp1: d.hp1, hp2: d.hp2 } : prev,
          );
        }

        if (d.event === "matchEnd") {
          // Clear bet timer
          if (betTimerRef.current) {
            clearInterval(betTimerRef.current);
            betTimerRef.current = null;
          }
          setFightBetLocked(true);
          setBetCountdown(0);
          setMatch((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              hp1: d.winner.name === prev.f1?.name ? d.winnerHp : 0,
              hp2: d.winner.name === prev.f2?.name ? d.winnerHp : 0,
              banner: `🏆 ${d.winner.name} WINS!`,
              bannerZone: "center",
              bannerType: "ko",
              bannerKey: ++bannerKeyRef.current,
            };
          });
          setActionLog((prev) =>
            [
              { text: `🏆 ${d.winner.name} WINS!`, zone: "center", type: "ko" },
              ...prev,
            ].slice(0, 10),
          );

          // Resolve per-fight bet
          const fb = fightBetRef.current;
          if (fb) {
            const won = d.winner.name === fb.name;
            setFightBetResult(won ? "won" : "lost");
            setScore((prev) => ({
              fightWins: prev.fightWins + (won ? 1 : 0),
              fightTotal: prev.fightTotal + 1,
            }));
          }
          // Clear match after delay to show between-matches survivors screen
          if (matchClearTimerRef.current) clearTimeout(matchClearTimerRef.current);
          matchClearTimerRef.current = setTimeout(() => setMatch(null), 2800);
        }

        if (d.event === "elimination") {
          setSurvivors(d.survivors || []);
        }
      }

      if (msg.type === "tournamentEnd") {
        setStatus("done");
        setChampionData(msg.data);
      }

      if (msg.type === "roomReset") {
        if (betTimerRef.current) { clearInterval(betTimerRef.current); betTimerRef.current = null; }
        if (matchClearTimerRef.current) { clearTimeout(matchClearTimerRef.current); matchClearTimerRef.current = null; }
        setStatus("waiting");
        setFighters([]);
        setSurvivors([]);
        setChampBet(null);
        setChampLocked(false);
        setFightBet(null);
        setFightBetLocked(false);
        setFightBetResult(null);
        setBetCountdown(0);
        setMatch(null);
        setActionLog([]);
        setChampionData(null);
        setScore({ fightWins: 0, fightTotal: 0 });
        champBetRef.current = null;
        fightBetRef.current = null;
      }
    };

    return () => {
      ws.close();
      if (betTimerRef.current) clearInterval(betTimerRef.current);
      if (matchClearTimerRef.current) clearTimeout(matchClearTimerRef.current);
    };
  }, []);

  // Lock champion bet
  const lockChampBet = (fighter) => {
    setChampBet(fighter);
    setChampLocked(true);
    champBetRef.current = fighter;
  };

  // Place per-fight bet
  const placeFightBet = (fighter) => {
    if (fightBetLocked) return;
    setFightBet(fighter);
    fightBetRef.current = fighter;
  };

  const champCorrect =
    championData &&
    champBetRef.current &&
    championData.champion.name === champBetRef.current.name;

  // ── WAITING screen ──
  if (status === "waiting") {
    return (
      <div className="join-page">
        <div className="bet-waiting">
          <div className="bet-logo">🎰</div>
          <h1 className="bet-title">FIGHT BETS</h1>
          <p className="bet-subtitle">Waiting for tournament to start...</p>
          <div className="bet-pulse-ring" />
        </div>
      </div>
    );
  }

  // ── CHAMPION screen ──
  if (status === "done" && championData) {
    return (
      <div className="join-page">
        <div className="bet-card bet-done">
          <div className="bet-champ-crown">👑</div>
          <div className="bet-champ-emoji">
            {championData.champion.emoji || "🏆"}
          </div>
          <div className="bet-champ-name">{championData.champion.name}</div>
          <div className="bet-champ-label">TOURNAMENT CHAMPION</div>

          {champBetRef.current && (
            <div
              className={`bet-result-card ${champCorrect ? "bet-win" : "bet-lose"}`}
            >
              <div className="bet-result-badge">
                {champCorrect ? "🎉 CHAMPION BET WON!" : "💀 CHAMPION BET LOST"}
              </div>
              <div className="bet-result-pick">
                You picked: {champBetRef.current.emoji}{" "}
                {champBetRef.current.name}
              </div>
            </div>
          )}

          <div className="bet-score-final">
            <div className="bet-score-label">FIGHT BETS</div>
            <div className="bet-score-val">
              {score.fightWins} / {score.fightTotal} correct
            </div>
            <div className="bet-score-pct">
              {score.fightTotal > 0
                ? Math.round((score.fightWins / score.fightTotal) * 100)
                : 0}
              % accuracy
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── BETTING phase (before fights start) ──
  if (status === "betting" && !champLocked) {
    return (
      <div className="join-page">
        <div className="bet-card">
          <div className="bet-header">
            <span className="bet-header-icon">🎰</span>
            <h2 className="bet-header-title">PICK YOUR CHAMPION</h2>
            <p className="bet-header-sub">
              Who will win the whole tournament?{" "}
              <b>Tap PICK</b> to bet, or tap a name to see stats first.
            </p>
          </div>

          <div className="bet-fighter-grid">
            {fighters.map((f) => (
              <div key={f.name} className="bet-fighter-cell">
                <div className="bet-fighter-row">
                  <div className="bet-fighter-info-col">
                    <button
                      className={`bet-fighter-info-btn${expandedFighter === f.name ? " expanded" : ""}`}
                      onClick={() =>
                        setExpandedFighter(
                          expandedFighter === f.name ? null : f.name,
                        )
                      }
                    >
                      <span className="bet-fighter-emoji">{f.emoji || "🧑‍💼"}</span>
                      <span className="bet-fighter-name">{f.name}</span>
                      <span className="bet-info-chevron">{expandedFighter === f.name ? "▲" : "▼"}</span>
                    </button>
                    {expandedFighter === f.name && (
                      <div className="bet-fighter-stats">
                        {f.stats &&
                          STAT_KEYS.map(
                            (k) =>
                              f.stats[k] !== undefined && (
                                <div key={k} className="bet-stat-row">
                                  <span className="bet-stat-icon">
                                    {STAT_ICONS[k]}
                                  </span>
                                  <span className="bet-stat-label">{k}</span>
                                  <div className="bet-stat-bar-bg">
                                    <div
                                      className={`bet-stat-bar-fill ${k}`}
                                      style={{
                                        width: `${Math.min(100, f.stats[k])}%`,
                                      }}
                                    />
                                  </div>
                                  <span className="bet-stat-val">{f.stats[k]}</span>
                                </div>
                              ),
                          )}
                      </div>
                    )}
                  </div>
                  <button
                    className="bet-pick-btn"
                    onClick={() => lockChampBet(f)}
                  >
                    PICK
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            className="bet-skip-btn"
            onClick={() => setChampLocked(true)}
          >
            ⏭ SKIP — Just Spectate
          </button>
        </div>
      </div>
    );
  }

  // ── LIVE spectator + per-fight betting ──
  return (
    <div className="join-page">
      <div className="bet-card bet-live">
        {/* Champion bet badge */}
        {champBetRef.current && (
          <div className="bet-champ-badge">
            👑 Champion Bet: {champBetRef.current.emoji}{" "}
            {champBetRef.current.name}
          </div>
        )}

        {/* Score bar */}
        <div className="bet-score-bar">
          <span>
            🎰 Fight Bets: {score.fightWins}/{score.fightTotal}
          </span>
          <span>
            {score.fightTotal > 0
              ? Math.round((score.fightWins / score.fightTotal) * 100)
              : 0}
            %
          </span>
        </div>

        {/* Current match display */}
        {match && (
          <>
            <div className="spec-fighters">
              <div
                className={`spec-fighter${fightBet?.name === match.f1?.name ? " bet-selected" : ""}`}
              >
                <div className="spec-emoji">{match.f1?.emoji || "🧑‍💼"}</div>
                <div className="spec-name">{match.f1?.name}</div>
                <div className="spec-hp-bar">
                  <div
                    className="spec-hp-fill"
                    style={{ width: `${match.hp1}%` }}
                  />
                </div>
                <div className="spec-hp-text">{Math.round(match.hp1)} HP</div>
              </div>
              <div className="spec-vs">VS</div>
              <div
                className={`spec-fighter${fightBet?.name === match.f2?.name ? " bet-selected" : ""}`}
              >
                <div className="spec-emoji">{match.f2?.emoji || "🧑‍💼"}</div>
                <div className="spec-name">{match.f2?.name}</div>
                <div className="spec-hp-bar">
                  <div
                    className="spec-hp-fill"
                    style={{ width: `${match.hp2}%` }}
                  />
                </div>
                <div className="spec-hp-text">{Math.round(match.hp2)} HP</div>
              </div>
            </div>

            {/* Banner */}
            {match.banner && (
              <div
                key={match.bannerKey || 0}
                className={`spec-banner spec-zone-${match.bannerZone || "center"} spec-type-${match.bannerType || "attack"}`}
              >
                <span className="spec-banner-text">{match.banner}</span>
              </div>
            )}

            {/* Per-fight bet UI */}
            {!fightBetLocked && !fightBet && match.f1 && match.f2 && (
              <div className="bet-fight-panel">
                <div className="bet-fight-title">
                  ⚡ QUICK BET — Who wins this fight?
                  {betCountdown > 0 && (
                    <span className={`bet-countdown${betCountdown <= 3 ? " urgent" : ""}`}> ({betCountdown}s)</span>
                  )}
                </div>
                <div className="bet-fight-btns">
                  <button
                    className="bet-fight-pick bet-pick-a"
                    onClick={() => placeFightBet(match.f1)}
                  >
                    {match.f1.emoji} {match.f1.name}
                  </button>
                  <button
                    className="bet-fight-pick bet-pick-b"
                    onClick={() => placeFightBet(match.f2)}
                  >
                    {match.f2.emoji} {match.f2.name}
                  </button>
                </div>
              </div>
            )}
            {fightBet && !fightBetResult && (
              <div className="bet-fight-active">
                🎯 Bet: {fightBet.emoji} {fightBet.name}
              </div>
            )}
            {fightBetResult && (
              <div
                className={`bet-fight-result ${fightBetResult === "won" ? "bet-win" : "bet-lose"}`}
              >
                {fightBetResult === "won" ? "✅ Correct!" : "❌ Wrong!"} —{" "}
                {fightBet?.emoji} {fightBet?.name}
              </div>
            )}

            {/* Action log */}
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

        {/* Between matches — waiting for next fight */}
        {!match && (
          <div className="bet-between">
            <div className="bet-between-icon">⏳</div>
            <div className="bet-between-text">Waiting for next match...</div>
            <div className="bet-survivors-label">Remaining Fighters</div>
            <div className="bet-survivors-grid">
              {survivors.map((s) => (
                <div key={s.name} className="bet-survivor">
                  <span>{s.emoji || "🧑‍💼"}</span>
                  <span>{s.name}</span>
                  {s.wins > 0 && (
                    <span className="bet-survivor-wins">{s.wins}W</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
