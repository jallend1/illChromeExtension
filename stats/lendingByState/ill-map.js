// ill-map.js
// ─────────────────────────────────────────────────────────────────────────────
// ILL Lending Map — HeatmapLayer weighted by package count per destination.
// Two modes:
//   Static   — full period aggregated at once (default)
//   Animated — rolling window: re-aggregates each frame from shipments whose
//              date has been passed by currentTime, so hot spots bloom gradually
// ─────────────────────────────────────────────────────────────────────────────

// ── Shared state ──────────────────────────────────────────────────────────────

let deckInstance   = null;
let allShipments   = [];  // full geocoded dataset for the active period
let periodShipments = []; // period-filtered slice
let destPoints     = [];  // aggregated destination weights — drives both layers
let activePeriod   = 'all';
let viewMode       = 'static'; // 'static' | 'animated'

// Visual settings (shared between modes)
let intensity      = 3;
let radiusPx       = 40;

// Animation state
let currentTime    = 1;
let animSpeed      = 0.5;
let animMin        = 1;
let animMax        = 365;
let isPlaying      = false;
let rafHandle      = null;
let dataYear       = 2025;

const tooltip = document.getElementById('tooltip');

// ── Calendar helpers ──────────────────────────────────────────────────────────

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function dayToLabel(day, year) {
  const d = new Date(year, 0, Math.round(day));
  return `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;
}

// ── Data aggregation ──────────────────────────────────────────────────────────

/**
 * Aggregate an array of shipments into one weighted point per unique
 * destination. Returns an array ready for HeatmapLayer and ScatterplotLayer.
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

const HEATMAP_COLOR_RANGE = [
  [253, 230, 138, 120],
  [249, 166,  50, 180],
  [249, 115,  22, 210],
  [200,  75,  47, 240],
];

function buildHeatmapLayer() {
  return new deck.HeatmapLayer({
    id:           'heatmap',
    data:         destPoints,
    getPosition:  d => d.position,
    getWeight:    d => d.count,
    intensity,
    radiusPixels: radiusPx,
    colorRange:   HEATMAP_COLOR_RANGE,
    threshold:    0.02,
    aggregation:  'SUM',
    pickable:     false,
  });
}

function buildPickLayer() {
  return new deck.ScatterplotLayer({
    id:          'pick',
    data:        destPoints,
    getPosition: d => d.position,
    getRadius:   50000,
    radiusUnits: 'meters',
    opacity:     0,
    pickable:    true,
  });
}

function render() {
  if (!deckInstance) return;
  deckInstance.setProps({ layers: [buildHeatmapLayer(), buildPickLayer()] });
}

// ── Animation ─────────────────────────────────────────────────────────────────

/**
 * In animated mode, a shipment contributes to the heatmap once currentTime
 * has passed its day-of-year departure timestamp (waypoints[0].timestamp).
 * The heatmap therefore accumulates over time, hot spots growing as more
 * packages ship to busy destinations.
 */
function tickAggregate() {
  const departed = periodShipments.filter(
    s => s.waypoints && s.waypoints[0].timestamp <= currentTime
  );
  destPoints = aggregateDestinations(departed);
  updateStats(departed, destPoints);
}

function tick() {
  if (!isPlaying) return;
  currentTime += animSpeed * 0.3;
  if (currentTime > animMax) currentTime = animMin;
  document.getElementById('date-display').textContent = dayToLabel(currentTime, dataYear);
  tickAggregate();
  render();
  rafHandle = requestAnimationFrame(tick);
}

function startAnimation() {
  isPlaying = true;
  const btn = document.getElementById('play-pause');
  btn.classList.add('playing');
  btn.innerHTML = '&#9646;&#9646;';
  if (!rafHandle) rafHandle = requestAnimationFrame(tick);
}

function pauseAnimation() {
  isPlaying = false;
  const btn = document.getElementById('play-pause');
  btn.classList.remove('playing');
  btn.innerHTML = '&#9654;';
  if (rafHandle) { cancelAnimationFrame(rafHandle); rafHandle = null; }
}

// ── Mode toggle ───────────────────────────────────────────────────────────────

function switchToStatic() {
  viewMode = 'static';
  pauseAnimation();
  document.getElementById('controls-static').classList.remove('hidden');
  document.getElementById('controls-animated').classList.add('hidden');
  document.getElementById('animate-btn').textContent = 'Let\'s Get Animated';
  document.getElementById('animate-btn').classList.remove('is-animated');

  // Restore full period aggregation
  destPoints = aggregateDestinations(periodShipments);
  updateStats(periodShipments, destPoints);
  render();
}

function switchToAnimated() {
  viewMode = 'animated';
  document.getElementById('controls-animated').classList.remove('hidden');
  document.getElementById('controls-static').classList.add('hidden');
  document.getElementById('animate-btn').textContent = '« Static View';
  document.getElementById('animate-btn').classList.add('is-animated');

  // Reset to start of current period window
  currentTime = animMin;
  startAnimation();
}

document.getElementById('animate-btn').addEventListener('click', () => {
  viewMode === 'static' ? switchToAnimated() : switchToStatic();
});

// ── Period selector ───────────────────────────────────────────────────────────

const MONTH_LABELS = {
  '2025-01':'January 2025',   '2025-02':'February 2025',
  '2025-03':'March 2025',     '2025-04':'April 2025',
  '2025-05':'May 2025',       '2025-06':'June 2025',
  '2025-07':'July 2025',      '2025-08':'August 2025',
  '2025-09':'September 2025', '2025-10':'October 2025',
  '2025-11':'November 2025',  '2025-12':'December 2025',
};

const MONTH_DAY_RANGES = {
  '2025-01':[1,31],   '2025-02':[32,59],
  '2025-03':[60,90],  '2025-04':[91,120],
  '2025-05':[121,151],'2025-06':[152,181],
  '2025-07':[182,212],'2025-08':[213,243],
  '2025-09':[244,273],'2025-10':[274,304],
  '2025-11':[305,334],'2025-12':[335,365],
};

function switchPeriod(period) {
  activePeriod = period;

  document.querySelectorAll('.period-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.period === period);
  });

  periodShipments = period === 'all'
    ? allShipments
    : allShipments.filter(s => s.date && s.date.startsWith(period));

  if (period === 'all') {
    animMin = 1; animMax = 365;
  } else {
    [animMin, animMax] = MONTH_DAY_RANGES[period] || [1, 365];
  }
  currentTime = animMin;

  if (viewMode === 'static') {
    destPoints = aggregateDestinations(periodShipments);
    updateStats(periodShipments, destPoints);
    render();
  } else {
    // Animated: restart from period start
    pauseAnimation();
    startAnimation();
  }

  const label = period === 'all' ? 'Full Year 2025' : (MONTH_LABELS[period] || period);
  document.getElementById('sub-label').textContent =
    'King County Library System · ' + label;
}

document.querySelectorAll('.period-btn').forEach(btn => {
  btn.addEventListener('click', () => switchPeriod(btn.dataset.period));
});

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

// ── Controls ──────────────────────────────────────────────────────────────────

document.getElementById('intensity').addEventListener('input', e => {
  intensity = parseFloat(e.target.value);
  document.getElementById('intensity-val').textContent = intensity.toFixed(1);
  if (viewMode === 'static') render();
});

document.getElementById('radius').addEventListener('input', e => {
  radiusPx = parseInt(e.target.value);
  document.getElementById('radius-val').textContent = radiusPx;
  if (viewMode === 'static') render();
});

document.getElementById('intensity-anim').addEventListener('input', e => {
  intensity = parseFloat(e.target.value);
  document.getElementById('intensity-anim-val').textContent = intensity.toFixed(1);
  // render happens naturally via tick
});

document.getElementById('radius-anim').addEventListener('input', e => {
  radiusPx = parseInt(e.target.value);
  document.getElementById('radius-anim-val').textContent = radiusPx;
});

document.getElementById('anim-speed').addEventListener('input', e => {
  animSpeed = parseFloat(e.target.value);
  document.getElementById('speed-val').textContent = animSpeed.toFixed(1) + '×';
});

document.getElementById('play-pause').addEventListener('click', () => {
  isPlaying ? pauseAnimation() : startAnimation();
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

    dataYear        = data.year || 2025;
    allShipments    = data.shipments.filter(s => s.lat != null && s.lng != null);
    periodShipments = allShipments;
    destPoints      = aggregateDestinations(allShipments);

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
