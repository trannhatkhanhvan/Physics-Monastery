"use client";

import { useEffect, useRef, useState } from "react";

function ResponsivePageCSS() {
  return (
    <style>{`
      @media (max-width: 1200px) {
        .mindfulness-public-page {
          padding-top: 28px !important;
        }

        .mindfulness-public-design-grid {
          grid-template-columns: 1fr !important;
        }
      }

      @keyframes participantWanderGender {
        0% {
          left: var(--wander-final-left);
          top: var(--wander-final-top);
          transform: translate(-50%, -50%) rotate(0deg) scale(1);
        }
        16% {
          left: var(--wander-loop-one-left);
          top: var(--wander-loop-one-top);
          transform: translate(-50%, -50%) rotate(18deg) scale(1.08);
        }
        31% {
          left: var(--wander-loop-two-left);
          top: var(--wander-loop-two-top);
          transform: translate(-50%, -50%) rotate(-22deg) scale(1.08);
        }
        49% {
          left: var(--wander-wrong-left);
          top: var(--wander-wrong-top);
          transform: translate(-50%, -50%) rotate(12deg) scale(1.05);
        }
        60% {
          left: var(--wander-wrong-left);
          top: var(--wander-wrong-top);
          transform: translate(-50%, -50%) rotate(0deg) scale(1.04);
        }
        65% {
          left: var(--wander-wrong-left);
          top: var(--wander-wrong-top);
          transform: translate(calc(-50% - 5px), -50%) rotate(-8deg) scale(1.04);
        }
        70% {
          left: var(--wander-wrong-left);
          top: var(--wander-wrong-top);
          transform: translate(calc(-50% + 5px), -50%) rotate(8deg) scale(1.04);
        }
        75% {
          left: var(--wander-wrong-left);
          top: var(--wander-wrong-top);
          transform: translate(calc(-50% - 3px), -50%) rotate(-5deg) scale(1.04);
        }
        88% {
          left: var(--wander-catch-left);
          top: var(--wander-catch-top);
          transform: translate(-50%, -50%) rotate(10deg) scale(1.07);
        }
        100% {
          left: var(--wander-final-left);
          top: var(--wander-final-top);
          transform: translate(-50%, -50%) rotate(0deg) scale(1);
        }
      }

      @keyframes participantWanderRace {
        0% {
          left: var(--wander-final-left);
          top: var(--wander-final-top);
          transform: translate(-50%, -50%) rotate(0deg) scale(1);
        }
        15% {
          left: var(--wander-loop-two-left);
          top: var(--wander-loop-one-top);
          transform: translate(-50%, -50%) rotate(-18deg) scale(1.08);
        }
        31% {
          left: var(--wander-loop-one-left);
          top: var(--wander-loop-two-top);
          transform: translate(-50%, -50%) rotate(24deg) scale(1.08);
        }
        49% {
          left: var(--wander-wrong-left);
          top: var(--wander-wrong-top);
          transform: translate(-50%, -50%) rotate(-12deg) scale(1.05);
        }
        60% {
          left: var(--wander-wrong-left);
          top: var(--wander-wrong-top);
          transform: translate(-50%, -50%) rotate(0deg) scale(1.04);
        }
        65% {
          left: var(--wander-wrong-left);
          top: var(--wander-wrong-top);
          transform: translate(calc(-50% + 5px), -50%) rotate(8deg) scale(1.04);
        }
        70% {
          left: var(--wander-wrong-left);
          top: var(--wander-wrong-top);
          transform: translate(calc(-50% - 5px), -50%) rotate(-8deg) scale(1.04);
        }
        75% {
          left: var(--wander-wrong-left);
          top: var(--wander-wrong-top);
          transform: translate(calc(-50% + 3px), -50%) rotate(5deg) scale(1.04);
        }
        88% {
          left: var(--wander-catch-left);
          top: var(--wander-catch-top);
          transform: translate(-50%, -50%) rotate(-10deg) scale(1.07);
        }
        100% {
          left: var(--wander-final-left);
          top: var(--wander-final-top);
          transform: translate(-50%, -50%) rotate(0deg) scale(1);
        }
      }

      @keyframes participantWanderLevel {
        0% {
          left: var(--wander-final-left);
          top: var(--wander-final-top);
          transform: translate(-50%, -50%) rotate(0deg) scale(1);
        }
        16% {
          left: var(--wander-loop-one-left);
          top: var(--wander-loop-two-top);
          transform: translate(-50%, -50%) rotate(20deg) scale(1.08);
        }
        32% {
          left: var(--wander-loop-two-left);
          top: var(--wander-loop-one-top);
          transform: translate(-50%, -50%) rotate(-26deg) scale(1.08);
        }
        50% {
          left: var(--wander-wrong-left);
          top: var(--wander-wrong-top);
          transform: translate(-50%, -50%) rotate(14deg) scale(1.05);
        }
        60% {
          left: var(--wander-wrong-left);
          top: var(--wander-wrong-top);
          transform: translate(-50%, -50%) rotate(0deg) scale(1.04);
        }
        65% {
          left: var(--wander-wrong-left);
          top: var(--wander-wrong-top);
          transform: translate(calc(-50% - 5px), -50%) rotate(-8deg) scale(1.04);
        }
        70% {
          left: var(--wander-wrong-left);
          top: var(--wander-wrong-top);
          transform: translate(calc(-50% + 5px), -50%) rotate(8deg) scale(1.04);
        }
        75% {
          left: var(--wander-wrong-left);
          top: var(--wander-wrong-top);
          transform: translate(calc(-50% - 3px), -50%) rotate(-5deg) scale(1.04);
        }
        88% {
          left: var(--wander-catch-left);
          top: var(--wander-catch-top);
          transform: translate(-50%, -50%) rotate(10deg) scale(1.07);
        }
        100% {
          left: var(--wander-final-left);
          top: var(--wander-final-top);
          transform: translate(-50%, -50%) rotate(0deg) scale(1);
        }
      }

      @keyframes participantWanderMajor {
        0% {
          left: var(--wander-final-left);
          top: var(--wander-final-top);
          transform: translate(-50%, -50%) rotate(0deg) scale(1);
        }
        14% {
          left: var(--wander-loop-two-left);
          top: var(--wander-loop-one-top);
          transform: translate(-50%, -50%) rotate(-20deg) scale(1.08);
        }
        30% {
          left: var(--wander-loop-one-left);
          top: var(--wander-loop-two-top);
          transform: translate(-50%, -50%) rotate(25deg) scale(1.08);
        }
        50% {
          left: var(--wander-wrong-left);
          top: var(--wander-wrong-top);
          transform: translate(-50%, -50%) rotate(-14deg) scale(1.05);
        }
        60% {
          left: var(--wander-wrong-left);
          top: var(--wander-wrong-top);
          transform: translate(-50%, -50%) rotate(0deg) scale(1.04);
        }
        65% {
          left: var(--wander-wrong-left);
          top: var(--wander-wrong-top);
          transform: translate(calc(-50% + 5px), -50%) rotate(8deg) scale(1.04);
        }
        70% {
          left: var(--wander-wrong-left);
          top: var(--wander-wrong-top);
          transform: translate(calc(-50% - 5px), -50%) rotate(-8deg) scale(1.04);
        }
        75% {
          left: var(--wander-wrong-left);
          top: var(--wander-wrong-top);
          transform: translate(calc(-50% + 3px), -50%) rotate(5deg) scale(1.04);
        }
        88% {
          left: var(--wander-catch-left);
          top: var(--wander-catch-top);
          transform: translate(-50%, -50%) rotate(-10deg) scale(1.07);
        }
        100% {
          left: var(--wander-final-left);
          top: var(--wander-final-top);
          transform: translate(-50%, -50%) rotate(0deg) scale(1);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .participant-person-marker,
        .participant-wanderer {
          transition: none !important;
          animation: none !important;
        }
      }

      @media (max-width: 1180px) {
        .participant-demo-upper-display {
          grid-template-columns: 1fr !important;
        }


        .participant-demo-bottom-controls {
          grid-template-columns: 1fr !important;
        }

        .participant-demo-control-panel {
          justify-content: flex-start !important;
        }

        .participant-demo-chip {
          width: auto !important;
          min-width: max-content !important;
          flex: 0 0 auto !important;
          white-space: nowrap !important;
        }


        .participant-demo-pie-control-grid {
          grid-template-columns: 1fr !important;
        }

        .participant-demo-inline-stats {
          max-width: none !important;
        }

        .participant-demo-control-panel {
          position: static !important;
          width: auto !important;
          display: flex !important;
          flex-wrap: wrap !important;
          align-items: center !important;
          gap: 7px !important;
        }


        .mindfulness-plot-stage {
          padding-right: 0 !important;
        }

        .mindfulness-plot-control-panel {
          position: static !important;
          width: auto !important;
          margin-top: 10px !important;
          display: flex !important;
          flex-wrap: wrap !important;
          align-items: center !important;
          gap: 7px !important;
          padding: 8px !important;
        }

        .mindfulness-trait-chip,
        .mindfulness-outcome-chip {
          width: auto !important;
          min-width: max-content !important;
          flex: 0 0 auto !important;
          white-space: nowrap !important;
          padding-left: 9px !important;
          padding-right: 9px !important;
        }

        .mindfulness-control-divider {
          width: 100% !important;
          flex-basis: 100% !important;
        }

        .mindfulness-control-stats {
          width: 100% !important;
          flex-basis: 100% !important;
          grid-template-columns: repeat(2, max-content) !important;
          column-gap: 22px !important;
        }
      }
    `}</style>
  );
}

function FitTitle({ children }) {
  const wrapRef = useRef(null);
  const titleRef = useRef(null);
  const [fontSize, setFontSize] = useState(38);

  useEffect(() => {
    function fit() {
      const wrap = wrapRef.current;
      const title = titleRef.current;
      if (!wrap || !title) return;

      const maxSize = 48;
      const minSize = 24;
      let low = minSize;
      let high = maxSize;
      let best = minSize;

      title.style.whiteSpace = "nowrap";

      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        title.style.fontSize = `${mid}px`;

        if (title.scrollWidth <= wrap.clientWidth) {
          best = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }

      setFontSize(best);
    }

    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [children]);

  return (
    <div ref={wrapRef} style={styles.titleFitWrap}>
      <h1
        ref={titleRef}
        className="mindfulness-page-title"
        style={{ ...styles.title, fontSize: `${fontSize}px` }}
      >
        {children}
      </h1>
    </div>
  );
}

function fmt(value, digits = 3) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(digits);
}

function labelFromKey(key) {
  return String(key || "").replaceAll("_", " ");
}

function StatCard({ label, value, sub }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statLabel}>{label}</div>
      <div style={styles.statValue}>{value}</div>
      {sub ? <div style={styles.statSub}>{sub}</div> : null}
    </div>
  );
}

function FindingCards({ findings }) {
  return (
    <div style={styles.findingGrid}>
      {findings.map((finding, index) => (
        <article key={`${finding.title}-${index}`} style={styles.findingCard}>
          <div style={styles.findingKind}>{finding.kind || "finding"}</div>
          <h3 style={styles.findingTitle}>{finding.title}</h3>
          <p style={styles.findingBody}>{finding.body}</p>
        </article>
      ))}
    </div>
  );
}



function WhyItMattersDiagram() {
  const [expandedStage, setExpandedStage] = useState(null);

  return (
    <div style={styles.whyMattersDiagram}>
      <div style={styles.whyMattersFlowScroller}>
        <div style={styles.whyMattersFlowWrap}>
          <div style={styles.whyMattersFeedbackArrow} aria-hidden="true">
            <svg
              viewBox="0 0 100 42"
              preserveAspectRatio="none"
              style={styles.whyMattersFeedbackSvg}
            >
              <path
                d="M 72 32 L 72 7 L 15 7 L 15 26"
                fill="none"
                stroke="#d84a2d"
                strokeWidth="1.25"
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M 12.8 22.8 L 15 26 L 17.2 22.8"
                fill="none"
                stroke="#d84a2d"
                strokeWidth="1.25"
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div style={styles.whyMattersFlow}>
            {WHY_MATTERS_STAGES.map((stage, index) => (
              <div key={stage.key} style={styles.whyMattersFlowItem}>
                <div style={styles.whyMattersStageBox}>{stage.title}</div>
                {index < WHY_MATTERS_STAGES.length - 1 ? (
                  <div style={styles.whyMattersArrow} aria-hidden="true">
                    →
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={styles.whyMattersImageGrid}>
        {WHY_MATTERS_STAGES.map((stage) => (
          <figure key={stage.key} style={styles.whyMattersFigure}>
            <button
              type="button"
              style={styles.whyMattersImageButton}
              onClick={() => setExpandedStage(stage)}
              aria-label={`Expand ${stage.title} illustration`}
            >
              <div style={styles.whyMattersImageFrame}>
                <div style={styles.whyMattersImageFallback}>{stage.fallback}</div>
                <img
                  src={stage.image}
                  alt={stage.alt}
                  style={styles.whyMattersImage}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
            </button>
            <figcaption style={styles.whyMattersCaption}>
              {stage.caption}
            </figcaption>
          </figure>
        ))}
      </div>

      {expandedStage ? (
        <div
          style={styles.imageLightbox}
          onClick={() => setExpandedStage(null)}
          role="presentation"
        >
          <div
            style={styles.imageLightboxCard}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`${expandedStage.title} illustration`}
          >
            <button
              type="button"
              style={styles.imageLightboxClose}
              onClick={() => setExpandedStage(null)}
              aria-label="Close expanded image"
            >
              ×
            </button>

            <div style={styles.imageLightboxImageWrap}>
              <img
                src={expandedStage.image}
                alt={expandedStage.alt}
                style={styles.imageLightboxImage}
              />
            </div>

            <div style={styles.imageLightboxCaption}>
              <strong>{expandedStage.title}</strong>
              <span>{expandedStage.caption}</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CorrelationMatrixGraph({ rows }) {
  const [isOpen, setIsOpen] = useState(false);

  const outcomes = [
    "overall_grade",
    "statics_grade",
    "dynamics_grade",
    "mechanics_grade",
  ];

  const predictors = [
    "ffmq_total",
    "ffmq_act_aware",
    "ffmq_nonjudge",
    "ffmq_describe",
    "ffmq_nonreact",
    "ffmq_observe",
  ];

  const lookup = new Map(rows.map((row) => [`${row.outcome}-${row.predictor}`, row]));

  function cellStyle(value) {
    const r = Number(value);
    const strength = Number.isFinite(r) ? Math.min(0.5, 0.08 + Math.abs(r) * 0.95) : 0.04;

    return {
      ...styles.matrixCell,
      background: Number.isFinite(r)
        ? `rgba(201,165,106,${strength})`
        : "rgba(255,255,255,0.04)",
      borderColor: Number.isFinite(r)
        ? "rgba(201,165,106,0.28)"
        : "rgba(255,255,255,0.08)",
    };
  }

  return (
    <div style={styles.matrixCard}>
      <div style={styles.matrixHeaderRow}>
        <div>
          <h3 style={styles.chartTitle}>Correlation matrix: grades × mindfulness traits</h3>
          <p style={styles.chartNote}>
            Pearson correlations computed from all available complete pairs. Each cell reports r and n.
          </p>
        </div>

        <button
          type="button"
          style={styles.matrixToggleButton}
          onClick={() => setIsOpen((current) => !current)}
        >
          {isOpen ? "Hide matrix" : "Show matrix"}
        </button>
      </div>

      {isOpen ? (
        <div style={styles.matrixWrap}>
          <div style={styles.matrixGrid}>
            <div style={styles.matrixCorner} />

            {predictors.map((predictor) => {
              const label = rows.find((row) => row.predictor === predictor)?.predictor_label || labelFromKey(predictor);
              return (
                <div key={predictor} style={styles.matrixHeaderCell}>
                  {label}
                </div>
              );
            })}

            {outcomes.map((outcome) => {
              const outcomeLabel = rows.find((row) => row.outcome === outcome)?.outcome_label || labelFromKey(outcome);

              return (
                <div key={outcome} style={{ display: "contents" }}>
                  <div style={styles.matrixOutcomeCell}>{outcomeLabel}</div>

                  {predictors.map((predictor) => {
                    const row = lookup.get(`${outcome}-${predictor}`);

                    return (
                      <div key={`${outcome}-${predictor}`} style={cellStyle(row?.r)}>
                        <strong>{row ? fmt(row.r, 3) : "—"}</strong>
                        <span>n = {row?.n ?? "—"}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={styles.matrixCollapsedNote}>
          Matrix hidden. Open it to inspect the full grade × mindfulness correlation table.
        </div>
      )}
    </div>
  );
}

function FacetBarChart({ rows }) {
  const max = Math.max(
    0.01,
    ...rows.map((row) => Math.abs(Number(row.r))).filter(Number.isFinite)
  );

  return (
    <div style={styles.chartCard}>
      <div style={styles.chartHeader}>
        <h3 style={styles.chartTitle}>Overall grade correlations</h3>
        <p style={styles.chartNote}>
          Pearson correlations between mindfulness scores and overall grade.
        </p>
      </div>

      <div style={styles.barList}>
        {rows.map((row) => {
          const r = Number(row.r);
          const width = `${Math.max(3, (Math.abs(r) / max) * 100)}%`;

          return (
            <div key={row.predictor} style={styles.barRow}>
              <div style={styles.barLabel}>{row.label}</div>
              <div style={styles.barTrack}>
                <div style={{ ...styles.barFill, width }} />
              </div>
              <div style={styles.barValue}>
                r = {fmt(row.r, 3)}
                <span style={styles.pill}>{row.p_label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}



const MINDFULNESS_FACETS = [
  { key: "ffmq_observe", label: "Observe", color: "#e53935" },
  { key: "ffmq_describe", label: "Describe", color: "#fb8c00" },
  { key: "ffmq_act_aware", label: "Acting with Awareness", color: "#fdd835" },
  { key: "ffmq_nonjudge", label: "Nonjudging", color: "#43a047" },
  { key: "ffmq_nonreact", label: "Nonreactivity", color: "#1e88e5" },
];


const GRADE_OUTCOMES = [
  { key: "statics_grade", label: "Statics" },
  { key: "dynamics_grade", label: "Dynamics" },
  { key: "mechanics_grade", label: "Mechanics of Materials" },
];

const WHY_MATTERS_STAGES = [
  {
    key: "problem_solving_performance",
    title: "Problem–Solving Performance",
    caption: "Performance on difficult engineering problem-solving tasks.",
    image: "/images/mindfulness-study/why-it-matters-problem-solving.png",
    alt: "Illustration representing problem-solving performance in engineering students.",
    fallback: "Problem–Solving Performance",
  },
  {
    key: "academic_performance",
    title: "Academic Performance",
    caption: "Course grades and academic success may be shaped by problem-solving performance.",
    image: "/images/mindfulness-study/why-it-matters-academic-performance.png",
    alt: "Image representing academic performance, such as a graded exam.",
    fallback: "Academic Performance",
  },
  {
    key: "well_being",
    title: "Well-Being",
    caption: "Academic experiences may affect stress, confidence, and emotional well-being.",
    image: "/images/mindfulness-study/why-it-matters-well-being.png",
    alt: "Image representing student well-being or emotional strain.",
    fallback: "Well-Being",
  },
  {
    key: "retention",
    title: "Retention",
    caption: "These patterns may ultimately influence persistence and retention in engineering.",
    image: "/images/mindfulness-study/why-it-matters-retention.png",
    alt: "Image representing student retention or persistence in school.",
    fallback: "Retention",
  },
];


function gradeCompositeLabel(selectedGradeKeys) {
  if (selectedGradeKeys.length === GRADE_OUTCOMES.length) {
    return "Overall Grade";
  }

  if (selectedGradeKeys.length === 1) {
    return GRADE_OUTCOMES.find((grade) => grade.key === selectedGradeKeys[0])?.label || "Selected Grade";
  }

  return "Selected Grade Composite";
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const normalized =
    clean.length === 3
      ? clean.split("").map((ch) => ch + ch).join("")
      : clean;

  const value = parseInt(normalized, 16);

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function blendHexColors(colors) {
  if (!colors || colors.length === 0) return "#b58c4a";
  if (colors.length === 1) return colors[0];

  const rgbs = colors.map(hexToRgb);
  const r = Math.round(rgbs.reduce((sum, c) => sum + c.r, 0) / rgbs.length);
  const g = Math.round(rgbs.reduce((sum, c) => sum + c.g, 0) / rgbs.length);
  const b = Math.round(rgbs.reduce((sum, c) => sum + c.b, 0) / rgbs.length);

  return `rgb(${r}, ${g}, ${b})`;
}

function regressionLine(points) {
  const n = points.length;
  if (n < 2) return null;

  const xMean = points.reduce((sum, p) => sum + p.x, 0) / n;
  const yMean = points.reduce((sum, p) => sum + p.y, 0) / n;

  let numerator = 0;
  let denominator = 0;

  points.forEach((p) => {
    numerator += (p.x - xMean) * (p.y - yMean);
    denominator += (p.x - xMean) ** 2;
  });

  if (!Number.isFinite(denominator) || denominator === 0) return null;

  const slope = numerator / denominator;
  const intercept = yMean - slope * xMean;

  const xValues = points.map((p) => p.x);
  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);

  return {
    x_min: xMin,
    x_max: xMax,
    y_at_x_min: intercept + slope * xMin,
    y_at_x_max: intercept + slope * xMax,
  };
}

function pearsonR(points) {
  const n = points.length;
  if (n < 2) return null;

  const xMean = points.reduce((sum, p) => sum + p.x, 0) / n;
  const yMean = points.reduce((sum, p) => sum + p.y, 0) / n;

  let numerator = 0;
  let xDen = 0;
  let yDen = 0;

  points.forEach((p) => {
    const dx = p.x - xMean;
    const dy = p.y - yMean;
    numerator += dx * dy;
    xDen += dx ** 2;
    yDen += dy ** 2;
  });

  const denominator = Math.sqrt(xDen * yDen);
  if (!Number.isFinite(denominator) || denominator === 0) return null;

  return numerator / denominator;
}

function InteractiveMindfulnessPlot({ points }) {
  const [enabled, setEnabled] = useState(
    MINDFULNESS_FACETS.map((facet) => facet.key)
  );

  const [selectedGradeKeys, setSelectedGradeKeys] = useState(
    GRADE_OUTCOMES.map((grade) => grade.key)
  );

  const allEnabled = enabled.length === MINDFULNESS_FACETS.length;
  const allGradeOutcomesEnabled = selectedGradeKeys.length === GRADE_OUTCOMES.length;
  const gradeLabel = gradeCompositeLabel(selectedGradeKeys);

  const plottedPoints = (points || [])
    .map((point) => {
      const values = point.values || {};

      let y;

      if (allGradeOutcomesEnabled) {
        y = Number(values.overall_grade);
      } else {
        const selectedGradeValues = selectedGradeKeys
          .map((key) => Number(values[key]))
          .filter((value) => Number.isFinite(value) && value > 0);

        // Course-specific zeros mean the student was not associated with that
        // course outcome, so those records must not be plotted or included in r/n.
        if (selectedGradeValues.length === 0) return null;

        y = selectedGradeValues.reduce((sum, value) => sum + value, 0) / selectedGradeValues.length;
      }

      if (!Number.isFinite(y) || y <= 0) return null;

      let x;

      if (allEnabled && Number.isFinite(Number(values.ffmq_total))) {
        x = Number(values.ffmq_total);
      } else {
        const selectedValues = enabled.map((key) => Number(values[key]));
        if (selectedValues.some((value) => !Number.isFinite(value))) return null;
        x = selectedValues.reduce((sum, value) => sum + value, 0);
      }

      if (!Number.isFinite(x)) return null;

      return {
        point_id: point.point_id,
        x,
        y,
      };
    })
    .filter(Boolean);

  const line = regressionLine(plottedPoints);
  const r = pearsonR(plottedPoints);

  const xValues = plottedPoints.map((point) => point.x);
  const yValues = plottedPoints.map((point) => point.y);

  if (line) {
    xValues.push(Number(line.x_min), Number(line.x_max));
    yValues.push(Number(line.y_at_x_min), Number(line.y_at_x_max));
  }

  const finiteX = xValues.filter(Number.isFinite);
  const finiteY = yValues.filter(Number.isFinite);

  const xMinRaw = Math.min(...finiteX);
  const xMaxRaw = Math.max(...finiteX);
  const yMinRaw = Math.min(...finiteY);
  const yMaxRaw = Math.max(...finiteY);

  const xPad = Math.max(0.05, (xMaxRaw - xMinRaw) * 0.08);
  const yPad = Math.max(0.1, (yMaxRaw - yMinRaw) * 0.08);

  const xMin = xMinRaw - xPad;
  const xMax = xMaxRaw + xPad;
  const yMin = Math.max(0, yMinRaw - yPad);
  const yMax = Math.min(4.2, yMaxRaw + yPad);

  const width = 940;
  const height = 430;
  const padL = 62;
  const padR = 34;
  const padT = 30;
  const padB = 64;

  const xScale = (x) => {
    if (!Number.isFinite(x) || xMax === xMin) return padL;
    return padL + ((x - xMin) / (xMax - xMin)) * (width - padL - padR);
  };

  const yScale = (y) => {
    if (!Number.isFinite(y) || yMax === yMin) return height - padB;
    return height - padB - ((y - yMin) / (yMax - yMin)) * (height - padT - padB);
  };

  const xTicks = [xMinRaw, (xMinRaw + xMaxRaw) / 2, xMaxRaw];
  const xLabel = allEnabled
    ? "Total Mindfulness"
    : "Selected mindfulness composite";

  const title = `${xLabel} vs. ${gradeLabel}`;

  const activeFacets = MINDFULNESS_FACETS.filter((facet) =>
    enabled.includes(facet.key)
  );

  const fitLineColor =
    activeFacets.length === 1 ? activeFacets[0].color : "#ffffff";

  const pointColor = "rgba(255,246,232,0.62)";

  function toggleFacet(key) {
    setEnabled((current) => {
      if (current.includes(key)) {
        if (current.length === 1) return current;
        return current.filter((item) => item !== key);
      }

      return [...current, key];
    });
  }

  function resetGradeOutcomes() {
    setSelectedGradeKeys(GRADE_OUTCOMES.map((grade) => grade.key));
  }

  function toggleGradeOutcome(key) {
    setSelectedGradeKeys((current) => {
      if (current.includes(key)) {
        if (current.length === 1) return current;
        return current.filter((item) => item !== key);
      }

      return [...current, key];
    });
  }

  return (
    <div style={styles.interactivePlotCard}>
      <div style={styles.interactivePlotMain}>
        <div style={styles.chartHeader}>
          <h3 style={styles.chartTitle}>{title}</h3>
          <p style={styles.chartNote}>
            Exact scatterplot. Each dot is one cleaned student record. Use the trait chips to recompute the x-axis composite.
          </p>
        </div>

        <div className="mindfulness-plot-stage" style={styles.plotStage}>
          <svg viewBox={`0 0 ${width} ${height}`} style={styles.svg}>
            <line x1={padL} y1={height - padB} x2={width - padR} y2={height - padB} stroke="rgba(255,255,255,0.32)" />
            <line x1={padL} y1={padT} x2={padL} y2={height - padB} stroke="rgba(255,255,255,0.32)" />

            {[0, 1, 2, 3, 4].map((tick) => (
              <g key={tick}>
                <line
                  x1={padL}
                  x2={width - padR}
                  y1={yScale(tick)}
                  y2={yScale(tick)}
                  stroke="rgba(255,255,255,0.08)"
                />
                <text x={padL - 12} y={yScale(tick) + 4} textAnchor="end" fill="#c8bda9" fontSize="13">
                  {tick}
                </text>
              </g>
            ))}

            {xTicks.map((tick, index) => (
              <g key={`${tick}-${index}`}>
                <line
                  x1={xScale(tick)}
                  x2={xScale(tick)}
                  y1={height - padB}
                  y2={height - padB + 5}
                  stroke="rgba(255,255,255,0.32)"
                />
                <text x={xScale(tick)} y={height - padB + 22} textAnchor="middle" fill="#c8bda9" fontSize="12">
                  {fmt(tick, 2)}
                </text>
              </g>
            ))}

            {line ? (
              <line
                x1={xScale(Number(line.x_min))}
                y1={yScale(Number(line.y_at_x_min))}
                x2={xScale(Number(line.x_max))}
                y2={yScale(Number(line.y_at_x_max))}
                stroke={fitLineColor}
                strokeWidth="2.6"
                opacity="0.84"
              />
            ) : null}

            {plottedPoints.map((point) => (
              <circle
                key={point.point_id}
                data-point-id={point.point_id}
                cx={xScale(point.x)}
                cy={yScale(point.y)}
                r="2.15"
                fill={pointColor}
                fillOpacity="0.82"
                stroke="rgba(255,255,255,0.42)"
                strokeWidth="0.55"
              >
                <title>{`${point.point_id}: ${xLabel} = ${fmt(point.x, 3)}, ${gradeLabel} = ${fmt(point.y, 3)}`}</title>
              </circle>
            ))}

            <text x={width / 2} y={height - 18} textAnchor="middle" fill="#d8d0c0" fontSize="15">
              {xLabel}
            </text>
            <text x={18} y={height / 2} textAnchor="middle" fill="#d8d0c0" fontSize="15" transform={`rotate(-90 18 ${height / 2})`}>
              {gradeLabel}
            </text>
          </svg>

          <div className="mindfulness-plot-control-panel" style={styles.plotControlPanel}>
            {MINDFULNESS_FACETS.map((facet) => {
              const active = enabled.includes(facet.key);
              const disabled = active && enabled.length === 1;

              return (
                <button
                  key={facet.key}
                  className="mindfulness-trait-chip"
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleFacet(facet.key)}
                  style={{
                    ...styles.traitChip,
                    background: active ? facet.color : "rgba(160,160,160,0.13)",
                    borderColor: active ? facet.color : "rgba(180,180,180,0.22)",
                    color: active ? "#101112" : "rgba(210,210,210,0.42)",
                    opacity: active ? 1 : 0.62,
                  }}
                  title={active ? `${facet.label} included` : `${facet.label} excluded`}
                >
                  {facet.label}
                </button>
              );
            })}

            <div className="mindfulness-control-divider" style={styles.controlDivider} />

            <button
              className="mindfulness-outcome-chip"
              type="button"
              onClick={resetGradeOutcomes}
              style={{
                ...styles.outcomeChip,
                background: allGradeOutcomesEnabled ? "rgba(255,255,255,0.88)" : "rgba(160,160,160,0.13)",
                borderColor: allGradeOutcomesEnabled ? "rgba(255,255,255,0.95)" : "rgba(180,180,180,0.22)",
                color: allGradeOutcomesEnabled ? "#101112" : "rgba(210,210,210,0.42)",
                opacity: allGradeOutcomesEnabled ? 1 : 0.62,
              }}
            >
              Overall Grade
            </button>

            {GRADE_OUTCOMES.map((grade) => {
              const active = selectedGradeKeys.includes(grade.key);
              const disabled = active && selectedGradeKeys.length === 1;

              return (
                <button
                  key={grade.key}
                  className="mindfulness-outcome-chip"
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleGradeOutcome(grade.key)}
                  style={{
                    ...styles.outcomeChip,
                    background: active ? "rgba(234,215,164,0.82)" : "rgba(160,160,160,0.13)",
                    borderColor: active ? "rgba(234,215,164,0.95)" : "rgba(180,180,180,0.22)",
                    color: active ? "#101112" : "rgba(210,210,210,0.42)",
                    opacity: active ? 1 : 0.62,
                  }}
                >
                  {grade.label}
                </button>
              );
            })}

            <div className="mindfulness-control-stats" style={styles.controlStats}>
              <div style={styles.controlStatLine}>
                <span style={styles.controlStatVar}>r</span>
                <span style={styles.controlStatEquals}>=</span>
                <span style={styles.controlStatValue}>{r === null ? "—" : fmt(r, 3)}</span>
              </div>
              <div style={styles.controlStatLine}>
                <span style={styles.controlStatVar}>n</span>
                <span style={styles.controlStatEquals}>=</span>
                <span style={styles.controlStatValue}>{plottedPoints.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExactScatterPlot({ chart, highlightedPointIds = [] }) {
  const points = chart?.points || [];
  const line = chart?.line;
  const highlighted = new Set(highlightedPointIds);

  const xValues = points.map((point) => Number(point.x));
  const yValues = points.map((point) => Number(point.y));

  if (line) {
    xValues.push(Number(line.x_min), Number(line.x_max));
    yValues.push(Number(line.y_at_x_min), Number(line.y_at_x_max));
  }

  const finiteX = xValues.filter(Number.isFinite);
  const finiteY = yValues.filter(Number.isFinite);

  const xMinRaw = Math.min(...finiteX);
  const xMaxRaw = Math.max(...finiteX);
  const yMinRaw = Math.min(...finiteY);
  const yMaxRaw = Math.max(...finiteY);

  const xPad = Math.max(0.05, (xMaxRaw - xMinRaw) * 0.08);
  const yPad = Math.max(0.1, (yMaxRaw - yMinRaw) * 0.08);

  const xMin = xMinRaw - xPad;
  const xMax = xMaxRaw + xPad;
  const yMin = Math.max(0, yMinRaw - yPad);
  const yMax = Math.min(4.2, yMaxRaw + yPad);

  const width = 640;
  const height = 360;
  const padL = 58;
  const padR = 28;
  const padT = 28;
  const padB = 58;

  const xScale = (x) => {
    if (!Number.isFinite(x) || xMax === xMin) return padL;
    return padL + ((x - xMin) / (xMax - xMin)) * (width - padL - padR);
  };

  const yScale = (y) => {
    if (!Number.isFinite(y) || yMax === yMin) return height - padB;
    return height - padB - ((y - yMin) / (yMax - yMin)) * (height - padT - padB);
  };

  const xTicks = [xMinRaw, (xMinRaw + xMaxRaw) / 2, xMaxRaw];

  return (
    <div style={styles.chartCard}>
      <div style={styles.chartHeader}>
        <h3 style={styles.chartTitle}>{chart.x_label} vs. {chart.y_label}</h3>
        <p style={styles.chartNote}>
          Exact scatterplot. Each dot is one cleaned student record; no binning or averaging is used.
        </p>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} style={styles.svg}>
        <line x1={padL} y1={height - padB} x2={width - padR} y2={height - padB} stroke="rgba(255,255,255,0.32)" />
        <line x1={padL} y1={padT} x2={padL} y2={height - padB} stroke="rgba(255,255,255,0.32)" />

        {[0, 1, 2, 3, 4].map((tick) => (
          <g key={tick}>
            <line
              x1={padL}
              x2={width - padR}
              y1={yScale(tick)}
              y2={yScale(tick)}
              stroke="rgba(255,255,255,0.08)"
            />
            <text x={padL - 12} y={yScale(tick) + 4} textAnchor="end" fill="#c8bda9" fontSize="13">
              {tick}
            </text>
          </g>
        ))}

        {xTicks.map((tick, index) => (
          <g key={`${tick}-${index}`}>
            <line
              x1={xScale(tick)}
              x2={xScale(tick)}
              y1={height - padB}
              y2={height - padB + 5}
              stroke="rgba(255,255,255,0.32)"
            />
            <text x={xScale(tick)} y={height - padB + 22} textAnchor="middle" fill="#c8bda9" fontSize="12">
              {fmt(tick, 2)}
            </text>
          </g>
        ))}

        {line ? (
          <line
            x1={xScale(Number(line.x_min))}
            y1={yScale(Number(line.y_at_x_min))}
            x2={xScale(Number(line.x_max))}
            y2={yScale(Number(line.y_at_x_max))}
            stroke="#ead7a4"
            strokeWidth="2.5"
            opacity="0.82"
          />
        ) : null}

        {points.map((point) => {
          const isHighlighted = highlighted.has(point.point_id);
          return (
            <circle
              key={point.point_id}
              data-point-id={point.point_id}
              cx={xScale(Number(point.x))}
              cy={yScale(Number(point.y))}
              r={isHighlighted ? 5.5 : 3.4}
              fill={isHighlighted ? "rgba(255,246,232,0.95)" : "rgba(181,140,74,0.72)"}
              stroke={isHighlighted ? "rgba(234,215,164,1)" : "rgba(255,246,232,0.55)"}
              strokeWidth={isHighlighted ? 2 : 0.8}
            >
              <title>{`${point.point_id}: ${chart.x_label} = ${fmt(point.x, 3)}, ${chart.y_label} = ${fmt(point.y, 3)}`}</title>
            </circle>
          );
        })}

        <text x={width / 2} y={height - 16} textAnchor="middle" fill="#d8d0c0" fontSize="15">
          {chart.x_label}
        </text>
        <text x={18} y={height / 2} textAnchor="middle" fill="#d8d0c0" fontSize="15" transform={`rotate(-90 18 ${height / 2})`}>
          {chart.y_label}
        </text>
      </svg>

      <div style={styles.chartFooter}>
        n = {chart.n}. Exact plotted points: {points.length}.
      </div>
    </div>
  );
}

function BinnedRelationshipChart({ chart }) {
  const bins = chart?.bins || [];
  const line = chart?.line;

  const xValues = bins.flatMap((bin) => [Number(bin.x_min), Number(bin.x_max), Number(bin.x_mean)]);
  const yValues = bins.map((bin) => Number(bin.y_mean));

  if (line) {
    xValues.push(Number(line.x_min), Number(line.x_max));
    yValues.push(Number(line.y_at_x_min), Number(line.y_at_x_max));
  }

  const xMin = Math.min(...xValues.filter(Number.isFinite));
  const xMax = Math.max(...xValues.filter(Number.isFinite));
  const yMinRaw = Math.min(...yValues.filter(Number.isFinite));
  const yMaxRaw = Math.max(...yValues.filter(Number.isFinite));

  const yMin = Math.min(0, yMinRaw);
  const yMax = Math.max(4.2, yMaxRaw);

  const width = 640;
  const height = 360;
  const padL = 58;
  const padR = 28;
  const padT = 28;
  const padB = 58;

  const xScale = (x) => {
    if (!Number.isFinite(x) || xMax === xMin) return padL;
    return padL + ((x - xMin) / (xMax - xMin)) * (width - padL - padR);
  };

  const yScale = (y) => {
    if (!Number.isFinite(y) || yMax === yMin) return height - padB;
    return height - padB - ((y - yMin) / (yMax - yMin)) * (height - padT - padB);
  };

  return (
    <div style={styles.chartCard}>
      <div style={styles.chartHeader}>
        <h3 style={styles.chartTitle}>{chart.x_label} vs. {chart.y_label}</h3>
        <p style={styles.chartNote}>
          Aggregate binned relationship. Each point summarizes a bin of students; row-level points are not published.
        </p>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} style={styles.svg}>
        <line x1={padL} y1={height - padB} x2={width - padR} y2={height - padB} stroke="rgba(255,255,255,0.32)" />
        <line x1={padL} y1={padT} x2={padL} y2={height - padB} stroke="rgba(255,255,255,0.32)" />

        {[0, 1, 2, 3, 4].map((tick) => (
          <g key={tick}>
            <line
              x1={padL}
              x2={width - padR}
              y1={yScale(tick)}
              y2={yScale(tick)}
              stroke="rgba(255,255,255,0.08)"
            />
            <text x={padL - 12} y={yScale(tick) + 4} textAnchor="end" fill="#c8bda9" fontSize="13">
              {tick}
            </text>
          </g>
        ))}

        {line ? (
          <line
            x1={xScale(Number(line.x_min))}
            y1={yScale(Number(line.y_at_x_min))}
            x2={xScale(Number(line.x_max))}
            y2={yScale(Number(line.y_at_x_max))}
            stroke="#ead7a4"
            strokeWidth="3"
            opacity="0.85"
          />
        ) : null}

        {bins.map((bin, index) => {
          const cx = xScale(Number(bin.x_mean));
          const cy = yScale(Number(bin.y_mean));
          const radius = 7 + Math.sqrt(Number(bin.n || 1));

          return (
            <g key={`${bin.bin_label}-${index}`}>
              <circle
                cx={cx}
                cy={cy}
                r={radius}
                fill="rgba(181,140,74,0.78)"
                stroke="rgba(255,246,232,0.85)"
                strokeWidth="1.5"
              />
              <text x={cx} y={cy + 4} textAnchor="middle" fill="#101112" fontSize="11" fontWeight="700">
                {bin.n}
              </text>
            </g>
          );
        })}

        <text x={width / 2} y={height - 16} textAnchor="middle" fill="#d8d0c0" fontSize="15">
          {chart.x_label}
        </text>
        <text x={18} y={height / 2} textAnchor="middle" fill="#d8d0c0" fontSize="15" transform={`rotate(-90 18 ${height / 2})`}>
          {chart.y_label}
        </text>
      </svg>

      <div style={styles.chartFooter}>
        n = {chart.n}. Circle labels show bin counts.
      </div>
    </div>
  );
}

function ReliabilityTable({ rows }) {
  return (
    <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Scale</th>
            <th style={styles.th}>Items</th>
            <th style={styles.th}>n</th>
            <th style={styles.th}>Alpha</th>
            <th style={styles.th}>Interpretation</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.scale}>
              <td style={styles.tdStrong}>{row.label}</td>
              <td style={styles.td}>{row.n_items}</td>
              <td style={styles.td}>{row.n_complete}</td>
              <td style={styles.td}>{fmt(row.alpha, 3)}</td>
              <td style={styles.td}>{row.interpretation}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CourseCorrelationMatrix({ rows }) {
  const outcomes = [...new Set(rows.map((row) => row.outcome))];
  const predictors = [...new Set(rows.map((row) => row.predictor))];

  const lookup = new Map(rows.map((row) => [`${row.outcome}-${row.predictor}`, row]));

  return (
    <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Outcome</th>
            {predictors.map((predictor) => (
              <th key={predictor} style={styles.th}>{rows.find((r) => r.predictor === predictor)?.predictor_label || labelFromKey(predictor)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {outcomes.map((outcome) => (
            <tr key={outcome}>
              <td style={styles.tdStrong}>{rows.find((r) => r.outcome === outcome)?.outcome_label || labelFromKey(outcome)}</td>
              {predictors.map((predictor) => {
                const row = lookup.get(`${outcome}-${predictor}`);
                const r = Number(row?.r);
                const opacity = Number.isFinite(r) ? Math.min(0.34, 0.08 + Math.abs(r) * 0.7) : 0.04;

                return (
                  <td
                    key={`${outcome}-${predictor}`}
                    style={{
                      ...styles.td,
                      background: Number.isFinite(r)
                        ? `rgba(201,165,106,${opacity})`
                        : "transparent",
                    }}
                  >
                    {row ? fmt(row.r, 3) : "—"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


function ResearchDesignPanel({ data }) {
  const fallbackQuestions = [
    "What is the relationship between mindfulness traits and problem-solving performance among undergraduate engineering students?",
    "How do undergraduate engineering students with differing levels of mindfulness regulate their emotions during problem-solving activities?",
    "How do differences in emotion regulation help explain the relationship between mindfulness traits and problem-solving performance?",
  ];

  const fallbackPhases = [
    {
      phase: "Phase 1: Quantitative",
      label: "Relationship mapping",
      description:
        "Trait mindfulness scores are analyzed alongside engineering problem-solving performance measures.",
    },
    {
      phase: "Phase 2: Qualitative",
      label: "Emotion-regulation explanation",
      description:
        "Selected students complete a puzzle-based problem-solving task while their emotional regulation, self-talk, persistence, and strategy shifts are examined.",
    },
    {
      phase: "Integration",
      label: "Mixed-method interpretation",
      description:
        "The qualitative findings are used to explain how emotion regulation helps account for the quantitative mindfulness–performance relationship.",
    },
  ];

  const fallbackPathway = [
    "Mindfulness traits",
    "Emotion regulation",
    "Problem-solving performance",
  ];

  const phases =
    Array.isArray(data.mixed_methods_phases) && data.mixed_methods_phases.length
      ? data.mixed_methods_phases
      : fallbackPhases;

  const questions =
    Array.isArray(data.research_questions) && data.research_questions.length
      ? data.research_questions
      : fallbackQuestions;

  const pathway =
    Array.isArray(data.conceptual_model?.pathway) && data.conceptual_model.pathway.length
      ? data.conceptual_model.pathway
      : fallbackPathway;

  return (
    <section style={styles.section}>
      <div style={styles.sectionIntro}>
        <h2 style={styles.h2}>Research design</h2>
        <p style={styles.noteLarge}>{data.research_purpose}</p>
      </div>

      <div style={styles.pathwayBox}>
        {pathway.map((step, index) => (
          <span key={`${step}-${index}`} style={styles.pathwayItem}>
            {step}
            {index < pathway.length - 1 ? <b style={styles.pathwayArrow}>→</b> : null}
          </span>
        ))}
      </div>

      <p style={styles.noteLarge}>{data.conceptual_model?.description}</p>

      <div className="mindfulness-public-design-grid" style={styles.designGrid}>
        <div style={styles.designCard}>
          <h3 style={styles.modelTitle}>Research questions</h3>
          <ol style={styles.questionList}>
            {questions.map((question) => (
              <li key={question} style={styles.questionItem}>{question}</li>
            ))}
          </ol>
        </div>

        <div style={styles.designCard}>
          <h3 style={styles.modelTitle}>Mixed-method sequence</h3>
          <div style={styles.phaseList}>
            {phases.map((phase) => (
              <div key={phase.phase} style={styles.phaseItem}>
                <div style={styles.phaseName}>{phase.phase}</div>
                <div style={styles.phaseLabel}>{phase.label}</div>
                <p style={styles.phaseDescription}>{phase.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}


function fallbackResearchQuestions() {
  return [
    "What is the relationship between mindfulness traits and problem-solving performance among undergraduate engineering students?",
    "How do undergraduate engineering students with differing levels of mindfulness regulate their emotions during problem-solving activities?",
    "How do differences in emotion regulation help explain the relationship between mindfulness traits and problem-solving performance?",
  ];
}

function ResearchQuestionsSection({ data }) {
  const questions =
    Array.isArray(data.research_questions) && data.research_questions.length
      ? data.research_questions
      : fallbackResearchQuestions();

  return (
    <section style={styles.prioritySection}>
      <div style={styles.sectionIntro}>
        <div style={styles.sectionKicker}>Research questions</div>
        <h2 style={styles.h2}>What is this study trying to understand?</h2>
        <p style={styles.noteLarge}>
          The study asks whether mindfulness traits are related to engineering problem-solving
          performance, and whether emotion regulation helps explain that relationship.
        </p>
      </div>

      <div style={styles.questionListLarge}>
        {questions.map((question, index) => (
          <div key={question} style={styles.questionItemLarge}>
            <span style={styles.questionNumber}>{index + 1}</span>
            <span>{question}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function WhyEmotionRegulationMatters() {
  return (
    <section style={styles.section}>
      <div style={styles.sectionIntro}>
        <div style={styles.sectionKicker}>Why it matters</div>
        <h2 style={styles.h2}>Engineering problem solving is cognitive and emotional</h2>
      </div>

      <div style={styles.whyGrid}>
        <p style={styles.noteLarge}>
          Engineering students are often trained to treat problem solving as a rational procedure.
          But difficult problems also produce achievement emotions: frustration, anxiety,
          confusion, curiosity, confidence, and persistence.
        </p>

        <p style={styles.noteLarge}>
          The study examines whether mindfulness traits help students notice and regulate those
          emotions in ways that support sustained attention, flexible strategy use, and better
          problem-solving performance.
        </p>
      </div>
    
        <WhyItMattersDiagram />
</section>
  );
}

function ConceptualModelSection({ data }) {
  const modelSteps = [
    {
      label: "Mindfulness traits",
      body: "Students differ in their tendency to notice, describe, accept, and respond deliberately to present-moment experience.",
    },
    {
      label: "Emotion regulation",
      body: "Those traits may shape reappraisal, nonreactivity, reduced rumination, frustration recovery, and emotional clarity.",
    },
    {
      label: "Problem-solving process",
      body: "Regulation may influence self-talk, persistence, strategy shifts, cognitive flexibility, and willingness to continue through uncertainty.",
    },
    {
      label: "Problem-solving performance",
      body: "The study then examines how these processes relate to structured engineering performance outcomes.",
    },
  ];

  return (
    <section style={styles.section}>
      <div style={styles.sectionIntro}>
        <div style={styles.sectionKicker}>Conceptual model</div>
        <h2 style={styles.h2}>Emotion regulation is the proposed bridge</h2>
        <p style={styles.noteLarge}>
          {data.conceptual_model?.description ||
            "Mindfulness traits may support problem solving by shaping how students notice, interpret, and regulate achievement emotions during difficult tasks."}
        </p>
      </div>

      <div style={styles.conceptualGrid}>
        {modelSteps.map((step, index) => (
          <article key={step.label} style={styles.conceptualStep}>
            <div style={styles.stepNumber}>{index + 1}</div>
            <h3 style={styles.modelTitle}>{step.label}</h3>
            <p style={styles.findingBody}>{step.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function MixedMethodsDesignSection({ data }) {
  const fallbackPhases = [
    {
      phase: "Phase 1: Quantitative",
      label: "Relationship mapping",
      description:
        "Trait mindfulness scores are analyzed alongside engineering problem-solving performance measures to identify statistical relationships.",
    },
    {
      phase: "Phase 2: Qualitative",
      label: "Mechanism explanation",
      description:
        "Selected students complete a puzzle-based problem-solving task while their emotional regulation, self-talk, persistence, and strategy shifts are examined.",
    },
    {
      phase: "Integration",
      label: "Mixed-method interpretation",
      description:
        "Qualitative findings are used to explain how emotion regulation may account for the quantitative mindfulness–performance relationship.",
    },
  ];

  const phases =
    Array.isArray(data.mixed_methods_phases) && data.mixed_methods_phases.length
      ? data.mixed_methods_phases
      : fallbackPhases;

  return (
    <section style={styles.section}>
      <div style={styles.sectionIntro}>
        <div style={styles.sectionKicker}>Research design</div>
        <h2 style={styles.h2}>Explanatory sequential mixed-methods design</h2>
        <p style={styles.noteLarge}>
          The quantitative phase identifies relationships. The qualitative phase explains how
          students regulate emotions during problem solving. Integration connects the two.
        </p>
      </div>

      <div style={styles.phaseCards}>
        {phases.map((phase) => (
          <article key={phase.phase} style={styles.phaseCard}>
            <div style={styles.phaseName}>{phase.phase}</div>
            <h3 style={styles.modelTitle}>{phase.label}</h3>
            <p style={styles.phaseDescription}>{phase.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function QualitativePhaseSection({ data }) {
  const observed = data.qualitative_phase?.observed_dimensions || [
    "emotional tone",
    "emotion regulation strategies",
    "self-talk",
    "cognitive flexibility",
    "task persistence",
    "frustration recovery",
    "problem-solving approach",
  ];

  return (
    <section style={styles.prioritySection}>
      <div style={styles.sectionIntro}>
        <div style={styles.sectionKicker}>Phase 2 preview</div>
        <h2 style={styles.h2}>
          {data.qualitative_phase?.title || "Qualitative phase: emotion regulation during problem solving"}
        </h2>
        <p style={styles.noteLarge}>
          {data.qualitative_phase?.description ||
            "The qualitative phase examines how students with differing mindfulness traits regulate their emotions while solving a puzzle-based task."}
        </p>
      </div>

      <div style={styles.qualGrid}>
        {observed.map((item) => (
          <span key={item} style={styles.qualPill}>{item}</span>
        ))}
      </div>
    </section>
  );
}

const PARTICIPANT_DEMOGRAPHICS = [
  {
    key: "gender",
    label: "Gender",
    n: 128,
    items: [
      { label: "Man", count: 88 },
      { label: "Woman", count: 30 },
      { label: "Prefer not to answer", count: 10 },
    ],
  },
  {
    key: "race_ethnicity",
    label: "Race / ethnicity",
    n: 128,
    items: [
      { label: "White", count: 108 },
      { label: "Hispanic or Latino", count: 7 },
      { label: "Asian", count: 1 },
      { label: "Prefer not to answer", count: 2 },
      { label: "Other / unclear", count: 10 },
    ],
  },
  {
    key: "academic_level",
    label: "Academic level",
    n: 128,
    items: [
      { label: "Second-year", count: 83 },
      { label: "Third-year", count: 27 },
      { label: "First-year", count: 5 },
      { label: "Fourth-year", count: 3 },
      { label: "Other", count: 10 },
    ],
  },
  {
    key: "major",
    label: "Major",
    n: 128,
    items: [
      { label: "Mechanical Engineering", count: 87 },
      { label: "Civil Engineering", count: 19 },
      { label: "Biological Engineering", count: 11 },
      { label: "Other", count: 11 },
    ],
  },
];

const DEMO_PIE_COLORS = [
  "#f2382f",
  "#ff9800",
  "#f7d233",
  "#43a844",
  "#2f86df",
];

function sortedDemographicItems(demographic) {
  return [...demographic.items].sort((a, b) => b.count - a.count);
}

function participantWanderAnimationName(activeKey) {
  const names = {
    gender: "participantWanderGender",
    race_ethnicity: "participantWanderRace",
    academic_level: "participantWanderLevel",
    major: "participantWanderMajor",
  };

  return names[activeKey] || "participantWanderGender";
}

const WANDERING_PERSON_CATEGORY_INDEX_BY_KEY = {
  gender: 0,
  race_ethnicity: 1,
  academic_level: 2,
  major: 3,
};

function participantWrongGroupPosition(person, categoryCount) {
  const centers = participantPileCenters(categoryCount);
  const wrongIndex = (person.categoryIndex + 1) % categoryCount;
  return centers[wrongIndex] || centers[0] || { x: 50, y: 50 };
}

function clampPercent(value, min = 8, max = 92) {
  return Math.max(min, Math.min(max, value));
}

function participantPileCenters(count) {
  if (count === 3) {
    return [
      { x: 22, y: 52 },
      { x: 50, y: 52 },
      { x: 78, y: 52 },
    ];
  }

  if (count === 4) {
    return [
      { x: 20, y: 38 },
      { x: 50, y: 38 },
      { x: 80, y: 38 },
      { x: 50, y: 74 },
    ];
  }

  return [
    { x: 16, y: 36 },
    { x: 38, y: 36 },
    { x: 60, y: 36 },
    { x: 28, y: 74 },
    { x: 52, y: 74 },
  ];
}

function participantPersonPosition(person, categoryCount) {
  const centers = participantPileCenters(categoryCount);
  const center = centers[person.categoryIndex] || { x: 50, y: 50 };
  const cols = Math.ceil(Math.sqrt(person.categorySize * 1.35));
  const rows = Math.ceil(person.categorySize / cols);
  const col = person.categoryOffset % cols;
  const row = Math.floor(person.categoryOffset / cols);

  const maxWidth = categoryCount <= 3 ? 25 : 21;
  const maxHeight = categoryCount <= 3 ? 34 : 30;
  const stepX = cols > 1 ? Math.min(2.35, maxWidth / (cols - 1)) : 0;
  const stepY = rows > 1 ? Math.min(3.35, maxHeight / (rows - 1)) : 0;

  return {
    x: center.x + (col - (cols - 1) / 2) * stepX,
    y: center.y + (row - (rows - 1) / 2) * stepY,
  };
}

function buildParticipantPeople(demographic, activeKey) {
  const people = [];
  const items = sortedDemographicItems(demographic);
  const requestedWanderCategory =
    WANDERING_PERSON_CATEGORY_INDEX_BY_KEY[activeKey] ?? 0;
  const wanderCategoryIndex = Math.min(
    requestedWanderCategory,
    Math.max(0, items.length - 1)
  );

  items.forEach((item, categoryIndex) => {
    for (let i = 0; i < item.count; i += 1) {
      people.push({
        id: `P${String(people.length + 1).padStart(3, "0")}`,
        categoryIndex,
        categoryOffset: i,
        categorySize: item.count,
        categoryLabel: item.label,
        color: DEMO_PIE_COLORS[categoryIndex % DEMO_PIE_COLORS.length],
        isWanderer: categoryIndex === wanderCategoryIndex && i === 0,
      });
    }
  });

  return people.slice(0, 128);
}


function ParticipantPersonGlyph({ person, categoryCount, activeKey }) {
  const position = participantPersonPosition(person, categoryCount);
  const wrongPosition = participantWrongGroupPosition(person, categoryCount);
  const wanderAnimation = participantWanderAnimationName(activeKey);

  const loopOne = {
    x: clampPercent((position.x + wrongPosition.x) / 2 + 11),
    y: clampPercent(Math.min(position.y, wrongPosition.y) - 24, 8, 84),
  };

  const loopTwo = {
    x: clampPercent((position.x + wrongPosition.x) / 2 - 14),
    y: clampPercent(Math.min(position.y, wrongPosition.y) - 36, 8, 84),
  };

  const catchUp = {
    x: clampPercent(position.x * 0.74 + wrongPosition.x * 0.26),
    y: clampPercent(position.y * 0.74 + wrongPosition.y * 0.26),
  };

  return (
    <div
      className={person.isWanderer ? "participant-person-marker participant-wanderer" : "participant-person-marker"}
      style={{
        ...styles.participantPersonMarker,
        left: `${position.x}%`,
        top: `${position.y}%`,
        color: person.color,
        ...(person.isWanderer
          ? {
              "--wander-final-left": `${position.x}%`,
              "--wander-final-top": `${position.y}%`,
              "--wander-loop-one-left": `${loopOne.x}%`,
              "--wander-loop-one-top": `${loopOne.y}%`,
              "--wander-loop-two-left": `${loopTwo.x}%`,
              "--wander-loop-two-top": `${loopTwo.y}%`,
              "--wander-wrong-left": `${wrongPosition.x}%`,
              "--wander-wrong-top": `${wrongPosition.y}%`,
              "--wander-catch-left": `${catchUp.x}%`,
              "--wander-catch-top": `${catchUp.y}%`,
              zIndex: 4,
              transition: "none",
              animation: `${wanderAnimation} 2300ms cubic-bezier(0.22, 1, 0.36, 1) both`,
              animationDelay: "60ms",
              filter:
                "drop-shadow(0 0 5px rgba(234,215,164,0.55)) drop-shadow(0 1px 1px rgba(0,0,0,0.45))",
            }
          : {}),
      }}
      title={`${person.id}: ${person.categoryLabel}${person.isWanderer ? " — wandering participant" : ""}`}
    >
      <svg
        viewBox="0 0 14 18"
        aria-hidden="true"
        style={styles.participantPersonSvg}
      >
        <circle cx="7" cy="3.8" r="3" fill="currentColor" />
        <path
          d="M 3.1 17 C 3.35 11.2, 4.7 8.3, 7 8.3 C 9.3 8.3, 10.65 11.2, 10.9 17 Z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}


function ParticipantPeopleField({ demographic, activeKey }) {
  const people = buildParticipantPeople(demographic, activeKey);

  return (
    <div style={styles.participantPeopleCard}>
      <div style={styles.participantPeopleHeader}>
        <h3 style={styles.chartTitle}>128 participant units</h3>
        <p style={styles.chartNote}>
          Each icon represents one cleaned record. Icons regroup by the selected demographic variable.
        </p>
      </div>

      <div style={styles.participantPeopleField}>
        {people.map((person) => (
          <ParticipantPersonGlyph
            key={person.id}
            person={person}
            categoryCount={demographic.items.length}
            activeKey={activeKey}
          />
        ))}
      </div>
    </div>
  );
}


function ParticipantDemographicChart({ demographic }) {
  const total = demographic.items.reduce((sum, item) => sum + item.count, 0);

  function svgNum(value) {
    return Number(value).toFixed(4);
  }

  function polarToCartesian(cx, cy, r, angleDegrees) {
    const angleRadians = ((angleDegrees - 90) * Math.PI) / 180;

    return {
      x: cx + r * Math.cos(angleRadians),
      y: cy + r * Math.sin(angleRadians),
    };
  }

  function describeSlice(cx, cy, r, startAngle, endAngle) {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArcFlag = endAngle - startAngle > 180 ? "1" : "0";

    return [
      `M ${svgNum(cx)} ${svgNum(cy)}`,
      `L ${svgNum(start.x)} ${svgNum(start.y)}`,
      `A ${svgNum(r)} ${svgNum(r)} 0 ${largeArcFlag} 0 ${svgNum(end.x)} ${svgNum(end.y)}`,
      "Z",
    ].join(" ");
  }

  let currentAngle = 0;

  const slices = sortedDemographicItems(demographic).map((item, index) => {
    const angle = total > 0 ? (item.count / total) * 360 : 0;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    return {
      ...item,
      color: DEMO_PIE_COLORS[index % DEMO_PIE_COLORS.length],
      percent: total > 0 ? (item.count / total) * 100 : 0,
      path: describeSlice(50, 50, 39, startAngle, endAngle),
    };
  });

  return (
    <div style={styles.participantDemoChartCard}>
      <div style={styles.participantDemoChartHeader}>
        <h3 style={styles.chartTitle}>{demographic.label}</h3>
      </div>

      <div style={styles.participantDemoPieLayout}>
        <div style={styles.participantDemoPieSvgWrap}>
          <svg
            viewBox="0 0 100 100"
            role="img"
            aria-label={`${demographic.label} pie chart`}
            style={styles.participantDemoPieSvg}
          >
            {slices.map((slice) => (
              <path
                key={slice.label}
                d={slice.path}
                fill={slice.color}
                stroke="rgba(16,17,18,0.95)"
                strokeWidth="1.4"
              >
                <title>{`${slice.label}: ${slice.count} (${fmt(slice.percent, 1)}%)`}</title>
              </path>
            ))}

            <circle
              cx="50"
              cy="50"
              r="20"
              fill="rgba(16,17,18,0.92)"
              stroke="rgba(255,255,255,0.10)"
              strokeWidth="1"
            />
          </svg>
        </div>

        <div style={styles.participantDemoPieLegend}>
          {slices.map((slice) => (
            <div key={slice.label} style={styles.participantDemoPieLegendRow}>
              <span
                style={{
                  ...styles.participantDemoPieSwatch,
                  background: slice.color,
                }}
              />
              <span style={styles.participantDemoPieLegendLabel}>{slice.label}</span>
              <span style={styles.participantDemoPieLegendValue}>
                {slice.count} <span style={styles.participantDemoBarPercent}>({fmt(slice.percent, 1)}%)</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


function ParticipantDemographicsViewer() {
  const [activeKey, setActiveKey] = useState("gender");

  const activeDemographic =
    PARTICIPANT_DEMOGRAPHICS.find((item) => item.key === activeKey) ||
    PARTICIPANT_DEMOGRAPHICS[0];

  return (
    <div style={styles.participantDemoWindow}>
      <div style={styles.participantDemoMain}>
        <div style={styles.chartHeader}>
          <h3 style={styles.chartTitle}>Participant demographic profile</h3>
          <p style={styles.chartNote}>
            Select a demographic variable. The pie chart and participant icons regroup to represent that distribution.
          </p>
        </div>

        <div style={styles.participantDemoSingleDisplay}>
          <div
            className="participant-demo-upper-display"
            style={styles.participantDemoUpperDisplay}
          >
            <ParticipantDemographicChart demographic={activeDemographic} />
            <ParticipantPeopleField demographic={activeDemographic} activeKey={activeKey} />
          </div>

          <div
            className="participant-demo-bottom-controls"
            style={styles.participantDemoBottomControls}
          >
            <div
              className="participant-demo-inline-stats"
              style={styles.participantDemoInlineStats}
            >
              <div style={styles.participantDemoInlineStatNumber}>
                <span style={styles.controlStatVar}>n</span>
                <span style={styles.controlStatEquals}> = </span>
                <span style={styles.controlStatValue}>128</span>
              </div>
              <div style={styles.participantDemoControlNote}>
                Blank demographic responses are included in the appropriate not reported / other category.
              </div>
            </div>

            <div
              className="participant-demo-control-panel"
              style={styles.participantDemoControlPanel}
            >
              {PARTICIPANT_DEMOGRAPHICS.map((item) => {
                const active = item.key === activeKey;

                return (
                  <button
                    key={item.key}
                    className="participant-demo-chip"
                    type="button"
                    onClick={() => setActiveKey(item.key)}
                    style={{
                      ...styles.participantDemoChip,
                      background: active ? "rgba(234,215,164,0.86)" : "rgba(160,160,160,0.13)",
                      borderColor: active ? "rgba(234,215,164,0.95)" : "rgba(180,180,180,0.22)",
                      color: active ? "#101112" : "rgba(210,210,210,0.42)",
                      opacity: active ? 1 : 0.62,
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


function MethodsMeasuresSection({ data }) {
  const totalStudents = data?.dataset_summary?.n_rows_cleaned || 128;

  return (
    <section style={styles.section}>
      <div style={styles.sectionKicker}>Participants</div>
      <h2 style={styles.sectionTitle}>Who participated in the study</h2>

      <p style={styles.sectionText}>
        The cleaned quantitative dataset includes {totalStudents} undergraduate engineering student records. All 128 cleaned records are included below; blank demographic responses are counted in the appropriate not reported / other category.
      </p>

      <div style={styles.participantOverviewGrid}>
        <div style={styles.participantOverviewCard}>
          <div style={styles.statLabel}>Students</div>
          <div style={styles.statValue}>{totalStudents}</div>
          <div style={styles.statNote}>cleaned quantitative records</div>
        </div>

        <div style={styles.participantOverviewCard}>
          <div style={styles.statLabel}>Demographic records</div>
          <div style={styles.statValue}>128</div>
          <div style={styles.statNote}>blank responses counted as not reported / other</div>
        </div>

        <div style={styles.participantOverviewCard}>
          <div style={styles.statLabel}>Majors represented</div>
          <div style={styles.statValue}>4</div>
          <div style={styles.statNote}>including mechanical, civil, biological, and other</div>
        </div>

        <div style={styles.participantOverviewCard}>
          <div style={styles.statLabel}>Course context</div>
          <div style={styles.statValue}>3</div>
          <div style={styles.statNote}>Statics, Dynamics, and Mechanics of Materials</div>
        </div>
      </div>

      <ParticipantDemographicsViewer />
    </section>
  );
}


function RegressionSummary({ rows }) {
  return (
    <div style={styles.regressionGrid}>
      {rows.map((model) => (
        <div key={model.model_name} style={styles.modelCard}>
          <h3 style={styles.modelTitle}>{model.label}</h3>
          <div style={styles.modelMeta}>
            n = {model.n} · R² = {fmt(model.r_squared, 3)} · {model.f_p_label}
          </div>
          <div style={styles.termList}>
            {model.terms.map((term) => (
              <div key={`${model.model_name}-${term.term}`} style={styles.termRow}>
                <span>{term.label}</span>
                <strong>β = {fmt(term.beta, 3)}</strong>
                <em>{term.p_label}</em>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PublicStudyPage({ data }) {
  if (!data) {
    return (
      <main className="mindfulness-public-page" style={styles.page}>
        <ResponsivePageCSS />
        <section style={styles.hero}>
          <h1 className="mindfulness-page-title" style={styles.title}>Mindfulness Engineering Study</h1>
          <p style={styles.lede}>
            Presentation data not found. Run <code>python3 scripts/build_public_page_data.py</code>.
          </p>
        </section>
      </main>
    );
  }

  const summary = data.dataset_summary || {};
  const counts = summary.grade_counts || {};

  return (
    <main className="mindfulness-public-page" style={styles.page}>
      <ResponsivePageCSS />
      <section style={styles.hero}>
        <div style={styles.kicker}>{data.study_design_label || "Mixed-methods research exhibit"}</div>
        <FitTitle>{data.page_title}</FitTitle>
        <p style={styles.lede}>{data.page_subtitle}</p>

        <div style={styles.heroEquation}>
          {(data.hero_pathway || [
            "Mindfulness traits",
            "Emotion regulation",
            "Problem-solving performance",
          ]).map((step, index, arr) => (
            <span key={`${step}-${index}`} style={styles.heroEquationItem}>
              {step}
              {index < arr.length - 1 ? <b style={styles.heroArrow}>→</b> : null}
            </span>
          ))}
        </div>
      </section>

      <ResearchQuestionsSection data={data} />

      <WhyEmotionRegulationMatters />

      <ConceptualModelSection data={data} />

      <MixedMethodsDesignSection data={data} />

      <section style={styles.section}>
        <div style={styles.sectionIntro}>
          <div style={styles.sectionKicker}>Phase 1 findings</div>
          <h2 style={styles.h2}>Quantitative findings so far</h2>
          <p style={styles.note}>
            These findings identify the quantitative relationships that the qualitative phase will later explain through emotion regulation.
          </p>
        </div>
        <div style={styles.phaseOneGraphStack}>
          <InteractiveMindfulnessPlot points={data.visualization_points || []} />
        </div>

        <CorrelationMatrixGraph rows={data.course_correlation_matrix || []} />

        <FindingCards findings={data.top_findings || []} />
      </section>

      <QualitativePhaseSection data={data} />

      <MethodsMeasuresSection data={data} summary={summary} counts={counts} />

      <section style={styles.section}>
        <div style={styles.sectionIntro}>
          <div style={styles.sectionKicker}>Analysis details</div>
          <h2 style={styles.h2}>Quantitative phase details</h2>
          <p style={styles.note}>
            These supporting tables and models provide additional detail for the Phase 1 quantitative analysis.
          </p>
        </div>

        <div style={styles.detailStack}>
          <FacetBarChart rows={data.overall_facet_bars || []} />
          <CourseCorrelationMatrix rows={data.course_correlation_matrix || []} />
          <RegressionSummary rows={data.regression_summary || []} />
          <ReliabilityTable rows={data.reliability_summary || []} />
        </div>
      </section>

      <section style={styles.closing}>
        <div style={styles.sectionKicker}>Interpretation boundaries</div>
        <h2 style={styles.h2}>Limitations and privacy</h2>
        <ul style={styles.limitList}>
          {(data.limitations || []).map((item) => (
            <li key={item} style={styles.limitItem}>{item}</li>
          ))}
        </ul>
        <p style={styles.privacy}>{data.privacy_note}</p>
      </section>

    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "34px max(22px, 5vw)",
    background:
      "radial-gradient(circle at top left, rgba(201,165,106,0.20), transparent 32rem), #101112",
    color: "#eee8dc",
    fontFamily: "Times New Roman, Times, serif",
  },
  hero: {
    maxWidth: "none",
    marginBottom: "24px",
  },
  kicker: {
    color: "#c9a56a",
    letterSpacing: "0.13em",
    textTransform: "uppercase",
    fontSize: "0.76rem",
    marginBottom: "10px",
  },
  titleFitWrap: {
    width: "100%",
    maxWidth: "100%",
    overflow: "visible",
  },
  title: {
    margin: 0,
    lineHeight: 1.02,
    maxWidth: "100%",
    whiteSpace: "nowrap",
    letterSpacing: "-0.028em",
  },
  lede: {
    maxWidth: "840px",
    fontSize: "1.02rem",
    lineHeight: 1.42,
    color: "#d8d0c0",
    margin: "10px 0 0",
  },
  heroEquation: {
    display: "none",
  },
  heroEquationItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: "12px",
  },
  heroArrow: {
    color: "#c9a56a",
  },
  statGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "12px",
    marginBottom: "22px",
    maxWidth: "1120px",
  },
  statCard: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "8px",
    padding: "14px",
    minHeight: "132px",
  },
  statLabel: {
    color: "#c8bda9",
    fontSize: "0.88rem",
    marginBottom: "8px",
  },
  statValue: {
    color: "#fff6e8",
    fontSize: "1.85rem",
    lineHeight: 1,
  },
  statSub: {
    color: "#a99f90",
    marginTop: "8px",
    fontSize: "0.84rem",
  },
  prioritySection: {
    marginTop: "22px",
    padding: "20px",
    background: "rgba(201,165,106,0.065)",
    border: "1px solid rgba(201,165,106,0.22)",
    borderRadius: "8px",
  },
  section: {
    marginTop: "22px",
    padding: "18px",
    background: "rgba(255,255,255,0.045)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "8px",
  },
  sectionIntro: {
    maxWidth: "840px",
    marginBottom: "16px",
  },
  sectionKicker: {
    color: "#c9a56a",
    letterSpacing: "0.11em",
    textTransform: "uppercase",
    fontSize: "0.68rem",
    marginBottom: "7px",
  },
  h2: {
    margin: "0 0 8px",
    fontSize: "1.42rem",
    lineHeight: 1.1,
  },
  note: {
    margin: 0,
    color: "#cfc4b1",
    lineHeight: 1.45,
  },
  noteLarge: {
    color: "#d8d0c0",
    lineHeight: 1.55,
    fontSize: "1rem",
    maxWidth: "920px",
  },
  pathwayBox: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    alignItems: "center",
    margin: "18px 0",
    padding: "16px",
    borderRadius: "8px",
    background: "rgba(201,165,106,0.075)",
    border: "1px solid rgba(201,165,106,0.22)",
  },
  pathwayItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: "10px",
    color: "#fff3dd",
    fontSize: "0.96rem",
    fontWeight: 700,
  },
  pathwayArrow: {
    color: "#c9a56a",
  },
  designGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
    gap: "16px",
    marginTop: "18px",
  },
  designCard: {
    background: "rgba(0,0,0,0.18)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "8px",
    padding: "16px",
  },
  questionList: {
    margin: 0,
    paddingLeft: "20px",
    color: "#d8d0c0",
    lineHeight: 1.45,
  },
  questionItem: {
    marginBottom: "10px",
  },
  phaseList: {
    display: "grid",
    gap: "12px",
  },
  phaseItem: {
    borderTop: "1px solid rgba(255,255,255,0.09)",
    paddingTop: "10px",
  },
  phaseName: {
    color: "#c9a56a",
    fontWeight: 700,
  },
  phaseLabel: {
    color: "#fff3dd",
    fontSize: "1.04rem",
    marginTop: "2px",
  },
  phaseDescription: {
    color: "#d8d0c0",
    lineHeight: 1.45,
    margin: "6px 0 0",
  },
  questionListLarge: {
    display: "grid",
    gap: "10px",
    marginTop: "14px",
  },
  questionItemLarge: {
    display: "grid",
    gridTemplateColumns: "32px 1fr",
    gap: "10px",
    alignItems: "start",
    color: "#eee8dc",
    lineHeight: 1.42,
    fontSize: "0.98rem",
  },
  questionNumber: {
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    background: "rgba(201,165,106,0.18)",
    border: "1px solid rgba(201,165,106,0.35)",
    color: "#ead7a4",
    fontSize: "0.82rem",
    fontWeight: 700,
    lineHeight: 1,
  },
  whyGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "18px",
  },
  conceptualGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "12px",
  },
  conceptualStep: {
    background: "rgba(0,0,0,0.18)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "8px",
    padding: "14px",
  },
  stepNumber: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    background: "rgba(201,165,106,0.18)",
    color: "#ead7a4",
    fontWeight: 700,
    marginBottom: "10px",
  },
  phaseCards: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "14px",
  },
  phaseCard: {
    background: "rgba(0,0,0,0.18)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "8px",
    padding: "15px",
  },
  methodsStatGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "12px",
    marginBottom: "18px",
  },
  detailStack: {
    display: "grid",
    gap: "16px",
    marginTop: "16px",
  },
  phaseOneGraphStack: {
    display: "grid",
    gap: "16px",
    margin: "0 0 18px",
  },
  findingGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "12px",
  },
  findingCard: {
    background: "rgba(201,165,106,0.075)",
    border: "1px solid rgba(201,165,106,0.24)",
    borderRadius: "8px",
    padding: "14px",
  },
  findingKind: {
    color: "#c9a56a",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    fontSize: "0.72rem",
    marginBottom: "8px",
  },
  findingTitle: {
    margin: "0 0 10px",
    color: "#fff3dd",
    fontSize: "1.08rem",
    lineHeight: 1.15,
  },
  findingBody: {
    margin: 0,
    color: "#d8d0c0",
    lineHeight: 1.45,
  },

  whyMattersDiagram: {
    display: "grid",
    gap: "22px",
    marginTop: "18px",
  },
  whyMattersFlowScroller: {
    overflowX: "auto",
    paddingBottom: "4px",
  },
  whyMattersFlowWrap: {
    position: "relative",
    width: "100%",
    minWidth: "0",
    paddingTop: "28px",
  },
  whyMattersFeedbackArrow: {
    position: "absolute",
    top: "0",
    left: "2.5%",
    width: "73%",
    height: "36px",
    pointerEvents: "none",
    opacity: 0.98,
  },
  whyMattersFeedbackSvg: {
    display: "block",
    width: "100%",
    height: "100%",
    overflow: "visible",
  },
  whyMattersFlow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "clamp(6px, 1.2vw, 18px)",
    width: "100%",
    minWidth: "0",
  },
  whyMattersFlowItem: {
    display: "flex",
    alignItems: "center",
    gap: "clamp(6px, 1vw, 18px)",
    minWidth: 0,
    flex: "1 1 0",
  },
  whyMattersStageBox: {
    flex: "1 1 auto",
    minWidth: "0",
    minHeight: "clamp(46px, 5.2vw, 62px)",
    padding: "clamp(8px, 1.1vw, 12px) clamp(10px, 1.6vw, 18px)",
    display: "grid",
    placeItems: "center",
    boxSizing: "border-box",
    borderRadius: "7px",
    border: "1px solid rgba(201,165,106,0.42)",
    background: "rgba(0,0,0,0.18)",
    color: "#fff3dd",
    fontSize: "clamp(0.78rem, 1.35vw, 1.08rem)",
    fontWeight: 700,
    lineHeight: 1.12,
    textAlign: "center",
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.02)",
  },
  whyMattersArrow: {
    color: "#d84a2d",
    fontSize: "clamp(1rem, 1.8vw, 1.7rem)",
    fontWeight: 700,
    lineHeight: 1,
    flex: "0 0 auto",
  },
  whyMattersImageGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "clamp(6px, 1.8vw, 20px)",
    alignItems: "start",
  },
  whyMattersFigure: {
    margin: 0,
    display: "grid",
    gridTemplateRows: "auto 1fr",
    gap: "clamp(5px, 1.2vw, 10px)",
    alignItems: "start",
    minWidth: 0,
  },
  whyMattersImageButton: {
    appearance: "none",
    border: "none",
    padding: 0,
    margin: 0,
    width: "100%",
    minWidth: 0,
    display: "block",
    alignSelf: "start",
    background: "transparent",
    cursor: "zoom-in",
    fontFamily: "Times New Roman, Times, serif",
  },
  whyMattersImageFrame: {
    position: "relative",
    aspectRatio: "4 / 3",
    width: "100%",
    minWidth: 0,
    borderRadius: "clamp(5px, 1.2vw, 8px)",
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.03)",
  },
  whyMattersImageFallback: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "18px",
    textAlign: "center",
    color: "#d8d0c0",
    fontSize: "1rem",
    lineHeight: 1.2,
    background:
      "linear-gradient(135deg, rgba(201,165,106,0.10), rgba(255,255,255,0.04))",
  },
  whyMattersImage: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  whyMattersCaption: {
    alignSelf: "start",
    minHeight: "clamp(3.2em, 8vw, 4.2em)",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    color: "#bfb4a3",
    fontSize: "clamp(0.54rem, 2.05vw, 0.95rem)",
    lineHeight: 1.22,
    textAlign: "center",
    textWrap: "balance",
  },
  imageLightbox: {
    position: "fixed",
    inset: 0,
    zIndex: 1000,
    display: "grid",
    placeItems: "center",
    padding: "28px",
    background: "rgba(0,0,0,0.78)",
    backdropFilter: "blur(5px)",
  },
  imageLightboxCard: {
    position: "relative",
    width: "min(1040px, 94vw)",
    maxHeight: "92vh",
    display: "grid",
    gap: "12px",
    padding: "14px",
    borderRadius: "10px",
    border: "1px solid rgba(201,165,106,0.34)",
    background: "rgba(16,17,18,0.96)",
    boxShadow: "0 24px 70px rgba(0,0,0,0.62)",
  },
  imageLightboxClose: {
    position: "absolute",
    top: "8px",
    right: "10px",
    zIndex: 2,
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    border: "1px solid rgba(255,255,255,0.22)",
    background: "rgba(0,0,0,0.48)",
    color: "#fff3dd",
    fontSize: "1.45rem",
    lineHeight: 1,
    cursor: "pointer",
  },
  imageLightboxImageWrap: {
    width: "100%",
    maxHeight: "76vh",
    borderRadius: "8px",
    overflow: "hidden",
    background: "rgba(255,255,255,0.03)",
  },
  imageLightboxImage: {
    display: "block",
    width: "100%",
    maxHeight: "76vh",
    objectFit: "contain",
  },
  imageLightboxCaption: {
    display: "grid",
    gap: "4px",
    color: "#d8d0c0",
    fontSize: "1rem",
    lineHeight: 1.35,
    textAlign: "center",
  },
  participantOverviewGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: "12px",
    margin: "18px 0 18px",
  },
  participantOverviewCard: {
    padding: "16px",
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.045)",
  },
  participantDemoWindow: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "16px",
    alignItems: "start",
    marginTop: "18px",
    padding: "16px",
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.18)",
    overflow: "hidden",
  },
  participantDemoMain: {
    minWidth: 0,
  },
  participantDemoSingleDisplay: {
    display: "grid",
    gap: "14px",
    marginTop: "14px",
  },
  participantDemoUpperDisplay: {
    display: "grid",
    gridTemplateColumns: "minmax(280px, 0.72fr) minmax(430px, 1.28fr)",
    gap: "14px",
    alignItems: "stretch",
  },
  participantDemoChartGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "12px",
    marginTop: "14px",
  },
  participantDemoChartCard: {
    padding: "14px",
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.035)",
    minWidth: 0,
    height: "100%",
  },
  participantDemoChartHeader: {
    display: "flex",
    justifyContent: "flex-start",
    gap: "12px",
    alignItems: "baseline",
    marginBottom: "10px",
  },
  participantDemoChartN: {
    color: "#c9a56a",
    fontSize: "0.9rem",
    whiteSpace: "nowrap",
  },
  participantDemoPieControlGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(145px, 180px) 180px",
    gap: "14px",
    alignItems: "center",
  },
  participantDemoInlineStats: {
    display: "grid",
    gap: "4px",
    padding: "2px 4px",
    color: "#fff3dd",
    fontFamily: "Times New Roman, Times, serif",
  },
  participantDemoInlineStatNumber: {
    fontSize: "1.1rem",
    lineHeight: 1.2,
  },
  participantDemoPieLayout: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "14px",
    alignItems: "center",
    justifyItems: "center",
  },
  participantDemoPieSvgWrap: {
    display: "grid",
    placeItems: "center",
    width: "100%",
    minWidth: 0,
  },
  participantDemoPieSvg: {
    width: "min(240px, 82%)",
    maxWidth: "100%",
    height: "auto",
    aspectRatio: "1 / 1",
    display: "block",
  },
  participantDemoPieCenterLabel: {
    fill: "#bfb4a3",
    fontFamily: "Times New Roman, Times, serif",
    fontSize: "8px",
    fontStyle: "italic",
  },
  participantDemoPieCenterValue: {
    fill: "#fff3dd",
    fontFamily: "Times New Roman, Times, serif",
    fontSize: "11px",
    fontWeight: 700,
  },
  participantDemoPieLegend: {
    display: "grid",
    gap: "7px",
    width: "100%",
    maxWidth: "430px",
    minWidth: 0,
  },
  participantDemoPieLegendRow: {
    display: "grid",
    gridTemplateColumns: "10px minmax(0, 1fr) max-content",
    gap: "7px",
    alignItems: "center",
    minWidth: 0,
  },
  participantDemoPieSwatch: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    boxShadow: "0 0 0 1px rgba(255,255,255,0.18)",
  },
  participantDemoPieLegendLabel: {
    color: "#fff3dd",
    fontSize: "0.86rem",
    lineHeight: 1.15,
    minWidth: 0,
  },
  participantDemoPieLegendValue: {
    color: "#d8d0c0",
    fontSize: "0.82rem",
    whiteSpace: "nowrap",
  },
  participantDemoBars: {
    display: "grid",
    gap: "10px",
  },
  participantDemoBarRow: {
    display: "grid",
    gap: "4px",
  },
  participantDemoBarTopLine: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    alignItems: "baseline",
  },
  participantDemoBarLabel: {
    color: "#fff3dd",
    fontSize: "0.92rem",
    lineHeight: 1.15,
  },
  participantDemoBarValue: {
    color: "#d8d0c0",
    fontSize: "0.88rem",
    whiteSpace: "nowrap",
  },
  participantDemoBarPercent: {
    color: "#a99d8c",
  },
  participantDemoBarTrack: {
    height: "9px",
    borderRadius: "999px",
    overflow: "hidden",
    background: "rgba(255,255,255,0.08)",
  },
  participantDemoBarFill: {
    height: "100%",
    borderRadius: "999px",
    background: "linear-gradient(90deg, rgba(201,165,106,0.82), rgba(234,215,164,0.96))",
  },
  participantPeopleCard: {
    padding: "14px",
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.035)",
    minWidth: 0,
    height: "100%",
  },
  participantPeopleHeader: {
    marginBottom: "10px",
  },
  participantPeopleField: {
    position: "relative",
    height: "360px",
    borderRadius: "8px",
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.08)",
    background:
      "radial-gradient(circle at 50% 50%, rgba(234,215,164,0.055), rgba(0,0,0,0.08) 58%, rgba(0,0,0,0.16))",
  },
  participantPersonMarker: {
    position: "absolute",
    width: "13px",
    height: "17px",
    transform: "translate(-50%, -50%)",
    transition:
      "left 760ms cubic-bezier(0.22, 1, 0.36, 1), top 760ms cubic-bezier(0.22, 1, 0.36, 1), color 240ms ease, opacity 240ms ease",
    opacity: 0.92,
    filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.40))",
  },
  participantPersonSvg: {
    display: "block",
    width: "100%",
    height: "100%",
  },
  participantDemoBottomControls: {
    display: "grid",
    gridTemplateColumns: "minmax(220px, 310px) 1fr",
    gap: "12px",
    alignItems: "center",
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.14)",
  },
  participantDemoControlPanel: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: "7px",
    padding: 0,
    border: "none",
    background: "transparent",
    boxShadow: "none",
  },
  participantDemoChip: {
    appearance: "none",
    width: "auto",
    minWidth: "max-content",
    padding: "7px 12px",
    borderRadius: "6px",
    border: "1px solid rgba(255,255,255,0.18)",
    fontFamily: "Times New Roman, Times, serif",
    fontSize: "0.78rem",
    fontWeight: 800,
    lineHeight: 1.05,
    textAlign: "left",
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "background 140ms ease, color 140ms ease, opacity 140ms ease, border-color 140ms ease",
  },
  participantDemoControlStats: {
    marginTop: "3px",
    paddingTop: "9px",
    borderTop: "1px solid rgba(255,255,255,0.14)",
    color: "#fff3dd",
    fontFamily: "Times New Roman, Times, serif",
    fontSize: "1rem",
  },
  participantDemoControlNote: {
    marginTop: "5px",
    color: "#bfb4a3",
    fontSize: "0.78rem",
    lineHeight: 1.25,
  },
  matrixCard: {
    background: "rgba(0,0,0,0.18)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "8px",
    padding: "16px",
    marginBottom: "16px",
  },
  matrixHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    alignItems: "start",
    marginBottom: "10px",
  },
  matrixToggleButton: {
    appearance: "none",
    border: "1px solid rgba(201,165,106,0.34)",
    background: "rgba(201,165,106,0.10)",
    color: "#ead7a4",
    borderRadius: "7px",
    padding: "7px 10px",
    fontFamily: "Times New Roman, Times, serif",
    fontSize: "0.78rem",
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  matrixCollapsedNote: {
    color: "#bfb4a3",
    fontSize: "0.88rem",
    lineHeight: 1.35,
    borderTop: "1px solid rgba(255,255,255,0.08)",
    paddingTop: "10px",
  },
  matrixWrap: {
    overflowX: "auto",
  },
  matrixGrid: {
    display: "grid",
    gridTemplateColumns: "170px repeat(6, minmax(116px, 1fr))",
    gap: "7px",
    minWidth: "920px",
  },
  matrixCorner: {
    minHeight: "42px",
  },
  matrixHeaderCell: {
    minHeight: "42px",
    display: "flex",
    alignItems: "end",
    justifyContent: "center",
    textAlign: "center",
    color: "#ead7a4",
    fontSize: "0.78rem",
    lineHeight: 1.15,
    padding: "6px",
    borderBottom: "1px solid rgba(201,165,106,0.22)",
  },
  matrixOutcomeCell: {
    display: "flex",
    alignItems: "center",
    color: "#fff3dd",
    fontWeight: 700,
    fontSize: "0.9rem",
    padding: "8px",
    borderRight: "1px solid rgba(201,165,106,0.22)",
  },
  matrixCell: {
    minHeight: "54px",
    display: "grid",
    placeItems: "center",
    gap: "2px",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "6px",
    color: "#fff3dd",
    fontSize: "0.86rem",
    lineHeight: 1.1,
    padding: "6px",
  },
  interactivePlotCard: {
    background: "rgba(0,0,0,0.18)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "8px",
    padding: "16px",
    overflow: "hidden",
  },
  interactivePlotMain: {
    minWidth: 0,
  },
  plotStage: {
    position: "relative",
    width: "100%",
    paddingRight: "168px",
    boxSizing: "border-box",
  },
  plotControlPanel: {
    position: "absolute",
    top: "10px",
    right: "10px",
    zIndex: 5,
    width: "148px",
    display: "grid",
    gap: "5px",
    padding: "7px",
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.20)",
    background: "rgba(16,17,18,0.84)",
    backdropFilter: "blur(7px)",
    boxShadow: "0 12px 28px rgba(0,0,0,0.36)",
  },
  traitChip: {
    appearance: "none",
    width: "100%",
    padding: "5px 6px",
    borderRadius: "6px",
    border: "1px solid rgba(255,255,255,0.18)",
    fontFamily: "Times New Roman, Times, serif",
    fontSize: "0.72rem",
    fontWeight: 800,
    lineHeight: 1.08,
    textAlign: "left",
    cursor: "pointer",
    transition: "background 140ms ease, color 140ms ease, opacity 140ms ease, border-color 140ms ease, transform 140ms ease",
  },
  controlDivider: {
    height: "1px",
    background: "rgba(255,255,255,0.16)",
    margin: "2px 0 1px",
  },
  outcomeChip: {
    appearance: "none",
    width: "100%",
    padding: "4px 6px",
    borderRadius: "6px",
    border: "1px solid rgba(255,255,255,0.18)",
    fontFamily: "Times New Roman, Times, serif",
    fontSize: "0.68rem",
    fontWeight: 800,
    lineHeight: 1.05,
    textAlign: "left",
    cursor: "pointer",
    transition: "background 140ms ease, color 140ms ease, opacity 140ms ease, border-color 140ms ease",
  },
  chartGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
    gap: "16px",
  },
  chartCard: {
    background: "rgba(0,0,0,0.18)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "8px",
    padding: "16px",
    overflow: "hidden",
  },
  chartHeader: {
    marginBottom: "10px",
  },
  chartTitle: {
    margin: "0 0 6px",
    color: "#fff3dd",
    fontSize: "1.08rem",
  },
  chartNote: {
    margin: 0,
    color: "#bfb4a3",
    lineHeight: 1.4,
  },
  svg: {
    width: "100%",
    height: "auto",
    display: "block",
  },
  controlStats: {
    marginTop: "4px",
    paddingTop: "8px",
    borderTop: "1px solid rgba(255,255,255,0.16)",
    display: "grid",
    gap: "3px",
  },
  controlStatLine: {
    display: "grid",
    gridTemplateColumns: "18px 12px 1fr",
    alignItems: "baseline",
    columnGap: "4px",
    color: "#fff3dd",
    fontFamily: "Times New Roman, Times, serif",
  },
  controlStatVar: {
    fontStyle: "italic",
    fontSize: "1.08rem",
    lineHeight: 1,
    color: "#fff6e8",
  },
  controlStatEquals: {
    fontSize: "0.96rem",
    color: "#cfc4b1",
    lineHeight: 1,
  },
  controlStatValue: {
    fontSize: "1.08rem",
    fontVariantNumeric: "tabular-nums",
    color: "#fff6e8",
    lineHeight: 1,
  },
  chartFooter: {
    color: "#bfb4a3",
    fontSize: "0.84rem",
    marginTop: "8px",
  },
  barList: {
    display: "grid",
    gap: "12px",
  },
  barRow: {
    display: "grid",
    gridTemplateColumns: "210px minmax(120px, 1fr) 180px",
    gap: "12px",
    alignItems: "center",
  },
  barLabel: {
    color: "#fff3dd",
    fontWeight: 700,
  },
  barTrack: {
    height: "12px",
    background: "rgba(255,255,255,0.11)",
    borderRadius: "8px",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    background: "linear-gradient(90deg, #b58c4a, #ead7a4)",
    borderRadius: "8px",
  },
  barValue: {
    color: "#d8d0c0",
    whiteSpace: "nowrap",
  },
  pill: {
    marginLeft: "8px",
    padding: "2px 7px",
    borderRadius: "8px",
    background: "rgba(201,165,106,0.15)",
    color: "#ead7a4",
    fontSize: "0.76rem",
  },
  tableWrap: {
    overflowX: "auto",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "8px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "760px",
    fontSize: "0.88rem",
  },
  th: {
    textAlign: "left",
    padding: "11px 12px",
    borderBottom: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.07)",
    color: "#f1dfbd",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "10px 12px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    color: "#e8dfd0",
    whiteSpace: "nowrap",
  },
  tdStrong: {
    padding: "10px 12px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    color: "#fff3dd",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  regressionGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))",
    gap: "12px",
  },
  modelCard: {
    background: "rgba(0,0,0,0.18)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "8px",
    padding: "16px",
  },
  modelTitle: {
    margin: "0 0 8px",
    color: "#fff3dd",
    fontSize: "1rem",
  },
  modelMeta: {
    color: "#c9a56a",
    marginBottom: "12px",
  },
  termList: {
    display: "grid",
    gap: "8px",
  },
  termRow: {
    display: "grid",
    gridTemplateColumns: "1fr auto auto",
    gap: "10px",
    alignItems: "center",
    color: "#d8d0c0",
    borderTop: "1px solid rgba(255,255,255,0.08)",
    paddingTop: "8px",
  },
  twoColumn: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "18px",
    alignItems: "start",
  },
  dl: {
    margin: 0,
  },
  dlRow: {
    marginBottom: "16px",
  },
  dt: {
    color: "#c9a56a",
    fontWeight: 700,
    textTransform: "capitalize",
    marginBottom: "4px",
  },
  dd: {
    margin: 0,
    color: "#d8d0c0",
    lineHeight: 1.45,
  },
  limitList: {
    margin: 0,
    paddingLeft: "20px",
    color: "#d8d0c0",
    lineHeight: 1.5,
  },
  limitItem: {
    marginBottom: "10px",
  },
  closing: {
    marginTop: "22px",
    padding: "28px",
    border: "1px solid rgba(201,165,106,0.28)",
    background: "rgba(201,165,106,0.07)",
    borderRadius: "8px",
  },
  qualGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginTop: "16px",
  },
  qualPill: {
    padding: "7px 11px",
    borderRadius: "8px",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "#fff3dd",
  },
  privacy: {
    marginTop: "18px",
    color: "#bfb4a3",
    lineHeight: 1.45,
    fontSize: "0.96rem",
  },
};
