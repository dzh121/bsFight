// Get the base URL for QR codes - uses network IP when available
export async function getBaseUrl() {
  // In Tauri, ALWAYS use the HTTP server with local IP
  if (window.__TAURI__) {
    try {
      const { invoke } = window.__TAURI__.core;
      const localIp = await invoke('get_local_ip');
      if (localIp && localIp !== 'localhost') {
        return `http://${localIp}:3000`;
      }
    } catch (err) {
      console.error('Failed to get local IP via Tauri:', err);
    }
    // Fallback: try the HTTP API
    try {
      const resp = await fetch('http://localhost:3000/api/ip');
      const ip = await resp.text();
      if (ip && ip !== 'localhost') {
        return `http://${ip}:3000`;
      }
    } catch (err) {
      console.error('Failed to get local IP via API:', err);
    }
    return 'http://localhost:3000';
  }
  
  // In browser - use current origin (works on both dev server and HTTP server)
  return window.location.origin;
}
