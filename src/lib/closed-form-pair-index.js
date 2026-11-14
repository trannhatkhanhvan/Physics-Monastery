// Indexed two-factor lookup for multiplicative closed forms.
// The existing exhaustive search engine remains unchanged.

export const SIGNED_POWERS = Object.freeze([
  -4, -3, -2, -1, 1, 2, 3, 4
]);

export function buildPairIndex(factors) {
  if (
    !Array.isArray(factors) ||
    factors.length > 28 ||
    factors.some(f =>
      !f ||
      typeof f.label !== 'string' ||
      !f.label ||
      !Number.isFinite(f.value) ||
      f.value === 0
    ) ||
    new Set(factors.map(f => f.label)).size !== factors.length
  ) {
    throw Error('Invalid selected constants');
  }

  const positive = [];
  const negative = [];

  for (let i = 0; i < factors.length; i++) {
    for (let j = i + 1; j < factors.length; j++) {
      for (const e1 of SIGNED_POWERS) {
        const a = factors[i].value ** e1;

        for (const e2 of SIGNED_POWERS) {
          const value = a * factors[j].value ** e2;

          if (!Number.isFinite(value) || value === 0) {
            continue;
          }

          const item = {
            i,
            j,
            e1,
            e2,
            value,
            mask: (1 << i) | (1 << j),
            parts:
              2 +
              Number(Math.abs(e1) > 1) +
              Number(Math.abs(e2) > 1),
            logAbs: Math.log(Math.abs(value))
          };

          (value > 0 ? positive : negative).push(item);
        }
      }
    }
  }

  const compare = (a, b) => a.logAbs - b.logAbs;

  positive.sort(compare);
  negative.sort(compare);

  return {
    positive,
    negative,
    count: positive.length + negative.length
  };
}

function firstAtLeast(items, x) {
  let lo = 0;
  let hi = items.length;

  while (lo < hi) {
    const mid = (lo + hi) >>> 1;

    if (items[mid].logAbs < x) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  return lo;
}

export function findPairComplements(index, {
  target,
  tolerance,
  disallowMask = 0,
  maxParts = 4
}) {
  if (
    !Number.isFinite(target) ||
    !Number.isFinite(tolerance) ||
    tolerance < 0 ||
    !Number.isInteger(disallowMask) ||
    !Number.isInteger(maxParts)
  ) {
    throw Error('Invalid pair lookup');
  }

  const results = [];
  const items = target >= 0
    ? index.positive
    : index.negative;

  const minAbs = Math.max(
    0,
    Math.abs(target) - tolerance
  );

  const maxAbs = Math.abs(target) + tolerance;

  if (maxAbs === 0) return results;

  const upperLog = Math.log(maxAbs);

  for (
    let k = firstAtLeast(items, Math.log(minAbs));
    k < items.length;
    k++
  ) {
    const item = items[k];

    if (item.logAbs > upperLog) break;

    if (
      item.parts > maxParts ||
      (item.mask & disallowMask)
    ) {
      continue;
    }

    if (Math.abs(item.value - target) <= tolerance) {
      results.push(item);
    }
  }

  return results;
}
