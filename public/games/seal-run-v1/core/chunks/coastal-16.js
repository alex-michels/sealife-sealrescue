// Сеть в середине, камень во второй полосе, акула по дну — маршрут у поверхности.
export const chunk = {
  id: 'coastal-16',
  biome: 'coastal',
  difficulty: 4,
  intense: false,
  lenLu: 1200,
  obstacles: [
    { type: 'ghost_net', band: 2, atLu: 300 },
    { type: 'rock', band: 1, atLu: 600, w: 140, h: 100 },
    { type: 'shark_white', band: 4, atLu: 850 },
  ],
  fish: [
    { type: 'fish_small', band: 0, atLu: 250 },
    { type: 'fish_small', band: 0, atLu: 550 },
    { type: 'fish_small', band: 0, atLu: 850 },
    { type: 'fish_small', band: 0, atLu: 1100 },
  ],
};
