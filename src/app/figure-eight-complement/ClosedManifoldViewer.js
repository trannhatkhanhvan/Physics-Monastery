"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import styles from "./ClosedManifoldViewer.module.css";
import TruncatedTetrahedraViewer, {
  CUSP_MESH_FACE_STEP,
  CYCLIC_FACE_MAPPING_CHOICES,
  DEFAULT_CUSP_MESH_FACE_COUNT,
  FACE_MAPPING_DURATION_MS,
  DEFAULT_TRUNCATION_FRACTION,
  FIGURE_EIGHT_FACE_PAIRS,
  MANIFOLD_SPECS,
  cuspMaterialLayoutForManifold,
  MAX_CUSP_MESH_FACE_COUNT,
  MAX_TRUNCATION_FRACTION,
  MIN_CUSP_MESH_FACE_COUNT,
  MIN_TRUNCATION_FRACTION,
  SEAM_TRANSITION_DURATION_MS,
} from "./TruncatedTetrahedraViewer";
import FigureEightProjectionLab from "./projection-lab/FigureEightProjectionLab";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function meshFaceCountFromSliderPosition(
  position
) {
  const amount =
    clamp(
      Number(position),
      0,
      1
    );

  const rawFaceCount =
    MIN_CUSP_MESH_FACE_COUNT *
    Math.pow(
      MAX_CUSP_MESH_FACE_COUNT /
        MIN_CUSP_MESH_FACE_COUNT,
      amount
    );

  return clamp(
    Math.round(
      rawFaceCount /
        CUSP_MESH_FACE_STEP
    ) *
      CUSP_MESH_FACE_STEP,
    MIN_CUSP_MESH_FACE_COUNT,
    MAX_CUSP_MESH_FACE_COUNT
  );
}

function meshSliderPositionFromFaceCount(
  faceCount
) {
  const normalizedFaceCount =
    clamp(
      Number(faceCount),
      MIN_CUSP_MESH_FACE_COUNT,
      MAX_CUSP_MESH_FACE_COUNT
    );

  return (
    Math.log(
      normalizedFaceCount /
        MIN_CUSP_MESH_FACE_COUNT
    ) /
    Math.log(
      MAX_CUSP_MESH_FACE_COUNT /
        MIN_CUSP_MESH_FACE_COUNT
    )
  );
}

function formatMeshFaceCount(faceCount) {
  return Math.round(
    faceCount
  ).toLocaleString("en-US");
}

/*
 * Authoritative face labels shown in the Cells / Cusp controller.
 *
 * These are DISPLAY labels only. They do not alter the underlying
 * tetrahedral face arrays, face-pair identifications, mappings,
 * colors, or animation geometry.
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

function faceDisplayVertexTriple(
  manifoldId,
  color,
  tetrahedronId = "A"
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
    ] ??
    ""
  );
}

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

/*
 * m003 fixed Cusp placement.
 *
 * The visible eight-slot geometry is identical to m004.
 * What changes is which m003 material triangle occupies each slot.
 *
 * Fixed geometric slot order:
 *   A0, B0, B3, A3, A2, B1, A1, B2
 *
 * Canonical m003 cusp traversal:
 *   A0, B1, A2, B0, A1, B2, B3, A3
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

function cuspDisplayEdgeColor(
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

function colorWithAlpha(
  color,
  alpha
) {
  const match =
    /^#([0-9a-f]{6})$/i.exec(
      color ?? ""
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

const IDENTITY_ROTATION = [
  1, 0, 0,
  0, 1, 0,
  0, 0, 1,
];

/*
 * ============================================================
 * OPENING VIEW SCALE
 * ============================================================
 *
 * These are the three simple knobs for the initial appearance
 * of the 1D, 2D, and 3D viewers.
 *
 *   1.00 = current baseline size
 *   1.10 = 10% larger
 *   0.90 = 10% smaller
 *
 * 1D and 2D use these as their viewer-scale multipliers.
 *
 * 3D uses OPENING_SCALE_3D as the preferred visual occupancy
 * for the automatic camera. The opening tetrahedra establish
 * that scale, and later construction stages preserve it while
 * geometry-driven Auto Fit follows their changing bounds.
 */

const OPENING_SCALE_1D = 3.00;
const OPENING_SCALE_2D = 2.70;
const OPENING_SCALE_3D = 0.75;

const DEFAULT_VIEW = {
  rotation: IDENTITY_ROTATION,

  /*
   * Shared underlying camera zoom.
   * Fine-tune the three dimensional views with the scale knobs
   * immediately above.
   */
  zoom: 0.32,
};


function viewWithOpeningScale(
  view,
  openingScale
) {
  return {
    ...view,

    zoom:
      view.zoom *
      openingScale,
  };
}

const DRAG_ROTATION_SPEED = 0.006;
/*
 * The construction now passes through geometries whose projected
 * extent differs by several times:
 *
 *   compact tetrahedra
 *   -> long bridges
 *   -> extended cusp development
 *   -> cylinder
 *   -> figure-eight tube.
 *
 * Auto-fit therefore needs substantially more zoom-out range than
 * the original compact viewer allowed.
 */
const MIN_ZOOM = 0.045;
const MAX_ZOOM = 1.9;

const AUTO_ROTATION_HALF_TURN_MS = 10000;
const ROTATION_SINGLE_CLICK_DELAY_MS = 280;

const CLOSED_MANIFOLD_DIMENSION_STORAGE_KEY =
  "physics-monastery:closed-manifold-dimension";

const CLOSED_MANIFOLD_SCENE_STORAGE_KEY =
  "physics-monastery:closed-manifold-scene";

const CLOSED_MANIFOLD_DIMENSION_COOKIE_KEY =
  "physics_monastery_closed_manifold_dimension";

function isClosedManifoldDimension(value) {
  return (
    value === "1D" ||
    value === "2D" ||
    value === "3D"
  );
}

function writeClosedManifoldDimensionCookie(value) {
  document.cookie =
    `${CLOSED_MANIFOLD_DIMENSION_COOKIE_KEY}=` +
    `${value}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

function lerp(a, b, amount) {
  return a + (b - a) * amount;
}

function lerpPoint(a, b, amount) {
  return {
    x: lerp(a.x, b.x, amount),
    y: lerp(a.y, b.y, amount),
    z: lerp(a.z, b.z, amount),
  };
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

function rotationZ(angle) {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);

  return [
    cosine, -sine, 0,
    sine, cosine, 0,
    0, 0, 1,
  ];
}

function multiplyRotations(left, right) {
  const result = new Array(9);

  for (let row = 0; row < 3; row += 1) {
    for (
      let column = 0;
      column < 3;
      column += 1
    ) {
      result[row * 3 + column] =
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

function useAnimatedProgress(target, duration = 1000) {
  const [value, setValue] = useState(target);
  const valueRef = useRef(target);

  useEffect(() => {
    const startValue = valueRef.current;
    const startedAt = performance.now();
    let frameId;

    function animate(now) {
      const raw = clamp((now - startedAt) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - raw, 3);
      const nextValue = lerp(startValue, target, eased);

      valueRef.current = nextValue;
      setValue(nextValue);

      if (raw < 1) {
        frameId = requestAnimationFrame(animate);
      }
    }

    frameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frameId);
  }, [target, duration]);

  return value;
}

function pathFromPoints(points) {
  return points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`
    )
    .join(" ");
}

function RotationArrowIcon({ clockwise = false }) {
  return (
    <svg
      className={styles.rotationArrowIcon}
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

function normalizedMappingIndex(value) {
  const choiceCount =
    CYCLIC_FACE_MAPPING_CHOICES.length;

  const integer =
    Number.isFinite(value)
      ? Math.round(value)
      : 0;

  return (
    (
      integer %
      choiceCount
    ) +
    choiceCount
  ) %
  choiceCount;
}

function nearestMappingIndicatorTurn(
  currentTurn,
  targetIndex
) {
  const choiceCount =
    CYCLIC_FACE_MAPPING_CHOICES.length;

  const normalizedTarget =
    normalizedMappingIndex(
      targetIndex
    );

  const baseMultiple =
    Math.round(
      (
        currentTurn -
        normalizedTarget
      ) /
      choiceCount
    );

  const candidates = [
    normalizedTarget +
      (
        baseMultiple - 1
      ) *
        choiceCount,
    normalizedTarget +
      baseMultiple *
        choiceCount,
    normalizedTarget +
      (
        baseMultiple + 1
      ) *
        choiceCount,
  ];

  return candidates.reduce(
    (best, candidate) =>
      Math.abs(
        candidate -
        currentTurn
      ) <
      Math.abs(
        best -
        currentTurn
      )
        ? candidate
        : best,
    candidates[0]
  );
}

function FaceMappingAngleIndicator({
  mappingIndex,
  pairLabel,
}) {
  const normalizedIndex =
    normalizedMappingIndex(
      mappingIndex
    );

  const turnRef =
    useRef(normalizedIndex);

  const [
    displayedTurn,
    setDisplayedTurn,
  ] = useState(normalizedIndex);

  useEffect(() => {
    const nextTurn =
      nearestMappingIndicatorTurn(
        turnRef.current,
        normalizedIndex
      );

    turnRef.current = nextTurn;
    setDisplayedTurn(nextTurn);
  }, [normalizedIndex]);

  const mappingChoice =
    CYCLIC_FACE_MAPPING_CHOICES[
      normalizedIndex
    ] ??
    CYCLIC_FACE_MAPPING_CHOICES[0];

  return (
    <span
      role="img"
      aria-label={`${pairLabel} vertex map ${mappingChoice.label}`}
      title={`${mappingChoice.label} vertex map`}
      style={{
        display: "inline-grid",
        flex: "none",
        width: "28px",
        height: "24px",
        placeItems: "center",
        color: "currentColor",
        pointerEvents: "none",
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width="24"
        height="24"
        aria-hidden="true"
        focusable="false"
        shapeRendering="geometricPrecision"
      >
        <g
          opacity="0.26"
          fill="currentColor"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line
            x1="12"
            y1="12"
            x2="20"
            y2="12"
            strokeWidth="1.5"
          />
          <path
            d="M 20.5 12 L 16.7 9.45 L 16.7 14.55 Z"
            stroke="none"
          />
        </g>

        <g
          style={{
            transform:
              `rotate(${displayedTurn * -120}deg)`,
            transformBox:
              "view-box",
            transformOrigin:
              "12px 12px",
            transition:
              `transform ${FACE_MAPPING_DURATION_MS}ms cubic-bezier(0.33, 1, 0.68, 1)`,
          }}
          fill="rgba(255, 255, 255, 0.96)"
          stroke="rgba(255, 255, 255, 0.96)"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line
            x1="12"
            y1="12"
            x2="20"
            y2="12"
            strokeWidth="1.8"
          />
          <path
            d="M 20.5 12 L 16.5 9.3 L 16.5 14.7 Z"
            stroke="none"
          />
        </g>

        <circle
          cx="12"
          cy="12"
          r="1.35"
          fill="rgba(255, 255, 255, 0.96)"
        />
      </svg>
    </span>
  );
}

const INTERVAL_LINE_LENGTH = 580;
const INTERVAL_CIRCLE_RADIUS = 205;
const INTERVAL_LINE_Y = -15;
const INTERVAL_CIRCLE_BOTTOM_Y = -205;
const INTERVAL_GEOMETRY_EPSILON = 1e-7;

function intervalGeometryPoint(
  progress,
  parameter
) {
  const amount = clamp(
    progress,
    0,
    1
  );

  /*
   * Increase the arc length while bending so the
   * final circle retains the viewer's existing size.
   * The curve itself is always one circular arc.
   */
  const arcLength = lerp(
    INTERVAL_LINE_LENGTH,
    Math.PI *
      2 *
      INTERVAL_CIRCLE_RADIUS,
    amount
  );

  const angleSpan =
    Math.PI * 2 * amount;

  /*
   * Exact straight-line limit. This avoids dividing
   * by the vanishing angle at the initial frame.
   */
  if (
    angleSpan <
    INTERVAL_GEOMETRY_EPSILON
  ) {
    return {
      x:
        (
          parameter -
          0.5
        ) *
        arcLength,
      y: INTERVAL_LINE_Y,
      z: 0,
    };
  }

  const radius =
    arcLength /
    angleSpan;

  const angle =
    (
      parameter -
      0.5
    ) *
    angleSpan;

  /*
   * For every angleSpan below 2π this is an injective
   * circular arc. Only the two endpoints coincide at
   * the completed 2π circle.
   */
  return {
    x:
      radius *
      Math.sin(angle),
    y:
      lerp(
        INTERVAL_LINE_Y,
        INTERVAL_CIRCLE_BOTTOM_Y,
        amount
      ) +
      radius *
        (
          1 -
          Math.cos(angle)
        ),
    z: 0,
  };
}

function IntervalViewer({ identified, view }) {
  const progress = useAnimatedProgress(
    identified ? 1 : 0,
    1200
  );

  const points = useMemo(() => {
    const count = 160;

    return Array.from(
      { length: count },
      (_, index) => {
        const parameter =
          index /
          (count - 1);

        return projectPoint(
          intervalGeometryPoint(
            progress,
            parameter
          ),
          view
        );
      }
    );
  }, [progress, view]);

  const start = points[0];
  const end =
    points[
      points.length - 1
    ];

  return (
    <svg
      viewBox="0 0 1000 700"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="A line segment that bends into a circle without self-intersection"
    >
      <path
        d={pathFromPoints(points)}
        className={styles.primaryCurve}
      />

      <circle
        cx={start.x}
        cy={start.y}
        r="4.5"
        className={styles.endpoint}
      />

      <circle
        cx={end.x}
        cy={end.y}
        r="4.5"
        className={styles.endpoint}
      />

      <text
        x={start.x - 4}
        y={start.y - 24}
        className={styles.svgLabel}
      >
        A
      </text>

      <text
        x={end.x - 4}
        y={end.y - 24}
        className={styles.svgLabel}
      >
        A
      </text>
    </svg>
  );
}

const SHEET_SPAN = 440;
const CYLINDER_LENGTH = 430;
const CYLINDER_RADIUS = 145;
const TORUS_MAJOR_RADIUS = 190;
const TORUS_MINOR_RADIUS = 82;
const GEOMETRY_EPSILON = 1e-7;

function orientIdentificationGeometry(
  firstPair,
  point
) {
  if (firstPair === "orange") {
    return point;
  }

  /*
   * For blue-first construction, exchange the
   * canonical axial and transverse screen axes.
   *
   * At zero progress this still gives:
   *   x = sheet u coordinate
   *   y = sheet v coordinate
   */
  return {
    x: point.y,
    y: point.x,
    z: point.z,
  };
}

function rollSheetIntoCylinder(
  firstPair,
  progress,
  u,
  v
) {
  const amount = clamp(progress, 0, 1);

  const axialParameter =
    firstPair === "orange"
      ? u - 0.5
      : v - 0.5;

  const wrappedParameter =
    firstPair === "orange"
      ? v - 0.5
      : u - 0.5;

  /*
   * The sheet stretches smoothly to the chosen
   * cylinder dimensions while it rolls.
   */
  const axialLength = lerp(
    SHEET_SPAN,
    CYLINDER_LENGTH,
    amount
  );

  const wrappedLength = lerp(
    SHEET_SPAN,
    Math.PI *
      2 *
      CYLINDER_RADIUS,
    amount
  );

  const angleSpan =
    Math.PI * 2 * amount;

  let canonicalPoint;

  if (angleSpan < GEOMETRY_EPSILON) {
    canonicalPoint = {
      x: axialParameter * axialLength,
      y: wrappedParameter * wrappedLength,
      z: 0,
    };
  } else {
    const radius =
      wrappedLength / angleSpan;

    const angle =
      wrappedParameter * angleSpan;

    canonicalPoint = {
      x: axialParameter * axialLength,
      y: radius * Math.sin(angle),

      /*
       * This translation keeps the sheet centered
       * at z = 0 initially and gives a cylinder
       * centered at z = 0 when amount reaches 1.
       */
      z:
        radius *
          (Math.cos(angle) - 1) +
        amount * CYLINDER_RADIUS,
    };
  }

  return orientIdentificationGeometry(
    firstPair,
    canonicalPoint
  );
}

function bendCylinderIntoTorus(
  firstPair,
  progress,
  u,
  v
) {
  const amount = clamp(progress, 0, 1);

  const axialParameter =
    firstPair === "orange"
      ? u - 0.5
      : v - 0.5;

  const wrappedParameter =
    firstPair === "orange"
      ? v - 0.5
      : u - 0.5;

  const wrappedAngle =
    Math.PI *
    2 *
    wrappedParameter;

  const minorRadius = lerp(
    CYLINDER_RADIUS,
    TORUS_MINOR_RADIUS,
    amount
  );

  const bendAngleSpan =
    Math.PI * 2 * amount;

  const axialLength = lerp(
    CYLINDER_LENGTH,
    Math.PI *
      2 *
      TORUS_MAJOR_RADIUS,
    amount
  );

  let canonicalPoint;

  if (
    bendAngleSpan <
    GEOMETRY_EPSILON
  ) {
    canonicalPoint = {
      x: axialParameter * axialLength,
      y:
        minorRadius *
        Math.sin(wrappedAngle),
      z:
        minorRadius *
        Math.cos(wrappedAngle),
    };
  } else {
    /*
     * The cylinder axis becomes a circular arc.
     *
     * Its bending radius remains greater than the
     * tube radius throughout the deformation, so
     * the surface remains embedded.
     */
    const bendRadius =
      axialLength / bendAngleSpan;

    const bendAngle =
      axialParameter *
      bendAngleSpan;

    const centerX =
      bendRadius *
      Math.sin(bendAngle);

    const centerZ =
      bendRadius *
        (1 - Math.cos(bendAngle)) -
      amount * TORUS_MAJOR_RADIUS;

    /*
     * Unit normal to the bent centerline in the
     * x-z bending plane.
     */
    const normalX =
      -Math.sin(bendAngle);

    const normalZ =
      Math.cos(bendAngle);

    const radialOffset =
      minorRadius *
      Math.cos(wrappedAngle);

    canonicalPoint = {
      x:
        centerX +
        radialOffset * normalX,

      y:
        minorRadius *
        Math.sin(wrappedAngle),

      z:
        centerZ +
        radialOffset * normalZ,
    };
  }

  return orientIdentificationGeometry(
    firstPair,
    canonicalPoint
  );
}

function ordersMatch(left, right) {
  return (
    left.length === right.length &&
    left.every(
      (entry, index) =>
        entry === right[index]
    )
  );
}

function identificationGeometryPoint(
  fromOrder,
  toOrder,
  progress,
  u,
  v
) {
  const amount = clamp(progress, 0, 1);

  const fromCount = fromOrder.length;
  const toCount = toOrder.length;

  if (ordersMatch(fromOrder, toOrder)) {
    if (toCount === 0) {
      return rollSheetIntoCylinder(
        "orange",
        0,
        u,
        v
      );
    }

    if (toCount === 1) {
      return rollSheetIntoCylinder(
        toOrder[0],
        1,
        u,
        v
      );
    }

    return bendCylinderIntoTorus(
      toOrder[0],
      1,
      u,
      v
    );
  }

  /*
   * Add the first identification:
   * flat sheet -> cylinder.
   */
  if (
    fromCount === 0 &&
    toCount === 1
  ) {
    return rollSheetIntoCylinder(
      toOrder[0],
      amount,
      u,
      v
    );
  }

  /*
   * Undo the first identification:
   * cylinder -> flat sheet.
   */
  if (
    fromCount === 1 &&
    toCount === 0
  ) {
    return rollSheetIntoCylinder(
      fromOrder[0],
      1 - amount,
      u,
      v
    );
  }

  /*
   * Add the second identification:
   * cylinder -> torus.
   */
  if (
    fromCount === 1 &&
    toCount === 2
  ) {
    return bendCylinderIntoTorus(
      fromOrder[0],
      amount,
      u,
      v
    );
  }

  /*
   * Undo the second identification:
   * torus -> cylinder.
   */
  if (
    fromCount === 2 &&
    toCount === 1
  ) {
    return bendCylinderIntoTorus(
      toOrder[0],
      1 - amount,
      u,
      v
    );
  }

  /*
   * Reset from torus to flat sheet through the
   * cylinder, rather than interpolating directly
   * through space.
   */
  if (
    fromCount === 2 &&
    toCount === 0
  ) {
    const firstPair = fromOrder[0];

    if (amount < 0.5) {
      return bendCylinderIntoTorus(
        firstPair,
        1 - amount * 2,
        u,
        v
      );
    }

    return rollSheetIntoCylinder(
      firstPair,
      2 - amount * 2,
      u,
      v
    );
  }

  /*
   * Defensive forward route in case both
   * identifications are ever applied together.
   */
  if (
    fromCount === 0 &&
    toCount === 2
  ) {
    const firstPair = toOrder[0];

    if (amount < 0.5) {
      return rollSheetIntoCylinder(
        firstPair,
        amount * 2,
        u,
        v
      );
    }

    return bendCylinderIntoTorus(
      firstPair,
      amount * 2 - 1,
      u,
      v
    );
  }

  /*
   * Changing which pair was applied first is not
   * part of the current interface. Route through
   * the flat sheet defensively if it occurs.
   */
  if (
    fromCount === 1 &&
    toCount === 1
  ) {
    if (amount < 0.5) {
      return rollSheetIntoCylinder(
        fromOrder[0],
        1 - amount * 2,
        u,
        v
      );
    }

    return rollSheetIntoCylinder(
      toOrder[0],
      amount * 2 - 1,
      u,
      v
    );
  }

  return bendCylinderIntoTorus(
    toOrder[0] ??
      fromOrder[0] ??
      "orange",
    toCount === 2 ? 1 : 0,
    u,
    v
  );
}

function viewForMode(mode) {
  return mode === "flat"
    ? { yaw: 0, pitch: 0 }
    : { yaw: -0.72, pitch: 0.52 };
}

function projectPoint(point, view) {
  const rotated = applyRotation(
    point,
    view.rotation
  );

  const perspective =
    1 / (1 + rotated.z / 950);

  const scale =
    perspective * view.zoom;

  return {
    x: 500 + rotated.x * scale,
    y: 350 - rotated.y * scale,
  };
}

function modeFromOrder(order) {
  if (order.length === 0) {
    return "flat";
  }

  if (order.length === 2) {
    return "torus";
  }

  return order[0] === "orange"
    ? "cylinder-orange"
    : "cylinder-blue";
}

function TorusViewer({ order, view }) {
  const previousOrderRef = useRef(order);

  const [transition, setTransition] =
    useState({
      fromOrder: order,
      toOrder: order,
      progress: 1,
    });

  useEffect(() => {
    const fromOrder =
      previousOrderRef.current;

    const toOrder = order;

    previousOrderRef.current =
      toOrder;

    if (
      ordersMatch(
        fromOrder,
        toOrder
      )
    ) {
      return;
    }

    setTransition({
      fromOrder,
      toOrder,
      progress: 0,
    });

    const startedAt =
      performance.now();

    let frameId;

    function animate(now) {
      const raw = clamp(
        (now - startedAt) / 1150,
        0,
        1
      );

      const eased =
        1 - Math.pow(1 - raw, 3);

      setTransition({
        fromOrder,
        toOrder,
        progress: eased,
      });

      if (raw < 1) {
        frameId =
          requestAnimationFrame(
            animate
          );
      }
    }

    frameId =
      requestAnimationFrame(
        animate
      );

    return () =>
      cancelAnimationFrame(frameId);
  }, [order]);

  function mappedPoint(u, v) {
    const point =
      identificationGeometryPoint(
        transition.fromOrder,
        transition.toOrder,
        transition.progress,
        u,
        v
      );

    const fromMode =
      modeFromOrder(
        transition.fromOrder
      );

    const toMode =
      modeFromOrder(
        transition.toOrder
      );

    const fromView =
      viewForMode(fromMode);

    const toView =
      viewForMode(toMode);

    const yaw = lerp(
      fromView.yaw,
      toView.yaw,
      transition.progress
    );

    const pitch = lerp(
      fromView.pitch,
      toView.pitch,
      transition.progress
    );

    const modeRotation =
      rotationFromYawPitch(
        yaw,
        pitch
      );

    return projectPoint(point, {
      /*
       * Apply the construction's automatic viewing
       * orientation first, then the user's current
       * screen-relative orientation.
       */
      rotation: multiplyRotations(
        view.rotation,
        modeRotation
      ),
      zoom: view.zoom,
    });
  }

  const gridLines = useMemo(() => {
    const lines = [];
    const divisions = 20;

    for (let index = 0; index <= divisions; index += 1) {
      const u = index / divisions;

      lines.push(
        Array.from(
          { length: divisions + 1 },
          (_, pointIndex) =>
            mappedPoint(u, pointIndex / divisions)
        )
      );
    }

    for (let index = 0; index <= divisions; index += 1) {
      const v = index / divisions;

      lines.push(
        Array.from(
          { length: divisions + 1 },
          (_, pointIndex) =>
            mappedPoint(pointIndex / divisions, v)
        )
      );
    }

    return lines;
  }, [transition, view]);

  const seams = useMemo(() => {
    function buildLine(kind, fixedValue) {
      return Array.from({ length: 120 }, (_, index) => {
        const t = index / 119;

        return kind === "horizontal"
          ? mappedPoint(t, fixedValue)
          : mappedPoint(fixedValue, t);
      });
    }

    return {
      orangeA: buildLine("horizontal", 0),
      orangeB: buildLine("horizontal", 1),
      blueA: buildLine("vertical", 0),
      blueB: buildLine("vertical", 1),
    };
  }, [transition, view]);

  function polyline(points) {
    return points
      .map((point) => `${point.x},${point.y}`)
      .join(" ");
  }

  return (
    <svg
      viewBox="0 0 1000 700"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="A square whose opposite edge identifications animate through a cylinder into a torus"
    >
      {gridLines.map((line, index) => (
        <polyline
          key={index}
          points={polyline(line)}
          className={styles.gridLine}
        />
      ))}

      <polyline
        points={polyline(seams.orangeA)}
        className={styles.orangeSeam}
      />

      <polyline
        points={polyline(seams.orangeB)}
        className={styles.orangeSeam}
      />

      <polyline
        points={polyline(seams.blueA)}
        className={styles.blueSeam}
      />

      <polyline
        points={polyline(seams.blueB)}
        className={styles.blueSeam}
      />
    </svg>
  );
}

export default function ClosedManifoldViewer({
  embedded = false,
  initialDimension = null,
  titleHref = null,
}) {
  const [dimension, setDimension] = useState(
    isClosedManifoldDimension(initialDimension)
      ? initialDimension
      : "1D"
  );

  /*
   * The standalone figure-eight-complement page supplies its
   * saved dimension from the request cookie, so the first
   * rendered frame is already correct.
   *
   * This fallback migrates an older localStorage-only setting
   * into the cookie if necessary.
   */
  useEffect(() => {
    if (
      isClosedManifoldDimension(
        initialDimension
      )
    ) {
      return;
    }

    try {
      const storedDimension =
        window.localStorage.getItem(
          CLOSED_MANIFOLD_DIMENSION_STORAGE_KEY
        );

      if (
        isClosedManifoldDimension(
          storedDimension
        )
      ) {
        setDimension(
          storedDimension
        );

        try {
          writeClosedManifoldDimensionCookie(
            storedDimension
          );
        } catch {
          /*
           * The viewer remains usable if cookies are disabled.
           */
        }
      }
    } catch {
      /*
       * Storage can be unavailable in restrictive browser
       * modes. In that case retain the 1D default.
       */
    }
  }, [initialDimension]);

  const [intervalIdentified, setIntervalIdentified] =
    useState(false);
  const [torusOrder, setTorusOrder] = useState([]);

  /*
   * The controller owns manifold selection.
   *
   * m004 remains the only available manifold for now, so this
   * structural parameterization must not alter the current
   * figure-eight construction visually.
   */
  const [
    activeManifoldId,
    setActiveManifoldId,
  ] = useState("m004");

  const activeManifold =
    MANIFOLD_SPECS[activeManifoldId] ??
    MANIFOLD_SPECS.m004;

  const activeFacePairs =
    activeManifold.facePairs ??
    FIGURE_EIGHT_FACE_PAIRS;

  /*
   * Cusp development and peripheral identification are separate
   * capabilities. The sister has a verified canonical cusp development,
   * while its preferred meridian/longitude basis remains unassigned.
   */
  const manifoldCuspConstructionAvailable =
    activeManifold.cuspAvailable !== false;

  const peripheralConstructionAvailable =
    activeManifold.peripheralAvailable !== false;

  const [facePairSequence, setFacePairSequence] =
    useState([]);
  const [
    collapsedBridgePairIds,
    setCollapsedBridgePairIds,
  ] = useState([]);
  const [
    seamTransitioning,
    setSeamTransitioning,
  ] = useState(false);
  const [
    activeMappingPairId,
    setActiveMappingPairId,
  ] = useState(null);
  const [
    facePairMappingIndices,
    setFacePairMappingIndices,
  ] = useState(
    () =>
      activeFacePairs.map(
        () => 0
      )
  );
  const cuspConstructionAvailable =
    manifoldCuspConstructionAvailable;

  const [showInterior, setShowInterior] =
    useState(false);

  /*
   * Direct authoritative completed-geometry selector.
   *
   * Boundary selects the already-loaded constructive m004 boundary
   * directly. No Pachner, local-replay, edge-split, or
   * compactification animation state is involved.
   */
  const [
    constructiveFinalDisplayActive,
    setConstructiveFinalDisplayActive,
  ] = useState(false);

  const [showCuspTriangles, setShowCuspTriangles] =
    useState(false);
  const [extendCusp, setExtendCusp] =
    useState(false);
  const [assembleCusp, setAssembleCusp] =
    useState(false);
  const [cuspWrapOrder, setCuspWrapOrder] =
    useState([]);
  const [
    projectionActive,
    setProjectionActive,
  ] = useState(false);

  const [
    projectionMode,
    setProjectionMode,
  ] = useState("boundary");

  const [
    projectionCenterMorphActive,
    setProjectionCenterMorphActive,
  ] = useState(false);

  const projectionCenterMorphTimerRef =
    useRef(null);

  function stopProjectionCenterMorph() {
    if (
      projectionCenterMorphTimerRef.current !==
      null
    ) {
      window.clearTimeout(
        projectionCenterMorphTimerRef.current
      );

      projectionCenterMorphTimerRef.current =
        null;
    }

    setProjectionCenterMorphActive(false);
  }

  function beginProjectionCenterMorph() {
    if (
      projectionCenterMorphTimerRef.current !==
      null
    ) {
      window.clearTimeout(
        projectionCenterMorphTimerRef.current
      );
    }

    setProjectionCenterMorphActive(true);

    projectionCenterMorphTimerRef.current =
      window.setTimeout(() => {
        projectionCenterMorphTimerRef.current =
          null;

        setProjectionCenterMorphActive(false);
      }, 2800);
  }

  /*
   * Remember only which 3D scene the visitor was viewing.
   *
   * Camera, projection angles, zoom, morph progress, etc. are
   * deliberately NOT persisted. Therefore a browser reload from
   * Cusp or Boundary returns to that scene's clean reset state.
   */
  useLayoutEffect(() => {
    if (
      dimension !== "3D" ||
      typeof window === "undefined"
    ) {
      return;
    }

    const navigationEntry =
      window.performance
        ?.getEntriesByType?.("navigation")
        ?.[0];

    if (
      navigationEntry?.type !== "reload"
    ) {
      return;
    }

    let storedScene = null;

    try {
      storedScene =
        window.sessionStorage.getItem(
          CLOSED_MANIFOLD_SCENE_STORAGE_KEY
        );
    } catch {
      return;
    }

    if (storedScene === "cusp") {
      setProjectionMode("cusp");
      setProjectionActive(true);
      return;
    }

    if (
      storedScene === "boundary"
    ) {
      setProjectionMode("boundary");
      setProjectionActive(true);
      return;
    }

    setProjectionActive(false);
  }, []);

  function rememberClosedManifoldScene(
    scene
  ) {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.sessionStorage.setItem(
        CLOSED_MANIFOLD_SCENE_STORAGE_KEY,
        scene
      );
    } catch {
      /*
       * Scene persistence is optional. The viewer still works
       * normally if browser storage is unavailable.
       */
    }
  }

  const [
    truncationFraction,
    setTruncationFraction,
  ] = useState(
    DEFAULT_TRUNCATION_FRACTION
  );

  /*
   * The mesh slider is logarithmic because its range spans
   * 288 -> 288^2 facets. The slider value moves live, while
   * the expensive surface rebuild commits only when the drag
   * ends (or a keyboard adjustment is released).
   */
  const [
    cuspMeshFaceCount,
    setCuspMeshFaceCount,
  ] = useState(
    DEFAULT_CUSP_MESH_FACE_COUNT
  );

  const [
    meshSliderPosition,
    setMeshSliderPosition,
  ] = useState(
    () =>
      meshSliderPositionFromFaceCount(
        DEFAULT_CUSP_MESH_FACE_COUNT
      )
  );

  const pendingCuspMeshFaceCount =
    meshFaceCountFromSliderPosition(
      meshSliderPosition
    );

  const commitCuspMeshFaceCount =
    useCallback(
      () =>
        setCuspMeshFaceCount(
          pendingCuspMeshFaceCount
        ),
      [pendingCuspMeshFaceCount]
    );

  const [viewTransform, setViewTransform] = useState(() => ({
    ...DEFAULT_VIEW,
  }));
  const [
    autoFit3D,
    setAutoFit3D,
  ] = useState(true);

  /*
   * A fresh 3D page render needs one geometry measurement before
   * its correct fitted zoom is known.
   *
   * Do not show the temporary DEFAULT_VIEW frame during that one
   * measurement pass. Reveal the scene only after the first real
   * fit has been installed.
   */
  const initial3DFrameResolvedRef =
    useRef(false);

  const [
    initial3DFrameReady,
    setInitial3DFrameReady,
  ] = useState(false);

  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef(null);

  /*
   * Pointer-move events can arrive substantially faster than the
   * browser can paint the 3D scene.
   *
   * Keep drag input continuous, but commit at most one React
   * camera update per animation frame. This prevents pointer
   * event bursts from producing a nested update-depth cascade.
   */
  const dragRotationFrameRef =
    useRef(null);

  const pendingDragRotationRef =
    useRef(null);

  /*
   * Cells uses its ordinary status box as the interaction cue
   * when the screen is first entered. This avoids rendering a
   * second competing readout at the bottom-left.
   */
  const [
    cellsEntryHintVisible,
    setCellsEntryHintVisible,
  ] = useState(false);

  const viewerRef = useRef(null);
  const canvasRef = useRef(null);
  const [
    resetSceneVersion,
    setResetSceneVersion,
  ] = useState(0);
  const identificationControlsRef =
    useRef(null);

  const projectionLabControlRef =
    useRef(null);

  /*
   * When Cusp / Boundary is active, the Projection Lab keeps
   * ownership of its controls but renders them into the main
   * right-hand controller.
   */
  const [
    projectionControlsHost,
    setProjectionControlsHost,
  ] = useState(null);

  /*
   * Projection Lab status badges render into the OUTER viewer.
   *
   * This lets them use the true bottom-right corner whenever
   * the controller is not physically occupying that area.
   */
  const [
    projectionStatusHost,
    setProjectionStatusHost,
  ] = useState(null);

  const [
    projectionStatusRightInset,
    setProjectionStatusRightInset,
  ] = useState(10);

  const facePairButtonRefs =
    useRef([]);
  const [
    mappingPopoverPosition,
    setMappingPopoverPosition,
  ] = useState(null);

  const [
    faceConstructionState,
    setFaceConstructionState,
  ] = useState(null);

  const handleConstructionStateChange =
    useCallback(
      (nextState) => {
        setFaceConstructionState(
          (currentState) => {
            if (
              currentState === nextState
            ) {
              return currentState;
            }

            if (
              currentState === null ||
              nextState === null
            ) {
              return nextState;
            }

            if (
              currentState.status ===
                nextState.status &&
              currentState.detail ===
                nextState.detail &&
              currentState.accent ===
                nextState.accent &&
              currentState.textAccent ===
                nextState.textAccent
            ) {
              return currentState;
            }

            return nextState;
          }
        );
      },
      []
    );

  const [
    autoRotationDirection,
    setAutoRotationDirection,
  ] = useState(0);

  const rotationClickTimerRef = useRef(null);
  const seamTransitionTimerRef = useRef(null);

  /*
   * Figure-eight <-> Sister corollary switch.
   *
   * If face rows are already identified, first let the current
   * manifold retract to separated Cells. Then switch manifolds
   * and replay those SAME row IDs in the new manifold.
   *
   * This avoids inventing a direct interpolation between two
   * different gluing geometries.
   */
  const manifoldCorollarySwitchTimerRef =
    useRef(null);

  const manifoldCorollaryRotationFrameRef =
    useRef(null);

  const [
    manifoldCorollaryRotation,
    setManifoldCorollaryRotation,
  ] = useState(null);

  const MANIFOLD_COROLLARY_RETRACT_MS =
    1850;

  /*
   * Yellow does not unglue during a manifold comparison.
   * It rotates directly from one existing glued correspondence
   * to the other.
   */
  const MANIFOLD_COROLLARY_ROTATION_MS =
    FACE_MAPPING_DURATION_MS;

  /*
   * Direct Cusp <-> Cells material flight.
   *
   * The existing Projection Lab Cusp and existing Cells renderer
   * remain the two endpoint scenes.
   *
   * Only eight copied cusp triangles move.
   */
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

  /*
   * The same geometric interpolation runs in both directions:
   *
   *   0 = existing Cusp
   *   1 = current Cells truncation faces
   */
  const [
    cuspFlightDirection,
    setCuspFlightDirection,
  ] = useState(null);

  /*
   * Screen-normal rotation of every moving material triangle.
   *
   * Forward:
   *   0 -> +5 -> -10 -> +30 -> 0 while flying.
   *
   * Reverse:
   *   the exact same path in reverse time.
   */
  const [
    cuspFlightTwistDegrees,
    setCuspFlightTwistDegrees,
  ] = useState(0);

  /*
   * During Cusp -> Cells, the Cells renderer must already exist
   * so it can report the exact truncation-face coordinates.
   *
   * Keep it geometrically live but visually hidden until the
   * moving triangles have reached those faces and rested there
   * for 100 ms.
   */
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

  const cuspFlightFrameRef =
    useRef(null);

  const cuspFlightLandingTimerRef =
    useRef(null);

  const activeCuspMaterialLayout =
    useMemo(
      () =>
        cuspMaterialLayoutForManifold(
          activeManifoldId,
          facePairMappingIndices
        ),
      [
        activeManifoldId,
        facePairMappingIndices,
      ]
    );

  const handleCuspFlightSourceChange =
    useCallback(
      (nextSource) => {
        /*
         * Cells continuously publishes its latest exact screen-space
         * geometry so a future Cusp transition can start from the
         * current view.
         *
         * This is measurement data, not live presentation state.
         * Keep it in the ref only. The transition-start code already
         * copies this exact snapshot into cuspFlightSource state when
         * a flight actually begins.
         *
         * Calling setCuspFlightSource here created a child-effect ->
         * parent-render -> child-effect feedback path during animated
         * seam updates.
         */
        cuspFlightSourceRef.current =
          nextSource;
      },
      []
    );

  const handleCuspFlightTargetChange =
    useCallback(
      (nextTarget) => {
        /*
         * Same rule for the Projection Lab endpoint: continuously
         * measured geometry belongs in the ref. The flight-start
         * machinery explicitly promotes the current snapshot to React
         * state only when it is needed for the visible transition.
         */
        cuspFlightTargetRef.current =
          nextTarget;
      },
      []
    );

  /*
   * Manifold selection resets manifold construction state, but it
   * must not implicitly reset a manually controlled camera.
   *
   * Several construction-state setters fire together during a
   * Figure-eight <-> Sister switch. Without this guard, the general
   * construction auto-fit effect interprets that switch as a request
   * for a fresh camera fit and repeatedly ratchets the zoom inward.
   */
  const preserveManualCameraOnManifoldSwitchRef =
    useRef(false);

  /*
   * Cusp -> Cells must restore the CURRENT Cells camera exactly
   * as the visitor last left it.
   *
   * This one-shot guard prevents the generic construction effect
   * from re-enabling auto-fit merely because Projection Lab was
   * unmounted.
   */
  const preserveCellsCameraDuringCuspFlightRef =
    useRef(false);

  /*
   * Any new 3D construction state restores the default
   * automatic framing policy.
   *
   * A manual zoom disables it until one of these construction
   * inputs changes again. Rotation deliberately does not.
   */
  useEffect(() => {
    if (
      preserveManualCameraOnManifoldSwitchRef.current
    ) {
      preserveManualCameraOnManifoldSwitchRef.current =
        false;

      return;
    }

    if (
      preserveCellsCameraDuringCuspFlightRef.current
    ) {
      preserveCellsCameraDuringCuspFlightRef.current =
        false;

      return;
    }

    if (
      dimension === "3D" &&
      !projectionActive
    ) {
      setAutoFit3D(true);
    }
  }, [
    dimension,
    activeManifoldId,
    facePairSequence,
    collapsedBridgePairIds,
    facePairMappingIndices,
    showInterior,
    showCuspTriangles,
    extendCusp,
    assembleCusp,
    cuspWrapOrder,
    truncationFraction,
    resetSceneVersion,
    projectionActive,
  ]);

  /*
   * Determine whether the right-hand controller actually blocks
   * the bottom-right status position.
   *
   * Short controller:
   *   badge sits 10px from the true viewer right edge.
   *
   * Tall controller:
   *   badge moves just to the controller's left.
   */
  useLayoutEffect(() => {
    if (
      dimension !== "3D" ||
      !projectionActive
    ) {
      setProjectionStatusRightInset(10);
      return undefined;
    }

    const viewer =
      viewerRef.current;

    const controller =
      identificationControlsRef.current;

    if (!viewer || !controller) {
      return undefined;
    }

    let frameId = null;

    const updateStatusInset = () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(
          frameId
        );
      }

      frameId =
        window.requestAnimationFrame(
          () => {
            frameId = null;

            const viewerRect =
              viewer.getBoundingClientRect();

            const controllerRect =
              controller.getBoundingClientRect();

            /*
             * The badge is roughly 30px tall and sits
             * 10px above the bottom edge.
             *
             * A 46px bottom band gives it a little
             * breathing room.
             */
            const badgeBandTop =
              viewerRect.bottom - 46;

            const controllerOccupiesBadgeBand =
              controllerRect.bottom >
                badgeBandTop &&
              controllerRect.top <
                viewerRect.bottom &&
              controllerRect.right >
                viewerRect.left &&
              controllerRect.left <
                viewerRect.right;

            const nextInset =
              controllerOccupiesBadgeBand
                ? Math.max(
                    10,
                    viewerRect.right -
                      controllerRect.left +
                      10
                  )
                : 10;

            setProjectionStatusRightInset(
              (current) =>
                Math.abs(
                  current -
                    nextInset
                ) < 0.5
                  ? current
                  : nextInset
            );
          }
        );
    };

    updateStatusInset();

    const resizeObserver =
      new ResizeObserver(
        updateStatusInset
      );

    resizeObserver.observe(
      viewer
    );

    resizeObserver.observe(
      controller
    );

    window.addEventListener(
      "resize",
      updateStatusInset
    );

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(
          frameId
        );
      }

      resizeObserver.disconnect();

      window.removeEventListener(
        "resize",
        updateStatusInset
      );
    };
  }, [
    dimension,
    projectionActive,
    projectionMode,
    projectionControlsHost,
  ]);

  const applyAutoFitZoom =
    useCallback(
      (targetZoom) => {
        if (
          !Number.isFinite(
            targetZoom
          )
        ) {
          return;
        }

        /*
         * OPENING_SCALE_3D establishes the baseline visual
         * occupancy for the complete automatic 3D camera.
         *
         * Keeping the same multiplier throughout construction
         * makes the opening tetrahedra and the first bridge one
         * continuous camera state. The view changes only when
         * the geometry itself changes size.
         */
        const target =
          clamp(
            targetZoom *
              OPENING_SCALE_3D,
            MIN_ZOOM,
            MAX_ZOOM
          );

        /*
         * FIRST 3D FRAME
         *
         * Install the measured zoom immediately before making
         * the geometry visible. React batches these state changes,
         * so the visitor never sees the temporary DEFAULT_VIEW
         * camera followed by a correction.
         */
        if (
          !initial3DFrameResolvedRef
            .current
        ) {
          initial3DFrameResolvedRef
            .current = true;

          setViewTransform(
            (current) => ({
              ...current,
              zoom: target,
            })
          );

          setInitial3DFrameReady(
            true
          );

          return;
        }

        /*
         * LATER CONSTRUCTION FRAMES
         *
         * Follow changing geometry smoothly rather than snapping
         * while bridges, cusp developments, wraps, etc. animate.
         */
        setViewTransform(
          (current) => {
            const difference =
              target -
              current.zoom;

            if (
              Math.abs(
                difference
              ) < 0.002
            ) {
              return current;
            }

            return {
              ...current,
              zoom:
                current.zoom +
                difference *
                  0.32,
            };
          }
        );
      },
      []
    );

  useEffect(() => {
    if (autoRotationDirection === 0) {
      return undefined;
    }

    let frameId;
    let previousTime = performance.now();

    function animate(now) {
      const elapsed = now - previousTime;
      previousTime = now;

      /*
       * pi radians in 10,000 ms:
       * exactly 180 degrees every 10 seconds.
       */
      const angle =
        autoRotationDirection *
        Math.PI *
        (
          elapsed /
          AUTO_ROTATION_HALF_TURN_MS
        );

      setViewTransform((current) => ({
        ...current,
        rotation: multiplyRotations(
          rotationY(angle),
          current.rotation
        ),
      }));

      frameId =
        requestAnimationFrame(animate);
    }

    frameId =
      requestAnimationFrame(animate);

    return () =>
      cancelAnimationFrame(frameId);
  }, [autoRotationDirection]);

  useEffect(() => {
    if (
      dimension !== "3D" ||
      projectionActive
    ) {
      setCellsEntryHintVisible(false);
      return undefined;
    }

    setCellsEntryHintVisible(true);

    const timerId =
      window.setTimeout(() => {
        setCellsEntryHintVisible(false);
      }, 4000);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [
    dimension,
    projectionActive,
  ]);

  useEffect(() => {
    return () => {
      if (
        dragRotationFrameRef.current !==
        null
      ) {
        window.cancelAnimationFrame(
          dragRotationFrameRef.current
        );

        dragRotationFrameRef.current =
          null;
      }

      pendingDragRotationRef.current =
        null;

      if (
        manifoldCorollarySwitchTimerRef.current !==
        null
      ) {
        window.clearTimeout(
          manifoldCorollarySwitchTimerRef.current
        );

        manifoldCorollarySwitchTimerRef.current =
          null;
      }

      if (
        manifoldCorollaryRotationFrameRef.current !==
        null
      ) {
        window.cancelAnimationFrame(
          manifoldCorollaryRotationFrameRef.current
        );

        manifoldCorollaryRotationFrameRef.current =
          null;
      }

      if (
        rotationClickTimerRef.current !== null
      ) {
        window.clearTimeout(
          rotationClickTimerRef.current
        );
      }

      if (
        seamTransitionTimerRef.current !== null
      ) {
        window.clearTimeout(
          seamTransitionTimerRef.current
        );
      }

      if (
        cuspFlightFrameRef.current !== null
      ) {
        window.cancelAnimationFrame(
          cuspFlightFrameRef.current
        );
      }

      if (
        cuspFlightLandingTimerRef.current !==
        null
      ) {
        window.clearTimeout(
          cuspFlightLandingTimerRef.current
        );
      }
    };
  }, []);

  function identifyTorusPair(pair) {
    setTorusOrder((currentOrder) =>
      currentOrder.includes(pair)
        ? currentOrder
        : [...currentOrder, pair]
    );
  }

  function beginBridgeCollapseTransition(
    pairId,
    shouldCollapse
  ) {
    if (
      seamTransitionTimerRef.current !== null
    ) {
      window.clearTimeout(
        seamTransitionTimerRef.current
      );
    }

    setCollapsedBridgePairIds(
      (currentPairIds) => {
        if (shouldCollapse) {
          return currentPairIds.includes(
            pairId
          )
            ? currentPairIds
            : [
                ...currentPairIds,
                pairId,
              ];
        }

        return currentPairIds.filter(
          (currentPairId) =>
            currentPairId !== pairId
        );
      }
    );

    setSeamTransitioning(true);

    seamTransitionTimerRef.current =
      window.setTimeout(() => {
        seamTransitionTimerRef.current = null;
        setSeamTransitioning(false);
      }, SEAM_TRANSITION_DURATION_MS + 50);
  }

  function animateFacePairIdentification(
    pairId
  ) {
    setConstructiveFinalDisplayActive(
      false
    );

    if (
      seamTransitionTimerRef.current !==
      null
    ) {
      window.clearTimeout(
        seamTransitionTimerRef.current
      );

      seamTransitionTimerRef.current =
        null;
    }

    setActiveMappingPairId(null);

    /*
     * Do not return to the separated pose.
     *
     * Replacing one selected pair by another causes the existing
     * animated seam-strength state to fade the old target out while
     * fading the new target in. The tetrahedra therefore travel
     * continuously between every pair of face-matched states.
     */
    setFacePairSequence([
      pairId,
    ]);

    setCollapsedBridgePairIds([
      pairId,
    ]);

    setSeamTransitioning(true);

    seamTransitionTimerRef.current =
      window.setTimeout(() => {
        seamTransitionTimerRef.current =
          null;

        setSeamTransitioning(
          false
        );
      }, SEAM_TRANSITION_DURATION_MS + 50);
  }


  function interactWithFacePair(pairId) {
    setConstructiveFinalDisplayActive(false);

    /*
     * Face-pair controls remain live at every later viewing
     * stage. Opening or adding a bridge must not tear down the
     * cusp collars, cylinder, torus, or later construction state.
     */
    setActiveMappingPairId(
      (currentPairId) =>
        currentPairId === pairId
          ? null
          : pairId
    );

    const isInSequence =
      facePairSequence.includes(
        pairId
      );

    if (!isInSequence) {
      /*
       * Every identification is born as an exposed bridge.
       * Collapse is always a separate explicit action.
       */
      setFacePairSequence(
        (currentSequence) => [
          ...currentSequence,
          pairId,
        ]
      );
    }
  }

  function selectFacePairSeamState(
    pairId,
    nextState
  ) {
    setConstructiveFinalDisplayActive(false);

    if (
      seamTransitioning ||
      !facePairSequence.includes(pairId)
    ) {
      return;
    }

    const isCollapsed =
      collapsedBridgePairIds.includes(
        pairId
      );

    if (nextState === "bridge") {
      if (isCollapsed) {
        beginBridgeCollapseTransition(
          pairId,
          false
        );
      }

      return;
    }

    if (
      nextState === "collapsed" &&
      !isCollapsed
    ) {
      beginBridgeCollapseTransition(
        pairId,
        true
      );
    }
  }

  function selectFacePairMapping(
    pairId,
    mappingIndex
  ) {
    setConstructiveFinalDisplayActive(false);

    setFacePairMappingIndices(
      (currentMappings) =>
        currentMappings.map(
          (currentMapping, index) =>
            index === pairId
              ? mappingIndex
              : currentMapping
        )
    );
  }

  function identifyCuspBoundary(boundary) {
    setConstructiveFinalDisplayActive(false);

    /*
     * Peripheral identifications begin only after the eight
     * extended cusp triangles have been assembled into their
     * connected planar fundamental domain.
     */
    if (
      !assembleCusp ||
      !peripheralConstructionAvailable
    ) {
      return;
    }

    /*
     * Meridian / Longitude begins the peripheral closure.
     *
     * Interior mode is useful while inspecting the compact
     * quotient, but carrying that translucent continuation view
     * into the cylinder / torus construction causes the interior
     * bridge geometry to compete visually with the cusp surface.
     *
     * Return automatically to the ordinary exterior realization
     * before either peripheral identification begins.
     */
    setShowInterior(false);
    setActiveMappingPairId(null);

    setCuspWrapOrder((currentOrder) =>
      currentOrder.includes(boundary)
        ? currentOrder
        : [...currentOrder, boundary]
    );
  }

  function showConstructiveFinalDisplay() {
    setAutoFit3D(true);
    setConstructiveFinalDisplayActive(true);
  }

  function rotateView(degrees) {
    const angle =
      (degrees * Math.PI) / 180;

    setAutoFit3D(false);

    setViewTransform((current) => ({
      ...current,
      /*
       * Pre-multiplication applies this rotation in
       * camera coordinates. The Y axis is therefore
       * always the current screen's vertical axis.
       */
      rotation: multiplyRotations(
        rotationY(angle),
        current.rotation
      ),
    }));
  }

  function zoomView(amount) {
    /*
     * Manual zoom is an explicit camera choice. Keep it until
     * the next construction-stage change requests a fresh fit.
     */
    setAutoFit3D(false);

    setViewTransform((current) => ({
      ...current,
      zoom: clamp(
        current.zoom + amount,
        MIN_ZOOM,
        MAX_ZOOM
      ),
    }));
  }

  function cancelPendingRotationClick() {
    if (
      rotationClickTimerRef.current === null
    ) {
      return;
    }

    window.clearTimeout(
      rotationClickTimerRef.current
    );

    rotationClickTimerRef.current = null;
  }

  function handleRotationClick(direction) {
    cancelPendingRotationClick();

    /*
     * If continuous rotation is already running, a click means
     * STOP ONLY. Preserve the exact orientation reached on the
     * current animation frame; do not append a 15-degree step.
     */
    if (autoRotationDirection !== 0) {
      setAutoRotationDirection(0);
      return;
    }

    /*
     * When stationary, retain the ordinary single-click behavior.
     * Wait briefly so a double-click can cancel the discrete step
     * before continuous rotation begins.
     */
    rotationClickTimerRef.current =
      window.setTimeout(() => {
        rotationClickTimerRef.current = null;
        rotateView(direction * 15);
      }, ROTATION_SINGLE_CLICK_DELAY_MS);
  }

  function handleRotationDoubleClick(direction) {
    cancelPendingRotationClick();

    setAutoFit3D(false);

    setAutoRotationDirection((current) =>
      current === direction
        ? 0
        : direction
    );
  }

  function beginRotate(event) {
    if (event.button !== 0) {
      return;
    }

    if (
      dragRotationFrameRef.current !==
      null
    ) {
      window.cancelAnimationFrame(
        dragRotationFrameRef.current
      );

      dragRotationFrameRef.current =
        null;
    }

    pendingDragRotationRef.current =
      null;

    cancelPendingRotationClick();
    setAutoRotationDirection(0);
    setAutoFit3D(false);

    event.preventDefault();
    event.currentTarget.focus({
      preventScroll: true,
    });
    event.currentTarget.setPointerCapture(event.pointerId);

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startRotation:
        viewTransform.rotation,
    };

    setIsDragging(true);
  }

  function moveRotate(event) {
    const drag = dragRef.current;

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

    /*
     * Compute the exact requested camera orientation immediately,
     * but do not synchronously push every pointer event through
     * React. Only the newest orientation for this paint frame is
     * retained.
     */
    pendingDragRotationRef.current =
      multiplyRotations(
        dragRotation,
        drag.startRotation
      );

    if (
      dragRotationFrameRef.current !==
      null
    ) {
      return;
    }

    dragRotationFrameRef.current =
      window.requestAnimationFrame(
        () => {
          dragRotationFrameRef.current =
            null;

          const nextRotation =
            pendingDragRotationRef.current;

          pendingDragRotationRef.current =
            null;

          if (!nextRotation) {
            return;
          }

          setViewTransform(
            (current) => ({
              ...current,

              /*
               * Both drag axes are screen-relative:
               * horizontal drag uses screen vertical, and
               * vertical drag uses screen horizontal.
               */
              rotation:
                nextRotation,
            })
          );
        }
      );
  }

  function endRotate(event) {
    const drag = dragRef.current;

    if (
      !drag ||
      drag.pointerId !==
        event.pointerId
    ) {
      return;
    }

    if (
      dragRotationFrameRef.current !==
      null
    ) {
      window.cancelAnimationFrame(
        dragRotationFrameRef.current
      );

      dragRotationFrameRef.current =
        null;
    }

    const finalRotation =
      pendingDragRotationRef.current;

    pendingDragRotationRef.current =
      null;

    if (finalRotation) {
      setViewTransform(
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

    dragRef.current = null;
    setIsDragging(false);
  }

  function handleWheel(event) {
    event.preventDefault();

    zoomView(
      clamp(
        -event.deltaY * 0.0015,
        -0.12,
        0.12
      )
    );
  }

  useEffect(() => {
    const node = canvasRef.current;

    if (!node || projectionActive) {
      return undefined;
    }

    const onWheel = (event) =>
      handleWheel(event);

    node.addEventListener(
      "wheel",
      onWheel,
      { passive: false }
    );

    return () =>
      node.removeEventListener(
        "wheel",
        onWheel
      );
  }, [projectionActive]);

  function handleViewerKeyDown(event) {
    const horizontalDirections = {
      ArrowLeft: -1,
      ArrowRight: 1,
    };

    const horizontalDirection =
      horizontalDirections[event.key];

    if (horizontalDirection !== undefined) {
      event.preventDefault();

      cancelPendingRotationClick();

      /*
       * Use the same requestAnimationFrame loop and
       * angular velocity as double-click rotation:
       * 180 degrees every 10 seconds.
       */
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
      zoomAmounts[event.key];

    if (zoomAmount === undefined) {
      return;
    }

    event.preventDefault();

    cancelPendingRotationClick();
    setAutoRotationDirection(0);
    zoomView(zoomAmount);
  }

  function handleViewerKeyUp(event) {
    const horizontalDirections = {
      ArrowLeft: -1,
      ArrowRight: 1,
    };

    const horizontalDirection =
      horizontalDirections[event.key];

    if (horizontalDirection === undefined) {
      return;
    }

    event.preventDefault();

    setAutoRotationDirection((current) =>
      current === horizontalDirection
        ? 0
        : current
    );
  }

  function handleViewerBlur() {
    cancelPendingRotationClick();
    setAutoRotationDirection(0);
  }

  function cancelCuspFlight() {
    if (
      cuspFlightFrameRef.current !== null
    ) {
      window.cancelAnimationFrame(
        cuspFlightFrameRef.current
      );

      cuspFlightFrameRef.current = null;
    }

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

    setCuspFlightActive(false);
    setCuspFlightDirection(null);
    setCuspFlightHideCells(false);
    setCuspFlightHideProjection(false);
    setCuspFlightProgress(0);
    setCuspFlightTwistDegrees(0);
  }

  function animateCuspFlightTwistSequence(
    keyframes,
    onComplete
  ) {
    let keyframeIndex = 0;

    function runNextKeyframe() {
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

      const startDegrees =
        keyframe.from;

      const endDegrees =
        keyframe.to;

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
          startDegrees +
            (
              endDegrees -
              startDegrees
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
          endDegrees
        );

        runNextKeyframe();
      }

      cuspFlightFrameRef.current =
        window.requestAnimationFrame(
          animate
        );
    }

    runNextKeyframe();
  }

  function beginCuspToCellsFlight() {
    if (
      dimension !== "3D" ||
      !projectionActive ||
      projectionMode !== "cusp" ||
      cuspFlightActive
    ) {
      return;
    }

    /*
     * Capture the EXISTING visible Cusp positions before
     * Projection Lab is unmounted.
     */
    const exactTarget =
      cuspFlightTargetRef.current;

    setAutoRotationDirection(0);

    /*
     * Preserve the visitor's CURRENT Cells pose.
     *
     * The next projectionActive -> false update would normally
     * reactivate auto-fit. Suppress that one automatic response
     * and freeze the current viewTransform instead.
     */
    preserveCellsCameraDuringCuspFlightRef.current =
      true;

    setAutoFit3D(false);

    /*
     * Mount the ordinary Cells renderer invisibly.
     *
     * It is allowed to compute and publish its exact truncation
     * face positions, but the tetrahedra themselves must not be
     * visible during the triangle flight.
     */
    setCuspFlightHideCells(true);

    /*
     * Switch immediately to the ordinary Cells renderer.
     *
     * The tetrahedra remain stationary and hidden.
     */
    setProjectionActive(false);

    /*
     * Give Cells two paint frames to publish the exact current
     * truncation-face coordinates at the final viewer size.
     */
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const exactSource =
          cuspFlightSourceRef.current;

        if (
          !exactSource ||
          !exactTarget
        ) {
          setCuspFlightActive(false);
          setCuspFlightHideCells(false);
          setCuspFlightProgress(0);
          return;
        }

        setCuspFlightSource(
          exactSource
        );

        setCuspFlightTarget(
          exactTarget
        );

        setCuspFlightDirection(
          "toCells"
        );

        setCuspFlightProgress(0);
        setCuspFlightTwistDegrees(0);
        setCuspFlightActive(true);

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

          /*
           * Smooth motion with no overshoot.
           */
          const eased =
            raw *
            raw *
            (
              3 -
              2 * raw
            );

          setCuspFlightProgress(
            eased
          );

          /*
           * Exact inverse of the forward departure:
           * wind from 0° to +30° while returning to Cells.
           */
          setCuspFlightTwistDegrees(
            30 * eased
          );

          if (raw < 1) {
            cuspFlightFrameRef.current =
              window.requestAnimationFrame(
                animate
              );

            return;
          }

          cuspFlightFrameRef.current =
            null;

          setCuspFlightProgress(1);
          setCuspFlightTwistDegrees(30);

          /*
           * Exact time reverse of the departure jiggle:
           *
           *   +30 -> -10 -> +5 -> 0
           *
           * Only after the final 0° pose is recovered do the
           * stationary tetrahedra reappear.
           */
          animateCuspFlightTwistSequence(
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

        cuspFlightFrameRef.current =
          window.requestAnimationFrame(
            animate
          );
      });
    });
  }

  function beginCellsToCuspFlight() {
    if (
      dimension !== "3D" ||
      projectionActive ||
      !cuspConstructionAvailable ||
      cuspFlightActive
    ) {
      return;
    }

    /*
     * Read the truncation faces exactly where the visitor
     * currently has the Cells scene.
     */
    const exactSource =
      cuspFlightSourceRef.current;

    if (!exactSource) {
      /*
       * Defensive fallback: if Cells has not published yet,
       * use the ordinary Cusp switch rather than inventing
       * coordinates.
       */
      setProjectionMode("cusp");
      setProjectionActive(true);
      return;
    }

    setAutoRotationDirection(0);

    if (
      cuspFlightFrameRef.current !== null
    ) {
      window.cancelAnimationFrame(
        cuspFlightFrameRef.current
      );

      cuspFlightFrameRef.current = null;
    }

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

    /*
     * Freeze the exact current Cells source before unmounting it.
     */
    setCuspFlightSource(
      exactSource
    );

    setCuspFlightDirection(
      "toCusp"
    );

    /*
     * progress = 1 is exactly the Cells endpoint.
     *
     * Activate the copied triangles before swapping renderers so
     * they replace the visible truncation faces without jumping.
     */
    setCuspFlightProgress(1);
    setCuspFlightActive(true);

    /*
     * We need a FRESH target measurement from the newly mounted
     * existing Cusp, not a possibly stale screen position from an
     * earlier visit.
     */
    cuspFlightTargetRef.current =
      null;

    setCuspFlightTarget(null);

    /*
     * Mount the REAL existing Projection Lab Cusp invisibly.
     * It remains responsible for calculating its own exact
     * triangle positions.
     */
    setCuspFlightHideProjection(true);
    setProjectionMode("cusp");
    setProjectionActive(true);

    const targetWaitStartedAt =
      performance.now();

    function waitForCuspTarget() {
      const exactTarget =
        cuspFlightTargetRef.current;

      if (exactTarget) {
        setCuspFlightTarget(
          exactTarget
        );

        /*
         * First action: jiggle each material triangle around its
         * own axis while it is still sitting exactly on its live
         * truncation face:
         *
         *   0 -> +5 -> -10 -> +30
         *
         * The flight begins only after +30° is reached.
         */
        setCuspFlightTwistDegrees(0);

        animateCuspFlightTwistSequence(
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
                (
                  3 -
                  2 * raw
                );

              /*
               * Same path, opposite direction.
               */
              setCuspFlightProgress(
                1 - eased
              );

              /*
               * Depart at +30° and unwind continuously to 0°
               * while moving into the Cusp strip.
               */
              setCuspFlightTwistDegrees(
                30 * (1 - eased)
              );

              if (raw < 1) {
                cuspFlightFrameRef.current =
                  window.requestAnimationFrame(
                    animate
                  );

                return;
              }

              cuspFlightFrameRef.current =
                null;

              setCuspFlightProgress(0);
              setCuspFlightTwistDegrees(0);

              /*
               * The copies now coincide pixel-for-pixel with the
               * existing Cusp triangles.
               *
               * Reveal that existing renderer and remove only the
               * moving copies.
               */
              setCuspFlightHideProjection(false);
              setCuspFlightActive(false);
              setCuspFlightDirection(null);
            }

            cuspFlightFrameRef.current =
              window.requestAnimationFrame(
                animate
              );
          }
        );

        return;
      }

      /*
       * Do not wait forever if the renderer cannot provide its
       * measurement for some unexpected reason.
       */
      if (
        performance.now() -
          targetWaitStartedAt >
        1500
      ) {
        setCuspFlightHideProjection(false);
        setCuspFlightActive(false);
        setCuspFlightDirection(null);
        setCuspFlightProgress(0);
        setCuspFlightTwistDegrees(0);
        return;
      }

      cuspFlightFrameRef.current =
        window.requestAnimationFrame(
          waitForCuspTarget
        );
    }

    cuspFlightFrameRef.current =
      window.requestAnimationFrame(
        waitForCuspTarget
      );
  }

  function selectManifold(nextManifoldId) {
    setConstructiveFinalDisplayActive(false);

    const nextManifold =
      MANIFOLD_SPECS[nextManifoldId];

    if (
      !nextManifold?.available ||
      nextManifoldId === activeManifoldId ||
      manifoldCorollaryRotation !== null
    ) {
      return;
    }

    if (
      manifoldCorollarySwitchTimerRef.current !==
      null
    ) {
      window.clearTimeout(
        manifoldCorollarySwitchTimerRef.current
      );

      manifoldCorollarySwitchTimerRef.current =
        null;
    }

    if (
      manifoldCorollaryRotationFrameRef.current !==
      null
    ) {
      window.cancelAnimationFrame(
        manifoldCorollaryRotationFrameRef.current
      );

      manifoldCorollaryRotationFrameRef.current =
        null;
    }

    if (
      seamTransitionTimerRef.current !== null
    ) {
      window.clearTimeout(
        seamTransitionTimerRef.current
      );

      seamTransitionTimerRef.current = null;
    }

    /*
     * A manifold switch is a model change, not a camera command.
     */
    preserveManualCameraOnManifoldSwitchRef.current =
      !autoFit3D;

    cancelCuspFlight();

    setSeamTransitioning(false);
    setActiveMappingPairId(null);

    const corollaryPairSequence = [
      ...facePairSequence,
    ];

    const corollaryCollapsedPairIds = [
      ...collapsedBridgePairIds,
    ];

    const installNextManifold = () => {
      setActiveManifoldId(
        nextManifoldId
      );

      setFacePairMappingIndices(
        nextManifold.facePairs.map(
          () => 0
        )
      );

      setShowInterior(false);
      setShowCuspTriangles(false);
      setExtendCusp(false);
      setAssembleCusp(false);
      setCuspWrapOrder([]);

      setFaceConstructionState(null);

      window.requestAnimationFrame(
        () => {
          setFacePairSequence(
            corollaryPairSequence
          );

          setCollapsedBridgePairIds(
            corollaryCollapsedPairIds
          );
        }
      );
    };

    /*
     * Special same-face comparison is valid only for ONE already
     * completed direct identification.
     */
    const singleCollapsedPairId =
      (
        corollaryPairSequence.length === 1 &&
        corollaryCollapsedPairIds.length === 1 &&
        corollaryPairSequence[0] ===
          corollaryCollapsedPairIds[0]
      )
        ? corollaryPairSequence[0]
        : null;

    /*
     * ========================================================
     * YELLOW
     *
     * Figure-eight:
     *   123 -> 321
     *
     * Sister:
     *   123 -> 132
     *
     * Same Yellow physical face. Do NOT retract it.
     * Rotate the already-glued rigid tetrahedron directly from
     * the current manifold's existing pose into the other
     * manifold's existing pose.
     * ========================================================
     */
    if (singleCollapsedPairId === 0) {
      const startedAt =
        performance.now();

      setManifoldCorollaryRotation({
        targetManifoldId:
          nextManifoldId,
        pairId: 0,
        progress: 0,
      });

      function animateCorollaryRotation(
        now
      ) {
        const raw =
          Math.max(
            0,
            Math.min(
              1,
              (
                now -
                startedAt
              ) /
                MANIFOLD_COROLLARY_ROTATION_MS
            )
          );

        /*
         * Zero velocity at both endpoints.
         */
        const eased =
          raw *
          raw *
          (3 - 2 * raw);

        setManifoldCorollaryRotation({
          targetManifoldId:
            nextManifoldId,
          pairId: 0,
          progress:
            eased,
        });

        if (raw < 1) {
          manifoldCorollaryRotationFrameRef.current =
            window.requestAnimationFrame(
              animateCorollaryRotation
            );

          return;
        }

        manifoldCorollaryRotationFrameRef.current =
          null;

        /*
         * At progress 1 the visible source renderer is already in
         * the target manifold's exact Yellow glued pose. Therefore
         * the data-model switch is geometrically invisible.
         */
        setActiveManifoldId(
          nextManifoldId
        );

        setFacePairMappingIndices(
          nextManifold.facePairs.map(
            () => 0
          )
        );

        setFaceConstructionState(null);

        window.requestAnimationFrame(
          () => {
            setManifoldCorollaryRotation(
              null
            );
          }
        );
      }

      manifoldCorollaryRotationFrameRef.current =
        window.requestAnimationFrame(
          animateCorollaryRotation
        );
    }

    /*
     * ========================================================
     * RED
     *
     * Figure-eight:
     *   234 -> 432
     *
     * Sister:
     *   234 -> 432
     *
     * Nothing needs to rotate or retract. Keep the existing
     * glued object exactly where it is and change only which
     * manifold owns that identical correspondence.
     * ========================================================
     */
    else if (singleCollapsedPairId === 3) {
      setActiveManifoldId(
        nextManifoldId
      );

      setFacePairMappingIndices(
        nextManifold.facePairs.map(
          () => 0
        )
      );

      setShowInterior(false);
      setShowCuspTriangles(false);
      setExtendCusp(false);
      setAssembleCusp(false);
      setCuspWrapOrder([]);

      setFaceConstructionState(null);
    }

    /*
     * Nothing identified: ordinary immediate manifold switch.
     */
    else if (
      corollaryPairSequence.length === 0
    ) {
      setFacePairSequence([]);
      setCollapsedBridgePairIds([]);

      installNextManifold();
    }

    /*
     * ========================================================
     * BLUE / GREEN / MULTIPLE IDENTIFICATIONS
     *
     * These actually change which target face participates.
     * Preserve the existing retract -> switch -> reattach
     * behavior exactly.
     * ========================================================
     */
    else {
      setCollapsedBridgePairIds([]);
      setFacePairSequence([]);

      manifoldCorollarySwitchTimerRef.current =
        window.setTimeout(
          () => {
            manifoldCorollarySwitchTimerRef.current =
              null;

            installNextManifold();
          },
          MANIFOLD_COROLLARY_RETRACT_MS
        );
    }

    if (dimension !== "3D") {
      setProjectionActive(false);
    }
  }

  function resetCurrent() {
    /*
     * Reset means: return to exactly the same state produced by
     * loading this page fresh.
     *
     * The selected dimensional viewer and global menu state are
     * already persisted by the existing reload logic, while all
     * transient construction state is naturally recreated from
     * its current defaults.
     *
     * Keeping Reset identical to reload prevents these two entry
     * states from drifting apart as the viewer evolves.
     */
    window.location.reload();
  }

  function undoCurrent() {
    setConstructiveFinalDisplayActive(false);

    if (dimension === "1D") {
      setIntervalIdentified(false);
    }

    if (dimension === "2D") {
      setTorusOrder((currentOrder) =>
        currentOrder.slice(0, -1)
      );
    }

    if (dimension === "3D") {
      if (
        seamTransitionTimerRef.current !== null
      ) {
        window.clearTimeout(
          seamTransitionTimerRef.current
        );

        seamTransitionTimerRef.current = null;
      }

      setSeamTransitioning(false);

      if (projectionActive) {
        setProjectionActive(false);
      } else if (cuspWrapOrder.length > 0) {
        setCuspWrapOrder((currentOrder) =>
          currentOrder.slice(0, -1)
        );
      } else if (assembleCusp) {
        setAssembleCusp(false);
      } else if (extendCusp) {
        setExtendCusp(false);
        setShowCuspTriangles(false);
      } else if (showInterior) {
        setShowInterior(false);
      } else {
        const nextSequence =
          facePairSequence.slice(
            0,
            -1
          );

        setFacePairSequence(
          nextSequence
        );

        setCollapsedBridgePairIds(
          (currentPairIds) =>
            currentPairIds.filter(
              (pairId) =>
                nextSequence.includes(
                  pairId
                )
            )
        );

        setActiveMappingPairId(null);
      }
    }
  }

  const facePairSequenceLabel =
    facePairSequence
      .map(
        (pairId) =>
          activeFacePairs[
            pairId
          ].label.replace(
            " faces",
            ""
          )
      )
      .join(" → ");

  const faceIdentificationComplete =
    facePairSequence.length ===
    activeFacePairs.length;

  const status =
    dimension === "1D"
      ? intervalIdentified
        ? "Endpoints identified: circle"
        : "Line segment: endpoints separate"
      : dimension === "2D"
        ? torusOrder.length === 0
          ? "Square: no edge pairs identified"
          : torusOrder.length === 1
            ? "Cylinder: one edge pair identified"
            : "Torus: both edge pairs identified"
        : showInterior
          ? "Interior quotient: a colored light ring travels through the actual sequential steps of each face-identification bridge, from its A face to its B face. Bridge color identifies the faces; bridge twist records the selected cyclic vertex map. The truncation triangles bound the cusp."
          : showCuspTriangles
          ? cuspWrapOrder.length === 2
            ? projectionActive
              ? "Projection Lab: exact S³ tube with stereographic and geometry controls"
              : "Knotted cusp torus: meridian and longitude identified"
            : cuspWrapOrder.length === 1
              ? cuspWrapOrder[0] === "long"
                ? "Cusp cylinder: meridian identified"
                : "Cusp cylinder: longitude identified"
              : assembleCusp
                ? peripheralConstructionAvailable
                  ? "Cusp fundamental domain: eight extended triangles assembled into one parallelogram"
                  : "Sister cusp fundamental domain assembled. Meridian/longitude remain locked until the peripheral basis is verified."
                : extendCusp
                  ? "Cusp boundary: eight truncation triangles extended outward"
                  : "Cusp boundary: eight truncation triangles with twelve induced edge identifications"
          : facePairSequence.length === 0
            ? "Two truncated tetrahedra: choose a face identification"
            : faceIdentificationComplete
              ? cuspConstructionAvailable
                ? `Face identifications complete ${activeFacePairs.length}/${activeFacePairs.length}: ${facePairSequenceLabel}. Extend the cusp triangles next.`
                : `Face identifications complete ${activeFacePairs.length}/${activeFacePairs.length}: ${facePairSequenceLabel}. Compact quotient ready; inspect Interior.`
              : `Face-identification sequence ${facePairSequence.length}/${activeFacePairs.length}: ${facePairSequenceLabel}`;

  const activeMappingPair =
    activeMappingPairId === null
      ? null
      : activeFacePairs[
          activeMappingPairId
        ] ?? null;

  const activeMappingIndex =
    activeMappingPairId === null
      ? 0
      : facePairMappingIndices[
          activeMappingPairId
        ] ?? 0;

  const activeMappingPairInSequence =
    activeMappingPairId !== null &&
    facePairSequence.includes(
      activeMappingPairId
    );

  const activeMappingPairIsCollapsed =
    activeMappingPairId !== null &&
    collapsedBridgePairIds.includes(
      activeMappingPairId
    );

  const activeMappingPairCollapseBlocked =
    !activeMappingPairInSequence ||
    seamTransitioning;

  const activeMappingPairBridgeBlocked =
    !activeMappingPairInSequence ||
    seamTransitioning;

  useLayoutEffect(() => {
    if (
      dimension !== "3D" ||
      activeMappingPairId === null
    ) {
      setMappingPopoverPosition(null);
      return undefined;
    }

    const viewer = viewerRef.current;
    const button =
      facePairButtonRefs.current[
        activeMappingPairId
      ];

    if (!viewer || !button) {
      setMappingPopoverPosition(null);
      return undefined;
    }

    function updatePosition() {
      const viewerBounds =
        viewer.getBoundingClientRect();
      const buttonBounds =
        button.getBoundingClientRect();

      setMappingPopoverPosition({
        top:
          buttonBounds.top -
          viewerBounds.top +
          buttonBounds.height / 2,
        left:
          buttonBounds.left -
          viewerBounds.left -
          8,
      });
    }

    updatePosition();

    const controls =
      identificationControlsRef.current;

    window.addEventListener(
      "resize",
      updatePosition
    );

    controls?.addEventListener(
      "scroll",
      updatePosition,
      { passive: true }
    );

    const resizeObserver =
      typeof ResizeObserver ===
      "undefined"
        ? null
        : new ResizeObserver(
            updatePosition
          );

    resizeObserver?.observe(viewer);
    resizeObserver?.observe(button);

    if (controls) {
      resizeObserver?.observe(controls);
    }

    return () => {
      window.removeEventListener(
        "resize",
        updatePosition
      );

      controls?.removeEventListener(
        "scroll",
        updatePosition
      );

      resizeObserver?.disconnect();
    };
  }, [
    dimension,
    activeMappingPairId,
    facePairSequence.length,
  ]);

  const RootElement = embedded
    ? "section"
    : "main";

  return (
    <RootElement
      className={`${styles.page} ${
        embedded
          ? styles.embeddedPage
          : ""
      }`}
    >
      <div
        style={{
          position: "relative",
          zIndex: 20,
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "18px",
          pointerEvents: "auto",
        }}
      >
        <h1>
          {titleHref ? (
            <a
              href={titleHref}
              title="Open Closed manifold identifications"
              onClick={(event) => {
                event.preventDefault();

                window.location.assign(
                  titleHref
                );
              }}
              style={{
                position: "relative",
                zIndex: 21,
                display: "inline-block",
                color: "inherit",
                textDecoration: "none",
                cursor: "pointer",
                pointerEvents: "auto",
              }}
            >
              Closed manifold identifications
            </a>
          ) : (
            "Closed manifold identifications"
          )}
        </h1>

        {dimension === "3D" && (
          <div
            role="group"
            aria-label="3D scene"
            className={styles.stageControls}
            style={{
              width: "226px",
              display: "grid",
              gridTemplateColumns:
                "repeat(3, 72px)",
              gap: "5px",
              flex: "0 0 auto",
            }}
          >
            <button
              type="button"
              className={
                !projectionActive
                  ? styles.activeDimension
                  : ""
              }
              onClick={() => {
                stopProjectionCenterMorph();

                rememberClosedManifoldScene(
                  "cells"
                );

                if (
                  projectionActive &&
                  projectionMode === "cusp"
                ) {
                  beginCuspToCellsFlight();
                  return;
                }

                setProjectionActive(false);
              }}
              aria-pressed={
                !projectionActive
              }
            >
              Cells
            </button>

            <button
              type="button"
              disabled={
                !cuspConstructionAvailable
              }
              title="Assembled cusp"
              onClick={() => {
                if (
                  !cuspConstructionAvailable
                ) {
                  return;
                }

                rememberClosedManifoldScene(
                  "cusp"
                );

                if (!projectionActive) {
                  stopProjectionCenterMorph();
                  beginCellsToCuspFlight();
                  return;
                }

                if (
                  projectionMode === "boundary"
                ) {
                  beginProjectionCenterMorph();
                } else {
                  stopProjectionCenterMorph();
                }

                /*
                 * Boundary -> Cusp remains the existing
                 * Projection Lab morph.
                 *
                 * A Cusp landing target from the previous visit is
                 * screen-space data. Do not leave that stale endpoint
                 * visible while the Boundary is morphing back to Cusp.
                 *
                 * Projection Lab will publish a fresh target only
                 * after the real flat Cusp endpoint is reached.
                 */
                cancelCuspFlight();

                cuspFlightTargetRef.current =
                  null;

                setCuspFlightTarget(
                  null
                );

                setProjectionMode("cusp");
                setProjectionActive(true);
              }}
              aria-pressed={
                projectionActive &&
                projectionMode === "cusp"
              }
              className={
                projectionActive &&
                projectionMode === "cusp"
                  ? styles.activeDimension
                  : ""
              }
            >
              Cusp
            </button>

            <button
              type="button"
              title="Knotted cusp boundary"
              onClick={() => {
                if (
                  projectionActive &&
                  projectionMode === "cusp"
                ) {
                  beginProjectionCenterMorph();
                } else {
                  stopProjectionCenterMorph();
                }

                rememberClosedManifoldScene(
                  "boundary"
                );

                setProjectionMode("boundary");
                setProjectionActive(true);
              }}
              aria-pressed={
                projectionActive &&
                projectionMode === "boundary"
              }
              className={
                projectionActive &&
                projectionMode === "boundary"
                  ? styles.activeDimension
                  : ""
              }
            >
              Boundary
            </button>
          </div>
        )}
      </div>

      <section
        ref={viewerRef}
        className={styles.viewer}
        style={{
          "--identification-panel-width":
            dimension === "3D" &&
            projectionActive &&
            projectionMode === "boundary"
              ? "300px"
              : "190px",
        }}
      >
        <div
          ref={setProjectionStatusHost}
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 3,
            pointerEvents: "none",
          }}
        />

        <div className={styles.dimensionControls}>
          {["1D", "2D", "3D"].map((option) => (
            <button
              key={option}
              type="button"
              className={
                dimension === option
                  ? styles.activeDimension
                  : ""
              }
              onClick={() => {
                /*
                 * Dimension selection is also a complete reset.
                 *
                 * Persist the requested dimensional viewer first,
                 * then reload so that 1D, 2D, and 3D each begin
                 * from their exact clean initial state.
                 *
                 * This deliberately uses the same semantics as
                 * the main Reset button instead of trying to
                 * manually keep two reset implementations in sync.
                 */
                rememberClosedManifoldScene(
                  "cells"
                );

                /*
                 * Standalone page:
                 *
                 * The bare URL is always the canonical 1D entry.
                 * An explicit dimension selection is carried in
                 * the URL so a reload can preserve that selection
                 * without making it the next visit's default.
                 */
                if (!embedded) {
                  const url =
                    new URL(
                      window.location.href
                    );

                  url.searchParams.set(
                    "dimension",
                    option
                  );

                  window.location.assign(
                    url.toString()
                  );

                  return;
                }

                /*
                 * Embedded viewer keeps its existing persistence
                 * behavior because it lives inside another page.
                 */
                try {
                  window.localStorage.setItem(
                    CLOSED_MANIFOLD_DIMENSION_STORAGE_KEY,
                    option
                  );
                } catch {
                  /*
                   * The viewer still works normally if
                   * persistent browser storage is disabled.
                   */
                }

                try {
                  writeClosedManifoldDimensionCookie(
                    option
                  );
                } catch {
                  /*
                   * The viewer still works normally if
                   * cookies are unavailable.
                   */
                }

                window.location.reload();
              }}
            >
              {option}
            </button>
          ))}
        </div>

        <div
          ref={identificationControlsRef}
          className={styles.identificationControls}

          style={
            dimension === "3D"
              ? {
                  width:
                    projectionActive &&
                    projectionMode === "boundary"
                      ? "300px"
                      : "190px",
                }
              : undefined
          }
        >
          {dimension === "3D" && (
            <>
              {(
                !projectionActive ||
                projectionMode === "cusp"
              ) && (
                <span
                  className={
                    styles.controlLabel
                  }
                >
                  Identifications
                </span>
              )}

              <div
                className={
                  styles.manifoldSelector
                }
                role="group"
                aria-label="Manifold selection"
                style={{
                  position: "static",
                  inset: "auto",
                  width: "100%",
                  display: "grid",
                  gridTemplateColumns:
                    "1fr 1fr",
                  gap: "5px",
                  margin: 0,
                  padding: 0,
                  border: 0,
                  background:
                    "transparent",
                }}
              >
                {[
                  MANIFOLD_SPECS.m004,
                  MANIFOLD_SPECS.m003,
                ].map((spec) => {
                  const selected =
                    spec.id ===
                    activeManifoldId;

                  return (
                    <button
                      key={spec.id}
                      type="button"

                      className={
                        `${
                          styles
                            .manifoldSelectorButton
                        } ${
                          spec.id ===
                          "m004"
                            ? styles
                                .manifoldSelectorFigureEight
                            : styles
                                .manifoldSelectorSister
                        } ${
                          selected
                            ? styles
                                .activeManifoldSelectorButton
                            : ""
                        }`
                      }

                      aria-pressed={
                        selected
                      }

                      style={{
                        width: "100%",
                        minWidth: 0,

                        /*
                         * Make the currently selected manifold visually
                         * explicit. m004 is the initial active manifold,
                         * so Figure-eight begins highlighted. Selecting
                         * m003 transfers this treatment to Sister.
                         *
                         * The colored identification controls below
                         * continue to come from the selected manifold's
                         * actual face-pair data.
                         */
                        borderColor:
                          selected
                            ? "rgba(255, 255, 255, 0.88)"
                            : undefined,

                        color:
                          selected
                            ? "rgba(255, 255, 255, 0.98)"
                            : undefined,

                        background:
                          selected
                            ? "rgba(255, 255, 255, 0.12)"
                            : undefined,

                        boxShadow:
                          selected
                            ? "inset 0 0 0 1px rgba(255, 255, 255, 0.10)"
                            : undefined,
                      }}

                      disabled={
                        !spec.available
                      }

                      onClick={() =>
                        selectManifold(
                          spec.id
                        )
                      }

                      title={
                        spec.fullLabel
                      }
                    >
                      <span
                        className={
                          styles
                            .manifoldSelectorLabel
                        }
                      >
                        {spec.label}
                      </span>

                      <span
                        className={
                          styles
                            .manifoldSelectorId
                        }
                      >
                        {
                          spec.available
                            ? spec.id
                            : `${spec.id} · next`
                        }
                      </span>
                    </button>
                  );
                })}
              </div>

              <div
                ref={
                  setProjectionControlsHost
                }
                className={
                  styles.projectionControlsHost
                }
                style={{
                  display:
                    projectionActive
                      ? "block"
                      : "none",

                  order:
                    projectionActive &&
                    projectionMode === "cusp"
                      ? 2
                      : undefined,
                }}
                aria-hidden={
                  !projectionActive
                }
              />
            </>
          )}

          {dimension !== "3D" && (
            <span
              className={
                styles.controlLabel
              }
            >
              Identifications
            </span>
          )}

          {dimension === "1D" && (
            <button
              type="button"
              className={styles.yellowButton}
              onClick={() =>
                setIntervalIdentified(true)
              }
              disabled={intervalIdentified}
            >
              Yellow vertices
            </button>
          )}

          {dimension === "2D" && (
            <>
              <button
                type="button"
                className={styles.orangeButton}
                onClick={() => identifyTorusPair("orange")}
                disabled={torusOrder.includes("orange")}
              >
                Orange edges
              </button>

              <button
                type="button"
                className={styles.blueButton}
                onClick={() => identifyTorusPair("blue")}
                disabled={torusOrder.includes("blue")}
              >
                Blue edges
              </button>
            </>
          )}

          {dimension === "3D" &&
            (
              !projectionActive ||
              projectionMode === "cusp"
            ) && (
            <>
              <div
                aria-hidden="true"
                style={{
                  width: "100%",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  boxSizing: "border-box",
                  margin: "0 0 2px",
                  color: "rgba(232, 223, 200, 0.88)",
                  fontFamily:
                    '"Times New Roman", Times, serif',
                  fontSize: "15px",
                  fontStyle: "normal",
                  lineHeight: 1,
                  textAlign: "center",
                }}
              >
                <span>A</span>
                <span>B</span>
              </div>

              {activeFacePairs.map(
                (pair) => {
                  const sequenceIndex =
                    facePairSequence.indexOf(
                      pair.id
                    );

                  const isInSequence =
                    sequenceIndex !== -1;

                  const isActiveMappingPair =
                    activeMappingPairId ===
                    pair.id;

                  const isCollapsedBridge =
                    collapsedBridgePairIds.includes(
                      pair.id
                    );

                  const mappingIndex =
                    facePairMappingIndices[
                      pair.id
                    ] ?? 0;

                  const sourceColor =
                    pair.AColor ??
                    pair.color;

                  const targetColor =
                    pair.BColor ??
                    pair.color;

                  const sourceTint =
                    colorWithAlpha(
                      sourceColor,
                      0.30
                    );

                  const targetTint =
                    colorWithAlpha(
                      targetColor,
                      0.30
                    );

                  const identificationLabel =
                    `${faceColorName(
                      sourceColor
                    )}-${faceColorName(
                      targetColor
                    )}`;

                  return (
                    <div
                      key={pair.id}
                      className={
                        styles.facePairControl
                      }
                    >
                      <button
                        ref={(node) => {
                          facePairButtonRefs
                            .current[
                              pair.id
                            ] = node;
                        }}
                        type="button"
                        className={[
                          isInSequence
                            ? styles.selectedFacePairButton
                            : "",
                          isActiveMappingPair
                            ? styles.activeFacePairButton
                            : "",
                          isCollapsedBridge
                            ? styles.seamedFacePairButton
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() => {
                          /*
                           * In Cusp these buttons are a read-only
                           * report of the face identifications.
                           *
                           * In Cells they retain their existing
                           * identification animation behavior.
                           */
                          if (
                            projectionActive &&
                            projectionMode === "cusp"
                          ) {
                            return;
                          }

                          animateFacePairIdentification(
                            pair.id
                          );
                        }}
                        aria-expanded={
                          isActiveMappingPair
                        }
                        aria-controls={
                          isActiveMappingPair
                            ? "face-pair-mapping-popover"
                            : undefined
                        }
                        title={
                          `${pair.description}. Click to animate the two tetrahedral cells together through this face identification.`
                        }
                        style={{
                          /*
                           * The button is a miniature bridge:
                           *
                           *   left  = tetrahedron A face
                           *   right = tetrahedron B face
                           *
                           * Keep a visible center seam even when
                           * both endpoint colors are identical.
                           */
                          borderColor:
                            "rgba(232, 223, 200, 0.58)",
                          borderLeftColor:
                            sourceColor,
                          borderRightColor:
                            targetColor,
                          color:
                            "rgba(250, 246, 232, 0.96)",
                          textShadow:
                            "0 1px 2px rgba(0, 0, 0, 0.78)",
                          backgroundImage:
                            `linear-gradient(
                              90deg,
                              ${sourceTint} 0%,
                              ${sourceTint} calc(50% - 10px),
                              rgba(3, 3, 3, 0.94) calc(50% - 10px),
                              rgba(3, 3, 3, 0.94) calc(50% + 10px),
                              ${targetTint} calc(50% + 10px),
                              ${targetTint} 100%
                            )`,
                        }}
                      >
                        <span
                          className={
                            styles.facePairButtonContent
                          }
                          style={{
                            position: "relative",
                            display: "block",
                            width: "100%",
                            height: "100%",
                          }}
                        >
                          {/* A color region */}
                          <span
                            style={{
                              position: "absolute",
                              left: "2px",
                              top: "50%",
                              transform:
                                "translateY(-50%)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {faceColorName(
                              sourceColor
                            )}
                          </span>

                          {/* A vertex-number region */}
                          <span
                            style={{
                              position: "absolute",
                              right: "calc(50% + 18px)",
                              top: "50%",
                              transform:
                                "translateY(-50%)",
                              width: "34px",
                              textAlign: "right",
                              opacity: 0.78,
                              fontSize: "0.88em",
                              fontVariantNumeric:
                                "tabular-nums",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {faceDisplayVertexTriple(
                              activeManifoldId,
                              sourceColor,
                              "A"
                            )}
                          </span>

                          {/* Center identification arrow */}
                          <span
                            aria-hidden="true"
                            style={{
                              position: "absolute",
                              left: "50%",
                              top: "50%",
                              transform:
                                "translate(-50%, -50%)",
                              zIndex: 2,
                              color:
                                "rgba(244, 238, 218, 0.78)",
                              fontSize: "12px",
                              lineHeight: 1,
                              fontWeight: 400,
                              pointerEvents: "none",
                              textShadow:
                                "0 1px 2px rgba(0, 0, 0, 0.9)",
                            }}
                          >
                            →
                          </span>

                          {/* B color region */}
                          <span
                            style={{
                              position: "absolute",
                              left: "calc(50% + 15px)",
                              top: "50%",
                              transform:
                                "translateY(-50%)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {faceColorName(
                              targetColor
                            )}
                          </span>

                          {/* B vertex-number region */}
                          <span
                            style={{
                              position: "absolute",
                              right: "2px",
                              top: "50%",
                              transform:
                                "translateY(-50%)",
                              width: "34px",
                              textAlign: "right",
                              opacity: 0.78,
                              fontSize: "0.88em",
                              fontVariantNumeric:
                                "tabular-nums",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {faceDisplayVertexTriple(
                              activeManifoldId,
                              targetColor,
                              "B"
                            )}
                          </span>


                        </span>
                      </button>

                    </div>
                  );
                }
              )}

              {/* Authoritative completed boundary selector. */}
              </>
          )}

          {false && dimension === "3D" && (
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
                <label
                  htmlFor="cusp-mesh-density"
                  className={
                    styles.truncationLabel
                  }
                >
                  Mesh
                </label>

                <output
                  htmlFor="cusp-mesh-density"
                  className={
                    styles.truncationValue
                  }
                >
                  {formatMeshFaceCount(
                    pendingCuspMeshFaceCount
                  )}
                </output>
              </div>

              <input
                id="cusp-mesh-density"
                type="range"
                min="0"
                max="1"
                step="0.001"
                value={meshSliderPosition}
                onChange={(event) =>
                  setMeshSliderPosition(
                    clamp(
                      Number(
                        event.target.value
                      ),
                      0,
                      1
                    )
                  )
                }
                onPointerUp={
                  commitCuspMeshFaceCount
                }
                onPointerCancel={
                  commitCuspMeshFaceCount
                }
                onKeyUp={
                  commitCuspMeshFaceCount
                }
                onBlur={
                  commitCuspMeshFaceCount
                }
                aria-label="Connected cusp mesh facet count"
                aria-valuetext={`${formatMeshFaceCount(
                  pendingCuspMeshFaceCount
                )} triangular facets`}
              />

              <div
                className={
                  styles.truncationScale
                }
                aria-hidden="true"
              >
                <span>288</span>
                <span>288²</span>
              </div>
            </div>
          )}
          {(
            dimension === "1D" ||
            dimension === "2D" ||
            (
              dimension === "3D" &&
              !projectionActive
            )
          ) && (
            <>
              <span
                className={
                  styles.controlLabel
                }
                style={{
                  width: "100%",
                  boxSizing:
                    "border-box",
                  marginTop: "1px",
                  paddingTop: "6px",
                  borderTop:
                    "1px solid rgba(232, 223, 200, 0.13)",
                }}
              >
                View
              </span>

              <div
                className={
                  styles.rotationControls
                }
              >
                <button
                  type="button"

                  onClick={() => {
                    if (
                      dimension === "3D" &&
                      projectionActive
                    ) {
                      projectionLabControlRef
                        .current
                        ?.rotate(-1);
                    } else {
                      handleRotationClick(
                        -1
                      );
                    }
                  }}

                  onDoubleClick={() => {
                    if (
                      dimension !== "3D" ||
                      !projectionActive
                    ) {
                      handleRotationDoubleClick(
                        -1
                      );
                    }
                  }}

                  aria-label=
                    "Rotate counter-clockwise"

                  title=
                    "Rotate counter-clockwise"
                >
                  <RotationArrowIcon />
                </button>

                <button
                  type="button"

                  onClick={() => {
                    if (
                      dimension === "3D" &&
                      projectionActive
                    ) {
                      projectionLabControlRef
                        .current
                        ?.rotate(1);
                    } else {
                      handleRotationClick(
                        1
                      );
                    }
                  }}

                  onDoubleClick={() => {
                    if (
                      dimension !== "3D" ||
                      !projectionActive
                    ) {
                      handleRotationDoubleClick(
                        1
                      );
                    }
                  }}

                  aria-label=
                    "Rotate clockwise"

                  title=
                    "Rotate clockwise"
                >
                  <RotationArrowIcon
                    clockwise
                  />
                </button>

                <button
                  type="button"

                  onClick={() => {
                    if (
                      dimension === "3D" &&
                      projectionActive
                    ) {
                      projectionLabControlRef
                        .current
                        ?.zoom(-1);
                    } else {
                      zoomView(-0.1);
                    }
                  }}

                  aria-label="Zoom out"
                  title="Zoom out"
                >
                  −
                </button>

                <button
                  type="button"

                  onClick={() => {
                    if (
                      dimension === "3D" &&
                      projectionActive
                    ) {
                      projectionLabControlRef
                        .current
                        ?.zoom(1);
                    } else {
                      zoomView(0.1);
                    }
                  }}

                  aria-label="Zoom in"
                  title="Zoom in"
                >
                  +
                </button>
              </div>

              {(
                dimension !== "3D" ||
                (
                  dimension === "3D" &&
                  !projectionActive
                )
              ) && (
                <button
                  type="button"
                  onClick={undoCurrent}
                  disabled={
                    dimension === "1D"
                      ? !intervalIdentified
                      : dimension === "2D"
                        ? torusOrder.length === 0
                        : (
                            facePairSequence.length === 0 &&
                            !showInterior
                          )
                  }
                >
                  Undo
                </button>
              )}

              <button
                type="button"

                onClick={() => {
                  window.location.reload();
                }}
              >
                Reset
              </button>
            </>
          )}

          {dimension === "3D" && !projectionActive && (
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
                <label
                  htmlFor="truncation-depth"
                  className={
                    styles.truncationLabel
                  }
                >
                  Truncation
                </label>

                <output
                  htmlFor="truncation-depth"
                  className={
                    styles.truncationValue
                  }
                >
                  {`${(
                    truncationFraction * 100
                  ).toFixed(1)}%`}
                </output>
              </div>

              <input
                id="truncation-depth"
                type="range"
                min={
                  MIN_TRUNCATION_FRACTION
                }
                max={
                  MAX_TRUNCATION_FRACTION
                }
                step="0.001"
                value={truncationFraction}
                onChange={(event) =>
                  setTruncationFraction(
                    clamp(
                      Number(
                        event.target.value
                      ),
                      MIN_TRUNCATION_FRACTION,
                      MAX_TRUNCATION_FRACTION
                    )
                  )
                }
                aria-label="Truncation as a fraction of tetrahedron edge length"
                aria-valuetext={`Truncated at ${(
                  truncationFraction * 100
                ).toFixed(1)} percent of edge length`}
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
          )}


        </div>

        {dimension === "3D" &&
          activeMappingPair &&
          mappingPopoverPosition && (
            <div
              id="face-pair-mapping-popover"
              className={`${styles.mappingControlBlock} ${styles.floatingMappingControl}`}
              style={{
                top: `${mappingPopoverPosition.top}px`,
                left: `${mappingPopoverPosition.left}px`,
                borderColor:
                  activeMappingPair.color,
                color:
                  activeMappingPair.color,
              }}
            >
              <div
                className={
                  styles.mappingChoices
                }
                role="group"
                aria-label={`${activeMappingPair.label} cyclic vertex mapping`}
              >
                {CYCLIC_FACE_MAPPING_CHOICES.map(
                  (choice) => (
                    <button
                      key={choice.id}
                      type="button"
                      className={
                        activeMappingIndex ===
                        choice.id
                          ? styles.activeMappingChoice
                          : ""
                      }
                      onClick={() =>
                        selectFacePairMapping(
                          activeMappingPair.id,
                          choice.id
                        )
                      }
                      aria-pressed={
                        activeMappingIndex ===
                        choice.id
                      }
                      title={choice.description}
                      style={{
                        borderColor:
                          activeMappingPair.color,
                        color:
                          activeMappingPair.color,
                      }}
                    >
                      {choice.label}
                    </button>
                  )
                )}
              </div>

              <div
                className={
                  styles.bridgeStateChoices
                }
                role="group"
                aria-label={`${activeMappingPair.label} bridge state`}
              >
                <button
                  type="button"
                  className={
                    activeMappingPairIsCollapsed
                      ? styles.activeBridgeStateChoice
                      : ""
                  }
                  onClick={() =>
                    selectFacePairSeamState(
                      activeMappingPair.id,
                      "collapsed"
                    )
                  }
                  disabled={
                    activeMappingPairCollapseBlocked
                  }
                  aria-pressed={
                    activeMappingPairIsCollapsed
                  }
                  title={
                    activeMappingPairIsCollapsed
                      ? "This face pair is collapsed"
                      : "Collapse this bridge while preserving the other face identifications"
                  }
                >
                  Collapsed
                </button>

                <button
                  type="button"
                  className={
                    activeMappingPairInSequence &&
                    !activeMappingPairIsCollapsed
                      ? styles.activeBridgeStateChoice
                      : ""
                  }
                  onClick={() =>
                    selectFacePairSeamState(
                      activeMappingPair.id,
                      "bridge"
                    )
                  }
                  disabled={
                    activeMappingPairBridgeBlocked
                  }
                  aria-pressed={
                    activeMappingPairInSequence &&
                    !activeMappingPairIsCollapsed
                  }
                  title={
                    activeMappingPairIsCollapsed
                      ? "Expand only this collapsed face identification back into a bridge"
                      : "This face pair is displayed as a bridge"
                  }
                >
                  Bridge
                </button>
              </div>
            </div>
          )}

        <div
          ref={canvasRef}
          className={
            projectionActive
              ? ""
              : `${styles.canvas} ${
                  isDragging
                    ? styles.canvasDragging
                    : ""
                }`
          }
          onPointerDown={
            projectionActive
              ? undefined
              : beginRotate
          }
          onPointerMove={
            projectionActive
              ? undefined
              : moveRotate
          }
          onPointerUp={
            projectionActive
              ? undefined
              : endRotate
          }
          onPointerCancel={
            projectionActive
              ? undefined
              : endRotate
          }
          onLostPointerCapture={
            projectionActive
              ? undefined
              : endRotate
          }
          onKeyDown={
            projectionActive
              ? undefined
              : handleViewerKeyDown
          }
          onKeyUp={
            projectionActive
              ? undefined
              : handleViewerKeyUp
          }
          onBlur={handleViewerBlur}
          tabIndex={
            projectionActive
              ? -1
              : 0
          }
          aria-label={
            projectionActive
              ? "Embedded Figure-eight S³ Projection Lab"
              : "Interactive manifold viewer. Drag to rotate. Use left and right arrow keys to rotate, and up and down arrow keys to zoom."
          }
          style={
            projectionActive
              ? {
                  /*
                   * Projection Lab owns the complete viewer.
                   *
                   * Deliberately do NOT inherit styles.canvas here:
                   * that class belongs to the constructor SVG and
                   * reserves room for its external control panel.
                   */
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  minWidth: 0,
                  minHeight: 0,
                  overflow: "hidden",
                  zIndex: 1,
                  cursor: "default",
                  touchAction: "auto",
                  userSelect: "none",
                }
              : {
                  cursor:
                    isDragging
                      ? "grabbing"
                      : "grab",
                  touchAction: "none",
                  userSelect: "none",
                }
          }
        >
          <div
            className={
              `${styles.canvasTransform} ${
                projectionCenterMorphActive
                  ? styles.canvasTransformCenterMorph
                  : ""
              }`
            }
            style={
              dimension === "3D" &&
              !projectionActive &&
              !initial3DFrameReady
                ? {
                    visibility:
                      "hidden",
                  }
                : undefined
            }
          >
            {dimension === "1D" && (
              <IntervalViewer
                key={`interval-${resetSceneVersion}`}
                identified={intervalIdentified}
                view={
                  viewWithOpeningScale(
                    viewTransform,
                    OPENING_SCALE_1D
                  )
                }
              />
            )}

            {dimension === "2D" && (
              <TorusViewer
                key={`torus-${resetSceneVersion}`}
                order={torusOrder}
                view={
                  viewWithOpeningScale(
                    viewTransform,
                    OPENING_SCALE_2D
                  )
                }
              />
            )}

            {dimension === "3D" && (
              projectionActive ? (
                <FigureEightProjectionLab
                  key={`projection-lab-${activeManifoldId}-${resetSceneVersion}`}
                  embedded
                  manifoldId={activeManifoldId}

                  controlApiRef={
                    projectionLabControlRef
                  }

                  targetCuspMorph={
                    projectionMode === "cusp"
                      ? 0
                      : 1
                  }

                  controlsPortalTarget={
                    projectionControlsHost
                  }

                  statusPortalTarget={
                    projectionStatusHost
                  }

                  statusRightInset={
                    projectionStatusRightInset
                  }

                  cuspFlatLayout={
                    activeManifold.cuspFlatLayout
                  }

                  cuspFacePairs={
                    activeFacePairs
                  }

                  onCuspFlightTargetChange={
                    handleCuspFlightTargetChange
                  }

                  presentationOpacity={
                    cuspFlightHideProjection
                      ? 0
                      : 1
                  }

                  viewControls={
                    <>
                      <span
                        className={
                          styles.controlLabel
                        }
                        style={{
                          width: "100%",
                          boxSizing:
                            "border-box",
                          marginTop: "8px",
                          paddingTop: "8px",
                          borderTop:
                            "1px solid rgba(232, 223, 200, 0.18)",
                        }}
                      >
                        View
                      </span>

                      <div
                        style={{
                          width: "100%",
                          display: "grid",
                          gridTemplateColumns:
                            "minmax(0, 2fr) minmax(74px, 1fr)",
                          gap: "5px",
                          alignItems: "stretch",
                        }}
                      >
                        <div
                          className={
                            styles.rotationControls
                          }
                          style={{
                            width: "100%",
                            margin: 0,
                            paddingTop: 0,
                            borderTop: 0,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              projectionLabControlRef
                                .current
                                ?.rotate(-1)
                            }
                            aria-label=
                              "Rotate counter-clockwise"
                            title=
                              "Rotate counter-clockwise"
                          >
                            <RotationArrowIcon />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              projectionLabControlRef
                                .current
                                ?.rotate(1)
                            }
                            aria-label=
                              "Rotate clockwise"
                            title=
                              "Rotate clockwise"
                          >
                            <RotationArrowIcon
                              clockwise
                            />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              projectionLabControlRef
                                .current
                                ?.zoom(-1)
                            }
                            aria-label="Zoom out"
                            title="Zoom out"
                          >
                            −
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              projectionLabControlRef
                                .current
                                ?.zoom(1)
                            }
                            aria-label="Zoom in"
                            title="Zoom in"
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          style={{
                            width: "100%",
                            height: "100%",
                            alignSelf: "stretch",
                          }}
                          onClick={() => {
                            projectionLabControlRef
                              .current
                              ?.reset();
                          }}
                        >
                          Reset
                        </button>
                      </div>
                    </>
                  }
                />
              ) : (
                <TruncatedTetrahedraViewer
                  key={`tetrahedra-${resetSceneVersion}`}
                  manifoldId={activeManifoldId}
                  view={viewTransform}
                  autoFit={autoFit3D}
                  onAutoFitZoom={
                    applyAutoFitZoom
                  }
                  facePairSequence={facePairSequence}
                  collapsedBridgePairIds={
                    collapsedBridgePairIds
                  }
                  onPairInteraction={
                    interactWithFacePair
                  }
                  facePairMappingIndices={
                    facePairMappingIndices
                  }

                  /*
                   * Null during all ordinary Cells animations.
                   * Used only for the glued Yellow manifold switch.
                   */
                  corollaryTargetManifoldId={
                    manifoldCorollaryRotation
                      ?.targetManifoldId ??
                    null
                  }
                  corollaryPairId={
                    manifoldCorollaryRotation
                      ?.pairId ??
                    null
                  }
                  corollaryProgress={
                    manifoldCorollaryRotation
                      ?.progress ??
                    0
                  }

                  interiorContinuationPairId={
                    activeMappingPairId
                  }
                  showInterior={showInterior}
                  constructiveFinalDisplayActive={
                    constructiveFinalDisplayActive
                  }
                  showCuspTriangles={showCuspTriangles}
                  extendCusp={extendCusp}
                  assembleCusp={assembleCusp}
                  cuspWrapOrder={cuspWrapOrder}
                  knotViewActive={false}
                  truncationFraction={
                    truncationFraction
                  }
                  cuspMeshFaceCount={
                    cuspMeshFaceCount
                  }
                  onConstructionStateChange={
                    handleConstructionStateChange
                  }

                  onCuspFlightSourceChange={
                    handleCuspFlightSourceChange
                  }

                  presentationOpacity={
                    cuspFlightHideCells
                      ? 0
                      : 1
                  }
                />
              )
            )}

            {cuspFlightActive &&
              cuspFlightSource &&
              (
                cuspFlightTarget ||
                cuspFlightDirection === "toCusp"
              ) &&
              typeof document !== "undefined" &&
              createPortal(
                <svg
                  aria-hidden="true"
                  style={{
                    position: "fixed",
                    inset: 0,
                    width: "100vw",
                    height: "100vh",
                    zIndex: 40,
                    pointerEvents: "none",
                    overflow: "visible",
                  }}
                >
                  {
                    cuspFlightSource
                      .triangles
                      .map(
                        (
                          sourceTriangle
                        ) => {
                          const materialId =
                            sourceTriangle.id;

                          /*
                           * Find the fixed Cusp slot occupied by this
                           * actual material triangle.
                           */
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
                            activeManifoldId === "m003"
                              ? SISTER_CUSP_SLOT_BY_MATERIAL[
                                  materialId
                                ] ??
                                materialId
                              : slotEntry?.[0] ??
                                materialId;

                          const targetTriangle =
                            cuspFlightTarget
                              ?.triangles
                              ?.find(
                                (
                                  triangle
                                ) =>
                                  triangle.slotId ===
                                  slotId
                              ) ??
                            null;

                          const targetLayout =
                            activeManifoldId === "m003"
                              ? null
                              : activeCuspMaterialLayout
                                  .layoutByMaterialId?.[
                                  materialId
                                ];

                          let pointsByCorner;

                          if (
                            !targetTriangle ||
                            (
                              activeManifoldId !== "m003" &&
                              !targetLayout
                            )
                          ) {
                            if (
                              cuspFlightDirection !==
                                "toCusp"
                            ) {
                              return null;
                            }

                            /*
                             * Projection Lab is still mounting.
                             * Keep the copied triangle exactly on
                             * its current Cells truncation face.
                             */
                            pointsByCorner = {
                              ...sourceTriangle
                                .pointsByCorner,
                            };
                          } else {
                            /*
                             * Match every semantic Cells corner to
                             * its exact corresponding Cusp corner.
                             */
                            pointsByCorner =
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
                                      activeManifoldId === "m003"
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
                          }

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

                          /*
                           * Apply the jiggle rotation to the
                           * CORNER MAP itself.
                           *
                           * Therefore the colored edge segments
                           * rotate rigidly with their triangle.
                           */
                          if (
                            Math.abs(
                              cuspFlightTwistDegrees
                            ) > 1e-9
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
                              {/*
                                Preserve the existing dark outline.
                                It keeps the little black separation
                                gaps that make the Cusp readable.
                              */}
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

                              {/*
                                Draw the topological face-color
                                provenance slightly thinner, directly
                                on top of that dark border.
                              */}
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
                                        cuspDisplayEdgeColor(
                                          activeManifoldId,
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
                      )
                  }
                </svg>,
                document.body
              )}

            {projectionActive &&
              projectionMode === "cusp" &&
              !cuspFlightActive &&
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
                    zIndex: 39,
                    pointerEvents: "none",
                    overflow: "visible",
                  }}
                >
                  {
                    cuspFlightTarget
                      .triangles
                      .map(
                        (
                          targetTriangle
                        ) => {
                          const materialId =
                            activeManifoldId === "m003"
                              ? SISTER_CUSP_MATERIAL_BY_SLOT[
                                  targetTriangle.slotId
                                ]
                              : activeCuspMaterialLayout
                                  .materialBySlotId?.[
                                  targetTriangle
                                    .slotId
                                ];

                          const sourceTriangle =
                            cuspFlightSource
                              .triangles
                              .find(
                                (
                                  triangle
                                ) =>
                                  triangle.id ===
                                  materialId
                              );

                          const targetLayout =
                            activeManifoldId === "m003"
                              ? null
                              : activeCuspMaterialLayout
                                  .layoutByMaterialId?.[
                                  materialId
                                ];

                          if (
                            !sourceTriangle ||
                            (
                              activeManifoldId !== "m003" &&
                              !targetLayout
                            )
                          ) {
                            return null;
                          }

                          const pointsByCorner =
                            Object.fromEntries(
                              Object.keys(
                                sourceTriangle
                                  .pointsByCorner
                              ).map(
                                (corner) => {
                                  if (
                                    activeManifoldId === "m003"
                                  ) {
                                    const cornerIndex =
                                      SISTER_CUSP_FIXED_CORNER_INDEX[
                                        materialId
                                      ]?.[
                                        corner
                                      ];

                                    const targetCorner =
                                      Number.isInteger(
                                        cornerIndex
                                      )
                                        ? targetTriangle
                                            .corners[
                                            cornerIndex
                                          ]
                                        : null;

                                    return [
                                      corner,
                                      targetCorner
                                        ?.screen ??
                                      null,
                                    ];
                                  }

                                  const rawTarget =
                                    targetLayout[
                                      corner
                                    ];

                                  if (
                                    !rawTarget
                                  ) {
                                    return [
                                      corner,
                                      null,
                                    ];
                                  }

                                  const targetCorner =
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

                                  return [
                                    corner,
                                    targetCorner
                                      ?.screen ??
                                      null,
                                  ];
                                }
                              )
                            );

                          return (
                            <g
                              key={
                                targetTriangle
                                  .slotId
                              }
                            >
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
                                      key={`${targetTriangle.slotId}-edge-${edgeIndex}`}
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
                                        cuspDisplayEdgeColor(
                                          activeManifoldId,
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
                      )
                  }
                </svg>,
                document.body
              )}
          </div>
        </div>

        {!projectionActive && (
          <div
            className={styles.status}
            role="status"
            aria-live="polite"
            style={{
              "--status-accent":
                dimension === "3D" &&
                !showCuspTriangles &&
                faceConstructionState
                  ? faceConstructionState.textAccent
                  : undefined,

              width: "max-content",

              maxWidth:
                "calc(100% - 36px)",

              boxSizing:
                "border-box",
            }}
          >
            <div
              className={styles.statusPrimary}
            >
              {
                dimension === "3D" &&
                cellsEntryHintVisible
                  ? "drag to rotate · scroll to zoom"
                  : status
              }
            </div>

            {dimension === "3D" &&
              !cellsEntryHintVisible &&
              !showCuspTriangles &&
              faceConstructionState && (
                <div
                  className={
                    styles.statusSecondary
                  }
                >
                  <span
                    className={
                      styles.statusAccent
                    }
                  >
                    {
                      faceConstructionState.status
                    }
                  </span>

                  <span>
                    {" · "}
                    {
                      faceConstructionState.detail
                    }
                  </span>
                </div>
              )}
          </div>
        )}
      </section>
    </RootElement>
  );
}
