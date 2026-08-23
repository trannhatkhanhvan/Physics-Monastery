import {
  auditCanonicalHyperbolicGeometry,
  canonicalHyperbolicVertexCharts,
} from "./intrinsicHyperbolicFigureEightGeometry";


const EPSILON = 1e-10;


function subtractPoint(a, b) {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z,
  };
}


function crossPoint(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}


function dotPoint(a, b) {
  return (
    a.x * b.x +
    a.y * b.y +
    a.z * b.z
  );
}


function signedTetrahedronVolume(a, b, c, d) {
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


function averageAddresses(addresses) {
  const sum = [0, 0, 0, 0];

  addresses.forEach((address) => {
    address.forEach((value, index) => {
      sum[index] += value;
    });
  });

  return sum.map(
    (value) =>
      value / addresses.length
  );
}


function averagePoints(points) {
  if (
    !Array.isArray(points) ||
    points.length === 0 ||
    points.some(
      (point) =>
        !point ||
        !Number.isFinite(point.x) ||
        !Number.isFinite(point.y) ||
        !Number.isFinite(point.z)
    )
  ) {
    return null;
  }

  const scale =
    1 / points.length;

  return points.reduce(
    (sum, point) => ({
      x:
        sum.x +
        scale * point.x,

      y:
        sum.y +
        scale * point.y,

      z:
        sum.z +
        scale * point.z,
    }),
    {
      x: 0,
      y: 0,
      z: 0,
    }
  );
}


function averageCompatibleCuspAddresses(
  addresses
) {
  if (
    !Array.isArray(addresses) ||
    addresses.length === 0 ||
    addresses.some(
      (address) =>
        !address
    )
  ) {
    return null;
  }

  const first =
    addresses[0];

  const compatible =
    addresses.every(
      (address) =>
        address.cuspBaseId ===
          first.cuspBaseId &&
        address.idealVertexIndex ===
          first.idealVertexIndex &&
        Array.isArray(
          address.neighborIndices
        ) &&
        Array.isArray(
          first.neighborIndices
        ) &&
        address.neighborIndices.length ===
          first.neighborIndices.length &&
        address.neighborIndices.every(
          (
            neighborIndex,
            index
          ) =>
            neighborIndex ===
            first.neighborIndices[
              index
            ]
        ) &&
        Array.isArray(
          address.localWeights
        ) &&
        address.localWeights.length ===
          first.localWeights.length
    );

  if (!compatible) {
    return null;
  }

  return {
    cuspBaseId:
      first.cuspBaseId,

    idealVertexIndex:
      first.idealVertexIndex,

    neighborIndices: [
      ...first.neighborIndices,
    ],

    localWeights:
      first.localWeights.map(
        (
          _,
          index
        ) =>
          addresses.reduce(
            (
              sum,
              address
            ) =>
              sum +
              address.localWeights[
                index
              ],
            0
          ) /
          addresses.length
      ),
  };
}


function rawCuspPoint(
  cuspAddress,
  cuspFlatLayout
) {
  const triangle =
    cuspFlatLayout?.[
      cuspAddress?.cuspBaseId
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
      (point) =>
        !point
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


function periodicUnitCoordinateError(
  first,
  second
) {
  const delta =
    first - second;

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


function maxAddressError(
  first,
  second
) {
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


function sourceSimplexKey(
  rank,
  vertexIndices,
  cellIndex = null
) {
  if (rank === 3) {
    return `c:${cellIndex}`;
  }

  if (rank === 0) {
    return (
      `v:${vertexIndices[0]}`
    );
  }

  const prefix =
    rank === 1
      ? "e"
      : "f";

  return (
    `${prefix}:` +
    vertexIndices
      .slice()
      .sort(
        (a, b) =>
          a - b
      )
      .join(":")
  );
}


function permutations4() {
  const output = [];

  function visit(
    prefix,
    remaining
  ) {
    if (
      remaining.length ===
      0
    ) {
      output.push(prefix);
      return;
    }

    remaining.forEach(
      (
        value,
        index
      ) => {
        visit(
          [
            ...prefix,
            value,
          ],
          [
            ...remaining.slice(
              0,
              index
            ),
            ...remaining.slice(
              index + 1
            ),
          ]
        );
      }
    );
  }

  visit(
    [],
    [0, 1, 2, 3]
  );

  return output;
}


const SUBDIVISION_PERMUTATIONS =
  permutations4();


function permutationParityToSorted(
  values
) {
  const sorted =
    values
      .slice()
      .sort(
        (a, b) =>
          a - b
      );

  const permutation =
    values.map(
      (value) =>
        sorted.indexOf(
          value
        )
    );

  let inversionCount =
    0;

  for (
    let first = 0;
    first < permutation.length;
    first += 1
  ) {
    for (
      let second =
        first + 1;
      second < permutation.length;
      second += 1
    ) {
      if (
        permutation[first] >
        permutation[second]
      ) {
        inversionCount +=
          1;
      }
    }
  }

  return (
    inversionCount % 2 === 0
      ? 1
      : -1
  );
}


function makeUnionFind(keys) {
  const parent =
    new Map(
      keys.map(
        (key) => [
          key,
          key,
        ]
      )
    );

  function find(key) {
    const current =
      parent.get(key);

    if (
      current === key
    ) {
      return key;
    }

    const root =
      find(current);

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
      find(first);

    const secondRoot =
      find(second);

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


function boundaryFace(
  volumeMesh,
  pairId
) {
  return (
    volumeMesh
      .boundaryFaces
      .find(
        (face) =>
          face.kind ===
            "large" &&
          face.pairId ===
            pairId
      ) ??
    null
  );
}


/*
 * Barycentrically subdivide one SOURCE truncated tetrahedron
 * before quotienting.
 *
 * Distinct source edges/faces remain distinct even when the
 * quotient later gives them identical endpoint vertex sets.
 */
function buildSourceSubdivision({
  tetrahedronId,
  volumeMesh,
  cuspFlatLayout,
  cuspCoordinateMapper,
}) {
  const failures = [];

  const edgeVerticesByKey =
    new Map();

  const faceVerticesByKey =
    new Map();


  volumeMesh.cells.forEach(
    (
      cell,
      cellIndex
    ) => {
      const vertices =
        cell
          .volumeVertexIndices;


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
          const simplexVertices = [
            vertices[first],
            vertices[second],
          ];

          const key =
            sourceSimplexKey(
              1,
              simplexVertices
            );

          if (
            !edgeVerticesByKey.has(
              key
            )
          ) {
            edgeVerticesByKey.set(
              key,
              simplexVertices
                .slice()
                .sort(
                  (a, b) =>
                    a - b
                )
            );
          }
        }
      }


      for (
        let omitted = 0;
        omitted < 4;
        omitted += 1
      ) {
        const simplexVertices =
          vertices.filter(
            (
              _,
              index
            ) =>
              index !== omitted
          );

        const key =
          sourceSimplexKey(
            2,
            simplexVertices
          );

        if (
          !faceVerticesByKey.has(
            key
          )
        ) {
          faceVerticesByKey.set(
            key,
            simplexVertices
              .slice()
              .sort(
                (a, b) =>
                  a - b
              )
          );
        }
      }
    }
  );


  function makeNode({
    rank,
    simplexVertexIndices,
    cellIndex = null,
  }) {
    const sourceVertices =
      simplexVertexIndices.map(
        (vertexIndex) =>
          volumeMesh
            .vertices[
              vertexIndex
            ]
      );

    const barycentric =
      averageAddresses(
        sourceVertices.map(
          (vertex) =>
            vertex.barycentric
        )
      );

    const point =
      averagePoints(
        sourceVertices.map(
          (vertex) =>
            vertex.point
        )
      );

    const cuspAddress =
      averageCompatibleCuspAddresses(
        sourceVertices.map(
          (vertex) =>
            vertex.cuspAddress
        )
      );

    const raw =
      cuspAddress
        ? rawCuspPoint(
            cuspAddress,
            cuspFlatLayout
          )
        : null;

    const coordinates =
      raw
        ? cuspCoordinateMapper(
            raw
          )
        : null;

    return {
      tetrahedronId,

      localRefinedVertexIndex:
        null,

      rank,

      simplexKey:
        sourceSimplexKey(
          rank,
          simplexVertexIndices,
          cellIndex
        ),

      simplexVertexIndices: [
        ...simplexVertexIndices,
      ],

      sourceCellIndex:
        rank === 3
          ? cellIndex
          : null,

      barycentric,

      point,

      cuspAddress,

      raw,

      coordinates,
    };
  }


  const nodes = [];

  const nodeIndexBySimplexKey =
    new Map();


  function appendNode(node) {
    const index =
      nodes.length;

    node.localRefinedVertexIndex =
      index;

    nodes.push(node);

    nodeIndexBySimplexKey.set(
      node.simplexKey,
      index
    );

    return index;
  }


  volumeMesh.vertices.forEach(
    (
      _,
      vertexIndex
    ) => {
      appendNode(
        makeNode({
          rank: 0,

          simplexVertexIndices: [
            vertexIndex,
          ],
        })
      );
    }
  );


  edgeVerticesByKey.forEach(
    (simplexVertexIndices) => {
      appendNode(
        makeNode({
          rank: 1,
          simplexVertexIndices,
        })
      );
    }
  );


  faceVerticesByKey.forEach(
    (simplexVertexIndices) => {
      appendNode(
        makeNode({
          rank: 2,
          simplexVertexIndices,
        })
      );
    }
  );


  volumeMesh.cells.forEach(
    (
      cell,
      cellIndex
    ) => {
      appendNode(
        makeNode({
          rank: 3,

          simplexVertexIndices:
            cell
              .volumeVertexIndices,

          cellIndex,
        })
      );
    }
  );


  const childCells =
    [];

  let maximumChildReferenceVolumeError =
    0;

  let maximumParentVolumePartitionError =
    0;

  let invalidChildCellCount =
    0;


  volumeMesh.cells.forEach(
    (
      cell,
      cellIndex
    ) => {
      const parentVertices =
        cell
          .volumeVertexIndices;

      const cellNodeIndex =
        nodeIndexBySimplexKey.get(
          sourceSimplexKey(
            3,
            parentVertices,
            cellIndex
          )
        );

      let childReferenceVolumeSum =
        0;


      SUBDIVISION_PERMUTATIONS
        .forEach(
          (
            permutation,
            permutationIndex
          ) => {
            const originalSourceVertexIndex =
              parentVertices[
                permutation[0]
              ];

            const edgeSourceVertices = [
              parentVertices[
                permutation[0]
              ],
              parentVertices[
                permutation[1]
              ],
            ];

            const faceSourceVertices = [
              parentVertices[
                permutation[0]
              ],
              parentVertices[
                permutation[1]
              ],
              parentVertices[
                permutation[2]
              ],
            ];


            const originalNodeIndex =
              nodeIndexBySimplexKey.get(
                sourceSimplexKey(
                  0,
                  [
                    originalSourceVertexIndex,
                  ]
                )
              );

            const edgeNodeIndex =
              nodeIndexBySimplexKey.get(
                sourceSimplexKey(
                  1,
                  edgeSourceVertices
                )
              );

            const faceNodeIndex =
              nodeIndexBySimplexKey.get(
                sourceSimplexKey(
                  2,
                  faceSourceVertices
                )
              );


            const chain = [
              originalNodeIndex,
              edgeNodeIndex,
              faceNodeIndex,
              cellNodeIndex,
            ];


            let referenceVolume =
              signedTetrahedronVolume(
                ...chain.map(
                  (nodeIndex) =>
                    nodes[
                      nodeIndex
                    ].point
                )
              );


            const orientedChain = [
              ...chain,
            ];


            if (
              referenceVolume < 0
            ) {
              [
                orientedChain[2],
                orientedChain[3],
              ] = [
                orientedChain[3],
                orientedChain[2],
              ];

              referenceVolume =
                -referenceVolume;
            }


            const expectedReferenceVolume =
              cell.referenceVolume /
              24;


            const valid =
              new Set(
                orientedChain
              ).size === 4 &&
              Number.isFinite(
                referenceVolume
              ) &&
              referenceVolume >
                EPSILON;


            if (!valid) {
              invalidChildCellCount +=
                1;
            }


            maximumChildReferenceVolumeError =
              Math.max(
                maximumChildReferenceVolumeError,

                Math.abs(
                  referenceVolume -
                  expectedReferenceVolume
                )
              );


            childReferenceVolumeSum +=
              referenceVolume;


            childCells.push({
              tetrahedronId,

              sourceCellIndex:
                cellIndex,

              sourceCellId:
                cell.id,

              sourceBoundaryFaceId:
                cell.boundaryFaceId,

              sourceBoundaryKind:
                cell.boundaryKind,

              barycentricPermutation: [
                ...permutation,
              ],

              barycentricPermutationIndex:
                permutationIndex,

              localRefinedVertexIndices:
                orientedChain,

              chainLocalRefinedVertexIndices:
                chain,

              referenceVolume,

              expectedReferenceVolume,

              valid,
            });
          }
        );


      maximumParentVolumePartitionError =
        Math.max(
          maximumParentVolumePartitionError,

          Math.abs(
            childReferenceVolumeSum -
            cell.referenceVolume
          )
        );
    }
  );


  return {
    tetrahedronId,

    nodes,

    childCells,

    nodeIndexBySimplexKey,

    failures,

    summary: {
      sourceVertexCount:
        volumeMesh
          .vertices
          .length,

      sourceEdgeCount:
        edgeVerticesByKey
          .size,

      sourceFaceCount:
        faceVerticesByKey
          .size,

      sourceCellCount:
        volumeMesh
          .cells
          .length,

      refinedNodeCount:
        nodes.length,

      childCellCount:
        childCells.length,

      invalidChildCellCount,

      maximumChildReferenceVolumeError,

      maximumParentVolumePartitionError,
    },
  };
}


/*
 * Full barycentric subdivision of the VERIFIED canonical m004 quotient.
 *
 * Subdivision occurs before A/B quotienting. The exact four large-face
 * maps are then extended to edge and face barycenters.
 */
export function createCanonicalBarycentricSubdivision({
  canonicalVertices,
  canonicalCells,
  volumeMeshes,
  facePairs,
  facePairMappingIndices,
  mappingPermutations,
  cuspFlatLayout,
  cuspCoordinateMapper,
}) {
  const failures = [];


  const sourceSubdivisions = {
    A:
      buildSourceSubdivision({
        tetrahedronId:
          "A",

        volumeMesh:
          volumeMeshes.A,

        cuspFlatLayout,

        cuspCoordinateMapper,
      }),

    B:
      buildSourceSubdivision({
        tetrahedronId:
          "B",

        volumeMesh:
          volumeMeshes.B,

        cuspFlatLayout,

        cuspCoordinateMapper,
      }),
  };


  const sourceNodeIds =
    [];


  ["A", "B"].forEach(
    (tetrahedronId) => {
      sourceSubdivisions[
        tetrahedronId
      ]
        .nodes
        .forEach(
          (node) => {
            sourceNodeIds.push(
              `${tetrahedronId}:` +
              `${node.localRefinedVertexIndex}`
            );
          }
        );
    }
  );


  const unionFind =
    makeUnionFind(
      sourceNodeIds
    );


  function sourceNodeId(
    tetrahedronId,
    localRefinedVertexIndex
  ) {
    return (
      `${tetrahedronId}:` +
      `${localRefinedVertexIndex}`
    );
  }


  function originalNodeIndex(
    tetrahedronId,
    volumeVertexIndex
  ) {
    return (
      sourceSubdivisions[
        tetrahedronId
      ]
        .nodeIndexBySimplexKey
        .get(
          sourceSimplexKey(
            0,
            [
              volumeVertexIndex,
            ]
          )
        )
    );
  }


  /*
   * Reproduce the already-verified original 46 quotient vertices.
   */
  let originalMemberRefCount =
    0;


  canonicalVertices.forEach(
    (vertex) => {
      const memberIds =
        (
          vertex.memberRefs ??
          []
        ).map(
          (memberRef) => {
            originalMemberRefCount +=
              1;

            const nodeIndex =
              originalNodeIndex(
                memberRef
                  .tetrahedronId,

                memberRef
                  .volumeVertexIndex
              );

            return sourceNodeId(
              memberRef
                .tetrahedronId,

              nodeIndex
            );
          }
        );


      if (
        memberIds.length === 0
      ) {
        failures.push({
          reason:
            "missing-original-canonical-subdivision-members",

          quotientVertexIndex:
            vertex
              .quotientVertexIndex,
        });

        return;
      }


      memberIds
        .slice(1)
        .forEach(
          (memberId) => {
            unionFind.union(
              memberIds[0],
              memberId
            );
          }
        );
    }
  );


  /*
   * Extend each exact large-face map to all refined simplices
   * contained in that face.
   */
  const faceGluingDiagnostics =
    [];


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
          pair.id
        );

      const faceB =
        boundaryFace(
          volumeMeshes.B,
          pair.id
        );


      if (
        !faceA ||
        !faceB
      ) {
        failures.push({
          reason:
            "missing-barycentric-subdivision-large-face",

          pairId:
            pair.id,
        });

        return;
      }


      const vertexMapAtoB =
        new Map();

      let maximumMappedAddressError =
        0;


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
                    ]
                    .barycentric,

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
                (vertexBIndex) => {
                  const error =
                    maxAddressError(
                      mappedAddress,

                      volumeMeshes.B
                        .vertices[
                          vertexBIndex
                        ]
                        .barycentric
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
                EPSILON
            ) {
              failures.push({
                reason:
                  "unmatched-barycentric-subdivision-large-face-vertex",

                pairId:
                  pair.id,

                vertexAIndex,

                bestError,
              });

              return;
            }


            vertexMapAtoB.set(
              vertexAIndex,
              bestVertexBIndex
            );
          }
        );


      const faceAVertexSet =
        new Set(
          faceA
            .volumeVertexIndices
        );


      let identifiedOriginalVertexCount =
        0;

      let identifiedEdgeBarycenterCount =
        0;

      let identifiedFaceBarycenterCount =
        0;


      sourceSubdivisions.A
        .nodes
        .forEach(
          (nodeA) => {
            if (
              nodeA.rank > 2
            ) {
              return;
            }


            if (
              !nodeA
                .simplexVertexIndices
                .every(
                  (vertexIndex) =>
                    faceAVertexSet.has(
                      vertexIndex
                    )
                )
            ) {
              return;
            }


            const mappedSimplexVertexIndices =
              nodeA
                .simplexVertexIndices
                .map(
                  (vertexIndex) =>
                    vertexMapAtoB.get(
                      vertexIndex
                    )
                );


            if (
              mappedSimplexVertexIndices
                .some(
                  (vertexIndex) =>
                    !Number.isInteger(
                      vertexIndex
                    )
                )
            ) {
              failures.push({
                reason:
                  "incomplete-barycentric-subdivision-face-simplex-map",

                pairId:
                  pair.id,

                rank:
                  nodeA.rank,

                simplexVertexIndices:
                  nodeA
                    .simplexVertexIndices,
              });

              return;
            }


            const mappedKey =
              sourceSimplexKey(
                nodeA.rank,
                mappedSimplexVertexIndices
              );


            const nodeBIndex =
              sourceSubdivisions.B
                .nodeIndexBySimplexKey
                .get(
                  mappedKey
                );


            if (
              !Number.isInteger(
                nodeBIndex
              )
            ) {
              failures.push({
                reason:
                  "missing-barycentric-subdivision-target-simplex",

                pairId:
                  pair.id,

                rank:
                  nodeA.rank,

                mappedKey,
              });

              return;
            }


            unionFind.union(
              sourceNodeId(
                "A",
                nodeA
                  .localRefinedVertexIndex
              ),

              sourceNodeId(
                "B",
                nodeBIndex
              )
            );


            if (
              nodeA.rank === 0
            ) {
              identifiedOriginalVertexCount +=
                1;
            }

            if (
              nodeA.rank === 1
            ) {
              identifiedEdgeBarycenterCount +=
                1;
            }

            if (
              nodeA.rank === 2
            ) {
              identifiedFaceBarycenterCount +=
                1;
            }
          }
        );


      faceGluingDiagnostics.push({
        pairId:
          pair.id,

        mappingIndex,

        maximumMappedAddressError,

        mappedOriginalFaceVertexCount:
          vertexMapAtoB.size,

        identifiedOriginalVertexCount,

        identifiedEdgeBarycenterCount,

        identifiedFaceBarycenterCount,

        valid:
          vertexMapAtoB.size ===
            faceA
              .volumeVertexIndices
              .length &&
          maximumMappedAddressError <=
            EPSILON,
      });
    }
  );


  /*
   * Collect quotient roots.
   *
   * Preserve canonical indices 0..45 exactly.
   */
  const membersByRoot =
    new Map();


  sourceNodeIds.forEach(
    (nodeId) => {
      const root =
        unionFind.find(
          nodeId
        );

      if (
        !membersByRoot.has(
          root
        )
      ) {
        membersByRoot.set(
          root,
          []
        );
      }

      membersByRoot
        .get(root)
        .push(
          nodeId
        );
    }
  );


  const quotientIndexByRoot =
    new Map();


  canonicalVertices.forEach(
    (vertex) => {
      const firstMemberRef =
        vertex
          .memberRefs?.[0];

      if (!firstMemberRef) {
        return;
      }


      const nodeIndex =
        originalNodeIndex(
          firstMemberRef
            .tetrahedronId,

          firstMemberRef
            .volumeVertexIndex
        );

      const root =
        unionFind.find(
          sourceNodeId(
            firstMemberRef
              .tetrahedronId,

            nodeIndex
          )
        );


      if (
        quotientIndexByRoot.has(
          root
        ) &&
        quotientIndexByRoot.get(
          root
        ) !==
          vertex
            .quotientVertexIndex
      ) {
        failures.push({
          reason:
            "canonical-original-roots-collapsed",

          quotientVertexIndex:
            vertex
              .quotientVertexIndex,

          root,
        });

        return;
      }


      quotientIndexByRoot.set(
        root,
        vertex
          .quotientVertexIndex
      );
    }
  );


  const remainingRoots =
    [
      ...membersByRoot.keys(),
    ]
      .filter(
        (root) =>
          !quotientIndexByRoot.has(
            root
          )
      )
      .sort();


  remainingRoots.forEach(
    (
      root,
      offset
    ) => {
      quotientIndexByRoot.set(
        root,

        canonicalVertices.length +
          offset
      );
    }
  );


  const quotientVertexCount =
    quotientIndexByRoot.size;


  const quotientVertices =
    Array(
      quotientVertexCount
    ).fill(null);


  const quotientIndexBySourceNodeId =
    new Map();


  function sourceNodeFromId(
    nodeId
  ) {
    const separatorIndex =
      nodeId.indexOf(":");

    const tetrahedronId =
      nodeId.slice(
        0,
        separatorIndex
      );

    const localRefinedVertexIndex =
      Number(
        nodeId.slice(
          separatorIndex + 1
        )
      );

    return (
      sourceSubdivisions[
        tetrahedronId
      ]
        .nodes[
          localRefinedVertexIndex
        ]
    );
  }


  membersByRoot.forEach(
    (
      memberIds,
      root
    ) => {
      const quotientVertexIndex =
        quotientIndexByRoot.get(
          root
        );


      const memberNodes =
        memberIds.map(
          sourceNodeFromId
        );


      const ranks = [
        ...new Set(
          memberNodes.map(
            (node) =>
              node.rank
          )
        ),
      ];


      memberIds.forEach(
        (nodeId) => {
          quotientIndexBySourceNodeId.set(
            nodeId,
            quotientVertexIndex
          );
        }
      );


      if (
        ranks.length !== 1
      ) {
        failures.push({
          reason:
            "mixed-rank-barycentric-quotient-vertex",

          quotientVertexIndex,

          ranks,
        });
      }


      const rank =
        ranks[0];


      /*
       * Original quotient vertices keep their canonical semantics.
       */
      if (
        rank === 0 &&
        quotientVertexIndex <
          canonicalVertices.length
      ) {
        const original =
          canonicalVertices[
            quotientVertexIndex
          ];


        quotientVertices[
          quotientVertexIndex
        ] = {
          ...original,

          kinds:
            Array.isArray(
              original.kinds
            )
              ? [
                  ...original.kinds,
                ]
              : original.kinds,

          memberRefs:
            Array.isArray(
              original.memberRefs
            )
              ? original
                  .memberRefs
                  .map(
                    (memberRef) => ({
                      ...memberRef,
                    })
                  )
              : [],

          barycentricAddresses:
            Array.isArray(
              original
                .barycentricAddresses
            )
              ? original
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

          hyperbolicCharts:
            Array.isArray(
              original
                .hyperbolicCharts
            )
              ? original
                  .hyperbolicCharts
                  .map(
                    (chart) => ({
                      ...chart,

                      barycentric:
                        Array.isArray(
                          chart
                            .barycentric
                        )
                          ? [
                              ...chart
                                .barycentric,
                            ]
                          : chart
                              .barycentric,

                      kleinPoint:
                        chart.kleinPoint
                          ? {
                              ...chart
                                .kleinPoint,
                            }
                          : chart
                              .kleinPoint,
                    })
                  )
              : [],

          canonicalSubdivision: {
            rank: 0,

            kind:
              "original-vertex",

            sourceSimplexMemberCount:
              memberNodes.length,
          },
        };

        return;
      }


      const cuspSamples =
        memberNodes
          .filter(
            (node) =>
              node.cuspAddress &&
              node.raw &&
              node.coordinates
          )
          .map(
            (node) => ({
              tetrahedronId:
                node
                  .tetrahedronId,

              volumeVertexIndex:
                null,

              sourceSimplexVertexIndices: [
                ...node
                  .simplexVertexIndices,
              ],

              subdivisionSimplexKey:
                node.simplexKey,

              cuspAddress:
                node.cuspAddress,

              raw:
                node.raw,

              coordinates:
                node.coordinates,
            })
          );


      let cuspConsistency =
        cuspSamples.length > 0;


      if (
        cuspSamples.length > 1
      ) {
        const reference =
          cuspSamples[0];

        cuspSamples
          .slice(1)
          .forEach(
            (sample) => {
              if (
                coordinateError(
                  reference.coordinates,
                  sample.coordinates
                ) >
                EPSILON
              ) {
                cuspConsistency =
                  false;
              }
            }
          );
      }


      const barycentricAddresses =
        memberNodes.map(
          (node) => ({
            tetrahedronId:
              node
                .tetrahedronId,

            volumeVertexIndex:
              null,

            sourceSimplexVertexIndices: [
              ...node
                .simplexVertexIndices,
            ],

            subdivisionSimplexKey:
              node.simplexKey,

            barycentric: [
              ...node.barycentric,
            ],
          })
        );


      const vertex = {
        quotientVertexIndex,

        root,

        kinds: [
          rank === 1
            ? "canonical-edge-barycenter"
            : rank === 2
              ? "canonical-face-barycenter"
              : "canonical-cell-barycenter",
        ],

        memberRefs:
          memberNodes.map(
            (node) => ({
              tetrahedronId:
                node
                  .tetrahedronId,

              rank:
                node.rank,

              sourceSimplexVertexIndices: [
                ...node
                  .simplexVertexIndices,
              ],

              subdivisionSimplexKey:
                node.simplexKey,
            })
          ),

        sourcePoint:
          memberNodes[0]
            ?.point
            ? {
                ...memberNodes[0]
                  .point,
              }
            : null,

        barycentricAddresses,

        hyperbolicCharts:
          [],

        cuspBoundary:
          cuspSamples.length >
          0,

        cuspData:
          cuspSamples.length >
          0
            ? {
                consistent:
                  cuspConsistency,

                representative:
                  cuspSamples[0],

                samples:
                  cuspSamples,
              }
            : null,

        canonicalSubdivision: {
          rank,

          kind:
            rank === 1
              ? "edge-barycenter"
              : rank === 2
                ? "face-barycenter"
                : "cell-barycenter",

          sourceSimplexMemberCount:
            memberNodes.length,
        },
      };


      vertex.hyperbolicCharts =
        canonicalHyperbolicVertexCharts(
          vertex
        );


      quotientVertices[
        quotientVertexIndex
      ] =
        vertex;


      if (
        vertex.cuspBoundary &&
        !cuspConsistency
      ) {
        failures.push({
          reason:
            "inconsistent-barycentric-subdivision-cusp-data",

          quotientVertexIndex,

          sampleCount:
            cuspSamples.length,
        });
      }
    }
  );


  const missingQuotientVertexCount =
    quotientVertices.filter(
      (vertex) =>
        !vertex
    ).length;


  if (
    missingQuotientVertexCount >
    0
  ) {
    failures.push({
      reason:
        "missing-barycentric-subdivision-quotient-vertices",

      missingQuotientVertexCount,
    });
  }


  const parentCanonicalCellIndexBySourceCellKey =
    new Map(
      canonicalCells.map(
        (
          cell,
          canonicalCellIndex
        ) => [
          `${cell.tetrahedronId}:` +
          `${cell.sourceCellId}`,

          canonicalCellIndex,
        ]
      )
    );


  /*
   * Quotient all 5,184 child tetrahedra.
   */
  const quotientCells =
    [];

  let invalidQuotientChildCellCount =
    0;


  ["A", "B"].forEach(
    (tetrahedronId) => {
      sourceSubdivisions[
        tetrahedronId
      ]
        .childCells
        .forEach(
          (childCell) => {
            const quotientVertexIndices =
              childCell
                .localRefinedVertexIndices
                .map(
                  (
                    localRefinedVertexIndex
                  ) =>
                    quotientIndexBySourceNodeId
                      .get(
                        sourceNodeId(
                          tetrahedronId,
                          localRefinedVertexIndex
                        )
                      )
                );


            const valid =
              quotientVertexIndices
                .every(
                  Number.isInteger
                ) &&
              new Set(
                quotientVertexIndices
              ).size ===
                4 &&
              childCell.valid;


            if (!valid) {
              invalidQuotientChildCellCount +=
                1;
            }


            quotientCells.push({
              quotientCellIndex:
                quotientCells.length,

              tetrahedronId,

              sourceCellId:
                childCell
                  .sourceCellId,

              sourceBoundaryFaceId:
                childCell
                  .sourceBoundaryFaceId,

              sourceBoundaryKind:
                childCell
                  .sourceBoundaryKind,

              parentCanonicalCellIndex:
                parentCanonicalCellIndexBySourceCellKey
                  .get(
                    `${tetrahedronId}:` +
                    `${childCell.sourceCellId}`
                  ) ??
                null,

              barycentricPermutation: [
                ...childCell
                  .barycentricPermutation,
              ],

              barycentricPermutationIndex:
                childCell
                  .barycentricPermutationIndex,

              sourceRefinedVertexIndices: [
                ...childCell
                  .localRefinedVertexIndices,
              ],

              quotientVertexIndices,

              referenceVolume:
                childCell
                  .referenceVolume,

              expectedReferenceVolume:
                childCell
                  .expectedReferenceVolume,

              valid,

              canonicalSubdivision:
                true,
            });
          }
        );
    }
  );


  /*
   * One barycentric subdivision should now give a genuine simplicial
   * complex: child faces are uniquely determined by refined vertices.
   */
  const quotientEdgeMap =
    new Map();

  const quotientFaceIncidences =
    new Map();


  quotientCells.forEach(
    (
      cell,
      cellIndex
    ) => {
      const vertices =
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
              vertices[first],
              vertices[second]
            );

          const high =
            Math.max(
              vertices[first],
              vertices[second]
            );

          const key =
            `${low}:${high}`;


          if (
            !quotientEdgeMap.has(
              key
            )
          ) {
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


      for (
        let omitted = 0;
        omitted < 4;
        omitted += 1
      ) {
        const faceVertices =
          vertices.filter(
            (
              _,
              index
            ) =>
              index !== omitted
          );

        const key =
          faceVertices
            .slice()
            .sort(
              (a, b) =>
                a - b
            )
            .join(":");


        if (
          !quotientFaceIncidences
            .has(
              key
            )
        ) {
          quotientFaceIncidences.set(
            key,
            []
          );
        }


        quotientFaceIncidences
          .get(key)
          .push({
            cellIndex,

            omitted,

            faceVertices,
          });
      }
    }
  );


  const boundaryEdgeKeys =
    new Set();

  let boundaryFaceCount =
    0;

  let interiorFaceCount =
    0;

  let nonManifoldFaceCount =
    0;

  let boundaryFaceWithNonBoundaryVertexCount =
    0;


  quotientFaceIncidences.forEach(
    (incidences) => {
      if (
        incidences.length === 1
      ) {
        boundaryFaceCount +=
          1;


        const faceVertices =
          incidences[0]
            .faceVertices;


        if (
          faceVertices.some(
            (vertexIndex) =>
              !quotientVertices[
                vertexIndex
              ]?.cuspBoundary
          )
        ) {
          boundaryFaceWithNonBoundaryVertexCount +=
            1;
        }


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
            const low =
              Math.min(
                faceVertices[first],
                faceVertices[second]
              );

            const high =
              Math.max(
                faceVertices[first],
                faceVertices[second]
              );

            boundaryEdgeKeys.add(
              `${low}:${high}`
            );
          }
        }

        return;
      }


      if (
        incidences.length === 2
      ) {
        interiorFaceCount +=
          1;

        return;
      }


      nonManifoldFaceCount +=
        1;
    }
  );


  /*
   * Direct orientability / connectedness audit.
   */
  const orientationConstraintsByCell =
    Array.from(
      {
        length:
          quotientCells.length,
      },
      () => []
    );


  quotientFaceIncidences.forEach(
    (incidences) => {
      if (
        incidences.length !== 2
      ) {
        return;
      }


      const [
        first,
        second,
      ] = incidences;


      const firstFaceSign =
        (
          first.omitted % 2 ===
          0
            ? 1
            : -1
        ) *
        permutationParityToSorted(
          first.faceVertices
        );


      const secondFaceSign =
        (
          second.omitted % 2 ===
          0
            ? 1
            : -1
        ) *
        permutationParityToSorted(
          second.faceVertices
        );


      const relativeSign =
        -firstFaceSign *
        secondFaceSign;


      orientationConstraintsByCell[
        first.cellIndex
      ].push({
        otherCellIndex:
          second.cellIndex,

        relativeSign,
      });


      orientationConstraintsByCell[
        second.cellIndex
      ].push({
        otherCellIndex:
          first.cellIndex,

        relativeSign,
      });
    }
  );


  const orientationSigns =
    Array(
      quotientCells.length
    ).fill(0);


  let connectedCellComponentCount =
    0;

  let orientationConflictCount =
    0;


  for (
    let seed = 0;
    seed < quotientCells.length;
    seed += 1
  ) {
    if (
      orientationSigns[seed] !==
      0
    ) {
      continue;
    }


    connectedCellComponentCount +=
      1;

    orientationSigns[seed] =
      1;

    const stack = [
      seed,
    ];


    while (
      stack.length > 0
    ) {
      const cellIndex =
        stack.pop();


      orientationConstraintsByCell[
        cellIndex
      ].forEach(
        (constraint) => {
          const requiredSign =
            orientationSigns[
              cellIndex
            ] *
            constraint.relativeSign;


          if (
            orientationSigns[
              constraint
                .otherCellIndex
            ] === 0
          ) {
            orientationSigns[
              constraint
                .otherCellIndex
            ] =
              requiredSign;

            stack.push(
              constraint
                .otherCellIndex
            );

            return;
          }


          if (
            orientationSigns[
              constraint
                .otherCellIndex
            ] !==
            requiredSign
          ) {
            orientationConflictCount +=
              1;
          }
        }
      );
    }
  }


  const hyperbolicAtlasAudit =
    auditCanonicalHyperbolicGeometry(
      quotientVertices
    );


  const boundaryVertexCount =
    quotientVertices.filter(
      (vertex) =>
        vertex.cuspBoundary
    ).length;


  const boundaryVertexWithoutCuspSamplesCount =
    quotientVertices.filter(
      (vertex) =>
        vertex.cuspBoundary &&
        (
          vertex.cuspData
            ?.samples
            ?.length ??
          0
        ) === 0
    ).length;


  const inconsistentBoundaryVertexCount =
    quotientVertices.filter(
      (vertex) =>
        vertex.cuspBoundary &&
        !vertex.cuspData
          ?.consistent
    ).length;


  const rankCounts =
    [0, 1, 2, 3].map(
      (rank) =>
        quotientVertices.filter(
          (vertex) =>
            vertex
              .canonicalSubdivision
              ?.rank ===
            rank
        ).length
    );


  const boundaryRankCounts =
    [0, 1, 2, 3].map(
      (rank) =>
        quotientVertices.filter(
          (vertex) =>
            vertex
              .canonicalSubdivision
              ?.rank ===
              rank &&
            vertex.cuspBoundary
        ).length
    );


  const parentVertexCount =
    rankCounts[0];

  const parentEdgeCount =
    rankCounts[1];

  const parentFaceCount =
    rankCounts[2];

  const parentCellCount =
    rankCounts[3];


  const parentBoundaryVertexCount =
    boundaryRankCounts[0];

  const parentBoundaryEdgeCount =
    boundaryRankCounts[1];

  const parentBoundaryFaceCount =
    boundaryRankCounts[2];


  const parentEulerCharacteristic =
    parentVertexCount -
    parentEdgeCount +
    parentFaceCount -
    parentCellCount;


  const parentBoundaryEulerCharacteristic =
    parentBoundaryVertexCount -
    parentBoundaryEdgeCount +
    parentBoundaryFaceCount;


  const refinedEulerCharacteristic =
    quotientVertices.length -
    quotientEdgeMap.size +
    quotientFaceIncidences.size -
    quotientCells.length;


  const refinedBoundaryEulerCharacteristic =
    boundaryVertexCount -
    boundaryEdgeKeys.size +
    boundaryFaceCount;


  const maximumChildReferenceVolumeError =
    Math.max(
      sourceSubdivisions.A
        .summary
        .maximumChildReferenceVolumeError,

      sourceSubdivisions.B
        .summary
        .maximumChildReferenceVolumeError
    );


  const maximumParentVolumePartitionError =
    Math.max(
      sourceSubdivisions.A
        .summary
        .maximumParentVolumePartitionError,

      sourceSubdivisions.B
        .summary
        .maximumParentVolumePartitionError
    );


  const m004ExpectedCounts = {
    parentVertexCount:
      46,

    parentEdgeCount:
      298,

    parentFaceCount:
      468,

    parentCellCount:
      216,

    parentBoundaryVertexCount:
      36,

    parentBoundaryEdgeCount:
      108,

    parentBoundaryFaceCount:
      72,

    quotientVertexCount:
      1028,

    quotientEdgeCount:
      6428,

    quotientFaceCount:
      10584,

    quotientCellCount:
      5184,

    boundaryVertexCount:
      216,

    boundaryEdgeCount:
      648,

    boundaryFaceCount:
      432,

    interiorVertexCount:
      812,
  };


  const observedCounts = {
    parentVertexCount,

    parentEdgeCount,

    parentFaceCount,

    parentCellCount,

    parentBoundaryVertexCount,

    parentBoundaryEdgeCount,

    parentBoundaryFaceCount,

    quotientVertexCount:
      quotientVertices.length,

    quotientEdgeCount:
      quotientEdgeMap.size,

    quotientFaceCount:
      quotientFaceIncidences.size,

    quotientCellCount:
      quotientCells.length,

    boundaryVertexCount,

    boundaryEdgeCount:
      boundaryEdgeKeys.size,

    boundaryFaceCount,

    interiorVertexCount:
      quotientVertices.length -
      boundaryVertexCount,
  };


  const m004CountAudit =
    Object.entries(
      m004ExpectedCounts
    ).reduce(
      (
        audit,
        [
          key,
          expectedValue,
        ]
      ) => {
        audit[key] =
          observedCounts[key] ===
          expectedValue;

        return audit;
      },
      {}
    );


  const sourceChildCellCount =
    sourceSubdivisions.A
      .childCells
      .length +
    sourceSubdivisions.B
      .childCells
      .length;


  const sourceInvalidChildCellCount =
    sourceSubdivisions.A
      .summary
      .invalidChildCellCount +
    sourceSubdivisions.B
      .summary
      .invalidChildCellCount;


  const valid =
    failures.length === 0 &&
    originalMemberRefCount ===
      114 &&
    faceGluingDiagnostics.length ===
      4 &&
    faceGluingDiagnostics.every(
      (diagnostic) =>
        diagnostic.valid
    ) &&
    missingQuotientVertexCount ===
      0 &&
    sourceChildCellCount ===
      5184 &&
    sourceInvalidChildCellCount ===
      0 &&
    invalidQuotientChildCellCount ===
      0 &&
    nonManifoldFaceCount ===
      0 &&
    boundaryFaceWithNonBoundaryVertexCount ===
      0 &&
    boundaryVertexWithoutCuspSamplesCount ===
      0 &&
    inconsistentBoundaryVertexCount ===
      0 &&
    connectedCellComponentCount ===
      1 &&
    orientationConflictCount ===
      0 &&
    hyperbolicAtlasAudit.valid &&
    parentEulerCharacteristic ===
      0 &&
    parentBoundaryEulerCharacteristic ===
      0 &&
    refinedEulerCharacteristic ===
      0 &&
    refinedBoundaryEulerCharacteristic ===
      0 &&
    maximumChildReferenceVolumeError <=
      EPSILON &&
    maximumParentVolumePartitionError <=
      EPSILON &&
    Object.values(
      m004CountAudit
    ).every(Boolean);


  if (!valid) {
    failures.push({
      reason:
        "canonical-barycentric-subdivision-audit-failed",
    });
  }


  return {
    valid,

    failures,

    quotientVertices,

    quotientCells,

    quotientEdges: [
      ...quotientEdgeMap
        .values(),
    ],

    sourceSubdivisions,

    faceGluingDiagnostics,

    hyperbolicGeometry: {
      inheritedFromCanonicalCore:
        true,

      atlasAudit:
        hyperbolicAtlasAudit,
    },

    topologyAudit: {
      connected:
        connectedCellComponentCount ===
        1,

      orientable:
        orientationConflictCount ===
        0,

      connectedCellComponentCount,

      orientationConflictCount,

      nonManifoldFaceCount,

      boundaryFaceWithNonBoundaryVertexCount,

      parentEulerCharacteristic,

      parentBoundaryEulerCharacteristic,

      refinedEulerCharacteristic,

      refinedBoundaryEulerCharacteristic,
    },

    boundaryAudit: {
      boundaryVertexCount,

      boundaryEdgeCount:
        boundaryEdgeKeys.size,

      boundaryFaceCount,

      boundaryVertexWithoutCuspSamplesCount,

      inconsistentBoundaryVertexCount,
    },

    volumePartitionAudit: {
      maximumChildReferenceVolumeError,

      maximumParentVolumePartitionError,
    },

    m004ExpectedCounts,

    observedCounts,

    m004CountAudit,

    summary: {
      parentVertexCount,

      parentEdgeCount,

      parentFaceCount,

      parentCellCount,

      parentBoundaryVertexCount,

      parentBoundaryEdgeCount,

      parentBoundaryFaceCount,

      quotientVertexCount:
        quotientVertices.length,

      quotientEdgeCount:
        quotientEdgeMap.size,

      quotientFaceCount:
        quotientFaceIncidences.size,

      quotientCellCount:
        quotientCells.length,

      cuspBoundaryQuotientVertexCount:
        boundaryVertexCount,

      interiorQuotientVertexCount:
        quotientVertices.length -
        boundaryVertexCount,

      boundaryEdgeCount:
        boundaryEdgeKeys.size,

      boundaryFaceCount,

      connectedCellComponentCount,

      orientable:
        orientationConflictCount ===
        0,

      orientationConflictCount,

      nonManifoldFaceCount,

      invalidChildCellCount:
        invalidQuotientChildCellCount,

      boundaryVertexWithoutCuspSamplesCount,

      inconsistentBoundaryVertexCount,

      hyperbolicAtlasValid:
        hyperbolicAtlasAudit.valid,

      hyperbolicLocalChartCount:
        hyperbolicAtlasAudit
          .summary
          .localChartCount,

      maximumBarycentricSumError:
        hyperbolicAtlasAudit
          .summary
          .maximumBarycentricSumError,

      maximumChildReferenceVolumeError,

      maximumParentVolumePartitionError,

      parentEulerCharacteristic,

      parentBoundaryEulerCharacteristic,

      refinedEulerCharacteristic,

      refinedBoundaryEulerCharacteristic,

      syntheticVertexCount:
        0,

      syntheticCellCount:
        0,
    },
  };
}
