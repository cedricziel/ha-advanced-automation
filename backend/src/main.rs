mod ha_client;
mod automation;
mod blockly;
mod blocks;
mod tests;

use dotenv::dotenv;
use std::sync::Arc;
use axum::{
    extract::ws::{WebSocket, WebSocketUpgrade},
    response::Response,
    routing::{get, post, put, delete},
    Router,
    Json,
};
use ha_client::HaClient;
use serde_json::json;
use tower_http::{
    cors::{CorsLayer, Any},
    services::{ServeDir, ServeFile},
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use futures::{SinkExt, StreamExt};

struct AppState {
    ha_client: Arc<HaClient>,
    automation_store: Arc<automation::AutomationStore>,
    block_store: Arc<blocks::BlockStore>,
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
    let automation_store = automation::AutomationStore::new().await?;
    // Initialize block store
    let block_store = blocks::BlockStore::new().await?;

    let state = Arc::new(AppState {
        ha_client: ha_client.clone(),
        automation_store: Arc::new(automation_store),
        block_store: Arc::new(block_store),
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
        .route("/api/actions", get(get_actions))
        .route("/api/automations", get(list_automations).post(create_automation))
        .route("/api/automations/{id}", get(get_automation))
        .route("/api/automations/{id}", put(update_automation))
        .route("/api/automations/{id}", delete(delete_automation))
        .route("/api/automations/{id}/toggle", post(toggle_automation))
        .route("/api/blockly/toolbox", get(get_blockly_toolbox))
        .route("/api/blocks", get(list_blocks))
        .route("/api/blocks/user", get(list_user_blocks))
        .route("/api/blocks/user", post(create_user_block))
        .route("/api/blocks/user/{id}", put(update_user_block))
        .route("/api/blocks/user/{id}", delete(delete_user_block))
        .with_state(state)
        .layer(cors)
        .fallback_service(ServeDir::new("static").fallback(
            ServeFile::new("static/index.html")
        ));

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

async fn get_actions(
    axum::extract::State(state): axum::extract::State<Arc<AppState>>,
) -> Json<serde_json::Value> {
    tracing::debug!("Getting actions...");
    let actions = state.ha_client.get_all_actions().await;
    tracing::debug!("Got actions: {}", serde_json::to_string_pretty(&actions).unwrap_or_default());
    Json(json!(actions))
}

async fn ws_handler(
    axum::extract::State(state): axum::extract::State<Arc<AppState>>,
    ws: WebSocketUpgrade,
) -> Response {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

// Automation handlers
async fn list_automations(
    axum::extract::State(state): axum::extract::State<Arc<AppState>>,
) -> Json<serde_json::Value> {
    let automations = state.automation_store.list().await;
    Json(json!({
        "automations": automations
    }))
}

async fn get_automation(
    axum::extract::State(state): axum::extract::State<Arc<AppState>>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Result<Json<automation::Automation>, (axum::http::StatusCode, String)> {
    if let Some(automation) = state.automation_store.get(&id).await {
        Ok(Json(automation))
    } else {
        Err((axum::http::StatusCode::NOT_FOUND, "Automation not found".to_string()))
    }
}

async fn create_automation(
    axum::extract::State(state): axum::extract::State<Arc<AppState>>,
    Json(data): Json<automation::AutomationCreate>,
) -> Result<Json<automation::Automation>, (axum::http::StatusCode, String)> {
    match state.automation_store.create(data).await {
        Ok(automation) => Ok(Json(automation)),
        Err(e) => Err((axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
    }
}

async fn update_automation(
    axum::extract::State(state): axum::extract::State<Arc<AppState>>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(data): Json<automation::AutomationUpdate>,
) -> Result<Json<automation::Automation>, (axum::http::StatusCode, String)> {
    match state.automation_store.update(&id, data).await {
        Ok(Some(automation)) => Ok(Json(automation)),
        Ok(None) => Err((axum::http::StatusCode::NOT_FOUND, "Automation not found".to_string())),
        Err(e) => Err((axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
    }
}

async fn delete_automation(
    axum::extract::State(state): axum::extract::State<Arc<AppState>>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Result<(), (axum::http::StatusCode, String)> {
    match state.automation_store.delete(&id).await {
        Ok(true) => Ok(()),
        Ok(false) => Err((axum::http::StatusCode::NOT_FOUND, "Automation not found".to_string())),
        Err(e) => Err((axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
    }
}

async fn toggle_automation(
    axum::extract::State(state): axum::extract::State<Arc<AppState>>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(data): Json<serde_json::Value>,
) -> Result<Json<automation::Automation>, (axum::http::StatusCode, String)> {
    let enabled = data.get("enabled")
        .and_then(|v| v.as_bool())
        .ok_or((axum::http::StatusCode::BAD_REQUEST, "Missing or invalid 'enabled' field".to_string()))?;

    match state.automation_store.toggle(&id, enabled).await {
        Ok(Some(automation)) => Ok(Json(automation)),
        Ok(None) => Err((axum::http::StatusCode::NOT_FOUND, "Automation not found".to_string())),
        Err(e) => Err((axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
    }
}

async fn get_blockly_toolbox(
    axum::extract::State(state): axum::extract::State<Arc<AppState>>,
) -> impl axum::response::IntoResponse {
    let blocks = state.block_store.list().await;
    let toolbox = blockly::create_default_toolbox(&blocks);

    let response = blockly::ToolboxResponse {
        toolbox,
        blocks,
    };

    let json = serde_json::to_string_pretty(&response).unwrap();

    (
        axum::http::StatusCode::OK,
        [(axum::http::header::CONTENT_TYPE, "application/json")],
        json
    )
}

async fn list_blocks(
    axum::extract::State(state): axum::extract::State<Arc<AppState>>,
) -> Json<Vec<blocks::BlockDefinition>> {
    let blocks = state.block_store.list().await;
    Json(blocks)
}

async fn create_or_update_block(
    axum::extract::State(state): axum::extract::State<Arc<AppState>>,
    Json(block): Json<blocks::BlockDefinition>,
) -> Result<(), (axum::http::StatusCode, String)> {
    state.block_store.create_or_update(block).await
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
}

async fn delete_block(
    axum::extract::State(state): axum::extract::State<Arc<AppState>>,
    axum::extract::Path(block_type): axum::extract::Path<String>,
) -> Result<(), (axum::http::StatusCode, String)> {
    match state.block_store.delete(&block_type).await {
        Ok(true) => Ok(()),
        Ok(false) => Err((axum::http::StatusCode::NOT_FOUND, "Block not found".to_string())),
        Err(e) => Err((axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
    }
}

async fn list_user_blocks(
    axum::extract::State(state): axum::extract::State<Arc<AppState>>,
) -> Json<Vec<blocks::BlockDefinition>> {
    let blocks = state.block_store.list().await;
    let user_blocks: Vec<_> = blocks.into_iter()
        .filter(|block| block.id.is_some())
        .collect();
    Json(user_blocks)
}

async fn create_user_block(
    axum::extract::State(state): axum::extract::State<Arc<AppState>>,
    Json(mut block): Json<blocks::BlockDefinition>,
) -> Result<Json<blocks::BlockDefinition>, (axum::http::StatusCode, String)> {
    // Ensure this is marked as a user block
    if block.id.is_some() {
        return Err((
            axum::http::StatusCode::BAD_REQUEST,
            "Block ID should not be provided for new blocks".to_string(),
        ));
    }

    let block_type = block.r#type.clone();
    match state.block_store.create_or_update(block).await {
        Ok(()) => {
            let created_block = state
                .block_store
                .get(&block_type)
                .await
                .ok_or((
                    axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                    "Failed to retrieve created block".to_string(),
                ))?;
            Ok(Json(created_block))
        }
        Err(e) => Err((axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
    }
}

async fn update_user_block(
    axum::extract::State(state): axum::extract::State<Arc<AppState>>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(mut block): Json<blocks::BlockDefinition>,
) -> Result<Json<blocks::BlockDefinition>, (axum::http::StatusCode, String)> {
    // Verify block exists and is a user block
    let block_type = block.r#type.clone();
    let existing = state
        .block_store
        .get(&block_type)
        .await
        .ok_or((
            axum::http::StatusCode::NOT_FOUND,
            "Block not found".to_string(),
        ))?;

    if existing.id.as_ref() != Some(&id) {
        return Err((
            axum::http::StatusCode::BAD_REQUEST,
            "Block ID mismatch".to_string(),
        ));
    }

    // Preserve the original ID and created timestamp
    block.id = existing.id;
    block.created = existing.created;

    match state.block_store.create_or_update(block).await {
        Ok(()) => {
            let updated_block = state
                .block_store
                .get(&block_type)
                .await
                .ok_or((
                    axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                    "Failed to retrieve updated block".to_string(),
                ))?;
            Ok(Json(updated_block))
        }
        Err(e) => Err((axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
    }
}

async fn delete_user_block(
    axum::extract::State(state): axum::extract::State<Arc<AppState>>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Result<(), (axum::http::StatusCode, String)> {
    // First get the block to verify it's a user block
    let blocks = state.block_store.list().await;
    let block = blocks
        .iter()
        .find(|b| b.id.as_ref() == Some(&id))
        .ok_or((
            axum::http::StatusCode::NOT_FOUND,
            "Block not found".to_string(),
        ))?;

    match state.block_store.delete(&block.r#type).await {
        Ok(true) => Ok(()),
        Ok(false) => Err((axum::http::StatusCode::NOT_FOUND, "Block not found".to_string())),
        Err(e) => Err((axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
    }
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
                if sender.send(axum::extract::ws::Message::Text(msg.into())).await.is_err() {
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
