// dashboard.js
// ─────────────────────────────────────────────────────────────────────────────
// KCLS ILL Dashboard — D3 v7 charts from geocoded_trips.json.
// Depends on shared.js for: loadShipmentData, hideLoadingOverlay,
// showLoadingError.
// ─────────────────────────────────────────────────────────────────────────────

// ── Design tokens ─────────────────────────────────────────────────────────────

const C = {
  teal:   '#26c6da',
  amber:  '#ffd54f',
  accent: '#c84b2f',
  green:  '#81c784',
  purple: '#9575cd',
  orange: '#f97316',
  muted:  'rgba(245,240,232,0.45)',
  faint:  'rgba(245,240,232,0.12)',
  paper:  '#f5f0e8',
};

const CLASS_COLOR = {
  'Library Mail':                              C.teal,
  "First Pkg Int'l":                           C.amber,
  'Priority Mail':                             C.accent,
  "First In'l Pkg":                            C.green,
  "Priority Int'l":                            C.purple,
  'Ground':                                    C.orange,
  'USPS Ground':                               '#a78bfa',
  'First-Class Package International Service': '#fb7185',
  "FirstPkg Int'l":                            '#34d399',
};

// ── Shared D3 tooltip ─────────────────────────────────────────────────────────

const tipEl = document.createElement('div');
tipEl.className = 'd3-tooltip';
tipEl.style.display = 'none';
document.body.appendChild(tipEl);

function showTip(html, event) {
  tipEl.innerHTML = html;
  tipEl.style.display = 'block';
  const x  = event.clientX + 14;
  const vw = window.innerWidth;
  tipEl.style.left = (x + tipEl.offsetWidth > vw ? x - tipEl.offsetWidth - 28 : x) + 'px';
  tipEl.style.top  = (event.clientY - 10) + 'px';
}

function hideTip() { tipEl.style.display = 'none'; }

// ── Data preparation ──────────────────────────────────────────────────────────

function prepareData(shipments) {
  const MONTHS = ['2025-01','2025-02','2025-03','2025-04','2025-05','2025-06',
                  '2025-07','2025-08','2025-09','2025-10','2025-11','2025-12'];

  // Monthly
  const monthMap = Object.fromEntries(
    MONTHS.map(m => [m, { month: m, packages: 0, cost: 0, lbs: 0 }])
  );
  for (const s of shipments) {
    const m = (s.date || '').slice(0, 7);
    if (!monthMap[m]) continue;
    monthMap[m].packages += 1;
    monthMap[m].cost     += parseFloat(s.total_cost || 0);
    monthMap[m].lbs      += parseFloat(s.weight_lbs || 0);
  }
  const monthly = MONTHS.map(m => monthMap[m]);

  // Mail class
  const classMap = {};
  for (const s of shipments) {
    const c = s.mail_class || 'Unknown';
    classMap[c] = (classMap[c] || 0) + 1;
  }
  const byClass = Object.entries(classMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Weight
  const wtMap = {};
  for (const s of shipments) {
    const w = s.weight_lbs;
    if (w == null) continue;
    const key = w >= 6 ? '6+' : String(w);
    wtMap[key] = (wtMap[key] || 0) + 1;
  }
  const byWeight = ['1','2','3','4','5','6+']
    .filter(k => wtMap[k])
    .map(k => ({ label: k === '6+' ? '6+ lbs' : `${k} lb${k === '1' ? '' : 's'}`, count: wtMap[k] }));

  // States
  const stateMap = {};
  for (const s of shipments) {
    if (s.country !== 'US') continue;
    const m = (s.formatted_address || '').match(/,\s([A-Z]{2})\s+\d{5}/);
    if (!m) continue;
    stateMap[m[1]] = (stateMap[m[1]] || 0) + 1;
  }
  const byState = Object.entries(stateMap)
    .map(([state, count]) => ({ state, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  // Libraries by count — keyed by formatted_address (same as heatmap) so
  // counts match exactly; company name stored separately for display.
  const libMap = {};
  for (const s of shipments) {
    const key  = s.formatted_address || s.address;
    const name = s.recipient_company || s.recipient_name || key;
    if (!key) continue;
    if (!libMap[key]) libMap[key] = { name, count: 0 };
    libMap[key].count += 1;
  }
  const byLibrary = Object.values(libMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  // Libraries by weight — same address-keyed approach
  const libWtMap = {};
  for (const s of shipments) {
    const key  = s.formatted_address || s.address;
    const name = s.recipient_company || s.recipient_name || key;
    if (!key) continue;
    if (!libWtMap[key]) libWtMap[key] = { name, packages: 0, lbs: 0 };
    libWtMap[key].packages += 1;
    libWtMap[key].lbs      += parseFloat(s.weight_lbs || 0);
  }
  const byLibraryWeight = Object.values(libWtMap)
    .map(d => ({ ...d, avgLbs: d.packages > 0 ? d.lbs / d.packages : 0 }))
    .sort((a, b) => b.lbs - a.lbs)
    .slice(0, 15);

  return { monthly, byClass, byWeight, byState, byLibrary, byLibraryWeight };
}

// ── Header stats ──────────────────────────────────────────────────────────────

function renderHeaderStats(shipments) {
  const cost  = shipments.reduce((s, r) => s + parseFloat(r.total_cost || 0), 0);
  const lbs   = shipments.reduce((s, r) => s + parseFloat(r.weight_lbs || 0), 0);
  const dests = new Set(shipments.map(r => r.formatted_address || r.address).filter(Boolean)).size;
  document.getElementById('stat-total-pkgs').textContent   = shipments.length.toLocaleString();
  document.getElementById('stat-total-cost').textContent   =
    '$' + cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  document.getElementById('stat-total-lbs').textContent    = lbs.toLocaleString();
  document.getElementById('stat-destinations').textContent = dests.toLocaleString();
}

// ── Chart helpers ─────────────────────────────────────────────────────────────

function rankColorScale(length) {
  return d3.scaleSequential()
    .domain([0, length - 1])
    .interpolator(d3.interpolateRgb(C.accent, C.teal));
}

// ── Chart 1: Monthly packages + cost ─────────────────────────────────────────

function renderMonthly(data) {
  const el = document.getElementById('chart-monthly');
  const W = el.clientWidth || 900, H = 240;
  const m = { top: 20, right: 60, bottom: 40, left: 50 };
  const iW = W - m.left - m.right, iH = H - m.top - m.bottom;
  const LABELS = MONTH_SHORT; // from shared.js

  const svg = d3.select('#chart-monthly').append('svg').attr('width', W).attr('height', H);
  const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`);

  const x  = d3.scaleBand().domain(data.map(d => d.month)).range([0, iW]).padding(0.3);
  const yP = d3.scaleLinear().domain([0, d3.max(data, d => d.packages) * 1.15]).range([iH, 0]);
  const yC = d3.scaleLinear().domain([0, d3.max(data, d => d.cost)     * 1.15]).range([iH, 0]);

  g.selectAll('.grid-line').data(yP.ticks(5)).join('line')
    .attr('class','grid-line').attr('x1',0).attr('x2',iW)
    .attr('y1', d => yP(d)).attr('y2', d => yP(d));

  g.selectAll('.bar').data(data).join('rect').attr('class','bar')
    .attr('x', d => x(d.month)).attr('y', d => yP(d.packages))
    .attr('width', x.bandwidth()).attr('height', d => iH - yP(d.packages))
    .attr('fill', C.teal).attr('rx', 2)
    .on('mousemove', (event, d) => {
      const i = data.indexOf(d);
      showTip(`<div class="tip-title">${LABELS[i]} 2025</div>
        <div class="tip-row"><span class="tip-key">Packages</span><span class="tip-val">${d.packages.toLocaleString()}</span></div>
        <div class="tip-row"><span class="tip-key">Cost</span><span class="tip-val">$${d.cost.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</span></div>
        <div class="tip-row"><span class="tip-key">Weight</span><span class="tip-val">${Math.round(d.lbs).toLocaleString()} lbs</span></div>`, event);
    })
    .on('mouseleave', hideTip);

  const line = d3.line()
    .x(d => x(d.month) + x.bandwidth() / 2).y(d => yC(d.cost)).curve(d3.curveMonotoneX);
  g.append('path').datum(data).attr('class','line-path').attr('d', line)
    .attr('stroke', C.amber).attr('stroke-width', 2.5);
  g.selectAll('.dot').data(data).join('circle')
    .attr('cx', d => x(d.month) + x.bandwidth() / 2).attr('cy', d => yC(d.cost))
    .attr('r', 3.5).attr('fill', C.amber);

  g.append('g').attr('class','axis').attr('transform',`translate(0,${iH})`)
    .call(d3.axisBottom(x).tickFormat((d, i) => LABELS[i]));
  g.append('g').attr('class','axis').call(d3.axisLeft(yP).ticks(5).tickFormat(d3.format(',d')));
  g.append('g').attr('class','axis').attr('transform',`translate(${iW},0)`)
    .call(d3.axisRight(yC).ticks(5).tickFormat(d => '$' + d3.format(',d')(d)));

  const leg = svg.append('g').attr('transform',`translate(${m.left + 8},${H - 10})`);
  leg.append('rect').attr('width',12).attr('height',8).attr('y',-8).attr('fill',C.teal).attr('rx',1);
  leg.append('text').attr('x',16).attr('y',-1).style('font-family','var(--mono)').style('font-size','10px').style('fill',C.muted).text('Packages');
  leg.append('line').attr('x1',130).attr('x2',142).attr('y1',-4).attr('y2',-4).attr('stroke',C.amber).attr('stroke-width',2.5);
  leg.append('circle').attr('cx',136).attr('cy',-4).attr('r',3).attr('fill',C.amber);
  leg.append('text').attr('x',146).attr('y',-1).style('font-family','var(--mono)').style('font-size','10px').style('fill',C.muted).text('Cost ($)');
}

// ── Chart 2: Mail class donut ─────────────────────────────────────────────────

function renderDonut(data) {
  const el = document.getElementById('chart-class');
  const W = el.clientWidth || 400, H = 260;
  const radius = Math.min(W, H) / 2 - 20;
  const inner  = radius * 0.55;
  const total  = d3.sum(data, d => d.count);

  const svg = d3.select('#chart-class').append('svg').attr('width',W).attr('height',H);
  const g   = svg.append('g').attr('transform',`translate(${W * 0.42},${H / 2})`);
  const pie = d3.pie().value(d => d.count).sort(null);
  const arc = d3.arc().innerRadius(inner).outerRadius(radius);

  g.selectAll('.arc').data(pie(data)).join('g').attr('class','arc').append('path')
    .attr('d', arc).attr('fill', d => CLASS_COLOR[d.data.name] || C.muted)
    .attr('stroke','#0d1117').attr('stroke-width',2)
    .on('mousemove', (event, d) => showTip(`
      <div class="tip-title">${d.data.name}</div>
      <div class="tip-row"><span class="tip-key">Packages</span><span class="tip-val">${d.data.count.toLocaleString()}</span></div>
      <div class="tip-row"><span class="tip-key">Share</span><span class="tip-val">${(d.data.count/total*100).toFixed(1)}%</span></div>`, event))
    .on('mouseleave', hideTip);

  g.append('text').attr('text-anchor','middle').attr('dy','-0.2em')
    .style('font-family','var(--display)').style('font-size','22px')
    .style('font-weight','600').style('fill',C.paper).text(total.toLocaleString());
  g.append('text').attr('text-anchor','middle').attr('dy','1.2em')
    .style('font-family','var(--mono)').style('font-size','9px')
    .style('letter-spacing','0.12em').style('text-transform','uppercase')
    .style('fill',C.muted).text('packages');

  const leg = svg.append('g')
    .attr('transform',`translate(${W * 0.42 + radius + 18},${H / 2 - data.length * 8})`);
  data.forEach((d, i) => {
    const row = leg.append('g').attr('transform',`translate(0,${i * 17})`);
    row.append('rect').attr('width',10).attr('height',10).attr('y',-1)
      .attr('fill', CLASS_COLOR[d.name] || C.muted).attr('rx',2);
    row.append('text').attr('x',15).attr('y',8)
      .style('font-family','var(--mono)').style('font-size','10px').style('fill',C.muted)
      .text(`${d.name} (${(d.count/total*100).toFixed(1)}%)`);
  });
}

// ── Chart 3: Weight distribution ─────────────────────────────────────────────

function renderWeight(data) {
  const el = document.getElementById('chart-weight');
  const W = el.clientWidth || 400, H = 260;
  const m = { top: 20, right: 20, bottom: 36, left: 52 };
  const iW = W - m.left - m.right, iH = H - m.top - m.bottom;
  const barColors = [C.teal,'#4dd0e1',C.amber,'#ffb300',C.accent,'#8b1a06'];
  const total = d3.sum(data, d => d.count);

  const svg = d3.select('#chart-weight').append('svg').attr('width',W).attr('height',H);
  const g   = svg.append('g').attr('transform',`translate(${m.left},${m.top})`);
  const x   = d3.scaleBand().domain(data.map(d => d.label)).range([0,iW]).padding(0.3);
  const y   = d3.scaleLinear().domain([0, d3.max(data, d => d.count) * 1.15]).range([iH,0]);

  g.selectAll('.grid-line').data(y.ticks(4)).join('line')
    .attr('class','grid-line').attr('x1',0).attr('x2',iW)
    .attr('y1', d => y(d)).attr('y2', d => y(d));

  g.selectAll('.bar').data(data).join('rect').attr('class','bar')
    .attr('x', d => x(d.label)).attr('y', d => y(d.count))
    .attr('width', x.bandwidth()).attr('height', d => iH - y(d.count))
    .attr('fill', (d, i) => barColors[i] || C.teal).attr('rx',2)
    .on('mousemove', (event, d) => showTip(`
      <div class="tip-title">${d.label}</div>
      <div class="tip-row"><span class="tip-key">Packages</span><span class="tip-val">${d.count.toLocaleString()}</span></div>
      <div class="tip-row"><span class="tip-key">Share</span><span class="tip-val">${(d.count/total*100).toFixed(1)}%</span></div>`, event))
    .on('mouseleave', hideTip);

  g.selectAll('.bar-label').data(data).join('text')
    .attr('x', d => x(d.label) + x.bandwidth() / 2).attr('y', d => y(d.count) - 5)
    .attr('text-anchor','middle').style('font-family','var(--mono)')
    .style('font-size','10px').style('fill',C.muted)
    .text(d => d.count.toLocaleString());

  g.append('g').attr('class','axis').attr('transform',`translate(0,${iH})`).call(d3.axisBottom(x));
  g.append('g').attr('class','axis').call(d3.axisLeft(y).ticks(4).tickFormat(d3.format(',d')));
}

// ── Chart 4: Top 20 states ────────────────────────────────────────────────────

function renderStates(data) {
  const el = document.getElementById('chart-states');
  const W = el.clientWidth || 900, H = 320;
  const m = { top: 10, right: 80, bottom: 30, left: 44 };
  const iW = W - m.left - m.right, iH = H - m.top - m.bottom;
  const color = rankColorScale(data.length);

  const svg = d3.select('#chart-states').append('svg').attr('width',W).attr('height',H);
  const g   = svg.append('g').attr('transform',`translate(${m.left},${m.top})`);
  const x   = d3.scaleLinear().domain([0, d3.max(data, d => d.count) * 1.1]).range([0,iW]);
  const y   = d3.scaleBand().domain(data.map(d => d.state)).range([0,iH]).padding(0.25);

  g.selectAll('.grid-line').data(x.ticks(5)).join('line')
    .attr('class','grid-line').attr('x1', d => x(d)).attr('x2', d => x(d))
    .attr('y1',0).attr('y2',iH);

  g.selectAll('.bar').data(data).join('rect').attr('class','bar')
    .attr('y', d => y(d.state)).attr('width', d => x(d.count))
    .attr('height', y.bandwidth()).attr('fill', (d,i) => color(i)).attr('rx',2)
    .on('mousemove', (event, d) => showTip(`
      <div class="tip-title">${d.state}</div>
      <div class="tip-row"><span class="tip-key">Packages</span><span class="tip-val">${d.count.toLocaleString()}</span></div>`, event))
    .on('mouseleave', hideTip);

  g.selectAll('.bar-label').data(data).join('text')
    .attr('x', d => x(d.count) + 5).attr('y', d => y(d.state) + y.bandwidth() / 2 + 4)
    .style('font-family','var(--mono)').style('font-size','10px').style('fill',C.muted)
    .text(d => d.count.toLocaleString());

  g.append('g').attr('class','axis').attr('transform',`translate(0,${iH})`)
    .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format(',d')));
  g.append('g').attr('class','axis').call(d3.axisLeft(y));
}

// ── Chart 5: Top 15 libraries by count ───────────────────────────────────────

function renderLibraries(data) {
  const el = document.getElementById('chart-libraries');
  const W = el.clientWidth || 900, H = 340;
  const m = { top: 10, right: 80, bottom: 30, left: 210 };
  const iW = W - m.left - m.right, iH = H - m.top - m.bottom;
  const color = rankColorScale(data.length);
  const truncate = name => name.length > 28 ? name.slice(0, 26) + '…' : name;

  const svg = d3.select('#chart-libraries').append('svg').attr('width',W).attr('height',H);
  const g   = svg.append('g').attr('transform',`translate(${m.left},${m.top})`);
  const x   = d3.scaleLinear().domain([0, d3.max(data, d => d.count) * 1.1]).range([0,iW]);
  const y   = d3.scaleBand().domain(data.map(d => d.name)).range([0,iH]).padding(0.25);

  g.selectAll('.grid-line').data(x.ticks(5)).join('line')
    .attr('class','grid-line').attr('x1', d => x(d)).attr('x2', d => x(d))
    .attr('y1',0).attr('y2',iH);

  g.selectAll('.bar').data(data).join('rect').attr('class','bar')
    .attr('y', d => y(d.name)).attr('width', d => x(d.count))
    .attr('height', y.bandwidth()).attr('fill', (d,i) => color(i)).attr('rx',2)
    .on('mousemove', (event, d) => showTip(`
      <div class="tip-title">${d.name}</div>
      <div class="tip-row"><span class="tip-key">Packages</span><span class="tip-val">${d.count.toLocaleString()}</span></div>`, event))
    .on('mouseleave', hideTip);

  g.selectAll('.bar-label').data(data).join('text')
    .attr('x', d => x(d.count) + 5).attr('y', d => y(d.name) + y.bandwidth() / 2 + 4)
    .style('font-family','var(--mono)').style('font-size','10px').style('fill',C.muted)
    .text(d => d.count.toLocaleString());

  g.append('g').attr('class','axis').attr('transform',`translate(0,${iH})`)
    .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format(',d')));
  g.append('g').attr('class','axis').call(d3.axisLeft(y).tickFormat(truncate));
}

// ── Chart 6: Top 15 libraries by weight ──────────────────────────────────────

function renderLibraryWeight(data) {
  const el = document.getElementById('chart-library-weight');
  const W = el.clientWidth || 900, H = 360;
  const m = { top: 14, right: 130, bottom: 30, left: 210 };
  const iW = W - m.left - m.right, iH = H - m.top - m.bottom;
  const color   = rankColorScale(data.length);
  const truncate = name => name.length > 28 ? name.slice(0, 26) + '…' : name;

  const svg = d3.select('#chart-library-weight').append('svg').attr('width',W).attr('height',H);
  const g   = svg.append('g').attr('transform',`translate(${m.left},${m.top})`);
  const x    = d3.scaleLinear().domain([0, d3.max(data, d => d.lbs) * 1.12]).range([0,iW]);
  const xAvg = d3.scaleLinear().domain([0, d3.max(data, d => d.avgLbs) * 1.3]).range([0,iW]);
  const y    = d3.scaleBand().domain(data.map(d => d.name)).range([0,iH]).padding(0.25);

  g.selectAll('.grid-line').data(x.ticks(5)).join('line')
    .attr('class','grid-line').attr('x1', d => x(d)).attr('x2', d => x(d))
    .attr('y1',0).attr('y2',iH);

  g.selectAll('.bar').data(data).join('rect').attr('class','bar')
    .attr('y', d => y(d.name)).attr('width', d => x(d.lbs))
    .attr('height', y.bandwidth()).attr('fill', (d,i) => color(i)).attr('rx',2)
    .on('mousemove', (event, d) => showTip(`
      <div class="tip-title">${d.name}</div>
      <div class="tip-row"><span class="tip-key">Total lbs</span>   <span class="tip-val">${Math.round(d.lbs).toLocaleString()}</span></div>
      <div class="tip-row"><span class="tip-key">Packages</span>    <span class="tip-val">${d.packages.toLocaleString()}</span></div>
      <div class="tip-row"><span class="tip-key">Avg lbs/pkg</span> <span class="tip-val">${d.avgLbs.toFixed(2)}</span></div>`, event))
    .on('mouseleave', hideTip);

  g.selectAll('.bar-label').data(data).join('text')
    .attr('x', d => x(d.lbs) + 5).attr('y', d => y(d.name) + y.bandwidth() / 2 + 4)
    .style('font-family','var(--mono)').style('font-size','10px').style('fill',C.muted)
    .text(d => `${Math.round(d.lbs)} lbs`);

  g.selectAll('.avg-marker').data(data).join('path').attr('class','avg-marker')
    .attr('transform', d => {
      const cx = xAvg(d.avgLbs);
      const cy = y(d.name) + y.bandwidth() / 2;
      return `translate(${cx},${cy})`;
    })
    .attr('d', d3.symbol().type(d3.symbolDiamond).size(30))
    .attr('fill', C.amber).attr('opacity', 0.9)
    .on('mousemove', (event, d) => showTip(`
      <div class="tip-title">${d.name}</div>
      <div class="tip-row"><span class="tip-key">Avg lbs/pkg</span><span class="tip-val">${d.avgLbs.toFixed(2)}</span></div>
      <div class="tip-row"><span class="tip-key">Total lbs</span>  <span class="tip-val">${Math.round(d.lbs)}</span></div>
      <div class="tip-row"><span class="tip-key">Packages</span>   <span class="tip-val">${d.packages}</span></div>`, event))
    .on('mouseleave', hideTip);

  g.append('g').attr('class','axis').attr('transform',`translate(0,${iH})`)
    .call(d3.axisBottom(x).ticks(5).tickFormat(d => d + ' lbs'));
  g.append('g').attr('class','axis').call(d3.axisLeft(y).tickFormat(truncate));

  // Legend — stacked vertically in right margin
  const leg = svg.append('g')
    .attr('transform',`translate(${m.left + iW + 14},${m.top + 10})`);
  leg.append('rect').attr('width',12).attr('height',8).attr('fill',C.accent).attr('rx',1);
  leg.append('text').attr('x',16).attr('y',8)
    .style('font-family','var(--mono)').style('font-size','10px').style('fill',C.muted)
    .text('Total lbs');
  leg.append('path').attr('transform','translate(6,26)')
    .attr('d', d3.symbol().type(d3.symbolDiamond).size(30)).attr('fill',C.amber);
  leg.append('text').attr('x',16).attr('y',30)
    .style('font-family','var(--mono)').style('font-size','10px').style('fill',C.muted)
    .text('Avg lbs/pkg');
}

// ── Init ──────────────────────────────────────────────────────────────────────

window.addEventListener('load', async () => {
  try {
    const data      = await loadShipmentData(
      '../shippingArcs/data/trips_2025.json',
      '../data/geodata.json',
      '../shippingArcs/data/trips_courier_2025.json'
    );
    const year      = data.year || 2025;
    const allShipments = data.shipments.filter(s => (s.date || '').startsWith(String(year)));

    function renderAll(shipments) {
      // Clear all chart areas before re-rendering
      ['chart-monthly','chart-class','chart-weight',
       'chart-states','chart-libraries','chart-library-weight']
        .forEach(id => { document.getElementById(id).innerHTML = ''; });

      const prepared = prepareData(shipments);
      renderHeaderStats(shipments);
      renderMonthly(prepared.monthly);
      renderDonut(prepared.byClass);
      renderWeight(prepared.byWeight);
      renderStates(prepared.byState);
      renderLibraries(prepared.byLibrary);
      renderLibraryWeight(prepared.byLibraryWeight);
    }

    renderAll(allShipments);
    setSourceToggleVisible(data.hasCourier);
    initSourceToggle(mode => renderAll(filterBySource(allShipments, mode)));

    hideLoadingOverlay();
  } catch (err) {
    showLoadingError(err.message);
  }
});
