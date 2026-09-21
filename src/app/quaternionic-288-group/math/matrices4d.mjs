/*
 * Exact 4D matrix representation of G_288.
 *
 * For
 *
 *   g = [a,b]
 *
 * acting by
 *
 *   z -> a z conjugate(b),
 *
 * derive the real-linear map on R^4 directly from exact
 * quaternion arithmetic.
 *
 * Authoritative matrix representation:
 *
 *   matrix2 = 2 M_g
 *
 * where M_g is the actual 4 x 4 real matrix.
 *
 * matrix2 therefore has integer entries.
 */

import {
  I,
  J,
  K,
  ONE,
  conjugate,
  multiply,
} from "./quaternion.mjs";

import {
  G288,
  composeG288,
  projectiveEquals,
} from "./group288.mjs";


export const BASIS_QUATERNIONS =
  Object.freeze([
    ONE,
    I,
    J,
    K,
  ]);


function freezeMatrix(matrix) {
  return Object.freeze(
    matrix.map(
      (row) =>
        Object.freeze([...row])
    )
  );
}


export function applyG288ToQuaternion(
  element,
  z
) {
  return multiply(
    multiply(
      element.a,
      z
    ),
    conjugate(
      element.b
    )
  );
}


/*
 * The image quaternion
 *
 *   (A + B i + C j + D k)/2
 *
 * has real coordinate vector
 *
 *   (A/2, B/2, C/2, D/2).
 *
 * Therefore its doubled coordinate column is exactly
 *
 *   (A,B,C,D).
 */
function doubledCoordinateColumn(
  quaternion
) {
  return [
    quaternion.A,
    quaternion.B,
    quaternion.C,
    quaternion.D,
  ];
}


export function matrix2ForG288(
  element
) {
  const columns =
    BASIS_QUATERNIONS.map(
      (basisVector) =>
        doubledCoordinateColumn(
          applyG288ToQuaternion(
            element,
            basisVector
          )
        )
    );

  const matrix =
    Array.from(
      { length: 4 },
      (_, row) =>
        Array.from(
          { length: 4 },
          (_, column) =>
            columns[column][row]
        )
    );

  return freezeMatrix(
    matrix
  );
}


export function matrixKey(
  matrix
) {
  return matrix
    .map(
      (row) =>
        row.join(",")
    )
    .join("|");
}


export function transposeMatrix(
  matrix
) {
  return freezeMatrix(
    Array.from(
      { length: 4 },
      (_, row) =>
        Array.from(
          { length: 4 },
          (_, column) =>
            matrix[column][row]
        )
    )
  );
}


export function multiplyIntegerMatrices(
  left,
  right
) {
  return freezeMatrix(
    Array.from(
      { length: 4 },
      (_, row) =>
        Array.from(
          { length: 4 },
          (_, column) => {
            let sum = 0;

            for (
              let inner = 0;
              inner < 4;
              inner += 1
            ) {
              sum +=
                left[row][inner] *
                right[inner][column];
            }

            return sum;
          }
        )
    )
  );
}


function exactHalfInteger(
  value,
  label
) {
  if (
    value % 2 !== 0
  ) {
    throw new Error(
      `${label} is not divisible by 2: ${value}`
    );
  }

  return value / 2;
}


/*
 * If
 *
 *   A = 2M_g
 *   B = 2M_h,
 *
 * then
 *
 *   2(M_g M_h) = AB / 2.
 */
export function composeMatrix2(
  leftMatrix2,
  rightMatrix2
) {
  const raw =
    multiplyIntegerMatrices(
      leftMatrix2,
      rightMatrix2
    );

  return freezeMatrix(
    raw.map(
      (row, rowIndex) =>
        row.map(
          (value, columnIndex) =>
            exactHalfInteger(
              value,
              `matrix composition entry (${rowIndex},${columnIndex})`
            )
        )
    )
  );
}


export function identityMatrix2() {
  return freezeMatrix([
    [2, 0, 0, 0],
    [0, 2, 0, 0],
    [0, 0, 2, 0],
    [0, 0, 0, 2],
  ]);
}


export function matricesEqual(
  left,
  right
) {
  for (
    let row = 0;
    row < 4;
    row += 1
  ) {
    for (
      let column = 0;
      column < 4;
      column += 1
    ) {
      if (
        left[row][column] !==
        right[row][column]
      ) {
        return false;
      }
    }
  }

  return true;
}


/*
 * Bareiss exact determinant.
 *
 * This is fraction-free Gaussian elimination and remains entirely
 * in integer arithmetic.
 */
export function determinantIntegerMatrix(
  matrix
) {
  const a =
    matrix.map(
      (row) =>
        [...row]
    );

  let sign = 1;
  let previousPivot = 1;

  for (
    let pivotIndex = 0;
    pivotIndex < 3;
    pivotIndex += 1
  ) {
    let pivotRow =
      pivotIndex;

    while (
      pivotRow < 4 &&
      a[pivotRow][pivotIndex] === 0
    ) {
      pivotRow += 1;
    }

    if (
      pivotRow === 4
    ) {
      return 0;
    }

    if (
      pivotRow !== pivotIndex
    ) {
      [
        a[pivotIndex],
        a[pivotRow],
      ] = [
        a[pivotRow],
        a[pivotIndex],
      ];

      sign *= -1;
    }

    const pivot =
      a[pivotIndex][pivotIndex];

    for (
      let row = pivotIndex + 1;
      row < 4;
      row += 1
    ) {
      for (
        let column = pivotIndex + 1;
        column < 4;
        column += 1
      ) {
        const numerator =
          a[row][column] *
            pivot -
          a[row][pivotIndex] *
            a[pivotIndex][column];

        if (
          numerator %
            previousPivot !==
          0
        ) {
          throw new Error(
            "Bareiss determinant lost exact divisibility."
          );
        }

        a[row][column] =
          numerator /
          previousPivot;
      }
    }

    previousPivot =
      pivot;

    for (
      let row = pivotIndex + 1;
      row < 4;
      row += 1
    ) {
      a[row][pivotIndex] = 0;
    }
  }

  return (
    sign *
    a[3][3]
  );
}


export function isOrthogonalMatrix2(
  matrix2
) {
  const product =
    multiplyIntegerMatrices(
      transposeMatrix(
        matrix2
      ),
      matrix2
    );

  const expected =
    freezeMatrix([
      [4, 0, 0, 0],
      [0, 4, 0, 0],
      [0, 0, 4, 0],
      [0, 0, 0, 4],
    ]);

  return matricesEqual(
    product,
    expected
  );
}


export function traceMatrix2(
  matrix2
) {
  return (
    matrix2[0][0] +
    matrix2[1][1] +
    matrix2[2][2] +
    matrix2[3][3]
  );
}


/*
 * Return trace(M_g) exactly as numerator / 2.
 */
export function exactTrace(
  matrix2
) {
  return Object.freeze({
    numerator:
      traceMatrix2(
        matrix2
      ),
    denominator: 2,
  });
}


export const G288_MATRIX_RECORDS =
  Object.freeze(
    G288.map(
      (element) => {
        const matrix2 =
          matrix2ForG288(
            element
          );

        return Object.freeze({
          element,
          matrix2,
          matrixKey:
            matrixKey(
              matrix2
            ),
        });
      }
    )
  );


export function validateG288Matrices() {
  if (
    G288_MATRIX_RECORDS.length !==
    288
  ) {
    throw new Error(
      `Expected 288 matrix records; found ${G288_MATRIX_RECORDS.length}.`
    );
  }

  const uniqueMatrixKeys =
    new Set(
      G288_MATRIX_RECORDS.map(
        (record) =>
          record.matrixKey
      )
    );

  if (
    uniqueMatrixKeys.size !==
    288
  ) {
    throw new Error(
      `Expected 288 distinct exact matrices; found ${uniqueMatrixKeys.size}.`
    );
  }

  let minimumEntry =
    Infinity;

  let maximumEntry =
    -Infinity;

  for (
    const record of
      G288_MATRIX_RECORDS
  ) {
    const matrix2 =
      record.matrix2;

    for (
      const row of matrix2
    ) {
      for (
        const entry of row
      ) {
        minimumEntry =
          Math.min(
            minimumEntry,
            entry
          );

        maximumEntry =
          Math.max(
            maximumEntry,
            entry
          );
      }
    }

    if (
      !isOrthogonalMatrix2(
        matrix2
      )
    ) {
      throw new Error(
        "Exact orthogonality failure:\n" +
        record.element.key
      );
    }

    const determinant =
      determinantIntegerMatrix(
        matrix2
      );

    if (
      determinant !==
      16
    ) {
      throw new Error(
        "Orientation/determinant failure:\n" +
        `element=${record.element.key}\n` +
        `det(2M)=${determinant}`
      );
    }
  }

  return Object.freeze({
    count:
      G288_MATRIX_RECORDS.length,

    uniqueMatrixCount:
      uniqueMatrixKeys.size,

    minimumEntry,
    maximumEntry,
  });
}
