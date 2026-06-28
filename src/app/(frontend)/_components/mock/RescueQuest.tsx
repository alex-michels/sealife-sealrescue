'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import { m } from '@/mock/copy'
import { buttonClasses } from '../ui/Button'

/**
 * Интерактивный rescue-квест (M2-T15 preview): обучение через сценарий, ведёт в каталог.
 * Образовательный, не наказывающий — на неверном выборе объясняем и идём дальше.
 */
type Loc = Record<Locale, string>
type Step = { q: Loc; options: Array<{ label: Loc; ok: boolean; feedback: Loc }> }

const steps: Step[] = [
  {
    q: {
      ru: 'Тюлень один на берегу. Что делаешь?',
      en: 'A seal is alone on the beach. What do you do?',
      de: 'Eine Robbe ist allein am Strand. Was tust du?',
    },
    options: [
      {
        label: { ru: 'Подойти и погладить', en: 'Walk up and pet it', de: 'Hingehen und streicheln' },
        ok: false,
        feedback: {
          ru: 'Нет: не трогать. Дикое животное, риск для него и для вас.',
          en: 'No: don’t touch it. It’s wild — a risk for it and for you.',
          de: 'Nein: nicht anfassen. Ein Wildtier — ein Risiko für es und für dich.',
        },
      },
      {
        label: {
          ru: 'Держать дистанцию, убрать собак',
          en: 'Keep distance, move dogs away',
          de: 'Abstand halten, Hunde wegbringen',
        },
        ok: true,
        feedback: {
          ru: 'Верно. Дистанция и отсутствие собак — это уже половина помощи.',
          en: 'Right. Distance and no dogs is already half the help.',
          de: 'Richtig. Abstand und keine Hunde sind schon die halbe Hilfe.',
        },
      },
    ],
  },
  {
    q: { ru: 'Тюлень выглядит вялым.', en: 'The seal looks sluggish.', de: 'Die Robbe wirkt schlapp.' },
    options: [
      {
        label: {
          ru: 'Столкнуть обратно в воду',
          en: 'Push it back into the water',
          de: 'Zurück ins Wasser schieben',
        },
        ok: false,
        feedback: {
          ru: 'Нет: отдых на берегу — это нормально, возвращать в воду нельзя.',
          en: 'No: resting ashore is normal; don’t return it to the water.',
          de: 'Nein: Ausruhen am Strand ist normal; nicht zurück ins Wasser bringen.',
        },
      },
      {
        label: {
          ru: 'Оценить состояние с расстояния',
          en: 'Assess from a distance',
          de: 'Zustand aus der Entfernung beurteilen',
        },
        ok: true,
        feedback: {
          ru: 'Верно. Наблюдаем издалека, не кормим.',
          en: 'Right. Observe from afar, don’t feed it.',
          de: 'Richtig. Aus der Ferne beobachten, nicht füttern.',
        },
      },
    ],
  },
  {
    q: {
      ru: 'Похоже, нужна помощь специалистов.',
      en: 'It looks like it needs expert help.',
      de: 'Es sieht so aus, als bräuchte sie fachliche Hilfe.',
    },
    options: [
      {
        label: { ru: 'Уйти, разберётся сам', en: 'Leave — it’ll sort itself out', de: 'Weggehen — sie schafft das allein' },
        ok: false,
        feedback: {
          ru: 'Лучше сообщить специалистам — они решат, нужна ли помощь.',
          en: 'Better to alert specialists — they’ll decide if help is needed.',
          de: 'Besser Fachleute informieren — sie entscheiden, ob Hilfe nötig ist.',
        },
      },
      {
        label: { ru: 'Найти ближайший центр', en: 'Find the nearest center', de: 'Das nächste Zentrum finden' },
        ok: true,
        feedback: {
          ru: 'Верно. Открываем каталог центров.',
          en: 'Right. Let’s open the centers directory.',
          de: 'Richtig. Öffnen wir das Zentren-Verzeichnis.',
        },
      },
    ],
  },
]

const resultText: Loc = {
  ru: 'Ты держал дистанцию, не паниковал и позвал специалистов. Теперь найди центр рядом.',
  en: 'You kept your distance, stayed calm, and called the experts. Now find a center nearby.',
  de: 'Du hast Abstand gehalten, ruhig reagiert und die Fachleute gerufen. Jetzt finde ein Zentrum in der Nähe.',
}
const centersNearby: Loc = { ru: 'Центры рядом →', en: 'Centers nearby →', de: 'Zentren in der Nähe →' }
const nextLabel: Loc = { ru: 'Дальше →', en: 'Next →', de: 'Weiter →' }
const resultLabel: Loc = { ru: 'Итог →', en: 'See result →', de: 'Ergebnis →' }

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
