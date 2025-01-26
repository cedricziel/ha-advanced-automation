use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
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
}

impl AutomationStore {
    pub fn new() -> Self {
        Self {
            automations: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn list(&self) -> Vec<Automation> {
        let automations = self.automations.read().await;
        automations.values().cloned().collect()
    }

    pub async fn get(&self, id: &str) -> Option<Automation> {
        let automations = self.automations.read().await;
        automations.get(id).cloned()
    }

    pub async fn create(&self, data: AutomationCreate) -> Automation {
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
        automation
    }

    pub async fn update(&self, id: &str, data: AutomationUpdate) -> Option<Automation> {
        let mut automations = self.automations.write().await;

        if let Some(automation) = automations.get_mut(id) {
            automation.name = data.name;
            automation.description = data.description;
            automation.enabled = data.enabled;
            automation.triggers = data.triggers;
            automation.conditions = data.conditions;
            automation.actions = data.actions;
            automation.updated_at = Utc::now();

            Some(automation.clone())
        } else {
            None
        }
    }

    pub async fn delete(&self, id: &str) -> bool {
        let mut automations = self.automations.write().await;
        automations.remove(id).is_some()
    }

    pub async fn toggle(&self, id: &str, enabled: bool) -> Option<Automation> {
        let mut automations = self.automations.write().await;

        if let Some(automation) = automations.get_mut(id) {
            automation.enabled = enabled;
            automation.updated_at = Utc::now();
            Some(automation.clone())
        } else {
            None
        }
    }
}
