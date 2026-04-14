/* global d3, topojson */
(function () {
  "use strict";

  const API_BASE = window.ATLAS_API_BASE || "http://localhost:8000";

  const PANEL_INDICATORS = [
    "tfr",
    "adolescent_fertility",
    "gdp_per_capita",
    "female_secondary_enrollment",
  ];

  const PANEL_COLORS = {
    tfr: "#176b55",
    adolescent_fertility: "#2d8b6f",
    gdp_per_capita: "#255e93",
    female_secondary_enrollment: "#b87726",
  };

  const ID_TO_ISO3 = {
    4: "AFG",
    8: "ALB",
    12: "DZA",
    20: "AND",
    24: "AGO",
    28: "ATG",
    32: "ARG",
    51: "ARM",
    36: "AUS",
    40: "AUT",
    31: "AZE",
    44: "BHS",
    48: "BHR",
    50: "BGD",
    52: "BRB",
    112: "BLR",
    56: "BEL",
    84: "BLZ",
    204: "BEN",
    64: "BTN",
    68: "BOL",
    70: "BIH",
    72: "BWA",
    76: "BRA",
    96: "BRN",
    100: "BGR",
    854: "BFA",
    108: "BDI",
    116: "KHM",
    120: "CMR",
    124: "CAN",
    132: "CPV",
    140: "CAF",
    148: "TCD",
    152: "CHL",
    156: "CHN",
    170: "COL",
    174: "COM",
    178: "COG",
    180: "COD",
    188: "CRI",
    384: "CIV",
    191: "HRV",
    192: "CUB",
    196: "CYP",
    203: "CZE",
    208: "DNK",
    262: "DJI",
    212: "DMA",
    214: "DOM",
    218: "ECU",
    818: "EGY",
    222: "SLV",
    226: "GNQ",
    232: "ERI",
    233: "EST",
    748: "SWZ",
    231: "ETH",
    242: "FJI",
    246: "FIN",
    250: "FRA",
    266: "GAB",
    270: "GMB",
    268: "GEO",
    276: "DEU",
    288: "GHA",
    300: "GRC",
    308: "GRD",
    320: "GTM",
    324: "GIN",
    624: "GNB",
    328: "GUY",
    332: "HTI",
    340: "HND",
    348: "HUN",
    352: "ISL",
    356: "IND",
    360: "IDN",
    364: "IRN",
    368: "IRQ",
    372: "IRL",
    376: "ISR",
    380: "ITA",
    388: "JAM",
    392: "JPN",
    400: "JOR",
    398: "KAZ",
    404: "KEN",
    296: "KIR",
    408: "PRK",
    410: "KOR",
    414: "KWT",
    417: "KGZ",
    418: "LAO",
    428: "LVA",
    422: "LBN",
    426: "LSO",
    430: "LBR",
    434: "LBY",
    438: "LIE",
    440: "LTU",
    442: "LUX",
    450: "MDG",
    454: "MWI",
    458: "MYS",
    462: "MDV",
    466: "MLI",
    470: "MLT",
    584: "MHL",
    478: "MRT",
    480: "MUS",
    484: "MEX",
    583: "FSM",
    498: "MDA",
    492: "MCO",
    496: "MNG",
    499: "MNE",
    504: "MAR",
    508: "MOZ",
    104: "MMR",
    516: "NAM",
    520: "NRU",
    524: "NPL",
    528: "NLD",
    554: "NZL",
    558: "NIC",
    562: "NER",
    566: "NGA",
    807: "MKD",
    578: "NOR",
    512: "OMN",
    586: "PAK",
    585: "PLW",
    591: "PAN",
    598: "PNG",
    600: "PRY",
    604: "PER",
    608: "PHL",
    616: "POL",
    620: "PRT",
    634: "QAT",
    642: "ROU",
    643: "RUS",
    646: "RWA",
    659: "KNA",
    662: "LCA",
    670: "VCT",
    882: "WSM",
    674: "SMR",
    678: "STP",
    682: "SAU",
    686: "SEN",
    688: "SRB",
    690: "SYC",
    694: "SLE",
    702: "SGP",
    703: "SVK",
    705: "SVN",
    90: "SLB",
    706: "SOM",
    710: "ZAF",
    728: "SSD",
    724: "ESP",
    144: "LKA",
    729: "SDN",
    740: "SUR",
    752: "SWE",
    756: "CHE",
    760: "SYR",
    158: "TWN",
    762: "TJK",
    834: "TZA",
    764: "THA",
    626: "TLS",
    768: "TGO",
    776: "TON",
    780: "TTO",
    788: "TUN",
    792: "TUR",
    795: "TKM",
    798: "TUV",
    800: "UGA",
    804: "UKR",
    784: "ARE",
    826: "GBR",
    840: "USA",
    858: "URY",
    860: "UZB",
    548: "VUT",
    862: "VEN",
    704: "VNM",
    887: "YEM",
    894: "ZMB",
    716: "ZWE",
  };

  const state = {
    meta: null,
    indicators: [],
    countries: [],
    countriesByIso: new Map(),
    worldFeatures: [],
    mapRows: [],
    regionSummaryRows: [],
    selectedIso3: null,
    selectedYear: 2024,
    selectedIndicator: "tfr",
    selectedRegion: "",
    selectedIncome: "",
    refreshToken: 0,
    panelOpen: false,
    playTimer: null,
    compareSelectedCountries: [],
    compareIndicator: "tfr",
    compareHiddenCountries: new Set(),
    mapProjection: null,
    mapPath: null,
    mapSvg: null,
    mapLayer: null,
    mapSphere: null,
    mapGraticule: null,
    mapAtmosphere: null,
    mapGlow: null,
    mapShadow: null,
    mapDragSurface: null,
    mapValueByIso: new Map(),
    globeBaseScale: 236,
    globeRotateTimer: null,
    isDraggingGlobe: false,
    isHoveringCountry: false,
    story: {
      ready: false,
      yearSeries: [],
      tfrByYear: [],
      tfrRowsByYear: new Map(),
      latestYear: null,
      firstYear: null,
      latestTfrRows: [],
      latestGdpRows: [],
      latestEnrollmentRows: [],
      latestAdolescentRows: [],
      correlations: {
        gdpVsTfr: null,
        enrollmentVsAdolescent: null,
      },
    },
  };

  const el = (id) => document.getElementById(id);

  function isoFromFeature(feature) {
    const p = feature && feature.properties ? feature.properties : {};
    if (p.ISO_A3 && p.ISO_A3 !== "-99") return p.ISO_A3;
    if (p.ADM0_A3 && p.ADM0_A3 !== "-99") return p.ADM0_A3;
    if (feature && feature.id != null && ID_TO_ISO3[feature.id]) return ID_TO_ISO3[feature.id];
    return null;
  }

  function formatValue(value) {
    if (value == null || !Number.isFinite(Number(value))) return "-";
    const v = Number(value);
    const abs = Math.abs(v);
    if (abs >= 1_000_000) return d3.format(".3s")(v);
    if (abs >= 10_000) return d3.format(",.0f")(v);
    if (abs >= 100) return d3.format(",.1f")(v);
    return d3.format(".2f")(v);
  }

  function formatValueWithUnit(value, unit) {
    const base = formatValue(value);
    if (base === "-" || !unit) return base;
    return `${base} ${unit}`;
  }

  function toNumberOrNull(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  function mean(values) {
    const filtered = values.filter(Number.isFinite);
    if (!filtered.length) return null;
    return d3.mean(filtered);
  }

  function createYearRange(minYear, maxYear) {
    const years = [];
    for (let year = minYear; year <= maxYear; year += 1) years.push(year);
    return years;
  }

  function pearsonCorrelation(rows, xAccessor, yAccessor) {
    const prepared = rows
      .map((row) => ({ x: toNumberOrNull(xAccessor(row)), y: toNumberOrNull(yAccessor(row)) }))
      .filter((row) => row.x != null && row.y != null);

    if (prepared.length < 3) return null;

    const meanX = d3.mean(prepared, (d) => d.x);
    const meanY = d3.mean(prepared, (d) => d.y);

    let numerator = 0;
    let sumX = 0;
    let sumY = 0;

    prepared.forEach((point) => {
      const dx = point.x - meanX;
      const dy = point.y - meanY;
      numerator += dx * dy;
      sumX += dx * dx;
      sumY += dy * dy;
    });

    const denominator = Math.sqrt(sumX * sumY);
    if (!denominator) return null;
    return numerator / denominator;
  }

  function regressionLine(rows, xAccessor, yAccessor) {
    const prepared = rows
      .map((row) => ({ x: toNumberOrNull(xAccessor(row)), y: toNumberOrNull(yAccessor(row)) }))
      .filter((row) => row.x != null && row.y != null);

    if (prepared.length < 3) return null;

    const meanX = d3.mean(prepared, (d) => d.x);
    const meanY = d3.mean(prepared, (d) => d.y);

    let numerator = 0;
    let denominator = 0;
    prepared.forEach((point) => {
      const dx = point.x - meanX;
      numerator += dx * (point.y - meanY);
      denominator += dx * dx;
    });

    if (!denominator) return null;

    const slope = numerator / denominator;
    const intercept = meanY - slope * meanX;
    return { slope, intercept };
  }

  function buildApiUrl(path, params) {
    const url = new URL(path, API_BASE);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value === null || value === undefined || value === "") return;
        url.searchParams.set(key, String(value));
      });
    }
    return url.toString();
  }

  async function fetchJSON(url) {
    const response = await fetch(url);
    if (!response.ok) {
      const payload = await response.text();
      throw new Error(`${response.status} ${response.statusText} ${payload}`);
    }
    return response.json();
  }

  function indicatorMeta(code) {
    return state.indicators.find((i) => i.code === code) || null;
  }

  function getCountryName(iso3) {
    const row = state.countriesByIso.get(iso3);
    return row ? row.name : iso3;
  }

  function updateYearLabel() {
    el("year-value").textContent = String(state.selectedYear);
  }

  function setLoadingMessage(message) {
    const box = el("map-empty");
    box.textContent = message;
    box.hidden = false;
  }

  function hideLoadingMessage() {
    el("map-empty").hidden = true;
  }

  function setupReveal() {
    const nodes = document.querySelectorAll("[data-reveal]");
    if (!nodes.length) return;
    if (!("IntersectionObserver" in window)) {
      nodes.forEach((node) => node.setAttribute("data-visible", "true"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.setAttribute("data-visible", "true");
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -8% 0px" },
    );
    nodes.forEach((node) => observer.observe(node));
  }

  async function loadWorldFeatures() {
    const world = await fetchJSON("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json");
    const features = topojson.feature(world, world.objects.countries).features;
    features.forEach((feature) => {
      feature._iso3 = isoFromFeature(feature);
    });
    return features;
  }

  function populateIndicatorSelects() {
    const indicatorSelect = el("indicator-select");
    const compareSelect = el("compare-indicator-select");

    indicatorSelect.innerHTML = "";
    compareSelect.innerHTML = "";

    state.indicators.forEach((item) => {
      const label = `${item.label} (${item.code})`;

      const option1 = document.createElement("option");
      option1.value = item.code;
      option1.textContent = label;
      indicatorSelect.appendChild(option1);

      const option2 = document.createElement("option");
      option2.value = item.code;
      option2.textContent = label;
      compareSelect.appendChild(option2);
    });

    if (!state.indicators.some((i) => i.code === state.selectedIndicator) && state.indicators.length) {
      state.selectedIndicator = state.indicators[0].code;
    }
    if (!state.indicators.some((i) => i.code === state.compareIndicator)) {
      state.compareIndicator = state.selectedIndicator;
    }

    indicatorSelect.value = state.selectedIndicator;
    compareSelect.value = state.compareIndicator;
  }

  function populateFilterSelects() {
    const regionSelect = el("region-select");
    const incomeSelect = el("income-select");

    regionSelect.innerHTML = "";
    incomeSelect.innerHTML = "";

    const allRegion = document.createElement("option");
    allRegion.value = "";
    allRegion.textContent = "All regions";
    regionSelect.appendChild(allRegion);

    (state.meta.regions || []).forEach((region) => {
      const option = document.createElement("option");
      option.value = region;
      option.textContent = region;
      regionSelect.appendChild(option);
    });

    const allIncome = document.createElement("option");
    allIncome.value = "";
    allIncome.textContent = "All income groups";
    incomeSelect.appendChild(allIncome);

    (state.meta.income_groups || []).forEach((incomeGroup) => {
      const option = document.createElement("option");
      option.value = incomeGroup;
      option.textContent = incomeGroup;
      incomeSelect.appendChild(option);
    });

    regionSelect.value = state.selectedRegion;
    incomeSelect.value = state.selectedIncome;
  }

  function populateCompareCountries() {
    const select = el("compare-countries");
    select.innerHTML = "";

    state.countries.forEach((country) => {
      const option = document.createElement("option");
      option.value = country.iso3;
      option.textContent = `${country.name} (${country.iso3})`;
      select.appendChild(option);
    });
  }

  function initMap() {
    const svg = d3.select("#world-map");
    const width = 960;
    const height = 520;

    state.mapSvg = svg;
    svg.selectAll("*").remove();

    const defs = svg.append("defs");
    const oceanGradient = defs
      .append("radialGradient")
      .attr("id", "globe-ocean-gradient")
      .attr("cx", "35%")
      .attr("cy", "28%")
      .attr("r", "72%");
    oceanGradient.append("stop").attr("offset", "0%").attr("stop-color", "#f4fbff");
    oceanGradient.append("stop").attr("offset", "40%").attr("stop-color", "#9fd0df");
    oceanGradient.append("stop").attr("offset", "100%").attr("stop-color", "#3d7986");

    const atmosphereGradient = defs
      .append("radialGradient")
      .attr("id", "globe-atmosphere-gradient")
      .attr("cx", "42%")
      .attr("cy", "32%")
      .attr("r", "70%");
    atmosphereGradient.append("stop").attr("offset", "0%").attr("stop-color", "rgba(180,255,245,0.10)");
    atmosphereGradient.append("stop").attr("offset", "72%").attr("stop-color", "rgba(106,193,174,0.14)");
    atmosphereGradient.append("stop").attr("offset", "100%").attr("stop-color", "rgba(11,61,51,0.30)");

    const glowFilter = defs
      .append("filter")
      .attr("id", "globe-glow-filter")
      .attr("x", "-60%")
      .attr("y", "-60%")
      .attr("width", "220%")
      .attr("height", "220%");
    glowFilter.append("feGaussianBlur").attr("stdDeviation", 9).attr("result", "blur");
    const merge = glowFilter.append("feMerge");
    merge.append("feMergeNode").attr("in", "blur");
    merge.append("feMergeNode").attr("in", "SourceGraphic");

    state.mapProjection = d3
      .geoOrthographic()
      .scale(state.globeBaseScale)
      .translate([width / 2, height / 2])
      .rotate([-15, -18, 0])
      .clipAngle(90);

    state.mapPath = d3.geoPath(state.mapProjection);

    const root = svg.append("g").attr("class", "globe-root");

    state.mapShadow = root.append("ellipse").attr("class", "globe-shadow");
    state.mapGlow = root.append("circle").attr("class", "globe-glow").attr("filter", "url(#globe-glow-filter)");
    state.mapAtmosphere = root.append("circle").attr("class", "globe-atmosphere");
    state.mapSphere = root.append("path").datum({ type: "Sphere" }).attr("class", "globe-sphere");
    state.mapGraticule = root.append("path").datum(d3.geoGraticule10()).attr("class", "globe-graticule");
    state.mapLayer = root.append("g").attr("class", "globe-countries");

    state.mapLayer
      .selectAll("path.country")
      .data(state.worldFeatures, (d) => d.id)
      .join("path")
      .attr("class", "country no-data")
      .attr("d", state.mapPath)
      .on("mouseenter", handleCountryEnter)
      .on("mousemove", handleCountryMove)
      .on("mouseleave", handleCountryLeave)
      .on("click", handleCountryClick);

    const drag = d3
      .drag()
      .on("start", () => {
        state.isDraggingGlobe = true;
      })
      .on("drag", (event) => {
        const rot = state.mapProjection.rotate();
        const k = 0.35;
        const nextLambda = rot[0] + event.dx * k;
        const nextPhi = Math.max(-55, Math.min(55, rot[1] - event.dy * k));
        state.mapProjection.rotate([nextLambda, nextPhi, rot[2] || 0]);
        renderGlobeGeometry();
      })
      .on("end", () => {
        state.isDraggingGlobe = false;
      });

    svg.call(drag);

    const zoom = d3
      .zoom()
      .scaleExtent([0.82, 1.72])
      .filter((event) => event.type === "wheel")
      .on("zoom", (event) => {
        state.mapProjection.scale(state.globeBaseScale * event.transform.k);
        renderGlobeGeometry();
      });

    svg.call(zoom).on("dblclick.zoom", null);

    startGlobeAutoRotate();
    renderGlobeGeometry();
  }

  function renderGlobeGeometry() {
    if (!state.mapProjection || !state.mapPath) return;

    const [cx, cy] = state.mapProjection.translate();
    const r = state.mapProjection.scale();

    if (state.mapShadow) {
      state.mapShadow
        .attr("cx", cx)
        .attr("cy", cy + r + 22)
        .attr("rx", r * 0.88)
        .attr("ry", 24);
    }

    if (state.mapGlow) {
      state.mapGlow
        .attr("cx", cx)
        .attr("cy", cy)
        .attr("r", r + 10);
    }

    if (state.mapAtmosphere) {
      state.mapAtmosphere
        .attr("cx", cx)
        .attr("cy", cy)
        .attr("r", r + 4);
    }

    if (state.mapSphere) state.mapSphere.attr("d", state.mapPath);
    if (state.mapGraticule) state.mapGraticule.attr("d", state.mapPath);
    if (state.mapLayer) state.mapLayer.selectAll("path.country").attr("d", state.mapPath);
  }

  function stopGlobeAutoRotate() {
    if (state.globeRotateTimer) {
      state.globeRotateTimer.stop();
      state.globeRotateTimer = null;
    }
  }

  function startGlobeAutoRotate() {
    stopGlobeAutoRotate();
    state.globeRotateTimer = d3.timer(() => {
      if (!state.mapProjection || state.isDraggingGlobe || state.isHoveringCountry || document.hidden) return;
      const r = state.mapProjection.rotate();
      state.mapProjection.rotate([r[0] + 0.03, r[1], r[2] || 0]);
      renderGlobeGeometry();
    });
  }

  function handleCountryEnter(event, feature) {
    state.isHoveringCountry = true;
    const iso3 = feature._iso3;
    const row = iso3 ? state.mapValueByIso.get(iso3) : null;
    const countryName = row?.name || getCountryName(iso3) || feature.properties?.name || "Unknown";
    const indicator = indicatorMeta(state.selectedIndicator);

    const tip = el("map-tooltip");
    const unit = indicator && indicator.unit ? indicator.unit : "";
    tip.innerHTML = `
      <strong>${countryName}</strong><br/>
      <span>${indicator ? indicator.label : state.selectedIndicator} · ${state.selectedYear}</span><br/>
      <span>${row ? formatValueWithUnit(row.value, unit) : "No data"}</span>
    `;
    tip.hidden = false;
    handleCountryMove(event);
  }

  function handleCountryMove(event) {
    const tip = el("map-tooltip");
    if (tip.hidden) return;
    const parentRect = el("world-map").getBoundingClientRect();
    const x = event.clientX - parentRect.left + 12;
    const y = event.clientY - parentRect.top + 12;
    tip.style.left = `${Math.min(x, parentRect.width - 220)}px`;
    tip.style.top = `${Math.min(y, parentRect.height - 90)}px`;
  }

  function handleCountryLeave() {
    state.isHoveringCountry = false;
    el("map-tooltip").hidden = true;
  }

  function handleCountryClick(event, feature) {
    if (event.defaultPrevented) return;
    const iso3 = feature._iso3;
    if (!iso3) return;
    state.selectedIso3 = iso3;
    renderMapColors();
    openCountryPanel(iso3);
  }

  function renderMapColors() {
    const values = state.mapRows.map((row) => Number(row.value)).filter(Number.isFinite);
    const hasValues = values.length > 0;

    const min = hasValues ? d3.min(values) : null;
    const max = hasValues ? d3.max(values) : null;

    const color = hasValues
      ? d3.scaleSequential(d3.interpolateYlGnBu).domain(min === max ? [min - 1, max + 1] : [min, max])
      : null;

    state.mapValueByIso = new Map(state.mapRows.map((row) => [row.iso3, row]));

    state.mapLayer
      .selectAll("path.country")
      .attr("class", (feature) => {
        const iso3 = feature._iso3;
        const hasValue = iso3 && state.mapValueByIso.has(iso3);
        const selected = iso3 && iso3 === state.selectedIso3;
        return `country ${hasValue ? "" : "no-data"} ${selected ? "selected" : ""}`.trim();
      })
      .transition()
      .duration(200)
      .attr("fill", (feature) => {
        const iso3 = feature._iso3;
        const row = iso3 ? state.mapValueByIso.get(iso3) : null;
        if (!row || row.value == null || !color) return "#ced9d3";
        return color(Number(row.value));
      });

    renderGlobeGeometry();

    updateLegend(min, max, indicatorMeta(state.selectedIndicator));

    if (!hasValues) {
      setLoadingMessage("No data for this year/indicator/filter combination");
    } else {
      hideLoadingMessage();
    }
  }

  function updateLegend(min, max, indicator) {
    const legendIndicator = el("legend-indicator");
    const legendUnit = el("legend-unit");
    const gradient = el("legend-gradient");
    const minEl = el("legend-min");
    const maxEl = el("legend-max");

    legendIndicator.textContent = indicator ? indicator.label : "Indicator scale";
    legendUnit.textContent = indicator ? indicator.unit : "-";

    if (min == null || max == null) {
      gradient.style.background = "#d6e2dc";
      minEl.textContent = "-";
      maxEl.textContent = "-";
      return;
    }

    const colors = d3.range(0, 1.01, 0.1).map((t) => d3.interpolateYlGnBu(t));
    gradient.style.background = `linear-gradient(90deg, ${colors.join(",")})`;
    const unit = indicator && indicator.unit ? indicator.unit : "";
    minEl.textContent = formatValueWithUnit(min, unit);
    maxEl.textContent = formatValueWithUnit(max, unit);
  }

  function updateSelectionNote(mapSummary) {
    const note = el("selection-note");
    if (!note) return;
    const indicator = indicatorMeta(state.selectedIndicator);
    const indicatorLabel = indicator ? indicator.label : state.selectedIndicator;
    const unit = indicator && indicator.unit ? indicator.unit : "selected unit";
    const _ = mapSummary;
    note.innerHTML = `<strong>What this selection means:</strong> You are viewing <strong>${indicatorLabel}</strong> for <strong>${state.selectedYear}</strong> (${unit}).`;
  }

  function renderRegionCards() {
    const host = el("region-cards");
    host.innerHTML = "";

    if (!state.regionSummaryRows.length) {
      const empty = document.createElement("div");
      empty.className = "region-item";
      empty.textContent = "No regional aggregates for current filters";
      host.appendChild(empty);
      return;
    }

    const activeIndicator = indicatorMeta(state.selectedIndicator);
    const unit = activeIndicator && activeIndicator.unit ? activeIndicator.unit : "";

    state.regionSummaryRows.forEach((row) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `region-item ${state.selectedRegion === row.region ? "active" : ""}`;
      button.innerHTML = `
        <div class="region-name">${row.region}</div>
        <div class="region-value">${formatValueWithUnit(row.avg_value, unit)}</div>
        <div class="region-count">${row.countries_with_data} countries</div>
      `;
      button.addEventListener("click", () => {
        state.selectedRegion = state.selectedRegion === row.region ? "" : row.region;
        el("region-select").value = state.selectedRegion;
        refreshAtlas();
      });
      host.appendChild(button);
    });
  }

  function renderRegionChart() {
    const svg = d3.select("#region-chart");
    const width = 760;
    const height = 240;
    const margin = { top: 16, right: 16, bottom: 42, left: 70 };

    svg.selectAll("*").remove();

    const rows = state.regionSummaryRows.filter((row) => Number.isFinite(Number(row.avg_value)));
    if (!rows.length) return;

    const x = d3
      .scaleBand()
      .domain(rows.map((row) => row.region))
      .range([margin.left, width - margin.right])
      .padding(0.2);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(rows, (row) => Number(row.avg_value)) || 1])
      .nice()
      .range([height - margin.bottom, margin.top]);

    svg
      .append("g")
      .selectAll("rect")
      .data(rows)
      .join("rect")
      .attr("x", (row) => x(row.region))
      .attr("y", (row) => y(Number(row.avg_value)))
      .attr("width", x.bandwidth())
      .attr("height", (row) => y(0) - y(Number(row.avg_value)))
      .attr("fill", (row) => (row.region === state.selectedRegion ? "#145f4a" : "#2f9c7f"))
      .attr("opacity", 0.88)
      .style("cursor", "pointer")
      .on("click", (_, row) => {
        state.selectedRegion = state.selectedRegion === row.region ? "" : row.region;
        el("region-select").value = state.selectedRegion;
        refreshAtlas();
      });

    svg
      .append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .attr("class", "axis")
      .call(
        d3
          .axisBottom(x)
          .tickFormat((value) => value.replace("Middle East, North Africa, Afghanistan & Pakistan", "MENA+AP")),
      )
      .selectAll("text")
      .attr("transform", "rotate(-18)")
      .style("text-anchor", "end");

    svg.append("g").attr("transform", `translate(${margin.left},0)`).attr("class", "axis").call(d3.axisLeft(y).ticks(5));

    const unit = (indicatorMeta(state.selectedIndicator) || {}).unit || "";
    svg
      .append("text")
      .attr("x", margin.left)
      .attr("y", margin.top - 6)
      .attr("class", "story-note")
      .text(unit ? `Unit: ${unit}` : "");
  }

  async function refreshAtlas() {
    const token = ++state.refreshToken;
    setLoadingMessage("Loading data…");

    try {
      const mapParams = {
        year: state.selectedYear,
        indicator: state.selectedIndicator,
        region: state.selectedRegion || null,
        income_group: state.selectedIncome || null,
      };

      const regionsParams = {
        year: state.selectedYear,
        indicator: state.selectedIndicator,
        income_group: state.selectedIncome || null,
      };

      const [mapData, regions] = await Promise.all([
        fetchJSON(buildApiUrl("/map-data", mapParams)),
        fetchJSON(buildApiUrl("/regions/summary", regionsParams)),
      ]);

      if (token !== state.refreshToken) return;

      state.mapRows = mapData.rows || [];
      state.regionSummaryRows = regions.rows || [];

      renderMapColors();
      updateSelectionNote(mapData.summary || null);
      renderRegionCards();
      renderRegionChart();

      if (state.selectedIso3 && state.panelOpen) {
        await refreshCountryProfileOnly(state.selectedIso3);
      }

      await refreshCompareChart();
    } catch (error) {
      console.error(error);
      setLoadingMessage("Could not load map data. Check backend/API connection.");
      updateSelectionNote(null);
    }
  }

  function renderPanelKpis(profile) {
    const container = el("panel-kpis");
    container.innerHTML = "";

    const rows = PANEL_INDICATORS.map((indicatorCode) => {
      const meta = indicatorMeta(indicatorCode);
      return {
        code: indicatorCode,
        label: meta ? meta.label : indicatorCode,
        value: profile.values[indicatorCode],
        unit: meta && meta.unit ? meta.unit : "",
      };
    });

    rows.forEach((row) => {
      const block = document.createElement("div");
      block.className = "kpi-item";
      block.innerHTML = `
        <span class="kpi-label">${row.label}</span>
        <span class="kpi-value">${formatValue(row.value)}</span>
        <span class="kpi-unit">${row.unit || "-"}</span>
      `;
      container.appendChild(block);
    });
  }

  function drawMiniChart(svgId, points, color, unit) {
    const svg = d3.select(svgId);
    const width = 420;
    const height = 160;
    const margin = { top: 12, right: 12, bottom: 26, left: 48 };

    svg.selectAll("*").remove();

    if (!points || !points.length) {
      svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "#708a80")
        .attr("font-size", 12)
        .text("No data");
      return;
    }

    const x = d3
      .scaleLinear()
      .domain(d3.extent(points, (d) => d.year))
      .range([margin.left, width - margin.right]);

    const y = d3
      .scaleLinear()
      .domain(d3.extent(points, (d) => d.value))
      .nice()
      .range([height - margin.bottom, margin.top]);

    const line = d3
      .line()
      .x((d) => x(d.year))
      .y((d) => y(d.value))
      .curve(d3.curveMonotoneX);

    svg
      .append("path")
      .datum(points)
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 2.2)
      .attr("d", line);

    svg
      .append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format("d")));

    svg.append("g").attr("class", "axis").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(4));

    const hoverLine = svg
      .append("line")
      .attr("class", "chart-hover-line")
      .attr("y1", margin.top)
      .attr("y2", height - margin.bottom)
      .style("display", "none");

    const hoverPoint = svg.append("circle").attr("class", "chart-hover-point").attr("r", 4).style("display", "none");

    const hoverLabel = svg
      .append("text")
      .attr("x", margin.left)
      .attr("y", margin.top)
      .attr("font-size", 11)
      .attr("fill", "#2e4b40")
      .attr("font-weight", 700)
      .text("");

    const bisect = d3.bisector((d) => d.year).left;

    svg
      .append("rect")
      .attr("x", margin.left)
      .attr("y", margin.top)
      .attr("width", width - margin.left - margin.right)
      .attr("height", height - margin.top - margin.bottom)
      .attr("fill", "transparent")
      .on("mousemove", (event) => {
        const mouseX = d3.pointer(event)[0];
        const year = x.invert(mouseX);
        const idx = Math.max(0, Math.min(points.length - 1, bisect(points, year)));
        const candidate = points[idx];
        if (!candidate) return;

        hoverLine
          .style("display", null)
          .attr("x1", x(candidate.year))
          .attr("x2", x(candidate.year));

        hoverPoint
          .style("display", null)
          .attr("cx", x(candidate.year))
          .attr("cy", y(candidate.value));

        hoverLabel.text(`${candidate.year}: ${formatValue(candidate.value)} ${unit || ""}`);
      })
      .on("mouseleave", () => {
        hoverLine.style("display", "none");
        hoverPoint.style("display", "none");
        hoverLabel.text("");
      });
  }

  async function refreshCountryProfileOnly(iso3) {
    try {
      const profile = await fetchJSON(buildApiUrl(`/country/${iso3}/profile`, { year: state.selectedYear }));
      renderPanelKpis(profile);
    } catch {
      // If selected year not available for this country, keep old profile KPIs.
    }
  }

  async function openCountryPanel(iso3) {
    state.panelOpen = true;
    state.selectedIso3 = iso3;

    const panel = el("country-panel");
    panel.classList.add("open");

    try {
      const [profile, timeseries] = await Promise.all([
        fetchJSON(buildApiUrl(`/country/${iso3}/profile`, { year: state.selectedYear })),
        fetchJSON(buildApiUrl(`/country/${iso3}/timeseries`, { indicators: PANEL_INDICATORS.join(",") })),
      ]);

      el("panel-country-name").textContent = profile.name || iso3;
      el("panel-country-meta").textContent = `${profile.region || "Unknown region"} · ${profile.income_group || "Unknown income group"} · Year ${profile.selected_year}`;

      renderPanelKpis(profile);

      PANEL_INDICATORS.forEach((code) => {
        const series = (timeseries.series && timeseries.series[code]) || [];
        drawMiniChart(`#chart-${code}`, series, PANEL_COLORS[code] || "#1f8a70", (indicatorMeta(code) || {}).unit || "");
      });
    } catch (error) {
      console.error(error);
      el("panel-country-name").textContent = iso3;
      el("panel-country-meta").textContent = "Could not load country profile";
      PANEL_INDICATORS.forEach((code) => drawMiniChart(`#chart-${code}`, [], "#9fbab0", ""));
    }
  }

  function closeCountryPanel() {
    state.panelOpen = false;
    el("country-panel").classList.remove("open");
  }

  function getCompareSelectedCountries() {
    const select = el("compare-countries");
    const values = Array.from(select.selectedOptions).map((option) => option.value);
    return values.slice(0, 5);
  }

  function renderCompareLegend(rows) {
    const host = el("compare-legend");
    host.innerHTML = "";

    if (!rows.length) return;

    const color = d3.scaleOrdinal(d3.schemeTableau10).domain(rows.map((row) => row.iso3));

    rows.forEach((row) => {
      const item = document.createElement("button");
      const inactive = state.compareHiddenCountries.has(row.iso3);
      item.type = "button";
      item.className = `compare-item ${inactive ? "inactive" : ""}`;
      item.innerHTML = `
        <span class="compare-dot" style="background:${color(row.iso3)}"></span>
        <span>${row.name}</span>
      `;
      item.addEventListener("click", () => {
        if (state.compareHiddenCountries.has(row.iso3)) state.compareHiddenCountries.delete(row.iso3);
        else state.compareHiddenCountries.add(row.iso3);
        drawCompareChart(rows);
        renderCompareLegend(rows);
      });
      host.appendChild(item);
    });
  }

  function drawCompareChart(rows) {
    const svg = d3.select("#compare-chart");
    const width = 980;
    const height = 300;
    const margin = { top: 20, right: 24, bottom: 36, left: 58 };

    svg.selectAll("*").remove();

    const activeRows = rows.filter((row) => !state.compareHiddenCountries.has(row.iso3));
    const points = activeRows.flatMap((row) => row.points);

    if (!activeRows.length || !points.length) {
      svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "#7a9288")
        .text("Select countries to compare");
      return;
    }

    const x = d3
      .scaleLinear()
      .domain(d3.extent(points, (d) => d.year))
      .range([margin.left, width - margin.right]);

    const y = d3
      .scaleLinear()
      .domain(d3.extent(points, (d) => d.value))
      .nice()
      .range([height - margin.bottom, margin.top]);
    const unit = (indicatorMeta(state.compareIndicator) || {}).unit || "";

    const color = d3.scaleOrdinal(d3.schemeTableau10).domain(activeRows.map((row) => row.iso3));

    const line = d3
      .line()
      .x((d) => x(d.year))
      .y((d) => y(d.value))
      .curve(d3.curveMonotoneX);

    svg
      .append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(7).tickFormat(d3.format("d")));

    svg.append("g").attr("class", "axis").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(5));

    svg
      .append("text")
      .attr("x", margin.left)
      .attr("y", margin.top - 6)
      .attr("class", "story-note")
      .text(unit ? `Unit: ${unit}` : "");

    const linesGroup = svg.append("g");

    linesGroup
      .selectAll("path.compare-line")
      .data(activeRows)
      .join("path")
      .attr("class", "compare-line")
      .attr("fill", "none")
      .attr("stroke", (row) => color(row.iso3))
      .attr("stroke-width", 2.4)
      .attr("d", (row) => line(row.points));

    const hoverLine = svg
      .append("line")
      .attr("class", "chart-hover-line")
      .attr("y1", margin.top)
      .attr("y2", height - margin.bottom)
      .style("display", "none");

    const focusGroup = svg.append("g");
    const bisect = d3.bisector((d) => d.year).left;

    svg
      .append("rect")
      .attr("x", margin.left)
      .attr("y", margin.top)
      .attr("width", width - margin.left - margin.right)
      .attr("height", height - margin.top - margin.bottom)
      .attr("fill", "transparent")
      .on("mousemove", (event) => {
        const mouseX = d3.pointer(event)[0];
        const year = x.invert(mouseX);

        hoverLine.style("display", null).attr("x1", mouseX).attr("x2", mouseX);
        focusGroup.selectAll("*").remove();

        activeRows.forEach((row) => {
          const idx = Math.max(0, Math.min(row.points.length - 1, bisect(row.points, year)));
          const point = row.points[idx];
          if (!point) return;

          focusGroup
            .append("circle")
            .attr("cx", x(point.year))
            .attr("cy", y(point.value))
            .attr("r", 3.4)
            .attr("fill", "#fff")
            .attr("stroke", color(row.iso3))
            .attr("stroke-width", 2);
        });
      })
      .on("mouseleave", () => {
        hoverLine.style("display", "none");
        focusGroup.selectAll("*").remove();
      });
  }

  async function refreshCompareChart() {
    const selectedCountries = getCompareSelectedCountries();
    state.compareSelectedCountries = selectedCountries;

    if (!selectedCountries.length) {
      renderCompareLegend([]);
      drawCompareChart([]);
      return;
    }

    const indicator = state.compareIndicator;

    try {
      const rows = await Promise.all(
        selectedCountries.map(async (iso3) => {
          const response = await fetchJSON(buildApiUrl(`/country/${iso3}/timeseries`, { indicators: indicator }));
          return {
            iso3,
            name: response.name || iso3,
            points: (response.series[indicator] || []).map((point) => ({ year: Number(point.year), value: Number(point.value) })),
          };
        }),
      );

      renderCompareLegend(rows);
      drawCompareChart(rows);
    } catch (error) {
      console.error(error);
      renderCompareLegend([]);
      drawCompareChart([]);
    }
  }

  function averageBy(rows, key) {
    const grouped = d3.group(
      rows.filter((row) => Number.isFinite(Number(row.value))),
      (row) => row[key] || "Unknown",
    );
    const result = new Map();
    grouped.forEach((groupRows, groupKey) => {
      result.set(groupKey, d3.mean(groupRows, (row) => Number(row.value)));
    });
    return result;
  }

  function renderStoryLegend(containerId, items) {
    const container = el(containerId);
    if (!container) return;
    container.innerHTML = "";
    items.forEach((item) => {
      const node = document.createElement("span");
      node.className = "story-legend-item";
      node.innerHTML = `<span class="story-legend-dot" style="background:${item.color}"></span>${item.label}`;
      container.appendChild(node);
    });
  }

  function setText(id, value) {
    const node = el(id);
    if (!node) return;
    node.textContent = value;
  }

  async function fetchMapSeries(indicator, years, concurrency) {
    const out = new Array(years.length);
    let cursor = 0;
    const workerCount = Math.min(concurrency, years.length);

    async function worker() {
      while (cursor < years.length) {
        const index = cursor;
        cursor += 1;
        const year = years[index];
        out[index] = await fetchJSON(buildApiUrl("/map-data", { year, indicator }));
      }
    }

    await Promise.all(d3.range(workerCount).map(() => worker()));
    return out;
  }

  function drawStoryGlobalChart() {
    const svg = d3.select("#story-global-chart");
    const width = 980;
    const height = 320;
    const margin = { top: 20, right: 20, bottom: 42, left: 70 };
    const series = state.story.tfrByYear.filter((row) => Number.isFinite(row.globalAvg));

    svg.selectAll("*").remove();
    if (!series.length) return;

    const x = d3
      .scaleLinear()
      .domain(d3.extent(series, (d) => d.year))
      .range([margin.left, width - margin.right]);
    const y = d3
      .scaleLinear()
      .domain(d3.extent(series, (d) => d.globalAvg))
      .nice()
      .range([height - margin.bottom, margin.top]);

    svg
      .append("g")
      .attr("class", "story-gridline")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(5).tickSize(-(width - margin.left - margin.right)).tickFormat(""))
      .call((g) => g.select(".domain").remove());

    svg
      .append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(8).tickFormat(d3.format("d")));
    svg.append("g").attr("class", "axis").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(5));

    const area = d3
      .area()
      .x((d) => x(d.year))
      .y0(height - margin.bottom)
      .y1((d) => y(d.globalAvg))
      .curve(d3.curveMonotoneX);
    const line = d3
      .line()
      .x((d) => x(d.year))
      .y((d) => y(d.globalAvg))
      .curve(d3.curveMonotoneX);

    svg
      .append("path")
      .datum(series)
      .attr("fill", "rgba(28, 124, 95, 0.18)")
      .attr("d", area);
    svg
      .append("path")
      .datum(series)
      .attr("fill", "none")
      .attr("stroke", "#156e56")
      .attr("stroke-width", 2.8)
      .attr("d", line);

    const first = series[0];
    const last = series[series.length - 1];
    [first, last].forEach((point, index) => {
      svg
        .append("circle")
        .attr("cx", x(point.year))
        .attr("cy", y(point.globalAvg))
        .attr("r", 4)
        .attr("fill", "#156e56");

      svg
        .append("text")
        .attr("x", x(point.year) + (index ? -4 : 8))
        .attr("y", y(point.globalAvg) - 8)
        .attr("text-anchor", index ? "end" : "start")
        .attr("class", "story-note")
        .text(`${point.year}: ${formatValueWithUnit(point.globalAvg, "births per woman")}`);
    });

    svg
      .append("text")
      .attr("x", margin.left)
      .attr("y", margin.top - 6)
      .attr("class", "story-axis-label")
      .text("TFR (births per woman)");
  }

  function drawStoryRegionChart() {
    const svg = d3.select("#story-region-chart");
    const width = 980;
    const height = 340;
    const margin = { top: 24, right: 20, bottom: 44, left: 76 };
    const regions = state.meta.regions || [];

    svg.selectAll("*").remove();
    if (!regions.length || !state.story.tfrByYear.length) return;

    const series = regions.map((region) => ({
      region,
      points: state.story.tfrByYear
        .map((row) => ({ year: row.year, value: row.byRegion.get(region) }))
        .filter((row) => Number.isFinite(row.value)),
    }));

    const allPoints = series.flatMap((row) => row.points);
    if (!allPoints.length) return;

    const x = d3
      .scaleLinear()
      .domain(d3.extent(allPoints, (d) => d.year))
      .range([margin.left, width - margin.right]);
    const y = d3
      .scaleLinear()
      .domain(d3.extent(allPoints, (d) => d.value))
      .nice()
      .range([height - margin.bottom, margin.top]);
    const color = d3.scaleOrdinal(d3.schemeTableau10).domain(regions);
    const line = d3
      .line()
      .x((d) => x(d.year))
      .y((d) => y(d.value))
      .curve(d3.curveMonotoneX);

    svg
      .append("g")
      .attr("class", "story-gridline")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(6).tickSize(-(width - margin.left - margin.right)).tickFormat(""))
      .call((g) => g.select(".domain").remove());

    svg
      .append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(8).tickFormat(d3.format("d")));
    svg.append("g").attr("class", "axis").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(6));

    svg
      .append("g")
      .selectAll("path")
      .data(series)
      .join("path")
      .attr("fill", "none")
      .attr("stroke", (row) => color(row.region))
      .attr("stroke-width", 2)
      .attr("opacity", 0.95)
      .attr("d", (row) => line(row.points));

    svg
      .append("text")
      .attr("x", margin.left)
      .attr("y", margin.top - 8)
      .attr("class", "story-axis-label")
      .text("TFR by region (births per woman)");

    renderStoryLegend(
      "story-region-legend",
      regions.map((region) => ({
        label: region,
        color: color(region),
      })),
    );
  }

  function drawStoryIncomeChart() {
    const svg = d3.select("#story-income-chart");
    const width = 980;
    const height = 340;
    const margin = { top: 24, right: 20, bottom: 44, left: 76 };
    const incomes = (state.meta.income_groups || []).filter((group) => group && group !== "Not classified");

    svg.selectAll("*").remove();
    if (!incomes.length || !state.story.tfrByYear.length) return;

    const series = incomes.map((income) => ({
      income,
      points: state.story.tfrByYear
        .map((row) => ({ year: row.year, value: row.byIncome.get(income) }))
        .filter((row) => Number.isFinite(row.value)),
    }));
    const allPoints = series.flatMap((row) => row.points);
    if (!allPoints.length) return;

    const x = d3
      .scaleLinear()
      .domain(d3.extent(allPoints, (d) => d.year))
      .range([margin.left, width - margin.right]);
    const y = d3
      .scaleLinear()
      .domain(d3.extent(allPoints, (d) => d.value))
      .nice()
      .range([height - margin.bottom, margin.top]);

    const colorMap = {
      "High income": "#145f4a",
      "Upper middle income": "#2f7c64",
      "Lower middle income": "#4e9f84",
      "Low income": "#7ab79b",
    };
    const color = d3.scaleOrdinal().domain(incomes).range(incomes.map((income) => colorMap[income] || "#4a8b75"));
    const line = d3
      .line()
      .x((d) => x(d.year))
      .y((d) => y(d.value))
      .curve(d3.curveMonotoneX);

    svg
      .append("g")
      .attr("class", "story-gridline")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(6).tickSize(-(width - margin.left - margin.right)).tickFormat(""))
      .call((g) => g.select(".domain").remove());

    svg
      .append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(8).tickFormat(d3.format("d")));
    svg.append("g").attr("class", "axis").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(6));

    svg
      .append("g")
      .selectAll("path")
      .data(series)
      .join("path")
      .attr("fill", "none")
      .attr("stroke", (row) => color(row.income))
      .attr("stroke-width", 2.4)
      .attr("d", (row) => line(row.points));

    svg
      .append("text")
      .attr("x", margin.left)
      .attr("y", margin.top - 8)
      .attr("class", "story-axis-label")
      .text("TFR by income group (births per woman)");

    renderStoryLegend(
      "story-income-legend",
      incomes.map((income) => ({
        label: income,
        color: color(income),
      })),
    );
  }

  function drawStoryScatter(svgId, config) {
    const svg = d3.select(svgId);
    const width = 980;
    const height = 360;
    const margin = { top: 24, right: 20, bottom: 52, left: 78 };
    svg.selectAll("*").remove();

    const rows = config.rows
      .map((row) => ({
        ...row,
        x: toNumberOrNull(config.xAccessor(row)),
        y: toNumberOrNull(config.yAccessor(row)),
      }))
      .filter((row) => row.x != null && row.y != null);

    if (!rows.length) return;

    const x = config.useLogX
      ? d3.scaleLog().domain(d3.extent(rows, (d) => d.x)).nice().range([margin.left, width - margin.right])
      : d3.scaleLinear().domain(d3.extent(rows, (d) => d.x)).nice().range([margin.left, width - margin.right]);
    const y = d3
      .scaleLinear()
      .domain(d3.extent(rows, (d) => d.y))
      .nice()
      .range([height - margin.bottom, margin.top]);

    const groups = Array.from(new Set(rows.map((row) => config.colorAccessor(row))));
    const color = d3.scaleOrdinal(d3.schemeTableau10).domain(groups);

    svg
      .append("g")
      .attr("class", "story-gridline")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(6).tickSize(-(width - margin.left - margin.right)).tickFormat(""))
      .call((g) => g.select(".domain").remove());

    svg
      .append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(config.useLogX ? d3.axisBottom(x).ticks(7, "~s") : d3.axisBottom(x).ticks(7));
    svg.append("g").attr("class", "axis").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(6));

    const dots = svg.append("g").attr("class", "story-tooltip-layer");
    dots
      .selectAll("circle")
      .data(rows)
      .join("circle")
      .attr("cx", (d) => x(d.x))
      .attr("cy", (d) => y(d.y))
      .attr("r", 3.3)
      .attr("fill", (d) => color(config.colorAccessor(d)))
      .attr("opacity", 0.72)
      .append("title")
      .text(
        (d) =>
          `${d.name || d.iso3}\n${config.xLabel}: ${formatValueWithUnit(d.x, config.xUnit)}\n${config.yLabel}: ${formatValueWithUnit(
            d.y,
            config.yUnit,
          )}`,
      );

    const regressionRows = rows.map((row) => ({
      x: config.useLogX ? Math.log10(row.x) : row.x,
      y: row.y,
    }));
    const regression = regressionLine(
      regressionRows,
      (row) => row.x,
      (row) => row.y,
    );

    if (regression) {
      const xDomain = d3.extent(rows, (d) => d.x);
      const x1 = xDomain[0];
      const x2 = xDomain[1];
      const rx1 = config.useLogX ? Math.log10(x1) : x1;
      const rx2 = config.useLogX ? Math.log10(x2) : x2;
      const y1 = regression.slope * rx1 + regression.intercept;
      const y2 = regression.slope * rx2 + regression.intercept;

      svg
        .append("line")
        .attr("x1", x(x1))
        .attr("y1", y(y1))
        .attr("x2", x(x2))
        .attr("y2", y(y2))
        .attr("stroke", "#2f3f5f")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5 4")
        .attr("opacity", 0.9);
    }

    svg
      .append("text")
      .attr("x", margin.left)
      .attr("y", margin.top - 8)
      .attr("class", "story-axis-label")
      .text(config.yLabel);
    svg
      .append("text")
      .attr("x", width - margin.right)
      .attr("y", height - 10)
      .attr("text-anchor", "end")
      .attr("class", "story-axis-label")
      .text(config.xLabel);
  }

  function drawStoryDeclineChart() {
    const svg = d3.select("#story-decline-chart");
    const width = 700;
    const height = 360;
    const margin = { top: 20, right: 18, bottom: 28, left: 210 };
    svg.selectAll("*").remove();

    const firstRows = state.story.tfrRowsByYear.get(state.story.firstYear) || [];
    const latestRows = state.story.latestTfrRows || [];
    const latestByIso = new Map(latestRows.map((row) => [row.iso3, row]));

    const declines = firstRows
      .map((row) => {
        const latest = latestByIso.get(row.iso3);
        const firstValue = toNumberOrNull(row.value);
        const latestValue = latest ? toNumberOrNull(latest.value) : null;
        if (firstValue == null || latestValue == null) return null;
        return {
          iso3: row.iso3,
          name: row.name || getCountryName(row.iso3) || row.iso3,
          firstValue,
          latestValue,
          drop: firstValue - latestValue,
        };
      })
      .filter((row) => row && row.drop > 0)
      .sort((a, b) => d3.descending(a.drop, b.drop))
      .slice(0, 10);

    if (!declines.length) return;

    const x = d3
      .scaleLinear()
      .domain([0, d3.max(declines, (d) => d.drop) || 1])
      .nice()
      .range([margin.left, width - margin.right]);
    const y = d3
      .scaleBand()
      .domain(declines.map((d) => d.name))
      .range([margin.top, height - margin.bottom])
      .padding(0.2);

    svg
      .append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(5));
    svg.append("g").attr("class", "axis").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y));

    svg
      .append("g")
      .selectAll("rect")
      .data(declines)
      .join("rect")
      .attr("x", margin.left)
      .attr("y", (d) => y(d.name))
      .attr("width", (d) => x(d.drop) - margin.left)
      .attr("height", y.bandwidth())
      .attr("fill", "#2f8d71")
      .attr("opacity", 0.88);

    svg
      .append("g")
      .selectAll("text.value")
      .data(declines)
      .join("text")
      .attr("x", (d) => x(d.drop) + 6)
      .attr("y", (d) => y(d.name) + y.bandwidth() / 2 + 4)
      .attr("class", "story-note")
      .text((d) => `-${formatValue(d.drop)}`);

    svg
      .append("text")
      .attr("x", margin.left)
      .attr("y", margin.top - 8)
      .attr("class", "story-axis-label")
      .text("TFR decline from first to latest year (births per woman)");

    const list = el("story-decline-list");
    if (list) {
      list.innerHTML = "";
      declines.forEach((row) => {
        const item = document.createElement("li");
        item.textContent = `${row.name}: ${formatValue(row.firstValue)} -> ${formatValue(row.latestValue)} (-${formatValue(
          row.drop,
        )} births per woman)`;
        list.appendChild(item);
      });
    }
  }

  function renderStoryFindings() {
    if (!state.story.ready) return;

    const first = state.story.tfrByYear[0];
    const last = state.story.tfrByYear[state.story.tfrByYear.length - 1];
    const delta = first && last ? last.globalAvg - first.globalAvg : null;
    const africa = last ? last.byRegion.get("Sub-Saharan Africa") : null;
    const highIncome = last ? last.byIncome.get("High income") : null;
    const lowIncome = last ? last.byIncome.get("Low income") : null;

    setText(
      "finding-global-delta",
      delta == null
        ? "Insufficient data"
        : `Average TFR changed from ${formatValue(first.globalAvg)} to ${formatValue(last.globalAvg)} (${formatValue(delta)} births per woman).`,
    );
    setText(
      "finding-africa-level",
      africa == null
        ? "Insufficient data"
        : `In ${state.story.latestYear}, the regional average TFR is ${formatValueWithUnit(africa, "births per woman")}.`,
    );
    setText(
      "finding-income-gap",
      highIncome == null || lowIncome == null
        ? "Insufficient data"
        : `${state.story.latestYear}: High income ${formatValue(highIncome)} vs Low income ${formatValue(lowIncome)} births per woman.`,
    );

    const corr = state.story.correlations.gdpVsTfr;
    const corrText =
      corr == null
        ? "Correlation unavailable"
        : corr < -0.35
          ? `Strong inverse relationship (r=${formatValue(corr)}): as GDP per capita rises, TFR is usually lower.`
          : `Inverse relationship is present (r=${formatValue(corr)}).`;
    setText("finding-gdp-link", corrText);

    if (first && last) {
      setText(
        "story-global-summary",
        `From ${first.year} to ${last.year}, global average TFR declined from ${formatValue(first.globalAvg)} to ${formatValue(
          last.globalAvg,
        )} births per woman.`,
      );
    }

    if (last) {
      const topRegion = Array.from(last.byRegion.entries()).sort((a, b) => d3.descending(a[1], b[1]))[0];
      if (topRegion) {
        setText(
          "story-region-summary",
          `In the latest year (${state.story.latestYear}), the highest regional average TFR is in ${topRegion[0]}: ${formatValueWithUnit(
            topRegion[1],
            "births per woman",
          )}.`,
        );
      }
    }

    if (highIncome != null && lowIncome != null) {
      setText(
        "story-income-summary",
        `The gap between Low income and High income in ${state.story.latestYear} is ${formatValue(
          lowIncome - highIncome,
        )} births per woman.`,
      );
    }

    const corrEdu = state.story.correlations.enrollmentVsAdolescent;
    if (corrEdu != null) {
      setText(
        "story-education-scatter-summary",
        `At country level, there is an inverse relationship between female secondary enrollment and adolescent fertility (r=${formatValue(
          corrEdu,
        )}).`,
      );
    }
  }

  function drawStoryScatters() {
    const latestTfrByIso = new Map(state.story.latestTfrRows.map((row) => [row.iso3, row]));
    const gdpRows = state.story.latestGdpRows
      .map((row) => {
        const tfr = latestTfrByIso.get(row.iso3);
        if (!tfr) return null;
        return {
          iso3: row.iso3,
          name: row.name,
          region: row.region || "Unknown",
          gdp: toNumberOrNull(row.value),
          tfr: toNumberOrNull(tfr.value),
        };
      })
      .filter((row) => row && row.gdp != null && row.gdp > 0 && row.tfr != null);

    drawStoryScatter("#story-gdp-scatter", {
      rows: gdpRows,
      xAccessor: (row) => row.gdp,
      yAccessor: (row) => row.tfr,
      colorAccessor: (row) => row.region,
      xLabel: "GDP per capita (current US$)",
      yLabel: "TFR (births per woman)",
      xUnit: "current US$",
      yUnit: "births per woman",
      useLogX: true,
    });

    const enrollmentByIso = new Map(state.story.latestEnrollmentRows.map((row) => [row.iso3, row]));
    const educationRows = state.story.latestAdolescentRows
      .map((row) => {
        const enrollment = enrollmentByIso.get(row.iso3);
        if (!enrollment) return null;
        return {
          iso3: row.iso3,
          name: row.name,
          income: row.income_group || "Unknown",
          adolescent: toNumberOrNull(row.value),
          enrollment: toNumberOrNull(enrollment.value),
        };
      })
      .filter((row) => row && row.adolescent != null && row.enrollment != null);

    drawStoryScatter("#story-education-scatter", {
      rows: educationRows,
      xAccessor: (row) => row.enrollment,
      yAccessor: (row) => row.adolescent,
      colorAccessor: (row) => row.income,
      xLabel: "Female secondary enrollment (% gross)",
      yLabel: "Adolescent fertility (births per 1,000 women ages 15-19)",
      xUnit: "% gross",
      yUnit: "births per 1,000 women ages 15-19",
      useLogX: false,
    });
  }

  async function loadStoryAnalytics() {
    if (state.story.ready || !state.meta) return;

    try {
      const minYear = Number(state.meta.min_year || 1970);
      const maxYear = Number(state.meta.max_year || 2024);
      const years = createYearRange(minYear, maxYear);

      const tfrSeriesRaw = await fetchMapSeries("tfr", years, 8);

      const tfrByYear = tfrSeriesRaw.map((response, index) => {
        const year = years[index];
        const rows = response.rows || [];
        return {
          year,
          globalAvg: mean(rows.map((row) => Number(row.value))),
          byRegion: averageBy(rows, "region"),
          byIncome: averageBy(rows, "income_group"),
        };
      });

      state.story.yearSeries = years;
      state.story.tfrByYear = tfrByYear;
      state.story.tfrRowsByYear = new Map(tfrSeriesRaw.map((response, index) => [years[index], response.rows || []]));
      state.story.firstYear = years[0];
      state.story.latestYear = years[years.length - 1];
      state.story.latestTfrRows = state.story.tfrRowsByYear.get(state.story.latestYear) || [];

      const [gdpLatest, enrollmentLatest, adolescentLatest] = await Promise.all([
        fetchJSON(buildApiUrl("/map-data", { year: state.story.latestYear, indicator: "gdp_per_capita" })),
        fetchJSON(buildApiUrl("/map-data", { year: state.story.latestYear, indicator: "female_secondary_enrollment" })),
        fetchJSON(buildApiUrl("/map-data", { year: state.story.latestYear, indicator: "adolescent_fertility" })),
      ]);

      state.story.latestGdpRows = gdpLatest.rows || [];
      state.story.latestEnrollmentRows = enrollmentLatest.rows || [];
      state.story.latestAdolescentRows = adolescentLatest.rows || [];

      const latestTfrByIso = new Map(state.story.latestTfrRows.map((row) => [row.iso3, row]));
      const corrRowsGdp = state.story.latestGdpRows
        .map((row) => {
          const tfr = latestTfrByIso.get(row.iso3);
          if (!tfr) return null;
          return {
            gdp: toNumberOrNull(row.value),
            tfr: toNumberOrNull(tfr.value),
          };
        })
        .filter((row) => row && row.gdp != null && row.gdp > 0 && row.tfr != null)
        .map((row) => ({ ...row, logGdp: Math.log10(row.gdp) }));

      state.story.correlations.gdpVsTfr = pearsonCorrelation(
        corrRowsGdp,
        (row) => row.logGdp,
        (row) => row.tfr,
      );

      const enrollmentByIso = new Map(state.story.latestEnrollmentRows.map((row) => [row.iso3, row]));
      const corrRowsEducation = state.story.latestAdolescentRows
        .map((row) => {
          const enrollment = enrollmentByIso.get(row.iso3);
          if (!enrollment) return null;
          return {
            enrollment: toNumberOrNull(enrollment.value),
            adolescent: toNumberOrNull(row.value),
          };
        })
        .filter((row) => row && row.enrollment != null && row.adolescent != null);

      state.story.correlations.enrollmentVsAdolescent = pearsonCorrelation(
        corrRowsEducation,
        (row) => row.enrollment,
        (row) => row.adolescent,
      );

      state.story.ready = true;

      drawStoryGlobalChart();
      drawStoryRegionChart();
      drawStoryIncomeChart();
      drawStoryScatters();
      drawStoryDeclineChart();
      renderStoryFindings();
    } catch (error) {
      console.error(error);
      setText("finding-global-delta", "Failed to load analytical findings");
      setText("finding-africa-level", "Check backend/API connection");
      setText("finding-income-gap", "Could not compute");
      setText("finding-gdp-link", "Could not compute");
    }
  }

  function stopPlay() {
    if (state.playTimer) {
      clearInterval(state.playTimer);
      state.playTimer = null;
    }
    el("play-btn").textContent = "Play";
  }

  function startPlay() {
    if (state.playTimer) return;
    el("play-btn").textContent = "Pause";

    state.playTimer = window.setInterval(async () => {
      const maxYear = Number(state.meta.max_year || 2024);
      const minYear = Number(state.meta.min_year || 1970);

      state.selectedYear = state.selectedYear >= maxYear ? minYear : state.selectedYear + 1;
      el("year-slider").value = String(state.selectedYear);
      updateYearLabel();
      await refreshAtlas();
    }, 850);
  }

  function bindEvents() {
    el("indicator-select").addEventListener("change", async (event) => {
      state.selectedIndicator = event.target.value;
      if (!state.compareIndicator) {
        state.compareIndicator = state.selectedIndicator;
        el("compare-indicator-select").value = state.compareIndicator;
      }
      await refreshAtlas();
    });

    el("compare-indicator-select").addEventListener("change", async (event) => {
      state.compareIndicator = event.target.value;
      await refreshCompareChart();
    });

    el("region-select").addEventListener("change", async (event) => {
      state.selectedRegion = event.target.value;
      await refreshAtlas();
    });

    el("income-select").addEventListener("change", async (event) => {
      state.selectedIncome = event.target.value;
      await refreshAtlas();
    });

    el("year-slider").addEventListener("input", async (event) => {
      state.selectedYear = Number(event.target.value);
      updateYearLabel();
      await refreshAtlas();
    });

    el("play-btn").addEventListener("click", () => {
      if (state.playTimer) stopPlay();
      else startPlay();
    });

    el("reset-filters-btn").addEventListener("click", async () => {
      state.selectedRegion = "";
      state.selectedIncome = "";
      el("region-select").value = "";
      el("income-select").value = "";
      await refreshAtlas();
    });

    el("compare-countries").addEventListener("change", async () => {
      state.compareHiddenCountries.clear();
      await refreshCompareChart();
    });

    el("close-panel").addEventListener("click", () => {
      state.selectedIso3 = null;
      renderMapColors();
      closeCountryPanel();
    });

    document.addEventListener("pointerdown", (event) => {
      if (!state.panelOpen) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("#country-panel")) return;
      if (target.closest(".country")) return;
      state.selectedIso3 = null;
      renderMapColors();
      closeCountryPanel();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && state.panelOpen) {
        state.selectedIso3 = null;
        renderMapColors();
        closeCountryPanel();
      }
    });
  }

  async function bootstrap() {
    try {
      setupReveal();
      const [meta, indicators, countries, worldFeatures] = await Promise.all([
        fetchJSON(buildApiUrl("/atlas/meta")),
        fetchJSON(buildApiUrl("/indicators")),
        fetchJSON(buildApiUrl("/countries", { limit: 2000, offset: 0 })),
        loadWorldFeatures(),
      ]);

      state.meta = meta;
      state.indicators = indicators;
      state.countries = countries;
      state.worldFeatures = worldFeatures;

      state.countriesByIso = new Map(countries.map((country) => [country.iso3, country]));

      state.selectedYear = Number(meta.max_year || 2024);
      state.selectedIndicator = indicators.some((item) => item.code === "tfr") ? "tfr" : indicators[0].code;
      state.compareIndicator = state.selectedIndicator;

      const slider = el("year-slider");
      slider.min = String(meta.min_year || 1970);
      slider.max = String(meta.max_year || 2024);
      slider.value = String(state.selectedYear);
      updateYearLabel();

      populateIndicatorSelects();
      populateFilterSelects();
      populateCompareCountries();
      initMap();
      bindEvents();

      await refreshAtlas();
      await refreshCompareChart();
      loadStoryAnalytics();
    } catch (error) {
      console.error(error);
      setLoadingMessage("Failed to bootstrap atlas. Ensure backend is running on http://localhost:8000");
    }
  }

  bootstrap();
})();
