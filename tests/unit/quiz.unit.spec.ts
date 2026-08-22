import { describe, it, expect } from 'vitest'
import {
  answerParam,
  answerableQuestions,
  isSubmitted,
  parseAnswers,
  scoreQuiz,
  SUBMITTED_PARAM,
  type QuizQuestion,
} from '@/content/quiz'

/**
 * **M1-T10** — прохождение и подсчёт квиза.
 *
 * Квиз — обычная HTML-форма с `method="get"`: ответы приходят из query, результат считает сервер.
 * Значит вход НЕДОВЕРЕННЫЙ — адрес можно подкрутить руками, — и половина тестов ниже именно про то,
 * что подкрученный адрес не роняет страницу и не выдаёт очков.
 */

const q = (question: string, options: Array<[string, boolean]>, explanation?: string): QuizQuestion => ({
  question,
  options: options.map(([text, isCorrect]) => ({ text, isCorrect })),
  explanation,
})

/** Вопрос с ровно одним верным вариантом (индекс 1). */
const SIMPLE = q('Сколько ласт у тюленя?', [
  ['Две', false],
  ['Четыре', true],
  ['Шесть', false],
])

describe('answerParam / isSubmitted', () => {
  it('имя группы radio по индексу вопроса', () => {
    expect(answerParam(0)).toBe('q0')
    expect(answerParam(3)).toBe('q3')
  })

  it('результат показывается только по маркеру отправки', () => {
    // Без маркера страница обязана показать ВОПРОСЫ: иначе прямая ссылка на квиз
    // сразу показывала бы «0 из 6», ничего не спросив.
    expect(isSubmitted({})).toBe(false)
    expect(isSubmitted({ [SUBMITTED_PARAM]: '1' })).toBe(true)
    expect(isSubmitted({ [SUBMITTED_PARAM]: 'yes' })).toBe(false)
  })
})

describe('parseAnswers', () => {
  const questions = [SIMPLE, SIMPLE]

  it('нормальные ответы', () => {
    expect(parseAnswers({ q0: '1', q1: '2' }, questions)).toEqual([1, 2])
  })

  it('пропущенный вопрос — null, а не ноль', () => {
    // Ноль был бы «выбран первый вариант» — то есть страница присвоила бы читателю ответ.
    expect(parseAnswers({ q1: '0' }, questions)).toEqual([null, 0])
  })

  it('подкрученный адрес не даёт очков и не роняет страницу', () => {
    for (const bad of ['9', '-1', 'abc', '', '1.5', 'NaN', undefined]) {
      expect(parseAnswers({ q0: bad }, questions)[0], String(bad)).toBeNull()
    }
  })

  it('индекс за пределами списка вариантов отбрасывается', () => {
    // У SIMPLE три варианта: индекс 3 не существует.
    expect(parseAnswers({ q0: '3' }, questions)[0]).toBeNull()
    expect(parseAnswers({ q0: '2' }, questions)[0]).toBe(2)
  })

  it('повторный параметр — берём первый', () => {
    expect(parseAnswers({ q0: ['1', '2'] }, questions)).toEqual([1, null])
  })
})

describe('scoreQuiz', () => {
  it('всё верно', () => {
    const r = scoreQuiz([SIMPLE, SIMPLE], [1, 1])
    expect([r.correct, r.total, r.unscorable]).toEqual([2, 2, 0])
    expect(r.outcomes.every((o) => o.isRight)).toBe(true)
  })

  it('неверный и неотвеченный оба не зачтены, но из знаменателя не выпадают', () => {
    const r = scoreQuiz([SIMPLE, SIMPLE], [0, null])
    expect([r.correct, r.total]).toEqual([0, 2])
    expect(r.outcomes.map((o) => o.isRight)).toEqual([false, false])
  })

  it('вопрос без верного варианта НЕ идёт в знаменатель', () => {
    // Это не «сложный вопрос», а недоделанная разметка в админке. Зачесть его неверным значит
    // соврать читателю о его результате из-за чужой недоделки.
    const broken = q('Без разметки', [
      ['А', false],
      ['Б', false],
    ])
    const r = scoreQuiz([SIMPLE, broken], [1, 0])
    expect([r.correct, r.total, r.unscorable]).toEqual([1, 1, 1])
    expect(r.outcomes[1].unscorable).toBe(true)
    expect(r.outcomes[1].isRight).toBe(false)
  })

  it('ДВА верных варианта — тоже не оценивается', () => {
    // Иначе «правильный» ответ зависел бы от того, какой из двух редактор отметил первым.
    const two = q('Два верных', [
      ['А', true],
      ['Б', true],
    ])
    const r = scoreQuiz([two], [0])
    expect([r.correct, r.total, r.unscorable]).toEqual([0, 0, 1])
    expect(r.outcomes[0].correct).toEqual([0, 1])
  })

  it('пустой квиз не делит на ноль', () => {
    expect(scoreQuiz([], [])).toEqual({ outcomes: [], correct: 0, total: 0, unscorable: 0 })
  })
})

describe('answerableQuestions', () => {
  it('пропускает вопросы, у которых в этой локали нет текста (полевой случай CR-01)', () => {
    // `questions`/`options` — НЕ локализованные массивы, локализованы только `question`/`text`.
    // Значит квиз с переведённым заголовком проходит гейт документа, а отдельные вопросы в этой
    // локали могут прийти пустыми.
    const questions = [
      SIMPLE,
      q('   ', [
        ['А', true],
        ['Б', false],
      ]),
      { question: 'Без вариантов', options: [] },
    ]
    expect(answerableQuestions(questions)).toEqual([SIMPLE])
  })

  it('вопрос с одним вариантом — не вопрос', () => {
    expect(answerableQuestions([q('Один вариант', [['А', true]])])).toEqual([])
  })

  it('вариант без переведённого текста не считается вариантом', () => {
    const half = q('Половина перевода', [
      ['Есть', true],
      ['', false],
      ['   ', false],
    ])
    expect(answerableQuestions([half])).toEqual([])
  })

  it('пусто и undefined не роняют', () => {
    expect(answerableQuestions(null)).toEqual([])
    expect(answerableQuestions(undefined)).toEqual([])
    expect(answerableQuestions([])).toEqual([])
  })
})
