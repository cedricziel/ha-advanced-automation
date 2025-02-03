use rhai::{Dynamic, Engine, EvalAltResult, FnPtr, Map, Module, NativeCallContext};

pub struct HaApi;

impl HaApi {
    pub fn get_state(entity_id: &str) -> Result<Dynamic, Box<EvalAltResult>> {
        // TODO: Implement actual HA API call
        // For now, return a mock state
        Ok(Dynamic::from("mock_state"))
    }

    pub fn set_state(entity_id: &str, state: &str) -> Result<Dynamic, Box<EvalAltResult>> {
        // TODO: Implement actual HA API call
        Ok(Dynamic::UNIT)
    }

    pub fn call_service(
        domain: &str,
        service: &str,
        entity_id: &str,
    ) -> Result<Dynamic, Box<EvalAltResult>> {
        // TODO: Implement actual HA API call
        Ok(Dynamic::UNIT)
    }

    pub fn get_attributes(entity_id: &str) -> Result<Dynamic, Box<EvalAltResult>> {
        // TODO: Implement actual HA API call
        // For now, return a mock attributes map
        let mut map = Map::new();
        map.insert("mock_attr".into(), Dynamic::from("mock_value"));
        Ok(Dynamic::from(map))
    }

    fn on_state_change(
        ctx: &mut NativeCallContext<'_>,
        callback: FnPtr,
    ) -> Result<Dynamic, Box<EvalAltResult>> {
        let state = Dynamic::from("new_state");
        let entity_id = Dynamic::from("test_entity");

        callback.call_within_context(ctx, (entity_id, state))?;
        Ok(Dynamic::UNIT)
    }
}

pub fn register_ha_api(engine: &mut Engine) {
    let mut module = Module::new();

    module.set_native_fn("get_state", |entity_id: &str| HaApi::get_state(entity_id));
    module.set_native_fn("set_state", |entity_id: &str, state: &str| {
        HaApi::set_state(entity_id, state)
    });
    module.set_native_fn(
        "call_service",
        |domain: &str, service: &str, entity_id: &str| {
            HaApi::call_service(domain, service, entity_id)
        },
    );
    module.set_native_fn("get_attributes", |entity_id: &str| {
        HaApi::get_attributes(entity_id)
    });

    module.set_native_fn(
        "on_state_change",
        |mut ctx: NativeCallContext, entity_id: &str, callback: FnPtr| {
            HaApi::on_state_change(&mut ctx, callback)
        },
    );

    engine.register_global_module(module.into());
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ha_api_registration() {
        let mut engine = Engine::new();
        register_ha_api(&mut engine);

        // Test get_state
        let result = engine
            .eval::<String>(r#"get_state("light.living_room")"#)
            .unwrap();
        assert_eq!(result, "mock_state");

        // Test set_state
        let result = engine.eval::<()>(r#"set_state("light.living_room", "on")"#);
        assert!(result.is_ok());

        // Test call_service
        let result = engine.eval::<()>(r#"call_service("light", "turn_on", "light.living_room")"#);
        assert!(result.is_ok());

        // Test get_attributes
        let result = engine
            .eval::<Map>(r#"get_attributes("light.living_room")"#)
            .unwrap();
        assert_eq!(result.get("mock_attr").unwrap().to_string(), "mock_value");
    }
}
