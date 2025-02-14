use crate::blocks::BlockStore;
use handlebars::{Context, Handlebars, Helper, HelperResult, Output, RenderContext};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RhaiTemplate {
    pub template: String,
    pub variables: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct CodeGenerator {
    handlebars: Handlebars<'static>,
    block_store: BlockStore,
}

impl CodeGenerator {
    pub fn new(block_store: BlockStore) -> Self {
        let mut handlebars = Handlebars::new();
        handlebars.set_strict_mode(true);

        // Register helpers for our template syntax
        handlebars.register_helper("switch", Box::new(Self::switch_helper));
        handlebars.register_helper("case", Box::new(Self::case_helper));
        handlebars.register_helper("each", Box::new(Self::each_helper));

        Self {
            handlebars,
            block_store,
        }
    }

    fn switch_helper(
        h: &Helper,
        _: &Handlebars,
        _: &Context,
        _: &mut RenderContext,
        out: &mut dyn Output,
    ) -> HelperResult {
        let value = h.param(0).unwrap().value();
        out.write(&format!("switch_{}", value))?;
        Ok(())
    }

    fn case_helper(
        h: &Helper,
        _: &Handlebars,
        _: &Context,
        _: &mut RenderContext,
        out: &mut dyn Output,
    ) -> HelperResult {
        let value = h.param(0).unwrap().value();
        out.write(&format!("case_{}", value))?;
        Ok(())
    }

    fn each_helper(
        h: &Helper,
        _: &Handlebars,
        _: &Context,
        _: &mut RenderContext,
        out: &mut dyn Output,
    ) -> HelperResult {
        let value = h.param(0).unwrap().value();
        out.write(&format!("each_{}", value))?;
        Ok(())
    }

    pub async fn generate_code(
        &self,
        workspace: &Value,
        context: &HashMap<String, Value>,
    ) -> Result<String, String> {
        // Try nested structure first (new format)
        let blocks = workspace
            .get("blocks")
            .and_then(|b| b.get("blocks"))
            .and_then(|b| b.get("blocks"))
            .and_then(|b| b.as_array())
            // Fallback to flat structure (old format)
            .or_else(|| workspace.get("blocks").and_then(|b| b.as_array()))
            .ok_or_else(|| "No blocks found in workspace".to_string())?;

        if blocks.is_empty() {
            return Ok(String::new());
        }

        // Start with the first block
        self.generate_block_code(&blocks[0], context).await
    }

    fn generate_block_code<'a>(
        &'a self,
        block: &'a Value,
        context: &'a HashMap<String, Value>,
    ) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<String, String>> + Send + 'a>> {
        Box::pin(async move {
            let block_type = block
                .get("type")
                .and_then(|t| t.as_str())
                .ok_or_else(|| "Block type not found".to_string())?;

            // Get block definition with template
            let block_def =
                self.block_store.get(block_type).await.ok_or_else(|| {
                    format!("Block definition not found for type: {}", block_type)
                })?;

            let template = block_def
                .rhai_template
                .ok_or_else(|| format!("No Rhai template found for block type: {}", block_type))?;

            // Initialize field values with empty strings for all expected inputs
            let mut field_values = HashMap::new();
            if let Some(args) = &block_def.args0 {
                for arg in args {
                    field_values.insert(arg.name.clone(), Value::String(String::new()));
                }
            }

            // Extract field values from the block
            if let Some(fields) = block.get("fields").and_then(|f| f.as_object()) {
                for (key, value) in fields {
                    if let Some(field_value) = value.get("value") {
                        field_values.insert(key.clone(), field_value.clone());
                    }
                }
            }

            // Handle inputs (for value inputs)
            if let Some(inputs) = block.get("inputs").and_then(|i| i.as_object()) {
                for (key, value) in inputs {
                    match value {
                        Value::Object(input_obj) => {
                            if let Some(input_block) = input_obj.get("block") {
                                let input_code = self.generate_block_code(input_block, context).await?;
                                field_values.insert(key.clone(), Value::String(input_code));
                            }
                        }
                        _ => return Err(format!("Invalid input value for key {}: {:?}", key, value)),
                    }
                }
            }

            // For controls_if block, initialize hasElse to false by default
            if block_type == "controls_if" {
                field_values.insert("hasElse".to_string(), Value::Bool(false));
            }

            // Handle statements (for statement inputs)
            if let Some(statements) = block.get("statements").and_then(|s| s.as_object()) {
                for (key, value) in statements {
                    if let Some(statement_block) = value.get("block") {
                        let statement_code =
                            self.generate_block_code(statement_block, context).await?;
                        field_values.insert(key.clone(), Value::String(statement_code));
                    }
                }

                // For controls_if block, update hasElse if ELSE statement exists
                if block_type == "controls_if" && statements.contains_key("ELSE") {
                    field_values.insert("hasElse".to_string(), Value::Bool(true));
                }
            }

            // Handle next block if it exists
            if let Some(next) = block.get("next").and_then(|n| n.get("block")) {
                let next_code = self.generate_block_code(next, context).await?;
                field_values.insert("NEXT".to_string(), Value::String(next_code));
            }

            // Handle mutation data if it exists
            if let Some(mutation) = block.get("mutation").and_then(|m| m.as_object()) {
                for (key, value) in mutation {
                    field_values.insert(format!("mutation_{}", key), value.clone());
                }
            }

            // Render the template with the field values
            let rendered = self.handlebars
                .render_template(&template, &field_values)
                .map_err(|e| format!("Template rendering error: {}", e))?;
            Ok(rendered)
        })
    }
}
