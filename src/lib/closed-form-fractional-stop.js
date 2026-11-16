import {
  countSearchMonomials
} from './closed-form-count';

import {
  fractionalGroupRank
} from './closed-form-preference';

import {
  FRACTIONAL_WEIGHTS
} from './closed-form-fractional-rank';

// Certifies retained group membership, not exhaustive equivalents.
export function certifyFractionalTop1000({
  candidates,
  matches,
  factorCount,
  hasCustomNumbers,
  searchDepth,
  cursors,
  discardedPotentialFloor
}) {
  if (
    hasCustomNumbers ||
    !Number.isSafeInteger(matches) ||
    matches < 2000 ||
    !Array.isArray(candidates) ||
    candidates.length !== 1000 ||
    !Number.isSafeInteger(factorCount) ||
    factorCount < 1 ||
    factorCount > 68 ||
    !Number.isInteger(searchDepth) ||
    searchDepth < 1 ||
    searchDepth > 8 ||
    !Array.isArray(cursors) ||
    cursors.length < 1 ||
    !(
      discardedPotentialFloor === null ||
      Number.isFinite(discardedPotentialFloor)
    )
  ) return null;

  const total = countSearchMonomials(
    factorCount, searchDepth
  );

  if (
    !Number.isSafeInteger(total) ||
    total < 1
  ) return null;

  const cutoff = fractionalGroupRank(candidates[999]);

  if (!Number.isFinite(cutoff)) return null;

  let unseenFloor = Infinity;
  let hasRemaining = false;

  for (const cursor of cursors) {
    if (
      !Number.isSafeInteger(cursor) ||
      cursor < 0 ||
      cursor > total
    ) return null;

    if (cursor === total) continue;

    hasRemaining = true;

    // The cursor traverses original-complexity layers
    // in ascending order.
    // Layer zero contains only the identity monomial.
    // It cannot produce an eligible named-constant result.
    // The first eligible construction layer is one.
    // countSearchMonomials requires depth >= 1.
    let layer = 1;

    while (
      layer < searchDepth &&
      cursor >= countSearchMonomials(
        factorCount, layer
      )
    ) {
      layer++;
    }

    // Layer cost includes named factors (at most 2 each),
    // a reduced rational coefficient (at most 2), and one
    // optional radical (at most 1). Therefore L <= 2k + 3.
    // Never infer ceil(L/2) named constants from total cost.
    const k = Math.max(
      1,
      Math.ceil((layer - 3) / 2)
    );

    const w = FRACTIONAL_WEIGHTS;

    // Include both maximum ranking bonuses.
    // Omit positive coefficient and exponent costs
    // to obtain an optimistic lower bound.
    const optimistic =
      w.distinct * k +
      w.operation * (k - 1) -
      w.geometric -
      w.equivalence;

    unseenFloor = Math.min(
      unseenFloor, optimistic
    );
  }

  if (!hasRemaining) return null;

  const omittedFloor =
    discardedPotentialFloor ?? Infinity;

  // Strict separation protects comparator tie-breaking.
  if (
    !(unseenFloor > cutoff + 1e-10) ||
    !(omittedFloor > cutoff + 1e-10)
  ) return null;

  return {
    cutoff,
    remainingMinimum: unseenFloor,
    discardedMinimum:
      Number.isFinite(omittedFloor)
        ? omittedFloor : null,
    qualifyingMatches: matches,
    scope:
      'Top-1000 groups; equivalents may be incomplete'
  };
}
