// Fairness model (SH-02): the simulation runs in a FIXED logical world, so speed,
// sizes and scoring are device-independent. The screen only scales the *rendering*.
//
// Strategy: keep the SHORT screen axis a constant number of logical units, and let the
// LONG axis grow with the aspect ratio but CLAMP it (no "extend view" advantage — see
// game-dev scaling best practices). Difficulty is then expressed as invariants:
// constant seal/fish speeds, constant fish size, and prey count proportional to area
// (constant density). Leaderboards split coarse mobile/desktop for the residual
// portrait-vs-landscape shape difference.

export const VIEW_CFG = {
  logicalShort: 540, // logical units along the shorter screen axis (constant for everyone)
  maxAspect: 1.9, // cap long/short so wide/tall screens can't reveal a big extra strip
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
 * Logical world dimensions for a given display size (CSS px). Short axis is constant;
 * long axis = short × clamped aspect. Orientation follows the display.
 */
export function computeWorld(dispW, dispH) {
  const short = VIEW_CFG.logicalShort;
  const longSide = Math.max(dispW, dispH);
  const shortSide = Math.min(dispW, dispH) || 1;
  const aspect = Math.min(VIEW_CFG.maxAspect, Math.max(1, longSide / shortSide));
  const longLogical = Math.round(short * aspect);
  return dispW >= dispH ? { w: longLogical, h: short } : { w: short, h: longLogical };
}

/**
 * Balance is now constant in logical units (device-independent). Only the prey cap
 * tracks area so density stays the same across the clamped aspect range.
 */
export function recomputeBalance(worldW, worldH) {
  BAL.diag = Math.hypot(worldW, worldH);
  BAL.area = worldW * worldH;

  BAL.fishSpeedMin = 96;
  BAL.fishSpeedMax = 144;
  BAL.sealSpeed = 320;
  BAL.sealAccel = 2400;
  BAL.fishSizeK = 1;

  BAL.maxPreyCap = Math.max(12, Math.min(28, Math.round(BAL.area * PREY_DENSITY)));
}
