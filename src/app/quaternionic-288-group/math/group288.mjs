/*
 * Exact projective 288-element quaternionic transformation group.
 *
 * An element is represented by a pair
 *
 *   [a,b]
 *
 * acting on quaternions by
 *
 *   z -> a z conjugate(b)
 *
 * with a,b in the binary tetrahedral group 2T.
 *
 * The simultaneous sign reversal
 *
 *   (a,b) ~ (-a,-b)
 *
 * produces the same transformation.
 *
 * Therefore:
 *
 *   G288 = (2T_L x 2T_R) / { (1,1), (-1,-1) }.
 *
 * All authoritative equality, composition, inversion, reduction,
 * lookup, and order calculations are exact.
 */

import {
  ONE,
  equals,
  negate,
  serialize,
} from "./quaternion.mjs";

import {
  HURWITZ_UNITS,
  inverseHurwitz,
  multiplyHurwitz,
} from "./hurwitzUnits.mjs";


function pairKeyFromQuaternions(a, b) {
  return `${serialize(a)}|${serialize(b)}`;
}


function compareKeys(left, right) {
  if (left < right) {
    return -1;
  }

  if (left > right) {
    return 1;
  }

  return 0;
}


/*
 * Deterministically choose one representative from
 *
 *   (a,b)
 *
 * and
 *
 *   (-a,-b).
 *
 * Lexicographic ordering of the exact serialized coordinates
 * is used only to choose a canonical representative.
 *
 * It does NOT determine mathematical equality; equality is
 * already exactly known from the projective sign relation.
 */
export function canonicalProjectivePair(a, b) {
  const positiveKey =
    pairKeyFromQuaternions(
      a,
      b
    );

  const negativeA =
    negate(a);

  const negativeB =
    negate(b);

  const negativeKey =
    pairKeyFromQuaternions(
      negativeA,
      negativeB
    );

  if (
    compareKeys(
      positiveKey,
      negativeKey
    ) <= 0
  ) {
    return Object.freeze({
      a,
      b,
      key: positiveKey,
    });
  }

  return Object.freeze({
    a: negativeA,
    b: negativeB,
    key: negativeKey,
  });
}


export function projectivePairKey(a, b) {
  return canonicalProjectivePair(
    a,
    b
  ).key;
}


export function projectiveEquals(
  left,
  right
) {
  return left.key === right.key;
}


export function makeProjectiveElement(
  a,
  b
) {
  return canonicalProjectivePair(
    a,
    b
  );
}


function generateRawPairs() {
  const result = [];

  for (
    const a of HURWITZ_UNITS
  ) {
    for (
      const b of HURWITZ_UNITS
    ) {
      result.push(
        Object.freeze({
          a,
          b,
        })
      );
    }
  }

  return result;
}


export const RAW_2T_PAIRS =
  Object.freeze(
    generateRawPairs()
  );


function generateProjectiveElements() {
  const byKey =
    new Map();

  for (
    const pair of RAW_2T_PAIRS
  ) {
    const canonical =
      canonicalProjectivePair(
        pair.a,
        pair.b
      );

    if (
      !byKey.has(
        canonical.key
      )
    ) {
      byKey.set(
        canonical.key,
        canonical
      );
    }
  }

  return [
    ...byKey.values(),
  ];
}


export const G288 =
  Object.freeze(
    generateProjectiveElements()
  );


const G288_BY_KEY =
  new Map(
    G288.map(
      (element) => [
        element.key,
        element,
      ]
    )
  );


export const G288_IDENTITY =
  (() => {
    const key =
      projectivePairKey(
        ONE,
        ONE
      );

    const identity =
      G288_BY_KEY.get(key);

    if (!identity) {
      throw new Error(
        "G288 construction failed: identity element is missing."
      );
    }

    return identity;
  })();


export function getG288ByKey(key) {
  return (
    G288_BY_KEY.get(key) ??
    null
  );
}


export function isG288Element(
  element
) {
  return (
    element != null &&
    G288_BY_KEY.has(
      element.key
    )
  );
}


/*
 * Composition:
 *
 * T_(a,b)(z) = a z conjugate(b)
 * T_(c,d)(z) = c z conjugate(d)
 *
 * Then:
 *
 * T_(a,b) o T_(c,d)(z)
 *
 *   = a (c z conjugate(d)) conjugate(b)
 *
 *   = (ac) z conjugate(d) conjugate(b)
 *
 *   = (ac) z conjugate(bd).
 *
 * Hence:
 *
 *   [a,b] [c,d] = [ac,bd].
 */
export function composeG288(
  left,
  right
) {
  const a =
    multiplyHurwitz(
      left.a,
      right.a
    );

  const b =
    multiplyHurwitz(
      left.b,
      right.b
    );

  const canonical =
    canonicalProjectivePair(
      a,
      b
    );

  const stored =
    G288_BY_KEY.get(
      canonical.key
    );

  if (!stored) {
    throw new Error(
      "G288 closure failure during composition.\n" +
      `left=${left.key}\n` +
      `right=${right.key}\n` +
      `product=${canonical.key}`
    );
  }

  return stored;
}


export function inverseG288(
  element
) {
  const aInverse =
    inverseHurwitz(
      element.a
    );

  const bInverse =
    inverseHurwitz(
      element.b
    );

  const canonical =
    canonicalProjectivePair(
      aInverse,
      bInverse
    );

  const stored =
    G288_BY_KEY.get(
      canonical.key
    );

  if (!stored) {
    throw new Error(
      "G288 inverse failure.\n" +
      `element=${element.key}\n` +
      `inverse=${canonical.key}`
    );
  }

  return stored;
}


export function g288ElementOrder(
  element,
  maxSteps = 96
) {
  let current =
    G288_IDENTITY;

  for (
    let step = 1;
    step <= maxSteps;
    step += 1
  ) {
    current =
      composeG288(
        current,
        element
      );

    if (
      projectiveEquals(
        current,
        G288_IDENTITY
      )
    ) {
      return step;
    }
  }

  throw new Error(
    `Failed to determine G288 element order within ${maxSteps} steps:\n` +
    element.key
  );
}


export function g288OrderDistribution() {
  const counts =
    new Map();

  for (
    const element of G288
  ) {
    const order =
      g288ElementOrder(
        element
      );

    counts.set(
      order,
      (
        counts.get(order) ??
        0
      ) + 1
    );
  }

  return new Map(
    [
      ...counts.entries(),
    ].sort(
      ([left], [right]) =>
        left - right
    )
  );
}


export function validateG288() {
  if (
    RAW_2T_PAIRS.length !==
    576
  ) {
    throw new Error(
      `Expected 576 raw pairs; found ${RAW_2T_PAIRS.length}.`
    );
  }

  if (
    G288.length !==
    288
  ) {
    throw new Error(
      `Expected 288 projective elements; found ${G288.length}.`
    );
  }

  const uniqueKeys =
    new Set(
      G288.map(
        (element) =>
          element.key
      )
    );

  if (
    uniqueKeys.size !==
    288
  ) {
    throw new Error(
      `Expected 288 unique canonical keys; found ${uniqueKeys.size}.`
    );
  }

  /*
   * Verify every raw pair and its simultaneous negative reduce
   * to exactly the same projective element.
   */
  for (
    const pair of RAW_2T_PAIRS
  ) {
    const originalKey =
      projectivePairKey(
        pair.a,
        pair.b
      );

    const negativeKey =
      projectivePairKey(
        negate(pair.a),
        negate(pair.b)
      );

    if (
      originalKey !==
      negativeKey
    ) {
      throw new Error(
        "Projective sign reduction failure."
      );
    }
  }

  /*
   * Full 288 x 288 closure test.
   *
   * 82,944 exact compositions is small enough that we should
   * simply prove closure exhaustively here.
   */
  for (
    const left of G288
  ) {
    for (
      const right of G288
    ) {
      const product =
        composeG288(
          left,
          right
        );

      if (
        !isG288Element(
          product
        )
      ) {
        throw new Error(
          "G288 closure verification failed."
        );
      }
    }
  }

  /*
   * Exact inverse and identity tests.
   */
  for (
    const element of G288
  ) {
    const inverse =
      inverseG288(
        element
      );

    const leftProduct =
      composeG288(
        inverse,
        element
      );

    const rightProduct =
      composeG288(
        element,
        inverse
      );

    if (
      !projectiveEquals(
        leftProduct,
        G288_IDENTITY
      ) ||
      !projectiveEquals(
        rightProduct,
        G288_IDENTITY
      )
    ) {
      throw new Error(
        "G288 inverse verification failed:\n" +
        element.key
      );
    }
  }

  return Object.freeze({
    rawPairCount:
      RAW_2T_PAIRS.length,

    projectiveElementCount:
      G288.length,

    uniqueKeyCount:
      uniqueKeys.size,

    orderDistribution:
      Object.fromEntries(
        g288OrderDistribution()
      ),
  });
}
