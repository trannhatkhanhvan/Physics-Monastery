"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styles from "./ClosedManifoldViewer.module.css";
import TruncatedTetrahedraViewer, {
  CYCLIC_FACE_MAPPING_CHOICES,
  FACE_MAPPING_DURATION_MS,
  DEFAULT_TETRAHEDRON_SEPARATION,
  DEFAULT_TRUNCATION_FRACTION,
  FIGURE_EIGHT_FACE_PAIRS,
  MAX_TETRAHEDRON_SEPARATION,
  MAX_TRUNCATION_FRACTION,
  MIN_TETRAHEDRON_SEPARATION,
  MIN_TRUNCATION_FRACTION,
  SEAM_TRANSITION_DURATION_MS,
} from "./TruncatedTetrahedraViewer";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

const IDENTITY_ROTATION = [
  1, 0, 0,
  0, 1, 0,
  0, 0, 1,
];

const DEFAULT_VIEW = {
  rotation: IDENTITY_ROTATION,
  zoom: 0.77,
};

const DRAG_ROTATION_SPEED = 0.006;
const MIN_ZOOM = 0.28;
const MAX_ZOOM = 1.9;

const AUTO_ROTATION_HALF_TURN_MS = 10000;
const ROTATION_SINGLE_CLICK_DELAY_MS = 280;

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
}) {
  const [dimension, setDimension] = useState("1D");
  const [intervalIdentified, setIntervalIdentified] =
    useState(false);
  const [torusOrder, setTorusOrder] = useState([]);
  const [facePairSequence, setFacePairSequence] =
    useState([]);
  const [
    activeSeamPairId,
    setActiveSeamPairId,
  ] = useState(null);
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
      FIGURE_EIGHT_FACE_PAIRS.map(
        () => 0
      )
  );
  const [showCuspTriangles, setShowCuspTriangles] =
    useState(false);
  const [assembleCusp, setAssembleCusp] =
    useState(false);
  const [cuspWrapOrder, setCuspWrapOrder] =
    useState([]);
  const [
    cuspRelaxationActive,
    setCuspRelaxationActive,
  ] = useState(false);
  const [
    cuspSpringLog10,
    setCuspSpringLog10,
  ] = useState(0);
  const [
    truncationFraction,
    setTruncationFraction,
  ] = useState(
    DEFAULT_TRUNCATION_FRACTION
  );
  const [
    tetrahedronSeparation,
    setTetrahedronSeparation,
  ] = useState(
    DEFAULT_TETRAHEDRON_SEPARATION
  );
  const [viewTransform, setViewTransform] = useState(() => ({
    ...DEFAULT_VIEW,
  }));
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef(null);

  const viewerRef = useRef(null);
  const [
    resetSceneVersion,
    setResetSceneVersion,
  ] = useState(0);
  const identificationControlsRef =
    useRef(null);
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

  const [
    autoRotationDirection,
    setAutoRotationDirection,
  ] = useState(0);

  const rotationClickTimerRef = useRef(null);
  const seamTransitionTimerRef = useRef(null);

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
    return () => {
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
    };
  }, []);

  function identifyTorusPair(pair) {
    setTorusOrder((currentOrder) =>
      currentOrder.includes(pair)
        ? currentOrder
        : [...currentOrder, pair]
    );
  }

  function beginSeamTransition(
    nextSeamPairId
  ) {
    if (
      seamTransitionTimerRef.current !== null
    ) {
      window.clearTimeout(
        seamTransitionTimerRef.current
      );
    }

    setActiveSeamPairId(
      nextSeamPairId
    );

    setSeamTransitioning(true);

    seamTransitionTimerRef.current =
      window.setTimeout(() => {
        seamTransitionTimerRef.current = null;
        setSeamTransitioning(false);
      }, SEAM_TRANSITION_DURATION_MS + 50);
  }

  function interactWithFacePair(pairId) {
    /*
     * Face-pair controls remain live at every later viewing
     * stage. Opening or adding a bridge must not tear down the
     * cusp collars, cylinder, torus, or relaxation state.
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
    if (
      seamTransitioning ||
      !facePairSequence.includes(pairId)
    ) {
      return;
    }

    if (nextState === "bridge") {
      if (activeSeamPairId === pairId) {
        beginSeamTransition(null);
      }

      return;
    }

    if (
      nextState === "collapsed" &&
      activeSeamPairId === null
    ) {
      beginSeamTransition(pairId);
    }
  }

  function selectFacePairMapping(
    pairId,
    mappingIndex
  ) {
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
    /*
     * Cusp controls are available independently once
     * the cusp triangles are visible. Selecting either
     * boundary also activates the assembled domain so
     * the rendering state remains coherent.
     */
    setAssembleCusp(true);
    setCuspRelaxationActive(false);

    setCuspWrapOrder((currentOrder) =>
      currentOrder.includes(boundary)
        ? currentOrder
        : [...currentOrder, boundary]
    );
  }

  function rotateView(degrees) {
    const angle =
      (degrees * Math.PI) / 180;

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
     * Wait briefly before applying the 15-degree
     * step so a double-click can cancel it cleanly.
     */
    rotationClickTimerRef.current =
      window.setTimeout(() => {
        rotationClickTimerRef.current = null;
        setAutoRotationDirection(0);
        rotateView(direction * 15);
      }, ROTATION_SINGLE_CLICK_DELAY_MS);
  }

  function handleRotationDoubleClick(direction) {
    cancelPendingRotationClick();

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

    cancelPendingRotationClick();
    setAutoRotationDirection(0);

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

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;

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

    setViewTransform((current) => ({
      ...current,
      /*
       * Both drag axes are screen-relative:
       * horizontal drag uses screen vertical, and
       * vertical drag uses screen horizontal.
       */
      rotation: multiplyRotations(
        dragRotation,
        drag.startRotation
      ),
    }));
  }

  function endRotate(event) {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
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

  function resetCurrent() {
    cancelPendingRotationClick();
    setAutoRotationDirection(0);

    if (dimension === "1D") {
      setIntervalIdentified(false);
    }

    if (dimension === "2D") {
      setTorusOrder([]);
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
      setFacePairSequence([]);
      setActiveSeamPairId(null);
      setActiveMappingPairId(null);
      setFacePairMappingIndices(
        FIGURE_EIGHT_FACE_PAIRS.map(
          () => 0
        )
      );
      setShowCuspTriangles(false);
      setAssembleCusp(false);
      setCuspWrapOrder([]);
      setCuspRelaxationActive(false);
      setCuspSpringLog10(0);
      setFaceConstructionState(null);
      setTruncationFraction(
        DEFAULT_TRUNCATION_FRACTION
      );
      setTetrahedronSeparation(
        DEFAULT_TETRAHEDRON_SEPARATION
      );
    }

    setViewTransform({ ...DEFAULT_VIEW });
    setResetSceneVersion(
      (currentVersion) =>
        currentVersion + 1
    );
  }

  function undoCurrent() {
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

      if (cuspRelaxationActive) {
        setCuspRelaxationActive(false);
      } else if (cuspWrapOrder.length > 0) {
        setCuspWrapOrder((currentOrder) =>
          currentOrder.slice(0, -1)
        );
      } else if (assembleCusp) {
        setAssembleCusp(false);
      } else if (showCuspTriangles) {
        setShowCuspTriangles(false);
      } else {
        const nextSequence =
          facePairSequence.slice(
            0,
            -1
          );

        setFacePairSequence(
          nextSequence
        );

        setActiveSeamPairId(
          (currentSeamPairId) =>
            currentSeamPairId !== null &&
            nextSequence.includes(
              currentSeamPairId
            )
              ? currentSeamPairId
              : null
        );

        setActiveMappingPairId(null);
      }
    }
  }

  const facePairSequenceLabel =
    facePairSequence
      .map(
        (pairId) =>
          FIGURE_EIGHT_FACE_PAIRS[
            pairId
          ].label.replace(
            " faces",
            ""
          )
      )
      .join(" → ");

  const faceIdentificationComplete =
    facePairSequence.length ===
    FIGURE_EIGHT_FACE_PAIRS.length;

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
        : showCuspTriangles
          ? cuspWrapOrder.length === 2
            ? cuspRelaxationActive
              ? `Cusp torus: internal collars relaxed at spring k = 10^${cuspSpringLog10.toFixed(1)}`
              : "Cusp torus: meridian and longitude identified"
            : cuspWrapOrder.length === 1
              ? cuspWrapOrder[0] === "long"
                ? "Cusp cylinder: meridian identified"
                : "Cusp cylinder: longitude identified"
              : assembleCusp
                ? "Cusp fundamental domain: eight triangles assembled into one parallelogram"
                : "Cusp boundary: eight truncation triangles with twelve induced edge identifications"
          : facePairSequence.length === 0
            ? "Two truncated tetrahedra: choose a face identification"
            : faceIdentificationComplete
              ? `Face identifications complete 4/4: ${facePairSequenceLabel}. Extract the cusp triangles next.`
              : `Face-identification sequence ${facePairSequence.length}/4: ${facePairSequenceLabel}`;

  const activeMappingPair =
    activeMappingPairId === null
      ? null
      : FIGURE_EIGHT_FACE_PAIRS[
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
    activeSeamPairId ===
      activeMappingPairId;

  const activeMappingPairCollapseBlocked =
    !activeMappingPairInSequence ||
    seamTransitioning ||
    (
      activeSeamPairId !== null &&
      activeSeamPairId !==
        activeMappingPairId
    );

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
      <h1>Closed manifold identifications</h1>

      <section
        ref={viewerRef}
        className={styles.viewer}
      >
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
                setDimension(option);
                setActiveMappingPairId(null);
              }}
            >
              {option}
            </button>
          ))}
        </div>

        <div
          ref={identificationControlsRef}
          className={styles.identificationControls}
        >
          <span className={styles.controlLabel}>
            Identifications
          </span>

          {dimension === "1D" && (
            <button
              type="button"
              className={styles.yellowButton}
              onClick={() => setIntervalIdentified(true)}
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

          {dimension === "3D" && (
            <>
              {FIGURE_EIGHT_FACE_PAIRS.map(
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

                  const isPhysicalSeam =
                    activeSeamPairId ===
                    pair.id;

                  const mappingIndex =
                    facePairMappingIndices[
                      pair.id
                    ] ?? 0;

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
                          isPhysicalSeam
                            ? styles.seamedFacePairButton
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() =>
                          interactWithFacePair(
                            pair.id
                          )
                        }
                        aria-expanded={
                          isActiveMappingPair
                        }
                        aria-controls={
                          isActiveMappingPair
                            ? "face-pair-mapping-popover"
                            : undefined
                        }
                        title={
                          !isInSequence
                            ? `${pair.description}. Click to add this identification as a bridge and open its controls.`
                            : `Step ${sequenceIndex + 1}: ${pair.description}. Click to ${isActiveMappingPair ? "close" : "open"} its vertex-map and bridge-state controls.`
                        }
                        style={{
                          borderColor:
                            pair.color,
                          color: pair.color,
                        }}
                      >
                        <span
                          className={
                            styles.facePairButtonContent
                          }
                        >
                          <span>
                            {pair.label}
                          </span>

                          {isInSequence && (
                            <FaceMappingAngleIndicator
                              mappingIndex={
                                mappingIndex
                              }
                              pairLabel={
                                pair.label
                              }
                            />
                          )}
                        </span>
                      </button>

                    </div>
                  );
                }
              )}

              <button
                type="button"
                onClick={() => {
                  const next =
                    !showCuspTriangles;

                  /*
                   * The cusp boundary is an independent
                   * view of the truncation triangles and
                   * may be opened at any stage. Preserve
                   * any face-identification sequence.
                   */
                  setShowCuspTriangles(next);
                  setActiveMappingPairId(null);
                  setAssembleCusp(false);
                  setCuspWrapOrder([]);
                  setCuspRelaxationActive(false);
                }}
                aria-pressed={showCuspTriangles}
                title={
                  showCuspTriangles
                    ? "Return to the truncated tetrahedra"
                    : "Show the eight cusp triangles and activate the cusp controls"
                }
                style={{
                  borderColor:
                    "rgba(232, 223, 200, 0.72)",
                  color:
                    "rgba(232, 223, 200, 0.92)",
                }}
              >
                Cusp triangles
              </button>

              <button
                type="button"
                onClick={() => {
                  const next = !assembleCusp;

                  setAssembleCusp(next);

                  if (!next) {
                    setCuspWrapOrder([]);
                  }

                  setCuspRelaxationActive(false);
                }}
                disabled={!showCuspTriangles}
                aria-pressed={assembleCusp}
                title="Assemble the eight triangles into a cusp-torus fundamental parallelogram"
                style={{
                  borderColor:
                    "rgba(232, 223, 200, 0.72)",
                  color:
                    "rgba(232, 223, 200, 0.92)",
                }}
              >
                Assemble cusp
              </button>

              <button
                type="button"
                onClick={() =>
                  identifyCuspBoundary("long")
                }
                disabled={
                  !showCuspTriangles ||
                  cuspWrapOrder.includes(
                    "long"
                  )
                }
                aria-pressed={
                  cuspWrapOrder.includes(
                    "long"
                  )
                }
                title="Identify the meridian by joining the composite long boundary paths: red double hash, green single hash, green triple hash, and red single hash"
                style={{
                  borderColor:
                    "rgba(232, 223, 200, 0.72)",
                  color:
                    "rgba(232, 223, 200, 0.92)",
                }}
              >
                Meridian
              </button>

              <button
                type="button"
                onClick={() =>
                  identifyCuspBoundary("short")
                }
                disabled={
                  !showCuspTriangles ||
                  cuspWrapOrder.includes(
                    "short"
                  )
                }
                aria-pressed={
                  cuspWrapOrder.includes(
                    "short"
                  )
                }
                title="Identify the longitude by joining the two green double-hash short sides"
                style={{
                  borderColor:
                    "rgba(232, 223, 200, 0.72)",
                  color:
                    "rgba(232, 223, 200, 0.92)",
                }}
              >
                Longitude
              </button>

              <button
                type="button"
                onClick={() =>
                  setCuspRelaxationActive(
                    (current) => !current
                  )
                }
                disabled={
                  !showCuspTriangles ||
                  cuspWrapOrder.length !== 2
                }
                aria-pressed={
                  cuspRelaxationActive
                }
                title={
                  cuspRelaxationActive
                    ? "Return the internal cusp collars to their routed construction"
                    : "Relax only the internal cusp-collar routes while keeping the cusp torus and attachments fixed"
                }
                style={{
                  borderColor:
                    "rgba(232, 223, 200, 0.72)",
                  color:
                    "rgba(232, 223, 200, 0.92)",
                }}
              >
                Relax
              </button>
            </>
          )}

          {dimension === "3D" &&
            showCuspTriangles &&
            cuspWrapOrder.length === 2 && (
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
                    htmlFor="cusp-spring-stiffness"
                    className={
                      styles.truncationLabel
                    }
                  >
                    Spring k
                  </label>

                  <output
                    htmlFor="cusp-spring-stiffness"
                    className={
                      styles.truncationValue
                    }
                  >
                    {`10^${cuspSpringLog10.toFixed(1)}`}
                  </output>
                </div>

                <input
                  id="cusp-spring-stiffness"
                  type="range"
                  min="-8"
                  max="4"
                  step="0.1"
                  value={cuspSpringLog10}
                  onChange={(event) =>
                    setCuspSpringLog10(
                      clamp(
                        Number(
                          event.target.value
                        ),
                        -8,
                        4
                      )
                    )
                  }
                  aria-label="Logarithm base ten of cusp-collar spring stiffness"
                  aria-valuetext={`Spring stiffness 10 to the ${cuspSpringLog10.toFixed(1)}`}
                />

                <div
                  className={
                    styles.truncationScale
                  }
                  aria-hidden="true"
                >
                  <span>10^-8</span>
                  <span>10^4</span>
                </div>
              </div>
            )}

          {dimension === "3D" && (
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
                <span>8.7%</span>
                <span>33.3%</span>
              </div>
            </div>
          )}

          {dimension === "3D" && (
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
                  htmlFor="tetrahedron-separation"
                  className={
                    styles.truncationLabel
                  }
                >
                  Separation
                </label>

                <output
                  htmlFor="tetrahedron-separation"
                  className={
                    styles.truncationValue
                  }
                >
                  {Math.round(
                    tetrahedronSeparation
                  )}
                </output>
              </div>

              <input
                id="tetrahedron-separation"
                type="range"
                min={
                  MIN_TETRAHEDRON_SEPARATION
                }
                max={
                  MAX_TETRAHEDRON_SEPARATION
                }
                step="5"
                value={
                  tetrahedronSeparation
                }
                onChange={(event) =>
                  setTetrahedronSeparation(
                    clamp(
                      Number(
                        event.target.value
                      ),
                      MIN_TETRAHEDRON_SEPARATION,
                      MAX_TETRAHEDRON_SEPARATION
                    )
                  )
                }
                aria-label="Initial center-to-center separation of the two tetrahedra"
                aria-valuetext={`${Math.round(
                  tetrahedronSeparation
                )} model units between tetrahedron centers`}
              />

              <div
                className={
                  styles.truncationScale
                }
                aria-hidden="true"
              >
                <span>
                  {
                    MIN_TETRAHEDRON_SEPARATION
                  }
                </span>
                <span>
                  {
                    MAX_TETRAHEDRON_SEPARATION
                  }
                </span>
              </div>
            </div>
          )}

          <div
            className={styles.rotationControls}
            aria-label="Rotation controls"
          >
            <button
              type="button"
              onClick={() =>
                handleRotationClick(-1)
              }
              onDoubleClick={() =>
                handleRotationDoubleClick(-1)
              }
              aria-pressed={
                autoRotationDirection === -1
              }
              aria-label="Rotate counter-clockwise around the current screen vertical axis"
              title={
                autoRotationDirection === -1
                  ? "Double-click to stop counter-clockwise rotation"
                  : "Click for 15 degrees. Double-click for continuous counter-clockwise rotation."
              }
            >
              <RotationArrowIcon />
            </button>

            <button
              type="button"
              onClick={() =>
                handleRotationClick(1)
              }
              onDoubleClick={() =>
                handleRotationDoubleClick(1)
              }
              aria-pressed={
                autoRotationDirection === 1
              }
              aria-label="Rotate clockwise around the current screen vertical axis"
              title={
                autoRotationDirection === 1
                  ? "Double-click to stop clockwise rotation"
                  : "Click for 15 degrees. Double-click for continuous clockwise rotation."
              }
            >
              <RotationArrowIcon clockwise />
            </button>

            <button
              type="button"
              onClick={() => zoomView(-0.1)}
              aria-label="Zoom out"
              title="Zoom out"
            >
              −
            </button>

            <button
              type="button"
              onClick={() => zoomView(0.1)}
              aria-label="Zoom in"
              title="Zoom in"
            >
              +
            </button>
          </div>

          <div className={styles.utilityControls}>
            <button
              type="button"
              onClick={undoCurrent}
              disabled={
                dimension === "1D"
                  ? !intervalIdentified
                  : dimension === "2D"
                    ? torusOrder.length === 0
                    : facePairSequence.length === 0 &&
                      !showCuspTriangles
              }
            >
              Undo
            </button>

            <button
              type="button"
              onClick={resetCurrent}
            >
              Reset
            </button>
          </div>
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
                      ? "This face pair is the collapsed physical seam"
                      : activeSeamPairId === null
                        ? "Collapse this bridge into the physical seam"
                        : "Expand the current seam before collapsing this bridge"
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
                      ? "Expand this collapsed seam into a bridge"
                      : "This face pair is displayed as a bridge"
                  }
                >
                  Bridge
                </button>
              </div>
            </div>
          )}

        <div
          className={`${styles.canvas} ${
            isDragging ? styles.canvasDragging : ""
          }`}
          onPointerDown={beginRotate}
          onPointerMove={moveRotate}
          onPointerUp={endRotate}
          onPointerCancel={endRotate}
          onLostPointerCapture={endRotate}
          onWheel={handleWheel}
          onKeyDown={handleViewerKeyDown}
          onKeyUp={handleViewerKeyUp}
          onBlur={handleViewerBlur}
          tabIndex={0}
          aria-label="Interactive manifold viewer. Drag to rotate. Use left and right arrow keys to rotate, and up and down arrow keys to zoom."
          style={{
            cursor: isDragging ? "grabbing" : "grab",
            touchAction: "none",
            userSelect: "none",
          }}
          title="Drag to rotate in 3D. Scroll to zoom."
        >
          <div className={styles.canvasTransform}>
            {dimension === "1D" && (
              <IntervalViewer
                key={`interval-${resetSceneVersion}`}
                identified={intervalIdentified}
                view={viewTransform}
              />
            )}

            {dimension === "2D" && (
              <TorusViewer
                key={`torus-${resetSceneVersion}`}
                order={torusOrder}
                view={viewTransform}
              />
            )}

            {dimension === "3D" && (
              <TruncatedTetrahedraViewer
                key={`tetrahedra-${resetSceneVersion}`}
                view={viewTransform}
                facePairSequence={facePairSequence}
                activeSeamPairId={
                  activeSeamPairId
                }
                onPairInteraction={
                  interactWithFacePair
                }
                facePairMappingIndices={
                  facePairMappingIndices
                }
                showCuspTriangles={showCuspTriangles}
                assembleCusp={assembleCusp}
                cuspWrapOrder={cuspWrapOrder}
                cuspRelaxationActive={
                  cuspRelaxationActive
                }
                cuspSpringLog10={
                  cuspSpringLog10
                }
                truncationFraction={
                  truncationFraction
                }
                tetrahedronSeparation={
                  tetrahedronSeparation
                }
                onConstructionStateChange={
                  setFaceConstructionState
                }
              />
            )}
          </div>
        </div>

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
          }}
        >
          <div
            className={styles.statusPrimary}
          >
            {status}
          </div>

          {dimension === "3D" &&
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
      </section>
    </RootElement>
  );
}
