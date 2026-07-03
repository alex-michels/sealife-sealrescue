// tools/chunk-lint.mjs — CLI-гейт библиотеки чанков Seal Run (SR-02).
// Библиотека + сборки трасс по N сидов-сезонов. Ненулевой exit-код при ошибках.
//
//   node public/games/seal-run-v1/tools/chunk-lint.mjs [N=52]
//
// Логика — в chunk-lint-lib.mjs (её же гоняет CI: tests/unit/seal-run-course.unit.spec.ts).

import { CHUNKS } from '../core/chunks/index.js';
import { runLint } from './chunk-lint-lib.mjs';

const n = Math.max(1, Math.min(500, parseInt(process.argv[2] ?? '52', 10) || 52));
const seeds = [];
for (let i = 0; i < n; i++) {
  const year = 2026 + Math.floor(i / 52);
  seeds.push(`${year}-W${String((i % 52) + 1).padStart(2, '0')}`);
}

const errors = runLint(CHUNKS, seeds);
if (errors.length) {
  console.error(`chunk-lint: ${errors.length} ошибок (библиотека ${CHUNKS.length} чанков, ${n} сидов):`);
  for (const err of errors) console.error('  ✗ ' + err);
  process.exit(1);
}
console.log(`chunk-lint: OK — библиотека ${CHUNKS.length} чанков, ${n} сидов, ошибок нет`);
