use std::{option::Option, string::String};

use askama::Result;
use serde::Serialize;

pub fn json_encode<S: Serialize>(s: S) -> Result<String> {
    serde_json::to_string(&s).map_err(|_| askama::Error::Fmt(std::fmt::Error))
}

pub fn default(s: Option<String>) -> Result<String> {
    Ok(s.unwrap_or("".to_string()))
}

pub fn default_ref(s: &Option<String>) -> Result<String> {
    Ok(s.as_ref().unwrap_or(&"".to_string()).to_string())
}
