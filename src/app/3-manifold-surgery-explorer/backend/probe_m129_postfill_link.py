#!/usr/bin/env python3

from __future__ import annotations

import snappy
from spherogram import Link


SOURCE_LINK = "5^2_1"
TARGET_MANIFOLD = "m004"

FILLED_CUSP = 1
SNAPPY_SLOPE = (1, 1)


def identify_strings(manifold):
    try:
        return [
            str(item)
            for item in manifold.identify()
        ]
    except Exception:
        return []


def main():
    print("=" * 72)
    print("m129 -> m004 SNAPpy POST-FILL LINK RECOVERY")
    print("=" * 72)
    print()

    # --------------------------------------------------------
    # Build the authoritative Whitehead-link exterior from
    # Spherogram, not from a census-name shortcut.
    # --------------------------------------------------------

    source_link = Link(
        SOURCE_LINK
    )

    source = source_link.exterior()

    target = snappy.Manifold(
        TARGET_MANIFOLD
    )

    print("source link:", SOURCE_LINK)
    print("source cusps:", source.num_cusps())
    print(
        "source signature:",
        source.isometry_signature(),
    )

    print()

    # --------------------------------------------------------
    # Perform the certified SnapPy Dehn filling.
    # --------------------------------------------------------

    filled_description = (
        source.copy()
    )

    filled_description.dehn_fill(
        SNAPPY_SLOPE,
        FILLED_CUSP,
    )

    postfill_exterior = (
        filled_description
        .filled_triangulation()
    )

    print(
        "filled cusp:",
        FILLED_CUSP,
    )

    print(
        "SnapPy slope:",
        SNAPPY_SLOPE,
    )

    print(
        "post-fill cusps:",
        postfill_exterior.num_cusps(),
    )

    print(
        "post-fill signature:",
        postfill_exterior.isometry_signature(),
    )

    print(
        "post-fill identify:",
        identify_strings(
            postfill_exterior
        ),
    )

    endpoint_ok = (
        postfill_exterior
        .is_isometric_to(
            target
        )
    )

    print(
        "post-fill isometric to m004:",
        endpoint_ok,
    )

    if not endpoint_ok:
        raise SystemExit(
            "CERTIFICATION FAILED: "
            "post-fill exterior is not m004."
        )

    print()

    # --------------------------------------------------------
    # Ask SnapPy itself to recover a planar knot diagram for
    # the resulting one-cusped exterior.
    #
    # Fixed seed makes the diagram reproducible.
    # --------------------------------------------------------

    print("=" * 72)
    print("SNAPPY exterior_to_link()")
    print("=" * 72)
    print()

    recovered = (
        postfill_exterior
        .exterior_to_link(
            check_input=True,
            check_answer=True,
            careful_perturbation=True,
            simplify_link=True,
            pachner_search_tries=20,
            seed=1729,
        )
    )

    print(
        "recovered link:",
        recovered,
    )

    print(
        "components:",
        len(
            recovered.link_components
        ),
    )

    print(
        "crossings:",
        len(
            recovered.crossings
        ),
    )

    print()

    print(
        "PD code:"
    )

    print(
        recovered.PD_code()
    )

    print()

    try:
        print(
            "DT code:",
            recovered.DT_code(),
        )
    except Exception as exc:
        print(
            "DT code unavailable:",
            exc,
        )

    print()

    recovered_exterior = (
        recovered.exterior()
    )

    recovered_ok = (
        recovered_exterior
        .is_isometric_to(
            target
        )
    )

    print(
        "recovered exterior signature:",
        recovered_exterior
        .isometry_signature(),
    )

    print(
        "recovered exterior isometric to m004:",
        recovered_ok,
    )

    print(
        "recovered identify:",
        identify_strings(
            recovered_exterior
        ),
    )

    if (
        len(
            recovered.link_components
        ) != 1
    ):
        raise SystemExit(
            "CERTIFICATION FAILED: "
            "recovered post-fill diagram is not one component."
        )

    if not recovered_ok:
        raise SystemExit(
            "CERTIFICATION FAILED: "
            "recovered diagram exterior is not m004."
        )

    print()

    print("=" * 72)
    print("TARGET 4_1 REFERENCE")
    print("=" * 72)
    print()

    reference = Link("4_1")

    print(
        "reference PD:"
    )

    print(
        reference.PD_code()
    )

    try:
        print(
            "reference DT:",
            reference.DT_code(),
        )
    except Exception:
        pass

    print(
        "reference exterior signature:",
        reference
        .exterior()
        .isometry_signature(),
    )

    print()

    print(
        "POST-FILL KNOT DIAGRAM CERTIFIED"
    )


if __name__ == "__main__":
    main()
