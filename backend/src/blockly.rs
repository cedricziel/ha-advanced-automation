use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct BlocklyToolbox {
    pub kind: String,
    pub contents: Vec<ToolboxCategory>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ToolboxCategory {
    pub kind: String,
    pub name: String,
    pub colour: String,
    pub contents: Vec<ToolboxBlock>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ToolboxBlock {
    pub kind: String,
    pub r#type: String,
}

pub fn get_default_toolbox() -> BlocklyToolbox {
    BlocklyToolbox {
        kind: "categoryToolbox".to_string(),
        contents: vec![
            ToolboxCategory {
                kind: "category".to_string(),
                name: "Triggers".to_string(),
                colour: "#c30".to_string(),
                contents: vec![
                    ToolboxBlock {
                        kind: "block".to_string(),
                        r#type: "ha_state_trigger".to_string(),
                    },
                    ToolboxBlock {
                        kind: "block".to_string(),
                        r#type: "ha_time_trigger".to_string(),
                    },
                ],
            },
            ToolboxCategory {
                kind: "category".to_string(),
                name: "Conditions".to_string(),
                colour: "#2c5".to_string(),
                contents: vec![
                    ToolboxBlock {
                        kind: "block".to_string(),
                        r#type: "ha_state_condition".to_string(),
                    },
                    ToolboxBlock {
                        kind: "block".to_string(),
                        r#type: "ha_time_condition".to_string(),
                    },
                ],
            },
            ToolboxCategory {
                kind: "category".to_string(),
                name: "Actions".to_string(),
                colour: "#29b".to_string(),
                contents: vec![
                    ToolboxBlock {
                        kind: "block".to_string(),
                        r#type: "ha_call_service".to_string(),
                    },
                    ToolboxBlock {
                        kind: "block".to_string(),
                        r#type: "ha_set_state".to_string(),
                    },
                ],
            },
        ],
    }
}
