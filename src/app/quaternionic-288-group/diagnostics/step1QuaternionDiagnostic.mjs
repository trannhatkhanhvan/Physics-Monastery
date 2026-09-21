import {
  I,
  J,
  K,
  NEG_ONE,
  ONE,
  add,
  conjugate,
  deserialize,
  equals,
  inverseUnit,
  isHurwitzCoordinateTuple,
  isUnit,
  multiply,
  negate,
  normSquared,
  quaternion,
  serialize,
} from "../math/quaternion.mjs";

function assert(condition, message) {
  if (!condition) {
    throw new Error(`DIAGNOSTIC FAILED: ${message}`);
  }
}

function assertQuaternionEqual(actual, expected, message) {
  assert(
    equals(actual, expected),
    `${message}\n` +
      `  actual:   ${serialize(actual)}\n` +
      `  expected: ${serialize(expected)}`
  );
}

console.log("Quaternionic 288-Group — Step 1 diagnostic");
console.log("");

/*
 * Representation.
 */
assertQuaternionEqual(
  quaternion(2, 0, 0, 0),
  ONE,
  "1 must be represented by (2,0,0,0)."
);

assertQuaternionEqual(
  quaternion(0, 2, 0, 0),
  I,
  "i must be represented by (0,2,0,0)."
);

assert(
  isHurwitzCoordinateTuple(1, -1, 1, -1),
  "All-odd doubled coordinates must be valid Hurwitz coordinates."
);

assert(
  isHurwitzCoordinateTuple(2, 0, -4, 6),
  "All-even doubled coordinates must be valid Hurwitz coordinates."
);

assert(
  !isHurwitzCoordinateTuple(1, 0, 1, 0),
  "Mixed-parity coordinates must not be accepted."
);

/*
 * Hamilton multiplication table.
 */
assertQuaternionEqual(
  multiply(I, I),
  NEG_ONE,
  "i^2 = -1"
);

assertQuaternionEqual(
  multiply(J, J),
  NEG_ONE,
  "j^2 = -1"
);

assertQuaternionEqual(
  multiply(K, K),
  NEG_ONE,
  "k^2 = -1"
);

assertQuaternionEqual(
  multiply(I, J),
  K,
  "ij = k"
);

assertQuaternionEqual(
  multiply(J, K),
  I,
  "jk = i"
);

assertQuaternionEqual(
  multiply(K, I),
  J,
  "ki = j"
);

assertQuaternionEqual(
  multiply(J, I),
  negate(K),
  "ji = -k"
);

assertQuaternionEqual(
  multiply(K, J),
  negate(I),
  "kj = -i"
);

assertQuaternionEqual(
  multiply(I, K),
  negate(J),
  "ik = -j"
);

/*
 * Identity and additive behavior.
 */
const h = quaternion(1, -1, -1, -1);

assertQuaternionEqual(
  multiply(ONE, h),
  h,
  "1h = h"
);

assertQuaternionEqual(
  multiply(h, ONE),
  h,
  "h1 = h"
);

assertQuaternionEqual(
  add(h, negate(h)),
  quaternion(0, 0, 0, 0),
  "q + (-q) = 0"
);

/*
 * Conjugation and exact norm.
 */
const hNorm = normSquared(h);

assert(
  hNorm.numerator === 4 &&
    hNorm.denominator === 4,
  "h must have exact squared norm 4/4 = 1."
);

assert(
  isUnit(h),
  "h must be recognized as an exact unit quaternion."
);

assertQuaternionEqual(
  multiply(h, conjugate(h)),
  ONE,
  "h conjugate(h) = 1"
);

assertQuaternionEqual(
  multiply(conjugate(h), h),
  ONE,
  "conjugate(h) h = 1"
);

assertQuaternionEqual(
  inverseUnit(h),
  conjugate(h),
  "Unit inverse must equal quaternion conjugate."
);

/*
 * Associativity on representative Hurwitz units.
 */
const leftAssociated =
  multiply(multiply(h, I), J);

const rightAssociated =
  multiply(h, multiply(I, J));

assertQuaternionEqual(
  leftAssociated,
  rightAssociated,
  "(h i) j = h (i j)"
);

/*
 * Serialization must be canonical and lossless.
 */
const serializedH = serialize(h);

assert(
  serializedH === "1,-1,-1,-1",
  "Canonical serialization of h is incorrect."
);

assertQuaternionEqual(
  deserialize(serializedH),
  h,
  "Serialization round trip must preserve exact coordinates."
);

/*
 * Explicitly confirm invalid lattice input fails.
 */
let rejectedMixedParity = false;

try {
  quaternion(1, 0, 1, 0);
} catch {
  rejectedMixedParity = true;
}

assert(
  rejectedMixedParity,
  "Mixed-parity coordinates must fail loudly."
);

console.log("PASS: exact doubled-coordinate representation");
console.log("PASS: Hurwitz parity validation");
console.log("PASS: Hamilton multiplication");
console.log("PASS: noncommutativity");
console.log("PASS: conjugation");
console.log("PASS: exact norm");
console.log("PASS: exact unit inversion");
console.log("PASS: representative associativity");
console.log("PASS: canonical serialization");
console.log("");
console.log("STEP 1 PASSED");
