#!/usr/bin/env python3

from __future__ import annotations

from collections import defaultdict

from spherogram import Link


LINK_NAME = "5^2_1"

SURVIVING_COMPONENT = 0
CROSSING_CIRCLE_COMPONENT = 1


def crossing_index_map(link):
    return {
        crossing: index
        for index, crossing in
        enumerate(link.crossings)
    }


def entry_crossing(entry):
    crossing = getattr(
        entry,
        "crossing",
        None,
    )

    if crossing is not None:
        return crossing

    try:
        return entry[0]
    except Exception:
        return None


def entry_strand_index(entry):
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


def component_entry_records(
    link,
    component_index,
    crossing_indices,
):
    component = (
        link.link_components[
            component_index
        ]
    )

    records = []

    for order, entry in enumerate(
        component
    ):
        crossing = entry_crossing(
            entry
        )

        strand_index = (
            entry_strand_index(
                entry
            )
        )

        records.append(
            {
                "component":
                    component_index,

                "order":
                    order,

                "crossing":
                    (
                        crossing_indices.get(
                            crossing
                        )
                        if crossing is not None
                        else None
                    ),

                "strand_index":
                    strand_index,

                "entry_type":
                    type(entry).__name__,

                "entry_repr":
                    repr(entry),
            }
        )

    return records


def main():
    link = Link(
        LINK_NAME
    )

    crossing_indices = (
        crossing_index_map(
            link
        )
    )

    component_records = [
        component_entry_records(
            link,
            component_index,
            crossing_indices,
        )
        for component_index in
        range(
            len(
                link.link_components
            )
        )
    ]

    crossing_to_components = (
        defaultdict(list)
    )

    for records in component_records:
        for record in records:
            crossing_index = (
                record[
                    "crossing"
                ]
            )

            if crossing_index is None:
                continue

            crossing_to_components[
                crossing_index
            ].append(
                {
                    "component":
                        record[
                            "component"
                        ],

                    "order":
                        record[
                            "order"
                        ],

                    "strand_index":
                        record[
                            "strand_index"
                        ],
                }
            )

    print(
        "=" * 72
    )

    print(
        "m129 SPHEROGRAM SURGERY-DIAGRAM PROBE"
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

    print(
        "PD code:"
    )

    print(
        link.PD_code()
    )

    print()

    try:
        print(
            "DT code:",
            link.DT_code(),
        )
    except Exception as exc:
        print(
            "DT code unavailable:",
            exc,
        )

    print()

    print(
        "=" * 72
    )

    print(
        "COMPONENT TRAVERSALS"
    )

    print(
        "=" * 72
    )

    for (
        component_index,
        records
    ) in enumerate(
        component_records
    ):
        role = (
            "SURVIVING_KNOT"
            if component_index ==
            SURVIVING_COMPONENT
            else
            "CROSSING_CIRCLE"
            if component_index ==
            CROSSING_CIRCLE_COMPONENT
            else
            "UNASSIGNED"
        )

        print()

        print(
            f"component {component_index} "
            f"({role})"
        )

        print(
            "-" * 72
        )

        for record in records:
            print(
                "order "
                f"{record['order']:2d}"
                "  crossing "
                f"{str(record['crossing']):>2}"
                "  strand "
                f"{str(record['strand_index']):>2}"
                "  "
                f"{record['entry_repr']}"
            )

    print()

    print(
        "=" * 72
    )

    print(
        "CROSSING INCIDENCE"
    )

    print(
        "=" * 72
    )

    mixed_crossings = []

    for crossing_index in range(
        len(
            link.crossings
        )
    ):
        crossing = (
            link.crossings[
                crossing_index
            ]
        )

        incidence = (
            crossing_to_components[
                crossing_index
            ]
        )

        component_set = {
            item[
                "component"
            ]
            for item in incidence
        }

        kind = (
            "MIXED"
            if len(
                component_set
            ) > 1
            else
            "SELF"
        )

        if kind == "MIXED":
            mixed_crossings.append(
                crossing_index
            )

        sign = getattr(
            crossing,
            "sign",
            None,
        )

        label = getattr(
            crossing,
            "label",
            None,
        )

        print()

        print(
            f"crossing {crossing_index}"
        )

        print(
            f"  label:      {label}"
        )

        print(
            f"  sign:       {sign}"
        )

        print(
            f"  kind:       {kind}"
        )

        print(
            "  incidence:"
        )

        for item in incidence:
            print(
                "    component "
                f"{item['component']}"
                "  component-order "
                f"{item['order']}"
                "  strand "
                f"{item['strand_index']}"
            )

    print()

    print(
        "=" * 72
    )

    print(
        "SURGERY-RELEVANT SUMMARY"
    )

    print(
        "=" * 72
    )

    print()

    print(
        "surviving component:",
        SURVIVING_COMPONENT,
    )

    print(
        "crossing-circle component:",
        CROSSING_CIRCLE_COMPONENT,
    )

    print(
        "mixed crossings:",
        mixed_crossings,
    )

    surviving_mixed_order = [
        record
        for record in
        component_records[
            SURVIVING_COMPONENT
        ]
        if record[
            "crossing"
        ] in mixed_crossings
    ]

    circle_mixed_order = [
        record
        for record in
        component_records[
            CROSSING_CIRCLE_COMPONENT
        ]
        if record[
            "crossing"
        ] in mixed_crossings
    ]

    print()

    print(
        "mixed crossings in surviving-knot traversal order:"
    )

    print(
        [
            (
                item["crossing"],
                item["strand_index"],
            )
            for item in
            surviving_mixed_order
        ]
    )

    print()

    print(
        "mixed crossings in crossing-circle traversal order:"
    )

    print(
        [
            (
                item["crossing"],
                item["strand_index"],
            )
            for item in
            circle_mixed_order
        ]
    )

    print()

    print(
        "SPHEROGRAM SURGERY-DIAGRAM PROBE COMPLETE"
    )


if __name__ == "__main__":
    main()
