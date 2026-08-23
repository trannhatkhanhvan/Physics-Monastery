/*
 * Coupled projective S2/S3/H solver for the compact figure-eight
 * quotient. S0 and the analytic S1 collar remain fixed. The two
 * 108-vertex material tori and the ten finite deep-core vertices move
 * together on S³ under coherent determinant-orientation constraints.
 */

const EPSILON = 1e-12;
const ENDPOINT_DEGENERACY_TOLERANCE = 1e-10;

const clonePoint = (point) =>
  point
    ? {
        x: point.x,
        y: point.y,
        z: point.z,
        w: point.w,
      }
    : null;

const clonePositions = (positions) =>
  positions.map(clonePoint);

const dot = (first, second) =>
  first.x * second.x +
  first.y * second.y +
  first.z * second.z +
  first.w * second.w;

const norm = (point) =>
  Math.hypot(
    point.x,
    point.y,
    point.z,
    point.w
  );

const zero = () => ({
  x: 0,
  y: 0,
  z: 0,
  w: 0,
});

const subtract = (first, second) => ({
  x: first.x - second.x,
  y: first.y - second.y,
  z: first.z - second.z,
  w: first.w - second.w,
});

const scale = (point, amount) => ({
  x: point.x * amount,
  y: point.y * amount,
  z: point.z * amount,
  w: point.w * amount,
});

function normalize(point, fallback = null) {
  const magnitude = norm(point);

  if (
    Number.isFinite(magnitude) &&
    magnitude > EPSILON
  ) {
    return {
      x: point.x / magnitude,
      y: point.y / magnitude,
      z: point.z / magnitude,
      w: point.w / magnitude,
    };
  }

  return fallback
    ? normalize(fallback)
    : {
        x: 0,
        y: 0,
        z: 0,
        w: 1,
      };
}

function addInPlace(
  target,
  value,
  amount = 1
) {
  target.x += amount * value.x;
  target.y += amount * value.y;
  target.z += amount * value.z;
  target.w += amount * value.w;
}

function tangentProjection(
  value,
  base
) {
  const radial = dot(value, base);

  return {
    x: value.x - radial * base.x,
    y: value.y - radial * base.y,
    z: value.z - radial * base.z,
    w: value.w - radial * base.w,
  };
}

function determinantGradient(
  points,
  localIndex,
  determinant4
) {
  const basis = [
    { x: 1, y: 0, z: 0, w: 0 },
    { x: 0, y: 1, z: 0, w: 0 },
    { x: 0, y: 0, z: 1, w: 0 },
    { x: 0, y: 0, z: 0, w: 1 },
  ];

  const coefficients =
    basis.map(
      (basisPoint) => {
        const test =
          points.map(
            (point, index) =>
              index === localIndex
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

function projectToSphericalCap(
  point,
  tangent,
  minimumDot
) {
  const current = dot(point, tangent);

  if (current >= minimumDot) {
    return {
      point,
      projected: false,
    };
  }

  const orthogonal =
    subtract(
      point,
      scale(tangent, current)
    );

  const orthogonalNorm =
    norm(orthogonal);

  const targetOrthogonalNorm =
    Math.sqrt(
      Math.max(
        0,
        1 - minimumDot * minimumDot
      )
    );

  const orthogonalDirection =
    orthogonalNorm > EPSILON
      ? scale(
          orthogonal,
          1 / orthogonalNorm
        )
      : normalize(
          tangentProjection(
            { x: 1, y: 0, z: 0, w: 0 },
            tangent
          ),
          { x: 0, y: 1, z: 0, w: 0 }
        );

  return {
    point: normalize({
      x:
        minimumDot * tangent.x +
        targetOrthogonalNorm *
          orthogonalDirection.x,
      y:
        minimumDot * tangent.y +
        targetOrthogonalNorm *
          orthogonalDirection.y,
      z:
        minimumDot * tangent.z +
        targetOrthogonalNorm *
          orthogonalDirection.z,
      w:
        minimumDot * tangent.w +
        targetOrthogonalNorm *
          orthogonalDirection.w,
    }),
    projected: true,
  };
}

function angularDisplacementDegrees(
  first,
  second
) {
  const cosine =
    Math.max(
      -1,
      Math.min(
        1,
        dot(first, second)
      )
    );

  return (
    Math.acos(cosine) *
    180 /
    Math.PI
  );
}

export function optimizeIntrinsicS3LayeredProjectiveSurfaces({
  quotientMesh,
  initialPositions,
  transitionVertexIndices,
  secondTransitionVertexIndices,
  secondTransitionParentByVertex,
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
  },
  options = {},
}) {
  void boundaryMap;
  void adjacency;
  void globalGuideByVertex;

  const settings = {
    orientationMarginTarget:
      options.orientationMarginTarget ??
      0.025,

    refinedCoreBridgeOrientationWeight:
      options.refinedCoreBridgeOrientationWeight ??
      2.4,

    firstSurfaceMetricWeight:
      options.firstSurfaceMetricWeight ??
      0.03,

    secondSurfaceMetricWeight:
      options.secondSurfaceMetricWeight ??
      0.025,

    interlayerMetricWeight:
      options.interlayerMetricWeight ??
      0.02,

    firstSurfaceSeedWeight:
      options.firstSurfaceSeedWeight ??
      0.0025,

    secondSurfaceSeedWeight:
      options.secondSurfaceSeedWeight ??
      0.0015,

    deepSeedWeight:
      options.deepSeedWeight ??
      0.0004,

    minimumProgressFractionOfSeed:
      options.minimumProgressFractionOfSeed ??
      0.05,

    roundCount:
      options.roundCount ??
      6,

    iterationsPerRound:
      options.iterationsPerRound ??
      64,

    initialStepSize:
      options.initialStepSize ??
      0.04,

    maximumStepSize:
      options.maximumStepSize ??
      0.07,
  };

  const firstTransitionSet =
    new Set(transitionVertexIndices);

  const secondTransitionSet =
    new Set(secondTransitionVertexIndices);

  const collarSet =
    new Set(collarVertexIndices);

  const deepSet =
    new Set(deepInteriorVertexIndices);

  const movableVertexIndices = [
    ...transitionVertexIndices,
    ...secondTransitionVertexIndices,
    ...deepInteriorVertexIndices,
  ];

  const movableSet =
    new Set(movableVertexIndices);

  const seedPositions =
    clonePositions(initialPositions);

  function membershipCounts(cell) {
    const counts = {
      collar: 0,
      first: 0,
      second: 0,
      deep: 0,
    };

    cell.quotientVertexIndices.forEach(
      (vertexIndex) => {
        if (collarSet.has(vertexIndex)) {
          counts.collar += 1;
        }
        if (firstTransitionSet.has(vertexIndex)) {
          counts.first += 1;
        }
        if (secondTransitionSet.has(vertexIndex)) {
          counts.second += 1;
        }
        if (deepSet.has(vertexIndex)) {
          counts.deep += 1;
        }
      }
    );

    return counts;
  }

  function regionForCell(cell) {
    const counts = membershipCounts(cell);

    if (
      counts.collar > 0 &&
      counts.first > 0 &&
      counts.second === 0
    ) {
      return "cusp-transition-layer";
    }

    if (
      counts.first > 0 &&
      counts.second > 0
    ) {
      return "cusp-transition-layer-2";
    }

    if (
      cell.syntheticCellKind ===
      "refined-cusp-core"
    ) {
      return "refined-cusp-core";
    }

    if (
      cell.syntheticCellKind ===
      "refined-cusp-core-barycentric-bridge"
    ) {
      return "refined-cusp-core-bridge";
    }

    if (
      cell.sourceBoundaryKind ===
      "large"
    ) {
      return "large";
    }

    return (
      cell.syntheticCellKind ??
      cell.sourceBoundaryKind ??
      "ordinary-core"
    );
  }

  function orientationWeight(cell) {
    const region = regionForCell(cell);

    if (
      region ===
      "refined-cusp-core-bridge"
    ) {
      return settings
        .refinedCoreBridgeOrientationWeight;
    }

    if (
      region === "refined-cusp-core"
    ) {
      return 1.6;
    }

    if (region === "large") {
      return 1.4;
    }

    if (
      region ===
      "cusp-transition-layer-2"
    ) {
      return 1.15;
    }

    if (
      region ===
      "cusp-transition-layer"
    ) {
      return 0.85;
    }

    return 1;
  }


  function mismatchCountsByRegion(
    orientationAudit
  ) {
    const bad =
      new Set(
        orientationAudit
          .orientationMismatchCellIndices
      );

    const groups = {};

    quotientMesh.quotientCells.forEach(
      (cell, cellIndex) => {
        const region = regionForCell(cell);

        groups[region] ??= {
          cellCount: 0,
          mismatchCount: 0,
          mismatchFraction: 0,
        };

        groups[region].cellCount += 1;

        if (bad.has(cellIndex)) {
          groups[region].mismatchCount += 1;
        }
      }
    );

    Object.values(groups).forEach(
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

  function evaluateFullState(positions) {
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
          orientationAudit
        ),
    };
  }

  const seedFullState =
    evaluateFullState(seedPositions);

  const globalOrientationSign =
    seedFullState
      .orientationAudit
      .componentDiagnostics[0]
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

  const firstSurfaceEdges =
    quotientMesh.quotientEdges
      .map(
        (edge) =>
          edge.quotientVertexIndices
      )
      .filter(
        ([first, second]) =>
          firstTransitionSet.has(first) &&
          firstTransitionSet.has(second)
      );

  const secondSurfaceEdges =
    quotientMesh.quotientEdges
      .map(
        (edge) =>
          edge.quotientVertexIndices
      )
      .filter(
        ([first, second]) =>
          secondTransitionSet.has(first) &&
          secondTransitionSet.has(second)
      );

  const firstSurfaceEdgeRecords =
    firstSurfaceEdges.map(
      ([first, second]) => ({
        first,
        second,
        seedDot:
          dot(
            seedPositions[first],
            seedPositions[second]
          ),
      })
    );

  const secondSurfaceEdgeRecords =
    secondSurfaceEdges.map(
      ([first, second]) => ({
        first,
        second,
        seedDot:
          dot(
            seedPositions[first],
            seedPositions[second]
          ),
      })
    );

  const interlayerPairRecords = [];

  secondTransitionVertexIndices.forEach(
    (secondVertexIndex) => {
      const firstVertexIndex =
        secondTransitionParentByVertex
          ?.get(secondVertexIndex);

      if (
        !Number.isInteger(firstVertexIndex) ||
        !firstTransitionSet.has(
          firstVertexIndex
        )
      ) {
        return;
      }

      interlayerPairRecords.push({
        firstVertexIndex,
        secondVertexIndex,
        seedDot:
          dot(
            seedPositions[firstVertexIndex],
            seedPositions[secondVertexIndex]
          ),
      });
    }
  );

  const firstProgressByVertex =
    new Map();

  transitionVertexIndices.forEach(
    (vertexIndex) => {
      const quotientVertex =
        quotientMesh
          .quotientVertices[
          vertexIndex
        ];

      const parentIndex =
        quotientVertex
          ?.transitionParentCollarVertexIndex;

      const parentPoint =
        Number.isInteger(parentIndex)
          ? seedPositions[parentIndex]
          : null;

      const seedPoint =
        seedPositions[vertexIndex];

      if (!parentPoint || !seedPoint) {
        return;
      }

      const parentDot =
        dot(parentPoint, seedPoint);

      const tangent =
        normalize(
          subtract(
            seedPoint,
            scale(
              parentPoint,
              parentDot
            )
          )
        );

      const seedProgress =
        dot(seedPoint, tangent);

      firstProgressByVertex.set(
        vertexIndex,
        {
          parentIndex,
          tangent,
          seedProgress,
          minimumProgress:
            settings
              .minimumProgressFractionOfSeed *
            seedProgress,
        }
      );
    }
  );

  const secondProgressByVertex =
    new Map();

  interlayerPairRecords.forEach(
    (pair) => {
      const seedParent =
        seedPositions[
          pair.firstVertexIndex
        ];

      const seedChild =
        seedPositions[
          pair.secondVertexIndex
        ];

      const parentDot =
        dot(seedParent, seedChild);

      const tangent =
        normalize(
          subtract(
            seedChild,
            scale(
              seedParent,
              parentDot
            )
          )
        );

      const seedProgress =
        dot(seedChild, tangent);

      secondProgressByVertex.set(
        pair.secondVertexIndex,
        {
          parentIndex:
            pair.firstVertexIndex,
          seedChild,
          seedProgress,
          minimumProgress:
            settings
              .minimumProgressFractionOfSeed *
            seedProgress,
        }
      );
    }
  );

  const incidentCells =
    quotientMesh.quotientCells
      .map(
        (cell, cellIndex) => {
          const localMovableIndices =
            cell.quotientVertexIndices
              .map(
                (vertexIndex, localIndex) =>
                  movableSet.has(vertexIndex)
                    ? localIndex
                    : null
              )
              .filter(
                (localIndex) =>
                  localIndex !== null
              );

          return {
            cell,
            cellIndex,
            localMovableIndices,
            region:
              regionForCell(cell),
          };
        }
      )
      .filter(
        (record) =>
          record.localMovableIndices
            .length > 0
      );

  incidentCells.forEach(
    (record) => {
      const points =
        record.cell
          .quotientVertexIndices
          .map(
            (vertexIndex) =>
              seedPositions[vertexIndex]
          );

      const gradientNorms =
        record.localMovableIndices
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
        orientationWeight(record.cell);
    }
  );

  const incidentCellByIndex =
    new Map(
      incidentCells.map(
        (record) => [
          record.cellIndex,
          record,
        ]
      )
    );

  const firstTransitionCellRecords =
    incidentCells.filter(
      (record) =>
        record.region ===
        "cusp-transition-layer"
    );

  const secondTransitionCellRecords =
    incidentCells.filter(
      (record) =>
        record.region ===
        "cusp-transition-layer-2"
    );

  const refinedCoreBridgeCellRecords =
    incidentCells.filter(
      (record) =>
        record.region ===
        "refined-cusp-core-bridge"
    );

  function normalizedMargin(
    record,
    positions
  ) {
    const points =
      record.cell
        .quotientVertexIndices
        .map(
          (vertexIndex) =>
            positions[vertexIndex]
        );

    if (points.some((point) => !point)) {
      return -Infinity;
    }

    return (
      desiredRawSignByCell[
        record.cellIndex
      ] *
      determinant4(
        points[0],
        points[1],
        points[2],
        points[3]
      ) /
      record.orientationScale
    );
  }

  const protectedFirstTransitionCells =
    firstTransitionCellRecords.filter(
      (record) =>
        normalizedMargin(
          record,
          seedPositions
        ) > 0
    );

  const protectedSecondTransitionCells =
    secondTransitionCellRecords.filter(
      (record) =>
        normalizedMargin(
          record,
          seedPositions
        ) > 0
    );

  function protectedViolationCount(
    positions,
    records
  ) {
    return records.filter(
      (record) =>
        normalizedMargin(
          record,
          positions
        ) <= 0
    ).length;
  }

  function newlyInvertedRelativeToReference(
    trialPositions,
    referencePositions,
    records
  ) {
    return records.filter(
      (record) =>
        normalizedMargin(
          record,
          referencePositions
        ) > 0 &&
        normalizedMargin(
          record,
          trialPositions
        ) <= 0
    ).length;
  }

  function positiveMarginCount(
    positions,
    records
  ) {
    return records.filter(
      (record) =>
        normalizedMargin(
          record,
          positions
        ) > 0
    ).length;
  }

  function minimumNormalizedMargin(
    positions
  ) {
    return incidentCells.reduce(
      (minimum, record) =>
        Math.min(
          minimum,
          normalizedMargin(
            record,
            positions
          )
        ),
      Infinity
    );
  }

  function countEndpointDegeneracies(
    positions
  ) {
    let count = 0;

    incidentCells.forEach(
      (record) => {
        const points =
          record.cell
            .quotientVertexIndices
            .map(
              (vertexIndex) =>
                positions[vertexIndex]
            );

        if (points.some((point) => !point)) {
          count += 1;
          return;
        }

        const determinant =
          determinant4(
            points[0],
            points[1],
            points[2],
            points[3]
          );

        if (
          Math.abs(determinant) <=
          ENDPOINT_DEGENERACY_TOLERANCE
        ) {
          count += 1;
        }
      }
    );

    return count;
  }

  function currentSecondTangent(
    positions,
    progress
  ) {
    const parentPoint =
      positions[progress.parentIndex];

    const seedChild =
      progress.seedChild;

    const parentDot =
      dot(parentPoint, seedChild);

    return normalize(
      subtract(
        seedChild,
        scale(
          parentPoint,
          parentDot
        )
      )
    );
  }

  function applyProgressConstraints(
    positions
  ) {
    let projectionCount = 0;

    firstProgressByVertex.forEach(
      (progress, vertexIndex) => {
        const projected =
          projectToSphericalCap(
            positions[vertexIndex],
            progress.tangent,
            progress.minimumProgress
          );

        positions[vertexIndex] =
          projected.point;

        if (projected.projected) {
          projectionCount += 1;
        }
      }
    );

    secondProgressByVertex.forEach(
      (progress, vertexIndex) => {
        const tangent =
          currentSecondTangent(
            positions,
            progress
          );

        const projected =
          projectToSphericalCap(
            positions[vertexIndex],
            tangent,
            progress.minimumProgress
          );

        positions[vertexIndex] =
          projected.point;

        if (projected.projected) {
          projectionCount += 1;
        }
      }
    );

    return projectionCount;
  }

  function progressSummary(positions) {
    const firstFractions = [];
    const secondFractions = [];
    let violationCount = 0;

    firstProgressByVertex.forEach(
      (progress, vertexIndex) => {
        const actual =
          dot(
            positions[vertexIndex],
            progress.tangent
          );

        if (
          actual <
          progress.minimumProgress -
            1e-10
        ) {
          violationCount += 1;
        }

        if (
          Math.abs(progress.seedProgress) >
          EPSILON
        ) {
          firstFractions.push(
            actual /
            progress.seedProgress
          );
        }
      }
    );

    secondProgressByVertex.forEach(
      (progress, vertexIndex) => {
        const tangent =
          currentSecondTangent(
            positions,
            progress
          );

        const actual =
          dot(
            positions[vertexIndex],
            tangent
          );

        if (
          actual <
          progress.minimumProgress -
            1e-10
        ) {
          violationCount += 1;
        }

        if (
          Math.abs(progress.seedProgress) >
          EPSILON
        ) {
          secondFractions.push(
            actual /
            progress.seedProgress
          );
        }
      }
    );

    return {
      violationCount,
      firstMinimumFraction:
        firstFractions.length
          ? Math.min(...firstFractions)
          : 0,
      secondMinimumFraction:
        secondFractions.length
          ? Math.min(...secondFractions)
          : 0,
      minimumFraction:
        [
          ...firstFractions,
          ...secondFractions,
        ].length
          ? Math.min(
              ...firstFractions,
              ...secondFractions
            )
          : 0,
    };
  }

  function evaluateEnergyAndForces(
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

    let orientationEnergy = 0;
    let firstMetricEnergy = 0;
    let secondMetricEnergy = 0;
    let interlayerEnergy = 0;
    let seedEnergy = 0;

    incidentCells.forEach(
      (record) => {
        const points =
          record.cell
            .quotientVertexIndices
            .map(
              (vertexIndex) =>
                positions[vertexIndex]
            );

        if (points.some((point) => !point)) {
          return;
        }

        const determinant =
          determinant4(
            points[0],
            points[1],
            points[2],
            points[3]
          );

        const margin =
          desiredRawSignByCell[
            record.cellIndex
          ] *
          determinant /
          record.orientationScale;

        const deficit =
          settings.orientationMarginTarget -
          margin;

        if (deficit <= 0) {
          return;
        }

        orientationEnergy +=
          record.orientationWeight *
          deficit *
          deficit;

        if (!includeForces) {
          return;
        }

        record.localMovableIndices.forEach(
          (localIndex) => {
            const vertexIndex =
              record.cell
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
              2 *
              record.orientationWeight *
              deficit *
              desiredRawSignByCell[
                record.cellIndex
              ] /
              record.orientationScale;

            addInPlace(
              forces.get(vertexIndex),
              gradient,
              coefficient
            );
          }
        );
      }
    );

    function addSurfaceMetric(
      records,
      weight
    ) {
      let energy = 0;

      records.forEach(
        (edge) => {
          const first =
            positions[edge.first];
          const second =
            positions[edge.second];

          const error =
            dot(first, second) -
            edge.seedDot;

          energy +=
            weight *
            error *
            error;

          if (!includeForces) {
            return;
          }

          addInPlace(
            forces.get(edge.first),
            second,
            -2 * weight * error
          );

          addInPlace(
            forces.get(edge.second),
            first,
            -2 * weight * error
          );
        }
      );

      return energy;
    }

    firstMetricEnergy =
      addSurfaceMetric(
        firstSurfaceEdgeRecords,
        settings.firstSurfaceMetricWeight
      );

    secondMetricEnergy =
      addSurfaceMetric(
        secondSurfaceEdgeRecords,
        settings.secondSurfaceMetricWeight
      );

    interlayerPairRecords.forEach(
      (pair) => {
        const first =
          positions[
            pair.firstVertexIndex
          ];

        const second =
          positions[
            pair.secondVertexIndex
          ];

        const error =
          dot(first, second) -
          pair.seedDot;

        interlayerEnergy +=
          settings.interlayerMetricWeight *
          error *
          error;

        if (!includeForces) {
          return;
        }

        addInPlace(
          forces.get(
            pair.firstVertexIndex
          ),
          second,
          -2 *
            settings.interlayerMetricWeight *
            error
        );

        addInPlace(
          forces.get(
            pair.secondVertexIndex
          ),
          first,
          -2 *
            settings.interlayerMetricWeight *
            error
        );
      }
    );

    movableVertexIndices.forEach(
      (vertexIndex) => {
        const point = positions[vertexIndex];
        const seedPoint =
          seedPositions[vertexIndex];

        let weight =
          settings.deepSeedWeight;

        if (
          firstTransitionSet.has(
            vertexIndex
          )
        ) {
          weight =
            settings.firstSurfaceSeedWeight;
        } else if (
          secondTransitionSet.has(
            vertexIndex
          )
        ) {
          weight =
            settings.secondSurfaceSeedWeight;
        }

        const deficit =
          1 - dot(point, seedPoint);

        seedEnergy +=
          weight *
          deficit *
          deficit;

        if (includeForces) {
          addInPlace(
            forces.get(vertexIndex),
            seedPoint,
            2 * weight * deficit
          );
        }
      }
    );

    if (includeForces) {
      movableVertexIndices.forEach(
        (vertexIndex) => {
          forces.set(
            vertexIndex,
            tangentProjection(
              forces.get(vertexIndex),
              positions[vertexIndex]
            )
          );
        }
      );
    }

    return {
      energy:
        orientationEnergy +
        firstMetricEnergy +
        secondMetricEnergy +
        interlayerEnergy +
        seedEnergy,
      orientationEnergy,
      firstMetricEnergy,
      secondMetricEnergy,
      interlayerEnergy,
      seedEnergy,
      forces,
    };
  }

  function controlledMismatchCount(
    orientationAudit
  ) {
    return orientationAudit
      .orientationMismatchCellIndices
      .filter(
        (cellIndex) =>
          incidentCellByIndex.has(
            cellIndex
          )
      )
      .length;
  }

  function stateScore(
    positions,
    fullState,
    energy
  ) {
    return {
      degenerateCellCount:
        fullState.cellState
          .summary
          .degenerateCellCount,
      controlledMismatchCount:
        controlledMismatchCount(
          fullState.orientationAudit
        ),
      minimumNormalizedMargin:
        minimumNormalizedMargin(
          positions
        ),
      energy,
    };
  }

  function isBetterScore(first, second) {
    if (
      first.degenerateCellCount !==
      second.degenerateCellCount
    ) {
      return (
        first.degenerateCellCount <
        second.degenerateCellCount
      );
    }

    if (
      first.controlledMismatchCount !==
      second.controlledMismatchCount
    ) {
      return (
        first.controlledMismatchCount <
        second.controlledMismatchCount
      );
    }

    if (
      Math.abs(
        first.minimumNormalizedMargin -
        second.minimumNormalizedMargin
      ) > 1e-10
    ) {
      return (
        first.minimumNormalizedMargin >
        second.minimumNormalizedMargin
      );
    }

    return first.energy < second.energy;
  }

  let currentPositions =
    clonePositions(seedPositions);

  const initialEnergy =
    evaluateEnergyAndForces(
      currentPositions,
      false
    ).energy;

  let bestPositions =
    clonePositions(currentPositions);

  let bestFullState =
    seedFullState;

  let bestEnergy =
    initialEnergy;

  let bestScore =
    stateScore(
      bestPositions,
      bestFullState,
      bestEnergy
    );

  let acceptedStepCount = 0;
  let rejectedStepCount = 0;
  let progressProjectionCount = 0;
  let transitionProtectionRejectionCount = 0;
  let bridgeProtectionRejectionCount = 0;
  let endpointDegeneracyRejectionCount = 0;
  let completedRoundCount = 0;

  function historyRow(
    round,
    positions,
    fullState,
    energy
  ) {
    const groups =
      fullState.mismatchCountsByRegion;

    const progress =
      progressSummary(positions);

    return {
      round,
      orientationMismatchCount:
        fullState.orientationAudit
          .summary
          .orientationMismatchCount,
      controlledMismatchCount:
        controlledMismatchCount(
          fullState.orientationAudit
        ),
      firstTransitionMismatchCount:
        groups[
          "cusp-transition-layer"
        ]?.mismatchCount ?? 0,
      secondTransitionMismatchCount:
        groups[
          "cusp-transition-layer-2"
        ]?.mismatchCount ?? 0,
      refinedCoreMismatchCount:
        groups[
          "refined-cusp-core"
        ]?.mismatchCount ?? 0,
      largeMismatchCount:
        groups.large
          ?.mismatchCount ?? 0,
      minimumNormalizedMargin:
        minimumNormalizedMargin(
          positions
        ),
      degenerateCellCount:
        fullState.cellState
          .summary
          .degenerateCellCount,
      surfaceEnergy: energy,
      firstMinimumProgressFraction:
        progress.firstMinimumFraction,
      secondMinimumProgressFraction:
        progress.secondMinimumFraction,
    };
  }

  const history = [
    historyRow(
      0,
      currentPositions,
      seedFullState,
      initialEnergy
    ),
  ];

  for (
    let round = 0;
    round < settings.roundCount;
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
        evaluateEnergyAndForces(
          currentPositions,
          true
        );

      let maximumForceNorm = 0;

      movableVertexIndices.forEach(
        (vertexIndex) => {
          maximumForceNorm =
            Math.max(
              maximumForceNorm,
              norm(
                evaluation.forces.get(
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
        maximumForceNorm < 1e-10
      ) {
        break;
      }

      let accepted = false;

      for (
        let lineSearch = 0;
        lineSearch < 6;
        lineSearch += 1
      ) {
        const trialStep =
          stepSize *
          Math.pow(0.5, lineSearch);

        const forceScale =
          trialStep /
          maximumForceNorm;

        const trialPositions =
          clonePositions(currentPositions);

        movableVertexIndices.forEach(
          (vertexIndex) => {
            const point =
              currentPositions[vertexIndex];

            const force =
              evaluation.forces.get(
                vertexIndex
              );

            trialPositions[vertexIndex] =
              normalize(
                {
                  x:
                    point.x +
                    forceScale * force.x,
                  y:
                    point.y +
                    forceScale * force.y,
                  z:
                    point.z +
                    forceScale * force.z,
                  w:
                    point.w +
                    forceScale * force.w,
                },
                point
              );
          }
        );

        progressProjectionCount +=
          applyProgressConstraints(
            trialPositions
          );

        const progress =
          progressSummary(
            trialPositions
          );

        if (progress.violationCount > 0) {
          rejectedStepCount += 1;
          continue;
        }

        const protectedTransitionViolations =
          protectedViolationCount(
            trialPositions,
            protectedFirstTransitionCells
          ) +
          protectedViolationCount(
            trialPositions,
            protectedSecondTransitionCells
          );

        if (
          protectedTransitionViolations > 0
        ) {
          transitionProtectionRejectionCount +=
            1;

          rejectedStepCount += 1;
          continue;
        }

        if (
          countEndpointDegeneracies(
            trialPositions
          ) > 0
        ) {
          endpointDegeneracyRejectionCount +=
            1;
          rejectedStepCount += 1;
          continue;
        }

        const trialEnergy =
          evaluateEnergyAndForces(
            trialPositions,
            false
          ).energy;

        if (
          Number.isFinite(trialEnergy) &&
          trialEnergy <
            evaluation.energy -
            1e-12
        ) {
          currentPositions =
            trialPositions;

          stepSize =
            Math.min(
              settings.maximumStepSize,
              trialStep * 1.08
            );

          acceptedStepCount += 1;
          accepted = true;
          break;
        }
      }

      if (!accepted) {
        rejectedStepCount += 1;
        stepSize *= 0.5;

        if (stepSize < 1e-5) {
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

    const energy =
      evaluateEnergyAndForces(
        currentPositions,
        false
      ).energy;

    history.push(
      historyRow(
        round + 1,
        currentPositions,
        fullState,
        energy
      )
    );

    const score =
      stateScore(
        currentPositions,
        fullState,
        energy
      );

    if (isBetterScore(score, bestScore)) {
      bestPositions =
        clonePositions(currentPositions);
      bestFullState = fullState;
      bestEnergy = energy;
      bestScore = score;
    }
  }

  const finalEnergy =
    evaluateEnergyAndForces(
      bestPositions,
      false
    ).energy;

  const finalProgress =
    progressSummary(bestPositions);

  const firstAngularDisplacements =
    transitionVertexIndices.map(
      (vertexIndex) =>
        angularDisplacementDegrees(
          seedPositions[vertexIndex],
          bestPositions[vertexIndex]
        )
    );

  const secondAngularDisplacements =
    secondTransitionVertexIndices.map(
      (vertexIndex) =>
        angularDisplacementDegrees(
          seedPositions[vertexIndex],
          bestPositions[vertexIndex]
        )
    );

  const deepAngularDisplacements =
    deepInteriorVertexIndices.map(
      (vertexIndex) =>
        angularDisplacementDegrees(
          seedPositions[vertexIndex],
          bestPositions[vertexIndex]
        )
    );

  const surfaceAngularDisplacements = [
    ...firstAngularDisplacements,
    ...secondAngularDisplacements,
  ];

  function metricErrors(records) {
    return records.map(
      (edge) =>
        Math.abs(
          dot(
            bestPositions[edge.first],
            bestPositions[edge.second]
          ) -
          edge.seedDot
        )
    );
  }

  const materialEdgeErrors = [
    ...metricErrors(
      firstSurfaceEdgeRecords
    ),
    ...metricErrors(
      secondSurfaceEdgeRecords
    ),
  ];

  const initialGroups =
    seedFullState.mismatchCountsByRegion;

  const finalGroups =
    bestFullState.mismatchCountsByRegion;

  return {
    valid:
      bestPositions.every(Boolean),

    positions:
      bestPositions,

    finalDeepCoreHarmonicSystem:
      null,

    deepCoreLinearSolveSucceeded:
      true,

    history,

    initialMismatchCountsByRegion:
      initialGroups,

    finalMismatchCountsByRegion:
      finalGroups,

    summary: {
      transitionVertexCount:
        transitionVertexIndices.length,

      secondTransitionVertexCount:
        secondTransitionVertexIndices.length,

      deepInteriorVertexCount:
        deepInteriorVertexIndices.length,

      movableVertexCount:
        movableVertexIndices.length,

      transitionSurfaceEdgeCount:
        firstSurfaceEdges.length,

      secondTransitionSurfaceEdgeCount:
        secondSurfaceEdges.length,

      interlayerPairCount:
        interlayerPairRecords.length,

      incidentCellCount:
        incidentCells.length,

      globalOrientationSign,

      orientationMarginTarget:
        settings.orientationMarginTarget,

      refinedCoreBridgeOrientationWeight:
        settings
          .refinedCoreBridgeOrientationWeight,

      projectiveRoundCount:
        completedRoundCount,

      acceptedStepCount,
      rejectedStepCount,
      progressProjectionCount,
      transitionProtectionRejectionCount,
      bridgeProtectionRejectionCount,
      endpointDegeneracyRejectionCount,

      refinedCoreBridgeCellRecordCount:
        refinedCoreBridgeCellRecords.length,

      initialBridgePositiveMarginCount:
        positiveMarginCount(
          seedPositions,
          refinedCoreBridgeCellRecords
        ),

      finalBridgePositiveMarginCount:
        positiveMarginCount(
          bestPositions,
          refinedCoreBridgeCellRecords
        ),

      initialBridgeNonPositiveMarginCount:
        refinedCoreBridgeCellRecords.length -
        positiveMarginCount(
          seedPositions,
          refinedCoreBridgeCellRecords
        ),

      finalBridgeNonPositiveMarginCount:
        refinedCoreBridgeCellRecords.length -
        positiveMarginCount(
          bestPositions,
          refinedCoreBridgeCellRecords
        ),

      protectedTransitionCellCount:
        protectedFirstTransitionCells.length,

      protectedSecondTransitionCellCount:
        protectedSecondTransitionCells.length,

      minimumProgressFractionOfSeed:
        settings
          .minimumProgressFractionOfSeed,

      initialSurfaceEnergy:
        initialEnergy,

      finalSurfaceEnergy:
        finalEnergy,

      initialOrientationMismatchCount:
        seedFullState.orientationAudit
          .summary
          .orientationMismatchCount,

      finalOrientationMismatchCount:
        bestFullState.orientationAudit
          .summary
          .orientationMismatchCount,

      orientationMismatchImprovement:
        seedFullState.orientationAudit
          .summary
          .orientationMismatchCount -
        bestFullState.orientationAudit
          .summary
          .orientationMismatchCount,

      initialControlledMismatchCount:
        controlledMismatchCount(
          seedFullState.orientationAudit
        ),

      finalControlledMismatchCount:
        controlledMismatchCount(
          bestFullState.orientationAudit
        ),

      initialTransitionMismatchCount:
        initialGroups[
          "cusp-transition-layer"
        ]?.mismatchCount ?? 0,

      finalTransitionMismatchCount:
        finalGroups[
          "cusp-transition-layer"
        ]?.mismatchCount ?? 0,

      initialSecondTransitionMismatchCount:
        initialGroups[
          "cusp-transition-layer-2"
        ]?.mismatchCount ?? 0,

      finalSecondTransitionMismatchCount:
        finalGroups[
          "cusp-transition-layer-2"
        ]?.mismatchCount ?? 0,

      finalProtectedTransitionViolationCount:
        protectedViolationCount(
          bestPositions,
          protectedFirstTransitionCells
        ),

      finalProtectedSecondTransitionViolationCount:
        protectedViolationCount(
          bestPositions,
          protectedSecondTransitionCells
        ),

      initialRefinedCoreBridgeMismatchCount:
        initialGroups[
          "refined-cusp-core-bridge"
        ]?.mismatchCount ?? 0,

      finalRefinedCoreBridgeMismatchCount:
        finalGroups[
          "refined-cusp-core-bridge"
        ]?.mismatchCount ?? 0,

      initialRefinedCoreMismatchCount:
        initialGroups[
          "refined-cusp-core"
        ]?.mismatchCount ?? 0,

      finalRefinedCoreMismatchCount:
        finalGroups[
          "refined-cusp-core"
        ]?.mismatchCount ?? 0,

      initialLargeMismatchCount:
        initialGroups.large
          ?.mismatchCount ?? 0,

      finalLargeMismatchCount:
        finalGroups.large
          ?.mismatchCount ?? 0,

      initialMinimumNormalizedMargin:
        minimumNormalizedMargin(
          seedPositions
        ),

      finalMinimumNormalizedMargin:
        minimumNormalizedMargin(
          bestPositions
        ),

      initialDegenerateCellCount:
        seedFullState.cellState
          .summary
          .degenerateCellCount,

      finalDegenerateCellCount:
        bestFullState.cellState
          .summary
          .degenerateCellCount,

      maximumAngularDisplacementDegrees:
        surfaceAngularDisplacements.length
          ? Math.max(
              ...surfaceAngularDisplacements
            )
          : 0,

      meanAngularDisplacementDegrees:
        surfaceAngularDisplacements.length
          ? surfaceAngularDisplacements.reduce(
              (sum, value) =>
                sum + value,
              0
            ) /
            surfaceAngularDisplacements.length
          : 0,

      maximumFirstSurfaceAngularDisplacementDegrees:
        firstAngularDisplacements.length
          ? Math.max(
              ...firstAngularDisplacements
            )
          : 0,

      meanFirstSurfaceAngularDisplacementDegrees:
        firstAngularDisplacements.length
          ? firstAngularDisplacements.reduce(
              (sum, value) =>
                sum + value,
              0
            ) /
            firstAngularDisplacements.length
          : 0,

      maximumSecondSurfaceAngularDisplacementDegrees:
        secondAngularDisplacements.length
          ? Math.max(
              ...secondAngularDisplacements
            )
          : 0,

      meanSecondSurfaceAngularDisplacementDegrees:
        secondAngularDisplacements.length
          ? secondAngularDisplacements.reduce(
              (sum, value) =>
                sum + value,
              0
            ) /
            secondAngularDisplacements.length
          : 0,

      maximumDeepAngularDisplacementDegrees:
        deepAngularDisplacements.length
          ? Math.max(
              ...deepAngularDisplacements
            )
          : 0,

      meanDeepAngularDisplacementDegrees:
        deepAngularDisplacements.length
          ? deepAngularDisplacements.reduce(
              (sum, value) =>
                sum + value,
              0
            ) /
            deepAngularDisplacements.length
          : 0,

      minimumProgressFraction:
        finalProgress.minimumFraction,

      firstMinimumProgressFraction:
        finalProgress.firstMinimumFraction,

      secondMinimumProgressFraction:
        finalProgress.secondMinimumFraction,

      hardProgressViolationCount:
        finalProgress.violationCount,

      maximumMaterialEdgeDotError:
        materialEdgeErrors.length
          ? Math.max(...materialEdgeErrors)
          : 0,

      meanMaterialEdgeDotError:
        materialEdgeErrors.length
          ? materialEdgeErrors.reduce(
              (sum, value) =>
                sum + value,
              0
            ) /
            materialEdgeErrors.length
          : 0,
    },
  };
}
