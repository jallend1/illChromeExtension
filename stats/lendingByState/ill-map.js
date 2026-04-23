// ill-map.js
// ─────────────────────────────────────────────────────────────────────────────
// ILL Lending Map — HeatmapLayer weighted by package count per destination.
// Reads data from ../shippingArcs/data/geocoded_trips.json so both maps
// share a single source of truth.
//
// Two layers run simultaneously:
//   1. HeatmapLayer  — visual density, not pickable
//   2. ScatterplotLayer (opacity 0) — invisible but pickable, drives tooltip
// ─────────────────────────────────────────────────────────────────────────────

// ── State ─────────────────────────────────────────────────────────────────────

let deckInstance  = null;
let allShipments  = [];   // full geocoded dataset
let destPoints    = [];   // aggregated: one point per unique destination
let intensity     = 3;
let radiusPx      = 40;
let activePeriod  = 'all';

const tooltip = document.getElementById('tooltip');

// ── Data aggregation ──────────────────────────────────────────────────────────

/**
 * Aggregate shipments into one record per unique destination (by formatted
 * address), summing package counts. Returns an array ready for both layers.
 */
function aggregateDestinations(shipments) {
  const map = new Map();

  for (const s of shipments) {
    const key = s.formatted_address || s.address;
    if (!key || s.lat == null || s.lng == null) continue;

    if (map.has(key)) {
      map.get(key).count += 1;
    } else {
      map.set(key, {
        position:          [s.lng, s.lat],
        address:           key,
        recipient_company: s.recipient_company || '',
        recipient_name:    s.recipient_name    || '',
        count:             1,
      });
    }
  }

  return Array.from(map.values());
}

// ── Stats ─────────────────────────────────────────────────────────────────────

function updateStats(shipments, points) {
  const top = [...points].sort((a, b) => b.count - a.count)[0];
  document.getElementById('stat-packages').textContent     = shipments.length.toLocaleString();
  document.getElementById('stat-destinations').textContent = points.length.toLocaleString();
  document.getElementById('stat-top').textContent          = top
    ? `${top.recipient_company || top.address} (${top.count})`
    : '—';
}

// ── Layer builders ────────────────────────────────────────────────────────────

function buildHeatmapLayer() {
  return new deck.HeatmapLayer({
    id:           'heatmap',
    data:         destPoints,
    getPosition:  d => d.position,
    getWeight:    d => d.count,
    intensity,
    radiusPixels: radiusPx,
    colorRange: [
      [253, 230, 138, 120],  // pale amber    — sparse
      [249, 166,  50, 180],  // orange
      [249, 115,  22, 210],  // deep orange
      [200,  75,  47, 240],  // terracotta    — dense
    ],
    threshold:   0.02,
    aggregation: 'SUM',
    pickable:    false,
  });
}

function buildPickLayer() {
  return new deck.ScatterplotLayer({
    id:          'pick',
    data:        destPoints,
    getPosition: d => d.position,
    getRadius:   50000,       // ~50 km catch radius
    radiusUnits: 'meters',
    opacity:     0,
    pickable:    true,
  });
}

function render() {
  if (!deckInstance) return;
  deckInstance.setProps({ layers: [buildHeatmapLayer(), buildPickLayer()] });
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

function showTooltip(info) {
  if (!info.object) { tooltip.style.display = 'none'; return; }
  const d = info.object;
  document.getElementById('tt-company').textContent  = d.recipient_company || d.address;
  document.getElementById('tt-name').textContent     = d.recipient_name    || '';
  document.getElementById('tt-packages').textContent = d.count.toLocaleString();
  document.getElementById('tt-address').textContent  = d.address;
  tooltip.style.display = 'block';
  tooltip.style.left    = (info.x + 16) + 'px';
  tooltip.style.top     = (info.y + 16) + 'px';
}

// ── deck.gl init ──────────────────────────────────────────────────────────────

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
      zoom:      3.8,
      pitch:     0,
      bearing:   0,
    },
    controller: true,
    layers:     [],
    onHover:    showTooltip,
    getCursor:  ({ isHovering }) => isHovering ? 'crosshair' : 'grab',
  });
}

// ── Period selector ───────────────────────────────────────────────────────────

const MONTH_LABELS = {
  '2025-01':'January 2025',   '2025-02':'February 2025',
  '2025-03':'March 2025',     '2025-04':'April 2025',
  '2025-05':'May 2025',       '2025-06':'June 2025',
  '2025-07':'July 2025',      '2025-08':'August 2025',
  '2025-09':'September 2025', '2025-10':'October 2025',
  '2025-11':'November 2025',  '2025-12':'December 2025',
};

function switchPeriod(period) {
  activePeriod = period;

  document.querySelectorAll('.period-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.period === period);
  });

  const filtered = period === 'all'
    ? allShipments
    : allShipments.filter(s => s.date && s.date.startsWith(period));

  destPoints = aggregateDestinations(filtered);
  updateStats(filtered, destPoints);
  render();

  const label = period === 'all' ? 'Full Year 2025' : (MONTH_LABELS[period] || period);
  document.getElementById('sub-label').textContent =
    'King County Library System · ' + label;
}

document.querySelectorAll('.period-btn').forEach(btn => {
  btn.addEventListener('click', () => switchPeriod(btn.dataset.period));
});

// ── Controls ──────────────────────────────────────────────────────────────────

document.getElementById('intensity').addEventListener('input', e => {
  intensity = parseFloat(e.target.value);
  document.getElementById('intensity-val').textContent = intensity.toFixed(1);
  render();
});

document.getElementById('radius').addEventListener('input', e => {
  radiusPx = parseInt(e.target.value);
  document.getElementById('radius-val').textContent = radiusPx;
  render();
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
    const resp = await fetch('../shippingArcs/data/geocoded_trips.json');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    allShipments = data.shipments.filter(s => s.lat != null && s.lng != null);
    destPoints   = aggregateDestinations(allShipments);

    updateStats(allShipments, destPoints);
    initDeck();
    render();

    document.getElementById('sub-label').textContent =
      'King County Library System · Full Year 2025';

    const loading = document.getElementById('loading');
    loading.classList.add('hidden');
    setTimeout(() => loading.remove(), 450);

  } catch (err) {
    document.getElementById('loading').innerHTML =
      `<div style="color:#c84b2f;font-family:monospace;padding:40px;font-size:0.85rem;max-width:500px;">
        <strong>Failed to load shipment data.</strong><br><br>
        ${err.message}<br><br>
        Ensure <code>shippingArcs/data/geocoded_trips.json</code> exists.
      </div>`;
  }
});
