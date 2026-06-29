// Fairness model (SH-02): the simulation runs in a FIXED logical arena, so EVERY player
// gets the exact same play field — same size, same fish count, same density, same travel
// distances — regardless of screen size. The screen only scales/centres the *rendering*.
//
// Why fixed (not screen-matched): in a 60s "catch as many fish as you can" game the score
// is set by catch RATE ∝ density × speed. If the world grew with the screen, a wide screen
// either dilutes density (capped prey → fewer catches, a disadvantage) or, uncapped, shows
// more field at once (an advantage). A single fixed arena removes both. This matches
// game-dev practice: fix the gameplay-relevant area and frame the rest.
//
// The leftover screen area around the arena is NOT play space — the renderer dresses it as
// a diegetic border (deep water + kelp wall), so it reads as the edge of the cove rather
// than black bars (see render/scenery.js `drawBorderDecor`). Orientation follows the
// display; both orientations use the same area (518 400 u²). Leaderboards still split
// coarse mobile/desktop for the portrait-vs-landscape shape difference.

export const VIEW_CFG = {
  logicalShort: 540, // short axis of the fixed arena (logical units)
  logicalLong: 960, // long axis of the fixed arena → canonical 16:9, area == BASE reference
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
 * Fixed fair arena (logical units), identical for everyone. Orientation follows the
 * display; the size is constant. The screen size only affects how this arena is scaled
 * and centred (see resize() in game.js) — never how much of the world is playable.
 */
export function computeWorld(dispW, dispH) {
  const { logicalShort: s, logicalLong: l } = VIEW_CFG;
  return dispW >= dispH ? { w: l, h: s } : { w: s, h: l };
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
