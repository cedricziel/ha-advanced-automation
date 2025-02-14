mod automation;
mod blockly;
mod blocks;
mod codegen;
mod ha_client;
mod rhai;
mod tests;
mod web;

use std::collections::HashMap;

use automation::{Automation, AutomationCreate};
use axum::{
    extract::{
        ws::{WebSocket, WebSocketUpgrade},
        Path, State,
    },
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{delete, get, post, put},
    Json, Router,
};
use blocks::BlockDefinition;
use dotenv::dotenv;
use futures::{SinkExt, StreamExt};
use ha_client::HaClient;
use serde_json::json;
use std::sync::Arc;
use tower_http::{
    cors::{Any, CorsLayer},
    services::{ServeDir, ServeFile},
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[derive(Clone)]
struct AppState {
    ha_client: Arc<HaClient>,
    automation_store: Arc<automation::AutomationStore>,
    block_store: Arc<blocks::BlockStore>,
    automations: Arc<Vec<Automation>>,
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
    let ha_host = std::env::var("HA_HOST").unwrap_or_else(|_| "localhost:8123".to_string());

    let token = std::env::var("SUPERVISOR_TOKEN")
        .or_else(|_| std::env::var("HA_TOKEN"))
        .expect("Either SUPERVISOR_TOKEN or HA_TOKEN must be set");

    // Connect to Home Assistant
    ha_client.connect(ha_host, token).await?;

    // Initialize block store first
    let block_store = Arc::new(blocks::BlockStore::new().await?);

    // Create automation store with block store
    let automation_store =
        Arc::new(automation::AutomationStore::new(block_store.as_ref().clone()).await?);

    // Get initial automations
    let automations = Arc::new(automation_store.list().await);

    let state = Arc::new(AppState {
        ha_client: ha_client.clone(),
        automation_store,
        block_store,
        automations,
    });

    // Create CORS layer
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Build router
    let app = Router::new()
        .merge(web::routes::router())
        .route("/health", get(health_check))
        .route("/ws", get(ws_handler))
        .route("/api/states", get(get_states))
        .route("/api/actions", get(get_actions))
        .route("/api/automations", get(list_automations))
        .route("/api/automations", post(create_automation))
        .route("/api/automations/{id}", get(get_automation))
        .route("/api/automations/{id}", put(update_automation))
        .route("/api/automations/{id}", delete(delete_automation))
        .route("/api/automations/{id}/toggle", post(toggle_automation))
        .route("/api/blockly/toolbox", get(get_blockly_toolbox))
        .route("/api/blocks", get(list_blocks))
        .route("/api/blocks", post(create_or_update_block))
        .route("/api/blocks/{block_type}", delete(delete_block))
        .route("/api/blocks/user", get(list_user_blocks))
        .route("/api/blocks/user", post(create_user_block))
        .route("/api/blocks/user/{id}", put(update_user_block))
        .route("/api/blocks/user/{id}", delete(delete_user_block))
        .with_state(state)
        .layer(cors)
        .fallback_service(ServeDir::new("static").fallback(ServeFile::new("static/index.html")));

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

async fn get_states(State(state): State<Arc<AppState>>) -> Json<serde_json::Value> {
    let states = state.ha_client.get_all_states().await;
    Json(json!(states))
}

async fn get_actions(State(state): State<Arc<AppState>>) -> Json<serde_json::Value> {
    tracing::debug!("Getting actions...");
    let actions = state.ha_client.get_all_actions().await;
    tracing::debug!(
        "Got actions: {}",
        serde_json::to_string_pretty(&actions).unwrap_or_default()
    );
    Json(json!(actions))
}

async fn ws_handler(State(state): State<Arc<AppState>>, ws: WebSocketUpgrade) -> Response {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

// Automation handlers
async fn list_automations(State(state): State<Arc<AppState>>) -> Json<serde_json::Value> {
    let automations = state.automation_store.list().await;
    Json(json!({
        "automations": automations
    }))
}

#[axum::debug_handler]
async fn get_automation(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    if let Some(automation) = state.automation_store.get(&id).await {
        (StatusCode::OK, Json(automation)).into_response()
    } else {
        (StatusCode::NOT_FOUND, "Automation not found".to_string()).into_response()
    }
}

#[axum::debug_handler]
async fn create_automation(
    State(state): State<Arc<AppState>>,
    Json(data): Json<AutomationCreate>,
) -> impl IntoResponse {
    match state.automation_store.create(data).await {
        Ok(automation) => (StatusCode::CREATED, Json(automation)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

#[axum::debug_handler]
async fn update_automation(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(data): Json<automation::AutomationUpdate>,
) -> Response {
    match state.automation_store.update(&id, data).await {
        Ok(Some(automation)) => (StatusCode::OK, Json(automation)).into_response(),
        Ok(None) => (StatusCode::NOT_FOUND, "Automation not found".to_string()).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

#[axum::debug_handler]
async fn delete_automation(State(state): State<Arc<AppState>>, Path(id): Path<String>) -> Response {
    match state.automation_store.delete(&id).await {
        Ok(true) => StatusCode::NO_CONTENT.into_response(),
        Ok(false) => (StatusCode::NOT_FOUND, "Automation not found".to_string()).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

#[axum::debug_handler]
async fn toggle_automation(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(data): Json<serde_json::Value>,
) -> Result<Json<Automation>, (StatusCode, String)> {
    let enabled = match data.get("enabled").and_then(|v| v.as_bool()) {
        Some(enabled) => enabled,
        None => {
            return Err((
                StatusCode::BAD_REQUEST,
                "Missing 'enabled' field".to_string(),
            ))
        }
    };

    match state.automation_store.toggle(&id, enabled).await {
        Ok(Some(automation)) => Ok(Json(automation)),
        Ok(None) => Err((StatusCode::NOT_FOUND, "Automation not found".to_string())),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
    }
}

#[axum::debug_handler]
async fn get_blockly_toolbox(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let blocks = state.block_store.list().await;
    let toolbox = blockly::create_default_toolbox(&blocks);

    let response = blockly::ToolboxResponse { toolbox, blocks };

    let json = serde_json::to_string_pretty(&response).unwrap();

    (
        StatusCode::OK,
        [(axum::http::header::CONTENT_TYPE, "application/json")],
        json,
    )
}

async fn list_blocks(State(state): State<Arc<AppState>>) -> Json<Vec<BlockDefinition>> {
    let blocks = state.block_store.list().await;
    Json(blocks)
}

async fn create_or_update_block(
    State(state): State<Arc<AppState>>,
    Json(block): Json<BlockDefinition>,
) -> Result<(), (StatusCode, String)> {
    state
        .block_store
        .create_or_update(block)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
}

async fn delete_block(
    State(state): State<Arc<AppState>>,
    Path(block_type): Path<String>,
) -> Result<(), (StatusCode, String)> {
    match state.block_store.delete(&block_type).await {
        Ok(true) => Ok(()),
        Ok(false) => Err((StatusCode::NOT_FOUND, "Block not found".to_string())),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
    }
}

async fn list_user_blocks(State(state): State<Arc<AppState>>) -> Json<Vec<BlockDefinition>> {
    let blocks = state.block_store.list().await;
    let user_blocks: Vec<_> = blocks
        .into_iter()
        .filter(|block| block.id.is_some())
        .collect();
    Json(user_blocks)
}

async fn create_user_block(
    State(state): State<Arc<AppState>>,
    Json(block): Json<BlockDefinition>,
) -> Result<Json<BlockDefinition>, (StatusCode, String)> {
    // Ensure this is marked as a user block
    if block.id.is_some() {
        return Err((
            StatusCode::BAD_REQUEST,
            "Block ID should not be provided for new blocks".to_string(),
        ));
    }

    let block_type = block.r#type.clone();
    match state.block_store.create_or_update(block).await {
        Ok(()) => {
            let created_block = state.block_store.get(&block_type).await.ok_or((
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to retrieve created block".to_string(),
            ))?;
            Ok(Json(created_block))
        }
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
    }
}

async fn update_user_block(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(mut block): Json<BlockDefinition>,
) -> Result<Json<BlockDefinition>, (StatusCode, String)> {
    // Verify block exists and is a user block
    let block_type = block.r#type.clone();
    let existing = state
        .block_store
        .get(&block_type)
        .await
        .ok_or((StatusCode::NOT_FOUND, "Block not found".to_string()))?;

    if existing.id.as_ref() != Some(&id) {
        return Err((StatusCode::BAD_REQUEST, "Block ID mismatch".to_string()));
    }

    // Preserve the original ID and created timestamp
    block.id = existing.id;
    block.created = existing.created;

    match state.block_store.create_or_update(block).await {
        Ok(()) => {
            let updated_block = state.block_store.get(&block_type).await.ok_or((
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to retrieve updated block".to_string(),
            ))?;
            Ok(Json(updated_block))
        }
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
    }
}

async fn delete_user_block(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<(), (StatusCode, String)> {
    // First get the block to verify it's a user block
    let blocks = state.block_store.list().await;
    let block = blocks
        .iter()
        .find(|b| b.id.as_ref() == Some(&id))
        .ok_or((StatusCode::NOT_FOUND, "Block not found".to_string()))?;

    match state.block_store.delete(&block.r#type).await {
        Ok(true) => Ok(()),
        Ok(false) => Err((StatusCode::NOT_FOUND, "Block not found".to_string())),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
    }
}

async fn handle_socket(socket: WebSocket, state: Arc<AppState>) {
    let (mut sender, mut receiver) = socket.split();
    let mut state_rx = state.ha_client.subscribe_to_states();

    // Handle incoming messages
    let mut recv_task = tokio::spawn(async move {
        while let Some(msg_result) = receiver.next().await {
            match msg_result {
                Ok(msg) => {
                    match msg {
                        axum::extract::ws::Message::Text(text) => {
                            tracing::debug!("Received WebSocket message: {}", text);
                            // Handle text messages if needed
                        }
                        axum::extract::ws::Message::Close(_) => {
                            tracing::debug!("Client initiated WebSocket close");
                            break;
                        }
                        _ => {} // Ignore other message types
                    }
                }
                Err(e) => {
                    tracing::error!("WebSocket receive error: {}", e);
                    break;
                }
            }
        }
    });

    // Send state updates to client
    let mut send_task = tokio::spawn(async move {
        while let Ok((entity_id, state)) = state_rx.recv().await {
            let msg = json!({
                "type": "state_changed",
                "entity_id": entity_id,
                "state": state
            });

            match serde_json::to_string(&msg) {
                Ok(msg_str) => {
                    if let Err(e) = sender
                        .send(axum::extract::ws::Message::Text(msg_str.into()))
                        .await
                    {
                        tracing::error!("WebSocket send error: {}", e);
                        break;
                    }
                }
                Err(e) => {
                    tracing::error!("Failed to serialize WebSocket message: {}", e);
                    continue;
                }
            }
        }
    });

    // Wait for either task to finish and cleanup
    tokio::select! {
        _ = (&mut recv_task) => {
            tracing::debug!("WebSocket receive task finished");
            send_task.abort();
        }
        _ = (&mut send_task) => {
            tracing::debug!("WebSocket send task finished");
            recv_task.abort();
        }
    };

    tracing::debug!("WebSocket connection closed");
}
