"""
Build aggregate-only public presentation data for the mindfulness engineering study.

Run from:

    research/mindfulness-engineering-study/

Command:

    python3 scripts/build_public_page_data.py

Reads local/private analysis outputs and clean data, but writes only aggregate public data:

    outputs/public/presentation_data.json

This file is intended to be safe for the public presentation page.
It does not include A-numbers, student keys, comments, upload metadata, or row-level records.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import pandas as pd


PROJECT_DIR = Path(__file__).resolve().parents[1]

FACET_LABELS = {
    "ffmq_observe": "Observe",
    "ffmq_describe": "Describe",
    "ffmq_act_aware": "Acting with Awareness",
    "ffmq_nonjudge": "Nonjudging",
    "ffmq_nonreact": "Nonreactivity",
    "ffmq_total": "Total Mindfulness",
}

GRADE_LABELS = {
    "statics_grade": "Statics",
    "dynamics_grade": "Dynamics",
    "mechanics_grade": "Mechanics of Materials",
    "overall_grade": "Overall Grade",
}

PRIMARY_FACETS = [
    "ffmq_observe",
    "ffmq_describe",
    "ffmq_act_aware",
    "ffmq_nonjudge",
    "ffmq_nonreact",
    "ffmq_total",
]

COURSE_OUTCOMES = [
    "statics_grade",
    "dynamics_grade",
    "mechanics_grade",
    "overall_grade",
]


def read_json(path: Path, fallback):
    if not path.exists():
        return fallback
    return json.loads(path.read_text(encoding="utf-8"))


def filter_public_top_findings(findings: list[dict]) -> list[dict]:
    """Remove outdated or deprecated public-facing finding cards."""
    blocked_phrases = [
        "gpa-controlled model is now available",
        "gpa category midpoint",
        "total mindfulness + gpa",
        "overall grade ~ total mindfulness + gpa",
    ]

    filtered = []
    for finding in findings:
        combined = " ".join([
            str(finding.get("title", "")),
            str(finding.get("body", "")),
            str(finding.get("kind", "")),
        ]).lower()

        if any(phrase in combined for phrase in blocked_phrases):
            continue

        filtered.append(finding)

    return filtered


def round_or_none(value, digits=4):
    if value is None or pd.isna(value):
        return None
    return round(float(value), digits)


def p_label(p):
    if p is None or pd.isna(p):
        return "p unavailable"
    p = float(p)
    if p < 0.001:
        return "p < .001"
    return f"p = {p:.3f}"


def simple_regression_line(df: pd.DataFrame, x_col: str, y_col: str) -> dict | None:
    sub = df[[x_col, y_col]].dropna()

    if len(sub) < 3:
        return None

    x = sub[x_col].astype(float)
    y = sub[y_col].astype(float)

    x_mean = x.mean()
    y_mean = y.mean()

    denom = ((x - x_mean) ** 2).sum()
    if denom == 0:
        return None

    slope = ((x - x_mean) * (y - y_mean)).sum() / denom
    intercept = y_mean - slope * x_mean

    x_min = x.min()
    x_max = x.max()

    return {
        "slope": round_or_none(slope),
        "intercept": round_or_none(intercept),
        "x_min": round_or_none(x_min),
        "x_max": round_or_none(x_max),
        "y_at_x_min": round_or_none(intercept + slope * x_min),
        "y_at_x_max": round_or_none(intercept + slope * x_max),
    }


def binned_scatter(df: pd.DataFrame, x_col: str, y_col: str, n_bins: int = 6) -> dict:
    """
    Return aggregate binned scatter data.

    This avoids publishing row-level points while preserving the visual relationship.
    """
    sub = df[[x_col, y_col]].dropna().copy()

    result = {
        "x": x_col,
        "y": y_col,
        "x_label": FACET_LABELS.get(x_col, x_col),
        "y_label": GRADE_LABELS.get(y_col, y_col),
        "n": int(len(sub)),
        "bins": [],
        "line": simple_regression_line(df, x_col, y_col),
    }

    if len(sub) < n_bins:
        return result

    # Quantile bins keep the number of students roughly balanced per bin.
    try:
        sub["bin"] = pd.qcut(sub[x_col], q=n_bins, duplicates="drop")
    except ValueError:
        sub["bin"] = pd.cut(sub[x_col], bins=n_bins)

    grouped = sub.groupby("bin", observed=True)

    for interval, group in grouped:
        if group.empty:
            continue

        result["bins"].append({
            "bin_label": str(interval),
            "n": int(len(group)),
            "x_min": round_or_none(group[x_col].min()),
            "x_max": round_or_none(group[x_col].max()),
            "x_mean": round_or_none(group[x_col].mean()),
            "y_mean": round_or_none(group[y_col].mean()),
            "y_sd": round_or_none(group[y_col].std(ddof=1)) if len(group) > 1 else None,
        })

    return result


def build_overall_facet_bars(corr_df: pd.DataFrame) -> list[dict]:
    rows = corr_df[corr_df["outcome"] == "overall_grade"].copy()
    rows = rows[rows["predictor"].isin(PRIMARY_FACETS)]
    rows = rows.sort_values("pearson_r", ascending=False)

    out = []
    for _, row in rows.iterrows():
        out.append({
            "predictor": row["predictor"],
            "label": FACET_LABELS.get(row["predictor"], row["predictor"]),
            "n": int(row["n"]),
            "r": round_or_none(row["pearson_r"]),
            "r_squared": round_or_none(row["r_squared"]),
            "p_value": round_or_none(row["p_value"], 8),
            "p_label": p_label(row["p_value"]),
            "ci95_low": round_or_none(row["ci95_low"]),
            "ci95_high": round_or_none(row["ci95_high"]),
        })

    return out


def build_course_matrix(corr_df: pd.DataFrame) -> list[dict]:
    rows = []

    for outcome in COURSE_OUTCOMES:
        for predictor in PRIMARY_FACETS:
            match = corr_df[
                (corr_df["outcome"] == outcome)
                & (corr_df["predictor"] == predictor)
            ]

            if match.empty:
                continue

            row = match.iloc[0]

            rows.append({
                "outcome": outcome,
                "outcome_label": GRADE_LABELS.get(outcome, outcome),
                "predictor": predictor,
                "predictor_label": FACET_LABELS.get(predictor, predictor),
                "n": int(row["n"]),
                "r": round_or_none(row["pearson_r"]),
                "p_value": round_or_none(row["p_value"], 8),
                "p_label": p_label(row["p_value"]),
            })

    return rows


def build_reliability_summary(reliability_df: pd.DataFrame) -> list[dict]:
    rows = []

    for _, row in reliability_df.iterrows():
        scale = row["scale"]

        if scale == "ffmq_total_all_items":
            label = "Full 39-item scale"
        else:
            label = FACET_LABELS.get(scale, scale)

        alpha = float(row["cronbach_alpha"])

        if alpha >= 0.8:
            interpretation = "strong"
        elif alpha >= 0.7:
            interpretation = "acceptable"
        elif alpha >= 0.6:
            interpretation = "borderline"
        else:
            interpretation = "inspect"

        rows.append({
            "scale": scale,
            "label": label,
            "n_items": int(row["n_items"]),
            "n_complete": int(row["n_complete"]),
            "alpha": round_or_none(alpha, 3),
            "interpretation": interpretation,
        })

    return rows


def build_regression_summary(model_df: pd.DataFrame, coef_df: pd.DataFrame) -> list[dict]:
    model_names = [
        "overall_total_only",
        "overall_act_aware_only",
        "overall_five_facets",
        "overall_five_facets_plus_gpa",
    ]

    rows = []

    for model_name in model_names:
        model_match = model_df[model_df["model_name"] == model_name]
        if model_match.empty:
            continue

        model = model_match.iloc[0]
        terms = coef_df[
            (coef_df["model_name"] == model_name)
            & (coef_df["term"] != "Intercept")
        ].copy()

        rows.append({
            "model_name": model_name,
            "label": model_name.replace("_", " ").title(),
            "n": int(model["n"]),
            "r_squared": round_or_none(model["r_squared"], 3),
            "adj_r_squared": round_or_none(model["adj_r_squared"], 3),
            "f_p_value": round_or_none(model["f_p_value"], 8),
            "f_p_label": p_label(model["f_p_value"]),
            "terms": [
                {
                    "term": term["term"],
                    "label": term["term_label"],
                    "beta": round_or_none(term["beta"], 3),
                    "standardized_beta": round_or_none(term["standardized_beta"], 3),
                    "p_value": round_or_none(term["p_value"], 8),
                    "p_label": p_label(term["p_value"]),
                }
                for _, term in terms.iterrows()
            ],
        })

    return rows


def main() -> None:
    clean_path = PROJECT_DIR / "data" / "clean" / "mindfulness_clean_with_scores.csv"
    public_dir = PROJECT_DIR / "outputs" / "public"
    private_dir = PROJECT_DIR / "outputs" / "private"

    clean = pd.read_csv(clean_path)

    dataset_summary = read_json(public_dir / "dataset_summary.json", {})
    top_findings = filter_public_top_findings(
        read_json(public_dir / "top_findings.json", [])
    )

    corr_df = pd.read_csv(private_dir / "grade_facet_correlations_with_inference.csv")
    reliability_df = pd.read_csv(private_dir / "reliability_report.csv")
    model_df = pd.read_csv(private_dir / "overall_grade_regression_models.csv")
    coef_df = pd.read_csv(private_dir / "overall_grade_model_coefficients.csv")

    presentation = {
        "page_title": "The Role of Emotion Regulation in Mindfulness and Engineering Problem Solving",
        "page_subtitle": (
            "An explanatory sequential mixed-methods study investigating how emotion "
            "regulation helps explain the relationship between mindfulness traits and "
            "problem-solving performance in undergraduate engineering students."
        ),
        "study_design_label": "Explanatory sequential mixed-methods study",
        "dataset_summary": dataset_summary,
        "top_findings": top_findings,
        "research_purpose": (
            "The purpose of this study is to explore the role of emotion regulation in "
            "the relationship among engineering students’ mindfulness traits and "
            "problem-solving performance."
        ),
        "hero_pathway": [
            "Mindfulness traits",
            "Emotion regulation",
            "Problem-solving performance"
        ],
        "research_questions": [
            "What is the relationship between mindfulness traits and problem-solving performance among undergraduate engineering students?",
            "How do undergraduate engineering students with differing levels of mindfulness regulate their emotions during problem-solving activities?",
            "How do differences in emotion regulation help explain the relationship between mindfulness traits and problem-solving performance?"
        ],
        "conceptual_model": {
            "pathway": [
                "Mindfulness traits",
                "Emotion regulation",
                "Problem-solving behavior",
                "Problem-solving performance"
            ],
            "description": (
                "Mindfulness traits may support problem solving by shaping how students notice, "
                "interpret, and regulate achievement emotions such as frustration, anxiety, "
                "confusion, curiosity, and persistence during difficult tasks."
            )
        },
        "mixed_methods_phases": [
            {
                "phase": "Phase 1: Quantitative",
                "label": "Relationship mapping",
                "description": (
                    "Trait mindfulness is measured with the Five Facet Mindfulness Questionnaire. "
                    "Problem-solving performance is represented by structured engineering course "
                    "performance measures. This phase establishes whether statistical relationships exist."
                )
            },
            {
                "phase": "Phase 2: Qualitative",
                "label": "Mechanism explanation",
                "description": (
                    "A purposeful subset of students completes a puzzle-based problem-solving task using "
                    "a think-aloud protocol. These data examine emotional tone, regulation strategies, "
                    "self-talk, cognitive flexibility, and persistence."
                )
            },
            {
                "phase": "Integration",
                "label": "Emotion regulation as the bridge",
                "description": (
                    "Qualitative findings are interpreted in relation to quantitative patterns to explain "
                    "how emotion regulation may clarify the mindfulness–performance relationship."
                )
            }
        ],
        "overall_facet_bars": build_overall_facet_bars(corr_df),
        "course_correlation_matrix": build_course_matrix(corr_df),
        "reliability_summary": build_reliability_summary(reliability_df),
        "regression_summary": build_regression_summary(model_df, coef_df),
        "binned_relationships": [
            binned_scatter(clean, "ffmq_total", "overall_grade", n_bins=6),
            binned_scatter(clean, "ffmq_act_aware", "overall_grade", n_bins=6),
            binned_scatter(clean, "ffmq_nonjudge", "overall_grade", n_bins=6),
        ],
        "methods": {
            "methodology": "Pragmatic research paradigm, using multiple forms of evidence to understand a complex engineering education problem.",
            "design": "Explanatory sequential mixed-methods design: quantitative analysis first, followed by qualitative explanation.",
            "participants": "Undergraduate engineering students at Utah State University.",
            "quantitative_phase": "FFMQ mindfulness trait scores are analyzed alongside structured engineering course performance measures.",
            "qualitative_phase": "Selected students from high- and low-mindfulness groups complete a puzzle-based problem-solving task using a think-aloud protocol.",
            "integration": "Qualitative evidence about emotion regulation is used to explain the quantitative relationship between mindfulness traits and problem-solving performance."
        },
        "qualitative_phase": {
            "title": "Qualitative phase: emotion regulation during problem solving",
            "description": (
                "The qualitative phase examines how students with differing mindfulness traits regulate "
                "their emotions while solving a puzzle-based task. The goal is to observe the process-level "
                "mechanisms behind the quantitative signal."
            ),
            "observed_dimensions": [
                "emotional tone",
                "emotion regulation strategies",
                "self-talk",
                "cognitive flexibility",
                "task persistence",
                "frustration recovery",
                "problem-solving approach"
            ]
        },
        "limitations": [
            "The quantitative results are associational and do not establish causation.",
            "The mixed-methods claim depends on integrating the forthcoming qualitative evidence, not on correlations alone.",
            "Course-specific samples are smaller than the overall-grade sample.",
            "GPA category is a coarse control variable, not a complete measure of prior academic preparation.",
            "The qualitative puzzle-solving phase is needed to interpret emotion-regulation mechanisms behind the quantitative signal.",
        ],
        "privacy_note": (
            "This public presentation uses aggregate/de-identified summaries only. "
            "Raw student records, grade-upload metadata, comments, qualitative transcripts, and private cleaning reports are excluded."
        ),
    }

    output_path = public_dir / "presentation_data.json"
    output_path.write_text(json.dumps(presentation, indent=2), encoding="utf-8")

    print(f"Wrote aggregate presentation data: {output_path}")
    print("Included sections:")
    for key in presentation:
        print(f"  - {key}")


if __name__ == "__main__":
    main()
