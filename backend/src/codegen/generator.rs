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

pub struct CodeGenerator {
    handlebars: Handlebars<'static>,
}

impl CodeGenerator {
    pub fn new() -> Self {
        let mut handlebars = Handlebars::new();
        handlebars.set_strict_mode(true);

        Self { handlebars }
    }

    pub fn generate_code(&self, block: &BlockDefinition, context: &HashMap<String, Value>) -> Result<String, String> {
        // Get the Rhai template from block definition
        let template = block.rhai_template.as_ref()
            .ok_or_else(|| format!("No Rhai template found for block type: {}", block.r#type))?;

        // Render the template with the context
        self.handlebars
            .render_template(template, &context)
            .map_err(|e| format!("Template rendering error: {}", e))
    }
}
