pub mod routes;

use askama::Template;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Template)]
#[template(path = "automations/create.html")]
pub struct AutomationCreateTemplate {
    pub toolbox: Option<Value>,
}

#[derive(Template)]
#[template(path = "automations/list.html")]
pub struct AutomationsListTemplate {
    pub automations: Vec<AutomationViewModel>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AutomationViewModel {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub enabled: bool,
    pub version: i32,
    pub updated_at: DateTime<Utc>,
}

impl AutomationViewModel {
    pub fn from_automation(automation: crate::automation::Automation) -> Self {
        Self {
            id: automation.id.to_string(),
            name: automation.name,
            description: automation.description,
            enabled: automation.enabled,
            version: automation.version,
            updated_at: automation.updated_at,
        }
    }
}
