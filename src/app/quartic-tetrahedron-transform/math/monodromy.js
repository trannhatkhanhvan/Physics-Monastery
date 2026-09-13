const PI = Math.PI;
const TAU = 2 * Math.PI;

/*
 * Physical a:
 *
 *   a = exp(pi^2 / 4) - m_p / kilogram
 *
 * Keep this synchronized with PHYSICAL_A in the main
 * Quartic -> Ideal Tetrahedron page.
 */
const PHYSICAL_A =
  11.791761367470536;

export const MONODROMY_BASEPOINT = {
  re: PHYSICAL_A,
  im: 0,
};

const discriminantRadical =
  Math.sqrt(
    Math.PI ** 2 +
    6 * Math.PI
  );

const realDoubleRootSquared =
  (
    -Math.PI +
    discriminantRadical
  ) / 3;

const imaginaryDoubleRootSquared =
  (
    Math.PI +
    discriminantRadical
  ) / 3;

const realDoubleRoot =
  Math.sqrt(
    realDoubleRootSquared
  );

const imaginaryDoubleRoot =
  Math.sqrt(
    imaginaryDoubleRootSquared
  );

export const MONODROMY_A_STAR =
  2 * realDoubleRoot +
  2 * realDoubleRoot ** 3 / Math.PI;

export const MONODROMY_B_STAR =
  2 * imaginaryDoubleRoot -
  2 * imaginaryDoubleRoot ** 3 / Math.PI;

export const MONODROMY_BRANCHES = [
  {
    id: 'plus-real',
    label: 'a₃',
    center: {
      re: MONODROMY_A_STAR,
      im: 0,
    },
  },
  {
    id: 'minus-real',
    label: '−a₃',
    center: {
      re: -MONODROMY_A_STAR,
      im: 0,
    },
  },
  {
    id: 'plus-imaginary',
    label: 'b₁',
    center: {
      re: 0,
      im: MONODROMY_B_STAR,
    },
  },
  {
    id: 'minus-imaginary',
    label: '−b₁',
    center: {
      re: 0,
      im: -MONODROMY_B_STAR,
    },
  },
];

function c(re, im = 0) {
  return { re, im };
}

function add(left, right) {
  return c(
    left.re + right.re,
    left.im + right.im
  );
}

function sub(left, right) {
  return c(
    left.re - right.re,
    left.im - right.im
  );
}

function mul(left, right) {
  return c(
    left.re * right.re -
      left.im * right.im,

    left.re * right.im +
      left.im * right.re
  );
}

function scale(value, scalar) {
  return c(
    value.re * scalar,
    value.im * scalar
  );
}

function abs2(value) {
  return (
    value.re * value.re +
    value.im * value.im
  );
}

function abs(value) {
  return Math.hypot(
    value.re,
    value.im
  );
}

function div(numerator, denominator) {
  const denominator2 =
    abs2(denominator);

  return c(
    (
      numerator.re * denominator.re +
      numerator.im * denominator.im
    ) / denominator2,

    (
      numerator.im * denominator.re -
      numerator.re * denominator.im
    ) / denominator2
  );
}

function expI(theta) {
  return c(
    Math.cos(theta),
    Math.sin(theta)
  );
}

function distance(left, right) {
  return abs(
    sub(left, right)
  );
}

function polynomial(root, parameter) {
  const root2 =
    mul(root, root);

  const root4 =
    mul(root2, root2);

  return add(
    add(
      add(
        root4,
        scale(
          root2,
          TAU
        )
      ),
      scale(
        mul(
          parameter,
          root
        ),
        -TAU
      )
    ),
    c(TAU)
  );
}

function polynomialDerivative(
  root,
  parameter
) {
  const root2 =
    mul(root, root);

  const root3 =
    mul(root2, root);

  return add(
    add(
      scale(root3, 4),
      scale(root, 2 * TAU)
    ),
    scale(parameter, -TAU)
  );
}

function rootDerivativeWithRespectToA(
  root,
  parameter
) {
  return div(
    scale(root, TAU),

    polynomialDerivative(
      root,
      parameter
    )
  );
}

function normalizedPolynomial(
  root,
  c2,
  c1,
  c0
) {
  const root2 =
    mul(root, root);

  const root4 =
    mul(root2, root2);

  return add(
    add(
      add(
        root4,
        scale(root2, c2)
      ),
      mul(c1, root)
    ),
    c(c0)
  );
}

function polishRoot(
  root,
  parameter
) {
  let current = root;

  for (
    let iteration = 0;
    iteration < 12;
    iteration += 1
  ) {
    const derivative =
      polynomialDerivative(
        current,
        parameter
      );

    if (
      abs(derivative) <
      1e-15
    ) {
      break;
    }

    const correction =
      div(
        polynomial(
          current,
          parameter
        ),
        derivative
      );

    current =
      sub(
        current,
        correction
      );

    if (
      abs(correction) <
      1e-14
    ) {
      break;
    }
  }

  return current;
}

export function solveComplexQuartic(
  parameter
) {
  const parameterMagnitude =
    abs(parameter);

  const rootScale =
    Math.max(
      1,
      Math.sqrt(TAU),

      Math.cbrt(
        TAU *
        Math.max(
          1,
          parameterMagnitude
        )
      )
    );

  const c2 =
    TAU /
    (rootScale * rootScale);

  const c1 =
    scale(
      parameter,

      -TAU /
      (
        rootScale *
        rootScale *
        rootScale
      )
    );

  const c0 =
    TAU /
    (
      rootScale *
      rootScale *
      rootScale *
      rootScale
    );

  let roots = [
    c(1.0, 0.15),
    c(0.2, 1.05),
    c(-1.0, 0.35),
    c(-0.35, -0.95),
  ];

  for (
    let iteration = 0;
    iteration < 160;
    iteration += 1
  ) {
    let maximumCorrection = 0;

    const nextRoots =
      roots.map(
        (root, rootIndex) => {
          let denominator =
            c(1);

          for (
            let otherIndex = 0;
            otherIndex < 4;
            otherIndex += 1
          ) {
            if (
              otherIndex ===
              rootIndex
            ) {
              continue;
            }

            denominator =
              mul(
                denominator,

                sub(
                  root,
                  roots[otherIndex]
                )
              );
          }

          if (
            abs(denominator) <
            1e-18
          ) {
            denominator =
              add(
                denominator,
                c(1e-12, 1e-12)
              );
          }

          const correction =
            div(
              normalizedPolynomial(
                root,
                c2,
                c1,
                c0
              ),
              denominator
            );

          maximumCorrection =
            Math.max(
              maximumCorrection,
              abs(correction)
            );

          return sub(
            root,
            correction
          );
        }
      );

    roots = nextRoots;

    if (
      maximumCorrection <
      1e-14
    ) {
      break;
    }
  }

  return roots.map(
    root =>
      polishRoot(
        scale(
          root,
          rootScale
        ),
        parameter
      )
  );
}

function labelBaseRoots(roots) {
  const realRoots =
    roots
      .filter(
        root =>
          Math.abs(root.im) <
          1e-8
      )
      .sort(
        (left, right) =>
          left.re - right.re
      );

  const complexRoots =
    roots
      .filter(
        root =>
          Math.abs(root.im) >=
          1e-8
      )
      .sort(
        (left, right) =>
          right.im - left.im
      );

  if (
    realRoots.length === 2 &&
    complexRoots.length === 2
  ) {
    return [
      realRoots[0],
      realRoots[1],
      complexRoots[0],
      complexRoots[1],
    ];
  }

  return [...roots].sort(
    (left, right) => {
      if (
        Math.abs(
          left.im - right.im
        ) > 1e-9
      ) {
        return (
          right.im -
          left.im
        );
      }

      return (
        left.re -
        right.re
      );
    }
  );
}

function permutationsOfFour() {
  const permutations = [];

  function visit(
    prefix,
    remaining
  ) {
    if (
      remaining.length === 0
    ) {
      permutations.push(prefix);
      return;
    }

    remaining.forEach(
      (value, index) => {
        visit(
          [...prefix, value],

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

  return permutations;
}

const PERMUTATIONS =
  permutationsOfFour();

function bestAssignment(
  targets,
  candidates
) {
  let bestPermutation = null;
  let bestCost = Infinity;

  for (
    const permutation of
    PERMUTATIONS
  ) {
    let cost = 0;

    for (
      let index = 0;
      index < 4;
      index += 1
    ) {
      const separation =
        distance(
          targets[index],

          candidates[
            permutation[index]
          ]
        );

      cost +=
        separation *
        separation;
    }

    if (
      cost <
      bestCost
    ) {
      bestCost = cost;

      bestPermutation =
        permutation;
    }
  }

  return {
    permutation:
      bestPermutation,

    ordered:
      bestPermutation.map(
        index =>
          candidates[index]
      ),

    cost:
      bestCost,
  };
}

function branchById(branchId) {
  return (
    MONODROMY_BRANCHES.find(
      branch =>
        branch.id === branchId
    ) ??
    MONODROMY_BRANCHES[0]
  );
}

function polylinePoint(
  points,
  fraction
) {
  if (fraction <= 0) {
    return points[0];
  }

  if (fraction >= 1) {
    return points[
      points.length - 1
    ];
  }

  const lengths = [];
  let totalLength = 0;

  for (
    let index = 0;
    index < points.length - 1;
    index += 1
  ) {
    const segmentLength =
      distance(
        points[index],
        points[index + 1]
      );

    lengths.push(
      segmentLength
    );

    totalLength +=
      segmentLength;
  }

  const target =
    fraction *
    totalLength;

  let accumulated = 0;

  for (
    let index = 0;
    index < lengths.length;
    index += 1
  ) {
    const segmentLength =
      lengths[index];

    if (
      target <=
      accumulated +
      segmentLength
    ) {
      const localFraction =
        segmentLength > 0
          ? (
              target -
              accumulated
            ) /
            segmentLength
          : 0;

      return add(
        points[index],

        scale(
          sub(
            points[index + 1],
            points[index]
          ),
          localFraction
        )
      );
    }

    accumulated +=
      segmentLength;
  }

  return points[
    points.length - 1
  ];
}

function buildStem(
  branch,
  loopRadius
) {
  const center =
    branch.center;

  if (
    branch.id ===
    'plus-real'
  ) {
    const entry =
      add(
        center,
        c(loopRadius)
      );

    return {
      entry,

      points: [
        MONODROMY_BASEPOINT,
        c(4.0),
        entry,
      ],
    };
  }

  if (
    branch.id ===
    'minus-real'
  ) {
    const entry =
      add(
        center,
        c(0, loopRadius)
      );

    return {
      entry,

      points: [
        MONODROMY_BASEPOINT,
        c(3.5, 1.6),
        c(-3.2, 1.6),
        entry,
      ],
    };
  }

  if (
    branch.id ===
    'plus-imaginary'
  ) {
    const entry =
      add(
        center,
        c(0, loopRadius)
      );

    return {
      entry,

      points: [
        MONODROMY_BASEPOINT,
        c(3.5, 1.25),
        c(0.9, 1.25),
        entry,
      ],
    };
  }

  const entry =
    add(
      center,
      c(0, -loopRadius)
    );

  return {
    entry,

    points: [
      MONODROMY_BASEPOINT,
      c(3.5, -1.25),
      c(0.9, -1.25),
      entry,
    ],
  };
}

export function buildParameterPath(
  branchId,
  loopRadius,
  sampleCount = 420
) {
  const branch =
    branchById(branchId);

  const stem =
    buildStem(
      branch,
      loopRadius
    );

  const entryVector =
    sub(
      stem.entry,
      branch.center
    );

  const entryAngle =
    Math.atan2(
      entryVector.im,
      entryVector.re
    );

  const reverseStem =
    [...stem.points].reverse();

  return Array.from(
    {
      length:
        sampleCount + 1,
    },

    (_, index) => {
      const t =
        index /
        sampleCount;

      if (t < 0.28) {
        return polylinePoint(
          stem.points,
          t / 0.28
        );
      }

      if (t < 0.72) {
        const local =
          (
            t -
            0.28
          ) /
          0.44;

        return add(
          branch.center,

          scale(
            expI(
              entryAngle +
              TAU * local
            ),

            loopRadius
          )
        );
      }

      return polylinePoint(
        reverseStem,

        (
          t -
          0.72
        ) /
        0.28
      );
    }
  );
}

function maxResidual(
  roots,
  parameter
) {
  return Math.max(
    ...roots.map(
      root =>
        abs(
          polynomial(
            root,
            parameter
          )
        )
    )
  );
}

function minRootSeparation(
  roots
) {
  let minimum = Infinity;

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
      minimum =
        Math.min(
          minimum,

          distance(
            roots[first],
            roots[second]
          )
        );
    }
  }

  return minimum;
}

/*
 * Transport four already-labelled roots along an arbitrary
 * straight segment in the complex a-plane.
 *
 * The segment is internally subdivided so mouse motion cannot
 * skip across a branch interaction in one large numerical jump.
 *
 * At every substep:
 *
 *   1. predict with dr/da,
 *   2. solve the quartic independently,
 *   3. test all 4! assignments,
 *   4. keep the minimum-cost continuation.
 */
export function transportRootsAlongSegment({
  fromA,
  roots,
  toA,
  maxParameterStep = 0.03,
}) {
  const deltaA =
    sub(
      toA,
      fromA
    );

  const segmentLength =
    abs(deltaA);

  const stepCount =
    Math.max(
      1,
      Math.ceil(
        segmentLength /
        maxParameterStep
      )
    );

  let currentA = {
    re: fromA.re,
    im: fromA.im,
  };

  let currentRoots =
    roots.map(
      root => ({
        re: root.re,
        im: root.im,
      })
    );

  let maximumRootStep = 0;

  let maximumResidual =
    maxResidual(
      currentRoots,
      currentA
    );

  let minimumSeparation =
    minRootSeparation(
      currentRoots
    );

  for (
    let stepIndex = 1;
    stepIndex <= stepCount;
    stepIndex += 1
  ) {
    const fraction =
      stepIndex /
      stepCount;

    const nextA =
      add(
        fromA,
        scale(
          deltaA,
          fraction
        )
      );

    const localDeltaA =
      sub(
        nextA,
        currentA
      );

    const predicted =
      currentRoots.map(
        root => {
          const derivative =
            rootDerivativeWithRespectToA(
              root,
              currentA
            );

          const candidate =
            add(
              root,
              mul(
                derivative,
                localDeltaA
              )
            );

          if (
            Number.isFinite(candidate.re) &&
            Number.isFinite(candidate.im)
          ) {
            return candidate;
          }

          /*
           * Exactly at a collision dr/da is singular.
           * Fall back to the previous point rather than
           * allowing NaN/Infinity into assignment.
           */
          return root;
        }
      );

    const rawRoots =
      solveComplexQuartic(
        nextA
      );

    const assignment =
      bestAssignment(
        predicted,
        rawRoots
      );

    const nextRoots =
      assignment.ordered;

    for (
      let rootIndex = 0;
      rootIndex < 4;
      rootIndex += 1
    ) {
      maximumRootStep =
        Math.max(
          maximumRootStep,
          distance(
            currentRoots[rootIndex],
            nextRoots[rootIndex]
          )
        );
    }

    currentA = nextA;
    currentRoots = nextRoots;

    maximumResidual =
      Math.max(
        maximumResidual,
        maxResidual(
          currentRoots,
          currentA
        )
      );

    minimumSeparation =
      Math.min(
        minimumSeparation,
        minRootSeparation(
          currentRoots
        )
      );
  }

  return {
    a: currentA,
    roots: currentRoots,

    residual:
      maxResidual(
        currentRoots,
        currentA
      ),

    maximumResidual,
    maximumRootStep,

    minimumRootSeparation:
      minimumSeparation,
  };
}


/*
 * Compare transported labels with the original basepoint labels.
 *
 * This does NOT infer a braid. It only asks which original
 * root position each transported label has reached.
 */
export function compareTransportedRoots(
  finalRoots,
  initialRoots
) {
  const assignment =
    bestAssignment(
      finalRoots,
      initialRoots
    );

  let closureError = 0;

  for (
    let index = 0;
    index < 4;
    index += 1
  ) {
    closureError =
      Math.max(
        closureError,
        distance(
          finalRoots[index],
          initialRoots[
            assignment
              .permutation[index]
          ]
        )
      );
  }

  return {
    permutation:
      assignment.permutation,

    closureError,
  };
}


export function buildMonodromyTrajectory({
  branchId = 'plus-real',
  loopRadius = 0.18,
  sampleCount = 420,
} = {}) {
  const parameterPath =
    buildParameterPath(
      branchId,
      loopRadius,
      sampleCount
    );

  const initialRoots =
    labelBaseRoots(
      solveComplexQuartic(
        parameterPath[0]
      )
    );

  const frames = [
    {
      a:
        parameterPath[0],

      roots:
        initialRoots,

      residual:
        maxResidual(
          initialRoots,
          parameterPath[0]
        ),
    },
  ];

  let maximumRootStep = 0;

  let maximumResidual =
    frames[0].residual;

  let minimumRootSeparation =
    minRootSeparation(
      initialRoots
    );

  for (
    let frameIndex = 1;
    frameIndex <
    parameterPath.length;
    frameIndex += 1
  ) {
    const previous =
      frames[
        frameIndex - 1
      ];

    const nextParameter =
      parameterPath[
        frameIndex
      ];

    const deltaA =
      sub(
        nextParameter,
        previous.a
      );

    const predicted =
      previous.roots.map(
        root =>
          add(
            root,

            mul(
              rootDerivativeWithRespectToA(
                root,
                previous.a
              ),

              deltaA
            )
          )
      );

    const rawRoots =
      solveComplexQuartic(
        nextParameter
      );

    const assignment =
      bestAssignment(
        predicted,
        rawRoots
      );

    const transportedRoots =
      assignment.ordered;

    for (
      let rootIndex = 0;
      rootIndex < 4;
      rootIndex += 1
    ) {
      maximumRootStep =
        Math.max(
          maximumRootStep,

          distance(
            transportedRoots[
              rootIndex
            ],

            previous.roots[
              rootIndex
            ]
          )
        );
    }

    const residual =
      maxResidual(
        transportedRoots,
        nextParameter
      );

    maximumResidual =
      Math.max(
        maximumResidual,
        residual
      );

    minimumRootSeparation =
      Math.min(
        minimumRootSeparation,

        minRootSeparation(
          transportedRoots
        )
      );

    frames.push({
      a:
        nextParameter,

      roots:
        transportedRoots,

      residual,
    });
  }

  const finalRoots =
    frames[
      frames.length - 1
    ].roots;

  const closureAssignment =
    bestAssignment(
      finalRoots,
      initialRoots
    );

  let closureError = 0;

  for (
    let index = 0;
    index < 4;
    index += 1
  ) {
    closureError =
      Math.max(
        closureError,

        distance(
          finalRoots[index],

          initialRoots[
            closureAssignment
              .permutation[
                index
              ]
          ]
        )
      );
  }

  return {
    frames,
    initialRoots,

    finalPermutation:
      closureAssignment
        .permutation,

    closureError,
    maximumResidual,
    maximumRootStep,
    minimumRootSeparation,
  };
}

export function permutationCycleNotation(
  permutation
) {
  const visited =
    [
      false,
      false,
      false,
      false,
    ];

  const cycles = [];

  for (
    let start = 0;
    start < 4;
    start += 1
  ) {
    if (
      visited[start] ||
      permutation[start] ===
        start
    ) {
      visited[start] = true;
      continue;
    }

    const cycle = [];
    let current = start;

    while (
      !visited[current]
    ) {
      visited[current] = true;
      cycle.push(current + 1);

      current =
        permutation[current];
    }

    if (
      cycle.length > 1
    ) {
      cycles.push(
        `(${cycle.join('')})`
      );
    }
  }

  return (
    cycles.length > 0
      ? cycles.join('')
      : 'id'
  );
}

export function formatComplex(
  value,
  digits = 8
) {
  const clean =
    number =>
      Math.abs(number) <
      5e-13
        ? 0
        : number;

  const re =
    clean(value.re);

  const im =
    clean(value.im);

  if (im === 0) {
    return Number(
      re.toPrecision(digits)
    ).toString();
  }

  const sign =
    im >= 0
      ? '+'
      : '−';

  return (
    `${Number(
      re.toPrecision(digits)
    )} ` +
    `${sign} ` +
    `${Number(
      Math.abs(im)
        .toPrecision(digits)
    )}i`
  );
}
