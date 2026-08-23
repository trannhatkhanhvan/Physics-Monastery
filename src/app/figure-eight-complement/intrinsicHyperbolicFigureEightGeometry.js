/*
 * Exact intrinsic hyperbolic geometry of the m004
 * figure-eight knot complement.
 *
 * IMPORTANT:
 *
 * This module describes the manifold intrinsically in H^3.
 *
 * It contains NO ambient S^3 knot embedding.
 *
 * The complete figure-eight hyperbolic structure is assembled
 * from two regular ideal tetrahedra.
 *
 * Local tetrahedron coordinates use the Klein ball.
 *
 * In the Klein model:
 *
 *   - ideal vertices lie on |x| = 1;
 *   - hyperbolic geodesics are Euclidean chords;
 *   - the existing tetrahedron barycentric addresses therefore
 *     define canonical local hyperbolic points.
 */

const EPSILON =
  1e-12;


const INV_SQRT_3 =
  1 / Math.sqrt(3);


/*
 * Canonical shape of a regular ideal tetrahedron:
 *
 *       z = exp(i pi / 3)
 *
 *         = 1/2 + i sqrt(3)/2.
 *
 * Every dihedral angle is pi/3.
 *
 * Six tetrahedral angles therefore close around each
 * figure-eight ideal edge:
 *
 *       6(pi/3) = 2pi.
 */
export const FIGURE_EIGHT_REGULAR_IDEAL_SHAPE =
  Object.freeze({
    real:
      0.5,

    imaginary:
      Math.sqrt(3) / 2,

    modulus:
      1,

    argument:
      Math.PI / 3,

    dihedralAngle:
      Math.PI / 3,
  });


/*
 * Regular ideal tetrahedron in the Klein ball.
 *
 * This uses exactly the vertex ordering already used by the
 * figure-eight constructor, normalized onto the ideal sphere.
 */
export const REGULAR_IDEAL_TETRAHEDRON_KLEIN_VERTICES =
  Object.freeze([
    Object.freeze({
      x:
        INV_SQRT_3,

      y:
        INV_SQRT_3,

      z:
        INV_SQRT_3,
    }),

    Object.freeze({
      x:
        -INV_SQRT_3,

      y:
        -INV_SQRT_3,

      z:
        INV_SQRT_3,
    }),

    Object.freeze({
      x:
        -INV_SQRT_3,

      y:
        INV_SQRT_3,

      z:
        -INV_SQRT_3,
    }),

    Object.freeze({
      x:
        INV_SQRT_3,

      y:
        -INV_SQRT_3,

      z:
        -INV_SQRT_3,
    }),
  ]);


function dot3(
  first,
  second
) {
  return (
    first.x * second.x +
    first.y * second.y +
    first.z * second.z
  );
}


function normSquared3(
  point
) {
  return dot3(
    point,
    point
  );
}


/*
 * Convert one source-tetrahedron barycentric address
 *
 *   lambda_0 + ... + lambda_3 = 1
 *
 * directly into its Klein-ball position.
 *
 * This is local tetrahedron geometry.
 *
 * We do NOT identify the A and B Klein balls as one global H^3
 * picture.  The face isometries provide the chart transitions.
 */
export function kleinPointFromBarycentric(
  barycentric
) {
  if (
    !Array.isArray(
      barycentric
    ) ||
    barycentric.length !== 4 ||
    barycentric.some(
      (value) =>
        !Number.isFinite(
          value
        )
    )
  ) {
    return null;
  }


  const barycentricSum =
    barycentric.reduce(
      (
        sum,
        value
      ) =>
        sum + value,
      0
    );


  const point =
    barycentric.reduce(
      (
        accumulator,
        weight,
        index
      ) => {
        const idealVertex =
          REGULAR_IDEAL_TETRAHEDRON_KLEIN_VERTICES[
            index
          ];


        accumulator.x +=
          weight *
          idealVertex.x;

        accumulator.y +=
          weight *
          idealVertex.y;

        accumulator.z +=
          weight *
          idealVertex.z;


        return accumulator;
      },

      {
        x: 0,
        y: 0,
        z: 0,
      }
    );


  const normSquared =
    normSquared3(
      point
    );


  return {
    x:
      point.x,

    y:
      point.y,

    z:
      point.z,

    normSquared,

    norm:
      Math.sqrt(
        Math.max(
          0,
          normSquared
        )
      ),

    barycentricSum,

    barycentricSumError:
      Math.abs(
        barycentricSum -
        1
      ),

    insideKleinBall:
      normSquared <
      1 - EPSILON,

    onIdealBoundary:
      Math.abs(
        normSquared -
        1
      ) <=
      EPSILON,
  };
}


/*
 * Klein ball -> hyperboloid model.
 *
 * If x is a Klein point with |x| < 1,
 *
 *          (1, x)
 *   X = -----------
 *       sqrt(1-|x|²)
 *
 * satisfies
 *
 *   -X_0² + X_1² + X_2² + X_3² = -1.
 */
export function kleinPointToHyperboloid(
  point
) {
  if (!point) {
    return null;
  }


  const normSquared =
    normSquared3(
      point
    );


  if (
    !Number.isFinite(
      normSquared
    ) ||
    normSquared >=
      1 - EPSILON
  ) {
    return null;
  }


  const denominator =
    Math.sqrt(
      1 -
      normSquared
    );


  return {
    t:
      1 /
      denominator,

    x:
      point.x /
      denominator,

    y:
      point.y /
      denominator,

    z:
      point.z /
      denominator,
  };
}


/*
 * Exact hyperbolic distance between two interior Klein points:
 *
 *                       1 - p.q
 *   cosh d(p,q) = -----------------------
 *                  sqrt((1-|p|²)(1-|q|²))
 */
export function hyperbolicDistanceKlein(
  first,
  second
) {
  if (
    !first ||
    !second
  ) {
    return Infinity;
  }


  const firstNormSquared =
    normSquared3(
      first
    );

  const secondNormSquared =
    normSquared3(
      second
    );


  if (
    firstNormSquared >=
      1 - EPSILON ||
    secondNormSquared >=
      1 - EPSILON
  ) {
    return Infinity;
  }


  const denominator =
    Math.sqrt(
      (
        1 -
        firstNormSquared
      ) *
      (
        1 -
        secondNormSquared
      )
    );


  if (
    !Number.isFinite(
      denominator
    ) ||
    denominator <=
      EPSILON
  ) {
    return Infinity;
  }


  const coshDistance =
    (
      1 -
      dot3(
        first,
        second
      )
    ) /
    denominator;


  return Math.acosh(
    Math.max(
      1,
      coshDistance
    )
  );
}


/*
 * One quotient vertex can have several source representatives,
 * because the A/B face identifications merge them.
 *
 * DO NOT average those H^3 coordinates.
 *
 * They are coordinates in different local tetrahedron charts.
 *
 * Preserve every chart explicitly.
 */
export function canonicalHyperbolicVertexCharts(
  quotientVertex
) {
  const addresses =
    Array.isArray(
      quotientVertex
        ?.barycentricAddresses
    )
      ? quotientVertex
          .barycentricAddresses
      : [];


  return addresses
    .map(
      (record) => {
        const kleinPoint =
          kleinPointFromBarycentric(
            record
              .barycentric
          );


        if (!kleinPoint) {
          return null;
        }


        return {
          tetrahedronId:
            record
              .tetrahedronId,

          volumeVertexIndex:
            record
              .volumeVertexIndex,

          barycentric: [
            ...record
              .barycentric,
          ],

          kleinPoint,
        };
      }
    )
    .filter(Boolean);
}


/*
 * Structural audit of the local hyperbolic atlas.
 *
 * This does not yet test the A <-> B face isometries.
 * That is the next geometry patch.
 */
export function auditCanonicalHyperbolicGeometry(
  quotientVertices
) {
  let localChartCount =
    0;

  let missingChartVertexCount =
    0;

  let invalidBarycentricCount =
    0;

  let outsideKleinBallCount =
    0;

  let maximumBarycentricSumError =
    0;

  let maximumKleinNorm =
    0;


  quotientVertices.forEach(
    (vertex) => {
      const charts =
        Array.isArray(
          vertex
            .hyperbolicCharts
        )
          ? vertex
              .hyperbolicCharts
          : canonicalHyperbolicVertexCharts(
              vertex
            );


      if (
        charts.length ===
        0
      ) {
        missingChartVertexCount +=
          1;

        return;
      }


      charts.forEach(
        (chart) => {
          localChartCount +=
            1;


          const point =
            chart.kleinPoint;


          maximumBarycentricSumError =
            Math.max(
              maximumBarycentricSumError,

              point
                .barycentricSumError
            );


          maximumKleinNorm =
            Math.max(
              maximumKleinNorm,

              point.norm
            );


          if (
            point
              .barycentricSumError >
            1e-10
          ) {
            invalidBarycentricCount +=
              1;
          }


          if (
            !point
              .insideKleinBall &&
            !point
              .onIdealBoundary
          ) {
            outsideKleinBallCount +=
              1;
          }
        }
      );
    }
  );


  const idealVertexNormError =
    REGULAR_IDEAL_TETRAHEDRON_KLEIN_VERTICES
      .reduce(
        (
          maximum,
          vertex
        ) =>
          Math.max(
            maximum,

            Math.abs(
              normSquared3(
                vertex
              ) -
              1
            )
          ),

        0
      );


  /*
   * A Euclidean regular tetrahedron centered at the origin has
   *
   *   v_i . v_j = -1/3
   *
   * for every distinct pair.
   */
  let maximumIdealEdgeDotError =
    0;


  for (
    let first = 0;
    first < 4;
    first += 1
  ) {
    for (
      let second =
        first + 1;
      second < 4;
      second += 1
    ) {
      maximumIdealEdgeDotError =
        Math.max(
          maximumIdealEdgeDotError,

          Math.abs(
            dot3(
              REGULAR_IDEAL_TETRAHEDRON_KLEIN_VERTICES[
                first
              ],

              REGULAR_IDEAL_TETRAHEDRON_KLEIN_VERTICES[
                second
              ]
            ) +
            1 / 3
          )
        );
    }
  }


  const valid =
    missingChartVertexCount ===
      0 &&
    invalidBarycentricCount ===
      0 &&
    outsideKleinBallCount ===
      0 &&
    idealVertexNormError <=
      1e-12 &&
    maximumIdealEdgeDotError <=
      1e-12;


  return {
    valid,

    summary: {
      model:
        "Klein ball / regular ideal tetrahedron",

      idealShapeReal:
        FIGURE_EIGHT_REGULAR_IDEAL_SHAPE
          .real,

      idealShapeImaginary:
        FIGURE_EIGHT_REGULAR_IDEAL_SHAPE
          .imaginary,

      idealShapeArgument:
        FIGURE_EIGHT_REGULAR_IDEAL_SHAPE
          .argument,

      dihedralAngle:
        FIGURE_EIGHT_REGULAR_IDEAL_SHAPE
          .dihedralAngle,

      quotientVertexCount:
        quotientVertices
          .length,

      localChartCount,

      missingChartVertexCount,

      invalidBarycentricCount,

      outsideKleinBallCount,

      maximumBarycentricSumError,

      maximumKleinNorm,

      idealVertexNormError,

      maximumIdealEdgeDotError,
    },
  };
}


/*
 * ============================================================
 * EXACT HYPERBOLIC FACE-GLUING AUDIT
 * ============================================================
 *
 * Each m004 large face is an ideal hyperbolic triangle.
 *
 * The stored face identification maps the three ideal vertices
 * of an A face to the corresponding three ideal vertices of a B
 * face. Because both source tetrahedra are the same regular ideal
 * tetrahedron, this vertex correspondence determines an exact
 * isometry of the ideal face.
 *
 * We verify that statement numerically on every finite mesh vertex
 * lying on the face, then independently recover the ideal-edge
 * equivalence classes and their angle sums.
 */


function normalizeFaceMappingIndex(
  rawIndex,
  mappingPermutations
) {
  if (
    !Array.isArray(
      mappingPermutations
    ) ||
    mappingPermutations.length === 0
  ) {
    return null;
  }


  return (
    (
      Math.round(
        rawIndex ?? 0
      ) %
      mappingPermutations.length
    ) +
    mappingPermutations.length
  ) %
    mappingPermutations.length;
}


function maximumAddressError(
  first,
  second
) {
  if (
    !Array.isArray(first) ||
    !Array.isArray(second) ||
    first.length !== 4 ||
    second.length !== 4
  ) {
    return Infinity;
  }


  return Math.max(
    ...first.map(
      (
        value,
        index
      ) =>
        Math.abs(
          value -
          second[index]
        )
    )
  );
}


function distance3(
  first,
  second
) {
  return Math.hypot(
    first.x - second.x,
    first.y - second.y,
    first.z - second.z
  );
}


function mapFaceBarycentricAddress({
  address,
  pair,
  mappingIndex,
  mappingPermutations,
}) {
  const permutation =
    mappingPermutations[
      mappingIndex
    ];


  if (
    !Array.isArray(
      permutation
    ) ||
    permutation.length !== 3
  ) {
    return null;
  }


  const mapped = [
    0,
    0,
    0,
    0,
  ];


  pair.A.forEach(
    (
      sourceVertex,
      localIndex
    ) => {
      const targetVertex =
        pair.B[
          permutation[
            localIndex
          ]
        ];


      mapped[
        targetVertex
      ] =
        address[
          sourceVertex
        ];
    }
  );


  return mapped;
}


function omittedIdealVertex(
  faceVertices
) {
  return [
    0,
    1,
    2,
    3,
  ].find(
    (vertexIndex) =>
      !faceVertices.includes(
        vertexIndex
      )
  );
}


function completeTetrahedronVertexMap({
  pair,
  mappingIndex,
  mappingPermutations,
}) {
  const permutation =
    mappingPermutations[
      mappingIndex
    ];


  if (
    !Array.isArray(
      permutation
    ) ||
    permutation.length !== 3
  ) {
    return null;
  }


  const vertexMap =
    Array(4).fill(
      null
    );


  pair.A.forEach(
    (
      sourceVertex,
      localIndex
    ) => {
      vertexMap[
        sourceVertex
      ] =
        pair.B[
          permutation[
            localIndex
          ]
        ];
    }
  );


  const omittedA =
    omittedIdealVertex(
      pair.A
    );

  const omittedB =
    omittedIdealVertex(
      pair.B
    );


  if (
    !Number.isInteger(
      omittedA
    ) ||
    !Number.isInteger(
      omittedB
    )
  ) {
    return null;
  }


  vertexMap[
    omittedA
  ] =
    omittedB;


  return (
    new Set(
      vertexMap
    ).size === 4
      ? vertexMap
      : null
  );
}


function permutationParity(
  permutation
) {
  if (
    !Array.isArray(
      permutation
    )
  ) {
    return 0;
  }


  let inversions =
    0;


  for (
    let first = 0;
    first <
      permutation.length;
    first += 1
  ) {
    for (
      let second =
        first + 1;
      second <
        permutation.length;
      second += 1
    ) {
      if (
        permutation[first] >
        permutation[second]
      ) {
        inversions +=
          1;
      }
    }
  }


  return (
    inversions % 2 === 0
      ? 1
      : -1
  );
}


function tetrahedronEdgeKey(
  tetrahedronId,
  first,
  second
) {
  const low =
    Math.min(
      first,
      second
    );

  const high =
    Math.max(
      first,
      second
    );


  return (
    `${tetrahedronId}:` +
    `${low}-${high}`
  );
}


function makeEdgeUnionFind(
  keys
) {
  const parent =
    new Map(
      keys.map(
        (key) => [
          key,
          key,
        ]
      )
    );


  function find(
    key
  ) {
    const current =
      parent.get(
        key
      );


    if (
      current === key
    ) {
      return key;
    }


    const root =
      find(
        current
      );


    parent.set(
      key,
      root
    );


    return root;
  }


  function union(
    first,
    second
  ) {
    const firstRoot =
      find(
        first
      );

    const secondRoot =
      find(
        second
      );


    if (
      firstRoot !==
      secondRoot
    ) {
      parent.set(
        secondRoot,
        firstRoot
      );
    }
  }


  return {
    find,
    union,
  };
}


export function auditFigureEightHyperbolicGluing({
  volumeMeshes,
  facePairs,
  facePairMappingIndices,
  mappingPermutations,
}) {
  const failures = [];

  const faceDiagnostics =
    [];


  (
    facePairs ??
    []
  ).forEach(
    (pair) => {
      const mappingIndex =
        normalizeFaceMappingIndex(
          facePairMappingIndices?.[
            pair.id
          ],

          mappingPermutations
        );


      const faceA =
        volumeMeshes
          ?.A
          ?.boundaryFaces
          ?.find(
            (face) =>
              face.kind ===
                "large" &&
              face.pairId ===
                pair.id
          ) ??
        null;


      const faceB =
        volumeMeshes
          ?.B
          ?.boundaryFaces
          ?.find(
            (face) =>
              face.kind ===
                "large" &&
              face.pairId ===
                pair.id
          ) ??
        null;


      const fullVertexMap =
        Number.isInteger(
          mappingIndex
        )
          ? completeTetrahedronVertexMap({
              pair,
              mappingIndex,
              mappingPermutations,
            })
          : null;


      if (
        !faceA ||
        !faceB ||
        !fullVertexMap
      ) {
        failures.push({
          reason:
            "invalid-hyperbolic-face-pair",

          pairId:
            pair.id,
        });


        faceDiagnostics.push({
          pairId:
            pair.id,

          mappingIndex,

          valid:
            false,

          matchedVertexCount:
            0,

          maximumMappedAddressError:
            Infinity,

          maximumMappedKleinPointError:
            Infinity,

          maximumHyperbolicDistanceError:
            Infinity,

          fullVertexMap,

          fullVertexPermutationParity:
            fullVertexMap
              ? permutationParity(
                  fullVertexMap
                )
              : 0,
        });


        return;
      }


      const matchedRecords =
        [];

      let maximumMappedAddressError =
        0;

      let maximumMappedKleinPointError =
        0;


      faceA
        .volumeVertexIndices
        .forEach(
          (vertexAIndex) => {
            const addressA =
              volumeMeshes
                .A
                .vertices[
                vertexAIndex
              ]
                ?.barycentric ??
              null;


            const mappedAddress =
              addressA
                ? mapFaceBarycentricAddress({
                    address:
                      addressA,

                    pair,

                    mappingIndex,

                    mappingPermutations,
                  })
                : null;


            if (
              !mappedAddress
            ) {
              failures.push({
                reason:
                  "missing-hyperbolic-mapped-address",

                pairId:
                  pair.id,

                vertexAIndex,
              });

              return;
            }


            let bestVertexBIndex =
              null;

            let bestError =
              Infinity;


            faceB
              .volumeVertexIndices
              .forEach(
                (vertexBIndex) => {
                  const addressB =
                    volumeMeshes
                      .B
                      .vertices[
                      vertexBIndex
                    ]
                      ?.barycentric ??
                    null;


                  const error =
                    maximumAddressError(
                      mappedAddress,
                      addressB
                    );


                  if (
                    error <
                    bestError
                  ) {
                    bestError =
                      error;

                    bestVertexBIndex =
                      vertexBIndex;
                  }
                }
              );


            maximumMappedAddressError =
              Math.max(
                maximumMappedAddressError,
                bestError
              );


            if (
              !Number.isInteger(
                bestVertexBIndex
              ) ||
              bestError >
                1e-10
            ) {
              failures.push({
                reason:
                  "hyperbolic-face-vertex-unmatched",

                pairId:
                  pair.id,

                vertexAIndex,

                bestError,
              });

              return;
            }


            const addressB =
              volumeMeshes
                .B
                .vertices[
                bestVertexBIndex
              ]
                .barycentric;


            const pointA =
              kleinPointFromBarycentric(
                addressA
              );

            const mappedPoint =
              kleinPointFromBarycentric(
                mappedAddress
              );

            const pointB =
              kleinPointFromBarycentric(
                addressB
              );


            if (
              !pointA ||
              !mappedPoint ||
              !pointB
            ) {
              failures.push({
                reason:
                  "missing-hyperbolic-face-point",

                pairId:
                  pair.id,

                vertexAIndex,

                vertexBIndex:
                  bestVertexBIndex,
              });

              return;
            }


            maximumMappedKleinPointError =
              Math.max(
                maximumMappedKleinPointError,

                distance3(
                  mappedPoint,
                  pointB
                )
              );


            matchedRecords.push({
              vertexAIndex,

              vertexBIndex:
                bestVertexBIndex,

              addressA,

              addressB,

              pointA,

              pointB,
            });
          }
        );


      /*
       * A genuine hyperbolic isometry must preserve every pairwise
       * hyperbolic distance on the finite sampled face.
       */
      let maximumHyperbolicDistanceError =
        0;


      for (
        let first = 0;
        first <
          matchedRecords.length;
        first += 1
      ) {
        for (
          let second =
            first + 1;
          second <
            matchedRecords.length;
          second += 1
        ) {
          const sourceDistance =
            hyperbolicDistanceKlein(
              matchedRecords[
                first
              ].pointA,

              matchedRecords[
                second
              ].pointA
            );


          const targetDistance =
            hyperbolicDistanceKlein(
              matchedRecords[
                first
              ].pointB,

              matchedRecords[
                second
              ].pointB
            );


          maximumHyperbolicDistanceError =
            Math.max(
              maximumHyperbolicDistanceError,

              Math.abs(
                sourceDistance -
                targetDistance
              )
            );
        }
      }


      const valid =
        matchedRecords.length ===
          faceA
            .volumeVertexIndices
            .length &&
        maximumMappedAddressError <=
          1e-10 &&
        maximumMappedKleinPointError <=
          1e-10 &&
        maximumHyperbolicDistanceError <=
          1e-10;


      if (!valid) {
        failures.push({
          reason:
            "hyperbolic-face-isometry-audit-failed",

          pairId:
            pair.id,

          maximumMappedAddressError,

          maximumMappedKleinPointError,

          maximumHyperbolicDistanceError,
        });
      }


      faceDiagnostics.push({
        pairId:
          pair.id,

        mappingIndex,

        valid,

        matchedVertexCount:
          matchedRecords.length,

        boundaryVertexCount:
          faceA
            .volumeVertexIndices
            .length,

        maximumMappedAddressError,

        maximumMappedKleinPointError,

        maximumHyperbolicDistanceError,

        fullVertexMap,

        fullVertexPermutationParity:
          permutationParity(
            fullVertexMap
          ),
      });
    }
  );


  /*
   * ============================================================
   * IDEAL EDGE GLUING
   * ============================================================
   *
   * Before quotienting there are:
   *
   *   2 tetrahedra × 6 edges = 12 edge occurrences.
   *
   * The m004 face maps must identify them into two ideal-edge
   * classes of six occurrences each.
   *
   * Since every tetrahedron is regular ideal,
   *
   *   theta = pi/3
   *
   * at every occurrence, hence each class must satisfy
   *
   *   6 theta = 2 pi.
   */
  const edgeOccurrenceKeys =
    [];


  ["A", "B"].forEach(
    (tetrahedronId) => {
      for (
        let first = 0;
        first < 4;
        first += 1
      ) {
        for (
          let second =
            first + 1;
          second < 4;
          second += 1
        ) {
          edgeOccurrenceKeys.push(
            tetrahedronEdgeKey(
              tetrahedronId,
              first,
              second
            )
          );
        }
      }
    }
  );


  const edgeUnionFind =
    makeEdgeUnionFind(
      edgeOccurrenceKeys
    );


  (
    facePairs ??
    []
  ).forEach(
    (pair) => {
      const mappingIndex =
        normalizeFaceMappingIndex(
          facePairMappingIndices?.[
            pair.id
          ],

          mappingPermutations
        );


      if (
        !Number.isInteger(
          mappingIndex
        )
      ) {
        return;
      }


      const permutation =
        mappingPermutations[
          mappingIndex
        ];


      for (
        let first = 0;
        first < 3;
        first += 1
      ) {
        for (
          let second =
            first + 1;
          second < 3;
          second += 1
        ) {
          const sourceEdge =
            tetrahedronEdgeKey(
              "A",

              pair.A[
                first
              ],

              pair.A[
                second
              ]
            );


          const targetEdge =
            tetrahedronEdgeKey(
              "B",

              pair.B[
                permutation[
                  first
                ]
              ],

              pair.B[
                permutation[
                  second
                ]
              ]
            );


          edgeUnionFind.union(
            sourceEdge,
            targetEdge
          );
        }
      }
    }
  );


  const edgeClassesByRoot =
    new Map();


  edgeOccurrenceKeys.forEach(
    (edgeKey) => {
      const root =
        edgeUnionFind.find(
          edgeKey
        );


      if (
        !edgeClassesByRoot
          .has(root)
      ) {
        edgeClassesByRoot.set(
          root,
          []
        );
      }


      edgeClassesByRoot
        .get(root)
        .push(
          edgeKey
        );
    }
  );


  const edgeClasses =
    [
      ...edgeClassesByRoot
        .values(),
    ]
      .map(
        (
          occurrences,
          edgeClassIndex
        ) => {
          const angleSum =
            occurrences.length *
            FIGURE_EIGHT_REGULAR_IDEAL_SHAPE
              .dihedralAngle;


          return {
            edgeClassIndex,

            occurrenceCount:
              occurrences.length,

            occurrences: [
              ...occurrences,
            ].sort(),

            angleSum,

            angleClosureError:
              Math.abs(
                angleSum -
                2 * Math.PI
              ),

            valid:
              occurrences.length ===
                6 &&
              Math.abs(
                angleSum -
                2 * Math.PI
              ) <=
                1e-12,
          };
        }
      )
      .sort(
        (
          first,
          second
        ) =>
          first.occurrences[
            0
          ].localeCompare(
            second.occurrences[
              0
            ]
          )
      );


  const maximumEdgeAngleClosureError =
    edgeClasses.reduce(
      (
        maximum,
        edgeClass
      ) =>
        Math.max(
          maximum,
          edgeClass
            .angleClosureError
        ),
      0
    );


  const edgeGluingValid =
    edgeClasses.length ===
      2 &&
    edgeClasses.every(
      (edgeClass) =>
        edgeClass.valid
    );


  if (
    !edgeGluingValid
  ) {
    failures.push({
      reason:
        "hyperbolic-ideal-edge-gluing-failed",

      edgeClassCount:
        edgeClasses.length,

      occurrenceCounts:
        edgeClasses.map(
          (edgeClass) =>
            edgeClass
              .occurrenceCount
        ),

      maximumEdgeAngleClosureError,
    });
  }


  const faceIsometriesValid =
    faceDiagnostics.length ===
      4 &&
    faceDiagnostics.every(
      (face) =>
        face.valid
    );


  return {
    valid:
      faceIsometriesValid &&
      edgeGluingValid &&
      failures.length === 0,

    faceDiagnostics,

    edgeClasses,

    failures,

    summary: {
      facePairCount:
        faceDiagnostics.length,

      validFaceIsometryCount:
        faceDiagnostics.filter(
          (face) =>
            face.valid
        ).length,

      maximumMappedAddressError:
        faceDiagnostics.reduce(
          (
            maximum,
            face
          ) =>
            Math.max(
              maximum,
              face
                .maximumMappedAddressError
            ),
          0
        ),

      maximumMappedKleinPointError:
        faceDiagnostics.reduce(
          (
            maximum,
            face
          ) =>
            Math.max(
              maximum,
              face
                .maximumMappedKleinPointError
            ),
          0
        ),

      maximumHyperbolicDistanceError:
        faceDiagnostics.reduce(
          (
            maximum,
            face
          ) =>
            Math.max(
              maximum,
              face
                .maximumHyperbolicDistanceError
            ),
          0
        ),

      idealEdgeOccurrenceCount:
        edgeOccurrenceKeys.length,

      idealEdgeClassCount:
        edgeClasses.length,

      idealEdgeClassOccurrenceCounts:
        edgeClasses.map(
          (edgeClass) =>
            edgeClass
              .occurrenceCount
        ),

      dihedralAngle:
        FIGURE_EIGHT_REGULAR_IDEAL_SHAPE
          .dihedralAngle,

      maximumEdgeAngleClosureError,

      faceIsometriesValid,

      edgeGluingValid,
    },
  };
}


/*
 * ============================================================
 * COMPLETE EUCLIDEAN CUSP / PERIPHERAL HOLONOMY AUDIT
 * ============================================================
 *
 * The regular ideal tetrahedra induce equilateral Euclidean
 * triangles on a horospherical cusp section.
 *
 * For the canonical m004 development, the eight triangles close
 * to one Euclidean torus. In the raw developed (u,v) lattice:
 *
 *   meridian  = u - 2v
 *   longitude = v
 *
 * so, if U and V are the two raw fundamental translations,
 *
 *   M = U
 *   L = V + 2U.
 *
 * Completeness means these peripheral holonomies are translations
 * of the Euclidean cusp plane, with the eight triangles filling
 * exactly one fundamental parallelogram.
 */

function subtract2(
  first,
  second
) {
  return {
    x:
      first.x -
      second.x,

    y:
      first.y -
      second.y,
  };
}


function addScaled2(
  first,
  second,
  scale
) {
  return {
    x:
      first.x +
      scale *
      second.x,

    y:
      first.y +
      scale *
      second.y,
  };
}


function length2(
  vector
) {
  return Math.hypot(
    vector.x,
    vector.y
  );
}


function dot2(
  first,
  second
) {
  return (
    first.x *
      second.x +
    first.y *
      second.y
  );
}


function determinant2(
  first,
  second
) {
  return (
    first.x *
      second.y -
    first.y *
      second.x
  );
}


function point2Distance(
  first,
  second
) {
  return Math.hypot(
    first.x -
      second.x,
    first.y -
      second.y
  );
}


function triangleArea2(
  first,
  second,
  third
) {
  return (
    Math.abs(
      determinant2(
        subtract2(
          second,
          first
        ),
        subtract2(
          third,
          first
        )
      )
    ) /
    2
  );
}


export function auditFigureEightCuspCompleteness({
  cuspFlatLayout,
}) {
  const failures = [];

  const expectedTriangleCount =
    8;

  const expectedSideLength =
    1;

  const expectedTriangleArea =
    Math.sqrt(3) /
    4;

  const expectedCuspArea =
    2 *
    Math.sqrt(3);

  const expectedCuspShapeMagnitude =
    2 *
    Math.sqrt(3);


  const tileEntries =
    Object.entries(
      cuspFlatLayout ??
        {}
    );


  let maximumTriangleSideLengthError =
    0;

  let maximumTriangleAreaError =
    0;

  let totalTriangleArea =
    0;


  tileEntries.forEach(
    (
      [
        cuspBaseId,
        tile,
      ]
    ) => {
      const points =
        Object.values(
          tile ??
            {}
        );


      if (
        points.length !==
          3 ||
        points.some(
          (point) =>
            !point ||
            !Number.isFinite(
              point.x
            ) ||
            !Number.isFinite(
              point.y
            )
        )
      ) {
        failures.push({
          reason:
            "invalid-cusp-triangle",

          cuspBaseId,
        });

        return;
      }


      const sideLengths = [
        point2Distance(
          points[0],
          points[1]
        ),

        point2Distance(
          points[1],
          points[2]
        ),

        point2Distance(
          points[2],
          points[0]
        ),
      ];


      sideLengths.forEach(
        (sideLength) => {
          maximumTriangleSideLengthError =
            Math.max(
              maximumTriangleSideLengthError,

              Math.abs(
                sideLength -
                expectedSideLength
              )
            );
        }
      );


      const area =
        triangleArea2(
          points[0],
          points[1],
          points[2]
        );


      maximumTriangleAreaError =
        Math.max(
          maximumTriangleAreaError,

          Math.abs(
            area -
            expectedTriangleArea
          )
        );


      totalTriangleArea +=
        area;
    }
  );


  /*
   * Recover the canonical m004 cusp parallelogram directly
   * from vertices of the supplied eight-triangle development.
   */
  const domainCorner0 =
    cuspFlatLayout
      ?.A2?.[0] ??
    null;

  const domainCorner1 =
    cuspFlatLayout
      ?.A2?.[3] ??
    null;

  const domainCorner2 =
    cuspFlatLayout
      ?.A1?.[3] ??
    null;

  const domainCorner3 =
    cuspFlatLayout
      ?.B2?.[0] ??
    null;


  const domainCorners = [
    domainCorner0,
    domainCorner1,
    domainCorner2,
    domainCorner3,
  ];


  const validDomainCorners =
    domainCorners.every(
      (point) =>
        point &&
        Number.isFinite(
          point.x
        ) &&
        Number.isFinite(
          point.y
        )
    );


  if (
    !validDomainCorners
  ) {
    failures.push({
      reason:
        "missing-canonical-cusp-domain-corner",
    });
  }


  const rawTranslationU =
    validDomainCorners
      ? subtract2(
          domainCorner1,
          domainCorner0
        )
      : null;

  const rawTranslationV =
    validDomainCorners
      ? subtract2(
          domainCorner3,
          domainCorner0
        )
      : null;


  /*
   * C2 must equal C1 + V.
   */
  const parallelogramClosureError =
    validDomainCorners
      ? point2Distance(
          domainCorner2,
          addScaled2(
            domainCorner1,
            rawTranslationV,
            1
          )
        )
      : Infinity;


  /*
   * Preferred peripheral basis:
   *
   *   m = u - 2v
   *   l = v
   *
   * therefore
   *
   *   u = m + 2l
   *   v = l,
   *
   * giving
   *
   *   M = U
   *   L = V + 2U.
   */
  const meridianVector =
    rawTranslationU
      ? {
          ...rawTranslationU,
        }
      : null;

  const longitudeVector =
    rawTranslationU &&
    rawTranslationV
      ? addScaled2(
          rawTranslationV,
          rawTranslationU,
          2
        )
      : null;


  const meridianLength =
    meridianVector
      ? length2(
          meridianVector
        )
      : Infinity;

  const longitudeLength =
    longitudeVector
      ? length2(
          longitudeVector
        )
      : Infinity;

  const meridianLongitudeDot =
    meridianVector &&
    longitudeVector
      ? dot2(
          meridianVector,
          longitudeVector
        )
      : Infinity;

  const orientedFundamentalArea =
    meridianVector &&
    longitudeVector
      ? determinant2(
          meridianVector,
          longitudeVector
        )
      : Infinity;

  const fundamentalArea =
    Math.abs(
      orientedFundamentalArea
    );


  const meridianNormSquared =
    meridianVector
      ? dot2(
          meridianVector,
          meridianVector
        )
      : 0;


  const cuspShapeReal =
    meridianNormSquared >
      EPSILON
      ? meridianLongitudeDot /
        meridianNormSquared
      : Infinity;

  const cuspShapeImaginary =
    meridianNormSquared >
      EPSILON
      ? orientedFundamentalArea /
        meridianNormSquared
      : Infinity;


  const triangleAreaClosureError =
    Math.abs(
      totalTriangleArea -
      expectedCuspArea
    );

  const fundamentalAreaClosureError =
    Math.abs(
      fundamentalArea -
      expectedCuspArea
    );

  const areaAgreementError =
    Math.abs(
      fundamentalArea -
      totalTriangleArea
    );

  const meridianLengthError =
    Math.abs(
      meridianLength -
      1
    );

  const longitudeLengthError =
    Math.abs(
      longitudeLength -
      expectedCuspShapeMagnitude
    );

  const orthogonalityError =
    Math.abs(
      meridianLongitudeDot
    );

  const cuspShapeRealError =
    Math.abs(
      cuspShapeReal
    );

  const cuspShapeImaginaryMagnitudeError =
    Math.abs(
      Math.abs(
        cuspShapeImaginary
      ) -
      expectedCuspShapeMagnitude
    );


  const valid =
    tileEntries.length ===
      expectedTriangleCount &&
    maximumTriangleSideLengthError <=
      1e-12 &&
    maximumTriangleAreaError <=
      1e-12 &&
    parallelogramClosureError <=
      1e-12 &&
    triangleAreaClosureError <=
      1e-12 &&
    fundamentalAreaClosureError <=
      1e-12 &&
    areaAgreementError <=
      1e-12 &&
    meridianLengthError <=
      1e-12 &&
    longitudeLengthError <=
      1e-12 &&
    orthogonalityError <=
      1e-12 &&
    cuspShapeRealError <=
      1e-12 &&
    cuspShapeImaginaryMagnitudeError <=
      1e-12 &&
    failures.length ===
      0;


  if (!valid) {
    failures.push({
      reason:
        "figure-eight-cusp-completeness-audit-failed",
    });
  }


  return {
    valid,

    failures,

    domainCorners:
      validDomainCorners
        ? domainCorners.map(
            (point) => ({
              ...point,
            })
          )
        : [],

    rawTranslations: {
      U:
        rawTranslationU,

      V:
        rawTranslationV,
    },

    peripheralVectors: {
      meridian:
        meridianVector,

      longitude:
        longitudeVector,
    },

    cuspShape: {
      real:
        cuspShapeReal,

      imaginary:
        cuspShapeImaginary,

      imaginaryMagnitude:
        Math.abs(
          cuspShapeImaginary
        ),
    },

    summary: {
      triangleCount:
        tileEntries.length,

      expectedTriangleCount,

      maximumTriangleSideLengthError,

      maximumTriangleAreaError,

      parallelogramClosureError,

      totalTriangleArea,

      fundamentalArea,

      expectedCuspArea,

      triangleAreaClosureError,

      fundamentalAreaClosureError,

      areaAgreementError,

      meridianLength,

      longitudeLength,

      meridianLongitudeDot,

      meridianLengthError,

      longitudeLengthError,

      orthogonalityError,

      cuspShapeReal,

      cuspShapeImaginary,

      cuspShapeRealError,

      cuspShapeImaginaryMagnitudeError,

      expectedCuspShapeMagnitude,

      peripheralBasis:
        "meridian = u - 2v; longitude = v",

      complete:
        valid,
    },
  };
}

