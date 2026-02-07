from __future__ import annotations

import ast
import numbers
import operator as _op
import re
from dataclasses import dataclass
from typing import Any, Dict, Iterable, Tuple, Union
from collections.abc import Mapping

import mpmath as mp

# ============================================================
# Precision
# ============================================================
mp.mp.dps = 80  # match build_all.py; raise if you want more digits


# ============================================================
# Types
# ============================================================
Units = Dict[str, mp.mpf]
FactorToken = Union[str, int, float]  # we ACCEPT float inputs but immediately convert to mp
FactorItem = Union[str, int, float, Dict[str, Any]]


# ============================================================
# Quantity: value + units
# ============================================================
@dataclass(frozen=True)
class Quantity:
    # value can be mp.mpf (real) or mp.mpc (complex), or python numeric in legacy cases
    value: Any
    units: Units  # base unit -> exponent (mp.mpf)


# ============================================================
# Unit helpers (mp-safe)
# ============================================================
def _mp(x: Any) -> mp.mpf:
    """Convert to mp.mpf without going through float."""
    if isinstance(x, mp.mpf):
        return x
    if isinstance(x, mp.mpc):
        if x.imag != 0:
            raise ValueError(f"Expected real mp.mpf, got complex {x!r}")
        return x.real
    if isinstance(x, complex):
        if x.imag != 0:
            raise ValueError(f"Expected real, got complex {x!r}")
        return mp.mpf(str(x.real))
    # int/float/Decimal/str
    return mp.mpf(str(x))


def _clean_units(u: Units) -> Units:
    """Drop tiny exponents and normalize to mp.mpf."""
    out: Units = {}
    tol = mp.mpf("1e-40")
    for k, v in u.items():
        vv = v if isinstance(v, mp.mpf) else mp.mpf(str(v))
        if abs(vv) > tol:
            out[k] = vv
    return out


def units_mul(a: Units, b: Units, sign: Any = mp.mpf("1")) -> Units:
    out: Units = dict(a)
    sgn = sign if isinstance(sign, mp.mpf) else mp.mpf(str(sign))
    for k, v in b.items():
        vv = v if isinstance(v, mp.mpf) else mp.mpf(str(v))
        out[k] = out.get(k, mp.mpf("0")) + sgn * vv
    return _clean_units(out)


def _as_mpf(x: Any) -> mp.mpf:
    return _mp(x)


def _as_mpc(x: Any) -> mp.mpc:
    if isinstance(x, mp.mpc):
        return x
    if isinstance(x, mp.mpf):
        return mp.mpc(x, mp.mpf("0"))
    if isinstance(x, complex):
        return mp.mpc(mp.mpf(str(x.real)), mp.mpf(str(x.imag)))
    # int/float/Decimal/str
    return mp.mpc(mp.mpf(str(x)), mp.mpf("0"))


def _is_effectively_integer(p: mp.mpf, tol: mp.mpf = mp.mpf("1e-30")) -> Tuple[bool, int]:
    n = int(mp.nint(p))
    if abs(p - mp.mpf(n)) <= tol:
        return True, n
    return False, 0


def units_pow(u: Units, p: Any) -> Units:
    pr = _as_mpf(p)
    ok_int, n = _is_effectively_integer(pr)
    if ok_int:
        nn = mp.mpf(n)
        return _clean_units({k: (v * nn) for k, v in u.items()})
    return _clean_units({k: (v * pr) for k, v in u.items()})


# ============================================================
# Quantity arithmetic (mp-safe)
# ============================================================
def q_pow(a: Quantity, p: Any) -> Quantity:
    """
    Raise a Quantity to a power.

    Integer exponent: repeated multiplication (no branch issues).
    Non-integer real exponent: mpmath power on the value.
    """
    pr = _as_mpf(p)
    new_units = units_pow(a.units, pr)

    ok_int, n = _is_effectively_integer(pr)
    if ok_int:
        if n == 0:
            return Quantity(mp.mpf("1"), {})  # dimensionless 1

        base = _as_mpc(a.value)

        if n > 0:
            out = mp.mpc(1)
            for _ in range(n):
                out *= base
        else:
            out = mp.mpc(1)
            for _ in range(-n):
                out *= base
            out = mp.mpc(1) / out

        if out.imag == 0:
            return Quantity(out.real, new_units)
        return Quantity(out, new_units)

    # Non-integer real exponent (still must be real)
    vv = _as_mpc(a.value)
    res = mp.power(vv, pr)
    if res.imag == 0:
        return Quantity(res.real, new_units)
    return Quantity(res, new_units)


def q_mul(a: Quantity, b: Quantity) -> Quantity:
    va = _as_mpc(a.value)
    vb = _as_mpc(b.value)
    out = va * vb
    new_units = units_mul(a.units, b.units, mp.mpf("1"))
    if out.imag == 0:
        return Quantity(out.real, new_units)
    return Quantity(out, new_units)


def q_div(a: Quantity, b: Quantity) -> Quantity:
    va = _as_mpc(a.value)
    vb = _as_mpc(b.value)
    out = va / vb
    new_units = units_mul(a.units, b.units, mp.mpf("-1"))
    if out.imag == 0:
        return Quantity(out.real, new_units)
    return Quantity(out, new_units)


def q_add(a: Quantity, b: Quantity) -> Quantity:
    if a.units != b.units:
        raise ValueError(f"Unit mismatch in addition: {a.units} vs {b.units}")
    va = _as_mpc(a.value)
    vb = _as_mpc(b.value)
    out = va + vb
    if out.imag == 0:
        return Quantity(out.real, dict(a.units))
    return Quantity(out, dict(a.units))


def q_sub(a: Quantity, b: Quantity) -> Quantity:
    return q_add(a, Quantity(-_as_mpc(b.value), dict(b.units)))


def _q_from_number(x: Any) -> Quantity:
    return Quantity(mp.mpf(str(x)), {})


# ============================================================
# Dimension parser (for symbols CSV)
# ============================================================
def parse_dimension(dim: str) -> Units:
    dim = (dim or "").strip()
    if dim in ("", "-"):
        return {}

    # ------------------------------------------------------------
    # Expand common derived unit labels into base-unit expressions
    # ------------------------------------------------------------
    UNIT_ALIASES: dict[str, str] = {
        # mechanics
        "Hz": "1/s",
        "N": "m*kg/s^2",
        "Pa": "kg/(m*s^2)",
        "pascal": "kg/(m*s^2)",
        "J": "m^2*kg/s^2",
        "W": "m^2*kg/s^3",

        # EM (base units: m, kg, s, C)
        "V": "m^2*kg/(s^2*C)",
        "ohm": "m^2*kg/(s*C^2)",
        "Ω": "m^2*kg/(s*C^2)",
        "S": "s*C^2/(m^2*kg)",           # siemens
        "F": "s^2*C^2/(m^2*kg)",         # farad
        "H": "m^2*kg/(C^2)",             # henry
        "T": "kg/(s^2*C)",               # tesla
        "Wb": "m^2*kg/(s^2*C)",          # weber
    }

    s = dim.replace("·", "*").replace(" ", "")

    # Expand aliases safely (whole-token replacements), iterate to stability.
    for _ in range(8):
        changed = False
        for key, repl in UNIT_ALIASES.items():
            # word boundary for identifier-like keys, raw escape otherwise (e.g. Ω)
            if key.isidentifier():
                pat = rf"\b{re.escape(key)}\b"
            else:
                pat = re.escape(key)
            s2 = re.sub(pat, f"({repl})", s)
            if s2 != s:
                s = s2
                changed = True
        if not changed:
            break

    # ------------------------------------------------------------
    # Proper parser with parentheses + */ and exponents
    # Grammar:
    #   expr  := term (('*'|'/') term)*
    #   term  := factor ('^' power)?
    #   factor:= NAME | NUMBER | '(' expr ')'
    # power supports: integer, decimal, or fraction like 3/2
    # ------------------------------------------------------------
    i = 0
    n = len(s)

    def peek() -> str:
        return s[i] if i < n else ""

    def consume(ch: str) -> None:
        nonlocal i
        if peek() != ch:
            raise ValueError(f"Bad dimension syntax near {s[max(0,i-10):i+10]!r}: expected '{ch}'")
        i += 1

    def skip_ws() -> None:
        nonlocal i
        while i < n and s[i].isspace():
            i += 1

    def parse_name_or_number() -> tuple[str, bool]:
        """
        Returns (token, is_number_literal)
        token is:
          - unit name like "kg"
          - or number literal like "1"
        """
        nonlocal i
        skip_ws()
        if i >= n:
            raise ValueError("Unexpected end of dimension string")

        # number literal (only "1" really matters in dimensions)
        if s[i].isdigit() or s[i] == ".":
            j = i
            while j < n and (s[j].isdigit() or s[j] == "."):
                j += 1
            tok = s[i:j]
            i = j
            return tok, True

        # name (allow underscores)
        if s[i].isalpha() or s[i] == "_":
            j = i
            while j < n and (s[j].isalnum() or s[j] == "_"):
                j += 1
            tok = s[i:j]
            i = j
            return tok, False

        raise ValueError(f"Unexpected character in dimension: {s[i]!r}")

    def parse_power_value() -> mp.mpf:
        nonlocal i
        skip_ws()

        # optional parentheses around the exponent
        if peek() == "(":
            consume("(")
            p = parse_power_value()
            skip_ws()
            consume(")")
            return p

        # optional sign
        sign = mp.mpf("1")
        if peek() == "+":
            consume("+")
        elif peek() == "-":
            consume("-")
            sign = mp.mpf("-1")

        # read a number (int/decimal)
        j = i
        while j < n and (s[j].isdigit() or s[j] == "."):
            j += 1
        if j == i:
            raise ValueError(f"Missing exponent number near: {s[max(0, i - 10):i + 10]!r}")
        a_str = s[i:j]
        i = j

        a = mp.mpf(a_str)

        skip_ws()

        # Treat "/" as an exponent fraction ONLY if the next non-space char is a digit or "."
        # This prevents misreading C^2/(m^2*kg) as an exponent like 2/(...)
        if peek() == "/":
            k0 = i + 1
            while k0 < n and s[k0].isspace():
                k0 += 1
            if k0 < n and (s[k0].isdigit() or s[k0] == "."):
                consume("/")
                skip_ws()
                k = i
                while k < n and (s[k].isdigit() or s[k] == "."):
                    k += 1
                if k == i:
                    raise ValueError(f"Missing denominator in exponent fraction near: {s[max(0, i - 10):i + 10]!r}")
                b_str = s[i:k]
                i = k
                b = mp.mpf(b_str)
                return sign * (a / b)

        return sign * a

    def units_add(u: Units, base: str, power: mp.mpf) -> Units:
        out = dict(u)
        if base == "1":
            return out
        out[base] = out.get(base, mp.mpf("0")) + power
        return _clean_units(out)

    def units_merge(a: Units, b: Units, scale: mp.mpf) -> Units:
        out = dict(a)
        for k, v in b.items():
            out[k] = out.get(k, mp.mpf("0")) + scale * v
        return _clean_units(out)

    def parse_factor() -> Units:
        nonlocal i
        skip_ws()
        if peek() == "(":
            consume("(")
            u = parse_expr()
            skip_ws()
            consume(")")
            return u

        tok, is_num = parse_name_or_number()
        if is_num:
            # numeric literals contribute no units (only "1" is meaningful)
            return {}

        return {tok: mp.mpf("1")}

    def parse_term() -> Units:
        u = parse_factor()
        skip_ws()
        if peek() == "^":
            consume("^")
            p = parse_power_value()
            # multiply all exponents in u by p
            return _clean_units({k: v * p for k, v in u.items()})
        return _clean_units(u)

    def parse_expr() -> Units:
        u = parse_term()
        while True:
            skip_ws()
            ch = peek()
            if ch == "*":
                consume("*")
                u2 = parse_term()
                u = units_merge(u, u2, mp.mpf("1"))
                continue
            if ch == "/":
                consume("/")
                u2 = parse_term()
                u = units_merge(u, u2, mp.mpf("-1"))
                continue
            break
        return _clean_units(u)

    out = parse_expr()
    skip_ws()
    if i != n:
        raise ValueError(f"Trailing junk in dimension string near: {s[i:]!r}")

    return _clean_units(out)


# ============================================================
# Exponent parsing
# ============================================================
_EXP_SYMBOL_RE = re.compile(r"^\s*([+-]?)\s*([^\s]+)\s*$")


def _exponent_from_symbol_string(power_str: str, symbols: Dict[str, Quantity]) -> mp.mpf:
    """
    Supports:
      "-γ" -> -symbols["γ"].value
      "γ"  -> +symbols["γ"].value

    Enforces:
      - symbol must be dimensionless
      - symbol must be real-valued
    """
    s = power_str.strip()
    m = _EXP_SYMBOL_RE.match(s)
    if not m:
        raise ValueError(f"Bad exponent string: {power_str!r}")

    sign_s, sym = m.group(1), m.group(2)
    sign = mp.mpf("-1") if sign_s == "-" else mp.mpf("1")

    if sym not in symbols:
        raise KeyError(f"Exponent symbol '{sym}' not found in symbols table.")

    q = symbols[sym]
    if q.units != {}:
        raise ValueError(f"Exponent symbol '{sym}' must be dimensionless; got units={q.units}")

    v = q.value
    if isinstance(v, mp.mpc):
        if v.imag != 0:
            raise ValueError(f"Exponent symbol '{sym}' must be real; got value={v!r}")
        v = v.real
    elif isinstance(v, complex):
        if v.imag != 0:
            raise ValueError(f"Exponent symbol '{sym}' must be real; got value={v!r}")
        v = v.real

    return sign * _as_mpf(v)

def _try_eval_numeric_exponent_expr(s: str) -> mp.mpf | None:
    """
    If s is a purely-numeric expression like "(2^0.5)" or "2^(1/2)" or "1/3",
    evaluate it to an mp.mpf. Returns None if it contains any names/symbols.
    """
    ss = s.strip()
    if ss.startswith("(") and ss.endswith(")"):
        ss = ss[1:-1].strip()

    # normalize to python power operator
    ss = ss.replace("^", "**")

    # If there are any letters/underscores, it's not a pure numeric exponent.
    if re.search(r"[A-Za-z_]", ss):
        return None

    # Safe AST eval for numeric-only expressions (+-*/** and parentheses)
    node = ast.parse(ss, mode="eval")

    def _walk(n) -> mp.mpf:
        if isinstance(n, ast.Expression):
            return _walk(n.body)
        if isinstance(n, ast.Constant) and isinstance(n.value, (int, float)):
            return mp.mpf(str(n.value))
        if isinstance(n, ast.UnaryOp) and isinstance(n.op, (ast.UAdd, ast.USub)):
            v = _walk(n.operand)
            return v if isinstance(n.op, ast.UAdd) else -v
        if isinstance(n, ast.BinOp) and isinstance(n.op, (ast.Add, ast.Sub, ast.Mult, ast.Div, ast.Pow)):
            a = _walk(n.left)
            b = _walk(n.right)
            if isinstance(n.op, ast.Add):  return a + b
            if isinstance(n.op, ast.Sub):  return a - b
            if isinstance(n.op, ast.Mult): return a * b
            if isinstance(n.op, ast.Div):  return a / b
            if isinstance(n.op, ast.Pow):  return mp.power(a, b)
        raise ValueError(f"Bad numeric exponent expression: {s!r}")

    try:
        return _walk(node)
    except Exception:
        return None


def exponent_to_mpf(power: Any, symbols: Dict[str, Quantity] | None = None) -> mp.mpf:
    """
    Accepts:
      - None -> 1
      - number -> that number
      - [a, b] -> a*b
      - string numeric like "-4" or "0.5" or "(0.5)" -> numeric
      - string like "-γ" or "γ" -> symbol lookup in `symbols`
    """
    if power is None:
        return mp.mpf("1")

    if isinstance(power, (list, tuple)) and len(power) == 2:
        return _as_mpf(power[0]) * _as_mpf(power[1])

    if isinstance(power, str):
        s = power.strip()

        # NEW: allow purely-numeric exponent expressions like "(2^0.5)"
        v_num = _try_eval_numeric_exponent_expr(s)
        if v_num is not None:
            return v_num

        # existing behavior (simple numeric strings)
        if s.startswith("(") and s.endswith(")"):
            inner = s[1:-1].strip()
            try:
                return mp.mpf(inner)
            except Exception:
                pass

        try:
            return mp.mpf(s)
        except Exception:
            pass

        # fallback: symbol exponent (γ, -γ, etc.)
        if symbols is None:
            raise ValueError(f"String exponent {power!r} requires symbols lookup.")
        return _exponent_from_symbol_string(s, symbols)

    return _as_mpf(power)


def exponent_to_complex(power: Any, symbols: Dict[str, Quantity] | None = None) -> mp.mpf:
    """
    Compatibility wrapper.

    This engine allows complex VALUES, but exponents used in q_pow/units_pow
    must be REAL. So we parse exactly like exponent_to_mpf and return mp.mpf.
    """
    return exponent_to_mpf(power, symbols)


# ============================================================
# Subfactorial
# ============================================================
def _subfactorial_int(n: int) -> int:
    if n < 0:
        raise ValueError("subfactorial is only defined here for n >= 0")
    if n == 0:
        return 1
    if n == 1:
        return 0
    a, b = 1, 0
    for k in range(2, n + 1):
        a, b = b, (k - 1) * (b + a)
    return b


# ============================================================
# Expression token support
# ============================================================
_EXPR_TOKEN_RE = re.compile(r"^\s*\(.+\)\s*$")

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
    s = s.strip()
    s = s.replace("^", "**")

    # Insert explicit multiplication in common implicit cases,
    # but do NOT break function calls like Im(x), Re(x), log(x), ln(x).
    s = re.sub(r"(\d)\s*([A-Za-z_])", r"\1*\2", s)         # 2pi -> 2*pi
    s = re.sub(r"\)\s*([A-Za-z_])", r")*\1", s)           # )(x) -> )*x

    # Only insert "*" between a name and "(" if that name is NOT a supported function.
    # e.g. "a(b)" -> "a*(b)" but "log(x)" stays "log(x)"
    def _name_paren_repl(m: re.Match) -> str:
        name = m.group(1)
        if name in {"Im", "Re", "log", "ln"}:
            return f"{name}("
        return f"{name}*("

    s = re.sub(r"([A-Za-z_][A-Za-z0-9_]*)\s*\(", _name_paren_repl, s)
    s = re.sub(r"\)\s*(\d)", r")*\1", s)                  # )2 -> )*2
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


def _resolve_name_as_quantity(name: str, symbols: Dict[str, Quantity]) -> Quantity:
    if name not in symbols:
        raise KeyError(f"Unknown name in expression token: '{name}'")
    q = symbols[name]
    if not isinstance(q, Quantity):
        return _q_from_number(q)
    return q


def eval_quantity_expr(expr: str, symbols: Dict[str, Quantity]) -> Quantity:
    expr_n = _normalize_expr(expr)

    placeholder_to_key: Dict[str, str] = {}
    safe_expr = expr_n

    bad_keys = [k for k in symbols.keys() if isinstance(k, str) and not k.isidentifier()]
    bad_keys.sort(key=len, reverse=True)

    for i, key in enumerate(bad_keys):
        ph = f"SYM{i}"
        placeholder_to_key[ph] = key
        safe_expr = safe_expr.replace(key, ph)

    node = ast.parse(safe_expr, mode="eval")

    def _eval(n) -> Quantity:
        if isinstance(n, ast.Expression):
            return _eval(n.body)

        if isinstance(n, ast.Constant):
            if isinstance(n.value, (int, float)):
                return Quantity(mp.mpf(str(n.value)), {})
            raise TypeError(f"Bad constant in expression: {n.value!r}")

        if isinstance(n, ast.Name):
            real_name = placeholder_to_key.get(n.id, n.id)
            return _resolve_name_as_quantity(real_name, symbols)

        if isinstance(n, ast.Call):
            # Support a small whitelist of safe 1-arg functions: Im, Re, log
            if not isinstance(n.func, ast.Name):
                raise TypeError(
                    "Only simple function calls like Im(x), Re(x), log(x) are allowed in expression tokens.")
            fname = n.func.id
            if fname not in {"Im", "Re", "log", "ln"}:
                raise TypeError(f"Function '{fname}' is not allowed in expression tokens.")
            if len(n.args) != 1 or n.keywords:
                raise TypeError(f"Function '{fname}' must be called with exactly one positional argument.")
            q = _eval(n.args[0])

            # All these functions preserve units only if the argument is dimensionless (for log/ln)
            z = _as_mpc(q.value)

            if fname in {"Im", "Re"}:
                v = mp.im(z) if fname == "Im" else mp.re(z)
                return Quantity(v, dict(q.units))

            # log/ln: require dimensionless
            if q.units != {}:
                raise ValueError(f"log argument must be dimensionless; got units={q.units}")
            v = mp.log(z)
            if isinstance(v, mp.mpc) and v.imag == 0:
                v = v.real
            return Quantity(v, {})

        if isinstance(n, ast.UnaryOp) and type(n.op) in _ALLOWED_UNARYOPS:
            q = _eval(n.operand)
            opf = _ALLOWED_UNARYOPS[type(n.op)]
            v = opf(_as_mpc(q.value))
            if v.imag == 0:
                return Quantity(v.real, dict(q.units))
            return Quantity(v, dict(q.units))

        if isinstance(n, ast.BinOp) and type(n.op) in _ALLOWED_BINOPS:
            left = _eval(n.left)
            right = _eval(n.right)

            if type(n.op) is ast.Add:
                return q_add(left, right)
            if type(n.op) is ast.Sub:
                return q_sub(left, right)
            if type(n.op) is ast.Mult:
                return q_mul(left, right)
            if type(n.op) is ast.Div:
                return q_div(left, right)
            if type(n.op) is ast.Pow:
                # exponent must be dimensionless and real
                if right.units:
                    raise ValueError(f"Exponent must be dimensionless; got units={right.units}")
                p = right.value
                if isinstance(p, mp.mpc) and p.imag != 0:
                    raise ValueError(f"Exponent must be real; got {p!r}")
                if isinstance(p, complex) and p.imag != 0:
                    raise ValueError(f"Exponent must be real; got {p!r}")
                return q_pow(left, _as_mpf(p))

        raise TypeError(f"Unsupported expression syntax: {ast.dump(n)}")

    return _eval(node)


# ============================================================
# Factor tokens: functions + compact "token^power" parsing
# ============================================================
_ZETA_CALL_RE = re.compile(r"^\s*zeta\(\s*([+-]?\d+)\s*\)\s*$")
_SUBFACT_CALL_RE = re.compile(r"^\s*subfact\(\s*(\d+)\s*\)\s*$")
_BANG_SUBFACT_RE = re.compile(r"^\s*!\s*(\d+)\s*$")
_GAMMA_CALL_RE = re.compile(r"^\s*(?:gamma|Γ)\(\s*(.+?)\s*\)\s*$")


def _split_factor_string(s: str) -> Tuple[str, Any]:
    s = s.strip()
    if not s:
        raise ValueError("Empty factor string is not allowed.")

    depth = 0
    split_at = -1
    for i, ch in enumerate(s):
        if ch == "(":
            depth += 1
        elif ch == ")" and depth > 0:
            depth -= 1
        elif ch == "^" and depth == 0:
            split_at = i

    if split_at != -1:
        tok = s[:split_at].strip()
        pow_s = s[split_at + 1:].strip()
        if not tok:
            raise ValueError(f"Bad factor token in {s!r}")
        if not pow_s:
            raise ValueError(f"Bad factor power in {s!r}")
        return tok, pow_s

    return s, mp.mpf("1")


def _parse_factor_string_literal_first(s: str, symbols: Dict[str, Quantity]) -> Tuple[str, Any]:
    """
    Rule:
      If s exists as an exact key in symbols, treat it as a literal token with power=1.
      Otherwise, parse TOKEN^POWER at top level.
    """
    ss = s.strip()
    if not ss:
        raise ValueError("Empty factor string is not allowed.")
    if ss in symbols:
        return ss, mp.mpf("1")
    tok, pow_ = _split_factor_string(ss)
    return tok, pow_


def iter_factors(factors: Any) -> Iterable[Tuple[FactorToken, Any]]:
    """
    Supported:
      - None / {} -> yields nothing
      - dict      -> {token: power, ...}
      - list      -> items:
          * number literal                   -> factor with power 1
          * string "TOKEN" or "TOKEN^POWER"  -> parse later
          * dict {"token": TOKEN, "power": POWER}
    """
    if factors is None:
        return iter(())

    def _gen_from_list(lst: list) -> Iterable[Tuple[FactorToken, Any]]:
        for item in lst:
            if isinstance(item, numbers.Real) and not isinstance(item, bool):
                yield item, mp.mpf("1")
                continue
            if isinstance(item, str):
                s = item.strip()
                if not s:
                    raise ValueError("Empty factor string is not allowed.")
                yield s, None
                continue
            if isinstance(item, dict):
                if "token" in item:
                    tok = item["token"]
                elif "id" in item:
                    tok = item["id"]
                else:
                    raise TypeError(f"Dict factor item missing 'token'/'id': {item!r}")
                pow_ = item.get("power", mp.mpf("1"))
                yield tok, pow_
                continue
            raise TypeError(f"Bad factor list item: {item!r}")

    if isinstance(factors, Mapping):
        def _gen_from_map(m: Mapping) -> Iterable[Tuple[FactorToken, Any]]:
            for k, v in m.items():
                yield k, v
        return _gen_from_map(factors)

    if isinstance(factors, list):
        return _gen_from_list(factors)

    raise TypeError(f"Factors must be a dict or list. Got {type(factors).__name__}: {factors!r}")


def _resolve_token_to_quantity(token: FactorToken, symbols: Dict[str, Quantity]) -> Quantity:
    # numeric literal -> mp immediately
    if isinstance(token, numbers.Real) and not isinstance(token, bool):
        return Quantity(mp.mpf(str(token)), {})

    tok = str(token).strip()

    # numeric string tokens
    try:
        return Quantity(mp.mpf(tok), {})
    except Exception:
        pass

    if tok == "ten":
        raise ValueError("Token 'ten' is not allowed.")

    # Expression token
    if _EXPR_TOKEN_RE.match(tok) or _NUMERIC_EXPR_RE.match(tok):
        return eval_quantity_expr(tok, symbols)

    # Function tokens
    m = _ZETA_CALL_RE.match(tok)
    if m:
        n = int(m.group(1))
        z = mp.zeta(n)
        if isinstance(z, mp.mpc) and z.imag == 0:
            z = z.real
        return Quantity(z, {})

    m2 = _SUBFACT_CALL_RE.match(tok)
    if m2:
        n = int(m2.group(1))
        return Quantity(mp.mpf(str(_subfactorial_int(n))), {})

    m3 = _BANG_SUBFACT_RE.match(tok)
    if m3:
        n = int(m3.group(1))
        return Quantity(mp.mpf(str(_subfactorial_int(n))), {})

    mg = _GAMMA_CALL_RE.match(tok)
    if mg:
        arg_s = mg.group(1).strip()

        # Evaluate the argument as a dimensionless quantity.
        # This lets you do gamma(5), gamma(zhe_2), gamma(1/2), gamma((1+zhe_1)/2), etc.
        qarg = eval_quantity_expr(f"({arg_s})", symbols)

        if qarg.units != {}:
            raise ValueError(f"gamma argument must be dimensionless; got units={qarg.units}")

        z = _as_mpc(qarg.value)  # mp.gamma supports complex too
        g = mp.gamma(z)

        if isinstance(g, mp.mpc) and g.imag == 0:
            g = g.real

        return Quantity(g, {})

    if tok not in symbols:
        raise KeyError(f"Token '{tok}' not found in symbols table.")
    q = symbols[tok]
    if not isinstance(q, Quantity):
        return Quantity(mp.mpf(str(q)), {})
    return q


def factor_product(factors: Any, symbols: Dict[str, Quantity]) -> Quantity:
    """Multiply factors into a Quantity."""
    prod = Quantity(mp.mpc(1, 0), {})

    for token, power in iter_factors(factors):

        # numbers
        if isinstance(token, numbers.Real) and not isinstance(token, bool):
            base = _resolve_token_to_quantity(token, symbols)
            p = exponent_to_complex(mp.mpf("1") if power is None else power, symbols)
            prod = q_mul(prod, q_pow(base, p))
            continue

        # strings: literal-vs-power decision when power is None
        if isinstance(token, str):
            if power is None:
                tok_s, pow_raw = _parse_factor_string_literal_first(token, symbols)
                base = _resolve_token_to_quantity(tok_s, symbols)
                p = exponent_to_complex(pow_raw, symbols)
                prod = q_mul(prod, q_pow(base, p))
                continue

            # explicit power provided
            tok_s = token.strip()
            base = _resolve_token_to_quantity(tok_s, symbols)
            p = exponent_to_complex(power, symbols)
            prod = q_mul(prod, q_pow(base, p))
            continue

        # dict-key / other token types
        base = _resolve_token_to_quantity(token, symbols)
        p = exponent_to_complex(power, symbols)
        prod = q_mul(prod, q_pow(base, p))

    return prod


def fraction(numerator: Any, denominator: Any, symbols: Dict[str, Quantity]) -> Quantity:
    num = factor_product(numerator, symbols)
    den = factor_product(denominator, symbols)
    return q_div(num, den)


# ============================================================
# Root-transform expression evaluator
# ============================================================
def _quantity_from_number(x: Any) -> Quantity:
    return Quantity(mp.mpf(str(x)), {})


def _to_dimensionless_real(q: Quantity) -> mp.mpf:
    if q.units:
        raise ValueError(f"Exponent must be dimensionless, got units={q.units}")
    v = q.value
    if isinstance(v, mp.mpc):
        if v.imag != 0:
            raise ValueError(f"Exponent must be real, got {v!r}")
        return v.real
    if isinstance(v, complex):
        if v.imag != 0:
            raise ValueError(f"Exponent must be real, got {v!r}")
        return mp.mpf(str(v.real))
    return _as_mpf(v)


def eval_quantity_expression(expr: str, symbols: Dict[str, Quantity]) -> Quantity:
    if not isinstance(expr, str) or not expr.strip():
        raise ValueError("root_transform.id must be a non-empty string")

    src = expr.strip().replace("^", "**")
    node = ast.parse(src, mode="eval")

    def walk(n: ast.AST) -> Quantity:
        if isinstance(n, ast.Expression):
            return walk(n.body)

        if isinstance(n, ast.Constant) and isinstance(n.value, (int, float)):
            return _quantity_from_number(n.value)

        if isinstance(n, ast.Name):
            name = n.id
            if name not in symbols:
                raise KeyError(f"Root expression name '{name}' not found in symbols table.")
            return symbols[name]

        if isinstance(n, ast.UnaryOp) and isinstance(n.op, (ast.UAdd, ast.USub)):
            v = walk(n.operand)
            if isinstance(n.op, ast.UAdd):
                return v
            return q_mul(_quantity_from_number(mp.mpf("-1")), v)

        if isinstance(n, ast.BinOp):
            a = walk(n.left)
            b = walk(n.right)

            if isinstance(n.op, ast.Add):
                return q_add(a, b)
            if isinstance(n.op, ast.Sub):
                return q_sub(a, b)
            if isinstance(n.op, ast.Mult):
                return q_mul(a, b)
            if isinstance(n.op, ast.Div):
                return q_div(a, b)
            if isinstance(n.op, ast.Pow):
                exp = _to_dimensionless_real(b)
                return q_pow(a, exp)

        raise ValueError(f"Unsupported syntax in root_transform.id: {expr!r}")

    return walk(node)


# ============================================================
# Main evaluator
# ============================================================
def evaluate_constant(recipe: dict, symbols: Dict[str, Quantity], inversion_boundary_token: str = "IB") -> Quantity:
    """
    Evaluate:
      Constant = EG * EB * (1 + IG * R * IB)

    IG*R*IB must be dimensionless.
    """
    EG = fraction(
        recipe["external_geometry"]["numerator"],
        recipe["external_geometry"]["denominator"],
        symbols,
    )

    EB = fraction(
        recipe["external_boundary"]["numerator"],
        recipe["external_boundary"]["denominator"],
        symbols,
    )

    IG = fraction(
        recipe["inversion_geometry"]["numerator"],
        recipe["inversion_geometry"]["denominator"],
        symbols,
    )

    rt = recipe["root_transform"]
    R_id = rt["id"]
    R_power = exponent_to_mpf(rt.get("power", mp.mpf("1")), symbols)

    if isinstance(R_id, str) and any(op in R_id for op in "+-*/()^ "):
        R_base = eval_quantity_expression(R_id, symbols)
    else:
        if R_id not in symbols:
            raise KeyError(f"Root token '{R_id}' not found in symbols table.")
        R_base = symbols[R_id]

    R = q_pow(R_base, R_power)

    if inversion_boundary_token not in symbols:
        raise KeyError(f"Inversion boundary token '{inversion_boundary_token}' not found in symbols table.")
    IB = symbols[inversion_boundary_token]

    term = q_mul(q_mul(IG, R), IB)

    one = Quantity(mp.mpf("1"), {})
    if term.units != one.units:
        raise ValueError(f"{recipe.get('constant_id')} has non-dimensionless IG*R*IB: units={term.units}")

    inner = q_add(one, term)

    # --- NEW: per-recipe combine mode ---
    # Default is multiply: EG*EB*(1 + term)
    # Optional add:        EG + EB*(1 + term)
    # Optional subtract:   EG*EB - (1 + term)
    combine = (recipe.get("combine", "*") or "*").strip().lower()

    if combine in {"*", "mul", "multiply"}:
        left = q_mul(EG, EB)
        return q_mul(left, inner)

    if combine in {"+", "add", "plus"}:
        return q_add(EG, q_mul(EB, inner))

    if combine in {"-", "sub", "subtract"}:
        left = q_mul(EG, EB)
        # inner is dimensionless, so left must be dimensionless too
        if left.units != {}:
            raise ValueError(
                f"{recipe.get('constant_id')} combine='-' requires EG*EB dimensionless; got units={left.units}"
            )
        return q_sub(left, inner)

    raise ValueError(
        f"{recipe.get('constant_id')} has invalid combine={recipe.get('combine')!r}; use '*', '+', or '-'"
    )


