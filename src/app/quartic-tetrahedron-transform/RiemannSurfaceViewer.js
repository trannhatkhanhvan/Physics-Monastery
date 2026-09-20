'use client';

import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  MONODROMY_A_STAR,
  MONODROMY_B_STAR,
  MONODROMY_BASEPOINT,
  solveComplexQuartic,
  transportRootsAlongSegment,
} from './math/monodromy';

import styles from
  './MonodromyStage.module.css';


const SVG_WIDTH = 700;
const SVG_HEIGHT = 690;

const CENTER = {
  x: SVG_WIDTH / 2,
  y: 238,
};

const SPHERE_RADIUS = 205;

const ROOT_MAP = {
  x: 38,
  y: 480,
  width: 624,
  height: 178,
};

const ROOT_MAP_RHO_MIN =
  -4.5;

const ROOT_MAP_RHO_MAX =
  4.5;

const DRAG_ROTATION_SPEED =
  0.006;

const MIN_ZOOM =
  0.55;

const MAX_ZOOM =
  1.9;


/*
 * Sphere special-point equation labels.
 *
 * IMPORTANT:
 * These are sized BY FONT, not by SVG width or height.
 *
 * The equation SVGs use the same 12px source-font basis as the
 * existing Monodromy labels, so the rendered scale is:
 *
 *     desired font size / 12
 */
const SPHERE_SPECIAL_LABEL_FONT_SIZE =
  12;


const ROOT_COLORS = [
  '#ff4040',
  '#ffe600',
  '#47d16c',
  '#2f8cff',
];

const ROOT_NAMES = [
  'ж₁',
  'ж₂',
  'ж₃',
  'ж₄',
];


const LATITUDE_STEPS =
  64;

const LONGITUDE_STEPS =
  128;

const CUT_EDGE_SAMPLES =
  24;


/*
 * Progressive analytic-fill refinement.
 *
 * Refinement work must NEVER run as one large synchronous
 * module-level computation.
 *
 * The working coarse sphere is rendered immediately. Expensive
 * refinement work is then allowed to advance in small batches
 * after React has mounted the viewer.
 *
 * For this first patch the scheduler only walks the existing
 * cells. It deliberately does NOT replace the visible fill yet.
 */
const REFINEMENT_BATCH_SIZE =
  128;

/*
 * Only cells touching the existing seam are subdivided.
 *
 * 4 means:
 *
 *     one coarse seam cell -> 4 x 4 local cells.
 *
 * This is intentionally modest for the first visible test.
 */
const SEAM_LOCAL_SUBDIVISIONS =
  8;


/*
 * Shared post-mount refined coloring cache.
 *
 * Both Riemann viewers use the same sphere partition, so the
 * expensive seam-local refinement must be computed only once.
 */
let REFINED_SPHERE_CELLS_CACHE =
  null;


/*
 * Persistent cache for the finished refined sphere partition.
 *
 * The convention angle is fixed at 180 degrees, so this geometry
 * is deterministic.
 *
 * The previous module-only cache disappeared on every browser
 * reload, forcing buildLocallyRefinedSphereCells() to run again.
 *
 * Store the completed polygons persistently instead.
 */
const REFINED_SPHERE_STORAGE_KEY =
  'quartic-riemann-refined-v8-direct-seam-edge-l64-x128-sub8-simple-x';


/*
 * Compact binary encoding.
 *
 * Each coordinate lies on the unit sphere, so signed 16-bit
 * quantization gives far more precision than the screen requires
 * while keeping the persistent cache small.
 */
function encodeRefinedSphereCells(
  cells
) {
  let byteLength = 0;

  cells.forEach(
    cell => {
      byteLength +=
        2 +
        6 * cell.vertices.length;
    }
  );

  const buffer =
    new ArrayBuffer(
      byteLength
    );

  const view =
    new DataView(buffer);

  let offset = 0;

  cells.forEach(
    cell => {
      view.setUint8(
        offset++,
        cell.regionIndex ?? 0
      );

      view.setUint8(
        offset++,
        cell.vertices.length
      );

      cell.vertices.forEach(
        vertex => {
          [
            vertex.x,
            vertex.y,
            vertex.z,
          ].forEach(
            coordinate => {
              view.setInt16(
                offset,
                Math.round(
                  clamp(
                    coordinate,
                    -1,
                    1
                  ) * 32767
                ),
                true
              );

              offset += 2;
            }
          );
        }
      );
    }
  );

  const bytes =
    new Uint8Array(buffer);

  let binary = '';
  const chunkSize = 0x8000;

  for (
    let index = 0;
    index < bytes.length;
    index += chunkSize
  ) {
    binary +=
      String.fromCharCode(
        ...bytes.subarray(
          index,
          Math.min(
            index + chunkSize,
            bytes.length
          )
        )
      );
  }

  return btoa(binary);
}


function decodeRefinedSphereCells(
  encoded
) {
  if (!encoded) {
    return null;
  }

  try {
    const binary =
      atob(encoded);

    const buffer =
      new ArrayBuffer(
        binary.length
      );

    const bytes =
      new Uint8Array(buffer);

    for (
      let index = 0;
      index < binary.length;
      index += 1
    ) {
      bytes[index] =
        binary.charCodeAt(index);
    }

    const view =
      new DataView(buffer);

    const cells = [];

    let offset = 0;
    let cellIndex = 0;

    while (
      offset + 2 <=
      view.byteLength
    ) {
      const regionIndex =
        view.getUint8(
          offset++
        );

      const vertexCount =
        view.getUint8(
          offset++
        );

      if (
        vertexCount < 3 ||
        offset +
          6 * vertexCount >
          view.byteLength
      ) {
        return null;
      }

      const vertices = [];

      for (
        let vertexIndex = 0;
        vertexIndex < vertexCount;
        vertexIndex += 1
      ) {
        vertices.push({
          x:
            view.getInt16(
              offset,
              true
            ) / 32767,

          y:
            view.getInt16(
              offset + 2,
              true
            ) / 32767,

          z:
            view.getInt16(
              offset + 4,
              true
            ) / 32767,
        });

        offset += 6;
      }

      cells.push({
        key:
          `cached-refined-${cellIndex++}`,

        regionIndex,
        vertices,
      });
    }

    return cells.length
      ? cells
      : null;
  } catch (error) {
    console.warn(
      '[Riemann surface] refined cache read failed',
      error
    );

    return null;
  }
}


function loadPersistentRefinedSphereCells() {
  if (
    typeof window ===
    'undefined'
  ) {
    return null;
  }

  try {
    return decodeRefinedSphereCells(
      window.localStorage.getItem(
        REFINED_SPHERE_STORAGE_KEY
      )
    );
  } catch (error) {
    return null;
  }
}


function savePersistentRefinedSphereCells(
  cells
) {
  if (
    typeof window ===
      'undefined' ||
    !cells?.length
  ) {
    return;
  }

  try {
    /*
     * Keep only the current Riemann refined-surface cache.
     * Old versioned geometry is obsolete and can otherwise fill
     * the browser's localStorage quota during development.
     */
    const staleKeys = [];

    for (
      let index = 0;
      index <
        window.localStorage.length;
      index += 1
    ) {
      const key =
        window.localStorage.key(
          index
        );

      if (
        key &&
        key.startsWith(
          'quartic-riemann-refined-'
        ) &&
        key !==
          REFINED_SPHERE_STORAGE_KEY
      ) {
        staleKeys.push(
          key
        );
      }
    }

    staleKeys.forEach(
      key =>
        window.localStorage
          .removeItem(key)
    );


    window.localStorage.setItem(
      REFINED_SPHERE_STORAGE_KEY,
      encodeRefinedSphereCells(
        cells
      )
    );
  } catch (error) {
    console.warn(
      '[Riemann surface] refined cache write failed',
      error
    );
  }
}


/*
 * Compact branch-cut tree in the a-sphere.
 *
 * Four finite branch values connect to a central regular
 * vertex at a = 0. A fifth edge runs from 0 to infinity
 * along the north-west diagonal.
 *
 * The complement of this tree in CP^1_a is simply
 * connected.
 *
 * Importantly, the physical basepoint lies off this tree,
 * so the four established root identities can seed the
 * four lifted regions unambiguously.
 */
const CUT_TREE_FINITE_EDGES = [
  [
    {
      re: 0,
      im: 0,
    },
    {
      re: MONODROMY_A_STAR,
      im: 0,
    },
  ],

  [
    {
      re: 0,
      im: 0,
    },
    {
      re: -MONODROMY_A_STAR,
      im: 0,
    },
  ],

  [
    {
      re: 0,
      im: 0,
    },
    {
      re: 0,
      im: MONODROMY_B_STAR,
    },
  ],

  [
    {
      re: 0,
      im: 0,
    },
    {
      re: 0,
      im: -MONODROMY_B_STAR,
    },
  ],
];


let CUT_TREE_INFINITY_RAY = {
  origin: {
    re: 0,
    im: 0,
  },

  /*
   * Fixed coloring convention:
   *
   *     theta_conv = pi = 180 degrees.
   *
   * The infinity ray therefore runs along the
   * negative real a-axis.
   */
  direction: {
    re: -1,
    im: 0,
  },
};


/*
 * The compact Riemann surface of
 *
 *   a(x) = x^3/(2pi) + x + 1/x
 *
 * is CP^1_x.
 *
 * We render CP^1 as the unit sphere using inverse
 * stereographic projection:
 *
 *   x = u + iv
 *
 *       ( 2u, 2v, |x|^2 - 1 )
 *   ->  ------------------------
 *             1 + |x|^2
 *
 * Hence:
 *
 *   x = 0        -> south pole
 *   x = infinity -> north pole
 */


const IDENTITY_ROTATION = [
  1, 0, 0,
  0, 1, 0,
  0, 0, 1,
];


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


function rotationX(angle) {
  const c =
    Math.cos(angle);

  const s =
    Math.sin(angle);

  return [
    1, 0, 0,
    0, c, -s,
    0, s, c,
  ];
}


function rotationY(angle) {
  const c =
    Math.cos(angle);

  const s =
    Math.sin(angle);

  return [
    c, 0, -s,
    0, 1, 0,
    s, 0, c,
  ];
}


function multiplyRotations(
  left,
  right
) {
  const result =
    new Array(9);

  for (
    let row = 0;
    row < 3;
    row += 1
  ) {
    for (
      let column = 0;
      column < 3;
      column += 1
    ) {
      result[
        row * 3 + column
      ] =
        left[row * 3] *
          right[column] +
        left[row * 3 + 1] *
          right[3 + column] +
        left[row * 3 + 2] *
          right[6 + column];
    }
  }

  return result;
}


function applyRotation(
  point,
  rotation
) {
  return {
    x:
      rotation[0] * point.x +
      rotation[1] * point.y +
      rotation[2] * point.z,

    y:
      rotation[3] * point.x +
      rotation[4] * point.y +
      rotation[5] * point.z,

    z:
      rotation[6] * point.x +
      rotation[7] * point.y +
      rotation[8] * point.z,
  };
}


function stereographicPoint(
  re,
  im
) {
  const radiusSquared =
    re * re +
    im * im;

  const denominator =
    1 +
    radiusSquared;

  return {
    x:
      2 * re /
      denominator,

    y:
      2 * im /
      denominator,

    z:
      (
        radiusSquared -
        1
      ) /
      denominator,
  };
}


function spherePoint(
  latitude,
  longitude
) {
  const cosLatitude =
    Math.cos(latitude);

  return {
    x:
      cosLatitude *
      Math.cos(longitude),

    y:
      cosLatitude *
      Math.sin(longitude),

    z:
      Math.sin(latitude),
  };
}


function dot3(
  left,
  right
) {
  return (
    left.x * right.x +
    left.y * right.y +
    left.z * right.z
  );
}


function normalize3(point) {
  const length =
    Math.hypot(
      point.x,
      point.y,
      point.z
    ) || 1;

  return {
    x:
      point.x / length,

    y:
      point.y / length,

    z:
      point.z / length,
  };
}


function slerpSphere(
  first,
  second,
  t
) {
  const cosine =
    clamp(
      dot3(
        first,
        second
      ),
      -1,
      1
    );

  const angle =
    Math.acos(cosine);

  if (angle < 1e-8) {
    return normalize3({
      x:
        first.x +
        (
          second.x -
          first.x
        ) * t,

      y:
        first.y +
        (
          second.y -
          first.y
        ) * t,

      z:
        first.z +
        (
          second.z -
          first.z
        ) * t,
    });
  }

  const sine =
    Math.sin(angle);

  const firstWeight =
    Math.sin(
      (1 - t) *
      angle
    ) /
    sine;

  const secondWeight =
    Math.sin(
      t *
      angle
    ) /
    sine;

  return normalize3({
    x:
      first.x *
        firstWeight +
      second.x *
        secondWeight,

    y:
      first.y *
        firstWeight +
      second.y *
        secondWeight,

    z:
      first.z *
        firstWeight +
      second.z *
        secondWeight,
  });
}


/*
 * Inverse stereographic coordinate:
 *
 *       X + iY
 * x = ----------
 *        1 - Z
 *
 * The north pole Z = 1 is x = infinity.
 */
/*
 * Intersect a short great-circle segment with the latitude
 *
 *     z = targetZ.
 *
 * We use spherical interpolation rather than a straight 3D chord,
 * so the result remains on CP^1_x = S^2.
 */
function sphereSegmentAtZ(
  first,
  second,
  targetZ
) {
  const firstDelta =
    first.z -
    targetZ;

  const secondDelta =
    second.z -
    targetZ;


  if (
    Math.abs(firstDelta) <
    1e-10
  ) {
    return first;
  }

  if (
    Math.abs(secondDelta) <
    1e-10
  ) {
    return second;
  }


  let low = 0;
  let high = 1;

  let lowDelta =
    firstDelta;


  for (
    let iteration = 0;
    iteration < 32;
    iteration += 1
  ) {
    const middle =
      (
        low +
        high
      ) / 2;

    const point =
      slerpSphere(
        first,
        second,
        middle
      );

    const middleDelta =
      point.z -
      targetZ;


    if (
      Math.abs(middleDelta) <
      1e-11
    ) {
      return point;
    }


    if (
      (
        lowDelta <= 0 &&
        middleDelta <= 0
      ) ||
      (
        lowDelta >= 0 &&
        middleDelta >= 0
      )
    ) {
      low =
        middle;

      lowDelta =
        middleDelta;
    } else {
      high =
        middle;
    }
  }


  return slerpSphere(
    first,
    second,
    (
      low +
      high
    ) / 2
  );
}


/*
 * Keep the portion of a spherical polygon satisfying
 *
 *     z <= maximumZ.
 *
 * This is exactly the stereographic disk
 *
 *     |x| <= R.
 */
function clipSpherePolygonAtZ(
  vertices,
  maximumZ
) {
  if (
    maximumZ >=
    1 - 1e-10
  ) {
    return vertices;
  }


  const output = [];

  for (
    let index = 0;
    index < vertices.length;
    index += 1
  ) {
    const current =
      vertices[index];

    const previous =
      vertices[
        (
          index +
          vertices.length -
          1
        ) %
        vertices.length
      ];


    const currentInside =
      current.z <=
      maximumZ +
      1e-10;

    const previousInside =
      previous.z <=
      maximumZ +
      1e-10;


    if (
      currentInside &&
      previousInside
    ) {
      output.push(
        current
      );

      continue;
    }


    if (
      previousInside &&
      !currentInside
    ) {
      output.push(
        sphereSegmentAtZ(
          previous,
          current,
          maximumZ
        )
      );

      continue;
    }


    if (
      !previousInside &&
      currentInside
    ) {
      output.push(
        sphereSegmentAtZ(
          previous,
          current,
          maximumZ
        )
      );

      output.push(
        current
      );
    }
  }


  return output;
}


/*
 * Clip an analytic seam polyline to the same stereographic disk.
 *
 * Multiple visible pieces can result, so this returns an array
 * of point arrays.
 */
function clipSpherePolylineAtZ(
  points,
  maximumZ
) {
  if (
    maximumZ >=
    1 - 1e-10
  ) {
    return [
      points,
    ];
  }


  const pieces = [];

  let currentPiece = [];


  function finishPiece() {
    if (
      currentPiece.length >= 2
    ) {
      pieces.push(
        currentPiece
      );
    }

    currentPiece = [];
  }


  for (
    let index = 0;
    index <
      points.length - 1;
    index += 1
  ) {
    const first =
      points[index];

    const second =
      points[
        index + 1
      ];


    const firstInside =
      first.z <=
      maximumZ +
      1e-10;

    const secondInside =
      second.z <=
      maximumZ +
      1e-10;


    if (
      firstInside &&
      currentPiece.length === 0
    ) {
      currentPiece.push(
        first
      );
    }


    if (
      firstInside &&
      secondInside
    ) {
      currentPiece.push(
        second
      );

      continue;
    }


    if (
      firstInside &&
      !secondInside
    ) {
      currentPiece.push(
        sphereSegmentAtZ(
          first,
          second,
          maximumZ
        )
      );

      finishPiece();

      continue;
    }


    if (
      !firstInside &&
      secondInside
    ) {
      currentPiece = [
        sphereSegmentAtZ(
          first,
          second,
          maximumZ
        ),

        second,
      ];
    }
  }


  finishPiece();

  return pieces;
}


function sphereToComplex(point) {
  const denominator =
    1 - point.z;

  if (
    Math.abs(
      denominator
    ) < 1e-10
  ) {
    return null;
  }

  return {
    re:
      point.x /
      denominator,

    im:
      point.y /
      denominator,
  };
}


/*
 * The rational covering map itself:
 *
 *   a(x) =
 *     x^3/(2pi) + x + 1/x.
 */
/*
 * Cylinder coordinate on CP^1_x minus {0, infinity}:
 *
 *     rho   = log |x|
 *     theta = arg x
 */
function spherePointToLogPolar(
  point
) {
  const theta =
    Math.atan2(
      point.y,
      point.x
    );


  if (
    point.z <=
    -1 + 1e-10
  ) {
    return {
      rho:
        ROOT_MAP_RHO_MIN,

      theta,
    };
  }


  if (
    point.z >=
    1 - 1e-10
  ) {
    return {
      rho:
        ROOT_MAP_RHO_MAX,

      theta,
    };
  }


  const x =
    sphereToComplex(
      point
    );

  if (!x) {
    return null;
  }


  const radius =
    Math.hypot(
      x.re,
      x.im
    );


  if (
    !Number.isFinite(radius) ||
    radius <= 0
  ) {
    return null;
  }


  return {
    rho:
      clamp(
        Math.log(radius),
        ROOT_MAP_RHO_MIN,
        ROOT_MAP_RHO_MAX
      ),

    theta:
      Math.atan2(
        x.im,
        x.re
      ),
  };
}



/*
 * Map a spherical polygon to the log-polar cylinder
 *
 *     (rho, theta) = (log |x|, arg x).
 *
 * IMPORTANT:
 *
 * At x = 0 and x = infinity the compact sphere has a single
 * point, but the OPEN log-polar cylinder has an entire limiting
 * theta boundary.
 *
 * Therefore an exact pole vertex must retain the longitude from
 * which the polygon approaches that pole. Using atan2(0, 0)
 * would incorrectly collapse every approach direction to
 * theta = 0 and create artificial triangular wedges.
 */
function spherePolygonToLogPolar(
  vertices
) {
  const mapped =
    vertices.map(
      spherePointToLogPolar
    );


  for (
    let index = 0;
    index < vertices.length;
    index += 1
  ) {
    const vertex =
      vertices[index];

    const atPole =
      Math.abs(
        Math.abs(vertex.z) - 1
      ) < 1e-10;


    if (!atPole) {
      continue;
    }


    const previousIndex =
      (
        index +
        vertices.length -
        1
      ) %
      vertices.length;

    const nextIndex =
      (
        index + 1
      ) %
      vertices.length;

    const previousVertex =
      vertices[
        previousIndex
      ];

    const nextVertex =
      vertices[
        nextIndex
      ];


    const previousIsPole =
      Math.abs(
        Math.abs(previousVertex.z) - 1
      ) < 1e-10;

    const nextIsPole =
      Math.abs(
        Math.abs(nextVertex.z) - 1
      ) < 1e-10;


    /*
     * A normal latitude/longitude cell has two coincident
     * geometric vertices at the pole:
     *
     *     pole A ---- pole B
     *       |          |
     *       |          |
     *     edge A ---- edge B
     *
     * pole A must inherit edge A's longitude and pole B must
     * inherit edge B's longitude.
     */
    let source = null;

    if (
      !previousIsPole &&
      nextIsPole
    ) {
      source =
        mapped[
          previousIndex
        ];
    } else if (
      previousIsPole &&
      !nextIsPole
    ) {
      source =
        mapped[
          nextIndex
        ];
    } else if (
      !previousIsPole
    ) {
      source =
        mapped[
          previousIndex
        ];
    } else if (
      !nextIsPole
    ) {
      source =
        mapped[
          nextIndex
        ];
    }


    if (source) {
      mapped[index] = {
        ...mapped[index],

        theta:
          source.theta,
      };
    }
  }


  return mapped;
}


/*
 * Same pole rule for an analytic seam polyline.
 *
 * A seam ending at x = 0 or x = infinity keeps the limiting
 * angle of its neighboring finite point instead of snapping
 * its endpoint to theta = 0.
 */
function spherePolylineToLogPolar(
  points
) {
  const mapped =
    points.map(
      spherePointToLogPolar
    );


  for (
    let index = 0;
    index < points.length;
    index += 1
  ) {
    const point =
      points[index];

    const atPole =
      Math.abs(
        Math.abs(point.z) - 1
      ) < 1e-10;


    if (!atPole) {
      continue;
    }


    let source = null;


    if (
      index > 0 &&
      mapped[index - 1]
    ) {
      source =
        mapped[index - 1];
    } else if (
      index + 1 <
        mapped.length &&
      mapped[index + 1]
    ) {
      source =
        mapped[index + 1];
    }


    if (source) {
      mapped[index] = {
        ...mapped[index],

        theta:
          source.theta,
      };
    }
  }


  return mapped;
}


function parameterFromX(x) {
  if (!x) {
    return null;
  }

  const x2 = {
    re:
      x.re * x.re -
      x.im * x.im,

    im:
      2 *
      x.re *
      x.im,
  };

  const x3 = {
    re:
      x2.re * x.re -
      x2.im * x.im,

    im:
      x2.re * x.im +
      x2.im * x.re,
  };

  const radiusSquared =
    x.re * x.re +
    x.im * x.im;

  if (
    radiusSquared <
    1e-16
  ) {
    return null;
  }

  return {
    re:
      x3.re /
        (2 * Math.PI) +
      x.re +
      x.re /
        radiusSquared,

    im:
      x3.im /
        (2 * Math.PI) +
      x.im -
      x.im /
        radiusSquared,
  };
}


function cross2(
  first,
  second
) {
  return (
    first.re *
      second.im -
    first.im *
      second.re
  );
}


function subtract2(
  first,
  second
) {
  return {
    re:
      first.re -
      second.re,

    im:
      first.im -
      second.im,
  };
}


function segmentsIntersect(
  firstStart,
  firstEnd,
  secondStart,
  secondEnd
) {
  const firstDirection =
    subtract2(
      firstEnd,
      firstStart
    );

  const secondDirection =
    subtract2(
      secondEnd,
      secondStart
    );

  const denominator =
    cross2(
      firstDirection,
      secondDirection
    );

  if (
    Math.abs(
      denominator
    ) < 1e-12
  ) {
    return false;
  }

  const offset =
    subtract2(
      secondStart,
      firstStart
    );

  const firstParameter =
    cross2(
      offset,
      secondDirection
    ) /
    denominator;

  const secondParameter =
    cross2(
      offset,
      firstDirection
    ) /
    denominator;

  return (
    firstParameter >= -1e-8 &&
    firstParameter <= 1 + 1e-8 &&
    secondParameter >= -1e-8 &&
    secondParameter <= 1 + 1e-8
  );
}


function segmentIntersectsRay(
  segmentStart,
  segmentEnd,
  rayOrigin,
  rayDirection
) {
  const segmentDirection =
    subtract2(
      segmentEnd,
      segmentStart
    );

  const denominator =
    cross2(
      segmentDirection,
      rayDirection
    );

  if (
    Math.abs(
      denominator
    ) < 1e-12
  ) {
    return false;
  }

  const offset =
    subtract2(
      rayOrigin,
      segmentStart
    );

  const segmentParameter =
    cross2(
      offset,
      rayDirection
    ) /
    denominator;

  const rayParameter =
    cross2(
      offset,
      segmentDirection
    ) /
    denominator;

  return (
    segmentParameter >= -1e-8 &&
    segmentParameter <= 1 + 1e-8 &&
    rayParameter >= -1e-8
  );
}


function parameterSegmentCrossesCutTree(
  first,
  second
) {
  for (
    const [
      start,
      end,
    ]
    of CUT_TREE_FINITE_EDGES
  ) {
    if (
      segmentsIntersect(
        first,
        second,
        start,
        end
      )
    ) {
      return true;
    }
  }

  return segmentIntersectsRay(
    first,
    second,
    CUT_TREE_INFINITY_RAY
      .origin,
    CUT_TREE_INFINITY_RAY
      .direction
  );
}


/*
 * Sample a short great-circle edge in the x-sphere, map it
 * through a(x), and ask whether that image crosses our
 * branch-cut tree.
 *
 * Therefore this is literally testing membership in
 *
 *     a^{-1}(Gamma).
 */
function sphereEdgeCrossesCutTree(
  first,
  second
) {
  let previousParameter =
    null;

  for (
    let sample = 0;
    sample <=
      CUT_EDGE_SAMPLES;
    sample += 1
  ) {
    const point =
      slerpSphere(
        first,
        second,
        sample /
          CUT_EDGE_SAMPLES
      );

    const parameter =
      parameterFromX(
        sphereToComplex(
          point
        )
      );

    if (
      previousParameter &&
      parameter &&
      parameterSegmentCrossesCutTree(
        previousParameter,
        parameter
      )
    ) {
      return true;
    }

    if (parameter) {
      previousParameter =
        parameter;
    }
  }

  return false;
}


/*
 * Use exactly the established basepoint ordering:
 *
 *   root 1 = smaller real root
 *   root 2 = larger real root
 *   root 3 = upper complex root
 *   root 4 = lower complex root
 */
function labelBaseRoots(
  roots
) {
  const realRoots =
    roots
      .filter(
        root =>
          Math.abs(
            root.im
          ) < 1e-8
      )
      .sort(
        (left, right) =>
          left.re -
          right.re
      );

  const complexRoots =
    roots
      .filter(
        root =>
          Math.abs(
            root.im
          ) >= 1e-8
      )
      .sort(
        (left, right) =>
          right.im -
          left.im
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

  return [...roots]
    .sort(
      (left, right) => {
        if (
          Math.abs(
            left.im -
            right.im
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


/*
 * Trace the ACTUAL pullback of the compact branch-cut tree.
 *
 * For each edge gamma in the a-sphere we analytically continue
 * all four labelled roots x_i(a) along gamma. Their images on
 * CP^1_x are the true seam curves a^{-1}(Gamma).
 */
const TRUE_SEAM_FINITE_SAMPLES =
  96;

const TRUE_SEAM_INFINITY_SAMPLES =
  144;

const TRUE_SEAM_INFINITY_RADIUS =
  36;


function cloneComplex(point) {
  return {
    re: point.re,
    im: point.im,
  };
}


function interpolateComplex(
  first,
  second,
  t
) {
  return {
    re:
      first.re +
      (
        second.re -
        first.re
      ) * t,

    im:
      first.im +
      (
        second.im -
        first.im
      ) * t,
  };
}


function transportThroughWaypoints(
  startA,
  startRoots,
  waypoints
) {
  let currentA =
    cloneComplex(startA);

  let currentRoots =
    startRoots.map(
      cloneComplex
    );

  waypoints.forEach(
    waypoint => {
      const transported =
        transportRootsAlongSegment({
          fromA:
            currentA,

          roots:
            currentRoots,

          toA:
            waypoint,

          maxParameterStep:
            0.06,
        });

      currentA =
        cloneComplex(
          transported.a
        );

      currentRoots =
        transported.roots.map(
          cloneComplex
        );
    }
  );

  return {
    a:
      currentA,

    roots:
      currentRoots,
  };
}


/*
 * Carry the four physical-basepoint labels to the regular
 * cut-tree vertex a = 0 along a path that avoids all branch
 * values.
 */
function buildRootsAtCutTreeCenter() {
  const baseRoots =
    labelBaseRoots(
      solveComplexQuartic(
        MONODROMY_BASEPOINT
      )
    );

  const baseRe =
    MONODROMY_BASEPOINT.re;

  return transportThroughWaypoints(
    MONODROMY_BASEPOINT,
    baseRoots,
    [
      {
        re: baseRe,
        im: 1.0,
      },

      {
        re: 0.8,
        im: 1.0,
      },

      {
        re: 0.8,
        im: 0.6,
      },

      {
        re: 0,
        im: 0,
      },
    ]
  ).roots;
}


function traceParameterEdge({
  id,
  start,
  end,
  startRoots,
  sampleCount,
  parameterAt = null,
  closeAtInfinity = false,
}) {
  let currentA =
    cloneComplex(start);

  let currentRoots =
    startRoots.map(
      cloneComplex
    );

  const rootCurves =
    currentRoots.map(
      (
        root,
        rootIndex
      ) => ({
        key:
          `${id}-root-${rootIndex}`,

        rootIndex,

        points: [
          stereographicPoint(
            root.re,
            root.im
          ),
        ],
      })
    );


  for (
    let index = 1;
    index <= sampleCount;
    index += 1
  ) {
    const t =
      index /
      sampleCount;

    const nextA =
      parameterAt
        ? parameterAt(t)
        : interpolateComplex(
            start,
            end,
            t
          );

    const transported =
      transportRootsAlongSegment({
        fromA:
          currentA,

        roots:
          currentRoots,

        toA:
          nextA,

        maxParameterStep:
          closeAtInfinity
            ? 0.10
            : 0.04,
      });

    currentA =
      cloneComplex(
        transported.a
      );

    currentRoots =
      transported.roots.map(
        cloneComplex
      );

    currentRoots.forEach(
      (
        root,
        rootIndex
      ) => {
        rootCurves[
          rootIndex
        ].points.push(
          stereographicPoint(
            root.re,
            root.im
          )
        );
      }
    );
  }


  /*
   * On the infinity edge:
   *
   *   one root -> x = 0,
   *   three roots -> x = infinity.
   *
   * At a large finite radius identify the unique small root,
   * then close the four curves at the exact compactification
   * points.
   */
  if (closeAtInfinity) {
    const smallRootIndex =
      currentRoots
        .map(
          (
            root,
            rootIndex
          ) => ({
            rootIndex,

            magnitude:
              Math.hypot(
                root.re,
                root.im
              ),
          })
        )
        .sort(
          (
            left,
            right
          ) =>
            left.magnitude -
            right.magnitude
        )[0]
        .rootIndex;

    rootCurves.forEach(
      curve => {
        curve.points.push(
          curve.rootIndex ===
            smallRootIndex
            ? {
                x: 0,
                y: 0,
                z: -1,
              }
            : {
                x: 0,
                y: 0,
                z: 1,
              }
        );
      }
    );
  }

  return rootCurves;
}


function buildTrueSeamCurves() {
  const rootsAtZero =
    buildRootsAtCutTreeCenter();

  const zero = {
    re: 0,
    im: 0,
  };

  const curves = [];


  /*
   * Four finite tree edges:
   *
   *   0 -> +a1
   *   0 -> -a1
   *   0 -> +i b1
   *   0 -> -i b1
   *
   * Each edge has four lifts.
   */
  CUT_TREE_FINITE_EDGES.forEach(
    (
      [
        start,
        end,
      ],
      edgeIndex
    ) => {
      curves.push(
        ...traceParameterEdge({
          id:
            `finite-${edgeIndex}`,

          start,
          end,

          startRoots:
            rootsAtZero,

          sampleCount:
            TRUE_SEAM_FINITE_SAMPLES,
        })
      );
    }
  );


  /*
   * Fifth tree edge:
   *
   *   0 -> infinity
   *
   * along the same north-west ray used by the numerical
   * decomposition.
   */
  const directionLength =
    Math.hypot(
      CUT_TREE_INFINITY_RAY
        .direction.re,

      CUT_TREE_INFINITY_RAY
        .direction.im
    );

  const direction = {
    re:
      CUT_TREE_INFINITY_RAY
        .direction.re /
      directionLength,

    im:
      CUT_TREE_INFINITY_RAY
        .direction.im /
      directionLength,
  };


  curves.push(
    ...traceParameterEdge({
      id:
        'infinity',

      start:
        zero,

      end: {
        re:
          direction.re *
          TRUE_SEAM_INFINITY_RADIUS,

        im:
          direction.im *
          TRUE_SEAM_INFINITY_RADIUS,
      },

      startRoots:
        rootsAtZero,

      sampleCount:
        TRUE_SEAM_INFINITY_SAMPLES,

      closeAtInfinity:
        true,

      parameterAt:
        t => {
          /*
           * Quadratic radial spacing gives more resolution near
           * a = 0 while still reaching far enough out that the
           * asymptotic split 1 + 3 is already unmistakable.
           */
          const radius =
            TRUE_SEAM_INFINITY_RADIUS *
            t *
            t;

          return {
            re:
              direction.re *
              radius,

            im:
              direction.im *
              radius,
          };
        },
    })
  );


  return curves;
}


console.time('[Riemann startup] true seam curves');
let TRUE_SEAM_CURVES =
  buildTrueSeamCurves();
console.timeEnd('[Riemann startup] true seam curves');


/*
 * COMPLETE REAL-a ROOT PATHS.
 *
 * These are NOT sheet seams. They are the complete inverse image of
 * the real parameter axis under
 *
 *   a(x) = x^3/(2pi) + x + 1/x.
 *
 * The old construction stopped at a = +/-36. That meant the moving
 * roots could literally outrun the displayed trajectory.
 *
 * Here we compactify the real parameter axis:
 *
 *   -infinity < a < +infinity.
 *
 * Numerically we sample it with
 *
 *   a(u) = sinh(K u),   -1 <= u <= 1,
 *
 * using a large enough K that the finite endpoints already lie beyond
 * the visible log-|x| cylinder. We then close each end at the exact
 * compactification point:
 *
 *   one root  -> x = 0
 *   three     -> x = infinity.
 *
 * Roots are solved independently at each sample and matched to the
 * previous sample by the globally smallest four-root displacement.
 * This avoids forcing transportRootsAlongSegment through enormous
 * parameter intervals near infinity.
 *
 * The SAME sphere-space curves drive both the compact sphere and the
 * radial root-domain map.
 */
const REAL_ROOT_PATH_SAMPLES =
  960;

const REAL_ROOT_PATH_SINH_SCALE =
  15;


function rootDistanceSquared(
  first,
  second
) {
  const dre =
    first.re - second.re;

  const dim =
    first.im - second.im;

  return (
    dre * dre +
    dim * dim
  );
}


function matchRootsToPrevious(
  previousRoots,
  nextRoots
) {
  /*
   * Four roots means only 4! = 24 permutations.
   * Exhaustive matching is tiny and removes any greedy ambiguity.
   */
  let best = null;
  let bestScore =
    Infinity;

  for (
    let i0 = 0;
    i0 < 4;
    i0 += 1
  ) {
    for (
      let i1 = 0;
      i1 < 4;
      i1 += 1
    ) {
      if (i1 === i0) {
        continue;
      }

      for (
        let i2 = 0;
        i2 < 4;
        i2 += 1
      ) {
        if (
          i2 === i0 ||
          i2 === i1
        ) {
          continue;
        }

        for (
          let i3 = 0;
          i3 < 4;
          i3 += 1
        ) {
          if (
            i3 === i0 ||
            i3 === i1 ||
            i3 === i2
          ) {
            continue;
          }

          const indices = [
            i0,
            i1,
            i2,
            i3,
          ];

          const score =
            indices.reduce(
              (
                total,
                nextIndex,
                rootIndex
              ) =>
                total +
                rootDistanceSquared(
                  previousRoots[
                    rootIndex
                  ],
                  nextRoots[
                    nextIndex
                  ]
                ),
              0
            );

          if (
            score <
            bestScore
          ) {
            bestScore =
              score;

            best =
              indices.map(
                nextIndex =>
                  cloneComplex(
                    nextRoots[
                      nextIndex
                    ]
                  )
              );
          }
        }
      }
    }
  }

  return best;
}


function compactificationPointForRoot(
  root,
  roots
) {
  const smallRootIndex =
    roots
      .map(
        (
          candidate,
          rootIndex
        ) => ({
          rootIndex,

          magnitude:
            Math.hypot(
              candidate.re,
              candidate.im
            ),
        })
      )
      .sort(
        (
          left,
          right
        ) =>
          left.magnitude -
          right.magnitude
      )[0]
      .rootIndex;

  const rootIndex =
    roots.indexOf(root);

  return (
    rootIndex ===
      smallRootIndex
      ? {
          x: 0,
          y: 0,
          z: -1,
        }
      : {
          x: 0,
          y: 0,
          z: 1,
        }
  );
}


function buildRealRootPathCurves() {
  /*
   * Start with the global compactified real-a sampling.
   */
  const sampledParameters =
    Array.from(
      {
        length:
          REAL_ROOT_PATH_SAMPLES +
          1,
      },
      (
        _,
        sampleIndex
      ) => {
        const u =
          -1 +
          2 *
          sampleIndex /
          REAL_ROOT_PATH_SAMPLES;

        return {
          re:
            Math.sinh(
              REAL_ROOT_PATH_SINH_SCALE *
              u
            ),
          im: 0,
        };
      }
    );

  /*
   * IMPORTANT:
   *
   * Force the exact finite real branch values a = ±a₁ into the
   * path sample list.
   *
   * At those parameters two roots literally coincide, so the
   * corresponding root paths should pass through the exact same
   * stereographic point rather than merely approaching it from
   * opposite sides of a sampling gap.
   */
  /*
   * Compute the real double root locally here.
   *
   * buildRealRootPathCurves() executes before the later module-level
   * REAL_DOUBLE_ROOT constant is initialized, so referencing that
   * later const here causes a temporal-dead-zone ReferenceError.
   *
   * This is the identical exact formula.
   */
  const realDoubleRootForPath =
    Math.sqrt(
      (
        -Math.PI +
        Math.sqrt(
          Math.PI ** 2 +
          6 * Math.PI
        )
      ) / 3
    );

  const exactRealBranchParameters = [
    parameterFromX({
      re:
        -realDoubleRootForPath,
      im: 0,
    }),
    parameterFromX({
      re:
        realDoubleRootForPath,
      im: 0,
    }),
  ].filter(Boolean);

  const mergedParameters =
    [
      ...sampledParameters,
      ...exactRealBranchParameters,
    ].sort(
      (
        left,
        right
      ) => left.re - right.re
    );

  /*
   * Deduplicate any accidental near-coincidence between the base
   * sinh-sampling and the inserted exact branch values.
   */
  const sampleParameters = [];

  mergedParameters.forEach(
    parameter => {
      const previous =
        sampleParameters[
          sampleParameters.length - 1
        ];

      if (
        previous &&
        Math.abs(
          previous.re -
          parameter.re
        ) < 1e-12 &&
        Math.abs(
          previous.im -
          parameter.im
        ) < 1e-12
      ) {
        return;
      }

      sampleParameters.push(
        parameter
      );
    }
  );

  const firstRoots =
    labelBaseRoots(
      solveComplexQuartic(
        sampleParameters[0]
      )
    );

  let previousRoots =
    firstRoots.map(
      cloneComplex
    );

  const rootCurves =
    previousRoots.map(
      (
        root,
        rootIndex
      ) => ({
        key:
          `real-a-root-path-root-${rootIndex}`,

        rootIndex,

        points: [
          stereographicPoint(
            root.re,
            root.im
          ),
        ],
      })
    );

  for (
    let sampleIndex = 1;
    sampleIndex <
      sampleParameters.length;
    sampleIndex += 1
  ) {
    const solvedRoots =
      solveComplexQuartic(
        sampleParameters[
          sampleIndex
        ]
      );

    const matchedRoots =
      matchRootsToPrevious(
        previousRoots,
        solvedRoots
      );

    if (
      !matchedRoots ||
      matchedRoots.length !== 4
    ) {
      throw new Error(
        'Unable to match complete real-a root paths'
      );
    }

    matchedRoots.forEach(
      (
        root,
        rootIndex
      ) => {
        rootCurves[
          rootIndex
        ].points.push(
          stereographicPoint(
            root.re,
            root.im
          )
        );
      }
    );

    previousRoots =
      matchedRoots;
  }


  /*
   * Close the +infinity end exactly.
   */
  const positiveInfinityRoots =
    previousRoots;

  const positiveSmallIndex =
    positiveInfinityRoots
      .map(
        (
          root,
          rootIndex
        ) => ({
          rootIndex,
          magnitude:
            Math.hypot(
              root.re,
              root.im
            ),
        })
      )
      .sort(
        (
          left,
          right
        ) =>
          left.magnitude -
          right.magnitude
      )[0]
      .rootIndex;

  rootCurves.forEach(
    (
      curve,
      rootIndex
    ) => {
      curve.points.push(
        rootIndex ===
          positiveSmallIndex
          ? {
              x: 0,
              y: 0,
              z: -1,
            }
          : {
              x: 0,
              y: 0,
              z: 1,
            }
      );
    }
  );


  /*
   * Close the -infinity end exactly.
   *
   * Prepend because the sampled curves run from negative to positive a.
   */
  const negativeInfinityRoots =
    firstRoots;

  const negativeSmallIndex =
    negativeInfinityRoots
      .map(
        (
          root,
          rootIndex
        ) => ({
          rootIndex,
          magnitude:
            Math.hypot(
              root.re,
              root.im
            ),
        })
      )
      .sort(
        (
          left,
          right
        ) =>
          left.magnitude -
          right.magnitude
      )[0]
      .rootIndex;

  rootCurves.forEach(
    (
      curve,
      rootIndex
    ) => {
      curve.points.unshift(
        rootIndex ===
          negativeSmallIndex
          ? {
              x: 0,
              y: 0,
              z: -1,
            }
          : {
              x: 0,
              y: 0,
              z: 1,
            }
      );
    }
  );

  return rootCurves;
}


console.time('[Riemann startup] real root paths');
const REAL_ROOT_PATH_CURVES =
  buildRealRootPathCurves();
console.timeEnd('[Riemann startup] real root paths');


/*
 * EQUATION-DERIVED SYMMETRY LOCI.
 *
 * The covering map is
 *
 *   a(x) = x^3/(2pi) + x + 1/x.
 *
 * Write
 *
 *   x = r e^(i theta),
 *   y = r^2.
 *
 * REAL PARAMETER LOCUS
 * --------------------
 *
 *   Im a(x) = 0
 *
 * gives:
 *
 *   theta = 0, +/-pi
 *
 * together with
 *
 *   ((3 - 4 sin^2 theta)/(2pi)) y^2
 *   + y - 1 = 0.
 *
 * These are exactly the x-values for which a is real.
 *
 *
 * IMAGINARY PARAMETER LOCUS
 * -------------------------
 *
 *   Re a(x) = 0
 *
 * gives:
 *
 *   theta = +/-pi/2
 *
 * together with
 *
 *   (cos 3theta/(2pi)) y^2
 *   + cos(theta) y
 *   + cos(theta) = 0.
 *
 * These are exactly the x-values for which a is purely imaginary.
 *
 *
 * IMPORTANT
 * ---------
 *
 * These loci are calculated directly from the equation.
 *
 * They do NOT depend on:
 *
 *   - the numerical root sweep
 *   - TRUE_SEAM_CURVES
 *   - any branch-cut convention
 *
 * That makes them an independent audit of the geometry.
 */
const SYMMETRY_LOCUS_ANGLE_SAMPLES =
  720;

const SYMMETRY_LOCUS_RADIAL_SAMPLES =
  160;


function logPolarSpherePoint(
  rho,
  theta
) {
  const radius =
    Math.exp(rho);

  return stereographicPoint(
    radius *
      Math.cos(theta),

    radius *
      Math.sin(theta)
  );
}


function positiveQuadraticRoots(
  a,
  b,
  c
) {
  const epsilon =
    1e-12;

  if (
    Math.abs(a) <
    epsilon
  ) {
    if (
      Math.abs(b) <
      epsilon
    ) {
      return [];
    }

    const root =
      -c / b;

    return root >
      epsilon
      ? [root]
      : [];
  }


  const discriminant =
    b * b -
    4 * a * c;

  if (
    discriminant <
    -epsilon
  ) {
    return [];
  }


  const squareRoot =
    Math.sqrt(
      Math.max(
        0,
        discriminant
      )
    );

  return [
    (
      -b -
      squareRoot
    ) /
      (2 * a),

    (
      -b +
      squareRoot
    ) /
      (2 * a),
  ]
    .filter(
      root =>
        Number.isFinite(
          root
        ) &&
        root >
          epsilon
    )
    .sort(
      (
        left,
        right
      ) =>
        left -
        right
    );
}


function buildRadialLocusCurve(
  theta,
  key
) {
  /*
   * Complete radial component on CP^1_x:
   *
   *     x = 0
   *       ->
   *     finite radii
   *       ->
   *     x = infinity.
   *
   * On the sphere these are the exact south and north poles.
   * On the log-|x| map they become the left and right boundaries.
   */
  const points = [
    {
      x: 0,
      y: 0,
      z: -1,
    },
  ];

  for (
    let index = 0;
    index <=
      SYMMETRY_LOCUS_RADIAL_SAMPLES;
    index += 1
  ) {
    const rho =
      ROOT_MAP_RHO_MIN +
      (
        ROOT_MAP_RHO_MAX -
        ROOT_MAP_RHO_MIN
      ) *
      index /
      SYMMETRY_LOCUS_RADIAL_SAMPLES;

    points.push(
      logPolarSpherePoint(
        rho,
        theta
      )
    );
  }

  points.push({
    x: 0,
    y: 0,
    z: 1,
  });

  return {
    key,
    points,
  };
}


function buildRealParameterLocusCurves() {
  const curvedPoints = [];

  for (
    let index = 0;
    index <=
      SYMMETRY_LOCUS_ANGLE_SAMPLES;
    index += 1
  ) {
    const theta =
      -Math.PI +
      2 *
      Math.PI *
      index /
      SYMMETRY_LOCUS_ANGLE_SAMPLES;

    const sine =
      Math.sin(
        theta
      );

    const coefficient =
      (
        3 -
        4 *
        sine *
        sine
      ) /
      (2 * Math.PI);

    const roots =
      positiveQuadraticRoots(
        coefficient,
        1,
        -1
      );

    if (
      !roots.length
    ) {
      continue;
    }

    const rho =
      0.5 *
      Math.log(
        roots[0]
      );

    curvedPoints.push(
      logPolarSpherePoint(
        rho,
        theta
      )
    );
  }


  return [
    /*
     * The flat cylinder has separate +pi and -pi edges,
     * although they represent the same direction on CP^1.
     */
    buildRadialLocusCurve(
      -Math.PI,
      'real-locus-negative-pi-edge'
    ),

    buildRadialLocusCurve(
      0,
      'real-locus-real-axis'
    ),

    buildRadialLocusCurve(
      Math.PI,
      'real-locus-positive-pi-edge'
    ),

    {
      key:
        'real-locus-curved-branch',

      points:
        curvedPoints,
    },
  ];
}


function buildImaginaryParameterLocusCurves() {
  const curves = [
    /*
     * Exact radial components:
     *
     *     theta = -pi/2
     *     theta = +pi/2
     */
    buildRadialLocusCurve(
      -Math.PI / 2,
      'imaginary-locus-negative-axis'
    ),

    buildRadialLocusCurve(
      Math.PI / 2,
      'imaginary-locus-positive-axis'
    ),
  ];


  const northPole = {
    x: 0,
    y: 0,
    z: 1,
  };


  /*
   * Re a(x) = 0 gives
   *
   *   cos(3 theta)/(2 pi) y^2
   *   + cos(theta) y
   *   + cos(theta)
   *   = 0.
   *
   * Away from the separate radial components cos(theta)=0,
   *
   *   cos(3 theta)
   *   =
   *   cos(theta)
   *   (4 cos^2(theta) - 3),
   *
   * so the curved component satisfies
   *
   *   [(4 cos^2(theta) - 3)/(2 pi)] y^2
   *   + y
   *   + 1
   *   = 0.
   *
   * This form stays regular through theta = +/- pi/2.
   */
  const activeBranches = [
    [],
    [],
  ];

  let segmentCounter = 0;


  function finishBranch(
    branchIndex,
    closeAtInfinity = false
  ) {
    const points =
      activeBranches[
        branchIndex
      ];

    if (
      closeAtInfinity &&
      points.length
    ) {
      points.push({
        ...northPole,
      });
    }

    if (
      points.length >= 2
    ) {
      curves.push({
        key:
          `imaginary-locus-curved-${branchIndex}-${segmentCounter}`,

        points: [
          ...points,
        ],
      });

      segmentCounter += 1;
    }

    activeBranches[
      branchIndex
    ] = [];
  }


  for (
    let index = 0;
    index <=
      SYMMETRY_LOCUS_ANGLE_SAMPLES;
    index += 1
  ) {
    const theta =
      -Math.PI +
      2 *
      Math.PI *
      index /
      SYMMETRY_LOCUS_ANGLE_SAMPLES;

    const cosine =
      Math.cos(
        theta
      );

    const coefficient =
      (
        4 *
        cosine *
        cosine -
        3
      ) /
      (2 * Math.PI);

    const roots =
      positiveQuadraticRoots(
        coefficient,
        1,
        1
      );


    for (
      let branchIndex = 0;
      branchIndex < 2;
      branchIndex += 1
    ) {
      const root =
        roots[
          branchIndex
        ];

      if (!root) {
        finishBranch(
          branchIndex,
          true
        );

        continue;
      }


      /*
       * A newly appearing finite arm comes in from x = infinity.
       */
      if (
        activeBranches[
          branchIndex
        ].length === 0
      ) {
        activeBranches[
          branchIndex
        ].push({
          ...northPole,
        });
      }


      const rho =
        0.5 *
        Math.log(
          root
        );


      /*
       * DO NOT clip rho to ROOT_MAP_RHO_MIN/MAX here.
       *
       * The equation defines a curve on the compact sphere.
       * The map projection handles the visible chart boundary.
       */
      activeBranches[
        branchIndex
      ].push(
        logPolarSpherePoint(
          rho,
          theta
        )
      );
    }
  }


  finishBranch(
    0,
    true
  );

  finishBranch(
    1,
    true
  );


  return curves;
}


const REAL_PARAMETER_LOCUS_CURVES =
  buildRealParameterLocusCurves();


const IMAGINARY_PARAMETER_LOCUS_CURVES =
  buildImaginaryParameterLocusCurves();



/*
 * Exact finite ramification points in the x-coordinate.
 *
 * They are the double roots over the four finite branch
 * values of the a-map.
 */
const BRANCH_RADICAL =
  Math.sqrt(
    Math.PI ** 2 +
    6 * Math.PI
  );

const REAL_DOUBLE_ROOT =
  Math.sqrt(
    (
      -Math.PI +
      BRANCH_RADICAL
    ) / 3
  );

const IMAG_DOUBLE_ROOT =
  Math.sqrt(
    (
      Math.PI +
      BRANCH_RADICAL
    ) / 3
  );


const RAMIFICATION_POINTS = [
  {
    id: 'plus-a3',
    label: '+a₁',
    monodromy: '(12)',
    description:
      'finite simple ramification',
    point:
      stereographicPoint(
        REAL_DOUBLE_ROOT,
        0
      ),
  },
  {
    id: 'minus-a3',
    label: '−a₁',
    monodromy: '(14)',
    description:
      'finite simple ramification',
    point:
      stereographicPoint(
        -REAL_DOUBLE_ROOT,
        0
      ),
  },
  {
    id: 'plus-b1',
    label: '+b₁',
    monodromy: '(23)',
    description:
      'finite simple ramification',
    point:
      stereographicPoint(
        0,
        IMAG_DOUBLE_ROOT
      ),
  },
  {
    id: 'minus-b1',
    label: '−b₁',
    monodromy: '(24)',
    description:
      'finite simple ramification',
    point:
      stereographicPoint(
        0,
        -IMAG_DOUBLE_ROOT
      ),
  },
  {
    id: 'x-zero',
    label: 'x = 0',
    monodromy: 'unramified',
    description:
      'point over a = ∞; unramified',
    point: {
      x: 0,
      y: 0,
      z: -1,
    },
  },
  {
    id: 'x-infinity',
    label: 'x = ∞',
    monodromy: '(243)',
    description:
      'point over a = ∞; ramification index 3',
    point: {
      x: 0,
      y: 0,
      z: 1,
    },
  },
];


function buildSphereCells() {
  const cells = [];

  for (
    let latitudeIndex = 0;
    latitudeIndex <
      LATITUDE_STEPS;
    latitudeIndex += 1
  ) {
    const latitude0 =
      -Math.PI / 2 +
      Math.PI *
      latitudeIndex /
      LATITUDE_STEPS;

    const latitude1 =
      -Math.PI / 2 +
      Math.PI *
      (
        latitudeIndex + 1
      ) /
      LATITUDE_STEPS;

    const centerLatitude =
      (
        latitude0 +
        latitude1
      ) / 2;

    for (
      let longitudeIndex = 0;
      longitudeIndex <
        LONGITUDE_STEPS;
      longitudeIndex += 1
    ) {
      const longitude0 =
        2 *
        Math.PI *
        longitudeIndex /
        LONGITUDE_STEPS;

      const longitude1 =
        2 *
        Math.PI *
        (
          longitudeIndex + 1
        ) /
        LONGITUDE_STEPS;

      const centerLongitude =
        2 *
        Math.PI *
        (
          longitudeIndex +
          0.5
        ) /
        LONGITUDE_STEPS;

      cells.push({
        key:
          `sphere-${latitudeIndex}-${longitudeIndex}`,

        latitudeIndex,
        longitudeIndex,

        center:
          spherePoint(
            centerLatitude,
            centerLongitude
          ),

        vertices: [
          spherePoint(
            latitude0,
            longitude0
          ),

          spherePoint(
            latitude0,
            longitude1
          ),

          spherePoint(
            latitude1,
            longitude1
          ),

          spherePoint(
            latitude1,
            longitude0
          ),
        ],
      });
    }
  }

  return cells;
}


console.time('[Riemann startup] sphere cells');
const SPHERE_CELLS =
  buildSphereCells();
console.timeEnd('[Riemann startup] sphere cells');


function cellKey(
  latitudeIndex,
  longitudeIndex
) {
  return (
    `${latitudeIndex}:` +
    `${
      (
        longitudeIndex +
        LONGITUDE_STEPS
      ) %
      LONGITUDE_STEPS
    }`
  );
}


/*
 * Numerically construct
 *
 *     CP^1_x \ a^{-1}(Gamma)
 *
 * and recover its four macroscopic connected components.
 */
function buildRegionDecomposition() {
  /*
   * Cells are referenced in two ways below:
   *
   *   cell.key        -> "sphere-row-column"
   *   cellKey(row,c)  -> "row:column"
   *
   * Register both aliases to the same cell so the flood-fill
   * component keys and the grid-neighbor lookups resolve
   * consistently.
   */
  const cellByKey =
    new Map(
      SPHERE_CELLS.flatMap(
        cell => [
          [
            cell.key,
            cell,
          ],

          [
            cellKey(
              cell.latitudeIndex,
              cell.longitudeIndex
            ),
            cell,
          ],
        ]
      )
    );


  const adjacency =
    new Map(
      SPHERE_CELLS.map(
        cell => [
          cell.key,
          [],
        ]
      )
    );


  function connect(
    first,
    second
  ) {
    if (
      !first ||
      !second
    ) {
      return;
    }

    if (
      sphereEdgeCrossesCutTree(
        first.center,
        second.center
      )
    ) {
      return;
    }

    adjacency
      .get(first.key)
      .push(
        second.key
      );

    adjacency
      .get(second.key)
      .push(
        first.key
      );
  }


  SPHERE_CELLS.forEach(
    cell => {
      const east =
        cellByKey.get(
          cellKey(
            cell.latitudeIndex,
            cell.longitudeIndex + 1
          )
        );

      connect(
        cell,
        east
      );

      if (
        cell.latitudeIndex <
        LATITUDE_STEPS - 1
      ) {
        const north =
          cellByKey.get(
            cellKey(
              cell.latitudeIndex + 1,
              cell.longitudeIndex
            )
          );

        connect(
          cell,
          north
        );
      }
    }
  );


  const rawComponentByCell =
    new Map();

  const rawComponents = [];


  SPHERE_CELLS.forEach(
    startCell => {
      if (
        rawComponentByCell.has(
          startCell.key
        )
      ) {
        return;
      }

      const componentIndex =
        rawComponents.length;

      const stack = [
        startCell.key,
      ];

      const members = [];

      rawComponentByCell.set(
        startCell.key,
        componentIndex
      );

      while (
        stack.length
      ) {
        const currentKey =
          stack.pop();

        members.push(
          currentKey
        );

        for (
          const neighborKey
          of adjacency.get(
            currentKey
          )
        ) {
          if (
            rawComponentByCell.has(
              neighborKey
            )
          ) {
            continue;
          }

          rawComponentByCell.set(
            neighborKey,
            componentIndex
          );

          stack.push(
            neighborKey
          );
        }
      }

      rawComponents.push(
        members
      );
    }
  );


  /*
   * A finite polygon mesh can leave one- or two-cell
   * numerical islands when a seam passes almost exactly
   * through a mesh vertex.
   *
   * Topologically the covering requires FOUR components.
   * Keep the four macroscopic components and absorb only
   * those tiny numerical artifacts into the nearest one.
   */
  const primaryRawComponents =
    rawComponents
      .map(
        (
          members,
          rawIndex
        ) => ({
          rawIndex,
          members,
        })
      )
      .sort(
        (
          left,
          right
        ) =>
          right.members.length -
          left.members.length
      )
      .slice(
        0,
        4
      );


  const primarySet =
    new Set(
      primaryRawComponents
        .map(
          component =>
            component.rawIndex
        )
    );


  const primaryCenters =
    new Map();


  primaryRawComponents
    .forEach(
      component => {
        let sum = {
          x: 0,
          y: 0,
          z: 0,
        };

        component.members
          .forEach(
            key => {
              const point =
                cellByKey
                  .get(key)
                  .center;

              sum = {
                x:
                  sum.x +
                  point.x,

                y:
                  sum.y +
                  point.y,

                z:
                  sum.z +
                  point.z,
              };
            }
          );

        primaryCenters.set(
          component.rawIndex,
          normalize3(sum)
        );
      }
    );


  const resolvedComponentByCell =
    new Map();


  SPHERE_CELLS.forEach(
    cell => {
      const rawIndex =
        rawComponentByCell.get(
          cell.key
        );

      if (
        primarySet.has(
          rawIndex
        )
      ) {
        resolvedComponentByCell.set(
          cell.key,
          rawIndex
        );

        return;
      }

      let bestPrimary =
        primaryRawComponents[0]
          .rawIndex;

      let bestDot =
        -Infinity;

      primaryRawComponents
        .forEach(
          component => {
            const score =
              dot3(
                cell.center,
                primaryCenters.get(
                  component.rawIndex
                )
              );

            if (
              score >
              bestDot
            ) {
              bestDot =
                score;

              bestPrimary =
                component.rawIndex;
            }
          }
        );

      resolvedComponentByCell.set(
        cell.key,
        bestPrimary
      );
    }
  );


  /*
   * Seed the four components with the four actual roots at
   * the physical basepoint.
   *
   * Therefore the region colors are the SAME root identities
   * used everywhere else on the page.
   */
  const baseRoots =
    labelBaseRoots(
      solveComplexQuartic(
        MONODROMY_BASEPOINT
      )
    );


  const componentToRootIndex =
    new Map();

  const usedRootIndices =
    new Set();


  baseRoots.forEach(
    (
      root,
      rootIndex
    ) => {
      const rootPoint =
        stereographicPoint(
          root.re,
          root.im
        );

      let bestCell =
        null;

      let bestDot =
        -Infinity;

      SPHERE_CELLS.forEach(
        cell => {
          const score =
            dot3(
              rootPoint,
              cell.center
            );

          if (
            score >
            bestDot
          ) {
            bestDot =
              score;

            bestCell =
              cell;
          }
        }
      );

      if (!bestCell) {
        return;
      }

      const componentIndex =
        resolvedComponentByCell.get(
          bestCell.key
        );

      componentToRootIndex.set(
        componentIndex,
        rootIndex
      );

      usedRootIndices.add(
        rootIndex
      );
    }
  );


  const unusedRootIndices =
    [0, 1, 2, 3]
      .filter(
        rootIndex =>
          !usedRootIndices.has(
            rootIndex
          )
      );


  primaryRawComponents
    .forEach(
      component => {
        if (
          componentToRootIndex.has(
            component.rawIndex
          )
        ) {
          return;
        }

        componentToRootIndex.set(
          component.rawIndex,
          unusedRootIndices.shift() ??
            0
        );
      }
    );


  const regionByCell =
    new Map();


  SPHERE_CELLS.forEach(
    cell => {
      const componentIndex =
        resolvedComponentByCell.get(
          cell.key
        );

      regionByCell.set(
        cell.key,
        componentToRootIndex.get(
          componentIndex
        ) ?? 0
      );
    }
  );


  /*
   * Turn every adjacency where the region identity changes
   * into a visible seam on the sphere.
   */
  const seamSegments = [];


  SPHERE_CELLS.forEach(
    cell => {
      const regionIndex =
        regionByCell.get(
          cell.key
        );


      const east =
        cellByKey.get(
          cellKey(
            cell.latitudeIndex,
            cell.longitudeIndex + 1
          )
        );

      if (
        east &&
        regionByCell.get(
          east.key
        ) !== regionIndex
      ) {
        const longitude =
          2 *
          Math.PI *
          (
            cell.longitudeIndex +
            1
          ) /
          LONGITUDE_STEPS;

        const latitude0 =
          -Math.PI / 2 +
          Math.PI *
          cell.latitudeIndex /
          LATITUDE_STEPS;

        const latitude1 =
          -Math.PI / 2 +
          Math.PI *
          (
            cell.latitudeIndex +
            1
          ) /
          LATITUDE_STEPS;

        seamSegments.push({
          key:
            `seam-e-${cell.key}`,

          first:
            spherePoint(
              latitude0,
              longitude
            ),

          second:
            spherePoint(
              latitude1,
              longitude
            ),
        });
      }


      if (
        cell.latitudeIndex <
        LATITUDE_STEPS - 1
      ) {
        const north =
          cellByKey.get(
            cellKey(
              cell.latitudeIndex +
              1,
              cell.longitudeIndex
            )
          );

        if (
          north &&
          regionByCell.get(
            north.key
          ) !== regionIndex
        ) {
          const latitude =
            -Math.PI / 2 +
            Math.PI *
            (
              cell.latitudeIndex +
              1
            ) /
            LATITUDE_STEPS;

          const longitude0 =
            2 *
            Math.PI *
            cell.longitudeIndex /
            LONGITUDE_STEPS;

          const longitude1 =
            2 *
            Math.PI *
            (
              cell.longitudeIndex +
              1
            ) /
            LONGITUDE_STEPS;

          seamSegments.push({
            key:
              `seam-n-${cell.key}`,

            first:
              spherePoint(
                latitude,
                longitude0
              ),

            second:
              spherePoint(
                latitude,
                longitude1
              ),
          });
        }
      }
    }
  );


  return {
    regionByCell,
    seamSegments,

    rawComponentCount:
      rawComponents.length,

    rawComponentSizes:
      rawComponents
        .map(
          members =>
            members.length
        )
        .sort(
          (left, right) =>
            right - left
        ),

    regionCount:
      primaryRawComponents.length,
  };
}


console.time('[Riemann startup] region decomposition');
let REGION_DECOMPOSITION =
  buildRegionDecomposition();
console.timeEnd('[Riemann startup] region decomposition');


/*
 * Analytic sheet classifier.
 *
 * Given a point x on CP^1_x:
 *
 *   1. evaluate a = a(x),
 *   2. transport the four physical-basepoint root labels to a
 *      along a canonical path in CP^1_a \ Gamma,
 *   3. identify which transported root is x.
 *
 * The answer therefore comes from T_a(x)=0 itself, not from
 * the latitude/longitude coloring mesh.
 */
const CLASSIFIER_CUT_ANGLE =
  Math.atan2(
    CUT_TREE_INFINITY_RAY
      .direction.im,

    CUT_TREE_INFINITY_RAY
      .direction.re
  );

const CLASSIFIER_CUT_EPSILON =
  1e-7;


function complexAbs(point) {
  return Math.hypot(
    point.re,
    point.im
  );
}


function distancePointToSegment2(
  point,
  start,
  end
) {
  const delta = {
    re:
      end.re -
      start.re,

    im:
      end.im -
      start.im,
  };

  const lengthSquared =
    delta.re * delta.re +
    delta.im * delta.im;

  if (
    lengthSquared <
    1e-20
  ) {
    return Math.hypot(
      point.re -
        start.re,

      point.im -
        start.im
    );
  }

  const t =
    clamp(
      (
        (
          point.re -
          start.re
        ) *
          delta.re +
        (
          point.im -
          start.im
        ) *
          delta.im
      ) /
        lengthSquared,
      0,
      1
    );

  return Math.hypot(
    point.re -
      (
        start.re +
        t * delta.re
      ),

    point.im -
      (
        start.im +
        t * delta.im
      )
  );
}


function parameterPointIsOnCutTree(
  point
) {
  for (
    const [
      start,
      end,
    ]
    of CUT_TREE_FINITE_EDGES
  ) {
    if (
      distancePointToSegment2(
        point,
        start,
        end
      ) <
      CLASSIFIER_CUT_EPSILON
    ) {
      return true;
    }
  }

  const rayDirection =
    CUT_TREE_INFINITY_RAY
      .direction;

  const directionLength =
    Math.hypot(
      rayDirection.re,
      rayDirection.im
    );

  const unitDirection = {
    re:
      rayDirection.re /
      directionLength,

    im:
      rayDirection.im /
      directionLength,
  };

  const offset = {
    re:
      point.re -
      CUT_TREE_INFINITY_RAY
        .origin.re,

    im:
      point.im -
      CUT_TREE_INFINITY_RAY
        .origin.im,
  };

  const along =
    offset.re *
      unitDirection.re +
    offset.im *
      unitDirection.im;

  const perpendicular =
    Math.abs(
      offset.re *
        unitDirection.im -
      offset.im *
        unitDirection.re
    );

  return (
    along >= 0 &&
    perpendicular <
      CLASSIFIER_CUT_EPSILON
  );
}


/*
 * Use the SAME infinity-cut angle as the actual cut tree.
 *
 * With the established convention
 *
 *   CUT_TREE_INFINITY_RAY.direction = (-1, 0),
 *
 * we have
 *
 *   theta_conv = pi = 180 degrees.
 *
 * Represent all target angles in the corresponding single
 * branch interval
 *
 *   [theta_conv - 2pi, theta_conv)
 *
 * so the outer circular part of the canonical path never
 * crosses the cut-tree infinity ray.
 */
function unwrapClassifierAngle(angle) {
  let result =
    angle;

  while (
    result >=
    CLASSIFIER_CUT_ANGLE
  ) {
    result -=
      2 * Math.PI;
  }

  while (
    result <
    CLASSIFIER_CUT_ANGLE -
      2 * Math.PI
  ) {
    result +=
      2 * Math.PI;
  }

  return result;
}


function buildClassifierWaypoints(
  targetA
) {
  const targetRadius =
    complexAbs(
      targetA
    );

  const baseRadius =
    complexAbs(
      MONODROMY_BASEPOINT
    );

  /*
   * Travel outside all four finite spokes first.
   */
  const outerRadius =
    Math.max(
      baseRadius + 1,
      targetRadius + 1,
      MONODROMY_A_STAR + 2,
      MONODROMY_B_STAR + 2
    );

  const targetAngle =
    unwrapClassifierAngle(
      Math.atan2(
        targetA.im,
        targetA.re
      )
    );

  const waypoints = [
    {
      re:
        outerRadius,

      im:
        0,
    },
  ];

  /*
   * Move around the outside of the finite cut tree.
   */
  const angularStep =
    Math.PI / 12;

  const arcSteps =
    Math.max(
      1,
      Math.ceil(
        Math.abs(
          targetAngle
        ) /
        angularStep
      )
    );

  for (
    let index = 1;
    index <= arcSteps;
    index += 1
  ) {
    const angle =
      targetAngle *
      index /
      arcSteps;

    waypoints.push({
      re:
        outerRadius *
        Math.cos(angle),

      im:
        outerRadius *
        Math.sin(angle),
    });
  }

  /*
   * Finally move radially inward to a(x).
   *
   * If a(x) itself lies on Gamma, the classifier is undefined
   * and regionIndexAtSpherePoint() returns null before this.
   */
  waypoints.push(
    cloneComplex(
      targetA
    )
  );

  return waypoints;
}


function regionIndexAtSpherePoint(
  point
) {
  const x =
    sphereToComplex(
      point
    );

  /*
   * x = infinity is itself a ramification point, so there is
   * no single local sheet label there.
   */
  if (!x) {
    return null;
  }

  const a =
    parameterFromX(
      x
    );

  if (
    !a ||
    !Number.isFinite(a.re) ||
    !Number.isFinite(a.im) ||
    parameterPointIsOnCutTree(
      a
    )
  ) {
    return null;
  }

  const baseRoots =
    labelBaseRoots(
      solveComplexQuartic(
        MONODROMY_BASEPOINT
      )
    );

  const transported =
    transportThroughWaypoints(
      MONODROMY_BASEPOINT,
      baseRoots,
      buildClassifierWaypoints(
        a
      )
    );

  let bestRootIndex =
    0;

  let bestDistance =
    Infinity;

  transported.roots.forEach(
    (
      root,
      rootIndex
    ) => {
      const distance =
        Math.hypot(
          root.re -
            x.re,

          root.im -
            x.im
        );

      if (
        distance <
        bestDistance
      ) {
        bestDistance =
          distance;

        bestRootIndex =
          rootIndex;
      }
    }
  );

  return bestRootIndex;
}


/*
 * Temporary validation probes.
 *
 * These are not used to color the sphere. They only compare
 * the new analytic classifier against the already-validated
 * coarse decomposition at ordinary nonsingular points.
 */
const CLASSIFIER_PROBES = [
  {
    re: 0.35,
    im: 0.55,
  },

  {
    re: -0.65,
    im: 0.45,
  },

  {
    re: 0.85,
    im: -0.55,
  },

  {
    re: -0.55,
    im: -0.95,
  },

  {
    re: 1.35,
    im: 0.25,
  },

  {
    re: -1.15,
    im: 0.30,
  },

  {
    re: 0.30,
    im: -1.35,
  },

  {
    re: -1.25,
    im: -0.45,
  },
];


const CLASSIFIER_AUDIT =
  CLASSIFIER_PROBES.map(
    x => {
      const point =
        stereographicPoint(
          x.re,
          x.im
        );

      return {
        analytic:
          regionIndexAtSpherePoint(
            point
          ),

        coarse:
          nearestRegionIndex(
            point
          ),
      };
    }
  );


const CLASSIFIER_AUDIT_SUMMARY = {
  defined:
    CLASSIFIER_AUDIT.filter(
      item =>
        item.analytic !==
        null
    ).length,

  matching:
    CLASSIFIER_AUDIT.filter(
      item =>
        item.analytic !==
          null &&
        item.analytic ===
          item.coarse
    ).length,
};


/*
 * DIAGNOSTIC ONLY: combined white + gold boundary atlas.
 *
 * This DOES NOT drive the visible coloring yet.
 *
 * It rasterizes the log-polar cylinder using BOTH displayed
 * separator systems as hard barriers:
 *
 *   white = TRUE_SEAM_CURVES
 *   gold  = REAL_ROOT_PATH_CURVES
 *
 * It then flood-fills the resulting cylindrical faces and
 * analytically identifies one interior representative from
 * each face.
 *
 * Once this audit is trustworthy, the visible fill can be
 * switched from the legacy sphere-cell coloring to this one
 * shared atlas.
 */
const BOUNDARY_ATLAS_RHO_STEPS =
  120;

const BOUNDARY_ATLAS_THETA_STEPS =
  96;


function normalizeCylinderTheta(
  theta
) {
  let result =
    theta;

  while (
    result >=
    Math.PI
  ) {
    result -=
      2 * Math.PI;
  }

  while (
    result <
    -Math.PI
  ) {
    result +=
      2 * Math.PI;
  }

  return result;
}


function buildCombinedBoundaryAtlas() {
  const rhoStep =
    (
      ROOT_MAP_RHO_MAX -
      ROOT_MAP_RHO_MIN
    ) /
    BOUNDARY_ATLAS_RHO_STEPS;

  const thetaStep =
    2 * Math.PI /
    BOUNDARY_ATLAS_THETA_STEPS;


  function cellId(
    rhoIndex,
    thetaIndex
  ) {
    return (
      rhoIndex *
        BOUNDARY_ATLAS_THETA_STEPS +
      (
        (
          thetaIndex %
          BOUNDARY_ATLAS_THETA_STEPS
        ) +
        BOUNDARY_ATLAS_THETA_STEPS
      ) %
        BOUNDARY_ATLAS_THETA_STEPS
    );
  }


  function cellFromPoint(
    rho,
    theta
  ) {
    const rhoIndex =
      clamp(
        Math.floor(
          (
            clamp(
              rho,
              ROOT_MAP_RHO_MIN,
              ROOT_MAP_RHO_MAX -
                1e-10
            ) -
            ROOT_MAP_RHO_MIN
          ) /
          rhoStep
        ),
        0,
        BOUNDARY_ATLAS_RHO_STEPS -
          1
      );

    const wrappedTheta =
      normalizeCylinderTheta(
        theta
      );

    const thetaIndex =
      clamp(
        Math.floor(
          (
            wrappedTheta +
            Math.PI
          ) /
          thetaStep
        ),
        0,
        BOUNDARY_ATLAS_THETA_STEPS -
          1
      );

    return {
      rhoIndex,
      thetaIndex,

      id:
        cellId(
          rhoIndex,
          thetaIndex
        ),
    };
  }


  function edgeKey(
    firstId,
    secondId
  ) {
    return firstId <
      secondId
      ? `${firstId}:${secondId}`
      : `${secondId}:${firstId}`;
  }


  const blockedEdges =
    new Set();


  /*
   * Mark the grid adjacency crossed by a boundary.
   *
   * These are adjacency barriers, not colored cells.
   * Therefore the line itself remains authoritative.
   */
  function blockAdjacentCells(
    first,
    second
  ) {
    if (
      first.rhoIndex ===
        second.rhoIndex &&
      first.thetaIndex ===
        second.thetaIndex
    ) {
      return;
    }

    let current = {
      ...first,
    };


    /*
     * Radial crossing.
     */
    if (
      current.rhoIndex !==
      second.rhoIndex
    ) {
      const rhoDirection =
        Math.sign(
          second.rhoIndex -
          current.rhoIndex
        );

      const next = {
        rhoIndex:
          current.rhoIndex +
          rhoDirection,

        thetaIndex:
          current.thetaIndex,
      };

      next.id =
        cellId(
          next.rhoIndex,
          next.thetaIndex
        );

      blockedEdges.add(
        edgeKey(
          current.id,
          next.id
        )
      );

      current =
        next;
    }


    /*
     * Angular crossing.
     *
     * theta is periodic, so row 95 and row 0 are genuine
     * neighbors in this atlas.
     */
    if (
      current.thetaIndex !==
      second.thetaIndex
    ) {
      const forward =
        (
          second.thetaIndex -
          current.thetaIndex +
          BOUNDARY_ATLAS_THETA_STEPS
        ) %
        BOUNDARY_ATLAS_THETA_STEPS;

      const backward =
        (
          current.thetaIndex -
          second.thetaIndex +
          BOUNDARY_ATLAS_THETA_STEPS
        ) %
        BOUNDARY_ATLAS_THETA_STEPS;

      const thetaDirection =
        forward <=
        backward
          ? 1
          : -1;

      const nextTheta =
        (
          current.thetaIndex +
          thetaDirection +
          BOUNDARY_ATLAS_THETA_STEPS
        ) %
        BOUNDARY_ATLAS_THETA_STEPS;

      const next = {
        rhoIndex:
          current.rhoIndex,

        thetaIndex:
          nextTheta,
      };

      next.id =
        cellId(
          next.rhoIndex,
          next.thetaIndex
        );

      blockedEdges.add(
        edgeKey(
          current.id,
          next.id
        )
      );
    }
  }


  /*
   * Convert a sphere-space analytic curve into one continuous
   * path on the universal cover of the log-polar cylinder.
   *
   * We unwrap theta instead of splitting at +/-pi so the
   * periodic cylinder adjacency remains topologically correct.
   */
  function rasterizeCurve(
    curve
  ) {
    const mapped =
      spherePolylineToLogPolar(
        curve.points
      )
      .filter(Boolean);

    if (
      mapped.length < 2
    ) {
      return;
    }

    const unwrapped = [
      {
        rho:
          mapped[0].rho,

        theta:
          mapped[0].theta,
      },
    ];


    for (
      let index = 1;
      index <
        mapped.length;
      index += 1
    ) {
      let theta =
        mapped[index]
          .theta;

      const previousTheta =
        unwrapped[
          unwrapped.length - 1
        ].theta;

      while (
        theta -
          previousTheta >
        Math.PI
      ) {
        theta -=
          2 * Math.PI;
      }

      while (
        theta -
          previousTheta <
        -Math.PI
      ) {
        theta +=
          2 * Math.PI;
      }

      unwrapped.push({
        rho:
          mapped[index].rho,

        theta,
      });
    }


    /*
     * Oversample every analytic segment relative to the atlas
     * grid so no boundary can jump over an adjacency unnoticed.
     */
    for (
      let index = 0;
      index <
        unwrapped.length - 1;
      index += 1
    ) {
      const first =
        unwrapped[index];

      const second =
        unwrapped[
          index + 1
        ];

      const steps =
        Math.max(
          1,

          Math.ceil(
            4 *
            Math.max(
              Math.abs(
                second.rho -
                first.rho
              ) /
                rhoStep,

              Math.abs(
                second.theta -
                first.theta
              ) /
                thetaStep
            )
          )
        );

      let previousCell =
        cellFromPoint(
          first.rho,
          first.theta
        );


      for (
        let step = 1;
        step <= steps;
        step += 1
      ) {
        const t =
          step /
          steps;

        const nextCell =
          cellFromPoint(
            first.rho +
              (
                second.rho -
                first.rho
              ) *
              t,

            first.theta +
              (
                second.theta -
                first.theta
              ) *
              t
          );

        blockAdjacentCells(
          previousCell,
          nextCell
        );

        previousCell =
          nextCell;
      }
    }
  }


  /*
   * BOTH line systems participate.
   *
   * They retain different meanings and rendering styles,
   * but both block face connectivity in this diagnostic atlas.
   */
  TRUE_SEAM_CURVES.forEach(
    rasterizeCurve
  );

  REAL_ROOT_PATH_CURVES.forEach(
    rasterizeCurve
  );


  const totalCells =
    BOUNDARY_ATLAS_RHO_STEPS *
    BOUNDARY_ATLAS_THETA_STEPS;

  const componentByCell =
    new Int32Array(
      totalCells
    );

  componentByCell.fill(
    -1
  );

  const components = [];


  function neighbors(
    id
  ) {
    const rhoIndex =
      Math.floor(
        id /
        BOUNDARY_ATLAS_THETA_STEPS
      );

    const thetaIndex =
      id %
      BOUNDARY_ATLAS_THETA_STEPS;

    const output = [];


    /*
     * rho is bounded.
     */
    if (
      rhoIndex > 0
    ) {
      output.push(
        cellId(
          rhoIndex - 1,
          thetaIndex
        )
      );
    }

    if (
      rhoIndex <
      BOUNDARY_ATLAS_RHO_STEPS -
        1
    ) {
      output.push(
        cellId(
          rhoIndex + 1,
          thetaIndex
        )
      );
    }


    /*
     * theta is periodic.
     */
    output.push(
      cellId(
        rhoIndex,
        thetaIndex - 1
      )
    );

    output.push(
      cellId(
        rhoIndex,
        thetaIndex + 1
      )
    );

    return output;
  }


  /*
   * Flood-fill the actual geometric faces cut out by the
   * combined white + gold boundary graph.
   *
   * We intentionally DO NOT force this to produce four faces.
   * Several disconnected faces may carry the same root identity.
   */
  for (
    let startId = 0;
    startId <
      totalCells;
    startId += 1
  ) {
    if (
      componentByCell[
        startId
      ] !== -1
    ) {
      continue;
    }

    const componentIndex =
      components.length;

    const stack = [
      startId,
    ];

    const members = [];

    componentByCell[
      startId
    ] =
      componentIndex;


    while (
      stack.length
    ) {
      const currentId =
        stack.pop();

      members.push(
        currentId
      );

      neighbors(
        currentId
      ).forEach(
        neighborId => {
          if (
            componentByCell[
              neighborId
            ] !== -1
          ) {
            return;
          }

          if (
            blockedEdges.has(
              edgeKey(
                currentId,
                neighborId
              )
            )
          ) {
            return;
          }

          componentByCell[
            neighborId
          ] =
            componentIndex;

          stack.push(
            neighborId
          );
        }
      );
    }

    components.push(
      members
    );
  }


  /*
   * Analytically identify one representative point per face.
   *
   * Prefer a cell with the fewest immediately adjacent
   * boundary barriers so the probe is safely in the interior.
   */
  const faces =
    components.map(
      (
        members,
        componentIndex
      ) => {
        let representativeId =
          members[0];

        let bestBarrierCount =
          Infinity;


        members.forEach(
          id => {
            const barrierCount =
              neighbors(id)
                .filter(
                  neighborId =>
                    blockedEdges.has(
                      edgeKey(
                        id,
                        neighborId
                      )
                    )
                )
                .length;

            if (
              barrierCount <
              bestBarrierCount
            ) {
              bestBarrierCount =
                barrierCount;

              representativeId =
                id;
            }
          }
        );


        const rhoIndex =
          Math.floor(
            representativeId /
            BOUNDARY_ATLAS_THETA_STEPS
          );

        const thetaIndex =
          representativeId %
          BOUNDARY_ATLAS_THETA_STEPS;

        const rho =
          ROOT_MAP_RHO_MIN +
          (
            rhoIndex +
            0.5
          ) *
          rhoStep;

        const theta =
          -Math.PI +
          (
            thetaIndex +
            0.5
          ) *
          thetaStep;

        const radius =
          Math.exp(
            rho
          );

        const probePoint =
          stereographicPoint(
            radius *
              Math.cos(
                theta
              ),

            radius *
              Math.sin(
                theta
              )
          );

        return {
          componentIndex,

          size:
            members.length,

          regionIndex:
            regionIndexAtSpherePoint(
              probePoint
            ),
        };
      }
    );


  const faceCountsByRoot =
    [0, 0, 0, 0];

  let classifiedFaceCount =
    0;


  faces.forEach(
    face => {
      if (
        face.regionIndex ===
        null
      ) {
        return;
      }

      classifiedFaceCount +=
        1;

      faceCountsByRoot[
        face.regionIndex
      ] +=
        1;
    }
  );


  return {
    faceCount:
      faces.length,

    classifiedFaceCount,

    unresolvedFaceCount:
      faces.length -
      classifiedFaceCount,

    faceCountsByRoot,

    largestFaceSizes:
      faces
        .map(
          face =>
            face.size
        )
        .sort(
          (
            left,
            right
          ) =>
            right -
            left
        )
        .slice(
          0,
          8
        ),
  };
}


console.time('[Riemann startup] boundary atlas');
let COMBINED_BOUNDARY_ATLAS_AUDIT =
  buildCombinedBoundaryAtlas();
console.timeEnd('[Riemann startup] boundary atlas');


function buildLocallyRefinedSphereCells() {
  const outputCells = [];

  const refinedCells = [];

  const cellByGridKey =
    new Map(
      SPHERE_CELLS.map(
        cell => [
          cellKey(
            cell.latitudeIndex,
            cell.longitudeIndex
          ),
          cell,
        ]
      )
    );


  function regionOf(cell) {
    if (!cell) {
      return null;
    }

    return (
      REGION_DECOMPOSITION
        .regionByCell
        .get(cell.key) ?? 0
    );
  }


  function nearbyCells(cell) {
    const cells = [];

    for (
      let latitudeOffset = -1;
      latitudeOffset <= 1;
      latitudeOffset += 1
    ) {
      const latitudeIndex =
        cell.latitudeIndex +
        latitudeOffset;

      if (
        latitudeIndex < 0 ||
        latitudeIndex >=
          LATITUDE_STEPS
      ) {
        continue;
      }

      for (
        let longitudeOffset = -1;
        longitudeOffset <= 1;
        longitudeOffset += 1
      ) {
        const candidate =
          cellByGridKey.get(
            cellKey(
              latitudeIndex,
              cell.longitudeIndex +
                longitudeOffset
            )
          );

        if (candidate) {
          cells.push(candidate);
        }
      }
    }

    return cells;
  }


  function cellTouchesSeam(cell) {
    /*
     * Refine only cells whose OWN boundary is crossed by the
     * pullback seam a^{-1}(Gamma).
     *
     * sphereEdgeCrossesCutTree() already tests exactly that:
     * it maps a short sphere edge through a(x) and asks whether
     * the image crosses the parameter-plane cut tree.
     *
     * This is narrower than inferring seam proximity from a
     * neighboring coarse region label.
     */
    for (
      let edgeIndex = 0;
      edgeIndex <
        cell.vertices.length;
      edgeIndex += 1
    ) {
      const first =
        cell.vertices[
          edgeIndex
        ];

      const second =
        cell.vertices[
          (
            edgeIndex + 1
          ) %
          cell.vertices.length
        ];

      if (
        sphereEdgeCrossesCutTree(
          first,
          second
        )
      ) {
        return true;
      }
    }

    return false;
  }


  /*
   * First build the local refined geometry.
   *
   * IMPORTANT:
   * No refined cell receives a color yet.
   */
  SPHERE_CELLS.forEach(
    cell => {
      if (
        !cellTouchesSeam(cell)
      ) {
        outputCells.push({
          key:
            `coarse-${cell.key}`,

          vertices:
            cell.vertices,

          regionIndex:
            regionOf(cell),
        });

        return;
      }


      const latitude0 =
        -Math.PI / 2 +
        Math.PI *
        cell.latitudeIndex /
        LATITUDE_STEPS;

      const latitude1 =
        -Math.PI / 2 +
        Math.PI *
        (
          cell.latitudeIndex + 1
        ) /
        LATITUDE_STEPS;

      const longitude0 =
        2 *
        Math.PI *
        cell.longitudeIndex /
        LONGITUDE_STEPS;

      const longitude1 =
        2 *
        Math.PI *
        (
          cell.longitudeIndex + 1
        ) /
        LONGITUDE_STEPS;


      for (
        let localLatitude = 0;
        localLatitude <
          SEAM_LOCAL_SUBDIVISIONS;
        localLatitude += 1
      ) {
        const localLatitude0 =
          latitude0 +
          (
            latitude1 -
            latitude0
          ) *
          localLatitude /
          SEAM_LOCAL_SUBDIVISIONS;

        const localLatitude1 =
          latitude0 +
          (
            latitude1 -
            latitude0
          ) *
          (
            localLatitude + 1
          ) /
          SEAM_LOCAL_SUBDIVISIONS;


        for (
          let localLongitude = 0;
          localLongitude <
            SEAM_LOCAL_SUBDIVISIONS;
          localLongitude += 1
        ) {
          const localLongitude0 =
            longitude0 +
            (
              longitude1 -
              longitude0
            ) *
            localLongitude /
            SEAM_LOCAL_SUBDIVISIONS;

          const localLongitude1 =
            longitude0 +
            (
              longitude1 -
              longitude0
            ) *
            (
              localLongitude + 1
            ) /
            SEAM_LOCAL_SUBDIVISIONS;

          const center =
            spherePoint(
              (
                localLatitude0 +
                localLatitude1
              ) / 2,

              (
                localLongitude0 +
                localLongitude1
              ) / 2
            );

          refinedCells.push({
            key:
              `refined-${cell.key}-${localLatitude}-${localLongitude}`,

            parentCell:
              cell,

            center,

            vertices: [
              spherePoint(
                localLatitude0,
                localLongitude0
              ),

              spherePoint(
                localLatitude0,
                localLongitude1
              ),

              spherePoint(
                localLatitude1,
                localLongitude1
              ),

              spherePoint(
                localLatitude1,
                localLongitude0
              ),
            ],
          });
        }
      }
    }
  );


  /*
   * Quantized vertex keys let us discover which refined
   * quadrilaterals share an edge.
   */
  function vertexKey(point) {
    return [
      point.x.toFixed(10),
      point.y.toFixed(10),
      point.z.toFixed(10),
    ].join(':');
  }


  function edgeKey(
    first,
    second
  ) {
    const firstKey =
      vertexKey(first);

    const secondKey =
      vertexKey(second);

    return firstKey <
      secondKey
      ? `${firstKey}|${secondKey}`
      : `${secondKey}|${firstKey}`;
  }


  const edgeMap =
    new Map();


  refinedCells.forEach(
    (
      cell,
      refinedIndex
    ) => {
      for (
        let edgeIndex = 0;
        edgeIndex < 4;
        edgeIndex += 1
      ) {
        const first =
          cell.vertices[
            edgeIndex
          ];

        const second =
          cell.vertices[
            (
              edgeIndex + 1
            ) % 4
          ];

        const key =
          edgeKey(
            first,
            second
          );

        if (
          !edgeMap.has(key)
        ) {
          edgeMap.set(
            key,
            []
          );
        }

        edgeMap
          .get(key)
          .push(
            refinedIndex
          );
      }
    }
  );


  const adjacency =
    refinedCells.map(
      () => []
    );


  /*
   * Two refined cells belong to the same component when:
   *
   *   1. they share an edge, and
   *   2. the short center-to-center path does not cross
   *      a^{-1}(Gamma).
   *
   * This is the crucial change: sheet identity is now
   * topological/component-wise rather than guessed
   * independently for every little square.
   */
  edgeMap.forEach(
    members => {
      if (
        members.length !== 2
      ) {
        return;
      }

      const [
        firstIndex,
        secondIndex,
      ] =
        members;

      const first =
        refinedCells[
          firstIndex
        ];

      const second =
        refinedCells[
          secondIndex
        ];


      if (
        sphereEdgeCrossesCutTree(
          first.center,
          second.center
        )
      ) {
        return;
      }


      adjacency[
        firstIndex
      ].push(
        secondIndex
      );

      adjacency[
        secondIndex
      ].push(
        firstIndex
      );
    }
  );


  /*
   * Flood-fill the refined seam band.
   */
  const componentByCell =
    new Array(
      refinedCells.length
    ).fill(-1);

  const components = [];


  refinedCells.forEach(
    (
      cell,
      startIndex
    ) => {
      if (
        componentByCell[
          startIndex
        ] !== -1
      ) {
        return;
      }

      const componentIndex =
        components.length;

      const stack = [
        startIndex,
      ];

      const members = [];

      componentByCell[
        startIndex
      ] =
        componentIndex;


      while (
        stack.length
      ) {
        const currentIndex =
          stack.pop();

        members.push(
          currentIndex
        );


        adjacency[
          currentIndex
        ].forEach(
          neighborIndex => {
            if (
              componentByCell[
                neighborIndex
              ] !== -1
            ) {
              return;
            }

            componentByCell[
              neighborIndex
            ] =
              componentIndex;

            stack.push(
              neighborIndex
            );
          }
        );
      }


      components.push(
        members
      );
    }
  );


  /*
   * Give each WHOLE connected component one root identity.
   *
   * We collect votes from established nearby coarse cells.
   * A coarse seed may vote only when a short path from a
   * representative refined point to that seed does not cross
   * the pullback seam.
   *
   * This eliminates the blue/yellow checkerboard that arose
   * when every refined cell made this decision independently.
   */
  const componentRegion =
    new Map();


  components.forEach(
    (
      members,
      componentIndex
    ) => {
      const votes =
        [0, 0, 0, 0];

      const sampleStride =
        Math.max(
          1,
          Math.floor(
            members.length /
            32
          )
        );


      for (
        let memberOffset = 0;
        memberOffset <
          members.length;
        memberOffset +=
          sampleStride
      ) {
        const refinedCell =
          refinedCells[
            members[
              memberOffset
            ]
          ];

        nearbyCells(
          refinedCell
            .parentCell
        ).forEach(
          coarseCell => {
            const regionIndex =
              regionOf(
                coarseCell
              );

            if (
              regionIndex ===
              null
            ) {
              return;
            }

            if (
              sphereEdgeCrossesCutTree(
                refinedCell.center,
                coarseCell.center
              )
            ) {
              return;
            }

            votes[
              regionIndex
            ] += 1;
          }
        );
      }


      let bestRegion =
        regionOf(
          refinedCells[
            members[0]
          ].parentCell
        ) ?? 0;

      let bestVotes =
        -1;


      votes.forEach(
        (
          voteCount,
          regionIndex
        ) => {
          if (
            voteCount >
            bestVotes
          ) {
            bestVotes =
              voteCount;

            bestRegion =
              regionIndex;
          }
        }
      );


      componentRegion.set(
        componentIndex,
        bestRegion
      );
    }
  );


  refinedCells.forEach(
    (
      cell,
      refinedIndex
    ) => {
      outputCells.push({
        key:
          cell.key,

        center:
          cell.center,

        vertices:
          cell.vertices,

        /*
         * The refined flood-fill already determined which
         * connected side of the analytic seam this small cell
         * belongs to.
         *
         * USE that answer.
         */
        regionIndex:
          componentRegion.get(
            componentByCell[
              refinedIndex
            ]
          ) ??
          regionOf(
            cell.parentCell
          ) ??
          0,
      });
    }
  );


  /*
   * EXACT SEAM-CUT GEOMETRY.
   *
   * The refined cells now have their established root identities.
   *
   * Do NOT try to repair a seam-crossed polygon merely by moving
   * its existing latitude/longitude vertices.
   *
   * Instead, cut ordinary seam-crossed cells at the actual
   * TRUE_SEAM_CURVES intersections. buildSeamCutCells() creates
   * two polygons whose common edge is the analytic seam itself.
   */
  return buildSeamCutCells(
    outputCells
  );


  /*
   * LEGACY vertex-snapping pass retained below for audit/recovery.
   * It is intentionally bypassed by the exact cut-cell return above.
   *
   * Final seam-conforming geometry pass.
   *
   * The component flood-fill above establishes the correct
   * topology and root identity. The only remaining approximation
   * is geometric: neighboring regions still meet on a fine
   * latitude/longitude edge.
   *
   * Find every mesh edge whose two incident cells have different
   * root identities. Its endpoints are genuine region-boundary
   * vertices. Move those shared vertices onto the nearest point
   * of the analytically continued seam graph TRUE_SEAM_CURVES.
   *
   * Both incident polygons use the SAME snapped vertex, so their
   * colored boundaries remain watertight.
   */


  function snapVertexKey(
    point
  ) {
    return [
      point.x.toFixed(12),
      point.y.toFixed(12),
      point.z.toFixed(12),
    ].join(':');
  }


  function snapEdgeKey(
    first,
    second
  ) {
    const firstKey =
      snapVertexKey(
        first
      );

    const secondKey =
      snapVertexKey(
        second
      );

    return firstKey <
      secondKey
      ? `${firstKey}|${secondKey}`
      : `${secondKey}|${firstKey}`;
  }


  function closestPointOnTrueSeam(
    point
  ) {
    let bestPoint =
      point;

    let bestScore =
      -Infinity;


    TRUE_SEAM_CURVES.forEach(
      curve => {
        for (
          let index = 0;
          index <
            curve.points.length - 1;
          index += 1
        ) {
          const first =
            curve.points[
              index
            ];

          const second =
            curve.points[
              index + 1
            ];


          /*
           * Closest point on the 3D chord joining two neighboring
           * analytic seam samples. Normalize afterward so the
           * result lies exactly back on CP^1_x = S^2.
           */
          const delta = {
            x:
              second.x -
              first.x,

            y:
              second.y -
              first.y,

            z:
              second.z -
              first.z,
          };

          const lengthSquared =
            dot3(
              delta,
              delta
            );

          let t =
            0;

          if (
            lengthSquared >
            1e-16
          ) {
            t =
              clamp(
                (
                  (
                    point.x -
                    first.x
                  ) *
                    delta.x +
                  (
                    point.y -
                    first.y
                  ) *
                    delta.y +
                  (
                    point.z -
                    first.z
                  ) *
                    delta.z
                ) /
                  lengthSquared,
                0,
                1
              );
          }


          const candidate =
            normalize3({
              x:
                first.x +
                t * delta.x,

              y:
                first.y +
                t * delta.y,

              z:
                first.z +
                t * delta.z,
            });


          /*
           * On the unit sphere, maximizing the dot product is the
           * same as minimizing angular distance.
           */
          const score =
            dot3(
              point,
              candidate
            );


          if (
            score >
            bestScore
          ) {
            bestScore =
              score;

            bestPoint =
              candidate;
          }
        }
      }
    );


    return bestPoint;
  }


  /*
   * Build the edge incidence table BEFORE changing any vertices.
   */
  const boundaryEdgeMap =
    new Map();


  outputCells.forEach(
    (
      cell,
      cellIndex
    ) => {
      for (
        let edgeIndex = 0;
        edgeIndex <
          cell.vertices.length;
        edgeIndex += 1
      ) {
        const firstIndex =
          edgeIndex;

        const secondIndex =
          (
            edgeIndex + 1
          ) %
          cell.vertices.length;

        const first =
          cell.vertices[
            firstIndex
          ];

        const second =
          cell.vertices[
            secondIndex
          ];

        const key =
          snapEdgeKey(
            first,
            second
          );


        if (
          !boundaryEdgeMap.has(
            key
          )
        ) {
          boundaryEdgeMap.set(
            key,
            []
          );
        }


        boundaryEdgeMap
          .get(key)
          .push({
            cellIndex,
            firstIndex,
            secondIndex,
          });
      }
    }
  );


  /*
   * Determine which ORIGINAL vertices belong to a color boundary.
   */
  const boundaryVertexKeys =
    new Set();


  boundaryEdgeMap.forEach(
    incidents => {
      if (
        incidents.length !== 2
      ) {
        return;
      }

      const firstIncident =
        incidents[0];

      const secondIncident =
        incidents[1];

      const firstCell =
        outputCells[
          firstIncident
            .cellIndex
        ];

      const secondCell =
        outputCells[
          secondIncident
            .cellIndex
        ];


      if (
        firstCell.regionIndex ===
        secondCell.regionIndex
      ) {
        return;
      }


      const firstVertex =
        firstCell.vertices[
          firstIncident
            .firstIndex
        ];

      const secondVertex =
        firstCell.vertices[
          firstIncident
            .secondIndex
        ];


      boundaryVertexKeys.add(
        snapVertexKey(
          firstVertex
        )
      );

      boundaryVertexKeys.add(
        snapVertexKey(
          secondVertex
        )
      );
    }
  );


  /*
   * Compute each snap exactly once.
   *
   * Every polygon sharing an original mesh vertex then receives
   * the identical replacement point.
   */
  const snappedVertexByKey =
    new Map();


  outputCells.forEach(
    cell => {
      cell.vertices.forEach(
        point => {
          const key =
            snapVertexKey(
              point
            );

          if (
            !boundaryVertexKeys.has(
              key
            ) ||
            snappedVertexByKey.has(
              key
            )
          ) {
            return;
          }


          snappedVertexByKey.set(
            key,
            closestPointOnTrueSeam(
              point
            )
          );
        }
      );
    }
  );


  const seamConformingCells =
    outputCells.map(
      cell => ({
        ...cell,

        vertices:
          cell.vertices.map(
            point => {
              const key =
                snapVertexKey(
                  point
                );

              return (
                snappedVertexByKey.get(
                  key
                ) ??
                point
              );
            }
          ),
      })
    );


  return seamConformingCells;
}


/*
 * Intersect two short spherical segments by projecting them into
 * the tangent plane near the first segment.
 *
 * This is used only in the post-mount seam audit for now.
 *
 * Later, the same intersection point will become an actual
 * polygon vertex when we split seam-crossed cells.
 */
function intersectSphereSegments(
  firstStart,
  firstEnd,
  secondStart,
  secondEnd
) {
  const center =
    normalize3({
      x:
        firstStart.x +
        firstEnd.x,

      y:
        firstStart.y +
        firstEnd.y,

      z:
        firstStart.z +
        firstEnd.z,
    });


  /*
   * Reject seam segments on the far side of the sphere.
   *
   * Without this guard, tangent-plane projection could make
   * unrelated back-side geometry appear to intersect locally.
   */
  if (
    dot3(
      center,
      secondStart
    ) < 0.8 &&
    dot3(
      center,
      secondEnd
    ) < 0.8
  ) {
    return null;
  }


  const basis =
    tangentBasis(
      center
    );


  function projectToTangent(
    point
  ) {
    const relative = {
      x:
        point.x -
        center.x,

      y:
        point.y -
        center.y,

      z:
        point.z -
        center.z,
    };

    return {
      x:
        dot3(
          relative,
          basis.first
        ),

      y:
        dot3(
          relative,
          basis.second
        ),
    };
  }


  const a0 =
    projectToTangent(
      firstStart
    );

  const a1 =
    projectToTangent(
      firstEnd
    );

  const b0 =
    projectToTangent(
      secondStart
    );

  const b1 =
    projectToTangent(
      secondEnd
    );


  const aDirection = {
    x:
      a1.x -
      a0.x,

    y:
      a1.y -
      a0.y,
  };

  const bDirection = {
    x:
      b1.x -
      b0.x,

    y:
      b1.y -
      b0.y,
  };


  const denominator =
    aDirection.x *
      bDirection.y -
    aDirection.y *
      bDirection.x;


  if (
    Math.abs(
      denominator
    ) < 1e-12
  ) {
    return null;
  }


  const offset = {
    x:
      b0.x -
      a0.x,

    y:
      b0.y -
      a0.y,
  };


  const firstParameter =
    (
      offset.x *
        bDirection.y -
      offset.y *
        bDirection.x
    ) /
    denominator;

  const secondParameter =
    (
      offset.x *
        aDirection.y -
      offset.y *
        aDirection.x
    ) /
    denominator;


  const epsilon =
    1e-6;


  if (
    firstParameter <
      -epsilon ||
    firstParameter >
      1 + epsilon ||
    secondParameter <
      -epsilon ||
    secondParameter >
      1 + epsilon
  ) {
    return null;
  }


  /*
   * Use the parameter on the TRUE seam segment, then normalize
   * back onto CP^1_x = S^2.
   */
  return normalize3({
    x:
      secondStart.x +
      (
        secondEnd.x -
        secondStart.x
      ) *
      secondParameter,

    y:
      secondStart.y +
      (
        secondEnd.y -
        secondStart.y
      ) *
      secondParameter,

    z:
      secondStart.z +
      (
        secondEnd.z -
        secondStart.z
      ) *
      secondParameter,
  });
}


/*
 * Replace ordinary seam-crossed cells with two polygons whose
 * shared boundary is literally the corresponding analytic seam
 * polyline from TRUE_SEAM_CURVES.
 *
 * This is deliberately conservative near ramification/junction
 * cells: we only split cells with one unambiguous seam crossing
 * (exactly two unique boundary intersections on one seam curve).
 */
function buildSeamCutCells(
  cells
) {
  function pointKey(
    point
  ) {
    return [
      point.x.toFixed(9),
      point.y.toFixed(9),
      point.z.toFixed(9),
    ].join(':');
  }


  function edgeKey(
    first,
    second
  ) {
    const firstKey =
      pointKey(first);

    const secondKey =
      pointKey(second);

    return firstKey < secondKey
      ? `${firstKey}|${secondKey}`
      : `${secondKey}|${firstKey}`;
  }


  function polygonCenter(
    vertices
  ) {
    return normalize3(
      vertices.reduce(
        (
          total,
          point
        ) => ({
          x:
            total.x +
            point.x,

          y:
            total.y +
            point.y,

          z:
            total.z +
            point.z,
        }),
        {
          x: 0,
          y: 0,
          z: 0,
        }
      )
    );
  }


  const cellCenters =
    cells.map(
      cell =>
        polygonCenter(
          cell.vertices
        )
    );


  /*
   * Find the narrow set of cells touching the current color
   * boundary. The true seam is already known to run through this
   * locally refined band.
   */
  const incidence =
    new Map();


  cells.forEach(
    (
      cell,
      cellIndex
    ) => {
      for (
        let edgeIndex = 0;
        edgeIndex <
          cell.vertices.length;
        edgeIndex += 1
      ) {
        const first =
          cell.vertices[
            edgeIndex
          ];

        const second =
          cell.vertices[
            (
              edgeIndex + 1
            ) %
            cell.vertices.length
          ];

        const key =
          edgeKey(
            first,
            second
          );

        if (
          !incidence.has(key)
        ) {
          incidence.set(
            key,
            []
          );
        }

        incidence
          .get(key)
          .push({
            cellIndex,
          });
      }
    }
  );


  const candidateCellIndices =
    new Set();


  incidence.forEach(
    members => {
      if (
        members.length !== 2
      ) {
        return;
      }

      const firstCell =
        cells[
          members[0]
            .cellIndex
        ];

      const secondCell =
        cells[
          members[1]
            .cellIndex
        ];

      if (
        firstCell.regionIndex ===
        secondCell.regionIndex
      ) {
        return;
      }

      candidateCellIndices.add(
        members[0]
          .cellIndex
      );

      candidateCellIndices.add(
        members[1]
          .cellIndex
      );
    }
  );


  /*
   * Flatten TRUE_SEAM_CURVES into short analytic seam segments.
   */
  const seamSegments = [];


  TRUE_SEAM_CURVES.forEach(
    (
      curve,
      curveIndex
    ) => {
      for (
        let segmentIndex = 0;
        segmentIndex <
          curve.points.length - 1;
        segmentIndex += 1
      ) {
        const first =
          curve.points[
            segmentIndex
          ];

        const second =
          curve.points[
            segmentIndex + 1
          ];

        seamSegments.push({
          curveIndex,
          segmentIndex,
          first,
          second,

          midpoint:
            normalize3({
              x:
                first.x +
                second.x,

              y:
                first.y +
                second.y,

              z:
                first.z +
                second.z,
            }),
        });
      }
    }
  );


  /*
   * Walk forward around the original cell boundary from one
   * analytic intersection to the other.
   */
  function boundaryChain(
    cell,
    startIntersection,
    endIntersection
  ) {
    const result = [
      startIntersection.point,
    ];

    let vertexIndex =
      (
        startIntersection.edgeIndex +
        1
      ) %
      cell.vertices.length;

    let guard =
      0;


    while (
      guard <=
        cell.vertices.length
    ) {
      result.push(
        cell.vertices[
          vertexIndex
        ]
      );

      if (
        vertexIndex ===
        endIntersection.edgeIndex
      ) {
        break;
      }

      vertexIndex =
        (
          vertexIndex + 1
        ) %
        cell.vertices.length;

      guard += 1;
    }


    result.push(
      endIntersection.point
    );

    return result;
  }


  /*
   * Extract the ACTUAL analytic seam polyline between the two
   * cell-boundary intersections.
   */
  function seamChain(
    firstIntersection,
    secondIntersection
  ) {
    const curve =
      TRUE_SEAM_CURVES[
        firstIntersection
          .curveIndex
      ];

    let first =
      firstIntersection;

    let second =
      secondIntersection;

    let reverse =
      false;


    if (
      first.position >
      second.position
    ) {
      first =
        secondIntersection;

      second =
        firstIntersection;

      reverse =
        true;
    }


    const result = [
      first.point,
    ];


    for (
      let pointIndex =
        first.segmentIndex + 1;
      pointIndex <=
        second.segmentIndex;
      pointIndex += 1
    ) {
      result.push(
        curve.points[
          pointIndex
        ]
      );
    }


    result.push(
      second.point
    );


    return reverse
      ? result.reverse()
      : result;
  }


  /*
   * Once the old cell is split, one piece retains its established
   * root identity. The opposite piece gets the nearest established
   * different region.
   */
  function nearestDifferentRegion(
    point,
    ownRegion
  ) {
    let bestRegion =
      ownRegion;

    let bestScore =
      -Infinity;


    cells.forEach(
      (
        candidate,
        candidateIndex
      ) => {
        if (
          candidate.regionIndex ===
          ownRegion
        ) {
          return;
        }

        const score =
          dot3(
            point,
            cellCenters[
              candidateIndex
            ]
          );

        if (
          score >
          bestScore
        ) {
          bestScore =
            score;

          bestRegion =
            candidate.regionIndex;
        }
      }
    );


    return bestRegion;
  }


  /*
   * TWO-SEAM CELL SUPPORT
   *
   * Most remaining ambiguous cells contain exactly two ordinary,
   * non-junction seam crossings.
   *
   * After the first exact cut, remap the second crossing onto the
   * boundary of whichever child polygon contains it, then perform
   * the same exact cut a second time.
   *
   * No recursive refinement. No new quartic solves.
   */


  function sphericalDistance(
    first,
    second
  ) {
    return Math.acos(
      clamp(
        dot3(
          first,
          second
        ),
        -1,
        1
      )
    );
  }


  function edgeContainingPoint(
    vertices,
    point
  ) {
    let bestIndex =
      -1;

    let bestError =
      Infinity;


    for (
      let edgeIndex = 0;
      edgeIndex <
        vertices.length;
      edgeIndex += 1
    ) {
      const first =
        vertices[
          edgeIndex
        ];

      const second =
        vertices[
          (
            edgeIndex + 1
          ) %
          vertices.length
        ];


      const whole =
        sphericalDistance(
          first,
          second
        );

      const throughPoint =
        sphericalDistance(
          first,
          point
        ) +
        sphericalDistance(
          point,
          second
        );

      const error =
        Math.abs(
          throughPoint -
          whole
        );


      if (
        error <
        bestError
      ) {
        bestError =
          error;

        bestIndex =
          edgeIndex;
      }
    }


    /*
     * The points were already computed as exact intersections with
     * the original cell edges. This tolerance only accommodates
     * floating-point roundoff after the first polygon split.
     */
    return bestError <
      2e-5
      ? bestIndex
      : -1;
  }


  function originalBoundaryPosition(
    cell,
    intersection
  ) {
    const edgeIndex =
      intersection.edgeIndex;

    const first =
      cell.vertices[
        edgeIndex
      ];

    const second =
      cell.vertices[
        (
          edgeIndex + 1
        ) %
        cell.vertices.length
      ];

    const whole =
      sphericalDistance(
        first,
        second
      );

    const partial =
      sphericalDistance(
        first,
        intersection.point
      );

    const t =
      whole > 1e-12
        ? clamp(
            partial / whole,
            0,
            1
          )
        : 0;

    return (
      edgeIndex +
      t
    );
  }


  function crossingsAlternateOnBoundary(
    cell,
    firstCrossing,
    secondCrossing
  ) {
    const entries = [
      {
        label: 'A',
        position:
          originalBoundaryPosition(
            cell,
            firstCrossing[0]
          ),
      },
      {
        label: 'A',
        position:
          originalBoundaryPosition(
            cell,
            firstCrossing[1]
          ),
      },
      {
        label: 'B',
        position:
          originalBoundaryPosition(
            cell,
            secondCrossing[0]
          ),
      },
      {
        label: 'B',
        position:
          originalBoundaryPosition(
            cell,
            secondCrossing[1]
          ),
      },
    ].sort(
      (
        left,
        right
      ) =>
        left.position -
        right.position
    );

    const labels =
      entries
        .map(
          entry =>
            entry.label
        )
        .join('');

    return (
      labels === 'ABAB' ||
      labels === 'BABA'
    );
  }


  function forwardBoundaryContainsPosition(
    start,
    end,
    test,
    perimeter
  ) {
    const forwardLength =
      (
        end -
        start +
        perimeter
      ) %
      perimeter;

    const testDistance =
      (
        test -
        start +
        perimeter
      ) %
      perimeter;

    return (
      testDistance <=
      forwardLength + 1e-9
    );
  }


  function secondCrossingTargetPiece(
    cell,
    firstCrossing,
    secondCrossing
  ) {
    const orderedFirst =
      [...firstCrossing]
        .sort(
          (
            left,
            right
          ) =>
            left.position -
            right.position
        );


    const perimeter =
      cell.vertices.length;

    const start =
      originalBoundaryPosition(
        cell,
        orderedFirst[0]
      );

    const end =
      originalBoundaryPosition(
        cell,
        orderedFirst[1]
      );


    const secondPositions =
      secondCrossing.map(
        intersection =>
          originalBoundaryPosition(
            cell,
            intersection
          )
      );


    const firstInsideForward =
      forwardBoundaryContainsPosition(
        start,
        end,
        secondPositions[0],
        perimeter
      );

    const secondInsideForward =
      forwardBoundaryContainsPosition(
        start,
        end,
        secondPositions[1],
        perimeter
      );


    /*
     * If the two second-seam endpoints lie on different boundary
     * arcs, the crossings alternate and this is not a sequential
     * non-crossing case.
     */
    if (
      firstInsideForward !==
      secondInsideForward
    ) {
      return null;
    }


    /*
     * splitCellWithCrossing() constructs:
     *
     *   piece 0 = boundaryForward + analytic seam
     *   piece 1 = boundaryBackward + analytic seam
     */
    return firstInsideForward
      ? 0
      : 1;
  }


  function splitSimpleXCrossingCell(
    cell,
    firstCrossing,
    secondCrossing
  ) {
    const firstOrdered =
      [...firstCrossing]
        .sort(
          (
            left,
            right
          ) =>
            left.position -
            right.position
        );

    const secondOrdered =
      [...secondCrossing]
        .sort(
          (
            left,
            right
          ) =>
            left.position -
            right.position
        );


    const firstChain =
      seamChain(
        firstOrdered[0],
        firstOrdered[1]
      );

    const secondChain =
      seamChain(
        secondOrdered[0],
        secondOrdered[1]
      );


    const boundaryEndpoints = [
      firstOrdered[0].point,
      firstOrdered[1].point,
      secondOrdered[0].point,
      secondOrdered[1].point,
    ];


    let junction =
      null;

    let firstSegmentIndex =
      -1;

    let secondSegmentIndex =
      -1;


    for (
      let firstIndex = 0;
      firstIndex <
        firstChain.length - 1;
      firstIndex += 1
    ) {
      for (
        let secondIndex = 0;
        secondIndex <
          secondChain.length - 1;
        secondIndex += 1
      ) {
        const intersection =
          intersectSphereSegments(
            firstChain[
              firstIndex
            ],
            firstChain[
              firstIndex + 1
            ],
            secondChain[
              secondIndex
            ],
            secondChain[
              secondIndex + 1
            ]
          );


        if (!intersection) {
          continue;
        }


        const atBoundaryEndpoint =
          boundaryEndpoints.some(
            endpoint =>
              sphericalDistance(
                intersection,
                endpoint
              ) <
              2e-5
          );


        if (atBoundaryEndpoint) {
          continue;
        }


        if (
          junction &&
          sphericalDistance(
            junction,
            intersection
          ) >=
          2e-5
        ) {
          /*
           * More than one genuine interior intersection:
           * not the simple X case.
           */
          return null;
        }


        junction =
          intersection;

        firstSegmentIndex =
          firstIndex;

        secondSegmentIndex =
          secondIndex;
      }
    }


    if (
      !junction ||
      firstSegmentIndex < 0 ||
      secondSegmentIndex < 0
    ) {
      return null;
    }


    /*
     * Four exact arms, each running from a cell-boundary
     * intersection to the common analytic junction.
     */
    const firstStartArm = [
      ...firstChain.slice(
        0,
        firstSegmentIndex + 1
      ),
      junction,
    ];

    const firstEndArm = [
      ...firstChain
        .slice(
          firstSegmentIndex + 1
        )
        .reverse(),
      junction,
    ];

    const secondStartArm = [
      ...secondChain.slice(
        0,
        secondSegmentIndex + 1
      ),
      junction,
    ];

    const secondEndArm = [
      ...secondChain
        .slice(
          secondSegmentIndex + 1
        )
        .reverse(),
      junction,
    ];


    const boundaryEntries = [
      {
        intersection:
          firstOrdered[0],

        arm:
          firstStartArm,
      },

      {
        intersection:
          firstOrdered[1],

        arm:
          firstEndArm,
      },

      {
        intersection:
          secondOrdered[0],

        arm:
          secondStartArm,
      },

      {
        intersection:
          secondOrdered[1],

        arm:
          secondEndArm,
      },
    ]
      .map(
        entry => ({
          ...entry,

          boundaryPosition:
            originalBoundaryPosition(
              cell,
              entry.intersection
            ),
        })
      )
      .sort(
        (
          left,
          right
        ) =>
          left.boundaryPosition -
          right.boundaryPosition
      );


    const sectors = [];


    for (
      let index = 0;
      index <
        boundaryEntries.length;
      index += 1
    ) {
      const startEntry =
        boundaryEntries[
          index
        ];

      const endEntry =
        boundaryEntries[
          (
            index + 1
          ) %
          boundaryEntries.length
        ];


      const boundary =
        boundaryChain(
          cell,
          startEntry.intersection,
          endEntry.intersection
        );


      /*
       * boundary:
       *     start -> ... -> end
       *
       * end arm:
       *     end -> ... -> junction
       *
       * reverse(start arm):
       *     junction -> ... -> start
       */
      const backToStart =
        [...startEntry.arm]
          .reverse();


      const vertices = [
        ...boundary,

        ...endEntry.arm.slice(
          1
        ),

        ...backToStart.slice(
          1,
          -1
        ),
      ];


      if (
        vertices.length < 3
      ) {
        return null;
      }


      const center =
        polygonCenter(
          vertices
        );


      /*
       * Only 22 cells reach this branch.
       * Use the analytic quartic sheet classifier directly,
       * rather than guessing from a nearby coarse cell.
       */
      const regionIndex =
        regionIndexAtSpherePoint(
          center
        );


      if (
        regionIndex === null ||
        regionIndex === undefined
      ) {
        return null;
      }


      sectors.push({
        ...cell,

        key:
          `${cell.key}-x-sector-${index}`,

        vertices,

        regionIndex,
      });
    }


    return sectors.length === 4
      ? sectors
      : null;
  }


  function remapCrossingToCell(
    targetCell,
    crossing
  ) {
    const remapped =
      crossing.map(
        intersection => ({
          ...intersection,

          edgeIndex:
            edgeContainingPoint(
              targetCell.vertices,
              intersection.point
            ),
        })
      );


    if (
      remapped.some(
        intersection =>
          intersection.edgeIndex <
          0
      )
    ) {
      return null;
    }


    if (
      remapped[0].edgeIndex ===
      remapped[1].edgeIndex
    ) {
      return null;
    }


    return remapped;
  }


  function splitCellWithCrossing(
    targetCell,
    crossing
  ) {
    const ordered =
      [...crossing]
        .sort(
          (
            left,
            right
          ) =>
            left.position -
            right.position
        );


    const firstIntersection =
      ordered[0];

    const secondIntersection =
      ordered[1];


    const analyticChain =
      seamChain(
        firstIntersection,
        secondIntersection
      );


    const boundaryForward =
      boundaryChain(
        targetCell,
        firstIntersection,
        secondIntersection
      );

    const boundaryBackward =
      boundaryChain(
        targetCell,
        secondIntersection,
        firstIntersection
      );


    const analyticBackward =
      [...analyticChain]
        .reverse();


    const firstPolygon = [
      ...boundaryForward,

      ...analyticBackward.slice(
        1,
        -1
      ),
    ];


    const secondPolygon = [
      ...analyticChain,

      ...boundaryBackward.slice(
        1,
        -1
      ),
    ];


    if (
      firstPolygon.length < 3 ||
      secondPolygon.length < 3
    ) {
      return null;
    }


    const targetCenter =
      polygonCenter(
        targetCell.vertices
      );

    const firstCenter =
      polygonCenter(
        firstPolygon
      );

    const secondCenter =
      polygonCenter(
        secondPolygon
      );


    const firstKeepsOwnRegion =
      dot3(
        targetCenter,
        firstCenter
      ) >=
      dot3(
        targetCenter,
        secondCenter
      );


    const ownRegion =
      targetCell.regionIndex;

    const otherCenter =
      firstKeepsOwnRegion
        ? secondCenter
        : firstCenter;


    const otherRegion =
      nearestDifferentRegion(
        otherCenter,
        ownRegion
      );


    return [
      {
        ...targetCell,

        key:
          `${targetCell.key}-cut-a`,

        vertices:
          firstPolygon,

        regionIndex:
          firstKeepsOwnRegion
            ? ownRegion
            : otherRegion,
      },

      {
        ...targetCell,

        key:
          `${targetCell.key}-cut-b`,

        vertices:
          secondPolygon,

        regionIndex:
          firstKeepsOwnRegion
            ? otherRegion
            : ownRegion,
      },
    ];
  }


  const result = [];

  let splitCount =
    0;

  let ambiguousCount =
    0;

  const ambiguousDiagnostics =
    [];

  const twoSeamFailureReasons = {
    firstSplitFailed: 0,
    noSecondCandidate: 0,
    multipleSecondCandidates: 0,
    secondSplitFailed: 0,
  };

  const twoSeamIntersectionAudit = {
    multipleCandidateCells: 0,
    cellsWithInteriorIntersection: 0,
    cellsWithoutInteriorIntersection: 0,
    cellsWithMultipleInteriorIntersections: 0,
    totalInteriorIntersections: 0,
  };

  const doubleIntersectionDistanceAudit = {
    cellCount: 0,
    minAngularSeparation: Infinity,
    maxAngularSeparation: 0,
    separations: [],
  };

  const twoSeamBoundaryOrderAudit = {
    alternating: 0,
    nonAlternating: 0,
    alternatingWithInteriorIntersection: 0,
    alternatingWithoutInteriorIntersection: 0,
    nonAlternatingWithInteriorIntersection: 0,
    nonAlternatingWithoutInteriorIntersection: 0,
  };


  cells.forEach(
    (
      cell,
      cellIndex
    ) => {
      if (
        !candidateCellIndices.has(
          cellIndex
        )
      ) {
        result.push(cell);
        return;
      }


      const cellCenter =
        cellCenters[
          cellIndex
        ];

      let cellRadius =
        0;


      cell.vertices.forEach(
        vertex => {
          cellRadius =
            Math.max(
              cellRadius,
              Math.acos(
                clamp(
                  dot3(
                    cellCenter,
                    vertex
                  ),
                  -1,
                  1
                )
              )
            );
        }
      );


      /*
       * Very cheap spherical proximity rejection before doing
       * tangent-plane intersection work.
       */
      const proximityCosine =
        Math.cos(
          cellRadius +
          0.035
        );

      const intersections = [];


      for (
        let edgeIndex = 0;
        edgeIndex <
          cell.vertices.length;
        edgeIndex += 1
      ) {
        const edgeStart =
          cell.vertices[
            edgeIndex
          ];

        const edgeEnd =
          cell.vertices[
            (
              edgeIndex + 1
            ) %
            cell.vertices.length
          ];


        seamSegments.forEach(
          segment => {
            if (
              dot3(
                cellCenter,
                segment.midpoint
              ) <
              proximityCosine
            ) {
              return;
            }


            const point =
              intersectSphereSegments(
                edgeStart,
                edgeEnd,
                segment.first,
                segment.second
              );

            if (!point) {
              return;
            }


            const seamDelta = {
              x:
                segment.second.x -
                segment.first.x,

              y:
                segment.second.y -
                segment.first.y,

              z:
                segment.second.z -
                segment.first.z,
            };

            const lengthSquared =
              dot3(
                seamDelta,
                seamDelta
              );

            const segmentT =
              lengthSquared >
                1e-16
                ? clamp(
                    (
                      (
                        point.x -
                        segment.first.x
                      ) *
                        seamDelta.x +
                      (
                        point.y -
                        segment.first.y
                      ) *
                        seamDelta.y +
                      (
                        point.z -
                        segment.first.z
                      ) *
                        seamDelta.z
                    ) /
                      lengthSquared,
                    0,
                    1
                  )
                : 0;


            intersections.push({
              point,
              edgeIndex,

              curveIndex:
                segment.curveIndex,

              segmentIndex:
                segment.segmentIndex,

              position:
                segment.segmentIndex +
                segmentT,
            });
          }
        );
      }


      /*
       * The same geometric crossing can appear through two adjacent
       * analytic samples. Collapse those duplicates.
       */
      const unique = [];

      const seen =
        new Set();


      intersections.forEach(
        intersection => {
          const key =
            `${intersection.curveIndex}|` +
            pointKey(
              intersection.point
            );

          if (
            seen.has(key)
          ) {
            return;
          }

          seen.add(key);

          unique.push(
            intersection
          );
        }
      );


      const byCurve =
        new Map();


      unique.forEach(
        intersection => {
          if (
            !byCurve.has(
              intersection.curveIndex
            )
          ) {
            byCurve.set(
              intersection.curveIndex,
              []
            );
          }

          byCurve
            .get(
              intersection.curveIndex
            )
            .push(
              intersection
            );
        }
      );


      /*
       * Ordinary cut cell:
       *
       * exactly one analytic seam curve enters through one cell
       * edge and leaves through another.
       *
       * Junction/ramification cells are deliberately left untouched
       * in this first exact-geometry pass.
       */
      const ordinaryCrossings =
        [...byCurve.values()]
          .filter(
            group =>
              group.length === 2 &&
              group[0].edgeIndex !==
                group[1].edgeIndex
          );


      /*
       * Standard case: one analytic seam crosses this cell.
       */
      if (
        ordinaryCrossings.length ===
        1
      ) {
        const pieces =
          splitCellWithCrossing(
            cell,
            ordinaryCrossings[0]
          );


        if (!pieces) {
          result.push(cell);
          return;
        }


        result.push(
          ...pieces
        );

        splitCount += 1;
        return;
      }


      /*
       * Dominant previously-unhandled case:
       *
       * two distinct ordinary analytic seams cross the same refined
       * cell. The histogram showed 624 such cells.
       *
       * Cut by the first seam. Then locate BOTH endpoints of the
       * second seam on one resulting child polygon. If exactly one
       * child contains that complete second crossing, cut that child.
       *
       * If the second seam is split across both children, the two
       * seams genuinely meet/cross inside this cell. That is a true
       * junction case and remains untouched for now.
       */
      if (
        ordinaryCrossings.length ===
        2
      ) {
        const firstPieces =
          splitCellWithCrossing(
            cell,
            ordinaryCrossings[0]
          );


        if (!firstPieces) {
          twoSeamFailureReasons
            .firstSplitFailed += 1;
        } else {
          const secondCandidates =
            firstPieces
              .map(
                (
                  piece,
                  pieceIndex
                ) => ({
                  pieceIndex,

                  crossing:
                    remapCrossingToCell(
                      piece,
                      ordinaryCrossings[1]
                    ),
                })
              )
              .filter(
                candidate =>
                  candidate.crossing
              );


          if (
            secondCandidates.length ===
            0
          ) {
            twoSeamFailureReasons
              .noSecondCandidate += 1;
          } else if (
            secondCandidates.length >
            1
          ) {
            twoSeamFailureReasons
              .multipleSecondCandidates +=
              1;

            twoSeamIntersectionAudit
              .multipleCandidateCells +=
              1;


            const firstOrdered =
              [...ordinaryCrossings[0]]
                .sort(
                  (
                    left,
                    right
                  ) =>
                    left.position -
                    right.position
                );

            const secondOrdered =
              [...ordinaryCrossings[1]]
                .sort(
                  (
                    left,
                    right
                  ) =>
                    left.position -
                    right.position
                );


            const firstChain =
              seamChain(
                firstOrdered[0],
                firstOrdered[1]
              );

            const secondChain =
              seamChain(
                secondOrdered[0],
                secondOrdered[1]
              );


            const boundaryEndpoints = [
              firstOrdered[0].point,
              firstOrdered[1].point,
              secondOrdered[0].point,
              secondOrdered[1].point,
            ];


            const interiorIntersections =
              [];


            for (
              let firstIndex = 0;
              firstIndex <
                firstChain.length - 1;
              firstIndex += 1
            ) {
              for (
                let secondIndex = 0;
                secondIndex <
                  secondChain.length - 1;
                secondIndex += 1
              ) {
                const intersection =
                  intersectSphereSegments(
                    firstChain[
                      firstIndex
                    ],
                    firstChain[
                      firstIndex + 1
                    ],
                    secondChain[
                      secondIndex
                    ],
                    secondChain[
                      secondIndex + 1
                    ]
                  );


                if (!intersection) {
                  continue;
                }


                /*
                 * Ignore an intersection that is merely one of the
                 * four known cell-boundary seam endpoints.
                 */
                const atBoundaryEndpoint =
                  boundaryEndpoints.some(
                    endpoint =>
                      sphericalDistance(
                        intersection,
                        endpoint
                      ) <
                      2e-5
                  );


                if (
                  atBoundaryEndpoint
                ) {
                  continue;
                }


                /*
                 * Adjacent polyline segments can report the same
                 * geometric crossing. Collapse those duplicates.
                 */
                const duplicate =
                  interiorIntersections.some(
                    existing =>
                      sphericalDistance(
                        intersection,
                        existing
                      ) <
                      2e-5
                  );


                if (!duplicate) {
                  interiorIntersections.push(
                    intersection
                  );
                }
              }
            }


            const boundaryAlternates =
              crossingsAlternateOnBoundary(
                cell,
                ordinaryCrossings[0],
                ordinaryCrossings[1]
              );


            if (boundaryAlternates) {
              twoSeamBoundaryOrderAudit
                .alternating += 1;

              if (
                interiorIntersections.length >
                0
              ) {
                twoSeamBoundaryOrderAudit
                  .alternatingWithInteriorIntersection +=
                  1;
              } else {
                twoSeamBoundaryOrderAudit
                  .alternatingWithoutInteriorIntersection +=
                  1;
              }
            } else {
              twoSeamBoundaryOrderAudit
                .nonAlternating += 1;

              if (
                interiorIntersections.length >
                0
              ) {
                twoSeamBoundaryOrderAudit
                  .nonAlternatingWithInteriorIntersection +=
                  1;
              } else {
                twoSeamBoundaryOrderAudit
                  .nonAlternatingWithoutInteriorIntersection +=
                  1;
              }
            }


            /*
             * SIMPLE X-JUNCTION CASE.
             *
             * Alternating endpoints + exactly one genuine interior
             * seam intersection means two analytic arcs cross once.
             *
             * Split directly into four sectors meeting at the exact
             * analytic junction.
             */
            if (
              boundaryAlternates &&
              interiorIntersections.length ===
                1
            ) {
              const xSectors =
                splitSimpleXCrossingCell(
                  cell,
                  ordinaryCrossings[0],
                  ordinaryCrossings[1]
                );


              if (xSectors) {
                result.push(
                  ...xSectors
                );

                /*
                 * One original polygon becomes four:
                 * net +3 pieces.
                 */
                splitCount += 3;

                return;
              }
            }


            /*
             * Safe sequential case.
             *
             * If the endpoint order is non-alternating AND the two
             * analytic chains have no interior intersection, the
             * second seam lies wholly inside exactly one side of the
             * first cut.
             *
             * Choose that child from boundary topology instead of
             * relying on edgeContainingPoint(), whose tolerance is
             * what produced these false double-candidates.
             */
            if (
              !boundaryAlternates &&
              interiorIntersections.length ===
                0
            ) {
              const targetIndex =
                secondCrossingTargetPiece(
                  cell,
                  ordinaryCrossings[0],
                  ordinaryCrossings[1]
                );


              if (
                targetIndex !== null
              ) {
                const remappedCrossing =
                  remapCrossingToCell(
                    firstPieces[
                      targetIndex
                    ],
                    ordinaryCrossings[1]
                  );


                if (remappedCrossing) {
                  const secondPieces =
                    splitCellWithCrossing(
                      firstPieces[
                        targetIndex
                      ],
                      remappedCrossing
                    );


                  if (secondPieces) {
                    const untouchedIndex =
                      targetIndex === 0
                        ? 1
                        : 0;


                    result.push(
                      firstPieces[
                        untouchedIndex
                      ],

                      ...secondPieces
                    );


                    splitCount += 2;

                    return;
                  }
                }
              }
            }


            if (
              interiorIntersections.length >
              0
            ) {
              twoSeamIntersectionAudit
                .cellsWithInteriorIntersection +=
                1;

              twoSeamIntersectionAudit
                .totalInteriorIntersections +=
                interiorIntersections.length;

              if (
                interiorIntersections.length >
                1
              ) {
                twoSeamIntersectionAudit
                  .cellsWithMultipleInteriorIntersections +=
                  1;

                if (
                  interiorIntersections.length ===
                  2
                ) {
                  const separation =
                    sphericalDistance(
                      interiorIntersections[0],
                      interiorIntersections[1]
                    );

                  doubleIntersectionDistanceAudit
                    .cellCount += 1;

                  doubleIntersectionDistanceAudit
                    .minAngularSeparation =
                      Math.min(
                        doubleIntersectionDistanceAudit
                          .minAngularSeparation,
                        separation
                      );

                  doubleIntersectionDistanceAudit
                    .maxAngularSeparation =
                      Math.max(
                        doubleIntersectionDistanceAudit
                          .maxAngularSeparation,
                        separation
                      );

                  doubleIntersectionDistanceAudit
                    .separations.push({
                      cellKey:
                        cell.key,

                      radians:
                        separation,

                      degrees:
                        separation *
                        180 /
                        Math.PI,

                      first: {
                        x:
                          interiorIntersections[0].x,
                        y:
                          interiorIntersections[0].y,
                        z:
                          interiorIntersections[0].z,
                      },

                      second: {
                        x:
                          interiorIntersections[1].x,
                        y:
                          interiorIntersections[1].y,
                        z:
                          interiorIntersections[1].z,
                      },
                    });
                }
              }
            } else {
              twoSeamIntersectionAudit
                .cellsWithoutInteriorIntersection +=
                1;
            }
          } else {
            const targetIndex =
              secondCandidates[0]
                .pieceIndex;

            const secondPieces =
              splitCellWithCrossing(
                firstPieces[
                  targetIndex
                ],
                secondCandidates[0]
                  .crossing
              );


            if (!secondPieces) {
              twoSeamFailureReasons
                .secondSplitFailed += 1;
            } else {
              const untouchedIndex =
                targetIndex === 0
                  ? 1
                  : 0;


              result.push(
                firstPieces[
                  untouchedIndex
                ],

                ...secondPieces
              );


              splitCount += 2;
              return;
            }
          }
        }
      }


      /*
       * Genuine endpoint / junction / higher-order case.
       *
       * Keep the established behavior for now. These represented
       * only 20 of the 644 ambiguous cells in the diagnostic.
       */
      if (
        unique.length > 0
      ) {
        ambiguousCount += 1;

        if (
          typeof ambiguousDiagnostics !==
          'undefined'
        ) {
          ambiguousDiagnostics.push({
            key:
              cell.key,

            regionIndex:
              cell.regionIndex,

            center: {
              x:
                cellCenter.x,

              y:
                cellCenter.y,

              z:
                cellCenter.z,
            },

            vertexCount:
              cell.vertices.length,

            intersectionCount:
              unique.length,

            curveCount:
              byCurve.size,

            ordinaryCrossingCount:
              ordinaryCrossings.length,
          });
        }
      }


      result.push(cell);
      return;
    }
  );


  console.info(
    '[Riemann surface] analytic cut-cell geometry',
    {
      splitCount,
      ambiguousCount,

      sourceCellCount:
        cells.length,

      outputCellCount:
        result.length,
    }
  );


  console.info(
    '[Riemann surface] two-seam failure reasons',
    twoSeamFailureReasons
  );


  console.info(
    '[Riemann surface] two-seam intersection audit',
    twoSeamIntersectionAudit
  );


  if (
    doubleIntersectionDistanceAudit
      .cellCount
  ) {
    console.info(
      '[Riemann surface] double-intersection distance audit',
      {
        ...doubleIntersectionDistanceAudit,

        minDegrees:
          doubleIntersectionDistanceAudit
            .minAngularSeparation *
          180 /
          Math.PI,

        maxDegrees:
          doubleIntersectionDistanceAudit
            .maxAngularSeparation *
          180 /
          Math.PI,
      }
    );
  }


  console.info(
    '[Riemann surface] two-seam boundary-order audit',
    twoSeamBoundaryOrderAudit
  );


  if (
    ambiguousDiagnostics.length
  ) {
    const ambiguousHistogram = {};

    ambiguousDiagnostics.forEach(
      item => {
        const key =
          `curves=${item.curveCount}, ` +
          `intersections=${item.intersectionCount}, ` +
          `ordinary=${item.ordinaryCrossingCount}`;

        ambiguousHistogram[key] =
          (ambiguousHistogram[key] ?? 0) +
          1;
      }
    );

    console.info(
      '[Riemann surface] ambiguous seam histogram',
      ambiguousHistogram
    );

    console.info(
      '[Riemann surface] ambiguous seam cells',
      {
        count:
          ambiguousDiagnostics.length,

        cells:
          ambiguousDiagnostics,
      }
    );
  }


  return result;
}


/*
 * LINE-AUTHORITATIVE COLORING.
 *
 * TRUE_SEAM_CURVES IS THE BOUNDARY.
 *
 * The old refined mesh is used only to tell us which established
 * root color lies on each side of that boundary.
 *
 * The old approximate color-boundary cells are removed.
 * They are replaced by colored half-ribbons constructed DIRECTLY
 * from TRUE_SEAM_CURVES.
 *
 * Therefore the shared colored edge is literally the same point
 * sequence as the white analytic seam.
 */
const LINE_BOUNDARY_HALF_WIDTH =
  0.060;


function buildLineAuthoritativeSurface(
  cells
) {
  function pointKey(point) {
    return [
      point.x.toFixed(10),
      point.y.toFixed(10),
      point.z.toFixed(10),
    ].join(':');
  }


  function edgeKey(
    first,
    second
  ) {
    const firstKey =
      pointKey(first);

    const secondKey =
      pointKey(second);

    return firstKey < secondKey
      ? `${firstKey}|${secondKey}`
      : `${secondKey}|${firstKey}`;
  }


  const cellByKey =
    new Map(
      cells.map(
        cell => [
          cell.key,
          cell,
        ]
      )
    );


  /*
   * The previous flood fill already established the correct root
   * identity throughout the sphere.
   *
   * We consult it ONLY to ask:
   *
   *     which color lies on this side of the TRUE line?
   */
  function regionAtPoint(point) {
    const latitude =
      Math.asin(
        clamp(
          point.z,
          -1,
          1
        )
      );

    let longitude =
      Math.atan2(
        point.y,
        point.x
      );

    if (longitude < 0) {
      longitude +=
        2 * Math.PI;
    }


    const latitudePosition =
      clamp(
        (
          latitude +
          Math.PI / 2
        ) /
          Math.PI *
          LATITUDE_STEPS,
        0,
        LATITUDE_STEPS -
          1e-9
      );

    const longitudePosition =
      clamp(
        longitude /
          (2 * Math.PI) *
          LONGITUDE_STEPS,
        0,
        LONGITUDE_STEPS -
          1e-9
      );


    const latitudeIndex =
      Math.floor(
        latitudePosition
      );

    const longitudeIndex =
      Math.floor(
        longitudePosition
      );


    const localLatitude =
      Math.min(
        SEAM_LOCAL_SUBDIVISIONS - 1,
        Math.floor(
          (
            latitudePosition -
            latitudeIndex
          ) *
          SEAM_LOCAL_SUBDIVISIONS
        )
      );

    const localLongitude =
      Math.min(
        SEAM_LOCAL_SUBDIVISIONS - 1,
        Math.floor(
          (
            longitudePosition -
            longitudeIndex
          ) *
          SEAM_LOCAL_SUBDIVISIONS
        )
      );


    const refined =
      cellByKey.get(
        `refined-sphere-${latitudeIndex}-${longitudeIndex}-${localLatitude}-${localLongitude}`
      );


    if (refined) {
      return refined.regionIndex;
    }


    const coarse =
      cellByKey.get(
        `coarse-sphere-${latitudeIndex}-${longitudeIndex}`
      );


    if (coarse) {
      return coarse.regionIndex;
    }


    return (
      REGION_DECOMPOSITION
        .regionByCell
        .get(
          `sphere-${latitudeIndex}-${longitudeIndex}`
        ) ??
      0
    );
  }


  /*
   * Identify the OBSOLETE mesh color boundary only so that it can
   * be removed from the drawing.
   *
   * It does NOT determine the new boundary.
   */
  const edgeIncidence =
    new Map();


  cells.forEach(
    (
      cell,
      cellIndex
    ) => {
      for (
        let edgeIndex = 0;
        edgeIndex <
          cell.vertices.length;
        edgeIndex += 1
      ) {
        const first =
          cell.vertices[
            edgeIndex
          ];

        const second =
          cell.vertices[
            (
              edgeIndex + 1
            ) %
            cell.vertices.length
          ];

        const key =
          edgeKey(
            first,
            second
          );


        if (
          !edgeIncidence.has(
            key
          )
        ) {
          edgeIncidence.set(
            key,
            []
          );
        }


        edgeIncidence
          .get(key)
          .push(
            cellIndex
          );
      }
    }
  );


  const removed =
    new Set();


  edgeIncidence.forEach(
    incidents => {
      if (
        incidents.length !== 2
      ) {
        return;
      }


      const first =
        cells[
          incidents[0]
        ];

      const second =
        cells[
          incidents[1]
        ];


      if (
        first.regionIndex !==
        second.regionIndex
      ) {
        removed.add(
          incidents[0]
        );

        removed.add(
          incidents[1]
        );
      }
    }
  );


  /*
   * Remove ONLY the cells that actually participate in the obsolete
   * mesh boundary. Do not remove a second neighboring ring.
   *
   * The analytic half-ribbons below are deliberately wide enough to
   * replace this one-cell boundary band, while their shared inner edge
   * remains TRUE_SEAM_CURVES itself.
   */


  const interiorCells =
    cells.filter(
      (
        _cell,
        cellIndex
      ) =>
        !removed.has(
          cellIndex
        )
    );


  /*
   * Tangent to the analytic seam on S^2.
   */
  function tangentAt(
    points,
    index
  ) {
    const previous =
      points[
        Math.max(
          0,
          index - 1
        )
      ];

    const current =
      points[index];

    const next =
      points[
        Math.min(
          points.length - 1,
          index + 1
        )
      ];


    const raw = {
      x:
        next.x -
        previous.x,

      y:
        next.y -
        previous.y,

      z:
        next.z -
        previous.z,
    };


    const radial =
      dot3(
        raw,
        current
      );


    return normalize3({
      x:
        raw.x -
        radial *
        current.x,

      y:
        raw.y -
        radial *
        current.y,

      z:
        raw.z -
        radial *
        current.z,
    });
  }


  /*
   * Tangent-plane direction transverse to the seam.
   */
  function sideDirection(
    point,
    tangent
  ) {
    return normalize3({
      x:
        point.y *
          tangent.z -
        point.z *
          tangent.y,

      y:
        point.z *
          tangent.x -
        point.x *
          tangent.z,

      z:
        point.x *
          tangent.y -
        point.y *
          tangent.x,
    });
  }


  function offsetPoint(
    point,
    side,
    angle
  ) {
    return normalize3({
      x:
        Math.cos(angle) *
          point.x +
        Math.sin(angle) *
          side.x,

      y:
        Math.cos(angle) *
          point.y +
        Math.sin(angle) *
          side.y,

      z:
        Math.cos(angle) *
          point.z +
        Math.sin(angle) *
          side.z,
    });
  }


  const ribbons = [];


  TRUE_SEAM_CURVES.forEach(
    curve => {
      if (
        curve.points.length < 2
      ) {
        return;
      }


      const sides =
        curve.points.map(
          (
            point,
            index
          ) =>
            sideDirection(
              point,
              tangentAt(
                curve.points,
                index
              )
            )
        );


      /*
       * Prevent left/right from flipping accidentally as we travel
       * along a seam curve.
       */
      for (
        let index = 1;
        index <
          sides.length;
        index += 1
      ) {
        if (
          dot3(
            sides[
              index - 1
            ],
            sides[index]
          ) < 0
        ) {
          sides[index] = {
            x:
              -sides[index].x,

            y:
              -sides[index].y,

            z:
              -sides[index].z,
          };
        }
      }


      const leftOuter =
        curve.points.map(
          (
            point,
            index
          ) =>
            offsetPoint(
              point,
              sides[index],
              LINE_BOUNDARY_HALF_WIDTH
            )
        );


      const rightOuter =
        curve.points.map(
          (
            point,
            index
          ) =>
            offsetPoint(
              point,
              sides[index],
              -LINE_BOUNDARY_HALF_WIDTH
            )
        );


      /*
       * THIS is the important part.
       *
       * Every TRUE analytic seam segment is simultaneously:
       *
       *   the right edge of one colored polygon
       *   the left edge of the other colored polygon
       *
       * Same coordinates. Same line. No approximation.
       */
      for (
        let index = 0;
        index <
          curve.points.length - 1;
        index += 1
      ) {
        const first =
          curve.points[index];

        const second =
          curve.points[
            index + 1
          ];


        const midpoint =
          normalize3({
            x:
              first.x +
              second.x,

            y:
              first.y +
              second.y,

            z:
              first.z +
              second.z,
          });


        const tangent =
          tangentAt(
            curve.points,
            index
          );

        const side =
          sideDirection(
            midpoint,
            tangent
          );


        const sampleAngle =
          LINE_BOUNDARY_HALF_WIDTH *
          1.45;


        const leftRegion =
          regionAtPoint(
            offsetPoint(
              midpoint,
              side,
              sampleAngle
            )
          );


        const rightRegion =
          regionAtPoint(
            offsetPoint(
              midpoint,
              side,
              -sampleAngle
            )
          );


        ribbons.push({
          key:
            `${curve.key}-line-left-${index}`,

          regionIndex:
            leftRegion,

          vertices: [
            first,
            second,
            leftOuter[
              index + 1
            ],
            leftOuter[index],
          ],
        });


        ribbons.push({
          key:
            `${curve.key}-line-right-${index}`,

          regionIndex:
            rightRegion,

          vertices: [
            rightOuter[index],
            rightOuter[
              index + 1
            ],
            second,
            first,
          ],
        });
      }
    }
  );


  console.info(
    '[Riemann surface] TRUE-SEAM coloring',
    {
      sourceCells:
        cells.length,

      retainedInteriorCells:
        interiorCells.length,

      removedOldBoundaryCells:
        removed.size,

      analyticBoundaryPolygons:
        ribbons.length,
    }
  );


  return {
    interiorCells,
    ribbons,
  };
}


/*
 * Build the line-authoritative colored partition ONCE.
 *
 * This is intentionally module-level and immutable: resizing, dragging,
 * and React re-renders never rebuild it. The white analytic seams and
 * the colored domain boundaries therefore share the same geometry
 * without restoring the old progressive requestAnimationFrame worker.
 */
console.time('[Riemann startup] line-authoritative surface');
let LINE_AUTHORITATIVE_SURFACE =
  buildLineAuthoritativeSurface(
    SPHERE_CELLS
  );
console.timeEnd('[Riemann startup] line-authoritative surface');

let LINE_AUTHORITATIVE_CELLS = [
  ...LINE_AUTHORITATIVE_SURFACE
    .interiorCells,

  ...LINE_AUTHORITATIVE_SURFACE
    .ribbons,
];


/*
 * Compare the current colored region boundaries against the
 * analytically continued seam graph.
 *
 * This is an AUDIT ONLY. It does not modify any polygon.
 */
function buildSeamIntersectionAudit(
  cells
) {
  function vertexKey(
    point
  ) {
    return [
      point.x.toFixed(10),
      point.y.toFixed(10),
      point.z.toFixed(10),
    ].join(':');
  }


  function edgeKey(
    first,
    second
  ) {
    const firstKey =
      vertexKey(
        first
      );

    const secondKey =
      vertexKey(
        second
      );

    return firstKey <
      secondKey
      ? `${firstKey}|${secondKey}`
      : `${secondKey}|${firstKey}`;
  }


  const edgeMap =
    new Map();


  cells.forEach(
    (
      cell,
      cellIndex
    ) => {
      for (
        let edgeIndex = 0;
        edgeIndex <
          cell.vertices.length;
        edgeIndex += 1
      ) {
        const first =
          cell.vertices[
            edgeIndex
          ];

        const second =
          cell.vertices[
            (
              edgeIndex + 1
            ) %
            cell.vertices.length
          ];

        const key =
          edgeKey(
            first,
            second
          );


        if (
          !edgeMap.has(
            key
          )
        ) {
          edgeMap.set(
            key,
            []
          );
        }


        edgeMap
          .get(key)
          .push({
            cellIndex,
            first,
            second,
          });
      }
    }
  );


  const colorBoundaryEdges =
    [];


  edgeMap.forEach(
    incidents => {
      if (
        incidents.length !== 2
      ) {
        return;
      }


      const firstCell =
        cells[
          incidents[0]
            .cellIndex
        ];

      const secondCell =
        cells[
          incidents[1]
            .cellIndex
        ];


      if (
        firstCell.regionIndex ===
        secondCell.regionIndex
      ) {
        return;
      }


      colorBoundaryEdges.push({
        first:
          incidents[0].first,

        second:
          incidents[0].second,

        firstRegion:
          firstCell.regionIndex,

        secondRegion:
          secondCell.regionIndex,
      });
    }
  );


  let intersectingBoundaryEdges =
    0;

  let multipleIntersectionEdges =
    0;

  let totalIntersections =
    0;


  colorBoundaryEdges.forEach(
    boundaryEdge => {
      let intersectionCount =
        0;


      TRUE_SEAM_CURVES.forEach(
        curve => {
          for (
            let pointIndex = 0;
            pointIndex <
              curve.points.length - 1;
            pointIndex += 1
          ) {
            const intersection =
              intersectSphereSegments(
                boundaryEdge.first,
                boundaryEdge.second,
                curve.points[
                  pointIndex
                ],
                curve.points[
                  pointIndex + 1
                ]
              );


            if (
              intersection
            ) {
              intersectionCount +=
                1;
            }
          }
        }
      );


      if (
        intersectionCount > 0
      ) {
        intersectingBoundaryEdges +=
          1;
      }


      if (
        intersectionCount > 1
      ) {
        multipleIntersectionEdges +=
          1;
      }


      totalIntersections +=
        intersectionCount;
    }
  );


  return {
    boundaryEdges:
      colorBoundaryEdges.length,

    intersectingBoundaryEdges,

    multipleIntersectionEdges,

    totalIntersections,
  };
}


function nearestRegionIndex(
  point
) {
  let bestCell =
    SPHERE_CELLS[0];

  let bestScore =
    -Infinity;

  SPHERE_CELLS.forEach(
    cell => {
      const score =
        dot3(
          point,
          cell.center
        );

      if (
        score >
        bestScore
      ) {
        bestScore =
          score;

        bestCell =
          cell;
      }
    }
  );

  return (
    REGION_DECOMPOSITION
      .regionByCell
      .get(
        bestCell.key
      ) ?? 0
  );
}


function tangentBasis(point) {
  const reference =
    Math.abs(point.z) < 0.9
      ? {
          x: 0,
          y: 0,
          z: 1,
        }
      : {
          x: 1,
          y: 0,
          z: 0,
        };

  const first =
    normalize3({
      x:
        reference.y *
          point.z -
        reference.z *
          point.y,

      y:
        reference.z *
          point.x -
        reference.x *
          point.z,

      z:
        reference.x *
          point.y -
        reference.y *
          point.x,
    });

  const second =
    normalize3({
      x:
        point.y *
          first.z -
        point.z *
          first.y,

      y:
        point.z *
          first.x -
        point.x *
          first.z,

      z:
        point.x *
          first.y -
        point.y *
          first.x,
    });

  return {
    first,
    second,
  };
}


function neighborhoodSignature(
  point,
  angularRadius = 0.16,
  sampleCount = 96
) {
  const basis =
    tangentBasis(point);

  const sequence = [];

  for (
    let index = 0;
    index < sampleCount;
    index += 1
  ) {
    const angle =
      2 * Math.PI *
      index /
      sampleCount;

    const tangent = {
      x:
        Math.cos(angle) *
          basis.first.x +
        Math.sin(angle) *
          basis.second.x,

      y:
        Math.cos(angle) *
          basis.first.y +
        Math.sin(angle) *
          basis.second.y,

      z:
        Math.cos(angle) *
          basis.first.z +
        Math.sin(angle) *
          basis.second.z,
    };

    const samplePoint =
      normalize3({
        x:
          Math.cos(
            angularRadius
          ) *
            point.x +
          Math.sin(
            angularRadius
          ) *
            tangent.x,

        y:
          Math.cos(
            angularRadius
          ) *
            point.y +
          Math.sin(
            angularRadius
          ) *
            tangent.y,

        z:
          Math.cos(
            angularRadius
          ) *
            point.z +
          Math.sin(
            angularRadius
          ) *
            tangent.z,
      });

    sequence.push(
      nearestRegionIndex(
        samplePoint
      )
    );
  }

  const compressed = [];

  sequence.forEach(
    regionIndex => {
      if (
        compressed.length === 0 ||
        compressed[
          compressed.length - 1
        ] !== regionIndex
      ) {
        compressed.push(
          regionIndex
        );
      }
    }
  );

  if (
    compressed.length > 1 &&
    compressed[0] ===
      compressed[
        compressed.length - 1
      ]
  ) {
    compressed.pop();
  }

  const unique =
    [...new Set(sequence)];

  return {
    sequence:
      compressed,

    unique,
  };
}


let TOPOLOGY_AUDIT =
  RAMIFICATION_POINTS.map(
    marker => ({
      id:
        marker.id,

      label:
        marker.label,

      ...neighborhoodSignature(
        marker.point,
        marker.id ===
          'x-infinity'
          ? 0.20
          : 0.14
      ),
    })
  );


/*
 * Temporary branch-cut convention control.
 *
 * The finite four-spoke tree is fixed.
 *
 * Only the ray
 *
 *     a = 0  ->  infinity
 *
 * rotates.
 *
 * Every cached object that depends on that ray is rebuilt together,
 * so the colored sheet decomposition and the analytic white seams
 * remain representations of the SAME convention.
 */
function rebuildConventionGeometry(
  angleDegrees
) {
  const angleRadians =
    angleDegrees *
    Math.PI / 180;


  CUT_TREE_INFINITY_RAY = {
    origin: {
      re: 0,
      im: 0,
    },

    direction: {
      re:
        Math.cos(
          angleRadians
        ),

      im:
        Math.sin(
          angleRadians
        ),
    },
  };


  /*
   * Rebuild in dependency order.
   */
  TRUE_SEAM_CURVES =
    buildTrueSeamCurves();


  REGION_DECOMPOSITION =
    buildRegionDecomposition();


  COMBINED_BOUNDARY_ATLAS_AUDIT =
    buildCombinedBoundaryAtlas();


  LINE_AUTHORITATIVE_SURFACE =
    buildLineAuthoritativeSurface(
      SPHERE_CELLS
    );


  LINE_AUTHORITATIVE_CELLS = [
    ...LINE_AUTHORITATIVE_SURFACE
      .interiorCells,

    ...LINE_AUTHORITATIVE_SURFACE
      .ribbons,
  ];


  TOPOLOGY_AUDIT =
    RAMIFICATION_POINTS.map(
      marker => ({
        id:
          marker.id,

        label:
          marker.label,

        ...neighborhoodSignature(
          marker.point,
          marker.id ===
            'x-infinity'
            ? 0.20
            : 0.14
        ),
      })
    );
}


export const RIEMANN_SURFACE_DIAGNOSTICS = {
  rawComponentCount:
    REGION_DECOMPOSITION.rawComponentCount,

  rawComponentSizes:
    REGION_DECOMPOSITION.rawComponentSizes,

  classifierMatching:
    CLASSIFIER_AUDIT_SUMMARY.matching,

  classifierDefined:
    CLASSIFIER_AUDIT_SUMMARY.defined,

  boundaryAtlasFaceCount:
    COMBINED_BOUNDARY_ATLAS_AUDIT.faceCount,

  boundaryAtlasClassifiedFaceCount:
    COMBINED_BOUNDARY_ATLAS_AUDIT.classifiedFaceCount,

  boundaryAtlasUnresolvedFaceCount:
    COMBINED_BOUNDARY_ATLAS_AUDIT.unresolvedFaceCount,

  boundaryAtlasFaceCountsByRoot:
    COMBINED_BOUNDARY_ATLAS_AUDIT.faceCountsByRoot,

  topologyAudit:
    TOPOLOGY_AUDIT.map(
      item => ({
        id:
          item.id,

        label:
          item.label,

        sequence:
          item.sequence.map(
            regionIndex =>
              ROOT_NAMES[
                regionIndex
              ]
          ),

        uniqueCount:
          item.unique.length,
      })
    ),
};


/*
 * ONE shared convention-angle entry point.
 *
 * The parent control panel calls this before publishing the
 * committed angle to both viewer instances.
 */
export function applyRiemannSurfaceConventionAngle(
  angleDegrees
) {
  const numericAngle =
    Number(angleDegrees);

  if (
    !Number.isFinite(
      numericAngle
    )
  ) {
    return;
  }


  rebuildConventionGeometry(
    numericAngle
  );


  /*
   * RIEMANN_SURFACE_DIAGNOSTICS is a stable exported object.
   *
   * Mutate its fields after rebuilding so the existing control-panel
   * audit readout follows the chosen convention as well.
   */
  Object.assign(
    RIEMANN_SURFACE_DIAGNOSTICS,
    {
      rawComponentCount:
        REGION_DECOMPOSITION
          .rawComponentCount,

      rawComponentSizes:
        REGION_DECOMPOSITION
          .rawComponentSizes,

      classifierMatching:
        CLASSIFIER_AUDIT_SUMMARY
          .matching,

      classifierDefined:
        CLASSIFIER_AUDIT_SUMMARY
          .defined,

      boundaryAtlasFaceCount:
        COMBINED_BOUNDARY_ATLAS_AUDIT
          .faceCount,

      boundaryAtlasClassifiedFaceCount:
        COMBINED_BOUNDARY_ATLAS_AUDIT
          .classifiedFaceCount,

      boundaryAtlasUnresolvedFaceCount:
        COMBINED_BOUNDARY_ATLAS_AUDIT
          .unresolvedFaceCount,

      boundaryAtlasFaceCountsByRoot:
        COMBINED_BOUNDARY_ATLAS_AUDIT
          .faceCountsByRoot,

      topologyAudit:
        TOPOLOGY_AUDIT.map(
          item => ({
            id:
              item.id,

            label:
              item.label,

            sequence:
              item.sequence.map(
                regionIndex =>
                  ROOT_NAMES[
                    regionIndex
                  ]
              ),

            uniqueCount:
              item.unique.length,
          })
        ),
    }
  );
}



function RiemannSurfaceViewer({
  active = false,
  surfaceOpacity = 0.13,
  displayMode = 'combined',
  showDiagnostics = true,
  roots = [],
  structureMode = [
    'root-paths',
    'real-locus',
    'imaginary-locus',
  ],
  conventionAngle = 180,
  asymptoticEnd = 0,
  onReady = null,
}) {
  const [
    view,
    setView,
  ] =
    useState({
      rotation: [
        ...IDENTITY_ROTATION,
      ],
      zoom: 1,
    });

  const [
    isDragging,
    setIsDragging,
  ] =
    useState(false);

  const dragRef =
    useRef(null);

  /*
   * Drag updates are coalesced to one React state update per
   * animation frame. Pointer events can arrive much faster than
   * the browser can repaint this large SVG sphere.
   */
  const rotateFrameRef =
    useRef(null);

  const pendingRotationRef =
    useRef(null);

  /*
   * The planar map's expensive static partition/grid is now a
   * pre-rendered image. Readiness is keyed to that image's real
   * browser load event rather than to sphere refinement.
   */
  const [
    planarBackgroundReady,
    setPlanarBackgroundReady,
  ] = useState(false);


  /*
   * Full compact x-sphere.
   *
   * The temporary radial-section control has been removed.
   * sectionLevel = 1 is its former right endpoint:
   * x = infinity / complete compact sphere.
   */
  const sectionLevel =
    1;


  const sectionZ =
    -1 +
    2 * sectionLevel;


  const sectionRadius =
    sectionLevel >=
      1 - 1e-8
      ? Infinity
      : Math.sqrt(
          sectionLevel /
          Math.max(
            1e-12,
            1 -
              sectionLevel
          )
        );




  /*
   * Progressive refinement worker.
   *
   * The current sphere remains the authoritative visible mesh
   * until a later patch explicitly swaps in completed refined
   * geometry.
   */
  const refinementCursorRef =
    useRef(0);

  const refinementFrameRef =
    useRef(null);

  const [
    refinementReady,
    setRefinementReady,
  ] =
    useState(false);

  const [
    refinedSphereCells,
    setRefinedSphereCells,
  ] =
    useState(null);

  const [
    lineBoundaryRibbons,
    setLineBoundaryRibbons,
  ] =
    useState([]);


  useEffect(
    () => {
      if (!active) {
        return undefined;
      }

      /*
       * MAP-ONLY FAST PATH.
       *
       * The planar partition/grid is now a saved PNG, so this
       * viewer no longer needs refined sphere geometry at all.
       * The separate sphere viewer will restore/build that data
       * only when the user actually opens the sphere.
       */
      if (displayMode === 'map') {
        setRefinementReady(false);
        return undefined;
      }

      refinementCursorRef.current =
        0;

      setLineBoundaryRibbons(
        []
      );

      /*
       * FIRST-PAINT PATH.
       *
       * Do not synchronously restore tens of thousands of refined
       * cells during the component's initial render.
       *
       * Let React commit the lightweight Riemann tab first, then
       * restore/build the heavy geometry on the next animation frame.
       */
      if (
        refinedSphereCells?.length
      ) {
        REFINED_SPHERE_CELLS_CACHE =
          refinedSphereCells;

        setRefinementReady(true);

        return undefined;
      }

      setRefinementReady(false);

      let cancelled =
        false;


      function publishRefinement() {
        if (cancelled) {
          return;
        }

        /*
         * Restore persistent geometry only AFTER the lightweight
         * first paint. If no cache exists, build the exact same
         * refined partition as before.
         */
        const refined =
          REFINED_SPHERE_CELLS_CACHE ??
          loadPersistentRefinedSphereCells() ??
          buildLocallyRefinedSphereCells();

        REFINED_SPHERE_CELLS_CACHE =
          refined;

        savePersistentRefinedSphereCells(
          refined
        );

        if (cancelled) {
          return;
        }

        setRefinedSphereCells(
          refined
        );

        setLineBoundaryRibbons(
          []
        );

        setRefinementReady(true);

        refinementFrameRef.current =
          null;
      }


      /*
       * Guarantee one actual browser paint of the saved sphere
       * placeholder before starting the expensive live-sphere render.
       *
       * One requestAnimationFrame callback still runs BEFORE paint.
       * Nesting a second frame lets the first frame complete and paint
       * the placeholder, then starts refinement on the following frame.
       *
       * This makes the placeholder reliable on:
       *   - first sphere open
       *   - tab leave / re-entry
       *   - Reset
       *   - hide / show sphere
       */
      refinementFrameRef.current =
        window.requestAnimationFrame(
          () => {
            refinementFrameRef.current =
              window.requestAnimationFrame(
                publishRefinement
              );
          }
        );


      return () => {
        cancelled =
          true;

        if (
          refinementFrameRef.current !==
          null
        ) {
          window.cancelAnimationFrame(
            refinementFrameRef.current
          );

          refinementFrameRef.current =
            null;
        }
      };
    },
    [
      active,
      displayMode,
      refinedSphereCells,
    ]
  );


  /*
   * Signal readiness only after the refined geometry has been
   * committed. For the initial planar-map load this means the
   * parent can enable the heavier sphere button only when the
   * map is actually on screen.
   */
  useEffect(
    () => {
      if (
        !active ||
        typeof onReady !== 'function'
      ) {
        return;
      }

      if (displayMode === 'map') {
        if (planarBackgroundReady) {
          onReady(true);
        }

        return;
      }

      if (refinementReady) {
        onReady(true);
      }
    },
    [
      active,
      displayMode,
      planarBackgroundReady,
      refinementReady,
      onReady,
    ]
  );

  const sphereCenter =
    displayMode === 'sphere'
      ? {
          x: SVG_WIDTH / 2,
          y: 340,
        }
      : CENTER;


  const sphereRadius =
    displayMode === 'sphere'
      ? 260
      : SPHERE_RADIUS;


  /*
   * Match the flat map to the compact sphere's visual footprint.
   *
   * Sphere-only mode:
   *   radius   = 260
   *   diameter = 520
   *
   * Map-only mode therefore uses a true 520 x 520 square,
   * centered in the same 700 x 690 SVG viewport.
   */
  const rootMapBounds =
    displayMode === 'map'
      ? {
          x: 90,
          y: 85,
          width: 520,
          height: 520,
        }
      : ROOT_MAP;


  function project(point) {
    const rotated =
      applyRotation(
        point,
        view.rotation
      );

    return {
      x:
        sphereCenter.x +
        rotated.x *
        sphereRadius *
        view.zoom,

      y:
        sphereCenter.y -
        rotated.y *
        sphereRadius *
        view.zoom,

      depth:
        rotated.z,
    };
  }


  /*
   * Fixed viewer-space directional light.
   *
   * Light comes from upper-left and somewhat toward the viewer.
   * Because the normal rotates with the sphere, shading reveals
   * spherical depth while the light itself remains stationary.
   */
  function sphereBrightness(
    vertices
  ) {
    const normal =
      normalize3(
        vertices.reduce(
          (
            total,
            point
          ) => ({
            x:
              total.x +
              point.x,

            y:
              total.y +
              point.y,

            z:
              total.z +
              point.z,
          }),
          {
            x: 0,
            y: 0,
            z: 0,
          }
        )
      );


    const rotatedNormal =
      applyRotation(
        normal,
        view.rotation
      );


    const lightDirection =
      normalize3({
        x: -0.55,
        y: 0.62,
        z: 0.56,
      });


    const diffuse =
      Math.max(
        0,
        dot3(
          rotatedNormal,
          lightDirection
        )
      );


    /*
     * Ambient + diffuse illumination.
     *
     * Dark side remains readable.
     * Lit side becomes substantially brighter.
     */
    return (
      0.42 +
      0.88 * diffuse
    );
  }


  /*
   * Do not display the obsolete coarse/fallback coloring while
   * the refined partition is being prepared.
   *
   * That fallback is the source of the visibly wrong triangles
   * seen immediately after load/reload.
   *
   * The refined partition arrives immediately afterward and is
   * the same geometry that looks correct after any UI interaction.
   */
  const visibleSphereCells =
    refinedSphereCells ??
    [];

  if (
    active &&
    refinedSphereCells &&
    !window.__RIEMANN_CELL_COUNT_LOGGED__
  ) {
    window.__RIEMANN_CELL_COUNT_LOGGED__ = true;

    console.info(
      '[Riemann render] refined cells:',
      refinedSphereCells.length
    );

    console.info(
      '[Riemann render] line-authoritative cells:',
      LINE_AUTHORITATIVE_CELLS.length
    );
  }


  const sectionedSphereCells =
    displayMode === 'map'
      ? []
      : visibleSphereCells
      .map(
        cell => ({
          ...cell,

          vertices:
            clipSpherePolygonAtZ(
              cell.vertices,
              sectionZ
            ),
        })
      )
      .filter(
        cell =>
          cell.vertices.length >= 3
      );


  const polygons =
    sectionedSphereCells
      .map(
        cell => {
          const projected =
            cell.vertices.map(
              project
            );

          const regionIndex =
            cell.regionIndex ??
            REGION_DECOMPOSITION
              .regionByCell
              .get(
                cell.key
              ) ??
            0;

          return {
            key:
              cell.key,

            regionIndex,

            brightness:
              sphereBrightness(
                cell.vertices
              ),

            points:
              projected
                .map(
                  point =>
                    `${point.x},${point.y}`
                )
                .join(' '),

            depth:
              projected.reduce(
                (
                  total,
                  point
                ) =>
                  total +
                  point.depth,
                0
              ) /
              projected.length,
          };
        }
      )
      .sort(
        (
          left,
          right
        ) =>
          left.depth -
          right.depth
      );


  const sectionedLineBoundaryRibbons =
    displayMode === 'map'
      ? []
      : lineBoundaryRibbons
      .map(
        ribbon => ({
          ...ribbon,

          vertices:
            clipSpherePolygonAtZ(
              ribbon.vertices,
              sectionZ
            ),
        })
      )
      .filter(
        ribbon =>
          ribbon.vertices.length >= 3
      );


  const projectedLineBoundaryRibbons =
    sectionedLineBoundaryRibbons
      .map(
        ribbon => {
          const projected =
            ribbon.vertices.map(
              project
            );

          return {
            key:
              ribbon.key,

            regionIndex:
              ribbon.regionIndex,

            brightness:
              sphereBrightness(
                ribbon.vertices
              ),

            points:
              projected
                .map(
                  point =>
                    `${point.x},${point.y}`
                )
                .join(' '),

            depth:
              projected.reduce(
                (
                  total,
                  point
                ) =>
                  total +
                  point.depth,
                0
              ) /
              projected.length,
          };
        }
      );


  function illuminatedRootColor(
    regionIndex,
    brightness
  ) {
    const hex =
      ROOT_COLORS[
        regionIndex
      ].replace(
        '#',
        ''
      );


    const red =
      parseInt(
        hex.slice(0, 2),
        16
      );

    const green =
      parseInt(
        hex.slice(2, 4),
        16
      );

    const blue =
      parseInt(
        hex.slice(4, 6),
        16
      );


    const channel =
      value =>
        Math.round(
          clamp(
            value *
              brightness,
            0,
            255
          )
        )
          .toString(16)
          .padStart(
            2,
            '0'
          );


    return (
      '#' +
      channel(red) +
      channel(green) +
      channel(blue)
    );
  }


  /*
   * DISPLAY GRID
   *
   * The colored surface may use locally refined cells internally,
   * especially near analytic seams.
   *
   * That refinement is implementation geometry, not something
   * that should appear as a second visible mesh.
   *
   * So the visible black grid is always generated from the
   * ORIGINAL uniform SPHERE_CELLS mesh.
   */
  const projectedDisplayGrid =
    displayMode === 'map' ||
    !refinedSphereCells
      ? []
      : SPHERE_CELLS
      .map(
        cell => ({
          ...cell,

          vertices:
            clipSpherePolygonAtZ(
              cell.vertices,
              sectionZ
            ),
        })
      )
      .filter(
        cell =>
          cell.vertices.length >= 3
      )
      .map(
        cell => {
          const projected =
            cell.vertices.map(
              project
            );

          return {
            key:
              `display-grid-${cell.key}`,

            points:
              projected
                .map(
                  point =>
                    `${point.x},${point.y}`
                )
                .join(' '),

            depth:
              projected.reduce(
                (
                  total,
                  point
                ) =>
                  total +
                  point.depth,
                0
              ) /
              projected.length,
          };
        }
      )
      .filter(
        cell =>
          cell.depth >= -0.01
      )
      .sort(
        (
          left,
          right
        ) =>
          left.depth -
          right.depth
      );


  const coloredSurfacePieces =
    polygons
      .map(
        polygon => ({
          ...polygon,
          lineBoundary: false,
        })
      )
      .sort(
        (
          left,
          right
        ) =>
          left.depth -
          right.depth
      );


  function horizonIntersection(
    first,
    second
  ) {
    let low = 0;
    let high = 1;

    let lowDepth =
      applyRotation(
        first,
        view.rotation
      ).z;

    for (
      let iteration = 0;
      iteration < 32;
      iteration += 1
    ) {
      const middle =
        (low + high) / 2;

      const point =
        slerpSphere(
          first,
          second,
          middle
        );

      const depth =
        applyRotation(
          point,
          view.rotation
        ).z;

      if (
        Math.abs(depth) < 1e-10
      ) {
        return point;
      }

      if (
        (lowDepth >= 0 && depth >= 0) ||
        (lowDepth < 0 && depth < 0)
      ) {
        low = middle;
        lowDepth = depth;
      } else {
        high = middle;
      }
    }

    return slerpSphere(
      first,
      second,
      (low + high) / 2
    );
  }


  function frontFacingCurvePieces(
    points
  ) {
    const pieces = [];
    let current = [];

    function finish() {
      if (current.length >= 2) {
        pieces.push(current);
      }

      current = [];
    }

    for (
      let index = 0;
      index < points.length - 1;
      index += 1
    ) {
      const first =
        points[index];

      const second =
        points[index + 1];

      const firstFront =
        applyRotation(
          first,
          view.rotation
        ).z >= 0;

      const secondFront =
        applyRotation(
          second,
          view.rotation
        ).z >= 0;

      if (
        firstFront &&
        current.length === 0
      ) {
        current.push(first);
      }

      if (
        firstFront &&
        secondFront
      ) {
        current.push(second);
        continue;
      }

      if (
        firstFront &&
        !secondFront
      ) {
        current.push(
          horizonIntersection(
            first,
            second
          )
        );

        finish();
        continue;
      }

      if (
        !firstFront &&
        secondFront
      ) {
        current = [
          horizonIntersection(
            first,
            second
          ),
          second,
        ];
      }
    }

    finish();

    return pieces;
  }


  const enabledStructureModes =
    Array.isArray(
      structureMode
    )
      ? structureMode
      : [
          structureMode,
        ];


  const showRootPaths =
    enabledStructureModes.includes(
      'root-paths'
    );

  const showRealParameterLocus =
    enabledStructureModes.includes(
      'real-locus'
    );

  const showImaginaryParameterLocus =
    enabledStructureModes.includes(
      'imaginary-locus'
    );

  const showSheetCuts =
    enabledStructureModes.includes(
      'sheet-cuts'
    );


  const visibleTrueSeamCurves =
    displayMode === 'map' ||
    !showSheetCuts
      ? []
      : TRUE_SEAM_CURVES
      .flatMap(
        curve =>
          clipSpherePolylineAtZ(
            curve.points,
            sectionZ
          )
            .map(
              (
                points,
                pieceIndex
              ) => ({
                ...curve,

                key:
                  `${curve.key}-section-${pieceIndex}`,

                points,
              })
            )
      );


  const visibleRealRootPathCurves =
    displayMode === 'map' ||
    !showRootPaths
      ? []
      : REAL_ROOT_PATH_CURVES
      .flatMap(
        curve =>
          clipSpherePolylineAtZ(
            curve.points,
            sectionZ
          )
            .map(
              (
                points,
                pieceIndex
              ) => ({
                ...curve,

                key:
                  `${curve.key}-section-${pieceIndex}`,

                points,
              })
            )
      );


  const projectedRealRootPaths =
    visibleRealRootPathCurves
      .flatMap(
        curve =>
          frontFacingCurvePieces(
            curve.points
          )
            .map(
              (
                points,
                pieceIndex
              ) => {
                const projected =
                  points.map(
                    project
                  );

                return {
                  ...curve,

                  key:
                    `${curve.key}-front-${pieceIndex}`,

                  points:
                    projected
                      .map(
                        point =>
                          `${point.x},${point.y}`
                      )
                      .join(' '),
                };
              }
            )
      );


  function projectAuditCurvesToSphere(
    curves,
    keyPrefix
  ) {
    if (
      displayMode === 'map'
    ) {
      return [];
    }

    return curves
      .flatMap(
        curve =>
          clipSpherePolylineAtZ(
            curve.points,
            sectionZ
          )
            .flatMap(
              (
                points,
                sectionIndex
              ) =>
                frontFacingCurvePieces(
                  points
                )
                  .map(
                    (
                      frontPoints,
                      frontIndex
                    ) => {
                      const projected =
                        frontPoints.map(
                          project
                        );

                      return {
                        key:
                          `${keyPrefix}-${curve.key}-${sectionIndex}-${frontIndex}`,

                        points:
                          projected
                            .map(
                              point =>
                                `${point.x},${point.y}`
                            )
                            .join(' '),
                      };
                    }
                  )
            )
      );
  }


  const projectedRealParameterLocus =
    showRealParameterLocus
      ? projectAuditCurvesToSphere(
          REAL_PARAMETER_LOCUS_CURVES,
          'real-parameter-locus-sphere'
        )
      : [];


  const projectedImaginaryParameterLocus =
    showImaginaryParameterLocus
      ? projectAuditCurvesToSphere(
          IMAGINARY_PARAMETER_LOCUS_CURVES,
          'imaginary-parameter-locus-sphere'
        )
      : [];


  const projectedTrueSeams =
    visibleTrueSeamCurves
      .flatMap(
        curve =>
          frontFacingCurvePieces(
            curve.points
          )
            .map(
              (
                points,
                pieceIndex
              ) => {
                const projected =
                  points.map(
                    project
                  );

                return {
                  ...curve,

                  key:
                    `${curve.key}-front-${pieceIndex}`,

                  points:
                    projected
                      .map(
                        point =>
                          `${point.x},${point.y}`
                      )
                      .join(' '),

                  depth:
                    projected.reduce(
                      (
                        total,
                        point
                      ) =>
                        total +
                        point.depth,
                      0
                    ) /
                    projected.length,
                };
              }
            )
      )
      .sort(
        (
          left,
          right
        ) =>
          left.depth -
          right.depth
      );



  function rootMapX(
    rho
  ) {
    return (
      rootMapBounds.x +
      (
        rho -
        ROOT_MAP_RHO_MIN
      ) /
      (
        ROOT_MAP_RHO_MAX -
        ROOT_MAP_RHO_MIN
      ) *
      rootMapBounds.width
    );
  }


  function rootMapY(
    theta
  ) {
    return (
      rootMapBounds.y +
      (
        Math.PI -
        theta
      ) /
      (
        2 *
        Math.PI
      ) *
      rootMapBounds.height
    );
  }


  /*
   * CURRENT QUARTIC ROOTS
   *
   * The page owns the persistent identities ж1 ... ж4.
   * This viewer only changes coordinates:
   *
   *   compact sphere:
   *     x -> inverse stereographic projection
   *
   *   radial map:
   *     x -> (log |x|, arg x)
   *
   * No independent root solving or relabelling happens here.
   */
  const currentRootMarkers =
    roots.map(
      (
        root,
        index
      ) => {
        /*
         * EXACT COMPACTIFIED ENDPOINT GEOMETRY
         *
         * Numerical quartic solving cannot literally evaluate
         * a = +/-infinity.
         *
         * When the shared parameter control is at one of those
         * exact compactified states, place the roots at their
         * mathematical limits on CP^1_x instead of displaying
         * the final nearby finite sample.
         */
        if (asymptoticEnd !== 0) {
          const positiveInfinity =
            asymptoticEnd > 0;

          /*
           * Limiting root positions.
           *
           * a -> +infinity:
           *
           *   zhe_1 -> 0              angle 0
           *   zhe_2 -> infinity       angle 0
           *   zhe_3 -> infinity       angle +2pi/3
           *   zhe_4 -> infinity       angle -2pi/3
           *
           * a -> -infinity:
           *
           *   zhe_1 -> infinity       angle pi
           *   zhe_2 -> 0              approaches along angle pi
           *   zhe_3 -> infinity       angle +pi/3
           *   zhe_4 -> infinity       angle -pi/3
           */
          const endpointData =
            positiveInfinity
              ? [
                  {
                    pole: 'zero',
                    theta: 0,
                  },

                  {
                    pole: 'infinity',
                    theta: 0,
                  },

                  {
                    pole: 'infinity',
                    theta:
                      2 *
                      Math.PI /
                      3,
                  },

                  {
                    pole: 'infinity',
                    theta:
                      -2 *
                      Math.PI /
                      3,
                  },
                ]
              : [
                  {
                    pole: 'infinity',
                    theta: Math.PI,
                  },

                  {
                    pole: 'zero',
                    theta: Math.PI,
                  },

                  {
                    pole: 'infinity',
                    theta:
                      Math.PI /
                      3,
                  },

                  {
                    pole: 'infinity',
                    theta:
                      -Math.PI /
                      3,
                  },
                ];

          const endpoint =
            endpointData[
              index
            ];

          if (!endpoint) {
            return null;
          }

          const atInfinity =
            endpoint.pole ===
            'infinity';

          /*
           * Exact compact sphere coordinates:
           *
           *   x = 0        -> south pole
           *   x = infinity -> north pole
           */
          const spherePoint = {
            x: 0,
            y: 0,
            z:
              atInfinity
                ? 1
                : -1,
          };

          const sphereProjection =
            project(
              spherePoint
            );

          return {
            key:
              `current-root-${index}`,

            index,

            sphereX:
              sphereProjection.x,

            sphereY:
              sphereProjection.y,

            sphereDepth:
              sphereProjection.depth,

            /*
             * Exact log-polar boundary position.
             *
             * x = 0        -> rho = rho_min
             * x = infinity -> rho = rho_max
             */
            mapX:
              rootMapX(
                atInfinity
                  ? ROOT_MAP_RHO_MAX
                  : ROOT_MAP_RHO_MIN
              ),

            mapY:
              rootMapY(
                endpoint.theta
              ),
          };
        }


        /*
         * Ordinary finite-a rendering.
         */
        const re =
          Number(root?.re);

        const im =
          Number(root?.im);

        if (
          !Number.isFinite(re) ||
          !Number.isFinite(im)
        ) {
          return null;
        }

        const radius =
          Math.hypot(
            re,
            im
          );

        const spherePoint =
          stereographicPoint(
            re,
            im
          );

        const sphereProjection =
          project(
            spherePoint
          );

        const rho =
          radius > 0
            ? Math.log(radius)
            : ROOT_MAP_RHO_MIN;

        const theta =
          Math.atan2(
            im,
            re
          );

        return {
          key:
            `current-root-${index}`,

          index,

          sphereX:
            sphereProjection.x,

          sphereY:
            sphereProjection.y,

          sphereDepth:
            sphereProjection.depth,

          mapX:
            rootMapX(
              clamp(
                rho,
                ROOT_MAP_RHO_MIN,
                ROOT_MAP_RHO_MAX
              )
            ),

          mapY:
            rootMapY(
              theta
            ),
        };
      }
    ).filter(Boolean);


  function clipRootMapPolygonAtTheta(
    points,
    minimumTheta,
    maximumTheta
  ) {
    function clipAgainst(
      input,
      boundary,
      keepGreater
    ) {
      const output = [];

      if (!input.length) {
        return output;
      }

      for (
        let index = 0;
        index < input.length;
        index += 1
      ) {
        const current =
          input[index];

        const previous =
          input[
            (
              index +
              input.length -
              1
            ) %
            input.length
          ];

        const currentInside =
          keepGreater
            ? current.theta >= boundary
            : current.theta <= boundary;

        const previousInside =
          keepGreater
            ? previous.theta >= boundary
            : previous.theta <= boundary;


        function intersection() {
          const denominator =
            current.theta -
            previous.theta;

          if (
            Math.abs(denominator) <
            1e-12
          ) {
            return {
              rho:
                current.rho,

              theta:
                boundary,
            };
          }

          const t =
            (
              boundary -
              previous.theta
            ) /
            denominator;

          return {
            rho:
              previous.rho +
              (
                current.rho -
                previous.rho
              ) *
              t,

            theta:
              boundary,
          };
        }


        if (
          previousInside &&
          currentInside
        ) {
          output.push(
            current
          );
        } else if (
          previousInside &&
          !currentInside
        ) {
          output.push(
            intersection()
          );
        } else if (
          !previousInside &&
          currentInside
        ) {
          output.push(
            intersection(),
            current
          );
        }
      }

      return output;
    }


    return clipAgainst(
      clipAgainst(
        points,
        minimumTheta,
        true
      ),
      maximumTheta,
      false
    );
  }


  const rootDomainFillPolygons =
    displayMode === 'sphere' ||
    displayMode === 'map'
      ? []
      : visibleSphereCells
      .flatMap(
        cell => {
          const mapped =
            spherePolygonToLogPolar(
              cell.vertices
            );


          if (
            mapped.some(
              point => !point
            )
          ) {
            return [];
          }


          /*
           * Unwrap theta locally so a cell crossing the
           * +/-pi cylinder cut stays a small polygon instead
           * of stretching across the entire map.
           */
          const unwrapped = [
            {
              ...mapped[0],
            },
          ];


          for (
            let index = 1;
            index < mapped.length;
            index += 1
          ) {
            let theta =
              mapped[index].theta;

            const previousTheta =
              unwrapped[
                unwrapped.length - 1
              ].theta;

            while (
              theta -
              previousTheta >
              Math.PI
            ) {
              theta -=
                2 * Math.PI;
            }

            while (
              theta -
              previousTheta <
              -Math.PI
            ) {
              theta +=
                2 * Math.PI;
            }

            unwrapped.push({
              rho:
                mapped[index].rho,

              theta,
            });
          }


          const regionIndex =
            cell.regionIndex ??
            REGION_DECOMPOSITION
              .regionByCell
              .get(
                cell.key
              ) ??
            0;


          /*
           * Try the native polygon and +/- 2pi copies.
           * Clipping them into [-pi,+pi] makes the cylindrical
           * wrap exact without drawing false cross-map polygons.
           */
          return [
            -2 * Math.PI,
            0,
            2 * Math.PI,
          ]
            .map(
              shift =>
                unwrapped.map(
                  point => ({
                    rho:
                      point.rho,

                    theta:
                      point.theta +
                      shift,
                  })
                )
            )
            .map(
              points =>
                clipRootMapPolygonAtTheta(
                  points,
                  -Math.PI,
                  Math.PI
                )
            )
            .filter(
              points =>
                points.length >= 3
            )
            .map(
              (
                points,
                copyIndex
              ) => ({
                key:
                  `${cell.key}-root-map-${copyIndex}`,

                regionIndex,

                points:
                  points
                    .map(
                      point =>
                        `${rootMapX(point.rho)},${rootMapY(point.theta)}`
                    )
                    .join(' '),
              })
            );
        }
      );


  /*
   * FLAT-MAP DISPLAY GRID
   *
   * Exactly parallel to the sphere display:
   *
   *   refined geometry = hidden implementation detail
   *   SPHERE_CELLS     = visible uniform grid
   */
  const rootDomainDisplayGrid =
    displayMode === 'sphere' ||
    displayMode === 'map' ||
    !refinedSphereCells
      ? []
      : SPHERE_CELLS
      .flatMap(
        cell => {
          const mapped =
            spherePolygonToLogPolar(
              cell.vertices
            );


          if (
            mapped.some(
              point => !point
            )
          ) {
            return [];
          }


          /*
           * Locally unwrap theta so cells crossing +/-pi
           * remain local instead of stretching across the map.
           */
          const unwrapped = [
            {
              ...mapped[0],
            },
          ];


          for (
            let index = 1;
            index < mapped.length;
            index += 1
          ) {
            let theta =
              mapped[index].theta;

            const previousTheta =
              unwrapped[
                unwrapped.length - 1
              ].theta;


            while (
              theta -
              previousTheta >
              Math.PI
            ) {
              theta -=
                2 * Math.PI;
            }


            while (
              theta -
              previousTheta <
              -Math.PI
            ) {
              theta +=
                2 * Math.PI;
            }


            unwrapped.push({
              rho:
                mapped[index].rho,

              theta,
            });
          }


          return [
            -2 * Math.PI,
            0,
            2 * Math.PI,
          ]
            .map(
              shift =>
                unwrapped.map(
                  point => ({
                    rho:
                      point.rho,

                    theta:
                      point.theta +
                      shift,
                  })
                )
            )
            .map(
              points =>
                clipRootMapPolygonAtTheta(
                  points,
                  -Math.PI,
                  Math.PI
                )
            )
            .filter(
              points =>
                points.length >= 3
            )
            .map(
              (
                points,
                copyIndex
              ) => ({
                key:
                  `root-map-display-grid-${cell.key}-${copyIndex}`,

                points:
                  points
                    .map(
                      point =>
                        `${rootMapX(point.rho)},${rootMapY(point.theta)}`
                    )
                    .join(' '),
              })
            );
        }
      );


  function projectCurvesToRootDomainMap(
    curves,
    keyPrefix
  ) {
    return curves
      .flatMap(
        curve => {
          const pieces = [];
          let current = [];

          function finish() {
            if (
              current.length >= 2
            ) {
              pieces.push({
                key:
                  `${keyPrefix}-${curve.key}-${pieces.length}`,

                rootIndex:
                  curve.rootIndex,

                points:
                  current,
              });
            }

            current = [];
          }

          const mappedCurve =
            spherePolylineToLogPolar(
              curve.points
            );

          mappedCurve.forEach(
            mapped => {
              if (!mapped) {
                finish();
                return;
              }

              if (
                current.length
              ) {
                const previous =
                  current[
                    current.length - 1
                  ];

                if (
                  Math.abs(
                    mapped.theta -
                    previous.theta
                  ) >
                  Math.PI
                ) {
                  finish();
                }
              }

              current.push(
                mapped
              );
            }
          );

          finish();

          return pieces;
        }
      )
      .map(
        curve => ({
          ...curve,

          points:
            curve.points
              .map(
                point =>
                  `${rootMapX(point.rho)},${rootMapY(point.theta)}`
              )
              .join(' '),
        })
      );
  }


  const projectedRealRootDomainPaths =
    displayMode === 'sphere' ||
    !showRootPaths
      ? []
      : projectCurvesToRootDomainMap(
          REAL_ROOT_PATH_CURVES,
          'real-root-path-map'
        );


  const projectedRealParameterDomainLocus =
    displayMode === 'sphere' ||
    !showRealParameterLocus
      ? []
      : projectCurvesToRootDomainMap(
          REAL_PARAMETER_LOCUS_CURVES,
          'real-parameter-locus-map'
        );


  const projectedImaginaryParameterDomainLocus =
    displayMode === 'sphere' ||
    !showImaginaryParameterLocus
      ? []
      : projectCurvesToRootDomainMap(
          IMAGINARY_PARAMETER_LOCUS_CURVES,
          'imaginary-parameter-locus-map'
        );


  const projectedRootDomainMapCurves =
    displayMode === 'sphere' ||
    !showSheetCuts
      ? []
      : TRUE_SEAM_CURVES
      .flatMap(
        curve => {
          const pieces = [];
          let current = [];

          function finish() {
            if (
              current.length >= 2
            ) {
              pieces.push({
                key:
                  `${curve.key}-map-${pieces.length}`,

                rootIndex:
                  curve.rootIndex,

                points:
                  current,
              });
            }

            current = [];
          }

          const mappedCurve =
            spherePolylineToLogPolar(
              curve.points
            );


          mappedCurve.forEach(
            mapped => {
              if (!mapped) {
                finish();
                return;
              }

              if (
                current.length
              ) {
                const previous =
                  current[
                    current.length - 1
                  ];

                if (
                  Math.abs(
                    mapped.theta -
                    previous.theta
                  ) >
                  Math.PI
                ) {
                  finish();
                }
              }

              current.push(
                mapped
              );
            }
          );

          finish();

          return pieces;
        }
      )
      .map(
        curve => ({
          ...curve,

          points:
            curve.points
              .map(
                point =>
                  `${rootMapX(point.rho)},${rootMapY(point.theta)}`
              )
              .join(' '),
        })
      );


  const sectionGeometry =
    useMemo(
      () => {
        if (
          sectionLevel >=
          1 - 1e-7
        ) {
          return {
            intersections: [],
            arcs: [],
          };
        }


        const radial =
          Math.sqrt(
            Math.max(
              0,
              1 -
                sectionZ *
                sectionZ
            )
          );


        if (
          radial <
          1e-7
        ) {
          return {
            intersections: [],
            arcs: [],
          };
        }


        const intersections = [];


        TRUE_SEAM_CURVES
          .forEach(
            curve => {
              for (
                let index = 0;
                index <
                  curve.points.length - 1;
                index += 1
              ) {
                const first =
                  curve.points[index];

                const second =
                  curve.points[
                    index + 1
                  ];


                const firstDelta =
                  first.z -
                  sectionZ;

                const secondDelta =
                  second.z -
                  sectionZ;


                if (
                  firstDelta *
                    secondDelta >
                  0
                ) {
                  continue;
                }


                if (
                  Math.abs(
                    firstDelta
                  ) <
                    1e-9 &&
                  Math.abs(
                    secondDelta
                  ) <
                    1e-9
                ) {
                  continue;
                }


                const point =
                  sphereSegmentAtZ(
                    first,
                    second,
                    sectionZ
                  );


                let angle =
                  Math.atan2(
                    point.y,
                    point.x
                  );


                if (angle < 0) {
                  angle +=
                    2 * Math.PI;
                }


                intersections.push({
                  angle,
                  point,
                });
              }
            }
          );


        intersections.sort(
          (
            left,
            right
          ) =>
            left.angle -
            right.angle
        );


        /*
         * Several lifted seam curves can meet at the same actual
         * point. Collapse those duplicate intersections.
         */
        const unique = [];


        intersections.forEach(
          candidate => {
            const duplicate =
              unique.some(
                existing => {
                  let difference =
                    Math.abs(
                      candidate.angle -
                      existing.angle
                    );

                  difference =
                    Math.min(
                      difference,
                      2 *
                        Math.PI -
                        difference
                    );

                  return (
                    difference <
                    1e-4
                  );
                }
              );


            if (!duplicate) {
              unique.push(
                candidate
              );
            }
          }
        );


        function pointAtAngle(
          angle
        ) {
          return {
            x:
              radial *
              Math.cos(angle),

            y:
              radial *
              Math.sin(angle),

            z:
              sectionZ,
          };
        }


        /*
         * With no seam intersections the whole circle is one
         * analytically labelled root domain.
         */
        if (
          unique.length === 0
        ) {
          const midpoint =
            pointAtAngle(0);


          const regionIndex =
            regionIndexAtSpherePoint(
              midpoint
            ) ??
            nearestRegionIndex(
              midpoint
            );


          const points = [];

          const sampleCount =
            128;


          for (
            let sample = 0;
            sample <=
              sampleCount;
            sample += 1
          ) {
            points.push(
              pointAtAngle(
                2 *
                  Math.PI *
                  sample /
                  sampleCount
              )
            );
          }


          return {
            intersections:
              unique,

            arcs: [
              {
                key:
                  'section-full-circle',

                regionIndex,

                points,
              },
            ],
          };
        }


        const arcs = [];


        for (
          let index = 0;
          index <
            unique.length;
          index += 1
        ) {
          const startAngle =
            unique[index]
              .angle;

          let endAngle =
            unique[
              (
                index + 1
              ) %
              unique.length
            ].angle;


          if (
            endAngle <=
            startAngle
          ) {
            endAngle +=
              2 * Math.PI;
          }


          const middleAngle =
            (
              startAngle +
              endAngle
            ) / 2;


          const middlePoint =
            pointAtAngle(
              middleAngle
            );


          /*
           * THIS root label comes from analytic continuation,
           * not from the rendered sphere's approximate color mesh.
           */
          const regionIndex =
            regionIndexAtSpherePoint(
              middlePoint
            ) ??
            nearestRegionIndex(
              middlePoint
            );


          const span =
            endAngle -
            startAngle;

          const sampleCount =
            Math.max(
              5,
              Math.ceil(
                span /
                (
                  Math.PI /
                  36
                )
              )
            );


          const points = [];


          for (
            let sample = 0;
            sample <=
              sampleCount;
            sample += 1
          ) {
            const angle =
              startAngle +
              span *
              sample /
              sampleCount;


            points.push(
              pointAtAngle(
                angle
              )
            );
          }


          arcs.push({
            key:
              `section-arc-${index}`,

            regionIndex,

            points,
          });
        }


        return {
          intersections:
            unique,

          arcs,
        };
      },
      [
        sectionLevel,
        sectionZ,
      ]
    );


  const rootMapCursorRho =
    Number.isFinite(
      sectionRadius
    ) &&
    sectionRadius > 0
      ? clamp(
          Math.log(
            sectionRadius
          ),
          ROOT_MAP_RHO_MIN,
          ROOT_MAP_RHO_MAX
        )
      : sectionLevel <= 0
        ? ROOT_MAP_RHO_MIN
        : ROOT_MAP_RHO_MAX;


  const rootMapCursorX =
    rootMapX(
      rootMapCursorRho
    );


  const rootMapSectionSegments =
    sectionGeometry.arcs
      .flatMap(
        (
          arc,
          arcIndex
        ) => {
          if (
            arc.points.length < 2
          ) {
            return [];
          }

          const angles =
            arc.points.map(
              point =>
                Math.atan2(
                  point.y,
                  point.x
                )
            );

          const firstAngle =
            angles[0];

          const lastAngle =
            angles[
              angles.length - 1
            ];

          if (
            Math.abs(
              lastAngle -
              firstAngle
            ) <=
            Math.PI
          ) {
            return [
              {
                key:
                  `root-map-section-${arcIndex}`,

                regionIndex:
                  arc.regionIndex,

                y1:
                  rootMapY(
                    firstAngle
                  ),

                y2:
                  rootMapY(
                    lastAngle
                  ),
              },
            ];
          }

          if (
            firstAngle > 0
          ) {
            return [
              {
                key:
                  `root-map-section-${arcIndex}-a`,

                regionIndex:
                  arc.regionIndex,

                y1:
                  rootMapY(
                    firstAngle
                  ),

                y2:
                  rootMapY(
                    Math.PI
                  ),
              },

              {
                key:
                  `root-map-section-${arcIndex}-b`,

                regionIndex:
                  arc.regionIndex,

                y1:
                  rootMapY(
                    -Math.PI
                  ),

                y2:
                  rootMapY(
                    lastAngle
                  ),
              },
            ];
          }

          return [
            {
              key:
                `root-map-section-${arcIndex}-a`,

              regionIndex:
                arc.regionIndex,

              y1:
                rootMapY(
                  firstAngle
                ),

              y2:
                rootMapY(
                  -Math.PI
                ),
            },

            {
              key:
                `root-map-section-${arcIndex}-b`,

              regionIndex:
                arc.regionIndex,

              y1:
                rootMapY(
                  Math.PI
                ),

              y2:
                rootMapY(
                  lastAngle
                ),
            },
          ];
        }
      );


  const projectedSectionArcs =
    sectionGeometry.arcs
      .map(
        arc => {
          const projected =
            arc.points.map(
              project
            );


          return {
            ...arc,

            points:
              projected
                .map(
                  point =>
                    `${point.x},${point.y}`
                )
                .join(' '),

            depth:
              projected.reduce(
                (
                  total,
                  point
                ) =>
                  total +
                  point.depth,
                0
              ) /
              projected.length,
          };
        }
      )
      .sort(
        (
          left,
          right
        ) =>
          left.depth -
          right.depth
      );


  const projectedSectionIntersections =
    sectionGeometry
      .intersections
      .map(
        intersection => ({
          ...intersection,

          projected:
            project(
              intersection.point
            ),
        })
      );


  const markers =
    RAMIFICATION_POINTS
      .filter(
        marker =>
          marker.point.z <=
          sectionZ +
            1e-8
      )
      .map(
        marker => ({
          ...marker,
          projected:
            project(
              marker.point
            ),
        })
      )
      .sort(
        (
          left,
          right
        ) =>
          left.projected.depth -
          right.projected.depth
      );


  function beginRotate(event) {
    if (
      !active ||
      event.button !== 0
    ) {
      return;
    }

    event.preventDefault();

    event.currentTarget.focus({
      preventScroll: true,
    });

    event.currentTarget
      .setPointerCapture(
        event.pointerId
      );

    dragRef.current = {
      pointerId:
        event.pointerId,

      startX:
        event.clientX,

      startY:
        event.clientY,

      startRotation:
        view.rotation,
    };

    setIsDragging(true);
  }


  function moveRotate(event) {
    const drag =
      dragRef.current;

    if (
      !drag ||
      drag.pointerId !==
        event.pointerId
    ) {
      return;
    }

    event.preventDefault();

    const deltaX =
      event.clientX -
      drag.startX;

    const deltaY =
      event.clientY -
      drag.startY;

    const dragRotation =
      multiplyRotations(
        rotationX(
          deltaY *
          DRAG_ROTATION_SPEED
        ),
        rotationY(
          -deltaX *
          DRAG_ROTATION_SPEED
        )
      );

    pendingRotationRef.current =
      multiplyRotations(
        dragRotation,
        drag.startRotation
      );

    /*
     * Keep only the newest pointer position and commit it once
     * on the next browser paint frame.
     */
    if (
      rotateFrameRef.current === null
    ) {
      rotateFrameRef.current =
        requestAnimationFrame(
          () => {
            rotateFrameRef.current =
              null;

            const nextRotation =
              pendingRotationRef.current;

            pendingRotationRef.current =
              null;

            if (!nextRotation) {
              return;
            }

            setView(
              current => ({
                ...current,

                rotation:
                  nextRotation,
              })
            );
          }
        );
    }
  }


  function endRotate(event) {
    const drag =
      dragRef.current;

    if (
      !drag ||
      drag.pointerId !==
        event.pointerId
    ) {
      return;
    }

    if (
      event.currentTarget
        .hasPointerCapture?.(
          event.pointerId
        )
    ) {
      event.currentTarget
        .releasePointerCapture(
          event.pointerId
        );
    }

    /*
     * Commit the newest pending rotation on release so the final
     * mouse position is never lost.
     */
    if (
      rotateFrameRef.current !== null
    ) {
      cancelAnimationFrame(
        rotateFrameRef.current
      );

      rotateFrameRef.current =
        null;
    }

    const finalRotation =
      pendingRotationRef.current;

    pendingRotationRef.current =
      null;

    if (finalRotation) {
      setView(
        current => ({
          ...current,

          rotation:
            finalRotation,
        })
      );
    }

    dragRef.current =
      null;

    setIsDragging(false);
  }


  function handleWheel(event) {
    event.preventDefault();

    const amount =
      clamp(
        -event.deltaY *
        0.0015,
        -0.12,
        0.12
      );

    setView(
      current => ({
        ...current,

        zoom:
          clamp(
            current.zoom +
            amount,
            MIN_ZOOM,
            MAX_ZOOM
          ),
      })
    );
  }


  return (
    <svg
      viewBox="0 0 700 690"
      className={styles.plot}
      aria-label={`Compact Riemann surface of the quartic covering · convention angle ${conventionAngle} degrees`}
      onPointerDown={
        displayMode === 'map'
          ? undefined
          : beginRotate
      }
      onPointerMove={
        displayMode === 'map'
          ? undefined
          : moveRotate
      }
      onPointerUp={
        displayMode === 'map'
          ? undefined
          : endRotate
      }
      onPointerCancel={
        displayMode === 'map'
          ? undefined
          : endRotate
      }
      onLostPointerCapture={
        displayMode === 'map'
          ? undefined
          : endRotate
      }
      onWheel={
        displayMode === 'map'
          ? undefined
          : handleWheel
      }
      tabIndex={
        active
          ? 0
          : -1
      }
      style={{
        display:
          active
            ? 'block'
            : 'none',

        /*
         * Never show the temporary line-only state.
         *
         * Keep the SVG in layout, but reveal it only when the
         * complete refined colored geometry is ready.
         */
        visibility:
          'visible',

        overflow:
          'visible',

        cursor:
          displayMode === 'map'
            ? 'default'
            : isDragging
              ? 'grabbing'
              : 'grab',

        touchAction:
          'none',

        userSelect:
          'none',

        outline:
          'none',
      }}
    >
      <title>
        Compact x-sphere. Drag to rotate. Scroll to zoom.
      </title>





      {
        displayMode === 'sphere' &&
        !refinementReady && (
          <image
            href="/riemann/riemann-sphere-default.png"
            x={0}
            y={0}
            width={700}
            height={690}
            preserveAspectRatio="none"
            style={{
              pointerEvents:
                'none',
            }}
          />
        )
      }


      {
        displayMode !== 'map' && (
          <>
      <g>
      {
        coloredSurfacePieces.map(
          piece => (
            <polygon
              key={piece.key}
              points={piece.points}
              style={{
                fill:
                  illuminatedRootColor(
                    piece.regionIndex,
                    piece.brightness ??
                      1
                  ),

                /*
                 * Solid compact x-sphere.
                 *
                 * The fill color already contains the existing
                 * directional ambient + diffuse illumination.
                 */
                fillOpacity:
                  1,

                /*
                 * Internal polygon refinement stays invisible.
                 * The uniform black grid is rendered separately.
                 */
                /*
                 * Hide subpixel SVG cracks between adjacent refined
                 * polygons without changing the visible coarse grid.
                 *
                 * Use the polygon's exact shaded fill color so the
                 * internal refinement remains visually continuous.
                 */
                stroke:
                  illuminatedRootColor(
                    piece.regionIndex,
                    piece.brightness ??
                      1
                  ),

                strokeOpacity:
                  1,

                strokeWidth:
                  0.45,

                strokeLinejoin:
                  'round',

                vectorEffect:
                  'non-scaling-stroke',

                pointerEvents:
                  'none',
              }}
            />
          )
        )
      }

      {
        projectedDisplayGrid.map(
          cell => (
            <polygon
              key={
                cell.key
              }
              points={
                cell.points
              }
              fill="none"
              style={{
                stroke:
                  'rgba(0, 0, 0, 0.78)',

                strokeOpacity:
                  0.34,

                strokeWidth:
                  0.34,

                strokeLinejoin:
                  'round',

                vectorEffect:
                  'non-scaling-stroke',

                pointerEvents:
                  'none',
              }}
            />
          )
        )
      }
      </g>


      {
        projectedRealParameterLocus.map(
          curve => (
            <polyline
              key={curve.key}
              points={curve.points}
              fill="none"
              style={{
                /*
                 * CYAN = equation-derived real-a locus.
                 *
                 * It is deliberately slightly wider than the gold
                 * numerical root trace. In Compare mode, perfect
                 * agreement appears as a gold line centered inside cyan.
                 */
                stroke:
                  'rgba(70, 220, 255, 0.98)',

                strokeWidth:
                  2.4,

                strokeLinecap:
                  'round',

                strokeLinejoin:
                  'round',

                vectorEffect:
                  'non-scaling-stroke',

                pointerEvents:
                  'none',
              }}
            />
          )
        )
      }


      {
        projectedImaginaryParameterLocus.map(
          curve => (
            <polyline
              key={curve.key}
              points={curve.points}
              fill="none"
              style={{
                /*
                 * MAGENTA = equation-derived imaginary-a locus.
                 */
                stroke:
                  'rgba(210, 95, 255, 0.96)',

                strokeWidth:
                  1.2,

                strokeLinecap:
                  'round',

                strokeLinejoin:
                  'round',

                vectorEffect:
                  'non-scaling-stroke',

                pointerEvents:
                  'none',
              }}
            />
          )
        )
      }


      {
        projectedTrueSeams.map(
          curve => (
            <polyline
              key={curve.key}
              points={curve.points}
              fill="none"
              style={{
                stroke:
                  'rgba(255, 252, 244, 1)',

                strokeWidth:
                  1,

                strokeOpacity:
                  1,

                strokeLinecap:
                  'round',

                strokeLinejoin:
                  'round',

                vectorEffect:
                  'non-scaling-stroke',

                pointerEvents:
                  'none',
              }}
            />
          )
        )
      }


      {
        projectedRealRootPaths.map(
          curve => (
            <polyline
              key={curve.key}
              points={curve.points}
              fill="none"
              style={{
                stroke:
                  'rgba(0, 0, 0, 0.96)',

                strokeWidth:
                  1.35,

                strokeLinecap:
                  'round',

                strokeLinejoin:
                  'round',

                vectorEffect:
                  'non-scaling-stroke',

                pointerEvents:
                  'none',
              }}
            />
          )
        )
      }


      {
        projectedSectionArcs.map(
          arc => (
            <polyline
              key={arc.key}
              points={arc.points}
              fill="none"
              style={{
                stroke:
                  ROOT_COLORS[
                    arc.regionIndex
                  ],

                strokeWidth:
                  5,

                strokeOpacity:
                  0.98,

                strokeLinecap:
                  'round',

                strokeLinejoin:
                  'round',

                vectorEffect:
                  'non-scaling-stroke',

                pointerEvents:
                  'none',

                paintOrder:
                  'stroke',
              }}
            />
          )
        )
      }


      {
        projectedSectionIntersections
          .map(
            (
              intersection,
              index
            ) => (
              <circle
                key={
                  `section-intersection-${index}`
                }
                cx={
                  intersection
                    .projected.x
                }
                cy={
                  intersection
                    .projected.y
                }
                r="2.7"
                style={{
                  fill:
                    '#fffaf0',

                  stroke:
                    'rgba(10, 8, 6, 0.96)',

                  strokeWidth:
                    1,

                  vectorEffect:
                    'non-scaling-stroke',

                  pointerEvents:
                    'none',
                }}
              />
            )
          )
      }


      {
        markers
          .filter(
            marker =>
              marker.projected.depth >= -0.02
          )
          .map(
          marker => {
            const isInfinity =
              marker.id ===
              'x-infinity';

            const isZero =
              marker.id ===
              'x-zero';

            const labelAsset =
              marker.id === 'plus-a3'
                ? '/equations/a_1.svg'
                : marker.id === 'minus-a3'
                  ? '/equations/negative_a_1.svg'
                  : marker.id === 'plus-b1'
                    ? '/equations/b_1.svg'
                    : marker.id === 'minus-b1'
                      ? '/equations/negative_b_1.svg'
                      : null;

            return (
              <g
                key={marker.id}
                style={{
                  pointerEvents:
                    'none',
                }}
              >
                <circle
                  cx={
                    marker.projected.x
                  }
                  cy={
                    marker.projected.y
                  }
                  r={4}
                  style={{
                    fill:
                      isInfinity
                        ? '#fff7d6'
                        : isZero
                          ? '#f4ead0'
                          : '#ffffff',

                    stroke:
                      'rgba(20, 16, 10, 0.92)',

                    strokeWidth:
                      1.2,

                    opacity:
                      1,
                  }}
                />

                {
                  labelAsset
                    ? (
                        <foreignObject
                          x={
                            marker.projected.x +
                            8
                          }
                          y={
                            marker.projected.y -
                            18
                          }
                          width="72"
                          height="24"
                          pointerEvents="none"
                          style={{
                            overflow:
                              'visible',
                          }}
                        >
                          <div
                            xmlns="http://www.w3.org/1999/xhtml"
                            style={{
                              width: '100%',
                              height: '100%',

                              display: 'flex',
                              alignItems:
                                'center',
                              justifyContent:
                                'flex-start',

                              overflow:
                                'visible',

                              pointerEvents:
                                'none',
                            }}
                          >
                            <img
                              src={
                                labelAsset
                              }
                              alt=""
                              aria-hidden="true"
                              style={{
                                display:
                                  'block',

                                /*
                                 * Preserve the SVG's intrinsic glyph
                                 * dimensions. Do NOT normalize by width
                                 * or height.
                                 */
                                width:
                                  'auto',

                                height:
                                  'auto',

                                maxWidth:
                                  'none',

                                maxHeight:
                                  'none',

                                /*
                                 * Size exactly as typography:
                                 *
                                 *     rendered font size
                                 *     ------------------
                                 *       source font 12
                                 */
                                transform:
                                  `scale(${
                                    SPHERE_SPECIAL_LABEL_FONT_SIZE /
                                    12
                                  })`,

                                transformOrigin:
                                  'left center',

                                filter:
                                  'drop-shadow(0 1px 2px rgba(0, 0, 0, 1))',

                                pointerEvents:
                                  'none',
                              }}
                            />
                          </div>
                        </foreignObject>
                      )
                    : (
                        <text
                          x={
                            marker.projected.x +
                            9
                          }
                          y={
                            marker.projected.y -
                            8
                          }
                          style={{
                            fill:
                              'rgba(250, 247, 238, 0.96)',

                            fontFamily:
                              '"Times New Roman", Times, serif',

                            fontSize:
                              '17px',

                            paintOrder:
                              'stroke',

                            stroke:
                              'rgba(0, 0, 0, 0.92)',

                            strokeWidth:
                              3,

                            strokeLinejoin:
                              'round',

                            filter:
                              'drop-shadow(0 1px 2px rgba(0, 0, 0, 1))',

                            opacity:
                              1,
                          }}
                        >
                          {
                            isZero
                              ? '0'
                              : isInfinity
                                ? '∞'
                                : ''
                          }
                        </text>
                      )
                }
              </g>
            );
          }
        )
      }

      <g
        transform="translate(18 22)"
        style={{
          display:
            showDiagnostics
              ? undefined
              : 'none',

          pointerEvents:
            'none',
        }}
      >
        <text
          x="0"
          y="0"
          style={{
            fill:
              'rgba(250, 247, 238, 0.92)',

            fontFamily:
              '"Times New Roman", Times, serif',

            fontSize:
              '13px',
          }}
        >
          compact x-sphere · 4 smooth inverse-sheet regions
        </text>

        <text
          x="0"
          y="20"
          style={{
            fill:
              'rgba(232, 223, 200, 0.72)',

            fontFamily:
              '"Times New Roman", Times, serif',

            fontSize:
              '11px',
          }}
        >
          x = ∞ : ramification index 3
        </text>

        <text
          x="0"
          y="37"
          style={{
            fill:
              'rgba(232, 223, 200, 0.72)',

            fontFamily:
              '"Times New Roman", Times, serif',

            fontSize:
              '11px',
          }}
        >
          x = 0 : second point over a = ∞
        </text>

        <text
          x="0"
          y="58"
          style={{
            fill:
              'rgba(250, 247, 238, 0.90)',

            fontFamily:
              '"Times New Roman", Times, serif',

            fontSize:
              '11px',
          }}
        >
          topology audit · smooth seams from analytic continuation
        </text>

        <text
          x="0"
          y="75"
          style={{
            fill:
              'rgba(232, 190, 92, 0.90)',

            fontFamily:
              '"Times New Roman", Times, serif',

            fontSize:
              '10px',
          }}
        >
          boundary atlas: {COMBINED_BOUNDARY_ATLAS_AUDIT.faceCount} faces
          {' · '}{COMBINED_BOUNDARY_ATLAS_AUDIT.classifiedFaceCount} classified
          {' · '}{COMBINED_BOUNDARY_ATLAS_AUDIT.unresolvedFaceCount} unresolved
        </text>

        <text
          x="0"
          y="90"
          style={{
            fill:
              'rgba(232, 223, 200, 0.72)',

            fontFamily:
              '"Times New Roman", Times, serif',

            fontSize:
              '10px',
          }}
        >
          face labels: {COMBINED_BOUNDARY_ATLAS_AUDIT.faceCountsByRoot.map((count, index) => `${ROOT_NAMES[index]}×${count}`).join(' · ')}
        </text>

        {
          TOPOLOGY_AUDIT.map(
            (
              item,
              index
            ) => (
              <text
                key={
                  `topology-audit-${item.id}`
                }
                x="0"
                y={
                  107 +
                  index * 15
                }
                style={{
                  fill:
                    'rgba(232, 223, 200, 0.78)',

                  fontFamily:
                    '"Times New Roman", Times, serif',

                  fontSize:
                    '10px',
                }}
              >
                {
                  `${item.label}: ` +
                  item.sequence
                    .map(
                      regionIndex =>
                        ROOT_NAMES[
                          regionIndex
                        ]
                    )
                    .join(' → ') +
                  `  (${item.unique.length} regions)`
                }
              </text>
            )
          )
        }
      </g>
          </>
        )
      }


      {
        displayMode !== 'sphere' && (
      <g
        style={{
          pointerEvents:
            'none',
        }}
      >
        <image
          href="/riemann/riemann-planar-background.png"
          x={rootMapBounds.x}
          y={rootMapBounds.y}
          width={rootMapBounds.width}
          height={rootMapBounds.height}
          preserveAspectRatio="none"
          onLoad={() => {
            setPlanarBackgroundReady(
              true
            );
          }}
          style={{
            pointerEvents:
              'none',
          }}
        />


        {
          projectedRealParameterDomainLocus.map(
            curve => (
              <polyline
                key={curve.key}
                points={curve.points}
                fill="none"
                style={{
                  stroke:
                    'rgba(70, 220, 255, 0.98)',

                  strokeWidth:
                    2.4,

                  strokeLinecap:
                    'round',

                  strokeLinejoin:
                    'round',

                  vectorEffect:
                    'non-scaling-stroke',

                  pointerEvents:
                    'none',
                }}
              />
            )
          )
        }


        {
          projectedImaginaryParameterDomainLocus.map(
            curve => (
              <polyline
                key={curve.key}
                points={curve.points}
                fill="none"
                style={{
                  stroke:
                    'rgba(210, 95, 255, 0.96)',

                  strokeWidth:
                    1.2,

                  strokeLinecap:
                    'round',

                  strokeLinejoin:
                    'round',

                  vectorEffect:
                    'non-scaling-stroke',

                  pointerEvents:
                    'none',
                }}
              />
            )
          )
        }


        {
          projectedRootDomainMapCurves.map(
            curve => (
              <polyline
                key={
                  curve.key
                }
                points={
                  curve.points
                }
                fill="none"
                style={{
                  stroke:
                    'rgba(255, 252, 244, 1)',

                  strokeWidth:
                    1,

                  strokeLinecap:
                    'round',

                  strokeLinejoin:
                    'round',

                  vectorEffect:
                    'non-scaling-stroke',
                }}
              />
            )
          )
        }

        {
          projectedRealRootDomainPaths.map(
            curve => (
              <polyline
                key={
                  curve.key
                }
                points={
                  curve.points
                }
                fill="none"
                style={{
                  stroke:
                    'rgba(0, 0, 0, 0.96)',

                  strokeWidth:
                    1.35,

                  strokeLinecap:
                    'round',

                  strokeLinejoin:
                    'round',

                  vectorEffect:
                    'non-scaling-stroke',

                  pointerEvents:
                    'none',
                }}
              />
            )
          )
        }


        <line
          x1={
            rootMapCursorX
          }
          y1={
            rootMapBounds.y
          }
          x2={
            rootMapCursorX
          }
          y2={
            rootMapBounds.y +
            rootMapBounds.height
          }
          style={{
            stroke:
              'rgba(255, 250, 238, 0.48)',

            strokeWidth:
              1,

            strokeDasharray:
              '3 3',

            vectorEffect:
              'non-scaling-stroke',
          }}
        />

        {
          rootMapSectionSegments.map(
            segment => (
              <line
                key={
                  segment.key
                }
                x1={
                  rootMapCursorX
                }
                x2={
                  rootMapCursorX
                }
                y1={
                  segment.y1
                }
                y2={
                  segment.y2
                }
                style={{
                  stroke:
                    ROOT_COLORS[
                      segment.regionIndex
                    ],

                  strokeWidth:
                    5,

                  strokeOpacity:
                    1,

                  vectorEffect:
                    'non-scaling-stroke',
                }}
              />
            )
          )
        }



        <text
          x={
            rootMapBounds.x
          }
          y={
            rootMapBounds.y +
            rootMapBounds.height +
            18
          }
          style={{
            fill:
              'rgba(232, 223, 200, 0.70)',

            fontFamily:
              '"Times New Roman", Times, serif',

            fontSize:
              '16px',
          }}
        >
          0
        </text>

        <text
          x={
            rootMapX(0)
          }
          y={
            rootMapBounds.y +
            rootMapBounds.height +
            18
          }
          textAnchor="middle"
          style={{
            fill:
              'rgba(232, 223, 200, 0.70)',

            fontFamily:
              '"Times New Roman", Times, serif',

            fontSize:
              '16px',
          }}
        >
          1
        </text>

        <text
          x={
            rootMapBounds.x +
            rootMapBounds.width
          }
          y={
            rootMapBounds.y +
            rootMapBounds.height +
            18
          }
          textAnchor="end"
          style={{
            fill:
              'rgba(232, 223, 200, 0.70)',

            fontFamily:
              '"Times New Roman", Times, serif',

            fontSize:
              '16px',
          }}
        >
          ∞
        </text>

        <text
          x={
            rootMapBounds.x +
            rootMapBounds.width / 2
          }
          y={
            rootMapBounds.y +
            rootMapBounds.height +
            38
          }
          textAnchor="middle"
          style={{
            fill:
              'rgba(232, 223, 200, 0.82)',

            fontFamily:
              '"Times New Roman", Times, serif',

            fontSize:
              '16px',
          }}
        >
          log |x|
        </text>

                <text
          x={
            rootMapBounds.x -
            8
          }
          y={
            rootMapBounds.y +
            4
          }
          textAnchor="end"
          style={{
            fill:
              'rgba(232, 223, 200, 0.60)',

            fontFamily:
              '"Times New Roman", Times, serif',

            fontSize:
              '16px',
          }}
        >
          +π
        </text>

        <text
          x={
            rootMapBounds.x -
            8
          }
          y={
            rootMapY(0) +
            3
          }
          textAnchor="end"
          style={{
            fill:
              'rgba(232, 223, 200, 0.60)',

            fontFamily:
              '"Times New Roman", Times, serif',

            fontSize:
              '16px',
          }}
        >
          0
        </text>

        <text
          x={
            rootMapBounds.x -
            8
          }
          y={
            rootMapBounds.y +
            rootMapBounds.height
          }
          textAnchor="end"
          style={{
            fill:
              'rgba(232, 223, 200, 0.60)',

            fontFamily:
              '"Times New Roman", Times, serif',

            fontSize:
              '16px',
          }}
        >
          −π
        </text>

        {/*
         * Foreground outer boundary.
         *
         * The background rectangle is drawn before the colored
         * polygons, so its stroke can be visually interrupted.
         * Redraw the boundary here, after all map content, so the
         * perimeter is a continuous hard line.
         */}
        <rect
          x={rootMapBounds.x}
          y={rootMapBounds.y}
          width={rootMapBounds.width}
          height={rootMapBounds.height}
          rx="0"
          style={{
            fill: 'none',

            /*
             * Hard foreground frame.
             *
             * Drawn last and thick enough to cover the endpoints
             * of the dense internal grid, so the perimeter reads
             * as one continuous solid boundary.
             */
            stroke:
              'rgba(0, 0, 0, 0.96)',

            strokeWidth:
              2.2,

            vectorEffect:
              'non-scaling-stroke',

            pointerEvents:
              'none',
          }}
        />
      </g>
        )
      }


      {
        displayMode !== 'map' && (
          <g
            aria-label="Current quartic roots on compact x-sphere"
            style={{
              pointerEvents:
                'none',
            }}
          >
            {
              currentRootMarkers
                .filter(
                  marker =>
                    marker.sphereDepth >=
                    -1e-9
                )
                .map(
                  marker => (
                    <circle
                      key={
                        `sphere-${marker.key}`
                      }
                      cx={
                        marker.sphereX
                      }
                      cy={
                        marker.sphereY
                      }
                      r="4"
                      style={{
                        fill:
                          ROOT_COLORS[
                            marker.index
                          ],

                        stroke:
                          'rgba(0, 0, 0, 1)',

                        strokeWidth:
                          0.85,

                        vectorEffect:
                          'non-scaling-stroke',
                      }}
                    />
                  )
                )
            }
          </g>
        )
      }

      {
        displayMode !== 'sphere' && (
          <g
            aria-label="Current quartic roots on radial root-domain map"
            style={{
              pointerEvents:
                'none',
            }}
          >
            {
              currentRootMarkers.map(
                marker => (
                  <circle
                    key={
                      `map-${marker.key}`
                    }
                    cx={
                      marker.mapX
                    }
                    cy={
                      marker.mapY
                    }
                    r="4"
                    style={{
                      fill:
                        ROOT_COLORS[
                          marker.index
                        ],

                      stroke:
                        'rgba(0, 0, 0, 1)',

                      strokeWidth:
                        0.85,

                      vectorEffect:
                        'non-scaling-stroke',
                    }}
                  />
                )
              )
            }
          </g>
        )
      }


      
    </svg>
  );
}


export default memo(
  RiemannSurfaceViewer
);
