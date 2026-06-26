/**
 * «Факт дня» (M1-T03) — детерминированный выбор по дате, БЕЗ хранилища.
 *
 * Один и тот же день → один и тот же факт для всех посетителей (стабильно, кэшируемо,
 * без localStorage/состояния — соответствует invariants о source of truth). Меняется
 * раз в сутки по UTC. Индекс зависит и от дня, и от длины списка.
 */

/** Порядковый день от эпохи (UTC) — монотонно растёт, меняется в полночь UTC. */
export function dayNumberUTC(date: Date = new Date()): number {
  return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86_400_000)
}

/** Стабильный индекс в [0, length) для текущего дня. length<=0 → -1 (нет данных). */
export function dailyIndex(length: number, date: Date = new Date()): number {
  if (length <= 0) return -1
  return dayNumberUTC(date) % length
}

/** Выбрать элемент дня из непустого списка (или undefined). */
export function pickOfDay<T>(items: T[], date: Date = new Date()): T | undefined {
  const i = dailyIndex(items.length, date)
  return i < 0 ? undefined : items[i]
}
