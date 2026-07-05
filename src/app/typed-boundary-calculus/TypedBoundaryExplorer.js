"use client";

import { useEffect, useMemo, useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import {
  TYPE_AXES,
  formatType,
  formatTypeDetailed,
  addType,
  scaleType,
  equalType,
} from "../../lib/typed-boundary-calculus/typeVector";
import {
  formatBoundaryPathWord,
  formatStructuredProduct,
  formatBoundaryPathLatex,
  formatStructuredProductLatex,
  getRepresentativePathFactors,
  getPathFamilyMetadata,
  BOX_WORD,
} from "../../lib/typed-boundary-calculus/boundaryWords";
import { getBoundaryToken } from "../../lib/typed-boundary-calculus/boundaryTokens";
import { SECTOR_BLOCKS, SECTOR_METRIC_DIAGONAL } from "../../lib/typed-boundary-calculus/sectorBlocks";
import { SEED_TRANSFORMS, SEED_TYPED_OBJECTS, MODEL_VALIDATION } from "../../lib/typed-boundary-calculus/seedDictionary";
import { UNIT_TRANSFORMS, UNIT_SELECTOR_GROUPS } from "../../lib/typed-boundary-calculus/unitDictionary";
import { validatePairedTransform } from "../../lib/typed-boundary-calculus/validators";

const PROSE_FONT = '"Times New Roman", Times, serif';
const MATH_FONT = '"Cambria Math", "STIX Two Math", "DejaVu Serif", "Times New Roman", serif';

const AXIS_LABEL_MODE = "symbols";

const AXIS_SYMBOL_LABELS = {
  t: "t",
  l: "l",
  q: "q",
  theta: "T",
  m: "m",
  n: "n",
};

const AXIS_WORD_LABELS = {
  t: "time",
  l: "length",
  q: "charge",
  theta: "temperature",
  m: "mass",
  n: "amount",
};

const AXIS_STEP_COLORS = {
  t: "#ff3030",      // time: bright red
  l: "#ffe600",      // space/length: bright yellow
  q: "#2f8cff",      // charge: electric blue
  theta: "#00ff66",  // temperature: bright green
  m: "#ff4dff",      // mass: bright magenta
  n: "#00fff0",      // mol/amount: bright cyan
};

function axisStepColor(axisKey) {
  return AXIS_STEP_COLORS[axisKey] ?? "#fff7df";
}

const TOKEN_AXIS_KEYS = {
  t_p: "t",
  l_p: "l",
  q_p: "q",
  T_p: "theta",
  m_p: "m",
  N_A: "n",
  s_SI: "t",
  m_SI: "l",
  C_SI: "q",
  K_SI: "theta",
  kg_SI: "m",
  mol_SI: "n",
};

function axisKeyForTraceEntry(entry) {
  return TOKEN_AXIS_KEYS[entry?.factor?.tokenId];
}

function stepColorForTraceEntry(entry) {
  const axisKey = axisKeyForTraceEntry(entry);
  return axisStepColor(axisKey);
}

function makeAllAxesVisible() {
  return TYPE_AXES.reduce(
    (visibility, axis) => ({
      ...visibility,
      [axis.key]: true,
    }),
    {}
  );
}

function visibleAxisLabel(axisKey) {
  return AXIS_WORD_LABELS[axisKey] ?? axisKey;
}

function undirectedSegmentKey(sourceType, targetType, axisKey) {
  const sourceKey = typeKey(sourceType);
  const targetKey = typeKey(targetType);
  const ordered = sourceKey < targetKey
    ? `${sourceKey}<->${targetKey}`
    : `${targetKey}<->${sourceKey}`;

  return `${axisKey}|${ordered}`;
}

function countConnectedSegmentComponents(segments) {
  if (segments.length === 0) return 0;

  const adjacency = new Map();

  const addNeighbor = (a, b) => {
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    adjacency.get(a).add(b);
  };

  segments.forEach((segment) => {
    const sourceKey = typeKey(segment.sourceType);
    const targetKey = typeKey(segment.targetType);

    addNeighbor(sourceKey, targetKey);
    addNeighbor(targetKey, sourceKey);
  });

  const visited = new Set();
  let components = 0;

  Array.from(adjacency.keys()).forEach((startKey) => {
    if (visited.has(startKey)) return;

    components += 1;
    const stack = [startKey];
    visited.add(startKey);

    while (stack.length > 0) {
      const key = stack.pop();
      const neighbors = adjacency.get(key) ?? new Set();

      neighbors.forEach((neighbor) => {
        if (visited.has(neighbor)) return;
        visited.add(neighbor);
        stack.push(neighbor);
      });
    }
  });

  return components;
}

const AXIS_ROTATION_STEP = Math.PI / 36;

const MAX_TRANSFORM_HOPS = 7;
const STEP_ANIMATION_MS = 70;
const ROUTE_CYCLE_PLAYBACK_MS = 950;
const ROUTE_STACK_PLAYBACK_MS = 320;

const DEFAULT_LATTICE_ROTATION = { yaw: 0, pitch: 0.42 };

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

function rotatePointAroundAxis(point, axis, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dot = point.x * axis.x + point.y * axis.y + point.z * axis.z;

  return {
    x:
      point.x * cos +
      (axis.y * point.z - axis.z * point.y) * sin +
      axis.x * dot * (1 - cos),
    y:
      point.y * cos +
      (axis.z * point.x - axis.x * point.z) * sin +
      axis.y * dot * (1 - cos),
    z:
      point.z * cos +
      (axis.x * point.y - axis.y * point.x) * sin +
      axis.z * dot * (1 - cos),
  };
}

function applyOrientation(point, orientation = IDENTITY_ORIENTATION) {
  return {
    x: point.x * orientation.i.x + point.y * orientation.j.x + point.z * orientation.k.x,
    y: point.x * orientation.i.y + point.y * orientation.j.y + point.z * orientation.k.y,
    z: point.x * orientation.i.z + point.y * orientation.j.z + point.z * orientation.k.z,
  };
}

function rotateOrientationAboutAxis(orientation, axisKey, angle) {
  const rawAxis = AXIS_3D[axisKey] ?? AXIS_3D.t;
  const currentAxis = normalize3D(applyOrientation(rawAxis, orientation));

  return {
    i: rotatePointAroundAxis(orientation.i, currentAxis, angle),
    j: rotatePointAroundAxis(orientation.j, currentAxis, angle),
    k: rotatePointAroundAxis(orientation.k, currentAxis, angle),
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

function makeOrientationAligningAxisToPositiveX(axisKey) {
  const source = normalize3D(AXIS_3D[axisKey] ?? AXIS_3D.t);
  const target = { x: 1, y: 0, z: 0 };
  const cross = cross3D(source, target);
  const crossLength = Math.hypot(cross.x, cross.y, cross.z);
  const dot = clampNumber(dot3D(source, target), -1, 1);

  if (crossLength < 1e-10) {
    if (dot > 0) return makeIdentityOrientation();

    // 180-degree flip for the rare case where the chosen axis is exactly -x.
    const fallbackAxis = Math.abs(source.y) < 0.9
      ? normalize3D(cross3D(source, { x: 0, y: 1, z: 0 }))
      : normalize3D(cross3D(source, { x: 0, y: 0, z: 1 }));

    return {
      i: rotatePointAroundAxis(IDENTITY_ORIENTATION.i, fallbackAxis, Math.PI),
      j: rotatePointAroundAxis(IDENTITY_ORIENTATION.j, fallbackAxis, Math.PI),
      k: rotatePointAroundAxis(IDENTITY_ORIENTATION.k, fallbackAxis, Math.PI),
    };
  }

  const rotationAxis = {
    x: cross.x / crossLength,
    y: cross.y / crossLength,
    z: cross.z / crossLength,
  };
  const angle = Math.acos(dot);

  return {
    i: rotatePointAroundAxis(IDENTITY_ORIENTATION.i, rotationAxis, angle),
    j: rotatePointAroundAxis(IDENTITY_ORIENTATION.j, rotationAxis, angle),
    k: rotatePointAroundAxis(IDENTITY_ORIENTATION.k, rotationAxis, angle),
  };
}

function typeDelta(sourceType, targetType) {
  return TYPE_AXES.reduce(
    (delta, axis) => ({
      ...delta,
      [axis.key]: (targetType[axis.key] ?? 0) - (sourceType[axis.key] ?? 0),
    }),
    {}
  );
}

function offsetTypeByDelta(type, delta, multiplier = 1) {
  return addType(type, scaleType(multiplier, delta));
}

function makeRepeatedBoundaryTraces(transform, hopCount, pathOptions = {}) {
  const boundedHopCount = Math.max(1, Math.min(hopCount, MAX_TRANSFORM_HOPS));
  const displacement = typeDelta(transform.sourceType, transform.targetType);

  return Array.from({ length: boundedHopCount }, (_, hopIndex) => {
    const hopSourceType = offsetTypeByDelta(transform.sourceType, displacement, hopIndex);

    return traceBoundaryPath(hopSourceType, transform.ordinaryLeg.boundaryWord, pathOptions);
  });
}

function visibleStepsForHop(revealedStepCount, stepsPerHop, hopIndex) {
  if (stepsPerHop <= 0) return 0;
  return clampNumber(revealedStepCount - hopIndex * stepsPerHop, 0, stepsPerHop);
}

function axisDisplayLabel(axisKey) {
  return AXIS_LABEL_MODE === "words"
    ? AXIS_WORD_LABELS[axisKey]
    : AXIS_SYMBOL_LABELS[axisKey];
}

function formatViewerTypeDetailed(type) {
  return TYPE_AXES.map((axis) => `${axisDisplayLabel(axis.key)}:${type[axis.key] ?? 0}`).join(" ");
}

function unitTypeSignature(type = {}) {
  return TYPE_AXES.map((axis) => type[axis.key] ?? 0).join(",");
}

const UNIT_KIND_BY_UNIT_ID = {
  second: "time",
  meter: "length",
  coulomb: "electric charge",
  kelvin: "thermodynamic temperature",
  kilogram: "mass",
  mole: "amount of substance",

  hertz: "frequency",
  velocity: "velocity",
  acceleration: "acceleration",

  noether: "momentum",
  newton: "force",
  joule: "energy",
  watt: "power",
  pascal: "pressure",

  ampere: "electric current",
  volt: "electric potential",
  ohm: "electrical resistance",
  siemens: "electrical conductance",
  farad: "capacitance",
  henry: "inductance",
  tesla: "magnetic flux density",
  weber: "magnetic flux",

  joule_per_kelvin: "heat capacity",
  coulomb_per_mole: "molar charge",
  joule_per_mole: "molar energy",
  joule_per_mole_kelvin: "molar heat capacity",
  kilogram_per_mole: "molar mass",
};

const UNIT_KIND_BY_TYPE_SIGNATURE = {
  "1,0,0,0,0,0": "time",
  "0,1,0,0,0,0": "length",
  "0,0,1,0,0,0": "electric charge",
  "0,0,0,1,0,0": "thermodynamic temperature",
  "0,0,0,0,1,0": "mass",
  "0,0,0,0,0,1": "amount of substance",

  "-1,0,0,0,0,0": "frequency",
  "-1,1,0,0,0,0": "velocity",
  "-2,1,0,0,0,0": "acceleration",
  "0,-1,0,0,0,0": "wavenumber",
  "0,-3,0,0,0,0": "inverse volume",
  "0,2,0,0,0,0": "area",
  "0,3,0,0,0,0": "volume",
  "0,-3,0,0,1,0": "density",

  "-1,1,0,0,1,0": "momentum",
  "-2,1,0,0,1,0": "force",
  "-2,2,0,0,1,0": "energy",
  "-3,2,0,0,1,0": "power",
  "-2,-1,0,0,1,0": "pressure",

  "-1,0,1,0,0,0": "electric current",
  "-2,2,-1,0,1,0": "electric potential",
  "-1,2,-2,0,1,0": "electrical resistance",
  "1,-2,2,0,-1,0": "electrical conductance",
  "2,-2,2,0,-1,0": "electrical capacitance",
  "0,2,-2,0,1,0": "electrical inductance",
  "-1,2,-1,0,1,0": "magnetic flux",
  "-1,0,-1,0,1,0": "magnetic flux density",

  "-2,2,0,-1,1,0": "heat capacity",
  "0,0,1,0,0,-1": "molar charge",
  "-2,2,0,0,1,-1": "molar energy",
  "-2,2,0,-1,1,-1": "molar heat capacity",
  "0,0,0,0,1,-1": "molar mass",

  "-1,2,0,0,1,0": "action",
};

function unitIdKey(transform) {
  return String(transform?.id ?? "").replace(/^unit_/, "");
}

function unitKindFromName(transform) {
  const name = String(transform?.name ?? "").trim();
  const lowerName = name.toLowerCase();

  if (!name || name === "custom address") return null;

  const specificNames = {
    "inverse cubic meter": "inverse volume",
    "square meter per second": "diffusivity",

    "newtonian gravitation unit": "gravitational constant",
    "newtonian constant of gravitation unit": "gravitational constant",

    "electric polarizability unit": "electric polarizability",
    "first hyperpolarizability unit": "first hyperpolarizability",
    "second hyperpolarizability unit": "second hyperpolarizability",
    "magnetizability unit": "magnetizability",
    "permittivity unit": "permittivity",

    "electric dipole moment unit": "electric dipole moment",
    "electric quadrupole moment unit": "electric quadrupole moment",
    "magnetic dipole moment unit": "magnetic dipole moment",
  };

  return (
    specificNames[lowerName]
    ?? name
      .replace(/\s+type$/i, "")
      .replace(/\s+unit$/i, "")
  );
}

function unitKindLabel(transform) {
  const idKind = UNIT_KIND_BY_UNIT_ID[unitIdKey(transform)];
  const nameKind = unitKindFromName(transform);
  const typeKind = UNIT_KIND_BY_TYPE_SIGNATURE[unitTypeSignature(transform?.targetType)];
  const kind = idKind ?? nameKind ?? typeKind;

  return kind ? `unit of ${kind}` : "unit";
}




const CUSTOM_ADDRESS_ID = "custom_six_axis_address";

const CUSTOM_ADDRESS_INITIAL = {
  t: 0,
  l: 0,
  q: 0,
  theta: 0,
  m: 0,
  n: 0,
};

const CUSTOM_AXIS_TOKENS = {
  t: "t_p",
  l: "l_p",
  q: "q_p",
  theta: "T_p",
  m: "m_p",
  n: "N_A",
};

function makeZeroTypeAddress() {
  return TYPE_AXES.reduce(
    (address, axis) => ({
      ...address,
      [axis.key]: 0,
    }),
    {}
  );
}

function clampSingleDigitAddressValue(rawValue) {
  const parsed = Number.parseInt(String(rawValue), 10);
  if (!Number.isFinite(parsed)) return 0;
  return clampNumber(parsed, -9, 9);
}

function customAddressSignature(address) {
  return TYPE_AXES.map((axis) => address[axis.key] ?? 0).join("_");
}

function customAddressBoundaryFactors(address) {
  return TYPE_AXES.flatMap((axis) => {
    const value = address[axis.key] ?? 0;
    if (value === 0) return [];

    // N_A is inverse amount in this boundary model.
    // Positive mol address therefore uses N_A^-1.
    const exponent = axis.key === "n" ? -value : value;

    return [
      {
        tokenId: CUSTOM_AXIS_TOKENS[axis.key],
        exponent,
      },
    ];
  });
}

function makeCustomAddressTransform(address) {
  const targetType = TYPE_AXES.reduce(
    (type, axis) => ({
      ...type,
      [axis.key]: address[axis.key] ?? 0,
    }),
    {}
  );

  const boundaryWord = {
    factors: customAddressBoundaryFactors(address),
  };

  return {
    id: `${CUSTOM_ADDRESS_ID}_${customAddressSignature(address)}`,
    modelKind: "unit_model",
    name: "custom address",
    symbol: "custom",
    unitFormula: "custom address",
    aliases: [],
    sourceType: makeZeroTypeAddress(),
    targetType,
    ordinaryLeg: {
      boundaryWord,
      netTypeDisplacement: targetType,
    },
    inversionLeg: {
      boundaryWord,
      netTypeDisplacement: targetType,
    },
  };
}

export default function TypedBoundaryExplorer() {
  const [selectedId, setSelectedId] = useState(null);
  const [unitFieldMode, setUnitFieldMode] = useState("grid");
  const [unitFieldModeChangeKey, setUnitFieldModeChangeKey] = useState(0);
  const [customAddress, setCustomAddress] = useState(CUSTOM_ADDRESS_INITIAL);

  const selectedTransform = useMemo(() => {
    if (selectedId === CUSTOM_ADDRESS_ID) {
      return makeCustomAddressTransform(customAddress);
    }

    return UNIT_TRANSFORMS.find((transform) => transform.id === selectedId)
      ?? makeCustomAddressTransform(CUSTOM_ADDRESS_INITIAL);
  }, [selectedId, customAddress]);

  const selectedChecks = useMemo(
    () =>
      selectedId === CUSTOM_ADDRESS_ID || selectedId === null
        ? []
        : validatePairedTransform(selectedTransform),
    [selectedTransform, selectedId]
  );

  const handleUnitFieldModeChange = (mode) => {
    setUnitFieldMode(mode);
    setUnitFieldModeChangeKey((key) => key + 1);
  };

  const handleCustomAddressChange = (axisKey, rawValue) => {
    const value = clampSingleDigitAddressValue(rawValue);

    setCustomAddress((previous) => ({
      ...previous,
      [axisKey]: value,
    }));

    setSelectedId(CUSTOM_ADDRESS_ID);
    handleUnitFieldModeChange("selected");
  };

  return (
    <main
      style={{
        position: "relative",
        zIndex: 1,
        minHeight: "100vh",
        width: "calc(100vw - var(--sidebar-width, 142px))",
        maxWidth: "none",
        padding: "42px 20px 72px",
        color: "#e8dfc8",
        fontFamily: PROSE_FONT,
        boxSizing: "border-box",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "none",
          margin: "0",
          background: "rgba(0, 0, 0, 0.50)",
          border: "1px solid rgba(232, 223, 200, 0.22)",
          borderRadius: "0px",
          padding: "16px",
          boxShadow: "0 18px 60px rgba(0,0,0,0.45)",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        <header style={{ maxWidth: "none" }}>
          <h1
            style={{
              margin: "0 0 16px",
              fontSize: "clamp(18px, 2.5vw, 20px)",
              lineHeight: 1.04,
              letterSpacing: "0.02em",
              fontWeight: 500,
            }}
          >
            Typed Boundary Calculus: Unit Model
          </h1>

          <p
            style={{
              margin: 0,
              fontSize: "clamp(14px, 2.0vw, 14px)",
              lineHeight: 1.48,
              maxWidth: "none",
            }}
          >
            A six-axis dimensional address model for the unit combinations that
            populate the constants of Nature. Each named unit is represented as a
            unit monomial, an admissible route family, and a net type displacement
            in the projected ℤ⁶ lattice.
          </p>
        </header>

        <div
          style={{
            marginTop: "32px",
            display: "grid",
            gridTemplateColumns: "minmax(250px, 0.32fr) minmax(720px, 1.68fr)",
            gap: "20px",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <Panel title="Unit Selector">
            <TransformSelector
              transforms={UNIT_TRANSFORMS}
              groups={UNIT_SELECTOR_GROUPS}
              selectedId={selectedId}
              onSelect={(id) => {
                handleUnitFieldModeChange("selected");
                setSelectedId(id);
              }}
              unitFieldMode={unitFieldMode}
              onUnitFieldModeChange={handleUnitFieldModeChange}
              customAddress={customAddress}
              customSelected={selectedId === CUSTOM_ADDRESS_ID && unitFieldMode === "selected"}
              onCustomAddressChange={handleCustomAddressChange}
            />
          </Panel>

          <Panel
            title={
              <>
                <LatexInline latex={String.raw`\mathbb{Z}^{6}`} /> Type Lattice Projection
              </>
            }
          >
            <LatticeProjection
              transform={selectedTransform}
              unitFieldMode={unitFieldMode}
              unitFieldModeChangeKey={unitFieldModeChangeKey}
              onUnitFieldModeChange={handleUnitFieldModeChange}
            />
          </Panel>

        </div>

        <div style={{ marginTop: "20px" }}>
          <Panel title={isUnitModelTransform(selectedTransform) ? "Unit Inspector" : "Transform Inspector"}>
            <TransformInspectorDashboard transform={selectedTransform} checks={selectedChecks} />
          </Panel>
        </div>

        <div style={{ marginTop: "20px" }}>
          <Panel title={isUnitModelTransform(selectedTransform) ? "Unit Model Details" : "Model Details"}>
            {isUnitModelTransform(selectedTransform) ? (
              <UnitModelDetails />
            ) : (
              <>
                <details>
                  <summary style={summaryStyle}>Boundary object registry</summary>
                  <div style={{ marginTop: "14px" }}>
                    <ObjectSummary objects={SEED_TYPED_OBJECTS} />
                  </div>
                </details>

                <Divider />

                <details>
                  <summary style={summaryStyle}>Model validators</summary>
                  <div style={{ marginTop: "14px" }}>
                    <ValidationSummary />
                  </div>
                </details>
              </>
            )}
          </Panel>
        </div>
      </section>
    </main>
  );
}

function TransformSelector({
  transforms,
  groups,
  selectedId,
  onSelect,
  unitFieldMode = "selected",
  onUnitFieldModeChange = () => {},
  customAddress = CUSTOM_ADDRESS_INITIAL,
  customSelected = false,
  onCustomAddressChange = () => {},
}) {
  const selectorGroups =
    groups ??
    [
      {
        title: "Generic tests",
        ids: ["generic_velocity_transform", "generic_energy_temperature_transform"],
      },
      {
        title: "Amount / molar tests",
        ids: [
          "avogadro_amount_transform",
          "faraday_transform",
          "gas_constant_transform",
          "molar_mass_transform",
        ],
      },
    ];

  const byId = new Map(transforms.map((transform) => [transform.id, transform]));

  const baseGroups = selectorGroups.filter((group) => /base/i.test(group.title));
  const remainingGroups = selectorGroups.filter((group) => !/base/i.test(group.title));
  const orderedGroups = [...baseGroups, ...remainingGroups];

  const [customAddressDraft, setCustomAddressDraft] = useState(() =>
    TYPE_AXES.reduce(
      (draft, axis) => ({
        ...draft,
        [axis.key]: String(customAddress[axis.key] ?? 0),
      }),
      {}
    )
  );

  useEffect(() => {
    setCustomAddressDraft(
      TYPE_AXES.reduce(
        (draft, axis) => ({
          ...draft,
          [axis.key]: String(customAddress[axis.key] ?? 0),
        }),
        {}
      )
    );
  }, [customAddress]);

  const focusCustomAddressInput = (index) => {
    const wrappedIndex = ((index % TYPE_AXES.length) + TYPE_AXES.length) % TYPE_AXES.length;

    window.requestAnimationFrame(() => {
      const input = document.querySelector(`[data-custom-address-index="${wrappedIndex}"]`);
      input?.focus();
      input?.select?.();
    });
  };

  const commitCustomAddressInputValue = (axisKey, rawValue) => {
    const cleanedValue = String(rawValue).trim();

    if (cleanedValue === "" || cleanedValue === "-") {
      setCustomAddressDraft((previous) => ({
        ...previous,
        [axisKey]: "0",
      }));
      onCustomAddressChange(axisKey, 0);
      return;
    }

    const value = clampSingleDigitAddressValue(cleanedValue);

    setCustomAddressDraft((previous) => ({
      ...previous,
      [axisKey]: String(value),
    }));

    onCustomAddressChange(axisKey, value);
  };

  const updateCustomAddressDraft = (axisKey, rawValue) => {
    const cleanedValue = String(rawValue).replace(/[^0-9-]/g, "");

    if (!/^-?\d?$/.test(cleanedValue)) return;

    setCustomAddressDraft((previous) => ({
      ...previous,
      [axisKey]: cleanedValue,
    }));

    if (cleanedValue !== "" && cleanedValue !== "-") {
      onCustomAddressChange(axisKey, cleanedValue);
    }
  };

  const renderAllMovesSection = () => (
    <div
      style={{
        paddingBottom: "10px",
        borderBottom: "1px solid rgba(232,223,200,0.16)",
      }}
    >
      <div
        style={{
          marginBottom: "6px",
          fontSize: "12px",
          opacity: 0.68,
          letterSpacing: "0.03em",
          textTransform: "uppercase",
        }}
      >
        all moves from source
      </div>

      <div style={{ display: "grid", gap: "5px" }}>
        {[
          ["white", "all net arrows"],
          ["canonical", "all canonical paths"],
          ["allpaths", "full support grid"],
        ].map(([mode, label]) => {
          const active = unitFieldMode === mode;

          return (
            <button
              key={mode}
              type="button"
              onClick={() => onUnitFieldModeChange(mode)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "6px 8px",
                borderRadius: "5px",
                cursor: "pointer",
                color: "#e8dfc8",
                background: active ? "rgba(232, 223, 200, 0.18)" : "rgba(255,255,255,0.045)",
                border: active
                  ? "1px solid rgba(232, 223, 200, 0.48)"
                  : "1px solid rgba(232, 223, 200, 0.12)",
                fontFamily: PROSE_FONT,
                fontSize: "12px",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderCustomAddressSection = () => (
    <div
      style={{
        paddingBottom: "10px",
        borderBottom: "1px solid rgba(232,223,200,0.16)",
      }}
    >
      <div
        style={{
          marginBottom: "8px",
          fontSize: "12px",
          opacity: 0.68,
          letterSpacing: "0.03em",
          textTransform: "uppercase",
        }}
      >
        custom address
      </div>

      <div
        role="group"
        aria-label="Custom six-component address"
        onClick={() => onSelect(CUSTOM_ADDRESS_ID)}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "7px 8px",
          borderRadius: "7px",
          cursor: "text",
          color: "#e8dfc8",
          background: customSelected ? "rgba(232, 223, 200, 0.13)" : "rgba(255,255,255,0.045)",
          border: customSelected
            ? "1px solid rgba(232, 223, 200, 0.40)"
            : "1px solid rgba(232, 223, 200, 0.14)",
          fontFamily: MATH_FONT,
          fontSize: "18px",
          lineHeight: 1.18,
          textAlign: "left",
          whiteSpace: "nowrap",
          overflowX: "auto",
        }}
      >
        <span style={{ color: "#e8dfc8" }}>(</span>
        {TYPE_AXES.map((axis, index) => (
          <span key={axis.key}>
            <input
              data-custom-address-index={index}
              aria-label={`Custom address ${AXIS_WORD_LABELS[axis.key] ?? axis.key} component`}
              type="text"
              inputMode="numeric"
              value={customAddressDraft[axis.key] ?? String(customAddress[axis.key] ?? 0)}
              onChange={(event) => updateCustomAddressDraft(axis.key, event.target.value)}
              onFocus={(event) => {
                onSelect(CUSTOM_ADDRESS_ID);
                event.currentTarget.select();
              }}
              onBlur={(event) => commitCustomAddressInputValue(axis.key, event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "ArrowRight") {
                  event.preventDefault();
                  focusCustomAddressInput(index + 1);
                  return;
                }

                if (event.key === "ArrowLeft") {
                  event.preventDefault();
                  focusCustomAddressInput(index - 1);
                  return;
                }

                if (event.key === "Enter") {
                  event.preventDefault();
                  commitCustomAddressInputValue(axis.key, event.currentTarget.value);
                  focusCustomAddressInput(index + 1);
                }
              }}
              style={{
                width: "1.85ch",
                border: "none",
                borderBottom: customSelected
                  ? `1px solid ${axisStepColor(axis.key)}`
                  : "1px solid transparent",
                borderRadius: 0,
                background: "transparent",
                color: axisStepColor(axis.key),
                fontFamily: MATH_FONT,
                fontSize: "inherit",
                fontWeight: 600,
                lineHeight: 1,
                textAlign: "center",
                outline: "none",
                padding: 0,
                margin: 0,
                appearance: "textfield",
              }}
            />
            {index < TYPE_AXES.length - 1 && (
              <span style={{ color: "#e8dfc8", opacity: 0.82 }}>,</span>
            )}
          </span>
        ))}
        <span style={{ color: "#e8dfc8" }}>)</span>
      </div>
    </div>
  );

  const renderUnitGroup = (group) => (
    <div key={group.title}>
      <h3 style={selectorGroupHeading}>{group.title}</h3>

      <div style={{ display: "grid", gap: "5px" }}>
        {group.ids
          .map((id) => byId.get(id))
          .filter(Boolean)
          .map((transform) => {
            const active = unitFieldMode === "selected" && transform.id === selectedId;

            return (
              <button
                key={transform.id}
                type="button"
                onClick={() => onSelect(transform.id)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "7px 8px",
                  borderRadius: "5px",
                  cursor: "pointer",
                  color: "#e8dfc8",
                  background: active ? "rgba(232, 223, 200, 0.18)" : "rgba(255,255,255,0.055)",
                  border: active
                    ? "1px solid rgba(232, 223, 200, 0.48)"
                    : "1px solid rgba(232, 223, 200, 0.14)",
                  fontFamily: PROSE_FONT,
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "8px" }}>
                  <div style={{ fontSize: "13px", lineHeight: 1.14 }}>
                    {shortTransformName(transform)}
                  </div>
                  <div style={{ fontFamily: MATH_FONT, fontSize: "12px", opacity: 0.86 }}>
                    {transform.symbol}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: "6px",
                    fontFamily: MATH_FONT,
                    fontSize: "11px",
                    opacity: 0.72,
                  }}
                >
                  {transform.unitFormula ? (
                    <>
                      <span
                        style={{
                          display: "inline-block",
                          fontSize: "1.00em",
                          lineHeight: 1.05,
                          verticalAlign: "middle",
                        }}
                      >
                        <LatexInline latex={String.raw`\displaystyle ${formatUnitFormulaLatex(transform)}`} />
                      </span>
                      <span style={{ marginLeft: "7px", opacity: 0.72 }}>
                        <MathText value={formatType(transform.targetType)} />
                      </span>
                    </>
                  ) : (
                    <MathText value={formatType(transform.targetType)} />
                  )}
                </div>

                {transform.aliases?.length > 0 && (
                  <div
                    style={{
                      marginTop: "4px",
                      fontSize: "11px",
                      opacity: 0.58,
                    }}
                  >
                    aliases: {transform.aliases.join(", ")}
                  </div>
                )}
              </button>
            );
          })}
      </div>
    </div>
  );

  return (
    <div
      style={{
        display: "grid",
        gap: "12px",
        maxHeight: "calc(100vh + 240px)",
        overflowY: "auto",
        paddingRight: "4px",
      }}
    >
      {renderAllMovesSection()}
      {renderCustomAddressSection()}
      {orderedGroups.map(renderUnitGroup)}
    </div>
  );
}

function shortTransformName(transform) {
  const replacements = {
    generic_velocity_transform: "velocity type",
    generic_energy_temperature_transform: "energy / temperature type",
    avogadro_amount_transform: "Avogadro amount",
    faraday_transform: "Faraday molar charge",
    gas_constant_transform: "gas constant",
    molar_mass_transform: "molar mass",
  };

  return replacements[transform.id] ?? transform.name;
}

const UNIT_BASIS_REGISTRY = [
  {
    symbol: "s",
    name: "second",
    role: "time base",
    netType: { t: 1, l: 0, q: 0, theta: 0, m: 0, n: 0 },
  },
  {
    symbol: "m",
    name: "meter",
    role: "space base",
    netType: { t: 0, l: 1, q: 0, theta: 0, m: 0, n: 0 },
  },
  {
    symbol: "C",
    name: "coulomb",
    role: "charge base",
    netType: { t: 0, l: 0, q: 1, theta: 0, m: 0, n: 0 },
  },
  {
    symbol: "K",
    name: "kelvin",
    role: "temperature base",
    netType: { t: 0, l: 0, q: 0, theta: 1, m: 0, n: 0 },
  },
  {
    symbol: "kg",
    name: "kilogram",
    role: "mass base",
    netType: { t: 0, l: 0, q: 0, theta: 0, m: 1, n: 0 },
  },
  {
    symbol: "mol",
    name: "mole",
    role: "amount base",
    netType: { t: 0, l: 0, q: 0, theta: 0, m: 0, n: 1 },
  },
];

function UnitModelDetails() {
  return (
    <div>
      <details open>
        <summary style={summaryStyle}>Unit basis registry</summary>
        <div
          style={{
            marginTop: "14px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
            gap: "12px",
          }}
        >
          {UNIT_BASIS_REGISTRY.map((unit) => (
            <div key={unit.symbol} style={smallCardStyle}>
              <div style={{ fontSize: "18px" }}>
                <span style={{ fontFamily: MATH_FONT }}>
                  <MathText value={unit.symbol} />
                </span>{" "}
                — {unit.name}
              </div>
              <CodeLine label="role" value={unit.role} />
              <CodeLine label="type address" value={formatType(unit.netType)} />
            </div>
          ))}
        </div>
      </details>

      <Divider />

      <details>
        <summary style={summaryStyle}>Unit families represented</summary>
        <div
          style={{
            marginTop: "14px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "12px",
          }}
        >
          {UNIT_SELECTOR_GROUPS.map((group) => (
            <div key={group.title} style={smallCardStyle}>
              <div style={{ fontSize: "18px" }}>{group.title}</div>
              <CodeLine
                label="entries"
                value={`${group.ids.length} unit address${group.ids.length === 1 ? "" : "es"}`}
              />
            </div>
          ))}
        </div>
      </details>

    </div>
  );
}

function ObjectSummary({ objects }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: "12px",
      }}
    >
      {objects.map((object) => (
        <div key={object.id} style={smallCardStyle}>
          <div style={{ fontSize: "18px" }}>
            <span style={{ fontFamily: MATH_FONT }}>
              <MathText value={object.symbol} />
            </span>{" "}
            — {object.name}
          </div>
          <CodeLine label="net type" value={formatType(object.netType)} />
          {object.loopClass && <CodeLine label="loop class" value={object.loopClass} />}
          {object.constructionClass && <CodeLine label="construction" value={object.constructionClass} />}
        </div>
      ))}
    </div>
  );
}

function isUnitModelTransform(transform) {
  return transform?.modelKind === "unit_model" || transform?.id?.startsWith("unit_");
}

const UNIT_FORMULA_SYMBOLS = {
  t_p: "\\mathrm{s}",
  l_p: "\\mathrm{m}",
  q_p: "\\mathrm{C}",
  T_p: "\\mathrm{K}",
  m_p: "\\mathrm{kg}",
  N_A: "\\mathrm{mol}",
};

function unitDisplayExponent(factor) {
  // N_A represents inverse amount in the boundary model.
  // Therefore N_A^-1 displays as mol, and N_A displays as mol^-1.
  return factor.tokenId === "N_A" ? -factor.exponent : factor.exponent;
}

function formatUnitFactorText(factor) {
  const exponent = unitDisplayExponent(factor);
  if (exponent === 0) return "1";

  const symbol = {
    t_p: "s",
    l_p: "m",
    q_p: "C",
    T_p: "K",
    m_p: "kg",
    N_A: "mol",
  }[factor.tokenId] ?? factor.tokenId;

  if (exponent === 1) return symbol;
  return `${symbol}^{${exponent}}`;
}

function formatUnitBoundaryWordText(word) {
  const factors = word?.factors ?? [];
  if (factors.length === 0) return "1";

  return factors
    .map(formatUnitFactorText)
    .filter((part) => part !== "1")
    .join(" · ");
}

function formatUnitFormulaLatex(transform) {
  const factors = transform?.ordinaryLeg?.boundaryWord?.factors ?? [];
  const numerator = [];
  const denominator = [];

  factors.forEach((factor) => {
    const exponent = unitDisplayExponent(factor);
    if (exponent === 0) return;

    const symbol = UNIT_FORMULA_SYMBOLS[factor.tokenId] ?? factor.tokenId;
    const absExponent = Math.abs(exponent);
    const part = absExponent === 1 ? symbol : `${symbol}^{${absExponent}}`;

    if (exponent > 0) numerator.push(part);
    else denominator.push(part);
  });

  const joinParts = (parts) => (parts.length ? parts.join(String.raw`\ `) : "1");

  if (denominator.length === 0) return joinParts(numerator);
  return String.raw`\frac{${joinParts(numerator)}}{${joinParts(denominator)}}`;
}

function UnitFormulaInline({ transform, size = "1em", displayStyle = false }) {
  const latex = displayStyle
    ? String.raw`\displaystyle ${formatUnitFormulaLatex(transform)}`
    : formatUnitFormulaLatex(transform);

  return (
    <span
      style={{
        display: "inline-block",
        fontSize: size,
        lineHeight: 1.22,
        verticalAlign: "middle",
      }}
    >
      <LatexInline latex={latex} />
    </span>
  );
}

function LatticeProjection({
  transform,
  unitFieldMode = "selected",
  unitFieldModeChangeKey = 0,
  onUnitFieldModeChange = () => {},
}) {
  const [viewMode, setViewMode] = useState("both");
  const [labelMode, setLabelMode] = useState("none");
  const [gridRadius, setGridRadius] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const [boxWordExpanded, setBoxWordExpanded] = useState(false);
  const [pathMode, setPathMode] = useState("canonical");
  const [selectedPathIndex, setSelectedPathIndex] = useState(0);
  const [cyclePlaybackMode, setCyclePlaybackMode] = useState("single");
  const [cyclePlaybackActive, setCyclePlaybackActive] = useState(false);
  const [cycleStackCount, setCycleStackCount] = useState(1);

  const isUnitModel = isUnitModelTransform(transform);
  const isCustomAddress = transform?.id?.startsWith(CUSTOM_ADDRESS_ID);
  const isOriginGridState = isCustomAddress && unitFieldMode === "grid";
  const ordinaryLabel = formatBoundaryPathWord(transform.ordinaryLeg.boundaryWord);
  const inversionStructured = formatStructuredProduct(transform.ordinaryLeg.boundaryWord, BOX_WORD);
  const ordinaryLatex = formatBoundaryPathLatex(transform.ordinaryLeg.boundaryWord);
  const inversionStructuredLatex = formatStructuredProductLatex(transform.ordinaryLeg.boundaryWord, BOX_WORD);
  const boxLatex = formatBoundaryPathLatex(BOX_WORD);

  const routeMeta = useMemo(
    () => getPathFamilyMetadata(transform.ordinaryLeg.boundaryWord),
    [transform.id]
  );

  const routeCycleLimit = routeMeta.enumerationLimit ?? 720;
  const routeCycleCount = Math.min(routeMeta.pathFamilySize, routeCycleLimit);

  useEffect(() => {
    setCyclePlaybackActive(false);
    setCycleStackCount(1);
    setSelectedPathIndex(0);
    setPathMode("canonical");
  }, [transform.id]);

  useEffect(() => {
    setCyclePlaybackActive(false);
    setCyclePlaybackMode("single");
    setCycleStackCount(1);
    setSelectedPathIndex(0);
    setPathMode("canonical");
  }, [unitFieldModeChangeKey]);

  useEffect(() => {
    if (!cyclePlaybackActive) return undefined;

    if (routeCycleCount <= 1) {
      setCyclePlaybackActive(false);
      return undefined;
    }

    setPathMode("cycle");

    const playbackDelay =
      cyclePlaybackMode === "stack"
        ? ROUTE_STACK_PLAYBACK_MS
        : ROUTE_CYCLE_PLAYBACK_MS;

    const interval = window.setInterval(() => {
      setSelectedPathIndex((index) => {
        const current =
          ((index % routeCycleCount) + routeCycleCount) % routeCycleCount;
        const next = current + 1;

        if (next >= routeCycleCount) {
          setCyclePlaybackActive(false);
          return current;
        }

        if (cyclePlaybackMode === "stack") {
          setCycleStackCount((count) =>
            Math.min(Math.max(count, next + 1), routeCycleCount)
          );
        }

        return next;
      });
    }, playbackDelay);

    return () => window.clearInterval(interval);
  }, [cyclePlaybackActive, routeCycleCount, cyclePlaybackMode]);

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) auto",
          gap: "8px 16px",
          marginBottom: "14px",
          alignItems: "end",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "128px minmax(0, 1fr)",
            gap: "8px 10px",
            alignItems: "baseline",
          }}
        >
          {isUnitModel ? (
            <>
              <div style={{ fontSize: "18px", fontFamily: MATH_FONT, whiteSpace: "nowrap" }}>
                {isOriginGridState ? (
                  <span style={{ fontFamily: PROSE_FONT, opacity: 0.82 }}>origin grid</span>
                ) : isCustomAddress ? (
                  <MathText value={formatType(transform.targetType)} />
                ) : (
                  <UnitFormulaInline transform={transform} size="0.90em" displayStyle />
                )}
              </div>
              <div
                style={{
                  fontSize: "16px",
                  opacity: 0.76,
                  whiteSpace: "nowrap",
                  alignSelf: "center",
                }}
              >
                {isOriginGridState ? "viewer state" : isCustomAddress ? "custom address" : unitKindLabel(transform)}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: "16px", opacity: 0.76, whiteSpace: "nowrap" }}>
                ordinary branch:
              </div>
              <div style={{ fontSize: "16px", fontFamily: MATH_FONT }}>
                <LatexInline latex={ordinaryLatex} />
              </div>

              <div style={{ fontSize: "16px", opacity: 0.76, whiteSpace: "nowrap" }}>
                inversion branch:
              </div>
              <div style={{ fontSize: "16px", fontFamily: MATH_FONT }}>
                <InversionBranchFormula
                  ordinaryLatex={ordinaryLatex}
                  boxLatex={boxLatex}
                  boxWordExpanded={boxWordExpanded}
                  onToggle={() => setBoxWordExpanded((value) => !value)}
                />
              </div>
            </>
          )}

          <div style={{ fontSize: "16px", opacity: 0.76, whiteSpace: "nowrap", marginTop: "2px" }}>
            source:
          </div>
          <div
            style={{
              fontSize: "16px",
              fontFamily: MATH_FONT,
              marginTop: "2px",
              display: "flex",
              alignItems: "baseline",
              gap: "18px",
              flexWrap: "wrap",
            }}
          >
            <MathText value={formatType(transform.sourceType)} />
            {isUnitModel && (
              <span
                style={{
                  fontFamily: PROSE_FONT,
                  fontSize: "14px",
                  opacity: 0.62,
                  whiteSpace: "nowrap",
                }}
              >
                address order: (time, space, charge, temperature, mass, mol)
              </span>
            )}
          </div>

          <div style={{ fontSize: "16px", opacity: 0.76, whiteSpace: "nowrap" }}>
            target:
          </div>
          <div style={{ fontSize: "16px", fontFamily: MATH_FONT }}>
            <MathText value={formatType(transform.targetType)} />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded(true)}
          style={{
            border: "1px solid rgba(232,223,200,0.16)",
            borderRadius: "7px",
            padding: "6px 12px",
            cursor: "pointer",
            color: "#e8dfc8",
            background: "rgba(0,0,0,0.20)",
            fontFamily: PROSE_FONT,
            fontSize: "14px",
            whiteSpace: "nowrap",
            marginBottom: "1px",
          }}
        >
          Expand 3D
        </button>
      </div>

      <Axis3DViewport
        transform={transform}
        isUnitModel={isUnitModel}
        pathMode={pathMode}
        selectedPathIndex={selectedPathIndex}
        cyclePlaybackMode={cyclePlaybackMode}
        setCyclePlaybackMode={setCyclePlaybackMode}
        setCyclePlaybackActive={setCyclePlaybackActive}
        setPathMode={setPathMode}
        cycleStackCount={cycleStackCount}
        showInversionBranch={!isUnitModel}
        viewMode={viewMode}
        labelMode={labelMode}
        gridRadius={gridRadius}
        unitFieldMode={isUnitModel ? unitFieldMode : "selected"}
        onUnitFieldModeChange={onUnitFieldModeChange}
        expanded={false}
      />

      <LatticeControlRow
        viewMode={viewMode}
        setViewMode={setViewMode}
        labelMode={labelMode}
        setLabelMode={setLabelMode}
        gridRadius={gridRadius}
        setGridRadius={setGridRadius}
        transform={transform}
        isUnitModel={isUnitModel}
        pathMode={pathMode}
        setPathMode={setPathMode}
        selectedPathIndex={selectedPathIndex}
        setSelectedPathIndex={setSelectedPathIndex}
        cyclePlaybackMode={cyclePlaybackMode}
        setCyclePlaybackMode={setCyclePlaybackMode}
        cyclePlaybackActive={cyclePlaybackActive}
        setCyclePlaybackActive={setCyclePlaybackActive}
        cycleStackCount={cycleStackCount}
        setCycleStackCount={setCycleStackCount}
      />

      {expanded && (
        <div
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            bottom: 0,
            left: "var(--sidebar-width, 142px)",
            zIndex: 1200,
            backgroundImage:
              "linear-gradient(rgba(0,0,0,0.70), rgba(0,0,0,0.70)), url('/physics_monastery_background.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundAttachment: "fixed",
            padding: "28px 20px",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              height: "100%",
              borderRadius: "5px",
              background: "rgba(0,0,0,0.54)",
              border: "1px solid rgba(232,223,200,0.24)",
              padding: "22px",
              boxSizing: "border-box",
              display: "grid",
              gridTemplateRows: "auto minmax(0, 1fr) auto",
              gap: "14px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "14px",
              }}
            >
              <div>
                <div style={{ fontSize: "30px" }}>
                  Projected <IntegerLatticeHtml /> Type Lattice
                </div>
                <div style={{ fontFamily: MATH_FONT, fontSize: "17px", opacity: 0.82 }}>
                  {isUnitModel ? (
                    <>
                      <span>unit address: </span><UnitFormulaInline transform={transform} />
                      <span style={{ margin: "0 12px", opacity: 0.55 }}>|</span>
                      <span>boundary word: </span><LatexInline latex={ordinaryLatex} />
                    </>
                  ) : (
                    <>
                      <span>ordinary: </span><LatexInline latex={ordinaryLatex} />
                      <span style={{ margin: "0 12px", opacity: 0.55 }}>|</span>
                      <span>inversion: </span>
                      <InversionBranchFormula
                        ordinaryLatex={ordinaryLatex}
                        boxLatex={boxLatex}
                        boxWordExpanded={boxWordExpanded}
                        onToggle={() => setBoxWordExpanded((value) => !value)}
                      />
                    </>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setExpanded(false)}
                style={{
                  border: "1px solid rgba(232,223,200,0.22)",
                  borderRadius: "5px",
                  padding: "8px 16px",
                  cursor: "pointer",
                  color: "#e8dfc8",
                  background: "rgba(0,0,0,0.26)",
                  fontFamily: PROSE_FONT,
                  fontSize: "16px",
                }}
              >
                Close
              </button>
            </div>

            <Axis3DViewport
              transform={transform}
              isUnitModel={isUnitModel}
              pathMode={pathMode}
              selectedPathIndex={selectedPathIndex}
              cyclePlaybackMode={cyclePlaybackMode}
              setCyclePlaybackMode={setCyclePlaybackMode}
              setCyclePlaybackActive={setCyclePlaybackActive}
              setPathMode={setPathMode}
              cycleStackCount={cycleStackCount}
              showInversionBranch={!isUnitModel}
              viewMode={viewMode}
              labelMode={labelMode}
              gridRadius={gridRadius}
              unitFieldMode={isUnitModel ? unitFieldMode : "selected"}
              onUnitFieldModeChange={onUnitFieldModeChange}
              expanded
            />

            <LatticeControlRow
              viewMode={viewMode}
              setViewMode={setViewMode}
              labelMode={labelMode}
              setLabelMode={setLabelMode}
              gridRadius={gridRadius}
              setGridRadius={setGridRadius}
              transform={transform}
              isUnitModel={isUnitModel}
              pathMode={pathMode}
              setPathMode={setPathMode}
              selectedPathIndex={selectedPathIndex}
              setSelectedPathIndex={setSelectedPathIndex}
              cyclePlaybackMode={cyclePlaybackMode}
              setCyclePlaybackMode={setCyclePlaybackMode}
              cyclePlaybackActive={cyclePlaybackActive}
              setCyclePlaybackActive={setCyclePlaybackActive}
              cycleStackCount={cycleStackCount}
              setCycleStackCount={setCycleStackCount}
              compact
            />
          </div>
        </div>
      )}

      <div style={{ marginTop: "14px" }}>
        <details>
          <summary style={summaryStyle}>Step lists</summary>
          <div style={{ marginTop: "12px", display: "grid", gap: "10px" }}>
            <StepSequence
              title={isUnitModel ? "Unit route" : "Ordinary representative path"}
              unitMode={isUnitModel}
              trace={traceBoundaryPath(transform.sourceType, transform.ordinaryLeg.boundaryWord, {
                pathMode,
                selectedPathIndex,
                unitLabels: isUnitModel,
              })}
            />
            {!isUnitModel && (
              <StepSequence
                title="Inversion representative path"
                trace={traceBoundaryPath(transform.sourceType, transform.inversionLeg.boundaryWord, {
                  pathMode,
                  selectedPathIndex,
                })}
              />
            )}
          </div>
        </details>

        <Divider />

        <details>
          <summary style={summaryStyle}>
            {isUnitModel ? "Unit-route details" : "Boundary-word details"}
          </summary>
          <div style={{ marginTop: "12px" }}>
            <BoundaryWordSummary transform={transform} isUnitModel={isUnitModel} />
          </div>
        </details>
      </div>
    </div>
  );
}

function LatticeControlRow({
  viewMode,
  setViewMode,
  labelMode,
  setLabelMode,
  gridRadius,
  setGridRadius,
  transform,
  isUnitModel = false,
  pathMode,
  setPathMode,
  selectedPathIndex,
  setSelectedPathIndex,
  cyclePlaybackMode = "single",
  setCyclePlaybackMode = () => {},
  cyclePlaybackActive = false,
  setCyclePlaybackActive = () => {},
  cycleStackCount = 1,
  setCycleStackCount = () => {},
  compact = false,
}) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "10px",
        marginTop: compact ? "10px" : "12px",
        marginBottom: compact ? 0 : "14px",
      }}
    >
      <ToggleGroup
        label="view"
        value={viewMode}
        onChange={setViewMode}
        options={
          isUnitModel
            ? [
                ["both", "both"],
                ["net", "net"],
                ["ordinary", "steps"],
              ]
            : [
                ["both", "both"],
                ["net", "net"],
                ["ordinary", "ordinary"],
                ["inversion", "inversion"],
              ]
        }
      />
      <ToggleGroup
        label="step numbers"
        value={labelMode}
        onChange={setLabelMode}
        options={[
          ["numbers", "on"],
          ["none", "off"],
        ]}
      />
      <ToggleGroup
        label="grid"
        value={String(gridRadius)}
        onChange={(value) => setGridRadius(Number(value))}
        options={[
          ["1", "±1"],
          ["2", "±2"],
        ]}
      />
      <PathModeControls
        transform={transform}
        isUnitModel={isUnitModel}
        pathMode={pathMode}
        setPathMode={setPathMode}
        selectedPathIndex={selectedPathIndex}
        setSelectedPathIndex={setSelectedPathIndex}
        cyclePlaybackMode={cyclePlaybackMode}
        setCyclePlaybackMode={setCyclePlaybackMode}
        cyclePlaybackActive={cyclePlaybackActive}
        setCyclePlaybackActive={setCyclePlaybackActive}
        cycleStackCount={cycleStackCount}
        setCycleStackCount={setCycleStackCount}
      />
    </div>
  );
}

function InversionBranchFormula({ ordinaryLatex, boxLatex, boxWordExpanded, onToggle }) {
  const boxDisplayLatex = boxWordExpanded
    ? String.raw`\left(${boxLatex}\right)`
    : String.raw`\boxtimes`;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: "3px",
        flexWrap: "wrap",
      }}
    >
      <LatexInline latex={String.raw`\left(${ordinaryLatex}\right)`} />
      <button
        type="button"
        onClick={onToggle}
        title={boxWordExpanded ? "Collapse inversion boundary" : "Expand inversion boundary"}
        style={{
          display: "inline-flex",
          alignItems: "baseline",
          border: "none",
          borderRadius: 0,
          padding: 0,
          margin: "0 0 0 2px",
          cursor: "pointer",
          color: "#e8dfc8",
          background: "transparent",
          fontFamily: MATH_FONT,
          fontSize: "inherit",
          lineHeight: 1.1,
          appearance: "none",
        }}
      >
        <LatexInline latex={boxDisplayLatex} />
      </button>
    </span>
  );
}

function IntegerLatticeHtml({ size = "inherit" }) {
  return (
    <span style={{ whiteSpace: "nowrap" }}>
      <span
        style={{
          fontFamily: "KaTeX_AMS, KaTeX_Main, serif",
          fontSize: size,
        }}
      >
        ℤ
      </span>
      <sup
        style={{
          fontSize: "0.62em",
          lineHeight: 0,
          verticalAlign: "super",
        }}
      >
        6
      </sup>
    </span>
  );
}

function LatexInline({ latex }) {
  const html = katex.renderToString(latex, {
    throwOnError: false,
    displayMode: false,
    output: "html",
  });

  return (
    <span
      style={{ color: "inherit" }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function SvgAxisLabel({ x, y, sign, symbol, opacity = 1, expanded = false }) {
  return (
    <text
      x={x}
      y={y}
      fill="#e8dfc8"
      opacity={opacity}
      fontSize={expanded ? "24" : "12"}
      textAnchor="middle"
      dominantBaseline="middle"
      pointerEvents="none"
    >
      <tspan fontFamily="KaTeX_Main, serif">{sign}</tspan>
      <tspan fontFamily="KaTeX_Math, KaTeX_Main, serif">{symbol}</tspan>
    </text>
  );
}

const AXIS_CONTROL_LABEL_LATEX = {
  t: String.raw`\mathrm{time}`,
  l: String.raw`\mathrm{space}`,
  q: String.raw`\mathrm{charge}`,
  theta: String.raw`\mathrm{temp}`,
  m: String.raw`\mathrm{mass}`,
  n: String.raw`\mathrm{mol}`,
};

function AxisRotationControls({
  selectedAxis,
  setSelectedAxis,
  onRotate,
  onReset,
  onAxisDoubleClick = () => {},
  onToggleAxisVisibility = () => {},
  axisVisibility = {},
  onStep,
  canStep,
  onZoom,
  expanded,
}) {
  const buttonStyle = (active = false, disabled = false) => ({
    border: "1px solid rgba(232,223,200,0.16)",
    borderRadius: "5px",
    padding: expanded ? "5px 10px" : "3px 8px",
    minWidth: expanded ? "30px" : "30px",
    cursor: disabled ? "not-allowed" : "pointer",
    color: "#e8dfc8",
    background: active ? "rgba(232,223,200,0.20)" : "rgba(0,0,0,0.24)",
    fontFamily: PROSE_FONT,
    fontSize: expanded ? "10px" : "10px",
    lineHeight: 1.12,
    textAlign: "center",
    opacity: disabled ? 0.46 : 1,
  });

  return (
    <div
      style={{
        position: "absolute",
        top: expanded ? "58px" : "46px",
        right: expanded ? "18px" : "12px",
        zIndex: 8,
        display: "grid",
        gap: expanded ? "6px" : "4px",
        padding: expanded ? "8px" : "6px",
        borderRadius: "6px",
        background: "rgba(0,0,0,0.34)",
        border: "1px solid rgba(232,223,200,0.15)",
        backdropFilter: "blur(1px)",
        fontFamily: PROSE_FONT,
      }}
      aria-label="lattice-axis rotation controls"
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "4px" }}>
        {TYPE_AXES.map((axis) => {
          const axisVisible = axisVisibility[axis.key] !== false;

          return (
            <div
              key={axis.key}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) auto",
                gap: "4px",
                alignItems: "stretch",
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedAxis(axis.key)}
                onDoubleClick={(event) => {
                  event.preventDefault();
                  onAxisDoubleClick(axis.key);
                }}
                style={buttonStyle(selectedAxis === axis.key)}
                title={`Click to rotate about this axis; double-click to aim this axis toward +x`}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "5px",
                    color: axisStepColor(axis.key),
                    opacity: axisVisible ? 1 : 0.30,
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      display: "inline-block",
                      width: expanded ? "14px" : "11px",
                      height: expanded ? "2px" : "1.5px",
                      borderRadius: "999px",
                      background: axisStepColor(axis.key),
                      boxShadow: axisVisible ? `0 0 5px ${axisStepColor(axis.key)}` : "none",
                    }}
                  />
                  <span
                    style={{
                      color: axisStepColor(axis.key),
                      opacity: 1,
                    }}
                  >
                    <LatexInline latex={AXIS_CONTROL_LABEL_LATEX[axis.key]} />
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleAxisVisibility(axis.key);
                }}
                style={{
                  border: "1px solid rgba(232,223,200,0.16)",
                  borderRadius: "5px",
                  padding: expanded ? "5px 7px" : "3px 6px",
                  minWidth: expanded ? "28px" : "24px",
                  cursor: "pointer",
                  color: axisVisible ? axisStepColor(axis.key) : "rgba(232,223,200,0.34)",
                  background: axisVisible ? "rgba(232,223,200,0.12)" : "rgba(0,0,0,0.24)",
                  fontFamily: PROSE_FONT,
                  fontSize: expanded ? "10px" : "10px",
                  lineHeight: 1.12,
                  textAlign: "center",
                }}
                title={`${axisVisible ? "Hide" : "Show"} ${visibleAxisLabel(axis.key)} segments`}
                aria-label={`${axisVisible ? "Hide" : "Show"} ${visibleAxisLabel(axis.key)} segments`}
              >
                {axisVisible ? "on" : "off"}
              </button>
            </div>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
        <button type="button" onClick={() => onRotate(-1)} style={buttonStyle(false)} title="Rotate negative">
          <LatexInline latex={String.raw`\circlearrowleft`} />
        </button>
        <button type="button" onClick={() => onRotate(1)} style={buttonStyle(false)} title="Rotate positive">
          <LatexInline latex={String.raw`\circlearrowright`} />
        </button>
      </div>

      <button
        type="button"
        onClick={onStep}
        disabled={!canStep}
        style={buttonStyle(false, !canStep)}
        title="Apply one more copy of this transform"
      >
        <LatexInline latex={String.raw`\mathrm{step}`} />
      </button>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
        <button type="button" onClick={() => onZoom(-1)} style={buttonStyle(false)} title="Zoom out from origin">
          <LatexInline latex={String.raw`-`} />
        </button>
        <button type="button" onClick={() => onZoom(1)} style={buttonStyle(false)} title="Zoom in toward origin">
          <LatexInline latex={String.raw`+`} />
        </button>
      </div>

      <button type="button" onClick={onReset} style={buttonStyle(false)} title="Reset axis rotations">
        <LatexInline latex={String.raw`\mathrm{reset}`} />
      </button>

      <div
        style={{
          fontFamily: PROSE_FONT,
          fontSize: expanded ? "11px" : "9px",
          opacity: 0.54,
          textAlign: "center",
          lineHeight: 1.12,
        }}
      >
        arrows work<br />after click
      </div>
    </div>
  );
}


function Axis3DViewport({
  transform,
  isUnitModel = false,
  pathMode = "canonical",
  selectedPathIndex = 0,
  cyclePlaybackMode = "single",
  setCyclePlaybackMode = () => {},
  setCyclePlaybackActive = () => {},
  setPathMode = () => {},
  cycleStackCount = 1,
  showInversionBranch = true,
  viewMode,
  labelMode,
  gridRadius,
  unitFieldMode = "selected",
  onUnitFieldModeChange = () => {},
  expanded,
}) {
  const [rotation, setRotation] = useState(DEFAULT_LATTICE_ROTATION);
  const [drag, setDrag] = useState(null);
  const [selectedRotationAxis, setSelectedRotationAxis] = useState("t");
  const [axisVisibility, setAxisVisibility] = useState(makeAllAxesVisible);
  const [axisOrientation, setAxisOrientation] = useState(makeIdentityOrientation);
  const [zoomScale, setZoomScale] = useState(1);
  const [hopCount, setHopCount] = useState(1);
  const [revealedStepCount, setRevealedStepCount] = useState(0);
  const [visibleNetHops, setVisibleNetHops] = useState(0);
  const [animationRun, setAnimationRun] = useState(0);

  const pathOptions = { pathMode, selectedPathIndex };
  const isStackingRoutes = pathMode === "cycle" && cyclePlaybackMode === "stack";
  const routePathOptions = useMemo(() => {
    if (!isStackingRoutes) return [pathOptions];

    const count = Math.max(1, cycleStackCount);

    return Array.from({ length: count }, (_, index) => ({
      pathMode: "cycle",
      selectedPathIndex: index,
    }));
  }, [isStackingRoutes, pathMode, selectedPathIndex, cycleStackCount]);

  const ordinaryTrace = traceBoundaryPath(
    transform.sourceType,
    transform.ordinaryLeg.boundaryWord,
    pathOptions
  );

  const inversionTrace = traceBoundaryPath(
    transform.sourceType,
    transform.inversionLeg.boundaryWord,
    pathOptions
  );

  const stepsPerHop = Math.max(0, ordinaryTrace.length - 1);

  const ordinaryRepeatedTraces = useMemo(
    () =>
      routePathOptions.flatMap((routeOptions) =>
        makeRepeatedBoundaryTraces(transform, hopCount, routeOptions)
      ),
    [
      transform.id,
      hopCount,
      pathMode,
      selectedPathIndex,
      cycleStackCount,
      isStackingRoutes,
      routePathOptions,
    ]
  );

  useEffect(() => {
    setHopCount(1);
    setRevealedStepCount(0);
    setVisibleNetHops(0);
    setAnimationRun((run) => run + 1);
  }, [transform.id, pathMode, selectedPathIndex]);

  useEffect(() => {
    const targetHopCount = Math.max(1, Math.min(hopCount, MAX_TRANSFORM_HOPS));

    if (stepsPerHop <= 0) {
      setRevealedStepCount(0);
      setVisibleNetHops(targetHopCount);
      return undefined;
    }

    const startStep = Math.max(0, (targetHopCount - 1) * stepsPerHop);
    const targetStep = targetHopCount * stepsPerHop;

    setRevealedStepCount(startStep);
    setVisibleNetHops(targetHopCount - 1);

    let currentStep = startStep;
    let netTimeout = null;

    const interval = window.setInterval(() => {
      currentStep += 1;
      setRevealedStepCount(currentStep);

      if (currentStep >= targetStep) {
        window.clearInterval(interval);
        netTimeout = window.setTimeout(() => {
          setVisibleNetHops(targetHopCount);
        }, 90);
      }
    }, STEP_ANIMATION_MS);

    return () => {
      window.clearInterval(interval);
      if (netTimeout) window.clearTimeout(netTimeout);
    };
  }, [animationRun, hopCount, stepsPerHop]);

  const rotateSelectedAxis = (direction) => {
    setAxisOrientation((previous) =>
      rotateOrientationAboutAxis(
        previous,
        selectedRotationAxis,
        direction * AXIS_ROTATION_STEP
      )
    );
  };

  const alignAxisToPositiveX = (axisKey) => {
    setSelectedRotationAxis(axisKey);
    setRotation(DEFAULT_LATTICE_ROTATION);
    setAxisOrientation(makeOrientationAligningAxisToPositiveX(axisKey));
    setZoomScale(1);
    setDrag(null);
  };

  const resetAxisRotations = () => {
    setRotation(DEFAULT_LATTICE_ROTATION);
    setAxisVisibility(makeAllAxesVisible());
    setAxisOrientation(makeIdentityOrientation());
    setZoomScale(1);
    setHopCount(1);
    setRevealedStepCount(0);
    setVisibleNetHops(0);
    setCyclePlaybackMode("single");
    setCyclePlaybackActive(false);
    setPathMode("canonical");
    setAnimationRun((run) => run + 1);
    onUnitFieldModeChange("grid");
  };

  const stepForward = () => {
    if (hopCount >= MAX_TRANSFORM_HOPS) return;

    setHopCount((count) => Math.min(count + 1, MAX_TRANSFORM_HOPS));
    setAnimationRun((run) => run + 1);
  };

  const adjustZoom = (direction) => {
    setZoomScale((value) => {
      const factor = direction > 0 ? 1.15 : 1 / 1.15;
      return clampNumber(value * factor, 0.35, 3.5);
    });
  };

  const isAxisVisible = (axisKey) => axisVisibility[axisKey] !== false;

  const toggleAxisVisibility = (axisKey) => {
    setAxisVisibility((previous) => ({
      ...previous,
      [axisKey]: previous[axisKey] === false,
    }));
  };

  const shouldDrawTraceEntry = (entry) => {
    const axisKey = axisKeyForTraceEntry(entry);
    return !axisKey || isAxisVisible(axisKey);
  };

  const handleAxisKeyDown = (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      rotateSelectedAxis(-1);
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      rotateSelectedAxis(1);
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      adjustZoom(-1);
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      adjustZoom(1);
    }

    if (event.key === "Home" || event.key === "0") {
      event.preventDefault();
      resetAxisRotations();
    }
  };

  const showOrdinary = viewMode === "both" || viewMode === "ordinary";
  const showInversion = showInversionBranch && (viewMode === "both" || viewMode === "inversion");
  const showNet = viewMode === "both" || viewMode === "net";
  const shouldDrawNet = !equalType(transform.sourceType, transform.targetType);

  const gridOnlyModeActive = isUnitModel && unitFieldMode === "grid";
  const allMovesSectionActive = isUnitModel && unitFieldMode !== "selected" && unitFieldMode !== "grid";
  const supportGraphModeActive = cyclePlaybackMode === "support";
  const unitFieldActive =
    isUnitModel && (unitFieldMode === "white" || unitFieldMode === "canonical" || unitFieldMode === "allpaths");
  const showSelectedTransform = !unitFieldActive && !gridOnlyModeActive && !supportGraphModeActive;
  const showAllWhiteUnitArrows = !supportGraphModeActive && unitFieldActive && unitFieldMode === "white";
  const showAllCanonicalUnitPaths = !supportGraphModeActive && unitFieldActive && unitFieldMode === "canonical";
  const showAllOrderedUnitPaths = !supportGraphModeActive && unitFieldActive && unitFieldMode === "allpaths";
  const showAllColoredUnitPaths = showAllCanonicalUnitPaths || showAllOrderedUnitPaths;

  const ordinaryHopPaths = ordinaryRepeatedTraces.map((trace) =>
    trace.map((entry) => projectType3D(entry.type, rotation, expanded, axisOrientation, zoomScale))
  );

  const inversionPath = inversionTrace.map((entry) =>
    projectType3D(entry.type, rotation, expanded, axisOrientation, zoomScale)
  );

  const netHops = ordinaryRepeatedTraces.map((trace) => {
    const sourceType = trace[0]?.type ?? transform.sourceType;
    const targetType = trace[trace.length - 1]?.type ?? sourceType;

    return {
      source: projectType3D(sourceType, rotation, expanded, axisOrientation, zoomScale),
      target: projectType3D(targetType, rotation, expanded, axisOrientation, zoomScale),
    };
  });

  const allUnitFieldTraces = useMemo(() => {
    if (!unitFieldActive || supportGraphModeActive) return [];

    const sourceType = transform.sourceType ?? ZERO_TYPE;

    return UNIT_TRANSFORMS.flatMap((unitTransform) => {
      const metadata = getPathFamilyMetadata(unitTransform.ordinaryLeg.boundaryWord);
      const pathFamilySize = metadata.pathFamilySize ?? 1;
      const enumerationLimit = metadata.enumerationLimit ?? 720;

      const routeCount = showAllOrderedUnitPaths
        ? Math.max(1, Math.min(pathFamilySize, enumerationLimit))
        : 1;

      return Array.from({ length: routeCount }, (_, routeIndex) => {
        const routeOptions =
          showAllOrderedUnitPaths && routeCount > 1
            ? { pathMode: "cycle", selectedPathIndex: routeIndex }
            : { pathMode: "canonical" };

        return {
          id: routeCount > 1 ? `${unitTransform.id}-route-${routeIndex}` : unitTransform.id,
          unitId: unitTransform.id,
          symbol: unitTransform.symbol,
          current: unitTransform.id === transform.id,
          routeIndex,
          routeCount,
          pathFamilySize,
          trace: traceBoundaryPath(sourceType, unitTransform.ordinaryLeg.boundaryWord, routeOptions),
        };
      });
    });
  }, [unitFieldActive, supportGraphModeActive, showAllOrderedUnitPaths, transform.id]);

  const allUnitFieldPaths = allUnitFieldTraces.map((entry) => ({
    ...entry,
    path: entry.trace.map((traceEntry) =>
      projectType3D(traceEntry.type, rotation, expanded, axisOrientation, zoomScale)
    ),
  }));

  const allUnitMoveArrows = allUnitFieldPaths.map((entry) => ({
    id: entry.id,
    symbol: entry.symbol,
    current: entry.current,
    source: entry.path[0],
    target: entry.path[entry.path.length - 1],
  }));

  const supportGraph = useMemo(() => {
    if (!supportGraphModeActive) return null;

    const sourceType = transform.sourceType ?? makeZeroType();
    const supportTransforms = allMovesSectionActive ? UNIT_TRANSFORMS : [transform];

    return mergeSupportGraphs(sourceType, supportTransforms);
  }, [supportGraphModeActive, allMovesSectionActive, transform.id]);

  const projectedSupportGraph = useMemo(() => {
    if (!supportGraph) return null;

    const maxEdgeMultiplicity = supportGraph.maxEdgeMultiplicity || 1;
    const maxNodeMultiplicity = supportGraph.maxNodeMultiplicity || 1;

    return {
      ...supportGraph,
      nodes: supportGraph.nodes.map((node) => {
        const point = projectType3D(node.type, rotation, expanded, axisOrientation, zoomScale);
        const weight =
          Math.log1p(node.multiplicity) / Math.log1p(maxNodeMultiplicity);

        return {
          ...node,
          ...point,
          weight,
        };
      }),
      edges: supportGraph.edges.map((edge) => {
        const source = projectType3D(edge.sourceType, rotation, expanded, axisOrientation, zoomScale);
        const target = projectType3D(edge.targetType, rotation, expanded, axisOrientation, zoomScale);
        const weight =
          Math.log1p(edge.multiplicity) / Math.log1p(maxEdgeMultiplicity);

        return {
          ...edge,
          source,
          target,
          weight,
        };
      }),
    };
  }, [supportGraph, rotation, expanded, axisOrientation, zoomScale]);

  const unitFieldAudit = useMemo(() => {
    if (!isUnitModel) return null;

    const sourceType = transform.sourceType ?? ZERO_TYPE;
    let theoreticalOrderedPathCount = 0;
    let drawnOrderedPathCount = 0;
    let cappedUnitCount = 0;

    const endpointKeys = new Set();
    const visitedCounts = new Map();

    UNIT_TRANSFORMS.forEach((unitTransform) => {
      const metadata = getPathFamilyMetadata(unitTransform.ordinaryLeg.boundaryWord);
      const pathFamilySize = metadata.pathFamilySize ?? 1;
      const enumerationLimit = metadata.enumerationLimit ?? 720;
      const routeCount =
        unitFieldMode === "allpaths"
          ? Math.max(1, Math.min(pathFamilySize, enumerationLimit))
          : unitFieldMode === "canonical"
            ? 1
            : 0;

      theoreticalOrderedPathCount += pathFamilySize;
      drawnOrderedPathCount += routeCount;

      if (unitFieldMode === "allpaths" && pathFamilySize > enumerationLimit) {
        cappedUnitCount += 1;
      }

      const endpointType = addType(sourceType, unitTransform.targetType ?? ZERO_TYPE);
      endpointKeys.add(typeKey(endpointType));

      for (let routeIndex = 0; routeIndex < routeCount; routeIndex += 1) {
        const routeOptions =
          unitFieldMode === "allpaths" && routeCount > 1
            ? { pathMode: "cycle", selectedPathIndex: routeIndex }
            : { pathMode: "canonical" };

        const trace = traceBoundaryPath(
          sourceType,
          unitTransform.ordinaryLeg.boundaryWord,
          routeOptions
        );

        trace.forEach((entry) => {
          const key = typeKey(entry.type);
          visitedCounts.set(key, (visitedCounts.get(key) ?? 0) + 1);
        });
      }
    });

    const reusedVisitedAddressCount = Array.from(visitedCounts.values()).filter((count) => count > 1).length;

    return {
      unitAddressCount: UNIT_TRANSFORMS.length,
      theoreticalOrderedPathCount,
      drawnOrderedPathCount,
      cappedUnitCount,
      uniqueEndpointCount: endpointKeys.size,
      uniqueVisitedAddressCount: visitedCounts.size,
      reusedVisitedAddressCount,
    };
  }, [isUnitModel, transform.id, unitFieldMode]);

  const supportGraphSubjectLabel = supportGraph
    ? allMovesSectionActive
      ? "all unit moves from source"
      : shortTransformName(transform)
    : "";

  const supportGraphScopeLabel = supportGraph
    ? allMovesSectionActive
      ? `unit addresses: ${supportGraph.transformCount}`
      : `unit: ${transform.unitFormula ?? transform.symbol}`
    : "";

  const visibleSegmentStats = useMemo(() => {
    const records = [];

    const addSegment = (sourceType, targetType, factor) => {
      const axisKey = TOKEN_AXIS_KEYS[factor?.tokenId];
      if (!axisKey || !isAxisVisible(axisKey)) return;

      records.push({
        axisKey,
        sourceType,
        targetType,
        segmentKey: undirectedSegmentKey(sourceType, targetType, axisKey),
      });
    };

    if (supportGraph) {
      supportGraph.edges.forEach((edge) => {
        addSegment(edge.sourceType, edge.targetType, edge.factor);
      });
    } else if (showAllColoredUnitPaths) {
      allUnitFieldTraces.forEach((entry) => {
        entry.trace.slice(1).forEach((traceEntry, index) => {
          addSegment(entry.trace[index].type, traceEntry.type, traceEntry.factor);
        });
      });
    } else if (showSelectedTransform && showOrdinary) {
      ordinaryRepeatedTraces.forEach((trace, hopIndex) => {
        const visibleSteps = isStackingRoutes
          ? trace.length - 1
          : visibleStepsForHop(revealedStepCount, stepsPerHop, hopIndex);

        trace.slice(1).forEach((traceEntry, index) => {
          if (index + 1 > visibleSteps) return;
          addSegment(trace[index].type, traceEntry.type, traceEntry.factor);
        });
      });
    }

    return TYPE_AXES.map((axis) => {
      const axisRecords = records.filter((record) => record.axisKey === axis.key);
      const uniqueSegments = Array.from(
        new Map(axisRecords.map((record) => [record.segmentKey, record])).values()
      );

      return {
        axisKey: axis.key,
        label: visibleAxisLabel(axis.key),
        visible: isAxisVisible(axis.key),
        uniqueSegmentCount: uniqueSegments.length,
        componentCount: countConnectedSegmentComponents(uniqueSegments),
      };
    });
  }, [
    supportGraph,
    showAllColoredUnitPaths,
    showSelectedTransform,
    showOrdinary,
    allUnitFieldTraces,
    ordinaryRepeatedTraces,
    isStackingRoutes,
    revealedStepCount,
    stepsPerHop,
    axisVisibility,
  ]);

  const firstSource = netHops[0]?.source ?? projectType3D(transform.sourceType, rotation, expanded, axisOrientation, zoomScale);
  const finalTarget = netHops[netHops.length - 1]?.target ?? firstSource;

  const ordinaryTracesForGrid = isStackingRoutes
    ? ordinaryRepeatedTraces
    : ordinaryRepeatedTraces
        .map((trace, hopIndex) => {
          const visibleSteps = visibleStepsForHop(revealedStepCount, stepsPerHop, hopIndex);
          return trace.slice(0, Math.min(trace.length, visibleSteps + 1));
        })
        .filter((trace) => trace.length > 0);

  const gridDots = useMemo(
    () =>
      makeProjectedGridDots({
        radius: gridRadius,
        traces: [
          ...(showSelectedTransform && showOrdinary ? ordinaryTracesForGrid : []),
          ...(showSelectedTransform && showInversion ? [inversionTrace] : []),
          ...(unitFieldActive && !supportGraphModeActive ? allUnitFieldTraces.map((entry) => entry.trace) : []),
          ...(supportGraph ? [supportGraph.nodes.map((node) => ({ type: node.type }))] : []),
        ],
        rotation,
        axisOrientation,
        zoomScale,
        expanded,
      }),
    [
      gridRadius,
      transform.id,
      viewMode,
      rotation,
      axisOrientation,
      zoomScale,
      expanded,
      pathMode,
      selectedPathIndex,
      hopCount,
      revealedStepCount,
      showOrdinary,
      showInversion,
      showSelectedTransform,
      unitFieldActive,
      allUnitFieldTraces,
      supportGraph,
      supportGraphModeActive,
    ]
  );

  const axisSegments = TYPE_AXES.map((axis) => {
    const positiveType = axisType(axis.key, 2);
    const negativeType = axisType(axis.key, -2);

    return {
      axis,
      positive: projectType3D(positiveType, rotation, expanded, axisOrientation, zoomScale),
      negative: projectType3D(negativeType, rotation, expanded, axisOrientation, zoomScale),
      positiveLabel: projectType3D(axisType(axis.key, 2.25), rotation, expanded, axisOrientation, zoomScale),
      negativeLabel: projectType3D(axisType(axis.key, -2.25), rotation, expanded, axisOrientation, zoomScale),
    };
  });

  const handlePointerDown = (event) => {
    setDrag({
      x: event.clientX,
      y: event.clientY,
      yaw: rotation.yaw,
      pitch: rotation.pitch,
    });
  };

  const handlePointerMove = (event) => {
    if (!drag) return;

    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;

    setRotation({
      yaw: drag.yaw + dx * 0.008,
      pitch: clampNumber(drag.pitch + dy * 0.008, -1.35, 1.35),
    });
  };

  const handlePointerUp = () => {
    setDrag(null);
  };

  return (
    <div
      tabIndex={0}
      onKeyDown={handleAxisKeyDown}
      style={{
        position: "relative",
        width: "100%",
        height: expanded ? "100%" : "auto",
        outline: "none",
        display: expanded ? "grid" : "block",
        gridTemplateRows: expanded ? "minmax(0, 1fr) auto" : undefined,
        gap: expanded ? "8px" : undefined,
      }}
    >
      <AxisRotationControls
        selectedAxis={selectedRotationAxis}
        setSelectedAxis={setSelectedRotationAxis}
        onRotate={rotateSelectedAxis}
        onReset={resetAxisRotations}
        onAxisDoubleClick={alignAxisToPositiveX}
        onToggleAxisVisibility={toggleAxisVisibility}
        axisVisibility={axisVisibility}
        onStep={stepForward}
        canStep={hopCount < MAX_TRANSFORM_HOPS}
        onZoom={adjustZoom}
        expanded={expanded}
      />

      <svg
        viewBox={expanded ? "0 0 1200 760" : "0 0 760 480"}
        role="img"
        aria-label="Interactive 3D projection of the six-dimensional type lattice."
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{
          width: "100%",
          height: expanded ? "100%" : "auto",
          minHeight: expanded ? 0 : "360px",
          display: "block",
          borderRadius: "7px",
          background: "rgba(0,0,0,0.18)",
          border: "1px solid rgba(232, 223, 200, 0.14)",
          cursor: drag ? "grabbing" : "grab",
          touchAction: "none",
        }}
      >
      <defs>
        <marker id={expanded ? "arrowNetLarge" : "arrowNet"} markerWidth="7" markerHeight="7" refX="7" refY="2.5" orient="auto">
          <path d="M0,0 L0,5 L7,2.5 z" fill="#f2ead2" opacity="0.92" />
        </marker>
        <marker id={expanded ? "arrowOrdLarge" : "arrowOrd"} markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#f2ead2" opacity="0.92" />
        </marker>
        <marker id={expanded ? "arrowInvLarge" : "arrowInv"} markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#ddd4bc" opacity="0.92" />
        </marker>
      </defs>

      <text
        x={expanded ? 34 : 24}
        y={expanded ? 38 : 30}
        fill="#e8dfc8"
        fontSize={expanded ? "20" : "15"}
        fontFamily={PROSE_FONT}
      >
        <tspan>drag to rotate; dots are finite projected </tspan>
        <tspan fontFamily="KaTeX_AMS, KaTeX_Main, serif">ℤ</tspan>
        <tspan baselineShift="super" fontSize={expanded ? "14" : "10"}>6</tspan>
        <tspan> lattice addresses</tspan>
      </text>

      {gridDots.map((dot) => (
        <circle
          key={dot.key}
          cx={dot.x}
          cy={dot.y}
          r={dot.visited ? (expanded ? 2.6 : 1.9) : (expanded ? 0.70 : 0.50)}
          fill={dot.visited ? "rgba(255,247,223,0.72)" : "rgba(232,223,200,0.85)"}
          opacity={dot.opacity}
        />
      ))}

      {axisSegments
        .filter((segment) => isAxisVisible(segment.axis.key))
        .map((segment) => (
        <g key={segment.axis.key}>
          <line
            x1={segment.negative.x}
            y1={segment.negative.y}
            x2={segment.positive.x}
            y2={segment.positive.y}
            stroke="rgba(232,223,200,0.34)"
            strokeWidth={expanded ? "2.2" : "1.5"}
          />

          <SvgAxisLabel
            x={segment.positiveLabel.x}
            y={segment.positiveLabel.y}
            sign="+"
            symbol={axisDisplayLabel(segment.axis.key)}
            opacity={0.92}
            expanded={expanded}
          />
          <SvgAxisLabel
            x={segment.negativeLabel.x}
            y={segment.negativeLabel.y}
            sign="−"
            symbol={axisDisplayLabel(segment.axis.key)}
            opacity={0.74}
            expanded={expanded}
          />
        </g>
      ))}

      {showAllWhiteUnitArrows &&
        allUnitMoveArrows.map((arrow) => (
          <line
            key={`all-unit-white-${arrow.id}`}
            x1={arrow.source.x}
            y1={arrow.source.y}
            x2={arrow.target.x}
            y2={arrow.target.y}
            stroke={arrow.current ? "rgba(242,234,210,0.54)" : "rgba(242,234,210,0.24)"}
            strokeWidth={arrow.current ? (expanded ? "2.4" : "1.7") : (expanded ? "1.5" : "1.0")}
            strokeLinecap="round"
            markerEnd={`url(#${expanded ? "arrowNetLarge" : "arrowNet"})`}
            opacity={arrow.current ? 0.9 : 0.7}
          >
            <title>{arrow.symbol}</title>
          </line>
        ))}

      {showAllColoredUnitPaths &&
        allUnitFieldPaths.map((entry) =>
          entry.path.slice(1).map((point, index) => {
            const previous = entry.path[index];
            const traceEntry = entry.trace[index + 1];

            if (!shouldDrawTraceEntry(traceEntry)) return null;

            return (
              <line
                key={`all-unit-colored-${entry.id}-${index}`}
                x1={previous.x}
                y1={previous.y}
                x2={point.x}
                y2={point.y}
                stroke={stepColorForTraceEntry(traceEntry)}
                strokeWidth={expanded ? "1.2" : "0.85"}
                strokeLinecap="round"
                opacity={showAllOrderedUnitPaths ? (entry.current ? 0.74 : 0.38) : (entry.current ? 0.95 : 0.56)}
              >
                <title>
                  {entry.routeCount > 1
                    ? `${entry.symbol} route ${entry.routeIndex + 1}/${entry.routeCount}`
                    : entry.symbol}
                </title>
              </line>
            );
          })
        )}

      {projectedSupportGraph &&
        projectedSupportGraph.edges
          .filter((edge) => isAxisVisible(TOKEN_AXIS_KEYS[edge.factor?.tokenId]))
          .map((edge) => {
          const strokeWidth = expanded
            ? 0.9 + 2.6 * edge.weight
            : 0.55 + 1.8 * edge.weight;
          const opacity = 0.24 + 0.58 * edge.weight;

          return (
            <line
              key={`support-edge-${edge.key}`}
              x1={edge.source.x}
              y1={edge.source.y}
              x2={edge.target.x}
              y2={edge.target.y}
              stroke={stepColorForTraceEntry({ factor: edge.factor })}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              opacity={opacity}
            >
              <title>
                {`${edge.stepLabel}; ordered-route reuse ${Math.round(edge.multiplicity).toLocaleString()}`}
              </title>
            </line>
          );
        })}

      {projectedSupportGraph &&
        projectedSupportGraph.nodes.map((node) => {
          const radius = expanded
            ? 2.1 + 2.6 * node.weight
            : 1.35 + 1.75 * node.weight;

          return (
            <circle
              key={`support-node-${node.key}`}
              cx={node.x}
              cy={node.y}
              r={radius}
              fill="rgba(255,247,223,0.82)"
              opacity={0.35 + 0.5 * node.weight}
            >
              <title>
                {`${formatViewerTypeDetailed(node.type)}; ordered-route reuse ${Math.round(node.multiplicity).toLocaleString()}`}
              </title>
            </circle>
          );
        })}

      {showSelectedTransform && showNet && shouldDrawNet &&
        netHops.map((hop, hopIndex) =>
          isStackingRoutes || hopIndex < visibleNetHops ? (
            <line
              key={`net-hop-${hopIndex}`}
              x1={hop.source.x}
              y1={hop.source.y}
              x2={hop.target.x}
              y2={hop.target.y}
              stroke="rgba(242,234,210,0.56)"
              strokeWidth={expanded ? "3" : "2.0"}
              markerEnd={`url(#${expanded ? "arrowNetLarge" : "arrowNet"})`}
            />
          ) : null
        )}

      {showSelectedTransform && showOrdinary &&
        ordinaryHopPaths.map((path, hopIndex) =>
          path.slice(1).map((point, index) => {
            const globalStep = hopIndex * stepsPerHop + index + 1;
            if (!isStackingRoutes && globalStep > revealedStepCount) return null;

            const previous = path[index];
            const traceEntry = ordinaryRepeatedTraces[hopIndex][index + 1];

            if (!shouldDrawTraceEntry(traceEntry)) return null;

            return (
              <line
                key={`ordinary-colored-step-${hopIndex}-${index}`}
                x1={previous.x}
                y1={previous.y}
                x2={point.x}
                y2={point.y}
                stroke={stepColorForTraceEntry(traceEntry)}
                strokeWidth={expanded ? "1.5" : "1.0"}
                strokeLinecap="round"
                opacity="0.96"
              />
            );
          })
        )}

      {showSelectedTransform && showInversion && (
        <polyline
          points={toPointString(inversionPath)}
          fill="none"
          stroke="rgba(233,223,197,0.86)"
          strokeWidth={expanded ? "3.6" : "2.6"}
          strokeDasharray="8 6"
          markerEnd={`url(#${expanded ? "arrowInvLarge" : "arrowInv"})`}
        />
      )}

      {showSelectedTransform && showOrdinary &&
        ordinaryHopPaths.map((path, hopIndex) => {
          const visibleSteps = visibleStepsForHop(revealedStepCount, stepsPerHop, hopIndex);

          return path.map((point, index) => {
            if (!isStackingRoutes && index > visibleSteps) return null;
            if (index > 0 && !shouldDrawTraceEntry(ordinaryRepeatedTraces[hopIndex][index])) return null;

            return (
              <PathNode3D
                key={`ord-node-${hopIndex}-${index}`}
                point={point}
                index={index}
                labelMode={labelMode}
                trace={ordinaryRepeatedTraces[hopIndex]}
                fill={
                  index === 0
                    ? "#fff7df"
                    : stepColorForTraceEntry(ordinaryRepeatedTraces[hopIndex][index])
                }
                expanded={expanded}
              />
            );
          });
        })}

      {showSelectedTransform && showInversion &&
        inversionPath.map((point, index) => (
          <PathNode3D
            key={`inv-node-${index}`}
            point={point}
            index={index}
            labelMode={labelMode}
            trace={inversionTrace}
            fill="rgba(233,223,197,0.86)"
            expanded={expanded}
            yOffset={expanded ? 22 : 17}
          />
        ))}

      {!gridOnlyModeActive && (
        <text
          x={firstSource.x - 10}
          y={firstSource.y - 12}
          fill="#e8dfc8"
          fontSize={expanded ? "18" : "14"}
          textAnchor="end"
          fontFamily={PROSE_FONT}
        >
          source
        </text>
      )}
      {showSelectedTransform && (
        <text
          x={finalTarget.x + 10}
          y={finalTarget.y - 12}
          fill="#e8dfc8"
          fontSize={expanded ? "18" : "14"}
          fontFamily={PROSE_FONT}
        >
          target
        </text>
      )}
      </svg>

      {isUnitModel && (
        <div
          style={{
            position: "relative",
            marginTop: expanded ? 0 : "8px",
            padding: "8px 10px",
            borderRadius: "6px",
            background: "rgba(0,0,0,0.24)",
            border: "1px solid rgba(232,223,200,0.13)",
            boxSizing: "border-box",
            fontFamily: PROSE_FONT,
            fontSize: expanded ? "12px" : "11px",
            lineHeight: 1.35,
            opacity: 0.88,
            display: "flex",
            flexWrap: "wrap",
            gap: "8px 14px",
          }}
        >
          <span style={{ fontWeight: 600 }}>unique colored segments</span>
          {visibleSegmentStats.map((stat) => (
            <span
              key={stat.axisKey}
              style={{
                color: stat.visible ? axisStepColor(stat.axisKey) : "rgba(232,223,200,0.34)",
                opacity: stat.visible ? 1 : 0.54,
                whiteSpace: "nowrap",
              }}
              title={`${stat.label}: ${stat.uniqueSegmentCount} unique segments; ${stat.componentCount} disconnected component${stat.componentCount === 1 ? "" : "s"}`}
            >
              {stat.label}: {stat.uniqueSegmentCount} seg / {stat.componentCount} comp
            </span>
          ))}
        </div>
      )}

      {supportGraph && (
        <div
          style={{
            position: "relative",
            marginTop: expanded ? 0 : "8px",
            padding: "8px 10px",
            borderRadius: "6px",
            background: "rgba(0,0,0,0.30)",
            border: "1px solid rgba(232,223,200,0.16)",
            boxSizing: "border-box",
            fontFamily: PROSE_FONT,
            fontSize: expanded ? "13px" : "12px",
            lineHeight: 1.35,
            opacity: 0.90,
            display: "flex",
            flexWrap: "wrap",
            gap: "10px 16px",
          }}
        >
          <span style={{ fontWeight: 600 }}>
            Full support graph of {supportGraphSubjectLabel}
          </span>
          <span>{supportGraphScopeLabel}</span>
          <span>ordered routes represented: {Math.round(supportGraph.theoreticalOrderedPathCount).toLocaleString()}</span>
          <span>support addresses: {supportGraph.nodes.length.toLocaleString()}</span>
          <span>support edges: {supportGraph.edges.length.toLocaleString()}</span>
          <span>max address reuse: {Math.round(supportGraph.maxNodeMultiplicity).toLocaleString()}</span>
          <span>max edge reuse: {Math.round(supportGraph.maxEdgeMultiplicity).toLocaleString()}</span>
        </div>
      )}

      {unitFieldAudit && unitFieldMode !== "selected" && !supportGraphModeActive && (
        <div
          style={{
            position: "relative",
            marginTop: expanded ? 0 : "8px",
            padding: "8px 10px",
            borderRadius: "6px",
            background: "rgba(0,0,0,0.30)",
            border: "1px solid rgba(232,223,200,0.16)",
            boxSizing: "border-box",
            fontFamily: PROSE_FONT,
            fontSize: expanded ? "13px" : "12px",
            lineHeight: 1.35,
            opacity: 0.86,
            display: "flex",
            flexWrap: "wrap",
            gap: "10px 16px",
          }}
        >
          <span>unit addresses: {unitFieldAudit.unitAddressCount}</span>
          <span>ordered paths drawn: {unitFieldAudit.drawnOrderedPathCount.toLocaleString()}</span>
          <span>theoretical ordered paths: {unitFieldAudit.theoreticalOrderedPathCount.toLocaleString()}</span>
          <span>capped units: {unitFieldAudit.cappedUnitCount}</span>
          <span>unique endpoints: {unitFieldAudit.uniqueEndpointCount}</span>
          <span>unique visited addresses: {unitFieldAudit.uniqueVisitedAddressCount}</span>
          <span>reused addresses: {unitFieldAudit.reusedVisitedAddressCount}</span>
        </div>
      )}
    </div>
  );
}

function PathNode3D({ point, index, labelMode, trace, fill, expanded, yOffset = -10 }) {
  const label =
    labelMode === "numbers"
      ? String(index)
      : labelMode === "factors" && trace[index]?.stepLabel
        ? trace[index].stepLabel
        : "";

  return (
    <g>
      <circle cx={point.x} cy={point.y} r={expanded ? 4 : 2.4} fill={fill} />
      {label && (
        <text
          x={point.x}
          y={point.y + yOffset}
          fill={fill}
          fontSize={expanded ? "16" : "12"}
          textAnchor="middle"
          fontFamily={MATH_FONT}
        >
          {label}
        </text>
      )}
    </g>
  );
}

function ToggleGroup({ label, value, onChange, options }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "5px",
        borderRadius: "7px",
        background: "rgba(0,0,0,0.18)",
        border: "1px solid rgba(232,223,200,0.13)",
      }}
    >
      <span style={{ padding: "0 6px", fontSize: "14px", opacity: 0.7 }}>{label}:</span>
      {options.map(([optionValue, optionLabel]) => {
        const active = value === optionValue;

        return (
          <button
            key={optionValue}
            type="button"
            onClick={() => onChange(optionValue)}
            style={{
              border: "none",
              borderRadius: "5px",
              padding: "1px 7px",
              cursor: "pointer",
              color: "#e8dfc8",
              background: active ? "rgba(232,223,200,0.18)" : "transparent",
              fontFamily: PROSE_FONT,
              fontSize: "14px",
            }}
          >
            {optionLabel}
          </button>
        );
      })}
    </div>
  );
}

function PathModeControls({
  transform,
  isUnitModel = false,
  pathMode,
  setPathMode,
  selectedPathIndex,
  setSelectedPathIndex,
  cyclePlaybackMode = "single",
  setCyclePlaybackMode = () => {},
  cyclePlaybackActive = false,
  setCyclePlaybackActive = () => {},
  cycleStackCount = 1,
  setCycleStackCount = () => {},
}) {
  const ordinaryMeta = getPathFamilyMetadata(transform.ordinaryLeg.boundaryWord);
  const inversionMeta = getPathFamilyMetadata(transform.inversionLeg.boundaryWord);
  const cycleLimit = ordinaryMeta.enumerationLimit ?? 720;
  const routeCycleCount = Math.min(ordinaryMeta.pathFamilySize, cycleLimit);

  const ordinaryCanCycle =
    ordinaryMeta.pathFamilySize > 1 && ordinaryMeta.pathFamilySize <= cycleLimit;

  const inversionCanCycle =
    inversionMeta.pathFamilySize > 1 && inversionMeta.pathFamilySize <= cycleLimit;

  const ordinaryIndex =
    routeCycleCount > 0
      ? ((selectedPathIndex % routeCycleCount) + routeCycleCount) % routeCycleCount
      : 0;

  const routeCountLabel =
    ordinaryMeta.pathFamilySize === 1
      ? "1 admissible route"
      : `${ordinaryMeta.pathFamilySize.toLocaleString()} admissible routes`;

  const cycleCapLabel =
    ordinaryMeta.pathFamilySize > cycleLimit
      ? `${routeCountLabel}; route cycling capped at ${cycleLimit.toLocaleString()} — use full support`
      : routeCountLabel;

  const setCanonicalRoute = () => {
    setCyclePlaybackActive(false);
    setCyclePlaybackMode("single");
    setPathMode("canonical");
    setSelectedPathIndex(0);
    setCycleStackCount(1);
  };

  const advanceRoute = () => {
    if (!ordinaryCanCycle || routeCycleCount <= 1) return;

    setCyclePlaybackActive(false);
    setCyclePlaybackMode("single");
    setPathMode("cycle");
    setCycleStackCount(1);

    setSelectedPathIndex((index) => {
      const current =
        ((index % routeCycleCount) + routeCycleCount) % routeCycleCount;
      return (current + 1) % routeCycleCount;
    });
  };

  const startRoutePlayback = () => {
    if (!ordinaryCanCycle || routeCycleCount <= 1) return;

    setCyclePlaybackMode("single");
    setPathMode("cycle");
    setSelectedPathIndex(0);
    setCycleStackCount(1);
    setCyclePlaybackActive(true);
  };

  const stopRoutePlayback = () => {
    setCyclePlaybackActive(false);
  };

  const setSupportMode = () => {
    setCyclePlaybackActive(false);
    setCyclePlaybackMode("support");
    setPathMode("canonical");
    setSelectedPathIndex(0);
    setCycleStackCount(1);
  };

  const readout = isUnitModel
    ? cyclePlaybackMode === "support"
      ? `full support; ${routeCountLabel} represented exactly`
      : pathMode === "cycle" && ordinaryCanCycle
        ? `route ${ordinaryIndex + 1}/${routeCycleCount}; ${routeCountLabel}`
        : cycleCapLabel
    : pathMode === "cycle" && ordinaryCanCycle
      ? `ordinary ${ordinaryIndex + 1}/${ordinaryMeta.pathFamilySize.toLocaleString()}; inversion ${
          inversionCanCycle
            ? `${ordinaryIndex + 1}/${inversionMeta.pathFamilySize.toLocaleString()}`
            : `canonical (${inversionMeta.pathFamilySize.toLocaleString()} paths)`
        }`
      : `canonical; ordinary ${ordinaryMeta.pathFamilySize.toLocaleString()} paths, inversion ${inversionMeta.pathFamilySize.toLocaleString()} paths`;

  const buttonStyle = (active) => ({
    border: "none",
    borderRadius: "5px",
    padding: "1px 7px",
    cursor: "pointer",
    color: "#e8dfc8",
    background: active ? "rgba(232,223,200,0.18)" : "transparent",
    fontFamily: PROSE_FONT,
    fontSize: "14px",
    opacity: 1,
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "5px",
        borderRadius: "7px",
        background: "rgba(0,0,0,0.18)",
        border: "1px solid rgba(232,223,200,0.13)",
        flexWrap: "wrap",
      }}
    >
      <span style={{ padding: "0 6px", fontSize: "14px", opacity: 0.7 }}>
        {isUnitModel ? "route:" : "path:"}
      </span>

      <button
        type="button"
        onClick={setCanonicalRoute}
        style={buttonStyle(cyclePlaybackMode !== "support" && pathMode === "canonical")}
        title="Show the canonical representative route"
      >
        canonical
      </button>

      {ordinaryCanCycle && (
        <button
          type="button"
          onClick={advanceRoute}
          style={buttonStyle(cyclePlaybackMode !== "support" && pathMode === "cycle" && !cyclePlaybackActive)}
          title="Advance to the next ordered route"
        >
          next
        </button>
      )}

      {ordinaryCanCycle && (
        <button
          type="button"
          onClick={cyclePlaybackActive ? stopRoutePlayback : startRoutePlayback}
          style={buttonStyle(cyclePlaybackActive)}
          title={cyclePlaybackActive ? "Stop route playback" : "Play through ordered routes"}
          aria-label={cyclePlaybackActive ? "Stop route playback" : "Play through ordered routes"}
        >
          <span
            style={{
              display: "inline-block",
              fontFamily: PROSE_FONT,
              fontSize: "0.95em",
              lineHeight: 1,
              transform: cyclePlaybackActive ? "translateY(-1px)" : "translateX(1px)",
            }}
          >
            {cyclePlaybackActive ? "■" : "▶"}
          </span>
        </button>
      )}

      {isUnitModel && (
        <button
          type="button"
          onClick={setSupportMode}
          style={buttonStyle(cyclePlaybackMode === "support")}
          title="Draw the exact deduplicated support graph for this route family"
        >
          full support
        </button>
      )}

      {!isUnitModel && pathMode === "cycle" && ordinaryCanCycle && (
        <button
          type="button"
          onClick={() => setSelectedPathIndex((index) => index + 1)}
          style={buttonStyle(false)}
        >
          next
        </button>
      )}

      <span style={{ padding: "0 6px", fontSize: "14px", opacity: 0.68 }}>
        {readout}
      </span>
    </div>
  );
}

function StepSequence({ title, trace, unitMode = false }) {
  const steps = trace.slice(1);

  return (
    <div style={smallCardStyle}>
      <div style={{ fontSize: "17px", marginBottom: "8px" }}>{title}</div>

      {unitMode && (
        <div
          style={{
            marginBottom: "10px",
            fontSize: "14px",
            opacity: 0.68,
            fontFamily: PROSE_FONT,
            lineHeight: 1.25,
          }}
        >
          address order: (time, length, charge, temperature, mass, mol)
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "48px minmax(70px, 0.8fr) minmax(160px, 1.2fr)",
          gap: "6px 10px",
          fontFamily: MATH_FONT,
          fontSize: "14px",
          lineHeight: 1.35,
          alignItems: "center",
        }}
      >
        <span style={{ opacity: 0.7 }}>step</span>
        <span style={{ opacity: 0.7 }}>{unitMode ? "unit factor" : "factor"}</span>
        <span style={{ opacity: 0.7 }}>address after step</span>

        {steps.map((entry, index) => (
          <FragmentRow
            key={`${title}-${index}`}
            index={index + 1}
            factor={entry.stepLabel}
            address={formatType(entry.type)}
          />
        ))}
      </div>
    </div>
  );
}

function FragmentRow({ index, factor, address }) {
  return (
    <>
      <span>{index}</span>
      <span>
        <MathText value={factor} />
      </span>
      <span>
        <MathText value={address} />
      </span>
    </>
  );
}

function traceBoundaryPath(sourceType, word, pathOptions = {}) {
  const unitFactors = getRepresentativePathFactors(word, pathOptions);
  const points = [
    {
      index: 0,
      type: sourceType,
      stepLabel: "source",
    },
  ];

  let current = sourceType;

  unitFactors.forEach((factor, index) => {
    const token = getBoundaryToken(factor.tokenId);
    current = addType(current, scaleType(factor.exponent, token.type));

    const baseSymbol = token.displaySymbol ?? token.symbol;
    const stepLabel = pathOptions.unitLabels
      ? formatUnitFactorText(factor)
      : factor.exponent === -1
        ? `${baseSymbol}^-1`
        : baseSymbol;

    points.push({
      index: index + 1,
      type: current,
      factor,
      stepLabel,
    });
  });

  return points;
}


function supportFactorKey(factor) {
  return `${factor.tokenId}:${factor.exponent}`;
}

function addTypesRepeated(type, delta, count) {
  let current = type;
  for (let index = 0; index < count; index += 1) {
    current = addType(current, delta);
  }
  return current;
}

const SUPPORT_FACTORIAL_CACHE = [1];

function factorialNumber(n) {
  for (let index = SUPPORT_FACTORIAL_CACHE.length; index <= n; index += 1) {
    SUPPORT_FACTORIAL_CACHE[index] = SUPPORT_FACTORIAL_CACHE[index - 1] * index;
  }

  return SUPPORT_FACTORIAL_CACHE[n] ?? 1;
}

function orderedRouteCountFromCounts(counts) {
  const total = counts.reduce((sum, count) => sum + count, 0);
  const denominator = counts.reduce(
    (product, count) => product * factorialNumber(count),
    1
  );

  return factorialNumber(total) / denominator;
}

function supportStateMultiplicity(counts, totals) {
  const remaining = totals.map((total, index) => total - counts[index]);
  return orderedRouteCountFromCounts(counts) * orderedRouteCountFromCounts(remaining);
}

function supportEdgeMultiplicity(counts, totals, groupIndex) {
  const remainingAfterEdge = totals.map((total, index) =>
    total - counts[index] - (index === groupIndex ? 1 : 0)
  );

  if (remainingAfterEdge.some((count) => count < 0)) return 0;

  return orderedRouteCountFromCounts(counts) * orderedRouteCountFromCounts(remainingAfterEdge);
}

function makeSupportFactorGroups(word) {
  const factors = getRepresentativePathFactors(word, { pathMode: "canonical" });
  const groups = new Map();

  factors.forEach((factor) => {
    const key = supportFactorKey(factor);
    const token = getBoundaryToken(factor.tokenId);
    const delta = scaleType(factor.exponent, token.type);
    const baseSymbol = token.displaySymbol ?? token.symbol;
    const stepLabel = factor.exponent === -1 ? `${baseSymbol}^-1` : baseSymbol;

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        factor,
        delta,
        stepLabel,
        count: 0,
      });
    }

    groups.get(key).count += 1;
  });

  return Array.from(groups.values());
}

function makeBoundarySupportGraph(sourceType, word, owner = {}) {
  const groups = makeSupportFactorGroups(word);
  const totals = groups.map((group) => group.count);
  const metadata = getPathFamilyMetadata(word);
  const theoreticalOrderedPathCount =
    metadata.pathFamilySize ?? orderedRouteCountFromCounts(totals);

  const nodes = new Map();
  const edges = new Map();
  const counts = Array(groups.length).fill(0);
  const states = [];

  function recordState(type) {
    const stateCounts = [...counts];
    const key = typeKey(type);
    const multiplicity = supportStateMultiplicity(stateCounts, totals);

    states.push({
      key,
      type,
      counts: stateCounts,
      multiplicity,
    });

    const previous = nodes.get(key);
    nodes.set(key, {
      key,
      type,
      multiplicity: (previous?.multiplicity ?? 0) + multiplicity,
      owners: new Set([...(previous?.owners ?? []), owner.id].filter(Boolean)),
    });
  }

  function walk(groupIndex, currentType) {
    if (groupIndex >= groups.length) {
      recordState(currentType);
      return;
    }

    const group = groups[groupIndex];
    let typeAtCount = currentType;

    for (let count = 0; count <= group.count; count += 1) {
      counts[groupIndex] = count;
      walk(groupIndex + 1, typeAtCount);

      if (count < group.count) {
        typeAtCount = addType(typeAtCount, group.delta);
      }
    }
  }

  walk(0, sourceType);

  states.forEach((state) => {
    groups.forEach((group, groupIndex) => {
      if (state.counts[groupIndex] >= group.count) return;

      const targetType = addType(state.type, group.delta);
      const sourceKey = typeKey(state.type);
      const targetKey = typeKey(targetType);
      const edgeKey = `${sourceKey}->${targetKey}|${group.key}`;
      const multiplicity = supportEdgeMultiplicity(state.counts, totals, groupIndex);
      const previous = edges.get(edgeKey);

      edges.set(edgeKey, {
        key: edgeKey,
        sourceKey,
        targetKey,
        sourceType: state.type,
        targetType,
        factor: group.factor,
        stepLabel: group.stepLabel,
        multiplicity: (previous?.multiplicity ?? 0) + multiplicity,
        owners: new Set([...(previous?.owners ?? []), owner.id].filter(Boolean)),
      });
    });
  });

  return {
    owner,
    theoreticalOrderedPathCount,
    nodes: Array.from(nodes.values()),
    edges: Array.from(edges.values()),
  };
}

function mergeSupportGraphs(sourceType, transforms) {
  const nodes = new Map();
  const edges = new Map();
  let theoreticalOrderedPathCount = 0;

  transforms.forEach((transform) => {
    const graph = makeBoundarySupportGraph(
      sourceType,
      transform.ordinaryLeg.boundaryWord,
      {
        id: transform.id,
        symbol: transform.symbol,
      }
    );

    theoreticalOrderedPathCount += graph.theoreticalOrderedPathCount;

    graph.nodes.forEach((node) => {
      const previous = nodes.get(node.key);
      nodes.set(node.key, {
        ...node,
        multiplicity: (previous?.multiplicity ?? 0) + node.multiplicity,
        owners: new Set([...(previous?.owners ?? []), ...(node.owners ?? [])]),
      });
    });

    graph.edges.forEach((edge) => {
      const previous = edges.get(edge.key);
      edges.set(edge.key, {
        ...edge,
        multiplicity: (previous?.multiplicity ?? 0) + edge.multiplicity,
        owners: new Set([...(previous?.owners ?? []), ...(edge.owners ?? [])]),
      });
    });
  });

  const nodeList = Array.from(nodes.values());
  const edgeList = Array.from(edges.values());

  return {
    transformCount: transforms.length,
    theoreticalOrderedPathCount,
    nodes: nodeList,
    edges: edgeList,
    maxNodeMultiplicity: Math.max(1, ...nodeList.map((node) => node.multiplicity)),
    maxEdgeMultiplicity: Math.max(1, ...edgeList.map((edge) => edge.multiplicity)),
  };
}

function makeProjectedGridDots({ radius, traces, rotation, axisOrientation, zoomScale, expanded }) {
  const types = [];
  const visitedKeys = new Set();

  traces.flat().forEach((entry) => {
    const key = typeKey(entry.type);
    visitedKeys.add(key);
    types.push(entry.type);
  });

  const values = [];
  for (let value = -radius; value <= radius; value += 1) {
    values.push(value);
  }

  for (const t of values) {
    for (const l of values) {
      for (const q of values) {
        for (const theta of values) {
          for (const m of values) {
            for (const n of values) {
              types.push({ t, l, q, theta, m, n });
            }
          }
        }
      }
    }
  }

  const map = new Map();
  types.forEach((type) => {
    map.set(typeKey(type), type);
  });

  return Array.from(map.entries())
    .map(([key, type]) => {
      const point = projectType3D(type, rotation, expanded, axisOrientation, zoomScale);
      const visited = visitedKeys.has(key);

      return {
        key,
        type,
        visited,
        ...point,
        opacity: visited ? 0.88 : depthOpacity(point.depth),
      };
    })
    .sort((a, b) => a.depth - b.depth);
}

function axisType(axisKey, amount) {
  return {
    t: axisKey === "t" ? amount : 0,
    l: axisKey === "l" ? amount : 0,
    q: axisKey === "q" ? amount : 0,
    theta: axisKey === "theta" ? amount : 0,
    m: axisKey === "m" ? amount : 0,
    n: axisKey === "n" ? amount : 0,
  };
}

const AXIS_3D = {
  t: normalize3D({ x: 1, y: 0, z: 0 }),
  l: normalize3D({ x: 0, y: 1, z: 0 }),
  q: normalize3D({ x: 0, y: 0, z: 1 }),
  theta: normalize3D({ x: -1, y: 1, z: 1 }),
  m: normalize3D({ x: 1, y: -1, z: 1 }),
  n: normalize3D({ x: 1, y: 1, z: -1 }),
};

function typeTo3D(type) {
  return Object.entries(AXIS_3D).reduce(
    (point, [key, axis]) => ({
      x: point.x + type[key] * axis.x,
      y: point.y + type[key] * axis.y,
      z: point.z + type[key] * axis.z,
    }),
    { x: 0, y: 0, z: 0 }
  );
}

function projectType3D(
  type,
  rotation,
  expanded,
  axisOrientation = IDENTITY_ORIENTATION,
  zoomScale = 1
) {
  const raw = applyOrientation(typeTo3D(type), axisOrientation);
  const rotated = rotate3D(raw, rotation);
  const depth = rotated.z;
  const zoom = (expanded ? 138 : 82) * zoomScale;
  const center = expanded ? { x: 600, y: 390 } : { x: 380, y: 255 };
  const perspective = 1 / (1 + depth * 0.075);

  return {
    x: center.x + rotated.x * zoom * perspective,
    y: center.y - rotated.y * zoom * perspective,
    depth,
  };
}

function rotate3D(point, rotation) {
  const cy = Math.cos(rotation.yaw);
  const sy = Math.sin(rotation.yaw);
  const cp = Math.cos(rotation.pitch);
  const sp = Math.sin(rotation.pitch);

  const x1 = cy * point.x + sy * point.z;
  const z1 = -sy * point.x + cy * point.z;
  const y1 = point.y;

  return {
    x: x1,
    y: cp * y1 - sp * z1,
    z: sp * y1 + cp * z1,
  };
}

function normalize3D(point) {
  const length = Math.hypot(point.x, point.y, point.z);

  return {
    x: point.x / length,
    y: point.y / length,
    z: point.z / length,
  };
}

function depthOpacity(depth) {
  return clampNumber(0.36 + (depth + 2.5) * 0.032, 0.28, 0.62);
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function typeKey(type) {
  return [type.t, type.l, type.q, type.theta, type.m, type.n].join(",");
}

function toPointString(points) {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

function pathPolicyLabel(word) {
  const metadata = getPathFamilyMetadata(word);
  const sourceLabels = {
    canonical_visualization: "canonical visualization",
    dictionary_explicit: "dictionary explicit",
    user_selected: "user selected",
    unknown: "unknown",
  };

  const source = sourceLabels[metadata.pathOrderSource] ?? metadata.pathOrderSource;
  const pathCount =
    metadata.pathFamilySize === 1
      ? "1 admissible path"
      : `${metadata.pathFamilySize.toLocaleString()} admissible paths`;

  return `${pathCount}; representative: ${source}`;
}

function unitRoutePolicyLabel(word) {
  const metadata = getPathFamilyMetadata(word);
  const sourceLabels = {
    canonical_visualization: "canonical visualization",
    dictionary_explicit: "dictionary explicit",
    user_selected: "user selected",
    unknown: "unknown",
  };

  const source = sourceLabels[metadata.pathOrderSource] ?? metadata.pathOrderSource;
  const routeCount =
    metadata.pathFamilySize === 1
      ? "1 admissible route"
      : `${metadata.pathFamilySize.toLocaleString()} admissible routes`;

  return `${routeCount}; representative: ${source}`;
}

function BoundaryWordSummary({ transform, isUnitModel = false }) {
  const ordinaryWord = transform.ordinaryLeg.boundaryWord;
  const inversionWord = transform.inversionLeg.boundaryWord;

  if (isUnitModel) {
    return (
      <div>
        <CodeLine label="unit monomial" value={formatUnitBoundaryWordText(ordinaryWord)} />
        <CodeLine label="unit net type" value={formatType(transform.ordinaryLeg.netTypeDisplacement)} />
        <CodeLine label="route family" value={unitRoutePolicyLabel(ordinaryWord)} />
      </div>
    );
  }

  return (
    <div>
      <CodeLine label="ordinary monomial" value={formatBoundaryPathWord(ordinaryWord)} />
      <CodeLine label="ordinary net type" value={formatType(transform.ordinaryLeg.netTypeDisplacement)} />
      <CodeLine label="ordinary path family" value={pathPolicyLabel(ordinaryWord)} />

      <CodeLine
        label="inversion monomial"
        value={formatStructuredProduct(ordinaryWord, BOX_WORD)}
      />
      <CodeLine label="inversion expanded" value={formatBoundaryPathWord(inversionWord)} />
      <CodeLine label="inversion net type" value={formatType(transform.inversionLeg.netTypeDisplacement)} />
      <CodeLine label="inversion path family" value={pathPolicyLabel(inversionWord)} />

      <CodeLine label="loop monomial" value={formatBoundaryPathWord(BOX_WORD)} />
      <CodeLine label="loop path family" value={pathPolicyLabel(BOX_WORD)} />
    </div>
  );
}


function UnitEndpointChecks({ transform }) {
  const routeEndpoint = addType(
    transform.sourceType,
    transform.ordinaryLeg.netTypeDisplacement
  );

  const expectedDisplacement = typeDelta(transform.sourceType, transform.targetType);

  const unitChecks = [
    {
      pass: equalType(routeEndpoint, transform.targetType),
      label: "unit route lands at target type",
      detail: `${formatType(transform.sourceType)} + ${formatType(transform.ordinaryLeg.netTypeDisplacement)} = ${formatType(routeEndpoint)}`,
    },
    {
      pass: equalType(transform.ordinaryLeg.netTypeDisplacement, expectedDisplacement),
      label: "unit displacement matches address",
      detail: `Δτ = ${formatType(transform.ordinaryLeg.netTypeDisplacement)}`,
    },
  ];

  return <CheckList checks={unitChecks} />;
}

function TransformInspectorDashboard({ transform, checks }) {
  const isUnitModel = isUnitModelTransform(transform);

  if (isUnitModel) {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "14px",
          alignItems: "start",
        }}
      >
        <InspectorCard title="Unit type address">
          <CodeLine label="source" value={formatViewerTypeDetailed(transform.sourceType)} />
          <CodeLine label="target" value={formatViewerTypeDetailed(transform.targetType)} />
          <CodeLine label="Δτ" value={formatType(transform.targetType)} />
          <CodeLine label="unit monomial" value={formatUnitBoundaryWordText(transform.ordinaryLeg.boundaryWord)} />
        </InspectorCard>

        <InspectorCard title="Endpoint checks">
          <UnitEndpointChecks transform={transform} />
        </InspectorCard>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: "14px",
        alignItems: "start",
      }}
    >
      <InspectorCard title="Type displacement">
        <CodeLine label="source" value={formatTypeDetailed(transform.sourceType)} />
        <CodeLine label="target" value={formatTypeDetailed(transform.targetType)} />
        <CodeLine label="Δτ" value={formatType(transform.targetType)} />
      </InspectorCard>

      <InspectorCard title="Scalar/operator geometry">
        <CodeLine label="external amplitude" value={transform.externalAmplitude.symbol} />
        <CodeLine label="internal readout" value={transform.internalReadout.symbol} />
        <CodeLine label="coefficient" value={transform.kappa} />

        <details style={{ marginTop: "12px" }}>
          <summary style={summaryStyle}>Compiled formulas</summary>
          <div style={{ marginTop: "10px" }}>
            <CodeLine label="scalar projection" value={transform.compiledScalarFormula} />
            <CodeLine label="operator projection" value={transform.compiledOperatorFormula} />
          </div>
        </details>
      </InspectorCard>

      <InspectorCard
        title={
          <>
            <LatexInline latex={String.raw`\mathbb{C}^{12}`} /> transform-sector signature
          </>
        }
      >
        <SectorSignaturePanel transform={transform} />
      </InspectorCard>

      <InspectorCard title="Endpoint checks" style={{ gridColumn: "1 / -1" }}>
        <CheckList checks={checks} />
      </InspectorCard>
    </div>
  );
}

function InspectorCard({ title, children, style = {} }) {
  return (
    <section
      style={{
        padding: "12px",
        borderRadius: "5px",
        background: "rgba(0,0,0,0.16)",
        border: "1px solid rgba(232,223,200,0.12)",
        ...style,
      }}
    >
      <h3
        style={{
          ...miniHeadingStyle,
          display: "flex",
          alignItems: "baseline",
          gap: "5px",
        }}
      >
        {title}
      </h3>
      {children}
    </section>
  );
}

function TransformInspector({ transform, checks }) {
  return (
    <div>
      <h3 style={miniHeadingStyle}>Type displacement</h3>
      <CodeLine label="source" value={formatTypeDetailed(transform.sourceType)} />
      <CodeLine label="target" value={formatTypeDetailed(transform.targetType)} />
      <CodeLine label="Δτ" value={formatType(transform.targetType)} />

      <Divider />

      <h3 style={miniHeadingStyle}>Scalar/operator geometry</h3>
      <CodeLine label="external amplitude" value={transform.externalAmplitude.symbol} />
      <CodeLine label="internal readout" value={transform.internalReadout.symbol} />
      <CodeLine label="coefficient" value={transform.kappa} />

      <details style={{ marginTop: "12px" }}>
        <summary style={summaryStyle}>Compiled formulas</summary>
        <div style={{ marginTop: "10px" }}>
          <CodeLine label="scalar projection" value={transform.compiledScalarFormula} />
          <CodeLine label="operator projection" value={transform.compiledOperatorFormula} />
        </div>
      </details>

      <Divider />

      <h3 style={miniHeadingStyle}>Endpoint checks</h3>
      <CheckList checks={checks} />
    </div>
  );
}

function SectorSignaturePanel({ transform }) {
  const [open, setOpen] = useState(false);
  const ordinarySupport = transform.transformSignature24D?.ordinarySupport ?? [];
  const inversionSupport = transform.transformSignature24D?.inversionSupport ?? [];

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        style={{
          border: "1px solid rgba(232,223,200,0.15)",
          borderRadius: "5px",
          background: "rgba(232,223,200,0.08)",
          color: "#e8dfc8",
          padding: "5px 9px",
          fontFamily: PROSE_FONT,
          cursor: "pointer",
          fontSize: "15px",
        }}
      >
        sector details {open ? "▾" : "▸"}
      </button>

      {open && (
        <div style={{ marginTop: "12px" }}>
          <CodeLine label="metric diagonal" value={`(${SECTOR_METRIC_DIAGONAL.join(", ")})`} />

          <div style={{ display: "grid", gap: "6px", marginTop: "12px" }}>
            {SECTOR_BLOCKS.map((block) => {
              const ordinary = ordinarySupport.includes(block.id);
              const inversion = inversionSupport.includes(block.id);

              return (
                <div
                  key={block.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "52px 1fr auto auto",
                    gap: "8px",
                    alignItems: "center",
                    fontSize: "15px",
                    padding: "3px 8px",
                    borderRadius: "5px",
                    background: ordinary || inversion ? "rgba(232,223,200,0.10)" : "rgba(255,255,255,0.035)",
                  }}
                >
                  <span>{block.label}</span>
                  <span style={{ opacity: 0.78 }}>{block.family}</span>
                  <span>{ordinary ? "ordinary" : ""}</span>
                  <span style={{ fontFamily: MATH_FONT }}>{inversion ? "⊠" : ""}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ValidationSummary() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: "14px",
      }}
    >
      <div style={smallCardStyle}>
        <h3 style={miniHeadingStyle}>⊠ loop</h3>
        <CheckList checks={MODEL_VALIDATION.boxLoop} />
      </div>

      <div style={smallCardStyle}>
        <h3 style={miniHeadingStyle}>Boundary words</h3>
        {MODEL_VALIDATION.boundaryWords.map((entry) => (
          <div key={entry.id} style={{ marginBottom: "10px" }}>
            <div style={{ fontSize: "17px" }}>{entry.name}</div>
            <CheckList checks={entry.checks} compact />
          </div>
        ))}
      </div>

      <div style={smallCardStyle}>
        <h3 style={miniHeadingStyle}>Paired transforms</h3>
        {MODEL_VALIDATION.pairedTransforms.map((entry) => (
          <div key={entry.id} style={{ marginBottom: "10px" }}>
            <div style={{ fontSize: "17px" }}>{entry.name}</div>
            <CheckList checks={entry.checks} compact />
          </div>
        ))}
      </div>
    </div>
  );
}

function CheckList({ checks, compact = false }) {
  return (
    <div style={{ display: "grid", gap: compact ? "4px" : "8px", marginTop: compact ? "4px" : "10px" }}>
      {checks.map((check) => (
        <div
          key={check.label}
          style={{
            display: "grid",
            gridTemplateColumns: "22px 1fr",
            gap: "8px",
            alignItems: "start",
            fontSize: compact ? "14px" : "16px",
          }}
        >
          <span style={{ color: check.pass ? "#d7f3c4" : "#ffc0b8" }}>
            {check.pass ? "✓" : "×"}
          </span>
          <span>
            {check.label}
            {check.detail && (
              <span
                style={{
                  display: "block",
                  opacity: 0.68,
                  fontSize: compact ? "13px" : "14px",
                  fontFamily: MATH_FONT,
                }}
              >
                <MathText value={check.detail} />
              </span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

function MathText({ value }) {
  return <>{renderMathText(String(value))}</>;
}

function renderMathText(value) {
  const pieces = [];
  let i = 0;

  while (i < value.length) {
    const char = value[i];

    if (char === "_" && i + 1 < value.length) {
      const parsed = parseScriptToken(value, i + 1);
      pieces.push(
        <sub key={pieces.length} style={{ fontSize: "0.72em", lineHeight: 0 }}>
          {parsed.token}
        </sub>
      );
      i = parsed.next;
      continue;
    }

    if (char === "^" && i + 1 < value.length) {
      const parsed = parseScriptToken(value, i + 1);
      pieces.push(
        <sup key={pieces.length} style={{ fontSize: "0.72em", lineHeight: 0 }}>
          {parsed.token}
        </sup>
      );
      i = parsed.next;
      continue;
    }

    pieces.push(char);
    i += 1;
  }

  return pieces;
}

function parseScriptToken(value, start) {
  if (value[start] === "{") {
    const end = value.indexOf("}", start + 1);

    if (end !== -1) {
      return {
        token: value.slice(start + 1, end),
        next: end + 1,
      };
    }
  }

  const match = value
    .slice(start)
    .match(/^[A-Za-z0-9αβγδεζηθικλμνξοπρστυφχψωΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ⊠]+/u);

  if (match) {
    return {
      token: match[0],
      next: start + match[0].length,
    };
  }

  return {
    token: value[start],
    next: start + 1,
  };
}

function CodeLine({ label, value }) {
  return (
    <div style={{ marginTop: "9px", fontSize: "16px", lineHeight: 1.35 }}>
      <span style={{ opacity: 0.72, fontFamily: PROSE_FONT }}>{label}: </span>
      <code
        style={{
          fontFamily: MATH_FONT,
          color: "#f4edd8",
          background: "rgba(0,0,0,0.18)",
          border: "1px solid rgba(232,223,200,0.11)",
          borderRadius: "5px",
          padding: "5px 7px",
          overflowWrap: "anywhere",
        }}
      >
        <MathText value={value} />
      </code>
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "rgba(232,223,200,0.16)", margin: "18px 0" }} />;
}

function Panel({ title, children }) {
  return (
    <section
      style={{
        minHeight: "280px",
        padding: "20px",
        borderRadius: "5px",
        background: "rgba(255,255,255,0.055)",
        border: "1px solid rgba(232, 223, 200, 0.18)",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <h2
        style={{
          margin: "0 0 14px",
          fontSize: "clamp(16px, 1.6vw, 21px)",
          lineHeight: 1.12,
          fontWeight: 500,
        }}
      >
        {title}
      </h2>

      <div
        style={{
          fontSize: "14px",
          lineHeight: 1.45,
        }}
      >
        {children}
      </div>
    </section>
  );
}

const miniHeadingStyle = {
  margin: "0 0 10px",
  fontSize: "19px",
  fontWeight: 500,
};

const selectorGroupHeading = {
  margin: "0 0 6px",
  fontSize: "13px",
  fontWeight: 500,
  opacity: 0.82,
};

const smallCardStyle = {
  padding: "10px",
  borderRadius: "5px",
  background: "rgba(0,0,0,0.18)",
  border: "1px solid rgba(232,223,200,0.12)",
};

const summaryStyle = {
  cursor: "pointer",
  fontSize: "18px",
  opacity: 0.94,
};
