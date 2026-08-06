const GEOMETRY_EPSILON = 1e-7;
const COPLANAR_EPSILON = 1e-5;

function subtract(a, b) {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z,
  };
}

function add(a, b) {
  return {
    x: a.x + b.x,
    y: a.y + b.y,
    z: a.z + b.z,
  };
}

function scale(point, factor) {
  return {
    x: point.x * factor,
    y: point.y * factor,
    z: point.z * factor,
  };
}

function dot(a, b) {
  return (
    a.x * b.x +
    a.y * b.y +
    a.z * b.z
  );
}

function cross(a, b) {
  return {
    x:
      a.y * b.z -
      a.z * b.y,
    y:
      a.z * b.x -
      a.x * b.z,
    z:
      a.x * b.y -
      a.y * b.x,
  };
}

function length(point) {
  return Math.hypot(
    point.x,
    point.y,
    point.z
  );
}

function distance(a, b) {
  return length(
    subtract(a, b)
  );
}

function triangleRecord(
  tetrahedronId,
  triangle,
  positions
) {
  return {
    id:
      `${tetrahedronId}:` +
      triangle.id,
    tetrahedronId,
    faceId: triangle.faceId,
    kind: triangle.kind,
    pairId:
      triangle.pairId ?? null,
    vertexIndices: [
      ...triangle.vertexIndices,
    ],
    points:
      triangle.vertexIndices.map(
        (index) =>
          positions[
            tetrahedronId
          ][index]
      ),
  };
}

function worldTriangles(
  positions,
  meshes
) {
  return ["A", "B"].flatMap(
    (tetrahedronId) =>
      meshes[
        tetrahedronId
      ].triangles.map(
        (triangle) =>
          triangleRecord(
            tetrahedronId,
            triangle,
            positions
          )
      )
  );
}

function globalVertexIndices(
  triangle,
  countA
) {
  const offset =
    triangle.tetrahedronId === "A"
      ? 0
      : countA;

  return triangle.vertexIndices.map(
    (index) =>
      offset + index
  );
}

function lockedGroupMap(
  lockedGroups
) {
  const result = new Map();

  lockedGroups.forEach(
    (group, groupIndex) => {
      group.forEach(
        (vertexIndex) =>
          result.set(
            vertexIndex,
            groupIndex
          )
      );
    }
  );

  return result;
}

function sharesLocalVertex(
  first,
  second
) {
  return (
    first.tetrahedronId ===
      second.tetrahedronId &&
    first.vertexIndices.some(
      (index) =>
        second.vertexIndices.includes(
          index
        )
    )
  );
}

function sharesLockedVertex(
  first,
  second,
  groupByVertex,
  countA
) {
  const firstGroups =
    new Set(
      globalVertexIndices(
        first,
        countA
      )
        .map(
          (index) =>
            groupByVertex.get(index)
        )
        .filter(
          (group) =>
            group !== undefined
        )
    );

  return globalVertexIndices(
    second,
    countA
  ).some((index) => {
    const group =
      groupByVertex.get(index);

    return (
      group !== undefined &&
      firstGroups.has(group)
    );
  });
}

function isAllowedFaceContact(
  first,
  second,
  pairStrengths,
  epsilon
) {
  return (
    first.tetrahedronId !==
      second.tetrahedronId &&
    first.kind === "large" &&
    second.kind === "large" &&
    first.pairId !== null &&
    first.pairId ===
      second.pairId &&
    pairStrengths[
      first.pairId
    ] > epsilon
  );
}

function bounds(points) {
  return points.reduce(
    (result, point) => ({
      minX: Math.min(
        result.minX,
        point.x
      ),
      maxX: Math.max(
        result.maxX,
        point.x
      ),
      minY: Math.min(
        result.minY,
        point.y
      ),
      maxY: Math.max(
        result.maxY,
        point.y
      ),
      minZ: Math.min(
        result.minZ,
        point.z
      ),
      maxZ: Math.max(
        result.maxZ,
        point.z
      ),
    }),
    {
      minX: Infinity,
      maxX: -Infinity,
      minY: Infinity,
      maxY: -Infinity,
      minZ: Infinity,
      maxZ: -Infinity,
    }
  );
}

function boundsOverlap(
  first,
  second,
  margin = 0
) {
  const a = bounds(first);
  const b = bounds(second);

  return !(
    a.maxX + margin < b.minX ||
    b.maxX + margin < a.minX ||
    a.maxY + margin < b.minY ||
    b.maxY + margin < a.minY ||
    a.maxZ + margin < b.minZ ||
    b.maxZ + margin < a.minZ
  );
}

function segmentIntersectsTriangle(
  start,
  end,
  triangle
) {
  const direction =
    subtract(end, start);

  const edgeOne =
    subtract(
      triangle[1],
      triangle[0]
    );

  const edgeTwo =
    subtract(
      triangle[2],
      triangle[0]
    );

  const perpendicular =
    cross(
      direction,
      edgeTwo
    );

  const determinant =
    dot(
      edgeOne,
      perpendicular
    );

  if (
    Math.abs(determinant) <
    GEOMETRY_EPSILON
  ) {
    return false;
  }

  const inverse =
    1 / determinant;

  const fromTriangle =
    subtract(
      start,
      triangle[0]
    );

  const u =
    inverse *
    dot(
      fromTriangle,
      perpendicular
    );

  if (
    u < -GEOMETRY_EPSILON ||
    u > 1 + GEOMETRY_EPSILON
  ) {
    return false;
  }

  const q =
    cross(
      fromTriangle,
      edgeOne
    );

  const v =
    inverse *
    dot(direction, q);

  if (
    v < -GEOMETRY_EPSILON ||
    u + v >
      1 + GEOMETRY_EPSILON
  ) {
    return false;
  }

  const along =
    inverse *
    dot(edgeTwo, q);

  return (
    along >=
      -GEOMETRY_EPSILON &&
    along <=
      1 + GEOMETRY_EPSILON
  );
}

function dominantAxis(normal) {
  const x =
    Math.abs(normal.x);

  const y =
    Math.abs(normal.y);

  const z =
    Math.abs(normal.z);

  if (
    x >= y &&
    x >= z
  ) {
    return "x";
  }

  if (y >= z) {
    return "y";
  }

  return "z";
}

function project2D(
  point,
  droppedAxis
) {
  if (droppedAxis === "x") {
    return {
      x: point.y,
      y: point.z,
    };
  }

  if (droppedAxis === "y") {
    return {
      x: point.x,
      y: point.z,
    };
  }

  return {
    x: point.x,
    y: point.y,
  };
}

function orientation2D(
  a,
  b,
  c
) {
  return (
    (b.x - a.x) *
      (c.y - a.y) -
    (b.y - a.y) *
      (c.x - a.x)
  );
}

function pointOnSegment2D(
  point,
  start,
  end
) {
  return (
    Math.abs(
      orientation2D(
        start,
        end,
        point
      )
    ) <=
      COPLANAR_EPSILON &&
    point.x >=
      Math.min(
        start.x,
        end.x
      ) -
        COPLANAR_EPSILON &&
    point.x <=
      Math.max(
        start.x,
        end.x
      ) +
        COPLANAR_EPSILON &&
    point.y >=
      Math.min(
        start.y,
        end.y
      ) -
        COPLANAR_EPSILON &&
    point.y <=
      Math.max(
        start.y,
        end.y
      ) +
        COPLANAR_EPSILON
  );
}

function segmentsIntersect2D(
  a,
  b,
  c,
  d
) {
  const abC =
    orientation2D(a, b, c);

  const abD =
    orientation2D(a, b, d);

  const cdA =
    orientation2D(c, d, a);

  const cdB =
    orientation2D(c, d, b);

  const crossesAB =
    (
      abC >
        COPLANAR_EPSILON &&
      abD <
        -COPLANAR_EPSILON
    ) ||
    (
      abC <
        -COPLANAR_EPSILON &&
      abD >
        COPLANAR_EPSILON
    );

  const crossesCD =
    (
      cdA >
        COPLANAR_EPSILON &&
      cdB <
        -COPLANAR_EPSILON
    ) ||
    (
      cdA <
        -COPLANAR_EPSILON &&
      cdB >
        COPLANAR_EPSILON
    );

  return (
    (
      crossesAB &&
      crossesCD
    ) ||
    pointOnSegment2D(
      c,
      a,
      b
    ) ||
    pointOnSegment2D(
      d,
      a,
      b
    ) ||
    pointOnSegment2D(
      a,
      c,
      d
    ) ||
    pointOnSegment2D(
      b,
      c,
      d
    )
  );
}

function pointInTriangle2D(
  point,
  triangle
) {
  const signs = [
    orientation2D(
      triangle[0],
      triangle[1],
      point
    ),
    orientation2D(
      triangle[1],
      triangle[2],
      point
    ),
    orientation2D(
      triangle[2],
      triangle[0],
      point
    ),
  ];

  const positive =
    signs.some(
      (value) =>
        value >
        COPLANAR_EPSILON
    );

  const negative =
    signs.some(
      (value) =>
        value <
        -COPLANAR_EPSILON
    );

  return !(
    positive &&
    negative
  );
}

function coplanarTrianglesIntersect(
  first,
  second,
  normal
) {
  const axis =
    dominantAxis(normal);

  const a =
    first.map(
      (point) =>
        project2D(
          point,
          axis
        )
    );

  const b =
    second.map(
      (point) =>
        project2D(
          point,
          axis
        )
    );

  const edges = [
    [0, 1],
    [1, 2],
    [2, 0],
  ];

  const edgeIntersection =
    edges.some(
      ([a0, a1]) =>
        edges.some(
          ([b0, b1]) =>
            segmentsIntersect2D(
              a[a0],
              a[a1],
              b[b0],
              b[b1]
            )
        )
    );

  return (
    edgeIntersection ||
    pointInTriangle2D(
      a[0],
      b
    ) ||
    pointInTriangle2D(
      b[0],
      a
    )
  );
}

function trianglesIntersect(
  first,
  second
) {
  if (
    !boundsOverlap(
      first,
      second,
      GEOMETRY_EPSILON
    )
  ) {
    return false;
  }

  const firstNormal =
    cross(
      subtract(
        first[1],
        first[0]
      ),
      subtract(
        first[2],
        first[0]
      )
    );

  const secondNormal =
    cross(
      subtract(
        second[1],
        second[0]
      ),
      subtract(
        second[2],
        second[0]
      )
    );

  const firstLength =
    length(firstNormal);

  const secondLength =
    length(secondNormal);

  if (
    firstLength <
      GEOMETRY_EPSILON ||
    secondLength <
      GEOMETRY_EPSILON
  ) {
    return false;
  }

  const parallel =
    length(
      cross(
        firstNormal,
        secondNormal
      )
    ) <=
    COPLANAR_EPSILON *
      firstLength *
      secondLength;

  const planeDistance =
    Math.abs(
      dot(
        firstNormal,
        subtract(
          second[0],
          first[0]
        )
      )
    ) /
    firstLength;

  if (
    parallel &&
    planeDistance <=
      COPLANAR_EPSILON
  ) {
    return (
      coplanarTrianglesIntersect(
        first,
        second,
        firstNormal
      )
    );
  }

  const edges = [
    [0, 1],
    [1, 2],
    [2, 0],
  ];

  return (
    edges.some(
      ([start, end]) =>
        segmentIntersectsTriangle(
          first[start],
          first[end],
          second
        )
    ) ||
    edges.some(
      ([start, end]) =>
        segmentIntersectsTriangle(
          second[start],
          second[end],
          first
        )
    )
  );
}

function closestPointOnTriangle(
  point,
  a,
  b,
  c
) {
  const ab =
    subtract(b, a);

  const ac =
    subtract(c, a);

  const ap =
    subtract(point, a);

  const d1 =
    dot(ab, ap);

  const d2 =
    dot(ac, ap);

  if (
    d1 <= 0 &&
    d2 <= 0
  ) {
    return a;
  }

  const bp =
    subtract(point, b);

  const d3 =
    dot(ab, bp);

  const d4 =
    dot(ac, bp);

  if (
    d3 >= 0 &&
    d4 <= d3
  ) {
    return b;
  }

  const vc =
    d1 * d4 -
    d3 * d2;

  if (
    vc <= 0 &&
    d1 >= 0 &&
    d3 <= 0
  ) {
    return add(
      a,
      scale(
        ab,
        d1 /
          (d1 - d3)
      )
    );
  }

  const cp =
    subtract(point, c);

  const d5 =
    dot(ab, cp);

  const d6 =
    dot(ac, cp);

  if (
    d6 >= 0 &&
    d5 <= d6
  ) {
    return c;
  }

  const vb =
    d5 * d2 -
    d1 * d6;

  if (
    vb <= 0 &&
    d2 >= 0 &&
    d6 <= 0
  ) {
    return add(
      a,
      scale(
        ac,
        d2 /
          (d2 - d6)
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
    const amount =
      (d4 - d3) /
      (
        d4 - d3 +
        d5 - d6
      );

    return add(
      b,
      scale(
        subtract(c, b),
        amount
      )
    );
  }

  const denominator =
    1 /
    (va + vb + vc);

  return add(
    a,
    add(
      scale(
        ab,
        vb * denominator
      ),
      scale(
        ac,
        vc * denominator
      )
    )
  );
}

function pointTriangleDistance(
  point,
  triangle
) {
  return distance(
    point,
    closestPointOnTriangle(
      point,
      triangle[0],
      triangle[1],
      triangle[2]
    )
  );
}

function segmentSegmentDistance(
  a0,
  a1,
  b0,
  b1
) {
  const u =
    subtract(a1, a0);

  const v =
    subtract(b1, b0);

  const w =
    subtract(a0, b0);

  const a =
    dot(u, u);

  const b =
    dot(u, v);

  const c =
    dot(v, v);

  const d =
    dot(u, w);

  const e =
    dot(v, w);

  const denominator =
    a * c -
    b * b;

  let s = 0;
  let t = 0;

  if (
    a <= GEOMETRY_EPSILON &&
    c <= GEOMETRY_EPSILON
  ) {
    return distance(a0, b0);
  }

  if (
    a <= GEOMETRY_EPSILON
  ) {
    t = Math.max(
      0,
      Math.min(
        1,
        e / c
      )
    );
  } else if (
    c <= GEOMETRY_EPSILON
  ) {
    s = Math.max(
      0,
      Math.min(
        1,
        -d / a
      )
    );
  } else {
    s =
      denominator !== 0
        ? Math.max(
            0,
            Math.min(
              1,
              (
                b * e -
                c * d
              ) /
                denominator
            )
          )
        : 0;

    t =
      (
        b * s +
        e
      ) /
      c;

    if (t < 0) {
      t = 0;

      s = Math.max(
        0,
        Math.min(
          1,
          -d / a
        )
      );
    } else if (t > 1) {
      t = 1;

      s = Math.max(
        0,
        Math.min(
          1,
          (b - d) / a
        )
      );
    }
  }

  return distance(
    add(
      a0,
      scale(u, s)
    ),
    add(
      b0,
      scale(v, t)
    )
  );
}

function triangleDistance(
  first,
  second
) {
  let minimum = Infinity;

  first.forEach((point) => {
    minimum = Math.min(
      minimum,
      pointTriangleDistance(
        point,
        second
      )
    );
  });

  second.forEach((point) => {
    minimum = Math.min(
      minimum,
      pointTriangleDistance(
        point,
        first
      )
    );
  });

  const edges = [
    [0, 1],
    [1, 2],
    [2, 0],
  ];

  edges.forEach(
    ([a0, a1]) => {
      edges.forEach(
        ([b0, b1]) => {
          minimum = Math.min(
            minimum,
            segmentSegmentDistance(
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


function normalize(point) {
  const magnitude =
    length(point);

  if (
    magnitude <
    GEOMETRY_EPSILON
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

function triangleCentroid(
  triangle
) {
  return scale(
    add(
      triangle[0],
      add(
        triangle[1],
        triangle[2]
      )
    ),
    1 / 3
  );
}

function barycentricCoordinates(
  point,
  triangle
) {
  const a = triangle[0];
  const b = triangle[1];
  const c = triangle[2];

  const first =
    subtract(b, a);

  const second =
    subtract(c, a);

  const local =
    subtract(point, a);

  const d00 =
    dot(first, first);

  const d01 =
    dot(first, second);

  const d11 =
    dot(second, second);

  const d20 =
    dot(local, first);

  const d21 =
    dot(local, second);

  const denominator =
    d00 * d11 -
    d01 * d01;

  if (
    Math.abs(denominator) <
    GEOMETRY_EPSILON
  ) {
    return [
      1 / 3,
      1 / 3,
      1 / 3,
    ];
  }

  const secondWeight =
    (
      d11 * d20 -
      d01 * d21
    ) /
    denominator;

  const thirdWeight =
    (
      d00 * d21 -
      d01 * d20
    ) /
    denominator;

  const firstWeight =
    1 -
    secondWeight -
    thirdWeight;

  return [
    firstWeight,
    secondWeight,
    thirdWeight,
  ].map(
    (value) =>
      Math.max(
        0,
        Math.min(1, value)
      )
  );
}

function segmentSegmentWitness(
  a0,
  a1,
  b0,
  b1
) {
  const u =
    subtract(a1, a0);

  const v =
    subtract(b1, b0);

  const w =
    subtract(a0, b0);

  const a =
    dot(u, u);

  const b =
    dot(u, v);

  const c =
    dot(v, v);

  const d =
    dot(u, w);

  const e =
    dot(v, w);

  const denominator =
    a * c -
    b * b;

  let s = 0;
  let t = 0;

  if (
    a <= GEOMETRY_EPSILON &&
    c <= GEOMETRY_EPSILON
  ) {
    return {
      pointFirst: a0,
      pointSecond: b0,
      firstAmount: 0,
      secondAmount: 0,
      distance:
        distance(a0, b0),
    };
  }

  if (
    a <= GEOMETRY_EPSILON
  ) {
    t = Math.max(
      0,
      Math.min(
        1,
        e / c
      )
    );
  } else if (
    c <= GEOMETRY_EPSILON
  ) {
    s = Math.max(
      0,
      Math.min(
        1,
        -d / a
      )
    );
  } else {
    s =
      Math.abs(denominator) >
        GEOMETRY_EPSILON
        ? Math.max(
            0,
            Math.min(
              1,
              (
                b * e -
                c * d
              ) /
                denominator
            )
          )
        : 0;

    t =
      (
        b * s +
        e
      ) /
      c;

    if (t < 0) {
      t = 0;

      s = Math.max(
        0,
        Math.min(
          1,
          -d / a
        )
      );
    } else if (t > 1) {
      t = 1;

      s = Math.max(
        0,
        Math.min(
          1,
          (b - d) / a
        )
      );
    }
  }

  const pointFirst =
    add(
      a0,
      scale(u, s)
    );

  const pointSecond =
    add(
      b0,
      scale(v, t)
    );

  return {
    pointFirst,
    pointSecond,
    firstAmount: s,
    secondAmount: t,
    distance:
      distance(
        pointFirst,
        pointSecond
      ),
  };
}

function closestTriangleWitness(
  first,
  second
) {
  let best = null;

  function consider(candidate) {
    if (
      best === null ||
      candidate.distance <
        best.distance
    ) {
      best = candidate;
    }
  }

  first.forEach(
    (point, index) => {
      const closest =
        closestPointOnTriangle(
          point,
          second[0],
          second[1],
          second[2]
        );

      const firstWeights = [
        0,
        0,
        0,
      ];

      firstWeights[index] = 1;

      consider({
        pointFirst: point,
        pointSecond: closest,
        firstWeights,
        secondWeights:
          barycentricCoordinates(
            closest,
            second
          ),
        distance:
          distance(
            point,
            closest
          ),
      });
    }
  );

  second.forEach(
    (point, index) => {
      const closest =
        closestPointOnTriangle(
          point,
          first[0],
          first[1],
          first[2]
        );

      const secondWeights = [
        0,
        0,
        0,
      ];

      secondWeights[index] = 1;

      consider({
        pointFirst: closest,
        pointSecond: point,
        firstWeights:
          barycentricCoordinates(
            closest,
            first
          ),
        secondWeights,
        distance:
          distance(
            closest,
            point
          ),
      });
    }
  );

  const edges = [
    [0, 1],
    [1, 2],
    [2, 0],
  ];

  edges.forEach(
    ([firstStart, firstEnd]) => {
      edges.forEach(
        ([
          secondStart,
          secondEnd,
        ]) => {
          const witness =
            segmentSegmentWitness(
              first[firstStart],
              first[firstEnd],
              second[secondStart],
              second[secondEnd]
            );

          const firstWeights = [
            0,
            0,
            0,
          ];

          const secondWeights = [
            0,
            0,
            0,
          ];

          firstWeights[
            firstStart
          ] =
            1 -
            witness.firstAmount;

          firstWeights[
            firstEnd
          ] =
            witness.firstAmount;

          secondWeights[
            secondStart
          ] =
            1 -
            witness.secondAmount;

          secondWeights[
            secondEnd
          ] =
            witness.secondAmount;

          consider({
            pointFirst:
              witness.pointFirst,
            pointSecond:
              witness.pointSecond,
            firstWeights,
            secondWeights,
            distance:
              witness.distance,
          });
        }
      );
    }
  );

  return best;
}

function fallbackSeparationDirection(
  first,
  second
) {
  const centerDelta =
    subtract(
      triangleCentroid(second),
      triangleCentroid(first)
    );

  if (
    length(centerDelta) >
    GEOMETRY_EPSILON
  ) {
    return normalize(
      centerDelta
    );
  }

  const firstNormal =
    cross(
      subtract(
        first[1],
        first[0]
      ),
      subtract(
        first[2],
        first[0]
      )
    );

  const secondNormal =
    cross(
      subtract(
        second[1],
        second[0]
      ),
      subtract(
        second[2],
        second[0]
      )
    );

  const normalDifference =
    subtract(
      firstNormal,
      secondNormal
    );

  if (
    length(normalDifference) >
    GEOMETRY_EPSILON
  ) {
    return normalize(
      normalDifference
    );
  }

  return normalize(
    firstNormal
  );
}

function barrierContactRecord(
  first,
  second,
  witness,
  penetrating
) {
  const separation =
    subtract(
      witness.pointSecond,
      witness.pointFirst
    );

  const direction =
    length(separation) >
      GEOMETRY_EPSILON
      ? normalize(separation)
      : fallbackSeparationDirection(
          first.points,
          second.points
        );

  return {
    firstTriangleId:
      first.id,
    secondTriangleId:
      second.id,
    firstFaceId:
      first.faceId,
    secondFaceId:
      second.faceId,
    firstTetrahedronId:
      first.tetrahedronId,
    secondTetrahedronId:
      second.tetrahedronId,
    firstVertexIndices: [
      ...first.vertexIndices,
    ],
    secondVertexIndices: [
      ...second.vertexIndices,
    ],
    firstWeights: [
      ...witness.firstWeights,
    ],
    secondWeights: [
      ...witness.secondWeights,
    ],
    pointFirst:
      witness.pointFirst,
    pointSecond:
      witness.pointSecond,
    direction,
    distance:
      penetrating
        ? 0
        : witness.distance,
    penetrating,
  };
}

export function collectSurfaceBarrierContacts({
  positions,
  meshes,
  pairStrengths,
  lockedGroups,
  clearance = 12,
  activationEpsilon = 1e-6,
}) {
  const triangles =
    worldTriangles(
      positions,
      meshes
    );

  const countA =
    meshes.A.vertices.length;

  const groupByVertex =
    lockedGroupMap(
      lockedGroups
    );

  const contacts = [];

  for (
    let firstIndex = 0;
    firstIndex <
      triangles.length;
    firstIndex += 1
  ) {
    const first =
      triangles[firstIndex];

    for (
      let secondIndex =
        firstIndex + 1;
      secondIndex <
        triangles.length;
      secondIndex += 1
    ) {
      const second =
        triangles[secondIndex];

      if (
        first.tetrahedronId ===
          second.tetrahedronId &&
        (
          first.faceId ===
            second.faceId ||
          sharesLocalVertex(
            first,
            second
          )
        )
      ) {
        continue;
      }

      if (
        isAllowedFaceContact(
          first,
          second,
          pairStrengths,
          activationEpsilon
        )
      ) {
        continue;
      }

      if (
        sharesLockedVertex(
          first,
          second,
          groupByVertex,
          countA
        )
      ) {
        continue;
      }

      const penetrating =
        trianglesIntersect(
          first.points,
          second.points
        );

      if (
        !penetrating &&
        !boundsOverlap(
          first.points,
          second.points,
          clearance
        )
      ) {
        continue;
      }

      const witness =
        closestTriangleWitness(
          first.points,
          second.points
        );

      if (
        witness === null
      ) {
        continue;
      }

      if (
        penetrating ||
        witness.distance <
          clearance
      ) {
        contacts.push(
          barrierContactRecord(
            first,
            second,
            witness,
            penetrating
          )
        );
      }
    }
  }

  return contacts;
}

function pairRecord(
  first,
  second,
  pairDistance
) {
  return {
    firstTriangleId: first.id,
    secondTriangleId: second.id,
    firstFaceId: first.faceId,
    secondFaceId: second.faceId,
    distance: pairDistance,
  };
}

export function analyzeSurfaceContacts({
  positions,
  meshes,
  pairStrengths,
  lockedGroups,
  activePairId,
  clearance = 12,
  activationEpsilon = 1e-6,
}) {
  const triangles =
    worldTriangles(
      positions,
      meshes
    );

  const countA =
    meshes.A.vertices.length;

  const groupByVertex =
    lockedGroupMap(
      lockedGroups
    );

  const nearContactPairs = [];
  const penetratingPairs = [];

  let minimumClearance = Infinity;
  let minimumClearancePair = null;
  let testedPairCount = 0;
  let adjacentPairCount = 0;
  let allowedContactPairCount = 0;

  for (
    let firstIndex = 0;
    firstIndex <
      triangles.length;
    firstIndex += 1
  ) {
    const first =
      triangles[firstIndex];

    for (
      let secondIndex =
        firstIndex + 1;
      secondIndex <
        triangles.length;
      secondIndex += 1
    ) {
      const second =
        triangles[secondIndex];

      if (
        first.tetrahedronId ===
          second.tetrahedronId &&
        (
          first.faceId ===
            second.faceId ||
          sharesLocalVertex(
            first,
            second
          )
        )
      ) {
        adjacentPairCount += 1;
        continue;
      }

      if (
        isAllowedFaceContact(
          first,
          second,
          pairStrengths,
          activationEpsilon
        )
      ) {
        allowedContactPairCount += 1;
        continue;
      }

      if (
        sharesLockedVertex(
          first,
          second,
          groupByVertex,
          countA
        )
      ) {
        adjacentPairCount += 1;
        continue;
      }

      testedPairCount += 1;

      const intersects =
        trianglesIntersect(
          first.points,
          second.points
        );

      const pairDistance =
        intersects
          ? 0
          : triangleDistance(
              first.points,
              second.points
            );

      const record =
        pairRecord(
          first,
          second,
          pairDistance
        );

      if (
        pairDistance <
        minimumClearance
      ) {
        minimumClearance =
          pairDistance;

        minimumClearancePair =
          record;
      }

      if (intersects) {
        penetratingPairs.push(
          record
        );
      } else if (
        pairDistance <
        clearance
      ) {
        nearContactPairs.push(
          record
        );
      }
    }
  }

  return {
    minimumClearance:
      Number.isFinite(
        minimumClearance
      )
        ? minimumClearance
        : null,
    minimumClearancePair,
    nearContactPairs,
    penetratingPairs,
    blockedPairId:
      penetratingPairs.length > 0
        ? activePairId
        : null,
    testedPairCount,
    adjacentPairCount,
    allowedContactPairCount,
    clearanceThreshold:
      clearance,
  };
}

function interpolatePositions(
  fromPositions,
  toPositions,
  amount
) {
  return {
    A: fromPositions.A.map(
      (point, index) => ({
        x:
          point.x +
          (
            toPositions.A[index].x -
            point.x
          ) *
            amount,
        y:
          point.y +
          (
            toPositions.A[index].y -
            point.y
          ) *
            amount,
        z:
          point.z +
          (
            toPositions.A[index].z -
            point.z
          ) *
            amount,
      })
    ),
    B: fromPositions.B.map(
      (point, index) => ({
        x:
          point.x +
          (
            toPositions.B[index].x -
            point.x
          ) *
            amount,
        y:
          point.y +
          (
            toPositions.B[index].y -
            point.y
          ) *
            amount,
        z:
          point.z +
          (
            toPositions.B[index].z -
            point.z
          ) *
            amount,
      })
    ),
  };
}

export function analyzeSweptSurfaceContacts({
  fromPositions,
  toPositions,
  meshes,
  pairStrengths,
  lockedGroups,
  activePairId,
  clearance = 12,
  activationEpsilon = 1e-6,
  samples = 6,
}) {
  const penetratingPairs = [];
  const nearContactPairs = [];

  let minimumClearance = Infinity;
  let minimumClearanceSample = null;

  for (
    let sampleIndex = 1;
    sampleIndex <= samples;
    sampleIndex += 1
  ) {
    const amount =
      sampleIndex /
      samples;

    const positions =
      interpolatePositions(
        fromPositions,
        toPositions,
        amount
      );

    const diagnostics =
      analyzeSurfaceContacts({
        positions,
        meshes,
        pairStrengths,
        lockedGroups,
        activePairId,
        clearance,
        activationEpsilon,
      });

    if (
      diagnostics.minimumClearance !==
        null &&
      diagnostics.minimumClearance <
        minimumClearance
    ) {
      minimumClearance =
        diagnostics.minimumClearance;

      minimumClearanceSample =
        amount;
    }

    diagnostics.penetratingPairs.forEach(
      (pair) =>
        penetratingPairs.push({
          ...pair,
          sample: amount,
        })
    );

    diagnostics.nearContactPairs.forEach(
      (pair) =>
        nearContactPairs.push({
          ...pair,
          sample: amount,
        })
    );

    if (
      diagnostics.penetratingPairs
        .length > 0
    ) {
      break;
    }
  }

  return {
    minimumClearance:
      Number.isFinite(
        minimumClearance
      )
        ? minimumClearance
        : null,
    minimumClearanceSample,
    nearContactPairs,
    penetratingPairs,
    sampleCount: samples,
  };
}
