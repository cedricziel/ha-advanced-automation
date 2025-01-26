mod ha_client;

use dotenv::dotenv;
use axum::{
    extract::ws::{WebSocket, WebSocketUpgrade},
    response::Response,
    routing::get,
    Router,
    Json,
};
use ha_client::HaClient;
use serde_json::json;
use std::sync::Arc;
use tower_http::{
    cors::{CorsLayer, Any},
    services::ServeDir,
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use futures::{SinkExt, StreamExt};

struct AppState {
    ha_client: Arc<HaClient>,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Load .env file if it exists
    dotenv().ok();

    // Initialize logging
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Initialize Home Assistant client
    let ha_client = Arc::new(HaClient::new());
    let ha_host = std::env::var("HA_HOST")
        .unwrap_or_else(|_| "localhost:8123".to_string());

    let token = std::env::var("SUPERVISOR_TOKEN")
        .or_else(|_| std::env::var("HA_TOKEN"))
        .expect("Either SUPERVISOR_TOKEN or HA_TOKEN must be set");

    // Connect to Home Assistant
    ha_client.connect(ha_host, token).await?;

    // Create app state
    let state = Arc::new(AppState {
        ha_client: ha_client.clone(),
    });

    // Create CORS layer
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Build router
    let app = Router::new()
        .route("/health", get(health_check))
        .route("/ws", get(ws_handler))
        .route("/api/states", get(get_states))
        .nest_service("/", ServeDir::new("static"))
        .with_state(state)
        .layer(cors);

    // Get port from environment or use default
    let port = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(3001);

    let addr = std::net::SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("Starting server on {}", addr);

    // Start server
    axum::serve(
        tokio::net::TcpListener::bind(&addr).await?,
        app.into_make_service(),
    )
    .await?;

    Ok(())
}

async fn health_check() -> Json<serde_json::Value> {
    Json(json!({
        "status": "ok",
        "version": env!("CARGO_PKG_VERSION")
    }))
}

async fn get_states(
    axum::extract::State(state): axum::extract::State<Arc<AppState>>,
) -> Json<serde_json::Value> {
    let states = state.ha_client.get_all_states().await;
    Json(json!(states))
}

async fn ws_handler(
    axum::extract::State(state): axum::extract::State<Arc<AppState>>,
    ws: WebSocketUpgrade,
) -> Response {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, state: Arc<AppState>) {
    let (mut sender, mut receiver) = socket.split();
    let mut state_rx = state.ha_client.subscribe_to_states();

    // Handle incoming messages
    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(_)) = receiver.next().await {
            // Handle client messages if needed
        }
    });

    // Send state updates to client
    let mut send_task = tokio::spawn(async move {
        while let Ok((entity_id, state)) = state_rx.recv().await {
            if let Ok(msg) = serde_json::to_string(&json!({
                "type": "state_changed",
                "entity_id": entity_id,
                "state": state
            })) {
                if sender.send(axum::extract::ws::Message::Text(msg)).await.is_err() {
                    break;
                }
            }
        }
    });

    // Wait for either task to finish
    tokio::select! {
        _ = (&mut recv_task) => send_task.abort(),
        _ = (&mut send_task) => recv_task.abort(),
    };
}
