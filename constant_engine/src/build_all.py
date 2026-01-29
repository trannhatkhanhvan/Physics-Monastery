from __future__ import annotations

import csv
import math
import re
import yaml
from decimal import Decimal, ROUND_FLOOR, getcontext
from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional

from evaluator import evaluate_constant, Quantity, parse_dimension


# ------------------------------------------------------------
# Paths
# ------------------------------------------------------------

HERE = Path(__file__).resolve().parent
ENGINE_ROOT = HERE.parent

SYMBOLS_CSV = ENGINE_ROOT / "symbols" / "symbols.csv"
GENERATED_SYMBOLS_CSV = ENGINE_ROOT / "symbols" / "generated_symbols.csv"
RECIPES_YAML = ENGINE_ROOT / "recipes" / "constants.yaml"


# ------------------------------------------------------------
# Terminal colors
# ------------------------------------------------------------

GREEN = "\033[92m"
ORANGE = "\033[38;5;214m"
RED = "\033[91m"
RESET = "\033[0m"


# ------------------------------------------------------------
# Formatting: ALWAYS scientific notation for display
# ------------------------------------------------------------

_SUPERS = str.maketrans("0123456789-", "⁰¹²³⁴⁵⁶⁷⁸⁹⁻")


def sci_pretty(x: complex, sig: int = 15) -> str:
    """
    Pretty scientific notation: mantissa × 10^exponent
    - For complex values: uses magnitude (abs).
    - For zero: 0 × 10^0
    """
    if isinstance(x, complex):
        x = abs(x)

    x = float(x)
    if x == 0.0:
        return "0 × 10^0"

    exp = int(math.floor(math.log10(abs(x))))
    mant = x / (10 ** exp)
    mant_s = f"{mant:.{sig}g}"
    return f"{mant_s} × 10^{str(exp).translate(_SUPERS)}"


def sci_csv(x: complex, sig: int = 15) -> str:
    """
    Scientific notation string that stays parseable by complex().
    Real:    2.99792458097898130e+08
    Complex: (a+bi) with a,b in scientific notation
    """
    if isinstance(x, complex):
        a = float(x.real)
        b = float(x.imag)
        if b == 0.0:
            return f"{a:.{sig}e}"
        sign = "+" if b >= 0 else "-"
        return f"({a:.{sig}e}{sign}{abs(b):.{sig}e}j)"
    return f"{float(x):.{sig}e}"


# ------------------------------------------------------------
# Parsing CODATA-style "measured" strings
# Example: 3.1577502480398(34)e5
# meaning: (3.1577502480398 ± 0.0000000000034) × 10^5
# ------------------------------------------------------------

_CODATA_RE = re.compile(
    r"""
    ^\s*
    (?P<mant>[+-]?\d+(?:\.\d+)?)
    (?:\((?P<unc>\d+)\))?
    (?:
        [eE](?P<exp>[+-]?\d+)
      | [dD](?P<exp2>[+-]?\d+)
      | \s*E(?P<exp3>[+-]?\d+)
    )?
    \s*$
    """,
    re.VERBOSE,
)

# For dependency display (these are evaluated in evaluator.py, not required as symbols)
_SUBFACT_CALL_RE = re.compile(r"^\s*subfact\(\s*(\d+)\s*\)\s*$")
_BANG_SUBFACT_RE = re.compile(r"^\s*!\s*(\d+)\s*$")
_ZETA_CALL_RE = re.compile(r"^\s*zeta\(\s*[+-]?\d+\s*\)\s*$")

# Expression token like "(4*C_Cf + 6*2pi)" or "5*18" — evaluator handles it, not symbols.csv
# We treat anything containing arithmetic operators or parentheses as an expression token.
_EXPR_TOKEN_RE = re.compile(r"[()+\-*/^]")


def parse_measured_value(raw: Any) -> Tuple[float, Optional[float], str, Optional[float], Optional[int], Optional[int]]:
    """
    Returns:
      (value, sigma, pretty_with_unc, mant, unc_int, exp)

    - pretty_with_unc preserves CODATA uncertainty if present, using:
        mantissa(unc) × 10^exp
    - sigma is returned in absolute units (same dimension as value)
    """
    if raw is None:
        return (float("nan"), None, "(missing)", None, None, None)

    # Plain numeric: no uncertainty
    if isinstance(raw, (int, float)):
        v = float(raw)
        return (v, None, sci_pretty(v), None, None, 0)

    s = str(raw).strip()
    m = _CODATA_RE.match(s)
    if not m:
        # Fallback: try float
        try:
            v = float(s)
            return (v, None, sci_pretty(v), None, None, 0)
        except Exception:
            return (float("nan"), None, s, None, None, None)

    mant_s = m.group("mant")
    unc_s = m.group("unc")
    exp_s = m.group("exp") or m.group("exp2") or m.group("exp3")

    mant = float(mant_s)
    exp = int(exp_s) if exp_s is not None else 0
    value = mant * (10 ** exp)

    sigma = None
    unc_int = None

    if unc_s is not None:
        unc_int = int(unc_s)

        if "." in mant_s:
            decimals = len(mant_s.split(".", 1)[1])
        else:
            decimals = 0

        sigma_mant = unc_int * (10 ** (-decimals))
        sigma = sigma_mant * (10 ** exp)

        pretty = f"{mant_s}({unc_s}) × 10^{str(exp).translate(_SUPERS)}"
    else:
        pretty = sci_pretty(value)

    return (value, sigma, pretty, mant, unc_int, exp)


# ------------------------------------------------------------
# Digits matching for exact constants
# ------------------------------------------------------------

def digits_match_count(a: str, b: str) -> int:
    a_digits = [ch for ch in a if ch.isdigit()]
    b_digits = [ch for ch in b if ch.isdigit()]
    n = min(len(a_digits), len(b_digits))
    count = 0
    for i in range(n):
        if a_digits[i] == b_digits[i]:
            count += 1
        else:
            break
    return count


def computed_mantissa_digits_string(x: complex, ref_digits: str) -> str:
    """
    Mantissa-style digit string:
    - Convert x to scientific mantissa in [1,10)
    - Take first N digits of that mantissa (N = digits in ref_digits)
    IMPORTANT: prefix check => TRUNCATE (floor), not round.
    """
    if isinstance(x, complex):
        x = abs(x)

    ref_len = sum(ch.isdigit() for ch in ref_digits)
    if ref_len <= 0:
        return ""

    x = float(x)
    if x == 0.0:
        return "0" * ref_len

    exp10 = int(math.floor(math.log10(abs(x))))

    getcontext().prec = ref_len + 40
    x_dec = Decimal(str(abs(x)))
    mant_dec = x_dec / (Decimal(10) ** exp10)  # in [1,10)

    scale = Decimal(10) ** (ref_len - 1)
    digits_int = int((mant_dec * scale).to_integral_value(rounding=ROUND_FLOOR))

    return str(digits_int).zfill(ref_len)[:ref_len]


# ------------------------------------------------------------
# Dependencies (tokens)
# ------------------------------------------------------------

def collect_dependencies(recipe: Dict[str, Any]) -> Tuple[List[str], List[str]]:
    """
    Returns:
      (deps_display, deps_required_tokens)

    deps_display:
      - list shown to user
      - includes function-like tokens (zeta(...), subfact(...), !n)
    deps_required_tokens:
      - what must exist in `symbols` to build the constant
      - excludes function-like tokens that evaluator.py computes directly
    """
    display_set: set[str] = set()
    required_set: set[str] = set()

    def add_map(m: Any):
        if m is None or not isinstance(m, dict):
            return

        for tok in m.keys():
            if isinstance(tok, (int, float)):
                continue

            tok_s = str(tok).strip()

            if _ZETA_CALL_RE.match(tok_s):
                display_set.add(tok_s)
                continue

            if _SUBFACT_CALL_RE.match(tok_s) or _BANG_SUBFACT_RE.match(tok_s):
                display_set.add(tok_s)
                continue

            # Expression tokens are evaluated in evaluator.py; don't show them in deps
            if _EXPR_TOKEN_RE.match(tok_s):
                continue

            display_set.add(tok_s)
            required_set.add(tok_s)

    add_map(recipe["external_geometry"]["numerator"])
    add_map(recipe["external_geometry"]["denominator"])
    add_map(recipe["external_boundary"]["numerator"])
    add_map(recipe["external_boundary"]["denominator"])
    add_map(recipe["inversion_geometry"]["numerator"])
    add_map(recipe["inversion_geometry"]["denominator"])

    # Fixed inversion boundary token
    display_set.add("IB")
    required_set.add("IB")

    # Root transform token(s)
    rt = recipe["root_transform"]["id"]

    DERIVED_EXPAND = {
        "zhe_1_minus_zhe_2": ["zhe_1", "zhe_2"],
    }

    if rt in DERIVED_EXPAND:
        for t in DERIVED_EXPAND[rt]:
            display_set.add(t)
            required_set.add(t)
    else:
        display_set.add(rt)
        required_set.add(rt)

    # Preferred ordering
    preferred = ["l_p", "t_p", "q_p", "T_p", "m_p", "G_Gi"]
    display_ordered = [t for t in preferred if t in display_set]
    remaining = sorted(t for t in display_set if t not in preferred and t != "IB")
    display_ordered += remaining + ["IB"]

    required_ordered = [t for t in preferred if t in required_set]
    required_remaining = sorted(t for t in required_set if t not in preferred and t != "IB")
    required_ordered += required_remaining + ["IB"]

    return display_ordered, required_ordered


# ------------------------------------------------------------
# Verification report per constant
# ------------------------------------------------------------

def verify_and_format(recipe: Dict[str, Any], computed: Quantity) -> List[str]:
    lines: List[str] = []

    dim = recipe.get("dimension", "-")
    lines.append(f"computed: {sci_pretty(computed.value)} {dim}")

    expected_kind = recipe.get("expected_kind", "measured")
    expected_value = recipe.get("expected_value")

    if expected_value is None:
        lines.append("expected: (missing)")
        return lines

    if expected_kind == "exact":
        label = recipe.get("expected_digits_label", "exact")
        ref_digits = recipe.get("expected_digits")

        # Display expected
        try:
            ev = float(expected_value)
            lines.append(f"expected: {sci_pretty(ev)} {dim}   ({label})")
        except Exception:
            ev = None
            lines.append(f"expected: {expected_value} {dim}   ({label})")

        if ref_digits and ev is not None:
            comp_digits = computed_mantissa_digits_string(computed.value, ref_digits)
            match_n = digits_match_count(comp_digits, ref_digits)
            total_n = sum(ch.isdigit() for ch in ref_digits)

            if match_n == total_n:
                lines.append(f"digits:   {GREEN}full match{RESET} ({match_n}/{total_n})")
            elif match_n == total_n - 1:
                lines.append(f"digits:   {ORANGE}almost-full match{RESET} ({match_n}/{total_n})")
            else:
                lines.append(f"digits:   {RED}not a match{RESET} ({match_n}/{total_n})")

        else:
            if ev is not None:
                abs_err = abs(abs(computed.value) - abs(ev))
                lines.append(f"abs err:  {sci_pretty(abs_err)}")
            else:
                lines.append("abs err:  (unavailable)")

        return lines

    # measured
    codata_label = recipe.get("expected_digits_label", "measured")
    ev, sigma, ev_pretty, _, _, exp = parse_measured_value(expected_value)

    lines.append(f"expected: {ev_pretty} {dim}   ({codata_label})")

    signed_err = abs(computed.value) - abs(ev)
    abs_err = abs(signed_err)

    scaled_err = abs_err / (10 ** exp)

    ABS_ERR_DECIMALS = 14
    mantissa_str = f"{scaled_err:.{ABS_ERR_DECIMALS}f}".rstrip("0").rstrip(".")
    lines.append(f"abs err:  {mantissa_str} × 10^{str(exp).translate(_SUPERS)} {dim}")

    if sigma is not None and sigma > 0:
        z = signed_err / sigma
        if abs(z) < 0.0005:
            z = 0.0
        lines.append(f"sigma:    {z:+.2f}")

        lines.append(f"within 5σ: {GREEN}yes{RESET}" if abs(z) <= 5 else f"within 5σ: {RED}no{RESET}")
    else:
        lines.append("sigma:    (missing)")
        lines.append("within 5σ: (missing)")

    return lines


# ------------------------------------------------------------
# Pass/fail classification for summary
# ------------------------------------------------------------

def constant_passes(recipe: Dict[str, Any], computed: Quantity) -> bool:
    """
    Passing criteria (for summary counts):
      - exact: full match OR almost-full match  (digits match count >= total-1)
      - measured: within 5σ: yes               (abs(z) <= 5)
    All else fails.
    """
    expected_kind = (recipe.get("expected_kind", "measured") or "measured").strip().lower()
    expected_value = recipe.get("expected_value")

    if expected_value is None:
        return False

    if expected_kind == "exact":
        ref_digits = recipe.get("expected_digits")
        try:
            ev = float(expected_value)
        except Exception:
            return False

        if not ref_digits:
            return False

        comp_digits = computed_mantissa_digits_string(computed.value, ref_digits)
        match_n = digits_match_count(comp_digits, ref_digits)
        total_n = sum(ch.isdigit() for ch in ref_digits)
        if total_n <= 0:
            return False
        return match_n >= (total_n - 1)

    # measured
    ev, sigma, _, _, _, _ = parse_measured_value(expected_value)
    if sigma is None or sigma <= 0 or math.isnan(ev):
        return False

    signed_err = abs(computed.value) - abs(ev)
    z = signed_err / sigma
    if abs(z) < 0.0005:
        z = 0.0
    return abs(z) <= 5


# ------------------------------------------------------------
# CSV IO
# ------------------------------------------------------------

def load_symbols(path: Path) -> Dict[str, Quantity]:
    symbols: Dict[str, Quantity] = {}
    if not path.exists():
        return symbols

    with path.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            token = (row.get("token") or "").strip()
            value = (row.get("value") or "").strip()
            dim = (row.get("dimension") or "").strip()
            if token and value:
                symbols[token] = Quantity(complex(value), parse_dimension(dim))
    return symbols


def load_recipes(path: Path) -> List[Dict[str, Any]]:
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    return data.get("constants", [])


def reset_generated_symbols_file() -> None:
    GENERATED_SYMBOLS_CSV.parent.mkdir(parents=True, exist_ok=True)
    with GENERATED_SYMBOLS_CSV.open("w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["token", "value", "dimension"])


def append_generated_symbols(rows: List[Tuple[str, Quantity, str]]) -> None:
    with GENERATED_SYMBOLS_CSV.open("a", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        for token, q, dim in rows:
            writer.writerow([token, sci_csv(q.value), dim or "-"])


# ------------------------------------------------------------
# Build loop
# ------------------------------------------------------------

def main() -> None:
    base_symbols = load_symbols(SYMBOLS_CSV)
    symbols: Dict[str, Quantity] = dict(base_symbols)

    recipes = load_recipes(RECIPES_YAML)
    recipe_by_id: Dict[str, Dict[str, Any]] = {r["constant_id"]: r for r in recipes}

    reset_generated_symbols_file()

    unresolved = {r["constant_id"] for r in recipes}
    pass_number = 0
    total_built = 0

    # Summary counters (built)
    built_exact = 0
    built_measured = 0
    passed_exact = 0
    failed_exact = 0
    passed_measured = 0
    failed_measured = 0

    while True:
        pass_number += 1
        built_this_pass: List[Tuple[str, Quantity, str]] = []
        blocked: Dict[str, List[str]] = {}

        print(f"\n=== Build pass {pass_number} ===")

        for recipe in recipes:
            cid = recipe["constant_id"]

            if cid in symbols:
                unresolved.discard(cid)
                continue

            _, deps_required = collect_dependencies(recipe)
            missing = [t for t in deps_required if t not in symbols]

            if missing:
                blocked[cid] = missing
                continue

            try:
                raw_value = evaluate_constant(recipe, symbols, inversion_boundary_token="IB")
                if isinstance(raw_value, Quantity):
                    value_q = raw_value
                else:
                    dim = recipe.get("dimension", "-")
                    value_q = Quantity(complex(raw_value), parse_dimension(dim))
            except Exception as e:
                print(f"ERROR building {cid}: {e}")
                continue

            dim = recipe.get("dimension", "-")
            built_this_pass.append((cid, value_q, dim))
            symbols[cid] = value_q
            unresolved.discard(cid)

            # Summary accounting (ONE per built constant)
            total_built += 1
            kind = (recipe.get("expected_kind", "measured") or "measured").strip().lower()
            ok = constant_passes(recipe, value_q)

            if kind == "exact":
                built_exact += 1
                if ok:
                    passed_exact += 1
                else:
                    failed_exact += 1
            else:
                built_measured += 1
                if ok:
                    passed_measured += 1
                else:
                    failed_measured += 1

        if not built_this_pass:
            # Unresolved-by-kind (counts as "failed" in your requested summary)
            unresolved_exact = 0
            unresolved_measured = 0
            for cid in unresolved:
                r = recipe_by_id.get(cid, {})
                k = (r.get("expected_kind", "measured") or "measured").strip().lower()
                if k == "exact":
                    unresolved_exact += 1
                else:
                    unresolved_measured += 1

            total_exact = built_exact + unresolved_exact
            total_measured = built_measured + unresolved_measured

            failed_exact_total = failed_exact + unresolved_exact
            failed_measured_total = failed_measured + unresolved_measured

            print(f"\n{total_built} constants built.")
            print(f"   {total_exact} exact, {GREEN}{passed_exact} passed{RESET}, {ORANGE}{failed_exact_total} failed{RESET}")
            print(f"   {total_measured} measured, {GREEN}{passed_measured} passed{RESET}, {ORANGE}{failed_measured_total} failed{RESET}")

            print("\nNo further constants can be built.")

            if unresolved:
                print("\nUnresolved constants:")
                for cid in sorted(unresolved):
                    missing = blocked.get(cid, [])
                    if missing:
                        print(f"  {cid}: missing {', '.join(missing)}")
                    else:
                        print(f"  {cid}: missing (unknown)")
            break

        print("\nBuilt this pass:")
        for cid, value, dim in built_this_pass:
            recipe = recipe_by_id[cid]
            name = recipe.get("display_name", cid)
            deps_display, _ = collect_dependencies(recipe)

            print(f"\n{cid}  —  {name}")
            print(f"deps: {', '.join(deps_display)}")
            for line in verify_and_format(recipe, value):
                print(line)

        append_generated_symbols(built_this_pass)

    print("\nBuild complete.")


if __name__ == "__main__":
    main()