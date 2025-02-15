use askama::Result;
use serde::Serialize;

pub fn json_encode<S: Serialize>(s: S) -> Result<String> {
    serde_json::to_string(&s).map_err(|_| askama::Error::Fmt(std::fmt::Error))
}
