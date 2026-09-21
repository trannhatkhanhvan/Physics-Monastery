/*
 * Exact spectral classification of G_288.
 *
 * No floating-point eigenvalue calculation is authoritative here.
 *
 * For M in SO(4), the characteristic polynomial is reciprocal:
 *
 *   chi_M(x)
 *     = x^4 - t x^3 + s x^2 - t x + 1
 *
 * where
 *
 *   t = tr(M)
 *
 * and
 *
 *   s = ((tr M)^2 - tr(M^2)) / 2.
 *
 * Both are computed exactly from the doubled integer matrices.
 */

import {
  NEG_ONE,
  ONE,
} from "./quaternion.mjs";

import {
  G288,
  G288_IDENTITY,
  composeG288,
  g288ElementOrder,
  makeProjectiveElement,
  projectiveEquals,
} from "./group288.mjs";

import {
  G288_MATRIX_RECORDS,
  composeMatrix2,
  traceMatrix2,
} from "./matrices4d.mjs";


function gcd(a, b) {
  let left = Math.abs(a);
  let right = Math.abs(b);

  while (right !== 0) {
    const next = left % right;
    left = right;
    right = next;
  }

  return left || 1;
}


function fraction(
  numerator,
  denominator = 1
) {
  if (denominator === 0) {
    throw new RangeError(
      "Fraction denominator cannot be zero."
    );
  }

  let n = numerator;
  let d = denominator;

  if (d < 0) {
    n *= -1;
    d *= -1;
  }

  const divisor =
    gcd(n, d);

  return Object.freeze({
    numerator: n / divisor,
    denominator: d / divisor,
  });
}


function addFraction(left, right) {
  return fraction(
    left.numerator * right.denominator +
      right.numerator * left.denominator,
    left.denominator *
      right.denominator
  );
}


function subtractFraction(left, right) {
  return fraction(
    left.numerator * right.denominator -
      right.numerator * left.denominator,
    left.denominator *
      right.denominator
  );
}


function multiplyFraction(left, right) {
  return fraction(
    left.numerator *
      right.numerator,
    left.denominator *
      right.denominator
  );
}


function divideFraction(left, right) {
  if (right.numerator === 0) {
    throw new RangeError(
      "Cannot divide by zero fraction."
    );
  }

  return fraction(
    left.numerator *
      right.denominator,
    left.denominator *
      right.numerator
  );
}


function negateFraction(value) {
  return fraction(
    -value.numerator,
    value.denominator
  );
}


function isZeroFraction(value) {
  return value.numerator === 0;
}


function integerFromFraction(
  value,
  label
) {
  if (value.denominator !== 1) {
    throw new Error(
      `${label} was not integral: ` +
      `${value.numerator}/${value.denominator}`
    );
  }

  return value.numerator;
}


export function exactTraceForMatrix2(
  matrix2
) {
  return fraction(
    traceMatrix2(matrix2),
    2
  );
}


export function characteristicPolynomialForMatrix2(
  matrix2
) {
  const trace =
    exactTraceForMatrix2(
      matrix2
    );

  const matrixSquared2 =
    composeMatrix2(
      matrix2,
      matrix2
    );

  const traceSquaredMatrix =
    exactTraceForMatrix2(
      matrixSquared2
    );

  const traceSquare =
    multiplyFraction(
      trace,
      trace
    );

  const secondCoefficient =
    divideFraction(
      subtractFraction(
        traceSquare,
        traceSquaredMatrix
      ),
      fraction(2)
    );

  const coefficients = [
    fraction(1),
    negateFraction(trace),
    secondCoefficient,
    negateFraction(trace),
    fraction(1),
  ];

  const integers =
    coefficients.map(
      (coefficient, index) =>
        integerFromFraction(
          coefficient,
          `Characteristic-polynomial coefficient ${index}`
        )
    );

  return Object.freeze(
    integers
  );
}


export function polynomialKey(
  coefficients
) {
  return coefficients.join(",");
}


export function formatPolynomial(
  coefficients
) {
  const degree =
    coefficients.length - 1;

  const terms = [];

  for (
    let index = 0;
    index < coefficients.length;
    index += 1
  ) {
    const coefficient =
      coefficients[index];

    if (coefficient === 0) {
      continue;
    }

    const power =
      degree - index;

    const absolute =
      Math.abs(coefficient);

    let body = "";

    if (power === 0) {
      body = String(absolute);
    } else if (power === 1) {
      body =
        absolute === 1
          ? "x"
          : `${absolute}x`;
    } else {
      body =
        absolute === 1
          ? `x^${power}`
          : `${absolute}x^${power}`;
    }

    if (terms.length === 0) {
      terms.push(
        coefficient < 0
          ? `-${body}`
          : body
      );
    } else {
      terms.push(
        coefficient < 0
          ? `- ${body}`
          : `+ ${body}`
      );
    }
  }

  return terms.join(" ");
}


function trimLeadingZeros(
  coefficients
) {
  let index = 0;

  while (
    index <
      coefficients.length - 1 &&
    coefficients[index] === 0
  ) {
    index += 1;
  }

  return coefficients.slice(index);
}


function divideMonicPolynomial(
  dividend,
  divisor
) {
  let remainder =
    [...dividend];

  const quotientLength =
    dividend.length -
    divisor.length +
    1;

  if (quotientLength <= 0) {
    return null;
  }

  const quotient =
    new Array(
      quotientLength
    ).fill(0);

  while (
    remainder.length >=
    divisor.length
  ) {
    const coefficient =
      remainder[0];

    const degreeDifference =
      remainder.length -
      divisor.length;

    const quotientIndex =
      quotient.length -
      1 -
      degreeDifference;

    quotient[quotientIndex] =
      coefficient;

    for (
      let index = 0;
      index < divisor.length;
      index += 1
    ) {
      remainder[index] -=
        coefficient *
        divisor[index];
    }

    remainder =
      trimLeadingZeros(
        remainder
      );

    if (
      remainder.length === 1 &&
      remainder[0] === 0
    ) {
      break;
    }
  }

  const exact =
    remainder.length === 1 &&
    remainder[0] === 0;

  return exact
    ? quotient
    : null;
}


const CYCLOTOMIC_FACTORS =
  Object.freeze([
    Object.freeze({
      order: 1,
      label: "Phi_1",
      polynomial: Object.freeze([1, -1]),
      angleLabel: "0",
    }),

    Object.freeze({
      order: 2,
      label: "Phi_2",
      polynomial: Object.freeze([1, 1]),
      angleLabel: "pi",
    }),

    Object.freeze({
      order: 3,
      label: "Phi_3",
      polynomial: Object.freeze([1, 1, 1]),
      angleLabel: "±2pi/3",
    }),

    Object.freeze({
      order: 4,
      label: "Phi_4",
      polynomial: Object.freeze([1, 0, 1]),
      angleLabel: "±pi/2",
    }),

    Object.freeze({
      order: 6,
      label: "Phi_6",
      polynomial: Object.freeze([1, -1, 1]),
      angleLabel: "±pi/3",
    }),

    Object.freeze({
      order: 12,
      label: "Phi_12",
      polynomial: Object.freeze([1, 0, -1, 0, 1]),
      angleLabel: "±pi/6 and ±5pi/6",
    }),
  ]);


export function cyclotomicFactorization(
  coefficients
) {
  let remainder =
    [...coefficients];

  const factors = [];

  for (
    const candidate of
      CYCLOTOMIC_FACTORS
  ) {
    while (true) {
      const quotient =
        divideMonicPolynomial(
          remainder,
          candidate.polynomial
        );

      if (!quotient) {
        break;
      }

      factors.push(candidate);
      remainder =
        trimLeadingZeros(
          quotient
        );
    }
  }

  if (
    remainder.length !== 1 ||
    remainder[0] !== 1
  ) {
    return Object.freeze({
      exact: false,
      factors:
        Object.freeze(
          [...factors]
        ),
      remainder:
        Object.freeze(
          [...remainder]
        ),
    });
  }

  return Object.freeze({
    exact: true,
    factors:
      Object.freeze(
        [...factors]
      ),
    remainder:
      Object.freeze([1]),
  });
}


function exactRankIntegerMatrix(
  matrix
) {
  const work =
    matrix.map(
      (row) =>
        row.map(
          (value) =>
            fraction(value)
        )
    );

  const rowCount =
    work.length;

  const columnCount =
    work[0]?.length ?? 0;

  let pivotRow = 0;

  for (
    let column = 0;
    column < columnCount &&
      pivotRow < rowCount;
    column += 1
  ) {
    let sourceRow =
      pivotRow;

    while (
      sourceRow < rowCount &&
      isZeroFraction(
        work[sourceRow][column]
      )
    ) {
      sourceRow += 1;
    }

    if (
      sourceRow === rowCount
    ) {
      continue;
    }

    if (
      sourceRow !== pivotRow
    ) {
      [
        work[sourceRow],
        work[pivotRow],
      ] = [
        work[pivotRow],
        work[sourceRow],
      ];
    }

    const pivot =
      work[pivotRow][column];

    for (
      let row = pivotRow + 1;
      row < rowCount;
      row += 1
    ) {
      if (
        isZeroFraction(
          work[row][column]
        )
      ) {
        continue;
      }

      const scale =
        divideFraction(
          work[row][column],
          pivot
        );

      for (
        let innerColumn = column;
        innerColumn < columnCount;
        innerColumn += 1
      ) {
        work[row][innerColumn] =
          subtractFraction(
            work[row][innerColumn],
            multiplyFraction(
              scale,
              work[pivotRow][innerColumn]
            )
          );
      }
    }

    pivotRow += 1;
  }

  return pivotRow;
}


export function fixedSpaceDimension(
  matrix2
) {
  /*
   * ker(M - I) = ker(2M - 2I).
   */
  const shifted =
    matrix2.map(
      (row, rowIndex) =>
        row.map(
          (entry, columnIndex) =>
            entry -
            (
              rowIndex === columnIndex
                ? 2
                : 0
            )
        )
    );

  const rank =
    exactRankIntegerMatrix(
      shifted
    );

  return 4 - rank;
}


export const CENTRAL_MINUS_IDENTITY =
  makeProjectiveElement(
    NEG_ONE,
    ONE
  );


export function powerG288(
  element,
  exponent
) {
  if (
    !Number.isSafeInteger(exponent) ||
    exponent < 0
  ) {
    throw new RangeError(
      "Exponent must be a nonnegative safe integer."
    );
  }

  let result =
    G288_IDENTITY;

  for (
    let step = 0;
    step < exponent;
    step += 1
  ) {
    result =
      composeG288(
        result,
        element
      );
  }

  return result;
}


export function hasSixthPowerMinusIdentity(
  element
) {
  return projectiveEquals(
    powerG288(
      element,
      6
    ),
    CENTRAL_MINUS_IDENTITY
  );
}


export function spectralRecord(
  element,
  matrix2
) {
  const characteristicPolynomial =
    characteristicPolynomialForMatrix2(
      matrix2
    );

  const factorization =
    cyclotomicFactorization(
      characteristicPolynomial
    );

  return Object.freeze({
    element,
    matrix2,

    order:
      g288ElementOrder(
        element
      ),

    trace:
      exactTraceForMatrix2(
        matrix2
      ),

    characteristicPolynomial,

    characteristicPolynomialKey:
      polynomialKey(
        characteristicPolynomial
      ),

    characteristicPolynomialText:
      formatPolynomial(
        characteristicPolynomial
      ),

    cyclotomicExact:
      factorization.exact,

    cyclotomicFactors:
      factorization.factors,

    fixedSpaceDimension:
      fixedSpaceDimension(
        matrix2
      ),

    sixthPowerMinusIdentity:
      hasSixthPowerMinusIdentity(
        element
      ),
  });
}


export const G288_SPECTRAL_RECORDS =
  Object.freeze(
    G288_MATRIX_RECORDS.map(
      (matrixRecord) =>
        spectralRecord(
          matrixRecord.element,
          matrixRecord.matrix2
        )
    )
  );


export function characteristicPolynomialDistribution() {
  const map =
    new Map();

  for (
    const record of
      G288_SPECTRAL_RECORDS
  ) {
    const key =
      record.characteristicPolynomialKey;

    const existing =
      map.get(key);

    if (existing) {
      existing.count += 1;
      existing.orders.add(
        record.order
      );
      existing.fixedDimensions.add(
        record.fixedSpaceDimension
      );

      if (
        record.sixthPowerMinusIdentity
      ) {
        existing.sixthPowerMinusIdentityCount += 1;
      }
    } else {
      map.set(
        key,
        {
          polynomial:
            record.characteristicPolynomial,

          text:
            record.characteristicPolynomialText,

          count: 1,

          orders:
            new Set([
              record.order,
            ]),

          fixedDimensions:
            new Set([
              record.fixedSpaceDimension,
            ]),

          sixthPowerMinusIdentityCount:
            record.sixthPowerMinusIdentity
              ? 1
              : 0,

          cyclotomicFactors:
            record.cyclotomicFactors,
        }
      );
    }
  }

  return map;
}


export function orderByPolynomialTable() {
  const table =
    new Map();

  for (
    const record of
      G288_SPECTRAL_RECORDS
  ) {
    const order =
      record.order;

    const polynomial =
      record.characteristicPolynomialText;

    if (
      !table.has(order)
    ) {
      table.set(
        order,
        new Map()
      );
    }

    const row =
      table.get(order);

    row.set(
      polynomial,
      (
        row.get(polynomial) ??
        0
      ) + 1
    );
  }

  return table;
}


export function validateSpectralClassification() {
  if (
    G288_SPECTRAL_RECORDS.length !==
    288
  ) {
    throw new Error(
      "Expected 288 spectral records."
    );
  }

  for (
    const record of
      G288_SPECTRAL_RECORDS
  ) {
    if (
      !record.cyclotomicExact
    ) {
      throw new Error(
        "Characteristic polynomial failed exact cyclotomic factorization:\n" +
        record.characteristicPolynomialText
      );
    }
  }

  const phi12Key =
    polynomialKey(
      [1, 0, -1, 0, 1]
    );

  const phi12Records =
    G288_SPECTRAL_RECORDS.filter(
      (record) =>
        record.characteristicPolynomialKey ===
        phi12Key
    );

  return Object.freeze({
    recordCount:
      G288_SPECTRAL_RECORDS.length,

    distinctCharacteristicPolynomialCount:
      characteristicPolynomialDistribution().size,

    phi12Count:
      phi12Records.length,

    phi12OrderSet:
      Object.freeze(
        [
          ...new Set(
            phi12Records.map(
              (record) =>
                record.order
            )
          ),
        ].sort(
          (a, b) =>
            a - b
        )
      ),

    phi12SixthPowerMinusIdentityCount:
      phi12Records.filter(
        (record) =>
          record.sixthPowerMinusIdentity
      ).length,
  });
}
