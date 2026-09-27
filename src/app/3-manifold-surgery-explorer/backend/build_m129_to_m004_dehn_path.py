#!/usr/bin/env python3

import json
import math
from pathlib import Path

import snappy

from dehn_cusp_development_probe import (
    CUSP_TRIANGLES_PATH,
    FILLED_CUSP,
    SHAPE_FUNCTIONS,
    SURVIVING_CUSP,
    VIEWER_SLOPE,
    build_link_derived_m129,
    build_static_connectivity,
    develop_cusp,
    infer_shape_slot,
    recover_peripheral_translations,
    triangle_ratio_from_points,
    triangle_static_points,
    viewer_slope_to_link_basis,
)


HERE = Path(__file__).resolve().parent

OUTPUT_PATH = (
    HERE.parent /
    "data" /
    "generated" /
    "m129_to_m004_dehn_path.json"
)

SAMPLE_COUNT = 201

MAX_SHAPE_SLOT_ERROR = 1e-10
MAX_TRIANGLE_CLOSURE_ERROR = 1e-9
MAX_PERIPHERAL_RESIDUAL = 1e-9
MAX_TAU_ERROR = 1e-9
MAX_HOLONOMY_ERROR = 1e-9
MAX_START_POINT_ERROR = 1e-9


def complex_json(value):
    z = complex(value)

    return {
        "re": float(z.real),
        "im": float(z.imag),
    }


def point_list_json(points):
    return [
        complex_json(point)
        for point in points
    ]


def max_developed_point_error(
    developed,
    static_points,
):
    error = 0.0

    for triangle_id, points in (
        developed.items()
    ):
        reference = static_points[
            triangle_id
        ]

        for current, expected in zip(
            points,
            reference,
        ):
            error = max(
                error,
                abs(
                    current -
                    expected
                ),
            )

    return error


def main():
    print("=" * 72)
    print(
        "3-MANIFOLD SURGERY EXPLORER — "
        "BUILD m129 -> m004 DEHN PATH"
    )
    print("=" * 72)
    print()

    data = json.loads(
        CUSP_TRIANGLES_PATH.read_text()
    )

    triangles = [
        triangle
        for triangle in data["triangles"]
        if (
            int(triangle["cusp"]) ==
            SURVIVING_CUSP
        )
    ]

    if len(triangles) != 8:
        raise RuntimeError(
            "Expected exactly 8 persistent "
            "surviving-cusp triangles."
        )

    source = (
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

    source.dehn_fill(
        link_slope,
        FILLED_CUSP,
    )

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

    shape_slots = {}

    max_shape_slot_error = 0.0

    for triangle in triangles:
        triangle_id = triangle["id"]

        tetrahedron = int(
            triangle["tetrahedron"]
        )

        static_ratio = (
            triangle_ratio_from_points(
                triangle_static_points(
                    triangle
                )
            )
        )

        slot, error = (
            infer_shape_slot(
                static_ratio,
                reference_shapes[
                    tetrahedron
                ],
            )
        )

        shape_slots[
            triangle_id
        ] = slot

        max_shape_slot_error = max(
            max_shape_slot_error,
            error,
        )

    if (
        max_shape_slot_error >
        MAX_SHAPE_SLOT_ERROR
    ):
        raise RuntimeError(
            "Persistent triangle shape-slot "
            "identification failed: "
            f"{max_shape_slot_error:.3e}"
        )

    cusp_translation = next(
        record
        for record in
        data["cusp_translations"]
        if (
            int(record["cusp"]) ==
            SURVIVING_CUSP
        )
    )

    static_meridian = complex(
        float(
            cusp_translation[
                "meridian"
            ]["re"]
        ),
        float(
            cusp_translation[
                "meridian"
            ]["im"]
        ),
    )

    static_longitude = complex(
        float(
            cusp_translation[
                "longitude"
            ]["re"]
        ),
        float(
            cusp_translation[
                "longitude"
            ]["im"]
        ),
    )

    connectivity = (
        build_static_connectivity(
            triangles,
            static_meridian,
            static_longitude,
        )
    )

    if (
        len(
            connectivity[
                "interior_pairs"
            ]
        ) != 8
    ):
        raise RuntimeError(
            "Expected 8 interior edge pairs."
        )

    if (
        len(
            connectivity[
                "boundary_pairs"
            ]
        ) != 4
    ):
        raise RuntimeError(
            "Expected 4 boundary edge pairs."
        )

    states = []

    worst_triangle_closure = 0.0
    worst_peripheral_residual = 0.0
    worst_tau_error = 0.0
    worst_holonomy_error = 0.0

    start_point_error = None

    for index in range(
        SAMPLE_COUNT
    ):
        t = (
            index /
            (SAMPLE_COUNT - 1)
        )

        state = source.copy()

        target_holonomy = (
            2j *
            math.pi *
            t
        )

        state.set_target_holonomy(
            target_holonomy,
            FILLED_CUSP,
        )

        solution_type = str(
            state.solution_type()
        )

        if (
            "positively oriented"
            not in solution_type
        ):
            raise RuntimeError(
                "Non-geometric state at "
                f"t={t:.6f}: "
                f"{solution_type}"
            )

        tetrahedron_shapes = [
            complex(shape)
            for shape in
            state.tetrahedra_shapes(
                "rect"
            )
        ]

        developed, closure_error = (
            develop_cusp(
                triangles,
                shape_slots,
                tetrahedron_shapes,
                connectivity,
            )
        )

        (
            meridian_translation,
            longitude_translation,
            peripheral_residual,
        ) = (
            recover_peripheral_translations(
                developed,
                connectivity[
                    "boundary_pairs"
                ],
            )
        )

        viewer_tau = (
            longitude_translation /
            meridian_translation
        )

        snappy_tau = complex(
            state.cusp_info(
                SURVIVING_CUSP
            )["shape"]
        )

        expected_viewer_tau = (
            snappy_tau.conjugate() -
            2
        )

        tau_error = abs(
            viewer_tau -
            expected_viewer_tau
        )

        filled_info = (
            state.cusp_info(
                FILLED_CUSP
            )
        )

        filled_meridian, (
            filled_longitude
        ) = [
            complex(value)
            for value in
            filled_info[
                "holonomies"
            ]
        ]

        actual_filling_holonomy = (
            link_slope[0] *
            filled_meridian +
            link_slope[1] *
            filled_longitude
        )

        holonomy_error = abs(
            actual_filling_holonomy -
            target_holonomy
        )

        if index == 0:
            start_point_error = (
                max_developed_point_error(
                    developed,
                    connectivity[
                        "static_points"
                    ],
                )
            )

        worst_triangle_closure = max(
            worst_triangle_closure,
            closure_error,
        )

        worst_peripheral_residual = max(
            worst_peripheral_residual,
            peripheral_residual,
        )

        worst_tau_error = max(
            worst_tau_error,
            tau_error,
        )

        worst_holonomy_error = max(
            worst_holonomy_error,
            holonomy_error,
        )

        if (
            closure_error >
            MAX_TRIANGLE_CLOSURE_ERROR
        ):
            raise RuntimeError(
                "Triangle closure failed at "
                f"t={t:.6f}: "
                f"{closure_error:.3e}"
            )

        if (
            peripheral_residual >
            MAX_PERIPHERAL_RESIDUAL
        ):
            raise RuntimeError(
                "Peripheral reconstruction "
                "failed at "
                f"t={t:.6f}: "
                f"{peripheral_residual:.3e}"
            )

        if (
            tau_error >
            MAX_TAU_ERROR
        ):
            raise RuntimeError(
                "Viewer cusp modulus failed at "
                f"t={t:.6f}: "
                f"{tau_error:.3e}"
            )

        if (
            holonomy_error >
            MAX_HOLONOMY_ERROR
        ):
            raise RuntimeError(
                "Filling holonomy failed at "
                f"t={t:.6f}: "
                f"{holonomy_error:.3e}"
            )

        state_triangles = {}

        for triangle in triangles:
            triangle_id = (
                triangle["id"]
            )

            state_triangles[
                triangle_id
            ] = {
                "tetrahedron":
                    int(
                        triangle[
                            "tetrahedron"
                        ]
                    ),

                "ideal_vertex":
                    int(
                        triangle[
                            "ideal_vertex"
                        ]
                    ),

                "shape_slot":
                    shape_slots[
                        triangle_id
                    ],

                "points":
                    point_list_json(
                        developed[
                            triangle_id
                        ]
                    ),
            }

        states.append({
            "index":
                index,

            "t":
                float(t),

            "volume":
                float(
                    state.volume()
                ),

            "solution_type":
                solution_type,

            "filling": {
                "target_holonomy":
                    complex_json(
                        target_holonomy
                    ),

                "actual_holonomy":
                    complex_json(
                        actual_filling_holonomy
                    ),

                "meridian_holonomy":
                    complex_json(
                        filled_meridian
                    ),

                "longitude_holonomy":
                    complex_json(
                        filled_longitude
                    ),
            },

            "surviving_cusp": {
                "snappy_shape":
                    complex_json(
                        snappy_tau
                    ),

                "viewer_shape":
                    complex_json(
                        viewer_tau
                    ),

                "meridian_translation":
                    complex_json(
                        meridian_translation
                    ),

                "longitude_translation":
                    complex_json(
                        longitude_translation
                    ),
            },

            "tetrahedron_shapes": [
                complex_json(shape)
                for shape in
                tetrahedron_shapes
            ],

            "triangles":
                state_triangles,

            "diagnostics": {
                "triangle_closure_error":
                    float(
                        closure_error
                    ),

                "peripheral_residual":
                    float(
                        peripheral_residual
                    ),

                "tau_error":
                    float(
                        tau_error
                    ),

                "holonomy_error":
                    float(
                        holonomy_error
                    ),
            },
        })

        if (
            index % 20 == 0 or
            index ==
            SAMPLE_COUNT - 1
        ):
            print(
                f"sample {index:3d}/"
                f"{SAMPLE_COUNT - 1}: "
                f"t={t:.3f}  "
                f"volume="
                f"{float(state.volume()):.10f}  "
                f"tau="
                f"{viewer_tau.real:+.6f}"
                f"{viewer_tau.imag:+.6f}i"
            )

    if (
        start_point_error is None or
        start_point_error >
        MAX_START_POINT_ERROR
    ):
        raise RuntimeError(
            "t=0 developed cusp does not "
            "reproduce the certified source "
            f"development: {start_point_error}"
        )

    endpoint = source.copy()

    endpoint.set_target_holonomy(
        2j * math.pi,
        FILLED_CUSP,
    )

    filled = (
        endpoint.filled_triangulation(
            [FILLED_CUSP]
        )
    )

    target = snappy.Manifold(
        "m004"
    )

    if not filled.is_isometric_to(
        target
    ):
        raise RuntimeError(
            "Final filled manifold is not m004."
        )

    endpoint_signature = (
        filled.isometry_signature()
    )

    endpoint_identification = [
        str(item)
        for item in
        filled.identify()
    ]

    output = {
        "schema":
            "physics-monastery."
            "3-manifold-surgery-explorer."
            "dehn-path.v1",

        "operation": {
            "source_manifold":
                "m129",

            "source_display_name":
                "Whitehead link complement",

            "target_manifold":
                "m004",

            "target_display_name":
                "Figure-eight knot complement",

            "surviving_cusp":
                SURVIVING_CUSP,

            "filled_cusp":
                FILLED_CUSP,

            "viewer_slope": {
                "p":
                    VIEWER_SLOPE[0],

                "q":
                    VIEWER_SLOPE[1],
            },

            "snappy_link_basis_slope": {
                "p":
                    link_slope[0],

                "q":
                    link_slope[1],
            },

            "basis_relation": {
                "description":
                    "viewer (3,-1) is "
                    "link-derived SnapPy (1,1)",

                "viewer_to_link":
                    [
                        [1, 2],
                        [0, -1],
                    ],

                "viewer_cusp_modulus_relation":
                    "conjugate(snappy_tau) - 2",
            },
        },

        "sampling": {
            "sample_count":
                SAMPLE_COUNT,

            "parameter_start":
                0.0,

            "parameter_end":
                1.0,

            "target_holonomy":
                "2*pi*i*t",
        },

        "persistent_geometry": {
            "triangle_count":
                len(triangles),

            "triangle_ids": [
                triangle["id"]
                for triangle in
                triangles
            ],

            "shape_slots":
                shape_slots,

            "interior_edge_pair_count":
                len(
                    connectivity[
                        "interior_pairs"
                    ]
                ),

            "boundary_edge_pair_count":
                len(
                    connectivity[
                        "boundary_pairs"
                    ]
                ),
        },

        "certification": {
            "endpoint_isometric_to_m004":
                True,

            "endpoint_isometry_signature":
                str(
                    endpoint_signature
                ),

            "endpoint_identify":
                endpoint_identification,

            "maximum_shape_slot_error":
                float(
                    max_shape_slot_error
                ),

            "maximum_triangle_closure_error":
                float(
                    worst_triangle_closure
                ),

            "maximum_peripheral_residual":
                float(
                    worst_peripheral_residual
                ),

            "maximum_tau_error":
                float(
                    worst_tau_error
                ),

            "maximum_holonomy_error":
                float(
                    worst_holonomy_error
                ),

            "source_development_point_error":
                float(
                    start_point_error
                ),
        },

        "states":
            states,
    }

    OUTPUT_PATH.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    OUTPUT_PATH.write_text(
        json.dumps(
            output,
            indent=2,
            sort_keys=False,
        ) +
        "\n"
    )

    print()
    print("=" * 72)
    print("DEHN PATH CERTIFIED")
    print("=" * 72)

    print(
        "samples:                       "
        f"{SAMPLE_COUNT}"
    )

    print(
        "maximum shape-slot error:      "
        f"{max_shape_slot_error:.3e}"
    )

    print(
        "maximum triangle closure:      "
        f"{worst_triangle_closure:.3e}"
    )

    print(
        "maximum peripheral residual:   "
        f"{worst_peripheral_residual:.3e}"
    )

    print(
        "maximum cusp-modulus error:    "
        f"{worst_tau_error:.3e}"
    )

    print(
        "maximum filling-holonomy error:"
        f" {worst_holonomy_error:.3e}"
    )

    print(
        "source development error:      "
        f"{start_point_error:.3e}"
    )

    print(
        "endpoint volume:               "
        f"{float(endpoint.volume()):.12f}"
    )

    print(
        "endpoint signature:            "
        f"{endpoint_signature}"
    )

    print(
        "endpoint isometric to m004:    "
        "True"
    )

    print()
    print(
        "WROTE: "
        f"{OUTPUT_PATH}"
    )


if __name__ == "__main__":
    main()
