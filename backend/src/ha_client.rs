use std::sync::Arc;
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
        }
    }

    pub async fn connect(&self, host: String, token: String) -> Result<(), Box<dyn Error>> {
        let ws_url = format!("ws://{}/api/websocket", host);
        let (ws_stream, _) = connect_async(ws_url).await?;
        let (mut write, mut read) = ws_stream.split();

        // Send auth message
        let auth_msg = serde_json::to_string(&HaAuth {
            msg_type: "auth".to_string(),
            access_token: token,
        })?;
        write.send(Message::Text(auth_msg)).await?;

        // Subscribe to state changes
        let sub_msg = r#"{"id": 1, "type": "subscribe_events", "event_type": "state_changed"}"#;
        write.send(Message::Text(sub_msg.to_string())).await?;

        // Get initial states
        let get_states_msg = r#"{"id": 2, "type": "get_states"}"#;
        write.send(Message::Text(get_states_msg.to_string())).await?;

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
