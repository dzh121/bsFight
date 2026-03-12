export function getWsUrl() {
  // In Tauri desktop app, connect to embedded WebSocket server on localhost:8765
  if (window.__TAURI__) {
    return 'ws://127.0.0.1:8765';
  }
  
  // Browser mode - use current host and WebSocket port
  // If on local network (e.g., 192.168.x.x:3000), connect to :8765
  const hostname = location.hostname;
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  
  // Check if we're on the dev server (port 5173) or production HTTP server (port 3000)
  if (location.port === '5173') {
    // Dev mode - connect to Vite's WebSocket proxy
    return `${proto}//${location.host}/game-ws`;
  }
  
  // Production mode - connect to standalone WebSocket server
  return `${proto}//${hostname}:8765`;
}
