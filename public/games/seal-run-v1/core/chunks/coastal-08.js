// Сеть наверху + камень на дне: безопасный коридор — середина.
export const chunk = {
  id: 'coastal-08',
  biome: 'coastal',
  difficulty: 2,
  intense: false,
  lenLu: 1200,
  obstacles: [
    { type: 'ghost_net', band: 1, atLu: 400 },
    { type: 'rock', band: 4, atLu: 800, w: 180, h: 140 },
  ],
  fish: [
    { type: 'fish_small', band: 2, atLu: 300 },
    { type: 'fish_small', band: 2, atLu: 600 },
    { type: 'fish_small', band: 3, atLu: 900 },
    { type: 'fish_small', band: 3, atLu: 1100 },
  ],
};
