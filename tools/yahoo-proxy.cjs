const http = require('http');
const https = require('https');
const { URL } = require('url');

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const idx = args.indexOf(name);
  if (idx >= 0 && args[idx + 1]) return args[idx + 1];
  return fallback;
};

const port = Number(getArg('--port', process.env.PORT || 8787));
const QUOTE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const QUOTE_FUTURE_TOLERANCE_SECONDS = 5 * 60;
const UPSTREAM_TIMEOUT_MS = 4000;
const YAHOO_SYMBOL_PATTERN = /^[A-Z0-9.^=-]{1,32}$/;

class ProxyQuoteError extends Error {
  constructor(code, message, status = 422) {
    super(message);
    this.name = 'ProxyQuoteError';
    this.code = code;
    this.status = status;
  }
}

const quoteError = (code, message, status = 422) => new ProxyQuoteError(code, message, status);

const normalizeYahooSymbol = (symbol) => {
  const normalized = String(symbol || '').trim().toUpperCase();
  if (!YAHOO_SYMBOL_PATTERN.test(normalized) || normalized.includes('@')) {
    throw quoteError('INVALID_SYMBOL', `Ungueltiges Yahoo-Symbol: ${normalized || '(leer)'}`, 400);
  }
  return normalized;
};

const ALLOWED_ORIGINS = ['null', 'tauri://localhost', 'https://tauri.localhost', 'http://tauri.localhost'];
const isAllowedOrigin = (origin) =>
  ALLOWED_ORIGINS.includes(origin) || (origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));

const corsOrigin = (req) => {
  const origin = req.headers.origin || 'null';
  return isAllowedOrigin(origin) ? origin : 'null';
};

const sendJson = (res, status, payload) => {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': res._corsOrigin || 'null',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(payload));
};

const sendError = (res, error, fallbackStatus = 502) => {
  const normalized = error instanceof ProxyQuoteError
    ? error
    : quoteError('PROVIDER_UNAVAILABLE', error?.message || String(error), fallbackStatus);
  sendJson(res, normalized.status, {
    status: 'error',
    code: normalized.code,
    message: normalized.message
  });
};

const upstreamStatusError = (status) => {
  if (status === 404) return quoteError('SYMBOL_NOT_FOUND', 'Yahoo: Symbol nicht gefunden.', 404);
  if (status === 429) return quoteError('PROVIDER_RATE_LIMITED', 'Yahoo: Abruflimit erreicht.', 429);
  if (status >= 500) return quoteError('PROVIDER_UNAVAILABLE', `Yahoo HTTP ${status}.`, 502);
  return quoteError('INVALID_RESPONSE', `Yahoo HTTP ${status}.`, 502);
};

const fetchJson = (url) =>
  new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          Accept: 'application/json,text/plain,*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          Connection: 'close'
        }
      },
      (resp) => {
        let data = '';
        resp.on('data', (chunk) => (data += chunk));
        resp.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch {
            reject(quoteError('INVALID_RESPONSE', `Ungueltiges JSON von Yahoo: ${data.slice(0, 200)}`, 502));
            return;
          }
          const status = resp.statusCode || 500;
          if (status < 200 || status >= 300) {
            reject(upstreamStatusError(status));
            return;
          }
          resolve(parsed);
        });
      }
    );
    req.setTimeout(UPSTREAM_TIMEOUT_MS, () => {
      req.destroy(quoteError('PROVIDER_TIMEOUT', `Yahoo-Timeout nach ${UPSTREAM_TIMEOUT_MS} ms.`, 504));
    });
    req.on('error', (error) => {
      reject(error instanceof ProxyQuoteError
        ? error
        : quoteError('PROVIDER_UNAVAILABLE', error.message || 'Yahoo nicht erreichbar.', 502));
    });
    req.end();
  });

const pickChartCandidate = (data) => {
  const result = data?.chart?.result?.[0];
  const meta = result?.meta || {};
  let price = meta.regularMarketPrice;
  let asOf = meta.regularMarketTime;

  if (!Number.isFinite(price) || price <= 0) {
    const closes = result?.indicators?.quote?.[0]?.close;
    const timestamps = result?.timestamp;
    if (Array.isArray(closes)) {
      for (let index = closes.length - 1; index >= 0; index -= 1) {
        if (!Number.isFinite(closes[index]) || closes[index] <= 0) continue;
        price = closes[index];
        asOf = Array.isArray(timestamps) ? timestamps[index] : null;
        break;
      }
    }
  }

  return {
    symbol: meta.symbol,
    price,
    currency: meta.currency,
    asOf,
    source: 'yahoo-chart'
  };
};

const pickQuoteCandidate = (data) => {
  const result = data?.quoteResponse?.result?.[0] || {};
  return {
    symbol: result.symbol,
    price: result.regularMarketPrice,
    currency: result.currency,
    asOf: result.regularMarketTime,
    source: 'yahoo-quote'
  };
};

const normalizeProviderQuote = (requestedSymbol, candidate, nowSeconds = Math.floor(Date.now() / 1000)) => {
  const requested = normalizeYahooSymbol(requestedSymbol);
  let responseSymbol;
  try {
    responseSymbol = normalizeYahooSymbol(candidate?.symbol);
  } catch {
    throw quoteError('INVALID_RESPONSE', 'Yahoo-Antwort enthaelt kein gueltiges Symbol.');
  }
  if (responseSymbol !== requested) {
    throw quoteError('SYMBOL_MISMATCH', `Antwortsymbol ${responseSymbol} entspricht nicht der Anfrage ${requested}.`);
  }

  const price = candidate?.price;
  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
    throw quoteError('INVALID_PRICE', 'Yahoo-Antwort enthaelt keinen positiven endlichen Kurs.');
  }

  const currency = typeof candidate?.currency === 'string'
    ? candidate.currency.trim().toUpperCase()
    : '';
  if (!currency) throw quoteError('CURRENCY_MISSING', 'Yahoo-Antwort enthaelt keine eindeutige Waehrung.');
  if (currency !== 'EUR') {
    throw quoteError('UNSUPPORTED_CURRENCY', `Waehrung ${currency} wird nicht unterstuetzt.`);
  }

  const asOf = candidate?.asOf;
  if (asOf === undefined || asOf === null || asOf === '') {
    throw quoteError('AS_OF_MISSING', 'Yahoo-Antwort enthaelt keinen Kursstichtag.');
  }
  if (!Number.isInteger(asOf) || asOf <= 0) {
    throw quoteError('INVALID_AS_OF', 'Kursstichtag muss eine positive UTC-Unixsekunde sein.');
  }
  if (asOf > nowSeconds + QUOTE_FUTURE_TOLERANCE_SECONDS) {
    throw quoteError('QUOTE_FROM_FUTURE', 'Kursstichtag liegt unzulaessig weit in der Zukunft.');
  }
  if (nowSeconds - asOf > QUOTE_MAX_AGE_SECONDS) {
    throw quoteError('QUOTE_STALE', 'Kurs ist aelter als sieben Kalendertage.');
  }

  const source = typeof candidate?.source === 'string' ? candidate.source.trim() : '';
  if (!source) throw quoteError('INVALID_RESPONSE', 'Yahoo-Antwort enthaelt keine Kursquelle.');
  return { symbol: responseSymbol, price, currency, asOf, source };
};

const shouldStopFallback = (error) => [
  'UNSUPPORTED_CURRENCY',
  'SYMBOL_MISMATCH',
  'QUOTE_STALE',
  'QUOTE_FROM_FUTURE'
].includes(error?.code);

const proxyQuote = async (rawSymbol, res) => {
  let symbol;
  try {
    symbol = normalizeYahooSymbol(rawSymbol);
  } catch (error) {
    sendError(res, error, 400);
    return;
  }

  const attempts = [
    ...[
      'https://query1.finance.yahoo.com/v8/finance/chart/',
      'https://query2.finance.yahoo.com/v8/finance/chart/'
    ].map(base => ({
      url: `${base}${encodeURIComponent(symbol)}?interval=1d&range=1d&lang=en-US&region=US&corsDomain=finance.yahoo.com`,
      pick: pickChartCandidate
    })),
    ...[
      'https://query1.finance.yahoo.com/v7/finance/quote?symbols=',
      'https://query2.finance.yahoo.com/v7/finance/quote?symbols='
    ].map(base => ({ url: `${base}${encodeURIComponent(symbol)}`, pick: pickQuoteCandidate }))
  ];

  let lastError = quoteError('SYMBOL_NOT_FOUND', 'Yahoo: Symbol nicht gefunden.', 404);
  for (const attempt of attempts) {
    try {
      const data = await fetchJson(attempt.url);
      const quote = normalizeProviderQuote(symbol, attempt.pick(data));
      sendJson(res, 200, quote);
      return;
    } catch (error) {
      lastError = error instanceof ProxyQuoteError
        ? error
        : quoteError('PROVIDER_UNAVAILABLE', error?.message || String(error), 502);
      if (shouldStopFallback(lastError)) break;
    }
  }
  sendError(res, lastError);
};

const proxySearch = async (query, res) => {
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}`;
  try {
    sendJson(res, 200, await fetchJson(url));
  } catch (error) {
    sendError(res, error);
  }
};

const proxyChart = async (symbol, period1, period2, interval, res) => {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${encodeURIComponent(period1)}&period2=${encodeURIComponent(period2)}&interval=${encodeURIComponent(interval || '1d')}&lang=en-US&region=US&corsDomain=finance.yahoo.com`;
  try {
    sendJson(res, 200, await fetchJson(url));
  } catch (error) {
    sendError(res, error);
  }
};

const createServer = () => http.createServer((req, res) => {
  res._corsOrigin = corsOrigin(req);
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': res._corsOrigin,
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === '/quote') {
    const symbol = url.searchParams.get('symbol');
    if (!symbol) {
      sendError(res, quoteError('INVALID_SYMBOL', 'Yahoo-Symbol fehlt.', 400));
      return;
    }
    void proxyQuote(symbol, res);
    return;
  }

  if (url.pathname === '/search') {
    const query = url.searchParams.get('q');
    if (!query) {
      sendError(res, quoteError('INVALID_SEARCH_QUERY', 'Suchbegriff fehlt.', 400));
      return;
    }
    void proxySearch(query, res);
    return;
  }

  if (url.pathname === '/chart') {
    const symbol = url.searchParams.get('symbol');
    const period1 = url.searchParams.get('period1');
    const period2 = url.searchParams.get('period2');
    const interval = url.searchParams.get('interval') || '1d';
    if (!symbol || !period1 || !period2) {
      sendError(res, quoteError('INVALID_CHART_QUERY', 'Chart-Parameter fehlen.', 400));
      return;
    }
    void proxyChart(symbol, period1, period2, interval, res);
    return;
  }

  sendError(res, quoteError('NOT_FOUND', 'Route nicht gefunden.', 404));
});

if (require.main === module) {
  createServer().listen(port, () => {
    console.log(`Yahoo proxy listening on http://localhost:${port}`);
  });
}

module.exports = {
  ProxyQuoteError,
  QUOTE_FUTURE_TOLERANCE_SECONDS,
  QUOTE_MAX_AGE_SECONDS,
  createServer,
  normalizeProviderQuote,
  normalizeYahooSymbol,
  pickChartCandidate,
  pickQuoteCandidate
};
