/*
 * Exact paired-feature actions across the two tetrahedral factors.
 *
 * For g = [a,b] in G_288, the central quotient supplies
 *
 *   (rho_L(a), rho_R(b)) in A4 x A4.
 *
 * We now let those two permutations act simultaneously on
 * combinatorial features of two tetrahedra.
 */

import {
  G288,
  composeG288,
  inverseG288,
} from "./group288.mjs";

import {
  K32,
} from "./subgroups.mjs";

import {
  G288_OVER_K32_COSETS,
  quotientCoordinates,
} from "./quotientC3xC3.mjs";

import {
  TETRAHEDRON_EDGE_FEATURES,
  TETRAHEDRON_OPPOSITE_EDGE_PAIR_FEATURES,
  TETRAHEDRON_VERTEX_FEATURES,
  actOnEdge,
  actOnOppositeEdgePair,
  actOnVertex,
  edgeFeatureKey,
  oppositeEdgePairFeatureKey,
  tetrahedralActionForG288,
  vertexFeatureKey,
} from "./tetrahedralActions.mjs";


function pairedFeatureKey(
  leftFeature,
  rightFeature,
  singleFeatureKey
) {
  return (
    `${singleFeatureKey(leftFeature)}` +
    `::` +
    `${singleFeatureKey(rightFeature)}`
  );
}


export function pairedVertexKey(
  pair
) {
  return pairedFeatureKey(
    pair.left,
    pair.right,
    vertexFeatureKey
  );
}


export function pairedEdgeKey(
  pair
) {
  return pairedFeatureKey(
    pair.left,
    pair.right,
    edgeFeatureKey
  );
}


export function pairedOppositeEdgePairKey(
  pair
) {
  return pairedFeatureKey(
    pair.left,
    pair.right,
    oppositeEdgePairFeatureKey
  );
}


export function actOnPairedVertex(
  element,
  pair
) {
  const action =
    tetrahedralActionForG288(
      element
    );

  return Object.freeze({
    left:
      actOnVertex(
        action.left,
        pair.left
      ),

    right:
      actOnVertex(
        action.right,
        pair.right
      ),
  });
}


export function actOnPairedEdge(
  element,
  pair
) {
  const action =
    tetrahedralActionForG288(
      element
    );

  return Object.freeze({
    left:
      actOnEdge(
        action.left,
        pair.left
      ),

    right:
      actOnEdge(
        action.right,
        pair.right
      ),
  });
}


export function actOnPairedOppositeEdgePair(
  element,
  pair
) {
  const action =
    tetrahedralActionForG288(
      element
    );

  return Object.freeze({
    left:
      actOnOppositeEdgePair(
        action.left,
        pair.left
      ),

    right:
      actOnOppositeEdgePair(
        action.right,
        pair.right
      ),
  });
}


function pairedOrbitAndStabilizer({
  feature,
  act,
  key,
}) {
  const originalKey =
    key(feature);

  const orbitByKey =
    new Map();

  const stabilizer = [];

  for (
    const element of G288
  ) {
    const image =
      act(
        element,
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
    feature,

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


export const BASE_PAIRED_OPPOSITE_EDGE_PAIR =
  Object.freeze({
    left:
      TETRAHEDRON_OPPOSITE_EDGE_PAIR_FEATURES[0],

    right:
      TETRAHEDRON_OPPOSITE_EDGE_PAIR_FEATURES[0],
  });


export const BASE_PAIRED_VERTEX =
  Object.freeze({
    left:
      TETRAHEDRON_VERTEX_FEATURES[0],

    right:
      TETRAHEDRON_VERTEX_FEATURES[0],
  });


export const BASE_PAIRED_EDGE =
  Object.freeze({
    left:
      TETRAHEDRON_EDGE_FEATURES[0],

    right:
      TETRAHEDRON_EDGE_FEATURES[0],
  });


export const PAIRED_OPPOSITE_EDGE_DATA =
  pairedOrbitAndStabilizer({
    feature:
      BASE_PAIRED_OPPOSITE_EDGE_PAIR,

    act:
      actOnPairedOppositeEdgePair,

    key:
      pairedOppositeEdgePairKey,
  });


export const PAIRED_VERTEX_DATA =
  pairedOrbitAndStabilizer({
    feature:
      BASE_PAIRED_VERTEX,

    act:
      actOnPairedVertex,

    key:
      pairedVertexKey,
  });


export const PAIRED_EDGE_DATA =
  pairedOrbitAndStabilizer({
    feature:
      BASE_PAIRED_EDGE,

    act:
      actOnPairedEdge,

    key:
      pairedEdgeKey,
  });


function elementKeySet(
  elements
) {
  return new Set(
    elements.map(
      (element) =>
        element.key
    )
  );
}


export function sameElementSet(
  left,
  right
) {
  if (
    left.length !==
    right.length
  ) {
    return false;
  }

  const leftKeys =
    elementKeySet(left);

  return right.every(
    (element) =>
      leftKeys.has(
        element.key
      )
  );
}


export function isSubgroupOfG288(
  elements
) {
  const keys =
    elementKeySet(
      elements
    );

  if (
    keys.size !==
    elements.length
  ) {
    return false;
  }

  for (
    const element of elements
  ) {
    const inverse =
      inverseG288(
        element
      );

    if (
      !keys.has(
        inverse.key
      )
    ) {
      return false;
    }
  }

  for (
    const left of elements
  ) {
    for (
      const right of elements
    ) {
      const product =
        composeG288(
          left,
          right
        );

      if (
        !keys.has(
          product.key
        )
      ) {
        return false;
      }
    }
  }

  return true;
}


/*
 * Map every K32 coset to the paired opposite-edge state reached
 * by any representative of that coset.
 *
 * If K32 is exactly the stabilizer of the base paired state,
 * this must be a well-defined bijection between:
 *
 *   G288 / K32
 *
 * and
 *
 *   the 9 paired opposite-edge states.
 */
function buildQuotientToPairedOppositeEdgeMap() {
  const records = [];

  for (
    const coset of
      G288_OVER_K32_COSETS
  ) {
    const representative =
      coset.representative;

    const image =
      actOnPairedOppositeEdgePair(
        representative,
        BASE_PAIRED_OPPOSITE_EDGE_PAIR
      );

    const imageKey =
      pairedOppositeEdgePairKey(
        image
      );

    /*
     * Verify every representative in this coset reaches exactly
     * the same paired feature.
     */
    for (
      const element of
        coset.elements
    ) {
      const candidateImage =
        actOnPairedOppositeEdgePair(
          element,
          BASE_PAIRED_OPPOSITE_EDGE_PAIR
        );

      if (
        pairedOppositeEdgePairKey(
          candidateImage
        ) !== imageKey
      ) {
        throw new Error(
          "A K32 coset does not define a unique paired opposite-edge state."
        );
      }
    }

    const coordinates =
      quotientCoordinates(
        coset
      );

    if (!coordinates) {
      throw new Error(
        "Quotient coset is missing C3 x C3 coordinates."
      );
    }

    records.push(
      Object.freeze({
        coset,
        coordinates,
        feature:
          image,
        featureKey:
          imageKey,
      })
    );
  }

  return records;
}


export const QUOTIENT_TO_PAIRED_OPPOSITE_EDGE =
  Object.freeze(
    buildQuotientToPairedOppositeEdgeMap()
  );


export function validatePairedTetrahedralActions() {
  const cases = [
    Object.freeze({
      label:
        "paired opposite-edge pairs",
      data:
        PAIRED_OPPOSITE_EDGE_DATA,
      expectedOrbitSize:
        9,
      expectedStabilizerSize:
        32,
    }),

    Object.freeze({
      label:
        "paired vertices",
      data:
        PAIRED_VERTEX_DATA,
      expectedOrbitSize:
        16,
      expectedStabilizerSize:
        18,
    }),

    Object.freeze({
      label:
        "paired edges",
      data:
        PAIRED_EDGE_DATA,
      expectedOrbitSize:
        36,
      expectedStabilizerSize:
        8,
    }),
  ];

  for (
    const testCase of cases
  ) {
    const {
      label,
      data,
      expectedOrbitSize,
      expectedStabilizerSize,
    } =
      testCase;

    if (
      data.orbit.length !==
      expectedOrbitSize
    ) {
      throw new Error(
        `${label} orbit mismatch: expected ${expectedOrbitSize}, found ${data.orbit.length}.`
      );
    }

    if (
      data.stabilizer.length !==
      expectedStabilizerSize
    ) {
      throw new Error(
        `${label} stabilizer mismatch: expected ${expectedStabilizerSize}, found ${data.stabilizer.length}.`
      );
    }

    if (
      data.orbit.length *
        data.stabilizer.length !==
      288
    ) {
      throw new Error(
        `Orbit-stabilizer theorem failed for ${label}.`
      );
    }

    if (
      !isSubgroupOfG288(
        data.stabilizer
      )
    ) {
      throw new Error(
        `${label} stabilizer failed exact subgroup verification.`
      );
    }
  }

  /*
   * The selected paired opposite-edge stabilizer must not merely
   * have order 32. It must be exactly the already-constructed K32.
   */
  if (
    !sameElementSet(
      PAIRED_OPPOSITE_EDGE_DATA.stabilizer,
      K32
    )
  ) {
    throw new Error(
      "Paired opposite-edge stabilizer is not exactly K32."
    );
  }

  /*
   * There must be one paired opposite-edge state for every
   * Cartesian-product choice:
   *
   *   3 left choices x 3 right choices = 9.
   */
  const expectedOppositeEdgeKeys =
    new Set();

  for (
    const left of
      TETRAHEDRON_OPPOSITE_EDGE_PAIR_FEATURES
  ) {
    for (
      const right of
        TETRAHEDRON_OPPOSITE_EDGE_PAIR_FEATURES
    ) {
      expectedOppositeEdgeKeys.add(
        pairedOppositeEdgePairKey({
          left,
          right,
        })
      );
    }
  }

  const actualOppositeEdgeKeys =
    new Set(
      PAIRED_OPPOSITE_EDGE_DATA.orbit.map(
        pairedOppositeEdgePairKey
      )
    );

  if (
    expectedOppositeEdgeKeys.size !==
      actualOppositeEdgeKeys.size ||
    [
      ...expectedOppositeEdgeKeys,
    ].some(
      (key) =>
        !actualOppositeEdgeKeys.has(
          key
        )
    )
  ) {
    throw new Error(
      "Paired opposite-edge orbit is not the full 3 x 3 Cartesian product."
    );
  }

  /*
   * Likewise verify all 4 x 4 paired vertices.
   */
  const expectedVertexKeys =
    new Set();

  for (
    const left of
      TETRAHEDRON_VERTEX_FEATURES
  ) {
    for (
      const right of
        TETRAHEDRON_VERTEX_FEATURES
    ) {
      expectedVertexKeys.add(
        pairedVertexKey({
          left,
          right,
        })
      );
    }
  }

  const actualVertexKeys =
    new Set(
      PAIRED_VERTEX_DATA.orbit.map(
        pairedVertexKey
      )
    );

  if (
    expectedVertexKeys.size !==
      actualVertexKeys.size ||
    [
      ...expectedVertexKeys,
    ].some(
      (key) =>
        !actualVertexKeys.has(
          key
        )
    )
  ) {
    throw new Error(
      "Paired vertex orbit is not the full 4 x 4 Cartesian product."
    );
  }

  /*
   * Likewise verify all 6 x 6 paired edges.
   */
  const expectedEdgeKeys =
    new Set();

  for (
    const left of
      TETRAHEDRON_EDGE_FEATURES
  ) {
    for (
      const right of
        TETRAHEDRON_EDGE_FEATURES
    ) {
      expectedEdgeKeys.add(
        pairedEdgeKey({
          left,
          right,
        })
      );
    }
  }

  const actualEdgeKeys =
    new Set(
      PAIRED_EDGE_DATA.orbit.map(
        pairedEdgeKey
      )
    );

  if (
    expectedEdgeKeys.size !==
      actualEdgeKeys.size ||
    [
      ...expectedEdgeKeys,
    ].some(
      (key) =>
        !actualEdgeKeys.has(
          key
        )
    )
  ) {
    throw new Error(
      "Paired edge orbit is not the full 6 x 6 Cartesian product."
    );
  }

  /*
   * Finally prove that quotient cosets and paired opposite-edge
   * states are exactly the same 9-element organization.
   */
  if (
    QUOTIENT_TO_PAIRED_OPPOSITE_EDGE.length !==
    9
  ) {
    throw new Error(
      "Expected nine quotient-to-feature records."
    );
  }

  const quotientFeatureKeys =
    new Set(
      QUOTIENT_TO_PAIRED_OPPOSITE_EDGE.map(
        (record) =>
          record.featureKey
      )
    );

  if (
    quotientFeatureKeys.size !==
    9
  ) {
    throw new Error(
      "The nine quotient cosets do not map bijectively to nine paired opposite-edge states."
    );
  }

  return Object.freeze({
    pairedOppositeEdgeOrbitSize:
      PAIRED_OPPOSITE_EDGE_DATA.orbit.length,

    pairedOppositeEdgeStabilizerSize:
      PAIRED_OPPOSITE_EDGE_DATA.stabilizer.length,

    pairedVertexOrbitSize:
      PAIRED_VERTEX_DATA.orbit.length,

    pairedVertexStabilizerSize:
      PAIRED_VERTEX_DATA.stabilizer.length,

    pairedEdgeOrbitSize:
      PAIRED_EDGE_DATA.orbit.length,

    pairedEdgeStabilizerSize:
      PAIRED_EDGE_DATA.stabilizer.length,

    quotientFeatureBijectionSize:
      quotientFeatureKeys.size,
  });
}
