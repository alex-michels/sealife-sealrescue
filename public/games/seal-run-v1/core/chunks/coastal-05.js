// Прибрежный камень у самой поверхности; глубинная рыбная линия с золотой.
export const chunk = {
  id: 'coastal-05',
  biome: 'coastal',
  difficulty: 1,
  intense: false,
  lenLu: 1200,
  obstacles: [{ type: 'rock', band: 0, atLu: 450, w: 140, h: 140 }],
  fish: [
    { type: 'fish_small', band: 3, atLu: 250 },
    { type: 'fish_small', band: 3, atLu: 500 },
    { type: 'fish_rare', band: 4, atLu: 800 },
    { type: 'fish_small', band: 3, atLu: 1050 },
  ],
};
