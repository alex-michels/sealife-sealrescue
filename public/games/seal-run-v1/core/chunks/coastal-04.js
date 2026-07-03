// Пластиковое пятно в середине столба; рыба учит менять глубину по дуге.
export const chunk = {
  id: 'coastal-04',
  biome: 'coastal',
  difficulty: 1,
  intense: false,
  lenLu: 1200,
  obstacles: [{ type: 'plastic_cluster', band: 2, atLu: 700 }],
  fish: [
    { type: 'fish_small', band: 0, atLu: 300 },
    { type: 'fish_small', band: 1, atLu: 550 },
    { type: 'fish_small', band: 1, atLu: 800 },
    { type: 'fish_small', band: 2, atLu: 1050 },
  ],
};
