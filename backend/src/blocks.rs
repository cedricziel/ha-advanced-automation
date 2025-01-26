use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use tokio::sync::RwLock;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockArgument {
    pub r#type: String,
    pub name: String,
    pub default: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockDefinition {
    pub r#type: String,
    pub message0: String,
    pub args0: Vec<BlockArgument>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub output: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub previous_statement: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_statement: Option<bool>,
    pub colour: i32,
    pub tooltip: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub help_url: Option<String>,
}

pub struct BlockStore {
    blocks: RwLock<HashMap<String, BlockDefinition>>,
    file_path: PathBuf,
}

impl BlockStore {
    pub async fn new() -> Result<Self, std::io::Error> {
        let file_path = PathBuf::from("blocks.json");
        let blocks = if file_path.exists() {
            let content = fs::read_to_string(&file_path)?;
            serde_json::from_str(&content).unwrap_or_default()
        } else {
            HashMap::new()
        };

        Ok(Self {
            blocks: RwLock::new(blocks),
            file_path,
        })
    }

    async fn save(&self) -> Result<(), std::io::Error> {
        let blocks = self.blocks.read().await;
        let content = serde_json::to_string_pretty(&*blocks)?;
        fs::write(&self.file_path, content)
    }

    pub async fn list(&self) -> Vec<BlockDefinition> {
        let blocks = self.blocks.read().await;
        blocks.values().cloned().collect()
    }

    pub async fn get(&self, block_type: &str) -> Option<BlockDefinition> {
        let blocks = self.blocks.read().await;
        blocks.get(block_type).cloned()
    }

    pub async fn create_or_update(&self, block: BlockDefinition) -> Result<(), std::io::Error> {
        let mut blocks = self.blocks.write().await;
        blocks.insert(block.r#type.clone(), block);
        drop(blocks);
        self.save().await
    }

    pub async fn delete(&self, block_type: &str) -> Result<bool, std::io::Error> {
        let mut blocks = self.blocks.write().await;
        let existed = blocks.remove(block_type).is_some();
        drop(blocks);
        self.save().await?;
        Ok(existed)
    }

    pub async fn load_default_blocks(&self) -> Result<(), std::io::Error> {
        let default_blocks = vec![
            BlockDefinition {
                r#type: "ha_state_trigger".to_string(),
                message0: "When entity %1 changes to %2".to_string(),
                args0: vec![
                    BlockArgument {
                        r#type: "field_entity".to_string(),
                        name: "ENTITY_ID".to_string(),
                        default: "entity.id".to_string(),
                    },
                    BlockArgument {
                        r#type: "field_input".to_string(),
                        name: "STATE".to_string(),
                        default: "state".to_string(),
                    },
                ],
                previous_statement: Some(true),
                next_statement: Some(true),
                output: None,
                colour: 230,
                tooltip: "Triggers when an entity changes to a specific state".to_string(),
                help_url: None,
            },
            BlockDefinition {
                r#type: "ha_time_trigger".to_string(),
                message0: "At time %1".to_string(),
                args0: vec![
                    BlockArgument {
                        r#type: "field_input".to_string(),
                        name: "TIME".to_string(),
                        default: "00:00".to_string(),
                    },
                ],
                previous_statement: Some(true),
                next_statement: Some(true),
                output: None,
                colour: 230,
                tooltip: "Triggers at a specific time".to_string(),
                help_url: None,
            },
            BlockDefinition {
                r#type: "ha_state_condition".to_string(),
                message0: "Entity %1 is %2".to_string(),
                args0: vec![
                    BlockArgument {
                        r#type: "field_entity".to_string(),
                        name: "ENTITY_ID".to_string(),
                        default: "entity.id".to_string(),
                    },
                    BlockArgument {
                        r#type: "field_input".to_string(),
                        name: "STATE".to_string(),
                        default: "state".to_string(),
                    },
                ],
                previous_statement: None,
                next_statement: None,
                output: Some("Boolean".to_string()),
                colour: 120,
                tooltip: "Check if an entity is in a specific state".to_string(),
                help_url: None,
            },
            BlockDefinition {
                r#type: "ha_time_condition".to_string(),
                message0: "Time is between %1 and %2".to_string(),
                args0: vec![
                    BlockArgument {
                        r#type: "field_input".to_string(),
                        name: "START_TIME".to_string(),
                        default: "00:00".to_string(),
                    },
                    BlockArgument {
                        r#type: "field_input".to_string(),
                        name: "END_TIME".to_string(),
                        default: "23:59".to_string(),
                    },
                ],
                previous_statement: None,
                next_statement: None,
                output: Some("Boolean".to_string()),
                colour: 120,
                tooltip: "Check if current time is within a specific range".to_string(),
                help_url: None,
            },
            BlockDefinition {
                r#type: "ha_call_service".to_string(),
                message0: "Call service %1 with entity %2".to_string(),
                args0: vec![
                    BlockArgument {
                        r#type: "field_input".to_string(),
                        name: "SERVICE".to_string(),
                        default: "domain.service".to_string(),
                    },
                    BlockArgument {
                        r#type: "field_entity".to_string(),
                        name: "ENTITY_ID".to_string(),
                        default: "entity.id".to_string(),
                    },
                ],
                previous_statement: Some(true),
                next_statement: Some(true),
                output: None,
                colour: 60,
                tooltip: "Call a Home Assistant service".to_string(),
                help_url: None,
            },
            BlockDefinition {
                r#type: "ha_set_state".to_string(),
                message0: "Set %1 to %2".to_string(),
                args0: vec![
                    BlockArgument {
                        r#type: "field_entity".to_string(),
                        name: "ENTITY_ID".to_string(),
                        default: "entity.id".to_string(),
                    },
                    BlockArgument {
                        r#type: "field_input".to_string(),
                        name: "STATE".to_string(),
                        default: "state".to_string(),
                    },
                ],
                previous_statement: Some(true),
                next_statement: Some(true),
                output: None,
                colour: 60,
                tooltip: "Set an entity to a specific state".to_string(),
                help_url: None,
            },
        ];

        let mut blocks = self.blocks.write().await;
        for block in default_blocks {
            blocks.insert(block.r#type.clone(), block);
        }
        drop(blocks);
        self.save().await
    }
}
