// Fairness model (SH-02b — full-screen): the game fills the WHOLE screen (no black bars),
// yet the catch rate stays the same on every screen. The trick is to make difficulty a set
// of invariants that are constant in LOGICAL units:
//   • SHORT screen axis = a constant number of logical units (so the seal/prey are the same
//     fraction of the screen everywhere — they don't shrink to dots on big displays);
//   • LONG axis simply FILLS the screen (no clamp → no letterbox);
//   • constant seal/fish speed and size;
//   • constant prey DENSITY: prey count ∝ area (NOT a fixed cap — a fixed cap diluted
//     density on wide screens, which is what made wide screens harder).
// Catch rate ≈ density × seal_speed × catch_width, so with all three constant it's screen-
// independent: a wide screen holds more prey over more area, but the LOCAL density the seal
// sweeps is identical, and a finite-speed seal can only eat at that local rate. Verified by
// the bot harness (tools/fairness-sim.mjs). Leaderboards still split coarse mobile/desktop
// for the residual portrait-vs-landscape shape difference.

export const VIEW_CFG = {
  logicalShort: 540, // logical units along the shorter screen axis (constant for everyone)
};

// Reference world (landscape 960×540) used for density + legacy diag ratios.
export const BASE = { diag: Math.hypot(960, 540), area: 960 * 540 };

// ~22 prey on the reference screen → density reused for every world size.
const PREY_DENSITY = 22 / BASE.area;

export const BAL = {
  diag: BASE.diag,
  area: BASE.area,

  // Tempo (SH-02 tuning): seal & prey speeds scaled ×1.6 together → more action,
  // same difficulty ratios. Seal accel bumped for a snappy ~0.13s to top speed (game feel).
  fishSpeedMin: 96,
  fishSpeedMax: 144,

  sealSpeed: 320,
  sealAccel: 2400,

  fishSizeK: 1,
  maxPreyCap: 22,
};

/**
 * Logical world dimensions for a given display size (CSS px). Short axis is a constant
 * number of logical units; long axis = short × the REAL aspect ratio, so the world fills
 * the whole screen (no clamp → no letterbox). Orientation follows the display.
 */
export function computeWorld(dispW, dispH, maxAspect = Infinity) {
  const short = VIEW_CFG.logicalShort;
  const longSide = Math.max(dispW, dispH) || short;
  const shortSide = Math.min(dispW, dispH) || short;
  // maxAspect defaults to ∞ → fill the screen. The fairness harness passes a finite value
  // to measure how a modest clamp trades a tiny letterbox (only on extreme aspects) for a
  // smaller ultra-wide advantage.
  const aspect = Math.min(maxAspect, Math.max(1, longSide / shortSide));
  const longLogical = Math.round(short * aspect);
  return dispW >= dispH ? { w: longLogical, h: short } : { w: short, h: longLogical };
}

/**
 * Balance is constant in logical units (device-independent). Prey count tracks area so the
 * DENSITY is the same on every screen — the key to an equal catch rate when filling the
 * screen. The cap is only a generous perf guard (never bites on real screens: 32:9 ≈ 44).
 */
export function recomputeBalance(worldW, worldH) {
  BAL.diag = Math.hypot(worldW, worldH);
  BAL.area = worldW * worldH;

  BAL.fishSpeedMin = 96;
  BAL.fishSpeedMax = 144;
  BAL.sealSpeed = 320;
  BAL.sealAccel = 2400;
  BAL.fishSizeK = 1;

  BAL.maxPreyCap = Math.max(12, Math.min(200, Math.round(BAL.area * PREY_DENSITY)));
}
