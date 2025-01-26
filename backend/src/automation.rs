use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::RwLock;
use tokio::fs;
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Automation {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub enabled: bool,
    pub triggers: Vec<serde_json::Value>,
    pub conditions: Vec<serde_json::Value>,
    pub actions: Vec<serde_json::Value>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct AutomationCreate {
    pub name: String,
    pub description: Option<String>,
    pub triggers: Vec<serde_json::Value>,
    pub conditions: Vec<serde_json::Value>,
    pub actions: Vec<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct AutomationUpdate {
    pub name: String,
    pub description: Option<String>,
    pub enabled: bool,
    pub triggers: Vec<serde_json::Value>,
    pub conditions: Vec<serde_json::Value>,
    pub actions: Vec<serde_json::Value>,
}

#[derive(Debug, Clone)]
pub struct AutomationStore {
    automations: Arc<RwLock<HashMap<String, Automation>>>,
    storage_path: PathBuf,
}

impl AutomationStore {
    pub async fn new() -> std::io::Result<Self> {
        let storage_path = if cfg!(debug_assertions) {
            // In debug mode, use the project root directory
            let mut path = std::env::current_dir()?;
            tracing::debug!("Current dir: {:?}", path);
            path.pop(); // Go up one level from backend/
            path.push("automations");
            tracing::debug!("Storage path: {:?}", path);
            path
        } else {
            PathBuf::from("/config/advanced-automation/automations")
        };

        // Ensure the storage directory exists
        tracing::debug!("Creating storage directory: {:?}", storage_path);
        fs::create_dir_all(&storage_path).await?;

        let store = Self {
            automations: Arc::new(RwLock::new(HashMap::new())),
            storage_path,
        };

        // Load existing automations
        store.load_automations().await?;

        Ok(store)
    }

    async fn load_automations(&self) -> std::io::Result<()> {
        let mut automations = self.automations.write().await;

        let mut entries = fs::read_dir(&self.storage_path).await?;
        while let Some(entry) = entries.next_entry().await? {
            let path = entry.path();
            if path.extension().map_or(false, |ext| ext == "yaml") {
                if let Ok(content) = fs::read_to_string(&path).await {
                    if let Ok(automation) = serde_yaml::from_str::<Automation>(&content) {
                        automations.insert(automation.id.clone(), automation);
                    }
                }
            }
        }

        Ok(())
    }

    async fn save_automation(&self, automation: &Automation) -> std::io::Result<()> {
        tracing::debug!("Saving automation to storage path: {:?}", self.storage_path);
        let yaml = serde_yaml::to_string(&automation).map_err(|e| {
            std::io::Error::new(std::io::ErrorKind::Other, e)
        })?;

        let file_path = self.storage_path.join(format!("{}.yaml", automation.id));
        tracing::debug!("Writing to file: {:?}", file_path);
        fs::write(file_path, yaml).await
    }

    pub async fn list(&self) -> Vec<Automation> {
        let automations = self.automations.read().await;
        automations.values().cloned().collect()
    }

    pub async fn get(&self, id: &str) -> Option<Automation> {
        let automations = self.automations.read().await;
        automations.get(id).cloned()
    }

    pub async fn create(&self, data: AutomationCreate) -> std::io::Result<Automation> {
        let now = Utc::now();
        let automation = Automation {
            id: Uuid::new_v4().to_string(),
            name: data.name,
            description: data.description,
            enabled: true,
            triggers: data.triggers,
            conditions: data.conditions,
            actions: data.actions,
            created_at: now,
            updated_at: now,
        };

        let mut automations = self.automations.write().await;
        automations.insert(automation.id.clone(), automation.clone());

        self.save_automation(&automation).await?;

        Ok(automation)
    }

    pub async fn update(&self, id: &str, data: AutomationUpdate) -> std::io::Result<Option<Automation>> {
        let mut automations = self.automations.write().await;

        if let Some(automation) = automations.get_mut(id) {
            automation.name = data.name;
            automation.description = data.description;
            automation.enabled = data.enabled;
            automation.triggers = data.triggers;
            automation.conditions = data.conditions;
            automation.actions = data.actions;
            automation.updated_at = Utc::now();

            let automation = automation.clone();
            self.save_automation(&automation).await?;
            Ok(Some(automation))
        } else {
            Ok(None)
        }
    }

    pub async fn delete(&self, id: &str) -> std::io::Result<bool> {
        let mut automations = self.automations.write().await;
        let was_present = automations.remove(id).is_some();

        if was_present {
            let file_path = self.storage_path.join(format!("{}.yaml", id));
            if file_path.exists() {
                fs::remove_file(file_path).await?;
            }
        }

        Ok(was_present)
    }

    pub async fn toggle(&self, id: &str, enabled: bool) -> std::io::Result<Option<Automation>> {
        let mut automations = self.automations.write().await;

        if let Some(automation) = automations.get_mut(id) {
            automation.enabled = enabled;
            automation.updated_at = Utc::now();
            let automation = automation.clone();
            self.save_automation(&automation).await?;
            Ok(Some(automation))
        } else {
            Ok(None)
        }
    }
}
