import {
  PAIRED_EDGE_DATA,
  PAIRED_OPPOSITE_EDGE_DATA,
  PAIRED_VERTEX_DATA,
  QUOTIENT_TO_PAIRED_OPPOSITE_EDGE,
  pairedOppositeEdgePairKey,
  sameElementSet,
  validatePairedTetrahedralActions,
} from "../math/pairedTetrahedralActions.mjs";

import {
  K32,
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
  "Quaternionic 288-Group — Step 9 diagnostic"
);

console.log("");


const summary =
  validatePairedTetrahedralActions();


assert(
  summary.pairedOppositeEdgeOrbitSize === 9,
  "Paired opposite-edge orbit must have size 9."
);

assert(
  summary.pairedOppositeEdgeStabilizerSize === 32,
  "Paired opposite-edge stabilizer must have size 32."
);

assert(
  summary.pairedVertexOrbitSize === 16,
  "Paired vertex orbit must have size 16."
);

assert(
  summary.pairedVertexStabilizerSize === 18,
  "Paired vertex stabilizer must have size 18."
);

assert(
  summary.pairedEdgeOrbitSize === 36,
  "Paired edge orbit must have size 36."
);

assert(
  summary.pairedEdgeStabilizerSize === 8,
  "Paired edge stabilizer must have size 8."
);

assert(
  sameElementSet(
    PAIRED_OPPOSITE_EDGE_DATA.stabilizer,
    K32
  ),
  "The selected paired opposite-edge stabilizer must be exactly K32."
);


console.log(
  "Paired tetrahedral orbit/stabilizer structure:"
);

console.log(
  `  opposite-edge pairs: orbit ${PAIRED_OPPOSITE_EDGE_DATA.orbit.length}, stabilizer ${PAIRED_OPPOSITE_EDGE_DATA.stabilizer.length}`
);

console.log(
  `  vertices: orbit ${PAIRED_VERTEX_DATA.orbit.length}, stabilizer ${PAIRED_VERTEX_DATA.stabilizer.length}`
);

console.log(
  `  edges: orbit ${PAIRED_EDGE_DATA.orbit.length}, stabilizer ${PAIRED_EDGE_DATA.stabilizer.length}`
);


console.log("");

console.log(
  "Derived factorizations:"
);

console.log(
  "  288 = 9 x 32   (paired opposite-edge pairs)"
);

console.log(
  "  288 = 16 x 18  (paired vertices)"
);

console.log(
  "  288 = 36 x 8   (paired edges)"
);


console.log("");

console.log(
  "Critical identification:"
);

console.log(
  "  stabilizer of selected paired opposite-edge state = K_32"
);

console.log(
  "  therefore the 9 paired opposite-edge states are exactly G_288 / K_32"
);


console.log("");

console.log(
  "C_3 x C_3 quotient coordinates -> paired opposite-edge states:"
);

for (
  const record of
    [...QUOTIENT_TO_PAIRED_OPPOSITE_EDGE]
      .sort(
        (left, right) =>
          left.coordinates.a -
            right.coordinates.a ||
          left.coordinates.b -
            right.coordinates.b
      )
) {
  console.log(
    `  (${record.coordinates.a},${record.coordinates.b}) -> ${pairedOppositeEdgePairKey(record.feature)}`
  );
}


assert(
  summary.quotientFeatureBijectionSize === 9,
  "There must be a nine-to-nine quotient/paired-feature bijection."
);


console.log("");

console.log(
  "PASS: full 3 x 3 paired opposite-edge orbit"
);

console.log(
  "PASS: paired opposite-edge stabilizer has order 32"
);

console.log(
  "PASS: paired opposite-edge stabilizer is exactly K_32"
);

console.log(
  "PASS: G_288 / K_32 is exactly the nine-state paired opposite-edge action"
);

console.log(
  "PASS: full 4 x 4 paired-vertex orbit"
);

console.log(
  "PASS: paired-vertex stabilizer has order 18"
);

console.log(
  "PASS: full 6 x 6 paired-edge orbit"
);

console.log(
  "PASS: paired-edge stabilizer has order 8"
);

console.log(
  "PASS: all three stabilizers pass exact subgroup verification"
);

console.log(
  "PASS: 288 = 9 x 32"
);

console.log(
  "PASS: 288 = 16 x 18"
);

console.log(
  "PASS: 288 = 36 x 8"
);

console.log("");

console.log(
  "STEP 9 PASSED"
);
