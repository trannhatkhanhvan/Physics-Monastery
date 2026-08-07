"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  analyzeSurfaceContacts,
  analyzeSweptSurfaceContacts,
  collectSurfaceBarrierContacts,
} from "./surfaceCollisionDiagnostics";

const SCALE = 118;
export const DEFAULT_TRUNCATION_FRACTION = 0.26;
export const MIN_TRUNCATION_FRACTION = 0.08;
export const MAX_TRUNCATION_FRACTION = 0.33;
export const DEFAULT_TETRAHEDRON_SEPARATION = 600;
export const MIN_TETRAHEDRON_SEPARATION =
  DEFAULT_TETRAHEDRON_SEPARATION;
export const MAX_TETRAHEDRON_SEPARATION = 900;

function normalizeTruncationFraction(
  value
) {
  const numericValue =
    Number.isFinite(value)
      ? value
      : DEFAULT_TRUNCATION_FRACTION;

  return Math.max(
    MIN_TRUNCATION_FRACTION,
    Math.min(
      MAX_TRUNCATION_FRACTION,
      numericValue
    )
  );
}

function normalizeTetrahedronSeparation(
  value
) {
  const numericValue =
    Number.isFinite(value)
      ? value
      : DEFAULT_TETRAHEDRON_SEPARATION;

  return Math.max(
    MIN_TETRAHEDRON_SEPARATION,
    Math.min(
      MAX_TETRAHEDRON_SEPARATION,
      numericValue
    )
  );
}

export const SEAM_TRANSITION_DURATION_MS = 4000;
const PAIRING_DURATION_MS = 1800;
const FIRST_FACE_ROTATION_END = 0.34;
const FIRST_FACE_ORBIT_END = 0.72;
const SECOND_FACE_BRIDGE_SEGMENTS = 56;
const SECOND_FACE_BRIDGE_ARC_SAMPLES = 320;
const SECOND_FACE_BRIDGE_COLLAR = 72;
const SECOND_FACE_BRIDGE_COLLAR_FRACTION = 0.2;
const SECOND_FACE_BRIDGE_ARCH = 300;
const SECOND_FACE_BRIDGE_MID_SCALE = 0.44;
const SECOND_FACE_BRIDGE_FULL_STRENGTH = 0.995;
export const FACE_MAPPING_DURATION_MS = 1100;
const BRIDGE_ROUTE_CHANGE_DURATION_MS = 1100;
const BRIDGE_TRANSITION_RETRACT_END = 0.22;
const BRIDGE_TRANSITION_REATTACH_START = 0.78;
const BRIDGE_ROUTE_CHANGE_PENALTY = 100000;
const BRIDGE_ROUTE_SWEEP_SAMPLE_COUNT = 9;
const BRIDGE_ATTACHMENT_AUDIT_SEGMENT_WINDOW = 2;
const BRIDGE_ROUTE_SWEEP_CLEARANCE = 180;
const BRIDGE_ROUTE_SWEEP_CLEARANCE_PENALTY = 24000;
const BRIDGE_ROUTE_SWEEP_FAILURE_PENALTY = 500000;
const BRIDGE_SWEEP_ROUTE_CACHE_LIMIT = 64;
const BRIDGE_SWEEP_ROUTE_CACHE = new Map();
const BRIDGE_AUDIT_EPSILON = 1e-6;
/*
 * Triangles within this many longitudinal strips belong
 * to one local patch of the same bridge surface. Testing
 * them as independent surfaces creates false positives
 * where a curved or twisting collar folds its triangulation
 * closely around adjacent rings.
 */
const BRIDGE_AUDIT_LOCAL_SEGMENT_WINDOW = 3;
const BRIDGE_AUDIT_MAX_HITS = 16;
const BRIDGE_AUDIT_CACHE_LIMIT = 256;
const BRIDGE_AUDIT_CACHE = new Map();
const BRIDGE_ROUTE_SELECTION_CACHE_LIMIT = 256;
const BRIDGE_ROUTE_SELECTION_CACHE = new Map();

const DEFAULT_BRIDGE_ROUTE_SPEC =
  Object.freeze({
    id: "radial-exterior",
    kind: "c2-radial-arch",
    family: "exterior",
    lane: 0,
    archDistance:
      SECOND_FACE_BRIDGE_ARCH,
    lateralOffset: 0,
  });

/*
 * The one reusable bridge for faces that do not already
 * share an edge in the quotient. It uses the same arch
 * scale as the edge-adjacent bridge, with one moderate
 * lateral displacement to clear the existing complex.
 */
const NONADJACENT_BRIDGE_ROUTE_SPEC =
  Object.freeze({
    id: "nonadjacent-exterior",
    kind: "c2-offset-arch",
    family: "exterior",
    lane: 1,
    archDistance:
      SECOND_FACE_BRIDGE_ARCH,
    lateralOffset: 220,
  });

const BRIDGE_ROUTE_CANDIDATE_SPECS =
  Object.freeze([
    Object.freeze({
      ...DEFAULT_BRIDGE_ROUTE_SPEC,
      bridgeType: "edge-adjacent",
    }),
    Object.freeze({
      id: "edge-adjacent-positive-inner",
      kind: "c2-offset-arch",
      family: "exterior",
      bridgeType: "edge-adjacent",
      lane: 1,
      archDistance:
        SECOND_FACE_BRIDGE_ARCH,
      lateralOffset: 180,
    }),
    Object.freeze({
      id: "edge-adjacent-negative-inner",
      kind: "c2-offset-arch",
      family: "exterior",
      bridgeType: "edge-adjacent",
      lane: 2,
      archDistance:
        SECOND_FACE_BRIDGE_ARCH,
      lateralOffset: -180,
    }),
    Object.freeze({
      id: "edge-adjacent-positive-outer",
      kind: "c2-offset-arch",
      family: "exterior",
      bridgeType: "edge-adjacent",
      lane: 3,
      archDistance:
        SECOND_FACE_BRIDGE_ARCH,
      lateralOffset: 320,
    }),
    Object.freeze({
      id: "edge-adjacent-negative-outer",
      kind: "c2-offset-arch",
      family: "exterior",
      bridgeType: "edge-adjacent",
      lane: 4,
      archDistance:
        SECOND_FACE_BRIDGE_ARCH,
      lateralOffset: -320,
    }),
    Object.freeze({
      ...NONADJACENT_BRIDGE_ROUTE_SPEC,
      bridgeType: "nonadjacent",
    }),
    Object.freeze({
      id: "nonadjacent-negative-inner",
      kind: "c2-offset-arch",
      family: "exterior",
      bridgeType: "nonadjacent",
      lane: 6,
      archDistance:
        SECOND_FACE_BRIDGE_ARCH,
      lateralOffset: -220,
    }),
    Object.freeze({
      id: "nonadjacent-positive-outer",
      kind: "c2-offset-arch",
      family: "exterior",
      bridgeType: "nonadjacent",
      lane: 7,
      archDistance:
        SECOND_FACE_BRIDGE_ARCH,
      lateralOffset: 360,
    }),
    Object.freeze({
      id: "nonadjacent-negative-outer",
      kind: "c2-offset-arch",
      family: "exterior",
      bridgeType: "nonadjacent",
      lane: 8,
      archDistance:
        SECOND_FACE_BRIDGE_ARCH,
      lateralOffset: -360,
    }),
    Object.freeze({
      id: "nonadjacent-center",
      kind: "c2-radial-arch",
      family: "exterior",
      bridgeType: "nonadjacent",
      lane: 9,
      archDistance:
        SECOND_FACE_BRIDGE_ARCH,
      lateralOffset: 0,
    }),
  ]);

const CUSP_ASSEMBLY_DURATION_MS = 1350;
const CUSP_WRAP_DURATION_MS = 2100;
const CUSP_FLAT_UNIT = 90;
const CUSP_LONG_CYLINDER_RADIUS = 88;
const CUSP_LONG_CYLINDER_LENGTH = 340;
const CUSP_SHORT_CYLINDER_RADIUS = 145;
const CUSP_SHORT_CYLINDER_LENGTH = 185;
const CUSP_TORUS_MAJOR_RADIUS = 175;
const CUSP_TORUS_MINOR_RADIUS = 72;
const CUSP_MESH_DIVISIONS = 8;
const CUSP_EDGE_SAMPLES = 24;
const CUSP_CENTER_SAMPLES = 24;
const CUSP_HEIGHT = Math.sqrt(3) / 2;
const CUSP_COLLAR_LENGTH = 177;
const CUSP_COLLAR_LOCAL_SEGMENTS = 3;
const CUSP_COLLAR_ROUTE_SEGMENTS = 20;
const CUSP_COLLAR_ROUTE_DEPARTURE = 420;
const CUSP_COLLAR_ROUTE_APPROACH = 560;
const CUSP_COLLAR_ROUTE_LANE_SPACING = 70;
const CUSP_COLLAR_SHAPE_MORPH_START = 0.62;
const CUSP_BOUNDARY_WORLD_SCALE = 12;
const CUSP_BOUNDARY_OVERVIEW_ZOOM = 0.15;
const DEFAULT_PERSPECTIVE_DISTANCE = 950;

/*
 * A connected planar development of all eight cusp
 * triangles. The remaining boundary edges are paired
 * by the two translations of this parallelogram.
 *
 * Each inner key is the neighboring ideal vertex
 * represented by that corner of the cusp triangle.
 */
const CUSP_FLAT_LAYOUT = {
  A0: {
    1: { x: 0, y: 0 },
    2: { x: 1, y: 0 },
    3: { x: 0.5, y: CUSP_HEIGHT },
  },
  B0: {
    1: { x: 0, y: 0 },
    3: { x: 1, y: 0 },
    2: { x: 0.5, y: -CUSP_HEIGHT },
  },
  B3: {
    2: { x: 0, y: 0 },
    1: { x: 0.5, y: CUSP_HEIGHT },
    0: { x: -0.5, y: CUSP_HEIGHT },
  },
  A3: {
    1: { x: 0.5, y: -CUSP_HEIGHT },
    2: { x: 1, y: 0 },
    0: { x: 1.5, y: -CUSP_HEIGHT },
  },
  A2: {
    0: { x: -0.5, y: CUSP_HEIGHT },
    1: { x: 0.5, y: CUSP_HEIGHT },
    3: { x: 0, y: 2 * CUSP_HEIGHT },
  },
  B1: {
    3: { x: 1.5, y: -CUSP_HEIGHT },
    2: { x: 0.5, y: -CUSP_HEIGHT },
    0: { x: 1, y: -2 * CUSP_HEIGHT },
  },
  A1: {
    0: { x: 1, y: -2 * CUSP_HEIGHT },
    2: { x: 1.5, y: -CUSP_HEIGHT },
    3: { x: 2, y: -2 * CUSP_HEIGHT },
  },
  B2: {
    3: { x: 1, y: -2 * CUSP_HEIGHT },
    1: { x: 2, y: -2 * CUSP_HEIGHT },
    0: { x: 1.5, y: -3 * CUSP_HEIGHT },
  },
};

const CUSP_DOMAIN_CORNERS = [
  { x: -0.5, y: CUSP_HEIGHT },
  { x: 0, y: 2 * CUSP_HEIGHT },
  { x: 2, y: -2 * CUSP_HEIGHT },
  { x: 1.5, y: -3 * CUSP_HEIGHT },
];

const VERTICES = [
  { x: 1, y: 1, z: 1 },
  { x: -1, y: -1, z: 1 },
  { x: -1, y: 1, z: -1 },
  { x: 1, y: -1, z: -1 },
];

const TRUNCATION_NEIGHBORS = [
  [2, 1, 3],
  [0, 2, 3],
  [0, 3, 1],
  [2, 0, 1],
];

export const FIGURE_EIGHT_FACE_PAIRS = [
  {
    id: 0,
    label: "Orange faces",
    color: "#ffb000",
    description: "A(123) ↔ B(124)",
    A: [0, 1, 2],
    B: [0, 1, 3],
  },
  {
    id: 1,
    label: "Blue faces",
    color: "#4da3ff",
    description: "A(124) ↔ B(432)",
    A: [0, 1, 3],
    B: [3, 2, 1],
  },
  {
    id: 2,
    label: "Green faces",
    color: "#32e676",
    description: "A(134) ↔ B(132)",
    A: [0, 2, 3],
    B: [0, 2, 1],
  },
  {
    id: 3,
    label: "Red faces",
    color: "#ff2020",
    description: "A(234) ↔ B(341)",
    A: [1, 2, 3],
    B: [2, 3, 0],
  },
];

export const CYCLIC_FACE_MAPPING_CHOICES = [
  {
    id: 0,
    label: "0°",
    description:
      "Canonical vertex correspondence",
    vertexPermutation: [0, 1, 2],
    hexagonShift: 0,
  },
  {
    id: 1,
    label: "120°",
    description:
      "Cyclic vertex shift by one",
    vertexPermutation: [1, 2, 0],
    hexagonShift: 2,
  },
  {
    id: 2,
    label: "240°",
    description:
      "Cyclic vertex shift by two",
    vertexPermutation: [2, 0, 1],
    hexagonShift: 4,
  },
];

const TETRAHEDRA = [
  {
    id: "A",
    center: { x: -205, y: 0, z: 0 },
    rotation: { x: -0.28, y: -0.5, z: 0.16 },
  },
  {
    id: "B",
    center: { x: 205, y: 0, z: 0 },
    rotation: { x: 0.28, y: 0.5, z: -0.16 },
  },
];

function tetrahedraAtSeparation(
  separation
) {
  const halfSeparation =
    normalizeTetrahedronSeparation(
      separation
    ) / 2;

  return TETRAHEDRA.map(
    (tetrahedron, index) => ({
      ...tetrahedron,
      center: {
        ...tetrahedron.center,
        x:
          index === 0
            ? -halfSeparation
            : halfSeparation,
      },
    })
  );
}

function lerpPoint(a, b, amount) {
  return {
    x: a.x + (b.x - a.x) * amount,
    y: a.y + (b.y - a.y) * amount,
    z: a.z + (b.z - a.z) * amount,
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

function useFacePairStrengths(
  facePairSequence
) {
  const sequenceKey =
    facePairSequence.join(",");

  const initialStrengths =
    FIGURE_EIGHT_FACE_PAIRS.map(
      (pair) =>
        facePairSequence.includes(
          pair.id
        )
          ? 1
          : 0
    );

  const [state, setState] =
    useState(() => ({
      strengths:
        initialStrengths,
      order: [
        ...facePairSequence,
      ],
    }));

  const strengthsRef =
    useRef(initialStrengths);

  const orderRef =
    useRef([
      ...facePairSequence,
    ]);

  const frameRef = useRef(null);

  useEffect(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(
        frameRef.current
      );

      frameRef.current = null;
    }

    const targetSequence =
      sequenceKey.length === 0
        ? []
        : sequenceKey
            .split(",")
            .map(Number);

    const startStrengths = [
      ...strengthsRef.current,
    ];

    const targetStrengths =
      FIGURE_EIGHT_FACE_PAIRS.map(
        (pair) =>
          targetSequence.includes(
            pair.id
          )
            ? 1
            : 0
      );

    /*
     * Keep a removed final constraint in the solver
     * order while its strength animates back to zero.
     * This gives Undo and Reset a true reverse path.
     */
    const fadingPairIds =
      orderRef.current.filter(
        (pairId) =>
          !targetSequence.includes(
            pairId
          ) &&
          startStrengths[pairId] >
            1e-6
      );

    const transitionOrder = [
      ...targetSequence,
      ...fadingPairIds.filter(
        (pairId) =>
          !targetSequence.includes(
            pairId
          )
      ),
    ];

    orderRef.current =
      transitionOrder;

    const changed =
      targetStrengths.some(
        (target, pairId) =>
          Math.abs(
            target -
              startStrengths[
                pairId
              ]
          ) >
          1e-8
      );

    if (!changed) {
      strengthsRef.current =
        targetStrengths;

      orderRef.current =
        targetSequence;

      setState({
        strengths:
          targetStrengths,
        order: targetSequence,
      });

      return undefined;
    }

    const startedAt =
      performance.now();

    function animate(now) {
      const raw = Math.max(
        0,
        Math.min(
          1,
          (now - startedAt) /
            PAIRING_DURATION_MS
        )
      );

      const eased =
        smoothUnitInterval(raw);

      const nextStrengths =
        startStrengths.map(
          (start, pairId) =>
            start +
            (
              targetStrengths[
                pairId
              ] -
              start
            ) *
              eased
        );

      strengthsRef.current =
        nextStrengths;

      setState({
        strengths:
          nextStrengths,
        order:
          raw < 1
            ? transitionOrder
            : targetSequence,
      });

      if (raw < 1) {
        frameRef.current =
          requestAnimationFrame(
            animate
          );
      } else {
        frameRef.current = null;
        orderRef.current =
          targetSequence;
      }
    }

    frameRef.current =
      requestAnimationFrame(
        animate
      );

    return () => {
      if (
        frameRef.current !== null
      ) {
        cancelAnimationFrame(
          frameRef.current
        );

        frameRef.current = null;
      }
    };
  }, [sequenceKey]);

  return state;
}

function normalizeCyclicMappingIndex(
  value
) {
  const integer =
    Number.isFinite(value)
      ? Math.round(value)
      : 0;

  return (
    (
      integer %
      CYCLIC_FACE_MAPPING_CHOICES.length
    ) +
    CYCLIC_FACE_MAPPING_CHOICES.length
  ) %
  CYCLIC_FACE_MAPPING_CHOICES.length;
}

function orientedFacePairMappingIndex(
  pairId,
  mappingIndex
) {
  const normalized =
    normalizeCyclicMappingIndex(
      mappingIndex
    );

  /*
   * Green's ordered B-face boundary runs opposite to the
   * displayed counterclockwise mapping convention. Reverse
   * only that pair's discrete mapping index so each 120°
   * button step rotates the bridge end counterclockwise,
   * while the other three face pairs keep their established
   * orientation.
   */
  return pairId === 2
    ? normalizeCyclicMappingIndex(
        -normalized
      )
    : normalized;
}

function cyclicallyShiftPoints(
  points,
  shift
) {
  if (points.length === 0) {
    return [];
  }

  const normalized =
    (
      (
        shift %
        points.length
      ) +
      points.length
    ) %
    points.length;

  return points.map(
    (_, index) =>
      points[
        (
          index +
          normalized
        ) %
        points.length
      ]
  );
}

function bridgeTransitionMappingProgress(
  rawProgress
) {
  return smootherUnitInterval(
    Math.max(
      0,
      Math.min(
        1,
        rawProgress
      )
    )
  );
}

function bridgeTransitionClearanceEnvelope(
  rawProgress
) {
  if (
    rawProgress <=
    BRIDGE_TRANSITION_RETRACT_END
  ) {
    return smootherUnitInterval(
      rawProgress /
      BRIDGE_TRANSITION_RETRACT_END
    );
  }

  if (
    rawProgress >=
    BRIDGE_TRANSITION_REATTACH_START
  ) {
    return (
      1 -
      smootherUnitInterval(
        (
          rawProgress -
          BRIDGE_TRANSITION_REATTACH_START
        ) /
        (
          1 -
          BRIDGE_TRANSITION_REATTACH_START
        )
      )
    );
  }

  return 1;
}

function nearestEquivalentMappingTurn(
  current,
  targetIndex
) {
  const normalizedTarget =
    normalizeCyclicMappingIndex(
      targetIndex
    );

  const baseMultiple =
    Math.round(
      (
        current -
        normalizedTarget
      ) /
      CYCLIC_FACE_MAPPING_CHOICES.length
    );

  const candidates = [
    normalizedTarget +
      (
        baseMultiple - 1
      ) *
        CYCLIC_FACE_MAPPING_CHOICES.length,
    normalizedTarget +
      baseMultiple *
        CYCLIC_FACE_MAPPING_CHOICES.length,
    normalizedTarget +
      (
        baseMultiple + 1
      ) *
        CYCLIC_FACE_MAPPING_CHOICES.length,
  ];

  return candidates.reduce(
    (best, candidate) =>
      Math.abs(
        candidate -
        current
      ) <
      Math.abs(
        best -
        current
      )
        ? candidate
        : best,
    candidates[0]
  );
}

function useAnimatedCyclicFaceMappings(
  targetMappings,
  duration = FACE_MAPPING_DURATION_MS
) {
  const normalizedTargets =
    FIGURE_EIGHT_FACE_PAIRS.map(
      (_, pairId) =>
        orientedFacePairMappingIndex(
          pairId,
          targetMappings?.[
            pairId
          ] ?? 0
        )
    );

  const targetKey =
    normalizedTargets.join(",");

  const [turns, setTurns] =
    useState(
      normalizedTargets
    );

  const turnsRef =
    useRef(
      normalizedTargets
    );

  useEffect(() => {
    const startTurns = [
      ...turnsRef.current,
    ];

    const endTurns =
      normalizedTargets.map(
        (target, pairId) =>
          nearestEquivalentMappingTurn(
            startTurns[
              pairId
            ] ?? 0,
            target
          )
      );

    const changed =
      endTurns.some(
        (target, pairId) =>
          Math.abs(
            target -
            startTurns[
              pairId
            ]
          ) >
          1e-8
      );

    if (!changed) {
      turnsRef.current =
        endTurns;

      setTurns(endTurns);

      return undefined;
    }

    const startedAt =
      performance.now();

    let frameId = null;

    function animate(now) {
      const raw = Math.max(
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
        bridgeTransitionMappingProgress(
          raw
        );

      const nextTurns =
        startTurns.map(
          (start, pairId) =>
            start +
            (
              endTurns[
                pairId
              ] -
              start
            ) *
              eased
        );

      turnsRef.current =
        nextTurns;

      setTurns(
        nextTurns
      );

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

    return () => {
      if (frameId !== null) {
        cancelAnimationFrame(
          frameId
        );
      }
    };
  }, [
    targetKey,
    duration,
  ]);

  return turns;
}

function useAnimatedAssembly(
  active,
  duration = CUSP_ASSEMBLY_DURATION_MS
) {
  const target = active ? 1 : 0;
  const [progress, setProgress] =
    useState(target);
  const progressRef = useRef(target);

  useEffect(() => {
    const start = progressRef.current;
    const startedAt = performance.now();
    let frameId;

    function animate(now) {
      const raw = Math.max(
        0,
        Math.min(
          1,
          (now - startedAt) /
            duration
        )
      );

      const eased =
        1 - Math.pow(1 - raw, 3);

      const next =
        start + (target - start) * eased;

      progressRef.current = next;
      setProgress(next);

      if (raw < 1) {
        frameId =
          requestAnimationFrame(animate);
      }
    }

    frameId =
      requestAnimationFrame(animate);

    return () =>
      cancelAnimationFrame(frameId);
  }, [target, duration]);

  return progress;
}

function edgePoint(
  fromIndex,
  toIndex,
  truncationFraction =
    DEFAULT_TRUNCATION_FRACTION
) {
  return lerpPoint(
    VERTICES[fromIndex],
    VERTICES[toIndex],
    normalizeTruncationFraction(
      truncationFraction
    )
  );
}

function truncatedVertexKey(
  fromIndex,
  toIndex
) {
  return `${fromIndex}->${toIndex}`;
}

function truncatedHexagonVertexKeys(
  face
) {
  const [a, b, c] = face;

  return [
    truncatedVertexKey(a, b),
    truncatedVertexKey(b, a),
    truncatedVertexKey(b, c),
    truncatedVertexKey(c, b),
    truncatedVertexKey(c, a),
    truncatedVertexKey(a, c),
  ];
}

function meshEdgeKey(
  firstIndex,
  secondIndex
) {
  return firstIndex < secondIndex
    ? `${firstIndex}:${secondIndex}`
    : `${secondIndex}:${firstIndex}`;
}

function pointDistance(first, second) {
  return Math.hypot(
    second.x - first.x,
    second.y - first.y,
    second.z - first.z
  );
}

function triangleArea(
  first,
  second,
  third
) {
  const firstEdge =
    subtractPoint(second, first);

  const secondEdge =
    subtractPoint(third, first);

  const cross =
    crossPoint(
      firstEdge,
      secondEdge
    );

  return (
    0.5 *
    Math.hypot(
      cross.x,
      cross.y,
      cross.z
    )
  );
}

function triangulateMeshFace(
  face,
  vertices
) {
  return Array.from(
    {
      length:
        face.vertexIndices.length - 2,
    },
    (_, index) => {
      const vertexIndices = [
        face.vertexIndices[0],
        face.vertexIndices[index + 1],
        face.vertexIndices[index + 2],
      ];

      const points =
        vertexIndices.map(
          (vertexIndex) =>
            vertices[
              vertexIndex
            ].point
        );

      return {
        id:
          `${face.id}-triangle-${index}`,
        faceId: face.id,
        kind: face.kind,
        pairId:
          face.pairId ?? null,
        vertexIndices,
        restArea:
          triangleArea(
            points[0],
            points[1],
            points[2]
          ),
      };
    }
  );
}

function createTruncatedTetrahedronMesh(
  tetrahedronId,
  truncationFraction =
    DEFAULT_TRUNCATION_FRACTION
) {
  const normalizedTruncationFraction =
    normalizeTruncationFraction(
      truncationFraction
    );

  const vertices = [];

  VERTICES.forEach(
    (_, fromIndex) => {
      VERTICES.forEach(
        (_, toIndex) => {
          if (fromIndex === toIndex) {
            return;
          }

          vertices.push({
            id: truncatedVertexKey(
              fromIndex,
              toIndex
            ),
            fromIndex,
            toIndex,
            point: edgePoint(
              fromIndex,
              toIndex,
              normalizedTruncationFraction
            ),
          });
        }
      );
    }
  );

  const vertexIndexById =
    new Map(
      vertices.map(
        (vertex, index) => [
          vertex.id,
          index,
        ]
      )
    );

  function vertexIndicesForIds(ids) {
    return ids.map((id) => {
      const index =
        vertexIndexById.get(id);

      if (index === undefined) {
        throw new Error(
          `Missing truncated vertex ${id}`
        );
      }

      return index;
    });
  }

  const largeFaces =
    FIGURE_EIGHT_FACE_PAIRS.map(
      (pair) => ({
        id:
          `${tetrahedronId}-large-` +
          `${pair.id}`,
        kind: "large",
        pairId: pair.id,
        orderedIdealVertices:
          [...pair[tetrahedronId]],
        vertexIndices:
          vertexIndicesForIds(
            truncatedHexagonVertexKeys(
              pair[tetrahedronId]
            )
          ),
      })
    );

  const cuspFaces =
    VERTICES.map(
      (_, vertexIndex) => ({
        id:
          `${tetrahedronId}-cusp-` +
          `${vertexIndex}`,
        kind: "cusp",
        vertexIndex,
        vertexIndices:
          vertexIndicesForIds(
            TRUNCATION_NEIGHBORS[
              vertexIndex
            ].map(
              (neighborIndex) =>
                truncatedVertexKey(
                  vertexIndex,
                  neighborIndex
                )
            )
          ),
      })
    );

  const faces = [
    ...largeFaces,
    ...cuspFaces,
  ];

  const faceById =
    new Map(
      faces.map((face) => [
        face.id,
        face,
      ])
    );

  const edgeMap = new Map();

  faces.forEach((face) => {
    face.vertexIndices.forEach(
      (firstIndex, index) => {
        const secondIndex =
          face.vertexIndices[
            (index + 1) %
              face.vertexIndices.length
          ];

        const key = meshEdgeKey(
          firstIndex,
          secondIndex
        );

        const existing =
          edgeMap.get(key);

        if (existing) {
          existing.faceIds.push(
            face.id
          );
          return;
        }

        edgeMap.set(key, {
          id:
            `${tetrahedronId}-edge-` +
            `${key}`,
          vertexIndices: [
            firstIndex,
            secondIndex,
          ],
          faceIds: [face.id],
          restLength:
            pointDistance(
              vertices[
                firstIndex
              ].point,
              vertices[
                secondIndex
              ].point
            ),
        });
      }
    );
  });

  const edges =
    [...edgeMap.values()];

  const triangles =
    faces.flatMap(
      (face) =>
        triangulateMeshFace(
          face,
          vertices
        )
    );

  const vertexNeighbors =
    vertices.map(() => new Set());

  const vertexFaceIds =
    vertices.map(() => []);

  edges.forEach((edge) => {
    const [firstIndex, secondIndex] =
      edge.vertexIndices;

    vertexNeighbors[
      firstIndex
    ].add(secondIndex);

    vertexNeighbors[
      secondIndex
    ].add(firstIndex);
  });

  faces.forEach((face) => {
    face.vertexIndices.forEach(
      (vertexIndex) => {
        vertexFaceIds[
          vertexIndex
        ].push(face.id);
      }
    );
  });

  const mesh = {
    tetrahedronId,
    truncationFraction:
      normalizedTruncationFraction,
    vertices,
    vertexIndexById,
    largeFaces,
    cuspFaces,
    faces,
    faceById,
    edges,
    triangles,
    vertexNeighbors:
      vertexNeighbors.map(
        (neighbors) =>
          [...neighbors]
      ),
    vertexFaceIds,
  };

  const invalidEdge =
    edges.find(
      (edge) =>
        edge.faceIds.length !== 2
    );

  const invalidVertex =
    mesh.vertexNeighbors.find(
      (neighbors) =>
        neighbors.length !== 3
    );

  const invalidVertexFaces =
    vertexFaceIds.find(
      (faceIds) =>
        faceIds.length !== 3
    );

  if (
    vertices.length !== 12 ||
    faces.length !== 8 ||
    edges.length !== 18 ||
    triangles.length !== 20 ||
    invalidEdge ||
    invalidVertex ||
    invalidVertexFaces
  ) {
    throw new Error(
      "Invalid truncated-tetrahedron mesh topology"
    );
  }

  return mesh;
}

function createTruncatedTetrahedronMeshes(
  truncationFraction =
    DEFAULT_TRUNCATION_FRACTION
) {
  const normalizedTruncationFraction =
    normalizeTruncationFraction(
      truncationFraction
    );

  return {
    A: createTruncatedTetrahedronMesh(
      "A",
      normalizedTruncationFraction
    ),
    B: createTruncatedTetrahedronMesh(
      "B",
      normalizedTruncationFraction
    ),
  };
}

function createTruncatedEdgeIndexByVertexKey(
  meshes
) {
  return {
    A: new Map(
      meshes.A.edges.map(
        (edge, edgeIndex) => [
          meshEdgeKey(
            edge.vertexIndices[0],
            edge.vertexIndices[1]
          ),
          edgeIndex,
        ]
      )
    ),
    B: new Map(
      meshes.B.edges.map(
        (edge, edgeIndex) => [
          meshEdgeKey(
            edge.vertexIndices[0],
            edge.vertexIndices[1]
          ),
          edgeIndex,
        ]
      )
    ),
  };
}

function createFacePairVertexCorrespondences(
  meshes
) {
  return FIGURE_EIGHT_FACE_PAIRS.map(
    (pair) => {
      const faceA =
        meshes.A.largeFaces[
          pair.id
        ];

      const faceB =
        meshes.B.largeFaces[
          pair.id
        ];

      return {
        pairId: pair.id,
        vertexPairs:
          faceA.vertexIndices.map(
            (vertexAIndex, index) => ({
              vertexAIndex,
              vertexBIndex:
                faceB.vertexIndices[
                  index
                ],
            })
          ),
      };
    }
  );
}

export function createTruncatedTetrahedronGeometry(
  truncationFraction =
    DEFAULT_TRUNCATION_FRACTION,
  tetrahedronSeparation =
    DEFAULT_TETRAHEDRON_SEPARATION
) {
  const normalizedTruncationFraction =
    normalizeTruncationFraction(
      truncationFraction
    );

  const normalizedTetrahedronSeparation =
    normalizeTetrahedronSeparation(
      tetrahedronSeparation
    );

  const tetrahedra =
    tetrahedraAtSeparation(
      normalizedTetrahedronSeparation
    );

  const meshes =
    createTruncatedTetrahedronMeshes(
      normalizedTruncationFraction
    );

  const initialWorldPositions = {
    A: meshes.A.vertices.map(
      (vertex) =>
        transformPoint(
          vertex.point,
          tetrahedra[0]
        )
    ),
    B: meshes.B.vertices.map(
      (vertex) =>
        transformPoint(
          vertex.point,
          tetrahedra[1]
        )
    ),
  };

  const faceShapeConstraints = {
    A: createShapeConstraints(
      meshes.A,
      initialWorldPositions.A
    ),
    B: createShapeConstraints(
      meshes.B,
      initialWorldPositions.B
    ),
  };

  return {
    truncationFraction:
      normalizedTruncationFraction,
    tetrahedronSeparation:
      normalizedTetrahedronSeparation,
    tetrahedra,
    meshes,
    initialWorldPositions,
    faceShapeConstraints,
    edgeIndexByVertexKey:
      createTruncatedEdgeIndexByVertexKey(
        meshes
      ),
    facePairVertexCorrespondences:
      createFacePairVertexCorrespondences(
        meshes
      ),
  };
}

const DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY =
  createTruncatedTetrahedronGeometry();

const TRUNCATED_TETRAHEDRON_MESHES =
  DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY
    .meshes;

const TRUNCATED_EDGE_INDEX_BY_VERTEX_KEY =
  DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY
    .edgeIndexByVertexKey;

export const FACE_PAIR_VERTEX_CORRESPONDENCES =
  DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY
    .facePairVertexCorrespondences;

function settledCyclicMappingIndex(
  mappingTurn
) {
  const nearestInteger =
    Math.round(
      Number.isFinite(mappingTurn)
        ? mappingTurn
        : 0
    );

  return Math.abs(
    (
      Number.isFinite(mappingTurn)
        ? mappingTurn
        : 0
    ) -
    nearestInteger
  ) <
    1e-8
    ? normalizeCyclicMappingIndex(
        nearestInteger
      )
    : null;
}

function facePairVertexCorrespondence(
  pairId,
  mappingIndex = 0
) {
  const faceA =
    TRUNCATED_TETRAHEDRON_MESHES
      .A.largeFaces[pairId];

  const faceB =
    TRUNCATED_TETRAHEDRON_MESHES
      .B.largeFaces[pairId];

  const normalizedMapping =
    normalizeCyclicMappingIndex(
      mappingIndex
    );

  const hexagonShift =
    CYCLIC_FACE_MAPPING_CHOICES[
      normalizedMapping
    ].hexagonShift;

  return {
    pairId,
    mappingIndex:
      normalizedMapping,
    vertexPairs:
      faceA.vertexIndices.map(
        (vertexAIndex, index) => ({
          vertexAIndex,
          vertexBIndex:
            faceB.vertexIndices[
              (
                index +
                hexagonShift
              ) %
              faceB.vertexIndices.length
            ],
        })
      ),
  };
}


function createQuotientDisjointSet(
  size
) {
  const parent =
    Array.from(
      { length: size },
      (_, index) => index
    );

  const rank =
    Array.from(
      { length: size },
      () => 0
    );

  function find(index) {
    let current = index;

    while (
      parent[current] !==
      current
    ) {
      parent[current] =
        parent[
          parent[current]
        ];

      current =
        parent[current];
    }

    return current;
  }

  function union(first, second) {
    const firstRoot =
      find(first);

    const secondRoot =
      find(second);

    if (
      firstRoot ===
      secondRoot
    ) {
      return;
    }

    if (
      rank[firstRoot] <
      rank[secondRoot]
    ) {
      parent[firstRoot] =
        secondRoot;
      return;
    }

    if (
      rank[firstRoot] >
      rank[secondRoot]
    ) {
      parent[secondRoot] =
        firstRoot;
      return;
    }

    parent[secondRoot] =
      firstRoot;

    rank[firstRoot] += 1;
  }

  function canonicalClasses() {
    const classByRoot =
      new Map();

    const membersByClass = [];

    const classByIndex =
      parent.map((_, index) => {
        const root = find(index);

        if (
          !classByRoot.has(root)
        ) {
          classByRoot.set(
            root,
            classByRoot.size
          );

          membersByClass.push([]);
        }

        const classIndex =
          classByRoot.get(root);

        membersByClass[
          classIndex
        ].push(index);

        return classIndex;
      });

    return {
      classByIndex,
      membersByClass,
    };
  }

  return {
    find,
    union,
    canonicalClasses,
  };
}

function truncatedBoundaryEdgeIndex(
  tetrahedronId,
  firstVertexIndex,
  secondVertexIndex
) {
  const edgeIndex =
    TRUNCATED_EDGE_INDEX_BY_VERTEX_KEY[
      tetrahedronId
    ].get(
      meshEdgeKey(
        firstVertexIndex,
        secondVertexIndex
      )
    );

  if (edgeIndex === undefined) {
    throw new Error(
      `Missing ${tetrahedronId} boundary edge ` +
      `${firstVertexIndex}:${secondVertexIndex}`
    );
  }

  return edgeIndex;
}

function largeFaceBoundaryEdgeIndices(
  tetrahedronId,
  pairId
) {
  const face =
    TRUNCATED_TETRAHEDRON_MESHES[
      tetrahedronId
    ].largeFaces[pairId];

  return face.vertexIndices.map(
    (firstVertexIndex, index) =>
      truncatedBoundaryEdgeIndex(
        tetrahedronId,
        firstVertexIndex,
        face.vertexIndices[
          (
            index + 1
          ) %
          face.vertexIndices.length
        ]
      )
  );
}

function describeGlobalQuotientEdge(
  globalEdgeIndex
) {
  const edgeCountA =
    TRUNCATED_TETRAHEDRON_MESHES
      .A.edges.length;

  const tetrahedronId =
    globalEdgeIndex < edgeCountA
      ? "A"
      : "B";

  const edgeIndex =
    tetrahedronId === "A"
      ? globalEdgeIndex
      : globalEdgeIndex -
        edgeCountA;

  const edge =
    TRUNCATED_TETRAHEDRON_MESHES[
      tetrahedronId
    ].edges[edgeIndex];

  return {
    tetrahedronId,
    edgeIndex,
    edgeId: edge.id,
    vertexIndices: [
      ...edge.vertexIndices,
    ],
    restLength: edge.restLength,
  };
}

function buildFaceIdentificationQuotient({
  identifiedPairIds,
  facePairMappingTurns,
  pairStrengths = null,
}) {
  const vertexCountA =
    TRUNCATED_TETRAHEDRON_MESHES
      .A.vertices.length;

  const edgeCountA =
    TRUNCATED_TETRAHEDRON_MESHES
      .A.edges.length;

  const vertexClasses =
    createQuotientDisjointSet(
      vertexCountA +
      TRUNCATED_TETRAHEDRON_MESHES
        .B.vertices.length
    );

  const edgeClasses =
    createQuotientDisjointSet(
      edgeCountA +
      TRUNCATED_TETRAHEDRON_MESHES
        .B.edges.length
    );

  const settledMappings = {};

  for (
    const pairId of
      identifiedPairIds
  ) {
    if (
      pairStrengths !== null &&
      (
        pairStrengths[pairId] ?? 0
      ) <
      FACE_LOCK_THRESHOLD
    ) {
      return {
        settled: false,
        status:
          "identification-transition",
        identifiedPairIds: [
          ...identifiedPairIds,
        ],
      };
    }

    const mappingIndex =
      settledCyclicMappingIndex(
        facePairMappingTurns[
          pairId
        ] ?? 0
      );

    if (mappingIndex === null) {
      return {
        settled: false,
        status:
          "mapping-transition",
        identifiedPairIds: [
          ...identifiedPairIds,
        ],
      };
    }

    settledMappings[pairId] =
      mappingIndex;

    const correspondence =
      facePairVertexCorrespondence(
        pairId,
        mappingIndex
      );

    correspondence.vertexPairs.forEach(
      (vertexPair) => {
        vertexClasses.union(
          vertexPair.vertexAIndex,
          vertexCountA +
            vertexPair.vertexBIndex
        );
      }
    );

    const faceA =
      TRUNCATED_TETRAHEDRON_MESHES
        .A.largeFaces[pairId];

    correspondence.vertexPairs.forEach(
      (vertexPair, index) => {
        const nextVertexPair =
          correspondence.vertexPairs[
            (
              index + 1
            ) %
            correspondence
              .vertexPairs.length
          ];

        const edgeAIndex =
          truncatedBoundaryEdgeIndex(
            "A",
            faceA.vertexIndices[index],
            faceA.vertexIndices[
              (
                index + 1
              ) %
              faceA.vertexIndices.length
            ]
          );

        const edgeBIndex =
          truncatedBoundaryEdgeIndex(
            "B",
            vertexPair.vertexBIndex,
            nextVertexPair
              .vertexBIndex
          );

        edgeClasses.union(
          edgeAIndex,
          edgeCountA +
            edgeBIndex
        );
      }
    );
  }

  const vertexQuotient =
    vertexClasses.canonicalClasses();

  const edgeQuotient =
    edgeClasses.canonicalClasses();

  return {
    settled: true,
    status: "settled",
    identifiedPairIds: [
      ...identifiedPairIds,
    ],
    settledMappings,
    vertexClassByGlobalIndex:
      vertexQuotient.classByIndex,
    vertexMembersByClass:
      vertexQuotient.membersByClass,
    edgeClassByGlobalIndex:
      edgeQuotient.classByIndex,
    edgeMembersByClass:
      edgeQuotient.membersByClass,
  };
}

function classifyBridgeFaceAdjacency({
  pairId,
  priorPairIds,
  facePairMappingTurns,
  pairStrengths = null,
}) {
  const quotient =
    buildFaceIdentificationQuotient({
      identifiedPairIds:
        priorPairIds,
      facePairMappingTurns,
      pairStrengths,
    });

  if (!quotient.settled) {
    return {
      settled: false,
      status: quotient.status,
      type: "pending",
      pairId,
      priorPairIds: [
        ...priorPairIds,
      ],
      sharedQuotientEdgeClassCount: 0,
      sharedQuotientEdgeClasses: [],
    };
  }

  const edgeCountA =
    TRUNCATED_TETRAHEDRON_MESHES
      .A.edges.length;

  const faceAEdgeClasses =
    largeFaceBoundaryEdgeIndices(
      "A",
      pairId
    ).map(
      (edgeIndex) =>
        quotient
          .edgeClassByGlobalIndex[
            edgeIndex
          ]
    );

  const faceBEdgeClasses =
    largeFaceBoundaryEdgeIndices(
      "B",
      pairId
    ).map(
      (edgeIndex) =>
        quotient
          .edgeClassByGlobalIndex[
            edgeCountA +
            edgeIndex
          ]
    );

  const faceBClassSet =
    new Set(
      faceBEdgeClasses
    );

  const sharedClassIndices =
    [
      ...new Set(
        faceAEdgeClasses.filter(
          (classIndex) =>
            faceBClassSet.has(
              classIndex
            )
        )
      ),
    ];

  const sharedQuotientEdgeClasses =
    sharedClassIndices.map(
      (classIndex) => ({
        classIndex,
        members:
          quotient
            .edgeMembersByClass[
              classIndex
            ].map(
              describeGlobalQuotientEdge
            ),
      })
    );

  return {
    settled: true,
    status: "settled",
    type:
      sharedClassIndices.length > 0
        ? "edge-adjacent"
        : "nonadjacent",
    pairId,
    priorPairIds: [
      ...priorPairIds,
    ],
    settledMappings:
      quotient.settledMappings,
    faceAEdgeClasses,
    faceBEdgeClasses,
    sharedQuotientEdgeClassCount:
      sharedClassIndices.length,
    sharedQuotientEdgeClasses,
  };
}

function bridgeAttachmentGeometry({
  positions,
  pairId,
  mappingIndex,
}) {
  const faceA =
    faceWorldPointsForPair(
      positions,
      "A",
      pairId
    );

  const faceB =
    faceWorldPointsForPair(
      positions,
      "B",
      pairId
    );

  const centerA =
    averageWorldPoint(faceA);

  const centerB =
    averageWorldPoint(faceB);

  const outwardA =
    outwardFaceNormal(
      faceA,
      averageWorldPoint(
        positions.A
      )
    );

  const outwardB =
    outwardFaceNormal(
      faceB,
      averageWorldPoint(
        positions.B
      )
    );

  const attachmentCosine =
    Math.max(
      -1,
      Math.min(
        1,
        dotPoint(
          outwardA,
          multiplyPoint(
            outwardB,
            -1
          )
        )
      )
    );

  const normalizedMapping =
    normalizeCyclicMappingIndex(
      mappingIndex
    );

  return {
    faceCenterDistance:
      pointDistance(
        centerA,
        centerB
      ),
    attachmentNormalAngle:
      Math.acos(
        attachmentCosine
      ),
    mappingTwist:
      normalizedMapping *
      2 *
      Math.PI /
      CYCLIC_FACE_MAPPING_CHOICES.length,
    mappingIndex:
      normalizedMapping,
  };
}

function meshFacePoints(
  mesh,
  face
) {
  return face.vertexIndices.map(
    (vertexIndex) =>
      mesh.vertices[
        vertexIndex
      ].point
  );
}

function averagePoint(points) {
  return points.reduce(
    (sum, point) => ({
      x: sum.x + point.x / points.length,
      y: sum.y + point.y / points.length,
      z: sum.z + point.z / points.length,
    }),
    { x: 0, y: 0, z: 0 }
  );
}

function boundingCenter(points) {
  if (points.length === 0) {
    return { x: 0, y: 0, z: 0 };
  }

  const bounds = points.reduce(
    (current, point) => ({
      minX: Math.min(current.minX, point.x),
      maxX: Math.max(current.maxX, point.x),
      minY: Math.min(current.minY, point.y),
      maxY: Math.max(current.maxY, point.y),
      minZ: Math.min(current.minZ, point.z),
      maxZ: Math.max(current.maxZ, point.z),
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

  return {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
    z: (bounds.minZ + bounds.maxZ) / 2,
  };
}

function subtractPoint(a, b) {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z,
  };
}

function addPoint(a, b) {
  return {
    x: a.x + b.x,
    y: a.y + b.y,
    z: a.z + b.z,
  };
}

function multiplyPoint(point, factor) {
  return {
    x: point.x * factor,
    y: point.y * factor,
    z: point.z * factor,
  };
}

function dotPoint(a, b) {
  return (
    a.x * b.x +
    a.y * b.y +
    a.z * b.z
  );
}

function crossPoint(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function normalizePoint(point) {
  const length = Math.hypot(
    point.x,
    point.y,
    point.z
  );

  if (length < 1e-10) {
    return { x: 1, y: 0, z: 0 };
  }

  return multiplyPoint(point, 1 / length);
}

function faceFrame(points) {
  const origin = points[0];

  const first = normalizePoint(
    subtractPoint(points[1], origin)
  );

  const towardThird = subtractPoint(
    points[2],
    origin
  );

  const second = normalizePoint(
    subtractPoint(
      towardThird,
      multiplyPoint(
        first,
        dotPoint(towardThird, first)
      )
    )
  );

  return {
    origin,
    first,
    second,
    normal: normalizePoint(
      crossPoint(first, second)
    ),
  };
}

function coordinatesInFrame(point, frame) {
  const delta = subtractPoint(
    point,
    frame.origin
  );

  return {
    x: dotPoint(delta, frame.first),
    y: dotPoint(delta, frame.second),
    z: dotPoint(delta, frame.normal),
  };
}

function pointFromFrame(coordinates, frame) {
  return addPoint(
    frame.origin,
    addPoint(
      multiplyPoint(
        frame.first,
        coordinates.x
      ),
      addPoint(
        multiplyPoint(
          frame.second,
          coordinates.y
        ),
        multiplyPoint(
          frame.normal,
          coordinates.z
        )
      )
    )
  );
}

function oppositeVertexIndex(face) {
  return VERTICES.findIndex(
    (_, vertexIndex) =>
      !face.includes(vertexIndex)
  );
}

function makeFacePlacementTransform(
  pair,
  mappingTurn = 0,
  tetrahedra = TETRAHEDRA
) {
  const tetrahedronA = tetrahedra[0];
  const tetrahedronB = tetrahedra[1];

  const targetFace = pair.A.map(
    (vertexIndex) =>
      transformPoint(
        VERTICES[vertexIndex],
        tetrahedronA
      )
  );

  const sourceFace = pair.B.map(
    (vertexIndex) =>
      transformPoint(
        VERTICES[vertexIndex],
        tetrahedronB
      )
  );

  const sourceFrame = faceFrame(sourceFace);
  const targetFrame = faceFrame(targetFace);

  const sourceOpposite = transformPoint(
    VERTICES[
      oppositeVertexIndex(pair.B)
    ],
    tetrahedronB
  );

  const targetOpposite = transformPoint(
    VERTICES[
      oppositeVertexIndex(pair.A)
    ],
    tetrahedronA
  );

  const sourceSide = coordinatesInFrame(
    sourceOpposite,
    sourceFrame
  ).z;

  const targetSide = coordinatesInFrame(
    targetOpposite,
    targetFrame
  ).z;

  /*
   * Keep the ordered face correspondence exact,
   * while placing B across the face from A.
   */
  const normalDirection =
    sourceSide * targetSide > 0
      ? -1
      : 1;

  const placedFrame = {
    ...targetFrame,
    normal: multiplyPoint(
      targetFrame.normal,
      normalDirection
    ),
  };

  const canonicalPlacement =
    (point) =>
      pointFromFrame(
        coordinatesInFrame(
          point,
          sourceFrame
        ),
        placedFrame
      );

  if (
    Math.abs(mappingTurn) <
    1e-12
  ) {
    return canonicalPlacement;
  }

  const targetCenter =
    averagePoint(
      targetFace
    );

  /*
   * One positive mapping turn sends B's second ideal
   * vertex to A's first ideal vertex. The entire second
   * tetrahedron rotates rigidly around the glued face
   * normal, so fractional turns animate continuously
   * and integer turns land on exact vertex bijections.
   */
  const anglePerMappingTurn =
    signedAngleAroundAxis(
      subtractPoint(
        targetFace[1],
        targetCenter
      ),
      subtractPoint(
        targetFace[0],
        targetCenter
      ),
      placedFrame.normal
    );

  return (point) => {
    const placedPoint =
      canonicalPlacement(
        point
      );

    return addPoint(
      targetCenter,
      rotateAroundAxis(
        subtractPoint(
          placedPoint,
          targetCenter
        ),
        placedFrame.normal,
        anglePerMappingTurn *
          mappingTurn
      )
    );
  };
}

function smoothUnitInterval(value) {
  const amount = Math.max(
    0,
    Math.min(1, value)
  );

  return (
    amount *
    amount *
    (3 - 2 * amount)
  );
}

function smootherUnitInterval(value) {
  const amount = Math.max(
    0,
    Math.min(1, value)
  );

  return (
    amount *
    amount *
    amount *
    (
      amount *
      (
        amount * 6 -
        15
      ) +
      10
    )
  );
}

function slerpDirections(
  startDirection,
  endDirection,
  progress
) {
  const amount =
    smoothUnitInterval(progress);

  const start =
    normalizePoint(
      startDirection
    );

  const end =
    normalizePoint(
      endDirection
    );

  const cosine = Math.max(
    -1,
    Math.min(
      1,
      dotPoint(start, end)
    )
  );

  if (cosine > 0.9995) {
    return normalizePoint(
      lerpPoint(
        start,
        end,
        amount
      )
    );
  }

  const angle =
    Math.acos(cosine);

  const sine =
    Math.sin(angle);

  const startWeight =
    Math.sin(
      (1 - amount) *
        angle
    ) / sine;

  const endWeight =
    Math.sin(
      amount * angle
    ) / sine;

  return normalizePoint(
    addPoint(
      multiplyPoint(
        start,
        startWeight
      ),
      multiplyPoint(
        end,
        endWeight
      )
    )
  );
}

function quaternionFromRotationMatrix(
  matrix
) {
  const [
    m00, m01, m02,
    m10, m11, m12,
    m20, m21, m22,
  ] = matrix;

  const trace =
    m00 + m11 + m22;

  let quaternion;

  if (trace > 0) {
    const scale =
      Math.sqrt(trace + 1) * 2;

    quaternion = {
      w: 0.25 * scale,
      x: (m21 - m12) / scale,
      y: (m02 - m20) / scale,
      z: (m10 - m01) / scale,
    };
  } else if (
    m00 > m11 &&
    m00 > m22
  ) {
    const scale =
      Math.sqrt(
        1 + m00 - m11 - m22
      ) * 2;

    quaternion = {
      w: (m21 - m12) / scale,
      x: 0.25 * scale,
      y: (m01 + m10) / scale,
      z: (m02 + m20) / scale,
    };
  } else if (m11 > m22) {
    const scale =
      Math.sqrt(
        1 + m11 - m00 - m22
      ) * 2;

    quaternion = {
      w: (m02 - m20) / scale,
      x: (m01 + m10) / scale,
      y: 0.25 * scale,
      z: (m12 + m21) / scale,
    };
  } else {
    const scale =
      Math.sqrt(
        1 + m22 - m00 - m11
      ) * 2;

    quaternion = {
      w: (m10 - m01) / scale,
      x: (m02 + m20) / scale,
      y: (m12 + m21) / scale,
      z: 0.25 * scale,
    };
  }

  const length = Math.hypot(
    quaternion.w,
    quaternion.x,
    quaternion.y,
    quaternion.z
  );

  return {
    w: quaternion.w / length,
    x: quaternion.x / length,
    y: quaternion.y / length,
    z: quaternion.z / length,
  };
}

function slerpIdentityQuaternion(
  targetQuaternion,
  progress
) {
  const amount =
    smoothUnitInterval(progress);

  let target =
    targetQuaternion;

  /*
   * q and -q encode the same rotation. Select the
   * representative producing the shorter rotation.
   */
  if (target.w < 0) {
    target = {
      w: -target.w,
      x: -target.x,
      y: -target.y,
      z: -target.z,
    };
  }

  const dot = Math.max(
    -1,
    Math.min(1, target.w)
  );

  if (dot > 0.9995) {
    const blended = {
      w:
        1 +
        (target.w - 1) *
          amount,
      x: target.x * amount,
      y: target.y * amount,
      z: target.z * amount,
    };

    const length = Math.hypot(
      blended.w,
      blended.x,
      blended.y,
      blended.z
    );

    return {
      w: blended.w / length,
      x: blended.x / length,
      y: blended.y / length,
      z: blended.z / length,
    };
  }

  const angle =
    Math.acos(dot);

  const sine =
    Math.sin(angle);

  const startWeight =
    Math.sin(
      (1 - amount) * angle
    ) / sine;

  const targetWeight =
    Math.sin(amount * angle) /
    sine;

  return {
    w:
      startWeight +
      target.w *
        targetWeight,
    x:
      target.x *
      targetWeight,
    y:
      target.y *
      targetWeight,
    z:
      target.z *
      targetWeight,
  };
}

function rotatePointByQuaternion(
  point,
  quaternion
) {
  const vector = {
    x: quaternion.x,
    y: quaternion.y,
    z: quaternion.z,
  };

  const firstCross =
    crossPoint(
      vector,
      point
    );

  const secondCross =
    crossPoint(
      vector,
      firstCross
    );

  return addPoint(
    point,
    multiplyPoint(
      addPoint(
        multiplyPoint(
          firstCross,
          quaternion.w
        ),
        secondCross
      ),
      2
    )
  );
}

function makeStagedFacePlacementTransform(
  pair,
  strength,
  mappingTurn = 0,
  initialWorldPositions =
    INITIAL_WORLD_VERTEX_POSITIONS,
  tetrahedra = TETRAHEDRA
) {
  const amount = Math.max(
    0,
    Math.min(1, strength)
  );

  const finalPlacement =
    makeFacePlacementTransform(
      pair,
      mappingTurn,
      tetrahedra
    );

  if (
    amount <=
    FACE_CONSTRAINT_EPSILON
  ) {
    return clonePoint;
  }

  if (
    amount >=
    1 -
      FACE_CONSTRAINT_EPSILON
  ) {
    return finalPlacement;
  }

  const sourceCenter =
    averageWorldPoint(
      initialWorldPositions.B
    );

  const finalCenter =
    finalPlacement(
      sourceCenter
    );

  function transformedAxis(axis) {
    return subtractPoint(
      finalPlacement(
        addPoint(
          sourceCenter,
          axis
        )
      ),
      finalCenter
    );
  }

  const transformedX =
    transformedAxis({
      x: 1,
      y: 0,
      z: 0,
    });

  const transformedY =
    transformedAxis({
      x: 0,
      y: 1,
      z: 0,
    });

  const transformedZ =
    transformedAxis({
      x: 0,
      y: 0,
      z: 1,
    });

  const finalQuaternion =
    quaternionFromRotationMatrix([
      transformedX.x,
      transformedY.x,
      transformedZ.x,

      transformedX.y,
      transformedY.y,
      transformedZ.y,

      transformedX.z,
      transformedY.z,
      transformedZ.z,
    ]);

  /*
   * Phase 1: rotate B rigidly about its own center.
   *
   * Phase 2: carry the correctly oriented tetrahedron
   * around A on a constant-radius orbit. This changes
   * the approach direction without crossing A.
   *
   * Phase 3: move radially inward along the selected
   * face normal until the two hexagonal faces coincide.
   */
  const rotationProgress =
    amount /
    FIRST_FACE_ROTATION_END;

  const orbitProgress =
    (
      amount -
      FIRST_FACE_ROTATION_END
    ) /
    (
      FIRST_FACE_ORBIT_END -
      FIRST_FACE_ROTATION_END
    );

  const approachProgress =
    (
      amount -
      FIRST_FACE_ORBIT_END
    ) /
    (
      1 -
      FIRST_FACE_ORBIT_END
    );

  const currentQuaternion =
    slerpIdentityQuaternion(
      finalQuaternion,
      rotationProgress
    );

  const tetrahedronACenter =
    tetrahedra[0].center;

  const sourceDirection =
    normalizePoint(
      subtractPoint(
        sourceCenter,
        tetrahedronACenter
      )
    );

  const finalDirection =
    normalizePoint(
      subtractPoint(
        finalCenter,
        tetrahedronACenter
      )
    );

  const orbitRadius =
    pointDistance(
      sourceCenter,
      tetrahedronACenter
    );

  const finalRadius =
    pointDistance(
      finalCenter,
      tetrahedronACenter
    );

  let currentCenter;

  if (
    amount <=
    FIRST_FACE_ROTATION_END
  ) {
    currentCenter =
      sourceCenter;
  } else if (
    amount <=
    FIRST_FACE_ORBIT_END
  ) {
    const orbitDirection =
      slerpDirections(
        sourceDirection,
        finalDirection,
        orbitProgress
      );

    currentCenter =
      addPoint(
        tetrahedronACenter,
        multiplyPoint(
          orbitDirection,
          orbitRadius
        )
      );
  } else {
    const currentRadius =
      orbitRadius +
      (
        finalRadius -
        orbitRadius
      ) *
        smoothUnitInterval(
          approachProgress
        );

    currentCenter =
      addPoint(
        tetrahedronACenter,
        multiplyPoint(
          finalDirection,
          currentRadius
        )
      );
  }

  return (point) =>
    addPoint(
      currentCenter,
      rotatePointByQuaternion(
        subtractPoint(
          point,
          sourceCenter
        ),
        currentQuaternion
      )
    );
}

function cubicBezierPoint(
  start,
  firstControl,
  secondControl,
  end,
  amount
) {
  const t = Math.max(
    0,
    Math.min(1, amount)
  );

  const inverse =
    1 - t;

  return addPoint(
    addPoint(
      multiplyPoint(
        start,
        inverse *
          inverse *
          inverse
      ),
      multiplyPoint(
        firstControl,
        3 *
          inverse *
          inverse *
          t
      )
    ),
    addPoint(
      multiplyPoint(
        secondControl,
        3 *
          inverse *
          t *
          t
      ),
      multiplyPoint(
        end,
        t * t * t
      )
    )
  );
}

function faceWorldPointsForPair(
  positions,
  tetrahedronId,
  pairId
) {
  const face =
    TRUNCATED_TETRAHEDRON_MESHES[
      tetrahedronId
    ].largeFaces[
      pairId
    ];

  return face.vertexIndices.map(
    (vertexIndex) =>
      positions[
        tetrahedronId
      ][vertexIndex]
  );
}

function faceMappingQuaternion(
  sourcePoints,
  targetPoints
) {
  const sourceFrame =
    faceFrame(sourcePoints);

  const targetFrame =
    faceFrame(targetPoints);

  const sourceCenter =
    averageWorldPoint(
      sourcePoints
    );

  const targetCenter =
    averageWorldPoint(
      targetPoints
    );

  function mappedPoint(point) {
    return pointFromFrame(
      coordinatesInFrame(
        point,
        sourceFrame
      ),
      targetFrame
    );
  }

  function transformedAxis(axis) {
    return subtractPoint(
      mappedPoint(
        addPoint(
          sourceCenter,
          axis
        )
      ),
      targetCenter
    );
  }

  const transformedX =
    transformedAxis({
      x: 1,
      y: 0,
      z: 0,
    });

  const transformedY =
    transformedAxis({
      x: 0,
      y: 1,
      z: 0,
    });

  const transformedZ =
    transformedAxis({
      x: 0,
      y: 0,
      z: 1,
    });

  return quaternionFromRotationMatrix([
    transformedX.x,
    transformedY.x,
    transformedZ.x,

    transformedX.y,
    transformedY.y,
    transformedZ.y,

    transformedX.z,
    transformedY.z,
    transformedZ.z,
  ]);
}

function bridgeRouteDirection(
  centerA,
  centerB,
  sceneCenter,
  pairId
) {
  const midpoint =
    averageWorldPoint([
      centerA,
      centerB,
    ]);

  const chord =
    normalizePoint(
      subtractPoint(
        centerB,
        centerA
      )
    );

  const radial =
    subtractPoint(
      midpoint,
      sceneCenter
    );

  let route =
    subtractPoint(
      radial,
      multiplyPoint(
        chord,
        dotPoint(
          radial,
          chord
        )
      )
    );

  if (
    Math.hypot(
      route.x,
      route.y,
      route.z
    ) <
    FACE_CONSTRAINT_EPSILON
  ) {
    const fallbackAxes = [
      {
        x: 0,
        y: 0,
        z: 1,
      },
      {
        x: 0,
        y: 1,
        z: 0,
      },
      {
        x: 1,
        y: 0,
        z: 0,
      },
    ];

    const fallbackAxis =
      fallbackAxes[
        pairId %
        fallbackAxes.length
      ];

    route =
      crossPoint(
        chord,
        fallbackAxis
      );

    if (
      Math.hypot(
        route.x,
        route.y,
        route.z
      ) <
      FACE_CONSTRAINT_EPSILON
    ) {
      route =
        crossPoint(
          chord,
          fallbackAxes[
            (
              pairId +
              1
            ) %
            fallbackAxes.length
          ]
        );
    }
  }

  if (
    dotPoint(
      route,
      radial
    ) <
    0
  ) {
    route =
      multiplyPoint(
        route,
        -1
      );
  }

  return normalizePoint(
    route
  );
}

function normalizeBridgeRouteSpec(
  routeSpec,
  routeLane = 0
) {
  const source =
    routeSpec &&
    typeof routeSpec === "object"
      ? routeSpec
      : DEFAULT_BRIDGE_ROUTE_SPEC;

  return {
    id:
      typeof source.id === "string"
        ? source.id
        : DEFAULT_BRIDGE_ROUTE_SPEC.id,
    kind:
      typeof source.kind === "string"
        ? source.kind
        : DEFAULT_BRIDGE_ROUTE_SPEC.kind,
    family:
      typeof source.family === "string"
        ? source.family
        : DEFAULT_BRIDGE_ROUTE_SPEC.family,
    lane:
      Number.isFinite(source.lane)
        ? source.lane
        : routeLane,
    archDistance:
      Number.isFinite(
        source.archDistance
      )
        ? source.archDistance
        : DEFAULT_BRIDGE_ROUTE_SPEC
            .archDistance,
    lateralOffset:
      Number.isFinite(
        source.lateralOffset
      )
        ? source.lateralOffset
        : DEFAULT_BRIDGE_ROUTE_SPEC
            .lateralOffset,
    midScale:
      Number.isFinite(
        source.midScale
      )
        ? Math.max(
            0.08,
            Math.min(
              1,
              source.midScale
            )
          )
        : SECOND_FACE_BRIDGE_MID_SCALE,
    sectionScale:
      Number.isFinite(
        source.sectionScale
      )
        ? Math.max(
            0.01,
            Math.min(
              1,
              source.sectionScale
            )
          )
        : 1,
    transitionClearance:
      Number.isFinite(
        source.transitionClearance
      )
        ? Math.max(
            0,
            source.transitionClearance
          )
        : 0,
    transitionPinch:
      Number.isFinite(
        source.transitionPinch
      )
        ? Math.max(
            0,
            Math.min(
              0.99,
              source.transitionPinch
            )
          )
        : 0,
  };
}

function bridgeRouteSideDirection(
  centerA,
  centerB,
  routeDirection,
  pairId
) {
  const chord =
    normalizePoint(
      subtractPoint(
        centerB,
        centerA
      )
    );

  let sideDirection =
    crossPoint(
      chord,
      routeDirection
    );

  if (
    Math.hypot(
      sideDirection.x,
      sideDirection.y,
      sideDirection.z
    ) <
    FACE_CONSTRAINT_EPSILON
  ) {
    const fallbackAxes = [
      {
        x: 0,
        y: 0,
        z: 1,
      },
      {
        x: 0,
        y: 1,
        z: 0,
      },
      {
        x: 1,
        y: 0,
        z: 0,
      },
    ];

    sideDirection =
      crossPoint(
        chord,
        fallbackAxes[
          pairId %
          fallbackAxes.length
        ]
      );
  }

  return normalizePoint(
    sideDirection
  );
}

function bridgeRouteCandidateSpecs() {
  return BRIDGE_ROUTE_CANDIDATE_SPECS.map(
    (routeSpec) => ({
      ...routeSpec,
    })
  );
}

function bridgeRouteCandidateSpecsForType(
  bridgeType
) {
  const normalizedType =
    bridgeType === "nonadjacent"
      ? "nonadjacent"
      : "edge-adjacent";

  return BRIDGE_ROUTE_CANDIDATE_SPECS
    .filter(
      (routeSpec) =>
        routeSpec.bridgeType ===
        normalizedType
    )
    .map((routeSpec) => ({
      ...routeSpec,
    }));
}

function bridgeRouteSpecKey(
  routeSpec
) {
  if (routeSpec === null) {
    return "none";
  }

  const normalized =
    normalizeBridgeRouteSpec(
      routeSpec,
      routeSpec.lane
    );

  return [
    normalized.id,
    normalized.kind,
    normalized.family,
    normalized.lane,
    normalized.archDistance.toFixed(6),
    normalized.lateralOffset.toFixed(6),
    normalized.midScale.toFixed(6),
    normalized.sectionScale.toFixed(6),
    normalized.transitionClearance.toFixed(6),
    normalized.transitionPinch.toFixed(6),
  ].join(":");
}

function bridgeRouteSpecArrayKey(
  routeSpecs
) {
  return FIGURE_EIGHT_FACE_PAIRS.map(
    (_, pairId) =>
      bridgeRouteSpecKey(
        routeSpecs?.[pairId] ?? null
      )
  ).join("|");
}

function interpolateBridgeRouteSpec(
  startRouteSpec,
  targetRouteSpec,
  amount,
  transitionPhase = amount
) {
  const target =
    normalizeBridgeRouteSpec(
      targetRouteSpec,
      targetRouteSpec.lane
    );

  const start =
    startRouteSpec === null
      ? target
      : normalizeBridgeRouteSpec(
          startRouteSpec,
          startRouteSpec.lane
        );

  const progress = Math.max(
    0,
    Math.min(1, amount)
  );

  const clearanceEnvelope =
    bridgeTransitionClearanceEnvelope(
      Math.max(
        0,
        Math.min(
          1,
          transitionPhase
        )
      )
    );

  return {
    ...target,
    archDistance:
      start.archDistance +
      (
        target.archDistance -
        start.archDistance
      ) *
        progress +
      target.transitionClearance *
        clearanceEnvelope,
    lateralOffset:
      start.lateralOffset +
      (
        target.lateralOffset -
        start.lateralOffset
      ) *
        progress,
    midScale:
      start.midScale +
      (
        target.midScale -
        start.midScale
      ) *
        progress,
    sectionScale:
      start.sectionScale +
      (
        target.sectionScale -
        start.sectionScale
      ) *
        progress,
  };
}

function useAnimatedBridgeRouteSpecs(
  targetRouteSpecs,
  duration =
    BRIDGE_ROUTE_CHANGE_DURATION_MS
) {
  const normalizedTargets =
    FIGURE_EIGHT_FACE_PAIRS.map(
      (_, pairId) => {
        const target =
          targetRouteSpecs?.[
            pairId
          ] ?? null;

        return target === null
          ? null
          : normalizeBridgeRouteSpec(
              target,
              target.lane
            );
      }
    );

  const targetKey =
    bridgeRouteSpecArrayKey(
      normalizedTargets
    );

  const [animatedSpecs, setAnimatedSpecs] =
    useState(normalizedTargets);

  const animatedSpecsRef =
    useRef(normalizedTargets);

  useEffect(() => {
    const startSpecs =
      normalizedTargets.map(
        (target, pairId) =>
          target === null
            ? null
            : animatedSpecsRef
                .current[pairId] ??
              target
      );

    const changed =
      normalizedTargets.some(
        (target, pairId) =>
          bridgeRouteSpecKey(
            target
          ) !==
          bridgeRouteSpecKey(
            animatedSpecsRef
              .current[pairId] ??
              null
          )
      );

    const requiresAnimation =
      normalizedTargets.some(
        (target, pairId) => {
          const current =
            animatedSpecsRef
              .current[pairId] ??
            null;

          return (
            target !== null &&
            current !== null &&
            bridgeRouteSpecKey(
              target
            ) !==
              bridgeRouteSpecKey(
                current
              )
          );
        }
      );

    if (
      !changed ||
      !requiresAnimation
    ) {
      animatedSpecsRef.current =
        normalizedTargets;

      setAnimatedSpecs(
        normalizedTargets
      );

      return undefined;
    }

    const startedAt =
      performance.now();

    let frameId = null;

    function animate(now) {
      const raw = Math.max(
        0,
        Math.min(
          1,
          (now - startedAt) /
            duration
        )
      );

      const eased =
        bridgeTransitionMappingProgress(
          raw
        );

      const nextSpecs =
        normalizedTargets.map(
          (target, pairId) =>
            target === null
              ? null
              : interpolateBridgeRouteSpec(
                  startSpecs[
                    pairId
                  ],
                  target,
                  eased,
                  raw
                )
        );

      animatedSpecsRef.current =
        nextSpecs;

      setAnimatedSpecs(nextSpecs);

      if (raw < 1) {
        frameId =
          requestAnimationFrame(
            animate
          );
      }
    }

    frameId =
      requestAnimationFrame(animate);

    return () => {
      if (frameId !== null) {
        cancelAnimationFrame(
          frameId
        );
      }
    };
  }, [targetKey, duration]);

  return animatedSpecs;
}

function quinticBezierPoint(
  controls,
  amount
) {
  const t = Math.max(
    0,
    Math.min(1, amount)
  );

  const inverse =
    1 - t;

  const weights = [
    inverse ** 5,
    5 * inverse ** 4 * t,
    10 * inverse ** 3 * t ** 2,
    10 * inverse ** 2 * t ** 3,
    5 * inverse * t ** 4,
    t ** 5,
  ];

  return controls.reduce(
    (point, control, index) =>
      addPoint(
        point,
        multiplyPoint(
          control,
          weights[index]
        )
      ),
    {
      x: 0,
      y: 0,
      z: 0,
    }
  );
}

function quinticBezierDerivative(
  controls,
  amount
) {
  const t = Math.max(
    0,
    Math.min(1, amount)
  );

  const inverse =
    1 - t;

  const derivativeWeights = [
    inverse ** 4,
    4 * inverse ** 3 * t,
    6 * inverse ** 2 * t ** 2,
    4 * inverse * t ** 3,
    t ** 4,
  ];

  return derivativeWeights.reduce(
    (point, weight, index) =>
      addPoint(
        point,
        multiplyPoint(
          subtractPoint(
            controls[index + 1],
            controls[index]
          ),
          5 * weight
        )
      ),
    {
      x: 0,
      y: 0,
      z: 0,
    }
  );
}

function quinticBezierTangent(
  controls,
  amount
) {
  return normalizePoint(
    quinticBezierDerivative(
      controls,
      amount
    )
  );
}

function perpendicularComponent(
  vector,
  normal
) {
  return subtractPoint(
    vector,
    multiplyPoint(
      normal,
      dotPoint(
        vector,
        normal
      )
    )
  );
}

function bridgeFrameAxis(
  facePoints,
  center,
  tangent
) {
  for (
    let vertexIndex = 0;
    vertexIndex <
      facePoints.length;
    vertexIndex += 1
  ) {
    const candidate =
      perpendicularComponent(
        subtractPoint(
          facePoints[
            vertexIndex
          ],
          center
        ),
        tangent
      );

    if (
      Math.hypot(
        candidate.x,
        candidate.y,
        candidate.z
      ) >
      FACE_CONSTRAINT_EPSILON
    ) {
      return normalizePoint(
        candidate
      );
    }
  }

  const fallback =
    Math.abs(tangent.x) < 0.8
      ? {
          x: 1,
          y: 0,
          z: 0,
        }
      : {
          x: 0,
          y: 1,
          z: 0,
        };

  return normalizePoint(
    perpendicularComponent(
      fallback,
      tangent
    )
  );
}

function quaternionBetweenDirections(
  fromDirection,
  toDirection
) {
  const from =
    normalizePoint(
      fromDirection
    );

  const to =
    normalizePoint(
      toDirection
    );

  const cosine = Math.max(
    -1,
    Math.min(
      1,
      dotPoint(from, to)
    )
  );

  if (cosine > 0.999999) {
    return {
      w: 1,
      x: 0,
      y: 0,
      z: 0,
    };
  }

  if (cosine < -0.999999) {
    const fallback =
      Math.abs(from.x) < 0.8
        ? {
            x: 1,
            y: 0,
            z: 0,
          }
        : {
            x: 0,
            y: 1,
            z: 0,
          };

    const axis =
      normalizePoint(
        crossPoint(
          from,
          fallback
        )
      );

    return {
      w: 0,
      x: axis.x,
      y: axis.y,
      z: axis.z,
    };
  }

  const axis =
    crossPoint(
      from,
      to
    );

  const scale =
    Math.sqrt(
      2 *
      (
        1 +
        cosine
      )
    );

  return {
    w: scale / 2,
    x: axis.x / scale,
    y: axis.y / scale,
    z: axis.z / scale,
  };
}

function rotateAroundAxis(
  vector,
  axis,
  angle
) {
  const direction =
    normalizePoint(axis);

  const cosine =
    Math.cos(angle);

  const sine =
    Math.sin(angle);

  return addPoint(
    addPoint(
      multiplyPoint(
        vector,
        cosine
      ),
      multiplyPoint(
        crossPoint(
          direction,
          vector
        ),
        sine
      )
    ),
    multiplyPoint(
      direction,
      dotPoint(
        direction,
        vector
      ) *
        (
          1 -
          cosine
        )
    )
  );
}

function signedAngleAroundAxis(
  fromVector,
  toVector,
  axis
) {
  const direction =
    normalizePoint(axis);

  const from =
    normalizePoint(
      perpendicularComponent(
        fromVector,
        direction
      )
    );

  const to =
    normalizePoint(
      perpendicularComponent(
        toVector,
        direction
      )
    );

  return Math.atan2(
    dotPoint(
      crossPoint(
        from,
        to
      ),
      direction
    ),
    dotPoint(
      from,
      to
    )
  );
}

function outwardFaceNormal(
  facePoints,
  bodyCenter
) {
  const center =
    averageWorldPoint(
      facePoints
    );

  let normal =
    faceFrame(
      facePoints
    ).normal;

  if (
    dotPoint(
      normal,
      subtractPoint(
        center,
        bodyCenter
      )
    ) <
    0
  ) {
    normal =
      multiplyPoint(
        normal,
        -1
      );
  }

  return normal;
}

function makeFaceIdentificationBridgeModel({
  positions,
  pairing,
  progress,
  bridgeSpanScale = 1,
  bridgeIndex = 0,
  routeLane = 0,
  routeSpec = null,
  mappingTurn = 0,
  sceneCenter,
}) {
  const pairId =
    Number.isInteger(
      pairing?.id
    )
      ? pairing.id
      : null;

  const amount = Math.max(
    0,
    Math.min(1, progress)
  );

  const spanScale = Math.max(
    0,
    Math.min(
      1,
      bridgeSpanScale
    )
  );

  const resolvedRouteSpec =
    normalizeBridgeRouteSpec(
      routeSpec,
      routeLane
    );

  const resolvedRouteLane =
    resolvedRouteSpec.lane;

  const emptyModel = {
    bridgeIndex,
    pairId,
    pairing:
      pairing ?? null,
    progress: amount,
    bridgeSpanScale:
      spanScale,
    routeLane:
      resolvedRouteLane,
    routeSpec:
      resolvedRouteSpec,
    mappingTurn,
    route: null,
    parameters: [],
    centerline: [],
    tangents: [],
    sections: [],
    triangles: [],
    worldFaces: [],
    totalArcLength: 0,
    visibleSegmentCount: 0,
  };

  if (
    pairId === null ||
    amount <=
      FACE_CONSTRAINT_EPSILON
  ) {
    return emptyModel;
  }

  const faceA =
    faceWorldPointsForPair(
      positions,
      "A",
      pairId
    );

  const baseFaceB =
    faceWorldPointsForPair(
      positions,
      "B",
      pairId
    );

  const centerA =
    averageWorldPoint(
      faceA
    );

  const centerB =
    averageWorldPoint(
      baseFaceB
    );

  const bodyCenterA =
    averageWorldPoint(
      positions.A
    );

  const bodyCenterB =
    averageWorldPoint(
      positions.B
    );

  const outwardA =
    outwardFaceNormal(
      faceA,
      bodyCenterA
    );

  const outwardB =
    outwardFaceNormal(
      baseFaceB,
      bodyCenterB
    );

  const routeDirection =
    bridgeRouteDirection(
      centerA,
      centerB,
      sceneCenter,
      pairId
    );

  const routeSideDirection =
    bridgeRouteSideDirection(
      centerA,
      centerB,
      routeDirection,
      pairId
    );

  const routeArchDistance =
    resolvedRouteSpec
      .archDistance *
    spanScale;

  const routeLateralOffset =
    resolvedRouteSpec
      .lateralOffset *
    spanScale;

  const routeMidScale =
    resolvedRouteSpec
      .midScale;

  const routeSectionScale =
    resolvedRouteSpec
      .sectionScale;

  const collarFraction =
    SECOND_FACE_BRIDGE_COLLAR_FRACTION;

  const bridgeCollarLength =
    SECOND_FACE_BRIDGE_COLLAR *
    spanScale;

  const middleFraction =
    1 -
    2 * collarFraction;

  const startCollarCenter =
    addPoint(
      centerA,
      multiplyPoint(
        outwardA,
        bridgeCollarLength
      )
    );

  const endCollarCenter =
    addPoint(
      centerB,
      multiplyPoint(
        outwardB,
        bridgeCollarLength
      )
    );

  const middleChordLength =
    pointDistance(
      startCollarCenter,
      endCollarCenter
    );

  /*
   * Match the derivative of each straight collar after
   * converting from the full bridge parameter to the
   * middle section's local parameter. This makes the
   * centerline C1-continuous at both collar junctions.
   */
  const middleTangentMagnitude =
    bridgeCollarLength *
    middleFraction /
    collarFraction;

  const startDerivative =
    multiplyPoint(
      outwardA,
      Math.max(
        middleTangentMagnitude * 3,
        middleChordLength * 0.36
      )
    );

  const endDerivative =
    multiplyPoint(
      outwardB,
      -Math.max(
        middleTangentMagnitude * 3,
        middleChordLength * 0.36
      )
    );

  /*
   * A quintic Bézier with these controls has the
   * requested endpoint derivatives and zero endpoint
   * second derivatives. The straight collars therefore
   * meet the curved middle with matching position,
   * tangent, and curvature.
   */
  const middleControls = [
    startCollarCenter,
    addPoint(
      startCollarCenter,
      multiplyPoint(
        startDerivative,
        1 / 5
      )
    ),
    addPoint(
      startCollarCenter,
      multiplyPoint(
        startDerivative,
        2 / 5
      )
    ),
    subtractPoint(
      endCollarCenter,
      multiplyPoint(
        endDerivative,
        2 / 5
      )
    ),
    subtractPoint(
      endCollarCenter,
      multiplyPoint(
        endDerivative,
        1 / 5
      )
    ),
    endCollarCenter,
  ];

  /*
   * This sixth-degree envelope is zero together with
   * its first two derivatives at both ends. It pushes
   * the middle route outward without reintroducing a
   * corner at either collar.
   */
  function archEnvelope(parameter) {
    const t = Math.max(
      0,
      Math.min(1, parameter)
    );

    return (
      64 *
      t *
      t *
      t *
      (
        1 - t
      ) *
      (
        1 - t
      ) *
      (
        1 - t
      )
    );
  }

  function archEnvelopeDerivative(
    parameter
  ) {
    const t = Math.max(
      0,
      Math.min(1, parameter)
    );

    return (
      192 *
      t *
      t *
      (
        1 - t
      ) *
      (
        1 - t
      ) *
      (
        1 -
        2 * t
      )
    );
  }

  function routeOffset(
    envelopeAmount
  ) {
    const radialOffset =
      multiplyPoint(
        routeDirection,
        routeArchDistance *
          envelopeAmount
      );

    if (
      Math.abs(
        routeLateralOffset
      ) <
      FACE_CONSTRAINT_EPSILON
    ) {
      return radialOffset;
    }

    return addPoint(
      radialOffset,
      multiplyPoint(
        routeSideDirection,
        routeLateralOffset *
          envelopeAmount
      )
    );
  }

  function middlePoint(parameter) {
    return addPoint(
      quinticBezierPoint(
        middleControls,
        parameter
      ),
      routeOffset(
        archEnvelope(
          parameter
        )
      )
    );
  }

  function middleDerivative(parameter) {
    return addPoint(
      quinticBezierDerivative(
        middleControls,
        parameter
      ),
      routeOffset(
        archEnvelopeDerivative(
          parameter
        )
      )
    );
  }

  function middleParameter(
    parameter
  ) {
    return Math.max(
      0,
      Math.min(
        1,
        (
          parameter -
          collarFraction
        ) /
          middleFraction
      )
    );
  }

  function centerAt(parameter) {
    if (
      parameter <=
      collarFraction
    ) {
      const local =
        parameter /
        collarFraction;

      return addPoint(
        centerA,
        multiplyPoint(
          outwardA,
          bridgeCollarLength *
          local
        )
      );
    }

    if (
      parameter >=
      1 - collarFraction
    ) {
      const local =
        (
          parameter -
          (
            1 - collarFraction
          )
        ) /
        collarFraction;

      return addPoint(
        centerB,
        multiplyPoint(
          outwardB,
          bridgeCollarLength *
          (
            1 - local
          )
        )
      );
    }

    return middlePoint(
      middleParameter(
        parameter
      )
    );
  }

  function tangentAt(parameter) {
    if (
      parameter <=
      collarFraction
    ) {
      return outwardA;
    }

    if (
      parameter >=
      1 - collarFraction
    ) {
      return multiplyPoint(
        outwardB,
        -1
      );
    }

    return normalizePoint(
      middleDerivative(
        middleParameter(
          parameter
        )
      )
    );
  }

  /*
   * Uniform parameter intervals create visibly bunched
   * rings wherever the centerline moves slowly. Build a
   * dense arc-length table, then place the rendered
   * rings at equal physical distances along the bridge.
   */
  const arcSamples =
    Array.from(
      {
        length:
          SECOND_FACE_BRIDGE_ARC_SAMPLES +
          1,
      },
      (_, index) => {
        const parameter =
          index /
          SECOND_FACE_BRIDGE_ARC_SAMPLES;

        return {
          parameter,
          point:
            centerAt(
              parameter
            ),
          length: 0,
        };
      }
    );

  for (
    let sampleIndex = 1;
    sampleIndex <
      arcSamples.length;
    sampleIndex += 1
  ) {
    arcSamples[
      sampleIndex
    ].length =
      arcSamples[
        sampleIndex - 1
      ].length +
      pointDistance(
        arcSamples[
          sampleIndex - 1
        ].point,
        arcSamples[
          sampleIndex
        ].point
      );
  }

  const totalArcLength =
    arcSamples[
      arcSamples.length - 1
    ].length;

  function parameterAtArcFraction(
    fraction
  ) {
    const targetLength =
      Math.max(
        0,
        Math.min(1, fraction)
      ) *
      totalArcLength;

    let upperIndex = 1;

    while (
      upperIndex <
        arcSamples.length &&
      arcSamples[
        upperIndex
      ].length <
        targetLength
    ) {
      upperIndex += 1;
    }

    if (
      upperIndex >=
      arcSamples.length
    ) {
      return 1;
    }

    const lowerSample =
      arcSamples[
        upperIndex - 1
      ];

    const upperSample =
      arcSamples[
        upperIndex
      ];

    const lengthSpan =
      upperSample.length -
      lowerSample.length;

    const local =
      lengthSpan <=
        FACE_CONSTRAINT_EPSILON
        ? 0
        : (
            targetLength -
            lowerSample.length
          ) /
          lengthSpan;

    return (
      lowerSample.parameter +
      (
        upperSample.parameter -
        lowerSample.parameter
      ) *
      local
    );
  }

  const ringCount =
    SECOND_FACE_BRIDGE_SEGMENTS +
    1;

  const parameters =
    Array.from(
      {
        length: ringCount,
      },
      (_, index) =>
        parameterAtArcFraction(
          index /
          SECOND_FACE_BRIDGE_SEGMENTS
        )
    );

  const centers =
    parameters.map(
      centerAt
    );

  const tangents =
    parameters.map(
      tangentAt
    );

  const startU =
    bridgeFrameAxis(
      faceA,
      centerA,
      outwardA
    );

  const startV =
    normalizePoint(
      crossPoint(
        outwardA,
        startU
      )
    );

  const endTangent =
    multiplyPoint(
      outwardB,
      -1
    );

  const baseFirstOffset =
    subtractPoint(
      baseFaceB[0],
      centerB
    );

  const oneTurnOffset =
    subtractPoint(
      baseFaceB[2],
      centerB
    );

  const anglePerMappingTurn =
    signedAngleAroundAxis(
      baseFirstOffset,
      oneTurnOffset,
      endTangent
    );

  const nearestIntegerTurn =
    Math.round(
      mappingTurn
    );

  const settledMapping =
    Math.abs(
      mappingTurn -
      nearestIntegerTurn
    ) <
    1e-8;

  const faceB =
    settledMapping
      ? cyclicallyShiftPoints(
          baseFaceB,
          2 *
            normalizeCyclicMappingIndex(
              nearestIntegerTurn
            )
        )
      : baseFaceB.map(
          (point) =>
            addPoint(
              centerB,
              rotateAroundAxis(
                subtractPoint(
                  point,
                  centerB
                ),
                endTangent,
                anglePerMappingTurn *
                  mappingTurn
              )
            )
        );

  const targetU =
    bridgeFrameAxis(
      faceB,
      centerB,
      endTangent
    );

  const targetV =
    normalizePoint(
      crossPoint(
        endTangent,
        targetU
      )
    );

  /*
   * Rotation-minimizing transport preserves a stable
   * cross-sectional frame around the entire centerline.
   */
  const transportedFrames = [
    {
      u: startU,
      v: startV,
    },
  ];

  for (
    let ringIndex = 1;
    ringIndex < ringCount;
    ringIndex += 1
  ) {
    const previousFrame =
      transportedFrames[
        ringIndex - 1
      ];

    const transportRotation =
      quaternionBetweenDirections(
        tangents[
          ringIndex - 1
        ],
        tangents[
          ringIndex
        ]
      );

    let transportedU =
      rotatePointByQuaternion(
        previousFrame.u,
        transportRotation
      );

    transportedU =
      normalizePoint(
        perpendicularComponent(
          transportedU,
          tangents[
            ringIndex
          ]
        )
      );

    const transportedV =
      normalizePoint(
        crossPoint(
          tangents[
            ringIndex
          ],
          transportedU
        )
      );

    transportedFrames.push({
      u: transportedU,
      v: transportedV,
    });
  }

  const finalTwist =
    signedAngleAroundAxis(
      transportedFrames[
        ringCount - 1
      ].u,
      targetU,
      endTangent
    );

  const sourceCoordinates =
    faceA.map(
      (point) => {
        const offset =
          subtractPoint(
            point,
            centerA
          );

        return {
          x:
            dotPoint(
              offset,
              startU
            ),
          y:
            dotPoint(
              offset,
              startV
            ),
        };
      }
    );

  const targetCoordinates =
    faceB.map(
      (point) => {
        const offset =
          subtractPoint(
            point,
            centerB
          );

        return {
          x:
            dotPoint(
              offset,
              targetU
            ),
          y:
            dotPoint(
              offset,
              targetV
            ),
        };
      }
    );

  function pointInSectionFrame(
    center,
    frameU,
    frameV,
    coordinate,
    scale
  ) {
    return addPoint(
      center,
      addPoint(
        multiplyPoint(
          frameU,
          coordinate.x * scale
        ),
        multiplyPoint(
          frameV,
          coordinate.y * scale
        )
      )
    );
  }

  function baseSectionScale(
    parameter
  ) {
    if (
      parameter <=
      collarFraction
    ) {
      const local =
        smootherUnitInterval(
          parameter /
          collarFraction
        );

      return (
        1 +
        (
          routeMidScale -
          1
        ) *
        local
      );
    }

    if (
      parameter >=
      1 - collarFraction
    ) {
      const local =
        smootherUnitInterval(
          (
            parameter -
            (
              1 - collarFraction
            )
          ) /
          collarFraction
        );

      return (
        routeMidScale +
        (
          1 -
          routeMidScale
        ) *
        local
      );
    }

    const middleProgress =
      middleParameter(
        parameter
      );

    return (
      routeMidScale *
      (
        1 -
        0.05 *
        archEnvelope(
          middleProgress
        )
      )
    );
  }

  function desiredSectionScale(
    parameter
  ) {
    return (
      baseSectionScale(parameter) *
      routeSectionScale
    );
  }

  function sectionAtIndex(
    ringIndex
  ) {
    const parameter =
      parameters[
        ringIndex
      ];

    if (
      parameter <=
      collarFraction
    ) {
      const scale =
        desiredSectionScale(
          parameter
        );

      return sourceCoordinates.map(
        (coordinate) =>
          pointInSectionFrame(
            centers[
              ringIndex
            ],
            startU,
            startV,
            coordinate,
            scale
          )
      );
    }

    if (
      parameter >=
      1 - collarFraction
    ) {
      const scale =
        desiredSectionScale(
          parameter
        );

      return targetCoordinates.map(
        (coordinate) =>
          pointInSectionFrame(
            centers[
              ringIndex
            ],
            targetU,
            targetV,
            coordinate,
            scale
          )
      );
    }

    const middleProgress =
      middleParameter(
        parameter
      );

    /*
     * Quintic smootherstep gives zero twist velocity and
     * zero twist acceleration at both collar junctions.
     */
    const smoothMiddleProgress =
      smootherUnitInterval(
        middleProgress
      );

    const twist =
      finalTwist *
      smoothMiddleProgress;

    const frameU =
      normalizePoint(
        rotateAroundAxis(
          transportedFrames[
            ringIndex
          ].u,
          tangents[
            ringIndex
          ],
          twist
        )
      );

    const frameV =
      normalizePoint(
        crossPoint(
          tangents[
            ringIndex
          ],
          frameU
        )
      );

    const scale =
      desiredSectionScale(
        parameter
      );

    return sourceCoordinates.map(
      (
        sourceCoordinate,
        vertexIndex
      ) => {
        const targetCoordinate =
          targetCoordinates[
            vertexIndex
          ];

        return pointInSectionFrame(
          centers[
            ringIndex
          ],
          frameU,
          frameV,
          {
            x:
              sourceCoordinate.x +
              (
                targetCoordinate.x -
                sourceCoordinate.x
              ) *
              smoothMiddleProgress,
            y:
              sourceCoordinate.y +
              (
                targetCoordinate.y -
                sourceCoordinate.y
              ) *
              smoothMiddleProgress,
          },
          scale
        );
      }
    );
  }

  const sections =
    parameters.map(
      (_, ringIndex) =>
        sectionAtIndex(
          ringIndex
        )
    );

  /*
   * Preserve exact attachment geometry at both ends.
   */
  sections[0] =
    faceA.map((point) =>
      addPoint(
        centerA,
        multiplyPoint(
          subtractPoint(
            point,
            centerA
          ),
          routeSectionScale
        )
      )
    );

  sections[
    sections.length - 1
  ] =
    faceB.map((point) =>
      addPoint(
        centerB,
        multiplyPoint(
          subtractPoint(
            point,
            centerB
          ),
          routeSectionScale
        )
      )
    );

  /*
   * Retain a complete world-space triangle mesh for
   * route planning and collision tests. These triangles
   * describe the full bridge even while the visible
   * construction is only partially extended.
   */
  const triangles = [];

  for (
    let segmentIndex = 0;
    segmentIndex <
      SECOND_FACE_BRIDGE_SEGMENTS;
    segmentIndex += 1
  ) {
    const startSection =
      sections[
        segmentIndex
      ];

    const endSection =
      sections[
        segmentIndex + 1
      ];

    startSection.forEach(
      (_, vertexIndex) => {
        const nextVertexIndex =
          (
            vertexIndex +
            1
          ) %
          startSection.length;

        const first =
          startSection[
            vertexIndex
          ];

        const second =
          startSection[
            nextVertexIndex
          ];

        const third =
          endSection[
            nextVertexIndex
          ];

        const fourth =
          endSection[
            vertexIndex
          ];

        triangles.push(
          {
            key:
              `solid-bridge-mesh-${bridgeIndex}-` +
              `${pairId}-${segmentIndex}-` +
              `${vertexIndex}-0`,
            bridgeIndex,
            pairId,
            routeLane:
              resolvedRouteLane,
            mappingTurn,
            segmentIndex,
            sideIndex:
              vertexIndex,
            triangleIndex: 0,
            points: [
              first,
              second,
              third,
            ],
          },
          {
            key:
              `solid-bridge-mesh-${bridgeIndex}-` +
              `${pairId}-${segmentIndex}-` +
              `${vertexIndex}-1`,
            bridgeIndex,
            pairId,
            routeLane:
              resolvedRouteLane,
            mappingTurn,
            segmentIndex,
            sideIndex:
              vertexIndex,
            triangleIndex: 1,
            points: [
              first,
              third,
              fourth,
            ],
          }
        );
      }
    );
  }

  const worldFaces = [];

  const completedSegments =
    Math.floor(
      amount *
      SECOND_FACE_BRIDGE_SEGMENTS
    );

  const partialSegmentAmount =
    amount *
    SECOND_FACE_BRIDGE_SEGMENTS -
    completedSegments;

  const visibleSegmentCount =
    Math.min(
      SECOND_FACE_BRIDGE_SEGMENTS,
      completedSegments +
      (
        partialSegmentAmount >
        FACE_CONSTRAINT_EPSILON
          ? 1
          : 0
      )
    );

  for (
    let segmentIndex = 0;
    segmentIndex <
      visibleSegmentCount;
    segmentIndex += 1
  ) {
    const startSection =
      sections[
        segmentIndex
      ];

    const fullEndSection =
      sections[
        segmentIndex + 1
      ];

    const segmentProgress =
      segmentIndex <
      completedSegments
        ? 1
        : partialSegmentAmount;

    const endSection =
      fullEndSection.map(
        (point, vertexIndex) =>
          lerpPoint(
            startSection[
              vertexIndex
            ],
            point,
            segmentProgress
          )
      );

    startSection.forEach(
      (_, vertexIndex) => {
        const nextVertexIndex =
          (
            vertexIndex +
            1
          ) %
          startSection.length;

        worldFaces.push({
          key:
            `solid-bridge-${bridgeIndex}-` +
            `${pairId}-${segmentIndex}-` +
            `${vertexIndex}`,
          kind:
            "solid-bridge-side",
          bridgeIndex,
          routeLane:
            resolvedRouteLane,
          mappingTurn,
          points: [
            startSection[
              vertexIndex
            ],
            startSection[
              nextVertexIndex
            ],
            endSection[
              nextVertexIndex
            ],
            endSection[
              vertexIndex
            ],
          ],
          fillOpacity:
            0.18 +
            0.08 *
            amount,
          strokeOpacity:
            0.62 +
            0.24 *
            amount,
        });
      }
    );
  }

  if (
    amount <
    SECOND_FACE_BRIDGE_FULL_STRENGTH
  ) {
    let frontSection;

    if (
      visibleSegmentCount === 0
    ) {
      frontSection =
        sections[0];
    } else {
      const lastSegmentIndex =
        visibleSegmentCount - 1;

      const startSection =
        sections[
          lastSegmentIndex
        ];

      const endSection =
        sections[
          lastSegmentIndex + 1
        ];

      const segmentProgress =
        lastSegmentIndex <
        completedSegments
          ? 1
          : partialSegmentAmount;

      frontSection =
        endSection.map(
          (point, vertexIndex) =>
            lerpPoint(
              startSection[
                vertexIndex
              ],
              point,
              segmentProgress
            )
        );
    }

    worldFaces.push({
      key:
        `solid-bridge-${bridgeIndex}-` +
        `${pairId}-front`,
      kind:
        "solid-bridge-front",
      bridgeIndex,
      routeLane:
        resolvedRouteLane,
      mappingTurn,
      points:
        frontSection,
      fillOpacity: 0.3,
      strokeOpacity: 0.92,
    });
  }

  return {
    bridgeIndex,
    pairId,
    pairing,
    progress: amount,
    bridgeSpanScale:
      spanScale,
    routeLane:
      resolvedRouteLane,
    routeSpec:
      resolvedRouteSpec,
    mappingTurn,
    route: {
      id:
        resolvedRouteSpec.id,
      kind:
        resolvedRouteSpec.kind,
      family:
        resolvedRouteSpec.family,
      lane:
        resolvedRouteLane,
      direction:
        clonePoint(
          routeDirection
        ),
      sideDirection:
        clonePoint(
          routeSideDirection
        ),
      sceneCenter:
        clonePoint(
          sceneCenter
        ),
      startFaceCenter:
        clonePoint(
          centerA
        ),
      endFaceCenter:
        clonePoint(
          centerB
        ),
      startCollarCenter:
        clonePoint(
          startCollarCenter
        ),
      endCollarCenter:
        clonePoint(
          endCollarCenter
        ),
      outwardA:
        clonePoint(
          outwardA
        ),
      outwardB:
        clonePoint(
          outwardB
        ),
      collarLength:
        bridgeCollarLength,
      spanScale,
      collarFraction:
        SECOND_FACE_BRIDGE_COLLAR_FRACTION,
      archDistance:
        routeArchDistance,
      lateralOffset:
        routeLateralOffset,
      midScale:
        routeMidScale,
      finalTwist,
    },
    parameters,
    centerline:
      centers,
    tangents,
    sections,
    triangles,
    worldFaces,
    totalArcLength,
    visibleSegmentCount,
  };
}


function bridgeAuditBounds(points) {
  return points.reduce(
    (bounds, point) => ({
      minX: Math.min(bounds.minX, point.x),
      maxX: Math.max(bounds.maxX, point.x),
      minY: Math.min(bounds.minY, point.y),
      maxY: Math.max(bounds.maxY, point.y),
      minZ: Math.min(bounds.minZ, point.z),
      maxZ: Math.max(bounds.maxZ, point.z),
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

function bridgeAuditBoundsOverlap(
  first,
  second
) {
  const epsilon =
    BRIDGE_AUDIT_EPSILON;

  return !(
    first.maxX + epsilon <
      second.minX ||
    second.maxX + epsilon <
      first.minX ||
    first.maxY + epsilon <
      second.minY ||
    second.maxY + epsilon <
      first.minY ||
    first.maxZ + epsilon <
      second.minZ ||
    second.maxZ + epsilon <
      first.minZ
  );
}

function bridgeAuditSharesPoint(
  first,
  second
) {
  return first.some(
    (firstPoint) =>
      second.some(
        (secondPoint) =>
          pointDistance(
            firstPoint,
            secondPoint
          ) <=
          BRIDGE_AUDIT_EPSILON
      )
  );
}

function bridgeAuditProjectionRange(
  triangle,
  axis
) {
  const projections =
    triangle.map(
      (point) =>
        dotPoint(point, axis)
    );

  return {
    minimum:
      Math.min(...projections),
    maximum:
      Math.max(...projections),
  };
}

function bridgeAuditAxisSeparates(
  first,
  second,
  axis
) {
  if (
    Math.hypot(
      axis.x,
      axis.y,
      axis.z
    ) <=
    BRIDGE_AUDIT_EPSILON
  ) {
    return false;
  }

  const firstRange =
    bridgeAuditProjectionRange(
      first,
      axis
    );

  const secondRange =
    bridgeAuditProjectionRange(
      second,
      axis
    );

  return (
    firstRange.maximum <
      secondRange.minimum -
        BRIDGE_AUDIT_EPSILON ||
    secondRange.maximum <
      firstRange.minimum -
        BRIDGE_AUDIT_EPSILON
  );
}

function bridgeAuditTrianglesIntersect(
  first,
  second
) {
  const firstEdges = [
    subtractPoint(
      first[1],
      first[0]
    ),
    subtractPoint(
      first[2],
      first[1]
    ),
    subtractPoint(
      first[0],
      first[2]
    ),
  ];

  const secondEdges = [
    subtractPoint(
      second[1],
      second[0]
    ),
    subtractPoint(
      second[2],
      second[1]
    ),
    subtractPoint(
      second[0],
      second[2]
    ),
  ];

  const axes = [
    crossPoint(
      firstEdges[0],
      firstEdges[1]
    ),
    crossPoint(
      secondEdges[0],
      secondEdges[1]
    ),
  ];

  firstEdges.forEach(
    (firstEdge) => {
      secondEdges.forEach(
        (secondEdge) => {
          axes.push(
            crossPoint(
              firstEdge,
              secondEdge
            )
          );
        }
      );
    }
  );

  return !axes.some(
    (axis) =>
      bridgeAuditAxisSeparates(
        first,
        second,
        axis
      )
  );
}

function bridgeAuditTriangleRecords(
  triangles
) {
  return triangles
    .map(
      (triangle) => ({
        triangle,
        bounds:
          bridgeAuditBounds(
            triangle.points
          ),
      })
    )
    .sort(
      (first, second) =>
        first.bounds.minX -
        second.bounds.minX
    );
}

function bridgeAuditIntersectionSummary(
  firstTriangles,
  secondTriangles = null,
  shouldSkipPair = null
) {
  const sameSurface =
    secondTriangles === null;

  const firstRecords =
    bridgeAuditTriangleRecords(
      firstTriangles
    );

  const secondRecords =
    sameSurface
      ? firstRecords
      : bridgeAuditTriangleRecords(
          secondTriangles
        );

  let hitCount = 0;
  let testedPairCount = 0;
  let firstHit = null;
  let secondLowerIndex = 0;

  for (
    let firstIndex = 0;
    firstIndex <
      firstRecords.length;
    firstIndex += 1
  ) {
    const firstRecord =
      firstRecords[
        firstIndex
      ];

    if (!sameSurface) {
      while (
        secondLowerIndex <
          secondRecords.length &&
        secondRecords[
          secondLowerIndex
        ].bounds.maxX +
          BRIDGE_AUDIT_EPSILON <
          firstRecord.bounds.minX
      ) {
        secondLowerIndex += 1;
      }
    }

    for (
      let secondIndex =
        sameSurface
          ? firstIndex + 1
          : secondLowerIndex;
      secondIndex <
        secondRecords.length;
      secondIndex += 1
    ) {
      const secondRecord =
        secondRecords[
          secondIndex
        ];

      if (
        secondRecord.bounds.minX >
        firstRecord.bounds.maxX +
          BRIDGE_AUDIT_EPSILON
      ) {
        break;
      }

      const sameBridgeLocalNeighbors =
        sameSurface &&
        firstRecord.triangle.bridgeIndex ===
          secondRecord.triangle.bridgeIndex &&
        firstRecord.triangle.pairId ===
          secondRecord.triangle.pairId &&
        Number.isInteger(
          firstRecord.triangle.segmentIndex
        ) &&
        Number.isInteger(
          secondRecord.triangle.segmentIndex
        ) &&
        Math.abs(
          firstRecord.triangle.segmentIndex -
            secondRecord.triangle.segmentIndex
        ) <=
          BRIDGE_AUDIT_LOCAL_SEGMENT_WINDOW;

      if (
        !bridgeAuditBoundsOverlap(
          firstRecord.bounds,
          secondRecord.bounds
        ) ||
        (
          typeof shouldSkipPair ===
            "function" &&
          shouldSkipPair(
            firstRecord.triangle,
            secondRecord.triangle
          )
        ) ||
        sameBridgeLocalNeighbors ||
        bridgeAuditSharesPoint(
          firstRecord
            .triangle.points,
          secondRecord
            .triangle.points
        )
      ) {
        continue;
      }

      testedPairCount += 1;

      if (
        !bridgeAuditTrianglesIntersect(
          firstRecord
            .triangle.points,
          secondRecord
            .triangle.points
        )
      ) {
        continue;
      }

      hitCount += 1;

      firstHit ??= {
        firstKey:
          firstRecord
            .triangle.key,
        secondKey:
          secondRecord
            .triangle.key,
      };

      if (
        hitCount >=
        BRIDGE_AUDIT_MAX_HITS
      ) {
        return {
          hitCount,
          testedPairCount,
          firstHit,
          truncated: true,
        };
      }
    }
  }

  return {
    hitCount,
    testedPairCount,
    firstHit,
    truncated: false,
  };
}

function bridgeAuditTetrahedronTriangles(
  positions
) {
  return ["A", "B"].flatMap(
    (tetrahedronId) =>
      TRUNCATED_TETRAHEDRON_MESHES[
        tetrahedronId
      ].triangles.map(
        (triangle) => ({
          key:
            `${tetrahedronId}:` +
            triangle.id,
          tetrahedronId,
          kind: triangle.kind,
          pairId:
            triangle.pairId ?? null,
          points:
            triangle
              .vertexIndices
              .map(
                (vertexIndex) =>
                  positions[
                    tetrahedronId
                  ][
                    vertexIndex
                  ]
              ),
        })
      )
  );
}

function bridgeAuditIsAttachmentContact(
  bridgeTriangle,
  tetrahedronTriangle
) {
  if (
    tetrahedronTriangle.kind !==
      "large" ||
    tetrahedronTriangle.pairId !==
      bridgeTriangle.pairId ||
    !Number.isInteger(
      bridgeTriangle.segmentIndex
    )
  ) {
    return false;
  }

  if (
    tetrahedronTriangle.tetrahedronId ===
    "A"
  ) {
    return (
      bridgeTriangle.segmentIndex <=
      BRIDGE_ATTACHMENT_AUDIT_SEGMENT_WINDOW
    );
  }

  if (
    tetrahedronTriangle.tetrahedronId ===
    "B"
  ) {
    return (
      bridgeTriangle.segmentIndex >=
      SECOND_FACE_BRIDGE_SEGMENTS -
        BRIDGE_ATTACHMENT_AUDIT_SEGMENT_WINDOW
    );
  }

  return false;
}

function analyzeBridgeCandidate({
  candidateModel,
  earlierBridgeModels,
  positions,
}) {
  const selfIntersections =
    bridgeAuditIntersectionSummary(
      candidateModel.triangles
    );

  const tetrahedronIntersections =
    bridgeAuditIntersectionSummary(
      candidateModel.triangles,
      bridgeAuditTetrahedronTriangles(
        positions
      ),
      bridgeAuditIsAttachmentContact
    );

  const earlierBridgeIntersections =
    earlierBridgeModels.reduce(
      (combined, earlierModel) => {
        const current =
          bridgeAuditIntersectionSummary(
            candidateModel.triangles,
            earlierModel.triangles
          );

        return {
          hitCount:
            Math.min(
              BRIDGE_AUDIT_MAX_HITS,
              combined.hitCount +
                current.hitCount
            ),
          testedPairCount:
            combined
              .testedPairCount +
            current
              .testedPairCount,
          firstHit:
            combined.firstHit ??
            current.firstHit,
          truncated:
            combined.truncated ||
            current.truncated,
        };
      },
      {
        hitCount: 0,
        testedPairCount: 0,
        firstHit: null,
        truncated: false,
      }
    );

  const status =
    selfIntersections.hitCount > 0
      ? "self-intersection"
      : tetrahedronIntersections
          .hitCount > 0
        ? "tetrahedron-intersection"
        : earlierBridgeIntersections
            .hitCount > 0
          ? "earlier-bridge-intersection"
          : "valid";

  return {
    valid:
      status === "valid",
    status,
    selfIntersections,
    tetrahedronIntersections,
    earlierBridgeIntersections,
  };
}

function bridgeAuditCacheKey({
  constructionOrder,
  facePairMappingTurns,
  bridgeIndex,
  routeId,
  obstacleRouteIds = [],
}) {
  const relevantPairIds =
    constructionOrder.slice(
      0,
      bridgeIndex + 2
    );

  const settledMappings =
    relevantPairIds.map(
      (pairId) =>
        settledCyclicMappingIndex(
          facePairMappingTurns[
            pairId
          ] ?? 0
        )
    );

  if (
    settledMappings.some(
      (mappingIndex) =>
        mappingIndex === null
    )
  ) {
    return null;
  }

  return [
    relevantPairIds.join(","),
    settledMappings.join(","),
    bridgeIndex,
    routeId ??
      DEFAULT_BRIDGE_ROUTE_SPEC.id,
    obstacleRouteIds.join(","),
  ].join("|");
}

function analyzeBridgeCandidateCached({
  candidateModel,
  earlierBridgeModels,
  positions,
  constructionOrder,
  facePairMappingTurns,
  pairStrengths,
}) {
  const relevantPairIds =
    constructionOrder.slice(
      0,
      candidateModel.bridgeIndex +
        2
    );

  if (
    relevantPairIds.length !==
      candidateModel.bridgeIndex +
        2 ||
    relevantPairIds.some(
      (pairId) =>
        (
          pairStrengths[
            pairId
          ] ?? 0
        ) <=
        FACE_CONSTRAINT_EPSILON
    )
  ) {
    return {
      valid: false,
      status:
        "identification-transition",
    };
  }

  const cacheKey =
    bridgeAuditCacheKey({
      constructionOrder,
      facePairMappingTurns,
      bridgeIndex:
        candidateModel.bridgeIndex,
      routeId:
        candidateModel.route?.id ??
        candidateModel.routeSpec?.id,
      obstacleRouteIds:
        earlierBridgeModels.map(
          (bridgeModel) =>
            bridgeModel.route?.id ??
            bridgeModel.routeSpec?.id ??
            DEFAULT_BRIDGE_ROUTE_SPEC.id
        ),
    });

  if (cacheKey === null) {
    return {
      valid: false,
      status:
        "mapping-transition",
    };
  }

  const cached =
    BRIDGE_AUDIT_CACHE.get(
      cacheKey
    );

  if (cached) {
    return cached;
  }

  const diagnostics =
    analyzeBridgeCandidate({
      candidateModel,
      earlierBridgeModels,
      positions,
    });

  if (
    BRIDGE_AUDIT_CACHE.size >=
    BRIDGE_AUDIT_CACHE_LIMIT
  ) {
    const oldestKey =
      BRIDGE_AUDIT_CACHE
        .keys()
        .next()
        .value;

    BRIDGE_AUDIT_CACHE.delete(
      oldestKey
    );
  }

  BRIDGE_AUDIT_CACHE.set(
    cacheKey,
    diagnostics
  );

  return diagnostics;
}

function bridgeRouteSpecForId(
  routeId
) {
  return (
    BRIDGE_ROUTE_CANDIDATE_SPECS.find(
      (routeSpec) =>
        routeSpec.id === routeId
    ) ??
    DEFAULT_BRIDGE_ROUTE_SPEC
  );
}

function bridgeRouteDisplayLabel(
  routeOrId
) {
  const routeId =
    typeof routeOrId === "string"
      ? routeOrId
      : routeOrId?.id ??
        DEFAULT_BRIDGE_ROUTE_SPEC.id;

  const labels = {
    "radial-exterior":
      "edge-adjacent center lane",
    "edge-adjacent-positive-inner":
      "edge-adjacent positive inner lane",
    "edge-adjacent-negative-inner":
      "edge-adjacent negative inner lane",
    "edge-adjacent-positive-outer":
      "edge-adjacent positive outer lane",
    "edge-adjacent-negative-outer":
      "edge-adjacent negative outer lane",
    "nonadjacent-exterior":
      "nonadjacent positive inner lane",
    "nonadjacent-negative-inner":
      "nonadjacent negative inner lane",
    "nonadjacent-positive-outer":
      "nonadjacent positive outer lane",
    "nonadjacent-negative-outer":
      "nonadjacent negative outer lane",
    "nonadjacent-center":
      "nonadjacent center lane",
  };

  return (
    labels[routeId] ??
    routeId.replaceAll("-", " ")
  );
}

function bridgeRouteComplexityPenalty(
  routeSpec
) {
  const preferredRouteSpec =
    routeSpec.bridgeType ===
    "nonadjacent"
      ? NONADJACENT_BRIDGE_ROUTE_SPEC
      : DEFAULT_BRIDGE_ROUTE_SPEC;

  if (
    routeSpec.id ===
    preferredRouteSpec.id
  ) {
    return 0;
  }

  return (
    420 +
    Math.abs(
      routeSpec.lateralOffset -
      preferredRouteSpec
        .lateralOffset
    ) * 0.18 +
    Math.abs(
      routeSpec.archDistance -
      preferredRouteSpec
        .archDistance
    ) * 0.08 +
    routeSpec.lane * 1e-3
  );
}

function bridgeRouteCandidateScore(
  bridgeModel,
  routeSpec
) {
  return (
    bridgeModel.totalArcLength +
    bridgeRouteComplexityPenalty(
      routeSpec
    )
  );
}

function bridgeSweepPositionKey(
  positions
) {
  return ["A", "B"]
    .flatMap((tetrahedronId) =>
      positions[tetrahedronId]
        .flatMap((point) => [
          point.x,
          point.y,
          point.z,
        ])
    )
    .map((value) =>
      value.toFixed(2)
    )
    .join(",");
}

function bridgeSweepRouteSelectionCacheKey({
  definitions,
  positions,
  sceneCenter,
  preferredRouteIdsByPairId,
  sweepStartRouteSpecsByPairId,
}) {
  const definitionKey =
    definitions.map((definition) =>
      [
        definition.pairId,
        definition.bridgeIndex,
        definition.bridgeType,
        definition.progress.toFixed(4),
        (
          definition.bridgeSpanScale ??
          1
        ).toFixed(4),
        (
          definition.sweepStartMappingTurn ??
          definition.mappingTurn ??
          0
        ).toFixed(6),
        (
          definition.routingMappingTurn ??
          definition.mappingTurn ??
          0
        ).toFixed(6),
      ].join(":")
    ).join("|");

  const preferredKey =
    FIGURE_EIGHT_FACE_PAIRS.map(
      (_, pairId) =>
        preferredRouteIdsByPairId?.[
          pairId
        ] ?? "none"
    ).join(",");

  return [
    definitionKey,
    bridgeRouteSpecArrayKey(
      sweepStartRouteSpecsByPairId
    ),
    preferredKey,
    bridgeSweepPositionKey(positions),
    sceneCenter.x.toFixed(2),
    sceneCenter.y.toFixed(2),
    sceneCenter.z.toFixed(2),
  ].join("||");
}

function setBridgeSweepRouteCache(
  cacheKey,
  value
) {
  if (
    BRIDGE_SWEEP_ROUTE_CACHE.size >=
    BRIDGE_SWEEP_ROUTE_CACHE_LIMIT
  ) {
    const oldestKey =
      BRIDGE_SWEEP_ROUTE_CACHE
        .keys()
        .next()
        .value;

    BRIDGE_SWEEP_ROUTE_CACHE.delete(
      oldestKey
    );
  }

  BRIDGE_SWEEP_ROUTE_CACHE.set(
    cacheKey,
    value
  );
}

function buildBridgeSweepModels({
  definition,
  positions,
  sceneCenter,
  startRouteSpec,
  targetRouteSpec,
}) {
  const targetMappingTurn =
    definition.routingMappingTurn ??
    definition.mappingTurn ??
    0;

  const startMappingTurn =
    definition.sweepStartMappingTurn ??
    definition.mappingTurn ??
    targetMappingTurn;

  const normalizedTargetRoute =
    normalizeBridgeRouteSpec(
      targetRouteSpec,
      targetRouteSpec.lane
    );

  const normalizedStartRoute =
    startRouteSpec === null
      ? normalizedTargetRoute
      : normalizeBridgeRouteSpec(
          startRouteSpec,
          startRouteSpec.lane
        );

  const mappingChanges =
    Math.abs(
      targetMappingTurn -
      startMappingTurn
    ) > 1e-8;

  const routeChanges =
    bridgeRouteSpecKey(
      normalizedStartRoute
    ) !==
    bridgeRouteSpecKey(
      normalizedTargetRoute
    );

  const sampleCount =
    mappingChanges || routeChanges
      ? BRIDGE_ROUTE_SWEEP_SAMPLE_COUNT
      : 1;

  const totalDuration = Math.max(
    FACE_MAPPING_DURATION_MS,
    BRIDGE_ROUTE_CHANGE_DURATION_MS
  );

  return Array.from(
    { length: sampleCount },
    (_, sampleIndex) => {
      const elapsed =
        sampleCount === 1
          ? totalDuration
          : totalDuration *
            sampleIndex /
            (sampleCount - 1);

      const mappingRaw = Math.min(
        1,
        elapsed /
          FACE_MAPPING_DURATION_MS
      );

      const routeRaw = Math.min(
        1,
        elapsed /
          BRIDGE_ROUTE_CHANGE_DURATION_MS
      );

      const mappingProgress =
        bridgeTransitionMappingProgress(
          mappingRaw
        );

      const routeProgress =
        bridgeTransitionMappingProgress(
          routeRaw
        );

      const sampledRouteSpec =
        interpolateBridgeRouteSpec(
          normalizedStartRoute,
          normalizedTargetRoute,
          routeProgress,
          routeRaw
        );

      const sampledMappingTurn =
        startMappingTurn +
        (
          targetMappingTurn -
          startMappingTurn
        ) *
          mappingProgress;

      return makeFaceIdentificationBridgeModel({
        positions,
        pairing:
          definition.pairing,
        progress:
          definition.progress,
        bridgeSpanScale:
          definition.bridgeSpanScale ??
          1,
        bridgeIndex:
          definition.bridgeIndex,
        routeLane:
          sampledRouteSpec.lane,
        routeSpec:
          sampledRouteSpec,
        mappingTurn:
          sampledMappingTurn,
        sceneCenter,
      });
    }
  );
}

function analyzeBridgeSweepCandidate({
  sweepModels,
  positions,
}) {
  let lastDiagnostics = null;

  for (
    let sampleIndex = 0;
    sampleIndex < sweepModels.length;
    sampleIndex += 1
  ) {
    const diagnostics =
      analyzeBridgeCandidate({
        candidateModel:
          sweepModels[sampleIndex],
        earlierBridgeModels: [],
        positions,
      });

    lastDiagnostics = diagnostics;

    if (!diagnostics.valid) {
      return {
        ...diagnostics,
        valid: false,
        status:
          sweepModels.length > 1
            ? `swept-${diagnostics.status}`
            : diagnostics.status,
        failedSweepSampleIndex:
          sampleIndex,
        sweepSampleCount:
          sweepModels.length,
      };
    }
  }

  return {
    ...(lastDiagnostics ?? {
      selfIntersections: null,
      tetrahedronIntersections: null,
      earlierBridgeIntersections: null,
    }),
    valid: true,
    status: "valid",
    failedSweepSampleIndex: null,
    sweepSampleCount:
      sweepModels.length,
  };
}

function bridgeSweepAttemptsIntersect(
  firstAttempt,
  secondAttempt
) {
  const sampleCount = Math.max(
    firstAttempt.sweepModels.length,
    secondAttempt.sweepModels.length
  );

  for (
    let sampleIndex = 0;
    sampleIndex < sampleCount;
    sampleIndex += 1
  ) {
    const firstModelIndex =
      sampleCount === 1
        ? 0
        : Math.round(
            sampleIndex *
            (
              firstAttempt
                .sweepModels.length - 1
            ) /
            (sampleCount - 1)
          );

    const secondModelIndex =
      sampleCount === 1
        ? 0
        : Math.round(
            sampleIndex *
            (
              secondAttempt
                .sweepModels.length - 1
            ) /
            (sampleCount - 1)
          );

    const firstModel =
      firstAttempt.sweepModels[
        firstModelIndex
      ];

    const secondModel =
      secondAttempt.sweepModels[
        secondModelIndex
      ];

    if (
      bridgeAuditIntersectionSummary(
        firstModel.triangles,
        secondModel.triangles
      ).hitCount > 0
    ) {
      return true;
    }
  }

  return false;
}

function selectCollisionFreeBridgeRouteSet({
  definitions,
  positions,
  sceneCenter,
  preferredRouteIdsByPairId = null,
  sweepStartRouteSpecsByPairId = null,
}) {
  const cacheKey =
    bridgeSweepRouteSelectionCacheKey({
      definitions,
      positions,
      sceneCenter,
      preferredRouteIdsByPairId,
      sweepStartRouteSpecsByPairId,
    });

  const cached =
    BRIDGE_SWEEP_ROUTE_CACHE.get(
      cacheKey
    );

  if (cached) {
    return cached;
  }

  const globalMappingChanges =
    definitions.some(
      (definition) =>
        Math.abs(
          (
            definition.routingMappingTurn ??
            definition.mappingTurn ??
            0
          ) -
          (
            definition.sweepStartMappingTurn ??
            definition.mappingTurn ??
            0
          )
        ) > 1e-8
    );

  const candidateSets =
    definitions.map((definition) => {
      const routeSpecs =
        bridgeRouteCandidateSpecsForType(
          definition.bridgeType
        );

      /*
       * A bridge's first exposure has no remembered route yet,
       * while every later exposure does. Seed that first route
       * with the canonical candidate for its bridge class so the
       * first Bridge action and every later Bridge action enter
       * the global planner with the same route preference.
       * Backtracking may still choose another lane when the
       * canonical route is blocked.
       */
      const canonicalRouteId =
        routeSpecs[0]?.id ?? null;

      const preferredRouteId =
        preferredRouteIdsByPairId?.[
          definition.pairId
        ] ?? canonicalRouteId;

      const startRouteSpec =
        sweepStartRouteSpecsByPairId?.[
          definition.pairId
        ] ?? null;

      const startMappingTurn =
        definition.sweepStartMappingTurn ??
        definition.mappingTurn ??
        0;

      const targetMappingTurn =
        definition.routingMappingTurn ??
        definition.mappingTurn ??
        startMappingTurn;

      const mappingChanges =
        Math.abs(
          targetMappingTurn -
          startMappingTurn
        ) > 1e-8;

      const attempts = routeSpecs
        .flatMap(
          (routeSpec, routeIndex) => {
            const routeChanges =
              startRouteSpec !== null &&
              bridgeRouteSpecKey(
                startRouteSpec
              ) !==
                bridgeRouteSpecKey({
                  ...routeSpec,
                  transitionClearance: 0,
                });

            const transitionProfiles =
              startRouteSpec !== null &&
              (
                globalMappingChanges ||
                routeChanges
              )
                ? [
                    {
                      transitionClearance: 0,
                      transitionPinch: 0,
                    },
                    {
                      transitionClearance:
                        BRIDGE_ROUTE_SWEEP_CLEARANCE,
                      transitionPinch: 0,
                    },
                  ]
                : [
                    {
                      transitionClearance: 0,
                      transitionPinch: 0,
                    },
                  ];

            return transitionProfiles.map(
              (
                transitionProfile,
                profileIndex
              ) => {
                const {
                  transitionClearance,
                  transitionPinch,
                } = transitionProfile;

                const targetRouteSpec = {
                  ...routeSpec,
                  transitionClearance,
                  transitionPinch,
                };

                const sweepModels =
                  buildBridgeSweepModels({
                    definition,
                    positions,
                    sceneCenter,
                    startRouteSpec,
                    targetRouteSpec,
                  });

                const model =
                  sweepModels[
                    sweepModels.length - 1
                  ];

                const endpointDiagnostics =
                  analyzeBridgeCandidate({
                    candidateModel: model,
                    earlierBridgeModels: [],
                    positions,
                  });

                const sweepDiagnostics =
                  analyzeBridgeSweepCandidate({
                    sweepModels,
                    positions,
                  });

                return {
                  routeSpec:
                    targetRouteSpec,
                  routeIndex:
                    routeIndex * 2 +
                    profileIndex,
                  model,
                  sweepModels,
                  diagnostics:
                    endpointDiagnostics,
                  sweepDiagnostics,
                  sweepClear:
                    sweepDiagnostics.valid,
                  score:
                    bridgeRouteCandidateScore(
                      model,
                      routeSpec
                    ) +
                    (
                      preferredRouteId ===
                        null ||
                      routeSpec.id ===
                        preferredRouteId
                        ? 0
                        : BRIDGE_ROUTE_CHANGE_PENALTY
                    ) +
                    (
                      transitionClearance > 0
                        ? BRIDGE_ROUTE_SWEEP_CLEARANCE_PENALTY
                        : 0
                    ) +
                    (
                      sweepDiagnostics.valid
                        ? 0
                        : BRIDGE_ROUTE_SWEEP_FAILURE_PENALTY
                    ),
                };
              }
            );
          }
        )
        .sort(
          (first, second) =>
            Number(
              second.diagnostics.valid
            ) -
              Number(
                first.diagnostics.valid
              ) ||
            Number(
              second.sweepClear
            ) -
              Number(
                first.sweepClear
              ) ||
            first.score -
              second.score ||
            first.routeIndex -
              second.routeIndex
        );

      return {
        definition,
        attempts,
        endpointValidAttempts:
          attempts.filter(
            (attempt) =>
              attempt.diagnostics.valid
          ),
      };
    });

  const selectedAttempts =
    Array.from(
      { length: candidateSets.length },
      () => null
    );

  function attemptsIntersect(
    firstAttempt,
    secondAttempt,
    requireSweepClear
  ) {
    if (requireSweepClear) {
      return bridgeSweepAttemptsIntersect(
        firstAttempt,
        secondAttempt
      );
    }

    return (
      bridgeAuditIntersectionSummary(
        firstAttempt.model.triangles,
        secondAttempt.model.triangles
      ).hitCount > 0
    );
  }

  function search(
    candidateSetIndex,
    earlierAttempts,
    requireSweepClear
  ) {
    if (
      candidateSetIndex >=
      candidateSets.length
    ) {
      return true;
    }

    const candidateSet =
      candidateSets[
        candidateSetIndex
      ];

    for (
      const attempt of
        candidateSet
          .endpointValidAttempts
    ) {
      if (
        requireSweepClear &&
        !attempt.sweepClear
      ) {
        continue;
      }

      const crossesEarlierBridge =
        earlierAttempts.some(
          (earlierAttempt) =>
            attemptsIntersect(
              attempt,
              earlierAttempt,
              requireSweepClear
            )
        );

      if (crossesEarlierBridge) {
        continue;
      }

      selectedAttempts[
        candidateSetIndex
      ] = attempt;

      if (
        search(
          candidateSetIndex + 1,
          [
            ...earlierAttempts,
            attempt,
          ],
          requireSweepClear
        )
      ) {
        return true;
      }
    }

    selectedAttempts[
      candidateSetIndex
    ] = null;

    return false;
  }

  const sweepClearSelectionFound =
    search(0, [], true);

  if (!sweepClearSelectionFound) {
    selectedAttempts.fill(null);
  }

  const endpointClearSelectionFound =
    sweepClearSelectionFound ||
    search(0, [], false);

  if (!endpointClearSelectionFound) {
    const acceptedAttempts = [];

    candidateSets.forEach(
      (candidateSet, index) => {
        const selectedAttempt =
          candidateSet
            .endpointValidAttempts
            .find(
              (attempt) =>
                !acceptedAttempts.some(
                  (acceptedAttempt) =>
                    attemptsIntersect(
                      attempt,
                      acceptedAttempt,
                      false
                    )
                )
            ) ?? null;

        selectedAttempts[index] =
          selectedAttempt;

        if (selectedAttempt !== null) {
          acceptedAttempts.push(
            selectedAttempt
          );
        }
      }
    );
  }

  const selections =
    candidateSets.map(
      (candidateSet, index) => {
        const selectedAttempt =
          selectedAttempts[index];

        const routeAttempts =
          candidateSet.attempts.map(
            bridgeRouteAttemptSummary
          );

        if (selectedAttempt !== null) {
          return {
            model:
              selectedAttempt.model,
            selectedRouteSpec:
              selectedAttempt.routeSpec,
            selectedRouteScore:
              selectedAttempt.score,
            candidateDiagnostics: {
              ...selectedAttempt
                .diagnostics,
              valid: true,
              status:
                sweepClearSelectionFound
                  ? "global-sweep-clear-route"
                  : endpointClearSelectionFound
                    ? "global-endpoint-clear-route"
                    : "endpoint-clear-partial-route",
              selectedRouteId:
                selectedAttempt
                  .routeSpec.id,
              selectedRouteLabel:
                bridgeRouteDisplayLabel(
                  selectedAttempt
                    .routeSpec
                ),
              selectedRouteScore:
                selectedAttempt.score,
              transitionClearance:
                selectedAttempt
                  .routeSpec
                  .transitionClearance,
              transitionPinch:
                selectedAttempt
                  .routeSpec
                  .transitionPinch,
              sweepValid:
                selectedAttempt
                  .sweepDiagnostics.valid,
              sweepStatus:
                selectedAttempt
                  .sweepDiagnostics.status,
              routeCandidateCount:
                candidateSet
                  .attempts.length,
              validRouteCount:
                candidateSet
                  .endpointValidAttempts
                  .length,
              routeAttempts,
            },
          };
        }

        const fallbackAttempt =
          candidateSet.attempts[0];

        return {
          model:
            fallbackAttempt.model,
          selectedRouteSpec: null,
          selectedRouteScore: null,
          candidateDiagnostics: {
            valid: false,
            status:
              "no-valid-route",
            routeCandidateCount:
              candidateSet.attempts.length,
            validRouteCount:
              candidateSet
                .endpointValidAttempts
                .length,
            routeAttempts,
          },
        };
      }
    );

  setBridgeSweepRouteCache(
    cacheKey,
    selections
  );

  return selections;
}

function bridgeRouteSelectionCacheKey({
  constructionOrder,
  facePairMappingTurns,
  bridgeIndex,
  earlierBridgeModels,
}) {
  return bridgeAuditCacheKey({
    constructionOrder,
    facePairMappingTurns,
    bridgeIndex,
    routeId: "route-selection",
    obstacleRouteIds:
      earlierBridgeModels.map(
        (bridgeModel) =>
          bridgeModel.route?.id ??
          bridgeModel.routeSpec?.id ??
          DEFAULT_BRIDGE_ROUTE_SPEC.id
      ),
  });
}

function setBridgeRouteSelectionCache(
  cacheKey,
  value
) {
  if (
    BRIDGE_ROUTE_SELECTION_CACHE.size >=
    BRIDGE_ROUTE_SELECTION_CACHE_LIMIT
  ) {
    const oldestKey =
      BRIDGE_ROUTE_SELECTION_CACHE
        .keys()
        .next()
        .value;

    BRIDGE_ROUTE_SELECTION_CACHE.delete(
      oldestKey
    );
  }

  BRIDGE_ROUTE_SELECTION_CACHE.set(
    cacheKey,
    value
  );
}

function bridgeRouteAttemptSummary(
  attempt
) {
  return {
    routeId:
      attempt.routeSpec.id,
    routeLabel:
      bridgeRouteDisplayLabel(
        attempt.routeSpec
      ),
    routeLane:
      attempt.routeSpec.lane,
    valid:
      attempt.diagnostics.valid,
    status:
      attempt.diagnostics.status,
    totalArcLength:
      attempt.model.totalArcLength,
    score:
      attempt.score,
  };
}

function selectBridgeRouteCandidate({
  buildCandidateModel,
  earlierBridgeModels,
  positions,
  constructionOrder,
  facePairMappingTurns,
  pairStrengths,
  bridgeIndex,
}) {
  const selectionCacheKey =
    bridgeRouteSelectionCacheKey({
      constructionOrder,
      facePairMappingTurns,
      bridgeIndex,
      earlierBridgeModels,
    });

  if (selectionCacheKey === null) {
    const routeSpec =
      DEFAULT_BRIDGE_ROUTE_SPEC;

    const model =
      buildCandidateModel(
        routeSpec
      );

    const diagnostics =
      analyzeBridgeCandidateCached({
        candidateModel: model,
        earlierBridgeModels,
        positions,
        constructionOrder,
        facePairMappingTurns,
        pairStrengths,
      });

    return {
      model,
      selectedRouteSpec: null,
      selectedRouteScore: null,
      candidateDiagnostics: {
        ...diagnostics,
        routeCandidateCount: 0,
        validRouteCount: 0,
        routeAttempts: [],
      },
    };
  }

  const cachedSelection =
    BRIDGE_ROUTE_SELECTION_CACHE.get(
      selectionCacheKey
    );

  if (cachedSelection) {
    const selectedRouteSpec =
      cachedSelection.selectedRouteId ===
      null
        ? null
        : bridgeRouteSpecForId(
            cachedSelection
              .selectedRouteId
          );

    const displayedRouteSpec =
      selectedRouteSpec ??
      DEFAULT_BRIDGE_ROUTE_SPEC;

    return {
      model:
        buildCandidateModel(
          displayedRouteSpec
        ),
      selectedRouteSpec,
      selectedRouteScore:
        cachedSelection
          .selectedRouteScore,
      candidateDiagnostics:
        cachedSelection
          .candidateDiagnostics,
    };
  }

  const attempts =
    bridgeRouteCandidateSpecs().map(
      (routeSpec, routeIndex) => {
        const model =
          buildCandidateModel(
            routeSpec
          );

        const diagnostics =
          analyzeBridgeCandidateCached({
            candidateModel: model,
            earlierBridgeModels,
            positions,
            constructionOrder,
            facePairMappingTurns,
            pairStrengths,
          });

        return {
          routeSpec,
          routeIndex,
          model,
          diagnostics,
          score:
            bridgeRouteCandidateScore(
              model,
              routeSpec
            ),
        };
      }
    );

  const validAttempts =
    attempts
      .filter(
        (attempt) =>
          attempt.diagnostics.valid
      )
      .sort(
        (first, second) =>
          first.score - second.score ||
          first.routeIndex -
            second.routeIndex
      );

  const selectedAttempt =
    validAttempts[0] ?? null;

  const routeAttempts =
    attempts.map(
      bridgeRouteAttemptSummary
    );

  const candidateDiagnostics =
    selectedAttempt === null
      ? {
          valid: false,
          status:
            "no-valid-route",
          routeCandidateCount:
            attempts.length,
          validRouteCount: 0,
          routeAttempts,
        }
      : {
          ...selectedAttempt
            .diagnostics,
          selectedRouteId:
            selectedAttempt
              .routeSpec.id,
          selectedRouteLabel:
            bridgeRouteDisplayLabel(
              selectedAttempt
                .routeSpec
            ),
          selectedRouteScore:
            selectedAttempt.score,
          routeCandidateCount:
            attempts.length,
          validRouteCount:
            validAttempts.length,
          routeAttempts,
        };

  setBridgeRouteSelectionCache(
    selectionCacheKey,
    {
      selectedRouteId:
        selectedAttempt?.routeSpec.id ??
        null,
      selectedRouteScore:
        selectedAttempt?.score ??
        null,
      candidateDiagnostics,
    }
  );

  return {
    model:
      selectedAttempt?.model ??
      attempts[0].model,
    selectedRouteSpec:
      selectedAttempt?.routeSpec ??
      null,
    selectedRouteScore:
      selectedAttempt?.score ??
      null,
    candidateDiagnostics,
  };
}

function bridgeAuditStatusLabel(
  status
) {
  const labels = {
    "self-intersection":
      "self-intersects",
    "tetrahedron-intersection":
      "crosses a tetrahedron",
    "earlier-bridge-intersection":
      "crosses another bridge",
    "identification-transition":
      "awaits the identification",
    "mapping-transition":
      "awaits the vertex map",
    "earlier-bridge-pending":
      "awaits another bridge",
    "no-valid-route":
      "has no collision-free candidate lane",
    "global-collision-free-route":
      "uses a collision-free lane",
    "collision-free-partial-route":
      "uses an available collision-free lane",
    "swept-self-intersection":
      "would self-intersect during motion",
    "swept-tetrahedron-intersection":
      "would cross a tetrahedron during motion",
    "swept-earlier-bridge-intersection":
      "would cross another bridge during motion",
    "global-sweep-clear-route":
      "uses a sweep-clear lane",
    "sweep-clear-partial-route":
      "uses an available sweep-clear lane",
    "global-endpoint-clear-route":
      "uses a collision-free destination lane",
    "endpoint-clear-partial-route":
      "uses an available destination lane",
    "no-sweep-clear-route":
      "has no sweep-clear candidate lane",
  };

  return (
    labels[status] ??
    "is embedded"
  );
}

function transformPoint(point, tetrahedron) {
  const scaled = {
    x: point.x * SCALE,
    y: point.y * SCALE,
    z: point.z * SCALE,
  };

  const cosX = Math.cos(tetrahedron.rotation.x);
  const sinX = Math.sin(tetrahedron.rotation.x);
  const cosY = Math.cos(tetrahedron.rotation.y);
  const sinY = Math.sin(tetrahedron.rotation.y);
  const cosZ = Math.cos(tetrahedron.rotation.z);
  const sinZ = Math.sin(tetrahedron.rotation.z);

  const y1 = scaled.y * cosX - scaled.z * sinX;
  const z1 = scaled.y * sinX + scaled.z * cosX;
  const x2 = scaled.x * cosY + z1 * sinY;
  const z2 = -scaled.x * sinY + z1 * cosY;

  return {
    x:
      x2 * cosZ - y1 * sinZ + tetrahedron.center.x,
    y:
      x2 * sinZ + y1 * cosZ + tetrahedron.center.y,
    z: z2 + tetrahedron.center.z,
  };
}

const FACE_SOLVER_ITERATIONS = 72;
const FACE_SHAPE_STIFFNESS = 0.72;
const FACE_PARTIAL_SEAM_STIFFNESS = 0.98;
const FACE_SEAM_SUBITERATIONS = 8;
const FACE_TETHER_STIFFNESS = 0.0012;
const FACE_LOCK_THRESHOLD = 0.999;
const FACE_CONSTRAINT_EPSILON = 1e-6;
const FACE_COLLISION_CLEARANCE = 12;
const FACE_COLLISION_STIFFNESS = 0.72;
const FACE_COLLISION_SHAPE_STIFFNESS = 0.3;
const FACE_COLLISION_INTERVAL = 3;
const FACE_COLLISION_PASSES = 2;
const FACE_COLLISION_FINAL_PASSES = 8;
const FACE_COLLISION_BACKTRACK_STEPS = 9;
const FACE_PLANNER_TRANSIT_DISTANCE = 310;
const FACE_PLANNER_RESIDUAL_DISTANCE = 58;
const FACE_PLANNER_GUIDE_STIFFNESS = 0.18;
const FACE_PLANNER_TRIAL_ITERATIONS = 18;
const FACE_PLANNER_PATH_STEPS = 8;
const FACE_PLANNER_SWEEP_SAMPLES = 5;
const FACE_PLANNER_HYSTERESIS_PENALTY = 18;
const FACE_PLANNER_SEAM_WEIGHT = 7;
const FACE_PLANNER_SHAPE_WEIGHT = 160;
const FACE_PLANNER_NEAR_WEIGHT = 18;
const FACE_PLANNER_BARRIER_WEIGHT = 4;
const FACE_PLANNER_CLEARANCE_WEIGHT = 5;
const FACE_VALIDITY_FULL_STRENGTH = 0.995;
const FACE_VALIDITY_SEAM_TOLERANCE = 0.75;
const FACE_VALIDITY_EDGE_TOLERANCE = 0.55;
const FACE_VALIDITY_COLLAPSE_RATIO = 0.08;
const FACE_VALIDITY_EXPANSION_RATIO = 6;
const FACE_VALIDITY_RESIDUAL_TOLERANCE = 0.12;
const QUOTIENT_CUT_OPEN_STRENGTH = 0.72;
const QUOTIENT_CUT_OPEN_BACKTRACK_FACTORS = [
  1,
  2 / 3,
  1 / 3,
  0,
];
const QUOTIENT_FACE_GAP_PX = 52;
const QUOTIENT_FACE_LANE_PX = 18;

const DEVELOPER_DIAGNOSTICS_RIGHT_X = 546;
const DEVELOPER_DIAGNOSTICS_BOTTOM_Y = 542;

function clonePoint(point) {
  return {
    x: point.x,
    y: point.y,
    z: point.z,
  };
}

function cloneWorldPositions(
  positions
) {
  return {
    A: positions.A.map(
      clonePoint
    ),
    B: positions.B.map(
      clonePoint
    ),
  };
}

function maximumPositionDisplacement(
  first,
  second
) {
  let maximum = 0;

  ["A", "B"].forEach(
    (tetrahedronId) => {
      first[
        tetrahedronId
      ].forEach(
        (point, index) => {
          maximum = Math.max(
            maximum,
            pointDistance(
              point,
              second[
                tetrahedronId
              ][index]
            )
          );
        }
      );
    }
  );

  return maximum;
}

function allWorldPoints(
  positions
) {
  return [
    ...positions.A,
    ...positions.B,
  ];
}

function averageWorldPoint(
  points
) {
  if (points.length === 0) {
    return {
      x: 0,
      y: 0,
      z: 0,
    };
  }

  return points.reduce(
    (sum, point) => ({
      x:
        sum.x +
        point.x /
          points.length,
      y:
        sum.y +
        point.y /
          points.length,
      z:
        sum.z +
        point.z /
          points.length,
    }),
    {
      x: 0,
      y: 0,
      z: 0,
    }
  );
}

function createShapeConstraints(
  mesh,
  restPositions
) {
  const constraints =
    new Map();

  mesh.triangles.forEach(
    (triangle) => {
      const [
        first,
        second,
        third,
      ] = triangle.vertexIndices;

      [
        [first, second],
        [second, third],
        [third, first],
      ].forEach(
        ([
          firstIndex,
          secondIndex,
        ]) => {
          const key = meshEdgeKey(
            firstIndex,
            secondIndex
          );

          if (
            constraints.has(key)
          ) {
            return;
          }

          constraints.set(key, {
            firstIndex,
            secondIndex,
            restLength:
              pointDistance(
                restPositions[
                  firstIndex
                ],
                restPositions[
                  secondIndex
                ]
              ),
          });
        }
      );
    }
  );

  return [
    ...constraints.values(),
  ];
}

const INITIAL_WORLD_VERTEX_POSITIONS =
  DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY
    .initialWorldPositions;

const FACE_SHAPE_CONSTRAINTS =
  DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY
    .faceShapeConstraints;

function satisfyDistanceConstraint(
  points,
  constraint,
  stiffness
) {
  const first =
    points[
      constraint.firstIndex
    ];

  const second =
    points[
      constraint.secondIndex
    ];

  const delta = {
    x: second.x - first.x,
    y: second.y - first.y,
    z: second.z - first.z,
  };

  const length = Math.hypot(
    delta.x,
    delta.y,
    delta.z
  );

  if (
    length <
    FACE_CONSTRAINT_EPSILON
  ) {
    return;
  }

  const scale =
    0.5 *
    stiffness *
    (
      length -
      constraint.restLength
    ) /
    length;

  first.x += delta.x * scale;
  first.y += delta.y * scale;
  first.z += delta.z * scale;

  second.x -= delta.x * scale;
  second.y -= delta.y * scale;
  second.z -= delta.z * scale;
}

function satisfyPartialSeam(
  positions,
  vertexPair,
  strength
) {
  const pointA =
    positions.A[
      vertexPair.vertexAIndex
    ];

  const pointB =
    positions.B[
      vertexPair.vertexBIndex
    ];

  const correction =
    0.5 *
    FACE_PARTIAL_SEAM_STIFFNESS *
    strength;

  const delta = {
    x: pointB.x - pointA.x,
    y: pointB.y - pointA.y,
    z: pointB.z - pointA.z,
  };

  pointA.x +=
    delta.x * correction;

  pointA.y +=
    delta.y * correction;

  pointA.z +=
    delta.z * correction;

  pointB.x -=
    delta.x * correction;

  pointB.y -=
    delta.y * correction;

  pointB.z -=
    delta.z * correction;
}

function createLockedSeamGroups(
  pairStrengths,
  constraintOrder,
  facePairMappingTurns = []
) {
  const countA =
    TRUNCATED_TETRAHEDRON_MESHES
      .A.vertices.length;

  const countB =
    TRUNCATED_TETRAHEDRON_MESHES
      .B.vertices.length;

  const parent =
    Array.from(
      {
        length:
          countA + countB,
      },
      (_, index) => index
    );

  function find(index) {
    let current = index;

    while (
      parent[current] !==
      current
    ) {
      parent[current] =
        parent[
          parent[current]
        ];

      current =
        parent[current];
    }

    return current;
  }

  function union(
    first,
    second
  ) {
    const firstRoot =
      find(first);

    const secondRoot =
      find(second);

    if (
      firstRoot !==
      secondRoot
    ) {
      parent[secondRoot] =
        firstRoot;
    }
  }

  constraintOrder.forEach(
    (pairId) => {
      if (
        pairStrengths[
          pairId
        ] <
        FACE_LOCK_THRESHOLD
      ) {
        return;
      }

      const mappingIndex =
        settledCyclicMappingIndex(
          facePairMappingTurns[
            pairId
          ] ?? 0
        );

      /*
       * While a vertex map is rotating continuously,
       * no discrete vertex pairing is valid. Restore the
       * seam lock only when the animation reaches one of
       * the three exact cyclic correspondences.
       */
      if (mappingIndex === null) {
        return;
      }

      const correspondence =
        facePairVertexCorrespondence(
          pairId,
          mappingIndex
        );

      correspondence.vertexPairs.forEach(
        (vertexPair) => {
          union(
            vertexPair.vertexAIndex,
            countA +
              vertexPair.vertexBIndex
          );
        }
      );
    }
  );

  const groups = new Map();

  parent.forEach((_, index) => {
    const root = find(index);

    if (!groups.has(root)) {
      groups.set(root, []);
    }

    groups.get(root).push(
      index
    );
  });

  return [
    ...groups.values(),
  ].filter(
    (group) =>
      group.length > 1
  );
}

function pointFromGlobalIndex(
  positions,
  globalIndex
) {
  const countA =
    positions.A.length;

  return globalIndex < countA
    ? positions.A[
        globalIndex
      ]
    : positions.B[
        globalIndex -
          countA
      ];
}

function projectLockedSeams(
  positions,
  lockedGroups
) {
  lockedGroups.forEach(
    (group) => {
      const points =
        group.map(
          (globalIndex) =>
            pointFromGlobalIndex(
              positions,
              globalIndex
            )
        );

      const center =
        averageWorldPoint(points);

      points.forEach(
        (point) => {
          point.x = center.x;
          point.y = center.y;
          point.z = center.z;
        }
      );
    }
  );
}

function tetherToSeed(
  positions,
  seed
) {
  ["A", "B"].forEach(
    (tetrahedronId) => {
      positions[
        tetrahedronId
      ].forEach(
        (point, index) => {
          const target =
            seed[
              tetrahedronId
            ][index];

          point.x +=
            (
              target.x -
              point.x
            ) *
            FACE_TETHER_STIFFNESS;

          point.y +=
            (
              target.y -
              point.y
            ) *
            FACE_TETHER_STIFFNESS;

          point.z +=
            (
              target.z -
              point.z
            ) *
            FACE_TETHER_STIFFNESS;
        }
      );
    }
  );
}

function recenterWorldPositions(
  positions,
  targetCenter
) {
  const currentCenter =
    averageWorldPoint(
      allWorldPoints(
        positions
      )
    );

  const offset = {
    x:
      targetCenter.x -
      currentCenter.x,
    y:
      targetCenter.y -
      currentCenter.y,
    z:
      targetCenter.z -
      currentCenter.z,
  };

  allWorldPoints(
    positions
  ).forEach((point) => {
    point.x += offset.x;
    point.y += offset.y;
    point.z += offset.z;
  });
}

function applyWeightedDisplacement(
  positions,
  tetrahedronId,
  vertexIndices,
  weights,
  displacement
) {
  const weightSquareSum =
    weights.reduce(
      (sum, weight) =>
        sum +
        weight * weight,
      0
    );

  if (
    weightSquareSum <
    FACE_CONSTRAINT_EPSILON
  ) {
    return;
  }

  vertexIndices.forEach(
    (vertexIndex, index) => {
      const factor =
        weights[index] /
        weightSquareSum;

      const point =
        positions[
          tetrahedronId
        ][vertexIndex];

      point.x +=
        displacement.x *
        factor;

      point.y +=
        displacement.y *
        factor;

      point.z +=
        displacement.z *
        factor;
    }
  );
}

function applyCollisionBarrierContacts(
  positions,
  contacts
) {
  contacts
    .slice()
    .sort(
      (first, second) =>
        Number(second.penetrating) -
        Number(first.penetrating)
    )
    .forEach((contact) => {
      const deficit =
        contact.penetrating
          ? FACE_COLLISION_CLEARANCE
          : Math.max(
              0,
              FACE_COLLISION_CLEARANCE -
                contact.distance
            );

      if (
        deficit <=
        FACE_CONSTRAINT_EPSILON
      ) {
        return;
      }

      const halfCorrection =
        0.5 *
        FACE_COLLISION_STIFFNESS *
        deficit;

      const firstDisplacement = {
        x:
          -contact.direction.x *
          halfCorrection,
        y:
          -contact.direction.y *
          halfCorrection,
        z:
          -contact.direction.z *
          halfCorrection,
      };

      const secondDisplacement = {
        x:
          contact.direction.x *
          halfCorrection,
        y:
          contact.direction.y *
          halfCorrection,
        z:
          contact.direction.z *
          halfCorrection,
      };

      applyWeightedDisplacement(
        positions,
        contact.firstTetrahedronId,
        contact.firstVertexIndices,
        contact.firstWeights,
        firstDisplacement
      );

      applyWeightedDisplacement(
        positions,
        contact.secondTetrahedronId,
        contact.secondVertexIndices,
        contact.secondWeights,
        secondDisplacement
      );
    });
}

function projectActiveFaceConstraints(
  positions,
  activeOrder,
  pairStrengths,
  lockedGroups,
  facePairMappingTurns = []
) {
  projectLockedSeams(
    positions,
    lockedGroups
  );

  activeOrder.forEach(
    (pairId, orderIndex) => {
      const strength =
        pairStrengths[
          pairId
        ];

      /*
       * The first pair follows the established rigid
       * placement path. At full strength it becomes a
       * locked seam. Later pairs use deformable seam
       * attraction against that persistent state.
       */
      if (
        orderIndex === 0 ||
        strength >=
          FACE_LOCK_THRESHOLD
      ) {
        return;
      }

      const mappingIndex =
        settledCyclicMappingIndex(
          facePairMappingTurns[
            pairId
          ] ?? 0
        );

      if (mappingIndex === null) {
        return;
      }

      const effectiveStrength =
        strength * strength;

      facePairVertexCorrespondence(
        pairId,
        mappingIndex
      ).vertexPairs.forEach(
        (vertexPair) =>
          satisfyPartialSeam(
            positions,
            vertexPair,
            effectiveStrength
          )
      );
    }
  );

  projectLockedSeams(
    positions,
    lockedGroups
  );
}

function projectShapeConstraints(
  positions,
  stiffness =
    FACE_SHAPE_STIFFNESS,
  faceShapeConstraints =
    FACE_SHAPE_CONSTRAINTS
) {
  ["A", "B"].forEach(
    (tetrahedronId) => {
      faceShapeConstraints[
        tetrahedronId
      ].forEach(
        (constraint) =>
          satisfyDistanceConstraint(
            positions[
              tetrahedronId
            ],
            constraint,
            stiffness
          )
      );
    }
  );
}

function currentActivePairId(
  pairStrengths,
  constraintOrder
) {
  const activeOrder =
    constraintOrder.filter(
      (pairId) =>
        pairStrengths[
          pairId
        ] >
        FACE_CONSTRAINT_EPSILON
    );

  return activeOrder.length > 0
    ? activeOrder[
        activeOrder.length - 1
      ]
    : null;
}

function collisionDiagnosticsFor(
  positions,
  pairStrengths,
  lockedGroups,
  activePairId,
  meshes =
    TRUNCATED_TETRAHEDRON_MESHES
) {
  return analyzeSurfaceContacts({
    positions,
    meshes,
    pairStrengths,
    lockedGroups,
    activePairId,
    clearance:
      FACE_COLLISION_CLEARANCE,
    activationEpsilon:
      FACE_CONSTRAINT_EPSILON,
  });
}

function collisionBarrierContactsFor(
  positions,
  pairStrengths,
  lockedGroups,
  meshes =
    TRUNCATED_TETRAHEDRON_MESHES
) {
  return collectSurfaceBarrierContacts({
    positions,
    meshes,
    pairStrengths,
    lockedGroups,
    clearance:
      FACE_COLLISION_CLEARANCE,
    activationEpsilon:
      FACE_CONSTRAINT_EPSILON,
  });
}

function faceCentroid(
  positions,
  tetrahedronId,
  pairId
) {
  const face =
    TRUNCATED_TETRAHEDRON_MESHES[
      tetrahedronId
    ].largeFaces[
      pairId
    ];

  return averageWorldPoint(
    face.vertexIndices.map(
      (vertexIndex) =>
        positions[
          tetrahedronId
        ][vertexIndex]
    )
  );
}

function plannerGuideAmounts(
  strength
) {
  const amount =
    Math.max(
      0,
      Math.min(1, strength)
    );

  /*
   * The transit guide is zero at both endpoints and
   * reaches its maximum halfway through the approach.
   * It therefore moves the active face around the
   * obstruction and returns it exactly to its target.
   *
   * The smaller residual guide remains on the body
   * after closure, allowing the surrounding surface to
   * stay routed around the obstruction while the seam
   * vertices coincide.
   */
  return {
    transit:
      FACE_PLANNER_TRANSIT_DISTANCE *
      Math.sin(
        Math.PI * amount
      ),
    residual:
      FACE_PLANNER_RESIDUAL_DISTANCE *
      amount *
      (
        1 -
        0.35 * amount
      ),
  };
}

function applyPlannerGuide(
  positions,
  seed,
  guide,
  lockedGroups
) {
  if (
    guide === null ||
    (
      guide.transitAmount <=
        FACE_CONSTRAINT_EPSILON &&
      guide.residualAmount <=
        FACE_CONSTRAINT_EPSILON
    )
  ) {
    return;
  }

  const faceA =
    TRUNCATED_TETRAHEDRON_MESHES
      .A.largeFaces[
        guide.pairId
      ];

  const faceB =
    TRUNCATED_TETRAHEDRON_MESHES
      .B.largeFaces[
        guide.pairId
      ];

  const faceAVertices =
    new Set(
      faceA.vertexIndices
    );

  const faceBVertices =
    new Set(
      faceB.vertexIndices
    );

  positions.A.forEach(
    (point, vertexIndex) => {
      const activeFaceVertex =
        faceAVertices.has(
          vertexIndex
        );

      const offset =
        (
          activeFaceVertex
            ? guide.transitAmount *
                0.03
            : guide.residualAmount *
                0.18
        );

      const target = {
        x:
          seed.A[
            vertexIndex
          ].x -
          guide.direction.x *
            offset,
        y:
          seed.A[
            vertexIndex
          ].y -
          guide.direction.y *
            offset,
        z:
          seed.A[
            vertexIndex
          ].z -
          guide.direction.z *
            offset,
      };

      point.x +=
        (
          target.x -
          point.x
        ) *
        FACE_PLANNER_GUIDE_STIFFNESS;

      point.y +=
        (
          target.y -
          point.y
        ) *
        FACE_PLANNER_GUIDE_STIFFNESS;

      point.z +=
        (
          target.z -
          point.z
        ) *
        FACE_PLANNER_GUIDE_STIFFNESS;
    }
  );

  positions.B.forEach(
    (point, vertexIndex) => {
      const activeFaceVertex =
        faceBVertices.has(
          vertexIndex
        );

      const offset =
        activeFaceVertex
          ? guide.transitAmount
          : guide.transitAmount +
            guide.residualAmount;

      const target = {
        x:
          seed.B[
            vertexIndex
          ].x +
          guide.direction.x *
            offset,
        y:
          seed.B[
            vertexIndex
          ].y +
          guide.direction.y *
            offset,
        z:
          seed.B[
            vertexIndex
          ].z +
          guide.direction.z *
            offset,
      };

      point.x +=
        (
          target.x -
          point.x
        ) *
        FACE_PLANNER_GUIDE_STIFFNESS;

      point.y +=
        (
          target.y -
          point.y
        ) *
        FACE_PLANNER_GUIDE_STIFFNESS;

      point.z +=
        (
          target.z -
          point.z
        ) *
        FACE_PLANNER_GUIDE_STIFFNESS;
    }
  );

  /*
   * Any vertex already participating in an earlier
   * completed seam is immediately returned to its
   * transitive locked class.
   */
  projectLockedSeams(
    positions,
    lockedGroups
  );
}

function tangentGuideBasis(
  positions,
  pairId,
  contacts
) {
  const centerA =
    faceCentroid(
      positions,
      "A",
      pairId
    );

  const centerB =
    faceCentroid(
      positions,
      "B",
      pairId
    );

  const approach =
    normalizePoint(
      subtractPoint(
        centerA,
        centerB
      )
    );

  const accumulatedObstacle =
    contacts.reduce(
      (sum, contact) => {
        const influence =
          contact.penetrating
            ? FACE_COLLISION_CLEARANCE
            : Math.max(
                0,
                FACE_COLLISION_CLEARANCE -
                  contact.distance
              );

        return addPoint(
          sum,
          multiplyPoint(
            contact.direction,
            influence
          )
        );
      },
      {
        x: 0,
        y: 0,
        z: 0,
      }
    );

  let firstTangent =
    subtractPoint(
      accumulatedObstacle,
      multiplyPoint(
        approach,
        dotPoint(
          accumulatedObstacle,
          approach
        )
      )
    );

  if (
    Math.hypot(
      firstTangent.x,
      firstTangent.y,
      firstTangent.z
    ) <
    FACE_CONSTRAINT_EPSILON
  ) {
    const fallbackAxis =
      Math.abs(approach.x) <
        0.72
        ? {
            x: 1,
            y: 0,
            z: 0,
          }
        : {
            x: 0,
            y: 1,
            z: 0,
          };

    firstTangent =
      crossPoint(
        approach,
        fallbackAxis
      );
  }

  firstTangent =
    normalizePoint(
      firstTangent
    );

  const secondTangent =
    normalizePoint(
      crossPoint(
        approach,
        firstTangent
      )
    );

  return {
    approach,
    firstTangent,
    secondTangent,
  };
}

function plannerGuideCandidates(
  positions,
  pairId,
  contacts,
  preferredGuideIndex
) {
  const {
    firstTangent,
    secondTangent,
  } = tangentGuideBasis(
    positions,
    pairId,
    contacts
  );

  const diagonalOne =
    normalizePoint(
      addPoint(
        firstTangent,
        secondTangent
      )
    );

  const diagonalTwo =
    normalizePoint(
      subtractPoint(
        firstTangent,
        secondTangent
      )
    );

  const directions = [
    firstTangent,
    multiplyPoint(
      firstTangent,
      -1
    ),
    secondTangent,
    multiplyPoint(
      secondTangent,
      -1
    ),
    diagonalOne,
    multiplyPoint(
      diagonalOne,
      -1
    ),
    diagonalTwo,
    multiplyPoint(
      diagonalTwo,
      -1
    ),
  ];

  const candidates =
    directions.map(
      (direction, index) => ({
        index,
        pairId,
        direction,
      })
    );

  if (
    preferredGuideIndex === null ||
    preferredGuideIndex === undefined
  ) {
    return candidates;
  }

  return candidates.sort(
    (first, second) => {
      if (
        first.index ===
        preferredGuideIndex
      ) {
        return -1;
      }

      if (
        second.index ===
        preferredGuideIndex
      ) {
        return 1;
      }

      return (
        first.index -
        second.index
      );
    }
  );
}

function faceSeamError(
  positions,
  pairId,
  mappingTurn = 0
) {
  const correspondence =
    facePairVertexCorrespondence(
      pairId,
      settledCyclicMappingIndex(
        mappingTurn
      ) ??
        normalizeCyclicMappingIndex(
          mappingTurn
        )
    );

  return correspondence.vertexPairs.reduce(
    (sum, vertexPair) =>
      sum +
      pointDistance(
        positions.A[
          vertexPair.vertexAIndex
        ],
        positions.B[
          vertexPair.vertexBIndex
        ]
      ),
    0
  ) /
  correspondence.vertexPairs.length;
}

function shapeDistortion(
  positions,
  faceShapeConstraints =
    FACE_SHAPE_CONSTRAINTS
) {
  let total = 0;
  let count = 0;

  ["A", "B"].forEach(
    (tetrahedronId) => {
      faceShapeConstraints[
        tetrahedronId
      ].forEach(
        (constraint) => {
          const currentLength =
            pointDistance(
              positions[
                tetrahedronId
              ][
                constraint.firstIndex
              ],
              positions[
                tetrahedronId
              ][
                constraint.secondIndex
              ]
            );

          total +=
            Math.abs(
              currentLength -
              constraint.restLength
            ) /
            Math.max(
              constraint.restLength,
              FACE_CONSTRAINT_EPSILON
            );

          count += 1;
        }
      );
    }
  );

  return count > 0
    ? total / count
    : 0;
}


function rootMeanSquare(
  values
) {
  if (values.length === 0) {
    return 0;
  }

  return Math.sqrt(
    values.reduce(
      (sum, value) =>
        sum +
        value * value,
      0
    ) /
    values.length
  );
}

function analyzeFaceSolutionValidity({
  positions,
  pairStrengths,
  constraintOrder,
  acceptedPairStrengths,
  collisionDiagnostics,
  blockedPairId,
  requestedStrength,
  acceptedStrength,
  plannerActive,
  plannerCandidateCount,
  plannerValidCandidateCount,
  plannerBestScore,
  blockedPlannerCandidateCount,
  blockedPlannerValidCandidateCount,
  blockedPlannerBestScore,
  solverResidual,
  initialSolverResidual,
  sweptPenetratingPairCount,
  facePairMappingTurns = [],
  geometry =
    DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY,
}) {
  function diagnosticCorrespondence(
    pairId
  ) {
    const mappingTurn =
      facePairMappingTurns[
        pairId
      ] ?? 0;

    return facePairVertexCorrespondence(
      pairId,
      settledCyclicMappingIndex(
        mappingTurn
      ) ??
        normalizeCyclicMappingIndex(
          mappingTurn
        )
    );
  }

  const pairMetrics =
    constraintOrder
      .filter(
        (pairId) =>
          pairStrengths[
            pairId
          ] >
          FACE_CONSTRAINT_EPSILON
      )
      .map((pairId) => {
        const errors =
          diagnosticCorrespondence(
            pairId
          ).vertexPairs.map(
            (vertexPair) =>
              pointDistance(
                positions.A[
                  vertexPair
                    .vertexAIndex
                ],
                positions.B[
                  vertexPair
                    .vertexBIndex
                ]
              )
          );

        return {
          pairId,
          requestedStrength:
            pairStrengths[
              pairId
            ],
          acceptedStrength:
            acceptedPairStrengths[
              pairId
            ] ?? 0,
          maximumError:
            Math.max(
              0,
              ...errors
            ),
          rmsError:
            rootMeanSquare(
              errors
            ),
        };
      });

  const allSeamErrors =
    pairMetrics.flatMap(
      (metric) =>
        diagnosticCorrespondence(
          metric.pairId
        ).vertexPairs.map(
          (vertexPair) =>
            pointDistance(
              positions.A[
                vertexPair
                  .vertexAIndex
              ],
              positions.B[
                vertexPair
                  .vertexBIndex
              ]
            )
        )
    );

  const edgeDistortions = [];

  ["A", "B"].forEach(
    (tetrahedronId) => {
      geometry.meshes[
        tetrahedronId
      ].edges.forEach(
        (edge) => {
          const [
            firstIndex,
            secondIndex,
          ] = edge.vertexIndices;

          const restLength =
            pointDistance(
              geometry.initialWorldPositions[
                tetrahedronId
              ][firstIndex],
              geometry.initialWorldPositions[
                tetrahedronId
              ][secondIndex]
            );

          const currentLength =
            pointDistance(
              positions[
                tetrahedronId
              ][firstIndex],
              positions[
                tetrahedronId
              ][secondIndex]
            );

          edgeDistortions.push(
            Math.abs(
              currentLength -
              restLength
            ) /
            Math.max(
              restLength,
              FACE_CONSTRAINT_EPSILON
            )
          );
        }
      );
    }
  );

  const triangleAreaRatios = [];
  let collapsedTriangleCount = 0;
  let invertedTriangleCount = 0;

  ["A", "B"].forEach(
    (tetrahedronId) => {
      const initialCenter =
        averageWorldPoint(
          geometry.initialWorldPositions[
            tetrahedronId
          ]
        );

      const currentCenter =
        averageWorldPoint(
          positions[
            tetrahedronId
          ]
        );

      geometry.meshes[
        tetrahedronId
      ].triangles.forEach(
        (triangle) => {
          const initialTriangle =
            triangle.vertexIndices.map(
              (vertexIndex) =>
                geometry.initialWorldPositions[
                  tetrahedronId
                ][vertexIndex]
            );

          const currentTriangle =
            triangle.vertexIndices.map(
              (vertexIndex) =>
                positions[
                  tetrahedronId
                ][vertexIndex]
            );

          const initialArea =
            triangleArea(
              initialTriangle[0],
              initialTriangle[1],
              initialTriangle[2]
            );

          const currentArea =
            triangleArea(
              currentTriangle[0],
              currentTriangle[1],
              currentTriangle[2]
            );

          const areaRatio =
            currentArea /
            Math.max(
              initialArea,
              FACE_CONSTRAINT_EPSILON
            );

          triangleAreaRatios.push(
            areaRatio
          );

          if (
            areaRatio <
            FACE_VALIDITY_COLLAPSE_RATIO
          ) {
            collapsedTriangleCount += 1;
          }

          const initialNormal =
            crossPoint(
              subtractPoint(
                initialTriangle[1],
                initialTriangle[0]
              ),
              subtractPoint(
                initialTriangle[2],
                initialTriangle[0]
              )
            );

          const currentNormal =
            crossPoint(
              subtractPoint(
                currentTriangle[1],
                currentTriangle[0]
              ),
              subtractPoint(
                currentTriangle[2],
                currentTriangle[0]
              )
            );

          const initialFacing =
            dotPoint(
              initialNormal,
              subtractPoint(
                averageWorldPoint(
                  initialTriangle
                ),
                initialCenter
              )
            );

          const currentFacing =
            dotPoint(
              currentNormal,
              subtractPoint(
                averageWorldPoint(
                  currentTriangle
                ),
                currentCenter
              )
            );

          if (
            Math.abs(
              initialFacing
            ) >
              FACE_CONSTRAINT_EPSILON &&
            Math.abs(
              currentFacing
            ) >
              FACE_CONSTRAINT_EPSILON &&
            initialFacing *
              currentFacing <
              0
          ) {
            invertedTriangleCount += 1;
          }
        }
      );
    }
  );

  const maximumSeamError =
    Math.max(
      0,
      ...allSeamErrors
    );

  const maximumEdgeDistortion =
    Math.max(
      0,
      ...edgeDistortions
    );

  const minimumTriangleAreaRatio =
    triangleAreaRatios.length > 0
      ? Math.min(
          ...triangleAreaRatios
        )
      : 1;

  const maximumTriangleAreaRatio =
    triangleAreaRatios.length > 0
      ? Math.max(
          ...triangleAreaRatios
        )
      : 1;

  const allRequestedFull =
    pairMetrics.every(
      (metric) =>
        metric.requestedStrength >=
        FACE_VALIDITY_FULL_STRENGTH
    );

  const allAccepted =
    pairMetrics.every(
      (metric) =>
        metric.acceptedStrength >=
        metric.requestedStrength -
          0.005
    );

  const seamsExact =
    pairMetrics
      .filter(
        (metric) =>
          metric.requestedStrength >=
          FACE_VALIDITY_FULL_STRENGTH
      )
      .every(
        (metric) =>
          metric.maximumError <=
          FACE_VALIDITY_SEAM_TOLERANCE
      );

  const collisionValid =
    collisionDiagnostics
      .penetratingPairs.length ===
      0 &&
    sweptPenetratingPairCount ===
      0;

  const shapeValid =
    maximumEdgeDistortion <=
      FACE_VALIDITY_EDGE_TOLERANCE &&
    minimumTriangleAreaRatio >=
      FACE_VALIDITY_COLLAPSE_RATIO &&
    maximumTriangleAreaRatio <=
      FACE_VALIDITY_EXPANSION_RATIO &&
    collapsedTriangleCount === 0 &&
    invertedTriangleCount === 0;

  const resolvedResidual =
    Number.isFinite(
      solverResidual
    )
      ? solverResidual
      : 0;

  const resolvedInitialResidual =
    Number.isFinite(
      initialSolverResidual
    )
      ? initialSolverResidual
      : 0;

  const residualImprovement =
    resolvedInitialResidual >
      FACE_CONSTRAINT_EPSILON
      ? resolvedInitialResidual /
        Math.max(
          resolvedResidual,
          FACE_CONSTRAINT_EPSILON
        )
      : 1;

  const numericallyConverged =
    resolvedResidual <=
    FACE_VALIDITY_RESIDUAL_TOLERANCE;

  const fullBlockedRequest =
    blockedPairId !== null &&
    (
      requestedStrength ??
      0
    ) >=
      FACE_VALIDITY_FULL_STRENGTH &&
    (
      acceptedStrength ??
      0
    ) <
      (
        requestedStrength ??
        0
      ) -
        0.005;

  const plannerExhausted =
    fullBlockedRequest &&
    blockedPlannerCandidateCount >= 8 &&
    blockedPlannerValidCandidateCount === 0;

  const plannerImproving =
    plannerValidCandidateCount > 0 &&
    Number.isFinite(
      plannerBestScore
    );

  const blockedPlannerImproving =
    blockedPlannerValidCandidateCount >
      0 &&
    Number.isFinite(
      blockedPlannerBestScore
    );

  const stagnating =
    !numericallyConverged &&
    residualImprovement < 1.05;

  let status = "routed";

  if (pairMetrics.length === 0) {
    status = "complete";
  } else if (!allRequestedFull) {
    status = "routed";
  } else if (
    plannerExhausted &&
    (
      stagnating ||
      fullBlockedRequest
    )
  ) {
    /*
     * Operational classification only: the current
     * literal embedded mesh and planner cannot realize
     * the requested quotient identification. This does
     * not prove that every possible representation fails.
     */
    status = "quotient-only";
  } else if (
    blockedPairId !== null
  ) {
    status = "blocked";
  } else if (
    allAccepted &&
    collisionValid &&
    seamsExact &&
    shapeValid
  ) {
    status = "complete";
  } else if (
    allRequestedFull &&
    (
      !collisionValid ||
      !seamsExact ||
      !shapeValid
    )
  ) {
    status = "quotient-only";
  } else if (plannerActive) {
    status = "routed";
  } else {
    status = "blocked";
  }

  return {
    status,
    pairMetrics,
    maximumSeamError,
    rmsSeamError:
      rootMeanSquare(
        allSeamErrors
      ),
    maximumEdgeDistortion,
    rmsEdgeDistortion:
      rootMeanSquare(
        edgeDistortions
      ),
    minimumTriangleAreaRatio,
    maximumTriangleAreaRatio,
    collapsedTriangleCount,
    invertedTriangleCount,
    minimumClearance:
      collisionDiagnostics
        .minimumClearance,
    solverResidual:
      resolvedResidual,
    initialSolverResidual:
      resolvedInitialResidual,
    residualImprovement,
    numericallyConverged,
    stagnating,
    plannerExhausted,
    plannerImproving,
    plannerCandidateCount,
    plannerValidCandidateCount,
    plannerBestScore,
    blockedPlannerCandidateCount,
    blockedPlannerValidCandidateCount,
    blockedPlannerBestScore,
    blockedPlannerImproving,
    allRequestedFull,
    allAccepted,
    seamsExact,
    collisionValid,
    shapeValid,
  };
}

function solveFacePairPositionsAttempt(
  pairStrengths,
  constraintOrder,
  plannerGuide = null,
  iterationCount =
    FACE_SOLVER_ITERATIONS,
  facePairMappingTurns = [],
  geometry =
    DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY
) {
  const positions =
    cloneWorldPositions(
      geometry.initialWorldPositions
    );

  const activeOrder =
    constraintOrder.filter(
      (pairId) =>
        pairStrengths[
          pairId
        ] >
        FACE_CONSTRAINT_EPSILON
    );

  const activePairId =
    activeOrder.length > 0
      ? activeOrder[
          activeOrder.length - 1
        ]
      : null;

  if (
    activeOrder.length === 0
  ) {
    const lockedGroups = [];

    return {
      positions,
      lockedGroups,
      diagnostics:
        collisionDiagnosticsFor(
          positions,
          pairStrengths,
          lockedGroups,
          activePairId,
          geometry.meshes
        ),
      barrierContactCount: 0,
      barrierCorrectionCount: 0,
      plannerGuideIndex: null,
      plannerPairId: null,
      plannerGuideAmount: 0,
      solverResidual: 0,
      initialSolverResidual: 0,
      residualImprovement: 1,
    };
  }

  /*
   * Preserve the exact rigid approach already used for
   * the first selected face. Later constraints deform
   * this shared state.
   */
  const firstPairId =
    activeOrder[0];

  const firstStrength =
    pairStrengths[
      firstPairId
    ];

  const firstPlacement =
    makeStagedFacePlacementTransform(
      FIGURE_EIGHT_FACE_PAIRS[
        firstPairId
      ],
      firstStrength,
      facePairMappingTurns[
        firstPairId
      ] ?? 0,
      geometry.initialWorldPositions,
      geometry.tetrahedra ??
        TETRAHEDRA
    );

  positions.B =
    geometry.initialWorldPositions
      .B.map(firstPlacement);

  const seed =
    cloneWorldPositions(
      positions
    );

  const targetCenter =
    averageWorldPoint(
      allWorldPoints(seed)
    );

  const lockedGroups =
    createLockedSeamGroups(
      pairStrengths,
      activeOrder,
      facePairMappingTurns
    );

  /*
   * The first identification follows the prescribed
   * rigid rotation-orbit-approach path exactly. The
   * deformable collision solver and route planner begin
   * only when a second face constraint is introduced.
   */
  if (activeOrder.length === 1) {
    return {
      positions,
      lockedGroups,
      diagnostics:
        collisionDiagnosticsFor(
          positions,
          pairStrengths,
          lockedGroups,
          activePairId,
          geometry.meshes
        ),
      barrierContactCount: 0,
      barrierCorrectionCount: 0,
      plannerGuideIndex: null,
      plannerPairId: null,
      plannerGuideAmount: 0,
      solverResidual: 0,
      initialSolverResidual: 0,
      residualImprovement: 1,
    };
  }

  const resolvedGuide =
    plannerGuide === null
      ? null
      : {
          ...plannerGuide,
          ...(() => {
            const amounts =
              plannerGuideAmounts(
                pairStrengths[
                  plannerGuide.pairId
                ]
              );

            return {
              transitAmount:
                amounts.transit,
              residualAmount:
                amounts.residual,
            };
          })(),
        };

  let barrierCorrectionCount = 0;
  let initialSolverResidual = null;
  let solverResidual = 0;

  for (
    let iteration = 0;
    iteration <
      iterationCount;
    iteration += 1
  ) {
    const iterationStart =
      cloneWorldPositions(
        positions
      );

    tetherToSeed(
      positions,
      seed
    );

    applyPlannerGuide(
      positions,
      seed,
      resolvedGuide,
      lockedGroups
    );

    projectShapeConstraints(
      positions,
      FACE_SHAPE_STIFFNESS,
      geometry.faceShapeConstraints
    );

    for (
      let seamIteration = 0;
      seamIteration <
        FACE_SEAM_SUBITERATIONS;
      seamIteration += 1
    ) {
      projectActiveFaceConstraints(
        positions,
        activeOrder,
        pairStrengths,
        lockedGroups,
        facePairMappingTurns
      );
    }

    if (
      iteration %
        FACE_COLLISION_INTERVAL ===
        FACE_COLLISION_INTERVAL - 1 ||
      iteration ===
        iterationCount - 1
    ) {
      for (
        let pass = 0;
        pass <
          FACE_COLLISION_PASSES;
        pass += 1
      ) {
        const contacts =
          collisionBarrierContactsFor(
            positions,
            pairStrengths,
            lockedGroups,
            geometry.meshes
          );

        if (
          contacts.length === 0
        ) {
          break;
        }

        barrierCorrectionCount +=
          contacts.length;

        applyCollisionBarrierContacts(
          positions,
          contacts
        );

        applyPlannerGuide(
          positions,
          seed,
          resolvedGuide,
          lockedGroups
        );

        projectShapeConstraints(
          positions,
          FACE_COLLISION_SHAPE_STIFFNESS,
          geometry.faceShapeConstraints
        );

        projectActiveFaceConstraints(
          positions,
          activeOrder,
          pairStrengths,
          lockedGroups,
          facePairMappingTurns
        );
      }
    }

    projectActiveFaceConstraints(
      positions,
      activeOrder,
      pairStrengths,
      lockedGroups,
      facePairMappingTurns
    );

    recenterWorldPositions(
      positions,
      targetCenter
    );

    solverResidual =
      maximumPositionDisplacement(
        iterationStart,
        positions
      );

    if (
      initialSolverResidual ===
      null
    ) {
      initialSolverResidual =
        solverResidual;
    }
  }

  for (
    let pass = 0;
    pass <
      FACE_COLLISION_FINAL_PASSES;
    pass += 1
  ) {
    const passStart =
      cloneWorldPositions(
        positions
      );

    const contacts =
      collisionBarrierContactsFor(
        positions,
        pairStrengths,
        lockedGroups,
        geometry.meshes
      );

    if (
      contacts.length === 0
    ) {
      break;
    }

    barrierCorrectionCount +=
      contacts.length;

    applyCollisionBarrierContacts(
      positions,
      contacts
    );

    applyPlannerGuide(
      positions,
      seed,
      resolvedGuide,
      lockedGroups
    );

    projectShapeConstraints(
      positions,
      FACE_COLLISION_SHAPE_STIFFNESS,
      geometry.faceShapeConstraints
    );

    projectActiveFaceConstraints(
      positions,
      activeOrder,
      pairStrengths,
      lockedGroups,
      facePairMappingTurns
    );

    recenterWorldPositions(
      positions,
      targetCenter
    );

    solverResidual =
      maximumPositionDisplacement(
        passStart,
        positions
      );

    if (
      initialSolverResidual ===
      null
    ) {
      initialSolverResidual =
        solverResidual;
    }
  }

  const finalProjectionStart =
    cloneWorldPositions(
      positions
    );

  projectActiveFaceConstraints(
    positions,
    activeOrder,
    pairStrengths,
    lockedGroups,
    facePairMappingTurns
  );

  solverResidual =
    Math.max(
      solverResidual,
      maximumPositionDisplacement(
        finalProjectionStart,
        positions
      )
    );

  if (
    initialSolverResidual === null
  ) {
    initialSolverResidual =
      solverResidual;
  }

  const remainingContacts =
    collisionBarrierContactsFor(
      positions,
      pairStrengths,
      lockedGroups,
      geometry.meshes
    );

  return {
    positions,
    lockedGroups,
    diagnostics:
      collisionDiagnosticsFor(
        positions,
        pairStrengths,
        lockedGroups,
        activePairId,
        geometry.meshes
      ),
    barrierContactCount:
      remainingContacts.length,
    barrierCorrectionCount,
    plannerGuideIndex:
      resolvedGuide?.index ??
      null,
    plannerPairId:
      resolvedGuide?.pairId ??
      null,
    plannerGuideAmount:
      (
        resolvedGuide?.transitAmount ??
        0
      ) +
      (
        resolvedGuide?.residualAmount ??
        0
      ),
    solverResidual,
    initialSolverResidual:
      initialSolverResidual ??
      solverResidual,
    residualImprovement:
      (
        initialSolverResidual ??
        solverResidual
      ) >
        FACE_CONSTRAINT_EPSILON
        ? (
            initialSolverResidual ??
            solverResidual
          ) /
          Math.max(
            solverResidual,
            FACE_CONSTRAINT_EPSILON
          )
        : 1,
  };
}

function sweptDiagnosticsFor(
  fromPositions,
  toPositions,
  pairStrengths,
  lockedGroups,
  activePairId,
  geometry =
    DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY
) {
  return analyzeSweptSurfaceContacts({
    fromPositions,
    toPositions,
    meshes: geometry.meshes,
    pairStrengths,
    lockedGroups,
    activePairId,
    clearance:
      FACE_COLLISION_CLEARANCE,
    activationEpsilon:
      FACE_CONSTRAINT_EPSILON,
    samples:
      FACE_PLANNER_SWEEP_SAMPLES,
  });
}

function plannerCandidateScore(
  attempt,
  swept,
  pairId,
  preferredGuideIndex,
  facePairMappingTurns = [],
  geometry =
    DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY
) {
  const staticPenetrations =
    attempt.diagnostics
      .penetratingPairs.length;

  const sweptPenetrations =
    swept.penetratingPairs.length;

  if (
    staticPenetrations > 0 ||
    sweptPenetrations > 0
  ) {
    return Infinity;
  }

  const clearance =
    Math.min(
      attempt.diagnostics
        .minimumClearance ??
        FACE_COLLISION_CLEARANCE *
          2,
      swept.minimumClearance ??
        FACE_COLLISION_CLEARANCE *
          2
    );

  const preferencePenalty =
    preferredGuideIndex === null ||
    preferredGuideIndex ===
      attempt.plannerGuideIndex
      ? 0
      : FACE_PLANNER_HYSTERESIS_PENALTY;

  return (
    faceSeamError(
      attempt.positions,
      pairId,
      facePairMappingTurns[
        pairId
      ] ?? 0
    ) *
      FACE_PLANNER_SEAM_WEIGHT +
    shapeDistortion(
      attempt.positions,
      geometry.faceShapeConstraints
    ) *
      FACE_PLANNER_SHAPE_WEIGHT +
    attempt.diagnostics
      .nearContactPairs.length *
      FACE_PLANNER_NEAR_WEIGHT +
    attempt.barrierContactCount *
      FACE_PLANNER_BARRIER_WEIGHT -
    clearance *
      FACE_PLANNER_CLEARANCE_WEIGHT +
    preferencePenalty
  );
}

function findDirectionalPlannerAttempt({
  fromAttempt,
  requestedAttempt,
  requestedStrengths,
  constraintOrder,
  pairId,
  preferredGuideIndex,
  facePairMappingTurns = [],
  geometry =
    DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY,
}) {
  const contacts =
    collisionBarrierContactsFor(
      requestedAttempt.positions,
      requestedStrengths,
      requestedAttempt.lockedGroups,
      geometry.meshes
    );

  const candidates =
    plannerGuideCandidates(
      requestedAttempt.positions,
      pairId,
      contacts,
      preferredGuideIndex
    );

  const requestedStrength =
    requestedStrengths[
      pairId
    ];

  let bestCandidate = null;
  let validCandidateCount = 0;

  for (
    const candidate of candidates
  ) {
    let previousAttempt =
      fromAttempt;

    let finalAttempt = null;
    let pathValid = true;
    let pathMinimumClearance =
      Infinity;
    let pathNearContactCount = 0;

    for (
      let step = 1;
      step <=
        FACE_PLANNER_PATH_STEPS;
      step += 1
    ) {
      const stageStrengths = [
        ...requestedStrengths,
      ];

      stageStrengths[
        pairId
      ] =
        requestedStrength *
        (
          step /
          FACE_PLANNER_PATH_STEPS
        );

      const stageAttempt =
        solveFacePairPositionsAttempt(
          stageStrengths,
          constraintOrder,
          candidate,
          FACE_PLANNER_TRIAL_ITERATIONS,
          facePairMappingTurns,
          geometry
        );

      const stageSweep =
        sweptDiagnosticsFor(
          previousAttempt.positions,
          stageAttempt.positions,
          stageStrengths,
          stageAttempt.lockedGroups,
          pairId,
          geometry
        );

      if (
        stageAttempt.diagnostics
          .penetratingPairs.length >
          0 ||
        stageSweep.penetratingPairs
          .length > 0
      ) {
        pathValid = false;
        break;
      }

      const stageClearance =
        Math.min(
          stageAttempt.diagnostics
            .minimumClearance ??
            FACE_COLLISION_CLEARANCE *
              2,
          stageSweep
            .minimumClearance ??
            FACE_COLLISION_CLEARANCE *
              2
        );

      pathMinimumClearance =
        Math.min(
          pathMinimumClearance,
          stageClearance
        );

      pathNearContactCount +=
        stageAttempt.diagnostics
          .nearContactPairs.length +
        stageSweep
          .nearContactPairs.length;

      previousAttempt =
        stageAttempt;

      finalAttempt =
        stageAttempt;
    }

    if (
      !pathValid ||
      finalAttempt === null
    ) {
      continue;
    }

    const aggregateSweep = {
      minimumClearance:
        Number.isFinite(
          pathMinimumClearance
        )
          ? pathMinimumClearance
          : null,
      nearContactPairs:
        Array.from(
          {
            length:
              pathNearContactCount,
          }
        ),
      penetratingPairs: [],
    };

    const score =
      plannerCandidateScore(
        finalAttempt,
        aggregateSweep,
        pairId,
        preferredGuideIndex,
        facePairMappingTurns,
        geometry
      );

    if (
      !Number.isFinite(score)
    ) {
      continue;
    }

    validCandidateCount += 1;

    if (
      bestCandidate === null ||
      score <
        bestCandidate.score
    ) {
      bestCandidate = {
        candidate,
        score,
        previousAttempt,
      };
    }

    /*
     * Hysteresis: retain the previously successful side
     * when it still gives a fully embedded staged path.
     * This prevents frame-to-frame route chatter.
     */
    if (
      preferredGuideIndex !== null &&
      candidate.index ===
        preferredGuideIndex
    ) {
      break;
    }
  }

  if (
    bestCandidate === null
  ) {
    return {
      attempt: null,
      candidateCount:
        candidates.length,
      validCandidateCount,
      bestScore: null,
    };
  }

  const resolved =
    solveFacePairPositionsAttempt(
      requestedStrengths,
      constraintOrder,
      bestCandidate.candidate,
      FACE_SOLVER_ITERATIONS,
      facePairMappingTurns,
      geometry
    );

  const finalSweep =
    sweptDiagnosticsFor(
      bestCandidate
        .previousAttempt
        .positions,
      resolved.positions,
      requestedStrengths,
      resolved.lockedGroups,
      pairId,
      geometry
    );

  const valid =
    resolved.diagnostics
      .penetratingPairs.length ===
      0 &&
    finalSweep.penetratingPairs
      .length === 0;

  return {
    attempt:
      valid
        ? {
            ...resolved,
            sweptDiagnostics:
              finalSweep,
          }
        : null,
    candidateCount:
      candidates.length,
    validCandidateCount,
    bestScore:
      valid
        ? bestCandidate.score
        : null,
  };
}

function solveFacePairPositions(
  pairStrengths,
  constraintOrder,
  preferredGuideIndex = null,
  facePairMappingTurns = [],
  geometry =
    DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY
) {
  const acceptedStrengths =
    FIGURE_EIGHT_FACE_PAIRS.map(
      () => 0
    );

  const activeOrder =
    constraintOrder.filter(
      (pairId) =>
        pairStrengths[
          pairId
        ] >
        FACE_CONSTRAINT_EPSILON
    );

  /*
   * Preserve the first pair's explicit rigid path.
   * The generic swept test interpolates mesh vertices
   * linearly between endpoints, which does not represent
   * an orbiting rigid body and can falsely activate the
   * planner or quotient fallback.
   */
  if (activeOrder.length === 1) {
    const pairId =
      activeOrder[0];

    const requestedStrength =
      pairStrengths[
        pairId
      ];

    const direct =
      solveFacePairPositionsAttempt(
        pairStrengths,
        constraintOrder,
        null,
        FACE_SOLVER_ITERATIONS,
        facePairMappingTurns,
        geometry
      );

    acceptedStrengths[
      pairId
    ] =
      requestedStrength;

    return {
      ...direct,
      blockedPairId: null,
      requestedStrength: null,
      acceptedStrength: null,
      acceptedPairStrengths: [
        ...acceptedStrengths,
      ],
      plannerActive: false,
      plannerCandidateCount: 0,
      plannerValidCandidateCount: 0,
      plannerBestScore: null,
      blockedPlannerCandidateCount: 0,
      blockedPlannerValidCandidateCount: 0,
      blockedPlannerBestScore: null,
      sweptPenetratingPairs: 0,
    };
  }

  let best =
    solveFacePairPositionsAttempt(
      acceptedStrengths,
      constraintOrder,
      null,
      FACE_SOLVER_ITERATIONS,
      facePairMappingTurns,
      geometry
    );

  let plannerCandidateCount = 0;
  let plannerValidCandidateCount = 0;
  let plannerBestScore = null;

  for (
    let orderIndex = 0;
    orderIndex <
      constraintOrder.length;
    orderIndex += 1
  ) {
    const pairId =
      constraintOrder[
        orderIndex
      ];

    const requestedStrength =
      pairStrengths[
        pairId
      ];

    if (
      requestedStrength <=
      FACE_CONSTRAINT_EPSILON
    ) {
      continue;
    }

    const requestedStrengths = [
      ...acceptedStrengths,
    ];

    requestedStrengths[
      pairId
    ] =
      requestedStrength;

    const requested =
      solveFacePairPositionsAttempt(
        requestedStrengths,
        constraintOrder,
        null,
        FACE_SOLVER_ITERATIONS,
        facePairMappingTurns,
        geometry
      );

    /*
     * The first selected pair is the rigid foundation
     * for every later constraint. Accept its prescribed
     * path directly, including when additional pairs are
     * already requested in the same solve.
     */
    if (orderIndex === 0) {
      acceptedStrengths[
        pairId
      ] =
        requestedStrength;

      best = {
        ...requested,
        sweptDiagnostics: {
          minimumClearance:
            requested.diagnostics
              .minimumClearance,
          minimumClearanceSample:
            null,
          nearContactPairs: [],
          penetratingPairs: [],
          sampleCount: 0,
        },
      };

      continue;
    }

    const directSweep =
      sweptDiagnosticsFor(
        best.positions,
        requested.positions,
        requestedStrengths,
        requested.lockedGroups,
        pairId,
        geometry
      );

    const directValid =
      requested.diagnostics
        .penetratingPairs.length ===
        0 &&
      directSweep.penetratingPairs
        .length === 0;

    if (directValid) {
      acceptedStrengths[
        pairId
      ] =
        requestedStrength;

      best = {
        ...requested,
        sweptDiagnostics:
          directSweep,
      };

      continue;
    }

    const planned =
      findDirectionalPlannerAttempt({
        fromAttempt: best,
        requestedAttempt:
          requested,
        requestedStrengths,
        constraintOrder,
        pairId,
        facePairMappingTurns,
        preferredGuideIndex:
          preferredGuideIndex?.pairId ===
            pairId
            ? preferredGuideIndex.index
            : null,
        geometry,
      });

    plannerCandidateCount +=
      planned.candidateCount;

    plannerValidCandidateCount +=
      planned.validCandidateCount;

    if (
      planned.bestScore !== null
    ) {
      plannerBestScore =
        plannerBestScore === null
          ? planned.bestScore
          : Math.min(
              plannerBestScore,
              planned.bestScore
            );
    }

    if (
      planned.attempt !== null
    ) {
      acceptedStrengths[
        pairId
      ] =
        requestedStrength;

      best =
        planned.attempt;

      continue;
    }

    /*
     * Every deterministic tangent route failed. Keep
     * all earlier seams, then binary-search the final
     * direct embedded strength for this step.
     */
    let lowerStrength = 0;
    let upperStrength =
      requestedStrength;

    for (
      let step = 0;
      step <
        FACE_COLLISION_BACKTRACK_STEPS;
      step += 1
    ) {
      const candidateStrength =
        (
          lowerStrength +
          upperStrength
        ) /
        2;

      const candidateStrengths = [
        ...acceptedStrengths,
      ];

      candidateStrengths[
        pairId
      ] =
        candidateStrength;

      const candidate =
        solveFacePairPositionsAttempt(
          candidateStrengths,
          constraintOrder,
          null,
          FACE_SOLVER_ITERATIONS,
          facePairMappingTurns,
          geometry
        );

      const candidateSweep =
        sweptDiagnosticsFor(
          best.positions,
          candidate.positions,
          candidateStrengths,
          candidate.lockedGroups,
          pairId,
          geometry
        );

      if (
        candidate.diagnostics
          .penetratingPairs.length ===
          0 &&
        candidateSweep
          .penetratingPairs.length ===
          0
      ) {
        lowerStrength =
          candidateStrength;

        best = {
          ...candidate,
          sweptDiagnostics:
            candidateSweep,
        };
      } else {
        upperStrength =
          candidateStrength;
      }
    }

    acceptedStrengths[
      pairId
    ] =
      lowerStrength;

    return {
      ...best,
      blockedPairId:
        pairId,
      requestedStrength,
      acceptedStrength:
        lowerStrength,
      acceptedPairStrengths: [
        ...acceptedStrengths,
      ],
      plannerActive: false,
      plannerCandidateCount,
      plannerValidCandidateCount,
      plannerBestScore,
      blockedPlannerCandidateCount:
        planned.candidateCount,
      blockedPlannerValidCandidateCount:
        planned.validCandidateCount,
      blockedPlannerBestScore:
        planned.bestScore,
      sweptPenetratingPairs:
        best.sweptDiagnostics
          ?.penetratingPairs.length ??
        0,
    };
  }

  return {
    ...best,
    blockedPairId: null,
    requestedStrength: null,
    acceptedStrength: null,
    acceptedPairStrengths: [
      ...acceptedStrengths,
    ],
    plannerActive:
      best.plannerGuideIndex !==
      null,
    plannerCandidateCount,
    plannerValidCandidateCount,
    plannerBestScore,
    blockedPlannerCandidateCount: 0,
    blockedPlannerValidCandidateCount: 0,
    blockedPlannerBestScore: null,
    sweptPenetratingPairs:
      best.sweptDiagnostics
        ?.penetratingPairs.length ??
      0,
  };
}

const FACE_ORDER_AUDIT_VERSION = 1;
const FACE_ORDER_AUDIT_DEFAULT_DELAY_MS = 40;

let faceOrderAuditPromise = null;
let faceOrderAuditCancelled = false;

function facePairOrders(values) {
  if (values.length <= 1) {
    return [[...values]];
  }

  return values.flatMap(
    (value, index) =>
      facePairOrders([
        ...values.slice(0, index),
        ...values.slice(index + 1),
      ]).map((tail) => [
        value,
        ...tail,
      ])
  );
}

function auditCollisionDiagnostics(
  faceSolution
) {
  return {
    ...faceSolution.diagnostics,
    blockedPairId:
      faceSolution.blockedPairId,
    requestedStrength:
      faceSolution.requestedStrength,
    acceptedStrength:
      faceSolution.acceptedStrength,
    plannerGuideIndex:
      faceSolution.plannerGuideIndex,
    plannerPairId:
      faceSolution.plannerPairId,
    plannerActive:
      faceSolution.plannerActive,
    plannerCandidateCount:
      faceSolution.plannerCandidateCount,
    plannerValidCandidateCount:
      faceSolution.plannerValidCandidateCount,
    plannerBestScore:
      faceSolution.plannerBestScore,
    blockedPlannerCandidateCount:
      faceSolution
        .blockedPlannerCandidateCount,
    blockedPlannerValidCandidateCount:
      faceSolution
        .blockedPlannerValidCandidateCount,
    blockedPlannerBestScore:
      faceSolution.blockedPlannerBestScore,
    sweptPenetratingPairs:
      faceSolution.sweptPenetratingPairs,
  };
}

function auditValidityDiagnostics({
  faceSolution,
  pairStrengths,
  constraintOrder,
  geometry =
    DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY,
}) {
  const collisionDiagnostics =
    auditCollisionDiagnostics(
      faceSolution
    );

  const validityDiagnostics =
    analyzeFaceSolutionValidity({
      positions:
        faceSolution.positions,
      pairStrengths,
      constraintOrder,
      acceptedPairStrengths:
        faceSolution
          .acceptedPairStrengths,
      collisionDiagnostics,
      blockedPairId:
        faceSolution.blockedPairId,
      requestedStrength:
        faceSolution.requestedStrength,
      acceptedStrength:
        faceSolution.acceptedStrength,
      plannerActive:
        faceSolution.plannerActive,
      plannerCandidateCount:
        faceSolution
          .plannerCandidateCount,
      plannerValidCandidateCount:
        faceSolution
          .plannerValidCandidateCount,
      plannerBestScore:
        faceSolution.plannerBestScore,
      blockedPlannerCandidateCount:
        faceSolution
          .blockedPlannerCandidateCount,
      blockedPlannerValidCandidateCount:
        faceSolution
          .blockedPlannerValidCandidateCount,
      blockedPlannerBestScore:
        faceSolution
          .blockedPlannerBestScore,
      solverResidual:
        faceSolution.solverResidual,
      initialSolverResidual:
        faceSolution
          .initialSolverResidual,
      sweptPenetratingPairCount:
        faceSolution
          .sweptPenetratingPairs,
      geometry,
    });

  return {
    collisionDiagnostics,
    validityDiagnostics,
  };
}

function quotientCutOpenDisplayIsValid({
  faceSolution,
  validityDiagnostics,
}) {
  return (
    validityDiagnostics
      .collisionValid &&
    validityDiagnostics
      .collapsedTriangleCount === 0 &&
    validityDiagnostics
      .invertedTriangleCount === 0 &&
    validityDiagnostics
      .maximumEdgeDistortion <=
      FACE_VALIDITY_EDGE_TOLERANCE &&
    validityDiagnostics
      .minimumTriangleAreaRatio >=
      FACE_VALIDITY_COLLAPSE_RATIO &&
    validityDiagnostics
      .maximumTriangleAreaRatio <=
      FACE_VALIDITY_EXPANSION_RATIO &&
    (
      faceSolution
        .sweptPenetratingPairs ?? 0
    ) === 0
  );
}

function findValidQuotientCutOpenState({
  faceSolution,
  pairStrengths,
  constraintOrder,
  firstOpenIndex,
  preferredGuideIndex = null,
  geometry =
    DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY,
}) {
  const firstOpenPairId =
    constraintOrder[
      firstOpenIndex
    ];

  let lastState = null;

  for (
    const factor of
      QUOTIENT_CUT_OPEN_BACKTRACK_FACTORS
  ) {
    const cutOpenStrength =
      Math.min(
        pairStrengths[
          firstOpenPairId
        ],
        QUOTIENT_CUT_OPEN_STRENGTH *
          factor
      );

    const candidateStrengths =
      FIGURE_EIGHT_FACE_PAIRS.map(
        (_, pairId) =>
          faceSolution
            .acceptedPairStrengths[
              pairId
            ] ?? 0
      );

    constraintOrder.forEach(
      (pairId, orderIndex) => {
        if (
          orderIndex <
          firstOpenIndex
        ) {
          candidateStrengths[
            pairId
          ] = pairStrengths[
            pairId
          ];

          return;
        }

        candidateStrengths[
          pairId
        ] =
          orderIndex ===
          firstOpenIndex
            ? cutOpenStrength
            : 0;
      }
    );

    const candidateFaceSolution =
      solveFacePairPositions(
        candidateStrengths,
        constraintOrder,
        preferredGuideIndex,
        [],
        geometry
      );

    const candidateDiagnostics =
      auditValidityDiagnostics({
        faceSolution:
          candidateFaceSolution,
        pairStrengths:
          candidateStrengths,
        constraintOrder,
        geometry,
      });

    const state = {
      faceSolution:
        candidateFaceSolution,
      pairStrengths:
        candidateStrengths,
      collisionDiagnostics:
        candidateDiagnostics
          .collisionDiagnostics,
      validityDiagnostics:
        candidateDiagnostics
          .validityDiagnostics,
      cutOpenStrength,
      valid:
        quotientCutOpenDisplayIsValid({
          faceSolution:
            candidateFaceSolution,
          validityDiagnostics:
            candidateDiagnostics
              .validityDiagnostics,
        }),
    };

    lastState = state;

    if (state.valid) {
      return state;
    }
  }

  return {
    ...lastState,
    valid: false,
  };
}

function auditQuotientState({
  faceSolution,
  pairStrengths,
  constraintOrder,
  collisionDiagnostics,
  validityDiagnostics,
  geometry =
    DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY,
}) {
  const requestedMetrics =
    validityDiagnostics.pairMetrics.filter(
      (metric) =>
        metric.requestedStrength >=
        FACE_VALIDITY_FULL_STRENGTH
    );

  const quotientDisplayActive =
    validityDiagnostics.status ===
      "quotient-only" ||
    (
      validityDiagnostics.status ===
        "blocked" &&
      validityDiagnostics
        .allRequestedFull
    );

  const unresolvedPairIds = [];

  if (quotientDisplayActive) {
    requestedMetrics.forEach(
      (metric) => {
        if (
          metric.acceptedStrength <
            metric.requestedStrength -
              0.005 ||
          metric.maximumError >
            FACE_VALIDITY_SEAM_TOLERANCE
        ) {
          unresolvedPairIds.push(
            metric.pairId
          );
        }
      }
    );

    const blockedPairId =
      collisionDiagnostics.blockedPairId;

    if (
      blockedPairId !== null &&
      !unresolvedPairIds.includes(
        blockedPairId
      )
    ) {
      unresolvedPairIds.push(
        blockedPairId
      );
    }

    if (
      unresolvedPairIds.length === 0 &&
      requestedMetrics.length > 0
    ) {
      unresolvedPairIds.push(
        requestedMetrics[
          requestedMetrics.length - 1
        ].pairId
      );
    }
  }

  const quotientPairIds =
    constraintOrder.filter(
      (pairId) =>
        unresolvedPairIds.includes(
          pairId
        )
    );

  let displayFaceSolution =
    faceSolution;

  let displayPairStrengths =
    pairStrengths;

  let quotientCutOpenStrength = null;
  let quotientCutOpenValid = true;

  if (
    validityDiagnostics.status ===
      "quotient-only" &&
    quotientPairIds.length > 0
  ) {
    const firstOpenPairId =
      quotientPairIds[0];

    const firstOpenIndex =
      constraintOrder.indexOf(
        firstOpenPairId
      );

    const cutOpenState =
      findValidQuotientCutOpenState({
        faceSolution,
        pairStrengths,
        constraintOrder,
        firstOpenIndex,
        preferredGuideIndex: null,
        geometry,
      });

    displayFaceSolution =
      cutOpenState.faceSolution;

    displayPairStrengths =
      cutOpenState.pairStrengths;

    quotientCutOpenStrength =
      cutOpenState.cutOpenStrength;

    quotientCutOpenValid =
      cutOpenState.valid;
  }

  const displayDiagnostics =
    auditValidityDiagnostics({
      faceSolution:
        displayFaceSolution,
      pairStrengths:
        displayPairStrengths,
      constraintOrder,
      geometry,
    });

  return {
    requestedMetrics,
    quotientDisplayActive,
    quotientPairIds,
    quotientCutOpenStrength,
    quotientCutOpenValid,
    displayFaceSolution,
    displayCollisionDiagnostics:
      displayDiagnostics
        .collisionDiagnostics,
    displayValidityDiagnostics:
      displayDiagnostics
        .validityDiagnostics,
  };
}

function auditFinalFaceOrder(
  sequence
) {
  const pairStrengths =
    FIGURE_EIGHT_FACE_PAIRS.map(
      (pair) =>
        sequence.includes(pair.id)
          ? 1
          : 0
    );

  const faceSolution =
    solveFacePairPositions(
      pairStrengths,
      sequence,
      null
    );

  const {
    collisionDiagnostics,
    validityDiagnostics,
  } = auditValidityDiagnostics({
    faceSolution,
    pairStrengths,
    constraintOrder: sequence,
  });

  const quotientState =
    auditQuotientState({
      faceSolution,
      pairStrengths,
      constraintOrder: sequence,
      collisionDiagnostics,
      validityDiagnostics,
    });

  const quotientPairSet =
    new Set(
      quotientState.quotientPairIds
    );

  const physicalPairIds =
    quotientState.requestedMetrics
      .filter(
        (metric) =>
          !quotientPairSet.has(
            metric.pairId
          ) &&
          metric.acceptedStrength >=
            metric.requestedStrength -
              0.005 &&
          metric.maximumError <=
            FACE_VALIDITY_SEAM_TOLERANCE
      )
      .map(
        (metric) => metric.pairId
      );

  const representedPairIds =
    [...new Set([
      ...physicalPairIds,
      ...quotientState
        .quotientPairIds,
    ])];

  const missingPairIds =
    sequence.filter(
      (pairId) =>
        !representedPairIds.includes(
          pairId
        )
    );

  const activePairId =
    sequence[
      sequence.length - 1
    ];

  const stalePlannerRoute =
    faceSolution.plannerActive &&
    faceSolution.plannerPairId !==
      activePairId;

  const displayIntersections =
    quotientState
      .displayCollisionDiagnostics
      .penetratingPairs.length;

  const displaySweptIntersections =
    quotientState
      .displayFaceSolution
      .sweptPenetratingPairs ?? 0;

  const failures = [];

  if (missingPairIds.length > 0) {
    failures.push(
      `missing pairs ${missingPairIds.join(
        ","
      )}`
    );
  }

  if (
    representedPairIds.length !== 4
  ) {
    failures.push(
      "representation count is not four"
    );
  }

  if (displayIntersections > 0) {
    failures.push(
      "displayed forbidden intersection"
    );
  }

  if (
    displaySweptIntersections > 0
  ) {
    failures.push(
      "displayed swept intersection"
    );
  }

  if (
    !quotientState
      .quotientCutOpenValid
  ) {
    failures.push(
      "no valid cut-open display state"
    );
  }

  if (
    quotientState
      .displayValidityDiagnostics
      .collapsedTriangleCount > 0
  ) {
    failures.push(
      "displayed collapsed triangle"
    );
  }

  if (
    quotientState
      .displayValidityDiagnostics
      .invertedTriangleCount > 0
  ) {
    failures.push(
      "displayed inverted triangle"
    );
  }

  if (stalePlannerRoute) {
    failures.push(
      `stale planner route ${faceSolution.plannerPairId}`
    );
  }

  return {
    sequence: [...sequence],
    status:
      validityDiagnostics.status,
    physicalPairIds,
    quotientPairIds: [
      ...quotientState
        .quotientPairIds,
    ],
    physicalSeamCount:
      physicalPairIds.length,
    quotientLinkCount:
      quotientState
        .quotientPairIds.length,
    quotientCutOpenStrength:
      quotientState
        .quotientCutOpenStrength,
    quotientCutOpenValid:
      quotientState
        .quotientCutOpenValid,
    representedPairCount:
      representedPairIds.length,
    missingPairIds,
    displayIntersections,
    displaySweptIntersections,
    maximumSeamError:
      validityDiagnostics
        .maximumSeamError,
    maximumEdgeDistortion:
      validityDiagnostics
        .maximumEdgeDistortion,
    displayedMaximumEdgeDistortion:
      quotientState
        .displayValidityDiagnostics
        .maximumEdgeDistortion,
    displayedMinimumTriangleAreaRatio:
      quotientState
        .displayValidityDiagnostics
        .minimumTriangleAreaRatio,
    collapsedTriangleCount:
      quotientState
        .displayValidityDiagnostics
        .collapsedTriangleCount,
    invertedTriangleCount:
      quotientState
        .displayValidityDiagnostics
        .invertedTriangleCount,
    plannerPairId:
      faceSolution.plannerPairId,
    activePairId,
    stalePlannerRoute,
    failures,
    pass: failures.length === 0,
  };
}

function waitForFaceOrderAudit(
  delayMs
) {
  return new Promise((resolve) =>
    setTimeout(resolve, delayMs)
  );
}

export function cancelFigureEightFaceOrderAudit() {
  faceOrderAuditCancelled = true;
}

export async function runFigureEightFaceOrderAudit({
  startIndex = 0,
  count = 24,
  delayMs =
    FACE_ORDER_AUDIT_DEFAULT_DELAY_MS,
} = {}) {
  if (
    process.env.NODE_ENV !==
    "development"
  ) {
    throw new Error(
      "The figure-eight face-order audit is available only in development mode."
    );
  }

  if (faceOrderAuditPromise !== null) {
    return faceOrderAuditPromise;
  }

  faceOrderAuditCancelled = false;

  faceOrderAuditPromise =
    (async () => {
      const allOrders =
        facePairOrders(
          FIGURE_EIGHT_FACE_PAIRS.map(
            (pair) => pair.id
          )
        );

      const firstIndex = Math.max(
        0,
        Math.min(
          allOrders.length,
          Math.floor(startIndex)
        )
      );

      const lastIndex = Math.max(
        firstIndex,
        Math.min(
          allOrders.length,
          firstIndex +
            Math.max(
              0,
              Math.floor(count)
            )
        )
      );

      const selectedOrders =
        allOrders.slice(
          firstIndex,
          lastIndex
        );

      const results = [];

      console.info(
        `Figure-eight final-state audit started: orders ${firstIndex + 1}–${lastIndex} of ${allOrders.length}.`
      );

      for (
        let index = 0;
        index < selectedOrders.length;
        index += 1
      ) {
        if (faceOrderAuditCancelled) {
          break;
        }

        const sequence =
          selectedOrders[index];

        const startedAt =
          performance.now();

        const result =
          auditFinalFaceOrder(
            sequence
          );

        const durationMs =
          performance.now() -
          startedAt;

        results.push({
          ...result,
          orderIndex:
            firstIndex + index,
          durationMs,
        });

        console.info(
          `[${firstIndex + index + 1}/${allOrders.length}] ${sequence.join("→")} — ${result.pass ? "PASS" : "FAIL"} — ${(durationMs / 1000).toFixed(1)} s`
        );

        if (
          typeof window !==
          "undefined"
        ) {
          window.__figureEightFaceOrderAudit = {
            version:
              FACE_ORDER_AUDIT_VERSION,
            running: true,
            cancelled: false,
            startIndex:
              firstIndex,
            endIndex:
              lastIndex,
            completed:
              results.length,
            results: [
              ...results,
            ],
          };
        }

        await waitForFaceOrderAudit(
          Math.max(0, delayMs)
        );
      }

      const failures =
        results.filter(
          (result) =>
            !result.pass
        );

      const representedAllFourCount =
        results.filter(
          (result) =>
            result.representedPairCount ===
              4 &&
            result.missingPairIds
              .length === 0
        ).length;

      const intersectionCount =
        results.reduce(
          (sum, result) =>
            sum +
            result.displayIntersections +
            result
              .displaySweptIntersections,
          0
        );

      const physicalCompletionCount =
        results.filter(
          (result) =>
            result.physicalSeamCount ===
            4
        ).length;

      const quotientCompletionCount =
        results.filter(
          (result) =>
            result.quotientLinkCount >
            0
        ).length;

      const stalePlannerRouteCount =
        results.filter(
          (result) =>
            result.stalePlannerRoute
        ).length;

      const report = {
        version:
          FACE_ORDER_AUDIT_VERSION,
        generatedAt:
          new Date().toISOString(),
        running: false,
        cancelled:
          faceOrderAuditCancelled,
        startIndex:
          firstIndex,
        endIndex:
          lastIndex,
        requestedOrderCount:
          selectedOrders.length,
        completedOrderCount:
          results.length,
        representedAllFourCount,
        intersectionCount,
        physicalCompletionCount,
        quotientCompletionCount,
        stalePlannerRouteCount,
        failureCount:
          failures.length,
        results,
        failures,
        pass:
          !faceOrderAuditCancelled &&
          representedAllFourCount ===
            selectedOrders.length &&
          intersectionCount === 0 &&
          failures.length === 0,
      };

      console.group(
        "Figure-eight 24-order final-state audit"
      );

      console.info(
        `${
          representedAllFourCount ===
          results.length
            ? "PASS"
            : "FAIL"
        }: ${representedAllFourCount}/${results.length} completed orders represent all four pairs`
      );

      console.info(
        `${
          intersectionCount === 0
            ? "PASS"
            : "FAIL"
        }: ${intersectionCount} accepted displayed intersections`
      );

      console.info(
        `Physical completions: ${physicalCompletionCount}`
      );

      console.info(
        `Quotient completions: ${quotientCompletionCount}`
      );

      console.info(
        `Stale planner routes: ${stalePlannerRouteCount}`
      );

      console.info(
        `Failures: ${failures.length}`
      );

      if (faceOrderAuditCancelled) {
        console.warn(
          "Audit cancelled before all requested orders completed."
        );
      }

      console.table(
        results.map((result) => ({
          order:
            result.orderIndex + 1,
          sequence:
            result.sequence.join("→"),
          status: result.status,
          physical:
            result.physicalSeamCount,
          quotient:
            result.quotientLinkCount,
          cutOpen:
            result
              .quotientCutOpenStrength ===
              null
              ? "—"
              : `${Math.round(
                  result
                    .quotientCutOpenStrength *
                    100
                )}%`,
          represented:
            result.representedPairCount,
          intersections:
            result.displayIntersections +
            result
              .displaySweptIntersections,
          collapsed:
            result.collapsedTriangleCount,
          inverted:
            result.invertedTriangleCount,
          stalePlanner:
            result.stalePlannerRoute,
          seconds:
            (
              result.durationMs /
              1000
            ).toFixed(1),
          pass: result.pass,
        }))
      );

      if (failures.length > 0) {
        console.table(
          failures.map((result) => ({
            order:
              result.orderIndex + 1,
            sequence:
              result.sequence.join("→"),
            status: result.status,
            failures:
              result.failures.join("; "),
          }))
        );
      }

      console.groupEnd();

      if (
        typeof window !==
        "undefined"
      ) {
        window.__figureEightFaceOrderAudit =
          report;
      }

      return report;
    })();

  try {
    return await faceOrderAuditPromise;
  } finally {
    faceOrderAuditPromise = null;
  }
}

function projectPoint(point, view) {
  const rotated = applyRotation(
    point,
    view.rotation
  );

  const perspectiveDistance =
    view.perspectiveDistance ??
    DEFAULT_PERSPECTIVE_DISTANCE;

  const perspective =
    1 /
    (
      1 +
      rotated.z / perspectiveDistance
    );

  const scale =
    perspective * view.zoom;

  return {
    x: 500 + rotated.x * scale,
    y: 350 - rotated.y * scale,
    depth: rotated.z,
  };
}

function polygonPoints(points) {
  return points
    .map((point) => `${point.x},${point.y}`)
    .join(" ");
}

function lerpProjectedPoint(
  start,
  end,
  amount
) {
  return {
    x:
      start.x +
      (end.x - start.x) * amount,
    y:
      start.y +
      (end.y - start.y) * amount,
    depth:
      (start.depth || 0) +
      ((end.depth || 0) -
        (start.depth || 0)) *
        amount,
  };
}

function translateProjectedPoint(
  point,
  offset
) {
  return {
    ...point,
    x: point.x + offset.x,
    y: point.y + offset.y,
  };
}

function projectedBoundsCenter(points) {
  if (points.length === 0) {
    return { x: 500, y: 350 };
  }

  const bounds = points.reduce(
    (current, point) => ({
      minX: Math.min(
        current.minX,
        point.x
      ),
      maxX: Math.max(
        current.maxX,
        point.x
      ),
      minY: Math.min(
        current.minY,
        point.y
      ),
      maxY: Math.max(
        current.maxY,
        point.y
      ),
    }),
    {
      minX: Infinity,
      maxX: -Infinity,
      minY: Infinity,
      maxY: -Infinity,
    }
  );

  return {
    x:
      (bounds.minX +
        bounds.maxX) /
      2,
    y:
      (bounds.minY +
        bounds.maxY) /
      2,
  };
}

function rawCuspPoint(
  tetrahedronId,
  vertexIndex,
  neighborIndex
) {
  const key =
    `${tetrahedronId}${vertexIndex}`;

  return CUSP_FLAT_LAYOUT[key][
    neighborIndex
  ];
}

function cuspFlatPoint(point) {
  return {
    x:
      (point.x - 0.75) *
      CUSP_FLAT_UNIT,
    y:
      (point.y + CUSP_HEIGHT / 2) *
      CUSP_FLAT_UNIT,
    z: 0,
  };
}

function flatDomainPoint(point) {
  return projectPoint(
    cuspFlatPoint(point),
    {
      rotation: [
        1, 0, 0,
        0, 1, 0,
        0, 0, 1,
      ],
      zoom: 1,
    }
  );
}

function flatCuspPoint(
  tetrahedronId,
  vertexIndex,
  neighborIndex
) {
  return flatDomainPoint(
    rawCuspPoint(
      tetrahedronId,
      vertexIndex,
      neighborIndex
    )
  );
}

function clampUnit(value) {
  return Math.max(
    0,
    Math.min(1, value)
  );
}

function smoothStep(value) {
  const amount = clampUnit(value);

  return (
    amount *
    amount *
    (3 - 2 * amount)
  );
}

function blendTrianglePoint(
  points,
  weights
) {
  return {
    x:
      points[0].x * weights[0] +
      points[1].x * weights[1] +
      points[2].x * weights[2],
    y:
      points[0].y * weights[0] +
      points[1].y * weights[1] +
      points[2].y * weights[2],
    z:
      (points[0].z || 0) * weights[0] +
      (points[1].z || 0) * weights[1] +
      (points[2].z || 0) * weights[2],
  };
}

function triangularSubdivision(divisions) {
  const cells = [];

  function weights(row, column) {
    const second = row / divisions;
    const third = column / divisions;

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
      column < divisions - row;
      column += 1
    ) {
      const lowerLeft =
        weights(row, column);

      const lowerRight =
        weights(row + 1, column);

      const upperLeft =
        weights(row, column + 1);

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

const CUSP_MESH_CELLS =
  triangularSubdivision(
    CUSP_MESH_DIVISIONS
  );

function cuspDomainCoordinates(point) {
  const origin =
    CUSP_DOMAIN_CORNERS[0];

  const axisU = {
    x:
      CUSP_DOMAIN_CORNERS[1].x -
      origin.x,
    y:
      CUSP_DOMAIN_CORNERS[1].y -
      origin.y,
  };

  const axisV = {
    x:
      CUSP_DOMAIN_CORNERS[3].x -
      origin.x,
    y:
      CUSP_DOMAIN_CORNERS[3].y -
      origin.y,
  };

  const local = {
    x: point.x - origin.x,
    y: point.y - origin.y,
  };

  const determinant =
    axisU.x * axisV.y -
    axisU.y * axisV.x;

  return {
    u:
      (
        local.x * axisV.y -
        local.y * axisV.x
      ) / determinant,
    v:
      (
        axisU.x * local.y -
        axisU.y * local.x
      ) / determinant,
  };
}

function cuspFlatFrame(firstBoundary) {
  const origin = cuspFlatPoint(
    CUSP_DOMAIN_CORNERS[0]
  );

  const uEnd = cuspFlatPoint(
    CUSP_DOMAIN_CORNERS[1]
  );

  const vEnd = cuspFlatPoint(
    CUSP_DOMAIN_CORNERS[3]
  );

  const axisVector =
    firstBoundary === "long"
      ? subtractPoint(vEnd, origin)
      : subtractPoint(uEnd, origin);

  const wrappedVector =
    firstBoundary === "long"
      ? subtractPoint(uEnd, origin)
      : subtractPoint(vEnd, origin);

  const axisLength = Math.hypot(
    axisVector.x,
    axisVector.y,
    axisVector.z
  );

  const axisUnit =
    normalizePoint(axisVector);

  const wrappedParallel =
    dotPoint(
      wrappedVector,
      axisUnit
    );

  const transverseVector =
    subtractPoint(
      wrappedVector,
      multiplyPoint(
        axisUnit,
        wrappedParallel
      )
    );

  const transverseLength =
    Math.hypot(
      transverseVector.x,
      transverseVector.y,
      transverseVector.z
    );

  const transverseUnit =
    normalizePoint(
      transverseVector
    );

  return {
    center: addPoint(
      origin,
      multiplyPoint(
        addPoint(
          axisVector,
          wrappedVector
        ),
        0.5
      )
    ),
    axisLength,
    axisUnit,
    wrappedParallel,
    transverseLength,
    transverseUnit,
  };
}

function cuspWrapParameters(
  point,
  firstBoundary
) {
  const coordinates =
    cuspDomainCoordinates(point);

  return {
    /*
     * "long" identifies u = 0 with u = 1.
     * "short" identifies v = 0 with v = 1.
     */
    wrapped:
      firstBoundary === "long"
        ? coordinates.u
        : coordinates.v,

    axial:
      firstBoundary === "long"
        ? coordinates.v
        : coordinates.u,

    cylinderRadius:
      firstBoundary === "long"
        ? CUSP_LONG_CYLINDER_RADIUS
        : CUSP_SHORT_CYLINDER_RADIUS,

    cylinderLength:
      firstBoundary === "long"
        ? CUSP_LONG_CYLINDER_LENGTH
        : CUSP_SHORT_CYLINDER_LENGTH,
  };
}

function pointInCuspFrame(
  frame,
  axialOffset,
  transverseOffset,
  depthOffset
) {
  return addPoint(
    frame.center,
    addPoint(
      multiplyPoint(
        frame.axisUnit,
        axialOffset
      ),
      addPoint(
        multiplyPoint(
          frame.transverseUnit,
          transverseOffset
        ),
        {
          x: 0,
          y: 0,
          z: depthOffset,
        }
      )
    )
  );
}

function cuspRolledCylinderPoint(
  point,
  firstBoundary,
  progress
) {
  const amount = clampUnit(progress);

  const frame =
    cuspFlatFrame(firstBoundary);

  const {
    wrapped,
    axial,
    cylinderRadius,
    cylinderLength,
  } = cuspWrapParameters(
    point,
    firstBoundary
  );

  /*
   * The cusp domain is an oblique parallelogram.
   *
   * While it rolls, gradually remove the wrapped
   * direction's axial shear. The parameterization
   * remains one continuous injective surface until
   * the intended boundary pair meets.
   */
  const currentAxisLength =
    frame.axisLength +
    (
      cylinderLength -
      frame.axisLength
    ) *
      amount;

  const targetCircumference =
    Math.PI *
    2 *
    cylinderRadius;

  const currentWrappedLength =
    frame.transverseLength +
    (
      targetCircumference -
      frame.transverseLength
    ) *
      amount;

  const axialOffset =
    (
      axial - 0.5
    ) *
      currentAxisLength +
    (
      wrapped - 0.5
    ) *
      frame.wrappedParallel *
      (1 - amount);

  const angleSpan =
    Math.PI *
    2 *
    amount;

  /*
   * Exact flat-domain limit. Avoid dividing by the
   * vanishing angular span at the initial frame.
   */
  if (angleSpan < 1e-7) {
    return pointInCuspFrame(
      frame,
      axialOffset,
      (
        wrapped - 0.5
      ) *
        currentWrappedLength,
      0
    );
  }

  const radius =
    currentWrappedLength /
    angleSpan;

  const angle =
    (
      wrapped - 0.5
    ) *
    angleSpan;

  return pointInCuspFrame(
    frame,
    axialOffset,
    radius * Math.sin(angle),
    radius *
      (
        Math.cos(angle) - 1
      ) +
      amount * cylinderRadius
  );
}

function cuspBentTorusPoint(
  point,
  firstBoundary,
  progress
) {
  const amount = clampUnit(progress);

  const frame =
    cuspFlatFrame(firstBoundary);

  const {
    wrapped,
    axial,
    cylinderRadius,
    cylinderLength,
  } = cuspWrapParameters(
    point,
    firstBoundary
  );

  const wrappedAngle =
    (
      wrapped - 0.5
    ) *
    Math.PI *
    2;

  const minorRadius =
    cylinderRadius +
    (
      CUSP_TORUS_MINOR_RADIUS -
      cylinderRadius
    ) *
      amount;

  const bendAngleSpan =
    Math.PI *
    2 *
    amount;

  const currentAxisLength =
    cylinderLength +
    (
      Math.PI *
        2 *
        CUSP_TORUS_MAJOR_RADIUS -
      cylinderLength
    ) *
      amount;

  /*
   * Exact cylinder limit.
   */
  if (bendAngleSpan < 1e-7) {
    return pointInCuspFrame(
      frame,
      (
        axial - 0.5
      ) *
        currentAxisLength,
      minorRadius *
        Math.sin(wrappedAngle),
      minorRadius *
        Math.cos(wrappedAngle)
    );
  }

  /*
   * Bend the cylinder centerline into a circular arc.
   *
   * The bend radius remains larger than the tube
   * radius throughout the deformation. Only the
   * designated cylinder ends meet at completion.
   */
  const bendRadius =
    currentAxisLength /
    bendAngleSpan;

  const bendAngle =
    (
      axial - 0.5
    ) *
    bendAngleSpan;

  const centerAxis =
    bendRadius *
    Math.sin(bendAngle);

  const centerDepth =
    bendRadius *
      (
        1 -
        Math.cos(bendAngle)
      ) -
    amount *
      CUSP_TORUS_MAJOR_RADIUS;

  const radialOffset =
    minorRadius *
    Math.cos(wrappedAngle);

  const axialOffset =
    centerAxis -
    radialOffset *
      Math.sin(bendAngle);

  const transverseOffset =
    minorRadius *
    Math.sin(wrappedAngle);

  const depthOffset =
    centerDepth +
    radialOffset *
      Math.cos(bendAngle);

  return pointInCuspFrame(
    frame,
    axialOffset,
    transverseOffset,
    depthOffset
  );
}

function cuspModelPointFromRaw(
  raw,
  firstBoundary,
  shortWrapProgress,
  longWrapProgress
) {
  const shortAmount =
    smoothStep(shortWrapProgress);

  const longAmount =
    smoothStep(longWrapProgress);

  /*
   * Represent both identifications as one staged path:
   *
   * 0 -> 1:
   * roll the selected first direction into a cylinder.
   *
   * 1 -> 2:
   * bend that cylinder into the cusp torus.
   *
   * Summing the two independent animation values also
   * supplies the correct reverse path for Undo and Reset.
   */
  const stagedProgress =
    Math.max(
      0,
      Math.min(
        2,
        shortAmount +
          longAmount
      )
    );

  const resolvedFirstBoundary =
    firstBoundary === "short"
      ? "short"
      : "long";

  if (stagedProgress <= 1) {
    return cuspRolledCylinderPoint(
      raw,
      resolvedFirstBoundary,
      stagedProgress
    );
  }

  const torusProgress =
    stagedProgress - 1;

  const firstOrderTorusPoint =
    cuspBentTorusPoint(
      raw,
      resolvedFirstBoundary,
      torusProgress
    );

  /*
   * Meridian-first ("long") is the canonical completed
   * cusp embedding. Longitude-first is allowed to build its
   * own cylinder, but during the second identification its
   * torus embedding converges to the same canonical target.
   * Thus the intermediate cylinder records construction order
   * while the completed torus does not.
   */
  if (resolvedFirstBoundary === "long") {
    return firstOrderTorusPoint;
  }

  const canonicalTorusPoint =
    cuspBentTorusPoint(
      raw,
      "long",
      1
    );

  return lerpPoint(
    firstOrderTorusPoint,
    canonicalTorusPoint,
    smootherUnitInterval(
      torusProgress
    )
  );
}

function cuspProjectionView(
  view,
  wrapProgress
) {
  /*
   * Begin with the flat domain facing the viewer,
   * then introduce the useful oblique cusp view.
   * The automatic cusp orientation is applied first;
   * the user's camera-space orientation is applied
   * afterward and remains active at every stage.
   */
  const orientationProgress =
    smoothStep(
      wrapProgress
    );

  const cuspRotation =
    rotationFromYawPitch(
      -0.68 * orientationProgress,
      0.46 * orientationProgress
    );

  return {
    rotation: multiplyRotations(
      view.rotation,
      cuspRotation
    ),
    zoom: view.zoom,
  };
}

function projectUncenteredCuspPoint(
  raw,
  view,
  firstBoundary,
  shortWrapProgress,
  longWrapProgress
) {
  return projectPoint(
    cuspModelPointFromRaw(
      raw,
      firstBoundary,
      shortWrapProgress,
      longWrapProgress
    ),
    cuspProjectionView(
      view,
      Math.max(
        shortWrapProgress,
        longWrapProgress
      )
    )
  );
}

function cuspRawPointFromCoordinates(
  u,
  v
) {
  const origin =
    CUSP_DOMAIN_CORNERS[0];

  const axisU = {
    x:
      CUSP_DOMAIN_CORNERS[1].x -
      origin.x,
    y:
      CUSP_DOMAIN_CORNERS[1].y -
      origin.y,
  };

  const axisV = {
    x:
      CUSP_DOMAIN_CORNERS[3].x -
      origin.x,
    y:
      CUSP_DOMAIN_CORNERS[3].y -
      origin.y,
  };

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

function cuspScreenCenterOffset(
  view,
  firstBoundary,
  shortWrapProgress,
  longWrapProgress
) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  /*
   * Perspective can move the visible projected
   * bounding box away from the projection origin.
   * Sample the complete cusp domain after its current
   * deformation and measure its actual screen bounds.
   */
  for (
    let uIndex = 0;
    uIndex <= CUSP_CENTER_SAMPLES;
    uIndex += 1
  ) {
    for (
      let vIndex = 0;
      vIndex <= CUSP_CENTER_SAMPLES;
      vIndex += 1
    ) {
      const raw =
        cuspRawPointFromCoordinates(
          uIndex /
            CUSP_CENTER_SAMPLES,
          vIndex /
            CUSP_CENTER_SAMPLES
        );

      const projected =
        projectUncenteredCuspPoint(
          raw,
          view,
          firstBoundary,
          shortWrapProgress,
          longWrapProgress
        );

      minX = Math.min(
        minX,
        projected.x
      );

      maxX = Math.max(
        maxX,
        projected.x
      );

      minY = Math.min(
        minY,
        projected.y
      );

      maxY = Math.max(
        maxY,
        projected.y
      );
    }
  }

  return {
    x:
      500 -
      (minX + maxX) / 2,
    y:
      350 -
      (minY + maxY) / 2,
  };
}

function cuspSurfacePointFromRaw(
  raw,
  view,
  firstBoundary,
  shortWrapProgress,
  longWrapProgress,
  centerOffset
) {
  const projected =
    projectUncenteredCuspPoint(
      raw,
      view,
      firstBoundary,
      shortWrapProgress,
      longWrapProgress
    );

  return {
    ...projected,
    x:
      projected.x +
      centerOffset.x,
    y:
      projected.y +
      centerOffset.y,
  };
}

function cuspSurfacePoint(
  tetrahedronId,
  vertexIndex,
  neighborIndex,
  view,
  firstBoundary,
  shortWrapProgress,
  longWrapProgress,
  centerOffset
) {
  return cuspSurfacePointFromRaw(
    rawCuspPoint(
      tetrahedronId,
      vertexIndex,
      neighborIndex
    ),
    view,
    firstBoundary,
    shortWrapProgress,
    longWrapProgress,
    centerOffset
  );
}

function sameVertexSet(first, second) {
  if (first.length !== second.length) {
    return false;
  }

  const sortedFirst = [...first].sort();
  const sortedSecond = [...second].sort();

  return sortedFirst.every(
    (value, index) =>
      value === sortedSecond[index]
  );
}

function cuspTriangleEdgePair(
  tetrahedronId,
  vertexIndex,
  firstNeighbor,
  secondNeighbor
) {
  const containingFace = [
    vertexIndex,
    firstNeighbor,
    secondNeighbor,
  ];

  return (
    FIGURE_EIGHT_FACE_PAIRS.find(
      (candidate) =>
        sameVertexSet(
          candidate[tetrahedronId],
          containingFace
        )
    ) ?? null
  );
}

function cuspTriangleEdgeColor(
  tetrahedronId,
  vertexIndex,
  firstNeighbor,
  secondNeighbor
) {
  return (
    cuspTriangleEdgePair(
      tetrahedronId,
      vertexIndex,
      firstNeighbor,
      secondNeighbor
    )?.color ||
    "rgba(250, 244, 225, 0.96)"
  );
}

function cuspSegmentForFace(
  face,
  localVertexIndex,
  truncationFraction =
    DEFAULT_TRUNCATION_FRACTION
) {
  const vertexIndex =
    face[localVertexIndex];

  const firstNeighbor =
    face[(localVertexIndex + 1) % 3];

  const secondNeighbor =
    face[(localVertexIndex + 2) % 3];

  /*
   * At one truncated ideal vertex, the edge lying
   * inside a given large face joins the two truncated
   * points directed toward the other face vertices.
   */
  return [
    edgePoint(
      vertexIndex,
      firstNeighbor,
      truncationFraction
    ),
    edgePoint(
      vertexIndex,
      secondNeighbor,
      truncationFraction
    ),
  ];
}

function tickMarksForSegment(
  start,
  end,
  count
) {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;

  const length = Math.hypot(
    deltaX,
    deltaY
  );

  if (length < 1e-8) {
    return [];
  }

  const unitX = deltaX / length;
  const unitY = deltaY / length;

  const perpendicularX = -unitY;
  const perpendicularY = unitX;

  const midpointX =
    (start.x + end.x) / 2;

  const midpointY =
    (start.y + end.y) / 2;

  const spacing = 7;
  const halfLength = 5;

  return Array.from(
    { length: count },
    (_, index) => {
      const offset =
        (index - (count - 1) / 2) *
        spacing;

      const centerX =
        midpointX + unitX * offset;

      const centerY =
        midpointY + unitY * offset;

      return {
        x1:
          centerX -
          perpendicularX * halfLength,
        y1:
          centerY -
          perpendicularY * halfLength,
        x2:
          centerX +
          perpendicularX * halfLength,
        y2:
          centerY +
          perpendicularY * halfLength,
      };
    }
  );
}

function averageScreenPoint(points) {
  if (points.length === 0) {
    return { x: 500, y: 350 };
  }

  return points.reduce(
    (sum, point) => ({
      x: sum.x + point.x / points.length,
      y: sum.y + point.y / points.length,
    }),
    { x: 0, y: 0 }
  );
}

function makeTetrahedronCallout(
  tetrahedronId,
  projectedPoints
) {
  const viewerCenter = {
    x: 500,
    y: 350,
  };

  const centroid =
    averageScreenPoint(projectedPoints);

  let directionX =
    centroid.x - viewerCenter.x;

  let directionY =
    centroid.y - viewerCenter.y;

  let directionLength = Math.hypot(
    directionX,
    directionY
  );

  /*
   * Certain viewing angles can project the two
   * tetrahedron centroids almost onto the same point.
   * Preserve a stable A-left / B-right distinction
   * in that degenerate screen-space case.
   */
  if (directionLength < 12) {
    directionX =
      tetrahedronId === "A" ? -1 : 1;

    directionY =
      tetrahedronId === "A" ? 0.22 : -0.22;

    directionLength = Math.hypot(
      directionX,
      directionY
    );
  }

  const unitX =
    directionX / directionLength;

  const unitY =
    directionY / directionLength;

  /*
   * Find the outermost projected point of this
   * tetrahedron in the direction away from the
   * center of the complete complex.
   */
  const outerPoint = projectedPoints.reduce(
    (best, point) => {
      const score =
        point.x * unitX +
        point.y * unitY;

      const bestScore =
        best.x * unitX +
        best.y * unitY;

      return score > bestScore
        ? point
        : best;
    },
    projectedPoints[0]
  );

  const labelDistance = 34;

  const point = {
    x:
      outerPoint.x +
      unitX * labelDistance,
    y:
      outerPoint.y +
      unitY * labelDistance,
  };

  return {
    text: tetrahedronId,
    anchor: centroid,
    point,
    lineEnd: {
      x: point.x - unitX * 16,
      y: point.y - unitY * 16,
    },
  };
}

export default function TruncatedTetrahedraViewer({
  view,
  facePairSequence = [],
  activeSeamPairId = undefined,
  facePairMappingIndices = [],
  showCuspTriangles,
  assembleCusp,
  cuspWrapOrder,
  truncationFraction =
    DEFAULT_TRUNCATION_FRACTION,
  tetrahedronSeparation =
    DEFAULT_TETRAHEDRON_SEPARATION,
  onPairInteraction = null,
  onConstructionStateChange = null,
}) {
  const facePairSequenceKey =
    facePairSequence.join(",");

  const selectedPairId =
    facePairSequence.length > 0
      ? facePairSequence[
          facePairSequence.length - 1
        ]
      : null;

  /*
   * Undefined preserves compatibility with callers that
   * predate explicit seam state. Null deliberately means
   * that every selected pairing is shown cut open.
   */
  const resolvedActiveSeamPairId =
    activeSeamPairId === undefined
      ? facePairSequence[0] ?? null
      : activeSeamPairId !== null &&
          facePairSequence.includes(
            activeSeamPairId
          )
        ? activeSeamPairId
        : null;

  const truncatedGeometry =
    useMemo(
      () =>
        createTruncatedTetrahedronGeometry(
          truncationFraction,
          tetrahedronSeparation
        ),
      [
        truncationFraction,
        tetrahedronSeparation,
      ]
    );

  const bridgeRoutePreferenceByPairRef =
    useRef(
      FIGURE_EIGHT_FACE_PAIRS.map(
        () => null
      )
    );

  /*
   * Retain the last complete displayed route assignment
   * independently of camera projection. The global planner
   * can temporarily return a partial assignment after its
   * transition-start metadata changes, even though the
   * world-space bridge geometry has not changed. A view
   * rotation must never turn that planner bookkeeping
   * change into a disappearing bridge.
   */
  const lastCompleteBridgeRouteSetRef =
    useRef({
      sceneKey: null,
      routeSpecsByPairId:
        FIGURE_EIGHT_FACE_PAIRS.map(
          () => null
        ),
    });

  const [
    bridgeRouteTargetSpecs,
    setBridgeRouteTargetSpecs,
  ] = useState(
    () =>
      FIGURE_EIGHT_FACE_PAIRS.map(
        () => null
      )
  );

  const animatedBridgeRouteSpecs =
    useAnimatedBridgeRouteSpecs(
      bridgeRouteTargetSpecs
    );

  const currentBridgeRouteTargetKey =
    bridgeRouteSpecArrayKey(
      bridgeRouteTargetSpecs
    );

  const animatedBridgeRouteSpecKey =
    bridgeRouteSpecArrayKey(
      animatedBridgeRouteSpecs
    );

  const bridgeRouteTransitionRef =
    useRef({
      targetKey:
        currentBridgeRouteTargetKey,
      startSpecs:
        animatedBridgeRouteSpecs,
    });

  if (
    bridgeRouteTransitionRef
      .current.targetKey !==
    currentBridgeRouteTargetKey
  ) {
    bridgeRouteTransitionRef.current = {
      targetKey:
        currentBridgeRouteTargetKey,
      startSpecs:
        animatedBridgeRouteSpecs.map(
          (routeSpec) =>
            routeSpec === null
              ? null
              : { ...routeSpec }
        ),
    };
  }

  const [
    showDeveloperDiagnostics,
    setShowDeveloperDiagnostics,
  ] = useState(false);

  /*
   * Retain the last successful side of an obstacle for
   * the currently active face. This route preference is
   * advisory: a clearly safer candidate may replace it.
   */
  const plannerGuidePreferenceRef =
    useRef(null);

  useEffect(() => {
    if (
      process.env.NODE_ENV !==
      "development" ||
      typeof window === "undefined"
    ) {
      return undefined;
    }

    const auditRunner = (options) =>
      runFigureEightFaceOrderAudit(
        options
      );

    const cancelAudit = () =>
      cancelFigureEightFaceOrderAudit();

    const showDiagnostics = () =>
      setShowDeveloperDiagnostics(true);

    const hideDiagnostics = () =>
      setShowDeveloperDiagnostics(false);

    const toggleDiagnostics = () =>
      setShowDeveloperDiagnostics(
        (current) => !current
      );

    window.runFigureEightFaceOrderAudit =
      auditRunner;

    window.cancelFigureEightFaceOrderAudit =
      cancelAudit;

    window.showFigureEightDiagnostics =
      showDiagnostics;

    window.hideFigureEightDiagnostics =
      hideDiagnostics;

    window.toggleFigureEightDiagnostics =
      toggleDiagnostics;

    console.info(
      "Figure-eight audit ready. Run " +
      "await window.runFigureEightFaceOrderAudit() " +
      "in the browser console."
    );

    console.info(
      "Detailed face diagnostics are hidden. Run " +
      "window.showFigureEightDiagnostics() to display them."
    );

    return () => {
      if (
        window.runFigureEightFaceOrderAudit ===
        auditRunner
      ) {
        delete window
          .runFigureEightFaceOrderAudit;
      }

      if (
        window.cancelFigureEightFaceOrderAudit ===
        cancelAudit
      ) {
        delete window
          .cancelFigureEightFaceOrderAudit;
      }

      if (
        window.showFigureEightDiagnostics ===
        showDiagnostics
      ) {
        delete window
          .showFigureEightDiagnostics;
      }

      if (
        window.hideFigureEightDiagnostics ===
        hideDiagnostics
      ) {
        delete window
          .hideFigureEightDiagnostics;
      }

      if (
        window.toggleFigureEightDiagnostics ===
        toggleDiagnostics
      ) {
        delete window
          .toggleFigureEightDiagnostics;
      }
    };
  }, []);

  const preferredPlannerGuide =
    plannerGuidePreferenceRef.current;

  const {
    strengths:
      facePairStrengths,
    order:
      facePairConstraintOrder,
  } = useFacePairStrengths(
    facePairSequence
  );

  const seamPairRef =
    useRef(
      resolvedActiveSeamPairId
    );

  if (
    resolvedActiveSeamPairId !== null
  ) {
    seamPairRef.current =
      resolvedActiveSeamPairId;
  }

  const animatedSeamStrength =
    useAnimatedAssembly(
      resolvedActiveSeamPairId !== null,
      SEAM_TRANSITION_DURATION_MS
    );

  const seamPairId =
    resolvedActiveSeamPairId ??
    (
      animatedSeamStrength >
      FACE_CONSTRAINT_EPSILON
        ? seamPairRef.current
        : null
    );

  const firstPairAssembling =
    seamPairId !== null &&
    facePairSequence.length === 1 &&
    facePairSequence[0] === seamPairId &&
    (
      facePairStrengths[
        seamPairId
      ] ?? 0
    ) <
      FACE_VALIDITY_FULL_STRENGTH;

  const effectiveSeamStrength =
    firstPairAssembling
      ? 1
      : animatedSeamStrength;

  /*
   * This flag becomes true on the same render that the
   * controller requests a collapse or expansion. It must not
   * wait for animatedSeamStrength to move away from an endpoint;
   * otherwise the expensive route audit can block the very
   * first requestAnimationFrame of the transition.
   */
  const seamTransitionInProgress =
    !showCuspTriangles &&
    (
      resolvedActiveSeamPairId !== null
        ? animatedSeamStrength <
          1 - FACE_CONSTRAINT_EPSILON
        : seamPairId !== null &&
          animatedSeamStrength >
            FACE_CONSTRAINT_EPSILON
    );

  const animatedFacePairMappings =
    useAnimatedCyclicFaceMappings(
      facePairMappingIndices
    );

  const animatedFacePairMappingKey =
    animatedFacePairMappings.join(
      ","
    );

  const normalizedFacePairMappingTargets =
    FIGURE_EIGHT_FACE_PAIRS.map(
      (_, pairId) =>
        orientedFacePairMappingIndex(
          pairId,
          facePairMappingIndices?.[
            pairId
          ] ?? 0
        )
    );

  const facePairMappingTargetKey =
    normalizedFacePairMappingTargets.join(
      ","
    );

  const facePairMappingTransitionRef =
    useRef({
      targetKey:
        facePairMappingTargetKey,
      startTurns: [
        ...animatedFacePairMappings,
      ],
      targetTurns: [
        ...animatedFacePairMappings,
      ],
    });

  const facePairMappingsSettled =
    normalizedFacePairMappingTargets.every(
      (target, pairId) =>
        settledCyclicMappingIndex(
          animatedFacePairMappings[
            pairId
          ] ?? 0
        ) === target
    );

  if (
    facePairMappingTransitionRef
      .current.targetKey !==
    facePairMappingTargetKey
  ) {
    facePairMappingTransitionRef.current = {
      targetKey:
        facePairMappingTargetKey,
      startTurns: [
        ...animatedFacePairMappings,
      ],
      targetTurns:
        normalizedFacePairMappingTargets.map(
          (target, pairId) =>
            nearestEquivalentMappingTurn(
              animatedFacePairMappings[
                pairId
              ] ?? 0,
              target
            )
        ),
    };
  } else if (facePairMappingsSettled) {
    facePairMappingTransitionRef
      .current.startTurns = [
        ...animatedFacePairMappings,
      ];

    facePairMappingTransitionRef
      .current.targetTurns = [
        ...animatedFacePairMappings,
      ];
  }

  if (
    facePairMappingsSettled &&
    animatedBridgeRouteSpecKey ===
      currentBridgeRouteTargetKey
  ) {
    bridgeRouteTransitionRef
      .current.startSpecs =
        animatedBridgeRouteSpecs.map(
          (routeSpec) =>
            routeSpec === null
              ? null
              : { ...routeSpec }
        );
  }

  const pairingProgress =
    selectedPairId === null
      ? 0
      : facePairStrengths[
          selectedPairId
        ];

  const cuspAssemblyProgress =
    useAnimatedAssembly(
      showCuspTriangles &&
      assembleCusp
    );

  const shortWrapProgress =
    useAnimatedAssembly(
      showCuspTriangles &&
      assembleCusp &&
      cuspWrapOrder.includes(
        "short"
      ),
      CUSP_WRAP_DURATION_MS
    );

  const longWrapProgress =
    useAnimatedAssembly(
      showCuspTriangles &&
      assembleCusp &&
      cuspWrapOrder.includes(
        "long"
      ),
      CUSP_WRAP_DURATION_MS
    );

  const cuspWrapProgress =
    Math.max(
      shortWrapProgress,
      longWrapProgress
    );

  /*
   * Preserve the first selected cusp direction while
   * the surface reverses during Undo or Reset.
   */
  const cuspFirstBoundaryRef =
    useRef(null);

  useEffect(() => {
    if (cuspWrapOrder.length > 0) {
      cuspFirstBoundaryRef.current =
        cuspWrapOrder[0];
    }
  }, [cuspWrapOrder]);

  const cuspFirstBoundary =
    cuspWrapOrder[0] ??
    cuspFirstBoundaryRef.current ??
    (
      shortWrapProgress >
      longWrapProgress
        ? "short"
        : "long"
    );

  const rendered = useMemo(() => {
    const faces = [];
    const labels = [];
    const callouts = [];
    const cuspEdgeMatches = [];
    const cuspMeshFaces = [];
    const cuspTriangleOutlines = [];

    /*
     * Once either peripheral identification begins, move the
     * outer ends of the eight attached cusp collars into the
     * intrinsic cusp development. The first identification rolls
     * that development into a cylinder; the second bends the
     * cylinder closed into the torus. The original eight bases
     * remain fixed on the tetrahedra throughout.
     */
    const cuspBoundaryStage =
      smoothStep(shortWrapProgress) +
      smoothStep(longWrapProgress);

    const cuspBoundaryAssemblyProgress =
      clampUnit(cuspBoundaryStage);

    const cuspOverviewProgress =
      smoothStep(
        cuspBoundaryAssemblyProgress
      );

    /*
     * The intrinsic cusp torus is much larger than the compact
     * bridge construction in this combined view. Grow the cusp
     * target by a fixed world-space factor while pulling the
     * camera back by the reciprocal visual scale. This keeps the
     * complete torus on screen and leaves the face bridges as a
     * small central construction inside it.
     */
    const displayView =
      cuspOverviewProgress >
      FACE_CONSTRAINT_EPSILON
        ? {
            ...view,
            zoom:
              view.zoom *
              (
                1 +
                (
                  CUSP_BOUNDARY_OVERVIEW_ZOOM -
                  1
                ) *
                  cuspOverviewProgress
              ),
            perspectiveDistance:
              DEFAULT_PERSPECTIVE_DISTANCE *
              (
                1 +
                (
                  CUSP_BOUNDARY_WORLD_SCALE -
                  1
                ) *
                  cuspOverviewProgress
              ),
          }
        : view;

    /*
     * Center the cusp from a uniform sample of the complete
     * intrinsic domain, rather than from only the eight
     * triangles' corner vertices. In the longitude-first
     * parameterization those corner vertices all land on a
     * single torus cross-section at completion, so their
     * bounding center is displaced by one major radius.
     * Sampling the full domain makes the final torus center
     * independent of which peripheral identification was
     * performed first.
     */
    const cuspAssemblyCenterSamples =
      Array.from(
        { length: CUSP_CENTER_SAMPLES + 1 },
        (_, uIndex) =>
          Array.from(
            { length: CUSP_CENTER_SAMPLES + 1 },
            (_, vIndex) =>
              cuspRawPointFromCoordinates(
                uIndex / CUSP_CENTER_SAMPLES,
                vIndex / CUSP_CENTER_SAMPLES
              )
          )
      ).flat();

    const cuspAssemblyTargetCenter =
      cuspBoundaryStage >
      FACE_CONSTRAINT_EPSILON
        ? boundingCenter(
            cuspAssemblyCenterSamples.map(
              (rawPoint) =>
                cuspModelPointFromRaw(
                  rawPoint,
                  cuspFirstBoundary,
                  shortWrapProgress,
                  longWrapProgress
                )
            )
          )
        : { x: 0, y: 0, z: 0 };

    function attachedCuspTargetPoint(
      rawPoint
    ) {
      return multiplyPoint(
        subtractPoint(
          cuspModelPointFromRaw(
            rawPoint,
            cuspFirstBoundary,
            shortWrapProgress,
            longWrapProgress
          ),
          cuspAssemblyTargetCenter
        ),
        CUSP_BOUNDARY_WORLD_SCALE
      );
    }

    /*
     * The cusp is an attached boundary of this same
     * face-pairing construction. Revealing it must not
     * discard the manifold identifications underneath it.
     */
    const effectivePairStrengths =
      facePairStrengths;

    const effectiveConstraintOrder =
      facePairConstraintOrder;

    const physicalSeamPairId =
      seamPairId === null ||
      !effectiveConstraintOrder.includes(
        seamPairId
      ) ||
      effectiveSeamStrength <=
        FACE_CONSTRAINT_EPSILON
        ? null
        : seamPairId;

    /*
     * Every selected face pairing now owns one bridge-state
     * definition. The active physical seam is represented as
     * the same bridge at zero exposure; all other pairings are
     * exposed and rendered as solid bridges.
     *
     * This separates quotient pairing order from the chosen
     * Euclidean seam without changing the current appearance.
     */
    const pairingBridgeDefinitions =
      effectiveConstraintOrder.map(
        (pairId, pairingIndex) => {
          const priorPairIds =
            effectiveConstraintOrder.slice(
              0,
              pairingIndex
            );

          const bridgeClassification =
            classifyBridgeFaceAdjacency({
              pairId,
              priorPairIds,
              facePairMappingTurns:
                normalizedFacePairMappingTargets,
              pairStrengths:
                effectivePairStrengths,
            });

          const seamStrength =
            pairId ===
            physicalSeamPairId
              ? effectiveSeamStrength
              : 0;

          const bridgeExposure =
            1 - seamStrength;

          const seamOwnsBridgeSpan =
            pairId === seamPairId;

          const seamTransitionActive =
            seamOwnsBridgeSpan &&
            seamStrength >
              FACE_CONSTRAINT_EPSILON &&
            bridgeExposure >
              FACE_CONSTRAINT_EPSILON;

          const bridgeSpanScale =
            seamOwnsBridgeSpan
              ? bridgeExposure
              : 1;

          const collapsed =
            bridgeExposure <=
            FACE_CONSTRAINT_EPSILON;

          return {
            pairId,
            pairing:
              FIGURE_EIGHT_FACE_PAIRS[
                pairId
              ],
            pairingIndex,
            bridgeIndex: null,
            priorPairIds,
            collapsed,
            seamStrength,
            bridgeExposure,
            bridgeSpanScale,
            seamTransitionActive,
            bridgeType:
              bridgeClassification.type,
            bridgeClassification,
            routeLane: 0,
            routeSpec:
              DEFAULT_BRIDGE_ROUTE_SPEC,
            mappingTurn:
              animatedFacePairMappings[
                pairId
              ] ?? 0,
            sweepStartMappingTurn:
              facePairMappingTransitionRef
                .current.startTurns[
                  pairId
                ] ?? 0,
            routingMappingTurn:
              facePairMappingTransitionRef
                .current.targetTurns[
                  pairId
                ] ??
              animatedFacePairMappings[
                pairId
              ] ??
              0,
            mappingIndex:
              normalizeCyclicMappingIndex(
                facePairMappingIndices?.[
                  pairId
                ] ?? 0
              ),
            progress:
              seamOwnsBridgeSpan
                ? Math.min(
                    1,
                    effectivePairStrengths[
                      pairId
                    ] ?? 0
                  )
                : Math.min(
                    effectivePairStrengths[
                      pairId
                    ] ?? 0,
                    bridgeExposure
                  ),
          };
        }
      );

    const solidBridgeDefinitions =
      pairingBridgeDefinitions
        .filter(
          (definition) =>
            definition.bridgeExposure >
            FACE_CONSTRAINT_EPSILON
        )
        .map(
          (definition, bridgeIndex) => ({
            ...definition,
            bridgeIndex,
          })
        );

    const physicalPairStrengths =
      effectivePairStrengths.map(
        (strength, pairId) =>
          pairId === physicalSeamPairId
            ? Math.min(
                strength,
                effectiveSeamStrength
              )
            : 0
      );

    const physicalConstraintOrder =
      physicalSeamPairId === null
        ? []
        : [physicalSeamPairId];

    const faceSolution =
      solveFacePairPositions(
        physicalPairStrengths,
        physicalConstraintOrder,
        preferredPlannerGuide,
        animatedFacePairMappings,
        truncatedGeometry
      );

    const physicalWorldPositions =
      faceSolution.positions;

    const collisionDiagnostics =
      showCuspTriangles
        ? {
            minimumClearance: null,
            minimumClearancePair: null,
            nearContactPairs: [],
            penetratingPairs: [],
            blockedPairId: null,
            testedPairCount: 0,
            adjacentPairCount: 0,
            allowedContactPairCount: 0,
            clearanceThreshold:
              FACE_COLLISION_CLEARANCE,
            barrierContactCount: 0,
            barrierCorrectionCount: 0,
            requestedStrength: null,
            acceptedStrength: null,
            plannerGuideIndex: null,
            plannerPairId: null,
            plannerGuideAmount: 0,
            plannerActive: false,
            plannerCandidateCount: 0,
            plannerValidCandidateCount: 0,
            plannerBestScore: null,
            blockedPlannerCandidateCount: 0,
            blockedPlannerValidCandidateCount: 0,
            blockedPlannerBestScore: null,
            sweptPenetratingPairs: 0,
          }
        : {
            ...faceSolution
              .diagnostics,
            blockedPairId:
              faceSolution
                .blockedPairId,
            barrierContactCount:
              faceSolution
                .barrierContactCount,
            barrierCorrectionCount:
              faceSolution
                .barrierCorrectionCount,
            requestedStrength:
              faceSolution
                .requestedStrength,
            acceptedStrength:
              faceSolution
                .acceptedStrength,
            plannerGuideIndex:
              faceSolution
                .plannerGuideIndex,
            plannerPairId:
              faceSolution
                .plannerPairId,
            plannerGuideAmount:
              faceSolution
                .plannerGuideAmount,
            plannerActive:
              faceSolution
                .plannerActive,
            plannerCandidateCount:
              faceSolution
                .plannerCandidateCount,
            plannerValidCandidateCount:
              faceSolution
                .plannerValidCandidateCount,
            plannerBestScore:
              faceSolution
                .plannerBestScore,
            blockedPlannerCandidateCount:
              faceSolution
                .blockedPlannerCandidateCount,
            blockedPlannerValidCandidateCount:
              faceSolution
                .blockedPlannerValidCandidateCount,
            blockedPlannerBestScore:
              faceSolution
                .blockedPlannerBestScore,
            sweptPenetratingPairs:
              faceSolution
                .sweptPenetratingPairs,
          };

    const validityDiagnostics =
      showCuspTriangles
        ? {
            status: "complete",
            pairMetrics: [],
            maximumSeamError: 0,
            rmsSeamError: 0,
            maximumEdgeDistortion: 0,
            rmsEdgeDistortion: 0,
            minimumTriangleAreaRatio: 1,
            maximumTriangleAreaRatio: 1,
            collapsedTriangleCount: 0,
            invertedTriangleCount: 0,
            minimumClearance: null,
            solverResidual: 0,
            initialSolverResidual: 0,
            residualImprovement: 1,
            numericallyConverged: true,
            stagnating: false,
            plannerExhausted: false,
            plannerImproving: false,
            plannerCandidateCount: 0,
            plannerValidCandidateCount: 0,
            plannerBestScore: null,
            blockedPlannerCandidateCount: 0,
            blockedPlannerValidCandidateCount: 0,
            blockedPlannerBestScore: null,
            blockedPlannerImproving: false,
            allRequestedFull: true,
            allAccepted: true,
            seamsExact: true,
            collisionValid: true,
            shapeValid: true,
          }
        : analyzeFaceSolutionValidity({
            positions:
              physicalWorldPositions,
            pairStrengths:
              physicalPairStrengths,
            constraintOrder:
              physicalConstraintOrder,
            acceptedPairStrengths:
              faceSolution
                .acceptedPairStrengths,
            collisionDiagnostics,
            blockedPairId:
              faceSolution
                .blockedPairId,
            requestedStrength:
              faceSolution
                .requestedStrength,
            acceptedStrength:
              faceSolution
                .acceptedStrength,
            plannerActive:
              faceSolution
                .plannerActive,
            plannerCandidateCount:
              faceSolution
                .plannerCandidateCount,
            plannerValidCandidateCount:
              faceSolution
                .plannerValidCandidateCount,
            plannerBestScore:
              faceSolution
                .plannerBestScore,
            blockedPlannerCandidateCount:
              faceSolution
                .blockedPlannerCandidateCount,
            blockedPlannerValidCandidateCount:
              faceSolution
                .blockedPlannerValidCandidateCount,
            blockedPlannerBestScore:
              faceSolution
                .blockedPlannerBestScore,
            solverResidual:
              faceSolution
                .solverResidual,
            initialSolverResidual:
              faceSolution
                .initialSolverResidual,
            sweptPenetratingPairCount:
              faceSolution
                .sweptPenetratingPairs,
            facePairMappingTurns:
              animatedFacePairMappings,
            geometry:
              truncatedGeometry,
          });

    const firstPhysicalPairId =
      physicalConstraintOrder[0] ??
      null;

    const firstFaceMappingInTransition =
      !showCuspTriangles &&
      firstPhysicalPairId !== null &&
      physicalConstraintOrder.length ===
        1 &&
      physicalPairStrengths[
        firstPhysicalPairId
      ] >=
        FACE_VALIDITY_FULL_STRENGTH &&
      settledCyclicMappingIndex(
        animatedFacePairMappings[
          firstPhysicalPairId
        ] ?? 0
      ) === null;

    /*
     * During a first-seam vertex-map change, tetrahedron
     * B follows an exact rigid rotation around the shared
     * face normal. Intermediate angles intentionally do
     * not define a discrete vertex correspondence. Do not
     * invoke the quotient cut-open fallback during those
     * frames: it would pull the tetrahedra apart and
     * replace the rotating seam with dotted links.
     */
    const quotientDisplayActive =
      !firstFaceMappingInTransition &&
      !showCuspTriangles &&
      (
        validityDiagnostics.status ===
          "quotient-only" ||
        (
          validityDiagnostics.status ===
            "blocked" &&
          validityDiagnostics
            .allRequestedFull
        )
      );

    const requestedFullPairMetrics =
      validityDiagnostics.pairMetrics.filter(
        (metric) =>
          metric.requestedStrength >=
          FACE_VALIDITY_FULL_STRENGTH
      );

    const quotientUnresolvedPairIds = [];

    if (quotientDisplayActive) {
      requestedFullPairMetrics.forEach(
        (metric) => {
          if (
            metric.acceptedStrength <
              metric.requestedStrength -
                0.005 ||
            metric.maximumError >
              FACE_VALIDITY_SEAM_TOLERANCE
          ) {
            quotientUnresolvedPairIds.push(
              metric.pairId
            );
          }
        }
      );

      const blockedPairId =
        collisionDiagnostics
          .blockedPairId;

      if (
        blockedPairId !== null &&
        !quotientUnresolvedPairIds.includes(
          blockedPairId
        )
      ) {
        quotientUnresolvedPairIds.push(
          blockedPairId
        );
      }

      /*
       * A quotient-only result can arise from collapse
       * or inversion after every seam was numerically
       * accepted. In that case, reopen the final
       * requested pair and represent that identification
       * explicitly rather than displaying the invalid
       * literal coincidence.
       */
      if (
        quotientUnresolvedPairIds.length ===
          0 &&
        requestedFullPairMetrics.length > 0
      ) {
        quotientUnresolvedPairIds.push(
          requestedFullPairMetrics[
            requestedFullPairMetrics.length -
              1
          ].pairId
        );
      }
    }

    const orderedQuotientPairIds =
      effectiveConstraintOrder.filter(
        (pairId) =>
          quotientUnresolvedPairIds.includes(
            pairId
          )
      );

    let displayFaceSolution =
      faceSolution;

    let quotientCutOpenStrength = null;
    let quotientCutOpenValid = true;

    if (
      validityDiagnostics.status ===
        "quotient-only" &&
      orderedQuotientPairIds.length > 0
    ) {
      const firstOpenPairId =
        orderedQuotientPairIds[0];

      const firstOpenIndex =
        effectiveConstraintOrder.indexOf(
          firstOpenPairId
        );

      const cutOpenState =
        findValidQuotientCutOpenState({
          faceSolution,
          pairStrengths:
            effectivePairStrengths,
          constraintOrder:
            effectiveConstraintOrder,
          firstOpenIndex,
          preferredGuideIndex:
            preferredPlannerGuide,
          geometry:
            truncatedGeometry,
        });

      displayFaceSolution =
        cutOpenState.faceSolution;

      quotientCutOpenStrength =
        cutOpenState.cutOpenStrength;

      quotientCutOpenValid =
        cutOpenState.valid;
    }

    const solvedWorldPositions =
      displayFaceSolution.positions;

    function worldPoint(
      point,
      tetrahedron
    ) {
      const mesh =
        truncatedGeometry.meshes[
          tetrahedron.id
        ];

      /*
       * All rendered truncated-surface points resolve
       * to one of the twelve shared mesh vertices.
       * A fallback remains for any auxiliary point that
       * is not part of the indexed surface.
       */
      const vertexIndex =
        mesh.vertices.findIndex(
          (vertex) =>
            pointDistance(
              vertex.point,
              point
            ) <
            FACE_CONSTRAINT_EPSILON
        );

      if (vertexIndex === -1) {
        return transformPoint(
          point,
          tetrahedron
        );
      }

      return solvedWorldPositions[
        tetrahedron.id
      ][vertexIndex];
    }

    /*
     * Recompute the center of the complete current
     * geometry on every animation frame. This makes
     * the combined complex, rather than the original
     * world origin, the orbit and projection center.
     */
    const sceneTetrahedra =
      truncatedGeometry.tetrahedra ??
      TETRAHEDRA;

    const scenePoints =
      sceneTetrahedra.flatMap(
        (tetrahedron) => {
        const mesh =
        truncatedGeometry.meshes[
            tetrahedron.id
          ];

        return mesh.vertices.map(
          (vertex) =>
            worldPoint(
              vertex.point,
              tetrahedron
            )
        );
      }
    );

    const sceneCenter =
      boundingCenter(scenePoints);

    function centeredWorldPoint(
      point,
      tetrahedron
    ) {
      return subtractPoint(
        worldPoint(point, tetrahedron),
        sceneCenter
      );
    }

    /*
     * The three cusp triangles on each side of the physical
     * seam occur in three A/B pairs. Give each pair one common
     * extension direction in the shared face plane, so the two
     * triangular prisms genuinely share one rectangular wall.
     * The two cusp triangles opposite the seam remain independent.
     */
    const sharedCuspCollarDirectionByBaseId =
      new Map();

    const settledPhysicalSeamMapping =
      physicalSeamPairId === null
        ? null
        : settledCyclicMappingIndex(
            animatedFacePairMappings[
              physicalSeamPairId
            ] ?? 0
          );

    const sharedCuspSeamPairId =
      settledPhysicalSeamMapping === null
        ? null
        : physicalSeamPairId;

    if (sharedCuspSeamPairId !== null) {
      const seamPair =
        FIGURE_EIGHT_FACE_PAIRS[
          sharedCuspSeamPairId
        ];

      const seamFaceA =
        faceWorldPointsForPair(
          solvedWorldPositions,
          "A",
          sharedCuspSeamPairId
        ).map((point) =>
          subtractPoint(
            point,
            sceneCenter
          )
        );

      const seamFaceCenter =
        averageWorldPoint(seamFaceA);

      const vertexPermutation =
        CYCLIC_FACE_MAPPING_CHOICES[
          settledPhysicalSeamMapping
        ].vertexPermutation;

      seamPair.A.forEach(
        (vertexA, localVertexIndex) => {
          const sharedEdge =
            cuspSegmentForFace(
              seamPair.A,
              localVertexIndex,
              truncatedGeometry
                .truncationFraction
            ).map((point) =>
              centeredWorldPoint(
                point,
                sceneTetrahedra[0]
              )
            );

          const sharedEdgeCenter =
            averageWorldPoint(
              sharedEdge
            );

          const direction =
            normalizePoint(
              subtractPoint(
                sharedEdgeCenter,
                seamFaceCenter
              )
            );

          const vertexB =
            seamPair.B[
              vertexPermutation[
                localVertexIndex
              ]
            ];

          sharedCuspCollarDirectionByBaseId
            .set(
              `A${vertexA}`,
              direction
            );

          sharedCuspCollarDirectionByBaseId
            .set(
              `B${vertexB}`,
              direction
            );
        }
      );
    }

    sceneTetrahedra.forEach((tetrahedron) => {
      const mesh =
        truncatedGeometry.meshes[
          tetrahedron.id
        ];

      mesh.largeFaces.forEach(
        (meshFace) => {
          const pair =
            FIGURE_EIGHT_FACE_PAIRS[
              meshFace.pairId
            ];

          const projected =
            meshFacePoints(
              mesh,
              meshFace
            )
              .map((point) =>
                centeredWorldPoint(
                  point,
                  tetrahedron
                )
              )
              .map((point) =>
                projectPoint(
                  point,
                  displayView
                )
              );

          faces.push({
            key: meshFace.id,
            pair,
            meshFace,
            projected,
            depth:
              projected.reduce(
                (sum, point) =>
                  sum + point.depth,
                0
              ) /
              projected.length,
          });
        }
      );

      const tetrahedronBodyCenter =
        averageWorldPoint(
          mesh.vertices.map((vertex) =>
            centeredWorldPoint(
              vertex.point,
              tetrahedron
            )
          )
        );

      VERTICES.forEach((_, vertexIndex) => {
        const neighbors =
          TRUNCATION_NEIGHBORS[
            vertexIndex
          ];

        const cuspMeshFace =
          mesh.cuspFaces[
            vertexIndex
          ];

        const modelPoints =
          meshFacePoints(
            mesh,
            cuspMeshFace
          ).map((point) =>
            centeredWorldPoint(
              point,
              tetrahedron
            )
          );

        const projectedInSpace =
          modelPoints.map((point) =>
            projectPoint(
              point,
              displayView
            )
          );

        const cuspBaseCenter =
          averageWorldPoint(modelPoints);

        const outwardNormal =
          outwardFaceNormal(
            modelPoints,
            tetrahedronBodyCenter
          );

        const cuspBaseId =
          `${tetrahedron.id}${vertexIndex}`;

        const collarDirection =
          sharedCuspCollarDirectionByBaseId
            .get(cuspBaseId) ??
          outwardNormal;

        const outerModelPoints =
          modelPoints.map((point) =>
            addPoint(
              point,
              multiplyPoint(
                collarDirection,
                CUSP_COLLAR_LENGTH
              )
            )
          );

        const rawFlatPoints =
          neighbors.map((neighborIndex) =>
            rawCuspPoint(
              tetrahedron.id,
              vertexIndex,
              neighborIndex
            )
          );

        const assembledOuterModelPoints =
          outerModelPoints.map(
            (point, pointIndex) =>
              lerpPoint(
                point,
                attachedCuspTargetPoint(
                  rawFlatPoints[
                    pointIndex
                  ]
                ),
                cuspBoundaryAssemblyProgress
              )
          );

        const projectedTarget =
          assembledOuterModelPoints.map(
            (point) =>
              projectPoint(
                point,
                displayView
              )
          );

        const projected =
          showCuspTriangles
            ? projectedInSpace.map(
                (point, pointIndex) =>
                  lerpProjectedPoint(
                    point,
                    projectedTarget[
                      pointIndex
                    ],
                    cuspAssemblyProgress
                  )
              )
            : projectedInSpace;

        /*
         * A cusp collar has two geometric parts:
         *
         * 1. the original straight 177-unit triangular prism;
         * 2. a routed triangular tube from that prism to the
         *    corresponding curved triangle on the cusp torus.
         *
         * Keep the cross-section compact along most of the route,
         * then morph it into the torus triangle only near arrival.
         * This prevents the colored side walls from becoming
         * enormous membranes spanning the complete construction.
         */
        const cuspRouteStartCenter =
          averageWorldPoint(
            outerModelPoints
          );

        const cuspRouteTargetCenter =
          attachedCuspTargetPoint(
            blendTrianglePoint(
              rawFlatPoints,
              [1 / 3, 1 / 3, 1 / 3]
            )
          );

        const cuspRouteTargetRadial =
          normalizePoint(
            cuspRouteTargetCenter
          );

        const primaryRouteTangent =
          crossPoint(
            cuspRouteTargetRadial,
            { x: 0, y: 1, z: 0 }
          );

        const cuspRouteTangent =
          normalizePoint(
            Math.hypot(
              primaryRouteTangent.x,
              primaryRouteTangent.y,
              primaryRouteTangent.z
            ) >
              1e-6
              ? primaryRouteTangent
              : crossPoint(
                  cuspRouteTargetRadial,
                  { x: 1, y: 0, z: 0 }
                )
          );

        const cuspRouteIndex =
          (
            tetrahedron.id === "A"
              ? 0
              : 4
          ) +
          vertexIndex;

        const cuspRouteLane =
          cuspRouteIndex - 3.5;

        const cuspRouteLaneOffset =
          multiplyPoint(
            cuspRouteTangent,
            cuspRouteLane *
              CUSP_COLLAR_ROUTE_LANE_SPACING
          );

        const cuspRouteFirstControl =
          addPoint(
            addPoint(
              cuspRouteStartCenter,
              multiplyPoint(
                collarDirection,
                CUSP_COLLAR_ROUTE_DEPARTURE
              )
            ),
            multiplyPoint(
              cuspRouteLaneOffset,
              0.35
            )
          );

        const cuspRouteSecondControl =
          addPoint(
            subtractPoint(
              cuspRouteTargetCenter,
              multiplyPoint(
                cuspRouteTargetRadial,
                CUSP_COLLAR_ROUTE_APPROACH
              )
            ),
            cuspRouteLaneOffset
          );

        function cuspRouteWeightsForEdge(
          firstIndex,
          secondIndex,
          acrossAmount
        ) {
          const weights = [0, 0, 0];

          weights[firstIndex] =
            1 - acrossAmount;

          weights[secondIndex] =
            acrossAmount;

          return weights;
        }

        function routedCuspModelPoint(
          weights,
          routeAmount
        ) {
          const amount =
            clampUnit(routeAmount);

          const startPoint =
            blendTrianglePoint(
              outerModelPoints,
              weights
            );

          const targetPoint =
            attachedCuspTargetPoint(
              blendTrianglePoint(
                rawFlatPoints,
                weights
              )
            );

          const routeCenter =
            cubicBezierPoint(
              cuspRouteStartCenter,
              cuspRouteFirstControl,
              cuspRouteSecondControl,
              cuspRouteTargetCenter,
              amount
            );

          const startOffset =
            subtractPoint(
              startPoint,
              cuspRouteStartCenter
            );

          const targetOffset =
            subtractPoint(
              targetPoint,
              cuspRouteTargetCenter
            );

          const shapeAmount =
            smootherUnitInterval(
              (
                amount -
                CUSP_COLLAR_SHAPE_MORPH_START
              ) /
              (
                1 -
                CUSP_COLLAR_SHAPE_MORPH_START
              )
            );

          const routedPoint =
            addPoint(
              routeCenter,
              lerpPoint(
                startOffset,
                targetOffset,
                shapeAmount
              )
            );

          return lerpPoint(
            startPoint,
            routedPoint,
            cuspBoundaryAssemblyProgress
          );
        }

        function localCollarModelPoint(
          weights,
          localAmount
        ) {
          const basePoint =
            blendTrianglePoint(
              modelPoints,
              weights
            );

          const outerPoint =
            blendTrianglePoint(
              outerModelPoints,
              weights
            );

          const localPoint =
            lerpPoint(
              basePoint,
              outerPoint,
              clampUnit(localAmount)
            );

          return lerpPoint(
            basePoint,
            localPoint,
            cuspAssemblyProgress
          );
        }

        function activeRoutedCuspModelPoint(
          weights,
          routeAmount
        ) {
          const basePoint =
            blendTrianglePoint(
              modelPoints,
              weights
            );

          const routedPoint =
            routedCuspModelPoint(
              weights,
              routeAmount
            );

          return lerpPoint(
            basePoint,
            routedPoint,
            cuspAssemblyProgress
          );
        }

        if (showCuspTriangles) {
          /*
           * Keep the original truncation triangle attached.
           * A second copy moves outward and the three side
           * walls form a triangular cusp collar between them.
           */
          faces.push({
            key:
              `${tetrahedron.id}-cusp-base-` +
              `${vertexIndex}`,
            pair: null,
            cuspBase: true,
            cuspBaseId,
            cuspBaseCenter,
            outwardNormal,
            collarDirection,
            projected: projectedInSpace,
            depth:
              projectedInSpace.reduce(
                (sum, point) =>
                  sum + (point.depth || 0),
                0
              ) / projectedInSpace.length,
          });

          if (
            cuspAssemblyProgress >
            FACE_CONSTRAINT_EPSILON
          ) {
            [
              [0, 1],
              [1, 2],
              [2, 0],
            ].forEach(
              ([firstIndex, secondIndex], edgeIndex) => {
                const firstNeighbor =
                  neighbors[firstIndex];

                const secondNeighbor =
                  neighbors[secondIndex];

                const edgePair =
                  cuspTriangleEdgePair(
                    tetrahedron.id,
                    vertexIndex,
                    firstNeighbor,
                    secondNeighbor
                  );

                const sharedWithPhysicalSeam =
                  sharedCuspSeamPairId !== null &&
                  edgePair?.id ===
                    sharedCuspSeamPairId;

                /*
                 * The A and B copies of a shared seam wall
                 * coincide. Draw that wall once so its color
                 * and opacity are not doubled.
                 */
                if (
                  sharedWithPhysicalSeam &&
                  tetrahedron.id === "B"
                ) {
                  return;
                }

                /*
                 * Build each colored wall as a sequence of
                 * triangular cross-sections rather than one
                 * direct sheet.
                 *
                 * The first few sections are the unchanged
                 * straight cusp prism. The routed sections then
                 * carry the same compact edge cross-section along
                 * a 3D centerline and fit it to the curved torus
                 * edge only near the end.
                 */
                const collarColor =
                  edgePair?.color ||
                  "rgba(250, 244, 225, 0.96)";

                const acrossWeights =
                  Array.from(
                    {
                      length:
                        CUSP_MESH_DIVISIONS +
                        1,
                    },
                    (_, acrossIndex) =>
                      cuspRouteWeightsForEdge(
                        firstIndex,
                        secondIndex,
                        acrossIndex /
                          CUSP_MESH_DIVISIONS
                      )
                  );

                const localGrid =
                  acrossWeights.map(
                    (weights) =>
                      Array.from(
                        {
                          length:
                            CUSP_COLLAR_LOCAL_SEGMENTS +
                            1,
                        },
                        (_, segmentIndex) =>
                          localCollarModelPoint(
                            weights,
                            segmentIndex /
                              CUSP_COLLAR_LOCAL_SEGMENTS
                          )
                      )
                  );

                const routeGrid =
                  acrossWeights.map(
                    (weights) =>
                      Array.from(
                        {
                          length:
                            CUSP_COLLAR_ROUTE_SEGMENTS +
                            1,
                        },
                        (_, segmentIndex) =>
                          activeRoutedCuspModelPoint(
                            weights,
                            segmentIndex /
                              CUSP_COLLAR_ROUTE_SEGMENTS
                          )
                      )
                  );

                function pushCollarGridCells(
                  grid,
                  segmentCount,
                  segmentKind
                ) {
                  for (
                    let acrossIndex = 0;
                    acrossIndex <
                    CUSP_MESH_DIVISIONS;
                    acrossIndex += 1
                  ) {
                    for (
                      let segmentIndex = 0;
                      segmentIndex <
                      segmentCount;
                      segmentIndex += 1
                    ) {
                      const collarModelPoints = [
                        grid[
                          acrossIndex
                        ][segmentIndex],
                        grid[
                          acrossIndex + 1
                        ][segmentIndex],
                        grid[
                          acrossIndex + 1
                        ][segmentIndex + 1],
                        grid[
                          acrossIndex
                        ][segmentIndex + 1],
                      ];

                      const collarProjected =
                        collarModelPoints.map(
                          (point) =>
                            projectPoint(
                              point,
                              displayView
                            )
                        );

                      faces.push({
                        key:
                          `${tetrahedron.id}-cusp-collar-` +
                          `${vertexIndex}-${edgeIndex}-` +
                          `${segmentKind}-` +
                          `${acrossIndex}-${segmentIndex}`,
                        pair: null,
                        cuspCollar: true,
                        cuspBaseId,
                        cuspCollarEdgeIndex:
                          edgeIndex,
                        cuspCollarAcrossIndex:
                          acrossIndex,
                        cuspCollarSegmentIndex:
                          segmentIndex,
                        cuspCollarSegmentKind:
                          segmentKind,
                        cuspCollarAcrossDivisions:
                          CUSP_MESH_DIVISIONS,
                        cuspCollarSegmentCount:
                          segmentCount,
                        cuspCollarColor:
                          collarColor,
                        cuspCollarSharedFace:
                          sharedWithPhysicalSeam,
                        cuspCollarModelPoints:
                          collarModelPoints,
                        projected: collarProjected,
                        depth:
                          collarProjected.reduce(
                            (sum, point) =>
                              sum +
                              (point.depth || 0),
                            0
                          ) /
                          collarProjected.length,
                      });
                    }
                  }
                }

                pushCollarGridCells(
                  localGrid,
                  CUSP_COLLAR_LOCAL_SEGMENTS,
                  "local"
                );

                /*
                 * Before Meridian/Longitude begins, every routed
                 * section is collapsed onto the local outer
                 * triangle. It therefore contributes zero area.
                 * As the peripheral identification progresses,
                 * these sections open along the routed centerline.
                 */
                pushCollarGridCells(
                  routeGrid,
                  CUSP_COLLAR_ROUTE_SEGMENTS,
                  "route"
                );
              }
            );
          }

          function projectCuspWeights(weights) {
            const sourceModelPoint =
              blendTrianglePoint(
                modelPoints,
                weights
              );

            const extendedModelPoint =
              blendTrianglePoint(
                outerModelPoints,
                weights
              );

            const rawPoint =
              blendTrianglePoint(
                rawFlatPoints,
                weights
              );

            const assembledModelPoint =
              lerpPoint(
                extendedModelPoint,
                attachedCuspTargetPoint(
                  rawPoint
                ),
                cuspBoundaryAssemblyProgress
              );

            const sourcePoint =
              projectPoint(
                sourceModelPoint,
                displayView
              );

            const targetPoint =
              projectPoint(
                assembledModelPoint,
                displayView
              );

            return lerpProjectedPoint(
              sourcePoint,
              targetPoint,
              cuspAssemblyProgress
            );
          }

          /*
           * The moving cap stays neutral white. The three
           * side walls retain the colors of the large faces
           * meeting the corresponding cusp edges.
           */
          const tileFill =
            `rgba(246, 242, 228, ${
              0.18 *
              (
                1 -
                cuspBoundaryAssemblyProgress
              )
            })`;

          CUSP_MESH_CELLS.forEach(
            (cell, cellIndex) => {
              const meshProjected =
                cell.map(
                  projectCuspWeights
                );

              cuspMeshFaces.push({
                key:
                  `${tetrahedron.id}-` +
                  `${vertexIndex}-mesh-` +
                  `${cellIndex}`,
                projected: meshProjected,
                fill: tileFill,
                depth:
                  meshProjected.reduce(
                    (sum, point) =>
                      sum +
                      (point.depth || 0),
                    0
                  ) /
                  meshProjected.length,
              });
            }
          );

          const edgeVertexPairs = [
            [0, 1],
            [1, 2],
            [2, 0],
          ];

          const curvedEdges =
            edgeVertexPairs.map(
              ([startIndex, endIndex]) => {
                const firstNeighbor =
                  neighbors[startIndex];

                const secondNeighbor =
                  neighbors[endIndex];

                return {
                  color:
                    cuspTriangleEdgeColor(
                      tetrahedron.id,
                      vertexIndex,
                      firstNeighbor,
                      secondNeighbor
                    ),

                  points: Array.from(
                    {
                      length:
                        CUSP_EDGE_SAMPLES + 1,
                    },
                    (_, sampleIndex) => {
                      const amount =
                        sampleIndex /
                        CUSP_EDGE_SAMPLES;

                      const weights = [
                        0,
                        0,
                        0,
                      ];

                      weights[startIndex] =
                        1 - amount;

                      weights[endIndex] =
                        amount;

                      return projectCuspWeights(
                        weights
                      );
                    }
                  ),
                };
              }
            );

          const outlinePoints =
            curvedEdges.flatMap(
              (edge) => edge.points
            );

          cuspTriangleOutlines.push({
            key:
              `${tetrahedron.id}-` +
              `${vertexIndex}-outline`,
            edges: curvedEdges,
            depth:
              outlinePoints.reduce(
                (sum, point) =>
                  sum +
                  (point.depth || 0),
                0
              ) / outlinePoints.length,
          });
        } else {
          faces.push({
            key: `${tetrahedron.id}-cusp-${vertexIndex}`,
            pair: null,
            projected,
            depth:
              projected.reduce(
                (sum, point) =>
                  sum +
                  (point.depth || 0),
                0
              ) / projected.length,
          });
        }

        if (!showCuspTriangles) {
          labels.push({
            key: `${tetrahedron.id}-${vertexIndex}`,
            text: String(vertexIndex + 1),
            point: projectPoint(
              averagePoint(modelPoints),
              displayView
            ),
            opacity: 1,
          });
        }
      });

      /*
       * Use all twelve truncated vertices to locate
       * the current projected body of this tetrahedron.
       * The callout therefore follows the complete
       * deformed tetrahedron rather than a fixed point.
       */
      const tetrahedronProjectedPoints =
        mesh.vertices
          .map((vertex) =>
            centeredWorldPoint(
              vertex.point,
              tetrahedron
            )
          )
          .map((point) =>
            projectPoint(
              point,
              displayView
            )
          );

      callouts.push({
        key: `${tetrahedron.id}-callout`,
        ...makeTetrahedronCallout(
          tetrahedron.id,
          tetrahedronProjectedPoints
        ),
        opacity:
          showCuspTriangles
            ? 0
            : selectedPairId === null
              ? 1
              : Math.max(
                  0,
                  1 - pairingProgress * 1.4
                ),
      });
    });

    /*
     * Each ordered large-face pairing induces three
     * edge pairings among the truncation triangles.
     *
     * Color identifies the large-face pair.
     * One, two, or three ticks identify the precise
     * corresponding edge inside that face pairing.
     */
    if (showCuspTriangles) {
      FIGURE_EIGHT_FACE_PAIRS.forEach(
        (pair) => {
          [0, 1, 2].forEach(
            (localVertexIndex) => {
              const vertexA =
                pair.A[
                  localVertexIndex
                ];

              const vertexB =
                pair.B[
                  localVertexIndex
                ];

              const neighborPositions = [
                (localVertexIndex + 1) % 3,
                (localVertexIndex + 2) % 3,
              ];

              const segmentAInSpace =
                cuspSegmentForFace(
                  pair.A,
                  localVertexIndex,
                  truncatedGeometry
                    .truncationFraction
                )
                  .map((point) =>
                    centeredWorldPoint(
                      point,
                      sceneTetrahedra[0]
                    )
                  )
                  .map((point) =>
                    projectPoint(
                      point,
                      displayView
                    )
                  );

              const segmentBInSpace =
                cuspSegmentForFace(
                  pair.B,
                  localVertexIndex,
                  truncatedGeometry
                    .truncationFraction
                )
                  .map((point) =>
                    centeredWorldPoint(
                      point,
                      sceneTetrahedra[1]
                    )
                  )
                  .map((point) =>
                    projectPoint(
                      point,
                      displayView
                    )
                  );

              /*
               * These colored/ticked edges belong to the
               * attached cusp bases, so they do not travel
               * with the moving outer collar triangles.
               */
              const segmentA =
                segmentAInSpace;

              const segmentB =
                segmentBInSpace;

              cuspEdgeMatches.push({
                key:
                  `${pair.id}-` +
                  `${localVertexIndex}`,
                color: pair.color,
                mark:
                  localVertexIndex + 1,
                segments: [
                  segmentA,
                  segmentB,
                ],
              });
            }
          );
        }
      );
    }

    /*
     * Center the geometry actually visible after all
     * current deformation, projection, and interpolation.
     *
     * Model-space centering does not guarantee that the
     * projected screen-space bounds remain centered under
     * perspective. Measure the rendered geometry for this
     * exact frame and correct its vertical position.
     *
     * In cusp mode, use the cusp mesh itself. In ordinary
     * tetrahedron and face-pair modes, use all projected
     * faces of the current complex.
     */
    const centeringPoints =
      faces.flatMap(
        (face) => face.projected
      );

    const visibleSceneCenter =
      projectedBoundsCenter(
        centeringPoints
      );

    /*
     * Preserve the intentional horizontal composition
     * established by the canvas CSS. Correct only the
     * unwanted up-down drift.
     */
    const displayedSceneOffset = {
      x: 0,
      y:
        350 -
        visibleSceneCenter.y,
    };

    const shiftPoint = (point) =>
      translateProjectedPoint(
        point,
        displayedSceneOffset
      );

    if (centeringPoints.length > 0) {
      faces.forEach((face) => {
        face.projected =
          face.projected.map(
            shiftPoint
          );
      });

      labels.forEach((label) => {
        label.point =
          shiftPoint(label.point);
      });

      callouts.forEach((callout) => {
        callout.anchor =
          shiftPoint(callout.anchor);

        callout.point =
          shiftPoint(callout.point);

        callout.lineEnd =
          shiftPoint(callout.lineEnd);
      });

      cuspEdgeMatches.forEach(
        (match) => {
          match.segments =
            match.segments.map(
              (segment) =>
                segment.map(
                  shiftPoint
                )
            );
        }
      );

      cuspMeshFaces.forEach(
        (meshFace) => {
          meshFace.projected =
            meshFace.projected.map(
              shiftPoint
            );
        }
      );

      cuspTriangleOutlines.forEach(
        (outline) => {
          outline.edges =
            outline.edges.map(
              (edge) => ({
                ...edge,
                points:
                  edge.points.map(
                    shiftPoint
                  ),
              })
            );
        }
      );
    }

    const activeSolidBridgeDefinitions =
      solidBridgeDefinitions.filter(
        (definition) =>
          definition.progress >
          FACE_CONSTRAINT_EPSILON
      );

    /*
     * Face positions change on every seam-transition frame.
     * Re-running the global candidate/sweep search for each of
     * those intermediate positions blocks the browser's main
     * thread. Since animation progress is measured from wall
     * time, the next available frame then jumps far ahead.
     *
     * During this one continuous motion, preserve each bridge's
     * already selected lane and only rebuild its geometry at the
     * current face positions. The full collision audit resumes
     * after the seam reaches its endpoint.
     */
    const bridgeRouteSceneKey =
      [
        effectiveConstraintOrder.join(","),
        normalizedFacePairMappingTargets.join(
          ","
        ),
        truncatedGeometry
          .truncationFraction
          .toFixed(6),
        truncatedGeometry
          .tetrahedronSeparation
          .toFixed(6),
        pairingBridgeDefinitions
          .map(
            (definition) =>
              `${definition.pairId}:` +
              `${definition.bridgeType}`
          )
          .join(","),
      ].join("||");

    const plannedBridgeRouteSelections =
      seamTransitionInProgress
        ? activeSolidBridgeDefinitions.map(
            (definition) => {
              const preferredRouteId =
                bridgeRoutePreferenceByPairRef
                  .current[
                    definition.pairId
                  ];

              const canonicalRouteSpec =
                bridgeRouteCandidateSpecsForType(
                  definition.bridgeType
                )[0] ??
                DEFAULT_BRIDGE_ROUTE_SPEC;

              const stableRouteSpec =
                normalizeBridgeRouteSpec(
                  animatedBridgeRouteSpecs[
                    definition.pairId
                  ] ??
                    (
                      preferredRouteId ===
                      null
                        ? canonicalRouteSpec
                        : bridgeRouteSpecForId(
                            preferredRouteId
                          )
                    ),
                  canonicalRouteSpec.lane
                );

              const model =
                makeFaceIdentificationBridgeModel({
                  positions:
                    solvedWorldPositions,
                  pairing:
                    definition.pairing,
                  progress:
                    definition.progress,
                  bridgeSpanScale:
                    definition.bridgeSpanScale,
                  bridgeIndex:
                    definition.bridgeIndex,
                  routeLane:
                    stableRouteSpec.lane,
                  routeSpec:
                    stableRouteSpec,
                  mappingTurn:
                    definition.mappingTurn,
                  sceneCenter,
                });

              return {
                model,
                selectedRouteSpec:
                  stableRouteSpec,
                selectedRouteScore: null,
                candidateDiagnostics: {
                  valid: true,
                  status:
                    "seam-transition-fixed-route",
                  selectedRouteId:
                    stableRouteSpec.id,
                  selectedRouteLabel:
                    bridgeRouteDisplayLabel(
                      stableRouteSpec
                    ),
                  selectedRouteScore: null,
                  routeCandidateCount: 0,
                  validRouteCount: 1,
                  routeAttempts: [],
                },
              };
            }
          )
        : selectCollisionFreeBridgeRouteSet({
            definitions:
              activeSolidBridgeDefinitions,
            positions:
              solvedWorldPositions,
            sceneCenter,
            preferredRouteIdsByPairId:
              bridgeRoutePreferenceByPairRef
                .current,
            sweepStartRouteSpecsByPairId:
              bridgeRouteTransitionRef
                .current.startSpecs,
          });

    const plannedRouteSetComplete =
      plannedBridgeRouteSelections.length ===
        activeSolidBridgeDefinitions.length &&
      plannedBridgeRouteSelections.every(
        (selection) =>
          selection
            .candidateDiagnostics.valid &&
          selection.selectedRouteSpec !==
            null
      );

    if (plannedRouteSetComplete) {
      const routeSpecsByPairId =
        lastCompleteBridgeRouteSetRef
          .current.sceneKey ===
          bridgeRouteSceneKey
          ? [
              ...lastCompleteBridgeRouteSetRef
                .current.routeSpecsByPairId,
            ]
          : FIGURE_EIGHT_FACE_PAIRS.map(
              () => null
            );

      activeSolidBridgeDefinitions.forEach(
        (definition, definitionIndex) => {
          const selectedRouteSpec =
            plannedBridgeRouteSelections[
              definitionIndex
            ].selectedRouteSpec;

          routeSpecsByPairId[
            definition.pairId
          ] = normalizeBridgeRouteSpec(
            selectedRouteSpec,
            selectedRouteSpec.lane
          );
        }
      );

      lastCompleteBridgeRouteSetRef.current = {
        sceneKey:
          bridgeRouteSceneKey,
        routeSpecsByPairId,
      };
    }

    const retainedRouteSpecs =
      lastCompleteBridgeRouteSetRef
        .current.sceneKey ===
        bridgeRouteSceneKey
        ? lastCompleteBridgeRouteSetRef
            .current.routeSpecsByPairId
        : null;

    const retainedRouteSetComplete =
      retainedRouteSpecs !== null &&
      activeSolidBridgeDefinitions.every(
        (definition) =>
          retainedRouteSpecs[
            definition.pairId
          ] !== null
      );

    const bridgeRouteSelections =
      !seamTransitionInProgress &&
      !plannedRouteSetComplete &&
      retainedRouteSetComplete
        ? activeSolidBridgeDefinitions.map(
            (definition) => {
              const retainedRouteSpec =
                normalizeBridgeRouteSpec(
                  retainedRouteSpecs[
                    definition.pairId
                  ],
                  retainedRouteSpecs[
                    definition.pairId
                  ].lane
                );

              const model =
                makeFaceIdentificationBridgeModel({
                  positions:
                    solvedWorldPositions,
                  pairing:
                    definition.pairing,
                  progress:
                    definition.progress,
                  bridgeSpanScale:
                    definition.bridgeSpanScale,
                  bridgeIndex:
                    definition.bridgeIndex,
                  routeLane:
                    retainedRouteSpec.lane,
                  routeSpec:
                    retainedRouteSpec,
                  mappingTurn:
                    definition.routingMappingTurn ??
                    definition.mappingTurn,
                  sceneCenter,
                });

              return {
                model,
                selectedRouteSpec:
                  retainedRouteSpec,
                selectedRouteScore: null,
                candidateDiagnostics: {
                  valid: true,
                  status:
                    "retained-complete-route-set",
                  selectedRouteId:
                    retainedRouteSpec.id,
                  selectedRouteLabel:
                    bridgeRouteDisplayLabel(
                      retainedRouteSpec
                    ),
                  selectedRouteScore: null,
                  routeCandidateCount: 0,
                  validRouteCount: 1,
                  routeAttempts: [],
                },
              };
            }
          )
        : plannedBridgeRouteSelections;

    const nextBridgeRouteTargetSpecs =
      FIGURE_EIGHT_FACE_PAIRS.map(
        () => null
      );

    activeSolidBridgeDefinitions.forEach(
      (definition, definitionIndex) => {
        const routeSelection =
          bridgeRouteSelections[
            definitionIndex
          ];

        if (
          routeSelection
            .candidateDiagnostics.valid &&
          routeSelection
            .selectedRouteSpec !== null
        ) {
          nextBridgeRouteTargetSpecs[
            definition.pairId
          ] =
            routeSelection
              .selectedRouteSpec;
        }
      }
    );

    const solidBridges =
      activeSolidBridgeDefinitions.map(
        (definition, definitionIndex) => {
          const routeSelection =
            bridgeRouteSelections[
              definitionIndex
            ];

          const routedBridgeModel =
            routeSelection.model;

          const candidateDiagnostics =
            routeSelection
              .candidateDiagnostics;

          const candidateValid =
            candidateDiagnostics.valid;

          const renderSeamTransition =
            definition.seamTransitionActive;

          const candidatePending =
            !candidateValid &&
            !renderSeamTransition;

          const selectedRouteSpec =
            routeSelection
              .selectedRouteSpec;

          /*
           * Route selection is audited at the settled target
           * mapping. Once a collision-free lane is chosen,
           * rebuild that bridge with the continuously animated
           * mapping turn so the 0°/120°/240° transitions remain
           * visible instead of disappearing until the endpoint.
           */
          const displayRouteSpec =
            animatedBridgeRouteSpecs[
              definition.pairId
            ] ?? selectedRouteSpec;

          const bridgeModel =
            seamTransitionInProgress
              ? routedBridgeModel
              : (
                  candidateValid ||
                  renderSeamTransition
                ) &&
                displayRouteSpec !== null
                ? makeFaceIdentificationBridgeModel({
                    positions:
                      solvedWorldPositions,
                    pairing:
                      definition.pairing,
                    progress:
                      definition.progress,
                    bridgeSpanScale:
                      definition.bridgeSpanScale,
                    bridgeIndex:
                      definition.bridgeIndex,
                    routeLane:
                      displayRouteSpec.lane,
                    routeSpec:
                      displayRouteSpec,
                    mappingTurn:
                      definition.mappingTurn,
                    sceneCenter,
                  })
                : routedBridgeModel;

          const bridgeRenderable =
            candidateValid ||
            renderSeamTransition;

          const renderedFaces =
            bridgeRenderable
              ? bridgeModel.worldFaces.map(
                  (bridgeFace) => {
                    const projected =
                      bridgeFace.points
                        .map((point) =>
                          subtractPoint(
                            point,
                            sceneCenter
                          )
                        )
                        .map((point) =>
                          projectPoint(
                            point,
                            displayView
                          )
                        )
                        .map(shiftPoint);

                    return {
                      key: bridgeFace.key,
                      pair:
                        definition.pairing,
                      bridgeIndex:
                        definition.bridgeIndex,
                      routeLane:
                        bridgeModel.routeLane,
                      routeId:
                        bridgeModel.route?.id ??
                        bridgeModel.routeSpec?.id,
                      mappingTurn:
                        definition.mappingTurn,
                      mappingIndex:
                        definition.mappingIndex,
                      bridgeKind:
                        bridgeFace.kind,
                      bridge: true,
                      projected,
                      fillOpacity:
                        bridgeFace.fillOpacity,
                      strokeOpacity:
                        bridgeFace.strokeOpacity,
                      depth:
                        projected.reduce(
                          (sum, point) =>
                            sum +
                            (point.depth || 0),
                          0
                        ) /
                        projected.length,
                    };
                  }
                )
              : [];

          faces.push(
            ...renderedFaces
          );

          return {
            ...definition,
            routeLane:
              bridgeModel.routeLane,
            routeSpec:
              bridgeModel.routeSpec,
            selectedRouteId:
              selectedRouteSpec?.id ??
              null,
            selectedRouteLabel:
              selectedRouteSpec === null
                ? null
                : bridgeRouteDisplayLabel(
                    selectedRouteSpec
                  ),
            selectedRouteScore:
              routeSelection
                .selectedRouteScore,
            routeAttempts:
              candidateDiagnostics
                .routeAttempts ?? [],
            routeCandidateCount:
              candidateDiagnostics
                .routeCandidateCount ?? 0,
            validRouteCount:
              candidateDiagnostics
                .validRouteCount ?? 0,
            active:
              renderedFaces.length > 0,
            candidateValid,
            candidatePending,
            candidateStatus:
              candidateDiagnostics.status,
            candidateDiagnostics,
            faceCount:
              renderedFaces.length,
            faces:
              renderedFaces,
            model:
              bridgeModel,
            route:
              bridgeModel.route,
            centerline:
              bridgeModel.centerline,
            tangents:
              bridgeModel.tangents,
            sections:
              bridgeModel.sections,
            triangles:
              bridgeModel.triangles,
            worldFaces:
              bridgeModel.worldFaces,
          };
        });

    const quotientIdentifications = [];

    if (
      quotientDisplayActive &&
      orderedQuotientPairIds.length > 0
    ) {
      orderedQuotientPairIds.forEach(
        (pairId, quotientIndex) => {
          const faceA =
            faces.find(
              (face) =>
                face.meshFace?.pairId ===
                  pairId &&
                face.meshFace.id.startsWith(
                  "A-"
                )
            );

          const faceB =
            faces.find(
              (face) =>
                face.meshFace?.pairId ===
                  pairId &&
                face.meshFace.id.startsWith(
                  "B-"
                )
            );

          if (
            !faceA ||
            !faceB
          ) {
            return;
          }

          const centerA =
            averageScreenPoint(
              faceA.projected
            );

          const centerB =
            averageScreenPoint(
              faceB.projected
            );

          let directionX =
            centerB.x -
            centerA.x;

          let directionY =
            centerB.y -
            centerA.y;

          let directionLength =
            Math.hypot(
              directionX,
              directionY
            );

          if (directionLength < 1) {
            const fallbackAngle =
              Math.PI *
              (
                0.25 +
                pairId * 0.5
              );

            directionX =
              Math.cos(
                fallbackAngle
              );

            directionY =
              Math.sin(
                fallbackAngle
              );

            directionLength = 1;
          }

          const unitX =
            directionX /
            directionLength;

          const unitY =
            directionY /
            directionLength;

          const perpendicularX =
            -unitY;

          const perpendicularY =
            unitX;

          const laneOffset =
            (
              quotientIndex -
              (
                orderedQuotientPairIds
                  .length -
                1
              ) /
                2
            ) *
            QUOTIENT_FACE_LANE_PX;

          const midpoint = {
            x:
              (
                centerA.x +
                centerB.x
              ) /
                2 +
              perpendicularX *
                laneOffset,
            y:
              (
                centerA.y +
                centerB.y
              ) /
                2 +
              perpendicularY *
                laneOffset,
          };

          const targetCenterA = {
            x:
              midpoint.x -
              unitX *
                QUOTIENT_FACE_GAP_PX /
                2,
            y:
              midpoint.y -
              unitY *
                QUOTIENT_FACE_GAP_PX /
                2,
          };

          const targetCenterB = {
            x:
              midpoint.x +
              unitX *
                QUOTIENT_FACE_GAP_PX /
                2,
            y:
              midpoint.y +
              unitY *
                QUOTIENT_FACE_GAP_PX /
                2,
          };

          const offsetA = {
            x:
              targetCenterA.x -
              centerA.x,
            y:
              targetCenterA.y -
              centerA.y,
          };

          const offsetB = {
            x:
              targetCenterB.x -
              centerB.x,
            y:
              targetCenterB.y -
              centerB.y,
          };

          const projectedA =
            faceA.projected.map(
              (point) =>
                translateProjectedPoint(
                  point,
                  offsetA
                )
            );

          const projectedB =
            faceB.projected.map(
              (point) =>
                translateProjectedPoint(
                  point,
                  offsetB
                )
            );

          const connectors =
            projectedA.map(
              (start, index) => {
                const end =
                  projectedB[index];

                const curveOffset =
                  (
                    index -
                    (
                      projectedA.length -
                      1
                    ) /
                      2
                  ) *
                  2.4;

                const control = {
                  x:
                    (
                      start.x +
                      end.x
                    ) /
                      2 +
                    perpendicularX *
                      curveOffset,
                  y:
                    (
                      start.y +
                      end.y
                    ) /
                      2 +
                    perpendicularY *
                      curveOffset,
                };

                return {
                  key:
                    `${pairId}-connector-` +
                    `${index}`,
                  start,
                  end,
                  path:
                    `M ${start.x} ${start.y} ` +
                    `Q ${control.x} ${control.y} ` +
                    `${end.x} ${end.y}`,
                };
              }
            );

          quotientIdentifications.push({
            key:
              `quotient-pair-${pairId}`,
            pair:
              FIGURE_EIGHT_FACE_PAIRS[
                pairId
              ],
            projectedA,
            projectedB,
            connectors,
            symbolPoint: midpoint,
            stems: [
              {
                start: centerA,
                end:
                  targetCenterA,
              },
              {
                start: centerB,
                end:
                  targetCenterB,
              },
            ],
          });
        }
      );
    }

    const quotientPhysicalSeamCount =
      requestedFullPairMetrics.filter(
        (metric) =>
          !orderedQuotientPairIds.includes(
            metric.pairId
          ) &&
          metric.acceptedStrength >=
            metric.requestedStrength -
              0.005 &&
          metric.maximumError <=
            FACE_VALIDITY_SEAM_TOLERANCE
      ).length;

    const quotientRequestedPairCount =
      requestedFullPairMetrics.length;

    faces.sort((a, b) => {
      if (
        showCuspTriangles &&
        Boolean(a.pair) !==
          Boolean(b.pair)
      ) {
        return a.pair ? -1 : 1;
      }

      return b.depth - a.depth;
    });

    cuspMeshFaces.sort(
      (a, b) => b.depth - a.depth
    );

    cuspTriangleOutlines.sort(
      (a, b) => b.depth - a.depth
    );

    /*
     * The old detached planar-domain presentation is suppressed.
     * The next stage will join the eight moving outer triangles
     * into the torus while these base collars remain attached.
     */
    const cuspDomainOpacity = 0;

    const cuspEdgeOpacity =
      showCuspTriangles ? 1 : 0;

    const cuspGridOpacity =
      showCuspTriangles ? 0.24 : 0;

    const solidBridgeClassCounts =
      solidBridges.reduce(
        (counts, bridge) => {
          const bridgeType =
            bridge.bridgeType ??
            "pending";

          counts[bridgeType] =
            (
              counts[bridgeType] ?? 0
            ) + 1;

          return counts;
        },
        {
          "edge-adjacent": 0,
          nonadjacent: 0,
          pending: 0,
        }
      );

    return {
      faces,
      labels,
      callouts,
      cuspEdgeMatches,
      cuspDomain: {
        opacity: cuspDomainOpacity,
      },
      cuspEdgeOpacity,
      cuspGridOpacity,
      cuspMeshFaces,
      cuspTriangleOutlines,
      collisionDiagnostics,
      validityDiagnostics,
      quotientDisplayActive,
      quotientCutOpenStrength,
      quotientCutOpenValid,
      quotientUnresolvedPairIds:
        orderedQuotientPairIds,
      quotientIdentifications,
      quotientPhysicalSeamCount,
      quotientRequestedPairCount,
      physicalSeamPairId,
      physicalSeamCount:
        physicalSeamPairId === null
          ? 0
          : 1,
      pairingBridgeDefinitions,
      bridgeRouteTargetSpecs:
        nextBridgeRouteTargetSpecs,
      collapsedBridgeCount:
        pairingBridgeDefinitions.filter(
          (definition) =>
            definition.collapsed
        ).length,
      solidBridges,
      solidBridgeClassCounts,
      solidBridgeActive:
        solidBridges.some(
          (bridge) => bridge.active
        ),
      solidBridgeCount:
        solidBridges.filter(
          (bridge) => bridge.active
        ).length,
      solidBridgeCandidateCount:
        solidBridges.length,
      pendingSolidBridgeCount:
        solidBridges.filter(
          (bridge) =>
            bridge.candidatePending
        ).length,
      solidBridgeFaceCount:
        solidBridges.reduce(
          (count, bridge) =>
            count + bridge.faceCount,
          0
        ),
    };
  }, [
    view,
    selectedPairId,
    pairingProgress,
    resolvedActiveSeamPairId,
    seamPairId,
    effectiveSeamStrength,
    seamTransitionInProgress,
    showCuspTriangles,
    assembleCusp,
    cuspWrapOrder,
    cuspFirstBoundary,
    facePairStrengths,
    facePairConstraintOrder,
    facePairMappingIndices,
    animatedFacePairMappingKey,
    animatedBridgeRouteSpecs,
    preferredPlannerGuide,
    truncatedGeometry,
    cuspAssemblyProgress,
    shortWrapProgress,
    longWrapProgress,
    cuspWrapProgress,
  ]);

  const nextBridgeRouteTargetKey =
    bridgeRouteSpecArrayKey(
      rendered.bridgeRouteTargetSpecs
    );

  useEffect(() => {
    const nextTargets =
      rendered.bridgeRouteTargetSpecs.map(
        (routeSpec) =>
          routeSpec === null
            ? null
            : normalizeBridgeRouteSpec(
                routeSpec,
                routeSpec.lane
              )
      );

    bridgeRoutePreferenceByPairRef.current =
      bridgeRoutePreferenceByPairRef
        .current.map(
          (currentRouteId, pairId) => {
            const targetRoute =
              nextTargets[pairId];

            if (targetRoute !== null) {
              return targetRoute.id;
            }

            return facePairSequence.includes(
              pairId
            )
              ? currentRouteId
              : null;
          }
        );

    setBridgeRouteTargetSpecs(
      (currentTargets) =>
        bridgeRouteSpecArrayKey(
          currentTargets
        ) === nextBridgeRouteTargetKey
          ? currentTargets
          : nextTargets
    );
  }, [
    nextBridgeRouteTargetKey,
    facePairSequenceKey,
  ]);

  useEffect(() => {
    const diagnostics =
      rendered.collisionDiagnostics;

    if (
      diagnostics.plannerActive &&
      diagnostics.plannerPairId !==
        null &&
      diagnostics.plannerGuideIndex !==
        null
    ) {
      plannerGuidePreferenceRef.current = {
        pairId:
          diagnostics.plannerPairId,
        index:
          diagnostics.plannerGuideIndex,
      };

      return;
    }

    if (
      selectedPairId === null ||
      plannerGuidePreferenceRef
        .current?.pairId !==
        selectedPairId
    ) {
      plannerGuidePreferenceRef.current =
        null;
    }
  }, [
    selectedPairId,
    rendered.collisionDiagnostics
      .plannerActive,
    rendered.collisionDiagnostics
      .plannerPairId,
    rendered.collisionDiagnostics
      .plannerGuideIndex,
  ]);

  const activeSolidBridges =
    rendered.solidBridges.filter(
      (bridge) => bridge.active
    );

  const pendingSolidBridge =
    rendered.solidBridges.find(
      (bridge) =>
        bridge.candidatePending
    ) ??
    null;

  const latestSolidBridge =
    activeSolidBridges.length > 0
      ? activeSolidBridges[
          activeSolidBridges.length - 1
        ]
      : null;

  const solidBridgePair =
    latestSolidBridge?.pairing ??
    null;

  const pendingBridgePair =
    pendingSolidBridge?.pairing ??
    null;

  const statusBridgePair =
    pendingBridgePair ??
    solidBridgePair;

  const solidBridgeMapping =
    latestSolidBridge === null
      ? null
      : CYCLIC_FACE_MAPPING_CHOICES[
          latestSolidBridge
            .mappingIndex
        ];

  const solidBridgeRouteLabel =
    latestSolidBridge?.selectedRouteLabel ??
    bridgeRouteDisplayLabel(
      latestSolidBridge?.route
    );

  const pendingRouteCandidateCount =
    pendingSolidBridge
      ?.routeCandidateCount ?? 0;

  const pendingRouteUnavailable =
    pendingSolidBridge !== null &&
    [
      "no-valid-route",
      "no-sweep-clear-route",
    ].includes(
      pendingSolidBridge
        .candidateStatus
    );

  const physicalSeamSummary =
    `${rendered.physicalSeamCount} physical ` +
    `${rendered.physicalSeamCount === 1 ? "seam" : "seams"}`;

  const representedPairCount =
    rendered.pairingBridgeDefinitions
      .filter(
        (definition) =>
          definition.seamStrength >
            FACE_CONSTRAINT_EPSILON ||
          definition.progress >
            FACE_CONSTRAINT_EPSILON
      )
      .length;

  const compactStatus =
    pendingSolidBridge !== null
      ? pendingRouteUnavailable
        ? `${pendingBridgePair?.label ?? "Face-pair"} bridge route pending`
        : `Planning ${pendingBridgePair?.label ?? "face-pair"} bridge`
      : rendered.solidBridgeActive
        ? latestSolidBridge.progress >=
            SECOND_FACE_BRIDGE_FULL_STRENGTH
          ? `${solidBridgePair?.label ?? "Faces"} connected by solid bridge`
          : `Extending ${solidBridgePair?.label ?? "face-pair"} bridge`
        : facePairSequence.length === 0
          ? "Two tetrahedra — faces separate"
          : rendered
              .validityDiagnostics
              .status === "complete"
            ? "Physical face identification complete"
            : rendered
                .validityDiagnostics
                .status === "routed"
              ? rendered
                  .collisionDiagnostics
                  .plannerActive
                ? `Routing ${FIGURE_EIGHT_FACE_PAIRS[selectedPairId]?.label ?? "active faces"}`
                : `Joining ${FIGURE_EIGHT_FACE_PAIRS[selectedPairId]?.label ?? "active faces"}`
              : rendered
                  .validityDiagnostics
                  .status === "blocked"
                ? rendered
                    .quotientDisplayActive
                  ? "Cut-open quotient representation"
                  : "Face-identification route paused"
                : rendered
                    .quotientCutOpenValid
                  ? "Cut-open quotient representation"
                  : "No valid cut-open representation";

  const compactDetail =
    pendingSolidBridge !== null
      ? pendingRouteUnavailable
        ? `${physicalSeamSummary} · ${rendered.solidBridgeCount}/${rendered.solidBridgeCandidateCount} bridges displayed · ${pendingRouteCandidateCount} transition routes tested · ${facePairSequence.length}/4 pairings selected`
        : `${physicalSeamSummary} · ${rendered.solidBridgeCount} solid ${rendered.solidBridgeCount === 1 ? "bridge" : "bridges"} · candidate ${bridgeAuditStatusLabel(pendingSolidBridge.candidateStatus)} · ${facePairSequence.length}/4 pairs selected`
      : rendered.solidBridgeActive
        ? latestSolidBridge?.bridgeIndex > 0
          ? `${physicalSeamSummary} · ${rendered.solidBridgeCount} solid ${rendered.solidBridgeCount === 1 ? "bridge" : "bridges"} · route ${solidBridgeRouteLabel} · map ${solidBridgeMapping?.label ?? "0°"} · ${representedPairCount}/4 pairs represented`
          : `${physicalSeamSummary} · ${rendered.solidBridgeCount} solid ${rendered.solidBridgeCount === 1 ? "bridge" : "bridges"} · map ${solidBridgeMapping?.label ?? "0°"} · ${representedPairCount}/4 pairs represented`
        : rendered.quotientDisplayActive
          ? `${rendered.quotientPhysicalSeamCount} physical ${rendered.quotientPhysicalSeamCount === 1 ? "seam" : "seams"} · ${rendered.quotientIdentifications.length} quotient ${rendered.quotientIdentifications.length === 1 ? "link" : "links"} · ${rendered.quotientRequestedPairCount}/4 pairs represented`
          : facePairSequence.length === 0
            ? "Choose the first face-pair identification"
            : `${facePairSequence.length}/4 face pairs selected`;

  const compactAccent =
    pendingSolidBridge !== null ||
    rendered.solidBridgeActive
      ? statusBridgePair?.color ??
        "rgba(96, 222, 255, 0.96)"
      : rendered
          .validityDiagnostics
          .status === "complete"
        ? "rgba(112, 232, 166, 0.92)"
        : rendered
            .validityDiagnostics
            .status === "routed"
          ? "rgba(96, 222, 255, 0.96)"
          : rendered
              .validityDiagnostics
              .status === "blocked"
            ? "rgba(255, 176, 64, 0.94)"
            : "rgba(196, 148, 255, 0.96)";

  const compactTextAccent =
    pendingSolidBridge !== null ||
    rendered.solidBridgeActive
      ? statusBridgePair?.color ??
        "rgba(118, 226, 255, 0.98)"
      : rendered
          .validityDiagnostics
          .status === "complete"
        ? "rgba(138, 244, 186, 0.98)"
        : rendered
            .validityDiagnostics
            .status === "routed"
          ? "rgba(118, 226, 255, 0.98)"
          : rendered
              .validityDiagnostics
              .status === "blocked"
            ? "rgba(255, 188, 92, 0.98)"
            : "rgba(214, 178, 255, 0.98)";

  useEffect(() => {
    if (
      typeof onConstructionStateChange !==
      "function"
    ) {
      return;
    }

    onConstructionStateChange(
      showCuspTriangles
        ? null
        : {
            status: compactStatus,
            detail: compactDetail,
            accent: compactAccent,
            textAccent:
              compactTextAccent,
          }
    );
  }, [
    onConstructionStateChange,
    showCuspTriangles,
    compactStatus,
    compactDetail,
    compactAccent,
    compactTextAccent,
  ]);

  useEffect(() => {
    if (
      typeof onConstructionStateChange !==
      "function"
    ) {
      return undefined;
    }

    return () =>
      onConstructionStateChange(
        null
      );
  }, [
    onConstructionStateChange,
  ]);

  function handleBridgePointerDown(
    event
  ) {
    event.stopPropagation();
  }

  function handleBridgeClick(
    event,
    pairId
  ) {
    event.stopPropagation();

    if (
      typeof onPairInteraction ===
      "function"
    ) {
      onPairInteraction(pairId);
    }
  }

  return (
    <svg
      viewBox="0 0 1000 700"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={
        showCuspTriangles
          ? cuspWrapOrder.length === 2
            ? "Two truncated tetrahedra with eight attached cusp collars whose outer triangles assemble into the cusp torus"
            : cuspWrapOrder.length === 1
              ? "Two truncated tetrahedra with eight attached cusp collars whose outer triangles form the first cusp cylinder"
              : assembleCusp
                ? "Two truncated tetrahedra with their face identifications and eight attached cusp collars extending outward"
                : "Two truncated tetrahedra with their face identifications and eight attached cusp-base triangles highlighted"
          : rendered.solidBridgeActive
            ? rendered.physicalSeamCount > 0
              ? "Two truncated tetrahedra with one face pair seamed and the remaining selected pairs connected by solid bridges"
              : "Two truncated tetrahedra with every selected face pair connected by a solid bridge"
            : rendered.quotientDisplayActive
              ? "Cut-open quotient representation of unresolved face identifications between two truncated tetrahedra"
              : "Two truncated tetrahedra deforming so that a selected face pair coincides"
      }
    >
            {rendered.faces.map((face) => {
        const focused =
          selectedPairId === null ||
          facePairSequence.includes(
            face.pair?.id
          );

        const quotientUnresolved =
          rendered
            .quotientUnresolvedPairIds
            .includes(
              face.pair?.id
            );

        return (
          <polygon
            key={face.key}
            points={polygonPoints(face.projected)}
            fill={
              face.bridge
                ? face.pair.color
                : face.pair
                  ? face.pair.color
                  : showCuspTriangles
                    ? face.cuspCollar
                      ? face.cuspCollarColor
                      : "rgba(244, 240, 226, 0.34)"
                    : "none"
            }
            fillOpacity={
              face.bridge
                ? face.fillOpacity
                : face.pair
                  ? focused
                    ? quotientUnresolved
                      ? 0.2
                      : 0.48
                    : 0.12
                  : showCuspTriangles
                    ? face.cuspBase
                      ? 0.72
                      : face.cuspCollar
                        ? face.cuspCollarSharedFace
                          ? 0.34
                          : 0.28
                        : 1
                    : 1
            }
            stroke={
              face.pair
                ? face.pair.color
                : face.cuspCollar
                  ? face.cuspCollarColor
                  : "rgba(244, 240, 226, 0.92)"
            }
            strokeOpacity={
              face.bridge
                ? face.strokeOpacity
                : face.pair
                  ? focused
                    ? quotientUnresolved
                      ? 0.62
                      : 0.95
                    : 0.2
                  : showCuspTriangles
                    ? 0.95
                    : 0.2
            }
            strokeWidth={
              face.bridge
                ? face.bridgeKind ===
                    "solid-bridge-front"
                  ? 1.7
                  : 1.05
                : face.pair
                  ? focused
                    ? quotientUnresolved
                      ? 1.7
                      : 2.2
                    : 1
                  : showCuspTriangles
                    ? face.cuspCollarSharedFace
                      ? 1.9
                      : 1.55
                    : 1
            }
            strokeDasharray={
              !face.bridge &&
              !showCuspTriangles &&
              quotientUnresolved
                ? "5 4"
                : undefined
            }
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            onPointerDown={
              face.bridge &&
              typeof onPairInteraction ===
                "function"
                ? handleBridgePointerDown
                : undefined
            }
            onClick={
              face.bridge &&
              typeof onPairInteraction ===
                "function"
                ? (event) =>
                    handleBridgeClick(
                      event,
                      face.pair.id
                    )
                : undefined
            }
            style={
              face.bridge &&
              typeof onPairInteraction ===
                "function"
                ? {
                    cursor: "pointer",
                  }
                : undefined
            }
          />
        );
      })}

      {!showCuspTriangles &&
        rendered
          .quotientIdentifications
          .map((identification) => (
            <g
              key={identification.key}
              pointerEvents="none"
            >
              {identification.stems.map(
                (stem, stemIndex) => (
                  <line
                    key={
                      `stem-${stemIndex}`
                    }
                    x1={stem.start.x}
                    y1={stem.start.y}
                    x2={stem.end.x}
                    y2={stem.end.y}
                    stroke="rgba(232, 223, 200, 0.34)"
                    strokeWidth="1"
                    strokeDasharray="3 5"
                    vectorEffect="non-scaling-stroke"
                  />
                )
              )}

              <polygon
                points={polygonPoints(
                  identification.projectedA
                )}
                fill={
                  identification.pair.color
                }
                fillOpacity="0.16"
                stroke={
                  identification.pair.color
                }
                strokeOpacity="0.9"
                strokeWidth="1.7"
                strokeDasharray="5 4"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />

              <polygon
                points={polygonPoints(
                  identification.projectedB
                )}
                fill={
                  identification.pair.color
                }
                fillOpacity="0.16"
                stroke={
                  identification.pair.color
                }
                strokeOpacity="0.9"
                strokeWidth="1.7"
                strokeDasharray="5 4"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />

              {identification.connectors.map(
                (connector) => (
                  <g key={connector.key}>
                    <path
                      d={connector.path}
                      fill="none"
                      stroke={
                        identification
                          .pair.color
                      }
                      strokeOpacity="0.72"
                      strokeWidth="1.35"
                      strokeDasharray="3 3"
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                    />

                    <circle
                      cx={connector.start.x}
                      cy={connector.start.y}
                      r="2"
                      fill={
                        identification
                          .pair.color
                      }
                    />

                    <circle
                      cx={connector.end.x}
                      cy={connector.end.y}
                      r="2"
                      fill={
                        identification
                          .pair.color
                      }
                    />
                  </g>
                )
              )}

              <circle
                cx={
                  identification
                    .symbolPoint.x
                }
                cy={
                  identification
                    .symbolPoint.y
                }
                r="11"
                fill="rgba(8, 8, 8, 0.9)"
                stroke={
                  identification.pair.color
                }
                strokeWidth="1.4"
                vectorEffect="non-scaling-stroke"
              />

              <text
                x={
                  identification
                    .symbolPoint.x
                }
                y={
                  identification
                    .symbolPoint.y +
                  5
                }
                textAnchor="middle"
                fill="rgba(250, 246, 232, 0.98)"
                fontFamily="Times New Roman, serif"
                fontSize="18"
              >
                ∼
              </text>
            </g>
          ))}

      {showCuspTriangles &&
        rendered.cuspMeshFaces.map(
          (meshFace) => (
            <polygon
              key={meshFace.key}
              points={polygonPoints(
                meshFace.projected
              )}
              fill={meshFace.fill}
              stroke="rgba(248, 242, 224, 1)"
              strokeOpacity={
                rendered.cuspGridOpacity
              }
              strokeWidth="0.55"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
          )
        )}

      {showCuspTriangles &&
        rendered.cuspTriangleOutlines.map(
          (outline) => (
            <g
              key={outline.key}
              pointerEvents="none"
            >
              {outline.edges.map(
                (edge, edgeIndex) => (
                  <polyline
                    key={edgeIndex}
                    points={polygonPoints(
                      edge.points
                    )}
                    fill="none"
                    stroke={edge.color}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                )
              )}
            </g>
          )
        )}

      {showCuspTriangles && (
        <g
          opacity={
            rendered.cuspDomain.opacity
          }
          pointerEvents="none"
        >
                    <text
            x="500"
            y="126"
            textAnchor="middle"
            fill="rgba(232, 223, 200, 0.86)"
            fontFamily="Times New Roman, serif"
            fontSize="16"
          >
            cusp-torus fundamental domain
          </text>

          <text
            x="500"
            y="588"
            textAnchor="middle"
            fill="rgba(232, 223, 200, 0.7)"
            fontFamily="Times New Roman, serif"
            fontSize="13"
          >
            matching boundary paths are identified
          </text>
        </g>
      )}

      {showCuspTriangles &&
        rendered.cuspEdgeMatches.map(
          (match) => (
            <g
              key={match.key}
              opacity={
                rendered.cuspEdgeOpacity
              }
              pointerEvents="none"
            >
              {match.segments.map(
                (segment, segmentIndex) => (
                  <g
                    key={segmentIndex}
                  >
                    <line
                      x1={segment[0].x}
                      y1={segment[0].y}
                      x2={segment[1].x}
                      y2={segment[1].y}
                      stroke={match.color}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                    />

                    {tickMarksForSegment(
                      segment[0],
                      segment[1],
                      match.mark
                    ).map(
                      (tick, tickIndex) => (
                        <line
                          key={tickIndex}
                          x1={tick.x1}
                          y1={tick.y1}
                          x2={tick.x2}
                          y2={tick.y2}
                          stroke="rgba(255, 255, 255, 0.96)"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          vectorEffect="non-scaling-stroke"
                        />
                      )
                    )}
                  </g>
                )
              )}
            </g>
          )
        )}

      {rendered.labels.map((label) => (
        <text
          key={label.key}
          x={label.point.x}
          y={label.point.y + 4}
          textAnchor="middle"
          fill="rgba(232, 223, 200, 0.78)"
          fillOpacity={
            label.opacity ?? 1
          }
          fontFamily="Times New Roman, serif"
          fontSize="13"
          pointerEvents="none"
        >
          {label.text}
        </text>
      ))}

      {rendered.callouts.map((callout) => (
        <text
          key={callout.key}
          x={callout.point.x}
          y={callout.point.y + 7}
          textAnchor="middle"
          fill="rgba(245, 238, 219, 0.96)"
          fillOpacity={callout.opacity}
          stroke="rgba(10, 9, 8, 0.88)"
          strokeOpacity={callout.opacity}
          strokeWidth="4"
          paintOrder="stroke"
          fontFamily="Times New Roman, serif"
          fontSize="24"
          fontStyle="italic"
          pointerEvents="none"
        >
          {callout.text}
        </text>
      ))}
      {!showCuspTriangles &&
        process.env.NODE_ENV ===
          "development" &&
        showDeveloperDiagnostics && (
          <g pointerEvents="none">
            <rect
              x={DEVELOPER_DIAGNOSTICS_RIGHT_X}
              y={DEVELOPER_DIAGNOSTICS_BOTTOM_Y}
              width="430"
              height="76"
              rx="6"
              fill="rgba(8, 8, 8, 0.82)"
              stroke={compactAccent}
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />

            <text
              x={DEVELOPER_DIAGNOSTICS_RIGHT_X + 12}
              y={DEVELOPER_DIAGNOSTICS_BOTTOM_Y + 21}
              fill={compactTextAccent}
              fontFamily="Times New Roman, serif"
              fontSize="13"
            >
              {rendered
                .validityDiagnostics
                .status ===
                "complete"
                ? "embedding state: complete"
                : rendered
                    .validityDiagnostics
                    .status ===
                    "routed"
                  ? rendered
                      .collisionDiagnostics
                      .plannerActive
                    ? "embedding state: routed — directional planner active"
                    : "embedding state: routed — identification in progress"
                  : rendered
                      .validityDiagnostics
                      .status ===
                      "blocked"
                    ? rendered
                        .quotientDisplayActive
                      ? `embedding state: blocked — cut-open ${FIGURE_EIGHT_FACE_PAIRS[rendered.collisionDiagnostics.blockedPairId]?.label ?? "active face"}`
                      : `embedding state: blocked — ${FIGURE_EIGHT_FACE_PAIRS[rendered.collisionDiagnostics.blockedPairId]?.label ?? "active face"}`
                    : rendered
                        .quotientCutOpenValid
                      ? "quotient state: cut-open completion"
                      : "quotient state: no valid cut-open display state"}
            </text>

            <text
              x={DEVELOPER_DIAGNOSTICS_RIGHT_X + 12}
              y={DEVELOPER_DIAGNOSTICS_BOTTOM_Y + 41}
              fill="rgba(232, 223, 200, 0.76)"
              fontFamily="Times New Roman, serif"
              fontSize="12"
            >
              {`seam max ${rendered.validityDiagnostics.maximumSeamError.toFixed(2)} · clearance ${rendered.validityDiagnostics.minimumClearance === null ? "—" : rendered.validityDiagnostics.minimumClearance.toFixed(2)} · edge ${Math.round(rendered.validityDiagnostics.maximumEdgeDistortion * 100)}%`}
            </text>

            <text
              x={DEVELOPER_DIAGNOSTICS_RIGHT_X + 12}
              y={DEVELOPER_DIAGNOSTICS_BOTTOM_Y + 61}
              fill="rgba(232, 223, 200, 0.62)"
              fontFamily="Times New Roman, serif"
              fontSize="12"
            >
              {rendered
                .quotientDisplayActive
                ? `physical seams ${rendered.quotientPhysicalSeamCount} · quotient links ${rendered.quotientIdentifications.length} · abstract pairs ${rendered.quotientRequestedPairCount}/4 · cut-open ${rendered.quotientCutOpenStrength === null ? "—" : `${Math.round(rendered.quotientCutOpenStrength * 100)}%`}`
                : rendered
                    .collisionDiagnostics
                    .blockedPairId !== null
                  ? `accepted ${Math.round((rendered.collisionDiagnostics.acceptedStrength ?? 0) * 100)}% of ${Math.round((rendered.collisionDiagnostics.requestedStrength ?? 0) * 100)}% · routes ${rendered.collisionDiagnostics.blockedPlannerValidCandidateCount}/${rendered.collisionDiagnostics.blockedPlannerCandidateCount} · residual ${rendered.validityDiagnostics.solverResidual.toFixed(3)}`
                  : `area ${rendered.validityDiagnostics.minimumTriangleAreaRatio.toFixed(2)}–${rendered.validityDiagnostics.maximumTriangleAreaRatio.toFixed(2)} · residual ${rendered.validityDiagnostics.solverResidual.toFixed(3)} · inverted ${rendered.validityDiagnostics.invertedTriangleCount}`}
            </text>
          </g>
        )}

    </svg>
  );
}
