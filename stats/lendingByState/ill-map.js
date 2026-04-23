// ─────────────────────────────────────────────────────────────────────────────
// Application logic for the ILL Lending Map.
// ─────────────────────────────────────────────────────────────────────────────

const PALETTE = [
  [38, 198, 218], // teal
  [255, 213, 79], // amber
  [200, 75, 47], // terracotta
];

function lerp(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function triColor(t) {
  return t <= 0.5
    ? lerp(PALETTE[0], PALETTE[1], t * 2)
    : lerp(PALETTE[1], PALETTE[2], (t - 0.5) * 2);
}

function getColor(filled, maxFilled) {
  const t = maxFilled > 0 ? Math.sqrt(filled / maxFilled) : 0;
  return [...triColor(t), 220];
}

// ── Data helpers ──────────────────────────────────────────────────────────────

/**
 * Convert a raw state map ({ ST: [filled, received] }) into the array format
 * deck.gl expects, filtering out states without a known centroid or zero fills.
 */
function buildData(stateMap) {
  return Object.entries(stateMap)
    .filter(([abbr, arr]) => STATE_CENTROIDS[abbr] && arr[0] > 0)
    .map(([abbr, arr]) => ({
      position: [STATE_CENTROIDS[abbr][1], STATE_CENTROIDS[abbr][0]],
      state: abbr,
      filled: arr[0],
      received: arr[1],
    }));
}

/** Update the three header stat pills from a rendered data array. */
function updateStats(data) {
  const total = data.reduce((s, d) => s + d.filled, 0);
  const top = [...data].sort((a, b) => b.filled - a.filled)[0];

  document.getElementById("stat-filled").textContent = total.toLocaleString();
  document.getElementById("stat-states").textContent = data.length;
  document.getElementById("stat-top").textContent = top
    ? `${top.state} (${top.filled.toLocaleString()})`
    : "—";
}

// ── TSV parser ────────────────────────────────────────────────────────────────

/**
 * Parse a WorldShare Lender Detail TSV export.
 * Returns { byState: { ST: [filled, received] }, reportingPeriod: string }
 * or null if the expected header row is not found.
 */
function parseTSV(text) {
  const lines = text.split("\n");
  let headerIdx = -1;
  let reportingPeriod = "";

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("Reporting Period")) {
      reportingPeriod = lines[i].split("\t")[1]?.trim() || "";
    }
    if (lines[i].startsWith("Institution Name")) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) return null;

  const headers = lines[headerIdx].split("\t").map((h) => h.trim());
  const colState = headers.indexOf("Institution State");
  const colFilled = headers.indexOf("Requests Filled");
  const colReceived = headers.indexOf("Requests Received");
  const minCols = Math.max(colState, colFilled, colReceived) + 1;

  const byState = {};
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const row = lines[i].split("\t");
    if (row.length < minCols) continue;

    const state = row[colState]?.trim();
    const filled = parseInt(row[colFilled], 10) || 0;
    const received = parseInt(row[colReceived], 10) || 0;

    if (!state || state.length !== 2) continue;
    if (!byState[state]) byState[state] = [0, 0];
    byState[state][0] += filled;
    byState[state][1] += received;
  }

  return { byState, reportingPeriod };
}

// ── deck.gl state ─────────────────────────────────────────────────────────────

let deckInstance = null;
let currentData = [];
let heightScale = 1000;
let radiusM = 40000;

function buildLayer() {
  const maxFilled = Math.max(...currentData.map((d) => d.filled));

  return new deck.ColumnLayer({
    id: "columns",
    data: currentData,
    getPosition: (d) => d.position,
    getElevation: (d) => d.filled,
    elevationScale: heightScale,
    diskResolution: 24,
    radius: radiusM,
    extruded: true,
    pickable: true,
    getFillColor: (d) => getColor(d.filled, maxFilled),
    getLineColor: [255, 255, 255, 15],
    lineWidthMinPixels: 0,
    material: {
      ambient: 0.35,
      diffuse: 0.8,
      shininess: 32,
      specularColor: [60, 60, 60],
    },
    transitions: {
      getElevation: { duration: 500 },
      getFillColor: { duration: 400 },
    },
  });
}

function render() {
  if (!deckInstance) return;
  deckInstance.setProps({ layers: [buildLayer()] });
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

const tooltip = document.getElementById("tooltip");

function showTooltip(info) {
  if (!info.object) {
    tooltip.style.display = "none";
    return;
  }
  const d = info.object;
  const rate =
    d.received > 0 ? ((d.filled / d.received) * 100).toFixed(1) + "%" : "—";

  document.getElementById("tt-state").textContent =
    STATE_NAMES[d.state] || d.state;
  document.getElementById("tt-filled").textContent = d.filled.toLocaleString();
  document.getElementById("tt-received").textContent =
    d.received.toLocaleString();
  document.getElementById("tt-rate").textContent = rate;

  tooltip.style.display = "block";
  tooltip.style.left = info.x + 16 + "px";
  tooltip.style.top = info.y + 16 + "px";
}

// ── deck.gl initialisation ────────────────────────────────────────────────────

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
      pitch: 45,
      bearing: -10,
    },
    controller: { dragRotate: true },
    layers: [],
    onHover: showTooltip,
    getCursor: ({ isHovering }) => (isHovering ? "pointer" : "grab"),
  });
}

// ── Period selector ───────────────────────────────────────────────────────────

function switchPeriod(period) {
  document.querySelectorAll(".period-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.period === period);
  });

  const stateMap = period === "all" ? ALL_2025 : MONTHLY[period] || {};
  currentData = buildData(stateMap);
  updateStats(currentData);
  render();

  const label = period === "all" ? "Full Year 2025" : period;
  document.getElementById("sub-label").textContent =
    "King County Library System · " + label;
}

document.querySelectorAll(".period-btn").forEach((btn) => {
  btn.addEventListener("click", () => switchPeriod(btn.dataset.period));
});

// ── Slider controls ───────────────────────────────────────────────────────────

document.getElementById("height-scale").addEventListener("input", (e) => {
  heightScale = parseInt(e.target.value);
  document.getElementById("height-val").textContent =
    heightScale.toLocaleString();
  render();
});

document.getElementById("radius").addEventListener("input", (e) => {
  radiusM = parseInt(e.target.value);
  document.getElementById("radius-val").textContent =
    radiusM >= 1000 ? (radiusM / 1000).toFixed(0) + "k" : radiusM;
  render();
});

// ── File loader ───────────────────────────────────────────────────────────────

document.getElementById("file-input").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    const result = parseTSV(ev.target.result);
    if (!result) {
      alert(
        'Could not parse TSV — ensure the file contains an "Institution Name" header row.',
      );
      return;
    }

    // Deactivate all period buttons since we're showing ad-hoc data
    document
      .querySelectorAll(".period-btn")
      .forEach((b) => b.classList.remove("active"));

    currentData = buildData(result.byState);
    updateStats(currentData);
    render();

    const label = result.reportingPeriod || file.name;
    document.getElementById("sub-label").textContent =
      "King County Library System · " + label;
  };

  reader.readAsText(file);
});

// ── Initialisation ────────────────────────────────────────────────────────────

window.addEventListener("load", () => {
  if (typeof deck === "undefined") {
    document.getElementById("map").innerHTML =
      '<div style="color:#c84b2f;font-family:monospace;padding:40px;">' +
      "Error: deck.gl failed to load. Check your internet connection.</div>";
    return;
  }

  currentData = buildData(ALL_2025);
  updateStats(currentData);
  initDeck();
  render();

  document.getElementById("sub-label").textContent =
    "King County Library System · Full Year 2025";
});
