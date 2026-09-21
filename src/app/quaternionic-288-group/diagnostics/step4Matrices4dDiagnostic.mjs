import {
  G288,
  G288_IDENTITY,
  composeG288,
  makeProjectiveElement,
  projectiveEquals,
} from "../math/group288.mjs";

import {
  H,
} from "../math/hurwitzUnits.mjs";

import {
  I,
  J,
  ONE,
} from "../math/quaternion.mjs";

import {
  G288_MATRIX_RECORDS,
  applyG288ToQuaternion,
  composeMatrix2,
  determinantIntegerMatrix,
  exactTrace,
  identityMatrix2,
  isOrthogonalMatrix2,
  matricesEqual,
  matrix2ForG288,
  matrixKey,
  validateG288Matrices,
} from "../math/matrices4d.mjs";


function assert(
  condition,
  message
) {
  if (!condition) {
    throw new Error(
      `DIAGNOSTIC FAILED: ${message}`
    );
  }
}


function assertMatrixEqual(
  actual,
  expected,
  message
) {
  assert(
    matricesEqual(
      actual,
      expected
    ),
    `${message}\n` +
      `actual=${matrixKey(actual)}\n` +
      `expected=${matrixKey(expected)}`
  );
}


console.log(
  "Quaternionic 288-Group — Step 4 diagnostic"
);
console.log("");


/*
 * Identity must give 2I.
 */
const identityMatrix =
  matrix2ForG288(
    G288_IDENTITY
  );

assertMatrixEqual(
  identityMatrix,
  identityMatrix2(),
  "Identity transformation must have matrix 2I in doubled representation."
);


/*
 * Check a geometrically transparent example:
 *
 * left multiplication by i:
 *
 *   (w,x,y,z) -> (-x,w,-z,y).
 *
 * Therefore
 *
 * M =
 *
 *   [ 0 -1  0  0 ]
 *   [ 1  0  0  0 ]
 *   [ 0  0  0 -1 ]
 *   [ 0  0  1  0 ]
 *
 * and 2M has entries ±2.
 */
const leftI =
  makeProjectiveElement(
    I,
    ONE
  );

const leftIMatrix =
  matrix2ForG288(
    leftI
  );

assertMatrixEqual(
  leftIMatrix,
  [
    [0, -2, 0, 0],
    [2, 0, 0, 0],
    [0, 0, 0, -2],
    [0, 0, 2, 0],
  ],
  "Left multiplication by i has the wrong exact 4D matrix."
);


/*
 * Right factor convention:
 *
 * [1,i] acts as
 *
 *   z -> z conjugate(i) = z(-i).
 *
 * This is deliberately checked so the matrix layer cannot silently
 * drift to a different right-action convention.
 */
const rightI =
  makeProjectiveElement(
    ONE,
    I
  );

const imageOfOne =
  applyG288ToQuaternion(
    rightI,
    ONE
  );

assert(
  imageOfOne.A === 0 &&
  imageOfOne.B === -2 &&
  imageOfOne.C === 0 &&
  imageOfOne.D === 0,
  "[1,i] must send 1 to -i because the action uses conjugate(b)."
);


/*
 * Exhaustive matrix uniqueness, orthogonality, determinant.
 */
const summary =
  validateG288Matrices();

assert(
  summary.count === 288,
  "There must be exactly 288 matrix records."
);

assert(
  summary.uniqueMatrixCount === 288,
  "All 288 projective transformations must have distinct matrices."
);


/*
 * Entry range expected for 2M in this finite system.
 */
assert(
  summary.minimumEntry >= -2 &&
  summary.maximumEntry <= 2,
  `Unexpected doubled-matrix entry range [${summary.minimumEntry}, ${summary.maximumEntry}].`
);


/*
 * Exhaustively verify representation homomorphism:
 *
 *   M_(gh) = M_g M_h.
 *
 * Since we store 2M:
 *
 *   matrix2(gh) =
 *   matrix2(g) matrix2(h) / 2.
 *
 * This is another 82,944 exact comparisons.
 */
for (
  const left of G288
) {
  const leftMatrix =
    matrix2ForG288(
      left
    );

  for (
    const right of G288
  ) {
    const rightMatrix =
      matrix2ForG288(
        right
      );

    const productElement =
      composeG288(
        left,
        right
      );

    const productMatrix =
      matrix2ForG288(
        productElement
      );

    const composedMatrix =
      composeMatrix2(
        leftMatrix,
        rightMatrix
      );

    assertMatrixEqual(
      productMatrix,
      composedMatrix,
      "Matrix representation failed to preserve group composition."
    );
  }
}


/*
 * Confirm every matrix has exact determinant +1 after dividing
 * the doubled matrix by 2.
 *
 * det(2M) = 2^4 det(M) = 16 det(M).
 */
for (
  const record of
    G288_MATRIX_RECORDS
) {
  assert(
    isOrthogonalMatrix2(
      record.matrix2
    ),
    "Every doubled matrix must satisfy A^T A = 4I."
  );

  assert(
    determinantIntegerMatrix(
      record.matrix2
    ) === 16,
    "Every doubled matrix must have determinant 16."
  );
}


/*
 * Representative trace output.
 */
console.log(
  `Exact matrix records: ${summary.count}`
);

console.log(
  `Distinct exact matrices: ${summary.uniqueMatrixCount}`
);

console.log(
  `Doubled-matrix entry range: ${summary.minimumEntry} to ${summary.maximumEntry}`
);

console.log("");

console.log(
  "Representative exact traces:"
);

for (
  const index of [
    0,
    1,
    17,
    103,
    287,
  ]
) {
  const record =
    G288_MATRIX_RECORDS[
      index
    ];

  const trace =
    exactTrace(
      record.matrix2
    );

  console.log(
    `  G[${index}] trace = ${trace.numerator}/${trace.denominator}`
  );
}


/*
 * A few representative elements should also remain identifiable
 * at the group level after passing to matrices.
 */
const sample =
  makeProjectiveElement(
    H,
    J
  );

const sampleAgain =
  G288.find(
    (element) =>
      projectiveEquals(
        element,
        sample
      )
  );

assert(
  sampleAgain != null,
  "Representative [H,J] element must be present in G288."
);

assertMatrixEqual(
  matrix2ForG288(
    sample
  ),
  matrix2ForG288(
    sampleAgain
  ),
  "The same projective element must always derive the same exact matrix."
);


console.log("");

console.log(
  "PASS: exact matrix derived from quaternion action"
);

console.log(
  "PASS: identity gives exact 2I"
);

console.log(
  "PASS: left multiplication by i matches its known 4D rotation"
);

console.log(
  "PASS: right-action conjugation convention verified"
);

console.log(
  "PASS: exactly 288 distinct exact matrices"
);

console.log(
  "PASS: all doubled-matrix entries lie in {-2,-1,0,1,2}"
);

console.log(
  "PASS: exact orthogonality for all 288 matrices"
);

console.log(
  "PASS: exact determinant +1 for all 288 transformations"
);

console.log(
  "PASS: exhaustive matrix/group composition homomorphism"
);

console.log("");

console.log(
  "STEP 4 PASSED"
);
