use serde::{Deserialize, Serialize};
use crate::blocks::BlockDefinition;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolboxCategory {
    pub kind: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub categorystyle: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub colour: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub custom: Option<String>,
    pub contents: Vec<ToolboxItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind")]
pub enum ToolboxItem {
    #[serde(rename = "block")]
    Block {
        r#type: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        disabled: Option<bool>,
        #[serde(skip_serializing_if = "Option::is_none")]
        gap: Option<i32>,
        #[serde(skip_serializing_if = "Option::is_none")]
        fields: Option<serde_json::Value>,
        #[serde(skip_serializing_if = "Option::is_none")]
        inputs: Option<serde_json::Value>,
        #[serde(skip_serializing_if = "Option::is_none")]
        mutation: Option<serde_json::Value>,
    },
    #[serde(rename = "label")]
    Label {
        text: String,
        #[serde(rename = "web-class")]
        web_class: Option<String>,
    },
    #[serde(rename = "sep")]
    Separator,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BlocklyToolbox {
    pub kind: String,
    pub contents: Vec<ToolboxCategory>,
}

#[derive(Debug, Serialize)]
pub struct ToolboxResponse {
    pub toolbox: BlocklyToolbox,
    pub blocks: Vec<BlockDefinition>,
}

impl BlocklyToolbox {
    pub fn new() -> Self {
        Self {
            kind: "categoryToolbox".to_string(),
            contents: vec![],
        }
    }

    pub fn add_category(&mut self, category: ToolboxCategory) {
        self.contents.push(category);
    }
}

pub fn create_default_toolbox(blocks: &[BlockDefinition]) -> BlocklyToolbox {
    let mut toolbox = BlocklyToolbox::new();

    // Add standard Blockly categories
    toolbox.add_category(ToolboxCategory {
        kind: "category".to_string(),
        name: "Logic".to_string(),
        categorystyle: Some("logic_category".to_string()),
        colour: None,
        custom: None,
        contents: vec![
            ToolboxItem::Block { r#type: "controls_if".to_string(), disabled: None, gap: None, fields: None, inputs: None, mutation: None },
            ToolboxItem::Block { r#type: "logic_compare".to_string(), disabled: None, gap: None, fields: None, inputs: None, mutation: None },
            ToolboxItem::Block { r#type: "logic_operation".to_string(), disabled: None, gap: None, fields: None, inputs: None, mutation: None },
            ToolboxItem::Block { r#type: "logic_negate".to_string(), disabled: None, gap: None, fields: None, inputs: None, mutation: None },
            ToolboxItem::Block { r#type: "logic_boolean".to_string(), disabled: None, gap: None, fields: None, inputs: None, mutation: None },
            ToolboxItem::Block { r#type: "logic_ternary".to_string(), disabled: None, gap: None, fields: None, inputs: None, mutation: None },
        ],
    });

    toolbox.add_category(ToolboxCategory {
        kind: "category".to_string(),
        name: "Loops".to_string(),
        categorystyle: Some("loop_category".to_string()),
        colour: None,
        custom: None,
        contents: vec![
            ToolboxItem::Block { r#type: "controls_repeat_ext".to_string(), disabled: None, gap: None, fields: None, inputs: None, mutation: None },
            ToolboxItem::Block { r#type: "controls_whileUntil".to_string(), disabled: None, gap: None, fields: None, inputs: None, mutation: None },
            ToolboxItem::Block { r#type: "controls_for".to_string(), disabled: None, gap: None, fields: None, inputs: None, mutation: None },
            ToolboxItem::Block { r#type: "controls_forEach".to_string(), disabled: None, gap: None, fields: None, inputs: None, mutation: None },
            ToolboxItem::Block { r#type: "controls_flow_statements".to_string(), disabled: None, gap: None, fields: None, inputs: None, mutation: None },
        ],
    });

    toolbox.add_category(ToolboxCategory {
        kind: "category".to_string(),
        name: "Math".to_string(),
        categorystyle: Some("math_category".to_string()),
        colour: None,
        custom: None,
        contents: vec![
            ToolboxItem::Block { r#type: "math_number".to_string(), disabled: None, gap: None, fields: None, inputs: None, mutation: None },
            ToolboxItem::Block { r#type: "math_arithmetic".to_string(), disabled: None, gap: None, fields: None, inputs: None, mutation: None },
            ToolboxItem::Block { r#type: "math_single".to_string(), disabled: None, gap: None, fields: None, inputs: None, mutation: None },
            ToolboxItem::Block { r#type: "math_round".to_string(), disabled: None, gap: None, fields: None, inputs: None, mutation: None },
            ToolboxItem::Block { r#type: "math_modulo".to_string(), disabled: None, gap: None, fields: None, inputs: None, mutation: None },
            ToolboxItem::Block { r#type: "math_constrain".to_string(), disabled: None, gap: None, fields: None, inputs: None, mutation: None },
            ToolboxItem::Block { r#type: "math_random_int".to_string(), disabled: None, gap: None, fields: None, inputs: None, mutation: None },
            ToolboxItem::Block { r#type: "math_random_float".to_string(), disabled: None, gap: None, fields: None, inputs: None, mutation: None },
        ],
    });

    toolbox.add_category(ToolboxCategory {
        kind: "category".to_string(),
        name: "Lists".to_string(),
        categorystyle: Some("list_category".to_string()),
        colour: None,
        custom: None,
        contents: vec![
            ToolboxItem::Block { r#type: "lists_create_empty".to_string(), disabled: None, gap: None, fields: None, inputs: None, mutation: None },
            ToolboxItem::Block { r#type: "lists_create_with".to_string(), disabled: None, gap: None, fields: None, inputs: None, mutation: None },
            ToolboxItem::Block { r#type: "lists_repeat".to_string(), disabled: None, gap: None, fields: None, inputs: None, mutation: None },
            ToolboxItem::Block { r#type: "lists_length".to_string(), disabled: None, gap: None, fields: None, inputs: None, mutation: None },
            ToolboxItem::Block { r#type: "lists_isEmpty".to_string(), disabled: None, gap: None, fields: None, inputs: None, mutation: None },
            ToolboxItem::Block { r#type: "lists_indexOf".to_string(), disabled: None, gap: None, fields: None, inputs: None, mutation: None },
            ToolboxItem::Block { r#type: "lists_getIndex".to_string(), disabled: None, gap: None, fields: None, inputs: None, mutation: None },
            ToolboxItem::Block { r#type: "lists_setIndex".to_string(), disabled: None, gap: None, fields: None, inputs: None, mutation: None },
            ToolboxItem::Block { r#type: "lists_getSublist".to_string(), disabled: None, gap: None, fields: None, inputs: None, mutation: None },
            ToolboxItem::Block { r#type: "lists_sort".to_string(), disabled: None, gap: None, fields: None, inputs: None, mutation: None },
            ToolboxItem::Block { r#type: "lists_reverse".to_string(), disabled: None, gap: None, fields: None, inputs: None, mutation: None },
        ],
    });

    toolbox.add_category(ToolboxCategory {
        kind: "category".to_string(),
        name: "Text".to_string(),
        categorystyle: Some("text_category".to_string()),
        colour: None,
        custom: None,
        contents: vec![
            ToolboxItem::Block { r#type: "text".to_string(), disabled: None, gap: None, fields: None, inputs: None, mutation: None },
            ToolboxItem::Block { r#type: "text_join".to_string(), disabled: None, gap: None, fields: None, inputs: None, mutation: None },
            ToolboxItem::Block { r#type: "text_append".to_string(), disabled: None, gap: None, fields: None, inputs: None, mutation: None },
            ToolboxItem::Block { r#type: "text_length".to_string(), disabled: None, gap: None, fields: None, inputs: None, mutation: None },
            ToolboxItem::Block { r#type: "text_isEmpty".to_string(), disabled: None, gap: None, fields: None, inputs: None, mutation: None },
            ToolboxItem::Block { r#type: "text_indexOf".to_string(), disabled: None, gap: None, fields: None, inputs: None, mutation: None },
            ToolboxItem::Block { r#type: "text_charAt".to_string(), disabled: None, gap: None, fields: None, inputs: None, mutation: None },
            ToolboxItem::Block { r#type: "text_getSubstring".to_string(), disabled: None, gap: None, fields: None, inputs: None, mutation: None },
            ToolboxItem::Block { r#type: "text_changeCase".to_string(), disabled: None, gap: None, fields: None, inputs: None, mutation: None },
            ToolboxItem::Block { r#type: "text_trim".to_string(), disabled: None, gap: None, fields: None, inputs: None, mutation: None },
            ToolboxItem::Block { r#type: "text_print".to_string(), disabled: None, gap: None, fields: None, inputs: None, mutation: None },
            ToolboxItem::Block { r#type: "text_prompt_ext".to_string(), disabled: Some(true), gap: None, fields: None, inputs: None, mutation: None },
            ToolboxItem::Block { r#type: "text_prompt".to_string(), disabled: Some(true), gap: None, fields: None, inputs: None, mutation: None },
            ToolboxItem::Block { r#type: "text_count".to_string(), disabled: None, gap: None, fields: None, inputs: None, mutation: None },
            ToolboxItem::Block { r#type: "text_replace".to_string(), disabled: None, gap: None, fields: None, inputs: None, mutation: None },
            ToolboxItem::Block { r#type: "text_reverse".to_string(), disabled: None, gap: None, fields: None, inputs: None, mutation: None },
        ],
    });

    toolbox.add_category(ToolboxCategory {
        kind: "category".to_string(),
        name: "Variables".to_string(),
        categorystyle: Some("variable_category".to_string()),
        colour: None,
        custom: None,
        contents: vec![
            ToolboxItem::Block { r#type: "variables_get".to_string(), disabled: None, gap: None, fields: None, inputs: None, mutation: None },
            ToolboxItem::Block { r#type: "variables_set".to_string(), disabled: None, gap: None, fields: None, inputs: None, mutation: None },
            ToolboxItem::Block { r#type: "variables_get_dynamic".to_string(), disabled: None, gap: None, fields: None, inputs: None, mutation: None },
            ToolboxItem::Block { r#type: "variables_set_dynamic".to_string(), disabled: None, gap: None, fields: None, inputs: None, mutation: None },
        ],
    });

    toolbox.add_category(ToolboxCategory {
        kind: "category".to_string(),
        name: "Procedures".to_string(),
        categorystyle: Some("procedure_category".to_string()),
        colour: None,
        custom: None,
        contents: vec![
            ToolboxItem::Block { r#type: "procedures_defreturn".to_string(), disabled: None, gap: None, fields: None, inputs: None, mutation: None },
            ToolboxItem::Block { r#type: "procedures_defnoreturn".to_string(), disabled: None, gap: None, fields: None, inputs: None, mutation: None },
            ToolboxItem::Block { r#type: "procedures_callreturn".to_string(), disabled: None, gap: None, fields: None, inputs: None, mutation: None },
            ToolboxItem::Block { r#type: "procedures_callnoreturn".to_string(), disabled: None, gap: None, fields: None, inputs: None, mutation: None },
            ToolboxItem::Block { r#type: "procedures_ifreturn".to_string(), disabled: None, gap: None, fields: None, inputs: None, mutation: None },
            ToolboxItem::Block { r#type: "procedures_mutatorarg".to_string(), disabled: None, gap: None, fields: None, inputs: None, mutation: None },
            ToolboxItem::Block { r#type: "procedures_mutatorcontainer".to_string(), disabled: None, gap: None, fields: None, inputs: None, mutation: None },
        ],
    });

    // Helper function to create block items
    let create_block_item = |block: &BlockDefinition| ToolboxItem::Block {
        r#type: block.r#type.clone(),
        disabled: None,
        gap: None,
        fields: None,
        inputs: None,
        mutation: None,
    };

    // Filter blocks into categories
    let (ha_blocks, user_blocks): (Vec<_>, Vec<_>) = blocks
        .iter()
        .partition(|b| b.id.is_none());

    // Add Home Assistant Triggers category
    let trigger_blocks: Vec<_> = ha_blocks
        .iter()
        .filter(|b| b.r#type.contains("trigger"))
        .map(|b| create_block_item(b))
        .collect();

    if !trigger_blocks.is_empty() {
        toolbox.add_category(ToolboxCategory {
            kind: "category".to_string(),
            name: "Triggers".to_string(),
            categorystyle: None,
            colour: Some("#5b80a5".to_string()),  // 230 hue -> blue
            custom: None,
            contents: trigger_blocks,
        });
    }

    // Add Home Assistant Conditions category
    let condition_blocks: Vec<_> = ha_blocks
        .iter()
        .filter(|b| b.r#type.contains("condition"))
        .map(|b| create_block_item(b))
        .collect();

    if !condition_blocks.is_empty() {
        toolbox.add_category(ToolboxCategory {
            kind: "category".to_string(),
            name: "Conditions".to_string(),
            categorystyle: None,
            colour: Some("#59a869".to_string()),  // 120 hue -> green
            custom: None,
            contents: condition_blocks,
        });
    }

    // Add Home Assistant Actions category
    let action_blocks: Vec<_> = ha_blocks
        .iter()
        .filter(|b| !b.r#type.contains("trigger") && !b.r#type.contains("condition"))
        .map(|b| create_block_item(b))
        .collect();

    if !action_blocks.is_empty() {
        toolbox.add_category(ToolboxCategory {
            kind: "category".to_string(),
            name: "Actions".to_string(),
            categorystyle: None,
            colour: Some("#a5995b".to_string()),  // 60 hue -> yellow
            custom: None,
            contents: action_blocks,
        });
    }

    // Add User Blocks category if any exist
    if !user_blocks.is_empty() {
        let user_block_items: Vec<_> = user_blocks
            .iter()
            .map(|b| create_block_item(b))
            .collect();

        toolbox.add_category(ToolboxCategory {
            kind: "category".to_string(),
            name: "User Blocks".to_string(),
            categorystyle: Some("user_category".to_string()),
            colour: None,
            custom: None,
            contents: user_block_items,
        });
    }

    toolbox
}
