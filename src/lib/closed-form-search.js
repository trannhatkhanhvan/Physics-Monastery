import {
  scoreCandidatePreference,
  compareCandidatePreference,
  compareCandidateGroupPreference,
  fractionalGroupRank,
  hasNamedGeometricConstant
} from './closed-form-preference';
// Numerical grouping uses the same 15 significant digits as the UI.

// Independent multiplicative closed-form discovery.
// At most five distinct selected constants.
// No addition or subtraction in generated expressions.

const EXPONENTS = [
  -1, 1, -2, 2, -3, 3, -4, 4, -5, 5,
  -0.5, 0.5, -(1 / 3), 1 / 3
];
import {
  QUICK_MONOMIAL_LIMIT,
  countSearchMonomials
} from './closed-form-count';

export {
  QUICK_MONOMIAL_LIMIT,
  countSearchMonomials,
  maxQuickFactors,
  maxQuickDepth
} from './closed-form-count';

const MAX_MONOMIALS = QUICK_MONOMIAL_LIMIT;

const MAX_RETURNED = 1000;

// Minimal squarefree radical basis for the requested set.
// Rational square factors are already handled by p/q.
// The complete original list reduces to these eight radicands.
const BUILTIN_RADICANDS = Object.freeze([
  2, 3, 5, 6, 7, 11, 14, 35
]);

const RADICAL_OPTIONS = [
  null,
  ...BUILTIN_RADICANDS.flatMap(n => [
    { label: `sqrt_${n}`, value: Math.sqrt(n), exponent: 1 },
    { label: `sqrt_${n}`, value: 1 / Math.sqrt(n), exponent: -1 }
  ])
];

// Use real roots, including for negative cube-root arguments.
function realPower(value, exponent) {
  if (Math.abs(exponent) === 0.5) {
    if (value < 0) return NaN;
    const root = Math.sqrt(value);
    return exponent > 0 ? root : 1 / root;
  }

  if (Math.abs(exponent) === 1 / 3) {
    const root = Math.cbrt(value);
    return exponent > 0 ? root : 1 / root;
  }

  return value ** exponent;
}
const LIMIT = 288;

function gcd(a, b) {
  while (b) [a, b] = [b, a % b];
  return a;
}

export function rationalParts(p, q) {
  const d = gcd(p, q);
  p /= d;
  q /= d;
  return Math.max(1, Number(p !== 1) + Number(q !== 1));
}

export function termParts(exponent) {
  return 1 + Number(Math.abs(exponent) !== 1);
}

// Precompute each reduced positive rational coefficient once.
const rationalTable = (() => {
  const out = [];

  for (let q = 1; q <= LIMIT; q++) {
    for (let p = 1; p <= LIMIT; p++) {
      if (gcd(p, q) === 1) {
        out.push({
          p, q,
          value: p / q,
          parts: rationalParts(p, q)
        });
      }
    }
  }

  return out.sort(
    (a, b) => a.value - b.value || a.parts - b.parts
  );
})();

function lowerBound(x) {
  let lo = 0;
  let hi = rationalTable.length;

  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (rationalTable[mid].value < x) lo = mid + 1;
    else hi = mid;
  }

  return lo;
}

function expression(
  terms, p, q, negative, rootLabel, imaginaryRoot = false
) {
  const top = [];
  if (imaginaryRoot) top.push('i');
  const bottom = [];

  if (p !== 1) top.push(String(p));
  if (q !== 1) bottom.push(String(q));

  for (const term of terms) {
    const power = Math.abs(term.exponent);
    const item = term.label +
      (power === 1 ? '' : '^' +
        (power === 0.5
          ? '0.5'
          : power === 1 / 3
            ? '0.3333333333333333'
            : power));

    (term.exponent > 0 ? top : bottom).push(item);
  }

  const result =
    (negative ? '-' : '') +
    (top.join('*') || '1') +
    (bottom.length ? '/(' + bottom.join('*') + ')' : '');

  return rootLabel
    ? '(' + result + ')*(' + rootLabel + ')'
    : result;
}

// Positive means candidate a is worse than candidate b.
function worse(a, b) {
  return compareCandidateGroupPreference(a, b);
}

// Maintain a max-heap of the worst retained candidate first.
function heapPush(heap, item) {
  heap.push(item);
  let i = heap.length - 1;

  while (i > 0) {
    const parent = (i - 1) >> 1;
    if (worse(heap[parent], item) >= 0) break;
    heap[i] = heap[parent];
    i = parent;
  }

  heap[i] = item;
}

function heapReplaceTop(heap, item) {
  let i = 0;
  const n = heap.length;

  while (true) {
    const left = 2 * i + 1;
    if (left >= n) break;

    let child = left;
    const right = left + 1;

    if (
      right < n &&
      worse(heap[right], heap[left]) > 0
    ) child = right;

    if (worse(heap[child], item) <= 0) break;

    heap[i] = heap[child];
    i = child;
  }

  heap[i] = item;
}

export function searchMultiplicative({
  center,
  oneSigma,
  sigma = 5,
  complexity = 6,
  reportComplexity = complexity,
  factors = [],
  rootFactor = 1,
  rootLabel = '',
  imaginaryRoot = false,
  maxMonomials = MAX_MONOMIALS,
  startMonomial = 0,
  batchMode = false
}) {
  if (
    !Number.isFinite(center) ||
    !Number.isFinite(oneSigma) ||
    oneSigma <= 0 ||
    !Number.isFinite(rootFactor) ||
    rootFactor === 0 ||
    !Number.isInteger(sigma) ||
    sigma < 1 || sigma > 5 ||
    !Number.isInteger(complexity) ||
    complexity < 1 || complexity > 8 ||
    !Number.isInteger(reportComplexity) ||
    reportComplexity < 1 || reportComplexity > 10 ||
    !Number.isInteger(maxMonomials) ||
    maxMonomials < 1 || maxMonomials > 1000000 ||
    !Number.isSafeInteger(startMonomial) ||
    startMonomial < 0 ||
    typeof imaginaryRoot !== 'boolean' ||
    typeof batchMode !== 'boolean' ||
    !Array.isArray(factors) ||
    factors.length > 68 ||
    factors.some(f =>
      !f ||
      typeof f.label !== 'string' ||
      !Number.isFinite(f.value) ||
      f.value === 0
    )
  ) {
    throw Error('Invalid closed-form search parameters');
  }

  const totalPositions = batchMode
    ? countSearchMonomials(factors.length, complexity)
    : 0;

  if (batchMode && startMonomial > totalPositions) {
    throw Error('Batch cursor exceeds search space');
  }

  const endPosition = batchMode
    ? Math.min(totalPositions, startMonomial + maxMonomials)
    : 0;

  // The cursor includes formal monomials whose real-valued
  // evaluations are invalid. They still occupy fixed positions.
  let cursor = 0;

  function choose(n, k) {
    if (k < 0 || k > n) return 0;
    let value = 1;
    for (let j = 1; j <= k; j++) {
      value = value * (n - j + 1) / j;
    }
    return Math.round(value);
  }

  // Exact number of formal leaves below a recursion branch.
  // Enables skipping an entire subtree in constant time.
  function subtreeSize(start, remaining, slots) {
    if (slots === 0) return remaining === 0 ? 1 : 0;

    const expensive = remaining - slots;

    if (
      expensive < 0 ||
      expensive > slots ||
      factors.length - start < slots
    ) return 0;

    return choose(factors.length - start, slots) *
      choose(slots, expensive) *
      2 ** (slots - expensive) *
      12 ** expensive;
  }

  const heap = [];
  const retainedKeys = new Map();
  const used = [];

  let monomials = 0;
  let inspected = 0;
  let totalMatches = 0;
  let discardedPotentialFloor = Infinity;

  // Track the strongest possible future rank of an omitted group.
  const recordDiscarded = candidate => {
    discardedPotentialFloor = Math.min(
      discardedPotentialFloor,
      fractionalGroupRank(candidate, true)
    );
  };
  let incomplete = false;
  let highestCompletedComplexity = -1;

  const tolerance = sigma * oneSigma;
  const targetAbs = Math.abs(center);

  function consider(product, parts) {
    // One cursor position represents one named-constant monomial.
    // All automatic coefficient variants are checked at that position.
    monomials++;

    const monomialBase = product * rootFactor;
    if (!Number.isFinite(monomialBase) || monomialBase === 0) {
      return;
    }

    for (const radical of RADICAL_OPTIONS) {
      const radicalCost = radical ? 1 : 0;

      if (parts + radicalCost > complexity) continue;

      const base = monomialBase * (radical ? radical.value : 1);
      const scale = Math.abs(base);

      if (!Number.isFinite(base) || base === 0) continue;

      const wanted = targetAbs / scale;
      const window = tolerance / scale;

      if (
        !Number.isFinite(wanted) ||
        !Number.isFinite(window)
      ) continue;

      let index = lowerBound(Math.max(0, wanted - window));

      while (
        index < rationalTable.length &&
        rationalTable[index].value <= wanted + window
      ) {
        const fraction = rationalTable[index++];

        const terms = radical
          ? [...used, {
              label: radical.label,
              exponent: radical.exponent
            }]
          : used;

        const coefficientParts =
          fraction.p === 1 &&
          fraction.q === 1 &&
          terms.length
            ? 0
            : fraction.parts;

        const cost =
          parts + radicalCost + coefficientParts;

        if (cost > complexity) continue;

        inspected++;

        const negative = center / base < 0;
        const value =
          base * (negative ? -1 : 1) * fraction.value;

        const z = Math.abs(value - center) / oneSigma;

        if (!Number.isFinite(z) || z > sigma) continue;

        const candidate = {
          expression: expression(
            terms, fraction.p, fraction.q,
            negative, rootLabel, imaginaryRoot
          ),
          value,
          z,
          complexity: cost,
          score: cost,
          passes: true
        };

        if (!hasNamedGeometricConstant(
          candidate.expression
        )) continue;

        candidate.preference = scoreCandidatePreference(
          candidate.expression,
          candidate.complexity
        );

        totalMatches++;

        const identity = candidate.value.toPrecision(15);

        const previous = retainedKeys.get(identity);

        if (previous) {
          const alternatives = [...new Set([
            previous.expression,
            ...(previous.equivalentExpressions || []),
            candidate.expression,
            ...(candidate.equivalentExpressions || [])
          ])];

          // Preserve all discovered expressions sharing
          // the displayed 15-significant-digit value.
          if (compareCandidatePreference(candidate, previous) < 0) {
            candidate.equivalentExpressions =
              alternatives.filter(
                expression => expression !== candidate.expression
              );
            const position = heap.indexOf(previous);

            if (position < 0) {
              throw Error(
                'Canonical candidate heap invariant failed'
              );
            }

            heap[position] = candidate;
            retainedKeys.set(identity, candidate);

          } else {
            previous.equivalentExpressions =
              alternatives.filter(
                expression => expression !== previous.expression
              );
          }

          // A new equivalent form may activate the ranking bonus.
          // Reorder even when the representative stays unchanged.
          heap.sort((a, b) => worse(b, a));
        } else if (heap.length < MAX_RETURNED) {
          heapPush(heap, candidate);
          retainedKeys.set(identity, candidate);
        } else if (worse(candidate, heap[0]) < 0) {
          recordDiscarded(heap[0]);

          retainedKeys.delete(
            heap[0].value.toPrecision(15)
          );

          heapReplaceTop(heap, candidate);
          retainedKeys.set(identity, candidate);
        } else {
          recordDiscarded(candidate);
        }
      }
    }
  }

  // Generate canonical combinations without repeated constants.
  // Each layer has an exact mathematical component count.
  function enumerateExact(
    start, remaining, slots, product, parts
  ) {
    if (batchMode) {
      if (cursor >= endPosition) return;
    } else if (monomials >= maxMonomials) {
      incomplete = true;
      return;
    }

    if (slots === 0) {
      if (remaining === 0) {
        if (
          !batchMode ||
          (cursor >= startMonomial && cursor < endPosition)
        ) consider(product, parts);

        if (batchMode) cursor++;
      }
      return;
    }

    if (remaining < slots || remaining > 2 * slots) {
      return;
    }

    for (
      let i = start;
      i <= factors.length - slots;
      i++
    ) {
      const factor = factors[i];

      for (const exponent of EXPONENTS) {
        const cost = termParts(exponent);
        if (cost > remaining) continue;

        if (batchMode) {
          const size = subtreeSize(
            i + 1, remaining - cost, slots - 1
          );

          if (!size) continue;

          if (
            cursor + size <= startMonomial ||
            cursor >= endPosition
          ) {
            cursor += size;
            continue;
          }
        }

        const value =
          product * realPower(factor.value, exponent);

        if (!Number.isFinite(value) || value === 0) {
          if (batchMode) {
            cursor += subtreeSize(
              i + 1, remaining - cost, slots - 1
            );
          }
          continue;
        }

        used.push({
          label: factor.label,
          exponent
        });

        enumerateExact(
          i + 1,
          remaining - cost,
          slots - 1,
          value,
          parts + cost
        );

        used.pop();

        if (
          incomplete ||
          (batchMode && cursor >= endPosition)
        ) return;
      }
    }
  }

  // Search simpler constructions first.
  for (let cost = 0; cost <= complexity; cost++) {
    if (batchMode && cursor >= endPosition) break;

    if (cost === 0) {
      if (
        !batchMode ||
        (cursor >= startMonomial && cursor < endPosition)
      ) consider(1, 0);

      if (batchMode) cursor++;
    } else {
      for (
        let count = 1;
        count <= Math.min(5, factors.length, cost);
        count++
      ) {
        if (cost > 2 * count) continue;

        enumerateExact(
          0, cost, count, 1, 0
        );

        if (incomplete) break;
      }
    }

    if (
      incomplete ||
      (batchMode && cursor >= endPosition)
    ) break;

    highestCompletedComplexity = cost;
  }

  return {
    candidates: heap.sort((a, b) => worse(a, b)),
    totalMatches,
    discardedPotentialFloor:
      Number.isFinite(discardedPotentialFloor)
        ? discardedPotentialFloor : null,
    inspected,
    monomials,
    incomplete: batchMode
      ? endPosition < totalPositions
      : incomplete,
    batchStartCursor: batchMode ? startMonomial : null,
    nextCursor: batchMode ? endPosition : null,
    positionsProcessed: batchMode
      ? endPosition - startMonomial
      : null,
    totalMonomialPositions: batchMode
      ? totalPositions
      : null,
    highestCompletedMonomialComplexity:
      highestCompletedComplexity,
    returnedLimit: MAX_RETURNED,
    searchDepth: complexity,
    reportComplexity,
    coverage:
      'Up to 5 distinct selected constants; ' +
      'integer exponents −5 through 5 except 0; ' +
      'square and cube roots and reciprocals; ' +
      'reduced p/q with 1 ≤ p,q ≤ 288; ' +
      'multiplication and division only; ' +
      'automatic sqrt(n) and reciprocal factors'
  };
}
