// Первая орка: синусоида по нижней половине — тайминг-паттерн, уход к поверхности.
export const chunk = {
  id: 'coastal-09',
  biome: 'coastal',
  difficulty: 2,
  intense: false,
  lenLu: 1200,
  obstacles: [{ type: 'orca', band: 3, atLu: 650, ampBands: 1 }],
  fish: [
    { type: 'fish_small', band: 0, atLu: 300 },
    { type: 'fish_small', band: 0, atLu: 650 },
    { type: 'fish_small', band: 1, atLu: 850 },
    { type: 'fish_small', band: 0, atLu: 1000 },
  ],
};
