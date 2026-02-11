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

const ALLOWED_ORIGINS = ['null', 'tauri://localhost'];
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

const sendError = (res, status, message) => {
  sendJson(res, status, { error: message });
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
          try {
            resolve({ status: resp.statusCode || 500, data: JSON.parse(data) });
          } catch (err) {
            const snippet = data.slice(0, 200);
            reject(new Error(`Invalid JSON from Yahoo: ${snippet}`));
          }
        });
      }
    );
    req.on('error', (err) => reject(err));
    req.end();
  });

const pickQuotePrice = (data) => {
  const result = data && data.quoteResponse && Array.isArray(data.quoteResponse.result)
    ? data.quoteResponse.result[0]
    : null;
  if (result && Number.isFinite(result.regularMarketPrice)) return result.regularMarketPrice;
  return null;
};

const pickChartPrice = (data) => {
  const chart = data && data.chart && Array.isArray(data.chart.result) ? data.chart.result[0] : null;
  const metaPrice = chart && chart.meta ? Number(chart.meta.regularMarketPrice) : null;
  if (Number.isFinite(metaPrice) && metaPrice > 0) return metaPrice;
  const closes = chart && chart.indicators && Array.isArray(chart.indicators.quote)
    ? chart.indicators.quote[0]?.close
    : null;
  if (Array.isArray(closes)) {
    const last = closes.slice().reverse().find((v) => Number.isFinite(v));
    if (Number.isFinite(last)) return last;
  }
  return null;
};

const normalizeGbpPrice = (symbol, data, price) => {
  if (!symbol.endsWith('.L')) return price;
  const currency = data?.chart?.result?.[0]?.meta?.currency || '';
  if (currency === 'GBp') return price / 100;
  if (currency === 'GBX') return price;
  if (String(currency).toUpperCase() === 'GBP') return price;
  return price;
};

const proxyQuote = async (symbol, res) => {
  const chartUrls = [
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d&lang=en-US&region=US&corsDomain=finance.yahoo.com`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d&lang=en-US&region=US&corsDomain=finance.yahoo.com`
  ];
  try {
    for (const chartUrl of chartUrls) {
      const chart = await fetchJson(chartUrl);
      const price = pickChartPrice(chart.data);
      if (Number.isFinite(price) && price > 0) {
        const normalized = normalizeGbpPrice(symbol, chart.data, price);
        const timezone = chart.data?.chart?.result?.[0]?.meta?.exchangeTimezoneName || '';
        sendJson(res, 200, { price: String(normalized), source: 'chart', timezone, data: chart.data });
        return;
      }
    }
  } catch (err) {
    // ignore and try quote
  }

  const quoteUrls = [
    `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`,
    `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`
  ];
  try {
    for (const quoteUrl of quoteUrls) {
      const quote = await fetchJson(quoteUrl);
      const price = pickQuotePrice(quote.data);
      if (Number.isFinite(price) && price > 0) {
        sendJson(res, 200, { price: String(price), source: 'quote', data: quote.data });
        return;
      }
    }
  } catch (err) {
    sendError(res, 502, err.message || 'Yahoo error');
    return;
  }

  sendError(res, 404, 'Yahoo: no price');
};

const proxySearch = async (query, res) => {
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}`;
  try {
    const result = await fetchJson(url);
    sendJson(res, result.status || 200, result.data);
  } catch (err) {
    sendError(res, 502, err.message || 'Yahoo error');
  }
};

const proxyChart = async (symbol, period1, period2, interval, res) => {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${encodeURIComponent(period1)}&period2=${encodeURIComponent(period2)}&interval=${encodeURIComponent(interval || '1d')}&lang=en-US&region=US&corsDomain=finance.yahoo.com`;
  try {
    const result = await fetchJson(url);
    sendJson(res, result.status || 200, result.data);
  } catch (err) {
    sendError(res, 502, err.message || 'Yahoo error');
  }
};

const server = http.createServer((req, res) => {
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
      sendError(res, 400, 'Missing symbol');
      return;
    }
    proxyQuote(symbol, res);
    return;
  }

  if (url.pathname === '/search') {
    const query = url.searchParams.get('q');
    if (!query) {
      sendError(res, 400, 'Missing query');
      return;
    }
    proxySearch(query, res);
    return;
  }

  if (url.pathname === '/chart') {
    const symbol = url.searchParams.get('symbol');
    const period1 = url.searchParams.get('period1');
    const period2 = url.searchParams.get('period2');
    const interval = url.searchParams.get('interval') || '1d';
    if (!symbol || !period1 || !period2) {
      sendError(res, 400, 'Missing chart params');
      return;
    }
    proxyChart(symbol, period1, period2, interval, res);
    return;
  }

  sendError(res, 404, 'Not found');
});

server.listen(port, () => {
  console.log(`Yahoo proxy listening on http://localhost:${port}`);
});
