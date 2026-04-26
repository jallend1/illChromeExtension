// shared.js
// ═══════════════════════════════════════════════════════════════════════════
// Common utilities shared across all KCLS ILL stats pages.
// Load this before any page-specific script.
// ═══════════════════════════════════════════════════════════════════════════

// ── Calendar constants & helpers ──────────────────────────────────────────────

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun',
                     'Jul','Aug','Sep','Oct','Nov','Dec'];

const MONTH_LABELS = {
  '2025-01': 'January 2025',    '2025-02': 'February 2025',
  '2025-03': 'March 2025',      '2025-04': 'April 2025',
  '2025-05': 'May 2025',        '2025-06': 'June 2025',
  '2025-07': 'July 2025',       '2025-08': 'August 2025',
  '2025-09': 'September 2025',  '2025-10': 'October 2025',
  '2025-11': 'November 2025',   '2025-12': 'December 2025',
};

const MONTH_DAY_RANGES = {
  '2025-01': [1,   31],  '2025-02': [32,  59],
  '2025-03': [60,  90],  '2025-04': [91,  120],
  '2025-05': [121, 151], '2025-06': [152, 181],
  '2025-07': [182, 212], '2025-08': [213, 243],
  '2025-09': [244, 273], '2025-10': [274, 304],
  '2025-11': [305, 334], '2025-12': [335, 365],
};

/**
 * Convert a fractional day-of-year (1-based) to a readable date string.
 * dayToLabel(32, 2025) → "Feb 1"
 */
function dayToLabel(day, year) {
  const d = new Date(year, 0, Math.round(day));
  return `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;
}

// ── Data loading ──────────────────────────────────────────────────────────────

/**
 * Load mail trips, courier trips, and geodata in parallel. Join coordinates
 * onto mail shipments, tag all records with their source, and return a merged
 * object:
 *   { origin, year, travel_days, shipments: [...] }
 *
 * Mail shipments get  source: 'mail'    if not already set.
 * Courier shipments get source: 'courier' (already set by format_courier_trips.py).
 * Courier trips file is optional — if it 404s it is silently skipped.
 *
 * @param {string} tripsPath         Relative path to trips_YYYY.json
 * @param {string} geodataPath       Relative path to geodata.json
 * @param {string} courierTripsPath  Relative path to trips_courier_YYYY.json
 */
async function loadShipmentData(
  tripsPath        = '../shippingArcs/data/trips_2025.json',
  geodataPath      = '../data/geodata.json',
  courierTripsPath = '../shippingArcs/data/trips_courier_2025.json'
) {
  // Fetch all three in parallel; courier is optional so we use allSettled
  const [tripsResp, geoResp, courierResp] = await Promise.all([
    fetch(tripsPath),
    fetch(geodataPath),
    fetch(courierTripsPath).catch(() => ({ ok: false })),
  ]);

  if (!tripsResp.ok) throw new Error(
    `HTTP ${tripsResp.status} loading ${tripsPath}. ` +
    `Ensure shippingArcs/data/trips_2025.json exists.`
  );
  if (!geoResp.ok) throw new Error(
    `HTTP ${geoResp.status} loading ${geodataPath}. ` +
    `Ensure stats/data/geodata.json exists.`
  );

  const [data, geodata] = await Promise.all([tripsResp.json(), geoResp.json()]);

  // Join coordinates onto mail shipments, tag source
  data.shipments = data.shipments.map(s => {
    const geo = geodata[s.address] || {};
    return {
      ...s,
      lat:               geo.lat               ?? s.lat               ?? null,
      lng:               geo.lng               ?? s.lng               ?? null,
      formatted_address: geo.formatted_address ?? s.formatted_address ?? null,
      source:            s.source              ?? 'mail',
    };
  });

  // Merge courier shipments if the file loaded successfully
  if (courierResp.ok) {
    const courierData = await courierResp.json();
    const courierShipments = (courierData.shipments || [])
      .filter(s => s.lat != null && s.lng != null);
    data.shipments = [...data.shipments, ...courierShipments];
    data.hasCourier = true;
  } else {
    data.hasCourier = false;
  }

  return data;
}

// ── Source filter ─────────────────────────────────────────────────────────────

/**
 * Filter a shipments array by source mode.
 * @param {Array}  shipments  Full shipment array
 * @param {string} mode       'all' | 'mail' | 'courier'
 */
function filterBySource(shipments, mode) {
  if (mode === 'all')     return shipments;
  if (mode === 'mail')    return shipments.filter(s => (s.source ?? 'mail') === 'mail');
  if (mode === 'courier') return shipments.filter(s => s.source === 'courier');
  return shipments;
}

/**
 * Wire up the three-state source toggle buttons.
 * Expects buttons with class .source-btn and data-source="all|mail|courier".
 *
 * @param {Function} onChange  Called with the new mode string when a button is clicked.
 */
function initSourceToggle(onChange) {
  document.querySelectorAll('.source-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.source-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      onChange(btn.dataset.source);
    });
  });
}

/**
 * Show or hide the source toggle panel depending on whether courier data loaded.
 * Call after data load with data.hasCourier.
 */
function setSourceToggleVisible(visible) {
  const panel = document.getElementById('source-toggle-panel');
  if (panel) panel.style.display = visible ? '' : 'none';
}

// ── Loading overlay ───────────────────────────────────────────────────────────

/**
 * Fade out and remove the #loading overlay element.
 */
function hideLoadingOverlay() {
  const el = document.getElementById('loading');
  if (!el) return;
  el.classList.add('hidden');
  setTimeout(() => el.remove(), 450);
}

/**
 * Replace the #loading overlay content with an error message.
 */
function showLoadingError(message) {
  const el = document.getElementById('loading');
  if (!el) return;
  el.innerHTML = `
    <div style="color:#c84b2f;font-family:monospace;padding:40px;
                font-size:0.85rem;max-width:500px;line-height:1.7;">
      <strong>Failed to load shipment data.</strong><br><br>
      ${message}
    </div>`;
}

// ── Period selector wiring ────────────────────────────────────────────────────

/**
 * Wire up the period selector buttons.
 *
 * @param {Function} onSwitch  Called with the selected period string
 *                             ('all' | '2025-01' … '2025-12') whenever
 *                             a button is clicked.
 */
function initPeriodSelector(onSwitch) {
  document.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', () => onSwitch(btn.dataset.period));
  });
}

/**
 * Update the active state of period buttons to match the given period.
 */
function setPeriodActive(period) {
  document.querySelectorAll('.period-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.period === period);
  });
}

/**
 * Update the #sub-label subtitle to reflect the selected period.
 */
function setPeriodLabel(period, prefix = 'King County Library System') {
  const label = period === 'all'
    ? 'Full Year 2025'
    : (MONTH_LABELS[period] || period);
  const el = document.getElementById('sub-label');
  if (el) el.textContent = `${prefix} · ${label}`;
}

// ── Animation helpers ─────────────────────────────────────────────────────────

/**
 * Wire up a standard play/pause button.
 * Returns an object with start() and pause() methods so the caller
 * can drive the animation loop itself.
 *
 * @param {Function} tickFn   Called each animation frame. Receives no args.
 *                            Should call requestAnimationFrame internally
 *                            only via the returned controls.
 */
function createAnimationControls(tickFn) {
  let isPlaying = false;
  let rafHandle = null;

  function frame() {
    if (!isPlaying) return;
    tickFn();
    rafHandle = requestAnimationFrame(frame);
  }

  function start() {
    if (isPlaying) return;
    isPlaying = true;
    const btn = document.getElementById('play-pause');
    if (btn) { btn.classList.add('playing'); btn.innerHTML = '&#9646;&#9646;'; }
    rafHandle = requestAnimationFrame(frame);
  }

  function pause() {
    isPlaying = false;
    const btn = document.getElementById('play-pause');
    if (btn) { btn.classList.remove('playing'); btn.innerHTML = '&#9654;'; }
    if (rafHandle) { cancelAnimationFrame(rafHandle); rafHandle = null; }
  }

  function toggle() { isPlaying ? pause() : start(); }

  // Wire the play/pause button if it exists
  const btn = document.getElementById('play-pause');
  if (btn) btn.addEventListener('click', toggle);

  return { start, pause, toggle, get isPlaying() { return isPlaying; } };
}

// ── Animate-mode toggle ───────────────────────────────────────────────────────

/**
 * Wire the "Let's Get Animated" header button.
 *
 * @param {Function} onStatic    Called when switching to static mode.
 * @param {Function} onAnimated  Called when switching to animated mode.
 */
function initAnimateToggle(onStatic, onAnimated) {
  let mode = 'static';

  const btn = document.getElementById('animate-btn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    if (mode === 'static') {
      mode = 'animated';
      btn.textContent = '« Static View';
      btn.classList.add('is-animated');
      document.getElementById('controls-static')?.classList.add('hidden');
      document.getElementById('controls-animated')?.classList.remove('hidden');
      onAnimated();
    } else {
      mode = 'static';
      btn.textContent = "Let's Get Animated";
      btn.classList.remove('is-animated');
      document.getElementById('controls-animated')?.classList.add('hidden');
      document.getElementById('controls-static')?.classList.remove('hidden');
      onStatic();
    }
  });
}

// ── Slider wiring helper ──────────────────────────────────────────────────────

/**
 * Wire a range input to a display span and a callback.
 *
 * @param {string}   inputId    ID of the <input type="range">
 * @param {string}   displayId  ID of the display <span>
 * @param {Function} format     value => string for the display
 * @param {Function} onChange   value => void called on input
 */
function initSlider(inputId, displayId, format, onChange) {
  const input   = document.getElementById(inputId);
  const display = document.getElementById(displayId);
  if (!input) return;

  input.addEventListener('input', () => {
    const val = parseFloat(input.value);
    if (display) display.textContent = format(val);
    onChange(val);
  });
}
