use std::sync::Arc;
use std::sync::atomic::{AtomicI32, Ordering};
use tokio::sync::{broadcast, RwLock};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use futures::{SinkExt, StreamExt};
use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};
use std::collections::HashMap;
use std::error::Error;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EntityState {
    pub state: String,
    pub attributes: HashMap<String, Value>,
    pub last_updated: String,
}

#[derive(Debug, Clone)]
pub struct HaClient {
    states: Arc<RwLock<HashMap<String, EntityState>>>,
    state_tx: broadcast::Sender<(String, EntityState)>,
    message_id: Arc<AtomicI32>,
}

#[derive(Debug, Serialize)]
struct HaMessage {
    id: i32,
    #[serde(rename = "type")]
    msg_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    event_type: Option<String>,
}

#[derive(Debug, Serialize)]
struct HaAuth {
    #[serde(rename = "type")]
    msg_type: String,
    access_token: String,
}

#[derive(Debug, Deserialize)]
struct HaEvent {
    #[serde(rename = "type")]
    msg_type: String,
    event: Option<HaEventData>,
    id: Option<i32>,
    success: Option<bool>,
}

#[derive(Debug, Deserialize)]
struct HaEventData {
    data: Option<HaStateChanged>,
}

#[derive(Debug, Deserialize)]
struct HaStateChanged {
    entity_id: Option<String>,
    new_state: Option<EntityState>,
}

impl HaClient {
    pub fn new() -> Self {
        let (state_tx, _) = broadcast::channel(100);
        Self {
            states: Arc::new(RwLock::new(HashMap::new())),
            state_tx,
            message_id: Arc::new(AtomicI32::new(1)),
        }
    }

    fn next_id(&self) -> i32 {
        self.message_id.fetch_add(1, Ordering::Relaxed)
    }

    pub async fn connect(&self, host: String, token: String) -> Result<(), Box<dyn Error>> {
        let ws_url = format!("ws://{}/api/websocket", host);
        let (ws_stream, _) = connect_async(ws_url).await?;
        let (mut write, mut read) = ws_stream.split();

        // Wait for auth_required message
        if let Some(Ok(Message::Text(text))) = read.next().await {
            let msg: serde_json::Value = serde_json::from_str(&text)?;
            if msg["type"] != "auth_required" {
                return Err("Expected auth_required message".into());
            }
        }

        // Send auth message
        let auth_msg = serde_json::to_string(&HaAuth {
            msg_type: "auth".to_string(),
            access_token: token,
        })?;
        write.send(Message::Text(auth_msg.into())).await?;

        // Wait for auth_ok message
        if let Some(Ok(Message::Text(text))) = read.next().await {
            let msg: serde_json::Value = serde_json::from_str(&text)?;
            if msg["type"] != "auth_ok" {
                if msg["type"] == "auth_invalid" {
                    return Err("Authentication failed".into());
                }
                return Err("Expected auth_ok message".into());
            }
        }

        // Subscribe to state changes
        let sub_id = self.next_id();
        let sub_msg = serde_json::to_string(&HaMessage {
            id: sub_id,
            msg_type: "subscribe_events".to_string(),
            event_type: Some("state_changed".to_string()),
        })?;
        write.send(Message::Text(sub_msg.into())).await?;

        // Get initial states
        let states_id = self.next_id();
        let get_states_msg = serde_json::to_string(&HaMessage {
            id: states_id,
            msg_type: "get_states".to_string(),
            event_type: None,
        })?;
        write.send(Message::Text(get_states_msg.into())).await?;

        let states = self.states.clone();
        let state_tx = self.state_tx.clone();

        // Handle incoming messages
        tokio::spawn(async move {
            while let Some(msg) = read.next().await {
                match msg {
                    Ok(Message::Text(text)) => {
                        if let Ok(event) = serde_json::from_str::<HaEvent>(&text) {
                            if let Some(event_data) = event.event {
                                if let Some(state_changed) = event_data.data {
                                    if let (Some(entity_id), Some(new_state)) = (state_changed.entity_id, state_changed.new_state) {
                                        states.write().await.insert(entity_id.clone(), new_state.clone());
                                        let _ = state_tx.send((entity_id, new_state));
                                    }
                                }
                            }
                        }
                    }
                    Err(e) => {
                        tracing::error!("WebSocket error: {}", e);
                        break;
                    }
                    _ => {}
                }
            }
        });

        Ok(())
    }

    pub async fn get_state(&self, entity_id: &str) -> Option<EntityState> {
        self.states.read().await.get(entity_id).cloned()
    }

    pub async fn get_all_states(&self) -> HashMap<String, EntityState> {
        self.states.read().await.clone()
    }

    pub fn subscribe_to_states(&self) -> broadcast::Receiver<(String, EntityState)> {
        self.state_tx.subscribe()
    }
}
