import {
  geometricPreference
} from './closed-form-geometric-preferences';
import {
  fractionalConstruction,
  FRACTIONAL_WEIGHTS
} from './closed-form-fractional-rank';

const geometricBonusCache = new WeakMap();

function cachedGeometricBonus(candidate) {
  if (geometricBonusCache.has(candidate)) {
    return geometricBonusCache.get(candidate);
  }

  const bonus = geometricPreference(
    candidate.expression
  ).bonusBits;

  geometricBonusCache.set(candidate, bonus);
  return bonus;
}

// Display and ranking preferences only.
// Never change the mathematical search acceptance rules.

// Integer exponents cost their numerical magnitude, not
// their number of digits. Fractional root operations retain
// their existing single-point cost.
function exponentComplexity(exponent) {
  if (!exponent) return 0;

  if (
    exponent === '0.5' ||
    exponent === '0.3333333333333333'
  ) return 1;

  if (!/^[1-9][0-9]*$/.test(exponent)) return null;

  const value = Number(exponent);
  return Number.isSafeInteger(value) ? value : null;
}

export const FIRST_TIER = Object.freeze([
  44, 35, 18, 32, 8
]);

export const SECOND_TIER = Object.freeze([
  12, 14
]);


// Public helper uses the same single-point reduction rule.
export function preferredFactorization(number) {
  if (!Number.isInteger(number) || number < 1 || number > 288) {
    throw Error('Expected an integer from 1 through 288');
  }

  const best = numericFactorOptions(number).reduce((a, b) =>
    b.cost < a.cost ||
    (b.cost === a.cost &&
      b.largestUnpreferred < a.largestUnpreferred)
      ? b : a
  );

  return {
    factors: best.factors,
    unpreferred: Number(best.largestUnpreferred !== 0),
    largestUnpreferred: best.largestUnpreferred,
    largestRemainder: best.largestRemainder,
    firstTier: best.firstTierCount,
    secondTier: best.factors.filter(
      f => SECOND_TIER.includes(f)
    ).length,
    cost: best.cost
  };
}

// Strip only the appended root-action display suffix.
// The actual root factor remains in the numerical result.
function withoutRootSuffix(expression) {
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
      ) {
        return text.slice(1, i);
      }

      break;
    }
  }

  return text;
}



// Optimize integer factorization using the actual tier costs.
// One first-tier factor reduces its digit cost by one.
// Each second-tier factor costs one point.
function numericFactorOptions(number) {
  const memo = new Map();

  const better = (a, b) =>
    !b ||
    a.cost < b.cost ||
    (a.cost === b.cost &&
      a.largestUnpreferred < b.largestUnpreferred) ||
    (a.cost === b.cost &&
      a.largestUnpreferred === b.largestUnpreferred &&
      a.largestRemainder < b.largestRemainder);

  function withoutFirst(n) {
    if (memo.has(n)) return memo.get(n);

    let best = {
      cost: n === 1 ? 0 : String(n).length,
      factors: n === 1 ? [] : [n],
      firstTierCount: 0,
      largestUnpreferred: n === 1 ? 0 : n,
      largestRemainder: n === 1 ? 0 : n
    };

    for (const factor of SECOND_TIER) {
      if (n % factor !== 0) continue;

      const rest = withoutFirst(n / factor);

      const option = {
        cost: 1 + rest.cost,
        factors: [factor, ...rest.factors],
        firstTierCount: 0,
        largestUnpreferred: rest.largestUnpreferred,
        largestRemainder: Math.max(
          factor, rest.largestRemainder
        )
      };

      if (better(option, best)) best = option;
    }

    memo.set(n, best);
    return best;
  }

  const options = [withoutFirst(number)];

  for (const factor of FIRST_TIER) {
    if (number % factor !== 0) continue;

    const rest = withoutFirst(number / factor);

    options.push({
      cost: String(factor).length - 1 + rest.cost,
      factors: [factor, ...rest.factors],
      firstTierCount: 1,
      largestUnpreferred: rest.largestUnpreferred,
      largestRemainder: Math.max(
        factor, rest.largestRemainder
      )
    });
  }

  return options;
}

function legacyScoreCandidatePreference(
  expression,
  originalComplexity
) {
  let base = withoutRootSuffix(expression);

  // The imaginary-root phase correction costs no points.
  if (/^-?i\*/.test(base)) {
    base = base.replace(/^(-?)i\*/, '$1');
  }

  const fallback = {
    adjustedComplexity: originalComplexity,
    originalComplexity,
    discount: 0,
    motifBonus: 0,
    firstTierCount: 0,
    largestUnpreferred: 0,
    largestRemainder: 0,
    factorizations: []
  };

  // Accept the engine's multiplicative expression grammar.
  const match =
    /^-?([^/()]+)(?:\/(?:\(([^()]*)\)|([A-Za-z_][A-Za-z_0-9]*(?:\^[1-9][0-9]*)?)))?$/
      .exec(base);

  if (!match) return fallback;

  const denominator = match[2] || match[3] || '';

  const sides = [
    match[1].split('*'),
    denominator ? denominator.split('*') : []
  ];

  const validAtom =
    /^(?:[A-Za-z_][A-Za-z_0-9]*(?:\^(?:[1-9][0-9]*|0\.5|0\.3333333333333333))?|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)$/;

  if (!sides.flat().every(atom => validAtom.test(atom))) {
    return fallback;
  }

  const products = [1, 1];
  let fixedCost = 0;
  let baseline = 0;
  const piChoices = [];

  for (let side = 0; side < 2; side++) {
    for (const atom of sides[side]) {
      const integer = /^[1-9][0-9]*$/.test(atom);

      if (integer && atom !== '1') {
        const value = Number(atom);
        const product = products[side] * value;

        if (!Number.isSafeInteger(product)) {
          return fallback;
        }

        products[side] = product;
        baseline += atom.length;
        continue;
      }

      // Multiplicative identity does not add complexity.
      if (atom === '1') continue;

      if (/^(?:\d|\.)/.test(atom)) {
        fixedCost += 1;
        baseline += 1;
        continue;
      }

      const power =
        /^([A-Za-z_][A-Za-z_0-9]*)\^(.+)$/.exec(atom);

      const exponent = power?.[2];
      const exponentCost = exponentComplexity(exponent);

      if (exponentCost === null) return fallback;

      const cost = 1 + exponentCost;

      fixedCost += cost;
      baseline += cost;

      // A pi factor can pair with 2 or 4 on the same
      // side, including when pi appears inside a power.
      if (
        atom === 'pi' ||
        /^pi\^[1-9][0-9]*$/.test(atom)
      ) {
        const amount =
          atom === 'pi' ? 1 : Number(exponent);

        if (Number.isSafeInteger(amount)) {
          const left = amount - 1;

          const after = left === 0
            ? 0
            : left === 1
              ? 1
              : 1 + left;

          piChoices.push({
            side,
            savings: cost - after
          });
        }
      }
    }
  }

  // Retain the existing special K/pi preference.
  // It is not stacked with a geometric pi extraction.
  const kPiBonus =
    sides[0].includes('K') &&
    sides[1].includes('pi') &&
    !sides[0].includes('pi') &&
    products[0] % 2 === 0
      ? 1
      : 0;

  // Evaluate: no geometric reduction, or exactly one
  // preferred 2pi / 4pi extraction on either side.
  const geometricChoices = [null];

  for (const pi of piChoices) {
    for (const factor of [2, 4]) {
      if (products[pi.side] % factor === 0) {
        geometricChoices.push({
          ...pi,
          factor
        });
      }
    }
  }

  let best = null;

  for (const geometry of geometricChoices) {
    const reduced = [...products];

    const baseCost =
      fixedCost - (geometry ? geometry.savings : 0);

    if (geometry) {
      reduced[geometry.side] /= geometry.factor;
    }

    const topOptions = numericFactorOptions(reduced[0]);
    const bottomOptions = numericFactorOptions(reduced[1]);

    for (const top of topOptions) {
      for (const bottom of bottomOptions) {
        const firstTierCount =
          top.firstTierCount + bottom.firstTierCount;

        // One first-tier reduction across the expression.
        if (firstTierCount > 1) continue;

        const score =
          baseCost + top.cost + bottom.cost -
          (geometry ? 0 : kPiBonus);

        const candidate = {
          adjustedComplexity: Math.max(0, score),
          originalComplexity,
          discount: baseline - score,
          motifBonus: geometry ? 2 : kPiBonus,
          firstTierCount,

          largestUnpreferred: Math.max(
            top.largestUnpreferred,
            bottom.largestUnpreferred
          ),

          largestRemainder: Math.max(
            top.largestRemainder,
            bottom.largestRemainder
          ),

          factorizations: [
            {
              side: 'numerator',
              value: products[0],
              factors: geometry?.side === 0
                ? [geometry.factor, ...top.factors]
                : top.factors,
              free: top.cost === 0
            },
            {
              side: 'denominator',
              value: products[1],
              factors: geometry?.side === 1
                ? [geometry.factor, ...bottom.factors]
                : bottom.factors,
              free: bottom.cost === 0
            }
          ]
        };

        if (
          !best ||
          candidate.adjustedComplexity <
            best.adjustedComplexity ||
          (
            candidate.adjustedComplexity ===
              best.adjustedComplexity &&
            candidate.largestUnpreferred <
              best.largestUnpreferred
          ) ||
          (
            candidate.adjustedComplexity ===
              best.adjustedComplexity &&
            candidate.largestUnpreferred ===
              best.largestUnpreferred &&
            candidate.firstTierCount >
              best.firstTierCount
          )
        ) {
          best = candidate;
        }
      }
    }
  }

  return best || fallback;
}


// The new construction score is independent of search eligibility.
export function scoreCandidatePreference(expression, originalComplexity) {
  const old = legacyScoreCandidatePreference(
    expression, originalComplexity
  );

  const construction = fractionalConstruction(expression);

  return {
    ...old,
    adjustedComplexity:
      construction?.complexity ?? originalComplexity,
    construction
  };
}

// Ignore scientific-notation exponent markers when
// identifying actual named constants.
export function hasNamedGeometricConstant(expression) {
  let base = withoutRootSuffix(expression);

  base = base.replace(
    /(?:\d+(?:\.\d*)?|\.\d+)[eE][+-]?\d+/g,
    '1'
  );

  const identifiers =
    base.match(/[A-Za-z_][A-Za-z_0-9]*/g) || [];

  return identifiers.some(name =>
    name !== 'i' &&
    !/^sqrt_[0-9]+$/.test(name)
  );
}

// Independent structural score, without geometric
// reductions. Numerical magnitude is a separate field.
export function structuralProfile(expression, fallback = 0) {
  let base = withoutRootSuffix(expression);

  // Remove only the automatically inserted phase.
  base = base.replace(/^(-?)i\*/, '$1');

  const match =
    /^-?([^/()]+)(?:\/(?:\(([^()]*)\)|([A-Za-z_][A-Za-z_0-9]*(?:\^[1-9][0-9]*)?)))?$/
      .exec(base);

  const unknown = {
    structuralComplexity: fallback,
    distinctConstants: 0,
    partitionImbalance: 0,
    magnitudeBits: 0,
    largestNumber: 0
  };

  if (!match) return unknown;

  const sides = [
    match[1].split('*'),
    (match[2] || match[3] || '')
      .split('*').filter(Boolean)
  ];

  let cost = 0;
  let magnitudeBits = 0;
  let largestNumber = 0;

  const constants = new Set();
  const products = [1, 1];

  // Count non-unit factors on each side.
  // The absolute imbalance is invariant under reciprocation.
  const factorCounts = [0, 0];

  for (let side = 0; side < 2; side++) {
    for (const atom of sides[side]) {
      if (atom === '1') continue;

      if (/^[1-9][0-9]*$/.test(atom)) {
        const n = Number(atom);
        const product = products[side] * n;

        if (!Number.isSafeInteger(product)) {
          return unknown;
        }

        products[side] = product;
        continue;
      }

      const radical = /^sqrt_([1-9][0-9]*)$/.exec(atom);

      if (radical) {
        const n = Number(radical[1]);

        if (!Number.isSafeInteger(n)) return unknown;

        // Radical operation plus radicand digits.
        factorCounts[side]++;
        cost += 1 + radical[1].length;
        magnitudeBits += Math.log2(n);
        largestNumber = Math.max(largestNumber, n);
        continue;
      }

      const named =
        /^([A-Za-z_][A-Za-z_0-9]*)(?:\^(.+))?$/
          .exec(atom);

      if (named) {
        const [, name, exponent] = named;

        // Named constant: one point. Integer exponent:
        // its numerical magnitude. Square and cube roots:
        // one additional operation point.
        const exponentCost = exponentComplexity(exponent);

        if (exponentCost === null) return unknown;

        factorCounts[side]++;
        cost += 1 + exponentCost;

        if (name !== 'i') {
          constants.add(name);
        }

        continue;
      }

      // Unsupported grammar uses the fallback score.
      return unknown;
    }
  }

  // Reduce the whole rational coefficient exactly.
  function gcd(a, b) {
    while (b) [a, b] = [b, a % b];
    return a;
  }

  const d = gcd(products[0], products[1]);
  const p = products[0] / d;
  const q = products[1] / d;

  if (p > 1) {
    cost += String(p).length;
    magnitudeBits += Math.log2(p);
  }

  if (q > 1) {
    cost += String(q).length;
    magnitudeBits += Math.log2(q);
  }

  // Count each reduced numerical coefficient as one factor.
  // This avoids penalizing alternative integer factorizations.
  factorCounts[0] += Number(p > 1);
  factorCounts[1] += Number(q > 1);

  const partitionImbalance =
    Math.abs(factorCounts[0] - factorCounts[1]);

  largestNumber = Math.max(largestNumber, p, q);

  return {
    structuralComplexity: cost,
    distinctConstants: constants.size,
    partitionImbalance,
    magnitudeBits,
    largestNumber
  };
}

// Negative means a ranks before b.
// Both individual and grouped results use fractional preferences.
export function compareCandidatePreference(a, b) {
  const ap = a.preference ||
    scoreCandidatePreference(a.expression, a.complexity);

  const bp = b.preference ||
    scoreCandidatePreference(b.expression, b.complexity);

  const ar =
    ap.adjustedComplexity -
    FRACTIONAL_WEIGHTS.geometric *
      Number(cachedGeometricBonus(a) > 0);

  const br =
    bp.adjustedComplexity -
    FRACTIONAL_WEIGHTS.geometric *
      Number(cachedGeometricBonus(b) > 0);

  return (
    ar - br ||
    a.z - b.z ||
    a.expression.localeCompare(b.expression)
  );
}

// Shared group score before numerical-error tie-breaking.
// assumeEquivalent models the best future equivalence bonus.
export function fractionalGroupRank(
  candidate, assumeEquivalent = false
) {
  const preference = candidate.preference ||
    scoreCandidatePreference(
      candidate.expression, candidate.complexity
    );

  return preference.adjustedComplexity -
    FRACTIONAL_WEIGHTS.geometric *
      Number(cachedGeometricBonus(candidate) > 0) -
    FRACTIONAL_WEIGHTS.equivalence *
      Number(
        assumeEquivalent ||
        (candidate.equivalentExpressions || []).length > 0
      );
}

// Keep the existing ranked list and equivalent-expression groups.
export function compareCandidateGroupPreference(a, b) {
  const rank = candidate => {
    const preference = candidate.preference ||
      scoreCandidatePreference(
        candidate.expression, candidate.complexity
      );

    return (
      preference.adjustedComplexity -
      FRACTIONAL_WEIGHTS.geometric *
        Number(cachedGeometricBonus(candidate) > 0) -
      FRACTIONAL_WEIGHTS.equivalence *
        Number(
          (candidate.equivalentExpressions || []).length > 0
        )
    );
  };

  return (
    rank(a) - rank(b) ||
    compareCandidatePreference(a, b)
  );
}
