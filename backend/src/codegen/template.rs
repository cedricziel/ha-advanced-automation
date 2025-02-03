use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateContext {
    pub variables: HashMap<String, String>,
    pub block_type: String,
}

pub struct TemplateManager {
    templates: HashMap<String, String>,
}

impl TemplateManager {
    pub fn new() -> Self {
        Self {
            templates: HashMap::new(),
        }
    }

    pub fn register_template(&mut self, block_type: String, template: String) {
        self.templates.insert(block_type, template);
    }

    pub fn get_template(&self, block_type: &str) -> Option<&String> {
        self.templates.get(block_type)
    }

    pub fn validate_template(&self, template: &str) -> Result<(), String> {
        // Basic validation - ensure template contains valid Handlebars syntax
        if !template.contains("{{") || !template.contains("}}") {
            return Err("Template must contain at least one variable".to_string());
        }

        // TODO: Add more validation rules
        // - Check for valid Rhai syntax
        // - Validate required variables are present
        // - Check for unsafe operations

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_template_validation() {
        let manager = TemplateManager::new();

        // Valid template
        assert!(manager.validate_template("let x = {{value}};").is_ok());

        // Invalid template - no variables
        assert!(manager.validate_template("let x = 42;").is_err());
    }
}
