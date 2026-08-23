/*
 * Nonlinear S³ untangling for the compact figure-eight quotient mesh.
 *
 * Boundary vertices never move. Only the canonical interior quotient
 * vertices are updated, always tangent to S³ and renormalized after
 * each accepted step.
 */

const EPS = 1e-12;
const DEGENERATE_TOLERANCE = 1e-10;


function p4(x, y, z, w) {
  return {
    x,
    y,
    z,
    w,
  };
}


function clone4(point) {
  return p4(
    point.x,
    point.y,
    point.z,
    point.w
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


function distance4(first, second) {
  return Math.hypot(
    first.x - second.x,
    first.y - second.y,
    first.z - second.z,
    first.w - second.w
  );
}


function normalize4(
  point,
  fallback
) {
  const norm =
    norm4(point);

  if (
    Number.isFinite(norm) &&
    norm > EPS
  ) {
    return p4(
      point.x / norm,
      point.y / norm,
      point.z / norm,
      point.w / norm
    );
  }

  return fallback
    ? clone4(fallback)
    : p4(0, 0, 0, 1);
}


function determinant4(
  first,
  second,
  third,
  fourth
) {
  const matrix = [
    [
      first.x,
      second.x,
      third.x,
      fourth.x,
    ],
    [
      first.y,
      second.y,
      third.y,
      fourth.y,
    ],
    [
      first.z,
      second.z,
      third.z,
      fourth.z,
    ],
    [
      first.w,
      second.w,
      third.w,
      fourth.w,
    ],
  ].map(
    (row) => [...row]
  );

  let determinant = 1;
  let sign = 1;

  for (
    let column = 0;
    column < 4;
    column += 1
  ) {
    let pivotRow =
      column;

    let pivotMagnitude =
      Math.abs(
        matrix[
          pivotRow
        ][
          column
        ]
      );

    for (
      let row =
        column + 1;
      row < 4;
      row += 1
    ) {
      const magnitude =
        Math.abs(
          matrix[
            row
          ][
            column
          ]
        );

      if (
        magnitude >
        pivotMagnitude
      ) {
        pivotMagnitude =
          magnitude;

        pivotRow =
          row;
      }
    }

    if (
      pivotMagnitude <
      EPS
    ) {
      return 0;
    }

    if (
      pivotRow !==
      column
    ) {
      [
        matrix[column],
        matrix[pivotRow],
      ] = [
        matrix[pivotRow],
        matrix[column],
      ];

      sign *= -1;
    }

    const pivot =
      matrix[
        column
      ][
        column
      ];

    determinant *=
      pivot;

    for (
      let row =
        column + 1;
      row < 4;
      row += 1
    ) {
      const factor =
        matrix[
          row
        ][
          column
        ] /
        pivot;

      for (
        let inner =
          column + 1;
        inner < 4;
        inner += 1
      ) {
        matrix[
          row
        ][
          inner
        ] -=
          factor *
          matrix[
            column
          ][
            inner
          ];
      }
    }
  }

  return (
    determinant *
    sign
  );
}


function determinantGradient(
  points,
  columnIndex
) {
  const basis = [
    p4(1, 0, 0, 0),
    p4(0, 1, 0, 0),
    p4(0, 0, 1, 0),
    p4(0, 0, 0, 1),
  ];

  function component(
    basisPoint
  ) {
    const columns =
      [...points];

    columns[
      columnIndex
    ] =
      basisPoint;

    return determinant4(
      columns[0],
      columns[1],
      columns[2],
      columns[3]
    );
  }

  return p4(
    component(basis[0]),
    component(basis[1]),
    component(basis[2]),
    component(basis[3])
  );
}


function tangentGradient(
  point,
  gradient
) {
  const radial =
    point.x * gradient.x +
    point.y * gradient.y +
    point.z * gradient.z +
    point.w * gradient.w;

  return p4(
    gradient.x -
      radial *
        point.x,

    gradient.y -
      radial *
        point.y,

    gradient.z -
      radial *
        point.z,

    gradient.w -
      radial *
        point.w
  );
}


function addScaled(
  target,
  gradient,
  scale
) {
  target.x +=
    scale *
    gradient.x;

  target.y +=
    scale *
    gradient.y;

  target.z +=
    scale *
    gradient.z;

  target.w +=
    scale *
    gradient.w;
}


function softplus(value) {
  if (value > 40) {
    return value;
  }

  if (value < -40) {
    return Math.exp(value);
  }

  return Math.log1p(
    Math.exp(value)
  );
}


function sigmoid(value) {
  if (value >= 0) {
    const exponential =
      Math.exp(-value);

    return (
      1 /
      (
        1 +
        exponential
      )
    );
  }

  const exponential =
    Math.exp(value);

  return (
    exponential /
    (
      1 +
      exponential
    )
  );
}


function expectedSignsFromAudit(
  orientationAudit
) {
  const {
    topology,
    componentDiagnostics,
  } =
    orientationAudit;

  return topology
    .parityByCell
    .map(
      (
        parity,
        cellIndex
      ) => {
        const componentIndex =
          topology
            .componentByCell[
            cellIndex
          ];

        return (
          parity *
          componentDiagnostics[
            componentIndex
          ]
            .globalOrientationSign
        );
      }
    );
}


function evaluate({
  quotientMesh,
  positions,
  referencePositions,
  movable,
  expectedSigns,
  scales,
  margin,
  temperature,
  regularizationWeight,
  withGradient,
}) {
  const gradients =
    withGradient
      ? positions.map(
          () =>
            p4(
              0,
              0,
              0,
              0
            )
        )
      : null;

  let foldEnergy = 0;
  let regularizationEnergy = 0;

  let mismatchCount = 0;
  let degenerateCount = 0;

  let minimumCorrectedDeterminant =
    Infinity;

  let minimumCorrectedNormalizedDeterminant =
    Infinity;


  quotientMesh
    .quotientCells
    .forEach(
      (
        cell,
        cellIndex
      ) => {
        const points =
          cell
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

        const expectedSign =
          expectedSigns[
            cellIndex
          ];

        const correctedDeterminant =
          expectedSign *
          determinant;

        const correctedNormalizedDeterminant =
          correctedDeterminant /
          scales[
            cellIndex
          ];


        minimumCorrectedDeterminant =
          Math.min(
            minimumCorrectedDeterminant,
            correctedDeterminant
          );

        minimumCorrectedNormalizedDeterminant =
          Math.min(
            minimumCorrectedNormalizedDeterminant,
            correctedNormalizedDeterminant
          );


        if (
          correctedDeterminant <=
          0
        ) {
          mismatchCount +=
            1;
        }

        if (
          Math.abs(
            determinant
          ) <=
          DEGENERATE_TOLERANCE
        ) {
          degenerateCount +=
            1;
        }


        /*
         * Smooth squared hinge.
         *
         * It behaves approximately like
         *
         *   max(0, margin - q)^2
         *
         * but retains a nonzero derivative at q = 0, allowing
         * an inverted simplex to cross through zero.
         */
        const z =
          (
            margin -
            correctedNormalizedDeterminant
          ) /
          temperature;

        const gap =
          temperature *
          softplus(z);

        foldEnergy +=
          gap *
          gap;


        if (!withGradient) {
          return;
        }


        const derivativeByNormalizedDeterminant =
          -2 *
          gap *
          sigmoid(z);

        const derivativeByRawDeterminant =
          derivativeByNormalizedDeterminant *
          expectedSign /
          scales[
            cellIndex
          ];


        cell
          .quotientVertexIndices
          .forEach(
            (
              vertexIndex,
              localIndex
            ) => {
              if (
                !movable.has(
                  vertexIndex
                )
              ) {
                return;
              }

              addScaled(
                gradients[
                  vertexIndex
                ],

                determinantGradient(
                  points,
                  localIndex
                ),

                derivativeByRawDeterminant
              );
            }
          );
      }
    );


  positions.forEach(
    (
      position,
      vertexIndex
    ) => {
      if (
        !movable.has(
          vertexIndex
        )
      ) {
        return;
      }

      const reference =
        referencePositions[
          vertexIndex
        ];

      const dx =
        position.x -
        reference.x;

      const dy =
        position.y -
        reference.y;

      const dz =
        position.z -
        reference.z;

      const dw =
        position.w -
        reference.w;

      regularizationEnergy +=
        0.5 *
        regularizationWeight *
        (
          dx * dx +
          dy * dy +
          dz * dz +
          dw * dw
        );


      if (withGradient) {
        gradients[
          vertexIndex
        ].x +=
          regularizationWeight *
          dx;

        gradients[
          vertexIndex
        ].y +=
          regularizationWeight *
          dy;

        gradients[
          vertexIndex
        ].z +=
          regularizationWeight *
          dz;

        gradients[
          vertexIndex
        ].w +=
          regularizationWeight *
          dw;
      }
    }
  );


  return {
    energy:
      foldEnergy +
      regularizationEnergy,

    foldEnergy,

    regularizationEnergy,

    mismatchCount,

    degenerateCount,

    minimumCorrectedDeterminant:
      Number.isFinite(
        minimumCorrectedDeterminant
      )
        ? minimumCorrectedDeterminant
        : 0,

    minimumCorrectedNormalizedDeterminant:
      Number.isFinite(
        minimumCorrectedNormalizedDeterminant
      )
        ? minimumCorrectedNormalizedDeterminant
        : 0,

    gradients,
  };
}


function clonePositions(
  positions
) {
  return positions.map(
    clone4
  );
}


function buildMismatchLocalization({
  quotientMesh,
  positions,
  movable,
  expectedSigns,
  scales,
}) {
  const regionBuckets =
    new Map();

  const tetrahedronBuckets =
    new Map();

  const movableCountBuckets =
    new Map();

  const boundaryFaceBuckets =
    new Map();

  const vertexBuckets =
    new Map();

  const mismatchCellIndices =
    [];

  const mismatchCells =
    [];


  function incrementBucket(
    map,
    key,
    mismatch
  ) {
    if (!map.has(key)) {
      map.set(
        key,
        {
          key,
          cellCount: 0,
          mismatchCount: 0,
        }
      );
    }

    const bucket =
      map.get(key);

    bucket.cellCount +=
      1;

    if (mismatch) {
      bucket.mismatchCount +=
        1;
    }
  }


  /*
   * Prepare one record for each of the movable quotient vertices.
   */
  [...movable]
    .sort(
      (a, b) => a - b
    )
    .forEach(
      (vertexIndex) => {
        const quotientVertex =
          quotientMesh
            .quotientVertices[
            vertexIndex
          ];

        vertexBuckets.set(
          vertexIndex,
          {
            quotientVertexIndex:
              vertexIndex,

            kinds:
              quotientVertex
                ?.kinds ??
              [],

            memberRefs:
              quotientVertex
                ?.memberRefs ??
              [],

            incidentCellCount: 0,
            mismatchIncidentCellCount: 0,

            cuspBoundaryIncidentCellCount: 0,
            cuspBoundaryMismatchCellCount: 0,

            largeFaceIncidentCellCount: 0,
            largeFaceMismatchCellCount: 0,
          }
        );
      }
    );


  quotientMesh
    .quotientCells
    .forEach(
      (
        cell,
        cellIndex
      ) => {
        const points =
          cell
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

        const correctedDeterminant =
          expectedSigns[
            cellIndex
          ] *
          determinant;

        const correctedNormalizedDeterminant =
          correctedDeterminant /
          scales[
            cellIndex
          ];

        const mismatch =
          correctedDeterminant <=
          0;

        const movableVertexIndices =
          cell
            .quotientVertexIndices
            .filter(
              (vertexIndex) =>
                movable.has(
                  vertexIndex
                )
            );

        const region =
          cell
            .sourceBoundaryKind ===
          "cusp"
            ? "cusp-boundary"
            : cell
                  .sourceBoundaryKind ===
                "large"
              ? "large-face"
              : cell
                  .sourceBoundaryKind ??
                "unknown";

        const tetrahedronId =
          cell.tetrahedronId ??
          "unknown";

        const boundaryFaceId =
          cell
            .sourceBoundaryFaceId ??
          "unknown";


        incrementBucket(
          regionBuckets,
          region,
          mismatch
        );

        incrementBucket(
          tetrahedronBuckets,
          tetrahedronId,
          mismatch
        );

        incrementBucket(
          movableCountBuckets,
          movableVertexIndices
            .length,
          mismatch
        );

        incrementBucket(
          boundaryFaceBuckets,
          `${tetrahedronId}:${boundaryFaceId}`,
          mismatch
        );


        /*
         * Attribute this cell to every movable vertex that controls it.
         */
        movableVertexIndices.forEach(
          (vertexIndex) => {
            const bucket =
              vertexBuckets.get(
                vertexIndex
              );

            if (!bucket) {
              return;
            }

            bucket.incidentCellCount +=
              1;

            if (
              region ===
              "cusp-boundary"
            ) {
              bucket
                .cuspBoundaryIncidentCellCount +=
                1;
            }

            if (
              region ===
              "large-face"
            ) {
              bucket
                .largeFaceIncidentCellCount +=
                1;
            }

            if (!mismatch) {
              return;
            }

            bucket
              .mismatchIncidentCellCount +=
              1;

            if (
              region ===
              "cusp-boundary"
            ) {
              bucket
                .cuspBoundaryMismatchCellCount +=
                1;
            }

            if (
              region ===
              "large-face"
            ) {
              bucket
                .largeFaceMismatchCellCount +=
                1;
            }
          }
        );


        if (!mismatch) {
          return;
        }

        mismatchCellIndices.push(
          cellIndex
        );

        mismatchCells.push({
          quotientCellIndex:
            cellIndex,

          tetrahedronId,

          region,

          boundaryFaceId,

          sourceCellId:
            cell.sourceCellId,

          movableVertexCount:
            movableVertexIndices
              .length,

          movableVertexIndices,

          quotientVertexIndices: [
            ...cell
              .quotientVertexIndices,
          ],

          correctedDeterminant,

          correctedNormalizedDeterminant,
        });
      }
    );


  function bucketRows(
    map,
    label
  ) {
    return [...map.values()]
      .map(
        (bucket) => ({
          [label]:
            bucket.key,

          cellCount:
            bucket.cellCount,

          mismatchCount:
            bucket
              .mismatchCount,

          mismatchFraction:
            bucket.cellCount > 0
              ? bucket
                  .mismatchCount /
                bucket.cellCount
              : 0,
        })
      )
      .sort(
        (first, second) =>
          second
            .mismatchCount -
            first
              .mismatchCount ||
          String(
            first[label]
          ).localeCompare(
            String(
              second[label]
            )
          )
      );
  }


  const byInteriorVertex =
    [...vertexBuckets.values()]
      .map(
        (bucket) => ({
          ...bucket,

          mismatchFraction:
            bucket
              .incidentCellCount > 0
              ? bucket
                  .mismatchIncidentCellCount /
                bucket
                  .incidentCellCount
              : 0,
        })
      )
      .sort(
        (first, second) =>
          second
            .mismatchIncidentCellCount -
            first
              .mismatchIncidentCellCount ||
          second
            .mismatchFraction -
            first
              .mismatchFraction ||
          first
            .quotientVertexIndex -
            second
              .quotientVertexIndex
      );


  const byMovableVertexCount =
    bucketRows(
      movableCountBuckets,
      "movableVertexCount"
    );

  const bySourceRegion =
    bucketRows(
      regionBuckets,
      "region"
    );

  const byTetrahedron =
    bucketRows(
      tetrahedronBuckets,
      "tetrahedronId"
    );

  const bySourceBoundaryFace =
    bucketRows(
      boundaryFaceBuckets,
      "sourceBoundaryFace"
    );


  function mismatchCountFor(
    rows,
    key,
    value
  ) {
    return (
      rows.find(
        (row) =>
          row[key] ===
          value
      )?.mismatchCount ??
      0
    );
  }


  /*
   * Show the worst cells first.
   */
  const worstMismatchCells =
    mismatchCells
      .slice()
      .sort(
        (first, second) =>
          first
            .correctedNormalizedDeterminant -
          second
            .correctedNormalizedDeterminant
      )
      .slice(
        0,
        24
      );


  return {
    summary: {
      cellCount:
        quotientMesh
          .quotientCells
          .length,

      mismatchCount:
        mismatchCellIndices
          .length,

      cuspBoundaryMismatchCount:
        mismatchCountFor(
          bySourceRegion,
          "region",
          "cusp-boundary"
        ),

      largeFaceMismatchCount:
        mismatchCountFor(
          bySourceRegion,
          "region",
          "large-face"
        ),

      zeroMovableMismatchCount:
        mismatchCountFor(
          byMovableVertexCount,
          "movableVertexCount",
          0
        ),

      oneMovableMismatchCount:
        mismatchCountFor(
          byMovableVertexCount,
          "movableVertexCount",
          1
        ),

      twoMovableMismatchCount:
        mismatchCountFor(
          byMovableVertexCount,
          "movableVertexCount",
          2
        ),

      threeMovableMismatchCount:
        mismatchCountFor(
          byMovableVertexCount,
          "movableVertexCount",
          3
        ),

      fourMovableMismatchCount:
        mismatchCountFor(
          byMovableVertexCount,
          "movableVertexCount",
          4
        ),
    },

    mismatchCellIndices,

    bySourceRegion,

    byTetrahedron,

    byMovableVertexCount,

    bySourceBoundaryFace,

    byInteriorVertex,

    worstMismatchCells,
  };
}


function better(
  candidate,
  incumbent
) {
  if (!incumbent) {
    return true;
  }

  if (
    candidate.mismatchCount !==
    incumbent.mismatchCount
  ) {
    return (
      candidate.mismatchCount <
      incumbent.mismatchCount
    );
  }

  if (
    candidate.degenerateCount !==
    incumbent.degenerateCount
  ) {
    return (
      candidate.degenerateCount <
      incumbent.degenerateCount
    );
  }

  if (
    candidate
      .minimumCorrectedNormalizedDeterminant !==
    incumbent
      .minimumCorrectedNormalizedDeterminant
  ) {
    return (
      candidate
        .minimumCorrectedNormalizedDeterminant >
      incumbent
        .minimumCorrectedNormalizedDeterminant
    );
  }

  return (
    candidate.energy <
    incumbent.energy
  );
}


export function runIntrinsicS3NonlinearRelaxation({
  quotientMesh,
  initialPositions,
  interiorVertexIndices,
  orientationAudit,
  initialCellState,
  options = {},
}) {
  const maximumIterations =
    Math.max(
      1,
      Math.round(
        options
          .maximumIterations ??
        1200
      )
    );

  const margin =
    options.margin ??
    0.035;

  const temperature =
    Math.max(
      1e-4,
      options.temperature ??
      0.075
    );

  const regularizationWeight =
    Math.max(
      0,
      options
        .regularizationWeight ??
      0.0015
    );

  const initialStep =
    Math.max(
      1e-6,
      options.initialStep ??
      0.08
    );

  const maximumStep =
    Math.max(
      initialStep,
      options.maximumStep ??
      0.24
    );

  const minimumStep =
    Math.max(
      1e-12,
      options.minimumStep ??
      1e-8
    );

  const gradientClip =
    Math.max(
      1e-6,
      options.gradientClip ??
      4
    );

  const logEvery =
    Math.max(
      1,
      Math.round(
        options.logEvery ??
        50
      )
    );

  const log =
    options.log ??
    true;

  /*
   * Optional lexicographic safety gate for difficult continuation
   * stages.
   *
   * When enabled, a line-search trial may lower the smooth energy only
   * if it does NOT increase either:
   *
   *   • the number of orientation mismatches;
   *   • the number of degenerate tetrahedra.
   *
   * The default remains false so existing solver behavior is unchanged.
   */
  const orientationMonotone =
    options
      .orientationMonotone ===
    true;


  /*
   * ============================================================
   * OPTIONAL ACTIVE INTERIOR BLOCK
   * ============================================================
   *
   * By default every supplied interior vertex remains movable.
   *
   * For block-coordinate untangling, options.activeInteriorVertexIndices
   * may select a strict subset. All other interior vertices are then
   * frozen exactly like additional Dirichlet data for this solve.
   */
  const allowedInteriorVertices =
    new Set(
      interiorVertexIndices
    );

  const activeInteriorVertexIndices =
    Array.isArray(
      options.activeInteriorVertexIndices
    )
      ? [
          ...new Set(
            options
              .activeInteriorVertexIndices
              .filter(
                (vertexIndex) =>
                  Number.isInteger(
                    vertexIndex
                  ) &&
                  allowedInteriorVertices
                    .has(
                      vertexIndex
                    )
              )
          ),
        ]
          .sort(
            (first, second) =>
              first - second
          )
      : [
          ...interiorVertexIndices,
        ];


  const movable =
    new Set(
      activeInteriorVertexIndices
    );

  const expectedSigns =
    expectedSignsFromAudit(
      orientationAudit
    );

  /*
   * Normalize each cell by its starting determinant magnitude.
   *
   * This prevents the large cells from overwhelming the small
   * refined cells simply because of scale.
   */
  const scales =
    initialCellState
      .cells
      .map(
        (cell) =>
          Math.max(
            cell
              .absoluteDeterminant,

            1e-6
          )
      );


  const referencePositions =
    clonePositions(
      initialPositions
    );

  let positions =
    clonePositions(
      initialPositions
    );

  let step =
    initialStep;

  let acceptedIterationCount =
    0;

  let rejectedStepCount =
    0;

  let orientationMonotoneRejectionCount =
    0;

  let stalled =
    false;

  const history = [];


  let current =
    evaluate({
      quotientMesh,
      positions,
      referencePositions,
      movable,
      expectedSigns,
      scales,
      margin,
      temperature,
      regularizationWeight,
      withGradient:
        true,
    });


  let bestPositions =
    clonePositions(
      positions
    );

  let bestEvaluation = {
    ...current,
    gradients:
      null,
  };


  function record(
    iteration
  ) {
    const entry = {
      iteration,

      mismatchCount:
        current
          .mismatchCount,

      degenerateCount:
        current
          .degenerateCount,

      minimumCorrectedDeterminant:
        current
          .minimumCorrectedDeterminant,

      minimumCorrectedNormalizedDeterminant:
        current
          .minimumCorrectedNormalizedDeterminant,

      energy:
        current.energy,

      step,
    };

    history.push(
      entry
    );

    if (log) {
      console.info(
        `[intrinsic-s3-relax] iteration ${iteration}`,
        entry
      );
    }
  }


  record(0);


  for (
    let iteration = 1;
    iteration <= maximumIterations;
    iteration += 1
  ) {
    const tangentGradients =
      new Map();

    let maximumGradientMagnitude =
      0;


    activeInteriorVertexIndices.forEach(
      (vertexIndex) => {
        const tangent =
          tangentGradient(
            positions[
              vertexIndex
            ],

            current
              .gradients[
              vertexIndex
            ]
          );

        const magnitude =
          norm4(
            tangent
          );

        maximumGradientMagnitude =
          Math.max(
            maximumGradientMagnitude,
            magnitude
          );


        if (
          magnitude >
          gradientClip
        ) {
          const scale =
            gradientClip /
            magnitude;

          tangent.x *=
            scale;

          tangent.y *=
            scale;

          tangent.z *=
            scale;

          tangent.w *=
            scale;
        }


        tangentGradients.set(
          vertexIndex,
          tangent
        );
      }
    );


    if (
      maximumGradientMagnitude <
      1e-10
    ) {
      stalled =
        true;

      break;
    }


    let accepted =
      false;

    let trialStep =
      step;


    for (
      let lineSearch = 0;
      lineSearch < 16;
      lineSearch += 1
    ) {
      const trialPositions =
        clonePositions(
          positions
        );


      activeInteriorVertexIndices.forEach(
        (vertexIndex) => {
          const point =
            positions[
              vertexIndex
            ];

          const gradient =
            tangentGradients.get(
              vertexIndex
            );


          trialPositions[
            vertexIndex
          ] =
            normalize4(
              p4(
                point.x -
                  trialStep *
                  gradient.x,

                point.y -
                  trialStep *
                  gradient.y,

                point.z -
                  trialStep *
                  gradient.z,

                point.w -
                  trialStep *
                  gradient.w
              ),

              point
            );
        }
      );


      const trial =
        evaluate({
          quotientMesh,

          positions:
            trialPositions,

          referencePositions,

          movable,

          expectedSigns,

          scales,

          margin,

          temperature,

          regularizationWeight,

          withGradient:
            false,
        });


      const orientationMonotoneAllowed =
        !orientationMonotone ||
        (
          trial.mismatchCount <=
            current.mismatchCount &&
          trial.degenerateCount <=
            current.degenerateCount
        );


      if (
        Number.isFinite(
          trial.energy
        ) &&
        orientationMonotoneAllowed &&
        trial.energy <
          current.energy
      ) {
        positions =
          trialPositions;

        step =
          Math.min(
            maximumStep,
            trialStep *
              1.08
          );

        accepted =
          true;

        acceptedIterationCount +=
          1;

        break;
      }


      if (
        orientationMonotone &&
        !orientationMonotoneAllowed
      ) {
        orientationMonotoneRejectionCount +=
          1;
      }


      trialStep *=
        0.5;

      rejectedStepCount +=
        1;


      if (
        trialStep <
        minimumStep
      ) {
        break;
      }
    }


    if (!accepted) {
      step *=
        0.35;

      if (
        step <
        minimumStep
      ) {
        stalled =
          true;

        break;
      }

      continue;
    }


    current =
      evaluate({
        quotientMesh,

        positions,

        referencePositions,

        movable,

        expectedSigns,

        scales,

        margin,

        temperature,

        regularizationWeight,

        withGradient:
          true,
      });


    const comparable = {
      ...current,
      gradients:
        null,
    };


    if (
      better(
        comparable,
        bestEvaluation
      )
    ) {
      bestEvaluation =
        comparable;

      bestPositions =
        clonePositions(
          positions
        );
    }


    if (
      iteration %
        logEvery ===
        0 ||
      current
        .mismatchCount ===
        0
    ) {
      record(
        iteration
      );
    }


    if (
      current
        .mismatchCount ===
        0 &&
      current
        .degenerateCount ===
        0 &&
      current
        .minimumCorrectedNormalizedDeterminant >=
        Math.max(
          0.005,
          margin *
            0.25
        )
    ) {
      break;
    }
  }


  /*
   * Return the best orientation state encountered, rather than merely
   * the last accepted energy state.
   */
  positions =
    bestPositions;


  const final =
    evaluate({
      quotientMesh,

      positions,

      referencePositions,

      movable,

      expectedSigns,

      scales,

      margin,

      temperature,

      regularizationWeight,

      withGradient:
        false,
    });


  let maximumNormError =
    0;

  positions.forEach(
    (position) => {
      maximumNormError =
        Math.max(
          maximumNormError,

          Math.abs(
            norm4(
              position
            ) -
            1
          )
        );
    }
  );


  let maximumBoundaryDisplacement =
    0;

  initialPositions.forEach(
    (
      initialPoint,
      vertexIndex
    ) => {
      if (
        movable.has(
          vertexIndex
        )
      ) {
        return;
      }

      maximumBoundaryDisplacement =
        Math.max(
          maximumBoundaryDisplacement,

          distance4(
            initialPoint,
            positions[
              vertexIndex
            ]
          )
        );
    }
  );


  /*
   * Diagnose exactly where the remaining orientation failures live.
   *
   * This does not alter positions or optimization.
   */
  const initialMismatchLocalization =
    buildMismatchLocalization({
      quotientMesh,

      positions:
        initialPositions,

      movable,

      expectedSigns,

      scales,
    });


  const finalMismatchLocalization =
    buildMismatchLocalization({
      quotientMesh,

      positions,

      movable,

      expectedSigns,

      scales,
    });


  const success =
    final
      .mismatchCount ===
      0 &&
    final
      .degenerateCount ===
      0 &&
    maximumBoundaryDisplacement <=
      1e-12;


  const result = {
    success,

    positions,

    expectedSigns,

    scales,

    history,

    mismatchLocalization: {
      initial:
        initialMismatchLocalization,

      final:
        finalMismatchLocalization,
    },

    summary: {
      success,

      initialOrientationMismatchCount:
        orientationAudit
          .summary
          .orientationMismatchCount,

      finalOrientationMismatchCount:
        final
          .mismatchCount,

      finalDegenerateCellCount:
        final
          .degenerateCount,

      minimumCorrectedDeterminant:
        final
          .minimumCorrectedDeterminant,

      minimumCorrectedNormalizedDeterminant:
        final
          .minimumCorrectedNormalizedDeterminant,

      finalEnergy:
        final.energy,

      activeInteriorVertexCount:
        activeInteriorVertexIndices
          .length,

      frozenInteriorVertexCount:
        interiorVertexIndices.length -
        activeInteriorVertexIndices.length,

      acceptedIterationCount,

      rejectedStepCount,

      orientationMonotone,

      orientationMonotoneRejectionCount,

      stalled,

      maximumNormError,

      maximumBoundaryDisplacement,

      finalCuspBoundaryMismatchCount:
        finalMismatchLocalization
          .summary
          .cuspBoundaryMismatchCount,

      finalLargeFaceMismatchCount:
        finalMismatchLocalization
          .summary
          .largeFaceMismatchCount,

      finalZeroMovableMismatchCount:
        finalMismatchLocalization
          .summary
          .zeroMovableMismatchCount,

      finalOneMovableMismatchCount:
        finalMismatchLocalization
          .summary
          .oneMovableMismatchCount,

      finalTwoMovableMismatchCount:
        finalMismatchLocalization
          .summary
          .twoMovableMismatchCount,
    },
  };


  if (log) {
    console.info(
      "[intrinsic-s3-relax] complete",
      result.summary
    );
  }


  return result;
}
