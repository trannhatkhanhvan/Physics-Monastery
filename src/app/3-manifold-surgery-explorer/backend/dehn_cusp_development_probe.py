#!/usr/bin/env python3

import json
import math
from collections import defaultdict, deque
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
    0.10,
    0.25,
    0.50,
    0.75,
    0.90,
    1.00,
]

TOLERANCE = 1e-8


def viewer_slope_to_link_basis(
    slope,
):
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

    exterior = rebuilt.exterior()

    census = snappy.Manifold(
        "m129"
    )

    if not exterior.is_isometric_to(
        census
    ):
        raise RuntimeError(
            "Link-derived exterior is not m129."
        )

    return exterior


def point_complex(point):
    return complex(
        float(point["re"]),
        float(point["im"]),
    )


def triangle_static_points(
    triangle,
):
    return [
        point_complex(point)
        for point in triangle["points"]
    ]


def triangle_ratio_from_points(
    points,
):
    denominator = (
        points[1] -
        points[0]
    )

    if abs(denominator) < 1e-12:
        raise RuntimeError(
            "Degenerate triangle reference edge."
        )

    return (
        points[2] -
        points[0]
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
    z,
):
    candidates = {
        name: function(z)
        for name, function
        in SHAPE_FUNCTIONS.items()
    }

    slot = min(
        candidates,
        key=lambda name:
            abs(
                candidates[name] -
                static_ratio
            ),
    )

    return (
        slot,
        abs(
            candidates[slot] -
            static_ratio
        ),
    )


def canonical_triangle(
    ratio,
):
    return [
        0j,
        1 + 0j,
        ratio,
    ]


def edge_vertices(
    edge_index,
):
    return (
        edge_index,
        (edge_index + 1) % 3,
    )


def same_point(
    first,
    second,
):
    return (
        abs(first - second) <
        TOLERANCE
    )


def same_segment(
    first_a,
    first_b,
    second_a,
    second_b,
):
    return (
        (
            same_point(
                first_a,
                second_a
            ) and
            same_point(
                first_b,
                second_b
            )
        ) or
        (
            same_point(
                first_a,
                second_b
            ) and
            same_point(
                first_b,
                second_a
            )
        )
    )


def affine_from_two_points(
    local_a,
    local_b,
    global_a,
    global_b,
):
    denominator = (
        local_b -
        local_a
    )

    if abs(denominator) < 1e-12:
        raise RuntimeError(
            "Degenerate local edge."
        )

    scale_rotation = (
        global_b -
        global_a
    ) / denominator

    translation = (
        global_a -
        scale_rotation *
        local_a
    )

    return (
        scale_rotation,
        translation,
    )


def apply_affine(
    points,
    transform,
):
    scale_rotation, translation = (
        transform
    )

    return [
        scale_rotation * point +
        translation
        for point in points
    ]


def solve_real_basis_coefficients(
    vector,
    meridian,
    longitude,
):
    determinant = (
        meridian.real *
        longitude.imag -
        meridian.imag *
        longitude.real
    )

    if abs(determinant) < 1e-12:
        raise RuntimeError(
            "Degenerate peripheral basis."
        )

    m = (
        vector.real *
        longitude.imag -
        vector.imag *
        longitude.real
    ) / determinant

    l = (
        meridian.real *
        vector.imag -
        meridian.imag *
        vector.real
    ) / determinant

    return (
        m,
        l,
    )


def build_static_connectivity(
    triangles,
    meridian,
    longitude,
):
    static_points = {
        triangle["id"]:
            triangle_static_points(
                triangle
            )
        for triangle in triangles
    }

    edges = []

    for triangle in triangles:
        triangle_id = triangle["id"]

        points = static_points[
            triangle_id
        ]

        for edge_index in range(3):
            first_index, second_index = (
                edge_vertices(
                    edge_index
                )
            )

            edges.append({
                "triangle":
                    triangle_id,

                "edge":
                    edge_index,

                "first_index":
                    first_index,

                "second_index":
                    second_index,

                "first":
                    points[first_index],

                "second":
                    points[second_index],
            })

    used = set()

    interior_pairs = []

    for i, first in enumerate(edges):
        if i in used:
            continue

        for j in range(
            i + 1,
            len(edges)
        ):
            if j in used:
                continue

            second = edges[j]

            if (
                first["triangle"] ==
                second["triangle"]
            ):
                continue

            if same_segment(
                first["first"],
                first["second"],
                second["first"],
                second["second"],
            ):
                interior_pairs.append(
                    (
                        first,
                        second,
                    )
                )

                used.add(i)
                used.add(j)

                break

    boundary_edges = [
        edge
        for index, edge in enumerate(
            edges
        )
        if index not in used
    ]

    boundary_pairs = []

    boundary_used = set()

    for i, first in enumerate(
        boundary_edges
    ):
        if i in boundary_used:
            continue

        for j in range(
            i + 1,
            len(boundary_edges)
        ):
            if j in boundary_used:
                continue

            second = boundary_edges[j]

            first_vector = (
                first["second"] -
                first["first"]
            )

            second_vector = (
                second["second"] -
                second["first"]
            )

            if (
                abs(
                    first_vector +
                    second_vector
                ) >
                TOLERANCE
            ):
                continue

            translation_a = (
                second["second"] -
                first["first"]
            )

            translation_b = (
                second["first"] -
                first["second"]
            )

            if (
                abs(
                    translation_a -
                    translation_b
                ) >
                TOLERANCE
            ):
                continue

            m, l = (
                solve_real_basis_coefficients(
                    translation_a,
                    meridian,
                    longitude,
                )
            )

            rounded_m = round(m)
            rounded_l = round(l)

            if (
                abs(
                    m - rounded_m
                ) >
                1e-7 or
                abs(
                    l - rounded_l
                ) >
                1e-7
            ):
                continue

            boundary_pairs.append({
                "first":
                    first,

                "second":
                    second,

                "meridian_coefficient":
                    int(rounded_m),

                "longitude_coefficient":
                    int(rounded_l),
            })

            boundary_used.add(i)
            boundary_used.add(j)

            break

    return {
        "static_points":
            static_points,

        "interior_pairs":
            interior_pairs,

        "boundary_pairs":
            boundary_pairs,
    }


def match_shared_vertices(
    first_edge,
    second_edge,
):
    first_items = [
        (
            first_edge["first_index"],
            first_edge["first"],
        ),
        (
            first_edge["second_index"],
            first_edge["second"],
        ),
    ]

    second_items = [
        (
            second_edge["first_index"],
            second_edge["first"],
        ),
        (
            second_edge["second_index"],
            second_edge["second"],
        ),
    ]

    matches = []

    for first_index, first_point in (
        first_items
    ):
        candidate = min(
            second_items,
            key=lambda item:
                abs(
                    item[1] -
                    first_point
                ),
        )

        if (
            abs(
                candidate[1] -
                first_point
            ) >
            TOLERANCE
        ):
            raise RuntimeError(
                "Could not match shared vertices."
            )

        matches.append(
            (
                first_index,
                candidate[0],
            )
        )

    return matches


def develop_cusp(
    triangles,
    shape_slots,
    tetrahedron_shapes,
    connectivity,
):
    local_points = {}

    for triangle in triangles:
        triangle_id = triangle["id"]

        tetrahedron = int(
            triangle["tetrahedron"]
        )

        slot = shape_slots[
            triangle_id
        ]

        ratio = (
            SHAPE_FUNCTIONS[
                slot
            ](
                tetrahedron_shapes[
                    tetrahedron
                ]
            )
        )

        local_points[
            triangle_id
        ] = canonical_triangle(
            ratio
        )

    adjacency = defaultdict(list)

    for first, second in (
        connectivity[
            "interior_pairs"
        ]
    ):
        adjacency[
            first["triangle"]
        ].append(
            (
                first,
                second,
            )
        )

        adjacency[
            second["triangle"]
        ].append(
            (
                second,
                first,
            )
        )

    anchor_id = "t0v0"

    anchor_static = (
        connectivity[
            "static_points"
        ][anchor_id]
    )

    anchor_local = (
        local_points[
            anchor_id
        ]
    )

    anchor_transform = (
        affine_from_two_points(
            anchor_local[0],
            anchor_local[1],
            anchor_static[0],
            anchor_static[1],
        )
    )

    developed = {
        anchor_id:
            apply_affine(
                anchor_local,
                anchor_transform,
            )
    }

    queue = deque([
        anchor_id
    ])

    closure_error = 0.0

    while queue:
        current_id = (
            queue.popleft()
        )

        for (
            current_edge,
            neighbor_edge,
        ) in adjacency[
            current_id
        ]:
            neighbor_id = (
                neighbor_edge[
                    "triangle"
                ]
            )

            matches = (
                match_shared_vertices(
                    current_edge,
                    neighbor_edge,
                )
            )

            current_points = (
                developed[
                    current_id
                ]
            )

            neighbor_local = (
                local_points[
                    neighbor_id
                ]
            )

            first_current_index, (
                first_neighbor_index
            ) = matches[0]

            second_current_index, (
                second_neighbor_index
            ) = matches[1]

            transform = (
                affine_from_two_points(
                    neighbor_local[
                        first_neighbor_index
                    ],
                    neighbor_local[
                        second_neighbor_index
                    ],
                    current_points[
                        first_current_index
                    ],
                    current_points[
                        second_current_index
                    ],
                )
            )

            predicted = (
                apply_affine(
                    neighbor_local,
                    transform,
                )
            )

            if neighbor_id in developed:
                existing = (
                    developed[
                        neighbor_id
                    ]
                )

                closure_error = max(
                    closure_error,
                    max(
                        abs(
                            predicted[index] -
                            existing[index]
                        )
                        for index in range(3)
                    ),
                )

                continue

            developed[
                neighbor_id
            ] = predicted

            queue.append(
                neighbor_id
            )

    if len(developed) != len(
        triangles
    ):
        raise RuntimeError(
            "The developed cusp did not reach "
            "all persistent triangles."
        )

    return (
        developed,
        closure_error,
    )


def boundary_translation(
    developed,
    pair,
):
    first = pair["first"]
    second = pair["second"]

    first_points = (
        developed[
            first["triangle"]
        ]
    )

    second_points = (
        developed[
            second["triangle"]
        ]
    )

    first_start = (
        first_points[
            first["first_index"]
        ]
    )

    first_end = (
        first_points[
            first["second_index"]
        ]
    )

    second_start = (
        second_points[
            second["first_index"]
        ]
    )

    second_end = (
        second_points[
            second["second_index"]
        ]
    )

    # Boundary edges are paired with opposite
    # orientation.
    translation_a = (
        second_end -
        first_start
    )

    translation_b = (
        second_start -
        first_end
    )

    return (
        translation_a +
        translation_b
    ) / 2


def recover_peripheral_translations(
    developed,
    boundary_pairs,
):
    equations = []

    for pair in boundary_pairs:
        translation = (
            boundary_translation(
                developed,
                pair,
            )
        )

        equations.append(
            (
                pair[
                    "meridian_coefficient"
                ],
                pair[
                    "longitude_coefficient"
                ],
                translation,
            )
        )

    meridian_candidates = []

    longitude_candidates = []

    for m, l, translation in equations:
        if (
            m == 1 and
            l == 0
        ):
            meridian_candidates.append(
                translation
            )

        elif (
            m == -1 and
            l == 0
        ):
            meridian_candidates.append(
                -translation
            )

        elif (
            m == 0 and
            l == 1
        ):
            longitude_candidates.append(
                translation
            )

        elif (
            m == 0 and
            l == -1
        ):
            longitude_candidates.append(
                -translation
            )

    if (
        not meridian_candidates or
        not longitude_candidates
    ):
        raise RuntimeError(
            "Could not recover both primitive "
            "peripheral translations."
        )

    meridian = (
        sum(meridian_candidates) /
        len(meridian_candidates)
    )

    longitude = (
        sum(longitude_candidates) /
        len(longitude_candidates)
    )

    residual = 0.0

    for m, l, translation in equations:
        predicted = (
            m * meridian +
            l * longitude
        )

        residual = max(
            residual,
            abs(
                predicted -
                translation
            ),
        )

    return (
        meridian,
        longitude,
        residual,
    )


def main():
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

    max_slot_error = 0.0

    for triangle in triangles:
        triangle_id = (
            triangle["id"]
        )

        tetrahedron = int(
            triangle[
                "tetrahedron"
            ]
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

        max_slot_error = max(
            max_slot_error,
            error,
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

    print("=" * 72)
    print(
        "3-MANIFOLD SURGERY EXPLORER — "
        "DEHN CUSP DEVELOPMENT PROBE"
    )
    print("=" * 72)
    print()

    print(
        "viewer slope:        "
        f"{VIEWER_SLOPE}"
    )

    print(
        "SnapPy/link slope:   "
        f"{link_slope}"
    )

    print(
        "persistent triangles:"
        f" {len(triangles)}"
    )

    print(
        "interior edge pairs: "
        f"{len(connectivity['interior_pairs'])}"
    )

    print(
        "boundary edge pairs: "
        f"{len(connectivity['boundary_pairs'])}"
    )

    print(
        "shape-slot error:    "
        f"{max_slot_error:.3e}"
    )

    print()

    print(
        "static M:            "
        f"{static_meridian.real:+.12f} "
        f"{static_meridian.imag:+.12f}i"
    )

    print(
        "static L:            "
        f"{static_longitude.real:+.12f} "
        f"{static_longitude.imag:+.12f}i"
    )

    print(
        "static L/M:          "
        f"{(static_longitude / static_meridian).real:+.12f} "
        f"{(static_longitude / static_meridian).imag:+.12f}i"
    )

    print()

    for t in SAMPLES:
        state = source.copy()

        state.set_target_holonomy(
            2j * math.pi * t,
            FILLED_CUSP,
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
            meridian,
            longitude,
            peripheral_error,
        ) = (
            recover_peripheral_translations(
                developed,
                connectivity[
                    "boundary_pairs"
                ],
            )
        )

        developed_tau = (
            longitude /
            meridian
        )

        snappy_tau = complex(
            state.cusp_info(
                SURVIVING_CUSP
            )["shape"]
        )

        # The certified developed cusp uses the opposite
        # orientation of the complex cusp plane from SnapPy,
        # together with the integral longitude shear
        #
        #     lambda_view =
        #         lambda_oriented - 2 mu.
        #
        # Therefore
        #
        #     tau_view =
        #         conjugate(tau_SnapPy) - 2.
        expected_viewer_tau = (
            snappy_tau.conjugate() -
            2
        )

        tau_error = abs(
            developed_tau -
            expected_viewer_tau
        )

        print("=" * 72)
        print(
            f"t = {t:.2f}"
        )
        print("=" * 72)

        print(
            "volume:              "
            f"{state.volume()}"
        )

        print(
            "triangle closure:    "
            f"{closure_error:.3e}"
        )

        print(
            "peripheral residual: "
            f"{peripheral_error:.3e}"
        )

        print(
            "M(t):                "
            f"{meridian.real:+.12f} "
            f"{meridian.imag:+.12f}i"
        )

        print(
            "L(t):                "
            f"{longitude.real:+.12f} "
            f"{longitude.imag:+.12f}i"
        )

        print(
            "developed L/M:       "
            f"{developed_tau.real:+.12f} "
            f"{developed_tau.imag:+.12f}i"
        )

        print(
            "expected viewer tau: "
            f"{expected_viewer_tau.real:+.12f} "
            f"{expected_viewer_tau.imag:+.12f}i"
        )

        print(
            "tau error:           "
            f"{tau_error:.3e}"
        )

        print()

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

    print("=" * 72)
    print("ENDPOINT")
    print("=" * 72)

    print(
        "isometric to m004: "
        f"{filled.is_isometric_to(target)}"
    )


if __name__ == "__main__":
    main()
