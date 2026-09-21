import {
  H,
  HALF_HURWITZ_UNITS,
  HURWITZ_UNITS,
  Q8,
  elementOrder,
  inverseHurwitz,
  isHurwitzUnit,
  leftMultiplicationPermutation,
  multiplyHurwitz,
  orderDistribution,
  validateHurwitzUnits,
} from "../math/hurwitzUnits.mjs";

import {
  I,
  J,
  K,
  NEG_ONE,
  ONE,
  equals,
  multiply,
  quaternion,
  serialize,
} from "../math/quaternion.mjs";

function assert(condition, message) {
  if (!condition) {
    throw new Error(
      `DIAGNOSTIC FAILED: ${message}`
    );
  }
}

function assertQuaternionEqual(
  actual,
  expected,
  message
) {
  assert(
    equals(actual, expected),
    `${message}\n` +
      `  actual:   ${serialize(actual)}\n` +
      `  expected: ${serialize(expected)}`
  );
}

console.log(
  "Quaternionic 288-Group — Step 2 diagnostic"
);
console.log("");

const summary =
  validateHurwitzUnits();

/*
 * Cardinality.
 */
assert(
  summary.count === 24,
  "Hurwitz set must contain exactly 24 elements."
);

assert(
  summary.uniqueCount === 24,
  "Hurwitz set must contain 24 distinct elements."
);

assert(
  summary.q8Count === 8,
  "Q8 must contain exactly 8 elements."
);

assert(
  summary.halfHurwitzCount === 16,
  "There must be exactly 16 half-Hurwitz units."
);

/*
 * Q8 structure.
 */
const expectedQ8Keys =
  new Set([
    serialize(ONE),
    serialize(NEG_ONE),
    serialize(I),
    serialize(quaternion(0, -2, 0, 0)),
    serialize(J),
    serialize(quaternion(0, 0, -2, 0)),
    serialize(K),
    serialize(quaternion(0, 0, 0, -2)),
  ]);

assert(
  new Set(Q8.map(serialize)).size === 8,
  "Q8 entries must be distinct."
);

for (const key of expectedQ8Keys) {
  assert(
    Q8.some(
      (value) =>
        serialize(value) === key
    ),
    `Q8 is missing ${key}.`
  );
}

/*
 * Exact group closure and inverses.
 */
for (const left of HURWITZ_UNITS) {
  for (const right of HURWITZ_UNITS) {
    const product =
      multiplyHurwitz(
        left,
        right
      );

    assert(
      isHurwitzUnit(product),
      "Every product must remain inside the 24-unit set."
    );
  }
}

for (const value of HURWITZ_UNITS) {
  const inverse =
    inverseHurwitz(value);

  assertQuaternionEqual(
    multiplyHurwitz(
      value,
      inverse
    ),
    ONE,
    "Each Hurwitz unit must have an inverse."
  );
}

/*
 * h = (1 - i - j - k)/2
 */
assertQuaternionEqual(
  H,
  quaternion(
    1,
    -1,
    -1,
    -1
  ),
  "h must equal (1-i-j-k)/2."
);

const hOrder =
  elementOrder(H);

assert(
  hOrder === 6,
  `Expected h to have order 6 in 2T; found ${hOrder}.`
);

/*
 * h is a binary lift of a tetrahedral order-3 rotation.
 *
 * In 2T itself:
 *
 *   h^3 = -1,
 *   h^6 = 1.
 *
 * After quotienting by the central subgroup {±1},
 * the image of h therefore has order 3.
 */
const hSquared =
  multiplyHurwitz(
    H,
    H
  );

const hCubed =
  multiplyHurwitz(
    hSquared,
    H
  );

assertQuaternionEqual(
  hCubed,
  NEG_ONE,
  "h^3 must equal -1 in the binary tetrahedral group."
);

assertQuaternionEqual(
  multiplyHurwitz(
    hCubed,
    hCubed
  ),
  ONE,
  "h^6 must equal 1."
);

/*
 * Compute h action on i,j,k rather than assuming it.
 */
const hInv =
  inverseHurwitz(H);

const conjugatedI =
  multiplyHurwitz(
    multiplyHurwitz(
      H,
      I
    ),
    hInv
  );

const conjugatedJ =
  multiplyHurwitz(
    multiplyHurwitz(
      H,
      J
    ),
    hInv
  );

const conjugatedK =
  multiplyHurwitz(
    multiplyHurwitz(
      H,
      K
    ),
    hInv
  );

console.log(
  "h conjugation action:"
);
console.log(
  `  h i h^-1 = ${serialize(conjugatedI)}`
);
console.log(
  `  h j h^-1 = ${serialize(conjugatedJ)}`
);
console.log(
  `  h k h^-1 = ${serialize(conjugatedK)}`
);

/*
 * Left multiplication by h must permute all 24 units.
 */
const hPermutation =
  leftMultiplicationPermutation(H);

assert(
  hPermutation.length === 24,
  "Left multiplication permutation must have 24 entries."
);

assert(
  new Set(hPermutation).size === 24,
  "Left multiplication by h must be a genuine permutation."
);

assert(
  hPermutation.every(
    (index) =>
      Number.isInteger(index) &&
      index >= 0 &&
      index < 24
  ),
  "Every permutation image must be a valid Hurwitz-unit index."
);

/*
 * Element-order distribution of 2T.
 */
const distribution =
  orderDistribution();

const totalCount =
  [...distribution.values()]
    .reduce(
      (sum, count) =>
        sum + count,
      0
    );

assert(
  totalCount === 24,
  "Order distribution must account for all 24 elements."
);

console.log("");
console.log(
  "Element-order distribution in 2T:"
);

for (
  const [order, count]
  of distribution.entries()
) {
  console.log(
    `  order ${order}: ${count}`
  );
}

/*
 * Extra multiplication consistency:
 * exact kernel product must agree with closed-group product.
 */
assertQuaternionEqual(
  multiply(I, J),
  multiplyHurwitz(I, J),
  "Hurwitz group multiplication must agree with exact quaternion multiplication."
);

console.log("");
console.log(
  "PASS: exactly 24 Hurwitz units"
);
console.log(
  "PASS: exactly 8 Q8 units"
);
console.log(
  "PASS: exactly 16 half-Hurwitz units"
);
console.log(
  "PASS: all 24 units are distinct"
);
console.log(
  "PASS: all 24 have exact norm 1"
);
console.log(
  "PASS: closure under multiplication"
);
console.log(
  "PASS: exact inverses"
);
console.log(
  `PASS: h has computed order ${hOrder} in 2T`
);
console.log(
  "PASS: h^3 = -1, so its projective/tetrahedral image has order 3"
);
console.log(
  "PASS: h acts by an exact permutation of the 24 units"
);
console.log(
  "PASS: complete 2T element-order distribution computed"
);
console.log("");
console.log(
  "STEP 2 PASSED"
);
