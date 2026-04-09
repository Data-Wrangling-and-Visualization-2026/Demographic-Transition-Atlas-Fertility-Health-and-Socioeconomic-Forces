/* global d3, topojson */
(function () {
  "use strict";

  const WB_FERTILITY = "SP.DYN.TFRT.IN";
  const WB_GDP = "NY.GDP.PCAP.CD";

  const MAP_EMPTY_DEFAULT = {
    title: "No values for this year, indicator, and source.",
    hint: "Try another source or indicator.",
  };

  const INDICATOR_LABELS = {
    [WB_FERTILITY]: "Fertility rate, total (births per woman)",
    [WB_GDP]: "GDP per capita (current US$)",
    "SP.ADO.TFRT": "Adolescent fertility (births per 1,000 women ages 15–19)",
    "SH.STA.MMRT.NE": "Maternal mortality ratio (per 100,000 live births)",
    "SL.TLF.CACT.FE.ZS": "Labor force participation, female (% of labor force)",
    "SP.URB.TOTL.IN.ZS": "Urban population (% of total)",
    "SE.SEC.ENRR.FE": "School enrollment, secondary, female (%)",
    "SH.XPD.CHEX.GD.ZS": "Current health expenditure (% of GDP)",
  };

  const el = (id) => document.getElementById(id);

  const state = {
    year: 2010,
    indicator: WB_FERTILITY,
    source: "worldbank",
    selectedIso3: "",
    countries: [],
    indicators: [],
    mapRows: [],
    worldFeatures: null,
    λ: -24,
    φ: -18,
    path: null,
    projection: null,
    svg: null,
    gLand: null,
    gLines: null,
    dimensions: { w: 920, h: 520 },
    starfieldRaf: null,
  };

  function apiUrl(path) {
    return path;
  }

  async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
  }

  function initStarfield() {
    const canvas = el("starfield");
    if (!canvas || !canvas.getContext) return;
    const stage = canvas.closest(".map-stage");
    if (!stage) return;
    const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const n = reduceMotion ? 60 : 140;
    const stars = Array.from({ length: n }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.15 + 0.15,
      p: Math.random() * Math.PI * 2,
      s: 0.4 + Math.random() * 1.6,
    }));

    function resize() {
      const rect = stage.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    }

    function drawStatic() {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;
      const dpr = window.devicePixelRatio || 1;
      stars.forEach((st) => {
        ctx.fillStyle = "rgba(200, 230, 255, 0.1)";
        ctx.beginPath();
        ctx.arc(st.x * w, st.y * h, st.r * dpr, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    function tick(t) {
      if (state.starfieldRaf === null) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;
      const time = t * 0.001;
      const dpr = window.devicePixelRatio || 1;
      stars.forEach((st) => {
        const tw = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(time * st.s + st.p));
        ctx.fillStyle = `rgba(200, 230, 255, ${0.12 * tw})`;
        ctx.beginPath();
        ctx.arc(st.x * w, st.y * h, st.r * dpr, 0, Math.PI * 2);
        ctx.fill();
      });
      state.starfieldRaf = requestAnimationFrame(tick);
    }

    if (state.starfieldRaf) cancelAnimationFrame(state.starfieldRaf);
    state.starfieldRaf = null;
    resize();
    window.addEventListener("resize", () => {
      resize();
      if (reduceMotion) drawStatic();
    });
    if (reduceMotion) {
      requestAnimationFrame(() => drawStatic());
      return;
    }
    state.starfieldRaf = requestAnimationFrame(tick);
  }

  function updateHistogram(rows) {
    const svg = d3.select("#histogram-svg");
    svg.selectAll("*").remove();
    if (!rows || rows.length < 3) return;
    const values = rows.map((r) => Number(r.value)).filter((v) => Number.isFinite(v));
    if (values.length < 3) return;
    const ext = d3.extent(values);
    if (!ext[0] && ext[0] !== 0) return;
    if (ext[1] - ext[0] < 1e-9) return;
    const bins = d3.bin().domain(ext).thresholds(14)(values);
    const w = 400;
    const h = 48;
    const pad = 4;
    const maxc = d3.max(bins, (b) => b.length) || 1;
    const bw = (w - pad * 2) / bins.length - 0.5;
    bins.forEach((b, i) => {
      const bh = ((b.length / maxc) * (h - pad * 2)) | 0;
      const x = pad + i * (bw + 0.5);
      const y = h - pad - bh;
      svg
        .append("rect")
        .attr("x", x)
        .attr("y", y)
        .attr("width", Math.max(1.5, bw))
        .attr("height", Math.max(0, bh))
        .attr("rx", 2)
        .attr("fill", "rgba(124, 240, 214, 0.42)")
        .attr("stroke", "rgba(255,255,255,0.06)");
    });
  }

  function animateStat(elementId, rawTarget, duration = 1100) {
    const node = el(elementId);
    if (!node) return;
    const end = Number(rawTarget);
    if (!Number.isFinite(end) || end < 0) {
      node.textContent = "—";
      return;
    }
    const start = 0;
    const t0 = performance.now();
    function frame(now) {
      const u = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - u, 3);
      node.textContent = Math.round(start + (end - start) * eased).toLocaleString("en-US");
      if (u < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  async function loadDbStats() {
    const strip = el("stats-strip");
    try {
      const s = await fetchJson(apiUrl("/db/stats"));
      strip.hidden = false;
      animateStat("stat-countries", s.countries_count);
      animateStat("stat-facts", s.fact_indicator_value_count);
      animateStat("stat-events", s.fact_context_event_count);
      animateStat("stat-years", s.indicator_years_count);
    } catch {
      strip.hidden = true;
    }
  }

  async function loadAllCountries() {
    const out = [];
    let offset = 0;
    const limit = 200;
    for (;;) {
      const chunk = await fetchJson(apiUrl(`/countries?limit=${limit}&offset=${offset}`));
      if (!Array.isArray(chunk) || chunk.length === 0) break;
      out.push(...chunk);
      if (chunk.length < limit) break;
      offset += limit;
    }
    return out.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }

  function indicatorLabel(code) {
    if (!code) return "—";
    if (code.startsWith("UN_")) return `${code} (UN series in DB)`;
    return INDICATOR_LABELS[code] || code;
  }

  function setMapEmptyMessage(title, hint) {
    const paras = el("map-empty").querySelectorAll("p");
    if (paras[0]) paras[0].textContent = title;
    if (paras[1]) paras[1].textContent = hint;
  }

  function resetMapEmptyMessage() {
    setMapEmptyMessage(MAP_EMPTY_DEFAULT.title, MAP_EMPTY_DEFAULT.hint);
  }

  async function loadIndicatorsForSource(src) {
    try {
      const q = `?source=${encodeURIComponent(src)}`;
      state.indicators = await fetchJson(apiUrl(`/indicators${q}`));
    } catch (e) {
      console.error(e);
      state.indicators = [];
    }
    populateIndicators();
  }

  function isoFromFeature(f) {
    const p = f.properties || {};
    const a3 = p.ISO_A3;
    if (a3 && a3 !== "-99") return a3;
    if (p.ADM0_A3 && p.ADM0_A3 !== "-99") return p.ADM0_A3;
    return null;
  }

  function setupReveal() {
    const blocks = document.querySelectorAll("[data-reveal]");
    if (!blocks.length || !("IntersectionObserver" in window)) {
      blocks.forEach((b) => b.setAttribute("data-visible", "true"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.setAttribute("data-visible", "true");
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.08 },
    );
    blocks.forEach((b) => io.observe(b));
  }

  function setupControls() {
    const sourceSelect = el("source-select");
    sourceSelect.innerHTML = "";
    [
      { v: "worldbank", t: "World Bank" },
      { v: "un", t: "United Nations" },
    ].forEach((o) => {
      const opt = document.createElement("option");
      opt.value = o.v;
      opt.textContent = o.t;
      sourceSelect.appendChild(opt);
    });
    sourceSelect.value = state.source;
    sourceSelect.addEventListener("change", async () => {
      state.source = sourceSelect.value;
      resetMapEmptyMessage();
      await loadIndicatorsForSource(state.source);
      void refreshMap();
      void refreshDetailIfSelected();
    });

    el("indicator-select").addEventListener("change", (e) => {
      state.indicator = e.target.value;
      void refreshMap();
    });

    const yearSlider = el("year-slider");
    const yearLabel = el("year-label");
    yearLabel.textContent = String(yearSlider.value);
    yearSlider.addEventListener("input", () => {
      state.year = Number(yearSlider.value);
      yearLabel.textContent = String(state.year);
      void refreshMap();
    });
    state.year = Number(yearSlider.value);

    el("btn-reset").addEventListener("click", () => {
      state.selectedIso3 = "";
      el("country-select").value = "";
      toggleDetail(false);
      redrawMapColors();
    });

    el("country-select").addEventListener("change", (e) => {
      state.selectedIso3 = (e.target.value || "").toUpperCase();
      if (state.selectedIso3) {
        toggleDetail(true);
        void loadCountryDetail();
      } else {
        toggleDetail(false);
      }
      redrawMapColors();
    });
  }

  function toggleDetail(show) {
    el("detail-empty").hidden = show;
    el("detail-content").hidden = !show;
  }

  function populateCountrySelect() {
    const sel = el("country-select");
    const first = sel.querySelector("option[value='']");
    sel.innerHTML = "";
    if (first) sel.appendChild(first);
    else {
      const o = document.createElement("option");
      o.value = "";
      o.textContent = "Pick on the globe or here";
      sel.appendChild(o);
    }
    state.countries.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.iso3;
      opt.textContent = `${c.name} (${c.iso3})`;
      sel.appendChild(opt);
    });
  }

  function populateIndicators() {
    const sel = el("indicator-select");
    sel.innerHTML = "";
    if (!state.indicators.length) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent =
        state.source === "un"
          ? "No UN series in the database — run ingest or choose World Bank"
          : "No indicators returned from the API";
      sel.appendChild(opt);
      state.indicator = "";
      return;
    }
    state.indicators.forEach((code) => {
      const opt = document.createElement("option");
      opt.value = code;
      opt.textContent = `${code} — ${indicatorLabel(code)}`;
      sel.appendChild(opt);
    });
    if (state.indicators.includes(WB_FERTILITY)) sel.value = WB_FERTILITY;
    else sel.value = state.indicators[0];
    state.indicator = sel.value;
  }

  function buildScales(rows) {
    const values = rows.map((r) => Number(r.value)).filter((v) => Number.isFinite(v));
    if (!values.length) return { color: null, extent: [0, 1] };
    const extent = d3.extent(values);
    const color = d3.scaleSequential(d3.interpolateTurbo).domain([extent[0], extent[1]]);
    return { color, extent };
  }

  function updateLegend(color, extent) {
    const grad = el("legend-gradient");
    const ticks = el("legend-ticks");
    if (!color || !Number.isFinite(extent[0])) {
      grad.style.background = "rgba(255,255,255,0.08)";
      ticks.innerHTML = "";
      return;
    }
    const samples = d3.range(0, 1.01, 0.05).map((t) => d3.interpolateTurbo(t));
    grad.style.background = `linear-gradient(90deg, ${samples.join(",")})`;
    const fmt = d3.format(".2f");
    ticks.innerHTML = "";
    [0, 0.25, 0.5, 0.75, 1].forEach((p) => {
      const span = document.createElement("span");
      span.textContent = fmt(extent[0] + p * (extent[1] - extent[0]));
      ticks.appendChild(span);
    });
  }

  function initGlobe() {
    const svg = d3.select("#globe-svg");
    const root = svg.select("#globe-root");
    root.selectAll("*").remove();

    const { w, h } = state.dimensions;
    const projection = d3
      .geoOrthographic()
      .scale(260)
      .center([0, 0])
      .rotate([-state.λ, -state.φ])
      .translate([w / 2, h / 2])
      .clipAngle(90);

    const path = d3.geoPath(projection);
    state.projection = projection;
    state.path = path;
    state.svg = svg;

    const gRoot = root.append("g").attr("class", "globe-inner");

    svg
      .select("defs")
      .append("clipPath")
      .attr("id", "sphere-clip")
      .append("circle")
      .attr("cx", w / 2)
      .attr("cy", h / 2)
      .attr("r", projection.scale());

    state.spherePath = gRoot
      .append("path")
      .datum({ type: "Sphere" })
      .attr("class", "sphere-fill")
      .attr("d", path)
      .attr("fill", "url(#ocean-glow)")
      .attr("filter", "url(#soft-glow)");

    const graticule = d3.geoGraticule().step([18, 18]);
    state.gLines = gRoot
      .append("g")
      .attr("clip-path", "url(#sphere-clip)")
      .append("path")
      .datum(graticule)
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", "rgba(255,255,255,0.07)")
      .attr("stroke-width", 0.8)
      .attr("pointer-events", "none");

    const zoomSurface = gRoot
      .append("circle")
      .attr("clip-path", "url(#sphere-clip)")
      .attr("cx", w / 2)
      .attr("cy", h / 2)
      .attr("r", projection.scale())
      .attr("fill", "transparent")
      .style("cursor", "grab");

    state.gLand = gRoot.append("g").attr("clip-path", "url(#sphere-clip)");

    state.rimCircle = gRoot
      .append("circle")
      .attr("cx", w / 2)
      .attr("cy", h / 2)
      .attr("r", projection.scale())
      .attr("fill", "none")
      .attr("stroke", "url(#rim-light)")
      .attr("stroke-width", 1.4)
      .attr("opacity", 0.85)
      .attr("pointer-events", "none");

    const drag = d3.drag().on("drag", (event) => {
      const sens = 0.45;
      state.λ += event.dx * sens;
      state.φ -= event.dy * sens;
      state.φ = Math.max(-60, Math.min(60, state.φ));
      projection.rotate([-state.λ, -state.φ]);
      refreshGlobeGeometry();
    });

    zoomSurface.call(drag);
    state.zoomSurface = zoomSurface;
  }

  function refreshGlobeGeometry() {
    if (!state.gLand || !state.path || !state.projection) return;
    const { path, projection } = state;
    if (state.spherePath) state.spherePath.attr("d", path);
    state.gLines.attr("d", path);
    state.gLand.selectAll("path.country").attr("d", path);
    d3.select("#globe-svg").select("#sphere-clip circle").attr("r", projection.scale());
    if (state.rimCircle) {
      state.rimCircle
        .attr("cx", state.dimensions.w / 2)
        .attr("cy", state.dimensions.h / 2)
        .attr("r", projection.scale());
    }
    if (state.zoomSurface) {
      state.zoomSurface
        .attr("cx", state.dimensions.w / 2)
        .attr("cy", state.dimensions.h / 2)
        .attr("r", projection.scale());
    }
  }

  function redrawMapColors() {
    if (!state.gLand) return;
    const valueByIso = new Map(state.mapRows.map((r) => [r.iso3, r]));
    const { color } = buildScales(state.mapRows);
    const selected = state.selectedIso3;

    state.gLand
      .selectAll("path.country")
      .data(state.worldFeatures, (d) => isoFromFeature(d) || d.id)
      .join("path")
      .attr("class", "country")
      .attr("d", state.path)
      .attr("vector-effect", "non-scaling-stroke")
      .attr("stroke", "rgba(255,255,255,0.18)")
      .attr("stroke-width", 0.35)
      .each(function (d) {
        const iso = isoFromFeature(d);
        const row = iso ? valueByIso.get(iso) : null;
        const v = row && row.value != null ? Number(row.value) : null;
        const fill =
          v != null && color ? color(v) : iso && selected && iso === selected ? "rgba(124,240,214,0.35)" : "#1e2438";
        d3.select(this).interrupt().transition().duration(420).ease(d3.easeCubicOut).attr("fill", fill);
      })
      .on("mouseenter", (event, d) => showTooltip(event, d, valueByIso))
      .on("mousemove", (event, d) => moveTooltip(event, d, valueByIso))
      .on("mouseleave", hideTooltip)
      .on("click", (_, d) => {
        const iso = isoFromFeature(d);
        if (!iso) return;
        state.selectedIso3 = iso;
        el("country-select").value = iso;
        toggleDetail(true);
        void loadCountryDetail();
        redrawMapColors();
      });
  }

  function showTooltip(event, d, valueByIso) {
    const iso = isoFromFeature(d);
    const tip = el("map-tooltip");
    const row = iso ? valueByIso.get(iso) : null;
    const name = row?.name || d.properties?.NAME || iso || "Unknown";
    const v = row?.value;
    const val =
      v != null && Number.isFinite(Number(v)) ? d3.format(".2f")(Number(v)) : "no data";
    tip.innerHTML = `<strong>${name}</strong><span>${state.indicator} · ${state.year}</span><br/><span class="muted">${val}</span>`;
    tip.hidden = false;
    moveTooltip(event, d, valueByIso);
  }

  function moveTooltip(event) {
    const tip = el("map-tooltip");
    const stage = document.querySelector(".map-stage");
    const rect = stage.getBoundingClientRect();
    const x = event.clientX - rect.left + 12;
    const y = event.clientY - rect.top + 12;
    tip.style.left = `${Math.min(x, rect.width - 200)}px`;
    tip.style.top = `${Math.min(y, rect.height - 80)}px`;
  }

  function hideTooltip() {
    el("map-tooltip").hidden = true;
  }

  async function refreshMap() {
    const panel = el("map-panel");
    panel.classList.add("loading");
    el("map-empty").hidden = true;
    resetMapEmptyMessage();
    updateHistogram([]);
    try {
      if (!state.indicator) {
        state.mapRows = [];
        el("map-headline").textContent = "Choose an indicator";
        updateLegend(null, [0, 1]);
        setMapEmptyMessage(
          "No indicators available for this source.",
          "The UN list is built from rows in the database after ingest. For a quick demo, switch to World Bank.",
        );
        el("map-empty").hidden = false;
        redrawMapColors();
        return;
      }
      const params = new URLSearchParams({
        year: String(state.year),
        indicator: state.indicator,
        source: state.source,
        limit: "500",
      });
      const rows = await fetchJson(apiUrl(`/map?${params}`));
      state.mapRows = Array.isArray(rows) ? rows : [];
      el("map-headline").textContent = `${indicatorLabel(state.indicator)} · ${state.year}`;
      const { color, extent } = buildScales(state.mapRows);
      updateLegend(color, extent);
      updateHistogram(state.mapRows);
      if (!state.mapRows.length) {
        setMapEmptyMessage(
          MAP_EMPTY_DEFAULT.title,
          "Often means there are no rows yet for this source/indicator—load data or try World Bank with SP.DYN.TFRT.IN.",
        );
        el("map-empty").hidden = false;
      }
      redrawMapColors();
    } catch (e) {
      console.error(e);
      state.mapRows = [];
      el("map-empty").hidden = false;
    } finally {
      panel.classList.remove("loading");
    }
  }

  function drawLineChart(svgSel, points, opts) {
    const margin = { top: 12, right: 10, bottom: 28, left: 44 };
    const fullW = opts.width;
    const fullH = opts.height;
    const w = fullW - margin.left - margin.right;
    const h = fullH - margin.top - margin.bottom;
    svgSel.selectAll("*").remove();
    if (!points.length) return;

    const x = d3
      .scaleLinear()
      .domain(d3.extent(points, (d) => d.year))
      .range([0, w]);
    const y = d3
      .scaleLinear()
      .domain(d3.extent(points, (d) => d.value))
      .nice()
      .range([h, 0]);

    const line = d3
      .line()
      .curve(d3.curveMonotoneX)
      .x((d) => x(d.year))
      .y((d) => y(d.value));

    const g = svgSel.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const gradId = `lg-${opts.id}`;
    const defs = svgSel.append("defs");
    const lg = defs
      .append("linearGradient")
      .attr("id", gradId)
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");
    lg.append("stop").attr("offset", "0%").attr("stop-color", opts.accent).attr("stop-opacity", 0.5);
    lg.append("stop").attr("offset", "100%").attr("stop-color", opts.accent).attr("stop-opacity", 0);

    const area = d3
      .area()
      .curve(d3.curveMonotoneX)
      .x((d) => x(d.year))
      .y0(h)
      .y1((d) => y(d.value));

    g.append("path").datum(points).attr("fill", `url(#${gradId})`).attr("d", area);

    g.append("path")
      .datum(points)
      .attr("fill", "none")
      .attr("stroke", opts.accent)
      .attr("stroke-width", 2.2)
      .attr("d", line);

    g.selectAll("circle.pt")
      .data(points.filter((_, i) => i % Math.ceil(points.length / 12 || 1) === 0))
      .join("circle")
      .attr("class", "pt")
      .attr("cx", (d) => x(d.year))
      .attr("cy", (d) => y(d.value))
      .attr("r", 2.4)
      .attr("fill", "#fff")
      .attr("opacity", 0.85);

    const xAxis = d3.axisBottom(x).ticks(6).tickFormat(d3.format("d"));
    const yAxis = d3.axisLeft(y).ticks(4);

    g.append("g").attr("transform", `translate(0,${h})`).call(xAxis).attr("color", "#8891b5").attr("font-size", 9);

    g.append("g").call(yAxis).attr("color", "#8891b5").attr("font-size", 9);

    g.selectAll("text").attr("font-family", "Outfit, sans-serif");
  }

  async function loadCountryDetail() {
    const iso = state.selectedIso3;
    if (!iso) return;
    const country = state.countries.find((c) => c.iso3 === iso);
    el("country-name").textContent = country?.name || iso;
    el("country-meta").textContent = country
      ? `${country.region || "—"} · ${country.income_group || "—"}`
      : "";

    el("fertility-caption").textContent = `${WB_FERTILITY} · worldbank`;

    let fertPts = [];
    try {
      const ts = await fetchJson(
        apiUrl(`/timeseries?country_iso3=${iso}&indicator=${WB_FERTILITY}&source=worldbank`),
      );
      fertPts = (ts.points || [])
        .map((p) => ({ year: p.year, value: Number(p.value) }))
        .filter((p) => Number.isFinite(p.value));
    } catch (e) {
      console.error(e);
    }
    const fertEmpty = el("chart-fertility-empty");
    if (!fertPts.length) {
      fertEmpty.hidden = false;
      d3.select("#chart-fertility").selectAll("*").remove();
    } else {
      fertEmpty.hidden = true;
      drawLineChart(d3.select("#chart-fertility"), fertPts, {
        id: "fert",
        width: 440,
        height: 200,
        accent: "#7cf0d6",
      });
    }

    let gdpPts = [];
    try {
      const tsG = await fetchJson(apiUrl(`/timeseries?country_iso3=${iso}&indicator=${WB_GDP}&source=worldbank`));
      gdpPts = (tsG.points || [])
        .map((p) => ({ year: p.year, value: Number(p.value) }))
        .filter((p) => Number.isFinite(p.value));
    } catch (e) {
      console.error(e);
    }
    const gdpEmpty = el("chart-gdp-empty");
    if (!gdpPts.length) {
      gdpEmpty.hidden = false;
      d3.select("#chart-gdp").selectAll("*").remove();
    } else {
      gdpEmpty.hidden = true;
      drawLineChart(d3.select("#chart-gdp"), gdpPts, {
        id: "gdp",
        width: 440,
        height: 120,
        accent: "#c9a6ff",
      });
    }

    el("events-loading").hidden = false;
    el("events-list").innerHTML = "";
    el("events-empty").hidden = true;
    try {
      const evs = await fetchJson(apiUrl(`/events?country_iso3=${iso}&limit=100`));
      el("events-loading").hidden = true;
      renderEvents(Array.isArray(evs) ? evs : []);
    } catch (e) {
      console.error(e);
      el("events-loading").hidden = true;
      renderEvents([]);
    }
  }

  function renderEvents(items) {
    const ul = el("events-list");
    ul.innerHTML = "";
    if (!items.length) {
      el("events-empty").hidden = false;
      return;
    }
    el("events-empty").hidden = true;
    items
      .slice()
      .sort((a, b) => (a.year || 0) - (b.year || 0))
      .forEach((ev) => {
        const li = document.createElement("li");
        li.className = "event-card";
        const src = (ev.source || "").toLowerCase();
        const srcClass =
          src === "un_wpp" ? "pill-source-un_wpp" : src === "worldbank" ? "pill-source-worldbank" : "pill-source-other";
        const cat = ev.event_category || "—";
        const title = ev.title || "Untitled";
        const summary = ev.summary || "";
        li.innerHTML = `
          <div class="event-card__top">
            <span class="pill pill-year">${ev.year ?? "—"}</span>
            <span class="pill ${srcClass}">${ev.source || "source"}</span>
            <span class="pill pill-cat">${cat}</span>
          </div>
          <p class="event-card__title"></p>
          <p class="event-card__summary"></p>
        `;
        li.querySelector(".event-card__title").textContent = title;
        li.querySelector(".event-card__summary").textContent = summary;
        ul.appendChild(li);
      });
  }

  async function refreshDetailIfSelected() {
    if (state.selectedIso3) await loadCountryDetail();
  }

  async function bootstrap() {
    setupReveal();
    setupControls();
    void loadDbStats();

    try {
      const [countries, world] = await Promise.all([
        loadAllCountries(),
        fetchJson("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"),
      ]);
      state.countries = countries;
      populateCountrySelect();
      await loadIndicatorsForSource(state.source);

      state.worldFeatures = topojson.feature(world, world.objects.countries).features;
      initGlobe();
      initStarfield();
      await refreshMap();
      redrawMapColors();
    } catch (e) {
      console.error(e);
      const box = el("map-empty");
      const paras = box.querySelectorAll("p");
      let title = "Could not load initial data.";
      let hint =
        "Open this page via the backend (e.g. http://localhost:8000/), not as a file. Postgres and uvicorn must be running.";
      const msg = e && e.message ? String(e.message) : "";
      if (msg === "Failed to fetch" || msg.includes("NetworkError") || msg.includes("Load failed")) {
        title = "Cannot reach the API (server not running or wrong port).";
        hint =
          "Start Postgres, then from the backend folder run: python -m uvicorn app.main:app --host 0.0.0.0 --port 8000. Reload this page.";
      } else if (msg.includes("503")) {
        title = "API is up but the database is unavailable (503).";
        hint = "Start PostgreSQL and check POSTGRES_* environment variables.";
      } else if (msg) {
        hint = `${hint} (${msg})`;
      }
      if (paras[0]) paras[0].textContent = title;
      if (paras[1]) paras[1].textContent = hint;
      box.hidden = false;
      el("map-loading").style.display = "none";
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap);
  } else {
    void bootstrap();
  }
})();
