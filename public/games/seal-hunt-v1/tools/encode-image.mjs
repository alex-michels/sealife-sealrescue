// tools/encode-image.mjs — encode a source image to optimized AVIF + WebP + JPEG at a target
// width (+ optional soft blur), for game backgrounds and covers. Uses `sharp` (already a dep).
// Format-agnostic: works for the underwater backdrop AND cover.png / cover_mobile.png.
//
// Run from this game dir (public/games/seal-hunt-v1):
//   node tools/encode-image.mjs <input.png> [options]
// Options:
//   --name <base>     output base filename            (default: input's basename)
//   --out  <dir>      output directory                 (default: ".")
//   --width <px>      resize to this width (no upscale) (default: 1600)
//   --blur  <sigma>   soft-blur the source (foggy look; 0 = off)   (default: 0)
//   --qa <0-100>      AVIF quality (default 50) · --qw WebP (72) · --qj JPEG (78)
//
// Sources + outputs all live in assets/ (sources are *-src.png, git-ignored). Examples:
//   node tools/encode-image.mjs assets/backdrop-landscape-src.png --name backdrop-landscape --out assets --width 1600 --blur 2
//   node tools/encode-image.mjs assets/cover-src.png              --name cover             --out assets --width 1200
//   node tools/encode-image.mjs assets/cover-mobile-src.png       --name cover_mobile      --out assets --width 1080
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { statSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';

const argv = process.argv.slice(2);
if (!argv[0] || argv[0].startsWith('--')) {
  console.error('usage: node tools/encode-image.mjs <input> [--name b] [--out dir] [--width px] [--blur s] [--qa 50] [--qw 72] [--qj 78]');
  process.exit(1);
}
const input = argv[0];
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const name = opt('name', basename(input, extname(input)));
const outDir = resolve(opt('out', '.'));
const width = Number(opt('width', '1600'));
const blur = Number(opt('blur', '0'));
const qa = Number(opt('qa', '50')), qw = Number(opt('qw', '72')), qj = Number(opt('qj', '78'));

await mkdir(outDir, { recursive: true });

// Resize (+optional blur) once, reuse the pixels for every format → identical framing.
let pipe = sharp(input).resize({ width, withoutEnlargement: true });
if (blur > 0) pipe = pipe.blur(blur);
const base = await pipe.toBuffer();

const out = (ext) => join(outDir, `${name}.${ext}`);
await Promise.all([
  sharp(base).avif({ quality: qa }).toFile(out('avif')),
  sharp(base).webp({ quality: qw }).toFile(out('webp')),
  sharp(base).jpeg({ quality: qj, mozjpeg: true, progressive: true }).toFile(out('jpg')),
]);

const kb = (p) => (statSync(p).size / 1024).toFixed(1) + ' KB';
console.log(`encoded "${name}"  (width ${width}${blur ? `, blur ${blur}` : ''}) → ${outDir}`);
for (const ext of ['avif', 'webp', 'jpg']) console.log(`  ${name}.${ext.padEnd(4)}  ${kb(out(ext))}`);
