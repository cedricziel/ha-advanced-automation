use super::bindings::register_ha_api;
use crate::rhai::{SCRIPT_MEM_LIMIT_BYTES, SCRIPT_TIMEOUT_MS};
use rhai::{Dynamic, Engine, EvalAltResult, Scope, AST};
use std::sync::Arc;

#[derive(Debug, Clone)]
pub struct ScriptEngine {
    engine: Arc<Engine>,
}

impl ScriptEngine {
    pub fn new() -> Self {
        let mut engine = Engine::new();

        // Set sandbox limits
        engine.set_max_operations(100_000); // Limit number of operations
        engine.set_max_call_levels(64); // Limit call stack depth
        engine.set_max_modules(10); // Limit number of modules
        engine.set_max_string_size(10000); // Limit string size
        engine.set_max_array_size(1000); // Limit array size
        engine.set_max_map_size(1000); // Limit map size

        // Disable potentially dangerous operations
        engine.disable_symbol("eval");
        engine.disable_symbol("system");

        // Register Home Assistant API
        register_ha_api(&mut engine);

        Self {
            engine: Arc::new(engine),
        }
    }

    pub fn compile(&self, script: &str) -> Result<AST, Box<EvalAltResult>> {
        self.engine.as_ref().compile(script).map_err(|e| {
            Box::new(EvalAltResult::ErrorSystem(
                format!("Compilation error: {}", e),
                Box::new(e),
            ))
        })
    }

    pub fn run(&self, ast: &AST) -> Result<Dynamic, Box<EvalAltResult>> {
        let mut scope = Scope::new();
        self.engine
            .as_ref()
            .run_ast_with_scope(&mut scope, ast)
            .map(Dynamic::from)
            .map_err(|e| {
                Box::new(EvalAltResult::ErrorSystem(
                    format!("Runtime error: {}", e),
                    Box::new(e),
                ))
            })
    }

    pub fn run_script(&self, script: &str) -> Result<Dynamic, Box<EvalAltResult>> {
        let ast = self.compile(script)?;
        self.run(&ast)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_timeout() {
        let engine = ScriptEngine::new();
        let infinite_loop = "let x = 0; loop { x += 1; }";
        assert!(engine.run_script(infinite_loop).is_err());
    }

    #[test]
    fn test_memory_limit() {
        let engine = ScriptEngine::new();
        let memory_hog = "let x = []; loop { x.push(42); }";
        assert!(engine.run_script(memory_hog).is_err());
    }
}
