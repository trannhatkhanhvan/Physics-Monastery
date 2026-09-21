/*
 * Exact subgroup structure of G_288.
 *
 * Step 6:
 *
 *   K_32 = (Q8 x Q8) / { (1,1), (-1,-1) }.
 *
 * K_32 is constructed directly from Q8 x Q8.
 * Its internal classification is derived only afterward.
 */

import {
  I,
  J,
  K,
  NEG_ONE,
  ONE,
  negate,
} from "./quaternion.mjs";

import {
  Q8,
} from "./hurwitzUnits.mjs";

import {
  G288,
  G288_IDENTITY,
  composeG288,
  inverseG288,
  makeProjectiveElement,
  projectiveEquals,
} from "./group288.mjs";

import {
  CENTRAL_MINUS_IDENTITY,
  G288_SPECTRAL_RECORDS,
} from "./spectralClassification.mjs";


function generateK32() {
  const byKey =
    new Map();

  for (
    const a of Q8
  ) {
    for (
      const b of Q8
    ) {
      const element =
        makeProjectiveElement(
          a,
          b
        );

      if (
        !byKey.has(
          element.key
        )
      ) {
        byKey.set(
          element.key,
          element
        );
      }
    }
  }

  return [
    ...byKey.values(),
  ];
}


export const K32 =
  Object.freeze(
    generateK32()
  );


const K32_BY_KEY =
  new Map(
    K32.map(
      (element) => [
        element.key,
        element,
      ]
    )
  );


const SPECTRAL_BY_KEY =
  new Map(
    G288_SPECTRAL_RECORDS.map(
      (record) => [
        record.element.key,
        record,
      ]
    )
  );


export function isK32Element(
  element
) {
  return (
    element != null &&
    K32_BY_KEY.has(
      element.key
    )
  );
}


export function getK32ByKey(
  key
) {
  return (
    K32_BY_KEY.get(key) ??
    null
  );
}


export function conjugateG288Element(
  conjugator,
  element
) {
  return composeG288(
    composeG288(
      conjugator,
      element
    ),
    inverseG288(
      conjugator
    )
  );
}


export function isCentralInG288(
  element
) {
  for (
    const other of G288
  ) {
    const left =
      composeG288(
        element,
        other
      );

    const right =
      composeG288(
        other,
        element
      );

    if (
      !projectiveEquals(
        left,
        right
      )
    ) {
      return false;
    }
  }

  return true;
}


export function isCentralInK32(
  element
) {
  for (
    const other of K32
  ) {
    const left =
      composeG288(
        element,
        other
      );

    const right =
      composeG288(
        other,
        element
      );

    if (
      !projectiveEquals(
        left,
        right
      )
    ) {
      return false;
    }
  }

  return true;
}


export function spectralRecordForK32(
  element
) {
  const record =
    SPECTRAL_BY_KEY.get(
      element.key
    );

  if (!record) {
    throw new Error(
      "Missing spectral record for K32 element:\n" +
      element.key
    );
  }

  return record;
}


export const K32_CENTRAL_ELEMENTS =
  Object.freeze(
    K32.filter(
      (element) =>
        isCentralInK32(
          element
        )
    )
  );


export const K32_NONCENTRAL_INVOLUTIONS =
  Object.freeze(
    K32.filter(
      (element) => {
        const record =
          spectralRecordForK32(
            element
          );

        return (
          record.order === 2 &&
          !isCentralInK32(
            element
          )
        );
      }
    )
  );


export const K32_COMPLEX_STRUCTURES =
  Object.freeze(
    K32.filter(
      (element) => {
        const record =
          spectralRecordForK32(
            element
          );

        return (
          record.order === 4 &&
          projectiveEquals(
            composeG288(
              element,
              element
            ),
            CENTRAL_MINUS_IDENTITY
          )
        );
      }
    )
  );


export function centralOpposite(
  element
) {
  return composeG288(
    CENTRAL_MINUS_IDENTITY,
    element
  );
}


/*
 * Pair the twelve J^2 = -I elements under
 *
 *   J -> (-I)J = -J.
 */
function generateComplexStructurePairs() {
  const visited =
    new Set();

  const pairs = [];

  for (
    const element of
      K32_COMPLEX_STRUCTURES
  ) {
    if (
      visited.has(
        element.key
      )
    ) {
      continue;
    }

    const opposite =
      centralOpposite(
        element
      );

    if (
      !K32_COMPLEX_STRUCTURES.some(
        (candidate) =>
          projectiveEquals(
            candidate,
            opposite
          )
      )
    ) {
      throw new Error(
        "Complex-structure opposite is missing from K32."
      );
    }

    visited.add(
      element.key
    );

    visited.add(
      opposite.key
    );

    pairs.push(
      Object.freeze([
        element,
        opposite,
      ])
    );
  }

  return pairs;
}


export const K32_COMPLEX_STRUCTURE_PAIRS =
  Object.freeze(
    generateComplexStructurePairs()
  );


/*
 * Named six directions.
 *
 * Left:
 *
 *   L_i(z) = i z
 *   L_j(z) = j z
 *   L_k(z) = k z
 *
 * Right:
 *
 *   R_i(z) = z i
 *   R_j(z) = z j
 *   R_k(z) = z k
 *
 * Our action convention is
 *
 *   [a,b](z) = a z conjugate(b),
 *
 * hence right multiplication by i is [1,-i], etc.
 */
export const NAMED_COMPLEX_DIRECTIONS =
  Object.freeze([
    Object.freeze({
      label: "L_i",
      representative:
        makeProjectiveElement(
          I,
          ONE
        ),
    }),

    Object.freeze({
      label: "L_j",
      representative:
        makeProjectiveElement(
          J,
          ONE
        ),
    }),

    Object.freeze({
      label: "L_k",
      representative:
        makeProjectiveElement(
          K,
          ONE
        ),
    }),

    Object.freeze({
      label: "R_i",
      representative:
        makeProjectiveElement(
          ONE,
          negate(I)
        ),
    }),

    Object.freeze({
      label: "R_j",
      representative:
        makeProjectiveElement(
          ONE,
          negate(J)
        ),
    }),

    Object.freeze({
      label: "R_k",
      representative:
        makeProjectiveElement(
          ONE,
          negate(K)
        ),
    }),
  ]);


export function complexStructurePairContaining(
  element
) {
  return (
    K32_COMPLEX_STRUCTURE_PAIRS.find(
      (pair) =>
        pair.some(
          (candidate) =>
            projectiveEquals(
              candidate,
              element
            )
        )
    ) ??
    null
  );
}


export function validateK32() {
  if (
    K32.length !== 32
  ) {
    throw new Error(
      `Expected |K32| = 32; found ${K32.length}.`
    );
  }

  if (
    new Set(
      K32.map(
        (element) =>
          element.key
      )
    ).size !== 32
  ) {
    throw new Error(
      "K32 does not contain 32 distinct elements."
    );
  }

  /*
   * Exhaustive closure.
   */
  for (
    const left of K32
  ) {
    for (
      const right of K32
    ) {
      const product =
        composeG288(
          left,
          right
        );

      if (
        !isK32Element(
          product
        )
      ) {
        throw new Error(
          "K32 closure failure."
        );
      }
    }
  }

  /*
   * Exact inverses.
   */
  for (
    const element of K32
  ) {
    const inverse =
      inverseG288(
        element
      );

    if (
      !isK32Element(
        inverse
      )
    ) {
      throw new Error(
        "K32 inverse failure."
      );
    }
  }

  /*
   * Exhaustive normality:
   *
   *   g k g^-1 in K32
   *
   * for all 288 * 32 choices.
   */
  for (
    const g of G288
  ) {
    for (
      const k of K32
    ) {
      const conjugated =
        conjugateG288Element(
          g,
          k
        );

      if (
        !isK32Element(
          conjugated
        )
      ) {
        throw new Error(
          "K32 normality failure:\n" +
          `g=${g.key}\n` +
          `k=${k.key}`
        );
      }
    }
  }

  const centerInG288 =
    G288.filter(
      (element) =>
        isCentralInG288(
          element
        )
    );

  const centerInK32 =
    K32_CENTRAL_ELEMENTS;

  if (
    centerInK32.length !== 2
  ) {
    throw new Error(
      `Expected |Z(K32)| = 2; found ${centerInK32.length}.`
    );
  }

  if (
    K32_NONCENTRAL_INVOLUTIONS.length !==
    18
  ) {
    throw new Error(
      "Expected exactly 18 noncentral involutions in K32; " +
      `found ${K32_NONCENTRAL_INVOLUTIONS.length}.`
    );
  }

  if (
    K32_COMPLEX_STRUCTURES.length !==
    12
  ) {
    throw new Error(
      "Expected exactly 12 J^2 = -I elements in K32; " +
      `found ${K32_COMPLEX_STRUCTURES.length}.`
    );
  }

  if (
    K32_COMPLEX_STRUCTURE_PAIRS.length !==
    6
  ) {
    throw new Error(
      "Expected exactly six opposite complex-structure pairs; " +
      `found ${K32_COMPLEX_STRUCTURE_PAIRS.length}.`
    );
  }

  /*
   * Verify the named L_i,L_j,L_k,R_i,R_j,R_k representatives
   * occupy six different opposite pairs and exhaust all six.
   */
  const namedPairIndexes =
    NAMED_COMPLEX_DIRECTIONS.map(
      ({ representative }) => {
        const index =
          K32_COMPLEX_STRUCTURE_PAIRS.findIndex(
            (pair) =>
              pair.some(
                (candidate) =>
                  projectiveEquals(
                    candidate,
                    representative
                  )
              )
          );

        if (
          index < 0
        ) {
          throw new Error(
            "Named complex direction is not among the twelve J^2=-I elements:\n" +
            representative.key
          );
        }

        return index;
      }
    );

  if (
    new Set(
      namedPairIndexes
    ).size !== 6
  ) {
    throw new Error(
      "The six named L/R directions do not occupy six distinct opposite pairs."
    );
  }

  /*
   * Confirm the two central elements are exactly I and -I.
   */
  const expectedCenterKeys =
    new Set([
      G288_IDENTITY.key,
      CENTRAL_MINUS_IDENTITY.key,
    ]);

  const actualCenterKeys =
    new Set(
      centerInK32.map(
        (element) =>
          element.key
      )
    );

  if (
    expectedCenterKeys.size !==
      actualCenterKeys.size ||
    [
      ...expectedCenterKeys,
    ].some(
      (key) =>
        !actualCenterKeys.has(
          key
        )
    )
  ) {
    throw new Error(
      "Z(K32) is not exactly {I,-I}."
    );
  }

  return Object.freeze({
    count:
      K32.length,

    centerInK32Count:
      centerInK32.length,

    centerInG288Count:
      centerInG288.length,

    noncentralInvolutionCount:
      K32_NONCENTRAL_INVOLUTIONS.length,

    complexStructureCount:
      K32_COMPLEX_STRUCTURES.length,

    complexDirectionCount:
      K32_COMPLEX_STRUCTURE_PAIRS.length,

    namedDirectionPairIndexes:
      Object.freeze(
        [...namedPairIndexes]
      ),
  });
}
