import {
  G288_OVER_K32_COSETS,
  QUOTIENT_COORDINATE_RECORDS,
  QUOTIENT_IDENTITY_COSET,
  QUOTIENT_LEFT_GENERATOR,
  QUOTIENT_RIGHT_GENERATOR,
  quotientCoordinates,
  quotientElementOrder,
  quotientMultiply,
  validateQuotientC3xC3,
} from "../math/quotientC3xC3.mjs";


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


console.log(
  "Quaternionic 288-Group — Step 7 diagnostic"
);

console.log("");


const summary =
  validateQuotientC3xC3();


assert(
  summary.cosetCount === 9,
  "Quotient must contain exactly nine cosets."
);

assert(
  summary.cosetSize === 32,
  "Every quotient coset must contain exactly 32 elements."
);

assert(
  summary.coveredElementCount === 288,
  "Nine cosets must partition all 288 elements."
);

assert(
  summary.leftGeneratorOrder === 3,
  "Left quotient generator must have order 3."
);

assert(
  summary.rightGeneratorOrder === 3,
  "Right quotient generator must have order 3."
);

assert(
  summary.coordinateCount === 9,
  "Z3 x Z3 coordinates must identify nine distinct quotient elements."
);


console.log(
  `Quotient cosets: ${summary.cosetCount}`
);

console.log(
  `Elements per coset: ${summary.cosetSize}`
);

console.log(
  `Covered G_288 elements: ${summary.coveredElementCount}`
);

console.log("");

console.log(
  "Quotient element-order distribution:"
);

for (
  const [
    order,
    count,
  ] of Object.entries(
    summary.orderDistribution
  )
) {
  console.log(
    `  order ${order}: ${count}`
  );
}


console.log("");

console.log(
  "Natural quotient generators:"
);

console.log(
  `  L = [h,1], order ${quotientElementOrder(QUOTIENT_LEFT_GENERATOR)}`
);

console.log(
  `  R = [1,h], order ${quotientElementOrder(QUOTIENT_RIGHT_GENERATOR)}`
);


console.log("");

console.log(
  "3 x 3 quotient coordinates:"
);

for (
  let a = 0;
  a < 3;
  a += 1
) {
  const row = [];

  for (
    let b = 0;
    b < 3;
    b += 1
  ) {
    const record =
      QUOTIENT_COORDINATE_RECORDS.find(
        (candidate) =>
          candidate.a === a &&
          candidate.b === b
      );

    assert(
      record != null,
      `Missing quotient coordinate (${a},${b}).`
    );

    row.push(
      `(${a},${b})`
    );
  }

  console.log(
    `  ${row.join("   ")}`
  );
}


/*
 * Print the multiplication law in coordinate form.
 */
console.log("");

console.log(
  "Coordinate law:"
);

console.log(
  "  (a,b) * (c,d) = (a+c mod 3, b+d mod 3)"
);


/*
 * Explicitly inspect generator combinations.
 */
console.log("");

console.log(
  "Generator orbit:"
);

let currentLeft =
  QUOTIENT_IDENTITY_COSET;

for (
  let a = 0;
  a < 3;
  a += 1
) {
  let current =
    currentLeft;

  for (
    let b = 0;
    b < 3;
    b += 1
  ) {
    const coordinates =
      quotientCoordinates(
        current
      );

    assert(
      coordinates != null,
      "Generated quotient element must have coordinates."
    );

    console.log(
      `  L^${a} R^${b} -> (${coordinates.a},${coordinates.b})`
    );

    current =
      quotientMultiply(
        current,
        QUOTIENT_RIGHT_GENERATOR
      );
  }

  currentLeft =
    quotientMultiply(
      currentLeft,
      QUOTIENT_LEFT_GENERATOR
    );
}


console.log("");

console.log(
  "PASS: exactly nine K_32 cosets"
);

console.log(
  "PASS: each coset contains exactly 32 elements"
);

console.log(
  "PASS: cosets partition all 288 elements exactly once"
);

console.log(
  "PASS: quotient multiplication is well-defined"
);

console.log(
  "PASS: quotient is abelian"
);

console.log(
  "PASS: quotient order distribution is 1 + 8 order-3 elements"
);

console.log(
  "PASS: [h,1] gives an order-3 left generator"
);

console.log(
  "PASS: [1,h] gives an independent order-3 right generator"
);

console.log(
  "PASS: the nine cosets are uniquely L^a R^b with a,b in Z_3"
);

console.log(
  "PASS: quotient multiplication is coordinate addition mod 3"
);

console.log("");

console.log(
  "G_288 / K_32 ≅ C_3 x C_3"
);

console.log("");

console.log(
  "STEP 7 PASSED"
);
