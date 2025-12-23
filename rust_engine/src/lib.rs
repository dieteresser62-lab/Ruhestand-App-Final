use serde::{Deserialize, Serialize};

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

// Shared logic modules (placeholder for now)
pub mod monte_carlo;
pub mod core;

#[derive(Serialize, Deserialize, Debug)]
pub struct SimulationInput {
    pub value: f64,
    pub iterations: u32,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SimulationOutput {
    pub result: f64,
    pub message: String,
}

// --- WASM INTERFACE ---
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn run_simulation_poc(val: JsValue) -> Result<JsValue, JsValue> {
    // Enable better error messages in browser console
    console_error_panic_hook::set_once();

    let input: SimulationInput = serde_wasm_bindgen::from_value(val)?;
    
    // Core logic simulation (dummy for PoC)
    let result = perform_calculation(input);

    Ok(serde_wasm_bindgen::to_value(&result)?)
}

// --- NATIVE INTERFACE ---
#[cfg(not(target_arch = "wasm32"))]
pub fn run_simulation_native(input: SimulationInput) -> SimulationOutput {
    perform_calculation(input)
}

// --- SHARED LOGIC ---
fn perform_calculation(input: SimulationInput) -> SimulationOutput {
    // Dummy calculation (Deterministic)
    let computed = input.value * 2.0;

    SimulationOutput {
        result: computed,
        message: format!("Processed {} iterations (Rust)", input.iterations),
    }
}
