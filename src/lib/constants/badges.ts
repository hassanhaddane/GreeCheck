// Official-style scale colors so badges read as familiar at a glance.
export const NUTRI_COLORS: Record<string, string> = {
  a: "#038141",
  b: "#85BB2F",
  c: "#FECB02",
  d: "#EE8100",
  e: "#E63E11"
};

// NOVA processing levels: 1 (unprocessed) → 4 (ultra-processed).
export const NOVA_COLORS: Record<number, string> = {
  1: "#1B9E5A",
  2: "#9ACD32",
  3: "#EE8100",
  4: "#C0392B"
};

export const NUTRI_TEXT_DARK = new Set(["c"]); // yellow needs dark text
