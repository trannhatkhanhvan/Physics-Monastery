/*
 * Intrinsic S³ volumetric solver state for the compact figure-eight
 * quotient mesh.
 *
 * Boundary vertices are fixed exactly on the shared Projection Lab
 * S³ tube.
 *
 * S1 is the exact analytic collar. S2 and S3 begin as successive
 * coherent material-torus continuations, then undergo one coupled
 * layered projective solve on S³. The ten genuine deep-core vertices
 * participate in that same projective solve after harmonic seeding.
 *
 * The separate full-manifold nonlinear relaxation remains available
 * on demand after this deterministic staged initialization.
 */

export {
  INTRINSIC_S3_CONSTRUCTIVE_MESH_URL,
  createIntrinsicS3ConstructiveVolumeState,
  loadIntrinsicS3ConstructiveVolumeState,
} from "./intrinsicS3ConstructiveVolume";

import {
  runIntrinsicS3NonlinearRelaxation,
} from "./intrinsicS3NonlinearRelaxation";
import {
  optimizeIntrinsicS3LayeredProjectiveSurfaces,
} from "./intrinsicS3LayeredProjectiveSolver";
import {
  cuspTubeCoordinates,
  defaultFigureEightS3Tube,
  figureEightS3TubePoint4,
  sampleFigureEightS3TubeMaterialFrame4,
  sampleFigureEightS3CollarPoint4,
} from "./figureEightS3Geometry";

const EPSILON =
  1e-12;

const CELL_DEGENERACY_TOLERANCE =
  1e-10;


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


function clonePoint4(point) {
  return point4(
    point.x,
    point.y,
    point.z,
    point.w
  );
}


function point4Norm(point) {
  return Math.hypot(
    point.x,
    point.y,
    point.z,
    point.w
  );
}


function point4Distance(
  first,
  second
) {
  return Math.hypot(
    first.x - second.x,
    first.y - second.y,
    first.z - second.z,
    first.w - second.w
  );
}


function normalizePoint4(
  point,
  fallback = null
) {
  const norm =
    point4Norm(point);

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

  if (fallback) {
    return normalizePoint4(
      fallback,
      null
    );
  }

  return point4(
    0,
    0,
    0,
    1
  );
}



function averagePoint4(
  points
) {
  if (
    !Array.isArray(points) ||
    points.length === 0
  ) {
    return null;
  }

  const sum =
    points.reduce(
      (
        accumulator,
        point
      ) => {
        accumulator.x +=
          point.x;

        accumulator.y +=
          point.y;

        accumulator.z +=
          point.z;

        accumulator.w +=
          point.w;

        return accumulator;
      },
      point4(
        0,
        0,
        0,
        0
      )
    );

  return point4(
    sum.x / points.length,
    sum.y / points.length,
    sum.z / points.length,
    sum.w / points.length
  );
}


function sphericalInterpolatePoint4(
  first,
  second,
  amount
) {
  const start =
    normalizePoint4(
      first
    );

  const end =
    normalizePoint4(
      second,
      start
    );

  const t =
    Math.max(
      0,
      Math.min(
        1,
        amount
      )
    );

  const dot =
    Math.max(
      -1,
      Math.min(
        1,
        start.x * end.x +
        start.y * end.y +
        start.z * end.z +
        start.w * end.w
      )
    );

  const angle =
    Math.acos(
      dot
    );

  const sine =
    Math.sin(
      angle
    );

  /*
   * Near coincident or antipodal endpoints, normalized linear
   * interpolation is the stable limiting construction.
   */
  if (
    Math.abs(sine) <
    1e-8
  ) {
    return normalizePoint4(
      point4(
        start.x +
          t *
          (
            end.x -
            start.x
          ),

        start.y +
          t *
          (
            end.y -
            start.y
          ),

        start.z +
          t *
          (
            end.z -
            start.z
          ),

        start.w +
          t *
          (
            end.w -
            start.w
          )
      ),
      start
    );
  }

  const startWeight =
    Math.sin(
      (
        1 -
        t
      ) *
      angle
    ) /
    sine;

  const endWeight =
    Math.sin(
      t *
      angle
    ) /
    sine;

  return normalizePoint4(
    point4(
      startWeight *
        start.x +
      endWeight *
        end.x,

      startWeight *
        start.y +
      endWeight *
        end.y,

      startWeight *
        start.z +
      endWeight *
        end.z,

      startWeight *
        start.w +
      endWeight *
        end.w
    ),
    start
  );
}


function sparseVectorDot(
  first,
  second
) {
  let sum =
    0;

  for (
    let index = 0;
    index < first.length;
    index += 1
  ) {
    sum +=
      first[index] *
      second[index];
  }

  return sum;
}


function multiplySparseHarmonicMatrix(
  sparseRows,
  vector
) {
  return sparseRows.map(
    (row) => {
      let value =
        row.diagonal *
        vector[row.rowIndex];

      row.interiorNeighborIndices
        .forEach(
          (neighborIndex) => {
            value -=
              vector[
                neighborIndex
              ];
          }
        );

      return value;
    }
  );
}


function auditSparseHarmonicSystem(
  sparseRows
) {
  const size =
    sparseRows.length;

  const visited =
    Array(size).fill(false);

  const components = [];

  let minimumDiagonal =
    Infinity;

  let zeroDiagonalRowCount =
    0;


  sparseRows.forEach(
    (row) => {
      minimumDiagonal =
        Math.min(
          minimumDiagonal,
          row.diagonal
        );

      if (
        !Number.isFinite(
          row.diagonal
        ) ||
        row.diagonal <= 0
      ) {
        zeroDiagonalRowCount +=
          1;
      }
    }
  );


  for (
    let seed = 0;
    seed < size;
    seed += 1
  ) {
    if (visited[seed]) {
      continue;
    }

    const stack = [seed];

    visited[seed] =
      true;

    let rowCount =
      0;

    let boundaryNeighborCount =
      0;


    while (stack.length > 0) {
      const rowIndex =
        stack.pop();

      const row =
        sparseRows[rowIndex];

      rowCount +=
        1;

      boundaryNeighborCount +=
        Math.max(
          0,
          row.diagonal -
            row
              .interiorNeighborIndices
              .length
        );

      row
        .interiorNeighborIndices
        .forEach(
          (neighborIndex) => {
            if (
              visited[
                neighborIndex
              ]
            ) {
              return;
            }

            visited[
              neighborIndex
            ] =
              true;

            stack.push(
              neighborIndex
            );
          }
        );
    }


    components.push({
      rowCount,
      boundaryNeighborCount,
      anchored:
        boundaryNeighborCount > 0,
    });
  }


  return {
    rowCount:
      size,

    componentCount:
      components.length,

    anchoredComponentCount:
      components.filter(
        (component) =>
          component.anchored
      ).length,

    unanchoredComponentCount:
      components.filter(
        (component) =>
          !component.anchored
      ).length,

    zeroDiagonalRowCount,

    minimumDiagonal:
      Number.isFinite(
        minimumDiagonal
      )
        ? minimumDiagonal
        : 0,

    components,
  };
}


/*
 * Jacobi-preconditioned conjugate gradient for the
 * Dirichlet graph Laplacian.
 *
 * This replaces the old O(n^3) dense elimination for
 * large harmonic systems with sparse matrix-vector work.
 */
function solveSparseHarmonicSystem(
  sparseRows,
  rightHandSide
) {
  const size =
    sparseRows.length;


  if (size === 0) {
    return {
      solution: [],
      converged: true,
      iterationCount: 0,
      residualNorm: 0,
      tolerance: 0,
      rightHandSideNorm: 0,
      breakdownReason: null,
    };
  }


  if (
    rightHandSide.length !==
    size
  ) {
    return {
      solution: null,
      converged: false,
      iterationCount: 0,
      residualNorm:
        Infinity,
      tolerance:
        Infinity,
      rightHandSideNorm:
        Infinity,
      breakdownReason:
        "rhs-size-mismatch",
    };
  }


  const solution =
    Array(size).fill(0);

  const residual =
    [
      ...rightHandSide,
    ];

  const preconditionedResidual =
    residual.map(
      (
        value,
        index
      ) => {
        const diagonal =
          sparseRows[
            index
          ].diagonal;

        return (
          Math.abs(diagonal) >
            EPSILON
            ? value /
              diagonal
            : value
        );
      }
    );

  const direction =
    [
      ...preconditionedResidual,
    ];


  let residualDotPreconditioned =
    sparseVectorDot(
      residual,
      preconditionedResidual
    );


  const rightHandSideNorm =
    Math.sqrt(
      sparseVectorDot(
        rightHandSide,
        rightHandSide
      )
    );

  const tolerance =
    1e-11 *
    Math.max(
      1,
      rightHandSideNorm
    );


  let residualNorm =
    Math.sqrt(
      sparseVectorDot(
        residual,
        residual
      )
    );


  if (
    residualNorm <=
    tolerance
  ) {
    return {
      solution,
      converged: true,
      iterationCount: 0,
      residualNorm,
      tolerance,
      rightHandSideNorm,
      breakdownReason: null,
    };
  }


  /*
   * A graph Laplacian normally converges far sooner than this.
   * The generous ceiling prevents an accidental infinite solve
   * while retaining a very strict residual tolerance.
   */
  const maximumIterations =
    Math.max(
      400,
      Math.min(
        12000,
        8 * size
      )
    );


  for (
    let iteration = 0;
    iteration <
      maximumIterations;
    iteration += 1
  ) {
    const matrixDirection =
      multiplySparseHarmonicMatrix(
        sparseRows,
        direction
      );

    const denominator =
      sparseVectorDot(
        direction,
        matrixDirection
      );


    if (
      !Number.isFinite(
        denominator
      ) ||
      denominator <=
        0
    ) {
      return {
        solution: null,
        converged: false,
        iterationCount:
          iteration,
        residualNorm,
        tolerance,
        rightHandSideNorm,
        breakdownReason:
          !Number.isFinite(
            denominator
          )
            ? "non-finite-direction-curvature"
            : "non-positive-direction-curvature",
      };
    }


    const alpha =
      residualDotPreconditioned /
      denominator;


    for (
      let index = 0;
      index < size;
      index += 1
    ) {
      solution[index] +=
        alpha *
        direction[index];

      residual[index] -=
        alpha *
        matrixDirection[
          index
        ];
    }


    residualNorm =
      Math.sqrt(
        sparseVectorDot(
          residual,
          residual
        )
      );


    if (
      residualNorm <=
      tolerance
    ) {
      return {
        solution,
        converged: true,
        iterationCount:
          iteration + 1,
        residualNorm,
        tolerance,
        rightHandSideNorm,
        breakdownReason: null,
      };
    }


    for (
      let index = 0;
      index < size;
      index += 1
    ) {
      const diagonal =
        sparseRows[
          index
        ].diagonal;

      preconditionedResidual[
        index
      ] =
        Math.abs(diagonal) >
          EPSILON
          ? residual[index] /
            diagonal
          : residual[index];
    }


    const nextResidualDotPreconditioned =
      sparseVectorDot(
        residual,
        preconditionedResidual
      );


    if (
      !Number.isFinite(
        nextResidualDotPreconditioned
      ) ||
      !Number.isFinite(
        residualDotPreconditioned
      ) ||
      nextResidualDotPreconditioned <=
        0 ||
      residualDotPreconditioned <=
        0
    ) {
      return {
        solution: null,
        converged: false,
        iterationCount:
          iteration + 1,
        residualNorm,
        tolerance,
        rightHandSideNorm,
        breakdownReason:
          "non-positive-preconditioned-residual-energy",
      };
    }


    const beta =
      nextResidualDotPreconditioned /
      residualDotPreconditioned;


    for (
      let index = 0;
      index < size;
      index += 1
    ) {
      direction[index] =
        preconditionedResidual[
          index
        ] +
        beta *
        direction[index];
    }


    residualDotPreconditioned =
      nextResidualDotPreconditioned;
  }


  return {
    solution: null,
    converged: false,
    iterationCount:
      maximumIterations,
    residualNorm,
    tolerance,
    rightHandSideNorm,
    breakdownReason:
      "maximum-iterations",
  };
}


function solveHarmonicCoordinates(
  harmonicSystem
) {
  /*
   * Large systems use sparse PCG.
   *
   * Retain the original dense solver as a deterministic fallback
   * for legacy/small systems that do not yet expose sparse rows.
   */
  if (
    Array.isArray(
      harmonicSystem.sparseRows
    )
  ) {
    const systemAudit =
      auditSparseHarmonicSystem(
        harmonicSystem.sparseRows
      );

    const solveCoordinate =
      (rightHandSide) =>
        solveSparseHarmonicSystem(
          harmonicSystem
            .sparseRows,
          rightHandSide
        );


    const resultX =
      solveCoordinate(
        harmonicSystem
          .rightHandSides.x
      );

    const resultY =
      solveCoordinate(
        harmonicSystem
          .rightHandSides.y
      );

    const resultZ =
      solveCoordinate(
        harmonicSystem
          .rightHandSides.z
      );

    const resultW =
      solveCoordinate(
        harmonicSystem
          .rightHandSides.w
      );


    const succeeded =
      resultX.converged &&
      resultY.converged &&
      resultZ.converged &&
      resultW.converged;


    return {
      solutionX:
        succeeded
          ? resultX.solution
          : null,

      solutionY:
        succeeded
          ? resultY.solution
          : null,

      solutionZ:
        succeeded
          ? resultZ.solution
          : null,

      solutionW:
        succeeded
          ? resultW.solution
          : null,

      succeeded,

      method:
        "sparse-jacobi-pcg",

      iterationCounts: {
        x:
          resultX
            .iterationCount,

        y:
          resultY
            .iterationCount,

        z:
          resultZ
            .iterationCount,

        w:
          resultW
            .iterationCount,
      },

      residualNorms: {
        x:
          resultX.residualNorm,

        y:
          resultY.residualNorm,

        z:
          resultZ.residualNorm,

        w:
          resultW.residualNorm,
      },

      tolerances: {
        x:
          resultX.tolerance,
        y:
          resultY.tolerance,
        z:
          resultZ.tolerance,
        w:
          resultW.tolerance,
      },

      breakdownReasons: {
        x:
          resultX.breakdownReason,
        y:
          resultY.breakdownReason,
        z:
          resultZ.breakdownReason,
        w:
          resultW.breakdownReason,
      },

      systemAudit,
    };
  }


  const solutionX =
    solveLinearSystem(
      harmonicSystem.matrix,
      harmonicSystem
        .rightHandSides.x
    );

  const solutionY =
    solveLinearSystem(
      harmonicSystem.matrix,
      harmonicSystem
        .rightHandSides.y
    );

  const solutionZ =
    solveLinearSystem(
      harmonicSystem.matrix,
      harmonicSystem
        .rightHandSides.z
    );

  const solutionW =
    solveLinearSystem(
      harmonicSystem.matrix,
      harmonicSystem
        .rightHandSides.w
    );


  return {
    solutionX,
    solutionY,
    solutionZ,
    solutionW,

    succeeded:
      Boolean(
        solutionX &&
        solutionY &&
        solutionZ &&
        solutionW
      ),

    method:
      "dense-gaussian-fallback",
  };
}


/*
 * A deterministic S³ fallback made from the intrinsic source
 * coordinates by inverse stereographic projection.
 *
 * This is only a seed fallback if the harmonic R⁴ vector nearly
 * cancels to zero.
 */
function sourcePointFallbackS3(
  sourcePoint
) {
  const scale =
    0.55;

  const x =
    (
      sourcePoint?.x ??
      0
    ) *
    scale;

  const y =
    (
      sourcePoint?.y ??
      0
    ) *
    scale;

  const z =
    (
      sourcePoint?.z ??
      0
    ) *
    scale;

  const radiusSquared =
    x * x +
    y * y +
    z * z;

  const denominator =
    1 +
    radiusSquared;

  return point4(
    2 * x / denominator,
    2 * y / denominator,
    2 * z / denominator,
    (
      1 -
      radiusSquared
    ) /
      denominator
  );
}


function buildAdjacency(
  vertexCount,
  quotientEdges
) {
  const adjacency =
    Array.from(
      {
        length:
          vertexCount,
      },
      () => new Set()
    );

  quotientEdges.forEach(
    (edge) => {
      const [
        first,
        second,
      ] =
        edge
          .quotientVertexIndices;

      if (
        !Number.isInteger(first) ||
        !Number.isInteger(second) ||
        first === second
      ) {
        return;
      }

      adjacency[first]
        .add(second);

      adjacency[second]
        .add(first);
    }
  );

  return adjacency.map(
    (neighbors) =>
      [...neighbors]
  );
}


/*
 * Dense Gaussian elimination with partial pivoting.
 *
 * Retained as a deterministic fallback for legacy/small systems.
 * Production harmonic solves use the sparse graph-Laplacian PCG
 * path above.
 */
function solveLinearSystem(
  matrix,
  rightHandSide
) {
  const size =
    matrix.length;

  const augmented =
    matrix.map(
      (
        row,
        rowIndex
      ) => [
        ...row,
        rightHandSide[
          rowIndex
        ],
      ]
    );


  for (
    let pivotColumn = 0;
    pivotColumn < size;
    pivotColumn += 1
  ) {
    let pivotRow =
      pivotColumn;

    let pivotMagnitude =
      Math.abs(
        augmented[
          pivotRow
        ][
          pivotColumn
        ]
      );


    for (
      let candidateRow =
        pivotColumn + 1;
      candidateRow < size;
      candidateRow += 1
    ) {
      const magnitude =
        Math.abs(
          augmented[
            candidateRow
          ][
            pivotColumn
          ]
        );

      if (
        magnitude >
        pivotMagnitude
      ) {
        pivotMagnitude =
          magnitude;

        pivotRow =
          candidateRow;
      }
    }


    if (
      pivotMagnitude <
      EPSILON
    ) {
      return null;
    }


    if (
      pivotRow !==
      pivotColumn
    ) {
      [
        augmented[
          pivotColumn
        ],
        augmented[
          pivotRow
        ],
      ] = [
        augmented[
          pivotRow
        ],
        augmented[
          pivotColumn
        ],
      ];
    }


    const pivot =
      augmented[
        pivotColumn
      ][
        pivotColumn
      ];


    for (
      let column =
        pivotColumn;
      column <= size;
      column += 1
    ) {
      augmented[
        pivotColumn
      ][
        column
      ] /=
        pivot;
    }


    for (
      let row = 0;
      row < size;
      row += 1
    ) {
      if (
        row ===
        pivotColumn
      ) {
        continue;
      }

      const factor =
        augmented[
          row
        ][
          pivotColumn
        ];

      if (
        Math.abs(
          factor
        ) <
        EPSILON
      ) {
        continue;
      }

      for (
        let column =
          pivotColumn;
        column <= size;
        column += 1
      ) {
        augmented[
          row
        ][
          column
        ] -=
          factor *
          augmented[
            pivotColumn
          ][
            column
          ];
      }
    }
  }


  return augmented.map(
    (row) =>
      row[size]
  );
}


function determinant4(
  first,
  second,
  third,
  fourth
) {
  /*
   * Columns are the four S³ vertex vectors.
   */
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


  let determinant =
    1;

  let sign =
    1;


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
      EPSILON
    ) {
      return 0;
    }


    if (
      pivotRow !==
      column
    ) {
      [
        matrix[
          column
        ],
        matrix[
          pivotRow
        ],
      ] = [
        matrix[
          pivotRow
        ],
        matrix[
          column
        ],
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
        let innerColumn =
          column + 1;
        innerColumn < 4;
        innerColumn += 1
      ) {
        matrix[
          row
        ][
          innerColumn
        ] -=
          factor *
          matrix[
            column
          ][
            innerColumn
          ];
      }
    }
  }


  return (
    determinant *
    sign
  );
}


function makeBoundaryMap(
  boundaryTargets
) {
  return new Map(
    boundaryTargets
      .targets
      .map(
        (target) => [
          target
            .quotientVertexIndex,

          clonePoint4(
            target
              .targetPoint4
          ),
        ]
      )
  );
}


function buildHarmonicSystem({
  quotientMesh,
  boundaryMap,
  interiorVertexIndices,
  adjacency,
}) {
  const interiorIndexByVertex =
    new Map(
      interiorVertexIndices.map(
        (
          vertexIndex,
          interiorIndex
        ) => [
          vertexIndex,
          interiorIndex,
        ]
      )
    );


  const unknownCount =
    interiorVertexIndices
      .length;


  const matrix =
    Array.from(
      {
        length:
          unknownCount,
      },
      () =>
        Array(
          unknownCount
        ).fill(0)
    );


  const sparseRows =
    Array.from(
      {
        length:
          unknownCount,
      },
      (
        _,
        rowIndex
      ) => ({
        rowIndex,

        diagonal:
          0,

        interiorNeighborIndices:
          [],
      })
    );


  const rightHandSides = {
    x:
      Array(
        unknownCount
      ).fill(0),

    y:
      Array(
        unknownCount
      ).fill(0),

    z:
      Array(
        unknownCount
      ).fill(0),

    w:
      Array(
        unknownCount
      ).fill(0),
  };


  interiorVertexIndices.forEach(
    (
      vertexIndex,
      row
    ) => {
      const neighbors =
        adjacency[
          vertexIndex
        ];


      matrix[row][row] =
        neighbors.length;

      sparseRows[
        row
      ].diagonal =
        neighbors.length;


      neighbors.forEach(
        (neighborIndex) => {
          const boundaryPoint =
            boundaryMap.get(
              neighborIndex
            );


          if (boundaryPoint) {
            rightHandSides.x[
              row
            ] +=
              boundaryPoint.x;

            rightHandSides.y[
              row
            ] +=
              boundaryPoint.y;

            rightHandSides.z[
              row
            ] +=
              boundaryPoint.z;

            rightHandSides.w[
              row
            ] +=
              boundaryPoint.w;

            return;
          }


          const neighborInteriorIndex =
            interiorIndexByVertex.get(
              neighborIndex
            );


          if (
            neighborInteriorIndex !==
            undefined
          ) {
            matrix[
              row
            ][
              neighborInteriorIndex
            ] -=
              1;

            sparseRows[
              row
            ]
              .interiorNeighborIndices
              .push(
                neighborInteriorIndex
              );
          }
        });
    }
  );


  return {
    matrix,
    sparseRows,
    rightHandSides,
  };
}


/*
 * ============================================================
 * GLOBAL QUOTIENT ORIENTATION
 * ============================================================
 *
 * Raw det(X0,X1,X2,X3) signs are meaningless until every cell's
 * vertex ordering is related to ONE coherent manifold orientation.
 *
 * For an oriented tetrahedron
 *
 *     [v0,v1,v2,v3]
 *
 * the induced orientation of the face opposite vi is
 *
 *     (-1)^i [v0,...,v_hat_i,...,v3].
 *
 * Two tetrahedra sharing an internal face must induce OPPOSITE
 * orientations on that common face.
 */


function permutationParityToSorted(
  values
) {
  let inversions =
    0;

  for (
    let first = 0;
    first < values.length;
    first += 1
  ) {
    for (
      let second =
        first + 1;
      second < values.length;
      second += 1
    ) {
      if (
        values[first] >
        values[second]
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


function sourceOccurrenceKey(
  tetrahedronId,
  volumeVertexIndex
) {
  return (
    `${tetrahedronId}:` +
    `${volumeVertexIndex}`
  );
}


function sortedSourceFaceKey(
  tetrahedronId,
  sourceVertexIndices
) {
  return (
    `${tetrahedronId}:` +
    sourceVertexIndices
      .slice()
      .sort(
        (a, b) => a - b
      )
      .join(":")
  );
}


function sourceCellOrdinal(
  sourceCellId
) {
  const match =
    /-intrinsic-cell-(\d+)$/.exec(
      sourceCellId ?? ""
    );

  return match
    ? Number(match[1])
    : null;
}


function boundaryPairId(
  sourceBoundaryFaceId
) {
  const match =
    /-large-(\d+)$/.exec(
      sourceBoundaryFaceId ?? ""
    );

  return match
    ? Number(match[1])
    : null;
}


/*
 * Build an explicit identity for EVERY tetrahedral face occurrence.
 *
 * The quotient is a Δ-complex:
 *
 * distinct topological faces may have the same three quotient
 * vertex IDs.
 *
 * Therefore:
 *
 *   sorted(q0,q1,q2)
 *
 * is NOT a valid face identity.
 *
 * Instead recover the pre-quotient source occurrence and preserve
 * its multiplicity through the quotient.
 */
function buildExplicitFaceOccurrenceKeys(
  quotientMesh
) {
  const failures = [];

  const sourceRecordsByTetrahedron = {
    A: [],
    B: [],
  };

  const quotientIndexBySource =
    new Map();


  /*
   * Recover the source-volume vertices represented by each
   * canonical quotient vertex.
   */
  quotientMesh
    .quotientVertices
    .forEach(
      (quotientVertex) => {
        quotientVertex
          .memberRefs
          .forEach(
            (memberRef) => {
              const barycentricRecord =
                quotientVertex
                  .barycentricAddresses
                  .find(
                    (candidate) =>
                      candidate
                        .tetrahedronId ===
                        memberRef
                          .tetrahedronId &&
                      candidate
                        .volumeVertexIndex ===
                        memberRef
                          .volumeVertexIndex
                  );

              const record = {
                tetrahedronId:
                  memberRef
                    .tetrahedronId,

                volumeVertexIndex:
                  memberRef
                    .volumeVertexIndex,

                quotientVertexIndex:
                  quotientVertex
                    .quotientVertexIndex,

                kind:
                  memberRef.kind,

                sourceVertexId:
                  memberRef
                    .sourceVertexId,

                barycentric:
                  barycentricRecord
                    ?.barycentric ??
                  null,
              };

              sourceRecordsByTetrahedron[
                record.tetrahedronId
              ]?.push(record);

              quotientIndexBySource
                .set(
                  sourceOccurrenceKey(
                    record
                      .tetrahedronId,
                    record
                      .volumeVertexIndex
                  ),

                  record
                    .quotientVertexIndex
                );
            }
          );
      }
    );


  function boundaryPlane(
    faceCenterRecord,
    boundaryKind
  ) {
    const barycentric =
      faceCenterRecord
        ?.barycentric;

    if (
      !Array.isArray(
        barycentric
      ) ||
      barycentric.length !==
        4
    ) {
      return null;
    }

    let coordinateIndex =
      0;

    for (
      let index = 1;
      index < 4;
      index += 1
    ) {
      if (
        boundaryKind ===
        "large"
          ? Math.abs(
              barycentric[index]
            ) <
            Math.abs(
              barycentric[
                coordinateIndex
              ]
            )
          : barycentric[index] >
            barycentric[
              coordinateIndex
            ]
      ) {
        coordinateIndex =
          index;
      }
    }

    return {
      coordinateIndex,

      value:
        barycentric[
          coordinateIndex
        ],
    };
  }


  function liesOnPlane(
    record,
    plane
  ) {
    return Boolean(
      plane &&
      Array.isArray(
        record
          ?.barycentric
      ) &&
      Math.abs(
        record
          .barycentric[
          plane.coordinateIndex
        ] -
        plane.value
      ) <=
        1e-9
    );
  }


  function edgeDescriptor(
    sourceVertexId
  ) {
    const match =
      /intrinsic-edge-(\d+)-(\d+)-third-(1|2)$/.exec(
        sourceVertexId ?? ""
      );

    return match
      ? {
          low:
            Number(
              match[1]
            ),

          high:
            Number(
              match[2]
            ),

          third:
            Number(
              match[3]
            ),
        }
      : null;
  }


  function addGraphEdge(
    graph,
    first,
    second
  ) {
    if (!graph.has(first)) {
      graph.set(
        first,
        new Set()
      );
    }

    if (!graph.has(second)) {
      graph.set(
        second,
        new Set()
      );
    }

    graph
      .get(first)
      .add(second);

    graph
      .get(second)
      .add(first);
  }


  /*
   * Recover one cyclic refined boundary perimeter.
   */
  function traverseCycle(
    graph
  ) {
    const all =
      [...graph.keys()]
        .sort(
          (a, b) => a - b
        );

    if (
      all.length === 0 ||
      all.some(
        (vertexIndex) =>
          graph
            .get(vertexIndex)
            ?.size !==
          2
      )
    ) {
      return null;
    }

    const start =
      all[0];

    const firstNeighbor =
      [...graph.get(start)]
        .sort(
          (a, b) => a - b
        )[0];

    const cycle = [
      start,
    ];

    let previous =
      null;

    let current =
      start;

    let next =
      firstNeighbor;


    while (
      next !== start
    ) {
      if (
        cycle.length >
        all.length
      ) {
        return null;
      }

      cycle.push(
        next
      );

      previous =
        current;

      current =
        next;

      const neighbors =
        [
          ...graph.get(
            current
          ),
        ];

      next =
        neighbors[0] ===
        previous
          ? neighbors[1]
          : neighbors[0];
    }


    return (
      cycle.length ===
      all.length
        ? cycle
        : null
    );
  }


  function unorderedPairKey(
    first,
    second
  ) {
    return first < second
      ? `${first}:${second}`
      : `${second}:${first}`;
  }


  /*
   * The source-cell order already tells us the order of the
   * boundary fan.
   *
   * Align the reconstructed source perimeter against the actual
   * quotient edge occurrences.
   */
  function alignCycle(
    baseCycle,
    groupCells,
    tetrahedronId
  ) {
    const observed =
      groupCells.map(
        ({ cell }) => {
          const topologyVertexIndices =
            cell
              .topologyVertexIndices ??
            cell
              .quotientVertexIndices;

          return unorderedPairKey(
            topologyVertexIndices[2],
            topologyVertexIndices[3]
          );
        }
      );

    const matches = [];

    const count =
      baseCycle.length;


    [1, -1].forEach(
      (direction) => {
        for (
          let rotation = 0;
          rotation < count;
          rotation += 1
        ) {
          const candidate =
            Array.from(
              {
                length:
                  count,
              },

              (_, index) =>
                baseCycle[
                  (
                    rotation +
                    direction *
                      index +
                    count *
                      4
                  ) %
                  count
                ]
            );


          const candidateEdges =
            candidate.map(
              (
                sourceVertexIndex,
                index
              ) => {
                const nextSourceVertexIndex =
                  candidate[
                    (
                      index + 1
                    ) %
                    count
                  ];

                const first =
                  quotientIndexBySource
                    .get(
                      sourceOccurrenceKey(
                        tetrahedronId,
                        sourceVertexIndex
                      )
                    );

                const second =
                  quotientIndexBySource
                    .get(
                      sourceOccurrenceKey(
                        tetrahedronId,
                        nextSourceVertexIndex
                      )
                    );

                return unorderedPairKey(
                  first,
                  second
                );
              }
            );


          if (
            candidateEdges.every(
              (
                key,
                index
              ) =>
                key ===
                observed[index]
            )
          ) {
            matches.push(
              candidate
            );
          }
        }
      }
    );


    return (
      matches.length === 1
        ? matches[0]
        : null
    );
  }


  /*
   * Group the 216 quotient cells by the source boundary face
   * whose fan generated them.
   */
  const cellGroups =
    new Map();


  quotientMesh
    .quotientCells
    .forEach(
      (
        cell,
        cellIndex
      ) => {
        /*
         * Synthetic T² × I cells already carry complete face
         * occurrence identities. They do not belong to the old
         * source-cell provenance reconstruction.
         */
        if (
          Array.isArray(
            cell.explicitFaceKeys
          ) &&
          cell.explicitFaceKeys
            .length ===
            4
        ) {
          return;
        }

        const key =
          `${cell.tetrahedronId}:` +
          `${cell.sourceBoundaryFaceId}`;

        if (
          !cellGroups.has(
            key
          )
        ) {
          cellGroups.set(
            key,
            []
          );
        }

        cellGroups
          .get(key)
          .push({
            cell,

            cellIndex,

            sourceOrdinal:
              sourceCellOrdinal(
                cell
                  .sourceCellId
              ),
          });
      }
    );


  const sourceCellData =
    new Map();


  cellGroups.forEach(
    (groupCells) => {
      groupCells.sort(
        (
          first,
          second
        ) =>
          first
            .sourceOrdinal -
          second
            .sourceOrdinal
      );

      const firstCell =
        groupCells[0]
          ?.cell;

      if (!firstCell) {
        return;
      }

      const tetrahedronId =
        firstCell
          .tetrahedronId;

      const boundaryFaceId =
        firstCell
          .sourceBoundaryFaceId;

      const boundaryKind =
        firstCell
          .sourceBoundaryKind;

      const sourceRecords =
        sourceRecordsByTetrahedron[
          tetrahedronId
        ] ?? [];


      const bodyCenter =
        sourceRecords.find(
          (record) =>
            record.kind ===
            "body-center"
        );

      const faceCenter =
        sourceRecords.find(
          (record) =>
            record.kind ===
              "face-center" &&
            record
              .sourceVertexId
              ?.endsWith(
                `${boundaryFaceId}-center`
              )
        );


      if (
        !bodyCenter ||
        !faceCenter
      ) {
        failures.push({
          reason:
            "missing-source-centers",

          tetrahedronId,
          boundaryFaceId,
        });

        return;
      }


      const plane =
        boundaryPlane(
          faceCenter,
          boundaryKind
        );


      const perimeterRecords =
        sourceRecords.filter(
          (record) =>
            (
              record.kind ===
                "truncated-corner" ||
              record.kind ===
                "edge-subdivision"
            ) &&
            liesOnPlane(
              record,
              plane
            )
        );


      const perimeterIndexSet =
        new Set(
          perimeterRecords.map(
            (record) =>
              record
                .volumeVertexIndex
          )
        );


      /*
       * Rebuild the trisected source boundary edges:
       *
       * corner -- 1/3 -- 2/3 -- corner
       */
      const edgeGroups =
        new Map();


      perimeterRecords
        .filter(
          (record) =>
            record.kind ===
            "edge-subdivision"
        )
        .forEach(
          (record) => {
            const descriptor =
              edgeDescriptor(
                record
                  .sourceVertexId
              );

            if (
              !descriptor ||
              !perimeterIndexSet
                .has(
                  descriptor.low
                ) ||
              !perimeterIndexSet
                .has(
                  descriptor.high
                )
            ) {
              return;
            }

            const key =
              `${descriptor.low}:` +
              `${descriptor.high}`;

            if (
              !edgeGroups.has(
                key
              )
            ) {
              edgeGroups.set(
                key,
                {
                  low:
                    descriptor.low,

                  high:
                    descriptor.high,

                  thirds:
                    new Map(),
                }
              );
            }

            edgeGroups
              .get(key)
              .thirds
              .set(
                descriptor.third,

                record
                  .volumeVertexIndex
              );
          }
        );


      const graph =
        new Map();


      edgeGroups.forEach(
        (edge) => {
          const firstThird =
            edge
              .thirds
              .get(1);

          const secondThird =
            edge
              .thirds
              .get(2);

          if (
            !Number.isInteger(
              firstThird
            ) ||
            !Number.isInteger(
              secondThird
            )
          ) {
            failures.push({
              reason:
                "incomplete-edge-trisection",

              tetrahedronId,
              boundaryFaceId,
            });

            return;
          }

          addGraphEdge(
            graph,
            edge.low,
            firstThird
          );

          addGraphEdge(
            graph,
            firstThird,
            secondThird
          );

          addGraphEdge(
            graph,
            secondThird,
            edge.high
          );
        }
      );


      const baseCycle =
        traverseCycle(
          graph
        );


      const alignedCycle =
        baseCycle
          ? alignCycle(
              baseCycle,
              groupCells,
              tetrahedronId
            )
          : null;


      if (
        !alignedCycle ||
        alignedCycle.length !==
          groupCells.length
      ) {
        failures.push({
          reason:
            "source-boundary-cycle-alignment-failed",

          tetrahedronId,
          boundaryFaceId,
        });

        return;
      }


      groupCells.forEach(
        (
          groupCell,
          index
        ) => {
          sourceCellData.set(
            groupCell
              .cellIndex,

            {
              tetrahedronId,
              boundaryFaceId,
              boundaryKind,

              pairId:
                boundaryKind ===
                "large"
                  ? boundaryPairId(
                      boundaryFaceId
                    )
                  : null,

              body:
                bodyCenter
                  .volumeVertexIndex,

              center:
                faceCenter
                  .volumeVertexIndex,

              first:
                alignedCycle[
                  index
                ],

              second:
                alignedCycle[
                  (
                    index + 1
                  ) %
                  alignedCycle
                    .length
                ],
            }
          );
        }
      );
    }
  );


  /*
   * Determine which position in the ACTUAL stored tetrahedron
   * ordering is opposite a given source face.
   */
  function omittedIndexForSourceFace(
    cell,
    sourceFaceVertexIndices
  ) {
    const faceQuotientIndices =
      sourceFaceVertexIndices.map(
        (sourceVertexIndex) =>
          quotientIndexBySource
            .get(
              sourceOccurrenceKey(
                cell
                  .tetrahedronId,
                sourceVertexIndex
              )
            )
      );


    /*
     * Core cells may now contain collar vertex IDs. Their
     * topologyVertexIndices preserve the pre-collar quotient IDs that
     * correspond to the source tetrahedral addresses.
     */
    const topologyVertexIndices =
      cell
        .topologyVertexIndices ??
      cell
        .quotientVertexIndices;


    const omitted =
      topologyVertexIndices
        .map(
          (
            vertexIndex,
            index
          ) =>
            faceQuotientIndices
              .includes(
                vertexIndex
              )
              ? null
              : index
        )
        .filter(
          (index) =>
            index !== null
        );


    return (
      omitted.length === 1
        ? omitted[0]
        : null
    );
  }


  const faceKeyByOccurrence =
    new Map();


  /*
   * Synthetic collar tetrahedra carry their complete face occurrence
   * keys directly from the quotient-level T² × I construction.
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
          ) ||
          cell.explicitFaceKeys
            .length !==
            4
        ) {
          return;
        }

        cell.explicitFaceKeys
          .forEach(
            (
              key,
              omittedIndex
            ) => {
              faceKeyByOccurrence
                .set(
                  `${cellIndex}:${omittedIndex}`,
                  key
                );
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
        /*
         * Its four keys were already installed above.
         */
        if (
          Array.isArray(
            cell.explicitFaceKeys
          ) &&
          cell.explicitFaceKeys
            .length ===
            4
        ) {
          return;
        }

        const sourceCell =
          sourceCellData.get(
            cellIndex
          );

        if (!sourceCell) {
          failures.push({
            reason:
              "missing-source-cell-provenance",

            cellIndex,
          });

          return;
        }

        const {
          body,
          center,
          first,
          second,
        } =
          sourceCell;


        /*
         * These three faces lie inside one of the original
         * truncated tetrahedra.
         *
         * Before quotienting this is an ordinary simplicial mesh,
         * so SOURCE vertex identities pair these exactly.
         */
        const internalFaces = [
          [
            body,
            center,
            first,
          ],

          [
            body,
            center,
            second,
          ],

          [
            body,
            first,
            second,
          ],
        ];


        internalFaces.forEach(
          (
            sourceFaceVertexIndices
          ) => {
            const omittedIndex =
              omittedIndexForSourceFace(
                cell,
                sourceFaceVertexIndices
              );

            if (
              !Number.isInteger(
                omittedIndex
              )
            ) {
              failures.push({
                reason:
                  "invalid-source-internal-face-occurrence",

                cellIndex,
              });

              return;
            }

            faceKeyByOccurrence
              .set(
                `${cellIndex}:${omittedIndex}`,

                `internal:` +
                  sortedSourceFaceKey(
                    cell
                      .tetrahedronId,

                    sourceFaceVertexIndices
                  )
              );
          }
        );


        /*
         * The fourth face is on the boundary of the source
         * truncated tetrahedron.
         */
        const boundarySourceFace = [
          center,
          first,
          second,
        ];


        const boundaryOmittedIndex =
          omittedIndexForSourceFace(
            cell,
            boundarySourceFace
          );


        if (
          !Number.isInteger(
            boundaryOmittedIndex
          )
        ) {
          failures.push({
            reason:
              "invalid-boundary-face-occurrence",

            cellIndex,
          });

          return;
        }


        /*
         * With a quotient-level collar, the old cusp boundary face is
         * now the INNER T² interface.
         *
         * The quotient mesh provides the exact matching collar-face
         * key for this occurrence.
         */
        const boundaryFaceOverride =
          cell
            .faceKeyOverrides?.[
            boundaryOmittedIndex
          ] ??
          null;


        if (
          boundaryFaceOverride
        ) {
          faceKeyByOccurrence
            .set(
              `${cellIndex}:${boundaryOmittedIndex}`,
              boundaryFaceOverride
            );

          return;
        }


        /*
         * Legacy fallback:
         *
         * without a collar this remains a genuine boundary face.
         */
        if (
          sourceCell
            .boundaryKind ===
          "cusp"
        ) {
          faceKeyByOccurrence
            .set(
              `${cellIndex}:${boundaryOmittedIndex}`,

              `boundary:` +
                `${cellIndex}:` +
                `${boundaryOmittedIndex}`
            );

          return;
        }


        /*
         * Large face:
         *
         * pair the exact A occurrence with the exact B occurrence.
         *
         * The ordered canonical quotient triple preserves
         * occurrence multiplicity even when another topological face
         * happens to use the same unordered three quotient vertices.
         */
        const orderedQuotientFace =
          boundarySourceFace.map(
            (
              sourceVertexIndex
            ) =>
              quotientIndexBySource
                .get(
                  sourceOccurrenceKey(
                    cell
                      .tetrahedronId,

                    sourceVertexIndex
                  )
                )
          );


        faceKeyByOccurrence
          .set(
            `${cellIndex}:${boundaryOmittedIndex}`,

            `glue:` +
              `${sourceCell.pairId}:` +
              orderedQuotientFace
                .join(":")
          );
      }
    );


  return {
    faceKeyByOccurrence,
    failures,
  };
}

function buildCellOrientationTopology(
  quotientMesh
) {
  const cellCount =
    quotientMesh
      .quotientCells
      .length;

  /*
   * The legacy quotient is a Delta-complex, so face identity must be
   * reconstructed from source occurrences.
   *
   * The canonical barycentric refinement is different: it is a genuine
   * simplicial complex. Every child face is uniquely identified by its
   * three refined quotient vertices, so the old provenance reconstruction
   * must be bypassed there.
   */
  const isCanonicalSimplicialSubdivision =
    quotientMesh
      .quotientCells
      .length >
      0 &&
    quotientMesh
      .quotientCells
      .every(
        (cell) =>
          cell
            .canonicalSubdivision ===
          true
      );

  const explicitFaceOccurrences =
    isCanonicalSimplicialSubdivision
      ? {
          faceKeyByOccurrence:
            null,

          failures: [],
        }
      : buildExplicitFaceOccurrenceKeys(
          quotientMesh
        );

  const faceIncidence =
    new Map();


  quotientMesh
    .quotientCells
    .forEach(
      (
        cell,
        cellIndex
      ) => {
        const vertices =
          cell
            .quotientVertexIndices;

        for (
          let omittedIndex = 0;
          omittedIndex < 4;
          omittedIndex += 1
        ) {
          const faceVertices =
            vertices.filter(
              (
                _,
                index
              ) =>
                index !==
                omittedIndex
            );

          const faceOrientation =
            (
              omittedIndex %
                2 ===
              0
                ? 1
                : -1
            ) *
            permutationParityToSorted(
              faceVertices
            );

          const occurrenceKey =
            `${cellIndex}:${omittedIndex}`;

          const key =
            isCanonicalSimplicialSubdivision
              ? (
                  "simplicial:" +
                  faceVertices
                    .slice()
                    .sort(
                      (first, second) =>
                        first - second
                    )
                    .join(":")
                )
              : (
                  explicitFaceOccurrences
                    .faceKeyByOccurrence
                    .get(
                      occurrenceKey
                    ) ??
                  `unpaired:${occurrenceKey}`
                );

          if (
            !faceIncidence.has(
              key
            )
          ) {
            faceIncidence.set(
              key,
              []
            );
          }

          faceIncidence
            .get(key)
            .push({
              cellIndex,
              omittedIndex,
              faceVertices,
              faceOrientation,
            });
        }
      }
    );


  const adjacency =
    Array.from(
      {
        length:
          cellCount,
      },
      () => []
    );

  let boundaryFaceCount =
    0;

  let internalFaceCount =
    0;

  let nonManifoldFaceCount =
    explicitFaceOccurrences
      .failures
      .length;


  faceIncidence.forEach(
    (incidences) => {
      if (
        incidences.length ===
        1
      ) {
        boundaryFaceCount +=
          1;

        return;
      }


      if (
        incidences.length !==
        2
      ) {
        nonManifoldFaceCount +=
          1;

        return;
      }


      internalFaceCount +=
        1;


      const [
        first,
        second,
      ] =
        incidences;


      /*
       * Let pA and pB be orientation multipliers for the two
       * stored tetrahedron orderings.
       *
       * Their induced common-face orientations must be opposite:
       *
       *   pA oA = -pB oB
       *
       * therefore
       *
       *   pB = -pA oA oB.
       */
      const relation =
        -first
          .faceOrientation *
        second
          .faceOrientation;


      adjacency[
        first.cellIndex
      ].push({
        neighborCellIndex:
          second
            .cellIndex,

        relation,
      });


      adjacency[
        second.cellIndex
      ].push({
        neighborCellIndex:
          first
            .cellIndex,

        relation,
      });
    }
  );


  const parityByCell =
    Array(
      cellCount
    ).fill(null);

  const componentByCell =
    Array(
      cellCount
    ).fill(-1);

  const components =
    [];

  let orientationConflictCount =
    0;


  for (
    let seedCell = 0;
    seedCell < cellCount;
    seedCell += 1
  ) {
    if (
      parityByCell[
        seedCell
      ] !== null
    ) {
      continue;
    }


    const componentIndex =
      components.length;

    const componentCells =
      [];

    const queue = [
      seedCell,
    ];

    parityByCell[
      seedCell
    ] = 1;

    componentByCell[
      seedCell
    ] =
      componentIndex;


    while (
      queue.length >
      0
    ) {
      const cellIndex =
        queue.shift();

      componentCells.push(
        cellIndex
      );


      adjacency[
        cellIndex
      ].forEach(
        ({
          neighborCellIndex,
          relation,
        }) => {
          const expectedParity =
            parityByCell[
              cellIndex
            ] *
            relation;


          if (
            parityByCell[
              neighborCellIndex
            ] === null
          ) {
            parityByCell[
              neighborCellIndex
            ] =
              expectedParity;

            componentByCell[
              neighborCellIndex
            ] =
              componentIndex;

            queue.push(
              neighborCellIndex
            );

            return;
          }


          if (
            parityByCell[
              neighborCellIndex
            ] !==
            expectedParity
          ) {
            orientationConflictCount +=
              1;
          }
        }
      );
    }


    components.push(
      componentCells
    );
  }


  return {
    parityByCell,

    componentByCell,

    components,

    adjacency,

    summary: {
      cellCount,

      faceIdentityMode:
        isCanonicalSimplicialSubdivision
          ? "simplicial-vertex-triple"
          : "source-occurrence",

      connectedComponentCount:
        components.length,

      boundaryFaceCount,

      internalFaceCount,

      internalFacePairCount:
        internalFaceCount,

      facePairingFailureCount:
        explicitFaceOccurrences
          .failures
          .length,

      nonManifoldFaceCount,

      orientationConflictCount,

      orientable:
        nonManifoldFaceCount ===
          0 &&
        orientationConflictCount ===
          0,
    },
  };
}


/*
 * Compare the actual S³ determinant orientation with the coherent
 * topological orientation propagated through the quotient mesh.
 *
 * Each connected component has an arbitrary overall ± sign, so choose
 * the majority geometric sign in that component as its global S³
 * orientation. Only disagreements within that component are inversions.
 */
function auditCellOrientations(
  quotientMesh,
  cellState
) {
  const topology =
    buildCellOrientationTopology(
      quotientMesh
    );


  const correctedOrientationByCell =
    cellState.cells.map(
      (
        cell,
        cellIndex
      ) => {
        if (
          cell.orientation ===
          0
        ) {
          return 0;
        }

        return (
          cell.orientation *
          topology
            .parityByCell[
            cellIndex
          ]
        );
      }
    );


  const componentDiagnostics =
    topology.components.map(
      (
        cellIndices,
        componentIndex
      ) => {
        let positiveCount =
          0;

        let negativeCount =
          0;

        let degenerateCount =
          0;


        cellIndices.forEach(
          (cellIndex) => {
            const sign =
              correctedOrientationByCell[
                cellIndex
              ];

            if (sign > 0) {
              positiveCount +=
                1;
            } else if (
              sign < 0
            ) {
              negativeCount +=
                1;
            } else {
              degenerateCount +=
                1;
            }
          }
        );


        const globalOrientationSign =
          positiveCount >=
          negativeCount
            ? 1
            : -1;


        const mismatchCellIndices =
          cellIndices.filter(
            (cellIndex) => {
              const sign =
                correctedOrientationByCell[
                  cellIndex
                ];

              return (
                sign !== 0 &&
                sign !==
                  globalOrientationSign
              );
            }
          );


        return {
          componentIndex,

          cellCount:
            cellIndices.length,

          positiveCount,

          negativeCount,

          degenerateCount,

          globalOrientationSign,

          mismatchCellIndices,

          orientationMismatchCount:
            mismatchCellIndices
              .length,
        };
      }
    );


  const orientationMismatchCellIndices =
    componentDiagnostics.flatMap(
      (component) =>
        component
          .mismatchCellIndices
    );


  return {
    topology,

    correctedOrientationByCell,

    componentDiagnostics,

    orientationMismatchCellIndices,

    summary: {
      orientable:
        topology
          .summary
          .orientable,

      connectedComponentCount:
        topology
          .summary
          .connectedComponentCount,

      boundaryFaceCount:
        topology
          .summary
          .boundaryFaceCount,

      internalFaceCount:
        topology
          .summary
          .internalFaceCount,

      internalFacePairCount:
        topology
          .summary
          .internalFacePairCount,

      facePairingFailureCount:
        topology
          .summary
          .facePairingFailureCount,

      nonManifoldFaceCount:
        topology
          .summary
          .nonManifoldFaceCount,

      orientationConflictCount:
        topology
          .summary
          .orientationConflictCount,

      orientationMismatchCount:
        orientationMismatchCellIndices
          .length,

      degenerateCellCount:
        cellState
          .summary
          .degenerateCellCount,
    },
  };
}


function cellDiagnostics(
  quotientMesh,
  positions
) {
  const cells =
    quotientMesh
      .quotientCells
      .map(
        (cell) => {
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
            points.every(Boolean)
              ? determinant4(
                  points[0],
                  points[1],
                  points[2],
                  points[3]
                )
              : 0;


          const absoluteDeterminant =
            Math.abs(
              determinant
            );


          const orientation =
            determinant >
              CELL_DEGENERACY_TOLERANCE
              ? 1
              : determinant <
                  -CELL_DEGENERACY_TOLERANCE
                ? -1
                : 0;


          return {
            quotientCellIndex:
              cell
                .quotientCellIndex,

            tetrahedronId:
              cell
                .tetrahedronId,

            sourceCellId:
              cell
                .sourceCellId,

            quotientVertexIndices:
              cell
                .quotientVertexIndices,

            determinant,

            absoluteDeterminant,

            orientation,

            degenerate:
              orientation ===
              0,
          };
        }
      );


  const positiveCellCount =
    cells.filter(
      (cell) =>
        cell.orientation ===
        1
    ).length;


  const negativeCellCount =
    cells.filter(
      (cell) =>
        cell.orientation ===
        -1
    ).length;


  const degenerateCellCount =
    cells.filter(
      (cell) =>
        cell.orientation ===
        0
    ).length;


  const minimumAbsoluteDeterminant =
    cells.reduce(
      (
        minimum,
        cell
      ) =>
        Math.min(
          minimum,
          cell
            .absoluteDeterminant
        ),
      Infinity
    );


  const maximumAbsoluteDeterminant =
    cells.reduce(
      (
        maximum,
        cell
      ) =>
        Math.max(
          maximum,
          cell
            .absoluteDeterminant
        ),
      0
    );


  return {
    cells,

    summary: {
      cellCount:
        cells.length,

      positiveCellCount,

      negativeCellCount,

      degenerateCellCount,

      minimumAbsoluteDeterminant:
        Number.isFinite(
          minimumAbsoluteDeterminant
        )
          ? minimumAbsoluteDeterminant
          : 0,

      maximumAbsoluteDeterminant,
    },
  };
}


/*
 * ------------------------------------------------------------
 * PUBLIC ENTRY POINT
 * ------------------------------------------------------------
 */
export function createIntrinsicS3InitialSolverState({
  quotientMesh,
  boundaryTargets,
  projectiveOptions = {},
}) {
  const failures = [];


  const vertexCount =
    quotientMesh
      .quotientVertices
      .length;


  const boundaryMap =
    makeBoundaryMap(
      boundaryTargets
    );


  const interiorVertexIndices =
    [
      ...boundaryTargets
        .interiorUnknownVertexIndices,
    ];


  const adjacency =
    buildAdjacency(
      vertexCount,
      quotientMesh
        .quotientEdges
    );


  /*
   * ============================================================
   * COLLAR-AWARE STAGED INITIALIZATION
   * ============================================================
   *
   * The quotient now has five geometric strata:
   *
   *   108 fixed outer boundary vertices B_i = S0
   *   108 movable analytic-collar vertices C_i = S1
   *   108 movable first-transition vertices T_i = S2
   *   108 movable second-transition vertices U_i = S3
   *    10 movable deep-core vertices H_i
   *
   * S2 and S3 are coherent copies of the same material torus. Their
   * initial positions are successive samples of the exact Projection
   * Lab tube; after seeding, both layers and H are optimized together.
   *
   * Instead:
   *
   *   1. read each B_i's exact cusp material address;
   *   2. evaluate the SAME smooth S³ tube used by Projection Lab;
   *   3. place S1 at rho + collarDepth;
   *   4. place S2 at rho + collarDepth + transitionGap;
   *   5. place S3 one equal material depth farther inward;
   *   6. hold S0/S1/S2/S3 fixed temporarily and harmonically seed H;
   *   7. choose the coherent seed, then run the coupled 226-variable
   *      projective solve for S2 + S3 + H.
   */
  const collarVertexIndices =
    interiorVertexIndices
      .filter(
        (vertexIndex) =>
          quotientMesh
            .quotientVertices[
            vertexIndex
          ]?.cuspCollar
      );

  const transitionVertexIndices =
    interiorVertexIndices
      .filter(
        (vertexIndex) =>
          quotientMesh
            .quotientVertices[
            vertexIndex
          ]?.cuspTransition
      );

  const secondTransitionVertexIndices =
    interiorVertexIndices
      .filter(
        (vertexIndex) =>
          quotientMesh
            .quotientVertices[
            vertexIndex
          ]?.cuspTransition2
      );

  const deepInteriorVertexIndices =
    interiorVertexIndices
      .filter(
        (vertexIndex) => {
          const quotientVertex =
            quotientMesh
              .quotientVertices[
              vertexIndex
            ];

          return (
            !quotientVertex
              ?.cuspCollar &&
            !quotientVertex
              ?.cuspTransition &&
            !quotientVertex
              ?.cuspTransition2
          );
        }
      );

  const deepInteriorVertexSet =
    new Set(
      deepInteriorVertexIndices
    );


  /*
   * Stage 0:
   *
   * Preserve the old full harmonic solve only as a neutral GUIDE.
   * Its collar positions are not used as the final initialization.
   */
  const globalHarmonicSystem =
    buildHarmonicSystem({
      quotientMesh,

      boundaryMap,

      interiorVertexIndices,

      adjacency,
    });

  const globalHarmonicSolution =
    solveHarmonicCoordinates(
      globalHarmonicSystem
    );

  if (
    !globalHarmonicSolution
      .succeeded
  ) {
    failures.push({
      reason:
        "global-harmonic-linear-system-singular",

      method:
        globalHarmonicSolution.method,

      iterationCounts:
        globalHarmonicSolution
          .iterationCounts ??
        null,

      residualNorms:
        globalHarmonicSolution
          .residualNorms ??
        null,

      tolerances:
        globalHarmonicSolution
          .tolerances ??
        null,

      breakdownReasons:
        globalHarmonicSolution
          .breakdownReasons ??
        null,

      systemAudit:
        globalHarmonicSolution
          .systemAudit ??
        null,
    });
  }


  const positions =
    Array(
      vertexCount
    ).fill(null);


  boundaryMap.forEach(
    (
      point,
      vertexIndex
    ) => {
      positions[
        vertexIndex
      ] =
        clonePoint4(
          point
        );
    }
  );


  let minimumHarmonicVectorNorm =
    Infinity;

  let fallbackInteriorVertexCount =
    0;


  const globalGuideByVertex =
    new Map();


  interiorVertexIndices.forEach(
    (
      vertexIndex,
      interiorIndex
    ) => {
      const quotientVertex =
        quotientMesh
          .quotientVertices[
          vertexIndex
        ];

      const fallback =
        sourcePointFallbackS3(
          quotientVertex
            .sourcePoint
        );

      const harmonicPoint =
        globalHarmonicSolution
          .succeeded
          ? point4(
              globalHarmonicSolution
                .solutionX[
                interiorIndex
              ],

              globalHarmonicSolution
                .solutionY[
                interiorIndex
              ],

              globalHarmonicSolution
                .solutionZ[
                interiorIndex
              ],

              globalHarmonicSolution
                .solutionW[
                interiorIndex
              ]
            )
          : null;

      const harmonicNorm =
        harmonicPoint
          ? point4Norm(
              harmonicPoint
            )
          : 0;

      minimumHarmonicVectorNorm =
        Math.min(
          minimumHarmonicVectorNorm,
          harmonicNorm
        );

      if (
        harmonicNorm <
        EPSILON
      ) {
        fallbackInteriorVertexCount +=
          1;
      }

      globalGuideByVertex.set(
        vertexIndex,

        normalizePoint4(
          harmonicPoint ??
            fallback,

          fallback
        )
      );
    }
  );


  /*
   * ============================================================
   * EXACT SHARED PROJECTION-LAB COLLAR
   * ============================================================
   *
   * Do not estimate the collar normal from the 72 triangulated
   * boundary faces.
   *
   * Every canonical boundary vertex already carries the same raw
   * cusp material address used by Projection Lab. The shared
   * figureEightS3Geometry module therefore gives us:
   *
   *   X(route,minor)
   *   N_rho(route,minor)
   *
   * analytically on the actual smooth tube.
   *
   * Increasing rho moves away from the knot centerline and into the
   * knot complement, so the collar sign is no longer arbitrary.
   */
  const boundaryOrientationTopology =
    buildCellOrientationTopology(
      quotientMesh
    );


  const sharedProjectionLabTube =
    defaultFigureEightS3Tube();


  const sharedCollarDataByVertex =
    new Map();


  let sharedCollarCoordinateFailureCount =
    0;

  let maximumSharedBoundaryFrameDisplacement =
    0;

  let maximumSharedBoundaryNormalDot =
    0;

  let maximumSharedBoundaryFrameNormError =
    0;


  collarVertexIndices.forEach(
    (vertexIndex) => {
      const quotientVertex =
        quotientMesh
          .quotientVertices[
          vertexIndex
        ];

      const parentIndex =
        quotientVertex
          ?.collarParentQuotientVertexIndex;

      const parentVertex =
        Number.isInteger(
          parentIndex
        )
          ? quotientMesh
              .quotientVertices[
              parentIndex
            ]
          : null;

      /*
       * Prefer the material address copied directly onto the
       * collar vertex. Fall back to its fixed parent.
       */
      const rawPoint =
        quotientVertex
          ?.collarData
          ?.raw ??
        parentVertex
          ?.cuspData
          ?.representative
          ?.raw ??
        null;

      const parentPoint =
        Number.isInteger(
          parentIndex
        )
          ? boundaryMap.get(
              parentIndex
            )
          : null;

      const tubeCoordinates =
        rawPoint
          ? cuspTubeCoordinates(
              rawPoint
            )
          : null;


      if (
        !parentPoint ||
        !tubeCoordinates ||
        !Number.isFinite(
          tubeCoordinates
            .routeAmount
        ) ||
        !Number.isFinite(
          tubeCoordinates
            .minorAmount
        )
      ) {
        sharedCollarCoordinateFailureCount +=
          1;

        failures.push({
          reason:
            "missing-shared-projection-lab-collar-coordinate",

          vertexIndex,

          parentIndex,
        });

        return;
      }


      const frame =
        sampleFigureEightS3TubeMaterialFrame4(
          sharedProjectionLabTube,

          tubeCoordinates
            .routeAmount,

          tubeCoordinates
            .minorAmount
        );


      const framePoint =
        point4(
          frame.point[0],
          frame.point[1],
          frame.point[2],
          frame.point[3]
        );

      const outwardNormal =
        point4(
          frame.outwardNormal[0],
          frame.outwardNormal[1],
          frame.outwardNormal[2],
          frame.outwardNormal[3]
        );


      /*
       * The fixed boundary target and the material-frame point
       * should be the same point on the same shared tube.
       */
      const frameDisplacement =
        point4Distance(
          parentPoint,
          framePoint
        );


      const boundaryNormalDot =
        Math.abs(
          parentPoint.x *
            outwardNormal.x +
          parentPoint.y *
            outwardNormal.y +
          parentPoint.z *
            outwardNormal.z +
          parentPoint.w *
            outwardNormal.w
        );


      const frameNormError =
        Math.max(
          Math.abs(
            point4Norm(
              framePoint
            ) -
            1
          ),

          Math.abs(
            point4Norm(
              outwardNormal
            ) -
            1
          )
        );


      maximumSharedBoundaryFrameDisplacement =
        Math.max(
          maximumSharedBoundaryFrameDisplacement,
          frameDisplacement
        );

      maximumSharedBoundaryNormalDot =
        Math.max(
          maximumSharedBoundaryNormalDot,
          boundaryNormalDot
        );

      maximumSharedBoundaryFrameNormError =
        Math.max(
          maximumSharedBoundaryFrameNormError,
          frameNormError
        );


      sharedCollarDataByVertex.set(
        vertexIndex,
        {
          parentIndex,

          routeAmount:
            tubeCoordinates
              .routeAmount,

          minorAmount:
            tubeCoordinates
              .minorAmount,

          framePoint,

          outwardNormal,

          frameDisplacement,
        }
      );
    }
  );


  const sharedProjectionLabCollar = {
    valid:
      sharedCollarCoordinateFailureCount ===
        0 &&
      sharedCollarDataByVertex.size ===
        collarVertexIndices.length &&
      maximumSharedBoundaryFrameDisplacement <=
        1e-9 &&
      maximumSharedBoundaryNormalDot <=
        1e-10 &&
      maximumSharedBoundaryFrameNormError <=
        1e-10,

    summary: {
      collarVertexCount:
        collarVertexIndices.length,

      materialAddressCount:
        sharedCollarDataByVertex.size,

      coordinateFailureCount:
        sharedCollarCoordinateFailureCount,

      maximumBoundaryFrameDisplacement:
        maximumSharedBoundaryFrameDisplacement,

      maximumBoundaryNormalDot:
        maximumSharedBoundaryNormalDot,

      maximumFrameNormError:
        maximumSharedBoundaryFrameNormError,

      tubeNu:
        sharedProjectionLabTube.nu,

      tubeNv:
        sharedProjectionLabTube.nv,

      tubeRho:
        sharedProjectionLabTube.rho,

      /*
       * +1 = increasing rho = away from the knot core.
       */
      complementNormalSign:
        1,
    },
  };


  if (
    !sharedProjectionLabCollar.valid
  ) {
    failures.push({
      reason:
        "invalid-shared-projection-lab-collar",

      summary:
        sharedProjectionLabCollar
          .summary,
    });
  }


  /*
   * ============================================================
   * S2 MATERIAL-SURFACE ADDRESSING
   * ============================================================
   *
   * Every transition vertex was created as the material partner of
   * exactly one S1 collar vertex. Preserve that address explicitly.
   *
   * S2 is sampled from ONE smooth two-parameter S³ surface rather
   * than solving its 108 vertices independently.
   */
  const transitionDataByVertex =
    new Map();

  const collarVertexSet =
    new Set(
      collarVertexIndices
    );

  let transitionCoordinateFailureCount =
    0;

  let maximumTransitionMaterialCoordinateError =
    0;


  function periodicCoordinateDifference(
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

      const collarParent =
        Number.isInteger(
          collarParentIndex
        )
          ? quotientMesh
              .quotientVertices[
              collarParentIndex
            ]
          : null;

      const rawPoint =
        quotientVertex
          ?.transitionData
          ?.raw ??
        collarParent
          ?.collarData
          ?.raw ??
        null;

      const tubeCoordinates =
        rawPoint
          ? cuspTubeCoordinates(
              rawPoint
            )
          : null;

      const parentMaterialData =
        Number.isInteger(
          collarParentIndex
        )
          ? sharedCollarDataByVertex
              .get(
                collarParentIndex
              )
          : null;


      if (
        !collarVertexSet.has(
          collarParentIndex
        ) ||
        !tubeCoordinates ||
        !parentMaterialData ||
        !Number.isFinite(
          tubeCoordinates
            .routeAmount
        ) ||
        !Number.isFinite(
          tubeCoordinates
            .minorAmount
        )
      ) {
        transitionCoordinateFailureCount +=
          1;

        failures.push({
          reason:
            "invalid-transition-material-address",

          vertexIndex,

          collarParentIndex,
        });

        return;
      }


      const materialCoordinateError =
        Math.max(
          periodicCoordinateDifference(
            tubeCoordinates
              .routeAmount,

            parentMaterialData
              .routeAmount
          ),

          periodicCoordinateDifference(
            tubeCoordinates
              .minorAmount,

            parentMaterialData
              .minorAmount
          )
        );


      maximumTransitionMaterialCoordinateError =
        Math.max(
          maximumTransitionMaterialCoordinateError,
          materialCoordinateError
        );


      transitionDataByVertex.set(
        vertexIndex,
        {
          collarParentIndex,

          routeAmount:
            tubeCoordinates
              .routeAmount,

          minorAmount:
            tubeCoordinates
              .minorAmount,

          materialCoordinateError,
        }
      );
    }
  );


  const sharedProjectionLabTransition = {
    valid:
      transitionCoordinateFailureCount ===
        0 &&
      transitionDataByVertex.size ===
        transitionVertexIndices.length &&
      maximumTransitionMaterialCoordinateError <=
        1e-10,

    summary: {
      transitionVertexCount:
        transitionVertexIndices.length,

      materialAddressCount:
        transitionDataByVertex.size,

      coordinateFailureCount:
        transitionCoordinateFailureCount,

      maximumMaterialCoordinateError:
        maximumTransitionMaterialCoordinateError,
    },
  };


  if (
    !sharedProjectionLabTransition.valid
  ) {
    failures.push({
      reason:
        "invalid-shared-projection-lab-transition",

      summary:
        sharedProjectionLabTransition
          .summary,
    });
  }


  /*
   * ============================================================
   * S3 MATERIAL-SURFACE ADDRESSING
   * ============================================================
   *
   * S3 is another copy of the same 108 material addresses. Match it
   * to S2 by the exact periodic (route, minor) material coordinates,
   * independent of any implementation-specific parent-field name.
   */
  const secondTransitionDataByVertex =
    new Map();

  const secondTransitionParentByVertex =
    new Map();

  let secondTransitionCoordinateFailureCount =
    0;

  let maximumSecondTransitionMaterialCoordinateError =
    0;


  function canonicalPeriodicCoordinate(value) {
    const wrapped =
      ((value % 1) + 1) % 1;

    return Math.abs(wrapped - 1) < 1e-10
      ? 0
      : wrapped;
  }


  function materialCoordinateKey(
    routeAmount,
    minorAmount
  ) {
    const route =
      canonicalPeriodicCoordinate(
        routeAmount
      );

    const minor =
      canonicalPeriodicCoordinate(
        minorAmount
      );

    return (
      `${Math.round(route * 1e10)}:` +
      `${Math.round(minor * 1e10)}`
    );
  }


  const transitionVertexByMaterialKey =
    new Map();

  transitionDataByVertex.forEach(
    (data, vertexIndex) => {
      transitionVertexByMaterialKey.set(
        materialCoordinateKey(
          data.routeAmount,
          data.minorAmount
        ),
        vertexIndex
      );
    }
  );


  secondTransitionVertexIndices.forEach(
    (vertexIndex) => {
      const quotientVertex =
        quotientMesh
          .quotientVertices[
          vertexIndex
        ];

      /*
       * S3 carries the developed cusp material address explicitly.
       * sourcePoint is the intrinsic 3D source position, not a cusp
       * raw point, so it must never shadow secondTransitionData.raw.
       */
      const rawPoint =
        quotientVertex
          ?.secondTransitionData
          ?.raw ??
        quotientVertex
          ?.transitionData
          ?.raw ??
        quotientVertex
          ?.sourcePoint ??
        null;

      const tubeCoordinates =
        rawPoint
          ? cuspTubeCoordinates(
              rawPoint
            )
          : null;

      if (
        !tubeCoordinates ||
        !Number.isFinite(
          tubeCoordinates.routeAmount
        ) ||
        !Number.isFinite(
          tubeCoordinates.minorAmount
        )
      ) {
        secondTransitionCoordinateFailureCount +=
          1;

        failures.push({
          reason:
            "invalid-second-transition-material-address",

          vertexIndex,
        });

        return;
      }

      const materialKey =
        materialCoordinateKey(
          tubeCoordinates.routeAmount,
          tubeCoordinates.minorAmount
        );

      const materialParentTransitionVertexIndex =
        transitionVertexByMaterialKey.get(
          materialKey
        );

      const explicitParentTransitionVertexIndex =
        quotientVertex
          ?.secondTransitionParentQuotientVertexIndex ??
        quotientVertex
          ?.secondTransitionData
          ?.transitionQuotientVertexIndex ??
        null;

      const parentTransitionVertexIndex =
        Number.isInteger(
          explicitParentTransitionVertexIndex
        )
          ? explicitParentTransitionVertexIndex
          : materialParentTransitionVertexIndex;

      const parentData =
        Number.isInteger(
          parentTransitionVertexIndex
        )
          ? transitionDataByVertex.get(
              parentTransitionVertexIndex
            )
          : null;

      const parentMismatch =
        Number.isInteger(
          materialParentTransitionVertexIndex
        ) &&
        Number.isInteger(
          explicitParentTransitionVertexIndex
        ) &&
        materialParentTransitionVertexIndex !==
          explicitParentTransitionVertexIndex;

      if (
        !parentData ||
        parentMismatch
      ) {
        secondTransitionCoordinateFailureCount +=
          1;

        failures.push({
          reason:
            parentMismatch
              ? "inconsistent-second-transition-material-parent"
              : "missing-second-transition-material-parent",

          vertexIndex,
          materialKey,
          materialParentTransitionVertexIndex,
          explicitParentTransitionVertexIndex,
        });

        return;
      }

      const materialCoordinateError =
        Math.max(
          periodicCoordinateDifference(
            tubeCoordinates.routeAmount,
            parentData.routeAmount
          ),

          periodicCoordinateDifference(
            tubeCoordinates.minorAmount,
            parentData.minorAmount
          )
        );

      maximumSecondTransitionMaterialCoordinateError =
        Math.max(
          maximumSecondTransitionMaterialCoordinateError,
          materialCoordinateError
        );

      secondTransitionParentByVertex.set(
        vertexIndex,
        parentTransitionVertexIndex
      );

      secondTransitionDataByVertex.set(
        vertexIndex,
        {
          parentTransitionVertexIndex,
          routeAmount:
            tubeCoordinates.routeAmount,
          minorAmount:
            tubeCoordinates.minorAmount,
          materialCoordinateError,
        }
      );
    }
  );


  const sharedProjectionLabSecondTransition = {
    valid:
      secondTransitionCoordinateFailureCount ===
        0 &&
      secondTransitionDataByVertex.size ===
        secondTransitionVertexIndices.length &&
      maximumSecondTransitionMaterialCoordinateError <=
        1e-10,

    summary: {
      secondTransitionVertexCount:
        secondTransitionVertexIndices.length,

      materialAddressCount:
        secondTransitionDataByVertex.size,

      coordinateFailureCount:
        secondTransitionCoordinateFailureCount,

      maximumMaterialCoordinateError:
        maximumSecondTransitionMaterialCoordinateError,
    },
  };


  if (
    !sharedProjectionLabSecondTransition.valid
  ) {
    failures.push({
      reason:
        "invalid-shared-projection-lab-second-transition",

      summary:
        sharedProjectionLabSecondTransition
          .summary,
    });
  }


  /*
   * delta is actual S³ geodesic distance in radians.
   *
   * Positive delta increases the canonical tube radius rho.
   * For the boundary of a tubular knot neighborhood this is the
   * complement side. Do not test the opposite solid-torus side.
   */
  const collarDepthCandidates = [
    0.005,
    0.01,
    0.02,
    0.04,
    0.07,
    0.11,
    0.16,
    0.23,
  ];


  const transitionGapCandidates = [
    0.01,
    0.02,
    0.04,
    0.07,
    0.11,
  ];


  const collarNormalSigns = [
    1,
  ];


  const initializationCandidates =
    [];


  collarNormalSigns.forEach(
    (normalSign) => {
      collarDepthCandidates.forEach(
        (collarDepth) => {
          transitionGapCandidates.forEach(
            (transitionGap) => {
              const transitionDepth =
                collarDepth +
                transitionGap;

              /*
               * Equal initial material spacing gives S3 a neutral,
               * coherent seed. The projective solver is free to deform
               * both S2 and S3 afterward.
               */
              const secondTransitionGap =
                transitionGap;

              const secondTransitionDepth =
                transitionDepth +
                secondTransitionGap;


              const candidatePositions =
                Array(
                  vertexCount
                ).fill(null);


              boundaryMap.forEach(
                (
                  point,
                  vertexIndex
                ) => {
                  candidatePositions[
                    vertexIndex
                  ] =
                    clonePoint4(
                      point
                    );
                }
              );


              let candidateValid =
                sharedProjectionLabCollar.valid &&
                sharedProjectionLabTransition.valid &&
                sharedProjectionLabSecondTransition.valid;


              /*
               * Stage 1:
               *
               * S0 -> S1 follows the exact smooth material normal
               * continuation used by Projection Lab.
               */
              collarVertexIndices.forEach(
                (vertexIndex) => {
                  const quotientVertex =
                    quotientMesh
                      .quotientVertices[
                      vertexIndex
                    ];

                  const parentIndex =
                    quotientVertex
                      .collarParentQuotientVertexIndex;

                  const parentPoint =
                    boundaryMap.get(
                      parentIndex
                    );

                  const sharedCollarData =
                    sharedCollarDataByVertex
                      .get(
                        vertexIndex
                      );


                  if (
                    !parentPoint ||
                    !sharedCollarData
                  ) {
                    candidateValid =
                      false;

                    return;
                  }


                  const collarPoint =
                    sampleFigureEightS3CollarPoint4(
                      sharedProjectionLabTube,

                      sharedCollarData
                        .routeAmount,

                      sharedCollarData
                        .minorAmount,

                      collarDepth
                    );


                  candidatePositions[
                    vertexIndex
                  ] =
                    point4(
                      collarPoint[0],
                      collarPoint[1],
                      collarPoint[2],
                      collarPoint[3]
                    );
                }
              );


              /*
               * Stage 2:
               *
               * S2 is one coherent MATERIAL SURFACE.
               *
               * Every T_i keeps exactly the same (route,minor)
               * address as its S1 parent. The entire 108-vertex
               * torus is sampled from the same smooth S³ map at:
               *
               *   rho + collarDepth + transitionGap
               */
              transitionVertexIndices.forEach(
                (vertexIndex) => {
                  const transitionData =
                    transitionDataByVertex
                      .get(
                        vertexIndex
                      );


                  if (!transitionData) {
                    candidateValid =
                      false;

                    return;
                  }


                  const transitionPoint =
                    sampleFigureEightS3CollarPoint4(
                      sharedProjectionLabTube,

                      transitionData
                        .routeAmount,

                      transitionData
                        .minorAmount,

                      transitionDepth
                    );


                  candidatePositions[
                    vertexIndex
                  ] =
                    point4(
                      transitionPoint[0],
                      transitionPoint[1],
                      transitionPoint[2],
                      transitionPoint[3]
                    );
                }
              );


              /*
               * Stage 3:
               *
               * S3 is the next coherent copy of the same material torus.
               * It begins one equal tube-depth step beyond S2.
               */
              secondTransitionVertexIndices.forEach(
                (vertexIndex) => {
                  const transitionData =
                    secondTransitionDataByVertex
                      .get(
                        vertexIndex
                      );

                  if (!transitionData) {
                    candidateValid =
                      false;

                    return;
                  }

                  const transitionPoint =
                    sampleFigureEightS3CollarPoint4(
                      sharedProjectionLabTube,

                      transitionData.routeAmount,
                      transitionData.minorAmount,
                      secondTransitionDepth
                    );

                  candidatePositions[
                    vertexIndex
                  ] =
                    point4(
                      transitionPoint[0],
                      transitionPoint[1],
                      transitionPoint[2],
                      transitionPoint[3]
                    );
                }
              );


              /*
               * Stage 4:
               *
               * Treat S0, S1, S2, and S3 as temporary Dirichlet data.
               * Solve ONLY the ten genuine deep-core vertices.
               */
              const stagedBoundaryMap =
                new Map(
                  boundaryMap
                );


              [
                ...collarVertexIndices,
                ...transitionVertexIndices,
                ...secondTransitionVertexIndices,
              ].forEach(
                (vertexIndex) => {
                  const point =
                    candidatePositions[
                      vertexIndex
                    ];

                  if (point) {
                    stagedBoundaryMap.set(
                      vertexIndex,
                      point
                    );
                  }
                }
              );


              const deepCoreHarmonicSystem =
                buildHarmonicSystem({
                  quotientMesh,

                  boundaryMap:
                    stagedBoundaryMap,

                  interiorVertexIndices:
                    deepInteriorVertexIndices,

                  adjacency,
                });


              const deepCoreSolution =
                solveHarmonicCoordinates(
                  deepCoreHarmonicSystem
                );


              if (
                !deepCoreSolution
                  .succeeded
              ) {
                candidateValid =
                  false;
              }


              deepInteriorVertexIndices.forEach(
                (
                  vertexIndex,
                  interiorIndex
                ) => {
                  const guideFallback =
                    globalGuideByVertex
                      .get(
                        vertexIndex
                      );

                  const harmonicPoint =
                    deepCoreSolution
                      .succeeded
                      ? point4(
                          deepCoreSolution
                            .solutionX[
                            interiorIndex
                          ],

                          deepCoreSolution
                            .solutionY[
                            interiorIndex
                          ],

                          deepCoreSolution
                            .solutionZ[
                            interiorIndex
                          ],

                          deepCoreSolution
                            .solutionW[
                            interiorIndex
                          ]
                        )
                      : null;

                  candidatePositions[
                    vertexIndex
                  ] =
                    normalizePoint4(
                      harmonicPoint ??
                        guideFallback,

                      guideFallback
                    );
                }
              );


              if (
                candidatePositions
                  .some(
                    (point) =>
                      !point
                  )
              ) {
                candidateValid =
                  false;
              }


              /*
               * Evaluate the COMPLETE 2304-cell manifold.
               */
              const candidateCellState =
                candidateValid
                  ? cellDiagnostics(
                      quotientMesh,
                      candidatePositions
                    )
                  : null;

              const candidateOrientationAudit =
                candidateCellState
                  ? auditCellOrientations(
                      quotientMesh,
                      candidateCellState
                    )
                  : null;


              function correctedSignsForBoundaryKind(
                boundaryKind
              ) {
                return candidateOrientationAudit
                  ? candidateOrientationAudit
                      .correctedOrientationByCell
                      .filter(
                        (
                          _sign,
                          cellIndex
                        ) =>
                          quotientMesh
                            .quotientCells[
                            cellIndex
                          ]
                            .sourceBoundaryKind ===
                          boundaryKind
                      )
                  : [];
              }


              function orientationCounts(
                correctedSigns
              ) {
                const positiveCount =
                  correctedSigns
                    .filter(
                      (sign) =>
                        sign > 0
                    )
                    .length;

                const negativeCount =
                  correctedSigns
                    .filter(
                      (sign) =>
                        sign < 0
                    )
                    .length;

                const degenerateCount =
                  correctedSigns
                    .filter(
                      (sign) =>
                        sign === 0
                    )
                    .length;

                return {
                  positiveCount,
                  negativeCount,
                  degenerateCount,

                  orientationMinorityCount:
                    Math.min(
                      positiveCount,
                      negativeCount
                    ),
                };
              }


              const collarCounts =
                orientationCounts(
                  correctedSignsForBoundaryKind(
                    "cusp-collar"
                  )
                );


              const transitionCounts =
                orientationCounts(
                  correctedSignsForBoundaryKind(
                    "cusp-transition"
                  )
                );


              const collarGlobalMismatchCount =
                candidateOrientationAudit
                  ? candidateOrientationAudit
                      .orientationMismatchCellIndices
                      .filter(
                        (cellIndex) =>
                          quotientMesh
                            .quotientCells[
                            cellIndex
                          ]
                            .sourceBoundaryKind ===
                          "cusp-collar"
                      )
                      .length
                  : Infinity;


              const transitionGlobalMismatchCount =
                candidateOrientationAudit
                  ? candidateOrientationAudit
                      .orientationMismatchCellIndices
                      .filter(
                        (cellIndex) =>
                          quotientMesh
                            .quotientCells[
                            cellIndex
                          ]
                            .sourceBoundaryKind ===
                          "cusp-transition"
                      )
                      .length
                  : Infinity;


              initializationCandidates.push({
                collarDepth,

                transitionGap,

                transitionDepth,

                secondTransitionGap,

                secondTransitionDepth,

                normalSign,

                signedCollarDepth:
                  normalSign *
                  collarDepth,

                collarPositiveCount:
                  collarCounts
                    .positiveCount,

                collarNegativeCount:
                  collarCounts
                    .negativeCount,

                collarDegenerateCount:
                  collarCounts
                    .degenerateCount,

                collarOrientationMinorityCount:
                  collarCounts
                    .orientationMinorityCount,

                collarGlobalMismatchCount,

                transitionPositiveCount:
                  transitionCounts
                    .positiveCount,

                transitionNegativeCount:
                  transitionCounts
                    .negativeCount,

                transitionDegenerateCount:
                  transitionCounts
                    .degenerateCount,

                transitionOrientationMinorityCount:
                  transitionCounts
                    .orientationMinorityCount,

                transitionGlobalMismatchCount,

                valid:
                  Boolean(
                    candidateValid &&
                    deepCoreSolution
                      .succeeded &&
                    candidateOrientationAudit
                      ?.summary
                      ?.orientable
                  ),

                positions:
                  candidatePositions,

                deepCoreHarmonicSystem,

                deepCoreLinearSolveSucceeded:
                  deepCoreSolution
                    .succeeded,

                orientationMismatchCount:
                  candidateOrientationAudit
                    ?.summary
                    ?.orientationMismatchCount ??
                  Infinity,

                degenerateCellCount:
                  candidateCellState
                    ?.summary
                    ?.degenerateCellCount ??
                  Infinity,

                minimumAbsoluteDeterminant:
                  candidateCellState
                    ?.summary
                    ?.minimumAbsoluteDeterminant ??
                  0,
              });
            }
          );
        }
      );
    }
  );


  /*
   * Choose the best geometrically legal seed:
   *
   *   1. fewest degeneracies
   *   2. fewest orientation mismatches
   *   3. largest minimum determinant magnitude
   */
  const viableInitializationCandidates =
    initializationCandidates
      .filter(
        (candidate) =>
          candidate.valid
      )
      .sort(
        (
          first,
          second
        ) =>
          first
            .degenerateCellCount -
            second
              .degenerateCellCount ||
          first
            .collarDegenerateCount -
            second
              .collarDegenerateCount ||
          first
            .collarOrientationMinorityCount -
            second
              .collarOrientationMinorityCount ||
          first
            .transitionDegenerateCount -
            second
              .transitionDegenerateCount ||
          first
            .transitionOrientationMinorityCount -
            second
              .transitionOrientationMinorityCount ||
          first
            .orientationMismatchCount -
            second
              .orientationMismatchCount ||
          second
            .minimumAbsoluteDeterminant -
            first
              .minimumAbsoluteDeterminant
      );


  const selectedInitialization =
    viableInitializationCandidates[
      0
    ] ??
    null;


  if (
    !selectedInitialization
  ) {
    failures.push({
      reason:
        "no-valid-collar-initialization-candidate",
    });


    /*
     * Preserve a complete diagnostic state if staged initialization
     * unexpectedly fails.
     */
    interiorVertexIndices.forEach(
      (vertexIndex) => {
        positions[
          vertexIndex
        ] =
          globalGuideByVertex
            .get(
              vertexIndex
            );
      }
    );
  } else {
    selectedInitialization
      .positions
      .forEach(
        (
          point,
          vertexIndex
        ) => {
          positions[
            vertexIndex
          ] =
            point
              ? clonePoint4(
                  point
                )
              : null;
        }
      );
  }


  /*
   * ============================================================
   * STAGE 5: COUPLED PROJECTIVE S2 + S3 + H DEFORMATION
   * ============================================================
   *
   * Candidate selection above chooses the best exact normal-tube
   * seed. From this point onward S2, S3, and the ten H vertices move
   * together on S³ under the quotient orientation inequalities.
   *
   * S0 and S1 remain exact. Both transition product layers are
   * protected against orientation reversal.
   */
  const projectiveTransitionSurface =
    selectedInitialization
      ? optimizeIntrinsicS3LayeredProjectiveSurfaces({
          quotientMesh,

          initialPositions:
            positions,

          transitionVertexIndices,

          secondTransitionVertexIndices,

          secondTransitionParentByVertex,

          collarVertexIndices,

          deepInteriorVertexIndices,

          boundaryMap,

          adjacency,

          orientationTopology:
            boundaryOrientationTopology,

          globalGuideByVertex,

          options:
            projectiveOptions,

          operations: {
            determinant4,
            cellDiagnostics,
            auditCellOrientations,
            buildHarmonicSystem,
            solveHarmonicCoordinates,
          },
        })
      : null;


  if (
    projectiveTransitionSurface
      ?.valid
  ) {
    projectiveTransitionSurface
      .positions
      .forEach(
        (
          point,
          vertexIndex
        ) => {
          positions[
            vertexIndex
          ] =
            point
              ? clonePoint4(
                  point
                )
              : null;
        }
      );
  } else if (
    selectedInitialization
  ) {
    failures.push({
      reason:
        "projective-transition-surface-solve-failed",

      summary:
        projectiveTransitionSurface
          ?.summary ??
        null,
    });
  }


  const selectedCollarDepth =
    selectedInitialization
      ?.collarDepth ??
    null;

  const selectedTransitionGap =
    selectedInitialization
      ?.transitionGap ??
    null;

  const selectedTransitionDepth =
    selectedInitialization
      ?.transitionDepth ??
    null;

  const selectedSecondTransitionGap =
    selectedInitialization
      ?.secondTransitionGap ??
    null;

  const selectedSecondTransitionDepth =
    selectedInitialization
      ?.secondTransitionDepth ??
    null;

  const selectedCollarNormalSign =
    selectedInitialization
      ?.normalSign ??
    null;

  const selectedSignedCollarDepth =
    selectedInitialization
      ?.signedCollarDepth ??
    null;


  const linearSolveSucceeded =
    globalHarmonicSolution
      .succeeded &&
    Boolean(
      selectedInitialization
        ?.deepCoreLinearSolveSucceeded
    ) &&
    (
      !projectiveTransitionSurface ||
      projectiveTransitionSurface
        .deepCoreLinearSolveSucceeded
    );


  /*
   * Preserve the original public field while exposing the staged
   * deep-core system separately.
   */
  const harmonicSystem =
    globalHarmonicSystem;

  const stagedHarmonicSystem =
    projectiveTransitionSurface
      ?.finalDeepCoreHarmonicSystem ??
    selectedInitialization
      ?.deepCoreHarmonicSystem ??
    null;


  const missingPositionIndices =
    positions
      .map(
        (
          position,
          index
        ) =>
          position
            ? null
            : index
      )
      .filter(
        (index) =>
          index !== null
      );


  if (
    missingPositionIndices.length >
    0
  ) {
    failures.push({
      reason:
        "missing-s3-vertex-positions",

      vertexIndices:
        missingPositionIndices,
    });
  }


  let maximumNormError =
    0;


  positions.forEach(
    (
      position,
      vertexIndex
    ) => {
      if (!position) {
        return;
      }

      const normError =
        Math.abs(
          point4Norm(
            position
          ) -
          1
        );


      maximumNormError =
        Math.max(
          maximumNormError,
          normError
        );


      if (
        !Number.isFinite(
          normError
        )
      ) {
        failures.push({
          reason:
            "nonfinite-s3-position",

          vertexIndex,
        });
      }
    }
  );


  let maximumBoundaryDisplacement =
    0;


  boundaryMap.forEach(
    (
      target,
      vertexIndex
    ) => {
      const position =
        positions[
          vertexIndex
        ];

      if (!position) {
        return;
      }

      maximumBoundaryDisplacement =
        Math.max(
          maximumBoundaryDisplacement,

          point4Distance(
            target,
            position
          )
        );
    }
  );


  const cellState =
    cellDiagnostics(
      quotientMesh,
      positions
    );


  /*
   * Raw positive/negative determinant counts depend on each cell's
   * stored vertex ordering.
   *
   * Convert them into meaningful manifold-orientation diagnostics.
   */
  const orientationAudit =
    auditCellOrientations(
      quotientMesh,
      cellState
    );


  /*
   * Run the nonlinear solve only on demand.
   *
   * This keeps ordinary page refreshes fast while preserving the exact
   * harmonic initialization as our reproducible starting state.
   */
  const runRelaxation =
    (options = {}) =>
      runIntrinsicS3NonlinearRelaxation({
        quotientMesh,

        initialPositions:
          positions,

        interiorVertexIndices,

        orientationAudit,

        initialCellState:
          cellState,

        options,
      });


  const ready =
    boundaryTargets.valid &&
    quotientMesh.valid &&
    linearSolveSucceeded &&
    failures.length === 0 &&
    missingPositionIndices
      .length === 0 &&
    positions.length ===
      vertexCount;


  return {
    ready,

    method:
      "exact Projection-Lab S0/S1 + coupled projective S2/S3 material surfaces + 10-vertex projective deep core",

    selectedCollarDepth,

    selectedTransitionGap,

    selectedTransitionDepth,

    selectedSecondTransitionGap,

    selectedSecondTransitionDepth,

    selectedCollarNormalSign,

    selectedSignedCollarDepth,

    sharedProjectionLabCollar:
      sharedProjectionLabCollar
        .summary,

    sharedProjectionLabTransition:
      sharedProjectionLabTransition
        .summary,

    sharedProjectionLabSecondTransition:
      sharedProjectionLabSecondTransition
        .summary,

    projectiveTransitionSurface:
      projectiveTransitionSurface
        ? {
            valid:
              projectiveTransitionSurface
                .valid,

            summary:
              projectiveTransitionSurface
                .summary,

            history:
              projectiveTransitionSurface
                .history,

            initialMismatchCountsByRegion:
              projectiveTransitionSurface
                .initialMismatchCountsByRegion,

            finalMismatchCountsByRegion:
              projectiveTransitionSurface
                .finalMismatchCountsByRegion,
          }
        : null,

    boundaryOrientationTopology:
      boundaryOrientationTopology
        .summary,

    initializationCandidates:
      initializationCandidates.map(
        (candidate) => ({
          collarDepth:
            candidate.collarDepth,

          transitionGap:
            candidate.transitionGap,

          transitionDepth:
            candidate.transitionDepth,

          secondTransitionGap:
            candidate.secondTransitionGap,

          secondTransitionDepth:
            candidate.secondTransitionDepth,

          normalSign:
            candidate.normalSign,

          signedCollarDepth:
            candidate
              .signedCollarDepth,

          collarPositiveCount:
            candidate
              .collarPositiveCount,

          collarNegativeCount:
            candidate
              .collarNegativeCount,

          collarDegenerateCount:
            candidate
              .collarDegenerateCount,

          collarOrientationMinorityCount:
            candidate
              .collarOrientationMinorityCount,

          collarGlobalMismatchCount:
            candidate
              .collarGlobalMismatchCount,

          transitionPositiveCount:
            candidate
              .transitionPositiveCount,

          transitionNegativeCount:
            candidate
              .transitionNegativeCount,

          transitionDegenerateCount:
            candidate
              .transitionDegenerateCount,

          transitionOrientationMinorityCount:
            candidate
              .transitionOrientationMinorityCount,

          transitionGlobalMismatchCount:
            candidate
              .transitionGlobalMismatchCount,

          valid:
            candidate.valid,

          deepCoreLinearSolveSucceeded:
            candidate
              .deepCoreLinearSolveSucceeded,

          orientationMismatchCount:
            candidate
              .orientationMismatchCount,

          degenerateCellCount:
            candidate
              .degenerateCellCount,

          minimumAbsoluteDeterminant:
            candidate
              .minimumAbsoluteDeterminant,

          selected:
            candidate ===
            selectedInitialization,
        })
      ),

    positions,

    fixedBoundaryVertexIndices:
      [
        ...boundaryMap.keys(),
      ].sort(
        (a, b) => a - b
      ),

    interiorVertexIndices,

    adjacency,

    harmonicSystem,

    stagedHarmonicSystem,

    harmonicSolve: {
      method:
        globalHarmonicSolution.method,

      succeeded:
        globalHarmonicSolution
          .succeeded,

      iterationCounts:
        globalHarmonicSolution
          .iterationCounts ??
        null,

      residualNorms:
        globalHarmonicSolution
          .residualNorms ??
        null,

      tolerances:
        globalHarmonicSolution
          .tolerances ??
        null,

      breakdownReasons:
        globalHarmonicSolution
          .breakdownReasons ??
        null,

      systemAudit:
        globalHarmonicSolution
          .systemAudit ??
        null,
    },

    collarVertexIndices,

    transitionVertexIndices,

    secondTransitionVertexIndices,

    deepInteriorVertexIndices,

    cellState,

    orientationAudit,

    runRelaxation,

    failures,

    summary: {
      quotientVertexCount:
        vertexCount,

      fixedBoundaryVertexCount:
        boundaryMap.size,

      interiorUnknownVertexCount:
        interiorVertexIndices
          .length,

      collarVertexCount:
        collarVertexIndices
          .length,

      transitionVertexCount:
        transitionVertexIndices
          .length,

      secondTransitionVertexCount:
        secondTransitionVertexIndices
          .length,

      deepInteriorVertexCount:
        deepInteriorVertexIndices
          .length,

      selectedCollarDepth,

      selectedTransitionGap,

      selectedTransitionDepth,

      selectedSecondTransitionGap,

      selectedSecondTransitionDepth,

      selectedCollarNormalSign,

      selectedSignedCollarDepth,

      sharedCollarMaterialAddressCount:
        sharedProjectionLabCollar
          .summary
          .materialAddressCount,

      sharedCollarCoordinateFailureCount:
        sharedProjectionLabCollar
          .summary
          .coordinateFailureCount,

      sharedCollarMaximumBoundaryFrameDisplacement:
        sharedProjectionLabCollar
          .summary
          .maximumBoundaryFrameDisplacement,

      sharedCollarMaximumBoundaryNormalDot:
        sharedProjectionLabCollar
          .summary
          .maximumBoundaryNormalDot,

      sharedCollarMaximumFrameNormError:
        sharedProjectionLabCollar
          .summary
          .maximumFrameNormError,

      sharedCollarTubeRho:
        sharedProjectionLabCollar
          .summary
          .tubeRho,

      sharedCollarComplementNormalSign:
        sharedProjectionLabCollar
          .summary
          .complementNormalSign,

      sharedTransitionMaterialAddressCount:
        sharedProjectionLabTransition
          .summary
          .materialAddressCount,

      sharedTransitionCoordinateFailureCount:
        sharedProjectionLabTransition
          .summary
          .coordinateFailureCount,

      sharedTransitionMaximumMaterialCoordinateError:
        sharedProjectionLabTransition
          .summary
          .maximumMaterialCoordinateError,

      sharedSecondTransitionMaterialAddressCount:
        sharedProjectionLabSecondTransition
          .summary
          .materialAddressCount,

      sharedSecondTransitionCoordinateFailureCount:
        sharedProjectionLabSecondTransition
          .summary
          .coordinateFailureCount,

      sharedSecondTransitionMaximumMaterialCoordinateError:
        sharedProjectionLabSecondTransition
          .summary
          .maximumMaterialCoordinateError,

      projectiveSurfaceApplied:
        Boolean(
          projectiveTransitionSurface
            ?.valid
        ),

      projectiveSurfaceEdgeCount:
        projectiveTransitionSurface
          ?.summary
          ?.transitionSurfaceEdgeCount ??
        0,

      projectiveSecondSurfaceEdgeCount:
        projectiveTransitionSurface
          ?.summary
          ?.secondTransitionSurfaceEdgeCount ??
        0,

      projectiveMovableVertexCount:
        projectiveTransitionSurface
          ?.summary
          ?.movableVertexCount ??
        0,

      projectiveSurfaceInitialMismatchCount:
        projectiveTransitionSurface
          ?.summary
          ?.initialOrientationMismatchCount ??
        null,

      projectiveSurfaceFinalMismatchCount:
        projectiveTransitionSurface
          ?.summary
          ?.finalOrientationMismatchCount ??
        null,

      projectiveSurfaceMismatchImprovement:
        projectiveTransitionSurface
          ?.summary
          ?.orientationMismatchImprovement ??
        0,

      projectiveSurfaceMaximumAngularDisplacementDegrees:
        projectiveTransitionSurface
          ?.summary
          ?.maximumAngularDisplacementDegrees ??
        0,

      projectiveSurfaceMeanAngularDisplacementDegrees:
        projectiveTransitionSurface
          ?.summary
          ?.meanAngularDisplacementDegrees ??
        0,

      projectiveSurfaceMinimumProgressFraction:
        projectiveTransitionSurface
          ?.summary
          ?.minimumProgressFraction ??
        0,

      globalHarmonicSolveMethod:
        globalHarmonicSolution.method,

      globalHarmonicSolveSucceeded:
        globalHarmonicSolution
          .succeeded,

      globalHarmonicSystemComponentCount:
        globalHarmonicSolution
          .systemAudit
          ?.componentCount ??
        null,

      globalHarmonicUnanchoredComponentCount:
        globalHarmonicSolution
          .systemAudit
          ?.unanchoredComponentCount ??
        null,

      globalHarmonicZeroDiagonalRowCount:
        globalHarmonicSolution
          .systemAudit
          ?.zeroDiagonalRowCount ??
        null,

      globalHarmonicMinimumDiagonal:
        globalHarmonicSolution
          .systemAudit
          ?.minimumDiagonal ??
        null,

      globalHarmonicIterationCountX:
        globalHarmonicSolution
          .iterationCounts
          ?.x ??
        null,

      globalHarmonicIterationCountY:
        globalHarmonicSolution
          .iterationCounts
          ?.y ??
        null,

      globalHarmonicIterationCountZ:
        globalHarmonicSolution
          .iterationCounts
          ?.z ??
        null,

      globalHarmonicIterationCountW:
        globalHarmonicSolution
          .iterationCounts
          ?.w ??
        null,

      globalHarmonicResidualNormX:
        globalHarmonicSolution
          .residualNorms
          ?.x ??
        null,

      globalHarmonicResidualNormY:
        globalHarmonicSolution
          .residualNorms
          ?.y ??
        null,

      globalHarmonicResidualNormZ:
        globalHarmonicSolution
          .residualNorms
          ?.z ??
        null,

      globalHarmonicResidualNormW:
        globalHarmonicSolution
          .residualNorms
          ?.w ??
        null,

      globalHarmonicBreakdownReasonX:
        globalHarmonicSolution
          .breakdownReasons
          ?.x ??
        null,

      globalHarmonicBreakdownReasonY:
        globalHarmonicSolution
          .breakdownReasons
          ?.y ??
        null,

      globalHarmonicBreakdownReasonZ:
        globalHarmonicSolution
          .breakdownReasons
          ?.z ??
        null,

      globalHarmonicBreakdownReasonW:
        globalHarmonicSolution
          .breakdownReasons
          ?.w ??
        null,

      linearSolveSucceeded,

      fallbackInteriorVertexCount,

      minimumHarmonicVectorNorm:
        Number.isFinite(
          minimumHarmonicVectorNorm
        )
          ? minimumHarmonicVectorNorm
          : 0,

      maximumNormError,

      maximumBoundaryDisplacement,

      cellCount:
        cellState
          .summary
          .cellCount,

      positiveCellCount:
        cellState
          .summary
          .positiveCellCount,

      negativeCellCount:
        cellState
          .summary
          .negativeCellCount,

      degenerateCellCount:
        cellState
          .summary
          .degenerateCellCount,

      minimumAbsoluteDeterminant:
        cellState
          .summary
          .minimumAbsoluteDeterminant,

      maximumAbsoluteDeterminant:
        cellState
          .summary
          .maximumAbsoluteDeterminant,

      quotientOrientable:
        orientationAudit
          .summary
          .orientable,

      quotientConnectedComponentCount:
        orientationAudit
          .summary
          .connectedComponentCount,

      nonManifoldFaceCount:
        orientationAudit
          .summary
          .nonManifoldFaceCount,

      orientationConflictCount:
        orientationAudit
          .summary
          .orientationConflictCount,

      orientationMismatchCount:
        orientationAudit
          .summary
          .orientationMismatchCount,
    },
  };
}


/*
 * ============================================================
 * GEOMETRY-FIRST CANONICAL QUOTIENT CHECKPOINT
 * ============================================================
 *
 * This deliberately bypasses the synthetic
 *
 *   T² × I -> S2 -> S3 -> barycentric bridge
 *
 * construction.
 *
 * The object being solved is the preserved canonical quotient of
 * the two truncated tetrahedra.
 *
 * The exact Projection-Lab cusp tube remains the fixed S³ boundary.
 *
 * For this FIRST checkpoint only, the ten genuine interior vertices
 * receive one deterministic Dirichlet harmonic extension on the
 * ORIGINAL canonical graph.
 *
 * This harmonic extension is not being declared the final geometry.
 * Its purpose is to establish the canonical manifold as the object
 * we are solving before we introduce tetrahedron-native refinement.
 */
export function createIntrinsicS3CanonicalGeometryState({
  quotientMesh,
  boundaryTargets,
}) {
  const failures = [];


  const canonicalMesh =
    quotientMesh
      ?.canonicalCore ??
    null;


  if (!canonicalMesh) {
    return {
      ready:
        false,

      method:
        "canonical quotient unavailable",

      failures: [
        {
          reason:
            "missing-canonical-core",
        },
      ],

      summary: {
        quotientVertexCount:
          0,

        fixedBoundaryVertexCount:
          0,

        interiorUnknownVertexCount:
          0,

        cellCount:
          0,

        orientationMismatchCount:
          0,
      },
    };
  }


  const vertexCount =
    canonicalMesh
      .quotientVertices
      .length;


  const boundaryVertexIndices =
    canonicalMesh
      .quotientVertices
      .filter(
        (vertex) =>
          vertex.cuspBoundary
      )
      .map(
        (vertex) =>
          vertex
            .quotientVertexIndex
      );


  const boundaryVertexSet =
    new Set(
      boundaryVertexIndices
    );


  /*
   * The existing final boundary target table contains the original
   * 36 canonical boundary vertices plus later synthetic refinement
   * vertices.
   *
   * Keep only the 36 vertices belonging to the canonical quotient.
   */
  const canonicalTargets =
    (
      boundaryTargets
        ?.targets ??
      []
    )
      .filter(
        (target) =>
          boundaryVertexSet.has(
            target
              .quotientVertexIndex
          )
      );


  const canonicalTargetIndexSet =
    new Set(
      canonicalTargets.map(
        (target) =>
          target
            .quotientVertexIndex
      )
    );


  if (
    canonicalTargets.length !==
      boundaryVertexIndices.length ||
    canonicalTargetIndexSet.size !==
      boundaryVertexIndices.length
  ) {
    failures.push({
      reason:
        "canonical-boundary-target-count-mismatch",

      expectedBoundaryTargetCount:
        boundaryVertexIndices.length,

      observedBoundaryTargetCount:
        canonicalTargets.length,

      uniqueBoundaryTargetCount:
        canonicalTargetIndexSet.size,
    });
  }


  const boundaryMap =
    makeBoundaryMap({
      targets:
        canonicalTargets,
    });


  const interiorVertexIndices =
    canonicalMesh
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


  const adjacency =
    buildAdjacency(
      vertexCount,
      canonicalMesh
        .quotientEdges
    );


  const harmonicSystem =
    buildHarmonicSystem({
      quotientMesh:
        canonicalMesh,

      boundaryMap,

      interiorVertexIndices,

      adjacency,
    });


  const harmonicSolution =
    solveHarmonicCoordinates(
      harmonicSystem
    );


  if (
    !harmonicSolution
      .succeeded
  ) {
    failures.push({
      reason:
        "canonical-harmonic-linear-system-failed",

      method:
        harmonicSolution.method,

      breakdownReasons:
        harmonicSolution
          .breakdownReasons ??
        null,
    });
  }


  const positions =
    Array(
      vertexCount
    ).fill(null);


  boundaryMap.forEach(
    (
      point,
      vertexIndex
    ) => {
      positions[
        vertexIndex
      ] =
        clonePoint4(
          point
        );
    }
  );


  let fallbackInteriorVertexCount =
    0;

  let minimumHarmonicVectorNorm =
    Infinity;


  interiorVertexIndices.forEach(
    (
      vertexIndex,
      interiorIndex
    ) => {
      const quotientVertex =
        canonicalMesh
          .quotientVertices[
          vertexIndex
        ];


      const fallback =
        sourcePointFallbackS3(
          quotientVertex
            ?.sourcePoint
        );


      const harmonicPoint =
        harmonicSolution
          .succeeded
          ? point4(
              harmonicSolution
                .solutionX[
                interiorIndex
              ],

              harmonicSolution
                .solutionY[
                interiorIndex
              ],

              harmonicSolution
                .solutionZ[
                interiorIndex
              ],

              harmonicSolution
                .solutionW[
                interiorIndex
              ]
            )
          : null;


      const harmonicNorm =
        harmonicPoint
          ? point4Norm(
              harmonicPoint
            )
          : 0;


      minimumHarmonicVectorNorm =
        Math.min(
          minimumHarmonicVectorNorm,
          harmonicNorm
        );


      if (
        harmonicNorm <
        EPSILON
      ) {
        fallbackInteriorVertexCount +=
          1;
      }


      positions[
        vertexIndex
      ] =
        normalizePoint4(
          harmonicPoint ??
            fallback,

          fallback
        );
    }
  );


  const missingPositionIndices =
    positions
      .map(
        (
          position,
          index
        ) =>
          position
            ? null
            : index
      )
      .filter(
        (index) =>
          index !== null
      );


  if (
    missingPositionIndices
      .length >
    0
  ) {
    failures.push({
      reason:
        "missing-canonical-s3-positions",

      missingPositionIndices,
    });
  }


  /*
   * This is the important test.
   *
   * Audit the actual canonical 216 tetrahedra.
   */
  const orientationTopology =
    buildCellOrientationTopology(
      canonicalMesh
    );


  const cellState =
    cellDiagnostics(
      canonicalMesh,
      positions
    );


  const orientationAudit =
    auditCellOrientations(
      canonicalMesh,
      cellState
    );


  let maximumNormError =
    0;


  positions.forEach(
    (position) => {
      if (!position) {
        return;
      }


      maximumNormError =
        Math.max(
          maximumNormError,

          Math.abs(
            point4Norm(
              position
            ) -
            1
          )
        );
    }
  );


  let maximumBoundaryDisplacement =
    0;


  boundaryMap.forEach(
    (
      target,
      vertexIndex
    ) => {
      const position =
        positions[
          vertexIndex
        ];


      if (!position) {
        return;
      }


      maximumBoundaryDisplacement =
        Math.max(
          maximumBoundaryDisplacement,

          point4Distance(
            target,
            position
          )
        );
    }
  );


  /*
   * ============================================================
   * CANONICAL AMBIENT S³ REALIZATION
   * ============================================================
   *
   * At this point the topology and intrinsic hyperbolic geometry
   * are already fixed.
   *
   * The ambient PL problem has only TEN movable vertices:
   * the genuine canonical interior quotient vertices.
   *
   * Apply the existing S³ no-fold relaxation to THIS canonical
   * 46-vertex / 216-cell complex only.
   *
   * No collar.
   * No S2.
   * No S3.
   * No bridge cells.
   * No synthetic vertices.
   *
   * The 36 cusp-boundary vertices remain exactly fixed.
   */
  const runAmbientRelaxation =
    (options = {}) =>
      runIntrinsicS3NonlinearRelaxation({
        quotientMesh:
          canonicalMesh,

        initialPositions:
          positions,

        interiorVertexIndices,

        orientationAudit,

        initialCellState:
          cellState,

        options,
      });


  const ready =
    canonicalMesh.valid &&
    harmonicSolution
      .succeeded &&
    failures.length === 0 &&
    missingPositionIndices
      .length === 0 &&
    boundaryMap.size ===
      boundaryVertexIndices
        .length;


  return {
    ready,

    method:
      "canonical two-tetrahedron quotient + exact S3 cusp boundary + 10-vertex harmonic checkpoint",

    quotientMesh:
      canonicalMesh,

    positions,

    fixedBoundaryVertexIndices: [
      ...boundaryMap.keys(),
    ].sort(
      (a, b) =>
        a - b
    ),

    interiorVertexIndices,

    adjacency,

    harmonicSystem,

    harmonicSolve: {
      method:
        harmonicSolution.method,

      succeeded:
        harmonicSolution
          .succeeded,

      iterationCounts:
        harmonicSolution
          .iterationCounts ??
        null,

      residualNorms:
        harmonicSolution
          .residualNorms ??
        null,

      breakdownReasons:
        harmonicSolution
          .breakdownReasons ??
        null,

      systemAudit:
        harmonicSolution
          .systemAudit ??
        null,
    },

    orientationTopology,

    cellState,

    orientationAudit,

    /*
     * A successful result here means:
     *
     *   • all 216 canonical tetrahedra have one coherent
     *     orientation in S³;
     *
     *   • no canonical tetrahedron is degenerate;
     *
     *   • all 36 cusp-boundary vertices remain fixed exactly.
     *
     * Certification that the resulting volume stays on the
     * COMPLEMENT side of the figure-eight tube is intentionally
     * a separate next audit.
     */
    runAmbientRelaxation,

    failures,

    summary: {
      quotientVertexCount:
        vertexCount,

      fixedBoundaryVertexCount:
        boundaryMap.size,

      interiorUnknownVertexCount:
        interiorVertexIndices
          .length,

      cellCount:
        canonicalMesh
          .quotientCells
          .length,

      edgeCount:
        canonicalMesh
          .quotientEdges
          .length,

      syntheticVertexCount:
        0,

      syntheticCellCount:
        0,

      harmonicSolveSucceeded:
        harmonicSolution
          .succeeded,

      fallbackInteriorVertexCount,

      minimumHarmonicVectorNorm:
        Number.isFinite(
          minimumHarmonicVectorNorm
        )
          ? minimumHarmonicVectorNorm
          : 0,

      maximumNormError,

      maximumBoundaryDisplacement,

      quotientOrientable:
        orientationAudit
          .summary
          .orientable,

      connectedComponentCount:
        orientationAudit
          .summary
          .connectedComponentCount,

      nonManifoldFaceCount:
        orientationAudit
          .summary
          .nonManifoldFaceCount,

      orientationConflictCount:
        orientationAudit
          .summary
          .orientationConflictCount,

      orientationMismatchCount:
        orientationAudit
          .summary
          .orientationMismatchCount,

      positiveCellCount:
        cellState
          .summary
          .positiveCellCount,

      negativeCellCount:
        cellState
          .summary
          .negativeCellCount,

      degenerateCellCount:
        cellState
          .summary
          .degenerateCellCount,

      minimumAbsoluteDeterminant:
        cellState
          .summary
          .minimumAbsoluteDeterminant,
    },
  };
}

/*
 * ============================================================
 * REFINED CANONICAL S³ CHECKPOINT
 * ============================================================
 *
 * This is the first S³ state built on the genuine barycentric
 * simplicial complex:
 *
 *   1,028 vertices
 *     216 exact cusp-boundary vertices
 *     812 genuine interior vertices
 *
 *   6,428 edges
 *   5,184 tetrahedra
 *
 * No synthetic collar, transition torus, bridge cell, or
 * Delta-complex face-occurrence reconstruction participates here.
 *
 * The 216 boundary vertices are mapped directly from their developed
 * cusp material addresses onto the SAME native Projection Lab S³ tube.
 * The 812 interior vertices then receive one deterministic Dirichlet
 * graph-harmonic initialization in R⁴ followed by normalization to S³.
 *
 * This is a checkpoint, not a final no-fold solve.
 */
export function createIntrinsicS3RefinedCanonicalGeometryState({
  refinedMesh,
  boundaryTargets,
  cuspCoordinateSpec,
}) {
  const failures = [];

  const S3_NORM_TOLERANCE =
    1e-8;

  const S3_SAMPLE_TOLERANCE =
    1e-8;

  const ORIGINAL_BOUNDARY_TOLERANCE =
    1e-8;


  if (
    !refinedMesh ||
    !refinedMesh.valid
  ) {
    return {
      ready:
        false,

      method:
        "refined canonical quotient unavailable",

      failures: [
        {
          reason:
            "missing-or-invalid-canonical-barycentric-subdivision",
        },
      ],

      summary: {
        quotientVertexCount:
          refinedMesh
            ?.quotientVertices
            ?.length ??
          0,

        fixedBoundaryVertexCount:
          0,

        interiorUnknownVertexCount:
          0,

        cellCount:
          refinedMesh
            ?.quotientCells
            ?.length ??
          0,

        orientationMismatchCount:
          0,

        degenerateCellCount:
          0,
      },
    };
  }


  const vertexCount =
    refinedMesh
      .quotientVertices
      .length;

  const boundaryVertexIndices =
    refinedMesh
      .quotientVertices
      .filter(
        (vertex) =>
          vertex.cuspBoundary
      )
      .map(
        (vertex) =>
          vertex
            .quotientVertexIndex
      );

  const interiorVertexIndices =
    refinedMesh
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


  /*
   * Exact refined cusp Dirichlet data.
   *
   * Every boundary barycenter already carries one or more exact
   * developed cusp samples. Map those material addresses through the
   * same peripheral-coordinate conversion used by the existing
   * Projection Lab boundary handshake.
   */
  const boundaryMap =
    new Map();

  let maximumBoundaryNormError =
    0;

  let maximumBoundaryRepresentativeDisagreement =
    0;


  boundaryVertexIndices.forEach(
    (vertexIndex) => {
      const vertex =
        refinedMesh
          .quotientVertices[
          vertexIndex
        ];

      const samples =
        vertex
          ?.cuspData
          ?.samples ??
        [];

      if (
        samples.length ===
        0
      ) {
        failures.push({
          reason:
            "missing-refined-cusp-samples",

          quotientVertexIndex:
            vertexIndex,
        });

        return;
      }


      const sampleTargets =
        samples
          .map(
            (
              sample,
              sampleIndex
            ) => {
              const raw =
                sample?.raw;

              if (
                !raw ||
                !Number.isFinite(
                  raw.x
                ) ||
                !Number.isFinite(
                  raw.y
                )
              ) {
                failures.push({
                  reason:
                    "invalid-refined-raw-cusp-point",

                  quotientVertexIndex:
                    vertexIndex,

                  sampleIndex,
                });

                return null;
              }


              const tubeCoordinates =
                cuspTubeCoordinates(
                  raw,
                  cuspCoordinateSpec
                );

              if (
                !tubeCoordinates ||
                !Number.isFinite(
                  tubeCoordinates
                    .routeAmount
                ) ||
                !Number.isFinite(
                  tubeCoordinates
                    .minorAngle
                )
              ) {
                failures.push({
                  reason:
                    "invalid-refined-peripheral-coordinate",

                  quotientVertexIndex:
                    vertexIndex,

                  sampleIndex,
                });

                return null;
              }


              const nativePoint4 =
                figureEightS3TubePoint4(
                  tubeCoordinates
                    .routeAmount,

                  tubeCoordinates
                    .minorAngle /
                    (
                      Math.PI *
                      2
                    )
                );

              if (
                !Array.isArray(
                  nativePoint4
                ) ||
                nativePoint4.length !==
                  4 ||
                nativePoint4.some(
                  (value) =>
                    !Number.isFinite(
                      value
                    )
                )
              ) {
                failures.push({
                  reason:
                    "invalid-refined-s3-boundary-point",

                  quotientVertexIndex:
                    vertexIndex,

                  sampleIndex,
                });

                return null;
              }


              const point =
                point4(
                  nativePoint4[0],
                  nativePoint4[1],
                  nativePoint4[2],
                  nativePoint4[3]
                );

              const normError =
                Math.abs(
                  point4Norm(
                    point
                  ) -
                  1
                );

              maximumBoundaryNormError =
                Math.max(
                  maximumBoundaryNormError,
                  normError
                );

              if (
                normError >
                S3_NORM_TOLERANCE
              ) {
                failures.push({
                  reason:
                    "refined-s3-boundary-point-off-unit-sphere",

                  quotientVertexIndex:
                    vertexIndex,

                  sampleIndex,

                  normError,
                });
              }


              return point;
            }
          )
          .filter(Boolean);


      if (
        sampleTargets.length ===
        0
      ) {
        return;
      }


      const representative =
        sampleTargets[0];

      let maximumVertexDisagreement =
        0;

      sampleTargets
        .slice(1)
        .forEach(
          (candidate) => {
            maximumVertexDisagreement =
              Math.max(
                maximumVertexDisagreement,

                point4Distance(
                  representative,
                  candidate
                )
              );
          }
        );

      maximumBoundaryRepresentativeDisagreement =
        Math.max(
          maximumBoundaryRepresentativeDisagreement,
          maximumVertexDisagreement
        );

      if (
        maximumVertexDisagreement >
        S3_SAMPLE_TOLERANCE
      ) {
        failures.push({
          reason:
            "refined-cusp-representatives-disagree-in-s3",

          quotientVertexIndex:
            vertexIndex,

          maximumVertexDisagreement,
        });
      }


      boundaryMap.set(
        vertexIndex,
        clonePoint4(
          representative
        )
      );
    }
  );


  if (
    boundaryMap.size !==
    boundaryVertexIndices.length
  ) {
    failures.push({
      reason:
        "refined-boundary-target-count-mismatch",

      expectedBoundaryTargetCount:
        boundaryVertexIndices.length,

      observedBoundaryTargetCount:
        boundaryMap.size,
    });
  }


  /*
   * The subdivision preserves the original canonical quotient vertex
   * indices exactly. Therefore the 36 old cusp vertices provide a strict
   * compatibility test: remapping them from material address must recover
   * the already-verified boundary target table.
   */
  const originalBoundaryTargetByIndex =
    new Map(
      (
        boundaryTargets
          ?.targets ??
        []
      ).map(
        (target) => [
          target
            .quotientVertexIndex,

          target
            .targetPoint4,
        ]
      )
    );

  let originalBoundaryCompatibilityCount =
    0;

  let maximumOriginalBoundaryDisplacement =
    0;


  refinedMesh
    .quotientVertices
    .forEach(
      (vertex) => {
        if (
          !vertex.cuspBoundary ||
          vertex
            .canonicalSubdivision
            ?.rank !==
            0
        ) {
          return;
        }

        const vertexIndex =
          vertex
            .quotientVertexIndex;

        const oldTarget =
          originalBoundaryTargetByIndex
            .get(
              vertexIndex
            );

        const refinedTarget =
          boundaryMap.get(
            vertexIndex
          );

        if (
          !oldTarget ||
          !refinedTarget
        ) {
          failures.push({
            reason:
              "missing-original-boundary-compatibility-target",

            quotientVertexIndex:
              vertexIndex,
          });

          return;
        }

        originalBoundaryCompatibilityCount +=
          1;

        maximumOriginalBoundaryDisplacement =
          Math.max(
            maximumOriginalBoundaryDisplacement,

            point4Distance(
              oldTarget,
              refinedTarget
            )
          );
      }
    );


  if (
    originalBoundaryCompatibilityCount !==
    36
  ) {
    failures.push({
      reason:
        "original-boundary-compatibility-count-mismatch",

      expectedCount:
        36,

      observedCount:
        originalBoundaryCompatibilityCount,
    });
  }


  if (
    maximumOriginalBoundaryDisplacement >
    ORIGINAL_BOUNDARY_TOLERANCE
  ) {
    failures.push({
      reason:
        "original-boundary-compatibility-failed",

      maximumOriginalBoundaryDisplacement,

      tolerance:
        ORIGINAL_BOUNDARY_TOLERANCE,
    });
  }


  const adjacency =
    buildAdjacency(
      vertexCount,
      refinedMesh
        .quotientEdges
    );

  const harmonicSystem =
    buildHarmonicSystem({
      quotientMesh:
        refinedMesh,

      boundaryMap,

      interiorVertexIndices,

      adjacency,
    });

  const harmonicSolution =
    solveHarmonicCoordinates(
      harmonicSystem
    );


  if (
    !harmonicSolution
      .succeeded
  ) {
    failures.push({
      reason:
        "refined-canonical-harmonic-linear-system-failed",

      method:
        harmonicSolution.method,

      breakdownReasons:
        harmonicSolution
          .breakdownReasons ??
        null,
    });
  }


  const positions =
    Array(
      vertexCount
    ).fill(null);


  boundaryMap.forEach(
    (
      point,
      vertexIndex
    ) => {
      positions[
        vertexIndex
      ] =
        clonePoint4(
          point
        );
    }
  );


  let fallbackInteriorVertexCount =
    0;

  let minimumHarmonicVectorNorm =
    Infinity;


  interiorVertexIndices.forEach(
    (
      vertexIndex,
      interiorIndex
    ) => {
      const quotientVertex =
        refinedMesh
          .quotientVertices[
          vertexIndex
        ];

      const fallback =
        sourcePointFallbackS3(
          quotientVertex
            ?.sourcePoint
        );

      const harmonicPoint =
        harmonicSolution
          .succeeded
          ? point4(
              harmonicSolution
                .solutionX[
                interiorIndex
              ],

              harmonicSolution
                .solutionY[
                interiorIndex
              ],

              harmonicSolution
                .solutionZ[
                interiorIndex
              ],

              harmonicSolution
                .solutionW[
                interiorIndex
              ]
            )
          : null;

      const harmonicNorm =
        harmonicPoint
          ? point4Norm(
              harmonicPoint
            )
          : 0;

      minimumHarmonicVectorNorm =
        Math.min(
          minimumHarmonicVectorNorm,
          harmonicNorm
        );

      if (
        harmonicNorm <
        EPSILON
      ) {
        fallbackInteriorVertexCount +=
          1;
      }

      positions[
        vertexIndex
      ] =
        normalizePoint4(
          harmonicPoint ??
            fallback,

          fallback
        );
    }
  );


  const missingPositionIndices =
    positions
      .map(
        (
          position,
          index
        ) =>
          position
            ? null
            : index
      )
      .filter(
        (index) =>
          index !== null
      );


  if (
    missingPositionIndices
      .length >
    0
  ) {
    failures.push({
      reason:
        "missing-refined-canonical-s3-positions",

      missingPositionIndices,
    });
  }


  /*
   * Because this is now a genuine simplicial complex,
   * buildCellOrientationTopology() uses refined vertex triples directly.
   */
  const orientationTopology =
    buildCellOrientationTopology(
      refinedMesh
    );

  const cellState =
    cellDiagnostics(
      refinedMesh,
      positions
    );

  const orientationAudit =
    auditCellOrientations(
      refinedMesh,
      cellState
    );


  let maximumNormError =
    0;

  positions.forEach(
    (position) => {
      if (!position) {
        return;
      }

      maximumNormError =
        Math.max(
          maximumNormError,

          Math.abs(
            point4Norm(
              position
            ) -
            1
          )
        );
    }
  );


  let maximumBoundaryDisplacement =
    0;

  boundaryMap.forEach(
    (
      target,
      vertexIndex
    ) => {
      const position =
        positions[
          vertexIndex
        ];

      if (!position) {
        return;
      }

      maximumBoundaryDisplacement =
        Math.max(
          maximumBoundaryDisplacement,

          point4Distance(
            target,
            position
          )
        );
    }
  );


  /*
   * ============================================================
   * REFINED CANONICAL AMBIENT S³ RELAXATION
   * ============================================================
   *
   * The topology is now the verified genuine simplicial m004
   * complex.
   *
   * Fixed:
   *   216 exact cusp-boundary vertices
   *
   * Movable:
   *   812 genuine interior vertices
   *
   * No synthetic collar, transition layer, bridge, or auxiliary
   * vertex participates in this solve.
   */
  const runAmbientRelaxation =
    (options = {}) =>
      runIntrinsicS3NonlinearRelaxation({
        quotientMesh:
          refinedMesh,

        initialPositions:
          positions,

        interiorVertexIndices,

        orientationAudit,

        initialCellState:
          cellState,

        options,
      });


  /*
   * ============================================================
   * STAGED REFINED CONTINUATION
   * ============================================================
   *
   * Begin a new no-fold stage from the BEST positions returned by
   * a preceding refined relaxation.
   *
   * This resets both the regularization reference geometry and the
   * determinant normalization scales to the improved state.
   *
   * All 216 exact cusp-boundary vertices are explicitly restored
   * before every continuation stage.
   */
  const continueAmbientRelaxation =
    (
      previousResult,
      options = {}
    ) => {
      const previousPositions =
        previousResult
          ?.positions;


      if (
        !Array.isArray(
          previousPositions
        ) ||
        previousPositions.length !==
          vertexCount ||
        previousPositions.some(
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
            ) ||
            !Number.isFinite(
              point.w
            )
        )
      ) {
        return {
          success:
            false,

          positions:
            null,

          summary: {
            success:
              false,

            reason:
              "invalid-continuation-start-positions",

            expectedVertexCount:
              vertexCount,

            observedVertexCount:
              Array.isArray(
                previousPositions
              )
                ? previousPositions.length
                : 0,
          },
        };
      }


      /*
       * Clone the preceding BEST geometry.
       */
      const continuationPositions =
        previousPositions.map(
          (point) =>
            clonePoint4(
              point
            )
        );


      /*
       * Restore the exact Dirichlet cusp boundary.
       */
      boundaryMap.forEach(
        (
          boundaryPoint,
          vertexIndex
        ) => {
          continuationPositions[
            vertexIndex
          ] =
            clonePoint4(
              boundaryPoint
            );
        }
      );


      /*
       * Recompute the cell geometry and coherent orientation audit
       * for THIS improved starting state.
       *
       * These become the reference determinant scales and expected
       * orientation data for the next nonlinear stage.
       */
      const continuationCellState =
        cellDiagnostics(
          refinedMesh,
          continuationPositions
        );

      const continuationOrientationAudit =
        auditCellOrientations(
          refinedMesh,
          continuationCellState
        );


      return runIntrinsicS3NonlinearRelaxation({
        quotientMesh:
          refinedMesh,

        initialPositions:
          continuationPositions,

        interiorVertexIndices,

        orientationAudit:
          continuationOrientationAudit,

        initialCellState:
          continuationCellState,

        options,
      });
    };


  const ready =
    refinedMesh.valid &&
    harmonicSolution
      .succeeded &&
    failures.length ===
      0 &&
    missingPositionIndices
      .length ===
      0 &&
    boundaryMap.size ===
      boundaryVertexIndices
        .length &&
    vertexCount ===
      1028 &&
    boundaryVertexIndices
      .length ===
      216 &&
    interiorVertexIndices
      .length ===
      812 &&
    refinedMesh
      .quotientEdges
      .length ===
      6428 &&
    refinedMesh
      .quotientCells
      .length ===
      5184;


  return {
    ready,

    method:
      "canonical barycentric m004 simplicial complex + exact 216-vertex S3 cusp boundary + 812-vertex harmonic checkpoint",

    quotientMesh:
      refinedMesh,

    positions,

    fixedBoundaryVertexIndices: [
      ...boundaryMap.keys(),
    ].sort(
      (first, second) =>
        first - second
    ),

    interiorVertexIndices,

    adjacency,

    harmonicSystem,

    harmonicSolve: {
      method:
        harmonicSolution.method,

      succeeded:
        harmonicSolution
          .succeeded,

      iterationCounts:
        harmonicSolution
          .iterationCounts ??
        null,

      residualNorms:
        harmonicSolution
          .residualNorms ??
        null,

      breakdownReasons:
        harmonicSolution
          .breakdownReasons ??
        null,

      systemAudit:
        harmonicSolution
          .systemAudit ??
        null,
    },

    orientationTopology,

    cellState,

    orientationAudit,

    /*
     * Run explicitly from the browser console.
     *
     * Keeping this out of the automatic React path prevents the
     * 5,184-cell nonlinear solve from affecting normal refreshes.
     */
    runAmbientRelaxation,

    continueAmbientRelaxation,

    failures,

    summary: {
      quotientVertexCount:
        vertexCount,

      fixedBoundaryVertexCount:
        boundaryMap.size,

      interiorUnknownVertexCount:
        interiorVertexIndices
          .length,

      edgeCount:
        refinedMesh
          .quotientEdges
          .length,

      faceCount:
        refinedMesh
          .summary
          ?.quotientFaceCount ??
        null,

      cellCount:
        refinedMesh
          .quotientCells
          .length,

      syntheticVertexCount:
        0,

      syntheticCellCount:
        0,

      harmonicSolveMethod:
        harmonicSolution.method,

      harmonicSolveSucceeded:
        harmonicSolution
          .succeeded,

      harmonicIterationCounts:
        harmonicSolution
          .iterationCounts ??
        null,

      fallbackInteriorVertexCount,

      minimumHarmonicVectorNorm:
        Number.isFinite(
          minimumHarmonicVectorNorm
        )
          ? minimumHarmonicVectorNorm
          : 0,

      maximumNormError,

      maximumBoundaryNormError,

      maximumBoundaryRepresentativeDisagreement,

      maximumBoundaryDisplacement,

      originalBoundaryCompatibilityCount,

      maximumOriginalBoundaryDisplacement,

      faceIdentityMode:
        orientationTopology
          .summary
          .faceIdentityMode,

      quotientOrientable:
        orientationAudit
          .summary
          .orientable,

      connectedComponentCount:
        orientationAudit
          .summary
          .connectedComponentCount,

      boundaryFaceCount:
        orientationAudit
          .summary
          .boundaryFaceCount,

      internalFaceCount:
        orientationAudit
          .summary
          .internalFaceCount,

      facePairingFailureCount:
        orientationAudit
          .summary
          .facePairingFailureCount,

      nonManifoldFaceCount:
        orientationAudit
          .summary
          .nonManifoldFaceCount,

      orientationConflictCount:
        orientationAudit
          .summary
          .orientationConflictCount,

      orientationMismatchCount:
        orientationAudit
          .summary
          .orientationMismatchCount,

      positiveCellCount:
        cellState
          .summary
          .positiveCellCount,

      negativeCellCount:
        cellState
          .summary
          .negativeCellCount,

      degenerateCellCount:
        cellState
          .summary
          .degenerateCellCount,

      minimumAbsoluteDeterminant:
        cellState
          .summary
          .minimumAbsoluteDeterminant,

      maximumAbsoluteDeterminant:
        cellState
          .summary
          .maximumAbsoluteDeterminant,
    },
  };
}
