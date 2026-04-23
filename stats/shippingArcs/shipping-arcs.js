// shipping-arcs.js
// ─────────────────────────────────────────────────────────────────────────────
// Renders KCLS outgoing ILL shipments as either:
//   • Static ArcLayer   (default) — loaded from data/geocoded.json
//   • Animated TripsLayer         — loaded from data/geocoded_trips.json
//
// The "Let's Get Animated" header button toggles between modes.
// Both modes share the same period selector, stats, legend, and tooltip.
// ─────────────────────────────────────────────────────────────────────────────

// ── Color helpers ─────────────────────────────────────────────────────────────

const WEIGHT_PALETTE = [
  [38, 198, 218], // teal       — 1 lb
  [255, 213, 79], // amber      — 2 lbs
  [200, 75, 47], // terracotta — 3+ lbs
];

const CLASS_COLORS = {
  "Library Mail": [38, 198, 218],
  "Media Mail": [255, 213, 79],
  "Priority Mail": [200, 75, 47],
  "First-Class Mail": [129, 199, 132],
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

function getColor(d) {
  const base =
    colorMode === "weight"
      ? weightColor(d.weight_lbs || 1)
      : classColor(d.mail_class);
  return [...base, 200];
}

// ── Legend ────────────────────────────────────────────────────────────────────

function renderLegend() {
  document.getElementById("legend-title").textContent = "Package Weight (lbs)";
  document.getElementById("legend-rows").innerHTML = [
    { label: "3+ lbs", color: WEIGHT_PALETTE[2] },
    { label: "2 lbs", color: WEIGHT_PALETTE[1] },
    { label: "1 lb", color: WEIGHT_PALETTE[0] },
  ]
    .map(
      (e) => `
    <div class="legend-row">
      <div class="swatch" style="background:rgb(${e.color.join(",")})"></div>
      <span>${e.label}</span>
    </div>`,
    )
    .join("");
}

// ── Stats ─────────────────────────────────────────────────────────────────────

function updateStats(shipments) {
  const destinations = new Set(
    shipments.map((s) => s.formatted_address || s.address),
  ).size;
  const totalWeight = shipments.reduce(
    (sum, s) => sum + (s.weight_lbs || 0),
    0,
  );
  const totalCost = shipments.reduce(
    (sum, s) => sum + (parseFloat(s.total_cost) || 0),
    0,
  );

  document.getElementById("stat-packages").textContent =
    shipments.length.toLocaleString();
  document.getElementById("stat-destinations").textContent =
    destinations.toLocaleString();
  document.getElementById("stat-weight").textContent =
    totalWeight.toLocaleString();
  document.getElementById("stat-cost").textContent =
    "$" +
    totalCost.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
}

// ── Calendar helpers ──────────────────────────────────────────────────────────

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function dayToLabel(day, year) {
  const d = new Date(year, 0, Math.round(day));
  return `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;
}

// ── Shared state ──────────────────────────────────────────────────────────────

let deckInstance = null;
let origin = null;
let colorMode = "weight";
let uniqueClasses = [];
let activePeriod = "all";
let viewMode = "static"; // 'static' | 'animated'

// Static-mode data
let staticAll = [];
let staticVisible = [];
let arcWidth = 1.5;
let arcHeight = 1;

// Animated-mode data
let tripsAll = [];
let tripsVisible = [];
let dataYear = 2025;
let travelDays = 15;
let trailLength = 3;
let arcWidthAnim = 2;
let currentTime = 1;
let animSpeed = 0.1;
let isPlaying = false;
let rafHandle = null;
let animMin = 1;
let animMax = 365;

const tooltip = document.getElementById("tooltip");

// ── Layer builders ────────────────────────────────────────────────────────────

function buildStaticLayer() {
  return new deck.ArcLayer({
    id: "arcs",
    data: staticVisible,
    getSourcePosition: () => [origin.lng, origin.lat],
    getTargetPosition: (d) => [d.lng, d.lat],
    getSourceColor: (d) => getColor(d),
    getTargetColor: (d) => getColor(d),
    getWidth: arcWidth,
    getHeight: arcHeight,
    pickable: true,
    autoHighlight: true,
    highlightColor: [255, 255, 255, 50],
  });
}

function buildAnimatedLayer() {
  return new deck.TripsLayer({
    id: "trips",
    data: tripsVisible,
    getPath: (d) => d.waypoints.map((w) => w.coordinates),
    getTimestamps: (d) => d.waypoints.map((w) => w.timestamp),
    getColor: (d) => getColor(d),
    widthMinPixels: arcWidthAnim,
    currentTime,
    trailLength,
    capRounded: true,
    jointRounded: true,
    pickable: true,
  });
}

function render() {
  if (!deckInstance) return;
  const layer =
    viewMode === "static" ? buildStaticLayer() : buildAnimatedLayer();
  deckInstance.setProps({ layers: [layer] });
}

// ── Animated stats (running totals keyed to currentTime) ─────────────────────

function updateAnimatedStats() {
  // A shipment is "sent" once currentTime has passed its departure timestamp
  const departed = tripsVisible.filter(
    (s) => s.waypoints[0].timestamp <= currentTime,
  );

  const destinations = new Set(
    departed.map((s) => s.formatted_address || s.address),
  ).size;
  const totalWeight = departed.reduce((sum, s) => sum + (s.weight_lbs || 0), 0);
  const totalCost = departed.reduce(
    (sum, s) => sum + (parseFloat(s.total_cost) || 0),
    0,
  );

  document.getElementById("stat-packages").textContent =
    departed.length.toLocaleString();
  document.getElementById("stat-destinations").textContent =
    destinations.toLocaleString();
  document.getElementById("stat-weight").textContent =
    totalWeight.toLocaleString();
  document.getElementById("stat-cost").textContent =
    "$" +
    totalCost.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
}

// ── Animation loop ────────────────────────────────────────────────────────────

function tick() {
  if (!isPlaying) return;
  currentTime += animSpeed * 0.3;
  if (currentTime > animMax + trailLength) {
    currentTime = animMin;
  }
  document.getElementById("date-display").textContent = dayToLabel(
    currentTime,
    dataYear,
  );
  updateAnimatedStats();
  render();
  rafHandle = requestAnimationFrame(tick);
}

function startAnimation() {
  isPlaying = true;
  const btn = document.getElementById("play-pause");
  btn.classList.add("playing");
  btn.innerHTML = "&#9646;&#9646;";
  if (!rafHandle) rafHandle = requestAnimationFrame(tick);
}

function pauseAnimation() {
  isPlaying = false;
  const btn = document.getElementById("play-pause");
  btn.classList.remove("playing");
  btn.innerHTML = "&#9654;";
  if (rafHandle) {
    cancelAnimationFrame(rafHandle);
    rafHandle = null;
  }
}

// ── Period selector ───────────────────────────────────────────────────────────

const MONTH_LABELS = {
  "2025-01": "January 2025",
  "2025-02": "February 2025",
  "2025-03": "March 2025",
  "2025-04": "April 2025",
  "2025-05": "May 2025",
  "2025-06": "June 2025",
  "2025-07": "July 2025",
  "2025-08": "August 2025",
  "2025-09": "September 2025",
  "2025-10": "October 2025",
  "2025-11": "November 2025",
  "2025-12": "December 2025",
};

const MONTH_DAY_RANGES = {
  "2025-01": [1, 31],
  "2025-02": [32, 59],
  "2025-03": [60, 90],
  "2025-04": [91, 120],
  "2025-05": [121, 151],
  "2025-06": [152, 181],
  "2025-07": [182, 212],
  "2025-08": [213, 243],
  "2025-09": [244, 273],
  "2025-10": [274, 304],
  "2025-11": [305, 334],
  "2025-12": [335, 365],
};

function switchPeriod(period) {
  activePeriod = period;

  document.querySelectorAll(".period-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.period === period);
  });

  // Filter both datasets so switching modes mid-period stays consistent
  staticVisible =
    period === "all"
      ? staticAll
      : staticAll.filter((s) => s.date && s.date.startsWith(period));

  tripsVisible =
    period === "all"
      ? tripsAll
      : tripsAll.filter((s) => s.date && s.date.startsWith(period));

  // Animation window
  if (period === "all") {
    animMin = 1;
    animMax = 365;
  } else {
    [animMin, animMax] = MONTH_DAY_RANGES[period] || [1, 365];
  }
  currentTime = animMin;

  // Stats always reflect the current visible slice regardless of mode
  updateStats(viewMode === "static" ? staticVisible : tripsVisible);
  render();

  const label =
    period === "all" ? "Full Year 2025" : MONTH_LABELS[period] || period;
  document.getElementById("sub-label").textContent =
    "King County Library System · " + label;
}

document.querySelectorAll(".period-btn").forEach((btn) => {
  btn.addEventListener("click", () => switchPeriod(btn.dataset.period));
});

// ── Mode toggle ───────────────────────────────────────────────────────────────

function switchToStatic() {
  viewMode = "static";
  pauseAnimation();

  document.getElementById("controls-static").classList.remove("hidden");
  document.getElementById("controls-animated").classList.add("hidden");
  document.getElementById("animate-btn").textContent = "Let's Get Animated";
  document.getElementById("animate-btn").classList.remove("is-animated");

  updateStats(staticVisible);
  render();
}
function switchToAnimated() {
  viewMode = "animated";
  currentTime = animMin;

  document.getElementById("controls-animated").classList.remove("hidden");
  document.getElementById("controls-static").classList.add("hidden");
  document.getElementById("animate-btn").textContent = "« Static View";
  document.getElementById("animate-btn").classList.add("is-animated");

  updateStats(tripsVisible);
  startAnimation();
  render();
}

document.getElementById("animate-btn").addEventListener("click", () => {
  viewMode === "static" ? switchToAnimated() : switchToStatic();
});

// ── Tooltip ───────────────────────────────────────────────────────────────────

function showTooltip(info) {
  if (!info.object) {
    tooltip.style.display = "none";
    return;
  }
  const d = info.object;
  document.getElementById("tt-company").textContent =
    d.recipient_company || "—";
  document.getElementById("tt-name").textContent = d.recipient_name || "";
  document.getElementById("tt-address").textContent =
    d.formatted_address || d.address || "—";
  document.getElementById("tt-date").textContent = d.date || "—";
  document.getElementById("tt-class").textContent = d.mail_class || "—";
  document.getElementById("tt-weight").textContent =
    d.weight_lbs != null ? `${d.weight_lbs} lbs` : "—";
  tooltip.style.display = "block";
  tooltip.style.left = info.x + 16 + "px";
  tooltip.style.top = info.y + 16 + "px";
}

// ── deck.gl init ──────────────────────────────────────────────────────────────

function initDeck() {
  deckInstance = new deck.DeckGL({
    container: "map",
    mapStyle: {
      version: 8,
      sources: {
        carto: {
          type: "raster",
          tiles: [
            "https://basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png",
          ],
          tileSize: 256,
          attribution: "© CARTO © OpenStreetMap contributors",
        },
      },
      layers: [{ id: "bg", type: "raster", source: "carto" }],
    },
    mapLib: maplibregl,
    initialViewState: {
      longitude: -96,
      latitude: 40,
      zoom: 3.4,
      pitch: 40,
      bearing: -10,
    },
    controller: { dragRotate: true },
    layers: [],
    onHover: showTooltip,
    getCursor: ({ isHovering }) => (isHovering ? "pointer" : "grab"),
  });
}

// ── Static controls ───────────────────────────────────────────────────────────

document.getElementById("arc-width-static").addEventListener("input", (e) => {
  arcWidth = parseFloat(e.target.value);
  document.getElementById("arc-width-static-val").textContent =
    arcWidth.toFixed(1);
  if (viewMode === "static") render();
});

document.getElementById("arc-height").addEventListener("input", (e) => {
  arcHeight = parseFloat(e.target.value);
  document.getElementById("arc-height-val").textContent = arcHeight.toFixed(1);
  if (viewMode === "static") render();
});

// ── Animated controls ─────────────────────────────────────────────────────────

document.getElementById("play-pause").addEventListener("click", () => {
  isPlaying ? pauseAnimation() : startAnimation();
});

document.getElementById("anim-speed").addEventListener("input", (e) => {
  animSpeed = parseFloat(e.target.value);
  document.getElementById("speed-val").textContent = animSpeed.toFixed(1) + "×";
});

document.getElementById("trail-length").addEventListener("input", (e) => {
  trailLength = parseInt(e.target.value);
  document.getElementById("trail-val").textContent = trailLength;
  if (viewMode === "animated") render();
});

document.getElementById("arc-width-anim").addEventListener("input", (e) => {
  arcWidthAnim = parseFloat(e.target.value);
  document.getElementById("arc-width-anim-val").textContent =
    arcWidthAnim.toFixed(1);
  if (viewMode === "animated") render();
});

// ── Data loading ──────────────────────────────────────────────────────────────

async function loadJSON(path) {
  const resp = await fetch(path);
  if (!resp.ok) throw new Error(`HTTP ${resp.status} loading ${path}`);
  return resp.json();
}

// ── Init ──────────────────────────────────────────────────────────────────────

window.addEventListener("load", async () => {
  if (typeof deck === "undefined") {
    document.getElementById("loading").innerHTML =
      '<div style="color:#c84b2f;font-family:monospace;padding:40px;font-size:0.85rem;">' +
      "Error: deck.gl failed to load.</div>";
    return;
  }

  try {
    const data = await loadJSON("data/geocoded_trips.json");

    origin = data.origin;
    dataYear = data.year || 2025;
    travelDays = data.travel_days || 15;
    // trailLength stays at its coded default (3) — do not sync from travelDays

    // Both modes draw from the same dataset — static layer uses lat/lng/
    // metadata directly; animated layer uses the waypoints array.
    staticAll = data.shipments.filter((s) => s.lat && s.lng);
    tripsAll = staticAll;
    staticVisible = staticAll;
    tripsVisible = tripsAll;

    uniqueClasses = [
      ...new Set(staticAll.map((s) => s.mail_class).filter(Boolean)),
    ].sort();

    updateStats(staticVisible);
    renderLegend();
    initDeck();
    render();

    document.getElementById("sub-label").textContent =
      "King County Library System · Full Year 2025";

    const loading = document.getElementById("loading");
    loading.classList.add("hidden");
    setTimeout(() => loading.remove(), 450);
  } catch (err) {
    document.getElementById("loading").innerHTML =
      `<div style="color:#c84b2f;font-family:monospace;padding:40px;font-size:0.85rem;max-width:500px;">
        <strong>Failed to load shipment data.</strong><br><br>
        ${err.message}<br><br>
        Ensure <code>data/geocoded_trips.json</code> exists in the shippingArcs folder.
        Run <code>format_trips.py</code> to generate it from <code>geocoded.json</code>.
      </div>`;
  }
});
