import json
import math
from pathlib import Path


SOURCE = Path(
    "src/app/3-manifold-surgery-explorer/"
    "data/generated/"
    "m129_native_orthogonal_geometry.json"
)

OUTPUT = Path(
    "src/app/3-manifold-surgery-explorer/"
    "data/generated/"
    "m129_native_orthogonal_curves.json"
)

EXPECTED_SIGNATURE = "eLPkbdcddhgggb"

CROSSING_HEIGHT = 4.0
LIFT_RADIUS = 4.0
EPSILON = 1.0e-9


def point(x, y, z=0.0):
    return {
        "x": float(x),
        "y": float(y),
        "z": float(z),
    }


def lerp(a, b, t):
    return (
        a +
        (b - a) * t
    )


def distance_2d(a, b):
    return math.hypot(
        a["x"] - b["x"],
        a["y"] - b["y"],
    )


def parameter_on_segment(
    start,
    end,
    p,
):
    dx = end["x"] - start["x"]
    dy = end["y"] - start["y"]

    if abs(dx) >= abs(dy):
        if abs(dx) < EPSILON:
            return 0.0

        return (
            p["x"] - start["x"]
        ) / dx

    if abs(dy) < EPSILON:
        return 0.0

    return (
        p["y"] - start["y"]
    ) / dy


def native_crossing_point(
    over_start,
    over_end,
    under_start,
    under_end,
):
    over_horizontal = (
        abs(
            over_start["y"] -
            over_end["y"]
        )
        < EPSILON
    )

    over_vertical = (
        abs(
            over_start["x"] -
            over_end["x"]
        )
        < EPSILON
    )

    under_horizontal = (
        abs(
            under_start["y"] -
            under_end["y"]
        )
        < EPSILON
    )

    under_vertical = (
        abs(
            under_start["x"] -
            under_end["x"]
        )
        < EPSILON
    )

    if (
        over_horizontal
        and
        under_vertical
    ):
        return point(
            under_start["x"],
            over_start["y"],
        )

    if (
        over_vertical
        and
        under_horizontal
    ):
        return point(
            over_start["x"],
            under_start["y"],
        )

    raise RuntimeError(
        "Native Spherogram crossing arrows are not "
        "orthogonal as expected."
    )


def inside_segment(
    start,
    end,
    p,
):
    min_x = min(
        start["x"],
        end["x"],
    ) - EPSILON

    max_x = max(
        start["x"],
        end["x"],
    ) + EPSILON

    min_y = min(
        start["y"],
        end["y"],
    ) - EPSILON

    max_y = max(
        start["y"],
        end["y"],
    ) + EPSILON

    return (
        min_x <= p["x"] <= max_x
        and
        min_y <= p["y"] <= max_y
    )


def lifted_z(
    along_distance,
    role,
):
    if (
        along_distance >=
        LIFT_RADIUS
    ):
        return 0.0

    amount = (
        1.0 -
        along_distance /
        LIFT_RADIUS
    )

    smooth = (
        0.5 -
        0.5 *
        math.cos(
            math.pi *
            amount
        )
    )

    sign = (
        1.0
        if role == "over"
        else -1.0
    )

    return (
        sign *
        CROSSING_HEIGHT *
        smooth
    )


def build_arrow_polyline(
    arrow,
    vertices,
    crossing_events,
):
    start = vertices[
        arrow["tail"]
    ]

    end = vertices[
        arrow["head"]
    ]

    events = crossing_events.get(
        arrow["index"],
        []
    )

    event_records = []

    for event in events:
        t = parameter_on_segment(
            start,
            end,
            event["point"],
        )

        if (
            t < -EPSILON
            or
            t > 1.0 + EPSILON
        ):
            raise RuntimeError(
                f"Crossing lies outside native arrow "
                f"{arrow['index']}."
            )

        event_records.append({
            **event,
            "t": max(
                0.0,
                min(
                    1.0,
                    t,
                ),
            ),
        })

    event_records.sort(
        key=lambda record:
            record["t"]
    )

    # Native orthogonal vertices and crossing neighborhoods.
    # We sample in physical native-grid distance, not by
    # inventing another layout.
    length = distance_2d(
        start,
        end,
    )

    sample_count = max(
        2,
        int(
            math.ceil(
                length / 1.0
            )
        ),
    )

    samples = []

    for sample_index in range(
        sample_count + 1
    ):
        t = (
            sample_index /
            sample_count
        )

        x = lerp(
            start["x"],
            end["x"],
            t,
        )

        y = lerp(
            start["y"],
            end["y"],
            t,
        )

        sample_point = point(
            x,
            y,
            0.0,
        )

        z = 0.0

        for event in event_records:
            along_distance = (
                abs(
                    t -
                    event["t"]
                )
                *
                length
            )

            candidate = lifted_z(
                along_distance,
                event["role"],
            )

            if (
                abs(candidate)
                >
                abs(z)
            ):
                z = candidate

        sample_point["z"] = z

        samples.append(
            sample_point
        )

    return samples


def main():
    data = json.loads(
        SOURCE.read_text()
    )

    if (
        data["isometry_signature"]
        !=
        EXPECTED_SIGNATURE
    ):
        raise RuntimeError(
            "m129 signature changed."
        )

    vertices = {
        int(record["index"]):
            point(
                record["x"],
                record["y"],
            )
        for record
        in data["vertices"]
    }

    arrows = {
        int(record["index"]):
            record
        for record
        in data["arrows"]
    }

    crossing_events = {}

    certified_crossings = []

    for crossing in data[
        "crossings"
    ]:
        over_arrow = arrows[
            int(
                crossing[
                    "over_arrow"
                ]
            )
        ]

        under_arrow = arrows[
            int(
                crossing[
                    "under_arrow"
                ]
            )
        ]

        over_start = vertices[
            int(
                over_arrow[
                    "tail"
                ]
            )
        ]

        over_end = vertices[
            int(
                over_arrow[
                    "head"
                ]
            )
        ]

        under_start = vertices[
            int(
                under_arrow[
                    "tail"
                ]
            )
        ]

        under_end = vertices[
            int(
                under_arrow[
                    "head"
                ]
            )
        ]

        p = native_crossing_point(
            over_start,
            over_end,
            under_start,
            under_end,
        )

        if not inside_segment(
            over_start,
            over_end,
            p,
        ):
            raise RuntimeError(
                "Native crossing is outside over-arrow."
            )

        if not inside_segment(
            under_start,
            under_end,
            p,
        ):
            raise RuntimeError(
                "Native crossing is outside under-arrow."
            )

        crossing_label = int(
            crossing[
                "crossing_label"
            ]
        )

        crossing_events.setdefault(
            int(
                over_arrow[
                    "index"
                ]
            ),
            [],
        ).append({
            "crossing_label":
                crossing_label,

            "role":
                "over",

            "point":
                p,
        })

        crossing_events.setdefault(
            int(
                under_arrow[
                    "index"
                ]
            ),
            [],
        ).append({
            "crossing_label":
                crossing_label,

            "role":
                "under",

            "point":
                p,
        })

        certified_crossings.append({
            "crossing_label":
                crossing_label,

            "x":
                p["x"],

            "y":
                p["y"],

            "over_arrow":
                int(
                    over_arrow[
                        "index"
                    ]
                ),

            "under_arrow":
                int(
                    under_arrow[
                        "index"
                    ]
                ),

            "over_z":
                CROSSING_HEIGHT,

            "under_z":
                -CROSSING_HEIGHT,
        })


    arrow_polylines = {}

    for arrow_index, arrow in arrows.items():
        arrow_polylines[
            arrow_index
        ] = build_arrow_polyline(
            arrow,
            vertices,
            crossing_events,
        )


    components = []

    for component_index in (0, 1):
        component_arrows = [
            arrow
            for arrow in data[
                "arrows"
            ]
            if (
                int(
                    arrow[
                        "component"
                    ]
                )
                ==
                component_index
            )
        ]

        # plink_data() preserves component ordering, and
        # these arrows form the directed component cycle.
        component_arrows.sort(
            key=lambda arrow:
                int(
                    arrow[
                        "index"
                    ]
                )
        )

        if not component_arrows:
            raise RuntimeError(
                f"Missing native component "
                f"{component_index}."
            )

        points = []

        current_head = None

        for arrow_position, arrow in enumerate(
            component_arrows
        ):
            if (
                arrow_position > 0
                and
                int(
                    arrow[
                        "tail"
                    ]
                )
                !=
                current_head
            ):
                raise RuntimeError(
                    f"Native arrows for component "
                    f"{component_index} are not "
                    "already in directed cycle order."
                )

            polyline = arrow_polylines[
                int(
                    arrow[
                        "index"
                    ]
                )
            ]

            if points:
                points.extend(
                    polyline[1:]
                )
            else:
                points.extend(
                    polyline
                )

            current_head = int(
                arrow[
                    "head"
                ]
            )

        first_tail = int(
            component_arrows[0][
                "tail"
            ]
        )

        if (
            current_head
            !=
            first_tail
        ):
            raise RuntimeError(
                f"Native component {component_index} "
                "did not close."
            )

        # Remove duplicated closing point.
        if (
            points
            and
            distance_2d(
                points[0],
                points[-1],
            )
            <
            EPSILON
        ):
            points.pop()

        components.append({
            "component":
                component_index,

            "role":
                (
                    "SURVIVING_KNOT"
                    if component_index == 0
                    else "CROSSING_CIRCLE"
                ),

            "arrow_indices":
                [
                    int(
                        arrow[
                            "index"
                        ]
                    )
                    for arrow
                    in component_arrows
                ],

            "closed":
                True,

            "points":
                points,
        })


    # Certify all five native crossings at their actual
    # orthogonal-grid intersection coordinates.
    if len(
        certified_crossings
    ) != 5:
        raise RuntimeError(
            "Expected exactly five native crossings."
        )

    result = {
        "manifold":
            "m129",

        "link_name":
            "5^2_1",

        "isometry_signature":
            EXPECTED_SIGNATURE,

        "source":
            (
                "Spherogram "
                "OrthogonalLinkDiagram.plink_data()"
            ),

        "construction":
            {
                "layout":
                    "native Spherogram orthogonal grid",

                "crossing_lift":
                    "native over/under arrows only",

                "crossing_height":
                    CROSSING_HEIGHT,

                "lift_radius":
                    LIFT_RADIUS,
            },

        "crossings":
            sorted(
                certified_crossings,
                key=lambda record:
                    record[
                        "crossing_label"
                    ],
            ),

        "components":
            components,
    }

    OUTPUT.write_text(
        json.dumps(
            result,
            indent=2,
            sort_keys=True,
        )
        +
        "\n"
    )

    print(
        "M129 NATIVE ORTHOGONAL 3D CURVES EXPORTED"
    )

    print(
        f"output: {OUTPUT}"
    )

    print()
    print(
        "CERTIFICATIONS"
    )

    print(
        "  source: "
        "OrthogonalLinkDiagram.plink_data()"
    )

    print(
        f"  components: {len(components)}"
    )

    print(
        "  component arrow cycles:",
        [
            component[
                "arrow_indices"
            ]
            for component
            in components
        ],
    )

    print(
        "  components closed:",
        all(
            component[
                "closed"
            ]
            for component
            in components
        ),
    )

    print(
        f"  crossings: "
        f"{len(certified_crossings)}"
    )

    for crossing in sorted(
        certified_crossings,
        key=lambda record:
            record[
                "crossing_label"
            ],
    ):
        print(
            "    crossing "
            f"{crossing['crossing_label']}: "
            f"({crossing['x']}, "
            f"{crossing['y']}), "
            f"over a{crossing['over_arrow']}, "
            f"under a{crossing['under_arrow']}"
        )

    print()
    print(
        "NATIVE SPHEROGRAM 3D CURVES CERTIFIED"
    )


if __name__ == "__main__":
    main()
