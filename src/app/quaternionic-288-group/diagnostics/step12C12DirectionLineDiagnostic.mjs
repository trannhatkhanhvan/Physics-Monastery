import {
  C12_DIRECTION_LINE_RECORDS,
  K32_C4_DIRECTIONS,
  QUOTIENT_LINES,
  validateC12DirectionLineStructure,
} from "../math/c12DirectionLineStructure.mjs";


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
  "Quaternionic 288-Group — Step 12 diagnostic"
);

console.log("");


const summary =
  validateC12DirectionLineStructure();


assert(
  summary.c4DirectionCount === 6,
  "There must be exactly six C4 directions."
);

assert(
  summary.quotientLineCount === 4,
  "There must be exactly four quotient lines."
);

assert(
  summary.c12Count === 24,
  "There must be exactly 24 C12 subgroups."
);

assert(
  summary.distinctPairCount === 24,
  "All 24 direction-line combinations must occur exactly once."
);


console.log(
  `C_4 directions in K_32: ${summary.c4DirectionCount}`
);

console.log(
  `C_3 quotient lines: ${summary.quotientLineCount}`
);

console.log(
  `C_12 subgroups: ${summary.c12Count}`
);

console.log("");

console.log(
  "Derived C_4 directions:"
);

for (
  const direction of
    K32_C4_DIRECTIONS
) {
  console.log(
    `  ${direction.label}`
  );

  console.log(
    `    generator order: 4`
  );

  console.log(
    `    subgroup size: ${direction.elements.length}`
  );
}


console.log("");

console.log(
  "Four lines in C_3 x C_3:"
);

for (
  const line of
    QUOTIENT_LINES
) {
  console.log(
    `  ${line.label}: <(${line.representative.a},${line.representative.b})>`
  );
}


console.log("");

console.log(
  "C_12 direction-line table:"
);

for (
  const direction of
    K32_C4_DIRECTIONS
) {
  console.log(
    `  ${direction.label}:`
  );

  const records =
    C12_DIRECTION_LINE_RECORDS
      .filter(
        (record) =>
          record.c4Direction.label ===
          direction.label
      )
      .sort(
        (left, right) =>
          left.quotientLine.label
            .localeCompare(
              right.quotientLine.label
            )
      );

  for (
    const record of records
  ) {
    console.log(
      `    ${record.quotientLine.label} -> C_12 #${record.c12Index + 1}`
    );
  }
}


console.log("");

console.log(
  "Incidence counts:"
);

for (
  const direction of
    K32_C4_DIRECTIONS
) {
  console.log(
    `  ${direction.label}: ${summary.directionCounts[direction.label]} C_12 subgroups`
  );
}

for (
  const line of
    QUOTIENT_LINES
) {
  console.log(
    `  ${line.label}: ${summary.lineCounts[line.label]} C_12 subgroups`
  );
}


console.log("");

console.log(
  "PASS: exactly six cyclic C_4 directions in K_32"
);

console.log(
  "PASS: exactly four order-3 lines in C_3 x C_3"
);

console.log(
  "PASS: every C_12 intersects K_32 in exactly one C_4"
);

console.log(
  "PASS: every C_12 projects onto exactly one quotient C_3 line"
);

console.log(
  "PASS: every C_4 direction occurs in exactly four C_12 subgroups"
);

console.log(
  "PASS: every quotient line occurs in exactly six C_12 subgroups"
);

console.log(
  "PASS: all 6 x 4 = 24 direction-line pairs occur exactly once"
);

console.log("");

console.log(
  "Therefore:"
);

console.log(
  "  C_12 subgroups ≅ {6 C_4 directions} x {4 quotient lines}"
);

console.log(
  "  24 = 6 x 4"
);

console.log("");

console.log(
  "STEP 12 PASSED"
);
