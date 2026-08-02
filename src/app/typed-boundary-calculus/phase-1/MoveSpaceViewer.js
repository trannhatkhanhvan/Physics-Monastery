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
const ZERO_POINT = { x: 0, y: 0, z: 0 };

const PLANCK_TIME_SECONDS = 5.39125836832313e-44;
const F1_HZ = 5.4e14;
const MHZ_HZ = 1e6;

const TIME_SCALES = [
  {
    id: "planck-time",
    controlLabel: "tₚ",
    wordLabel: "tₚ",
    axisLabel: "tₚ",
    seconds: PLANCK_TIME_SECONDS,
  },
  {
    id: "f1-period",
    controlLabel: "1/f₁",
    wordLabel: "1/f₁",
    axisLabel: "1/f₁",
    seconds: 1 / F1_HZ,
  },
  {
    id: "mhz-period",
    controlLabel: "1/MHz",
    wordLabel: "1/MHz",
    axisLabel: "1/MHz",
    seconds: 1 / MHZ_HZ,
  },
  {
    id: "second",
    controlLabel: "1 s",
    wordLabel: "s",
    axisLabel: "1 s",
    seconds: 1,
  },
].map((scale) => ({
  ...scale,
  planckCount: scale.seconds / PLANCK_TIME_SECONDS,
  hybridCoordinate:
    1 + Math.log10(scale.seconds / PLANCK_TIME_SECONDS),
}));

const TIME_SCALE_BY_ID = new Map(
  TIME_SCALES.map((scale) => [scale.id, scale])
);

const DEFAULT_TIME_SCALE_ID = "second";


const PLANCK_LENGTH_METERS = 1.6162591817564534e-35;
const FEMTOMETER_METERS = 1e-15;

const LENGTH_SCALES = [
  {
    id: "planck-length",
    controlLabel: "lₚ",
    wordLabel: "lₚ",
    axisLabel: "lₚ",
    meters: PLANCK_LENGTH_METERS,
  },
  {
    id: "femtometer",
    controlLabel: "fm",
    wordLabel: "fm",
    axisLabel: "fm",
    meters: FEMTOMETER_METERS,
  },
  {
    id: "meter",
    controlLabel: "m",
    wordLabel: "m",
    axisLabel: "m",
    meters: 1,
  },
].map((scale) => ({
  ...scale,
  planckCount: scale.meters / PLANCK_LENGTH_METERS,
  hybridCoordinate:
    1 + Math.log10(scale.meters / PLANCK_LENGTH_METERS),
}));

const LENGTH_SCALE_BY_ID = new Map(
  LENGTH_SCALES.map((scale) => [scale.id, scale])
);

const DEFAULT_LENGTH_SCALE_ID = "meter";


const PLANCK_CHARGE_COULOMBS = 1.875546037776847e-18;

const CHARGE_SCALES = [
  {
    id: "planck-charge",
    controlLabel: "qₚ",
    wordLabel: "qₚ",
    axisLabel: "qₚ",
    coulombs: PLANCK_CHARGE_COULOMBS,
  },
  {
    id: "coulomb",
    controlLabel: "C",
    wordLabel: "C",
    axisLabel: "C",
    coulombs: 1,
  },
].map((scale) => ({
  ...scale,
  planckCount: scale.coulombs / PLANCK_CHARGE_COULOMBS,
  hybridCoordinate:
    1 + Math.log10(scale.coulombs / PLANCK_CHARGE_COULOMBS),
}));

const CHARGE_SCALE_BY_ID = new Map(
  CHARGE_SCALES.map((scale) => [scale.id, scale])
);

const DEFAULT_CHARGE_SCALE_ID = "coulomb";


const PLANCK_TEMPERATURE_KELVINS = 1.4167869859079463e32;
const KELVIN_UNIT = 1;

const TEMPERATURE_SCALES = [
  {
    id: "kelvin",
    controlLabel: "K",
    wordLabel: "K",
    axisLabel: "K",
    kelvins: KELVIN_UNIT,
  },
  {
    id: "planck-temperature",
    controlLabel: "Tₚ",
    wordLabel: "Tₚ",
    axisLabel: "Tₚ",
    kelvins: PLANCK_TEMPERATURE_KELVINS,
  },
].map((scale) => ({
  ...scale,
  kelvinRatio: scale.kelvins / KELVIN_UNIT,
  hybridCoordinate:
    1 + Math.log10(scale.kelvins / KELVIN_UNIT),
}));

const TEMPERATURE_SCALE_BY_ID = new Map(
  TEMPERATURE_SCALES.map((scale) => [scale.id, scale])
);

const DEFAULT_TEMPERATURE_SCALE_ID = "kelvin";


const PLANCK_MASS_KILOGRAMS =
  2.1764268381757881245184989320757924e-8;
const ELECTRON_MASS_KILOGRAMS = 9.1093837139e-31;

const MASS_SCALES = [
  {
    id: "electron-mass",
    controlLabel: "mₑ",
    wordLabel: "mₑ",
    axisLabel: "mₑ",
    kilograms: ELECTRON_MASS_KILOGRAMS,
  },
  {
    id: "muon-mass",
    controlLabel: "m_μ",
    wordLabel: "m_μ",
    axisLabel: "m_μ",
    kilograms: 1.883531627e-28,
  },
  {
    id: "atomic-mass-constant",
    controlLabel: "A_mass",
    wordLabel: "A_mass",
    axisLabel: "A_mass",
    kilograms: 1.66053906892e-27,
  },
  {
    id: "proton-mass",
    controlLabel: "m₊",
    wordLabel: "m₊",
    axisLabel: "m₊",
    kilograms: 1.67262192595e-27,
  },
  {
    id: "neutron-mass",
    controlLabel: "mₙ",
    wordLabel: "mₙ",
    axisLabel: "mₙ",
    kilograms: 1.67492750056e-27,
  },
  {
    id: "tau-mass",
    controlLabel: "m_τ",
    wordLabel: "m_τ",
    axisLabel: "m_τ",
    kilograms: 3.16754e-27,
  },
  {
    id: "deuteron-mass",
    controlLabel: "m_de",
    wordLabel: "m_de",
    axisLabel: "m_de",
    kilograms: 3.3435837768e-27,
  },
  {
    id: "helion-mass",
    controlLabel: "m_he",
    wordLabel: "m_he",
    axisLabel: "m_he",
    kilograms: 5.0064127862e-27,
  },
  {
    id: "triton-mass",
    controlLabel: "m_tri",
    wordLabel: "m_tri",
    axisLabel: "m_tri",
    kilograms: 5.0073567512e-27,
  },
  {
    id: "alpha-particle-mass",
    controlLabel: "m_α",
    wordLabel: "m_α",
    axisLabel: "m_α",
    kilograms: 6.6446573450e-27,
  },
  {
    id: "planck-mass",
    controlLabel: "mₚ",
    wordLabel: "mₚ",
    axisLabel: "mₚ",
    kilograms: PLANCK_MASS_KILOGRAMS,
  },
  {
    id: "kilogram",
    controlLabel: "kg",
    wordLabel: "kg",
    axisLabel: "kg",
    kilograms: 1,
  },
].map((scale) => ({
  ...scale,
  electronMassRatio: scale.kilograms / ELECTRON_MASS_KILOGRAMS,
  hybridCoordinate:
    1 + Math.log10(scale.kilograms / ELECTRON_MASS_KILOGRAMS),
}));

const MASS_SCALE_BY_ID = new Map(
  MASS_SCALES.map((scale) => [scale.id, scale])
);

const DEFAULT_MASS_SCALE_ID = "kilogram";


const AMOUNT_SCALES = [
  {
    id: "mole",
    controlLabel: "mol",
    wordLabel: "mol",
    axisLabel: "mol",
    moles: 1,
  },
];

const AMOUNT_SCALE_BY_ID = new Map(
  AMOUNT_SCALES.map((scale) => [scale.id, scale])
);

const DEFAULT_AMOUNT_SCALE_ID = "mole";

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
  timeAxisHalfLength: 5.1,
  lengthAxisHalfLength: 5.1,
  chargeAxisHalfLength: 5.1,
  temperatureAxisHalfLength: 5.1,
  massAxisHalfLength: 5.1,
  amountAxisHalfLength: 5.1,
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

function pointKey(point) {
  return [point.x, point.y, point.z]
    .map((value) => Number(value).toFixed(10))
    .join(",");
}

function addPoint3D(a, b) {
  return {
    x: a.x + b.x,
    y: a.y + b.y,
    z: a.z + b.z,
  };
}

function multiplyPoint3D(point, factor) {
  return {
    x: point.x * factor,
    y: point.y * factor,
    z: point.z * factor,
  };
}

function makeOriginVertex() {
  return {
    id: 0,
    vector: [...ZERO],
    modelPoint: { ...ZERO_POINT },
    move: null,
  };
}

function formatAddress(vector) {
  return `(${vector.join(", ")})`;
}

function addStep(vector, axisIndex, sign) {
  const next = [...vector];
  next[axisIndex] += sign;
  return next;
}

function normalizeMove(move) {
  return {
    axisIndex: move.axisIndex,
    sign: move.sign > 0 ? 1 : -1,
    scaleId:
      move.axisIndex === 0
        ? move.scaleId || DEFAULT_TIME_SCALE_ID
        : move.axisIndex === 1
          ? move.scaleId || DEFAULT_LENGTH_SCALE_ID
          : move.axisIndex === 2
            ? move.scaleId || DEFAULT_CHARGE_SCALE_ID
            : move.axisIndex === 3
              ? move.scaleId || DEFAULT_TEMPERATURE_SCALE_ID
              : move.axisIndex === 4
                ? move.scaleId || DEFAULT_MASS_SCALE_ID
                : move.axisIndex === 5
                  ? move.scaleId || DEFAULT_AMOUNT_SCALE_ID
                  : null,
  };
}

function unitAnchoredScaleDistance({
  scales,
  scaleById,
  scaleId,
  defaultScaleId,
  valueKey,
  axisHalfLength,
}) {
  const scale = scaleById.get(scaleId || defaultScaleId);
  const unitScale = scaleById.get(defaultScaleId);

  const value = scale[valueKey];
  const unitValue = unitScale[valueKey];

  const values = scales.map((item) => item[valueKey]);
  const minimumValue = Math.min(...values);
  const maximumValue = Math.max(...values);

  const logRatio = Math.log10(value / unitValue);

  /*
   * The ordinary SI unit is the fixed model-distance anchor:
   *
   *   1 s = 1 m = 1 C = 1 K = 1 kg = 1 mol = 1.
   *
   * Available values below the SI unit are logarithmically compressed
   * into the interval [1 / axisHalfLength, 1].
   *
   * Available values above the SI unit are logarithmically compressed
   * into the interval [1, axisHalfLength].
   */
  if (Math.abs(logRatio) < 1e-12) {
    return 1;
  }

  if (logRatio < 0) {
    const minimumLogRatio = Math.log10(minimumValue / unitValue);

    if (minimumLogRatio >= 0) {
      return 1;
    }

    const interpolation =
      (logRatio - minimumLogRatio) / -minimumLogRatio;

    const minimumDistance = 1 / axisHalfLength;

    return (
      minimumDistance +
      interpolation * (1 - minimumDistance)
    );
  }

  const maximumLogRatio = Math.log10(maximumValue / unitValue);

  if (maximumLogRatio <= 0) {
    return 1;
  }

  const interpolation = logRatio / maximumLogRatio;

  return (
    1 +
    interpolation * (axisHalfLength - 1)
  );
}

function timeScaleModelDistance(scaleId) {
  return unitAnchoredScaleDistance({
    scales: TIME_SCALES,
    scaleById: TIME_SCALE_BY_ID,
    scaleId,
    defaultScaleId: DEFAULT_TIME_SCALE_ID,
    valueKey: "seconds",
    axisHalfLength: VIEWBOX.timeAxisHalfLength,
  });
}

function lengthScaleModelDistance(scaleId) {
  return unitAnchoredScaleDistance({
    scales: LENGTH_SCALES,
    scaleById: LENGTH_SCALE_BY_ID,
    scaleId,
    defaultScaleId: DEFAULT_LENGTH_SCALE_ID,
    valueKey: "meters",
    axisHalfLength: VIEWBOX.lengthAxisHalfLength,
  });
}

function chargeScaleModelDistance(scaleId) {
  return unitAnchoredScaleDistance({
    scales: CHARGE_SCALES,
    scaleById: CHARGE_SCALE_BY_ID,
    scaleId,
    defaultScaleId: DEFAULT_CHARGE_SCALE_ID,
    valueKey: "coulombs",
    axisHalfLength: VIEWBOX.chargeAxisHalfLength,
  });
}

function temperatureScaleModelDistance(scaleId) {
  return unitAnchoredScaleDistance({
    scales: TEMPERATURE_SCALES,
    scaleById: TEMPERATURE_SCALE_BY_ID,
    scaleId,
    defaultScaleId: DEFAULT_TEMPERATURE_SCALE_ID,
    valueKey: "kelvins",
    axisHalfLength: VIEWBOX.temperatureAxisHalfLength,
  });
}

function massScaleModelDistance(scaleId) {
  return unitAnchoredScaleDistance({
    scales: MASS_SCALES,
    scaleById: MASS_SCALE_BY_ID,
    scaleId,
    defaultScaleId: DEFAULT_MASS_SCALE_ID,
    valueKey: "kilograms",
    axisHalfLength: VIEWBOX.massAxisHalfLength,
  });
}

function amountScaleModelDistance() {
  return 1;
}

function moveModelDistance(moveInput) {
  const move = normalizeMove(moveInput);

  if (move.axisIndex === 0) {
    return timeScaleModelDistance(move.scaleId);
  }

  if (move.axisIndex === 1) {
    return lengthScaleModelDistance(move.scaleId);
  }

  if (move.axisIndex === 2) {
    return chargeScaleModelDistance(move.scaleId);
  }

  if (move.axisIndex === 3) {
    return temperatureScaleModelDistance(move.scaleId);
  }

  if (move.axisIndex === 4) {
    return massScaleModelDistance(move.scaleId);
  }

  if (move.axisIndex === 5) {
    return amountScaleModelDistance();
  }

  return 1;
}

function moveDeltaPoint3D(moveInput) {
  const move = normalizeMove(moveInput);

  return scaled3D(
    AXES[move.axisIndex].vector,
    move.sign * moveModelDistance(move)
  );
}

function moveTokenLabel(moveInput) {
  const move = normalizeMove(moveInput);

  if (move.axisIndex === 0) {
    return TIME_SCALE_BY_ID.get(move.scaleId).wordLabel;
  }

  if (move.axisIndex === 1) {
    return LENGTH_SCALE_BY_ID.get(move.scaleId).wordLabel;
  }

  if (move.axisIndex === 2) {
    return CHARGE_SCALE_BY_ID.get(move.scaleId).wordLabel;
  }

  if (move.axisIndex === 3) {
    return TEMPERATURE_SCALE_BY_ID.get(move.scaleId).wordLabel;
  }

  if (move.axisIndex === 4) {
    return MASS_SCALE_BY_ID.get(move.scaleId).wordLabel;
  }

  if (move.axisIndex === 5) {
    return AMOUNT_SCALE_BY_ID.get(move.scaleId).wordLabel;
  }

  return AXES[move.axisIndex].label;
}

function scaleLabelParts(axisIndex, scaleId) {
  if (axisIndex === 0) {
    switch (scaleId) {
      case "planck-time":
        return [
          { text: "t", className: "axisSymbol" },
          { text: "p", className: "axisSymbol", subscript: true },
        ];
      case "f1-period":
        return [
          { text: "1/" },
          { text: "f", className: "axisSymbol" },
          { text: "1", subscript: true },
        ];
      case "mhz-period":
        return [
          { text: "1/" },
          { text: "MHz", className: "timeScaleRoman" },
        ];
      case "second":
      default:
        return [
          { text: "1 " },
          { text: "s", className: "timeScaleRoman" },
        ];
    }
  }

  if (axisIndex === 1) {
    switch (scaleId) {
      case "planck-length":
        return [
          { text: "l", className: "axisSymbol" },
          { text: "p", className: "axisSymbol", subscript: true },
        ];
      case "femtometer":
        return [{ text: "fm", className: "timeScaleRoman" }];
      case "meter":
      default:
        return [{ text: "m", className: "timeScaleRoman" }];
    }
  }

  if (axisIndex === 2) {
    switch (scaleId) {
      case "planck-charge":
        return [
          { text: "q", className: "axisSymbol" },
          { text: "p", className: "axisSymbol", subscript: true },
        ];
      case "coulomb":
      default:
        return [{ text: "C", className: "timeScaleRoman" }];
    }
  }

  if (axisIndex === 3) {
    switch (scaleId) {
      case "planck-temperature":
        return [
          { text: "T", className: "axisSymbol" },
          { text: "p", className: "axisSymbol", subscript: true },
        ];
      case "kelvin":
      default:
        return [{ text: "K", className: "timeScaleRoman" }];
    }
  }

  if (axisIndex === 5) {
    return [{ text: "mol", className: "timeScaleRoman" }];
  }

  switch (scaleId) {
    case "electron-mass":
      return [
        { text: "m", className: "axisSymbol" },
        { text: "e", className: "axisSymbol", subscript: true },
      ];
    case "muon-mass":
      return [
        { text: "m", className: "axisSymbol" },
        { text: "μ", className: "axisSymbol", subscript: true },
      ];
    case "atomic-mass-constant":
      return [
        { text: "A", className: "axisSymbol" },
        { text: "mass", className: "timeScaleRoman", subscript: true },
      ];
    case "proton-mass":
      return [
        { text: "m", className: "axisSymbol" },
        { text: "+", subscript: true },
      ];
    case "neutron-mass":
      return [
        { text: "m", className: "axisSymbol" },
        { text: "n", className: "axisSymbol", subscript: true },
      ];
    case "tau-mass":
      return [
        { text: "m", className: "axisSymbol" },
        { text: "τ", className: "axisSymbol", subscript: true },
      ];
    case "deuteron-mass":
      return [
        { text: "m", className: "axisSymbol" },
        { text: "de", className: "timeScaleRoman", subscript: true },
      ];
    case "helion-mass":
      return [
        { text: "m", className: "axisSymbol" },
        { text: "he", className: "timeScaleRoman", subscript: true },
      ];
    case "triton-mass":
      return [
        { text: "m", className: "axisSymbol" },
        { text: "tri", className: "timeScaleRoman", subscript: true },
      ];
    case "alpha-particle-mass":
      return [
        { text: "m", className: "axisSymbol" },
        { text: "α", className: "axisSymbol", subscript: true },
      ];
    case "planck-mass":
      return [
        { text: "m", className: "axisSymbol" },
        { text: "p", className: "axisSymbol", subscript: true },
      ];
    case "kilogram":
    default:
      return [{ text: "kg", className: "timeScaleRoman" }];
  }
}

function wordFromAddress(address) {
  return address.flatMap((value, axisIndex) => {
    const sign = value >= 0 ? 1 : -1;

    return Array.from({ length: Math.abs(value) }, () =>
      normalizeMove({
        axisIndex,
        sign,
        scaleId:
          axisIndex === 0
            ? DEFAULT_TIME_SCALE_ID
            : axisIndex === 1
              ? DEFAULT_LENGTH_SCALE_ID
              : axisIndex === 2
                ? DEFAULT_CHARGE_SCALE_ID
                : axisIndex === 3
                  ? DEFAULT_TEMPERATURE_SCALE_ID
                  : axisIndex === 4
                    ? DEFAULT_MASS_SCALE_ID
                    : axisIndex === 5
                      ? DEFAULT_AMOUNT_SCALE_ID
                      : null,
      })
    );
  });
}

function moveCode(moveInput) {
  const move = normalizeMove(moveInput);
  const signOffset = move.sign > 0 ? 1 : 0;
  const timeCodeCount = TIME_SCALES.length * 2;
  const lengthCodeCount = LENGTH_SCALES.length * 2;
  const chargeCodeCount = CHARGE_SCALES.length * 2;
  const temperatureCodeCount = TEMPERATURE_SCALES.length * 2;
  const massCodeCount = MASS_SCALES.length * 2;

  if (move.axisIndex === 0) {
    const scaleIndex = Math.max(
      0,
      TIME_SCALES.findIndex((scale) => scale.id === move.scaleId)
    );

    return scaleIndex * 2 + signOffset;
  }

  if (move.axisIndex === 1) {
    const scaleIndex = Math.max(
      0,
      LENGTH_SCALES.findIndex((scale) => scale.id === move.scaleId)
    );

    return timeCodeCount + scaleIndex * 2 + signOffset;
  }

  if (move.axisIndex === 2) {
    const scaleIndex = Math.max(
      0,
      CHARGE_SCALES.findIndex((scale) => scale.id === move.scaleId)
    );

    return timeCodeCount + lengthCodeCount + scaleIndex * 2 + signOffset;
  }

  if (move.axisIndex === 3) {
    const scaleIndex = Math.max(
      0,
      TEMPERATURE_SCALES.findIndex(
        (scale) => scale.id === move.scaleId
      )
    );

    return (
      timeCodeCount +
      lengthCodeCount +
      chargeCodeCount +
      scaleIndex * 2 +
      signOffset
    );
  }

  if (move.axisIndex === 4) {
    const scaleIndex = Math.max(
      0,
      MASS_SCALES.findIndex((scale) => scale.id === move.scaleId)
    );

    return (
      timeCodeCount +
      lengthCodeCount +
      chargeCodeCount +
      temperatureCodeCount +
      scaleIndex * 2 +
      signOffset
    );
  }

  return (
    timeCodeCount +
    lengthCodeCount +
    chargeCodeCount +
    temperatureCodeCount +
    massCodeCount +
    (move.axisIndex - 5) * 2 +
    signOffset
  );
}

function moveFromCode(code) {
  const timeCodeCount = TIME_SCALES.length * 2;
  const lengthCodeCount = LENGTH_SCALES.length * 2;
  const chargeCodeCount = CHARGE_SCALES.length * 2;
  const temperatureCodeCount = TEMPERATURE_SCALES.length * 2;
  const massCodeCount = MASS_SCALES.length * 2;

  if (code < timeCodeCount) {
    const scaleIndex = Math.floor(code / 2);

    return normalizeMove({
      axisIndex: 0,
      sign: code % 2 === 1 ? 1 : -1,
      scaleId: TIME_SCALES[scaleIndex].id,
    });
  }

  if (code < timeCodeCount + lengthCodeCount) {
    const shiftedCode = code - timeCodeCount;
    const scaleIndex = Math.floor(shiftedCode / 2);

    return normalizeMove({
      axisIndex: 1,
      sign: shiftedCode % 2 === 1 ? 1 : -1,
      scaleId: LENGTH_SCALES[scaleIndex].id,
    });
  }

  if (code < timeCodeCount + lengthCodeCount + chargeCodeCount) {
    const shiftedCode = code - timeCodeCount - lengthCodeCount;
    const scaleIndex = Math.floor(shiftedCode / 2);

    return normalizeMove({
      axisIndex: 2,
      sign: shiftedCode % 2 === 1 ? 1 : -1,
      scaleId: CHARGE_SCALES[scaleIndex].id,
    });
  }

  if (
    code <
    timeCodeCount +
      lengthCodeCount +
      chargeCodeCount +
      temperatureCodeCount
  ) {
    const shiftedCode =
      code - timeCodeCount - lengthCodeCount - chargeCodeCount;
    const scaleIndex = Math.floor(shiftedCode / 2);

    return normalizeMove({
      axisIndex: 3,
      sign: shiftedCode % 2 === 1 ? 1 : -1,
      scaleId: TEMPERATURE_SCALES[scaleIndex].id,
    });
  }

  if (
    code <
    timeCodeCount +
      lengthCodeCount +
      chargeCodeCount +
      temperatureCodeCount +
      massCodeCount
  ) {
    const shiftedCode =
      code -
      timeCodeCount -
      lengthCodeCount -
      chargeCodeCount -
      temperatureCodeCount;
    const scaleIndex = Math.floor(shiftedCode / 2);

    return normalizeMove({
      axisIndex: 4,
      sign: shiftedCode % 2 === 1 ? 1 : -1,
      scaleId: MASS_SCALES[scaleIndex].id,
    });
  }

  const shiftedCode =
    code -
    timeCodeCount -
    lengthCodeCount -
    chargeCodeCount -
    temperatureCodeCount -
    massCodeCount;

  return normalizeMove({
    axisIndex: Math.floor(shiftedCode / 2) + 5,
    sign: shiftedCode % 2 === 1 ? 1 : -1,
  });
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

  word.forEach((moveInput) => {
    const move = normalizeMove(moveInput);

    /*
     * Scale identity is part of the move type.
     *
     * For example, K and Tₚ share the same typed direction,
     * sign, and address increment, while producing different
     * model-space displacements.
     */
    const key = String(moveCode(move));
    const existing = typeMap.get(key);

    if (existing) {
      existing.count += 1;
    } else {
      typeMap.set(key, {
        key,
        axisIndex: move.axisIndex,
        sign: move.sign,
        scaleId: move.scaleId,
        count: 1,
      });
    }
  });

  const moveTypes = Array.from(typeMap.values()).sort(
    (a, b) => moveCode(a) - moveCode(b)
  );

  const combos = [];
  const vertices = new Map();

  /*
   * A support state carries both:
   *
   *   address    — its integer point in Z^6
   *   modelPoint — its accumulated scaled geometric position
   */
  function stateFromUsage(usage) {
    const address = [...ZERO];
    let modelPoint = { ...ZERO_POINT };

    usage.forEach((usedCount, index) => {
      if (usedCount === 0) return;

      const moveType = moveTypes[index];

      address[moveType.axisIndex] +=
        moveType.sign * usedCount;

      modelPoint = addPoint3D(
        modelPoint,
        multiplyPoint3D(
          moveDeltaPoint3D(moveType),
          usedCount
        )
      );
    });

    return {
      address,
      modelPoint,
    };
  }

  function walk(index, usage) {
    if (index === moveTypes.length) {
      const state = stateFromUsage(usage);

      /*
       * The usage vector identifies the partial multiset.
       * Typed addresses alone cannot distinguish different
       * scales on the same axis.
       */
      const key = usage.join("|");

      const combo = {
        usage: [...usage],
        address: state.address,
        modelPoint: state.modelPoint,
        key,
      };

      combos.push(combo);

      vertices.set(key, {
        key,
        vector: state.address,
        modelPoint: state.modelPoint,
      });

      return;
    }

    for (
      let count = 0;
      count <= moveTypes[index].count;
      count += 1
    ) {
      usage[index] = count;
      walk(index + 1, usage);
    }
  }

  walk(
    0,
    Array.from({ length: moveTypes.length }, () => 0)
  );

  const comboByUsage = new Map(
    combos.map((combo) => [
      combo.usage.join("|"),
      combo,
    ])
  );

  const edges = new Map();

  combos.forEach((combo) => {
    moveTypes.forEach((moveType, moveTypeIndex) => {
      if (
        combo.usage[moveTypeIndex] >= moveType.count
      ) {
        return;
      }

      const nextUsage = [...combo.usage];
      nextUsage[moveTypeIndex] += 1;

      const nextCombo = comboByUsage.get(
        nextUsage.join("|")
      );

      if (!nextCombo) return;

      const edgeKey =
        `${combo.key}->${nextCombo.key}:${moveType.key}`;

      edges.set(edgeKey, {
        key: edgeKey,
        axisIndex: moveType.axisIndex,
        sign: moveType.sign,
        scaleId: moveType.scaleId,
        startVector: combo.address,
        endVector: nextCombo.address,
        startModelPoint: combo.modelPoint,
        endModelPoint: nextCombo.modelPoint,
      });
    });
  });

  return {
    vertices: Array.from(vertices.values()),
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

function makeArrowheadGeometry(start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);

  if (length < 0.01) return null;

  const unitX = dx / length;
  const unitY = dy / length;
  const perpendicularX = -unitY;
  const perpendicularY = unitX;

  const headLength = Math.min(
    7,
    Math.max(0.72, length * 0.42),
    length * 0.72
  );

  const halfWidth = Math.min(
    4.2,
    Math.max(0.45, headLength * 0.62),
    length * 0.45
  );

  const baseX = end.x - unitX * headLength;
  const baseY = end.y - unitY * headLength;

  return {
    tip: { x: end.x, y: end.y },
    left: {
      x: baseX + perpendicularX * halfWidth,
      y: baseY + perpendicularY * halfWidth,
    },
    right: {
      x: baseX - perpendicularX * halfWidth,
      y: baseY - perpendicularY * halfWidth,
    },
  };
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
  const segmentLength = distance2D(segment.start, segment.end);
  const radius = segmentLength / 2;

  const dotRadius = Math.min(
    4.4,
    Math.max(0.8, segmentLength * 0.22)
  );

  const centerRadius = Math.min(
    2.2,
    Math.max(0.6, segmentLength * 0.12)
  );

  if (progress.phase === "draw") {
    const head = lerpPoint(segment.start, segment.end, progress.t);

    return {
      phase: "draw",
      center,
      radius,
      dotRadius,
      centerRadius,
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
    dotRadius,
    centerRadius,
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
      scaleId: vertex.move.scaleId,
      start: projectPoint3D(previous.modelPoint, view),
      end: projectPoint3D(vertex.modelPoint, view),
    };
  });
}

function uniqueVisitedVertices(vertices, view) {
  const map = new Map();

  vertices.forEach((vertex) => {
    map.set(pointKey(vertex.modelPoint), vertex);
  });

  return Array.from(map.entries()).map(([key, vertex]) => ({
    key,
    vector: vertex.vector,
    point: projectPoint3D(vertex.modelPoint, view),
  }));
}

function lastMoveLabel(segment) {
  if (!segment) return "none";
  return `${segment.sign > 0 ? "+" : "−"}${moveTokenLabel(segment)}`;
}

export default function MoveSpaceViewer() {
  const [vertices, setVertices] = useState([makeOriginVertex()]);
  const [view, setView] = useState({
    ...DEFAULT_VIEW,
    center: DEFAULT_CENTER,
    orientation: makeOrientationAligningAxisRight(AXES[0].vector),
  });
  const [selectedAxisIndex, setSelectedAxisIndex] = useState(0);
  const [selectedTimeScaleId, setSelectedTimeScaleId] = useState(
    DEFAULT_TIME_SCALE_ID
  );
  const [selectedLengthScaleId, setSelectedLengthScaleId] = useState(
    DEFAULT_LENGTH_SCALE_ID
  );
  const [selectedChargeScaleId, setSelectedChargeScaleId] = useState(
    DEFAULT_CHARGE_SCALE_ID
  );
  const [selectedTemperatureScaleId, setSelectedTemperatureScaleId] = useState(
    DEFAULT_TEMPERATURE_SCALE_ID
  );
  const [selectedMassScaleId, setSelectedMassScaleId] = useState(
    DEFAULT_MASS_SCALE_ID
  );
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
  const timeScaleMenuRef = useRef(null);
  const lengthScaleMenuRef = useRef(null);
  const chargeScaleMenuRef = useRef(null);
  const temperatureScaleMenuRef = useRef(null);
  const massScaleMenuRef = useRef(null);

  useEffect(() => {
    function closeScaleMenus(event) {
      if (event.type === "keydown" && event.key !== "Escape") return;

      [
        timeScaleMenuRef.current,
        lengthScaleMenuRef.current,
        chargeScaleMenuRef.current,
        temperatureScaleMenuRef.current,
        massScaleMenuRef.current,
      ].forEach((menu) => {
        if (!menu?.open) return;
        if (event.type === "pointerdown" && menu.contains(event.target)) return;

        menu.removeAttribute("open");
      });
    }

    document.addEventListener("pointerdown", closeScaleMenus);
    document.addEventListener("keydown", closeScaleMenus);

    return () => {
      document.removeEventListener("pointerdown", closeScaleMenus);
      document.removeEventListener("keydown", closeScaleMenus);
    };
  }, []);

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
  const currentModelPoint = currentVertex.modelPoint;

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
        .map((move) => normalizeMove(move)),
    [vertices]
  );

  const activeMoveWord = useMemo(() => {
    const pendingMove = pendingSwap
      ? [normalizeMove(pendingSwap)]
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
        scaleId: pendingSwap.scaleId,
        start: projectPoint3D(pendingSwap.startModelPoint, view),
        end: projectPoint3D(pendingSwap.endModelPoint, view),
      }
    : null;

  const swapVisual = pendingSegment ? makeSwapVisual(pendingSegment, swapProgress) : null;

  const netArrow = useMemo(() => {
    if (!showNetArrow) return null;
    if (vertices.length <= 1) return null;

    if (netArrowHold) {
      const startVector = vertices[0].vector;
      const endVector = netArrowHold.baseEndVector;

      if (vectorKey(startVector) === vectorKey(endVector)) return null;

      return {
        start: projectVector(startVector, view),
        end: projectVector(endVector, view),
      };
    }

    const startPoint = vertices[0].modelPoint;

    if (pointKey(startPoint) === pointKey(currentModelPoint)) return null;

    return {
      start: projectPoint3D(startPoint, view),
      end: projectPoint3D(currentModelPoint, view),
    };
  }, [showNetArrow, vertices, currentModelPoint, view, netArrowHold]);

  const netArrowHeadGeometry = useMemo(
    () =>
      netArrow
        ? makeArrowheadGeometry(netArrow.start, netArrow.end)
        : null,
    [netArrow]
  );

  const netArrowExtensionVisual = useMemo(() => {
    if (!showNetArrow) return null;
    if (!netArrowExtension) return null;

    return {
      id: netArrowExtension.id,
      start: projectVector(netArrowExtension.startVector, view),
      end: projectVector(netArrowExtension.endVector, view),
    };
  }, [showNetArrow, netArrowExtension, view]);

  const netArrowExtensionHeadGeometry = useMemo(
    () =>
      netArrowExtensionVisual
        ? makeArrowheadGeometry(
            netArrowExtensionVisual.start,
            netArrowExtensionVisual.end
          )
        : null,
    [netArrowExtensionVisual]
  );

  const supportGraph = useMemo(() => {
    if (!showSupportGraph) {
      return { vertices: [], edges: [] };
    }

    if (orderableMoveWord.length === 0) {
      return { vertices: [], edges: [] };
    }

    const graph = supportGraphFromWord(
      orderableMoveWord
    );

    return {
      vertices: graph.vertices.map((vertex) => ({
        ...vertex,
        point: projectPoint3D(
          vertex.modelPoint,
          view
        ),
      })),

      edges: graph.edges.map((edge) => ({
        ...edge,
        start: projectPoint3D(
          edge.startModelPoint,
          view
        ),
        end: projectPoint3D(
          edge.endModelPoint,
          view
        ),
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
          modelPoint: pendingSwap.endModelPoint,
          move: normalizeMove(pendingSwap),
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
    beginPendingStep(nextMove.axisIndex, nextMove.sign, nextMove.scaleId);
  }, [repeatQueue, pendingSwap, currentAddress, currentModelPoint]);

  function beginPendingStep(axisIndex, sign, scaleId = null) {
    const move = normalizeMove({ axisIndex, sign, scaleId });
    const startVector = [...currentAddress];
    const endVector = addStep(startVector, move.axisIndex, move.sign);
    const startModelPoint = { ...currentModelPoint };
    const endModelPoint = addPoint3D(
      startModelPoint,
      moveDeltaPoint3D(move)
    );

    setPendingSwap({
      id: `${Date.now()}-${animationRun + 1}`,
      ...move,
      startVector,
      endVector,
      startModelPoint,
      endModelPoint,
    });

    setAnimationRun((run) => run + 1);
  }

  function step(axisIndex, sign, scaleId = null) {
    if (pendingSwap) return;

    setSelectedCompositeId(null);
    setCurrentOrderingWord([]);
    setRepeatQueue([]);
    setNetArrowHold(null);
    setNetArrowExtension(null);
    beginPendingStep(axisIndex, sign, scaleId);
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
    setVertices([makeOriginVertex()]);
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
    setVertices([makeOriginVertex()]);
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
            <small>{Math.max(0, vertices.length - 1)} typed vertex swaps</small>
            <small>last move: {lastMoveLabel(pendingSegment || segments[segments.length - 1] || null)}</small>
          </div>
        </header>

        <section className="stepController" aria-label="typed vertex-swap controls">
          <div className="axisStepButtons">
            {AXES.map((axis, axisIndex) => {
              const isTimeAxis = axisIndex === 0;
              const isLengthAxis = axisIndex === 1;
              const isChargeAxis = axisIndex === 2;
              const isTemperatureAxis = axisIndex === 3;
              const isMassAxis = axisIndex === 4;
              const isAmountAxis = axisIndex === 5;
              const hasScaleSelector =
                isTimeAxis ||
                isLengthAxis ||
                isChargeAxis ||
                isTemperatureAxis ||
                isMassAxis;
              const hasScaleDisplay = hasScaleSelector || isAmountAxis;
              const scales = isTimeAxis
                ? TIME_SCALES
                : isLengthAxis
                  ? LENGTH_SCALES
                  : isChargeAxis
                    ? CHARGE_SCALES
                    : isTemperatureAxis
                      ? TEMPERATURE_SCALES
                      : isMassAxis
                        ? MASS_SCALES
                        : isAmountAxis
                          ? AMOUNT_SCALES
                          : null;
              const scaleById = isTimeAxis
                ? TIME_SCALE_BY_ID
                : isLengthAxis
                  ? LENGTH_SCALE_BY_ID
                  : isChargeAxis
                    ? CHARGE_SCALE_BY_ID
                    : isTemperatureAxis
                      ? TEMPERATURE_SCALE_BY_ID
                      : isMassAxis
                        ? MASS_SCALE_BY_ID
                        : isAmountAxis
                          ? AMOUNT_SCALE_BY_ID
                          : null;
              const selectedScaleId = isTimeAxis
                ? selectedTimeScaleId
                : isLengthAxis
                  ? selectedLengthScaleId
                  : isChargeAxis
                    ? selectedChargeScaleId
                    : isTemperatureAxis
                      ? selectedTemperatureScaleId
                      : isMassAxis
                        ? selectedMassScaleId
                        : isAmountAxis
                          ? DEFAULT_AMOUNT_SCALE_ID
                          : null;
              const setSelectedScaleId = isTimeAxis
                ? setSelectedTimeScaleId
                : isLengthAxis
                  ? setSelectedLengthScaleId
                  : isChargeAxis
                    ? setSelectedChargeScaleId
                    : isTemperatureAxis
                      ? setSelectedTemperatureScaleId
                      : isMassAxis
                        ? setSelectedMassScaleId
                        : null;
              const scaleMenuRef = isTimeAxis
                ? timeScaleMenuRef
                : isLengthAxis
                  ? lengthScaleMenuRef
                  : isChargeAxis
                    ? chargeScaleMenuRef
                    : isTemperatureAxis
                      ? temperatureScaleMenuRef
                      : isMassAxis
                        ? massScaleMenuRef
                        : null;

              return (
                <div
                  className={
                    hasScaleDisplay
                      ? "axisStepCard timeScaleStepCard"
                      : "axisStepCard"
                  }
                  key={axis.key}
                  style={{ "--axis-color": axis.color }}
                >
                  <div className="axisStepLabel">
                    <b className="axisSymbol">{axis.label}</b>

                    {hasScaleSelector ? (
                      <details
                        ref={scaleMenuRef}
                        className={
                          pendingSwap
                            ? "timeScaleDropdown disabled"
                            : "timeScaleDropdown"
                        }
                      >
                        <summary
                          aria-label={`${axis.name} scale: ${
                            scaleById.get(selectedScaleId).controlLabel
                          }`}
                          onClick={(event) => {
                            if (pendingSwap) event.preventDefault();
                          }}
                        >
                          <span className="timeScaleMathLabel">
                            {scaleLabelParts(axisIndex, selectedScaleId).map(
                              (part, partIndex) =>
                                part.subscript ? (
                                  <sub
                                    className={`timeScaleSubscript ${
                                      part.className || ""
                                    }`}
                                    key={`${selectedScaleId}-${partIndex}`}
                                  >
                                    {part.text}
                                  </sub>
                                ) : (
                                  <span
                                    className={part.className || undefined}
                                    key={`${selectedScaleId}-${partIndex}`}
                                  >
                                    {part.text}
                                  </span>
                                )
                            )}
                          </span>
                          <span
                            className="timeScaleChevron"
                            aria-hidden="true"
                          />
                        </summary>

                        <div
                          className="timeScaleMenu"
                          role="listbox"
                          aria-label={`${axis.name} scale`}
                        >
                          {scales.map((scale) => {
                            const selected = scale.id === selectedScaleId;

                            return (
                              <button
                                type="button"
                                className={
                                  selected
                                    ? "timeScaleMenuOption selected"
                                    : "timeScaleMenuOption"
                                }
                                key={scale.id}
                                role="option"
                                aria-selected={selected}
                                onClick={() => {
                                  setSelectedScaleId(scale.id);
                                  scaleMenuRef.current?.removeAttribute("open");
                                }}
                              >
                                <span className="timeScaleMathLabel">
                                  {scaleLabelParts(axisIndex, scale.id).map(
                                    (part, partIndex) =>
                                      part.subscript ? (
                                        <sub
                                          className={`timeScaleSubscript ${
                                            part.className || ""
                                          }`}
                                          key={`${scale.id}-${partIndex}`}
                                        >
                                          {part.text}
                                        </sub>
                                      ) : (
                                        <span
                                          className={
                                            part.className || undefined
                                          }
                                          key={`${scale.id}-${partIndex}`}
                                        >
                                          {part.text}
                                        </span>
                                      )
                                  )}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </details>
                    ) : isAmountAxis ? (
                      <div
                        className="singleScaleDisplay"
                        aria-label="amount scale: mol"
                      >
                        <span className="timeScaleMathLabel">
                          {scaleLabelParts(
                            axisIndex,
                            DEFAULT_AMOUNT_SCALE_ID
                          ).map((part, partIndex) => (
                            <span
                              className={part.className || undefined}
                              key={`amount-scale-${partIndex}`}
                            >
                              {part.text}
                            </span>
                          ))}
                        </span>
                      </div>
                    ) : (
                      <span>{axis.name}</span>
                    )}
                  </div>

                  {hasScaleDisplay ? (
                    <div className="axisStepPair">
                      <button
                        type="button"
                        onClick={() =>
                          step(axisIndex, -1, selectedScaleId)
                        }
                        disabled={Boolean(pendingSwap)}
                        aria-label={`negative ${
                          scaleById.get(selectedScaleId).controlLabel
                        } ${axis.name} swap`}
                      >
                        <span className="axisSign">−</span>
                        <span className="axisSymbol">{axis.label}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          step(axisIndex, 1, selectedScaleId)
                        }
                        disabled={Boolean(pendingSwap)}
                        aria-label={`positive ${
                          scaleById.get(selectedScaleId).controlLabel
                        } ${axis.name} swap`}
                      >
                        <span className="axisSign">+</span>
                        <span className="axisSymbol">{axis.label}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="axisStepPair">
                      <button
                        type="button"
                        onClick={() => step(axisIndex, -1)}
                        disabled={Boolean(pendingSwap)}
                      >
                        <span className="axisSign">−</span>
                        <span className="axisSymbol">{axis.label}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => step(axisIndex, 1)}
                        disabled={Boolean(pendingSwap)}
                      >
                        <span className="axisSign">+</span>
                        <span className="axisSymbol">{axis.label}</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
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

            {visitedVertices.map((vertex) => {
              const isCurrent =
                vertex.key === pointKey(currentModelPoint);
              const isOrigin =
                vertex.key === pointKey(ZERO_POINT);
              const isNetArrowEndpoint =
                Boolean(netArrow) &&
                distance2D(vertex.point, netArrow.end) < 0.01;
              const isNetArrowExtensionEndpoint =
                Boolean(netArrowExtensionVisual) &&
                distance2D(vertex.point, netArrowExtensionVisual.end) < 0.01;

              if (isNetArrowEndpoint || isNetArrowExtensionEndpoint) {
                return null;
              }

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

            {netArrow && (
              <g className="netArrowLayer">
                <line
                  className="netArrow"
                  x1={netArrow.start.x}
                  y1={netArrow.start.y}
                  x2={netArrow.end.x}
                  y2={netArrow.end.y}
                />

                {netArrowHeadGeometry && (
                  <polyline
                    className="netArrowHead"
                    points={`${netArrowHeadGeometry.left.x},${netArrowHeadGeometry.left.y} ${netArrowHeadGeometry.tip.x},${netArrowHeadGeometry.tip.y} ${netArrowHeadGeometry.right.x},${netArrowHeadGeometry.right.y}`}
                  />
                )}
              </g>
            )}

            {netArrowExtensionVisual && (
              <g
                key={`net-extension-${netArrowExtensionVisual.id}`}
                className="netArrowLayer"
              >
                <line
                  className="netArrow netArrowExtension"
                  x1={netArrowExtensionVisual.start.x}
                  y1={netArrowExtensionVisual.start.y}
                  x2={netArrowExtensionVisual.end.x}
                  y2={netArrowExtensionVisual.end.y}
                  pathLength="1"
                />

                {netArrowExtensionHeadGeometry && (
                  <polyline
                    className="netArrowHead"
                    points={`${netArrowExtensionHeadGeometry.left.x},${netArrowExtensionHeadGeometry.left.y} ${netArrowExtensionHeadGeometry.tip.x},${netArrowExtensionHeadGeometry.tip.y} ${netArrowExtensionHeadGeometry.right.x},${netArrowExtensionHeadGeometry.right.y}`}
                  />
                )}
              </g>
            )}

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
                    r={swapVisual.centerRadius}
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
                    r={swapVisual.dotRadius}
                  />

                  <circle
                    className="swapTargetDot"
                    cx={swapVisual.targetDot.x}
                    cy={swapVisual.targetDot.y}
                    r={swapVisual.dotRadius}
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
                  const isScaledMove =
                    move.axisIndex === 0 ||
                    move.axisIndex === 1 ||
                    move.axisIndex === 2 ||
                    move.axisIndex === 3 ||
                    move.axisIndex === 4 ||
                    move.axisIndex === 5;

                  return (
                    <span
                      className="wordToken"
                      key={`word-${index}-${axis.key}-${move.sign}-${move.scaleId || "unit"}`}
                      style={{ "--axis-color": axis.color }}
                    >
                      <span className="axisSign">{move.sign > 0 ? "+" : "−"}</span>
                      {isScaledMove ? (
                        <span className="timeScaleMathLabel wordScaleLabel">
                          {scaleLabelParts(move.axisIndex, move.scaleId).map(
                            (part, partIndex) =>
                              part.subscript ? (
                                <sub
                                  className={`timeScaleSubscript ${
                                    part.className || ""
                                  }`}
                                  key={`word-scale-${index}-${partIndex}`}
                                >
                                  {part.text}
                                </sub>
                              ) : (
                                <span
                                  className={part.className || undefined}
                                  key={`word-scale-${index}-${partIndex}`}
                                >
                                  {part.text}
                                </span>
                              )
                          )}
                        </span>
                      ) : (
                        <span className="axisSymbol">
                          {moveTokenLabel(move)}
                        </span>
                      )}
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

        .timeScaleDropdown {
          position: relative;
          z-index: 20;
          width: 82px;
          min-width: 0;
          flex: 0 0 82px;
          color: var(--axis-color);
        }

        .timeScaleDropdown > summary {
          display: flex;
          width: 100%;
          min-height: 30px;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          box-sizing: border-box;
          border: 1px solid rgba(232, 223, 200, 0.18);
          border-radius: 5px;
          padding: 4px 9px;
          background: rgba(0, 0, 0, 0.3);
          cursor: pointer;
          list-style: none;
        }

        .singleScaleDisplay {
          display: flex;
          width: 82px;
          min-width: 0;
          min-height: 30px;
          flex: 0 0 82px;
          align-items: center;
          justify-content: flex-start;
          box-sizing: border-box;
          border: 1px solid rgba(232, 223, 200, 0.18);
          border-radius: 5px;
          padding: 4px 9px;
          color: var(--axis-color);
          background: rgba(0, 0, 0, 0.3);
        }

        .timeScaleDropdown > summary::-webkit-details-marker {
          display: none;
        }

        .timeScaleDropdown.disabled > summary {
          cursor: not-allowed;
          opacity: 0.42;
        }

        .timeScaleMathLabel {
          display: inline-flex;
          align-items: baseline;
          color: inherit;
          font-family: "KaTeX_Main", "Latin Modern Math", "STIX Two Math", "Cambria Math", "Times New Roman", serif;
          font-size: 14px;
          font-style: normal;
          font-weight: 400;
          line-height: 1;
          white-space: nowrap;
        }

        .timeScaleMathLabel .axisSymbol {
          font-family: "KaTeX_Math", "KaTeX_Main", "Latin Modern Math", "STIX Two Math", "Cambria Math", "Times New Roman", serif;
          font-style: italic;
        }

        .timeScaleRoman {
          font-family: "KaTeX_Main", "Latin Modern Math", "STIX Two Math", "Cambria Math", "Times New Roman", serif;
          font-style: normal;
        }

        .timeScaleSubscript {
          position: relative;
          bottom: -0.22em;
          margin-left: 0.02em;
          font-size: 0.68em;
          line-height: 0;
        }

        .timeScaleChevron {
          width: 7px;
          height: 7px;
          flex: 0 0 auto;
          border-right: 1.5px solid currentColor;
          border-bottom: 1.5px solid currentColor;
          transform: rotate(45deg) translateY(-2px);
          transform-origin: center;
          transition: transform 120ms ease;
        }

        .timeScaleDropdown[open] .timeScaleChevron {
          transform: rotate(225deg) translateY(-1px);
        }

        .timeScaleMenu {
          position: absolute;
          top: calc(100% + 5px);
          right: 0;
          z-index: 30;
          display: grid;
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
          max-height: min(420px, 65vh);
          overflow-y: auto;
          overscroll-behavior: contain;
          gap: 2px;
          padding: 4px;
          border: 1px solid rgba(232, 223, 200, 0.24);
          border-radius: 6px;
          background: #1a1a1a;
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.48);
        }

        .timeScaleMenuOption {
          display: flex;
          width: 100%;
          min-height: 31px;
          align-items: center;
          justify-content: flex-start;
          border-color: transparent;
          padding: 6px 9px;
          color: var(--axis-color);
          background: transparent;
          text-align: left;
        }

        .timeScaleMenuOption:hover,
        .timeScaleMenuOption.selected {
          border-color: var(--axis-color);
          background: rgba(255, 255, 255, 0.07);
        }

        .axisStepLabel {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          align-items: baseline;
        }

        .axisStepLabel b {
          color: var(--axis-color);
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

        .axisStepLabel > span {
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

        .wordScaleLabel {
          font-size: inherit;
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

        .netArrowHead {
          fill: none;
          stroke: #ffe1ac;
          stroke-width: 1.8;
          stroke-linecap: round;
          stroke-linejoin: round;
          vector-effect: non-scaling-stroke;
          filter: drop-shadow(0 0 3px rgba(255, 225, 172, 0.68));
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
