// EDIT THIS DICTIONARY to change geometric sorting preferences.
// Every match receives the same small bonus; bonuses never stack.
export const GEOMETRIC_PREFERENCE_DICTIONARY = Object.freeze({
  namedConstants: ['V_fe', 'V_5_2', 'V_6_1', 'G_Ga', 'G_Gi'],

  piCoefficients: [2, 4],              // 2π, 4π
  piOverS: [2],                        // 2π/s
  piOverIntegers: [120, 44, 35, 18, 32, 8], // 4π/k

  kCoefficients: [2, 4],               // 2K, 4K
  kOverPi: true,                       // K/π

  preferredIntegers: [44, 35, 18, 32, 8, 12, 14],

  maximumBonusBits: 0.25
});

// Strip the selected root action; it is not itself
// a geometric-preference match.
function stripRootAction(expression) {
  const text = String(expression).trim();
  if (!text.startsWith('(')) return text;

  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '(') depth++;
    if (text[i] === ')') depth--;

    if (depth === 0) {
      if (
        text.slice(i + 1).startsWith('*(') &&
        text.endsWith(')')
      ) return text.slice(1, i);
      break;
    }
  }
  return text;
}

function gcd(a, b) {
  while (b) [a, b] = [b, a % b];
  return a;
}

function sameRatio(p, q, targetP, targetQ) {
  return p * BigInt(targetQ) === q * BigInt(targetP);
}

// Exact multiplicative matching: no floating-point
// comparisons and no numerical-proximity assumptions.
export function geometricPreference(expression) {
  const rules = GEOMETRIC_PREFERENCE_DICTIONARY;
  const base = stripRootAction(expression)
    .replace(/^(-?)i\*/, '$1');

  const empty = {
    matched: false,
    reasons: [],
    bonusBits: 0
  };

  const match =
    /^-?([^/()]+)(?:\/(?:\(([^()]*)\)|([^/()]+)))?$/
      .exec(base);

  if (!match) return empty;

  const sides = [
    match[1].split('*'),
    (match[2] || match[3] || '').split('*').filter(Boolean)
  ];

  let p = 1n;
  let q = 1n;
  const powers = new Map();
  const reasons = new Set();

  for (let side = 0; side < 2; side++) {
    for (const atom of sides[side]) {
      if (/^[1-9]\d*$/.test(atom)) {
        const n = BigInt(atom);
        if (side === 0) p *= n;
        else q *= n;
        continue;
      }

      if (/^sqrt_[1-9]\d*$/.test(atom)) continue;

      const named =
        /^([A-Za-z_][A-Za-z_0-9]*)(?:\^([1-9]\d*|0\.5|0\.3333333333333333))?$/
          .exec(atom);

      if (!named) return empty;

      const [, token, exponent] = named;
      const exp =
        exponent === '0.5' ? 0.5 :
        exponent === '0.3333333333333333' ? 1 / 3 :
        exponent ? Number(exponent) : 1;

      if (!Number.isFinite(exp)) return empty;

      powers.set(
        token,
        (powers.get(token) || 0) +
          (side === 0 ? exp : -exp)
      );
    }
  }

  // Reduce all numerical coefficients before matching.
  const divisor = gcd(p, q);
  p /= divisor;
  q /= divisor;

  // Favored constants can appear in numerator, denominator,
  // or nonzero powers, but cancelled factors earn no bonus.
  for (const token of rules.namedConstants) {
    if (powers.get(token)) reasons.add(token);
  }

  const pi = powers.get('pi') || 0;
  const k = powers.get('K') || 0;
  const s = powers.get('s') || 0;

  if (pi >= 1) {
    for (const n of rules.piCoefficients) {
      if (sameRatio(p, q, n, 1)) {
        reasons.add(`${n}pi`);
      }
    }

    for (const n of rules.piOverS) {
      if (s <= -1 && sameRatio(p, q, n, 1)) {
        reasons.add(`${n}pi/s`);
      }
    }

    for (const n of rules.piOverIntegers) {
      if (sameRatio(p, q, 4, n)) {
        reasons.add(`4pi/${n}`);
      }
    }
  }

  if (k >= 1) {
    for (const n of rules.kCoefficients) {
      if (sameRatio(p, q, n, 1)) {
        reasons.add(`${n}K`);
      }
    }
  }

  if (rules.kOverPi && k >= 1 && pi <= -1) {
    reasons.add('K/pi');
  }

  // Recognize preferred integers dividing a reduced
  // numerator or denominator. No bonus for factors that
  // disappear when a fraction is reduced.
  for (const n of rules.preferredIntegers) {
    const factor = BigInt(n);
    if (
      (p > 1n && p % factor === 0n) ||
      (q > 1n && q % factor === 0n)
    ) reasons.add(`integer:${n}`);
  }

  return {
    matched: reasons.size > 0,
    reasons: [...reasons],
    bonusBits: reasons.size
      ? rules.maximumBonusBits
      : 0
  };
}
