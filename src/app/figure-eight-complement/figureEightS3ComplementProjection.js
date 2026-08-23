import {
  defaultFigureEightS3Tube,
  sampleFigureEightS3CollarPoint4,
} from "./figureEightS3Geometry";


const EPSILON =
  1e-12;

const ROUND_TRIP_TOLERANCE =
  1e-9;

const WINDING_INSIDE_TOLERANCE =
  0.9;

const WINDING_OUTSIDE_TOLERANCE =
  0.1;

const POLE_DENOMINATOR_TOLERANCE =
  1e-8;

const CENTERLINE_CLEARANCE_TOLERANCE =
  1e-6;

const COLLAR_TEST_DEPTH =
  0.01;

const COLLAR_ROUTE_SAMPLE_COUNT =
  8;

const COLLAR_MINOR_SAMPLE_COUNT =
  4;


function dot4(
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


function norm4(point) {
  return Math.hypot(
    point[0],
    point[1],
    point[2],
    point[3]
  );
}


function normalize4(point) {
  const length =
    norm4(point);


  if (
    !Number.isFinite(
      length
    ) ||
    length <=
      EPSILON
  ) {
    throw new Error(
      "Cannot normalize degenerate R4 vector."
    );
  }


  return point.map(
    (value) =>
      value /
      length
  );
}


function subtractProjection4(
  vector,
  basisVector
) {
  const coefficient =
    dot4(
      vector,
      basisVector
    );


  return vector.map(
    (
      value,
      index
    ) =>
      value -
      coefficient *
        basisVector[
          index
        ]
  );
}


function subtractSeveralProjections4(
  vector,
  basisVectors
) {
  return basisVectors.reduce(
    (
      current,
      basisVector
    ) =>
      subtractProjection4(
        current,
        basisVector
      ),

    [...vector]
  );
}


function distance4(
  first,
  second
) {
  return Math.hypot(
    first[0] -
      second[0],

    first[1] -
      second[1],

    first[2] -
      second[2],

    first[3] -
      second[3]
  );
}


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


function geodesicDistance4(
  first,
  second
) {
  return Math.acos(
    clamp(
      dot4(
        first,
        second
      ),

      -1,
      1
    )
  );
}


function lerp4(
  first,
  second,
  amount
) {
  return first.map(
    (
      value,
      index
    ) =>
      value +
      (
        second[
          index
        ] -
        value
      ) *
        amount
  );
}


function determinant3(
  first,
  second,
  third
) {
  return (
    first[0] *
      (
        second[1] *
          third[2] -
        second[2] *
          third[1]
      ) -

    first[1] *
      (
        second[0] *
          third[2] -
        second[2] *
          third[0]
      ) +

    first[2] *
      (
        second[0] *
          third[1] -
        second[1] *
          third[0]
      )
  );
}


function dot3(
  first,
  second
) {
  return (
    first[0] *
      second[0] +

    first[1] *
      second[1] +

    first[2] *
      second[2]
  );
}


function norm3(point) {
  return Math.hypot(
    point[0],
    point[1],
    point[2]
  );
}


function point3FromBuffer(
  buffer,
  vertexIndex
) {
  const offset =
    vertexIndex *
    3;


  return [
    buffer[
      offset
    ],

    buffer[
      offset + 1
    ],

    buffer[
      offset + 2
    ],
  ];
}


/*
 * ============================================================
 * KNOT-DEFINED STEREOGRAPHIC FRAME
 * ============================================================
 *
 * The projection pole is not an arbitrary point of S³.
 *
 * It is an actual point C(t0) on the figure-eight centerline.
 *
 * Therefore it lies strictly inside the tubular neighborhood
 * N(K) that is removed when constructing the knot complement.
 *
 * Its orthogonal R³ projection frame is also obtained from the
 * knot:
 *
 *   e0 = centerline tangent
 *   e1 = first transported normal
 *   e2 = second transported normal
 *
 * No external ambient orientation is invented here.
 */
function createKnotPoleFrame(
  tube,
  poleIndex
) {
  const pole =
    normalize4(
      tube
        .centerline[
        poleIndex
      ]
    );


  const previous =
    tube
      .centerline[
      (
        poleIndex -
        1 +
        tube.nu
      ) %
        tube.nu
    ];

  const next =
    tube
      .centerline[
      (
        poleIndex +
        1
      ) %
        tube.nu
    ];


  const tangent =
    normalize4(
      subtractSeveralProjections4(
        next.map(
          (
            value,
            index
          ) =>
            value -
            previous[
              index
            ]
        ),

        [
          pole,
        ]
      )
    );


  const normal1 =
    normalize4(
      subtractSeveralProjections4(
        tube
          .normal1[
          poleIndex
        ],

        [
          pole,
          tangent,
        ]
      )
    );


  const normal2 =
    normalize4(
      subtractSeveralProjections4(
        tube
          .normal2[
          poleIndex
        ],

        [
          pole,
          tangent,
          normal1,
        ]
      )
    );


  return {
    pole,

    basis: [
      tangent,
      normal1,
      normal2,
    ],
  };
}


/*
 * Stereographic projection from an arbitrary unit pole P.
 *
 * For X in S³:
 *
 *                  <X,e_i>
 *     y_i = -----------------------
 *               1 - <X,P>
 *
 * where e0,e1,e2 form an orthonormal basis of P-perp.
 *
 * This is exactly the ordinary north-pole stereographic formula
 * expressed in the knot's own moving frame.
 */
function stereographicFromPole(
  point4,
  pole,
  basis
) {
  const denominator =
    1 -
    dot4(
      point4,
      pole
    );


  if (
    !Number.isFinite(
      denominator
    ) ||
    denominator <=
      EPSILON
  ) {
    return {
      point3: [
        Infinity,
        Infinity,
        Infinity,
      ],

      denominator,
    };
  }


  return {
    point3:
      basis.map(
        (basisVector) =>
          dot4(
            point4,
            basisVector
          ) /
          denominator
      ),

    denominator,
  };
}


/*
 * Exact inverse stereographic map.
 *
 * If r² = |y|² then
 *
 *             2
 *   X = ----------- y_basis
 *         1 + r²
 *
 *            r² - 1
 *       + ----------- P.
 *           1 + r²
 */
function inverseStereographicFromPole(
  point3,
  pole,
  basis
) {
  const radiusSquared =
    dot3(
      point3,
      point3
    );

  const denominator =
    radiusSquared +
    1;

  const tangentScale =
    2 /
    denominator;

  const poleScale =
    (
      radiusSquared -
      1
    ) /
    denominator;


  return normalize4(
    pole.map(
      (
        poleValue,
        coordinateIndex
      ) => {
        const tangentValue =
          basis[0][
            coordinateIndex
          ] *
            point3[0] +

          basis[1][
            coordinateIndex
          ] *
            point3[1] +

          basis[2][
            coordinateIndex
          ] *
            point3[2];


        return (
          tangentScale *
            tangentValue +

          poleScale *
            poleValue
        );
      }
    )
  );
}


/*
 * Closed-surface audit.
 *
 * Every edge of a manifold torus triangulation must occur exactly
 * twice and with opposite induced orientations.
 */
function auditSurfaceEdges(
  indices
) {
  const edges =
    new Map();


  function addEdge(
    first,
    second
  ) {
    const low =
      Math.min(
        first,
        second
      );

    const high =
      Math.max(
        first,
        second
      );

    const key =
      `${low}:${high}`;


    if (
      !edges.has(
        key
      )
    ) {
      edges.set(
        key,
        {
          count:
            0,

          directionSum:
            0,
        }
      );
    }


    const record =
      edges.get(
        key
      );


    record.count +=
      1;

    record.directionSum +=
      first <
      second
        ? 1
        : -1;
  }


  for (
    let index = 0;
    index <
      indices.length;
    index += 3
  ) {
    const a =
      indices[
        index
      ];

    const b =
      indices[
        index + 1
      ];

    const c =
      indices[
        index + 2
      ];


    addEdge(
      a,
      b
    );

    addEdge(
      b,
      c
    );

    addEdge(
      c,
      a
    );
  }


  let incidenceFailureCount =
    0;

  let orientationConflictCount =
    0;


  edges.forEach(
    (record) => {
      if (
        record.count !==
        2
      ) {
        incidenceFailureCount +=
          1;
      }


      if (
        record.count ===
          2 &&
        record.directionSum !==
          0
      ) {
        orientationConflictCount +=
          1;
      }
    }
  );


  return {
    edgeCount:
      edges.size,

    incidenceFailureCount,

    orientationConflictCount,
  };
}


/*
 * Generalized winding number of a closed triangular surface.
 *
 * For the projected complement:
 *
 *   |w| ~ 1  -> bounded side
 *   |w| ~ 0  -> unbounded side
 */
function windingNumber(
  vertices3,
  indices,
  queryPoint
) {
  let solidAngle =
    0;


  for (
    let index = 0;
    index <
      indices.length;
    index += 3
  ) {
    const first0 =
      point3FromBuffer(
        vertices3,

        indices[
          index
        ]
      );

    const second0 =
      point3FromBuffer(
        vertices3,

        indices[
          index + 1
        ]
      );

    const third0 =
      point3FromBuffer(
        vertices3,

        indices[
          index + 2
        ]
      );


    const first =
      first0.map(
        (
          value,
          axis
        ) =>
          value -
          queryPoint[
            axis
          ]
      );

    const second =
      second0.map(
        (
          value,
          axis
        ) =>
          value -
          queryPoint[
            axis
          ]
      );

    const third =
      third0.map(
        (
          value,
          axis
        ) =>
          value -
          queryPoint[
            axis
          ]
      );


    const firstNorm =
      norm3(
        first
      );

    const secondNorm =
      norm3(
        second
      );

    const thirdNorm =
      norm3(
        third
      );


    if (
      firstNorm <=
        EPSILON ||
      secondNorm <=
        EPSILON ||
      thirdNorm <=
        EPSILON
    ) {
      return NaN;
    }


    const numerator =
      determinant3(
        first,
        second,
        third
      );

    const denominator =
      firstNorm *
        secondNorm *
        thirdNorm +

      dot3(
        first,
        second
      ) *
        thirdNorm +

      dot3(
        second,
        third
      ) *
        firstNorm +

      dot3(
        third,
        first
      ) *
        secondNorm;


    solidAngle +=
      2 *
      Math.atan2(
        numerator,
        denominator
      );
  }


  return (
    solidAngle /
    (
      4 *
      Math.PI
    )
  );
}


/*
 * The antipode of the projection pole maps to the Euclidean origin.
 *
 * We verify densely along the SAME sampled/interpolated centerline
 * that this antipode lies farther than rho from the knot.
 *
 * Therefore the origin is a certified point of the complement,
 * not of the deleted solid torus.
 */
function denseCenterlineClearance(
  tube,
  point4,
  subdivisions = 8
) {
  let minimumDistance =
    Infinity;


  for (
    let index = 0;
    index <
      tube.nu;
    index += 1
  ) {
    const first =
      tube
        .centerline[
        index
      ];

    const second =
      tube
        .centerline[
        (
          index +
          1
        ) %
          tube.nu
      ];


    for (
      let step = 0;
      step <
        subdivisions;
      step += 1
    ) {
      const amount =
        step /
        subdivisions;

      const center =
        normalize4(
          lerp4(
            first,
            second,
            amount
          )
        );


      minimumDistance =
        Math.min(
          minimumDistance,

          geodesicDistance4(
            point4,
            center
          )
        );
    }
  }


  return minimumDistance;
}


/*
 * Exact two-sided certification from the SAME figure-eight tube.
 *
 * Positive signed depth:
 *   increasing rho -> knot-complement side.
 *
 * Negative signed depth:
 *   decreasing rho -> deleted-solid-torus side.
 */
function auditProjectedCollarSides({
  tube,
  pole,
  basis,
  vertices3,
  indices,
}) {
  const outwardWindings = [];
  const inwardWindings = [];

  let nonFiniteWitnessCount = 0;

  let representativeOutwardPoint3 =
    null;


  for (
    let routeIndex = 0;
    routeIndex <
      COLLAR_ROUTE_SAMPLE_COUNT;
    routeIndex += 1
  ) {
    const routeAmount =
      (
        routeIndex +
        0.5
      ) /
      COLLAR_ROUTE_SAMPLE_COUNT;


    for (
      let minorIndex = 0;
      minorIndex <
        COLLAR_MINOR_SAMPLE_COUNT;
      minorIndex += 1
    ) {
      const minorAmount =
        (
          minorIndex +
          0.5
        ) /
        COLLAR_MINOR_SAMPLE_COUNT;


      const outwardPoint4 =
        sampleFigureEightS3CollarPoint4(
          tube,
          routeAmount,
          minorAmount,
          COLLAR_TEST_DEPTH
        );


      const inwardPoint4 =
        sampleFigureEightS3CollarPoint4(
          tube,
          routeAmount,
          minorAmount,
          -COLLAR_TEST_DEPTH
        );


      const outwardPoint3 =
        stereographicFromPole(
          outwardPoint4,
          pole,
          basis
        ).point3;


      const inwardPoint3 =
        stereographicFromPole(
          inwardPoint4,
          pole,
          basis
        ).point3;


      if (
        !outwardPoint3.every(
          Number.isFinite
        ) ||
        !inwardPoint3.every(
          Number.isFinite
        )
      ) {
        nonFiniteWitnessCount +=
          1;

        continue;
      }


      if (
        representativeOutwardPoint3 ===
        null
      ) {
        representativeOutwardPoint3 =
          [
            ...outwardPoint3,
          ];
      }


      outwardWindings.push(
        windingNumber(
          vertices3,
          indices,
          outwardPoint3
        )
      );


      inwardWindings.push(
        windingNumber(
          vertices3,
          indices,
          inwardPoint3
        )
      );
    }
  }


  const expectedSampleCount =
    COLLAR_ROUTE_SAMPLE_COUNT *
    COLLAR_MINOR_SAMPLE_COUNT;


  const outwardFailureCount =
    outwardWindings.filter(
      (winding) =>
        !Number.isFinite(
          winding
        ) ||
        Math.abs(
          winding
        ) <
          WINDING_INSIDE_TOLERANCE
    ).length;


  const inwardFailureCount =
    inwardWindings.filter(
      (winding) =>
        !Number.isFinite(
          winding
        ) ||
        Math.abs(
          winding
        ) >
          WINDING_OUTSIDE_TOLERANCE
    ).length;


  const outwardPositiveCount =
    outwardWindings.filter(
      (winding) =>
        winding >
        0
    ).length;


  const outwardNegativeCount =
    outwardWindings.filter(
      (winding) =>
        winding <
        0
    ).length;


  const outwardOrientationSignConflict =
    outwardPositiveCount >
      0 &&
    outwardNegativeCount >
      0;


  const minimumOutwardAbsoluteWinding =
    outwardWindings.length >
      0
      ? Math.min(
          ...outwardWindings.map(
            Math.abs
          )
        )
      : 0;


  const maximumOutwardUnitError =
    outwardWindings.length >
      0
      ? Math.max(
          ...outwardWindings.map(
            (winding) =>
              Math.abs(
                Math.abs(
                  winding
                ) -
                1
              )
          )
        )
      : Infinity;


  const maximumInwardAbsoluteWinding =
    inwardWindings.length >
      0
      ? Math.max(
          ...inwardWindings.map(
            Math.abs
          )
        )
      : Infinity;


  const valid =
    nonFiniteWitnessCount ===
      0 &&
    outwardWindings.length ===
      expectedSampleCount &&
    inwardWindings.length ===
      expectedSampleCount &&
    outwardFailureCount ===
      0 &&
    inwardFailureCount ===
      0 &&
    !outwardOrientationSignConflict;


  return {
    valid,

    outwardWindings,

    inwardWindings,

    representativeOutwardPoint3,

    summary: {
      signedDepth:
        COLLAR_TEST_DEPTH,

      sampleCount:
        expectedSampleCount,

      nonFiniteWitnessCount,

      outwardFailureCount,

      inwardFailureCount,

      outwardPositiveCount,

      outwardNegativeCount,

      outwardOrientationSignConflict,

      minimumOutwardAbsoluteWinding,

      maximumOutwardUnitError,

      maximumInwardAbsoluteWinding,
    },
  };
}


/*
 * ============================================================
 * CONSTRUCTIVE FIGURE-EIGHT COMPLEMENT CHECKPOINT
 * ============================================================
 *
 * This is intentionally independent of the old ambient untangling
 * solver.
 *
 * Construction:
 *
 *   exact Projection-Lab figure-eight tube in S³
 *
 *          ↓
 *
 *   choose one knot-centerline point as the stereographic pole
 *
 *          ↓
 *
 *   project the boundary torus into R³
 *
 *          ↓
 *
 *   certify that the Euclidean origin lies on the bounded
 *   COMPLEMENT side of the torus.
 *
 * Because the projection pole lies inside the DELETED solid torus,
 * the compact knot complement itself cannot reach infinity.
 */
export function createFigureEightS3ComplementProjection({
  poleRouteIndex =
    0,
} = {}) {
  const failures =
    [];


  const tube =
    defaultFigureEightS3Tube();


  const normalizedPoleIndex =
    (
      (
        Math.round(
          poleRouteIndex
        ) %
          tube.nu
      ) +
      tube.nu
    ) %
    tube.nu;


  const {
    pole,
    basis,
  } =
    createKnotPoleFrame(
      tube,
      normalizedPoleIndex
    );


  const antipode =
    pole.map(
      (value) =>
        -value
    );


  const vertices3 =
    new Float64Array(
      tube.vertexCount *
      3
    );


  let minimumProjectionDenominator =
    Infinity;

  let minimumPoleBoundaryDistance =
    Infinity;

  let maximumProjectedRadius =
    0;

  let maximumSurfaceNormError =
    0;

  let maximumRoundTripError =
    0;

  let nonFiniteProjectedVertexCount =
    0;


  for (
    let vertexIndex = 0;
    vertexIndex <
      tube.vertexCount;
    vertexIndex += 1
  ) {
    const sourceOffset =
      vertexIndex *
      4;


    const point4 = [
      tube.vertices[
        sourceOffset
      ],

      tube.vertices[
        sourceOffset + 1
      ],

      tube.vertices[
        sourceOffset + 2
      ],

      tube.vertices[
        sourceOffset + 3
      ],
    ];


    maximumSurfaceNormError =
      Math.max(
        maximumSurfaceNormError,

        Math.abs(
          norm4(
            point4
          ) -
          1
        )
      );


    minimumPoleBoundaryDistance =
      Math.min(
        minimumPoleBoundaryDistance,

        geodesicDistance4(
          pole,
          normalize4(
            point4
          )
        )
      );


    const projected =
      stereographicFromPole(
        point4,
        pole,
        basis
      );


    minimumProjectionDenominator =
      Math.min(
        minimumProjectionDenominator,

        projected
          .denominator
      );


    if (
      projected
        .point3
        .some(
          (value) =>
            !Number.isFinite(
              value
            )
        )
    ) {
      nonFiniteProjectedVertexCount +=
        1;

      continue;
    }


    const targetOffset =
      vertexIndex *
      3;


    vertices3[
      targetOffset
    ] =
      projected
        .point3[0];

    vertices3[
      targetOffset + 1
    ] =
      projected
        .point3[1];

    vertices3[
      targetOffset + 2
    ] =
      projected
        .point3[2];


    maximumProjectedRadius =
      Math.max(
        maximumProjectedRadius,

        norm3(
          projected
            .point3
        )
      );


    const recovered =
      inverseStereographicFromPole(
        projected
          .point3,

        pole,
        basis
      );


    maximumRoundTripError =
      Math.max(
        maximumRoundTripError,

        distance4(
          recovered,

          normalize4(
            point4
          )
        )
      );
  }


  const edgeAudit =
    auditSurfaceEdges(
      tube.indices
    );


  const triangleCount =
    tube.indices.length /
    3;


  const eulerCharacteristic =
    tube.vertexCount -
    edgeAudit.edgeCount +
    triangleCount;


  /*
   * The antipode -P maps to the Euclidean origin.
   *
   * For this S³ figure-eight centerline it is another knot point.
   * Therefore the origin is a deleted-tube witness, not a
   * complement witness.
   */
  const originTestPoint3 = [
    0,
    0,
    0,
  ];


  const antipodeCenterlineDistance =
    denseCenterlineClearance(
      tube,
      antipode
    );


  const originInsideDeletedTube =
    antipodeCenterlineDistance <
    tube.rho -
      CENTERLINE_CLEARANCE_TOLERANCE;


  const originWinding =
    windingNumber(
      vertices3,
      tube.indices,
      originTestPoint3
    );


  /*
   * Authoritative side test:
   * use the exact increasing-rho/decreasing-rho directions of the
   * figure-eight tube itself.
   */
  const collarSideAudit =
    auditProjectedCollarSides({
      tube,
      pole,
      basis,
      vertices3,

      indices:
        tube.indices,
    });


  const complementTestPoint3 =
    collarSideAudit
      .representativeOutwardPoint3;


  const farTestPoint3 = [
    Math.max(
      4 *
        maximumProjectedRadius +
        1,

      10
    ),

    0,
    0,
  ];


  const farWinding =
    windingNumber(
      vertices3,
      tube.indices,
      farTestPoint3
    );


  const closedSurface =
    edgeAudit
      .incidenceFailureCount ===
    0;


  const consistentlyOrientedSurface =
    edgeAudit
      .orientationConflictCount ===
    0;


  const boundedComplementCertified =
    collarSideAudit.valid &&

    Number.isFinite(
      farWinding
    ) &&

    Math.abs(
      farWinding
    ) <=
      WINDING_OUTSIDE_TOLERANCE;


  if (
    nonFiniteProjectedVertexCount >
    0
  ) {
    failures.push({
      reason:
        "nonfinite-projected-boundary-vertices",

      count:
        nonFiniteProjectedVertexCount,
    });
  }


  if (
    minimumProjectionDenominator <=
    POLE_DENOMINATOR_TOLERANCE
  ) {
    failures.push({
      reason:
        "projection-pole-too-close-to-boundary",

      minimumProjectionDenominator,
    });
  }


  if (
    !closedSurface
  ) {
    failures.push({
      reason:
        "projected-boundary-not-closed",

      incidenceFailureCount:
        edgeAudit
          .incidenceFailureCount,
    });
  }


  if (
    !consistentlyOrientedSurface
  ) {
    failures.push({
      reason:
        "projected-boundary-orientation-conflict",

      orientationConflictCount:
        edgeAudit
          .orientationConflictCount,
    });
  }


  if (
    eulerCharacteristic !==
    0
  ) {
    failures.push({
      reason:
        "projected-boundary-euler-characteristic-mismatch",

      eulerCharacteristic,
    });
  }


  if (
    maximumRoundTripError >
    ROUND_TRIP_TOLERANCE
  ) {
    failures.push({
      reason:
        "stereographic-round-trip-error",

      maximumRoundTripError,
    });
  }


  if (
    !collarSideAudit.valid
  ) {
    failures.push({
      reason:
        "exact-collar-side-certification-failed",

      summary:
        collarSideAudit.summary,
    });
  }


  if (
    !boundedComplementCertified
  ) {
    failures.push({
      reason:
        "bounded-complement-side-not-certified",

      collarSideAudit:
        collarSideAudit.summary,

      farWinding,
    });
  }


  const valid =
    failures.length ===
    0;


  return {
    valid,

    method:
      "exact figure-eight S3 tube + knot-centerline-pole stereographic projection",

    tube,

    poleRouteIndex:
      normalizedPoleIndex,

    pole4:
      pole,

    projectionBasis4:
      basis,

    vertices3,

    indices:
      tube.indices,

    complementTestPoint3,

    originTestPoint3,

    farTestPoint3,

    collarSideAudit,

    projectPoint4:
      (point4) =>
        stereographicFromPole(
          point4,
          pole,
          basis
        ).point3,

    inversePoint3:
      (point3) =>
        inverseStereographicFromPole(
          point3,
          pole,
          basis
        ),

    failures,

    summary: {
      tubeNu:
        tube.nu,

      tubeNv:
        tube.nv,

      tubeRadius:
        tube.rho,

      boundaryVertexCount:
        tube.vertexCount,

      boundaryEdgeCount:
        edgeAudit
          .edgeCount,

      boundaryTriangleCount:
        triangleCount,

      eulerCharacteristic,

      poleRouteIndex:
        normalizedPoleIndex,

      poleIsKnotCenterlinePoint:
        true,

      minimumPoleBoundaryDistance,

      minimumProjectionDenominator,

      maximumProjectedRadius,

      maximumSurfaceNormError,

      maximumRoundTripError,

      nonFiniteProjectedVertexCount,

      closedSurface,

      edgeIncidenceFailureCount:
        edgeAudit
          .incidenceFailureCount,

      consistentlyOrientedSurface,

      orientationConflictCount:
        edgeAudit
          .orientationConflictCount,

      antipodeCenterlineDistance,

      originInsideDeletedTube,

      originWinding,

      collarTestDepth:
        collarSideAudit
          .summary
          .signedDepth,

      collarSampleCount:
        collarSideAudit
          .summary
          .sampleCount,

      collarNonFiniteWitnessCount:
        collarSideAudit
          .summary
          .nonFiniteWitnessCount,

      outwardCollarFailureCount:
        collarSideAudit
          .summary
          .outwardFailureCount,

      inwardCollarFailureCount:
        collarSideAudit
          .summary
          .inwardFailureCount,

      outwardOrientationSignConflict:
        collarSideAudit
          .summary
          .outwardOrientationSignConflict,

      minimumOutwardAbsoluteWinding:
        collarSideAudit
          .summary
          .minimumOutwardAbsoluteWinding,

      maximumOutwardUnitError:
        collarSideAudit
          .summary
          .maximumOutwardUnitError,

      maximumInwardAbsoluteWinding:
        collarSideAudit
          .summary
          .maximumInwardAbsoluteWinding,

      complementWinding:
        collarSideAudit
          .outwardWindings[
          0
        ] ??
        null,

      farWinding,

      boundedComplementCertified,
    },
  };
}
