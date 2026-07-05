"""
Stronger exploratory analysis for the mindfulness engineering study.

Run from:

    research/mindfulness-engineering-study/

Command:

    python3 scripts/analyze_clean_dataset.py

Inputs:

    data/clean/mindfulness_clean_with_scores.csv

Outputs:

    outputs/private/correlation_matrix.csv
    outputs/private/grade_facet_correlations.csv
    outputs/private/grade_facet_correlations_with_inference.csv
    outputs/private/overall_grade_regression_models.csv
    outputs/private/overall_grade_model_coefficients.csv

    outputs/public/correlation_summary.json
    outputs/public/top_findings.json
"""

from __future__ import annotations

import json
import math
import re
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats


PROJECT_DIR = Path(__file__).resolve().parents[1]

FACET_COLS = [
    "ffmq_observe",
    "ffmq_describe",
    "ffmq_act_aware",
    "ffmq_nonjudge",
    "ffmq_nonreact",
    "ffmq_total",
]

PRIMARY_FACET_COLS = [
    "ffmq_observe",
    "ffmq_describe",
    "ffmq_act_aware",
    "ffmq_nonjudge",
    "ffmq_nonreact",
]

GRADE_COLS = [
    "statics_grade",
    "dynamics_grade",
    "mechanics_grade",
    "overall_grade",
]

LABELS = {
    "ffmq_observe": "Observe",
    "ffmq_describe": "Describe",
    "ffmq_act_aware": "Acting with Awareness",
    "ffmq_nonjudge": "Nonjudging",
    "ffmq_nonreact": "Nonreactivity",
    "ffmq_total": "Total Mindfulness",
    "statics_grade": "Statics",
    "dynamics_grade": "Dynamics",
    "mechanics_grade": "Mechanics of Materials",
    "overall_grade": "Overall Grade",
    "gpa_midpoint": "GPA Category Midpoint",
}


def label(name: str) -> str:
    return LABELS.get(name, name.replace("_", " "))


def parse_gpa_midpoint(value: object) -> float:
    """
    Convert GPA category strings such as '3.5 - 4.0' into a midpoint.

    If a numeric value appears directly, return it.
    If parsing fails, return NaN.
    """
    if pd.isna(value):
        return float("nan")

    if isinstance(value, (int, float)):
        return float(value)

    text = str(value).strip()

    nums = re.findall(r"\d+(?:\.\d+)?", text)

    if len(nums) >= 2:
        return (float(nums[0]) + float(nums[1])) / 2

    if len(nums) == 1:
        return float(nums[0])

    return float("nan")


def pearson_with_inference(df: pd.DataFrame, x_col: str, y_col: str) -> dict:
    sub = df[[x_col, y_col]].dropna()
    n = int(len(sub))

    result = {
        "outcome": y_col,
        "predictor": x_col,
        "n": n,
        "pearson_r": None,
        "r_squared": None,
        "p_value": None,
        "ci95_low": None,
        "ci95_high": None,
    }

    if n < 4:
        return result

    x = sub[x_col].astype(float)
    y = sub[y_col].astype(float)

    r = float(x.corr(y))

    result["pearson_r"] = r
    result["r_squared"] = r * r

    if abs(r) < 1:
        t_value = r * math.sqrt((n - 2) / (1 - r * r))
        p_value = 2 * stats.t.sf(abs(t_value), df=n - 2)
        result["p_value"] = float(p_value)

        fisher_z = math.atanh(r)
        se_z = 1 / math.sqrt(n - 3)
        z_crit = 1.959963984540054

        result["ci95_low"] = float(math.tanh(fisher_z - z_crit * se_z))
        result["ci95_high"] = float(math.tanh(fisher_z + z_crit * se_z))

    return result


def add_gpa_midpoint(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()

    if "gpa_category" in out.columns:
        out["gpa_midpoint"] = out["gpa_category"].apply(parse_gpa_midpoint)
    else:
        out["gpa_midpoint"] = np.nan

    return out


def ols_model(df: pd.DataFrame, outcome: str, predictors: list[str], model_name: str) -> tuple[dict, list[dict]]:
    cols = [outcome] + predictors
    sub = df[cols].dropna()

    n = int(len(sub))
    k = len(predictors)
    df_resid = n - k - 1

    model_summary = {
        "model_name": model_name,
        "outcome": outcome,
        "predictors": " + ".join(predictors),
        "n": n,
        "n_predictors": k,
        "df_resid": df_resid,
        "r_squared": None,
        "adj_r_squared": None,
        "rmse": None,
        "f_statistic": None,
        "f_p_value": None,
    }

    coefficient_rows = []

    if n < k + 3 or df_resid <= 0:
        return model_summary, coefficient_rows

    y = sub[outcome].astype(float).to_numpy()
    x = sub[predictors].astype(float).to_numpy()
    X = np.column_stack([np.ones(n), x])

    beta, *_ = np.linalg.lstsq(X, y, rcond=None)

    y_hat = X @ beta
    resid = y - y_hat

    sse = float(np.sum(resid ** 2))
    sst = float(np.sum((y - np.mean(y)) ** 2))

    if sst == 0:
        return model_summary, coefficient_rows

    r2 = 1 - sse / sst
    adj_r2 = 1 - (1 - r2) * ((n - 1) / df_resid)
    mse = sse / df_resid
    rmse = math.sqrt(mse)

    xtx_inv = np.linalg.pinv(X.T @ X)
    cov_beta = mse * xtx_inv
    se = np.sqrt(np.diag(cov_beta))

    t_values = beta / se
    p_values = 2 * stats.t.sf(np.abs(t_values), df=df_resid)
    t_crit = stats.t.ppf(0.975, df=df_resid)

    # Overall F test against intercept-only model.
    if k > 0 and r2 < 1:
        f_stat = (r2 / k) / ((1 - r2) / df_resid)
        f_p = stats.f.sf(f_stat, k, df_resid)
    else:
        f_stat = None
        f_p = None

    model_summary.update({
        "r_squared": float(r2),
        "adj_r_squared": float(adj_r2),
        "rmse": float(rmse),
        "f_statistic": float(f_stat) if f_stat is not None else None,
        "f_p_value": float(f_p) if f_p is not None else None,
    })

    names = ["Intercept"] + predictors

    # Standardized betas for non-intercept terms.
    y_sd = np.std(y, ddof=1)

    for index, name in enumerate(names):
        if name == "Intercept":
            standardized_beta = None
        else:
            x_sd = np.std(sub[name].astype(float).to_numpy(), ddof=1)
            standardized_beta = float(beta[index] * x_sd / y_sd) if y_sd > 0 else None

        coefficient_rows.append({
            "model_name": model_name,
            "outcome": outcome,
            "term": name,
            "term_label": label(name),
            "beta": float(beta[index]),
            "standard_error": float(se[index]),
            "t_value": float(t_values[index]),
            "p_value": float(p_values[index]),
            "ci95_low": float(beta[index] - t_crit * se[index]),
            "ci95_high": float(beta[index] + t_crit * se[index]),
            "standardized_beta": standardized_beta,
            "n": n,
        })

    return model_summary, coefficient_rows


def build_regressions(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    model_specs = [
        ("overall_total_only", "overall_grade", ["ffmq_total"]),
        ("overall_act_aware_only", "overall_grade", ["ffmq_act_aware"]),
        ("overall_nonjudge_only", "overall_grade", ["ffmq_nonjudge"]),
        ("overall_total_plus_gpa", "overall_grade", ["ffmq_total", "gpa_midpoint"]),
        ("overall_act_aware_plus_gpa", "overall_grade", ["ffmq_act_aware", "gpa_midpoint"]),
        ("overall_nonjudge_plus_gpa", "overall_grade", ["ffmq_nonjudge", "gpa_midpoint"]),
        ("overall_five_facets", "overall_grade", PRIMARY_FACET_COLS),
        ("overall_five_facets_plus_gpa", "overall_grade", PRIMARY_FACET_COLS + ["gpa_midpoint"]),
    ]

    summaries = []
    coefficients = []

    for model_name, outcome, predictors in model_specs:
        available = outcome in df.columns and all(col in df.columns for col in predictors)
        if not available:
            continue

        summary, coef_rows = ols_model(df, outcome, predictors, model_name)
        summaries.append(summary)
        coefficients.extend(coef_rows)

    return pd.DataFrame(summaries), pd.DataFrame(coefficients)


def format_p(p: float | None) -> str:
    if p is None or pd.isna(p):
        return "p unavailable"
    if p < 0.001:
        return "p < .001"
    return f"p = {p:.3f}"


def build_top_findings(corr_df: pd.DataFrame, model_df: pd.DataFrame, coef_df: pd.DataFrame) -> list[dict]:
    findings = []

    overall = corr_df[
        (corr_df["outcome"] == "overall_grade")
        & (corr_df["predictor"] == "ffmq_total")
    ]

    if not overall.empty:
        row = overall.iloc[0]
        findings.append({
            "title": "Total mindfulness is associated with overall grade",
            "body": (
                f"Across n = {int(row['n'])} students, total mindfulness correlates with "
                f"overall grade at r = {row['pearson_r']:.3f} "
                f"({format_p(row['p_value'])})."
            ),
            "kind": "correlation",
            "outcome": "overall_grade",
            "predictor": "ffmq_total",
            "n": int(row["n"]),
            "value": float(row["pearson_r"]),
            "p_value": float(row["p_value"]) if pd.notna(row["p_value"]) else None,
        })

    facet_overall = corr_df[
        (corr_df["outcome"] == "overall_grade")
        & (corr_df["predictor"].isin(PRIMARY_FACET_COLS))
    ].copy()

    if not facet_overall.empty:
        facet_overall["abs_r"] = facet_overall["pearson_r"].abs()
        best = facet_overall.sort_values("abs_r", ascending=False).iloc[0]

        findings.append({
            "title": f"{label(best['predictor'])} is the strongest individual facet",
            "body": (
                f"Among the five mindfulness facets, {label(best['predictor'])} has the "
                f"largest association with overall grade: r = {best['pearson_r']:.3f} "
                f"({format_p(best['p_value'])})."
            ),
            "kind": "correlation",
            "outcome": "overall_grade",
            "predictor": str(best["predictor"]),
            "n": int(best["n"]),
            "value": float(best["pearson_r"]),
            "p_value": float(best["p_value"]) if pd.notna(best["p_value"]) else None,
        })

    dynamics = corr_df[
        (corr_df["outcome"] == "dynamics_grade")
        & (corr_df["predictor"].isin(FACET_COLS))
    ].copy()

    if not dynamics.empty:
        dynamics["abs_r"] = dynamics["pearson_r"].abs()
        best_dyn = dynamics.sort_values("abs_r", ascending=False).iloc[0]

        findings.append({
            "title": "Dynamics shows the clearest course-specific mindfulness signal",
            "body": (
                f"The strongest Dynamics association is with {label(best_dyn['predictor'])}: "
                f"r = {best_dyn['pearson_r']:.3f} across n = {int(best_dyn['n'])}. "
                "Because the course-specific sample is smaller, this should be treated as exploratory."
            ),
            "kind": "course_specific",
            "outcome": "dynamics_grade",
            "predictor": str(best_dyn["predictor"]),
            "n": int(best_dyn["n"]),
            "value": float(best_dyn["pearson_r"]),
            "p_value": float(best_dyn["p_value"]) if pd.notna(best_dyn["p_value"]) else None,
        })

    gpa_model = model_df[model_df["model_name"] == "overall_total_plus_gpa"]

    if not gpa_model.empty:
        model = gpa_model.iloc[0]
        term = coef_df[
            (coef_df["model_name"] == "overall_total_plus_gpa")
            & (coef_df["term"] == "ffmq_total")
        ]

        if not term.empty:
            coef = term.iloc[0]
            findings.append({
                "title": "GPA-controlled model is now available",
                "body": (
                    f"In the model Overall Grade ~ Total Mindfulness + GPA Category Midpoint, "
                    f"the model explains R² = {model['r_squared']:.3f}. "
                    f"The total-mindfulness coefficient is β = {coef['beta']:.3f} "
                    f"({format_p(coef['p_value'])})."
                ),
                "kind": "regression",
                "outcome": "overall_grade",
                "predictor": "ffmq_total + gpa_midpoint",
                "n": int(model["n"]),
                "value": float(model["r_squared"]),
                "p_value": float(coef["p_value"]) if pd.notna(coef["p_value"]) else None,
            })

    findings.append({
        "title": "Interpretation caution",
        "body": (
            "These are associational results. They support the claim that mindfulness traits "
            "are related to performance in this sample; they do not by themselves establish "
            "that mindfulness causes higher grades."
        ),
        "kind": "caution",
        "outcome": None,
        "predictor": None,
        "n": None,
        "value": None,
        "p_value": None,
    })

    return findings


def main() -> None:
    clean_path = PROJECT_DIR / "data" / "clean" / "mindfulness_clean_with_scores.csv"
    private_dir = PROJECT_DIR / "outputs" / "private"
    public_dir = PROJECT_DIR / "outputs" / "public"

    private_dir.mkdir(parents=True, exist_ok=True)
    public_dir.mkdir(parents=True, exist_ok=True)

    if not clean_path.exists():
        raise FileNotFoundError(
            f"Clean dataset not found: {clean_path}\n"
            "Run scripts/build_clean_dataset.py first."
        )

    df = pd.read_csv(clean_path)
    df = add_gpa_midpoint(df)

    analysis_cols = [
        col for col in FACET_COLS + GRADE_COLS
        if col in df.columns
    ]

    corr = df[analysis_cols].corr(method="pearson", min_periods=10)
    corr.to_csv(private_dir / "correlation_matrix.csv")

    basic_rows = []
    inference_rows = []

    for grade_col in GRADE_COLS:
        if grade_col not in df.columns:
            continue

        for facet_col in FACET_COLS:
            if facet_col not in df.columns:
                continue

            result = pearson_with_inference(df, facet_col, grade_col)
            inference_rows.append(result)

            basic_rows.append({
                "outcome": grade_col,
                "predictor": facet_col,
                "n": result["n"],
                "pearson_r": result["pearson_r"],
            })

    basic_corr = pd.DataFrame(basic_rows)
    inference_corr = pd.DataFrame(inference_rows)

    basic_corr.to_csv(private_dir / "grade_facet_correlations.csv", index=False)
    inference_corr.to_csv(
        private_dir / "grade_facet_correlations_with_inference.csv",
        index=False,
    )

    public_corr = inference_corr[inference_corr["n"] >= 10].copy()

    with open(public_dir / "correlation_summary.json", "w", encoding="utf-8") as f:
        json.dump(public_corr.to_dict(orient="records"), f, indent=2)

    model_df, coef_df = build_regressions(df)

    model_df.to_csv(
        private_dir / "overall_grade_regression_models.csv",
        index=False,
    )

    coef_df.to_csv(
        private_dir / "overall_grade_model_coefficients.csv",
        index=False,
    )

    top_findings = build_top_findings(inference_corr, model_df, coef_df)

    with open(public_dir / "top_findings.json", "w", encoding="utf-8") as f:
        json.dump(top_findings, f, indent=2)

    print("Done.")
    print(f"Correlation matrix:                 {private_dir / 'correlation_matrix.csv'}")
    print(f"Basic grade-facet correlations:      {private_dir / 'grade_facet_correlations.csv'}")
    print(f"Inference grade-facet correlations:  {private_dir / 'grade_facet_correlations_with_inference.csv'}")
    print(f"Regression models:                   {private_dir / 'overall_grade_regression_models.csv'}")
    print(f"Regression coefficients:             {private_dir / 'overall_grade_model_coefficients.csv'}")
    print(f"Public correlation JSON:             {public_dir / 'correlation_summary.json'}")
    print(f"Top findings JSON:                   {public_dir / 'top_findings.json'}")

    print()
    print("Top findings:")
    for finding in top_findings:
        print(f"- {finding['title']}: {finding['body']}")


if __name__ == "__main__":
    main()
