// «Сжатие и переворот»: пара камней зажимает к середине, затем крупная акула
// выдавливает из середины к краям. Пластик наказывает нижний вход.
export const chunk = {
  id: 'coastal-12',
  biome: 'coastal',
  difficulty: 3,
  intense: false,
  lenLu: 1200,
  obstacles: [
    { type: 'plastic_cluster', band: 3, atLu: 350 },
    { type: 'rock', band: 0, atLu: 550, w: 160, h: 140 },
    { type: 'rock', band: 4, atLu: 550, w: 160, h: 140 },
    { type: 'shark_big', band: 2, atLu: 1050 },
  ],
  fish: [
    { type: 'fish_small', band: 2, atLu: 300 },
    { type: 'fish_small', band: 2, atLu: 550 },
    { type: 'fish_small', band: 0, atLu: 900 },
    { type: 'fish_small', band: 0, atLu: 1100 },
  ],
};
