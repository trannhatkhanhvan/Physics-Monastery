"use client";

import { useMemo, useState } from "react";

const FACET_LABELS = {
  ffmq_observe: "Observe",
  ffmq_describe: "Describe",
  ffmq_act_aware: "Act with Awareness",
  ffmq_nonjudge: "Nonjudge",
  ffmq_nonreact: "Nonreact",
  ffmq_total: "Total Mindfulness",
};

const GRADE_LABELS = {
  statics_grade: "Statics",
  dynamics_grade: "Dynamics",
  mechanics_grade: "Mechanics",
  overall_grade: "Overall",
};

const ROW_COLUMNS = [
  "source_row_number",
  "student_key",
  "duplicate_status",
  "complete_mindfulness",
  "complete_grade",
  "age",
  "gender",
  "race_ethnicity",
  "academic_level",
  "major",
  "gpa_category",
  "statics_grade",
  "dynamics_grade",
  "mechanics_grade",
  "overall_grade",
  "ffmq_observe",
  "ffmq_describe",
  "ffmq_act_aware",
  "ffmq_nonjudge",
  "ffmq_nonreact",
  "ffmq_total",
];

function number(value, digits = 3) {
  const n = Number(value);
  if (!Number.isFinite(n)) return value || "—";
  return n.toFixed(digits);
}

function pct(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${(100 * n).toFixed(1)}%`;
}

function displayLabel(key) {
  return FACET_LABELS[key] || GRADE_LABELS[key] || key.replaceAll("_", " ");
}

function Card({ label, value, sub }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardLabel}>{label}</div>
      <div style={styles.cardValue}>{value}</div>
      {sub ? <div style={styles.cardSub}>{sub}</div> : null}
    </div>
  );
}

function TopFindings({ findings }) {
  if (!findings || findings.length === 0) {
    return (
      <div style={styles.emptyState}>
        Run the stronger analysis script to generate top findings.
      </div>
    );
  }

  return (
    <div style={styles.findingGrid}>
      {findings.map((finding, index) => (
        <div key={`${finding.title}-${index}`} style={styles.findingCard}>
          <div style={styles.findingKind}>{finding.kind || "finding"}</div>
          <h3 style={styles.findingTitle}>{finding.title}</h3>
          <p style={styles.findingBody}>{finding.body}</p>
        </div>
      ))}
    </div>
  );
}

function BarTable({ rows, labelMap }) {
  const maxMean = Math.max(
    1,
    ...rows.map((row) => Number(row.mean)).filter((n) => Number.isFinite(n))
  );

  return (
    <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Variable</th>
            <th style={styles.th}>n</th>
            <th style={styles.th}>Mean</th>
            <th style={styles.th}>SD</th>
            <th style={styles.th}>Median</th>
            <th style={styles.th}>Range</th>
            <th style={styles.th}>Visual</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const mean = Number(row.mean);
            const width = Number.isFinite(mean)
              ? `${Math.max(2, (mean / maxMean) * 100)}%`
              : "0%";

            return (
              <tr key={row.variable}>
                <td style={styles.tdStrong}>{labelMap[row.variable] || displayLabel(row.variable)}</td>
                <td style={styles.td}>{row.n}</td>
                <td style={styles.td}>{number(row.mean)}</td>
                <td style={styles.td}>{number(row.sd)}</td>
                <td style={styles.td}>{number(row.median)}</td>
                <td style={styles.td}>
                  {number(row.min)} – {number(row.max)}
                </td>
                <td style={styles.td}>
                  <div style={styles.barTrack}>
                    <div style={{ ...styles.barFill, width }} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
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
            <th style={styles.th}>Complete n</th>
            <th style={styles.th}>Cronbach alpha</th>
            <th style={styles.th}>Flag</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const alpha = Number(row.cronbach_alpha);
            const flag =
              Number.isFinite(alpha) && alpha < 0.6
                ? "Inspect item mapping"
                : Number.isFinite(alpha) && alpha < 0.7
                  ? "Borderline"
                  : "OK";

            return (
              <tr key={row.scale}>
                <td style={styles.tdStrong}>{displayLabel(row.scale)}</td>
                <td style={styles.td}>{row.n_items}</td>
                <td style={styles.td}>{row.n_complete}</td>
                <td style={styles.td}>{number(row.cronbach_alpha, 3)}</td>
                <td style={styles.td}>{flag}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CorrelationTable({ rows }) {
  const sorted = [...rows].sort((a, b) => {
    const ar = Math.abs(Number(a.pearson_r));
    const br = Math.abs(Number(b.pearson_r));
    return br - ar;
  });

  return (
    <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Outcome</th>
            <th style={styles.th}>Predictor</th>
            <th style={styles.th}>n</th>
            <th style={styles.th}>Pearson r</th>
            <th style={styles.th}>Magnitude</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => {
            const r = Number(row.pearson_r);
            const width = Number.isFinite(r)
              ? `${Math.min(100, Math.abs(r) * 100)}%`
              : "0%";

            return (
              <tr key={`${row.outcome}-${row.predictor}`}>
                <td style={styles.tdStrong}>{displayLabel(row.outcome)}</td>
                <td style={styles.td}>{displayLabel(row.predictor)}</td>
                <td style={styles.td}>{row.n}</td>
                <td style={styles.td}>{number(row.pearson_r, 3)}</td>
                <td style={styles.td}>
                  <div style={styles.barTrack}>
                    <div style={{ ...styles.barFill, width }} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RowTable({ rows }) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return rows.filter((row) => {
      if (mode === "duplicates" && row.duplicate_status !== "duplicate_a_number") {
        return false;
      }

      if (mode === "incompleteMindfulness" && row.complete_mindfulness !== "True" && row.complete_mindfulness !== "true") {
        return false;
      }

      if (mode === "missingOverall" && row.overall_grade) {
        return false;
      }

      if (!q) return true;

      return Object.values(row).some((value) =>
        String(value ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, query, mode]);

  return (
    <div>
      <div style={styles.controls}>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search row table..."
          style={styles.search}
        />

        <select
          value={mode}
          onChange={(event) => setMode(event.target.value)}
          style={styles.select}
        >
          <option value="all">All rows</option>
          <option value="duplicates">Duplicate-flagged rows</option>
          <option value="missingOverall">Missing overall grade</option>
          <option value="incompleteMindfulness">Complete mindfulness rows</option>
        </select>

        <div style={styles.resultCount}>{filtered.length} rows shown</div>
      </div>

      <div style={styles.tableWrapTall}>
        <table style={styles.table}>
          <thead>
            <tr>
              {ROW_COLUMNS.map((col) => (
                <th key={col} style={styles.thSticky}>{displayLabel(col)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, index) => (
              <tr key={`${row.student_key}-${row.source_row_number}-${index}`}>
                {ROW_COLUMNS.map((col) => (
                  <td key={col} style={styles.tdSmall}>
                    {row[col] || "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ReviewDashboard({
  filesFound,
  datasetSummary,
  facetSummary,
  gradeSummary,
  correlationSummary,
  topFindings,
  reliabilityRows,
  cleanRows,
  duplicateRows,
}) {
  const missingFiles = Object.entries(filesFound)
    .filter(([, found]) => !found)
    .map(([key]) => key);

  const gradeCounts = datasetSummary?.grade_counts || {};
  const scoreCounts = datasetSummary?.mindfulness_score_counts || {};

  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <div>
          <div style={styles.kicker}>Local Review Dashboard</div>
          <h1 style={styles.title}>Mindfulness and Engineering Performance Study</h1>
          <p style={styles.lede}>
            A live local dashboard for reviewing the cleaned quantitative dataset,
            checking scoring behavior, inspecting duplicate flags, and preparing
            public-safe aggregate outputs.
          </p>
        </div>

        <div style={styles.privacyBox}>
          <strong>Privacy status:</strong> this page is intended for local review.
          It does not display A-numbers, but it does display row-level student
          records. Do not deploy this page publicly until row-level views are
          removed or protected.
        </div>
      </section>

      {missingFiles.length > 0 ? (
        <section style={styles.warning}>
          <strong>Missing generated files:</strong> {missingFiles.join(", ")}.
          Run the cleaner and analysis scripts before using this dashboard.
        </section>
      ) : null}

      <section style={styles.gridCards}>
        <Card
          label="Cleaned rows"
          value={datasetSummary?.n_rows_cleaned ?? "—"}
          sub="Rows in clean dataset"
        />
        <Card
          label="Complete mindfulness"
          value={datasetSummary?.n_complete_mindfulness ?? "—"}
          sub="Rows with all FFMQ scores"
        />
        <Card
          label="Any grade data"
          value={datasetSummary?.n_any_grade ?? "—"}
          sub="Rows with at least one grade"
        />
        <Card
          label="Duplicate-flagged"
          value={datasetSummary?.n_duplicate_flagged_rows ?? duplicateRows.length}
          sub="Rows requiring review"
        />
      </section>

      <section style={styles.section}>
        <h2 style={styles.h2}>Grade availability</h2>
        <div style={styles.miniGrid}>
          {Object.entries(gradeCounts).map(([key, value]) => (
            <Card key={key} label={displayLabel(key)} value={value} sub="available grades" />
          ))}
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.h2}>Mindfulness score availability</h2>
        <div style={styles.miniGrid}>
          {Object.entries(scoreCounts).map(([key, value]) => (
            <Card key={key} label={displayLabel(key)} value={value} sub="available scores" />
          ))}
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.h2}>Top findings</h2>
        <TopFindings findings={topFindings} />
      </section>

      <section style={styles.section}>
        <h2 style={styles.h2}>Mindfulness facet summary</h2>
        <BarTable rows={facetSummary} labelMap={FACET_LABELS} />
      </section>

      <section style={styles.section}>
        <h2 style={styles.h2}>Grade summary</h2>
        <BarTable rows={gradeSummary} labelMap={GRADE_LABELS} />
      </section>

      <section style={styles.section}>
        <h2 style={styles.h2}>Reliability check</h2>
        <p style={styles.note}>
          Low alpha values are diagnostic warnings, not final conclusions. They
          may indicate item-order mismatch, reverse-scoring issues, or an
          unstable facet in this sample.
        </p>
        <ReliabilityTable rows={reliabilityRows} />
      </section>

      <section style={styles.section}>
        <h2 style={styles.h2}>Grade/facet correlations</h2>
        <p style={styles.note}>
          These are first-pass Pearson correlations from the current cleaned
          file. They are not final until duplicate handling and scoring checks
          are settled.
        </p>
        <CorrelationTable rows={correlationSummary} />
      </section>

      <section style={styles.section}>
        <h2 style={styles.h2}>Row-level review table</h2>
        <p style={styles.note}>
          Use this to spot obvious missingness, duplicate flags, strange grades,
          demographic inconsistencies, or unexpected score patterns. A-numbers
          are intentionally excluded.
        </p>
        <RowTable rows={cleanRows} />
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "48px max(28px, 6vw)",
    background: "#101112",
    color: "#eee8dc",
    fontFamily: "Times New Roman, Times, serif",
  },
  hero: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.7fr) minmax(280px, 0.8fr)",
    gap: "24px",
    alignItems: "start",
    marginBottom: "28px",
  },
  kicker: {
    color: "#c9a56a",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    fontSize: "0.8rem",
    marginBottom: "8px",
  },
  title: {
    margin: 0,
    fontSize: "clamp(2.1rem, 4vw, 4rem)",
    lineHeight: 1,
  },
  lede: {
    maxWidth: "900px",
    fontSize: "1.16rem",
    lineHeight: 1.55,
    color: "#d8d0c0",
  },
  privacyBox: {
    border: "1px solid rgba(201,165,106,0.45)",
    background: "rgba(201,165,106,0.08)",
    padding: "16px",
    borderRadius: "14px",
    lineHeight: 1.45,
    color: "#eadfc9",
  },
  warning: {
    border: "1px solid rgba(255,120,120,0.45)",
    background: "rgba(255,120,120,0.1)",
    padding: "14px 16px",
    borderRadius: "12px",
    marginBottom: "24px",
  },
  gridCards: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "14px",
    marginBottom: "28px",
  },
  miniGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: "14px",
  },
  card: {
    background: "rgba(255,255,255,0.055)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "16px",
    padding: "16px",
    boxShadow: "0 18px 50px rgba(0,0,0,0.22)",
  },
  cardLabel: {
    color: "#c8bda9",
    fontSize: "0.95rem",
    marginBottom: "6px",
  },
  cardValue: {
    fontSize: "2.1rem",
    lineHeight: 1,
    color: "#fff6e8",
  },
  cardSub: {
    color: "#a99f90",
    marginTop: "8px",
    fontSize: "0.9rem",
  },
  section: {
    marginTop: "28px",
    padding: "22px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.11)",
    borderRadius: "18px",
  },
  h2: {
    margin: "0 0 14px",
    fontSize: "1.6rem",
  },
  note: {
    color: "#cfc4b1",
    lineHeight: 1.45,
    marginTop: "-4px",
  },
  tableWrap: {
    overflowX: "auto",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "12px",
  },
  tableWrapTall: {
    overflow: "auto",
    maxHeight: "70vh",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "12px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "760px",
    fontSize: "0.95rem",
  },
  th: {
    textAlign: "left",
    padding: "10px 12px",
    borderBottom: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.07)",
    color: "#f1dfbd",
    whiteSpace: "nowrap",
  },
  thSticky: {
    textAlign: "left",
    padding: "9px 10px",
    borderBottom: "1px solid rgba(255,255,255,0.16)",
    background: "#202020",
    color: "#f1dfbd",
    whiteSpace: "nowrap",
    position: "sticky",
    top: 0,
    zIndex: 1,
  },
  td: {
    padding: "9px 12px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    color: "#e8dfd0",
    whiteSpace: "nowrap",
  },
  tdStrong: {
    padding: "9px 12px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    color: "#fff3dd",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  tdSmall: {
    padding: "7px 10px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    color: "#e8dfd0",
    whiteSpace: "nowrap",
    fontSize: "0.86rem",
  },
  barTrack: {
    width: "130px",
    height: "9px",
    background: "rgba(255,255,255,0.11)",
    borderRadius: "100px",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    background: "linear-gradient(90deg, #b58c4a, #ead7a4)",
    borderRadius: "100px",
  },
  controls: {
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    alignItems: "center",
    marginBottom: "12px",
  },
  search: {
    minWidth: "260px",
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(0,0,0,0.25)",
    color: "#fff",
    fontFamily: "Times New Roman, Times, serif",
    fontSize: "1rem",
  },
  select: {
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.18)",
    background: "#1f1f1f",
    color: "#fff",
    fontFamily: "Times New Roman, Times, serif",
    fontSize: "1rem",
  },
  resultCount: {
    color: "#c8bda9",
  },
  findingGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "14px",
  },
  findingCard: {
    background: "rgba(201,165,106,0.075)",
    border: "1px solid rgba(201,165,106,0.22)",
    borderRadius: "16px",
    padding: "16px",
  },
  findingKind: {
    color: "#c9a56a",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    fontSize: "0.72rem",
    marginBottom: "8px",
  },
  findingTitle: {
    margin: "0 0 8px",
    color: "#fff3dd",
    fontSize: "1.2rem",
    lineHeight: 1.15,
  },
  findingBody: {
    margin: 0,
    color: "#d8d0c0",
    lineHeight: 1.45,
  },
  emptyState: {
    padding: "16px",
    border: "1px dashed rgba(255,255,255,0.25)",
    borderRadius: "12px",
    color: "#c8bda9",
  },
};
