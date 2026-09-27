/*
 * Generic S^3 boundary-tube engine.
 *
 * Extracted directly from the established figure-eight
 * Boundary implementation.
 *
 * The tube/frame/projection mathematics is unchanged.
 * The manifold-specific input is centerlinePoint(t).
 */

const DEG = Math.PI / 180;

export const DEFAULT_S3_PROJECTION =
  Object.freeze({
    xw: 0,
    yw: 90,
    zw: 180,
  });


function dot4(a, b) {
  return (
    a[0] * b[0] +
    a[1] * b[1] +
    a[2] * b[2] +
    a[3] * b[3]
  );
}

function normalize4(v) {
  const length = Math.sqrt(dot4(v, v));

  if (length < 1e-12) {
    return [0, 0, 0, 0];
  }

  return v.map((value) => value / length);
}

function subtractProjection(v, axis) {
  const amount = dot4(v, axis);

  return [
    v[0] - amount * axis[0],
    v[1] - amount * axis[1],
    v[2] - amount * axis[2],
    v[3] - amount * axis[3],
  ];
}

export function buildS3Tube({
  centerlinePoint,
  nu = 144,
  nv = 32,
  rho = 0.14,
}) {
  if (
    typeof centerlinePoint !==
    "function"
  ) {
    throw new Error(
      "buildS3Tube requires centerlinePoint(t)."
    );
  }

  const NU = nu;
  const NV = nv;

  const centerline =
    Array.from(
      { length: NU },
      (_, i) =>
        centerlinePoint(
          (2 * Math.PI * i) / NU
        )
    );

  const tangent =
    new Array(NU);

  for (let i = 0; i < NU; i += 1) {
    const previous =
      centerline[
        (i - 1 + NU) % NU
      ];

    const next =
      centerline[
        (i + 1) % NU
      ];

    let d = [
      next[0] - previous[0],
      next[1] - previous[1],
      next[2] - previous[2],
      next[3] - previous[3],
    ];

    d =
      subtractProjection(
        d,
        centerline[i]
      );

    tangent[i] =
      normalize4(d);
  }

  function normalCandidate(
    source,
    p,
    tau,
    previousNormal = null
  ) {
    let result =
      subtractProjection(
        source,
        p
      );

    result =
      subtractProjection(
        result,
        tau
      );

    if (previousNormal) {
      result =
        subtractProjection(
          result,
          previousNormal
        );
    }

    return result;
  }

  /*
   * Exact parallel transport on the unit 3-sphere.
   *
   * For v tangent at p, transport along the shortest
   * geodesic from p to q:
   *
   *   PT(v) =
   *     v - (v.q)/(1 + p.q) * (p + q)
   *
   * Adjacent centerline samples are never antipodal in
   * our tube construction, but retain a defensive fallback.
   */
  function parallelTransportS3(
    vector,
    from,
    to
  ) {
    const denominator =
      1 +
      dot4(
        from,
        to
      );

    if (
      Math.abs(denominator) <
      1e-10
    ) {
      return vector.slice();
    }

    const coefficient =
      dot4(
        vector,
        to
      ) /
      denominator;

    return [
      vector[0] -
        coefficient *
          (
            from[0] +
            to[0]
          ),

      vector[1] -
        coefficient *
          (
            from[1] +
            to[1]
          ),

      vector[2] -
        coefficient *
          (
            from[2] +
            to[2]
          ),

      vector[3] -
        coefficient *
          (
            from[3] +
            to[3]
          ),
    ];
  }

  /*
   * --------------------------------------------------------
   * CONTINUOUS MATERIAL FRAME
   * --------------------------------------------------------
   *
   * Previously the initial frame was seeded by whichever
   * Cartesian S3 axis happened to have the largest normal
   * projection. As lambda changed, the winning axis could
   * switch discontinuously.
   *
   * That did not alter the tube as a set of points, but it
   * abruptly changed the theta=0 direction of the tube.
   * Therefore the eight material cusp triangles appeared
   * to twist around the tube.
   *
   * Use one fixed seed instead. Its projection varies
   * continuously with the knot geometry.
   */
  const fixedNormalSource = [
    0,
    0,
    1,
    0,
  ];

  const N1 =
    new Array(NU);

  const N2 =
    new Array(NU);

  N1[0] =
    normalize4(
      normalCandidate(
        fixedNormalSource,
        centerline[0],
        tangent[0]
      )
    );

  /*
   * Given three orthonormal vectors in R4, construct the
   * fourth using the oriented 4D analogue of a cross
   * product. This fixes N2 continuously from
   *
   *   centerline, tangent, N1
   *
   * rather than choosing another Cartesian axis.
   */
  function determinant3(
    a00, a01, a02,
    a10, a11, a12,
    a20, a21, a22
  ) {
    return (
      a00 *
        (
          a11 * a22 -
          a12 * a21
        ) -
      a01 *
        (
          a10 * a22 -
          a12 * a20
        ) +
      a02 *
        (
          a10 * a21 -
          a11 * a20
        )
    );
  }

  function orientedNormal4(
    a,
    b,
    c
  ) {
    return [
      determinant3(
        a[1], a[2], a[3],
        b[1], b[2], b[3],
        c[1], c[2], c[3]
      ),

      -determinant3(
        a[0], a[2], a[3],
        b[0], b[2], b[3],
        c[0], c[2], c[3]
      ),

      determinant3(
        a[0], a[1], a[3],
        b[0], b[1], b[3],
        c[0], c[1], c[3]
      ),

      -determinant3(
        a[0], a[1], a[2],
        b[0], b[1], b[2],
        c[0], c[1], c[2]
      ),
    ];
  }

  N2[0] =
    normalize4(
      orientedNormal4(
        centerline[0],
        tangent[0],
        N1[0]
      )
    );

  for (let i = 1; i < NU; i += 1) {
    /*
     * Carry N1 by genuine Levi-Civita parallel transport
     * along S^3 from the previous centerline sample.
     */
    let transportedN1 =
      parallelTransportS3(
        N1[i - 1],
        centerline[i - 1],
        centerline[i]
      );

    /*
     * The normal bundle of the curve is the subspace
     * orthogonal to both the S^3 radial direction C and
     * the curve tangent T.
     *
     * Parallel transport already makes transportedN1
     * tangent to S^3 at the new point. Remove only its
     * component along the new curve tangent.
     */
    transportedN1 =
      subtractProjection(
        transportedN1,
        tangent[i]
      );

    const transportedLength =
      Math.hypot(
        transportedN1[0],
        transportedN1[1],
        transportedN1[2],
        transportedN1[3]
      );

    /*
     * Extremely defensive fallback. This should almost
     * never fire, but prevents normalization of an
     * accidentally tiny vector.
     */
    if (
      transportedLength <
      1e-10
    ) {
      transportedN1 =
        normalCandidate(
          fixedNormalSource,
          centerline[i],
          tangent[i]
        );
    }

    N1[i] =
      normalize4(
        transportedN1
      );

    /*
     * Construct N2 directly from the oriented orthonormal
     * triple (C,T,N1). This prevents independent transport
     * error or sign drift in the second normal direction.
     */
    N2[i] =
      normalize4(
        orientedNormal4(
          centerline[i],
          tangent[i],
          N1[i]
        )
      );
  }

  /*
   * Correct the accumulated normal-frame holonomy
   * so the sampled torus closes smoothly at t = 2π.
   */
  let closingN1 =
    parallelTransportS3(
      N1[NU - 1],
      centerline[NU - 1],
      centerline[0]
    );

  closingN1 =
    subtractProjection(
      closingN1,
      tangent[0]
    );

  closingN1 =
    normalize4(
      closingN1
    );

  const closingAngle =
    Math.atan2(
      dot4(
        closingN1,
        N2[0]
      ),
      dot4(
        closingN1,
        N1[0]
      )
    );

  for (let i = 0; i < NU; i += 1) {
    const angle =
      (-closingAngle * i) /
      NU;

    const c =
      Math.cos(angle);

    const s =
      Math.sin(angle);

    const v = N1[i].slice();
    const w = N2[i].slice();

    N1[i] = [
      c * v[0] + s * w[0],
      c * v[1] + s * w[1],
      c * v[2] + s * w[2],
      c * v[3] + s * w[3],
    ];

    N2[i] = [
      -s * v[0] + c * w[0],
      -s * v[1] + c * w[1],
      -s * v[2] + c * w[2],
      -s * v[3] + c * w[3],
    ];
  }

  const vertexCount =
    NU * NV;

  const vertices =
    new Float64Array(
      vertexCount * 4
    );

  const cosRho =
    Math.cos(rho);

  const sinRho =
    Math.sin(rho);

  for (let i = 0; i < NU; i += 1) {
    for (let j = 0; j < NV; j += 1) {
      const theta =
        (2 * Math.PI * j) /
        NV;

      const ct =
        Math.cos(theta);

      const st =
        Math.sin(theta);

      const index =
        (i * NV + j) * 4;

      for (let k = 0; k < 4; k += 1) {
        const radial =
          ct * N1[i][k] +
          st * N2[i][k];

        vertices[index + k] =
          cosRho *
            centerline[i][k] +
          sinRho * radial;
      }
    }
  }

  const indices =
    new Uint32Array(
      NU * NV * 6
    );

  let cursor = 0;

  for (let i = 0; i < NU; i += 1) {
    const ip =
      (i + 1) % NU;

    for (let j = 0; j < NV; j += 1) {
      const jp =
        (j + 1) % NV;

      const a =
        i * NV + j;

      const b =
        ip * NV + j;

      const c =
        ip * NV + jp;

      const d =
        i * NV + jp;

      indices[cursor++] = a;
      indices[cursor++] = b;
      indices[cursor++] = c;

      indices[cursor++] = a;
      indices[cursor++] = c;
      indices[cursor++] = d;
    }
  }

  return {
    vertices,
    indices,
    vertexCount,
    nu: NU,
    nv: NV,
    centerline,
    normal1: N1,
    normal2: N2,
    rho,
  };
}

function wrapUnitInterval(value) {
  return (
    (
      value % 1
    ) + 1
  ) % 1;
}

function lerp4(a, b, amount) {
  return [
    a[0] + (b[0] - a[0]) * amount,
    a[1] + (b[1] - a[1]) * amount,
    a[2] + (b[2] - a[2]) * amount,
    a[3] + (b[3] - a[3]) * amount,
  ];
}

export function sampleS3TubeMaterialFrame4(
  tube,
  routeAmount,
  minorAmount
) {
  const route =
    wrapUnitInterval(routeAmount);

  const scaledRoute =
    route * tube.nu;

  const baseIndex =
    Math.floor(scaledRoute);

  const firstIndex =
    baseIndex % tube.nu;

  const secondIndex =
    (firstIndex + 1) % tube.nu;

  const localAmount =
    scaledRoute - baseIndex;

  const center =
    normalize4(
      lerp4(
        tube.centerline[firstIndex],
        tube.centerline[secondIndex],
        localAmount
      )
    );

  let normal1 =
    lerp4(
      tube.normal1[firstIndex],
      tube.normal1[secondIndex],
      localAmount
    );

  normal1 =
    normalize4(
      subtractProjection(
        normal1,
        center
      )
    );

  let normal2 =
    lerp4(
      tube.normal2[firstIndex],
      tube.normal2[secondIndex],
      localAmount
    );

  normal2 =
    subtractProjection(
      normal2,
      center
    );

  normal2 =
    normalize4(
      subtractProjection(
        normal2,
        normal1
      )
    );

  const theta =
    2 * Math.PI * minorAmount;

  const cosine =
    Math.cos(theta);

  const sine =
    Math.sin(theta);

  const radial =
    normalize4([
      cosine * normal1[0] +
        sine * normal2[0],
      cosine * normal1[1] +
        sine * normal2[1],
      cosine * normal1[2] +
        sine * normal2[2],
      cosine * normal1[3] +
        sine * normal2[3],
    ]);

  const cosRho =
    Math.cos(tube.rho);

  const sinRho =
    Math.sin(tube.rho);

  const point =
    normalize4([
      cosRho * center[0] +
        sinRho * radial[0],
      cosRho * center[1] +
        sinRho * radial[1],
      cosRho * center[2] +
        sinRho * radial[2],
      cosRho * center[3] +
        sinRho * radial[3],
    ]);

  /*
   * Exact unit normal in T_X S³.
   *
   * Positive sign means increasing tube radius rho.
   */
  const outwardNormal =
    normalize4([
      -sinRho * center[0] +
        cosRho * radial[0],
      -sinRho * center[1] +
        cosRho * radial[1],
      -sinRho * center[2] +
        cosRho * radial[2],
      -sinRho * center[3] +
        cosRho * radial[3],
    ]);

  return {
    center,
    normal1,
    normal2,
    radial,
    point,
    outwardNormal,

    routeAmount:
      route,

    minorAmount:
      wrapUnitInterval(
        minorAmount
      ),

    rho:
      tube.rho,
  };
}


export function sampleS3TubePoint4(
  tube,
  routeAmount,
  minorAmount
) {
  return sampleS3TubeMaterialFrame4(
    tube,
    routeAmount,
    minorAmount
  ).point;
}

export function rotateS3MixedPlanes(
  x,
  y,
  z,
  w,
  projection
) {
  let c =
    Math.cos(
      projection.xw * DEG
    );

  let s =
    Math.sin(
      projection.xw * DEG
    );

  let nextX =
    c * x - s * w;

  let nextW =
    s * x + c * w;

  x = nextX;
  w = nextW;

  c =
    Math.cos(
      projection.yw * DEG
    );

  s =
    Math.sin(
      projection.yw * DEG
    );

  const nextY =
    c * y - s * w;

  nextW =
    s * y + c * w;

  y = nextY;
  w = nextW;

  c =
    Math.cos(
      projection.zw * DEG
    );

  s =
    Math.sin(
      projection.zw * DEG
    );

  const nextZ =
    c * z - s * w;

  nextW =
    s * z + c * w;

  z = nextZ;
  w = nextW;

  return [x, y, z, w];
}

export function stereographicS3Point(
  point4,
  projection =
    DEFAULT_S3_PROJECTION
) {
  const rotated =
    rotateS3MixedPlanes(
      point4[0],
      point4[1],
      point4[2],
      point4[3],
      projection
    );

  let denominator =
    1 - rotated[3];

  /*
   * The projection pole is genuinely at infinity. Preserve
   * its sign while preventing floating-point division by zero.
   */
  if (
    Math.abs(denominator) <
    1e-10
  ) {
    denominator =
      denominator < 0
        ? -1e-10
        : 1e-10;
  }

  return [
    rotated[0] / denominator,
    rotated[1] / denominator,
    rotated[2] / denominator,
  ];
}

