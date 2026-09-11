// SR-22. Delivery preparation for imagegen's solid chroma-key exports.
// The generator supplies all artwork. This only keys, slices and resizes its sheet.
// Source sheets are lossless; old v4/v5 animals remain available for comparison.
import sharp from 'sharp'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
const assets = new URL('../assets/', import.meta.url)
const sources = new URL('../../../../tools/assets/seal-run/', import.meta.url)
for (const id of ['grey-seal', 'weddell-pup']) {
  const input = await readFile(new URL(id + '-source-v7.webp', sources))
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  for (let i = 0; i < data.length; i += 4) {
    const neutral = Math.max(data[i], data[i + 2])
    const excess = Math.max(0, data[i + 1] - neutral)
    const alpha = Math.max(0, Math.min(1, 1 - (excess - 12) / 200))
    data[i + 3] = alpha < 0.06 ? 0 : Math.round(alpha * 255)
    if (excess > 4) data[i + 1] = neutral // remove green spill at the antialiased edge
    if (!data[i + 3]) data[i] = data[i + 1] = data[i + 2] = 0
  }
  const width = Math.floor(info.width / 2),
    height = Math.floor(info.height / 2)
  for (let frame = 0; frame < 4; frame++) {
    const frameImage = await sharp(data, { raw: info })
      .extract({ left: (frame % 2) * width, top: Math.floor(frame / 2) * height, width, height })
      .resize(400, 280)
      .raw()
      .toBuffer()
    // Resampling a keyed edge can leave detached 1–4px green-screen specks.
    // Retain the connected animal (including connected whiskers) before packing.
    const seen = new Uint8Array(400 * 280)
    const components = []
    for (let p = 0; p < seen.length; p++) {
      if (seen[p] || frameImage[p * 4 + 3] <= 8) continue
      const queue = [p]
      seen[p] = 1
      for (let q = 0; q < queue.length; q++) {
        const x = queue[q] % 400,
          y = Math.floor(queue[q] / 400)
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx,
              yy = y + dy,
              n = yy * 400 + xx
            if (xx < 0 || xx >= 400 || yy < 0 || yy >= 280 || seen[n] || frameImage[n * 4 + 3] <= 8)
              continue
            seen[n] = 1
            queue.push(n)
          }
      }
      components.push(queue)
    }
    components.sort((a, b) => b.length - a.length)
    for (const component of components.slice(1))
      for (const p of component) frameImage[p * 4 + 3] = 0
    await sharp(frameImage, { raw: { width: 400, height: 280, channels: 4 } })
      .webp({ quality: 94, alphaQuality: 100 })
      .toFile(fileURLToPath(new URL(id + '-v7-' + frame + '.webp', assets)))
  }
}
