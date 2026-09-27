#!/usr/bin/env python3

from __future__ import annotations

from collections import defaultdict

from spherogram import Link


LINK_NAME = "5^2_1"

SURVIVING_COMPONENT = 0
CROSSING_CIRCLE_COMPONENT = 1


def crossing_of(entry):
    value = getattr(
        entry,
        "crossing",
        None,
    )

    if value is not None:
        return value

    try:
        return entry[0]
    except Exception:
        return None


def strand_of(entry):
    value = getattr(
        entry,
        "strand_index",
        None,
    )

    if value is not None:
        return int(value)

    try:
        return int(entry[1])
    except Exception:
        return None


def main():
    link = Link(
        LINK_NAME
    )

    crossing_index = {
        crossing: index
        for index, crossing in
        enumerate(link.crossings)
    }

    surviving_entries = list(
        link.link_components[
            SURVIVING_COMPONENT
        ]
    )

    circle_entries = list(
        link.link_components[
            CROSSING_CIRCLE_COMPONENT
        ]
    )

    # --------------------------------------------------------
    # Build surviving component arcs.
    # --------------------------------------------------------

    surviving_arcs = []

    for arc_index, start in enumerate(
        surviving_entries
    ):
        end = surviving_entries[
            (arc_index + 1) %
            len(surviving_entries)
        ]

        surviving_arcs.append(
            {
                "arc":
                    arc_index,

                "start":
                    (
                        crossing_index[
                            crossing_of(start)
                        ],
                        strand_of(start),
                    ),

                "end":
                    (
                        crossing_index[
                            crossing_of(end)
                        ],
                        strand_of(end),
                    ),
            }
        )

    # --------------------------------------------------------
    # Face membership of crossing strands.
    # --------------------------------------------------------

    faces = link.faces()

    half_edge_faces = defaultdict(
        set
    )

    for face_index, face in enumerate(
        faces
    ):
        for entry in face:
            crossing = crossing_of(
                entry
            )

            strand = strand_of(
                entry
            )

            if (
                crossing is None or
                strand is None
            ):
                continue

            half_edge_faces[
                (
                    crossing_index[
                        crossing
                    ],
                    strand,
                )
            ].add(
                face_index
            )

    # --------------------------------------------------------
    # Crossing-circle-adjacent face set.
    # --------------------------------------------------------

    circle_half_edges = {
        (
            crossing_index[
                crossing_of(entry)
            ],
            strand_of(entry),
        )
        for entry in
        circle_entries
    }

    circle_adjacent_faces = set()

    for half_edge in circle_half_edges:
        circle_adjacent_faces.update(
            half_edge_faces[
                half_edge
            ]
        )

    print(
        "=" * 72
    )

    print(
        "m129 CROSSING-DISK PUNCTURE PROBE"
    )

    print(
        "=" * 72
    )

    print()

    print(
        "crossing-circle adjacent faces:",
        sorted(
            circle_adjacent_faces
        ),
    )

    print()

    print(
        "=" * 72
    )

    print(
        "SURVIVING ARC FACE INCIDENCE"
    )

    print(
        "=" * 72
    )

    print()

    candidate_arcs = []

    for arc in surviving_arcs:
        start_faces = (
            half_edge_faces[
                arc["start"]
            ]
        )

        end_faces = (
            half_edge_faces[
                arc["end"]
            ]
        )

        start_circle_faces = (
            start_faces &
            circle_adjacent_faces
        )

        end_circle_faces = (
            end_faces &
            circle_adjacent_faces
        )

        touches_circle_region = (
            bool(
                start_circle_faces
            ) or
            bool(
                end_circle_faces
            )
        )

        print(
            f"K{arc['arc']}: "
            f"{arc['start']} -> {arc['end']}"
        )

        print(
            "  start faces:",
            sorted(
                start_faces
            ),
        )

        print(
            "  end faces:",
            sorted(
                end_faces
            ),
        )

        print(
            "  circle-adjacent start:",
            sorted(
                start_circle_faces
            ),
        )

        print(
            "  circle-adjacent end:",
            sorted(
                end_circle_faces
            ),
        )

        print(
            "  touches circle region:",
            touches_circle_region,
        )

        print()

        if touches_circle_region:
            candidate_arcs.append(
                arc["arc"]
            )

    print(
        "=" * 72
    )

    print(
        "CANDIDATE PUNCTURE ARCS"
    )

    print(
        "=" * 72
    )

    print()

    print(
        candidate_arcs
    )

    print()

    print(
        "PUNCTURE PROBE COMPLETE"
    )


if __name__ == "__main__":
    main()
