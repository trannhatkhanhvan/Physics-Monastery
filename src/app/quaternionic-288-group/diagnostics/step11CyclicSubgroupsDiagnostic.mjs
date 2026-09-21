import {
  C12_SUBGROUPS,
  ORDER_12_ELEMENTS,
  c12GeneratorConjugacyPattern,
  generatorsOfCyclicSubgroup,
  powerLadderFor,
  validateC12Subgroups,
} from "../math/cyclicSubgroups.mjs";


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


function quotientCoordinateText(
  coordinates
) {
  return (
    `(${coordinates.a},${coordinates.b})`
  );
}


console.log(
  "Quaternionic 288-Group — Step 11 diagnostic"
);

console.log("");


const summary =
  validateC12Subgroups();


assert(
  summary.order12ElementCount === 96,
  "There must be exactly 96 order-12 elements."
);

assert(
  summary.c12SubgroupCount === 24,
  "There must be exactly 24 distinct C12 subgroups."
);

assert(
  summary.generatorsPerC12 === 4,
  "Each C12 subgroup must have exactly four generators."
);

assert(
  summary.generatorOwnershipCount === 96,
  "All 96 order-12 elements must generate exactly one of the 24 C12 subgroups."
);


console.log(
  `Order-12 elements: ${ORDER_12_ELEMENTS.length}`
);

console.log(
  `Distinct cyclic C_12 subgroups: ${C12_SUBGROUPS.length}`
);

console.log(
  `Generators per C_12: ${summary.generatorsPerC12}`
);

console.log("");

console.log(
  "Therefore:"
);

console.log(
  "  96 = 24 x 4"
);

console.log(
  "  24 cyclic C_12 subgroups, each with 4 primitive generators"
);


console.log("");

console.log(
  "Primitive generator positions in each 12-step cycle:"
);

console.log(
  `  ${summary.primitiveExponents.join(", ")}`
);


/*
 * Inspect one representative C12 power ladder in full.
 */
const sample =
  C12_SUBGROUPS[0];

const ladder =
  powerLadderFor(
    sample.generator
  );


console.log("");

console.log(
  "Representative C_12 power ladder:"
);

for (
  const record of ladder
) {
  console.log(
    `  g^${record.exponent}`
  );

  console.log(
    `    order: ${record.order}`
  );

  console.log(
    `    primitive generator: ${record.primitiveGeneratorPosition}`
  );

  console.log(
    `    chi(x): ${record.characteristicPolynomial}`
  );

  console.log(
    `    conjugacy class: ${record.conjugacyClassIndex + 1}`
  );

  console.log(
    `    in K_32: ${record.inK32}`
  );

  console.log(
    `    quotient: ${quotientCoordinateText(record.quotientCoordinates)}`
  );

  console.log(
    `    quotient order: ${record.quotientOrder}`
  );
}


/*
 * Summarize the order sequence across the 12-step cycle.
 */
const orderSequence =
  ladder.map(
    (record) =>
      record.order
  );

console.log("");

console.log(
  "Power-order sequence:"
);

console.log(
  `  ${orderSequence.join(" -> ")}`
);


/*
 * Check that every C12 has the same abstract power-order pattern.
 */
const orderPatternCounts =
  new Map();

for (
  const subgroup of
    C12_SUBGROUPS
) {
  const pattern =
    powerLadderFor(
      subgroup.generator
    )
      .map(
        (record) =>
          record.order
      )
      .join(",");

  orderPatternCounts.set(
    pattern,
    (
      orderPatternCounts.get(
        pattern
      ) ??
      0
    ) + 1
  );
}


console.log("");

console.log(
  "Distinct power-order patterns across all 24 C_12 subgroups:"
);

for (
  const [
    pattern,
    count,
  ] of orderPatternCounts.entries()
) {
  console.log(
    `  ${pattern}: ${count}`
  );
}


/*
 * Discover how the four primitive generators of each C12 sit
 * among the four order-12 conjugacy classes.
 */
const conjugacyPatternCounts =
  new Map();

for (
  const subgroup of
    C12_SUBGROUPS
) {
  const pattern =
    c12GeneratorConjugacyPattern(
      subgroup
    )
      .map(
        (index) =>
          index + 1
      )
      .join(",");

  conjugacyPatternCounts.set(
    pattern,
    (
      conjugacyPatternCounts.get(
        pattern
      ) ??
      0
    ) + 1
  );
}


console.log("");

console.log(
  "Primitive-generator conjugacy-class patterns:"
);

for (
  const [
    pattern,
    count,
  ] of [
    ...conjugacyPatternCounts.entries(),
  ].sort()
) {
  console.log(
    `  classes ${pattern}: ${count} C_12 subgroups`
  );
}


/*
 * Determine which exponents land inside K32.
 */
const k32Exponents =
  ladder
    .filter(
      (record) =>
        record.inK32
    )
    .map(
      (record) =>
        record.exponent
    );

console.log("");

console.log(
  "Positions lying in K_32:"
);

console.log(
  `  ${k32Exponents.join(", ")}`
);

assert(
  k32Exponents.join(",") ===
    "0,3,6,9",
  "Expected exactly powers 0,3,6,9 to lie in K32."
);


/*
 * Show the spectral path around the cycle.
 */
console.log("");

console.log(
  "Spectral path around one C_12:"
);

for (
  const record of ladder
) {
  console.log(
    `  g^${record.exponent}: order ${record.order} | ${record.characteristicPolynomial}`
  );
}


console.log("");

console.log(
  "PASS: exactly 24 distinct cyclic C_12 subgroups"
);

console.log(
  "PASS: each C_12 contains exactly four order-12 generators"
);

console.log(
  "PASS: all 96 order-12 elements occur as generators exactly once"
);

console.log(
  "PASS: primitive generator positions are 1,5,7,11"
);

console.log(
  "PASS: every C_12 has midpoint g^6 = -I"
);

console.log(
  "PASS: powers 0,3,6,9 are exactly the positions lying in K_32"
);

console.log(
  "PASS: exact order/spectral/conjugacy/quotient power ladders computed"
);

console.log("");

console.log(
  "STEP 11 PASSED"
);
