const CONSTRUCTIVE_MESH_URL =
  "/geometry/figure-eight-complement/m004-constructive-tetmesh-s3.json";

const EXPECTED_VERTEX_COUNT =
  4608;

const EXPECTED_EDGE_COUNT =
  25500;

const EXPECTED_FACE_COUNT =
  37176;

const EXPECTED_CELL_COUNT =
  16284;

const EXPECTED_BOUNDARY_VERTEX_COUNT =
  4608;

const EXPECTED_BOUNDARY_EDGE_COUNT =
  13824;

const EXPECTED_BOUNDARY_FACE_COUNT =
  9216;

const EXPECTED_INTERNAL_FACE_COUNT =
  27960;

const NUMERICAL_TOLERANCE =
  1e-10;


function point4FromArray(
  values
) {
  return {
    x:
      values[0],

    y:
      values[1],

    z:
      values[2],

    w:
      values[3],
  };
}


function sortedEdgeKey(
  first,
  second
) {
  return first < second
    ? `${first}:${second}`
    : `${second}:${first}`;
}


function sortedFaceKey(
  first,
  second,
  third
) {
  return [
    first,
    second,
    third,
  ]
    .sort(
      (a, b) =>
        a - b
    )
    .join(":");
}


function auditTopology(
  tetrahedra,
  vertexCount
) {
  const failures =
    [];

  const edgeMap =
    new Map();

  const faceMap =
    new Map();


  tetrahedra.forEach(
    (
      tetrahedron,
      cellIndex
    ) => {
      if (
        !Array.isArray(
          tetrahedron
        ) ||
        tetrahedron.length !==
          4
      ) {
        failures.push({
          reason:
            "malformed-tetrahedron",

          cellIndex,
        });

        return;
      }


      if (
        tetrahedron.some(
          (vertexIndex) =>
            !Number.isInteger(
              vertexIndex
            ) ||
            vertexIndex <
              0 ||
            vertexIndex >=
              vertexCount
        )
      ) {
        failures.push({
          reason:
            "tetrahedron-index-out-of-range",

          cellIndex,

          tetrahedron,
        });

        return;
      }


      if (
        new Set(
          tetrahedron
        ).size !==
          4
      ) {
        failures.push({
          reason:
            "tetrahedron-repeated-vertex",

          cellIndex,

          tetrahedron,
        });

        return;
      }


      const [
        a,
        b,
        c,
        d,
      ] =
        tetrahedron;


      [
        [a, b],
        [a, c],
        [a, d],
        [b, c],
        [b, d],
        [c, d],
      ].forEach(
        ([
          first,
          second,
        ]) => {
          const key =
            sortedEdgeKey(
              first,
              second
            );

          if (
            !edgeMap.has(
              key
            )
          ) {
            edgeMap.set(
              key,
              [
                Math.min(
                  first,
                  second
                ),

                Math.max(
                  first,
                  second
                ),
              ]
            );
          }
        }
      );


      [
        [a, b, c],
        [a, b, d],
        [a, c, d],
        [b, c, d],
      ].forEach(
        (face) => {
          const key =
            sortedFaceKey(
              face[0],
              face[1],
              face[2]
            );


          if (
            !faceMap.has(
              key
            )
          ) {
            faceMap.set(
              key,
              {
                vertices:
                  face
                    .slice()
                    .sort(
                      (first, second) =>
                        first -
                        second
                    ),

                cellIndices:
                  [],
              }
            );
          }


          faceMap
            .get(
              key
            )
            .cellIndices
            .push(
              cellIndex
            );
        }
      );
    }
  );


  const adjacency =
    Array.from(
      {
        length:
          tetrahedra.length,
      },

      () =>
        new Set()
    );


  const boundaryFaces =
    [];

  const boundaryVertexSet =
    new Set();

  const boundaryEdgeSet =
    new Set();

  let internalFaceCount =
    0;

  let nonManifoldFaceCount =
    0;


  faceMap.forEach(
    (face) => {
      const incidenceCount =
        face
          .cellIndices
          .length;


      if (
        incidenceCount ===
          1
      ) {
        boundaryFaces.push(
          face.vertices
        );


        const [
          a,
          b,
          c,
        ] =
          face.vertices;


        boundaryVertexSet.add(
          a
        );

        boundaryVertexSet.add(
          b
        );

        boundaryVertexSet.add(
          c
        );


        boundaryEdgeSet.add(
          sortedEdgeKey(
            a,
            b
          )
        );

        boundaryEdgeSet.add(
          sortedEdgeKey(
            b,
            c
          )
        );

        boundaryEdgeSet.add(
          sortedEdgeKey(
            c,
            a
          )
        );

        return;
      }


      if (
        incidenceCount ===
          2
      ) {
        internalFaceCount +=
          1;


        const [
          firstCellIndex,
          secondCellIndex,
        ] =
          face
            .cellIndices;


        adjacency[
          firstCellIndex
        ].add(
          secondCellIndex
        );

        adjacency[
          secondCellIndex
        ].add(
          firstCellIndex
        );

        return;
      }


      nonManifoldFaceCount +=
        1;
    }
  );


  let connectedComponentCount =
    0;

  const visited =
    new Set();


  for (
    let seed = 0;
    seed <
      tetrahedra.length;
    seed += 1
  ) {
    if (
      visited.has(
        seed
      )
    ) {
      continue;
    }


    connectedComponentCount +=
      1;


    const stack =
      [
        seed,
      ];


    visited.add(
      seed
    );


    while (
      stack.length >
      0
    ) {
      const current =
        stack.pop();


      adjacency[
        current
      ].forEach(
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

          stack.push(
            neighbor
          );
        }
      );
    }
  }


  return {
    valid:
      failures.length ===
        0 &&
      nonManifoldFaceCount ===
        0 &&
      connectedComponentCount ===
        1,

    failures,

    edges:
      [
        ...edgeMap.values(),
      ],

    boundaryFaces,

    boundaryVertexIndices:
      [
        ...boundaryVertexSet,
      ].sort(
        (first, second) =>
          first -
          second
      ),

    summary: {
      edgeCount:
        edgeMap.size,

      faceCount:
        faceMap.size,

      boundaryVertexCount:
        boundaryVertexSet.size,

      boundaryEdgeCount:
        boundaryEdgeSet.size,

      boundaryFaceCount:
        boundaryFaces.length,

      internalFaceCount,

      nonManifoldFaceCount,

      connectedComponentCount,
    },
  };
}


function auditSourceData(
  data
) {
  const failures =
    [];


  if (
    !data ||
    data.valid !==
      true
  ) {
    failures.push({
      reason:
        "constructive-source-not-valid",
    });
  }


  const vertices3 =
    data
      ?.vertices3;

  const vertices4 =
    data
      ?.vertices4;

  const tetrahedra =
    data
      ?.tetrahedra;


  if (
    !Array.isArray(
      vertices3
    ) ||
    !Array.isArray(
      vertices4
    ) ||
    !Array.isArray(
      tetrahedra
    )
  ) {
    failures.push({
      reason:
        "constructive-source-arrays-missing",
    });


    return {
      valid:
        false,

      failures,

      topology:
        null,

      maximumNormError:
        Infinity,
    };
  }


  if (
    vertices3.length !==
      EXPECTED_VERTEX_COUNT ||
    vertices4.length !==
      EXPECTED_VERTEX_COUNT ||
    tetrahedra.length !==
      EXPECTED_CELL_COUNT
  ) {
    failures.push({
      reason:
        "constructive-source-count-mismatch",

      observed: {
        vertices3:
          vertices3.length,

        vertices4:
          vertices4.length,

        tetrahedra:
          tetrahedra.length,
      },
    });
  }


  let maximumNormError =
    0;

  let malformedVertexCount =
    0;

  let nonFiniteVertexCount =
    0;


  vertices4.forEach(
    (vertex) => {
      if (
        !Array.isArray(
          vertex
        ) ||
        vertex.length !==
          4
      ) {
        malformedVertexCount +=
          1;

        return;
      }


      if (
        !vertex.every(
          Number.isFinite
        )
      ) {
        nonFiniteVertexCount +=
          1;

        return;
      }


      maximumNormError =
        Math.max(
          maximumNormError,

          Math.abs(
            Math.hypot(
              vertex[0],
              vertex[1],
              vertex[2],
              vertex[3]
            ) -
            1
          )
        );
    }
  );


  if (
    malformedVertexCount >
      0
  ) {
    failures.push({
      reason:
        "constructive-s3-malformed-vertices",

      count:
        malformedVertexCount,
    });
  }


  if (
    nonFiniteVertexCount >
      0
  ) {
    failures.push({
      reason:
        "constructive-s3-nonfinite-vertices",

      count:
        nonFiniteVertexCount,
    });
  }


  if (
    maximumNormError >
      NUMERICAL_TOLERANCE
  ) {
    failures.push({
      reason:
        "constructive-s3-norm-error",

      maximumNormError,
    });
  }


  const sourceR3Summary =
    data
      .sourceR3Summary ??
    {};


  if (
    sourceR3Summary
      .vertexCount !==
      EXPECTED_VERTEX_COUNT ||
    sourceR3Summary
      .edgeCount !==
      EXPECTED_EDGE_COUNT ||
    sourceR3Summary
      .faceCount !==
      EXPECTED_FACE_COUNT ||
    sourceR3Summary
      .cellCount !==
      EXPECTED_CELL_COUNT ||
    sourceR3Summary
      .boundaryVertexCount !==
      EXPECTED_BOUNDARY_VERTEX_COUNT ||
    sourceR3Summary
      .boundaryEdgeCount !==
      EXPECTED_BOUNDARY_EDGE_COUNT ||
    sourceR3Summary
      .boundaryFaceCount !==
      EXPECTED_BOUNDARY_FACE_COUNT ||
    sourceR3Summary
      .missingBoundaryVertexCount !==
      0 ||
    sourceR3Summary
      .missingBoundaryFaceCount !==
      0 ||
    sourceR3Summary
      .unexpectedBoundaryFaceCount !==
      0 ||
    sourceR3Summary
      .nonmanifoldFaceCount !==
      0 ||
    sourceR3Summary
      .connectedComponentCount !==
      1 ||
    sourceR3Summary
      .volumeEulerCharacteristic !==
      0 ||
    sourceR3Summary
      .boundaryEulerCharacteristic !==
      0 ||
    sourceR3Summary
      .degenerateCellCount !==
      0
  ) {
    failures.push({
      reason:
        "constructive-r3-certification-mismatch",

      sourceR3Summary,
    });
  }


  const sourceS3Summary =
    data
      .summary ??
    {};


  if (
    sourceS3Summary
      .vertexCount !==
      EXPECTED_VERTEX_COUNT ||
    sourceS3Summary
      .cellCount !==
      EXPECTED_CELL_COUNT ||
    sourceS3Summary
      .finiteVertexCount !==
      EXPECTED_VERTEX_COUNT ||
    sourceS3Summary
      .topologyPreserved !==
      true ||
    sourceS3Summary
      .linearR4Tetrahedra !==
      false ||
    !Number.isFinite(
      sourceS3Summary
        .maximumS3NormError
    ) ||
    sourceS3Summary
      .maximumS3NormError >
      NUMERICAL_TOLERANCE ||
    !Number.isFinite(
      sourceS3Summary
        .maximumVertexRoundTripError
    ) ||
    sourceS3Summary
      .maximumVertexRoundTripError >
      NUMERICAL_TOLERANCE ||
    !Number.isFinite(
      sourceS3Summary
        .maximumCellCenterRoundTripError
    ) ||
    sourceS3Summary
      .maximumCellCenterRoundTripError >
      NUMERICAL_TOLERANCE ||
    !Number.isFinite(
      sourceS3Summary
        .minimumPoleDenominator
    ) ||
    sourceS3Summary
      .minimumPoleDenominator <=
      0
  ) {
    failures.push({
      reason:
        "constructive-s3-certification-mismatch",

      sourceS3Summary,
    });
  }


  if (
    data
      ?.cellMap
      ?.type !==
      "inverse-stereographic-image" ||
    data
      ?.cellMap
      ?.linearR4Tetrahedra !==
      false
  ) {
    failures.push({
      reason:
        "constructive-cell-map-contract-mismatch",
    });
  }


  const topology =
    auditTopology(
      tetrahedra,
      vertices4.length
    );


  failures.push(
    ...topology.failures
  );


  const topologySummary =
    topology.summary;


  if (
    topologySummary
      .edgeCount !==
      EXPECTED_EDGE_COUNT ||
    topologySummary
      .faceCount !==
      EXPECTED_FACE_COUNT ||
    topologySummary
      .boundaryVertexCount !==
      EXPECTED_BOUNDARY_VERTEX_COUNT ||
    topologySummary
      .boundaryEdgeCount !==
      EXPECTED_BOUNDARY_EDGE_COUNT ||
    topologySummary
      .boundaryFaceCount !==
      EXPECTED_BOUNDARY_FACE_COUNT ||
    topologySummary
      .internalFaceCount !==
      EXPECTED_INTERNAL_FACE_COUNT ||
    topologySummary
      .nonManifoldFaceCount !==
      0 ||
    topologySummary
      .connectedComponentCount !==
      1
  ) {
    failures.push({
      reason:
        "constructive-runtime-topology-mismatch",

      topologySummary,
    });
  }


  return {
    valid:
      failures.length ===
        0,

    failures,

    topology,

    maximumNormError,
  };
}


export function createIntrinsicS3ConstructiveVolumeState(
  data
) {
  const audit =
    auditSourceData(
      data
    );


  if (
    !audit.valid
  ) {
    return {
      ready:
        false,

      authoritative:
        true,

      method:
        "constructive S3 volume certification failed",

      failures:
        audit.failures,

      summary: {
        geometryMode:
          "constructive-exact-stereographic",

        ready:
          false,
      },
    };
  }


  const positions =
    data
      .vertices4
      .map(
        point4FromArray
      );


  const quotientVertices =
    positions.map(
      (
        position,
        quotientVertexIndex
      ) => ({
        quotientVertexIndex,

        constructiveBoundary:
          true,

        position,
      })
    );


  const quotientEdges =
    audit
      .topology
      .edges
      .map(
        (
          quotientVertexIndices,
          quotientEdgeIndex
        ) => ({
          quotientEdgeIndex,

          quotientVertexIndices,

          constructive:
            true,
        })
      );


  const quotientCells =
    data
      .tetrahedra
      .map(
        (
          quotientVertexIndices,
          quotientCellIndex
        ) => ({
          quotientCellIndex,

          quotientVertexIndices: [
            ...quotientVertexIndices,
          ],

          topologyVertexIndices: [
            ...quotientVertexIndices,
          ],

          constructive:
            true,

          constructiveStereographicCell:
            true,
        })
      );


  const quotientMesh = {
    valid:
      true,

    constructive:
      true,

    quotientVertices,

    quotientEdges,

    quotientCells,

    boundaryFaces:
      audit
        .topology
        .boundaryFaces,

    summary: {
      quotientVertexCount:
        quotientVertices.length,

      quotientEdgeCount:
        quotientEdges.length,

      quotientFaceCount:
        audit
          .topology
          .summary
          .faceCount,

      quotientCellCount:
        quotientCells.length,

      boundaryVertexCount:
        audit
          .topology
          .summary
          .boundaryVertexCount,

      boundaryEdgeCount:
        audit
          .topology
          .summary
          .boundaryEdgeCount,

      boundaryFaceCount:
        audit
          .topology
          .summary
          .boundaryFaceCount,

      internalFaceCount:
        audit
          .topology
          .summary
          .internalFaceCount,

      nonManifoldFaceCount:
        0,

      syntheticVertexCount:
        0,

      syntheticCellCount:
        0,
    },
  };


  return {
    ready:
      true,

    authoritative:
      true,

    method:
      "certified figure-eight complement + constrained R3 tetrahedralization + exact inverse stereographic S3 cell map",

    sourceUrl:
      CONSTRUCTIVE_MESH_URL,

    quotientMesh,

    positions,

    vertices3:
      data.vertices3,

    vertices4:
      data.vertices4,

    tetrahedra:
      data.tetrahedra,

    fixedBoundaryVertexIndices:
      audit
        .topology
        .boundaryVertexIndices,

    interiorVertexIndices:
      [],

    cellMap:
      data.cellMap,

    pole4:
      data.pole4,

    projectionBasis4:
      data
        .projectionBasis4,

    certification: {
      r3:
        data
          .sourceR3Summary,

      s3:
        data
          .summary,

      runtimeTopology:
        audit
          .topology
          .summary,
    },

    failures:
      [],

    summary: {
      authoritative:
        true,

      geometryMode:
        "constructive-exact-stereographic",

      quotientVertexCount:
        quotientVertices.length,

      fixedBoundaryVertexCount:
        audit
          .topology
          .boundaryVertexIndices
          .length,

      interiorUnknownVertexCount:
        0,

      edgeCount:
        quotientEdges.length,

      faceCount:
        audit
          .topology
          .summary
          .faceCount,

      cellCount:
        quotientCells.length,

      boundaryFaceCount:
        audit
          .topology
          .summary
          .boundaryFaceCount,

      internalFaceCount:
        audit
          .topology
          .summary
          .internalFaceCount,

      nonManifoldFaceCount:
        0,

      connectedComponentCount:
        1,

      syntheticVertexCount:
        0,

      syntheticCellCount:
        0,

      certifiedR3DegenerateCellCount:
        data
          .sourceR3Summary
          .degenerateCellCount,

      totalEuclideanVolume:
        data
          .sourceR3Summary
          .totalEuclideanVolume,

      maximumNormError:
        audit
          .maximumNormError,

      maximumVertexRoundTripError:
        data
          .summary
          .maximumVertexRoundTripError,

      maximumCellCenterRoundTripError:
        data
          .summary
          .maximumCellCenterRoundTripError,

      minimumPoleDenominator:
        data
          .summary
          .minimumPoleDenominator,

      topologyPreserved:
        true,

      linearR4Tetrahedra:
        false,

      ambientRelaxationRequired:
        false,
    },
  };
}


export async function loadIntrinsicS3ConstructiveVolumeState({
  url =
    CONSTRUCTIVE_MESH_URL,

  signal =
    undefined,
} = {}) {
  try {
    const response =
      await fetch(
        url,
        {
          cache:
            "no-store",

          signal,
        }
      );


    if (
      !response.ok
    ) {
      return {
        ready:
          false,

        authoritative:
          true,

        method:
          "constructive S3 mesh fetch failed",

        failures: [
          {
            reason:
              "constructive-s3-http-error",

            status:
              response.status,

            statusText:
              response.statusText,

            url,
          },
        ],

        summary: {
          geometryMode:
            "constructive-exact-stereographic",

          ready:
            false,
        },
      };
    }


    const data =
      await response.json();


    const state =
      createIntrinsicS3ConstructiveVolumeState(
        data
      );


    return {
      ...state,

      sourceUrl:
        url,
    };
  } catch (error) {
    return {
      ready:
        false,

      authoritative:
        true,

      method:
        "constructive S3 mesh fetch failed",

      failures: [
        {
          reason:
            "constructive-s3-fetch-exception",

          message:
            error instanceof Error
              ? error.message
              : String(
                  error
                ),

          url,
        },
      ],

      summary: {
        geometryMode:
          "constructive-exact-stereographic",

        ready:
          false,
      },
    };
  }
}


export {
  CONSTRUCTIVE_MESH_URL as
    INTRINSIC_S3_CONSTRUCTIVE_MESH_URL,
};
