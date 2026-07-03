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

function stepColorForTraceEntry(entry) {
  const axisKey = TOKEN_AXIS_KEYS[entry?.factor?.tokenId];
  return axisStepColor(axisKey);
}

const AXIS_ROTATION_STEP = Math.PI / 36;

const MAX_TRANSFORM_HOPS = 7;
const STEP_ANIMATION_MS = 70;
const ROUTE_CYCLE_PLAYBACK_MS = 950;
const ROUTE_STACK_PLAYBACK_MS = 320;

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

export default function TypedBoundaryExplorer() {
  const [selectedId, setSelectedId] = useState(UNIT_TRANSFORMS[0]?.id);
  const selectedTransform = useMemo(
    () => UNIT_TRANSFORMS.find((transform) => transform.id === selectedId) ?? UNIT_TRANSFORMS[0],
    [selectedId]
  );

  const selectedChecks = useMemo(
    () => validatePairedTransform(selectedTransform),
    [selectedTransform]
  );

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
              fontSize: "clamp(34px, 5vw, 64px)",
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
              fontSize: "clamp(18px, 2.1vw, 25px)",
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
              onSelect={setSelectedId}
            />
          </Panel>

          <Panel
            title={
              <>
                <LatexInline latex={String.raw`\mathbb{Z}^{6}`} /> Type Lattice Projection
              </>
            }
          >
            <LatticeProjection transform={selectedTransform} />
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

function TransformSelector({ transforms, groups, selectedId, onSelect }) {
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

  return (
    <div
      style={{
        display: "grid",
        gap: "18px",
        maxHeight: "calc(100vh - 20px)",
        overflowY: "auto",
        paddingRight: "4px",
      }}
    >
      {selectorGroups.map((group) => (
        <div key={group.title}>
          <h3 style={selectorGroupHeading}>{group.title}</h3>

          <div style={{ display: "grid", gap: "8px" }}>
            {group.ids
              .map((id) => byId.get(id))
              .filter(Boolean)
              .map((transform) => {
                const active = transform.id === selectedId;

                return (
                  <button
                    key={transform.id}
                    type="button"
                    onClick={() => onSelect(transform.id)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 10px",
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
                      <div style={{ fontSize: "17px", lineHeight: 1.18 }}>{shortTransformName(transform)}</div>
                      <div style={{ fontFamily: MATH_FONT, fontSize: "15px", opacity: 0.86 }}>
                        <MathText value={transform.symbol} />
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: "6px",
                        fontFamily: MATH_FONT,
                        fontSize: "14px",
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
                          fontSize: "13px",
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
      ))}
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

function LatticeProjection({ transform }) {
  const [viewMode, setViewMode] = useState("both");
  const [labelMode, setLabelMode] = useState("numbers");
  const [gridRadius, setGridRadius] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const [boxWordExpanded, setBoxWordExpanded] = useState(false);
  const [pathMode, setPathMode] = useState("canonical");
  const [selectedPathIndex, setSelectedPathIndex] = useState(0);
  const [cyclePlaybackMode, setCyclePlaybackMode] = useState("single");
  const [cyclePlaybackActive, setCyclePlaybackActive] = useState(false);
  const [cycleStackCount, setCycleStackCount] = useState(1);

  const isUnitModel = isUnitModelTransform(transform);
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
              <div style={{ fontSize: "16px", opacity: 0.76, whiteSpace: "nowrap" }}>
                unit address:
              </div>
              <div style={{ fontSize: "18px", fontFamily: MATH_FONT }}>
                <UnitFormulaInline transform={transform} size="0.90em" displayStyle />
              </div>

              <div style={{ fontSize: "16px", opacity: 0.76, whiteSpace: "nowrap" }}>
                unit monomial:
              </div>
              <div style={{ fontSize: "16px", fontFamily: MATH_FONT }}>
                <LatexInline latex={ordinaryLatex} />
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
        cycleStackCount={cycleStackCount}
        showInversionBranch={!isUnitModel}
        viewMode={viewMode}
        labelMode={labelMode}
        gridRadius={gridRadius}
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
              cycleStackCount={cycleStackCount}
              showInversionBranch={!isUnitModel}
              viewMode={viewMode}
              labelMode={labelMode}
              gridRadius={gridRadius}
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
      fontSize={expanded ? "24" : "18"}
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
        {TYPE_AXES.map((axis) => (
          <button
            key={axis.key}
            type="button"
            onClick={() => setSelectedAxis(axis.key)}
            style={buttonStyle(selectedAxis === axis.key)}
            title={`Rotate about ${AXIS_CONTROL_LABEL_LATEX[axis.key]} axis`}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "5px",
                color: axisStepColor(axis.key),
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
                  boxShadow: `0 0 5px ${axisStepColor(axis.key)}`,
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
        ))}
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
  cycleStackCount = 1,
  showInversionBranch = true,
  viewMode,
  labelMode,
  gridRadius,
  expanded,
}) {
  const [rotation, setRotation] = useState({ yaw: -0.72, pitch: 0.42 });
  const [drag, setDrag] = useState(null);
  const [selectedRotationAxis, setSelectedRotationAxis] = useState("t");
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

  const resetAxisRotations = () => {
    setAxisOrientation(makeIdentityOrientation());
    setZoomScale(1);
    setHopCount(1);
    setRevealedStepCount(0);
    setVisibleNetHops(0);
    setAnimationRun((run) => run + 1);
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
          ...(showOrdinary ? ordinaryTracesForGrid : []),
          ...(showInversion ? [inversionTrace] : []),
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
      }}
    >
      <AxisRotationControls
        selectedAxis={selectedRotationAxis}
        setSelectedAxis={setSelectedRotationAxis}
        onRotate={rotateSelectedAxis}
        onReset={resetAxisRotations}
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

      {axisSegments.map((segment) => (
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

      {showNet && shouldDrawNet &&
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

      {showOrdinary &&
        ordinaryHopPaths.map((path, hopIndex) =>
          path.slice(1).map((point, index) => {
            const globalStep = hopIndex * stepsPerHop + index + 1;
            if (!isStackingRoutes && globalStep > revealedStepCount) return null;

            const previous = path[index];
            const traceEntry = ordinaryRepeatedTraces[hopIndex][index + 1];

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

      {showInversion && (
        <polyline
          points={toPointString(inversionPath)}
          fill="none"
          stroke="rgba(233,223,197,0.86)"
          strokeWidth={expanded ? "3.6" : "2.6"}
          strokeDasharray="8 6"
          markerEnd={`url(#${expanded ? "arrowInvLarge" : "arrowInv"})`}
        />
      )}

      {showOrdinary &&
        ordinaryHopPaths.map((path, hopIndex) => {
          const visibleSteps = visibleStepsForHop(revealedStepCount, stepsPerHop, hopIndex);

          return path.map((point, index) => {
            if (!isStackingRoutes && index > visibleSteps) return null;

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

      {showInversion &&
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
      <text
        x={finalTarget.x + 10}
        y={finalTarget.y - 12}
        fill="#e8dfc8"
        fontSize={expanded ? "18" : "14"}
        fontFamily={PROSE_FONT}
      >
        target
      </text>
      </svg>
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

  if (isUnitModel && ordinaryMeta.pathFamilySize <= 1) {
    return null;
  }

  const routeCountLabel =
    ordinaryMeta.pathFamilySize === 1
      ? "1 admissible route"
      : `${ordinaryMeta.pathFamilySize.toLocaleString()} admissible routes`;

  const setCanonicalRoute = () => {
    setCyclePlaybackActive(false);
    setPathMode("canonical");
    setSelectedPathIndex(0);
    setCycleStackCount(1);
  };

  const advanceRoute = () => {
    if (!ordinaryCanCycle || routeCycleCount <= 1) return;

    setCyclePlaybackActive(false);
    setPathMode("cycle");

    setSelectedPathIndex((index) => {
      const current =
        ((index % routeCycleCount) + routeCycleCount) % routeCycleCount;
      const next = (current + 1) % routeCycleCount;

      if (cyclePlaybackMode === "stack") {
        setCycleStackCount((count) =>
          Math.min(Math.max(count, next + 1), routeCycleCount)
        );
      } else {
        setCycleStackCount(1);
      }

      return next;
    });
  };

  const startRoutePlayback = () => {
    if (!ordinaryCanCycle || routeCycleCount <= 1) return;

    setPathMode("cycle");
    setSelectedPathIndex(0);
    setCycleStackCount(1);
    setCyclePlaybackActive(true);
  };

  const stopRoutePlayback = () => {
    setCyclePlaybackActive(false);
  };

  const setSingleMode = () => {
    setCyclePlaybackActive(false);
    setCyclePlaybackMode("single");
    setCycleStackCount(1);
  };

  const setStackMode = () => {
    setCyclePlaybackActive(false);
    setCyclePlaybackMode("stack");
    setPathMode("cycle");
    setCycleStackCount(Math.max(1, ordinaryIndex + 1));
  };

  const readout = isUnitModel
    ? cyclePlaybackMode === "stack" && pathMode === "cycle"
      ? `stack ${Math.min(cycleStackCount, routeCycleCount)}/${routeCycleCount}; ${routeCountLabel}`
      : pathMode === "cycle"
        ? `route ${ordinaryIndex + 1}/${routeCycleCount}; ${routeCountLabel}`
        : routeCountLabel
    : pathMode === "cycle" && ordinaryCanCycle
      ? `ordinary ${ordinaryIndex + 1}/${ordinaryMeta.pathFamilySize.toLocaleString()}; inversion ${
          inversionCanCycle
            ? `${ordinaryIndex + 1}/${inversionMeta.pathFamilySize.toLocaleString()}`
            : `canonical (${inversionMeta.pathFamilySize.toLocaleString()} paths)`
        }`
      : `canonical; ordinary ${ordinaryMeta.pathFamilySize.toLocaleString()} paths, inversion ${inversionMeta.pathFamilySize.toLocaleString()} paths`;

  const buttonStyle = (active, disabled = false) => ({
    border: "none",
    borderRadius: "5px",
    padding: "1px 7px",
    cursor: disabled ? "not-allowed" : "pointer",
    color: "#e8dfc8",
    background: active ? "rgba(232,223,200,0.18)" : "transparent",
    fontFamily: PROSE_FONT,
    fontSize: "14px",
    opacity: disabled ? 0.46 : 1,
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
        style={buttonStyle(pathMode === "canonical")}
      >
        canonical
      </button>

      <button
        type="button"
        disabled={!ordinaryCanCycle}
        onClick={advanceRoute}
        style={buttonStyle(pathMode === "cycle" && !cyclePlaybackActive, !ordinaryCanCycle)}
      >
        next
      </button>

      {isUnitModel && (
        <>
          <button
            type="button"
            disabled={!ordinaryCanCycle}
            onClick={cyclePlaybackActive ? stopRoutePlayback : startRoutePlayback}
            style={buttonStyle(cyclePlaybackActive, !ordinaryCanCycle)}
            title={cyclePlaybackActive ? "Stop route playback" : "Play route sequence"}
            aria-label={cyclePlaybackActive ? "Stop route playback" : "Play route sequence"}
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

          <button
            type="button"
            onClick={setSingleMode}
            style={buttonStyle(cyclePlaybackMode === "single")}
          >
            single
          </button>

          <button
            type="button"
            onClick={setStackMode}
            style={buttonStyle(cyclePlaybackMode === "stack")}
          >
            stack
          </button>
        </>
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
          fontSize: "clamp(22px, 2.2vw, 34px)",
          lineHeight: 1.12,
          fontWeight: 500,
        }}
      >
        {title}
      </h2>

      <div
        style={{
          fontSize: "clamp(16px, 1.5vw, 21px)",
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
  margin: "0 0 8px",
  fontSize: "17px",
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
