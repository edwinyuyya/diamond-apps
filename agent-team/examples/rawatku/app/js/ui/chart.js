// Rawatku — pembangun grafik SVG murni (tanpa library).
// String SVG yang dihasilkan selalu meng-escape teks dinamis dan tetap valid
// meskipun tidak ada data. Grafik memakai role="img", <title>, dan <desc>.

import { formatDateID } from '../logic/dates.js';

const COLORS = ['#0f766e', '#b45309', '#7c3aed', '#be123c'];
const AXIS_COLOR = '#64748b';
const GRID_COLOR = '#e2e8f0';
const TEXT_COLOR = '#0f172a';
const MUTED_COLOR = '#475569';

/** Escape lima karakter XML/HTML penting. */
function escapeXml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return character;
    }
  });
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Angka terbatas untuk atribut SVG (tanpa notasi eksponen yang aneh). */
function numberAttr(value, fallback = 0) {
  if (!isFiniteNumber(value)) return String(fallback);
  const rounded = Math.round(value * 100) / 100;
  return String(rounded);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function dimension(value, fallback, min, max) {
  if (!isFiniteNumber(value)) return fallback;
  return clamp(Math.round(value), min, max);
}

function formatLabel(value) {
  if (!isFiniteNumber(value)) return '';
  const rounded = Math.round(value * 100) / 100;
  return String(rounded).replace('.', ',');
}

function dateLabel(dateISO) {
  const text = typeof dateISO === 'string' ? dateISO : '';
  if (!text) return '—';
  try {
    return formatDateID(text, 'short') || text;
  } catch {
    return text;
  }
}

function emptySvg({ title, width, height, message = 'Belum ada data', ariaLabel = '' }) {
  const safeTitle = escapeXml(title || 'Grafik');
  const label = escapeXml(ariaLabel || `${title || 'Grafik'}. ${message}.`);
  const centerX = width / 2;
  const centerY = height / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${numberAttr(width)}" height="${numberAttr(height)}" viewBox="0 0 ${numberAttr(width)} ${numberAttr(height)}" role="img" aria-label="${label}" class="chart-svg chart-svg--empty">`
    + `<title>${safeTitle}</title>`
    + `<desc>${escapeXml(message)}.</desc>`
    + `<rect x="0.5" y="0.5" width="${numberAttr(width - 1)}" height="${numberAttr(height - 1)}" fill="none" stroke="${GRID_COLOR}"/>`
    + `<text x="${numberAttr(centerX)}" y="${numberAttr(centerY)}" text-anchor="middle" dominant-baseline="middle" fill="${MUTED_COLOR}" font-family="system-ui, sans-serif" font-size="14">${escapeXml(message)}</text>`
    + '</svg>';
}

function normalizeSeries(series) {
  if (!Array.isArray(series)) return [];
  return series.map((entry, index) => {
    const points = Array.isArray(entry?.points) ? entry.points : [];
    const cleanPoints = points
      .filter((point) => point && isFiniteNumber(point.value))
      .map((point) => ({
        date: typeof point.date === 'string' ? point.date : '',
        value: point.value,
        flag: point.flag === 'low' || point.flag === 'high' ? point.flag : null
      }));
    return {
      key: entry?.key != null ? String(entry.key) : `series-${index + 1}`,
      label: entry?.label != null ? String(entry.label) : `Seri ${index + 1}`,
      unit: entry?.unit != null ? String(entry.unit) : '',
      points: cleanPoints,
      color: COLORS[index % COLORS.length]
    };
  }).filter((entry) => entry.points.length > 0);
}

function niceBounds(values, low, high) {
  const candidates = values.slice();
  if (isFiniteNumber(low)) candidates.push(low);
  if (isFiniteNumber(high)) candidates.push(high);

  if (candidates.length === 0) return { min: 0, max: 1 };

  let min = Math.min(...candidates);
  let max = Math.max(...candidates);
  if (min === max) {
    const pad = Math.abs(min) * 0.05 || 1;
    min -= pad;
    max += pad;
  } else {
    const pad = (max - min) * 0.08;
    min -= pad;
    max += pad;
  }
  return { min, max };
}

function seriesDescription(series, unit) {
  return series.map((entry) => {
    const last = entry.points[entry.points.length - 1];
    const unitText = entry.unit || unit || '';
    return `${entry.label}: ${entry.points.length} titik, terbaru ${formatLabel(last.value)}${unitText ? ` ${unitText}` : ''}`;
  }).join('; ');
}

/**
 * Grafik garis aksesibel dari beberapa seri.
 *
 * @param {object} [options]
 * @param {Array} [options.series] [{ key, label, unit, points: [{date,value,flag}] }]
 * @param {number|null} [options.low] batas bawah acuan (opsional)
 * @param {number|null} [options.high] batas atas acuan (opsional)
 * @param {string} [options.title]
 * @param {string} [options.unit]
 * @param {number} [options.width]
 * @param {number} [options.height]
 * @returns {string} string SVG
 */
export function buildLineChartSVG({
  series = [],
  low = null,
  high = null,
  title = 'Grafik',
  unit = '',
  width = 640,
  height = 240
} = {}) {
  const chartWidth = dimension(width, 640, 240, 2000);
  const chartHeight = dimension(height, 240, 140, 1200);
  const safeTitle = typeof title === 'string' && title.trim() ? title : 'Grafik';
  const safeUnit = typeof unit === 'string' ? unit : '';
  const cleanSeries = normalizeSeries(series);
  const allPoints = cleanSeries.flatMap((entry) => entry.points);
  const safeLow = isFiniteNumber(low) ? low : null;
  const safeHigh = isFiniteNumber(high) ? high : null;

  if (allPoints.length === 0) {
    return emptySvg({
      title: safeTitle,
      width: chartWidth,
      height: chartHeight,
      ariaLabel: `${safeTitle}. Grafik garis. Belum ada data.`
    });
  }

  const margin = { top: 44, right: 18, bottom: 44, left: 56 };
  const plotWidth = chartWidth - margin.left - margin.right;
  const plotHeight = chartHeight - margin.top - margin.bottom;
  const bounds = niceBounds(allPoints.map((point) => point.value), safeLow, safeHigh);
  const span = bounds.max - bounds.min || 1;

  const yFor = (value) => margin.top + ((bounds.max - value) / span) * plotHeight;

  const dates = [...new Set(allPoints.map((point) => point.date))].sort((a, b) => a.localeCompare(b));
  const dateIndex = new Map(dates.map((date, index) => [date, index]));
  const xForDate = (date) => {
    if (dates.length <= 1) return margin.left + plotWidth / 2;
    const index = dateIndex.get(date) ?? 0;
    return margin.left + (index / (dates.length - 1)) * plotWidth;
  };

  const gridLines = 4;
  const parts = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${numberAttr(chartWidth)}" height="${numberAttr(chartHeight)}" viewBox="0 0 ${numberAttr(chartWidth)} ${numberAttr(chartHeight)}" role="img" aria-label="${escapeXml(`${safeTitle}. Grafik garis. ${seriesDescription(cleanSeries, safeUnit)}.`)}" class="chart-svg chart-svg--line">`);
  parts.push(`<title>${escapeXml(safeTitle)}</title>`);
  parts.push(`<desc>${escapeXml(`Grafik garis ${safeTitle}. ${seriesDescription(cleanSeries, safeUnit)}.`)}</desc>`);
  parts.push(`<rect x="0.5" y="0.5" width="${numberAttr(chartWidth - 1)}" height="${numberAttr(chartHeight - 1)}" fill="none" stroke="${GRID_COLOR}"/>`);
  parts.push(`<text x="12" y="18" fill="${TEXT_COLOR}" font-family="system-ui, sans-serif" font-size="14" font-weight="700">${escapeXml(safeTitle)}</text>`);

  // Grid horizontal + label sumbu Y.
  for (let index = 0; index <= gridLines; index += 1) {
    const ratio = index / gridLines;
    const value = bounds.max - ratio * span;
    const y = margin.top + ratio * plotHeight;
    parts.push(`<line x1="${numberAttr(margin.left)}" y1="${numberAttr(y)}" x2="${numberAttr(margin.left + plotWidth)}" y2="${numberAttr(y)}" stroke="${GRID_COLOR}" stroke-width="1"/>`);
    parts.push(`<text x="${numberAttr(margin.left - 8)}" y="${numberAttr(y + 4)}" text-anchor="end" fill="${MUTED_COLOR}" font-family="system-ui, sans-serif" font-size="11">${escapeXml(formatLabel(value))}</text>`);
  }

  // Garis batas acuan.
  for (const [key, value, label] of [
    ['low', safeLow, 'Batas bawah'],
    ['high', safeHigh, 'Batas atas']
  ]) {
    if (!isFiniteNumber(value)) continue;
    const y = yFor(value);
    parts.push(`<line data-range="${key}" x1="${numberAttr(margin.left)}" y1="${numberAttr(y)}" x2="${numberAttr(margin.left + plotWidth)}" y2="${numberAttr(y)}" stroke="${COLORS[3]}" stroke-width="1.5" stroke-dasharray="6 4"/>`);
    parts.push(`<text x="${numberAttr(margin.left + plotWidth)}" y="${numberAttr(y - 4)}" text-anchor="end" fill="${COLORS[3]}" font-family="system-ui, sans-serif" font-size="10">${escapeXml(`${label} ${formatLabel(value)}${safeUnit ? ` ${safeUnit}` : ''}`)}</text>`);
  }

  // Sumbu X.
  parts.push(`<line x1="${numberAttr(margin.left)}" y1="${numberAttr(margin.top + plotHeight)}" x2="${numberAttr(margin.left + plotWidth)}" y2="${numberAttr(margin.top + plotHeight)}" stroke="${AXIS_COLOR}" stroke-width="1"/>`);
  const labelIndexes = dates.length <= 4
    ? dates.map((_, index) => index)
    : [0, Math.floor((dates.length - 1) / 2), dates.length - 1];
  for (const index of [...new Set(labelIndexes)]) {
    const date = dates[index];
    const x = xForDate(date);
    parts.push(`<text x="${numberAttr(x)}" y="${numberAttr(chartHeight - 20)}" text-anchor="middle" fill="${MUTED_COLOR}" font-family="system-ui, sans-serif" font-size="11">${escapeXml(dateLabel(date))}</text>`);
  }

  // Garis & titik per seri.
  for (const entry of cleanSeries) {
    const plotted = entry.points.map((point) => ({
      ...point,
      x: xForDate(point.date),
      y: yFor(point.value)
    }));

    if (plotted.length > 1) {
      const path = plotted.map((point) => `${numberAttr(point.x)},${numberAttr(point.y)}`).join(' ');
      parts.push(`<polyline data-series="${escapeXml(entry.key)}" points="${path}" fill="none" stroke="${entry.color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`);
    }

    for (const point of plotted) {
      const outOfRange = point.flag === 'low'
        || point.flag === 'high'
        || (isFiniteNumber(safeLow) && point.value < safeLow)
        || (isFiniteNumber(safeHigh) && point.value > safeHigh);
      const pointColor = outOfRange ? COLORS[3] : entry.color;
      const radius = outOfRange ? 6 : 4;
      const flagText = point.flag === 'low'
        ? ' (rendah)'
        : point.flag === 'high'
          ? ' (tinggi)'
          : '';
      const tooltip = `${entry.label} — ${dateLabel(point.date)}: ${formatLabel(point.value)}${entry.unit || safeUnit ? ` ${entry.unit || safeUnit}` : ''}${flagText}`;
      parts.push(`<circle cx="${numberAttr(point.x)}" cy="${numberAttr(point.y)}" r="${numberAttr(radius)}" fill="${pointColor}" stroke="#ffffff" stroke-width="1.5"${outOfRange ? ' class="is-out-of-range"' : ''}><title>${escapeXml(tooltip)}</title></circle>`);
    }
  }

  // Legenda bila lebih dari satu seri.
  if (cleanSeries.length > 1) {
    let legendX = margin.left;
    const legendY = chartHeight - 6;
    for (const entry of cleanSeries) {
      parts.push(`<rect x="${numberAttr(legendX)}" y="${numberAttr(legendY - 9)}" width="10" height="10" rx="2" fill="${entry.color}"/>`);
      parts.push(`<text x="${numberAttr(legendX + 15)}" y="${numberAttr(legendY)}" fill="${TEXT_COLOR}" font-family="system-ui, sans-serif" font-size="11">${escapeXml(entry.label)}${entry.unit ? ` (${escapeXml(entry.unit)})` : ''}</text>`);
      legendX += 24 + String(entry.label).length * 6 + (entry.unit ? String(entry.unit).length * 6 + 4 : 0);
    }
  }

  parts.push('</svg>');
  return parts.join('');
}

function normalizeBars(bars) {
  if (!Array.isArray(bars)) return [];
  return bars.map((bar, index) => {
    const rawValue = isFiniteNumber(bar?.value)
      ? bar.value
      : isFiniteNumber(bar?.percent)
        ? bar.percent
        : 0;
    return {
      label: bar?.label != null ? String(bar.label) : `#${index + 1}`,
      value: rawValue,
      note: bar?.note != null ? String(bar.note) : ''
    };
  });
}

/**
 * Grafik batang aksesibel.
 *
 * @param {object} [options]
 * @param {Array} [options.bars] [{ label, value }]
 * @param {number} [options.max]
 * @param {string} [options.title]
 * @param {string} [options.unit]
 * @param {number} [options.width]
 * @param {number} [options.height]
 * @returns {string} string SVG
 */
export function buildBarChartSVG({
  bars = [],
  max = 100,
  title = 'Grafik',
  unit = '%',
  width = 640,
  height = 200
} = {}) {
  const chartWidth = dimension(width, 640, 240, 2000);
  const chartHeight = dimension(height, 200, 140, 1200);
  const safeTitle = typeof title === 'string' && title.trim() ? title : 'Grafik';
  const safeUnit = typeof unit === 'string' ? unit : '';
  const cleanBars = normalizeBars(bars);
  const safeMax = isFiniteNumber(max) && max > 0 ? max : 100;

  if (cleanBars.length === 0) {
    return emptySvg({
      title: safeTitle,
      width: chartWidth,
      height: chartHeight,
      ariaLabel: `${safeTitle}. Grafik batang. Belum ada data.`
    });
  }

  const margin = { top: 34, right: 16, bottom: 42, left: 48 };
  const plotWidth = chartWidth - margin.left - margin.right;
  const plotHeight = chartHeight - margin.top - margin.bottom;
  const gridLines = 4;
  const parts = [];
  const summary = cleanBars
    .map((bar) => `${bar.label}: ${formatLabel(bar.value)}${safeUnit ? ` ${safeUnit}` : ''}`)
    .join('; ');

  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${numberAttr(chartWidth)}" height="${numberAttr(chartHeight)}" viewBox="0 0 ${numberAttr(chartWidth)} ${numberAttr(chartHeight)}" role="img" aria-label="${escapeXml(`${safeTitle}. Grafik batang. ${summary}.`)}" class="chart-svg chart-svg--bar">`);
  parts.push(`<title>${escapeXml(safeTitle)}</title>`);
  parts.push(`<desc>${escapeXml(`Grafik batang ${safeTitle}. ${summary}.`)}</desc>`);
  parts.push(`<rect x="0.5" y="0.5" width="${numberAttr(chartWidth - 1)}" height="${numberAttr(chartHeight - 1)}" fill="none" stroke="${GRID_COLOR}"/>`);
  parts.push(`<text x="12" y="18" fill="${TEXT_COLOR}" font-family="system-ui, sans-serif" font-size="14" font-weight="700">${escapeXml(safeTitle)}</text>`);

  for (let index = 0; index <= gridLines; index += 1) {
    const ratio = index / gridLines;
    const value = safeMax - ratio * safeMax;
    const y = margin.top + ratio * plotHeight;
    parts.push(`<line x1="${numberAttr(margin.left)}" y1="${numberAttr(y)}" x2="${numberAttr(margin.left + plotWidth)}" y2="${numberAttr(y)}" stroke="${GRID_COLOR}" stroke-width="1"/>`);
    parts.push(`<text x="${numberAttr(margin.left - 8)}" y="${numberAttr(y + 4)}" text-anchor="end" fill="${MUTED_COLOR}" font-family="system-ui, sans-serif" font-size="11">${escapeXml(`${formatLabel(value)}${safeUnit}`)}</text>`);
  }

  const slot = plotWidth / cleanBars.length;
  const barWidth = Math.max(4, Math.min(slot * 0.62, 56));

  cleanBars.forEach((bar, index) => {
    const ratio = clamp(bar.value / safeMax, 0, 1);
    const barHeight = ratio * plotHeight;
    const x = margin.left + slot * index + (slot - barWidth) / 2;
    const y = margin.top + plotHeight - barHeight;
    const tooltip = `${bar.label}: ${formatLabel(bar.value)}${safeUnit ? ` ${safeUnit}` : ''}${bar.note ? ` — ${bar.note}` : ''}`;

    parts.push(`<rect x="${numberAttr(x)}" y="${numberAttr(y)}" width="${numberAttr(barWidth)}" height="${numberAttr(Math.max(barHeight, 1))}" rx="4" fill="${COLORS[0]}"><title>${escapeXml(tooltip)}</title></rect>`);
    parts.push(`<text x="${numberAttr(x + barWidth / 2)}" y="${numberAttr(y - 4)}" text-anchor="middle" fill="${TEXT_COLOR}" font-family="system-ui, sans-serif" font-size="11" font-weight="700">${escapeXml(formatLabel(bar.value))}</text>`);
    parts.push(`<text x="${numberAttr(x + barWidth / 2)}" y="${numberAttr(margin.top + plotHeight + 18)}" text-anchor="middle" fill="${MUTED_COLOR}" font-family="system-ui, sans-serif" font-size="11">${escapeXml(bar.label)}</text>`);
  });

  parts.push('</svg>');
  return parts.join('');
}

/**
 * Menempelkan SVG (string dari modul internal ini) ke container.
 * String dianggap tepercaya karena seluruh teks sudah di-escape.
 */
export function renderChart(container, svg) {
  if (!container) return;
  if (typeof svg !== 'string' || svg.trim() === '') {
    container.textContent = 'Grafik belum tersedia.';
    return;
  }
  container.innerHTML = svg;
}
