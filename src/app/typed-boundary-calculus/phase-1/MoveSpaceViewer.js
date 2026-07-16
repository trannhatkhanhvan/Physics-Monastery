"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

const AXES = [
  {
    key: "t",
    label: "t",
    name: "time",
    controllerLabel: "time",
    color: "#ff3030",
    vector: { x: 1, y: 0, z: 0 },
  },
  {
    key: "l",
    label: "l",
    name: "length",
    controllerLabel: "length",
    color: "#ffe600",
    vector: { x: 0, y: 1, z: 0 },
  },
  {
    key: "q",
    label: "q",
    name: "charge",
    controllerLabel: "charge",
    color: "#2f8cff",
    vector: { x: 0, y: 0, z: 1 },
  },
  {
    key: "T",
    label: "T",
    name: "temperature",
    controllerLabel: "temp",
    color: "#00ff66",
    vector: { x: -0.5773502692, y: 0.5773502692, z: 0.5773502692 },
  },
  {
    key: "m",
    label: "m",
    name: "mass",
    controllerLabel: "mass",
    color: "#ff4dff",
    vector: { x: 0.5773502692, y: -0.5773502692, z: 0.5773502692 },
  },
  {
    key: "n",
    label: "n",
    name: "amount / count",
    controllerLabel: "amount",
    color: "#00fff0",
    vector: { x: 0.5773502692, y: 0.5773502692, z: -0.5773502692 },
  },
];

const ZERO = [0, 0, 0, 0, 0, 0];

const COMPOSITE_DIMENSIONS = [
  { id: "frequency", name: "Frequency", unit: "Hz", address: [-1, 0, 0, 0, 0, 0] },
  { id: "velocity", name: "Velocity", unit: "m/s", address: [-1, 1, 0, 0, 0, 0] },
  { id: "acceleration", name: "Acceleration", unit: "m/s²", address: [-2, 1, 0, 0, 0, 0] },
  { id: "momentum", name: "Momentum", unit: "kg·m/s", address: [-1, 1, 0, 0, 1, 0] },
  { id: "newton", name: "Force", unit: "N", address: [-2, 1, 0, 0, 1, 0] },
  { id: "joule", name: "Energy", unit: "J", address: [-2, 2, 0, 0, 1, 0] },
  { id: "watt", name: "Power", unit: "W", address: [-3, 2, 0, 0, 1, 0] },
  { id: "pascal", name: "Pressure", unit: "Pa", address: [-2, -1, 0, 0, 1, 0] },
  { id: "density", name: "Density", unit: "kg/m³", address: [0, -3, 0, 0, 1, 0] },
  { id: "action", name: "Action", unit: "J·s", address: [-1, 2, 0, 0, 1, 0] },
  { id: "voltage", name: "Electric potential", unit: "V", address: [-2, 2, -1, 0, 1, 0] },
  { id: "electric-field", name: "Electric field", unit: "V/m", address: [-2, 1, -1, 0, 1, 0] },
  { id: "resistance", name: "Resistance", unit: "Ω", address: [-1, 2, -2, 0, 1, 0] },
  { id: "conductance", name: "Conductance", unit: "S", address: [1, -2, 2, 0, -1, 0] },
  { id: "capacitance", name: "Capacitance", unit: "F", address: [2, -2, 2, 0, -1, 0] },
  { id: "magnetic-flux", name: "Magnetic flux", unit: "Wb", address: [-1, 2, -1, 0, 1, 0] },
  { id: "magnetic-flux-density", name: "Magnetic flux density", unit: "T", address: [-1, 0, -1, 0, 1, 0] },
  { id: "inductance", name: "Inductance", unit: "H", address: [0, 2, -2, 0, 1, 0] },
  { id: "entropy", name: "Entropy", unit: "J/K", address: [-2, 2, 0, -1, 1, 0] },
  { id: "molar-energy", name: "Molar energy", unit: "J/mol", address: [-2, 2, 0, 0, 1, -1] },
  { id: "molar-entropy", name: "Molar entropy", unit: "J/(mol·K)", address: [-2, 2, 0, -1, 1, -1] },
];

const SWAP_DRAW_MS = 110;
const SWAP_ROTATE_MS = 440;

const VIEWBOX = {
  width: 860,
  height: 560,
  cx: 430,
  cy: 280,
  unit: 58,
  axisHalfLength: 5.1,
};

const DEFAULT_CENTER = {
  x: VIEWBOX.cx,
  y: VIEWBOX.cy,
};

const DEFAULT_VIEW = {
  yaw: -26,
  pitch: 18,
  roll: 0,
  zoom: 0.8,
};

const IDENTITY_ORIENTATION = {
  i: { x: 1, y: 0, z: 0 },
  j: { x: 0, y: 1, z: 0 },
  k: { x: 0, y: 0, z: 1 },
};

function makeIdentityOrientation() {
  return {
    i: { ...IDENTITY_ORIENTATION.i },
    j: { ...IDENTITY_ORIENTATION.j },
    k: { ...IDENTITY_ORIENTATION.k },
  };
}

function dot3D(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross3D(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function normalize3D(point) {
  const length = Math.hypot(point.x, point.y, point.z);

  if (length === 0) {
    return { x: 1, y: 0, z: 0 };
  }

  return {
    x: point.x / length,
    y: point.y / length,
    z: point.z / length,
  };
}

function rotatePointAroundAxis(point, axis, angle) {
  const unit = normalize3D(axis);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dot = dot3D(point, unit);
  const cross = cross3D(unit, point);

  return {
    x: point.x * cos + cross.x * sin + unit.x * dot * (1 - cos),
    y: point.y * cos + cross.y * sin + unit.y * dot * (1 - cos),
    z: point.z * cos + cross.z * sin + unit.z * dot * (1 - cos),
  };
}

function applyOrientation(point, orientation) {
  return {
    x: point.x * orientation.i.x + point.y * orientation.j.x + point.z * orientation.k.x,
    y: point.x * orientation.i.y + point.y * orientation.j.y + point.z * orientation.k.y,
    z: point.x * orientation.i.z + point.y * orientation.j.z + point.z * orientation.k.z,
  };
}

function rotateOrientationAroundWorldAxis(orientation, axis, angle) {
  return {
    i: rotatePointAroundAxis(orientation.i, axis, angle),
    j: rotatePointAroundAxis(orientation.j, axis, angle),
    k: rotatePointAroundAxis(orientation.k, axis, angle),
  };
}

function rotateOrientationAboutModelAxis(orientation, modelAxis, angle) {
  const currentAxis = normalize3D(applyOrientation(modelAxis, orientation));
  return rotateOrientationAroundWorldAxis(orientation, currentAxis, angle);
}

function makeOrientationAligningAxisRight(modelAxis) {
  const source = normalize3D(modelAxis);
  const target = { x: 1, y: 0, z: 0 };
  const cross = cross3D(source, target);
  const crossLength = Math.hypot(cross.x, cross.y, cross.z);
  const dot = Math.max(-1, Math.min(1, dot3D(source, target)));

  if (crossLength < 1e-10) {
    if (dot > 0) return makeIdentityOrientation();

    return rotateOrientationAroundWorldAxis(
      makeIdentityOrientation(),
      { x: 0, y: 1, z: 0 },
      Math.PI
    );
  }

  const axis = {
    x: cross.x / crossLength,
    y: cross.y / crossLength,
    z: cross.z / crossLength,
  };

  return rotateOrientationAroundWorldAxis(
    makeIdentityOrientation(),
    axis,
    Math.acos(dot)
  );
}

function scaled3D(vector, scale) {
  return {
    x: vector.x * scale,
    y: vector.y * scale,
    z: vector.z * scale,
  };
}

function makeOrientationLookingDownAddress(address) {
  const modelNet = typeToPoint3D(address);
  const netLength = Math.hypot(modelNet.x, modelNet.y, modelNet.z);

  if (netLength < 1e-10) return null;

  const source = normalize3D(modelNet);
  const target = { x: 0, y: 0, z: 1 };
  const cross = cross3D(source, target);
  const crossLength = Math.hypot(cross.x, cross.y, cross.z);
  const dot = Math.max(-1, Math.min(1, dot3D(source, target)));

  let orientation;

  if (crossLength < 1e-10) {
    orientation =
      dot > 0
        ? makeIdentityOrientation()
        : rotateOrientationAroundWorldAxis(
            makeIdentityOrientation(),
            { x: 0, y: 1, z: 0 },
            Math.PI
          );
  } else {
    orientation = rotateOrientationAroundWorldAxis(
      makeIdentityOrientation(),
      {
        x: cross.x / crossLength,
        y: cross.y / crossLength,
        z: cross.z / crossLength,
      },
      Math.acos(dot)
    );
  }

  const preferredAxisIndex = address.findIndex((value) => value !== 0);
  const preferredReference =
    preferredAxisIndex >= 0
      ? scaled3D(AXES[preferredAxisIndex].vector, Math.sign(address[preferredAxisIndex]))
      : AXES[0].vector;

  let reference = applyOrientation(preferredReference, orientation);
  let referenceScreenLength = Math.hypot(reference.x, reference.y);

  if (referenceScreenLength < 1e-8) {
    reference = AXES.map((axis) => applyOrientation(axis.vector, orientation)).sort(
      (a, b) => Math.hypot(b.x, b.y) - Math.hypot(a.x, a.y)
    )[0];

    referenceScreenLength = Math.hypot(reference.x, reference.y);
  }

  if (referenceScreenLength < 1e-8) return orientation;

  return rotateOrientationAroundWorldAxis(
    orientation,
    { x: 0, y: 0, z: 1 },
    -Math.atan2(reference.y, reference.x)
  );
}


function radians(degrees) {
  return (degrees * Math.PI) / 180;
}

function vectorKey(vector) {
  return vector.join(",");
}

function formatAddress(vector) {
  return `(${vector.join(", ")})`;
}

function addStep(vector, axisIndex, sign) {
  const next = [...vector];
  next[axisIndex] += sign;
  return next;
}

function wordFromAddress(address) {
  return address.flatMap((value, axisIndex) => {
    const sign = value >= 0 ? 1 : -1;

    return Array.from({ length: Math.abs(value) }, () => ({
      axisIndex,
      sign,
    }));
  });
}

function moveCode(move) {
  return move.axisIndex * 2 + (move.sign > 0 ? 1 : 0);
}

function moveFromCode(code) {
  return {
    axisIndex: Math.floor(code / 2),
    sign: code % 2 === 1 ? 1 : -1,
  };
}

function nextMoveWordOrdering(word) {
  if (word.length <= 1) return word;

  const codes = word.map(moveCode);
  let pivot = codes.length - 2;

  while (pivot >= 0 && codes[pivot] >= codes[pivot + 1]) {
    pivot -= 1;
  }

  if (pivot < 0) {
    return [...codes].sort((a, b) => a - b).map(moveFromCode);
  }

  let successor = codes.length - 1;

  while (codes[successor] <= codes[pivot]) {
    successor -= 1;
  }

  [codes[pivot], codes[successor]] = [codes[successor], codes[pivot]];

  const prefix = codes.slice(0, pivot + 1);
  const suffix = codes.slice(pivot + 1).reverse();

  return [...prefix, ...suffix].map(moveFromCode);
}

function factorial(value) {
  let product = 1;

  for (let factor = 2; factor <= value; factor += 1) {
    product *= factor;
  }

  return product;
}

function moveCodeCounts(word) {
  const counts = new Map();

  word.forEach((move) => {
    const code = moveCode(move);
    counts.set(code, (counts.get(code) || 0) + 1);
  });

  return counts;
}

function orderingCountFromCounts(counts) {
  const total = Array.from(counts.values()).reduce((sum, count) => sum + count, 0);
  const denominator = Array.from(counts.values()).reduce(
    (product, count) => product * factorial(count),
    1
  );

  return Math.round(factorial(total) / denominator);
}

function uniqueMoveOrderingCount(word) {
  return orderingCountFromCounts(moveCodeCounts(word));
}

function moveWordOrderNumber(word) {
  if (word.length === 0) return 0;

  const codes = word.map(moveCode);
  const counts = moveCodeCounts(word);
  const sortedCodes = Array.from(counts.keys()).sort((a, b) => a - b);

  let rank = 0;

  codes.forEach((currentCode) => {
    sortedCodes.forEach((code) => {
      if (code >= currentCode) return;

      const count = counts.get(code) || 0;
      if (count <= 0) return;

      counts.set(code, count - 1);
      rank += orderingCountFromCounts(counts);
      counts.set(code, count);
    });

    counts.set(currentCode, (counts.get(currentCode) || 0) - 1);
  });

  return rank + 1;
}

function applyMoveWord(vector, word) {
  return word.reduce(
    (current, move) => addStep(current, move.axisIndex, move.sign),
    [...vector]
  );
}

function supportGraphFromWord(word) {
  const typeMap = new Map();

  word.forEach((move) => {
    const key = `${move.axisIndex}:${move.sign}`;
    const existing = typeMap.get(key);

    if (existing) {
      existing.count += 1;
    } else {
      typeMap.set(key, {
        key,
        axisIndex: move.axisIndex,
        sign: move.sign,
        count: 1,
      });
    }
  });

  const moveTypes = Array.from(typeMap.values()).sort((a, b) => {
    if (a.axisIndex !== b.axisIndex) return a.axisIndex - b.axisIndex;
    return a.sign - b.sign;
  });

  const combos = [];
  const vertices = new Map();

  function addressFromUsage(usage) {
    const address = [...ZERO];

    usage.forEach((usedCount, index) => {
      const moveType = moveTypes[index];
      address[moveType.axisIndex] += moveType.sign * usedCount;
    });

    return address;
  }

  function walk(index, usage) {
    if (index === moveTypes.length) {
      const address = addressFromUsage(usage);
      const key = vectorKey(address);

      combos.push({
        usage: [...usage],
        address,
        key,
      });

      vertices.set(key, address);
      return;
    }

    for (let count = 0; count <= moveTypes[index].count; count += 1) {
      usage[index] = count;
      walk(index + 1, usage);
    }
  }

  walk(0, Array.from({ length: moveTypes.length }, () => 0));

  const comboByUsage = new Map(
    combos.map((combo) => [combo.usage.join("|"), combo])
  );

  const edges = new Map();

  combos.forEach((combo) => {
    moveTypes.forEach((moveType, moveTypeIndex) => {
      if (combo.usage[moveTypeIndex] >= moveType.count) return;

      const nextUsage = [...combo.usage];
      nextUsage[moveTypeIndex] += 1;

      const nextCombo = comboByUsage.get(nextUsage.join("|"));
      if (!nextCombo) return;

      const edgeKey = `${combo.key}->${nextCombo.key}:${moveType.key}`;

      edges.set(edgeKey, {
        key: edgeKey,
        axisIndex: moveType.axisIndex,
        sign: moveType.sign,
        startVector: combo.address,
        endVector: nextCombo.address,
      });
    });
  });

  return {
    vertices: Array.from(vertices.entries()).map(([key, vector]) => ({
      key,
      vector,
    })),
    edges: Array.from(edges.values()),
  };
}

function typeToPoint3D(vector) {
  return vector.reduce(
    (point, value, index) => {
      const axis = AXES[index].vector;

      return {
        x: point.x + value * axis.x,
        y: point.y + value * axis.y,
        z: point.z + value * axis.z,
      };
    },
    { x: 0, y: 0, z: 0 }
  );
}

function rotate3D(point, view) {
  const yaw = radians(view.yaw);
  const pitch = radians(view.pitch);
  const roll = radians(view.roll);

  const yawCos = Math.cos(yaw);
  const yawSin = Math.sin(yaw);

  let x = point.x * yawCos + point.z * yawSin;
  let y = point.y;
  let z = -point.x * yawSin + point.z * yawCos;

  const pitchCos = Math.cos(pitch);
  const pitchSin = Math.sin(pitch);

  const y2 = y * pitchCos - z * pitchSin;
  const z2 = y * pitchSin + z * pitchCos;

  y = y2;
  z = z2;

  const rollCos = Math.cos(roll);
  const rollSin = Math.sin(roll);

  const x2 = x * rollCos - y * rollSin;
  const y3 = x * rollSin + y * rollCos;

  return {
    x: x2,
    y: y3,
    z,
  };
}

function getProjectionCenter(view) {
  return view.center || DEFAULT_CENTER;
}

function projectVector(vector, view) {
  const rotated = applyOrientation(typeToPoint3D(vector), view.orientation);
  const scale = VIEWBOX.unit * view.zoom;
  const center = getProjectionCenter(view);

  return {
    x: center.x + rotated.x * scale,
    y: center.y - rotated.y * scale,
    depth: rotated.z,
  };
}

function projectPoint3D(point, view) {
  const rotated = applyOrientation(point, view.orientation);
  const scale = VIEWBOX.unit * view.zoom;
  const center = getProjectionCenter(view);

  return {
    x: center.x + rotated.x * scale,
    y: center.y - rotated.y * scale,
    depth: rotated.z,
  };
}

function midpoint(a, b) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

function distance2D(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpPoint(a, b, t) {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
  };
}

function rotatePointAround(point, center, angle) {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  const c = Math.cos(angle);
  const s = Math.sin(angle);

  return {
    x: center.x + dx * c - dy * s,
    y: center.y + dx * s + dy * c,
  };
}

function makeSwapVisual(segment, progress) {
  const center = midpoint(segment.start, segment.end);
  const radius = distance2D(segment.start, segment.end) / 2;

  if (progress.phase === "draw") {
    const head = lerpPoint(segment.start, segment.end, progress.t);

    return {
      phase: "draw",
      center,
      radius,
      lineStart: segment.start,
      lineEnd: head,
      sourceDot: segment.start,
      targetDot: head,
      showOrbit: false,
    };
  }

  const t = progress.phase === "rotate" ? progress.t : 0;
  const angle = Math.PI * t;

  return {
    phase: "rotate",
    center,
    radius,
    lineStart: rotatePointAround(segment.start, center, angle),
    lineEnd: rotatePointAround(segment.end, center, angle),
    sourceDot: rotatePointAround(segment.start, center, angle),
    targetDot: rotatePointAround(segment.end, center, angle),
    showOrbit: true,
  };
}

function buildSegments(vertices, view) {
  return vertices.slice(1).map((vertex, index) => {
    const previous = vertices[index];

    return {
      key: vertex.id,
      startVector: previous.vector,
      endVector: vertex.vector,
      axisIndex: vertex.move.axisIndex,
      sign: vertex.move.sign,
      start: projectVector(previous.vector, view),
      end: projectVector(vertex.vector, view),
    };
  });
}

function uniqueVisitedVertices(vertices, view) {
  const map = new Map();

  vertices.forEach((vertex) => {
    map.set(vectorKey(vertex.vector), vertex.vector);
  });

  return Array.from(map.entries()).map(([key, vector]) => ({
    key,
    vector,
    point: projectVector(vector, view),
  }));
}

function lastMoveLabel(segment) {
  if (!segment) return "none";
  const axis = AXES[segment.axisIndex];
  return `${segment.sign > 0 ? "+" : "−"}${axis.label}`;
}

export default function MoveSpaceViewer() {
  const [vertices, setVertices] = useState([{ id: 0, vector: ZERO, move: null }]);
  const [view, setView] = useState({
    ...DEFAULT_VIEW,
    center: DEFAULT_CENTER,
    orientation: makeOrientationAligningAxisRight(AXES[0].vector),
  });
  const [selectedAxisIndex, setSelectedAxisIndex] = useState(0);
  const [axisVisibility, setAxisVisibility] = useState(() =>
    AXES.reduce((visibility, axis) => ({ ...visibility, [axis.key]: true }), {})
  );
  const [showNetArrow, setShowNetArrow] = useState(true);
  const [lockNetArrowView, setLockNetArrowView] = useState(false);
  const [showSupportGraph, setShowSupportGraph] = useState(false);
  const [selectedCompositeId, setSelectedCompositeId] = useState(null);
  const [currentOrderingWord, setCurrentOrderingWord] = useState([]);
  const [animationRun, setAnimationRun] = useState(0);
  const [pendingSwap, setPendingSwap] = useState(null);
  const [repeatQueue, setRepeatQueue] = useState([]);
  const [netArrowHold, setNetArrowHold] = useState(null);
  const [netArrowExtension, setNetArrowExtension] = useState(null);
  const [swapProgress, setSwapProgress] = useState({ phase: "idle", t: 0 });
  const swapAnimationRef = useRef(null);
  const dragRef = useRef(null);
  const svgRef = useRef(null);
  const controllerRef = useRef(null);

  useEffect(() => {
    function updateProjectionCenter() {
      const svg = svgRef.current;
      const controller = controllerRef.current;

      if (!svg) return;

      const svgRect = svg.getBoundingClientRect();
      const controllerRect = controller?.getBoundingClientRect();

      const rightPaddingPx = 24;
      const controllerReservedPx = controllerRect
        ? Math.max(0, svgRect.right - controllerRect.left + rightPaddingPx)
        : 0;

      const viewBoxUnitsPerPixel = VIEWBOX.width / Math.max(1, svgRect.width);
      const controllerReservedViewBoxUnits =
        controllerReservedPx * viewBoxUnitsPerPixel;

      const nextCenter = {
        x: (VIEWBOX.width - controllerReservedViewBoxUnits) / 2,
        y: VIEWBOX.height / 2,
      };

      setView((current) => {
        const previous = current.center || DEFAULT_CENTER;

        if (
          Math.abs(previous.x - nextCenter.x) < 0.5 &&
          Math.abs(previous.y - nextCenter.y) < 0.5
        ) {
          return current;
        }

        return {
          ...current,
          center: nextCenter,
        };
      });
    }

    updateProjectionCenter();

    window.addEventListener("resize", updateProjectionCenter);

    let resizeObserver = null;

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(updateProjectionCenter);

      if (svgRef.current) resizeObserver.observe(svgRef.current);
      if (controllerRef.current) resizeObserver.observe(controllerRef.current);
    }

    return () => {
      window.removeEventListener("resize", updateProjectionCenter);
      resizeObserver?.disconnect();
    };
  }, []);

  const currentVertex = vertices[vertices.length - 1];
  const currentAddress = currentVertex.vector;

  const netVector = useMemo(
    () => currentAddress.map((value, index) => value - vertices[0].vector[index]),
    [currentAddress, vertices]
  );

  const moveWord = useMemo(
    () =>
      vertices
        .slice(1)
        .map((vertex) => vertex.move)
        .filter(Boolean)
        .map((move) => ({
          axisIndex: move.axisIndex,
          sign: move.sign,
        })),
    [vertices]
  );

  const activeMoveWord = useMemo(() => {
    const pendingMove = pendingSwap
      ? [{ axisIndex: pendingSwap.axisIndex, sign: pendingSwap.sign }]
      : [];

    return [...moveWord, ...pendingMove, ...repeatQueue];
  }, [moveWord, pendingSwap, repeatQueue]);

  const orderableMoveWord = useMemo(
    () => (currentOrderingWord.length > 0 ? currentOrderingWord : activeMoveWord),
    [currentOrderingWord, activeMoveWord]
  );

  const selectedComposite = useMemo(
    () =>
      COMPOSITE_DIMENSIONS.find((item) => item.id === selectedCompositeId) || null,
    [selectedCompositeId]
  );

  const activeTargetVector = useMemo(
    () =>
      selectedComposite
        ? selectedComposite.address
        : applyMoveWord(ZERO, orderableMoveWord),
    [selectedComposite, orderableMoveWord]
  );

  const activeTargetLabel = selectedComposite
    ? `${selectedComposite.name}: ${selectedComposite.unit}`
    : activeMoveWord.length === 0
      ? "None selected"
      : "Custom path";

  const lookDownNetAddress = selectedComposite ? selectedComposite.address : netVector;
  const canLookDownNet = lookDownNetAddress.some((value) => value !== 0);

  const orderStats = useMemo(() => {
    if (orderableMoveWord.length === 0) {
      return { current: 0, total: 0 };
    }

    return {
      current: moveWordOrderNumber(orderableMoveWord),
      total: uniqueMoveOrderingCount(orderableMoveWord),
    };
  }, [orderableMoveWord]);

  const supportStats = useMemo(() => {
    if (orderableMoveWord.length === 0) {
      return { vertices: 0, edges: 0 };
    }

    const graph = supportGraphFromWord(orderableMoveWord);

    return {
      vertices: graph.vertices.length,
      edges: graph.edges.length,
    };
  }, [orderableMoveWord]);

  const segments = useMemo(() => buildSegments(vertices, view), [vertices, view]);
  const visitedVertices = useMemo(() => uniqueVisitedVertices(vertices, view), [vertices, view]);
  const pendingSegment = pendingSwap
    ? {
        key: pendingSwap.id,
        startVector: pendingSwap.startVector,
        endVector: pendingSwap.endVector,
        axisIndex: pendingSwap.axisIndex,
        sign: pendingSwap.sign,
        start: projectVector(pendingSwap.startVector, view),
        end: projectVector(pendingSwap.endVector, view),
      }
    : null;

  const swapVisual = pendingSegment ? makeSwapVisual(pendingSegment, swapProgress) : null;

  const netArrow = useMemo(() => {
    if (!showNetArrow) return null;
    if (vertices.length <= 1) return null;

    const startVector = vertices[0].vector;
    const endVector = netArrowHold ? netArrowHold.baseEndVector : currentAddress;

    if (vectorKey(startVector) === vectorKey(endVector)) return null;

    return {
      start: projectVector(startVector, view),
      end: projectVector(endVector, view),
    };
  }, [showNetArrow, vertices, currentAddress, view, netArrowHold]);

  const netArrowExtensionVisual = useMemo(() => {
    if (!showNetArrow) return null;
    if (!netArrowExtension) return null;

    return {
      id: netArrowExtension.id,
      start: projectVector(netArrowExtension.startVector, view),
      end: projectVector(netArrowExtension.endVector, view),
    };
  }, [showNetArrow, netArrowExtension, view]);

  const supportGraph = useMemo(() => {
    if (!showSupportGraph) {
      return { vertices: [], edges: [] };
    }

    if (orderableMoveWord.length === 0) {
      return { vertices: [], edges: [] };
    }

    const graph = supportGraphFromWord(orderableMoveWord);

    return {
      vertices: graph.vertices.map((vertex) => ({
        ...vertex,
        point: projectVector(vertex.vector, view),
      })),
      edges: graph.edges.map((edge) => ({
        ...edge,
        start: projectVector(edge.startVector, view),
        end: projectVector(edge.endVector, view),
      })),
    };
  }, [showSupportGraph, orderableMoveWord, view]);

  useEffect(() => {
    if (!pendingSwap) {
      setSwapProgress({ phase: "idle", t: 0 });
      return undefined;
    }

    let cancelled = false;
    const startedAt = window.performance.now();

    function tick(now) {
      if (cancelled) return;

      const elapsed = now - startedAt;

      if (elapsed <= SWAP_DRAW_MS) {
        setSwapProgress({
          phase: "draw",
          t: Math.min(1, elapsed / SWAP_DRAW_MS),
        });

        swapAnimationRef.current = window.requestAnimationFrame(tick);
        return;
      }

      if (elapsed <= SWAP_DRAW_MS + SWAP_ROTATE_MS) {
        setSwapProgress({
          phase: "rotate",
          t: Math.min(1, (elapsed - SWAP_DRAW_MS) / SWAP_ROTATE_MS),
        });

        swapAnimationRef.current = window.requestAnimationFrame(tick);
        return;
      }

      setVertices((current) => [
        ...current,
        {
          id: current.length,
          vector: pendingSwap.endVector,
          move: {
            axisIndex: pendingSwap.axisIndex,
            sign: pendingSwap.sign,
          },
        },
      ]);

      setSwapProgress({ phase: "idle", t: 0 });
      setPendingSwap(null);
    }

    setSwapProgress({ phase: "draw", t: 0 });
    swapAnimationRef.current = window.requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      if (swapAnimationRef.current) {
        window.cancelAnimationFrame(swapAnimationRef.current);
      }
    };
  }, [pendingSwap]);

  useEffect(() => {
    if (pendingSwap) return;
    if (repeatQueue.length === 0) return;

    const [nextMove, ...remainingMoves] = repeatQueue;

    setRepeatQueue(remainingMoves);
    beginPendingStep(nextMove.axisIndex, nextMove.sign);
  }, [repeatQueue, pendingSwap, currentAddress]);

  function beginPendingStep(axisIndex, sign) {
    const startVector = [...currentAddress];
    const endVector = addStep(startVector, axisIndex, sign);

    setPendingSwap({
      id: `${Date.now()}-${animationRun + 1}`,
      axisIndex,
      sign,
      startVector,
      endVector,
    });

    setAnimationRun((run) => run + 1);
  }

  function step(axisIndex, sign) {
    if (pendingSwap) return;

    setSelectedCompositeId(null);
    setCurrentOrderingWord([]);
    setRepeatQueue([]);
    setNetArrowHold(null);
    setNetArrowExtension(null);
    beginPendingStep(axisIndex, sign);
  }

  useEffect(() => {
    if (!netArrowHold) return undefined;
    if (pendingSwap) return undefined;
    if (repeatQueue.length > 0) return undefined;
    if (vectorKey(currentAddress) !== vectorKey(netArrowHold.extensionEndVector)) {
      return undefined;
    }

    setNetArrowExtension({
      id: netArrowHold.id,
      startVector: netArrowHold.extensionStartVector,
      endVector: netArrowHold.extensionEndVector,
    });

    const timer = window.setTimeout(() => {
      setNetArrowHold(null);
      setNetArrowExtension(null);
    }, 900);

    return () => window.clearTimeout(timer);
  }, [netArrowHold, pendingSwap, repeatQueue, currentAddress]);

  function constructMoveWord(word, compositeId = selectedCompositeId) {
    if (pendingSwap) return;
    if (repeatQueue.length > 0) return;

    const constructionEndVector = applyMoveWord(ZERO, word);
    const constructionId = `${Date.now()}-${animationRun}-construct`;

    setSelectedCompositeId(compositeId);
    setCurrentOrderingWord(word);
    setRepeatQueue([]);
    setNetArrowExtension(null);
    setPendingSwap(null);
    setShowNetArrow(true);
    setVertices([{ id: 0, vector: ZERO, move: null }]);
    setAnimationRun((run) => run + 1);

    if (lockNetArrowView) {
      const orientation = makeOrientationLookingDownAddress(constructionEndVector);

      if (orientation) {
        setView((current) => ({
          ...current,
          orientation,
        }));
      }
    }

    if (word.length > 0) {
      setNetArrowHold({
        id: constructionId,
        baseEndVector: ZERO,
        extensionStartVector: ZERO,
        extensionEndVector: constructionEndVector,
      });

      setRepeatQueue(word);
    } else {
      setNetArrowHold(null);
    }
  }

  function constructCompositeDimension(item) {
    constructMoveWord(wordFromAddress(item.address), item.id);
  }

  function constructNextOrdering() {
    if (pendingSwap) return;
    if (repeatQueue.length > 0) return;

    const sourceWord = orderableMoveWord.length > 0 ? orderableMoveWord : moveWord;

    if (sourceWord.length <= 1) return;

    constructMoveWord(nextMoveWordOrdering(sourceWord), selectedCompositeId);
  }

  function repeatNetMove() {
    if (pendingSwap) return;
    if (moveWord.length === 0) return;

    setSelectedCompositeId(null);
    setCurrentOrderingWord([]);

    const baseEndVector = [...currentAddress];
    const extensionEndVector = applyMoveWord(baseEndVector, moveWord);
    const repeatId = `${Date.now()}-${animationRun}`;

    setNetArrowHold({
      id: repeatId,
      baseEndVector,
      extensionStartVector: baseEndVector,
      extensionEndVector,
    });

    setNetArrowExtension(null);
    setRepeatQueue(moveWord);
  }

  function undo() {
    setSelectedCompositeId(null);
    setCurrentOrderingWord([]);
    if (pendingSwap) {
      setRepeatQueue([]);
      setNetArrowHold(null);
      setNetArrowExtension(null);
      setPendingSwap(null);
      return;
    }

    setVertices((current) => {
      if (current.length <= 1) return current;
      return current.slice(0, -1);
    });

    setAnimationRun((run) => run + 1);
  }

  function resetPath() {
    setSelectedCompositeId(null);
    setCurrentOrderingWord([]);
    setRepeatQueue([]);
    setNetArrowHold(null);
    setNetArrowExtension(null);
    setPendingSwap(null);
    setVertices([{ id: 0, vector: ZERO, move: null }]);
    setAnimationRun((run) => run + 1);
  }

  function lookDownNetArrow() {
    if (!canLookDownNet) return;

    const orientation = makeOrientationLookingDownAddress(lookDownNetAddress);

    if (!orientation) return;

    setLockNetArrowView(true);

    setView((current) => ({
      ...current,
      orientation,
    }));
  }

  function resetView() {
    setLockNetArrowView(false);

    setView((current) => ({
      ...DEFAULT_VIEW,
      center: current.center || DEFAULT_CENTER,
      orientation: makeOrientationAligningAxisRight(AXES[selectedAxisIndex].vector),
    }));
  }

  function zoom(delta) {
    setView((current) => ({
      ...current,
      zoom: Math.min(1.9, Math.max(0.55, current.zoom + delta)),
    }));
  }

  function rotateAboutSelectedAxis(direction) {
    setLockNetArrowView(false);

    setView((current) => ({
      ...current,
      orientation: rotateOrientationAboutModelAxis(
        current.orientation,
        AXES[selectedAxisIndex].vector,
        direction * Math.PI / 36
      ),
    }));
  }

  function aimAxisRight(axisIndex) {
    setLockNetArrowView(false);
    setSelectedAxisIndex(axisIndex);
    setView((current) => ({
      ...current,
      orientation: makeOrientationAligningAxisRight(AXES[axisIndex].vector),
    }));
  }

  function toggleAxisVisibility(axisKey) {
    setAxisVisibility((current) => ({
      ...current,
      [axisKey]: !current[axisKey],
    }));
  }

  function handlePointerDown(event) {
    setLockNetArrowView(false);
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);

    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      orientation: view.orientation,
    };
  }

  function handlePointerMove(event) {
    const drag = dragRef.current;
    if (!drag) return;

    event.preventDefault();

    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;

    const yawed = rotateOrientationAroundWorldAxis(
      drag.orientation,
      { x: 0, y: 1, z: 0 },
      dx * 0.006
    );

    const pitched = rotateOrientationAroundWorldAxis(
      yawed,
      { x: 1, y: 0, z: 0 },
      -dy * 0.006
    );

    setView((current) => ({
      ...current,
      orientation: pitched,
    }));
  }

  function handlePointerUp(event) {
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    dragRef.current = null;
  }

  function handleKeyDown(event) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setLockNetArrowView(false);
      rotateAboutSelectedAxis(-1);
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      setLockNetArrowView(false);
      rotateAboutSelectedAxis(1);
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setLockNetArrowView(false);
      zoom(0.08);
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setLockNetArrowView(false);
      zoom(-0.08);
    }
  }

  const selectedAxis = AXES[selectedAxisIndex];

  return (
    <main className="moveSpacePage" tabIndex={0} onKeyDown={handleKeyDown}>
      <section className="moveSpaceShell">
        <header className="moveSpaceHeader">
          <div>
            <h1>Typed Boundary Calculus: Move Space</h1>
            <p>
              Six typed directions are projected from a rotatable 3D frame. Each
              move is a unit edge-swap between adjacent typed lattice vertices.
            </p>
          </div>

          <div className="addressReadout">
            <span>current address</span>
            <strong>{formatAddress(currentAddress)}</strong>
            <small>{Math.max(0, vertices.length - 1)} adjacent unit swaps</small>
            <small>last move: {lastMoveLabel(pendingSegment || segments[segments.length - 1] || null)}</small>
          </div>
        </header>

        <section className="stepController" aria-label="unit step controls">
          <div className="stepControllerTitle">
            <strong>Stage 1 · adjacent unit swaps</strong>
            <span>each button swaps the current vertex with one adjacent vertex</span>
          </div>

          <div className="axisStepButtons">
            {AXES.map((axis, axisIndex) => (
              <div className="axisStepCard" key={axis.key} style={{ "--axis-color": axis.color }}>
                <div className="axisStepLabel">
                  <b className="axisSymbol">{axis.label}</b>
                  <span>{axis.name}</span>
                </div>

                <div className="axisStepPair">
                  <button type="button" onClick={() => step(axisIndex, -1)} disabled={Boolean(pendingSwap)}>
                    <span className="axisSign">−</span><span className="axisSymbol">{axis.label}</span>
                  </button>
                  <button type="button" onClick={() => step(axisIndex, 1)} disabled={Boolean(pendingSwap)}>
                    <span className="axisSign">+</span><span className="axisSymbol">{axis.label}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="viewerPanel">
          <div ref={controllerRef} className="axisController" aria-label="axis controller">
            <div className="axisControllerRows">
              {AXES.map((axis, axisIndex) => {
                const active = axisIndex === selectedAxisIndex;
                const visible = axisVisibility[axis.key] !== false;

                return (
                  <div className="axisControllerRow" key={`controller-${axis.key}`}>
                    <button
                      type="button"
                      className={active ? "axisControllerAxis active" : "axisControllerAxis"}
                      style={{ "--axis-color": axis.color }}
                      onClick={() => setSelectedAxisIndex(axisIndex)}
                      onDoubleClick={() => aimAxisRight(axisIndex)}
                      title={`click to select ${axis.name}; double-click to point ${axis.label} right`}
                    >
                      <span className="axisControllerName">
                        {axis.controllerLabel}
                      </span>
                    </button>

                    <button
                      type="button"
                      className={visible ? "axisVisibilityToggle on" : "axisVisibilityToggle"}
                      style={{ "--axis-color": axis.color }}
                      onClick={() => toggleAxisVisibility(axis.key)}
                      title={`${visible ? "hide" : "show"} ${axis.name}`}
                    >
                      {visible ? "on" : "off"}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="controllerRotateActions" aria-label="rotate selected axis">
              <button
                type="button"
                className="controllerIconButton"
                onClick={() => rotateAboutSelectedAxis(-1)}
                title="rotate counter-clockwise about selected axis"
              >
                ⟲
              </button>
              <button
                type="button"
                className="controllerIconButton"
                onClick={() => rotateAboutSelectedAxis(1)}
                title="rotate clockwise about selected axis"
              >
                ⟳
              </button>
            </div>

            <div className="controllerZoomActions" aria-label="zoom">
              <button type="button" onClick={() => zoom(-0.1)} title="zoom out">
                −
              </button>
              <button type="button" onClick={() => zoom(0.1)} title="zoom in">
                +
              </button>
            </div>

            <div className="controllerResetSection" aria-label="reset options">
              <span>reset</span>
              <div>
                <button type="button" onClick={resetPath} disabled={vertices.length <= 1 && !pendingSwap}>
                  path
                </button>
                <button type="button" onClick={resetView}>
                  view
                </button>
              </div>
            </div>

            <div className="controllerNetSection" aria-label="net arrow controls">
              <button
                type="button"
                className={
                  lockNetArrowView
                    ? "controllerSectionTitleButton active"
                    : "controllerSectionTitleButton"
                }
                onClick={lookDownNetArrow}
                disabled={!canLookDownNet}
                title="look straight down the current net arrow"
              >
                net arrow
              </button>
              <div className="controllerNetButtons">
                <button
                  type="button"
                  className={showNetArrow ? "controllerNetToggle on" : "controllerNetToggle"}
                  onClick={() => setShowNetArrow((current) => !current)}
                >
                  {showNetArrow ? "on" : "off"}
                </button>

                <button
                  type="button"
                  className="controllerNetStep"
                  onClick={repeatNetMove}
                  disabled={pendingSwap || moveWord.length === 0}
                  title="repeat the current move word from the current endpoint"
                >
                  step
                </button>
              </div>
            </div>

            <div className="controllerOrderSection" aria-label="path ordering controls">
              <span>order</span>
              <button
                type="button"
                className="controllerOrderNext"
                onClick={constructNextOrdering}
                disabled={pendingSwap || repeatQueue.length > 0 || orderableMoveWord.length <= 1}
                title="construct the next possible ordering of the same unit moves"
              >
                next
              </button>
            </div>

            <div className="controllerSupportSection" aria-label="support graph toggle">
              <span>support</span>
              <button
                type="button"
                className={showSupportGraph ? "controllerSupportToggle on" : "controllerSupportToggle"}
                onClick={() => setShowSupportGraph((current) => !current)}
                disabled={orderableMoveWord.length === 0}
                title="show the support graph of all possible orderings of this move word"
              >
                {showSupportGraph ? "on" : "off"}
              </button>
            </div>

            <button
              type="button"
              className="controllerUndoBottom"
              onClick={undo}
              disabled={vertices.length <= 1 && !pendingSwap}
            >
              undo
            </button>

            <small>click page, then arrow keys rotate/zoom</small>
          </div>

          <svg
            ref={svgRef}
            className="moveSpaceSvg"
            viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
            role="img"
            aria-label="Rotatable six-axis typed move-space viewer"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <defs>
              <filter id="softGlow">
                <feGaussianBlur stdDeviation="2.2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <marker
                id="netArrowHead"
                markerWidth="9"
                markerHeight="9"
                refX="7.2"
                refY="4.5"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <path d="M 0 0 L 9 4.5 L 0 9 z" fill="#ffe1ac" />
              </marker>
            </defs>

            {AXES.map((axis, axisIndex) => {
              const basis = AXES[axisIndex].vector;
              const start3D = {
                x: -basis.x * VIEWBOX.axisHalfLength,
                y: -basis.y * VIEWBOX.axisHalfLength,
                z: -basis.z * VIEWBOX.axisHalfLength,
              };
              const end3D = {
                x: basis.x * VIEWBOX.axisHalfLength,
                y: basis.y * VIEWBOX.axisHalfLength,
                z: basis.z * VIEWBOX.axisHalfLength,
              };
              const positiveLabel3D = {
                x: basis.x * (VIEWBOX.axisHalfLength + 0.36),
                y: basis.y * (VIEWBOX.axisHalfLength + 0.36),
                z: basis.z * (VIEWBOX.axisHalfLength + 0.36),
              };
              const negativeLabel3D = {
                x: -basis.x * (VIEWBOX.axisHalfLength + 0.36),
                y: -basis.y * (VIEWBOX.axisHalfLength + 0.36),
                z: -basis.z * (VIEWBOX.axisHalfLength + 0.36),
              };

              const start = projectPoint3D(start3D, view);
              const end = projectPoint3D(end3D, view);
              const positiveLabel = projectPoint3D(positiveLabel3D, view);
              const negativeLabel = projectPoint3D(negativeLabel3D, view);

              if (axisVisibility[axis.key] === false) {
                return null;
              }

              return (
                <g key={`axis-${axis.key}`} className="axisGroup" style={{ "--axis-color": axis.color }}>
                  <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} />
                  <text x={positiveLabel.x} y={positiveLabel.y}>
                    <tspan className="axisSign">+</tspan><tspan className="axisSymbol">{axis.label}</tspan>
                  </text>
                  <text x={negativeLabel.x} y={negativeLabel.y}>
                    <tspan className="axisSign">−</tspan><tspan className="axisSymbol">{axis.label}</tspan>
                  </text>
                </g>
              );
            })}

            {showSupportGraph &&
              supportGraph.edges
                .filter((edge) => axisVisibility[AXES[edge.axisIndex].key] !== false)
                .map((edge) => (
                  <line
                    className="supportEdge"
                    key={`support-edge-${edge.key}`}
                    x1={edge.start.x}
                    y1={edge.start.y}
                    x2={edge.end.x}
                    y2={edge.end.y}
                    style={{ "--axis-color": AXES[edge.axisIndex].color }}
                  />
                ))}

            {showSupportGraph &&
              supportGraph.vertices.map((vertex) => (
                <circle
                  className="supportVertex"
                  key={`support-vertex-${vertex.key}`}
                  cx={vertex.point.x}
                  cy={vertex.point.y}
                  r="2.15"
                />
              ))}

            {segments
              .filter((segment) => axisVisibility[AXES[segment.axisIndex].key] !== false)
              .map((segment) => (
                <line
                  className="pathSegment"
                  key={`segment-${segment.key}`}
                  x1={segment.start.x}
                  y1={segment.start.y}
                  x2={segment.end.x}
                  y2={segment.end.y}
                  style={{ "--axis-color": AXES[segment.axisIndex].color }}
                />
              ))}

            {netArrow && (
              <line
                className="netArrow"
                x1={netArrow.start.x}
                y1={netArrow.start.y}
                x2={netArrow.end.x}
                y2={netArrow.end.y}
                markerEnd="url(#netArrowHead)"
              />
            )}

            {netArrowExtensionVisual && (
              <line
                key={`net-extension-${netArrowExtensionVisual.id}`}
                className="netArrow netArrowExtension"
                x1={netArrowExtensionVisual.start.x}
                y1={netArrowExtensionVisual.start.y}
                x2={netArrowExtensionVisual.end.x}
                y2={netArrowExtensionVisual.end.y}
                markerEnd="url(#netArrowHead)"
                pathLength="1"
              />
            )}

            {visitedVertices.map((vertex) => {
              const isCurrent = vectorKey(vertex.vector) === vectorKey(currentAddress);
              const isOrigin = vectorKey(vertex.vector) === vectorKey(ZERO);

              return (
                <circle
                  className={isCurrent ? "vertexDot current" : isOrigin ? "vertexDot origin" : "vertexDot"}
                  key={`vertex-${vertex.key}`}
                  cx={vertex.point.x}
                  cy={vertex.point.y}
                  r={isCurrent ? 4.4 : isOrigin ? 3.7 : 3.25}
                />
              );
            })}

            {swapVisual && pendingSegment && (
              <g
                className="swapLayer"
                key={`swap-${pendingSegment.key}-${animationRun}`}
                style={{ "--axis-color": AXES[pendingSegment.axisIndex].color }}
              >
                {swapVisual.showOrbit && (
                  <circle
                    className="swapOrbit"
                    cx={swapVisual.center.x}
                    cy={swapVisual.center.y}
                    r={swapVisual.radius}
                  />
                )}

                {swapVisual.showOrbit && (
                  <circle
                    className="swapCenter"
                    cx={swapVisual.center.x}
                    cy={swapVisual.center.y}
                    r="2.2"
                  />
                )}

                <g className="swapAnimation">
                  <line
                    x1={swapVisual.lineStart.x}
                    y1={swapVisual.lineStart.y}
                    x2={swapVisual.lineEnd.x}
                    y2={swapVisual.lineEnd.y}
                  />

                  <circle
                    className="swapSourceDot"
                    cx={swapVisual.sourceDot.x}
                    cy={swapVisual.sourceDot.y}
                    r="4.4"
                  />

                  <circle
                    className="swapTargetDot"
                    cx={swapVisual.targetDot.x}
                    cy={swapVisual.targetDot.y}
                    r="4.4"
                  />
                </g>
              </g>
            )}
          </svg>
        </section>

        <section className="wordNetReadout" aria-label="move word and net dimensional displacement">
          <div className="wordNetBlock">
            <span>word</span>
            <strong className="wordValue">
              {moveWord.length === 0 ? (
                <span className="emptyWord">∅</span>
              ) : (
                moveWord.map((move, index) => {
                  const axis = AXES[move.axisIndex];

                  return (
                    <span
                      className="wordToken"
                      key={`word-${index}-${axis.key}-${move.sign}`}
                      style={{ "--axis-color": axis.color }}
                    >
                      <span className="axisSign">{move.sign > 0 ? "+" : "−"}</span>
                      <span className="axisSymbol">{axis.label}</span>
                    </span>
                  );
                })
              )}
            </strong>
          </div>

          <div className="wordNetBlock">
            <span>net</span>
            <strong className="netValue">{formatAddress(netVector)}</strong>
          </div>
        </section>

        <section className="targetStatsReadout" aria-label="target ordering and support statistics">
          <div className="targetStatBlock targetStatWide">
            <span>target</span>
            <strong>{activeTargetLabel}</strong>
          </div>

          <div className="targetStatBlock targetStatWide">
            <span>address</span>
            <strong>{formatAddress(activeTargetVector)}</strong>
          </div>

          <div className="targetStatBlock">
            <span>word length</span>
            <strong>{orderableMoveWord.length}</strong>
          </div>

          <div className="targetStatBlock">
            <span>order</span>
            <strong>
              {orderStats.total === 0 ? "—" : `${orderStats.current} / ${orderStats.total}`}
            </strong>
          </div>

          <div className="targetStatBlock">
            <span>support</span>
            <strong>
              {supportStats.vertices === 0
                ? "—"
                : `${supportStats.vertices} vertices, ${supportStats.edges} edges`}
            </strong>
          </div>
        </section>

        <section className="compositeCatalog" aria-label="composite dimensional catalog">
          <div className="compositeCatalogHeader">
            <div>
              <h2>Composite dimensions</h2>
              <p>
                Click a dimensional unit to construct its address as a sequence of adjacent unit swaps.
              </p>
            </div>
            <span className="catalogAxisKey">(t, l, q, T, m, n)</span>
          </div>

          <div className="compositeGrid">
            {COMPOSITE_DIMENSIONS.map((item) => {
              const active = selectedCompositeId === item.id;

              return (
                <button
                  type="button"
                  key={item.id}
                  className={active ? "compositeButton active" : "compositeButton"}
                  onClick={() => constructCompositeDimension(item)}
                  disabled={Boolean(pendingSwap)}
                >
                  <span className="compositeName">{item.name}</span>
                  <span className="compositeUnit">{item.unit}</span>
                  <span className="compositeAddress">{formatAddress(item.address)}</span>
                </button>
              );
            })}
          </div>
        </section>
      </section>

      <style jsx>{`
        .moveSpacePage {
          min-height: 100vh;
          width: calc(100vw - var(--sidebar-width, 142px));
          padding: 42px 20px 72px;
          box-sizing: border-box;
          color: #e8dfc8;
          font-family: "Times New Roman", Times, serif;
        }

        .moveSpaceShell {
          width: 100%;
          border: 1px solid rgba(232, 223, 200, 0.22);
          background: rgba(0, 0, 0, 0.5);
          box-shadow: 0 18px 60px rgba(0, 0, 0, 0.45);
          padding: 16px;
          box-sizing: border-box;
        }

        .moveSpaceHeader {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 18px;
          align-items: start;
        }

        .moveSpaceHeader h1 {
          margin: 0 0 10px;
          font-size: clamp(20px, 2.5vw, 24px);
          font-weight: 500;
          letter-spacing: 0.02em;
        }

        .moveSpaceHeader p {
          margin: 0;
          max-width: 920px;
          font-size: 15px;
          line-height: 1.45;
          opacity: 0.86;
        }

        .addressReadout {
          display: grid;
          gap: 5px;
          min-width: 260px;
          padding: 10px 12px;
          border: 1px solid rgba(232, 223, 200, 0.16);
          background: rgba(255, 255, 255, 0.045);
          border-radius: 7px;
        }

        .addressReadout span,
        .addressReadout small {
          opacity: 0.68;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .addressReadout strong {
          font-family: "Cambria Math", "STIX Two Math", "DejaVu Serif", "Times New Roman", serif;
          font-size: 18px;
          font-weight: 500;
        }

        .stepController {
          display: grid;
          gap: 10px;
          margin: 18px 0 14px;
          padding: 10px;
          border: 1px solid rgba(232, 223, 200, 0.15);
          background: rgba(0, 0, 0, 0.22);
          border-radius: 8px;
        }

        .stepControllerTitle {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          gap: 8px;
          align-items: baseline;
        }

        .stepControllerTitle strong {
          color: #ffe1ac;
        }

        .stepControllerTitle span {
          opacity: 0.68;
          font-size: 13px;
        }

        .axisStepButtons {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(118px, 1fr));
          gap: 8px;
        }

        .axisStepCard {
          display: grid;
          gap: 7px;
          min-width: 0;
          padding: 8px;
          border-radius: 7px;
          border: 1px solid rgba(232, 223, 200, 0.14);
          border-top: 2px solid var(--axis-color);
          background: rgba(255, 255, 255, 0.045);
        }

        .axisStepLabel {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          align-items: baseline;
        }

        .axisStepLabel b {
          color: var(--axis-color);
          font-family: "Cambria Math", "STIX Two Math", "DejaVu Serif", "Times New Roman", serif;
          font-size: 18px;
        }

        .axisSymbol {
          font-family: "KaTeX_Math", "KaTeX_Main", "Latin Modern Math", "STIX Two Math", "Cambria Math", "Times New Roman", serif;
          font-style: italic;
          font-weight: 400;
        }

        .axisSign {
          font-style: normal;
        }

        .axisStepLabel span {
          opacity: 0.68;
          font-size: 12px;
        }

        .axisStepPair {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
        }

        button {
          border: 1px solid rgba(232, 223, 200, 0.18);
          border-radius: 6px;
          padding: 7px 9px;
          cursor: pointer;
          color: #e8dfc8;
          background: rgba(0, 0, 0, 0.24);
          font-family: "Times New Roman", Times, serif;
        }

        button:disabled {
          cursor: not-allowed;
          opacity: 0.42;
        }

        .axisStepPair button {
          color: var(--axis-color);
          font-family: "Cambria Math", "STIX Two Math", "DejaVu Serif", "Times New Roman", serif;
          font-size: 15px;
        }

        .pathControls {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .viewerPanel {
          position: relative;
          width: 100%;
          border: 1px solid rgba(232, 223, 200, 0.18);
          background:
            radial-gradient(circle at center, rgba(255, 244, 220, 0.08), transparent 46%),
            rgba(0, 0, 0, 0.18);
          overflow: hidden;
        }

        .wordNetReadout {
          display: grid;
          grid-template-columns: minmax(0, 1.25fr) minmax(230px, 0.75fr);
          gap: 10px;
          margin-top: 10px;
        }

        .wordNetBlock {
          display: grid;
          gap: 5px;
          min-width: 0;
          padding: 9px 11px;
          border: 1px solid rgba(232, 223, 200, 0.15);
          border-radius: 7px;
          background: rgba(0, 0, 0, 0.24);
        }

        .wordNetBlock > span {
          color: rgba(232, 223, 200, 0.58);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .wordValue,
        .netValue {
          min-height: 24px;
          color: #fff4dc;
          font-family: "Cambria Math", "STIX Two Math", "DejaVu Serif", "Times New Roman", serif;
          font-size: 16px;
          font-weight: 500;
          line-height: 1.35;
        }

        .wordValue {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          align-items: center;
        }

        .wordToken {
          color: var(--axis-color);
          white-space: nowrap;
        }

        .emptyWord {
          color: rgba(232, 223, 200, 0.58);
        }

        .targetStatsReadout {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 7px;
          margin-top: 10px;
        }

        .targetStatBlock {
          display: grid;
          gap: 4px;
          min-width: 0;
          padding: 8px 9px;
          border: 1px solid rgba(232, 223, 200, 0.15);
          border-radius: 7px;
          background: rgba(0, 0, 0, 0.22);
        }

        .targetStatWide {
          grid-column: span 2;
        }

        .targetStatBlock > span {
          color: rgba(232, 223, 200, 0.58);
          font-size: 10.5px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .targetStatBlock > strong {
          overflow: hidden;
          color: #fff4dc;
          font-family: "Cambria Math", "STIX Two Math", "DejaVu Serif", "Times New Roman", serif;
          font-size: 13px;
          font-weight: 500;
          line-height: 1.3;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .compositeCatalog {
          display: grid;
          gap: 10px;
          margin-top: 10px;
          padding: 11px;
          border: 1px solid rgba(232, 223, 200, 0.15);
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.22);
        }

        .compositeCatalogHeader {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          align-items: end;
        }

        .compositeCatalogHeader h2 {
          margin: 0 0 4px;
          color: #ffe1ac;
          font-size: 17px;
          font-weight: 500;
        }

        .compositeCatalogHeader p {
          margin: 0;
          color: rgba(232, 223, 200, 0.7);
          font-size: 13px;
          line-height: 1.35;
        }

        .catalogAxisKey {
          color: rgba(232, 223, 200, 0.58);
          font-family: "Cambria Math", "STIX Two Math", "DejaVu Serif", "Times New Roman", serif;
          font-size: 13px;
          white-space: nowrap;
        }

        .compositeGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
          gap: 7px;
        }

        .compositeButton {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          grid-template-areas:
            "name unit"
            "address address";
          gap: 3px 8px;
          min-width: 0;
          padding: 8px 9px;
          text-align: left;
          border-radius: 7px;
          border: 1px solid rgba(232, 223, 200, 0.14);
          background: rgba(255, 255, 255, 0.04);
        }

        .compositeButton:hover:not(:disabled),
        .compositeButton.active {
          border-color: rgba(255, 225, 172, 0.55);
          background: rgba(255, 225, 172, 0.075);
        }

        .compositeName {
          grid-area: name;
          overflow: hidden;
          color: #fff4dc;
          font-size: 13px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .compositeUnit {
          grid-area: unit;
          color: #ffe1ac;
          font-family: "Cambria Math", "STIX Two Math", "DejaVu Serif", "Times New Roman", serif;
          font-size: 13px;
          white-space: nowrap;
        }

        .compositeAddress {
          grid-area: address;
          color: rgba(232, 223, 200, 0.66);
          font-family: "Cambria Math", "STIX Two Math", "DejaVu Serif", "Times New Roman", serif;
          font-size: 12px;
          white-space: nowrap;
        }

        .axisController {
          position: absolute;
          top: 12px;
          right: 12px;
          z-index: 5;
          display: grid;
          gap: 5px;
          width: 123px;
          padding: 6px;
          border-radius: 7px;
          border: 1px solid rgba(232, 223, 200, 0.16);
          background: rgba(0, 0, 0, 0.38);
          backdrop-filter: blur(1.5px);
        }

        .axisControllerRows {
          display: grid;
          gap: 4px;
        }

        .axisControllerRow {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 32px;
          gap: 4px;
        }

        .axisControllerAxis,
        .axisVisibilityToggle {
          min-height: 24px;
          padding: 3px 5px;
          font-size: 11px;
        }

        .axisControllerAxis {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--axis-color);
        }

        .axisControllerName {
          color: var(--axis-color);
          font-family: "Times New Roman", Times, serif;
          font-size: 15px;
          font-style: normal;
          font-weight: 400;
          letter-spacing: 0;
          line-height: 1;
          text-shadow: 0 0 6px color-mix(in srgb, var(--axis-color) 55%, transparent);
        }

        .axisControllerAxis.active {
          border-color: var(--axis-color);
          background: rgba(255, 255, 255, 0.08);
        }

        .axisVisibilityToggle {
          min-width: 0;
          color: rgba(232, 223, 200, 0.44);
        }

        .axisVisibilityToggle.on {
          color: var(--axis-color);
        }

        .controllerRotateActions,
        .controllerZoomActions {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 4px;
        }

        .controllerIconButton {
          min-height: 28px;
          font-size: 18px;
          line-height: 1;
          font-family: "Times New Roman", Times, serif;
        }

        .controllerZoomActions button {
          min-height: 26px;
          font-size: 16px;
          line-height: 1;
        }

        .controllerResetSection {
          display: grid;
          gap: 4px;
          padding-top: 5px;
          border-top: 1px solid rgba(232, 223, 200, 0.13);
        }

        .controllerResetSection > span {
          color: rgba(232, 223, 200, 0.58);
          font-size: 10px;
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .controllerResetSection > div {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px;
        }

        .controllerResetSection button,
        .controllerUndoBottom {
          width: 100%;
          min-height: 26px;
          padding: 4px 6px;
          font-size: 12px;
        }

        .controllerNetSection {
          display: grid;
          gap: 4px;
          padding-top: 5px;
          border-top: 1px solid rgba(232, 223, 200, 0.13);
        }

        .controllerNetSection > span,
        .controllerSectionTitleButton {
          color: rgba(232, 223, 200, 0.58);
          font-size: 10px;
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .controllerSectionTitleButton {
          width: 100%;
          min-height: auto;
          padding: 0;
          border: 0;
          border-radius: 0;
          background: transparent;
          font-family: "Times New Roman", Times, serif;
          cursor: pointer;
        }

        .controllerSectionTitleButton:hover:not(:disabled),
        .controllerSectionTitleButton.active {
          color: #ffe1ac;
        }

        .controllerNetButtons {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px;
        }

        .controllerNetToggle,
        .controllerNetStep {
          width: 100%;
          min-height: 26px;
          padding: 4px 6px;
          font-size: 12px;
        }

        .controllerNetToggle.on {
          color: #ffe1ac;
          border-color: rgba(255, 225, 172, 0.52);
        }

        .controllerNetStep {
          color: #ffe1ac;
        }

        .controllerOrderSection {
          display: grid;
          gap: 4px;
          padding-top: 5px;
          border-top: 1px solid rgba(232, 223, 200, 0.13);
        }

        .controllerOrderSection > span {
          color: rgba(232, 223, 200, 0.58);
          font-size: 10px;
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .controllerOrderNext {
          width: 100%;
          min-height: 26px;
          padding: 4px 6px;
          color: #ffe1ac;
          font-size: 12px;
        }

        .controllerSupportSection {
          display: grid;
          gap: 4px;
          padding-top: 5px;
          border-top: 1px solid rgba(232, 223, 200, 0.13);
        }

        .controllerSupportSection > span {
          color: rgba(232, 223, 200, 0.58);
          font-size: 10px;
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .controllerSupportToggle {
          width: 100%;
          min-height: 26px;
          padding: 4px 6px;
          font-size: 12px;
        }

        .controllerSupportToggle.on {
          color: #ffe1ac;
          border-color: rgba(255, 225, 172, 0.52);
        }

        .controllerUndoBottom {
          margin-top: 2px;
        }

        .axisController small {
          color: rgba(232, 223, 200, 0.48);
          font-size: 9px;
          line-height: 1.15;
          text-align: center;
        }

        .moveSpaceSvg {
          width: 100%;
          height: min(68vh, 640px);
          min-height: 500px;
          display: block;
          cursor: grab;
          touch-action: none;
          user-select: none;
        }

        .moveSpaceSvg:active {
          cursor: grabbing;
        }

        .axisGroup line {
          stroke: var(--axis-color);
          stroke-opacity: 0.34;
          stroke-width: 1.25;
          vector-effect: non-scaling-stroke;
        }

        .axisGroup text {
          fill: var(--axis-color);
          font-family: "KaTeX_Math", "KaTeX_Main", "Latin Modern Math", "STIX Two Math", "Cambria Math", "Times New Roman", serif;
          font-size: 13px;
          text-anchor: middle;
          dominant-baseline: middle;
          opacity: 0.95;
          paint-order: stroke fill;
          stroke: rgba(0, 0, 0, 0.74);
          stroke-width: 2.5px;
        }

        .supportEdge {
          stroke: var(--axis-color);
          stroke-width: 1.05;
          stroke-linecap: round;
          vector-effect: non-scaling-stroke;
          opacity: 0.3;
        }

        .supportVertex {
          fill: rgba(255, 244, 220, 0.72);
          stroke: rgba(0, 0, 0, 0.72);
          stroke-width: 0.65;
          filter: drop-shadow(0 0 2px rgba(255, 244, 220, 0.35));
        }

        .pathSegment {
          stroke: var(--axis-color);
          stroke-width: 3.0;
          stroke-linecap: round;
          vector-effect: non-scaling-stroke;
          opacity: 0.72;
        }

        .netArrow {
          stroke: #ffe1ac;
          stroke-width: 2.6;
          stroke-linecap: round;
          stroke-dasharray: 8 5;
          vector-effect: non-scaling-stroke;
          opacity: 0.88;
          filter: drop-shadow(0 0 5px rgba(255, 225, 172, 0.5));
        }

        .netArrowExtension {
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          animation: drawNetArrowExtension 850ms ease-out forwards;
        }

        @keyframes drawNetArrowExtension {
          to {
            stroke-dashoffset: 0;
          }
        }

        .vertexDot {
          fill: #fff4dc;
          stroke: rgba(0, 0, 0, 0.78);
          stroke-width: 0.9;
          filter: drop-shadow(0 0 3px rgba(255, 244, 220, 0.55));
        }

        .vertexDot.origin {
          fill: #fff9ee;
        }

        .vertexDot.current {
          fill: #ffffff;
          stroke: #ffe1ac;
          stroke-width: 1.25;
          filter: drop-shadow(0 0 6px rgba(255, 225, 172, 0.82));
        }

        .swapOrbit {
          fill: none;
          stroke: var(--axis-color);
          stroke-width: 1.2;
          stroke-dasharray: 4 5;
          opacity: 0.5;
          vector-effect: non-scaling-stroke;
        }

        .swapCenter {
          fill: #ffe1ac;
          opacity: 0.9;
        }

        .swapAnimation line {
          stroke: var(--axis-color);
          stroke-width: 4;
          stroke-linecap: round;
          vector-effect: non-scaling-stroke;
          filter: url(#softGlow);
        }

        .swapAnimation circle {
          stroke: rgba(0, 0, 0, 0.76);
          stroke-width: 0.9;
          filter: url(#softGlow);
        }

        .swapSourceDot {
          fill: #fff9ee;
        }

        .swapTargetDot {
          fill: var(--axis-color);
        }

        @media (max-width: 900px) {
          .moveSpaceHeader {
            grid-template-columns: 1fr;
          }

          .addressReadout {
            min-width: 0;
          }
        }
      `}</style>
    </main>
  );
}
