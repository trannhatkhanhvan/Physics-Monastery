#!/usr/bin/env python3

from math import gcd

try:
    import snappy
except ImportError as exc:
    raise SystemExit(
        "SnapPy is not installed in the active Python environment.\n"
        "Activate the environment you want to use for the surgery backend "
        "and install SnapPy there before running this diagnostic."
    ) from exc


FIGURE_EIGHT_NAME = "m004"
WHITEHEAD_NAME = "m129"

MAX_SLOPE = 8


def primitive_slopes(limit):
    """
    Enumerate primitive unoriented slopes (p, q).

    Since (p, q) and (-p, -q) represent the same unoriented slope,
    retain only one representative of each pair.
    """
    slopes = []

    for p in range(-limit, limit + 1):
        for q in range(-limit, limit + 1):
            if p == 0 and q == 0:
                continue

            if gcd(abs(p), abs(q)) != 1:
                continue

            # Canonical representative of {(p,q), (-p,-q)}.
            if p < 0 or (p == 0 and q < 0):
                continue

            slopes.append((p, q))

    return slopes


def filled_one_cusp(manifold, cusp_index, slope):
    """
    Fill one cusp and convert the result to an actual triangulation
    with that filled cusp removed.

    The other cusp remains complete.
    """
    candidate = manifold.copy()

    candidate.dehn_fill(slope, cusp_index)

    return candidate.filled_triangulation()


def is_figure_eight(candidate, target):
    """
    First use SnapPy's hyperbolic isometry test.

    This is a discovery diagnostic. Once the correct edge is located,
    we will add the stronger peripheral/certification layer separately.
    """
    try:
        return bool(candidate.is_isometric_to(target))
    except Exception:
        return False


def describe_manifold(label, manifold):
    print(label)
    print(f"  name:            {manifold.name()}")
    print(f"  tetrahedra:      {manifold.num_tetrahedra()}")
    print(f"  cusps:           {manifold.num_cusps()}")
    print(f"  volume:          {manifold.volume()}")
    print()


def main():
    figure_eight = snappy.Manifold(FIGURE_EIGHT_NAME)
    whitehead = snappy.Manifold(WHITEHEAD_NAME)

    print("=" * 72)
    print("3-MANIFOLD SURGERY EXPLORER — FIRST EDGE PROBE")
    print("=" * 72)
    print()

    describe_manifold("TARGET", figure_eight)
    describe_manifold("SOURCE", whitehead)

    if figure_eight.num_cusps() != 1:
        raise SystemExit(
            f"Expected {FIGURE_EIGHT_NAME} to have 1 cusp, "
            f"found {figure_eight.num_cusps()}."
        )

    if whitehead.num_cusps() != 2:
        raise SystemExit(
            f"Expected {WHITEHEAD_NAME} to have 2 cusps, "
            f"found {whitehead.num_cusps()}."
        )

    matches = []

    for cusp_index in range(whitehead.num_cusps()):
        for slope in primitive_slopes(MAX_SLOPE):
            try:
                candidate = filled_one_cusp(
                    whitehead,
                    cusp_index,
                    slope,
                )
            except Exception:
                continue

            if candidate.num_cusps() != 1:
                continue

            if is_figure_eight(candidate, figure_eight):
                matches.append(
                    {
                        "cusp_index": cusp_index,
                        "slope": slope,
                        "volume": candidate.volume(),
                        "tetrahedra": candidate.num_tetrahedra(),
                    }
                )

    print("=" * 72)
    print("MATCHES")
    print("=" * 72)

    if not matches:
        print(
            f"No filling of m129 with |p|,|q| <= {MAX_SLOPE} "
            "was identified as m004."
        )
        print()
        print(
            "This is a diagnostic result, not a reason to change conventions "
            "or hard-code a slope. We would inspect the peripheral data next."
        )
        raise SystemExit(1)

    for index, match in enumerate(matches, start=1):
        cusp_index = match["cusp_index"]
        p, q = match["slope"]

        print(f"{index}.")
        print(f"   source:       {WHITEHEAD_NAME}")
        print(f"   filled cusp:  {cusp_index}")
        print(f"   slope:        ({p}, {q})")
        print(f"   target:       {FIGURE_EIGHT_NAME}")
        print(f"   tetrahedra:   {match['tetrahedra']}")
        print(f"   volume:       {match['volume']}")
        print()

    print(
        "IMPORTANT: these are candidate surgery descriptions in SnapPy's "
        "current peripheral basis."
    )
    print(
        "The next stage will select the intended crossing-circle cusp and "
        "certify the peripheralized recovery map rather than choosing a "
        "candidate by name or visual resemblance."
    )


if __name__ == "__main__":
    main()
