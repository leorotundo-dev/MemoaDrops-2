export type SM2State = {
  repetitions: number;
  ease_factor: number;
  interval: number;
};

export function sm2Next(state: SM2State, rating: 0|1|2|3|4|5) {
  let { repetitions, ease_factor, interval } = state;
  const q = rating;

  let ef = ease_factor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (ef < 1.3) ef = 1.3;

  if (q < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) interval = 1;
    else if (repetitions === 2) interval = 6;
    else interval = Math.round(interval * ef);
  }

  return { repetitions, ease_factor: ef, interval };
}
