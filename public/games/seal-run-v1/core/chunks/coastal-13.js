// Слалом из двух камней в средних полосах + сеть у поверхности в конце;
// щедрая рыбная линия (и золотая на глубине) платит за манёвры.
export const chunk = {
  id: 'coastal-13',
  biome: 'coastal',
  difficulty: 3,
  intense: false,
  lenLu: 1200,
  obstacles: [
    { type: 'rock', band: 2, atLu: 350, w: 140, h: 100 },
    { type: 'rock', band: 3, atLu: 800, w: 140, h: 100 },
    { type: 'ghost_net', band: 0, atLu: 1000 },
  ],
  fish: [
    { type: 'fish_small', band: 1, atLu: 250 },
    { type: 'fish_small', band: 1, atLu: 500 },
    { type: 'fish_rare', band: 4, atLu: 600 },
    { type: 'fish_small', band: 1, atLu: 750 },
    { type: 'fish_small', band: 1, atLu: 1000 },
  ],
};
