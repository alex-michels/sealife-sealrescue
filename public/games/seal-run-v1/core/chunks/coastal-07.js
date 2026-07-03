// Два донных камня в шахматном порядке — слалом по нижней половине не обязателен,
// рыбная линия наверху вознаграждает спокойную траекторию.
export const chunk = {
  id: 'coastal-07',
  biome: 'coastal',
  difficulty: 2,
  intense: false,
  lenLu: 1200,
  obstacles: [
    { type: 'rock', band: 4, atLu: 400, w: 160, h: 140 },
    { type: 'rock', band: 3, atLu: 900, w: 140, h: 120 },
  ],
  fish: [
    { type: 'fish_small', band: 1, atLu: 250 },
    { type: 'fish_small', band: 1, atLu: 550 },
    { type: 'fish_small', band: 1, atLu: 850 },
    { type: 'fish_rare', band: 0, atLu: 1050 },
  ],
};
