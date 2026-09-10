export interface CourseFish { type: string; band: number; atLu: number; points: number }
export interface CourseObstacle { type: string; band: number; atLu: number; w?: number; h?: number; ampBands?: number }
export interface Course { seedStr: string; seedU32: number; biome: string; lengthLu: number; chunkIds: string[]; chunkStarts: number[]; difficulties: number[]; obstacles: CourseObstacle[]; fish: CourseFish[]; roundIndex?: number; speedMultiplier?: number }
export function generateCourse(seed: string, biome?: string): Course;
export function generateRound(season: string, index: number): Course;
export function fishCountBudget(course: Course, distance: number): number;
export function fishPointsBudget(course: Course, distance: number): number;
export function courseHash(course: Course): number;
export const LU_PER_M: number;
export const COURSE_LENGTH_LU: number;

export const FISH_REACH_SLACK_LU: number;

export const SURFACE_ACTOR_GAP: number;
export function occupiesUpperWater(obstacle: CourseObstacle): boolean;
