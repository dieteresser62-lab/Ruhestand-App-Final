"use strict";

function toNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

function buildAreaPath(pointsTop, pointsBottom) {
    if (!pointsTop.length || !pointsBottom.length) return '';
    const start = `M ${pointsTop[0].x.toFixed(2)} ${pointsTop[0].y.toFixed(2)}`;
    const topLine = pointsTop.slice(1).map(p => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
    const bottomLine = pointsBottom.slice().reverse().map(p => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
    return `${start} ${topLine} ${bottomLine} Z`;
}

export function renderThreeBucketPortfolioChart(container, rows) {
    if (!container) return;
    container.innerHTML = '';
    const series = (Array.isArray(rows) ? rows : [])
        .map((entry, index) => {
            const row = entry?.row || {};
            const bond = toNumber(row.bondBucketAfter ?? row.threeBucket?.bondBucketAfter);
            const equityTotal = toNumber(entry?.wertAktien ?? row.wertAktien);
            const etf = Math.max(0, equityTotal - bond);
            const liq = toNumber(entry?.liquiditaet ?? row.liquiditaet);
            return { index, etf, bond, liq, total: etf + bond + liq };
        })
        .filter(item => item.total > 0);
    if (!series.length) return;

    const width = 820;
    const height = 320;
    const margin = { top: 16, right: 16, bottom: 24, left: 28 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const maxTotal = Math.max(...series.map(s => s.total), 1);
    const xScale = (idx) => margin.left + ((series.length <= 1 ? 0 : idx / (series.length - 1)) * plotWidth);
    const yScale = (value) => margin.top + plotHeight - ((value / maxTotal) * plotHeight);

    const etfTop = [];
    const etfBottom = [];
    const bondTop = [];
    const bondBottom = [];
    const liqTop = [];
    const liqBottom = [];

    series.forEach((item, idx) => {
        const x = xScale(idx);
        const etfYTop = yScale(item.etf);
        const bondYTop = yScale(item.etf + item.bond);
        const liqYTop = yScale(item.total);
        const zeroY = yScale(0);
        etfTop.push({ x, y: etfYTop });
        etfBottom.push({ x, y: zeroY });
        bondTop.push({ x, y: bondYTop });
        bondBottom.push({ x, y: etfYTop });
        liqTop.push({ x, y: liqYTop });
        liqBottom.push({ x, y: bondYTop });
    });

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('style', 'display:block;background:#fff;border:1px solid #e2e8f0;border-radius:8px;');
    const addPath = (d, fill) => {
        if (!d) return;
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', d);
        path.setAttribute('fill', fill);
        svg.appendChild(path);
    };
    addPath(buildAreaPath(etfTop, etfBottom), '#2563eb');
    addPath(buildAreaPath(bondTop, bondBottom), '#f59e0b');
    addPath(buildAreaPath(liqTop, liqBottom), '#16a34a');

    container.appendChild(svg);

    const legend = document.createElement('div');
    legend.style.display = 'flex';
    legend.style.alignItems = 'center';
    legend.style.justifyContent = 'center';
    legend.style.flexWrap = 'wrap';
    legend.style.gap = '20px';
    legend.style.marginTop = '10px';
    const createLegendItem = (label, color) => {
        const item = document.createElement('div');
        item.style.display = 'inline-flex';
        item.style.alignItems = 'center';
        item.style.gap = '8px';
        const box = document.createElement('span');
        box.style.display = 'inline-block';
        box.style.width = '12px';
        box.style.height = '12px';
        box.style.background = color;
        const text = document.createElement('span');
        text.textContent = label;
        item.appendChild(box);
        item.appendChild(text);
        return item;
    };
    legend.appendChild(createLegendItem('ETF', '#2563eb'));
    legend.appendChild(createLegendItem('Bonds/Puffer', '#f59e0b'));
    legend.appendChild(createLegendItem('Liquidität', '#16a34a'));
    container.appendChild(legend);
}

