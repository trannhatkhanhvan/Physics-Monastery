import { countSearchMonomials } from './closed-form-count';
import { structuralProfile } from './closed-form-preference';

// Conservative finite cutoff for ranking numerical groups.
//
// Generator layer L contains at least ceil(L/2) named factors.
// A numerical group receives at most a 0.5 structural bonus.
//
// This checks whether unseen expressions can compete with
// the retained structural cutoff. It does not establish
// exhaustive discovery of equivalent expressions.
//
// Disable this cutoff for custom numerical factors or when
// fewer than 1000 numerical groups have been retained.

export function certifyFullRunTop1000({
  candidates,
  tokens,
  numbers,
  factorCount,
  searchDepth,
  cursors
}) {
  if (
    !Array.isArray(candidates) ||
    candidates.length !== 1000 ||
    !Array.isArray(tokens) ||
    !tokens.length ||
    !tokens.every(token =>
      /^[A-Za-z_][A-Za-z_0-9]*$/.test(token) &&
      token !== 'i'
    ) ||
    !Array.isArray(numbers) ||
    numbers.length !== 0 ||
    factorCount !== tokens.length ||
    !Number.isInteger(searchDepth) ||
    searchDepth < 1 ||
    !Array.isArray(cursors) ||
    cursors.length === 0
  ) return null;

  const last = candidates[candidates.length - 1];

  const cutoff = structuralProfile(
    last.expression, last.complexity
  ).structuralComplexity -
    (
      last.equivalentExpressions?.length > 0
        ? 0.5 : 0
    );

  const total = countSearchMonomials(
    factorCount, searchDepth
  );

  if (!Number.isSafeInteger(total) || total <= 0) {
    return null;
  }

  let remainingMinimum = Infinity;

  for (const cursor of cursors) {
    if (
      !Number.isSafeInteger(cursor) ||
      cursor < 0 ||
      cursor > total
    ) return null;

    if (cursor === total) continue;

    let layer = 0;

    while (
      layer <= searchDepth &&
      cursor >= countSearchMonomials(
        factorCount, layer
      )
    ) {
      layer++;
    }

    if (layer > searchDepth) return null;

    remainingMinimum = Math.min(
      remainingMinimum,
      Math.ceil(layer / 2) - 0.5
    );
  }

  if (
    !Number.isFinite(remainingMinimum) ||
    !(remainingMinimum > cutoff)
  ) return null;

  return {
    cutoff,
    remainingMinimum
  };
}
