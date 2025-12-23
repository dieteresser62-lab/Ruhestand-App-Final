// use serde::{Deserialize, Serialize};

pub mod types;
pub mod core;
pub mod simulation;
pub mod validation;
pub mod config;
pub mod market;
pub mod spending;
pub mod tax;
pub mod transactions;

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;
use crate::types::SimulationInput;

// --- WASM INTERFACE ---
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn run_simulation_poc(val: JsValue) -> Result<JsValue, JsValue> {
    console_error_panic_hook::set_once();
    
    // Parse Input
    let input: SimulationInput = serde_wasm_bindgen::from_value(val)
        .map_err(|e| JsValue::from_str(&format!("Invalid Input Structure: {}", e)))?;

    // Execute logic
    match core::calculate_model(&input, None) {
        Ok(result) => Ok(serde_wasm_bindgen::to_value(&result)?),
        Err(e) => Err(JsValue::from_str(&e))
    }
}

// --- NATIVE INTERFACE (for testing) ---
#[cfg(not(target_arch = "wasm32"))]
pub fn run_simulation_native(input: SimulationInput) -> Result<crate::types::SimulationResult, String> {
    core::calculate_model(&input, None)
}
