/*
 * Exact tetrahedral quotient/action layer for G_288.
 *
 * Each 2T factor acts on the imaginary quaternion space by
 *
 *   v -> a v a^{-1}.
 *
 * This descends through ±a and gives the ordinary tetrahedral
 * rotation group A4.
 *
 * For g = [a,b] in G_288 we therefore obtain
 *
 *   (rho_L(a), rho_R(b)) in A4 x A4.
 */

import {
  ONE,
  multiply,
  quaternion,
  serialize,
} from "./quaternion.mjs";

import {
  inverseHurwitz,
} from "./hurwitzUnits.mjs";

import {
  G288,
  G288_IDENTITY,
  composeG288,
  projectiveEquals,
} from "./group288.mjs";

import {
  isCentralInG288,
} from "./subgroups.mjs";


/*
 * Four tetrahedral vertices embedded as pure imaginary quaternions.
 *
 * They are proportional to
 *
 *   ( 1, 1, 1)
 *   ( 1,-1,-1)
 *   (-1, 1,-1)
 *   (-1,-1, 1)
 *
 * in Im(H) ≅ R^3.
 */
export const TETRAHEDRON_VERTICES =
  Object.freeze([
    quaternion(0, 2, 2, 2),
    quaternion(0, 2, -2, -2),
    quaternion(0, -2, 2, -2),
    quaternion(0, -2, -2, 2),
  ]);


const TETRAHEDRON_VERTEX_INDEX_BY_KEY =
  new Map(
    TETRAHEDRON_VERTICES.map(
      (vertex, index) => [
        serialize(vertex),
        index,
      ]
    )
  );


export function conjugateImaginaryByHurwitz(
  hurwitzUnit,
  imaginaryQuaternion
) {
  return multiply(
    multiply(
      hurwitzUnit,
      imaginaryQuaternion
    ),
    inverseHurwitz(
      hurwitzUnit
    )
  );
}


export function tetrahedralPermutation(
  hurwitzUnit
) {
  const permutation =
    TETRAHEDRON_VERTICES.map(
      (vertex) => {
        const image =
          conjugateImaginaryByHurwitz(
            hurwitzUnit,
            vertex
          );

        const index =
          TETRAHEDRON_VERTEX_INDEX_BY_KEY.get(
            serialize(image)
          );

        if (
          index == null
        ) {
          throw new Error(
            "Hurwitz conjugation did not preserve the tetrahedral vertex set.\n" +
            `unit=${serialize(hurwitzUnit)}\n` +
            `image=${serialize(image)}`
          );
        }

        return index;
      }
    );

  return Object.freeze(
    permutation
  );
}


export function permutationKey(
  permutation
) {
  return permutation.join("");
}


export function composePermutations(
  left,
  right
) {
  /*
   * Function-composition convention:
   *
   *   (left o right)(v)
   *      = left(right(v)).
   */
  return Object.freeze(
    right.map(
      (image) =>
        left[image]
    )
  );
}


export const IDENTITY_TETRAHEDRAL_PERMUTATION =
  Object.freeze([
    0, 1, 2, 3,
  ]);


export function permutationsEqual(
  left,
  right
) {
  return (
    left.length === right.length &&
    left.every(
      (value, index) =>
        value === right[index]
    )
  );
}


export function permutationParity(
  permutation
) {
  let inversions = 0;

  for (
    let left = 0;
    left < permutation.length;
    left += 1
  ) {
    for (
      let right = left + 1;
      right < permutation.length;
      right += 1
    ) {
      if (
        permutation[left] >
        permutation[right]
      ) {
        inversions += 1;
      }
    }
  }

  return (
    inversions % 2 === 0
      ? 1
      : -1
  );
}


export function tetrahedralActionForG288(
  element
) {
  return Object.freeze({
    left:
      tetrahedralPermutation(
        element.a
      ),

    right:
      tetrahedralPermutation(
        element.b
      ),
  });
}


export function tetrahedralActionKey(
  action
) {
  return (
    `${permutationKey(action.left)}|` +
    `${permutationKey(action.right)}`
  );
}


export const G288_TETRAHEDRAL_ACTION_RECORDS =
  Object.freeze(
    G288.map(
      (element) => {
        const action =
          tetrahedralActionForG288(
            element
          );

        return Object.freeze({
          element,
          action,
          key:
            tetrahedralActionKey(
              action
            ),
        });
      }
    )
  );


export const LEFT_A4_PERMUTATIONS =
  Object.freeze(
    [
      ...new Map(
        G288_TETRAHEDRAL_ACTION_RECORDS.map(
          (record) => [
            permutationKey(
              record.action.left
            ),
            record.action.left,
          ]
        )
      ).values(),
    ]
  );


export const RIGHT_A4_PERMUTATIONS =
  Object.freeze(
    [
      ...new Map(
        G288_TETRAHEDRAL_ACTION_RECORDS.map(
          (record) => [
            permutationKey(
              record.action.right
            ),
            record.action.right,
          ]
        )
      ).values(),
    ]
  );


export const G288_CENTER =
  Object.freeze(
    G288.filter(
      (element) =>
        isCentralInG288(
          element
        )
    )
  );


export const TETRAHEDRAL_ACTION_KERNEL =
  Object.freeze(
    G288_TETRAHEDRAL_ACTION_RECORDS
      .filter(
        (record) =>
          permutationsEqual(
            record.action.left,
            IDENTITY_TETRAHEDRAL_PERMUTATION
          ) &&
          permutationsEqual(
            record.action.right,
            IDENTITY_TETRAHEDRAL_PERMUTATION
          )
      )
      .map(
        (record) =>
          record.element
      )
  );


export const CENTRAL_QUOTIENT_ACTIONS =
  Object.freeze(
    [
      ...new Map(
        G288_TETRAHEDRAL_ACTION_RECORDS.map(
          (record) => [
            record.key,
            record.action,
          ]
        )
      ).values(),
    ]
  );


/*
 * Tetrahedral combinatorial features.
 */
export const TETRAHEDRON_VERTEX_FEATURES =
  Object.freeze([
    0, 1, 2, 3,
  ]);


function unorderedPairKey(
  left,
  right
) {
  return [
    left,
    right,
  ]
    .sort(
      (a, b) =>
        a - b
    )
    .join("-");
}


export const TETRAHEDRON_EDGE_FEATURES =
  Object.freeze(
    [
      [0, 1],
      [0, 2],
      [0, 3],
      [1, 2],
      [1, 3],
      [2, 3],
    ].map(
      (edge) =>
        Object.freeze(
          [...edge]
        )
    )
  );


export const TETRAHEDRON_ORIENTED_EDGE_FEATURES =
  Object.freeze(
    TETRAHEDRON_VERTEX_FEATURES.flatMap(
      (start) =>
        TETRAHEDRON_VERTEX_FEATURES
          .filter(
            (end) =>
              end !== start
          )
          .map(
            (end) =>
              Object.freeze([
                start,
                end,
              ])
          )
    )
  );


export const TETRAHEDRON_OPPOSITE_EDGE_PAIR_FEATURES =
  Object.freeze([
    Object.freeze([
      Object.freeze([0, 1]),
      Object.freeze([2, 3]),
    ]),

    Object.freeze([
      Object.freeze([0, 2]),
      Object.freeze([1, 3]),
    ]),

    Object.freeze([
      Object.freeze([0, 3]),
      Object.freeze([1, 2]),
    ]),
  ]);


export function vertexFeatureKey(
  vertex
) {
  return String(vertex);
}


export function edgeFeatureKey(
  edge
) {
  return unorderedPairKey(
    edge[0],
    edge[1]
  );
}


export function orientedEdgeFeatureKey(
  edge
) {
  return `${edge[0]}>${edge[1]}`;
}


export function oppositeEdgePairFeatureKey(
  pair
) {
  return pair
    .map(
      (edge) =>
        edgeFeatureKey(edge)
    )
    .sort()
    .join("|");
}


export function actOnVertex(
  permutation,
  vertex
) {
  return permutation[vertex];
}


export function actOnEdge(
  permutation,
  edge
) {
  return Object.freeze([
    permutation[edge[0]],
    permutation[edge[1]],
  ]);
}


export function actOnOrientedEdge(
  permutation,
  edge
) {
  return Object.freeze([
    permutation[edge[0]],
    permutation[edge[1]],
  ]);
}


export function actOnOppositeEdgePair(
  permutation,
  pair
) {
  return Object.freeze(
    pair.map(
      (edge) =>
        actOnEdge(
          permutation,
          edge
        )
    )
  );
}


function factorPermutation(
  element,
  factor
) {
  const action =
    tetrahedralActionForG288(
      element
    );

  if (
    factor === "left"
  ) {
    return action.left;
  }

  if (
    factor === "right"
  ) {
    return action.right;
  }

  throw new RangeError(
    `Unknown tetrahedral factor: ${factor}`
  );
}


export function featureOrbitAndStabilizer({
  factor,
  feature,
  act,
  key,
}) {
  const orbitByKey =
    new Map();

  const stabilizer = [];

  const originalKey =
    key(feature);

  for (
    const element of G288
  ) {
    const permutation =
      factorPermutation(
        element,
        factor
      );

    const image =
      act(
        permutation,
        feature
      );

    const imageKey =
      key(image);

    if (
      !orbitByKey.has(
        imageKey
      )
    ) {
      orbitByKey.set(
        imageKey,
        image
      );
    }

    if (
      imageKey ===
      originalKey
    ) {
      stabilizer.push(
        element
      );
    }
  }

  return Object.freeze({
    orbit:
      Object.freeze(
        [...orbitByKey.values()]
      ),

    stabilizer:
      Object.freeze(
        stabilizer
      ),
  });
}


export function standardTetrahedralOrbitData(
  factor = "left"
) {
  return Object.freeze({
    oppositeEdgePair:
      featureOrbitAndStabilizer({
        factor,
        feature:
          TETRAHEDRON_OPPOSITE_EDGE_PAIR_FEATURES[0],
        act:
          actOnOppositeEdgePair,
        key:
          oppositeEdgePairFeatureKey,
      }),

    vertex:
      featureOrbitAndStabilizer({
        factor,
        feature:
          TETRAHEDRON_VERTEX_FEATURES[0],
        act:
          actOnVertex,
        key:
          vertexFeatureKey,
      }),

    edge:
      featureOrbitAndStabilizer({
        factor,
        feature:
          TETRAHEDRON_EDGE_FEATURES[0],
        act:
          actOnEdge,
        key:
          edgeFeatureKey,
      }),

    orientedEdge:
      featureOrbitAndStabilizer({
        factor,
        feature:
          TETRAHEDRON_ORIENTED_EDGE_FEATURES[0],
        act:
          actOnOrientedEdge,
        key:
          orientedEdgeFeatureKey,
      }),
  });
}


export function validateTetrahedralActions() {
  if (
    G288_CENTER.length !== 2
  ) {
    throw new Error(
      `Expected |Z(G288)| = 2; found ${G288_CENTER.length}.`
    );
  }

  if (
    TETRAHEDRAL_ACTION_KERNEL.length !== 2
  ) {
    throw new Error(
      "Expected two-tetrahedron action kernel to have size 2."
    );
  }

  const centerKeys =
    new Set(
      G288_CENTER.map(
        (element) =>
          element.key
      )
    );

  const kernelKeys =
    new Set(
      TETRAHEDRAL_ACTION_KERNEL.map(
        (element) =>
          element.key
      )
    );

  if (
    centerKeys.size !==
      kernelKeys.size ||
    [
      ...centerKeys,
    ].some(
      (key) =>
        !kernelKeys.has(key)
    )
  ) {
    throw new Error(
      "Kernel of tetrahedral action is not exactly Z(G288)."
    );
  }

  if (
    LEFT_A4_PERMUTATIONS.length !== 12
  ) {
    throw new Error(
      `Expected 12 left tetrahedral rotations; found ${LEFT_A4_PERMUTATIONS.length}.`
    );
  }

  if (
    RIGHT_A4_PERMUTATIONS.length !== 12
  ) {
    throw new Error(
      `Expected 12 right tetrahedral rotations; found ${RIGHT_A4_PERMUTATIONS.length}.`
    );
  }

  for (
    const permutation of
      LEFT_A4_PERMUTATIONS
  ) {
    if (
      permutationParity(
        permutation
      ) !== 1
    ) {
      throw new Error(
        "Left tetrahedral image contains an odd permutation."
      );
    }
  }

  for (
    const permutation of
      RIGHT_A4_PERMUTATIONS
  ) {
    if (
      permutationParity(
        permutation
      ) !== 1
    ) {
      throw new Error(
        "Right tetrahedral image contains an odd permutation."
      );
    }
  }

  /*
   * Verify closure of each 12-element permutation image.
   */
  const leftKeys =
    new Set(
      LEFT_A4_PERMUTATIONS.map(
        permutationKey
      )
    );

  const rightKeys =
    new Set(
      RIGHT_A4_PERMUTATIONS.map(
        permutationKey
      )
    );

  for (
    const left of
      LEFT_A4_PERMUTATIONS
  ) {
    for (
      const right of
        LEFT_A4_PERMUTATIONS
    ) {
      if (
        !leftKeys.has(
          permutationKey(
            composePermutations(
              left,
              right
            )
          )
        )
      ) {
        throw new Error(
          "Left tetrahedral image is not closed."
        );
      }
    }
  }

  for (
    const left of
      RIGHT_A4_PERMUTATIONS
  ) {
    for (
      const right of
        RIGHT_A4_PERMUTATIONS
    ) {
      if (
        !rightKeys.has(
          permutationKey(
            composePermutations(
              left,
              right
            )
          )
        )
      ) {
        throw new Error(
          "Right tetrahedral image is not closed."
        );
      }
    }
  }

  /*
   * The full image must be all 12 x 12 pairs.
   */
  if (
    CENTRAL_QUOTIENT_ACTIONS.length !==
    144
  ) {
    throw new Error(
      `Expected 144 distinct A4 x A4 actions; found ${CENTRAL_QUOTIENT_ACTIONS.length}.`
    );
  }

  /*
   * Exhaustively verify the action map is a homomorphism.
   */
  for (
    const left of G288
  ) {
    const leftAction =
      tetrahedralActionForG288(
        left
      );

    for (
      const right of G288
    ) {
      const rightAction =
        tetrahedralActionForG288(
          right
        );

      const product =
        composeG288(
          left,
          right
        );

      const productAction =
        tetrahedralActionForG288(
          product
        );

      const expectedLeft =
        composePermutations(
          leftAction.left,
          rightAction.left
        );

      const expectedRight =
        composePermutations(
          leftAction.right,
          rightAction.right
        );

      if (
        !permutationsEqual(
          productAction.left,
          expectedLeft
        ) ||
        !permutationsEqual(
          productAction.right,
          expectedRight
        )
      ) {
        throw new Error(
          "Two-tetrahedron action is not a group homomorphism."
        );
      }
    }
  }

  const leftOrbitData =
    standardTetrahedralOrbitData(
      "left"
    );

  const rightOrbitData =
    standardTetrahedralOrbitData(
      "right"
    );

  const expected = [
    [
      "oppositeEdgePair",
      3,
      96,
    ],
    [
      "vertex",
      4,
      72,
    ],
    [
      "edge",
      6,
      48,
    ],
    [
      "orientedEdge",
      12,
      24,
    ],
  ];

  for (
    const [
      label,
      orbitSize,
      stabilizerSize,
    ] of expected
  ) {
    for (
      const data of [
        leftOrbitData[label],
        rightOrbitData[label],
      ]
    ) {
      if (
        data.orbit.length !==
        orbitSize
      ) {
        throw new Error(
          `${label} orbit size mismatch: expected ${orbitSize}, found ${data.orbit.length}.`
        );
      }

      if (
        data.stabilizer.length !==
        stabilizerSize
      ) {
        throw new Error(
          `${label} stabilizer size mismatch: expected ${stabilizerSize}, found ${data.stabilizer.length}.`
        );
      }

      if (
        data.orbit.length *
          data.stabilizer.length !==
        288
      ) {
        throw new Error(
          `Orbit-stabilizer product failed for ${label}.`
        );
      }
    }
  }

  return Object.freeze({
    centerCount:
      G288_CENTER.length,

    kernelCount:
      TETRAHEDRAL_ACTION_KERNEL.length,

    leftA4Count:
      LEFT_A4_PERMUTATIONS.length,

    rightA4Count:
      RIGHT_A4_PERMUTATIONS.length,

    centralQuotientActionCount:
      CENTRAL_QUOTIENT_ACTIONS.length,

    leftOrbitData,
    rightOrbitData,
  });
}
