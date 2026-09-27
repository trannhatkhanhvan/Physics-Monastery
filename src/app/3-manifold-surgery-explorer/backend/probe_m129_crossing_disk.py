#!/usr/bin/env python3

from __future__ import annotations

from spherogram import Link


LINK_NAME = "5^2_1"

SURVIVING_COMPONENT = 0
CROSSING_CIRCLE_COMPONENT = 1


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


def entry_strand(entry):
    strand = getattr(
        entry,
        "strand_index",
        None,
    )

    if strand is not None:
        return int(strand)

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
        "m129 CROSSING-DISK / PLANAR-FACE PROBE"
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
        "crossings:",
        len(
            link.crossings
        ),
    )

    print(
        "components:",
        len(
            link.link_components
        ),
    )

    print()


    # ========================================================
    # Isolate both link components.
    # ========================================================

    surviving = link.sublink(
        [
            link.link_components[
                SURVIVING_COMPONENT
            ]
        ]
    )

    crossing_circle = link.sublink(
        [
            link.link_components[
                CROSSING_CIRCLE_COMPONENT
            ]
        ]
    )

    print(
        "=" * 72
    )

    print(
        "ISOLATED COMPONENTS"
    )

    print(
        "=" * 72
    )

    print()

    print(
        "surviving component crossings:",
        len(
            surviving.crossings
        ),
    )

    print(
        "crossing-circle crossings:",
        len(
            crossing_circle.crossings
        ),
    )

    print()

    print(
        "surviving PD:",
        surviving.PD_code(),
    )

    print(
        "crossing-circle PD:",
        crossing_circle.PD_code(),
    )

    print()


    # ========================================================
    # Simplify isolated crossing circle.
    #
    # A genuine crossing-circle component should simplify to
    # an unknot.
    # ========================================================

    simplified_circle = (
        crossing_circle.copy()
    )

    try:
        simplified_circle.simplify(
            "global"
        )
    except TypeError:
        simplified_circle.simplify()

    print(
        "crossing-circle after simplify:"
    )

    print(
        "  crossings:",
        len(
            simplified_circle.crossings
        ),
    )

    print(
        "  PD:",
        simplified_circle.PD_code(),
    )

    print()


    # ========================================================
    # Ask Spherogram for the planar faces of the full diagram.
    # ========================================================

    try:
        faces = link.faces()
    except Exception as exc:
        print(
            "FACES API FAILED:"
        )

        print(
            type(exc).__name__,
            exc,
        )

        print()

        print(
            "Available link attributes containing "
            "'face', 'region', or 'planar':"
        )

        names = [
            name
            for name in dir(link)
            if (
                "face" in name.lower() or
                "region" in name.lower() or
                "planar" in name.lower()
            )
        ]

        for name in names:
            print(
                " ",
                name,
            )

        raise


    print(
        "=" * 72
    )

    print(
        "PLANAR FACES"
    )

    print(
        "=" * 72
    )

    print()

    print(
        "face count:",
        len(faces),
    )

    print()


    component_membership = {}

    for component_id, component in enumerate(
        link.link_components
    ):
        for entry in component:
            crossing = entry_crossing(
                entry
            )

            strand = entry_strand(
                entry
            )

            if (
                crossing is None or
                strand is None
            ):
                continue

            component_membership[
                (
                    crossing,
                    strand,
                )
            ] = component_id


    face_records = []

    for face_index, face in enumerate(
        faces
    ):
        boundary = []

        component_ids = []

        for entry in face:
            crossing = entry_crossing(
                entry
            )

            strand = entry_strand(
                entry
            )

            index = (
                crossing_index.get(
                    crossing
                )
                if crossing is not None
                else None
            )

            component_id = (
                component_membership.get(
                    (
                        crossing,
                        strand,
                    )
                )
                if (
                    crossing is not None and
                    strand is not None
                )
                else None
            )

            boundary.append(
                {
                    "crossing":
                        index,

                    "strand":
                        strand,

                    "component":
                        component_id,

                    "repr":
                        repr(entry),
                }
            )

            if component_id is not None:
                component_ids.append(
                    component_id
                )

        face_records.append(
            {
                "face":
                    face_index,

                "boundary":
                    boundary,

                "components":
                    component_ids,
            }
        )


    for record in face_records:
        print(
            f"face {record['face']}"
        )

        for edge in record[
            "boundary"
        ]:
            print(
                "  crossing "
                f"{str(edge['crossing']):>2}"
                "  strand "
                f"{str(edge['strand']):>2}"
                "  component "
                f"{str(edge['component']):>2}"
                "  "
                f"{edge['repr']}"
            )

        print()


    # ========================================================
    # Candidate crossing-disk regions.
    #
    # We are looking for faces whose boundary contains the
    # crossing-circle component together with surviving-knot
    # segments. These are the planar regions adjacent to the
    # crossing circle from which the spanning disk presentation
    # can be reconstructed.
    # ========================================================

    candidates = []

    for record in face_records:
        component_set = set(
            component
            for component in
            record["components"]
            if component is not None
        )

        if (
            CROSSING_CIRCLE_COMPONENT
            in component_set
        ):
            candidates.append(
                record["face"]
            )


    print(
        "=" * 72
    )

    print(
        "CROSSING-CIRCLE-ADJACENT FACES"
    )

    print(
        "=" * 72
    )

    print()

    print(
        candidates
    )

    print()

    print(
        "CROSSING-DISK FACE PROBE COMPLETE"
    )


if __name__ == "__main__":
    main()
