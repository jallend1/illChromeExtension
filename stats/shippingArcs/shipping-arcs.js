// shipping-arcs.js
// ─────────────────────────────────────────────────────────────────────────────
// ILL Shipping Arcs — page-specific logic.
// Depends on shared.js for: loadShipmentData, hideLoadingOverlay,
// showLoadingError, initPeriodSelector, setPeriodActive, setPeriodLabel,
// createAnimationControls, initAnimateToggle, initSlider,
// MONTH_DAY_RANGES, dayToLabel.
// ─────────────────────────────────────────────────────────────────────────────

// ── Color helpers ─────────────────────────────────────────────────────────────

const WEIGHT_PALETTE = [
  [38, 198, 218],
  [255, 213, 79],
  [200, 75, 47],
];

const CLASS_COLORS = {
  "Library Mail": [38, 198, 218],
  "Media Mail": [255, 213, 79],
  "Priority Mail": [200, 75, 47],
  "First-Class Mail": [129, 199, 132],
};

function lerp(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function weightColor(lbs) {
  const t = Math.min(Math.max((lbs - 1) / 2, 0), 1);
  return t <= 0.5
    ? lerp(WEIGHT_PALETTE[0], WEIGHT_PALETTE[1], t * 2)
    : lerp(WEIGHT_PALETTE[1], WEIGHT_PALETTE[2], (t - 0.5) * 2);
}

function getColor(d) {
  return [...weightColor(d.weight_lbs || 1), 200];
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

// ── State ─────────────────────────────────────────────────────────────────────

let deckInstance = null;
let origin = null;
let allShipments = [];
let visibleShipments = [];
let arcWidth = 1.5;
let arcHeight = 1;
let arcWidthAnim = 2;
let trailLength = 3;
let currentTime = 1;
let animSpeed = 0.1;
let animMin = 1;
let animMax = 365;
let dataYear = 2025;
let viewMode = "static";
let activePeriod = "all";
let sourceMode = "all"; // 'all' | 'mail' | 'courier'
let anim;

// ── Layers ────────────────────────────────────────────────────────────────────

function buildStaticLayer() {
  return new deck.ArcLayer({
    id: "arcs",
    data: visibleShipments,
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
    data: visibleShipments,
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
  deckInstance.setProps({
    layers: [viewMode === "static" ? buildStaticLayer() : buildAnimatedLayer()],
  });
}

// ── Animated stats ────────────────────────────────────────────────────────────

function updateAnimatedStats() {
  const departed = visibleShipments.filter(
    (s) => s.waypoints && s.waypoints[0].timestamp <= currentTime,
  );
  updateStats(departed);
}

// ── Animation tick ────────────────────────────────────────────────────────────

function tick() {
  currentTime += animSpeed * 0.3;
  if (currentTime > animMax + trailLength) currentTime = animMin;
  document.getElementById("date-display").textContent = dayToLabel(
    currentTime,
    dataYear,
  );
  updateAnimatedStats();
  render();
}

// ── Mode toggle ───────────────────────────────────────────────────────────────

function onStatic() {
  viewMode = "static";
  anim.pause();
  updateStats(visibleShipments);
  render();
}

function onAnimated() {
  viewMode = "animated";
  currentTime = animMin;
  anim.start();
}

// ── Period switching ──────────────────────────────────────────────────────────

function switchPeriod(period) {
  activePeriod = period;
  setPeriodActive(period);
  setPeriodLabel(period);

  visibleShipments = filterBySource(
    period === "all"
      ? allShipments
      : allShipments.filter((s) => s.date && s.date.startsWith(period)),
    sourceMode,
  );

  [animMin, animMax] =
    period === "all" ? [1, 365] : MONTH_DAY_RANGES[period] || [1, 365];
  currentTime = animMin;

  if (viewMode === "static") {
    updateStats(visibleShipments);
    render();
  } else {
    anim.pause();
    anim.start();
  }
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

const tooltip = document.getElementById("tooltip");

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

// ── Init ──────────────────────────────────────────────────────────────────────

window.addEventListener("load", async () => {
  if (typeof deck === "undefined") {
    showLoadingError("deck.gl failed to load.");
    return;
  }
  try {
    const data = await loadShipmentData(
      "data/trips_2025.json",
      "../data/geodata.json",
      "data/trips_courier_2025.json",
    );
    origin = data.origin;
    dataYear = data.year || 2025;
    allShipments = data.shipments.filter(
      (s) => s.lat && s.lng && (s.date || "").startsWith(String(dataYear)),
    );
    visibleShipments = allShipments;

    renderLegend();
    updateStats(visibleShipments);
    initDeck();
    render();
    setPeriodLabel("all");

    anim = createAnimationControls(tick);
    initAnimateToggle(onStatic, onAnimated);
    initPeriodSelector(switchPeriod);
    initSourceToggle((mode) => {
      sourceMode = mode;
      switchPeriod(activePeriod ?? "all");
    });
    setSourceToggleVisible(data.hasCourier);

    initSlider(
      "arc-width-static",
      "arc-width-static-val",
      (v) => v.toFixed(1),
      (v) => {
        arcWidth = v;
        if (viewMode === "static") render();
      },
    );
    initSlider(
      "arc-height",
      "arc-height-val",
      (v) => v.toFixed(1),
      (v) => {
        arcHeight = v;
        if (viewMode === "static") render();
      },
    );
    initSlider(
      "anim-speed",
      "speed-val",
      (v) => v.toFixed(1) + "×",
      (v) => {
        animSpeed = v;
      },
    );
    initSlider(
      "trail-length",
      "trail-val",
      (v) => String(Math.round(v)),
      (v) => {
        trailLength = v;
        if (viewMode === "animated") render();
      },
    );
    initSlider(
      "arc-width-anim",
      "arc-width-anim-val",
      (v) => v.toFixed(1),
      (v) => {
        arcWidthAnim = v;
        if (viewMode === "animated") render();
      },
    );

    hideLoadingOverlay();
  } catch (err) {
    showLoadingError(err.message);
  }
});
