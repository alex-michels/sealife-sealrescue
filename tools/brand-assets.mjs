/**
 * Генератор бренд-ассетов: favicon, apple-touch-icon и OG-картинки (Roadmap **CR-10**).
 *
 * Запуск: `node tools/brand-assets.mjs` — переписывает `public/brand/<site>/…`.
 *
 * Почему генератор, а не рисование руками: ассетов 2 сайта × (icon + apple + og×2 локали) = 10
 * файлов, и они обязаны быть согласованы по цвету и форме. Один источник — этот файл.
 *
 * Почему результат КОММИТИТСЯ, а не собирается в CI: OG-картинка содержит текст, а значит зависит
 * от шрифтов, установленных в системе. Собирать её на раннере значило бы получать разный результат
 * в зависимости от образа. Сгенерировали один раз, посмотрели глазами, положили в репозиторий.
 */
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const OUT = path.resolve('public/brand')

// Токены из globals.css — держать синхронными вручную (их три, и они не меняются).
const C = {
  fog: '#edf1f3',
  ink: '#15303a',
  baltic: '#1e5b5b',
  azureBright: '#3e7fa6',
  buoyDark: '#be3f22',
  sandbank: '#e7d9c0',
}

/** Тюлень: тот же силуэт, что в PlaceholderMedia — узнаваемость важнее оригинальности. */
const seal = (fill, opacity = 1) => `
  <path d="M18 58c0-17 15-30 36-30 23 0 42 9 54 24 4 5 0 8-6 8H28c-6 0-10-1-10-2z"
        fill="${fill}" opacity="${opacity}"/>
  <circle cx="44" cy="40" r="2.6" fill="${C.fog}" opacity="0.9"/>`

const sites = {
  sealife: { bg: C.baltic, mark: C.fog, accent: C.azureBright },
  // Аварийный сайт — глубже и строже; коралл только акцентом (под белым текстом только buoy-dark).
  sealrescue: { bg: C.ink, mark: C.sandbank, accent: C.buoyDark },
}

const wordmarks = {
  sealife: { ru: 'Тюлень.Инфо', en: 'SeaLife.Info' },
  sealrescue: { ru: 'Спасение тюленей', en: 'Seal Rescue' },
}
const taglines = {
  sealife: { ru: 'Факты, новости, мемы и квизы', en: 'Facts, news, memes and quizzes' },
  sealrescue: { ru: 'Нашёл тюленя — что делать', en: 'Found a seal — what to do' },
}

const iconSvg = (
  site,
) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80" width="512" height="512">
  <rect width="120" height="80" rx="14" fill="${sites[site].bg}"/>
  ${seal(sites[site].mark, 0.95)}
</svg>`

const ogSvg = (site, locale) => {
  const s = sites[site]
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="${s.bg}"/>
  <rect x="0" y="600" width="1200" height="30" fill="${s.accent}"/>
  <g transform="translate(700 210) scale(3.6)">${seal(s.mark, 0.22)}</g>
  <text x="90" y="300" font-family="Segoe UI, Arial, sans-serif" font-size="86" font-weight="700"
        fill="${C.fog}">${wordmarks[site][locale]}</text>
  <text x="90" y="372" font-family="Segoe UI, Arial, sans-serif" font-size="38"
        fill="${s.mark}" opacity="0.88">${taglines[site][locale]}</text>
</svg>`
}

for (const site of Object.keys(sites)) {
  const dir = path.join(OUT, site)
  fs.mkdirSync(dir, { recursive: true })

  // SVG-фавикон: современные браузеры его берут, и он не пикселится.
  fs.writeFileSync(path.join(dir, 'icon.svg'), iconSvg(site))
  // PNG нужен Safari/iOS (apple-touch-icon SVG не понимает).
  await sharp(Buffer.from(iconSvg(site)))
    .resize(180, 180)
    .png()
    .toFile(path.join(dir, 'apple-icon.png'))

  for (const locale of ['ru', 'en']) {
    await sharp(Buffer.from(ogSvg(site, locale)))
      .png()
      .toFile(path.join(dir, `og-${locale}.png`))
  }
  console.log('brand assets:', site)
}
