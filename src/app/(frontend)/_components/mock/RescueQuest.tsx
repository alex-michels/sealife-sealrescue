'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import { m } from '@/mock/copy'
import { buttonClasses } from '../ui/Button'

/**
 * Интерактивный rescue-квест (M2-T15 preview): обучение через сценарий, ведёт в каталог.
 * Образовательный, не наказывающий — на неверном выборе объясняем и идём дальше.
 *
 * ⚠️ Сценарии переписаны по предметному аудиту 2026-07-26 (Roadmap, трек BIO). Прежняя версия
 * учила ровно наоборот в двух местах:
 *  - шаг «тюлень выглядит вялым» помечал ВЕРНЫМ ответом «наблюдать издалека», хотя вялость и
 *    отсутствие реакции стоят в любом списке признаков как повод ЗВОНИТЬ. Спутаны «отдыхает»
 *    (часами лежит неподвижно — норма) и «вялый» (клинический признак). Теперь это два разных
 *    сценария (BIO-05).
 *  - нигде не проговаривалось, что одинокий детёныш обычно НЕ брошен, — а именно ложная
 *    «спасательная» реакция и вредит тюленям чаще всего (BIO-01).
 * Порядок сценариев повторяет страницу /what-to-do: норма → запреты → признаки → звонок.
 */
type Loc = Record<Locale, string>
type Step = { q: Loc; options: Array<{ label: Loc; ok: boolean; feedback: Loc }> }

const steps: Step[] = [
  {
    q: {
      ru: 'Тюлень один на берегу. Что делаешь?',
      en: 'A seal is alone on the beach. What do you do?',
    },
    options: [
      {
        label: { ru: 'Подойти и погладить', en: 'Walk up and pet it' },
        ok: false,
        feedback: {
          ru: 'Нет: не трогать. Дикое животное, риск для него и для вас.',
          en: 'No: don’t touch it. It’s wild — a risk for it and for you.',
        },
      },
      {
        label: {
          ru: 'Держать дистанцию, убрать собак',
          en: 'Keep distance, move dogs away',
        },
        ok: true,
        feedback: {
          ru: 'Верно. Дистанция и отсутствие собак — это уже половина помощи.',
          en: 'Right. Distance and no dogs is already half the help.',
        },
      },
    ],
  },
  {
    // Норма, которую чаще всего принимают за беду.
    q: {
      ru: 'Это детёныш, и он один. Матери рядом нет уже час.',
      en: 'It is a pup, and it is alone. No mother in sight for an hour.',
    },
    options: [
      {
        label: { ru: 'Забрать — он брошен', en: 'Pick it up — it is abandoned' },
        ok: false,
        feedback: {
          ru:
            'Нет, и это самая частая ошибка. Мать кормится в море и возвращается, иногда через ' +
            'несколько часов. Забранный «спасённый» детёныш чаще всего был здоров и с матерью.',
          en:
            'No — and this is the most common mistake. The mother is feeding at sea and comes ' +
            'back, sometimes hours later. A “rescued” pup was usually healthy and not alone.',
        },
      },
      {
        label: { ru: 'Оставить и наблюдать издалека', en: 'Leave it and watch from a distance' },
        ok: true,
        feedback: {
          ru: 'Верно. Одинокий детёныш обычно НЕ брошен. Отойдите и просто смотрите.',
          en: 'Right. A lone pup is usually NOT abandoned. Step back and just watch.',
        },
      },
    ],
  },
  {
    // Отдельный сценарий: тюлень лежит неподвижно, но это ещё не клиника.
    q: {
      ru: 'Тюлень лежит неподвижно и, кажется, спит.',
      en: 'The seal lies still and seems to be sleeping.',
    },
    options: [
      {
        label: {
          ru: 'Столкнуть в воду — там ему лучше',
          en: 'Push it into the water — it belongs there',
        },
        ok: false,
        feedback: {
          ru:
            'Никогда. Он вышел на берег намеренно: отдохнуть, согреться или потому что болен. ' +
            'В воде ослабевшее животное тонет.',
          en:
            'Never. It hauled out on purpose — to rest, to warm up, or because it is ill. ' +
            'A weakened animal drowns in the water.',
        },
      },
      {
        label: {
          ru: 'Не мешать: сон на берегу — норма',
          en: 'Leave it be: sleeping ashore is normal',
        },
        ok: true,
        feedback: {
          ru: 'Верно. Тюлени часами лежат почти без движения — это отдых, а не беда.',
          en: 'Right. Seals lie nearly motionless for hours — that is rest, not trouble.',
        },
      },
    ],
  },
  {
    // А вот это уже клинические признаки — здесь наблюдать НЕДОСТАТОЧНО.
    q: {
      ru: 'У животного видна рана, дыхание тяжёлое, на шум оно не реагирует.',
      en: 'There is a visible wound, breathing is laboured, and it ignores noise.',
    },
    options: [
      {
        label: { ru: 'Наблюдать издалека и подождать', en: 'Watch from afar and wait' },
        ok: false,
        feedback: {
          ru:
            'Здесь наблюдения мало. Рана, тяжёлое дыхание и отсутствие реакции — это признаки ' +
            'беды, а не отдыха: нужно звонить. Не приближайтесь и не трогайте.',
          en:
            'Watching is not enough here. A wound, laboured breathing and no reaction are signs ' +
            'of trouble, not rest: call. Do not approach and do not touch.',
        },
      },
      {
        label: { ru: 'Позвонить в центр, не подходя', en: 'Call a centre without approaching' },
        ok: true,
        feedback: {
          ru: 'Верно. Решение принимают специалисты — ваше дело сообщить и держать дистанцию.',
          en: 'Right. Specialists make the call — your job is to report it and keep your distance.',
        },
      },
    ],
  },
  {
    q: {
      ru: 'Специалисты едут. Что делать до их приезда?',
      en: 'The centre is on the way. What do you do until they arrive?',
    },
    options: [
      {
        label: { ru: 'Полить водой и накрыть', en: 'Pour water on it and cover it' },
        ok: false,
        feedback: {
          ru:
            'Нет: так животное перегреется или запаникует. Не поливать, не накрывать, ' +
            'не кормить и не перевозить самому.',
          en:
            'No: it will overheat or panic. Do not pour water, do not cover it, do not feed ' +
            'it and do not transport it yourself.',
        },
      },
      {
        label: {
          ru: 'Держать дистанцию и увести людей и собак',
          en: 'Keep your distance and move people and dogs away',
        },
        ok: true,
        feedback: {
          ru: 'Верно. Тишина и пустой пляж вокруг — лучшее, что можно сделать до приезда.',
          en: 'Right. Quiet and an empty stretch of beach is the best thing you can give it.',
        },
      },
    ],
  },
]

const resultText: Loc = {
  ru: 'Ты держал дистанцию, не паниковал и позвал специалистов. Теперь найди центр рядом.',
  en: 'You kept your distance, stayed calm, and called the experts. Now find a center nearby.',
}
const centersNearby: Loc = { ru: 'Центры рядом →', en: 'Centers nearby →' }
const nextLabel: Loc = { ru: 'Дальше →', en: 'Next →' }
const resultLabel: Loc = { ru: 'Итог →', en: 'See result →' }

export function RescueQuest({ locale }: { locale: Locale }) {
  const c = m(locale)
  const [step, setStep] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)

  if (step >= steps.length) {
    return (
      <div className="mt-2 rounded-card border border-border bg-surface p-6">
        <h2 className="text-2xl">{c.questResult}</h2>
        <p className="mt-2 text-muted">{resultText[locale]}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/${locale}/rescue-centers`} className={buttonClasses('critical', 'md')}>
            {centersNearby[locale]}
          </Link>
          <button
            type="button"
            onClick={() => {
              setStep(0)
              setPicked(null)
            }}
            className={buttonClasses('ghost', 'md')}
          >
            {c.questRestart}
          </button>
        </div>
      </div>
    )
  }

  const current = steps[step]
  return (
    <div className="mt-2 rounded-card border border-border bg-surface p-6">
      <p className="font-mono text-xs text-muted">
        {step + 1} / {steps.length}
      </p>
      <h2 className="mt-1 text-2xl">{current.q[locale]}</h2>
      <div className="mt-4 flex flex-col gap-2">
        {current.options.map((opt, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setPicked(i)}
            aria-pressed={picked === i}
            className={buttonClasses(
              picked === i ? (opt.ok ? 'primary' : 'critical') : 'ghost',
              'md',
              'justify-start text-left',
            )}
          >
            {opt.label[locale]}
          </button>
        ))}
      </div>
      {picked !== null && (
        <div className="mt-4">
          <p className="text-muted">{current.options[picked].feedback[locale]}</p>
          <button
            type="button"
            onClick={() => {
              setStep((s) => s + 1)
              setPicked(null)
            }}
            className={buttonClasses('primary', 'md', 'mt-3')}
          >
            {(step + 1 < steps.length ? nextLabel : resultLabel)[locale]}
          </button>
        </div>
      )}
    </div>
  )
}
