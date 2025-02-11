use crate::codegen::generator::CodeGenerator;
use crate::rhai::engine::ScriptEngine;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::io::Error;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::fs;
use tokio::sync::RwLock;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Automation {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub enabled: bool,
    pub version: i32,
    pub triggers: Vec<TriggerDefinition>,
    pub workspace: Value, // Blockly workspace state as JSON
    pub conditions: Vec<ConditionDefinition>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub compilation_error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TriggerDefinition {
    #[serde(rename = "type")]
    pub r#type: String,
    #[serde(rename = "config")]
    pub configuration: HashMap<String, Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConditionDefinition {
    #[serde(rename = "type")]
    pub r#type: String,
    #[serde(rename = "config")]
    pub configuration: HashMap<String, Value>,
}

#[derive(Debug, Deserialize)]
pub struct AutomationCreate {
    pub name: String,
    pub description: Option<String>,
    pub triggers: Vec<TriggerDefinition>,
    pub workspace: Value,
    pub conditions: Vec<ConditionDefinition>,
}

#[derive(Debug, Deserialize)]
pub struct AutomationUpdate {
    pub name: String,
    pub description: Option<String>,
    pub enabled: bool,
    pub version: i32,
    pub triggers: Vec<TriggerDefinition>,
    pub workspace: Value,
    pub conditions: Vec<ConditionDefinition>,
}

#[derive(Debug, Clone)]
pub struct AutomationStore {
    automations: Arc<RwLock<HashMap<String, Automation>>>,
    storage_path: PathBuf,
    code_generator: CodeGenerator,
    script_engine: ScriptEngine,
}

impl AutomationStore {
    pub async fn new(block_store: crate::blocks::BlockStore) -> std::io::Result<Self> {
        Self::with_storage_path(block_store, Self::default_storage_path()?).await
    }

    fn default_storage_path() -> std::io::Result<PathBuf> {
        if cfg!(debug_assertions) {
            // In debug mode, use the project root directory
            let mut path = std::env::current_dir()?;
            tracing::debug!("Current dir: {:?}", path);
            path.pop(); // Go up one level from backend/
            path.push("automations");
            tracing::debug!("Storage path: {:?}", path);
            Ok(path)
        } else {
            Ok(PathBuf::from("/config/advanced-automation/automations"))
        }
    }

    pub async fn with_storage_path(
        block_store: crate::blocks::BlockStore,
        storage_path: PathBuf,
    ) -> std::io::Result<Self> {

        // Ensure the storage directory exists
        tracing::debug!("Creating storage directory: {:?}", storage_path);
        fs::create_dir_all(&storage_path).await?;

        let store = Self {
            automations: Arc::new(RwLock::new(HashMap::new())),
            storage_path,
            code_generator: CodeGenerator::new(block_store),
            script_engine: ScriptEngine::new(),
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

    async fn save_automation(&self, automation: &mut Automation) -> std::io::Result<()> {
        tracing::debug!("Saving automation to storage path: {:?}", self.storage_path);

        // First try to compile the Rhai script
        match self.compile_automation_script(automation).await {
            Ok(_) => {
                automation.compilation_error = None;
            }
            Err(e) => {
                let error_msg = format!("Script compilation error: {}", e);
                tracing::error!("{}", error_msg.clone());
                automation.compilation_error = Some(error_msg.clone());
                return Err(Error::new(std::io::ErrorKind::Other, error_msg));
            }
        }

        // If compilation succeeded, save the YAML
        let yaml = serde_yaml::to_string(&automation)
            .map_err(|e| Error::new(std::io::ErrorKind::Other, e))?;

        let file_path = self.storage_path.join(format!("{}.yaml", automation.id));
        tracing::debug!("Writing to file: {:?}", file_path);
        fs::write(&file_path, yaml).await?;

        Ok(())
    }

    async fn compile_automation_script(&self, automation: &Automation) -> std::io::Result<()> {
        // Generate Rhai code from the automation's workspace
        let context: HashMap<String, Value> = HashMap::new(); // TODO: Extract context from workspace
        let generated_code = self
            .code_generator
            .generate_code(&automation.workspace, &context)
            .await
            .map_err(|e| Error::new(std::io::ErrorKind::Other, e))?;

        // Validate the generated code compiles
        self.script_engine.compile(&generated_code).map_err(|e| {
            Error::new(
                std::io::ErrorKind::Other,
                format!("Script compilation error: {}", e),
            )
        })?;

        // Save the compiled script
        let script_path = self.storage_path.join(format!("{}.rhai", automation.id));
        tracing::debug!("Writing Rhai script to: {:?}", script_path);
        fs::write(script_path, generated_code).await
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
        let mut automation = Automation {
            id: Uuid::new_v4().to_string(),
            name: data.name,
            description: data.description,
            enabled: true,
            version: 1, // Initial version
            triggers: data.triggers,
            workspace: data.workspace,
            conditions: data.conditions,
            created_at: now,
            updated_at: now,
            compilation_error: None,
        };

        self.save_automation(&mut automation).await?;

        let mut automations = self.automations.write().await;
        automations.insert(automation.id.clone(), automation.clone());

        Ok(automation)
    }

    pub async fn update(
        &self,
        id: &str,
        data: AutomationUpdate,
    ) -> std::io::Result<Option<Automation>> {
        let mut automations = self.automations.write().await;

        if let Some(existing) = automations.get(id) {
            // Version check
            if data.version != existing.version {
                return Err(Error::new(
                    std::io::ErrorKind::Other,
                    "Version mismatch - automation has been modified",
                ));
            }

            let mut updated = Automation {
                id: id.to_string(),
                name: data.name,
                description: data.description,
                enabled: data.enabled,
                version: existing.version + 1, // Increment version
                triggers: data.triggers,
                workspace: data.workspace,
                conditions: data.conditions,
                created_at: existing.created_at,
                updated_at: Utc::now(),
                compilation_error: None,
            };

            self.save_automation(&mut updated).await?;
            automations.insert(id.to_string(), updated.clone());
            Ok(Some(updated))
        } else {
            Ok(None)
        }
    }

    pub async fn delete(&self, id: &str) -> std::io::Result<bool> {
        let mut automations = self.automations.write().await;
        let was_present = automations.remove(id).is_some();

        if was_present {
            // Delete YAML file
            let yaml_path = self.storage_path.join(format!("{}.yaml", id));
            if yaml_path.exists() {
                fs::remove_file(&yaml_path).await?;
            }

            // Delete Rhai script
            let rhai_path = self.storage_path.join(format!("{}.rhai", id));
            if rhai_path.exists() {
                fs::remove_file(&rhai_path).await?;
            }
        }

        Ok(was_present)
    }

    pub async fn toggle(&self, id: &str, enabled: bool) -> std::io::Result<Option<Automation>> {
        let mut automations = self.automations.write().await;

        if let Some(mut automation) = automations.get(id).cloned() {
            automation.enabled = enabled;
            automation.updated_at = Utc::now();
            self.save_automation(&mut automation).await?;
            automations.insert(id.to_string(), automation.clone());
            Ok(Some(automation))
        } else {
            Ok(None)
        }
    }
}
