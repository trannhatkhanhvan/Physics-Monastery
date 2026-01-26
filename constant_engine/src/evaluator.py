from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Any


FactorMap = Dict[str, float]


@dataclass(frozen=True)
class RootTransform:
    id: str
    power: int = 1
    variant: str | None = None


def factor_from_map(factors: FactorMap, symbols: Dict[str, float]) -> float:
    """
    Multiply tokens^exponent for a dict like {"m": 1, "s": -2, "q_p": 2}.
    Exponents are expected to be integers.
    """
    if not factors:
        return 1.0

    out = 1.0
    for token, exp in factors.items():
        exp = float(exp)
        if exp == 0:
            continue
        if token not in symbols:
            raise KeyError(
                f"Token '{token}' not found in symbols table. "
                f"Add it to symbols.csv."
            )
        out *= symbols[token] ** exp
    return out


def fraction(num: FactorMap, den: FactorMap, symbols: Dict[str, float]) -> float:
    return factor_from_map(num, symbols) / factor_from_map(den, symbols)


def root_value(root: RootTransform, symbols: Dict[str, float]) -> float:
    """
    For now, treat root transforms as tokens in the same symbols table.
    Example: symbols["zhe_theta"] = <numeric root value>
    """
    if root.id not in symbols:
        raise KeyError(
            f"Root transform '{root.id}' not found in symbols table. "
            f"Add it to symbols.csv (or implement it as a computed function later)."
        )
    base = symbols[root.id]
    # Optional: variant handling can be layered in later
    return base ** root.power


def evaluate_constant(recipe: Dict[str, Any], symbols: Dict[str, float], inversion_boundary_token: str = "IB") -> float:
    """
    Binomial constructor:
        Constant = (EG * EB) * (1 + (IG * R * IB))
    Where:
        EG = external_geometry numerator/denominator (FactorMaps)
        EB = external_boundary numerator/denominator (FactorMaps)
        IG = inversion_geometry numerator/denominator (FactorMaps)
        R  = root transform value
        IB = fixed inversion boundary (implicit)
    """
    eg_num = recipe["external_geometry"]["numerator"]
    eg_den = recipe["external_geometry"]["denominator"]

    eb_num = recipe["external_boundary"]["numerator"]
    eb_den = recipe["external_boundary"]["denominator"]

    ig_num = recipe["inversion_geometry"]["numerator"]
    ig_den = recipe["inversion_geometry"]["denominator"]

    root = RootTransform(
        id=recipe["root_transform"]["id"],
        power=int(recipe["root_transform"].get("power", 1)),
        variant=recipe["root_transform"].get("variant")
    )

    EG = fraction(eg_num, eg_den, symbols)
    EB = fraction(eb_num, eb_den, symbols)
    IG = fraction(ig_num, ig_den, symbols)
    R = root_value(root, symbols)

    if inversion_boundary_token not in symbols:
        raise KeyError(
            f"Fixed inversion boundary token '{inversion_boundary_token}' missing in symbols.csv."
        )
    IB = symbols[inversion_boundary_token]

    return (EG * EB) * (1.0 + (IG * R * IB))
