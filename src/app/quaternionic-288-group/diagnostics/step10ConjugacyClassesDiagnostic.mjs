import {
  G288_CONJUGACY_CLASS_RECORDS,
  G288_CONJUGACY_CLASSES,
  spectralClassToConjugacyClasses,
  validateConjugacyClasses,
} from "../math/conjugacyClasses.mjs";


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
  "Quaternionic 288-Group — Step 10 diagnostic"
);

console.log("");


const summary =
  validateConjugacyClasses();


assert(
  summary.coveredCount === 288,
  "Conjugacy classes must cover all 288 elements."
);


console.log(
  `Conjugacy classes: ${summary.classCount}`
);

console.log(
  `Covered elements: ${summary.coveredCount}`
);

console.log("");

console.log(
  "Exact conjugacy-class census:"
);


const sortedRecords =
  [...G288_CONJUGACY_CLASS_RECORDS]
    .sort(
      (left, right) =>
        left.order -
          right.order ||
        left.classSize -
          right.classSize ||
        left.characteristicPolynomial
          .localeCompare(
            right.characteristicPolynomial
          )
    );


for (
  const [
    index,
    record,
  ] of sortedRecords.entries()
) {
  const quotient =
    record.quotientCoordinates
      ? `(${record.quotientCoordinates.a},${record.quotientCoordinates.b})`
      : "n/a";

  console.log(
    `  class ${index + 1}`
  );

  console.log(
    `    size: ${record.classSize}`
  );

  console.log(
    `    centralizer: ${record.centralizerSize}`
  );

  console.log(
    `    order: ${record.order}`
  );

  console.log(
    `    chi(x): ${record.characteristicPolynomial}`
  );

  console.log(
    `    trace: ${record.trace.numerator}/${record.trace.denominator}`
  );

  console.log(
    `    fixed-space dimension: ${record.fixedSpaceDimension}`
  );

  console.log(
    `    members in K_32: ${record.k32MemberCount}`
  );

  console.log(
    `    entirely inside K_32: ${record.entirelyInsideK32}`
  );

  console.log(
    `    representative quotient coordinate: ${quotient}`
  );

  console.log(
    `    tetrahedral action key: ${record.tetrahedralActionKey}`
  );
}


console.log("");

console.log(
  "Spectral classes split into conjugacy classes:"
);

const splitMap =
  spectralClassToConjugacyClasses();

for (
  const [
    spectralKey,
    records,
  ] of [
    ...splitMap.entries(),
  ].sort()
) {
  const sizes =
    records
      .map(
        (record) =>
          record.classSize
      )
      .sort(
        (a, b) =>
          a - b
      );

  console.log(
    `  ${spectralKey}`
  );

  console.log(
    `    conjugacy-class count: ${records.length}`
  );

  console.log(
    `    class sizes: ${sizes.join(", ")}`
  );
}


/*
 * Explicitly inspect the Phi_12 population.
 */
const phi12Records =
  G288_CONJUGACY_CLASS_RECORDS.filter(
    (record) =>
      record.characteristicPolynomial ===
      "x^4 - x^2 + 1"
  );

const phi12Total =
  phi12Records.reduce(
    (sum, record) =>
      sum + record.classSize,
    0
  );

assert(
  phi12Total === 96,
  `Phi_12 conjugacy classes must total 96 elements; found ${phi12Total}.`
);

console.log("");

console.log(
  "Phi_12 conjugacy structure:"
);

console.log(
  `  number of conjugacy classes: ${phi12Records.length}`
);

console.log(
  `  class sizes: ${phi12Records.map((record) => record.classSize).sort((a,b) => a-b).join(", ")}`
);

console.log(
  `  total elements: ${phi12Total}`
);


/*
 * Exact orbit-centralizer identity for every class.
 */
for (
  const record of
    G288_CONJUGACY_CLASS_RECORDS
) {
  assert(
    record.classSize *
      record.centralizerSize ===
      288,
    "Every class must satisfy |Cl(g)| |C_G(g)| = 288."
  );
}


console.log("");

console.log(
  "PASS: complete exact conjugacy-class partition"
);

console.log(
  "PASS: every conjugacy class is spectrally uniform"
);

console.log(
  "PASS: exact centralizer for every conjugacy class"
);

console.log(
  "PASS: |Cl(g)| |C_G(g)| = 288 for every class"
);

console.log(
  "PASS: conjugacy classes cross-referenced with K_32"
);

console.log(
  "PASS: conjugacy classes cross-referenced with C_3 x C_3 quotient coordinates"
);

console.log(
  "PASS: conjugacy classes cross-referenced with tetrahedral action"
);

console.log(
  "PASS: Phi_12 conjugacy classes account for all 96 Phi_12 elements"
);

console.log("");

console.log(
  "STEP 10 PASSED"
);
