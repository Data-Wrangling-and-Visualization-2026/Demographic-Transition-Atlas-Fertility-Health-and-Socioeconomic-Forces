/* global d3, topojson */
(function () {
  "use strict";

  const API_BASE = window.ATLAS_API_BASE || "http://localhost:8000";
const WORLD_TOPOJSON_PATH = "/assets/world-countries-110m.json";

  const PANEL_PRIORITY = [
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

  const REGION_COLORS = {
    "East Asia & Pacific": "#4c78a8",
    "Europe & Central Asia": "#f58518",
    "Latin America & Caribbean": "#e45756",
    "Middle East, North Africa, Afghanistan & Pakistan": "#72b7b2",
    "North America": "#54a24b",
    "South Asia": "#eeca3b",
    "Sub-Saharan Africa": "#b279a2",
  };

  const INDICATOR_SHORT_LABELS = {
    tfr: "TFR",
    adolescent_fertility: "Teen fertility",
    gdp_per_capita: "GDP pc",
    female_secondary_enrollment: "Girls' secondary",
    female_labor_force_participation: "Women in labor",
    urban_population_pct: "Urban pop",
    median_age: "Median age",
    mean_age_childbearing: "Childbearing age",
    health_expenditure_pct_gdp: "Health spend",
    unmet_need_family_planning: "Unmet FP need",
    contraceptive_prevalence_modern: "Modern contraception",
    child_dependency_ratio: "Child dependency",
    total_dependency_ratio: "Total dependency",
    population_change: "Population change",
    crude_net_migration_rate: "Net migration",
    female_population_15_49: "Women 15-49",
  };

  const STORY_COUNTRY_CONFIGS = [
    {
      iso3: "RUS",
      title: "Russia",
      accent: "#1b6b59",
      markerYear: 1991,
      focusEndYear: 1999,
      markerLabel: "Post-Soviet shock",
    },
    {
      iso3: "CHN",
      title: "China",
      accent: "#b87726",
      markerYear: 1980,
      markerLabel: "One-child policy era",
    },
  ];

  const DECLINE_EXPLANATIONS = {
    MDV: "Tourism growth and urbanization made life in the capital much more expensive.",
    LBY: "Oil income sharply reduced child mortality, so the old need for very large families faded.",
    JOR: "Women increasingly marry later, often close to age 30, because of longer education and unemployment pressure.",
    KWT: "Women participate more actively in the labor market and build careers.",
    CPV: "Large-scale migration to Europe helped import the European small-family model.",
    ARE: "Extremely rapid enrichment and a population dominated by expatriates weakened traditional large-family norms within two decades.",
    SAU: "Vision 2030 reforms expanded women's work opportunities and pushed the country away from early marriage patterns.",
    BTN: "The arrival of television and the internet in 1999 rapidly changed youth values.",
    MHL: "Free migration to the United States encouraged a more American two-child family model.",
    IRN: "The government's very successful 'Two children are enough' campaign in the 1990s worked too well.",
  };

  const CHINA_ONE_CHILD_FOOTNOTE =
    "*One-child policy: many parents preferred to keep a son because of a centuries-old tradition: only a son continued the family line, cared for elderly parents, and inherited property, while a daughter was expected to marry into another family. This led to widespread sex-selective abortions and the abandonment of newborn girls. By 2016, the country had an imbalance of roughly 34 million excess men.";

  const MENA_REGION = "Middle East, North Africa, Afghanistan & Pakistan";
  const STORY_WORLD_REGION_KEY = "__world__";

  const SHAP_FEATURE_CONFIG = [
    { code: "female_secondary_enrollment", label: "Girls' secondary" },
    { code: "gdp_per_capita", label: "GDP pc" },
    { code: "urban_population_pct", label: "Urban pop" },
    { code: "median_age", label: "Median age" },
    { code: "contraceptive_prevalence_modern", label: "Modern contraception" },
  ];

  const TFR_THEME_GROUPS = [
    {
      key: "socio_economic",
      label: "Socio-economic conditions",
      codes: [
        "gdp_per_capita",
        "female_secondary_enrollment",
        "female_labor_force_participation",
        "urban_population_pct",
        "health_expenditure_pct_gdp",
      ],
    },
    {
      key: "reproductive_behavior",
      label: "Reproductive behavior and family planning",
      codes: [
        "adolescent_fertility",
        "mean_age_childbearing",
        "unmet_need_family_planning",
        "contraceptive_prevalence_modern",
      ],
    },
    {
      key: "demographic_structure",
      label: "Demographic structure",
      codes: ["median_age", "child_dependency_ratio", "total_dependency_ratio", "female_population_15_49"],
    },
    {
      key: "population_dynamics",
      label: "Population dynamics",
      codes: ["population_change", "crude_net_migration_rate"],
    },
  ];

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
    275: "PSE",
    276: "DEU",
    288: "GHA",
    300: "GRC",
    304: "GRL",
    308: "GRD",
    320: "GTM",
    324: "GIN",
    624: "GNB",
    630: "PRI",
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
    540: "NCL",
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
    regionBaselineRows: [],
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
    mapSupplementLayer: null,
    mapSupplementOrbit: null,
    mapSphere: null,
    mapGraticule: null,
    mapAtmosphere: null,
    mapGlow: null,
    mapShadow: null,
    mapDragSurface: null,
    mapValueByIso: new Map(),
    mapRenderableIsos: new Set(),
    mapColorScale: null,
    globeBaseScale: 236,
    globeRotateTimer: null,
    isDraggingGlobe: false,
    isHoveringCountry: false,
    story: {
      ready: false,
      yearSeries: [],
      tfrByYear: [],
      tfrRowsByYear: new Map(),
      indicatorSeriesRows: new Map(),
      correlationMode: "latest",
      latestYear: null,
      firstYear: null,
      latestTfrRows: [],
      latestGdpRows: [],
      latestEnrollmentRows: [],
      latestAdolescentRows: [],
      latestLaborRows: [],
      recordsRegion: "",
      latestIndicatorRows: new Map(),
      countryStories: new Map(),
      correlationCodes: [],
      correlationMatrix: [],
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

  if (feature && feature.id != null) {
    const numericId = Number(feature.id);
    if (!Number.isNaN(numericId) && ID_TO_ISO3[numericId]) {
      return ID_TO_ISO3[numericId];
    }
  }

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

  function formatInteger(value) {
    if (!Number.isFinite(Number(value))) return "-";
    return d3.format(",d")(Math.round(Number(value)));
  }

  function formatValueWithUnit(value, unit) {
    const base = formatValue(value);
    if (base === "-" || !unit) return base;
    return `${base} ${unit}`;
  }

  function cleanIndicatorLabel(label) {
    return String(label || "")
      .replace(/\s*\([^)]*\)/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  function indicatorLabel(code, clean = false) {
    const meta = indicatorMeta(code);
    const label = meta ? meta.label : code;
    return clean ? cleanIndicatorLabel(label) : label;
  }

  function indicatorShortLabel(code) {
    return INDICATOR_SHORT_LABELS[code] || (indicatorMeta(code) ? indicatorMeta(code).label : code);
  }

  function regionColor(region) {
    return REGION_COLORS[region] || "#4c78a8";
  }

  function toNumberOrNull(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  function normalizeCorrelationValue(code, value) {
    const numeric = toNumberOrNull(value);
    if (numeric == null) return null;

    if (code === "gdp_per_capita" || code === "female_population_15_49") {
      return numeric > 0 ? Math.log10(numeric) : null;
    }

    if (code === "population_change") {
      return Math.sign(numeric) * Math.log10(Math.abs(numeric) + 1);
    }

    return numeric;
  }

  function firstFinitePoint(points) {
    return points.find((point) => Number.isFinite(point.value)) || null;
  }

  function lastFinitePoint(points) {
    for (let index = points.length - 1; index >= 0; index -= 1) {
      if (Number.isFinite(points[index].value)) return points[index];
    }
    return null;
  }

  function findPointByYear(points, year) {
    return points.find((point) => Number(point.year) === Number(year)) || null;
  }

  function closestPointByYear(points, year) {
    if (!points || !points.length) return null;
    const bisect = d3.bisector((point) => point.year).left;
    const index = bisect(points, year);
    const left = points[Math.max(0, index - 1)] || null;
    const right = points[Math.min(points.length - 1, index)] || null;
    if (!left) return right;
    if (!right) return left;
    return Math.abs(left.year - year) <= Math.abs(right.year - year) ? left : right;
  }

  function stableHash(value) {
    let hash = 0;
    const text = String(value || "");
    for (let index = 0; index < text.length; index += 1) {
      hash = (hash * 31 + text.charCodeAt(index)) % 1_000_003;
    }
    return hash;
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

  function panelIndicatorCodes() {
    if (!state.indicators.length) return PANEL_PRIORITY.slice();

    const allCodes = state.indicators.map((item) => item.code);
    const prioritized = PANEL_PRIORITY.filter((code) => allCodes.includes(code));
    const remaining = allCodes.filter((code) => !prioritized.includes(code));
    return [...prioritized, ...remaining];
  }

  function panelChartColor(code, index) {
    return PANEL_COLORS[code] || d3.schemeTableau10[index % d3.schemeTableau10.length];
  }

  function selectedIndicatorContextNote() {
    if (state.selectedIndicator !== "health_expenditure_pct_gdp") return "";
    return " GDP means Gross Domestic Product, so this metric shows what share of a country's economy is spent on health.";
  }

  function showStoryTooltip(event, html) {
    const tip = el("story-tooltip");
    if (!tip) return;
    tip.innerHTML = html;
    tip.hidden = false;
    moveStoryTooltip(event);
  }

  function moveStoryTooltip(event) {
    const tip = el("story-tooltip");
    if (!tip || tip.hidden) return;
    const offset = 14;
    const width = tip.offsetWidth || 220;
    const height = tip.offsetHeight || 80;
    const x = Math.min(event.clientX + offset, window.innerWidth - width - 12);
    const y = Math.min(event.clientY + offset, window.innerHeight - height - 12);
    tip.style.left = `${Math.max(12, x)}px`;
    tip.style.top = `${Math.max(12, y)}px`;
  }

  function hideStoryTooltip() {
    const tip = el("story-tooltip");
    if (!tip) return;
    tip.hidden = true;
  }

  function canRenderIsoOnMap(iso3) {
    return Boolean(iso3 && state.mapRenderableIsos.has(iso3));
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
    const world = await fetchJSON(WORLD_TOPOJSON_PATH);
    const features = topojson.feature(world, world.objects.countries).features;
    const renderableIsos = new Set();
    features.forEach((feature) => {
      feature._iso3 = isoFromFeature(feature);
      if (feature._iso3) renderableIsos.add(feature._iso3);
    });
    state.mapRenderableIsos = renderableIsos;
    return features;
  }

  function populateIndicatorSelects() {
    const indicatorSelect = el("indicator-select");
    const compareSelect = el("compare-indicator-select");

    indicatorSelect.innerHTML = "";
    compareSelect.innerHTML = "";

    state.indicators.forEach((item) => {
      const label = cleanIndicatorLabel(item.label);

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

  function populateStoryRecordsRegionSelect() {
    const select = el("story-records-region-select");
    if (!select) return;

    select.innerHTML = "";
    const worldOption = document.createElement("option");
    worldOption.value = STORY_WORLD_REGION_KEY;
    worldOption.textContent = "Whole world";
    select.appendChild(worldOption);

    (state.meta.regions || []).forEach((region) => {
      const option = document.createElement("option");
      option.value = region;
      option.textContent = region.replace(MENA_REGION, "MENA, Afghanistan & Pakistan");
      select.appendChild(option);
    });

    if (!state.story.recordsRegion) {
      state.story.recordsRegion = STORY_WORLD_REGION_KEY;
    }

    select.value = state.story.recordsRegion;
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

    legendIndicator.textContent = indicator ? cleanIndicatorLabel(indicator.label) : "Indicator scale";
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
    const indicatorLabel = indicator ? cleanIndicatorLabel(indicator.label) : state.selectedIndicator;
    const unit = indicator && indicator.unit ? indicator.unit : "selected unit";
    const matchedCountries =
      mapSummary && Number.isFinite(Number(mapSummary.countries_with_data)) ? Number(mapSummary.countries_with_data) : null;
    const regionText = state.selectedRegion || "all regions";
    const incomeText = state.selectedIncome || "all income groups";
    note.innerHTML = `
      <strong>Current view:</strong> ${indicatorLabel} in <strong>${state.selectedYear}</strong> (${unit}).
      Change <strong>Indicator</strong>, <strong>Region</strong>, <strong>Income group</strong>, or <strong>Year</strong>
      to update the globe.
      <strong>Active filters:</strong> ${regionText}; ${incomeText}${matchedCountries != null ? `; ${matchedCountries} countries shown.` : "."}${selectedIndicatorContextNote()}
    `;
  }

  function renderSelectionDataTable() {
    const body = el("selection-data-rows");
    const note = el("data-table-note");
    if (!body || !note) return;

    body.innerHTML = "";

    if (!state.mapRows.length) {
      note.textContent = "No country rows for the current year, indicator, and filters.";
      const emptyRow = document.createElement("tr");
      emptyRow.innerHTML = '<td class="table-empty" colspan="6">No data for this selection.</td>';
      body.appendChild(emptyRow);
      return;
    }

    const unmappedCount = state.mapRows.filter((row) => !canRenderIsoOnMap(row.iso3)).length;
    note.textContent = unmappedCount
      ? `${state.mapRows.length} country rows loaded. ${unmappedCount} appear in the table only because the globe geometry has no matching shape for them.`
      : `${state.mapRows.length} country rows loaded. All of them are available on the globe and in the table.`;

    state.mapRows.forEach((row) => {
      const tr = document.createElement("tr");
      const visibleOnMap = canRenderIsoOnMap(row.iso3);
      const countryTd = document.createElement("td");
      const countryBtn = document.createElement("button");

      countryBtn.type = "button";
      countryBtn.className = "data-country-btn";
      countryBtn.textContent = row.name || row.iso3 || "Unknown";
      countryBtn.addEventListener("click", () => {
        openCountryPanel(row.iso3);
        renderMapColors();
      });

      countryTd.appendChild(countryBtn);
      tr.appendChild(countryTd);

      [
        row.iso3 || "-",
        row.region || "-",
        row.income_group || "-",
        formatValue(row.value),
      ].forEach((value) => {
        const td = document.createElement("td");
        td.textContent = value;
        tr.appendChild(td);
      });

      const coverageTd = document.createElement("td");
      const badge = document.createElement("span");
      badge.className = `coverage-badge ${visibleOnMap ? "coverage-badge--map" : "coverage-badge--table"}`;
      badge.textContent = visibleOnMap ? "Map + table" : "Table only";
      coverageTd.appendChild(badge);
      tr.appendChild(coverageTd);

      body.appendChild(tr);
    });
  }

  function renderRegionCards() {
    const host = el("region-cards");
    if (!host) return;
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
    const chartNode = el("region-chart");
    if (!chartNode) return;
    const svg = d3.select(chartNode);
    const width = 760;
    const height = 240;
    const margin = { top: 24, right: 16, bottom: 42, left: 70 };

    svg.selectAll("*").remove();

    const rows = state.regionSummaryRows.filter((row) => Number.isFinite(Number(row.avg_value)));
    const baselineByRegion = new Map(
      state.regionBaselineRows
        .filter((row) => Number.isFinite(Number(row.avg_value)))
        .map((row) => [row.region, Number(row.avg_value)]),
    );
    if (!rows.length) return;

    const x = d3
      .scaleBand()
      .domain(rows.map((row) => row.region))
      .range([margin.left, width - margin.right])
      .padding(0.2);

    const y = d3
      .scaleLinear()
      .domain([
        0,
        d3.max(rows, (row) => Math.max(Number(row.avg_value), baselineByRegion.get(row.region) || 0)) || 1,
      ])
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
      .selectAll("rect")
      .data(rows)
      .join("rect")
      .attr("x", (row) => x(row.region))
      .attr("y", (row) => y(baselineByRegion.get(row.region) || 0))
      .attr("width", x.bandwidth())
      .attr("height", (row) => y(0) - y(baselineByRegion.get(row.region) || 0))
      .attr("fill", "#dce7e2")
      .attr("stroke", "#c1d5cc")
      .attr("opacity", 1);

    svg
      .append("g")
      .selectAll("rect.current")
      .data(rows)
      .join("rect")
      .attr("class", "current")
      .attr("x", (row) => x(row.region) + x.bandwidth() * 0.14)
      .attr("y", (row) => y(Number(row.avg_value)))
      .attr("width", x.bandwidth() * 0.72)
      .attr("height", (row) => y(0) - y(Number(row.avg_value)))
      .attr("fill", (row) => (row.region === state.selectedRegion ? "#145f4a" : "#2f9c7f"))
      .attr("opacity", 0.95)
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
    const baselineYear = Number(state.meta.min_year || 1970);
    svg
      .append("text")
      .attr("x", margin.left)
      .attr("y", margin.top - 6)
      .attr("class", "story-note")
      .text(unit ? `Unit: ${unit} | Background: ${baselineYear} | Overlay: ${state.selectedYear}` : "");
  }

  async function refreshAtlas() {
    const token = ++state.refreshToken;
    const showLoading = !state.playTimer;
    if (showLoading) setLoadingMessage("Loading data...");

    try {
      const mapParams = {
        year: state.selectedYear,
        indicator: state.selectedIndicator,
        region: state.selectedRegion || null,
        income_group: state.selectedIncome || null,
      };

      const mapData = await fetchJSON(buildApiUrl("/map-data", mapParams));

      if (token !== state.refreshToken) return;

      state.mapRows = mapData.rows || [];
      state.regionSummaryRows = [];
      state.regionBaselineRows = [];

      renderMapColors();
      updateSelectionNote(mapData.summary || null);
      renderSelectionDataTable();

      if (state.selectedIso3 && state.panelOpen) {
        await refreshCountryProfileOnly(state.selectedIso3);
      }

      await refreshCompareChart();
    } catch (error) {
      console.error(error);
      state.mapRows = [];
      state.regionSummaryRows = [];
      state.regionBaselineRows = [];
      renderMapColors();
      renderSelectionDataTable();
      setLoadingMessage("Could not load map data. Check backend/API connection.");
      updateSelectionNote(null);
    }
  }

  function renderPanelKpis(profile) {
    const container = el("panel-kpis");
    container.innerHTML = "";

    const rows = panelIndicatorCodes().map((indicatorCode) => {
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

  function renderPanelCharts(timeseries) {
    const grid = el("chart-grid");
    if (!grid) return;

    grid.innerHTML = "";

    panelIndicatorCodes().forEach((code, index) => {
      const meta = indicatorMeta(code);
      const svgId = `chart-${code}`;
      const unit = meta && meta.unit ? meta.unit : "";
      const series = (timeseries && timeseries.series && timeseries.series[code]) || [];
      const card = document.createElement("article");

      card.className = "chart-card";
      card.innerHTML = `
        <h4>${meta ? meta.label : code}</h4>
        <p class="chart-unit">${unit || "No unit metadata"}</p>
        <svg id="${svgId}" viewBox="0 0 420 160"></svg>
      `;
      grid.appendChild(card);

      drawMiniChart(`#${svgId}`, series, panelChartColor(code, index), unit);
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
      el("panel-country-meta").textContent = `${profile.region || "Unknown region"} | ${profile.income_group || "Unknown income group"} | Year ${profile.selected_year}`;
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
        fetchJSON(buildApiUrl(`/country/${iso3}/timeseries`, { indicators: panelIndicatorCodes().join(",") })),
      ]);

      el("panel-country-name").textContent = profile.name || iso3;
      el("panel-country-meta").textContent = `${profile.region || "Unknown region"} | ${profile.income_group || "Unknown income group"} | Year ${profile.selected_year}`;

      renderPanelKpis(profile);
      renderPanelCharts(timeseries);
    } catch (error) {
      console.error(error);
      el("panel-country-name").textContent = iso3;
      el("panel-country-meta").textContent = "Could not load country profile";
      renderPanelKpis({ values: {} });
      renderPanelCharts(null);
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
        const tooltipRows = [];

        hoverLine.style("display", null).attr("x1", mouseX).attr("x2", mouseX);
        focusGroup.selectAll("*").remove();

        activeRows.forEach((row) => {
          const point = closestPointByYear(row.points, year);
          if (!point) return;

          focusGroup
            .append("circle")
            .attr("cx", x(point.year))
            .attr("cy", y(point.value))
            .attr("r", 3.4)
            .attr("fill", "#fff")
            .attr("stroke", color(row.iso3))
            .attr("stroke-width", 2);

          tooltipRows.push(
            `<span style="color:${color(row.iso3)};font-weight:700;">${row.name}</span>: ${point.year}, ${formatValueWithUnit(
              point.value,
              unit,
            )}`,
          );
        });

        if (tooltipRows.length) {
          showStoryTooltip(event, tooltipRows.join("<br/>"));
        }
      })
      .on("mouseleave", () => {
        hoverLine.style("display", "none");
        focusGroup.selectAll("*").remove();
        hideStoryTooltip();
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

  function boxPlotStats(values) {
    const sorted = values.map(Number).filter(Number.isFinite).sort(d3.ascending);
    if (!sorted.length) return null;

    const q1 = d3.quantileSorted(sorted, 0.25);
    const median = d3.quantileSorted(sorted, 0.5);
    const q3 = d3.quantileSorted(sorted, 0.75);
    const iqr = q3 - q1;
    const lowerFence = q1 - iqr * 1.5;
    const upperFence = q3 + iqr * 1.5;
    const nonOutliers = sorted.filter((value) => value >= lowerFence && value <= upperFence);
    const min = nonOutliers.length ? d3.min(nonOutliers) : sorted[0];
    const max = nonOutliers.length ? d3.max(nonOutliers) : sorted[sorted.length - 1];
    const outliers = sorted.filter((value) => value < min || value > max);

    return {
      count: sorted.length,
      min,
      q1,
      median,
      q3,
      max,
      outliers,
    };
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
    const width = 660;
    const height = 500;
    const margin = { top: 18, right: 20, bottom: 52, left: 56 };
    const regionOrder = state.meta.regions || [];

    svg.selectAll("*").remove();
    if (!regionOrder.length || !state.story.tfrByYear.length) return;

    const series = regionOrder
      .map((region) => ({
        region,
        points: state.story.tfrByYear
          .map((row) => ({
            year: row.year,
            value: row.byRegion.get(region),
          }))
          .filter((point) => Number.isFinite(point.value)),
      }))
      .filter((row) => row.points.length);
    if (!series.length) return;

    const allPoints = series.flatMap((row) => row.points);
    const regions = series.map((row) => row.region);

    const x = d3
      .scaleLinear()
      .domain(d3.extent(allPoints, (point) => point.year))
      .range([margin.left, width - margin.right]);
    const y = d3
      .scaleLinear()
      .domain([
        Math.max(0, (d3.min(allPoints, (point) => point.value) || 0) - 0.35),
        (d3.max(allPoints, (point) => point.value) || 1) + 0.45,
      ])
      .nice()
      .range([height - margin.bottom, margin.top]);

    svg
      .append("rect")
      .attr("x", margin.left)
      .attr("y", margin.top)
      .attr("width", width - margin.left - margin.right)
      .attr("height", height - margin.top - margin.bottom)
      .attr("rx", 12)
      .attr("fill", "#dde7f2");

    svg
      .append("g")
      .attr("class", "story-gridline")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(6).tickSize(-(width - margin.left - margin.right)).tickFormat(""))
      .call((g) => g.select(".domain").remove())
      .call((g) => g.selectAll("line").attr("stroke", "rgba(255,255,255,0.88)"));

    svg
      .append("g")
      .attr("class", "story-gridline")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(11).tickSize(-(height - margin.top - margin.bottom)).tickFormat(""))
      .call((g) => g.select(".domain").remove())
      .call((g) => g.selectAll("line").attr("stroke", "rgba(255,255,255,0.7)"));

    svg
      .append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(11).tickFormat(d3.format("d")));
    svg.append("g").attr("class", "axis").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(6));

    const line = d3
      .line()
      .defined((point) => Number.isFinite(point.value))
      .x((point) => x(point.year))
      .y((point) => y(point.value));

    svg
      .append("g")
      .attr("class", "story-series-layer")
      .selectAll("path")
      .data(series)
      .join("path")
      .attr("fill", "none")
      .attr("stroke", (row) => regionColor(row.region))
      .attr("stroke-linecap", "round")
      .attr("stroke-linejoin", "round")
      .attr("stroke-width", 2.3)
      .attr("opacity", 0.95)
      .attr("d", (row) => line(row.points));

    const hoverPoint = svg
      .append("circle")
      .attr("class", "chart-hover-point")
      .attr("r", 4.5)
      .style("display", "none");

    svg
      .append("g")
      .selectAll("circle")
      .data(series.flatMap((row) => row.points.map((point) => ({ ...point, region: row.region }))))
      .join("circle")
      .attr("cx", (point) => x(point.year))
      .attr("cy", (point) => y(point.value))
      .attr("r", 8)
      .attr("fill", "transparent")
      .style("cursor", "pointer")
      .on("mouseenter", (event, point) => {
        hoverPoint
          .style("display", null)
          .attr("cx", x(point.year))
          .attr("cy", y(point.value))
          .attr("stroke", regionColor(point.region));
        showStoryTooltip(
          event,
          `<strong>${point.region}</strong><br/><span>Year: ${point.year}</span><br/><span>TFR: ${formatValueWithUnit(
            point.value,
            "births per woman",
          )}</span>`,
        );
      })
      .on("mousemove", (event, point) => {
        hoverPoint
          .style("display", null)
          .attr("cx", x(point.year))
          .attr("cy", y(point.value))
          .attr("stroke", regionColor(point.region));
        moveStoryTooltip(event);
      })
      .on("mouseleave", () => {
        hoverPoint.style("display", "none");
        hideStoryTooltip();
      });

    svg
      .append("text")
      .attr("x", margin.left)
      .attr("y", margin.top - 2)
      .attr("class", "story-axis-label")
      .text("TFR");

    svg
      .append("text")
      .attr("x", (margin.left + width - margin.right) / 2)
      .attr("y", height - 12)
      .attr("text-anchor", "middle")
      .attr("class", "story-axis-label")
      .text("Year");

    renderStoryLegend(
      "story-region-legend",
      regions.map((region) => ({
        label: region.replace("Middle East, North Africa, Afghanistan & Pakistan", "MENA, Afghanistan & Pakistan"),
        color: regionColor(region),
      })),
    );
  }

  function drawStoryRecordsChart() {
    const svg = d3.select("#story-records-chart");
    const width = 660;
    const height = 420;
    const margin = { top: 28, right: 20, bottom: 50, left: 64 };

    svg.selectAll("*").remove();

    const selectedRegion = state.story.recordsRegion;
    if (!selectedRegion || !state.story.yearSeries.length) return;
    const isWorld = selectedRegion === STORY_WORLD_REGION_KEY;
    const selectedRegionLabel = isWorld ? "Whole world" : selectedRegion;

    const series = state.story.yearSeries
      .map((year) => {
        const rows = (state.story.tfrRowsByYear.get(year) || [])
          .filter((row) => (isWorld ? true : row.region === selectedRegion))
          .map((row) => ({
            ...row,
            valueNum: toNumberOrNull(row.value),
          }))
          .filter((row) => row.valueNum != null);

        if (!rows.length) return null;

        const minRow = rows.reduce((best, row) => (row.valueNum < best.valueNum ? row : best), rows[0]);
        const maxRow = rows.reduce((best, row) => (row.valueNum > best.valueNum ? row : best), rows[0]);

        return {
          year,
          minValue: minRow.valueNum,
          minCountry: minRow.name || minRow.iso3,
          maxValue: maxRow.valueNum,
          maxCountry: maxRow.name || maxRow.iso3,
          sampleSize: rows.length,
        };
      })
      .filter(Boolean);

    if (!series.length) return;

    const x = d3
      .scaleLinear()
      .domain(d3.extent(series, (row) => row.year))
      .range([margin.left, width - margin.right]);

    const y = d3
      .scaleLinear()
      .domain([
        Math.max(0, (d3.min(series, (row) => row.minValue) || 0) - 0.22),
        (d3.max(series, (row) => row.maxValue) || 1) + 0.26,
      ])
      .nice()
      .range([height - margin.bottom, margin.top]);

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
      .call(d3.axisBottom(x).ticks(9).tickFormat(d3.format("d")));
    svg.append("g").attr("class", "axis").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(6));

    const area = d3
      .area()
      .x((row) => x(row.year))
      .y0((row) => y(row.maxValue))
      .y1((row) => y(row.minValue))
      .curve(d3.curveMonotoneX);
    const lineHigh = d3
      .line()
      .x((row) => x(row.year))
      .y((row) => y(row.maxValue))
      .curve(d3.curveMonotoneX);
    const lineLow = d3
      .line()
      .x((row) => x(row.year))
      .y((row) => y(row.minValue))
      .curve(d3.curveMonotoneX);

    svg.append("path").datum(series).attr("fill", "rgba(59, 137, 113, 0.14)").attr("d", area);
    svg
      .append("path")
      .datum(series)
      .attr("fill", "none")
      .attr("stroke", "#b14d2f")
      .attr("stroke-width", 2.4)
      .attr("stroke-linecap", "round")
      .attr("stroke-linejoin", "round")
      .attr("d", lineHigh);
    svg
      .append("path")
      .datum(series)
      .attr("fill", "none")
      .attr("stroke", "#1b7a63")
      .attr("stroke-width", 2.4)
      .attr("stroke-linecap", "round")
      .attr("stroke-linejoin", "round")
      .attr("d", lineLow);

    const hoverLine = svg
      .append("line")
      .attr("class", "chart-hover-line")
      .attr("y1", margin.top)
      .attr("y2", height - margin.bottom)
      .style("display", "none");
    const maxFocus = svg.append("circle").attr("class", "chart-hover-point").attr("r", 4.8).style("display", "none");
    const minFocus = svg.append("circle").attr("class", "chart-hover-point").attr("r", 4.8).style("display", "none");

    const bisect = d3.bisector((row) => row.year).left;

    svg
      .append("rect")
      .attr("x", margin.left)
      .attr("y", margin.top)
      .attr("width", width - margin.left - margin.right)
      .attr("height", height - margin.top - margin.bottom)
      .attr("fill", "transparent")
      .on("mousemove", (event) => {
        const pointerX = d3.pointer(event)[0];
        const year = x.invert(pointerX);
        const index = bisect(series, year);
        const left = series[Math.max(0, index - 1)] || null;
        const right = series[Math.min(series.length - 1, index)] || null;
        const point = !left ? right : !right ? left : Math.abs(left.year - year) <= Math.abs(right.year - year) ? left : right;
        if (!point) return;

        const px = x(point.year);
        hoverLine.style("display", null).attr("x1", px).attr("x2", px);
        maxFocus.style("display", null).attr("cx", px).attr("cy", y(point.maxValue)).attr("stroke", "#b14d2f");
        minFocus.style("display", null).attr("cx", px).attr("cy", y(point.minValue)).attr("stroke", "#1b7a63");

        showStoryTooltip(
          event,
          `<strong>${selectedRegionLabel}</strong><br/><span>Year: ${point.year}</span><br/><span style="color:#b14d2f;">Highest: ${point.maxCountry}, ${formatValueWithUnit(
            point.maxValue,
            "births per woman",
          )}</span><br/><span style="color:#1b7a63;">Lowest: ${point.minCountry}, ${formatValueWithUnit(
            point.minValue,
            "births per woman",
          )}</span><br/><span>${formatInteger(point.sampleSize)} countries</span>`,
        );
      })
      .on("mouseleave", () => {
        hoverLine.style("display", "none");
        maxFocus.style("display", "none");
        minFocus.style("display", "none");
        hideStoryTooltip();
      });

    const highestRecord = series.reduce((best, row) => (row.maxValue > best.maxValue ? row : best), series[0]);
    const lowestRecord = series.reduce((best, row) => (row.minValue < best.minValue ? row : best), series[0]);

    svg
      .append("text")
      .attr("x", x(highestRecord.year) + 6)
      .attr("y", y(highestRecord.maxValue) - 8)
      .attr("class", "story-note")
      .text(`Peak: ${highestRecord.year} ${formatValue(highestRecord.maxValue)}`);
    svg
      .append("text")
      .attr("x", x(lowestRecord.year) + 6)
      .attr("y", y(lowestRecord.minValue) + 14)
      .attr("class", "story-note")
      .text(`Floor: ${lowestRecord.year} ${formatValue(lowestRecord.minValue)}`);

    svg
      .append("text")
      .attr("x", margin.left)
      .attr("y", margin.top - 8)
      .attr("class", "story-axis-label")
      .text("TFR (births per woman)");

    renderStoryLegend("story-records-legend", [
      { label: "Highest country-level TFR in selected region", color: "#b14d2f" },
      { label: "Lowest country-level TFR in selected region", color: "#1b7a63" },
      { label: "Gap between high and low", color: "rgba(59, 137, 113, 0.45)" },
    ]);

    setText(
      "story-records-summary",
      `${selectedRegionLabel}: this chart tracks yearly high and low country-level fertility records. Peak record ${formatValue(
        highestRecord.maxValue,
      )} in ${highestRecord.year}; lowest record ${formatValue(lowestRecord.minValue)} in ${lowestRecord.year}.`,
    );
  }

  function buildStoryRadialImpacts() {
    const tfrByKey = new Map(
      (state.story.indicatorSeriesRows.get("tfr") || [])
        .map((row) => [`${row.iso3}-${row.year}`, toNumberOrNull(row.value)])
        .filter(([, value]) => value != null),
    );

    return SHAP_FEATURE_CONFIG.map((feature) => {
      const joined = (state.story.indicatorSeriesRows.get(feature.code) || [])
        .map((row) => {
          const x = normalizeCorrelationValue(feature.code, row.value);
          const y = tfrByKey.get(`${row.iso3}-${row.year}`);
          if (x == null || y == null) return null;
          return { x, y };
        })
        .filter(Boolean);

      if (joined.length < 8) return null;
      const corr = pearsonCorrelation(
        joined,
        (row) => row.x,
        (row) => row.y,
      );
      if (corr == null) return null;

      return {
        ...feature,
        corr,
        impact: Math.abs(corr),
        sampleSize: joined.length,
      };
    }).filter(Boolean);
  }

  function drawStoryShapChart() {
    const svg = d3.select("#story-shap-chart");
    const width = 660;
    const height = 500;
    const centerX = width / 2;
    const centerY = height / 2 + 16;
    const innerRadius = 86;
    const maxOuterRadius = 224;

    svg.selectAll("*").remove();

    const rows = buildStoryRadialImpacts();
    if (!rows.length) return;
    const totalImpact = d3.sum(rows, (row) => row.impact) || 1;
    const rowsWithShare = rows.map((row) => ({
      ...row,
      sharePct: (row.impact / totalImpact) * 100,
    }));
    const maxShare = d3.max(rowsWithShare, (row) => row.sharePct) || 1;

    const angle = d3
      .scaleBand()
      .domain(rowsWithShare.map((row) => row.code))
      .range([0, Math.PI * 2])
      .paddingInner(0.18)
      .paddingOuter(0.05);

    const radius = d3.scaleLinear().domain([0, maxShare]).range([innerRadius + 18, maxOuterRadius]).clamp(true);
    const color = d3
      .scaleOrdinal()
      .domain(rowsWithShare.map((row) => row.code))
      .range(["#2d6a8a", "#52508c", "#4ba781", "#8cc253", "#2f8f8b"]);

    const layer = svg.append("g").attr("transform", `translate(${centerX},${centerY})`);

    layer
      .append("circle")
      .attr("r", maxOuterRadius + 8)
      .attr("fill", "none")
      .attr("stroke", "#cfded7")
      .attr("stroke-width", 1.4);

    [5, 10, 15, 20, 25, 30].forEach((tick) => {
      layer
        .append("circle")
        .attr("r", radius(Math.min(tick, maxShare)))
        .attr("fill", "none")
        .attr("stroke", "#e2ece7")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "3 5");
    });

    const arc = d3
      .arc()
      .innerRadius(innerRadius)
      .outerRadius((row) => radius(row.sharePct))
      .startAngle((row) => angle(row.code))
      .endAngle((row) => angle(row.code) + angle.bandwidth())
      .padAngle(0.015)
      .padRadius(innerRadius);

    const bars = layer
      .selectAll("path")
      .data(rowsWithShare)
      .join("path")
      .attr("d", arc)
      .attr("fill", (row) => color(row.code))
      .attr("fill-opacity", 0.93)
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 1.5)
      .style("cursor", "pointer");

    bars
      .on("mouseenter", (event, row) => {
        showStoryTooltip(
          event,
          `<strong>${row.label}</strong><br/><span>Impact share: ${formatValue(row.sharePct)}%</span><br/><span>|r| with TFR: ${formatValue(
            row.impact,
          )}</span><br/><span>Correlation sign: ${row.corr < 0 ? "negative" : "positive"} (${formatValue(
            row.corr,
          )})</span><br/><span>${formatInteger(row.sampleSize)} country-year observations</span>`,
        );
      })
      .on("mousemove", moveStoryTooltip)
      .on("mouseleave", hideStoryTooltip);

    const labels = layer
      .selectAll("g.story-circular-label")
      .data(rowsWithShare)
      .join("g")
      .attr("class", "story-circular-label")
      .attr("transform", (row) => {
        const a = angle(row.code) + angle.bandwidth() / 2 - Math.PI / 2;
        const labelRadius = radius(row.sharePct) + 18;
        return `translate(${Math.cos(a) * labelRadius},${Math.sin(a) * labelRadius})`;
      });

    labels
      .append("text")
      .attr("text-anchor", (row) => {
        const a = angle(row.code) + angle.bandwidth() / 2;
        return a > Math.PI ? "end" : "start";
      })
      .attr("class", "story-axis-label")
      .text((row) => row.label);

    labels
      .append("text")
      .attr("dy", 14)
      .attr("text-anchor", (row) => {
        const a = angle(row.code) + angle.bandwidth() / 2;
        return a > Math.PI ? "end" : "start";
      })
      .attr("class", "story-note")
      .text((row) => `${d3.format(".1f")(row.sharePct)}%`);

    layer
      .append("circle")
      .attr("r", innerRadius - 8)
      .attr("fill", "#1b7a63")
      .attr("fill-opacity", 0.92)
      .attr("stroke", "#0f5a47")
      .attr("stroke-width", 1.2);

    layer
      .append("text")
      .attr("text-anchor", "middle")
      .attr("fill", "#f3fffa")
      .style("font-size", "16px")
      .style("font-weight", "800")
      .text("Low fertility");
    layer
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", 18)
      .attr("fill", "#d7f3ea")
      .style("font-size", "11px")
      .text("main drivers");

    const strongestFeature = rowsWithShare.slice().sort((a, b) => d3.descending(a.sharePct, b.sharePct))[0];
    if (strongestFeature) {
      setText(
        "story-shap-summary",
        `Circular radial impact chart based on pooled country-year data (${state.story.firstYear}-${state.story.latestYear}). Bars show each factor's share in total relationship strength with fertility. These features are the main drivers behind low fertility in this model view, and ${strongestFeature.label} has the largest share (${formatValue(
          strongestFeature.sharePct,
        )}%).`,
      );
    }
  }

  function buildIndicatorTfrCorrelationMap(codes) {
    const tfrByKey = new Map(
      (state.story.indicatorSeriesRows.get("tfr") || [])
        .map((row) => [`${row.iso3}-${row.year}`, toNumberOrNull(row.value)])
        .filter(([, value]) => value != null),
    );

    return new Map(
      codes.map((code) => {
        const joined = (state.story.indicatorSeriesRows.get(code) || [])
          .map((row) => {
            const x = normalizeCorrelationValue(code, row.value);
            const y = tfrByKey.get(`${row.iso3}-${row.year}`);
            if (x == null || y == null) return null;
            return { x, y };
          })
          .filter(Boolean);

        const corr = pearsonCorrelation(
          joined,
          (row) => row.x,
          (row) => row.y,
        );

        return [code, { corr, count: joined.length }];
      }),
    );
  }

  function drawStoryThemeBubbleChart() {
    const svg = d3.select("#story-theme-bubble-chart");
    const width = 660;
    const height = 500;
    const margin = { top: 26, right: 28, bottom: 52, left: 246 };
    svg.selectAll("*").remove();

    const allCodes = TFR_THEME_GROUPS.flatMap((group) => group.codes);
    const corrByCode = buildIndicatorTfrCorrelationMap(allCodes);

    const rows = TFR_THEME_GROUPS.map((group) => {
      const indicators = group.codes
        .map((code) => ({
          code,
          label: indicatorShortLabel(code),
          corr: (corrByCode.get(code) || {}).corr,
          count: (corrByCode.get(code) || {}).count || 0,
        }))
        .filter((item) => item.corr != null);
      if (!indicators.length) return null;
      return {
        key: group.key,
        label: group.label,
        indicators,
        avgAbsCorr: d3.mean(indicators, (item) => Math.abs(item.corr)) || 0,
      };
    }).filter(Boolean);

    if (!rows.length) return;

    const totalWeight = d3.sum(rows, (row) => row.avgAbsCorr) || 1;
    const bars = rows
      .map((row) => ({
        ...row,
        contributionPct: (row.avgAbsCorr / totalWeight) * 100,
      }))
      .sort((a, b) => d3.descending(a.contributionPct, b.contributionPct));

    const x = d3
      .scaleLinear()
      .domain([0, (d3.max(bars, (row) => row.contributionPct) || 1) * 1.14])
      .nice()
      .range([margin.left, width - margin.right]);
    const y = d3
      .scaleBand()
      .domain(bars.map((row) => row.label))
      .range([margin.top, height - margin.bottom])
      .paddingInner(0.34);

    svg
      .append("g")
      .attr("class", "story-gridline")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(6).tickFormat("").tickSize(-(height - margin.top - margin.bottom)))
      .call((g) => g.select(".domain").remove());

    svg
      .append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(6).tickFormat((value) => `${d3.format(".0f")(value)}%`));
    svg
      .append("g")
      .attr("class", "axis")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).tickSize(0))
      .call((g) => g.select(".domain").remove());

    svg
      .append("g")
      .selectAll("rect")
      .data(bars)
      .join("rect")
      .attr("x", margin.left)
      .attr("y", (row) => y(row.label))
      .attr("width", (row) => x(row.contributionPct) - margin.left)
      .attr("height", y.bandwidth())
      .attr("rx", 9)
      .attr("fill", "#2f8d71")
      .attr("opacity", 0.9)
      .style("cursor", "pointer")
      .on("mouseenter", (event, row) => {
        showStoryTooltip(
          event,
          `<strong>${row.label}</strong><br/><span>Group contribution: ${formatValue(row.contributionPct)}%</span><br/><span>Average |r| with TFR: ${formatValue(
            row.avgAbsCorr,
          )}</span><br/><span>${row.indicators
            .map((item) => `${item.label}: ${formatValue(item.corr)}`)
            .join("<br/>")}</span>`,
        );
      })
      .on("mousemove", moveStoryTooltip)
      .on("mouseleave", hideStoryTooltip);

    svg
      .append("g")
      .selectAll("text")
      .data(bars)
      .join("text")
      .attr("x", (row) => x(row.contributionPct) + 6)
      .attr("y", (row) => y(row.label) + y.bandwidth() / 2 + 4)
      .attr("text-anchor", "start")
      .attr("class", "story-note")
      .attr("fill", "#22463b")
      .style("font-weight", "700")
      .text((row) => `${d3.format(".1f")(row.contributionPct)}%`);

    svg
      .append("text")
      .attr("x", (margin.left + width - margin.right) / 2)
      .attr("y", height - 12)
      .attr("text-anchor", "middle")
      .attr("class", "story-axis-label")
      .text("Group contribution, %");

    const strongest = bars[0];
    if (strongest) {
      setText(
        "story-theme-bubble-summary",
        `${strongest.label} contributes the largest share in this grouped decomposition (${formatValue(
          strongest.contributionPct,
        )}%). Bars are normalized to 100% across thematic groups.`,
      );
    }
  }

  function drawStoryAdolescentChart() {
    const svg = d3.select("#story-adolescent-chart");
    const width = 660;
    const height = 500;
    const margin = { top: 24, right: 20, bottom: 130, left: 72 };

    svg.selectAll("*").remove();
    if (!state.story.latestAdolescentRows.length) return;

    const stats = d3
      .groups(
        state.story.latestAdolescentRows.filter(
          (row) => row.region && row.region !== "Unknown" && Number.isFinite(toNumberOrNull(row.value)),
        ),
        (row) => row.region,
      )
      .map(([region, rows]) => {
        const summary = boxPlotStats(rows.map((row) => Number(row.value)));
        if (!summary) return null;
        return {
          region,
          ...summary,
        };
      })
      .filter(Boolean)
      .sort((a, b) => d3.descending(a.median, b.median));

    if (!stats.length) return;

    const x = d3
      .scaleBand()
      .domain(stats.map((row) => row.region))
      .range([margin.left, width - margin.right])
      .paddingInner(0.22)
      .paddingOuter(0.08);
    const y = d3
      .scaleLinear()
      .domain([0, (d3.max(stats, (row) => Math.max(row.max, d3.max(row.outliers) || 0)) || 1) + 12])
      .nice()
      .range([height - margin.bottom, margin.top]);

    svg
      .append("rect")
      .attr("x", margin.left)
      .attr("y", margin.top)
      .attr("width", width - margin.left - margin.right)
      .attr("height", height - margin.top - margin.bottom)
      .attr("rx", 12)
      .attr("fill", "#dde7f2");

    svg
      .append("g")
      .attr("class", "story-gridline")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(5).tickSize(-(width - margin.left - margin.right)).tickFormat(""))
      .call((g) => g.select(".domain").remove())
      .call((g) => g.selectAll("line").attr("stroke", "rgba(255,255,255,0.78)"));

    svg
      .append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(
        d3
          .axisBottom(x)
          .tickFormat((value) => value.replace("Middle East, North Africa, Afghanistan & Pakistan", "MENA, Afghanistan & Pakistan")),
      )
      .selectAll("text")
      .attr("transform", "rotate(-24)")
      .style("text-anchor", "end");
    svg.append("g").attr("class", "axis").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(5));

    const boxLayer = svg.append("g");

    stats.forEach((row) => {
      const bandX = x(row.region);
      const center = bandX + x.bandwidth() / 2;
      const boxWidth = x.bandwidth() * 0.58;
      const color = regionColor(row.region);
      const isAfrica = row.region === "Sub-Saharan Africa";
      const fillOpacity = isAfrica ? 0.44 : 0.24;
      const strokeWidth = isAfrica ? 2.5 : 2;
      const fillColor = d3.color(color);
      if (fillColor) fillColor.opacity = fillOpacity;

      boxLayer
        .append("line")
        .attr("x1", center)
        .attr("x2", center)
        .attr("y1", y(row.min))
        .attr("y2", y(row.max))
        .attr("stroke", color)
        .attr("stroke-width", strokeWidth)
        .attr("opacity", 0.92);

      boxLayer
        .append("line")
        .attr("x1", center - boxWidth * 0.22)
        .attr("x2", center + boxWidth * 0.22)
        .attr("y1", y(row.min))
        .attr("y2", y(row.min))
        .attr("stroke", color)
        .attr("stroke-width", strokeWidth);

      boxLayer
        .append("line")
        .attr("x1", center - boxWidth * 0.22)
        .attr("x2", center + boxWidth * 0.22)
        .attr("y1", y(row.max))
        .attr("y2", y(row.max))
        .attr("stroke", color)
        .attr("stroke-width", strokeWidth);

      boxLayer
        .append("rect")
        .attr("x", center - boxWidth / 2)
        .attr("y", y(row.q3))
        .attr("width", boxWidth)
        .attr("height", Math.max(2, y(row.q1) - y(row.q3)))
        .attr("fill", fillColor ? `${fillColor}` : color)
        .attr("stroke", color)
        .attr("stroke-width", strokeWidth);

      boxLayer
        .append("line")
        .attr("x1", center - boxWidth / 2)
        .attr("x2", center + boxWidth / 2)
        .attr("y1", y(row.median))
        .attr("y2", y(row.median))
        .attr("stroke", color)
        .attr("stroke-width", strokeWidth + 0.2);

      boxLayer
        .append("rect")
        .attr("x", bandX)
        .attr("y", margin.top)
        .attr("width", x.bandwidth())
        .attr("height", height - margin.top - margin.bottom)
        .attr("fill", "transparent")
        .style("cursor", "pointer")
        .on("mouseenter", (event) => {
          showStoryTooltip(
            event,
            `<strong>${row.region}</strong><br/><span>Countries: ${formatInteger(row.count)}</span><br/><span>Median: ${formatValueWithUnit(
              row.median,
              "births per 1,000 women ages 15-19",
            )}</span><br/><span>IQR: ${formatValue(row.q1)} to ${formatValue(row.q3)}</span><br/><span>Whiskers: ${formatValue(
              row.min,
            )} to ${formatValue(row.max)}</span>`,
          );
        })
        .on("mousemove", moveStoryTooltip)
        .on("mouseleave", hideStoryTooltip);

      boxLayer
        .append("g")
        .selectAll("circle")
        .data(row.outliers.map((value, index) => ({ value, index })))
        .join("circle")
        .attr("cx", ({ index }) => center + ((stableHash(`${row.region}-${index}`) % 1000) / 1000 - 0.5) * boxWidth * 0.42)
        .attr("cy", (point) => y(point.value))
        .attr("r", 3.2)
        .attr("fill", color)
        .attr("opacity", 0.85)
        .style("cursor", "pointer")
        .on("mouseenter", (event, point) => {
          showStoryTooltip(
            event,
            `<strong>${row.region}</strong><br/><span>Outlier: ${formatValueWithUnit(
              point.value,
              "births per 1,000 women ages 15-19",
            )}</span>`,
          );
        })
        .on("mousemove", moveStoryTooltip)
        .on("mouseleave", hideStoryTooltip);
    });

    svg
      .append("text")
      .attr("x", margin.left)
      .attr("y", margin.top - 8)
      .attr("class", "story-axis-label")
      .text("Adolescent fertility (births per 1,000 women ages 15-19)");
  }

  function drawStoryWomenWorkChart() {
    const svg = d3.select("#story-work-chart");
    const width = 660;
    const height = 500;
    const margin = { top: 28, right: 72, bottom: 130, left: 74 };

    svg.selectAll("*").remove();
    if (!state.story.latestLaborRows.length || !state.story.latestTfrRows.length) return;

    const laborByRegion = averageBy(state.story.latestLaborRows, "region");
    const tfrByRegion = averageBy(state.story.latestTfrRows, "region");
    const rows = (state.meta.regions || [])
      .map((region) => ({
        region,
        labor: laborByRegion.get(region),
        tfr: tfrByRegion.get(region),
      }))
      .filter((row) => Number.isFinite(row.labor) && Number.isFinite(row.tfr))
      .sort((a, b) => d3.ascending(a.labor, b.labor));

    if (!rows.length) return;

    const x = d3
      .scaleBand()
      .domain(rows.map((row) => row.region))
      .range([margin.left, width - margin.right])
      .paddingInner(0.18)
      .paddingOuter(0.08);
    const yLeft = d3
      .scaleLinear()
      .domain([0, (d3.max(rows, (row) => row.labor) || 1) + 6])
      .nice()
      .range([height - margin.bottom, margin.top]);
    const yRight = d3
      .scaleLinear()
      .domain([0, (d3.max(rows, (row) => row.tfr) || 1) + 0.45])
      .nice()
      .range([height - margin.bottom, margin.top]);

    svg
      .append("rect")
      .attr("x", margin.left)
      .attr("y", margin.top)
      .attr("width", width - margin.left - margin.right)
      .attr("height", height - margin.top - margin.bottom)
      .attr("rx", 12)
      .attr("fill", "#eef4ef");

    svg
      .append("g")
      .attr("class", "story-gridline")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(yLeft).ticks(5).tickSize(-(width - margin.left - margin.right)).tickFormat(""))
      .call((g) => g.select(".domain").remove());

    svg
      .append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).tickFormat((value) => value.replace(MENA_REGION, "MENA, Afghanistan & Pakistan")))
      .selectAll("text")
      .attr("transform", "rotate(-22)")
      .style("text-anchor", "end");

    svg.append("g").attr("class", "axis").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(yLeft).ticks(5));

    svg
      .append("g")
      .attr("class", "axis")
      .attr("transform", `translate(${width - margin.right},0)`)
      .call(d3.axisRight(yRight).ticks(5));

    svg
      .append("g")
      .selectAll("rect")
      .data(rows)
      .join("rect")
      .attr("x", (row) => x(row.region))
      .attr("y", (row) => yLeft(row.labor))
      .attr("width", x.bandwidth())
      .attr("height", (row) => yLeft(0) - yLeft(row.labor))
      .attr("fill", (row) => (row.region === MENA_REGION ? "#145f4a" : "#93c0ae"))
      .attr("opacity", (row) => (row.region === MENA_REGION ? 0.98 : 0.84))
      .attr("rx", 8);

    const line = d3
      .line()
      .x((row) => x(row.region) + x.bandwidth() / 2)
      .y((row) => yRight(row.tfr))
      .curve(d3.curveMonotoneX);

    svg
      .append("path")
      .datum(rows)
      .attr("fill", "none")
      .attr("stroke", "#b14d2f")
      .attr("stroke-width", 2.6)
      .attr("d", line);

    svg
      .append("g")
      .selectAll("circle")
      .data(rows)
      .join("circle")
      .attr("cx", (row) => x(row.region) + x.bandwidth() / 2)
      .attr("cy", (row) => yRight(row.tfr))
      .attr("r", (row) => (row.region === MENA_REGION ? 5.2 : 4.1))
      .attr("fill", "#b14d2f")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.6);

    const focusDot = svg
      .append("circle")
      .attr("class", "chart-hover-point")
      .attr("r", 5.2)
      .attr("stroke", "#b14d2f")
      .style("display", "none");

    svg
      .append("g")
      .selectAll("rect.interaction")
      .data(rows)
      .join("rect")
      .attr("class", "interaction")
      .attr("x", (row) => x(row.region))
      .attr("y", margin.top)
      .attr("width", x.bandwidth())
      .attr("height", height - margin.top - margin.bottom)
      .attr("fill", "transparent")
      .style("cursor", "pointer")
      .on("mouseenter", (event, row) => {
        focusDot
          .style("display", null)
          .attr("cx", x(row.region) + x.bandwidth() / 2)
          .attr("cy", yRight(row.tfr));
        showStoryTooltip(
          event,
          `<strong>${row.region}</strong><br/><span>Female labor force participation: ${formatValueWithUnit(
            row.labor,
            "% ages 15+",
          )}</span><br/><span>TFR: ${formatValueWithUnit(row.tfr, "births per woman")}</span>`,
        );
      })
      .on("mousemove", moveStoryTooltip)
      .on("mouseleave", () => {
        focusDot.style("display", "none");
        hideStoryTooltip();
      });

    svg
      .append("text")
      .attr("x", margin.left)
      .attr("y", margin.top - 10)
      .attr("class", "story-axis-label")
      .text("Female labor force participation (% ages 15+)");

    svg
      .append("text")
      .attr("x", width - margin.right)
      .attr("y", margin.top - 10)
      .attr("text-anchor", "end")
      .attr("class", "story-axis-label")
      .text("TFR (births per woman)");

    renderStoryLegend("story-work-legend", [
      { label: "Female labor force participation", color: "#93c0ae" },
      { label: "TFR", color: "#b14d2f" },
      { label: "Highlighted: MENA, Afghanistan & Pakistan", color: "#145f4a" },
    ]);
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
    const width = 660;
    const height = 500;
    const margin = { top: 24, right: 18, bottom: 32, left: 186 };
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
      .domain([0, d3.max(declines, (d) => Math.max(d.firstValue, d.latestValue)) || 1])
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
      .attr("width", (d) => x(d.firstValue) - margin.left)
      .attr("height", y.bandwidth())
      .attr("fill", "#dbe7e1")
      .attr("stroke", "#bfd4ca");

    svg
      .append("g")
      .selectAll("rect.latest")
      .data(declines)
      .join("rect")
      .attr("class", "latest")
      .attr("x", margin.left)
      .attr("y", (d) => y(d.name) + y.bandwidth() * 0.18)
      .attr("width", (d) => x(d.latestValue) - margin.left)
      .attr("height", y.bandwidth() * 0.64)
      .attr("fill", "#2f8d71")
      .attr("opacity", 0.94);

    svg
      .append("g")
      .selectAll("text.value")
      .data(declines)
      .join("text")
      .attr("x", (d) => x(d.firstValue) + 6)
      .attr("y", (d) => y(d.name) + y.bandwidth() / 2 + 4)
      .attr("class", "story-note")
      .text((d) => `-${formatValue(d.drop)}`);

    svg
      .append("text")
      .attr("x", margin.left)
      .attr("y", margin.top - 8)
      .attr("class", "story-axis-label")
      .text("TFR level: first year vs latest year (births per woman)");

    renderStoryLegend("story-decline-legend", [
      { label: `${state.story.firstYear}`, color: "#dbe7e1" },
      { label: `${state.story.latestYear}`, color: "#2f8d71" },
    ]);

    const list = el("story-decline-list");
    if (list) {
      list.innerHTML = "";
      declines.forEach((row) => {
        const item = document.createElement("li");
        const explanation = DECLINE_EXPLANATIONS[row.iso3];
        if (explanation) {
          item.innerHTML = `<strong>${row.name}:</strong> ${explanation}`;
        } else {
          item.textContent = `${row.name}: ${state.story.firstYear} ${formatValue(row.firstValue)} -> ${state.story.latestYear} ${formatValue(
            row.latestValue,
          )} (-${formatValue(row.drop)} births per woman)`;
        }
        list.appendChild(item);
      });
    }
  }

  function buildStoryCorrelationMatrix() {
    const codes = panelIndicatorCodes().filter((code) => state.story.indicatorSeriesRows.has(code));
    const valuesByCode = new Map(
      codes.map((code) => {
        const rows = state.story.indicatorSeriesRows.get(code) || [];
        return [
          code,
          new Map(
            rows
              .map((row) => [`${row.iso3}-${row.year}`, normalizeCorrelationValue(code, row.value)])
              .filter(([, value]) => value != null),
          ),
        ];
      }),
    );

    const matrix = [];
    codes.forEach((yCode) => {
      codes.forEach((xCode) => {
        const xValues = valuesByCode.get(xCode) || new Map();
        const yValues = valuesByCode.get(yCode) || new Map();
        const sharedKeys = Array.from(xValues.keys()).filter((key) => yValues.has(key));
        const rows = sharedKeys.map((key) => ({
          x: xValues.get(key),
          y: yValues.get(key),
        }));
        const value = xCode === yCode ? (rows.length ? 1 : null) : pearsonCorrelation(rows, (row) => row.x, (row) => row.y);
        matrix.push({
          xCode,
          yCode,
          value,
          count: rows.length,
        });
      });
    });

    state.story.correlationCodes = codes;
    state.story.correlationMatrix = matrix;
  }

  function strongestStoryCorrelation() {
    const order = new Map((state.story.correlationCodes || []).map((code, index) => [code, index]));
    return state.story.correlationMatrix
      .filter(
        (cell) => cell.xCode !== cell.yCode && cell.value != null && (order.get(cell.xCode) || 0) < (order.get(cell.yCode) || 0),
      )
      .sort((a, b) => d3.descending(Math.abs(a.value), Math.abs(b.value)))[0];
  }

  function drawStoryCorrelationChart() {
    const svg = d3.select("#story-correlation-chart");
    const width = 660;
    const height = 500;
    const margin = { top: 108, right: 20, bottom: 20, left: 116 };

    svg.selectAll("*").remove();

    const codes = state.story.correlationCodes || [];
    const matrix = state.story.correlationMatrix || [];
    if (!codes.length || !matrix.length) return;

    const x = d3.scaleBand().domain(codes).range([margin.left, width - margin.right]).paddingInner(0.04);
    const y = d3.scaleBand().domain(codes).range([margin.top, height - margin.bottom]).paddingInner(0.04);
    const color = d3
      .scaleLinear()
      .domain([-1, 0, 1])
      .range(["#b14d2f", "#f7f4ed", "#1b7a63"])
      .clamp(true);

    const cells = svg.append("g");
    cells
      .selectAll("rect")
      .data(matrix)
      .join("rect")
      .attr("x", (cell) => x(cell.xCode))
      .attr("y", (cell) => y(cell.yCode))
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .attr("rx", 4)
      .attr("fill", (cell) => (cell.value == null ? "#eef3f0" : color(cell.value)))
      .attr("stroke", "#d9e3de")
      .style("cursor", "pointer")
      .on("mouseenter", (event, cell) => {
        const xMeta = indicatorMeta(cell.xCode);
        const yMeta = indicatorMeta(cell.yCode);
        const sampleLabel = state.story.correlationMode === "pooled" ? "country-year observations" : "countries";
        showStoryTooltip(
          event,
          `<strong>${xMeta ? xMeta.label : cell.xCode}</strong> vs <strong>${yMeta ? yMeta.label : cell.yCode}</strong><br/><span>r = ${formatValue(
            cell.value,
          )}</span><br/><span>${formatInteger(cell.count)} ${sampleLabel}</span>`,
        );
      })
      .on("mousemove", moveStoryTooltip)
      .on("mouseleave", hideStoryTooltip);

    svg
      .append("g")
      .selectAll("text")
      .data(matrix.filter((cell) => cell.value != null))
      .join("text")
      .attr("x", (cell) => x(cell.xCode) + x.bandwidth() / 2)
      .attr("y", (cell) => y(cell.yCode) + y.bandwidth() / 2 + 2.5)
      .attr("text-anchor", "middle")
      .attr("class", "story-correlation-value")
      .attr("fill", (cell) => (Math.abs(cell.value) >= 0.42 ? "#ffffff" : "#26453c"))
      .text((cell) => d3.format(".2f")(cell.value));

    svg
      .append("g")
      .selectAll("text")
      .data(codes)
      .join("text")
      .attr("x", 0)
      .attr("y", 0)
      .attr("text-anchor", "start")
      .attr("transform", (code) => `translate(${x(code) + x.bandwidth() / 2},${margin.top - 10}) rotate(-34)`)
      .attr("class", "story-axis-label")
      .text((code) => indicatorShortLabel(code))
      .append("title")
      .text((code) => (indicatorMeta(code) ? indicatorMeta(code).label : code));

    svg
      .append("g")
      .selectAll("text")
      .data(codes)
      .join("text")
      .attr("x", margin.left - 6)
      .attr("y", (code) => y(code) + y.bandwidth() / 2 + 3.5)
      .attr("text-anchor", "end")
      .attr("class", "story-axis-label")
      .text((code) => indicatorShortLabel(code))
      .append("title")
      .text((code) => (indicatorMeta(code) ? indicatorMeta(code).label : code));

    const legendSteps = d3.range(-1, 1.001, 0.1);
    const legendWidth = legendSteps.length * 9;
    const legend = svg.append("g").attr("transform", `translate(${width - legendWidth - 18},20)`);
    legend
      .selectAll("rect")
      .data(legendSteps)
      .join("rect")
      .attr("x", (_, index) => index * 9)
      .attr("y", 0)
      .attr("width", 9)
      .attr("height", 8)
      .attr("fill", (value) => color(value));

    legend
      .append("text")
      .attr("x", 0)
      .attr("y", -6)
      .attr("class", "story-note")
      .text("Pearson correlation");
    legend
      .append("text")
      .attr("x", 0)
      .attr("y", 18)
      .attr("class", "story-note")
      .text("-1.0");
    legend
      .append("text")
      .attr("x", legendWidth / 2)
      .attr("y", 18)
      .attr("class", "story-note")
      .attr("text-anchor", "middle")
      .text("0");
    legend
      .append("text")
      .attr("x", legendWidth)
      .attr("y", 18)
      .attr("class", "story-note")
      .attr("text-anchor", "end")
      .text("+1.0");
  }

  function describeStoryCountry(story, config) {
    if (!story) return "Country story unavailable.";

    const tfrPoints = (story.series.tfr || []).map((point) => ({ year: Number(point.year), value: Number(point.value) }));
    const populationPoints = (story.series.population_change || []).map((point) => ({
      year: Number(point.year),
      value: Number(point.value),
    }));

    const last = lastFinitePoint(tfrPoints);
    if (!last) return "Country story unavailable.";

    if (config.iso3 === "RUS") {
      const preShock = findPointByYear(tfrPoints, 1990) || firstFinitePoint(tfrPoints);
      const trough = tfrPoints.reduce((lowest, point) => (point.value < lowest.value ? point : lowest), tfrPoints[0]);
      const negativeTurn = populationPoints.find((point) => point.value < 0);
      return `Russia shows a sharp break through the 1990s: TFR falls from ${formatValue(preShock.value)} in ${
        preShock.year
      } to ${formatValue(trough.value)} in ${trough.year}. Annual population change turns negative in ${
        negativeTurn ? negativeTurn.year : "the 1990s"
      }, and the latest TFR is ${formatValue(last.value)} in ${last.year}.`;
    }

    if (config.iso3 === "CHN") {
      const start = findPointByYear(tfrPoints, 1970) || firstFinitePoint(tfrPoints);
      const policyPoint = findPointByYear(tfrPoints, config.markerYear) || firstFinitePoint(tfrPoints);
      const belowReplacement = tfrPoints.find((point) => point.value < 2.1);
      const negativeTurn = populationPoints.find((point) => point.value < 0);
      return `China moves from ${formatValue(start.value)} births per woman in ${start.year} to ${formatValue(
        policyPoint.value,
      )} in ${policyPoint.year}. The line drops below replacement in ${
        belowReplacement ? belowReplacement.year : "the early 1990s"
      }, and annual population change turns negative in ${negativeTurn ? negativeTurn.year : "the 2020s"}.`;
    }

    return `${story.name || config.title} ends at ${formatValue(last.value)} births per woman in ${last.year}.`;
  }

  function drawStoryCountryChart(svgId, story, config) {
    const svg = d3.select(svgId);
    const width = 460;
    const height = 220;
    const margin = { top: 20, right: 18, bottom: 34, left: 46 };
    svg.selectAll("*").remove();

    if (!story) return;

    const points = (story.series.tfr || [])
      .map((point) => ({ year: Number(point.year), value: Number(point.value) }))
      .filter((point) => Number.isFinite(point.year) && Number.isFinite(point.value));
    if (!points.length) return;

    const x = d3
      .scaleLinear()
      .domain(d3.extent(points, (point) => point.year))
      .range([margin.left, width - margin.right]);
    const y = d3
      .scaleLinear()
      .domain(d3.extent(points, (point) => point.value))
      .nice()
      .range([height - margin.bottom, margin.top]);

    svg
      .append("g")
      .attr("class", "story-gridline")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(4).tickSize(-(width - margin.left - margin.right)).tickFormat(""))
      .call((g) => g.select(".domain").remove());

    if (config.focusEndYear) {
      svg
        .append("rect")
        .attr("x", x(config.markerYear))
        .attr("y", margin.top)
        .attr("width", x(config.focusEndYear) - x(config.markerYear))
        .attr("height", height - margin.top - margin.bottom)
        .attr("fill", config.accent)
        .attr("opacity", 0.08);
    }

    svg
      .append("line")
      .attr("x1", x(config.markerYear))
      .attr("x2", x(config.markerYear))
      .attr("y1", margin.top)
      .attr("y2", height - margin.bottom)
      .attr("stroke", config.accent)
      .attr("stroke-dasharray", "5 4")
      .attr("opacity", 0.7);

    svg
      .append("text")
      .attr("x", x(config.markerYear) + 6)
      .attr("y", margin.top + 10)
      .attr("class", "story-note")
      .text(`${config.markerYear}: ${config.markerLabel}`);

    svg
      .append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(6).tickFormat(d3.format("d")));
    svg.append("g").attr("class", "axis").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(4));

    svg
      .append("path")
      .datum(points)
      .attr("fill", "none")
      .attr("stroke", config.accent)
      .attr("stroke-width", 2.6)
      .attr(
        "d",
        d3
          .line()
          .x((point) => x(point.year))
          .y((point) => y(point.value))
          .curve(d3.curveMonotoneX),
      );

    const hoverPoint = svg
      .append("circle")
      .attr("class", "chart-hover-point")
      .attr("r", 4.5)
      .attr("stroke", config.accent)
      .style("display", "none");

    const trough = points.reduce((lowest, point) => (point.value < lowest.value ? point : lowest), points[0]);
    const last = lastFinitePoint(points);
    const highlightPoints =
      last && trough.year === last.year && trough.value === last.value ? [trough] : [trough, last].filter(Boolean);

    highlightPoints.forEach((point, index) => {
      svg
        .append("circle")
        .attr("cx", x(point.year))
        .attr("cy", y(point.value))
        .attr("r", 4)
        .attr("fill", config.accent);

      svg
        .append("text")
        .attr("x", x(point.year) + (index ? -6 : 6))
        .attr("y", y(point.value) - 8)
        .attr("text-anchor", index ? "end" : "start")
        .attr("class", "story-note")
        .text(`${point.year}: ${formatValue(point.value)}`);
    });

    svg
      .append("g")
      .selectAll("circle")
      .data(points)
      .join("circle")
      .attr("cx", (point) => x(point.year))
      .attr("cy", (point) => y(point.value))
      .attr("r", 8)
      .attr("fill", "transparent")
      .style("cursor", "pointer")
      .on("mouseenter", (event, point) => {
        hoverPoint.style("display", null).attr("cx", x(point.year)).attr("cy", y(point.value));
        showStoryTooltip(
          event,
          `<strong>${config.title}</strong><br/><span>Year: ${point.year}</span><br/><span>TFR: ${formatValueWithUnit(
            point.value,
            "births per woman",
          )}</span>`,
        );
      })
      .on("mousemove", (event, point) => {
        hoverPoint.style("display", null).attr("cx", x(point.year)).attr("cy", y(point.value));
        moveStoryTooltip(event);
      })
      .on("mouseleave", () => {
        hoverPoint.style("display", "none");
        hideStoryTooltip();
      });

    svg
      .append("text")
      .attr("x", margin.left)
      .attr("y", margin.top - 6)
      .attr("class", "story-axis-label")
      .text("TFR (births per woman)");
  }

  function renderStoryCountryFacts() {
    const host = el("story-facts-grid");
    if (!host) return;
    host.innerHTML = "";

    STORY_COUNTRY_CONFIGS.forEach((config) => {
      const story = state.story.countryStories.get(config.iso3);
      const article = document.createElement("article");
      article.className = "story-fact-card";
      const footnote =
        config.iso3 === "CHN" ? `<p class="story-fact-footnote">${CHINA_ONE_CHILD_FOOTNOTE}</p>` : "";
      article.innerHTML = `
        <div class="story-fact-copy">
          <p class="story-fact-kicker">${story ? `${story.name} | ${story.region || "Country profile"}` : config.title}</p>
          <h3>${config.title}</h3>
          <p class="story-fact-text">${describeStoryCountry(story, config)}</p>
          ${footnote}
        </div>
        <svg id="story-fact-chart-${config.iso3}" viewBox="0 0 460 220" class="story-fact-chart"></svg>
      `;
      host.appendChild(article);
      drawStoryCountryChart(`#story-fact-chart-${config.iso3}`, story, config);
    });
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

    if (last) {
      const topRegion = Array.from(last.byRegion.entries()).sort((a, b) => d3.descending(a[1], b[1]))[0];
      if (topRegion) {
        setText(
          "story-region-summary",
          `Each line shows the regional average by year. In ${state.story.latestYear}, the highest regional average TFR is still in ${
            topRegion[0]
          } at ${formatValueWithUnit(topRegion[1], "births per woman")}.`,
        );
      }
    }

    if (state.story.latestAdolescentRows.length) {
      const adolescentStats = d3
        .groups(
          state.story.latestAdolescentRows.filter(
            (row) => row.region && row.region !== "Unknown" && Number.isFinite(toNumberOrNull(row.value)),
          ),
          (row) => row.region,
        )
        .map(([region, rows]) => ({
          region,
          summary: boxPlotStats(rows.map((row) => Number(row.value))),
        }))
        .filter((row) => row.summary)
        .sort((a, b) => d3.descending(a.summary.median, b.summary.median));

      if (adolescentStats.length) {
        const africa = adolescentStats.find((row) => row.region === "Sub-Saharan Africa") || adolescentStats[0];
        setText(
          "story-adolescent-summary",
          `Box plots compare country-level adolescent fertility in ${state.story.latestYear}. Sub-Saharan Africa stands out most clearly, with the highest regional median at ${formatValueWithUnit(
            africa.summary.median,
            "births per 1,000 women ages 15-19",
          )}.`,
        );
      }
    }

    if (state.story.latestLaborRows.length && state.story.latestTfrRows.length) {
      const laborByRegion = averageBy(state.story.latestLaborRows, "region");
      const tfrByRegion = averageBy(state.story.latestTfrRows, "region");
      const menaLabor = laborByRegion.get(MENA_REGION);
      const menaTfr = tfrByRegion.get(MENA_REGION);
      if (Number.isFinite(menaLabor) && Number.isFinite(menaTfr)) {
        setText(
          "story-work-summary",
          `Bars show average female labor force participation by region in ${state.story.latestYear}, while the line shows regional TFR. ${MENA_REGION} is highlighted because it combines only ${formatValueWithUnit(
            menaLabor,
            "% ages 15+",
          )} in women's labor force participation with ${formatValueWithUnit(menaTfr, "births per woman")} in TFR.`,
        );
      }
    }

    setText(
      "story-decline-summary",
      `Countries are sorted by total TFR decline from ${state.story.firstYear} to ${state.story.latestYear}. The pale bar shows the starting level and the dark bar shows where it ended.`,
    );

    const strongestCorr = strongestStoryCorrelation();
    if (strongestCorr) {
      const summaryPrefix =
        state.story.correlationMode === "pooled"
          ? `The matrix is based on all available country-year observations from ${state.story.firstYear} to ${state.story.latestYear}.`
          : `The matrix is currently based on country values in ${state.story.latestYear} because the extended all-years endpoint is unavailable.`;
      const relationshipLabel = state.story.correlationMode === "pooled" ? "strongest pooled relationship" : "strongest latest-year relationship";
      setText(
        "story-correlation-summary",
        `${summaryPrefix} The ${relationshipLabel} is between ${
          indicatorShortLabel(strongestCorr.xCode)
        } and ${indicatorShortLabel(strongestCorr.yCode)} (r=${formatValue(strongestCorr.value)}). GDP per capita and women ages 15-49 are log-scaled for readability.`,
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

      const tfrAllRows = tfrSeriesRaw.flatMap((response, index) =>
        (response.rows || []).map((row) => ({
          ...row,
          year: years[index],
        })),
      );

      const latestIndicatorResponses = await Promise.all(
        state.indicators.map(async (item) => {
          if (item.code === "tfr") return [item.code, state.story.latestTfrRows];
          const response = await fetchJSON(buildApiUrl("/map-data", { year: state.story.latestYear, indicator: item.code }));
          return [item.code, response.rows || []];
        }),
      );

      state.story.latestIndicatorRows = new Map(latestIndicatorResponses);

      try {
        const indicatorResponses = await Promise.all(
          state.indicators.map(async (item) => {
            if (item.code === "tfr") return [item.code, tfrAllRows];
            const response = await fetchJSON(
              buildApiUrl("/indicator-series", {
                indicator: item.code,
                min_year: state.story.firstYear,
                max_year: state.story.latestYear,
              }),
            );
            return [item.code, response.rows || []];
          }),
        );

        state.story.indicatorSeriesRows = new Map(indicatorResponses);
        state.story.correlationMode = "pooled";
      } catch (seriesError) {
        console.warn("Falling back to latest-year correlations because /indicator-series is unavailable.", seriesError);
        state.story.indicatorSeriesRows = new Map(
          latestIndicatorResponses.map(([code, rows]) => [
            code,
            rows.map((row) => ({
              ...row,
              year: state.story.latestYear,
            })),
          ]),
        );
        state.story.correlationMode = "latest";
      }

      const latestGdpRows = state.story.latestIndicatorRows.get("gdp_per_capita") || [];
      const latestEnrollmentRows = state.story.latestIndicatorRows.get("female_secondary_enrollment") || [];
      const latestAdolescentRows = state.story.latestIndicatorRows.get("adolescent_fertility") || [];
      const latestLaborRows = state.story.latestIndicatorRows.get("female_labor_force_participation") || [];
      state.story.latestGdpRows = latestGdpRows;
      state.story.latestEnrollmentRows = latestEnrollmentRows;
      state.story.latestAdolescentRows = latestAdolescentRows;
      state.story.latestLaborRows = latestLaborRows;
      const tfrByCountryYear = new Map(
        tfrAllRows
          .map((row) => [`${row.iso3}-${row.year}`, toNumberOrNull(row.value)])
          .filter(([, value]) => value != null),
      );

      const corrRowsGdp = (state.story.indicatorSeriesRows.get("gdp_per_capita") || [])
        .map((row) => {
          const tfr = tfrByCountryYear.get(`${row.iso3}-${row.year}`);
          if (tfr == null) return null;
          return {
            gdp: toNumberOrNull(row.value),
            tfr,
          };
        })
        .filter((row) => row && row.gdp != null && row.gdp > 0 && row.tfr != null)
        .map((row) => ({ ...row, logGdp: Math.log10(row.gdp) }));

      state.story.correlations.gdpVsTfr = pearsonCorrelation(
        corrRowsGdp,
        (row) => row.logGdp,
        (row) => row.tfr,
      );

      const enrollmentByCountryYear = new Map(
        (state.story.indicatorSeriesRows.get("female_secondary_enrollment") || [])
          .map((row) => [`${row.iso3}-${row.year}`, toNumberOrNull(row.value)])
          .filter(([, value]) => value != null),
      );
      const corrRowsEducation = (state.story.indicatorSeriesRows.get("adolescent_fertility") || [])
        .map((row) => {
          const enrollment = enrollmentByCountryYear.get(`${row.iso3}-${row.year}`);
          if (enrollment == null) return null;
          return {
            enrollment,
            adolescent: toNumberOrNull(row.value),
          };
        })
        .filter((row) => row && row.enrollment != null && row.adolescent != null);

      state.story.correlations.enrollmentVsAdolescent = pearsonCorrelation(
        corrRowsEducation,
        (row) => row.enrollment,
        (row) => row.adolescent,
      );

      const countryStoryResponses = await Promise.all(
        STORY_COUNTRY_CONFIGS.map(async (config) => {
          const response = await fetchJSON(buildApiUrl(`/country/${config.iso3}/timeseries`, { indicators: "tfr,population_change" }));
          return [config.iso3, response];
        }),
      );
      state.story.countryStories = new Map(countryStoryResponses);

      buildStoryCorrelationMatrix();

      state.story.ready = true;
      populateStoryRecordsRegionSelect();

      drawStoryRegionChart();
      drawStoryRecordsChart();
      drawStoryAdolescentChart();
      drawStoryWomenWorkChart();
      drawStoryDeclineChart();
      drawStoryCorrelationChart();
      drawStoryShapChart();
      drawStoryThemeBubbleChart();
      renderStoryCountryFacts();
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

    const recordsRegionSelect = el("story-records-region-select");
    if (recordsRegionSelect) {
      recordsRegionSelect.addEventListener("change", (event) => {
        state.story.recordsRegion = event.target.value;
        drawStoryRecordsChart();
      });
    }

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
