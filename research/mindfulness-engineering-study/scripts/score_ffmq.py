"""
FFMQ scoring helpers for the mindfulness engineering study.

Correct FFMQ 39-item facet map used here:

Observe:
  1, 6, 11, 15, 20, 26, 31, 36

Describe:
  2, 7, 12R, 16R, 22R, 27, 32, 37

Act with Awareness:
  5R, 8R, 13R, 18R, 23R, 28R, 34R, 38R

Nonjudge:
  3R, 10R, 14R, 17R, 25R, 30R, 35R, 39R

Nonreact:
  4, 9, 19, 21, 24, 29, 33

Reverse scoring:

    x_R = 6 - x

For this project, ffmq_total is the mean of the five facet scores.
A separate diagnostic score, ffmq_total_item_mean, is also created.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

import pandas as pd


@dataclass(frozen=True)
class FacetSpec:
    name: str
    items: tuple[int, ...]
    reverse_items: tuple[int, ...]


FACETS: tuple[FacetSpec, ...] = (
    FacetSpec("ffmq_observe", (1, 6, 11, 15, 20, 26, 31, 36), ()),
    FacetSpec("ffmq_describe", (2, 7, 12, 16, 22, 27, 32, 37), (12, 16, 22)),
    FacetSpec("ffmq_act_aware", (5, 8, 13, 18, 23, 28, 34, 38), (5, 8, 13, 18, 23, 28, 34, 38)),
    FacetSpec("ffmq_nonjudge", (3, 10, 14, 17, 25, 30, 35, 39), (3, 10, 14, 17, 25, 30, 35, 39)),
    FacetSpec("ffmq_nonreact", (4, 9, 19, 21, 24, 29, 33), ()),
)


def item_col(item_number: int) -> str:
    return f"ffmq_item_{item_number:02d}"


def scored_item_col(item_number: int) -> str:
    return f"ffmq_scored_{item_number:02d}"


def score_ffmq_items(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()

    reverse_set = {
        item
        for facet in FACETS
        for item in facet.reverse_items
    }

    for item in range(1, 40):
        raw_col = item_col(item)
        scored_col = scored_item_col(item)

        if raw_col not in out.columns:
            raise KeyError(f"Missing FFMQ item column: {raw_col}")

        if item in reverse_set:
            out[scored_col] = 6 - out[raw_col]
        else:
            out[scored_col] = out[raw_col]

    for facet in FACETS:
        cols = [scored_item_col(item) for item in facet.items]
        out[facet.name] = out[cols].mean(axis=1, skipna=False)

    facet_cols = [facet.name for facet in FACETS]
    all_scored = [scored_item_col(item) for item in range(1, 40)]

    out["ffmq_total"] = out[facet_cols].mean(axis=1, skipna=False)
    out["ffmq_total_item_mean"] = out[all_scored].mean(axis=1, skipna=False)

    out["complete_mindfulness"] = out[facet_cols + ["ffmq_total"]].notna().all(axis=1)

    return out


def cronbach_alpha(df: pd.DataFrame, columns: Iterable[str]) -> float:
    item_df = df[list(columns)].dropna()

    n_items = item_df.shape[1]
    n_rows = item_df.shape[0]

    if n_items < 2 or n_rows < 2:
        return float("nan")

    item_variances = item_df.var(axis=0, ddof=1)
    total_variance = item_df.sum(axis=1).var(ddof=1)

    if total_variance == 0:
        return float("nan")

    return float((n_items / (n_items - 1)) * (1 - item_variances.sum() / total_variance))


def reliability_table(df: pd.DataFrame) -> pd.DataFrame:
    rows = []

    for facet in FACETS:
        cols = [scored_item_col(item) for item in facet.items]
        rows.append({
            "scale": facet.name,
            "n_items": len(cols),
            "n_complete": int(df[cols].dropna().shape[0]),
            "cronbach_alpha": cronbach_alpha(df, cols),
        })

    all_cols = [scored_item_col(item) for item in range(1, 40)]
    rows.append({
        "scale": "ffmq_total_all_items",
        "n_items": len(all_cols),
        "n_complete": int(df[all_cols].dropna().shape[0]),
        "cronbach_alpha": cronbach_alpha(df, all_cols),
    })

    return pd.DataFrame(rows)
