use futures_util::{SinkExt, StreamExt};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::Mutex;
use tokio_tungstenite::tungstenite::Message;
use tokio_tungstenite::WebSocketStream;

type Tx = futures_util::stream::SplitSink<WebSocketStream<TcpStream>, Message>;
type ClientMap = Arc<Mutex<HashMap<String, Client>>>;

#[derive(Clone)]
struct Client {
    tx: Arc<Mutex<Tx>>,
    player_id: Option<String>,
    is_host: bool,
    is_bet_spectator: bool,
}

#[derive(Clone)]
struct GameState {
    players: Arc<Mutex<HashMap<String, Value>>>,
    host_id: Arc<Mutex<Option<String>>>,
    last_game_started: Arc<Mutex<Option<Value>>>,
    current_match: Arc<Mutex<Option<Value>>>,
    last_tournament_end: Arc<Mutex<Option<Value>>>,
    fight_in_progress: Arc<Mutex<bool>>,
    last_elimination: Arc<Mutex<Option<Value>>>,
}

impl GameState {
    fn new() -> Self {
        Self {
            players: Arc::new(Mutex::new(HashMap::new())),
            host_id: Arc::new(Mutex::new(None)),
            last_game_started: Arc::new(Mutex::new(None)),
            current_match: Arc::new(Mutex::new(None)),
            last_tournament_end: Arc::new(Mutex::new(None)),
            fight_in_progress: Arc::new(Mutex::new(false)),
            last_elimination: Arc::new(Mutex::new(None)),
        }
    }
}

pub async fn start_websocket_server() {
    let addr = "0.0.0.0:8765".parse::<SocketAddr>().unwrap();
    let listener = TcpListener::bind(&addr).await.expect("Failed to bind");
    println!("WebSocket server running on ws://{}", addr);

    let clients: ClientMap = Arc::new(Mutex::new(HashMap::new()));
    let game_state = GameState::new();

    while let Ok((stream, _)) = listener.accept().await {
        let clients = clients.clone();
        let game_state = game_state.clone();
        tokio::spawn(handle_connection(stream, clients, game_state));
    }
}

async fn handle_connection(stream: TcpStream, clients: ClientMap, game_state: GameState) {
    let ws_stream = match tokio_tungstenite::accept_async(stream).await {
        Ok(ws) => ws,
        Err(e) => {
            eprintln!("WebSocket handshake failed: {}", e);
            return;
        }
    };

    let (tx, mut rx) = ws_stream.split();
    let client_id = uuid::Uuid::new_v4().to_string();
    let tx = Arc::new(Mutex::new(tx));

    let client = Client {
        tx: tx.clone(),
        player_id: None,
        is_host: false,
        is_bet_spectator: false,
    };

    clients.lock().await.insert(client_id.clone(), client);

    while let Some(msg) = rx.next().await {
        let msg = match msg {
            Ok(m) => m,
            Err(_) => break,
        };

        if let Message::Text(text) = msg {
            if let Ok(data) = serde_json::from_str::<Value>(&text) {
                handle_message(
                    data,
                    &client_id,
                    &clients,
                    &game_state,
                )
                .await;
            }
        }
    }

    clients.lock().await.remove(&client_id);
    
    let mut game_state_players = game_state.players.lock().await;
    let mut player_to_remove = None;
    for (pid, _) in game_state_players.iter() {
        let clients_lock = clients.lock().await;
        if let Some(c) = clients_lock.get(&client_id) {
            if c.player_id.as_ref() == Some(pid) {
                player_to_remove = Some(pid.clone());
                break;
            }
        }
    }
    
    if let Some(pid) = player_to_remove {
        if let Some(player) = game_state_players.remove(&pid) {
            drop(game_state_players);
            broadcast_except(
                &clients,
                &client_id,
                &json!({ "type": "playerLeft", "player": player }),
            )
            .await;
            
            if let Some(host_id) = game_state.host_id.lock().await.as_ref() {
                send_to_client(
                    &clients,
                    host_id,
                    &json!({ "type": "playerDisconnected", "playerId": pid }),
                )
                .await;
            }
        }
    }
}

async fn handle_message(
    msg: Value,
    client_id: &str,
    clients: &ClientMap,
    game_state: &GameState,
) {
    let msg_type = msg.get("type").and_then(|v| v.as_str()).unwrap_or("");

    match msg_type {
        "registerHost" => {
            let mut clients_lock = clients.lock().await;
            if let Some(client) = clients_lock.get_mut(client_id) {
                client.is_host = true;
            }
            drop(clients_lock);

            *game_state.host_id.lock().await = Some(client_id.to_string());

            let players_list: Vec<Value> = game_state.players.lock().await.values().cloned().collect();
            send_to_client(
                clients,
                client_id,
                &json!({ "type": "playerList", "players": players_list }),
            )
            .await;
        }
        "join" => {
            if let Some(player_data) = msg.get("player") {
                let player_id = uuid::Uuid::new_v4().to_string();
                let mut player = player_data.clone();
                player["id"] = json!(player_id.clone());

                game_state.players.lock().await.insert(player_id.clone(), player.clone());

                let mut clients_lock = clients.lock().await;
                if let Some(client) = clients_lock.get_mut(client_id) {
                    client.player_id = Some(player_id.clone());
                }
                drop(clients_lock);

                send_to_client(
                    clients,
                    client_id,
                    &json!({ "type": "joinConfirmed", "player": player }),
                )
                .await;

                if let Some(host_id) = game_state.host_id.lock().await.as_ref() {
                    send_to_client(
                        clients,
                        host_id,
                        &json!({ "type": "playerJoined", "player": player }),
                    )
                    .await;
                }
            }
        }
        "removePlayer" => {
            if let Some(player_id) = msg.get("playerId").and_then(|v| v.as_str()) {
                game_state.players.lock().await.remove(player_id);
                broadcast_to_players(
                    clients,
                    player_id,
                    &json!({ "type": "removed" }),
                )
                .await;
            }
        }
        "resetRoom" => {
            game_state.players.lock().await.clear();
            *game_state.last_game_started.lock().await = None;
            *game_state.current_match.lock().await = None;
            *game_state.last_tournament_end.lock().await = None;
            *game_state.fight_in_progress.lock().await = false;
            *game_state.last_elimination.lock().await = None;

            broadcast_except(clients, client_id, &json!({ "type": "roomReset" })).await;
        }
        "betSpectator" => {
            let mut clients_lock = clients.lock().await;
            if let Some(client) = clients_lock.get_mut(client_id) {
                client.is_bet_spectator = true;
            }
            drop(clients_lock);

            if let Some(last_game) = game_state.last_game_started.lock().await.as_ref() {
                send_to_client(clients, client_id, last_game).await;
            }

            if let Some(tournament_end) = game_state.last_tournament_end.lock().await.as_ref() {
                send_to_client(clients, client_id, tournament_end).await;
            } else if let Some(current) = game_state.current_match.lock().await.as_ref() {
                send_to_client(
                    clients,
                    client_id,
                    &json!({ "type": "fightEvent", "data": current }),
                )
                .await;

                if *game_state.fight_in_progress.lock().await {
                    send_to_client(
                        clients,
                        client_id,
                        &json!({ "type": "fightEvent", "data": { "event": "fightInProgress" } }),
                    )
                    .await;
                }
            } else if let Some(elim) = game_state.last_elimination.lock().await.as_ref() {
                let mut data = elim.clone();
                data["event"] = json!("tournamentInProgress");
                send_to_client(
                    clients,
                    client_id,
                    &json!({ "type": "fightEvent", "data": data }),
                )
                .await;
            }
        }
        "gameStarted" => {
            let game_msg = json!({
                "type": "gameStarted",
                "fighters": msg.get("fighters")
            });
            *game_state.last_game_started.lock().await = Some(game_msg.clone());
            *game_state.current_match.lock().await = None;
            *game_state.last_tournament_end.lock().await = None;
            *game_state.fight_in_progress.lock().await = false;
            *game_state.last_elimination.lock().await = None;

            broadcast_except(clients, client_id, &game_msg).await;
        }
        "fightEvent" => {
            if let Some(data) = msg.get("data") {
                if let Some(event) = data.get("event").and_then(|v| v.as_str()) {
                    match event {
                        "matchStart" => {
                            *game_state.current_match.lock().await = Some(data.clone());
                            *game_state.fight_in_progress.lock().await = false;
                        }
                        "action" => {
                            *game_state.fight_in_progress.lock().await = true;
                        }
                        "matchEnd" => {
                            *game_state.current_match.lock().await = None;
                            *game_state.fight_in_progress.lock().await = false;
                        }
                        "elimination" => {
                            *game_state.last_elimination.lock().await = Some(data.clone());
                        }
                        _ => {}
                    }
                }

                broadcast_except(
                    clients,
                    client_id,
                    &json!({ "type": "fightEvent", "data": data }),
                )
                .await;
            }
        }
        "targetPlayer" => {
            if let (Some(player_id), Some(payload)) =
                (msg.get("playerId").and_then(|v| v.as_str()), msg.get("payload"))
            {
                broadcast_to_players(clients, player_id, payload).await;
            }
        }
        "broadcastPlayers" => {
            if let Some(payload) = msg.get("payload") {
                broadcast_to_all_players(clients, payload).await;
            }
        }
        "selectAction" => {
            let player_id = {
                let clients_lock = clients.lock().await;
                clients_lock.get(client_id)
                    .and_then(|client| client.player_id.clone())
            };
            
            if let Some(player_id) = player_id {
                if let Some(host_id) = game_state.host_id.lock().await.as_ref() {
                    let host_id = host_id.clone();
                    send_to_client(
                        clients,
                        &host_id,
                        &json!({
                            "type": "playerAction",
                            "playerId": player_id,
                            "actionId": msg.get("actionId")
                        }),
                    )
                    .await;
                }
            }
        }
        "tournamentEnd" => {
            let end_msg = json!({
                "type": "tournamentEnd",
                "data": msg.get("data")
            });
            *game_state.last_tournament_end.lock().await = Some(end_msg.clone());
            *game_state.current_match.lock().await = None;
            *game_state.fight_in_progress.lock().await = false;

            broadcast_except(clients, client_id, &end_msg).await;
        }
        _ => {}
    }
}

async fn send_to_client(clients: &ClientMap, client_id: &str, msg: &Value) {
    let clients_lock = clients.lock().await;
    if let Some(client) = clients_lock.get(client_id) {
        let mut tx = client.tx.lock().await;
        let _ = tx.send(Message::Text(msg.to_string())).await;
    }
}

async fn broadcast_except(clients: &ClientMap, except_id: &str, msg: &Value) {
    let clients_lock = clients.lock().await;
    for (id, client) in clients_lock.iter() {
        if id != except_id {
            let mut tx = client.tx.lock().await;
            let _ = tx.send(Message::Text(msg.to_string())).await;
        }
    }
}

async fn broadcast_to_players(clients: &ClientMap, target_player_id: &str, msg: &Value) {
    let clients_lock = clients.lock().await;
    for client in clients_lock.values() {
        if client.player_id.as_deref() == Some(target_player_id) {
            let mut tx = client.tx.lock().await;
            let _ = tx.send(Message::Text(msg.to_string())).await;
        }
    }
}

async fn broadcast_to_all_players(clients: &ClientMap, msg: &Value) {
    let clients_lock = clients.lock().await;
    for client in clients_lock.values() {
        if client.player_id.is_some() {
            let mut tx = client.tx.lock().await;
            let _ = tx.send(Message::Text(msg.to_string())).await;
        }
    }
}
