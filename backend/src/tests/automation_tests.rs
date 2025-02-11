#[cfg(test)]
use crate::automation::{AutomationCreate, AutomationStore};
#[cfg(test)]
use crate::blocks::{BlockArgument, BlockDefinition, BlockStore};
#[cfg(test)]
use serde_json::json;
#[cfg(test)]
use std::io::Result;

#[cfg(test)]
mod tests {
    use super::*;

    use tempfile::TempDir;

    async fn setup_test_environment() -> Result<(AutomationStore, TempDir)> {
        // Create a temporary directory for test automations
        let temp_dir = tempfile::tempdir().unwrap();

        // Create blocks directory in temp_dir
        let blocks_dir = temp_dir.path().join("blocks");
        tokio::fs::create_dir_all(&blocks_dir).await?;

        // Create a basic BlockStore with a test block
        let mut block_store = BlockStore::with_blocks_dir(blocks_dir).await?;
        block_store
            .create_or_update(BlockDefinition {
                r#type: "logic_operation".to_string(),
                message0: "%1 %2 %3".to_string(),
                args0: Some(vec![
                    BlockArgument {
                        r#type: "input_value".to_string(),
                        name: "A".to_string(),
                        check: Some("Boolean".to_string()),
                        options: None,
                        default: None,
                    },
                    BlockArgument {
                        r#type: "field_dropdown".to_string(),
                        name: "OP".to_string(),
                        check: None,
                        options: Some(vec![
                            vec!["and".to_string(), "AND".to_string()],
                            vec!["or".to_string(), "OR".to_string()],
                        ]),
                        default: None,
                    },
                    BlockArgument {
                        r#type: "input_value".to_string(),
                        name: "B".to_string(),
                        check: Some("Boolean".to_string()),
                        options: None,
                        default: None,
                    },
                ]),
                output: Some("Boolean".to_string()),
                colour: 0,
                tooltip: String::new(),
                rhai_template: Some("{{ A }}; {{ OP }}; {{ B }};".to_string()),
                ..Default::default()
            })
            .await?;

        // Create AutomationStore with the temp directory
        let store =
            AutomationStore::with_storage_path(block_store, temp_dir.path().to_path_buf()).await?;

        Ok((store, temp_dir))
    }

    #[tokio::test]
    async fn test_save_automation_with_valid_workspace() -> Result<()> {
        let (store, _temp_dir) = setup_test_environment().await?;

        let automation = AutomationCreate {
            name: "Test Automation".to_string(),
            description: None,
            triggers: vec![],
            conditions: vec![],
            workspace: json!({
                "blocks": [
                    {
                        "type": "logic_operation",
                        "id": "test_block",
                        "x": 130,
                        "y": 230,
                        "fields": {
                            "OP": {"value": "AND"}
                        },
                        "inputs": {
                            "A": {
                                "block": {
                                    "type": "logic_operation",
                                    "id": "nested_block",
                                    "fields": {
                                        "OP": {"value": "OR"}
                                    }
                                }
                            }
                        }
                    }
                ]
            }),
        };

        let result = store.create(automation).await;
        assert!(
            result.is_ok(),
            "Failed to create automation: {:?}",
            result.err()
        );
        Ok(())
    }

    #[tokio::test]
    async fn test_save_automation_with_invalid_workspace() -> Result<()> {
        let (store, _temp_dir) = setup_test_environment().await?;

        // This replicates the problematic workspace structure from the error
        let automation = AutomationCreate {
            name: "Test Automation".to_string(),
            description: None,
            triggers: vec![],
            conditions: vec![],
            workspace: json!({
                "blocks": {
                    "blocks": {
                        "languageVersion": 0,
                        "blocks": [
                            {
                                "type": "logic_operation",
                                "id": "test_block",
                                "x": 130,
                                "y": 230,
                                "fields": {
                                    "OP": {"value": "AND"}
                                }
                            }
                        ]
                    }
                },
                "variables": []
            }),
        };

        let result = store.create(automation).await;
        assert!(result.is_err(), "Expected error but got success");
        let error = result.unwrap_err();
        assert!(
            error.to_string().contains("No blocks found in workspace"),
            "Unexpected error message: {}",
            error
        );
        Ok(())
    }

    #[tokio::test]
    async fn test_save_automation_with_empty_workspace() -> Result<()> {
        let (store, _temp_dir) = setup_test_environment().await?;

        let automation = AutomationCreate {
            name: "Test Automation".to_string(),
            description: None,
            triggers: vec![],
            conditions: vec![],
            workspace: json!({
                "blocks": []
            }),
        };

        let result = store.create(automation).await;
        assert!(
            result.is_ok(),
            "Failed to create automation with empty workspace"
        );
        let automation = result.unwrap();
        assert!(
            automation.compilation_error.is_none(),
            "Unexpected compilation error"
        );
        Ok(())
    }

    #[tokio::test]
    async fn test_script_generation_with_nested_blocks() -> Result<()> {
        let (store, _temp_dir) = setup_test_environment().await?;

        let automation = AutomationCreate {
            name: "Test Automation".to_string(),
            description: None,
            triggers: vec![],
            conditions: vec![],
            workspace: json!({
                "blocks": [
                    {
                        "type": "logic_operation",
                        "id": "block1",
                        "x": 130,
                        "y": 230,
                        "fields": {
                            "OP": {"value": "AND"}
                        },
                        "inputs": {
                            "A": {
                                "block": {
                                    "type": "logic_operation",
                                    "id": "block2",
                                    "fields": {
                                        "OP": {"value": "OR"}
                                    }
                                }
                            }
                        }
                    }
                ]
            }),
        };

        let result = store.create(automation).await;
        assert!(
            result.is_ok(),
            "Failed to create automation with nested blocks"
        );
        let automation = result.unwrap();
        assert!(
            automation.compilation_error.is_none(),
            "Unexpected compilation error"
        );
        Ok(())
    }
}
