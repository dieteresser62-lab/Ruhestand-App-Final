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
const QUOTE_MAX_AGE_SECONDS: u64 = 7 * 24 * 60 * 60;
const QUOTE_FUTURE_TOLERANCE_SECONDS: u64 = 5 * 60;
const UPSTREAM_TIMEOUT_SECONDS: u64 = 4;

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

#[derive(Clone, Debug, PartialEq, Eq)]
struct QuoteFailure {
  code: &'static str,
  message: String,
  status: u16,
}

fn quote_failure(code: &'static str, message: impl Into<String>, status: u16) -> QuoteFailure {
  QuoteFailure { code, message: message.into(), status }
}

fn quote_error_payload(error: &QuoteFailure) -> serde_json::Value {
  json!({
    "status": "error",
    "code": error.code,
    "message": error.message,
  })
}

fn send_quote_error(request: tiny_http::Request, error: &QuoteFailure) {
  send_json(request, error.status, quote_error_payload(error));
}

fn normalize_yahoo_symbol(symbol: &str) -> Result<String, QuoteFailure> {
  let normalized = symbol.trim().to_ascii_uppercase();
  let valid = !normalized.is_empty()
    && normalized.len() <= 32
    && normalized.chars().all(|character| {
      character.is_ascii_uppercase()
        || character.is_ascii_digit()
        || matches!(character, '.' | '^' | '=' | '-')
    });
  if !valid || normalized.contains('@') {
    return Err(quote_failure(
      "INVALID_SYMBOL",
      format!("Ungueltiges Yahoo-Symbol: {}", if normalized.is_empty() { "(leer)" } else { &normalized }),
      400,
    ));
  }
  Ok(normalized)
}

fn fetch_json(url: &str) -> Result<serde_json::Value, QuoteFailure> {
  let client = reqwest::blocking::Client::builder()
    .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
    .timeout(Duration::from_secs(UPSTREAM_TIMEOUT_SECONDS))
    .build()
    .map_err(|e| quote_failure("PROVIDER_UNAVAILABLE", e.to_string(), 502))?;

  let resp = client
    .get(url)
    .header("Accept", "application/json,text/plain,*/*")
    .header("Accept-Language", "en-US,en;q=0.9")
    .send()
    .map_err(|error| {
      if error.is_timeout() {
        quote_failure("PROVIDER_TIMEOUT", "Yahoo-Timeout nach 4000 ms.", 504)
      } else {
        quote_failure("PROVIDER_UNAVAILABLE", error.to_string(), 502)
      }
    })?;

  let status = resp.status().as_u16();
  if !(200..300).contains(&status) {
    return Err(match status {
      404 => quote_failure("SYMBOL_NOT_FOUND", "Yahoo: Symbol nicht gefunden.", 404),
      429 => quote_failure("PROVIDER_RATE_LIMITED", "Yahoo: Abruflimit erreicht.", 429),
      500..=599 => quote_failure("PROVIDER_UNAVAILABLE", format!("Yahoo HTTP {}.", status), 502),
      _ => quote_failure("INVALID_RESPONSE", format!("Yahoo HTTP {}.", status), 502),
    });
  }

  let text = resp.text()
    .map_err(|e| quote_failure("PROVIDER_UNAVAILABLE", e.to_string(), 502))?;
  serde_json::from_str(&text).map_err(|_| quote_failure(
    "INVALID_RESPONSE",
    format!("Ungueltiges JSON von Yahoo: {}", &text[..text.len().min(200)]),
    502,
  ))
}

fn pick_chart_candidate(data: &serde_json::Value) -> serde_json::Value {
  let result = data.pointer("/chart/result/0").unwrap_or(&serde_json::Value::Null);
  let meta = result.get("meta").unwrap_or(&serde_json::Value::Null);
  let mut price = meta.get("regularMarketPrice").and_then(|value| value.as_f64());
  let mut as_of = meta.get("regularMarketTime").and_then(|value| value.as_u64());

  if !price.is_some_and(|value| value.is_finite() && value > 0.0) {
    let closes = result.pointer("/indicators/quote/0/close").and_then(|value| value.as_array());
    let timestamps = result.get("timestamp").and_then(|value| value.as_array());
    if let Some(closes) = closes {
      for index in (0..closes.len()).rev() {
        let candidate = closes[index].as_f64();
        if candidate.is_some_and(|value| value.is_finite() && value > 0.0) {
          price = candidate;
          as_of = timestamps
            .and_then(|values| values.get(index))
            .and_then(|value| value.as_u64());
          break;
        }
      }
    }
  }

  json!({
    "symbol": meta.get("symbol").and_then(|value| value.as_str()),
    "price": price,
    "currency": meta.get("currency").and_then(|value| value.as_str()),
    "asOf": as_of,
    "source": "yahoo-chart",
  })
}

fn pick_quote_candidate(data: &serde_json::Value) -> serde_json::Value {
  let result = data.pointer("/quoteResponse/result/0").unwrap_or(&serde_json::Value::Null);
  json!({
    "symbol": result.get("symbol").and_then(|value| value.as_str()),
    "price": result.get("regularMarketPrice").and_then(|value| value.as_f64()),
    "currency": result.get("currency").and_then(|value| value.as_str()),
    "asOf": result.get("regularMarketTime").and_then(|value| value.as_u64()),
    "source": "yahoo-quote",
  })
}

fn normalize_provider_quote(
  requested_symbol: &str,
  candidate: &serde_json::Value,
  now_seconds: u64,
) -> Result<serde_json::Value, QuoteFailure> {
  let requested = normalize_yahoo_symbol(requested_symbol)?;
  let raw_response_symbol = candidate.get("symbol").and_then(|value| value.as_str()).unwrap_or("");
  let response_symbol = normalize_yahoo_symbol(raw_response_symbol).map_err(|_| quote_failure(
    "INVALID_RESPONSE", "Yahoo-Antwort enthaelt kein gueltiges Symbol.", 422
  ))?;
  if response_symbol != requested {
    return Err(quote_failure(
      "SYMBOL_MISMATCH",
      format!("Antwortsymbol {} entspricht nicht der Anfrage {}.", response_symbol, requested),
      422,
    ));
  }

  let price = candidate.get("price").and_then(|value| value.as_f64())
    .filter(|value| value.is_finite() && *value > 0.0)
    .ok_or_else(|| quote_failure(
      "INVALID_PRICE", "Yahoo-Antwort enthaelt keinen positiven endlichen Kurs.", 422
    ))?;

  let currency = candidate.get("currency")
    .and_then(|value| value.as_str())
    .unwrap_or("")
    .trim()
    .to_ascii_uppercase();
  if currency.is_empty() {
    return Err(quote_failure(
      "CURRENCY_MISSING", "Yahoo-Antwort enthaelt keine eindeutige Waehrung.", 422
    ));
  }
  if currency != "EUR" {
    return Err(quote_failure(
      "UNSUPPORTED_CURRENCY", format!("Waehrung {} wird nicht unterstuetzt.", currency), 422
    ));
  }

  let as_of = candidate.get("asOf").and_then(|value| value.as_u64()).ok_or_else(|| {
    if candidate.get("asOf").map_or(true, |value| value.is_null()) {
      quote_failure("AS_OF_MISSING", "Yahoo-Antwort enthaelt keinen Kursstichtag.", 422)
    } else {
      quote_failure("INVALID_AS_OF", "Kursstichtag muss eine positive UTC-Unixsekunde sein.", 422)
    }
  })?;
  if as_of == 0 {
    return Err(quote_failure(
      "INVALID_AS_OF", "Kursstichtag muss eine positive UTC-Unixsekunde sein.", 422
    ));
  }
  if as_of > now_seconds.saturating_add(QUOTE_FUTURE_TOLERANCE_SECONDS) {
    return Err(quote_failure(
      "QUOTE_FROM_FUTURE", "Kursstichtag liegt unzulaessig weit in der Zukunft.", 422
    ));
  }
  if now_seconds.saturating_sub(as_of) > QUOTE_MAX_AGE_SECONDS {
    return Err(quote_failure(
      "QUOTE_STALE", "Kurs ist aelter als sieben Kalendertage.", 422
    ));
  }

  let source = candidate.get("source").and_then(|value| value.as_str()).unwrap_or("").trim();
  if source.is_empty() {
    return Err(quote_failure(
      "INVALID_RESPONSE", "Yahoo-Antwort enthaelt keine Kursquelle.", 422
    ));
  }
  Ok(json!({
    "symbol": response_symbol,
    "price": price,
    "currency": currency,
    "asOf": as_of,
    "source": source,
  }))
}

fn should_stop_quote_fallback(error: &QuoteFailure) -> bool {
  matches!(error.code, "UNSUPPORTED_CURRENCY" | "SYMBOL_MISMATCH" | "QUOTE_STALE" | "QUOTE_FROM_FUTURE")
}

fn handle_quote(request: tiny_http::Request, raw_symbol: &str) {
  let symbol = match normalize_yahoo_symbol(raw_symbol) {
    Ok(symbol) => symbol,
    Err(error) => {
      send_quote_error(request, &error);
      return;
    }
  };
  let encoded_symbol = urlencoding::encode(&symbol);
  let attempts: Vec<(String, fn(&serde_json::Value) -> serde_json::Value)> = vec![
    (
      format!("https://query1.finance.yahoo.com/v8/finance/chart/{}?interval=1d&range=1d&lang=en-US&region=US&corsDomain=finance.yahoo.com", encoded_symbol),
      pick_chart_candidate,
    ),
    (
      format!("https://query2.finance.yahoo.com/v8/finance/chart/{}?interval=1d&range=1d&lang=en-US&region=US&corsDomain=finance.yahoo.com", encoded_symbol),
      pick_chart_candidate,
    ),
    (
      format!("https://query1.finance.yahoo.com/v7/finance/quote?symbols={}", encoded_symbol),
      pick_quote_candidate,
    ),
    (
      format!("https://query2.finance.yahoo.com/v7/finance/quote?symbols={}", encoded_symbol),
      pick_quote_candidate,
    ),
  ];
  let now_seconds = SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .map(|duration| duration.as_secs())
    .unwrap_or(0);
  let mut last_error = quote_failure("SYMBOL_NOT_FOUND", "Yahoo: Symbol nicht gefunden.", 404);

  for (url, pick_candidate) in attempts {
    match fetch_json(&url).and_then(|data| normalize_provider_quote(&symbol, &pick_candidate(&data), now_seconds)) {
      Ok(quote) => {
        send_json(request, 200, quote);
        return;
      }
      Err(error) => {
        let stop = should_stop_quote_fallback(&error);
        last_error = error;
        if stop { break; }
      }
    }
  }
  send_quote_error(request, &last_error);
}

fn handle_search(request: tiny_http::Request, query: &str) {
  let url = format!("https://query1.finance.yahoo.com/v1/finance/search?q={}", urlencoding::encode(query));
  match fetch_json(&url) {
    Ok(data) => send_json(request, 200, data),
    Err(error) => send_quote_error(request, &error),
  }
}

fn handle_chart(request: tiny_http::Request, symbol: &str, period1: &str, period2: &str, interval: &str) {
  let url = format!(
    "https://query1.finance.yahoo.com/v8/finance/chart/{}?period1={}&period2={}&interval={}&lang=en-US&region=US&corsDomain=finance.yahoo.com",
    urlencoding::encode(symbol), urlencoding::encode(period1), urlencoding::encode(period2), urlencoding::encode(interval)
  );
  match fetch_json(&url) {
    Ok(data) => send_json(request, 200, data),
    Err(error) => send_quote_error(request, &error),
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
          send_quote_error(request, &quote_failure("INVALID_SYMBOL", "Yahoo-Symbol fehlt.", 400));
        }
      }
      "/search" => {
        if let Some(q) = params.get("q") {
          handle_search(request, q);
        } else {
          send_quote_error(request, &quote_failure("INVALID_SEARCH_QUERY", "Suchbegriff fehlt.", 400));
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
          send_quote_error(request, &quote_failure("INVALID_CHART_QUERY", "Chart-Parameter fehlen.", 400));
        }
      }
      _ => send_quote_error(request, &quote_failure("NOT_FOUND", "Route nicht gefunden.", 404)),
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
  fn quote_extractors_build_complete_candidates_and_normalize_eur() {
    let now = 1_800_000_000;
    let quote = json!({
      "quoteResponse": {
        "result": [
          {
            "symbol": "VWCE.DE",
            "regularMarketPrice": 123.45,
            "currency": "EUR",
            "regularMarketTime": now - 60
          }
        ]
      }
    });
    let normalized_quote = normalize_provider_quote("vwce.de", &pick_quote_candidate(&quote), now).unwrap();
    assert_eq!(normalized_quote.get("symbol").and_then(|value| value.as_str()), Some("VWCE.DE"));
    assert_eq!(normalized_quote.get("price").and_then(|value| value.as_f64()), Some(123.45));
    assert_eq!(normalized_quote.get("currency").and_then(|value| value.as_str()), Some("EUR"));
    assert_eq!(normalized_quote.get("asOf").and_then(|value| value.as_u64()), Some(now - 60));
    assert_eq!(normalized_quote.get("source").and_then(|value| value.as_str()), Some("yahoo-quote"));

    let chart = json!({
      "chart": {
        "result": [
          {
            "meta": {
              "symbol": "VWCE.DE",
              "regularMarketPrice": 0.0,
              "currency": "EUR"
            },
            "timestamp": [now - 180, now - 120, now - 60],
            "indicators": {
              "quote": [
                { "close": [null, 98.7, 101.2] }
              ]
            }
          }
        ]
      }
    });
    let chart_candidate = pick_chart_candidate(&chart);
    assert_eq!(chart_candidate.get("price").and_then(|value| value.as_f64()), Some(101.2));
    assert_eq!(chart_candidate.get("asOf").and_then(|value| value.as_u64()), Some(now - 60));
  }

  #[test]
  fn quote_contract_rejects_foreign_currency_missing_time_and_stale_values() {
    let now = 1_800_000_000;
    for currency in ["USD", "GBP", "GBX"] {
      let candidate = json!({
        "symbol": "VWRL.L",
        "price": 100.0,
        "currency": currency,
        "asOf": now - 60,
        "source": "yahoo-chart"
      });
      let error = normalize_provider_quote("VWRL.L", &candidate, now).unwrap_err();
      assert_eq!(error.code, "UNSUPPORTED_CURRENCY");
      assert!(error.message.contains(currency));
    }

    let missing_time = json!({
      "symbol": "VWCE.DE", "price": 100.0, "currency": "EUR", "source": "yahoo-chart"
    });
    assert_eq!(
      normalize_provider_quote("VWCE.DE", &missing_time, now).unwrap_err().code,
      "AS_OF_MISSING"
    );

    let stale = json!({
      "symbol": "VWCE.DE",
      "price": 100.0,
      "currency": "EUR",
      "asOf": now - QUOTE_MAX_AGE_SECONDS - 1,
      "source": "yahoo-chart"
    });
    assert_eq!(
      normalize_provider_quote("VWCE.DE", &stale, now).unwrap_err().code,
      "QUOTE_STALE"
    );
  }

  #[test]
  fn yahoo_symbol_contract_rejects_exchange_suffixes() {
    assert_eq!(normalize_yahoo_symbol(" vwce.de ").unwrap(), "VWCE.DE");
    assert_eq!(normalize_yahoo_symbol("VWCE@GER").unwrap_err().code, "INVALID_SYMBOL");
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
