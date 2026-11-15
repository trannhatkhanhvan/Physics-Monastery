// Ranking only. Search eligibility uses its own construction budget.
export const FRACTIONAL_WEIGHTS = Object.freeze({
  distinct: 0.30,
  operation: 0.10,
  exponent: 0.05,
  number: 0.04,
  geometric: 0.075,
  equivalence: 0.15
});

function stripRootAction(expression) {
  const text = String(expression).trim();
  if (!text.startsWith('(')) return text;

  let depth = 0;

  for (let i = 0; i < text.length; i++) {
    if (text[i] === '(') depth++;
    if (text[i] === ')') depth--;

    if (depth === 0) {
      return text.slice(i + 1).startsWith('*(') && text.endsWith(')')
        ? text.slice(1, i)
        : text;
    }
  }

  return text;
}

export function fractionalConstruction(expression) {
  const base = stripRootAction(expression)
    .replace(/^(-?)i\*/, '$1');

  const match =
    /^-?([^/()]+)(?:\/(?:\(([^()]*)\)|([^/()]+)))?$/
      .exec(base);

  if (!match) return null;

  const sides = [
    match[1].split('*'),
    (match[2] || match[3] || '').split('*').filter(Boolean)
  ];

  const constants = new Set();

  let numerator = 1n;
  let denominator = 1n;
  let exponentBits = 0;
  let powered = 0;
  let radicals = 0;
  let factorCount = 0;

  for (let side = 0; side < 2; side++) {
    for (const atom of sides[side]) {
      if (atom === '1') continue;

      if (/^[1-9]\d*$/.test(atom)) {
        const value = BigInt(atom);

        if (side === 0) numerator *= value;
        else denominator *= value;

        continue;
      }

      const radical = /^sqrt_([1-9]\d*)$/.exec(atom);

      if (radical) {
        factorCount++;
        radicals++;
        exponentBits += Math.log2(Number(radical[1]));
        continue;
      }

      const named =
        /^([A-Za-z_][A-Za-z_0-9]*)(?:\^([1-9]\d*|0\.5|0\.3333333333333333))?$/
          .exec(atom);

      if (!named) return null;

      const [, name, exponent] = named;

      factorCount++;

      if (name !== 'i') constants.add(name);

      if (exponent) {
        powered++;

        if (
          exponent !== '0.5' &&
          exponent !== '0.3333333333333333'
        ) {
          const n = Number(exponent);

          if (!Number.isSafeInteger(n)) return null;

          exponentBits += Math.log2(n);
        }
      }
    }
  }

  const gcd = (a, b) => {
    while (b !== 0n) {
      [a, b] = [b, a % b];
    }
    return a;
  };

  const divisor = gcd(numerator, denominator);

  numerator /= divisor;
  denominator /= divisor;

  const p = Number(numerator);
  const q = Number(denominator);

  if (!Number.isFinite(p) || !Number.isFinite(q)) {
    return null;
  }

  factorCount += Number(p > 1) + Number(q > 1);

  const operations =
    Math.max(0, factorCount - 1) + powered + radicals;

  const numericalBits =
    Math.log2(p) + Math.log2(q);

  const w = FRACTIONAL_WEIGHTS;

  return {
    complexity:
      w.distinct * constants.size +
      w.operation * operations +
      w.exponent * exponentBits +
      w.number * numericalBits,
    distinctConstants: constants.size,
    operations,
    exponentBits,
    numericalBits
  };
}
