// Answers and points for every question type. Shared by rules.js (the team game), the screens and the solo page,
// so a question scores the same everywhere. Question fields are described in lessons.js.

export const typeOf = (q) => q.type ?? 'choice';

/** The most points an answer can earn. */
export function bestPoints(q) {
  if (typeOf(q) === 'number') return Math.max(...q.number.tiers.map(([, points]) => points));
  if (typeOf(q) === 'multi') return q.choices.reduce((s, c) => s + Math.max(0, c.points), 0);
  return Math.max(...q.choices.map((c) => c.points));
}

/** A tidy copy of an answer, or null if it isn't a valid answer to this question. */
export function cleanAnswer(q, raw) {
  const type = typeOf(q);
  if (type === 'choice') return Number.isInteger(raw) && raw >= 0 && raw < q.choices.length ? raw : null;
  if (type === 'multi') {
    if (!Array.isArray(raw) || raw.length > q.choices.length) return null;
    if (!raw.every((i) => Number.isInteger(i) && i >= 0 && i < q.choices.length)) return null;
    return [...new Set(raw)].sort((a, b) => a - b);
  }
  const { min, max, step = 1 } = q.number;
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < min || raw > max) return null;
  return Math.round(raw / step) * step;
}

/** Points for an answer (null = no answer). Never negative. */
export function scoreAnswer(q, answer) {
  if (answer == null) return 0;
  const type = typeOf(q);
  if (type === 'choice') return q.choices[answer]?.points ?? 0;
  if (type === 'multi') return Math.max(0, answer.reduce((s, i) => s + (q.choices[i]?.points ?? 0), 0));
  const off = Math.abs(answer - q.number.value);
  const tier = [...q.number.tiers].sort((a, b) => a[0] - b[0]).find(([within]) => off <= within + 1e-9);
  return tier ? tier[1] : 0;
}

export const isBest = (q, answer) => answer != null && scoreAnswer(q, answer) === bestPoints(q);

/** Ten equal bins over a number question's range, for the room's histogram: [{ from, to }]. */
export function numberBins(q) {
  const { min, max } = q.number;
  const width = (max - min) / 10;
  return Array.from({ length: 10 }, (_, i) => ({ from: min + i * width, to: min + (i + 1) * width }));
}

/**
 * How the room answered: { counts, answered, median }.
 * counts: per choice (choice, multi: how many picked each) or per histogram bin (number).
 */
export function tally(q, answers) {
  const type = typeOf(q);
  const given = answers.filter((a) => a != null);
  if (type === 'number') {
    const bins = numberBins(q);
    const counts = bins.map(() => 0);
    for (const a of given) counts[Math.min(bins.length - 1, Math.max(0, Math.floor((a - q.number.min) / (bins[0].to - bins[0].from))))]++;
    const sorted = [...given].sort((a, b) => a - b);
    const mid = sorted.length / 2;
    const median = sorted.length ? (sorted.length % 2 ? sorted[Math.floor(mid)] : (sorted[mid - 1] + sorted[mid]) / 2) : null;
    return { counts, answered: given.length, median };
  }
  const counts = q.choices.map(() => 0);
  for (const a of given) for (const i of type === 'multi' ? a : [a]) counts[i]++;
  return { counts, answered: given.length, median: null };
}

/** A number as the question shows it: "42.5%", "7.7 pts". */
export function formatNumber(q, value) {
  const { step = 1, unit = '' } = q.number;
  const decimals = step < 1 ? String(step).split('.')[1].length : Number.isInteger(value) ? 0 : 1;
  return `${Number(value).toFixed(decimals)}${unit}`;
}

/** An answer in words, for "your answer" lines. */
export function describeAnswer(q, answer) {
  if (answer == null) return 'No answer';
  const type = typeOf(q);
  if (type === 'number') return formatNumber(q, answer);
  if (type === 'multi') return answer.length ? answer.map((i) => i + 1).join(', ') : 'None of them';
  return q.choices[answer]?.text ?? '?';
}
