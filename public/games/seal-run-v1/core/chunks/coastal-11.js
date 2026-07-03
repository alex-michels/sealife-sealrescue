// Орка-стена в середине столба (поздняя — от любой полосы есть время уйти),
// затем белая акула преследует по второй полосе — награда на глубинной линии.
export const chunk = {
  id: 'coastal-11',
  biome: 'coastal',
  difficulty: 3,
  intense: false,
  lenLu: 1200,
  obstacles: [
    { type: 'orca', band: 2, atLu: 700, ampBands: 1 },
    { type: 'shark_white', band: 1, atLu: 1080 },
  ],
  fish: [
    { type: 'fish_small', band: 4, atLu: 300 },
    { type: 'fish_small', band: 4, atLu: 600 },
    { type: 'fish_small', band: 4, atLu: 900 },
    { type: 'fish_rare', band: 4, atLu: 1100 },
  ],
};
