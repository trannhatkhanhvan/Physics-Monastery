"""
Build a cleaned dataset from CLEANED PUBLIC DATA.xlsx.

Run from:

    research/mindfulness-engineering-study/

Command:

    python3 scripts/build_clean_dataset.py data/raw/CLEANED_PUBLIC_DATA.xlsx

Expected cleaned workbook layout:

    A      NO.
    B      AGE
    C      STATICS
    D      DYNAMICS
    E      MECHANICS OF MATERIAL
    F      GRADE
    G:AS   39 FFMQ items
    AT:BU  upload metadata
    BV:BZ  demographics/context fields
    CA     comments
    CB     qualitative-section interest
    CC:CH  spreadsheet-computed mindfulness scores

Outputs:

    data/clean/mindfulness_clean_with_scores.csv

    outputs/private/invalid_likert_report.csv
    outputs/private/missingness_report.csv
    outputs/private/reliability_report.csv
    outputs/private/workbook_score_comparison.csv
    outputs/private/private_text_fields.csv
    outputs/private/duplicate_report.csv

    outputs/public/dataset_summary.json
    outputs/public/facet_summary.json
    outputs/public/grade_summary.json
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd

from score_ffmq import FACETS, item_col, reliability_table, score_ffmq_items


PROJECT_DIR = Path(__file__).resolve().parents[1]


def normalize_header(value: object) -> str:
    return str(value).strip().lower().replace("\n", " ").replace("  ", " ")


def find_column_by_terms(raw: pd.DataFrame, terms: list[str]) -> str | None:
    normalized = {normalize_header(col): col for col in raw.columns}

    for norm, original in normalized.items():
        if all(term.lower() in norm for term in terms):
            return original

    return None


def read_raw(path: Path) -> pd.DataFrame:
    return pd.read_excel(path, sheet_name=0, dtype=object)


def normalize_missing_values(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()

    text_missing = {
        "",
        " ",
        "NA",
        "N/A",
        "na",
        "n/a",
        "null",
        "None",
        "none",
        "nan",
        "NaN",
    }

    for col in out.columns:
        out[col] = out[col].apply(
            lambda x: np.nan if isinstance(x, str) and x.strip() in text_missing else x
        )

    return out


def standardize_cleaned_public_workbook(raw: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Convert the cleaned public workbook into the canonical analysis format.

    Returns:
        clean dataframe,
        private text/meta dataframe
    """
    out = pd.DataFrame(index=raw.index)

    # Fixed positions in the cleaned public file.
    out["source_record_no"] = raw.iloc[:, 0]
    out["age"] = raw.iloc[:, 1]
    out["statics_grade"] = raw.iloc[:, 2]
    out["dynamics_grade"] = raw.iloc[:, 3]
    out["mechanics_grade"] = raw.iloc[:, 4]
    out["overall_grade"] = raw.iloc[:, 5]

    # FFMQ item 1 starts in G, zero-indexed position 6.
    for item_number in range(1, 40):
        position = 5 + item_number
        out[item_col(item_number)] = raw.iloc[:, position]

    # Demographic/context block.
    out["gender"] = raw.iloc[:, 73] if raw.shape[1] > 73 else np.nan
    out["race_ethnicity"] = raw.iloc[:, 74] if raw.shape[1] > 74 else np.nan
    out["academic_level"] = raw.iloc[:, 75] if raw.shape[1] > 75 else np.nan
    out["major"] = raw.iloc[:, 76] if raw.shape[1] > 76 else np.nan
    out["gpa_category"] = raw.iloc[:, 77] if raw.shape[1] > 77 else np.nan

    out["source_row_number"] = np.arange(2, len(out) + 2)
    out["student_key"] = [
        f"stu_{int(i):03d}" if pd.notna(i) else f"stu_row_{row:03d}"
        for i, row in zip(out["source_record_no"], out["source_row_number"])
    ]

    private = pd.DataFrame(index=raw.index)
    private["source_record_no"] = out["source_record_no"]
    private["student_key"] = out["student_key"]
    private["source_row_number"] = out["source_row_number"]

    # Upload metadata is private. Preserve it for local audit only.
    upload_start = 45
    upload_end_exclusive = 73
    for position in range(upload_start, min(upload_end_exclusive, raw.shape[1])):
        private[f"upload_meta_col_{position + 1}"] = raw.iloc[:, position]

    private["comments"] = raw.iloc[:, 78] if raw.shape[1] > 78 else np.nan
    private["qualitative_interest"] = raw.iloc[:, 79] if raw.shape[1] > 79 else np.nan

    # Workbook-computed mindfulness scores, if present.
    workbook_score_names = [
        "workbook_ffmq_observe",
        "workbook_ffmq_describe",
        "workbook_ffmq_act_aware",
        "workbook_ffmq_nonjudge",
        "workbook_ffmq_nonreact",
        "workbook_ffmq_total",
    ]

    for offset, name in enumerate(workbook_score_names):
        position = 80 + offset
        if raw.shape[1] > position:
            out[name] = raw.iloc[:, position]

    return out, private


def coerce_numeric(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()

    numeric_cols = [
        "source_record_no",
        "statics_grade",
        "dynamics_grade",
        "mechanics_grade",
        "overall_grade",
    ] + [item_col(i) for i in range(1, 40)]

    workbook_score_cols = [
        "workbook_ffmq_observe",
        "workbook_ffmq_describe",
        "workbook_ffmq_act_aware",
        "workbook_ffmq_nonjudge",
        "workbook_ffmq_nonreact",
        "workbook_ffmq_total",
    ]

    numeric_cols += [col for col in workbook_score_cols if col in out.columns]

    for col in numeric_cols:
        if col in out.columns:
            out[col] = pd.to_numeric(out[col], errors="coerce")

    return out


def add_quality_flags(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()

    out["duplicate_status"] = "not_applicable_cleaned_public_file"

    grade_cols = [
        "statics_grade",
        "dynamics_grade",
        "mechanics_grade",
        "overall_grade",
    ]

    out["complete_grade"] = out[grade_cols].notna().any(axis=1)

    return out


def invalid_likert_report(df: pd.DataFrame) -> pd.DataFrame:
    rows = []

    for item_number in range(1, 40):
        col = item_col(item_number)
        invalid = df[df[col].notna() & ~df[col].between(1, 5)]

        for _, row in invalid.iterrows():
            rows.append({
                "source_row_number": int(row["source_row_number"]),
                "source_record_no": row.get("source_record_no"),
                "student_key": row.get("student_key"),
                "item": col,
                "value": row[col],
            })

    return pd.DataFrame(rows)


def workbook_score_comparison(df: pd.DataFrame) -> pd.DataFrame:
    pairs = [
        ("ffmq_observe", "workbook_ffmq_observe"),
        ("ffmq_describe", "workbook_ffmq_describe"),
        ("ffmq_act_aware", "workbook_ffmq_act_aware"),
        ("ffmq_nonjudge", "workbook_ffmq_nonjudge"),
        ("ffmq_nonreact", "workbook_ffmq_nonreact"),
        ("ffmq_total", "workbook_ffmq_total"),
    ]

    rows = []

    for computed, workbook in pairs:
        if workbook not in df.columns:
            continue

        sub = df[[computed, workbook]].dropna()
        diff = sub[computed] - sub[workbook]

        rows.append({
            "computed_score": computed,
            "workbook_score": workbook,
            "n_compared": int(len(sub)),
            "mean_abs_difference": float(diff.abs().mean()) if len(sub) else None,
            "max_abs_difference": float(diff.abs().max()) if len(sub) else None,
            "matches_within_1e_9": bool((diff.abs() < 1e-9).all()) if len(sub) else None,
        })

    return pd.DataFrame(rows)


def duplicate_report(df: pd.DataFrame) -> pd.DataFrame:
    # The cleaned public workbook removed A-numbers, so automatic ID duplicate detection is not available.
    return pd.DataFrame(columns=[
        "source_row_number",
        "source_record_no",
        "student_key",
        "duplicate_status",
        "note",
    ])


def numeric_summary(df: pd.DataFrame, columns: list[str]) -> pd.DataFrame:
    rows = []

    for col in columns:
        if col not in df.columns:
            continue

        s = pd.to_numeric(df[col], errors="coerce").dropna()

        if s.empty:
            continue

        rows.append({
            "variable": col,
            "n": int(s.shape[0]),
            "mean": float(s.mean()),
            "sd": float(s.std(ddof=1)),
            "min": float(s.min()),
            "q25": float(s.quantile(0.25)),
            "median": float(s.median()),
            "q75": float(s.quantile(0.75)),
            "max": float(s.max()),
        })

    return pd.DataFrame(rows)


def public_dataset_summary(df: pd.DataFrame) -> dict:
    grade_cols = [
        "statics_grade",
        "dynamics_grade",
        "mechanics_grade",
        "overall_grade",
    ]

    facet_cols = [facet.name for facet in FACETS] + ["ffmq_total"]

    return {
        "source_file_type": "cleaned_public_workbook",
        "n_rows_cleaned": int(len(df)),
        "n_complete_mindfulness": int(df["complete_mindfulness"].sum()),
        "n_any_grade": int(df["complete_grade"].sum()),
        "n_duplicate_flagged_rows": int((df["duplicate_status"] == "duplicate_a_number").sum()),
        "grade_counts": {
            col: int(df[col].notna().sum())
            for col in grade_cols
        },
        "mindfulness_score_counts": {
            col: int(df[col].notna().sum())
            for col in facet_cols
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("raw_workbook", type=Path)
    args = parser.parse_args()

    raw_path = args.raw_workbook

    if not raw_path.exists():
        raise FileNotFoundError(f"Workbook not found: {raw_path}")

    clean_dir = PROJECT_DIR / "data" / "clean"
    private_dir = PROJECT_DIR / "outputs" / "private"
    public_dir = PROJECT_DIR / "outputs" / "public"

    clean_dir.mkdir(parents=True, exist_ok=True)
    private_dir.mkdir(parents=True, exist_ok=True)
    public_dir.mkdir(parents=True, exist_ok=True)

    raw = read_raw(raw_path)
    raw = normalize_missing_values(raw)

    clean, private_text = standardize_cleaned_public_workbook(raw)
    clean = normalize_missing_values(clean)
    clean = coerce_numeric(clean)

    invalid_likert_report(clean).to_csv(
        private_dir / "invalid_likert_report.csv",
        index=False,
    )

    clean = score_ffmq_items(clean)
    clean = add_quality_flags(clean)

    reliability_table(clean).to_csv(
        private_dir / "reliability_report.csv",
        index=False,
    )

    workbook_score_comparison(clean).to_csv(
        private_dir / "workbook_score_comparison.csv",
        index=False,
    )

    duplicate_report(clean).to_csv(
        private_dir / "duplicate_report.csv",
        index=False,
    )

    private_text.to_csv(
        private_dir / "private_text_fields.csv",
        index=False,
    )

    missingness = pd.DataFrame({
        "variable": clean.columns,
        "n_missing": [int(clean[col].isna().sum()) for col in clean.columns],
        "pct_missing": [float(clean[col].isna().mean()) for col in clean.columns],
    })

    missingness.to_csv(
        private_dir / "missingness_report.csv",
        index=False,
    )

    # Remove workbook-computed scores from the main clean export.
    # We keep our recomputed scores as the authoritative analysis scores.
    export = clean.drop(
        columns=[
            col for col in clean.columns
            if col.startswith("workbook_ffmq_")
        ],
        errors="ignore",
    )

    export.to_csv(
        clean_dir / "mindfulness_clean_with_scores.csv",
        index=False,
    )

    summary = public_dataset_summary(clean)

    with open(public_dir / "dataset_summary.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    facet_cols = [facet.name for facet in FACETS] + ["ffmq_total", "ffmq_total_item_mean"]
    numeric_summary(clean, facet_cols).to_json(
        public_dir / "facet_summary.json",
        orient="records",
        indent=2,
    )

    grade_cols = [
        "statics_grade",
        "dynamics_grade",
        "mechanics_grade",
        "overall_grade",
    ]

    numeric_summary(clean, grade_cols).to_json(
        public_dir / "grade_summary.json",
        orient="records",
        indent=2,
    )

    print("Done.")
    print(f"Clean row-level dataset: {clean_dir / 'mindfulness_clean_with_scores.csv'}")
    print(f"Private reports:          {private_dir}")
    print(f"Public summaries:         {public_dir}")
    print()
    print("Key counts:")
    print(json.dumps(summary, indent=2))

    comparison = workbook_score_comparison(clean)
    if not comparison.empty:
        print()
        print("Workbook score comparison:")
        print(comparison.to_string(index=False))


if __name__ == "__main__":
    main()
