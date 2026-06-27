// Screen fairness + gentle tempo (sizes, speeds, population)
export const BASE = { diag: 1000, area: 800 * 450 };

export const BAL = {
  diag: BASE.diag,
  area: BASE.area,

  fishSpeedMin: 60,
  fishSpeedMax: 90,

  sealSpeed: 200,
  sealAccel: 900,

  fishSizeK: 1,
  maxPreyCap: 24,
};


export function recomputeBalance(worldW, worldH) {
  BAL.diag = Math.hypot(worldW, worldH);
  BAL.area = worldW * worldH;
  const diagK = BAL.diag / BASE.diag;

  // Small-screen assist: make the seal relatively faster/snappier on phones.
  // On tiny screens diagK≈0.6 → speed* ~1.25, accel* ~1.15 (feels fair).
  const smallAssist = (diagK < 1) ? (1 + (1 - diagK) * 0.80) : 1;   // up to +60%
  const smallAccel  = (diagK < 1) ? (1 + (1 - diagK) * 0.90) : 1;   // up to +80%

  // Seal: keep time-to-cross similar, plus small-screen assist
  BAL.sealSpeed = 200 * diagK * smallAssist;
  BAL.sealAccel = 900 * diagK * smallAccel;

  // Fish speeds: gentle band; slightly nerf on phones so prey don't outrun the seal
  const phoneNerf = (diagK < 1) ? (1 - (1 - diagK) * 0.25) : 1;      // down to -25%
  const sMin = 60 * diagK * phoneNerf, sMax = 90 * diagK * phoneNerf;
  BAL.fishSpeedMin = Math.max(55, Math.min(95, sMin));
  BAL.fishSpeedMax = Math.max(BAL.fishSpeedMin + 18, Math.min(180, sMax));

  // FISH SIZE: smaller on small screens, a touch larger on huge screens
  // diagK=0.5 → 0.875, diagK=1 → 1.0, diagK=1.5 → 1.1 (capped)
  BAL.fishSizeK = Math.max(0.75, Math.min(1.1, 0.75 + 0.25 * diagK));

  // Population cap: sublinear with area → calm on 4K, not empty on phones
  const softCap = 12 + Math.round(Math.sqrt(BAL.area) / 60); // ~15 phone, ~35–40 desktop
  BAL.maxPreyCap = Math.max(12, Math.min(40, softCap));
}

