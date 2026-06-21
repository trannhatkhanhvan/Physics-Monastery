from __future__ import annotations

import csv
import math
import re
import yaml
import sys
from decimal import Decimal, ROUND_FLOOR, getcontext
from pathlib import Path
from typing import Dict, Any, List, Tuple
from collections.abc import Mapping

import mpmath as mp

from evaluator import evaluate_constant, Quantity, parse_dimension


# ------------------------------------------------------------
# Precision
# ------------------------------------------------------------
mp.mp.dps = 180
PRINT_DIGITS = 15
CSV_DIGITS = 120


def require_effectively_real(
    cid: str,
    x: Any,
    *,
    abs_tol: float = 1e-15,
    rel_tol: float = 1e-18,
) -> Any:
    """
    Treat tiny imaginary parts as numerical residue and drop them.
    Raise only when the imaginary part is meaningfully nonzero.

    - abs_tol handles near-zero values
    - rel_tol handles scaling with magnitude
    """
    # mpmath complex
    if isinstance(x, mp.mpc):
        scale = max(mp.mpf("1.0"), abs(x.real))
        thresh = max(mp.mpf(abs_tol), mp.mpf(rel_tol) * scale)
        if abs(x.imag) <= thresh:
            return x.real
        raise ValueError(
            f"{cid} produced a non-real value "
            f"(imag={mp.nstr(x.imag, 20)}, thresh={mp.nstr(thresh, 20)}): {x!r}"
        )

    # python complex
    if isinstance(x, complex):
        scale = max(1.0, abs(x.real))
        thresh = max(abs_tol, rel_tol * scale)
        if abs(x.imag) <= thresh:
            return x.real
        raise ValueError(
            f"{cid} produced a non-real value "
            f"(imag={x.imag:.6g}, thresh={thresh:.6g}): {x!r}"
        )

    # real already
    return x

def as_display_real(cid: str, x: Any) -> Any:
    """
    Normalize values for display/reporting:
    - If x is complex (mp or python), drop tiny imaginary residue using the same tolerances
    - Otherwise return x unchanged
    """
    if isinstance(x, (mp.mpc, complex)):
        return require_effectively_real(cid, x, abs_tol=1e-12, rel_tol=1e-20)
    return x


def expected_kind_of(recipe: Dict[str, Any]) -> str:
    return (recipe.get("expected_kind", "measured") or "measured").strip().lower()


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
USE_COLOR = sys.stdout.isatty()

GREEN = "\033[92m" if USE_COLOR else ""
ORANGE = "\033[38;5;214m" if USE_COLOR else ""
RED = "\033[91m" if USE_COLOR else ""
RESET = "\033[0m" if USE_COLOR else ""

SIGMA_LIMIT = 5.2


# ------------------------------------------------------------
# Formatting: ALWAYS scientific notation for display
# ------------------------------------------------------------
_SUPERS = str.maketrans("0123456789-", "⁰¹²³⁴⁵⁶⁷⁸⁹⁻")


def _to_float_for_display(x: Any) -> float:
    # Only for display/reporting; compute path stays mp.
    try:
        if isinstance(x, mp.mpc):
            return float(x.real)
        if isinstance(x, mp.mpf):
            return float(x)
    except Exception:
        pass
    return float(x)


def sci_pretty(x: object, sig: int = 15) -> str:
    """
    Pretty scientific notation:
      mantissa × 10^exponent

    Display-only. Compute precision is handled by mpmath everywhere else.
    """
    # mpmath complex
    if isinstance(x, mp.mpc):
        if x.imag != 0:
            a = mp.nstr(x.real, sig)
            b = mp.nstr(abs(x.imag), sig)
            sign = "+" if x.imag >= 0 else "-"
            return f"({a}{sign}{b}j)"
        x = x.real

    # python complex
    if isinstance(x, complex):
        if abs(x.imag) > 1e-16:
            return f"({x.real:.{sig}e}{'+' if x.imag >= 0 else '-'}{abs(x.imag):.{sig}e}j)"
        x = x.real

    try:
        xf = _to_float_for_display(x)  # display
    except Exception:
        return str(x)

    if xf == 0.0:
        return f"0 × 10^{0}"

    sign = "-" if xf < 0 else ""
    ax = abs(xf)
    s = f"{ax:.{sig - 1}e}"
    mant_s, exp_s = s.split("e")
    exp10 = int(exp_s)
    return f"{sign}{mant_s} × 10^{str(exp10).translate(_SUPERS)}"

def sci_precise(x: Any, sig: int = PRINT_DIGITS) -> str:
    """
    High-precision numeric formatter.
    Unlike sci_pretty(), this does not convert through float.
    """
    if isinstance(x, mp.mpc):
        if x.imag == 0:
            return mp.nstr(x.real, n=sig, strip_zeros=False)

        real = mp.nstr(x.real, n=sig, strip_zeros=False)
        imag = mp.nstr(abs(x.imag), n=sig, strip_zeros=False)
        sign = "+" if x.imag >= 0 else "-"
        return f"({real}{sign}{imag}j)"

    if isinstance(x, mp.mpf):
        return mp.nstr(x, n=sig, strip_zeros=False)

    if isinstance(x, complex):
        return sci_precise(mp.mpc(x.real, x.imag), sig=sig)

    return mp.nstr(mp.mpf(x), n=sig, strip_zeros=False)


def sci_csv(x: Any, sig: int = 60) -> str:
    """
    Scientific notation string for CSV.
    Uses mpmath printing if value is mp.mpf/mp.mpc, so digits are not truncated.
    """
    # mpmath complex
    if isinstance(x, mp.mpc):
        if x.imag == 0:
            return mp.nstr(x.real, n=sig, strip_zeros=False)
        a = mp.nstr(x.real, n=sig, strip_zeros=False)
        b = mp.nstr(abs(x.imag), n=sig, strip_zeros=False)
        sign = "+" if x.imag >= 0 else "-"
        return f"({a}{sign}{b}j)"

    # mpmath real
    if isinstance(x, mp.mpf):
        return mp.nstr(x, n=sig, strip_zeros=False)

    # python complex
    if isinstance(x, complex):
        if x.imag == 0.0:
            return f"{x.real:.{sig}e}"
        sign = "+" if x.imag >= 0 else "-"
        return f"({x.real:.{sig}e}{sign}{abs(x.imag):.{sig}e}j)"

    # python real
    return f"{float(x):.{sig}e}"


# ------------------------------------------------------------
# Parsing CODATA-style "measured" strings
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

_SUBFACT_CALL_RE = re.compile(r"^\s*subfact\(\s*(\d+)\s*\)\s*$")
_BANG_SUBFACT_RE = re.compile(r"^\s*!\s*(\d+)\s*$")
_ZETA_CALL_RE = re.compile(r"^\s*zeta\(\s*[+-]?\d+\s*\)\s*$")
_GAMMA_CALL_RE = re.compile(r"^\s*(?:gamma|Γ)\(\s*(.+?)\s*\)\s*$")
_EXPR_PAREN_RE = re.compile(r"^\s*\(.+\)\s*$")
_EXP_SYMBOL_RE = re.compile(r"^\s*([+-]?)\s*([^\s]+)\s*$")


def parse_measured_value(raw: Any) -> Tuple[float, Optional[float], str, Optional[float], Optional[int], Optional[int]]:
    if raw is None:
        return (float("nan"), None, "(missing)", None, None, None)

    if isinstance(raw, (int, float)):
        v = float(raw)
        return (v, None, sci_pretty(v), None, None, 0)

    s = str(raw).strip()
    m = _CODATA_RE.match(s)
    if not m:
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
        decimals = len(mant_s.split(".", 1)[1]) if "." in mant_s else 0
        sigma_mant = unc_int * (10 ** (-decimals))
        sigma = sigma_mant * (10 ** exp)
        pretty = f"{mant_s}({unc_s}) × 10^{str(exp).translate(_SUPERS)}"
    else:
        pretty = sci_pretty(value)

    return (value, sigma, pretty, mant, unc_int, exp)


# ------------------------------------------------------------
# Digits matching for exact constants (display/reporting only)
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


def computed_mantissa_digits_string(x: Any, ref_digits: str) -> str:
    """
    Reporting-only: uses Decimal + float conversion to compare mantissa prefixes.
    Does not affect computation of constants.
    """
    if isinstance(x, (mp.mpf, mp.mpc)):
        x = x.real if isinstance(x, mp.mpc) else x
        x = float(x)

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
    mant_dec = x_dec / (Decimal(10) ** exp10)

    scale = Decimal(10) ** (ref_len - 1)
    digits_int = int((mant_dec * scale).to_integral_value(rounding=ROUND_FLOOR))
    return str(digits_int).zfill(ref_len)[:ref_len]


# ------------------------------------------------------------
# Canonical factor list handling (must match evaluator.py)
# ------------------------------------------------------------
def _is_number(x: Any) -> bool:
    return isinstance(x, (int, float)) and not isinstance(x, bool)


def _split_token_and_power_from_string(s: str) -> Tuple[str, Optional[str]]:
    s = s.strip()
    if not s:
        return "", None
    if _EXPR_PAREN_RE.match(s):
        return s, None

    depth = 0
    split_at = -1
    for i, ch in enumerate(s):
        if ch == "(":
            depth += 1
        elif ch == ")" and depth > 0:
            depth -= 1
        elif ch == "^" and depth == 0:
            split_at = i

    if split_at == -1:
        return s, None

    tok = s[:split_at].strip()
    pow_s = s[split_at + 1:].strip()
    return tok, pow_s or None


def _extract_exponent_dependencies(power_str: str) -> List[str]:
    """
    Returns the symbol dependencies used by an exponent.

    Examples:
      "-γ"      -> ["γ"]
      "γ"       -> ["γ"]
      "(-i)"    -> ["i"]
      "(1+γ)/2" -> ["γ"]
      "1/3"     -> []
      "(2^0.5)" -> []
    """
    s = (power_str or "").strip()
    if not s:
        return []

    # numeric-only exponent expressions -> no symbol deps
    if re.fullmatch(r"[\s0-9+\-*/^().]+", s) and any(ch.isdigit() for ch in s):
        return []
    try:
        float(s)
        return []
    except ValueError:
        pass

    # Simple symbol exponent: optional leading sign, then one name token (no operators/parens)
    m = _EXP_SYMBOL_RE.match(s)
    if m:
        sym = m.group(2)
        if not any(ch in sym for ch in "()+*/^"):
            return [sym]

    # General exponent expression: extract all names inside
    expr = s
    if not (expr.startswith("(") and expr.endswith(")")):
        expr = f"({expr})"
    return _names_in_expression_token(expr)


def _iter_factor_items(factors):
    if factors is None:
        return
    if isinstance(factors, Mapping):
        for k, v in factors.items():
            yield (k, v)
        return
    if isinstance(factors, list):
        for item in factors:
            if isinstance(item, (tuple, list)) and len(item) == 2:
                yield (item[0], item[1])
                continue
            if isinstance(item, dict):
                if "id" in item:
                    yield (item["id"], item.get("power", 1))
                elif len(item) == 1:
                    (kk, vv), = item.items()
                    yield (kk, vv)
                else:
                    raise TypeError(f"Bad factor dict item: {item!r}")
                continue
            if isinstance(item, str):
                yield (item, 1)
                continue
            raise TypeError(f"Bad factor item type: {type(item).__name__}: {item!r}")
        return
    raise TypeError(f"Factors must be a dict or list. Got {type(factors).__name__}: {factors!r}")


# Unicode-safe: matches names like i, zhe_1, γ, etc.
_NAME_IN_EXPR_RE = re.compile(r"\b[^\W\d]\w*\b", re.UNICODE)


def _names_in_expression_token(expr: str) -> list[str]:
    s = (expr or "").strip()
    if s.startswith("(") and s.endswith(")"):
        s = s[1:-1]
    s = s.replace("m_+", "m_plus")
    names = _NAME_IN_EXPR_RE.findall(s)
    out: list[str] = [("m_+" if n == "m_plus" else n) for n in names]
    blacklist = {"Im", "Re", "log", "ln"}
    return [n for n in out if n not in blacklist]


# ------------------------------------------------------------
# Dependencies (tokens)
# ------------------------------------------------------------
def collect_dependencies(recipe: Dict[str, Any]) -> Tuple[List[str], List[str]]:
    display_set: set[str] = set()
    required_set: set[str] = set()

    def add_factor_list(lst: Any):
        for tok, pow_val in _iter_factor_items(lst):
            if _is_number(tok):
                continue
            tok_s = str(tok).strip()
            if not tok_s:
                continue
            if tok_s == "ten":
                raise ValueError("Recipe contains forbidden token 'ten'. It is not allowed.")

            if _EXPR_PAREN_RE.match(tok_s):
                for nm in _names_in_expression_token(tok_s):
                    display_set.add(nm)
                    required_set.add(nm)
                if pow_val is not None:
                    for sym in _extract_exponent_dependencies(str(pow_val).strip()):
                        display_set.add(sym)
                        required_set.add(sym)

                continue

            try:
                float(tok_s)
                continue
            except ValueError:
                pass

            base_tok, tok_pow = _split_token_and_power_from_string(tok_s)
            base_tok = base_tok.strip()

            try:
                float(base_tok)
                continue
            except ValueError:
                pass

            if _EXPR_PAREN_RE.match(base_tok):
                for nm in _names_in_expression_token(base_tok):
                    display_set.add(nm)
                    required_set.add(nm)
            else:
                if (
                        _ZETA_CALL_RE.match(base_tok)
                        or _SUBFACT_CALL_RE.match(base_tok)
                        or _BANG_SUBFACT_RE.match(base_tok)
                        or _GAMMA_CALL_RE.match(base_tok)
                ):
                    # function tokens are display-only; they are not symbols loaded from CSV
                    display_set.add(base_tok)
                else:
                    display_set.add(base_tok)
                    required_set.add(base_tok)

            if tok_pow:
                for sym in _extract_exponent_dependencies(tok_pow):
                    display_set.add(sym)
                    required_set.add(sym)

            if pow_val is not None:
                for sym in _extract_exponent_dependencies(str(pow_val).strip()):
                    display_set.add(sym)
                    required_set.add(sym)

    eg = recipe["external_geometry"]
    eb = recipe["external_boundary"]
    ig = recipe["inversion_geometry"]

    add_factor_list(eg.get("numerator"))
    add_factor_list(eg.get("denominator"))
    add_factor_list(eb.get("numerator"))
    add_factor_list(eb.get("denominator"))
    add_factor_list(ig.get("numerator"))
    add_factor_list(ig.get("denominator"))

    display_set.add("IB")
    required_set.add("IB")

    rt = recipe["root_transform"]["id"]
    DERIVED_EXPAND = {"zhe_1_minus_zhe_2": ["zhe_1", "zhe_2"]}

    if rt in DERIVED_EXPAND:
        for t in DERIVED_EXPAND[rt]:
            display_set.add(t)
            required_set.add(t)
    else:
        rt_s = str(rt).strip()
        if any(op in rt_s for op in "+-*/()^ "):
            for nm in _names_in_expression_token(f"({rt_s})"):
                display_set.add(nm)
                required_set.add(nm)
        else:
            display_set.add(rt_s)
            required_set.add(rt_s)

    preferred = ["l_p", "t_p", "q_p", "T_p", "m_p", "G_Gi"]
    display_ordered = [t for t in preferred if t in display_set]
    remaining = sorted(t for t in display_set if t not in preferred and t != "IB")
    display_ordered += remaining + ["IB"]

    required_ordered = [t for t in preferred if t in required_set]
    required_remaining = sorted(t for t in required_set if t not in preferred and t != "IB")
    required_ordered += required_remaining + ["IB"]

    return display_ordered, required_ordered


def _digits_only(s: str) -> str:
    return "".join(ch for ch in (s or "") if ch.isdigit())


def expected_prefix_from_digits(expected_value: float, expected_digits: str) -> tuple[float, int, int]:
    digs = _digits_only(expected_digits)
    sig = len(digs)
    if sig <= 0:
        return (expected_value, int(math.floor(math.log10(abs(expected_value)))) if expected_value else 0, 0)

    if expected_value == 0.0:
        exp10 = 0
        sign = 1.0
    else:
        exp10 = int(math.floor(math.log10(abs(expected_value))))
        sign = -1.0 if expected_value < 0 else 1.0

    mant_int = int(digs)
    mant = mant_int / (10 ** (sig - 1))
    expected_prefix = sign * mant * (10 ** exp10)
    return (expected_prefix, exp10, sig)


def classify_by_last_digit_units(expected_prefix: float, computed: float, exp10: int, sig_digits: int) -> tuple[str, float, float]:
    if sig_digits <= 0:
        return ("fail", float("inf"), float("nan"))
    step = 10 ** (exp10 - (sig_digits - 1))
    err = abs(computed - expected_prefix)
    k = err / step if step != 0 else float("inf")
    if k < 1:
        return ("full", k, step)
    elif k < 10:
        return ("almost", k, step)
    else:
        return ("fail", k, step)


# ------------------------------------------------------------
# Verification report per constant
# ------------------------------------------------------------
def verify_and_format(recipe: Dict[str, Any], computed: Quantity) -> List[str]:
    lines: List[str] = []
    dim = recipe.get("dimension", "-")
    cid = recipe.get("constant_id", "?")
    cv_disp = as_display_real(cid, computed.value)
    lines.append(f"computed: {sci_precise(cv_disp, PRINT_DIGITS)} {dim}")
    expected_kind = expected_kind_of(recipe)
    expected_value = recipe.get("expected_value")
    if expected_value is None:
        lines.append("expected: (missing)")
        return lines

    if expected_kind == "exact":
        label = recipe.get("expected_digits_label", "exact")
        ref_digits = recipe.get("expected_digits")

        try:
            ev = float(expected_value)
            lines.append(f"expected: {sci_pretty(ev)} {dim}   ({label})")
        except Exception:
            ev = None
            lines.append(f"expected: {expected_value} {dim}   ({label})")

        if ref_digits and ev is not None:
            cv = as_display_real(cid, computed.value)

            cv_f = float(cv)  # reporting comparison
            expected_prefix, exp10, sig = expected_prefix_from_digits(float(ev), ref_digits)
            label2, _, _ = classify_by_last_digit_units(expected_prefix, cv_f, exp10, sig)
            comp_digits = computed_mantissa_digits_string(cv_f, ref_digits)
            match_n = digits_match_count(comp_digits, ref_digits)

            if label2 == "full":
                lines.append(f"digits:   {GREEN}full match{RESET} ({match_n}/{sig})")
            elif label2 == "almost":
                lines.append(f"digits:   {ORANGE}almost-full match{RESET} ({match_n}/{sig})")
            else:
                lines.append(f"digits:   {RED}not a match{RESET} ({match_n}/{sig})")
        else:
            if ev is not None:
                cv_f = float(computed.value.real) if isinstance(computed.value, mp.mpc) else float(computed.value)
                abs_err = abs(cv_f - ev)
                lines.append(f"abs err:  {sci_pretty(abs_err)}")
            else:
                lines.append("abs err:  (unavailable)")
        return lines

    # measured
    codata_label = recipe.get("expected_digits_label", "measured")
    ev, sigma, ev_pretty, _, _, exp = parse_measured_value(expected_value)
    lines.append(f"expected: {ev_pretty} {dim}   ({codata_label})")

    cv = as_display_real(cid, computed.value)

    cv_f = float(cv)  # reporting
    signed_err = cv_f - float(ev)
    abs_err = abs(signed_err)
    scaled_err = abs_err / (10 ** exp)

    ABS_ERR_DECIMALS = 15
    mantissa_str = f"{scaled_err:.{ABS_ERR_DECIMALS}f}"
    lines.append(f"abs err:  {mantissa_str} × 10^{str(exp).translate(_SUPERS)} {dim}")

    if sigma is not None and sigma > 0:
        z = signed_err / sigma
        if abs(z) < 0.0005:
            z = 0.0
        lines.append(f"sigma:    {z:+.2f}")
        sigma_label = f"{SIGMA_LIMIT:g}"
        lines.append(
            f"within {sigma_label}σ: {GREEN}yes{RESET}"
            if abs(z) <= SIGMA_LIMIT
            else f"within {sigma_label}σ: {RED}no{RESET}"
        )
    else:
        lines.append("sigma:    (missing)")
        lines.append("within 5σ: (missing)")

    return lines


def constant_passes(recipe: Dict[str, Any], computed: Quantity) -> bool:
    expected_kind = expected_kind_of(recipe)
    expected_value = recipe.get("expected_value")
    if expected_value is None:
        return False

    cv = computed.value
    if isinstance(cv, (mp.mpc, complex)):
        try:
            cv = require_effectively_real(recipe.get("constant_id", "?"), cv)
        except Exception:
            return False

    cv_f = float(cv)  # summary classification

    if expected_kind == "exact":
        ref_digits = recipe.get("expected_digits")
        if not ref_digits:
            return False
        try:
            ev = float(expected_value)
        except Exception:
            return False
        expected_prefix, exp10, sig = expected_prefix_from_digits(ev, ref_digits)
        label2, _, _ = classify_by_last_digit_units(expected_prefix, cv_f, exp10, sig)
        return label2 in {"full", "almost"}

    ev, sigma, _, _, _, _ = parse_measured_value(expected_value)
    if sigma is None or sigma <= 0 or math.isnan(ev):
        return False

    signed_err = cv_f - float(ev)
    z = signed_err / float(sigma)
    if abs(z) < 0.0005:
        z = 0.0
    return abs(z) <= SIGMA_LIMIT


# ------------------------------------------------------------
# CSV IO
# ------------------------------------------------------------
def _parse_csv_number_to_mp(value: str) -> Any:
    """
    Parse:
      - real: "1.23e-4"
      - complex: "a+bj" or "a-bj" or "(a+bj)" or "(a-bj)" (a,b may be scientific notation)
      - pure imaginary: "4j" or "-4j" (and parenthesized forms)

    Returns: mp.mpf or mp.mpc
    """
    v_str = (value or "").strip()
    if not v_str:
        raise ValueError("Empty numeric string")

    s = v_str.replace("J", "j").strip()

    # strip optional parentheses
    if s.startswith("(") and s.endswith(")"):
        s = s[1:-1].strip()

    # complex / imaginary
    if "j" in s:
        if not s.endswith("j"):
            raise ValueError(f"Bad complex literal (missing trailing j): {v_str!r}")

        body = s[:-1].strip()  # drop trailing 'j'

        # Find separator between real and imag: last + or - not part of exponent
        split_idx = None
        for i in range(len(body) - 1, 0, -1):
            if body[i] in "+-" and body[i - 1] not in "eE":
                split_idx = i
                break

        # pure imaginary like "4j" or "-4j"
        if split_idx is None:
            a = mp.mpf("0")
            b = mp.mpf(body) if body else mp.mpf("1")  # "j" -> 1j (rare)
            return mp.mpc(a, b)

        a_s = body[:split_idx].strip()
        b_s = body[split_idx:].strip()

        a = mp.mpf(a_s) if a_s else mp.mpf("0")
        b = mp.mpf(b_s) if b_s else mp.mpf("0")
        return mp.mpc(a, b)

    # real
    return mp.mpf(s)


def _parse_csv_dimension(dim: str) -> Dict[str, int]:
    """
    CSV convention:
      - "-" means dimensionless
      - "" also means dimensionless
    """
    d = (dim or "").strip()
    if d in {"", "-"}:
        return {}
    return parse_dimension(d)


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
                v = _parse_csv_number_to_mp(value)
                symbols[token] = Quantity(v, _parse_csv_dimension(dim))

            if token == "m_+":
                symbols["m_plus"] = symbols[token]

    # HARD COHERENCE GUARANTEE FOR OMEGAS
    if "omega_2" in symbols and "phi_i" in symbols:
        o2 = symbols["omega_2"]
        ph = symbols["phi_i"]
        if o2.units != {}:
            raise ValueError(f"omega_2 must be dimensionless; got units={o2.units}")
        if ph.units != {}:
            raise ValueError(f"phi_i must be dimensionless; got units={ph.units}")
        symbols["omega_1"] = Quantity(o2.value * ph.value, {})

    return symbols


def load_recipes(path: Path) -> List[Dict[str, Any]]:
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    recipes = data.get("constants", [])

    seen: Dict[int, str] = {}

    for recipe in recipes:
        if "recipe_number" not in recipe:
            raise ValueError(
                f"Recipe missing recipe_number: {recipe.get('constant_id', '?')}"
            )

        n = int(recipe["recipe_number"])
        cid = str(recipe.get("constant_id", "?"))

        if n in seen:
            raise ValueError(
                f"Duplicate recipe_number {n}: {seen[n]} and {cid}"
            )

        seen[n] = cid

    expected = set(range(1, len(recipes) + 1))
    actual = set(seen.keys())

    if actual != expected:
        missing = sorted(expected - actual)
        extra = sorted(actual - expected)
        raise ValueError(
            f"Recipe numbers must be exactly 1..{len(recipes)}. "
            f"Missing={missing}; extra={extra}"
        )

    return sorted(recipes, key=lambda r: int(r["recipe_number"]))


def reset_generated_symbols_file() -> None:
    GENERATED_SYMBOLS_CSV.parent.mkdir(parents=True, exist_ok=True)
    with GENERATED_SYMBOLS_CSV.open("w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["token", "value", "dimension"])


def append_generated_symbols(rows: List[Tuple[str, Quantity, str]]) -> None:
    with GENERATED_SYMBOLS_CSV.open("a", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        for token, q, dim in rows:
            writer.writerow([token, sci_csv(q.value, sig=CSV_DIGITS), dim or "-"])


# ------------------------------------------------------------
# Build loop
# ------------------------------------------------------------
def main() -> None:
    reset_generated_symbols_file()

    base_symbols = load_symbols(SYMBOLS_CSV)
    symbols: Dict[str, Quantity] = dict(base_symbols)

    recipes = load_recipes(RECIPES_YAML)
    recipe_by_id: Dict[str, Dict[str, Any]] = {r["constant_id"]: r for r in recipes}

    unresolved = {r["constant_id"] for r in recipes}
    pass_number = 0
    total_built = 0

    built_exact = 0
    built_measured = 0
    passed_exact = 0
    failed_exact = 0
    passed_measured = 0
    failed_measured = 0

    failed_exact_ids: List[str] = []
    failed_measured_ids: List[str] = []

    build_errors: Dict[str, str] = {}   # <-- persist across passes
    built_records: Dict[str, Tuple[int, Quantity, str]] = {}

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
                value_q = evaluate_constant(recipe, symbols, inversion_boundary_token="IB")

            except Exception as e:
                msg = f"{type(e).__name__}: {e}"
                build_errors[cid] = msg
                print(f"ERROR building {cid}: {msg}")
                continue

            dim = recipe.get("dimension", "-")

            # Force away tiny imaginary numerical residue at the source
            value_real = as_display_real(cid, value_q.value)
            if value_real is not value_q.value:
                value_q = Quantity(value_real, value_q.units)

            built_this_pass.append((cid, value_q, dim))
            built_records[cid] = (pass_number, value_q, dim)
            symbols[cid] = value_q
            unresolved.discard(cid)

            total_built += 1
            kind = expected_kind_of(recipe)
            ok = constant_passes(recipe, value_q)

            if kind == "exact":
                built_exact += 1
                if ok:
                    passed_exact += 1
                else:
                    failed_exact += 1
                    failed_exact_ids.append(cid)
            else:
                built_measured += 1
                if ok:
                    passed_measured += 1
                else:
                    failed_measured += 1
                    failed_measured_ids.append(cid)

        if not built_this_pass:
            unresolved_exact = 0
            unresolved_measured = 0
            for cid in unresolved:
                r = recipe_by_id.get(cid, {})
                kind = expected_kind_of(r)
                if kind == "exact":
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
                    if cid in build_errors:
                        print(f"  {cid}: build error: {build_errors[cid]}")
                        continue
                    miss = blocked.get(cid, [])
                    if miss:
                        print(f"  {cid}: missing {', '.join(miss)}")
                    else:
                        print(f"  {cid}: missing (unknown)")


            if failed_exact_ids or failed_measured_ids:
                print("\nFailed constants:")
                if failed_exact_ids:
                    print("  exact:")
                    for cid in failed_exact_ids:
                        r = recipe_by_id.get(cid, {})
                        name = r.get("display_name", cid)
                        print(f"    {cid} — {name}")
                if failed_measured_ids:
                    print("  measured:")
                    for cid in failed_measured_ids:
                        r = recipe_by_id.get(cid, {})
                        name = r.get("display_name", cid)
                        print(f"    {cid} — {name}")

            break

        append_generated_symbols(built_this_pass)

    print("\n=== Constants in official order ===")

    for recipe in recipes:
        cid = recipe["constant_id"]

        if cid not in built_records:
            continue

        pass_built, value, dim = built_records[cid]
        recipe_number = int(recipe.get("recipe_number", 0))
        name = recipe.get("display_name", cid)
        deps_display, _ = collect_dependencies(recipe)

        print(f"\n{recipe_number:03}. {cid}  —  {name}   [built on pass {pass_built}]")
        print(f"deps: {', '.join(deps_display)}")

        for line in verify_and_format(recipe, value):
            print(line)

    print("\nBuild complete.")


if __name__ == "__main__":
    main()
