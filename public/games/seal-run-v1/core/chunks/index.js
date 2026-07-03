// core/chunks/index.js — реестр библиотеки чанков (SR-02).
//
// Изоморфный dependency-free ESM (см. core/course.js). Реестр СОРТИРУЕТСЯ ПО id:
// порядок выбора в generateCourse не должен зависеть от порядка import-строк —
// иначе перестановка строк здесь молча меняла бы «трассу недели» (и ломала паритет
// Node↔браузер). Инварианты библиотеки — tools/chunk-lint-lib.mjs (гейт CI).

import { chunk as c01 } from './coastal-01.js';
import { chunk as c02 } from './coastal-02.js';
import { chunk as c03 } from './coastal-03.js';
import { chunk as c04 } from './coastal-04.js';
import { chunk as c05 } from './coastal-05.js';
import { chunk as c06 } from './coastal-06.js';
import { chunk as c07 } from './coastal-07.js';
import { chunk as c08 } from './coastal-08.js';
import { chunk as c09 } from './coastal-09.js';
import { chunk as c10 } from './coastal-10.js';
import { chunk as c11 } from './coastal-11.js';
import { chunk as c12 } from './coastal-12.js';
import { chunk as c13 } from './coastal-13.js';
import { chunk as c14 } from './coastal-14.js';
import { chunk as c15 } from './coastal-15.js';
import { chunk as c16 } from './coastal-16.js';
import { chunk as c17 } from './coastal-17.js';
import { chunk as c18 } from './coastal-18.js';

export const CHUNKS = Object.freeze(
  [c01, c02, c03, c04, c05, c06, c07, c08, c09, c10, c11, c12, c13, c14, c15, c16, c17, c18].sort(
    (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  ),
);
