import {
  createIntrinsicSharedFaceExperimentMesh,
} from "./intrinsicVolumeMesh";
import {
  createIntrinsicS3InitialSolverState,
} from "./intrinsicS3VolumeSolver";


function experimentBoundaryTargets(
  boundaryTargets,
  quotientMesh
) {
  const interiorUnknownVertexIndices =
    quotientMesh
      .quotientVertices
      .filter(
        (vertex) =>
          !vertex.cuspBoundary
      )
      .map(
        (vertex) =>
          vertex
            .quotientVertexIndex
      );


  const boundaryTargetCount =
    boundaryTargets
      ?.targets
      ?.length ??
    0;


  const expectedBoundaryTargetCount =
    quotientMesh
      .summary
      ?.cuspBoundaryQuotientVertexCount ??
    boundaryTargetCount;


  return {
    ...boundaryTargets,

    valid:
      Boolean(
        boundaryTargets
          ?.valid
      ) &&
      boundaryTargetCount ===
        expectedBoundaryTargetCount,

    interiorUnknownVertexIndices,

    summary: {
      ...boundaryTargets
        ?.summary,

      quotientVertexCount:
        quotientMesh
          .quotientVertices
          .length,

      boundaryTargetCount,

      expectedBoundaryTargetCount,

      interiorUnknownVertexCount:
        interiorUnknownVertexIndices
          .length,

      expectedInteriorUnknownVertexCount:
        interiorUnknownVertexIndices
          .length,
    },
  };
}


function sharedEdgeLineage(
  sourceCellId
) {
  const matches =
    [...String(
      sourceCellId ??
      ""
    ).matchAll(
      /-shared-edge-(\d+)-(\d+)-(low|high)/g
    )];


  const steps =
    matches.map(
      (match) => ({
        edgeIndex:
          Number(match[1]),

        serial:
          Number(match[2]),

        side:
          match[3],
      })
    );


  const highCount =
    steps.filter(
      (step) =>
        step.side ===
        "high"
    ).length;


  return {
    splitDepth:
      steps.length,

    path:
      steps
        .map(
          (step) =>
            step.side
        )
        .join(">"),

    finalSide:
      steps.length > 0
        ? steps[
            steps.length - 1
          ].side
        : null,

    lowCount:
      steps.length -
      highCount,

    highCount,

    highParity:
      highCount % 2,

    edgeIndices:
      steps.map(
        (step) =>
          step.edgeIndex
      ),

    serials:
      steps.map(
        (step) =>
          step.serial
      ),
  };
}


function compactMismatchCellDiagnostics(
  solverState,
  quotientMesh
) {
  const mismatchCellIndices =
    solverState
      .orientationAudit
      ?.orientationMismatchCellIndices ??
    [];

  const correctedOrientationByCell =
    solverState
      .orientationAudit
      ?.correctedOrientationByCell ??
    [];

  const cellStateCells =
    solverState
      .cellState
      ?.cells ??
    [];

  const quotientCells =
    quotientMesh
      ?.quotientCells ??
    [];


  return mismatchCellIndices.map(
    (cellIndex) => {
      const cell =
        quotientCells[
          cellIndex
        ] ??
        {};

      const cellState =
        cellStateCells[
          cellIndex
        ] ??
        {};

      const lineage =
        sharedEdgeLineage(
          cell.sourceCellId
        );


      return {
        cellIndex,

        tetrahedronId:
          cell.tetrahedronId ??
          cellState.tetrahedronId ??
          null,

        sourceBoundaryKind:
          cell.sourceBoundaryKind ??
          null,

        syntheticCellKind:
          cell.syntheticCellKind ??
          null,

        materialOrderingParity:
          Number.isInteger(
            cell.materialOrderingParity
          )
            ? cell.materialOrderingParity
            : null,

        materialOrderingVertexIndices:
          Array.isArray(
            cell.materialOrderingVertexIndices
          )
            ? [
                ...cell
                  .materialOrderingVertexIndices,
              ]
            : null,

        sourceBoundaryFaceId:
          cell.sourceBoundaryFaceId ??
          null,

        sourceCellId:
          cell.sourceCellId ??
          cellState.sourceCellId ??
          null,

        orientation:
          cellState.orientation ??
          null,

        correctedOrientation:
          correctedOrientationByCell[
            cellIndex
          ] ??
          null,

        determinant:
          cellState.determinant ??
          null,

        sharedEdgeExperimentIndex:
          cell.sharedEdgeExperimentIndex ??
          null,

        sharedEdgeBarycentricVertexIndex:
          cell.sharedEdgeBarycentricVertexIndex ??
          null,

        sharedEdgeSourceEndpointVertexIndices:
          Array.isArray(
            cell
              .sharedEdgeSourceEndpointVertexIndices
          )
            ? [
                ...cell
                  .sharedEdgeSourceEndpointVertexIndices,
              ]
            : null,

        quotientVertexIndices:
          Array.isArray(
            cell.quotientVertexIndices
          )
            ? [
                ...cell
                  .quotientVertexIndices,
              ]
            : null,

        sharedEdgeSplitDepth:
          lineage.splitDepth,

        sharedEdgePath:
          lineage.path,

        sharedEdgeFinalSide:
          lineage.finalSide,

        sharedEdgeLowCount:
          lineage.lowCount,

        sharedEdgeHighCount:
          lineage.highCount,

        sharedEdgeHighParity:
          lineage.highParity,

        sharedEdgeLineageEdgeIndices:
          lineage.edgeIndices,

        sharedEdgeLineageSerials:
          lineage.serials,
      };
    }
  );
}


function compactVertexProvenance(
  quotientMesh,
  vertexIndex
) {
  const vertex =
    quotientMesh
      ?.quotientVertices
      ?.[vertexIndex] ??
    null;


  if (!vertex) {
    return {
      vertexIndex,
      semanticClass:
        "missing",
      root:
        null,
      kinds: [],
      cuspBoundary:
        false,
      cuspCollar:
        false,
      cuspTransition:
        false,
      cuspTransition2:
        false,
      cuspCoreBarycentric:
        false,
      cuspCoreSharedFaceBarycentric:
        false,
      cuspCoreSharedEdgeBarycentric:
        false,
    };
  }


  const kinds =
    Array.isArray(vertex.kinds)
      ? [...vertex.kinds]
      : [];


  const semanticClass =
    vertex
      .cuspCoreSharedEdgeBarycentric
      ? "cusp-core-shared-edge-barycentric"
      : vertex
          .cuspCoreSharedFaceBarycentric
        ? "cusp-core-shared-face-barycentric"
        : vertex
            .cuspCoreBarycentric
          ? "cusp-core-barycentric"
          : vertex
              .cuspTransition2
            ? "cusp-transition-2"
            : vertex
                .cuspTransition
              ? "cusp-transition"
              : vertex
                  .cuspCollar
                ? "cusp-collar"
                : vertex
                    .cuspBoundary
                  ? "cusp-boundary"
                  : kinds.length > 0
                    ? kinds.join("|")
                    : "ordinary-core";


  return {
    vertexIndex,

    semanticClass,

    root:
      (
        typeof vertex.root ===
          "string" ||
        typeof vertex.root ===
          "number"
      )
        ? vertex.root
        : null,

    kinds,

    cuspBoundary:
      vertex.cuspBoundary ===
      true,

    cuspCollar:
      vertex.cuspCollar ===
      true,

    cuspTransition:
      vertex.cuspTransition ===
      true,

    cuspTransition2:
      vertex.cuspTransition2 ===
      true,

    cuspCoreBarycentric:
      vertex.cuspCoreBarycentric ===
      true,

    cuspCoreSharedFaceBarycentric:
      vertex
        .cuspCoreSharedFaceBarycentric ===
      true,

    cuspCoreSharedEdgeBarycentric:
      vertex
        .cuspCoreSharedEdgeBarycentric ===
      true,

    memberRefCount:
      Array.isArray(vertex.memberRefs)
        ? vertex.memberRefs.length
        : 0,

    barycentricAddressCount:
      Array.isArray(
        vertex.barycentricAddresses
      )
        ? vertex
            .barycentricAddresses
            .length
        : 0,
  };
}


function compactBridgeParitySummary(
  solverState,
  quotientMesh
) {
  const mismatchSet =
    new Set(
      solverState
        .orientationAudit
        ?.orientationMismatchCellIndices ??
      []
    );

  const bridgeRows =
    (
      quotientMesh
        ?.quotientCells ??
      []
    )
      .map(
        (cell, cellIndex) => {
          const lineage =
            sharedEdgeLineage(
              cell.sourceCellId
            );

          return {
            cellIndex,

            mismatch:
              mismatchSet.has(
                cellIndex
              ),

            tetrahedronId:
              cell.tetrahedronId ??
              "unknown",

            finalSide:
              lineage.finalSide ??
              "unsplit",

            highParity:
              lineage.highParity,

            splitDepth:
              lineage.splitDepth,

            materialOrderingParity:
              Number.isInteger(
                cell.materialOrderingParity
              )
                ? cell.materialOrderingParity
                : null,

            edgeIndex:
              Number.isInteger(
                cell
                  .sharedEdgeExperimentIndex
              )
                ? cell
                    .sharedEdgeExperimentIndex
                : null,

            edgeEndpointVertexIndices:
              Array.isArray(
                cell
                  .sharedEdgeSourceEndpointVertexIndices
              )
                ? [
                    ...cell
                      .sharedEdgeSourceEndpointVertexIndices,
                  ]
                : [],
          };
        }
      )
      .filter(
        (row) =>
          quotientMesh
            .quotientCells[
              row.cellIndex
            ]
            ?.syntheticCellKind ===
          "refined-cusp-core-barycentric-bridge"
      );


  const summarize =
    (keyFunction) => {
      const groups =
        new Map();

      bridgeRows.forEach(
        (row) => {
          const key =
            keyFunction(row);

          const group =
            groups.get(key) ??
            {
              group: key,
              cellCount: 0,
              mismatchCount: 0,
            };

          group.cellCount +=
            1;

          if (row.mismatch) {
            group.mismatchCount +=
              1;
          }

          groups.set(
            key,
            group
          );
        }
      );


      return [
        ...groups.values(),
      ]
        .map(
          (group) => ({
            ...group,

            mismatchFraction:
              group.cellCount > 0
                ? group.mismatchCount /
                  group.cellCount
                : 0,
          })
        )
        .sort(
          (first, second) =>
            String(first.group)
              .localeCompare(
                String(second.group),
                undefined,
                { numeric: true }
              )
        );
    };


  const targetVertexIndices =
    [40, 45];


  const targetVertexRows =
    bridgeRows.flatMap(
      (row) =>
        targetVertexIndices
          .filter(
            (vertexIndex) =>
              row
                .edgeEndpointVertexIndices
                .includes(
                  vertexIndex
                )
          )
          .map(
            (targetVertexIndex) => ({
              ...row,
              targetVertexIndex,
            })
          )
    );


  /*
   * Full denominator for every CURRENT shared edge,
   * separated by tetrahedron and final low/high child.
   */
  const currentEdgeSummary =
    (() => {
      const groups =
        new Map();


      bridgeRows.forEach(
        (row) => {
          if (
            !Number.isInteger(
              row.edgeIndex
            ) ||
            row
              .edgeEndpointVertexIndices
              .length !== 2
          ) {
            return;
          }


          const [low, high] =
            row
              .edgeEndpointVertexIndices;

          const key =
            `${row.tetrahedronId}:` +
            `${row.finalSide}:` +
            `${row.edgeIndex}`;

          const group =
            groups.get(key) ??
            {
              tetrahedronId:
                row.tetrahedronId,

              finalSide:
                row.finalSide,

              edgeIndex:
                row.edgeIndex,

              low,
              high,

              cellCount: 0,
              mismatchCount: 0,
            };


          group.cellCount +=
            1;

          if (row.mismatch) {
            group.mismatchCount +=
              1;
          }

          groups.set(
            key,
            group
          );
        }
      );


      return [
        ...groups.values(),
      ]
        .map(
          (group) => ({
            ...group,

            lowVertex:
              compactVertexProvenance(
                quotientMesh,
                group.low
              ),

            highVertex:
              compactVertexProvenance(
                quotientMesh,
                group.high
              ),

            mismatchFraction:
              group.cellCount > 0
                ? group.mismatchCount /
                  group.cellCount
                : 0,
          })
        )
        .sort(
          (first, second) =>
            second.mismatchFraction -
              first.mismatchFraction ||
            second.mismatchCount -
              first.mismatchCount ||
            first.edgeIndex -
              second.edgeIndex
        );
    })();


  /*
   * The direct star comparison:
   *
   *   vertex 40 / vertex 45
   *       ×
   *   tetrahedron A / B
   *       ×
   *   low / high child
   *
   * These cellCount values are the missing denominators.
   */
  const targetVertexSummary =
    targetVertexIndices.flatMap(
      (targetVertexIndex) =>
        ["A", "B"].flatMap(
          (tetrahedronId) =>
            ["low", "high"].map(
              (finalSide) => {
                const rows =
                  targetVertexRows.filter(
                    (row) =>
                      row.targetVertexIndex ===
                        targetVertexIndex &&
                      row.tetrahedronId ===
                        tetrahedronId &&
                      row.finalSide ===
                        finalSide
                  );

                const mismatchCount =
                  rows.filter(
                    (row) =>
                      row.mismatch
                  ).length;

                return {
                  targetVertexIndex,
                  tetrahedronId,
                  finalSide,

                  affectedEdgeCount:
                    new Set(
                      rows.map(
                        (row) =>
                          row.edgeIndex
                      )
                    ).size,

                  cellCount:
                    rows.length,

                  mismatchCount,

                  mismatchFraction:
                    rows.length > 0
                      ? mismatchCount /
                        rows.length
                      : 0,
                };
              }
            )
        )
    );


  /*
   * Direct test of the material-ordering hypothesis.
   *
   * For each target star, tetrahedron side, and final split side,
   * separate cells by the parity of the permutation that sorts the
   * originating refined material triangle.
   */
  const targetVertexMaterialOrderingSummary =
    targetVertexIndices.flatMap(
      (targetVertexIndex) =>
        ["A", "B"].flatMap(
          (tetrahedronId) =>
            ["low", "high"].flatMap(
              (finalSide) =>
                [-1, 1].map(
                  (materialOrderingParity) => {
                    const rows =
                      targetVertexRows.filter(
                        (row) =>
                          row.targetVertexIndex ===
                            targetVertexIndex &&
                          row.tetrahedronId ===
                            tetrahedronId &&
                          row.finalSide ===
                            finalSide &&
                          row.materialOrderingParity ===
                            materialOrderingParity
                      );

                    const mismatchCount =
                      rows.filter(
                        (row) =>
                          row.mismatch
                      ).length;

                    return {
                      targetVertexIndex,
                      tetrahedronId,
                      finalSide,
                      materialOrderingParity,

                      affectedEdgeCount:
                        new Set(
                          rows.map(
                            (row) =>
                              row.edgeIndex
                          )
                        ).size,

                      cellCount:
                        rows.length,

                      mismatchCount,

                      mismatchFraction:
                        rows.length > 0
                          ? mismatchCount /
                            rows.length
                          : 0,
                    };
                  }
                )
            )
        )
    )
      .filter(
        (row) =>
          row.cellCount > 0
      );


  /*
   * Same denominator information edge-by-edge, restricted
   * to the two target stars.
   */
  const targetVertexEdgeSummary =
    currentEdgeSummary
      .filter(
        (row) =>
          targetVertexIndices
            .includes(row.low) ||
          targetVertexIndices
            .includes(row.high)
      )
      .map(
        (row) => {
          const targetVertexIndex =
            targetVertexIndices
              .find(
                (vertexIndex) =>
                  vertexIndex ===
                    row.low ||
                  vertexIndex ===
                    row.high
              ) ??
            null;

          const otherVertexIndex =
            targetVertexIndex ===
              row.low
              ? row.high
              : targetVertexIndex ===
                  row.high
                ? row.low
                : null;

          const targetVertex =
            compactVertexProvenance(
              quotientMesh,
              targetVertexIndex
            );

          const otherVertex =
            compactVertexProvenance(
              quotientMesh,
              otherVertexIndex
            );


          return {
            targetVertexIndex,

            targetVertexClass:
              targetVertex
                .semanticClass,

            targetVertexRoot:
              targetVertex.root,

            otherVertexIndex,

            otherVertexClass:
              otherVertex
                .semanticClass,

            otherVertexRoot:
              otherVertex.root,

            otherVertexKinds:
              otherVertex.kinds,

            otherVertexCuspBoundary:
              otherVertex
                .cuspBoundary,

            otherVertexCuspCollar:
              otherVertex
                .cuspCollar,

            otherVertexCuspTransition:
              otherVertex
                .cuspTransition,

            otherVertexCuspTransition2:
              otherVertex
                .cuspTransition2,

            otherVertexCuspCoreBarycentric:
              otherVertex
                .cuspCoreBarycentric,

            otherVertexCuspCoreSharedFaceBarycentric:
              otherVertex
                .cuspCoreSharedFaceBarycentric,

            otherVertexCuspCoreSharedEdgeBarycentric:
              otherVertex
                .cuspCoreSharedEdgeBarycentric,

            ...row,
          };
        }
      );


  const edgeOutcomeClass =
    (row) =>
      row.mismatchCount === 0
        ? "0%-mismatched"
        : row.mismatchCount ===
            row.cellCount
          ? "100%-mismatched"
          : "partial";


  const summarizeTargetEndpointRows =
    (keyFunction) => {
      const groups =
        new Map();


      targetVertexEdgeSummary
        .forEach(
          (row) => {
            const keyData =
              keyFunction(row);

            const key =
              JSON.stringify(
                keyData
              );

            const group =
              groups.get(key) ??
              {
                ...keyData,

                edgeCount: 0,
                cellCount: 0,
                mismatchCount: 0,
              };


            group.edgeCount +=
              1;

            group.cellCount +=
              row.cellCount;

            group.mismatchCount +=
              row.mismatchCount;

            groups.set(
              key,
              group
            );
          }
        );


      return [
        ...groups.values(),
      ]
        .map(
          (group) => ({
            ...group,

            mismatchFraction:
              group.cellCount > 0
                ? group.mismatchCount /
                  group.cellCount
                : 0,
          })
        )
        .sort(
          (first, second) =>
            second.mismatchFraction -
              first.mismatchFraction ||
            second.mismatchCount -
              first.mismatchCount ||
            second.edgeCount -
              first.edgeCount
        );
    };


  const targetVertexEndpointClassSummary =
    summarizeTargetEndpointRows(
      (row) => ({
        targetVertexIndex:
          row.targetVertexIndex,

        tetrahedronId:
          row.tetrahedronId,

        finalSide:
          row.finalSide,

        otherVertexClass:
          row.otherVertexClass,
      })
    );


  const targetVertexEndpointOutcomeSummary =
    summarizeTargetEndpointRows(
      (row) => ({
        targetVertexIndex:
          row.targetVertexIndex,

        tetrahedronId:
          row.tetrahedronId,

        finalSide:
          row.finalSide,

        edgeOutcome:
          edgeOutcomeClass(row),

        otherVertexClass:
          row.otherVertexClass,
      })
    );


  const targetVertexEndpointRootSummary =
    summarizeTargetEndpointRows(
      (row) => ({
        targetVertexIndex:
          row.targetVertexIndex,

        tetrahedronId:
          row.tetrahedronId,

        finalSide:
          row.finalSide,

        edgeOutcome:
          edgeOutcomeClass(row),

        otherVertexClass:
          row.otherVertexClass,

        otherVertexRoot:
          row.otherVertexRoot ??
          "null",
      })
    );


  return {
    bridgeCellCount:
      bridgeRows.length,

    bridgeMismatchCount:
      bridgeRows.filter(
        (row) =>
          row.mismatch
      ).length,

    byTetrahedron:
      summarize(
        (row) =>
          row.tetrahedronId
      ),

    byFinalSide:
      summarize(
        (row) =>
          row.finalSide
      ),

    byHighParity:
      summarize(
        (row) =>
          String(row.highParity)
      ),

    byMaterialOrderingParity:
      summarize(
        (row) =>
          String(
            row.materialOrderingParity
          )
      ),

    bySplitDepth:
      summarize(
        (row) =>
          String(row.splitDepth)
      ),

    byTetrahedronAndFinalSide:
      summarize(
        (row) =>
          `${row.tetrahedronId}:` +
          `${row.finalSide}`
      ),

    byTetrahedronAndHighParity:
      summarize(
        (row) =>
          `${row.tetrahedronId}:` +
          `${row.highParity}`
      ),

    targetVertexIndices,

    targetVertexSummary,

    targetVertexMaterialOrderingSummary,

    targetVertexEdgeSummary,

    targetVertexEndpointClassSummary,

    targetVertexEndpointOutcomeSummary,

    targetVertexEndpointRootSummary,

    currentEdgeSummary,
  };
}


function compactSolverResult(
  solverState,
  quotientMesh
) {
  return {
    ready:
      solverState.ready,

    method:
      solverState.method,

    summary:
      solverState.summary,

    failures:
      solverState.failures,

    boundaryOrientationTopology:
      solverState
        .boundaryOrientationTopology,

    initializationCandidates:
      solverState
        .initializationCandidates,

    projectiveTransitionSurface:
      solverState
        .projectiveTransitionSurface,

    orientationAuditSummary:
      solverState
        .orientationAudit
        ?.summary ??
      null,

    cellStateSummary:
      solverState
        .cellState
        ?.summary ??
      null,

    orientationMismatchCells:
      compactMismatchCellDiagnostics(
        solverState,
        quotientMesh
      ),

    bridgeParitySummary:
      compactBridgeParitySummary(
        solverState,
        quotientMesh
      ),
  };
}


function sharedEdgeExperimentMesh(
  baselineQuotientMesh
) {
  const sharedFaceMesh =
    createIntrinsicSharedFaceExperimentMesh({
      quotientMesh:
        baselineQuotientMesh,
    });


  if (!sharedFaceMesh.valid) {
    return {
      ...sharedFaceMesh,

      sharedEdgeExperiment: {
        valid: false,
        failures:
          sharedFaceMesh.failures ??
          [],
        summary: {
          sharedEdgeExperimentApplied:
            false,
          reason:
            "shared-face-prerequisite-failed",
        },
      },
    };
  }


  const failures = [];
  const quotientVertices =
    sharedFaceMesh
      .quotientVertices
      .map(
        (vertex) => ({
          ...vertex,
        })
      );

  const selectedEdgeMap =
    new Map();

  const pairKey =
    (first, second) =>
      first < second
        ? `${first}:${second}`
        : `${second}:${first}`;


  (
    sharedFaceMesh
      .sharedFaceExperiment
      ?.sharedFaceGroups ??
    []
  ).forEach(
    (group) => {
      const [a, b, c] =
        group.faceVertexIndices ??
        [];

      if (
        ![a, b, c].every(
          Number.isInteger
        )
      ) {
        failures.push({
          reason:
            "invalid-shared-edge-source-face",
          group,
        });
        return;
      }

      [
        [a, b],
        [b, c],
        [c, a],
      ].forEach(
        ([first, second]) => {
          const low =
            Math.min(first, second);
          const high =
            Math.max(first, second);
          const key =
            pairKey(low, high);

          if (!selectedEdgeMap.has(key)) {
            selectedEdgeMap.set(
              key,
              {
                key,
                low,
                high,
              }
            );
          }
        }
      );
    }
  );


  const selectedEdges =
    [...selectedEdgeMap.values()]
      .sort(
        (first, second) =>
          first.low - second.low ||
          first.high - second.high
      );


  selectedEdges.forEach(
    (edge, edgeIndex) => {
      const first =
        quotientVertices[edge.low]
          ?.sourcePoint;
      const second =
        quotientVertices[edge.high]
          ?.sourcePoint;

      const sourcePoint =
        first && second
          ? {
              x:
                0.5 *
                (first.x + second.x),
              y:
                0.5 *
                (first.y + second.y),
              z:
                0.5 *
                (first.z + second.z),
            }
          : null;

      if (
        !sourcePoint ||
        !Number.isFinite(sourcePoint.x) ||
        !Number.isFinite(sourcePoint.y) ||
        !Number.isFinite(sourcePoint.z)
      ) {
        failures.push({
          reason:
            "missing-shared-edge-source-point",
          edgeIndex,
          edgeKey:
            edge.key,
        });
      }

      edge.edgeIndex =
        edgeIndex;
      edge.midpointVertexIndex =
        quotientVertices.length;

      quotientVertices.push({
        quotientVertexIndex:
          edge.midpointVertexIndex,
        root:
          `core-shared-edge:${edgeIndex}`,
        kinds: [
          "cusp-core-shared-edge-barycentric",
        ],
        memberRefs: [],
        sourcePoint,
        barycentricAddresses: [],
        cuspBoundary: false,
        cuspData: null,
        cuspCollar: false,
        cuspTransition: false,
        cuspTransition2: false,
        cuspCoreBarycentric: false,
        cuspCoreSharedFaceBarycentric:
          false,
        cuspCoreSharedEdgeBarycentric:
          true,
        cuspCoreSharedEdgeData: {
          edgeIndex,
          edgeKey:
            edge.key,
          endpointVertexIndices: [
            edge.low,
            edge.high,
          ],
        },
      });
    }
  );


  const normalizeSharedEdgeMappingIndex =
    (value) =>
      (
        (
          (
            Number.isFinite(value)
              ? Math.round(value)
              : 0
          ) %
            3
        ) +
        3
      ) %
      3;


  const sharedEdgeSourceInternalFaceKey =
    (
      tetrahedronId,
      sourceVertexIndices
    ) =>
      `internal:${tetrahedronId}:` +
      sourceVertexIndices
        .slice()
        .sort(
          (first, second) =>
            first - second
        )
        .join(":");


  const sharedEdgeLargeBoundaryFaceKey =
    (cell) => {
      const faceMatch =
        /-large-(\d+)$/.exec(
          cell.sourceBoundaryFaceId ??
          ""
        );

      const cellMatch =
        /-intrinsic-cell-(\d+)$/.exec(
          cell.sourceCellId ??
          ""
        );


      if (
        !faceMatch ||
        !cellMatch
      ) {
        return null;
      }


      const pairId =
        Number(faceMatch[1]);

      const cellIndex =
        Number(cellMatch[1]);

      /*
       * Four large faces are constructed first.
       * Each large hexagonal face contributes six fan
       * tetrahedra.
       */
      const localHexagonEdgeIndex =
        cellIndex -
        18 * pairId;


      if (
        !Number.isInteger(pairId) ||
        !Number.isInteger(cellIndex) ||
        localHexagonEdgeIndex < 0 ||
        localHexagonEdgeIndex >= 18
      ) {
        return null;
      }


      /*
       * Mapping indices 0,1,2 rotate the B hexagon by
       * 0,2,4 perimeter edges respectively.
       */
      const mappingIndex =
        normalizeSharedEdgeMappingIndex(
          sharedFaceMesh
            .pairDiagnostics
            ?.find(
              (item) =>
                item.pairId ===
                pairId
            )
            ?.mappingIndex ??
          0
        );

      const hexagonShift =
        6 * mappingIndex;


      /*
       * Reduce both A and B boundary-triangle occurrences to
       * the corresponding A-side occurrence.
       *
       * This preserves Δ-complex face multiplicity even when
       * multiple abstract faces have identical quotient
       * vertex triples.
       */
      const canonicalEdgeIndex =
        cell.tetrahedronId ===
          "B"
          ? (
              (
                localHexagonEdgeIndex -
                hexagonShift
              ) %
                18 +
              18
            ) %
              18
          : localHexagonEdgeIndex;


      return (
        `shared-edge-large-face:` +
        `${pairId}:` +
        `${canonicalEdgeIndex}`
      );
    };


  const inheritedSharedEdgeFaceKey =
    (
      cell,
      localFaceIndex
    ) => {
      const sourceVertexIndices =
        cell.sourceVolumeVertexIndices;


      if (
        !Array.isArray(
          sourceVertexIndices
        ) ||
        sourceVertexIndices.length !==
          4
      ) {
        return null;
      }


      /*
       * Local face 0 is the surface triangle because the
       * original intrinsic tetrahedron ordering is:
       *
       *   [body center, face center, perimeter, perimeter].
       */
      if (
        cell.sourceBoundaryKind ===
          "large" &&
        localFaceIndex === 0
      ) {
        return (
          sharedEdgeLargeBoundaryFaceKey(
            cell
          )
        );
      }


      /*
       * Exactly reproduce intrinsicVolumeMesh.js'
       * sourceInternalFaceKey().
       *
       * This reconnects the shifted old large core to the
       * synthetic refined cusp-core cells using the SAME
       * abstract face identity already used there.
       */
      return (
        sharedEdgeSourceInternalFaceKey(
          cell.tetrahedronId,

          sourceVertexIndices.filter(
            (
              _,
              sourceLocalIndex
            ) =>
              sourceLocalIndex !==
              localFaceIndex
          )
        )
      );
    };


  let initialSemanticFaceFailureCount =
    0;


  let quotientCells =
    sharedFaceMesh
      .quotientCells
      .map(
        (
          cell,
          cellIndex
        ) => {
          const explicitFaceKeys =
            (
              Array.isArray(
                cell.explicitFaceKeys
              ) &&
              cell.explicitFaceKeys.length ===
                4
            )
              ? [
                  ...cell.explicitFaceKeys,
                ]
              : [0, 1, 2, 3].map(
                  (localFaceIndex) =>
                    inheritedSharedEdgeFaceKey(
                      cell,
                      localFaceIndex
                    )
                );


          if (
            explicitFaceKeys.some(
              (key) =>
                typeof key !==
                  "string" ||
                key.length === 0
            )
          ) {
            initialSemanticFaceFailureCount +=
              1;

            failures.push({
              reason:
                "missing-initial-semantic-face-key",

              cellIndex,

              sourceCellId:
                cell.sourceCellId ??
                null,

              tetrahedronId:
                cell.tetrahedronId ??
                null,

              sourceBoundaryKind:
                cell.sourceBoundaryKind ??
                null,

              sourceBoundaryFaceId:
                cell.sourceBoundaryFaceId ??
                null,

              explicitFaceKeys,
            });
          }


          return {
            ...cell,

            quotientVertexIndices: [
              ...cell.quotientVertexIndices,
            ],

            explicitFaceKeys,
          };
        }
      );


  /*
   * Audit the actual parent Δ-complex before splitting.
   *
   * Incidence:
   *
   *   1 = true manifold boundary
   *   2 = internal face pair
   *
   * There must be no incidence 4 / 6 collapse here.
   */
  const initialSemanticFaceIncidence =
    new Map();


  quotientCells.forEach(
    (cell) =>
      cell.explicitFaceKeys.forEach(
        (key) => {
          if (
            typeof key !==
              "string" ||
            key.length === 0
          ) {
            return;
          }


          initialSemanticFaceIncidence.set(
            key,

            (
              initialSemanticFaceIncidence
                .get(key) ??
              0
            ) + 1
          );
        }
      )
  );


  let initialSemanticBoundaryFaceCount =
    0;

  let initialSemanticInternalFacePairCount =
    0;

  let initialSemanticIncidenceFailureCount =
    0;


  initialSemanticFaceIncidence.forEach(
    (
      count,
      key
    ) => {
      if (count === 1) {
        initialSemanticBoundaryFaceCount +=
          1;

        return;
      }


      if (count === 2) {
        initialSemanticInternalFacePairCount +=
          1;

        return;
      }


      initialSemanticIncidenceFailureCount +=
        1;


      failures.push({
        reason:
          "invalid-initial-semantic-face-incidence",

        key,

        incidenceCount:
          count,
      });
    }
  );

  let splitCellOccurrenceCount =
    0;

  let unsupportedIncidentCellCount =
    0;

  const splitByKind = {};


  selectedEdges.forEach(
    (edge) => {
      const nextCells = [];


      quotientCells.forEach(
        (cell) => {
          const ids =
            cell
              .quotientVertexIndices;

          const parentFaceKeys =
            cell
              .explicitFaceKeys;


          if (
            !Array.isArray(ids) ||
            ids.length !== 4 ||
            !Array.isArray(
              parentFaceKeys
            ) ||
            parentFaceKeys.length !==
              4
          ) {
            failures.push({
              reason:
                "invalid-shared-edge-source-cell",

              sourceCellId:
                cell.sourceCellId ??
                null,

              quotientVertexIndices:
                ids,

              explicitFaceKeys:
                parentFaceKeys,
            });

            nextCells.push(cell);
            return;
          }


          const lowLocal =
            ids.indexOf(
              edge.low
            );

          const highLocal =
            ids.indexOf(
              edge.high
            );


          if (
            lowLocal < 0 ||
            highLocal < 0
          ) {
            nextCells.push(cell);
            return;
          }


          /*
           * This tetrahedron belongs to the complete star of
           * the selected quotient edge.
           *
           * Split
           *
           *   [a,b,c,d]
           *
           * along edge (a,b) at the globally shared midpoint M:
           *
           *   [a,M,c,d]
           *   [M,b,c,d]
           *
           * Every incident tetrahedron uses the SAME midpoint
           * quotient vertex and the SAME global edge order.
           */
          const lowVertices = [
            ...ids,
          ];

          const highVertices = [
            ...ids,
          ];


          lowVertices[
            highLocal
          ] =
            edge
              .midpointVertexIndex;

          highVertices[
            lowLocal
          ] =
            edge
              .midpointVertexIndex;


          const kind =
            cell
              .syntheticCellKind ??
            cell
              .sourceBoundaryKind ??
            "ordinary-core";


          splitByKind[kind] =
            (
              splitByKind[kind] ??
              0
            ) + 1;


          const serial =
            splitCellOccurrenceCount;

          splitCellOccurrenceCount +=
            1;


          /*
           * One new internal face belongs only to this parent
           * tetrahedron and is shared by its two children.
           */
          const internalFaceKey =
            `shared-edge-internal:` +
            `${edge.edgeIndex}:` +
            `${serial}`;

          const lowFaceKeys = [
            ...parentFaceKeys,
          ];

          const highFaceKeys = [
            ...parentFaceKeys,
          ];


          /*
           * Face keys are aligned by omitted local vertex.
           *
           * Parent edge = (low, high).
           *
           * low child:
           *
           *   omit low   -> new internal M-c-d face
           *   omit high  -> unchanged parent face
           *
           * high child:
           *
           *   omit low   -> unchanged parent face
           *   omit high  -> new internal M-c-d face
           */
          lowFaceKeys[
            lowLocal
          ] =
            internalFaceKey;

          lowFaceKeys[
            highLocal
          ] =
            parentFaceKeys[
              highLocal
            ];

          highFaceKeys[
            lowLocal
          ] =
            parentFaceKeys[
              lowLocal
            ];

          highFaceKeys[
            highLocal
          ] =
            internalFaceKey;


          /*
           * The other two parent faces contain the split edge.
           *
           * Crucially, neighboring tetrahedra derive these
           * child-face keys from:
           *
           *   SAME parent abstract-face key
           *   SAME global edge key
           *   SAME retained endpoint
           *
           * so their subdivisions agree automatically.
           */
          [0, 1, 2, 3]
            .filter(
              (localFaceIndex) =>
                localFaceIndex !==
                  lowLocal &&
                localFaceIndex !==
                  highLocal
            )
            .forEach(
              (localFaceIndex) => {
                const parentFaceKey =
                  parentFaceKeys[
                    localFaceIndex
                  ];


                lowFaceKeys[
                  localFaceIndex
                ] =
                  `shared-edge-subface:` +
                  `${parentFaceKey}:` +
                  `edge:${edge.key}:` +
                  `keep:${edge.low}`;


                highFaceKeys[
                  localFaceIndex
                ] =
                  `shared-edge-subface:` +
                  `${parentFaceKey}:` +
                  `edge:${edge.key}:` +
                  `keep:${edge.high}`;
              }
            );


          const common = {
            ...cell,

            sharedEdgeExperiment:
              true,

            sharedEdgeExperimentIndex:
              edge.edgeIndex,

            sharedEdgeBarycentricVertexIndex:
              edge
                .midpointVertexIndex,

            sharedEdgeSourceEndpointVertexIndices: [
              edge.low,
              edge.high,
            ],
          };


          nextCells.push(
            {
              ...common,

              sourceCellId:
                `${cell.sourceCellId ?? "cell"}` +
                `-shared-edge-` +
                `${edge.edgeIndex}-` +
                `${serial}-low`,

              quotientVertexIndices:
                lowVertices,

              explicitFaceKeys:
                lowFaceKeys,

              valid:
                cell.valid !== false &&
                new Set(
                  lowVertices
                ).size === 4,
            },

            {
              ...common,

              sourceCellId:
                `${cell.sourceCellId ?? "cell"}` +
                `-shared-edge-` +
                `${edge.edgeIndex}-` +
                `${serial}-high`,

              quotientVertexIndices:
                highVertices,

              explicitFaceKeys:
                highFaceKeys,

              valid:
                cell.valid !== false &&
                new Set(
                  highVertices
                ).size === 4,
            }
          );
        }
      );


      quotientCells =
        nextCells;
    }
  );


  quotientCells =
    quotientCells.map(
      (
        cell,
        quotientCellIndex
      ) => ({
        ...cell,

        quotientCellIndex,

        quotientVertexIndices: [
          ...cell
            .quotientVertexIndices,
        ],

        explicitFaceKeys: [
          ...cell
            .explicitFaceKeys,
        ],
      })
    );


  const faceIncidence =
    new Map();
  quotientCells.forEach(
    (cell) => {
      if (
        !Array.isArray(
          cell.explicitFaceKeys
        ) ||
        cell.explicitFaceKeys.length !==
          4
      ) {
        return;
      }

      cell.explicitFaceKeys.forEach(
        (key) =>
          faceIncidence.set(
            key,
            (faceIncidence.get(key) ?? 0) +
              1
          )
      );
    }
  );

  let explicitBoundaryFaceCount =
    0;
  let explicitInternalFacePairCount =
    0;
  let explicitFaceIncidenceFailureCount =
    0;

  faceIncidence.forEach(
    (count, key) => {
      if (count === 1) {
        explicitBoundaryFaceCount +=
          1;
      } else if (count === 2) {
        explicitInternalFacePairCount +=
          1;
      } else {
        explicitFaceIncidenceFailureCount +=
          1;
        failures.push({
          reason:
            "invalid-shared-edge-face-incidence",
          key,
          incidenceCount:
            count,
        });
      }
    }
  );


  const quotientEdgeMap =
    new Map();
  quotientCells.forEach(
    (cell) => {
      const ids =
        cell.quotientVertexIndices;
      for (let i = 0; i < 4; i += 1) {
        for (let j = i + 1; j < 4; j += 1) {
          const low =
            Math.min(ids[i], ids[j]);
          const high =
            Math.max(ids[i], ids[j]);
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


  const cellCountBySyntheticKind =
    {};
  quotientCells.forEach(
    (cell) => {
      const kind =
        cell.syntheticCellKind ??
        "unknown";
      cellCountBySyntheticKind[kind] =
        (cellCountBySyntheticKind[kind] ?? 0) +
        1;
    }
  );

  const invalidCellCount =
    quotientCells.filter(
      (cell) =>
        cell.valid === false ||
        new Set(
          cell.quotientVertexIndices
        ).size !== 4
    ).length;

  if (invalidCellCount > 0) {
    failures.push({
      reason:
        "invalid-shared-edge-cell-count",
      invalidCellCount,
    });
  }


  const capCellCount =
    cellCountBySyntheticKind[
      "refined-cusp-core"
    ] ??
    0;
  const bridgeCellCount =
    cellCountBySyntheticKind[
      "refined-cusp-core-barycentric-bridge"
    ] ??
    0;

  const expectedFinalInternalFacePairCount =
    initialSemanticInternalFacePairCount +
    2 * splitCellOccurrenceCount;


  if (
    explicitBoundaryFaceCount !==
    initialSemanticBoundaryFaceCount
  ) {
    failures.push({
      reason:
        "shared-edge-boundary-face-count-changed",

      initialBoundaryFaceCount:
        initialSemanticBoundaryFaceCount,

      finalBoundaryFaceCount:
        explicitBoundaryFaceCount,
    });
  }


  if (
    explicitInternalFacePairCount !==
    expectedFinalInternalFacePairCount
  ) {
    failures.push({
      reason:
        "shared-edge-internal-face-count-mismatch",

      initialInternalFacePairCount:
        initialSemanticInternalFacePairCount,

      splitCellOccurrenceCount,

      expectedFinalInternalFacePairCount,

      finalInternalFacePairCount:
        explicitInternalFacePairCount,
    });
  }


  const summary = {
    sharedCrossParentFaceCount:
      sharedFaceMesh
        .sharedFaceExperiment
        ?.summary
        ?.sharedCrossParentFaceCount ??
      0,
    selectedSharedEdgeCount:
      selectedEdges.length,
    sharedEdgeBarycentricCoreQuotientVertexCount:
      selectedEdges.length,
    splitCellOccurrenceCount,

    unsupportedIncidentCellCount,

    initialSemanticFaceFailureCount,

    initialSemanticBoundaryFaceCount,

    initialSemanticInternalFacePairCount,

    initialSemanticIncidenceFailureCount,

    expectedFinalInternalFacePairCount,

    splitCellOccurrenceCountBySyntheticKind:
      splitByKind,

    capCellCount,
    bridgeCellCount,
    cellCountBySyntheticKind,
    quotientVertexCount:
      quotientVertices.length,
    quotientCellCount:
      quotientCells.length,
    explicitBoundaryFaceCount,
    explicitInternalFacePairCount,
    explicitFaceIncidenceFailureCount,
    invalidCellCount,
  };

  const valid =
    failures.length === 0;


  return {
    ...sharedFaceMesh,
    valid,
    failures,
    quotientVertices,
    quotientCells,
    quotientEdges: [
      ...quotientEdgeMap.values(),
    ],
    refinedCuspCoreInterfaceAudit:
      null,
    sharedEdgeExperiment: {
      valid,
      failures,
      summary,
    },
    summary: {
      ...sharedFaceMesh.summary,
      quotientVertexCount:
        quotientVertices.length,
      quotientCellCount:
        quotientCells.length,
      quotientEdgeCount:
        quotientEdgeMap.size,
      interiorQuotientVertexCount:
        (
          sharedFaceMesh
            .summary
            ?.interiorQuotientVertexCount ??
          0
        ) +
        selectedEdges.length,
      sharedEdgeExperimentApplied:
        true,
      selectedSharedEdgeCount:
        selectedEdges.length,
      sharedEdgeBarycentricCoreQuotientVertexCount:
        selectedEdges.length,
      totalBarycentricCoreQuotientVertexCount:
        (
          sharedFaceMesh
            .summary
            ?.totalBarycentricCoreQuotientVertexCount ??
          0
        ) +
        selectedEdges.length,
      refinedCoreCuspCellCount:
        capCellCount + bridgeCellCount,
      collarInternalFacePairCount:
        explicitInternalFacePairCount,
      collarFaceIncidenceFailureCount:
        explicitFaceIncidenceFailureCount,
      sharedEdgeExperimentObserved:
        summary,
    },
  };
}


self.onmessage = (
  event
) => {
  const message =
    event.data ?? {};


  if (
    message.type !==
    "run-shared-face-experiment"
  ) {
    return;
  }


  const solve =
    message.solve !==
    false;


  const experimentKind =
    message.experimentKind ===
      "shared-edge"
      ? "shared-edge"
      : "shared-face";


  const experimentReport =
    (mesh) =>
      experimentKind ===
        "shared-edge"
        ? mesh.sharedEdgeExperiment
        : mesh.sharedFaceExperiment;


  try {
    self.postMessage({
      type:
        "shared-face-experiment-stage",

      stage:
        "building-topology",
    });


    const quotientMesh =
      experimentKind ===
        "shared-edge"
        ? sharedEdgeExperimentMesh(
            message.quotientMesh
          )
        : createIntrinsicSharedFaceExperimentMesh({
            quotientMesh:
              message.quotientMesh,
          });


    self.postMessage({
      type:
        "shared-face-experiment-stage",

      stage:
        "topology-ready",

      topology: {
        valid:
          quotientMesh.valid,

        summary:
          quotientMesh.summary,

        experiment:
          experimentReport(
            quotientMesh
          )?.summary ??
          null,

        failures:
          experimentReport(
            quotientMesh
          )?.failures ??
          quotientMesh.failures,
      },
    });


    if (
      !quotientMesh.valid ||
      !solve
    ) {
      self.postMessage({
        type:
          "shared-face-experiment-result",

        result: {
          experimentKind,

          solved: false,

          topology: {
            valid:
              quotientMesh.valid,

            summary:
              quotientMesh.summary,

            experiment:
              experimentReport(
                quotientMesh
              )?.summary ??
              null,

            failures:
              experimentReport(
                quotientMesh
              )?.failures ??
              quotientMesh.failures,
          },

          boundaryTargets:
            null,

          solver:
            null,
        },
      });

      return;
    }


    self.postMessage({
      type:
        "shared-face-experiment-stage",

      stage:
        "preparing-boundary",
    });


    const boundaryTargets =
      experimentBoundaryTargets(
        message.boundaryTargets,
        quotientMesh
      );


    self.postMessage({
      type:
        "shared-face-experiment-stage",

      stage:
        "running-s3-initialization",

      boundarySummary:
        boundaryTargets.summary,
    });


    const solverState =
      createIntrinsicS3InitialSolverState({
        quotientMesh,
        boundaryTargets,

        projectiveOptions:
          message.projectiveOptions ?? {},
      });


    self.postMessage({
      type:
        "shared-face-experiment-stage",

      stage:
        "solver-complete",

      solverSummary:
        solverState.summary,
    });


    self.postMessage({
      type:
        "shared-face-experiment-result",

      result: {
        experimentKind,

        solved: true,

        topology: {
          valid:
            quotientMesh.valid,

          summary:
            quotientMesh.summary,

          experiment:
            experimentReport(
              quotientMesh
            )?.summary ??
            null,

          failures:
            experimentReport(
              quotientMesh
            )?.failures ??
            quotientMesh.failures,
        },

        boundaryTargets: {
          valid:
            boundaryTargets.valid,

          summary:
            boundaryTargets.summary,

          failures:
            boundaryTargets.failures,
        },

        solver:
          compactSolverResult(
            solverState,
            quotientMesh
          ),
      },
    });
  } catch (error) {
    self.postMessage({
      type:
        "shared-face-experiment-error",

      error: {
        name:
          error
            ?.name ??
          "Error",

        message:
          error
            ?.message ??
          String(error),

        stack:
          error
            ?.stack ??
          null,
      },
    });
  }
};
