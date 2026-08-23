/*
 * Canonical figure-eight S^3 geometry shared by:
 *
 *   /figure-eight-complement
 *   /figure-eight-complement/projection-lab
 *
 * The core, material frame, tube, SO(4) rotations, and
 * stereographic projection now have one implementation.
 *
 * This module was factored directly from the working
 * Projection Lab implementation.
 */

const DEG = Math.PI / 180;

export const DEFAULT_FIGURE_EIGHT_S3_GEOMETRY =
  Object.freeze({
lambda: 0.14,
  epsilon: 0.14,
  rho: 0.14,
  });

export const DEFAULT_FIGURE_EIGHT_S3_NU =
  144;

export const DEFAULT_FIGURE_EIGHT_S3_NV =
  32;

export const FIGURE_EIGHT_S3_STANDARD_PROJECTION =
  Object.freeze({
xw: 0,
  yw: 0,
  zw: 0,
  });

export const FIGURE_EIGHT_S3_SYMMETRIC_PROJECTION =
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

/*
 * ------------------------------------------------------------
 * SHARED CUSP MATERIAL COORDINATES
 * ------------------------------------------------------------
 *
 * The figure-eight cusp development and the S3 tube use one
 * material-coordinate contract:
 *
 *   raw point
 *      -> (u,v)
 *      -> (meridian,longitude)
 *      -> (routeAmount,minorAmount/minorAngle)
 *
 * For m004:
 *
 *   meridian  = u - 2v
 *   longitude = v
 *
 * and the tube phase is centered at meridian = 1/2.
 */

export const FIGURE_EIGHT_CUSP_HEIGHT =
  Math.sqrt(3) / 2;

export const FIGURE_EIGHT_CUSP_DOMAIN_CORNERS =
  Object.freeze([
    Object.freeze({
      x: -0.5,
      y: FIGURE_EIGHT_CUSP_HEIGHT,
    }),
    Object.freeze({
      x: 0,
      y:
        2 *
        FIGURE_EIGHT_CUSP_HEIGHT,
    }),
    Object.freeze({
      x: 2,
      y:
        -2 *
        FIGURE_EIGHT_CUSP_HEIGHT,
    }),
    Object.freeze({
      x: 1.5,
      y:
        -3 *
        FIGURE_EIGHT_CUSP_HEIGHT,
    }),
  ]);

export const FIGURE_EIGHT_CUSP_PERIPHERAL_BASIS =
  Object.freeze({
    meridian: Object.freeze({
      u: 1,
      v: -2,
    }),
    longitude: Object.freeze({
      u: 0,
      v: 1,
    }),
  });

export const FIGURE_EIGHT_CUSP_MINOR_ORIGIN =
  0.5;

/*
 * A constant-meridian longitude lift has
 *
 *   du/dv = 2
 *
 * for m = u - 2v.
 *
 * Keep that slope derived from the same peripheral basis rather
 * than repeating the number 2 throughout the two viewers.
 */
export const FIGURE_EIGHT_CUSP_LONGITUDE_U_SLOPE =
  -FIGURE_EIGHT_CUSP_PERIPHERAL_BASIS
    .meridian.v /
  FIGURE_EIGHT_CUSP_PERIPHERAL_BASIS
    .meridian.u;

export const DEFAULT_FIGURE_EIGHT_CUSP_COORDINATE_SPEC =
  Object.freeze({
    domainCorners:
      FIGURE_EIGHT_CUSP_DOMAIN_CORNERS,
    peripheralBasis:
      FIGURE_EIGHT_CUSP_PERIPHERAL_BASIS,
    minorOrigin:
      FIGURE_EIGHT_CUSP_MINOR_ORIGIN,
  });


export function cuspCoordinateDomainAxes(
  cuspCoordinateSpec =
    DEFAULT_FIGURE_EIGHT_CUSP_COORDINATE_SPEC
) {
  const domainCorners =
    cuspCoordinateSpec?.domainCorners ??
    FIGURE_EIGHT_CUSP_DOMAIN_CORNERS;

  const origin =
    domainCorners[0];

  const axisU = {
    x:
      domainCorners[1].x -
      origin.x,
    y:
      domainCorners[1].y -
      origin.y,
  };

  const axisV = {
    x:
      domainCorners[3].x -
      origin.x,
    y:
      domainCorners[3].y -
      origin.y,
  };

  return {
    domainCorners,
    origin,
    axisU,
    axisV,
    determinant:
      axisU.x * axisV.y -
      axisU.y * axisV.x,
  };
}


export function cuspDomainCoordinates(
  point,
  cuspCoordinateSpec =
    DEFAULT_FIGURE_EIGHT_CUSP_COORDINATE_SPEC
) {
  const {
    origin,
    axisU,
    axisV,
    determinant,
  } = cuspCoordinateDomainAxes(
    cuspCoordinateSpec
  );

  const local = {
    x:
      point.x -
      origin.x,
    y:
      point.y -
      origin.y,
  };

  return {
    u:
      (
        local.x * axisV.y -
        local.y * axisV.x
      ) /
      determinant,

    v:
      (
        axisU.x * local.y -
        axisU.y * local.x
      ) /
      determinant,
  };
}


export function cuspRawPointFromCoordinates(
  u,
  v,
  cuspCoordinateSpec =
    DEFAULT_FIGURE_EIGHT_CUSP_COORDINATE_SPEC
) {
  const {
    origin,
    axisU,
    axisV,
  } = cuspCoordinateDomainAxes(
    cuspCoordinateSpec
  );

  return {
    x:
      origin.x +
      axisU.x * u +
      axisV.x * v,

    y:
      origin.y +
      axisU.y * u +
      axisV.y * v,
  };
}


export function cuspPeripheralCoordinates(
  domainCoordinates,
  cuspCoordinateSpec =
    DEFAULT_FIGURE_EIGHT_CUSP_COORDINATE_SPEC
) {
  const peripheralBasis =
    cuspCoordinateSpec?.peripheralBasis;

  if (!peripheralBasis) {
    return null;
  }

  const {
    u,
    v,
  } = domainCoordinates;

  return {
    meridian:
      peripheralBasis.meridian.u *
        u +
      peripheralBasis.meridian.v *
        v,

    longitude:
      peripheralBasis.longitude.u *
        u +
      peripheralBasis.longitude.v *
        v,
  };
}


/*
 * Complete cusp -> S3 material handoff.
 *
 * minorAmount is measured in turns.
 * minorAngle is the same coordinate measured in radians.
 */
export function cuspTubeCoordinates(
  rawPoint,
  cuspCoordinateSpec =
    DEFAULT_FIGURE_EIGHT_CUSP_COORDINATE_SPEC
) {
  const domainCoordinates =
    cuspDomainCoordinates(
      rawPoint,
      cuspCoordinateSpec
    );

  const peripheralCoordinates =
    cuspPeripheralCoordinates(
      domainCoordinates,
      cuspCoordinateSpec
    );

  if (!peripheralCoordinates) {
    return null;
  }

  const {
    meridian,
    longitude,
  } = peripheralCoordinates;

  const minorOrigin =
    Number.isFinite(
      cuspCoordinateSpec?.minorOrigin
    )
      ? cuspCoordinateSpec.minorOrigin
      : FIGURE_EIGHT_CUSP_MINOR_ORIGIN;

  const minorAmount =
    meridian -
    minorOrigin;

  return {
    ...domainCoordinates,

    meridian,
    longitude,

    routeAmount:
      longitude,

    minorAmount,

    minorAngle:
      minorAmount *
      Math.PI *
      2,
  };
}


export function figureEightS3CenterlinePoint(
  t,
  lambda,
  epsilon
) {
  const A =
    epsilon * Math.sin(4 * t);

  const u1 =
    lambda * Math.sin(t) -
    (1 - lambda) * Math.sin(3 * t);

  const u2 =
    lambda * Math.cos(t) +
    (1 - lambda) * Math.cos(3 * t);

  const u3 =
    2 *
    Math.sqrt(
      Math.max(
        0,
        lambda * (1 - lambda)
      )
    ) *
    Math.sin(2 * t);

  const factor =
    (1 - A * A) /
    (1 + A * A);

  return [
    factor * u1,
    factor * u2,
    factor * u3,
    (2 * A) / (1 + A * A),
  ];
}

export function buildFigureEightS3Tube(
  NU = DEFAULT_FIGURE_EIGHT_S3_NU,
  NV = DEFAULT_FIGURE_EIGHT_S3_NV,
  geometry = DEFAULT_FIGURE_EIGHT_S3_GEOMETRY
) {
  const {
    lambda,
    epsilon,
    rho,
  } = geometry;
  const centerline =
    Array.from(
      { length: NU },
      (_, i) =>
        figureEightS3CenterlinePoint(
          (2 * Math.PI * i) / NU,
          lambda,
          epsilon
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
    N1[i] =
      normalize4(
        normalCandidate(
          N1[i - 1],
          centerline[i],
          tangent[i]
        )
      );

    N2[i] =
      normalize4(
        normalCandidate(
          N2[i - 1],
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
    normalCandidate(
      N1[NU - 1],
      centerline[0],
      tangent[0]
    );

  closingN1 =
    normalize4(closingN1);

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

/*
 * Evaluate the exact material frame used by the sampled S³ tube.
 *
 * The surface point is
 *
 *   X = cos(rho) C + sin(rho) R
 *
 * where C is the sampled centerline point and R is the unit radial
 * direction in the transported normal 2-plane.
 *
 * Differentiating in rho gives the canonical tube normal inside S³:
 *
 *   N = -sin(rho) C + cos(rho) R.
 *
 * By the Gauss lemma this is orthogonal to the constant-rho tube.
 * It is therefore the natural collar direction for continuing the
 * Projection-Lab boundary into the complement.
 */
export function sampleFigureEightS3TubeMaterialFrame4(
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


/*
 * Evaluate an arbitrary point on exactly the same sampled S³
 * tube used by the surface renderer.
 */
export function sampleFigureEightS3TubePoint4(
  tube,
  routeAmount,
  minorAmount
) {
  return sampleFigureEightS3TubeMaterialFrame4(
    tube,
    routeAmount,
    minorAmount
  ).point;
}


/*
 * Canonical smooth normal to the shared Projection-Lab tube.
 *
 * Its sign points toward increasing tube radius rho.
 */
export function sampleFigureEightS3TubeNormal4(
  tube,
  routeAmount,
  minorAmount
) {
  return sampleFigureEightS3TubeMaterialFrame4(
    tube,
    routeAmount,
    minorAmount
  ).outwardNormal;
}


/*
 * Continue the shared Projection-Lab tube normally through S³.
 *
 * Since X and N are orthonormal,
 *
 *   X_delta =
 *     cos(delta) X +
 *     sin(delta) N
 *
 * remains exactly on S³.
 *
 * This is algebraically the same material point at radius
 *
 *   rho + delta.
 *
 * A negative signedDepth therefore moves toward the knot
 * centerline; a positive signedDepth moves away from it.
 */
export function sampleFigureEightS3CollarPoint4(
  tube,
  routeAmount,
  minorAmount,
  signedDepth
) {
  const {
    point,
    outwardNormal,
  } =
    sampleFigureEightS3TubeMaterialFrame4(
      tube,
      routeAmount,
      minorAmount
    );

  const cosine =
    Math.cos(
      signedDepth
    );

  const sine =
    Math.sin(
      signedDepth
    );

  return normalize4([
    cosine * point[0] +
      sine * outwardNormal[0],
    cosine * point[1] +
      sine * outwardNormal[1],
    cosine * point[2] +
      sine * outwardNormal[2],
    cosine * point[3] +
      sine * outwardNormal[3],
  ]);
}



export function rotateFigureEightS3MixedPlanes(
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



/*
 * Smoothly interpolate the SO(4) projection orientation.
 *
 * The constructor uses Standard -> Symmetric so its final
 * endpoint is exactly the Projection Lab's default S^3
 * projection state.
 */
export function interpolateFigureEightS3Projection(
  start,
  end,
  amount
) {
  const t = Math.max(
    0,
    Math.min(1, amount)
  );

  function shortestAngleDelta(
    first,
    second
  ) {
    return (
      (
        second -
        first +
        540
      ) %
        360 -
      180
    );
  }

  return {
    xw:
      start.xw +
      shortestAngleDelta(
        start.xw,
        end.xw
      ) *
        t,

    yw:
      start.yw +
      shortestAngleDelta(
        start.yw,
        end.yw
      ) *
        t,

    zw:
      start.zw +
      shortestAngleDelta(
        start.zw,
        end.zw
      ) *
        t,
  };
}


/*
 * Mathematical stereographic projection S^3 -> R^3 after
 * the selected SO(4) rotation.
 */
export function stereographicFigureEightS3Point(
  point4,
  projection =
    FIGURE_EIGHT_S3_SYMMETRIC_PROJECTION
) {
  const rotated =
    rotateFigureEightS3MixedPlanes(
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


/*
 * Cached default tube used by the constructor.
 *
 * The Projection Lab can still build arbitrary lambda/epsilon/rho
 * tubes; this convenience function is specifically the canonical
 * handoff endpoint.
 */
let defaultFigureEightS3TubeCache = null;

export function defaultFigureEightS3Tube() {
  if (
    defaultFigureEightS3TubeCache ===
    null
  ) {
    defaultFigureEightS3TubeCache =
      buildFigureEightS3Tube(
        DEFAULT_FIGURE_EIGHT_S3_NU,
        DEFAULT_FIGURE_EIGHT_S3_NV,
        DEFAULT_FIGURE_EIGHT_S3_GEOMETRY
      );
  }

  return defaultFigureEightS3TubeCache;
}


export function figureEightS3TubePoint4(
  routeAmount,
  minorAmount
) {
  return sampleFigureEightS3TubePoint4(
    defaultFigureEightS3Tube(),
    routeAmount,
    minorAmount
  );
}
