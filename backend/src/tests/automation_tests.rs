#[cfg(test)]
use crate::automation::{AutomationCreate, AutomationStore, AutomationUpdate};
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
                rhai_template: Some("{{ OP }};".to_string()),
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

        // Create an automation with an invalid workspace structure
        let automation = AutomationCreate {
            name: "Test Automation".to_string(),
            description: None,
            triggers: vec![],
            conditions: vec![],
            workspace: json!({
                "blocks": {
                    "invalid": "structure",
                    "not_an_array": {
                        "type": "logic_operation",
                        "id": "test_block"
                    }
                }
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

    #[tokio::test]
    async fn test_update_automation_script() -> Result<()> {
        let (store, _temp_dir) = setup_test_environment().await?;

        // Create initial automation
        let create_data = AutomationCreate {
            name: "Update Test".to_string(),
            description: Some("Initial version".to_string()),
            triggers: vec![],
            conditions: vec![],
            workspace: json!({
                "blocks": [
                    {
                        "type": "logic_operation",
                        "id": "block1",
                        "fields": {
                            "OP": {"value": "AND"}
                        }
                    }
                ]
            }),
        };

        let initial = store.create(create_data).await?;
        assert_eq!(initial.version, 1);

        // Update automation with modified blocks
        let update_data = AutomationUpdate {
            name: "Updated Test".to_string(),
            description: Some("Updated version".to_string()),
            enabled: true,
            version: 1,
            triggers: vec![],
            conditions: vec![],
            workspace: json!({
                "blocks": [
                    {
                        "type": "logic_operation",
                        "id": "block1",
                        "fields": {
                            "OP": {"value": "OR"}
                        }
                    }
                ]
            }),
        };

        let updated = store.update(&initial.id, update_data).await?.unwrap();
        assert_eq!(updated.version, 2);
        assert_eq!(updated.name, "Updated Test");
        assert!(updated.compilation_error.is_none());

        Ok(())
    }

    #[tokio::test]
    async fn test_invalid_block_type() -> Result<()> {
        let (store, _temp_dir) = setup_test_environment().await?;

        let automation = AutomationCreate {
            name: "Invalid Block Test".to_string(),
            description: None,
            triggers: vec![],
            conditions: vec![],
            workspace: json!({
                "blocks": [
                    {
                        "type": "nonexistent_block_type",
                        "id": "block1",
                        "fields": {}
                    }
                ]
            }),
        };

        let result = store.create(automation).await;
        assert!(result.is_err());
        let error = result.unwrap_err();
        assert!(error.to_string().contains("Block definition not found"));

        Ok(())
    }

    #[tokio::test]
    async fn test_version_control() -> Result<()> {
        let (store, _temp_dir) = setup_test_environment().await?;

        // Create initial automation
        let create_data = AutomationCreate {
            name: "Version Test".to_string(),
            description: None,
            triggers: vec![],
            conditions: vec![],
            workspace: json!({
                "blocks": [
                    {
                        "type": "logic_operation",
                        "id": "block1",
                        "fields": {
                            "OP": {"value": "AND"}
                        }
                    }
                ]
            }),
        };

        let initial = store.create(create_data).await?;
        assert_eq!(initial.version, 1);

        // Try to update with wrong version
        let wrong_version_update = AutomationUpdate {
            name: "Version Test".to_string(),
            description: None,
            enabled: true,
            version: 2, // Wrong version
            triggers: vec![],
            conditions: vec![],
            workspace: initial.workspace.clone(),
        };

        let result = store.update(&initial.id, wrong_version_update).await;
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Version mismatch"));

        Ok(())
    }

    #[tokio::test]
    async fn test_delete_automation() -> Result<()> {
        let (store, temp_dir) = setup_test_environment().await?;

        // Create automation
        let create_data = AutomationCreate {
            name: "Delete Test".to_string(),
            description: None,
            triggers: vec![],
            conditions: vec![],
            workspace: json!({
                "blocks": [
                    {
                        "type": "logic_operation",
                        "id": "block1",
                        "fields": {
                            "OP": {"value": "AND"}
                        }
                    }
                ]
            }),
        };

        let automation = store.create(create_data).await?;

        // Verify files exist
        let yaml_path = temp_dir.path().join(format!("{}.yaml", automation.id));
        let rhai_path = temp_dir.path().join(format!("{}.rhai", automation.id));
        assert!(yaml_path.exists());
        assert!(rhai_path.exists());

        // Delete automation
        let deleted = store.delete(&automation.id).await?;
        assert!(deleted);

        // Verify files are removed
        assert!(!yaml_path.exists());
        assert!(!rhai_path.exists());

        // Verify automation is removed from store
        assert!(store.get(&automation.id).await.is_none());

        Ok(())
    }

    #[tokio::test]
    async fn test_toggle_automation() -> Result<()> {
        let (store, _temp_dir) = setup_test_environment().await?;

        // Create automation
        let create_data = AutomationCreate {
            name: "Toggle Test".to_string(),
            description: None,
            triggers: vec![],
            conditions: vec![],
            workspace: json!({
                "blocks": [
                    {
                        "type": "logic_operation",
                        "id": "block1",
                        "fields": {
                            "OP": {"value": "AND"}
                        }
                    }
                ]
            }),
        };

        let automation = store.create(create_data).await?;
        assert!(automation.enabled);

        // Toggle off
        let toggled = store.toggle(&automation.id, false).await?.unwrap();
        assert!(!toggled.enabled);

        // Toggle on
        let toggled = store.toggle(&automation.id, true).await?.unwrap();
        assert!(toggled.enabled);

        Ok(())
    }

    #[tokio::test]
    async fn test_controls_if_block() -> Result<()> {
        let (_store, temp_dir) = setup_test_environment().await?;

        // Create a BlockStore with both controls_if and logic_operation blocks
        let blocks_dir = temp_dir.path().join("blocks_if");
        tokio::fs::create_dir_all(&blocks_dir).await?;
        let block_store = BlockStore::with_blocks_dir(blocks_dir).await?;

        // Add logic_operation block
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
                rhai_template: Some("{{ OP }};".to_string()),
                ..Default::default()
            })
            .await?;

        // Add controls_if block
        block_store
            .create_or_update(BlockDefinition {
                r#type: "controls_if".to_string(),
                message0: "if %1 do %2".to_string(),
                args0: Some(vec![
                    BlockArgument {
                        r#type: "input_value".to_string(),
                        name: "IF0".to_string(),
                        check: Some("Boolean".to_string()),
                        options: None,
                        default: None,
                    },
                    BlockArgument {
                        r#type: "input_statement".to_string(),
                        name: "DO0".to_string(),
                        check: None,
                        options: None,
                        default: None,
                    },
                ]),
                output: None,
                colour: 0,
                tooltip: String::new(),
                rhai_template: Some("if {{IF0}} {\n    {{DO0}}\n}{{#each elseif}}\nelse if {{IF}} {\n    {{DO}}\n}{{/each}}{{#if hasElse}}\nelse {\n    {{ELSE}}\n}{{/if}}".to_string()),
                ..Default::default()
            })
            .await?;

        // Create new store with the if block
        let store =
            AutomationStore::with_storage_path(block_store, temp_dir.path().to_path_buf()).await?;

        // Test basic if without else
        let basic_if = AutomationCreate {
            name: "Basic If Test".to_string(),
            description: None,
            triggers: vec![],
            conditions: vec![],
            workspace: json!({
                "blocks": [
                    {
                        "type": "controls_if",
                        "id": "test_if",
                        "fields": {},
                        "inputs": {
                            "IF0": {
                                "block": {
                                    "type": "logic_operation",
                                    "id": "condition",
                                    "fields": {
                                        "OP": {"value": "AND"}
                                    }
                                }
                            }
                        },
                        "statements": {
                            "DO0": {
                                "block": {
                                    "type": "logic_operation",
                                    "id": "action",
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

        let result = store.create(basic_if).await;
        assert!(
            result.is_ok(),
            "Failed to create automation with basic if block: {:?}",
            result.err()
        );
        let automation = result.unwrap();
        assert!(
            automation.compilation_error.is_none(),
            "Unexpected compilation error in basic if: {:?}",
            automation.compilation_error
        );

        // Verify the generated Rhai script
        let rhai_path = temp_dir.path().join(format!("{}.rhai", automation.id));
        let script_content = tokio::fs::read_to_string(rhai_path).await?;
        assert!(script_content.contains("if AND {"));
        assert!(script_content.contains("    OR"));

        // Test if with else
        let if_with_else = AutomationCreate {
            name: "If-Else Test".to_string(),
            description: None,
            triggers: vec![],
            conditions: vec![],
            workspace: json!({
                "blocks": [
                    {
                        "type": "controls_if",
                        "id": "test_if_else",
                        "fields": {},
                        "inputs": {
                            "IF0": {
                                "block": {
                                    "type": "logic_operation",
                                    "id": "condition",
                                    "fields": {
                                        "OP": {"value": "AND"}
                                    }
                                }
                            }
                        },
                        "statements": {
                            "DO0": {
                                "block": {
                                    "type": "logic_operation",
                                    "id": "then_action",
                                    "fields": {
                                        "OP": {"value": "OR"}
                                    }
                                }
                            },
                            "ELSE": {
                                "block": {
                                    "type": "logic_operation",
                                    "id": "else_action",
                                    "fields": {
                                        "OP": {"value": "AND"}
                                    }
                                }
                            }
                        }
                    }
                ]
            }),
        };

        let result = store.create(if_with_else).await;
        assert!(
            result.is_ok(),
            "Failed to create automation with if-else block: {:?}",
            result.err()
        );
        let automation = result.unwrap();
        assert!(
            automation.compilation_error.is_none(),
            "Unexpected compilation error in if-else: {:?}",
            automation.compilation_error
        );

        // Verify the generated Rhai script
        let rhai_path = temp_dir.path().join(format!("{}.rhai", automation.id));
        let script_content = tokio::fs::read_to_string(rhai_path).await?;
        assert!(script_content.contains("if AND {"));
        assert!(script_content.contains("    OR"));
        assert!(script_content.contains("else {"));
        assert!(script_content.contains("    AND"));

        Ok(())
    }

    #[tokio::test]
    async fn test_invalid_rhai_syntax() -> Result<()> {
        let (_store, temp_dir) = setup_test_environment().await?;

        // Create a new BlockStore with invalid Rhai template
        let blocks_dir = temp_dir.path().join("blocks_invalid");
        tokio::fs::create_dir_all(&blocks_dir).await?;
        let block_store = BlockStore::with_blocks_dir(blocks_dir).await?;
        block_store
            .create_or_update(BlockDefinition {
                r#type: "invalid_rhai".to_string(),
                message0: "Invalid Rhai".to_string(),
                args0: Some(vec![]),
                output: None,
                colour: 0,
                tooltip: String::new(),
                rhai_template: Some("invalid {{ syntax; }}".to_string()),
                ..Default::default()
            })
            .await?;

        // Create new store with the invalid block
        let store =
            AutomationStore::with_storage_path(block_store, temp_dir.path().to_path_buf()).await?;

        let automation = AutomationCreate {
            name: "Invalid Rhai Test".to_string(),
            description: None,
            triggers: vec![],
            conditions: vec![],
            workspace: json!({
                "blocks": [
                    {
                        "type": "invalid_rhai",
                        "id": "block1",
                        "fields": {}
                    }
                ]
            }),
        };

        let result = store.create(automation).await;
        assert!(result.is_err());
        let error = result.unwrap_err();
        assert!(error.to_string().contains("Script compilation error"));

        Ok(())
    }
}
