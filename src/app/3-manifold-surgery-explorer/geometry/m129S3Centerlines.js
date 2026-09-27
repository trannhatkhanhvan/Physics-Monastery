/*
 * m129 / Whitehead-link S^3 centerlines.
 *
 * Ambient model:
 *
 *   S^3 = {
 *     (z1,z2) in C^2 :
 *     |z1|^2 + |z2|^2 = 1
 *   }.
 *
 * The Whitehead link is realized as the closure of the
 * certified 3-braid
 *
 *   sigma_1 sigma_2^-1 sigma_1 sigma_2^-2.
 *
 * The braid lives in the solid torus
 *
 *   S^1 x D^2  subset S^3
 *
 * by
 *
 *   (theta,w) ->
 *   (
 *     sqrt(1-|w|^2) exp(i theta),
 *     w
 *   ).
 *
 * This module supplies only the manifold-specific
 * centerlines. Tube construction, framing, SO(4)
 * rotation, and stereographic projection belong to
 * s3BoundaryGeometry.js.
 */


export const M129_WHITEHEAD_BRAID_WORD =
  Object.freeze([
    1,
    -2,
    1,
    -2,
    -2,
  ]);


export const M004_FIGURE_EIGHT_BRAID_WORD =
  Object.freeze([
    1,
    -2,
    1,
    -2,
  ]);


/*
 * m129 core-shape parameter.
 *
 * This plays the same structural role that lambda plays
 * in the figure-eight S^3 construction:
 *
 *   lambda changes the actual core embedding,
 *   before any tubular neighborhood is built.
 *
 * The canonical current Whitehead-link picture is retained
 * exactly at lambda = 0.14:
 *
 *   lambda = 0.14  -> strand radius = 0.34.
 *
 * Larger lambda expands the braid/core geometry smoothly
 * while preserving the certified braid word itself.
 */
/*
 * Direct geometric parameters for the m129 Whitehead-link
 * embedding in S^3.
 *
 * lambda:
 *   actual radius of the three braid-strand positions
 *
 *       (-lambda, 0), (0, 0), (+lambda, 0)
 *
 * epsilon:
 *   actual fourth-coordinate amplitude of each half-twist.
 *
 * The original established m129 picture was
 *
 *   lambda  = 0.34
 *   epsilon = 0.17
 *
 * because the original strand radius was 0.34 and the
 * circular crossing radius was 0.34 / 2 = 0.17.
 */
export const DEFAULT_M129_S3_LAMBDA =
  0.44;

export const DEFAULT_M129_S3_EPSILON =
  0.28;

export const M129_S3_LAMBDA_MIN =
  0.28;

export const M129_S3_LAMBDA_MAX =
  0.96;

export const M129_S3_EPSILON_MIN =
  0.14;

export const M129_S3_EPSILON_MAX =
  0.88;


function strandRadiusForLambda(
  lambda =
    DEFAULT_M129_S3_LAMBDA
) {
  return Math.max(
    M129_S3_LAMBDA_MIN,
    Math.min(
      M129_S3_LAMBDA_MAX,
      Number(lambda)
    )
  );
}


function halfTwistYRadiusForEpsilon(
  epsilon =
    DEFAULT_M129_S3_EPSILON
) {
  return Math.max(
    M129_S3_EPSILON_MIN,
    Math.min(
      M129_S3_EPSILON_MAX,
      Number(epsilon)
    )
  );
}


function strandPositionsForLambda(
  lambda
) {
  const strandRadius =
    strandRadiusForLambda(
      lambda
    );

  return [
    {
      x: -strandRadius,
      y: 0,
    },

    {
      x: 0,
      y: 0,
    },

    {
      x: strandRadius,
      y: 0,
    },
  ];
}


function clamp01(
  value
) {
  return Math.max(
    0,
    Math.min(
      1,
      value
    )
  );
}


function smoothHalfTwistAmount(
  amount
) {
  const t =
    clamp01(
      amount
    );

  return (
    0.5 -
    0.5 *
      Math.cos(
        Math.PI *
        t
      )
  );
}


function positionByLabel(
  labelsByPosition
) {
  const result =
    new Array(
      labelsByPosition.length
    );

  labelsByPosition.forEach(
    (
      label,
      position
    ) => {
      result[label] =
        position;
    }
  );

  return result;
}


/*
 * Evaluate the three moving points in the braid disk at
 * normalized braid time s in [0,1).
 *
 * The disk motion is a genuine elementary half twist for
 * each Artin generator.
 */
function braidDiskState(
  s,
  lambda =
    DEFAULT_M129_S3_LAMBDA,
  epsilon =
    DEFAULT_M129_S3_EPSILON,
  word =
    M129_WHITEHEAD_BRAID_WORD
) {

  const strandPositions =
    strandPositionsForLambda(
      lambda
    );

  const stageCount =
    word.length;

  const wrapped =
    (
      (
        s % 1
      ) +
      1
    ) %
    1;

  const scaled =
    wrapped *
    stageCount;

  const stage =
    Math.min(
      stageCount - 1,
      Math.floor(
        scaled
      )
    );

  const local =
    scaled -
    stage;


  const labelsByPosition =
    [
      0,
      1,
      2,
    ];


  for (
    let index = 0;
    index < stage;
    index += 1
  ) {
    const generator =
      word[index];

    const position =
      Math.abs(
        generator
      ) -
      1;

    [
      labelsByPosition[
        position
      ],
      labelsByPosition[
        position + 1
      ],
    ] = [
      labelsByPosition[
        position + 1
      ],
      labelsByPosition[
        position
      ],
    ];
  }


  const positionsBefore =
    positionByLabel(
      labelsByPosition
    );


  const generator =
    word[stage];

  const crossingPosition =
    Math.abs(
      generator
    ) -
    1;

  const sign =
    Math.sign(
      generator
    );


  const left =
    strandPositions[
      crossingPosition
    ];

  const right =
    strandPositions[
      crossingPosition + 1
    ];


  const center = {
    x:
      (
        left.x +
        right.x
      ) /
      2,

    y:
      (
        left.y +
        right.y
      ) /
      2,
  };


  const xRadius =
    Math.abs(
      right.x -
      left.x
    ) /
    2;

  const yRadius =
    halfTwistYRadiusForEpsilon(
      epsilon
    );


  const angle =
    sign *
    Math.PI *
    smoothHalfTwistAmount(
      local
    );


  const positions =
    positionsBefore.map(
      (
        position,
        label
      ) => {
        if (
          position !==
            crossingPosition &&
          position !==
            crossingPosition + 1
        ) {
          return {
            ...strandPositions[
              position
            ],
            label,
          };
        }


        const beginsLeft =
          position ===
          crossingPosition;

        const initialAngle =
          beginsLeft
            ? Math.PI
            : 0;

        const theta =
          initialAngle +
          angle;

        return {
          x:
            center.x +
            xRadius *
              Math.cos(
                theta
              ),

          y:
            center.y +
            yRadius *
              Math.sin(
                theta
              ),

          label,
        };
      }
    );


  return {
    stage,
    local,
    positions,
  };
}


/*
 * Surgery-local OPEN braid deformation.
 *
 * The Whitehead braid differs from the figure-eight braid by
 * exactly its final generator:
 *
 *   [1,-2,1,-2,-2]
 *          ->
 *   [1,-2,1,-2]
 *
 * During surgery we shrink BOTH:
 *
 *   1. the time occupied by the final generator
 *   2. its half-twist angle
 *
 * by
 *
 *   finalStrength = 1 - surgeryAmount.
 *
 * Therefore:
 *
 *   surgeryAmount = 0
 *     -> exact Whitehead braid
 *
 *   surgeryAmount = 1
 *     -> final stage has zero duration and zero angle
 *     -> exact four-stage figure-eight braid parameterization
 *
 * This function describes OPEN braid strands only.
 * Closure / reglue is handled separately.
 */
function surgeryBraidDiskState(
  s,
  surgeryAmount,
  lambda =
    DEFAULT_M129_S3_LAMBDA,
  epsilon =
    DEFAULT_M129_S3_EPSILON
) {
  const amount =
    clamp01(
      Number(
        surgeryAmount
      )
    );

  const finalStrength =
    1 - amount;

  const word =
    M129_WHITEHEAD_BRAID_WORD;

  const stageWeights =
    word.map(
      (
        _,
        index
      ) =>
        index ===
          word.length - 1
          ? finalStrength
          : 1
    );

  const totalWeight =
    stageWeights.reduce(
      (
        sum,
        weight
      ) =>
        sum + weight,
      0
    );

  const wrapped =
    (
      (
        s % 1
      ) +
      1
    ) %
    1;

  const scaled =
    wrapped *
    totalWeight;

  let stage = 0;
  let stageStart = 0;

  for (
    let index = 0;
    index <
      stageWeights.length;
    index += 1
  ) {
    const weight =
      stageWeights[
        index
      ];

    if (
      weight > 1e-12 &&
      scaled <
        stageStart +
        weight
    ) {
      stage = index;

      break;
    }

    stageStart +=
      weight;

    stage =
      Math.min(
        index + 1,
        word.length - 1
      );
  }

  /*
   * At the exact figure-eight endpoint the fifth stage has
   * vanished completely, so clamp to the fourth stage.
   */
  if (
    finalStrength <= 1e-12
  ) {
    stage =
      Math.min(
        stage,
        M004_FIGURE_EIGHT_BRAID_WORD.length -
          1
      );
  }

  const stageWeight =
    Math.max(
      1e-12,
      stageWeights[
        stage
      ]
    );

  const local =
    clamp01(
      (
        scaled -
        stageStart
      ) /
        stageWeight
    );

  const strandPositions =
    strandPositionsForLambda(
      lambda
    );

  const labelsByPosition =
    [
      0,
      1,
      2,
    ];

  /*
   * Apply every COMPLETED stage before the active one.
   */
  for (
    let index = 0;
    index < stage;
    index += 1
  ) {
    if (
      stageWeights[
        index
      ] <= 1e-12
    ) {
      continue;
    }

    const generator =
      word[
        index
      ];

    const position =
      Math.abs(
        generator
      ) -
      1;

    [
      labelsByPosition[
        position
      ],
      labelsByPosition[
        position + 1
      ],
    ] = [
      labelsByPosition[
        position + 1
      ],
      labelsByPosition[
        position
      ],
    ];
  }

  const positionsBefore =
    positionByLabel(
      labelsByPosition
    );

  const generator =
    word[
      stage
    ];

  const crossingPosition =
    Math.abs(
      generator
    ) -
    1;

  const sign =
    Math.sign(
      generator
    );

  const left =
    strandPositions[
      crossingPosition
    ];

  const right =
    strandPositions[
      crossingPosition + 1
    ];

  const center = {
    x:
      (
        left.x +
        right.x
      ) /
      2,

    y:
      (
        left.y +
        right.y
      ) /
      2,
  };

  const xRadius =
    Math.abs(
      right.x -
      left.x
    ) /
    2;

  const yRadius =
    halfTwistYRadiusForEpsilon(
      epsilon
    );

  const generatorStrength =
    stage ===
      word.length - 1
      ? finalStrength
      : 1;

  const angle =
    sign *
    Math.PI *
    generatorStrength *
    smoothHalfTwistAmount(
      local
    );

  const positions =
    positionsBefore.map(
      (
        position,
        label
      ) => {
        if (
          position !==
            crossingPosition &&
          position !==
            crossingPosition + 1
        ) {
          return {
            ...strandPositions[
              position
            ],

            label,
          };
        }

        const beginsLeft =
          position ===
          crossingPosition;

        const initialAngle =
          beginsLeft
            ? Math.PI
            : 0;

        const theta =
          initialAngle +
          angle;

        return {
          x:
            center.x +
            xRadius *
              Math.cos(
                theta
              ),

          y:
            center.y +
            yRadius *
              Math.sin(
                theta
              ),

          label,
        };
      }
    );

  return {
    stage,
    local,
    finalStrength,
    positions,
  };
}


/*
 * Public surgery-strand evaluator.
 *
 * This intentionally returns ONE OPEN braid strand.
 * It does not perform a closure identification.
 */
export function m129SurgeryOpenBraidStrandPoint4(
  strandLabel,
  braidAmount,
  theta,
  surgeryAmount,
  geometry = {}
) {
  const lambda =
    Number.isFinite(
      geometry.lambda
    )
      ? geometry.lambda
      : DEFAULT_M129_S3_LAMBDA;

  const epsilon =
    Number.isFinite(
      geometry.epsilon
    )
      ? geometry.epsilon
      : DEFAULT_M129_S3_EPSILON;

  const state =
    surgeryBraidDiskState(
      braidAmount,
      surgeryAmount,
      lambda,
      epsilon
    );

  const diskPoint =
    state.positions[
      strandLabel
    ];

  const diskRadiusSquared =
    diskPoint.x *
      diskPoint.x +
    diskPoint.y *
      diskPoint.y;

  const firstRadius =
    Math.sqrt(
      Math.max(
        0,
        1 -
          diskRadiusSquared
      )
    );

  return [
    firstRadius *
      Math.cos(
        theta
      ),

    firstRadius *
      Math.sin(
        theta
      ),

    diskPoint.x,
    diskPoint.y,
  ];
}


/*
 * Full permutation of the braid word.
 */
export function braidPermutationForWord(
  word
) {
  const labelsByPosition =
    [
      0,
      1,
      2,
    ];

  for (
    const generator
    of word
  ) {
    const position =
      Math.abs(
        generator
      ) -
      1;

    [
      labelsByPosition[
        position
      ],
      labelsByPosition[
        position + 1
      ],
    ] = [
      labelsByPosition[
        position + 1
      ],
      labelsByPosition[
        position
      ],
    ];
  }


  const result =
    new Array(3);

  labelsByPosition.forEach(
    (
      label,
      position
    ) => {
      result[label] =
        position;
    }
  );

  return result;
}


export function m129BraidPermutation() {
  return braidPermutationForWord(
    M129_WHITEHEAD_BRAID_WORD
  );
}


export function braidCyclesForWord(
  word
) {
  const permutation =
    braidPermutationForWord(
      word
    );

  const visited =
    new Set();

  const cycles = [];


  for (
    let start = 0;
    start < 3;
    start += 1
  ) {
    if (
      visited.has(
        start
      )
    ) {
      continue;
    }

    const cycle = [];

    let current =
      start;

    while (
      !visited.has(
        current
      )
    ) {
      visited.add(
        current
      );

      cycle.push(
        current
      );

      current =
        permutation[
          current
        ];
    }

    cycles.push(
      cycle
    );
  }


  return cycles;
}


export function m129BraidCycles() {
  return braidCyclesForWord(
    M129_WHITEHEAD_BRAID_WORD
  );
}


/*
 * Evaluate a particular braid strand in S^3.
 *
 * theta gives progress around the solid-torus core.
 */
function braidStrandPoint4(
  strandLabel,
  braidAmount,
  theta,
  lambda =
    DEFAULT_M129_S3_LAMBDA,
  epsilon =
    DEFAULT_M129_S3_EPSILON,
  word =
    M129_WHITEHEAD_BRAID_WORD
) {
  const state =
    braidDiskState(
      braidAmount,
      lambda,
      epsilon,
      word
    );

  const diskPoint =
    state.positions[
      strandLabel
    ];


  const diskRadiusSquared =
    diskPoint.x *
      diskPoint.x +
    diskPoint.y *
      diskPoint.y;


  const firstRadius =
    Math.sqrt(
      Math.max(
        0,
        1 -
          diskRadiusSquared
      )
    );


  return [
    firstRadius *
      Math.cos(
        theta
      ),

    firstRadius *
      Math.sin(
        theta
      ),

    diskPoint.x,

    diskPoint.y,
  ];
}


/*
 * Follow one permutation cycle through successive traversals
 * of the braid cylinder.
 *
 * This turns the three braid strands into the two actual
 * closed Whitehead-link components.
 */
function cyclePoint4(
  cycle,
  t,
  lambda =
    DEFAULT_M129_S3_LAMBDA,
  epsilon =
    DEFAULT_M129_S3_EPSILON,
  word =
    M129_WHITEHEAD_BRAID_WORD
) {
  const cycleLength =
    cycle.length;

  const wrapped =
    (
      (
        t %
          (
            2 *
            Math.PI
          )
      ) +
      2 *
        Math.PI
    ) %
    (
      2 *
      Math.PI
    );


  const totalAmount =
    wrapped /
    (
      2 *
      Math.PI
    );


  const scaled =
    totalAmount *
    cycleLength;


  const traversal =
    Math.min(
      cycleLength - 1,
      Math.floor(
        scaled
      )
    );


  const local =
    scaled -
    traversal;


  const strandLabel =
    cycle[
      traversal
    ];


  const theta =
    2 *
    Math.PI *
    local;


  return braidStrandPoint4(
    strandLabel,
    local,
    theta,
    lambda,
    epsilon,
    word
  );
}


const CYCLES =
  m129BraidCycles();


if (
  CYCLES.length !==
  2
) {
  throw new Error(
    "Whitehead braid closure must have exactly two components."
  );
}


/*
 * Preserve our established directed marking:
 *
 *   cusp 0 -> surviving-knot component
 *   cusp 1 -> crossing-circle component
 *
 * At this stage this is a deterministic component ordering.
 */
const ORDERED_CYCLES =
  Object.freeze(
    CYCLES
      .slice()
      .sort(
        (
          first,
          second
        ) =>
          second.length -
          first.length
      )
      .map(
        (cycle) =>
          Object.freeze(
            cycle.slice()
          )
      )
  );


const FIGURE_EIGHT_BRAID_CYCLES =
  braidCyclesForWord(
    M004_FIGURE_EIGHT_BRAID_WORD
  );


if (
  FIGURE_EIGHT_BRAID_CYCLES.length !==
  1
) {
  throw new Error(
    "Figure-eight braid closure must have exactly one component."
  );
}


export function figureEightBraidS3CenterlinePoint(
  t,
  geometry = {}
) {
  const lambda =
    Number.isFinite(
      geometry.lambda
    )
      ? geometry.lambda
      : DEFAULT_M129_S3_LAMBDA;

  const epsilon =
    Number.isFinite(
      geometry.epsilon
    )
      ? geometry.epsilon
      : DEFAULT_M129_S3_EPSILON;

  return cyclePoint4(
    FIGURE_EIGHT_BRAID_CYCLES[0],
    t,
    lambda,
    epsilon,
    M004_FIGURE_EIGHT_BRAID_WORD
  );
}


export function m129S3CenterlinePoint(
  componentIndex,
  t,
  geometry = {}
) {
  const lambda =
    Number.isFinite(
      geometry.lambda
    )
      ? geometry.lambda
      : DEFAULT_M129_S3_LAMBDA;

  const epsilon =
    Number.isFinite(
      geometry.epsilon
    )
      ? geometry.epsilon
      : DEFAULT_M129_S3_EPSILON;

  const cycle =
    ORDERED_CYCLES[
      componentIndex
    ];

  if (
    !cycle
  ) {
    throw new Error(
      `Unknown m129 S^3 component ${componentIndex}.`
    );
  }

  return cyclePoint4(
    cycle,
    t,
    lambda,
    epsilon
  );
}


/*
 * ------------------------------------------------------------
 * SAFE TUBULAR RADIUS
 * ------------------------------------------------------------
 *
 * A geodesic tube around a curve in S^3 ceases to be locally
 * embedded when rho reaches the first focal point of the normal
 * exponential map.
 *
 * For geodesic curvature kappa,
 *
 *     tan(rho_focal) = 1 / kappa.
 *
 * Therefore:
 *
 *     rho_focal = atan(1 / kappa).
 *
 * Estimate the maximum geodesic curvature numerically from the
 * actual m129 centerlines, then retain a safety margin below the
 * corresponding focal radius.
 */

const M129_SAFE_RADIUS_CACHE =
  new Map();

const M129_CURVATURE_SAMPLES =
  720;

const M129_FOCAL_SAFETY_FACTOR =
  0.72;

const M129_MIN_EFFECTIVE_RHO =
  0.006;


function dot4ForSafeRadius(
  first,
  second
) {
  return (
    first[0] * second[0] +
    first[1] * second[1] +
    first[2] * second[2] +
    first[3] * second[3]
  );
}


function clampUnitDot(
  value
) {
  return Math.max(
    -1,
    Math.min(
      1,
      value
    )
  );
}


function sphericalDistance4(
  first,
  second
) {
  return Math.acos(
    clampUnitDot(
      dot4ForSafeRadius(
        first,
        second
      )
    )
  );
}


/*
 * Unit tangent at "origin" pointing along the shortest S^3
 * geodesic toward "target".
 */
function sphericalDirection4(
  origin,
  target
) {
  const cosine =
    clampUnitDot(
      dot4ForSafeRadius(
        origin,
        target
      )
    );

  const angle =
    Math.acos(
      cosine
    );

  const sine =
    Math.sin(
      angle
    );

  if (
    Math.abs(sine) <
    1e-10
  ) {
    return null;
  }

  return [
    (
      target[0] -
      cosine * origin[0]
    ) /
      sine,

    (
      target[1] -
      cosine * origin[1]
    ) /
      sine,

    (
      target[2] -
      cosine * origin[2]
    ) /
      sine,

    (
      target[3] -
      cosine * origin[3]
    ) /
      sine,
  ];
}


function estimatedComponentMaxGeodesicCurvature(
  componentIndex,
  lambda,
  epsilon
) {
  const points =
    Array.from(
      {
        length:
          M129_CURVATURE_SAMPLES,
      },
      (
        _,
        index
      ) =>
        m129S3CenterlinePoint(
          componentIndex,
          (
            2 *
            Math.PI *
            index
          ) /
            M129_CURVATURE_SAMPLES,
          {
            lambda,
            epsilon,
          }
        )
    );

  let maximumCurvature =
    0;

  for (
    let index = 0;
    index <
      M129_CURVATURE_SAMPLES;
    index += 1
  ) {
    const previous =
      points[
        (
          index -
          1 +
          M129_CURVATURE_SAMPLES
        ) %
          M129_CURVATURE_SAMPLES
      ];

    const current =
      points[index];

    const next =
      points[
        (
          index +
          1
        ) %
          M129_CURVATURE_SAMPLES
      ];

    const previousDirection =
      sphericalDirection4(
        current,
        previous
      );

    const nextDirection =
      sphericalDirection4(
        current,
        next
      );

    if (
      !previousDirection ||
      !nextDirection
    ) {
      continue;
    }

    /*
     * previousDirection points backward along the curve.
     * Negating it gives the incoming forward tangent.
     */
    const incomingForward = [
      -previousDirection[0],
      -previousDirection[1],
      -previousDirection[2],
      -previousDirection[3],
    ];

    const turningAngle =
      Math.acos(
        clampUnitDot(
          dot4ForSafeRadius(
            incomingForward,
            nextDirection
          )
        )
      );

    const previousArc =
      sphericalDistance4(
        current,
        previous
      );

    const nextArc =
      sphericalDistance4(
        current,
        next
      );

    const localArc =
      (
        previousArc +
        nextArc
      ) /
      2;

    if (
      localArc <
      1e-10
    ) {
      continue;
    }

    const curvature =
      turningAngle /
      localArc;

    if (
      Number.isFinite(
        curvature
      )
    ) {
      maximumCurvature =
        Math.max(
          maximumCurvature,
          curvature
        );
    }
  }

  return maximumCurvature;
}


export function m129SafeTubeRadius(
  lambda,
  epsilon
) {
  const key =
    `${Number(lambda)}:` +
    `${Number(epsilon)}`;

  if (
    M129_SAFE_RADIUS_CACHE.has(
      key
    )
  ) {
    return (
      M129_SAFE_RADIUS_CACHE.get(
        key
      )
    );
  }

  let maximumCurvature =
    0;

  for (
    const componentIndex
    of [0, 1]
  ) {
    maximumCurvature =
      Math.max(
        maximumCurvature,
        estimatedComponentMaxGeodesicCurvature(
          componentIndex,
          lambda,
          epsilon
        )
      );
  }

  const focalRadius =
    maximumCurvature >
      1e-10
      ? Math.atan(
          1 /
          maximumCurvature
        )
      : Math.PI / 2;

  const safeRadius =
    Math.max(
      M129_MIN_EFFECTIVE_RHO,
      focalRadius *
        M129_FOCAL_SAFETY_FACTOR
    );

  M129_SAFE_RADIUS_CACHE.set(
    key,
    safeRadius
  );

  return safeRadius;
}


export function m129S3CenterlineCycles() {
  return ORDERED_CYCLES.map(
    (cycle) =>
      cycle.slice()
  );
}
