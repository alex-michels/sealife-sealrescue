/**
 * Прохождение и подсчёт квиза (Roadmap **M1-T10**) — чистая логика.
 *
 * ## Почему состояние в URL, а не в клиенте
 * Квиз — это обычная HTML-форма с `method="get"`: группы radio по вопросу, ответы уезжают в
 * query-параметры, результат считает сервер. Отсюда следует всё остальное:
 *
 *  - **ноль клиентского JS** — раздел работает с выключенным JS, и это не «деградация», а основной
 *    режим (CLAUDE.md: server components по умолчанию, минимум client JS);
 *  - **ничего не хранится** — ни в localStorage (инвариант №4 прямо называет «очки квизов»), ни в
 *    БД (рейтинг вынесен в отдельную задачу, здесь его нет);
 *  - **клавиатура и скринридер бесплатно** — нативные `input[type=radio]` + `label`, никакой
 *    самодельной семантики;
 *  - **кнопка «назад» работает** — предыдущий URL и есть предыдущее состояние.
 *
 * Прятать правильные ответы от клиента смысла нет: `quizzes` читается публично
 * (`readPublishedOrStaff`), то есть `isCorrect` и так доступен через `/api/quizzes`. Поэтому
 * серверный подсчёт здесь — не защита от списывания, а способ не тащить логику в браузер.
 *
 * ## Имена параметров
 * `q0`, `q1`, … = индекс вопроса; значение = индекс выбранного варианта. Индексы, а не id, потому
 * что порядок вопросов и вариантов задаёт редактор в админке, и он же — единственный
 * стабильный контракт между формой и подсчётом.
 */

/** Маркер «форму отправили»: без него страница показывает вопросы, а не результат. */
export const SUBMITTED_PARAM = 'done'

/** Имя radio-группы для вопроса с этим индексом. */
export const answerParam = (questionIndex: number): string => `q${questionIndex}`

type Raw = string | string[] | undefined
type Params = Record<string, Raw>

/** Один вариант ответа в том виде, в каком его отдаёт Payload. */
export type QuizOption = { text?: string | null; isCorrect?: boolean | null }
/** Один вопрос в том виде, в каком его отдаёт Payload. */
export type QuizQuestion = {
  question?: string | null
  options?: QuizOption[] | null
  explanation?: string | null
}

const first = (raw: Raw): string | undefined => (Array.isArray(raw) ? raw[0] : raw)

/** Форму отправили? */
export function isSubmitted(params: Params): boolean {
  return first(params[SUBMITTED_PARAM]) === '1'
}

/**
 * Разбор ответов из query. Всё, что не похоже на существующий индекс варианта, — «не отвечено»:
 * параметры приходят снаружи, и подкрученный вручную адрес не должен ни падать, ни давать очки.
 */
export function parseAnswers(params: Params, questions: QuizQuestion[]): Array<number | null> {
  return questions.map((q, i) => {
    const raw = first(params[answerParam(i)])
    // Строгая проверка строкой, а не через Number(): `Number('')` — это 0, то есть ПУСТОЙ
    // параметр `?q0=` зачёлся бы как «выбран первый вариант». Страница не вправе присваивать
    // читателю ответ, которого он не давал.
    if (!raw || !/^\d+$/.test(raw)) return null
    const n = Number(raw)
    return n < (q.options?.length ?? 0) ? n : null
  })
}

export type QuestionOutcome = {
  /** Что выбрал читатель (null — не ответил). */
  chosen: number | null
  /** Индексы вариантов, помеченных редактором как верные. */
  correct: number[]
  /** Ответ зачтён. */
  isRight: boolean
  /**
   * У вопроса не размечен ни один верный вариант (или размечено несколько).
   * Такой вопрос НЕ идёт в знаменатель: молча зачесть его неверным значит соврать читателю о его
   * результате из-за недоделанной разметки в админке.
   */
  unscorable: boolean
}

export type QuizResult = {
  outcomes: QuestionOutcome[]
  /** Сколько зачтено. */
  correct: number
  /** Из скольких вопросов считался результат (без неразметченных). */
  total: number
  /** Сколько вопросов пропущено разметкой — показываем честно, а не прячем. */
  unscorable: number
}

/**
 * Подсчёт результата.
 *
 * Вопрос считается верным, только если размечен РОВНО один верный вариант и выбран именно он.
 * Ноль верных вариантов и два верных — это не «сложный вопрос», а незаполненная разметка: такой
 * вопрос выпадает из знаменателя, и читателю показывается, что он не оценивался.
 */
export function scoreQuiz(
  questions: QuizQuestion[],
  answers: Array<number | null>,
): QuizResult {
  const outcomes = questions.map((q, i) => {
    const options = q.options ?? []
    const correct = options.reduce<number[]>((acc, o, idx) => {
      if (o.isCorrect) acc.push(idx)
      return acc
    }, [])
    const unscorable = correct.length !== 1
    const chosen = answers[i] ?? null
    return {
      chosen,
      correct,
      isRight: !unscorable && chosen !== null && chosen === correct[0],
      unscorable,
    }
  })

  const scorable = outcomes.filter((o) => !o.unscorable)
  return {
    outcomes,
    correct: scorable.filter((o) => o.isRight).length,
    total: scorable.length,
    unscorable: outcomes.length - scorable.length,
  }
}

/**
 * Вопросы, которые вообще можно показать: у вопроса есть текст и минимум два варианта с текстом.
 *
 * Нужно из-за CR-01: `questions`/`options` — не локализованные массивы, локализованы только
 * `question`/`text` внутри. Значит квиз с переведённым заголовком проходит гейт документа, а
 * отдельные вопросы в этой локали могут прийти пустыми — показать пустой вопрос с пустыми
 * вариантами хуже, чем не показать его.
 */
export function answerableQuestions(questions: QuizQuestion[] | null | undefined): QuizQuestion[] {
  return (questions ?? []).filter(
    (q) =>
      q.question?.trim() && (q.options ?? []).filter((o) => o.text?.trim()).length >= 2,
  )
}
