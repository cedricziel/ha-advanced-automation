use serde::{Deserialize, Serialize};
use crate::blocks::{BlockDefinition};

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
