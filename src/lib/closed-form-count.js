export const QUICK_MONOMIAL_LIMIT = 250000;

export function countSearchMonomials(factorCount, complexity) {
  if (
    !Number.isInteger(factorCount) ||
    factorCount < 0 ||
    factorCount > 68 ||
    !Number.isInteger(complexity) ||
    complexity < 1 ||
    complexity > 8
  ) {
    throw Error('Invalid monomial counting parameters');
  }

  const choose = (n, k) => {
    let result = 1;

    for (let j = 1; j <= k; j++) {
      result = result * (n - j + 1) / j;
    }

    return Math.round(result);
  };

  let total = 1;

  for (
    let k = 1;
    k <= Math.min(5, factorCount, complexity);
    k++
  ) {
    for (
      let cost = k;
      cost <= Math.min(complexity, 2 * k);
      cost++
    ) {
      const expensive = cost - k;
      const ordinary = k - expensive;

      total +=
        choose(factorCount, k) *
        choose(k, expensive) *
        2 ** ordinary *
        12 ** expensive;
    }
  }

  return total;
}

export function maxQuickFactors(complexity) {
  for (let n = 68; n >= 0; n--) {
    if (
      countSearchMonomials(n, complexity) <=
      QUICK_MONOMIAL_LIMIT
    ) {
      return n;
    }
  }

  return 0;
}


// Maximum fully enumerable original complexity for a
// given number of selected factors.
export function maxQuickDepth(factorCount) {
  for (let depth = 8; depth >= 1; depth--) {
    if (
      countSearchMonomials(factorCount, depth) <=
      QUICK_MONOMIAL_LIMIT
    ) return depth;
  }
  return 0;
}

