/*
 * Constrained projective S2 + deep-core solver for the compact
 * figure-eight quotient.
 *
 * S0/S1 remain fixed exactly. The 108 S2 material vertices and the
 * 10 genuine deep-core vertices move together on S³ under coherent
 * determinant constraints. S2 additionally obeys a hard forward
 * half-space constraint relative to S1 and material regularization.
 */

const EPSILON = 1e-12;

const clonePoint = (p) =>
  p ? { x: p.x, y: p.y, z: p.z, w: p.w } : null;

const clonePositions = (positions) => positions.map(clonePoint);

const dot = (a, b) =>
  a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;

const norm = (a) => Math.hypot(a.x, a.y, a.z, a.w);

function normalize(a, fallback = null) {
  const n = norm(a);

  if (
    Number.isFinite(n) &&
    n > EPSILON
  ) {
    return {
      x: a.x / n,
      y: a.y / n,
      z: a.z / n,
      w: a.w / n,
    };
  }

  return fallback
    ? normalize(fallback)
    : { x: 0, y: 0, z: 0, w: 1 };
}

const subtract = (a, b) => ({
  x: a.x - b.x,
  y: a.y - b.y,
  z: a.z - b.z,
  w: a.w - b.w,
});

const scale = (a, s) => ({
  x: s * a.x,
  y: s * a.y,
  z: s * a.z,
  w: s * a.w,
});

const zero = () => ({
  x: 0,
  y: 0,
  z: 0,
  w: 0,
});

function addInPlace(
  target,
  value,
  amount = 1
) {
  target.x +=
    amount * value.x;

  target.y +=
    amount * value.y;

  target.z +=
    amount * value.z;

  target.w +=
    amount * value.w;
}

function tangentProjection(
  value,
  base
) {
  const radial =
    dot(
      value,
      base
    );

  return {
    x:
      value.x -
      radial * base.x,

    y:
      value.y -
      radial * base.y,

    z:
      value.z -
      radial * base.z,

    w:
      value.w -
      radial * base.w,
  };
}

function determinantGradient(
  points,
  localIndex,
  determinant4
) {
  const basis = [
    {
      x: 1,
      y: 0,
      z: 0,
      w: 0,
    },
    {
      x: 0,
      y: 1,
      z: 0,
      w: 0,
    },
    {
      x: 0,
      y: 0,
      z: 1,
      w: 0,
    },
    {
      x: 0,
      y: 0,
      z: 0,
      w: 1,
    },
  ];


  const coefficients =
    basis.map(
      (basisPoint) => {
        const test =
          points.map(
            (
              point,
              index
            ) =>
              index ===
              localIndex
                ? basisPoint
                : point
          );


        return determinant4(
          test[0],
          test[1],
          test[2],
          test[3]
        );
      }
    );


  return {
    x: coefficients[0],
    y: coefficients[1],
    z: coefficients[2],
    w: coefficients[3],
  };
}

function cellRegion(
  cell
) {
  return (
    cell.syntheticCellKind ??
    cell.sourceBoundaryKind ??
    "ordinary-core"
  );
}

function orientationWeight(
  cell
) {
  const region =
    cellRegion(
      cell
    );


  /*
   * S1 -> S2 is the protected product layer. Its orientation
   * receives the strongest local barrier. The deep-core regions
   * remain strongly constrained, but can now move through their
   * own ten projective vertices instead of forcing S2 to absorb
   * the entire correction.
   */
  if (
    region ===
      "cusp-transition-layer" ||
    region ===
      "cusp-transition"
  ) {
    return 1.5;
  }


  if (
    region ===
    "refined-cusp-core"
  ) {
    return 1.35;
  }


  if (
    region ===
    "large"
  ) {
    return 1.2;
  }


  return 1;
}

function mismatchCountsByRegion(
  quotientMesh,
  orientationAudit
) {
  const bad =
    new Set(
      orientationAudit
        .orientationMismatchCellIndices
    );


  const groups = {};


  quotientMesh
    .quotientCells
    .forEach(
      (
        cell,
        cellIndex
      ) => {
        const region =
          cellRegion(
            cell
          );


        groups[region] ??= {
          cellCount: 0,
          mismatchCount: 0,
          mismatchFraction: 0,
        };


        groups[
          region
        ].cellCount += 1;


        if (
          bad.has(
            cellIndex
          )
        ) {
          groups[
            region
          ].mismatchCount += 1;
        }
      }
    );


  Object
    .values(
      groups
    )
    .forEach(
      (group) => {
        group.mismatchFraction =
          group.cellCount > 0
            ? group.mismatchCount /
              group.cellCount
            : 0;
      }
    );


  return groups;
}


export function optimizeIntrinsicS3ProjectiveTransitionSurface({
  quotientMesh,
  initialPositions,
  transitionVertexIndices,
  collarVertexIndices,
  deepInteriorVertexIndices,
  boundaryMap,
  adjacency,
  orientationTopology,
  globalGuideByVertex,

  operations: {
    determinant4,
    cellDiagnostics,
    auditCellOrientations,
    buildHarmonicSystem,
    solveHarmonicCoordinates,
  },

  options = {},
}) {
  const settings = {
    orientationMarginTarget:
      options.orientationMarginTarget ??
      0.025,

    materialMetricWeight:
      options.materialMetricWeight ??
      0.035,

    materialSeedWeight:
      options.materialSeedWeight ??
      0.004,

    deepSeedWeight:
      options.deepSeedWeight ??
      0.0015,

    minimumProgressFractionOfSeed:
      options.minimumProgressFractionOfSeed ??
      0.05,

    preserveInitiallyCorrectTransitionCells:
      options.preserveInitiallyCorrectTransitionCells ??
      true,

    roundCount:
      options.roundCount ??
      5,

    iterationsPerRound:
      options.iterationsPerRound ??
      64,

    initialStepSize:
      options.initialStepSize ??
      0.045,

    maximumStepSize:
      options.maximumStepSize ??
      0.08,

    lineSearchCount:
      options.lineSearchCount ??
      7,

    endpointDeterminantFloor:
      options.endpointDeterminantFloor ??
      1e-10,
  };


  const transitionSet =
    new Set(
      transitionVertexIndices
    );


  const movableVertexIndices = [
    ...transitionVertexIndices,
    ...deepInteriorVertexIndices,
  ];


  const movableSet =
    new Set(
      movableVertexIndices
    );


  const surfaceEdges =
    quotientMesh
      .quotientEdges
      .map(
        (edge) =>
          edge
            .quotientVertexIndices
      )
      .filter(
        ([
          first,
          second,
        ]) =>
          transitionSet.has(
            first
          ) &&
          transitionSet.has(
            second
          )
      );


  /*
   * Exactly the cells whose geometry can change: S1->S2, the
   * refined cusp core, and the large-face core. The outer S0->S1
   * collar contains no movable vertices and remains fixed.
   */
  const incidentCells =
    quotientMesh
      .quotientCells
      .map(
        (
          cell,
          cellIndex
        ) => ({
          cell,
          cellIndex,

          localMovableIndices:
            cell
              .quotientVertexIndices
              .map(
                (
                  vertexIndex,
                  localIndex
                ) =>
                  movableSet.has(
                    vertexIndex
                  )
                    ? localIndex
                    : null
              )
              .filter(
                (localIndex) =>
                  localIndex !==
                  null
              ),
        })
      )
      .filter(
        (record) =>
          record
            .localMovableIndices
            .length >
          0
      );


  const seedPositions =
    clonePositions(
      initialPositions
    );


  const evaluateFullState =
    (positions) => {
      const cellState =
        cellDiagnostics(
          quotientMesh,
          positions
        );


      const orientationAudit =
        auditCellOrientations(
          quotientMesh,
          cellState
        );


      return {
        cellState,
        orientationAudit,

        mismatchCountsByRegion:
          mismatchCountsByRegion(
            quotientMesh,
            orientationAudit
          ),
      };
    };


  const seedFullState =
    evaluateFullState(
      seedPositions
    );


  const globalOrientationSign =
    seedFullState
      .orientationAudit
      .componentDiagnostics[
        0
      ]
      ?.globalOrientationSign ??
    1;


  const desiredRawSignByCell =
    orientationTopology
      .parityByCell
      .map(
        (parity) =>
          globalOrientationSign *
          parity
      );


  /*
   * Normalize each determinant inequality by the largest S2
   * cofactor norm in that cell at the exact material seed.
   */
  incidentCells.forEach(
    (record) => {
      const points =
        record
          .cell
          .quotientVertexIndices
          .map(
            (vertexIndex) =>
              seedPositions[
                vertexIndex
              ]
          );


      const gradientNorms =
        record
          .localMovableIndices
          .map(
            (localIndex) =>
              norm(
                determinantGradient(
                  points,
                  localIndex,
                  determinant4
                )
              )
          );


      record.orientationScale =
        Math.max(
          1e-8,
          ...gradientNorms
        );


      record.orientationWeight =
        orientationWeight(
          record.cell
        );
    }
  );


  const surfaceEdgeRecords =
    surfaceEdges.map(
      ([
        first,
        second,
      ]) => ({
        first,
        second,

        seedDot:
          dot(
            seedPositions[
              first
            ],

            seedPositions[
              second
            ]
          ),
      })
    );


  /*
   * Positive progress is the exact S1 -> analytic-S2 geodesic
   * tangent. S2 may shear tangentially but may not retreat
   * through S1.
   */
  const progressByVertex =
    new Map();


  transitionVertexIndices.forEach(
    (vertexIndex) => {
      const quotientVertex =
        quotientMesh
          .quotientVertices[
          vertexIndex
        ];


      const collarParentIndex =
        quotientVertex
          ?.transitionParentCollarVertexIndex;


      const collarPoint =
        Number.isInteger(
          collarParentIndex
        )
          ? seedPositions[
              collarParentIndex
            ]
          : null;


      const seedPoint =
        seedPositions[
          vertexIndex
        ];


      if (
        !collarPoint ||
        !seedPoint
      ) {
        return;
      }


      const seedDot =
        dot(
          collarPoint,
          seedPoint
        );


      const tangent =
        normalize(
          subtract(
            seedPoint,

            scale(
              collarPoint,
              seedDot
            )
          )
        );


      const seedProgress =
        dot(
          seedPoint,
          tangent
        );


      progressByVertex.set(
        vertexIndex,
        {
          tangent,
          seedProgress,

          collarPoint,

          minimumProgress:
            Math.max(
              1e-8,
              settings
                .minimumProgressFractionOfSeed *
                seedProgress
            ),
        }
      );
    }
  );


  /*
   * HARD S2 progress geometry.
   *
   * Every trial transition point is projected into the spherical
   * cap on the complement side of S1 before the step is evaluated.
   * This replaces the old soft progress penalty.
   */
  function enforceHardProgress(
    vertexIndex,
    candidatePoint
  ) {
    const progress =
      progressByVertex.get(
        vertexIndex
      );


    const point =
      normalize(
        candidatePoint,
        seedPositions[
          vertexIndex
        ]
      );


    if (!progress) {
      return point;
    }


    const currentProgress =
      dot(
        point,
        progress.tangent
      );


    if (
      currentProgress >=
      progress.minimumProgress
    ) {
      return point;
    }


    const perpendicular =
      subtract(
        point,

        scale(
          progress.tangent,
          currentProgress
        )
      );


    const perpendicularUnit =
      normalize(
        perpendicular,
        progress.collarPoint
      );


    const minimumProgress =
      Math.min(
        0.999999,
        progress.minimumProgress
      );


    const perpendicularScale =
      Math.sqrt(
        Math.max(
          0,
          1 -
            minimumProgress *
              minimumProgress
        )
      );


    return normalize(
      {
        x:
          perpendicularScale *
            perpendicularUnit.x +
          minimumProgress *
            progress.tangent.x,

        y:
          perpendicularScale *
            perpendicularUnit.y +
          minimumProgress *
            progress.tangent.y,

        z:
          perpendicularScale *
            perpendicularUnit.z +
          minimumProgress *
            progress.tangent.z,

        w:
          perpendicularScale *
            perpendicularUnit.w +
          minimumProgress *
            progress.tangent.w,
      },

      progress.collarPoint
    );
  }


  function progressConstraintState(
    positions
  ) {
    let violationCount =
      0;

    let minimumProgressFraction =
      Infinity;


    transitionVertexIndices.forEach(
      (vertexIndex) => {
        const progress =
          progressByVertex.get(
            vertexIndex
          );


        if (
          !progress ||
          Math.abs(
            progress.seedProgress
          ) <
            EPSILON
        ) {
          return;
        }


        const actual =
          dot(
            positions[
              vertexIndex
            ],
            progress.tangent
          );


        const fraction =
          actual /
          progress.seedProgress;


        minimumProgressFraction =
          Math.min(
            minimumProgressFraction,
            fraction
          );


        if (
          actual <
          progress.minimumProgress -
            1e-10
        ) {
          violationCount +=
            1;
        }
      }
    );


    return {
      violationCount,

      minimumProgressFraction:
        Number.isFinite(
          minimumProgressFraction
        )
          ? minimumProgressFraction
          : 0,
    };
  }


  /*
   * Preserve every S1 -> S2 tetrahedron that is already correctly
   * oriented at the analytic seed. The 42 bad transition cells are
   * free to improve; the 606 good ones are not allowed to flip.
   */
  const protectedTransitionCellIndices =
    new Set();


  incidentCells.forEach(
    (record) => {
      const region =
        cellRegion(
          record.cell
        );


      if (
        region !==
          "cusp-transition-layer" &&
        region !==
          "cusp-transition"
      ) {
        return;
      }


      const points =
        record
          .cell
          .quotientVertexIndices
          .map(
            (vertexIndex) =>
              seedPositions[
                vertexIndex
              ]
          );


      const determinant =
        determinant4(
          points[0],
          points[1],
          points[2],
          points[3]
        );


      const normalizedMargin =
        desiredRawSignByCell[
          record.cellIndex
        ] *
        determinant /
        record.orientationScale;


      if (
        normalizedMargin >
        0
      ) {
        protectedTransitionCellIndices
          .add(
            record.cellIndex
          );
      }
    }
  );


  function evaluateOrientationConstraintState(
    positions
  ) {
    let wrongSignCount =
      0;

    let transitionWrongSignCount =
      0;

    let refinedCoreWrongSignCount =
      0;

    let largeWrongSignCount =
      0;

    let nearDegenerateCount =
      0;

    let protectedTransitionViolationCount =
      0;

    let minimumNormalizedMargin =
      Infinity;


    incidentCells.forEach(
      (record) => {
        const points =
          record
            .cell
            .quotientVertexIndices
            .map(
              (vertexIndex) =>
                positions[
                  vertexIndex
                ]
            );


        const determinant =
          determinant4(
            points[0],
            points[1],
            points[2],
            points[3]
          );


        const normalizedMargin =
          desiredRawSignByCell[
            record.cellIndex
          ] *
          determinant /
          record.orientationScale;


        minimumNormalizedMargin =
          Math.min(
            minimumNormalizedMargin,
            normalizedMargin
          );


        if (
          protectedTransitionCellIndices
            .has(
              record.cellIndex
            ) &&
          normalizedMargin <=
            0
        ) {
          protectedTransitionViolationCount +=
            1;
        }


        if (
          Math.abs(
            determinant
          ) <
          settings
            .endpointDeterminantFloor
        ) {
          nearDegenerateCount +=
            1;
        }


        if (
          normalizedMargin >
          0
        ) {
          return;
        }


        wrongSignCount +=
          1;


        const region =
          cellRegion(
            record.cell
          );


        if (
          region ===
            "cusp-transition-layer" ||
          region ===
            "cusp-transition"
        ) {
          transitionWrongSignCount +=
            1;
        } else if (
          region ===
          "refined-cusp-core"
        ) {
          refinedCoreWrongSignCount +=
            1;
        } else if (
          region ===
          "large"
        ) {
          largeWrongSignCount +=
            1;
        }
      }
    );


    return {
      wrongSignCount,
      transitionWrongSignCount,
      refinedCoreWrongSignCount,
      largeWrongSignCount,
      nearDegenerateCount,
      protectedTransitionViolationCount,

      minimumNormalizedMargin:
        Number.isFinite(
          minimumNormalizedMargin
        )
          ? minimumNormalizedMargin
          : 0,
    };
  }


  const seedOrientationConstraintState =
    evaluateOrientationConstraintState(
      seedPositions
    );


  function evaluateSurfaceEnergyAndForces(
    positions,
    includeForces
  ) {
    const forces =
      includeForces
        ? new Map(
            movableVertexIndices.map(
              (vertexIndex) => [
                vertexIndex,
                zero(),
              ]
            )
          )
        : null;


    let orientationEnergy =
      0;

    let metricEnergy =
      0;

    let seedEnergy =
      0;

    let deepSeedEnergy =
      0;


    incidentCells.forEach(
      (record) => {
        const points =
          record
            .cell
            .quotientVertexIndices
            .map(
              (vertexIndex) =>
                positions[
                  vertexIndex
                ]
            );


        if (
          points.some(
            (point) =>
              !point
          )
        ) {
          return;
        }


        const determinant =
          determinant4(
            points[0],
            points[1],
            points[2],
            points[3]
          );


        const normalizedMargin =
          desiredRawSignByCell[
            record.cellIndex
          ] *
          determinant /
          record.orientationScale;


        const deficit =
          settings
            .orientationMarginTarget -
          normalizedMargin;


        if (
          deficit <=
          0
        ) {
          return;
        }


        orientationEnergy +=
          record
            .orientationWeight *
          deficit *
          deficit;


        if (
          !includeForces
        ) {
          return;
        }


        record
          .localMovableIndices
          .forEach(
            (localIndex) => {
              const vertexIndex =
                record
                  .cell
                  .quotientVertexIndices[
                  localIndex
                ];


              const gradient =
                determinantGradient(
                  points,
                  localIndex,
                  determinant4
                );


              const coefficient =
                (
                  2 *
                  record
                    .orientationWeight *
                  deficit *
                  desiredRawSignByCell[
                    record.cellIndex
                  ]
                ) /
                record
                  .orientationScale;


              addInPlace(
                forces.get(
                  vertexIndex
                ),
                gradient,
                coefficient
              );
            }
          );
      }
    );


    surfaceEdgeRecords.forEach(
      (edge) => {
        const first =
          positions[
            edge.first
          ];


        const second =
          positions[
            edge.second
          ];


        if (
          !first ||
          !second
        ) {
          return;
        }


        const error =
          dot(
            first,
            second
          ) -
          edge.seedDot;


        metricEnergy +=
          settings
            .materialMetricWeight *
          error *
          error;


        if (
          !includeForces
        ) {
          return;
        }


        addInPlace(
          forces.get(
            edge.first
          ),
          second,
          -2 *
            settings
              .materialMetricWeight *
            error
        );


        addInPlace(
          forces.get(
            edge.second
          ),
          first,
          -2 *
            settings
              .materialMetricWeight *
            error
        );
      }
    );


    transitionVertexIndices.forEach(
      (vertexIndex) => {
        const point =
          positions[
            vertexIndex
          ];

        const seedPoint =
          seedPositions[
            vertexIndex
          ];


        const seedDeficit =
          1 -
          dot(
            point,
            seedPoint
          );


        seedEnergy +=
          settings
            .materialSeedWeight *
          seedDeficit *
          seedDeficit;


        if (
          includeForces
        ) {
          addInPlace(
            forces.get(
              vertexIndex
            ),
            seedPoint,
            2 *
              settings
                .materialSeedWeight *
              seedDeficit
          );
        }
      }
    );


    deepInteriorVertexIndices.forEach(
      (vertexIndex) => {
        const point =
          positions[
            vertexIndex
          ];

        const seedPoint =
          seedPositions[
            vertexIndex
          ];


        const seedDeficit =
          1 -
          dot(
            point,
            seedPoint
          );


        deepSeedEnergy +=
          settings
            .deepSeedWeight *
          seedDeficit *
          seedDeficit;


        if (
          includeForces
        ) {
          addInPlace(
            forces.get(
              vertexIndex
            ),
            seedPoint,
            2 *
              settings
                .deepSeedWeight *
              seedDeficit
          );
        }
      }
    );


    if (
      includeForces
    ) {
      movableVertexIndices.forEach(
        (vertexIndex) => {
          forces.set(
            vertexIndex,

            tangentProjection(
              forces.get(
                vertexIndex
              ),

              positions[
                vertexIndex
              ]
            )
          );
        }
      );
    }


    return {
      energy:
        orientationEnergy +
        metricEnergy +
        seedEnergy +
        deepSeedEnergy,

      orientationEnergy,
      metricEnergy,
      seedEnergy,
      deepSeedEnergy,

      forces,
    };
  }


  let currentPositions =
    clonePositions(
      seedPositions
    );


  const initialEnergy =
    evaluateSurfaceEnergyAndForces(
      currentPositions,
      false
    ).energy;


  let bestPositions =
    clonePositions(
      currentPositions
    );


  let bestFullState =
    seedFullState;


  let bestConstraintState =
    seedOrientationConstraintState;


  let bestEnergy =
    initialEnergy;


  let acceptedStepCount =
    0;

  let rejectedStepCount =
    0;

  let progressProjectionCount =
    0;

  let transitionProtectionRejectionCount =
    0;

  let endpointDegeneracyRejectionCount =
    0;

  let completedRoundCount =
    0;


  const history = [
    {
      round:
        0,

      orientationMismatchCount:
        seedFullState
          .orientationAudit
          .summary
          .orientationMismatchCount,

      controlledMismatchCount:
        seedOrientationConstraintState
          .wrongSignCount,

      transitionMismatchCount:
        seedOrientationConstraintState
          .transitionWrongSignCount,

      refinedCoreMismatchCount:
        seedOrientationConstraintState
          .refinedCoreWrongSignCount,

      largeMismatchCount:
        seedOrientationConstraintState
          .largeWrongSignCount,

      minimumNormalizedMargin:
        seedOrientationConstraintState
          .minimumNormalizedMargin,

      degenerateCellCount:
        seedFullState
          .cellState
          .summary
          .degenerateCellCount,

      surfaceEnergy:
        initialEnergy,
    },
  ];


  for (
    let round = 0;
    round <
      settings.roundCount;
    round += 1
  ) {
    let stepSize =
      settings.initialStepSize;


    for (
      let iteration = 0;
      iteration <
        settings.iterationsPerRound;
      iteration += 1
    ) {
      const evaluation =
        evaluateSurfaceEnergyAndForces(
          currentPositions,
          true
        );


      let maximumForceNorm =
        0;


      movableVertexIndices.forEach(
        (vertexIndex) => {
          maximumForceNorm =
            Math.max(
              maximumForceNorm,

              norm(
                evaluation
                  .forces
                  .get(
                    vertexIndex
                  )
              )
            );
        }
      );


      if (
        !Number.isFinite(
          maximumForceNorm
        ) ||
        maximumForceNorm <
          1e-10
      ) {
        break;
      }


      let accepted =
        false;


      for (
        let lineSearch = 0;
        lineSearch <
          settings.lineSearchCount;
        lineSearch += 1
      ) {
        const trialStep =
          stepSize *
          Math.pow(
            0.5,
            lineSearch
          );


        const forceScale =
          trialStep /
          maximumForceNorm;


        const trialPositions =
          clonePositions(
            currentPositions
          );


        movableVertexIndices.forEach(
          (vertexIndex) => {
            const point =
              currentPositions[
                vertexIndex
              ];


            const force =
              evaluation
                .forces
                .get(
                  vertexIndex
                );


            const candidate =
              normalize(
                {
                  x:
                    point.x +
                    forceScale *
                      force.x,

                  y:
                    point.y +
                    forceScale *
                      force.y,

                  z:
                    point.z +
                    forceScale *
                      force.z,

                  w:
                    point.w +
                    forceScale *
                      force.w,
                },

                point
              );


            if (
              transitionSet.has(
                vertexIndex
              )
            ) {
              const projected =
                enforceHardProgress(
                  vertexIndex,
                  candidate
                );


              if (
                dot(
                  projected,
                  candidate
                ) <
                1 -
                  1e-12
              ) {
                progressProjectionCount +=
                  1;
              }


              trialPositions[
                vertexIndex
              ] =
                projected;
            } else {
              trialPositions[
                vertexIndex
              ] =
                candidate;
            }
          }
        );


        const trialProgressState =
          progressConstraintState(
            trialPositions
          );


        if (
          trialProgressState
            .violationCount >
          0
        ) {
          continue;
        }


        const trialConstraintState =
          evaluateOrientationConstraintState(
            trialPositions
          );


        if (
          trialConstraintState
            .nearDegenerateCount >
          0
        ) {
          endpointDegeneracyRejectionCount +=
            1;

          continue;
        }


        if (
          settings
            .preserveInitiallyCorrectTransitionCells &&
          trialConstraintState
            .protectedTransitionViolationCount >
          0
        ) {
          transitionProtectionRejectionCount +=
            1;

          continue;
        }


        const trialEnergy =
          evaluateSurfaceEnergyAndForces(
            trialPositions,
            false
          ).energy;


        if (
          Number.isFinite(
            trialEnergy
          ) &&
          trialEnergy <
            evaluation.energy -
              1e-12
        ) {
          currentPositions =
            trialPositions;


          stepSize =
            Math.min(
              settings
                .maximumStepSize,

              trialStep *
                1.08
            );


          acceptedStepCount +=
            1;


          accepted =
            true;


          break;
        }
      }


      if (
        !accepted
      ) {
        rejectedStepCount +=
          1;


        stepSize *=
          0.5;


        if (
          stepSize <
          1e-5
        ) {
          break;
        }
      }
    }


    completedRoundCount =
      round + 1;


    const fullState =
      evaluateFullState(
        currentPositions
      );


    const surfaceEnergy =
      evaluateSurfaceEnergyAndForces(
        currentPositions,
        false
      ).energy;


    const constraintState =
      evaluateOrientationConstraintState(
        currentPositions
      );


    const progressState =
      progressConstraintState(
        currentPositions
      );


    history.push({
      round:
        round + 1,

      orientationMismatchCount:
        fullState
          .orientationAudit
          .summary
          .orientationMismatchCount,

      controlledMismatchCount:
        constraintState
          .wrongSignCount,

      transitionMismatchCount:
        constraintState
          .transitionWrongSignCount,

      refinedCoreMismatchCount:
        constraintState
          .refinedCoreWrongSignCount,

      largeMismatchCount:
        constraintState
          .largeWrongSignCount,

      minimumNormalizedMargin:
        constraintState
          .minimumNormalizedMargin,

      minimumProgressFraction:
        progressState
          .minimumProgressFraction,

      degenerateCellCount:
        fullState
          .cellState
          .summary
          .degenerateCellCount,

      surfaceEnergy,
    });


    const better =
      fullState
        .cellState
        .summary
        .degenerateCellCount <
        bestFullState
          .cellState
          .summary
          .degenerateCellCount ||
      (
        fullState
          .cellState
          .summary
          .degenerateCellCount ===
          bestFullState
            .cellState
            .summary
            .degenerateCellCount &&
        (
          fullState
            .orientationAudit
            .summary
            .orientationMismatchCount <
            bestFullState
              .orientationAudit
              .summary
              .orientationMismatchCount ||
          (
            fullState
              .orientationAudit
              .summary
              .orientationMismatchCount ===
            bestFullState
              .orientationAudit
              .summary
              .orientationMismatchCount &&
            (
              constraintState
                .transitionWrongSignCount <
              bestConstraintState
                .transitionWrongSignCount ||
              (
                constraintState
                  .transitionWrongSignCount ===
                bestConstraintState
                  .transitionWrongSignCount &&
                (
                  constraintState
                    .minimumNormalizedMargin >
                  bestConstraintState
                    .minimumNormalizedMargin ||
                  (
                    Math.abs(
                      constraintState
                        .minimumNormalizedMargin -
                      bestConstraintState
                        .minimumNormalizedMargin
                    ) <
                      1e-12 &&
                    surfaceEnergy <
                    bestEnergy
                  )
                )
              )
            )
          )
        )
      );


    if (
      better
    ) {
      bestPositions =
        clonePositions(
          currentPositions
        );


      bestFullState =
        fullState;


      bestConstraintState =
        constraintState;


      bestEnergy =
        surfaceEnergy;
    }
  }


  const finalEnergy =
    evaluateSurfaceEnergyAndForces(
      bestPositions,
      false
    ).energy;


  const finalProgressState =
    progressConstraintState(
      bestPositions
    );


  const finalMetricErrors =
    surfaceEdgeRecords.map(
      (edge) =>
        Math.abs(
          dot(
            bestPositions[
              edge.first
            ],
            bestPositions[
              edge.second
            ]
          ) -
          edge.seedDot
        )
    );


  const maximumMaterialEdgeDotError =
    finalMetricErrors.length
      ? Math.max(
          ...finalMetricErrors
        )
      : 0;


  const meanMaterialEdgeDotError =
    finalMetricErrors.length
      ? finalMetricErrors.reduce(
          (
            sum,
            value
          ) =>
            sum +
            value,
          0
        ) /
        finalMetricErrors.length
      : 0;


  const angularDisplacements =
    transitionVertexIndices.map(
      (vertexIndex) => {
        const cosine =
          Math.max(
            -1,

            Math.min(
              1,

              dot(
                seedPositions[
                  vertexIndex
                ],

                bestPositions[
                  vertexIndex
                ]
              )
            )
          );


        return (
          Math.acos(
            cosine
          ) *
          180 /
          Math.PI
        );
      }
    );


  const deepAngularDisplacements =
    deepInteriorVertexIndices.map(
      (vertexIndex) => {
        const cosine =
          Math.max(
            -1,

            Math.min(
              1,

              dot(
                seedPositions[
                  vertexIndex
                ],

                bestPositions[
                  vertexIndex
                ]
              )
            )
          );


        return (
          Math.acos(
            cosine
          ) *
          180 /
          Math.PI
        );
      }
    );


  return {
    valid:
      bestPositions.every(
        Boolean
      ) &&
      finalProgressState
        .violationCount ===
        0,

    positions:
      bestPositions,

    /*
     * Retained for the existing volume-solver interface. The ten H
     * vertices are now solved projectively, so there is intentionally
     * no final harmonic system.
     */
    finalDeepCoreHarmonicSystem:
      null,

    deepCoreLinearSolveSucceeded:
      true,

    history,

    initialMismatchCountsByRegion:
      seedFullState
        .mismatchCountsByRegion,

    finalMismatchCountsByRegion:
      bestFullState
        .mismatchCountsByRegion,

    summary: {
      transitionVertexCount:
        transitionVertexIndices
          .length,

      deepInteriorVertexCount:
        deepInteriorVertexIndices
          .length,

      movableVertexCount:
        movableVertexIndices
          .length,

      transitionSurfaceEdgeCount:
        surfaceEdges.length,

      incidentCellCount:
        incidentCells.length,

      globalOrientationSign,

      orientationMarginTarget:
        settings
          .orientationMarginTarget,

      projectiveRoundCount:
        completedRoundCount,

      acceptedStepCount,

      rejectedStepCount,

      progressProjectionCount,

      transitionProtectionRejectionCount,

      endpointDegeneracyRejectionCount,

      protectedTransitionCellCount:
        protectedTransitionCellIndices
          .size,

      minimumProgressFractionOfSeed:
        settings
          .minimumProgressFractionOfSeed,

      initialSurfaceEnergy:
        initialEnergy,

      finalSurfaceEnergy:
        finalEnergy,

      initialOrientationMismatchCount:
        seedFullState
          .orientationAudit
          .summary
          .orientationMismatchCount,

      finalOrientationMismatchCount:
        bestFullState
          .orientationAudit
          .summary
          .orientationMismatchCount,

      orientationMismatchImprovement:
        seedFullState
          .orientationAudit
          .summary
          .orientationMismatchCount -
        bestFullState
          .orientationAudit
          .summary
          .orientationMismatchCount,

      initialControlledMismatchCount:
        seedOrientationConstraintState
          .wrongSignCount,

      finalControlledMismatchCount:
        bestConstraintState
          .wrongSignCount,

      initialTransitionMismatchCount:
        seedOrientationConstraintState
          .transitionWrongSignCount,

      finalTransitionMismatchCount:
        bestConstraintState
          .transitionWrongSignCount,

      finalProtectedTransitionViolationCount:
        bestConstraintState
          .protectedTransitionViolationCount,

      initialRefinedCoreMismatchCount:
        seedOrientationConstraintState
          .refinedCoreWrongSignCount,

      finalRefinedCoreMismatchCount:
        bestConstraintState
          .refinedCoreWrongSignCount,

      initialLargeMismatchCount:
        seedOrientationConstraintState
          .largeWrongSignCount,

      finalLargeMismatchCount:
        bestConstraintState
          .largeWrongSignCount,

      initialMinimumNormalizedMargin:
        seedOrientationConstraintState
          .minimumNormalizedMargin,

      finalMinimumNormalizedMargin:
        bestConstraintState
          .minimumNormalizedMargin,

      initialDegenerateCellCount:
        seedFullState
          .cellState
          .summary
          .degenerateCellCount,

      finalDegenerateCellCount:
        bestFullState
          .cellState
          .summary
          .degenerateCellCount,

      maximumAngularDisplacementDegrees:
        angularDisplacements
          .length
          ? Math.max(
              ...angularDisplacements
            )
          : 0,

      meanAngularDisplacementDegrees:
        angularDisplacements
          .length
          ? angularDisplacements
              .reduce(
                (
                  sum,
                  value
                ) =>
                  sum +
                  value,

                0
              ) /
            angularDisplacements
              .length
          : 0,

      maximumDeepAngularDisplacementDegrees:
        deepAngularDisplacements
          .length
          ? Math.max(
              ...deepAngularDisplacements
            )
          : 0,

      meanDeepAngularDisplacementDegrees:
        deepAngularDisplacements
          .length
          ? deepAngularDisplacements
              .reduce(
                (
                  sum,
                  value
                ) =>
                  sum +
                  value,

                0
              ) /
            deepAngularDisplacements
              .length
          : 0,

      minimumProgressFraction:
        finalProgressState
          .minimumProgressFraction,

      hardProgressViolationCount:
        finalProgressState
          .violationCount,

      maximumMaterialEdgeDotError,

      meanMaterialEdgeDotError,
    },
  };
}
