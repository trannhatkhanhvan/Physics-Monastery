import {
  CENTRAL_MINUS_IDENTITY,
} from "../math/spectralClassification.mjs";

import {
  G288_IDENTITY,
  composeG288,
  projectiveEquals,
} from "../math/group288.mjs";

import {
  K32,
  K32_CENTRAL_ELEMENTS,
  K32_COMPLEX_STRUCTURES,
  K32_COMPLEX_STRUCTURE_PAIRS,
  K32_NONCENTRAL_INVOLUTIONS,
  NAMED_COMPLEX_DIRECTIONS,
  complexStructurePairContaining,
  spectralRecordForK32,
  validateK32,
} from "../math/subgroups.mjs";


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
  "Quaternionic 288-Group — Step 6 diagnostic"
);

console.log("");


const summary =
  validateK32();


assert(
  summary.count === 32,
  "K32 must contain exactly 32 elements."
);

assert(
  summary.centerInK32Count === 2,
  "K32 must have exactly two central elements."
);

assert(
  summary.noncentralInvolutionCount === 18,
  "K32 must contain exactly 18 noncentral involutions."
);

assert(
  summary.complexStructureCount === 12,
  "K32 must contain exactly 12 J^2=-I elements."
);

assert(
  summary.complexDirectionCount === 6,
  "The twelve J^2=-I elements must form exactly six opposite pairs."
);


/*
 * Inspect the complete spectral distribution inside K32.
 */
const spectralCounts =
  new Map();

for (
  const element of K32
) {
  const record =
    spectralRecordForK32(
      element
    );

  const label =
    [
      `order ${record.order}`,
      record.characteristicPolynomialText,
    ].join(" | ");

  spectralCounts.set(
    label,
    (
      spectralCounts.get(label) ??
      0
    ) + 1
  );
}


console.log(
  `|K_32| = ${summary.count}`
);

console.log(
  "Normality: passed exhaustive 288 x 32 conjugation test"
);

console.log("");

console.log(
  "Spectral structure inside K_32:"
);

for (
  const [
    label,
    count,
  ] of [
    ...spectralCounts.entries(),
  ].sort()
) {
  console.log(
    `  ${label}: ${count}`
  );
}


console.log("");

console.log(
  "Intrinsic decomposition:"
);

console.log(
  `  center: ${K32_CENTRAL_ELEMENTS.length}`
);

console.log(
  `  noncentral involutions: ${K32_NONCENTRAL_INVOLUTIONS.length}`
);

console.log(
  `  J^2 = -I elements: ${K32_COMPLEX_STRUCTURES.length}`
);

console.log(
  `  opposite J/~J directions: ${K32_COMPLEX_STRUCTURE_PAIRS.length}`
);


/*
 * Every J in the 12-element class must square to -I.
 */
for (
  const element of
    K32_COMPLEX_STRUCTURES
) {
  assert(
    projectiveEquals(
      composeG288(
        element,
        element
      ),
      CENTRAL_MINUS_IDENTITY
    ),
    "Every complex-structure element must satisfy J^2=-I."
  );
}


/*
 * The center must be exactly I and -I.
 */
assert(
  K32_CENTRAL_ELEMENTS.some(
    (element) =>
      projectiveEquals(
        element,
        G288_IDENTITY
      )
  ),
  "Identity must lie in Z(K32)."
);

assert(
  K32_CENTRAL_ELEMENTS.some(
    (element) =>
      projectiveEquals(
        element,
        CENTRAL_MINUS_IDENTITY
      )
  ),
  "-I must lie in Z(K32)."
);


/*
 * Print the six named directions and their opposite partners.
 */
console.log("");

console.log(
  "Six projective complex-structure directions:"
);

for (
  const {
    label,
    representative,
  } of NAMED_COMPLEX_DIRECTIONS
) {
  const pair =
    complexStructurePairContaining(
      representative
    );

  assert(
    pair != null,
    `${label} must belong to one of the six opposite pairs.`
  );

  const opposite =
    pair.find(
      (element) =>
        !projectiveEquals(
          element,
          representative
        )
    );

  console.log(
    `  ${label}`
  );

  console.log(
    `    representative: ${representative.key}`
  );

  console.log(
    `    central opposite: ${opposite.key}`
  );
}


/*
 * Confirm all six named directions occupy distinct pairs.
 */
const namedPairKeys =
  NAMED_COMPLEX_DIRECTIONS.map(
    ({ representative }) => {
      const pair =
        complexStructurePairContaining(
          representative
        );

      return pair
        .map(
          (element) =>
            element.key
        )
        .sort()
        .join(" || ");
    }
  );

assert(
  new Set(
    namedPairKeys
  ).size === 6,
  "L_i,L_j,L_k,R_i,R_j,R_k must represent six distinct directions."
);


console.log("");

console.log(
  "PASS: K_32 constructed directly from Q8 x Q8"
);

console.log(
  "PASS: exactly 32 projective elements"
);

console.log(
  "PASS: exhaustive K_32 closure and inverses"
);

console.log(
  "PASS: K_32 is normal in G_288"
);

console.log(
  "PASS: Z(K_32) = {I,-I}"
);

console.log(
  "PASS: intrinsic decomposition 32 = 2 + 18 + 12"
);

console.log(
  "PASS: exactly 18 noncentral involutions"
);

console.log(
  "PASS: exactly 12 elements satisfy J^2 = -I"
);

console.log(
  "PASS: the 12 complex structures form six opposite pairs"
);

console.log(
  "PASS: the six pairs are L_i,L_j,L_k,R_i,R_j,R_k"
);

console.log("");

console.log(
  "STEP 6 PASSED"
);
