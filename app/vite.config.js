import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { WebSocketServer } from "ws";

function gameWsPlugin() {
  return {
    name: "game-ws",
    configureServer(server) {
      const players = new Map();
      let hostWs = null;
      let lastGameStarted = null;
      let currentMatch = null;
      let lastTournamentEnd = null;
      let fightInProgress = false;
      let lastElimination = null;

      const wss = new WebSocketServer({ noServer: true });

      server.httpServer.on("upgrade", (req, socket, head) => {
        if (req.url === "/game-ws") {
          wss.handleUpgrade(req, socket, head, (ws) => {
            wss.emit("connection", ws, req);
          });
        }
      });

      wss.on("connection", (ws) => {
        ws.on("message", (raw) => {
          let msg;
          try {
            msg = JSON.parse(raw);
          } catch {
            return;
          }

          if (msg.type === "registerHost") {
            hostWs = ws;
            // Send current player list to reconnecting host
            const list = Array.from(players.values());
            ws.send(JSON.stringify({ type: "playerList", players: list }));
          }

          if (msg.type === "join") {
            const p = { ...msg.player, id: crypto.randomUUID() };
            players.set(p.id, p);
            ws.playerId = p.id;
            ws.send(JSON.stringify({ type: "joinConfirmed", player: p }));
            if (hostWs && hostWs.readyState === 1) {
              hostWs.send(JSON.stringify({ type: "playerJoined", player: p }));
            }
          }

          if (msg.type === "removePlayer" && msg.playerId) {
            players.delete(msg.playerId);
            // Notify all player connections
            wss.clients.forEach((c) => {
              if (c.playerId === msg.playerId && c.readyState === 1) {
                c.send(JSON.stringify({ type: "removed" }));
              }
            });
          }

          if (msg.type === "resetRoom") {
            players.clear();
            lastGameStarted = null;
            currentMatch = null;
            lastTournamentEnd = null;
            fightInProgress = false;
            lastElimination = null;
            wss.clients.forEach((c) => {
              if (c !== ws && c.readyState === 1) {
                c.send(JSON.stringify({ type: "roomReset" }));
              }
            });
          }

          if (msg.type === "betSpectator") {
            ws.isBetSpectator = true;
            if (lastGameStarted) {
              ws.send(JSON.stringify(lastGameStarted));
            }
            if (lastTournamentEnd) {
              ws.send(JSON.stringify(lastTournamentEnd));
            } else if (currentMatch) {
              ws.send(
                JSON.stringify({ type: "fightEvent", data: currentMatch }),
              );
              if (fightInProgress) {
                ws.send(
                  JSON.stringify({
                    type: "fightEvent",
                    data: { event: "fightInProgress" },
                  }),
                );
              }
            } else if (lastElimination) {
              // Joined between matches — push into live mode with current survivors
              ws.send(
                JSON.stringify({
                  type: "fightEvent",
                  data: { event: "tournamentInProgress", ...lastElimination },
                }),
              );
            }
          }

          if (msg.type === "gameStarted") {
            lastGameStarted = { type: "gameStarted", fighters: msg.fighters };
            currentMatch = null;
            lastTournamentEnd = null;
            fightInProgress = false;
            lastElimination = null;
            wss.clients.forEach((c) => {
              if (c !== ws && c.readyState === 1) {
                c.send(JSON.stringify(lastGameStarted));
              }
            });
          }

          if (msg.type === "fightEvent") {
            if (msg.data && msg.data.event === "matchStart") {
              currentMatch = msg.data;
              fightInProgress = false;
            }
            if (msg.data && msg.data.event === "action") {
              fightInProgress = true;
            }
            if (msg.data && msg.data.event === "matchEnd") {
              currentMatch = null;
              fightInProgress = false;
            }
            if (msg.data && msg.data.event === "elimination") {
              lastElimination = msg.data;
            }
            wss.clients.forEach((c) => {
              if (c !== ws && c.readyState === 1) {
                c.send(JSON.stringify({ type: "fightEvent", data: msg.data }));
              }
            });
          }

          // ── Player-controlled turn messages ──

          // Host sends targeted message to a specific player by ID
          if (msg.type === "targetPlayer" && msg.playerId && msg.payload) {
            wss.clients.forEach((c) => {
              if (c.playerId === msg.playerId && c.readyState === 1) {
                c.send(JSON.stringify(msg.payload));
              }
            });
          }

          // Host broadcasts to all connected players (not spectators)
          if (msg.type === "broadcastPlayers" && msg.payload) {
            wss.clients.forEach((c) => {
              if (c.playerId && c.readyState === 1) {
                c.send(JSON.stringify(msg.payload));
              }
            });
          }

          // Player sends their chosen action — relay to host
          if (msg.type === "selectAction" && ws.playerId) {
            if (hostWs && hostWs.readyState === 1) {
              hostWs.send(JSON.stringify({
                type: "playerAction",
                playerId: ws.playerId,
                actionId: msg.actionId,
              }));
            }
          }

          if (msg.type === "tournamentEnd") {
            lastTournamentEnd = { type: "tournamentEnd", data: msg.data };
            currentMatch = null;
            fightInProgress = false;
            wss.clients.forEach((c) => {
              if (c !== ws && c.readyState === 1) {
                c.send(JSON.stringify(lastTournamentEnd));
              }
            });
          }
        });

        ws.on("close", () => {
          if (ws.playerId && players.has(ws.playerId)) {
            const p = players.get(ws.playerId);
            players.delete(ws.playerId);
            if (hostWs && hostWs.readyState === 1) {
              hostWs.send(JSON.stringify({ type: "playerLeft", player: p }));
              // Notify host that this player disconnected (for mid-fight handling)
              hostWs.send(JSON.stringify({ type: "playerDisconnected", playerId: ws.playerId }));
            }
          }
          if (ws === hostWs) hostWs = null;
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), gameWsPlugin()],
  server: {
    host: true,
  },
});
