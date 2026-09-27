import json
import math
from pathlib import Path


COMBINATORICS_PATH = Path(
    "src/app/3-manifold-surgery-explorer/"
    "data/generated/"
    "m129_whitehead_combinatorics.json"
)

SCAFFOLD_PATH = Path(
    "src/app/3-manifold-surgery-explorer/"
    "data/generated/"
    "m129_whitehead_embedding.json"
)

OUTPUT_PATH = Path(
    "src/app/3-manifold-surgery-explorer/"
    "data/generated/"
    "m129_whitehead_curves.json"
)


EXPECTED_SIGNATURE = "eLPkbdcddhgggb"

EXPECTED_PD = [
    [6, 5, 7, 0],
    [0, 3, 1, 4],
    [8, 2, 9, 1],
    [2, 8, 3, 7],
    [4, 9, 5, 6],
]


# Geometry presentation scale.
TARGET_HALF_WIDTH = 3.2
TARGET_HALF_HEIGHT = 2.6

# Over/under separation.
CROSSING_HEIGHT = 0.58

# Dense sampling along each half-edge.
SAMPLES_PER_HALF_EDGE = 14

EPSILON = 1.0e-8


def smoothstep(t):
    return (
        t *
        t *
        (
            3.0 -
            2.0 * t
        )
    )


def point_distance(a, b):
    return math.sqrt(
        (
            a["x"] -
            b["x"]
        ) ** 2
        +
        (
            a["y"] -
            b["y"]
        ) ** 2
        +
        (
            a["z"] -
            b["z"]
        ) ** 2
    )


def normalize_xy(scaffold):
    projection = scaffold[
        "projection_embedding"
    ]

    source = {}

    for key, point in projection[
        "crossing_positions"
    ].items():
        source[
            f"c{key}"
        ] = {
            "x": float(point["x"]),
            "y": float(point["y"]),
        }

    for key, point in projection[
        "edge_midpoints"
    ].items():
        source[
            f"e{key}"
        ] = {
            "x": float(point["x"]),
            "y": float(point["y"]),
        }

    xs = [
        point["x"]
        for point in source.values()
    ]

    ys = [
        point["y"]
        for point in source.values()
    ]

    min_x = min(xs)
    max_x = max(xs)
    min_y = min(ys)
    max_y = max(ys)

    center_x = (
        min_x +
        max_x
    ) / 2.0

    center_y = (
        min_y +
        max_y
    ) / 2.0

    width = max(
        max_x -
        min_x,
        EPSILON,
    )

    height = max(
        max_y -
        min_y,
        EPSILON,
    )

    scale = min(
        (
            2.0 *
            TARGET_HALF_WIDTH
        ) /
        width,

        (
            2.0 *
            TARGET_HALF_HEIGHT
        ) /
        height,
    )

    normalized = {}

    for key, point in source.items():
        normalized[key] = {
            "x":
                (
                    point["x"] -
                    center_x
                ) *
                scale,

            # Flip Y only for presentation.
            "y":
                -(
                    point["y"] -
                    center_y
                ) *
                scale,
        }

    return normalized


def lerp(a, b, t):
    return (
        a +
        (
            b -
            a
        ) *
        t
    )


def interpolate_half_edge(
    start,
    end,
    start_z,
    end_z,
):
    points = []

    for sample_index in range(
        1,
        SAMPLES_PER_HALF_EDGE + 1
    ):
        t = (
            sample_index /
            SAMPLES_PER_HALF_EDGE
        )

        eased = smoothstep(t)

        points.append({
            "x":
                lerp(
                    start["x"],
                    end["x"],
                    t,
                ),

            "y":
                lerp(
                    start["y"],
                    end["y"],
                    t,
                ),

            "z":
                lerp(
                    start_z,
                    end_z,
                    eased,
                ),
        })

    return points


def outgoing_slot(incoming_slot):
    return (
        incoming_slot +
        2
    ) % 4


def build_component(
    component_record,
    pd,
    xy,
):
    entries = component_record[
        "entries"
    ]

    if not entries:
        raise RuntimeError(
            "Whitehead component has no traversal entries."
        )

    first_entry = entries[0]

    first_crossing = int(
        first_entry[
            "crossing"
        ]
    )

    first_slot = int(
        first_entry[
            "strand_index"
        ]
    )

    first_incoming_edge = int(
        pd[
            first_crossing
        ][
            first_slot
        ]
    )

    first_midpoint = xy[
        f"e{first_incoming_edge}"
    ]

    points = [{
        "x": first_midpoint["x"],
        "y": first_midpoint["y"],
        "z": 0.0,
    }]

    crossing_visits = []

    traversed_edges = []

    for entry_index, entry in enumerate(
        entries
    ):
        next_entry = entries[
            (
                entry_index +
                1
            ) %
            len(entries)
        ]

        crossing = int(
            entry[
                "crossing"
            ]
        )

        incoming = int(
            entry[
                "strand_index"
            ]
        )

        outgoing = outgoing_slot(
            incoming
        )

        incoming_edge = int(
            pd[
                crossing
            ][
                incoming
            ]
        )

        outgoing_edge = int(
            pd[
                crossing
            ][
                outgoing
            ]
        )

        next_crossing = int(
            next_entry[
                "crossing"
            ]
        )

        next_incoming_slot = int(
            next_entry[
                "strand_index"
            ]
        )

        next_incoming_edge = int(
            pd[
                next_crossing
            ][
                next_incoming_slot
            ]
        )

        # This is a critical combinatorial certification:
        # the edge leaving this crossing must be the edge
        # entering the next crossing in the component walk.
        if (
            outgoing_edge
            !=
            next_incoming_edge
        ):
            raise RuntimeError(
                "Component traversal mismatch: "
                f"component={component_record['component']} "
                f"crossing={crossing} "
                f"outgoing edge={outgoing_edge}, "
                f"next incoming edge={next_incoming_edge}."
            )

        traversed_edges.append(
            outgoing_edge
        )

        incoming_midpoint = xy[
            f"e{incoming_edge}"
        ]

        crossing_point = xy[
            f"c{crossing}"
        ]

        outgoing_midpoint = xy[
            f"e{outgoing_edge}"
        ]

        if entry["is_over"]:
            crossing_z = CROSSING_HEIGHT

        elif entry["is_under"]:
            crossing_z = -CROSSING_HEIGHT

        else:
            raise RuntimeError(
                f"Crossing {crossing} visit is neither over nor under."
            )

        expected_start = {
            "x": incoming_midpoint["x"],
            "y": incoming_midpoint["y"],
            "z": 0.0,
        }

        if (
            point_distance(
                points[-1],
                expected_start,
            )
            >
            1.0e-7
        ):
            raise RuntimeError(
                "Component traversal is not continuous at "
                f"crossing {crossing}."
            )

        # Incoming PD half-edge:
        # midpoint -> crossing.
        points.extend(
            interpolate_half_edge(
                incoming_midpoint,
                crossing_point,
                0.0,
                crossing_z,
            )
        )

        crossing_point_index = (
            len(points) -
            1
        )

        crossing_visits.append({
            "crossing":
                crossing,

            "strand_index":
                incoming,

            "is_over":
                bool(
                    entry[
                        "is_over"
                    ]
                ),

            "is_under":
                bool(
                    entry[
                        "is_under"
                    ]
                ),

            "point_index":
                crossing_point_index,

            "z":
                crossing_z,
        })

        # Outgoing PD half-edge:
        # crossing -> midpoint.
        points.extend(
            interpolate_half_edge(
                crossing_point,
                outgoing_midpoint,
                crossing_z,
                0.0,
            )
        )

    # The final outgoing midpoint is the initial incoming
    # midpoint. Keep the curve represented cyclically, without
    # duplicating its first point.
    if (
        point_distance(
            points[-1],
            points[0],
        )
        >
        1.0e-7
    ):
        raise RuntimeError(
            f"Component {component_record['component']} "
            "did not close."
        )

    points.pop()

    return {
        "component":
            int(
                component_record[
                    "component"
                ]
            ),

        "role":
            component_record[
                "role"
            ],

        "closed":
            True,

        "traversed_pd_edges":
            traversed_edges,

        "crossing_visits":
            crossing_visits,

        "points":
            points,
    }


def vec_sub(a, b):
    return (
        a[0] - b[0],
        a[1] - b[1],
        a[2] - b[2],
    )


def vec_add(a, b):
    return (
        a[0] + b[0],
        a[1] + b[1],
        a[2] + b[2],
    )


def vec_scale(a, scale):
    return (
        a[0] * scale,
        a[1] * scale,
        a[2] * scale,
    )


def vec_dot(a, b):
    return (
        a[0] * b[0]
        +
        a[1] * b[1]
        +
        a[2] * b[2]
    )


def vec_norm_squared(a):
    return vec_dot(
        a,
        a,
    )


def tuple_point(point):
    return (
        point["x"],
        point["y"],
        point["z"],
    )


def segment_distance_squared(
    p1,
    q1,
    p2,
    q2,
):
    # Standard closest-distance calculation for two finite
    # segments in R^3.

    d1 = vec_sub(
        q1,
        p1,
    )

    d2 = vec_sub(
        q2,
        p2,
    )

    r = vec_sub(
        p1,
        p2,
    )

    a = vec_dot(
        d1,
        d1,
    )

    e = vec_dot(
        d2,
        d2,
    )

    f = vec_dot(
        d2,
        r,
    )

    if (
        a <= EPSILON
        and
        e <= EPSILON
    ):
        return vec_norm_squared(
            r
        )

    if a <= EPSILON:
        s = 0.0
        t = max(
            0.0,
            min(
                1.0,
                f / e,
            ),
        )

    else:
        c = vec_dot(
            d1,
            r,
        )

        if e <= EPSILON:
            t = 0.0

            s = max(
                0.0,
                min(
                    1.0,
                    -c / a,
                ),
            )

        else:
            b = vec_dot(
                d1,
                d2,
            )

            denominator = (
                a * e -
                b * b
            )

            if (
                abs(
                    denominator
                )
                >
                EPSILON
            ):
                s = max(
                    0.0,
                    min(
                        1.0,
                        (
                            b * f -
                            c * e
                        ) /
                        denominator,
                    ),
                )

            else:
                s = 0.0

            t = (
                b * s +
                f
            ) / e

            if t < 0.0:
                t = 0.0

                s = max(
                    0.0,
                    min(
                        1.0,
                        -c / a,
                    ),
                )

            elif t > 1.0:
                t = 1.0

                s = max(
                    0.0,
                    min(
                        1.0,
                        (
                            b -
                            c
                        ) /
                        a,
                    ),
                )

    closest_1 = vec_add(
        p1,
        vec_scale(
            d1,
            s,
        ),
    )

    closest_2 = vec_add(
        p2,
        vec_scale(
            d2,
            t,
        ),
    )

    difference = vec_sub(
        closest_1,
        closest_2,
    )

    return vec_norm_squared(
        difference
    )


def segments_of_component(component):
    points = component[
        "points"
    ]

    count = len(points)

    return [
        (
            tuple_point(
                points[index]
            ),
            tuple_point(
                points[
                    (
                        index +
                        1
                    ) %
                    count
                ]
            ),
        )
        for index in range(count)
    ]


def same_component_segments_are_adjacent(
    first,
    second,
    count,
):
    if first == second:
        return True

    if (
        (
            first +
            1
        ) %
        count
        ==
        second
    ):
        return True

    if (
        (
            second +
            1
        ) %
        count
        ==
        first
    ):
        return True

    return False


def certify_no_3d_intersections(
    components
):
    segment_tables = [
        segments_of_component(
            component
        )
        for component in components
    ]

    minimum_distance_squared = None

    minimum_pair = None

    for first_component_index, first_segments in enumerate(
        segment_tables
    ):
        for first_segment_index, first_segment in enumerate(
            first_segments
        ):
            for second_component_index in range(
                first_component_index,
                len(segment_tables),
            ):
                second_segments = segment_tables[
                    second_component_index
                ]

                start_second = 0

                if (
                    second_component_index
                    ==
                    first_component_index
                ):
                    start_second = (
                        first_segment_index +
                        1
                    )

                for second_segment_index in range(
                    start_second,
                    len(second_segments),
                ):
                    if (
                        first_component_index
                        ==
                        second_component_index
                        and
                        same_component_segments_are_adjacent(
                            first_segment_index,
                            second_segment_index,
                            len(first_segments),
                        )
                    ):
                        continue

                    distance_squared = (
                        segment_distance_squared(
                            first_segment[0],
                            first_segment[1],
                            second_segments[
                                second_segment_index
                            ][0],
                            second_segments[
                                second_segment_index
                            ][1],
                        )
                    )

                    if (
                        minimum_distance_squared
                        is None
                        or
                        distance_squared
                        <
                        minimum_distance_squared
                    ):
                        minimum_distance_squared = (
                            distance_squared
                        )

                        minimum_pair = (
                            first_component_index,
                            first_segment_index,
                            second_component_index,
                            second_segment_index,
                        )

    if (
        minimum_distance_squared
        is None
    ):
        raise RuntimeError(
            "Could not evaluate segment separation."
        )

    minimum_distance = math.sqrt(
        max(
            0.0,
            minimum_distance_squared,
        )
    )

    if minimum_distance < 1.0e-6:
        raise RuntimeError(
            "3D embedding has a non-adjacent segment "
            "intersection or zero-clearance contact: "
            f"distance={minimum_distance}, "
            f"pair={minimum_pair}"
        )

    return {
        "minimum_nonadjacent_segment_distance":
            minimum_distance,

        "minimum_pair":
            list(
                minimum_pair
            ),
    }


def certify_crossings(
    components
):
    visits_by_crossing = {
        crossing:
            []
        for crossing in range(5)
    }

    for component in components:
        for visit in component[
            "crossing_visits"
        ]:
            visits_by_crossing[
                visit[
                    "crossing"
                ]
            ].append({
                "component":
                    component[
                        "component"
                    ],

                **visit,
            })

    certification = []

    for crossing in range(5):
        visits = visits_by_crossing[
            crossing
        ]

        if len(visits) != 2:
            raise RuntimeError(
                f"Crossing {crossing} has "
                f"{len(visits)} visits instead of 2."
            )

        over = [
            visit
            for visit in visits
            if visit[
                "is_over"
            ]
        ]

        under = [
            visit
            for visit in visits
            if visit[
                "is_under"
            ]
        ]

        if (
            len(over) != 1
            or
            len(under) != 1
        ):
            raise RuntimeError(
                f"Crossing {crossing} does not have "
                "exactly one over- and one under-strand."
            )

        if not (
            over[0]["z"]
            >
            under[0]["z"]
        ):
            raise RuntimeError(
                f"Crossing {crossing} has incorrect "
                "3D height ordering."
            )

        certification.append({
            "crossing":
                crossing,

            "over_component":
                over[0][
                    "component"
                ],

            "under_component":
                under[0][
                    "component"
                ],

            "over_z":
                over[0][
                    "z"
                ],

            "under_z":
                under[0][
                    "z"
                ],

            "separation":
                (
                    over[0]["z"]
                    -
                    under[0]["z"]
                ),
        })

    return certification


def main():
    combinatorics = json.loads(
        COMBINATORICS_PATH.read_text()
    )

    scaffold = json.loads(
        SCAFFOLD_PATH.read_text()
    )

    for source_name, source in [
        (
            "combinatorics",
            combinatorics,
        ),
        (
            "scaffold",
            scaffold,
        ),
    ]:
        if (
            source[
                "isometry_signature"
            ]
            !=
            EXPECTED_SIGNATURE
        ):
            raise RuntimeError(
                f"{source_name}: wrong m129 signature."
            )

        if (
            source[
                "pd_code"
            ]
            !=
            EXPECTED_PD
        ):
            raise RuntimeError(
                f"{source_name}: certified PD code changed."
            )

    xy = normalize_xy(
        scaffold
    )

    components = [
        build_component(
            component,
            combinatorics[
                "pd_code"
            ],
            xy,
        )
        for component
        in combinatorics[
            "components"
        ]
    ]

    all_edges = []

    for component in components:
        all_edges.extend(
            component[
                "traversed_pd_edges"
            ]
        )

    if sorted(all_edges) != list(range(10)):
        raise RuntimeError(
            "The two 3D components do not traverse "
            "all 10 certified PD edges exactly once."
        )

    crossing_certification = (
        certify_crossings(
            components
        )
    )

    clearance = (
        certify_no_3d_intersections(
            components
        )
    )

    result = {
        "manifold":
            "m129",

        "link_name":
            "5^2_1",

        "isometry_signature":
            EXPECTED_SIGNATURE,

        "source": {
            "combinatorics":
                str(
                    COMBINATORICS_PATH
                ),

            "planar_scaffold":
                str(
                    SCAFFOLD_PATH
                ),
        },

        "construction": {
            "type":
                "certified PD planar embedding "
                "with local over-under z lift",

            "crossing_height":
                CROSSING_HEIGHT,

            "samples_per_half_edge":
                SAMPLES_PER_HALF_EDGE,

            "xy_half_width":
                TARGET_HALF_WIDTH,

            "xy_half_height":
                TARGET_HALF_HEIGHT,
        },

        "certification": {
            "all_10_pd_edges_used_once":
                True,

            "components_closed":
                True,

            "crossings":
                crossing_certification,

            **clearance,
        },

        "components":
            components,
    }

    OUTPUT_PATH.write_text(
        json.dumps(
            result,
            indent=2,
            sort_keys=True,
        )
        +
        "\n"
    )

    print(
        "M129 WHITEHEAD 3D CURVES EXPORTED"
    )

    print(
        f"output: {OUTPUT_PATH}"
    )

    print()
    print(
        "CERTIFICATIONS"
    )

    print(
        "  components:",
        len(
            components
        ),
    )

    print(
        "  component point counts:",
        [
            len(
                component[
                    "points"
                ]
            )
            for component
            in components
        ],
    )

    print(
        "  components closed: True"
    )

    print(
        "  all 10 PD edges used once: True"
    )

    print(
        "  certified crossings:",
        len(
            crossing_certification
        ),
    )

    for crossing in crossing_certification:
        print(
            "    crossing "
            f"{crossing['crossing']}: "
            f"over component "
            f"{crossing['over_component']}, "
            f"under component "
            f"{crossing['under_component']}, "
            f"dz={crossing['separation']:.6f}"
        )

    print(
        "  minimum non-adjacent "
        "3D segment distance:",
        f"{clearance['minimum_nonadjacent_segment_distance']:.9f}",
    )

    print()
    print(
        "AMBIENT CURVE CERTIFICATION PASSED"
    )


if __name__ == "__main__":
    main()
