export const RULES_VERSION: string;
export const MAX_ROUNDS: number;
export const MAX_EXPEDITION_SCORE: number;
export const EXPEDITION: readonly string[];
export function roundSpeed(index: number): number;
export function roundSeed(season: string, index: number): string;
