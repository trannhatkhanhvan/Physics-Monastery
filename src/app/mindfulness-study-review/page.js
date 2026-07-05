import fs from "fs";
import path from "path";
import ReviewDashboard from "./ReviewDashboard";

export const dynamic = "force-dynamic";

const PROJECT_ROOT = process.cwd();
const STUDY_DIR = path.join(PROJECT_ROOT, "research", "mindfulness-engineering-study");

function readTextIfExists(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

function readJsonIfExists(filePath, fallback) {
  const text = readTextIfExists(filePath);
  if (!text) return fallback;
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function parseCsv(text) {
  if (!text) return [];

  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(value);
      value = "";

      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      continue;
    }

    value += char;
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value);
    if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  }

  if (rows.length === 0) return [];

  const headers = rows[0].map((h) => h.trim());

  return rows.slice(1).map((cells) => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = cells[index] ?? "";
    });
    return obj;
  });
}

function readCsvIfExists(filePath) {
  const text = readTextIfExists(filePath);
  return parseCsv(text);
}

function pickRowFields(row) {
  return {
    source_row_number: row.source_row_number,
    student_key: row.student_key,
    duplicate_status: row.duplicate_status,
    complete_mindfulness: row.complete_mindfulness,
    complete_grade: row.complete_grade,

    age: row.age,
    gender: row.gender,
    race_ethnicity: row.race_ethnicity,
    academic_level: row.academic_level,
    major: row.major,
    gpa_category: row.gpa_category,

    statics_grade: row.statics_grade,
    dynamics_grade: row.dynamics_grade,
    mechanics_grade: row.mechanics_grade,
    overall_grade: row.overall_grade,

    ffmq_observe: row.ffmq_observe,
    ffmq_describe: row.ffmq_describe,
    ffmq_act_aware: row.ffmq_act_aware,
    ffmq_nonjudge: row.ffmq_nonjudge,
    ffmq_nonreact: row.ffmq_nonreact,
    ffmq_total: row.ffmq_total,
  };
}

export default function MindfulnessStudyReviewPage() {
  const publicDir = path.join(STUDY_DIR, "outputs", "public");
  const privateDir = path.join(STUDY_DIR, "outputs", "private");
  const cleanDir = path.join(STUDY_DIR, "data", "clean");

  const datasetSummary = readJsonIfExists(
    path.join(publicDir, "dataset_summary.json"),
    null
  );

  const facetSummary = readJsonIfExists(
    path.join(publicDir, "facet_summary.json"),
    []
  );

  const gradeSummary = readJsonIfExists(
    path.join(publicDir, "grade_summary.json"),
    []
  );

  const correlationSummary = readJsonIfExists(
    path.join(publicDir, "correlation_summary.json"),
    []
  );

  const topFindings = readJsonIfExists(
    path.join(publicDir, "top_findings.json"),
    []
  );

  const reliabilityRows = readCsvIfExists(
    path.join(privateDir, "reliability_report.csv")
  );

  const cleanRows = readCsvIfExists(
    path.join(cleanDir, "mindfulness_clean_with_scores.csv")
  ).map(pickRowFields);

  const duplicateRows = cleanRows.filter(
    (row) => row.duplicate_status === "duplicate_a_number"
  );

  const filesFound = {
    datasetSummary: Boolean(datasetSummary),
    facetSummary: facetSummary.length > 0,
    gradeSummary: gradeSummary.length > 0,
    correlationSummary: correlationSummary.length > 0,
    topFindings: topFindings.length > 0,
    reliabilityRows: reliabilityRows.length > 0,
    cleanRows: cleanRows.length > 0,
  };

  return (
    <ReviewDashboard
      filesFound={filesFound}
      datasetSummary={datasetSummary}
      facetSummary={facetSummary}
      gradeSummary={gradeSummary}
      correlationSummary={correlationSummary}
      topFindings={topFindings}
      reliabilityRows={reliabilityRows}
      cleanRows={cleanRows}
      duplicateRows={duplicateRows}
    />
  );
}
