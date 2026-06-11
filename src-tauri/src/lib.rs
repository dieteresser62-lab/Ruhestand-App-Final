#![cfg_attr(mobile, tauri::mobile_entry_point)]

use log::LevelFilter;
use serde::Deserialize;
use serde_json::json;
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{Emitter, Manager};
use tiny_http::{Header, Method, Response, Server, StatusCode};

const APP_STATE_FILENAME: &str = "ruhestand_suite_data.json";
const SNAPSHOT_STATE_FILENAME: &str = "ruhestand_suite_snapshots.json";

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
enum StateTarget {
  Live,
  Snapshots,
}

struct CloseState {
  allow_close: Mutex<bool>,
  close_pending: Mutex<bool>,
}

fn state_filename(target: Option<StateTarget>) -> &'static str {
  match target.unwrap_or(StateTarget::Live) {
    StateTarget::Live => APP_STATE_FILENAME,
    StateTarget::Snapshots => SNAPSHOT_STATE_FILENAME,
  }
}

fn corrupt_state_filename(target: Option<StateTarget>, timestamp: u64) -> String {
  let stem = match target.unwrap_or(StateTarget::Live) {
    StateTarget::Live => "ruhestand_suite_data",
    StateTarget::Snapshots => "ruhestand_suite_snapshots",
  };
  format!("{}.corrupt.{}.json", stem, timestamp)
}

fn app_state_path(app: &tauri::AppHandle, target: Option<StateTarget>) -> Result<PathBuf, String> {
  let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
  fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
  Ok(app_dir.join(state_filename(target)))
}

#[tauri::command]
fn load_app_state(app: tauri::AppHandle, target: Option<StateTarget>) -> Result<String, String> {
  let file_path = app_state_path(&app, target)?;
  if !file_path.exists() {
    return Ok(String::new());
  }
  fs::read_to_string(&file_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_app_state(app: tauri::AppHandle, content: String, target: Option<StateTarget>) -> Result<(), String> {
  let file_path = app_state_path(&app, target)?;
  let tmp_path = file_path.with_extension("json.tmp");
  let bak_path = file_path.with_extension("json.bak");

  fs::write(&tmp_path, content).map_err(|e| e.to_string())?;
  if file_path.exists() {
    let _ = fs::copy(&file_path, &bak_path);
    fs::remove_file(&file_path).map_err(|e| e.to_string())?;
  }
  if let Err(err) = fs::rename(&tmp_path, &file_path) {
    if bak_path.exists() && !file_path.exists() {
      let _ = fs::rename(&bak_path, &file_path);
    }
    return Err(err.to_string());
  }
  let _ = fs::remove_file(&bak_path);
  Ok(())
}

#[tauri::command]
fn quarantine_app_state(app: tauri::AppHandle, target: Option<StateTarget>) -> Result<String, String> {
  let file_path = app_state_path(&app, target)?;
  if !file_path.exists() {
    return Ok(String::new());
  }
  let timestamp = SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .map_err(|e| e.to_string())?
    .as_secs();
  let quarantine_path = file_path.with_file_name(corrupt_state_filename(target, timestamp));
  fs::rename(&file_path, &quarantine_path).map_err(|e| e.to_string())?;
  Ok(quarantine_path.to_string_lossy().to_string())
}

#[tauri::command]
fn confirm_app_close(window: tauri::Window, state: tauri::State<'_, CloseState>) -> Result<(), String> {
  let mut allow_close = state.allow_close.lock().map_err(|e| e.to_string())?;
  *allow_close = true;
  drop(allow_close);
  if let Ok(mut close_pending) = state.close_pending.lock() {
    *close_pending = false;
  }
  window.close().map_err(|e| e.to_string())
}

fn allow_window_close(window: &tauri::Window, state: &CloseState) {
  if let Ok(mut allow_close) = state.allow_close.lock() {
    *allow_close = true;
  }
  if let Ok(mut close_pending) = state.close_pending.lock() {
    *close_pending = false;
  }
  let _ = window.close();
}

fn allowed_cors_origin(origin: &str) -> &str {
  match origin {
    "null" | "tauri://localhost" | "https://tauri.localhost" | "http://tauri.localhost" => origin,
    o if o.starts_with("http://localhost:") || o.starts_with("http://127.0.0.1:") => o,
    o if o == "http://localhost" || o == "http://127.0.0.1" => o,
    _ => "null",
  }
}

fn build_headers_for_origin(origin: &str) -> Vec<Header> {
  vec![
    Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap(),
    Header::from_bytes(&b"Access-Control-Allow-Origin"[..], origin.as_bytes()).unwrap(),
    Header::from_bytes(&b"Access-Control-Allow-Methods"[..], &b"GET,OPTIONS"[..]).unwrap(),
    Header::from_bytes(&b"Access-Control-Allow-Headers"[..], &b"Content-Type"[..]).unwrap(),
  ]
}

fn get_request_origin(request: &tiny_http::Request) -> String {
  for header in request.headers() {
    if header.field.to_string().eq_ignore_ascii_case("origin") {
      return header.value.as_str().to_string();
    }
  }
  "null".to_string()
}

fn send_json(request: tiny_http::Request, status: u16, payload: serde_json::Value) {
  let origin = get_request_origin(&request);
  let cors = allowed_cors_origin(&origin);
  let body = payload.to_string();
  let mut response = Response::from_string(body)
    .with_status_code(StatusCode(status));
  for header in build_headers_for_origin(cors) {
    response = response.with_header(header);
  }
  let _ = request.respond(response);
}

fn parse_query(query: &str) -> HashMap<String, String> {
  let mut out = HashMap::new();
  for pair in query.split('&') {
    let mut parts = pair.splitn(2, '=');
    if let Some(key) = parts.next() {
      let val = parts.next().unwrap_or("");
      out.insert(urlencoding::decode(key).unwrap_or_else(|_| key.into()).into_owned(),
                 urlencoding::decode(val).unwrap_or_else(|_| val.into()).into_owned());
    }
  }
  out
}

fn fetch_json(url: &str) -> Result<serde_json::Value, String> {
  let client = reqwest::blocking::Client::builder()
    .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
    .build()
    .map_err(|e| e.to_string())?;

  let resp = client
    .get(url)
    .header("Accept", "application/json,text/plain,*/*")
    .header("Accept-Language", "en-US,en;q=0.9")
    .send()
    .map_err(|e| e.to_string())?;

  let text = resp.text().map_err(|e| e.to_string())?;
  serde_json::from_str(&text).map_err(|_| format!("Invalid JSON from Yahoo: {}", &text[..text.len().min(200)]))
}

fn normalize_gbp_price(symbol: &str, data: &serde_json::Value, price: f64) -> f64 {
  if !symbol.ends_with(".L") {
    return price;
  }
  let currency = data
    .pointer("/chart/result/0/meta/currency")
    .and_then(|v| v.as_str())
    .unwrap_or("");
  if currency == "GBp" || currency == "GBX" {
    return price / 100.0;
  }
  price
}

fn pick_quote_price(data: &serde_json::Value) -> Option<f64> {
  data.get("quoteResponse")
    .and_then(|v| v.get("result"))
    .and_then(|v| v.as_array())
    .and_then(|arr| arr.first())
    .and_then(|item| item.get("regularMarketPrice"))
    .and_then(|v| v.as_f64())
}

fn pick_chart_price(data: &serde_json::Value) -> Option<f64> {
  let result = data.get("chart")?.get("result")?.as_array()?.first()?;
  if let Some(meta) = result.get("meta") {
    if let Some(price) = meta.get("regularMarketPrice").and_then(|v| v.as_f64()) {
      if price > 0.0 {
        return Some(price);
      }
    }
  }
  let close = result.get("indicators")?
    .get("quote")?
    .as_array()?
    .first()?
    .get("close")?
    .as_array()?;
  for value in close.iter().rev() {
    if let Some(price) = value.as_f64() {
      if price > 0.0 {
        return Some(price);
      }
    }
  }
  None
}

fn handle_quote(request: tiny_http::Request, symbol: &str) {
  let encoded_symbol = urlencoding::encode(symbol);
  let chart_urls = [
    format!("https://query1.finance.yahoo.com/v8/finance/chart/{}?interval=1d&range=1d&lang=en-US&region=US&corsDomain=finance.yahoo.com", encoded_symbol),
    format!("https://query2.finance.yahoo.com/v8/finance/chart/{}?interval=1d&range=1d&lang=en-US&region=US&corsDomain=finance.yahoo.com", encoded_symbol),
  ];

  for url in chart_urls.iter() {
    if let Ok(data) = fetch_json(url) {
      if let Some(price) = pick_chart_price(&data) {
        let normalized = normalize_gbp_price(symbol, &data, price);
        let tz = data.pointer("/chart/result/0/meta/exchangeTimezoneName")
          .and_then(|v| v.as_str())
          .unwrap_or("");
        send_json(request, 200, json!({"price": normalized.to_string(), "source": "chart", "timezone": tz, "data": data}));
        return;
      }
    }
  }

  let quote_urls = [
    format!("https://query1.finance.yahoo.com/v7/finance/quote?symbols={}", encoded_symbol),
    format!("https://query2.finance.yahoo.com/v7/finance/quote?symbols={}", encoded_symbol),
  ];

  for url in quote_urls.iter() {
    if let Ok(data) = fetch_json(url) {
      if let Some(price) = pick_quote_price(&data) {
        send_json(request, 200, json!({"price": price.to_string(), "source": "quote", "data": data}));
        return;
      }
    }
  }

  send_json(request, 404, json!({"error": "Yahoo: no price"}));
}

fn handle_search(request: tiny_http::Request, query: &str) {
  let url = format!("https://query1.finance.yahoo.com/v1/finance/search?q={}", urlencoding::encode(query));
  match fetch_json(&url) {
    Ok(data) => send_json(request, 200, data),
    Err(err) => send_json(request, 502, json!({"error": err})),
  }
}

fn handle_chart(request: tiny_http::Request, symbol: &str, period1: &str, period2: &str, interval: &str) {
  let url = format!(
    "https://query1.finance.yahoo.com/v8/finance/chart/{}?period1={}&period2={}&interval={}&lang=en-US&region=US&corsDomain=finance.yahoo.com",
    urlencoding::encode(symbol), urlencoding::encode(period1), urlencoding::encode(period2), urlencoding::encode(interval)
  );
  match fetch_json(&url) {
    Ok(data) => send_json(request, 200, data),
    Err(err) => send_json(request, 502, json!({"error": err})),
  }
}

fn start_yahoo_proxy() {
  let server = match Server::http("127.0.0.1:8787") {
    Ok(server) => server,
    Err(err) => {
      eprintln!("Yahoo proxy failed to start: {}", err);
      return;
    }
  };

  for request in server.incoming_requests() {
    if request.method() == &Method::Options {
      let origin = get_request_origin(&request);
      let cors = allowed_cors_origin(&origin);
      let mut response = Response::from_string("")
        .with_status_code(StatusCode(204));
      for header in build_headers_for_origin(cors) {
        response = response.with_header(header);
      }
      let _ = request.respond(response);
      continue;
    }

    let url = request.url().to_string();
    let mut parts = url.splitn(2, '?');
    let path = parts.next().unwrap_or("");
    let query = parts.next().unwrap_or("");
    let params = parse_query(query);

    match path {
      "/quote" => {
        if let Some(symbol) = params.get("symbol") {
          handle_quote(request, symbol);
        } else {
          send_json(request, 400, json!({"error": "Missing symbol"}));
        }
      }
      "/search" => {
        if let Some(q) = params.get("q") {
          handle_search(request, q);
        } else {
          send_json(request, 400, json!({"error": "Missing query"}));
        }
      }
      "/chart" => {
        let symbol = params.get("symbol");
        let period1 = params.get("period1");
        let period2 = params.get("period2");
        let interval = params.get("interval").map(String::as_str).unwrap_or("1d");
        if let (Some(symbol), Some(period1), Some(period2)) = (symbol, period1, period2) {
          handle_chart(request, symbol, period1, period2, interval);
        } else {
          send_json(request, 400, json!({"error": "Missing chart params"}));
        }
      }
      _ => send_json(request, 404, json!({"error": "Not found"})),
    }
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .manage(CloseState {
      allow_close: Mutex::new(false),
      close_pending: Mutex::new(false),
    })
    .invoke_handler(tauri::generate_handler![
      load_app_state,
      save_app_state,
      quarantine_app_state,
      confirm_app_close
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(LevelFilter::Info)
            .build(),
        )?;
      }

      thread::spawn(start_yahoo_proxy);
      Ok(())
    })
    .on_window_event(|window, event| {
      if let tauri::WindowEvent::CloseRequested { api, .. } = event {
        if let Some(state) = window.try_state::<CloseState>() {
          let mut allow_close = state.allow_close.lock().unwrap_or_else(|e| e.into_inner());
          if *allow_close {
            *allow_close = false;
            if let Ok(mut close_pending) = state.close_pending.lock() {
              *close_pending = false;
            }
            return;
          }
          drop(allow_close);

          let mut close_pending = state.close_pending.lock().unwrap_or_else(|e| e.into_inner());
          if *close_pending {
            api.prevent_close();
            return;
          }
          *close_pending = true;
        }
        api.prevent_close();
        let _ = window.emit("ruhestand://close-requested", json!({}));
        let fallback_window = window.clone();
        thread::spawn(move || {
          thread::sleep(Duration::from_secs(3));
          if let Some(state) = fallback_window.try_state::<CloseState>() {
            let close_pending = state.close_pending.lock().map(|pending| *pending).unwrap_or(false);
            if close_pending {
              allow_window_close(&fallback_window, &state);
            }
          }
        });
      }
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn cors_origin_allows_tauri_and_local_origins() {
    assert_eq!(allowed_cors_origin("null"), "null");
    assert_eq!(allowed_cors_origin("tauri://localhost"), "tauri://localhost");
    assert_eq!(allowed_cors_origin("https://tauri.localhost"), "https://tauri.localhost");
    assert_eq!(allowed_cors_origin("http://localhost:8000"), "http://localhost:8000");
    assert_eq!(allowed_cors_origin("http://127.0.0.1:8000"), "http://127.0.0.1:8000");
    assert_eq!(allowed_cors_origin("http://localhost"), "http://localhost");
    assert_eq!(allowed_cors_origin("http://127.0.0.1"), "http://127.0.0.1");
  }

  #[test]
  fn cors_origin_rejects_external_origins() {
    assert_eq!(allowed_cors_origin("https://example.com"), "null");
    assert_eq!(allowed_cors_origin("http://192.168.1.10:8000"), "null");
    assert_eq!(allowed_cors_origin("https://localhost.evil.example"), "null");
  }

  #[test]
  fn parse_query_decodes_values_and_empty_params() {
    let params = parse_query("symbol=VWCE.DE&q=hello%20world&empty=");

    assert_eq!(params.get("symbol").map(String::as_str), Some("VWCE.DE"));
    assert_eq!(params.get("q").map(String::as_str), Some("hello world"));
    assert_eq!(params.get("empty").map(String::as_str), Some(""));
  }

  #[test]
  fn quote_and_chart_price_extractors_pick_positive_prices() {
    let quote = json!({
      "quoteResponse": {
        "result": [
          { "regularMarketPrice": 123.45 }
        ]
      }
    });
    assert_eq!(pick_quote_price(&quote), Some(123.45));

    let chart = json!({
      "chart": {
        "result": [
          {
            "meta": { "regularMarketPrice": 0.0 },
            "indicators": {
              "quote": [
                { "close": [null, 98.7, 101.2] }
              ]
            }
          }
        ]
      }
    });
    assert_eq!(pick_chart_price(&chart), Some(101.2));
  }

  #[test]
  fn gbp_quote_normalization_only_applies_to_london_pence_prices() {
    let gbp_data = json!({
      "chart": {
        "result": [
          { "meta": { "currency": "GBp" } }
        ]
      }
    });
    let eur_data = json!({
      "chart": {
        "result": [
          { "meta": { "currency": "EUR" } }
        ]
      }
    });

    assert_eq!(normalize_gbp_price("VWRL.L", &gbp_data, 1000.0), 10.0);
    assert_eq!(normalize_gbp_price("VWRL.L", &eur_data, 1000.0), 1000.0);
    assert_eq!(normalize_gbp_price("VWCE.DE", &gbp_data, 1000.0), 1000.0);
  }

  #[test]
  fn state_target_defaults_to_live_file_and_supports_snapshot_file() {
    assert_eq!(state_filename(None), "ruhestand_suite_data.json");
    assert_eq!(state_filename(Some(StateTarget::Live)), "ruhestand_suite_data.json");
    assert_eq!(state_filename(Some(StateTarget::Snapshots)), "ruhestand_suite_snapshots.json");
  }

  #[test]
  fn corrupt_state_filename_uses_target_specific_stem() {
    assert_eq!(
      corrupt_state_filename(None, 123),
      "ruhestand_suite_data.corrupt.123.json"
    );
    assert_eq!(
      corrupt_state_filename(Some(StateTarget::Snapshots), 123),
      "ruhestand_suite_snapshots.corrupt.123.json"
    );
  }
}
