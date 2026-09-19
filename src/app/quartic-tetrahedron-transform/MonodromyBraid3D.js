'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  MONODROMY_A_STAR,
  MONODROMY_B_STAR,
  MONODROMY_BASEPOINT,
  transportRootsAlongSegment,
} from './math/monodromy';

import styles from
  './MonodromyStage.module.css';


const SVG_WIDTH = 700;
const SVG_HEIGHT = 470;


/*
 * EXACT 2D RootPlane geometry.
 *
 * These values match MonodromyStage.js so the initial 3D
 * projection is pixel-for-pixel identical to the 2D view.
 */
const ROOT_PLANE = {
  left: 58,
  right: 674,
  top: 24,
  bottom: 430,
};


const ROOT_PLANE_ASPECT =
  (
    ROOT_PLANE.right -
    ROOT_PLANE.left
  ) /
  (
    ROOT_PLANE.bottom -
    ROOT_PLANE.top
  );


const ROOT_PLANE_AXIS_TARGET = {
  x: SVG_WIDTH / 2,
  y: 248.375,
};


/*
 * Visible parameter rectangle used by the existing a-plane.
 *
 * This is FREE_PARAMETER_BOUNDS after the established
 * PARAMETER_PLANE_SCALE = 1.25 has been applied.
 */
const SHEET_PARAMETER_BOUNDS = {
  minRe: -2.45,
  maxRe: 11.95,
  minIm: -4.748,
  maxIm: 4.748,
};


const SHEET_COLUMNS = 21;
const SHEET_ROWS = 18;


/*
 * Exact double roots at the four finite branch values.
 */
const SHEET_BRANCH_RADICAL =
  Math.sqrt(
    Math.PI ** 2 +
    6 * Math.PI
  );

const SHEET_REAL_DOUBLE_ROOT =
  Math.sqrt(
    (
      -Math.PI +
      SHEET_BRANCH_RADICAL
    ) / 3
  );

const SHEET_IMAG_DOUBLE_ROOT =
  Math.sqrt(
    (
      Math.PI +
      SHEET_BRANCH_RADICAL
    ) / 3
  );

const SHEET_BRANCHES = [
  {
    id: 'plus-real',
    center: {
      re: MONODROMY_A_STAR,
      im: 0,
    },
    doubleRoot: {
      re: SHEET_REAL_DOUBLE_ROOT,
      im: 0,
    },
  },
  {
    id: 'minus-real',
    center: {
      re: -MONODROMY_A_STAR,
      im: 0,
    },
    doubleRoot: {
      re: -SHEET_REAL_DOUBLE_ROOT,
      im: 0,
    },
  },
  {
    id: 'plus-imaginary',
    center: {
      re: 0,
      im: MONODROMY_B_STAR,
    },
    doubleRoot: {
      re: 0,
      im: SHEET_IMAG_DOUBLE_ROOT,
    },
  },
  {
    id: 'minus-imaginary',
    center: {
      re: 0,
      im: -MONODROMY_B_STAR,
    },
    doubleRoot: {
      re: 0,
      im: -SHEET_IMAG_DOUBLE_ROOT,
    },
  },
];


/*
 * Explicit cuts for the labelled four-sheet covering:
 *
 *   +a3 -> top edge
 *   -a3 -> bottom edge
 *   +b1 -> left edge
 *   -b1 -> right edge
 *
 * Removing these cuts gives us a domain on which the four
 * transported color labels can be chosen consistently.
 */
function valueBetween(
  value,
  first,
  second
) {
  const minimum =
    Math.min(first, second);

  const maximum =
    Math.max(first, second);

  return (
    value >= minimum - 1e-10 &&
    value <= maximum + 1e-10
  );
}


function sheetEdgeCrossesCut(
  first,
  second
) {
  const horizontal =
    Math.abs(
      first.im - second.im
    ) < 1e-10;

  const vertical =
    Math.abs(
      first.re - second.re
    ) < 1e-10;

  if (horizontal) {
    const y =
      (first.im + second.im) / 2;

    if (
      y >= 0 &&
      valueBetween(
        MONODROMY_A_STAR,
        first.re,
        second.re
      )
    ) {
      return true;
    }

    if (
      y <= 0 &&
      valueBetween(
        -MONODROMY_A_STAR,
        first.re,
        second.re
      )
    ) {
      return true;
    }
  }

  if (vertical) {
    const x =
      (first.re + second.re) / 2;

    if (
      x <= 0 &&
      valueBetween(
        MONODROMY_B_STAR,
        first.im,
        second.im
      )
    ) {
      return true;
    }

    if (
      x >= 0 &&
      valueBetween(
        -MONODROMY_B_STAR,
        first.im,
        second.im
      )
    ) {
      return true;
    }
  }

  return false;
}


/*
 * Return the normalized location of an explicit branch cut
 * along a grid edge.
 *
 * This affects only chart-color rendering.
 * It does NOT alter the sewn surface geometry.
 */
function sheetCutFractionOnEdge(
  first,
  second
) {
  if (
    !sheetEdgeCrossesCut(
      first,
      second
    )
  ) {
    return null;
  }

  const dx =
    second.re -
    first.re;

  const dy =
    second.im -
    first.im;

  if (
    Math.abs(dx) >
    1e-12
  ) {
    const cutRe =
      (
        first.im +
        second.im
      ) / 2 >= 0
        ? MONODROMY_A_STAR
        : -MONODROMY_A_STAR;

    return clamp(
      (
        cutRe -
        first.re
      ) / dx,
      0,
      1
    );
  }

  if (
    Math.abs(dy) >
    1e-12
  ) {
    const cutIm =
      (
        first.re +
        second.re
      ) / 2 <= 0
        ? MONODROMY_B_STAR
        : -MONODROMY_B_STAR;

    return clamp(
      (
        cutIm -
        first.im
      ) / dy,
      0,
      1
    );
  }

  return null;
}


function sheetBranchInCell(
  corners
) {
  const minRe =
    Math.min(
      ...corners.map(
        point => point.re
      )
    );

  const maxRe =
    Math.max(
      ...corners.map(
        point => point.re
      )
    );

  const minIm =
    Math.min(
      ...corners.map(
        point => point.im
      )
    );

  const maxIm =
    Math.max(
      ...corners.map(
        point => point.im
      )
    );

  return (
    SHEET_BRANCHES.find(
      branch => (
        branch.center.re >= minRe &&
        branch.center.re <= maxRe &&
        branch.center.im >= minIm &&
        branch.center.im <= maxIm
      )
    ) ??
    null
  );
}


function closestRootPair(
  roots
) {
  let bestPair = [0, 1];
  let bestDistance = Infinity;

  for (
    let first = 0;
    first < roots.length;
    first += 1
  ) {
    for (
      let second = first + 1;
      second < roots.length;
      second += 1
    ) {
      const distance =
        Math.hypot(
          roots[first].re -
            roots[second].re,

          roots[first].im -
            roots[second].im
        );

      if (
        distance <
        bestDistance
      ) {
        bestDistance =
          distance;

        bestPair = [
          first,
          second,
        ];
      }
    }
  }

  return bestPair;
}


/*
 * Match four transported roots to another local root chart.
 *
 * The returned array maps source identity -> target identity.
 */
function bestRootPermutation(
  sourceRoots,
  targetRoots
) {
  let bestCost = Infinity;

  let bestPermutation = [
    0,
    1,
    2,
    3,
  ];

  const candidate =
    new Array(4);

  const used = [
    false,
    false,
    false,
    false,
  ];

  function search(
    sourceIndex,
    accumulatedCost
  ) {
    if (
      accumulatedCost >=
      bestCost
    ) {
      return;
    }

    if (
      sourceIndex === 4
    ) {
      bestCost =
        accumulatedCost;

      bestPermutation =
        [...candidate];

      return;
    }

    for (
      let targetIndex = 0;
      targetIndex < 4;
      targetIndex += 1
    ) {
      if (
        used[targetIndex]
      ) {
        continue;
      }

      const dx =
        sourceRoots[
          sourceIndex
        ].re -
        targetRoots[
          targetIndex
        ].re;

      const dy =
        sourceRoots[
          sourceIndex
        ].im -
        targetRoots[
          targetIndex
        ].im;

      candidate[
        sourceIndex
      ] =
        targetIndex;

      used[targetIndex] =
        true;

      search(
        sourceIndex + 1,
        accumulatedCost +
          dx * dx +
          dy * dy
      );

      used[targetIndex] =
        false;
    }
  }

  search(
    0,
    0
  );

  return bestPermutation;
}


/*
 * Match the established /simplest-manifold interaction feel.
 */
const DRAG_ROTATION_SPEED =
  0.006;

const MIN_ZOOM =
  0.55;

const MAX_ZOOM =
  2.0;

const CONTROL_ZOOM_STEP_SIZE =
  0.1;

const AUTO_ROTATION_HALF_TURN_MS =
  10000;


const IDENTITY_ROTATION = [
  1, 0, 0,
  0, 1, 0,
  0, 0, 1,
];


const IDENTITY_ROTATION_4D = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
];


const FOUR_D_AXIS_INDEX = {
  X: 0,
  Y: 1,
  Z: 2,
  W: 3,
};


function rotation4DPlane(
  plane,
  angle
) {
  const first =
    FOUR_D_AXIS_INDEX[
      plane[0]
    ];

  const second =
    FOUR_D_AXIS_INDEX[
      plane[1]
    ];

  const matrix = [
    ...IDENTITY_ROTATION_4D,
  ];

  const cosine =
    Math.cos(angle);

  const sine =
    Math.sin(angle);

  matrix[
    first * 4 + first
  ] = cosine;

  matrix[
    first * 4 + second
  ] = -sine;

  matrix[
    second * 4 + first
  ] = sine;

  matrix[
    second * 4 + second
  ] = cosine;

  return matrix;
}


function multiplyRotations4D(
  left,
  right
) {
  const result =
    new Array(16).fill(0);

  for (
    let row = 0;
    row < 4;
    row += 1
  ) {
    for (
      let column = 0;
      column < 4;
      column += 1
    ) {
      for (
        let inner = 0;
        inner < 4;
        inner += 1
      ) {
        result[
          row * 4 + column
        ] +=
          left[
            row * 4 + inner
          ] *
          right[
            inner * 4 + column
          ];
      }
    }
  }

  return result;
}


function applyRotation4D(
  point,
  rotation
) {
  const vector = [
    point.x,
    point.y,
    point.z,
    point.w,
  ];

  const transformed = [
    0,
    0,
    0,
    0,
  ];

  for (
    let row = 0;
    row < 4;
    row += 1
  ) {
    for (
      let column = 0;
      column < 4;
      column += 1
    ) {
      transformed[row] +=
        rotation[
          row * 4 + column
        ] *
        vector[column];
    }
  }

  return {
    x: transformed[0],
    y: transformed[1],
    z: transformed[2],
    w: transformed[3],
  };
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


/*
 * Directional lighting for projected sheet faces.
 *
 * The 3D Fill stage and 4D stage use the same light direction.
 */
function projectedFaceLightFactor(
  projected
) {
  if (
    !projected ||
    projected.length < 3
  ) {
    return 1;
  }

  const first =
    projected[0];

  const second =
    projected[1];

  const third =
    projected[2];

  const ux =
    second.x -
    first.x;

  const uy =
    second.y -
    first.y;

  const uz =
    second.depth -
    first.depth;

  const vx =
    third.x -
    first.x;

  const vy =
    third.y -
    first.y;

  const vz =
    third.depth -
    first.depth;

  let nx =
    uy * vz -
    uz * vy;

  let ny =
    uz * vx -
    ux * vz;

  let nz =
    ux * vy -
    uy * vx;

  const normalLength =
    Math.hypot(
      nx,
      ny,
      nz
    );

  if (
    normalLength <=
    1e-9
  ) {
    return 1;
  }

  nx /=
    normalLength;

  ny /=
    normalLength;

  nz /=
    normalLength;

  const lx =
    -0.42;

  const ly =
    -0.48;

  const lz =
    0.76;

  const lightLength =
    Math.hypot(
      lx,
      ly,
      lz
    );

  const diffuse =
    Math.abs(
      nx *
        lx /
        lightLength +
      ny *
        ly /
        lightLength +
      nz *
        lz /
        lightLength
    );

  return (
    0.48 +
    0.60 *
      diffuse
  );
}


/*
 * Triangulate a projected face before SVG filling.
 *
 * SVG may fill a projected non-planar quadrilateral as a
 * concave or self-crossing 2D polygon. Splitting the fill into
 * triangles removes that ambiguity while preserving the
 * original face boundary for the visible black grid.
 */
function triangulateProjectedFace(
  projected
) {
  if (
    !projected ||
    projected.length < 3
  ) {
    return [];
  }

  if (
    projected.length === 3
  ) {
    return [
      projected,
    ];
  }

  const triangles = [];

  for (
    let index = 1;
    index <
      projected.length - 1;
    index += 1
  ) {
    triangles.push([
      projected[0],
      projected[index],
      projected[
        index + 1
      ],
    ]);
  }

  return triangles;
}


function interpolateProjectedPoint(
  first,
  second,
  fraction
) {
  return {
    x:
      first.x +
      (
        second.x -
        first.x
      ) *
      fraction,

    y:
      first.y +
      (
        second.y -
        first.y
      ) *
      fraction,

    depth:
      first.depth +
      (
        second.depth -
        first.depth
      ) *
      fraction,
  };
}


/*
 * Rendering-only color subdivision.
 *
 * The underlying sewn polygon remains unchanged.
 */
function projectedColorPieces(
  polygon
) {
  const points =
    polygon.projectedPoints;

  const split =
    polygon.colorSplit;

  if (!split) {
    return [
      {
        rootIndex:
          polygon.rootIndex,

        points,
      },
    ];
  }

  if (
    split.kind ===
      'branch-edge' &&
    points.length === 3
  ) {
    const cutPoint =
      interpolateProjectedPoint(
        points[0],
        points[1],
        split.fraction
      );

    return [
      {
        rootIndex:
          polygon.rootIndex,

        points: [
          points[0],
          cutPoint,
          points[2],
        ],
      },
      {
        rootIndex:
          split.otherRootIndex,

        points: [
          cutPoint,
          points[1],
          points[2],
        ],
      },
    ];
  }

  if (
    split.kind ===
      'vertical-cut-cell' &&
    points.length === 4
  ) {
    const topCut =
      interpolateProjectedPoint(
        points[0],
        points[1],
        split.firstFraction
      );

    const bottomCut =
      interpolateProjectedPoint(
        points[3],
        points[2],
        split.secondFraction
      );

    return [
      {
        rootIndex:
          polygon.rootIndex,

        points: [
          points[0],
          topCut,
          bottomCut,
          points[3],
        ],
      },
      {
        rootIndex:
          split.otherRootIndex,

        points: [
          topCut,
          points[1],
          points[2],
          bottomCut,
        ],
      },
    ];
  }

  if (
    split.kind ===
      'horizontal-cut-cell' &&
    points.length === 4
  ) {
    const leftCut =
      interpolateProjectedPoint(
        points[0],
        points[3],
        split.firstFraction
      );

    const rightCut =
      interpolateProjectedPoint(
        points[1],
        points[2],
        split.secondFraction
      );

    return [
      {
        rootIndex:
          polygon.rootIndex,

        points: [
          points[0],
          points[1],
          rightCut,
          leftCut,
        ],
      },
      {
        rootIndex:
          split.otherRootIndex,

        points: [
          leftCut,
          rightCut,
          points[2],
          points[3],
        ],
      },
    ];
  }

  return [
    {
      rootIndex:
        polygon.rootIndex,

      points,
    },
  ];
}


function projectedColorSeam(
  polygon
) {
  const points =
    polygon.projectedPoints;

  const split =
    polygon.colorSplit;

  if (!split) {
    return null;
  }

  if (
    split.kind ===
      'branch-edge' &&
    points.length === 3
  ) {
    return [
      interpolateProjectedPoint(
        points[0],
        points[1],
        split.fraction
      ),
      points[2],
    ];
  }

  if (
    split.kind ===
      'vertical-cut-cell' &&
    points.length === 4
  ) {
    return [
      interpolateProjectedPoint(
        points[0],
        points[1],
        split.firstFraction
      ),
      interpolateProjectedPoint(
        points[3],
        points[2],
        split.secondFraction
      ),
    ];
  }

  if (
    split.kind ===
      'horizontal-cut-cell' &&
    points.length === 4
  ) {
    return [
      interpolateProjectedPoint(
        points[0],
        points[3],
        split.firstFraction
      ),
      interpolateProjectedPoint(
        points[1],
        points[2],
        split.secondFraction
      ),
    ];
  }

  return null;
}


function expandedRootBounds(
  points,
  minimumSpan = 1
) {
  let minRe = Infinity;
  let maxRe = -Infinity;
  let minIm = Infinity;
  let maxIm = -Infinity;

  points.forEach(
    point => {
      minRe =
        Math.min(
          minRe,
          point.re
        );

      maxRe =
        Math.max(
          maxRe,
          point.re
        );

      minIm =
        Math.min(
          minIm,
          point.im
        );

      maxIm =
        Math.max(
          maxIm,
          point.im
        );
    }
  );

  let width =
    Math.max(
      minimumSpan,
      maxRe - minRe
    );

  let height =
    Math.max(
      minimumSpan,
      maxIm - minIm
    );

  const xPad =
    Math.max(
      0.12,
      width * 0.07
    );

  const yPad =
    Math.max(
      0.12,
      height * 0.09
    );

  minRe -= xPad;
  maxRe += xPad;
  minIm -= yPad;
  maxIm += yPad;

  width =
    maxRe - minRe;

  height =
    maxIm - minIm;

  const currentAspect =
    width / height;

  if (
    currentAspect <
    ROOT_PLANE_ASPECT
  ) {
    const desiredWidth =
      height *
      ROOT_PLANE_ASPECT;

    const extra =
      (
        desiredWidth -
        width
      ) / 2;

    minRe -= extra;
    maxRe += extra;
  } else {
    const desiredHeight =
      width /
      ROOT_PLANE_ASPECT;

    const extra =
      (
        desiredHeight -
        height
      ) / 2;

    minIm -= extra;
    maxIm += extra;
  }

  return {
    minRe,
    maxRe,
    minIm,
    maxIm,
  };
}


function rotationX(angle) {
  const cosine =
    Math.cos(angle);

  const sine =
    Math.sin(angle);

  return [
    1, 0, 0,
    0, cosine, -sine,
    0, sine, cosine,
  ];
}


function rotationY(angle) {
  const cosine =
    Math.cos(angle);

  const sine =
    Math.sin(angle);

  return [
    cosine, 0, -sine,
    0, 1, 0,
    sine, 0, cosine,
  ];
}


function rotationZ(angle) {
  const cosine =
    Math.cos(angle);

  const sine =
    Math.sin(angle);

  return [
    cosine, -sine, 0,
    sine, cosine, 0,
    0, 0, 1,
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


function rotationFromYawPitch(
  yaw,
  pitch
) {
  return multiplyRotations(
    rotationX(pitch),
    rotationY(yaw)
  );
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


/*
 * Default 3D orientation matches the 2D root plane:
 *
 *   Re(root) -> screen horizontal
 *   Im(root) -> screen vertical
 *   continuation time -> screen depth
 *
 * The first switch from 2D to 3D therefore leaves the
 * visible root geometry in exactly the same orientation.
 */
const DEFAULT_VIEW = {
  rotation: IDENTITY_ROTATION,
  zoom: 1,
};


export default function MonodromyBraid3D({
  trajectory,
  frameIndex,
  rootColors,
  showRootDots = true,
  zoomStep = 0,
  displayMode = 'strands',
  showGluePairs = false,
  dimensionMode = '3D',
  fourDPoleXWAngle = 0,
  fourDPoleYWAngle = 0,
  fourDPoleZWAngle = 0,
  surfaceOpacity = 1,
  cameraRollCommand = {
    id: 0,
    direction: 0,
  },
  cameraResetCommand = {
    id: 0,
  },
  active = false,
  interactionEnabled = true,
}) {
  const [
    view,
    setView,
  ] =
    useState(
      () => ({
        rotation: [
          ...DEFAULT_VIEW.rotation,
        ],

        zoom:
          DEFAULT_VIEW.zoom,
      })
    );

  /*
   * Full 4D projection-pole orientation.
   *
   * Only rotations that mix the hidden W direction with the
   * visible X/Y/Z coordinates are needed to choose the 4D -> 3D
   * projection pole. Ordinary 3D camera rotation is applied later.
   *
   * Fixed composition order:
   *
   *   R_pole = R_ZW(gamma) R_YW(beta) R_XW(alpha)
   */
  const rotation4D =
    useMemo(
      () =>
        multiplyRotations4D(
          rotation4DPlane(
            'ZW',
            fourDPoleZWAngle
          ),
          multiplyRotations4D(
            rotation4DPlane(
              'YW',
              fourDPoleYWAngle
            ),
            rotation4DPlane(
              'XW',
              fourDPoleXWAngle
            )
          )
        ),
      [
        fourDPoleXWAngle,
        fourDPoleYWAngle,
        fourDPoleZWAngle,
      ]
    );

  const [
    isDragging,
    setIsDragging,
  ] =
    useState(false);

  const dragRef =
    useRef(null);

  const lastCameraRollCommandIdRef =
    useRef(
      cameraRollCommand.id
    );

  const lastCameraResetCommandIdRef =
    useRef(
      cameraResetCommand.id
    );

  const [
    autoRotationDirection,
    setAutoRotationDirection,
  ] =
    useState(0);


  /*
   * Discrete Reset view command for the shared camera.
   *
   * This deliberately resets only the shared camera:
   *   - rotation -> identity
   *   - zoom     -> 1
   *
   * It does NOT alter:
   *   - continuation path
   *   - frame index
   *   - parameter-projection angle
   *   - Strands / Sheets selection
   *   - cuts / glue pairs
   */
  useEffect(
    () => {
      if (
        cameraResetCommand.id ===
        lastCameraResetCommandIdRef.current
      ) {
        return;
      }

      lastCameraResetCommandIdRef.current =
        cameraResetCommand.id;

      if (
        !active
      ) {
        return;
      }

      setAutoRotationDirection(
        0
      );

      setIsDragging(
        false
      );

      dragRef.current =
        null;

      setView({
        rotation: [
          ...DEFAULT_VIEW.rotation,
        ],

        zoom:
          clamp(
            DEFAULT_VIEW.zoom +
              zoomStep *
                CONTROL_ZOOM_STEP_SIZE,
            MIN_ZOOM,
            MAX_ZOOM
          ),
      });
    },
    [
      active,
      cameraResetCommand.id,
      dimensionMode,
      zoomStep,
    ]
  );


  /*
   * Discrete screen-roll commands from the 4D controls.
   *
   * These compose onto the CURRENT 3D camera orientation.
   */
  useEffect(
    () => {
      if (
        cameraRollCommand.id ===
        lastCameraRollCommandIdRef.current
      ) {
        return;
      }

      lastCameraRollCommandIdRef.current =
        cameraRollCommand.id;

      if (
        !active ||
        !cameraRollCommand.direction
      ) {
        return;
      }

      setAutoRotationDirection(
        0
      );

      const angle =
        cameraRollCommand.direction *
        Math.PI / 12;

      setView(
        current => ({
          ...current,

          rotation:
            multiplyRotations(
              rotationZ(angle),
              current.rotation
            ),
        })
      );
    },
    [
      active,
      cameraRollCommand.id,
      cameraRollCommand.direction,
    ]
  );


  /*
   * Left / Right keyboard rotation:
   * exactly pi radians every 10 seconds.
   */
  useEffect(
    () => {
      if (
        !active ||
        autoRotationDirection === 0
      ) {
        return undefined;
      }

      let frameId;

      let previousTime =
        performance.now();

      function animate(now) {
        const elapsed =
          now -
          previousTime;

        previousTime =
          now;

        const angle =
          autoRotationDirection *
          Math.PI *
          (
            elapsed /
            AUTO_ROTATION_HALF_TURN_MS
          );

        setView(
          current => ({
            ...current,

            rotation:
              multiplyRotations(
                rotationY(angle),
                current.rotation
              ),
          })
        );

        frameId =
          window.requestAnimationFrame(
            animate
          );
      }

      frameId =
        window.requestAnimationFrame(
          animate
        );

      return () =>
        window.cancelAnimationFrame(
          frameId
        );
    },
    [
      active,
      autoRotationDirection,
    ]
  );


  /*
   * Entering 3D begins from the exact 2D camera frame.
   *
   * Strands and Sheets share ONE camera. Switching between
   * them must never change orientation, zoom, or the pinned
   * screen position of the origin.
   */
  useEffect(
    () => {
      setAutoRotationDirection(
        0
      );

      setIsDragging(
        false
      );

      dragRef.current =
        null;

      if (!active) {
        return;
      }

      setView({
        rotation: [
          ...DEFAULT_VIEW.rotation,
        ],

        zoom:
          clamp(
            DEFAULT_VIEW.zoom +
              zoomStep *
                CONTROL_ZOOM_STEP_SIZE,
            MIN_ZOOM,
            MAX_ZOOM
          ),
      });
    },
    [
      active,
      dimensionMode,
    ]
  );


  /*
   * Discrete Zoom - / + controls.
   *
   * Each button step changes canonical camera zoom by 0.1
   * while preserving current camera rotation.
   *
   * MonodromyStage limits the buttons to:
   *
   *   -2 steps below default
   *   +10 steps above default
   */
  useEffect(
    () => {
      if (!active) {
        return;
      }

      setView(
        current => ({
          ...current,

          zoom:
            clamp(
              DEFAULT_VIEW.zoom +
                zoomStep *
                  CONTROL_ZOOM_STEP_SIZE,
              MIN_ZOOM,
              MAX_ZOOM
            ),
        })
      );
    },
    [
      active,
      zoomStep,
    ]
  );


  function zoomView(amount) {
    setView(
      current => ({
        ...current,

        zoom:
          clamp(
            current.zoom + amount,
            MIN_ZOOM,
            MAX_ZOOM
          ),
      })
    );
  }


  function beginRotate(event) {
    if (
      !active ||
      !interactionEnabled ||
      event.button !== 0
    ) {
      return;
    }

    setAutoRotationDirection(
      0
    );

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

    setIsDragging(
      true
    );
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

    const horizontalRotation =
      rotationY(
        deltaX *
        DRAG_ROTATION_SPEED
      );

    const verticalRotation =
      rotationX(
        -deltaY *
        DRAG_ROTATION_SPEED
      );

    const dragRotation =
      multiplyRotations(
        verticalRotation,
        horizontalRotation
      );

    setView(
      current => ({
        ...current,

        /*
         * Screen-relative rotation, matching
         * the simplest-manifold viewer.
         */
        rotation:
          multiplyRotations(
            dragRotation,
            drag.startRotation
          ),
      })
    );
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

    dragRef.current =
      null;

    setIsDragging(
      false
    );
  }


  function handleWheel(event) {
    if (!interactionEnabled) {
      return;
    }

    event.preventDefault();

    zoomView(
      clamp(
        -event.deltaY *
          0.0015,

        -0.12,
        0.12
      )
    );
  }


  function handleKeyDown(event) {
    if (!interactionEnabled) {
      return;
    }

    const horizontalDirections = {
      ArrowLeft: -1,
      ArrowRight: 1,
    };

    const horizontalDirection =
      horizontalDirections[
        event.key
      ];

    if (
      horizontalDirection !==
      undefined
    ) {
      event.preventDefault();

      setAutoRotationDirection(
        horizontalDirection
      );

      return;
    }

    const zoomAmounts = {
      ArrowUp: 0.1,
      ArrowDown: -0.1,
    };

    const zoomAmount =
      zoomAmounts[
        event.key
      ];

    if (
      zoomAmount ===
      undefined
    ) {
      return;
    }

    event.preventDefault();

    setAutoRotationDirection(
      0
    );

    zoomView(
      zoomAmount
    );
  }


  function handleKeyUp(event) {
    if (!interactionEnabled) {
      return;
    }

    const horizontalDirections = {
      ArrowLeft: -1,
      ArrowRight: 1,
    };

    const horizontalDirection =
      horizontalDirections[
        event.key
      ];

    if (
      horizontalDirection ===
      undefined
    ) {
      return;
    }

    event.preventDefault();

    setAutoRotationDirection(
      current =>
        current ===
        horizontalDirection
          ? 0
          : current
    );
  }


  function handleBlur() {
    setAutoRotationDirection(
      0
    );
  }


  /*
   * Braid geometry:
   *
   *   x = Re(root)
   *   y = Im(root)
   *   z = continuation time
   *
   * So these are the actual four root world-lines rather
   * than an arbitrary extrusion of the 2D picture.
   */
  const allFrames =
    trajectory.frames;

  const safeFrameIndex =
    Math.min(
      frameIndex,
      allFrames.length - 1
    );

  const allRoots =
    allFrames.flatMap(
      frame =>
        frame.roots
    );

  /*
   * Root-plane scale.
   *
   * In 4D the surface must NOT resize when a continuation
   * trace is added. Trace axes and boundary can add many root
   * samples whose extrema are slightly larger than the
   * physical starting frame; using allRoots here caused the
   * entire surface to auto-fit and visibly shrink.
   *
   * Therefore:
   *
   *   4D       -> fixed scale from the physical/basepoint roots
   *   legacy   -> existing adaptive scale from all trajectory roots
   *
   * The trace is then projected into the already-established
   * 4D geometry instead of changing that geometry's scale.
   */
  const rootBoundsSource =
    (
      dimensionMode === '4D' &&
      trajectory.initialRoots &&
      trajectory.initialRoots.length
    )
      ? trajectory.initialRoots
      : allRoots;

  const rootBounds =
    expandedRootBounds(
      rootBoundsSource,
      2
    );

  const rootScale =
    (
      ROOT_PLANE.right -
      ROOT_PLANE.left
    ) /
    (
      rootBounds.maxRe -
      rootBounds.minRe
    );

  const timeDepth =
    360;


  function worldPoint(
    root,
    index
  ) {
    /*
     * The CURRENT complex roots belong to the XY plane:
     *
     *   X = Re(x)
     *   Y = Im(x)
     *   Z = 0
     *
     * Continuation time is therefore represented as history
     * receding behind that plane, rather than centering the
     * whole trajectory around Z = 0.
     */
    const currentIndex =
      Math.max(
        0,
        safeFrameIndex
      );

    const denominator =
      Math.max(
        1,
        currentIndex
      );

    const relativeTime =
      (
        index -
        currentIndex
      ) /
      denominator;

    return {
      /*
       * x/y are measured from the true complex origin.
       * This reproduces the translated 2D RootPlane exactly.
       */
      x:
        root.re *
        rootScale,

      y:
        root.im *
        rootScale,

      /*
       * Current roots: Z = 0.
       * Earlier continuation history: Z < 0.
       */
      z:
        relativeTime *
        timeDepth,
    };
  }


  /*
   * Orthographic 3D projection.
   *
   * At the identity camera this is EXACTLY the 2D RootPlane:
   *
   *   Re -> horizontal
   *   Im -> vertical
   *   time -> directly into the screen
   *
   * After rotation, time mixes into the visible x/y plane
   * and the braid opens into 3D.
   *
   * The true origin always projects to the same calibrated
   * 2D screen point.
   */
  function project(point) {
    const rotated =
      applyRotation(
        point,
        view.rotation
      );

    return {
      x:
        ROOT_PLANE_AXIS_TARGET.x +
        rotated.x *
        view.zoom,

      y:
        ROOT_PLANE_AXIS_TARGET.y -
        rotated.y *
        view.zoom,
    };
  }


  function projectAxis(
    first,
    second
  ) {
    return {
      first:
        project(first),

      second:
        project(second),
    };
  }


  /*
   * Four labelled root sheets over the visible complex
   * parameter rectangle.
   *
   * Keep the familiar root plane as the visible XY plane:
   *
   *   X = Re(root)
   *   Y = Im(root)
   *   Z = Re(a)
   *
   * Therefore the flat sheet view uses exactly the same
   * root positions, scale, origin, and axes as 2D/Strands.
   * Rotating the viewer reveals the parameter direction.
   *
   * Root labels are propagated from the physical basepoint
   * without crossing the explicit branch cuts.
   */
  const sheetMesh =
    useMemo(
      () => {
        if (
          (
            dimensionMode !== '4D' &&
            displayMode !== 'sheets'
          ) ||
          !trajectory.initialRoots ||
          trajectory.initialRoots.length !== 4
        ) {
          return null;
        }

        const columns =
          Array.from(
            {
              length:
                SHEET_COLUMNS,
            },
            (_, column) => (
              SHEET_PARAMETER_BOUNDS.minRe +
              (
                SHEET_PARAMETER_BOUNDS.maxRe -
                SHEET_PARAMETER_BOUNDS.minRe
              ) *
              column /
              (SHEET_COLUMNS - 1)
            )
          );

        const rows =
          Array.from(
            {
              length:
                SHEET_ROWS,
            },
            (_, row) => (
              SHEET_PARAMETER_BOUNDS.maxIm -
              (
                SHEET_PARAMETER_BOUNDS.maxIm -
                SHEET_PARAMETER_BOUNDS.minIm
              ) *
              row /
              (SHEET_ROWS - 1)
            )
          );

        const parameterAt =
          (
            row,
            column
          ) => ({
            re:
              columns[column],

            im:
              rows[row],
          });

        const vertices =
          Array.from(
            {
              length:
                SHEET_ROWS,
            },
            () =>
              Array(
                SHEET_COLUMNS
              ).fill(null)
          );


        /*
         * Seed at the grid point nearest the physical a.
         */
        let seedRow = 0;
        let seedColumn = 0;
        let seedDistance =
          Infinity;

        for (
          let row = 0;
          row < SHEET_ROWS;
          row += 1
        ) {
          for (
            let column = 0;
            column < SHEET_COLUMNS;
            column += 1
          ) {
            const parameter =
              parameterAt(
                row,
                column
              );

            const candidateDistance =
              Math.hypot(
                parameter.re -
                  MONODROMY_BASEPOINT.re,

                parameter.im -
                  MONODROMY_BASEPOINT.im
              );

            if (
              candidateDistance <
              seedDistance
            ) {
              seedDistance =
                candidateDistance;

              seedRow =
                row;

              seedColumn =
                column;
            }
          }
        }

        const seedA =
          parameterAt(
            seedRow,
            seedColumn
          );

        const seedTransport =
          transportRootsAlongSegment({
            fromA:
              MONODROMY_BASEPOINT,

            roots:
              trajectory.initialRoots,

            toA:
              seedA,

            maxParameterStep:
              0.12,
          });

        vertices[
          seedRow
        ][
          seedColumn
        ] = {
          a:
            seedA,

          roots:
            seedTransport.roots,
        };


        /*
         * Flood the cut parameter domain. Each edge transports
         * the already-labelled roots to the neighbouring
         * parameter value.
         */
        const queue = [
          [
            seedRow,
            seedColumn,
          ],
        ];

        let queueIndex = 0;

        const neighbours = [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ];

        while (
          queueIndex <
          queue.length
        ) {
          const [
            row,
            column,
          ] =
            queue[
              queueIndex
            ];

          queueIndex += 1;

          const current =
            vertices[
              row
            ][
              column
            ];

          neighbours.forEach(
            (
              [
                rowStep,
                columnStep,
              ]
            ) => {
              const nextRow =
                row +
                rowStep;

              const nextColumn =
                column +
                columnStep;

              if (
                nextRow < 0 ||
                nextRow >=
                  SHEET_ROWS ||
                nextColumn < 0 ||
                nextColumn >=
                  SHEET_COLUMNS ||
                vertices[
                  nextRow
                ][
                  nextColumn
                ]
              ) {
                return;
              }

              const nextA =
                parameterAt(
                  nextRow,
                  nextColumn
                );

              if (
                sheetEdgeCrossesCut(
                  current.a,
                  nextA
                )
              ) {
                return;
              }

              const transported =
                transportRootsAlongSegment({
                  fromA:
                    current.a,

                  roots:
                    current.roots,

                  toA:
                    nextA,

                  maxParameterStep:
                    0.16,
                });

              vertices[
                nextRow
              ][
                nextColumn
              ] = {
                a:
                  nextA,

                roots:
                  transported.roots,
              };

              queue.push([
                nextRow,
                nextColumn,
              ]);
            }
          );
        }


        /*
         * Record every grid edge that crosses one of the four
         * explicit branch cuts. Both endpoint charts already
         * have consistently transported roots, reached from
         * opposite sides of that cut.
         */
        const cutEdges = [];

        for (
          let row = 0;
          row < SHEET_ROWS;
          row += 1
        ) {
          for (
            let column = 0;
            column <
              SHEET_COLUMNS - 1;
            column += 1
          ) {
            const first =
              vertices[
                row
              ][
                column
              ];

            const second =
              vertices[
                row
              ][
                column + 1
              ];

            if (
              first &&
              second &&
              sheetEdgeCrossesCut(
                first.a,
                second.a
              )
            ) {
              cutEdges.push({
                first,
                second,
              });
            }
          }
        }

        for (
          let row = 0;
          row < SHEET_ROWS - 1;
          row += 1
        ) {
          for (
            let column = 0;
            column < SHEET_COLUMNS;
            column += 1
          ) {
            const first =
              vertices[
                row
              ][
                column
              ];

            const second =
              vertices[
                row + 1
              ][
                column
              ];

            if (
              first &&
              second &&
              sheetEdgeCrossesCut(
                first.a,
                second.a
              )
            ) {
              cutEdges.push({
                first,
                second,
              });
            }
          }
        }


        /*
         * Ordinary cells remain quadrilaterals.
         *
         * At a finite branch value, detect the two roots that
         * actually collide and fan those two colored sheets
         * into their exact common double-root vertex.
         *
         * The other two roots are regular there and continue
         * straight through the cell.
         */
        const cells = [];
        const cutFaces = [];
        const branchFaces = [];

        for (
          let row = 0;
          row <
            SHEET_ROWS - 1;
          row += 1
        ) {
          for (
            let column = 0;
            column <
              SHEET_COLUMNS - 1;
            column += 1
          ) {
            const topLeft =
              vertices[
                row
              ][
                column
              ];

            const topRight =
              vertices[
                row
              ][
                column + 1
              ];

            const bottomRight =
              vertices[
                row + 1
              ][
                column + 1
              ];

            const bottomLeft =
              vertices[
                row + 1
              ][
                column
              ];

            if (
              !topLeft ||
              !topRight ||
              !bottomRight ||
              !bottomLeft
            ) {
              continue;
            }

            const cellVertices = [
              topLeft,
              topRight,
              bottomRight,
              bottomLeft,
            ];

            const parameterCorners =
              cellVertices.map(
                vertex =>
                  vertex.a
              );

            const branch =
              sheetBranchInCell(
                parameterCorners
              );


            if (branch) {
              /*
               * SIMPLE RAMIFICATION PATCH
               *
               * A simple branch point is one lifted disk.
               *
               * One circuit around the parameter-cell boundary
               * exchanges the two colliding roots. The lifted
               * boundary therefore closes only after TWO circuits:
               *
               *   4 parameter edges x 2 lifts = 8 boundary edges.
               *
               * Fan those eight lifted edges to the exact common
               * double-root point.
               *
               * The outer vertices are the ORIGINAL grid vertices.
               * Therefore every outer edge agrees exactly with the
               * neighbouring regular/cut face.
               */

              /*
               * Identify the colliding pair in one local chart by
               * approaching the exact branch value.
               */
              const referenceVertex =
                cellVertices.reduce(
                  (
                    best,
                    candidate
                  ) => {
                    const bestDistance =
                      Math.hypot(
                        best.a.re -
                          branch.center.re,

                        best.a.im -
                          branch.center.im
                      );

                    const candidateDistance =
                      Math.hypot(
                        candidate.a.re -
                          branch.center.re,

                        candidate.a.im -
                          branch.center.im
                      );

                    return (
                      candidateDistance <
                      bestDistance
                        ? candidate
                        : best
                    );
                  }
                );

              const towardReference = {
                re:
                  referenceVertex.a.re -
                  branch.center.re,

                im:
                  referenceVertex.a.im -
                  branch.center.im,
              };

              const towardLength =
                Math.max(
                  1e-12,

                  Math.hypot(
                    towardReference.re,
                    towardReference.im
                  )
                );

              const nearBranchDistance =
                1e-4;

              const nearBranchA = {
                re:
                  branch.center.re +
                  towardReference.re /
                    towardLength *
                    nearBranchDistance,

                im:
                  branch.center.im +
                  towardReference.im /
                    towardLength *
                    nearBranchDistance,
              };

              const nearBranchTransport =
                transportRootsAlongSegment({
                  fromA:
                    referenceVertex.a,

                  roots:
                    referenceVertex.roots,

                  toA:
                    nearBranchA,

                  maxParameterStep:
                    0.02,
                });

              const collidingPair =
                closestRootPair(
                  nearBranchTransport.roots
                );


              /*
               * The two NON-colliding roots are analytic through the
               * branch value. Keep their ordinary cell unchanged.
               *
               * This also guarantees their outside edges remain
               * exactly identical to their neighbours.
               */
              for (
                let rootIndex = 0;
                rootIndex < 4;
                rootIndex += 1
              ) {
                if (
                  !collidingPair.includes(
                    rootIndex
                  )
                ) {
                  cells.push({
                    rootIndex,

                    vertices:
                      cellVertices,
                  });
                }
              }


              /*
               * Parameter-cell boundary in cyclic order.
               */
              const branchBoundary = [
                topLeft,
                topRight,
                bottomRight,
                bottomLeft,
              ];


              /*
               * Determine root continuation independently on each
               * nonsingular boundary edge.
               *
               * This is particularly important for the one boundary
               * edge crossed by the artificial branch cut: the
               * geometric sheet continues there even though its
               * transported label changes.
               */
              const branchEdgePermutations =
                branchBoundary.map(
                  (
                    first,
                    edgeIndex
                  ) => {
                    const second =
                      branchBoundary[
                        (
                          edgeIndex + 1
                        ) % 4
                      ];

                    return bestRootPermutation(
                      first.roots,
                      second.roots
                    );
                  }
                );


              /*
               * Express the two colliding identities at topLeft.
               * These are the two starting points of the two lifted
               * four-edge traversals.
               */
              const referenceToTopLeft =
                bestRootPermutation(
                  referenceVertex.roots,
                  topLeft.roots
                );

              const branchStartIndices =
                collidingPair.map(
                  rootIndex =>
                    referenceToTopLeft[
                      rootIndex
                    ]
                );


              /*
               * Exact ramification point.
               *
               * Both colliding sheets terminate at precisely this
               * same point:
               *
               *   a = branch value
               *   x = exact double root
               */
              const branchCenterPoint = {
                a: {
                  re:
                    branch.center.re,

                  im:
                    branch.center.im,
                },

                root: {
                  re:
                    branch.doubleRoot.re,

                  im:
                    branch.doubleRoot.im,
                },
              };


              /*
               * Build the lifted boundary.
               *
               * For each starting root:
               *
               *   TL -> TR -> BR -> BL -> TL
               *
               * Root identity is transported edge-by-edge.
               *
               * Because the cell contains one simple branch point,
               * a complete circuit lands on the OTHER colliding
               * root. The second four-edge traversal closes the
               * eight-edge lifted boundary.
               *
               * Each lifted boundary edge plus the exact branch
               * point gives one triangle.
               */
              branchStartIndices.forEach(
                startIndex => {
                  let currentIndex =
                    startIndex;

                  for (
                    let edgeIndex = 0;
                    edgeIndex < 4;
                    edgeIndex += 1
                  ) {
                    const first =
                      branchBoundary[
                        edgeIndex
                      ];

                    const second =
                      branchBoundary[
                        (
                          edgeIndex + 1
                        ) % 4
                      ];

                    const nextIndex =
                      branchEdgePermutations[
                        edgeIndex
                      ][
                        currentIndex
                      ];

                    const branchCutFraction =
                      currentIndex !==
                        nextIndex
                        ? sheetCutFractionOnEdge(
                            first.a,
                            second.a
                          )
                        : null;

                    branchFaces.push({
                      /*
                       * Geometry follows the lifted ramification disk.
                       *
                       * If the outer edge crosses the artificial cut,
                       * the same geometric triangle is rendered with
                       * two local chart colors separated exactly at
                       * the cut.
                       */
                      rootIndex:
                        currentIndex,

                      colorSplit:
                        branchCutFraction !==
                        null
                          ? {
                              kind:
                                'branch-edge',

                              fraction:
                                branchCutFraction,

                              otherRootIndex:
                                nextIndex,
                            }
                          : null,

                      points: [
                        {
                          a:
                            first.a,

                          root:
                            first.roots[
                              currentIndex
                            ],
                        },

                        {
                          a:
                            second.a,

                          root:
                            second.roots[
                              nextIndex
                            ],
                        },

                        branchCenterPoint,
                      ],
                    });

                    currentIndex =
                      nextIndex;
                  }
                }
              );

              continue;
            }


            /*
             * Outside branch-point cells, keep the explicit
             * branch cuts open until we glue them correctly.
             */
            if (
              sheetEdgeCrossesCut(
                topLeft.a,
                topRight.a
              ) ||

              sheetEdgeCrossesCut(
                topRight.a,
                bottomRight.a
              ) ||

              sheetEdgeCrossesCut(
                bottomRight.a,
                bottomLeft.a
              ) ||

              sheetEdgeCrossesCut(
                bottomLeft.a,
                topLeft.a
              )
            ) {
              /*
               * The cut is only a labeling device. In the
               * actual covering the surface is continuous.
               * Match the local roots at the four corners and
               * create the missing face with explicit roots.
               */
              const topRightPermutation =
                bestRootPermutation(
                  topLeft.roots,
                  topRight.roots
                );

              const bottomLeftPermutation =
                bestRootPermutation(
                  topLeft.roots,
                  bottomLeft.roots
                );

              const bottomRightPermutation =
                bestRootPermutation(
                  topLeft.roots,
                  bottomRight.roots
                );

              const topCutFraction =
                sheetCutFractionOnEdge(
                  topLeft.a,
                  topRight.a
                );

              const bottomCutFraction =
                sheetCutFractionOnEdge(
                  bottomLeft.a,
                  bottomRight.a
                );

              const leftCutFraction =
                sheetCutFractionOnEdge(
                  topLeft.a,
                  bottomLeft.a
                );

              const rightCutFraction =
                sheetCutFractionOnEdge(
                  topRight.a,
                  bottomRight.a
                );

              const verticalColorSplit =
                topCutFraction !== null &&
                bottomCutFraction !== null;

              const horizontalColorSplit =
                leftCutFraction !== null &&
                rightCutFraction !== null;

              for (
                let rootIndex = 0;
                rootIndex < 4;
                rootIndex += 1
              ) {
                cutFaces.push({
                  rootIndex,

                  colorSplit:
                    verticalColorSplit
                      ? {
                          kind:
                            'vertical-cut-cell',

                          firstFraction:
                            topCutFraction,

                          secondFraction:
                            bottomCutFraction,

                          otherRootIndex:
                            topRightPermutation[
                              rootIndex
                            ],
                        }
                      : horizontalColorSplit
                        ? {
                            kind:
                              'horizontal-cut-cell',

                            firstFraction:
                              leftCutFraction,

                            secondFraction:
                              rightCutFraction,

                            otherRootIndex:
                              bottomLeftPermutation[
                                rootIndex
                              ],
                          }
                        : null,

                  points: [
                    {
                      a: topLeft.a,
                      root:
                        topLeft.roots[
                          rootIndex
                        ],
                    },
                    {
                      a: topRight.a,
                      root:
                        topRight.roots[
                          topRightPermutation[
                            rootIndex
                          ]
                        ],
                    },
                    {
                      a: bottomRight.a,
                      root:
                        bottomRight.roots[
                          bottomRightPermutation[
                            rootIndex
                          ]
                        ],
                    },
                    {
                      a: bottomLeft.a,
                      root:
                        bottomLeft.roots[
                          bottomLeftPermutation[
                            rootIndex
                          ]
                        ],
                    },
                  ],
                });
              }

              continue;
            }

            for (
              let rootIndex = 0;
              rootIndex < 4;
              rootIndex += 1
            ) {
              cells.push({
                rootIndex,

                vertices:
                  cellVertices,
              });
            }
          }
        }

        return {
          cells,
          cutEdges,
          cutFaces,
          branchFaces,
          vertices,
        };
      },
      [
        dimensionMode,
        displayMode,
        trajectory.initialRoots,
      ]
    );


  /*
   * The sheet must live in the SAME visible root plane as
   * the 2D/Strands view. Only its depth coordinate is new.
   *
   * The root x/y coordinates therefore use rootScale
   * directly. Re(a) is mapped to a moderate depth range.
   */
  const parameterMaximum =
    Math.max(
      1,

      Math.abs(
        SHEET_PARAMETER_BOUNDS.minRe
      ),

      Math.abs(
        SHEET_PARAMETER_BOUNDS.maxRe
      ),

      Math.abs(
        SHEET_PARAMETER_BOUNDS.minIm
      ),

      Math.abs(
        SHEET_PARAMETER_BOUNDS.maxIm
      )
    );

  const sheetParameterDepth =
    180;

  const sheetParameterDepthScale =
    sheetParameterDepth /
    parameterMaximum;


  /*
   * Canonical 3D Sheets embedding.
   *
   * Keep the complex root plane visible:
   *
   *   X = Re(root)
   *   Y = Im(root)
   *
   * and use the REAL parameter coordinate as depth:
   *
   *   Z = Re(a)
   *
   * There is intentionally no adjustable parameter-plane
   * rotation here.
   *
   * Im(a) is discarded only in this 3D projection. The full
   * pair Re(a), Im(a) remains present in the 4D viewer below.
   */
  function sheetWorldPoint(
    parameter,
    root
  ) {
    return {
      x:
        root.re *
        rootScale,

      y:
        root.im *
        rootScale,

      z:
        parameter.re *
        sheetParameterDepthScale,
    };
  }


  /*
   * TRUE 4D branched-cover coordinate:
   *
   *   X = Re(root)
   *   Y = Im(root)
   *   Z = Re(a)
   *   W = Im(a)
   *
   * No coordinate is discarded until AFTER the selected
   * 4D rotation is applied.
   */
  function sheetWorldPoint4D(
    parameter,
    root
  ) {
    return {
      x:
        root.re *
        rootScale,

      y:
        root.im *
        rootScale,

      z:
        parameter.re *
        sheetParameterDepthScale,

      w:
        parameter.im *
        sheetParameterDepthScale,
    };
  }


  function project4DWithDepth(
    point
  ) {
    const rotated4D =
      applyRotation4D(
        point,
        rotation4D
      );

    /*
     * Orthographically project 4D -> 3D only after the 4D
     * rotation. The hidden W direction therefore becomes
     * visible whenever it is rotated into X, Y, or Z.
     */
    const rotated3D =
      applyRotation(
        {
          x: rotated4D.x,
          y: rotated4D.y,
          z: rotated4D.z,
        },
        view.rotation
      );

    return {
      x:
        ROOT_PLANE_AXIS_TARGET.x +
        rotated3D.x *
        view.zoom,

      y:
        ROOT_PLANE_AXIS_TARGET.y -
        rotated3D.y *
        view.zoom,

      depth:
        rotated3D.z,
    };
  }


  function project4D(
    point
  ) {
    const projected =
      project4DWithDepth(
        point
      );

    return {
      x: projected.x,
      y: projected.y,
    };
  }


  /*
   * The SAME analytic-continuation trajectory can be viewed
   * in two different 3D embeddings:
   *
   * Strands:
   *   Z = continuation time
   *
   * Sheets:
   *   Z = Re(a)
   *
   * In Sheets mode this puts every strand sample directly
   * into the same coordinate system as its sheet surface.
   */
  function trajectoryWorldPoint(
    frame,
    index,
    rootIndex
  ) {
    if (
      displayMode ===
      'sheets'
    ) {
      return sheetWorldPoint(
        frame.a,
        frame.roots[
          rootIndex
        ]
      );
    }

    return worldPoint(
      frame.roots[
        rootIndex
      ],
      index
    );
  }


  function projectTrajectoryPoint(
    frame,
    index,
    rootIndex
  ) {
    if (
      dimensionMode === '4D'
    ) {
      return project4D(
        sheetWorldPoint4D(
          frame.a,
          frame.roots[
            rootIndex
          ]
        )
      );
    }

    return project(
      trajectoryWorldPoint(
        frame,
        index,
        rootIndex
      )
    );
  }


  /*
   * Painter-sort the visible sheet faces.
   *
   * 3D keeps the existing cut-chart rendering.
   * 4D adds the locally matched cut faces back in, so the
   * actual branched surface is sewn rather than displayed as
   * four cut charts.
   */
  const sheetsVisible =
    dimensionMode === '4D' ||
    displayMode === 'sheets';

  const fourDFaces =
    dimensionMode === '4D' &&
    sheetMesh
      ? [
          ...sheetMesh.cells.map(
            cell => ({
              rootIndex:
                cell.rootIndex,

              points:
                cell.vertices.map(
                  vertex => ({
                    a:
                      vertex.a,

                    root:
                      vertex.roots[
                        cell.rootIndex
                      ],
                  })
                ),
            })
          ),

          ...sheetMesh.cutFaces,
          ...sheetMesh.branchFaces,
        ]
      : [];


  const sheetPolygons =
    sheetsVisible &&
    sheetMesh
      ? (
          dimensionMode === '4D'
            ? fourDFaces.map(
                (
                  face,
                  faceIndex
                ) => {
                  const projected =
                    face.points.map(
                      point =>
                        project4DWithDepth(
                          sheetWorldPoint4D(
                            point.a,
                            point.root
                          )
                        )
                    );

                  /*
                   * Directional lighting in the projected 3D
                   * space.
                   *
                   * The light comes from above-left and toward
                   * the viewer. Because this is a two-sided
                   * mathematical surface, use |n dot L| so a
                   * reversed face winding does not become
                   * artificially black.
                   */
                  let lightFactor =
                    1;

                  if (
                    projected.length >= 3
                  ) {
                    const first =
                      projected[0];

                    const second =
                      projected[1];

                    const third =
                      projected[2];

                    const ux =
                      second.x -
                      first.x;

                    const uy =
                      second.y -
                      first.y;

                    const uz =
                      second.depth -
                      first.depth;

                    const vx =
                      third.x -
                      first.x;

                    const vy =
                      third.y -
                      first.y;

                    const vz =
                      third.depth -
                      first.depth;

                    let nx =
                      uy * vz -
                      uz * vy;

                    let ny =
                      uz * vx -
                      ux * vz;

                    let nz =
                      ux * vy -
                      uy * vx;

                    const normalLength =
                      Math.hypot(
                        nx,
                        ny,
                        nz
                      );

                    if (
                      normalLength >
                      1e-9
                    ) {
                      nx /=
                        normalLength;

                      ny /=
                        normalLength;

                      nz /=
                        normalLength;

                      const lx =
                        -0.42;

                      const ly =
                        -0.48;

                      const lz =
                        0.76;

                      const lightLength =
                        Math.hypot(
                          lx,
                          ly,
                          lz
                        );

                      const diffuse =
                        Math.abs(
                          nx *
                            lx /
                            lightLength +
                          ny *
                            ly /
                            lightLength +
                          nz *
                            lz /
                            lightLength
                        );

                      /*
                       * Ambient + directional component.
                       *
                       * 0.48 keeps shadowed faces readable.
                       * 1.08 gives slightly brighter faces on
                       * the lit side.
                       */
                      lightFactor =
                        0.48 +
                        0.60 *
                        diffuse;
                    }
                  }

                  return {
                    key:
                      `sheet4d-${face.rootIndex}-${faceIndex}`,

                    rootIndex:
                      face.rootIndex,

                    colorSplit:
                      face.colorSplit ??
                      null,

                    lightFactor,

                    projectedPoints:
                      projected,

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
            : [
                /*
                 * Ordinary chart faces.
                 */
                ...sheetMesh.cells.map(
                  (
                    cell,
                    cellIndex
                  ) => {
                    const projected =
                      cell.vertices.map(
                        vertex => {
                          const world =
                            sheetWorldPoint(
                              vertex.a,

                              vertex.roots[
                                cell.rootIndex
                              ]
                            );

                          const rotated =
                            applyRotation(
                              world,
                              view.rotation
                            );

                          return {
                            x:
                              ROOT_PLANE_AXIS_TARGET.x +
                              rotated.x *
                                view.zoom,

                            y:
                              ROOT_PLANE_AXIS_TARGET.y -
                              rotated.y *
                                view.zoom,

                            depth:
                              rotated.z,
                          };
                        }
                      );

                    return {
                      key:
                        `sheet-${cell.rootIndex}-${cellIndex}`,

                      rootIndex:
                        cell.rootIndex,

                      lightFactor:
                        projectedFaceLightFactor(
                          projected
                        ),

                      projectedPoints:
                        projected,

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
                ),

                /*
                 * Faces crossing the artificial branch cuts.
                 *
                 * These were already computed by the mesh builder;
                 * adding them here sews the 3D branched surface
                 * back together instead of leaving blank chart gaps.
                 */
                ...[
                  ...sheetMesh.cutFaces,
                  ...sheetMesh.branchFaces,
                ].map(
                  (
                    face,
                    faceIndex
                  ) => {
                    const projected =
                      face.points.map(
                        point => {
                          const world =
                            sheetWorldPoint(
                              point.a,
                              point.root
                            );

                          const rotated =
                            applyRotation(
                              world,
                              view.rotation
                            );

                          return {
                            x:
                              ROOT_PLANE_AXIS_TARGET.x +
                              rotated.x *
                                view.zoom,

                            y:
                              ROOT_PLANE_AXIS_TARGET.y -
                              rotated.y *
                                view.zoom,

                            depth:
                              rotated.z,
                          };
                        }
                      );

                    return {
                      key:
                        `sheet-cut-${face.rootIndex}-${faceIndex}`,

                      rootIndex:
                        face.rootIndex,

                      colorSplit:
                        face.colorSplit ??
                        null,

                      lightFactor:
                        projectedFaceLightFactor(
                          projected
                        ),

                      projectedPoints:
                        projected,

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
                ),
              ]
        )
          .sort(
            (
              left,
              right
            ) =>
              left.depth -
              right.depth
          )
      : [];


  const renderedSheetPolygons =
    [...sheetPolygons].sort(
      (
        left,
        right
      ) =>
        left.depth -
        right.depth
    );


  /*
   * Determine the actual local-chart identification across
   * each open cut by analytically transporting the roots
   * directly across that nonsingular grid edge, then matching
   * the transported identities to the chart on the far side.
   *
   * Keep only nontrivial identifications: these are the two
   * sheet identities exchanged by the branch cut. Sampling
   * every second grid crossing keeps the overlay readable.
   */
  const gluePairData =
    useMemo(
      () => {
        if (
          dimensionMode !== '3D' ||
          displayMode !== 'sheets' ||
          !showGluePairs ||
          !sheetMesh
        ) {
          return [];
        }

        return sheetMesh.cutEdges
          .filter(
            (
              _,
              edgeIndex
            ) =>
              edgeIndex % 2 === 0
          )
          .flatMap(
            (
              edge,
              edgeIndex
            ) => {
              const transported =
                transportRootsAlongSegment({
                  fromA:
                    edge.first.a,

                  roots:
                    edge.first.roots,

                  toA:
                    edge.second.a,

                  maxParameterStep:
                    0.02,
                });

              const permutation =
                bestRootPermutation(
                  transported.roots,
                  edge.second.roots
                );

              return edge.first.roots
                .map(
                  (
                    firstRoot,
                    sourceIndex
                  ) => {
                    const targetIndex =
                      permutation[
                        sourceIndex
                      ];

                    if (
                      targetIndex ===
                      sourceIndex
                    ) {
                      return null;
                    }

                    return {
                      key:
                        `glue-${edgeIndex}-${sourceIndex}-${targetIndex}`,

                      sourceIndex,
                      targetIndex,

                      firstA:
                        edge.first.a,

                      firstRoot,

                      secondA:
                        edge.second.a,

                      secondRoot:
                        edge.second.roots[
                          targetIndex
                        ],
                    };
                  }
                )
                .filter(Boolean);
            }
          );
      },
      [
        dimensionMode,
        displayMode,
        showGluePairs,
        sheetMesh,
      ]
    );


  const glueSegments =
    gluePairData.map(
      pair => ({
        ...pair,

        first:
          project(
            sheetWorldPoint(
              pair.firstA,
              pair.firstRoot
            )
          ),

        second:
          project(
            sheetWorldPoint(
              pair.secondA,
              pair.secondRoot
            )
          ),
      })
    );


  /*
   * Coordinate axes.
   *
   * 3D:
   *   X = Re(root), Y = Im(root), Z = time or Re(a)
   *
   * 4D:
   *   X = Re(root), Y = Im(root), Z = Re(a), W = Im(a)
   */
  const rootAxisLength =
    SVG_WIDTH;

  /*
   * Trace history terminates at the current-root XY plane.
   */
  const strandTimeStart =
    -timeDepth;

  const strandTimeEnd =
    0;

  const sheetParameterHalf =
    sheetParameterDepth;


  function project4DAxis(
    first,
    second
  ) {
    return {
      first:
        project4D(first),

      second:
        project4D(second),
    };
  }


  /*
   * Extend a projected axis line to the visible SVG frame.
   *
   * The model-space axis direction is preserved exactly;
   * only its visible screen-space endpoints are extended.
   */
  function extendProjectedAxisToViewport(
    axis
  ) {
    if (
      !axis ||
      !axis.first ||
      !axis.second
    ) {
      return axis;
    }

    const dx =
      axis.second.x -
      axis.first.x;

    const dy =
      axis.second.y -
      axis.first.y;

    const epsilon =
      1e-9;

    if (
      Math.abs(dx) <
        epsilon &&
      Math.abs(dy) <
        epsilon
    ) {
      return axis;
    }

    const hits =
      [];

    function addHit(
      t,
      x,
      y
    ) {
      if (
        x >= -epsilon &&
        x <=
          SVG_WIDTH +
            epsilon &&
        y >= -epsilon &&
        y <=
          SVG_HEIGHT +
            epsilon
      ) {
        hits.push({
          t,

          x:
            Math.max(
              0,
              Math.min(
                SVG_WIDTH,
                x
              )
            ),

          y:
            Math.max(
              0,
              Math.min(
                SVG_HEIGHT,
                y
              )
            ),
        });
      }
    }

    if (
      Math.abs(dx) >
      epsilon
    ) {
      const leftT =
        -axis.first.x /
        dx;

      addHit(
        leftT,
        0,
        axis.first.y +
          leftT * dy
      );

      const rightT =
        (
          SVG_WIDTH -
          axis.first.x
        ) /
        dx;

      addHit(
        rightT,
        SVG_WIDTH,
        axis.first.y +
          rightT * dy
      );
    }

    if (
      Math.abs(dy) >
      epsilon
    ) {
      const topT =
        -axis.first.y /
        dy;

      addHit(
        topT,
        axis.first.x +
          topT * dx,
        0
      );

      const bottomT =
        (
          SVG_HEIGHT -
          axis.first.y
        ) /
        dy;

      addHit(
        bottomT,
        axis.first.x +
          bottomT * dx,
        SVG_HEIGHT
      );
    }

    if (
      hits.length < 2
    ) {
      return axis;
    }

    hits.sort(
      (
        first,
        second
      ) =>
        first.t -
        second.t
    );

    const first =
      hits[0];

    const second =
      hits[
        hits.length - 1
      ];

    return {
      first: {
        x: first.x,
        y: first.y,
      },

      second: {
        x: second.x,
        y: second.y,
      },
    };
  }


  const reAxis =
    dimensionMode === '4D'
      ? project4DAxis(
          {
            x: -rootAxisLength,
            y: 0,
            z: 0,
            w: 0,
          },
          {
            x: rootAxisLength,
            y: 0,
            z: 0,
            w: 0,
          }
        )
      : projectAxis(
          {
            x: -rootAxisLength,
            y: 0,
            z: 0,
          },
          {
            x: rootAxisLength,
            y: 0,
            z: 0,
          }
        );


  const imAxis =
    dimensionMode === '4D'
      ? project4DAxis(
          {
            x: 0,
            y: -rootAxisLength,
            z: 0,
            w: 0,
          },
          {
            x: 0,
            y: rootAxisLength,
            z: 0,
            w: 0,
          }
        )
      : projectAxis(
          {
            x: 0,
            y: -rootAxisLength,
            z: 0,
          },
          {
            x: 0,
            y: rootAxisLength,
            z: 0,
          }
        );


  const rawTimeAxis =
    dimensionMode === '4D'
      ? project4DAxis(
          {
            x: 0,
            y: 0,
            z: -sheetParameterHalf,
            w: 0,
          },
          {
            x: 0,
            y: 0,
            z: sheetParameterHalf,
            w: 0,
          }
        )
      : displayMode === 'sheets'
        ? projectAxis(
            {
              x: 0,
              y: 0,
              z: -sheetParameterHalf,
            },
            {
              x: 0,
              y: 0,
              z: sheetParameterHalf,
            }
          )
        : projectAxis(
            {
              x: 0,
              y: 0,
              z: strandTimeStart,
            },
            {
              x: 0,
              y: 0,
              z: strandTimeEnd,
            }
          );


  const timeAxis =
    extendProjectedAxisToViewport(
      rawTimeAxis
    );


  const rawFourthAxis =
    dimensionMode === '4D'
      ? project4DAxis(
          {
            x: 0,
            y: 0,
            z: 0,
            w: -sheetParameterHalf,
          },
          {
            x: 0,
            y: 0,
            z: 0,
            w: sheetParameterHalf,
          }
        )
      : null;


  const fourthAxis =
    rawFourthAxis
      ? extendProjectedAxisToViewport(
          rawFourthAxis
        )
      : null;


  const visibleFrames =
    allFrames.slice(
      0,
      safeFrameIndex + 1
    );

  const currentRoots =
    allFrames[
      safeFrameIndex
    ].roots;


  return (
    <svg
      viewBox="0 0 700 470"
      className={styles.plot}
      aria-label={
        dimensionMode === '4D'
          ? 'Interactive 4D root-monodromy branched-cover viewer'
          : dimensionMode === '2D'
            ? '2D filled root-monodromy sheet viewer'
            : 'Interactive 3D root-monodromy braid viewer'
      }
      onPointerDown={beginRotate}
      onPointerMove={moveRotate}
      onPointerUp={endRotate}
      onPointerCancel={endRotate}
      onLostPointerCapture={endRotate}
      onWheel={handleWheel}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onBlur={handleBlur}
      tabIndex={
        active && interactionEnabled
          ? 0
          : -1
      }
      style={{
        display:
          active
            ? 'block'
            : 'none',

        overflow:
          'visible',

        cursor:
          interactionEnabled
            ? (
                isDragging
                  ? 'grabbing'
                  : 'grab'
              )
            : 'default',

        touchAction:
          'none',

        userSelect:
          'none',

        outline:
          'none',
      }}
    >
      <title>
        {
          dimensionMode === '4D'
            ? 'Drag to rotate the 3D projection. Use the pole sliders to change the 4D projection. Scroll to zoom.'
            : dimensionMode === '2D'
              ? 'Filled 2D projection of the branched root surface.'
              : 'Drag to rotate in 3D. Scroll to zoom.'
        }
      </title>

      <line
        x1={reAxis.first.x}
        y1={reAxis.first.y}
        x2={reAxis.second.x}
        y2={reAxis.second.y}
        className={
          styles.rootPlaneAxis
        }
      />

      <line
        x1={imAxis.first.x}
        y1={imAxis.first.y}
        x2={imAxis.second.x}
        y2={imAxis.second.y}
        className={
          styles.rootPlaneAxis
        }
      />

      <line
        x1={timeAxis.first.x}
        y1={timeAxis.first.y}
        x2={timeAxis.second.x}
        y2={timeAxis.second.y}
        className={
          styles.rootPlaneAxis
        }
      />

      {fourthAxis && (
        <line
          x1={fourthAxis.first.x}
          y1={fourthAxis.first.y}
          x2={fourthAxis.second.x}
          y2={fourthAxis.second.y}
          className={
            styles.rootPlaneAxis
          }
        />
      )}

      {sheetsVisible &&
        renderedSheetPolygons.map(
          polygon => (
            <g
              key={
                polygon.key
              }
            >
              {(() => {
                return projectedColorPieces(
                  polygon
                ).flatMap(
                  (
                    piece,
                    pieceIndex
                  ) =>
                    triangulateProjectedFace(
                      piece.points
                    ).map(
                      (
                        triangle,
                        triangleIndex
                      ) => (
                        <polygon
                          key={
                            `${polygon.key}-piece-${pieceIndex}-triangle-${triangleIndex}`
                          }
                          points={
                            triangle
                              .map(
                                point =>
                                  `${point.x},${point.y}`
                              )
                              .join(' ')
                          }
                          style={{
                            fill:
                              rootColors[
                                piece.rootIndex
                              ],

                            fillOpacity:
                              1,

                            stroke:
                              'none',

                            filter:
                              `brightness(${projectedFaceLightFactor(triangle)})`,

                            pointerEvents:
                              'none',
                          }}
                        />
                      )
                    )
                );
              })()}

              {(() => {
                const seam =
                  projectedColorSeam(
                    polygon
                  );

                return seam
                  ? (
                      <line
                        x1={seam[0].x}
                        y1={seam[0].y}
                        x2={seam[1].x}
                        y2={seam[1].y}
                        style={{
                          stroke:
                            'rgba(0, 0, 0, 0.92)',

                          strokeOpacity:
                            1,

                          strokeWidth:
                            0.42,

                          vectorEffect:
                            'non-scaling-stroke',

                          pointerEvents:
                            'none',
                        }}
                      />
                    )
                  : null;
              })()}

              {/*
               * Preserve the existing visible mesh grid by
               * drawing the original face boundary exactly once.
               */}
              <polygon
                points={
                  polygon.points
                }
                style={{
                  fill:
                    'none',

                  stroke:
                    'rgba(0, 0, 0, 0.92)',

                  strokeOpacity:
                    1,

                  strokeWidth:
                    0.42,

                  vectorEffect:
                    'non-scaling-stroke',

                  pointerEvents:
                    'none',
                }}
              />
            </g>
          )
        )}


      {dimensionMode === '3D' &&
        displayMode === 'sheets' &&
        showGluePairs &&
        glueSegments.map(
          segment => (
            <g
              key={
                segment.key
              }
            >
              <line
                x1={segment.first.x}
                y1={segment.first.y}
                x2={segment.second.x}
                y2={segment.second.y}
                style={{
                  stroke:
                    'rgba(250, 247, 238, 0.82)',

                  strokeWidth:
                    1.25,

                  strokeDasharray:
                    '4 4',

                  vectorEffect:
                    'non-scaling-stroke',

                  pointerEvents:
                    'none',
                }}
              />

              <circle
                cx={segment.first.x}
                cy={segment.first.y}
                r="2.4"
                style={{
                  fill:
                    rootColors[
                      segment.sourceIndex
                    ],

                  stroke:
                    'rgba(250, 247, 238, 0.72)',

                  strokeWidth:
                    0.6,

                  pointerEvents:
                    'none',
                }}
              />

              <circle
                cx={segment.second.x}
                cy={segment.second.y}
                r="2.4"
                style={{
                  fill:
                    rootColors[
                      segment.targetIndex
                    ],

                  stroke:
                    'rgba(250, 247, 238, 0.72)',

                  strokeWidth:
                    0.6,

                  pointerEvents:
                    'none',
                }}
              />
            </g>
          )
        )}


      {rootColors.map(
        (
          color,
          rootIndex
        ) => {
          const points =
            visibleFrames
              .map(
                (
                  frame,
                  index
                ) =>
                  projectTrajectoryPoint(
                    frame,
                    index,
                    rootIndex
                  )
              )
              .map(
                point =>
                  `${point.x},${point.y}`
              )
              .join(' ');

          if (
            visibleFrames.length <
            2
          ) {
            return null;
          }

          return (
            <polyline
              key={
                `braid-trail-${rootIndex}`
              }
              points={points}
              className={
                styles.rootTrail
              }
              style={{
                stroke:
                  color,

                /*
                 * Make the analytic-continuation path slightly
                 * more legible above the translucent sheet mesh.
                 */
                strokeWidth:
                  sheetsVisible
                    ? 2.2
                    : undefined,

                opacity:
                  sheetsVisible
                    ? 1
                    : undefined,

                pointerEvents:
                  'none',
              }}
            />
          );
        }
      )}


      {showRootDots &&
        currentRoots.map(
          (
            root,
            rootIndex
          ) => {
          const currentFrame =
            allFrames[
              safeFrameIndex
            ];

          const mapped =
            projectTrajectoryPoint(
              currentFrame,
              safeFrameIndex,
              rootIndex
            );

          return (
            <circle
              key={
                `braid-root-${rootIndex}`
              }
              cx={mapped.x}
              cy={mapped.y}
              r="3.5"
              style={{
                fill:
                  rootColors[
                    rootIndex
                  ],

                pointerEvents:
                  'none',
              }}
            />
          );
        }
      )}
    </svg>
  );
}
