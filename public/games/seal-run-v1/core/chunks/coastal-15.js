// INTENSE (пик): акула держит поверхность, поздняя орка-стена перекрывает всю
// нижнюю половину — безопасный маршрут прошит через пластиковое пятно (замедление,
// удвоенный расход дыхания); золотая рыба — награда на освободившейся поверхности.
export const chunk = {
  id: 'coastal-15',
  biome: 'coastal',
  difficulty: 5,
  intense: true,
  lenLu: 1200,
  obstacles: [
    { type: 'shark_white', band: 0, atLu: 650 },
    { type: 'plastic_cluster', band: 1, atLu: 400 },
    { type: 'orca', band: 3, atLu: 950, ampBands: 1 },
  ],
  fish: [
    { type: 'fish_small', band: 1, atLu: 300 },
    { type: 'fish_small', band: 1, atLu: 550 },
    { type: 'fish_rare', band: 0, atLu: 1000 },
  ],
};
