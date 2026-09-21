import {
  G288_SPECTRAL_RECORDS,
  characteristicPolynomialDistribution,
  orderByPolynomialTable,
  polynomialKey,
  validateSpectralClassification,
} from "../math/spectralClassification.mjs";


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


function factorizationText(
  factors
) {
  if (
    factors.length === 0
  ) {
    return "1";
  }

  const counts =
    new Map();

  for (
    const factor of factors
  ) {
    counts.set(
      factor.label,
      (
        counts.get(
          factor.label
        ) ??
        0
      ) + 1
    );
  }

  return [
    ...counts.entries(),
  ]
    .map(
      ([label, count]) =>
        count === 1
          ? label
          : `${label}^${count}`
    )
    .join(" * ");
}


console.log(
  "Quaternionic 288-Group — Step 5 diagnostic"
);

console.log("");


const summary =
  validateSpectralClassification();


assert(
  summary.recordCount === 288,
  "There must be exactly 288 spectral records."
);


/*
 * Major previously reported checkpoint.
 *
 * This is tested only after the characteristic polynomials have
 * been independently derived from the exact matrices.
 */
assert(
  summary.phi12Count === 96,
  `Expected 96 Phi_12 elements; found ${summary.phi12Count}.`
);

assert(
  summary.phi12OrderSet.length === 1 &&
  summary.phi12OrderSet[0] === 12,
  "Every Phi_12 element must have computed group order 12."
);

assert(
  summary.phi12SixthPowerMinusIdentityCount === 96,
  "Every Phi_12 element must satisfy G^6 = -I."
);


/*
 * Characteristic-polynomial distribution.
 */
const distribution =
  characteristicPolynomialDistribution();

const total =
  [
    ...distribution.values(),
  ].reduce(
    (sum, record) =>
      sum + record.count,
    0
  );

assert(
  total === 288,
  "Characteristic-polynomial classes must account for all 288 elements."
);


console.log(
  `Spectral records: ${summary.recordCount}`
);

console.log(
  `Distinct characteristic polynomials: ${summary.distinctCharacteristicPolynomialCount}`
);

console.log("");

console.log(
  "Exact characteristic-polynomial classes:"
);

const sortedClasses =
  [
    ...distribution.values(),
  ].sort(
    (left, right) => {
      const leftOrder =
        Math.min(
          ...left.orders
        );

      const rightOrder =
        Math.min(
          ...right.orders
        );

      if (
        leftOrder !==
        rightOrder
      ) {
        return (
          leftOrder -
          rightOrder
        );
      }

      return (
        left.text <
        right.text
          ? -1
          : left.text >
              right.text
            ? 1
            : 0
      );
    }
  );

for (
  const spectralClass of
    sortedClasses
) {
  const orders =
    [
      ...spectralClass.orders,
    ].sort(
      (a, b) =>
        a - b
    );

  const fixedDimensions =
    [
      ...spectralClass.fixedDimensions,
    ].sort(
      (a, b) =>
        a - b
    );

  console.log(
    `  ${spectralClass.text}`
  );

  console.log(
    `    count: ${spectralClass.count}`
  );

  console.log(
    `    order(s): ${orders.join(", ")}`
  );

  console.log(
    `    cyclotomic: ${factorizationText(spectralClass.cyclotomicFactors)}`
  );

  console.log(
    `    fixed-space dimension(s): ${fixedDimensions.join(", ")}`
  );

  console.log(
    `    G^6 = -I count: ${spectralClass.sixthPowerMinusIdentityCount}`
  );
}


/*
 * Order vs characteristic polynomial.
 */
console.log("");

console.log(
  "Order vs characteristic polynomial:"
);

const orderTable =
  orderByPolynomialTable();

for (
  const order of
    [
      ...orderTable.keys(),
    ].sort(
      (a, b) =>
        a - b
    )
) {
  console.log(
    `  order ${order}:`
  );

  const row =
    orderTable.get(order);

  for (
    const [
      polynomial,
      count,
    ] of [
      ...row.entries(),
    ].sort(
      ([left], [right]) =>
        left < right
          ? -1
          : left > right
            ? 1
            : 0
    )
  ) {
    console.log(
      `    ${polynomial}: ${count}`
    );
  }
}


/*
 * Explicit Phi_12 checkpoint.
 */
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

console.log("");

console.log(
  "Phi_12 checkpoint:"
);

console.log(
  `  polynomial: x^4 - x^2 + 1`
);

console.log(
  `  count: ${phi12Records.length}`
);

console.log(
  `  all order 12: ${
    phi12Records.every(
      (record) =>
        record.order === 12
    )
  }`
);

console.log(
  `  all satisfy G^6 = -I: ${
    phi12Records.every(
      (record) =>
        record.sixthPowerMinusIdentity
    )
  }`
);

console.log(
  "  primitive eigenvalue positions: 1,5,7,11 mod 12"
);


/*
 * Representative records.
 */
console.log("");

console.log(
  "Representative spectral records:"
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
    G288_SPECTRAL_RECORDS[
      index
    ];

  console.log(
    `  G[${index}]`
  );

  console.log(
    `    order: ${record.order}`
  );

  console.log(
    `    trace: ${record.trace.numerator}/${record.trace.denominator}`
  );

  console.log(
    `    chi(x): ${record.characteristicPolynomialText}`
  );

  console.log(
    `    cyclotomic: ${factorizationText(record.cyclotomicFactors)}`
  );

  console.log(
    `    fixed-space dimension: ${record.fixedSpaceDimension}`
  );

  console.log(
    `    G^6 = -I: ${record.sixthPowerMinusIdentity}`
  );
}


console.log("");

console.log(
  "PASS: exact characteristic polynomial for all 288 elements"
);

console.log(
  "PASS: all characteristic polynomials factor exactly into cyclotomic factors"
);

console.log(
  "PASS: exact fixed-space dimensions computed without numerical eigenvalues"
);

console.log(
  "PASS: order vs spectral type cross-tabulation computed"
);

console.log(
  "PASS: exactly 96 elements have Phi_12(x) = x^4 - x^2 + 1"
);

console.log(
  "PASS: every Phi_12 element has order 12"
);

console.log(
  "PASS: every Phi_12 element satisfies G^6 = -I"
);

console.log("");

console.log(
  "STEP 5 PASSED"
);
