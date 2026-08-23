import {
  FIGURE_EIGHT_REGULAR_IDEAL_SHAPE,
  REGULAR_IDEAL_TETRAHEDRON_KLEIN_VERTICES,
  auditCanonicalHyperbolicGeometry,
  auditFigureEightCuspCompleteness,
  auditFigureEightHyperbolicGluing,
  canonicalHyperbolicVertexCharts,
} from "./intrinsicHyperbolicFigureEightGeometry";
import {
  createCanonicalBarycentricSubdivision,
} from "./intrinsicCanonicalBarycentricSubdivision";


/*
 * Intrinsic volumetric model for the compactified two-tetrahedron manifold.
 * No rendering logic lives here.
 *
 * Every volume vertex carries barycentric coordinates
 *
 *   lambda_0 + lambda_1 + lambda_2 + lambda_3 = 1
 *
 * in the original ideal tetrahedron. Each boundary face receives one
 * center vertex, and each resulting boundary triangle is coned to one body
 * center. Large hexagons are therefore split cyclically into six triangles,
 * so every 0/120/240-degree face map preserves the boundary triangulation.
 */

const EPSILON = 1e-10;


function addPoint(a, b) {
  return {
    x: a.x + b.x,
    y: a.y + b.y,
    z: a.z + b.z,
  };
}


function subtractPoint(a, b) {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z,
  };
}


function multiplyPoint(
  point,
  scalar
) {
  return {
    x: point.x * scalar,
    y: point.y * scalar,
    z: point.z * scalar,
  };
}


function crossPoint(a, b) {
  return {
    x:
      a.y * b.z -
      a.z * b.y,

    y:
      a.z * b.x -
      a.x * b.z,

    z:
      a.x * b.y -
      a.y * b.x,
  };
}


function dotPoint(a, b) {
  return (
    a.x * b.x +
    a.y * b.y +
    a.z * b.z
  );
}


function signedTetrahedronVolume(
  a,
  b,
  c,
  d
) {
  return (
    dotPoint(
      subtractPoint(b, a),
      crossPoint(
        subtractPoint(c, a),
        subtractPoint(d, a)
      )
    ) / 6
  );
}


function barycentricPoint(
  address,
  idealVertices
) {
  return address.reduce(
    (
      point,
      weight,
      index
    ) =>
      addPoint(
        point,
        multiplyPoint(
          idealVertices[index],
          weight
        )
      ),
    {
      x: 0,
      y: 0,
      z: 0,
    }
  );
}


function averageAddresses(
  addresses
) {
  const sum = [
    0,
    0,
    0,
    0,
  ];

  addresses.forEach(
    (address) =>
      address.forEach(
        (value, index) => {
          sum[index] += value;
        }
      )
  );

  return sum.map(
    (value) =>
      value /
      addresses.length
  );
}


function maxAddressError(
  first,
  second
) {
  return Math.max(
    ...first.map(
      (value, index) =>
        Math.abs(
          value -
          second[index]
        )
    )
  );
}


function truncatedCornerAddress(
  vertex,
  truncationFraction
) {
  const address = [
    0,
    0,
    0,
    0,
  ];

  address[
    vertex.fromIndex
  ] =
    1 -
    truncationFraction;

  address[
    vertex.toIndex
  ] =
    truncationFraction;

  return address;
}


function cuspAddressForCorner(
  tetrahedronId,
  vertex,
  truncationNeighbors
) {
  const neighbors =
    truncationNeighbors[
      vertex.fromIndex
    ];

  const localIndex =
    neighbors.indexOf(
      vertex.toIndex
    );

  if (localIndex < 0) {
    return null;
  }

  return {
    cuspBaseId:
      `${tetrahedronId}` +
      `${vertex.fromIndex}`,

    idealVertexIndex:
      vertex.fromIndex,

    neighborIndices: [
      ...neighbors,
    ],

    localWeights:
      neighbors.map(
        (_, index) =>
          index === localIndex
            ? 1
            : 0
      ),
  };
}


function makeVolumeMesh({
  surfaceMesh,
  idealVertices,
  truncationNeighbors,
}) {
  const tetrahedronId =
    surfaceMesh.tetrahedronId;

  /*
   * ============================================================
   * 1. ORIGINAL TWELVE TRUNCATED CORNERS
   * ============================================================
   */
  const vertices =
    surfaceMesh.vertices.map(
      (
        surfaceVertex,
        surfaceVertexIndex
      ) => {
        const barycentric =
          truncatedCornerAddress(
            surfaceVertex,
            surfaceMesh
              .truncationFraction
          );

        return {
          id:
            `${tetrahedronId}-intrinsic-` +
            surfaceVertex.id,

          kind:
            "truncated-corner",

          surfaceVertexIndex,

          barycentric,

          point:
            barycentricPoint(
              barycentric,
              idealVertices
            ),

          cuspAddress:
            cuspAddressForCorner(
              tetrahedronId,
              surfaceVertex,
              truncationNeighbors
            ),
        };
      }
    );


  function interpolateAddress(
    first,
    second,
    amount
  ) {
    return first.map(
      (
        value,
        index
      ) =>
        value +
        (
          second[index] -
          value
        ) *
          amount
    );
  }


  function interpolateCuspAddress(
    first,
    second,
    amount
  ) {
    if (
      !first ||
      !second ||
      first.cuspBaseId !==
        second.cuspBaseId ||
      first.idealVertexIndex !==
        second.idealVertexIndex ||
      first.neighborIndices.length !==
        second.neighborIndices.length ||
      first.neighborIndices.some(
        (
          neighborIndex,
          index
        ) =>
          neighborIndex !==
          second.neighborIndices[
            index
          ]
      )
    ) {
      return null;
    }

    return {
      cuspBaseId:
        first.cuspBaseId,

      idealVertexIndex:
        first.idealVertexIndex,

      neighborIndices: [
        ...first
          .neighborIndices,
      ],

      localWeights:
        first.localWeights.map(
          (
            weight,
            index
          ) =>
            weight +
            (
              second
                .localWeights[
                index
              ] -
              weight
            ) *
              amount
        ),
    };
  }


  /*
   * ============================================================
   * 2. TRISECT EVERY BOUNDARY EDGE
   * ============================================================
   *
   * This is essential after quotienting.
   *
   * Some original edge endpoints become the SAME quotient vertex:
   *
   *      a -------- b
   *
   * becomes
   *
   *      q -------- q
   *
   * A linear simplex using that edge collapses.
   *
   * Instead use:
   *
   *      a -- p1 -- p2 -- b
   *
   * so after identification:
   *
   *      q -- p1 -- p2 -- q
   *
   * remains a genuine polygonal loop.
   */
  const edgeSubdivisionByKey =
    new Map();

  surfaceMesh.edges.forEach(
    (edge) => {
      const [
        firstSurfaceVertexIndex,
        secondSurfaceVertexIndex,
      ] =
        edge.vertexIndices;

      const low =
        Math.min(
          firstSurfaceVertexIndex,
          secondSurfaceVertexIndex
        );

      const high =
        Math.max(
          firstSurfaceVertexIndex,
          secondSurfaceVertexIndex
        );

      const key =
        `${low}:${high}`;

      if (
        edgeSubdivisionByKey.has(
          key
        )
      ) {
        return;
      }

      const lowVertex =
        vertices[low];

      const highVertex =
        vertices[high];

      const oneThirdIndex =
        vertices.length;

      const oneThirdAddress =
        interpolateAddress(
          lowVertex.barycentric,
          highVertex.barycentric,
          1 / 3
        );

      vertices.push({
        id:
          `${tetrahedronId}-intrinsic-edge-` +
          `${low}-${high}-third-1`,

        kind:
          "edge-subdivision",

        surfaceEdgeVertexIndices: [
          low,
          high,
        ],

        edgeFractionFromLow:
          1 / 3,

        barycentric:
          oneThirdAddress,

        point:
          barycentricPoint(
            oneThirdAddress,
            idealVertices
          ),

        cuspAddress:
          interpolateCuspAddress(
            lowVertex.cuspAddress,
            highVertex.cuspAddress,
            1 / 3
          ),
      });


      const twoThirdIndex =
        vertices.length;

      const twoThirdAddress =
        interpolateAddress(
          lowVertex.barycentric,
          highVertex.barycentric,
          2 / 3
        );

      vertices.push({
        id:
          `${tetrahedronId}-intrinsic-edge-` +
          `${low}-${high}-third-2`,

        kind:
          "edge-subdivision",

        surfaceEdgeVertexIndices: [
          low,
          high,
        ],

        edgeFractionFromLow:
          2 / 3,

        barycentric:
          twoThirdAddress,

        point:
          barycentricPoint(
            twoThirdAddress,
            idealVertices
          ),

        cuspAddress:
          interpolateCuspAddress(
            lowVertex.cuspAddress,
            highVertex.cuspAddress,
            2 / 3
          ),
      });

      edgeSubdivisionByKey.set(
        key,
        [
          oneThirdIndex,
          twoThirdIndex,
        ]
      );
    }
  );


  function directedEdgeSubdivision(
    firstSurfaceVertexIndex,
    secondSurfaceVertexIndex
  ) {
    const low =
      Math.min(
        firstSurfaceVertexIndex,
        secondSurfaceVertexIndex
      );

    const high =
      Math.max(
        firstSurfaceVertexIndex,
        secondSurfaceVertexIndex
      );

    const subdivision =
      edgeSubdivisionByKey.get(
        `${low}:${high}`
      );

    if (!subdivision) {
      throw new Error(
        "Missing intrinsic edge subdivision"
      );
    }

    return (
      firstSurfaceVertexIndex ===
      low
        ? subdivision
        : [
            subdivision[1],
            subdivision[0],
          ]
    );
  }


  /*
   * ============================================================
   * 3. REFINED BOUNDARY FACES
   * ============================================================
   *
   * Large hexagon:
   *
   *      6 original sides
   *        ->
   *      18 refined sides
   *
   * Cusp triangle:
   *
   *      3 original sides
   *        ->
   *       9 refined sides
   */
  const boundaryFaces =
    surfaceMesh.faces.map(
      (face) => {
        const cornerVertexIndices =
          [
            ...face
              .vertexIndices,
          ];

        const refinedPerimeterVertexIndices =
          [];

        cornerVertexIndices.forEach(
          (
            vertexIndex,
            edgeIndex
          ) => {
            const nextVertexIndex =
              cornerVertexIndices[
                (
                  edgeIndex + 1
                ) %
                cornerVertexIndices
                  .length
              ];

            refinedPerimeterVertexIndices.push(
              vertexIndex,
              ...directedEdgeSubdivision(
                vertexIndex,
                nextVertexIndex
              )
            );
          }
        );


        const centerAddress =
          averageAddresses(
            cornerVertexIndices.map(
              (index) =>
                vertices[
                  index
                ].barycentric
            )
          );

        const faceCenterVertexIndex =
          vertices.length;

        const cuspBaseId =
          face.kind === "cusp"
            ? (
                `${tetrahedronId}` +
                `${face.vertexIndex}`
              )
            : null;

        vertices.push({
          id:
            `${tetrahedronId}-intrinsic-` +
            `${face.id}-center`,

          kind:
            "face-center",

          surfaceFaceId:
            face.id,

          barycentric:
            centerAddress,

          point:
            barycentricPoint(
              centerAddress,
              idealVertices
            ),

          cuspAddress:
            face.kind === "cusp"
              ? {
                  cuspBaseId,

                  idealVertexIndex:
                    face.vertexIndex,

                  neighborIndices: [
                    ...truncationNeighbors[
                      face.vertexIndex
                    ],
                  ],

                  localWeights: [
                    1 / 3,
                    1 / 3,
                    1 / 3,
                  ],
                }
              : null,
        });


        return {
          id:
            `${tetrahedronId}-intrinsic-boundary-` +
            face.id,

          surfaceFaceId:
            face.id,

          kind:
            face.kind,

          pairId:
            face.pairId ??
            null,

          cuspBaseId,

          faceCenterVertexIndex,

          /*
           * Keep the original corners separately.
           *
           * The source/target correspondence diagnostic uses these
           * exact three cusp-triangle corners.
           */
          cornerVertexIndices,

          perimeterVertexIndices:
            cornerVertexIndices,

          /*
           * This perimeter drives the actual volumetric mesh.
           */
          refinedPerimeterVertexIndices,

          /*
           * All vertices participating in this boundary face.
           *
           * Large-face quotient matching must include the new edge
           * subdivision points too.
           */
          volumeVertexIndices: [
            faceCenterVertexIndex,
            ...refinedPerimeterVertexIndices,
          ],

          boundaryTriangleIndices:
            [],
        };
      }
    );


  /*
   * ============================================================
   * 4. BODY CENTER
   * ============================================================
   */
  const bodyCenterAddress = [
    0.25,
    0.25,
    0.25,
    0.25,
  ];

  const bodyCenterVertexIndex =
    vertices.length;

  vertices.push({
    id:
      `${tetrahedronId}-intrinsic-body-center`,

    kind:
      "body-center",

    barycentric:
      bodyCenterAddress,

    point:
      barycentricPoint(
        bodyCenterAddress,
        idealVertices
      ),

    cuspAddress:
      null,
  });


  /*
   * ============================================================
   * 5. VOLUMETRIC CELLS
   * ============================================================
   *
   * Cone every REFINED boundary triangle to the body center.
   *
   * Per truncated tetrahedron:
   *
   *   4 large faces × 18 = 72
   *   4 cusp faces  ×  9 = 36
   *
   *                    total = 108 tetrahedra
   */
  const boundaryTriangles =
    [];

  const cells = [];

  boundaryFaces.forEach(
    (face) => {
      const perimeter =
        face
          .refinedPerimeterVertexIndices;

      perimeter.forEach(
        (
          vertexIndex,
          edgeIndex
        ) => {
          const nextVertexIndex =
            perimeter[
              (
                edgeIndex + 1
              ) %
              perimeter.length
            ];

          const boundaryTriangle = [
            face
              .faceCenterVertexIndex,

            vertexIndex,

            nextVertexIndex,
          ];

          const boundaryTriangleIndex =
            boundaryTriangles.length;

          boundaryTriangles.push({
            id:
              `${face.id}-triangle-` +
              `${edgeIndex}`,

            faceId:
              face.surfaceFaceId,

            kind:
              face.kind,

            pairId:
              face.pairId,

            cuspBaseId:
              face.cuspBaseId,

            volumeVertexIndices: [
              ...boundaryTriangle,
            ],
          });

          face
            .boundaryTriangleIndices
            .push(
              boundaryTriangleIndex
            );


          const cellVertexIndices = [
            bodyCenterVertexIndex,
            ...boundaryTriangle,
          ];

          let volume =
            signedTetrahedronVolume(
              ...cellVertexIndices.map(
                (index) =>
                  vertices[
                    index
                  ].point
              )
            );

          /*
           * Store every reference tetrahedron with positive
           * orientation.
           */
          if (volume < 0) {
            [
              cellVertexIndices[2],
              cellVertexIndices[3],
            ] = [
              cellVertexIndices[3],
              cellVertexIndices[2],
            ];

            volume = -volume;
          }


          cells.push({
            id:
              `${tetrahedronId}-intrinsic-cell-` +
              `${cells.length}`,

            boundaryFaceId:
              face.surfaceFaceId,

            boundaryKind:
              face.kind,

            pairId:
              face.pairId,

            cuspBaseId:
              face.cuspBaseId,

            volumeVertexIndices:
              cellVertexIndices,

            referenceVolume:
              volume,
          });
        }
      );
    }
  );


  /*
   * Truncating one ideal vertex removes a tetrahedron scaled by f
   * in each of three independent directions, hence f^3 in volume.
   */
  const originalVolume =
    Math.abs(
      signedTetrahedronVolume(
        ...idealVertices
      )
    );

  const expectedTruncatedVolume =
    originalVolume *
    (
      1 -
      4 *
        surfaceMesh
          .truncationFraction ** 3
    );

  const totalCellVolume =
    cells.reduce(
      (sum, cell) =>
        sum +
        cell.referenceVolume,
      0
    );


  return {
    tetrahedronId,

    truncationFraction:
      surfaceMesh
        .truncationFraction,

    vertices,

    cells,

    boundaryFaces,

    boundaryTriangles,

    bodyCenterVertexIndex,

    boundaryEdgeSubdivisionCount:
      edgeSubdivisionByKey.size,

    boundaryEdgeSubdivisionSegments:
      3,

    expectedTruncatedVolume,

    totalCellVolume,

    minimumCellVolume:
      Math.min(
        ...cells.map(
          (cell) =>
            cell.referenceVolume
        )
      ),
  };
}

export function createIntrinsicVolumeMeshes({
  surfaceMeshes,
  idealVertices,
  truncationNeighbors,
}) {
  return {
    A:
      makeVolumeMesh({
        surfaceMesh:
          surfaceMeshes.A,

        idealVertices,

        truncationNeighbors,
      }),

    B:
      makeVolumeMesh({
        surfaceMesh:
          surfaceMeshes.B,

        idealVertices,

        truncationNeighbors,
      }),
  };
}


function boundaryFace(
  volumeMesh,
  kind,
  id
) {
  return (
    volumeMesh
      .boundaryFaces
      .find(
        (face) =>
          face.kind === kind &&
          (
            kind === "large"
              ? face.pairId === id
              : face.cuspBaseId === id
          )
      ) ??
    null
  );
}


function mapFaceAddress({
  address,
  pair,
  mappingIndex,
  mappingPermutations,
}) {
  const mapped = [
    0,
    0,
    0,
    0,
  ];

  const permutation =
    mappingPermutations[
      mappingIndex
    ];

  /*
   * This is the intrinsic face map:
   *
   *   A ideal vertex
   *       ->
   *   corresponding B ideal vertex.
   */
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


function rawCuspPoint(
  cuspAddress,
  cuspFlatLayout
) {
  const triangle =
    cuspFlatLayout[
      cuspAddress
        .cuspBaseId
    ];

  if (!triangle) {
    return null;
  }

  const corners =
    cuspAddress
      .neighborIndices
      .map(
        (neighborIndex) =>
          triangle[
            neighborIndex
          ]
      );

  if (
    corners.some(
      (point) => !point
    )
  ) {
    return null;
  }

  return {
    x:
      corners.reduce(
        (
          sum,
          point,
          index
        ) =>
          sum +
          point.x *
            cuspAddress
              .localWeights[
              index
            ],
        0
      ),

    y:
      corners.reduce(
        (
          sum,
          point,
          index
        ) =>
          sum +
          point.y *
            cuspAddress
              .localWeights[
              index
            ],
        0
      ),
  };
}


export function validateIntrinsicVolumeQuotient({
  volumeMeshes,
  facePairs,
  facePairMappingIndices,
  mappingPermutations,
  cuspFlatLayout,
  cuspCoordinateMapper,
}) {
  /*
   * ------------------------------------------------------------
   * 1. Volume integrity
   * ------------------------------------------------------------
   */
  const volumeDiagnostics =
    ["A", "B"].map(
      (tetrahedronId) => {
        const mesh =
          volumeMeshes[
            tetrahedronId
          ];

        const volumeError =
          Math.abs(
            mesh.totalCellVolume -
            mesh
              .expectedTruncatedVolume
          );

        return {
          tetrahedronId,

          vertexCount:
            mesh.vertices.length,

          cellCount:
            mesh.cells.length,

          boundaryTriangleCount:
            mesh
              .boundaryTriangles
              .length,

          minimumCellVolume:
            mesh.minimumCellVolume,

          volumeError,

          valid:
            mesh.cells.length > 0 &&
            mesh.cells.length ===
              mesh
                .boundaryTriangles
                .length &&
            mesh.minimumCellVolume >
              EPSILON &&
            volumeError <
              EPSILON,
        };
      }
    );

  /*
   * ------------------------------------------------------------
   * 2. Exact large-face quotient correspondence
   * ------------------------------------------------------------
   *
   * A paired large face has:
   *
   *   6 perimeter vertices
   *   1 face-center vertex
   *   6 boundary triangles.
   *
   * All seven vertices and all six triangles must map exactly.
   */
  const facePairDiagnostics =
    facePairs.map(
      (pair) => {
        const mappingIndex =
          (
            (
              Math.round(
                facePairMappingIndices?.[
                  pair.id
                ] ?? 0
              ) %
              mappingPermutations
                .length
            ) +
            mappingPermutations
              .length
          ) %
          mappingPermutations
            .length;

        const faceA =
          boundaryFace(
            volumeMeshes.A,
            "large",
            pair.id
          );

        const faceB =
          boundaryFace(
            volumeMeshes.B,
            "large",
            pair.id
          );

        const mappedVertexIndexByA =
          new Map();

        let maximumVertexError = 0;

        faceA
          .volumeVertexIndices
          .forEach(
            (vertexAIndex) => {
              const mappedAddress =
                mapFaceAddress({
                  address:
                    volumeMeshes.A
                      .vertices[
                      vertexAIndex
                    ].barycentric,

                  pair,

                  mappingIndex,

                  mappingPermutations,
                });

              let bestIndex =
                null;

              let bestError =
                Infinity;

              faceB
                .volumeVertexIndices
                .forEach(
                  (vertexBIndex) => {
                    const error =
                      maxAddressError(
                        mappedAddress,

                        volumeMeshes.B
                          .vertices[
                          vertexBIndex
                        ].barycentric
                      );

                    if (
                      error <
                      bestError
                    ) {
                      bestError =
                        error;

                      bestIndex =
                        vertexBIndex;
                    }
                  }
                );

              maximumVertexError =
                Math.max(
                  maximumVertexError,
                  bestError
                );

              if (
                bestIndex !==
                  null &&
                bestError <=
                  EPSILON
              ) {
                mappedVertexIndexByA
                  .set(
                    vertexAIndex,
                    bestIndex
                  );
              }
            }
          );

        const targetTriangleKeys =
          new Set(
            faceB
              .boundaryTriangleIndices
              .map(
                (triangleIndex) =>
                  volumeMeshes.B
                    .boundaryTriangles[
                    triangleIndex
                  ]
                    .volumeVertexIndices
                    .slice()
                    .sort(
                      (a, b) =>
                        a - b
                    )
                    .join(":")
              )
          );

        let matchedTriangleCount =
          0;

        faceA
          .boundaryTriangleIndices
          .forEach(
            (triangleIndex) => {
              const mapped =
                volumeMeshes.A
                  .boundaryTriangles[
                  triangleIndex
                ]
                  .volumeVertexIndices
                  .map(
                    (vertexAIndex) =>
                      mappedVertexIndexByA
                        .get(
                          vertexAIndex
                        )
                  );

              if (
                mapped.every(
                  (index) =>
                    index !==
                    undefined
                ) &&
                targetTriangleKeys
                  .has(
                    mapped
                      .slice()
                      .sort(
                        (a, b) =>
                          a - b
                      )
                      .join(":")
                  )
              ) {
                matchedTriangleCount +=
                  1;
              }
            }
          );

        return {
          pairId:
            pair.id,

          mappingIndex,

          boundaryVertexCount:
            faceA
              .volumeVertexIndices
              .length,

          matchedVertexCount:
            mappedVertexIndexByA
              .size,

          boundaryTriangleCount:
            faceA
              .boundaryTriangleIndices
              .length,

          matchedTriangleCount,

          maximumVertexError,

          valid:
            mappedVertexIndexByA
              .size ===
              faceA
                .volumeVertexIndices
                .length &&
            matchedTriangleCount ===
              faceA
                .boundaryTriangleIndices
                .length &&
            maximumVertexError <=
              EPSILON,
        };
      }
    );

  /*
   * ------------------------------------------------------------
   * 3. Cusp-boundary addressing
   * ------------------------------------------------------------
   *
   * Each of the eight truncation triangles contributes:
   *
   *   3 corner vertices
   *   1 center vertex
   *
   * = 32 boundary-address references across A and B.
   *
   * Each must map:
   *
   *   barycentric tetrahedron address
   *       ->
   *   local cusp-triangle address
   *       ->
   *   developed raw point
   *       ->
   *   intrinsic cusp (u,v).
   */
  const expectedCuspBoundaryReferenceCount =
    ["A", "B"].reduce(
      (
        total,
        tetrahedronId
      ) =>
        total +
        volumeMeshes[
          tetrahedronId
        ]
          .boundaryFaces
          .filter(
            (face) =>
              face.kind === "cusp"
          )
          .reduce(
            (
              faceTotal,
              face
            ) =>
              faceTotal +
              face
                .volumeVertexIndices
                .length,
            0
          ),
      0
    );

  let cuspBoundaryReferenceCount =
    0;

  let cuspAddressCount =
    0;

  let cuspDomainCoordinateCount =
    0;

  const cuspFailures = [];

  ["A", "B"].forEach(
    (tetrahedronId) => {
      const mesh =
        volumeMeshes[
          tetrahedronId
        ];

      mesh.boundaryFaces
        .filter(
          (face) =>
            face.kind === "cusp"
        )
        .forEach(
          (face) => {
            face
              .volumeVertexIndices
              .forEach(
                (vertexIndex) => {
                  cuspBoundaryReferenceCount +=
                    1;

                  const address =
                    mesh.vertices[
                      vertexIndex
                    ].cuspAddress;

                  if (
                    !address ||
                    address
                      .cuspBaseId !==
                      face.cuspBaseId
                  ) {
                    cuspFailures.push({
                      tetrahedronId,

                      cuspBaseId:
                        face.cuspBaseId,

                      vertexIndex,

                      reason:
                        "missing-cusp-address",
                    });

                    return;
                  }

                  cuspAddressCount +=
                    1;

                  const raw =
                    rawCuspPoint(
                      address,
                      cuspFlatLayout
                    );

                  const coordinates =
                    raw
                      ? cuspCoordinateMapper(
                          raw
                        )
                      : null;

                  if (
                    raw &&
                    Number.isFinite(
                      raw.x
                    ) &&
                    Number.isFinite(
                      raw.y
                    ) &&
                    coordinates &&
                    Number.isFinite(
                      coordinates.u
                    ) &&
                    Number.isFinite(
                      coordinates.v
                    )
                  ) {
                    cuspDomainCoordinateCount +=
                      1;

                    return;
                  }

                  cuspFailures.push({
                    tetrahedronId,

                    cuspBaseId:
                      face.cuspBaseId,

                    vertexIndex,

                    reason:
                      "invalid-cusp-coordinate",
                  });
                }
              );
          }
        );
    }
  );

  const valid =
    volumeDiagnostics.every(
      (item) =>
        item.valid
    ) &&
    facePairDiagnostics.every(
      (item) =>
        item.valid
    ) &&
    cuspBoundaryReferenceCount ===
      expectedCuspBoundaryReferenceCount &&
    cuspAddressCount ===
      expectedCuspBoundaryReferenceCount &&
    cuspDomainCoordinateCount ===
      expectedCuspBoundaryReferenceCount &&
    cuspFailures.length ===
      0;

  return {
    valid,

    volumeDiagnostics,

    facePairDiagnostics,

    cuspBoundary: {
      expectedReferenceCount:
        expectedCuspBoundaryReferenceCount,

      referenceCount:
        cuspBoundaryReferenceCount,

      addressCount:
        cuspAddressCount,

      domainCoordinateCount:
        cuspDomainCoordinateCount,

      failures:
        cuspFailures,
    },

    summary: {
      tetrahedronCount:
        2,

      volumeVertexCount:
        volumeDiagnostics.reduce(
          (sum, item) =>
            sum +
            item.vertexCount,
          0
        ),

      volumeCellCount:
        volumeDiagnostics.reduce(
          (sum, item) =>
            sum +
            item.cellCount,
          0
        ),

      exactPairedLargeFaceCount:
        facePairDiagnostics
          .filter(
            (item) =>
              item.valid
          )
          .length,

      cuspBoundaryAddressCount:
        cuspAddressCount,
    },
  };
}


function intrinsicDebugEdgeKind(
  firstVertex,
  secondVertex
) {
  const kinds = [
    firstVertex.kind,
    secondVertex.kind,
  ].sort();

  const signature =
    kinds.join(":");

  if (
    signature ===
    "body-center:face-center"
  ) {
    return "core-spoke";
  }

  if (
    signature ===
    "face-center:truncated-corner"
  ) {
    return "face-spoke";
  }

  if (
    signature ===
    "truncated-corner:truncated-corner"
  ) {
    return "boundary-rim";
  }

  if (
    signature ===
    "body-center:truncated-corner"
  ) {
    return "cell-diagonal";
  }

  return "misc";
}


function pushIntrinsicDebugEdge(
  edgeMap,
  tetrahedronId,
  firstIndex,
  secondIndex,
  vertices
) {
  const low =
    Math.min(
      firstIndex,
      secondIndex
    );

  const high =
    Math.max(
      firstIndex,
      secondIndex
    );

  const key =
    `${tetrahedronId}:${low}:${high}`;

  if (edgeMap.has(key)) {
    return;
  }

  const firstVertex =
    vertices[low];

  const secondVertex =
    vertices[high];

  edgeMap.set(key, {
    key,
    tetrahedronId,

    startVertexIndex:
      low,

    endVertexIndex:
      high,

    kind:
      intrinsicDebugEdgeKind(
        firstVertex,
        secondVertex
      ),

    start:
      firstVertex.point,

    end:
      secondVertex.point,

    startKind:
      firstVertex.kind,

    endKind:
      secondVertex.kind,
  });
}


export function createIntrinsicVolumeDebugGeometry({
  volumeMeshes,
}) {
  const lines = [];
  const points = [];

  ["A", "B"].forEach(
    (tetrahedronId) => {
      const mesh =
        volumeMeshes?.[
          tetrahedronId
        ];

      if (!mesh) {
        return;
      }

      const edgeMap =
        new Map();

      mesh.cells.forEach(
        (cell) => {
          const ids =
            cell.volumeVertexIndices;

          for (
            let first = 0;
            first < ids.length;
            first += 1
          ) {
            for (
              let second =
                first + 1;
              second < ids.length;
              second += 1
            ) {
              pushIntrinsicDebugEdge(
                edgeMap,
                tetrahedronId,
                ids[first],
                ids[second],
                mesh.vertices
              );
            }
          }
        }
      );

      edgeMap.forEach(
        (edge) => {
          lines.push(edge);
        }
      );

      mesh.vertices.forEach(
        (vertex, index) => {
          if (
            vertex.kind !==
              "body-center" &&
            vertex.kind !==
              "face-center"
          ) {
            return;
          }

          points.push({
            key:
              `${tetrahedronId}-debug-point-` +
              `${index}`,

            tetrahedronId,

            vertexIndex:
              index,

            kind:
              vertex.kind,

            point:
              vertex.point,
          });
        }
      );
    }
  );

  return {
    lines,
    points,
  };
}



/*
 * Exact handshake between the intrinsic truncated-cell boundary and the
 * developed cusp coordinates used by the shared Projection Lab geometry.
 *
 * No ambient path is invented here. We expose only the source boundary
 * address and its exact raw/(u,v) target address.
 */
export function createIntrinsicCuspBoundaryCorrespondence({
  volumeMeshes,
  cuspFlatLayout,
  cuspCoordinateMapper,
}) {
  const triangles = [];
  const failures = [];

  ["A", "B"].forEach(
    (tetrahedronId) => {
      const mesh =
        volumeMeshes?.[
          tetrahedronId
        ];

      if (!mesh) {
        failures.push({
          tetrahedronId,
          reason:
            "missing-volume-mesh",
        });

        return;
      }

      mesh.boundaryFaces
        .filter(
          (face) =>
            face.kind === "cusp"
        )
        .forEach(
          (face) => {
            const cornerReferences =
              face
                .perimeterVertexIndices
                .map(
                  (
                    volumeVertexIndex
                  ) => {
                    const vertex =
                      mesh.vertices[
                        volumeVertexIndex
                      ];

                    const address =
                      vertex?.cuspAddress ??
                      null;

                    const raw =
                      address
                        ? rawCuspPoint(
                            address,
                            cuspFlatLayout
                          )
                        : null;

                    const coordinates =
                      raw
                        ? cuspCoordinateMapper(
                            raw
                          )
                        : null;

                    const localCornerIndex =
                      address
                        ?.localWeights
                        ?.findIndex(
                          (weight) =>
                            weight > 0.5
                        ) ?? -1;

                    const neighborIndex =
                      localCornerIndex >= 0
                        ? address
                            .neighborIndices[
                            localCornerIndex
                          ]
                        : null;

                    const valid =
                      Number.isInteger(
                        vertex
                          ?.surfaceVertexIndex
                      ) &&
                      raw !== null &&
                      Number.isFinite(
                        raw.x
                      ) &&
                      Number.isFinite(
                        raw.y
                      ) &&
                      coordinates !==
                        null &&
                      Number.isFinite(
                        coordinates.u
                      ) &&
                      Number.isFinite(
                        coordinates.v
                      ) &&
                      Number.isInteger(
                        neighborIndex
                      );

                    if (!valid) {
                      failures.push({
                        tetrahedronId,

                        cuspBaseId:
                          face
                            .cuspBaseId,

                        volumeVertexIndex,

                        reason:
                          "invalid-cusp-corner-reference",
                      });
                    }

                    return {
                      volumeVertexIndex,

                      surfaceVertexIndex:
                        vertex
                          ?.surfaceVertexIndex ??
                        null,

                      neighborIndex,

                      barycentric:
                        vertex
                          ?.barycentric ??
                        null,

                      cuspAddress:
                        address,

                      raw,

                      coordinates,

                      valid,
                    };
                  }
                );

            const centerVertex =
              mesh.vertices[
                face
                  .faceCenterVertexIndex
              ];

            const centerAddress =
              centerVertex
                ?.cuspAddress ??
              null;

            const centerRaw =
              centerAddress
                ? rawCuspPoint(
                    centerAddress,
                    cuspFlatLayout
                  )
                : null;

            const centerCoordinates =
              centerRaw
                ? cuspCoordinateMapper(
                    centerRaw
                  )
                : null;

            triangles.push({
              tetrahedronId,

              cuspBaseId:
                face.cuspBaseId,

              idealVertexIndex:
                centerAddress
                  ?.idealVertexIndex ??
                null,

              surfaceFaceId:
                face.surfaceFaceId,

              corners:
                cornerReferences,

              center: {
                volumeVertexIndex:
                  face
                    .faceCenterVertexIndex,

                barycentric:
                  centerVertex
                    ?.barycentric ??
                  null,

                cuspAddress:
                  centerAddress,

                raw:
                  centerRaw,

                coordinates:
                  centerCoordinates,
              },
            });
          }
        );
    }
  );

  const cornerCount =
    triangles.reduce(
      (sum, triangle) =>
        sum +
        triangle.corners.length,
      0
    );

  const validCornerCount =
    triangles.reduce(
      (sum, triangle) =>
        sum +
        triangle.corners.filter(
          (corner) =>
            corner.valid
        ).length,
      0
    );

  return {
    valid:
      triangles.length === 8 &&
      cornerCount === 24 &&
      validCornerCount === 24 &&
      failures.length === 0,

    triangles,

    failures,

    summary: {
      triangleCount:
        triangles.length,

      cornerCount,

      validCornerCount,
    },
  };
}



function quotientNodeKey(
  tetrahedronId,
  volumeVertexIndex
) {
  return (
    `${tetrahedronId}:` +
    `${volumeVertexIndex}`
  );
}


function normalizeMappingIndex(
  rawIndex,
  mappingPermutations
) {
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


function makeUnionFind(keys) {
  const parent =
    new Map(
      keys.map(
        (key) => [key, key]
      )
    );

  function find(key) {
    const current =
      parent.get(key);

    if (current === key) {
      return key;
    }

    const root = find(current);
    parent.set(key, root);
    return root;
  }

  function union(first, second) {
    const firstRoot =
      find(first);

    const secondRoot =
      find(second);

    if (firstRoot === secondRoot) {
      return firstRoot;
    }

    const canonicalRoot =
      firstRoot < secondRoot
        ? firstRoot
        : secondRoot;

    const nonCanonicalRoot =
      firstRoot < secondRoot
        ? secondRoot
        : firstRoot;

    parent.set(
      nonCanonicalRoot,
      canonicalRoot
    );

    return canonicalRoot;
  }

  return {
    parent,
    find,
    union,
  };
}


function periodicUnitCoordinateError(
  first,
  second
) {
  const delta =
    first - second;

  /*
   * Distance modulo the unit period.
   *
   * Examples:
   *
   *   0 and 1     -> 0
   *   0.2 and 1.2 -> 0
   *   0.2 and 0.3 -> 0.1
   */
  return Math.abs(
    delta -
    Math.round(delta)
  );
}


function coordinateError(
  first,
  second
) {
  return Math.max(
    periodicUnitCoordinateError(
      first.u,
      second.u
    ),

    periodicUnitCoordinateError(
      first.v,
      second.v
    )
  );
}


function addCanonicalCuspCollar({
  quotientVertices,
  quotientCells,
  failures,
  volumeMeshes,
  facePairs,
  facePairMappingIndices,
  mappingPermutations,
  quotientIndexByNodeKey,
  cuspFlatLayout,
  cuspCoordinateMapper,
}) {
  const baseQuotientVertexCount =
    quotientVertices.length;

  const baseQuotientCellCount =
    quotientCells.length;

  const boundaryVertexIndices =
    quotientVertices
      .filter(
        (vertex) =>
          vertex.cuspBoundary
      )
      .map(
        (vertex) =>
          vertex.quotientVertexIndex
      );


  /*
   * ============================================================
   * 1. INNER COPY OF THE CANONICAL TORUS
   * ============================================================
   *
   * B_i = fixed Projection-Lab boundary vertex
   * C_i = movable inner-collar partner
   */
  const collarIndexByBoundaryVertex =
    new Map();


  boundaryVertexIndices.forEach(
    (boundaryVertexIndex) => {
      const boundaryVertex =
        quotientVertices[
          boundaryVertexIndex
        ];

      const collarVertexIndex =
        quotientVertices.length;

      collarIndexByBoundaryVertex.set(
        boundaryVertexIndex,
        collarVertexIndex
      );

      quotientVertices.push({
        quotientVertexIndex:
          collarVertexIndex,

        root:
          `collar:${boundaryVertex.root}`,

        kinds: [
          "cusp-collar",
        ],

        memberRefs: [],

        sourcePoint:
          boundaryVertex.sourcePoint,

        barycentricAddresses: [],

        /*
         * Only B_i is a fixed boundary condition.
         */
        cuspBoundary: false,
        cuspData: null,

        cuspCollar: true,

        collarParentQuotientVertexIndex:
          boundaryVertexIndex,

        /*
         * Preserve the same intrinsic torus address on C_i.
         */
        collarData: {
          boundaryQuotientVertexIndex:
            boundaryVertexIndex,

          raw:
            boundaryVertex
              .cuspData
              ?.representative
              ?.raw ??
            null,

          coordinates:
            boundaryVertex
              .cuspData
              ?.representative
              ?.coordinates ??
            null,
        },
      });
    }
  );


  function quotientEdgeKey(
    first,
    second
  ) {
    return (
      first < second
        ? `${first}:${second}`
        : `${second}:${first}`
    );
  }


  function radialEdgeOccurrenceKey(
    tetrahedronId,
    sourceBoundaryFaceId,
    firstSourceVertexIndex,
    secondSourceVertexIndex
  ) {
    const low =
      Math.min(
        firstSourceVertexIndex,
        secondSourceVertexIndex
      );

    const high =
      Math.max(
        firstSourceVertexIndex,
        secondSourceVertexIndex
      );

    return (
      `collar-radial-edge:` +
      `${tetrahedronId}:` +
      `${sourceBoundaryFaceId}:` +
      `${low}:${high}`
    );
  }


  function collarInnerFaceKey(
    boundaryTriangleIndex
  ) {
    return (
      `collar-inner:` +
      `${boundaryTriangleIndex}`
    );
  }


  function collarPrismInternalFaceKey(
    boundaryTriangleIndex,
    localFaceIndex
  ) {
    return (
      `collar-prism-internal:` +
      `${boundaryTriangleIndex}:` +
      `${localFaceIndex}`
    );
  }


  function collarSideFaceKey(
    boundaryEdgeOccurrenceKey,
    half
  ) {
    return (
      `collar-side:` +
      `${boundaryEdgeOccurrenceKey}:` +
      `${half}`
    );
  }


  function sourceVertex(
    tetrahedronId,
    volumeVertexIndex
  ) {
    return (
      volumeMeshes?.[
        tetrahedronId
      ]?.vertices?.[
        volumeVertexIndex
      ] ??
      null
    );
  }


  /*
   * A cusp-perimeter segment lies on exactly one large face.
   */
  function sourceLargeFaceForEdge(
    tetrahedronId,
    firstSourceVertexIndex,
    secondSourceVertexIndex
  ) {
    const mesh =
      volumeMeshes?.[
        tetrahedronId
      ];

    if (!mesh) {
      return null;
    }

    const matches =
      mesh.boundaryFaces
        .filter(
          (face) =>
            face.kind ===
              "large" &&
            face
              .volumeVertexIndices
              .includes(
                firstSourceVertexIndex
              ) &&
            face
              .volumeVertexIndices
              .includes(
                secondSourceVertexIndex
              )
        );

    return (
      matches.length === 1
        ? matches[0]
        : null
    );
  }


  function unorderedAddressPairError(
    firstA,
    secondA,
    firstB,
    secondB
  ) {
    const direct =
      Math.max(
        maxAddressError(
          firstA,
          firstB
        ),

        maxAddressError(
          secondA,
          secondB
        )
      );

    const reversed =
      Math.max(
        maxAddressError(
          firstA,
          secondB
        ),

        maxAddressError(
          secondA,
          firstB
        )
      );

    return Math.min(
      direct,
      reversed
    );
  }


  /*
   * ============================================================
   * 2. DETACH THE OLD CORE FROM THE FIXED TORUS
   * ============================================================
   *
   * Replace every old cusp-boundary occurrence B_i in the core
   * with C_i.
   *
   * Crucially, retain the exact PRE-QUOTIENT source triangle
   * occurrence. Quotient vertex IDs alone are insufficient here.
   */
  const boundaryTriangles = [];


  const coreCells =
    quotientCells.map(
      (cell) => {
        const topologyVertexIndices = [
          ...cell
            .quotientVertexIndices,
        ];

        const quotientVertexIndices =
          topologyVertexIndices.map(
            (index) =>
              collarIndexByBoundaryVertex
                .get(index) ??
              index
          );

        const faceKeyOverrides =
          Array(4).fill(null);


        if (
          cell.sourceBoundaryKind ===
          "cusp"
        ) {
          const sourceMesh =
            volumeMeshes?.[
              cell.tetrahedronId
            ];

          const sourceVolumeVertexIndices =
            cell
              .sourceVolumeVertexIndices ??
            [];

          const sourceBoundaryVertexIndices =
            sourceVolumeVertexIndices
              .filter(
                (sourceVertexIndex) =>
                  Boolean(
                    sourceMesh
                      ?.vertices?.[
                      sourceVertexIndex
                    ]
                      ?.cuspAddress
                  )
              );

          const sourceFaceCenterVertexIndices =
            sourceBoundaryVertexIndices
              .filter(
                (sourceVertexIndex) =>
                  sourceMesh
                    ?.vertices?.[
                    sourceVertexIndex
                  ]?.kind ===
                  "face-center"
              );

          const sourcePerimeterVertexIndices =
            sourceBoundaryVertexIndices
              .filter(
                (sourceVertexIndex) =>
                  sourceMesh
                    ?.vertices?.[
                    sourceVertexIndex
                  ]?.kind !==
                  "face-center"
              );


          if (
            sourceBoundaryVertexIndices
              .length !==
              3 ||
            sourceFaceCenterVertexIndices
              .length !==
              1 ||
            sourcePerimeterVertexIndices
              .length !==
              2
          ) {
            failures.push({
              reason:
                "invalid-cusp-source-boundary-pattern",

              sourceCellId:
                cell.sourceCellId,

              tetrahedronId:
                cell.tetrahedronId,

              sourceVolumeVertexIndices,

              sourceBoundaryVertexIndices,
            });
          } else {
            const outerVertexIndices =
              sourceBoundaryVertexIndices
                .map(
                  (sourceVertexIndex) =>
                    quotientIndexByNodeKey
                      .get(
                        quotientNodeKey(
                          cell
                            .tetrahedronId,

                          sourceVertexIndex
                        )
                      )
                );

            const innerVertexIndices =
              outerVertexIndices.map(
                (index) =>
                  collarIndexByBoundaryVertex
                    .get(index)
              );


            if (
              outerVertexIndices.some(
                (index) =>
                  !Number.isInteger(
                    index
                  )
              ) ||
              innerVertexIndices.some(
                (index) =>
                  !Number.isInteger(
                    index
                  )
              ) ||
              new Set(
                outerVertexIndices
              ).size !==
                3
            ) {
              failures.push({
                reason:
                  "invalid-cusp-collar-boundary-vertices",

                sourceCellId:
                  cell.sourceCellId,

                outerVertexIndices,

                innerVertexIndices,
              });
            } else {
              const boundaryLocalIndices =
                topologyVertexIndices
                  .map(
                    (
                      index,
                      localIndex
                    ) =>
                      outerVertexIndices
                        .includes(
                          index
                        )
                        ? localIndex
                        : null
                  )
                  .filter(
                    (index) =>
                      index !==
                      null
                  );

              const interiorLocalIndices =
                [0, 1, 2, 3]
                  .filter(
                    (index) =>
                      !boundaryLocalIndices
                        .includes(index)
                  );


              if (
                boundaryLocalIndices
                  .length !==
                  3 ||
                interiorLocalIndices
                  .length !==
                  1
              ) {
                failures.push({
                  reason:
                    "invalid-cusp-core-boundary-pattern",

                  sourceCellId:
                    cell.sourceCellId,

                  topologyVertexIndices,

                  outerVertexIndices,
                });
              } else {
                const boundaryTriangleIndex =
                  boundaryTriangles.length;

                /*
                 * Unique inner-face occurrence.
                 *
                 * The matching collar tetrahedron will use the
                 * identical key.
                 */
                faceKeyOverrides[
                  interiorLocalIndices[0]
                ] =
                  collarInnerFaceKey(
                    boundaryTriangleIndex
                  );


                boundaryTriangles.push({
                  boundaryTriangleIndex,

                  tetrahedronId:
                    cell.tetrahedronId,

                  sourceCellId:
                    cell.sourceCellId,

                  sourceBoundaryFaceId:
                    cell
                      .sourceBoundaryFaceId,

                  sourceFaceCenterVertexIndex:
                    sourceFaceCenterVertexIndices[
                      0
                    ],

                  sourcePerimeterVertexIndices: [
                    ...sourcePerimeterVertexIndices,
                  ],

                  sourceBoundaryVertexIndices: [
                    ...sourceBoundaryVertexIndices,
                  ],

                  sourceBodyVertexIndex:
                    sourceVolumeVertexIndices[
                      interiorLocalIndices[0]
                    ],

                  deepVertexIndex:
                    quotientVertexIndices[
                      interiorLocalIndices[0]
                    ],

                  outerVertexIndices,

                  innerVertexIndices,

                  /*
                   * Local lookup only.
                   *
                   * It maps an edge of THIS triangle to the actual
                   * topological edge occurrence.
                   */
                  edgeOccurrenceKeyByOuterPair:
                    new Map(),
                });
              }
            }
          }
        }


        const valid =
          quotientVertexIndices.every(
            Number.isInteger
          ) &&
          new Set(
            quotientVertexIndices
          ).size ===
            4;


        if (!valid) {
          failures.push({
            reason:
              "degenerate-collar-core-cell",

            sourceCellId:
              cell.sourceCellId,

            quotientVertexIndices,
          });
        }


        return {
          ...cell,

          quotientVertexIndices,

          topologyVertexIndices,

          faceKeyOverrides,

          cuspCollarCore:
            cell
              .sourceBoundaryKind ===
            "cusp",

          valid:
            cell.valid &&
            valid,
        };
      }
    );


  /*
   * ============================================================
   * 3. RECOVER THE TRUE 108 TORUS EDGE OCCURRENCES
   * ============================================================
   *
   * Each boundary triangle has:
   *
   *   2 radial edges inside its source cusp-face fan;
   *   1 peripheral edge lying on a large-face identification.
   *
   * Radial edges retain source identity.
   *
   * Peripheral edges are paired using the exact A -> B face map.
   */
  const radialEdgeOccurrences =
    [];

  const peripheralEdgeOccurrences =
    [];


  function registerTriangleEdgeOccurrence({
    triangle,
    firstSourceVertexIndex,
    secondSourceVertexIndex,
    kind,
    pairId = null,
  }) {
    const firstOuter =
      quotientIndexByNodeKey
        .get(
          quotientNodeKey(
            triangle
              .tetrahedronId,

            firstSourceVertexIndex
          )
        );

    const secondOuter =
      quotientIndexByNodeKey
        .get(
          quotientNodeKey(
            triangle
              .tetrahedronId,

            secondSourceVertexIndex
          )
        );


    if (
      !Number.isInteger(
        firstOuter
      ) ||
      !Number.isInteger(
        secondOuter
      ) ||
      firstOuter ===
        secondOuter
    ) {
      failures.push({
        reason:
          "invalid-collar-boundary-edge-occurrence",

        boundaryTriangleIndex:
          triangle
            .boundaryTriangleIndex,

        kind,

        firstSourceVertexIndex,

        secondSourceVertexIndex,

        firstOuter,

        secondOuter,
      });

      return;
    }


    const occurrence = {
      triangle,

      boundaryTriangleIndex:
        triangle
          .boundaryTriangleIndex,

      tetrahedronId:
        triangle
          .tetrahedronId,

      sourceBoundaryFaceId:
        triangle
          .sourceBoundaryFaceId,

      firstSourceVertexIndex,

      secondSourceVertexIndex,

      firstOuter,

      secondOuter,

      outerPairKey:
        quotientEdgeKey(
          firstOuter,
          secondOuter
        ),

      kind,

      pairId,

      edgeOccurrenceKey:
        null,
    };


    if (
      kind ===
      "radial"
    ) {
      radialEdgeOccurrences.push(
        occurrence
      );
    } else {
      peripheralEdgeOccurrences.push(
        occurrence
      );
    }
  }


  boundaryTriangles.forEach(
    (triangle) => {
      const center =
        triangle
          .sourceFaceCenterVertexIndex;

      const [
        firstPerimeter,
        secondPerimeter,
      ] =
        triangle
          .sourcePerimeterVertexIndices;


      registerTriangleEdgeOccurrence({
        triangle,

        firstSourceVertexIndex:
          center,

        secondSourceVertexIndex:
          firstPerimeter,

        kind:
          "radial",
      });


      registerTriangleEdgeOccurrence({
        triangle,

        firstSourceVertexIndex:
          center,

        secondSourceVertexIndex:
          secondPerimeter,

        kind:
          "radial",
      });


      const largeFace =
        sourceLargeFaceForEdge(
          triangle
            .tetrahedronId,

          firstPerimeter,

          secondPerimeter
        );


      if (!largeFace) {
        failures.push({
          reason:
            "missing-collar-peripheral-large-face",

          boundaryTriangleIndex:
            triangle
              .boundaryTriangleIndex,

          tetrahedronId:
            triangle
              .tetrahedronId,

          firstPerimeter,

          secondPerimeter,
        });

        return;
      }


      registerTriangleEdgeOccurrence({
        triangle,

        firstSourceVertexIndex:
          firstPerimeter,

        secondSourceVertexIndex:
          secondPerimeter,

        kind:
          "peripheral",

        pairId:
          largeFace.pairId,
      });
    }
  );


  /*
   * Radial edges are ordinary edges of one pre-quotient cusp fan.
   * Each exact source edge must occur in two neighboring fan
   * triangles.
   */
  const radialGroups =
    new Map();


  radialEdgeOccurrences.forEach(
    (occurrence) => {
      const key =
        radialEdgeOccurrenceKey(
          occurrence
            .tetrahedronId,

          occurrence
            .sourceBoundaryFaceId,

          occurrence
            .firstSourceVertexIndex,

          occurrence
            .secondSourceVertexIndex
        );


      if (
        !radialGroups.has(key)
      ) {
        radialGroups.set(
          key,
          []
        );
      }

      radialGroups
        .get(key)
        .push(
          occurrence
        );
    }
  );


  radialGroups.forEach(
    (
      occurrences,
      key
    ) => {
      if (
        occurrences.length !==
        2
      ) {
        failures.push({
          reason:
            "invalid-collar-radial-edge-incidence",

          key,

          incidenceCount:
            occurrences.length,

          expectedCount:
            2,
        });

        return;
      }

      occurrences.forEach(
        (occurrence) => {
          occurrence
            .edgeOccurrenceKey =
            key;
        }
      );
    }
  );


  /*
   * Pair every A peripheral edge with its exact B image.
   */
  let peripheralPairCounter =
    0;

  const usedPeripheralB =
    new Set();


  peripheralEdgeOccurrences
    .filter(
      (occurrence) =>
        occurrence
          .tetrahedronId ===
        "A"
    )
    .sort(
      (
        first,
        second
      ) =>
        first
          .boundaryTriangleIndex -
        second
          .boundaryTriangleIndex
    )
    .forEach(
      (occurrenceA) => {
        const pair =
          facePairs.find(
            (candidate) =>
              candidate.id ===
              occurrenceA
                .pairId
          );


        if (!pair) {
          failures.push({
            reason:
              "missing-collar-face-pair",

            pairId:
              occurrenceA
                .pairId,

            boundaryTriangleIndex:
              occurrenceA
                .boundaryTriangleIndex,
          });

          return;
        }


        const mappingIndex =
          normalizeMappingIndex(
            facePairMappingIndices?.[
              pair.id
            ],

            mappingPermutations
          );


        const firstAddressA =
          sourceVertex(
            "A",
            occurrenceA
              .firstSourceVertexIndex
          )?.barycentric;

        const secondAddressA =
          sourceVertex(
            "A",
            occurrenceA
              .secondSourceVertexIndex
          )?.barycentric;


        if (
          !Array.isArray(
            firstAddressA
          ) ||
          !Array.isArray(
            secondAddressA
          )
        ) {
          failures.push({
            reason:
              "missing-collar-peripheral-address",

            boundaryTriangleIndex:
              occurrenceA
                .boundaryTriangleIndex,
          });

          return;
        }


        const mappedFirst =
          mapFaceAddress({
            address:
              firstAddressA,

            pair,

            mappingIndex,

            mappingPermutations,
          });

        const mappedSecond =
          mapFaceAddress({
            address:
              secondAddressA,

            pair,

            mappingIndex,

            mappingPermutations,
          });


        const candidates =
          peripheralEdgeOccurrences
            .filter(
              (occurrenceB) =>
                occurrenceB
                  .tetrahedronId ===
                  "B" &&
                occurrenceB
                  .pairId ===
                  occurrenceA
                    .pairId &&
                !usedPeripheralB
                  .has(
                    occurrenceB
                  )
            )
            .map(
              (occurrenceB) => {
                const firstAddressB =
                  sourceVertex(
                    "B",
                    occurrenceB
                      .firstSourceVertexIndex
                  )?.barycentric;

                const secondAddressB =
                  sourceVertex(
                    "B",
                    occurrenceB
                      .secondSourceVertexIndex
                  )?.barycentric;

                const error =
                  (
                    Array.isArray(
                      firstAddressB
                    ) &&
                    Array.isArray(
                      secondAddressB
                    )
                  )
                    ? unorderedAddressPairError(
                        mappedFirst,
                        mappedSecond,
                        firstAddressB,
                        secondAddressB
                      )
                    : Infinity;

                return {
                  occurrenceB,
                  error,
                };
              }
            )
            .filter(
              (candidate) =>
                candidate.error <=
                EPSILON
            );


        if (
          candidates.length !==
          1
        ) {
          failures.push({
            reason:
              "ambiguous-collar-peripheral-edge-pair",

            pairId:
              occurrenceA
                .pairId,

            boundaryTriangleIndex:
              occurrenceA
                .boundaryTriangleIndex,

            candidateCount:
              candidates.length,
          });

          return;
        }


        const occurrenceB =
          candidates[0]
            .occurrenceB;

        usedPeripheralB.add(
          occurrenceB
        );


        const edgeOccurrenceKey =
          `collar-peripheral-edge:` +
          `${pair.id}:` +
          `${peripheralPairCounter}`;

        peripheralPairCounter +=
          1;


        occurrenceA
          .edgeOccurrenceKey =
          edgeOccurrenceKey;

        occurrenceB
          .edgeOccurrenceKey =
          edgeOccurrenceKey;
      }
    );


  const unpairedPeripheralOccurrences =
    peripheralEdgeOccurrences
      .filter(
        (occurrence) =>
          !occurrence
            .edgeOccurrenceKey
      );


  if (
    unpairedPeripheralOccurrences
      .length >
    0
  ) {
    failures.push({
      reason:
        "unpaired-collar-peripheral-edge-occurrences",

      count:
        unpairedPeripheralOccurrences
          .length,
    });
  }


  /*
   * Attach the exact edge-occurrence identity to each local
   * boundary-triangle edge.
   */
  const boundaryEdgeOccurrences = [
    ...radialEdgeOccurrences,
    ...peripheralEdgeOccurrences,
  ];


  boundaryEdgeOccurrences.forEach(
    (occurrence) => {
      if (
        !occurrence
          .edgeOccurrenceKey
      ) {
        return;
      }


      const triangleMap =
        occurrence
          .triangle
          .edgeOccurrenceKeyByOuterPair;


      if (
        triangleMap.has(
          occurrence
            .outerPairKey
        ) &&
        triangleMap.get(
          occurrence
            .outerPairKey
        ) !==
          occurrence
            .edgeOccurrenceKey
      ) {
        failures.push({
          reason:
            "duplicate-collar-edge-inside-triangle",

          boundaryTriangleIndex:
            occurrence
              .boundaryTriangleIndex,

          outerPairKey:
            occurrence
              .outerPairKey,
        });

        return;
      }


      triangleMap.set(
        occurrence
          .outerPairKey,

        occurrence
          .edgeOccurrenceKey
      );
    }
  );


  /*
   * Every actual torus edge occurrence must meet exactly two
   * boundary triangles.
   */
  const boundaryEdgeOccurrenceIncidence =
    new Map();


  boundaryEdgeOccurrences.forEach(
    (occurrence) => {
      const key =
        occurrence
          .edgeOccurrenceKey;

      if (!key) {
        return;
      }

      boundaryEdgeOccurrenceIncidence
        .set(
          key,
          (
            boundaryEdgeOccurrenceIncidence
              .get(key) ??
            0
          ) + 1
        );
    }
  );


  let boundaryEdgeIncidenceFailureCount =
    0;


  boundaryEdgeOccurrenceIncidence
    .forEach(
      (
        count,
        key
      ) => {
        if (
          count ===
          2
        ) {
          return;
        }

        boundaryEdgeIncidenceFailureCount +=
          1;

        failures.push({
          reason:
            "invalid-collar-boundary-edge-incidence",

          key,

          incidenceCount:
            count,

          expectedCount:
            2,
        });
      }
    );


  /*
   * ============================================================
   * 4. MATERIAL-COORDINATE RADIAL REFINEMENT
   * ============================================================
   *
   * The source mesh already trisects every boundary edge. Refine
   * only the remaining long cusp-fan radial edges. Each old
   * C-P0-P1 boundary triangle becomes:
   *
   *   [C,M0,M1], [M0,P0,P1], [M0,P1,M1].
   *
   * P0-P1 stays untouched, so the validated large-face core does
   * not need refinement.
   */
  const midpointArray = (first, second) =>
    first.map((value, index) => 0.5 * (value + second[index]));

  const midpointPoint3 = (first, second) =>
    first && second
      ? {
          x: 0.5 * (first.x + second.x),
          y: 0.5 * (first.y + second.y),
          z: 0.5 * (first.z + second.z),
        }
      : null;

  function midpointCuspAddress(first, second) {
    if (
      !first ||
      !second ||
      first.cuspBaseId !== second.cuspBaseId ||
      first.idealVertexIndex !== second.idealVertexIndex ||
      first.neighborIndices.length !== second.neighborIndices.length ||
      first.neighborIndices.some(
        (neighborIndex, index) =>
          neighborIndex !== second.neighborIndices[index]
      )
    ) {
      return null;
    }

    return {
      cuspBaseId: first.cuspBaseId,
      idealVertexIndex: first.idealVertexIndex,
      neighborIndices: [...first.neighborIndices],
      localWeights: midpointArray(
        first.localWeights,
        second.localWeights
      ),
    };
  }

  const sourceInternalFaceKey = (
    tetrahedronId,
    sourceVertexIndices
  ) =>
    `internal:${tetrahedronId}:` +
    sourceVertexIndices
      .slice()
      .sort((a, b) => a - b)
      .join(":");

  const refinedRadialHalfKey = (
    sourceEdgeOccurrenceKey,
    endpointVertexIndex
  ) =>
    `${sourceEdgeOccurrenceKey}:half:${endpointVertexIndex}`;

  const refinedTriangleInternalEdgeKey = (
    sourceBoundaryTriangleIndex,
    localIndex
  ) =>
    `collar-refined-triangle-edge:` +
    `${sourceBoundaryTriangleIndex}:${localIndex}`;

  const refinedCoreSideFaceKey = (surfaceEdgeKey) =>
    `refined-cusp-core-side:${surfaceEdgeKey}`;

  const barycentricCoreInternalFaceKey = (
    refinedBoundaryTriangleIndex,
    label
  ) =>
    `refined-cusp-core-k:` +
    `${refinedBoundaryTriangleIndex}:` +
    `${label}`;

  const averagePoint3 = (points) => {
    const finitePoints =
      points.filter(Boolean);

    if (
      finitePoints.length !==
      points.length
    ) {
      return null;
    }

    const inverseCount =
      1 / finitePoints.length;

    return {
      x:
        finitePoints.reduce(
          (sum, point) =>
            sum + point.x,
          0
        ) * inverseCount,

      y:
        finitePoints.reduce(
          (sum, point) =>
            sum + point.y,
          0
        ) * inverseCount,

      z:
        finitePoints.reduce(
          (sum, point) =>
            sum + point.z,
          0
        ) * inverseCount,
    };
  };

  /*
   * One exact fixed outer midpoint per true radial torus-edge
   * occurrence, plus one movable inner-collar partner.
   */
  const radialMidpointByOccurrenceKey = new Map();
  const refinementOuterVertexIndices = [];
  const refinementInnerVertexIndices = [];

  radialGroups.forEach((occurrences, sourceEdgeOccurrenceKey) => {
    if (
      occurrences.length !== 2 ||
      occurrences.some(
        (occurrence) =>
          occurrence.edgeOccurrenceKey !== sourceEdgeOccurrenceKey
      )
    ) {
      failures.push({
        reason: "invalid-refinement-radial-edge-group",
        sourceEdgeOccurrenceKey,
        incidenceCount: occurrences.length,
      });
      return;
    }

    const representative = occurrences[0];

    const firstSource = sourceVertex(
      representative.tetrahedronId,
      representative.firstSourceVertexIndex
    );

    const secondSource = sourceVertex(
      representative.tetrahedronId,
      representative.secondSourceVertexIndex
    );

    const cuspAddress = midpointCuspAddress(
      firstSource?.cuspAddress,
      secondSource?.cuspAddress
    );

    const raw = cuspAddress
      ? rawCuspPoint(
          cuspAddress,
          cuspFlatLayout
        )
      : null;

    const coordinates = raw
      ? cuspCoordinateMapper(raw)
      : null;

    if (
      !cuspAddress ||
      !raw ||
      !Number.isFinite(raw.x) ||
      !Number.isFinite(raw.y) ||
      !coordinates ||
      !Number.isFinite(coordinates.u) ||
      !Number.isFinite(coordinates.v)
    ) {
      failures.push({
        reason:
          "invalid-collar-refinement-midpoint-address",
        sourceEdgeOccurrenceKey,
      });
      return;
    }

    const firstOuter =
      representative.firstOuter;

    const secondOuter =
      representative.secondOuter;

    const outerIndex =
      quotientVertices.length;

    const representativeSample = {
      tetrahedronId:
        representative.tetrahedronId,

      volumeVertexIndex: null,

      cuspAddress,
      raw,
      coordinates,

      synthetic:
        "radial-midpoint",
    };

    quotientVertices.push({
      quotientVertexIndex:
        outerIndex,

      root:
        `refined-boundary:${sourceEdgeOccurrenceKey}`,

      kinds: [
        "cusp-refinement",
      ],

      memberRefs: [],

      sourcePoint:
        midpointPoint3(
          quotientVertices[
            firstOuter
          ]?.sourcePoint,

          quotientVertices[
            secondOuter
          ]?.sourcePoint
        ),

      barycentricAddresses: [],

      cuspBoundary: true,

      cuspData: {
        consistent: true,

        representative:
          representativeSample,

        samples: [
          representativeSample,
        ],
      },

      cuspRefinement: true,

      refinementParentEdgeKey:
        sourceEdgeOccurrenceKey,

      refinementParentVertexIndices: [
        firstOuter,
        secondOuter,
      ],
    });

    const innerIndex =
      quotientVertices.length;

    quotientVertices.push({
      quotientVertexIndex:
        innerIndex,

      root:
        `collar-refined:${sourceEdgeOccurrenceKey}`,

      kinds: [
        "cusp-collar",
        "cusp-refinement",
      ],

      memberRefs: [],

      sourcePoint:
        quotientVertices[
          outerIndex
        ].sourcePoint,

      barycentricAddresses: [],

      cuspBoundary: false,
      cuspData: null,

      cuspCollar: true,
      cuspRefinement: true,

      collarParentQuotientVertexIndex:
        outerIndex,

      collarData: {
        boundaryQuotientVertexIndex:
          outerIndex,

        raw,
        coordinates,
      },

      refinementParentEdgeKey:
        sourceEdgeOccurrenceKey,
    });

    collarIndexByBoundaryVertex.set(
      outerIndex,
      innerIndex
    );

    radialMidpointByOccurrenceKey.set(
      sourceEdgeOccurrenceKey,
      {
        outerIndex,
        innerIndex,
        firstOuter,
        secondOuter,
        sourceEdgeOccurrenceKey,
      }
    );

    refinementOuterVertexIndices.push(
      outerIndex
    );

    refinementInnerVertexIndices.push(
      innerIndex
    );
  });

  /*
   * 72 old cusp fan triangles -> 216 refined material triangles.
   */
  const refinedBoundaryTriangles = [];
  const refinedSurfaceEdgeIncidence = new Map();

  /*
   * Diagnostic only:
   *
   * Compare each refined triangle's stored material ordering with the
   * ascending quotient-vertex ordering later used by the transition
   * prism staircases.
   *
   * +1 = sorting is an even permutation
   * -1 = sorting is an odd permutation
   */
  function materialOrderingParityToSorted(
    vertexIndices
  ) {
    let inversions = 0;

    for (
      let first = 0;
      first < vertexIndices.length;
      first += 1
    ) {
      for (
        let second = first + 1;
        second < vertexIndices.length;
        second += 1
      ) {
        if (
          vertexIndices[first] >
          vertexIndices[second]
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

  function pushRefinedBoundaryTriangle({
    sourceTriangle,
    localRefinedTriangleIndex,
    outerVertexIndices,
    surfaceEdgeKeyByPair,
    peripheralSourceVertices = null,
  }) {
    const refinedBoundaryTriangleIndex =
      refinedBoundaryTriangles.length;

    const innerVertexIndices =
      outerVertexIndices.map(
        (index) =>
          collarIndexByBoundaryVertex
            .get(index)
      );

    if (
      innerVertexIndices.some(
        (index) =>
          !Number.isInteger(index)
      ) ||
      surfaceEdgeKeyByPair.size !== 3
    ) {
      failures.push({
        reason:
          "invalid-refined-boundary-triangle",

        sourceBoundaryTriangleIndex:
          sourceTriangle
            .boundaryTriangleIndex,

        localRefinedTriangleIndex,
        outerVertexIndices,
        innerVertexIndices,

        edgeCount:
          surfaceEdgeKeyByPair.size,
      });

      return;
    }

    for (
      const key
      of surfaceEdgeKeyByPair.values()
    ) {
      refinedSurfaceEdgeIncidence.set(
        key,
        (
          refinedSurfaceEdgeIncidence
            .get(key) ??
          0
        ) + 1
      );
    }

    refinedBoundaryTriangles.push({
      refinedBoundaryTriangleIndex,

      sourceBoundaryTriangleIndex:
        sourceTriangle
          .boundaryTriangleIndex,

      localRefinedTriangleIndex,

      materialOrderingParity:
        materialOrderingParityToSorted(
          outerVertexIndices
        ),

      materialOrderingVertexIndices: [
        ...outerVertexIndices,
      ],

      tetrahedronId:
        sourceTriangle
          .tetrahedronId,

      sourceCellId:
        sourceTriangle
          .sourceCellId,

      sourceBoundaryFaceId:
        sourceTriangle
          .sourceBoundaryFaceId,

      sourceFaceCenterVertexIndex:
        sourceTriangle
          .sourceFaceCenterVertexIndex,

      sourcePerimeterVertexIndices: [
        ...sourceTriangle
          .sourcePerimeterVertexIndices,
      ],

      sourceBoundaryVertexIndices: [
        ...sourceTriangle
          .sourceBoundaryVertexIndices,
      ],

      sourceBodyVertexIndex:
        sourceTriangle
          .sourceBodyVertexIndex,

      deepVertexIndex:
        sourceTriangle
          .deepVertexIndex,

      outerVertexIndices,
      innerVertexIndices,
      surfaceEdgeKeyByPair,
      peripheralSourceVertices,
    });
  }

  boundaryTriangles.forEach(
    (triangle) => {
      const centerSource =
        triangle
          .sourceFaceCenterVertexIndex;

      const [
        firstPerimeterSource,
        secondPerimeterSource,
      ] =
        triangle
          .sourcePerimeterVertexIndices;

      const centerOuter =
        quotientIndexByNodeKey.get(
          quotientNodeKey(
            triangle.tetrahedronId,
            centerSource
          )
        );

      const firstPerimeterOuter =
        quotientIndexByNodeKey.get(
          quotientNodeKey(
            triangle.tetrahedronId,
            firstPerimeterSource
          )
        );

      const secondPerimeterOuter =
        quotientIndexByNodeKey.get(
          quotientNodeKey(
            triangle.tetrahedronId,
            secondPerimeterSource
          )
        );

      const firstRadialOccurrenceKey =
        triangle
          .edgeOccurrenceKeyByOuterPair
          .get(
            quotientEdgeKey(
              centerOuter,
              firstPerimeterOuter
            )
          );

      const secondRadialOccurrenceKey =
        triangle
          .edgeOccurrenceKeyByOuterPair
          .get(
            quotientEdgeKey(
              centerOuter,
              secondPerimeterOuter
            )
          );

      const peripheralOccurrenceKey =
        triangle
          .edgeOccurrenceKeyByOuterPair
          .get(
            quotientEdgeKey(
              firstPerimeterOuter,
              secondPerimeterOuter
            )
          );

      const firstMidpoint =
        radialMidpointByOccurrenceKey
          .get(
            firstRadialOccurrenceKey
          )
          ?.outerIndex;

      const secondMidpoint =
        radialMidpointByOccurrenceKey
          .get(
            secondRadialOccurrenceKey
          )
          ?.outerIndex;

      if (
        !Number.isInteger(
          firstMidpoint
        ) ||
        !Number.isInteger(
          secondMidpoint
        ) ||
        !peripheralOccurrenceKey
      ) {
        failures.push({
          reason:
            "missing-refined-boundary-triangle-data",

          sourceBoundaryTriangleIndex:
            triangle
              .boundaryTriangleIndex,

          firstRadialOccurrenceKey,
          secondRadialOccurrenceKey,
          peripheralOccurrenceKey,
          firstMidpoint,
          secondMidpoint,
        });

        return;
      }

      const internalEdge0 =
        refinedTriangleInternalEdgeKey(
          triangle
            .boundaryTriangleIndex,
          0
        );

      const internalEdge1 =
        refinedTriangleInternalEdgeKey(
          triangle
            .boundaryTriangleIndex,
          1
        );

      const firstRadialCenterHalf =
        refinedRadialHalfKey(
          firstRadialOccurrenceKey,
          centerOuter
        );

      const firstRadialPerimeterHalf =
        refinedRadialHalfKey(
          firstRadialOccurrenceKey,
          firstPerimeterOuter
        );

      const secondRadialCenterHalf =
        refinedRadialHalfKey(
          secondRadialOccurrenceKey,
          centerOuter
        );

      const secondRadialPerimeterHalf =
        refinedRadialHalfKey(
          secondRadialOccurrenceKey,
          secondPerimeterOuter
        );

      pushRefinedBoundaryTriangle({
        sourceTriangle: triangle,

        localRefinedTriangleIndex:
          0,

        outerVertexIndices: [
          centerOuter,
          firstMidpoint,
          secondMidpoint,
        ],

        surfaceEdgeKeyByPair:
          new Map([
            [
              quotientEdgeKey(
                centerOuter,
                firstMidpoint
              ),
              firstRadialCenterHalf,
            ],
            [
              quotientEdgeKey(
                centerOuter,
                secondMidpoint
              ),
              secondRadialCenterHalf,
            ],
            [
              quotientEdgeKey(
                firstMidpoint,
                secondMidpoint
              ),
              internalEdge0,
            ],
          ]),
      });

      pushRefinedBoundaryTriangle({
        sourceTriangle: triangle,

        localRefinedTriangleIndex:
          1,

        outerVertexIndices: [
          firstMidpoint,
          firstPerimeterOuter,
          secondPerimeterOuter,
        ],

        surfaceEdgeKeyByPair:
          new Map([
            [
              quotientEdgeKey(
                firstMidpoint,
                firstPerimeterOuter
              ),
              firstRadialPerimeterHalf,
            ],
            [
              quotientEdgeKey(
                firstPerimeterOuter,
                secondPerimeterOuter
              ),
              peripheralOccurrenceKey,
            ],
            [
              quotientEdgeKey(
                firstMidpoint,
                secondPerimeterOuter
              ),
              internalEdge1,
            ],
          ]),

        peripheralSourceVertices: [
          firstPerimeterSource,
          secondPerimeterSource,
        ],
      });

      pushRefinedBoundaryTriangle({
        sourceTriangle: triangle,

        localRefinedTriangleIndex:
          2,

        outerVertexIndices: [
          firstMidpoint,
          secondPerimeterOuter,
          secondMidpoint,
        ],

        surfaceEdgeKeyByPair:
          new Map([
            [
              quotientEdgeKey(
                firstMidpoint,
                secondPerimeterOuter
              ),
              internalEdge1,
            ],
            [
              quotientEdgeKey(
                secondPerimeterOuter,
                secondMidpoint
              ),
              secondRadialPerimeterHalf,
            ],
            [
              quotientEdgeKey(
                firstMidpoint,
                secondMidpoint
              ),
              internalEdge0,
            ],
          ]),
      });
    }
  );

  let refinedBoundaryEdgeIncidenceFailureCount =
    0;

  refinedSurfaceEdgeIncidence.forEach(
    (count, key) => {
      if (count === 2) {
        return;
      }

      refinedBoundaryEdgeIncidenceFailureCount +=
        1;

      failures.push({
        reason:
          "invalid-refined-boundary-edge-incidence",

        key,
        incidenceCount: count,
        expectedCount: 2,
      });
    }
  );

  /*
   * ============================================================
   * 5. INSERT ONE FULL TRANSITION TORUS S₂
   * ============================================================
   *
   * S₀ = exact Projection-Lab boundary
   * S₁ = exact analytic collar
   * S₂ = first free transition sheet
   *
   * Every S₁ material vertex receives exactly one S₂ partner.
   * The material connectivity is unchanged.
   */
  const transitionIndexByCollarVertex =
    new Map();

  const transitionVertexIndices = [];

  const collarSurfaceVertexIndices =
    [
      ...new Set(
        refinedBoundaryTriangles
          .flatMap(
            (triangle) =>
              triangle
                .innerVertexIndices
          )
      ),
    ].sort(
      (a, b) =>
        a - b
    );


  if (
    collarSurfaceVertexIndices.length !==
    108
  ) {
    failures.push({
      reason:
        "unexpected-transition-parent-vertex-count",

      observedCount:
        collarSurfaceVertexIndices.length,

      expectedCount:
        108,
    });
  }


  collarSurfaceVertexIndices.forEach(
    (collarVertexIndex) => {
      const collarVertex =
        quotientVertices[
          collarVertexIndex
        ];

      const transitionVertexIndex =
        quotientVertices.length;


      transitionIndexByCollarVertex.set(
        collarVertexIndex,
        transitionVertexIndex
      );


      quotientVertices.push({
        quotientVertexIndex:
          transitionVertexIndex,

        root:
          `transition:${collarVertex.root}`,

        kinds: [
          "cusp-transition",
        ],

        memberRefs: [],

        sourcePoint:
          collarVertex.sourcePoint,

        barycentricAddresses: [],

        cuspBoundary: false,
        cuspData: null,

        cuspCollar: false,

        cuspTransition:
          true,

        transitionParentCollarVertexIndex:
          collarVertexIndex,

        /*
         * Preserve exactly the same torus material address.
         *
         * S₂ is free geometrically, while remaining the same
         * material vertex as its S₁ parent.
         */
        transitionData: {
          collarQuotientVertexIndex:
            collarVertexIndex,

          boundaryQuotientVertexIndex:
            collarVertex
              .collarParentQuotientVertexIndex,

          raw:
            collarVertex
              .collarData
              ?.raw ??
            null,

          coordinates:
            collarVertex
              .collarData
              ?.coordinates ??
            null,
        },
      });


      transitionVertexIndices.push(
        transitionVertexIndex
      );
    }
  );


  /*
   * ============================================================
   * 6. INSERT A SECOND PROJECTIVE TRANSITION TORUS S₃
   * ============================================================
   *
   * S₂ already carries the complete 108-vertex / 216-triangle
   * material torus. Give every S₂ material vertex exactly one S₃
   * partner before the core is attached.
   *
   * S₃ intentionally has a distinct flag from S₂. The current
   * S₂ projective solver must not silently absorb this new layer;
   * the next solver patch will promote S₂ + S₃ + H together.
   */
  const secondTransitionIndexByTransitionVertex =
    new Map();

  const secondTransitionVertexIndices = [];


  transitionVertexIndices.forEach(
    (transitionVertexIndex) => {
      const transitionVertex =
        quotientVertices[
          transitionVertexIndex
        ];

      const secondTransitionVertexIndex =
        quotientVertices.length;


      secondTransitionIndexByTransitionVertex.set(
        transitionVertexIndex,
        secondTransitionVertexIndex
      );


      quotientVertices.push({
        quotientVertexIndex:
          secondTransitionVertexIndex,

        root:
          `transition2:${transitionVertex.root}`,

        kinds: [
          "cusp-transition-2",
        ],

        memberRefs: [],

        sourcePoint:
          transitionVertex.sourcePoint,

        barycentricAddresses: [],

        cuspBoundary: false,
        cuspData: null,

        cuspCollar: false,

        /*
         * Keep S₂ compatibility explicit:
         * only S₂ owns cuspTransition === true.
         */
        cuspTransition:
          false,

        cuspTransition2:
          true,

        secondTransitionParentQuotientVertexIndex:
          transitionVertexIndex,

        /*
         * S₃ is the same torus material vertex one layer deeper.
         */
        secondTransitionData: {
          transitionQuotientVertexIndex:
            transitionVertexIndex,

          collarQuotientVertexIndex:
            transitionVertex
              .transitionData
              ?.collarQuotientVertexIndex ??
            null,

          boundaryQuotientVertexIndex:
            transitionVertex
              .transitionData
              ?.boundaryQuotientVertexIndex ??
            null,

          raw:
            transitionVertex
              .transitionData
              ?.raw ??
            null,

          coordinates:
            transitionVertex
              .transitionData
              ?.coordinates ??
            null,
        },
      });


      secondTransitionVertexIndices.push(
        secondTransitionVertexIndex
      );
    }
  );


  if (
    secondTransitionVertexIndices.length !==
    108
  ) {
    failures.push({
      reason:
        "unexpected-second-transition-vertex-count",

      observedCount:
        secondTransitionVertexIndices.length,

      expectedCount:
        108,
    });
  }


  function secondTransitionInnerFaceKey(
    refinedBoundaryTriangleIndex
  ) {
    return (
      `transition2-inner:` +
      `${refinedBoundaryTriangleIndex}`
    );
  }


  function secondTransitionPrismInternalFaceKey(
    refinedBoundaryTriangleIndex,
    localFaceIndex
  ) {
    return (
      `transition2-prism-internal:` +
      `${refinedBoundaryTriangleIndex}:` +
      `${localFaceIndex}`
    );
  }


  function secondTransitionSideFaceKey(
    surfaceEdgeKey,
    half
  ) {
    return (
      `transition2-side:` +
      `${surfaceEdgeKey}:` +
      `${half}`
    );
  }


  function transitionInnerFaceKey(
    refinedBoundaryTriangleIndex
  ) {
    return (
      `transition-inner:` +
      `${refinedBoundaryTriangleIndex}`
    );
  }


  function transitionPrismInternalFaceKey(
    refinedBoundaryTriangleIndex,
    localFaceIndex
  ) {
    return (
      `transition-prism-internal:` +
      `${refinedBoundaryTriangleIndex}:` +
      `${localFaceIndex}`
    );
  }


  function transitionSideFaceKey(
    surfaceEdgeKey,
    half
  ) {
    return (
      `transition-side:` +
      `${surfaceEdgeKey}:` +
      `${half}`
    );
  }


  /*
   * ============================================================
   * 7. MOVE THE ENTIRE OLD CORE FROM S₂ TO S₃
   * ============================================================
   *
   * All untouched large-face cells that previously met S₁ were
   * already routed through S₂. They now meet the corresponding S₃
   * vertices instead.
   *
   * Their source/topological addresses remain unchanged.
   */
  const shiftedCoreCells =
    coreCells
      .filter(
        (cell) =>
          cell.sourceBoundaryKind !==
          "cusp"
      )
      .map(
        (cell) => {
          const quotientVertexIndices =
            cell
              .quotientVertexIndices
              .map(
                (vertexIndex) => {
                  const transitionVertexIndex =
                    transitionIndexByCollarVertex
                      .get(vertexIndex);

                  if (
                    !Number.isInteger(
                      transitionVertexIndex
                    )
                  ) {
                    return vertexIndex;
                  }

                  return (
                    secondTransitionIndexByTransitionVertex
                      .get(
                        transitionVertexIndex
                      ) ??
                    transitionVertexIndex
                  );
                }
              );


          const valid =
            quotientVertexIndices.every(
              Number.isInteger
            ) &&
            new Set(
              quotientVertexIndices
            ).size ===
              4;


          if (!valid) {
            failures.push({
              reason:
                "degenerate-second-transition-shifted-core-cell",

              sourceCellId:
                cell.sourceCellId,

              quotientVertexIndices,
            });
          }


          return {
            ...cell,

            quotientVertexIndices,

            transitionShiftedCore:
              true,

            secondTransitionShiftedCore:
              true,

            valid:
              cell.valid &&
              valid,
          };
        }
      );


  /*
   * ============================================================
   * 7B. BARYCENTRIC CUSP-TO-CORE TRANSITION K
   * ============================================================
   *
   * The previous 216 refined cusp-core tetrahedra each jumped
   * directly from one S3 material triangle to a single body-center
   * apex.
   *
   * Insert one canonical tetrahedron-native barycentric vertex K
   * into every such source tetrahedron and perform a 1 -> 4 stellar
   * subdivision.
   *
   * Every ORIGINAL face is preserved exactly:
   *
   *   - the S3 material triangle remains one face;
   *   - every side face into the shifted large-face core remains
   *     one face;
   *   - only six new internal K faces appear inside the old cell.
   *
   * This is therefore a topology-preserving barycentric refinement
   * of the cusp-to-core transition. It is not another torus copy.
   */
  const refinedCoreCells = [];

  const refinedCoreBarycentricVertexIndices =
    [];

  const sourceInterfaceFaceKeys =
    new Set();


  refinedBoundaryTriangles.forEach(
    (triangle) => {
      const [
        b0,
        b1,
        b2,
      ] =
        triangle
          .outerVertexIndices;


      const [
        c0,
        c1,
        c2,
      ] =
        triangle
          .innerVertexIndices;


      const [
        t0,
        t1,
        t2,
      ] = [
        c0,
        c1,
        c2,
      ].map(
        (collarVertexIndex) =>
          transitionIndexByCollarVertex
            .get(
              collarVertexIndex
            )
      );


      const [
        s0,
        s1,
        s2,
      ] = [
        t0,
        t1,
        t2,
      ].map(
        (transitionVertexIndex) =>
          secondTransitionIndexByTransitionVertex
            .get(
              transitionVertexIndex
            )
      );


      const deep =
        triangle.deepVertexIndex;


      const edge01 =
        triangle
          .surfaceEdgeKeyByPair
          .get(
            quotientEdgeKey(
              b0,
              b1
            )
          );


      const edge12 =
        triangle
          .surfaceEdgeKeyByPair
          .get(
            quotientEdgeKey(
              b1,
              b2
            )
          );


      const edge02 =
        triangle
          .surfaceEdgeKeyByPair
          .get(
            quotientEdgeKey(
              b0,
              b2
            )
          );


      function coreSideKey(
        edgeKey
      ) {
        if (
          !edgeKey.startsWith(
            "collar-peripheral-edge:"
          )
        ) {
          return refinedCoreSideFaceKey(
            edgeKey
          );
        }


        if (
          !triangle
            .peripheralSourceVertices
        ) {
          failures.push({
            reason:
              "missing-refined-core-peripheral-source-data",

            refinedBoundaryTriangleIndex:
              triangle
                .refinedBoundaryTriangleIndex,

            edgeKey,
          });


          return (
            `invalid-source-interface:` +
            `${triangle.refinedBoundaryTriangleIndex}`
          );
        }


        const key =
          sourceInternalFaceKey(
            triangle
              .tetrahedronId,

            [
              triangle
                .sourceBodyVertexIndex,

              ...triangle
                .peripheralSourceVertices,
            ]
          );


        sourceInterfaceFaceKeys.add(
          key
        );


        return key;
      }


      /*
       * These are the exact three old side faces.
       * They remain untouched by the refinement.
       */
      const side12 =
        coreSideKey(
          edge12
        );

      const side02 =
        coreSideKey(
          edge02
        );

      const side01 =
        coreSideKey(
          edge01
        );


      /*
       * K begins at the true barycenter of the OLD tetrahedron:
       *
       *   1/4 deep + 1/4 s0 + 1/4 s1 + 1/4 s2.
       *
       * sourcePoint is only the neutral intrinsic guide. The S3
       * projective solver remains free to move K on S3 afterward.
       */
      const sourcePoints = [
        deep,
        s0,
        s1,
        s2,
      ].map(
        (vertexIndex) =>
          quotientVertices[
            vertexIndex
          ]?.sourcePoint ??
          null
      );


      const kSourcePoint =
        averagePoint3(
          sourcePoints
        );


      if (!kSourcePoint) {
        failures.push({
          reason:
            "missing-refined-core-barycentric-source-point",

          refinedBoundaryTriangleIndex:
            triangle
              .refinedBoundaryTriangleIndex,

          quotientVertexIndices: [
            deep,
            s0,
            s1,
            s2,
          ],
        });
      }


      const kVertexIndex =
        quotientVertices.length;


      quotientVertices.push({
        quotientVertexIndex:
          kVertexIndex,

        root:
          `core-k:` +
          `${triangle.tetrahedronId}:` +
          `${triangle.refinedBoundaryTriangleIndex}`,

        kinds: [
          "cusp-core-barycentric",
        ],

        memberRefs: [],

        sourcePoint:
          kSourcePoint ??
          quotientVertices[
            deep
          ]?.sourcePoint ??
          null,

        barycentricAddresses:
          [],

        cuspBoundary:
          false,

        cuspData:
          null,

        cuspCollar:
          false,

        cuspTransition:
          false,

        cuspTransition2:
          false,

        cuspCoreBarycentric:
          true,

        cuspCoreBarycentricData: {
          tetrahedronId:
            triangle
              .tetrahedronId,

          refinedBoundaryTriangleIndex:
            triangle
              .refinedBoundaryTriangleIndex,

          sourceBoundaryTriangleIndex:
            triangle
              .sourceBoundaryTriangleIndex,

          sourceBoundaryFaceId:
            triangle
              .sourceBoundaryFaceId,

          sourceBodyVertexIndex:
            triangle
              .sourceBodyVertexIndex,

          deepVertexIndex:
            deep,

          secondTransitionVertexIndices: [
            s0,
            s1,
            s2,
          ],

          sourceCellBarycentricWeights: [
            0.25,
            0.25,
            0.25,
            0.25,
          ],
        },
      });


      refinedCoreBarycentricVertexIndices
        .push(
          kVertexIndex
        );


      /*
       * Original S3 face.
       */
      const outerBoundaryKey =
        secondTransitionInnerFaceKey(
          triangle
            .refinedBoundaryTriangleIndex
        );


      /*
       * Six new internal faces of the 1 -> 4 stellar subdivision.
       */
      const k12 =
        barycentricCoreInternalFaceKey(
          triangle
            .refinedBoundaryTriangleIndex,
          "k-s1-s2"
        );

      const k02 =
        barycentricCoreInternalFaceKey(
          triangle
            .refinedBoundaryTriangleIndex,
          "k-s0-s2"
        );

      const k01 =
        barycentricCoreInternalFaceKey(
          triangle
            .refinedBoundaryTriangleIndex,
          "k-s0-s1"
        );

      const kd2 =
        barycentricCoreInternalFaceKey(
          triangle
            .refinedBoundaryTriangleIndex,
          "k-deep-s2"
        );

      const kd1 =
        barycentricCoreInternalFaceKey(
          triangle
            .refinedBoundaryTriangleIndex,
          "k-deep-s1"
        );

      const kd0 =
        barycentricCoreInternalFaceKey(
          triangle
            .refinedBoundaryTriangleIndex,
          "k-deep-s0"
        );


      /*
       * One cap tetrahedron touches S3.
       *
       * The other three bridge K to the old body-center apex while
       * retaining the three exact old side faces.
       */
      const starCells = [
        {
          role:
            "cap",

          syntheticCellKind:
            "refined-cusp-core",

          indices: [
            kVertexIndex,
            s0,
            s1,
            s2,
          ],

          explicitFaceKeys: [
            outerBoundaryKey,
            k12,
            k02,
            k01,
          ],
        },

        {
          role:
            "bridge-12",

          syntheticCellKind:
            "refined-cusp-core-barycentric-bridge",

          indices: [
            kVertexIndex,
            deep,
            s1,
            s2,
          ],

          explicitFaceKeys: [
            side12,
            k12,
            kd2,
            kd1,
          ],
        },

        {
          role:
            "bridge-02",

          syntheticCellKind:
            "refined-cusp-core-barycentric-bridge",

          indices: [
            kVertexIndex,
            deep,
            s0,
            s2,
          ],

          explicitFaceKeys: [
            side02,
            k02,
            kd2,
            kd0,
          ],
        },

        {
          role:
            "bridge-01",

          syntheticCellKind:
            "refined-cusp-core-barycentric-bridge",

          indices: [
            kVertexIndex,
            deep,
            s0,
            s1,
          ],

          explicitFaceKeys: [
            side01,
            k01,
            kd1,
            kd0,
          ],
        },
      ];


      starCells.forEach(
        (
          starCell,
          localStarCellIndex
        ) => {
          const quotientVertexIndices =
            starCell.indices;


          const valid =
            quotientVertexIndices.every(
              Number.isInteger
            ) &&
            new Set(
              quotientVertexIndices
            ).size ===
              4;


          if (!valid) {
            failures.push({
              reason:
                "degenerate-barycentric-refined-cusp-core-cell",

              refinedBoundaryTriangleIndex:
                triangle
                  .refinedBoundaryTriangleIndex,

              localStarCellIndex,
              quotientVertexIndices,
            });
          }


          refinedCoreCells.push({
            quotientCellIndex:
              -1,

            tetrahedronId:
              triangle
                .tetrahedronId,

            sourceCellId:
              `${triangle.sourceCellId}` +
              `-transition2-k-` +
              `${triangle.localRefinedTriangleIndex}-` +
              `${localStarCellIndex}`,

            sourceBoundaryFaceId:
              triangle
                .sourceBoundaryFaceId,

            sourceBoundaryKind:
              "cusp",

            syntheticCellKind:
              starCell
                .syntheticCellKind,

            barycentricCoreRole:
              starCell.role,

            barycentricCoreVertexIndex:
              kVertexIndex,

            materialOrderingParity:
              triangle
                .materialOrderingParity,

            materialOrderingVertexIndices: [
              ...triangle
                .materialOrderingVertexIndices,
            ],

            refinedBoundaryTriangleIndex:
              triangle
                .refinedBoundaryTriangleIndex,

            sourceBoundaryTriangleIndex:
              triangle
                .sourceBoundaryTriangleIndex,

            sourceVolumeVertexIndices:
              [],

            quotientVertexIndices,

            explicitFaceKeys:
              starCell
                .explicitFaceKeys,

            valid,
          });
        }
      );
    }
  );


  /*
   * ============================================================
   * 8. TETRAHEDRALIZE S₁ × I -> S₂
   * ============================================================
   *
   * S₁ and S₂ carry exactly the same 216-triangle torus.
   *
   * Each triangular prism is split with the same globally
   * compatible three-tetrahedron staircase used by the outer
   * collar.
   */
  const transitionCells = [];


  refinedBoundaryTriangles.forEach(
    (triangle) => {
      const refinedBoundaryTriangleIndex =
        triangle
          .refinedBoundaryTriangleIndex;


      /*
       * Use the exact same globally sorted material ordering as
       * the already-validated outer collar.
       */
      const sortedBoundary =
        triangle
          .outerVertexIndices
          .slice()
          .sort(
            (a, b) =>
              a - b
          );


      const outer =
        sortedBoundary.map(
          (boundaryVertexIndex) =>
            collarIndexByBoundaryVertex
              .get(
                boundaryVertexIndex
              )
        );


      const inner =
        outer.map(
          (collarVertexIndex) =>
            transitionIndexByCollarVertex
              .get(
                collarVertexIndex
              )
        );


      const [
        c0,
        c1,
        c2,
      ] = outer;


      const [
        t0,
        t1,
        t2,
      ] = inner;


      /*
       * The material edge identities live on S₀.
       *
       * sortedBoundary therefore supplies the exact keys even though
       * this prism itself lies between S₁ and S₂.
       */
      const edge01 =
        triangle
          .surfaceEdgeKeyByPair
          .get(
            quotientEdgeKey(
              sortedBoundary[0],
              sortedBoundary[1]
            )
          );


      const edge12 =
        triangle
          .surfaceEdgeKeyByPair
          .get(
            quotientEdgeKey(
              sortedBoundary[1],
              sortedBoundary[2]
            )
          );


      const edge02 =
        triangle
          .surfaceEdgeKeyByPair
          .get(
            quotientEdgeKey(
              sortedBoundary[0],
              sortedBoundary[2]
            )
          );


      if (
        outer.some(
          (index) =>
            !Number.isInteger(index)
        ) ||
        inner.some(
          (index) =>
            !Number.isInteger(index)
        ) ||
        !edge01 ||
        !edge12 ||
        !edge02
      ) {
        failures.push({
          reason:
            "invalid-transition-prism-data",

          refinedBoundaryTriangleIndex,

          sortedBoundary,
          outer,
          inner,

          edge01,
          edge12,
          edge02,
        });


        return;
      }


      const prismInternal0 =
        transitionPrismInternalFaceKey(
          refinedBoundaryTriangleIndex,
          0
        );


      const prismInternal1 =
        transitionPrismInternalFaceKey(
          refinedBoundaryTriangleIndex,
          1
        );


      /*
       * S₁ is simultaneously:
       *
       *   inner face of the outer collar
       *   outer face of the transition layer.
       */
      const outerBoundaryKey =
        collarInnerFaceKey(
          refinedBoundaryTriangleIndex
        );


      /*
       * S₂ is simultaneously:
       *
       *   inner face of the transition layer
       *   boundary face of the shifted core.
       */
      const innerBoundaryKey =
        transitionInnerFaceKey(
          refinedBoundaryTriangleIndex
        );


      const prismCells = [
        {
          indices: [
            c0,
            c1,
            c2,
            t2,
          ],

          explicitFaceKeys: [
            transitionSideFaceKey(
              edge12,
              "outer"
            ),

            transitionSideFaceKey(
              edge02,
              "outer"
            ),

            prismInternal0,
            outerBoundaryKey,
          ],
        },

        {
          indices: [
            c0,
            c1,
            t1,
            t2,
          ],

          explicitFaceKeys: [
            transitionSideFaceKey(
              edge12,
              "inner"
            ),

            prismInternal1,
            prismInternal0,

            transitionSideFaceKey(
              edge01,
              "outer"
            ),
          ],
        },

        {
          indices: [
            c0,
            t0,
            t1,
            t2,
          ],

          explicitFaceKeys: [
            innerBoundaryKey,
            prismInternal1,

            transitionSideFaceKey(
              edge02,
              "inner"
            ),

            transitionSideFaceKey(
              edge01,
              "inner"
            ),
          ],
        },
      ];


      prismCells.forEach(
        (
          prismCell,
          prismCellIndex
        ) => {
          const indices =
            prismCell.indices;


          const valid =
            indices.every(
              Number.isInteger
            ) &&
            new Set(
              indices
            ).size ===
              4;


          if (!valid) {
            failures.push({
              reason:
                "degenerate-cusp-transition-cell",

              refinedBoundaryTriangleIndex,
              prismCellIndex,
              indices,
            });
          }


          transitionCells.push({
            quotientCellIndex:
              -1,

            tetrahedronId:
              triangle
                .tetrahedronId,

            sourceCellId:
              `${triangle.sourceCellId}` +
              `-transition-` +
              `${triangle.refinedBoundaryTriangleIndex}` +
              `-${prismCellIndex}`,

            sourceBoundaryFaceId:
              triangle
                .sourceBoundaryFaceId,

            sourceBoundaryKind:
              "cusp-transition",

            syntheticCellKind:
              "cusp-transition-layer",

            materialOrderingParity:
              triangle
                .materialOrderingParity,

            materialOrderingVertexIndices: [
              ...triangle
                .materialOrderingVertexIndices,
            ],

            transitionBoundaryTriangleIndex:
              refinedBoundaryTriangleIndex,

            transitionParentBoundaryTriangleIndex:
              triangle
                .sourceBoundaryTriangleIndex,

            quotientVertexIndices:
              indices,

            explicitFaceKeys:
              prismCell
                .explicitFaceKeys,

            valid,
          });
        }
      );
    }
  );


  /*
   * ============================================================
   * 9. TETRAHEDRALIZE S₂ × I -> S₃
   * ============================================================
   *
   * This is a second copy of the same globally compatible
   * three-tetrahedron prism staircase. It preserves every material
   * edge and triangle identity while giving the projective
   * deformation one more full torus layer before the finite core.
   */
  const secondTransitionCells = [];


  refinedBoundaryTriangles.forEach(
    (triangle) => {
      const refinedBoundaryTriangleIndex =
        triangle
          .refinedBoundaryTriangleIndex;


      const sortedBoundary =
        triangle
          .outerVertexIndices
          .slice()
          .sort(
            (a, b) =>
              a - b
          );


      const collar =
        sortedBoundary.map(
          (boundaryVertexIndex) =>
            collarIndexByBoundaryVertex
              .get(
                boundaryVertexIndex
              )
        );


      const outer =
        collar.map(
          (collarVertexIndex) =>
            transitionIndexByCollarVertex
              .get(
                collarVertexIndex
              )
        );


      const inner =
        outer.map(
          (transitionVertexIndex) =>
            secondTransitionIndexByTransitionVertex
              .get(
                transitionVertexIndex
              )
        );


      const [
        t0,
        t1,
        t2,
      ] = outer;


      const [
        s0,
        s1,
        s2,
      ] = inner;


      /*
       * Edge identities remain those of the exact S₀ material torus.
       */
      const edge01 =
        triangle
          .surfaceEdgeKeyByPair
          .get(
            quotientEdgeKey(
              sortedBoundary[0],
              sortedBoundary[1]
            )
          );


      const edge12 =
        triangle
          .surfaceEdgeKeyByPair
          .get(
            quotientEdgeKey(
              sortedBoundary[1],
              sortedBoundary[2]
            )
          );


      const edge02 =
        triangle
          .surfaceEdgeKeyByPair
          .get(
            quotientEdgeKey(
              sortedBoundary[0],
              sortedBoundary[2]
            )
          );


      if (
        outer.some(
          (index) =>
            !Number.isInteger(index)
        ) ||
        inner.some(
          (index) =>
            !Number.isInteger(index)
        ) ||
        !edge01 ||
        !edge12 ||
        !edge02
      ) {
        failures.push({
          reason:
            "invalid-second-transition-prism-data",

          refinedBoundaryTriangleIndex,

          sortedBoundary,
          collar,
          outer,
          inner,

          edge01,
          edge12,
          edge02,
        });


        return;
      }


      const prismInternal0 =
        secondTransitionPrismInternalFaceKey(
          refinedBoundaryTriangleIndex,
          0
        );


      const prismInternal1 =
        secondTransitionPrismInternalFaceKey(
          refinedBoundaryTriangleIndex,
          1
        );


      /*
       * S₂ is shared exactly by the first and second transition
       * product layers.
       */
      const outerBoundaryKey =
        transitionInnerFaceKey(
          refinedBoundaryTriangleIndex
        );


      /*
       * S₃ is shared exactly by the second transition layer and
       * the shifted finite core.
       */
      const innerBoundaryKey =
        secondTransitionInnerFaceKey(
          refinedBoundaryTriangleIndex
        );


      const prismCells = [
        {
          indices: [
            t0,
            t1,
            t2,
            s2,
          ],

          explicitFaceKeys: [
            secondTransitionSideFaceKey(
              edge12,
              "outer"
            ),

            secondTransitionSideFaceKey(
              edge02,
              "outer"
            ),

            prismInternal0,
            outerBoundaryKey,
          ],
        },

        {
          indices: [
            t0,
            t1,
            s1,
            s2,
          ],

          explicitFaceKeys: [
            secondTransitionSideFaceKey(
              edge12,
              "inner"
            ),

            prismInternal1,
            prismInternal0,

            secondTransitionSideFaceKey(
              edge01,
              "outer"
            ),
          ],
        },

        {
          indices: [
            t0,
            s0,
            s1,
            s2,
          ],

          explicitFaceKeys: [
            innerBoundaryKey,
            prismInternal1,

            secondTransitionSideFaceKey(
              edge02,
              "inner"
            ),

            secondTransitionSideFaceKey(
              edge01,
              "inner"
            ),
          ],
        },
      ];


      prismCells.forEach(
        (
          prismCell,
          prismCellIndex
        ) => {
          const indices =
            prismCell.indices;


          const valid =
            indices.every(
              Number.isInteger
            ) &&
            new Set(
              indices
            ).size ===
              4;


          if (!valid) {
            failures.push({
              reason:
                "degenerate-second-transition-cell",

              refinedBoundaryTriangleIndex,
              prismCellIndex,
              indices,
            });
          }


          secondTransitionCells.push({
            quotientCellIndex:
              -1,

            tetrahedronId:
              triangle
                .tetrahedronId,

            sourceCellId:
              `${triangle.sourceCellId}` +
              `-transition2-` +
              `${triangle.refinedBoundaryTriangleIndex}` +
              `-${prismCellIndex}`,

            sourceBoundaryFaceId:
              triangle
                .sourceBoundaryFaceId,

            sourceBoundaryKind:
              "cusp-transition-2",

            syntheticCellKind:
              "cusp-transition-layer-2",

            materialOrderingParity:
              triangle
                .materialOrderingParity,

            materialOrderingVertexIndices: [
              ...triangle
                .materialOrderingVertexIndices,
            ],

            transitionLayerIndex:
              2,

            transitionBoundaryTriangleIndex:
              refinedBoundaryTriangleIndex,

            transitionParentBoundaryTriangleIndex:
              triangle
                .sourceBoundaryTriangleIndex,

            quotientVertexIndices:
              indices,

            explicitFaceKeys:
              prismCell
                .explicitFaceKeys,

            valid,
          });
        }
      );
    }
  );


  /*
   * ============================================================
   * 10. TETRAHEDRALIZE THE REFINED T² × I COLLAR
   * ============================================================
   */
  const collarCells = [];

  refinedBoundaryTriangles.forEach(
    (triangle) => {
      const refinedBoundaryTriangleIndex =
        triangle
          .refinedBoundaryTriangleIndex;

      const outer =
        triangle
          .outerVertexIndices
          .slice()
          .sort(
            (a, b) =>
              a - b
          );

      const inner =
        outer.map(
          (index) =>
            collarIndexByBoundaryVertex
              .get(index)
        );

      const [
        b0,
        b1,
        b2,
      ] = outer;

      const [
        c0,
        c1,
        c2,
      ] = inner;

      const edge01 =
        triangle
          .surfaceEdgeKeyByPair
          .get(
            quotientEdgeKey(
              b0,
              b1
            )
          );

      const edge12 =
        triangle
          .surfaceEdgeKeyByPair
          .get(
            quotientEdgeKey(
              b1,
              b2
            )
          );

      const edge02 =
        triangle
          .surfaceEdgeKeyByPair
          .get(
            quotientEdgeKey(
              b0,
              b2
            )
          );

      if (
        !edge01 ||
        !edge12 ||
        !edge02
      ) {
        failures.push({
          reason:
            "missing-refined-collar-triangle-edge",

          refinedBoundaryTriangleIndex,
          edge01,
          edge12,
          edge02,
        });

        return;
      }

      const prismInternal0 =
        collarPrismInternalFaceKey(
          refinedBoundaryTriangleIndex,
          0
        );

      const prismInternal1 =
        collarPrismInternalFaceKey(
          refinedBoundaryTriangleIndex,
          1
        );

      const outerBoundaryKey =
        `collar-boundary:` +
        `${refinedBoundaryTriangleIndex}`;

      const innerBoundaryKey =
        collarInnerFaceKey(
          refinedBoundaryTriangleIndex
        );

      const prismCells = [
        {
          indices: [
            b0,
            b1,
            b2,
            c2,
          ],

          explicitFaceKeys: [
            collarSideFaceKey(
              edge12,
              "outer"
            ),

            collarSideFaceKey(
              edge02,
              "outer"
            ),

            prismInternal0,
            outerBoundaryKey,
          ],
        },

        {
          indices: [
            b0,
            b1,
            c1,
            c2,
          ],

          explicitFaceKeys: [
            collarSideFaceKey(
              edge12,
              "inner"
            ),

            prismInternal1,
            prismInternal0,

            collarSideFaceKey(
              edge01,
              "outer"
            ),
          ],
        },

        {
          indices: [
            b0,
            c0,
            c1,
            c2,
          ],

          explicitFaceKeys: [
            innerBoundaryKey,
            prismInternal1,

            collarSideFaceKey(
              edge02,
              "inner"
            ),

            collarSideFaceKey(
              edge01,
              "inner"
            ),
          ],
        },
      ];

      prismCells.forEach(
        (
          prismCell,
          prismCellIndex
        ) => {
          const indices =
            prismCell.indices;

          const valid =
            indices.every(
              Number.isInteger
            ) &&
            new Set(
              indices
            ).size ===
              4;

          if (!valid) {
            failures.push({
              reason:
                "degenerate-refined-cusp-collar-cell",

              refinedBoundaryTriangleIndex,
              prismCellIndex,
              indices,
            });
          }

          collarCells.push({
            quotientCellIndex: -1,

            tetrahedronId:
              triangle
                .tetrahedronId,

            sourceCellId:
              `${triangle.sourceCellId}` +
              `-refined-${triangle.refinedBoundaryTriangleIndex}` +
              `-collar-${prismCellIndex}`,

            sourceBoundaryFaceId:
              triangle
                .sourceBoundaryFaceId,

            sourceBoundaryKind:
              "cusp-collar",

            syntheticCellKind:
              "cusp-collar",

            materialOrderingParity:
              triangle
                .materialOrderingParity,

            materialOrderingVertexIndices: [
              ...triangle
                .materialOrderingVertexIndices,
            ],

            collarBoundaryTriangleIndex:
              refinedBoundaryTriangleIndex,

            collarParentBoundaryTriangleIndex:
              triangle
                .sourceBoundaryTriangleIndex,

            quotientVertexIndices:
              indices,

            explicitFaceKeys:
              prismCell
                .explicitFaceKeys,

            valid,
          });
        }
      );
    }
  );


  const finalCells = [
    ...shiftedCoreCells,
    ...refinedCoreCells,
    ...secondTransitionCells,
    ...transitionCells,
    ...collarCells,
  ].map(
    (
      cell,
      quotientCellIndex
    ) => ({
      ...cell,

      quotientCellIndex,
    })
  );


  /*
   * ============================================================
   * 11. REFINED CUSP-CORE INTERFACE STRUCTURAL AUDIT
   * ============================================================
   *
   * This is the exact 216-cell interface where the projective
   * experiments have localized the persistent orientation defect.
   *
   * No geometry is changed here. We expose enough immutable source
   * data to join each final quotient tetrahedron back to:
   *
   *   source tetrahedron / cusp face / ideal vertex,
   *   original barycentric source cell,
   *   S0 -> S1 -> S2 -> S3 material lineage,
   *   final deep-core H vertex.
   *
   * The live S3 solver can then join on quotientCellIndex to mark
   * which of these exact cells are orientation mismatches.
   */
  function materialDataForVertex(
    quotientVertexIndex
  ) {
    const vertex =
      quotientVertices[
        quotientVertexIndex
      ];

    const raw =
      vertex
        ?.secondTransitionData
        ?.raw ??
      vertex
        ?.transitionData
        ?.raw ??
      vertex
        ?.collarData
        ?.raw ??
      vertex
        ?.cuspData
        ?.representative
        ?.raw ??
      null;

    const coordinates =
      vertex
        ?.secondTransitionData
        ?.coordinates ??
      vertex
        ?.transitionData
        ?.coordinates ??
      vertex
        ?.collarData
        ?.coordinates ??
      vertex
        ?.cuspData
        ?.representative
        ?.coordinates ??
      null;

    return {
      quotientVertexIndex,

      root:
        vertex?.root ??
        null,

      kinds: [
        ...(vertex?.kinds ?? []),
      ],

      raw:
        raw
          ? {
              x: raw.x,
              y: raw.y,
            }
          : null,

      coordinates:
        coordinates
          ? {
              u: coordinates.u,
              v: coordinates.v,
            }
          : null,
    };
  }


  const refinedTriangleByIndex =
    new Map(
      refinedBoundaryTriangles.map(
        (triangle) => [
          triangle
            .refinedBoundaryTriangleIndex,
          triangle,
        ]
      )
    );


  const refinedCuspCoreInterfaceRows =
    finalCells
      .filter(
        (cell) =>
          cell.syntheticCellKind ===
          "refined-cusp-core"
      )
      .map(
        (cell) => {
          const triangle =
            refinedTriangleByIndex.get(
              cell
                .refinedBoundaryTriangleIndex
            );

          if (!triangle) {
            failures.push({
              reason:
                "missing-refined-cusp-core-audit-triangle",

              quotientCellIndex:
                cell.quotientCellIndex,

              refinedBoundaryTriangleIndex:
                cell
                  .refinedBoundaryTriangleIndex,
            });

            return null;
          }

          const tetrahedronId =
            triangle.tetrahedronId;

          const sourceFaceCenter =
            sourceVertex(
              tetrahedronId,
              triangle
                .sourceFaceCenterVertexIndex
            );

          const sourceBody =
            sourceVertex(
              tetrahedronId,
              triangle
                .sourceBodyVertexIndex
            );

          const sourcePerimeter =
            triangle
              .sourcePerimeterVertexIndices
              .map(
                (sourceVertexIndex) => ({
                  sourceVertexIndex,

                  barycentric:
                    sourceVertex(
                      tetrahedronId,
                      sourceVertexIndex
                    )
                      ?.barycentric ??
                    null,
                })
              );

          const s0VertexIndices = [
            ...triangle
              .outerVertexIndices,
          ];

          const s1VertexIndices = [
            ...triangle
              .innerVertexIndices,
          ];

          const s2VertexIndices =
            s1VertexIndices.map(
              (collarVertexIndex) =>
                transitionIndexByCollarVertex
                  .get(
                    collarVertexIndex
                  ) ??
                null
            );

          const s3VertexIndices =
            s2VertexIndices.map(
              (transitionVertexIndex) =>
                Number.isInteger(
                  transitionVertexIndex
                )
                  ? secondTransitionIndexByTransitionVertex
                      .get(
                        transitionVertexIndex
                      ) ??
                    null
                  : null
            );

          const deepVertexIndex =
            triangle.deepVertexIndex;

          const deepVertex =
            quotientVertices[
              deepVertexIndex
            ];

          const sourceIdealVertexIndex =
            sourceFaceCenter
              ?.cuspAddress
              ?.idealVertexIndex ??
            null;

          const sourceVolumeVertexIndices = [
            triangle
              .sourceBodyVertexIndex,
            triangle
              .sourceFaceCenterVertexIndex,
            ...triangle
              .sourcePerimeterVertexIndices,
          ];

          const sourceVolumeBarycentricAddresses =
            sourceVolumeVertexIndices.map(
              (sourceVertexIndex) => ({
                sourceVertexIndex,

                barycentric:
                  sourceVertex(
                    tetrahedronId,
                    sourceVertexIndex
                  )
                    ?.barycentric ??
                  null,
              })
            );

          const materialCoordinateFailure =
            s3VertexIndices.some(
              (vertexIndex) =>
                !Number.isInteger(
                  vertexIndex
                ) ||
                !materialDataForVertex(
                  vertexIndex
                ).coordinates
            );

          const sourceBarycentricFailure =
            sourceVolumeBarycentricAddresses
              .some(
                (entry) =>
                  !Array.isArray(
                    entry.barycentric
                  ) ||
                  entry.barycentric
                    .length !== 4 ||
                  entry.barycentric
                    .some(
                      (value) =>
                        !Number.isFinite(
                          value
                        )
                    )
              );

          return {
            quotientCellIndex:
              cell.quotientCellIndex,

            tetrahedronId,

            sourceBoundaryFaceId:
              triangle
                .sourceBoundaryFaceId,

            sourceIdealVertexIndex,

            sourceBoundaryTriangleIndex:
              triangle
                .sourceBoundaryTriangleIndex,

            localRefinedTriangleIndex:
              triangle
                .localRefinedTriangleIndex,

            refinedBoundaryTriangleIndex:
              triangle
                .refinedBoundaryTriangleIndex,

            sourceCellId:
              triangle.sourceCellId,

            sourceInterfaceClass:
              triangle
                .peripheralSourceVertices
                ? "large-face-interface"
                : "cusp-interior",

            sourceBodyVertexIndex:
              triangle
                .sourceBodyVertexIndex,

            sourceFaceCenterVertexIndex:
              triangle
                .sourceFaceCenterVertexIndex,

            sourcePerimeterVertexIndices: [
              ...triangle
                .sourcePerimeterVertexIndices,
            ],

            sourceBoundaryVertexIndices: [
              ...triangle
                .sourceBoundaryVertexIndices,
            ],

            sourceBodyBarycentric:
              sourceBody
                ?.barycentric ??
              null,

            sourceFaceCenterBarycentric:
              sourceFaceCenter
                ?.barycentric ??
              null,

            sourcePerimeterBarycentric:
              sourcePerimeter,

            sourceVolumeVertexIndices,

            sourceVolumeBarycentricAddresses,

            s0VertexIndices,
            s1VertexIndices,
            s2VertexIndices,
            s3VertexIndices,

            s3MaterialVertices:
              s3VertexIndices.map(
                materialDataForVertex
              ),

            deepVertexIndex,

            deepRoot:
              deepVertex?.root ??
              null,

            deepKinds: [
              ...(deepVertex?.kinds ?? []),
            ],

            deepBarycentricAddresses: [
              ...(
                deepVertex
                  ?.barycentricAddresses ??
                []
              ),
            ],

            surfaceEdgeKeys: [
              ...triangle
                .surfaceEdgeKeyByPair
                .values(),
            ],

            materialCoordinateFailure,
            sourceBarycentricFailure,
          };
        }
      )
      .filter(Boolean);


  const countRowsBy =
    (selector) => {
      const counts =
        new Map();

      refinedCuspCoreInterfaceRows
        .forEach(
          (row) => {
            const key =
              `${selector(row)}`;

            counts.set(
              key,
              (
                counts.get(key) ??
                0
              ) + 1
            );
          }
        );

      return [
        ...counts.entries(),
      ]
        .map(
          ([key, cellCount]) => ({
            key,
            cellCount,
          })
        )
        .sort(
          (first, second) =>
            first.key.localeCompare(
              second.key,
              undefined,
              { numeric: true }
            )
        );
    };


  const refinedCuspCoreInterfaceAudit = {
    summary: {
      cellCount:
        refinedCuspCoreInterfaceRows
          .length,

      tetrahedronCount:
        new Set(
          refinedCuspCoreInterfaceRows
            .map(
              (row) =>
                row.tetrahedronId
            )
        ).size,

      sourceBoundaryFaceCount:
        new Set(
          refinedCuspCoreInterfaceRows
            .map(
              (row) =>
                row.sourceBoundaryFaceId
            )
        ).size,

      sourceIdealVertexCount:
        new Set(
          refinedCuspCoreInterfaceRows
            .map(
              (row) =>
                row.sourceIdealVertexIndex
            )
        ).size,

      deepVertexCount:
        new Set(
          refinedCuspCoreInterfaceRows
            .map(
              (row) =>
                row.deepVertexIndex
            )
        ).size,

      materialCoordinateFailureCount:
        refinedCuspCoreInterfaceRows
          .filter(
            (row) =>
              row.materialCoordinateFailure
          ).length,

      sourceBarycentricFailureCount:
        refinedCuspCoreInterfaceRows
          .filter(
            (row) =>
              row.sourceBarycentricFailure
          ).length,
    },

    byTetrahedron:
      countRowsBy(
        (row) =>
          row.tetrahedronId
      ),

    bySourceBoundaryFace:
      countRowsBy(
        (row) =>
          row.sourceBoundaryFaceId
      ),

    bySourceIdealVertex:
      countRowsBy(
        (row) =>
          row.sourceIdealVertexIndex
      ),

    byLocalRefinedTriangle:
      countRowsBy(
        (row) =>
          row.localRefinedTriangleIndex
      ),

    byDeepVertex:
      countRowsBy(
        (row) =>
          row.deepVertexIndex
      ),

    rows:
      refinedCuspCoreInterfaceRows,
  };


  /*
   * ============================================================
   * 12. LOCAL REFINED CUSP + TWO TRANSITIONS + COLLAR FACE AUDIT
   * ============================================================
   *
   * Synthetic region:
   *
   *   216 refined cusp-core tetrahedra
   *   648 S₂ -> S₃ transition tetrahedra
   *   648 S₁ -> S₂ transition tetrahedra
   *   648 refined collar tetrahedra
   *
   * Its unpaired faces are:
   *
   *   216 outer T² boundary triangles
   *    72 interfaces to untouched large-face core cells
   *
   * Every other synthetic face must occur exactly twice.
   */
  const syntheticFaceIncidence =
    new Map();

  const incrementSyntheticFace =
    (key) =>
      syntheticFaceIncidence.set(
        key,
        (
          syntheticFaceIncidence
            .get(key) ??
          0
        ) + 1
      );

  [
    ...refinedCoreCells,
    ...secondTransitionCells,
    ...transitionCells,
    ...collarCells,
  ].forEach(
    (cell) => {
      cell.explicitFaceKeys
        ?.forEach(
          incrementSyntheticFace
        );
    }
  );

  const outerFaceKeys =
    new Set(
      refinedBoundaryTriangles.map(
        (triangle) =>
          `collar-boundary:` +
          `${triangle.refinedBoundaryTriangleIndex}`
      )
    );

  let collarOuterBoundaryFaceCount =
    0;

  let refinedCoreSourceInterfaceFaceCount =
    0;

  let collarInternalFacePairCount =
    0;

  let collarFaceIncidenceFailureCount =
    0;

  syntheticFaceIncidence.forEach(
    (
      count,
      key
    ) => {
      const outerBoundary =
        outerFaceKeys.has(
          key
        );

      const sourceInterface =
        sourceInterfaceFaceKeys.has(
          key
        );

      const expected =
        outerBoundary ||
        sourceInterface
          ? 1
          : 2;

      if (
        count !==
        expected
      ) {
        collarFaceIncidenceFailureCount +=
          1;

        failures.push({
          reason:
            "invalid-refined-collar-face-incidence",

          key,
          incidenceCount: count,
          expectedCount:
            expected,
        });

        return;
      }

      if (outerBoundary) {
        collarOuterBoundaryFaceCount +=
          1;
      } else if (
        sourceInterface
      ) {
        refinedCoreSourceInterfaceFaceCount +=
          1;
      } else {
        collarInternalFacePairCount +=
          1;
      }
    }
  );

  const expectedRefinementCounts = {
    radialMidpointCount:
      72,

    refinedBoundaryTriangleCount:
      216,

    refinedBoundaryEdgeCount:
      324,

    transitionVertexCount:
      108,

    secondTransitionVertexCount:
      108,

    barycentricCoreVertexCount:
      216,

    refinedCoreCuspCellCount:
      864,

    transitionCellCount:
      648,

    secondTransitionCellCount:
      648,

    collarCellCount:
      648,

    outerBoundaryFaceCount:
      216,

    sourceInterfaceFaceCount:
      72,

    internalFacePairCount:
      5472,
  };

  const observedRefinementCounts = {
    radialMidpointCount:
      refinementOuterVertexIndices
        .length,

    refinedBoundaryTriangleCount:
      refinedBoundaryTriangles
        .length,

    refinedBoundaryEdgeCount:
      refinedSurfaceEdgeIncidence
        .size,

    transitionVertexCount:
      transitionVertexIndices
        .length,

    secondTransitionVertexCount:
      secondTransitionVertexIndices
        .length,

    barycentricCoreVertexCount:
      refinedCoreBarycentricVertexIndices
        .length,

    refinedCoreCuspCellCount:
      refinedCoreCells.length,

    transitionCellCount:
      transitionCells.length,

    secondTransitionCellCount:
      secondTransitionCells.length,

    collarCellCount:
      collarCells.length,

    outerBoundaryFaceCount:
      collarOuterBoundaryFaceCount,

    sourceInterfaceFaceCount:
      refinedCoreSourceInterfaceFaceCount,

    internalFacePairCount:
      collarInternalFacePairCount,
  };

  Object.entries(
    expectedRefinementCounts
  ).forEach(
    (
      [
        key,
        expectedCount,
      ]
    ) => {
      const observedCount =
        observedRefinementCounts[
          key
        ];

      if (
        observedCount ===
        expectedCount
      ) {
        return;
      }

      failures.push({
        reason:
          "unexpected-collar-refinement-count",

        key,
        observedCount,
        expectedCount,
      });
    }
  );


  /*
   * ============================================================
   * 12. REBUILD GRAPH ADJACENCY
   * ============================================================
   */
  const edgeMap =
    new Map();


  finalCells.forEach(
    (cell) => {
      const ids =
        cell
          .quotientVertexIndices;

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
          const low =
            Math.min(
              ids[first],
              ids[second]
            );

          const high =
            Math.max(
              ids[first],
              ids[second]
            );

          const key =
            `${low}:${high}`;


          if (
            !edgeMap.has(key)
          ) {
            edgeMap.set(
              key,
              {
                key,

                quotientVertexIndices: [
                  low,
                  high,
                ],
              }
            );
          }
        }
      }
    }
  );


  return {
    quotientCells:
      finalCells,

    quotientEdges: [
      ...edgeMap.values(),
    ],

    refinedCuspCoreInterfaceAudit,

    diagnostics: {
      baseQuotientVertexCount,

      baseQuotientCellCount,

      originalBoundaryVertexCount:
        boundaryVertexIndices.length,

      collarBoundaryRefinementVertexCount:
        refinementOuterVertexIndices
          .length,

      collarBoundaryVertexCount:
        boundaryVertexIndices.length +
        refinementOuterVertexIndices
          .length,

      collarQuotientVertexCount:
        boundaryVertexIndices.length +
        refinementInnerVertexIndices
          .length,

      collarSourceBoundaryTriangleCount:
        boundaryTriangles.length,

      collarBoundaryTriangleCount:
        refinedBoundaryTriangles.length,

      materialOrderingEvenTriangleCount:
        refinedBoundaryTriangles.filter(
          (triangle) =>
            triangle
              .materialOrderingParity === 1
        ).length,

      materialOrderingOddTriangleCount:
        refinedBoundaryTriangles.filter(
          (triangle) =>
            triangle
              .materialOrderingParity === -1
        ).length,

      collarSourceBoundaryEdgeCount:
        boundaryEdgeOccurrenceIncidence
          .size,

      collarBoundaryEdgeCount:
        refinedSurfaceEdgeIncidence
          .size,

      collarSourceBoundaryEdgeIncidenceFailureCount:
        boundaryEdgeIncidenceFailureCount,

      collarBoundaryEdgeIncidenceFailureCount:
        refinedBoundaryEdgeIncidenceFailureCount,

      collarSourceRadialBoundaryEdgeCount:
        radialGroups.size,

      collarRadialBoundaryEdgeCount:
        radialGroups.size * 2,

      collarPeripheralBoundaryEdgeCount:
        peripheralPairCounter,

      collarRefinedInternalBoundaryEdgeCount:
        boundaryTriangles.length * 2,

      transitionQuotientVertexCount:
        transitionVertexIndices
          .length,

      secondTransitionQuotientVertexCount:
        secondTransitionVertexIndices
          .length,

      barycentricCoreQuotientVertexCount:
        refinedCoreBarycentricVertexIndices
          .length,

      refinedCoreCuspCellCount:
        refinedCoreCells.length,

      transitionCellCount:
        transitionCells.length,

      secondTransitionCellCount:
        secondTransitionCells.length,

      shiftedLargeCoreCellCount:
        shiftedCoreCells.length,

      collarCellCount:
        collarCells.length,

      collarOuterBoundaryFaceCount,

      refinedCoreSourceInterfaceFaceCount,

      collarInternalFacePairCount,

      collarFaceIncidenceFailureCount,

      expectedRefinementCounts,

      observedRefinementCounts,
    },
  };
}


/*
 * Canonical compact quotient mesh.
 *
 * This is the first genuinely manifold-level mesh:
 *
 *   - duplicated A/B large-face vertices are collapsed;
 *   - every tetrahedral cell references canonical quotient vertices;
 *   - cusp-boundary quotient vertices retain their intrinsic
 *     raw/(u,v) boundary data.
 *
 * No ambient embedding is solved here yet.
 */

/*
 * ============================================================
 * MANUAL SHARED-FACE BARYCENTRIC CORE EXPERIMENT
 * ============================================================
 *
 * This function is deliberately NOT called by the normal quotient
 * constructor. It post-processes an already-valid canonical quotient
 * only when the development worker asks for the experiment.
 *
 * Baseline K architecture:
 *
 *   216 S3 -> K cap tetrahedra
 *   648 K  -> H bridge tetrahedra
 *
 * Every inward bridge tetrahedron has exactly one face opposite K:
 *
 *   [deep, s_i, s_j]
 *
 * The 576 bridge occurrences whose opposite-K face is shared by
 * another refined parent form 288 exact cross-parent faces. Insert one
 * shared barycenter in each such face and stellarly subdivide BOTH
 * incident bridge tetrahedra 1 -> 3.
 *
 * The 72 bridge tetrahedra whose opposite-K face is an interface to
 * the untouched large-face core remain unchanged.
 *
 * No S0/S1/S2/S3 vertex or cell is changed.
 */
export function createIntrinsicSharedFaceExperimentMesh({
  quotientMesh,
}) {
  const failures = [];


  const averageSourcePoint3 =
    (points) => {
      if (
        !Array.isArray(points) ||
        points.length === 0 ||
        points.some(
          (point) =>
            !point ||
            !Number.isFinite(
              point.x
            ) ||
            !Number.isFinite(
              point.y
            ) ||
            !Number.isFinite(
              point.z
            )
        )
      ) {
        return null;
      }


      const inverseCount =
        1 / points.length;


      return {
        x:
          points.reduce(
            (
              sum,
              point
            ) =>
              sum + point.x,
            0
          ) *
          inverseCount,

        y:
          points.reduce(
            (
              sum,
              point
            ) =>
              sum + point.y,
            0
          ) *
          inverseCount,

        z:
          points.reduce(
            (
              sum,
              point
            ) =>
              sum + point.z,
            0
          ) *
          inverseCount,
      };
    };

  if (
    !quotientMesh ||
    !Array.isArray(
      quotientMesh.quotientVertices
    ) ||
    !Array.isArray(
      quotientMesh.quotientCells
    )
  ) {
    return {
      valid: false,
      failures: [
        {
          reason:
            "missing-baseline-quotient-mesh",
        },
      ],
      quotientVertices: [],
      quotientCells: [],
      quotientEdges: [],
      summary: {
        sharedFaceExperimentApplied:
          false,
      },
    };
  }


  const quotientVertices =
    quotientMesh
      .quotientVertices
      .map(
        (vertex) => ({
          ...vertex,

          kinds:
            Array.isArray(
              vertex.kinds
            )
              ? [
                  ...vertex.kinds,
                ]
              : vertex.kinds,

          memberRefs:
            Array.isArray(
              vertex.memberRefs
            )
              ? vertex.memberRefs.map(
                  (memberRef) => ({
                    ...memberRef,
                  })
                )
              : [],

          barycentricAddresses:
            Array.isArray(
              vertex.barycentricAddresses
            )
              ? vertex
                  .barycentricAddresses
                  .map(
                    (record) => ({
                      ...record,

                      barycentric:
                        Array.isArray(
                          record
                            .barycentric
                        )
                          ? [
                              ...record
                                .barycentric,
                            ]
                          : record
                              .barycentric,
                    })
                  )
              : [],
        })
      );


  const bridgeRecords =
    quotientMesh
      .quotientCells
      .map(
        (
          cell,
          cellIndex
        ) => ({
          cell,
          cellIndex,
        })
      )
      .filter(
        ({ cell }) =>
          cell
            .syntheticCellKind ===
          "refined-cusp-core-barycentric-bridge"
      );


  const oppositeKFaceIncidence =
    new Map();


  bridgeRecords.forEach(
    (
      {
        cell,
        cellIndex,
      }
    ) => {
      const key =
        cell
          .explicitFaceKeys
          ?.[0] ??
        null;

      const vertices =
        cell
          .quotientVertexIndices;

      if (
        !key ||
        !Array.isArray(vertices) ||
        vertices.length !== 4
      ) {
        failures.push({
          reason:
            "invalid-shared-face-bridge-record",

          cellIndex,

          key,

          quotientVertexIndices:
            vertices,
        });

        return;
      }


      if (
        !oppositeKFaceIncidence
          .has(key)
      ) {
        oppositeKFaceIncidence
          .set(
            key,
            []
          );
      }


      oppositeKFaceIncidence
        .get(key)
        .push({
          cell,
          cellIndex,

          parent:
            cell
              .refinedBoundaryTriangleIndex,

          faceVertexIndices:
            vertices.slice(1),
        });
    }
  );


  const sharedFaceGroups =
    [];


  oppositeKFaceIncidence
    .forEach(
      (
        incidences,
        key
      ) => {
        if (
          incidences.length === 1
        ) {
          return;
        }


        if (
          incidences.length !== 2
        ) {
          failures.push({
            reason:
              "invalid-shared-face-incidence-count",

            key,

            incidenceCount:
              incidences.length,
          });

          return;
        }


        const [
          first,
          second,
        ] =
          incidences;


        if (
          first.parent ===
          second.parent
        ) {
          failures.push({
            reason:
              "shared-face-does-not-cross-parents",

            key,

            parent:
              first.parent,
          });

          return;
        }


        const firstFace =
          first
            .faceVertexIndices
            .slice()
            .sort(
              (a, b) =>
                a - b
            );

        const secondFace =
          second
            .faceVertexIndices
            .slice()
            .sort(
              (a, b) =>
                a - b
            );


        const sameQuotientFace =
          firstFace.length ===
            secondFace.length &&
          firstFace.every(
            (
              vertexIndex,
              index
            ) =>
              vertexIndex ===
              secondFace[index]
          );


        if (
          !sameQuotientFace
        ) {
          failures.push({
            reason:
              "shared-face-quotient-vertices-disagree",

            key,

            firstFace,
            secondFace,
          });

          return;
        }


        sharedFaceGroups.push({
          key,

          incidences,

          faceVertexIndices:
            first
              .faceVertexIndices,
        });
      }
    );


  const selectedFaceByCellIndex =
    new Map();

  const sharedFaceVertexIndices =
    [];


  sharedFaceGroups.forEach(
    (
      group,
      sharedFaceIndex
    ) => {
      const sourcePoints =
        group
          .faceVertexIndices
          .map(
            (vertexIndex) =>
              quotientVertices[
                vertexIndex
              ]?.sourcePoint ??
              null
          );


      const sourcePoint =
        averageSourcePoint3(
          sourcePoints
        );


      if (!sourcePoint) {
        failures.push({
          reason:
            "missing-shared-face-source-point",

          key:
            group.key,

          faceVertexIndices:
            group
              .faceVertexIndices,
        });
      }


      const sharedFaceVertexIndex =
        quotientVertices.length;


      quotientVertices.push({
        quotientVertexIndex:
          sharedFaceVertexIndex,

        root:
          `core-shared-face:` +
          `${sharedFaceIndex}`,

        kinds: [
          "cusp-core-shared-face-barycentric",
        ],

        memberRefs: [],

        sourcePoint,

        barycentricAddresses:
          [],

        cuspBoundary:
          false,

        cuspData:
          null,

        cuspCollar:
          false,

        cuspTransition:
          false,

        cuspTransition2:
          false,

        cuspCoreBarycentric:
          false,

        cuspCoreSharedFaceBarycentric:
          true,

        cuspCoreSharedFaceData: {
          sharedFaceIndex,

          explicitFaceKey:
            group.key,

          faceVertexIndices: [
            ...group
              .faceVertexIndices,
          ],

          parentRefinedBoundaryTriangleIndices:
            group
              .incidences
              .map(
                (incidence) =>
                  incidence.parent
              ),
        },
      });


      sharedFaceVertexIndices
        .push(
          sharedFaceVertexIndex
        );


      group
        .incidences
        .forEach(
          (incidence) => {
            if (
              selectedFaceByCellIndex
                .has(
                  incidence
                    .cellIndex
                )
            ) {
              failures.push({
                reason:
                  "bridge-cell-has-multiple-shared-faces",

                cellIndex:
                  incidence
                    .cellIndex,
              });

              return;
            }


            selectedFaceByCellIndex
              .set(
                incidence
                  .cellIndex,

                {
                  key:
                    group.key,

                  sharedFaceIndex,

                  sharedFaceVertexIndex,
                }
              );
          }
        );
    }
  );


  function pairKey(
    first,
    second
  ) {
    return (
      first < second
        ? `${first}:${second}`
        : `${second}:${first}`
    );
  }


  const generatedSubfaceKeys =
    new Set();

  const generatedSpokeKeys =
    new Set();

  let splitBridgeOccurrenceCount =
    0;


  const experimentCells = [];


  quotientMesh
    .quotientCells
    .forEach(
      (
        cell,
        originalCellIndex
      ) => {
        const selection =
          selectedFaceByCellIndex
            .get(
              originalCellIndex
            );


        if (!selection) {
          experimentCells.push({
            ...cell,

            quotientVertexIndices: [
              ...cell
                .quotientVertexIndices,
            ],

            explicitFaceKeys:
              Array.isArray(
                cell.explicitFaceKeys
              )
                ? [
                    ...cell
                      .explicitFaceKeys,
                  ]
                : cell
                    .explicitFaceKeys,
          });

          return;
        }


        splitBridgeOccurrenceCount +=
          1;


        const [
          kVertexIndex,
          firstFaceVertex,
          secondFaceVertex,
          thirdFaceVertex,
        ] =
          cell
            .quotientVertexIndices;


        const faceVertices = [
          firstFaceVertex,
          secondFaceVertex,
          thirdFaceVertex,
        ];


        const oldFaceKeys = [
          ...cell.explicitFaceKeys,
        ];


        faceVertices.forEach(
          (
            omittedFaceVertex,
            localFaceIndex
          ) => {
            const retainedFaceVertices =
              faceVertices.filter(
                (
                  _,
                  index
                ) =>
                  index !==
                  localFaceIndex
              );


            const [
              retainedFirst,
              retainedSecond,
            ] =
              retainedFaceVertices;


            const subfaceKey =
              `shared-face-sub:` +
              `${selection.key}:` +
              `${pairKey(
                retainedFirst,
                retainedSecond
              )}`;


            generatedSubfaceKeys
              .add(
                subfaceKey
              );


            const spokeFirstKey =
              `shared-face-spoke:` +
              `${originalCellIndex}:` +
              `${selection.key}:` +
              `${retainedFirst}`;


            const spokeSecondKey =
              `shared-face-spoke:` +
              `${originalCellIndex}:` +
              `${selection.key}:` +
              `${retainedSecond}`;


            generatedSpokeKeys
              .add(
                spokeFirstKey
              );

            generatedSpokeKeys
              .add(
                spokeSecondKey
              );


            /*
             * New tetrahedron ordering:
             *
             *   [K, F, retainedFirst, retainedSecond]
             *
             * Face occurrence keys are aligned by omitted index:
             *
             *   0 -> shared subtriangle on the old cross-parent face
             *   1 -> one untouched original side face
             *   2 -> internal K-F-retainedSecond spoke
             *   3 -> internal K-F-retainedFirst spoke
             */
            experimentCells.push({
              ...cell,

              sourceCellId:
                `${cell.sourceCellId}` +
                `-shared-face-` +
                `${localFaceIndex}`,

              barycentricCoreRole:
                `${cell.barycentricCoreRole}` +
                `-shared-face-` +
                `${localFaceIndex}`,

              sharedFaceExperiment:
                true,

              sharedFaceExperimentIndex:
                selection
                  .sharedFaceIndex,

              sharedFaceBarycentricVertexIndex:
                selection
                  .sharedFaceVertexIndex,

              quotientVertexIndices: [
                kVertexIndex,

                selection
                  .sharedFaceVertexIndex,

                retainedFirst,

                retainedSecond,
              ],

              explicitFaceKeys: [
                subfaceKey,

                oldFaceKeys[
                  localFaceIndex + 1
                ],

                spokeSecondKey,

                spokeFirstKey,
              ],

              valid:
                new Set([
                  kVertexIndex,

                  selection
                    .sharedFaceVertexIndex,

                  retainedFirst,

                  retainedSecond,
                ]).size ===
                  4,
            });
          }
        );
      }
    );


  const quotientCells =
    experimentCells.map(
      (
        cell,
        quotientCellIndex
      ) => ({
        ...cell,

        quotientCellIndex,
      })
    );


  const quotientEdgeMap =
    new Map();


  quotientCells.forEach(
    (cell) => {
      const ids =
        cell
          .quotientVertexIndices;

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
          const low =
            Math.min(
              ids[first],
              ids[second]
            );

          const high =
            Math.max(
              ids[first],
              ids[second]
            );

          const key =
            `${low}:${high}`;


          quotientEdgeMap.set(
            key,
            {
              key,

              quotientVertexIndices: [
                low,
                high,
              ],
            }
          );
        }
      }
    }
  );


  const explicitFaceIncidence =
    new Map();


  quotientCells.forEach(
    (cell) => {
      if (
        !Array.isArray(
          cell.explicitFaceKeys
        ) ||
        cell.explicitFaceKeys
          .length !== 4
      ) {
        return;
      }


      cell
        .explicitFaceKeys
        .forEach(
          (key) => {
            explicitFaceIncidence
              .set(
                key,
                (
                  explicitFaceIncidence
                    .get(key) ??
                  0
                ) + 1
              );
          }
        );
    }
  );


  let explicitBoundaryFaceCount =
    0;

  let explicitInternalFacePairCount =
    0;

  let explicitFaceIncidenceFailureCount =
    0;


  explicitFaceIncidence
    .forEach(
      (
        count,
        key
      ) => {
        if (count === 1) {
          explicitBoundaryFaceCount +=
            1;

          return;
        }


        if (count === 2) {
          explicitInternalFacePairCount +=
            1;

          return;
        }


        explicitFaceIncidenceFailureCount +=
          1;

        failures.push({
          reason:
            "invalid-shared-face-experiment-face-incidence",

          key,

          incidenceCount:
            count,
        });
      }
    );


  const generatedSubfaceIncidenceFailures =
    [
      ...generatedSubfaceKeys,
    ].filter(
      (key) =>
        explicitFaceIncidence
          .get(key) !==
        2
    );


  const generatedSpokeIncidenceFailures =
    [
      ...generatedSpokeKeys,
    ].filter(
      (key) =>
        explicitFaceIncidence
          .get(key) !==
        2
    );


  generatedSubfaceIncidenceFailures
    .forEach(
      (key) =>
        failures.push({
          reason:
            "invalid-shared-face-subface-incidence",

          key,

          incidenceCount:
            explicitFaceIncidence
              .get(key) ??
            0,
        })
    );


  generatedSpokeIncidenceFailures
    .forEach(
      (key) =>
        failures.push({
          reason:
            "invalid-shared-face-spoke-incidence",

          key,

          incidenceCount:
            explicitFaceIncidence
              .get(key) ??
            0,
        })
    );


  const bridgeCellCount =
    quotientCells.filter(
      (cell) =>
        cell
          .syntheticCellKind ===
        "refined-cusp-core-barycentric-bridge"
    ).length;


  const capCellCount =
    quotientCells.filter(
      (cell) =>
        cell
          .syntheticCellKind ===
        "refined-cusp-core"
    ).length;


  const expected = {
    sharedCrossParentFaceCount:
      288,

    sharedFaceBarycentricCoreQuotientVertexCount:
      288,

    splitBridgeOccurrenceCount:
      576,

    capCellCount:
      216,

    bridgeCellCount:
      1800,

    refinedCoreCuspCellCount:
      2016,

    quotientVertexCount:
      946,

    quotientCellCount:
      4104,

    explicitInternalFacePairCount:
      7776,

    explicitFaceIncidenceFailureCount:
      0,
  };


  const observed = {
    sharedCrossParentFaceCount:
      sharedFaceGroups.length,

    sharedFaceBarycentricCoreQuotientVertexCount:
      sharedFaceVertexIndices
        .length,

    splitBridgeOccurrenceCount,

    capCellCount,

    bridgeCellCount,

    refinedCoreCuspCellCount:
      capCellCount +
      bridgeCellCount,

    quotientVertexCount:
      quotientVertices.length,

    quotientCellCount:
      quotientCells.length,

    explicitInternalFacePairCount,

    explicitFaceIncidenceFailureCount,
  };


  Object.entries(
    expected
  ).forEach(
    (
      [
        key,
        expectedValue,
      ]
    ) => {
      if (
        observed[key] ===
        expectedValue
      ) {
        return;
      }


      failures.push({
        reason:
          "unexpected-shared-face-experiment-count",

        key,

        expectedValue,

        observedValue:
          observed[key],
      });
    }
  );


  const valid =
    quotientMesh.valid &&
    failures.length === 0;


  const baseBarycentricCount =
    quotientMesh
      .summary
      ?.barycentricCoreQuotientVertexCount ??
    0;


  return {
    ...quotientMesh,

    valid,

    failures,

    quotientVertices,

    quotientCells,

    quotientEdges: [
      ...quotientEdgeMap.values(),
    ],

    refinedCuspCoreInterfaceAudit:
      null,

    sharedFaceExperiment: {
      valid,

      failures,

      expected,

      observed,

      sharedFaceGroups:
        sharedFaceGroups.map(
          (
            group,
            sharedFaceIndex
          ) => ({
            sharedFaceIndex,

            key:
              group.key,

            faceVertexIndices: [
              ...group
                .faceVertexIndices,
            ],

            parentRefinedBoundaryTriangleIndices:
              group
                .incidences
                .map(
                  (incidence) =>
                    incidence.parent
                ),
          })
        ),

      summary: {
        sharedCrossParentFaceCount:
          sharedFaceGroups.length,

        sharedFaceBarycentricCoreQuotientVertexCount:
          sharedFaceVertexIndices
            .length,

        splitBridgeOccurrenceCount,

        capCellCount,

        bridgeCellCount,

        generatedSubfaceCount:
          generatedSubfaceKeys
            .size,

        generatedSpokeFaceCount:
          generatedSpokeKeys
            .size,

        explicitBoundaryFaceCount,

        explicitInternalFacePairCount,

        explicitFaceIncidenceFailureCount,

        generatedSubfaceIncidenceFailureCount:
          generatedSubfaceIncidenceFailures
            .length,

        generatedSpokeIncidenceFailureCount:
          generatedSpokeIncidenceFailures
            .length,
      },
    },

    summary: {
      ...quotientMesh.summary,

      quotientVertexCount:
        quotientVertices.length,

      quotientCellCount:
        quotientCells.length,

      quotientEdgeCount:
        quotientEdgeMap.size,

      interiorQuotientVertexCount:
        (
          quotientMesh
            .summary
            ?.interiorQuotientVertexCount ??
          (
            quotientMesh
              .quotientVertices
              .length -
            (
              quotientMesh
                .summary
                ?.cuspBoundaryQuotientVertexCount ??
              0
            )
          )
        ) +
        sharedFaceVertexIndices
          .length,

      sharedFaceExperimentApplied:
        true,

      sharedCrossParentFaceCount:
        sharedFaceGroups.length,

      sharedFaceBarycentricCoreQuotientVertexCount:
        sharedFaceVertexIndices
          .length,

      totalBarycentricCoreQuotientVertexCount:
        baseBarycentricCount +
        sharedFaceVertexIndices
          .length,

      refinedCoreCuspCellCount:
        capCellCount +
        bridgeCellCount,

      collarInternalFacePairCount:
        explicitInternalFacePairCount,

      collarFaceIncidenceFailureCount:
        explicitFaceIncidenceFailureCount,

      sharedFaceExperimentExpected:
        expected,

      sharedFaceExperimentObserved:
        observed,
    },
  };
}


export function createIntrinsicQuotientMesh({
  volumeMeshes,
  facePairs,
  facePairMappingIndices,
  mappingPermutations,
  cuspFlatLayout,
  cuspCoordinateMapper,
}) {
  const nodeRecords =
    new Map();

  ["A", "B"].forEach(
    (tetrahedronId) => {
      const mesh =
        volumeMeshes?.[
          tetrahedronId
        ];

      if (!mesh) {
        return;
      }

      mesh.vertices.forEach(
        (vertex, volumeVertexIndex) => {
          const nodeKey =
            quotientNodeKey(
              tetrahedronId,
              volumeVertexIndex
            );

          nodeRecords.set(
            nodeKey,
            {
              nodeKey,
              tetrahedronId,
              volumeVertexIndex,
              vertex,
            }
          );
        }
      );
    }
  );

  const unionFind =
    makeUnionFind(
      [
        ...nodeRecords.keys(),
      ]
    );

  const pairDiagnostics =
    [];
  const failures = [];

  facePairs.forEach(
    (pair) => {
      const mappingIndex =
        normalizeMappingIndex(
          facePairMappingIndices?.[
            pair.id
          ],
          mappingPermutations
        );

      const faceA =
        boundaryFace(
          volumeMeshes.A,
          "large",
          pair.id
        );

      const faceB =
        boundaryFace(
          volumeMeshes.B,
          "large",
          pair.id
        );

      if (!faceA || !faceB) {
        failures.push({
          pairId: pair.id,
          reason:
            "missing-large-face",
        });

        pairDiagnostics.push({
          pairId: pair.id,
          mappingIndex,
          matchedVertexCount: 0,
          boundaryVertexCount: 0,
          maximumVertexError:
            Infinity,
          valid: false,
        });

        return;
      }

      let matchedVertexCount = 0;
      let maximumVertexError = 0;

      faceA
        .volumeVertexIndices
        .forEach(
          (vertexAIndex) => {
            const mappedAddress =
              mapFaceAddress({
                address:
                  volumeMeshes.A
                    .vertices[
                    vertexAIndex
                  ].barycentric,

                pair,
                mappingIndex,
                mappingPermutations,
              });

            let bestVertexBIndex =
              null;

            let bestError =
              Infinity;

            faceB
              .volumeVertexIndices
              .forEach(
                (
                  vertexBIndex
                ) => {
                  const error =
                    maxAddressError(
                      mappedAddress,
                      volumeMeshes.B
                        .vertices[
                        vertexBIndex
                      ].barycentric
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

            maximumVertexError =
              Math.max(
                maximumVertexError,
                bestError
              );

            if (
              bestVertexBIndex ===
                null ||
              bestError >
                EPSILON
            ) {
              failures.push({
                pairId: pair.id,
                vertexAIndex,
                reason:
                  "unmatched-large-face-vertex",
                error:
                  bestError,
              });

              return;
            }

            unionFind.union(
              quotientNodeKey(
                "A",
                vertexAIndex
              ),
              quotientNodeKey(
                "B",
                bestVertexBIndex
              )
            );

            matchedVertexCount += 1;
          }
        );

      pairDiagnostics.push({
        pairId: pair.id,
        mappingIndex,

        boundaryVertexCount:
          faceA
            .volumeVertexIndices
            .length,

        matchedVertexCount,

        maximumVertexError,

        valid:
          matchedVertexCount ===
            faceA
              .volumeVertexIndices
              .length &&
          maximumVertexError <=
            EPSILON,
      });
    }
  );

  const quotientClassMap =
    new Map();

  [
    ...nodeRecords.keys(),
  ].forEach((nodeKey) => {
    const root =
      unionFind.find(nodeKey);

    if (
      !quotientClassMap.has(
        root
      )
    ) {
      quotientClassMap.set(
        root,
        []
      );
    }

    quotientClassMap
      .get(root)
      .push(nodeKey);
  });

  const sortedClassEntries =
    [
      ...quotientClassMap.entries(),
    ].sort(
      (
        [firstRoot],
        [secondRoot]
      ) =>
        firstRoot.localeCompare(
          secondRoot
        )
    );

  const quotientVertices =
    [];
  const quotientIndexByNodeKey =
    new Map();

  sortedClassEntries.forEach(
    (
      [root, memberKeys],
      quotientVertexIndex
    ) => {
      const memberRecords =
        memberKeys
          .map(
            (memberKey) =>
              nodeRecords.get(
                memberKey
              )
          )
          .filter(Boolean);

      memberKeys.forEach(
        (memberKey) => {
          quotientIndexByNodeKey.set(
            memberKey,
            quotientVertexIndex
          );
        }
      );

      const kinds =
        [
          ...new Set(
            memberRecords.map(
              (record) =>
                record.vertex.kind
            )
          ),
        ].sort();

      const cuspSamples =
        memberRecords
          .map((record) => {
            if (
              !record.vertex
                .cuspAddress
            ) {
              return null;
            }

            const raw =
              rawCuspPoint(
                record.vertex
                  .cuspAddress,
                cuspFlatLayout
              );

            const coordinates =
              raw
                ? cuspCoordinateMapper(
                    raw
                  )
                : null;

            return {
              tetrahedronId:
                record.tetrahedronId,

              volumeVertexIndex:
                record
                  .volumeVertexIndex,

              cuspAddress:
                record.vertex
                  .cuspAddress,

              raw,

              coordinates,
            };
          })
          .filter(Boolean);

      let cuspConsistency =
        true;

      if (
        cuspSamples.length > 1
      ) {
        const reference =
          cuspSamples[0];

        cuspSamples
          .slice(1)
          .forEach((sample) => {
            if (
              !reference.coordinates ||
              !sample.coordinates
            ) {
              cuspConsistency =
                false;

              return;
            }

            if (
              coordinateError(
                reference.coordinates,
                sample.coordinates
              ) > EPSILON
            ) {
              cuspConsistency =
                false;
            }
          });
      }

      if (
        cuspSamples.some(
          (sample) =>
            !sample.raw ||
            !Number.isFinite(
              sample.raw.x
            ) ||
            !Number.isFinite(
              sample.raw.y
            ) ||
            !sample.coordinates ||
            !Number.isFinite(
              sample.coordinates.u
            ) ||
            !Number.isFinite(
              sample.coordinates.v
            )
        )
      ) {
        cuspConsistency =
          false;
      }

      if (
        cuspSamples.length > 0 &&
        !cuspConsistency
      ) {
        failures.push({
          quotientVertexIndex,
          root,
          reason:
            "inconsistent-cusp-boundary-data",
          memberKeys,
        });
      }

      const representative =
        memberRecords[0];

      quotientVertices.push({
        quotientVertexIndex,
        root,

        kinds,

        memberRefs:
          memberRecords.map(
            (record) => ({
              tetrahedronId:
                record
                  .tetrahedronId,

              volumeVertexIndex:
                record
                  .volumeVertexIndex,

              kind:
                record
                  .vertex.kind,

              sourceVertexId:
                record
                  .vertex.id,
            })
          ),

        sourcePoint:
          representative
            ?.vertex?.point ??
          null,

        barycentricAddresses:
          memberRecords.map(
            (record) => ({
              tetrahedronId:
                record
                  .tetrahedronId,

              volumeVertexIndex:
                record
                  .volumeVertexIndex,

              barycentric:
                record
                  .vertex
                  .barycentric,
            })
          ),

        cuspBoundary:
          cuspSamples.length > 0,

        cuspData:
          cuspSamples.length > 0
            ? {
                consistent:
                  cuspConsistency,

                representative:
                  cuspSamples[0],

                samples:
                  cuspSamples,
              }
            : null,
      });
    }
  );

  const quotientCells =
    [];
  const quotientEdgesMap =
    new Map();

  ["A", "B"].forEach(
    (tetrahedronId) => {
      const mesh =
        volumeMeshes?.[
          tetrahedronId
        ];

      if (!mesh) {
        return;
      }

      mesh.cells.forEach(
        (cell, cellIndex) => {
          const quotientVertexIndices =
            cell.volumeVertexIndices.map(
              (
                volumeVertexIndex
              ) =>
                quotientIndexByNodeKey.get(
                  quotientNodeKey(
                    tetrahedronId,
                    volumeVertexIndex
                  )
                )
            );

          const uniqueCount =
            new Set(
              quotientVertexIndices
            ).size;

          const valid =
            quotientVertexIndices.every(
              (index) =>
                Number.isInteger(
                  index
                )
            ) &&
            uniqueCount === 4;

          if (!valid) {
            failures.push({
              tetrahedronId,
              cellIndex,
              reason:
                "degenerate-quotient-cell",
              quotientVertexIndices,
            });
          }

          quotientCells.push({
            quotientCellIndex:
              quotientCells.length,

            tetrahedronId,

            sourceCellId:
              cell.id,

            sourceBoundaryFaceId:
              cell.boundaryFaceId,

            sourceBoundaryKind:
              cell.boundaryKind,

            sourceVolumeVertexIndices: [
              ...cell.volumeVertexIndices,
            ],

            quotientVertexIndices,

            valid,
          });

          for (
            let first = 0;
            first <
            quotientVertexIndices.length;
            first += 1
          ) {
            for (
              let second =
                first + 1;
              second <
              quotientVertexIndices.length;
              second += 1
            ) {
              const low =
                Math.min(
                  quotientVertexIndices[
                    first
                  ],
                  quotientVertexIndices[
                    second
                  ]
                );

              const high =
                Math.max(
                  quotientVertexIndices[
                    first
                  ],
                  quotientVertexIndices[
                    second
                  ]
                );

              const edgeKey =
                `${low}:${high}`;

              if (
                !quotientEdgesMap.has(
                  edgeKey
                )
              ) {
                quotientEdgesMap.set(
                  edgeKey,
                  {
                    key: edgeKey,
                    quotientVertexIndices: [
                      low,
                      high,
                    ],
                  }
                );
              }
            }
          }
        }
      );
    }
  );

  /*
   * The source A/B quotient above produced the original canonical
   * 46-vertex / 216-cell compact mesh.
   *
   * Preserve that exact manifold BEFORE any synthetic collar or
   * transition tori are added.
   *
   * This is the geometry-first baseline:
   *
   *   • 46 quotient vertices
   *   • 216 canonical tetrahedral cells
   *   • 36 genuine cusp-boundary vertices
   *   • 10 genuine interior vertices
   *
   * Every vertex still comes directly from the two truncated source
   * tetrahedra and retains its tetrahedron-native barycentric lineage.
   */
  const canonicalCoreVertices =
    quotientVertices.map(
      (vertex) => ({
        ...vertex,

        kinds:
          Array.isArray(
            vertex.kinds
          )
            ? [
                ...vertex.kinds,
              ]
            : vertex.kinds,

        memberRefs:
          Array.isArray(
            vertex.memberRefs
          )
            ? vertex.memberRefs.map(
                (memberRef) => ({
                  ...memberRef,
                })
              )
            : [],

        barycentricAddresses:
          Array.isArray(
            vertex.barycentricAddresses
          )
            ? vertex
                .barycentricAddresses
                .map(
                  (record) => ({
                    ...record,

                    barycentric:
                      Array.isArray(
                        record.barycentric
                      )
                        ? [
                            ...record
                              .barycentric,
                          ]
                        : record
                            .barycentric,
                  })
                )
            : [],

        /*
         * Exact local H^3 coordinates.
         *
         * A quotient vertex can own several charts. Never average
         * representatives from different ideal tetrahedra.
         */
        hyperbolicCharts:
          canonicalHyperbolicVertexCharts(
            vertex
          ),
      })
    );


  const canonicalCoreCells =
    quotientCells.map(
      (cell) => ({
        ...cell,

        sourceVolumeVertexIndices: [
          ...cell
            .sourceVolumeVertexIndices,
        ],

        quotientVertexIndices: [
          ...cell
            .quotientVertexIndices,
        ],
      })
    );


  const canonicalCoreEdges =
    [
      ...quotientEdgesMap
        .values(),
    ].map(
      (edge) => ({
        ...edge,

        quotientVertexIndices: [
          ...edge
            .quotientVertexIndices,
        ],
      })
    );


  const canonicalCoreBoundaryVertexCount =
    canonicalCoreVertices
      .filter(
        (vertex) =>
          vertex.cuspBoundary
      )
      .length;


  /*
   * The canonical quotient now carries the actual local
   * hyperbolic atlas of the two regular ideal tetrahedra.
   */
  const canonicalHyperbolicAudit =
    auditCanonicalHyperbolicGeometry(
      canonicalCoreVertices
    );


  /*
   * Verify the actual four m004 face maps as hyperbolic
   * isometries, then recover the ideal-edge classes and
   * check the 2-pi angle equations.
   */
  const canonicalHyperbolicGluingAudit =
    auditFigureEightHyperbolicGluing({
      volumeMeshes,

      facePairs,

      facePairMappingIndices,

      mappingPermutations,
    });


  /*
   * Complete the intrinsic certificate with the Euclidean cusp.
   *
   * The developed eight-triangle cusp must close to one torus
   * fundamental parallelogram with complete peripheral holonomy.
   */
  const canonicalCuspCompletenessAudit =
    auditFigureEightCuspCompleteness({
      cuspFlatLayout,
    });


  /*
   * Build the genuine simplicial refinement only on demand.
   *
   * Keeping this lazy prevents the 5,184-cell audit from running
   * during ordinary React rebuilds / Fast Refresh.
   */
  const createBarycentricSubdivision =
    () =>
      createCanonicalBarycentricSubdivision({
        canonicalVertices:
          canonicalCoreVertices,

        canonicalCells:
          canonicalCoreCells,

        volumeMeshes,

        facePairs,

        facePairMappingIndices,

        mappingPermutations,

        cuspFlatLayout,

        cuspCoordinateMapper,
      });


  const canonicalCore = {
    createBarycentricSubdivision,

    valid:
      pairDiagnostics.every(
        (item) =>
          item.valid
      ) &&
      canonicalCoreCells.every(
        (cell) =>
          cell.valid
      ) &&
      canonicalHyperbolicAudit.valid &&
      canonicalHyperbolicGluingAudit.valid &&
      canonicalCuspCompletenessAudit.valid &&
      failures.length === 0,

    pairDiagnostics:
      pairDiagnostics.map(
        (item) => ({
          ...item,
        })
      ),

    failures:
      failures.map(
        (failure) => ({
          ...failure,
        })
      ),

    quotientVertices:
      canonicalCoreVertices,

    quotientCells:
      canonicalCoreCells,

    quotientEdges:
      canonicalCoreEdges,

    /*
     * Intrinsic geometry is H^3.
     *
     * This is intentionally separate from the ambient S^3 knot
     * complement realization in figureEightS3Geometry.js.
     */
    hyperbolicGeometry: {
      model:
        "Klein ball",

      regularIdealShape:
        FIGURE_EIGHT_REGULAR_IDEAL_SHAPE,

      idealVertices:
        REGULAR_IDEAL_TETRAHEDRON_KLEIN_VERTICES,

      audit:
        canonicalHyperbolicAudit,

      gluingAudit:
        canonicalHyperbolicGluingAudit,

      cuspCompletenessAudit:
        canonicalCuspCompletenessAudit,
    },

    summary: {
      quotientVertexCount:
        canonicalCoreVertices
          .length,

      quotientCellCount:
        canonicalCoreCells
          .length,

      quotientEdgeCount:
        canonicalCoreEdges
          .length,

      cuspBoundaryQuotientVertexCount:
        canonicalCoreBoundaryVertexCount,

      interiorQuotientVertexCount:
        canonicalCoreVertices
          .length -
        canonicalCoreBoundaryVertexCount,

      syntheticVertexCount:
        0,

      syntheticCellCount:
        0,
    },
  };


  /*
   * EXISTING EXPERIMENTAL PATH
   *
   * Keep this unchanged for comparison.
   *
   * Everything below this point is the synthetic T² × I / S2 / S3
   * construction we have been investigating.
   */
  const collarResult =
    addCanonicalCuspCollar({
      quotientVertices,
      quotientCells,
      failures,

      volumeMeshes,

      facePairs,

      facePairMappingIndices,

      mappingPermutations,

      quotientIndexByNodeKey,

      cuspFlatLayout,

      cuspCoordinateMapper,
    });


  quotientCells.length = 0;

  quotientCells.push(
    ...collarResult
      .quotientCells
  );


  const quotientEdges =
    collarResult
      .quotientEdges;


  const sourceVertexCount =
    nodeRecords.size;

  const quotientVertexCount =
    quotientVertices.length;


  /*
   * Preserve the original meaning of mergedVertexCount:
   *
   * how many separate A/B source records disappeared under the
   * manifold quotient BEFORE canonical-only collar vertices were added.
   */
  const mergedVertexCount =
    sourceVertexCount -
    collarResult
      .diagnostics
      .baseQuotientVertexCount;

  const cuspBoundaryQuotientVertexCount =
    quotientVertices.filter(
      (vertex) =>
        vertex.cuspBoundary
    ).length;

  const interiorQuotientVertexCount =
    quotientVertexCount -
    cuspBoundaryQuotientVertexCount;

  const valid =
    pairDiagnostics.every(
      (item) => item.valid
    ) &&
    quotientCells.every(
      (cell) => cell.valid
    ) &&
    failures.length === 0;

  return {
    valid,

    pairDiagnostics,
    failures,

    quotientVertices,
    quotientCells,
    quotientEdges,

    canonicalCore,

    refinedCuspCoreInterfaceAudit:
      collarResult
        .refinedCuspCoreInterfaceAudit,

    summary: {
      sourceVertexCount,
      quotientVertexCount,
      mergedVertexCount,

      canonicalCoreVertexCount:
        canonicalCore
          .summary
          .quotientVertexCount,

      canonicalCoreCellCount:
        canonicalCore
          .summary
          .quotientCellCount,

      canonicalCoreBoundaryVertexCount:
        canonicalCore
          .summary
          .cuspBoundaryQuotientVertexCount,

      canonicalCoreInteriorVertexCount:
        canonicalCore
          .summary
          .interiorQuotientVertexCount,

      quotientCellCount:
        quotientCells.length,

      quotientEdgeCount:
        quotientEdges.length,

      cuspBoundaryQuotientVertexCount,
      interiorQuotientVertexCount,

      ...collarResult
        .diagnostics,

      exactCollapsedLargeFaceCount:
        pairDiagnostics.filter(
          (item) =>
            item.valid
        ).length,

      collapsedLargeFaceReferenceCount:
        pairDiagnostics.reduce(
          (sum, item) =>
            sum +
            item.matchedVertexCount,
          0
        ),
    },
  };
}
