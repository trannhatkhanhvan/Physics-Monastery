#!/usr/bin/env python3

import json
import math
from pathlib import Path

import snappy
from spherogram import Link


HERE = Path(__file__).resolve().parent

CUSP_TRIANGLES_PATH = (
    HERE.parent /
    "data" /
    "generated" /
    "m129_cusp_triangles.json"
)

WHITEHEAD_LINK_NAME = "5^2_1"

SURVIVING_CUSP = 0
FILLED_CUSP = 1

VIEWER_SLOPE = (3, -1)

SAMPLES = [
    0.00,
    0.25,
    0.50,
    0.75,
    1.00,
]


def viewer_slope_to_link_basis(
    slope,
):
    """
    Certified basis conversion already established:

        mu_view = mu_link
        lambda_view =
            2 mu_link - lambda_link

    Therefore

        (p,q)_view
            ->
        (p + 2q, -q)_link

    and

        (3,-1)_view -> (1,1)_link.
    """

    p, q = slope

    return (
        p + 2 * q,
        -q,
    )


def build_link_derived_m129():
    whitehead = Link(
        WHITEHEAD_LINK_NAME
    )

    rebuilt = Link(
        whitehead.PD_code()
    )

    return rebuilt.exterior()


def complex_point(point):
    return complex(
        float(point["re"]),
        float(point["im"]),
    )


def triangle_ratio(points):
    """
    Normalize a Euclidean triangle by

        P0 -> 0
        P1 -> 1.

    Its intrinsic oriented similarity class is then

        r = (P2-P0)/(P1-P0).
    """

    p0, p1, p2 = [
        complex_point(point)
        for point in points
    ]

    denominator = (
        p1 - p0
    )

    if abs(denominator) < 1e-12:
        raise ValueError(
            "Degenerate reference edge."
        )

    return (
        p2 - p0
    ) / denominator


def z_value(z):
    return z


def zp_value(z):
    return 1 / (1 - z)


def zpp_value(z):
    return (z - 1) / z


SHAPE_FUNCTIONS = {
    "z": z_value,
    "zp": zp_value,
    "zpp": zpp_value,
}


def infer_shape_slot(
    static_ratio,
    tetrahedron_shape,
):
    candidates = {
        name:
            function(
                tetrahedron_shape
            )
        for name, function
        in SHAPE_FUNCTIONS.items()
    }

    name = min(
        candidates,
        key=lambda key:
            abs(
                candidates[key] -
                static_ratio
            ),
    )

    error = abs(
        candidates[name] -
        static_ratio
    )

    return (
        name,
        candidates[name],
        error,
    )


def main():
    data = json.loads(
        CUSP_TRIANGLES_PATH.read_text()
    )

    surviving_triangles = [
        triangle
        for triangle in data["triangles"]
        if (
            int(triangle["cusp"]) ==
            SURVIVING_CUSP
        )
    ]

    source = (
        build_link_derived_m129()
    )

    link_slope = (
        viewer_slope_to_link_basis(
            VIEWER_SLOPE
        )
    )

    source.dehn_fill(
        link_slope,
        FILLED_CUSP,
    )

    print("=" * 72)
    print(
        "3-MANIFOLD SURGERY EXPLORER — "
        "DEHN CUSP TRIANGLE PROBE"
    )
    print("=" * 72)
    print()

    print(
        "viewer slope:       "
        f"{VIEWER_SLOPE}"
    )

    print(
        "SnapPy/link slope:  "
        f"{link_slope}"
    )

    print(
        "surviving cusp:     "
        f"{SURVIVING_CUSP}"
    )

    print(
        "persistent triangles:"
        f" {len(surviving_triangles)}"
    )

    print()


    # --------------------------------------------------------
    # Complete m129 reference structure.
    #
    # Infer, from the already-certified developed cusp,
    # whether each persistent triangle carries z, z', or z''.
    # --------------------------------------------------------

    reference = source.copy()

    reference.set_target_holonomy(
        0j,
        FILLED_CUSP,
    )

    reference_shapes = [
        complex(shape)
        for shape in
        reference.tetrahedra_shapes(
            "rect"
        )
    ]

    triangle_shape_slots = {}

    print("=" * 72)
    print(
        "PERSISTENT TRIANGLE SHAPE IDENTIFICATION"
    )
    print("=" * 72)
    print()

    max_reference_error = 0.0

    for triangle in surviving_triangles:
        triangle_id = triangle["id"]

        tetrahedron = int(
            triangle["tetrahedron"]
        )

        ideal_vertex = int(
            triangle["ideal_vertex"]
        )

        static_ratio = (
            triangle_ratio(
                triangle["points"]
            )
        )

        (
            shape_slot,
            predicted_ratio,
            error,
        ) = infer_shape_slot(
            static_ratio,
            reference_shapes[
                tetrahedron
            ],
        )

        triangle_shape_slots[
            triangle_id
        ] = shape_slot

        max_reference_error = max(
            max_reference_error,
            error,
        )

        print(
            f"{triangle_id:5s}  "
            f"tet={tetrahedron}  "
            f"vertex={ideal_vertex}  "
            f"slot={shape_slot:3s}  "
            f"static="
            f"{static_ratio.real:+.9f}"
            f"{static_ratio.imag:+.9f}i  "
            f"error={error:.3e}"
        )

    print()

    print(
        "maximum t=0 ratio error: "
        f"{max_reference_error:.3e}"
    )

    if max_reference_error > 1e-8:
        raise SystemExit(
            "FAILED: persistent triangle "
            "shape identification is not exact."
        )

    print(
        "REFERENCE TRIANGLE IDENTIFICATION: PASS"
    )

    print()


    # --------------------------------------------------------
    # Follow those SAME persistent triangles through the
    # genuine Dehn deformation.
    # --------------------------------------------------------

    for t in SAMPLES:
        state = source.copy()

        requested_holonomy = (
            2j *
            math.pi *
            t
        )

        state.set_target_holonomy(
            requested_holonomy,
            FILLED_CUSP,
        )

        tetrahedron_shapes = [
            complex(shape)
            for shape in
            state.tetrahedra_shapes(
                "rect"
            )
        ]

        cusp_shape = complex(
            state.cusp_info(
                SURVIVING_CUSP
            )["shape"]
        )

        print("=" * 72)
        print(
            f"t = {t:.2f}"
        )
        print("=" * 72)

        print(
            "volume: "
            f"{state.volume()}"
        )

        print(
            "surviving cusp shape: "
            f"{cusp_shape.real:+.12f} "
            f"{cusp_shape.imag:+.12f}i"
        )

        print()

        for triangle in (
            surviving_triangles
        ):
            triangle_id = (
                triangle["id"]
            )

            tetrahedron = int(
                triangle[
                    "tetrahedron"
                ]
            )

            slot = (
                triangle_shape_slots[
                    triangle_id
                ]
            )

            z = (
                tetrahedron_shapes[
                    tetrahedron
                ]
            )

            ratio = (
                SHAPE_FUNCTIONS[
                    slot
                ](z)
            )

            print(
                f"{triangle_id:5s}  "
                f"{slot:3s}  "
                f"r(t)="
                f"{ratio.real:+.12f} "
                f"{ratio.imag:+.12f}i"
            )

        print()

    endpoint = source.copy()

    endpoint.set_target_holonomy(
        2j * math.pi,
        FILLED_CUSP,
    )

    filled = (
        endpoint
        .filled_triangulation(
            [FILLED_CUSP]
        )
    )

    target = (
        __import__("snappy")
        .Manifold("m004")
    )

    print("=" * 72)
    print("ENDPOINT")
    print("=" * 72)

    print(
        "volume: "
        f"{endpoint.volume()}"
    )

    print(
        "isometric to m004: "
        f"{filled.is_isometric_to(target)}"
    )


if __name__ == "__main__":
    main()
