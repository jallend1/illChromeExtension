// shipping-arcs.js
// ─────────────────────────────────────────────────────────────────────────────
// Renders KCLS outgoing ILL shipments as a deck.gl ArcLayer.
// Expects data/geocoded.json produced by geocode_shipments.py.
// ─────────────────────────────────────────────────────────────────────────────

// ── Color scales ──────────────────────────────────────────────────────────────

// Weight scale: teal (1 lb) → amber (2 lbs) → terracotta (3+ lbs)
const WEIGHT_PALETTE = [
  [38,  198, 218], // teal
  [255, 213, 79],  // amber
  [200, 75,  47],  // terracotta
];

// Mail class colors — keyed to the class strings in the data
const CLASS_COLORS = {
  'Library Mail':     [38,  198, 218],
  'Media Mail':       [255, 213, 79],
  'Priority Mail':    [200, 75,  47],
  'First-Class Mail': [129, 199, 132],
};
const CLASS_FALLBACK = [160, 160, 160];

function lerp(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function weightColor(lbs) {
  const t = Math.min(Math.max((lbs - 1) / 2, 0), 1);
  if (t <= 0.5) return lerp(WEIGHT_PALETTE[0], WEIGHT_PALETTE[1], t * 2);
  return lerp(WEIGHT_PALETTE[1], WEIGHT_PALETTE[2], (t - 0.5) * 2);
}

function classColor(mailClass) {
  return CLASS_COLORS[mailClass] || CLASS_FALLBACK;
}

// ── Legend ────────────────────────────────────────────────────────────────────

function renderLegend(mode, classes) {
  const title = document.getElementById('legend-title');
  const rows  = document.getElementById('legend-rows');

  if (mode === 'weight') {
    title.textContent = 'Package Weight (lbs)';
    rows.innerHTML = [
      { label: '3+ lbs', color: WEIGHT_PALETTE[2] },
      { label: '2 lbs',  color: WEIGHT_PALETTE[1] },
      { label: '1 lb',   color: WEIGHT_PALETTE[0] },
    ].map(e => `
      <div class="legend-row">
        <div class="swatch" style="background:rgb(${e.color.join(',')})"></div>
        <span>${e.label}</span>
      </div>`).join('');
  } else {
    title.textContent = 'Mail Class';
    rows.innerHTML = classes.map(c => {
      const color = CLASS_COLORS[c] || CLASS_FALLBACK;
      return `
        <div class="legend-row">
          <div class="swatch" style="background:rgb(${color.join(',')})"></div>
          <span>${c}</span>
        </div>`;
    }).join('');
  }
}

// ── Stats ─────────────────────────────────────────────────────────────────────

function updateStats(shipments) {
  const destinations = new Set(shipments.map(s => s.formatted_address || s.address)).size;
  const totalWeight  = shipments.reduce((sum, s) => sum + (s.weight_lbs || 0), 0);
  const totalCost    = shipments.reduce((sum, s) => sum + (parseFloat(s.total_cost) || 0), 0);

  document.getElementById('stat-packages').textContent     = shipments.length.toLocaleString();
  document.getElementById('stat-destinations').textContent = destinations.toLocaleString();
  document.getElementById('stat-weight').textContent       = totalWeight.toLocaleString();
  document.getElementById('stat-cost').textContent         = '$' + totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── deck.gl state ─────────────────────────────────────────────────────────────

let deckInstance     = null;
let allShipments     = []; // full geocoded dataset
let visibleShipments = []; // current filtered slice
let origin           = null;
let colorMode        = 'weight';
let arcHeight        = 1;
let arcWidth         = 1.5;
let uniqueClasses    = [];
let activePeriod     = 'all';

const tooltip = document.getElementById('tooltip');

function getArcColor(d) {
  const base = colorMode === 'weight'
    ? weightColor(d.weight_lbs || 1)
    : classColor(d.mail_class);
  return [...base, 180];
}

function buildLayer() {
  return new deck.ArcLayer({
    id:                'arcs',
    data:              visibleShipments,
    getSourcePosition: () => [origin.lng, origin.lat],
    getTargetPosition: d  => [d.lng, d.lat],
    getSourceColor:    d  => getArcColor(d),
    getTargetColor:    d  => getArcColor(d),
    getWidth:          arcWidth,
    getHeight:         arcHeight,
    pickable:          true,
    autoHighlight:     true,
    highlightColor:    [255, 255, 255, 60],
  });
}

function render() {
  if (!deckInstance) return;
  deckInstance.setProps({ layers: [buildLayer()] });
}

// ── Period filtering ──────────────────────────────────────────────────────────

const MONTH_LABELS = {
  '2025-01': 'January 2025',   '2025-02': 'February 2025',
  '2025-03': 'March 2025',     '2025-04': 'April 2025',
  '2025-05': 'May 2025',       '2025-06': 'June 2025',
  '2025-07': 'July 2025',      '2025-08': 'August 2025',
  '2025-09': 'September 2025', '2025-10': 'October 2025',
  '2025-11': 'November 2025',  '2025-12': 'December 2025',
};

function switchPeriod(period) {
  activePeriod = period;

  document.querySelectorAll('.period-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.period === period);
  });

  visibleShipments = period === 'all'
    ? allShipments
    : allShipments.filter(s => s.date && s.date.startsWith(period));

  updateStats(visibleShipments);
  render();

  const label = period === 'all' ? 'Full Year 2025' : (MONTH_LABELS[period] || period);
  document.getElementById('sub-label').textContent =
    'King County Library System · ' + label;
}

document.querySelectorAll('.period-btn').forEach(btn => {
  btn.addEventListener('click', () => switchPeriod(btn.dataset.period));
});

// ── Tooltip ───────────────────────────────────────────────────────────────────

function showTooltip(info) {
  if (!info.object) {
    tooltip.style.display = 'none';
    return;
  }
  const d = info.object;
  document.getElementById('tt-company').textContent = d.recipient_company || '—';
  document.getElementById('tt-name').textContent    = d.recipient_name    || '';
  document.getElementById('tt-address').textContent = d.formatted_address || d.address || '—';
  document.getElementById('tt-date').textContent    = d.date              || '—';
  document.getElementById('tt-class').textContent   = d.mail_class        || '—';
  document.getElementById('tt-weight').textContent  = d.weight_lbs != null ? `${d.weight_lbs} lbs` : '—';

  tooltip.style.display = 'block';
  tooltip.style.left    = (info.x + 16) + 'px';
  tooltip.style.top     = (info.y + 16) + 'px';
}

// ── deck.gl initialisation ────────────────────────────────────────────────────

function initDeck() {
  deckInstance = new deck.DeckGL({
    container: 'map',
    mapStyle: {
      version: 8,
      sources: {
        carto: {
          type:        'raster',
          tiles:       ['https://basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png'],
          tileSize:    256,
          attribution: '© CARTO © OpenStreetMap contributors',
        },
      },
      layers: [{ id: 'bg', type: 'raster', source: 'carto' }],
    },
    mapLib: maplibregl,
    initialViewState: {
      longitude: -96,
      latitude:  40,
      zoom:      3.4,
      pitch:     40,
      bearing:   -10,
    },
    controller: { dragRotate: true },
    layers:     [],
    onHover:    showTooltip,
    getCursor:  ({ isHovering }) => isHovering ? 'pointer' : 'grab',
  });
}

// ── Data loading ──────────────────────────────────────────────────────────────

async function loadData() {
  const resp = await fetch('data/geocoded.json');
  if (!resp.ok) throw new Error(`HTTP ${resp.status} loading geocoded.json`);
  return resp.json();
}

// ── Slider controls ───────────────────────────────────────────────────────────

document.getElementById('arc-height').addEventListener('input', e => {
  arcHeight = parseFloat(e.target.value);
  document.getElementById('arc-height-val').textContent = arcHeight.toFixed(1);
  render();
});

document.getElementById('arc-width').addEventListener('input', e => {
  arcWidth = parseFloat(e.target.value);
  document.getElementById('arc-width-val').textContent = arcWidth.toFixed(1);
  render();
});

document.querySelectorAll('.tog-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tog-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    colorMode = btn.dataset.mode;
    renderLegend(colorMode, uniqueClasses);
    render();
  });
});

// ── Init ──────────────────────────────────────────────────────────────────────

window.addEventListener('load', async () => {
  if (typeof deck === 'undefined') {
    document.getElementById('loading').innerHTML =
      '<div style="color:#c84b2f;font-family:monospace;padding:40px;font-size:0.85rem;">' +
      'Error: deck.gl failed to load.</div>';
    return;
  }

  try {
    const data = await loadData();

    origin       = data.origin;
    allShipments = data.shipments.filter(s => s.lat !== null && s.lng !== null);
    uniqueClasses = [...new Set(allShipments.map(s => s.mail_class).filter(Boolean))].sort();

    // Start on full year
    visibleShipments = allShipments;
    updateStats(visibleShipments);
    renderLegend('weight', uniqueClasses);
    initDeck();
    render();

    document.getElementById('sub-label').textContent =
      'King County Library System · Full Year 2025';

    // Fade out loading overlay
    const loading = document.getElementById('loading');
    loading.classList.add('hidden');
    setTimeout(() => loading.remove(), 450);

  } catch (err) {
    document.getElementById('loading').innerHTML =
      `<div style="color:#c84b2f;font-family:monospace;padding:40px;font-size:0.85rem;max-width:500px;">
        <strong>Failed to load shipment data.</strong><br><br>
        ${err.message}<br><br>
        Ensure <code>data/geocoded.json</code> exists in the shippingArcs folder.
      </div>`;
  }
});
