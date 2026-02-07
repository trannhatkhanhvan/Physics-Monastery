from __future__ import annotations

import csv
import math
import re
from decimal import Decimal, ROUND_FLOOR, getcontext
from pathlib import Path
from typing import Dict, Any, Optional, Tuple, List

import yaml

from evaluator import evaluate_constant, Quantity, parse_dimension


# ------------------------------------------------------------
# Paths
# ------------------------------------------------------------

HERE = Path(__file__).resolve().parent
ENGINE_ROOT = HERE.parent

SYMBOLS_CSV = ENGINE_ROOT / "symbols" / "symbols.csv"
RECIPES_YAML = ENGINE_ROOT / "recipes" / "constants.yaml"


# ------------------------------------------------------------
# Pretty scientific formatting
# ------------------------------------------------------------

_SUPERS = str.maketrans("0123456789-", "⁰¹²³⁴⁵⁶⁷⁸⁹⁻")


def sci_pretty(x: complex, sig: int = 15) -> str:
    if isinstance(x, complex):
        x = abs(x)
    x = float(x)
    if x == 0.0:
        return "0 × 10^0"
    exp = int(math.floor(math.log10(abs(x))))
    mant = x / (10 ** exp)
    return f"{mant:.{sig}g} × 10^{str(exp).translate(_SUPERS)}"


# ------------------------------------------------------------
# CODATA measured parsing
# Example: 1.66053906892(52)e-27
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


def parse_measured_value(raw: Any) -> Tuple[float, Optional[float], str, int]:
    """
    Returns (value, sigma, pretty, exp)
    """
    if raw is None:
        return (float("nan"), None, "(missing)", 0)

    if isinstance(raw, (int, float)):
        v = float(raw)
        return (v, None, sci_pretty(v), 0)

    s = str(raw).strip()
    m = _CODATA_RE.match(s)
    if not m:
        try:
            v = float(s)
            return (v, None, sci_pretty(v), 0)
        except Exception:
            return (float("nan"), None, s, 0)

    mant_s = m.group("mant")
    unc_s = m.group("unc")
    exp_s = m.group("exp") or m.group("exp2") or m.group("exp3")

    mant = float(mant_s)
    exp = int(exp_s) if exp_s is not None else 0
    value = mant * (10 ** exp)

    sigma = None
    if unc_s is not None:
        decimals = len(mant_s.split(".", 1)[1]) if "." in mant_s else 0
        sigma_mant = int(unc_s) * (10 ** (-decimals))
        sigma = sigma_mant * (10 ** exp)
        pretty = f"{mant_s}({unc_s}) × 10^{str(exp).translate(_SUPERS)}"
    else:
        pretty = sci_pretty(value)

    return (value, sigma, pretty, exp)


# ------------------------------------------------------------
# Exact digit prefix matching (mantissa-based)
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
# IO
# ------------------------------------------------------------

def load_symbols(path: Path) -> Dict[str, Quantity]:
    symbols: Dict[str, Quantity] = {}
    if not path.exists():
        return symbols

    with path.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            token = (row.get("token") or "").strip()
            value_str = (row.get("value") or "").strip()
            dim = (row.get("dimension") or "").strip()
            if token and value_str:
                symbols[token] = Quantity(complex(value_str), parse_dimension(dim))
    return symbols


def load_constants(path: Path) -> List[Dict[str, Any]]:
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    return data.get("constants", [])


# ------------------------------------------------------------
# Main
# ------------------------------------------------------------

def main() -> int:
    symbols = load_symbols(SYMBOLS_CSV)
    constants = load_constants(RECIPES_YAML)

    print(f"Loaded {len(symbols)} symbols from {SYMBOLS_CSV}")
    print(f"Loaded {len(constants)} constants from {RECIPES_YAML}\n")

    ok = 0
    fail = 0

    for c in constants:
        cid = c["constant_id"]
        dim = c.get("dimension", "-")
        kind = (c.get("expected_kind", "measured") or "measured").strip().lower()

        try:
            raw = evaluate_constant(c, symbols, inversion_boundary_token="IB")
            computed_q = raw if isinstance(raw, Quantity) else Quantity(complex(raw), parse_dimension(dim))

            expected = c.get("expected_value")
            if expected is None:
                print(f"{cid:24s} = {sci_pretty(computed_q.value)} {dim}   (no expected)")
                ok += 1
                continue

            # EXACT
            if kind == "exact":
                ref_digits = c.get("expected_digits")
                label = c.get("expected_digits_label", "exact")

                try:
                    ev = float(expected)
                except Exception:
                    ev = None

                if ev is not None:
                    abs_err = abs(abs(computed_q.value) - abs(ev))
                    msg = f"{cid:24s} = {sci_pretty(computed_q.value)} {dim}   expected={sci_pretty(ev)} ({label})   abs_err={sci_pretty(abs_err)}"
                else:
                    msg = f"{cid:24s} = {sci_pretty(computed_q.value)} {dim}   expected={expected} ({label})"

                if ref_digits and ev is not None:
                    comp_digits = computed_mantissa_digits_string(computed_q.value, ref_digits)
                    match_n = digits_match_count(comp_digits, ref_digits)
                    total_n = sum(ch.isdigit() for ch in ref_digits)
                    msg += f"   digits={match_n}/{total_n}"

                print(msg)
                ok += 1
                continue

            # MEASURED
            ev, sigma, ev_pretty, _exp = parse_measured_value(expected)
            abs_err = abs(abs(computed_q.value) - abs(ev))

            if sigma is not None and sigma > 0:
                z = (abs(computed_q.value) - abs(ev)) / sigma
                if abs(z) < 0.0005:
                    z = 0.0
                within = "yes" if abs(z) <= 5 else "no"
                print(
                    f"{cid:24s} = {sci_pretty(computed_q.value)} {dim}   expected={ev_pretty} ({c.get('expected_digits_label','measured')})   "
                    f"abs_err={sci_pretty(abs_err)}   sigma={z:+.2f}   within_5sigma={within}"
                )
            else:
                print(
                    f"{cid:24s} = {sci_pretty(computed_q.value)} {dim}   expected={ev_pretty} ({c.get('expected_digits_label','measured')})   "
                    f"abs_err={sci_pretty(abs_err)}   sigma=(missing)"
                )

            ok += 1

        except Exception as e:
            print(f"{cid:24s} ERROR: {e}")
            fail += 1

    print(f"\nDone. ok={ok} fail={fail}")
    return 0 if fail == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
