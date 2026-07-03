// INTENSE (пик): эшелон акул — белые держат вторую и четвёртую полосы со сдвигом,
// крупная запирает середину на выходе; выживание — у поверхности или у дна.
export const chunk = {
  id: 'coastal-17',
  biome: 'coastal',
  difficulty: 5,
  intense: true,
  lenLu: 1200,
  obstacles: [
    { type: 'shark_white', band: 1, atLu: 800 },
    { type: 'shark_white', band: 3, atLu: 1060 },
    { type: 'shark_big', band: 2, atLu: 1080 },
  ],
  fish: [
    { type: 'fish_small', band: 0, atLu: 400 },
    { type: 'fish_small', band: 4, atLu: 700 },
    { type: 'fish_small', band: 0, atLu: 1000 },
  ],
};
