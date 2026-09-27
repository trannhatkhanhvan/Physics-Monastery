import json
from collections import defaultdict
from itertools import product
from pathlib import Path


SOURCE_PATH = Path(
    "src/app/3-manifold-surgery-explorer/"
    "data/generated/m129_cusp_triangles.json"
)

OUTPUT_PATH = Path(
    "src/app/3-manifold-surgery-explorer/"
    "data/generated/m129_cusp_connectivity.json"
)

TOLERANCE = 1e-7
SEARCH_RADIUS = 3


COLOR_HEX = {
    "Red": "#ff2020",
    "Green": "#159447",
    "Blue": "#4da3ff",
    "Yellow": "#ffe600",
}

COLOR_ORDER = [
    "Red",
    "Green",
    "Blue",
    "Yellow",
]


def point_complex(point):
    return complex(
        point["re"],
        point["im"],
    )


def complex_record(z):
    return {
        "re": float(z.real),
        "im": float(z.imag),
    }


def translation_record(
    payload,
    cusp_index,
):
    for record in payload[
        "cusp_translations"
    ]:
        if record["cusp"] == cusp_index:
            return record

    raise RuntimeError(
        f"missing translations for cusp {cusp_index}"
    )


def translation_vectors(
    payload,
    cusp_index,
):
    record = translation_record(
        payload,
        cusp_index,
    )

    meridian = complex(
        record["meridian"]["re"],
        record["meridian"]["im"],
    )

    longitude = complex(
        record["longitude"]["re"],
        record["longitude"]["im"],
    )

    return meridian, longitude


def triangle_side_face(
    triangle,
    first_index,
    second_index,
):
    """
    A cusp-triangle side lies in one tetrahedral face.

    Each horotriangle corner corresponds to a tetrahedral
    edge containing the ideal vertex.

    If the two corners use edges

        (v,a), (v,b)

    then their joining side lies in face (v,a,b).
    The missing tetrahedral vertex is the index of that face.
    """
    ideal_vertex = triangle[
        "ideal_vertex"
    ]

    first_edge = triangle["points"][
        first_index
    ]["edge_vertices"]

    second_edge = triangle["points"][
        second_index
    ]["edge_vertices"]

    first_neighbor = next(
        vertex
        for vertex in first_edge
        if vertex != ideal_vertex
    )

    second_neighbor = next(
        vertex
        for vertex in second_edge
        if vertex != ideal_vertex
    )

    remaining = [
        vertex
        for vertex in range(4)
        if vertex not in {
            ideal_vertex,
            first_neighbor,
            second_neighbor,
        }
    ]

    if len(remaining) != 1:
        raise RuntimeError(
            f"{triangle['id']}: could not determine "
            f"face for side {first_index}-{second_index}"
        )

    return remaining[0]


def build_face_material_lookup(
    payload,
):
    lookup = {}

    for material in payload[
        "face_pair_materials"
    ]:
        material_id = material[
            "material_id"
        ]

        for face in material["faces"]:
            key = (
                face["tetrahedron"],
                face["face"],
            )

            if key in lookup:
                raise RuntimeError(
                    f"duplicate face material assignment: {key}"
                )

            lookup[key] = material_id

    if len(lookup) != 16:
        raise RuntimeError(
            f"expected 16 tetrahedral faces, "
            f"found {len(lookup)}"
        )

    return lookup


def solve_material_colors(
    face_material_lookup,
):
    """
    Anchor tetrahedron 0 to the established canonical palette:

        face 0 -> Red
        face 1 -> Green
        face 2 -> Blue
        face 3 -> Yellow

    Then require every tetrahedron to contain all four colors
    exactly once, while a glued face-pair class has one color.

    There are two valid completions after the tet-0 anchor.
    Choose deterministically by lexicographic color order on
    material IDs 4..7.

    This is a display convention, not extra topology.
    """
    anchored = {
        face_material_lookup[(0, 0)]:
            "Red",

        face_material_lookup[(0, 1)]:
            "Green",

        face_material_lookup[(0, 2)]:
            "Blue",

        face_material_lookup[(0, 3)]:
            "Yellow",
    }

    material_ids = sorted(
        set(
            face_material_lookup.values()
        )
    )

    remaining_ids = [
        material_id
        for material_id in material_ids
        if material_id not in anchored
    ]

    solutions = []

    for candidate_colors in product(
        COLOR_ORDER,
        repeat=len(
            remaining_ids
        ),
    ):
        assignment = {
            **anchored,
            **dict(
                zip(
                    remaining_ids,
                    candidate_colors,
                )
            ),
        }

        valid = True

        for tetrahedron in range(4):
            colors = [
                assignment[
                    face_material_lookup[
                        (
                            tetrahedron,
                            face,
                        )
                    ]
                ]
                for face in range(4)
            ]

            if set(colors) != set(
                COLOR_ORDER
            ):
                valid = False
                break

        if valid:
            solutions.append(
                assignment
            )

    if not solutions:
        raise RuntimeError(
            "no valid four-color face-pair assignment"
        )

    color_rank = {
        color: index
        for index, color in enumerate(
            COLOR_ORDER
        )
    }

    def solution_key(
        assignment,
    ):
        return tuple(
            color_rank[
                assignment[
                    material_id
                ]
            ]
            for material_id in material_ids
        )

    chosen = min(
        solutions,
        key=solution_key,
    )

    return chosen, solutions


def build_triangle_sides(
    payload,
    face_material_lookup,
    material_colors,
    cusp_index,
):
    triangles = [
        triangle
        for triangle in payload[
            "triangles"
        ]
        if triangle[
            "cusp"
        ] == cusp_index
    ]

    if len(triangles) != 8:
        raise RuntimeError(
            f"cusp {cusp_index}: expected 8 triangles, "
            f"found {len(triangles)}"
        )

    side_corner_pairs = [
        (0, 1),
        (1, 2),
        (2, 0),
    ]

    sides = []

    for triangle in triangles:
        tet = triangle[
            "tetrahedron"
        ]

        opposite_face = triangle[
            "opposite_face"
        ]

        fill_material_id = (
            face_material_lookup[
                (
                    tet,
                    opposite_face,
                )
            ]
        )

        fill_color_name = (
            material_colors[
                fill_material_id
            ]
        )

        for (
            side_index,
            (
                first_index,
                second_index,
            ),
        ) in enumerate(
            side_corner_pairs
        ):
            face = triangle_side_face(
                triangle,
                first_index,
                second_index,
            )

            material_id = (
                face_material_lookup[
                    (
                        tet,
                        face,
                    )
                ]
            )

            color_name = (
                material_colors[
                    material_id
                ]
            )

            sides.append({
                "id":
                    f"{triangle['id']}:s{side_index}",

                "triangle_id":
                    triangle["id"],

                "tetrahedron":
                    tet,

                "ideal_vertex":
                    triangle[
                        "ideal_vertex"
                    ],

                "side_index":
                    side_index,

                "corner_indices": [
                    first_index,
                    second_index,
                ],

                "face":
                    face,

                "material_id":
                    material_id,

                "color_name":
                    color_name,

                "color_hex":
                    COLOR_HEX[
                        color_name
                    ],

                "triangle_fill_material_id":
                    fill_material_id,

                "triangle_fill_color_name":
                    fill_color_name,

                "triangle_fill_color_hex":
                    COLOR_HEX[
                        fill_color_name
                    ],

                "endpoint_a":
                    point_complex(
                        triangle[
                            "points"
                        ][
                            first_index
                        ]
                    ),

                "endpoint_b":
                    point_complex(
                        triangle[
                            "points"
                        ][
                            second_index
                        ]
                    ),
            })

    return triangles, sides


def side_matches(
    side_a,
    side_b,
    meridian,
    longitude,
):
    matches = []

    for meridian_shift in range(
        -SEARCH_RADIUS,
        SEARCH_RADIUS + 1,
    ):
        for longitude_shift in range(
            -SEARCH_RADIUS,
            SEARCH_RADIUS + 1,
        ):
            shift = (
                meridian_shift *
                    meridian
                +
                longitude_shift *
                    longitude
            )

            a0 = (
                side_a[
                    "endpoint_a"
                ] +
                shift
            )

            a1 = (
                side_a[
                    "endpoint_b"
                ] +
                shift
            )

            b0 = side_b[
                "endpoint_a"
            ]

            b1 = side_b[
                "endpoint_b"
            ]

            same = (
                abs(
                    a0 - b0
                ) < TOLERANCE
                and
                abs(
                    a1 - b1
                ) < TOLERANCE
            )

            reversed_orientation = (
                abs(
                    a0 - b1
                ) < TOLERANCE
                and
                abs(
                    a1 - b0
                ) < TOLERANCE
            )

            if same:
                matches.append({
                    "meridian_shift":
                        meridian_shift,

                    "longitude_shift":
                        longitude_shift,

                    "orientation":
                        "same",
                })

            if reversed_orientation:
                matches.append({
                    "meridian_shift":
                        meridian_shift,

                    "longitude_shift":
                        longitude_shift,

                    "orientation":
                        "reversed",
                })

    return matches


def pair_cusp_sides(
    payload,
    cusp_index,
    sides,
):
    meridian, longitude = (
        translation_vectors(
            payload,
            cusp_index,
        )
    )

    used = set()
    pairings = []

    for i, side_a in enumerate(
        sides
    ):
        if i in used:
            continue

        candidates = []

        for j in range(
            i + 1,
            len(sides),
        ):
            if j in used:
                continue

            matches = side_matches(
                side_a,
                sides[j],
                meridian,
                longitude,
            )

            if matches:
                candidates.append(
                    (
                        j,
                        matches,
                    )
                )

        if len(candidates) != 1:
            raise RuntimeError(
                f"cusp {cusp_index}: side "
                f"{side_a['id']} expected one partner, "
                f"found {len(candidates)}"
            )

        partner_index, matches = (
            candidates[0]
        )

        if len(matches) != 1:
            raise RuntimeError(
                f"cusp {cusp_index}: side "
                f"{side_a['id']} / "
                f"{sides[partner_index]['id']} "
                f"has {len(matches)} lattice matches"
            )

        match = matches[0]
        side_b = sides[
            partner_index
        ]

        if (
            side_a[
                "material_id"
            ]
            !=
            side_b[
                "material_id"
            ]
        ):
            raise RuntimeError(
                f"cusp {cusp_index}: paired sides "
                f"{side_a['id']} and {side_b['id']} "
                "have different face-pair materials"
            )

        if (
            side_a[
                "color_hex"
            ]
            !=
            side_b[
                "color_hex"
            ]
        ):
            raise RuntimeError(
                f"cusp {cusp_index}: paired sides "
                f"{side_a['id']} and {side_b['id']} "
                "have different colors"
            )

        used.add(i)
        used.add(
            partner_index
        )

        direct = (
            match[
                "meridian_shift"
            ] == 0
            and
            match[
                "longitude_shift"
            ] == 0
        )

        pairings.append({
            "pair_index":
                len(pairings),

            "side_a":
                side_a["id"],

            "side_b":
                side_b["id"],

            "triangle_a":
                side_a[
                    "triangle_id"
                ],

            "triangle_b":
                side_b[
                    "triangle_id"
                ],

            "material_id":
                side_a[
                    "material_id"
                ],

            "color_name":
                side_a[
                    "color_name"
                ],

            "color_hex":
                side_a[
                    "color_hex"
                ],

            "orientation":
                match[
                    "orientation"
                ],

            "meridian_shift":
                match[
                    "meridian_shift"
                ],

            "longitude_shift":
                match[
                    "longitude_shift"
                ],

            "kind":
                (
                    "direct"
                    if direct
                    else "peripheral"
                ),
        })

    if len(used) != 24:
        raise RuntimeError(
            f"cusp {cusp_index}: expected all 24 sides paired, "
            f"paired {len(used)}"
        )

    if len(pairings) != 12:
        raise RuntimeError(
            f"cusp {cusp_index}: expected 12 side pairs, "
            f"found {len(pairings)}"
        )

    return pairings


def certify_direct_connectivity(
    cusp_index,
    triangles,
    pairings,
):
    graph = defaultdict(set)

    direct_pairs = [
        pairing
        for pairing in pairings
        if pairing["kind"] ==
        "direct"
    ]

    for pairing in direct_pairs:
        a = pairing[
            "triangle_a"
        ]

        b = pairing[
            "triangle_b"
        ]

        graph[a].add(b)
        graph[b].add(a)

    if len(direct_pairs) != 8:
        raise RuntimeError(
            f"cusp {cusp_index}: expected 8 direct pairs, "
            f"found {len(direct_pairs)}"
        )

    triangle_ids = {
        triangle["id"]
        for triangle in triangles
    }

    start = next(
        iter(
            triangle_ids
        )
    )

    seen = set()
    stack = [start]

    while stack:
        current = stack.pop()

        if current in seen:
            continue

        seen.add(current)

        stack.extend(
            graph[current] -
            seen
        )

    if seen != triangle_ids:
        raise RuntimeError(
            f"cusp {cusp_index}: direct adjacency graph "
            "does not connect all 8 triangles"
        )

    peripheral_pairs = [
        pairing
        for pairing in pairings
        if pairing["kind"] ==
        "peripheral"
    ]

    if len(peripheral_pairs) != 4:
        raise RuntimeError(
            f"cusp {cusp_index}: expected 4 peripheral pairs, "
            f"found {len(peripheral_pairs)}"
        )


payload = json.loads(
    SOURCE_PATH.read_text()
)

face_material_lookup = (
    build_face_material_lookup(
        payload
    )
)

(
    material_colors,
    color_solutions,
) = solve_material_colors(
    face_material_lookup
)


print()
print("M129 CUSP CONNECTIVITY EXPORT")
print("============================")

print()
print("Global face-pair colors:")

for material_id in sorted(
    material_colors
):
    color_name = (
        material_colors[
            material_id
        ]
    )

    print(
        f"material {material_id}: "
        f"{color_name} "
        f"{COLOR_HEX[color_name]}"
    )

print()
print(
    "valid color completions after tet-0 anchor =",
    len(color_solutions)
)

print(
    "chosen completion = deterministic "
    "lexicographic convention"
)


output_cusps = []

for cusp_index in range(2):
    triangles, sides = (
        build_triangle_sides(
            payload,
            face_material_lookup,
            material_colors,
            cusp_index,
        )
    )

    pairings = (
        pair_cusp_sides(
            payload,
            cusp_index,
            sides,
        )
    )

    certify_direct_connectivity(
        cusp_index,
        triangles,
        pairings,
    )

    direct = [
        pairing
        for pairing in pairings
        if pairing[
            "kind"
        ] == "direct"
    ]

    peripheral = [
        pairing
        for pairing in pairings
        if pairing[
            "kind"
        ] == "peripheral"
    ]

    if any(
        pairing[
            "orientation"
        ] != "reversed"
        for pairing in pairings
    ):
        raise RuntimeError(
            f"cusp {cusp_index}: expected all side "
            "gluings to reverse edge orientation"
        )

    print()
    print(f"CUSP {cusp_index}")
    print("-" * 48)

    print(
        "triangles =",
        len(triangles)
    )

    print(
        "side pairs =",
        len(pairings)
    )

    print(
        "direct planar pairs =",
        len(direct)
    )

    print(
        "peripheral boundary pairs =",
        len(peripheral)
    )

    print()
    print("Direct adjacency:")

    for pairing in direct:
        print(
            f"  {pairing['triangle_a']} "
            f"<-> "
            f"{pairing['triangle_b']} "
            f"[{pairing['color_name']}]"
        )

    print()
    print("Peripheral pairings:")

    for pairing in peripheral:
        print(
            f"  {pairing['triangle_a']} "
            f"<-> "
            f"{pairing['triangle_b']} "
            f"[{pairing['color_name']}] "
            f"mu={pairing['meridian_shift']} "
            f"lambda={pairing['longitude_shift']}"
        )

    output_sides = []

    for side in sides:
        output_sides.append({
            key: value
            for key, value in side.items()
            if key not in {
                "endpoint_a",
                "endpoint_b",
            }
        } | {
            "endpoint_a":
                complex_record(
                    side[
                        "endpoint_a"
                    ]
                ),

            "endpoint_b":
                complex_record(
                    side[
                        "endpoint_b"
                    ]
                ),
        })

    output_cusps.append({
        "cusp":
            cusp_index,

        "triangle_ids": [
            triangle["id"]
            for triangle in triangles
        ],

        "sides":
            output_sides,

        "pairings":
            pairings,

        "direct_pair_count":
            len(direct),

        "peripheral_pair_count":
            len(peripheral),
    })


output = {
    "schema":
        "physics-monastery."
        "3-manifold-surgery-explorer."
        "m129-cusp-connectivity.v1",

    "manifold":
        payload["manifold"],

    "tetrahedron_count":
        4,

    "cusp_count":
        2,

    "triangle_count":
        16,

    "material_colors": {
        str(material_id): {
            "name":
                material_colors[
                    material_id
                ],

            "hex":
                COLOR_HEX[
                    material_colors[
                        material_id
                    ]
                ],
        }
        for material_id in sorted(
            material_colors
        )
    },

    "face_material_lookup": [
        {
            "tetrahedron":
                tetrahedron,

            "face":
                face,

            "material_id":
                material_id,

            "color_name":
                material_colors[
                    material_id
                ],

            "color_hex":
                COLOR_HEX[
                    material_colors[
                        material_id
                    ]
                ],
        }
        for (
            tetrahedron,
            face,
        ), material_id
        in sorted(
            face_material_lookup.items()
        )
    ],

    "cusps":
        output_cusps,
}


OUTPUT_PATH.write_text(
    json.dumps(
        output,
        indent=2,
    )
    +
    "\n"
)


print()
print(
    "WROTE:",
    OUTPUT_PATH
)

print()
print(
    "CERTIFIED: each m129 cusp has "
    "8 triangles, 12 exact side-pair classes, "
    "8 direct planar gluings, 4 peripheral "
    "boundary pairings, and one connected "
    "8-triangle adjacency graph"
)
