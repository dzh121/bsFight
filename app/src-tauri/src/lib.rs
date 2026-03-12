mod websocket;
mod http_server;

#[tauri::command]
fn get_local_ip() -> String {
    http_server::get_local_ip().unwrap_or_else(|| "localhost".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|_app| {
      if cfg!(debug_assertions) {
        _app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      
      // Start WebSocket server on 0.0.0.0:8765
      tauri::async_runtime::spawn(async {
        websocket::start_websocket_server().await;
      });
      
      // Start HTTP server on 0.0.0.0:3000 (serves embedded dist files to network)
      tauri::async_runtime::spawn(async {
        http_server::start_http_server().await;
      });
      
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![get_local_ip])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
