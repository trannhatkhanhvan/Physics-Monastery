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

      @media (max-width: 900px) {
        .mindfulness-plot-stage {
          padding-right: 0 !important;
        }

        .mindfulness-plot-control-panel {
          position: static !important;
          width: auto !important;
          margin-top: 10px !important;
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


function CorrelationMatrixGraph({ rows }) {
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
      <div style={styles.chartHeader}>
        <h3 style={styles.chartTitle}>Correlation matrix: grades × mindfulness traits</h3>
        <p style={styles.chartNote}>
          Pearson correlations computed from all available complete pairs. Each cell reports r and n.
        </p>
      </div>

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

  const allEnabled = enabled.length === MINDFULNESS_FACETS.length;

  const plottedPoints = (points || [])
    .map((point) => {
      const values = point.values || {};
      const y = Number(values.overall_grade);

      if (!Number.isFinite(y)) return null;

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
  const title = allEnabled
    ? "Total Mindfulness vs. Overall Grade"
    : "Selected Mindfulness Composite vs. Overall Grade";

  const xLabel = allEnabled
    ? "Total Mindfulness"
    : "Selected mindfulness composite";

  function toggleFacet(key) {
    setEnabled((current) => {
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
                stroke="#ead7a4"
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
                r="3.4"
                fill="rgba(181,140,74,0.72)"
                stroke="rgba(255,246,232,0.55)"
                strokeWidth="0.8"
              >
                <title>{`${point.point_id}: ${xLabel} = ${fmt(point.x, 3)}, Overall Grade = ${fmt(point.y, 3)}`}</title>
              </circle>
            ))}

            <text x={width / 2} y={height - 18} textAnchor="middle" fill="#d8d0c0" fontSize="15">
              {xLabel}
            </text>
            <text x={18} y={height / 2} textAnchor="middle" fill="#d8d0c0" fontSize="15" transform={`rotate(-90 18 ${height / 2})`}>
              Overall Grade
            </text>
          </svg>

          <div className="mindfulness-plot-control-panel" style={styles.plotControlPanel}>
            {MINDFULNESS_FACETS.map((facet) => {
              const active = enabled.includes(facet.key);
              const disabled = active && enabled.length === 1;

              return (
                <button
                  key={facet.key}
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

            <div style={styles.controlStats}>
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
        <div style={styles.sectionKicker}>Central study question</div>
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

function MethodsMeasuresSection({ data, summary, counts }) {
  const methods = data.methods || {};

  return (
    <section style={styles.section}>
      <div style={styles.sectionIntro}>
        <div style={styles.sectionKicker}>Methods and measures</div>
        <h2 style={styles.h2}>How the study is being measured</h2>
      </div>

      <div style={styles.methodsStatGrid}>
        <StatCard label="Students" value={summary.n_rows_cleaned ?? "—"} sub="cleaned quantitative records" />
        <StatCard label="Mindfulness facets" value="5" sub="FFMQ trait dimensions" />
        <StatCard label="Overall grades" value={counts.overall_grade ?? "—"} sub="available quantitative outcomes" />
        <StatCard label="Qualitative phase" value="Next" sub="think-aloud problem solving" />
      </div>

      <dl style={styles.dl}>
        {Object.entries(methods).map(([key, value]) => (
          <div key={key} style={styles.dlRow}>
            <dt style={styles.dt}>{labelFromKey(key)}</dt>
            <dd style={styles.dd}>{value}</dd>
          </div>
        ))}
      </dl>
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
  matrixCard: {
    background: "rgba(0,0,0,0.18)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "8px",
    padding: "16px",
    marginBottom: "16px",
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
