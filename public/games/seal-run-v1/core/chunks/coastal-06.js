// Первая белая акула: держит середину, рыба ведёт к поверхности (и одна — на глубину).
export const chunk = {
  id: 'coastal-06',
  biome: 'coastal',
  difficulty: 2,
  intense: false,
  lenLu: 1200,
  obstacles: [{ type: 'shark_white', band: 2, atLu: 800 }],
  fish: [
    { type: 'fish_small', band: 0, atLu: 300 },
    { type: 'fish_small', band: 4, atLu: 500 },
    { type: 'fish_small', band: 0, atLu: 600 },
    { type: 'fish_small', band: 0, atLu: 900 },
  ],
};
