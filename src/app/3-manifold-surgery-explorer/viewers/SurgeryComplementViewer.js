"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { createPortal } from "react-dom";

import SurgeryProjectionViewer
  from "./SurgeryProjectionViewer";

import projectionStyles
  from "./SurgeryProjectionViewer.module.css";

import TruncatedTetrahedraViewer, {
  DEFAULT_TRUNCATION_FRACTION,
  FIGURE_EIGHT_FACE_PAIRS,
  MANIFOLD_SPECS,
  MAX_TRUNCATION_FRACTION,
  MIN_TRUNCATION_FRACTION,
  cuspMaterialLayoutForManifold,
} from "../../figure-eight-complement/TruncatedTetrahedraViewer";

import {
  MANIFOLD_STATES,
  SURGERY_EDGES,
} from "../state/manifoldStates";

import M129_CUSP_TRIANGLES
  from "../data/generated/m129_cusp_triangles.json";

import M129_CUSP_CONNECTIVITY
  from "../data/generated/m129_cusp_connectivity.json";

import M129_ANIMATION_MANIFEST
  from "../data/generated/m129_animation_manifest.json";

import M129_TO_M004_SURGERY_EDGE
  from "../data/generated/m129_to_m004_surgery_edge.json";

import {
  M129_BOUNDARY_RHO,
  m129BoundaryPoint4,
} from "../geometry/m129BoundarySpec";


import {
  rotateS3MixedPlanes,
  stereographicS3Point,
} from "../geometry/s3BoundaryGeometry";

import {
  DEFAULT_FIGURE_EIGHT_CUSP_COORDINATE_SPEC,
  FIGURE_EIGHT_CUSP_HEIGHT,
  buildFigureEightS3Tube,
  cuspTubeCoordinates,
  sampleFigureEightS3TubePoint4,
} from "../../figure-eight-complement/figureEightS3Geometry";

import styles from "./SurgeryComplementViewer.module.css";


const M129_TO_M004_SOURCE_ID =
  M129_TO_M004_SURGERY_EDGE
    .direction
    .source;


const M129_TO_M004_TARGET_ID =
  M129_TO_M004_SURGERY_EDGE
    .direction
    .target;


const M129_TO_M004_OPERATION =
  M129_TO_M004_SURGERY_EDGE
    .operation;


const M129_TO_M004_SOURCE_CUSP_COUNT =
  Number(
    M129_TO_M004_SURGERY_EDGE
      .source
      .cusp_count
  );


const M129_TO_M004_TARGET_CUSP_COUNT =
  Number(
    M129_TO_M004_SURGERY_EDGE
      .target
      .cusp_count
  );


const M129_TO_M004_FILLING =
  M129_TO_M004_SURGERY_EDGE
    .filling;


const M129_TO_M004_FILLED_CUSP =
  Number(
    M129_TO_M004_FILLING
      .filled_cusp
  );


const M129_TO_M004_SURVIVING_CUSP =
  Number(
    M129_TO_M004_FILLING
      .surviving_cusp
  );


const [
  M129_TO_M004_VIEWER_SLOPE_P,
  M129_TO_M004_VIEWER_SLOPE_Q,
] =
  M129_TO_M004_FILLING
    .viewer_basis
    .slope
    .map(Number);


if (
  M129_TO_M004_OPERATION !==
    "dehn_fill" ||
  M129_TO_M004_SOURCE_CUSP_COUNT !==
    2 ||
  M129_TO_M004_TARGET_CUSP_COUNT !==
    1
) {
  throw new Error(
    "Invalid certified m129 -> m004 surgery-edge manifest."
  );
}


function m129SlopeMatchesCertifiedEdge(
  p,
  q
) {
  const pInt =
    Math.trunc(
      Number(p)
    );

  const qInt =
    Math.trunc(
      Number(q)
    );

  return (
    (
      pInt ===
        M129_TO_M004_VIEWER_SLOPE_P &&
      qInt ===
        M129_TO_M004_VIEWER_SLOPE_Q
    ) ||
    (
      pInt ===
        -M129_TO_M004_VIEWER_SLOPE_P &&
      qInt ===
        -M129_TO_M004_VIEWER_SLOPE_Q
    )
  );
}

const SISTER_VIEW_STATE = Object.freeze({
  id: "m003",

  displayName:
    "Figure-eight sister manifold",

  cuspCount: 1,

  cusps: Object.freeze([
    Object.freeze({
      id: "sister-cusp",
      label: "Cusp 1",
      role: "knot",
    }),
  ]),
});


/*
 * Surgery Explorer complexity roadmap.
 *
 * "Level" is our UI organization:
 *
 *   Level 1 = 2 ideal tetrahedra
 *   Level 2 = 3 ideal tetrahedra
 *
 * The Level-1 and Level-2 membership below was certified
 * directly from SnapPy's OrientableCuspedCensus.
 *
 * An entry becomes selectable only when its renderer/state
 * has actually been implemented. No placeholder geometry.
 */
const MANIFOLD_LEVELS = Object.freeze([
  Object.freeze({
    level: 1,
    tetrahedra: 2,

    options: Object.freeze([
      Object.freeze({
        id: "m003",
        label:
          "Figure-eight sister manifold · m003",
        implemented: true,
      }),

      Object.freeze({
        id: "m004",
        label:
          "Figure-eight knot complement · m004",
        implemented: true,
      }),
    ]),
  }),

  Object.freeze({
    level: 2,
    tetrahedra: 3,

    options: Object.freeze([
      Object.freeze({
        id: "m006",
        label: "m006",
        implemented: false,
      }),

      Object.freeze({
        id: "m007",
        label: "m007",
        implemented: false,
      }),

      Object.freeze({
        id: "m009",
        label: "m009",
        implemented: false,
      }),

      Object.freeze({
        id: "m010",
        label: "m010",
        implemented: false,
      }),

      Object.freeze({
        id: "m011",
        label: "m011",
        implemented: false,
      }),

      Object.freeze({
        id: "m015",
        label:
          "5₂ knot complement · m015",
        implemented: false,
      }),

      Object.freeze({
        id: "m016",
        label: "m016",
        implemented: false,
      }),

      Object.freeze({
        id: "m017",
        label: "m017",
        implemented: false,
      }),

      Object.freeze({
        id: "m019",
        label: "m019",
        implemented: false,
      }),
    ]),
  }),
]);


const SURGERY_MANIFOLD_OPTIONS =
  Object.freeze([
    Object.freeze({
      id: "m129",
      label:
        "Whitehead link complement · m129",
      implemented: true,
    }),
  ]);


const CELLS_VIEW = Object.freeze({
  rotation: Object.freeze([
    -1, 0, 0,
     0, 1, 0,
     0, 0, -1,
  ]),

  /*
   * Explicit Cells endpoint scale.
   *
   * This is intentionally manual. The Cusp <-> Cells flight
   * reads the real rendered triangle positions, so changing
   * this one number changes both the animation destination
   * and the final Cells scene together.
   */
  zoom: 1.00,
});


/*
 * Authoritative display labels from the established
 * Figure-eight / Sister Cells controller.
 *
 * DISPLAY ONLY: these labels do not alter topology.
 */
const FACE_DISPLAY_VERTEX_TRIPLES =
  Object.freeze({
    m004: Object.freeze({
      A: Object.freeze({
        Yellow: "123",
        Blue: "124",
        Green: "134",
        Red: "234",
      }),

      B: Object.freeze({
        Yellow: "321",
        Blue: "214",
        Green: "314",
        Red: "432",
      }),
    }),

    m003: Object.freeze({
      A: Object.freeze({
        Yellow: "123",
        Blue: "124",
        Green: "134",
        Red: "234",
      }),

      B: Object.freeze({
        Yellow: "132",
        Green: "413",
        Blue: "314",
        Red: "432",
      }),
    }),
  });


function faceColorName(color) {
  switch (
    String(color ?? "").toLowerCase()
  ) {
    case "#ffe600":
      return "Yellow";

    case "#4da3ff":
      return "Blue";

    case "#159447":
      return "Green";

    case "#ff2020":
      return "Red";

    default:
      return "Face";
  }
}


function faceDisplayVertexTriple(
  manifoldId,
  color,
  tetrahedronId
) {
  const colorName =
    faceColorName(color);

  return (
    FACE_DISPLAY_VERTEX_TRIPLES[
      manifoldId
    ]?.[
      tetrahedronId
    ]?.[
      colorName
    ] ?? ""
  );
}


function colorWithAlpha(
  color,
  alpha
) {
  const match =
    /^#([0-9a-f]{6})$/i.exec(
      String(color ?? "")
    );

  if (!match) {
    return color;
  }

  const value =
    Number.parseInt(
      match[1],
      16
    );

  const red =
    (value >> 16) & 255;

  const green =
    (value >> 8) & 255;

  const blue =
    value & 255;

  return (
    `rgba(${red}, ${green}, ${blue}, ${alpha})`
  );
}


const DRAG_ROTATION_SPEED = 0.006;
const MIN_CELLS_ZOOM = 0.045;
const MAX_CELLS_ZOOM = 1.9;

const AUTO_ROTATION_HALF_TURN_MS = 10000;
const ROTATION_SINGLE_CLICK_DELAY_MS = 280;

/*
 * Match the established Figure-eight Cusp <-> Boundary
 * animation architecture.
 */
const M129_CUSP_BOUNDARY_MORPH_DURATION_MS =
  4000;

const M129_FILL_DURATION_MS =
  20000;

const M129_FILL_FADE_END =
  4000 /
  M129_FILL_DURATION_MS;

const M129_FILL_GROWTH_END =
  10000 /
  M129_FILL_DURATION_MS;

/*
 * Filling torus is now fully grown and held still while the
 * selected slope marking is drawn onto its boundary.
 */
const M129_FILL_SLOPE_END =
  12000 /
  M129_FILL_DURATION_MS;

/*
 * End of the gluing-map / winding phase.
 *
 * The incoming torus stays at 86% radius while its meridian is
 * carried completely onto the selected Dehn-filling slope.
 *
 * Only AFTER this has finished do we grow the solid torus the
 * remaining 14% to the receiving boundary.
 */
const M129_FILL_ALIGNMENT_END =
  18000 /
  M129_FILL_DURATION_MS;


const ONE_CUSP_PUBLICATION_STATE =
  Object.freeze({
    projection: Object.freeze({
      xw: 94,
      yw: 174.5,
      zw: 183.5,
    }),

    geometry: Object.freeze({
      lambda: 0.14,
      epsilon: 0.21,
      rho: 0.21,
    }),

    view: Object.freeze({
      yaw: -7.210173034667967,
      pitch: -0.07949435313674402,
      zoom: 1.2163253676551196,
    }),

    mesh: Object.freeze({
      level: 6,
      nu: 288,
      nv: 64,
    }),
  });


const ONE_CUSP_PUBLICATION_TUBE =
  buildFigureEightS3Tube(
    ONE_CUSP_PUBLICATION_STATE
      .mesh.nu,
    ONE_CUSP_PUBLICATION_STATE
      .mesh.nv,
    ONE_CUSP_PUBLICATION_STATE
      .geometry
  );


/*
 * ==============================================================
 * NATIVE m004 MATERIAL TARGET
 * ==============================================================
 *
 * These are the SAME eight logical cusp triangles used by the
 * native figure-eight Boundary renderer.
 *
 * They are NOT rendering triangles.
 *
 * Their colors are tetrahedral material identities:
 *
 * Material identity is derived from FIGURE_EIGHT_FACE_PAIRS,
 * exactly as in SurgeryProjectionViewer.
 *
 * For the current certified m004 A/B pairing:
 *
 *   A0 = Red       B0 = Blue
 *   A1 = Green     B1 = Red
 *   A2 = Blue      B2 = Yellow
 *   A3 = Yellow    B3 = Green
 *
 * The A/B distinction matters because the B tetrahedron carries
 * a nontrivial vertex permutation in the face identifications.
 *
 * During the final m129 -> m004 surgery handoff these triangle
 * boundaries themselves will move across T² until they equal this
 * exact partition.
 */
function m004NativeCuspTriangleColor(
  triangleId
) {
  const tetrahedronId =
    triangleId[0];

  const vertexIndex =
    Number(
      triangleId.slice(1)
    );

  /*
   * Exact same rule used by SurgeryProjectionViewer:
   *
   * the cusp triangle at ideal vertex i inherits the color
   * of the tetrahedral face opposite i.
   *
   * A and B do NOT have the same slot permutation.
   */
  const pair =
    FIGURE_EIGHT_FACE_PAIRS.find(
      (candidate) =>
        Array.isArray(
          candidate[
            tetrahedronId
          ]
        ) &&
        !candidate[
          tetrahedronId
        ].includes(
          vertexIndex
        )
    );

  if (!pair) {
    return "#d9d1bd";
  }

  return (
    tetrahedronId === "B"
      ? pair.BColor ??
        pair.color
      : pair.AColor ??
        pair.color
  );
}


const M004_CUSP_MATERIAL_TARGET =
  Object.freeze([
    Object.freeze({
      id: "A0",
      color:
        m004NativeCuspTriangleColor("A0"),
      corners: Object.freeze([
        Object.freeze({
          x: 0,
          y: 0,
        }),
        Object.freeze({
          x: 1,
          y: 0,
        }),
        Object.freeze({
          x: 0.5,
          y:
            FIGURE_EIGHT_CUSP_HEIGHT,
        }),
      ]),
    }),

    Object.freeze({
      id: "B0",
      color:
        m004NativeCuspTriangleColor("B0"),
      corners: Object.freeze([
        Object.freeze({
          x: 0,
          y: 0,
        }),
        Object.freeze({
          x: 1,
          y: 0,
        }),
        Object.freeze({
          x: 0.5,
          y:
            -FIGURE_EIGHT_CUSP_HEIGHT,
        }),
      ]),
    }),

    Object.freeze({
      id: "B3",
      color:
        m004NativeCuspTriangleColor("B3"),
      corners: Object.freeze([
        Object.freeze({
          x: 0,
          y: 0,
        }),
        Object.freeze({
          x: 0.5,
          y:
            FIGURE_EIGHT_CUSP_HEIGHT,
        }),
        Object.freeze({
          x: -0.5,
          y:
            FIGURE_EIGHT_CUSP_HEIGHT,
        }),
      ]),
    }),

    Object.freeze({
      id: "A3",
      color:
        m004NativeCuspTriangleColor("A3"),
      corners: Object.freeze([
        Object.freeze({
          x: 0.5,
          y:
            -FIGURE_EIGHT_CUSP_HEIGHT,
        }),
        Object.freeze({
          x: 1,
          y: 0,
        }),
        Object.freeze({
          x: 1.5,
          y:
            -FIGURE_EIGHT_CUSP_HEIGHT,
        }),
      ]),
    }),

    Object.freeze({
      id: "A2",
      color:
        m004NativeCuspTriangleColor("A2"),
      corners: Object.freeze([
        Object.freeze({
          x: -0.5,
          y:
            FIGURE_EIGHT_CUSP_HEIGHT,
        }),
        Object.freeze({
          x: 0.5,
          y:
            FIGURE_EIGHT_CUSP_HEIGHT,
        }),
        Object.freeze({
          x: 0,
          y:
            2 *
            FIGURE_EIGHT_CUSP_HEIGHT,
        }),
      ]),
    }),

    Object.freeze({
      id: "B1",
      color:
        m004NativeCuspTriangleColor("B1"),
      corners: Object.freeze([
        Object.freeze({
          x: 1.5,
          y:
            -FIGURE_EIGHT_CUSP_HEIGHT,
        }),
        Object.freeze({
          x: 0.5,
          y:
            -FIGURE_EIGHT_CUSP_HEIGHT,
        }),
        Object.freeze({
          x: 1,
          y:
            -2 *
            FIGURE_EIGHT_CUSP_HEIGHT,
        }),
      ]),
    }),

    Object.freeze({
      id: "A1",
      color:
        m004NativeCuspTriangleColor("A1"),
      corners: Object.freeze([
        Object.freeze({
          x: 1,
          y:
            -2 *
            FIGURE_EIGHT_CUSP_HEIGHT,
        }),
        Object.freeze({
          x: 1.5,
          y:
            -FIGURE_EIGHT_CUSP_HEIGHT,
        }),
        Object.freeze({
          x: 2,
          y:
            -2 *
            FIGURE_EIGHT_CUSP_HEIGHT,
        }),
      ]),
    }),

    Object.freeze({
      id: "B2",
      color:
        m004NativeCuspTriangleColor("B2"),
      corners: Object.freeze([
        Object.freeze({
          x: 1,
          y:
            -2 *
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
      ]),
    }),
  ]);


function clamp(value, minimum, maximum) {
  return Math.max(
    minimum,
    Math.min(
      maximum,
      value
    )
  );
}


function greatestCommonDivisor(
  first,
  second
) {
  let a =
    Math.abs(
      Math.trunc(first)
    );

  let b =
    Math.abs(
      Math.trunc(second)
    );

  while (b !== 0) {
    const remainder =
      a % b;

    a = b;
    b = remainder;
  }

  return a;
}


function isPrimitiveSlope(
  p,
  q
) {
  const pInt =
    Math.trunc(p);

  const qInt =
    Math.trunc(q);

  return (
    (
      pInt !== 0 ||
      qInt !== 0
    ) &&
    greatestCommonDivisor(
      pInt,
      qInt
    ) === 1
  );
}


function primitiveSlopeBasis(
  p,
  q
) {
  let pInt =
    Math.trunc(p);

  let qInt =
    Math.trunc(q);

  /*
   * A Dehn-filling slope is unoriented:
   *
   *   (p,q) ~ (-p,-q).
   *
   * Use one canonical orientation for the animation so the two
   * equivalent green lattice points follow the same visual path.
   */
  if (
    pInt < 0 ||
    (
      pInt === 0 &&
      qInt < 0
    )
  ) {
    pInt = -pInt;
    qInt = -qInt;
  }

  if (
    !isPrimitiveSlope(
      pInt,
      qInt
    )
  ) {
    return {
      p: 1,
      q: 0,
      r: 0,
      s: 1,
    };
  }

  /*
   * Extended Euclidean algorithm:
   *
   * find x,y with
   *
   *   p x + q y = 1.
   *
   * Then choose
   *
   *   s = x
   *   r = -y
   *
   * so
   *
   *   p s - q r = 1.
   */
  let oldR =
    Math.abs(pInt);

  let r =
    Math.abs(qInt);

  let oldS = 1;
  let sCoeff = 0;

  let oldT = 0;
  let tCoeff = 1;

  while (r !== 0) {
    const quotient =
      Math.trunc(
        oldR / r
      );

    [
      oldR,
      r,
    ] = [
      r,
      oldR -
        quotient * r,
    ];

    [
      oldS,
      sCoeff,
    ] = [
      sCoeff,
      oldS -
        quotient * sCoeff,
    ];

    [
      oldT,
      tCoeff,
    ] = [
      tCoeff,
      oldT -
        quotient * tCoeff,
    ];
  }

  const x =
    oldS *
    (
      pInt < 0
        ? -1
        : 1
    );

  const y =
    oldT *
    (
      qInt < 0
        ? -1
        : 1
    );

  return {
    p: pInt,
    q: qInt,
    r: -y,
    s: x,
  };
}


function formatSlopeExpression(
  p,
  q
) {
  const pInt =
    Math.trunc(p);

  const qInt =
    Math.trunc(q);

  const terms = [];

  if (pInt !== 0) {
    terms.push(
      pInt === 1
        ? "μ"
        : pInt === -1
          ? "−μ"
          : `${pInt}μ`
    );
  }

  if (qInt !== 0) {
    const magnitude =
      Math.abs(qInt);

    const lambdaTerm =
      magnitude === 1
        ? "λ"
        : `${magnitude}λ`;

    if (terms.length === 0) {
      terms.push(
        qInt < 0
          ? `−${lambdaTerm}`
          : lambdaTerm
      );
    } else {
      terms.push(
        qInt < 0
          ? `− ${lambdaTerm}`
          : `+ ${lambdaTerm}`
      );
    }
  }

  return (
    terms.join(" ") ||
    "0"
  );
}


function rotationX(angle) {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);

  return [
    1, 0, 0,
    0, cosine, -sine,
    0, sine, cosine,
  ];
}


function rotationY(angle) {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);

  return [
    cosine, 0, -sine,
    0, 1, 0,
    sine, 0, cosine,
  ];
}


function multiplyRotations(left, right) {
  const result = new Array(9);

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



/*
 * Standard tetrahedral face palette.
 *
 * This is deliberately the SAME four-color convention used by
 * the existing Figure-eight / Sister tetrahedron renderer.
 *
 * A cusp triangle at ideal vertex v:
 *
 *   interior = color of the face opposite v
 *   edges    = colors of the three incident faces
 *
 * Local tetrahedron vertices are 0,1,2,3.
 */
/*
 * Canonical tetrahedral material palette.
 *
 * This four-color vocabulary is shared by every tetrahedral
 * representation in the Surgery Explorer:
 *
 *   Yellow  #ffe600
 *   Blue    #4da3ff
 *   Green   #159447
 *   Red     #ff2020
 *
 * Never introduce manifold-specific replacement hues for
 * tetrahedral faces or their inherited cusp triangles.
 */
const STANDARD_FACE_COLOR_BY_OPPOSITE_VERTEX =
  Object.freeze({
    0: "#ff2020", // Red
    1: "#159447", // Green
    2: "#4da3ff", // Blue
    3: "#ffe600", // Yellow
  });


function m129FaceMaterialId(
  tetrahedron,
  face
) {
  const material =
    (
      M129_CUSP_TRIANGLES
        .face_pair_materials ??
      []
    ).find(
      (record) =>
        record.faces.some(
          (candidate) =>
            candidate.tetrahedron ===
              tetrahedron &&
            candidate.face ===
              face
        )
    );

  return (
    material?.material_id ??
    null
  );
}


function m129FaceColor(
  tetrahedron,
  face
) {
  const materialId =
    m129FaceMaterialId(
      tetrahedron,
      face
    );

  return (
    materialId === null
      ? "#d9d1bd"
      : m129MaterialColor(
          materialId
        )
  );
}


function m129CuspTriangleFill(
  triangle
) {
  return (
    m129MaterialColor(
      triangle.material_id
    )
  );
}


function m129CuspTriangleEdgeColor(
  triangle,
  firstPoint,
  secondPoint
) {
  const idealVertex =
    triangle.ideal_vertex;

  const firstNeighbor =
    firstPoint
      .edge_vertices
      ?.find(
        (vertex) =>
          vertex !== idealVertex
      );

  const secondNeighbor =
    secondPoint
      .edge_vertices
      ?.find(
        (vertex) =>
          vertex !== idealVertex
      );

  if (
    !Number.isInteger(
      firstNeighbor
    ) ||
    !Number.isInteger(
      secondNeighbor
    )
  ) {
    return "#d9d1bd";
  }

  const face =
    [0, 1, 2, 3].find(
      (vertex) =>
        vertex !== idealVertex &&
        vertex !== firstNeighbor &&
        vertex !== secondNeighbor
    );

  return (
    m129FaceColor(
      triangle.tetrahedron,
      face
    )
  );
}


/*
 * Certified m129 cusp development.
 *
 * The backend has now certified, for each cusp:
 *
 *   8 owned triangles
 *   24 triangle sides
 *   12 exact side-pair classes
 *   8 direct planar gluings
 *   4 peripheral boundary pairings
 *
 * Therefore the original developed coordinates already give
 * one connected eight-triangle fundamental polygon.
 *
 * No arbitrary display-slot adjacency is used here.
 */


const M129_CUSP_IDENTITIES =
  Object.freeze({
    0: Object.freeze({
      index: 0,
      role: "Knot cusp",
      splitColorName: "red",
    }),

    1: Object.freeze({
      index: 1,
      role: "Crossing-circle cusp",
      splitColorName: "blue",
    }),
  });


const M129_RAINBOW_COLORS =
  Object.freeze({
    0: "#d9822b",
    1: "#c93f9f",
    2: "#557fd0",
    3: "#7652c7",
    4: "#31a7c5",
    5: "#d65353",
    6: "#4aa465",
    7: "#bba900",
  });


function m129ConnectivityForCusp(
  cuspIndex
) {
  return (
    M129_CUSP_CONNECTIVITY
      .cusps
      ?.find(
        (record) =>
          record.cusp ===
          cuspIndex
      ) ??
    null
  );
}


function m129MaterialColor(
  materialId
) {
  return (
    M129_CUSP_CONNECTIVITY
      .material_colors
      ?.[
        String(
          materialId
        )
      ]
      ?.hex ??
    "#d9d1bd"
  );
}


const M129_CUSP_DISPLAY_LATTICE_SHIFTS =
  Object.freeze({
    0: Object.freeze({
      t3v0: Object.freeze({
        meridian: -1,
        longitude: 0,
      }),
    }),

    1: Object.freeze({
      t1v2: Object.freeze({
        meridian: 0,
        longitude: 1,
      }),
    }),
  });


function m129CuspTranslationRecord(
  cuspIndex
) {
  return (
    M129_CUSP_TRIANGLES
      .cusp_translations
      ?.find(
        (record) =>
          record.cusp ===
          cuspIndex
      ) ??
    null
  );
}


function m129DisplayLatticeShift(
  cuspIndex,
  triangleId
) {
  const coefficients =
    M129_CUSP_DISPLAY_LATTICE_SHIFTS[
      cuspIndex
    ]?.[
      triangleId
    ] ?? {
      meridian: 0,
      longitude: 0,
    };

  const translations =
    m129CuspTranslationRecord(
      cuspIndex
    );

  if (!translations) {
    return {
      re: 0,
      im: 0,
    };
  }

  return {
    re:
      coefficients.meridian *
        translations.meridian.re +
      coefficients.longitude *
        translations.longitude.re,

    im:
      coefficients.meridian *
        translations.meridian.im +
      coefficients.longitude *
        translations.longitude.im,
  };
}


function m129ShiftedDevelopedPoint(
  cuspIndex,
  triangle,
  point
) {
  const shift =
    m129DisplayLatticeShift(
      cuspIndex,
      triangle.id
    );

  return {
    x:
      point.re +
      shift.re,

    y:
      -(
        point.im +
        shift.im
      ),
  };
}


function m129TriangleCenter(
  points
) {
  return {
    x:
      points.reduce(
        (
          sum,
          point
        ) =>
          sum + point.x,
        0
      ) /
      points.length,

    y:
      points.reduce(
        (
          sum,
          point
        ) =>
          sum + point.y,
        0
      ) /
      points.length,
  };
}


function m129InsetDevelopedTriangle(
  points,
  amount = 0.11
) {
  const center =
    m129TriangleCenter(
      points
    );

  return points.map(
    (point) => ({
      x:
        center.x +
        (
          point.x -
          center.x
        ) *
          (1 - amount),

      y:
        center.y +
        (
          point.y -
          center.y
        ) *
          (1 - amount),
    })
  );
}


function m129SvgPoints(
  points
) {
  return points
    .map(
      (point) =>
        `${point.x},${point.y}`
    )
    .join(" ");
}


function m129DevelopedDisplayGeometry(
  cuspIndex,
  cuspTriangles
) {
  const rawPoints =
    cuspTriangles.flatMap(
      (triangle) =>
        triangle.points.map(
          (point) =>
            m129ShiftedDevelopedPoint(
              cuspIndex,
              triangle,
              point
            )
        )
    );

  if (
    rawPoints.length === 0
  ) {
    return {
      transformPoint:
        () => ({
          x: 205,
          y: 175,
        }),

      boundaryPoints: [],
    };
  }

  const xs =
    rawPoints.map(
      (point) =>
        point.x
    );

  const ys =
    rawPoints.map(
      (point) =>
        point.y
    );

  const minX =
    Math.min(...xs);

  const maxX =
    Math.max(...xs);

  const minY =
    Math.min(...ys);

  const maxY =
    Math.max(...ys);

  const width =
    Math.max(
      1e-9,
      maxX - minX
    );

  const height =
    Math.max(
      1e-9,
      maxY - minY
    );

  const centerX =
    (
      minX +
      maxX
    ) /
    2;

  const centerY =
    (
      minY +
      maxY
    ) /
    2;

  const targetWidth = 360;
  const targetHeight = 300;

  const scale =
    Math.min(
      targetWidth /
        width,

      targetHeight /
        height
    );

  function transformPoint(
    point
  ) {
    return {
      x:
        205 +
        (
          point.x -
          centerX
        ) *
          scale,

      y:
        175 +
        (
          point.y -
          centerY
        ) *
          scale,
    };
  }

  return {
    transformPoint,
  };
}


function M129CuspDevelopmentViewer({
  showTriangles,
  rainbow,
  showMeridian,
  showLongitude,
  viewYawDegrees,
  viewPitchDegrees,
  viewZoom,
  onOrbit,
  onZoom,
  onFlightTargetChange,
  presentationOpacity = 1,
}) {
  const triangles =
    M129_CUSP_TRIANGLES
      .triangles ??
    [];

  const svgRef =
    useRef(null);

  const triangleById =
    Object.fromEntries(
      triangles.map(
        (triangle) => [
          triangle.id,
          triangle,
        ]
      )
    );

  const dragRef =
    useRef(null);

  const [
    dragging,
    setDragging,
  ] = useState(false);


  function handleScenePointerDown(
    event
  ) {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();

    event.currentTarget
      .focus?.({
        preventScroll: true,
      });

    event.currentTarget
      .setPointerCapture?.(
        event.pointerId
      );

    dragRef.current = {
      pointerId:
        event.pointerId,

      lastX:
        event.clientX,

      lastY:
        event.clientY,
    };

    setDragging(true);
  }


  function handleScenePointerMove(
    event
  ) {
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

    const dx =
      event.clientX -
      drag.lastX;

    const dy =
      event.clientY -
      drag.lastY;

    drag.lastX =
      event.clientX;

    drag.lastY =
      event.clientY;

    if (
      Math.abs(dx) > 0.01 ||
      Math.abs(dy) > 0.01
    ) {
      onOrbit?.(
        dx * 0.42,
        -dy * 0.42
      );
    }
  }


  function finishScenePointer(
    event
  ) {
    const drag =
      dragRef.current;

    if (
      drag &&
      drag.pointerId ===
        event.pointerId
    ) {
      event.currentTarget
        .releasePointerCapture?.(
          event.pointerId
        );
    }

    dragRef.current = null;

    setDragging(false);
  }


  function handleSceneWheel(
    event
  ) {
    event.preventDefault();

    onZoom?.(
      event.deltaY < 0
        ? 0.08
        : -0.08
    );
  }


  function handleSceneKeyDown(
    event
  ) {
    if (
      event.key ===
      "ArrowLeft"
    ) {
      event.preventDefault();

      onOrbit?.(
        -8,
        0
      );

      return;
    }

    if (
      event.key ===
      "ArrowRight"
    ) {
      event.preventDefault();

      onOrbit?.(
        8,
        0
      );

      return;
    }

    if (
      event.key ===
      "ArrowUp"
    ) {
      event.preventDefault();

      onZoom?.(
        0.08
      );

      return;
    }

    if (
      event.key ===
      "ArrowDown"
    ) {
      event.preventDefault();

      onZoom?.(
        -0.08
      );
    }
  }


  function buildCuspRecord(
    cuspIndex
  ) {
    const cuspTriangles =
      triangles
        .filter(
          (triangle) =>
            triangle.cusp ===
            cuspIndex
        )
        .slice()
        .sort(
          (
            left,
            right
          ) =>
            (
              left.tetrahedron -
              right.tetrahedron
            ) ||
            (
              left.ideal_vertex -
              right.ideal_vertex
            )
        );

    const connectivity =
      m129ConnectivityForCusp(
        cuspIndex
      );

    if (!connectivity) {
      return null;
    }

    const display =
      m129DevelopedDisplayGeometry(
        cuspIndex,
        cuspTriangles
      );

    const triangleById =
      Object.fromEntries(
        cuspTriangles.map(
          (triangle) => [
            triangle.id,
            triangle,
          ]
        )
      );

    const sideById =
      Object.fromEntries(
        connectivity.sides.map(
          (side) => [
            side.id,
            side,
          ]
        )
      );


    function transformedTriangle(
      triangle
    ) {
      const developed =
        triangle.points.map(
          (point) =>
            display.transformPoint(
              m129ShiftedDevelopedPoint(
                cuspIndex,
                triangle,
                point
              )
            )
        );

      return (
        m129InsetDevelopedTriangle(
          developed
        )
      );
    }


    function transformedSide(
      side
    ) {
      const triangle =
        triangleById[
          side.triangle_id
        ];

      if (!triangle) {
        return null;
      }

      const points =
        transformedTriangle(
          triangle
        );

      const [
        firstIndex,
        secondIndex,
      ] =
        side.corner_indices;

      return [
        points[firstIndex],
        points[secondIndex],
      ];
    }


    return {
      cuspIndex,
      cuspTriangles,
      connectivity,
      transformedTriangle,
      transformedSide,
      sideById,

      peripheralPairings:
        connectivity.pairings.filter(
          (pairing) =>
            pairing.kind ===
            "peripheral"
        ),
    };
  }


  const cuspRecords =
    [0, 1]
      .map(
        buildCuspRecord
      )
      .filter(Boolean);


  useEffect(() => {
    if (!onFlightTargetChange) {
      return undefined;
    }

    let frameId = null;

    function publish() {
      const svg =
        svgRef.current;

      if (!svg) {
        return;
      }

      const flightTriangles =
        Array.from(
          svg.querySelectorAll(
            "polygon[data-m129-flight-id]"
          )
        )
          .map(
            (polygon) => {
              const id =
                polygon.dataset
                  .m129FlightId;

              const triangle =
                triangleById[id];

              const matrix =
                polygon.getScreenCTM();

              if (
                !triangle ||
                !matrix ||
                polygon.points
                  .numberOfItems !== 3
              ) {
                return null;
              }

              const pointOrder =
                triangle.points.map(
                  (point) =>
                    point
                      .edge_vertices
                      .find(
                        (vertex) =>
                          vertex !==
                          triangle
                            .ideal_vertex
                      )
                );

              const pointsByNeighbor =
                Object.fromEntries(
                  pointOrder.map(
                    (
                      neighbor,
                      index
                    ) => {
                      const local =
                        svg.createSVGPoint();

                      const polygonPoint =
                        polygon.points
                          .getItem(index);

                      local.x =
                        polygonPoint.x;

                      local.y =
                        polygonPoint.y;

                      const screen =
                        local.matrixTransform(
                          matrix
                        );

                      return [
                        String(neighbor),
                        {
                          x: screen.x,
                          y: screen.y,
                        },
                      ];
                    }
                  )
                );

              const connectivity =
                m129ConnectivityForCusp(
                  triangle.cusp
                );

              const edgeSegments =
                (
                  connectivity
                    ?.sides ??
                  []
                )
                  .filter(
                    (side) =>
                      side.triangle_id ===
                      id
                  )
                  .map(
                    (side) => {
                      const [
                        firstIndex,
                        secondIndex,
                      ] =
                        side.corner_indices;

                      return {
                        startNeighbor:
                          String(
                            pointOrder[
                              firstIndex
                            ]
                          ),

                        endNeighbor:
                          String(
                            pointOrder[
                              secondIndex
                            ]
                          ),

                        color:
                          side.color_hex,
                      };
                    }
                  );

              return {
                id,

                cusp:
                  triangle.cusp,

                tetrahedron:
                  triangle.tetrahedron,

                idealVertex:
                  triangle.ideal_vertex,

                pointOrder:
                  pointOrder.map(
                    String
                  ),

                pointsByNeighbor,

                edgeSegments,

                color:
                  m129MaterialColor(
                    triangle.material_id
                  ),
              };
            }
          )
          .filter(Boolean);

      if (
        flightTriangles.length ===
        16
      ) {
        onFlightTargetChange({
          kind: "m129-cusp",
          triangles:
            flightTriangles,
        });
      }
    }

    frameId =
      window.requestAnimationFrame(
        publish
      );

    window.addEventListener(
      "resize",
      publish
    );

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(
          frameId
        );
      }

      window.removeEventListener(
        "resize",
        publish
      );
    };
  }, [
    onFlightTargetChange,
    rainbow,
    showTriangles,
    viewYawDegrees,
    viewPitchDegrees,
    viewZoom,
  ]);


  function cuspTitle(
    cuspIndex
  ) {
    const identity =
      M129_CUSP_IDENTITIES[
        cuspIndex
      ];

    return (
      identity
        ? `Cusp ${identity.index} · ${identity.role}`
        : `Cusp ${cuspIndex}`
    );
  }


  function cuspSplitLabel(
    cuspIndex
  ) {
    const identity =
      M129_CUSP_IDENTITIES[
        cuspIndex
      ];

    return (
      identity
        ? `${identity.splitColorName} in Split`
        : ""
    );
  }


  return (
    <div
      style={{
        opacity:
          presentationOpacity,

        pointerEvents:
          presentationOpacity <= 0.001
            ? "none"
            : "auto",
      }}
      className={
        `${styles.m129CuspScene} ${
          dragging
            ? styles.m129CuspSceneDragging
            : ""
        }`
      }
      onPointerDown={
        handleScenePointerDown
      }
      onPointerMove={
        handleScenePointerMove
      }
      onPointerUp={
        finishScenePointer
      }
      onPointerCancel={
        finishScenePointer
      }
      onWheel={
        handleSceneWheel
      }
      onKeyDown={
        handleSceneKeyDown
      }
      tabIndex={0}
      aria-label="Interactive Whitehead-link two-cusp viewer"
    >
      <div
        className={
          styles.m129CuspSharedLabels
        }
      >
        {[0, 1].map(
          (cuspIndex) => (
            <div
              key={
                `title-${cuspIndex}`
              }
              className={
                styles.m129CuspSharedLabel
              }
            >
              <strong>
                {
                  cuspTitle(
                    cuspIndex
                  )
                }
              </strong>

              <span>
                {
                  cuspSplitLabel(
                    cuspIndex
                  )
                }
              </span>
            </div>
          )
        )}
      </div>

      <svg
        ref={svgRef}
        className={
          styles.m129CuspSharedSvg
        }
        viewBox="0 0 840 350"
        preserveAspectRatio="xMidYMid meet"
        style={{
          transform:
            `perspective(900px) ` +
            `rotateX(${viewPitchDegrees}deg) ` +
            `rotateY(${viewYawDegrees}deg) ` +
            `scale(${viewZoom})`,

          transformOrigin:
            "50% 50%",

          transformStyle:
            "preserve-3d",

          backfaceVisibility:
            "visible",

          transition:
            dragging
              ? "none"
              : "transform 160ms ease",
        }}
      >
        {cuspRecords.map(
          (record) => {
            const {
              cuspIndex,
              cuspTriangles,
              connectivity,
              transformedTriangle,
              transformedSide,
              sideById,
              peripheralPairings,
            } = record;

            const offsetX =
              cuspIndex === 0
                ? 0
                : 430;

            return (
              <g
                key={
                  `cusp-${cuspIndex}`
                }
                transform={
                  `translate(${offsetX} 0)`
                }
              >
                {(showTriangles ||
                  rainbow) &&
                  cuspTriangles.map(
                    (triangle) => {
                      const points =
                        transformedTriangle(
                          triangle
                        );

                      const fillColor =
                        rainbow
                          ? (
                              M129_RAINBOW_COLORS[
                                triangle.material_id
                              ] ??
                              "#d9d1bd"
                            )
                          : (
                              m129MaterialColor(
                                triangle.material_id
                              )
                            );

                      const triangleSides =
                        connectivity.sides
                          .filter(
                            (side) =>
                              side.triangle_id ===
                              triangle.id
                          )
                          .sort(
                            (
                              left,
                              right
                            ) =>
                              left.side_index -
                              right.side_index
                          );

                      return (
                        <g
                          key={
                            triangle.id
                          }
                        >
                          <polygon
                            data-m129-flight-id={
                              triangle.id
                            }
                            points={
                              m129SvgPoints(
                                points
                              )
                            }
                            fill={
                              fillColor
                            }
                            stroke="none"
                          />

                          {
                            triangleSides.map(
                              (side) => {
                                const [
                                  firstIndex,
                                  secondIndex,
                                ] =
                                  side.corner_indices;

                                const first =
                                  points[
                                    firstIndex
                                  ];

                                const second =
                                  points[
                                    secondIndex
                                  ];

                                return (
                                  <line
                                    key={
                                      side.id
                                    }
                                    x1={
                                      first.x
                                    }
                                    y1={
                                      first.y
                                    }
                                    x2={
                                      second.x
                                    }
                                    y2={
                                      second.y
                                    }
                                    stroke={
                                      side.color_hex
                                    }
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    vectorEffect="non-scaling-stroke"
                                    pointerEvents="none"
                                  />
                                );
                              }
                            )
                          }
                        </g>
                      );
                    }
                  )}

                {showMeridian &&
                  peripheralPairings
                    .filter(
                      (pairing) =>
                        pairing.meridian_shift !==
                        0
                    )
                    .flatMap(
                      (pairing) => [
                        pairing.side_a,
                        pairing.side_b,
                      ]
                    )
                    .map(
                      (
                        sideId,
                        index
                      ) => {
                        const side =
                          sideById[
                            sideId
                          ];

                        const segment =
                          side
                            ? transformedSide(
                                side
                              )
                            : null;

                        if (!segment) {
                          return null;
                        }

                        return (
                          <line
                            key={
                              `mu-${cuspIndex}-${sideId}-${index}`
                            }
                            x1={
                              segment[0].x
                            }
                            y1={
                              segment[0].y
                            }
                            x2={
                              segment[1].x
                            }
                            y2={
                              segment[1].y
                            }
                            className={
                              styles.m129CuspBoundaryV
                            }
                            vectorEffect="non-scaling-stroke"
                          />
                        );
                      }
                    )}

                {showLongitude &&
                  peripheralPairings
                    .filter(
                      (pairing) =>
                        pairing.longitude_shift !==
                        0
                    )
                    .flatMap(
                      (pairing) => [
                        pairing.side_a,
                        pairing.side_b,
                      ]
                    )
                    .map(
                      (
                        sideId,
                        index
                      ) => {
                        const side =
                          sideById[
                            sideId
                          ];

                        const segment =
                          side
                            ? transformedSide(
                                side
                              )
                            : null;

                        if (!segment) {
                          return null;
                        }

                        return (
                          <line
                            key={
                              `lambda-${cuspIndex}-${sideId}-${index}`
                            }
                            x1={
                              segment[0].x
                            }
                            y1={
                              segment[0].y
                            }
                            x2={
                              segment[1].x
                            }
                            y2={
                              segment[1].y
                            }
                            className={
                              styles.m129CuspBoundaryU
                            }
                            vectorEffect="non-scaling-stroke"
                          />
                        );
                      }
                    )}
              </g>
            );
          }
        )}
      </svg>

      <div
        className={
          styles.m129CuspSharedFacts
        }
      >
        {[0, 1].map(
          (cuspIndex) => (
            <div
              key={
                `facts-${cuspIndex}`
              }
              className={
                styles.m129CuspFacts
              }
            >
              <span>
                ℂ / Λ
              </span>

              <span>
                shape ≈ 2i
              </span>

              <span>
                8 cusp triangles
              </span>
            </div>
          )
        )}
      </div>
    </div>
  );
}



const M129_CELL_BASE_VERTICES =
  Object.freeze([
    Object.freeze({
      x: 1,
      y: 1,
      z: 1,
    }),

    Object.freeze({
      x: 1,
      y: -1,
      z: -1,
    }),

    Object.freeze({
      x: -1,
      y: 1,
      z: -1,
    }),

    Object.freeze({
      x: -1,
      y: -1,
      z: 1,
    }),
  ]);


const M129_CELL_RIGHT_COLUMN_DROP =
  Math.sqrt(2 / 3);


const M129_CELL_CENTERS =
  Object.freeze([
    Object.freeze({
      x: -2.15,
      y: 1.45,
      z: 0,
    }),

    Object.freeze({
      x: 2.15,
      y:
        1.45 -
        M129_CELL_RIGHT_COLUMN_DROP,
      z: 0,
    }),

    Object.freeze({
      x: -2.15,
      y: -1.45,
      z: 0,
    }),

    Object.freeze({
      x: 2.15,
      y:
        -1.45 -
        M129_CELL_RIGHT_COLUMN_DROP,
      z: 0,
    }),
  ]);


function m129SubtractPoint(
  left,
  right
) {
  return {
    x:
      left.x - right.x,

    y:
      left.y - right.y,

    z:
      left.z - right.z,
  };
}


function m129DotPoint(
  left,
  right
) {
  return (
    left.x * right.x +
    left.y * right.y +
    left.z * right.z
  );
}


function m129CrossPoint(
  left,
  right
) {
  return {
    x:
      left.y * right.z -
      left.z * right.y,

    y:
      left.z * right.x -
      left.x * right.z,

    z:
      left.x * right.y -
      left.y * right.x,
  };
}


function m129NormalizePoint(
  point
) {
  const length =
    Math.hypot(
      point.x,
      point.y,
      point.z
    );

  return {
    x:
      point.x / length,

    y:
      point.y / length,

    z:
      point.z / length,
  };
}


/*
 * Build a deterministic orientation in which:
 *
 *   chosen ideal vertex -> directly away from viewer
 *   opposite face       -> directly toward viewer
 *
 * The chosen opposite face therefore lies parallel to the
 * screen at the reset position.
 */
function m129FaceForwardRotation(
  awayVertexIndex
) {
  const awayVertex =
    M129_CELL_BASE_VERTICES[
      awayVertexIndex
    ];

  const faceVertices =
    [0, 1, 2, 3]
      .filter(
        (index) =>
          index !==
          awayVertexIndex
      );

  /*
   * One edge of the front face becomes the screen x-axis.
   */
  const xAxis =
    m129NormalizePoint(
      m129SubtractPoint(
        M129_CELL_BASE_VERTICES[
          faceVertices[1]
        ],
        M129_CELL_BASE_VERTICES[
          faceVertices[0]
        ]
      )
    );

  /*
   * The chosen ideal vertex points along negative screen z,
   * i.e. directly away from the viewer.
   */
  const zAxis =
    m129NormalizePoint({
      x:
        -awayVertex.x,

      y:
        -awayVertex.y,

      z:
        -awayVertex.z,
    });

  const yAxis =
    m129NormalizePoint(
      m129CrossPoint(
        zAxis,
        xAxis
      )
    );

  return [
    xAxis.x,
    xAxis.y,
    xAxis.z,

    yAxis.x,
    yAxis.y,
    yAxis.z,

    zAxis.x,
    zAxis.y,
    zAxis.z,
  ];
}


const M129_CELL_PRESENTATION_ROTATIONS =
  Object.freeze([
    Object.freeze(
      m129FaceForwardRotation(0)
    ),

    Object.freeze(
      m129FaceForwardRotation(1)
    ),

    Object.freeze(
      m129FaceForwardRotation(2)
    ),

    Object.freeze(
      m129FaceForwardRotation(3)
    ),
  ]);


function m129ApplyRotation(
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


function m129AddPoint(
  left,
  right
) {
  return {
    x:
      left.x + right.x,

    y:
      left.y + right.y,

    z:
      left.z + right.z,
  };
}


function m129LerpPoint(
  start,
  end,
  amount
) {
  return {
    x:
      start.x +
      (
        end.x -
        start.x
      ) *
        amount,

    y:
      start.y +
      (
        end.y -
        start.y
      ) *
        amount,

    z:
      start.z +
      (
        end.z -
        start.z
      ) *
        amount,
  };
}


function m129Average3D(
  points
) {
  return {
    x:
      points.reduce(
        (sum, point) =>
          sum + point.x,
        0
      ) /
      points.length,

    y:
      points.reduce(
        (sum, point) =>
          sum + point.y,
        0
      ) /
      points.length,

    z:
      points.reduce(
        (sum, point) =>
          sum + point.z,
        0
      ) /
      points.length,
  };
}


function m129ProjectCellPoint(
  point,
  view
) {
  const rotated =
    m129ApplyRotation(
      point,
      view.rotation
    );

  /*
   * Match the established Figure-eight / Sister opening
   * Cells presentation.
   *
   * The separated tetrahedra are intentionally shown
   * orthographically at the opening endpoint. This keeps
   * an axial ideal vertex projected exactly through the
   * center of its opposite face, regardless of where that
   * tetrahedron sits in the multi-cell layout.
   *
   * When m129 face-identification motion is added, ordinary
   * perspective can be restored once that motion begins,
   * exactly as in TruncatedTetrahedraViewer.
   */
  const perspective = 1;

  const scale =
    78 *
    view.zoom;

  return {
    x:
      500 +
      rotated.x *
        scale,

    y:
      350 -
      rotated.y *
        scale,

    z:
      rotated.z,
  };
}


function m129SortPolygonPoints(
  points
) {
  const center = {
    x:
      points.reduce(
        (sum, point) =>
          sum + point.x,
        0
      ) /
      points.length,

    y:
      points.reduce(
        (sum, point) =>
          sum + point.y,
        0
      ) /
      points.length,
  };

  return [...points].sort(
    (left, right) =>
      Math.atan2(
        left.y - center.y,
        left.x - center.x
      ) -
      Math.atan2(
        right.y - center.y,
        right.x - center.x
      )
  );
}


function m129CellPolygonString(
  points
) {
  return points
    .map(
      (point) =>
        `${point.x},${point.y}`
    )
    .join(" ");
}


function m129CuspLatticeCoordinates(
  cuspIndex,
  point
) {
  const translations =
    m129CuspTranslationRecord(
      cuspIndex
    );

  if (!translations) {
    return {
      u: 0,
      v: 0,
    };
  }

  const meridian =
    translations.meridian;

  const longitude =
    translations.longitude;

  const determinant =
    meridian.re *
      longitude.im -
    meridian.im *
      longitude.re;

  if (
    Math.abs(determinant) <
    1e-12
  ) {
    return {
      u: 0,
      v: 0,
    };
  }

  return {
    u:
      (
        point.re *
          longitude.im -
        point.im *
          longitude.re
      ) /
      determinant,

    v:
      (
        meridian.re *
          point.im -
        meridian.im *
          point.re
      ) /
      determinant,
  };
}


function m129BoundaryTriangleUV(
  triangle
) {
  /*
   * Use the exact same whole-triangle lattice lift as the
   * accepted flat Cusp display.
   *
   * Do not wrap triangle corners independently.
   *
   *   certified triangle
   *     -> chosen developed lattice copy
   *     -> peripheral (u,v)
   *     -> ambient boundary map
   *
   * Here:
   *
   *   u = meridian coefficient
   *   v = longitude coefficient
   */
  const shift =
    m129DisplayLatticeShift(
      triangle.cusp,
      triangle.id
    );

  return triangle.points.map(
    (point) =>
      m129CuspLatticeCoordinates(
        triangle.cusp,
        {
          re:
            point.re +
            shift.re,

          im:
            point.im +
            shift.im,
        }
      )
  );
}


/*
 * Certified hyperbolic Dehn-path triangle coordinates.
 *
 * The generated path stores the actual developed Euclidean
 * coordinates of the eight persistent surviving-cusp triangles
 * at each solved hyperbolic state.
 */
function m129BoundaryTriangleUVFromDehnState(
  triangle,
  dehnState
) {
  if (
    triangle.cusp !==
      M129_TO_M004_SURVIVING_CUSP ||
    !dehnState
  ) {
    return m129BoundaryTriangleUV(
      triangle
    );
  }

  const triangleState =
    dehnState.triangles?.[
      triangle.id
    ];

  const meridian =
    dehnState.surviving_cusp
      ?.meridian_translation;

  const longitude =
    dehnState.surviving_cusp
      ?.longitude_translation;

  if (
    !triangleState ||
    !meridian ||
    !longitude
  ) {
    return m129BoundaryTriangleUV(
      triangle
    );
  }

  /*
   * Preserve the same whole-triangle lattice copy used by the
   * accepted m129 display, but evaluate its lattice translation
   * using the instantaneous M(t), L(t).
   */
  const coefficients =
    M129_CUSP_DISPLAY_LATTICE_SHIFTS[
      0
    ]?.[
      triangle.id
    ] ?? {
      meridian: 0,
      longitude: 0,
    };

  const shift = {
    re:
      coefficients.meridian *
        meridian.re +
      coefficients.longitude *
        longitude.re,

    im:
      coefficients.meridian *
        meridian.im +
      coefficients.longitude *
        longitude.im,
  };

  const determinant =
    meridian.re *
      longitude.im -
    meridian.im *
      longitude.re;

  if (
    Math.abs(
      determinant
    ) < 1e-12
  ) {
    return m129BoundaryTriangleUV(
      triangle
    );
  }

  return triangleState.points.map(
    (point) => {
      const re =
        Number(point.re) +
        shift.re;

      const im =
        Number(point.im) +
        shift.im;

      return {
        u:
          (
            re *
              longitude.im -
            im *
              longitude.re
          ) /
          determinant,

        v:
          (
            meridian.re *
              im -
            meridian.im *
              re
          ) /
          determinant,
      };
    }
  );
}


function m129DehnPathStateAt(
  amount
) {
  const states =
    M129_TO_M004_SURGERY_EDGE
      .hyperbolic_deformation
      ?.data
      ?.states ??
    [];

  if (states.length === 0) {
    return null;
  }

  const t =
    clamp(
      Number(amount),
      0,
      1
    );

  const index =
    Math.round(
      t *
      (
        states.length -
        1
      )
    );

  return (
    states[index] ??
    states[0]
  );
}


function m129BoundaryBarycentricUV(
  triangleUV,
  weights
) {
  return {
    u:
      triangleUV[0].u *
        weights[0] +
      triangleUV[1].u *
        weights[1] +
      triangleUV[2].u *
        weights[2],

    v:
      triangleUV[0].v *
        weights[0] +
      triangleUV[1].v *
        weights[1] +
      triangleUV[2].v *
        weights[2],
  };
}


function m129BoundaryProjectPoint(
  point,
  viewYawDegrees,
  viewPitchDegrees,
  viewZoom
) {
  const yaw =
    rotationY(
      viewYawDegrees *
      Math.PI /
      180
    );

  const pitch =
    rotationX(
      viewPitchDegrees *
      Math.PI /
      180
    );

  const rotated =
    m129ApplyRotation(
      m129ApplyRotation(
        point,
        yaw
      ),
      pitch
    );

  const cameraDistance = 9;

  const perspective =
    cameraDistance /
    Math.max(
      2.5,
      cameraDistance -
        rotated.z
    );

  const scale =
    92 *
    viewZoom;

  return {
    x:
      500 +
      rotated.x *
        scale *
        perspective,

    y:
      350 -
      rotated.y *
        scale *
        perspective,

    z:
      rotated.z,

    cameraX:
      rotated.x,

    cameraY:
      rotated.y,

    cameraZ:
      rotated.z,

    depth:
      rotated.z,
  };
}


function m129BoundaryProjectUV(
  cuspIndex,
  uv,
  viewYawDegrees,
  viewPitchDegrees,
  viewZoom,
  projection,
  lambda,
  epsilon,
  rho
) {
  const translations =
    m129CuspTranslationRecord(
      cuspIndex
    );

  if (!translations) {
    throw new Error(
      `Missing m129 cusp translations for cusp ${cuspIndex}.`
    );
  }

  /*
   * Reconstruct the developed cusp point from its certified
   * peripheral coordinates:
   *
   *   z = u mu + v lambda
   *
   * with
   *
   *   u = meridian amount
   *   v = longitude amount.
   */
  const developedPoint = {
    re:
      uv.u *
        translations.meridian.re +
      uv.v *
        translations.longitude.re,

    im:
      uv.u *
        translations.meridian.im +
      uv.v *
        translations.longitude.im,
  };

  /*
   * Certified developed cusp point
   *   -> generic S^3 boundary tube point.
   */
  const point4 =
    m129BoundaryPoint4(
      cuspIndex,
      developedPoint,
      {
        lambda,
        epsilon,
        rho,
      }
    );

  /*
   * Measure proximity to the stereographic projection pole.
   *
   * For S^3 -> R^3:
   *
   *   denominator = 1 - w.
   *
   * denominator -> 0 means the true image runs to infinity.
   * Keep that information so the rasterizer can omit facets
   * touching the projection horizon instead of drawing huge
   * artificial sheets across the viewport.
   */
  const rotated4 =
    rotateS3MixedPlanes(
      point4[0],
      point4[1],
      point4[2],
      point4[3],
      projection
    );

  const stereographicDenominator =
    1 - rotated4[3];

  /*
   * Same generic stereographic projection layer already
   * regression-certified against m004.
   */
  const point3 =
    stereographicS3Point(
      point4,
      projection
    );

  return {
    ...m129BoundaryProjectPoint(
      {
        x: point3[0],
        y: point3[1],
        z: point3[2],
      },
      viewYawDegrees,
      viewPitchDegrees,
      viewZoom
    ),

    stereographicDenominator,
  };
}


function m129BoundarySubtriangles(
  triangle,
  subdivisions = 7
) {
  const uv =
    m129BoundaryTriangleUV(
      triangle
    );

  const pieces = [];

  function weights(
    i,
    j
  ) {
    const a =
      i /
      subdivisions;

    const b =
      j /
      subdivisions;

    return [
      1 - a - b,
      a,
      b,
    ];
  }

  for (
    let i = 0;
    i < subdivisions;
    i += 1
  ) {
    for (
      let j = 0;
      j <
        subdivisions - i;
      j += 1
    ) {
      const w0 =
        weights(
          i,
          j
        );

      const w1 =
        weights(
          i + 1,
          j
        );

      const w2 =
        weights(
          i,
          j + 1
        );

      pieces.push([
        m129BoundaryBarycentricUV(
          uv,
          w0
        ),
        m129BoundaryBarycentricUV(
          uv,
          w1
        ),
        m129BoundaryBarycentricUV(
          uv,
          w2
        ),
      ]);

      if (
        j <
        subdivisions -
          i -
          1
      ) {
        const w3 =
          weights(
            i + 1,
            j + 1
          );

        pieces.push([
          m129BoundaryBarycentricUV(
            uv,
            w1
          ),
          m129BoundaryBarycentricUV(
            uv,
            w3
          ),
          m129BoundaryBarycentricUV(
            uv,
            w2
          ),
        ]);
      }
    }
  }

  return pieces;
}


function m129BoundarySampleUVSegment(
  start,
  end,
  samples = 40
) {
  return Array.from(
    {
      length:
        samples + 1,
    },
    (_, index) => {
      const amount =
        index / samples;

      return {
        u:
          start.u +
          (
            end.u -
            start.u
          ) *
            amount,

        v:
          start.v +
          (
            end.v -
            start.v
          ) *
            amount,
      };
    }
  );
}


const M129_BOUNDARY_LIGHT_DIRECTION =
  Object.freeze({
    x: -0.436522,
    y: 0.595257,
    z: -0.674624,
  });


function m129BoundaryLitColor(
  color,
  points
) {
  const match =
    /^#([0-9a-f]{6})$/i.exec(
      String(color ?? "")
    );

  if (
    !match ||
    !Array.isArray(points) ||
    points.length < 3
  ) {
    return color;
  }

  const [a, b, c] =
    points;

  const ab = {
    x:
      b.cameraX -
      a.cameraX,

    y:
      b.cameraY -
      a.cameraY,

    z:
      b.cameraZ -
      a.cameraZ,
  };

  const ac = {
    x:
      c.cameraX -
      a.cameraX,

    y:
      c.cameraY -
      a.cameraY,

    z:
      c.cameraZ -
      a.cameraZ,
  };

  const normal = {
    x:
      ab.y * ac.z -
      ab.z * ac.y,

    y:
      ab.z * ac.x -
      ab.x * ac.z,

    z:
      ab.x * ac.y -
      ab.y * ac.x,
  };

  const normalLength =
    Math.hypot(
      normal.x,
      normal.y,
      normal.z
    );

  if (
    normalLength <
    1e-10
  ) {
    return color;
  }

  /*
   * Same lighting principle as the established
   * figure-eight surface:
   *
   * fixed camera-space light,
   * two-sided diffuse response,
   * material hue preserved.
   */
  const diffuse =
    Math.pow(
      Math.abs(
        (normal.x / normalLength) *
          M129_BOUNDARY_LIGHT_DIRECTION.x +
        (normal.y / normalLength) *
          M129_BOUNDARY_LIGHT_DIRECTION.y +
        (normal.z / normalLength) *
          M129_BOUNDARY_LIGHT_DIRECTION.z
      ),
      0.85
    );

  const lightFactor =
    0.55 +
    0.55 *
      diffuse;

  const value =
    Number.parseInt(
      match[1],
      16
    );

  const channels = [
    (value >> 16) & 255,
    (value >> 8) & 255,
    value & 255,
  ].map(
    (channel) =>
      Math.max(
        0,
        Math.min(
          255,
          Math.round(
            channel *
            lightFactor
          )
        )
      )
  );

  return (
    `rgb(${channels[0]}, ${channels[1]}, ${channels[2]})`
  );
}


/*
 * Ambient Dehn-surgery presentation hook.
 *
 * Patch 1 installs the shared hook without inventing the isotopy.
 * The next patch will replace this identity map with the actual
 * crossing-circle surgery twist. Intrinsic cusp deformation and
 * ambient motion will therefore read the SAME surgery parameter t.
 */
function m129AmbientSurgeryDevelopedPoint(
  cuspIndex,
  developedPoint
) {
  return developedPoint;
}




function M129BoundaryViewer({
  viewYawDegrees,
  viewPitchDegrees,
  viewZoom,
  projection,
  subdivisions,
  lambda,
  epsilon,
  rho,
  layers,
  cuspVisibility = null,
  cuspMorph = 1,
  flatCuspTarget = null,
  selectedCuspIndex = 0,
  fillingSlope = null,
  fillingProgress = 0,
  fillingStartedInSplit = false,
  survivingCuspMorph = 0,
  survivingCuspViewMorph = 0,
  survivingCuspMorphActive = false,
  survivingCuspReveal = 0,
  surgeryPathT = 0,
  surgeryPathActive = false,
  ambientSurgeryTwist = 0,
  presentationOpacity = 1,
  m004TargetState = ONE_CUSP_PUBLICATION_STATE,
  projectM004PointToClient = null,
  onInteractionStart,
  onOrbit,
  onZoom,
}) {
  const dragRef =
    useRef(null);

  const canvasRef =
    useRef(null);

  /*
   * Browser -> m129 logical-view conversion for the CURRENT canvas.
   * Updated by drawSurface() before any geometry is projected.
   */
  const m129ClientFrameRef =
    useRef(null);

  /*
   * Exact native m004 state that this visible handoff must reach.
   *
   * This comes directly from SurgeryProjectionViewer's real
   * Symmetric preset.
   */
  const effectiveM004TargetState =
    m004TargetState ??
    ONE_CUSP_PUBLICATION_STATE;

  const m004TargetTube =
    useMemo(
      () =>
        buildFigureEightS3Tube(
          effectiveM004TargetState
            .mesh?.nu ?? 288,
          effectiveM004TargetState
            .mesh?.nv ?? 64,
          effectiveM004TargetState
            .geometry ??
            ONE_CUSP_PUBLICATION_STATE
              .geometry
        ),
      [
        effectiveM004TargetState
          .mesh?.nu,
        effectiveM004TargetState
          .mesh?.nv,
        effectiveM004TargetState
          .geometry?.lambda,
        effectiveM004TargetState
          .geometry?.epsilon,
        effectiveM004TargetState
          .geometry?.rho,
      ]
    );



  const surgeryPathState =
    useMemo(
      () =>
        m129DehnPathStateAt(
          surgeryPathT
        ),
      [
        surgeryPathT,
      ]
    );

  function boundaryTriangleUV(
    triangle
  ) {
    return (
      triangle.cusp ===
        M129_TO_M004_SURVIVING_CUSP
        ? m129BoundaryTriangleUVFromDehnState(
            triangle,
            surgeryPathState
          )
        : m129BoundaryTriangleUV(
            triangle
          )
    );
  }


  const [
    dragging,
    setDragging,
  ] = useState(false);

  function handlePointerDown(
    event
  ) {
    if (event.button !== 0) {
      return;
    }

    onInteractionStart?.();

    event.preventDefault();

    event.currentTarget
      .focus?.({
        preventScroll: true,
      });

    event.currentTarget
      .setPointerCapture?.(
        event.pointerId
      );

    dragRef.current = {
      pointerId:
        event.pointerId,

      lastX:
        event.clientX,

      lastY:
        event.clientY,
    };

    setDragging(true);
  }


  function handlePointerMove(
    event
  ) {
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

    const dx =
      event.clientX -
      drag.lastX;

    const dy =
      event.clientY -
      drag.lastY;

    drag.lastX =
      event.clientX;

    drag.lastY =
      event.clientY;

    onOrbit?.(
      dx * 0.42,
      -dy * 0.42
    );
  }


  function finishPointer(
    event
  ) {
    const drag =
      dragRef.current;

    if (
      drag &&
      drag.pointerId ===
        event.pointerId
    ) {
      event.currentTarget
        .releasePointerCapture?.(
          event.pointerId
        );
    }

    dragRef.current = null;

    setDragging(false);
  }


  function handleWheel(
    event
  ) {
    event.preventDefault();

    onZoom?.(
      event.deltaY < 0
        ? 0.08
        : -0.08
    );
  }


  const fillingAnimationActive =
    Number(fillingProgress) > 0 &&
    Number(fillingProgress) < 1;

  /*
   * Keep the software rasterizer in motion-performance mode for
   * the ENTIRE m129 -> m004 operation.
   *
   * The final surviving-cusp handoff is especially expensive:
   * every visible torus vertex changes its S³ embedding,
   * stereographic projection, camera position, and normal.
   *
   * This affects only canvas supersampling. The geometric mesh
   * remains at full publication resolution throughout.
   */
  const boundaryAnimationActive =
    fillingAnimationActive ||
    surgeryPathActive ||
    survivingCuspMorphActive;


  /*
   * ============================================================
   * CONNECTED m129 BOUNDARY TORUS MESH
   * ============================================================
   *
   * IMPORTANT:
   *
   * The certified cusp triangles describe a triangulation of the
   * quotient torus T^2. They are NOT themselves suitable as the
   * geometric render mesh.
   *
   * Several certified triangles contain an edge whose peripheral
   * coordinate changes by exactly one period. Its endpoints are the
   * same quotient point on T^2, but linearly interpolating the lifted
   * coordinates makes that edge sweep completely around the torus.
   * Rendering those lifted simplices directly produced the large
   * fan / sheet artifacts.
   *
   * Instead:
   *
   *   1. Build one ordinary connected periodic (u,v) mesh per cusp.
   *   2. Map that mesh onto the analytic S^3 tube.
   *   3. Use periodic copies of the certified cusp triangles only
   *      to decide which material owns each small surface facet.
   *
   * Geometry and triangulation are therefore separated correctly:
   *
   *   smooth torus = geometry
   *   certified triangles = material partition on that torus
   */
  const surfaceMeshes =
    useMemo(
      () => {
        function rgbFromHex(
          color
        ) {
          const match =
            /^#([0-9a-f]{6})$/i.exec(
              String(
                color ?? ""
              )
            );

          if (!match) {
            return [
              217,
              209,
              189,
            ];
          }

          const value =
            Number.parseInt(
              match[1],
              16
            );

          return [
            (value >> 16) & 255,
            (value >> 8) & 255,
            value & 255,
          ];
        }


        function pointInTriangle(
          point,
          triangle
        ) {
          const [
            first,
            second,
            third,
          ] = triangle;

          function cross(
            a,
            b,
            p
          ) {
            return (
              (
                b.u - a.u
              ) *
                (
                  p.v - a.v
                ) -
              (
                b.v - a.v
              ) *
                (
                  p.u - a.u
                )
            );
          }

          const d0 =
            cross(
              first,
              second,
              point
            );

          const d1 =
            cross(
              second,
              third,
              point
            );

          const d2 =
            cross(
              third,
              first,
              point
            );

          const epsilon =
            1e-9;

          const hasNegative =
            d0 < -epsilon ||
            d1 < -epsilon ||
            d2 < -epsilon;

          const hasPositive =
            d0 > epsilon ||
            d1 > epsilon ||
            d2 > epsilon;

          return !(
            hasNegative &&
            hasPositive
          );
        }


        /*
         * Build periodic copies of all certified triangles.
         *
         * The unit torus coordinates are
         *
         *   u ~ u + 1
         *   v ~ v + 1.
         *
         * Copies from -2 through +2 are deliberately generous and
         * easily cover the canonical [0,1] x [0,1] render domain.
         */
        const periodicMaterialTriangles =
          [0, 1].map(
            (cuspIndex) =>
              M129_CUSP_TRIANGLES
                .triangles
                .filter(
                  (triangle) =>
                    triangle.cusp ===
                    cuspIndex
                )
                .flatMap(
                  (triangle) => {
                    const uv =
                      boundaryTriangleUV(
                        triangle
                      );

                    const copies = [];

                    for (
                      let du = -2;
                      du <= 2;
                      du += 1
                    ) {
                      for (
                        let dv = -2;
                        dv <= 2;
                        dv += 1
                      ) {
                        copies.push({
                          triangle,

                          points:
                            uv.map(
                              (point) => ({
                                u:
                                  point.u +
                                  du,

                                v:
                                  point.v +
                                  dv,
                              })
                            ),
                        });
                      }
                    }

                    return copies;
                  }
                )
          );


        function materialAt(
          cuspIndex,
          uv
        ) {
          const candidates =
            periodicMaterialTriangles[
              cuspIndex
            ];

          for (
            const candidate of
            candidates
          ) {
            if (
              pointInTriangle(
                uv,
                candidate.points
              )
            ) {
              return candidate
                .triangle;
            }
          }

          /*
           * The certified periodic triangles cover the torus exactly.
           * This fallback should therefore never be needed except for
           * floating-point points exactly on a pathological boundary.
           */
          return null;
        }


        /*
         * Give the smooth torus substantially more resolution along
         * the knot direction than around the tube circumference.
         *
         * With subdivisions = 24:
         *
         *   route segments = 96
         *   minor segments = 48
         *
         * -> 9,216 render triangles per cusp.
         *
         * This remains considerably cheaper than subdividing every
         * certified macro-triangle independently at very high density.
         */
        /*
         * Filling must not change display resolution.
         *
         * A topology animation should deform the existing visible
         * surface continuously, not visibly replace it with a
         * coarser mesh when Fill begins.
         */
        const routeSegments =
          Math.max(
            48,
            subdivisions * 8
          );

        const minorSegments =
          Math.max(
            24,
            subdivisions * 3
          );


        return [0, 1].map(
          (cuspIndex) => {
            const vertices = [];

            function vertexIndex(
              routeIndex,
              minorIndex
            ) {
              return (
                routeIndex *
                  (
                    minorSegments +
                    1
                  ) +
                minorIndex
              );
            }


            for (
              let routeIndex = 0;
              routeIndex <=
                routeSegments;
              routeIndex += 1
            ) {
              /*
               * v = longitude = route along the link core.
               */
              const v =
                routeIndex /
                routeSegments;

              for (
                let minorIndex = 0;
                minorIndex <=
                  minorSegments;
                minorIndex += 1
              ) {
                /*
                 * u = meridian = angle around the tube.
                 */
                const u =
                  minorIndex /
                  minorSegments;

                vertices.push({
                  u,
                  v,
                });
              }
            }


            const indices = [];
            const triangleMaterialRgb = [];


            function pushSurfaceTriangle(
              firstIndex,
              secondIndex,
              thirdIndex
            ) {
              const first =
                vertices[
                  firstIndex
                ];

              const second =
                vertices[
                  secondIndex
                ];

              const third =
                vertices[
                  thirdIndex
                ];

              const center = {
                u:
                  (
                    first.u +
                    second.u +
                    third.u
                  ) /
                  3,

                v:
                  (
                    first.v +
                    second.v +
                    third.v
                  ) /
                  3,
              };

              const material =
                materialAt(
                  cuspIndex,
                  center
                );

              indices.push([
                firstIndex,
                secondIndex,
                thirdIndex,
              ]);

              triangleMaterialRgb.push(
                rgbFromHex(
                  material
                    ? m129CuspTriangleFill(
                        material
                      )
                    : "#d9d1bd"
                )
              );
            }


            for (
              let routeIndex = 0;
              routeIndex <
                routeSegments;
              routeIndex += 1
            ) {
              for (
                let minorIndex = 0;
                minorIndex <
                  minorSegments;
                minorIndex += 1
              ) {
                const a =
                  vertexIndex(
                    routeIndex,
                    minorIndex
                  );

                const b =
                  vertexIndex(
                    routeIndex + 1,
                    minorIndex
                  );

                const c =
                  vertexIndex(
                    routeIndex + 1,
                    minorIndex + 1
                  );

                const d =
                  vertexIndex(
                    routeIndex,
                    minorIndex + 1
                  );

                pushSurfaceTriangle(
                  a,
                  b,
                  c
                );

                pushSurfaceTriangle(
                  a,
                  c,
                  d
                );
              }
            }


            return {
              id:
                `m129-connected-cusp-${cuspIndex}`,

              cuspIndex,

              vertices,
              indices,

              /*
               * Preserve regular torus-grid dimensions so animated
               * smooth normals can reuse neighboring projected
               * vertices instead of performing two extra complete
               * S³ projections per vertex.
               */
              routeSegments,
              minorSegments,

              triangleMaterialRgb,

              materialTriangles:
                (
                  cuspIndex ===
                    M129_TO_M004_SURVIVING_CUSP &&
                  Number(
                    surgeryPathT
                  ) > 1e-9
                )
                  ? M129_CUSP_TRIANGLES
                      .triangles
                      .filter(
                        (triangle) =>
                          triangle.cusp ===
                            M129_TO_M004_SURVIVING_CUSP
                      )
                      .map(
                        (triangle) => {
                          const points =
                            boundaryTriangleUV(
                              triangle
                            );

                          const center = {
                            u:
                              (
                                points[0].u +
                                points[1].u +
                                points[2].u
                              ) /
                              3,

                            v:
                              (
                                points[0].v +
                                points[1].v +
                                points[2].v
                              ) /
                              3,
                          };

                          return {
                            points,
                            center,
                            periodicBase: true,

                            rgb:
                              rgbFromHex(
                                m129CuspTriangleFill(
                                  triangle
                                )
                              ),
                          };
                        }
                      )
                  : periodicMaterialTriangles[
                      cuspIndex
                    ].map(
                      (candidate) => ({
                        points:
                          candidate.points,

                        rgb:
                          rgbFromHex(
                            m129CuspTriangleFill(
                              candidate.triangle
                            )
                          ),
                      })
                    ),
            };
          }
        );
      },
      [
        subdivisions,
        surgeryPathState,
      ]
    );


  /*
   * ============================================================
   * SURVIVING-CUSP MATERIAL TRANSPORT
   * ============================================================
   *
   * Geometry already transports:
   *
   *   m129 u = meridian  -> m004 minor
   *   m129 v = longitude -> m004 route
   *
   * Do the same for the MATERIAL triangulation.
   *
   * Each of the eight surviving m129 cusp triangles is paired with
   * one of the eight native m004 material triangles.
   *
   * Pairing strongly preserves tetrahedral color identity and then
   * chooses the shortest periodic torus motion.
   *
   * We also choose the best permutation of each triangle's three
   * corners, so a triangle does not unnecessarily rotate or wrap
   * around the universal cover during the morph.
   */
  const survivingMaterialTransport =
    useMemo(
      () => {
        function rgbFromHex(
          color
        ) {
          const match =
            /^#([0-9a-f]{6})$/i.exec(
              String(
                color ?? ""
              )
            );

          if (!match) {
            return [
              217,
              209,
              189,
            ];
          }

          const value =
            Number.parseInt(
              match[1],
              16
            );

          return [
            (value >> 16) & 255,
            (value >> 8) & 255,
            value & 255,
          ];
        }


        function centroid(
          points
        ) {
          return {
            u:
              (
                points[0].u +
                points[1].u +
                points[2].u
              ) /
              3,

            v:
              (
                points[0].v +
                points[1].v +
                points[2].v
              ) /
              3,
          };
        }


        /*
         * IMPORTANT:
         *
         * cuspTubeCoordinates() is being evaluated on the actual
         * developed m004 cusp triangle corners.
         *
         * Therefore its minorAmount / routeAmount values already
         * form the correct coherent UNIVERSAL-COVER lift.
         *
         * Do NOT wrap individual corners toward one another.
         *
         * Some legitimate m004 material edges span one complete
         * torus period. Independent corner wrapping would identify
         * their endpoints and collapse/fold the logical triangle.
         */


        const targetTriangles =
          M004_CUSP_MATERIAL_TARGET
            .map(
              (triangle) => {
                const points =
                  triangle.corners
                    .map(
                      (corner) => {
                        const coordinates =
                          cuspTubeCoordinates(
                            corner,
                            DEFAULT_FIGURE_EIGHT_CUSP_COORDINATE_SPEC
                          );

                        return {
                          /*
                           * Exact UNWRAPPED native m004 material
                           * address.
                           *
                           *   u = minor / meridian
                           *   v = route / longitude
                           */
                          u:
                            coordinates
                              .minorAmount,

                          v:
                            coordinates
                              .routeAmount,
                        };
                      }
                    );

                return {
                  id:
                    triangle.id,

                  color:
                    triangle.color
                      .toLowerCase(),

                  rgb:
                    rgbFromHex(
                      triangle.color
                    ),

                  points,
                };
              }
            );


        const sourceTriangles =
          M129_CUSP_TRIANGLES
            .triangles
            .filter(
              (triangle) =>
                triangle.cusp === 0
            )
            .map(
              (triangle) => ({
                id:
                  triangle.id,

                color:
                  m129CuspTriangleFill(
                    triangle
                  )
                    .toLowerCase(),

                rgb:
                  rgbFromHex(
                    m129CuspTriangleFill(
                      triangle
                    )
                  ),

                points:
                  m129BoundaryTriangleUV(
                    triangle
                  ),
              })
            );


        const cornerPermutations = [
          [0, 1, 2],
          [0, 2, 1],
          [1, 0, 2],
          [1, 2, 0],
          [2, 0, 1],
          [2, 1, 0],
        ];


        function bestAlignment(
          source,
          target
        ) {
          const sourceCenter =
            centroid(
              source.points
            );

          let best = null;


          for (
            const permutation of
            cornerPermutations
          ) {
            let candidate =
              permutation.map(
                (index) => ({
                  ...target.points[
                    index
                  ],
                })
              );

            const targetCenter =
              centroid(
                candidate
              );

            /*
             * Choose the periodic copy nearest the source triangle.
             *
             * A whole-triangle integer translation preserves the
             * target triangle exactly on T².
             */
            const shiftU =
              Math.round(
                sourceCenter.u -
                targetCenter.u
              );

            const shiftV =
              Math.round(
                sourceCenter.v -
                targetCenter.v
              );

            candidate =
              candidate.map(
                (point) => ({
                  u:
                    point.u +
                    shiftU,

                  v:
                    point.v +
                    shiftV,
                })
              );

            const cost =
              candidate.reduce(
                (
                  total,
                  point,
                  index
                ) => {
                  const du =
                    point.u -
                    source.points[
                      index
                    ].u;

                  const dv =
                    point.v -
                    source.points[
                      index
                    ].v;

                  return (
                    total +
                    du * du +
                    dv * dv
                  );
                },
                0
              );

            if (
              !best ||
              cost <
                best.cost
            ) {
              best = {
                cost,
                points:
                  candidate,
              };
            }
          }

          return best;
        }


        /*
         * Pair equal colors first.
         *
         * For the canonical four-color tetrahedral palette this
         * gives the intended material transport:
         *
         *   Yellow -> Yellow
         *   Blue   -> Blue
         *   Green  -> Green
         *   Red    -> Red
         *
         * Within each color family choose the assignment with the
         * shortest periodic torus travel.
         */
        const unusedTargets =
          new Set(
            targetTriangles.map(
              (_, index) =>
                index
            )
          );

        const result = [];


        for (
          const source of
          sourceTriangles
        ) {
          const sameColor =
            [...unusedTargets]
              .filter(
                (index) =>
                  targetTriangles[
                    index
                  ].color ===
                  source.color
              );

          const candidateIndices =
            sameColor.length > 0
              ? sameColor
              : [...unusedTargets];

          let bestChoice = null;


          for (
            const targetIndex of
            candidateIndices
          ) {
            const target =
              targetTriangles[
                targetIndex
              ];

            const alignment =
              bestAlignment(
                source,
                target
              );

            /*
             * In the unexpected event that a source color has no
             * same-color target left, heavily prefer color agreement
             * before geometry. This still guarantees an exact native
             * m004 endpoint rather than a terminal color jump.
             */
            const colorPenalty =
              source.color ===
                target.color
                ? 0
                : 1000;

            const score =
              alignment.cost +
              colorPenalty;

            if (
              !bestChoice ||
              score <
                bestChoice.score
            ) {
              bestChoice = {
                score,
                targetIndex,
                target,
                targetPoints:
                  alignment.points,
              };
            }
          }


          if (!bestChoice) {
            continue;
          }


          unusedTargets.delete(
            bestChoice.targetIndex
          );

          result.push({
            sourceId:
              source.id,

            targetId:
              bestChoice.target.id,

            sourceRgb:
              source.rgb,

            targetRgb:
              bestChoice.target.rgb,

            sourcePoints:
              source.points,

            targetPoints:
              bestChoice.targetPoints,
          });
        }


        if (
          result.length !== 8 ||
          unusedTargets.size !== 0
        ) {
          console.warn(
            "M129 -> m004 material transport did not produce " +
            "a complete eight-triangle bijection.",
            {
              transported:
                result.length,

              unusedTargets:
                [...unusedTargets],
            }
          );
        } else {
          console.info(
            "M129 -> m004 MATERIAL TRANSPORT: " +
            "8 source triangles -> 8 native m004 triangles",
            result.map(
              (record) =>
                `${record.sourceId} -> ${record.targetId}`
            )
          );
        }


        return result;
      },
      []
    );


  /*
   * Move the MATERIAL boundaries with the same progress that moves
   * the surviving S³ surface.
   *
   * These are only eight base triangles. materialRgbAt() handles
   * their torus periodicity directly, so we do not need 25 copied
   * versions of every triangle during the expensive animation.
   */
  const survivingHandoffMaterialTriangles =
    useMemo(
      () => {
        const amount =
          clamp(
            Number(
              survivingCuspMorph
            ),
            0,
            1
          );

        return survivingMaterialTransport
          .map(
            (record) => {
              const points =
                record.sourcePoints
                  .map(
                    (
                      sourcePoint,
                      index
                    ) => {
                      const targetPoint =
                        record.targetPoints[
                          index
                        ];

                      return {
                        u:
                          sourcePoint.u +
                          (
                            targetPoint.u -
                            sourcePoint.u
                          ) *
                            amount,

                        v:
                          sourcePoint.v +
                          (
                            targetPoint.v -
                            sourcePoint.v
                          ) *
                            amount,
                      };
                    }
                  );

              const center = {
                u:
                  (
                    points[0].u +
                    points[1].u +
                    points[2].u
                  ) /
                  3,

                v:
                  (
                    points[0].v +
                    points[1].v +
                    points[2].v
                  ) /
                  3,
              };

              /*
               * Normally source and target have exactly the same
               * tetrahedral color, so this remains constant.
               *
               * Interpolation exists only as a defensive fallback
               * if a future manifold changes the material counts.
               */
              const rgb =
                record.sourceRgb.map(
                  (
                    channel,
                    channelIndex
                  ) =>
                    Math.round(
                      channel +
                      (
                        record.targetRgb[
                          channelIndex
                        ] -
                        channel
                      ) *
                        amount
                    )
                );

              return {
                points,
                center,
                rgb,

                /*
                 * Tell materialRgbAt() that this is one base T²
                 * triangle rather than a pre-generated lattice copy.
                 */
                periodicBase: true,
              };
            }
          );
      },
      [
        survivingMaterialTransport,
        survivingCuspMorph,
      ]
    );


  /*
   * ============================================================
   * NATIVE m004 HANDOFF DISPLAY MESH
   * ============================================================
   *
   * The final surgery handoff must not terminate with:
   *
   *   rectangular m129 torus tessellation
   *       ->
   *   native m004 barycentric tessellation
   *
   * on the ownership frame.
   *
   * Build the SAME finite eight-triangle subdivision used by
   * SurgeryProjectionViewer and use it as the visible cusp-0
   * render mesh for the complete surviving-boundary handoff.
   *
   * Geometry still comes from m129BoundaryProjectUVWithFill(), so
   * the mathematical deformation itself is unchanged.
   */
  const nativeM004HandoffMeshes =
    useMemo(
      () => {
        const targetMesh =
          effectiveM004TargetState
            .mesh ??
          ONE_CUSP_PUBLICATION_STATE
            .mesh;

        const divisions =
          Math.max(
            4,
            Math.round(
              0.5 *
              Math.sqrt(
                (
                  targetMesh.nu ??
                  288
                ) *
                (
                  targetMesh.nv ??
                  64
                )
              )
            )
          );


        function rgbFromHex(
          color
        ) {
          const match =
            /^#([0-9a-f]{6})$/i.exec(
              String(
                color ?? ""
              )
            );

          if (!match) {
            return [
              217,
              209,
              189,
            ];
          }

          const value =
            Number.parseInt(
              match[1],
              16
            );

          return [
            (value >> 16) & 255,
            (value >> 8) & 255,
            value & 255,
          ];
        }


        function barycentricWeights(
          row,
          column
        ) {
          const second =
            row / divisions;

          const third =
            column / divisions;

          return [
            1 - second - third,
            second,
            third,
          ];
        }


        function rawPointFromWeights(
          corners,
          weights
        ) {
          return {
            x:
              corners[0].x *
                weights[0] +
              corners[1].x *
                weights[1] +
              corners[2].x *
                weights[2],

            y:
              corners[0].y *
                weights[0] +
              corners[1].y *
                weights[1] +
              corners[2].y *
                weights[2],
          };
        }


        return M004_CUSP_MATERIAL_TARGET
          .map(
            (macroTriangle) => {
              const vertices = [];

              const vertexByKey =
                new Map();


              function vertexIndex(
                row,
                column
              ) {
                const key =
                  `${row},${column}`;

                const existing =
                  vertexByKey.get(
                    key
                  );

                if (
                  existing !==
                  undefined
                ) {
                  return existing;
                }

                const weights =
                  barycentricWeights(
                    row,
                    column
                  );

                const rawPoint =
                  rawPointFromWeights(
                    macroTriangle.corners,
                    weights
                  );

                const coordinates =
                  cuspTubeCoordinates(
                    rawPoint,
                    DEFAULT_FIGURE_EIGHT_CUSP_COORDINATE_SPEC
                  );

                /*
                 * Exact same peripheral identification already
                 * used by the successful geometric handoff:
                 *
                 *   m129 u -> m004 minor
                 *   m129 v -> m004 route
                 *
                 * Preserve the unwrapped coordinates. Do NOT
                 * independently wrap triangle corners.
                 */
                const uv = {
                  u:
                    coordinates
                      .minorAmount,

                  v:
                    coordinates
                      .routeAmount,
                };

                const index =
                  vertices.length;

                vertices.push(
                  uv
                );

                vertexByKey.set(
                  key,
                  index
                );

                return index;
              }


              const indices = [];

              for (
                let row = 0;
                row < divisions;
                row += 1
              ) {
                for (
                  let column = 0;
                  column <
                    divisions - row;
                  column += 1
                ) {
                  const lowerLeft =
                    vertexIndex(
                      row,
                      column
                    );

                  const lowerRight =
                    vertexIndex(
                      row + 1,
                      column
                    );

                  const upperLeft =
                    vertexIndex(
                      row,
                      column + 1
                    );

                  indices.push([
                    lowerLeft,
                    lowerRight,
                    upperLeft,
                  ]);

                  if (
                    column <
                    divisions -
                      row -
                      1
                  ) {
                    const upperRight =
                      vertexIndex(
                        row + 1,
                        column + 1
                      );

                    indices.push([
                      lowerRight,
                      upperRight,
                      upperLeft,
                    ]);
                  }
                }
              }


              return {
                id:
                  macroTriangle.id,

                targetRgb:
                  rgbFromHex(
                    macroTriangle.color
                  ),

                vertices,
                indices,
              };
            }
          );
      },
      [
        effectiveM004TargetState
          .mesh?.nu,
        effectiveM004TargetState
          .mesh?.nv,
      ]
    );


  /*
   * m129 Cusp <-> Boundary transition mesh.
   *
   * Follow the established figure-eight rule: track the same
   * material point continuously from the flat cusp presentation
   * to its exact Boundary position.
   *
   * The transition mesh is subdivided inside each of the 16
   * certified cusp triangles so the cut-open flat development is
   * preserved. At cuspMorph = 1 the existing connected periodic
   * Boundary mesh remains the authoritative endpoint.
   */
  const transitionMeshes =
    useMemo(
      () => {
        const transitionSubdivisions =
          Math.max(
            12,
            subdivisions
          );

        function rgbFromHex(
          color
        ) {
          const match =
            /^#([0-9a-f]{6})$/i.exec(
              String(
                color ?? ""
              )
            );

          if (!match) {
            return [
              217,
              209,
              189,
            ];
          }

          const value =
            Number.parseInt(
              match[1],
              16
            );

          return [
            (value >> 16) & 255,
            (value >> 8) & 255,
            value & 255,
          ];
        }

        function weights(
          i,
          j
        ) {
          const a =
            i /
            transitionSubdivisions;

          const b =
            j /
            transitionSubdivisions;

          return [
            1 - a - b,
            a,
            b,
          ];
        }

        return M129_CUSP_TRIANGLES
          .triangles
          .map(
            (triangle) => {
              const triangleUV =
                m129BoundaryTriangleUV(
                  triangle
                );

              const vertices = [];

              const indexByKey =
                new Map();

              function vertexIndex(
                i,
                j
              ) {
                const key =
                  `${i},${j}`;

                const existing =
                  indexByKey.get(
                    key
                  );

                if (
                  existing !==
                  undefined
                ) {
                  return existing;
                }

                const barycentricWeights =
                  weights(
                    i,
                    j
                  );

                const index =
                  vertices.length;

                vertices.push({
                  weights:
                    barycentricWeights,

                  uv:
                    m129BoundaryBarycentricUV(
                      triangleUV,
                      barycentricWeights
                    ),
                });

                indexByKey.set(
                  key,
                  index
                );

                return index;
              }

              const indices = [];

              for (
                let i = 0;
                i <
                  transitionSubdivisions;
                i += 1
              ) {
                for (
                  let j = 0;
                  j <
                    transitionSubdivisions - i;
                  j += 1
                ) {
                  const a =
                    vertexIndex(
                      i,
                      j
                    );

                  const b =
                    vertexIndex(
                      i + 1,
                      j
                    );

                  const c =
                    vertexIndex(
                      i,
                      j + 1
                    );

                  indices.push([
                    a,
                    b,
                    c,
                  ]);

                  if (
                    j <
                    transitionSubdivisions -
                      i -
                      1
                  ) {
                    const d =
                      vertexIndex(
                        i + 1,
                        j + 1
                      );

                    indices.push([
                      b,
                      d,
                      c,
                    ]);
                  }
                }
              }

              return {
                id:
                  triangle.id,

                cuspIndex:
                  triangle.cusp,

                triangle,
                vertices,
                indices,

                materialRgb:
                  rgbFromHex(
                    m129CuspTriangleFill(
                      triangle
                    )
                  ),
              };
            }
          );
      },
      [
        subdivisions,
      ]
    );


  const flatTargetTriangleById =
    useMemo(
      () =>
        Object.fromEntries(
          (
            flatCuspTarget
              ?.triangles ??
            []
          ).map(
            (triangle) => [
              triangle.id,
              triangle,
            ]
          )
        ),
      [
        flatCuspTarget,
      ]
    );


  /*
   * Once the surgery slope has acquired its filling disk, the
   * selected torus is no longer a boundary component.
   *
   * Presentation rule:
   *
   *   keep the surviving cusp fixed;
   *   contract only the filled cusp's tube radius toward its core.
   */
  const rawFillingCuspCollapse =
    clamp(
      (
        Number(fillingProgress) -
        0.30
      ) /
        0.62,
      0,
      1
    );

  const fillingCuspCollapseAmount =
    rawFillingCuspCollapse *
    rawFillingCuspCollapse *
    (
      3 -
      2 * rawFillingCuspCollapse
    );


  function effectiveRhoForCusp(
    _cuspIndex
  ) {
    /*
     * Phase 0 of the new Dehn-filling animation:
     *
     * keep the existing cusp boundary at full geometric size.
     *
     * Filling will now be represented by:
     *
     *   boundary fades
     *   -> incoming solid torus grows
     *   -> attachment map aligns
     *   -> final seal
     *
     * rather than by shrinking the old boundary torus.
     */
    return rho;
  }


  function cuspBoundaryStillVisible(
    cuspIndex
  ) {
    /*
     * Cusp visibility is independent of presentation mode.
     *
     * A hidden cusp stays hidden while switching among:
     *
     *   Triangles
     *   Rainbow
     *   Split
     *   projection presets
     *   geometry presets
     *
     * Split controls coloring only; it does not control whether
     * a boundary component exists in the visible scene.
     */
    const manuallyVisible =
      cuspVisibility?.[
        cuspIndex
      ] !== false;

    /*
     * The certified m129 -> m004 filling has one surviving
     * boundary component: cusp 0.
     *
     * If the user hid that cusp before pressing Fill, honor that
     * choice through the explanatory filling stages. But during
     * the FINAL attachment phase it must return, because it is the
     * actual surface that continues into the m004 Boundary.
     *
     * Its opacity is handled separately below; this condition only
     * permits it back into the renderer.
     */
    const forcedSurvivingCuspVisible =
      cuspIndex === 0 &&
      (
        Number(
          survivingCuspReveal
        ) > 0 ||
        Number(
          survivingCuspMorph
        ) > 0 ||
        Number(
          survivingCuspViewMorph
        ) > 0
      );

    return (
      (
        manuallyVisible ||
        forcedSurvivingCuspVisible
      ) &&
      !(
        cuspIndex ===
          selectedCuspIndex &&
        Number(
          fillingProgress
        ) >= 1
      )
    );
  }


  function m129BoundaryProjectUVWithFill(
    cuspIndex,
    uv,
    requestedViewYawDegrees,
    requestedViewPitchDegrees,
    requestedViewZoom,
    requestedProjection,
    requestedLambda,
    requestedEpsilon,
    requestedRho
  ) {
    const translations =
      m129CuspTranslationRecord(
        cuspIndex
      );

    if (!translations) {
      return m129BoundaryProjectUV(
        cuspIndex,
        uv,
        requestedViewYawDegrees,
        requestedViewPitchDegrees,
        requestedViewZoom,
        requestedProjection,
        requestedLambda,
        requestedEpsilon,
        effectiveRhoForCusp(
          cuspIndex
        )
      );
    }

    const developedPoint = {
      re:
        uv.u *
          translations.meridian.re +
        uv.v *
          translations.longitude.re,

      im:
        uv.u *
          translations.meridian.im +
        uv.v *
          translations.longitude.im,
    };

    /*
     * Exact current m129 S3 point.
     */
    const ambientDevelopedPoint =
      m129AmbientSurgeryDevelopedPoint(
        cuspIndex,
        developedPoint
      );

    const sourcePoint4 =
      m129BoundaryPoint4(
        cuspIndex,
        ambientDevelopedPoint,
        {
          lambda:
            requestedLambda,

          epsilon:
            requestedEpsilon,

          rho:
            Number.isFinite(
              requestedRho
            )
              ? requestedRho
              : effectiveRhoForCusp(
                  cuspIndex
                ),
        }
      );



    /*
     * Only cusp 0 survives the certified filling.
     */
    const morph =
      cuspIndex === 0
        ? clamp(
            Number(
              survivingCuspMorph
            ),
            0,
            1
          )
        : 0;

    let point4 =
      sourcePoint4;

    if (morph > 1e-7) {
      /*
       * Peripheral-coordinate correspondence:
       *
       *   m129 v = longitude
       *          = route around the surviving knot
       *
       *   m129 u = meridian
       *          = angle around its boundary tube
       *
       * The canonical m004 tube expects:
       *
       *   figureEightS3TubePoint4(
       *     routeAmount,
       *     minorAmount
       *   )
       */
      const routeAmount =
        (
          (
            uv.v % 1
          ) +
          1
        ) % 1;

      const minorAmount =
        (
          (
            uv.u % 1
          ) +
          1
        ) % 1;

      const targetPoint4 =
        sampleFigureEightS3TubePoint4(
          m004TargetTube,
          routeAmount,
          minorAmount
        );

      /*
       * Move the SAME material point between the two S3
       * embeddings.
       *
       * Interpolate in R4 and renormalize after every step so
       * every intermediate point remains on S3.
       */
      const blendedPoint4 =
        sourcePoint4.map(
          (value, index) =>
            value *
              (
                1 -
                morph
              ) +
            targetPoint4[index] *
              morph
        );

      const length =
        Math.hypot(
          blendedPoint4[0],
          blendedPoint4[1],
          blendedPoint4[2],
          blendedPoint4[3]
        );

      point4 =
        length > 1e-10
          ? blendedPoint4.map(
              (value) =>
                value /
                length
            )
          : targetPoint4;
    }

    /*
     * ------------------------------------------------------------
     * PROJECTIVE-VIEW HANDOFF
     * ------------------------------------------------------------
     *
     * Phase 1:
     *
     *   survivingCuspMorph
     *
     * is the geometric S3 path that already looked correct:
     *
     *   m129 cusp 0 -> canonical m004 tube
     *
     * under the CURRENT m129 projection/view.
     *
     * Phase 2 begins only after that geometric path has landed.
     * Hold the canonical m004 tube fixed and continuously change
     * the actual S3 projection and camera until they equal the
     * published m004 Symmetric/default settings.
     *
     * There is NO screen-space interpolation here.
     */


    const viewMorph =
      cuspIndex === 0
        ? clamp(
            Number(
              survivingCuspViewMorph
            ),
            0,
            1
          )
        : 0;


    function shortestDegreeLerp(
      start,
      end,
      amount
    ) {
      const delta =
        (
          (
            end -
            start +
            540
          ) %
          360
        ) -
        180;

      return (
        start +
        delta *
          amount
      );
    }


    /*
     * Published m004 Symmetric projection.
     */
    const targetProjection = {
      ...(
        effectiveM004TargetState
          .projection ??
        ONE_CUSP_PUBLICATION_STATE
          .projection
      ),
    };


    /*
     * SurgeryProjectionViewer stores these camera angles in
     * radians. M129BoundaryViewer stores them in degrees.
     */
    const targetView =
      effectiveM004TargetState
        .view ??
      ONE_CUSP_PUBLICATION_STATE
        .view;

    const targetViewYawDegrees =
      targetView.yaw *
      180 /
      Math.PI;

    const targetViewPitchDegrees =
      targetView.pitch *
      180 /
      Math.PI;

    const targetViewZoom =
      targetView.zoom;


    /*
     * Continuously rotate S3 itself from the current m129
     * projection into the m004 Symmetric projection.
     */
    const effectiveProjection = {
      xw:
        shortestDegreeLerp(
          requestedProjection.xw,
          targetProjection.xw,
          viewMorph
        ),

      yw:
        shortestDegreeLerp(
          requestedProjection.yw,
          targetProjection.yw,
          viewMorph
        ),

      zw:
        shortestDegreeLerp(
          requestedProjection.zw,
          targetProjection.zw,
          viewMorph
        ),
    };


    /*
     * Continuously move the ordinary 3D camera too.
     */
    const effectiveViewYawDegrees =
      shortestDegreeLerp(
        requestedViewYawDegrees,
        targetViewYawDegrees,
        viewMorph
      );

    const effectiveViewPitchDegrees =
      requestedViewPitchDegrees +
      (
        targetViewPitchDegrees -
        requestedViewPitchDegrees
      ) *
        viewMorph;

    const effectiveViewZoom =
      requestedViewZoom +
      (
        targetViewZoom -
        requestedViewZoom
      ) *
        viewMorph;


    /*
     * Project the current S3 point normally.
     *
     * During geometric phase:
     *
     *   viewMorph = 0
     *
     * so this is EXACTLY the good path we had before.
     *
     * During projective-view phase:
     *
     *   point4 is already the canonical m004 point,
     *
     * and only its legitimate projection/view changes.
     */
    const rotated4 =
      rotateS3MixedPlanes(
        point4[0],
        point4[1],
        point4[2],
        point4[3],
        effectiveProjection
      );

    const stereographicDenominator =
      1 -
      rotated4[3];

    const point3 =
      stereographicS3Point(
        point4,
        effectiveProjection
      );

    const currentPoint =
      m129BoundaryProjectPoint(
        {
          x: point3[0],
          y: point3[1],
          z: point3[2],
        },
        effectiveViewYawDegrees,
        effectiveViewPitchDegrees,
        effectiveViewZoom
      );


    /*
     * FINAL FRAME CORRECTION
     *
     * Geometry continues to morph in S³ exactly as before.
     *
     * The missing transformation was the actual m004 screen
     * framing:
     *
     *   recenter projected tube
     *   -> recenter camera-space tube
     *   -> extent-derived scale
     *   -> extent-derived perspective
     *
     * Ask the TRUE hidden m004 renderer where this SAME S³ point
     * lands, then smoothly animate the presentation frame toward
     * that exact pixel location.
     *
     * This is not a fade and does not replace the geometry.
     * It is the final camera/framing part of the continuous morph.
     */
    const framingRaw =
      clamp(
        (
          viewMorph -
          0.60
        ) /
          0.40,
        0,
        1
      );

    const framingAmount =
      framingRaw *
      framingRaw *
      (
        3 -
        2 *
          framingRaw
      );

    const targetClientPoint =
      (
        cuspIndex === 0 &&
        framingAmount > 0 &&
        typeof projectM004PointToClient ===
          "function"
      )
        ? projectM004PointToClient(
            point4
          )
        : null;

    const clientFrame =
      m129ClientFrameRef.current;

    if (
      !targetClientPoint ||
      !clientFrame ||
      !Number.isFinite(
        targetClientPoint.clientX
      ) ||
      !Number.isFinite(
        targetClientPoint.clientY
      ) ||
      !Number.isFinite(
        clientFrame.scale
      ) ||
      clientFrame.scale <= 0
    ) {
      return {
        ...currentPoint,
        stereographicDenominator,
      };
    }

    const targetLogicalX =
      (
        targetClientPoint.clientX -
        clientFrame.left -
        clientFrame.offsetX
      ) /
      clientFrame.scale;

    const targetLogicalY =
      (
        targetClientPoint.clientY -
        clientFrame.top -
        clientFrame.offsetY
      ) /
      clientFrame.scale;

    return {
      ...currentPoint,

      x:
        currentPoint.x +
        (
          targetLogicalX -
          currentPoint.x
        ) *
          framingAmount,

      y:
        currentPoint.y +
        (
          targetLogicalY -
          currentPoint.y
        ) *
          framingAmount,

      cameraX:
        currentPoint.cameraX +
        (
          targetClientPoint.viewX -
          currentPoint.cameraX
        ) *
          framingAmount,

      cameraY:
        currentPoint.cameraY +
        (
          targetClientPoint.viewY -
          currentPoint.cameraY
        ) *
          framingAmount,

      cameraZ:
        currentPoint.cameraZ +
        (
          targetClientPoint.viewZ -
          currentPoint.cameraZ
        ) *
          framingAmount,

      depth:
        currentPoint.depth +
        (
          targetClientPoint.depth -
          currentPoint.depth
        ) *
          framingAmount,

      stereographicDenominator,
    };
  }


  useEffect(() => {
    const canvas =
      canvasRef.current;

    if (!canvas) {
      return undefined;
    }

    let frameId = null;

    const host =
      canvas.parentElement;

    function drawSurface() {
      frameId = null;

      const rect =
        canvas.getBoundingClientRect();

      const cssWidth =
        Math.max(
          1,
          rect.width
        );

      const cssHeight =
        Math.max(
          1,
          rect.height
        );

      /*
       * Exact CSS equivalent of:
       *
       *   viewBox="0 0 1000 700"
       *   preserveAspectRatio="xMidYMid meet"
       *
       * This lets the true m004 renderer publish client-space
       * pixels while this renderer converts them back into its own
       * logical 1000 x 700 coordinates.
       */
      const cssViewScale =
        Math.min(
          cssWidth / 1000,
          cssHeight / 700
        );

      const cssViewOffsetX =
        (
          cssWidth -
          1000 *
            cssViewScale
        ) /
        2;

      const cssViewOffsetY =
        (
          cssHeight -
          700 *
            cssViewScale
        ) /
        2;

      m129ClientFrameRef.current = {
        left:
          rect.left,

        top:
          rect.top,

        scale:
          cssViewScale,

        offsetX:
          cssViewOffsetX,

        offsetY:
          cssViewOffsetY,
      };

      const dpr =
        window.devicePixelRatio ||
        1;

      /*
       * Same performance principle as the established
       * Figure-eight / Sister software renderer: modest
       * supersampling plus a fixed raster-pixel budget.
       */
      const preferredRasterScale =
        Math.min(
          dpr,

          /*
           * Filling is the expensive topology phase and may remain
           * at 1.0x.
           *
           * The FINAL m129 -> m004 handoff must already use the
           * native m004 publication raster scale, otherwise the
           * ownership frame visibly changes antialiasing and the
           * apparent silhouette.
           */
          fillingAnimationActive &&
          !survivingCuspMorphActive
            ? 1.0
            : 1.25
        );

      const MAX_RASTER_PIXELS =
        4_000_000;

      const preferredPixels =
        cssWidth *
        cssHeight *
        preferredRasterScale *
        preferredRasterScale;

      const rasterScale =
        preferredPixels >
        MAX_RASTER_PIXELS
          ? Math.sqrt(
              MAX_RASTER_PIXELS /
              Math.max(
                1,
                cssWidth *
                  cssHeight
              )
            )
          : preferredRasterScale;

      const rasterWidth =
        Math.max(
          1,
          Math.round(
            cssWidth *
            rasterScale
          )
        );

      const rasterHeight =
        Math.max(
          1,
          Math.round(
            cssHeight *
            rasterScale
          )
        );

      if (
        canvas.width !==
          rasterWidth ||
        canvas.height !==
          rasterHeight
      ) {
        canvas.width =
          rasterWidth;

        canvas.height =
          rasterHeight;
      }

      const context =
        canvas.getContext(
          "2d"
        );

      if (!context) {
        return;
      }

      let zState =
        canvas.__m129BoundaryZBuffer;

      if (
        !zState ||
        zState.width !==
          rasterWidth ||
        zState.height !==
          rasterHeight ||
        !zState.slopeOccluderDepth
      ) {
        zState = {
          width:
            rasterWidth,

          height:
            rasterHeight,

          imageData:
            context.createImageData(
              rasterWidth,
              rasterHeight
            ),

          depth:
            new Float32Array(
              rasterWidth *
              rasterHeight
            ),

          /*
           * Hard occluders for the selected filling slope.
           *
           * This deliberately excludes the boundary currently
           * fading away, while retaining:
           *
           *   - the other boundary torus
           *   - the incoming solid torus
           */
          slopeOccluderDepth:
            new Float32Array(
              rasterWidth *
              rasterHeight
            ),
        };

        canvas.__m129BoundaryZBuffer =
          zState;
      }

      const depthBuffer =
        zState.depth;

      const slopeOccluderDepthBuffer =
        zState.slopeOccluderDepth;

      const pixels =
        zState.imageData.data;

      depthBuffer.fill(
        -Infinity
      );

      slopeOccluderDepthBuffer.fill(
        -Infinity
      );

      pixels.fill(0);

      /*
       * Match SVG viewBox="0 0 1000 700" with
       * preserveAspectRatio="xMidYMid meet" exactly.
       */
      const viewScale =
        Math.min(
          rasterWidth / 1000,
          rasterHeight / 700
        );

      const offsetX =
        (
          rasterWidth -
          1000 * viewScale
        ) /
        2;

      const offsetY =
        (
          rasterHeight -
          700 * viewScale
        ) /
        2;

      function rasterPoint(
        point
      ) {
        return {
          ...point,

          rasterX:
            offsetX +
            point.x *
              viewScale,

          rasterY:
            offsetY +
            point.y *
              viewScale,
        };
      }

      /*
       * Stereographic projection horizon.
       *
       * A point with 1 - w below this threshold is already
       * heading rapidly toward infinity in the projected
       * R^3 chart. Triangles touching this region must not
       * be represented by one ordinary finite screen-space
       * triangle.
       */
      const STEREOGRAPHIC_HORIZON =
        0.025;


      function trianglePassesProjectionHorizon(
        cuspIndex,
        firstUV,
        secondUV,
        thirdUV,
        first,
        second,
        third
      ) {
        /*
         * During animated Boundary motion, use the already-projected
         * triangle corners for the stereographic-horizon test.
         *
         * This avoids seven additional full S³ -> stereographic ->
         * camera projections PER FINE TRIANGLE PER FRAME.
         *
         * The connected Boundary mesh is already highly subdivided,
         * so its corners provide a sufficiently local animation-time
         * horizon test.
         *
         * The more conservative 7-sample material-space test below
         * remains unchanged for static publication rendering.
         */
        if (boundaryAnimationActive) {
          return (
            Number.isFinite(
              first.stereographicDenominator
            ) &&
            Math.abs(
              first.stereographicDenominator
            ) >=
              STEREOGRAPHIC_HORIZON &&

            Number.isFinite(
              second.stereographicDenominator
            ) &&
            Math.abs(
              second.stereographicDenominator
            ) >=
              STEREOGRAPHIC_HORIZON &&

            Number.isFinite(
              third.stereographicDenominator
            ) &&
            Math.abs(
              third.stereographicDenominator
            ) >=
              STEREOGRAPHIC_HORIZON &&

            Number.isFinite(
              first.rasterX
            ) &&
            Number.isFinite(
              first.rasterY
            ) &&
            Number.isFinite(
              second.rasterX
            ) &&
            Number.isFinite(
              second.rasterY
            ) &&
            Number.isFinite(
              third.rasterX
            ) &&
            Number.isFinite(
              third.rasterY
            )
          );
        }

        /*
         * Static publication rendering keeps the stricter
         * material-space stereographic-pole certification.
         *
         * Test:
         *
         *   3 vertices
         *   3 edge midpoints
         *   1 barycenter
         */
        const midpoint = (
          firstPoint,
          secondPoint
        ) => ({
          u:
            (
              firstPoint.u +
              secondPoint.u
            ) /
            2,

          v:
            (
              firstPoint.v +
              secondPoint.v
            ) /
            2,
        });

        const materialSamples = [
          firstUV,
          secondUV,
          thirdUV,

          midpoint(
            firstUV,
            secondUV
          ),

          midpoint(
            secondUV,
            thirdUV
          ),

          midpoint(
            thirdUV,
            firstUV
          ),

          {
            u:
              (
                firstUV.u +
                secondUV.u +
                thirdUV.u
              ) /
              3,

            v:
              (
                firstUV.v +
                secondUV.v +
                thirdUV.v
              ) /
              3,
          },
        ];

        const materialVisible =
          materialSamples.every(
            (uv) => {
              const sample =
                m129BoundaryProjectUVWithFill(
                  cuspIndex,
                  uv,
                  viewYawDegrees,
                  viewPitchDegrees,
                  viewZoom,
                  projection,
                  lambda,
                  epsilon,
                  rho
                );

              return (
                Number.isFinite(
                  sample
                    .stereographicDenominator
                ) &&
                Math.abs(
                  sample
                    .stereographicDenominator
                ) >=
                  STEREOGRAPHIC_HORIZON
              );
            }
          );

        if (!materialVisible) {
          return false;
        }

        return (
          Number.isFinite(
            first.rasterX
          ) &&
          Number.isFinite(
            first.rasterY
          ) &&
          Number.isFinite(
            second.rasterX
          ) &&
          Number.isFinite(
            second.rasterY
          ) &&
          Number.isFinite(
            third.rasterX
          ) &&
          Number.isFinite(
            third.rasterY
          )
        );
      }


      function cameraDepthKey(
        depth
      ) {
        return (
          1 /
          Math.max(
            0.1,
            9 - depth
          )
        );
      }

      /*
       * Smooth m129 Boundary lighting.
       *
       * Each mesh vertex gets a normal from the actual
       * parameterized boundary surface, not from the flat
       * raster triangle. The rasterizer then interpolates
       * those normals across each triangle before lighting.
       *
       * This keeps the lower tessellation visually smooth
       * while preserving the exact same surface geometry.
       */
      const NORMAL_DERIVATIVE_STEP =
        1e-4;

      function projectSmoothVertex(
        cuspIndex,
        uv
      ) {
        const point =
          m129BoundaryProjectUVWithFill(
            cuspIndex,
            uv,
            viewYawDegrees,
            viewPitchDegrees,
            viewZoom,
            projection,
            lambda,
            epsilon,
            rho
          );

        const pointU =
          m129BoundaryProjectUVWithFill(
            cuspIndex,
            {
              u:
                uv.u +
                NORMAL_DERIVATIVE_STEP,

              v:
                uv.v,
            },
            viewYawDegrees,
            viewPitchDegrees,
            viewZoom,
            projection,
            lambda,
            epsilon,
            rho
          );

        const pointV =
          m129BoundaryProjectUVWithFill(
            cuspIndex,
            {
              u:
                uv.u,

              v:
                uv.v +
                NORMAL_DERIVATIVE_STEP,
            },
            viewYawDegrees,
            viewPitchDegrees,
            viewZoom,
            projection,
            lambda,
            epsilon,
            rho
          );

        const tangentUX =
          pointU.cameraX -
          point.cameraX;

        const tangentUY =
          pointU.cameraY -
          point.cameraY;

        const tangentUZ =
          pointU.cameraZ -
          point.cameraZ;

        const tangentVX =
          pointV.cameraX -
          point.cameraX;

        const tangentVY =
          pointV.cameraY -
          point.cameraY;

        const tangentVZ =
          pointV.cameraZ -
          point.cameraZ;

        const normalX =
          tangentUY *
            tangentVZ -
          tangentUZ *
            tangentVY;

        const normalY =
          tangentUZ *
            tangentVX -
          tangentUX *
            tangentVZ;

        const normalZ =
          tangentUX *
            tangentVY -
          tangentUY *
            tangentVX;

        const normalLength =
          Math.hypot(
            normalX,
            normalY,
            normalZ
          );

        const safeLength =
          Math.max(
            1e-12,
            normalLength
          );

        return rasterPoint({
          ...point,

          /*
           * One complete Rainbow sweep per closed torus.
           *
           * The m129 tube parameterization already normalizes
           * longitude v to one complete circuit of each closed
           * component, including the length-2 braid cycle.
           */
          rainbowRoute:
            uv.v,

          materialU:
            uv.u,

          materialV:
            uv.v,

          normalX:
            normalX /
            safeLength,

          normalY:
            normalY /
            safeLength,

          normalZ:
            normalZ /
            safeLength,
        });
      }


      /*
       * FAST SMOOTH SURFACE PROJECTION FOR THE FINAL HANDOFF
       *
       * Static rendering keeps projectSmoothVertex(), which uses
       * tiny analytic finite differences.
       *
       * During the expensive m129 -> m004 handoff, however, every
       * grid vertex is already moving every frame. Project each
       * vertex ONCE, then recover its smooth camera-space normal
       * from the neighboring projected grid vertices.
       *
       * Same geometric mesh.
       * Same visible tessellation.
       * Same smooth-normal principle.
       *
       * Expensive geometry evaluations:
       *
       *   old: ~3 per vertex
       *   new:  1 per vertex
       */
      function projectAnimatedSurfaceMesh(
        mesh
      ) {
        const routeSegments =
          mesh.routeSegments;

        const minorSegments =
          mesh.minorSegments;

        if (
          !Number.isInteger(routeSegments) ||
          !Number.isInteger(minorSegments)
        ) {
          return mesh.vertices.map(
            (uv) =>
              projectSmoothVertex(
                mesh.cuspIndex,
                uv
              )
          );
        }

        const stride =
          minorSegments + 1;

        function vertexIndex(
          routeIndex,
          minorIndex
        ) {
          return (
            routeIndex *
              stride +
            minorIndex
          );
        }

        /*
         * First pass:
         * exactly ONE expensive geometric projection per vertex.
         */
        const projected =
          mesh.vertices.map(
            (uv) => {
              const point =
                m129BoundaryProjectUVWithFill(
                  mesh.cuspIndex,
                  uv,
                  viewYawDegrees,
                  viewPitchDegrees,
                  viewZoom,
                  projection,
                  lambda,
                  epsilon,
                  rho
                );

              return rasterPoint({
                ...point,

                rainbowRoute:
                  uv.v,

                materialU:
                  uv.u,

                materialV:
                  uv.v,

                normalX: 0,
                normalY: 0,
                normalZ: 1,
              });
            }
          );

        /*
         * Second pass:
         * central differences on the already-projected periodic
         * torus grid.
         */
        for (
          let routeIndex = 0;
          routeIndex <= routeSegments;
          routeIndex += 1
        ) {
          const previousRoute =
            routeIndex === 0 ||
            routeIndex === routeSegments
              ? routeSegments - 1
              : routeIndex - 1;

          const nextRoute =
            routeIndex === 0 ||
            routeIndex === routeSegments
              ? 1
              : routeIndex + 1;

          for (
            let minorIndex = 0;
            minorIndex <= minorSegments;
            minorIndex += 1
          ) {
            const previousMinor =
              minorIndex === 0 ||
              minorIndex === minorSegments
                ? minorSegments - 1
                : minorIndex - 1;

            const nextMinor =
              minorIndex === 0 ||
              minorIndex === minorSegments
                ? 1
                : minorIndex + 1;

            const point =
              projected[
                vertexIndex(
                  routeIndex,
                  minorIndex
                )
              ];

            const previousU =
              projected[
                vertexIndex(
                  routeIndex,
                  previousMinor
                )
              ];

            const nextU =
              projected[
                vertexIndex(
                  routeIndex,
                  nextMinor
                )
              ];

            const previousV =
              projected[
                vertexIndex(
                  previousRoute,
                  minorIndex
                )
              ];

            const nextV =
              projected[
                vertexIndex(
                  nextRoute,
                  minorIndex
                )
              ];

            const tangentUX =
              nextU.cameraX -
              previousU.cameraX;

            const tangentUY =
              nextU.cameraY -
              previousU.cameraY;

            const tangentUZ =
              nextU.cameraZ -
              previousU.cameraZ;

            const tangentVX =
              nextV.cameraX -
              previousV.cameraX;

            const tangentVY =
              nextV.cameraY -
              previousV.cameraY;

            const tangentVZ =
              nextV.cameraZ -
              previousV.cameraZ;

            const normalX =
              tangentUY *
                tangentVZ -
              tangentUZ *
                tangentVY;

            const normalY =
              tangentUZ *
                tangentVX -
              tangentUX *
                tangentVZ;

            const normalZ =
              tangentUX *
                tangentVY -
              tangentUY *
                tangentVX;

            const normalLength =
              Math.max(
                1e-12,
                Math.hypot(
                  normalX,
                  normalY,
                  normalZ
                )
              );

            point.normalX =
              normalX /
              normalLength;

            point.normalY =
              normalY /
              normalLength;

            point.normalZ =
              normalZ /
              normalLength;
          }
        }

        return projected;
      }


      const morphAmount =
        clamp(
          Number(cuspMorph),
          0,
          1
        );

      const hasExactFlatTarget =
        Object.keys(
          flatTargetTriangleById
        ).length === 16;


      function flatRasterPointForTransitionVertex(
        mesh,
        vertex
      ) {
        const targetTriangle =
          flatTargetTriangleById[
            mesh.id
          ];

        if (!targetTriangle) {
          return null;
        }

        /*
         * Recover the exact three Cusp corners in the SAME
         * corner order used by this certified triangle.
         */
        const flatCorners =
          mesh.triangle.points.map(
            (point) => {
              const neighbor =
                point
                  .edge_vertices
                  ?.find(
                    (vertexIndex) =>
                      vertexIndex !==
                      mesh.triangle
                        .ideal_vertex
                  );

              return targetTriangle
                .pointsByNeighbor
                ?.[
                  String(
                    neighbor
                  )
                ] ??
                null;
            }
          );

        if (
          flatCorners.some(
            (point) => !point
          )
        ) {
          return null;
        }

        const weights =
          vertex.weights;

        /*
         * Exact barycentric position inside the visible flat
         * m129 cusp triangle.
         */
        const screenX =
          flatCorners[0].x *
            weights[0] +
          flatCorners[1].x *
            weights[1] +
          flatCorners[2].x *
            weights[2];

        const screenY =
          flatCorners[0].y *
            weights[0] +
          flatCorners[1].y *
            weights[1] +
          flatCorners[2].y *
            weights[2];

        /*
         * Convert browser-space Cusp coordinates into this
         * canvas's actual raster coordinates.
         */
        return {
          rasterX:
            (
              screenX -
              rect.left
            ) *
            rasterScale,

          rasterY:
            (
              screenY -
              rect.top
            ) *
            rasterScale,
        };
      }


      function projectTransitionVertex(
        mesh,
        vertex
      ) {
        /*
         * Exact final m129 Boundary position.
         */
        const boundaryPoint =
          projectSmoothVertex(
            mesh.cuspIndex,
            vertex.uv
          );

        /*
         * Exact currently displayed flat Cusp position.
         */
        const flatPoint =
          flatRasterPointForTransitionVertex(
            mesh,
            vertex
          );

        if (!flatPoint) {
          return boundaryPoint;
        }

        /*
         * Figure-eight rule:
         *
         * same material point,
         * same barycentric address,
         * changing embedding only.
         */
        const flatNormalWeight =
          1 -
          morphAmount;

        const normalX =
          boundaryPoint.normalX *
          morphAmount;

        const normalY =
          boundaryPoint.normalY *
          morphAmount;

        const normalZ =
          flatNormalWeight +
          boundaryPoint.normalZ *
            morphAmount;

        const normalLength =
          Math.max(
            1e-12,
            Math.hypot(
              normalX,
              normalY,
              normalZ
            )
          );

        return {
          ...boundaryPoint,

          rasterX:
            flatPoint.rasterX +
            (
              boundaryPoint.rasterX -
              flatPoint.rasterX
            ) *
              morphAmount,

          rasterY:
            flatPoint.rasterY +
            (
              boundaryPoint.rasterY -
              flatPoint.rasterY
            ) *
              morphAmount,

          depth:
            boundaryPoint.depth *
            morphAmount,

          normalX:
            normalX /
            normalLength,

          normalY:
            normalY /
            normalLength,

          normalZ:
            normalZ /
            normalLength,
        };
      }


      function hslToRgb(
        hueDegrees,
        saturationPercent,
        lightnessPercent
      ) {
        let hue =
          (
            (
              hueDegrees % 360
            ) +
            360
          ) %
          360;

        hue /= 360;

        const saturation =
          clamp(
            saturationPercent / 100,
            0,
            1
          );

        const lightness =
          clamp(
            lightnessPercent / 100,
            0,
            1
          );

        if (saturation === 0) {
          const gray =
            Math.round(
              lightness * 255
            );

          return [
            gray,
            gray,
            gray,
          ];
        }

        const q =
          lightness < 0.5
            ? lightness *
                (1 + saturation)
            : lightness +
                saturation -
                lightness *
                  saturation;

        const pValue =
          2 * lightness - q;

        function channel(offset) {
          let amount =
            hue + offset;

          if (amount < 0) {
            amount += 1;
          }

          if (amount > 1) {
            amount -= 1;
          }

          let value;

          if (amount < 1 / 6) {
            value =
              pValue +
              (q - pValue) *
                6 *
                amount;
          } else if (
            amount < 1 / 2
          ) {
            value = q;
          } else if (
            amount < 2 / 3
          ) {
            value =
              pValue +
              (q - pValue) *
                (
                  2 / 3 -
                  amount
                ) *
                6;
          } else {
            value = pValue;
          }

          return Math.round(
            value * 255
          );
        }

        return [
          channel(1 / 3),
          channel(0),
          channel(-1 / 3),
        ];
      }


      function unwrapUnitNear(
        reference,
        value
      ) {
        let adjusted = value;

        while (
          adjusted - reference >
          0.5
        ) {
          adjusted -= 1;
        }

        while (
          adjusted - reference <
          -0.5
        ) {
          adjusted += 1;
        }

        return adjusted;
      }


      function materialPointInTriangle(
        point,
        triangle
      ) {
        const [
          first,
          second,
          third,
        ] = triangle;

        function cross(
          a,
          b,
          p
        ) {
          return (
            (
              b.u - a.u
            ) *
              (
                p.v - a.v
              ) -
            (
              b.v - a.v
            ) *
              (
                p.u - a.u
              )
          );
        }

        const d0 =
          cross(
            first,
            second,
            point
          );

        const d1 =
          cross(
            second,
            third,
            point
          );

        const d2 =
          cross(
            third,
            first,
            point
          );

        const epsilon =
          1e-9;

        const hasNegative =
          d0 < -epsilon ||
          d1 < -epsilon ||
          d2 < -epsilon;

        const hasPositive =
          d0 > epsilon ||
          d1 > epsilon ||
          d2 > epsilon;

        return !(
          hasNegative &&
          hasPositive
        );
      }


      function materialRgbAt(
        materialTriangles,
        u,
        v,
        fallbackRgb
      ) {
        /*
         * u and v may lie exactly at the periodic endpoint 1.
         * Leave them in the same universal-cover neighborhood as
         * the fine surface triangle rather than wrapping each
         * coordinate independently.
         */
        const point = {
          u,
          v,
        };

        for (
          const candidate of
          materialTriangles
        ) {
          let testPoint =
            point;

          if (
            candidate.periodicBase
          ) {
            /*
             * Move the query point into the nearest lattice copy of
             * this triangle.
             *
             * The triangle itself stays coherent in the universal
             * cover while T² periodicity is handled here.
             */
            testPoint = {
              u:
                point.u -
                Math.round(
                  point.u -
                  candidate.center.u
                ),

              v:
                point.v -
                Math.round(
                  point.v -
                  candidate.center.v
                ),
            };
          }

          if (
            materialPointInTriangle(
              testPoint,
              candidate.points
            )
          ) {
            return candidate.rgb;
          }
        }

        return fallbackRgb;
      }


      function rasterizeTriangle(
        first,
        second,
        third,
        baseRgb,
        materialTriangles = null,
        surfaceOpacity = 1,
        materialAlreadyResolved = false,
        blocksFillingSlope = false
      ) {
        /*
         * A fully invisible surface is not an occluder.
         *
         * This matters during Dehn filling: once the selected old
         * boundary has faded completely away, the incoming solid
         * torus must be visible through that vacated boundary.
         *
         * Do not let alpha-zero geometry leave an invisible wall
         * in the shared software z-buffer.
         */
        if (
          Number(surfaceOpacity) <=
          1e-6
        ) {
          return;
        }

        const x0 =
          first.rasterX;

        const y0 =
          first.rasterY;

        const x1 =
          second.rasterX;

        const y1 =
          second.rasterY;

        const x2 =
          third.rasterX;

        const y2 =
          third.rasterY;

        const area =
          (
            x1 - x0
          ) *
            (
              y2 - y0
            ) -
          (
            y1 - y0
          ) *
            (
              x2 - x0
            );

        if (
          Math.abs(area) <
          1e-10
        ) {
          return;
        }

        const inverseArea =
          1 / area;

        const minimumX =
          Math.max(
            0,
            Math.floor(
              Math.min(
                x0,
                x1,
                x2
              )
            )
          );

        const maximumX =
          Math.min(
            rasterWidth - 1,
            Math.ceil(
              Math.max(
                x0,
                x1,
                x2
              )
            )
          );

        const minimumY =
          Math.max(
            0,
            Math.floor(
              Math.min(
                y0,
                y1,
                y2
              )
            )
          );

        const maximumY =
          Math.min(
            rasterHeight - 1,
            Math.ceil(
              Math.max(
                y0,
                y1,
                y2
              )
            )
          );

        if (
          maximumX <
            minimumX ||
          maximumY <
            minimumY
        ) {
          return;
        }

        const depth0 =
          cameraDepthKey(
            first.depth
          );

        const depth1 =
          cameraDepthKey(
            second.depth
          );

        const depth2 =
          cameraDepthKey(
            third.depth
          );

        /*
         * Rainbow is a material coordinate on the torus,
         * not a color attached to a cusp triangle.
         *
         * The certified m129 boundary map uses
         *
         *   v = longitude = route around centerline.
         *
         * Because our cusp triangles are already lifted as
         * whole triangles in the developed lattice, v itself
         * is continuous across each fine raster triangle.
         */
        const route0 =
          first.rainbowRoute;

        const route1 =
          second.rainbowRoute;

        const route2 =
          third.rainbowRoute;

        const materialU0 =
          first.materialU;

        const materialU1 =
          second.materialU;

        const materialU2 =
          third.materialU;

        const materialV0 =
          first.materialV;

        const materialV1 =
          second.materialV;

        const materialV2 =
          third.materialV;

        const edgeTolerance =
          -1e-7;

        for (
          let pixelY =
            minimumY;
          pixelY <=
            maximumY;
          pixelY += 1
        ) {
          const sampleY =
            pixelY + 0.5;

          for (
            let pixelX =
              minimumX;
            pixelX <=
              maximumX;
            pixelX += 1
          ) {
            const sampleX =
              pixelX + 0.5;

            const weight1 =
              (
                (
                  sampleX - x0
                ) *
                  (
                    y2 - y0
                  ) -
                (
                  sampleY - y0
                ) *
                  (
                    x2 - x0
                  )
              ) *
              inverseArea;

            const weight2 =
              (
                (
                  x1 - x0
                ) *
                  (
                    sampleY - y0
                  ) -
                (
                  y1 - y0
                ) *
                  (
                    sampleX - x0
                  )
              ) *
              inverseArea;

            const weight0 =
              1 -
              weight1 -
              weight2;

            if (
              weight0 <
                edgeTolerance ||
              weight1 <
                edgeTolerance ||
              weight2 <
                edgeTolerance
            ) {
              continue;
            }

            const depth =
              weight0 * depth0 +
              weight1 * depth1 +
              weight2 * depth2;

            const index =
              pixelY *
                rasterWidth +
              pixelX;

            if (
              blocksFillingSlope &&
              depth >=
                slopeOccluderDepthBuffer[
                  index
                ]
            ) {
              slopeOccluderDepthBuffer[
                index
              ] =
                depth;
            }

            if (
              depth <
              depthBuffer[index]
            ) {
              continue;
            }

            depthBuffer[index] =
              depth;

            const colorIndex =
              index * 4;

            const normalX =
              weight0 *
                first.normalX +
              weight1 *
                second.normalX +
              weight2 *
                third.normalX;

            const normalY =
              weight0 *
                first.normalY +
              weight1 *
                second.normalY +
              weight2 *
                third.normalY;

            const normalZ =
              weight0 *
                first.normalZ +
              weight1 *
                second.normalZ +
              weight2 *
                third.normalZ;

            const normalLength =
              Math.max(
                1e-12,
                Math.hypot(
                  normalX,
                  normalY,
                  normalZ
                )
              );

            const m129Diffuse =
              Math.pow(
                Math.abs(
                  (
                    normalX /
                    normalLength
                  ) *
                    M129_BOUNDARY_LIGHT_DIRECTION.x +
                  (
                    normalY /
                    normalLength
                  ) *
                    M129_BOUNDARY_LIGHT_DIRECTION.y +
                  (
                    normalZ /
                    normalLength
                  ) *
                    M129_BOUNDARY_LIGHT_DIRECTION.z
                ),
                0.85
              );


            /*
             * Native m004 Boundary lighting.
             *
             * Keep this formula deliberately identical to
             * SurgeryProjectionViewer.
             */
            const m004RawLight =
              Math.abs(
                (
                  normalX * -0.32 +
                  normalY * -0.42 +
                  normalZ * 0.85
                ) /
                  normalLength
              );

            const m004Shade =
              72 +
              98 *
                (
                  0.22 +
                  0.78 *
                    m004RawLight
                );

            const m004Diffuse =
              clamp(
                (
                  m004Shade -
                  94
                ) /
                  76,
                0,
                1
              );


            /*
             * Do not wait for renderer ownership to change the
             * lighting.
             *
             * Carry the illumination continuously from m129 into
             * the exact native m004 lighting law during the same
             * surviving-boundary morph.
             */
            const lightingHandoffAmount =
              survivingCuspMorphActive
                ? clamp(
                    Number(
                      survivingCuspViewMorph
                    ),
                    0,
                    1
                  )
                : 0;

            const diffuse =
              m129Diffuse +
              (
                m004Diffuse -
                m129Diffuse
              ) *
                lightingHandoffAmount;

            /*
             * Temporary publication-lighting control.
             *
             * Keep highlights bounded at 1.0 so saturated materials
             * do not clip and lose local surface definition.
             *
             * Increasing contrast darkens only the shadow side:
             *
             *   0.00 = flat illumination
             *   0.82 = approximately the old shadow floor
             *   1.60 = very deep shadows
             */
            const contrastAmount =
              1.20;

            const lightFactor =
              clamp(
                1 -
                  contrastAmount *
                  (
                    1 -
                    diffuse
                  ) *
                  0.55,
                0.10,
                1
              );

            let renderedRgb;

            if (layers.rainbow) {
              /*
               * Exact visual principle used by the
               * figure-eight Boundary:
               *
               * one complete hue cycle as the route
               * coordinate goes from 0 to 1.
               *
               * m129 has two cusps, so this produces
               * one complete rainbow sweep on EACH torus.
               */
              const route =
                weight0 * route0 +
                weight1 * route1 +
                weight2 * route2;

              const wrappedRoute =
                (
                  (
                    route % 1
                  ) +
                  1
                ) %
                1;

              renderedRgb =
                hslToRgb(
                  wrappedRoute * 360,
                  72,
                  68 *
                    lightFactor
                );
            } else {
              let pixelBaseRgb =
                baseRgb;

              if (
                !materialAlreadyResolved &&
                !layers.split &&
                materialTriangles
              ) {
                const materialU =
                  weight0 *
                    materialU0 +
                  weight1 *
                    materialU1 +
                  weight2 *
                    materialU2;

                const materialV =
                  weight0 *
                    materialV0 +
                  weight1 *
                    materialV1 +
                  weight2 *
                    materialV2;

                pixelBaseRgb =
                  materialRgbAt(
                    materialTriangles,
                    materialU,
                    materialV,
                    baseRgb
                  );
              }

              renderedRgb =
                pixelBaseRgb.map(
                  (channel) =>
                    Math.max(
                      0,
                      Math.min(
                        255,
                        Math.round(
                          channel *
                          lightFactor
                        )
                      )
                    )
                );
            }

            pixels[
              colorIndex
            ] =
              renderedRgb[0];

            pixels[
              colorIndex + 1
            ] =
              renderedRgb[1];

            pixels[
              colorIndex + 2
            ] =
              renderedRgb[2];

            pixels[
              colorIndex + 3
            ] =
              Math.round(
                255 *
                clamp(
                  surfaceOpacity,
                  0,
                  1
                )
              );
          }
        }
      }

      /*
       * --------------------------------------------------------
       * DEPTH-TESTED MATERIAL CURVES
       * --------------------------------------------------------
       *
       * Meridian and longitude must behave like material
       * curves painted on the torus itself.
       *
       * The visible surface has already populated depthBuffer.
       * These helpers let a curve consult that same z-buffer,
       * so portions behind a nearer part of either torus vanish.
       *
       * No curves are routed through this machinery yet.
       * This patch only installs the shared renderer.
       */
      function pointPassesSurfaceDepthTest(
        point
      ) {
        const pixelX =
          Math.floor(
            point.rasterX
          );

        const pixelY =
          Math.floor(
            point.rasterY
          );

        if (
          pixelX < 0 ||
          pixelX >= rasterWidth ||
          pixelY < 0 ||
          pixelY >= rasterHeight
        ) {
          return false;
        }

        const surfaceDepth =
          depthBuffer[
            pixelY *
              rasterWidth +
            pixelX
          ];

        if (
          surfaceDepth ===
          -Infinity
        ) {
          return true;
        }

        /*
         * Same projective depth quantity used by the
         * surface rasterizer. A tiny tolerance prevents
         * a curve lying on its own surface from flickering.
         */
        /*
         * Material curves lie on the boundary surface itself.
         *
         * Give them a tiny depth bias toward the camera so
         * sub-pixel differences between curve sampling and
         * triangle rasterization do not create false dashed
         * gaps along an otherwise visible curve.
         *
         * The bias is deliberately very small: genuinely
         * nearer torus branches still occlude the curve.
         */
        const curveDepthBias =
          2e-4;

        return (
          cameraDepthKey(
            point.depth
          ) +
            curveDepthBias >=
          surfaceDepth -
            5e-5
        );
      }


      function strokeThroughFadingBoundaryPolyline(
        points,
        strokeStyle,
        cssLineWidth,
        opacity
      ) {
        if (
          !Array.isArray(points) ||
          points.length < 2 ||
          opacity <= 1e-6
        ) {
          return;
        }

        context.save();

        context.beginPath();
        context.setLineDash([]);

        context.lineCap =
          "round";

        context.lineJoin =
          "round";

        context.globalAlpha =
          clamp(
            opacity,
            0,
            1
          );

        let penDown = false;

        const curveDepthBias =
          2e-4;

        for (
          let segmentIndex = 1;
          segmentIndex <
            points.length;
          segmentIndex += 1
        ) {
          const start =
            points[
              segmentIndex - 1
            ];

          const end =
            points[
              segmentIndex
            ];

          const deltaX =
            end.rasterX -
            start.rasterX;

          const deltaY =
            end.rasterY -
            start.rasterY;

          const steps =
            Math.max(
              1,
              Math.ceil(
                Math.hypot(
                  deltaX,
                  deltaY
                ) *
                1.25
              )
            );

          for (
            let stepIndex =
              segmentIndex === 1
                ? 0
                : 1;
            stepIndex <= steps;
            stepIndex += 1
          ) {
            const amount =
              stepIndex /
              steps;

            const point = {
              rasterX:
                start.rasterX +
                deltaX *
                  amount,

              rasterY:
                start.rasterY +
                deltaY *
                  amount,

              depth:
                start.depth +
                (
                  end.depth -
                  start.depth
                ) *
                  amount,
            };

            const pixelX =
              Math.floor(
                point.rasterX
              );

            const pixelY =
              Math.floor(
                point.rasterY
              );

            if (
              pixelX < 0 ||
              pixelX >= rasterWidth ||
              pixelY < 0 ||
              pixelY >= rasterHeight
            ) {
              penDown = false;
              continue;
            }

            /*
             * This pass is ONLY for the backside portion currently
             * hidden by the ordinary surface depth.
             *
             * Front-facing slope segments are already painted by
             * strokeDepthTestedPolyline(), so do not double-paint.
             */
            if (
              pointPassesSurfaceDepthTest(
                point
              )
            ) {
              penDown = false;
              continue;
            }

            const hardOccluderDepth =
              slopeOccluderDepthBuffer[
                pixelY *
                  rasterWidth +
                pixelX
              ];

            const clearOfHardOccluder =
              hardOccluderDepth ===
                -Infinity ||
              cameraDepthKey(
                point.depth
              ) +
                curveDepthBias >=
              hardOccluderDepth -
                5e-5;

            if (
              clearOfHardOccluder
            ) {
              if (!penDown) {
                context.moveTo(
                  point.rasterX,
                  point.rasterY
                );

                penDown = true;
              } else {
                context.lineTo(
                  point.rasterX,
                  point.rasterY
                );
              }
            } else {
              penDown = false;
            }
          }
        }

        context.strokeStyle =
          strokeStyle;

        context.lineWidth =
          cssLineWidth *
          rasterScale;

        context.stroke();

        context.restore();
      }


      function strokeOverlayPolyline(
        points,
        strokeStyle,
        cssLineWidth
      ) {
        if (
          !Array.isArray(points) ||
          points.length < 2
        ) {
          return;
        }

        context.save();

        context.beginPath();
        context.setLineDash([]);

        context.lineCap =
          "round";

        context.lineJoin =
          "round";

        context.moveTo(
          points[0].rasterX,
          points[0].rasterY
        );

        for (
          let index = 1;
          index < points.length;
          index += 1
        ) {
          context.lineTo(
            points[index].rasterX,
            points[index].rasterY
          );
        }

        context.strokeStyle =
          strokeStyle;

        context.lineWidth =
          cssLineWidth *
          rasterScale;

        context.stroke();
        context.restore();
      }


      function strokeDepthTestedPolyline(
        points,
        strokeStyle,
        cssLineWidth
      ) {
        if (
          !Array.isArray(points) ||
          points.length < 2
        ) {
          return;
        }

        context.save();

        context.beginPath();

        context.setLineDash([]);

        context.lineCap =
          "round";

        context.lineJoin =
          "round";

        let penDown = false;

        for (
          let segmentIndex = 1;
          segmentIndex <
            points.length;
          segmentIndex += 1
        ) {
          const start =
            points[
              segmentIndex - 1
            ];

          const end =
            points[
              segmentIndex
            ];

          const deltaX =
            end.rasterX -
            start.rasterX;

          const deltaY =
            end.rasterY -
            start.rasterY;

          const steps =
            Math.max(
              1,
              Math.ceil(
                Math.hypot(
                  deltaX,
                  deltaY
                ) *
                1.25
              )
            );

          for (
            let stepIndex =
              segmentIndex === 1
                ? 0
                : 1;
            stepIndex <= steps;
            stepIndex += 1
          ) {
            const amount =
              stepIndex /
              steps;

            const point = {
              rasterX:
                start.rasterX +
                deltaX *
                  amount,

              rasterY:
                start.rasterY +
                deltaY *
                  amount,

              depth:
                start.depth +
                (
                  end.depth -
                  start.depth
                ) *
                  amount,
            };

            if (
              pointPassesSurfaceDepthTest(
                point
              )
            ) {
              if (!penDown) {
                context.moveTo(
                  point.rasterX,
                  point.rasterY
                );

                penDown = true;
              } else {
                context.lineTo(
                  point.rasterX,
                  point.rasterY
                );
              }
            } else {
              penDown = false;
            }
          }
        }

        context.strokeStyle =
          strokeStyle;

        context.lineWidth =
          cssLineWidth *
          rasterScale;

        context.stroke();

        context.restore();
      }


      if (
        morphAmount <
          1 - 1e-6 &&
        hasExactFlatTarget
      ) {
        for (
          const mesh of
          transitionMeshes
        ) {
          if (
            !cuspBoundaryStillVisible(
              mesh.cuspIndex
            )
          ) {
            continue;
          }

          const splitRgb =
            mesh.cuspIndex === 0
              ? [255, 32, 32]
              : [77, 163, 255];

          const baseRgb =
            layers.split
              ? splitRgb
              : mesh.materialRgb;

          /*
           * Project every unique transition vertex once.
           * Do not recompute the three normal derivatives
           * separately for every tiny raster triangle.
           */
          const projected =
            mesh.vertices.map(
              (vertex) =>
                projectTransitionVertex(
                  mesh,
                  vertex
                )
            );

          for (
            const triangle of
            mesh.indices
          ) {
            rasterizeTriangle(
              projected[
                triangle[0]
              ],
              projected[
                triangle[1]
              ],
              projected[
                triangle[2]
              ],
              baseRgb
            );
          }
        }

        context.putImageData(
          zState.imageData,
          0,
          0
        );

        return;
      }


      if (layers.wireframe) {
        context.clearRect(
          0,
          0,
          rasterWidth,
          rasterHeight
        );

        context.strokeStyle =
          "rgba(247, 243, 233, 0.42)";

        context.lineWidth =
          Math.max(
            0.7,
            0.55 *
              rasterScale
          );

        for (
          const mesh of
          surfaceMeshes
        ) {
          if (
            !cuspBoundaryStillVisible(
              mesh.cuspIndex
            )
          ) {
            continue;
          }

          const projected =
            mesh.vertices.map(
              (uv) =>
                rasterPoint(
                  m129BoundaryProjectUVWithFill(
                    mesh.cuspIndex,
                    uv,
                    viewYawDegrees,
                    viewPitchDegrees,
                    viewZoom,
                    projection,
                    lambda,
                    epsilon,
                    rho
                  )
                )
            );

          for (
            const triangle of
            mesh.indices
          ) {
            const first =
              projected[
                triangle[0]
              ];

            const second =
              projected[
                triangle[1]
              ];

            const third =
              projected[
                triangle[2]
              ];

            const firstUV =
              mesh.vertices[
                triangle[0]
              ];

            const secondUV =
              mesh.vertices[
                triangle[1]
              ];

            const thirdUV =
              mesh.vertices[
                triangle[2]
              ];

            if (
              !trianglePassesProjectionHorizon(
                mesh.cuspIndex,
                firstUV,
                secondUV,
                thirdUV,
                first,
                second,
                third
              )
            ) {
              continue;
            }

            context.beginPath();
            context.moveTo(
              first.rasterX,
              first.rasterY
            );
            context.lineTo(
              second.rasterX,
              second.rasterY
            );
            context.lineTo(
              third.rasterX,
              third.rasterY
            );
            context.closePath();
            context.stroke();
          }
        }

        return;
      }

      for (
        const mesh of
        surfaceMeshes
      ) {
        if (
          !cuspBoundaryStillVisible(
            mesh.cuspIndex
          )
        ) {
          continue;
        }

        const projected =
          survivingCuspMorphActive
            ? projectAnimatedSurfaceMesh(
                mesh
              )
            : mesh.vertices.map(
                (uv) =>
                  projectSmoothVertex(
                    mesh.cuspIndex,
                    uv
                  )
              );

        /*
         * Triangle mode uses tetrahedral material colors.
         *
         * Rainbow mode is now generated continuously inside
         * rasterizeTriangle from the torus route coordinate,
         * so the obsolete per-triangle rainbow palette is
         * deliberately ignored here.
         */
        const splitRgb =
          mesh.cuspIndex === 0
            ? [232, 42, 42]
            : [77, 163, 255];

        const revealRaw =
          mesh.cuspIndex ===
            selectedCuspIndex
            ? clamp(
                Number(
                  fillingProgress
                ) /
                  M129_FILL_FADE_END,
                0,
                1
              )
            : 0;

        const revealAmount =
          revealRaw *
          revealRaw *
          (
            3 -
            2 * revealRaw
          );

        /*
         * ------------------------------------------------------
         * SURVIVING-CUSP REVEAL
         * ------------------------------------------------------
         *
         * If cusp 0 was manually hidden when Fill began, restore
         * it gradually during the final radial attachment:
         *
         *   incoming torus 86% -> 100%
         *
         * By fillingProgress = 1 the surviving cusp is fully
         * visible and ready to continue directly into the m004
         * Boundary morph.
         */
        const survivingCuspWasHidden =
          mesh.cuspIndex === 0 &&
          cuspVisibility?.[0] === false;

        const survivingRevealRaw =
          survivingCuspWasHidden
            ? clamp(
                Number(
                  survivingCuspReveal
                ),
                0,
                1
              )
            : 1;

        const survivingRevealAmount =
          survivingRevealRaw *
          survivingRevealRaw *
          (
            3 -
            2 *
              survivingRevealRaw
          );

        const surfaceOpacity =
          mesh.cuspIndex ===
            selectedCuspIndex
            ? (
                1 -
                revealAmount
              )
            : survivingCuspWasHidden
              ? survivingRevealAmount
              : 1;


        /*
         * ======================================================
         * NATIVE m004 TESSELLATION DURING FINAL HANDOFF
         * ======================================================
         *
         * Cusp 0 now uses the exact same finite barycentric display
         * topology as the native figure-eight Boundary.
         *
         * This removes the terminal:
         *
         *   smooth/rectangular mesh -> faceted m004 mesh
         *
         * switch that was still visible in the screenshots.
         */
        if (
          mesh.cuspIndex === 0 &&
          survivingCuspMorphActive &&
          !layers.wireframe
        ) {
          /*
           * Keep the successful moving material partition for most
           * of the animation.
           *
           * In the final 8%, settle every native fine facet onto
           * the material identity of its own m004 macro-triangle.
           *
           * Therefore the right-hand B0 region becomes completely
           * blue BEFORE renderer ownership changes, instead of
           * acquiring the last blue strip on the final frame.
           */
          const ownershipRaw =
            clamp(
              (
                Number(
                  survivingCuspMorph
                ) -
                0.92
              ) /
                0.08,
              0,
              1
            );

          const ownershipAmount =
            ownershipRaw *
            ownershipRaw *
            (
              3 -
              2 *
                ownershipRaw
            );


          for (
            const nativeMesh of
            nativeM004HandoffMeshes
          ) {
            /*
             * Project every unique barycentric vertex exactly once.
             *
             * m129BoundaryProjectUVWithFill() already performs:
             *
             *   m129 S3 geometry
             *       ->
             *   m004 S3 geometry
             *       ->
             *   exact native m004 screen framing.
             */
            const nativeProjected =
              nativeMesh.vertices
                .map(
                  (uv) => {
                    const point =
                      m129BoundaryProjectUVWithFill(
                        0,
                        uv,
                        viewYawDegrees,
                        viewPitchDegrees,
                        viewZoom,
                        projection,
                        lambda,
                        epsilon,
                        rho
                      );

                    return rasterPoint({
                      ...point,

                      rainbowRoute:
                        uv.v,

                      materialU:
                        uv.u,

                      materialV:
                        uv.v,

                      /*
                       * Replaced per fine triangle below by its
                       * native FLAT facet normal.
                       */
                      normalX: 0,
                      normalY: 0,
                      normalZ: 1,
                    });
                  }
                );


            for (
              const triangle of
              nativeMesh.indices
            ) {
              const firstBase =
                nativeProjected[
                  triangle[0]
                ];

              const secondBase =
                nativeProjected[
                  triangle[1]
                ];

              const thirdBase =
                nativeProjected[
                  triangle[2]
                ];

              const firstUV =
                nativeMesh.vertices[
                  triangle[0]
                ];

              const secondUV =
                nativeMesh.vertices[
                  triangle[1]
                ];

              const thirdUV =
                nativeMesh.vertices[
                  triangle[2]
                ];


              /*
               * NATIVE m004 PROJECTION-POLE RULE.
               *
               * Do NOT use trianglePassesProjectionHorizon() here.
               * That function intentionally uses the more
               * conservative m129 threshold:
               *
               *     |1 - w| >= 0.025
               *
               * The native figure-eight Boundary renderer actually
               * renders its barycentric cusp facets down to:
               *
               *     |1 - w| >= 0.012
               *
               * Using 0.025 here was deleting valid final-m004
               * facets during the penultimate handoff frame, which
               * produced the rough/jagged green and red regions that
               * suddenly filled in on renderer ownership change.
               */
              const nativeProjectionThreshold =
                0.012;

              const nativeFacetVisible =
                [
                  firstBase,
                  secondBase,
                  thirdBase,
                ].every(
                  (point) =>
                    Number.isFinite(
                      point
                        .stereographicDenominator
                    ) &&
                    Math.abs(
                      point
                        .stereographicDenominator
                    ) >=
                      nativeProjectionThreshold &&
                    Number.isFinite(
                      point.rasterX
                    ) &&
                    Number.isFinite(
                      point.rasterY
                    ) &&
                    Number.isFinite(
                      point.depth
                    )
                );

              if (
                !nativeFacetVisible
              ) {
                continue;
              }


              /*
               * EXACT native m004 facet-normal principle:
               *
               * the fine barycentric rendering triangle itself
               * determines one flat camera-space normal.
               */
              const ux =
                secondBase.cameraX -
                firstBase.cameraX;

              const uy =
                secondBase.cameraY -
                firstBase.cameraY;

              const uz =
                secondBase.cameraZ -
                firstBase.cameraZ;

              const vx =
                thirdBase.cameraX -
                firstBase.cameraX;

              const vy =
                thirdBase.cameraY -
                firstBase.cameraY;

              const vz =
                thirdBase.cameraZ -
                firstBase.cameraZ;

              const normalX =
                uy * vz -
                uz * vy;

              const normalY =
                uz * vx -
                ux * vz;

              const normalZ =
                ux * vy -
                uy * vx;

              const normalLength =
                Math.max(
                  1e-12,
                  Math.hypot(
                    normalX,
                    normalY,
                    normalZ
                  )
                );

              const nx =
                normalX /
                normalLength;

              const ny =
                normalY /
                normalLength;

              const nz =
                normalZ /
                normalLength;


              const first = {
                ...firstBase,
                normalX: nx,
                normalY: ny,
                normalZ: nz,
              };

              const second = {
                ...secondBase,
                normalX: nx,
                normalY: ny,
                normalZ: nz,
              };

              const third = {
                ...thirdBase,
                normalX: nx,
                normalY: ny,
                normalZ: nz,
              };


              /*
               * Determine the color from the CURRENT moving
               * material partition at this fine facet's centroid.
               */
              const centroidU =
                (
                  firstUV.u +
                  secondUV.u +
                  thirdUV.u
                ) /
                3;

              const centroidV =
                (
                  firstUV.v +
                  secondUV.v +
                  thirdUV.v
                ) /
                3;

              const movingRgb =
                materialRgbAt(
                  survivingHandoffMaterialTriangles,
                  centroidU,
                  centroidV,
                  nativeMesh.targetRgb
                );


              /*
               * Complete material ownership before the semantic
               * m129 -> m004 state switch.
               */
              const baseRgb =
                movingRgb.map(
                  (
                    channel,
                    channelIndex
                  ) =>
                    Math.round(
                      channel +
                      (
                        nativeMesh
                          .targetRgb[
                            channelIndex
                          ] -
                        channel
                      ) *
                        ownershipAmount
                    )
                );


              rasterizeTriangle(
                first,
                second,
                third,
                baseRgb,
                null,
                surfaceOpacity,

                /*
                 * Material is already resolved at the native fine
                 * facet level. Do not reclassify pixels through the
                 * old rectangular m129 material lookup.
                 */
                true,

                mesh.cuspIndex !==
                  selectedCuspIndex
              );
            }
          }


          /*
           * Critical:
           *
           * Do NOT also render the old rectangular cusp-0 mesh.
           * There must be exactly one visible surface owner during
           * the handoff.
           */
          continue;
        }


        /*
         * During the final m129 -> m004 handoff, cusp 0's visible
         * tetrahedral partition is itself part of the animation.
         *
         * Do not freeze the source m129 material colors.
         */
        const transportingM004Materials =
          mesh.cuspIndex === 0 &&
          survivingCuspMorphActive &&
          !layers.split;

        const activeMaterialTriangles =
          transportingM004Materials
            ? survivingHandoffMaterialTriangles
            : mesh.materialTriangles;


        for (
          let triangleIndex = 0;
          triangleIndex <
            mesh.indices.length;
          triangleIndex += 1
        ) {
          const triangle =
            mesh.indices[
              triangleIndex
            ];

          const baseRgb =
            layers.split
              ? splitRgb
              : (
                  mesh
                    .triangleMaterialRgb[
                      triangleIndex
                    ] ??
                  [217, 209, 189]
                );
          const first =
            projected[
              triangle[0]
            ];

          const second =
            projected[
              triangle[1]
            ];

          const third =
            projected[
              triangle[2]
            ];

          const firstUV =
            mesh.vertices[
              triangle[0]
            ];

          const secondUV =
            mesh.vertices[
              triangle[1]
            ];

          const thirdUV =
            mesh.vertices[
              triangle[2]
            ];

          if (
            !trianglePassesProjectionHorizon(
              mesh.cuspIndex,
              firstUV,
              secondUV,
              thirdUV,
              first,
              second,
              third
            )
          ) {
            continue;
          }

          rasterizeTriangle(
            first,
            second,
            third,
            baseRgb,
            activeMaterialTriangles,
            surfaceOpacity,

            /*
             * The old performance shortcut remains valid for any
             * non-transported animated surface.
             *
             * Cusp 0 must NOT use it during this handoff because its
             * material boundaries are actually moving.
             */
            survivingCuspMorphActive &&
              !transportingM004Materials,

            mesh.cuspIndex !==
              selectedCuspIndex
          );
        }
      }

      context.putImageData(
        zState.imageData,
        0,
        0
      );


      /*
       * ========================================================
       * INCOMING SOLID TORUS — PHASE 1B
       * ========================================================
       *
       * Timeline:
       *
       *   0.00 -> 0.18
       *     existing cusp becomes translucent
       *
       *   0.16 -> 0.28
       *     incoming core appears
       *
       *   0.24 -> 0.56
       *     solid torus grows outward from that core
       *
       * Growth stops at 86% of the existing cusp radius.
       *
       * That leaves a visible gap for the next phase:
       *
       *     change attachment map
       *     -> align incoming meridian with selected slope
       *     -> finish the final 14%
       *
       * This surface is intentionally rendered as a separate
       * explanatory object. The old translucent cusp remains in
       * place around it.
       */
      if (
        Number(fillingProgress) >
          M129_FILL_FADE_END &&
        Number(fillingProgress) <
          1
      ) {
        const growthRaw =
          clamp(
            (
              Number(
                fillingProgress
              ) -
              M129_FILL_FADE_END
            ) /
              (
                M129_FILL_GROWTH_END -
                M129_FILL_FADE_END
              ),
            0,
            1
          );

        const growthAmount =
          growthRaw *
          growthRaw *
          (
            3 -
            2 * growthRaw
          );

        const incomingRhoAt86Percent =
          0.002 +
          (
            rho * 0.86 -
            0.002
          ) *
            growthAmount;


        /*
         * ------------------------------------------------------
         * PHASE 2B — GLUING-MAP CORRESPONDENCE
         * ------------------------------------------------------
         *
         * Do NOT continuously deform the incoming torus through
         * non-integral boundary maps.
         *
         * The incoming torus stays geometrically fixed.
         *
         * Instead we visualize the actual endpoint identification:
         *
         *   x on incoming boundary
         *       ->
         *   phi(x) on old cusp boundary
         *
         * where phi is the chosen SL(2,Z) gluing map.
         */
        const alignmentRaw =
          clamp(
            (
              Number(
                fillingProgress
              ) -
              M129_FILL_SLOPE_END
            ) /
              (
                M129_FILL_ALIGNMENT_END -
                M129_FILL_SLOPE_END
              ),
            0,
            1
          );

        const alignmentAmount =
          alignmentRaw *
          alignmentRaw *
          (
            3 -
            2 * alignmentRaw
          );


        /*
         * ------------------------------------------------------
         * PHASE 2C — FINAL RADIAL ATTACHMENT
         * ------------------------------------------------------
         *
         * The winding phase is already COMPLETE before this starts.
         *
         * Hold the incoming meridian fixed in its final
         *
         *   (p,q)
         *
         * homology class, and now expand the incoming solid torus
         * from 86% radius to the full receiving-boundary radius.
         *
         * This makes the final identification visually literal:
         * the already-wound gold curve approaches the waiting gold
         * slope without changing its winding any further.
         */
        const finalGrowthRaw =
          clamp(
            (
              Number(
                fillingProgress
              ) -
              M129_FILL_ALIGNMENT_END
            ) /
              (
                1 -
                M129_FILL_ALIGNMENT_END
              ),
            0,
            1
          );

        const finalGrowthAmount =
          finalGrowthRaw *
          finalGrowthRaw *
          (
            3 -
            2 * finalGrowthRaw
          );

        const incomingRho =
          incomingRhoAt86Percent +
          (
            rho -
            incomingRhoAt86Percent
          ) *
            finalGrowthAmount;


        const fillingBasis =
          primitiveSlopeBasis(
            fillingSlope?.p ?? 1,
            fillingSlope?.q ?? 0
          );


        function mappedBoundaryUV(
          u,
          v
        ) {
          return {
            u:
              fillingBasis.p * u +
              fillingBasis.r * v,

            v:
              fillingBasis.q * u +
              fillingBasis.s * v,
          };
        }


        /*
         * A lighter mesh is enough for this explanatory object.
         *
         * It is still sampled from the exact same analytic m129
         * S³ tube geometry as the old boundary.
         */
        const incomingRouteSegments =
          Math.max(
            48,
            subdivisions * 8
          );

        const incomingMinorSegments =
          Math.max(
            24,
            subdivisions * 3
          );


        const projectedIncomingGrid =
          [];

        for (
          let routeIndex = 0;
          routeIndex <=
            incomingRouteSegments;
          routeIndex += 1
        ) {
          const row = [];

          const v =
            routeIndex /
            incomingRouteSegments;

          for (
            let minorIndex = 0;
            minorIndex <=
              incomingMinorSegments;
            minorIndex += 1
          ) {
            const u =
              minorIndex /
              incomingMinorSegments;

            row.push({
              ...rasterPoint(
                m129BoundaryProjectUVWithFill(
                  selectedCuspIndex,
                  {
                    u,
                    v,
                  },
                  viewYawDegrees,
                  viewPitchDegrees,
                  viewZoom,
                  projection,
                  lambda,
                  epsilon,
                  incomingRho
                )
              ),

              /*
               * Preserve exact continuous material coordinates.
               *
               * Material boundaries will now be decided per pixel
               * rather than snapped to rendering patches.
               */
              materialU: u,
              materialV: v,
            });
          }

          projectedIncomingGrid.push(
            row
          );
        }


        /*
         * ------------------------------------------------------
         * SMOOTH NORMALS FOR THE INCOMING SOLID TORUS
         * ------------------------------------------------------
         *
         * The surface grid is already dense and periodic.
         * Recover a smooth camera-space normal from neighboring
         * grid vertices exactly as we do for the optimized final
         * boundary handoff.
         *
         * This removes flat patch-by-patch lighting without
         * increasing geometric resolution.
         */
        for (
          let routeIndex = 0;
          routeIndex <=
            incomingRouteSegments;
          routeIndex += 1
        ) {
          const routeBase =
            routeIndex ===
              incomingRouteSegments
              ? 0
              : routeIndex;

          const previousRoute =
            (
              routeBase -
              1 +
              incomingRouteSegments
            ) %
            incomingRouteSegments;

          const nextRoute =
            (
              routeBase +
              1
            ) %
            incomingRouteSegments;

          for (
            let minorIndex = 0;
            minorIndex <=
              incomingMinorSegments;
            minorIndex += 1
          ) {
            const minorBase =
              minorIndex ===
                incomingMinorSegments
                ? 0
                : minorIndex;

            const previousMinor =
              (
                minorBase -
                1 +
                incomingMinorSegments
              ) %
              incomingMinorSegments;

            const nextMinor =
              (
                minorBase +
                1
              ) %
              incomingMinorSegments;

            const point =
              projectedIncomingGrid[
                routeIndex
              ][
                minorIndex
              ];

            const routeBefore =
              projectedIncomingGrid[
                previousRoute
              ][
                minorBase
              ];

            const routeAfter =
              projectedIncomingGrid[
                nextRoute
              ][
                minorBase
              ];

            const minorBefore =
              projectedIncomingGrid[
                routeBase
              ][
                previousMinor
              ];

            const minorAfter =
              projectedIncomingGrid[
                routeBase
              ][
                nextMinor
              ];

            const tangentRouteX =
              routeAfter.cameraX -
              routeBefore.cameraX;

            const tangentRouteY =
              routeAfter.cameraY -
              routeBefore.cameraY;

            const tangentRouteZ =
              routeAfter.cameraZ -
              routeBefore.cameraZ;

            const tangentMinorX =
              minorAfter.cameraX -
              minorBefore.cameraX;

            const tangentMinorY =
              minorAfter.cameraY -
              minorBefore.cameraY;

            const tangentMinorZ =
              minorAfter.cameraZ -
              minorBefore.cameraZ;

            const normalX =
              tangentMinorY *
                tangentRouteZ -
              tangentMinorZ *
                tangentRouteY;

            const normalY =
              tangentMinorZ *
                tangentRouteX -
              tangentMinorX *
                tangentRouteZ;

            const normalZ =
              tangentMinorX *
                tangentRouteY -
              tangentMinorY *
                tangentRouteX;

            const normalLength =
              Math.max(
                1e-12,
                Math.hypot(
                  normalX,
                  normalY,
                  normalZ
                )
              );

            point.normalX =
              normalX /
              normalLength;

            point.normalY =
              normalY /
              normalLength;

            point.normalZ =
              normalZ /
              normalLength;
          }
        }


        /*
         * Painter-sort the small surface patches from far to near.
         *
         * This gives the growing torus its own visible 3D form
         * without allowing the translucent old boundary to erase it.
         */
        const incomingMaterialTriangles =
          surfaceMeshes.find(
            (mesh) =>
              mesh.cuspIndex ===
              selectedCuspIndex
          )?.materialTriangles ?? [];

        /*
         * ------------------------------------------------------
         * SHARED DEPTH BUFFER FOR THE INCOMING SOLID TORUS
         * ------------------------------------------------------
         *
         * The ordinary m129 boundary has already populated
         *
         *   depthBuffer
         *
         * with its visible surface.
         *
         * The filling torus must participate in that SAME depth
         * ordering. A separate painter pass cannot know whether
         * another boundary component is in front of it.
         *
         * Use a transparent overlay ImageData for color, but use
         * the EXISTING shared depthBuffer for visibility.
         */
        let incomingOverlayCanvas =
          canvas.__m129IncomingOverlayCanvas;

        if (
          !incomingOverlayCanvas
        ) {
          incomingOverlayCanvas =
            document.createElement(
              "canvas"
            );

          canvas.__m129IncomingOverlayCanvas =
            incomingOverlayCanvas;
        }

        if (
          incomingOverlayCanvas.width !==
            rasterWidth ||
          incomingOverlayCanvas.height !==
            rasterHeight
        ) {
          incomingOverlayCanvas.width =
            rasterWidth;

          incomingOverlayCanvas.height =
            rasterHeight;
        }

        const incomingOverlayContext =
          incomingOverlayCanvas.getContext(
            "2d"
          );

        const incomingOverlayImage =
          incomingOverlayContext
            .createImageData(
              rasterWidth,
              rasterHeight
            );

        const incomingOverlayPixels =
          incomingOverlayImage.data;


        function cssRgbChannels(
          color
        ) {
          const match =
            /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i
              .exec(
                String(color)
              );

          if (!match) {
            return [
              217,
              209,
              189,
            ];
          }

          return [
            Number(match[1]),
            Number(match[2]),
            Number(match[3]),
          ];
        }


        function rasterizeIncomingTriangle(
          first,
          second,
          third,
          fallbackRgb
        ) {
          const x0 =
            first.rasterX;

          const y0 =
            first.rasterY;

          const x1 =
            second.rasterX;

          const y1 =
            second.rasterY;

          const x2 =
            third.rasterX;

          const y2 =
            third.rasterY;

          const area =
            (
              x1 - x0
            ) *
              (
                y2 - y0
              ) -
            (
              y1 - y0
            ) *
              (
                x2 - x0
              );

          if (
            Math.abs(area) <
            1e-10
          ) {
            return;
          }

          const inverseArea =
            1 / area;

          const minimumX =
            Math.max(
              0,
              Math.floor(
                Math.min(
                  x0,
                  x1,
                  x2
                )
              )
            );

          const maximumX =
            Math.min(
              rasterWidth - 1,
              Math.ceil(
                Math.max(
                  x0,
                  x1,
                  x2
                )
              )
            );

          const minimumY =
            Math.max(
              0,
              Math.floor(
                Math.min(
                  y0,
                  y1,
                  y2
                )
              )
            );

          const maximumY =
            Math.min(
              rasterHeight - 1,
              Math.ceil(
                Math.max(
                  y0,
                  y1,
                  y2
                )
              )
            );

          if (
            maximumX < minimumX ||
            maximumY < minimumY
          ) {
            return;
          }

          const depth0 =
            cameraDepthKey(
              first.depth
            );

          const depth1 =
            cameraDepthKey(
              second.depth
            );

          const depth2 =
            cameraDepthKey(
              third.depth
            );

          /*
           * Same small negative edge tolerance as an ordinary
           * software triangle rasterizer: avoid microscopic cracks
           * between the two triangles making up each torus patch.
           */
          const edgeTolerance =
            -1e-7;

          for (
            let pixelY =
              minimumY;
            pixelY <=
              maximumY;
            pixelY += 1
          ) {
            const sampleY =
              pixelY + 0.5;

            for (
              let pixelX =
                minimumX;
              pixelX <=
                maximumX;
              pixelX += 1
            ) {
              const sampleX =
                pixelX + 0.5;

              const weight1 =
                (
                  (
                    sampleX - x0
                  ) *
                    (
                      y2 - y0
                    ) -
                  (
                    sampleY - y0
                  ) *
                    (
                      x2 - x0
                    )
                ) *
                inverseArea;

              const weight2 =
                (
                  (
                    x1 - x0
                  ) *
                    (
                      sampleY - y0
                    ) -
                  (
                    y1 - y0
                  ) *
                    (
                      sampleX - x0
                    )
                ) *
                inverseArea;

              const weight0 =
                1 -
                weight1 -
                weight2;

              if (
                weight0 <
                  edgeTolerance ||
                weight1 <
                  edgeTolerance ||
                weight2 <
                  edgeTolerance
              ) {
                continue;
              }

              const depth =
                weight0 *
                  depth0 +
                weight1 *
                  depth1 +
                weight2 *
                  depth2;

              const index =
                pixelY *
                  rasterWidth +
                pixelX;

              /*
               * The filling solid torus is opaque to the selected
               * slope. Record it in the hard-occluder buffer even
               * if another surface happens to win the ordinary
               * visible z-buffer at this pixel.
               */
              if (
                depth >=
                  slopeOccluderDepthBuffer[
                    index
                  ]
              ) {
                slopeOccluderDepthBuffer[
                  index
                ] =
                  depth;
              }

              /*
               * Larger cameraDepthKey = nearer.
               *
               * This is the SAME comparison used by the existing
               * m129 surface rasterizer.
               */
              if (
                depth <
                depthBuffer[index]
              ) {
                continue;
              }

              /*
               * The incoming torus is now itself a real occluding
               * surface for everything subsequently tested.
               */
              depthBuffer[index] =
                depth;

              const colorIndex =
                index * 4;


              /*
               * --------------------------------------------------
               * EXACT MATERIAL AT THIS PIXEL
               * --------------------------------------------------
               *
               * Do not assign the whole rendering cell the material
               * found at its center.
               *
               * Interpolate the continuous torus coordinates here
               * and evaluate the certified tetrahedral material
               * boundary at the actual pixel.
               */
              const materialU =
                weight0 *
                  first.materialU +
                weight1 *
                  second.materialU +
                weight2 *
                  third.materialU;

              const materialV =
                weight0 *
                  first.materialV +
                weight1 *
                  second.materialV +
                weight2 *
                  third.materialV;

              const pixelBaseRgb =
                fillingStartedInSplit
                  ? fallbackRgb
                  : materialRgbAt(
                      incomingMaterialTriangles,
                      materialU,
                      materialV,
                      fallbackRgb
                    );


              /*
               * --------------------------------------------------
               * SMOOTH PER-PIXEL LIGHTING
               * --------------------------------------------------
               *
               * Interpolate the smooth vertex normals instead of
               * assigning one flat normal to the whole patch.
               */
              const normalX =
                weight0 *
                  first.normalX +
                weight1 *
                  second.normalX +
                weight2 *
                  third.normalX;

              const normalY =
                weight0 *
                  first.normalY +
                weight1 *
                  second.normalY +
                weight2 *
                  third.normalY;

              const normalZ =
                weight0 *
                  first.normalZ +
                weight1 *
                  second.normalZ +
                weight2 *
                  third.normalZ;

              const normalLength =
                Math.max(
                  1e-12,
                  Math.hypot(
                    normalX,
                    normalY,
                    normalZ
                  )
                );

              const diffuse =
                Math.pow(
                  Math.abs(
                    (
                      normalX /
                      normalLength
                    ) *
                      M129_BOUNDARY_LIGHT_DIRECTION.x +
                    (
                      normalY /
                      normalLength
                    ) *
                      M129_BOUNDARY_LIGHT_DIRECTION.y +
                    (
                      normalZ /
                      normalLength
                    ) *
                      M129_BOUNDARY_LIGHT_DIRECTION.z
                  ),
                  0.85
                );

              const contrastAmount =
                1.20;

              const lightFactor =
                clamp(
                  1 -
                    contrastAmount *
                    (
                      1 -
                      diffuse
                    ) *
                    0.55,
                  0.10,
                  1
                );

              incomingOverlayPixels[
                colorIndex
              ] =
                Math.round(
                  pixelBaseRgb[0] *
                  lightFactor
                );

              incomingOverlayPixels[
                colorIndex + 1
              ] =
                Math.round(
                  pixelBaseRgb[1] *
                  lightFactor
                );

              incomingOverlayPixels[
                colorIndex + 2
              ] =
                Math.round(
                  pixelBaseRgb[2] *
                  lightFactor
                );

              incomingOverlayPixels[
                colorIndex + 3
              ] =
                255;
            }
          }
        }


        const incomingPatches = [];

        for (
          let routeIndex = 0;
          routeIndex <
            incomingRouteSegments;
          routeIndex += 1
        ) {
          for (
            let minorIndex = 0;
            minorIndex <
              incomingMinorSegments;
            minorIndex += 1
          ) {
            const first =
              projectedIncomingGrid[
                routeIndex
              ][
                minorIndex
              ];

            const second =
              projectedIncomingGrid[
                routeIndex + 1
              ][
                minorIndex
              ];

            const third =
              projectedIncomingGrid[
                routeIndex + 1
              ][
                minorIndex + 1
              ];

            const fourth =
              projectedIncomingGrid[
                routeIndex
              ][
                minorIndex + 1
              ];


            /*
             * Do not draw patches that encounter the
             * stereographic projection horizon.
             */
            if (
              [
                first,
                second,
                third,
                fourth,
              ].some(
                (point) =>
                  !Number.isFinite(
                    point.rasterX
                  ) ||
                  !Number.isFinite(
                    point.rasterY
                  ) ||
                  point
                    .stereographicDenominator <=
                    0.025
              )
            ) {
              continue;
            }


            const materialU =
              (
                minorIndex +
                0.5
              ) /
              incomingMinorSegments;

            const materialV =
              (
                routeIndex +
                0.5
              ) /
              incomingRouteSegments;

            const materialRgb =
              materialRgbAt(
                incomingMaterialTriangles,
                materialU,
                materialV,
                [217, 209, 189]
              );

            const splitRgb =
              selectedCuspIndex === 0
                ? [255, 32, 32]
                : [77, 163, 255];

            const incomingRgb =
              fillingStartedInSplit
                ? splitRgb
                : materialRgb;

            incomingPatches.push({
              points: [
                first,
                second,
                third,
                fourth,
              ],

              rgb:
                incomingRgb,

              routeIndex,
              minorIndex,

              depth:
                (
                  first.depth +
                  second.depth +
                  third.depth +
                  fourth.depth
                ) /
                4,
            });
          }
        }


        /*
         * Larger depth is nearer in the existing m129 camera
         * convention, so painter rendering goes smallest -> largest.
         */
        incomingPatches.sort(
          (left, right) =>
            left.depth -
            right.depth
        );


        /*
         * VISUAL coordinate-grid density.
         *
         * These are now true material curves on the torus.
         * They are independent of the rendering triangulation.
         */
        const visibleRouteGridLines =
          10;

        const visibleMinorGridLines =
          8;


        context.save();

        context.lineJoin =
          "round";

        context.lineCap =
          "round";


        for (
          const patch of
          incomingPatches
        ) {
          const [
            first,
            second,
            third,
            fourth,
          ] =
            patch.points;

          const patchRgb =
            patch.rgb;


          /*
           * Two triangles make the rendering quadrilateral.
           *
           * Their geometry is still the same dense mesh, but
           * material identity and lighting are now resolved
           * continuously PER PIXEL inside the rasterizer.
           *
           * Therefore the rendering triangulation should no longer
           * be visually apparent.
           */
          rasterizeIncomingTriangle(
            first,
            second,
            third,
            patchRgb
          );

          rasterizeIncomingTriangle(
            first,
            third,
            fourth,
            patchRgb
          );


        }


        /*
         * The overlay contains ONLY incoming-torus pixels that
         * survived the shared depth test.
         *
         * Transparent pixels leave the already-rendered boundary
         * untouched.
         */
        incomingOverlayContext
          .putImageData(
            incomingOverlayImage,
            0,
            0
          );

        context.drawImage(
          incomingOverlayCanvas,
          0,
          0
        );


        context.restore();


        /*
         * Draw the incoming torus reference curves directly on
         * the torus surface.
         *
         *   white = incoming longitude
         *   gold  = incoming meridian
         *
         * The meridian is the one being carried by the attachment
         * map toward the selected filling slope.
         */
        const incomingCurveSamples =
          Math.max(
            240,
            80 *
              (
                Math.abs(
                  fillingBasis.p
                ) +
                Math.abs(
                  fillingBasis.q
                ) +
                2
              )
          );


        /*
         * Display-only interpolation in the lifted peripheral
         * coordinate plane.
         *
         * This is used ONLY to draw the changing reference curves
         * on the incoming torus. It is not being treated as a
         * continuous family of torus homeomorphisms.
         */
        function incomingCurveUV(
          u,
          v
        ) {
          const targetU =
            fillingBasis.p * u +
            fillingBasis.r * v;

          const targetV =
            fillingBasis.q * u +
            fillingBasis.s * v;

          return {
            u:
              u +
              (
                targetU -
                u
              ) *
                alignmentAmount,

            v:
              v +
              (
                targetV -
                v
              ) *
                alignmentAmount,
          };
        }


        /*
         * ------------------------------------------------------
         * SMOOTH FILLING-TORUS COORDINATE GRID
         * ------------------------------------------------------
         *
         * Do NOT draw rendering-mesh edges.
         *
         * Each visible grid line is one continuously sampled
         * material curve on the analytic torus.
         *
         * The SAME incomingCurveUV(...) map used by the animated
         * meridian and longitude is applied here, so the entire
         * coordinate lattice shears smoothly during the filling
         * basis change.
         */
        const incomingGridSamples =
          Math.max(
            360,
            incomingRouteSegments * 2
          );


        /*
         * Constant-u curves:
         *
         * run in the longitude / route direction.
         */
        for (
          let familyIndex = 0;
          familyIndex <
            visibleMinorGridLines;
          familyIndex += 1
        ) {
          const fixedU =
            familyIndex /
            visibleMinorGridLines;

          const points =
            Array.from(
              {
                length:
                  incomingGridSamples + 1,
              },
              (_, sampleIndex) => {
                const t =
                  sampleIndex /
                  incomingGridSamples;

                const uv =
                  incomingCurveUV(
                    fixedU,
                    t
                  );

                return rasterPoint(
                  m129BoundaryProjectUVWithFill(
                    selectedCuspIndex,
                    uv,
                    viewYawDegrees,
                    viewPitchDegrees,
                    viewZoom,
                    projection,
                    lambda,
                    epsilon,
                    incomingRho
                  )
                );
              }
            );

          strokeDepthTestedPolyline(
            points,
            "rgba(6, 6, 6, 0.78)",
            0.82
          );
        }


        /*
         * Constant-v curves:
         *
         * run around the minor-circle / meridian direction.
         */
        for (
          let familyIndex = 0;
          familyIndex <
            visibleRouteGridLines;
          familyIndex += 1
        ) {
          const fixedV =
            familyIndex /
            visibleRouteGridLines;

          const points =
            Array.from(
              {
                length:
                  incomingGridSamples + 1,
              },
              (_, sampleIndex) => {
                const t =
                  sampleIndex /
                  incomingGridSamples;

                const uv =
                  incomingCurveUV(
                    t,
                    fixedV
                  );

                return rasterPoint(
                  m129BoundaryProjectUVWithFill(
                    selectedCuspIndex,
                    uv,
                    viewYawDegrees,
                    viewPitchDegrees,
                    viewZoom,
                    projection,
                    lambda,
                    epsilon,
                    incomingRho
                  )
                );
              }
            );

          strokeDepthTestedPolyline(
            points,
            "rgba(6, 6, 6, 0.78)",
            0.82
          );
        }


        /*
         * Draw the filling-torus peripheral markings only AFTER
         * the solid torus has finished growing to 86%.
         *
         * 10–12 s:
         *   markings draw onto the stationary torus
         *
         * 12–18 s:
         *   markings then undergo the attachment-map winding
         */
        const slopeDrawRaw =
          clamp(
            (
              Number(
                fillingProgress
              ) -
              M129_FILL_GROWTH_END
            ) /
              (
                M129_FILL_SLOPE_END -
                M129_FILL_GROWTH_END
              ),
            0,
            1
          );

        const slopeDrawAmount =
          slopeDrawRaw *
          slopeDrawRaw *
          (
            3 -
            2 *
              slopeDrawRaw
          );


        const incomingMeridianPoints =
          Array.from(
            {
              length:
                incomingCurveSamples +
                1,
            },
            (_, index) => {
              const t =
                index /
                incomingCurveSamples;

              const uv =
                incomingCurveUV(
                  t,
                  0
                );

              return rasterPoint(
                m129BoundaryProjectUVWithFill(
                  selectedCuspIndex,
                  uv,
                  viewYawDegrees,
                  viewPitchDegrees,
                  viewZoom,
                  projection,
                  lambda,
                  epsilon,
                  incomingRho
                )
              );
            }
          );

        const incomingLongitudePoints =
          Array.from(
            {
              length:
                incomingCurveSamples +
                1,
            },
            (_, index) => {
              const t =
                index /
                incomingCurveSamples;

              const uv =
                incomingCurveUV(
                  0,
                  t
                );

              return rasterPoint(
                m129BoundaryProjectUVWithFill(
                  selectedCuspIndex,
                  uv,
                  viewYawDegrees,
                  viewPitchDegrees,
                  viewZoom,
                  projection,
                  lambda,
                  epsilon,
                  incomingRho
                )
              );
            }
          );

        if (slopeDrawAmount > 1e-6) {
          strokeDepthTestedPolyline(
            incomingLongitudePoints,
            `rgba(10, 10, 10, ${
              0.96 * slopeDrawAmount
            })`,
            3.2
          );

          strokeDepthTestedPolyline(
            incomingLongitudePoints,
            `rgba(250, 250, 250, ${
              0.98 * slopeDrawAmount
            })`,
            1.5
          );

          strokeDepthTestedPolyline(
            incomingMeridianPoints,
            `rgba(8, 8, 8, ${
              0.98 * slopeDrawAmount
            })`,
            4.4
          );

          strokeDepthTestedPolyline(
            incomingMeridianPoints,
            `rgba(255, 214, 96, ${
              0.99 * slopeDrawAmount
            })`,
            2.4
          );
        }


      }


      /*
       * m129 MERIDIAN
       *
       * Match the established figure-eight Boundary:
       *
       *   - material curve lives on the torus surface
       *   - same software z-buffer decides visibility
       *   - dark under-stroke
       *   - thin white visible stroke
       *
       * Each cusp gets its own meridian u: 0 -> 1
       * at fixed longitude v = 0.
       */
      if (layers.meridian) {
        for (
          const cuspIndex of [0, 1]
        ) {
          if (
            !cuspBoundaryStillVisible(
              cuspIndex
            )
          ) {
            continue;
          }

          const meridianPoints =
            m129BoundarySampleUVSegment(
              {
                u: 0,
                v: 0,
              },
              {
                u: 1,
                v: 0,
              },
              160
            ).map(
              (uv) =>
                rasterPoint(
                  m129BoundaryProjectUVWithFill(
                    cuspIndex,
                    uv,
                    viewYawDegrees,
                    viewPitchDegrees,
                    viewZoom,
                    projection,
                    lambda,
                    epsilon,
                    rho
                  )
                )
            );

          /*
           * Established Boundary convention:
           *
           *   meridian = black
           */
          strokeDepthTestedPolyline(
            meridianPoints,
            "rgba(5, 5, 5, 0.98)",
            1.8
          );
        }
      }


      if (layers.longitude) {
        for (
          const cuspIndex of [0, 1]
        ) {
          if (
            !cuspBoundaryStillVisible(
              cuspIndex
            )
          ) {
            continue;
          }

          const longitudePoints =
            m129BoundarySampleUVSegment(
              {
                u: 0,
                v: 0,
              },
              {
                u: 0,
                v: 1,
              },
              320
            ).map(
              (uv) =>
                rasterPoint(
                  m129BoundaryProjectUVWithFill(
                    cuspIndex,
                    uv,
                    viewYawDegrees,
                    viewPitchDegrees,
                    viewZoom,
                    projection,
                    lambda,
                    epsilon,
                    rho
                  )
                )
            );

          /*
           * Established Boundary convention:
           *
           *   longitude = white
           *
           * As with the meridian, this is a material
           * curve on the torus and therefore obeys the
           * same surface depth test.
           */
          strokeDepthTestedPolyline(
            longitudePoints,
            "rgba(255, 255, 255, 0.98)",
            1.8
          );
        }
      }


      /*
       * --------------------------------------------------------
       * INCOMING SOLID-TORUS CORE
       * --------------------------------------------------------
       *
       * Phase 1 begins after the selected cusp has become
       * translucent.
       *
       * The solid torus starts from its core curve:
       *
       *   rho -> 0
       *
       * and will grow outward from this same curve in the next
       * phase.
       */
      if (
        Number(fillingProgress) >
          M129_FILL_FADE_END &&
        Number(fillingProgress) <
          1
      ) {
        const coreFadeRaw =
          clamp(
            (
              Number(
                fillingProgress
              ) -
              M129_FILL_FADE_END
            ) /
              (
                400 /
                M129_FILL_DURATION_MS
              ),
            0,
            1
          );

        const coreFadeIn =
          coreFadeRaw *
          coreFadeRaw *
          (
            3 -
            2 * coreFadeRaw
          );

        const coreFadeOutRaw =
          clamp(
            (
              Number(
                fillingProgress
              ) -
              (
                M129_FILL_FADE_END +
                900 /
                  M129_FILL_DURATION_MS
              )
            ) /
              (
                900 /
                M129_FILL_DURATION_MS
              ),
            0,
            1
          );

        const coreFadeOut =
          coreFadeOutRaw *
          coreFadeOutRaw *
          (
            3 -
            2 * coreFadeOutRaw
          );

        const coreFade =
          coreFadeIn *
          (
            1 -
            coreFadeOut
          );

        const corePoints =
          m129BoundarySampleUVSegment(
            {
              u: 0,
              v: 0,
            },
            {
              u: 0,
              v: 1,
            },
            480
          ).map(
            (uv) =>
              rasterPoint(
                m129BoundaryProjectUVWithFill(
                  selectedCuspIndex,
                  uv,
                  viewYawDegrees,
                  viewPitchDegrees,
                  viewZoom,
                  projection,
                  lambda,
                  epsilon,
                  0.002
                )
              )
          );

        /*
         * Neutral ivory core:
         *
         * distinct from
         *   red / blue = existing boundary components
         *   gold       = selected filling slope
         */
        strokeDepthTestedPolyline(
          corePoints,
          `rgba(8, 8, 8, ${
            0.88 * coreFade
          })`,
          4.0
        );

        strokeDepthTestedPolyline(
          corePoints,
          `rgba(239, 231, 205, ${
            0.98 * coreFade
          })`,
          2.1
        );
      }


      /*
       * SELECTED DEHN-FILLING SLOPE
       *
       * Peripheral coordinates are already:
       *
       *   u = meridian coefficient
       *   v = longitude coefficient
       *
       * so the primitive slope p mu + q lambda is represented by
       *
       *   (u(t), v(t)) = (p t, q t),  0 <= t <= 1.
       *
       * Because the torus coordinates are periodic, the endpoint
       * closes exactly on the starting point whenever p,q are
       * integers.
       */
      if (
        Number(
          fillingProgress
        ) < 1 &&
        fillingSlope &&
        Number.isFinite(
          fillingSlope.p
        ) &&
        Number.isFinite(
          fillingSlope.q
        ) &&
        (
          fillingSlope.p !== 0 ||
          fillingSlope.q !== 0
        )
      ) {
        const p =
          Math.trunc(
            fillingSlope.p
          );

        const q =
          Math.trunc(
            fillingSlope.q
          );

        const slopeSamples =
          Math.max(
            320,
            160 *
              (
                Math.abs(p) +
                Math.abs(q)
              )
          );

        const slopePoints =
          m129BoundarySampleUVSegment(
            {
              u: 0,
              v: 0,
            },
            {
              u: p,
              v: q,
            },
            slopeSamples
          ).map(
            (uv) =>
              rasterPoint(
                m129BoundaryProjectUVWithFill(
                  selectedCuspIndex,
                  uv,
                  viewYawDegrees,
                  viewPitchDegrees,
                  viewZoom,
                  projection,
                  lambda,
                  epsilon,
                  rho
                )
              )
          );

        /*
         * As the selected boundary fades, progressively reveal the
         * portion of this SAME slope lying on the far side of that
         * torus.
         *
         * The surviving boundary and filling solid torus remain
         * hard occluders.
         */
        const slopeThroughFadeRaw =
          clamp(
            Number(
              fillingProgress
            ) /
              M129_FILL_FADE_END,
            0,
            1
          );

        const slopeThroughFadeAmount =
          slopeThroughFadeRaw *
          slopeThroughFadeRaw *
          (
            3 -
            2 *
              slopeThroughFadeRaw
          );

        strokeThroughFadingBoundaryPolyline(
          slopePoints,
          "rgba(8, 8, 8, 0.98)",
          4.2,
          slopeThroughFadeAmount
        );

        strokeThroughFadingBoundaryPolyline(
          slopePoints,
          "rgba(255, 214, 96, 0.99)",
          2.2,
          slopeThroughFadeAmount
        );


        /*
         * Ordinary front-visible portion remains unchanged.
         */
        strokeDepthTestedPolyline(
          slopePoints,
          "rgba(8, 8, 8, 0.98)",
          4.2
        );

        strokeDepthTestedPolyline(
          slopePoints,
          "rgba(255, 214, 96, 0.99)",
          2.2
        );
      }
    }

    function scheduleDraw() {
      if (
        frameId !== null
      ) {
        window.cancelAnimationFrame(
          frameId
        );
      }

      frameId =
        window.requestAnimationFrame(
          drawSurface
        );
    }

    scheduleDraw();

    const resizeObserver =
      typeof ResizeObserver !==
        "undefined"
        ? new ResizeObserver(
            scheduleDraw
          )
        : null;

    if (
      resizeObserver &&
      host
    ) {
      resizeObserver.observe(
        host
      );
    }

    window.addEventListener(
      "resize",
      scheduleDraw
    );

    return () => {
      if (
        frameId !== null
      ) {
        window.cancelAnimationFrame(
          frameId
        );
      }

      resizeObserver?.disconnect();

      window.removeEventListener(
        "resize",
        scheduleDraw
      );
    };
  }, [
    surfaceMeshes,
    transitionMeshes,
    flatTargetTriangleById,
    cuspMorph,
    viewYawDegrees,
    viewPitchDegrees,
    viewZoom,
    projection.xw,
    projection.yw,
    projection.zw,
    lambda,
    epsilon,
    rho,
    layers.rainbow,
    layers.split,
    layers.meridian,
    layers.longitude,
    layers.wireframe,
    cuspVisibility?.[0],
    cuspVisibility?.[1],
    selectedCuspIndex,
    fillingSlope?.p,
    fillingSlope?.q,
    fillingProgress,
    survivingCuspMorph,
    survivingCuspViewMorph,
    survivingCuspReveal,
  ]);


  function projectUV(
    cuspIndex,
    uv
  ) {
    return m129BoundaryProjectUVWithFill(
      cuspIndex,
      uv,
      viewYawDegrees,
      viewPitchDegrees,
      viewZoom,
      projection,
      lambda,
      epsilon,
      rho
    );
  }


  /*
   * Meridian and Longitude are both rendered directly into
   * the m129 Canvas now. They no longer belong to the SVG
   * overlay layer.
   */


  const edgePairCurves =
    layers.edgePairs
      ? M129_CUSP_TRIANGLES
          .triangles
          .flatMap(
            (triangle) => {
              const uv =
                m129BoundaryTriangleUV(
                  triangle
                );

              const connectivity =
                m129ConnectivityForCusp(
                  triangle.cusp
                );

              return (
                connectivity
                  ?.sides ??
                []
              )
                .filter(
                  (side) =>
                    side.triangle_id ===
                    triangle.id
                )
                .map(
                  (side) => {
                    const [
                      firstIndex,
                      secondIndex,
                    ] =
                      side.corner_indices;

                    return {
                      id:
                        `m129-edge-pair-${side.id}`,

                      color:
                        side.color_hex,

                      points:
                        m129BoundarySampleUVSegment(
                          uv[
                            firstIndex
                          ],
                          uv[
                            secondIndex
                          ],
                          24
                        ).map(
                          (point) =>
                            projectUV(
                              triangle.cusp,
                              point
                            )
                        ),
                    };
                  }
                );
            }
          )
      : [];


  const triangleLabels =
    layers.labels
      ? M129_CUSP_TRIANGLES
          .triangles
          .map(
            (triangle) => {
              const uv =
                m129BoundaryTriangleUV(
                  triangle
                );

              const center = {
                u:
                  (
                    uv[0].u +
                    uv[1].u +
                    uv[2].u
                  ) /
                  3,

                v:
                  (
                    uv[0].v +
                    uv[1].v +
                    uv[2].v
                  ) /
                  3,
              };

              return {
                id:
                  `m129-label-${triangle.id}`,

                text:
                  triangle.id,

                point:
                  projectUV(
                    triangle.cusp,
                    center
                  ),
              };
            }
          )
      : [];


  return (
    <div
      className={
        `${styles.cellsLayer} ${
          dragging
            ? styles.cellsLayerDragging
            : ""
        }`
      }
      style={{
        /*
         * FIXED VIEWPORT CONTRACT
         *
         * The geometry viewport and surgery controller are separate
         * regions for the ENTIRE operation.
         *
         * Never expand m129 underneath the controller during the
         * handoff. The previously observed landing discrepancy was
         * caused by control-panel layout changing the m004 canvas,
         * not by this viewport width.
         *
         * This also keeps the narration permanently anchored to the
         * upper-right corner of the VIEW rather than allowing it to
         * drift into controller space.
         */

        /*
         * Match the established Figure-eight Boundary stacking:
         *
         *   geometry < controls < tooltip
         *
         * .cellsLayer is normally z-index: 40 because Cells must
         * cover the underlying projection canvas. The m129 Boundary
         * needs only to sit above that canvas, not above the controls.
         */
        zIndex: 10,

        /*
         * Final renderer-ownership transfer.
         *
         * Geometry has already reached the exact m004 endpoint
         * before this opacity changes.
         */
        opacity:
          clamp(
            Number(
              presentationOpacity
            ),
            0,
            1
          ),

        pointerEvents:
          presentationOpacity <= 0.001
            ? "none"
            : undefined,
      }}
      onPointerDown={
        handlePointerDown
      }
      onPointerMove={
        handlePointerMove
      }
      onPointerUp={
        finishPointer
      }
      onPointerCancel={
        finishPointer
      }
      onLostPointerCapture={
        finishPointer
      }
      onWheel={
        handleWheel
      }
      tabIndex={0}
      aria-label={
        "Interactive m129 Boundary with two certified cusp tori."
      }
    >
      <canvas
        ref={canvasRef}
        aria-label={
          "m129 Whitehead-link Boundary surface from 16 certified cusp triangles"
        }
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          display: "block",
          pointerEvents: "none",
        }}
      />

      <svg
        viewBox="0 0 1000 700"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          display: "block",
          pointerEvents: "none",
        }}
      >
        {
          edgePairCurves.map(
            (curve) => (
              <polyline
                key={curve.id}
                points={
                  curve.points
                    .map(
                      (point) =>
                        `${point.x},${point.y}`
                    )
                    .join(" ")
                }
                fill="none"
                stroke={curve.color}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                pointerEvents="none"
              />
            )
          )
        }

        {/*
          Meridian and Longitude are Canvas material curves.
          The SVG overlay now contains diagnostics only.
        */}

        {
          triangleLabels.map(
            (label) => (
              <text
                key={label.id}
                x={label.point.x}
                y={label.point.y}
                fill="#f7f3e9"
                fontSize="13"
                fontFamily={
                  '"Times New Roman", Times, serif'
                }
                textAnchor="middle"
                dominantBaseline="middle"
                pointerEvents="none"
                style={{
                  paintOrder:
                    "stroke",
                  stroke:
                    "rgba(0, 0, 0, 0.86)",
                  strokeWidth:
                    "3px",
                  strokeLinejoin:
                    "round",
                }}
              >
                {label.text}
              </text>
            )
          )
        }
      </svg>
    </div>
  );
}


function M129CellsViewer({
  view,
  truncationFraction,
  onFlightSourceChange,
}) {
  const svgRef =
    useRef(null);

  const triangleById =
    Object.fromEntries(
      M129_ANIMATION_MANIFEST
        .triangles
        .map(
          (triangle) => [
            triangle.id,
            triangle,
          ]
        )
    );

  const shapes = [];


  for (
    const tetrahedron
    of M129_ANIMATION_MANIFEST
      .tetrahedra
  ) {
    const tetIndex =
      tetrahedron.tetrahedron;

    const center =
      M129_CELL_CENTERS[
        tetIndex
      ];

    const worldVertices =
      M129_CELL_BASE_VERTICES.map(
        (vertex) =>
          m129AddPoint(
            m129ApplyRotation(
              vertex,
              M129_CELL_PRESENTATION_ROTATIONS[
                tetIndex
              ]
            ),
            center
          )
      );

    /*
     * Keep this tetrahedron's projected geometry together
     * until its true visible screen-space center is known.
     *
     * The four tetrahedron MODEL centers form a perfect
     * square, but their face-forward silhouettes alternate
     * between upward- and downward-pointing triangles.
     *
     * Therefore model-space centering alone does not align
     * their visible outer edges.
     */
    const tetrahedronShapes = [];


    /*
     * Four truncated large faces.
     */
    for (
      const faceRecord
      of tetrahedron.faces
    ) {
      const face =
        faceRecord.face;

      const faceVertices =
        [0, 1, 2, 3].filter(
          (vertex) =>
            vertex !== face
        );

      const truncatedPoints = [];

      for (
        const vertex
        of faceVertices
      ) {
        const others =
          faceVertices.filter(
            (other) =>
              other !== vertex
          );

        for (
          const other
          of others
        ) {
          truncatedPoints.push(
            m129LerpPoint(
              worldVertices[
                vertex
              ],
              worldVertices[
                other
              ],
              truncationFraction
            )
          );
        }
      }

      const projected =
        m129SortPolygonPoints(
          truncatedPoints.map(
            (point) =>
              m129ProjectCellPoint(
                point,
                view
              )
          )
        );

      const depth =
        projected.reduce(
          (sum, point) =>
            sum + point.z,
          0
        ) /
        projected.length;

      tetrahedronShapes.push({
        id:
          `tet-${tetIndex}-face-${face}`,

        kind:
          "face",

        depth,

        points:
          projected,

        fill:
          m129FaceColor(
            tetIndex,
            face
          ),

        stroke:
          m129FaceColor(
            tetIndex,
            face
          ),
      });
    }


    /*
     * Four certified truncation triangles.
     *
     * Each triangle record from the manifest already knows:
     *
     *   tetrahedron
     *   ideal vertex
     *   fill material/color
     *   three corner tetrahedral edges
     *   three side colors
     */
    for (
      const destination
      of tetrahedron
        .truncation_triangles
    ) {
      const triangle =
        triangleById[
          destination
            .triangle_id
        ];

      if (!triangle) {
        continue;
      }

      const vertex =
        triangle
          .ideal_vertex;

      const cornerWorldPoints =
        triangle.corners.map(
          (corner) => {
            const neighbor =
              corner
                .edge_vertices
                .find(
                  (candidate) =>
                    candidate !==
                    vertex
                );

            return (
              m129LerpPoint(
                worldVertices[
                  vertex
                ],
                worldVertices[
                  neighbor
                ],
                truncationFraction
              )
            );
          }
        );

      const projectedCorners =
        cornerWorldPoints.map(
          (point) =>
            m129ProjectCellPoint(
              point,
              view
            )
        );

      const depth =
        projectedCorners.reduce(
          (sum, point) =>
            sum + point.z,
          0
        ) /
        projectedCorners.length;

      tetrahedronShapes.push({
        id:
          triangle.id,

        kind:
          "cuspTriangle",

        depth,

        points:
          projectedCorners,

        triangle,
      });
    }


    /*
     * One coherent orthographic scene.
     *
     * m129FaceForwardRotation() puts the designated hidden
     * vertex directly on the normal through the opposite-face
     * centroid. No independent post-projection recentering.
     */
    shapes.push(
      ...tetrahedronShapes
    );
  }


  shapes.sort(
    (left, right) =>
      left.depth -
      right.depth
  );


  useEffect(() => {
    if (!onFlightSourceChange) {
      return undefined;
    }

    let frameId = null;

    function publish() {
      const svg =
        svgRef.current;

      if (!svg) {
        return;
      }

      const shapeById =
        Object.fromEntries(
          shapes
            .filter(
              (shape) =>
                shape.kind ===
                "cuspTriangle"
            )
            .map(
              (shape) => [
                shape.id,
                shape,
              ]
            )
        );

      const flightTriangles =
        Array.from(
          svg.querySelectorAll(
            "polygon[data-m129-flight-id]"
          )
        )
          .map(
            (polygon) => {
              const id =
                polygon.dataset
                  .m129FlightId;

              const shape =
                shapeById[id];

              const triangle =
                shape?.triangle;

              const matrix =
                polygon.getScreenCTM();

              if (
                !triangle ||
                !matrix ||
                polygon.points
                  .numberOfItems !== 3
              ) {
                return null;
              }

              /*
               * Persistent corner identity:
               *
               * each corner lies on edge
               *
               *   (ideal vertex, neighbor vertex)
               *
               * so neighbor vertex is a stable key
               * in both Cusp and Cells.
               */
              const pointOrder =
                triangle.corners.map(
                  (corner) =>
                    corner
                      .edge_vertices
                      .find(
                        (vertex) =>
                          vertex !==
                          triangle
                            .ideal_vertex
                      )
                );

              const pointsByNeighbor =
                Object.fromEntries(
                  pointOrder.map(
                    (
                      neighbor,
                      index
                    ) => {
                      const local =
                        svg.createSVGPoint();

                      const polygonPoint =
                        polygon.points
                          .getItem(index);

                      local.x =
                        polygonPoint.x;

                      local.y =
                        polygonPoint.y;

                      const screen =
                        local.matrixTransform(
                          matrix
                        );

                      return [
                        String(neighbor),
                        {
                          x: screen.x,
                          y: screen.y,
                        },
                      ];
                    }
                  )
                );

              return {
                id,

                tetrahedron:
                  triangle.tetrahedron,

                idealVertex:
                  triangle.ideal_vertex,

                pointOrder:
                  pointOrder.map(
                    String
                  ),

                pointsByNeighbor,

                color:
                  m129MaterialColor(
                    triangle.material_id
                  ),
              };
            }
          )
          .filter(Boolean);

      if (
        flightTriangles.length ===
        16
      ) {
        onFlightSourceChange({
          kind: "m129-cells",
          triangles:
            flightTriangles,
        });
      }
    }

    frameId =
      window.requestAnimationFrame(
        publish
      );

    window.addEventListener(
      "resize",
      publish
    );

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(
          frameId
        );
      }

      window.removeEventListener(
        "resize",
        publish
      );
    };
  }, [
    onFlightSourceChange,
    view,
    truncationFraction,
  ]);


  return (
    <svg
      ref={svgRef}
      viewBox="0 0 1000 700"
      preserveAspectRatio="xMidYMid meet"
      aria-label="m129 four truncated tetrahedral cells"
    >
      {shapes.map(
        (shape) => {
          if (
            shape.kind ===
            "face"
          ) {
            return (
              <polygon
                key={
                  shape.id
                }
                points={
                  m129CellPolygonString(
                    shape.points
                  )
                }
                fill={
                  colorWithAlpha(
                    shape.fill,
                    0.76
                  )
                }
                stroke={
                  shape.stroke
                }
                strokeWidth="2.2"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            );
          }

          const triangle =
            shape.triangle;

          return (
            <g
              key={
                shape.id
              }
            >
              <polygon
                data-m129-flight-id={
                  triangle.id
                }
                points={
                  m129CellPolygonString(
                    shape.points
                  )
                }
                fill={
                  m129MaterialColor(
                    triangle.material_id
                  )
                }
                stroke="none"
              />

              {
                triangle.sides.map(
                  (side) => {
                    const [
                      firstIndex,
                      secondIndex,
                    ] =
                      side
                        .corner_indices;

                    const first =
                      shape.points[
                        firstIndex
                      ];

                    const second =
                      shape.points[
                        secondIndex
                      ];

                    return (
                      <line
                        key={
                          `${triangle.id}-side-${side.side_index}`
                        }
                        x1={
                          first.x
                        }
                        y1={
                          first.y
                        }
                        x2={
                          second.x
                        }
                        y2={
                          second.y
                        }
                        stroke={
                          m129FaceColor(
                            triangle.tetrahedron,
                            side.tetrahedral_face
                          )
                        }
                        strokeWidth="2.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                      />
                    );
                  }
                )
              }
            </g>
          );
        }
      )}
    </svg>
  );
}


function RotationArrowIcon({
  clockwise = false,
}) {
  return (
    <svg
      className={
        styles.rotationArrowIcon
      }
      viewBox="0 0 33 36"
      aria-hidden="true"
      focusable="false"
      shapeRendering="geometricPrecision"
    >
      <g
        transform={
          clockwise
            ? "translate(33 0) scale(-1 1)"
            : undefined
        }
      >
        <path
          d="
            M 11 7.2
            C 5.8 9.6 3 15 3.7 21.2
            C 4.4 27.7 9.7 32.4 16.3 32.4
            C 23.7 32.4 29.5 26.5 29.5 19.1
            C 29.5 13.9 26.4 9.3 22 7.2
          "
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <path
          d="
            M 22.9 2.8
            L 16.7 5.7
            L 21.8 10.2
            Z
          "
          fill="currentColor"
        />
      </g>
    </svg>
  );
}


const SISTER_CUSP_FIXED_CORNER_INDEX =
  Object.freeze({
    A0: Object.freeze({ 1: 0, 3: 1, 2: 2 }),
    B0: Object.freeze({ 1: 0, 3: 1, 2: 2 }),
    B3: Object.freeze({ 2: 0, 1: 1, 0: 2 }),
    A3: Object.freeze({ 1: 0, 2: 1, 0: 2 }),
    A2: Object.freeze({ 0: 0, 1: 1, 3: 2 }),
    B1: Object.freeze({ 2: 0, 3: 1, 0: 2 }),
    A1: Object.freeze({ 2: 0, 3: 1, 0: 2 }),
    B2: Object.freeze({ 1: 0, 0: 1, 3: 2 }),
  });


const SISTER_CUSP_MATERIAL_BY_SLOT =
  Object.freeze({
    A0: "A0",
    B0: "B1",
    B3: "A2",
    A3: "B0",
    A2: "A3",
    B1: "B2",
    A1: "B3",
    B2: "A1",
  });


const SISTER_CUSP_SLOT_BY_MATERIAL =
  Object.freeze(
    Object.fromEntries(
      Object.entries(
        SISTER_CUSP_MATERIAL_BY_SLOT
      ).map(
        ([slotId, materialId]) => [
          materialId,
          slotId,
        ]
      )
    )
  );


const SISTER_CUSP_EDGE_COLORS =
  Object.freeze({
    A0: Object.freeze({
      "1,2": "#ffe600",
      "2,3": "#159447",
      "1,3": "#4da3ff",
    }),

    A1: Object.freeze({
      "0,2": "#ffe600",
      "2,3": "#ff2020",
      "0,3": "#4da3ff",
    }),

    A2: Object.freeze({
      "0,1": "#ffe600",
      "1,3": "#ff2020",
      "0,3": "#159447",
    }),

    A3: Object.freeze({
      "0,1": "#4da3ff",
      "1,2": "#ff2020",
      "0,2": "#159447",
    }),

    B0: Object.freeze({
      "1,2": "#159447",
      "2,3": "#ff2020",
      "1,3": "#ffe600",
    }),

    B1: Object.freeze({
      "0,2": "#159447",
      "2,3": "#4da3ff",
      "0,3": "#ffe600",
    }),

    B2: Object.freeze({
      "0,1": "#159447",
      "1,3": "#4da3ff",
      "0,3": "#ff2020",
    }),

    B3: Object.freeze({
      "0,1": "#ffe600",
      "1,2": "#4da3ff",
      "0,2": "#ff2020",
    }),
  });


function cuspFlightEdgeColor(
  manifoldId,
  materialId,
  edge
) {
  if (
    manifoldId !== "m003" ||
    !materialId ||
    !edge
  ) {
    return edge?.color;
  }

  const edgeKey =
    [
      Number(edge.startCorner),
      Number(edge.endCorner),
    ]
      .sort((a, b) => a - b)
      .join(",");

  return (
    SISTER_CUSP_EDGE_COLORS[
      materialId
    ]?.[edgeKey] ??
    edge.color
  );
}


export default function SurgeryComplementViewer({
  manifoldStateId = "m004",
  onManifoldStateChange = null,
  onActivityReadoutChange = null,
}) {
  const [
    representationMode,
    setRepresentationMode,
  ] = useState("boundary");

  const [
    projectionViewerStatus,
    setProjectionViewerStatus,
  ] = useState(null);

  const [
    manifoldMenuOpen,
    setManifoldMenuOpen,
  ] = useState(false);

  const manifoldMenuRef =
    useRef(null);


  const [
    m129CuspMenuOpen,
    setM129CuspMenuOpen,
  ] = useState(false);

  const m129CuspMenuRef =
    useRef(null);

  const [
    m129CuspLayers,
    setM129CuspLayers,
  ] = useState(() => ({
    triangles: true,
    rainbow: false,
    split: false,
    meridian: false,
    longitude: false,
    labels: false,
    edgePairs: false,
    wireframe: false,
  }));

  const [
    m129BoundaryCuspVisibility,
    setM129BoundaryCuspVisibility,
  ] = useState(() => ({
    0: true,
    1: true,
  }));

  const [
    m129SelectedCuspIndex,
    setM129SelectedCuspIndex,
  ] = useState(null);

  const [
    m129FillingSlope,
    setM129FillingSlope,
  ] = useState(() => ({
    p: 1,
    q: 1,
  }));

  /*
   * A numerical slope value may exist as an editing seed without
   * representing an actual user selection.
   *
   * m129 opens in the neutral surgery state:
   *
   *   no cusp selected
   *   no filling slope selected
   *   no slope curve drawn
   */
  const [
    m129SlopeSelected,
    setM129SlopeSelected,
  ] = useState(false);


  const [
    m129SlopeLatticeOpen,
    setM129SlopeLatticeOpen,
  ] = useState(false);

  const [
    m129FillProgress,
    setM129FillProgress,
  ] = useState(0);

  const [
    m129FillActive,
    setM129FillActive,
  ] = useState(false);

  const [
    m129FillStartedInSplit,
    setM129FillStartedInSplit,
  ] = useState(false);

  const m129FillFrameRef =
    useRef(null);


  /*
   * Boundary-component count during the certified m129 fill.
   *
   * Keep this criterion identical to M129BoundaryViewer's
   * cuspBoundaryStillVisible() test.
   */
  const m129FilledCuspCollapseRaw =
    clamp(
      (
        Number(
          m129FillProgress
        ) -
        0.30
      ) /
        0.62,
      0,
      1
    );

  const m129FilledCuspCollapseAmount =
    m129FilledCuspCollapseRaw *
    m129FilledCuspCollapseRaw *
    (
      3 -
      2 *
        m129FilledCuspCollapseRaw
    );

  const m129HasTwoBoundaryCusps =
    m129FilledCuspCollapseAmount <
    0.995;

  const [
    m129SurvivingCuspMorph,
    setM129SurvivingCuspMorph,
  ] = useState(0);

  /*
   * Single master parameter for the certified m129 -> m004
   * surgery path.
   *
   *   0 = complete m129
   *   1 = completed (3,-1) Dehn filling / m004 intrinsic state
   *
   * The SAME t now drives the certified hyperbolic cusp
   * deformation and the ambient surgery-twist hook.
   */
  const [
    m129SurgeryPathT,
    setM129SurgeryPathT,
  ] = useState(0);

  const [
    m129SurgeryPathActive,
    setM129SurgeryPathActive,
  ] = useState(false);

  const m129SurgeryPathFrameRef =
    useRef(null);

  const [
    m129SurvivingCuspMorphActive,
    setM129SurvivingCuspMorphActive,
  ] = useState(false);

  const m129SurvivingCuspMorphFrameRef =
    useRef(null);

  const [
    m129SurvivingCuspViewMorph,
    setM129SurvivingCuspViewMorph,
  ] = useState(0);

  /*
   * Renderer/material ownership at the exact final endpoint.
   *
   * This is deliberately separate from the geometric morph.
   */
  const [
    m129RendererTransfer,
    setM129RendererTransfer,
  ] = useState(0);

  const m129RendererTransferFrameRef =
    useRef(null);

  /*
   * Keep the m129 renderer visibly mounted while the REAL m004
   * scene underneath changes into its final post-surgery layout.
   */
  const [
    m129HandoffOverlayActive,
    setM129HandoffOverlayActive,
  ] = useState(false);

  const [
    m004HandoffTargetState,
    setM004HandoffTargetState,
  ] = useState(
    ONE_CUSP_PUBLICATION_STATE
  );

  /*
   * Dedicated reveal of cusp 0 when it was manually hidden before
   * filling.
   *
   * This is deliberately separate from:
   *
   *   fillingProgress
   *   survivingCuspMorph
   *
   * so the visual sequence is:
   *
   *   filled boundary gone
   *       ->
   *   surviving boundary restored
   *       ->
   *   final manifold morph
   */
  const [
    m129SurvivingCuspReveal,
    setM129SurvivingCuspReveal,
  ] = useState(0);

  const m129SurvivingCuspRevealFrameRef =
    useRef(null);

  const m129FillSurvivingCuspWasHiddenRef =
    useRef(false);


  function m129FillNarrationText() {
    if (
      !m129FillActive &&
      !m129SurvivingCuspMorphActive &&
      Number(
        m129FillProgress
      ) <= 0
    ) {
      return null;
    }


    const progress =
      Number(
        m129FillProgress
      );


    /*
     * POST-FILL NARRATION
     *
     * These are deliberately separate conceptual stages:
     *
     *   1. filled boundary is gone
     *   2. surviving boundary is restored, if it had been hidden
     *   3. surviving boundary continuously becomes m004
     */

    if (
      m129SurvivingCuspMorphActive ||
      Number(
        m129SurvivingCuspMorph
      ) > 0 ||
      Number(
        m129SurvivingCuspViewMorph
      ) > 0
    ) {
      return "Boundary → figure-eight complement";
    }


    if (
      progress >= 1 &&
      m129FillSurvivingCuspWasHiddenRef.current &&
      Number(
        m129SurvivingCuspReveal
      ) < 0.999
    ) {
      return "Surviving boundary restored";
    }


    if (
      progress >= 1
    ) {
      return "Boundary removed";
    }


    if (
      progress <
      M129_FILL_FADE_END
    ) {
      return "Filling: boundary removal";
    }


    if (
      progress <
      M129_FILL_GROWTH_END
    ) {
      return "Filling: solid torus grows";
    }


    if (
      progress <
      M129_FILL_SLOPE_END
    ) {
      return "Filling: mark the filling slope 3μ − λ";
    }


    if (
      progress <
      M129_FILL_ALIGNMENT_END
    ) {
      return (
        <>
          <div>
            Incoming meridian becomes the filling slope 3μ − λ
          </div>
          <div>
            Incoming longitude becomes the old meridian μ
          </div>
        </>
      );
    }


    if (
      progress < 1
    ) {
      return "Filling: attach along 3μ − λ";
    }


    return "Boundary removed";
  }


  function m129FillNarrationLines() {
    if (
      !m129FillActive &&
      !m129SurvivingCuspMorphActive &&
      Number(
        m129FillProgress
      ) <= 0
    ) {
      return null;
    }

    const progress =
      Number(
        m129FillProgress
      );

    if (
      m129SurvivingCuspMorphActive ||
      Number(
        m129SurvivingCuspMorph
      ) > 0 ||
      Number(
        m129SurvivingCuspViewMorph
      ) > 0
    ) {
      return [
        "Surviving boundary → figure-eight boundary",
      ];
    }

    if (
      progress >= 1 &&
      m129FillSurvivingCuspWasHiddenRef.current &&
      Number(
        m129SurvivingCuspReveal
      ) < 0.999
    ) {
      return [
        "Surviving boundary restored",
      ];
    }

    if (
      progress >= 1
    ) {
      return [
        "Boundary removed",
      ];
    }

    if (
      progress <
      M129_FILL_FADE_END
    ) {
      return [
        "Filling: boundary removal",
      ];
    }

    if (
      progress <
      M129_FILL_GROWTH_END
    ) {
      return [
        "Filling: solid torus grows",
      ];
    }

    if (
      progress <
      M129_FILL_SLOPE_END
    ) {
      return [
        "Filling: mark the filling slope 3μ − λ",
      ];
    }

    if (
      progress <
      M129_FILL_ALIGNMENT_END
    ) {
      return [
        "Incoming meridian becomes the filling slope 3μ − λ",
        "Incoming longitude becomes the old meridian μ",
      ];
    }

    if (
      progress < 1
    ) {
      return [
        "Filling: attach along 3μ − λ",
      ];
    }

    return [
      "Boundary removed",
    ];
  }


  const sharedReadoutLines =
    (
      manifoldStateId === "m129" ||
      m129HandoffOverlayActive
    )
      ? (
          m129FillNarrationLines() ??
          (
            projectionViewerStatus
              ? [projectionViewerStatus]
              : null
          )
        )
      : (
          projectionViewerStatus
            ? [projectionViewerStatus]
            : null
        );

  const sharedReadoutKey =
    sharedReadoutLines
      ?.join("\n") ??
    "";


  useEffect(() => {
    onActivityReadoutChange?.(
      sharedReadoutKey
        ? sharedReadoutKey.split(
            "\n"
          )
        : null
    );
  }, [
    onActivityReadoutChange,
    sharedReadoutKey,
  ]);


  useEffect(
    () => () => {
      onActivityReadoutChange?.(
        null
      );
    },
    [
      onActivityReadoutChange,
    ]
  );


  function stopM129FillAnimation() {
    if (
      m129FillFrameRef.current !==
      null
    ) {
      window.cancelAnimationFrame(
        m129FillFrameRef.current
      );

      m129FillFrameRef.current =
        null;
    }

    setM129FillActive(
      false
    );
  }


  function stopM129SurgeryPathAnimation() {
    if (
      m129SurgeryPathFrameRef.current !==
      null
    ) {
      window.cancelAnimationFrame(
        m129SurgeryPathFrameRef.current
      );

      m129SurgeryPathFrameRef.current =
        null;
    }

    setM129SurgeryPathActive(
      false
    );
  }


  function animateM129SurgeryPathTo(
    target,
    duration = 10000,
    onComplete = null
  ) {
    stopM129SurgeryPathAnimation();

    const start =
      clamp(
        Number(
          m129SurgeryPathT
        ),
        0,
        1
      );

    const end =
      clamp(
        Number(target),
        0,
        1
      );

    if (
      Math.abs(
        end - start
      ) < 1e-9
    ) {
      setM129SurgeryPathT(
        end
      );

      onComplete?.();

      return;
    }

    setM129SurgeryPathActive(
      true
    );

    const startedAt =
      performance.now();

    function frame(now) {
      const raw =
        clamp(
          (
            now -
            startedAt
          ) /
            Math.max(
              1,
              duration
            ),
          0,
          1
        );

      const eased =
        raw *
        raw *
        (
          3 -
          2 * raw
        );

      setM129SurgeryPathT(
        start +
        (
          end - start
        ) *
        eased
      );

      if (raw < 1) {
        m129SurgeryPathFrameRef.current =
          window.requestAnimationFrame(
            frame
          );

        return;
      }

      m129SurgeryPathFrameRef.current =
        null;

      setM129SurgeryPathT(
        end
      );

      setM129SurgeryPathActive(
        false
      );

      onComplete?.();
    }

    m129SurgeryPathFrameRef.current =
      window.requestAnimationFrame(
        frame
      );
  }


  function stopM129SurvivingCuspReveal() {
    if (
      m129SurvivingCuspRevealFrameRef.current !==
      null
    ) {
      window.cancelAnimationFrame(
        m129SurvivingCuspRevealFrameRef.current
      );

      m129SurvivingCuspRevealFrameRef.current =
        null;
    }
  }


  function beginM129SurvivingCuspReveal() {
    stopM129SurvivingCuspReveal();

    setM129SurvivingCuspReveal(
      0
    );

    const startedAt =
      performance.now();

    const duration =
      1600;

    function frame(now) {
      const raw =
        clamp(
          (
            now -
            startedAt
          ) /
            duration,
          0,
          1
        );

      const eased =
        raw *
        raw *
        (
          3 -
          2 *
            raw
        );

      setM129SurvivingCuspReveal(
        eased
      );

      if (raw < 1) {
        m129SurvivingCuspRevealFrameRef.current =
          window.requestAnimationFrame(
            frame
          );

        return;
      }

      m129SurvivingCuspRevealFrameRef.current =
        null;

      setM129SurvivingCuspReveal(
        1
      );

      /*
       * Only after the surviving boundary is fully restored do we
       * begin the geometric m129 -> m004 transformation.
       */
      beginM129SurvivingCuspHandoff();
    }

    m129SurvivingCuspRevealFrameRef.current =
      window.requestAnimationFrame(
        frame
      );
  }


  function stopM129RendererTransfer() {
    if (
      m129RendererTransferFrameRef.current !==
      null
    ) {
      window.cancelAnimationFrame(
        m129RendererTransferFrameRef.current
      );

      m129RendererTransferFrameRef.current =
        null;
    }
  }


  function stopM129SurvivingCuspMorph() {
    if (
      m129SurvivingCuspMorphFrameRef.current !==
      null
    ) {
      window.cancelAnimationFrame(
        m129SurvivingCuspMorphFrameRef.current
      );

      m129SurvivingCuspMorphFrameRef.current =
        null;
    }

    setM129SurvivingCuspMorphActive(
      false
    );
  }


  /*
   * FINAL m129 -> m004 HANDOFF
   *
   * One continuous animation carries the single surviving torus
   * directly to the published m004 Boundary state.
   *
   * The SAME eased progress controls:
   *
   *   - S3 geometry
   *   - S3 projection
   *   - ordinary camera
   *
   * There is no intermediate m004 presentation and no second
   * projective animation.
   */
  function beginM129SurvivingCuspHandoff() {
    /*
     * The old pointwise m129 -> m004 S3 blend is no longer part
     * of the active surgery path.
     *
     * From here onward the certified surgery parameter t is the
     * only geometric clock. The ambient twist hook receives this
     * same t and will be implemented in the next patch.
     */
    stopM129SurvivingCuspMorph();
    stopM129RendererTransfer();

    setM129RendererTransfer(
      0
    );

    setM129HandoffOverlayActive(
      false
    );

    setM129SurvivingCuspMorph(
      0
    );

    setM129SurvivingCuspViewMorph(
      0
    );

    setM129SurvivingCuspMorphActive(
      false
    );

    const exactTargetState =
      projectionControlRef.current
        ?.prepareSymmetricBoundary?.() ??
      ONE_CUSP_PUBLICATION_STATE;

    setM004HandoffTargetState(
      exactTargetState
    );

    animateM129SurgeryPathTo(
      1,
      10000,
      () => {
        /*
         * Do NOT switch renderer ownership yet.
         *
         * t = 1 is the certified intrinsic m004 state, but the
         * ambient figure-eight embedding must be installed first.
         */
        setM129FillActive(
          false
        );
      }
    );
  }


  /*
   * Finalize m129 surgery bookkeeping only AFTER the parent has
   * committed the new manifold.
   *
   * This deliberately happens after visual ownership has already
   * moved to m004.
   */
  useEffect(() => {
    if (
      manifoldStateId !== "m129" &&
      !m129HandoffOverlayActive &&
      m129SurvivingCuspMorphActive
    ) {
      setM129SurvivingCuspMorphActive(
        false
      );

      setM129FillActive(
        false
      );
    }
  }, [
    manifoldStateId,
    m129HandoffOverlayActive,
    m129SurvivingCuspMorphActive,
  ]);


  function resetM129FillPreview() {
    stopM129FillAnimation();

    stopM129SurgeryPathAnimation();

    stopM129SurvivingCuspReveal();

    stopM129SurvivingCuspMorph();

    stopM129RendererTransfer();

    setM129RendererTransfer(
      0
    );

    setM129HandoffOverlayActive(
      false
    );

    setM129FillProgress(
      0
    );

    setM129SurgeryPathT(
      0
    );

    setM129SurvivingCuspMorph(
      0
    );

    setM129SurvivingCuspViewMorph(
      0
    );

    setM129SurvivingCuspReveal(
      0
    );

    setM129FillStartedInSplit(
      false
    );
  }


  function beginM129FillAnimation() {
    stopM129FillAnimation();

    m129FillSurvivingCuspWasHiddenRef.current =
      m129BoundaryCuspVisibility?.[0] ===
      false;

    setM129SurvivingCuspReveal(
      m129BoundaryCuspVisibility?.[0] ===
        false
        ? 0
        : 1
    );

    setM129FillStartedInSplit(
      m129CuspLayers.split
    );

    setM129FillProgress(
      0
    );

    setM129FillActive(
      true
    );

    const startedAt =
      performance.now();

    function frame(now) {
      const raw =
        clamp(
          (
            now -
            startedAt
          ) /
            M129_FILL_DURATION_MS,
          0,
          1
        );

      setM129FillProgress(
        raw
      );

      if (raw < 1) {
        m129FillFrameRef.current =
          window.requestAnimationFrame(
            frame
          );

        return;
      }

      m129FillFrameRef.current =
        null;

      setM129FillProgress(
        1
      );

      /*
       * Cusp 1 has now completely relinquished boundary ownership.
       *
       * If cusp 0 was hidden when Fill began, restore that surviving
       * boundary FIRST. Only after its fade-in has finished do we
       * begin the final m129 -> m004 geometric morph.
       */
      if (
        m129FillSurvivingCuspWasHiddenRef.current
      ) {
        beginM129SurvivingCuspReveal();
      } else {
        setM129SurvivingCuspReveal(
          1
        );

        beginM129SurvivingCuspHandoff();
      }
    }

    m129FillFrameRef.current =
      window.requestAnimationFrame(
        frame
      );
  }


  const [
    m129CuspView,
    setM129CuspView,
  ] = useState(() => ({
    yawDegrees: 0,
    pitchDegrees: 0,
    zoom: 1,
  }));

  const [
    m129BoundaryView,
    setM129BoundaryView,
  ] = useState(() => ({
    yawDegrees:
      -187.13953765869138,

    pitchDegrees:
      -7.667191772460934,

    zoom: 1.98,
  }));

  const [
    m129BoundaryProjection,
    setM129BoundaryProjection,
  ] = useState(() => ({
    xw: 0,
    yw: 0,
    zw: 0,
  }));

  const [
    m129BoundarySubdivisions,
    setM129BoundarySubdivisions,
  ] = useState(24);

  const [
    m129BoundaryLambda,
    setM129BoundaryLambda,
  ] = useState(0.18);

  const [
    m129BoundaryEpsilon,
    setM129BoundaryEpsilon,
  ] = useState(0.64);

  const [
    m129BoundaryRho,
    setM129BoundaryRho,
  ] = useState(0.14);

  const [
    m129BoundaryEvolve,
    setM129BoundaryEvolve,
  ] = useState(() => ({
    xw: false,
    yw: false,
    zw: false,
    lambda: false,
    epsilon: false,
    rho: false,
  }));

  /*
   * Finalized m129 Boundary publication presets.
   *
   * Reload and Reset use the Symmetric publication state.
   * Standard remains available as a comparison preset.
   *
   * Slot 0 = Symmetric
   * Slot 1 = Open
   */
  const m129BoundarySavedPresets =
    useMemo(
      () => [
        {
          projection: {
            xw: 0,
            yw: 0,
            zw: 0,
          },

          view: {
            yawDegrees:
              -187.13953765869138,

            pitchDegrees:
              -7.667191772460934,

            zoom: 1.98,
          },

          geometry: {
            lambda: 0.18,
            epsilon: 0.64,
            rho: 0.14,
          },

          layers: {
            triangles: true,
            rainbow: false,
            split: false,
            meridian: false,
            longitude: false,
            labels: false,
            edgePairs: false,
            wireframe: false,
          },

          subdivisions: 24,
        },

        {
          projection: {
            xw: 185,
            yw: 360,
            zw: 90.5,
          },

          view: {
            yawDegrees:
              3.524062500000004,

            pitchDegrees:
              -5.079375000000001,

            zoom: 0.65,
          },

          geometry: {
            lambda: 0.9,
            epsilon: 0.18,
            rho: 0.14,
          },

          layers: {
            triangles: true,
            rainbow: false,
            split: false,
            meridian: false,
            longitude: false,
            labels: false,
            edgePairs: false,
            wireframe: false,
          },

          subdivisions: 24,
        },
      ],
      []
    );

  const [
    m129BoundarySelectedPreset,
    setM129BoundarySelectedPreset,
  ] = useState(0);


  /*
   * Development helper:
   * copy the complete current m129 Boundary publication state
   * from the browser console.
   */
  if (
    typeof window !== "undefined"
  ) {
    window.copyM129BoundaryView =
      () =>
        JSON.stringify({
          projection: {
            ...m129BoundaryProjection,
          },

          view: {
            ...m129BoundaryView,
          },

          geometry: {
            lambda:
              m129BoundaryLambda,
            epsilon:
              m129BoundaryEpsilon,
            rho:
              m129BoundaryRho,
          },

          layers: {
            triangles: true,
            rainbow: false,
            split: false,
            meridian: false,
            longitude: false,
            labels: false,
            edgePairs: false,
            wireframe: false,
          },

          subdivisions:
            m129BoundarySubdivisions,
        });
  }

  const m129BoundaryPresetAnimationRef =
    useRef(null);

  const [
    m129BoundaryAutoRotationDirection,
    setM129BoundaryAutoRotationDirection,
  ] = useState(0);

  const m129BoundaryRotationClickTimerRef =
    useRef(null);

  const [
    m129ProjectionControlsExpanded,
    setM129ProjectionControlsExpanded,
  ] = useState(false);

  const [
    m129GeometryControlsExpanded,
    setM129GeometryControlsExpanded,
  ] = useState(false);

  const m129BoundaryLambdaDirectionRef =
    useRef(1);

  const m129BoundaryEpsilonDirectionRef =
    useRef(1);

  const m129BoundaryRhoDirectionRef =
    useRef(1);

  useEffect(() => {
    const active =
      Object.values(
        m129BoundaryEvolve
      ).some(Boolean);

    if (!active) {
      return undefined;
    }

    const timer =
      window.setInterval(
        () => {
          if (
            m129BoundaryEvolve.xw ||
            m129BoundaryEvolve.yw ||
            m129BoundaryEvolve.zw
          ) {
            setM129BoundaryProjection(
              (current) => {
                const next = {
                  ...current,
                };

                ["xw", "yw", "zw"].forEach(
                  (key) => {
                    if (
                      m129BoundaryEvolve[
                        key
                      ]
                    ) {
                      next[key] =
                        (
                          current[key] +
                          0.75
                        ) %
                        360;
                    }
                  }
                );

                return next;
              }
            );
          }

          if (
            m129BoundaryEvolve.lambda
          ) {
            setM129BoundaryLambda(
              (current) => {
                let next =
                  current +
                  0.01 *
                    m129BoundaryLambdaDirectionRef
                      .current;

                if (next >= 0.96) {
                  next = 0.96;
                  m129BoundaryLambdaDirectionRef
                    .current = -1;
                } else if (
                  next <= 0.18
                ) {
                  next = 0.18;
                  m129BoundaryLambdaDirectionRef
                    .current = 1;
                }

                return next;
              }
            );
          }

          if (
            m129BoundaryEvolve.epsilon
          ) {
            setM129BoundaryEpsilon(
              (current) => {
                let next =
                  current +
                  0.01 *
                    m129BoundaryEpsilonDirectionRef
                      .current;

                if (next >= 0.64) {
                  next = 0.64;
                  m129BoundaryEpsilonDirectionRef
                    .current = -1;
                } else if (
                  next <= 0.18
                ) {
                  next = 0.18;
                  m129BoundaryEpsilonDirectionRef
                    .current = 1;
                }

                return next;
              }
            );
          }

          if (
            m129BoundaryEvolve.rho
          ) {
            setM129BoundaryRho(
              (current) => {
                let next =
                  current +
                  0.001 *
                    m129BoundaryRhoDirectionRef
                      .current;

                if (next >= 0.14) {
                  next = 0.14;

                  m129BoundaryRhoDirectionRef
                    .current = -1;
                } else if (
                  next <= 0.07
                ) {
                  next = 0.07;

                  m129BoundaryRhoDirectionRef
                    .current = 1;
                }

                return next;
              }
            );
          }
        },
        40
      );

    return () =>
      window.clearInterval(
        timer
      );
  }, [
    m129BoundaryEvolve,
  ]);


  function setM129BoundaryProjectionPreset(
    projection
  ) {
    setM129BoundaryEvolve({
      xw: false,
      yw: false,
      zw: false,
      lambda: false,
      epsilon: false,
      rho: false,
    });

    setM129BoundaryProjection({
      xw: projection.xw,
      yw: projection.yw,
      zw: projection.zw,
    });
  }


  function toggleM129BoundaryEvolve(
    key
  ) {
    setM129BoundaryEvolve(
      (current) => ({
        ...current,

        [key]:
          !current[key],
      })
    );
  }


  function stopM129BoundaryPresetAnimation() {
    if (
      m129BoundaryPresetAnimationRef.current !==
      null
    ) {
      window.cancelAnimationFrame(
        m129BoundaryPresetAnimationRef.current
      );

      m129BoundaryPresetAnimationRef.current =
        null;
    }
  }


  function shortestDegreeDelta(
    start,
    target
  ) {
    let delta =
      (
        (
          target -
          start +
          180
        ) %
          360 +
        360
      ) %
        360 -
      180;

    /*
     * Preserve a deterministic choice for the exactly opposite
     * orientation rather than allowing modulo arithmetic to choose
     * differently across equivalent values.
     */
    if (
      Math.abs(delta + 180) <
      1e-10
    ) {
      delta = 180;
    }

    return delta;
  }


  function animateM129BoundaryPresetTo(
    preset,
    duration = 4000
  ) {
    if (!preset) {
      return;
    }

    stopM129BoundaryPresetAnimation();

    cancelM129BoundaryRotationClick();

    setM129BoundaryAutoRotationDirection(
      0
    );

    /*
     * Freeze all evolve controls at the exact currently visible
     * values before beginning the preset morph.
     */
    setM129BoundaryEvolve({
      xw: false,
      yw: false,
      zw: false,
      lambda: false,
      epsilon: false,
      rho: false,
    });

    const startProjection = {
      ...m129BoundaryProjection,
    };

    const targetProjection = {
      ...preset.projection,
    };

    const projectionDelta = {
      xw:
        shortestDegreeDelta(
          startProjection.xw,
          targetProjection.xw
        ),

      yw:
        shortestDegreeDelta(
          startProjection.yw,
          targetProjection.yw
        ),

      zw:
        shortestDegreeDelta(
          startProjection.zw,
          targetProjection.zw
        ),
    };


    const startView = {
      ...m129BoundaryView,
    };

    const targetView = {
      ...preset.view,
    };

    const yawDelta =
      shortestDegreeDelta(
        startView.yawDegrees,
        targetView.yawDegrees
      );


    const startGeometry = {
      lambda:
        m129BoundaryLambda,

      epsilon:
        m129BoundaryEpsilon,

      rho:
        m129BoundaryRho,
    };

    const targetGeometry = {
      ...preset.geometry,
    };


    /*
     * Layer state is independent of publication presets.
     *
     * A preset changes only the geometric presentation:
     *
     *   S³ projection
     *   intrinsic geometry
     *   ordinary camera
     *   render resolution
     *
     * Triangles / Rainbow / Split and the independent overlays
     * remain exactly as the user currently selected them.
     */
    setM129BoundarySubdivisions(
      preset.subdivisions
    );


    const startTime =
      performance.now();


    function frame(now) {
      const u =
        Math.min(
          1,
          Math.max(
            0,
            (
              now -
              startTime
            ) /
              duration
          )
        );

      /*
       * Same smoothstep easing as the figure-eight Boundary.
       *
       * Zero velocity at both ends:
       *
       *   f(u) = u²(3 - 2u)
       */
      const eased =
        u *
        u *
        (3 - 2 * u);


      setM129BoundaryProjection({
        xw:
          startProjection.xw +
          projectionDelta.xw *
            eased,

        yw:
          startProjection.yw +
          projectionDelta.yw *
            eased,

        zw:
          startProjection.zw +
          projectionDelta.zw *
            eased,
      });


      setM129BoundaryView({
        yawDegrees:
          startView.yawDegrees +
          yawDelta *
            eased,

        pitchDegrees:
          startView.pitchDegrees +
          (
            targetView.pitchDegrees -
            startView.pitchDegrees
          ) *
            eased,

        zoom:
          startView.zoom +
          (
            targetView.zoom -
            startView.zoom
          ) *
            eased,
      });


      setM129BoundaryLambda(
        startGeometry.lambda +
        (
          targetGeometry.lambda -
          startGeometry.lambda
        ) *
          eased
      );

      setM129BoundaryEpsilon(
        startGeometry.epsilon +
        (
          targetGeometry.epsilon -
          startGeometry.epsilon
        ) *
          eased
      );

      setM129BoundaryRho(
        startGeometry.rho +
        (
          targetGeometry.rho -
          startGeometry.rho
        ) *
          eased
      );


      if (u < 1) {
        m129BoundaryPresetAnimationRef.current =
          window.requestAnimationFrame(
            frame
          );

        return;
      }

      /*
       * Land on the literal stored values.
       *
       * During interpolation a shortest-angle endpoint may differ
       * from the stored number by exactly 360 degrees. Those are the
       * same visible orientation, but restoring the literal numbers
       * keeps the preset exactly reproducible.
       */
      setM129BoundaryProjection({
        ...targetProjection,
      });

      setM129BoundaryView({
        ...targetView,
      });

      setM129BoundaryLambda(
        targetGeometry.lambda
      );

      setM129BoundaryEpsilon(
        targetGeometry.epsilon
      );

      setM129BoundaryRho(
        targetGeometry.rho
      );

      m129BoundaryPresetAnimationRef.current =
        null;
    }


    m129BoundaryPresetAnimationRef.current =
      window.requestAnimationFrame(
        frame
      );
  }


  function applyM129BoundarySavedPreset(
    index
  ) {
    const saved =
      m129BoundarySavedPresets[
        index
      ];

    if (!saved) {
      return;
    }

    setM129BoundarySelectedPreset(
      index
    );

    animateM129BoundaryPresetTo(
      saved,
      4000
    );
  }


  function standardM129BoundaryPreset() {
    return {
      projection: {
        xw: 0,
        yw: 0,
        zw: 0,
      },

      view: {
        yawDegrees: 0,
        pitchDegrees: 0,
        zoom: 2.7,
      },

      geometry: {
        lambda: 0.44,
        epsilon: 0.28,
        rho: M129_BOUNDARY_RHO,
      },

      layers: {
        triangles: true,
        rainbow: false,
        split: false,
        meridian: false,
        longitude: false,
        labels: false,
        edgePairs: false,
        wireframe: false,
      },

      subdivisions: 24,
    };
  }


  useEffect(
    () => () => {
      stopM129BoundaryPresetAnimation();

      cancelM129BoundaryRotationClick();
    },
    []
  );


  useEffect(() => {
    if (
      m129HasTwoBoundaryCusps ||
      !m129CuspLayers.split
    ) {
      return;
    }

    /*
     * Split distinguishes the two m129 boundary components.
     *
     * Once filling has reduced the boundary from two tori to
     * one, there is nothing left to split. Move to the common
     * Triangles representation BEFORE the m004 handoff begins.
     */
    setM129CuspLayers(
      (current) => ({
        ...current,
        triangles: true,
        rainbow: false,
        split: false,
      })
    );
  }, [
    m129HasTwoBoundaryCusps,
    m129CuspLayers.split,
  ]);


  /*
   * Cusp visibility is an independent display state.
   *
   * It must persist across:
   *
   *   Split / Triangles / Rainbow changes
   *   projection presets
   *   geometry presets
   *
   * so an individual boundary component can be isolated and
   * studied under different presentations.
   */


  function toggleM129BoundaryCuspVisibility(
    cuspIndex
  ) {
    /*
     * Visibility is independent of coloring mode.
     *
     * A cusp may be hidden in Triangles, Rainbow, Split, or any
     * other future surface presentation.
     */
    setM129BoundaryCuspVisibility(
      (current) => ({
        ...current,
        [cuspIndex]:
          !current[cuspIndex],
      })
    );
  }


  function toggleM129CuspLayer(
    layer
  ) {
    setM129CuspLayers(
      (current) => {
        if (layer === "triangles") {
          return {
            ...current,
            triangles: true,
            rainbow: false,
            split: false,
          };
        }

        if (layer === "rainbow") {
          return {
            ...current,
            triangles: false,
            rainbow: true,
            split: false,
          };
        }

        if (layer === "split") {
          if (
            !m129HasTwoBoundaryCusps
          ) {
            return current;
          }

          return {
            ...current,
            triangles: false,
            rainbow: false,
            split: true,
          };
        }

        return {
          ...current,
          [layer]:
            !current[layer],
        };
      }
    );
  }


  function rotateM129Cusp(
    degrees
  ) {
    setM129CuspView(
      (current) => ({
        ...current,

        yawDegrees:
          current.yawDegrees +
          degrees,
      })
    );
  }


  function orbitM129Cusp(
    yawDelta,
    pitchDelta
  ) {
    setM129CuspView(
      (current) => ({
        ...current,

        yawDegrees:
          current.yawDegrees +
          yawDelta,

        pitchDegrees:
          clamp(
            current.pitchDegrees +
              pitchDelta,
            -88,
            88
          ),
      })
    );
  }


  function zoomM129Cusp(
    amount
  ) {
    setM129CuspView(
      (current) => ({
        ...current,
        zoom:
          clamp(
            current.zoom + amount,
            0.65,
            2.4
          ),
      })
    );
  }


  function cancelM129BoundaryRotationClick() {
    if (
      m129BoundaryRotationClickTimerRef.current ===
      null
    ) {
      return;
    }

    window.clearTimeout(
      m129BoundaryRotationClickTimerRef.current
    );

    m129BoundaryRotationClickTimerRef.current =
      null;
  }


  function rotateM129Boundary(
    degrees
  ) {
    setM129BoundaryView(
      (current) => ({
        ...current,

        yawDegrees:
          current.yawDegrees +
          degrees,
      })
    );
  }


  function handleM129BoundaryRotationClick(
    direction
  ) {
    cancelM129BoundaryRotationClick();

    /*
     * If continuous rotation is already active, one ordinary
     * click stops it without also adding another 15-degree step.
     */
    if (
      m129BoundaryAutoRotationDirection !== 0
    ) {
      setM129BoundaryAutoRotationDirection(
        0
      );

      return;
    }

    /*
     * Delay the ordinary click very briefly so a double-click
     * can cancel the pending 15-degree step cleanly.
     */
    m129BoundaryRotationClickTimerRef.current =
      window.setTimeout(
        () => {
          m129BoundaryRotationClickTimerRef.current =
            null;

          rotateM129Boundary(
            direction * 15
          );
        },
        ROTATION_SINGLE_CLICK_DELAY_MS
      );
  }


  function handleM129BoundaryRotationDoubleClick(
    direction
  ) {
    cancelM129BoundaryRotationClick();

    setM129BoundaryAutoRotationDirection(
      (current) =>
        current === direction
          ? 0
          : direction
    );
  }


  useEffect(() => {
    if (
      m129BoundaryAutoRotationDirection === 0
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

      /*
       * Match the figure-eight viewer:
       * 180 degrees every 10 seconds.
       */
      const degrees =
        m129BoundaryAutoRotationDirection *
        180 *
        (
          elapsed /
          AUTO_ROTATION_HALF_TURN_MS
        );

      setM129BoundaryView(
        (current) => ({
          ...current,

          yawDegrees:
            current.yawDegrees +
            degrees,
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
  }, [
    m129BoundaryAutoRotationDirection,
  ]);


  function orbitM129Boundary(
    yawDelta,
    pitchDelta
  ) {
    setM129BoundaryView(
      (current) => ({
        ...current,

        yawDegrees:
          current.yawDegrees +
          yawDelta,

        pitchDegrees:
          clamp(
            current.pitchDegrees +
              pitchDelta,
            -88,
            88
          ),
      })
    );
  }


  function zoomM129Boundary(
    amount
  ) {
    setM129BoundaryView(
      (current) => ({
        ...current,

        zoom:
          clamp(
            current.zoom +
              amount,
            0.65,
            4.5
          ),
      })
    );
  }


  function resetM129BoundaryView() {
    resetM129FillPreview();

    stopM129BoundaryPresetAnimation();

    cancelM129BoundaryRotationClick();

    setM129BoundaryAutoRotationDirection(
      0
    );

    setM129BoundarySelectedPreset(
      0
    );

    setM129ProjectionControlsExpanded(
      false
    );

    setM129GeometryControlsExpanded(
      false
    );

    setM129BoundaryView({
      yawDegrees: 0,
      pitchDegrees: 0,
      zoom: 1.98,
    });

    setM129CuspLayers({
      triangles: true,
      rainbow: false,
      split: false,
      meridian: false,
      longitude: false,
      labels: false,
      edgePairs: false,
      wireframe: false,
    });

    setM129BoundaryCuspVisibility({
      0: true,
      1: true,
    });

    setM129BoundaryProjection({
      xw: 0,
      yw: 0,
      zw: 0,
    });

    setM129BoundarySubdivisions(
      24
    );

    setM129BoundaryLambda(
      0.18
    );

    setM129BoundaryEpsilon(
      0.64
    );

    setM129BoundaryRho(
      0.14
    );

    setM129BoundaryEvolve({
      xw: false,
      yw: false,
      zw: false,
      lambda: false,
      epsilon: false,
      rho: false,
    });
  }


  function resetM129CuspView() {
    setM129CuspView({
      yawDegrees: 0,
      pitchDegrees: 0,
      zoom: 1,
    });

    setM129CuspLayers({
      triangles: true,
      rainbow: false,
      split: false,
      meridian: false,
      longitude: false,
      labels: false,
      edgePairs: false,
      wireframe: false,
    });

  }


  const [
    cellsView,
    setCellsView,
  ] = useState(() => ({
    rotation: [
      ...CELLS_VIEW.rotation,
    ],

    zoom:
      CELLS_VIEW.zoom,
  }));

  const [
    cellsFacePairSequence,
    setCellsFacePairSequence,
  ] = useState([]);

  const [
    cellsTruncationFraction,
    setCellsTruncationFraction,
  ] = useState(
    DEFAULT_TRUNCATION_FRACTION
  );

  const [
    cellsAutoRotationDirection,
    setCellsAutoRotationDirection,
  ] = useState(0);

  const [
    cellsDragging,
    setCellsDragging,
  ] = useState(false);

  const cellsDragRef =
    useRef(null);

  const cellsDragFrameRef =
    useRef(null);

  const cellsPendingRotationRef =
    useRef(null);

  const cellsRotationClickTimerRef =
    useRef(null);

  /*
   * Boundary / Cusp ordinary 3D camera.
   *
   * SurgeryProjectionViewer owns the actual camera.
   * This ref invokes its existing camera API.
   */
  const projectionControlRef =
    useRef(null);

  const [
    projectionAutoRotationDirection,
    setProjectionAutoRotationDirection,
  ] = useState(0);

  const projectionAutoRotationFrameRef =
    useRef(null);

  const projectionRotationClickTimerRef =
    useRef(null);

  const [
    cuspFlightSource,
    setCuspFlightSource,
  ] = useState(null);

  const [
    cuspFlightTarget,
    setCuspFlightTarget,
  ] = useState(null);

  const [
    cuspFlightProgress,
    setCuspFlightProgress,
  ] = useState(0);

  const [
    cuspFlightActive,
    setCuspFlightActive,
  ] = useState(false);

  const [
    cuspFlightDirection,
    setCuspFlightDirection,
  ] = useState(null);

  const [
    cuspFlightTwistDegrees,
    setCuspFlightTwistDegrees,
  ] = useState(0);

  const [
    cuspFlightHideCells,
    setCuspFlightHideCells,
  ] = useState(false);

  const [
    cuspFlightHideProjection,
    setCuspFlightHideProjection,
  ] = useState(false);

  const cuspFlightSourceRef =
    useRef(null);

  const cuspFlightTargetRef =
    useRef(null);

  /*
   * m129 owns independent endpoint refs.
   *
   * The hidden legacy projection viewer remains mounted for
   * control architecture, so it must never be allowed to
   * overwrite the certified Whitehead-link flight endpoints.
   */
  const m129CuspFlightSourceRef =
    useRef(null);

  const m129CuspFlightTargetRef =
    useRef(null);


  /*
   * m129 Cusp <-> Boundary morph.
   *
   *   0 = exact flat two-cusp development
   *   1 = exact embedded m129 Boundary
   *
   * This deliberately mirrors the established figure-eight
   * cuspMorph architecture.
   */
  const [
    m129CuspBoundaryMorph,
    setM129CuspBoundaryMorph,
  ] = useState(0);

  const m129CuspBoundaryMorphFrameRef =
    useRef(null);

  const [
    m129CuspBoundaryMorphActive,
    setM129CuspBoundaryMorphActive,
  ] = useState(false);

  function stopM129CuspBoundaryMorph() {
    if (
      m129CuspBoundaryMorphFrameRef.current !==
      null
    ) {
      window.cancelAnimationFrame(
        m129CuspBoundaryMorphFrameRef.current
      );

      m129CuspBoundaryMorphFrameRef.current =
        null;
    }

    setM129CuspBoundaryMorphActive(
      false
    );
  }

  function animateM129CuspBoundaryMorphTo(
    target,
    onComplete = null
  ) {
    stopM129CuspBoundaryMorph();

    const start =
      representationMode === "boundary"
        ? 1
        : (
            representationMode === "cusp"
              ? 0
              : m129CuspBoundaryMorph
          );

    setM129CuspBoundaryMorph(
      start
    );

    const end =
      clamp(
        Number(target),
        0,
        1
      );

    const startedAt =
      performance.now();

    /*
     * Boundary -> Cusp has a deterministic presentation endpoint.
     *
     * Preserve the arbitrary current Boundary orientation as the
     * animation source, but land with the planar cusp face-on.
     */
    const landingFaceOn =
      end <= 1e-9;

    const startBoundaryView =
      {
        ...m129BoundaryView,
      };

    const boundaryYawDelta =
      landingFaceOn
        ? shortestDegreeDelta(
            startBoundaryView.yawDegrees,
            0
          )
        : 0;

    setM129CuspBoundaryMorphActive(
      true
    );

    function frame(now) {
      const raw =
        clamp(
          (
            now -
            startedAt
          ) /
            M129_CUSP_BOUNDARY_MORPH_DURATION_MS,
          0,
          1
        );

      /*
       * Same smoothstep used by the established
       * figure-eight Cusp <-> Boundary morph.
       */
      const eased =
        raw *
        raw *
        (
          3 -
          2 * raw
        );

      setM129CuspBoundaryMorph(
        start +
        (
          end -
          start
        ) *
          eased
      );

      if (landingFaceOn) {
        setM129BoundaryView(
          (current) => ({
            ...current,

            yawDegrees:
              startBoundaryView.yawDegrees +
              boundaryYawDelta *
                eased,

            pitchDegrees:
              startBoundaryView.pitchDegrees *
              (
                1 -
                eased
              ),
          })
        );

        /*
         * Keep the actual flat-Cusp renderer synchronized with the
         * presentation endpoint that will become visible when the
         * morph completes.
         */
        setM129CuspView(
          (current) => ({
            ...current,

            yawDegrees: 0,
            pitchDegrees: 0,
          })
        );
      }

      if (raw < 1) {
        m129CuspBoundaryMorphFrameRef.current =
          window.requestAnimationFrame(
            frame
          );

        return;
      }

      m129CuspBoundaryMorphFrameRef.current =
        null;

      setM129CuspBoundaryMorph(
        end
      );

      if (landingFaceOn) {
        setM129BoundaryView(
          (current) => ({
            ...current,
            yawDegrees: 0,
            pitchDegrees: 0,
          })
        );

        setM129CuspView(
          (current) => ({
            ...current,
            yawDegrees: 0,
            pitchDegrees: 0,
          })
        );
      }

      setM129CuspBoundaryMorphActive(
        false
      );

      onComplete?.();
    }

    m129CuspBoundaryMorphFrameRef.current =
      window.requestAnimationFrame(
        frame
      );
  }

  const cuspFlightFrameRef =
    useRef(null);

  const cuspFlightLandingTimerRef =
    useRef(null);

  const effectiveM129CuspBoundaryMorph =
    m129CuspBoundaryMorphActive
      ? m129CuspBoundaryMorph
      : (
          representationMode === "boundary"
            ? 1
            : 0
        );


  function cancelCellsRotationClick() {
    if (
      cellsRotationClickTimerRef.current ===
      null
    ) {
      return;
    }

    window.clearTimeout(
      cellsRotationClickTimerRef.current
    );

    cellsRotationClickTimerRef.current =
      null;
  }


  function rotateCells(degrees) {
    const angle =
      degrees *
      Math.PI /
      180;

    setCellsView(
      (current) => ({
        ...current,

        rotation:
          multiplyRotations(
            rotationY(angle),
            current.rotation
          ),
      })
    );
  }


  function zoomCells(amount) {
    setCellsView(
      (current) => ({
        ...current,

        zoom:
          clamp(
            current.zoom +
              amount,
            MIN_CELLS_ZOOM,
            MAX_CELLS_ZOOM
          ),
      })
    );
  }


  function resetCellsView() {
    cancelCellsRotationClick();

    setCellsAutoRotationDirection(0);

    setCellsView({
      rotation: [
        ...CELLS_VIEW.rotation,
      ],

      zoom:
        CELLS_VIEW.zoom,
    });

    setCellsFacePairSequence([]);

    setCellsTruncationFraction(
      DEFAULT_TRUNCATION_FRACTION
    );
  }


  function handleCellsRotationClick(
    direction
  ) {
    cancelCellsRotationClick();

    /*
     * Same old-page behavior:
     * clicking while continuous rotation is running
     * stops it without adding another 15-degree step.
     */
    if (
      cellsAutoRotationDirection !== 0
    ) {
      setCellsAutoRotationDirection(0);
      return;
    }

    cellsRotationClickTimerRef.current =
      window.setTimeout(
        () => {
          cellsRotationClickTimerRef.current =
            null;

          rotateCells(
            direction * 15
          );
        },
        ROTATION_SINGLE_CLICK_DELAY_MS
      );
  }


  function handleCellsRotationDoubleClick(
    direction
  ) {
    cancelCellsRotationClick();

    setCellsAutoRotationDirection(
      (current) =>
        current === direction
          ? 0
          : direction
    );
  }


  function beginCellsRotate(event) {
    if (
      event.button !== 0 ||
      representationMode !== "cells"
    ) {
      return;
    }

    if (
      cellsDragFrameRef.current !== null
    ) {
      window.cancelAnimationFrame(
        cellsDragFrameRef.current
      );

      cellsDragFrameRef.current =
        null;
    }

    cellsPendingRotationRef.current =
      null;

    cancelCellsRotationClick();

    setCellsAutoRotationDirection(0);

    event.preventDefault();

    event.currentTarget.focus({
      preventScroll: true,
    });

    event.currentTarget.setPointerCapture(
      event.pointerId
    );

    cellsDragRef.current = {
      pointerId:
        event.pointerId,

      startX:
        event.clientX,

      startY:
        event.clientY,

      startRotation:
        cellsView.rotation,
    };

    setCellsDragging(true);
  }


  function moveCellsRotate(event) {
    const drag =
      cellsDragRef.current;

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

    cellsPendingRotationRef.current =
      multiplyRotations(
        dragRotation,
        drag.startRotation
      );

    if (
      cellsDragFrameRef.current !== null
    ) {
      return;
    }

    cellsDragFrameRef.current =
      window.requestAnimationFrame(
        () => {
          cellsDragFrameRef.current =
            null;

          const nextRotation =
            cellsPendingRotationRef.current;

          cellsPendingRotationRef.current =
            null;

          if (!nextRotation) {
            return;
          }

          setCellsView(
            (current) => ({
              ...current,

              rotation:
                nextRotation,
            })
          );
        }
      );
  }


  function endCellsRotate(event) {
    const drag =
      cellsDragRef.current;

    if (
      !drag ||
      drag.pointerId !==
        event.pointerId
    ) {
      return;
    }

    if (
      cellsDragFrameRef.current !== null
    ) {
      window.cancelAnimationFrame(
        cellsDragFrameRef.current
      );

      cellsDragFrameRef.current =
        null;
    }

    const finalRotation =
      cellsPendingRotationRef.current;

    cellsPendingRotationRef.current =
      null;

    if (finalRotation) {
      setCellsView(
        (current) => ({
          ...current,

          rotation:
            finalRotation,
        })
      );
    }

    if (
      event.currentTarget
        .hasPointerCapture(
          event.pointerId
        )
    ) {
      event.currentTarget
        .releasePointerCapture(
          event.pointerId
        );
    }

    cellsDragRef.current =
      null;

    setCellsDragging(false);
  }


  function handleCellsWheel(event) {
    if (
      representationMode !== "cells"
    ) {
      return;
    }

    event.preventDefault();

    zoomCells(
      clamp(
        -event.deltaY *
          0.0015,
        -0.12,
        0.12
      )
    );
  }


  function handleCellsKeyDown(event) {
    if (
      representationMode !== "cells"
    ) {
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

      cancelCellsRotationClick();

      setCellsAutoRotationDirection(
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
      zoomAmount === undefined
    ) {
      return;
    }

    event.preventDefault();

    cancelCellsRotationClick();

    setCellsAutoRotationDirection(0);

    zoomCells(
      zoomAmount
    );
  }


  function handleCellsKeyUp(event) {
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

    setCellsAutoRotationDirection(
      (current) =>
        current ===
          horizontalDirection
          ? 0
          : current
    );
  }


  function handleCellsBlur() {
    cancelCellsRotationClick();

    setCellsAutoRotationDirection(0);
  }


  useEffect(() => {
    if (
      cellsAutoRotationDirection === 0
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
        cellsAutoRotationDirection *
        Math.PI *
        (
          elapsed /
          AUTO_ROTATION_HALF_TURN_MS
        );

      setCellsView(
        (current) => ({
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
  }, [
    cellsAutoRotationDirection,
  ]);


  function cancelProjectionRotationClick() {
    if (
      projectionRotationClickTimerRef.current ===
      null
    ) {
      return;
    }

    window.clearTimeout(
      projectionRotationClickTimerRef.current
    );

    projectionRotationClickTimerRef.current =
      null;
  }


  function handleProjectionRotationClick(
    direction
  ) {
    cancelProjectionRotationClick();

    if (
      projectionAutoRotationDirection !== 0
    ) {
      setProjectionAutoRotationDirection(0);
      return;
    }

    projectionRotationClickTimerRef.current =
      window.setTimeout(
        () => {
          projectionRotationClickTimerRef.current =
            null;

          projectionControlRef
            .current
            ?.rotate(
              direction
            );
        },
        ROTATION_SINGLE_CLICK_DELAY_MS
      );
  }


  function handleProjectionRotationDoubleClick(
    direction
  ) {
    cancelProjectionRotationClick();

    setProjectionAutoRotationDirection(
      (current) =>
        current === direction
          ? 0
          : direction
    );
  }


  useEffect(() => {
    if (
      projectionAutoRotationDirection === 0
    ) {
      if (
        projectionAutoRotationFrameRef.current !==
        null
      ) {
        window.cancelAnimationFrame(
          projectionAutoRotationFrameRef.current
        );

        projectionAutoRotationFrameRef.current =
          null;
      }

      return undefined;
    }

    let previousTime =
      performance.now();

    function animate(now) {
      const elapsed =
        Math.min(
          40,
          now -
            previousTime
        );

      previousTime =
        now;

      projectionControlRef
        .current
        ?.rotateRadians?.(
          projectionAutoRotationDirection *
            Math.PI *
            elapsed /
            AUTO_ROTATION_HALF_TURN_MS
        );

      projectionAutoRotationFrameRef.current =
        window.requestAnimationFrame(
          animate
        );
    }

    projectionAutoRotationFrameRef.current =
      window.requestAnimationFrame(
        animate
      );

    return () => {
      if (
        projectionAutoRotationFrameRef.current !==
        null
      ) {
        window.cancelAnimationFrame(
          projectionAutoRotationFrameRef.current
        );

        projectionAutoRotationFrameRef.current =
          null;
      }
    };
  }, [
    projectionAutoRotationDirection,
  ]);


  function resetProjectionView() {
    cancelProjectionRotationClick();

    setProjectionAutoRotationDirection(0);

    projectionControlRef
      .current
      ?.reset();
  }


  useEffect(() => {
    if (!manifoldMenuOpen) {
      return undefined;
    }

    function handlePointerDown(event) {
      if (
        manifoldMenuRef.current &&
        !manifoldMenuRef.current.contains(
          event.target
        )
      ) {
        setManifoldMenuOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setManifoldMenuOpen(false);
      }
    }

    window.addEventListener(
      "pointerdown",
      handlePointerDown
    );

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "pointerdown",
        handlePointerDown
      );

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    manifoldMenuOpen,
  ]);



  useEffect(() => {
    if (!m129CuspMenuOpen) {
      return undefined;
    }

    function handlePointerDown(event) {
      if (
        m129CuspMenuRef.current &&
        !m129CuspMenuRef.current.contains(
          event.target
        )
      ) {
        setM129CuspMenuOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setM129CuspMenuOpen(false);
      }
    }

    window.addEventListener(
      "pointerdown",
      handlePointerDown
    );

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "pointerdown",
        handlePointerDown
      );

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    m129CuspMenuOpen,
  ]);


  const activeCuspMaterialLayout =
    useMemo(
      () =>
        cuspMaterialLayoutForManifold(
          manifoldStateId === "m129"
            ? "m004"
            : manifoldStateId,
          [0, 0, 0, 0]
        ),
      [manifoldStateId]
    );

  const handleCuspFlightSourceChange =
    useCallback(
      (nextSource) => {
        cuspFlightSourceRef.current =
          nextSource;
      },
      []
    );

  const handleCuspFlightTargetChange =
    useCallback(
      (nextTarget) => {
        cuspFlightTargetRef.current =
          nextTarget;
      },
      []
    );

  const handleM129CuspFlightSourceChange =
    useCallback(
      (nextSource) => {
        m129CuspFlightSourceRef.current =
          nextSource;
      },
      []
    );

  const handleM129CuspFlightTargetChange =
    useCallback(
      (nextTarget) => {
        m129CuspFlightTargetRef.current =
          nextTarget;
      },
      []
    );

  function certifyM129FlightEndpoints(
    source,
    target
  ) {
    const fail = (
      message,
      details = null
    ) => {
      console.error(
        `M129 FLIGHT CERTIFICATION FAILED: ${message}`,
        details ?? ""
      );

      return null;
    };

    if (
      source?.kind !== "m129-cells" ||
      target?.kind !== "m129-cusp"
    ) {
      return fail(
        "wrong endpoint publishers",
        {
          sourceKind:
            source?.kind,

          targetKind:
            target?.kind,
        }
      );
    }

    const manifestTriangles =
      M129_ANIMATION_MANIFEST
        .triangles ??
      [];

    if (
      manifestTriangles.length !== 16 ||
      source.triangles?.length !== 16 ||
      target.triangles?.length !== 16
    ) {
      return fail(
        "expected exactly 16 manifest/source/target triangles",
        {
          manifest:
            manifestTriangles.length,

          source:
            source.triangles?.length,

          target:
            target.triangles?.length,
        }
      );
    }

    const sourceById =
      Object.fromEntries(
        source.triangles.map(
          (triangle) => [
            triangle.id,
            triangle,
          ]
        )
      );

    const targetById =
      Object.fromEntries(
        target.triangles.map(
          (triangle) => [
            triangle.id,
            triangle,
          ]
        )
      );

    const certifiedIds = [];

    for (
      const manifestTriangle
      of manifestTriangles
    ) {
      const id =
        manifestTriangle.id;

      const sourceTriangle =
        sourceById[id];

      const targetTriangle =
        targetById[id];

      if (
        !sourceTriangle ||
        !targetTriangle
      ) {
        return fail(
          `missing persistent triangle ${id}`
        );
      }

      if (
        sourceTriangle.tetrahedron !==
          manifestTriangle.tetrahedron ||
        targetTriangle.tetrahedron !==
          manifestTriangle.tetrahedron ||
        sourceTriangle.idealVertex !==
          manifestTriangle.ideal_vertex ||
        targetTriangle.idealVertex !==
          manifestTriangle.ideal_vertex
      ) {
        return fail(
          `triangle ownership mismatch for ${id}`,
          {
            manifest: {
              tetrahedron:
                manifestTriangle
                  .tetrahedron,

              idealVertex:
                manifestTriangle
                  .ideal_vertex,
            },

            source: {
              tetrahedron:
                sourceTriangle
                  .tetrahedron,

              idealVertex:
                sourceTriangle
                  .idealVertex,
            },

            target: {
              tetrahedron:
                targetTriangle
                  .tetrahedron,

              idealVertex:
                targetTriangle
                  .idealVertex,
            },
          }
        );
      }

      /*
       * The three corners of t_i v_j are exactly the three
       * tetrahedral edges incident to ideal vertex j.
       *
       * We key each corner by the other endpoint of that edge.
       */
      const expectedNeighbors =
        (
          manifestTriangle.corners ??
          []
        )
          .map(
            (corner) =>
              corner
                .edge_vertices
                ?.find(
                  (vertex) =>
                    vertex !==
                    manifestTriangle
                      .ideal_vertex
                )
          )
          .map(String)
          .sort();

      const sourceNeighbors =
        Object.keys(
          sourceTriangle
            .pointsByNeighbor ??
          {}
        ).sort();

      const targetNeighbors =
        Object.keys(
          targetTriangle
            .pointsByNeighbor ??
          {}
        ).sort();

      const expectedKey =
        expectedNeighbors.join(",");

      if (
        expectedNeighbors.length !== 3 ||
        sourceNeighbors.join(",") !==
          expectedKey ||
        targetNeighbors.join(",") !==
          expectedKey
      ) {
        return fail(
          `corner-edge mismatch for ${id}`,
          {
            expected:
              expectedNeighbors,

            source:
              sourceNeighbors,

            target:
              targetNeighbors,
          }
        );
      }

      certifiedIds.push(id);
    }

    if (
      new Set(
        certifiedIds
      ).size !== 16
    ) {
      return fail(
        "persistent triangle IDs are not bijective"
      );
    }

    console.info(
      "M129 FLIGHT CERTIFIED: " +
      "16 triangles / " +
      "48 corner-edge correspondences"
    );

    return {
      source,
      target,
    };
  }

  function clearCuspFlightFrame() {
    if (
      cuspFlightFrameRef.current !== null
    ) {
      window.cancelAnimationFrame(
        cuspFlightFrameRef.current
      );

      cuspFlightFrameRef.current = null;
    }
  }

  function clearCuspFlightLandingTimer() {
    if (
      cuspFlightLandingTimerRef.current !==
      null
    ) {
      window.clearTimeout(
        cuspFlightLandingTimerRef.current
      );

      cuspFlightLandingTimerRef.current =
        null;
    }
  }

  function resetCuspFlightPresentation() {
    clearCuspFlightFrame();
    clearCuspFlightLandingTimer();

    setCuspFlightActive(false);
    setCuspFlightDirection(null);
    setCuspFlightHideCells(false);
    setCuspFlightHideProjection(false);
    setCuspFlightProgress(0);
    setCuspFlightTwistDegrees(0);
  }

  function animateTwistSequence(
    keyframes,
    onComplete
  ) {
    let keyframeIndex = 0;

    function runNext() {
      if (
        keyframeIndex >=
        keyframes.length
      ) {
        cuspFlightFrameRef.current =
          null;

        onComplete?.();
        return;
      }

      const keyframe =
        keyframes[keyframeIndex];

      keyframeIndex += 1;

      const startedAt =
        performance.now();

      function animate(now) {
        const raw =
          Math.max(
            0,
            Math.min(
              1,
              (
                now -
                startedAt
              ) /
                keyframe.duration
            )
          );

        const eased =
          raw *
          raw *
          (3 - 2 * raw);

        setCuspFlightTwistDegrees(
          keyframe.from +
            (
              keyframe.to -
              keyframe.from
            ) *
              eased
        );

        if (raw < 1) {
          cuspFlightFrameRef.current =
            window.requestAnimationFrame(
              animate
            );

          return;
        }

        setCuspFlightTwistDegrees(
          keyframe.to
        );

        runNext();
      }

      cuspFlightFrameRef.current =
        window.requestAnimationFrame(
          animate
        );
    }

    runNext();
  }

  function animateFlight(
    direction,
    onComplete
  ) {
    const startedAt =
      performance.now();

    const duration = 2200;

    function animate(now) {
      const raw =
        Math.max(
          0,
          Math.min(
            1,
            (
              now -
              startedAt
            ) /
              duration
          )
        );

      const eased =
        raw *
        raw *
        (3 - 2 * raw);

      if (direction === "toCells") {
        setCuspFlightProgress(
          eased
        );

        setCuspFlightTwistDegrees(
          30 * eased
        );
      } else {
        setCuspFlightProgress(
          1 - eased
        );

        setCuspFlightTwistDegrees(
          30 * (1 - eased)
        );
      }

      if (raw < 1) {
        cuspFlightFrameRef.current =
          window.requestAnimationFrame(
            animate
          );

        return;
      }

      cuspFlightFrameRef.current =
        null;

      onComplete?.();
    }

    cuspFlightFrameRef.current =
      window.requestAnimationFrame(
        animate
      );
  }

  function beginCuspToCellsFlight() {
    if (
      cuspFlightActive ||
      cuspFlightDirection !== null
    ) {
      return;
    }

    const exactTarget =
      manifoldStateId === "m129"
        ? m129CuspFlightTargetRef.current
        : cuspFlightTargetRef.current;

    if (!exactTarget) {
      if (
        manifoldStateId === "m129"
      ) {
        console.error(
          "M129 FLIGHT CERTIFICATION FAILED: " +
          "missing Cusp endpoint"
        );

        return;
      }

      setRepresentationMode(
        "cells"
      );

      return;
    }

    setCuspFlightDirection(
      "toCells"
    );

    setCuspFlightHideCells(true);

    /*
     * Mount the real Cells renderer invisibly first.
     * It publishes the exact current truncation-face positions.
     */
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const exactSource =
          manifoldStateId === "m129"
            ? m129CuspFlightSourceRef.current
            : cuspFlightSourceRef.current;

        if (!exactSource) {
          setCuspFlightDirection(null);
          setCuspFlightHideCells(false);

          if (
            manifoldStateId === "m129"
          ) {
            console.error(
              "M129 FLIGHT CERTIFICATION FAILED: " +
              "missing Cells endpoint"
            );

            return;
          }

          setRepresentationMode(
            "cells"
          );

          return;
        }

        const certified =
          manifoldStateId === "m129"
            ? certifyM129FlightEndpoints(
                exactSource,
                exactTarget
              )
            : {
                source:
                  exactSource,

                target:
                  exactTarget,
              };

        if (!certified) {
          setCuspFlightDirection(null);
          setCuspFlightHideCells(false);

          return;
        }

        setCuspFlightSource(
          certified.source
        );

        setCuspFlightTarget(
          certified.target
        );

        setCuspFlightProgress(0);
        setCuspFlightTwistDegrees(0);
        setCuspFlightHideProjection(true);
        setCuspFlightActive(true);
        setRepresentationMode(
          "cells"
        );

        animateFlight(
          "toCells",
          () => {
            setCuspFlightProgress(1);
            setCuspFlightTwistDegrees(30);

            animateTwistSequence(
              [
                {
                  from: 30,
                  to: -10,
                  duration: 360,
                },
                {
                  from: -10,
                  to: 5,
                  duration: 260,
                },
                {
                  from: 5,
                  to: 0,
                  duration: 180,
                },
              ],
              () => {
                cuspFlightLandingTimerRef.current =
                  window.setTimeout(() => {
                    cuspFlightLandingTimerRef.current =
                      null;

                    setCuspFlightHideCells(false);
                    setCuspFlightActive(false);
                    setCuspFlightDirection(null);
                    setCuspFlightProgress(0);
                    setCuspFlightTwistDegrees(0);
                  }, 100);
              }
            );
          }
        );
      });
    });
  }

  function finishCellsToCuspFlight(
    finalMode = "cusp"
  ) {
    setCuspFlightProgress(0);
    setCuspFlightTwistDegrees(0);
    setCuspFlightHideProjection(false);
    setCuspFlightActive(false);
    setCuspFlightDirection(null);

    if (finalMode === "boundary") {
      window.requestAnimationFrame(() => {
        setRepresentationMode(
          "boundary"
        );
      });
    }
  }

  function beginCellsToCuspFlight(
    finalMode = "cusp"
  ) {
    if (
      cuspFlightActive ||
      cuspFlightDirection !== null
    ) {
      return;
    }

    const exactSource =
      manifoldStateId === "m129"
        ? m129CuspFlightSourceRef.current
        : cuspFlightSourceRef.current;

    if (!exactSource) {
      if (
        manifoldStateId === "m129"
      ) {
        console.error(
          "M129 FLIGHT CERTIFICATION FAILED: " +
          "missing Cells endpoint"
        );

        return;
      }

      setRepresentationMode(
        finalMode
      );

      return;
    }

    clearCuspFlightFrame();
    clearCuspFlightLandingTimer();

    setCuspFlightSource(
      exactSource
    );

    setCuspFlightDirection(
      "toCusp"
    );

    setCuspFlightProgress(1);
    setCuspFlightTwistDegrees(0);
    setCuspFlightHideCells(true);
    setCuspFlightHideProjection(true);
    setCuspFlightActive(true);

    /*
     * The m129 Cusp target is published in screen coordinates.
     *
     * Never reuse a target captured from an earlier Cusp view
     * state, because its zoom/orientation may have changed.
     *
     * Clear the cached endpoint before mounting Cusp so the
     * flight waits for the freshly rendered current endpoint.
     */
    /*
     * The m129 Cusp target is published in screen coordinates.
     *
     * Never reuse a target captured from an earlier Cusp view
     * state, because its zoom/orientation may have changed.
     *
     * Clear the cached endpoint before mounting Cusp so the
     * flight waits for the freshly rendered current endpoint.
     */
    if (
      manifoldStateId === "m129"
    ) {
      m129CuspFlightTargetRef.current =
        null;
    }

    /*
     * Projection remains mounted while Cells is visible.
     * Cells mode keeps it internally at the flat-Cusp endpoint.
     */
    setRepresentationMode(
      "cusp"
    );

    const targetWaitStartedAt =
      performance.now();

    function waitForTarget() {
      const exactTarget =
        manifoldStateId === "m129"
          ? m129CuspFlightTargetRef.current
          : cuspFlightTargetRef.current;

      if (exactTarget) {
        const certified =
          manifoldStateId === "m129"
            ? certifyM129FlightEndpoints(
                exactSource,
                exactTarget
              )
            : {
                source:
                  exactSource,

                target:
                  exactTarget,
              };

        if (!certified) {
          resetCuspFlightPresentation();

          return;
        }

        setCuspFlightSource(
          certified.source
        );

        setCuspFlightTarget(
          certified.target
        );

        animateTwistSequence(
          [
            {
              from: 0,
              to: 5,
              duration: 180,
            },
            {
              from: 5,
              to: -10,
              duration: 260,
            },
            {
              from: -10,
              to: 30,
              duration: 360,
            },
          ],
          () => {
            animateFlight(
              "toCusp",
              () =>
                finishCellsToCuspFlight(
                  finalMode
                )
            );
          }
        );

        return;
      }

      if (
        performance.now() -
          targetWaitStartedAt >
        1500
      ) {
        resetCuspFlightPresentation();

        setRepresentationMode(
          finalMode
        );

        return;
      }

      cuspFlightFrameRef.current =
        window.requestAnimationFrame(
          waitForTarget
        );
    }

    cuspFlightFrameRef.current =
      window.requestAnimationFrame(
        waitForTarget
      );
  }

  function waitForCuspThenOpenCells() {
    const startedAt =
      performance.now();

    function wait() {
      if (
        cuspFlightTargetRef.current
      ) {
        beginCuspToCellsFlight();
        return;
      }

      if (
        performance.now() -
          startedAt >
        3600
      ) {
        setRepresentationMode(
          "cells"
        );

        return;
      }

      cuspFlightFrameRef.current =
        window.requestAnimationFrame(
          wait
        );
    }

    cuspFlightFrameRef.current =
      window.requestAnimationFrame(
        wait
      );
  }

  function renderM129FlightTriangles() {
    const cellsTriangles =
      cuspFlightSource
        ?.triangles ??
      [];

    const cuspTriangles =
      cuspFlightTarget
        ?.triangles ??
      [];

    return cuspTriangles.map(
      (cuspTriangle) => {
        const cellsTriangle =
          cellsTriangles.find(
            (candidate) =>
              candidate.id ===
              cuspTriangle.id
          );

        if (!cellsTriangle) {
          return null;
        }

        const pointOrder =
          cuspTriangle
            .pointOrder ??
          [];

        let pointsByNeighbor =
          Object.fromEntries(
            pointOrder.map(
              (neighbor) => {
                const cuspPoint =
                  cuspTriangle
                    .pointsByNeighbor
                    ?.[neighbor];

                const cellsPoint =
                  cellsTriangle
                    .pointsByNeighbor
                    ?.[neighbor];

                if (
                  !cuspPoint ||
                  !cellsPoint
                ) {
                  return [
                    neighbor,
                    null,
                  ];
                }

                return [
                  neighbor,
                  {
                    x:
                      cuspPoint.x +
                      (
                        cellsPoint.x -
                        cuspPoint.x
                      ) *
                        cuspFlightProgress,

                    y:
                      cuspPoint.y +
                      (
                        cellsPoint.y -
                        cuspPoint.y
                      ) *
                        cuspFlightProgress,
                  },
                ];
              }
            )
          );

        const rawPoints =
          pointOrder.map(
            (neighbor) =>
              pointsByNeighbor[
                neighbor
              ]
          );

        if (
          rawPoints.some(
            (point) => !point
          )
        ) {
          return null;
        }

        /*
         * Reuse the existing gentle triangle twist.
         */
        if (
          Math.abs(
            cuspFlightTwistDegrees
          ) >
          1e-9
        ) {
          const centroid = {
            x:
              rawPoints.reduce(
                (sum, point) =>
                  sum + point.x,
                0
              ) / 3,

            y:
              rawPoints.reduce(
                (sum, point) =>
                  sum + point.y,
                0
              ) / 3,
          };

          const radians =
            cuspFlightTwistDegrees *
            Math.PI /
            180;

          const cosine =
            Math.cos(radians);

          const sine =
            Math.sin(radians);

          pointsByNeighbor =
            Object.fromEntries(
              Object.entries(
                pointsByNeighbor
              ).map(
                ([
                  neighbor,
                  point,
                ]) => {
                  const dx =
                    point.x -
                    centroid.x;

                  const dy =
                    point.y -
                    centroid.y;

                  return [
                    neighbor,
                    {
                      x:
                        centroid.x +
                        cosine * dx -
                        sine * dy,

                      y:
                        centroid.y +
                        sine * dx +
                        cosine * dy,
                    },
                  ];
                }
              )
            );
        }

        const renderedPoints =
          pointOrder.map(
            (neighbor) =>
              pointsByNeighbor[
                neighbor
              ]
          );

        return (
          <g
            key={
              cuspTriangle.id
            }
          >
            <polygon
              points={
                renderedPoints
                  .map(
                    (point) =>
                      `${point.x},${point.y}`
                  )
                  .join(" ")
              }
              fill={
                cuspTriangle.color
              }
              stroke="none"
            />

            {(
              cuspTriangle
                .edgeSegments ??
              []
            ).map(
              (
                edge,
                edgeIndex
              ) => {
                const start =
                  pointsByNeighbor[
                    edge.startNeighbor
                  ];

                const end =
                  pointsByNeighbor[
                    edge.endNeighbor
                  ];

                if (
                  !start ||
                  !end
                ) {
                  return null;
                }

                return (
                  <line
                    key={
                      `${cuspTriangle.id}-flight-edge-${edgeIndex}`
                    }
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                    stroke={
                      edge.color
                    }
                    strokeWidth="2.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                );
              }
            )}
          </g>
        );
      }
    );
  }


  function selectRepresentation(
    nextMode
  ) {
    if (
      manifoldStateId === "m129" &&
      nextMode !== "boundary"
    ) {
      resetM129FillPreview();
    }

    if (
      cuspFlightActive ||
      cuspFlightDirection !== null ||
      m129CuspBoundaryMorphActive ||
      nextMode === representationMode
    ) {
      return;
    }

    if (
      manifoldStateId === "m129"
    ) {
      if (
        representationMode ===
          "cusp" &&
        nextMode ===
          "boundary"
      ) {
        animateM129CuspBoundaryMorphTo(
          1,
          () => {
            setRepresentationMode(
              "boundary"
            );
          }
        );

        return;
      }

      if (
        representationMode ===
          "boundary" &&
        nextMode ===
          "cusp"
      ) {
        /*
         * Keep the exact Boundary mounted while the reverse
         * geometric path begins. The renderer patch that follows
         * will consume this same morph parameter in reverse.
         */
        animateM129CuspBoundaryMorphTo(
          0,
          () => {
            setRepresentationMode(
              "cusp"
            );
          }
        );

        return;
      }

      if (
        representationMode ===
          "cusp" &&
        nextMode ===
          "cells"
      ) {
        beginCuspToCellsFlight();

        return;
      }

      if (
        representationMode ===
          "cells" &&
        nextMode ===
          "cusp"
      ) {
        beginCellsToCuspFlight(
          "cusp"
        );

        return;
      }

      setRepresentationMode(
        nextMode
      );

      return;
    }

    if (
      representationMode === "cells"
    ) {
      beginCellsToCuspFlight(
        nextMode
      );

      return;
    }

    if (
      nextMode === "cells"
    ) {
      if (
        representationMode === "boundary"
      ) {
        cuspFlightTargetRef.current =
          null;

        /*
         * The flat Cusp has a canonical face-on presentation:
         *
         *   yaw   = 0
         *   pitch = 0
         *
         * Move toward that orientation while the Boundary itself
         * unwraps. The user may rotate freely again after landing.
         */
        projectionControlRef.current
          ?.animateViewTo?.(
            {
              yaw: 0,
              pitch: 0,
            },
            2800
          );

        setRepresentationMode(
          "cusp"
        );

        /*
         * Boundary -> Cells becomes:
         *
         *   Boundary -> Cusp -> Cells
         *
         * using the two already-certified motions.
         */
        waitForCuspThenOpenCells();
        return;
      }

      beginCuspToCellsFlight();
      return;
    }

    /*
     * Boundary -> Cusp:
     *
     * Always land with the flat cusp maximally facing the viewer,
     * independent of the arbitrary Boundary camera orientation from
     * which the user began the transition.
     */
    if (
      representationMode === "boundary" &&
      nextMode === "cusp"
    ) {
      projectionControlRef.current
        ?.animateViewTo?.(
          {
            yaw: 0,
            pitch: 0,
          },
          2800
        );
    }

    setRepresentationMode(
      nextMode
    );
  }

  useEffect(
    () => () => {
      clearCuspFlightFrame();
      clearCuspFlightLandingTimer();

      if (
        m129CuspBoundaryMorphFrameRef.current !==
        null
      ) {
        window.cancelAnimationFrame(
          m129CuspBoundaryMorphFrameRef.current
        );

        m129CuspBoundaryMorphFrameRef.current =
          null;
      }

      if (
        m129FillFrameRef.current !==
        null
      ) {
        window.cancelAnimationFrame(
          m129FillFrameRef.current
        );

        m129FillFrameRef.current =
          null;
      }

      if (
        m129SurgeryPathFrameRef.current !==
        null
      ) {
        window.cancelAnimationFrame(
          m129SurgeryPathFrameRef.current
        );

        m129SurgeryPathFrameRef.current =
          null;
      }

      if (
        m129SurvivingCuspMorphFrameRef.current !==
        null
      ) {
        window.cancelAnimationFrame(
          m129SurvivingCuspMorphFrameRef.current
        );

        m129SurvivingCuspMorphFrameRef.current =
          null;
      }

     },
    []
  );

  const manifoldState =
    manifoldStateId === "m003"
      ? SISTER_VIEW_STATE
      : (
          MANIFOLD_STATES[
            manifoldStateId
          ] ??
          MANIFOLD_STATES.m004
        );

  const drillEdge =
    SURGERY_EDGES
      .drillCrossingCircle;


  function selectM129FillingSlope(
    p,
    q
  ) {
    const pInt =
      Math.trunc(p);

    const qInt =
      Math.trunc(q);

    if (
      !isPrimitiveSlope(
        pInt,
        qInt
      )
    ) {
      return;
    }

    resetM129FillPreview();

    setM129FillingSlope({
      p: pInt,
      q: qInt,
    });

    setM129SlopeSelected(
      true
    );
  }


  function adjustM129FillingSlope(
    coordinate,
    delta
  ) {
    resetM129FillPreview();

    setM129FillingSlope(
      (current) => ({
        ...current,

        [coordinate]:
          Math.trunc(
            Number(
              current[
                coordinate
              ]
            ) || 0
          ) +
          delta,
      })
    );

    setM129SlopeSelected(
      true
    );
  }


  const m129FigureEightSlopeSelected =
    m129SlopeSelected &&
    m129SlopeMatchesCertifiedEdge(
      m129FillingSlope.p,
      m129FillingSlope.q
    );


  const m129FigureEightFillingReady =
    manifoldStateId ===
      M129_TO_M004_SOURCE_ID &&
    representationMode === "boundary" &&
    m129SelectedCuspIndex ===
      M129_TO_M004_FILLED_CUSP &&
    m129FigureEightSlopeSelected;


  function fillCertifiedM129Cusp() {
    if (
      !m129FigureEightFillingReady ||
      m129FillActive
    ) {
      return;
    }

    stopM129BoundaryPresetAnimation();

    cancelM129BoundaryRotationClick();

    setM129BoundaryAutoRotationDirection(
      0
    );

    /*
     * Keep m129 mounted throughout the filling animation.
     *
     * The manifest-selected filling slope remains visible on the
     * manifest-selected filled cusp as the boundary-identification
     * instruction: it is the old-cusp curve that becomes the
     * meridian of the incoming solid torus.
     *
     * No separate disk is drawn. The existing cusp-removal and
     * surviving-cusp handoff then carry the result into m004.
     */
    beginM129FillAnimation();
  }


  const displayedSurgerySourceCuspCount =
    manifoldStateId === "m129"
      ? drillEdge.targetCuspCount
      : drillEdge.sourceCuspCount;

  const displayedSurgeryTargetCuspCount =
    manifoldStateId === "m129"
      ? drillEdge.sourceCuspCount
      : drillEdge.targetCuspCount;

  /*
   * SurgeryProjectionViewer currently has certified
   * render paths for m004 and m003.
   *
   * Never allow m129 to masquerade as one of those.
   * Its underlying projection is completely covered
   * until the certified m129 renderer is installed.
   */
  const projectionManifoldId =
    manifoldStateId === "m129"
      ? "m004"
      : manifoldState.id;


  /*
   * Use exactly the same certified cusp material data as the
   * original Closed Manifold viewer.
   *
   * This keeps triangle identity/color fixed across:
   *
   *   Cells <-> Cusp <-> Boundary
   *
   * rather than allowing the Cusp renderer to fall back to
   * slot-based colors.
   */
  const projectionManifoldSpec =
    MANIFOLD_SPECS[
      projectionManifoldId
    ] ??
    MANIFOLD_SPECS.m004;

  const projectionFacePairs =
    projectionManifoldSpec.facePairs ??
    FIGURE_EIGHT_FACE_PAIRS;

  function animateCellsFaceIdentification(
    pairId
  ) {
    setCellsFacePairSequence([
      pairId,
    ]);
  }


  function renderIdentificationControls(
    readOnly = false
  ) {
    return (
      <div
        className={
          styles.identificationSection
        }
      >
        <div
          className={
            styles.identificationTitle
          }
        >
          Identifications
        </div>

        <div
          className={
            styles.identificationColumns
          }
          aria-hidden="true"
        >
          <span>A</span>
          <span>B</span>
        </div>

        <div
          className={
            styles.identificationRows
          }
        >
          {projectionFacePairs.map(
            (pair) => {
              const sourceColor =
                pair.AColor ??
                pair.color;

              const targetColor =
                pair.BColor ??
                pair.color;

              const sourceName =
                faceColorName(
                  sourceColor
                );

              const targetName =
                faceColorName(
                  targetColor
                );

              const sourceTriple =
                faceDisplayVertexTriple(
                  projectionManifoldId,
                  sourceColor,
                  "A"
                );

              const targetTriple =
                faceDisplayVertexTriple(
                  projectionManifoldId,
                  targetColor,
                  "B"
                );

              const selected =
                cellsFacePairSequence
                  .includes(
                    pair.id
                  );

              return (
                <button
                  key={pair.id}
                  type="button"
                  className={
                    `${styles.identificationRow} ${
                      selected &&
                      !readOnly
                        ? styles.identificationRowActive
                        : ""
                    }`
                  }
                  aria-disabled={
                    readOnly
                      ? "true"
                      : undefined
                  }
                  title={
                    readOnly
                      ? `${pair.description}. Face correspondence shown read-only in Cusp.`
                      : `${pair.description}. Click to animate the two tetrahedral cells together through this face identification.`
                  }
                  onClick={() => {
                    if (readOnly) {
                      return;
                    }

                    animateCellsFaceIdentification(
                      pair.id
                    );
                  }}
                  style={{
                    "--source-color":
                      sourceColor,

                    "--target-color":
                      targetColor,

                    "--source-tint":
                      colorWithAlpha(
                        sourceColor,
                        0.30
                      ),

                    "--target-tint":
                      colorWithAlpha(
                        targetColor,
                        0.30
                      ),
                  }}
                >
                  <span
                    className={
                      styles.identificationSide
                    }
                  >
                    <strong>
                      {sourceName}
                    </strong>

                    <span>
                      {sourceTriple}
                    </span>
                  </span>

                  <span
                    className={
                      styles.identificationArrow
                    }
                    aria-hidden="true"
                  >
                    →
                  </span>

                  <span
                    className={
                      styles.identificationSide
                    }
                  >
                    <strong>
                      {targetName}
                    </strong>

                    <span>
                      {targetTriple}
                    </span>
                  </span>
                </button>
              );
            }
          )}
        </div>
      </div>
    );
  }


  function selectManifold(
    nextManifoldId
  ) {
    resetM129FillPreview();

    setManifoldMenuOpen(false);

    /*
     * Manifold selection changes the manifold only.
     *
     * Preserve the current representation so the same
     * view can be compared directly across manifolds:
     *
     *   Cells    -> Cells
     *   Cusp     -> Cusp
     *   Boundary -> Boundary
     */
    setCellsFacePairSequence([]);

    setCellsTruncationFraction(
      DEFAULT_TRUNCATION_FRACTION
    );

    onManifoldStateChange?.(
      nextManifoldId
    );
  }


  return (
    <div className={styles.viewer}>
      <div
        ref={manifoldMenuRef}
        className={styles.manifoldPicker}
        style={{
          minWidth: "310px",
        }}
      >
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={
            manifoldMenuOpen
          }
          onClick={() =>
            setManifoldMenuOpen(
              (current) => !current
            )
          }
          style={{
            width: "100%",
            minHeight: "31px",
            boxSizing: "border-box",
            display: "grid",
            gridTemplateColumns:
              "minmax(0, 1fr) auto",
            alignItems: "center",
            gap: "10px",
            padding: "5px 9px",
            color:
              "rgba(248, 242, 225, 0.96)",
            fontFamily:
              '"Times New Roman", Times, serif',
            fontSize: "13px",
            textAlign: "left",
            border:
              "1px solid rgba(232, 223, 200, 0.34)",
            borderRadius: "5px",
            background:
              "rgba(7, 7, 8, 0.84)",
            backdropFilter:
              "blur(4px)",
            WebkitBackdropFilter:
              "blur(4px)",
            cursor: "pointer",
          }}
        >
          <span
            style={{
              overflow: "hidden",
              textOverflow:
                "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {
              [
                ...MANIFOLD_LEVELS
                  .flatMap(
                    (group) =>
                      group.options
                  ),
                ...SURGERY_MANIFOLD_OPTIONS,
              ].find(
                (option) =>
                  option.id ===
                  manifoldStateId
              )?.label ??
              manifoldStateId
            }
          </span>

          <span
            aria-hidden="true"
            style={{
              opacity: 0.72,
              fontSize: "10px",
              transform:
                manifoldMenuOpen
                  ? "rotate(180deg)"
                  : "none",
              transition:
                "transform 160ms ease",
            }}
          >
            ▼
          </span>
        </button>

        {manifoldMenuOpen && (
          <div
            role="listbox"
            aria-label="Manifold"
            style={{
              position: "absolute",
              zIndex: 1200,
              top: "calc(100% + 5px)",
              left: 0,
              width: "100%",
              minWidth: "310px",
              boxSizing: "border-box",
              padding: "7px",
              overflow: "hidden",
              color:
                "rgba(248, 242, 225, 0.96)",
              fontFamily:
                '"Times New Roman", Times, serif',
              border:
                "1px solid rgba(232, 223, 200, 0.34)",
              borderRadius: "7px",
              background:
                "rgba(7, 7, 8, 0.94)",
              backdropFilter:
                "blur(8px)",
              WebkitBackdropFilter:
                "blur(8px)",
              boxShadow:
                "0 10px 28px rgba(0, 0, 0, 0.42)",
            }}
          >
            {MANIFOLD_LEVELS.map(
              (group, groupIndex) => (
                <div
                  key={group.level}
                  style={{
                    paddingTop:
                      groupIndex === 0
                        ? 0
                        : "7px",
                    marginTop:
                      groupIndex === 0
                        ? 0
                        : "6px",
                    borderTop:
                      groupIndex === 0
                        ? "none"
                        : "1px solid rgba(232, 223, 200, 0.14)",
                  }}
                >
                  <div
                    style={{
                      padding:
                        "3px 7px 5px",
                      color:
                        "rgba(232, 223, 200, 0.52)",
                      fontSize: "11px",
                      lineHeight: 1.1,
                      letterSpacing:
                        "0.045em",
                      textTransform:
                        "uppercase",
                    }}
                  >
                    Level {group.level}
                    {" · "}
                    {group.tetrahedra}
                    {" ideal tetrahedra"}
                  </div>

                  {group.options.map(
                    (option) => {
                      const selected =
                        option.id ===
                        manifoldStateId;

                      return (
                        <button
                          key={option.id}
                          type="button"
                          role="option"
                          aria-selected={
                            selected
                          }
                          disabled={
                            !option.implemented
                          }
                          onClick={() =>
                            selectManifold(
                              option.id
                            )
                          }
                          onMouseEnter={
                            (event) => {
                              if (
                                option
                                  .implemented
                              ) {
                                event
                                  .currentTarget
                                  .style
                                  .background =
                                  "rgba(255, 255, 255, 0.10)";
                              }
                            }
                          }
                          onMouseLeave={
                            (event) => {
                              event
                                .currentTarget
                                .style
                                .background =
                                selected
                                  ? "rgba(255, 255, 255, 0.13)"
                                  : "transparent";
                            }
                          }
                          style={{
                            width: "100%",
                            display: "grid",
                            gridTemplateColumns:
                              "18px minmax(0, 1fr)",
                            alignItems:
                              "center",
                            gap: "5px",
                            minHeight: "29px",
                            padding:
                              "3px 7px",
                            color:
                              option.implemented
                                ? "rgba(248, 242, 225, 0.96)"
                                : "rgba(232, 223, 200, 0.30)",
                            fontFamily:
                              '"Times New Roman", Times, serif',
                            fontSize:
                              "13px",
                            textAlign:
                              "left",
                            border: 0,
                            borderRadius:
                              "4px",
                            background:
                              selected
                                ? "rgba(255, 255, 255, 0.13)"
                                : "transparent",
                            cursor:
                              option.implemented
                                ? "pointer"
                                : "not-allowed",
                            transition:
                              "background 120ms ease",
                          }}
                        >
                          <span
                            aria-hidden="true"
                            style={{
                              color:
                                "rgba(255, 235, 194, 0.92)",
                              textAlign:
                                "center",
                            }}
                          >
                            {
                              selected
                                ? "✓"
                                : ""
                            }
                          </span>

                          <span>
                            {option.label}
                          </span>
                        </button>
                      );
                    }
                  )}
                </div>
              )
            )}

            <div
              style={{
                paddingTop: "7px",
                marginTop: "6px",
                borderTop:
                  "1px solid rgba(232, 223, 200, 0.14)",
              }}
            >
              <div
                style={{
                  padding:
                    "3px 7px 5px",
                  color:
                    "rgba(232, 223, 200, 0.52)",
                  fontSize: "11px",
                  lineHeight: 1.1,
                  letterSpacing:
                    "0.045em",
                  textTransform:
                    "uppercase",
                }}
              >
                Surgery junctions
              </div>

              {SURGERY_MANIFOLD_OPTIONS.map(
                (option) => {
                  const selected =
                    option.id ===
                    manifoldStateId;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="option"
                      aria-selected={
                        selected
                      }
                      disabled={
                        !option.implemented
                      }
                      onClick={() =>
                        selectManifold(
                          option.id
                        )
                      }
                      onMouseEnter={
                        (event) => {
                          if (
                            option
                              .implemented
                          ) {
                            event
                              .currentTarget
                              .style
                              .background =
                              "rgba(255, 255, 255, 0.10)";
                          }
                        }
                      }
                      onMouseLeave={
                        (event) => {
                          event
                            .currentTarget
                            .style
                            .background =
                            selected
                              ? "rgba(255, 255, 255, 0.13)"
                              : "transparent";
                        }
                      }
                      style={{
                        width: "100%",
                        display: "grid",
                        gridTemplateColumns:
                          "18px minmax(0, 1fr)",
                        alignItems:
                          "center",
                        gap: "5px",
                        minHeight: "29px",
                        padding:
                          "3px 7px",
                        color:
                          option.implemented
                            ? "rgba(248, 242, 225, 0.96)"
                            : "rgba(232, 223, 200, 0.30)",
                        fontFamily:
                          '"Times New Roman", Times, serif',
                        fontSize: "13px",
                        textAlign: "left",
                        border: 0,
                        borderRadius:
                          "4px",
                        background:
                          selected
                            ? "rgba(255, 255, 255, 0.13)"
                            : "transparent",
                        cursor:
                          option.implemented
                            ? "pointer"
                            : "not-allowed",
                        transition:
                          "background 120ms ease",
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          color:
                            "rgba(255, 235, 194, 0.92)",
                          textAlign:
                            "center",
                        }}
                      >
                        {
                          selected
                            ? "✓"
                            : ""
                        }
                      </span>

                      <span>
                        {option.label}
                      </span>
                    </button>
                  );
                }
              )}
            </div>
          </div>
        )}
      </div>

      <div
        className={styles.representationTabs}
        role="group"
        aria-label="Manifold representation"
      >
        <button
          type="button"
          className={
            representationMode ===
            "boundary"
              ? styles.activeRepresentationTab
              : undefined
          }
          onClick={() =>
            selectRepresentation(
              "boundary"
            )
          }
        >
          Boundary
        </button>

        <button
          type="button"
          className={
            representationMode ===
            "cusp"
              ? styles.activeRepresentationTab
              : undefined
          }
          onClick={() =>
            selectRepresentation(
              "cusp"
            )
          }
        >
          Cusp
        </button>

        <button
          type="button"
          title="Canonical ideal cells"
          className={
            representationMode ===
            "cells"
              ? styles.activeRepresentationTab
              : undefined
          }
          onClick={() =>
            selectRepresentation(
              "cells"
            )
          }
        >
          Cells
        </button>
      </div>

      <div className={styles.canvas}>
        {(
          representationMode === "cells" ||
          cuspFlightDirection === "toCells" ||
          cuspFlightDirection === "toCusp"
        ) &&
          manifoldStateId !== "m129" && (
            <div
              className={
                `${styles.cellsLayer} ${
                  cellsDragging
                    ? styles.cellsLayerDragging
                    : ""
                }`
              }
              onPointerDown={
                beginCellsRotate
              }
              onPointerMove={
                moveCellsRotate
              }
              onPointerUp={
                endCellsRotate
              }
              onPointerCancel={
                endCellsRotate
              }
              onLostPointerCapture={
                endCellsRotate
              }
              onWheel={
                handleCellsWheel
              }
              onKeyDown={
                handleCellsKeyDown
              }
              onKeyUp={
                handleCellsKeyUp
              }
              onBlur={
                handleCellsBlur
              }
              tabIndex={
                representationMode ===
                  "cells"
                  ? 0
                  : -1
              }
              aria-label="Interactive Cells viewer. Drag to rotate. Scroll to zoom. Double-click a rotation button for continuous rotation."
            >
              <TruncatedTetrahedraViewer
                key={`surgery-cells-${manifoldStateId}`}
                manifoldId={manifoldStateId}
                view={cellsView}
                facePairSequence={
                  cellsFacePairSequence
                }
                collapsedBridgePairIds={
                  cellsFacePairSequence
                }
                facePairMappingIndices={[
                  0,
                  0,
                  0,
                  0,
                ]}
                truncationFraction={
                  cellsTruncationFraction
                }
                showInterior={false}
                showCuspTriangles={false}
                extendCusp={false}
                assembleCusp={false}
                cuspWrapOrder={[]}
                knotViewActive={false}
                onCuspFlightSourceChange={
                  handleCuspFlightSourceChange
                }
                presentationOpacity={
                  cuspFlightHideCells
                    ? 0
                    : 1
                }
              />
            </div>
          )}

        {(
          manifoldStateId === "m129" &&
          (
            representationMode ===
              "cells" ||
            cuspFlightDirection ===
              "toCells" ||
            cuspFlightDirection ===
              "toCusp"
          )
        ) && (
          <div
            style={{
              opacity:
                cuspFlightHideCells
                  ? 0
                  : 1,
            }}
            className={
              `${styles.cellsLayer} ${
                cellsDragging
                  ? styles.cellsLayerDragging
                  : ""
              }`
            }
            onPointerDown={
              beginCellsRotate
            }
            onPointerMove={
              moveCellsRotate
            }
            onPointerUp={
              endCellsRotate
            }
            onPointerCancel={
              endCellsRotate
            }
            onLostPointerCapture={
              endCellsRotate
            }
            onWheel={
              handleCellsWheel
            }
            onKeyDown={
              handleCellsKeyDown
            }
            onKeyUp={
              handleCellsKeyUp
            }
            onBlur={
              handleCellsBlur
            }
            tabIndex={0}
            aria-label="Interactive m129 Cells viewer. Four certified truncated tetrahedra. Drag to rotate and scroll to zoom."
          >
            <M129CellsViewer
              view={
                cellsView
              }
              truncationFraction={
                cellsTruncationFraction
              }
              onFlightSourceChange={
                handleM129CuspFlightSourceChange
              }
            />
          </div>
        )}

        {(
          (
            manifoldStateId === "m129" ||
            m129HandoffOverlayActive
          ) &&
          (
            representationMode === "boundary" ||
            m129CuspBoundaryMorphActive ||
            m129HandoffOverlayActive
          )
        ) && (
          <M129BoundaryViewer
            viewYawDegrees={
              m129BoundaryView.yawDegrees
            }
            viewPitchDegrees={
              m129BoundaryView.pitchDegrees
            }
            viewZoom={
              m129BoundaryView.zoom
            }
            projection={
              m129BoundaryProjection
            }
            subdivisions={
              m129BoundarySubdivisions
            }
            lambda={
              m129BoundaryLambda
            }
            epsilon={
              m129BoundaryEpsilon
            }
            rho={
              m129BoundaryRho
            }
            layers={
              m129CuspLayers
            }
            cuspVisibility={
              m129BoundaryCuspVisibility
            }
            cuspMorph={
              effectiveM129CuspBoundaryMorph
            }
            flatCuspTarget={
              m129CuspFlightTargetRef.current
            }
            selectedCuspIndex={
              m129SelectedCuspIndex
            }
            fillingSlope={
              m129SlopeSelected
                ? m129FillingSlope
                : null
            }
            fillingProgress={
              m129FillProgress
            }
            fillingStartedInSplit={
              m129FillStartedInSplit
            }
            survivingCuspMorph={
              m129SurvivingCuspMorph
            }
            survivingCuspViewMorph={
              m129SurvivingCuspViewMorph
            }
            survivingCuspMorphActive={
              m129SurvivingCuspMorphActive
            }
            surgeryPathT={
              m129SurgeryPathT
            }
            surgeryPathActive={
              m129SurgeryPathActive
            }
            ambientSurgeryTwist={
              m129SurgeryPathT
            }
            survivingCuspReveal={
              m129SurvivingCuspReveal
            }
            presentationOpacity={
              1 -
              m129RendererTransfer
            }
            m004TargetState={
              m004HandoffTargetState
            }
            projectM004PointToClient={
              (point4) =>
                projectionControlRef
                  .current
                  ?.projectPoint4ToBoundaryClient?.(
                    point4
                  ) ??
                null
            }
            onInteractionStart={() => {
              cancelM129BoundaryRotationClick();

              setM129BoundaryAutoRotationDirection(
                0
              );
            }}
            onOrbit={
              orbitM129Boundary
            }
            onZoom={
              zoomM129Boundary
            }
          />
        )}

        <SurgeryProjectionViewer
          embedded
          controlApiRef={
            projectionControlRef
          }
          onViewerStatusChange={
            setProjectionViewerStatus
          }
          controlMode={
            manifoldStateId === "m129"
              ? (
                  m129SurvivingCuspMorphActive
                    ? "boundary"
                    : "cells"
                )
              : representationMode
          }
          manifoldId={projectionManifoldId}
          cuspFlatLayout={
            projectionManifoldSpec.cuspFlatLayout
          }
          cuspFacePairs={
            projectionFacePairs
          }
          targetCuspMorph={
            representationMode === "boundary"
              ? 1
              : 0
          }
          onCuspFlightTargetChange={
            handleCuspFlightTargetChange
          }
          boundaryControlsDisabled={
            representationMode !== "boundary"
          }
          visualOpacity={
            manifoldStateId === "m129"
              ? 0
              : (
                  representationMode === "cells" ||
                  cuspFlightHideProjection
                )
                ? 0
                : 1
          }
          viewControls={
            <div
              style={{
                width: "100%",
                overflow: "visible",
              }}
            >
              {representationMode ===
                "boundary" && (
                <>
                  <div
                    className={
                      styles.controlSection
                    }
                  >
                    <div
                      className={
                        styles.controlTitle
                      }
                    >
                      Surgery
                    </div>

                    <div
                      className={
                        styles.controlGrid
                      }
                    >
                      <button
                        type="button"
                        disabled
                        title="Whitehead-link geometry is the next implementation step"
                      >
                        Drill crossing circle
                      </button>

                      <button
                        type="button"
                        disabled={
                          !m129FigureEightFillingReady ||
                          m129FillActive ||
                          m129SurgeryPathT >
                            1e-9
                        }
                        title={
                          m129FigureEightFillingReady
                            ? "Fill crossing-circle cusp 1 along the certified slope (3,-1) ~ (-3,1), yielding the figure-eight knot complement m004."
                            : "Certified m129 → m004 filling requires Cusp 1 and slope (3,-1), equivalently (-3,1)."
                        }
                        onClick={
                          fillCertifiedM129Cusp
                        }
                      >
                        Fill cusp
                      </button>

                      <button
                        type="button"
                        disabled
                      >
                        Unfill cusp
                      </button>
                    </div>

                    <div
                      className={
                        styles.cuspTransition
                      }
                    >
                      <span>
                        {
                          displayedSurgerySourceCuspCount
                        } {
                          displayedSurgerySourceCuspCount === 1
                            ? "cusp"
                            : "cusps"
                        }
                      </span>

                      <span>→</span>

                      <span>
                        {
                          displayedSurgeryTargetCuspCount
                        } {
                          displayedSurgeryTargetCuspCount === 1
                            ? "cusp"
                            : "cusps"
                        }
                      </span>
                    </div>

                    {manifoldStateId ===
                      "m129" && (
                      <div
                        style={{
                          marginTop: "10px",
                          paddingTop: "9px",
                          borderTop:
                            "1px solid rgba(232, 223, 200, 0.18)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent:
                              "space-between",
                            gap: "10px",
                            marginBottom: "5px",
                            fontSize: "12px",
                            opacity: 0.86,
                          }}
                        >
                          <span>
                            Surgery path
                          </span>

                          <span>
                            t = {
                              m129SurgeryPathT
                                .toFixed(3)
                            }
                          </span>
                        </div>

                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.005"
                          value={
                            m129SurgeryPathT
                          }
                          disabled={
                            m129FillActive ||
                            m129SurgeryPathActive
                          }
                          onChange={
                            (event) => {
                              resetM129FillPreview();

                              setM129SurgeryPathT(
                                clamp(
                                  Number(
                                    event.target
                                      .value
                                  ),
                                  0,
                                  1
                                )
                              );
                            }
                          }
                          aria-label="Certified surgery-path parameter"
                          style={{
                            width: "100%",
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div
                    className={
                      styles.controlSection
                    }
                    style={{
                      marginTop: "10px",
                    }}
                  >
                    <div
                      className={
                        styles.controlTitle
                      }
                    >
                      Cusp
                    </div>

                    <div
                      className={
                        styles.cuspRow
                      }
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "minmax(0, 1fr) auto 24px",
                        alignItems: "center",
                        gap: "8px",

                        /*
                         * The filling-slope lattice is a popover,
                         * not layout content.
                         *
                         * Keeping it out of document flow prevents
                         * its open/closed state from resizing the
                         * m004 projection canvas and changing the
                         * automatic screen framing.
                         */
                        position: "relative",
                      }}
                    >
                      <div
                        ref={m129CuspMenuRef}
                        style={{
                          position: "relative",
                          minWidth: 0,
                          gridColumn: "1",
                        }}
                      >
                        <button
                          type="button"
                          aria-haspopup="listbox"
                          aria-expanded={
                            m129CuspMenuOpen
                          }
                          aria-label="Active cusp"
                          onClick={() =>
                            setM129CuspMenuOpen(
                              (current) =>
                                !current
                            )
                          }
                          style={{
                            width: "100%",
                            minHeight: "31px",
                            boxSizing: "border-box",
                            display: "grid",
                            gridTemplateColumns:
                              "minmax(0, 1fr) auto",
                            alignItems: "center",
                            gap: "10px",
                            padding: "5px 9px",
                            color:
                              "rgba(248, 242, 225, 0.96)",
                            fontFamily:
                              '"Times New Roman", Times, serif',
                            fontSize: "13px",
                            textAlign: "left",
                            border:
                              "1px solid rgba(232, 223, 200, 0.34)",
                            borderRadius: "5px",
                            background:
                              "rgba(7, 7, 8, 0.84)",
                            backdropFilter:
                              "blur(4px)",
                            WebkitBackdropFilter:
                              "blur(4px)",
                            cursor: "pointer",
                          }}
                        >
                          <span
                            style={{
                              overflow: "hidden",
                              textOverflow:
                                "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {
                              (() => {
                                const cuspIndex =
                                  manifoldStateId ===
                                    "m129"
                                    ? m129SelectedCuspIndex
                                    : 0;

                                if (
                                  manifoldStateId ===
                                    "m129" &&
                                  m129SelectedCuspIndex ===
                                    null
                                ) {
                                  return "Select cusp";
                                }

                                const cusp =
                                  manifoldState
                                    .cusps[
                                      cuspIndex
                                    ] ??
                                  manifoldState
                                    .cusps[0];

                                const identity =
                                  manifoldStateId ===
                                    "m129"
                                    ? M129_CUSP_IDENTITIES[
                                        cuspIndex
                                      ]
                                    : null;

                                return identity
                                  ? `Cusp ${identity.index} — ${identity.role}`
                                  : cusp?.label ??
                                      "Cusp";
                              })()
                            }
                          </span>

                          <span
                            aria-hidden="true"
                            style={{
                              opacity: 0.72,
                              fontSize: "10px",
                              transform:
                                m129CuspMenuOpen
                                  ? "rotate(180deg)"
                                  : "none",
                              transition:
                                "transform 160ms ease",
                            }}
                          >
                            ▼
                          </span>
                        </button>

                        {m129CuspMenuOpen && (
                          <div
                            role="listbox"
                            aria-label="Active cusp"
                            style={{
                              position: "absolute",
                              zIndex: 1200,
                              top: "calc(100% + 5px)",
                              left: 0,
                              width: "100%",
                              minWidth: "250px",
                              boxSizing: "border-box",
                              padding: "7px",
                              overflow: "hidden",
                              color:
                                "rgba(248, 242, 225, 0.96)",
                              fontFamily:
                                '"Times New Roman", Times, serif',
                              border:
                                "1px solid rgba(232, 223, 200, 0.34)",
                              borderRadius: "7px",
                              background:
                                "rgba(7, 7, 8, 0.94)",
                              backdropFilter:
                                "blur(8px)",
                              WebkitBackdropFilter:
                                "blur(8px)",
                              boxShadow:
                                "0 10px 28px rgba(0, 0, 0, 0.42)",
                            }}
                          >
                            {manifoldState.cusps.map(
                              (
                                cusp,
                                cuspIndex
                              ) => {
                                const identity =
                                  manifoldStateId ===
                                    "m129"
                                    ? M129_CUSP_IDENTITIES[
                                        cuspIndex
                                      ]
                                    : null;

                                const selected =
                                  manifoldStateId ===
                                    "m129"
                                    ? cuspIndex ===
                                      m129SelectedCuspIndex
                                    : cuspIndex === 0;

                                const label =
                                  identity
                                    ? `Cusp ${identity.index} — ${identity.role}`
                                    : cusp.label;

                                return (
                                  <button
                                    key={cusp.id}
                                    type="button"
                                    role="option"
                                    aria-selected={
                                      selected
                                    }
                                    onClick={() => {
                                      if (
                                        manifoldStateId ===
                                          "m129" &&
                                        (
                                          cuspIndex === 0 ||
                                          cuspIndex === 1
                                        )
                                      ) {
                                        resetM129FillPreview();

                                        setM129SelectedCuspIndex(
                                          cuspIndex
                                        );

                                        /*
                                         * A slope belongs to the selected
                                         * peripheral torus. Do not silently
                                         * carry a prior slope selection onto
                                         * another cusp.
                                         */
                                        setM129SlopeSelected(
                                          false
                                        );
                                      }

                                      setM129CuspMenuOpen(
                                        false
                                      );
                                    }}
                                    onMouseEnter={
                                      (event) => {
                                        event
                                          .currentTarget
                                          .style
                                          .background =
                                          "rgba(255, 255, 255, 0.10)";
                                      }
                                    }
                                    onMouseLeave={
                                      (event) => {
                                        event
                                          .currentTarget
                                          .style
                                          .background =
                                          selected
                                            ? "rgba(255, 255, 255, 0.13)"
                                            : "transparent";
                                      }
                                    }
                                    style={{
                                      width: "100%",
                                      display: "grid",
                                      gridTemplateColumns:
                                        "18px minmax(0, 1fr)",
                                      alignItems: "center",
                                      gap: "5px",
                                      minHeight: "29px",
                                      padding: "3px 7px",
                                      color:
                                        "rgba(248, 242, 225, 0.96)",
                                      fontFamily:
                                        '"Times New Roman", Times, serif',
                                      fontSize: "13px",
                                      textAlign: "left",
                                      border: 0,
                                      borderRadius: "4px",
                                      background:
                                        selected
                                          ? "rgba(255, 255, 255, 0.13)"
                                          : "transparent",
                                      cursor: "pointer",
                                      transition:
                                        "background 120ms ease",
                                    }}
                                  >
                                    <span
                                      aria-hidden="true"
                                      style={{
                                        color:
                                          "rgba(255, 235, 194, 0.92)",
                                        textAlign: "center",
                                      }}
                                    >
                                      {
                                        selected
                                          ? "✓"
                                          : ""
                                      }
                                    </span>

                                    <span
                                      style={{
                                        overflow: "hidden",
                                        textOverflow:
                                          "ellipsis",
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {label}
                                    </span>
                                  </button>
                                );
                              }
                            )}
                          </div>
                        )}
                      </div>

                      <div
                        style={{
                          display: "contents",
                        }}
                      >
                        <button
                          type="button"
                          aria-expanded={
                            m129SlopeLatticeOpen
                          }
                          aria-label="Choose filling slope from peripheral lattice"
                          title="Choose a primitive filling slope from the meridian-longitude lattice"
                          onClick={() =>
                            setM129SlopeLatticeOpen(
                              (current) =>
                                !current
                            )
                          }
                          style={{
                            minWidth: "132px",
                            gridColumn: "2",
                          }}
                        >
                          {
                            m129SlopeSelected
                              ? `Slope = ${
                                  formatSlopeExpression(
                                    m129FillingSlope.p,
                                    m129FillingSlope.q
                                  )
                                }`
                              : "Slope —"
                          }
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setM129SlopeLatticeOpen(
                              (current) =>
                                !current
                            )
                          }
                          aria-expanded={
                            m129SlopeLatticeOpen
                          }
                          aria-label={
                            m129SlopeLatticeOpen
                              ? "Collapse filling slope controls"
                              : "Expand filling slope controls"
                          }
                          title={
                            m129SlopeLatticeOpen
                              ? "Collapse filling slope controls"
                              : "Expand filling slope controls"
                          }
                          style={{
                            width: "24px",
                            minWidth: "24px",
                            minHeight: 0,
                            padding: 0,
                            border: 0,
                            background:
                              "transparent",
                            color: "inherit",
                            font: "inherit",
                            fontSize: "18px",
                            lineHeight: 1,
                            cursor: "pointer",
                            opacity: 0.75,
                            gridColumn: "3",
                            justifySelf: "end",
                            textAlign: "center",
                          }}
                        >
                          {
                            m129SlopeLatticeOpen
                              ? "−"
                              : "+"
                          }
                        </button>

                        {m129SlopeLatticeOpen && (
                          <div
                            role="dialog"
                            aria-label="Primitive Dehn-filling slope lattice"
                            style={{
                              /*
                               * True dropdown/popover behavior.
                               *
                               * Absolutely positioning this panel
                               * means opening it cannot alter the
                               * control column's measured size and
                               * therefore cannot alter the m004
                               * canvas framing.
                               */
                              position: "absolute",
                              top: "calc(100% + 6px)",
                              left: 0,
                              right: 0,
                              zIndex: 1400,

                              width: "100%",
                              minWidth: 0,
                              boxSizing: "border-box",
                              marginTop: 0,
                              padding: "12px",
                              border:
                                "1px solid rgba(247, 243, 233, 0.28)",
                              borderRadius: "8px",
                              background:
                                "rgba(12, 12, 12, 0.97)",
                              boxShadow:
                                "0 12px 32px rgba(0, 0, 0, 0.45)",
                            }}
                          >
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns:
                                  "1fr auto",
                                alignItems: "center",
                                gap: "8px",
                                marginBottom: "8px",
                              }}
                            >
                              <strong>
                                Filling slope
                              </strong>

                              <span
                                style={{
                                  opacity: 0.72,
                                  fontSize: "12px",
                                }}
                              >
                                primitive slope
                              </span>

                            </div>

                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns:
                                  "1fr 1fr",
                                gap: "10px",
                                marginBottom: "10px",
                              }}
                            >
                              {[
                                {
                                  key: "p",
                                  label:
                                    "Meridian",
                                },
                                {
                                  key: "q",
                                  label:
                                    "Longitude",
                                },
                              ].map(
                                ({
                                  key,
                                  label,
                                }) => (
                                  <div
                                    key={
                                      key
                                    }
                                    style={{
                                      display:
                                        "grid",
                                      gridTemplateColumns:
                                        "minmax(0, 1fr) 34px",
                                      gridTemplateRows:
                                        "22px 22px",
                                      alignItems:
                                        "center",
                                      columnGap: "6px",
                                      rowGap: "4px",
                                      minWidth: 0,
                                    }}
                                  >
                                    <button
                                      type="button"
                                      onClick={() =>
                                        adjustM129FillingSlope(
                                          key,
                                          -1
                                        )
                                      }
                                      aria-label={
                                        `Decrease ${label}`
                                      }
                                      style={{
                                        gridColumn: "2",
                                        gridRow: "2",
                                        width: "34px",
                                        height: "22px",
                                        minHeight: 0,
                                        padding: 0,
                                        fontSize: "18px",
                                        lineHeight: 1,
                                      }}
                                    >
                                      −
                                    </button>

                                    <label
                                      style={{
                                        gridColumn: "1",
                                        gridRow: "1 / 3",
                                        display:
                                          "grid",
                                        gridTemplateRows:
                                          "auto auto",
                                        alignContent:
                                          "center",
                                        justifyItems:
                                          "start",
                                        rowGap: "6px",
                                        minWidth: 0,
                                      }}
                                    >
                                      <span
                                        style={{
                                          lineHeight: 1.05,
                                        }}
                                      >
                                        {
                                          label
                                        }
                                      </span>

                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "baseline",
                                          gap: "4px",
                                          whiteSpace: "nowrap",
                                          minHeight: "24px",
                                        }}
                                      >
                                        <span
                                          style={{
                                            fontSize: "18px",
                                            lineHeight: 1,
                                          }}
                                        >
                                          {
                                            m129FillingSlope[
                                              key
                                            ]
                                          }
                                        </span>

                                        <span
                                          style={{
                                            fontSize: "14px",
                                            opacity: 0.82,
                                          }}
                                        >
                                          {
                                            Math.abs(
                                              m129FillingSlope[
                                                key
                                              ]
                                            ) === 1
                                              ? "turn"
                                              : "turns"
                                          }
                                        </span>
                                      </div>
                                    </label>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        adjustM129FillingSlope(
                                          key,
                                          1
                                        )
                                      }
                                      aria-label={
                                        `Increase ${label}`
                                      }
                                      style={{
                                        gridColumn: "2",
                                        gridRow: "1",
                                        width: "34px",
                                        height: "22px",
                                        minHeight: 0,
                                        padding: 0,
                                        fontSize: "18px",
                                        lineHeight: 1,
                                      }}
                                    >
                                      +
                                    </button>
                                  </div>
                                )
                              )}
                            </div>

                            <svg
                              viewBox="0 0 260 260"
                              width="100%"
                              height="260"
                              aria-label="Peripheral lattice with μ horizontal and λ vertical"
                              style={{
                                display: "block",
                                overflow: "visible",
                              }}
                            >
                              {Array.from(
                                {
                                  length: 9,
                                },
                                (_, index) =>
                                  index - 4
                              ).map(
                                (coordinate) => {
                                  const position =
                                    130 +
                                    coordinate *
                                      27;

                                  return (
                                    <g
                                      key={
                                        `grid-${coordinate}`
                                      }
                                    >
                                      <line
                                        x1={
                                          position
                                        }
                                        y1="22"
                                        x2={
                                          position
                                        }
                                        y2="238"
                                        stroke={
                                          coordinate ===
                                          0
                                            ? "rgba(247,243,233,0.42)"
                                            : "rgba(247,243,233,0.12)"
                                        }
                                        strokeWidth={
                                          coordinate ===
                                          0
                                            ? 1.4
                                            : 1
                                        }
                                      />

                                      <line
                                        x1="22"
                                        y1={
                                          position
                                        }
                                        x2="238"
                                        y2={
                                          position
                                        }
                                        stroke={
                                          coordinate ===
                                          0
                                            ? "rgba(247,243,233,0.42)"
                                            : "rgba(247,243,233,0.12)"
                                        }
                                        strokeWidth={
                                          coordinate ===
                                          0
                                            ? 1.4
                                            : 1
                                        }
                                      />
                                    </g>
                                  );
                                }
                              )}

                              <text
                                x="236"
                                y="126"
                                fill="rgba(247,243,233,0.82)"
                                fontSize="11"
                                textAnchor="end"
                              >
                                Meridian
                              </text>

                              <text
                                x="135"
                                y="15"
                                fill="rgba(247,243,233,0.82)"
                                fontSize="11"
                                textAnchor="middle"
                              >
                                Longitude
                              </text>

                              {
                                m129SlopeSelected &&
                                Math.abs(
                                  m129FillingSlope.p
                                ) <= 4 &&
                                Math.abs(
                                  m129FillingSlope.q
                                ) <= 4 &&
                                isPrimitiveSlope(
                                  m129FillingSlope.p,
                                  m129FillingSlope.q
                                ) && (
                                  <line
                                    x1="130"
                                    y1="130"
                                    x2={
                                      130 +
                                      m129FillingSlope.p *
                                        27
                                    }
                                    y2={
                                      130 -
                                      m129FillingSlope.q *
                                        27
                                    }
                                    stroke="rgba(255, 214, 96, 0.92)"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                  />
                                )
                              }

                              {Array.from(
                                {
                                  length: 9,
                                },
                                (_, row) =>
                                  4 - row
                              ).flatMap(
                                (q) =>
                                  Array.from(
                                    {
                                      length: 9,
                                    },
                                    (_, column) =>
                                      column - 4
                                  ).map(
                                    (p) => {
                                      if (
                                        !isPrimitiveSlope(
                                          p,
                                          q
                                        )
                                      ) {
                                        return null;
                                      }

                                      const selected =
                                        m129SlopeSelected &&
                                        p ===
                                          m129FillingSlope.p &&
                                        q ===
                                          m129FillingSlope.q;

                                      const certified =
                                        m129SelectedCuspIndex ===
                                          M129_TO_M004_FILLED_CUSP &&
                                        m129SlopeMatchesCertifiedEdge(
                                          p,
                                          q
                                        );

                                      return (
                                        <g
                                          key={
                                            `slope-${p}-${q}`
                                          }
                                          role="button"
                                          tabIndex={0}
                                          aria-label={
                                            `Choose slope (${p}, ${q})`
                                          }
                                          onClick={() =>
                                            selectM129FillingSlope(
                                              p,
                                              q
                                            )
                                          }
                                          onKeyDown={(
                                            event
                                          ) => {
                                            if (
                                              event.key ===
                                                "Enter" ||
                                              event.key ===
                                                " "
                                            ) {
                                              event.preventDefault();

                                              selectM129FillingSlope(
                                                p,
                                                q
                                              );
                                            }
                                          }}
                                          style={{
                                            cursor:
                                              "pointer",
                                          }}
                                        >
                                          <circle
                                            cx={
                                              130 +
                                              p *
                                                27
                                            }
                                            cy={
                                              130 -
                                              q *
                                                27
                                            }
                                            r={
                                              selected
                                                ? 6.5
                                                : certified
                                                  ? 4.2
                                                  : 3.2
                                            }
                                            fill={
                                              selected
                                                ? "rgba(255, 214, 96, 1)"
                                                : certified
                                                  ? "rgba(76, 196, 111, 0.98)"
                                                  : "rgba(247, 243, 233, 0.54)"
                                            }
                                            stroke={
                                              selected &&
                                              certified
                                                ? "rgba(76, 196, 111, 1)"
                                                : certified
                                                  ? "rgba(76, 196, 111, 1)"
                                                  : "none"
                                            }
                                            strokeWidth={
                                              certified
                                                ? "2"
                                                : "0"
                                            }
                                          />
                                        </g>
                                      );
                                    }
                                  )
                              )}

                              <circle
                                cx="130"
                                cy="130"
                                r="3"
                                fill="rgba(247,243,233,0.28)"
                              />
                            </svg>

                            <div
                              style={{
                                display: "flex",
                                justifyContent:
                                  "space-between",
                                gap: "8px",
                                marginTop: "6px",
                                fontSize: "12px",
                              }}
                            >
                              <span>
                                {
                                  `(${m129FillingSlope.p}, ${m129FillingSlope.q})`
                                }
                              </span>

                              <strong>
                                {
                                  formatSlopeExpression(
                                    m129FillingSlope.p,
                                    m129FillingSlope.q
                                  )
                                }
                              </strong>
                            </div>

                            <div
                              style={{
                                marginTop: "10px",
                                paddingTop: "9px",
                                borderTop:
                                  "1px solid rgba(247,243,233,0.14)",
                              }}
                            >
                              <div
                                style={{
                                  marginBottom:
                                    "6px",
                                  fontSize:
                                    "11px",
                                  opacity:
                                    0.68,
                                }}
                              >
                                Reference curves
                              </div>

                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns:
                                    "1fr 1fr",
                                  gap: "7px",
                                }}
                              >
                                <button
                                  type="button"
                                  className={
                                    m129CuspLayers
                                      .meridian
                                      ? projectionStyles
                                          .toggleActive
                                      : undefined
                                  }
                                  onClick={() =>
                                    toggleM129CuspLayer(
                                      "meridian"
                                    )
                                  }
                                >
                                  Meridian μ
                                </button>

                                <button
                                  type="button"
                                  className={
                                    m129CuspLayers
                                      .longitude
                                      ? projectionStyles
                                          .toggleActive
                                      : undefined
                                  }
                                  onClick={() =>
                                    toggleM129CuspLayer(
                                      "longitude"
                                    )
                                  }
                                >
                                  Longitude λ
                                </button>
                              </div>
                            </div>

                            <div
                              style={{
                                marginTop: "9px",
                                fontSize: "11px",
                                lineHeight: 1.35,
                                opacity: 0.68,
                              }}
                            >
                              Each primitive lattice point gives the number
                              of meridian and longitude turns that define the
                              filling slope on the selected cusp.
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {(
                manifoldStateId === "m129" &&
                representationMode === "boundary"
              ) && (
                <>
                  <div
                    className={
                      `${projectionStyles.sectionTitle} ${projectionStyles.tooltipAnchor}`
                    }
                    data-tooltip="Stereographic projection maps the compact three-sphere S³ into ordinary ℝ³ by projecting from a chosen pole. The projection pole itself maps to infinity."
                    tabIndex={0}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                    }}
                  >
                    <span>S³ projection</span>

                    <button
                      type="button"
                      onClick={() =>
                        setM129ProjectionControlsExpanded(
                          (current) => !current
                        )
                      }
                      aria-expanded={
                        m129ProjectionControlsExpanded
                      }
                      aria-label={
                        m129ProjectionControlsExpanded
                          ? "Collapse S³ projection controls"
                          : "Expand S³ projection controls"
                      }
                      style={{
                        width: "24px",
                        minWidth: "24px",
                        minHeight: 0,
                        padding: 0,
                        border: 0,
                        background: "transparent",
                        color: "inherit",
                        font: "inherit",
                        fontSize: "18px",
                        lineHeight: 1,
                        cursor: "pointer",
                        opacity: 0.7,
                        marginLeft: "auto",
                      }}
                    >
                      {
                        m129ProjectionControlsExpanded
                          ? "−"
                          : "+"
                      }
                    </button>
                  </div>

                  <div
                    className={
                      projectionStyles.projectionPresets
                    }
                  >
                    <button
                      type="button"
                      className={
                        m129BoundarySelectedPreset ===
                        0
                          ? projectionStyles.toggleActive
                          : undefined
                      }
                      title="Restore Symmetric preset"
                      onClick={() =>
                        applyM129BoundarySavedPreset(
                          0
                        )
                      }
                    >
                      Symmetric
                    </button>

                    <button
                      type="button"
                      className={
                        m129BoundarySelectedPreset ===
                        null
                          ? projectionStyles.toggleActive
                          : undefined
                      }
                      title="Restore the m129 Boundary reload settings"
                      onClick={() => {
                        setM129BoundarySelectedPreset(
                          null
                        );

                        animateM129BoundaryPresetTo(
                          standardM129BoundaryPreset(),
                          4000
                        );
                      }}
                    >
                      Standard
                    </button>

                    <button
                      type="button"
                      className={
                        m129BoundarySelectedPreset ===
                        1
                          ? projectionStyles.toggleActive
                          : undefined
                      }
                      title="Restore Open preset"
                      onClick={() =>
                        applyM129BoundarySavedPreset(
                          1
                        )
                      }
                    >
                      Open
                    </button>
                  </div>

                  {m129ProjectionControlsExpanded && (
                    <div
                      className={
                        projectionStyles.compactSliderGroup
                      }
                    >
                      {[
                        [
                          "xw",
                          "X–W",
                          "Rotation in the xw-plane of S³'s ambient ℝ⁴. This changes the object's orientation relative to the stereographic projection pole.",
                        ],
                        [
                          "yw",
                          "Y–W",
                          "Rotation in the yw-plane of S³'s ambient ℝ⁴. This changes the object's orientation relative to the stereographic projection pole.",
                        ],
                        [
                          "zw",
                          "Z–W",
                          "Rotation in the zw-plane of S³'s ambient ℝ⁴. This changes the object's orientation relative to the stereographic projection pole.",
                        ],
                      ].map(
                        ([key, label, tooltip]) => (
                          <div
                            key={key}
                            className={
                              projectionStyles.projectionSliderRow
                            }
                          >
                            <span
                              className={
                                `${projectionStyles.compactLabel} ${projectionStyles.tooltipAnchor}`
                              }
                              data-tooltip={tooltip}
                              tabIndex={0}
                            >
                              {label}
                            </span>

                            <div
                              className={
                                projectionStyles.projectionRangeWrap
                              }
                            >
                              <input
                                type="range"
                                min="0"
                                max="360"
                                step="0.5"
                                value={
                                  m129BoundaryProjection[key]
                                }
                                onChange={(event) =>
                                  setM129BoundaryProjection(
                                    (current) => ({
                                      ...current,
                                      [key]: Number(
                                        event.target.value
                                      ),
                                    })
                                  )
                                }
                                aria-label={
                                  `${label} projection angle`
                                }
                              />

                              <div
                                className={
                                  projectionStyles.projectionTicks
                                }
                                aria-hidden="true"
                              >
                                <span>0</span>
                                <span></span>
                                <span>π</span>
                                <span></span>
                                <span>2π</span>
                              </div>
                            </div>

                            <div
                              className={
                                projectionStyles.projectionAngleIndicator
                              }
                              role="img"
                              aria-label={
                                `${label} angle ${m129BoundaryProjection[key].toFixed(1)} degrees`
                              }
                              title={
                                `${m129BoundaryProjection[key].toFixed(1)}°`
                              }
                            >
                              <svg
                                viewBox="0 0 36 36"
                                aria-hidden="true"
                                style={{
                                  width: "34px",
                                  height: "34px",
                                  minWidth: "34px",
                                  minHeight: "34px",
                                  maxWidth: "34px",
                                  maxHeight: "34px",
                                  display: "block",
                                }}
                              >
                                <circle
                                  className={
                                    projectionStyles.angleGuideCircle
                                  }
                                  cx="18"
                                  cy="18"
                                  r="13"
                                />

                                <g
                                  className={
                                    projectionStyles.angleReferenceArrow
                                  }
                                >
                                  <line
                                    x1="18"
                                    y1="18"
                                    x2="31"
                                    y2="18"
                                  />
                                  <polygon
                                    points="31,18 27.5,15.8 27.5,20.2"
                                  />
                                </g>

                                <g
                                  className={
                                    projectionStyles.angleCurrentArrow
                                  }
                                  transform={
                                    `rotate(${-m129BoundaryProjection[key]} 18 18)`
                                  }
                                >
                                  <line
                                    x1="18"
                                    y1="18"
                                    x2="31"
                                    y2="18"
                                  />
                                  <polygon
                                    points="31,18 27.5,15.8 27.5,20.2"
                                  />
                                </g>

                                <circle
                                  className={
                                    projectionStyles.angleOrigin
                                  }
                                  cx="18"
                                  cy="18"
                                  r="1.25"
                                />
                              </svg>
                            </div>

                            <button
                              type="button"
                              className={
                                m129BoundaryEvolve[key]
                                  ? projectionStyles.evolveButtonActive
                                  : projectionStyles.evolveButton
                              }
                              onClick={() =>
                                toggleM129BoundaryEvolve(
                                  key
                                )
                              }
                            >
                              {m129BoundaryEvolve[key]
                                ? "stop"
                                : "evolve"}
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  )}

                  <div
                    className={
                      projectionStyles.sectionTitle
                    }
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                    }}
                  >
                    <span>Geometry</span>

                    <button
                      type="button"
                      onClick={() =>
                        setM129GeometryControlsExpanded(
                          (current) => !current
                        )
                      }
                      aria-expanded={
                        m129GeometryControlsExpanded
                      }
                      aria-label={
                        m129GeometryControlsExpanded
                          ? "Collapse Geometry controls"
                          : "Expand Geometry controls"
                      }
                      style={{
                        width: "24px",
                        minWidth: "24px",
                        minHeight: 0,
                        padding: 0,
                        border: 0,
                        background: "transparent",
                        color: "inherit",
                        font: "inherit",
                        fontSize: "18px",
                        lineHeight: 1,
                        cursor: "pointer",
                        opacity: 0.7,
                        marginLeft: "auto",
                      }}
                    >
                      {
                        m129GeometryControlsExpanded
                          ? "−"
                          : "+"
                      }
                    </button>
                  </div>

                  {m129GeometryControlsExpanded && (
                    <div
                      className={
                        projectionStyles.compactSliderGroup
                      }
                    >
                      {[
                        {
                          key: "lambda",
                          label: "λ",
                          min: 0.18,
                          max: 0.96,
                          step: 0.01,
                          value: m129BoundaryLambda,
                          setValue: setM129BoundaryLambda,
                        },
                        {
                          key: "epsilon",
                          label: "ε",
                          min: 0.18,
                          max: 0.64,
                          step: 0.01,
                          value: m129BoundaryEpsilon,
                          setValue: setM129BoundaryEpsilon,
                        },
                        {
                          key: "rho",
                          label: "ρ",
                          min: 0.07,
                          max: 0.14,
                          step: 0.001,
                          value: m129BoundaryRho,
                          setValue: setM129BoundaryRho,
                        },
                      ].map(
                        ({
                          key,
                          label,
                          min,
                          max,
                          step,
                          value,
                          setValue,
                        }) => (
                          <div
                            key={key}
                            className={
                              projectionStyles.geometrySliderRow
                            }
                          >
                            <span
                              className={
                                projectionStyles.geometryLabel
                              }
                            >
                              {label}
                            </span>

                            <input
                              type="range"
                              min={min}
                              max={max}
                              step={step}
                              value={value}
                              onChange={(event) =>
                                setValue(
                                  clamp(
                                    Number(
                                      event.target.value
                                    ),
                                    min,
                                    max
                                  )
                                )
                              }
                              aria-label={
                                `${label} slider`
                              }
                            />

                            <input
                              className={
                                projectionStyles.geometryValueInput
                              }
                              type="number"
                              min={min}
                              max={max}
                              step={step}
                              value={value}
                              onChange={(event) =>
                                setValue(
                                  clamp(
                                    Number(
                                      event.target.value
                                    ),
                                    min,
                                    max
                                  )
                                )
                              }
                              aria-label={
                                `${label} value`
                              }
                            />

                            <button
                              type="button"
                              className={
                                m129BoundaryEvolve[key]
                                  ? projectionStyles.evolveButtonActive
                                  : projectionStyles.evolveButton
                              }
                              onClick={() =>
                                toggleM129BoundaryEvolve(
                                  key
                                )
                              }
                            >
                              {m129BoundaryEvolve[key]
                                ? "stop"
                                : "evolve"}
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  )}

                  <div
                    className={
                      projectionStyles.sectionTitle
                    }
                  >
                    Layers
                  </div>

                  <div
                    className={
                      projectionStyles.displayButtons
                    }
                    style={{
                      gridTemplateColumns:
                        "repeat(3, minmax(0, 1fr))",
                    }}
                  >
                    <button
                      type="button"
                      className={
                        m129CuspLayers.triangles
                          ? projectionStyles.toggleActive
                          : undefined
                      }
                      onClick={() =>
                        toggleM129CuspLayer(
                          "triangles"
                        )
                      }
                    >
                      Triangles
                    </button>

                    <button
                      type="button"
                      className={
                        m129CuspLayers.rainbow
                          ? projectionStyles.toggleActive
                          : undefined
                      }
                      onClick={() =>
                        toggleM129CuspLayer(
                          "rainbow"
                        )
                      }
                    >
                      Rainbow
                    </button>

                    <button
                      type="button"
                      className={
                        m129CuspLayers.split
                          ? projectionStyles.toggleActive
                          : undefined
                      }
                      disabled={
                        !m129HasTwoBoundaryCusps
                      }
                      title={
                        m129HasTwoBoundaryCusps
                          ? "Color the two boundary cusps separately"
                          : "Split requires two boundary cusps"
                      }
                      onClick={() =>
                        toggleM129CuspLayer(
                          "split"
                        )
                      }
                    >
                      Split
                    </button>

                    <button
                      type="button"
                      className={
                        m129CuspLayers.meridian
                          ? projectionStyles.toggleActive
                          : undefined
                      }
                      onClick={() =>
                        toggleM129CuspLayer(
                          "meridian"
                        )
                      }
                    >
                      Meridian
                    </button>

                    <button
                      type="button"
                      className={
                        m129CuspLayers.longitude
                          ? projectionStyles.toggleActive
                          : undefined
                      }
                      onClick={() =>
                        toggleM129CuspLayer(
                          "longitude"
                        )
                      }
                    >
                      Longitude
                    </button>
                  </div>

                  <div
                    className={
                      projectionStyles.sectionTitle
                    }
                    style={{
                      marginTop: "10px",
                    }}
                  >
                    Cusp visibility
                  </div>

                  <div
                    className={
                      projectionStyles.displayButtons
                    }
                    style={{
                      gridTemplateColumns:
                        m129HasTwoBoundaryCusps
                          ? "repeat(2, minmax(0, 1fr))"
                          : "minmax(0, 1fr)",
                    }}
                  >
                    <button
                      type="button"
                      className={
                        m129BoundaryCuspVisibility[0]
                          ? projectionStyles.toggleActive
                          : undefined
                      }
                      onClick={() =>
                        toggleM129BoundaryCuspVisibility(
                          0
                        )
                      }
                      title={
                        m129BoundaryCuspVisibility[0]
                          ? "Hide knot cusp"
                          : "Show knot cusp"
                      }
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          color: "#ff2020",
                        }}
                      >
                        ●
                      </span>
                      {" Knot cusp"}
                    </button>

                    {m129HasTwoBoundaryCusps && (
                      <button
                        type="button"
                        className={
                          m129BoundaryCuspVisibility[1]
                            ? projectionStyles.toggleActive
                            : undefined
                        }
                        onClick={() =>
                          toggleM129BoundaryCuspVisibility(
                            1
                          )
                        }
                        title={
                          m129BoundaryCuspVisibility[1]
                            ? "Hide crossing-circle cusp"
                            : "Show crossing-circle cusp"
                        }
                      >
                        <span
                          aria-hidden="true"
                          style={{
                            color: "#4da3ff",
                          }}
                        >
                          ●
                        </span>
                        {" Crossing-circle cusp"}
                      </button>
                    )}
                  </div>

                  <div
                    className={
                      styles.controlSection
                    }
                    style={{
                      marginTop: "14px",
                    }}
                  >
                    <div
                      className={
                        styles.controlTitle
                      }
                    >
                      View
                    </div>

                    <div
                      className={
                        styles.cellsViewControls
                      }
                    >
                      <button
                        type="button"
                        onClick={() =>
                          handleM129BoundaryRotationClick(
                            -1
                          )
                        }
                        onDoubleClick={() =>
                          handleM129BoundaryRotationDoubleClick(
                            -1
                          )
                        }
                        aria-pressed={
                          m129BoundaryAutoRotationDirection ===
                          -1
                        }
                        aria-label="Rotate counter-clockwise"
                        title={
                          m129BoundaryAutoRotationDirection ===
                          -1
                            ? "Double-click to stop counter-clockwise rotation"
                            : "Click for 15 degrees. Double-click for continuous counter-clockwise rotation."
                        }
                      >
                        <RotationArrowIcon />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleM129BoundaryRotationClick(
                            1
                          )
                        }
                        onDoubleClick={() =>
                          handleM129BoundaryRotationDoubleClick(
                            1
                          )
                        }
                        aria-pressed={
                          m129BoundaryAutoRotationDirection ===
                          1
                        }
                        aria-label="Rotate clockwise"
                        title={
                          m129BoundaryAutoRotationDirection ===
                          1
                            ? "Double-click to stop clockwise rotation"
                            : "Click for 15 degrees. Double-click for continuous clockwise rotation."
                        }
                      >
                        <RotationArrowIcon clockwise />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          zoomM129Boundary(-0.1)
                        }
                        aria-label="Zoom out"
                      >
                        −
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          zoomM129Boundary(0.1)
                        }
                        aria-label="Zoom in"
                        style={{
                          fontSize: "18px",
                          lineHeight: 1,
                        }}
                      >
                        +
                      </button>

                      <button
                        type="button"
                        className={
                          styles.cellsResetButton
                        }
                        onClick={
                          resetM129BoundaryView
                        }
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                </>
              )}

              {representationMode ===
                "cusp" && (
                manifoldStateId === "m129"
                  ? (
                    <>
                      <div
                        className={
                          styles.controlSection
                        }
                      >
                        <div
                          className={
                            styles.controlTitle
                          }
                        >
                          Layers
                        </div>

                        <div
                          className={
                            styles.viewGrid
                          }
                        >
                          <button
                            type="button"
                            className={
                              m129CuspLayers.triangles
                                ? styles.activeViewButton
                                : undefined
                            }
                            onClick={() =>
                              toggleM129CuspLayer(
                                "triangles"
                              )
                            }
                          >
                            Triangles
                          </button>

                          <button
                            type="button"
                            className={
                              m129CuspLayers.rainbow
                                ? styles.activeViewButton
                                : undefined
                            }
                            onClick={() =>
                              toggleM129CuspLayer(
                                "rainbow"
                              )
                            }
                          >
                            Rainbow
                          </button>

                          <button
                            type="button"
                            className={
                              m129CuspLayers.meridian
                                ? styles.activeViewButton
                                : undefined
                            }
                            onClick={() =>
                              toggleM129CuspLayer(
                                "meridian"
                              )
                            }
                          >
                            Meridian
                          </button>

                          <button
                            type="button"
                            className={
                              m129CuspLayers.longitude
                                ? styles.activeViewButton
                                : undefined
                            }
                            onClick={() =>
                              toggleM129CuspLayer(
                                "longitude"
                              )
                            }
                          >
                            Longitude
                          </button>
                        </div>
                      </div>

                      <div
                        className={
                          styles.controlSection
                        }
                      >
                        <div
                          className={
                            styles.controlTitle
                          }
                        >
                          View
                        </div>

                        <div
                          className={
                            styles.cellsViewControls
                          }
                        >
                          <button
                            type="button"
                            onClick={() =>
                              rotateM129Cusp(
                                -15
                              )
                            }
                            aria-label="Rotate counter-clockwise"
                          >
                            <RotationArrowIcon />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              rotateM129Cusp(
                                15
                              )
                            }
                            aria-label="Rotate clockwise"
                          >
                            <RotationArrowIcon
                              clockwise
                            />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              zoomM129Cusp(
                                -0.1
                              )
                            }
                            aria-label="Zoom out"
                          >
                            −
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              zoomM129Cusp(
                                0.1
                              )
                            }
                            aria-label="Zoom in"
                          >
                            +
                          </button>

                          <button
                            type="button"
                            className={
                              styles.cellsResetButton
                            }
                            onClick={
                              resetM129CuspView
                            }
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                    </>
                  )
                  : renderIdentificationControls(
                      true
                    )
              )}

              {representationMode ===
                "cells" && (
                <>
                  {
                    manifoldStateId !== "m129" &&
                    renderIdentificationControls(
                      false
                    )
                  }

                  <div
                    className={
                      styles.controlSection
                    }
                  >
                    <div
                      className={
                        styles.controlTitle
                      }
                    >
                      View
                    </div>

                    <div
                      className={
                        styles.cellsViewControls
                      }
                    >
                      <button
                        type="button"
                        onClick={() =>
                          handleCellsRotationClick(
                            -1
                          )
                        }
                        onDoubleClick={() =>
                          handleCellsRotationDoubleClick(
                            -1
                          )
                        }
                        aria-label="Rotate counter-clockwise"
                        title="Click to rotate. Double-click for continuous rotation."
                      >
                        <RotationArrowIcon />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleCellsRotationClick(
                            1
                          )
                        }
                        onDoubleClick={() =>
                          handleCellsRotationDoubleClick(
                            1
                          )
                        }
                        aria-label="Rotate clockwise"
                        title="Click to rotate. Double-click for continuous rotation."
                      >
                        <RotationArrowIcon
                          clockwise
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          zoomCells(-0.1)
                        }
                        aria-label="Zoom out"
                      >
                        −
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          zoomCells(0.1)
                        }
                        aria-label="Zoom in"
                      >
                        +
                      </button>

                      <button
                        type="button"
                        className={
                          styles.cellsResetButton
                        }
                        onClick={
                          resetCellsView
                        }
                      >
                        Reset
                      </button>
                    </div>
                  </div>

                  <div
                    className={
                      styles.truncationControl
                    }
                  >
                    <div
                      className={
                        styles.truncationHeader
                      }
                    >
                      <span>
                        Truncation
                      </span>

                      <strong>
                        {(
                          cellsTruncationFraction *
                          100
                        ).toFixed(1)}%
                      </strong>
                    </div>

                    <input
                      type="range"
                      min={
                        MIN_TRUNCATION_FRACTION
                      }
                      max={
                        MAX_TRUNCATION_FRACTION
                      }
                      step="0.001"
                      value={
                        cellsTruncationFraction
                      }
                      onChange={
                        (event) =>
                          setCellsTruncationFraction(
                            clamp(
                              Number(
                                event
                                  .target
                                  .value
                              ),
                              MIN_TRUNCATION_FRACTION,
                              MAX_TRUNCATION_FRACTION
                            )
                          )
                      }
                      aria-label="Truncation as a fraction of tetrahedron edge length"
                    />

                    <div
                      className={
                        styles.truncationScale
                      }
                      aria-hidden="true"
                    >
                      <span>4.0%</span>
                      <span>33.3%</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          }
          footerControls={
            (
              manifoldStateId !== "m129" &&
              representationMode !== "cells"
            ) ? (
              <div
                className={
                  styles.controlSection
                }
              >
                <div
                  className={
                    styles.controlTitle
                  }
                >
                  View
                </div>

                <div
                  className={
                    styles.cellsViewControls
                  }
                >
                  <button
                    type="button"
                    onClick={() =>
                      handleProjectionRotationClick(
                        -1
                      )
                    }
                    onDoubleClick={() =>
                      handleProjectionRotationDoubleClick(
                        -1
                      )
                    }
                    aria-label="Rotate counter-clockwise"
                    title="Click to rotate. Double-click for continuous rotation."
                  >
                    <RotationArrowIcon />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleProjectionRotationClick(
                        1
                      )
                    }
                    onDoubleClick={() =>
                      handleProjectionRotationDoubleClick(
                        1
                      )
                    }
                    aria-label="Rotate clockwise"
                    title="Click to rotate. Double-click for continuous rotation."
                  >
                    <RotationArrowIcon
                      clockwise
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      projectionControlRef
                        .current
                        ?.zoom(-1)
                    }
                    aria-label="Zoom out"
                  >
                    −
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      projectionControlRef
                        .current
                        ?.zoom(1)
                    }
                    aria-label="Zoom in"
                  >
                    +
                  </button>

                  <button
                    type="button"
                    className={
                      styles.cellsResetButton
                    }
                    onClick={
                      resetProjectionView
                    }
                  >
                    Reset
                  </button>
                </div>
              </div>
            ) : null
          }
        />

        {cuspFlightActive &&
          manifoldStateId === "m129" &&
          cuspFlightSource &&
          cuspFlightTarget &&
          typeof document !== "undefined" &&
          createPortal(
            <svg
              aria-hidden="true"
              style={{
                position: "fixed",
                inset: 0,
                width: "100vw",
                height: "100vh",
                zIndex: 1200,
                pointerEvents: "none",
                overflow: "visible",
              }}
            >
              {
                renderM129FlightTriangles()
              }
            </svg>,
            document.body
          )}

        {cuspFlightActive &&
          manifoldStateId !== "m129" &&
          cuspFlightSource &&
          cuspFlightTarget &&
          typeof document !== "undefined" &&
          createPortal(
            <svg
              aria-hidden="true"
              style={{
                position: "fixed",
                inset: 0,
                width: "100vw",
                height: "100vh",
                zIndex: 1200,
                pointerEvents: "none",
                overflow: "visible",
              }}
            >
              {cuspFlightSource
                .triangles
                .map(
                  (
                    sourceTriangle
                  ) => {
                    const materialId =
                      sourceTriangle.id;

                    const slotEntry =
                      Object.entries(
                        activeCuspMaterialLayout
                          .materialBySlotId ??
                          {}
                      ).find(
                        ([
                          ,
                          candidateMaterialId,
                        ]) =>
                          candidateMaterialId ===
                          materialId
                      );

                    const slotId =
                      manifoldStateId === "m003"
                        ? SISTER_CUSP_SLOT_BY_MATERIAL[
                            materialId
                          ] ??
                          materialId
                        : slotEntry?.[0] ??
                          materialId;

                    const targetTriangle =
                      cuspFlightTarget
                        .triangles
                        ?.find(
                          (
                            triangle
                          ) =>
                            triangle.slotId ===
                            slotId
                        );

                    const targetLayout =
                      manifoldStateId === "m003"
                        ? null
                        : activeCuspMaterialLayout
                            .layoutByMaterialId?.[
                            materialId
                          ];

                    if (
                      !targetTriangle ||
                      (
                        manifoldStateId !== "m003" &&
                        !targetLayout
                      )
                    ) {
                      return null;
                    }

                    let pointsByCorner =
                      Object.fromEntries(
                        Object.entries(
                          sourceTriangle
                            .pointsByCorner
                        ).map(
                          ([
                            corner,
                            sourcePoint,
                          ]) => {
                            let targetCorner;

                            if (
                              manifoldStateId === "m003"
                            ) {
                              const cornerIndex =
                                SISTER_CUSP_FIXED_CORNER_INDEX[
                                  materialId
                                ]?.[
                                  corner
                                ];

                              targetCorner =
                                Number.isInteger(
                                  cornerIndex
                                )
                                  ? targetTriangle
                                      .corners[
                                      cornerIndex
                                    ]
                                  : null;
                            } else {
                              const rawTarget =
                                targetLayout[
                                  corner
                                ];

                              if (!rawTarget) {
                                return [
                                  corner,
                                  null,
                                ];
                              }

                              targetCorner =
                                targetTriangle
                                  .corners
                                  .find(
                                    (
                                      candidate
                                    ) =>
                                      Math.abs(
                                        candidate
                                          .raw
                                          .x -
                                        rawTarget
                                          .x
                                      ) <
                                        1e-8 &&
                                      Math.abs(
                                        candidate
                                          .raw
                                          .y -
                                        rawTarget
                                          .y
                                      ) <
                                        1e-8
                                  );
                            }

                            if (
                              !targetCorner
                            ) {
                              return [
                                corner,
                                null,
                              ];
                            }

                            const start =
                              targetCorner
                                .screen;

                            const end =
                              sourcePoint;

                            return [
                              corner,
                              {
                                x:
                                  start.x +
                                  (
                                    end.x -
                                    start.x
                                  ) *
                                    cuspFlightProgress,

                                y:
                                  start.y +
                                  (
                                    end.y -
                                    start.y
                                  ) *
                                    cuspFlightProgress,
                              },
                            ];
                          }
                        )
                      );

                    const points =
                      Object.values(
                        pointsByCorner
                      );

                    if (
                      points.some(
                        (point) =>
                          !point
                      )
                    ) {
                      return null;
                    }

                    if (
                      Math.abs(
                        cuspFlightTwistDegrees
                      ) >
                      1e-9
                    ) {
                      const centroid = {
                        x:
                          points.reduce(
                            (
                              sum,
                              point
                            ) =>
                              sum +
                              point.x,
                            0
                          ) / 3,

                        y:
                          points.reduce(
                            (
                              sum,
                              point
                            ) =>
                              sum +
                              point.y,
                            0
                          ) / 3,
                      };

                      const radians =
                        cuspFlightTwistDegrees *
                        Math.PI /
                        180;

                      const cosine =
                        Math.cos(
                          radians
                        );

                      const sine =
                        Math.sin(
                          radians
                        );

                      pointsByCorner =
                        Object.fromEntries(
                          Object.entries(
                            pointsByCorner
                          ).map(
                            ([
                              corner,
                              point,
                            ]) => {
                              const dx =
                                point.x -
                                centroid.x;

                              const dy =
                                point.y -
                                centroid.y;

                              return [
                                corner,
                                {
                                  x:
                                    centroid.x +
                                    cosine *
                                      dx -
                                    sine *
                                      dy,

                                  y:
                                    centroid.y +
                                    sine *
                                      dx +
                                    cosine *
                                      dy,
                                },
                              ];
                            }
                          )
                        );
                    }

                    const renderedPoints =
                      Object.values(
                        pointsByCorner
                      );

                    return (
                      <g key={materialId}>
                        <polygon
                          points={
                            renderedPoints
                              .map(
                                (
                                  point
                                ) =>
                                  `${point.x},${point.y}`
                              )
                              .join(" ")
                          }
                          fill={
                            sourceTriangle
                              .color
                          }
                          stroke="rgba(28, 24, 19, 0.92)"
                          strokeWidth="1.4"
                          strokeLinejoin="round"
                          vectorEffect="non-scaling-stroke"
                        />

                        {(
                          sourceTriangle
                            .edgeSegments ??
                          []
                        ).map(
                          (
                            edge,
                            edgeIndex
                          ) => {
                            const startPoint =
                              pointsByCorner[
                                edge
                                  .startCorner
                              ];

                            const endPoint =
                              pointsByCorner[
                                edge
                                  .endCorner
                              ];

                            if (
                              !startPoint ||
                              !endPoint
                            ) {
                              return null;
                            }

                            return (
                              <line
                                key={`${materialId}-edge-${edgeIndex}`}
                                x1={
                                  startPoint.x
                                }
                                y1={
                                  startPoint.y
                                }
                                x2={
                                  endPoint.x
                                }
                                y2={
                                  endPoint.y
                                }
                                stroke={
                                  cuspFlightEdgeColor(
                                    manifoldStateId,
                                    materialId,
                                    edge
                                  )
                                }
                                strokeWidth="2.70"
                                strokeLinecap="round"
                                vectorEffect="non-scaling-stroke"
                              />
                            );
                          }
                        )}
                      </g>
                    );
                  }
                )}
            </svg>,
            document.body
          )}

        {(
          manifoldStateId === "m129" &&
          (
            representationMode === "cusp" ||
            representationMode === "boundary"
          )
        ) && (
          <M129CuspDevelopmentViewer
            showTriangles={
              m129CuspLayers.triangles
            }
            rainbow={
              m129CuspLayers.rainbow
            }
            showMeridian={
              m129CuspLayers.meridian
            }
            showLongitude={
              m129CuspLayers.longitude
            }
            viewYawDegrees={
              m129CuspView.yawDegrees
            }
            viewPitchDegrees={
              m129CuspView.pitchDegrees
            }
            viewZoom={
              m129CuspView.zoom
            }
            onOrbit={
              orbitM129Cusp
            }
            onZoom={
              zoomM129Cusp
            }
            onFlightTargetChange={
              handleM129CuspFlightTargetChange
            }
            presentationOpacity={
              cuspFlightActive
                ? 0
                : clamp(
                    (
                      0.04 -
                      effectiveM129CuspBoundaryMorph
                    ) /
                      0.04,
                    0,
                    1
                  )
            }
          />
        )}
      </div>
    </div>
  );
}
