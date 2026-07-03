// Акула в верхней полосе + донная стена (перекрывает 2 нижние полосы):
// коридор — поверхность или середина.
export const chunk = {
  id: 'coastal-10',
  biome: 'coastal',
  difficulty: 3,
  intense: false,
  lenLu: 1200,
  obstacles: [
    { type: 'shark_white', band: 1, atLu: 700 },
    { type: 'rock', band: 4, atLu: 600, w: 200, h: 200 },
  ],
  fish: [
    { type: 'fish_small', band: 0, atLu: 300 },
    { type: 'fish_small', band: 2, atLu: 500 },
    { type: 'fish_small', band: 0, atLu: 600 },
    { type: 'fish_small', band: 0, atLu: 900 },
    { type: 'fish_small', band: 2, atLu: 1000 },
  ],
};
