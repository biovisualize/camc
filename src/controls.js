// The DOM panel: reads and writes the sliders, holds the presets, and mirrors state in the URL.

const TAU = 2 * Math.PI;

// Parameter sets worth looking at, recovered from the commented-out calls in the archive
// (CAMC_5avril11/src/Main.java and prog/python/camc4.py). Those comments are the only surviving
// record of which parameters were actually interesting.
export const PRESETS = [
  { name: "Screenshot (2011)", sMin: Math.PI / 6, sMax: (6 / 7) * Math.PI, a: [3, 40, 7, 40], b: [3.5, 13, 11, 19], rows: 18, cols: 30 },
  { name: "Self-intersecting", sMin: Math.PI / 6, sMax: (6 / 7) * Math.PI, a: [4, 40, 40, 40], b: [2, 2, 2, 2] },
  { name: "Rounded", sMin: Math.PI / 6, sMax: (3 * Math.PI) / 4, a: [6, 10, 4, 4], b: [4, 4, 4, 4] },
  { name: "Rounded, soft", sMin: Math.PI / 6, sMax: (3 * Math.PI) / 4, a: [6, 10, 4, 4], b: [3, 3.2, 4, 4] },
  { name: "Twisted", sMin: Math.PI / 6, sMax: (3 * Math.PI) / 4, a: [3, 3.2, 4, 4], b: [3, 3.2, 4, 4] },
  { name: "Elongated", sMin: Math.PI / 6, sMax: (3 * Math.PI) / 4, a: [5, 6, 4, 4], b: [5, 10, 4, 4] },
  { name: "Star", sMin: Math.PI / 8, sMax: (8 / 9) * Math.PI, a: [3, 10 / 9, 10 / 9, 10 / 9], b: [3, 10 / 9, 10 / 9, 10 / 9] },
  { name: "Pinched", sMin: Math.PI / 12, sMax: Math.PI * 0.9, a: [4, 40, 40, 40], b: [4, 40, 40, 40] },
  { name: "Six-fold", sMin: Math.PI / 8, sMax: (8 / 9) * Math.PI, a: [6, 10, 4, 4], b: [4, 2, 2, 2] },
];

function presetState(preset) {
  const params = ([m, n1, n2, n3]) => ({ m, n1, n2, n3 });
  return {
    a: params(preset.a),
    b: params(preset.b),
    rows: preset.rows ?? 40,
    cols: preset.cols ?? 60,
    sMin: preset.sMin,
    sMax: preset.sMax,
    revolution: TAU,
    wireframe: true,
    box: true,
    inset: true,
  };
}

export const DEFAULT_STATE = presetState(PRESETS[0]);

const NUMERIC_IDS = ["a-m", "a-n1", "a-n2", "a-n3", "b-m", "b-n1", "b-n2", "b-n3", "revolution", "smin", "smax", "rows", "cols"];

const $ = (id) => document.getElementById(id);

function stateFromDom() {
  const num = (id) => Number($(id).value);
  return {
    a: { m: num("a-m"), n1: num("a-n1"), n2: num("a-n2"), n3: num("a-n3") },
    b: { m: num("b-m"), n1: num("b-n1"), n2: num("b-n2"), n3: num("b-n3") },
    rows: Math.round(num("rows")),
    cols: Math.round(num("cols")),
    sMin: num("smin"),
    sMax: num("smax"),
    revolution: num("revolution"),
    wireframe: $("opt-wire").checked,
    box: $("opt-box").checked,
    inset: $("opt-inset").checked,
  };
}

function stateToDom(state) {
  const set = (id, value) => {
    $(id).value = String(value);
    $(id + "-num").value = String(Math.round(value * 1e4) / 1e4);
  };
  set("a-m", state.a.m);
  set("a-n1", state.a.n1);
  set("a-n2", state.a.n2);
  set("a-n3", state.a.n3);
  set("b-m", state.b.m);
  set("b-n1", state.b.n1);
  set("b-n2", state.b.n2);
  set("b-n3", state.b.n3);
  set("revolution", state.revolution);
  set("smin", state.sMin);
  set("smax", state.sMax);
  set("rows", state.rows);
  set("cols", state.cols);
  $("opt-wire").checked = state.wireframe;
  $("opt-box").checked = state.box;
  $("opt-inset").checked = state.inset;
}

export function createControls({ onChange, onFrame }) {
  const select = $("preset");
  PRESETS.forEach((preset, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = preset.name;
    select.append(option);
  });

  // Keep each slider and its number box showing the same value, whichever one the user moved.
  for (const id of NUMERIC_IDS) {
    const range = $(id);
    const number = $(id + "-num");
    number.min = range.min;
    number.max = range.max;
    range.addEventListener("input", () => {
      number.value = range.value;
      handleInput();
    });
    number.addEventListener("input", () => {
      if (number.value === "") return;
      range.value = number.value;
      handleInput();
    });
  }

  for (const id of ["opt-wire", "opt-box", "opt-inset"]) {
    $(id).addEventListener("change", handleInput);
  }

  // s from and s to share one interval, so each pushes the other rather than crossing it.
  function clampRange() {
    const step = 0.01;
    let lo = Number($("smin").value);
    let hi = Number($("smax").value);
    if (lo >= hi) {
      if (document.activeElement === $("smin") || document.activeElement === $("smin-num")) {
        hi = Math.min(Number($("smax").max), lo + step);
      } else {
        lo = Math.max(Number($("smin").min), hi - step);
      }
      $("smin").value = $("smin-num").value = String(lo);
      $("smax").value = $("smax-num").value = String(hi);
    }
  }

  function handleInput() {
    clampRange();
    onChange(stateFromDom());
  }

  select.addEventListener("change", () => {
    const preset = PRESETS[Number(select.value)];
    if (!preset) return;
    const next = presetState(preset);
    // Presets set shape, not display preferences.
    next.wireframe = $("opt-wire").checked;
    next.box = $("opt-box").checked;
    next.inset = $("opt-inset").checked;
    stateToDom(next);
    onFrame(next);
  });

  $("frame").addEventListener("click", () => onFrame(stateFromDom()));
  $("reset").addEventListener("click", () => {
    select.value = "0";
    stateToDom(DEFAULT_STATE);
    onFrame(stateFromDom());
  });

  return {
    getState: stateFromDom,
    setState: stateToDom,
    setStatus(text) {
      const node = $("status");
      node.textContent = text;
      node.hidden = text === "";
    },
  };
}

// ---- URL state ------------------------------------------------------------------------------

const URL_KEYS = {
  am: ["a", "m"], an1: ["a", "n1"], an2: ["a", "n2"], an3: ["a", "n3"],
  bm: ["b", "m"], bn1: ["b", "n1"], bn2: ["b", "n2"], bn3: ["b", "n3"],
};

export function readUrl(fallback) {
  const params = new URLSearchParams(location.search);
  const state = structuredClone(fallback);
  for (const [key, [group, field]] of Object.entries(URL_KEYS)) {
    const value = Number(params.get(key));
    if (params.has(key) && Number.isFinite(value)) state[group][field] = value;
  }
  for (const [key, field] of [["rows", "rows"], ["cols", "cols"], ["smin", "sMin"], ["smax", "sMax"], ["rev", "revolution"]]) {
    const value = Number(params.get(key));
    if (params.has(key) && Number.isFinite(value)) state[field] = value;
  }
  return state;
}

export function writeUrl(state) {
  const round = (v) => String(Math.round(v * 1e4) / 1e4);
  const params = new URLSearchParams();
  for (const [key, [group, field]] of Object.entries(URL_KEYS)) {
    params.set(key, round(state[group][field]));
  }
  params.set("rows", String(state.rows));
  params.set("cols", String(state.cols));
  params.set("smin", round(state.sMin));
  params.set("smax", round(state.sMax));
  params.set("rev", round(state.revolution));
  history.replaceState(null, "", "?" + params.toString());
}
