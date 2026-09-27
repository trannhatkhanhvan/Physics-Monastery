"use client";

import M129_NATIVE_ORTHOGONAL_CURVES
  from "../data/generated/m129_native_orthogonal_curves.json";

/*
 * m129 Whitehead-link boundary geometry.
 *
 * Ambient representative:
 *
 *   closure of the 3-braid
 *
 *     sigma_1 sigma_2^-1 sigma_1 sigma_2^-2
 *
 * This closure has two components.
 *
 * Persistent directed marking:
 *
 *   cusp 0 -> surviving-knot component
 *   cusp 1 -> crossing-circle component
 *
 * Peripheral coordinates:
 *
 *   u = meridian coefficient
 *   v = longitude coefficient
 *
 * Therefore:
 *
 *   v travels along the core curve,
 *   u rotates around the tube.
 */


export const M129_WHITEHEAD_BRAID_WORD =
  Object.freeze([
    1,
    -2,
    1,
    -2,
    -2,
  ]);


const STRAND_X =
  Object.freeze([
    -1.10,
    0,
    1.10,
  ]);

const STAGE_SPACING = 1.00;
const BRAID_STAGE_SAMPLES = 24;
const CLOSURE_SAMPLES = 96;
const CROSSING_HEIGHT = 0.48;
const TUBE_RADIUS = 0.31;

/*
 * Display-only affine normalization of Spherogram's native
 * orthogonal integer grid.
 *
 * Native geometry remains untouched in the generated JSON.
 *
 *   native grid center = (30, 30)
 *   native range       = 10 ... 50
 */
const PRESENTATION_SCALE = 0.12;

const PRESENTATION_OFFSET =
  Object.freeze({
    x: -30,
    y: -30,
    z: 0,
  });


function clamp(
  value,
  minimum,
  maximum
) {
  return Math.max(
    minimum,
    Math.min(
      maximum,
      value
    )
  );
}


function lerp(
  first,
  second,
  amount
) {
  return (
    first +
    (
      second -
      first
    ) *
      amount
  );
}


function smoothAmount(
  amount
) {
  return (
    0.5 -
    0.5 *
      Math.cos(
        Math.PI *
        clamp(
          amount,
          0,
          1
        )
      )
  );
}


function add(
  first,
  second
) {
  return {
    x: first.x + second.x,
    y: first.y + second.y,
    z: first.z + second.z,
  };
}


function subtract(
  first,
  second
) {
  return {
    x: first.x - second.x,
    y: first.y - second.y,
    z: first.z - second.z,
  };
}


function scale(
  point,
  amount
) {
  return {
    x: point.x * amount,
    y: point.y * amount,
    z: point.z * amount,
  };
}


function dot(
  first,
  second
) {
  return (
    first.x * second.x +
    first.y * second.y +
    first.z * second.z
  );
}


function cross(
  first,
  second
) {
  return {
    x:
      first.y * second.z -
      first.z * second.y,

    y:
      first.z * second.x -
      first.x * second.z,

    z:
      first.x * second.y -
      first.y * second.x,
  };
}


function length(
  point
) {
  return Math.sqrt(
    dot(
      point,
      point
    )
  );
}


function normalize(
  point
) {
  const magnitude =
    length(point);

  if (
    magnitude <
    1e-12
  ) {
    return {
      x: 1,
      y: 0,
      z: 0,
    };
  }

  return scale(
    point,
    1 / magnitude
  );
}


function distance(
  first,
  second
) {
  return length(
    subtract(
      second,
      first
    )
  );
}


function wrap01(
  value
) {
  const wrapped =
    value -
    Math.floor(value);

  return (
    wrapped < 0
      ? wrapped + 1
      : wrapped
  );
}


function positionByLabel(
  labelsByPosition
) {
  const result = [];

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


function buildBraidStrands() {
  const stageCount =
    M129_WHITEHEAD_BRAID_WORD
      .length;

  const halfHeight =
    stageCount *
    STAGE_SPACING /
    2;

  const labelsByPosition =
    [0, 1, 2];

  const paths =
    [
      [],
      [],
      [],
    ];

  for (
    let stage = 0;
    stage < stageCount;
    stage += 1
  ) {
    const generator =
      M129_WHITEHEAD_BRAID_WORD[
        stage
      ];

    const crossingPosition =
      Math.abs(generator) -
      1;

    const sign =
      Math.sign(generator);

    const positionsBefore =
      positionByLabel(
        labelsByPosition
      );

    const labelsAfter =
      [
        ...labelsByPosition,
      ];

    [
      labelsAfter[
        crossingPosition
      ],
      labelsAfter[
        crossingPosition + 1
      ],
    ] = [
      labelsAfter[
        crossingPosition + 1
      ],
      labelsAfter[
        crossingPosition
      ],
    ];

    const positionsAfter =
      positionByLabel(
        labelsAfter
      );

    for (
      let sample = 0;
      sample <
        BRAID_STAGE_SAMPLES;
      sample += 1
    ) {
      const amount =
        sample /
        BRAID_STAGE_SAMPLES;

      const eased =
        smoothAmount(
          amount
        );

      const y =
        -halfHeight +
        (
          stage +
          amount
        ) *
          STAGE_SPACING;

      for (
        let label = 0;
        label < 3;
        label += 1
      ) {
        const startPosition =
          positionsBefore[
            label
          ];

        const endPosition =
          positionsAfter[
            label
          ];

        const affected =
          (
            startPosition ===
              crossingPosition ||
            startPosition ===
              crossingPosition + 1
          );

        let z = 0;

        if (affected) {
          const startsOnLeft =
            startPosition ===
            crossingPosition;

          const over =
            sign > 0
              ? startsOnLeft
              : !startsOnLeft;

          z =
            (
              over
                ? 1
                : -1
            ) *
            CROSSING_HEIGHT *
            Math.sin(
              Math.PI *
              amount
            );
        }

        paths[label].push({
          x:
            lerp(
              STRAND_X[
                startPosition
              ],
              STRAND_X[
                endPosition
              ],
              eased
            ),

          y,

          z,
        });
      }
    }

    labelsByPosition.splice(
      0,
      labelsByPosition.length,
      ...labelsAfter
    );
  }

  const finalPositions =
    positionByLabel(
      labelsByPosition
    );

  for (
    let label = 0;
    label < 3;
    label += 1
  ) {
    paths[label].push({
      x:
        STRAND_X[
          finalPositions[
            label
          ]
        ],

      y:
        halfHeight,

      z: 0,
    });
  }

  const permutation = {};

  finalPositions.forEach(
    (
      position,
      label
    ) => {
      permutation[label] =
        position;
    }
  );

  return {
    paths,
    permutation,
    halfHeight,
  };
}


function buildClosurePath(
  position,
  halfHeight
) {
  const x0 =
    STRAND_X[position];

  const radius =
    3.10 +
    position *
      0.28;

  const depthLift =
    (
      position -
      1
    ) *
    0.10;

  const points = [];

  for (
    let sample = 0;
    sample <=
      CLOSURE_SAMPLES;
    sample += 1
  ) {
    const amount =
      sample /
      CLOSURE_SAMPLES;

    const angle =
      Math.PI *
      amount;

    points.push({
      x:
        x0 +
        radius *
          Math.sin(angle),

      y:
        halfHeight *
        Math.cos(angle),

      z:
        depthLift *
        Math.sin(angle),
    });
  }

  return points;
}


function derivePermutationCycles(
  permutation
) {
  const visited =
    new Set();

  const cycles = [];

  for (
    let start = 0;
    start < 3;
    start += 1
  ) {
    if (
      visited.has(start)
    ) {
      continue;
    }

    const cycle = [];
    let current = start;

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
        permutation[current];
    }

    cycles.push(
      cycle
    );
  }

  return cycles;
}


function appendPath(
  destination,
  source
) {
  source.forEach(
    (
      point,
      index
    ) => {
      if (
        destination.length >
          0 &&
        index === 0
      ) {
        return;
      }

      destination.push(
        point
      );
    }
  );
}


function buildClosedComponents() {
  const {
    paths,
    permutation,
    halfHeight,
  } =
    buildBraidStrands();

  const cycles =
    derivePermutationCycles(
      permutation
    );

  if (
    cycles.length !== 2
  ) {
    throw new Error(
      "Whitehead braid closure must have exactly two components."
    );
  }

  const cycleKey =
    (cycle) =>
      cycle.join(",");

  const orderedCycles =
    [
      cycles.find(
        (cycle) =>
          cycleKey(cycle) ===
          "0,2"
      ),

      cycles.find(
        (cycle) =>
          cycleKey(cycle) ===
          "1"
      ),
    ];

  if (
    orderedCycles.some(
      (cycle) =>
        !cycle
    )
  ) {
    throw new Error(
      "Unexpected Whitehead braid closure permutation."
    );
  }

  return orderedCycles.map(
    (cycle) => {
      const points = [];

      cycle.forEach(
        (label) => {
          appendPath(
            points,
            paths[label]
          );

          appendPath(
            points,
            buildClosurePath(
              permutation[label],
              halfHeight
            )
          );
        }
      );

      if (
        points.length > 1 &&
        distance(
          points[0],
          points[
            points.length -
            1
          ]
        ) <
          1e-9
      ) {
        points.pop();
      }

      return points;
    }
  );
}


function buildArcLengthRecord(
  points
) {
  const cumulative =
    [0];

  let total = 0;

  for (
    let index = 0;
    index <
      points.length;
    index += 1
  ) {
    const next =
      (
        index +
        1
      ) %
      points.length;

    total +=
      distance(
        points[index],
        points[next]
      );

    cumulative.push(
      total
    );
  }

  return {
    points,
    cumulative,
    total,
  };
}


const COMPONENTS =
  M129_NATIVE_ORTHOGONAL_CURVES
    .components
    .map(
      (component) =>
        buildArcLengthRecord(
          component.points.map(
            (point) => ({
              x: Number(point.x),
              y: Number(point.y),
              z: Number(point.z),
            })
          )
        )
    );


/*
 * Continuous tube framing
 * -----------------------
 *
 * A tube around a closed curve requires a continuously varying
 * orthonormal frame:
 *
 *   T(s), N(s), B(s).
 *
 * Choosing N independently from a fixed reference axis creates
 * sudden flips whenever T crosses the reference-axis threshold.
 * Those flips were the source of the giant stretched ribbons in
 * the first combined m129 Boundary prototype.
 *
 * Instead:
 *
 *   1. choose one initial normal;
 *   2. parallel-transport it around the polygonal core;
 *   3. measure the residual rotation after one full circuit;
 *   4. distribute that holonomy correction continuously around
 *      the entire closed component.
 *
 * The resulting N/B frame is periodic and has no arbitrary
 * reference-axis jumps.
 */


function rotateAroundAxis(
  vector,
  axis,
  angle
) {
  const cosine =
    Math.cos(angle);

  const sine =
    Math.sin(angle);

  const alongAxis =
    scale(
      axis,
      dot(
        axis,
        vector
      ) *
      (
        1 -
        cosine
      )
    );

  const rotatedPlane =
    add(
      scale(
        vector,
        cosine
      ),
      scale(
        cross(
          axis,
          vector
        ),
        sine
      )
    );

  return add(
    rotatedPlane,
    alongAxis
  );
}


function projectPerpendicular(
  vector,
  tangent
) {
  return subtract(
    vector,
    scale(
      tangent,
      dot(
        vector,
        tangent
      )
    )
  );
}


function stableInitialNormal(
  tangent
) {
  const axes = [
    {
      x: 1,
      y: 0,
      z: 0,
    },
    {
      x: 0,
      y: 1,
      z: 0,
    },
    {
      x: 0,
      y: 0,
      z: 1,
    },
  ];

  const reference =
    axes
      .slice()
      .sort(
        (
          first,
          second
        ) =>
          Math.abs(
            dot(
              tangent,
              first
            )
          ) -
          Math.abs(
            dot(
              tangent,
              second
            )
          )
      )[0];

  return normalize(
    projectPerpendicular(
      reference,
      tangent
    )
  );
}


function transportNormal(
  normal,
  fromTangent,
  toTangent
) {
  const axisVector =
    cross(
      fromTangent,
      toTangent
    );

  const sine =
    length(
      axisVector
    );

  const cosine =
    clamp(
      dot(
        fromTangent,
        toTangent
      ),
      -1,
      1
    );

  if (
    sine <
    1e-10
  ) {
    /*
     * Parallel tangents require no rotational transport.
     * Re-project to suppress accumulated floating-point drift.
     */
    const projected =
      projectPerpendicular(
        normal,
        toTangent
      );

    if (
      length(
        projected
      ) <
      1e-10
    ) {
      return stableInitialNormal(
        toTangent
      );
    }

    return normalize(
      projected
    );
  }

  const axis =
    scale(
      axisVector,
      1 /
        sine
    );

  const angle =
    Math.atan2(
      sine,
      cosine
    );

  const rotated =
    rotateAroundAxis(
      normal,
      axis,
      angle
    );

  return normalize(
    projectPerpendicular(
      rotated,
      toTangent
    )
  );
}


function signedAngleAroundAxis(
  from,
  to,
  axis
) {
  return Math.atan2(
    dot(
      axis,
      cross(
        from,
        to
      )
    ),
    clamp(
      dot(
        from,
        to
      ),
      -1,
      1
    )
  );
}


function buildComponentParallelFrame(
  component
) {
  const count =
    component.points.length;

  if (
    count < 3
  ) {
    throw new Error(
      "m129 boundary component requires at least three core points."
    );
  }

  const tangents =
    component.points.map(
      (
        point,
        index
      ) => {
        const previous =
          component.points[
            (
              index -
              1 +
              count
            ) %
            count
          ];

        const next =
          component.points[
            (
              index +
              1
            ) %
            count
          ];

        return normalize(
          subtract(
            next,
            previous
          )
        );
      }
    );


  /*
   * First pass: ordinary discrete parallel transport.
   */
  const transportedNormals =
    new Array(count);

  transportedNormals[0] =
    stableInitialNormal(
      tangents[0]
    );

  for (
    let index = 1;
    index < count;
    index += 1
  ) {
    transportedNormals[index] =
      transportNormal(
        transportedNormals[
          index -
          1
        ],
        tangents[
          index -
          1
        ],
        tangents[
          index
        ]
      );
  }


  /*
   * Transport the final normal across the closing edge back to
   * tangent 0. Any difference from the initial normal is the
   * residual holonomy of this discrete framing.
   */
  const returnedNormal =
    transportNormal(
      transportedNormals[
        count -
        1
      ],
      tangents[
        count -
        1
      ],
      tangents[0]
    );

  const closureCorrection =
    signedAngleAroundAxis(
      returnedNormal,
      transportedNormals[0],
      tangents[0]
    );


  /*
   * Second pass: distribute the closing correction according to
   * normalized arclength. At s=0 the correction is zero; after
   * one complete circuit it equals exactly the amount required
   * to close the frame.
   */
  const normals =
    transportedNormals.map(
      (
        normal,
        index
      ) => {
        const arcFraction =
          component.cumulative[
            index
          ] /
          component.total;

        const corrected =
          rotateAroundAxis(
            normal,
            tangents[index],
            closureCorrection *
              arcFraction
          );

        return normalize(
          projectPerpendicular(
            corrected,
            tangents[index]
          )
        );
      }
    );

  const binormals =
    normals.map(
      (
        normal,
        index
      ) =>
        normalize(
          cross(
            tangents[index],
            normal
          )
        )
    );

  return {
    tangents,
    normals,
    binormals,
  };
}


const COMPONENT_FRAMES =
  COMPONENTS.map(
    buildComponentParallelFrame
  );


function locateComponentSample(
  component,
  amount
) {
  const target =
    wrap01(amount) *
    component.total;

  let low = 0;

  let high =
    component.points.length -
    1;

  while (
    low <= high
  ) {
    const middle =
      Math.floor(
        (
          low +
          high
        ) /
        2
      );

    if (
      component.cumulative[
        middle + 1
      ] <
      target
    ) {
      low =
        middle + 1;

      continue;
    }

    if (
      component.cumulative[
        middle
      ] >
      target
    ) {
      high =
        middle - 1;

      continue;
    }

    const startDistance =
      component.cumulative[
        middle
      ];

    const endDistance =
      component.cumulative[
        middle + 1
      ];

    const denominator =
      Math.max(
        1e-12,
        endDistance -
          startDistance
      );

    return {
      index:
        middle,

      nextIndex:
        (
          middle +
          1
        ) %
        component.points.length,

      amount:
        (
          target -
          startDistance
        ) /
        denominator,
    };
  }

  return {
    index: 0,
    nextIndex: 1,
    amount: 0,
  };
}


function interpolateVector(
  first,
  second,
  amount
) {
  return {
    x:
      lerp(
        first.x,
        second.x,
        amount
      ),

    y:
      lerp(
        first.y,
        second.y,
        amount
      ),

    z:
      lerp(
        first.z,
        second.z,
        amount
      ),
  };
}


function sampleClosedComponent(
  cuspIndex,
  amount
) {
  const component =
    COMPONENTS[
      cuspIndex
    ];

  if (!component) {
    throw new Error(
      `Unknown m129 cusp/component ${cuspIndex}.`
    );
  }

  const target =
    wrap01(amount) *
    component.total;

  let low = 0;
  let high =
    component.points.length -
    1;

  while (
    low <= high
  ) {
    const middle =
      Math.floor(
        (
          low +
          high
        ) /
        2
      );

    if (
      component.cumulative[
        middle + 1
      ] <
      target
    ) {
      low =
        middle + 1;
    } else if (
      component.cumulative[
        middle
      ] >
      target
    ) {
      high =
        middle - 1;
    } else {
      const startDistance =
        component.cumulative[
          middle
        ];

      const endDistance =
        component.cumulative[
          middle + 1
        ];

      const denominator =
        Math.max(
          1e-12,
          endDistance -
            startDistance
        );

      const localAmount =
        (
          target -
          startDistance
        ) /
        denominator;

      const first =
        component.points[
          middle
        ];

      const second =
        component.points[
          (
            middle +
            1
          ) %
          component.points.length
        ];

      return {
        x:
          lerp(
            first.x,
            second.x,
            localAmount
          ),

        y:
          lerp(
            first.y,
            second.y,
            localAmount
          ),

        z:
          lerp(
            first.z,
            second.z,
            localAmount
          ),
      };
    }
  }

  return {
    ...component.points[0],
  };
}


function componentFrame(
  cuspIndex,
  longitudeAmount
) {
  const component =
    COMPONENTS[
      cuspIndex
    ];

  const frame =
    COMPONENT_FRAMES[
      cuspIndex
    ];

  if (
    !component ||
    !frame
  ) {
    throw new Error(
      `Missing parallel frame for m129 cusp ${cuspIndex}.`
    );
  }

  const location =
    locateComponentSample(
      component,
      longitudeAmount
    );

  const tangent =
    normalize(
      interpolateVector(
        frame.tangents[
          location.index
        ],
        frame.tangents[
          location.nextIndex
        ],
        location.amount
      )
    );

  const interpolatedNormal =
    interpolateVector(
      frame.normals[
        location.index
      ],
      frame.normals[
        location.nextIndex
      ],
      location.amount
    );

  const normal =
    normalize(
      projectPerpendicular(
        interpolatedNormal,
        tangent
      )
    );

  const binormal =
    normalize(
      cross(
        tangent,
        normal
      )
    );

  return {
    tangent,
    normal,
    binormal,
  };
}


function presentationPoint(
  point
) {
  return {
    x:
      (
        point.x +
        PRESENTATION_OFFSET.x
      ) *
      PRESENTATION_SCALE,

    y:
      (
        point.y +
        PRESENTATION_OFFSET.y
      ) *
      PRESENTATION_SCALE,

    z:
      (
        point.z +
        PRESENTATION_OFFSET.z
      ) *
      PRESENTATION_SCALE,
  };
}


export function m129WhiteheadBoundaryPoint(
  cuspIndex,
  uv
) {
  const meridianAmount =
    Number(
      uv?.u ??
      0
    );

  const longitudeAmount =
    Number(
      uv?.v ??
      0
    );

  const center =
    sampleClosedComponent(
      cuspIndex,
      longitudeAmount
    );

  const frame =
    componentFrame(
      cuspIndex,
      longitudeAmount
    );

  const angle =
    2 *
    Math.PI *
    meridianAmount;

  const radial =
    add(
      scale(
        frame.normal,
        TUBE_RADIUS *
          Math.cos(angle)
      ),
      scale(
        frame.binormal,
        TUBE_RADIUS *
          Math.sin(angle)
      )
    );

  return presentationPoint(
    add(
      center,
      radial
    )
  );
}

export function m129WhiteheadCoreComponents() {
  return COMPONENTS.map(
    (component, cuspIndex) => ({
      cuspIndex,

      role:
        M129_NATIVE_ORTHOGONAL_CURVES
          .components[cuspIndex]
          ?.role ??
        `component-${cuspIndex}`,

      points:
        component.points.map(
          presentationPoint
        ),
    })
  );
}

