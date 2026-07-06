"use client";

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
  const phases = data.mixed_methods_phases || [];
  const questions = data.research_questions || [];
  const pathway = data.conceptual_model?.pathway || [];

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

      <div style={styles.designGrid}>
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
      <main style={styles.page}>
        <section style={styles.hero}>
          <h1 style={styles.title}>Mindfulness Engineering Study</h1>
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
    <main style={styles.page}>
      <section style={styles.hero}>
        <div style={styles.kicker}>{data.study_design_label || "Mixed-methods research exhibit"}</div>
        <h1 style={styles.title}>{data.page_title}</h1>
        <p style={styles.lede}>{data.page_subtitle}</p>

        <div style={styles.heroEquation}>
          {(data.conceptual_model?.pathway || [
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

      <section style={styles.statGrid}>
        <StatCard label="Students" value={summary.n_rows_cleaned ?? "—"} sub="cleaned records" />
        <StatCard label="Mindfulness facets" value="5" sub="trait mindfulness dimensions" />
        <StatCard label="Overall grades" value={counts.overall_grade ?? "—"} sub="available outcomes" />
        <StatCard label="Qualitative phase" value="Next" sub="emotion regulation mechanisms" />
      </section>

      <ResearchDesignPanel data={data} />

      <section style={styles.section}>
        <div style={styles.sectionIntro}>
          <h2 style={styles.h2}>Top findings</h2>
          <p style={styles.note}>
            The current quantitative phase maps the mindfulness–performance relationship that the qualitative phase will later explain through emotion regulation.
          </p>
        </div>
        <FindingCards findings={data.top_findings || []} />
      </section>

      <section style={styles.section}>
        <div style={styles.sectionIntro}>
          <h2 style={styles.h2}>Quantitative relationship: mindfulness traits and performance</h2>
          <p style={styles.note}>
            These charts use binned aggregates rather than row-level points, preserving the visible trend without publishing individual records.
          </p>
        </div>

        <div style={styles.chartGrid}>
          {(data.binned_relationships || []).map((chart) => (
            <BinnedRelationshipChart key={`${chart.x}-${chart.y}`} chart={chart} />
          ))}
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.sectionIntro}>
          <h2 style={styles.h2}>Which mindfulness traits matter most?</h2>
          <p style={styles.note}>
            Overall grade is most strongly associated with total mindfulness and acting with awareness.
          </p>
        </div>
        <FacetBarChart rows={data.overall_facet_bars || []} />
      </section>

      <section style={styles.section}>
        <div style={styles.sectionIntro}>
          <h2 style={styles.h2}>Course-specific signals</h2>
          <p style={styles.note}>
            Course-level samples are smaller, so these patterns should be treated as exploratory.
          </p>
        </div>
        <CourseCorrelationMatrix rows={data.course_correlation_matrix || []} />
      </section>

      <section style={styles.section}>
        <div style={styles.sectionIntro}>
          <h2 style={styles.h2}>Regression models</h2>
          <p style={styles.note}>
            Exploratory linear models summarize the quantitative phase. The mixed-methods interpretation will depend on the qualitative emotion-regulation evidence.
          </p>
        </div>
        <RegressionSummary rows={data.regression_summary || []} />
      </section>

      <section style={styles.section}>
        <div style={styles.sectionIntro}>
          <h2 style={styles.h2}>Measure reliability</h2>
          <p style={styles.note}>
            The mindfulness scales show generally acceptable to strong internal consistency in this sample.
          </p>
        </div>
        <ReliabilityTable rows={data.reliability_summary || []} />
      </section>

      <section style={styles.twoColumn}>
        <div style={styles.section}>
          <h2 style={styles.h2}>Methods</h2>
          <dl style={styles.dl}>
            {Object.entries(data.methods || {}).map(([key, value]) => (
              <div key={key} style={styles.dlRow}>
                <dt style={styles.dt}>{labelFromKey(key)}</dt>
                <dd style={styles.dd}>{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div style={styles.section}>
          <h2 style={styles.h2}>Limitations</h2>
          <ul style={styles.limitList}>
            {(data.limitations || []).map((item) => (
              <li key={item} style={styles.limitItem}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section style={styles.closing}>
        <h2 style={styles.h2}>{data.qualitative_phase?.title || "Qualitative phase: emotion regulation during problem solving"}</h2>
        <p style={styles.noteLarge}>
          {data.qualitative_phase?.description}
        </p>
        <div style={styles.qualGrid}>
          {(data.qualitative_phase?.observed_dimensions || []).map((item) => (
            <span key={item} style={styles.qualPill}>{item}</span>
          ))}
        </div>
        <p style={styles.privacy}>{data.privacy_note}</p>
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "52px max(28px, 6vw)",
    background:
      "radial-gradient(circle at top left, rgba(201,165,106,0.20), transparent 32rem), #101112",
    color: "#eee8dc",
    fontFamily: "Times New Roman, Times, serif",
  },
  hero: {
    maxWidth: "1120px",
    marginBottom: "28px",
  },
  kicker: {
    color: "#c9a56a",
    letterSpacing: "0.13em",
    textTransform: "uppercase",
    fontSize: "0.82rem",
    marginBottom: "10px",
  },
  title: {
    margin: 0,
    fontSize: "clamp(2.4rem, 5vw, 5rem)",
    lineHeight: 0.96,
    maxWidth: "1000px",
  },
  lede: {
    maxWidth: "900px",
    fontSize: "1.22rem",
    lineHeight: 1.55,
    color: "#d8d0c0",
  },
  heroEquation: {
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    alignItems: "center",
    marginTop: "24px",
    padding: "16px 18px",
    border: "1px solid rgba(201,165,106,0.28)",
    borderRadius: "18px",
    background: "rgba(255,255,255,0.045)",
    color: "#fff3dd",
    fontSize: "1.08rem",
    width: "fit-content",
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
    gap: "14px",
    marginBottom: "30px",
  },
  statCard: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "18px",
    padding: "18px",
  },
  statLabel: {
    color: "#c8bda9",
    fontSize: "0.95rem",
    marginBottom: "8px",
  },
  statValue: {
    color: "#fff6e8",
    fontSize: "2.3rem",
    lineHeight: 1,
  },
  statSub: {
    color: "#a99f90",
    marginTop: "8px",
    fontSize: "0.9rem",
  },
  section: {
    marginTop: "28px",
    padding: "24px",
    background: "rgba(255,255,255,0.045)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "20px",
  },
  sectionIntro: {
    maxWidth: "900px",
    marginBottom: "16px",
  },
  h2: {
    margin: "0 0 8px",
    fontSize: "1.8rem",
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
    fontSize: "1.12rem",
    maxWidth: "920px",
  },
  pathwayBox: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    alignItems: "center",
    margin: "18px 0",
    padding: "16px",
    borderRadius: "16px",
    background: "rgba(201,165,106,0.075)",
    border: "1px solid rgba(201,165,106,0.22)",
  },
  pathwayItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: "10px",
    color: "#fff3dd",
    fontSize: "1.08rem",
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
    borderRadius: "16px",
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
  findingGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "14px",
  },
  findingCard: {
    background: "rgba(201,165,106,0.075)",
    border: "1px solid rgba(201,165,106,0.24)",
    borderRadius: "18px",
    padding: "18px",
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
    fontSize: "1.24rem",
    lineHeight: 1.15,
  },
  findingBody: {
    margin: 0,
    color: "#d8d0c0",
    lineHeight: 1.45,
  },
  chartGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
    gap: "16px",
  },
  chartCard: {
    background: "rgba(0,0,0,0.18)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "16px",
    padding: "16px",
    overflow: "hidden",
  },
  chartHeader: {
    marginBottom: "10px",
  },
  chartTitle: {
    margin: "0 0 6px",
    color: "#fff3dd",
    fontSize: "1.25rem",
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
  chartFooter: {
    color: "#bfb4a3",
    fontSize: "0.92rem",
    marginTop: "8px",
  },
  barList: {
    display: "grid",
    gap: "12px",
  },
  barRow: {
    display: "grid",
    gridTemplateColumns: "210px minmax(120px, 1fr) 180px",
    gap: "14px",
    alignItems: "center",
  },
  barLabel: {
    color: "#fff3dd",
    fontWeight: 700,
  },
  barTrack: {
    height: "12px",
    background: "rgba(255,255,255,0.11)",
    borderRadius: "999px",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    background: "linear-gradient(90deg, #b58c4a, #ead7a4)",
    borderRadius: "999px",
  },
  barValue: {
    color: "#d8d0c0",
    whiteSpace: "nowrap",
  },
  pill: {
    marginLeft: "8px",
    padding: "2px 7px",
    borderRadius: "999px",
    background: "rgba(201,165,106,0.15)",
    color: "#ead7a4",
    fontSize: "0.82rem",
  },
  tableWrap: {
    overflowX: "auto",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "14px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "760px",
    fontSize: "0.95rem",
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
    gap: "14px",
  },
  modelCard: {
    background: "rgba(0,0,0,0.18)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "16px",
    padding: "16px",
  },
  modelTitle: {
    margin: "0 0 8px",
    color: "#fff3dd",
    fontSize: "1.1rem",
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
    marginTop: "28px",
    padding: "28px",
    border: "1px solid rgba(201,165,106,0.28)",
    background: "rgba(201,165,106,0.07)",
    borderRadius: "22px",
  },
  qualGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginTop: "16px",
  },
  qualPill: {
    padding: "7px 11px",
    borderRadius: "999px",
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
