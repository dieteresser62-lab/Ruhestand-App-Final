#![cfg_attr(mobile, tauri::mobile_entry_point)]

use log::LevelFilter;
use serde_json::json;
use std::collections::HashMap;
use std::thread;
use tiny_http::{Header, Method, Response, Server, StatusCode};

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
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
