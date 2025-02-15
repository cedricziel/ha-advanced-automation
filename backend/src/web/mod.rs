pub mod filters;
pub mod routes;

use askama::Template;
use chrono::{DateTime, Utc};
use filters::json_encode;
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Template)]
#[template(path = "automations/create.html")]
pub struct AutomationCreateTemplate {
    pub toolbox: Option<Value>,
}

#[derive(Template)]
#[template(path = "automations/edit.html")]
pub struct AutomationEditTemplate {
    pub automation: AutomationViewModel,
    pub toolbox: Option<Value>,
}

#[derive(Template)]
#[template(path = "automations/list.html")]
pub struct AutomationsListTemplate {
    pub automations: Vec<AutomationViewModel>,
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct AutomationViewModel {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub enabled: bool,
    pub version: i32,
    pub updated_at: DateTime<Utc>,
    pub workspace: Value,
}

impl AutomationViewModel {
    pub fn from_automation(automation: crate::automation::Automation) -> Self {
        Self {
            id: automation.id.to_string(),
            name: automation.name.clone(),
            description: automation.description.clone(),
            enabled: automation.enabled,
            version: automation.version,
            updated_at: automation.updated_at,
            workspace: automation.workspace.clone(),
        }
    }
}
