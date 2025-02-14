use askama::Template;
use axum::{
    extract::{Path, Query, State},
    response::{Html, IntoResponse},
    routing::{delete, get, post},
    Router,
};
use serde::Deserialize;
use std::sync::Arc;

use super::{AutomationViewModel, AutomationsListTemplate};
use crate::AppState;

#[derive(Deserialize)]
pub struct SearchQuery {
    q: Option<String>,
}

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(list_automations))
        .route("/automations/search", get(search_automations))
        .route("/automations/{id}/toggle", post(toggle_automation))
        .route("/automations/{id}", delete(delete_automation))
}

async fn list_automations(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let view_models: Vec<AutomationViewModel> = state
        .automations
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

    let filtered: Vec<AutomationViewModel> = state
        .automations
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
    if let Some(automation) = state.automations.iter().find(|a| a.id.to_string() == id) {
        let mut updated = automation.clone();
        updated.enabled = !updated.enabled;

        // In a real implementation, we would save this change to storage

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
                        selected="{}".to_string()
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
    } else {
        Html(String::from(
            "<div class='error'>Automation not found</div>",
        ))
    }
}

async fn delete_automation(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    if state.automations.iter().any(|a| a.id.to_string() == id) {
        // In a real implementation, we would delete from storage
        Html("") // Return empty string to remove the element from the DOM
    } else {
        Html("<div class='error'>Automation not found</div>")
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
