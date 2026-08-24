"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { createPortal } from "react-dom";

import styles from "./FigureEightProjectionLab.module.css";

import {
  DEFAULT_FIGURE_EIGHT_CUSP_COORDINATE_SPEC,
  DEFAULT_FIGURE_EIGHT_S3_GEOMETRY,
  FIGURE_EIGHT_CUSP_DOMAIN_CORNERS,
  FIGURE_EIGHT_CUSP_HEIGHT,
  FIGURE_EIGHT_CUSP_LONGITUDE_U_SLOPE,
  FIGURE_EIGHT_S3_STANDARD_PROJECTION,
  FIGURE_EIGHT_S3_SYMMETRIC_PROJECTION,
  buildFigureEightS3Tube,
  cuspDomainCoordinates,
  cuspRawPointFromCoordinates,
  cuspTubeCoordinates,
  sampleFigureEightS3TubePoint4,
  rotateFigureEightS3MixedPlanes,
} from "../figureEightS3Geometry";

const DEFAULT_GEOMETRY =
  DEFAULT_FIGURE_EIGHT_S3_GEOMETRY;

const DEFAULT_NU = 144;
const DEFAULT_NV = 32;

const MESH_LEVELS = [
  { nu: 36, nv: 8, vertices: 288 },
  { nu: 48, nv: 12, vertices: 576 },
  { nu: 72, nv: 16, vertices: 1152 },
  { nu: 96, nv: 24, vertices: 2304 },
  { nu: 144, nv: 32, vertices: 4608 },
  { nu: 192, nv: 48, vertices: 9216 },
  { nu: 288, nv: 64, vertices: 18432 },
  { nu: 384, nv: 96, vertices: 36864 },
  { nu: 576, nv: 144, vertices: 82944 },
];

const DEG = Math.PI / 180;

const ZERO_PROJECTION = {
  xw: 0,
  yw: 0,
  zw: 0,
};

const STANDARD_PROJECTION =
  FIGURE_EIGHT_S3_STANDARD_PROJECTION;

const SYMMETRIC_PROJECTION =
  FIGURE_EIGHT_S3_SYMMETRIC_PROJECTION;


/*
 * User-selected complete Projection Lab views.
 *
 * Unlike Symmetric / Standard / π/4 offset, these restore the
 * complete visible configuration:
 *
 *   S³ projection
 *   intrinsic geometry
 *   ordinary 3D camera
 *   layers
 *   cusp/boundary endpoint
 *   rendering resolution
 */
const SAVED_PROJECTION_PRESETS_STORAGE_KEY =
  "physics-monastery:figure-eight-projection-presets-v1";

const DEFAULT_SAVED_PROJECTION_PRESETS =
  Object.freeze({
    /*
     * The original three buttons are now COMPLETE presets too.
     *
     * They no longer inherit the viewer's current camera
     * orientation.
     */
    symmetric: Object.freeze({
      manifoldId: "m004",
      projectionPreset: null,

      projection: Object.freeze({
        xw: 0,
        yw: 90,
        zw: 180,
      }),

      geometry: Object.freeze({
        lambda: 0.14,
        epsilon: 0.14,
        rho: 0.14,
      }),

      view: Object.freeze({
        yaw: 1.1413531799316403,
        pitch: -1.2340274669316154,
        zoom: 1.2544,
      }),

      layers: Object.freeze({
        colorMode: "triangles",
        triangles: true,
        meridian: false,
        longitude: false,
        labels: false,
        edgePairs: false,
        wireframe: false,
      }),

      cuspMorph: 1,

      mesh: Object.freeze({
        level: 6,
        nu: 288,
        nv: 64,
      }),
    }),

    standard: Object.freeze({
      manifoldId: "m004",

      projection: Object.freeze({
        ...STANDARD_PROJECTION,
      }),

      geometry: Object.freeze({
        ...DEFAULT_GEOMETRY,
      }),

      view: Object.freeze({
        yaw: -0.55,
        pitch: 0.42,
        zoom: 1.2544,
      }),

      layers: Object.freeze({
        colorMode: "triangles",
        triangles: true,
        meridian: false,
        longitude: false,
        labels: false,
        edgePairs: false,
        wireframe: false,
      }),

      cuspMorph: 1,

      mesh: Object.freeze({
        level: 6,
        nu: 288,
        nv: 64,
      }),
    }),

    offset: Object.freeze({
      manifoldId: "m004",

      projection: Object.freeze({
        xw: 0,
        yw: 45,
        zw: 90,
      }),

      geometry: Object.freeze({
        ...DEFAULT_GEOMETRY,
      }),

      view: Object.freeze({
        yaw: -0.55,
        pitch: 0.42,
        zoom: 1.2544,
      }),

      layers: Object.freeze({
        colorMode: "triangles",
        triangles: true,
        meridian: false,
        longitude: false,
        labels: false,
        edgePairs: false,
        wireframe: false,
      }),

      cuspMorph: 1,

      mesh: Object.freeze({
        level: 6,
        nu: 288,
        nv: 64,
      }),
    }),


    /*
     * Exact user-selected publication views.
     */

    preset1: Object.freeze({
      manifoldId: "m004",
      projectionPreset: null,

      projection: Object.freeze({
        xw: 0,
        yw: 88.5,
        zw: 209.5,
      }),

      geometry: Object.freeze({
        lambda: 0.22,
        epsilon: 0.27,
        rho: 0.21,
      }),

      view: Object.freeze({
        yaw: -2.3402732543945315,
        pitch: -0.7429368144657951,
        zoom: 0.9119462583867255,
      }),

      layers: Object.freeze({
        colorMode: "triangles",
        triangles: true,
        meridian: false,
        longitude: false,
        labels: false,
        edgePairs: false,
        wireframe: false,
      }),

      cuspMorph: 1,

      mesh: Object.freeze({
        level: 6,
        nu: 288,
        nv: 64,
      }),
    }),

    preset2: Object.freeze({
      manifoldId: "m004",
      projectionPreset: null,

      projection: Object.freeze({
        xw: 360,
        yw: 174.5,
        zw: 259.5,
      }),

      geometry: Object.freeze({
        lambda: 1,
        epsilon: 0.5,
        rho: 0.21,
      }),

      view: Object.freeze({
        yaw: -6.285367004394532,
        pitch: 0.19660696300002523,
        zoom: 0.9119462583867255,
      }),

      layers: Object.freeze({
        colorMode: "triangles",
        triangles: true,
        meridian: false,
        longitude: false,
        labels: false,
        edgePairs: false,
        wireframe: false,
      }),

      cuspMorph: 1,

      mesh: Object.freeze({
        level: 6,
        nu: 288,
        nv: 64,
      }),
    }),

    preset3: Object.freeze({
      manifoldId: "m004",
      projectionPreset: null,

      projection: Object.freeze({
        xw: 320,
        yw: 174.5,
        zw: 201.5,
      }),

      geometry: Object.freeze({
        lambda: 1,
        epsilon: 0.5,
        rho: 0.21,
      }),

      view: Object.freeze({
        yaw: -12.441424133300782,
        pitch: 0.09645394786330648,
        zoom: 0.9444372295507798,
      }),

      layers: Object.freeze({
        colorMode: "triangles",
        triangles: true,
        meridian: false,
        longitude: false,
        labels: false,
        edgePairs: false,
        wireframe: false,
      }),

      cuspMorph: 1,

      mesh: Object.freeze({
        level: 6,
        nu: 288,
        nv: 64,
      }),
    }),

    preset4: Object.freeze({
      manifoldId: "m004",
      projectionPreset: null,

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
        zoom: 0.8520478864814157,
      }),

      layers: Object.freeze({
        colorMode: "triangles",
        triangles: true,
        meridian: false,
        longitude: false,
        labels: false,
        edgePairs: false,
        wireframe: false,
      }),

      cuspMorph: 1,

      mesh: Object.freeze({
        level: 6,
        nu: 288,
        nv: 64,
      }),
    }),

    preset5: Object.freeze({
      manifoldId: "m004",
      projectionPreset: null,

      projection: Object.freeze({
        xw: 94,
        yw: 174.5,
        zw: 114,
      }),

      geometry: Object.freeze({
        lambda: 0.14,
        epsilon: 0.16,
        rho: 0.21,
      }),

      view: Object.freeze({
        yaw: -7.210173034667967,
        pitch: -0.07949435313674402,
        zoom: 1.0104614815839275,
      }),

      layers: Object.freeze({
        colorMode: "triangles",
        triangles: true,
        meridian: false,
        longitude: false,
        labels: false,
        edgePairs: false,
        wireframe: false,
      }),

      cuspMorph: 1,

      mesh: Object.freeze({
        level: 6,
        nu: 288,
        nv: 64,
      }),
    }),

    preset6: Object.freeze({
      manifoldId: "m004",
      projectionPreset: null,

      projection: Object.freeze({
        xw: 0,
        yw: 95,
        zw: 209.5,
      }),

      geometry: Object.freeze({
        lambda: 0.22,
        epsilon: 0.27,
        rho: 0.21,
      }),

      view: Object.freeze({
        yaw: -5.117339599609375,
        pitch: 0.10056997569533757,
        zoom: 0.88699919384572,
      }),

      layers: Object.freeze({
        colorMode: "triangles",
        triangles: true,
        meridian: false,
        longitude: false,
        labels: false,
        edgePairs: false,
        wireframe: false,
      }),

      cuspMorph: 1,

      mesh: Object.freeze({
        level: 6,
        nu: 288,
        nv: 64,
      }),
    }),

  });

const EVOLVE_SPEED_DEGREES_PER_SECOND = 8.4;

const GEOMETRY_RANGES = {
  lambda: {
    min: 0.14,
    max: 1.00,
  },
  epsilon: {
    min: 0.14,
    max: 0.50,
  },
  rho: {
    min: 0.07,
    max: 0.21,
  },
};

/*
 * Match one complete geometry back-and-forth cycle
 * to one complete 360° projection evolution cycle.
 */
const GEOMETRY_EVOLVE_FULL_CYCLE_SECONDS =
  360 / EVOLVE_SPEED_DEGREES_PER_SECOND;

const GEOMETRY_EVOLVE_FPS = 20;

/*
 * Exact eight-triangle cusp development used by the
 * figure-eight complement constructor. These are the
 * eight logical macro-triangles; the ordinary tube mesh
 * remains only a rendering tessellation.
 */
const CUSP_HEIGHT =
  FIGURE_EIGHT_CUSP_HEIGHT;

const CUSP_DOMAIN_CORNERS =
  FIGURE_EIGHT_CUSP_DOMAIN_CORNERS;

const CUSP_MACRO_TRIANGLES = [
  {
    id: "A0",
    corners: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0.5, y: CUSP_HEIGHT },
    ],
  },
  {
    id: "B0",
    corners: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0.5, y: -CUSP_HEIGHT },
    ],
  },
  {
    id: "B3",
    corners: [
      { x: 0, y: 0 },
      { x: 0.5, y: CUSP_HEIGHT },
      { x: -0.5, y: CUSP_HEIGHT },
    ],
  },
  {
    id: "A3",
    corners: [
      { x: 0.5, y: -CUSP_HEIGHT },
      { x: 1, y: 0 },
      { x: 1.5, y: -CUSP_HEIGHT },
    ],
  },
  {
    id: "A2",
    corners: [
      { x: -0.5, y: CUSP_HEIGHT },
      { x: 0.5, y: CUSP_HEIGHT },
      { x: 0, y: 2 * CUSP_HEIGHT },
    ],
  },
  {
    id: "B1",
    corners: [
      { x: 1.5, y: -CUSP_HEIGHT },
      { x: 0.5, y: -CUSP_HEIGHT },
      { x: 1, y: -2 * CUSP_HEIGHT },
    ],
  },
  {
    id: "A1",
    corners: [
      { x: 1, y: -2 * CUSP_HEIGHT },
      { x: 1.5, y: -CUSP_HEIGHT },
      { x: 2, y: -2 * CUSP_HEIGHT },
    ],
  },
  {
    id: "B2",
    corners: [
      { x: 1, y: -2 * CUSP_HEIGHT },
      { x: 2, y: -2 * CUSP_HEIGHT },
      { x: 1.5, y: -3 * CUSP_HEIGHT },
    ],
  },
];

const CUSP_TRIANGLE_EDGE_SAMPLES = 96;

/*
 * Tiny VISUAL separation between the eight logical Cusp triangles.
 *
 * This does NOT alter:
 *   - canonical cusp coordinates,
 *   - edge identifications,
 *   - material correspondence,
 *   - torus topology.
 *
 * It only pulls the painted triangle slightly toward its centroid.
 */
const CUSP_VISUAL_GAP_FRACTION = 0.060;

const CUSP_TRIANGLE_COLORS =
  Object.freeze({
    A0: "#ffe600",
    B0: "#ffe600",

    A1: "#4da3ff",
    B1: "#4da3ff",

    A2: "#159447",
    B2: "#159447",

    A3: "#ff2020",
    B3: "#ff2020",
  });

/*
 * m003 / Figure-eight Sister.
 *
 * These are MATERIAL colors, not inferred slot colors.
 * They are fixed by the actual Sister tetrahedron faces.
 */
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

const SISTER_CUSP_TRIANGLE_COLORS =
  Object.freeze({
    A0: "#ff2020", // red
    A1: "#159447", // green
    A2: "#4da3ff", // blue
    A3: "#ffe600", // orange

    B0: "#4da3ff", // blue
    B1: "#ff2020", // red
    B2: "#ffe600", // orange
    B3: "#159447", // green
  });

const CUSP_MATERIAL_EDGE_COLORS =
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

const FIGURE_EIGHT_CUSP_CORNER_BY_SLOT_INDEX =
  Object.freeze({
    A0: Object.freeze([1, 2, 3]),
    B0: Object.freeze([1, 3, 2]),
    B3: Object.freeze([2, 1, 0]),
    A3: Object.freeze([1, 2, 0]),
    A2: Object.freeze([0, 1, 3]),
    B1: Object.freeze([3, 2, 0]),
    A1: Object.freeze([0, 2, 3]),
    B2: Object.freeze([3, 1, 0]),
  });

const SISTER_CUSP_CORNER_BY_SLOT_INDEX =
  Object.freeze({
    A0: Object.freeze([1, 3, 2]),
    B0: Object.freeze([2, 3, 0]),
    B3: Object.freeze([0, 1, 3]),
    A3: Object.freeze([1, 3, 2]),
    A2: Object.freeze([1, 2, 0]),
    B1: Object.freeze([1, 0, 3]),
    A1: Object.freeze([2, 1, 0]),
    B2: Object.freeze([2, 3, 0]),
  });

function cuspMaterialEdgeColor(
  manifoldId,
  slotId,
  edgeIndex
) {
  const sister =
    manifoldId === "m003";

  const materialId =
    sister
      ? SISTER_CUSP_MATERIAL_BY_SLOT[
          slotId
        ] ?? slotId
      : slotId;

  const cornerByIndex =
    sister
      ? SISTER_CUSP_CORNER_BY_SLOT_INDEX[
          slotId
        ]
      : FIGURE_EIGHT_CUSP_CORNER_BY_SLOT_INDEX[
          slotId
        ];

  if (!cornerByIndex) {
    return null;
  }

  const edgeKey =
    [
      Number(
        cornerByIndex[
          edgeIndex
        ]
      ),
      Number(
        cornerByIndex[
          (edgeIndex + 1) % 3
        ]
      ),
    ]
      .sort((a, b) => a - b)
      .join(",");

  return (
    CUSP_MATERIAL_EDGE_COLORS[
      materialId
    ]?.[edgeKey] ??
    null
  );
}

const CUSP_TRIANGLE_RGB =
  Object.freeze({
    A0: [255, 176, 0],
    B0: [255, 176, 0],

    A1: [77, 163, 255],
    B1: [77, 163, 255],

    A2: [21, 148, 71],
    B2: [21, 148, 71],

    A3: [255, 32, 32],
    B3: [255, 32, 32],
  });

const CUSP_MORPH_DURATION_MS = 2800;

/*
 * Standard Projection Lab scale.
 *
 * This is exactly two presses of the existing "+" control:
 *
 *   1.12^2 = 1.2544
 */
const CUSP_DEFAULT_ZOOM = 1.2544;

const CUSP_EDGE_PAIR_TOLERANCE = 1e-8;
const CUSP_EDGE_CERTIFICATION_SAMPLES = 24;

const CUSP_PERIPHERAL_CURVE_SAMPLES = 768;
const CUSP_PERIPHERAL_TOLERANCE = 1e-8;

/*
 * The meridian homology class is unchanged by shifting
 * the constant V-level. We choose a more visible
 * representative on the torus for the default view.
 */
const CUSP_VISIBLE_MERIDIAN_V = 0.12;

const CUSP_MERIDIAN_HUE = 0;
const CUSP_LONGITUDE_HUE = 132;

function cuspEdgePoint(
  edge,
  amount
) {
  return {
    x:
      edge.start.x +
      (
        edge.end.x -
        edge.start.x
      ) *
        amount,

    y:
      edge.start.y +
      (
        edge.end.y -
        edge.start.y
      ) *
        amount,
  };
}

function cuspCoordinatesNear(
  first,
  second,
  tolerance =
    CUSP_EDGE_PAIR_TOLERANCE
) {
  return (
    Math.abs(
      first.u - second.u
    ) <= tolerance &&
    Math.abs(
      first.v - second.v
    ) <= tolerance
  );
}

function cuspIntegerTranslation(
  first,
  second,
  tolerance =
    CUSP_EDGE_PAIR_TOLERANCE
) {
  const deltaU =
    first.u - second.u;

  const deltaV =
    first.v - second.v;

  const integerU =
    Math.round(deltaU);

  const integerV =
    Math.round(deltaV);

  if (
    Math.abs(
      deltaU - integerU
    ) > tolerance ||
    Math.abs(
      deltaV - integerV
    ) > tolerance
  ) {
    return null;
  }

  return {
    u: integerU,
    v: integerV,
  };
}

function translatedCuspCoordinates(
  coordinates,
  translation
) {
  return {
    u:
      coordinates.u +
      translation.u,

    v:
      coordinates.v +
      translation.v,
  };
}

function deriveCuspEdgePairs() {
  const materialEdges = [];

  for (
    const macroTriangle of
    CUSP_MACRO_TRIANGLES
  ) {
    for (
      let edgeIndex = 0;
      edgeIndex < 3;
      edgeIndex += 1
    ) {
      const start =
        macroTriangle.corners[
          edgeIndex
        ];

      const end =
        macroTriangle.corners[
          (edgeIndex + 1) % 3
        ];

      materialEdges.push({
        key:
          `${macroTriangle.id}:` +
          `${edgeIndex}`,

        cuspBaseId:
          macroTriangle.id,

        edgeIndex,

        start,
        end,

        startCoordinates:
          cuspDomainCoordinates(
            start
          ),

        endCoordinates:
          cuspDomainCoordinates(
            end
          ),
      });
    }
  }

  const unused =
    new Set(
      materialEdges.map(
        (_, index) => index
      )
    );

  const pairs = [];

  for (
    let firstIndex = 0;
    firstIndex <
    materialEdges.length;
    firstIndex += 1
  ) {
    if (
      !unused.has(firstIndex)
    ) {
      continue;
    }

    const first =
      materialEdges[
        firstIndex
      ];

    unused.delete(firstIndex);

    let found = null;

    for (
      let secondIndex =
        firstIndex + 1;
      secondIndex <
        materialEdges.length;
      secondIndex += 1
    ) {
      if (
        !unused.has(
          secondIndex
        )
      ) {
        continue;
      }

      const second =
        materialEdges[
          secondIndex
        ];

      for (
        const reversed of
        [false, true]
      ) {
        const secondStart =
          reversed
            ? second.endCoordinates
            : second.startCoordinates;

        const secondEnd =
          reversed
            ? second.startCoordinates
            : second.endCoordinates;

        const translation =
          cuspIntegerTranslation(
            first.startCoordinates,
            secondStart
          );

        if (!translation) {
          continue;
        }

        const translatedEnd =
          translatedCuspCoordinates(
            secondEnd,
            translation
          );

        if (
          cuspCoordinatesNear(
            first.endCoordinates,
            translatedEnd
          )
        ) {
          found = {
            secondIndex,
            second,
            reversed,
            translation,
          };

          break;
        }
      }

      if (found) {
        break;
      }
    }

    if (!found) {
      console.warn(
        "Unpaired cusp material edge:",
        first.key
      );

      continue;
    }

    unused.delete(
      found.secondIndex
    );

    const pairIndex =
      pairs.length;

    pairs.push({
      index:
        pairIndex,

      label:
        `e${pairIndex + 1}`,

      hue:
        (
          pairIndex * 30
        ) % 360,

      first,

      second:
        found.second,

      reversed:
        found.reversed,

      translation:
        found.translation,
    });
  }

  if (
    pairs.length !== 12 ||
    unused.size !== 0
  ) {
    console.warn(
      "Expected 12 cusp edge pairs; derived",
      pairs.length,
      "with",
      unused.size,
      "unpaired material edges."
    );
  }

  return pairs;
}

const CUSP_EDGE_PAIRS =
  deriveCuspEdgePairs();

const CUSP_EDGE_PAIR_BY_MATERIAL_EDGE =
  (() => {
    const lookup =
      new Map();

    CUSP_EDGE_PAIRS.forEach(
      (pair) => {
        lookup.set(
          pair.first.key,
          pair
        );

        lookup.set(
          pair.second.key,
          pair
        );
      }
    );

    return lookup;
  })();

function cuspTubeParameters(point) {
  const coordinates =
    cuspTubeCoordinates(
      point,
      DEFAULT_FIGURE_EIGHT_CUSP_COORDINATE_SPEC
    );

  return {
    routeAmount:
      coordinates.routeAmount,

    minorAmount:
      coordinates.minorAmount,
  };
}

function blendCuspTrianglePoint(
  corners,
  weights
) {
  return {
    x:
      corners[0].x * weights[0] +
      corners[1].x * weights[1] +
      corners[2].x * weights[2],
    y:
      corners[0].y * weights[0] +
      corners[1].y * weights[1] +
      corners[2].y * weights[2],
  };
}

function visuallyInsetCuspTrianglePoint(
  point,
  corners,
  fraction = CUSP_VISUAL_GAP_FRACTION
) {
  const centroid = {
    x:
      (
        corners[0].x +
        corners[1].x +
        corners[2].x
      ) / 3,

    y:
      (
        corners[0].y +
        corners[1].y +
        corners[2].y
      ) / 3,
  };

  return {
    x:
      centroid.x +
      (
        point.x -
        centroid.x
      ) *
        (1 - fraction),

    y:
      centroid.y +
      (
        point.y -
        centroid.y
      ) *
        (1 - fraction),
  };
}

/*
 * Subdivide one logical triangle into divisions²
 * rendering triangles. The returned coordinates are
 * barycentric, so every fine vertex permanently belongs
 * to its original macro-triangle.
 */
function cuspTriangularSubdivision(
  divisions
) {
  const cells = [];

  function weights(row, column) {
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
        weights(
          row,
          column
        );

      const lowerRight =
        weights(
          row + 1,
          column
        );

      const upperLeft =
        weights(
          row,
          column + 1
        );

      cells.push([
        lowerLeft,
        lowerRight,
        upperLeft,
      ]);

      if (
        column <
        divisions - row - 1
      ) {
        const upperRight =
          weights(
            row + 1,
            column + 1
          );

        cells.push([
          lowerRight,
          upperRight,
          upperLeft,
        ]);
      }
    }
  }

  return cells;
}

function wrapUnitInterval(value) {
  return (
    (
      value % 1
    ) + 1
  ) % 1;
}

function buildTube(
  NU = DEFAULT_NU,
  NV = DEFAULT_NV,
  geometry = DEFAULT_GEOMETRY
) {
  return buildFigureEightS3Tube(
    NU,
    NV,
    geometry
  );
}

/*
 * Evaluate an arbitrary material point on exactly the same
 * shared S^3 tube used by the constructor.
 */
function sampleTubePoint4(
  tube,
  routeAmount,
  minorAmount
) {
  return sampleFigureEightS3TubePoint4(
    tube,
    routeAmount,
    minorAmount
  );
}

function cuspMeridianRawPoint(
  amount
) {
  return cuspRawPointFromCoordinates(
    amount,
    CUSP_VISIBLE_MERIDIAN_V
  );
}

function cuspLongitudeRawPoint(
  amount
) {
  /*
   * Unwrapped lift used for the mathematical
   * peripheral-basis certification.
   */
  return cuspRawPointFromCoordinates(
    0.5 +
      FIGURE_EIGHT_CUSP_LONGITUDE_U_SLOPE *
        amount,
    amount
  );
}

function cuspLongitudeDisplayRawPoint(
  amount
) {
  /*
   * Display the same quotient curve inside ONE
   * fundamental cusp domain.
   *
   * The preferred longitude has lift
   *
   *   (U,V) = (1/2 + 2s, s).
   *
   * It crosses the U boundary at s=1/4 and
   * s=3/4, so translate each successive lift
   * back by one U period.
   */
  let displayU =
    0.5 +
      FIGURE_EIGHT_CUSP_LONGITUDE_U_SLOPE *
        amount;

  if (amount > 0.25) {
    displayU -= 1;
  }

  if (amount > 0.75) {
    displayU -= 1;
  }

  return cuspRawPointFromCoordinates(
    displayU,
    amount
  );
}

function cuspLongitudeDisplaySegmentId(
  amount
) {
  if (amount <= 0.25) {
    return 0;
  }

  if (amount <= 0.75) {
    return 1;
  }

  return 2;
}

function point4Distance(
  first,
  second
) {
  return Math.hypot(
    first[0] - second[0],
    first[1] - second[1],
    first[2] - second[2],
    first[3] - second[3]
  );
}

function certifyCuspEdgePairs(
  tube
) {
  let maximumError = 0;
  let closedPairCount = 0;

  const pairErrors =
    CUSP_EDGE_PAIRS.map(
      (pair) => {
        let pairError = 0;

        for (
          let sampleIndex = 0;
          sampleIndex <=
          CUSP_EDGE_CERTIFICATION_SAMPLES;
          sampleIndex += 1
        ) {
          const amount =
            sampleIndex /
            CUSP_EDGE_CERTIFICATION_SAMPLES;

          const secondAmount =
            pair.reversed
              ? 1 - amount
              : amount;

          const firstRaw =
            cuspEdgePoint(
              pair.first,
              amount
            );

          const secondRaw =
            cuspEdgePoint(
              pair.second,
              secondAmount
            );

          const firstParameters =
            cuspTubeParameters(
              firstRaw
            );

          const secondParameters =
            cuspTubeParameters(
              secondRaw
            );

          const firstPoint4 =
            sampleTubePoint4(
              tube,
              firstParameters.routeAmount,
              firstParameters.minorAmount
            );

          const secondPoint4 =
            sampleTubePoint4(
              tube,
              secondParameters.routeAmount,
              secondParameters.minorAmount
            );

          pairError =
            Math.max(
              pairError,
              point4Distance(
                firstPoint4,
                secondPoint4
              )
            );
        }

        maximumError =
          Math.max(
            maximumError,
            pairError
          );

        if (
          pairError <=
          CUSP_EDGE_PAIR_TOLERANCE
        ) {
          closedPairCount += 1;
        }

        return {
          pair,
          error: pairError,
        };
      }
    );

  return {
    pairCount:
      CUSP_EDGE_PAIRS.length,

    closedPairCount,

    maximumError,

    pairErrors,
  };
}

function certifyCuspPeripheralBasis(
  tube
) {
  const meridianStartRaw =
    cuspMeridianRawPoint(0);

  const meridianEndRaw =
    cuspMeridianRawPoint(1);

  const longitudeStartRaw =
    cuspLongitudeRawPoint(0);

  const longitudeEndRaw =
    cuspLongitudeRawPoint(1);

  const meridianStartParameters =
    cuspTubeParameters(
      meridianStartRaw
    );

  const meridianEndParameters =
    cuspTubeParameters(
      meridianEndRaw
    );

  const longitudeStartParameters =
    cuspTubeParameters(
      longitudeStartRaw
    );

  const longitudeEndParameters =
    cuspTubeParameters(
      longitudeEndRaw
    );

  const meridianStart =
    sampleTubePoint4(
      tube,
      meridianStartParameters.routeAmount,
      meridianStartParameters.minorAmount
    );

  const meridianEnd =
    sampleTubePoint4(
      tube,
      meridianEndParameters.routeAmount,
      meridianEndParameters.minorAmount
    );

  const longitudeStart =
    sampleTubePoint4(
      tube,
      longitudeStartParameters.routeAmount,
      longitudeStartParameters.minorAmount
    );

  const longitudeEnd =
    sampleTubePoint4(
      tube,
      longitudeEndParameters.routeAmount,
      longitudeEndParameters.minorAmount
    );

  const meridianError =
    point4Distance(
      meridianStart,
      meridianEnd
    );

  const longitudeError =
    point4Distance(
      longitudeStart,
      longitudeEnd
    );

  /*
   * Raw quotient-coordinate displacement vectors:
   *
   *   m = (1, 0)
   *   l = (2, 1)
   *
   * Their determinant is the algebraic intersection
   * number of these oriented representatives.
   */
  const meridianVector = {
    u: 1,
    v: 0,
  };

  const longitudeVector = {
    u:
      FIGURE_EIGHT_CUSP_LONGITUDE_U_SLOPE,
    v: 1,
  };

  const intersection =
    meridianVector.u *
      longitudeVector.v -
    meridianVector.v *
      longitudeVector.u;

  const meridianClosed =
    meridianError <=
    CUSP_PERIPHERAL_TOLERANCE;

  const longitudeClosed =
    longitudeError <=
    CUSP_PERIPHERAL_TOLERANCE;

  const primitiveBasis =
    Math.abs(intersection) === 1;

  return {
    meridianError,
    longitudeError,
    meridianClosed,
    longitudeClosed,
    intersection,
    primitiveBasis,

    certified:
      meridianClosed &&
      longitudeClosed &&
      primitiveBasis,
  };
}

function rotateMixedPlanes(
  x,
  y,
  z,
  w,
  projection
) {
  return rotateFigureEightS3MixedPlanes(
    x,
    y,
    z,
    w,
    projection
  );
}

function shortestAngleDelta(
  start,
  end
) {
  return (
    ((end - start + 540) % 360) -
    180
  );
}

function shortestRadianDelta(
  start,
  end
) {
  const fullTurn =
    Math.PI * 2;

  return (
    (
      (
        end -
        start +
        Math.PI
      ) %
        fullTurn +
      fullTurn
    ) %
      fullTurn -
    Math.PI
  );
}


function greatestCommonDivisor(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);

  while (y !== 0) {
    const remainder = x % y;
    x = y;
    y = remainder;
  }

  return x || 1;
}

function formatPiAngle(value) {
  if (Math.abs(value) < 0.05) {
    return "0";
  }

  /*
   * Try to recognize a clean rational multiple of pi
   * with denominator <= 24.
   */
  const ratio = value / 180;

  let bestNumerator = 0;
  let bestDenominator = 1;
  let bestError = Infinity;

  for (
    let denominator = 1;
    denominator <= 24;
    denominator += 1
  ) {
    const numerator =
      Math.round(
        ratio * denominator
      );

    const error =
      Math.abs(
        ratio -
        numerator / denominator
      );

    if (error < bestError) {
      bestError = error;
      bestNumerator = numerator;
      bestDenominator = denominator;
    }
  }

  /*
   * A 0.05 degree tolerance recognizes the familiar
   * values generated by our presets and slider.
   */
  const angularError =
    bestError * 180;

  if (angularError <= 0.05) {
    const divisor =
      greatestCommonDivisor(
        bestNumerator,
        bestDenominator
      );

    const numerator =
      bestNumerator / divisor;

    const denominator =
      bestDenominator / divisor;

    if (denominator === 1) {
      if (numerator === 1) {
        return "π";
      }

      if (numerator === -1) {
        return "−π";
      }

      return `${numerator}π`;
    }

    if (numerator === 1) {
      return `π/${denominator}`;
    }

    if (numerator === -1) {
      return `−π/${denominator}`;
    }

    return `${numerator}π/${denominator}`;
  }

  /*
   * Arbitrary slider positions remain in pi units.
   */
  const coefficient =
    ratio.toFixed(2);

  return `${coefficient}π`;
}

export default function FigureEightProjectionLab({
  embedded = false,
  onExit = null,
  controlApiRef = null,
  viewControls = null,
  targetCuspMorph = 1,
  controlsPortalTarget = null,
  statusPortalTarget = null,
  statusRightInset = 10,
  cuspFlatLayout = null,
  cuspFacePairs = null,
  manifoldId = "m004",
  onCuspFlightTargetChange = null,
  presentationOpacity = 1,
}) {
  const canvasRef =
    useRef(null);

  /*
   * Read-only publication of the EXISTING Cusp endpoint.
   * This never participates in rendering.
   */
  const cuspFlightTargetSignatureRef =
    useRef(null);

  const labRef =
    useRef(null);

  const statusRef =
    useRef(null);

  const dragRef =
    useRef(null);

  const animationRef =
    useRef(null);

  const evolveFrameRef =
    useRef(null);

  const evolveLastTimeRef =
    useRef(null);

  const geometryEvolveFrameRef =
    useRef(null);

  const cuspMorphFrameRef =
    useRef(null);

  const geometryEvolveLastTimeRef =
    useRef(null);

  const geometryEvolveDirectionRef =
    useRef({
      lambda: 1,
      epsilon: 1,
      rho: 1,
    });

  const [evolvingAxes, setEvolvingAxes] =
    useState({
      xw: false,
      yw: false,
      zw: false,
    });

  const [evolvingGeometry, setEvolvingGeometry] =
    useState({
      lambda: false,
      epsilon: false,
      rho: false,
    });

  const [geometry, setGeometry] =
    useState({
      ...DEFAULT_GEOMETRY,
    });

  const [meshLevel, setMeshLevel] =
    useState(6);

  const [colorMode, setColorMode] =
    useState("triangles");

  const meshSpec =
    MESH_LEVELS[meshLevel];

  const cuspSurfaceDivisions =
    Math.max(
      4,
      Math.round(
        0.5 *
        Math.sqrt(
          meshSpec.nu *
          meshSpec.nv
        )
      )
    );

  const cuspSurfaceCells =
    useMemo(
      () =>
        cuspTriangularSubdivision(
          cuspSurfaceDivisions
        ),
      [cuspSurfaceDivisions]
    );

  /*
   * FIXED VISIBLE CUSP GEOMETRY.
   *
   * Figure-eight and Sister MUST use the exact same
   * eight-triangle display shape.
   *
   * Manifold-specific information may change:
   *   - which material triangle occupies a slot,
   *   - which material corner maps to which slot corner,
   *   - the resulting single-color edge provenance.
   *
   * It must NEVER change these geometric slot coordinates.
   */
  const cuspMacroTriangles =
    CUSP_MACRO_TRIANGLES;

  const sisterCuspActive =
    manifoldId === "m003";

  const cuspTriangleMaterials =
    useMemo(() => {
      const materials = {};

      for (
        const triangle of
        cuspMacroTriangles
      ) {
        const tetrahedronId =
          triangle.id[0];

        const vertexIndex =
          Number(
            triangle.id.slice(1)
          );

        /*
         * A cusp triangle sits at one ideal vertex.
         * Its canonical material color is the color of
         * the large tetrahedral face opposite that vertex.
         */
        const pair =
          Array.isArray(cuspFacePairs)
            ? cuspFacePairs.find(
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
              )
            : null;

        const color =
          sisterCuspActive
            ? SISTER_CUSP_TRIANGLE_COLORS[
                SISTER_CUSP_MATERIAL_BY_SLOT[
                  triangle.id
                ] ??
                triangle.id
              ] ?? "#ffe600"
            : pair
              ? tetrahedronId === "B"
                ? pair.BColor ??
                  pair.color
                : pair.AColor ??
                  pair.color
              : CUSP_TRIANGLE_COLORS[
                  triangle.id
                ] ?? "#ffe600";

        const match =
          /^#([0-9a-f]{6})$/i.exec(
            color
          );

        const value =
          match
            ? Number.parseInt(
                match[1],
                16
              )
            : null;

        materials[triangle.id] = {
          color,

          rgb:
            value === null
              ? CUSP_TRIANGLE_RGB[
                  triangle.id
                ] ??
                [255, 176, 0]
              : [
                  (value >> 16) & 255,
                  (value >> 8) & 255,
                  value & 255,
                ],
        };
      }

      return materials;
    }, [
      cuspMacroTriangles,
      cuspFacePairs,
      sisterCuspActive,
    ]);

  const tube =
    useMemo(
      () =>
        buildTube(
          meshSpec.nu,
          meshSpec.nv,
          geometry
        ),
      [
        meshSpec.nu,
        meshSpec.nv,
        geometry.lambda,
        geometry.epsilon,
        geometry.rho,
      ]
    );

  const cuspEdgeCertification =
    useMemo(
      () =>
        certifyCuspEdgePairs(
          tube
        ),
      [tube]
    );

  const cuspPeripheralCertification =
    useMemo(
      () =>
        certifyCuspPeripheralBasis(
          tube
        ),
      [tube]
    );

  const [projection, setProjection] =
    useState(SYMMETRIC_PROJECTION);

  const [
    activeProjectionPreset,
    setActiveProjectionPreset,
  ] = useState("symmetric");

  const [viewYaw, setViewYaw] =
    useState(-0.55);

  const [viewPitch, setViewPitch] =
    useState(0.42);

  const [zoom, setZoom] =
    useState(CUSP_DEFAULT_ZOOM);

  const [wireframe, setWireframe] =
    useState(false);

  const [
    showCuspTriangulation,
    setShowCuspTriangulation,
  ] = useState(true);

  const [
    showCuspLabels,
    setShowCuspLabels,
  ] = useState(false);

  const [
    showCuspEdgePairs,
    setShowCuspEdgePairs,
  ] = useState(false);

  const [
    showMeridian,
    setShowMeridian,
  ] = useState(false);

  const [
    showLongitude,
    setShowLongitude,
  ] = useState(false);

  /*
   * 0 = assembled flat eight-triangle cusp
   * 1 = knotted torus
   */
  const [cuspMorph, setCuspMorph] =
    useState(() =>
      targetCuspMorph <= 0 ? 0 : 1
    );

  const [
    capturedPreset,
    setCapturedPreset,
  ] = useState(null);

  const [
    savedProjectionPresets,
    setSavedProjectionPresets,
  ] = useState(
    () => ({
      ...DEFAULT_SAVED_PROJECTION_PRESETS,
    })
  );

  const [
    selectedSavedPresetId,
    setSelectedSavedPresetId,
  ] = useState("symmetric");

  /*
   * Restore user-edited preset slots from this browser.
   *
   * Preset 1 falls back to the checked-in default above until the
   * user explicitly replaces it with Set.
   */
  useEffect(() => {
    try {
      const raw =
        window.localStorage.getItem(
          SAVED_PROJECTION_PRESETS_STORAGE_KEY
        );

      if (!raw) {
        return;
      }

      const stored =
        JSON.parse(raw);

      if (
        !stored ||
        typeof stored !== "object"
      ) {
        return;
      }

      setSavedProjectionPresets(
        (current) => ({
          ...current,

          ...Object.fromEntries(
            Object.keys(
              DEFAULT_SAVED_PROJECTION_PRESETS
            ).map(
              (presetId) => [
                presetId,
                stored[presetId] ??
                  current[presetId],
              ]
            )
          ),
        })
      );
    } catch {
      /*
       * If localStorage is unavailable or contains malformed old
       * data, use the normal in-memory preset defaults.
       */
    }
  }, []);

  const [labHeight, setLabHeight] =
    useState(null);

  const [resizeTick, setResizeTick] =
    useState(0);

  function currentProjectionPresetSnapshot() {
    return {
      manifoldId,

      projectionPreset:
        activeProjectionPreset,

      projection: {
        xw: Number(projection.xw),
        yw: Number(projection.yw),
        zw: Number(projection.zw),
      },

      geometry: {
        lambda: Number(geometry.lambda),
        epsilon: Number(geometry.epsilon),
        rho: Number(geometry.rho),
      },

      view: {
        yaw: Number(viewYaw),
        pitch: Number(viewPitch),
        zoom: Number(zoom),
      },

      layers: {
        colorMode,

        triangles:
          Boolean(
            showCuspTriangulation
          ),

        meridian:
          Boolean(
            showMeridian
          ),

        longitude:
          Boolean(
            showLongitude
          ),

        labels:
          Boolean(
            showCuspLabels
          ),

        edgePairs:
          Boolean(
            showCuspEdgePairs
          ),

        wireframe:
          Boolean(
            wireframe
          ),
      },

      cuspMorph:
        Number(cuspMorph),

      mesh: {
        level:
          meshLevel,

        nu:
          meshSpec.nu,

        nv:
          meshSpec.nv,
      },
    };
  }


  function freezePresetMotion() {
    stopAnimation();
    stopCuspMorphAnimation();

    setEvolvingAxes({
      xw: false,
      yw: false,
      zw: false,
    });

    setEvolvingGeometry({
      lambda: false,
      epsilon: false,
      rho: false,
    });
  }


  function captureCurrentPreset() {
    freezePresetMotion();

    setCapturedPreset(
      currentProjectionPresetSnapshot()
    );
  }


  function setSelectedProjectionPreset() {
    if (!selectedSavedPresetId) {
      return;
    }

    freezePresetMotion();

    const snapshot =
      currentProjectionPresetSnapshot();

    const nextPresets = {
      ...savedProjectionPresets,

      [selectedSavedPresetId]:
        snapshot,
    };

    setSavedProjectionPresets(
      nextPresets
    );

    /*
     * Keep the selected slot highlighted after Set.
     */
    setActiveProjectionPreset(
      null
    );

    setCapturedPreset(
      snapshot
    );

    try {
      window.localStorage.setItem(
        SAVED_PROJECTION_PRESETS_STORAGE_KEY,
        JSON.stringify(
          nextPresets
        )
      );
    } catch {
      /*
       * The preset still works for this browser session even if
       * persistent storage is unavailable.
       */
    }
  }


  function stopAnimation() {
    if (
      animationRef.current !== null
    ) {
      cancelAnimationFrame(
        animationRef.current
      );

      animationRef.current = null;
    }
  }

  function stopEvolution() {
    setEvolvingAxes({
      xw: false,
      yw: false,
      zw: false,
    });
  }

  function normalizeAngle(angle) {
    let value =
      ((angle + 180) % 360 + 360) % 360 - 180;

    if (Math.abs(value + 180) < 1e-9) {
      value = 180;
    }

    return value;
  }

  function projectionSliderAngle(angle) {
    const numeric =
      Number(angle);

    let value =
      ((numeric % 360) + 360) % 360;

    /*
     * Preserve an explicitly selected 2π endpoint instead
     * of immediately displaying it as zero.
     */
    if (
      Math.abs(value) < 1e-9 &&
      numeric > 180
    ) {
      value = 360;
    }

    return value;
  }

  function toggleEvolution(key) {
    stopAnimation();

    setEvolvingAxes(
      (current) => ({
        ...current,
        [key]: !current[key],
      })
    );
  }

  function setProjectionValue(
    key,
    value
  ) {
    stopAnimation();

    setActiveProjectionPreset(null);

    setProjection(
      (current) => ({
        ...current,
        [key]: Number(value),
      })
    );
  }

  function toggleGeometryEvolution(key) {
    setEvolvingGeometry(
      (current) => {
        const willEvolve =
          !current[key];

        if (willEvolve) {
          const range =
            GEOMETRY_RANGES[key];

          /*
           * If we start at the upper boundary,
           * begin by moving downward.
           */
          geometryEvolveDirectionRef.current[key] =
            geometry[key] >=
            range.max - 1e-9
              ? -1
              : 1;
        }

        return {
          ...current,
          [key]: willEvolve,
        };
      }
    );
  }

  function setGeometryValue(
    key,
    rawValue,
    minimum,
    maximum
  ) {
    const numeric =
      Number(rawValue);

    if (!Number.isFinite(numeric)) {
      return;
    }

    const value =
      Math.max(
        minimum,
        Math.min(
          maximum,
          numeric
        )
      );

    setGeometry(
      (current) => ({
        ...current,
        [key]: value,
      })
    );
  }

  function stopCuspMorphAnimation() {
    if (
      cuspMorphFrameRef.current !== null
    ) {
      cancelAnimationFrame(
        cuspMorphFrameRef.current
      );

      cuspMorphFrameRef.current = null;
    }
  }

  function setCuspMorphValue(rawValue) {
    stopCuspMorphAnimation();

    const value =
      Math.max(
        0,
        Math.min(
          1,
          Number(rawValue)
        )
      );

    if (!Number.isFinite(value)) {
      return;
    }

    /*
     * The morph belongs to the eight-triangle
     * representation, so engaging it automatically
     * restores that representation if necessary.
     */
    setShowCuspTriangulation(true);
    setCuspMorph(value);
  }

  function animateCuspMorphTo(
    target,
    duration = CUSP_MORPH_DURATION_MS
  ) {
    stopCuspMorphAnimation();

    setShowCuspTriangulation(true);

    const start =
      cuspMorph;

    const end =
      Math.max(
        0,
        Math.min(
          1,
          target
        )
      );

    const startedAt =
      performance.now();

    function frame(now) {
      const raw =
        Math.min(
          1,
          Math.max(
            0,
            (
              now -
              startedAt
            ) /
              duration
          )
        );

      const eased =
        raw * raw *
        (3 - 2 * raw);

      setCuspMorph(
        start +
        (end - start) *
          eased
      );

      if (raw < 1) {
        cuspMorphFrameRef.current =
          requestAnimationFrame(
            frame
          );
      } else {
        setCuspMorph(end);

        cuspMorphFrameRef.current =
          null;
      }
    }

    cuspMorphFrameRef.current =
      requestAnimationFrame(
        frame
      );
  }

  useEffect(() => {
    animateCuspMorphTo(
      targetCuspMorph <= 0 ? 0 : 1
    );
  }, [targetCuspMorph]);

  /*
   * Screen-space Cusp landing geometry is meaningful ONLY
   * at the completed flat-Cusp endpoint.
   *
   * Never leave an old endpoint visible while the real geometry
   * is morphing through Boundary space.
   */
  useEffect(() => {
    if (
      typeof onCuspFlightTargetChange !==
        "function" ||
      cuspMorph <= 1e-6 ||
      cuspFlightTargetSignatureRef.current ===
        null
    ) {
      return;
    }

    cuspFlightTargetSignatureRef.current =
      null;

    onCuspFlightTargetChange(
      null
    );
  }, [
    cuspMorph,
    onCuspFlightTargetChange,
  ]);

  function rotateView(
    direction
  ) {
    stopAnimation();
    stopEvolution();

    setViewYaw(
      (current) =>
        current +
        direction *
          Math.PI /
          12
    );
  }

  function zoomView(
    direction
  ) {
    stopAnimation();
    stopEvolution();

    const factor =
      direction > 0
        ? 1.12
        : 1 / 1.12;

    setZoom(
      (current) =>
        Math.max(
          0.35,
          Math.min(
            3.5,
            current * factor
          )
        )
    );
  }

  /*
   * Keyboard view controls.
   *
   * Left / Right use frame-based continuous rotation while held,
   * rather than repeating the 15-degree button step.
   *
   * The angular speed matches a 180-degree turn in 10 seconds.
   *
   * Up / Down retain the existing discrete zoom step.
   */
  useEffect(() => {
    const ROTATION_RADIANS_PER_MS =
      Math.PI / 10000;

    let rotationDirection = 0;
    let rotationFrameId = null;
    let previousRotationTime = null;

    let zoomDirection = 0;
    let zoomFrameId = null;
    let previousZoomTime = null;

    function editableTarget(target) {
      return (
        target instanceof
          HTMLInputElement ||
        target instanceof
          HTMLTextAreaElement ||
        target instanceof
          HTMLSelectElement ||
        target?.isContentEditable
      );
    }

    function stopKeyboardRotation() {
      rotationDirection = 0;
      previousRotationTime = null;

      if (rotationFrameId !== null) {
        window.cancelAnimationFrame(
          rotationFrameId
        );

        rotationFrameId = null;
      }
    }

    function animateKeyboardRotation(now) {
      if (rotationDirection === 0) {
        stopKeyboardRotation();
        return;
      }

      if (previousRotationTime !== null) {
        const elapsed =
          Math.min(
            40,
            now - previousRotationTime
          );

        setViewYaw(
          (current) =>
            current +
            rotationDirection *
              ROTATION_RADIANS_PER_MS *
              elapsed
        );
      }

      previousRotationTime = now;

      rotationFrameId =
        window.requestAnimationFrame(
          animateKeyboardRotation
        );
    }

    function beginKeyboardRotation(
      direction
    ) {
      rotationDirection = direction;

      stopAnimation();
      stopEvolution();

      if (rotationFrameId === null) {
        previousRotationTime = null;

        rotationFrameId =
          window.requestAnimationFrame(
            animateKeyboardRotation
          );
      }
    }

    function stopKeyboardZoom() {
      zoomDirection = 0;
      previousZoomTime = null;

      if (zoomFrameId !== null) {
        window.cancelAnimationFrame(
          zoomFrameId
        );

        zoomFrameId = null;
      }
    }

    function animateKeyboardZoom(now) {
      if (zoomDirection === 0) {
        stopKeyboardZoom();
        return;
      }

      if (previousZoomTime !== null) {
        const elapsed =
          Math.min(
            40,
            now - previousZoomTime
          );

        /*
         * Smooth multiplicative equivalent of the existing
         * 1.12 zoom step.
         */
        const factor =
          Math.exp(
            zoomDirection *
              Math.log(1.12) *
              elapsed /
              240
          );

        setZoom(
          (current) =>
            Math.max(
              0.35,
              Math.min(
                3.5,
                current * factor
              )
            )
        );
      }

      previousZoomTime = now;

      zoomFrameId =
        window.requestAnimationFrame(
          animateKeyboardZoom
        );
    }

    function beginKeyboardZoom(
      direction
    ) {
      zoomDirection = direction;

      stopAnimation();
      stopEvolution();

      if (zoomFrameId === null) {
        previousZoomTime = null;

        zoomFrameId =
          window.requestAnimationFrame(
            animateKeyboardZoom
          );
      }
    }

    function handleViewKeyDown(event) {
      if (editableTarget(event.target)) {
        return;
      }

      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();

          if (!event.repeat) {
            beginKeyboardRotation(-1);
          }
          break;

        case "ArrowRight":
          event.preventDefault();

          if (!event.repeat) {
            beginKeyboardRotation(1);
          }
          break;

        case "ArrowUp":
          event.preventDefault();

          if (!event.repeat) {
            beginKeyboardZoom(1);
          }
          break;

        case "ArrowDown":
          event.preventDefault();

          if (!event.repeat) {
            beginKeyboardZoom(-1);
          }
          break;

        default:
          break;
      }
    }

    function handleViewKeyUp(event) {
      if (
        event.key === "ArrowLeft" ||
        event.key === "ArrowRight"
      ) {
        event.preventDefault();
        stopKeyboardRotation();
      }

      if (
        event.key === "ArrowUp" ||
        event.key === "ArrowDown"
      ) {
        event.preventDefault();
        stopKeyboardZoom();
      }
    }

    function handleWindowBlur() {
      stopKeyboardRotation();
      stopKeyboardZoom();
    }

    window.addEventListener(
      "keydown",
      handleViewKeyDown
    );

    window.addEventListener(
      "keyup",
      handleViewKeyUp
    );

    window.addEventListener(
      "blur",
      handleWindowBlur
    );

    return () => {
      stopKeyboardRotation();
      stopKeyboardZoom();

      window.removeEventListener(
        "keydown",
        handleViewKeyDown
      );

      window.removeEventListener(
        "keyup",
        handleViewKeyUp
      );

      window.removeEventListener(
        "blur",
        handleWindowBlur
      );
    };
  }, []);


  function applySavedProjectionPreset(
    presetId
  ) {
    const preset =
      savedProjectionPresets[
        presetId
      ];

    if (
      !preset ||
      preset.manifoldId !==
        manifoldId
    ) {
      return;
    }

    setActiveProjectionPreset(
      null
    );

    animateCompleteProjectionPresetTo(
      preset,
      1800
    );
  }

  function selectSavedProjectionPreset(
    presetId
  ) {
    /*
     * Selection is deliberately separate from ordinary projection
     * preset state. This lets the slot remain highlighted while the
     * user adjusts sliders, rotates the viewer, zooms, etc., before
     * pressing Set.
     */
    setSelectedSavedPresetId(
      presetId
    );

    setActiveProjectionPreset(
      null
    );

    applySavedProjectionPreset(
      presetId
    );
  }


  function resetView() {
    stopAnimation();
    stopEvolution();

    setSelectedSavedPresetId(
      "symmetric"
    );

    setActiveProjectionPreset(
      "symmetric"
    );

    setProjection({
      ...SYMMETRIC_PROJECTION,
    });

    setViewYaw(-0.55);
    setViewPitch(0.42);
    setZoom(CUSP_DEFAULT_ZOOM);
  }

  useEffect(() => {
    if (!controlApiRef) {
      return undefined;
    }

    controlApiRef.current = {
      rotate: rotateView,
      zoom: zoomView,
      reset: resetView,
    };

    return () => {
      controlApiRef.current =
        null;
    };
  }, [controlApiRef]);


  function animateCompleteProjectionPresetTo(
    preset,
    duration = 1800
  ) {
    stopAnimation();
    stopEvolution();
    stopCuspMorphAnimation();

    setEvolvingAxes({
      xw: false,
      yw: false,
      zw: false,
    });

    setEvolvingGeometry({
      lambda: false,
      epsilon: false,
      rho: false,
    });

    const startProjection =
      { ...projection };

    const targetProjection =
      { ...preset.projection };

    const projectionDelta = {
      xw:
        shortestAngleDelta(
          startProjection.xw,
          targetProjection.xw
        ),

      yw:
        shortestAngleDelta(
          startProjection.yw,
          targetProjection.yw
        ),

      zw:
        shortestAngleDelta(
          startProjection.zw,
          targetProjection.zw
        ),
    };

    const startGeometry =
      { ...geometry };

    const targetGeometry =
      { ...preset.geometry };

    const startYaw =
      viewYaw;

    const targetYaw =
      preset.view.yaw;

    const yawDelta =
      shortestRadianDelta(
        startYaw,
        targetYaw
      );

    const startPitch =
      viewPitch;

    const targetPitch =
      preset.view.pitch;

    const startZoom =
      zoom;

    const targetZoom =
      preset.view.zoom;

    const startCuspMorph =
      cuspMorph;

    const targetCuspMorph =
      preset.cuspMorph;


    /*
     * These states are categorical rather than continuous.
     * Install them immediately while the geometric state moves.
     */
    setColorMode(
      preset.layers.colorMode
    );

    setShowCuspTriangulation(
      preset.layers.triangles
    );

    setShowMeridian(
      preset.layers.meridian
    );

    setShowLongitude(
      preset.layers.longitude
    );

    setShowCuspLabels(
      preset.layers.labels
    );

    setShowCuspEdgePairs(
      preset.layers.edgePairs
    );

    setWireframe(
      preset.layers.wireframe
    );

    setMeshLevel(
      preset.mesh.level
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

      const eased =
        u * u *
        (3 - 2 * u);


      /*
       * S³ orientation.
       */
      setProjection({
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


      /*
       * Intrinsic tube geometry.
       */
      setGeometry({
        lambda:
          startGeometry.lambda +
          (
            targetGeometry.lambda -
            startGeometry.lambda
          ) *
            eased,

        epsilon:
          startGeometry.epsilon +
          (
            targetGeometry.epsilon -
            startGeometry.epsilon
          ) *
            eased,

        rho:
          startGeometry.rho +
          (
            targetGeometry.rho -
            startGeometry.rho
          ) *
            eased,
      });


      /*
       * Ordinary 3D camera.
       *
       * Yaw takes the shortest visually equivalent route.
       */
      setViewYaw(
        startYaw +
          yawDelta *
            eased
      );

      setViewPitch(
        startPitch +
          (
            targetPitch -
            startPitch
          ) *
            eased
      );

      setZoom(
        startZoom +
          (
            targetZoom -
            startZoom
          ) *
            eased
      );


      /*
       * Flat Cusp <-> Boundary coordinate.
       */
      setCuspMorph(
        startCuspMorph +
          (
            targetCuspMorph -
            startCuspMorph
          ) *
            eased
      );


      if (u < 1) {
        animationRef.current =
          requestAnimationFrame(
            frame
          );
      } else {
        /*
         * Land on the LITERAL saved values.
         *
         * For yaw, the interpolated endpoint may differ from the
         * stored number by an exact multiple of 2π. That is the same
         * visible orientation. Storing the literal value here keeps
         * the preset exactly reproducible.
         */
        setProjection(
          targetProjection
        );

        setGeometry(
          targetGeometry
        );

        setViewYaw(
          targetYaw
        );

        setViewPitch(
          targetPitch
        );

        setZoom(
          targetZoom
        );

        setCuspMorph(
          targetCuspMorph
        );

        animationRef.current =
          null;
      }
    }


    animationRef.current =
      requestAnimationFrame(
        frame
      );
  }


  function animateProjectionTo(
    target,
    duration = 3200
  ) {
    stopAnimation();
    stopEvolution();

    const start =
      { ...projection };

    const end =
      { ...target };

    const delta = {
      xw:
        shortestAngleDelta(
          start.xw,
          end.xw
        ),
      yw:
        shortestAngleDelta(
          start.yw,
          end.yw
        ),
      zw:
        shortestAngleDelta(
          start.zw,
          end.zw
        ),
    };

    const startTime =
      performance.now();

    function frame(now) {
      const u =
        Math.min(
          1,
          (now - startTime) /
            duration
        );

      const eased =
        u * u * (3 - 2 * u);

      setProjection({
        xw:
          start.xw +
          delta.xw * eased,
        yw:
          start.yw +
          delta.yw * eased,
        zw:
          start.zw +
          delta.zw * eased,
      });

      if (u < 1) {
        animationRef.current =
          requestAnimationFrame(
            frame
          );
      } else {
        setProjection(end);
        animationRef.current =
          null;
      }
    }

    animationRef.current =
      requestAnimationFrame(
        frame
      );
  }

  useEffect(
    () => () => {
      stopAnimation();

      if (
        evolveFrameRef.current !== null
      ) {
        cancelAnimationFrame(
          evolveFrameRef.current
        );
      }

      if (
        geometryEvolveFrameRef.current !==
        null
      ) {
        cancelAnimationFrame(
          geometryEvolveFrameRef.current
        );
      }

      if (
        cuspMorphFrameRef.current !==
        null
      ) {
        cancelAnimationFrame(
          cuspMorphFrameRef.current
        );
      }
    },
    []
  );

  useEffect(() => {
    const anyEvolving =
      evolvingAxes.xw ||
      evolvingAxes.yw ||
      evolvingAxes.zw;

    if (!anyEvolving) {
      if (
        evolveFrameRef.current !== null
      ) {
        cancelAnimationFrame(
          evolveFrameRef.current
        );

        evolveFrameRef.current =
          null;
      }

      evolveLastTimeRef.current =
        null;

      return undefined;
    }

    function frame(now) {
      if (
        evolveLastTimeRef.current ===
        null
      ) {
        evolveLastTimeRef.current =
          now;
      }

      const deltaSeconds =
        Math.min(
          0.1,
          (
            now -
            evolveLastTimeRef.current
          ) / 1000
        );

      evolveLastTimeRef.current =
        now;

      const deltaAngle =
        EVOLVE_SPEED_DEGREES_PER_SECOND *
        deltaSeconds;

      setProjection(
        (current) => ({
          xw:
            evolvingAxes.xw
              ? normalizeAngle(
                  current.xw +
                    deltaAngle
                )
              : current.xw,

          yw:
            evolvingAxes.yw
              ? normalizeAngle(
                  current.yw +
                    deltaAngle
                )
              : current.yw,

          zw:
            evolvingAxes.zw
              ? normalizeAngle(
                  current.zw +
                    deltaAngle
                )
              : current.zw,
        })
      );

      evolveFrameRef.current =
        requestAnimationFrame(
          frame
        );
    }

    evolveFrameRef.current =
      requestAnimationFrame(
        frame
      );

    return () => {
      if (
        evolveFrameRef.current !== null
      ) {
        cancelAnimationFrame(
          evolveFrameRef.current
        );

        evolveFrameRef.current =
          null;
      }

      evolveLastTimeRef.current =
        null;
    };
  }, [evolvingAxes]);

  useEffect(() => {
    const anyEvolving =
      evolvingGeometry.lambda ||
      evolvingGeometry.epsilon ||
      evolvingGeometry.rho;

    if (!anyEvolving) {
      if (
        geometryEvolveFrameRef.current !==
        null
      ) {
        cancelAnimationFrame(
          geometryEvolveFrameRef.current
        );

        geometryEvolveFrameRef.current =
          null;
      }

      geometryEvolveLastTimeRef.current =
        null;

      return undefined;
    }

    const minimumFrameSeconds =
      1 / GEOMETRY_EVOLVE_FPS;

    function frame(now) {
      if (
        geometryEvolveLastTimeRef.current ===
        null
      ) {
        geometryEvolveLastTimeRef.current =
          now;
      }

      const elapsedSeconds =
        (
          now -
          geometryEvolveLastTimeRef.current
        ) / 1000;

      if (
        elapsedSeconds >=
        minimumFrameSeconds
      ) {
        const deltaSeconds =
          Math.min(
            0.12,
            elapsedSeconds
          );

        geometryEvolveLastTimeRef.current =
          now;

        setGeometry(
          (current) => {
            const next = {
              ...current,
            };

            for (
              const key of [
                "lambda",
                "epsilon",
                "rho",
              ]
            ) {
              if (
                !evolvingGeometry[key]
              ) {
                continue;
              }

              const {
                min,
                max,
              } =
                GEOMETRY_RANGES[key];

              const range =
                max - min;

              /*
               * Two traversals make one full cycle:
               * min → max → min.
               */
              const speed =
                (2 * range) /
                GEOMETRY_EVOLVE_FULL_CYCLE_SECONDS;

              let direction =
                geometryEvolveDirectionRef
                  .current[key];

              let value =
                current[key] +
                direction *
                  speed *
                  deltaSeconds;

              /*
               * Reflect at each boundary so the
               * motion remains continuous.
               */
              if (value > max) {
                value =
                  max -
                  (value - max);

                direction = -1;
              }

              if (value < min) {
                value =
                  min +
                  (min - value);

                direction = 1;
              }

              geometryEvolveDirectionRef
                .current[key] =
                direction;

              next[key] =
                Math.max(
                  min,
                  Math.min(
                    max,
                    value
                  )
                );
            }

            return next;
          }
        );
      }

      geometryEvolveFrameRef.current =
        requestAnimationFrame(
          frame
        );
    }

    geometryEvolveFrameRef.current =
      requestAnimationFrame(
        frame
      );

    return () => {
      if (
        geometryEvolveFrameRef.current !==
        null
      ) {
        cancelAnimationFrame(
          geometryEvolveFrameRef.current
        );

        geometryEvolveFrameRef.current =
          null;
      }

      geometryEvolveLastTimeRef.current =
        null;
    };
  }, [evolvingGeometry]);

  useEffect(() => {
    function updateLabHeight() {
      const lab =
        labRef.current;

      if (!lab) {
        return;
      }

      const rect =
        lab.getBoundingClientRect();

      /*
       * Size the ENTIRE laboratory to the remaining
       * browser height. The heading consumes part of
       * this height and the workspace gets the rest.
       */
      const bottomGap = 14;

      const available =
        window.innerHeight -
        rect.top -
        bottomGap;

      setLabHeight(
        Math.max(
          420,
          Math.floor(available)
        )
      );
    }

    updateLabHeight();

    const firstFrame =
      requestAnimationFrame(
        updateLabHeight
      );

    const secondFrame =
      requestAnimationFrame(() =>
        requestAnimationFrame(
          updateLabHeight
        )
      );

    window.addEventListener(
      "resize",
      updateLabHeight
    );

    if (window.visualViewport) {
      window.visualViewport.addEventListener(
        "resize",
        updateLabHeight
      );
    }

    if (document.fonts?.ready) {
      document.fonts.ready.then(
        updateLabHeight
      );
    }

    return () => {
      cancelAnimationFrame(
        firstFrame
      );

      cancelAnimationFrame(
        secondFrame
      );

      window.removeEventListener(
        "resize",
        updateLabHeight
      );

      if (window.visualViewport) {
        window.visualViewport.removeEventListener(
          "resize",
          updateLabHeight
        );
      }
    };
  }, []);

  useEffect(() => {
    const canvas =
      canvasRef.current;

    if (!canvas) {
      return undefined;
    }

    const observer =
      new ResizeObserver(() => {
        setResizeTick(
          (value) => value + 1
        );
      });

    observer.observe(canvas);

    return () =>
      observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas =
      canvasRef.current;

    if (!canvas) {
      return;
    }

    const rect =
      canvas.getBoundingClientRect();

    if (
      rect.width < 2 ||
      rect.height < 2
    ) {
      return;
    }

    const dpr =
      Math.min(
        window.devicePixelRatio || 1,
        2
      );

    const width =
      Math.max(
        1,
        Math.round(
          rect.width * dpr
        )
      );

    const height =
      Math.max(
        1,
        Math.round(
          rect.height * dpr
        )
      );

    if (
      canvas.width !== width ||
      canvas.height !== height
    ) {
      canvas.width = width;
      canvas.height = height;
    }

    const context =
      canvas.getContext("2d");

    context.setTransform(
      dpr,
      0,
      0,
      dpr,
      0,
      0
    );

    const cssWidth =
      rect.width;

    const cssHeight =
      rect.height;

    context.clearRect(
      0,
      0,
      cssWidth,
      cssHeight
    );

    const count =
      tube.vertexCount;

    const projected =
      new Float64Array(
        count * 3
      );

    const valid =
      new Uint8Array(count);

    const radii = [];

    let minimumPoleDistance =
      Infinity;

    for (let i = 0; i < count; i += 1) {
      const qIndex =
        i * 4;

      const rotated =
        rotateMixedPlanes(
          tube.vertices[
            qIndex
          ],
          tube.vertices[
            qIndex + 1
          ],
          tube.vertices[
            qIndex + 2
          ],
          tube.vertices[
            qIndex + 3
          ],
          projection
        );

      const denominator =
        1 - rotated[3];

      minimumPoleDistance =
        Math.min(
          minimumPoleDistance,
          Math.abs(
            denominator
          )
        );

      if (
        Math.abs(
          denominator
        ) < 0.012
      ) {
        continue;
      }

      const x =
        rotated[0] /
        denominator;

      const y =
        rotated[1] /
        denominator;

      const z =
        rotated[2] /
        denominator;

      if (
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        !Number.isFinite(z)
      ) {
        continue;
      }

      const pIndex =
        i * 3;

      projected[pIndex] = x;
      projected[pIndex + 1] = y;
      projected[pIndex + 2] = z;

      valid[i] = 1;

      radii.push(
        Math.hypot(
          x,
          y,
          z
        )
      );
    }

    if (radii.length === 0) {
      if (statusRef.current) {
        const status =
          statusRef.current;

        status.textContent =
          "projection pole intersects tube";

        status.dataset.state =
          "warning";

        status.dataset.tooltip =
          "The stereographic projection pole intersects the tubular surface, so this projection becomes singular.";

        status.style.display =
          "block";
      }

      return;
    }

    radii.sort(
      (a, b) => a - b
    );

    const cutoff =
      radii[
        Math.min(
          radii.length - 1,
          Math.floor(
            radii.length *
              0.985
          )
        )
      ];

    let minX = Infinity;
    let minY = Infinity;
    let minZ = Infinity;

    let maxX = -Infinity;
    let maxY = -Infinity;
    let maxZ = -Infinity;

    for (let i = 0; i < count; i += 1) {
      if (!valid[i]) {
        continue;
      }

      const pIndex =
        i * 3;

      const x =
        projected[pIndex];

      const y =
        projected[pIndex + 1];

      const z =
        projected[pIndex + 2];

      if (
        Math.hypot(
          x,
          y,
          z
        ) >
        cutoff
      ) {
        continue;
      }

      minX = Math.min(
        minX,
        x
      );

      maxX = Math.max(
        maxX,
        x
      );

      minY = Math.min(
        minY,
        y
      );

      maxY = Math.max(
        maxY,
        y
      );

      minZ = Math.min(
        minZ,
        z
      );

      maxZ = Math.max(
        maxZ,
        z
      );
    }

    const centerX =
      (minX + maxX) / 2;

    const centerY =
      (minY + maxY) / 2;

    const centerZ =
      (minZ + maxZ) / 2;

    const view =
      new Float64Array(
        count * 3
      );

    const cosYaw =
      Math.cos(viewYaw);

    const sinYaw =
      Math.sin(viewYaw);

    const cosPitch =
      Math.cos(viewPitch);

    const sinPitch =
      Math.sin(viewPitch);

    minX = Infinity;
    minY = Infinity;
    minZ = Infinity;

    maxX = -Infinity;
    maxY = -Infinity;
    maxZ = -Infinity;

    for (let i = 0; i < count; i += 1) {
      if (!valid[i]) {
        continue;
      }

      const pIndex =
        i * 3;

      const x =
        projected[pIndex] -
        centerX;

      const y =
        projected[
          pIndex + 1
        ] - centerY;

      const z =
        projected[
          pIndex + 2
        ] - centerZ;

      const yawX =
        cosYaw * x +
        sinYaw * z;

      const yawZ =
        -sinYaw * x +
        cosYaw * z;

      const pitchY =
        cosPitch * y -
        sinPitch * yawZ;

      const pitchZ =
        sinPitch * y +
        cosPitch * yawZ;

      view[pIndex] =
        yawX;

      view[pIndex + 1] =
        pitchY;

      view[pIndex + 2] =
        pitchZ;

      if (
        Math.hypot(
          projected[pIndex],
          projected[
            pIndex + 1
          ],
          projected[
            pIndex + 2
          ]
        ) <= cutoff
      ) {
        minX = Math.min(
          minX,
          yawX
        );

        maxX = Math.max(
          maxX,
          yawX
        );

        minY = Math.min(
          minY,
          pitchY
        );

        maxY = Math.max(
          maxY,
          pitchY
        );

        minZ = Math.min(
          minZ,
          pitchZ
        );

        maxZ = Math.max(
          maxZ,
          pitchZ
        );
      }
    }

    const viewCenterX =
      (minX + maxX) / 2;

    const viewCenterY =
      (minY + maxY) / 2;

    const viewCenterZ =
      (minZ + maxZ) / 2;

    const extent =
      Math.max(
        maxX - minX,
        maxY - minY,
        maxZ - minZ,
        1e-6
      );

    const scale =
      (Math.min(
        cssWidth,
        cssHeight
      ) *
        0.82 *
        zoom) /
      extent;

    const cameraDistance =
      extent * 4.5;

    const screen =
      new Float64Array(
        count * 2
      );

    for (let i = 0; i < count; i += 1) {
      if (!valid[i]) {
        continue;
      }

      const pIndex =
        i * 3;

      const x =
        view[pIndex] -
        viewCenterX;

      const y =
        view[pIndex + 1] -
        viewCenterY;

      const z =
        view[pIndex + 2] -
        viewCenterZ;

      const perspective =
        cameraDistance /
        Math.max(
          0.1,
          cameraDistance - z
        );

      screen[i * 2] =
        cssWidth / 2 +
        x *
          scale *
          perspective;

      screen[i * 2 + 1] =
        cssHeight / 2 -
        y *
          scale *
          perspective;
    }

    function projectPoint4ToScreen(
      point4
    ) {
      const rotated =
        rotateMixedPlanes(
          point4[0],
          point4[1],
          point4[2],
          point4[3],
          projection
        );

      const denominator =
        1 - rotated[3];

      if (
        Math.abs(denominator) <
        0.012
      ) {
        return null;
      }

      const projectedX =
        rotated[0] / denominator;

      const projectedY =
        rotated[1] / denominator;

      const projectedZ =
        rotated[2] / denominator;

      if (
        !Number.isFinite(projectedX) ||
        !Number.isFinite(projectedY) ||
        !Number.isFinite(projectedZ)
      ) {
        return null;
      }

      const localX =
        projectedX - centerX;

      const localY =
        projectedY - centerY;

      const localZ =
        projectedZ - centerZ;

      const yawX =
        cosYaw * localX +
        sinYaw * localZ;

      const yawZ =
        -sinYaw * localX +
        cosYaw * localZ;

      const pitchY =
        cosPitch * localY -
        sinPitch * yawZ;

      const pitchZ =
        sinPitch * localY +
        cosPitch * yawZ;

      const x =
        yawX - viewCenterX;

      const y =
        pitchY - viewCenterY;

      const z =
        pitchZ - viewCenterZ;

      const perspective =
        cameraDistance /
        Math.max(
          0.1,
          cameraDistance - z
        );

      return {
        x:
          cssWidth / 2 +
          x *
            scale *
            perspective,
        y:
          cssHeight / 2 -
          y *
            scale *
            perspective,
        depth: z,

        /*
         * Camera-space coordinates are retained so
         * barycentric cusp facets use the same lighting
         * calculation as the original tube facets.
         */
        viewX: x,
        viewY: y,
        viewZ: z,
      };
    }

    function projectCuspMorphPointToScreen(
      rawPoint,
      routeAmount,
      minorAmount
    ) {
      /*
       * Flat fundamental-domain endpoint.
       *
       * This frame is fixed because Figure-eight and Sister
       * must have the exact same visible Cusp shape.
       */
      const flatMaximumSpan =
        5 * CUSP_HEIGHT;

      const flatUnit =
        (
          extent *
          0.82
        ) /
        flatMaximumSpan;

      const flatX =
        centerX +
        (
          rawPoint.x -
          0.75
        ) *
          flatUnit;

      const flatY =
        centerY +
        (
          rawPoint.y +
          CUSP_HEIGHT / 2
        ) *
          flatUnit;

      const flatZ =
        centerZ;

      /*
       * Knot endpoint.
       */
      const point4 =
        sampleTubePoint4(
          tube,
          routeAmount,
          minorAmount
        );

      const rotated =
        rotateMixedPlanes(
          point4[0],
          point4[1],
          point4[2],
          point4[3],
          projection
        );

      const denominator =
        1 - rotated[3];

      /*
       * At the pure flat endpoint the S3 projection
       * does not matter, so the cusp remains available
       * even if the selected stereographic pole happens
       * to intersect the tube.
       */
      let knotX = flatX;
      let knotY = flatY;
      let knotZ = flatZ;

      if (
        Math.abs(denominator) >=
        0.012
      ) {
        knotX =
          rotated[0] /
          denominator;

        knotY =
          rotated[1] /
          denominator;

        knotZ =
          rotated[2] /
          denominator;
      } else if (
        cuspMorph >
        1e-6
      ) {
        return null;
      }

      if (
        !Number.isFinite(knotX) ||
        !Number.isFinite(knotY) ||
        !Number.isFinite(knotZ)
      ) {
        return null;
      }

      /*
       * Same material point at both endpoints.
       *
       * This interpolation changes only the embedding;
       * triangle ID, barycentric address and edge
       * incidence remain unchanged.
       */
      const modelX =
        flatX +
        (
          knotX -
          flatX
        ) *
          cuspMorph;

      const modelY =
        flatY +
        (
          knotY -
          flatY
        ) *
          cuspMorph;

      const modelZ =
        flatZ +
        (
          knotZ -
          flatZ
        ) *
          cuspMorph;

      /*
       * Ordinary 3D camera rotation, shared by both
       * endpoints and every intermediate embedding.
       */
      const localX =
        modelX -
        centerX;

      const localY =
        modelY -
        centerY;

      const localZ =
        modelZ -
        centerZ;

      const yawX =
        cosYaw * localX +
        sinYaw * localZ;

      const yawZ =
        -sinYaw * localX +
        cosYaw * localZ;

      const pitchY =
        cosPitch * localY -
        sinPitch * yawZ;

      const pitchZ =
        sinPitch * localY +
        cosPitch * yawZ;

      const x =
        yawX -
        viewCenterX;

      const y =
        pitchY -
        viewCenterY;

      const z =
        pitchZ -
        viewCenterZ;

      const perspective =
        cameraDistance /
        Math.max(
          0.1,
          cameraDistance - z
        );

      return {
        x:
          cssWidth / 2 +
          x *
            scale *
            perspective,

        y:
          cssHeight / 2 -
          y *
            scale *
            perspective,

        depth: z,

        viewX: x,
        viewY: y,
        viewZ: z,
      };
    }

    /*
     * Report the exact eight triangles of the EXISTING flat Cusp
     * presentation.
     *
     * Nothing here changes their geometry, rendering, lighting,
     * material color, or the Cusp <-> Boundary morph.
     */
    if (
      typeof onCuspFlightTargetChange ===
        "function" &&
      cuspMorph <= 1e-6
    ) {
      const targetTriangles =
        cuspMacroTriangles.map(
          (macroTriangle) => ({
            slotId: macroTriangle.id,

            /*
             * Preserve both:
             *
             *   raw    = exact cusp-strip coordinate
             *   screen = exact browser position currently painted
             *
             * Patch 3 will use these only as landing targets.
             */
            corners:
              macroTriangle.corners.map(
                (rawPoint) => {
                  const {
                    routeAmount,
                    minorAmount,
                  } =
                    cuspTubeParameters(
                      rawPoint
                    );

                  const displayRawPoint =
                    visuallyInsetCuspTrianglePoint(
                      rawPoint,
                      macroTriangle.corners
                    );

                  const point =
                    projectCuspMorphPointToScreen(
                      displayRawPoint,
                      routeAmount,
                      minorAmount
                    );

                  return point
                    ? {
                        raw: {
                          x: rawPoint.x,
                          y: rawPoint.y,
                        },

                        screen: {
                          x:
                            rect.left +
                            point.x,

                          y:
                            rect.top +
                            point.y,
                        },
                      }
                    : null;
                }
              ),
          })
        );

      const complete =
        targetTriangles.every(
          (triangle) =>
            triangle.corners.every(
              Boolean
            )
        );

      if (complete) {
        /*
         * Avoid causing parent rerenders on every canvas redraw
         * when the endpoint has not actually moved.
         */
        const signature =
          targetTriangles
            .flatMap(
              (triangle) => [
                triangle.slotId,

                ...triangle.corners.flatMap(
                  (corner) => [
                    corner.screen.x.toFixed(
                      3
                    ),
                    corner.screen.y.toFixed(
                      3
                    ),
                  ]
                ),
              ]
            )
            .join("|");

        if (
          cuspFlightTargetSignatureRef
            .current !== signature
        ) {
          cuspFlightTargetSignatureRef
            .current = signature;

          onCuspFlightTargetChange({
            rect: {
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height,
            },

            triangles:
              targetTriangles,
          });
        }
      }
    }

    const triangles = [];

    if (!showCuspTriangulation) {
      for (
        let cursor = 0;
        cursor <
        tube.indices.length;
        cursor += 3
      ) {
      const a =
        tube.indices[cursor];

      const b =
        tube.indices[
          cursor + 1
        ];

      const c =
        tube.indices[
          cursor + 2
        ];

      if (
        !valid[a] ||
        !valid[b] ||
        !valid[c]
      ) {
        continue;
      }

      const ai = a * 3;
      const bi = b * 3;
      const ci = c * 3;

      const ax =
        view[ai] -
        viewCenterX;

      const ay =
        view[ai + 1] -
        viewCenterY;

      const az =
        view[ai + 2] -
        viewCenterZ;

      const bx =
        view[bi] -
        viewCenterX;

      const by =
        view[bi + 1] -
        viewCenterY;

      const bz =
        view[bi + 2] -
        viewCenterZ;

      const cx =
        view[ci] -
        viewCenterX;

      const cy =
        view[ci + 1] -
        viewCenterY;

      const cz =
        view[ci + 2] -
        viewCenterZ;

      const ux =
        bx - ax;

      const uy =
        by - ay;

      const uz =
        bz - az;

      const vx =
        cx - ax;

      const vy =
        cy - ay;

      const vz =
        cz - az;

      const nx =
        uy * vz -
        uz * vy;

      const ny =
        uz * vx -
        ux * vz;

      const nz =
        ux * vy -
        uy * vx;

      const normalLength =
        Math.hypot(
          nx,
          ny,
          nz
        ) || 1;

      const light =
        Math.abs(
          (
            nx * -0.32 +
            ny * -0.42 +
            nz * 0.85
          ) /
            normalLength
        );

      const longitudinalIndex =
        Math.floor(
          a / tube.nv
        );

      triangles.push({
        kind: "surface",
        a,
        b,
        c,
        depth:
          (az + bz + cz) /
          3,
        shade:
          72 +
          98 *
            (0.22 +
              0.78 * light),
        hue:
          (
            longitudinalIndex /
            tube.nu
          ) * 360,
      });
      }
    }

    /*
     * Eight-triangle surface representation.
     *
     * These fine facets are generated FROM the eight
     * logical cusp triangles. They are not an overlay
     * on the rectangular tube mesh.
     */
    if (showCuspTriangulation) {
      for (
        const macroTriangle of
        cuspMacroTriangles
      ) {
        for (
          const cell of
          cuspSurfaceCells
        ) {
          const rawPoints =
            cell.map(
              (weights) =>
                blendCuspTrianglePoint(
                  macroTriangle.corners,
                  weights
                )
            );

          const mappedPoints =
            rawPoints.map(
              (rawPoint) => {
                const {
                  routeAmount,
                  minorAmount,
                } =
                  cuspTubeParameters(
                    rawPoint
                  );

                /*
                 * The flat endpoint is painted slightly inset,
                 * producing a narrow gap between logical triangles.
                 *
                 * The tube endpoint still uses the exact canonical
                 * material coordinate above, so the gap disappears
                 * naturally during Cusp -> Boundary.
                 */
                const displayRawPoint =
                  visuallyInsetCuspTrianglePoint(
                    rawPoint,
                    macroTriangle.corners
                  );

                return {
                  rawPoint,
                  routeAmount,
                  minorAmount,
                  projected:
                    projectCuspMorphPointToScreen(
                      displayRawPoint,
                      routeAmount,
                      minorAmount
                    ),
                };
              }
            );

          if (
            mappedPoints.some(
              (point) =>
                !point.projected
            )
          ) {
            continue;
          }

          const first =
            mappedPoints[0].projected;

          const second =
            mappedPoints[1].projected;

          const third =
            mappedPoints[2].projected;

          const ux =
            second.viewX -
            first.viewX;

          const uy =
            second.viewY -
            first.viewY;

          const uz =
            second.viewZ -
            first.viewZ;

          const vx =
            third.viewX -
            first.viewX;

          const vy =
            third.viewY -
            first.viewY;

          const vz =
            third.viewZ -
            first.viewZ;

          const nx =
            uy * vz -
            uz * vy;

          const ny =
            uz * vx -
            ux * vz;

          const nz =
            ux * vy -
            uy * vx;

          const normalLength =
            Math.hypot(
              nx,
              ny,
              nz
            ) || 1;

          const light =
            Math.abs(
              (
                nx * -0.32 +
                ny * -0.42 +
                nz * 0.85
              ) /
              normalLength
            );

          /*
           * Use the barycentric cell centroid to choose
           * the same longitudinal rainbow coordinate as
           * the ordinary tube mesh.
           */
          const centroidRaw = {
            x:
              (
                rawPoints[0].x +
                rawPoints[1].x +
                rawPoints[2].x
              ) / 3,
            y:
              (
                rawPoints[0].y +
                rawPoints[1].y +
                rawPoints[2].y
              ) / 3,
          };

          const {
            routeAmount:
              centroidRoute,
          } =
            cuspTubeParameters(
              centroidRaw
            );

          triangles.push({
            kind: "cusp-surface",
            cuspBaseId:
              macroTriangle.id,
            materialColor:
              cuspTriangleMaterials[
                macroTriangle.id
              ]?.color ?? "#ffe600",

            materialRgb:
              cuspTriangleMaterials[
                macroTriangle.id
              ]?.rgb ?? [255, 176, 0],
            points: [
              first,
              second,
              third,
            ],
            depth:
              (
                first.depth +
                second.depth +
                third.depth
              ) / 3,
            shade:
              72 +
              98 *
                (
                  0.22 +
                  0.78 * light
                ),
            hue:
              wrapUnitInterval(
                centroidRoute
              ) * 360,
          });
        }
      }

      /*
       * Now add only the eight logical triangle
       * boundaries. These are drawn as separate
       * depth-sorted render items over their own
       * barycentric surface.
       */
      for (
        const macroTriangle of
        cuspMacroTriangles
      ) {
        const { corners } =
          macroTriangle;

        for (
          let edgeIndex = 0;
          edgeIndex < 3;
          edgeIndex += 1
        ) {
          const startPoint =
            corners[edgeIndex];

          const endPoint =
            corners[
              (edgeIndex + 1) % 3
            ];

          const materialEdgeKey =
            `${macroTriangle.id}:` +
            `${edgeIndex}`;

          const edgePair =
            CUSP_EDGE_PAIR_BY_MATERIAL_EDGE
              .get(
                materialEdgeKey
              );

          let previous = null;

          for (
            let sampleIndex = 0;
            sampleIndex <=
            CUSP_TRIANGLE_EDGE_SAMPLES;
            sampleIndex += 1
          ) {
            const amount =
              sampleIndex /
              CUSP_TRIANGLE_EDGE_SAMPLES;

            const rawPoint = {
              x:
                startPoint.x +
                (
                  endPoint.x -
                  startPoint.x
                ) *
                  amount,
              y:
                startPoint.y +
                (
                  endPoint.y -
                  startPoint.y
                ) *
                  amount,
            };

            const {
              routeAmount,
              minorAmount,
            } =
              cuspTubeParameters(
                rawPoint
              );

            /*
             * Paint this triangle's edge on the same slightly
             * inset presentation geometry as its filled surface.
             *
             * Each adjacent triangle therefore keeps all three
             * of its own colored edges, with the existing tiny
             * black separation visible between the two colors.
             *
             * routeAmount/minorAmount remain canonical, so the
             * Cusp -> Boundary morph is unchanged.
             */
            const displayRawPoint =
              visuallyInsetCuspTrianglePoint(
                rawPoint,
                corners
              );

            const current =
              projectCuspMorphPointToScreen(
                displayRawPoint,
                routeAmount,
                minorAmount
              );

            if (
              showCuspEdgePairs &&
              edgePair &&
              current &&
              sampleIndex ===
                Math.floor(
                  CUSP_TRIANGLE_EDGE_SAMPLES /
                  2
                )
            ) {
              triangles.push({
                kind:
                  "cusp-edge-label",

                text:
                  edgePair.label,

                pairHue:
                  edgePair.hue,

                x:
                  current.x,

                y:
                  current.y,

                depth:
                  current.depth +
                  extent * 0.0024,
              });
            }

            if (
              previous &&
              current
            ) {
              triangles.push({
                kind: "cusp-edge",

                pairLabel:
                  edgePair?.label ??
                  null,

                pairHue:
                  edgePair?.hue ??
                  null,

                materialEdgeColor:
                  cuspMaterialEdgeColor(
                    manifoldId,
                    macroTriangle.id,
                    edgeIndex
                  ),

                x1: previous.x,
                y1: previous.y,
                x2: current.x,
                y2: current.y,

                /*
                 * Small cameraward bias keeps an edge
                 * visible on its own surface while still
                 * allowing genuinely nearer tube patches
                 * to occlude it.
                 */
                depth:
                  (
                    previous.depth +
                    current.depth
                  ) /
                    2 +
                  extent * 0.0015,
              });
            }

            previous = current;
          }
        }
      }
    }

    /*
     * Material identity labels.
     *
     * Each label is evaluated from the centroid of the
     * same logical cusp triangle, so it follows the same
     * cusp -> knot map as all of that triangle's fine
     * barycentric vertices.
     */
    if (
      showCuspTriangulation &&
      showCuspLabels
    ) {
      for (
        const macroTriangle of
        cuspMacroTriangles
      ) {
        const centroidRaw = {
          x:
            (
              macroTriangle.corners[0].x +
              macroTriangle.corners[1].x +
              macroTriangle.corners[2].x
            ) / 3,

          y:
            (
              macroTriangle.corners[0].y +
              macroTriangle.corners[1].y +
              macroTriangle.corners[2].y
            ) / 3,
        };

        const {
          routeAmount,
          minorAmount,
        } =
          cuspTubeParameters(
            centroidRaw
          );

        const labelPoint =
          projectCuspMorphPointToScreen(
            centroidRaw,
            routeAmount,
            minorAmount
          );

        if (labelPoint) {
          triangles.push({
            kind: "cusp-label",
            text:
              macroTriangle.id,
            x:
              labelPoint.x,
            y:
              labelPoint.y,

            /*
             * Small forward bias puts the label on its
             * own material patch while nearer geometry
             * can still occlude a label on the back.
             */
            depth:
              labelPoint.depth +
              extent * 0.002,
          });
        }
      }
    }

    /*
     * Preferred peripheral basis.
     *
     * These curves are intrinsic material paths on the
     * eight-triangle quotient. They therefore use the
     * exact same cusp -> knot morph as the surface.
     */
    if (
      showCuspTriangulation &&
      (
        showMeridian ||
        showLongitude
      )
    ) {
      const peripheralCurves = [];

      if (showMeridian) {
        peripheralCurves.push({
          kind: "meridian",
          label: "m",
          hue:
            CUSP_MERIDIAN_HUE,
          rawPointAt:
            cuspMeridianRawPoint,
        });
      }

      if (showLongitude) {
        peripheralCurves.push({
          kind: "longitude",
          label: "ℓ",
          hue:
            CUSP_LONGITUDE_HUE,

          rawPointAt:
            cuspLongitudeDisplayRawPoint,

          segmentIdAt:
            cuspLongitudeDisplaySegmentId,
        });
      }

      for (
        const curve of
        peripheralCurves
      ) {
        let previous = null;
        let previousSegmentId =
          null;

        for (
          let sampleIndex = 0;
          sampleIndex <=
          CUSP_PERIPHERAL_CURVE_SAMPLES;
          sampleIndex += 1
        ) {
          const amount =
            sampleIndex /
            CUSP_PERIPHERAL_CURVE_SAMPLES;

          const segmentId =
            curve.segmentIdAt
              ? curve.segmentIdAt(
                  amount
                )
              : 0;

          /*
           * A change of segment means the material
           * curve crossed a boundary of the displayed
           * fundamental domain.
           *
           * Do not draw a Euclidean connector across
           * that cut. The two ends are identified only
           * by the torus quotient.
           */
          if (
            previousSegmentId !==
              null &&
            segmentId !==
              previousSegmentId
          ) {
            previous = null;
          }

          const rawPoint =
            curve.rawPointAt(
              amount
            );

          const {
            routeAmount,
            minorAmount,
          } =
            cuspTubeParameters(
              rawPoint
            );

          const current =
            projectCuspMorphPointToScreen(
              rawPoint,
              routeAmount,
              minorAmount
            );

          if (
            previous &&
            current
          ) {
            triangles.push({
              kind:
                "peripheral-segment",

              cycleKind:
                curve.kind,

              hue:
                curve.hue,

              x1:
                previous.x,

              y1:
                previous.y,

              x2:
                current.x,

              y2:
                current.y,

              /*
               * Lift the material curve slightly toward
               * the camera for painter ordering.
               *
               * This is a rendering offset only. The
               * mathematical curve remains exactly on
               * the torus.
               */
              depth:
                (
                  previous.depth +
                  current.depth
                ) /
                  2 +
                extent * 0.014,
            });
          }

          previous = current;
          previousSegmentId =
            segmentId;
        }
      }
    }

    /*
     * ========================================================
     * SOFTWARE Z-BUFFER
     * ========================================================
     *
     * The old renderer assigned one average depth to each
     * fine facet and used painter sorting. That is ambiguous
     * when two sheets cross or nearly coincide.
     *
     * Surface visibility is now resolved per pixel.
     *
     * The geometric surface itself is unchanged.
     */

    function hslToRgb(
      hueDegrees,
      saturationPercent,
      lightnessPercent
    ) {
      let h =
        (
          (
            hueDegrees % 360
          ) +
          360
        ) %
        360;

      h /= 360;

      const s =
        Math.max(
          0,
          Math.min(
            1,
            saturationPercent /
              100
          )
        );

      const l =
        Math.max(
          0,
          Math.min(
            1,
            lightnessPercent /
              100
          )
        );

      if (s === 0) {
        const gray =
          Math.round(
            l * 255
          );

        return [
          gray,
          gray,
          gray,
        ];
      }

      const q =
        l < 0.5
          ? l * (1 + s)
          : l +
            s -
            l * s;

      const p =
        2 * l - q;

      function channel(offset) {
        let t =
          h + offset;

        if (t < 0) {
          t += 1;
        }

        if (t > 1) {
          t -= 1;
        }

        let value;

        if (t < 1 / 6) {
          value =
            p +
            (
              q - p
            ) *
              6 *
              t;
        } else if (
          t < 1 / 2
        ) {
          value = q;
        } else if (
          t < 2 / 3
        ) {
          value =
            p +
            (
              q - p
            ) *
              (
                2 / 3 -
                t
              ) *
              6;
        } else {
          value = p;
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

    function surfaceTrianglePoints(
      triangle
    ) {
      if (
        triangle.kind ===
        "cusp-surface"
      ) {
        return triangle.points;
      }

      if (
        triangle.kind !==
        "surface"
      ) {
        return null;
      }

      return [
        triangle.a,
        triangle.b,
        triangle.c,
      ].map(
        (vertexIndex) => {
          const screenIndex =
            vertexIndex * 2;

          const viewIndex =
            vertexIndex * 3;

          return {
            x:
              screen[
                screenIndex
              ],

            y:
              screen[
                screenIndex + 1
              ],

            depth:
              view[
                viewIndex + 2
              ] -
              viewCenterZ,
          };
        }
      );
    }

    function litMaterialRgb(
      materialRgb,
      normalizedLight
    ) {
      /*
       * Preserve material hue exactly while restoring the
       * Projection Lab's existing geometric lighting.
       *
       * 0.55 = ambient contribution
       * 0.55 = directional contribution
       *
       * This gives a useful range from 55% brightness on
       * surfaces turned away from the light to 110% on
       * strongly illuminated surfaces.
       */
      const lightFactor =
        0.55 +
        0.55 * normalizedLight;

      return materialRgb.map(
        (channel) =>
          Math.max(
            0,
            Math.min(
              255,
              Math.round(
                channel * lightFactor
              )
            )
          )
      );
    }

    function surfaceTriangleRgb(
      triangle
    ) {
      const shade =
        Math.round(
          triangle.shade
        );

      const normalizedLight =
        Math.max(
          0,
          Math.min(
            1,
            (
              shade - 94
            ) / 76
          )
        );

      const lightness =
        34 +
        normalizedLight * 34;

      if (
        colorMode ===
          "triangles" &&
        triangle.kind ===
          "cusp-surface"
      ) {
        return litMaterialRgb(
          triangle.materialRgb,
          normalizedLight
        );
      }

      if (
        colorMode ===
        "rainbow"
      ) {
        return hslToRgb(
          triangle.hue,
          72,
          lightness
        );
      }

      return [
        shade,
        shade,
        shade,
      ];
    }

    /*
     * We supersample slightly above CSS-pixel resolution.
     * This is enough to keep the material boundaries clean
     * while avoiding the cost of a full DPR=2 software
     * rasterization on every animation frame.
     */
    const zRasterScale =
      Math.min(
        dpr,
        1.25
      );

    const zWidth =
      Math.max(
        1,
        Math.round(
          cssWidth *
          zRasterScale
        )
      );

    const zHeight =
      Math.max(
        1,
        Math.round(
          cssHeight *
          zRasterScale
        )
      );

    /*
     * Reuse the raster buffers across frames. Lambda,
     * epsilon and the S3 rotations can evolve continuously,
     * so avoiding large allocations here matters.
     */
    let zState =
      canvas.__figureEightZBuffer;

    if (
      !zState ||
      zState.width !==
        zWidth ||
      zState.height !==
        zHeight
    ) {
      const surfaceCanvas =
        document.createElement(
          "canvas"
        );

      surfaceCanvas.width =
        zWidth;

      surfaceCanvas.height =
        zHeight;

      const surfaceContext =
        surfaceCanvas.getContext(
          "2d"
        );

      const imageData =
        surfaceContext.createImageData(
          zWidth,
          zHeight
        );

      zState = {
        width:
          zWidth,

        height:
          zHeight,

        canvas:
          surfaceCanvas,

        context:
          surfaceContext,

        imageData,

        depth:
          new Float32Array(
            zWidth *
            zHeight
          ),
      };

      canvas.__figureEightZBuffer =
        zState;
    }

    const zDepth =
      zState.depth;

    const zPixels =
      zState.imageData.data;

    zDepth.fill(
      -Infinity
    );

    zPixels.fill(0);

    /*
     * Under our perspective transform,
     *
     *   perspective =
     *     cameraDistance /
     *     (cameraDistance - z)
     *
     * so 1/(cameraDistance-z) is the useful projective
     * depth quantity. Larger means nearer the camera.
     */
    function cameraDepthKey(
      depth
    ) {
      return (
        1 /
        Math.max(
          0.1,
          cameraDistance -
            depth
        )
      );
    }

    function rasterizeSurfaceTriangle(
      triangle
    ) {
      const points =
        surfaceTrianglePoints(
          triangle
        );

      if (
        !points ||
        points.length !== 3
      ) {
        return;
      }

      const first =
        points[0];

      const second =
        points[1];

      const third =
        points[2];

      if (
        !Number.isFinite(
          first.x
        ) ||
        !Number.isFinite(
          first.y
        ) ||
        !Number.isFinite(
          second.x
        ) ||
        !Number.isFinite(
          second.y
        ) ||
        !Number.isFinite(
          third.x
        ) ||
        !Number.isFinite(
          third.y
        )
      ) {
        return;
      }

      const x0 =
        first.x *
        zRasterScale;

      const y0 =
        first.y *
        zRasterScale;

      const x1 =
        second.x *
        zRasterScale;

      const y1 =
        second.y *
        zRasterScale;

      const x2 =
        third.x *
        zRasterScale;

      const y2 =
        third.y *
        zRasterScale;

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
          zWidth - 1,
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
          zHeight - 1,
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

      const [
        red,
        green,
        blue,
      ] =
        surfaceTriangleRgb(
          triangle
        );

      /*
       * Pixel-center barycentric rasterization.
       *
       * A small negative edge tolerance prevents hairline
       * holes between two facets sharing the same edge.
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
                sampleX -
                x0
              ) *
                (
                  y2 - y0
                ) -
              (
                sampleY -
                y0
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
                  sampleY -
                  y0
                ) -
              (
                y1 - y0
              ) *
                (
                  sampleX -
                  x0
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

          /*
           * Interpolate reciprocal projective depth.
           * This gives the depth test the correct
           * perspective behavior.
           */
          const depth =
            weight0 *
              depth0 +
            weight1 *
              depth1 +
            weight2 *
              depth2;

          const index =
            pixelY *
              zWidth +
            pixelX;

          if (
            depth <
            zDepth[index]
          ) {
            continue;
          }

          zDepth[index] =
            depth;

          const colorIndex =
            index * 4;

          zPixels[
            colorIndex
          ] = red;

          zPixels[
            colorIndex + 1
          ] = green;

          zPixels[
            colorIndex + 2
          ] = blue;

          zPixels[
            colorIndex + 3
          ] = 255;
        }
      }
    }

    for (
      const triangle of
      triangles
    ) {
      if (
        triangle.kind ===
          "surface" ||
        triangle.kind ===
          "cusp-surface"
      ) {
        rasterizeSurfaceTriangle(
          triangle
        );
      }
    }

    zState.context.putImageData(
      zState.imageData,
      0,
      0
    );

    context.save();

    context.imageSmoothingEnabled =
      true;

    context.drawImage(
      zState.canvas,
      0,
      0,
      zWidth,
      zHeight,
      0,
      0,
      cssWidth,
      cssHeight
    );

    context.restore();

    function surfaceDepthAt(
      x,
      y
    ) {
      const pixelX =
        Math.floor(
          x *
          zRasterScale
        );

      const pixelY =
        Math.floor(
          y *
          zRasterScale
        );

      if (
        pixelX < 0 ||
        pixelX >= zWidth ||
        pixelY < 0 ||
        pixelY >= zHeight
      ) {
        return -Infinity;
      }

      return zDepth[
        pixelY *
          zWidth +
        pixelX
      ];
    }

    function pointPassesDepthTest(
      x,
      y,
      depth
    ) {
      const surfaceDepth =
        surfaceDepthAt(
          x,
          y
        );

      if (
        surfaceDepth ===
        -Infinity
      ) {
        return true;
      }

      return (
        cameraDepthKey(
          depth
        ) >=
        surfaceDepth -
          1e-7
      );
    }

    /*
     * Draw a vector segment while consulting the same
     * surface z-buffer. This keeps meridian/longitude
     * hidden behind genuinely nearer branches of the knot.
     */
    function strokeDepthTestedSegment(
      segment,
      strokeStyle,
      lineWidth
    ) {
      const deltaX =
        segment.x2 -
        segment.x1;

      const deltaY =
        segment.y2 -
        segment.y1;

      const length =
        Math.hypot(
          deltaX,
          deltaY
        );

      const steps =
        Math.max(
          1,
          Math.ceil(
            length *
            zRasterScale *
            1.25
          )
        );

      const depthStart =
        segment.depth1 ??
        segment.depth;

      const depthEnd =
        segment.depth2 ??
        segment.depth;

      context.save();

      context.beginPath();

      context.setLineDash([]);

      context.lineCap =
        "round";

      context.lineJoin =
        "round";

      let penDown = false;

      for (
        let index = 0;
        index <= steps;
        index += 1
      ) {
        const amount =
          index / steps;

        const x =
          segment.x1 +
          deltaX *
            amount;

        const y =
          segment.y1 +
          deltaY *
            amount;

        const depth =
          depthStart +
          (
            depthEnd -
            depthStart
          ) *
            amount;

        const visible =
          pointPassesDepthTest(
            x,
            y,
            depth
          );

        if (visible) {
          if (!penDown) {
            context.moveTo(
              x,
              y
            );

            penDown = true;
          } else {
            context.lineTo(
              x,
              y
            );
          }
        } else {
          penDown = false;
        }
      }

      context.strokeStyle =
        strokeStyle;

      context.lineWidth =
        lineWidth;

      context.stroke();

      context.restore();
    }

    triangles.sort(
      (a, b) =>
        a.depth - b.depth
    );

    for (
      const triangle of
      triangles
    ) {
      /*
       * Surface color has already been resolved by the
       * pixel z-buffer above. The painter loop now owns
       * overlays, labels and optional mesh lines only.
       */
      if (
        triangle.kind ===
          "surface" ||
        triangle.kind ===
          "cusp-surface"
      ) {
        if (wireframe) {
          const points =
            surfaceTrianglePoints(
              triangle
            );

          if (points) {
            const edgeIndices = [
              [0, 1],
              [1, 2],
              [2, 0],
            ];

            for (
              const [
                firstIndex,
                secondIndex,
              ] of edgeIndices
            ) {
              const first =
                points[
                  firstIndex
                ];

              const second =
                points[
                  secondIndex
                ];

              strokeDepthTestedSegment(
                {
                  x1:
                    first.x,

                  y1:
                    first.y,

                  x2:
                    second.x,

                  y2:
                    second.y,

                  depth1:
                    first.depth,

                  depth2:
                    second.depth,
                },

                "rgba(255,255,255,0.16)",
                0.45
              );
            }
          }
        }

        continue;
      }

      /*
       * Diagnostic text belongs to a material point too.
       * Suppress a label if another sheet is genuinely
       * in front of that point.
       */
      if (
        (
          triangle.kind ===
            "cusp-label" ||
          triangle.kind ===
            "cusp-edge-label" ||
          triangle.kind ===
            "peripheral-label"
        ) &&
        !pointPassesDepthTest(
          triangle.x,
          triangle.y,
          triangle.depth
        )
      ) {
        continue;
      }

      if (
        triangle.kind ===
        "cusp-label"
      ) {
        const label =
          triangle.text;

        context.save();

        context.font =
          'bold 12px "Times New Roman", Times, serif';

        context.textAlign =
          "center";

        context.textBaseline =
          "middle";

        const metrics =
          context.measureText(
            label
          );

        const paddingX = 4;
        const paddingY = 2;

        const boxWidth =
          metrics.width +
          2 * paddingX;

        const boxHeight = 16;

        context.fillStyle =
          "rgba(15, 15, 17, 0.72)";

        context.fillRect(
          triangle.x -
            boxWidth / 2,
          triangle.y -
            boxHeight / 2,
          boxWidth,
          boxHeight
        );

        context.fillStyle =
          "rgba(255,255,255,0.96)";

        context.fillText(
          label,
          triangle.x,
          triangle.y + 0.25
        );

        context.restore();

        continue;
      }

      if (
        triangle.kind ===
        "peripheral-label"
      ) {
        context.save();

        context.font =
          'bold 13px "Times New Roman", Times, serif';

        context.textAlign =
          "center";

        context.textBaseline =
          "middle";

        const metrics =
          context.measureText(
            triangle.text
          );

        const boxWidth =
          metrics.width + 8;

        const boxHeight = 17;

        context.fillStyle =
          "rgba(10, 10, 12, 0.86)";

        context.fillRect(
          triangle.x -
            boxWidth / 2,
          triangle.y -
            boxHeight / 2,
          boxWidth,
          boxHeight
        );

        context.fillStyle =
          "rgba(255, 255, 255, 0.96)";

        context.fillText(
          triangle.text,
          triangle.x,
          triangle.y + 0.25
        );

        context.restore();

        continue;
      }

      if (
        triangle.kind ===
        "cusp-edge-label"
      ) {
        context.save();

        context.font =
          'bold 10px "Times New Roman", Times, serif';

        context.textAlign =
          "center";

        context.textBaseline =
          "middle";

        const metrics =
          context.measureText(
            triangle.text
          );

        const boxWidth =
          metrics.width + 6;

        const boxHeight = 13;

        context.fillStyle =
          "rgba(12, 12, 14, 0.84)";

        context.fillRect(
          triangle.x -
            boxWidth / 2,
          triangle.y -
            boxHeight / 2,
          boxWidth,
          boxHeight
        );

        context.fillStyle =
          `hsl(${triangle.pairHue}, 88%, 72%)`;

        context.fillText(
          triangle.text,
          triangle.x,
          triangle.y + 0.2
        );

        context.restore();

        continue;
      }

      if (
        triangle.kind ===
        "peripheral-segment"
      ) {
        /*
         * Same two-pass visual treatment as before,
         * now with real surface depth testing.
         */
        strokeDepthTestedSegment(
          triangle,

          "rgba(12, 12, 14, 0.55)",

          triangle.cycleKind ===
            "meridian"
            ? 3.0
            : 2.6
        );

        strokeDepthTestedSegment(
          triangle,

          "rgba(255, 255, 255, 0.98)",

          triangle.cycleKind ===
            "meridian"
            ? 1.8
            : 1.6
        );

        continue;
      }

      if (
        triangle.kind ===
        "cusp-edge"
      ) {
        const cuspEdgeOpacity =
          Math.max(
            0,
            1 - cuspMorph
          );

        /*
         * Keep the material-edge structure visible on
         * the planar cusp, then let it disappear as the
         * surface becomes the knotted torus.
         *
         * These edges now obey the same z-buffer as the
         * underlying material surface.
         */
        if (
          cuspEdgeOpacity >
          0.002
        ) {
          const lineWidth =
            showCuspEdgePairs
              ? 1.55
              : 1.35;

          if (
            showCuspEdgePairs &&
            triangle.pairHue !==
              null
          ) {
            /*
             * Diagnostic edge-pair coloring remains an
             * ordinary visible overlay.
             */
            strokeDepthTestedSegment(
              triangle,
              `hsla(${triangle.pairHue}, 86%, 72%, ${0.98 * cuspEdgeOpacity})`,
              lineWidth
            );
          } else {
            /*
             * Keep the existing separation gap.
             */
            context.save();

            context.globalCompositeOperation =
              "destination-out";

            strokeDepthTestedSegment(
              triangle,
              `rgba(0, 0, 0, ${cuspEdgeOpacity})`,
              lineWidth
            );

            context.restore();

            /*
             * Restore the exact single-color
             * tetrahedral-face provenance.
             */
            if (
              triangle.materialEdgeColor
            ) {
              strokeDepthTestedSegment(
                triangle,
                triangle.materialEdgeColor,
                1.80
              );
            }
          }
        }

        continue;
      }

      const shade =
        Math.round(
          triangle.shade
        );

      context.beginPath();

      if (
        triangle.kind ===
        "cusp-surface"
      ) {
        const [
          first,
          second,
          third,
        ] = triangle.points;

        context.moveTo(
          first.x,
          first.y
        );

        context.lineTo(
          second.x,
          second.y
        );

        context.lineTo(
          third.x,
          third.y
        );
      } else {
        const a =
          triangle.a * 2;

        const b =
          triangle.b * 2;

        const c =
          triangle.c * 2;

        context.moveTo(
          screen[a],
          screen[a + 1]
        );

        context.lineTo(
          screen[b],
          screen[b + 1]
        );

        context.lineTo(
          screen[c],
          screen[c + 1]
        );
      }

      context.closePath();

      const normalizedLight =
        Math.max(
          0,
          Math.min(
            1,
            (shade - 94) / 76
          )
        );

      const lightness =
        34 +
        normalizedLight * 34;

      if (
        colorMode === "triangles" &&
        triangle.kind ===
          "cusp-surface"
      ) {
        const [
          materialRed,
          materialGreen,
          materialBlue,
        ] =
          litMaterialRgb(
            triangle.materialRgb,
            normalizedLight
          );

        context.fillStyle =
          `rgb(${materialRed}, ${materialGreen}, ${materialBlue})`;
      } else if (
        colorMode === "rainbow"
      ) {
        context.fillStyle =
          `hsl(${triangle.hue}, 72%, ${lightness}%)`;
      } else {
        context.fillStyle =
          `rgb(${shade}, ${shade}, ${shade})`;
      }

      context.fill();

      if (wireframe) {
        context.strokeStyle =
          "rgba(255,255,255,0.16)";

        context.lineWidth =
          0.45;

        context.stroke();
      }
    }

    if (statusRef.current) {
      const status =
        statusRef.current;

      const atKnotEndpoint =
        showCuspTriangulation &&
        cuspMorph >=
          1 - 1e-4;

      const edgeStatus =
        `${cuspEdgeCertification.closedPairCount}/` +
        `${cuspEdgeCertification.pairCount} edges`;

      const meridianStatus =
        cuspPeripheralCertification
          .meridianClosed
          ? "m closed"
          : "m OPEN";

      const longitudeStatus =
        cuspPeripheralCertification
          .longitudeClosed
          ? "ℓ closed"
          : "ℓ OPEN";

      const intersectionStatus =
        `m·ℓ=` +
        (
          cuspPeripheralCertification
            .intersection >= 0
            ? "+"
            : ""
        ) +
        cuspPeripheralCertification
          .intersection;

      const certificationStatus =
        cuspPeripheralCertification
          .certified
          ? "basis certified"
          : "basis NOT certified";

      const maximumError =
        Math.max(
          cuspEdgeCertification
            .maximumError,

          cuspPeripheralCertification
            .meridianError,

          cuspPeripheralCertification
            .longitudeError
        );

      const fullStatus =
        `${edgeStatus}` +
        ` · ${meridianStatus}` +
        ` · ${longitudeStatus}` +
        ` · ${intersectionStatus}` +
        ` · ${certificationStatus}` +
        ` · ΔS³ ${maximumError.toExponential(2)}`;

      const edgePairsCertified =
        cuspEdgeCertification
          .closedPairCount ===
        cuspEdgeCertification
          .pairCount;

      const fullyCertified =
        edgePairsCertified &&
        cuspPeripheralCertification
          .certified;

      const nearPole =
        minimumPoleDistance <
        0.025;

      /*
       * Preserve the complete mathematical certification
       * as hover/focus information even though the normal
       * viewer now shows only a compact state badge.
       */
      status.dataset.tooltip =
        fullStatus;

      if (nearPole) {
        status.textContent =
          "near projection pole";

        status.dataset.state =
          "warning";

        status.dataset.tooltip =
          `${fullStatus} · The stereographic projection is approaching its pole, so parts of the image run toward infinity.`;

        status.style.display =
          "block";
      } else if (atKnotEndpoint) {
        status.textContent =
          fullyCertified
            ? "verified"
            : "verification issue";

        status.dataset.state =
          fullyCertified
            ? "verified"
            : "warning";

        status.style.display =
          "block";
      } else {
        /*
         * During the flat cusp and intermediate morph,
         * keep the diagnostic machinery running but do
         * not clutter the public-facing viewer.
         */
        status.textContent = "";
        status.removeAttribute(
          "data-state"
        );
        status.removeAttribute(
          "data-tooltip"
        );
        status.style.display =
          "none";
      }
    }
  }, [
    tube,
    projection,
    viewYaw,
    viewPitch,
    zoom,
    wireframe,
    colorMode,
    showCuspTriangulation,
    showCuspLabels,
    showCuspEdgePairs,
    showMeridian,
    showLongitude,
    cuspMorph,
    cuspSurfaceCells,
    cuspTriangleMaterials,
    onCuspFlightTargetChange,
    resizeTick,
  ]);

  function beginDrag(event) {
    event.currentTarget.setPointerCapture(
      event.pointerId
    );

    dragRef.current = {
      pointerId:
        event.pointerId,
      x: event.clientX,
      y: event.clientY,
      yaw: viewYaw,
      pitch: viewPitch,
    };
  }

  function moveDrag(event) {
    const drag =
      dragRef.current;

    if (
      !drag ||
      drag.pointerId !==
        event.pointerId
    ) {
      return;
    }

    const dx =
      event.clientX -
      drag.x;

    const dy =
      event.clientY -
      drag.y;

    setViewYaw(
      drag.yaw +
        dx * 0.009
    );

    setViewPitch(
      Math.max(
        -Math.PI / 2,
        Math.min(
          Math.PI / 2,
          drag.pitch +
            dy * 0.009
        )
      )
    );
  }

  function endDrag(event) {
    if (
      dragRef.current?.pointerId ===
      event.pointerId
    ) {
      dragRef.current = null;
    }
  }

  function handleWheel(event) {
    event.preventDefault();

    const direction =
      event.deltaY > 0
        ? 0.9
        : 1.1;

    setZoom(
      (current) =>
        Math.max(
          0.35,
          Math.min(
            3.5,
            current *
              direction
          )
        )
    );
  }

  return (
    <section
      ref={labRef}
      className={styles.lab}
      style={
        embedded
          ? {
              width: "100%",
              height: "100%",
              minWidth: 0,
              minHeight: 0,
              margin: 0,
              padding: 0,
              opacity: presentationOpacity,
            }
          : labHeight
            ? {
                height: `${labHeight}px`,
              }
            : undefined
      }
    >
      {!embedded && (
        <div className={styles.heading}>
          <h1>
            Figure-eight S³ projection lab
          </h1>

          <p>
            Follow one eight-triangle cusp from its planar
            assembly into the tubular figure-eight knot in S³.
          </p>
        </div>
      )}

      <div
        className={
          `${styles.workspace} ${
            controlsPortalTarget
              ? styles.workspacePortaled
              : ""
          }`
        }
      >
        <div className={styles.viewer}>
          <canvas
            ref={canvasRef}
            className={styles.canvas}
            onPointerDown={beginDrag}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onWheel={handleWheel}
            aria-label="Interactive stereographic projection of the figure-eight torus"
          />

          <div className={styles.viewerHint}>
            drag to rotate · scroll to zoom
          </div>

          {(() => {
            const statusBadge = (
              <div
                ref={statusRef}
                className={styles.status}
                role="status"
                aria-live="polite"
                tabIndex={0}
                style={{
                  left: "auto",
                  right:
                    `${statusRightInset}px`,
                }}
              />
            );

            return statusPortalTarget
              ? createPortal(
                  statusBadge,
                  statusPortalTarget
                )
              : statusBadge;
          })()}
        </div>

        {(() => {
          const controlsPanel = (
            <div
              className={
                `${styles.controls} ${
                  controlsPortalTarget
                    ? styles.portaledControls
                    : ""
                }`
              }
            >
          {targetCuspMorph > 0 && (
            <>
          <div
            className={
              `${styles.sectionTitle} ${styles.tooltipAnchor}`
            }
            data-tooltip="Stereographic projection maps the compact three-sphere S³ into ordinary ℝ³ by projecting from a chosen pole. The projection pole itself maps to infinity."
            tabIndex={0}
          >
            S³ projection
          </div>

          <div className={styles.projectionPresets}>
            <button
              type="button"
              className={
                selectedSavedPresetId ===
                "symmetric"
                  ? styles.toggleActive
                  : undefined
              }
              onClick={() => {
                setSelectedSavedPresetId(
                  "symmetric"
                );

                if (
                  savedProjectionPresets
                    .symmetric
                ) {
                  applySavedProjectionPreset(
                    "symmetric"
                  );

                  return;
                }

                setActiveProjectionPreset(
                  "symmetric"
                );

                animateProjectionTo(
                  SYMMETRIC_PROJECTION,
                  1800
                );
              }}
            >
              Symmetric
            </button>

            <button
              type="button"
              className={
                selectedSavedPresetId ===
                "standard"
                  ? styles.toggleActive
                  : undefined
              }
              onClick={() => {
                setSelectedSavedPresetId(
                  "standard"
                );

                if (
                  savedProjectionPresets
                    .standard
                ) {
                  applySavedProjectionPreset(
                    "standard"
                  );

                  return;
                }

                setActiveProjectionPreset(
                  "standard"
                );

                animateProjectionTo(
                  STANDARD_PROJECTION,
                  1800
                );
              }}
            >
              Standard
            </button>

            <button
              type="button"
              className={
                selectedSavedPresetId ===
                "offset"
                  ? styles.toggleActive
                  : undefined
              }
              onClick={() => {
                setSelectedSavedPresetId(
                  "offset"
                );

                if (
                  savedProjectionPresets
                    .offset
                ) {
                  applySavedProjectionPreset(
                    "offset"
                  );

                  return;
                }

                setActiveProjectionPreset(
                  "offset"
                );

                animateProjectionTo(
                  {
                    xw: projection.xw,
                    yw: 45,
                    zw: 90,
                  },
                  1800
                );
              }}
            >
              <span className={styles.presetFraction}>
                <span className={styles.presetFractionTop}>π</span>
                <span className={styles.presetFractionBottom}>4</span>
              </span>
              <span className={styles.presetOffsetWord}>offset</span>
            </button>

            {Array.from(
              { length: 6 },
              (_, index) => {
                const presetId =
                  `preset${index + 1}`;

                const preset =
                  savedProjectionPresets[
                    presetId
                  ];

                const selected =
                  selectedSavedPresetId ===
                    presetId;

                const availableHere =
                  !preset ||
                  preset.manifoldId ===
                    manifoldId;

                return (
                  <button
                    key={
                      presetId
                    }
                    type="button"
                    className={
                      selected
                        ? styles.toggleActive
                        : undefined
                    }
                    title={
                      !preset
                        ? `Select empty Preset ${index + 1} slot`
                        : availableHere
                          ? `Restore Preset ${index + 1}`
                          : `Preset ${index + 1} belongs to the other manifold; select it and press Set to replace it`
                    }
                    onClick={() =>
                      selectSavedProjectionPreset(
                        presetId
                      )
                    }
                  >
                    Preset {index + 1}
                  </button>
                );
              }
            )}
          </div>

          <div className={styles.compactSliderGroup}>
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
              ([
                key,
                label,
                tooltip,
              ]) => (
              <div
                key={key}
                className={
                  styles.projectionSliderRow
                }
              >
                <span
                  className={
                    `${styles.compactLabel} ${styles.tooltipAnchor}`
                  }
                  data-tooltip={tooltip}
                  tabIndex={0}
                >
                  {label}
                </span>

                <div
                  className={
                    styles.projectionRangeWrap
                  }
                >
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="0.5"
                    value={
                      projectionSliderAngle(
                        projection[key]
                      )
                    }
                    onChange={(event) =>
                      setProjectionValue(
                        key,
                        event.target.value
                      )
                    }
                    aria-label={
                      `${label} projection angle`
                    }
                  />

                  <div
                    className={
                      styles.projectionTicks
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
                    styles.projectionAngleIndicator
                  }
                  role="img"
                  aria-label={
                    `${label} angle ${formatPiAngle(
                      projectionSliderAngle(
                        projection[key]
                      )
                    )}`
                  }
                  title={
                    formatPiAngle(
                      projectionSliderAngle(
                        projection[key]
                      )
                    )
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
                        styles.angleGuideCircle
                      }
                      cx="18"
                      cy="18"
                      r="13"
                    />

                    <g
                      className={
                        styles.angleReferenceArrow
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
                        styles.angleCurrentArrow
                      }
                      transform={
                        `rotate(${
                          -projectionSliderAngle(
                            projection[key]
                          )
                        } 18 18)`
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
                        styles.angleOrigin
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
                    evolvingAxes[key]
                      ? styles.evolveButtonActive
                      : styles.evolveButton
                  }
                  onClick={() =>
                    toggleEvolution(key)
                  }
                >
                  {evolvingAxes[key]
                    ? "stop"
                    : "evolve"}
                </button>
              </div>
              )
            )}
          </div>

          <div className={styles.sectionTitle}>
            Geometry
          </div>

          <div className={styles.compactSliderGroup}>
            {[
              {
                key: "lambda",
                label: "λ",
                min: 0.14,
                max: 1,
                step: 0.01,
                tooltip:
                  "Core-shape parameter controlling the harmonic mixture that forms the figure-eight curve. Changing λ changes the actual shape of the core in S³.",
              },
              {
                key: "epsilon",
                label: "ε",
                min: 0.14,
                max: 0.50,
                step: 0.01,
                tooltip:
                  "Fourth-coordinate excursion amplitude. It controls how strongly the figure-eight core moves into the w direction of S³.",
              },
              {
                key: "rho",
                label: "ρ",
                min: 0.07,
                max: 0.21,
                step: 0.005,
                tooltip:
                  "Geodesic radius of the tubular neighborhood around the figure-eight core in S³. Larger ρ makes the tube intrinsically thicker before projection.",
              },
            ].map(
              ({
                key,
                label,
                min,
                max,
                step,
                tooltip,
              }) => (
                <div
                  key={key}
                  className={
                    styles.geometrySliderRow
                  }
                >
                  <span
                    className={
                      `${styles.geometryLabel} ${styles.tooltipAnchor}`
                    }
                    data-tooltip={tooltip}
                    tabIndex={0}
                  >
                    {label}
                  </span>

                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={geometry[key]}
                    onChange={(event) =>
                      setGeometryValue(
                        key,
                        event.target.value,
                        min,
                        max
                      )
                    }
                    aria-label={
                      `${label} slider`
                    }
                  />

                  <input
                    className={
                      styles.geometryValueInput
                    }
                    type="number"
                    min={min}
                    max={max}
                    step={step}
                    value={geometry[key]}
                    onChange={(event) =>
                      setGeometryValue(
                        key,
                        event.target.value,
                        min,
                        max
                      )
                    }
                    aria-label={
                      `${label} value`
                    }
                  />

                  <button
                    type="button"
                    className={
                      evolvingGeometry[key]
                        ? styles.evolveButtonActive
                        : styles.evolveButton
                    }
                    onClick={() =>
                      toggleGeometryEvolution(
                        key
                      )
                    }
                  >
                    {evolvingGeometry[key]
                      ? "stop"
                      : "evolve"}
                  </button>
                </div>
              )
            )}
          </div>
            </>
          )}

          <div className={styles.sectionTitle}>
            Layers
          </div>

          <div
            className={
              styles.displayButtons
            }
          >
            <button
              type="button"
              className={
                colorMode ===
                "triangles"
                  ? styles.toggleActive
                  : undefined
              }
              onClick={() => {
                setShowCuspTriangulation(
                  true
                );

                setColorMode(
                  "triangles"
                );
              }}
            >
              Triangles
            </button>

            <button
              type="button"
              className={
                colorMode === "rainbow"
                  ? styles.toggleActive
                  : undefined
              }
              onClick={() =>
                setColorMode(
                  "rainbow"
                )
              }
            >
              Rainbow
            </button>

            <button
              type="button"
              className={
                showMeridian
                  ? styles.toggleActive
                  : undefined
              }
              onClick={() =>
                setShowMeridian(
                  (current) =>
                    !current
                )
              }
            >
              Meridian
            </button>

            <button
              type="button"
              className={
                showLongitude
                  ? styles.toggleActive
                  : undefined
              }
              onClick={() =>
                setShowLongitude(
                  (current) =>
                    !current
                )
              }
            >
              Longitude
            </button>
          </div>

          {viewControls && (
            <div
              style={{
                width: "100%",
                display: "grid",
                gap: "6px",
                marginTop: "8px",
              }}
            >
              {viewControls}
            </div>
          )}

            </div>
          );

          return controlsPortalTarget
            ? createPortal(
                controlsPanel,
                controlsPortalTarget
              )
            : controlsPanel;
        })()}
      </div>
    </section>
  );
}
