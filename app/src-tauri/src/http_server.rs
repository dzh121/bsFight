use axum::{
    Router,
    routing::get,
    response::{Html, IntoResponse, Response},
    http::{header, StatusCode, Uri},
};
use rust_embed::Embed;
use std::net::SocketAddr;
use tower_http::cors::{CorsLayer, Any};

static INDEX_HTML: &str = "index.html";

#[derive(Embed)]
#[folder = "../dist/"]
struct Assets;

async fn static_handler(uri: Uri) -> impl IntoResponse {
    let path = uri.path().trim_start_matches('/');

    if path.is_empty() || path == INDEX_HTML {
        return index_html().await;
    }

    match Assets::get(path) {
        Some(content) => {
            let mime = mime_guess::from_path(path).first_or_octet_stream();
            ([(header::CONTENT_TYPE, mime.as_ref().to_string())], content.data.to_vec()).into_response()
        }
        None => {
            // SPA fallback: non-file routes get index.html
            if path.contains('.') {
                return not_found().await;
            }
            index_html().await
        }
    }
}

async fn index_html() -> Response {
    match Assets::get(INDEX_HTML) {
        Some(content) => {
            let html = String::from_utf8_lossy(&content.data).to_string();
            Html(html).into_response()
        }
        None => not_found().await,
    }
}

async fn not_found() -> Response {
    (StatusCode::NOT_FOUND, "404 Not Found").into_response()
}

pub async fn start_http_server() {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/api/ip", get(ip_handler))
        .fallback(static_handler)
        .layer(cors);

    let addr = SocketAddr::from(([0, 0, 0, 0], 3000));
    println!("HTTP server running on http://0.0.0.0:3000");

    if let Some(ip) = get_local_ip() {
        println!("🌐 Network access: http://{}:3000", ip);
        println!("📱 Join page:      http://{}:3000/join", ip);
        println!("🎲 Bet page:       http://{}:3000/bet", ip);
    }

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("Failed to bind HTTP server on port 3000");

    axum::serve(listener, app)
        .await
        .expect("Failed to start HTTP server");
}

async fn ip_handler() -> impl IntoResponse {
    let ip = get_local_ip().unwrap_or_else(|| "localhost".to_string());
    (StatusCode::OK, ip)
}

pub fn get_local_ip() -> Option<String> {
    local_ip_address::local_ip()
        .ok()
        .map(|ip| ip.to_string())
}
