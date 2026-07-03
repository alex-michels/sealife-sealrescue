// Одинокий донный валун; рыбная линия наверху ведёт мимо, золотая — в конце.
export const chunk = {
  id: 'coastal-02',
  biome: 'coastal',
  difficulty: 1,
  intense: false,
  lenLu: 1200,
  obstacles: [{ type: 'rock', band: 4, atLu: 600, w: 160, h: 160 }],
  fish: [
    { type: 'fish_small', band: 1, atLu: 250 },
    { type: 'fish_small', band: 1, atLu: 500 },
    { type: 'fish_small', band: 1, atLu: 750 },
    { type: 'fish_rare', band: 1, atLu: 1000 },
  ],
};
