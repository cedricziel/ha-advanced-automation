use serde::{Deserialize, Serialize};
use serde_json::Value;
use handlebars::Handlebars;
use std::collections::HashMap;
use crate::blocks::BlockDefinition;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RhaiTemplate {
    pub template: String,
    pub variables: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct CodeGenerator {
    handlebars: Handlebars<'static>,
}

impl CodeGenerator {
    pub fn new() -> Self {
        let mut handlebars = Handlebars::new();
        handlebars.set_strict_mode(true);

        Self { handlebars }
    }

    pub fn generate_code(&self, workspace: &Value, context: &HashMap<String, Value>) -> Result<String, String> {
        // TODO: Convert workspace JSON to Rhai code
        // For now, return a simple test script
        Ok(String::from(r#"
// Generated Rhai script
on_state_change("light.living_room", |old_state, new_state| {
    if new_state.state == "on" {
        set_state("light.kitchen", "on");
    }
});
"#))
    }
}
