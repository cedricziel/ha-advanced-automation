use std::net::SocketAddr;
use tokio::net::TcpListener;
use tokio_tungstenite::tungstenite::Message;
use futures::{SinkExt, StreamExt};
use serde_json::json;
use std::sync::Arc;
use tokio::sync::Mutex;

pub struct MockHaServer {
    addr: SocketAddr,
    shutdown: Arc<Mutex<bool>>,
}

impl MockHaServer {
    pub async fn start() -> Self {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        let shutdown = Arc::new(Mutex::new(false));
        let shutdown_clone = shutdown.clone();

        tokio::spawn(async move {
            while let Ok((stream, _)) = listener.accept().await {
                let ws_stream = tokio_tungstenite::accept_async(stream).await.unwrap();
                let (mut write, mut read) = ws_stream.split();

                // Send initial auth_required message immediately after connection
                write.send(Message::Text(json!({
                    "type": "auth_required",
                    "ha_version": "2024.1.0"
                }).to_string().into())).await.unwrap();

                // Handle the WebSocket connection
                while let Some(Ok(msg)) = read.next().await {
                    if *shutdown_clone.lock().await {
                        break;
                    }

                    match msg {
                        Message::Text(text) => {
                            let msg: serde_json::Value = serde_json::from_str(&text).unwrap();

                            match msg["type"].as_str() {
                                Some("auth") => {
                                    // Send auth_ok response
                                    write.send(Message::Text(json!({
                                        "type": "auth_ok",
                                        "ha_version": "2024.1.0"
                                    }).to_string().into())).await.unwrap();
                                }
                                Some("subscribe_events") => {
                                    // Send subscription success
                                    write.send(Message::Text(json!({
                                        "id": msg["id"],
                                        "type": "result",
                                        "success": true,
                                        "result": null
                                    }).to_string().into())).await.unwrap();

                                    // Send a mock state change event
                                    write.send(Message::Text(json!({
                                        "id": msg["id"],
                                        "type": "event",
                                        "event": {
                                            "data": {
                                                "entity_id": "light.living_room",
                                                "new_state": {
                                                    "state": "on",
                                                    "attributes": {
                                                        "brightness": 255,
                                                        "friendly_name": "Living Room Light"
                                                    },
                                                    "last_changed": "2024-01-26T10:45:00Z",
                                                    "last_updated": "2024-01-26T10:45:00Z",
                                                    "context": {
                                                        "id": "01HN5ZRJX8KR6MQPN2VMBKF4XM",
                                                        "parent_id": null,
                                                        "user_id": null
                                                    }
                                                }
                                            },
                                            "event_type": "state_changed",
                                            "time_fired": "2024-01-26T10:45:00Z",
                                            "origin": "LOCAL"
                                        }
                                    }).to_string().into())).await.unwrap();
                                }
                                Some("get_states") => {
                                    // Send mock states
                                    write.send(Message::Text(json!({
                                        "id": msg["id"],
                                        "type": "result",
                                        "success": true,
                                        "result": [{
                                            "entity_id": "light.living_room",
                                            "state": "on",
                                            "attributes": {
                                                "brightness": 255,
                                                "friendly_name": "Living Room Light"
                                            },
                                            "last_changed": "2024-01-26T10:45:00Z",
                                            "last_updated": "2024-01-26T10:45:00Z",
                                            "context": {
                                                "id": "01HN5ZRJX8KR6MQPN2VMBKF4XM",
                                                "parent_id": null,
                                                "user_id": null
                                            }
                                        }]
                                    }).to_string().into())).await.unwrap();
                                }
                                Some("get_services") => {
                                    // Send mock services
                                    write.send(Message::Text(json!({
                                        "id": msg["id"],
                                        "type": "result",
                                        "success": true,
                                        "result": {
                                            "tts": {
                                                "google_translate_say": {
                                                    "name": "Say a TTS message with google_translate",
                                                    "description": "Say something using text-to-speech",
                                                    "fields": {
                                                        "entity_id": {
                                                            "name": "Entity ID",
                                                            "required": true,
                                                            "selector": {
                                                                "entity": {
                                                                    "domain": "media_player"
                                                                }
                                                            }
                                                        },
                                                        "message": {
                                                            "name": "Message",
                                                            "required": true,
                                                            "selector": {
                                                                "text": null
                                                            }
                                                        }
                                                    }
                                                },
                                                "cloud_say": {
                                                    "description": "Say something using cloud TTS",
                                                    "fields": {
                                                        "entity_id": {
                                                            "name": "Entity ID",
                                                            "required": true,
                                                            "selector": {
                                                                "entity": {
                                                                    "domain": "media_player"
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            },
                                            "light": {
                                                "turn_on": {
                                                    "name": "Turn on",
                                                    "description": "Turn on one or more lights",
                                                    "fields": {
                                                        "entity_id": {
                                                            "name": "Entity ID",
                                                            "required": true,
                                                            "selector": {
                                                                "entity": {
                                                                    "domain": "light"
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }).to_string().into())).await.unwrap();
                                }
                                _ => {}
                            }
                        }
                        _ => {}
                    }
                }
            }
        });

        Self { addr, shutdown }
    }

    pub fn host(&self) -> String {
        format!("127.0.0.1:{}", self.addr.port())
    }

    pub async fn stop(&self) {
        *self.shutdown.lock().await = true;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ha_client::HaClient;
    use tokio::time::sleep;
    use std::time::Duration;

    #[tokio::test]
    async fn test_ha_client_connection() {
        let mock_server = MockHaServer::start().await;
        let client = HaClient::new();

        // Connect to mock server
        client
            .connect(mock_server.host(), "mock_token".to_string())
            .await
            .unwrap();

        // Wait for initial state update
        sleep(Duration::from_millis(100)).await;

        // Verify state was received
        let states = client.get_all_states().await;
        assert!(!states.is_empty());

        let living_room = states.get("light.living_room").unwrap();
        assert_eq!(living_room.state, "on");

        // Clean up
        mock_server.stop().await;
    }

    #[tokio::test]
    async fn test_action_parsing_complete_data() {
        let mock_server = MockHaServer::start().await;
        let client = HaClient::new();

        // Connect to mock server
        client
            .connect(mock_server.host(), "mock_token".to_string())
            .await
            .unwrap();

        // Wait for services to be processed
        sleep(Duration::from_millis(100)).await;

        // Get all actions
        let actions = client.get_all_actions().await;

        // Verify complete action data
        let action = actions.get("tts.google_translate_say").unwrap();
        assert_eq!(action.domain, Some("tts".to_string()));
        assert_eq!(action.name, Some("Say a TTS message with google_translate".to_string()));
        assert_eq!(action.description, Some("Say something using text-to-speech".to_string()));
        assert!(action.fields.contains_key("entity_id"));
        assert!(action.fields.contains_key("message"));
        assert_eq!(action.fields["entity_id"].required, Some(true));

        // Clean up
        mock_server.stop().await;
    }

    #[tokio::test]
    async fn test_action_parsing_minimal_data() {
        let mock_server = MockHaServer::start().await;
        let client = HaClient::new();

        client
            .connect(mock_server.host(), "mock_token".to_string())
            .await
            .unwrap();

        sleep(Duration::from_millis(100)).await;

        let actions = client.get_all_actions().await;

        // Verify minimal action (cloud_say has minimal fields)
        let action = actions.get("tts.cloud_say").unwrap();
        assert_eq!(action.domain, Some("tts".to_string()));
        assert_eq!(action.name, None);
        assert_eq!(action.description, Some("Say something using cloud TTS".to_string()));
        assert!(action.fields.contains_key("entity_id"));

        mock_server.stop().await;
    }

    #[tokio::test]
    async fn test_get_all_actions() {
        let mock_server = MockHaServer::start().await;
        let client = HaClient::new();

        client
            .connect(mock_server.host(), "mock_token".to_string())
            .await
            .unwrap();

        sleep(Duration::from_millis(100)).await;

        let actions = client.get_all_actions().await;

        // Verify we got all expected actions
        assert!(actions.contains_key("tts.google_translate_say"));
        assert!(actions.contains_key("tts.cloud_say"));
        assert!(actions.contains_key("light.turn_on"));

        // Verify different domains are handled correctly
        let light_action = actions.get("light.turn_on").unwrap();
        assert_eq!(light_action.domain, Some("light".to_string()));
        assert_eq!(light_action.name, Some("Turn on".to_string()));

        mock_server.stop().await;
    }

    #[tokio::test]
    async fn test_state_subscription() {
        let mock_server = MockHaServer::start().await;
        let client = HaClient::new();

        // Subscribe to states before connecting
        let mut state_rx = client.subscribe_to_states();

        // Connect to mock server
        client
            .connect(mock_server.host(), "mock_token".to_string())
            .await
            .unwrap();

        // Wait for state update
        if let Ok((entity_id, state)) = tokio::time::timeout(
            Duration::from_secs(1),
            state_rx.recv()
        ).await.unwrap() {
            assert_eq!(entity_id, "light.living_room");
            assert_eq!(state.state, "on");
            assert_eq!(
                state.attributes.get("friendly_name").unwrap().as_str().unwrap(),
                "Living Room Light"
            );
        } else {
            panic!("No state update received");
        }

        // Clean up
        mock_server.stop().await;
    }
}
