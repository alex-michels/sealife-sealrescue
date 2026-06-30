// tools/make-placeholder-backdrop.mjs — generate a soft, foggy underwater PLACEHOLDER backdrop so
// the backdrop wiring is visible before real AI art exists. Builds an SVG scene (gradient + seabed
// + soft coral blobs + light shafts), blurs it, and writes:
//   assets/backdrop-landscape.{avif,webp,jpg}  (2:1)
//   assets/backdrop-portrait.{avif,webp,jpg}   (~9:16)
// Replace those files with real art (same names) and re-run tools/encode-image.mjs. Palette tracks
// core/theme.js water tones so the in-game light shafts / depth tint / bubbles blend on top.
//
// Run from this game dir:  node tools/make-placeholder-backdrop.mjs
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const OUT = resolve('assets');

// Deterministic RNG so the placeholder is stable across runs.
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const CORAL = ['#1F5A4E', '#2E6E5A', '#176B63', '#B3704F', '#C98A5E', '#6E5A8A', '#3E7E72'];

function scene(w, h, seed) {
  const r = rng(seed);
  const parts = [];
  // gradient water + seabed
  parts.push(`<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2C6A7A"/><stop offset="0.34" stop-color="#1E5B5B"/>
      <stop offset="0.72" stop-color="#123C44"/><stop offset="1" stop-color="#0B2832"/>
    </linearGradient></defs>`);
  parts.push(`<rect width="${w}" height="${h}" fill="url(#g)"/>`);
  // soft light shafts from the surface
  for (let i = 0; i < Math.round(w / 320) + 2; i++) {
    const x = r() * w, bw = w * (0.05 + r() * 0.06);
    parts.push(`<polygon points="${x},0 ${x + bw},0 ${x + bw * 2 + h * 0.2},${h} ${x + bw + h * 0.2},${h}" fill="#EDF1F3" opacity="${0.04 + r() * 0.05}"/>`);
  }
  // distant rock silhouettes
  for (let i = 0; i < Math.round(w / 500) + 1; i++) {
    parts.push(`<ellipse cx="${r() * w}" cy="${h * (1.0 + r() * 0.04)}" rx="${w * (0.18 + r() * 0.16)}" ry="${h * (0.12 + r() * 0.06)}" fill="#14333A"/>`);
  }
  // seabed mound
  parts.push(`<ellipse cx="${w / 2}" cy="${h * 1.06}" rx="${w * 0.72}" ry="${h * 0.2}" fill="#102E34"/>`);
  // coral clusters along the bottom band
  const n = Math.round(w / 95) + 6;
  for (let i = 0; i < n; i++) {
    const cx = r() * w, base = h * (0.74 + r() * 0.22), col = CORAL[(r() * CORAL.length) | 0];
    const kind = r();
    if (kind < 0.45) {
      // rounded blob cluster (brain/soft coral)
      const blobs = 2 + ((r() * 3) | 0);
      for (let b = 0; b < blobs; b++) {
        const rad = h * (0.02 + r() * 0.05);
        parts.push(`<circle cx="${cx + (r() - 0.5) * rad * 2.4}" cy="${base - r() * rad}" r="${rad}" fill="${col}" opacity="${0.8 + r() * 0.2}"/>`);
      }
    } else if (kind < 0.75) {
      // branching coral (a few rounded "fingers")
      const fingers = 3 + ((r() * 3) | 0), fh = h * (0.08 + r() * 0.12), fw = Math.max(4, w * 0.006);
      for (let f = 0; f < fingers; f++) {
        const fx = cx + (f - fingers / 2) * fw * 2.2;
        parts.push(`<rect x="${fx}" y="${base - fh}" width="${fw}" height="${fh}" rx="${fw / 2}" fill="${col}" opacity="0.9"/>`);
      }
    } else {
      // fan coral (wide soft ellipse)
      parts.push(`<ellipse cx="${cx}" cy="${base}" rx="${h * (0.05 + r() * 0.06)}" ry="${h * (0.03 + r() * 0.04)}" fill="${col}" opacity="0.85"/>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${parts.join('')}</svg>`;
}

async function emit(name, w, h, seed) {
  const svg = Buffer.from(scene(w, h, seed));
  const base = await sharp(svg, { density: 96 }).blur(Math.max(2, w / 130)).toBuffer(); // foggy
  const out = (ext) => join(OUT, `${name}.${ext}`);
  await Promise.all([
    sharp(base).avif({ quality: 50 }).toFile(out('avif')),
    sharp(base).webp({ quality: 72 }).toFile(out('webp')),
    sharp(base).jpeg({ quality: 78, mozjpeg: true, progressive: true }).toFile(out('jpg')),
  ]);
  const kb = (ext) => (statSync(out(ext)).size / 1024).toFixed(1);
  console.log(`  ${name}: avif ${kb('avif')} KB · webp ${kb('webp')} KB · jpg ${kb('jpg')} KB  (${w}×${h})`);
}

await mkdir(OUT, { recursive: true });
console.log('generating placeholder backdrops →', OUT);
await emit('backdrop-landscape', 1600, 800, 12345);
await emit('backdrop-portrait', 900, 1600, 67890);
console.log('done. Replace these with real art (same names) and re-run tools/encode-image.mjs.');
