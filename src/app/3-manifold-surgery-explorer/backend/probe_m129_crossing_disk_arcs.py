#!/usr/bin/env python3

from __future__ import annotations

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

    print(
        "=" * 72
    )

    print(
        "m129 CROSSING-DISK ARC GRAPH PROBE"
    )

    print(
        "=" * 72
    )

    print()

    print(
        "link:",
        LINK_NAME,
    )

    print(
        "components:",
        len(
            link.link_components
        ),
    )

    print(
        "crossings:",
        len(
            link.crossings
        ),
    )

    print()


    # ========================================================
    # Component traversal arcs.
    #
    # Every consecutive pair of crossing entries on a component
    # defines one diagram arc between crossings.
    # ========================================================

    all_component_arcs = []

    for component_id, component in enumerate(
        link.link_components
    ):
        entries = list(
            component
        )

        print(
            "=" * 72
        )

        role = (
            "SURVIVING_KNOT"
            if component_id ==
            SURVIVING_COMPONENT
            else
            "CROSSING_CIRCLE"
            if component_id ==
            CROSSING_CIRCLE_COMPONENT
            else
            "UNASSIGNED"
        )

        print(
            f"COMPONENT {component_id} — {role}"
        )

        print(
            "=" * 72
        )

        print()

        component_arcs = []

        for order, start_entry in enumerate(
            entries
        ):
            end_entry = entries[
                (order + 1) %
                len(entries)
            ]

            start_crossing = crossing_of(
                start_entry
            )

            end_crossing = crossing_of(
                end_entry
            )

            start_record = (
                crossing_index.get(
                    start_crossing
                )
                if start_crossing is not None
                else None
            )

            end_record = (
                crossing_index.get(
                    end_crossing
                )
                if end_crossing is not None
                else None
            )

            arc = {
                "component":
                    component_id,

                "arc":
                    order,

                "start_crossing":
                    start_record,

                "start_strand":
                    strand_of(
                        start_entry
                    ),

                "end_crossing":
                    end_record,

                "end_strand":
                    strand_of(
                        end_entry
                    ),
            }

            component_arcs.append(
                arc
            )

            all_component_arcs.append(
                arc
            )

            print(
                f"arc {order:2d}:  "
                f"({arc['start_crossing']}, "
                f"{arc['start_strand']})"
                "  ->  "
                f"({arc['end_crossing']}, "
                f"{arc['end_strand']})"
            )

        print()


    # ========================================================
    # Crossing-circle cycle.
    # ========================================================

    circle_arcs = [
        arc
        for arc in
        all_component_arcs
        if arc[
            "component"
        ] ==
        CROSSING_CIRCLE_COMPONENT
    ]

    surviving_arcs = [
        arc
        for arc in
        all_component_arcs
        if arc[
            "component"
        ] ==
        SURVIVING_COMPONENT
    ]


    print(
        "=" * 72
    )

    print(
        "CROSSING-CIRCLE CYCLE"
    )

    print(
        "=" * 72
    )

    print()

    for arc in circle_arcs:
        print(
            f"C{arc['arc']}: "
            f"({arc['start_crossing']}, "
            f"{arc['start_strand']})"
            " -> "
            f"({arc['end_crossing']}, "
            f"{arc['end_strand']})"
        )

    print()


    # ========================================================
    # Surviving arcs incident to mixed crossings.
    #
    # These are the only candidates capable of passing through
    # the crossing-disk region.
    # ========================================================

    mixed_crossings = {
        0,
        2,
        3,
        4,
    }

    candidate_surviving_arcs = [
        arc
        for arc in
        surviving_arcs
        if (
            arc[
                "start_crossing"
            ] in mixed_crossings or
            arc[
                "end_crossing"
            ] in mixed_crossings
        )
    ]


    print(
        "=" * 72
    )

    print(
        "SURVIVING ARCS INCIDENT TO CROSSING CIRCLE"
    )

    print(
        "=" * 72
    )

    print()

    for arc in candidate_surviving_arcs:
        print(
            f"K{arc['arc']}: "
            f"({arc['start_crossing']}, "
            f"{arc['start_strand']})"
            " -> "
            f"({arc['end_crossing']}, "
            f"{arc['end_strand']})"
        )

    print()


    # ========================================================
    # Also expose CrossingStrand navigation.
    #
    # This tells us how the planar half-edges are linked around
    # the diagram and is the information needed to reconstruct
    # the disk boundary combinatorially.
    # ========================================================

    print(
        "=" * 72
    )

    print(
        "CROSSING HALF-EDGE NAVIGATION"
    )

    print(
        "=" * 72
    )

    print()

    for crossing_id, crossing in enumerate(
        link.crossings
    ):
        print(
            f"crossing {crossing_id}"
        )

        for strand_index in range(4):
            try:
                strand = crossing[
                    strand_index
                ]
            except Exception:
                strand = None

            adjacent = None

            if strand is not None:
                adjacent_crossing = (
                    crossing_of(
                        strand
                    )
                )

                adjacent_strand = (
                    strand_of(
                        strand
                    )
                )

                adjacent = (
                    crossing_index.get(
                        adjacent_crossing
                    )
                    if adjacent_crossing is not None
                    else None
                )

            print(
                "  half-edge "
                f"{strand_index}: "
                f"{repr(strand)}"
                "  -> crossing "
                f"{adjacent}"
                ", strand "
                f"{adjacent_strand if strand is not None else None}"
            )

        print()


    print(
        "CROSSING-DISK ARC GRAPH PROBE COMPLETE"
    )


if __name__ == "__main__":
    main()
