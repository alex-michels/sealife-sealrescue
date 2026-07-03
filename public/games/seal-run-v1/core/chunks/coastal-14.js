// INTENSE: акула держит нижнюю середину, на выходе орка-стена перекрывает весь верх
// (поздняя: от любой полосы успевается уход вниз) + камень у поверхности.
export const chunk = {
  id: 'coastal-14',
  biome: 'coastal',
  difficulty: 4,
  intense: true,
  lenLu: 1200,
  obstacles: [
    { type: 'shark_white', band: 3, atLu: 800 },
    { type: 'orca', band: 1, atLu: 1000, ampBands: 1 },
    { type: 'rock', band: 0, atLu: 1050, w: 140, h: 120 },
  ],
  fish: [
    { type: 'fish_small', band: 4, atLu: 300 },
    { type: 'fish_small', band: 4, atLu: 600 },
    { type: 'fish_small', band: 4, atLu: 900 },
  ],
};
