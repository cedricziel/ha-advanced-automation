use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Arc;
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

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct BlockDefinition {
    pub r#type: String,
    #[serde(default)]
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
    #[serde(default)]
    pub colour: i32,
    #[serde(default)]
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

#[derive(Debug, Clone)]
pub struct BlockStore {
    blocks: Arc<RwLock<HashMap<String, BlockDefinition>>>,
    blocks_dir: PathBuf,
    builtin_templates: Arc<RwLock<HashMap<String, String>>>,
}

impl BlockStore {
    pub async fn new() -> Result<Self, std::io::Error> {
        Self::with_blocks_dir(PathBuf::from("blocks")).await
    }

    pub async fn with_blocks_dir(blocks_dir: PathBuf) -> Result<Self, std::io::Error> {
        let mut blocks = HashMap::new();
        let mut builtin_templates = HashMap::new();

        // Load built-in Rhai templates
        let builtin_dir = blocks_dir.join("builtin");
        if builtin_dir.exists() {
            for entry in WalkDir::new(&builtin_dir)
                .follow_links(true)
                .into_iter()
                .filter_map(|e| e.ok())
            {
                if entry.path().extension().map_or(false, |ext| ext == "rhai") {
                    match fs::read_to_string(entry.path()) {
                        Ok(content) => {
                            let block_type = entry
                                .path()
                                .file_stem()
                                .unwrap()
                                .to_string_lossy()
                                .to_string();
                            info!("Loaded built-in template: {} from {}", block_type, entry.path().display());
                            builtin_templates.insert(block_type, content);
                        }
                        Err(e) => {
                            error!("Failed to read {}: {}", entry.path().display(), e);
                        }
                    }
                }
            }
        }

        // Load custom block YAML files
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
            blocks: Arc::new(RwLock::new(blocks)),
            blocks_dir,
            builtin_templates: Arc::new(RwLock::new(builtin_templates)),
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
        // First check custom blocks
        let blocks = self.blocks.read().await;
        if let Some(block) = blocks.get(block_type) {
            return Some(block.clone());
        }

        // Then check built-in templates
        let builtin_templates = self.builtin_templates.read().await;
        if let Some(template) = builtin_templates.get(block_type) {
            // Create a minimal BlockDefinition for built-in blocks
            return Some(BlockDefinition {
                r#type: block_type.to_string(),
                message0: String::new(),
                colour: 0,
                tooltip: String::new(),
                rhai_template: Some(template.clone()),
                ..Default::default()
            });
        }

        None
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
