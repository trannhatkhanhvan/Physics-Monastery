/*
 * Exact quotient structure:
 *
 *   G_288 / K_32.
 *
 * We construct the quotient from exact left cosets of K_32
 * inside G_288, derive its multiplication table, and then
 * identify its structure.
 */

import {
  ONE,
} from "./quaternion.mjs";

import {
  H,
} from "./hurwitzUnits.mjs";

import {
  G288,
  G288_IDENTITY,
  composeG288,
  makeProjectiveElement,
  projectiveEquals,
} from "./group288.mjs";

import {
  K32,
  isK32Element,
} from "./subgroups.mjs";


function sortedKeys(elements) {
  return elements
    .map(
      (element) =>
        element.key
    )
    .sort();
}


function cosetKey(elements) {
  return sortedKeys(
    elements
  ).join("||");
}


function makeLeftCoset(
  representative
) {
  const elements =
    K32.map(
      (k) =>
        composeG288(
          representative,
          k
        )
    );

  const byKey =
    new Map(
      elements.map(
        (element) => [
          element.key,
          element,
        ]
      )
    );

  if (
    byKey.size !== 32
  ) {
    throw new Error(
      "Left coset does not contain exactly 32 distinct elements."
    );
  }

  return Object.freeze({
    representative,
    elements:
      Object.freeze(
        [...byKey.values()]
      ),
    key:
      cosetKey(
        [...byKey.values()]
      ),
  });
}


function generateCosets() {
  const byKey =
    new Map();

  for (
    const element of G288
  ) {
    const coset =
      makeLeftCoset(
        element
      );

    if (
      !byKey.has(
        coset.key
      )
    ) {
      byKey.set(
        coset.key,
        coset
      );
    }
  }

  return [
    ...byKey.values(),
  ];
}


export const G288_OVER_K32_COSETS =
  Object.freeze(
    generateCosets()
  );


const COSET_BY_ELEMENT_KEY =
  new Map();

for (
  const coset of
    G288_OVER_K32_COSETS
) {
  for (
    const element of
      coset.elements
  ) {
    if (
      COSET_BY_ELEMENT_KEY.has(
        element.key
      )
    ) {
      throw new Error(
        "Cosets overlap: an element belongs to more than one quotient coset."
      );
    }

    COSET_BY_ELEMENT_KEY.set(
      element.key,
      coset
    );
  }
}


export function cosetContaining(
  element
) {
  return (
    COSET_BY_ELEMENT_KEY.get(
      element.key
    ) ??
    null
  );
}


export const QUOTIENT_IDENTITY_COSET =
  cosetContaining(
    G288_IDENTITY
  );


if (
  !QUOTIENT_IDENTITY_COSET
) {
  throw new Error(
    "Quotient identity coset is missing."
  );
}


export function quotientMultiply(
  leftCoset,
  rightCoset
) {
  const productRepresentative =
    composeG288(
      leftCoset.representative,
      rightCoset.representative
    );

  const result =
    cosetContaining(
      productRepresentative
    );

  if (!result) {
    throw new Error(
      "Quotient multiplication failed to locate product coset."
    );
  }

  return result;
}


export function quotientEquals(
  left,
  right
) {
  return left.key === right.key;
}


export function quotientPower(
  coset,
  exponent
) {
  if (
    !Number.isSafeInteger(exponent) ||
    exponent < 0
  ) {
    throw new RangeError(
      "Quotient exponent must be a nonnegative safe integer."
    );
  }

  let result =
    QUOTIENT_IDENTITY_COSET;

  for (
    let step = 0;
    step < exponent;
    step += 1
  ) {
    result =
      quotientMultiply(
        result,
        coset
      );
  }

  return result;
}


export function quotientElementOrder(
  coset,
  maxSteps = 12
) {
  let current =
    QUOTIENT_IDENTITY_COSET;

  for (
    let step = 1;
    step <= maxSteps;
    step += 1
  ) {
    current =
      quotientMultiply(
        current,
        coset
      );

    if (
      quotientEquals(
        current,
        QUOTIENT_IDENTITY_COSET
      )
    ) {
      return step;
    }
  }

  throw new Error(
    "Failed to determine quotient element order."
  );
}


/*
 * Natural left/right triality generators.
 *
 * h^3 = -1 in 2T, and -1 lies inside Q8.
 * Therefore the quotient classes of [h,1] and [1,h]
 * should each have order 3.
 */
export const QUOTIENT_LEFT_GENERATOR_ELEMENT =
  makeProjectiveElement(
    H,
    ONE
  );


export const QUOTIENT_RIGHT_GENERATOR_ELEMENT =
  makeProjectiveElement(
    ONE,
    H
  );


export const QUOTIENT_LEFT_GENERATOR =
  cosetContaining(
    QUOTIENT_LEFT_GENERATOR_ELEMENT
  );


export const QUOTIENT_RIGHT_GENERATOR =
  cosetContaining(
    QUOTIENT_RIGHT_GENERATOR_ELEMENT
  );


if (
  !QUOTIENT_LEFT_GENERATOR ||
  !QUOTIENT_RIGHT_GENERATOR
) {
  throw new Error(
    "Failed to locate quotient generator cosets."
  );
}


/*
 * Build the candidate Z3 x Z3 coordinate system:
 *
 *   (a,b) -> L^a R^b
 *
 * for a,b in {0,1,2}.
 */
function generateCoordinateRecords() {
  const records = [];

  for (
    let a = 0;
    a < 3;
    a += 1
  ) {
    for (
      let b = 0;
      b < 3;
      b += 1
    ) {
      const leftPower =
        quotientPower(
          QUOTIENT_LEFT_GENERATOR,
          a
        );

      const rightPower =
        quotientPower(
          QUOTIENT_RIGHT_GENERATOR,
          b
        );

      const coset =
        quotientMultiply(
          leftPower,
          rightPower
        );

      records.push(
        Object.freeze({
          a,
          b,
          coset,
        })
      );
    }
  }

  return records;
}


export const QUOTIENT_COORDINATE_RECORDS =
  Object.freeze(
    generateCoordinateRecords()
  );


const COORDINATE_BY_COSET_KEY =
  new Map(
    QUOTIENT_COORDINATE_RECORDS.map(
      (record) => [
        record.coset.key,
        Object.freeze({
          a: record.a,
          b: record.b,
        }),
      ]
    )
  );


export function quotientCoordinates(
  coset
) {
  return (
    COORDINATE_BY_COSET_KEY.get(
      coset.key
    ) ??
    null
  );
}


export function quotientMultiplicationTable() {
  return G288_OVER_K32_COSETS.map(
    (leftCoset) =>
      G288_OVER_K32_COSETS.map(
        (rightCoset) =>
          quotientMultiply(
            leftCoset,
            rightCoset
          )
      )
  );
}


export function validateQuotientC3xC3() {
  if (
    G288_OVER_K32_COSETS.length !== 9
  ) {
    throw new Error(
      `Expected 9 quotient cosets; found ${G288_OVER_K32_COSETS.length}.`
    );
  }

  for (
    const coset of
      G288_OVER_K32_COSETS
  ) {
    if (
      coset.elements.length !== 32
    ) {
      throw new Error(
        "Every quotient coset must contain exactly 32 elements."
      );
    }
  }

  if (
    COSET_BY_ELEMENT_KEY.size !== 288
  ) {
    throw new Error(
      `Coset partition must cover all 288 elements exactly once; found ${COSET_BY_ELEMENT_KEY.size}.`
    );
  }

  if (
    !QUOTIENT_IDENTITY_COSET.elements.every(
      isK32Element
    )
  ) {
    throw new Error(
      "Identity quotient coset is not exactly K32."
    );
  }

  /*
   * Quotient multiplication must be independent of the chosen
   * representatives.
   *
   * Check every coset pair and every combination of one alternate
   * representative from each coset.
   */
  for (
    const leftCoset of
      G288_OVER_K32_COSETS
  ) {
    for (
      const rightCoset of
        G288_OVER_K32_COSETS
    ) {
      const expected =
        quotientMultiply(
          leftCoset,
          rightCoset
        );

      for (
        const leftRepresentative of
          leftCoset.elements
      ) {
        const rightRepresentative =
          rightCoset.elements[0];

        const product =
          composeG288(
            leftRepresentative,
            rightRepresentative
          );

        const actual =
          cosetContaining(
            product
          );

        if (
          !actual ||
          !quotientEquals(
            actual,
            expected
          )
        ) {
          throw new Error(
            "Quotient multiplication depends on representative choice."
          );
        }
      }
    }
  }

  /*
   * Compute quotient orders.
   */
  const orderCounts =
    new Map();

  for (
    const coset of
      G288_OVER_K32_COSETS
  ) {
    const order =
      quotientElementOrder(
        coset
      );

    orderCounts.set(
      order,
      (
        orderCounts.get(order) ??
        0
      ) + 1
    );
  }

  /*
   * For C3 x C3 we expect:
   *
   *   one identity,
   *   eight nonidentity elements of order 3.
   */
  if (
    orderCounts.size !== 2 ||
    orderCounts.get(1) !== 1 ||
    orderCounts.get(3) !== 8
  ) {
    throw new Error(
      "Quotient order distribution is not that of C3 x C3."
    );
  }

  /*
   * Quotient must be abelian.
   */
  for (
    const left of
      G288_OVER_K32_COSETS
  ) {
    for (
      const right of
        G288_OVER_K32_COSETS
    ) {
      if (
        !quotientEquals(
          quotientMultiply(
            left,
            right
          ),
          quotientMultiply(
            right,
            left
          )
        )
      ) {
        throw new Error(
          "Quotient is not abelian."
        );
      }
    }
  }

  /*
   * Verify natural generators.
   */
  if (
    quotientElementOrder(
      QUOTIENT_LEFT_GENERATOR
    ) !== 3
  ) {
    throw new Error(
      "Left quotient generator does not have order 3."
    );
  }

  if (
    quotientElementOrder(
      QUOTIENT_RIGHT_GENERATOR
    ) !== 3
  ) {
    throw new Error(
      "Right quotient generator does not have order 3."
    );
  }

  if (
    quotientEquals(
      QUOTIENT_LEFT_GENERATOR,
      QUOTIENT_RIGHT_GENERATOR
    )
  ) {
    throw new Error(
      "Left and right quotient generators are not independent."
    );
  }

  /*
   * All nine coordinate pairs must produce nine distinct cosets.
   */
  const coordinateCosetKeys =
    new Set(
      QUOTIENT_COORDINATE_RECORDS.map(
        (record) =>
          record.coset.key
      )
    );

  if (
    coordinateCosetKeys.size !== 9
  ) {
    throw new Error(
      "The proposed Z3 x Z3 coordinates do not generate all nine quotient elements uniquely."
    );
  }

  /*
   * Verify coordinate addition law exactly:
   *
   *   (a,b) + (c,d)
   *   =
   *   (a+c mod 3, b+d mod 3).
   */
  for (
    const left of
      QUOTIENT_COORDINATE_RECORDS
  ) {
    for (
      const right of
        QUOTIENT_COORDINATE_RECORDS
    ) {
      const product =
        quotientMultiply(
          left.coset,
          right.coset
        );

      const coordinates =
        quotientCoordinates(
          product
        );

      if (!coordinates) {
        throw new Error(
          "Product coset has no Z3 x Z3 coordinates."
        );
      }

      const expectedA =
        (
          left.a +
          right.a
        ) % 3;

      const expectedB =
        (
          left.b +
          right.b
        ) % 3;

      if (
        coordinates.a !== expectedA ||
        coordinates.b !== expectedB
      ) {
        throw new Error(
          "Quotient coordinate addition law failed."
        );
      }
    }
  }

  return Object.freeze({
    cosetCount:
      G288_OVER_K32_COSETS.length,

    cosetSize: 32,

    coveredElementCount:
      COSET_BY_ELEMENT_KEY.size,

    orderDistribution:
      Object.freeze(
        Object.fromEntries(
          orderCounts
        )
      ),

    leftGeneratorOrder:
      quotientElementOrder(
        QUOTIENT_LEFT_GENERATOR
      ),

    rightGeneratorOrder:
      quotientElementOrder(
        QUOTIENT_RIGHT_GENERATOR
      ),

    coordinateCount:
      coordinateCosetKeys.size,
  });
}
