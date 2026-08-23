/*
 * Continuous normal field for the exact Projection-Lab torus in S³.
 *
 * The fixed cusp boundary is a 2-manifold in S³. At every boundary
 * vertex there is therefore a one-dimensional normal line inside
 * the tangent 3-space of S³.
 */

const EPSILON = 1e-12;


function point4(
  x,
  y,
  z,
  w
) {
  return {
    x,
    y,
    z,
    w,
  };
}


function dot4(
  first,
  second
) {
  return (
    first.x * second.x +
    first.y * second.y +
    first.z * second.z +
    first.w * second.w
  );
}


function norm4(point) {
  return Math.hypot(
    point.x,
    point.y,
    point.z,
    point.w
  );
}


function normalize4(
  point,
  fallback = null
) {
  const norm =
    norm4(point);

  if (
    Number.isFinite(norm) &&
    norm > EPSILON
  ) {
    return point4(
      point.x / norm,
      point.y / norm,
      point.z / norm,
      point.w / norm
    );
  }

  return fallback
    ? normalize4(
        fallback
      )
    : point4(
        0,
        0,
        0,
        1
      );
}


function negate4(point) {
  return point4(
    -point.x,
    -point.y,
    -point.z,
    -point.w
  );
}


function determinant3(
  a00,
  a01,
  a02,
  a10,
  a11,
  a12,
  a20,
  a21,
  a22
) {
  return (
    a00 *
      (
        a11 * a22 -
        a12 * a21
      ) -
    a01 *
      (
        a10 * a22 -
        a12 * a20
      ) +
    a02 *
      (
        a10 * a21 -
        a11 * a20
      )
  );
}


/*
 * Generalized four-dimensional cross product.
 *
 * Result:
 *
 *   n · first  = 0
 *   n · second = 0
 *   n · third  = 0
 */
function orthogonal4(
  first,
  second,
  third
) {
  return point4(
    determinant3(
      first.y,
      first.z,
      first.w,
      second.y,
      second.z,
      second.w,
      third.y,
      third.z,
      third.w
    ),

    -determinant3(
      first.x,
      first.z,
      first.w,
      second.x,
      second.z,
      second.w,
      third.x,
      third.z,
      third.w
    ),

    determinant3(
      first.x,
      first.y,
      first.w,
      second.x,
      second.y,
      second.w,
      third.x,
      third.y,
      third.w
    ),

    -determinant3(
      first.x,
      first.y,
      first.z,
      second.x,
      second.y,
      second.z,
      third.x,
      third.y,
      third.z
    )
  );
}


function tangent4(
  point,
  vector
) {
  const radial =
    dot4(
      point,
      vector
    );

  return point4(
    vector.x -
      radial *
        point.x,

    vector.y -
      radial *
        point.y,

    vector.z -
      radial *
        point.z,

    vector.w -
      radial *
        point.w
  );
}


/*
 * S³ exponential map along a unit tangent normal.
 *
 * Since B · N = 0 and ||B|| = ||N|| = 1,
 *
 *   C(δ) = cos(δ) B + sin(δ) N
 *
 * lies exactly on S³.
 */
export function normalExponentialPoint(
  boundaryPoint,
  unitNormal,
  signedDepth
) {
  const cosine =
    Math.cos(
      signedDepth
    );

  const sine =
    Math.sin(
      signedDepth
    );

  return normalize4(
    point4(
      cosine *
        boundaryPoint.x +
      sine *
        unitNormal.x,

      cosine *
        boundaryPoint.y +
      sine *
        unitNormal.y,

      cosine *
        boundaryPoint.z +
      sine *
        unitNormal.z,

      cosine *
        boundaryPoint.w +
      sine *
        unitNormal.w
    ),

    boundaryPoint
  );
}


/*
 * Recover the continuous normal line field directly from the
 * 72 explicit outer collar triangle occurrences.
 */
export function buildBoundaryS3NormalField({
  quotientMesh,
  boundaryMap,
  cellParityByIndex,
}) {
  const failures = [];

  const boundaryTriangles =
    [];

  const incidentNormals =
    new Map();

  const graph =
    new Map();


  function ensureVertex(
    vertexIndex
  ) {
    if (
      !graph.has(
        vertexIndex
      )
    ) {
      graph.set(
        vertexIndex,
        new Set()
      );
    }
  }


  function connect(
    first,
    second
  ) {
    ensureVertex(
      first
    );

    ensureVertex(
      second
    );

    graph
      .get(first)
      .add(second);

    graph
      .get(second)
      .add(first);
  }


  /*
   * Locate the exact outer T² faces.
   */
  quotientMesh
    .quotientCells
    .forEach(
      (
        cell,
        cellIndex
      ) => {
        if (
          !Array.isArray(
            cell.explicitFaceKeys
          )
        ) {
          return;
        }


        cell.explicitFaceKeys
          .forEach(
            (
              key,
              omittedIndex
            ) => {
              if (
                typeof key !==
                  "string" ||
                !key.startsWith(
                  "collar-boundary:"
                )
              ) {
                return;
              }


              const vertexIndices =
                cell
                  .quotientVertexIndices
                  .filter(
                    (
                      _,
                      index
                    ) =>
                      index !==
                      omittedIndex
                  );


              if (
                vertexIndices.length !==
                  3 ||
                vertexIndices.some(
                  (vertexIndex) =>
                    !boundaryMap.has(
                      vertexIndex
                    )
                )
              ) {
                failures.push({
                  reason:
                    "invalid-boundary-triangle",

                  cellIndex,
                  key,
                  vertexIndices,
                });

                return;
              }


              const points =
                vertexIndices.map(
                  (vertexIndex) =>
                    boundaryMap.get(
                      vertexIndex
                    )
                );


              /*
               * For an S³ triangle [B0,B1,B2],
               *
               *   *(B0 ∧ B1 ∧ B2)
               *
               * is tangent to S³ and normal to the triangle.
               */
              const rawNormal =
                orthogonal4(
                  points[0],
                  points[1],
                  points[2]
                );


              const rawNorm =
                norm4(
                  rawNormal
                );


              if (
                !Number.isFinite(
                  rawNorm
                ) ||
                rawNorm <
                  EPSILON
              ) {
                failures.push({
                  reason:
                    "degenerate-boundary-triangle-normal",

                  cellIndex,
                  key,
                  vertexIndices,
                });

                return;
              }


              const normal =
                normalize4(
                  rawNormal
                );


              /*
               * Exact induced boundary orientation.
               *
               * If the coherently oriented tetrahedron has parity p,
               * then the face opposite local vertex i inherits
               *
               *     p (-1)^i
               *
               * times the stored face orientation.
               */
              const cellParity =
                cellParityByIndex?.[
                  cellIndex
                ];


              if (
                cellParity !== 1 &&
                cellParity !== -1
              ) {
                failures.push({
                  reason:
                    "missing-boundary-cell-orientation-parity",

                  cellIndex,
                  key,
                  cellParity,
                });

                return;
              }


              const inducedFaceSign =
                cellParity *
                (
                  omittedIndex % 2 === 0
                    ? 1
                    : -1
                );


              const orientedNormal =
                inducedFaceSign === 1
                  ? normal
                  : negate4(
                      normal
                    );


              boundaryTriangles.push({
                key,
                cellIndex,
                vertexIndices,

                normal:
                  orientedNormal,

                cellParity,
                inducedFaceSign,
              });


              vertexIndices.forEach(
                (vertexIndex) => {
                  if (
                    !incidentNormals
                      .has(
                        vertexIndex
                      )
                  ) {
                    incidentNormals
                      .set(
                        vertexIndex,
                        []
                      );
                  }


                  incidentNormals
                    .get(
                      vertexIndex
                    )
                    .push(
                      orientedNormal
                    );


                  ensureVertex(
                    vertexIndex
                  );
                }
              );


              connect(
                vertexIndices[0],
                vertexIndices[1]
              );

              connect(
                vertexIndices[1],
                vertexIndices[2]
              );

              connect(
                vertexIndices[2],
                vertexIndices[0]
              );
            }
          );
      }
    );


  /*
   * Average incident triangle normal LINES at each vertex.
   *
   * Their ± signs are initially arbitrary, so align them locally
   * before averaging.
   */
  const localNormals =
    new Map();

  let missingLocalNormalCount =
    0;


  boundaryMap.forEach(
    (
      boundaryPoint,
      vertexIndex
    ) => {
      const normals =
        incidentNormals
          .get(
            vertexIndex
          ) ??
        [];


      if (
        normals.length ===
        0
      ) {
        missingLocalNormalCount +=
          1;

        failures.push({
          reason:
            "missing-boundary-vertex-normal",

          vertexIndex,
        });

        return;
      }


      const reference =
        normals[0];


      /*
       * Incident triangle normals already carry the coherent
       * topological boundary orientation.
       */
      const sum =
        normals.reduce(
          (
            accumulator,
            candidate
          ) => {
            accumulator.x +=
              candidate.x;

            accumulator.y +=
              candidate.y;

            accumulator.z +=
              candidate.z;

            accumulator.w +=
              candidate.w;


            return accumulator;
          },

          point4(
            0,
            0,
            0,
            0
          )
        );


      const tangentSum =
        tangent4(
          boundaryPoint,
          sum
        );


      if (
        norm4(
          tangentSum
        ) <
        EPSILON
      ) {
        failures.push({
          reason:
            "cancelled-boundary-vertex-normal",

          vertexIndex,
        });

        return;
      }


      localNormals.set(
        vertexIndex,

        normalize4(
          tangentSum,
          reference
        )
      );
    }
  );


  /*
   * ============================================================
   * TOPOLOGICALLY ORIENTED VERTEX NORMAL FIELD
   * ============================================================
   *
   * localNormals is already globally oriented because its triangle
   * normals inherited their signs from the coherent 3-manifold.
   *
   * We retain only a graph-connectivity audit here.
   */
  const normalByVertex =
    new Map(
      localNormals
    );


  let connectedComponentCount =
    0;

  const visited =
    new Set();


  [
    ...boundaryMap.keys(),
  ]
    .sort(
      (a, b) =>
        a - b
    )
    .forEach(
      (seed) => {
        if (
          visited.has(
            seed
          )
        ) {
          return;
        }


        connectedComponentCount +=
          1;

        visited.add(
          seed
        );

        const queue = [
          seed,
        ];


        while (
          queue.length > 0
        ) {
          const current =
            queue.shift();


          (
            graph.get(
              current
            ) ??
            []
          ).forEach(
            (neighbor) => {
              if (
                visited.has(
                  neighbor
                )
              ) {
                return;
              }

              visited.add(
                neighbor
              );

              queue.push(
                neighbor
              );
            }
          );
        }
      }
    );


  /*
   * No heuristic sign propagation remains.
   */
  const signConflictCount =
    0;


  /*
   * Diagnostic only:
   * how sharply does the oriented vertex-normal field turn between
   * neighboring vertices?
   */
  let minimumAdjacentNormalDot =
    1;

  const seenNormalEdges =
    new Set();


  graph.forEach(
    (
      neighbors,
      first
    ) => {
      neighbors.forEach(
        (second) => {
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

          const key =
            `${low}:${high}`;


          if (
            seenNormalEdges.has(
              key
            )
          ) {
            return;
          }

          seenNormalEdges.add(
            key
          );


          const firstNormal =
            normalByVertex.get(
              first
            );

          const secondNormal =
            normalByVertex.get(
              second
            );


          if (
            !firstNormal ||
            !secondNormal
          ) {
            return;
          }


          minimumAdjacentNormalDot =
            Math.min(
              minimumAdjacentNormalDot,

              dot4(
                firstNormal,
                secondNormal
              )
            );
        }
      );
    }
  );


  let maximumRadialDot =
    0;


  normalByVertex.forEach(
    (
      normal,
      vertexIndex
    ) => {
      maximumRadialDot =
        Math.max(
          maximumRadialDot,

          Math.abs(
            dot4(
              boundaryMap.get(
                vertexIndex
              ),

              normal
            )
          )
        );
    }
  );


  const summary = {
    boundaryTriangleCount:
      boundaryTriangles.length,

    boundaryVertexCount:
      boundaryMap.size,

    normalVertexCount:
      normalByVertex.size,

    missingLocalNormalCount,

    connectedComponentCount,

    signConflictCount,

    minimumAdjacentNormalDot,

    maximumRadialDot,

    failureCount:
      failures.length,
  };


  return {
    valid:
      failures.length ===
        0 &&
      boundaryTriangles.length ===
        72 &&
      normalByVertex.size ===
        boundaryMap.size &&
      connectedComponentCount ===
        1 &&
      signConflictCount ===
        0,

    normalByVertex,

    failures,

    summary,
  };
}
