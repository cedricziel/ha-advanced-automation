use askama::Template;
use axum::{
    extract::{Json, Path, Query, State},
    http::{header, StatusCode},
    response::{Html, IntoResponse},
    routing::{delete, get, post, put},
    Form, Router,
};
use chrono::{DateTime, Utc};
use serde::Deserialize;
use std::sync::Arc;

use super::{
    AutomationCreateTemplate, AutomationEditTemplate, AutomationViewModel, AutomationsListTemplate,
};
use crate::{automation::AutomationUpdate, AppState};

#[derive(Deserialize)]
pub struct SearchQuery {
    q: Option<String>,
}

use serde_json::Value;

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route(
            "/",
            get(|| async {
                (
                    StatusCode::SEE_OTHER,
                    [(header::LOCATION, "/automations")],
                    "",
                )
                    .into_response()
            }),
        )
        .route("/automations", get(list_automations))
        .route("/automations/search", get(search_automations))
        .route("/automations/{id}/toggle", post(toggle_automation))
        .route("/automations/{id}", delete(delete_automation))
        .route("/automations/new", get(new_automation))
        .route("/automations", post(create_automation))
        .route("/automations/analyze", post(analyze_automation))
        .route("/automations/{id}/edit", get(edit_automation))
        .route("/automations/{id}", put(update_automation))
        .route("/automations/{id}/test", post(test_automation))
}

#[derive(Deserialize)]
pub struct CreateAutomationRequest {
    name: String,
    description: Option<String>,
    workspace: String,
}

#[derive(Deserialize)]
pub struct UpdateAutomationRequest {
    name: String,
    description: Option<String>,
    workspace: String,
}

#[axum::debug_handler]
async fn new_automation(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let blocks = state.block_store.list().await;
    let toolbox = serde_json::json!({
        "kind": "categoryToolbox",
        "contents": [
            {
                "kind": "category",
                "name": "Triggers",
                "categorystyle": "trigger_category",
                "contents": blocks.iter()
                    .filter(|b| b.r#type.starts_with("ha_") && b.r#type.ends_with("_trigger"))
                    .collect::<Vec<_>>()
            },
            {
                "kind": "category",
                "name": "Conditions",
                "categorystyle": "condition_category",
                "contents": blocks.iter()
                    .filter(|b| b.r#type.starts_with("ha_") && b.r#type.ends_with("_condition"))
                    .collect::<Vec<_>>()
            },
            {
                "kind": "category",
                "name": "Actions",
                "categorystyle": "action_category",
                "contents": blocks.iter()
                    .filter(|b| b.r#type.starts_with("ha_") && b.r#type.ends_with("_action"))
                    .collect::<Vec<_>>()
            },
            {
                "kind": "category",
                "name": "Logic",
                "categorystyle": "logic_category",
                "contents": blocks.iter()
                    .filter(|b| b.r#type.starts_with("logic_"))
                    .collect::<Vec<_>>()
            }
        ]
    });
    let template = AutomationCreateTemplate {
        toolbox: Some(toolbox),
    };

    HtmlTemplate(template)
}

async fn create_automation(
    State(state): State<Arc<AppState>>,
    Form(payload): Form<CreateAutomationRequest>,
) -> impl IntoResponse {
    // Parse workspace JSON
    let workspace: serde_json::Value = match serde_json::from_str(&payload.workspace) {
        Ok(ws) => ws,
        Err(_) => {
            return Html("<div class='error'>Invalid workspace data</div>".to_string())
                .into_response()
        }
    };

    // Create automation using the store
    let automation_create = crate::automation::AutomationCreate {
        name: payload.name,
        description: payload.description,
        workspace,
        triggers: Vec::new(),
        conditions: Vec::new(),
    };

    if let Err(_) = state.automation_store.create(automation_create).await {
        return Html("<div class='error'>Failed to create automation</div>".to_string())
            .into_response();
    }

    // Redirect to automations list
    (
        StatusCode::SEE_OTHER,
        [(header::LOCATION, "/automations")],
        "",
    )
        .into_response()
}

async fn list_automations(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let automations = state.automation_store.list().await;
    let view_models: Vec<AutomationViewModel> = automations
        .iter()
        .map(|a| AutomationViewModel::from_automation(a.clone()))
        .collect();

    let template = AutomationsListTemplate {
        automations: view_models,
    };

    HtmlTemplate(template)
}

async fn search_automations(
    State(state): State<Arc<AppState>>,
    Query(query): Query<SearchQuery>,
) -> impl IntoResponse {
    let search_term = query.q.unwrap_or_default().to_lowercase();
    let automations = state.automation_store.list().await;

    let filtered: Vec<AutomationViewModel> = automations
        .iter()
        .filter(|a| {
            a.name.to_lowercase().contains(&search_term)
                || a.description
                    .as_ref()
                    .map(|d| d.to_lowercase().contains(&search_term))
                    .unwrap_or(false)
        })
        .map(|a| AutomationViewModel::from_automation(a.clone()))
        .collect();

    let template = AutomationsListTemplate {
        automations: filtered,
    };

    HtmlTemplate(template)
}

async fn toggle_automation(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    match state.automation_store.get(&id).await {
        Some(automation) => {
            let enabled = !automation.enabled;
            match state.automation_store.toggle(&id, enabled).await {
                Ok(Some(updated)) => {
                    let view_model = AutomationViewModel::from_automation(updated);
                    Html(format!(
                        r##"<div class="card automation-card" id="automation-{}">
                            <div class="card-content">
                                <md-headline4>{}</md-headline4>
                                {}
                                <div style="margin-top: 8px;">
                                    <md-caption>Version: {}</md-caption>
                                    <md-caption>Last updated: {}</md-caption>
                                </div>
                            </div>
                            <div class="card-actions">
                                <md-switch
                                    selected="{}"
                                    hx-post="/automations/{}/toggle"
                                    hx-target="#automation-{}"
                                    hx-swap="outerHTML">
                                </md-switch>
                                <div>
                                    <md-icon-button href="/automations/{}/edit">
                                        <md-icon>edit</md-icon>
                                    </md-icon-button>
                                    <md-icon-button
                                        hx-delete="/automations/{}"
                                        hx-confirm="Are you sure you want to delete this automation?"
                                        hx-target="#automation-{}"
                                        hx-swap="outerHTML">
                                        <md-icon>delete</md-icon>
                                    </md-icon-button>
                                </div>
                            </div>
                        </div>"##,
                        view_model.id,
                        view_model.name,
                        view_model
                            .description
                            .map(|d| format!("<md-body>{}</md-body>", d))
                            .unwrap_or_default(),
                        view_model.version,
                        view_model.updated_at,
                        view_model.enabled,
                        view_model.id,
                        view_model.id,
                        view_model.id,
                        view_model.id,
                        view_model.id
                    ))
                }
                Ok(None) => Html("<div class='error'>Automation not found</div>".to_string()),
                Err(_) => Html("<div class='error'>Failed to toggle automation</div>".to_string()),
            }
        }
        None => Html("<div class='error'>Automation not found</div>".to_string()),
    }
}

async fn analyze_automation(
    State(state): State<Arc<AppState>>,
    Json(workspace): Json<Value>,
) -> impl IntoResponse {
    // Analyze the workspace to find state changes
    let mut state_changes = Vec::new();

    if let Some(blocks) = workspace.get("blocks").and_then(|b| b.as_object()) {
        for (_, block) in blocks {
            if let Some(block_type) = block.get("type").and_then(|t| t.as_str()) {
                // Look for state-changing blocks
                if block_type == "ha_set_state_action" {
                    if let Some(fields) = block.get("fields") {
                        let entity = fields
                            .get("entity")
                            .and_then(|e| e.as_str())
                            .unwrap_or("unknown");
                        let state = fields
                            .get("state")
                            .and_then(|s| s.as_str())
                            .unwrap_or("unknown");
                        state_changes.push((entity.to_string(), state.to_string()));
                    }
                }
            }
        }
    }

    // Generate HTML for state changes
    let html = if state_changes.is_empty() {
        r#"<div class="state-changes-placeholder">No state changes detected</div>"#.to_string()
    } else {
        let changes = state_changes
            .iter()
            .map(|(entity, state)| {
                format!(
                    r#"<div class="state-change">
                        <md-icon>arrow_forward</md-icon>
                        <span>{} → {}</span>
                    </div>"#,
                    entity, state
                )
            })
            .collect::<Vec<_>>()
            .join("\n");

        format!(
            r#"<div class="state-changes-list">
                <style>
                    .state-change {{
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        padding: 8px;
                        border-bottom: 1px solid #eee;
                    }}
                    .state-change:last-child {{
                        border-bottom: none;
                    }}
                </style>
                {changes}
            </div>"#
        )
    };

    Html(html)
}

async fn edit_automation(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    match state.automation_store.get(&id).await {
        Some(automation) => {
            let blocks = state.block_store.list().await;
            let toolbox = serde_json::json!({
                "kind": "categoryToolbox",
                "contents": [
                    {
                        "kind": "category",
                        "name": "Triggers",
                        "categorystyle": "trigger_category",
                        "contents": blocks.iter()
                            .filter(|b| b.r#type.starts_with("ha_") && b.r#type.ends_with("_trigger"))
                            .collect::<Vec<_>>()
                    },
                    {
                        "kind": "category",
                        "name": "Conditions",
                        "categorystyle": "condition_category",
                        "contents": blocks.iter()
                            .filter(|b| b.r#type.starts_with("ha_") && b.r#type.ends_with("_condition"))
                            .collect::<Vec<_>>()
                    },
                    {
                        "kind": "category",
                        "name": "Actions",
                        "categorystyle": "action_category",
                        "contents": blocks.iter()
                            .filter(|b| b.r#type.starts_with("ha_") && b.r#type.ends_with("_action"))
                            .collect::<Vec<_>>()
                    },
                    {
                        "kind": "category",
                        "name": "Logic",
                        "categorystyle": "logic_category",
                        "contents": blocks.iter()
                            .filter(|b| b.r#type.starts_with("logic_"))
                            .collect::<Vec<_>>()
                    }
                ]
            });

            let template = AutomationEditTemplate {
                automation: AutomationViewModel::from_automation(automation),
                toolbox: Some(toolbox),
            };

            HtmlTemplate(template)
        }
        None => HtmlTemplate(AutomationEditTemplate {
            automation: AutomationViewModel {
                id: "".to_string(),
                name: "".to_string(),
                description: None,
                enabled: false,
                version: 0,
                updated_at: Utc::now(),
                workspace: serde_json::json!({}),
            },
            toolbox: None,
        }),
    }
}

async fn update_automation(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Form(payload): Form<UpdateAutomationRequest>,
) -> impl IntoResponse {
    // Parse workspace JSON
    let workspace: Value = match serde_json::from_str(&payload.workspace) {
        Ok(ws) => ws,
        Err(_) => {
            return Html("<div class='error'>Invalid workspace data</div>".to_string())
                .into_response()
        }
    };

    // Get current automation to preserve some fields
    let current = match state.automation_store.get(&id).await {
        Some(automation) => automation,
        None => {
            return Html("<div class='error'>Automation not found</div>".to_string())
                .into_response()
        }
    };

    // Create automation update
    let automation_update = AutomationUpdate {
        name: payload.name,
        description: payload.description,
        workspace,
        enabled: current.enabled,
        version: current.version,
        triggers: current.triggers,
        conditions: current.conditions,
    };

    // Update automation
    match state.automation_store.update(&id, automation_update).await {
        Ok(Some(_)) => (
            StatusCode::SEE_OTHER,
            [(header::LOCATION, "/automations")],
            "",
        )
            .into_response(),
        Ok(None) => {
            Html("<div class='error'>Automation not found</div>".to_string()).into_response()
        }
        Err(_) => {
            Html("<div class='error'>Failed to update automation</div>".to_string()).into_response()
        }
    }
}

async fn test_automation(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    match state.automation_store.get(&id).await {
        Some(automation) => {
            // Generate and run the script
            match state
                .automation_store
                .compile_automation_script(&automation)
                .await
            {
                Ok(_) => Html(format!(
                    r#"<div class="test-result success">
                        <md-icon>check_circle</md-icon>
                        <span>Automation test successful</span>
                    </div>"#
                )),
                Err(e) => Html(format!(
                    r#"<div class="test-result error">
                        <md-icon>error</md-icon>
                        <span>Test failed: {}</span>
                    </div>"#,
                    e
                )),
            }
        }
        None => Html(format!(
            r#"<div class="test-result error">
                <md-icon>error</md-icon>
                <span>Automation not found</span>
            </div>"#
        )),
    }
}

async fn delete_automation(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    match state.automation_store.delete(&id).await {
        Ok(true) => Html("".to_string()), // Return empty string to remove the element from the DOM
        Ok(false) => Html("<div class='error'>Automation not found</div>".to_string()),
        Err(_) => Html("<div class='error'>Failed to delete automation</div>".to_string()),
    }
}

struct HtmlTemplate<T>(T);

impl<T> IntoResponse for HtmlTemplate<T>
where
    T: Template,
{
    fn into_response(self) -> axum::response::Response {
        match self.0.render() {
            Ok(html) => Html(html).into_response(),
            Err(err) => (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to render template: {}", err),
            )
                .into_response(),
        }
    }
}
