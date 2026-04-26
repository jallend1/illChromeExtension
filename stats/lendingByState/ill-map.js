// ill-map.js
// ─────────────────────────────────────────────────────────────────────────────
// ILL Shipping Heatmap — page-specific logic.
// Depends on shared.js for: loadShipmentData, hideLoadingOverlay,
// showLoadingError, initPeriodSelector, setPeriodActive, setPeriodLabel,
// createAnimationControls, initAnimateToggle, initSlider,
// MONTH_DAY_RANGES, dayToLabel.
// ─────────────────────────────────────────────────────────────────────────────

// ── State ─────────────────────────────────────────────────────────────────────

let deckInstance    = null;
let allShipments    = [];
let periodShipments = [];
let destPoints      = [];
let activePeriod    = 'all';
let viewMode        = 'static';
let intensity       = 3;
let radiusPx        = 40;
let currentTime     = 1;
let animSpeed       = 0.5;
let animMin         = 1;
let animMax         = 365;
let dataYear        = 2025;
let sourceMode      = 'all'; // 'all' | 'mail' | 'courier'

let anim; // animation controls from shared.js

// ── Data aggregation ──────────────────────────────────────────────────────────

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
    ? `${top.recipient_company || top.address} (${top.count})` : '—';
}

// ── Layers ────────────────────────────────────────────────────────────────────

const HEATMAP_COLOR_RANGE = [
  [253, 230, 138, 120],
  [249, 166,  50, 180],
  [249, 115,  22, 210],
  [200,  75,  47, 240],
];

function buildHeatmapLayer() {
  return new deck.HeatmapLayer({
    id: 'heatmap', data: destPoints,
    getPosition: d => d.position,
    getWeight:   d => d.count,
    intensity, radiusPixels: radiusPx,
    colorRange: HEATMAP_COLOR_RANGE,
    threshold: 0.02, aggregation: 'SUM', pickable: false,
  });
}

function buildPickLayer() {
  return new deck.ScatterplotLayer({
    id: 'pick', data: destPoints,
    getPosition: d => d.position,
    getRadius: 50000, radiusUnits: 'meters',
    opacity: 0, pickable: true,
  });
}

function render() {
  if (!deckInstance) return;
  deckInstance.setProps({ layers: [buildHeatmapLayer(), buildPickLayer()] });
}

// ── Animation tick ────────────────────────────────────────────────────────────

function tick() {
  currentTime += animSpeed * 0.3;
  if (currentTime > animMax) currentTime = animMin;
  document.getElementById('date-display').textContent = dayToLabel(currentTime, dataYear);
  const departed = periodShipments.filter(
    s => s.waypoints && s.waypoints[0].timestamp <= currentTime
  );
  destPoints = aggregateDestinations(departed);
  updateStats(departed, destPoints);
  render();
}

// ── Mode toggle ───────────────────────────────────────────────────────────────

function onStatic() {
  viewMode = 'static';
  destPoints = aggregateDestinations(periodShipments);
  updateStats(periodShipments, destPoints);
  render();
}

function onAnimated() {
  viewMode = 'animated';
  currentTime = animMin;
  anim.start();
}

// ── Period switching ──────────────────────────────────────────────────────────

function switchPeriod(period) {
  activePeriod = period;
  setPeriodActive(period);
  setPeriodLabel(period);

  periodShipments = filterBySource(
    period === 'all'
      ? allShipments
      : allShipments.filter(s => s.date && s.date.startsWith(period)),
    sourceMode
  );

  [animMin, animMax] = period === 'all'
    ? [1, 365]
    : (MONTH_DAY_RANGES[period] || [1, 365]);
  currentTime = animMin;

  if (viewMode === 'static') {
    destPoints = aggregateDestinations(periodShipments);
    updateStats(periodShipments, destPoints);
    render();
  } else {
    anim.pause();
    anim.start();
  }
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

const tooltip = document.getElementById('tooltip');

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
      sources: { carto: { type: 'raster',
        tiles: ['https://basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png'],
        tileSize: 256, attribution: '© CARTO © OpenStreetMap contributors' } },
      layers: [{ id: 'bg', type: 'raster', source: 'carto' }],
    },
    mapLib: maplibregl,
    initialViewState: { longitude: -96, latitude: 40, zoom: 3.8, pitch: 0, bearing: 0 },
    controller: true, layers: [],
    onHover: showTooltip,
    getCursor: ({ isHovering }) => isHovering ? 'crosshair' : 'grab',
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────

window.addEventListener('load', async () => {
  if (typeof deck === 'undefined') {
    showLoadingError('deck.gl failed to load.');
    return;
  }
  try {
    const data   = await loadShipmentData(
      '../shippingArcs/data/trips_2025.json',
      '../data/geodata.json',
      '../shippingArcs/data/trips_courier_2025.json'
    );
    dataYear     = data.year || 2025;
    allShipments = data.shipments.filter(s =>
      s.lat != null && s.lng != null &&
      (s.date || '').startsWith(String(dataYear))
    );
    periodShipments = allShipments;
    destPoints   = aggregateDestinations(allShipments);

    updateStats(allShipments, destPoints);
    initDeck();
    render();
    setPeriodLabel('all');

    anim = createAnimationControls(tick);
    initAnimateToggle(onStatic, onAnimated);
    initPeriodSelector(switchPeriod);
    initSourceToggle(mode => {
      sourceMode = mode;
      switchPeriod(activePeriod);
    });
    setSourceToggleVisible(data.hasCourier);

    initSlider('intensity',      'intensity-val',      v => v.toFixed(1),        v => { intensity = v; if (viewMode === 'static') render(); });
    initSlider('radius',         'radius-val',         v => String(Math.round(v)),v => { radiusPx = v;  if (viewMode === 'static') render(); });
    initSlider('intensity-anim', 'intensity-anim-val', v => v.toFixed(1),        v => { intensity = v; });
    initSlider('radius-anim',    'radius-anim-val',    v => String(Math.round(v)),v => { radiusPx = v;  });
    initSlider('anim-speed',     'speed-val',          v => v.toFixed(1) + '×',  v => { animSpeed = v; });

    hideLoadingOverlay();
  } catch (err) {
    showLoadingError(err.message);
  }
});
