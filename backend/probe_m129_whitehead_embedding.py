from pprint import pprint

import snappy
from spherogram import Link


EXPECTED_PD = [
    (6, 5, 7, 0),
    (0, 3, 1, 4),
    (8, 2, 9, 1),
    (2, 8, 3, 7),
    (4, 9, 5, 6),
]

EXPECTED_ISOMETRY_SIGNATURE = "eLPkbdcddhgggb"


def heading(title):
    print()
    print("=" * 72)
    print(title)
    print("=" * 72)


def subheading(title):
    print()
    print("-" * 72)
    print(title)
    print("-" * 72)


def safe_value(obj, name):
    try:
        value = getattr(obj, name)
    except Exception as exc:
        return f"<ERROR reading {name}: {exc}>"

    if callable(value):
        return "<callable>"

    try:
        return repr(value)
    except Exception:
        return f"<{type(value).__name__}>"


def interesting_attributes(obj):
    names = [
        name
        for name in dir(obj)
        if not name.startswith("_")
    ]

    preferred = [
        "crossing",
        "strand_index",
        "component_label",
        "label",
        "sign",
        "adjacent",
        "directions",
        "entry_points",
        "strand_components",
        "is_over_crossing",
        "is_under_crossing",
        "opposite",
        "next",
        "previous",
    ]

    return [
        name
        for name in preferred
        if name in names
    ]


def describe_object(obj, indent=""):
    print(f"{indent}type: {type(obj).__module__}.{type(obj).__name__}")
    print(f"{indent}repr: {repr(obj)}")

    attrs = interesting_attributes(obj)

    if attrs:
        print(f"{indent}attributes:")

        for name in attrs:
            print(
                f"{indent}  {name}: "
                f"{safe_value(obj, name)}"
            )


def normalize_pd(pd):
    return [
        tuple(int(value) for value in crossing)
        for crossing in pd
    ]


def main():
    heading(
        "M129 WHITEHEAD AMBIENT EMBEDDING PROBE"
    )

    L = Link("5^2_1")

    print(f"name:                  {L.name}")
    print(f"components:            {len(L.link_components)}")
    print(f"crossings:             {len(L.crossings)}")

    pd = normalize_pd(L.PD_code())

    print(f"PD code:               {pd}")
    print(f"DT code:               {L.DT_code(DT_alpha=True)}")

    try:
        print(f"linking matrix:         {L.linking_matrix()}")
    except Exception as exc:
        print(f"linking matrix:         <ERROR: {exc}>")

    print(f"PD matches certified:  {pd == EXPECTED_PD}")


    subheading(
        "CERTIFIED EXTERIOR"
    )

    M = L.exterior()

    print(f"cusps:                 {M.num_cusps()}")
    print(f"volume:                {M.volume()}")
    print(f"isometry signature:    {M.isometry_signature()}")
    print(
        "matches m129:          "
        f"{M.isometry_signature() == EXPECTED_ISOMETRY_SIGNATURE}"
    )

    try:
        print(f"identify():             {M.identify()}")
    except Exception as exc:
        print(f"identify():             <ERROR: {exc}>")


    subheading(
        "LINK COMPONENTS — ORDERED TRAVERSAL"
    )

    for component_index, component in enumerate(
        L.link_components
    ):
        print()
        print(
            f"COMPONENT {component_index}"
        )
        print(
            f"entry count: {len(component)}"
        )

        for entry_index, entry in enumerate(
            component
        ):
            print()
            print(
                f"  entry {entry_index}"
            )

            describe_object(
                entry,
                indent="    "
            )


    subheading(
        "ALL CROSSINGS"
    )

    for crossing_index, crossing in enumerate(
        L.crossings
    ):
        print()
        print(
            f"CROSSING {crossing_index}"
        )

        describe_object(
            crossing,
            indent="  "
        )

        try:
            print("  slots:")

            for slot in range(4):
                try:
                    value = crossing[slot]
                    print(
                        f"    [{slot}] -> {repr(value)}"
                    )
                except Exception as exc:
                    print(
                        f"    [{slot}] -> <ERROR: {exc}>"
                    )

        except Exception as exc:
            print(
                f"  slots: <ERROR: {exc}>"
            )


    subheading(
        "CROSSING ENTRIES"
    )

    try:
        entries = list(
            L.crossing_entries()
        )

        print(
            f"count: {len(entries)}"
        )

        for index, entry in enumerate(
            entries
        ):
            print()
            print(
                f"ENTRY {index}"
            )

            describe_object(
                entry,
                indent="  "
            )

    except Exception as exc:
        print(
            f"crossing_entries() ERROR: {exc}"
        )


    subheading(
        "CROSSING STRANDS"
    )

    try:
        strands = list(
            L.crossing_strands()
        )

        print(
            f"count: {len(strands)}"
        )

        for index, strand in enumerate(
            strands
        ):
            print()
            print(
                f"STRAND {index}"
            )

            describe_object(
                strand,
                indent="  "
            )

    except Exception as exc:
        print(
            f"crossing_strands() ERROR: {exc}"
        )


    subheading(
        "KLP PROJECTION"
    )

    try:
        projection = L.KLPProjection()

        describe_object(
            projection,
            indent=""
        )

        if isinstance(
            projection,
            dict
        ):
            print()
            print("dictionary contents:")
            pprint(projection)

        elif isinstance(
            projection,
            (list, tuple)
        ):
            print()
            print(
                f"sequence length: {len(projection)}"
            )

            for index, item in enumerate(
                projection
            ):
                print()
                print(
                    f"KLP item {index}"
                )

                describe_object(
                    item,
                    indent="  "
                )

        elif hasattr(
            projection,
            "__dict__"
        ):
            print()
            print("__dict__:")
            pprint(
                projection.__dict__
            )

    except Exception as exc:
        print(
            f"KLPProjection() ERROR: {exc}"
        )


    subheading(
        "PD ROUND TRIP"
    )

    L2 = Link(
        L.PD_code()
    )

    round_trip_pd = normalize_pd(
        L2.PD_code()
    )

    print(
        "same PD code:          "
        f"{round_trip_pd == pd}"
    )

    print(
        "component lengths:     "
        f"{[len(c) for c in L.link_components]}"
    )

    print(
        "round-trip lengths:    "
        f"{[len(c) for c in L2.link_components]}"
    )


    heading(
        "PROPOSED PERSISTENT DIRECTED MARKING"
    )

    print(
        "component 0 -> SURVIVING_KNOT"
    )

    print(
        "component 1 -> CROSSING_CIRCLE"
    )

    print()
    print(
        "This marking is part of the directed surgery state, "
        "not an intrinsic distinction between the two symmetric "
        "cusps of the unmarked Whitehead-link complement."
    )


if __name__ == "__main__":
    main()
