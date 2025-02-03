use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use tokio::sync::RwLock;
use chrono::{DateTime, Utc};
use walkdir::WalkDir;
use log::{info, error};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockArgument {
    pub r#type: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub check: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub options: Option<Vec<Vec<String>>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockDefinition {
    pub r#type: String,
    pub message0: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub args0: Option<Vec<BlockArgument>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message1: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub args1: Option<Vec<BlockArgument>>,
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
    #[serde(skip_serializing_if = "Option::is_none")]
    pub extensions: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mutator: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub category: Option<String>,
    // User-defined block fields
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub modified: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rhai_template: Option<String>,
}

pub struct BlockStore {
    blocks: RwLock<HashMap<String, BlockDefinition>>,
    blocks_dir: PathBuf,
}

impl BlockStore {
    pub async fn new() -> Result<Self, std::io::Error> {
        let blocks_dir = PathBuf::from("blocks");
        let mut blocks = HashMap::new();

        // Load all YAML files from the blocks directory
        for entry in WalkDir::new(&blocks_dir)
            .follow_links(true)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            if entry.path().extension().map_or(false, |ext| ext == "yaml" || ext == "yml") {
                match fs::read_to_string(entry.path()) {
                    Ok(content) => {
                        match serde_yaml::from_str::<BlockDefinition>(&content) {
                            Ok(block) => {
                                info!("Loaded block: {} from {}", block.r#type, entry.path().display());
                                blocks.insert(block.r#type.clone(), block);
                            }
                            Err(e) => {
                                error!("Failed to parse block from {}: {}", entry.path().display(), e);
                            }
                        }
                    }
                    Err(e) => {
                        error!("Failed to read {}: {}", entry.path().display(), e);
                    }
                }
            }
        }

        Ok(Self {
            blocks: RwLock::new(blocks),
            blocks_dir,
        })
    }

    async fn save_block_to_yaml(&self, block: &BlockDefinition) -> Result<(), std::io::Error> {
        let category_dir = match &block.category {
            Some(category) => self.blocks_dir.join(category.to_lowercase()),
            None => self.blocks_dir.join("custom"),
        };

        fs::create_dir_all(&category_dir)?;

        let file_path = category_dir.join(format!("{}.yaml", block.r#type));
        let yaml = serde_yaml::to_string(&block).map_err(|e| {
            std::io::Error::new(
                std::io::ErrorKind::Other,
                format!("Failed to serialize block to YAML: {}", e),
            )
        })?;

        fs::write(file_path, yaml)
    }

    pub async fn list(&self) -> Vec<BlockDefinition> {
        let blocks = self.blocks.read().await;
        blocks.values().cloned().collect()
    }

    pub async fn get(&self, block_type: &str) -> Option<BlockDefinition> {
        let blocks = self.blocks.read().await;
        blocks.get(block_type).cloned()
    }

    pub async fn create_or_update(&self, mut block: BlockDefinition) -> Result<(), std::io::Error> {
        let now = Utc::now();

        // Handle user-defined block metadata
        if block.id.is_none() {
            block.id = Some(uuid::Uuid::new_v4().to_string());
            block.created = Some(now);
        }
        block.modified = Some(now);

        // Save to YAML file
        self.save_block_to_yaml(&block).await?;

        // Update in-memory store
        let mut blocks = self.blocks.write().await;
        blocks.insert(block.r#type.clone(), block);

        Ok(())
    }

    pub async fn delete(&self, block_type: &str) -> Result<bool, std::io::Error> {
        let mut blocks = self.blocks.write().await;
        if let Some(block) = blocks.remove(block_type) {
            // Remove YAML file
            let category_dir = match &block.category {
                Some(category) => self.blocks_dir.join(category.to_lowercase()),
                None => self.blocks_dir.join("custom"),
            };
            let file_path = category_dir.join(format!("{}.yaml", block_type));
            if file_path.exists() {
                fs::remove_file(file_path)?;
            }
            Ok(true)
        } else {
            Ok(false)
        }
    }
}
