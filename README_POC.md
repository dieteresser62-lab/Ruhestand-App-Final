# Rust Migration PoC - Manual Build Instructions

The agent successfully created the Rust project and valid source code (verified via native compilation), but could not complete the WASM build due to environment restrictions (likely path length or toolchain conflicts).

Please run the following commands in your terminal to complete the PoC:

1.  **Navigate to the Rust Engine directory:**
    ```powershell
    cd rust_engine
    ```

2.  **Build the WASM Module:**
    ```powershell
    wasm-pack build --target web --out-dir ../pkg
    ```
    *(If this fails, ensure `wasm-pack` is in your PATH. You may need to restart your terminal if you just installed it).*

3.  **Run the Verification:**
    Go back to the root directory and run the test script:
    ```powershell
    cd ..
    node poc-runner.js --experimental-wasm-modules
    ``` 
    *(Note: Node v22+ supports WASM modules by default, older versions might need flags or just use `node poc-runner.js` if it works).*

**Expected Output:**
You should see:
```text
[WASM] Module loaded successfully.
JS Input: { value: 42.5, iterations: 1000 }
Rust Output: { result: 85, message: 'Processed 1000 iterations (Rust)' }
✅ SUCCESS: Calculation correct (42.5 * 2 = 85.0)
```
