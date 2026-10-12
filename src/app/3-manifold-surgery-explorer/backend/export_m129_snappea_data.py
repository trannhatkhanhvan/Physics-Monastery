#!/usr/bin/env python3

from pathlib import Path

from dehn_cusp_development_probe import (
    FILLED_CUSP,
    VIEWER_SLOPE,
    build_link_derived_m129,
    viewer_slope_to_link_basis,
)


HERE = Path(__file__).resolve().parent

OUTPUT = (
    HERE /
    "m129_marked.snappea"
)


def main():
    #
    # IMPORTANT:
    #
    # Use the exact same link-derived m129 object that drives the
    # certified Dehn path.
    #
    # Do NOT replace this with snappy.Manifold("m129").
    #
    # The census manifold is isometric to this exterior, but its
    # cusp/peripheral marking is not the marking used by our surgery
    # explorer.  The certified slope relation
    #
    #     viewer (3,-1) -> link-derived SnapPy (1,1)
    #
    # belongs to this object.
    #
    manifold = (
        build_link_derived_m129()
    )

    link_slope = (
        viewer_slope_to_link_basis(
            VIEWER_SLOPE
        )
    )

    if link_slope != (1, 1):
        raise RuntimeError(
            "Certified basis conversion failed: "
            f"{VIEWER_SLOPE} -> {link_slope}"
        )

    data = manifold._to_string()

    OUTPUT.write_text(
        data
    )

    print(
        "LINK-DERIVED SNAPPY EXPORT COMPLETE"
    )

    print(
        "file:",
        OUTPUT
    )

    print(
        "tetrahedra:",
        manifold.num_tetrahedra()
    )

    print(
        "cusps:",
        manifold.num_cusps()
    )

    print(
        "decorated isosig:",
        manifold.triangulation_isosig(
            decorated=True
        )
    )

    print(
        "filled cusp:",
        FILLED_CUSP
    )

    print(
        "viewer slope:",
        VIEWER_SLOPE
    )

    print(
        "link-derived SnapPy slope:",
        link_slope
    )

    #
    # Independent endpoint certification before Regina sees the file.
    #
    test = manifold.copy()

    test.dehn_fill(
        link_slope,
        FILLED_CUSP,
    )

    endpoint = (
        test.filled_triangulation(
            [FILLED_CUSP]
        )
    )

    endpoint_sig = (
        endpoint.triangulation_isosig(
            decorated=False
        )
    )

    print(
        "certified filled endpoint:",
        endpoint_sig
    )

    if endpoint_sig != "cPcbbbiht":
        raise RuntimeError(
            "Link-derived exported marking does not "
            "produce native m004 under the certified filling. "
            f"Got {endpoint_sig}."
        )

    print(
        "PASS: exported marking is the certified "
        "m129 -> m004 surgery marking."
    )


if __name__ == "__main__":
    main()
