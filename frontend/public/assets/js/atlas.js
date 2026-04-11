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
    prevMapRows: [],
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
    return `http://localhost:8000${path}`;
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
    const svg = d3.select("#dist-histogram-svg");
    const note = el("dist-note");
    if (!svg.node()) return;
    svg.selectAll("*").remove();
    if (!rows || rows.length < 3) {
      if (note) note.textContent = "Not enough data points to draw a distribution.";
      return;
    }
    const values = rows.map((r) => Number(r.value)).filter((v) => Number.isFinite(v));
    if (values.length < 3) {
      if (note) note.textContent = "Not enough numeric values to draw a distribution.";
      return;
    }
    const ext = d3.extent(values);
    if (!ext[0] && ext[0] !== 0) {
      if (note) note.textContent = "Distribution is unavailable for this selection.";
      return;
    }
    if (ext[1] - ext[0] < 1e-9) {
      if (note) note.textContent = "All values are currently identical.";
      return;
    }
    const bins = d3.bin().domain(ext).thresholds(18)(values);
    const w = 520;
    const h = 130;
    const pad = 10;
    const maxc = d3.max(bins, (b) => b.length) || 1;
    const bw = (w - pad * 2) / bins.length - 1;
    bins.forEach((b, i) => {
      const bh = ((b.length / maxc) * (h - pad * 2)) | 0;
      const x = pad + i * (bw + 1);
      const y = h - pad - bh;
      svg
        .append("rect")
        .attr("x", x)
        .attr("y", y)
        .attr("width", Math.max(1, bw))
        .attr("height", Math.max(0, bh))
        .attr("rx", 3)
        .attr("fill", "rgba(127, 213, 202, 0.72)")
        .attr("stroke", "rgba(255,255,255,0.22)");
    });
    if (note) note.textContent = `Distribution across ${values.length} countries for ${state.year}.`;
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
    // Сначала пробуем стандартные поля
    const p = f.properties || {};
    if (p.ISO_A3 && p.ISO_A3 !== "-99") return p.ISO_A3;
    if (p.ADM0_A3 && p.ADM0_A3 !== "-99") return p.ADM0_A3;

    // Для world-atlas с числовыми id, создаем соответствие
    // Это основные страны, можно добавить больше при необходимости
    const idToIso = {
        4: 'AFG',  // Afghanistan
        8: 'ALB',  // Albania
        12: 'DZA', // Algeria
        20: 'AND', // Andorra
        24: 'AGO', // Angola
        28: 'ATG', // Antigua and Barbuda
        32: 'ARG', // Argentina
        51: 'ARM', // Armenia
        36: 'AUS', // Australia
        40: 'AUT', // Austria
        31: 'AZE', // Azerbaijan
        44: 'BHS', // Bahamas
        48: 'BHR', // Bahrain
        50: 'BGD', // Bangladesh
        52: 'BRB', // Barbados
        112: 'BLR', // Belarus
        56: 'BEL', // Belgium
        84: 'BLZ', // Belize
        204: 'BEN', // Benin
        64: 'BTN', // Bhutan
        68: 'BOL', // Bolivia
        70: 'BIH', // Bosnia and Herzegovina
        72: 'BWA', // Botswana
        76: 'BRA', // Brazil
        96: 'BRN', // Brunei
        100: 'BGR', // Bulgaria
        854: 'BFA', // Burkina Faso
        108: 'BDI', // Burundi
        116: 'KHM', // Cambodia
        120: 'CMR', // Cameroon
        124: 'CAN', // Canada
        132: 'CPV', // Cape Verde
        140: 'CAF', // Central African Republic
        148: 'TCD', // Chad
        152: 'CHL', // Chile
        156: 'CHN', // China
        170: 'COL', // Colombia
        174: 'COM', // Comoros
        178: 'COG', // Congo
        180: 'COD', // DR Congo
        188: 'CRI', // Costa Rica
        384: 'CIV', // Cote d'Ivoire
        191: 'HRV', // Croatia
        192: 'CUB', // Cuba
        196: 'CYP', // Cyprus
        203: 'CZE', // Czech Republic
        208: 'DNK', // Denmark
        262: 'DJI', // Djibouti
        212: 'DMA', // Dominica
        214: 'DOM', // Dominican Republic
        218: 'ECU', // Ecuador
        818: 'EGY', // Egypt
        222: 'SLV', // El Salvador
        226: 'GNQ', // Equatorial Guinea
        232: 'ERI', // Eritrea
        233: 'EST', // Estonia
        748: 'SWZ', // Eswatini
        231: 'ETH', // Ethiopia
        242: 'FJI', // Fiji
        246: 'FIN', // Finland
        250: 'FRA', // France
        266: 'GAB', // Gabon
        270: 'GMB', // Gambia
        268: 'GEO', // Georgia
        276: 'DEU', // Germany
        288: 'GHA', // Ghana
        300: 'GRC', // Greece
        308: 'GRD', // Grenada
        320: 'GTM', // Guatemala
        324: 'GIN', // Guinea
        624: 'GNB', // Guinea-Bissau
        328: 'GUY', // Guyana
        332: 'HTI', // Haiti
        340: 'HND', // Honduras
        348: 'HUN', // Hungary
        352: 'ISL', // Iceland
        356: 'IND', // India
        360: 'IDN', // Indonesia
        364: 'IRN', // Iran
        368: 'IRQ', // Iraq
        372: 'IRL', // Ireland
        376: 'ISR', // Israel
        380: 'ITA', // Italy
        388: 'JAM', // Jamaica
        392: 'JPN', // Japan
        400: 'JOR', // Jordan
        398: 'KAZ', // Kazakhstan
        404: 'KEN', // Kenya
        296: 'KIR', // Kiribati
        408: 'PRK', // North Korea
        410: 'KOR', // South Korea
        414: 'KWT', // Kuwait
        417: 'KGZ', // Kyrgyzstan
        418: 'LAO', // Laos
        428: 'LVA', // Latvia
        422: 'LBN', // Lebanon
        426: 'LSO', // Lesotho
        430: 'LBR', // Liberia
        434: 'LBY', // Libya
        438: 'LIE', // Liechtenstein
        440: 'LTU', // Lithuania
        442: 'LUX', // Luxembourg
        450: 'MDG', // Madagascar
        454: 'MWI', // Malawi
        458: 'MYS', // Malaysia
        462: 'MDV', // Maldives
        466: 'MLI', // Mali
        470: 'MLT', // Malta
        584: 'MHL', // Marshall Islands
        478: 'MRT', // Mauritania
        480: 'MUS', // Mauritius
        484: 'MEX', // Mexico
        583: 'FSM', // Micronesia
        498: 'MDA', // Moldova
        492: 'MCO', // Monaco
        496: 'MNG', // Mongolia
        499: 'MNE', // Montenegro
        504: 'MAR', // Morocco
        508: 'MOZ', // Mozambique
        104: 'MMR', // Myanmar
        516: 'NAM', // Namibia
        520: 'NRU', // Nauru
        524: 'NPL', // Nepal
        528: 'NLD', // Netherlands
        554: 'NZL', // New Zealand
        558: 'NIC', // Nicaragua
        562: 'NER', // Niger
        566: 'NGA', // Nigeria
        807: 'MKD', // North Macedonia
        578: 'NOR', // Norway
        512: 'OMN', // Oman
        586: 'PAK', // Pakistan
        585: 'PLW', // Palau
        591: 'PAN', // Panama
        598: 'PNG', // Papua New Guinea
        600: 'PRY', // Paraguay
        604: 'PER', // Peru
        608: 'PHL', // Philippines
        616: 'POL', // Poland
        620: 'PRT', // Portugal
        634: 'QAT', // Qatar
        642: 'ROU', // Romania
        643: 'RUS', // Russia
        646: 'RWA', // Rwanda
        659: 'KNA', // Saint Kitts and Nevis
        662: 'LCA', // Saint Lucia
        670: 'VCT', // Saint Vincent and the Grenadines
        882: 'WSM', // Samoa
        674: 'SMR', // San Marino
        678: 'STP', // Sao Tome and Principe
        682: 'SAU', // Saudi Arabia
        686: 'SEN', // Senegal
        688: 'SRB', // Serbia
        690: 'SYC', // Seychelles
        694: 'SLE', // Sierra Leone
        702: 'SGP', // Singapore
        703: 'SVK', // Slovakia
        705: 'SVN', // Slovenia
        90: 'SLB', // Solomon Islands
        706: 'SOM', // Somalia
        710: 'ZAF', // South Africa
        728: 'SSD', // South Sudan
        724: 'ESP', // Spain
        144: 'LKA', // Sri Lanka
        729: 'SDN', // Sudan
        740: 'SUR', // Suriname
        752: 'SWE', // Sweden
        756: 'CHE', // Switzerland
        760: 'SYR', // Syria
        158: 'TWN', // Taiwan
        762: 'TJK', // Tajikistan
        834: 'TZA', // Tanzania
        764: 'THA', // Thailand
        626: 'TLS', // Timor-Leste
        768: 'TGO', // Togo
        776: 'TON', // Tonga
        780: 'TTO', // Trinidad and Tobago
        788: 'TUN', // Tunisia
        792: 'TUR', // Turkey
        795: 'TKM', // Turkmenistan
        798: 'TUV', // Tuvalu
        800: 'UGA', // Uganda
        804: 'UKR', // Ukraine
        784: 'ARE', // United Arab Emirates
        826: 'GBR', // United Kingdom
        840: 'USA', // United States
        858: 'URY', // Uruguay
        860: 'UZB', // Uzbekistan
        548: 'VUT', // Vanuatu
        862: 'VEN', // Venezuela
        704: 'VNM', // Vietnam
        887: 'YEM', // Yemen
        894: 'ZMB', // Zambia
        716: 'ZWE', // Zimbabwe
    };

    // Пробуем найти по id
    if (f.id && idToIso[f.id]) {
        return idToIso[f.id];
    }

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
    const hoverTip = el("legend-hover-tip");
    const legendNote = el("legend-note");
    if (!grad || !ticks) return;
    if (!color || !Number.isFinite(extent[0])) {
      grad.style.background = "rgba(255,255,255,0.08)";
      ticks.innerHTML = "";
      if (hoverTip) {
        hoverTip.textContent =
          "No scale is available for this selection yet. Usually this means there are no values for the chosen source, indicator, or year.";
      }
      if (legendNote) {
        legendNote.textContent =
          "No values available for this map selection yet. Try another source, indicator, or year.";
      }
      return;
    }
    const fmt = d3.format(".2f");
    const span = extent[1] - extent[0];
    if (Math.abs(span) < 1e-9) {
      const solid = d3.interpolateTurbo(0.5);
      grad.style.background = solid;
      ticks.innerHTML = "";
      const single = document.createElement("span");
      single.style.margin = "0 auto";
      single.textContent = fmt(extent[0]);
      ticks.appendChild(single);
      if (hoverTip) {
        hoverTip.textContent =
          `All currently available countries have the same value (${fmt(extent[0])}), so the scale is shown as one solid color.`;
      }
      if (legendNote) {
        legendNote.textContent =
          `Current value is ${fmt(extent[0])} for available map rows, so there is no visible range.`;
      }
      return;
    }
    if (hoverTip) {
      hoverTip.textContent =
        `Color scale: left = lower values, right = higher values. Current range is ${fmt(extent[0])} to ${fmt(extent[1])}.`;
    }
    if (legendNote) {
      legendNote.textContent =
        `Scale range for this selection: ${fmt(extent[0])} to ${fmt(extent[1])}.`;
    }
    const samples = d3.range(0, 1.01, 0.05).map((t) => d3.interpolateTurbo(t));
    grad.style.background = `linear-gradient(90deg, ${samples.join(",")})`;
    ticks.innerHTML = "";
    [0, 0.25, 0.5, 0.75, 1].forEach((p) => {
      const span = document.createElement("span");
      span.textContent = fmt(extent[0] + p * (extent[1] - extent[0]));
      ticks.appendChild(span);
    });
  }

  function formatMetric(v) {
    if (!Number.isFinite(v)) return "—";
    const abs = Math.abs(v);
    if (abs >= 1000000) return d3.format(".3s")(v);
    if (abs >= 1000) return d3.format(",.0f")(v);
    return d3.format(".2f")(v);
  }

  function countryRowsOnly(rows) {
    const valid = new Set(state.countries.map((c) => (c.iso3 || "").toUpperCase()));
    return (rows || [])
      .filter((r) => valid.has((r.iso3 || "").toUpperCase()))
      .map((r) => ({ ...r, value: Number(r.value) }))
      .filter((r) => Number.isFinite(r.value));
  }

  function setEmptyTable(tbody, text, colSpan) {
    tbody.innerHTML = "";
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = colSpan;
    td.textContent = text;
    td.className = "muted small";
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  function renderRankTable(tbodyId, rows) {
    const tbody = el(tbodyId);
    if (!tbody) return;
    if (!rows.length) return setEmptyTable(tbody, "No data for this selection.", 3);
    tbody.innerHTML = "";
    rows.forEach((r, idx) => {
      const tr = document.createElement("tr");
      const tdRank = document.createElement("td");
      tdRank.textContent = String(idx + 1);
      const tdCountry = document.createElement("td");
      tdCountry.textContent = r.name || r.iso3 || "—";
      const tdValue = document.createElement("td");
      tdValue.textContent = formatMetric(r.value);
      tr.appendChild(tdRank);
      tr.appendChild(tdCountry);
      tr.appendChild(tdValue);
      tbody.appendChild(tr);
    });
  }

  function renderMoversTable(currentRows, prevRows) {
    const tbody = el("insight-movers-body");
    if (!tbody) return;
    const prevMap = new Map((prevRows || []).map((r) => [r.iso3, Number(r.value)]));
    const movers = currentRows
      .map((r) => {
        const prev = prevMap.get(r.iso3);
        if (!Number.isFinite(prev)) return null;
        return { ...r, delta: r.value - prev };
      })
      .filter(Boolean)
      .filter((r) => Number.isFinite(r.delta))
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 8);

    if (!movers.length) return setEmptyTable(tbody, "No previous-year data to compare.", 3);
    tbody.innerHTML = "";
    movers.forEach((r) => {
      const tr = document.createElement("tr");
      const tdCountry = document.createElement("td");
      tdCountry.textContent = r.name || r.iso3 || "—";
      const tdCurrent = document.createElement("td");
      tdCurrent.textContent = formatMetric(r.value);
      const tdDelta = document.createElement("td");
      const sign = r.delta > 0 ? "+" : "";
      tdDelta.textContent = `${sign}${formatMetric(r.delta)}`;
      tdDelta.className = r.delta > 0 ? "delta-up" : r.delta < 0 ? "delta-down" : "";
      tr.appendChild(tdCountry);
      tr.appendChild(tdCurrent);
      tr.appendChild(tdDelta);
      tbody.appendChild(tr);
    });
  }

  function renderInsights() {
    const rows = countryRowsOnly(state.mapRows);
    const subtitle = el("insights-subtitle");
    if (subtitle) {
      subtitle.textContent = `${indicatorLabel(state.indicator)} · ${state.source} · ${state.year}`;
    }

    const countriesEl = el("kpi-countries");
    const avgEl = el("kpi-avg");
    const medianEl = el("kpi-median");
    const minEl = el("kpi-min");
    const maxEl = el("kpi-max");

    if (!rows.length) {
      if (countriesEl) countriesEl.textContent = "0";
      if (avgEl) avgEl.textContent = "—";
      if (medianEl) medianEl.textContent = "—";
      if (minEl) minEl.textContent = "—";
      if (maxEl) maxEl.textContent = "—";
      renderRankTable("insight-top-body", []);
      renderRankTable("insight-bottom-body", []);
      renderMoversTable([], []);
      updateHistogram([]);
      return;
    }

    const values = rows.map((r) => r.value).sort((a, b) => a - b);
    const avg = d3.mean(values);
    const median = d3.median(values);
    const min = values[0];
    const max = values[values.length - 1];

    if (countriesEl) countriesEl.textContent = String(rows.length);
    if (avgEl) avgEl.textContent = formatMetric(avg);
    if (medianEl) medianEl.textContent = formatMetric(median);
    if (minEl) minEl.textContent = formatMetric(min);
    if (maxEl) maxEl.textContent = formatMetric(max);

    const sortedDesc = [...rows].sort((a, b) => b.value - a.value);
    const sortedAsc = [...rows].sort((a, b) => a.value - b.value);
    renderRankTable("insight-top-body", sortedDesc.slice(0, 8));
    renderRankTable("insight-bottom-body", sortedAsc.slice(0, 8));
    renderMoversTable(rows, countryRowsOnly(state.prevMapRows));
    updateHistogram(rows);
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
        state.prevMapRows = [];
        el("map-headline").textContent = "Choose an indicator";
        updateLegend(null, [0, 1]);
        setMapEmptyMessage(
          "No indicators available for this source.",
          "The UN list is built from rows in the database after ingest. For a quick demo, switch to World Bank.",
        );
        el("map-empty").hidden = false;
        redrawMapColors();
        renderInsights();
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

      if (state.year > 1960) {
        const prevParams = new URLSearchParams({
          year: String(state.year - 1),
          indicator: state.indicator,
          source: state.source,
          limit: "500",
        });
        try {
          const prevRows = await fetchJson(apiUrl(`/map?${prevParams}`));
          state.prevMapRows = Array.isArray(prevRows) ? prevRows : [];
        } catch {
          state.prevMapRows = [];
        }
      } else {
        state.prevMapRows = [];
      }

      el("map-headline").textContent = `${indicatorLabel(state.indicator)} · ${state.year}`;
      const { color, extent } = buildScales(state.mapRows);
      updateLegend(color, extent);
      if (!state.mapRows.length) {
        setMapEmptyMessage(
          MAP_EMPTY_DEFAULT.title,
          "Often means there are no rows yet for this source/indicator—load data or try World Bank with SP.DYN.TFRT.IN.",
        );
        el("map-empty").hidden = false;
      }
      redrawMapColors();
      renderInsights();
    } catch (e) {
      console.error(e);
      state.mapRows = [];
      state.prevMapRows = [];
      el("map-empty").hidden = false;
      renderInsights();
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
      renderInsights();
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
    } finally {
      document.body.classList.remove("is-booting");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap);
  } else {
    void bootstrap();
  }
})();
