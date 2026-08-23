import {
  DEFAULT_FIGURE_EIGHT_S3_GEOMETRY,
  DEFAULT_FIGURE_EIGHT_S3_NU,
  FIGURE_EIGHT_S3_STANDARD_PROJECTION,
  FIGURE_EIGHT_S3_SYMMETRIC_PROJECTION,
  figureEightS3CenterlinePoint,
  rotateFigureEightS3MixedPlanes,
  stereographicFigureEightS3Point,
} from "./figureEightS3Geometry";


const CONTACT_EPSILON = 1e-7;
const TUBE_EPSILON = 1e-7;
const TINY = 1e-18;


function sub3(a, b) {
  return [
    a[0] - b[0],
    a[1] - b[1],
    a[2] - b[2],
  ];
}


function addScaled3(
  point,
  direction,
  amount
) {
  return [
    point[0] +
      direction[0] * amount,

    point[1] +
      direction[1] * amount,

    point[2] +
      direction[2] * amount,
  ];
}


function dot3(a, b) {
  return (
    a[0] * b[0] +
    a[1] * b[1] +
    a[2] * b[2]
  );
}


function distanceSquared3(a, b) {
  const d =
    sub3(
      a,
      b
    );

  return dot3(
    d,
    d
  );
}


function segmentSegmentDistanceSquared(
  p1,
  q1,
  p2,
  q2
) {
  const u = sub3(q1, p1);
  const v = sub3(q2, p2);
  const w = sub3(p1, p2);

  const a = dot3(u, u);
  const b = dot3(u, v);
  const c = dot3(v, v);
  const d = dot3(u, w);
  const e = dot3(v, w);

  const denominator =
    a * c - b * b;

  let sn;
  let sd = denominator;

  let tn;
  let td = denominator;

  if (denominator < TINY) {
    sn = 0;
    sd = 1;

    tn = e;
    td = c;
  } else {
    sn =
      b * e -
      c * d;

    tn =
      a * e -
      b * d;

    if (sn < 0) {
      sn = 0;

      tn = e;
      td = c;
    } else if (sn > sd) {
      sn = sd;

      tn =
        e + b;

      td = c;
    }
  }

  if (tn < 0) {
    tn = 0;

    if (-d < 0) {
      sn = 0;
    } else if (-d > a) {
      sn = sd;
    } else {
      sn = -d;
      sd = a;
    }
  } else if (tn > td) {
    tn = td;

    if (
      -d + b <
      0
    ) {
      sn = 0;
    } else if (
      -d + b >
      a
    ) {
      sn = sd;
    } else {
      sn =
        -d + b;

      sd = a;
    }
  }

  const s =
    Math.abs(sn) < TINY
      ? 0
      : sn / sd;

  const t =
    Math.abs(tn) < TINY
      ? 0
      : tn / td;

  return distanceSquared3(
    addScaled3(
      p1,
      u,
      s
    ),

    addScaled3(
      p2,
      v,
      t
    )
  );
}


function pointTriangleDistanceSquared(
  point,
  a,
  b,
  c
) {
  const ab =
    sub3(
      b,
      a
    );

  const ac =
    sub3(
      c,
      a
    );

  const ap =
    sub3(
      point,
      a
    );

  const d1 =
    dot3(
      ab,
      ap
    );

  const d2 =
    dot3(
      ac,
      ap
    );

  if (
    d1 <= 0 &&
    d2 <= 0
  ) {
    return distanceSquared3(
      point,
      a
    );
  }

  const bp =
    sub3(
      point,
      b
    );

  const d3 =
    dot3(
      ab,
      bp
    );

  const d4 =
    dot3(
      ac,
      bp
    );

  if (
    d3 >= 0 &&
    d4 <= d3
  ) {
    return distanceSquared3(
      point,
      b
    );
  }

  const vc =
    d1 * d4 -
    d3 * d2;

  if (
    vc <= 0 &&
    d1 >= 0 &&
    d3 <= 0
  ) {
    const t =
      d1 /
      (
        d1 - d3
      );

    return distanceSquared3(
      point,

      addScaled3(
        a,
        ab,
        t
      )
    );
  }

  const cp =
    sub3(
      point,
      c
    );

  const d5 =
    dot3(
      ab,
      cp
    );

  const d6 =
    dot3(
      ac,
      cp
    );

  if (
    d6 >= 0 &&
    d5 <= d6
  ) {
    return distanceSquared3(
      point,
      c
    );
  }

  const vb =
    d5 * d2 -
    d1 * d6;

  if (
    vb <= 0 &&
    d2 >= 0 &&
    d6 <= 0
  ) {
    const t =
      d2 /
      (
        d2 - d6
      );

    return distanceSquared3(
      point,

      addScaled3(
        a,
        ac,
        t
      )
    );
  }

  const va =
    d3 * d6 -
    d5 * d4;

  if (
    va <= 0 &&
    d4 - d3 >= 0 &&
    d5 - d6 >= 0
  ) {
    const bc =
      sub3(
        c,
        b
      );

    const t =
      (
        d4 - d3
      ) /
      (
        (
          d4 - d3
        ) +
        (
          d5 - d6
        )
      );

    return distanceSquared3(
      point,

      addScaled3(
        b,
        bc,
        t
      )
    );
  }

  const denominator =
    1 /
    (
      va +
      vb +
      vc
    );

  const v =
    vb *
    denominator;

  const w =
    vc *
    denominator;

  const closest = [
    a[0] +
      ab[0] * v +
      ac[0] * w,

    a[1] +
      ab[1] * v +
      ac[1] * w,

    a[2] +
      ab[2] * v +
      ac[2] * w,
  ];

  return distanceSquared3(
    point,
    closest
  );
}


function triangleTriangleDistanceSquared(
  first,
  second
) {
  let minimum =
    Infinity;

  first.forEach(
    (point) => {
      minimum =
        Math.min(
          minimum,

          pointTriangleDistanceSquared(
            point,
            second[0],
            second[1],
            second[2]
          )
        );
    }
  );

  second.forEach(
    (point) => {
      minimum =
        Math.min(
          minimum,

          pointTriangleDistanceSquared(
            point,
            first[0],
            first[1],
            first[2]
          )
        );
    }
  );

  const edges = [
    [0, 1],
    [1, 2],
    [2, 0],
  ];

  edges.forEach(
    (
      [
        a0,
        a1,
      ]
    ) => {
      edges.forEach(
        (
          [
            b0,
            b1,
          ]
        ) => {
          minimum =
            Math.min(
              minimum,

              segmentSegmentDistanceSquared(
                first[a0],
                first[a1],
                second[b0],
                second[b1]
              )
            );
        }
      );
    }
  );

  return minimum;
}


function nativePoint4(point) {
  if (
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
  ) {
    return null;
  }

  const length =
    Math.hypot(
      point.x,
      point.y,
      point.z,
      point.w
    );

  if (
    length <=
    TINY
  ) {
    return null;
  }

  return [
    point.x / length,
    point.y / length,
    point.z / length,
    point.w / length,
  ];
}


function projectionDenominator(
  point4,
  projection
) {
  const rotated =
    rotateFigureEightS3MixedPlanes(
      point4[0],
      point4[1],
      point4[2],
      point4[3],
      projection
    );

  return (
    1 -
    rotated[3]
  );
}


function chooseAuditProjection(
  nativePointByVertexIndex
) {
  const candidates = [
    {
      id:
        "standard",

      projection:
        FIGURE_EIGHT_S3_STANDARD_PROJECTION,
    },

    {
      id:
        "symmetric",

      projection:
        FIGURE_EIGHT_S3_SYMMETRIC_PROJECTION,
    },
  ];

  let best = null;

  candidates.forEach(
    (candidate) => {
      let minimumDenominator =
        Infinity;

      nativePointByVertexIndex.forEach(
        (point4) => {
          minimumDenominator =
            Math.min(
              minimumDenominator,

              Math.abs(
                projectionDenominator(
                  point4,
                  candidate.projection
                )
              )
            );
        }
      );

      if (
        !best ||
        minimumDenominator >
          best.minimumDenominator
      ) {
        best = {
          ...candidate,

          minimumDenominator,
        };
      }
    }
  );

  return best;
}


function wrapUnit(value) {
  return (
    (
      value %
      1
    ) +
    1
  ) %
    1;
}


function maximumCenterlineDot(
  point4
) {
  const {
    lambda,
    epsilon,
  } =
    DEFAULT_FIGURE_EIGHT_S3_GEOMETRY;

  function valueAt(
    routeAmount
  ) {
    const center =
      figureEightS3CenterlinePoint(
        wrapUnit(
          routeAmount
        ) *
          Math.PI *
          2,

        lambda,
        epsilon
      );

    return (
      point4[0] *
        center[0] +
      point4[1] *
        center[1] +
      point4[2] *
        center[2] +
      point4[3] *
        center[3]
    );
  }

  let bestIndex =
    0;

  let bestValue =
    -Infinity;

  for (
    let index = 0;
    index <
      DEFAULT_FIGURE_EIGHT_S3_NU;
    index += 1
  ) {
    const value =
      valueAt(
        index /
          DEFAULT_FIGURE_EIGHT_S3_NU
      );

    if (
      value >
      bestValue
    ) {
      bestValue =
        value;

      bestIndex =
        index;
    }
  }

  let left =
    (
      bestIndex -
      1
    ) /
    DEFAULT_FIGURE_EIGHT_S3_NU;

  let right =
    (
      bestIndex +
      1
    ) /
    DEFAULT_FIGURE_EIGHT_S3_NU;

  const inversePhi =
    (
      Math.sqrt(5) -
      1
    ) /
    2;

  let first =
    right -
    inversePhi *
      (
        right -
        left
      );

  let second =
    left +
    inversePhi *
      (
        right -
        left
      );

  let firstValue =
    valueAt(
      first
    );

  let secondValue =
    valueAt(
      second
    );

  for (
    let iteration = 0;
    iteration < 36;
    iteration += 1
  ) {
    if (
      firstValue <
      secondValue
    ) {
      left =
        first;

      first =
        second;

      firstValue =
        secondValue;

      second =
        left +
        inversePhi *
          (
            right -
            left
          );

      secondValue =
        valueAt(
          second
        );
    } else {
      right =
        second;

      second =
        first;

      secondValue =
        firstValue;

      first =
        right -
        inversePhi *
          (
            right -
            left
          );

      firstValue =
        valueAt(
          first
        );
    }
  }

  return Math.max(
    bestValue,
    firstValue,
    secondValue
  );
}


export function auditCanonicalABInterfaceEmbedding(
  diagnostic
) {
  if (
    !diagnostic?.ready ||
    !Array.isArray(
      diagnostic.positions
    ) ||
    !Array.isArray(
      diagnostic.triangles
    )
  ) {
    return {
      ready:
        false,

      reason:
        "canonical-a-b-interface-not-ready",
    };
  }

  const interfaceVertexIndices = [
    ...new Set(
      diagnostic
        .triangles
        .flatMap(
          (triangle) =>
            triangle
              .quotientVertexIndices
        )
    ),
  ];

  const nativePointByVertexIndex =
    new Map();

  interfaceVertexIndices.forEach(
    (vertexIndex) => {
      const point4 =
        nativePoint4(
          diagnostic
            .positions[
              vertexIndex
            ]
        );

      if (point4) {
        nativePointByVertexIndex.set(
          vertexIndex,
          point4
        );
      }
    }
  );

  if (
    nativePointByVertexIndex
      .size !==
    interfaceVertexIndices
      .length
  ) {
    return {
      ready:
        false,

      reason:
        "canonical-a-b-interface-position-invalid",
    };
  }

  const auditProjection =
    chooseAuditProjection(
      nativePointByVertexIndex
    );

  const projectedPointByVertexIndex =
    new Map();

  nativePointByVertexIndex.forEach(
    (
      point4,
      vertexIndex
    ) => {
      projectedPointByVertexIndex.set(
        vertexIndex,

        stereographicFigureEightS3Point(
          point4,
          auditProjection
            .projection
        )
      );
    }
  );

  const triangleRecords =
    diagnostic
      .triangles
      .map(
        (triangle) => ({
          ...triangle,

          points:
            triangle
              .quotientVertexIndices
              .map(
                (vertexIndex) =>
                  projectedPointByVertexIndex
                    .get(
                      vertexIndex
                    )
              ),
        })
      );

  const pairContactMatrix =
    Array.from(
      {
        length:
          4,
      },

      () => [
        0,
        0,
        0,
        0,
      ]
    );

  const contactTriangleKeys =
    new Set();

  const contactExamples =
    [];

  let testedNonAdjacentTrianglePairCount =
    0;

  let selfIntersectionCount =
    0;

  let sameSheetSelfIntersectionCount =
    0;

  let crossSheetIntersectionCount =
    0;

  let minimumNonAdjacentTriangleDistance =
    Infinity;

  const contactEpsilonSquared =
    CONTACT_EPSILON *
    CONTACT_EPSILON;

  for (
    let firstIndex = 0;
    firstIndex <
      triangleRecords.length;
    firstIndex += 1
  ) {
    const first =
      triangleRecords[
        firstIndex
      ];

    const firstVertexSet =
      new Set(
        first
          .quotientVertexIndices
      );

    for (
      let secondIndex =
        firstIndex + 1;
      secondIndex <
        triangleRecords.length;
      secondIndex += 1
    ) {
      const second =
        triangleRecords[
          secondIndex
        ];

      /*
       * Shared certified vertices/edges are legitimate
       * sheet adjacency, not self-intersection.
       */
      if (
        second
          .quotientVertexIndices
          .some(
            (vertexIndex) =>
              firstVertexSet
                .has(
                  vertexIndex
                )
          )
      ) {
        continue;
      }

      testedNonAdjacentTrianglePairCount +=
        1;

      const distanceSquared =
        triangleTriangleDistanceSquared(
          first.points,
          second.points
        );

      const distance =
        Math.sqrt(
          Math.max(
            0,
            distanceSquared
          )
        );

      minimumNonAdjacentTriangleDistance =
        Math.min(
          minimumNonAdjacentTriangleDistance,
          distance
        );

      if (
        distanceSquared >
        contactEpsilonSquared
      ) {
        continue;
      }

      selfIntersectionCount +=
        1;

      if (
        first.pairId ===
        second.pairId
      ) {
        sameSheetSelfIntersectionCount +=
          1;
      } else {
        crossSheetIntersectionCount +=
          1;
      }

      const low =
        Math.min(
          first.pairId,
          second.pairId
        );

      const high =
        Math.max(
          first.pairId,
          second.pairId
        );

      pairContactMatrix[
        low
      ][
        high
      ] +=
        1;

      contactTriangleKeys.add(
        first.key
      );

      contactTriangleKeys.add(
        second.key
      );

      if (
        contactExamples.length <
        24
      ) {
        contactExamples.push({
          firstKey:
            first.key,

          firstPairId:
            first.pairId,

          secondKey:
            second.key,

          secondPairId:
            second.pairId,

          distance,
        });
      }
    }
  }

  const boundaryVertexSet =
    new Set(
      diagnostic
        .cuspBoundaryVertexIndices ??
      []
    );

  const rho =
    DEFAULT_FIGURE_EIGHT_S3_GEOMETRY
      .rho;

  let cuspBoundaryInterfaceVertexCount =
    0;

  let interiorInterfaceVertexCount =
    0;

  let interiorVertexInsideTubeCount =
    0;

  let minimumInteriorTubeClearance =
    Infinity;

  let maximumBoundaryTubeError =
    0;

  const tubeViolationExamples =
    [];

  interfaceVertexIndices.forEach(
    (vertexIndex) => {
      const point4 =
        nativePointByVertexIndex
          .get(
            vertexIndex
          );

      const maximumDot =
        Math.max(
          -1,

          Math.min(
            1,

            maximumCenterlineDot(
              point4
            )
          )
        );

      /*
       * On the unit S³:
       *
       * dot(p,c) = cos(distance(p,c)).
       *
       * The removed knot tube has geodesic radius rho.
       */
      const coreDistance =
        Math.acos(
          maximumDot
        );

      const clearance =
        coreDistance -
        rho;

      if (
        boundaryVertexSet.has(
          vertexIndex
        )
      ) {
        cuspBoundaryInterfaceVertexCount +=
          1;

        maximumBoundaryTubeError =
          Math.max(
            maximumBoundaryTubeError,
            Math.abs(
              clearance
            )
          );

        return;
      }

      interiorInterfaceVertexCount +=
        1;

      minimumInteriorTubeClearance =
        Math.min(
          minimumInteriorTubeClearance,
          clearance
        );

      if (
        clearance <
        -TUBE_EPSILON
      ) {
        interiorVertexInsideTubeCount +=
          1;

        if (
          tubeViolationExamples
            .length <
          24
        ) {
          tubeViolationExamples.push({
            vertexIndex,
            coreDistance,
            rho,
            clearance,
          });
        }
      }
    }
  );

  return {
    ready:
      true,

    contactExamples,
    tubeViolationExamples,

    contactTriangleKeys: [
      ...contactTriangleKeys,
    ],

    summary: {
      triangleCount:
        triangleRecords.length,

      interfaceVertexCount:
        interfaceVertexIndices.length,

      projectionKind:
        auditProjection.id,

      minimumProjectionDenominator:
        auditProjection
          .minimumDenominator,

      testedNonAdjacentTrianglePairCount,

      selfIntersectionCount,

      sameSheetSelfIntersectionCount,

      crossSheetIntersectionCount,

      pairContactMatrix,

      contactTriangleCount:
        contactTriangleKeys.size,

      minimumNonAdjacentTriangleDistance:
        Number.isFinite(
          minimumNonAdjacentTriangleDistance
        )
          ? minimumNonAdjacentTriangleDistance
          : null,

      cuspBoundaryInterfaceVertexCount,

      interiorInterfaceVertexCount,

      interiorVertexInsideTubeCount,

      minimumInteriorTubeClearance:
        Number.isFinite(
          minimumInteriorTubeClearance
        )
          ? minimumInteriorTubeClearance
          : null,

      maximumBoundaryTubeError,

      vertexAndSelfIntersectionClean:
        selfIntersectionCount ===
          0 &&
        interiorVertexInsideTubeCount ===
          0,

      /*
       * Deliberately false.
       *
       * We are not inventing arbitrary interior samples
       * inside the exact source triangles.
       */
      triangleInteriorTubeAuditComplete:
        false,
    },
  };
}
