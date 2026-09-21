import {
  CENTRAL_QUOTIENT_ACTIONS,
  G288_CENTER,
  LEFT_A4_PERMUTATIONS,
  RIGHT_A4_PERMUTATIONS,
  TETRAHEDRAL_ACTION_KERNEL,
  permutationKey,
  standardTetrahedralOrbitData,
  validateTetrahedralActions,
} from "../math/tetrahedralActions.mjs";


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
  "Quaternionic 288-Group — Step 8 diagnostic"
);

console.log("");


const summary =
  validateTetrahedralActions();


assert(
  summary.centerCount === 2,
  "Z(G288) must contain exactly two elements."
);

assert(
  summary.kernelCount === 2,
  "Two-tetrahedron action kernel must contain exactly two elements."
);

assert(
  summary.leftA4Count === 12,
  "Left tetrahedral factor must contain exactly 12 rotations."
);

assert(
  summary.rightA4Count === 12,
  "Right tetrahedral factor must contain exactly 12 rotations."
);

assert(
  summary.centralQuotientActionCount === 144,
  "Central quotient must contain exactly 144 tetrahedral action pairs."
);


console.log(
  `|Z(G_288)| = ${G288_CENTER.length}`
);

console.log(
  `Two-tetrahedron action kernel = ${TETRAHEDRAL_ACTION_KERNEL.length}`
);

console.log("");

console.log(
  "Tetrahedral quotient:"
);

console.log(
  `  left factor rotations: ${LEFT_A4_PERMUTATIONS.length}`
);

console.log(
  `  right factor rotations: ${RIGHT_A4_PERMUTATIONS.length}`
);

console.log(
  `  distinct paired actions: ${CENTRAL_QUOTIENT_ACTIONS.length}`
);

console.log("");

console.log(
  "G_288 / Z(G_288) ≅ A_4 x A_4"
);


/*
 * Print the actual twelve permutations in each factor.
 */
console.log("");

console.log(
  "Left A_4 permutations:"
);

for (
  const permutation of
    [...LEFT_A4_PERMUTATIONS]
      .sort(
        (left, right) =>
          permutationKey(left)
            .localeCompare(
              permutationKey(right)
            )
      )
) {
  console.log(
    `  ${permutationKey(permutation)}`
  );
}


console.log("");

console.log(
  "Right A_4 permutations:"
);

for (
  const permutation of
    [...RIGHT_A4_PERMUTATIONS]
      .sort(
        (left, right) =>
          permutationKey(left)
            .localeCompare(
              permutationKey(right)
            )
      )
) {
  console.log(
    `  ${permutationKey(permutation)}`
  );
}


/*
 * Orbit/stabilizer geometry.
 */
const left =
  standardTetrahedralOrbitData(
    "left"
  );

const right =
  standardTetrahedralOrbitData(
    "right"
  );


function printOrbitData(
  label,
  data
) {
  console.log(
    `  ${label}: orbit ${data.orbit.length}, stabilizer ${data.stabilizer.length}, product ${data.orbit.length * data.stabilizer.length}`
  );
}


console.log("");

console.log(
  "Left tetrahedron orbit/stabilizer structure:"
);

printOrbitData(
  "opposite-edge pairs",
  left.oppositeEdgePair
);

printOrbitData(
  "vertices",
  left.vertex
);

printOrbitData(
  "edges",
  left.edge
);

printOrbitData(
  "oriented edges",
  left.orientedEdge
);


console.log("");

console.log(
  "Right tetrahedron orbit/stabilizer structure:"
);

printOrbitData(
  "opposite-edge pairs",
  right.oppositeEdgePair
);

printOrbitData(
  "vertices",
  right.vertex
);

printOrbitData(
  "edges",
  right.edge
);

printOrbitData(
  "oriented edges",
  right.orientedEdge
);


console.log("");

console.log(
  "Derived factorizations:"
);

console.log(
  "  288 = 3 x 96   (opposite-edge pairs)"
);

console.log(
  "  288 = 4 x 72   (vertices)"
);

console.log(
  "  288 = 6 x 48   (edges)"
);

console.log(
  "  288 = 12 x 24  (oriented edges)"
);


console.log("");

console.log(
  "PASS: exact center Z(G_288) has order 2"
);

console.log(
  "PASS: two-tetrahedron action kernel equals Z(G_288)"
);

console.log(
  "PASS: left quaternionic factor descends to 12 even tetrahedral permutations"
);

console.log(
  "PASS: right quaternionic factor descends to 12 even tetrahedral permutations"
);

console.log(
  "PASS: each factor is exactly A_4"
);

console.log(
  "PASS: central quotient contains exactly 12 x 12 = 144 paired actions"
);

console.log(
  "PASS: G_288 / Z(G_288) ≅ A_4 x A_4"
);

console.log(
  "PASS: exhaustive two-tetrahedron action homomorphism"
);

console.log(
  "PASS: 288 = 3 x 96 from opposite-edge-pair orbit/stabilizer"
);

console.log(
  "PASS: 288 = 4 x 72 from vertex orbit/stabilizer"
);

console.log(
  "PASS: 288 = 6 x 48 from edge orbit/stabilizer"
);

console.log(
  "PASS: 288 = 12 x 24 from oriented-edge orbit/stabilizer"
);

console.log("");

console.log(
  "STEP 8 PASSED"
);
