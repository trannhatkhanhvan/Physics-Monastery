from __future__ import annotations

import ast
import math
import numbers
import operator as _op
import re
from dataclasses import dataclass
from typing import Dict, Any

from mpmath import zeta as mp_zeta


# ============================================================
# Quantity: value + units
# ============================================================

@dataclass(frozen=True)
class Quantity:
    value: complex
    units: Dict[str, float]  # base unit -> exponent (e.g. {"kg": 1, "m": 2, "s": -2})


def _clean_units(u: Dict[str, float]) -> Dict[str, float]:
    out: Dict[str, float] = {}
    for k, v in u.items():
        if abs(v) > 1e-15:
            out[k] = float(v)
    return out


def units_mul(a: Dict[str, float], b: Dict[str, float], sign: float = +1.0) -> Dict[str, float]:
    out = dict(a)
    for k, v in b.items():
        out[k] = out.get(k, 0.0) + sign * v
    return _clean_units(out)


def units_pow(u: Dict[str, float], p: complex) -> Dict[str, float]:
    # Units only make sense for real powers.
    if abs(p.imag) > 0:
        raise ValueError(f"Complex power {p} applied to a dimensional quantity.")
    pr = float(p.real)
    return _clean_units({k: v * pr for k, v in u.items()})


def q_mul(a: Quantity, b: Quantity) -> Quantity:
    return Quantity(a.value * b.value, units_mul(a.units, b.units, +1.0))


def q_div(a: Quantity, b: Quantity) -> Quantity:
    return Quantity(a.value / b.value, units_mul(a.units, b.units, -1.0))


def q_pow(a: Quantity, p: complex) -> Quantity:
    return Quantity(a.value ** p, units_pow(a.units, p))


def q_add(a: Quantity, b: Quantity) -> Quantity:
    if a.units != b.units:
        raise ValueError(f"Unit mismatch in addition: {a.units} vs {b.units}")
    return Quantity(a.value + b.value, dict(a.units))


# ============================================================
# Dimension parser
# ============================================================

_TOKEN_RE = re.compile(r"[^\W*/^()]+", flags=re.UNICODE)

# Function token: zeta(n) where n is an integer (e.g. zeta(2), zeta(-1))
_ZETA_CALL_RE = re.compile(r"^\s*zeta\(\s*([+-]?\d+)\s*\)\s*$")

_SUBFACT_CALL_RE = re.compile(r"^\s*subfact\(\s*(\d+)\s*\)\s*$")
_BANG_SUBFACT_RE = re.compile(r"^\s*!\s*(\d+)\s*$")

# Exponent token: "-γ" or "γ"
_EXP_SYMBOL_RE = re.compile(r"^\s*([+-]?)\s*([^\s]+)\s*$")


def parse_dimension(dim: str) -> Dict[str, float]:
    dim = (dim or "").strip()
    if dim in ("", "-"):
        return {}

    s = dim.replace("·", "*").replace(" ", "")
    parts = s.split("/")

    num = parts[0]
    den_parts = parts[1:] if len(parts) > 1 else []

    out: Dict[str, float] = {}

    def apply_product(prod_str: str, sign: float):
        if prod_str == "":
            return
        for factor in prod_str.split("*"):
            if factor == "":
                continue
            if "^" in factor:
                base, exp = factor.split("^", 1)
                base = base.strip()
                exp = exp.strip()
                power = float(exp)
            else:
                base = factor.strip()
                power = 1.0

            if base == "1":
                continue

            out[base] = out.get(base, 0.0) + sign * power

    apply_product(num, +1.0)
    for d in den_parts:
        apply_product(d, -1.0)

    return _clean_units(out)


# ============================================================
# Exponent parsing
# ============================================================

def _exponent_from_string(power_str: str, symbols: Dict[str, Quantity]) -> complex:
    """
    Supports:
      "-γ"  -> -symbols["γ"].value
      "γ"   -> +symbols["γ"].value
    Enforces:
      - γ must be dimensionless
      - γ must be real-valued
    """
    s = power_str.strip()
    m = _EXP_SYMBOL_RE.match(s)
    if not m:
        raise ValueError(f"Bad exponent string: {power_str!r}")

    sign_s, sym = m.group(1), m.group(2)
    sign = -1.0 if sign_s == "-" else +1.0

    if sym not in symbols:
        raise KeyError(f"Exponent symbol '{sym}' not found in symbols table.")

    q = symbols[sym]
    if q.units != {}:
        raise ValueError(f"Exponent symbol '{sym}' must be dimensionless; got units={q.units}")
    if abs(q.value.imag) > 0:
        raise ValueError(f"Exponent symbol '{sym}' must be real; got value={q.value}")

    return complex(sign * float(q.value.real))


def exponent_to_complex(power: Any, symbols: Dict[str, Quantity] | None = None) -> complex:
    """
    Accepts:
      - None -> 1
      - number -> that number
      - [a, b] -> a*b
      - string like "-γ" or "γ" -> looks up symbol in `symbols`
    """
    if power is None:
        return 1.0 + 0j

    if isinstance(power, (list, tuple)) and len(power) == 2:
        return complex(float(power[0]) * float(power[1]))

    if isinstance(power, str):
        if symbols is None:
            raise ValueError(f"String exponent {power!r} requires symbols lookup.")
        return _exponent_from_string(power, symbols)

    return complex(power)


def _subfactorial_int(n: int) -> int:
    """
    Derangements / subfactorial !n as an exact integer.
    """
    if n < 0:
        raise ValueError("subfactorial is only defined here for n >= 0")
    if n == 0:
        return 1
    if n == 1:
        return 0
    a, b = 1, 0  # !0, !1
    for k in range(2, n + 1):
        a, b = b, (k - 1) * (b + a)
    return b


# ============================================================
# Expression-token support (Option B + numeric-only expressions)
# ============================================================

# 1) Explicitly parenthesized tokens are expressions: "(4*C_Cf + 6*2pi)"
_EXPR_TOKEN_RE = re.compile(r"^\s*\(.+\)\s*$")

# 2) Numeric-only arithmetic tokens are also expressions: "5*18", "10/4", "-7/5"
#    This is SAFE: it won't catch IDs like "m_+" or "μ_N/h" because they contain letters/underscores.
_NUMERIC_EXPR_RE = re.compile(
    r"""
    ^\s*
    [+-]?
    (?:\d+(?:\.\d*)?|\.\d+)
    (?:\s*[-+*/]\s*(?:\d+(?:\.\d*)?|\.\d+))+
    \s*$
    """,
    re.VERBOSE,
)


def _normalize_expr(s: str) -> str:
    """
    Allow user-friendly things like:
      2pi  -> 2*pi
      )x   -> )*x
      x(   -> x*(
    Also converts '^' to '**'.
    """
    s = s.strip()

    # caret exponent -> python exponent
    s = s.replace("^", "**")

    # 2pi -> 2*pi , 2x -> 2*x
    s = re.sub(r"(\d)\s*([A-Za-z_])", r"\1*\2", s)

    # )x -> )*x
    s = re.sub(r"\)\s*([A-Za-z_])", r")*\1", s)

    # x( -> x*(
    s = re.sub(r"([A-Za-z_])\s*\(", r"\1*(", s)

    # )3 -> )*3
    s = re.sub(r"\)\s*(\d)", r")*\1", s)

    return s


_ALLOWED_BINOPS = {
    ast.Add: _op.add,
    ast.Sub: _op.sub,
    ast.Mult: _op.mul,
    ast.Div: _op.truediv,
    ast.Pow: _op.pow,
}
_ALLOWED_UNARYOPS = {
    ast.UAdd: _op.pos,
    ast.USub: _op.neg,
}


def _q_from_number(n: float) -> Quantity:
    return Quantity(complex(float(n)), {})


def _resolve_name_as_quantity(name: str, symbols: Dict[str, Quantity]) -> Quantity:
    if name in symbols:
        q = symbols[name]
        if not isinstance(q, Quantity):
            return _q_from_number(float(q))
        return q

    # allow math constants without requiring symbols.csv entries
    if name == "pi":
        return _q_from_number(math.pi)
    if name == "e":
        return _q_from_number(math.e)

    raise KeyError(f"Unknown name in expression token: '{name}'")


def eval_quantity_expr(expr: str, symbols: Dict[str, Quantity]) -> Quantity:
    """
    Evaluate an expression like "(4*C_Cf+6*2pi)" or "5*18" into a Quantity.

    Supports: +, -, *, /, **, parentheses
    Names: must exist in symbols (except pi and e).
    """
    expr_n = _normalize_expr(expr)
    node = ast.parse(expr_n, mode="eval")

    def _eval(n) -> Quantity:
        if isinstance(n, ast.Expression):
            return _eval(n.body)

        if isinstance(n, ast.Constant):
            if isinstance(n.value, (int, float)):
                return _q_from_number(float(n.value))
            raise TypeError(f"Bad constant in expression: {n.value!r}")

        if isinstance(n, ast.Name):
            return _resolve_name_as_quantity(n.id, symbols)

        if isinstance(n, ast.UnaryOp) and type(n.op) in _ALLOWED_UNARYOPS:
            q = _eval(n.operand)
            return Quantity(_ALLOWED_UNARYOPS[type(n.op)](q.value), dict(q.units))

        if isinstance(n, ast.BinOp) and type(n.op) in _ALLOWED_BINOPS:
            left = _eval(n.left)
            right = _eval(n.right)

            if type(n.op) is ast.Add:
                return q_add(left, right)
            if type(n.op) is ast.Sub:
                return q_add(left, Quantity(-right.value, dict(right.units)))
            if type(n.op) is ast.Mult:
                return q_mul(left, right)
            if type(n.op) is ast.Div:
                return q_div(left, right)
            if type(n.op) is ast.Pow:
                # exponent must be dimensionless & real (enforced in q_pow/units_pow)
                return q_pow(left, complex(right.value))

            raise TypeError("Unsupported operator")

        raise TypeError(f"Unsupported expression syntax: {ast.dump(n)}")

    return _eval(node)


# ============================================================
# Factors
# ============================================================

def factor_from_map(factors: dict, symbols: dict) -> Quantity:
    """
    Multiply tokens raised to their exponents.

    Rules:
    - Normal tokens must exist in `symbols` as Quantity.
    - Special token 'ten' is treated as exactly 10 (dimensionless).
    - Numeric tokens (ints, floats) are allowed as dimensionless literals.
    - Function tokens: zeta(n), subfact(n), !n
    - Exponents may be numeric OR a string like "-γ" meaning: use γ from symbols.
    - Expression tokens:
        * explicitly parenthesized, e.g. "(4*C_Cf+6*2pi)"
        * OR numeric-only arithmetic, e.g. "5*18"
    """
    prod = Quantity(1.0 + 0j, {})

    for token, power in factors.items():
        p = exponent_to_complex(power, symbols)

        if token == "ten":
            base = Quantity(10.0 + 0j, {})

        elif isinstance(token, numbers.Real):
            base = Quantity(complex(float(token)), {})

        else:
            tok = str(token).strip()

            # Expression token if parenthesized OR numeric-only arithmetic
            if _EXPR_TOKEN_RE.match(tok) or _NUMERIC_EXPR_RE.match(tok):
                base = eval_quantity_expr(tok, symbols)

            else:
                # Function token: zeta(n)
                m = _ZETA_CALL_RE.match(tok)
                if m:
                    n = int(m.group(1))
                    z = float(mp_zeta(n))
                    base = Quantity(complex(z), {})

                else:
                    # Function token: subfact(n)
                    m2 = _SUBFACT_CALL_RE.match(tok)
                    if m2:
                        n = int(m2.group(1))
                        base = Quantity(complex(_subfactorial_int(n)), {})

                    else:
                        # Shorthand token: !n
                        m3 = _BANG_SUBFACT_RE.match(tok)
                        if m3:
                            n = int(m3.group(1))
                            base = Quantity(complex(_subfactorial_int(n)), {})

                        else:
                            if tok not in symbols:
                                raise KeyError(f"Token '{tok}' not found in symbols table.")
                            base = symbols[tok]

        prod = q_mul(prod, q_pow(base, p))

    return prod


def fraction(num_map: dict, den_map: dict, symbols: dict) -> Quantity:
    num = factor_from_map(num_map, symbols)
    den = factor_from_map(den_map, symbols)
    return q_div(num, den)


# ============================================================
# Main evaluator
# ============================================================

def evaluate_constant(recipe: dict, symbols: dict, inversion_boundary_token: str = "IB") -> Quantity:
    EG = fraction(recipe["external_geometry"]["numerator"],
                  recipe["external_geometry"]["denominator"], symbols)

    EB = fraction(recipe["external_boundary"]["numerator"],
                  recipe["external_boundary"]["denominator"], symbols)

    IG = fraction(recipe["inversion_geometry"]["numerator"],
                  recipe["inversion_geometry"]["denominator"], symbols)

    rt = recipe["root_transform"]
    R_id = rt["id"]
    R_power = exponent_to_complex(rt.get("power", 1), symbols)

    if R_id not in symbols:
        raise KeyError(f"Root token '{R_id}' not found in symbols table.")

    R = q_pow(symbols[R_id], R_power)

    if inversion_boundary_token not in symbols:
        raise KeyError(f"Inversion boundary token '{inversion_boundary_token}' not found in symbols table.")
    IB = symbols[inversion_boundary_token]

    term = q_mul(q_mul(IG, R), IB)

    one = Quantity(1.0 + 0j, {})
    if term.units != one.units:
        raise ValueError(
            f"{recipe.get('constant_id')} has non-dimensionless IG*R*IB: units={term.units}"
        )

    inner = q_add(one, term)
    return q_mul(q_mul(EG, EB), inner)