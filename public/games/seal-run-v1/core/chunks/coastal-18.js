// INTENSE: крупная акула перекрывает верхнюю половину, донный камень поджимает
// снизу — узкий коридор в 4-й полосе; пластик на выходе наказывает расслабленность.
export const chunk = {
  id: 'coastal-18',
  biome: 'coastal',
  difficulty: 4,
  intense: true,
  lenLu: 1200,
  obstacles: [
    { type: 'shark_big', band: 1, atLu: 700 },
    { type: 'rock', band: 4, atLu: 500, w: 180, h: 140 },
    { type: 'plastic_cluster', band: 3, atLu: 1000 },
  ],
  fish: [
    { type: 'fish_small', band: 3, atLu: 300 },
    { type: 'fish_small', band: 4, atLu: 800 },
    { type: 'fish_small', band: 4, atLu: 1050 },
  ],
};
