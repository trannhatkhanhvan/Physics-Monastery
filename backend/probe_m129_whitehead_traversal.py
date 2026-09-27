import snappy
from spherogram import Link


EXPECTED_PD = [
    (6, 5, 7, 0),
    (0, 3, 1, 4),
    (8, 2, 9, 1),
    (2, 8, 3, 7),
    (4, 9, 5, 6),
]


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


def safe_call(obj, name):
    try:
        value = getattr(obj, name)

        if callable(value):
            value = value()

        return value

    except Exception as exc:
        return f"<ERROR: {exc}>"


def crossing_id(value):
    try:
        return int(value.crossing.label)
    except Exception:
        pass

    try:
        return int(value.crossing)
    except Exception:
        pass

    return repr(value)


def describe_entry(entry):
    print(f"repr:               {entry!r}")
    print(f"crossing:           {crossing_id(entry)}")
    print(f"strand_index:       {entry.strand_index}")

    print(
        "component_label():  "
        f"{safe_call(entry, 'component_label')}"
    )

    print(
        "is_over_crossing(): "
        f"{safe_call(entry, 'is_over_crossing')}"
    )

    print(
        "is_under_crossing(): "
        f"{safe_call(entry, 'is_under_crossing')}"
    )

    print(
        "opposite():         "
        f"{safe_call(entry, 'opposite')!r}"
    )

    print(
        "next():             "
        f"{safe_call(entry, 'next')!r}"
    )

    print(
        "previous():         "
        f"{safe_call(entry, 'previous')!r}"
    )


def main():
    L = Link("5^2_1")

    heading(
        "M129 WHITEHEAD ORIENTED TRAVERSAL PROBE"
    )

    print(f"name:             {L.name}")
    print(f"components:       {len(L.link_components)}")
    print(f"crossings:        {len(L.crossings)}")
    print(f"PD:               {L.PD_code()}")
    print(
        "PD certified:     "
        f"{list(map(tuple, L.PD_code())) == EXPECTED_PD}"
    )


    subheading(
        "ORDERED COMPONENT ENTRIES"
    )

    for component_index, component in enumerate(
        L.link_components
    ):
        print()
        print(
            f"COMPONENT {component_index}"
        )

        print(
            f"length: {len(component)}"
        )

        for index, entry in enumerate(
            component
        ):
            print()
            print(
                f"  STEP {index}"
            )

            describe_entry(
                entry
            )


    subheading(
        "ENTRY GRAPH VIA next()"
    )

    for component_index, component in enumerate(
        L.link_components
    ):
        if not component:
            continue

        start = component[0]

        current = start

        seen = set()

        print()
        print(
            f"COMPONENT {component_index}"
        )

        for step in range(32):
            key = (
                crossing_id(current),
                current.strand_index,
            )

            if key in seen:
                print(
                    f"  CLOSED at step {step}: {key}"
                )
                break

            seen.add(key)

            print(
                f"  {step:02d}: "
                f"crossing={crossing_id(current)} "
                f"strand={current.strand_index} "
                f"over={safe_call(current, 'is_over_crossing')} "
                f"under={safe_call(current, 'is_under_crossing')} "
                f"component={safe_call(current, 'component_label')}"
            )

            nxt = safe_call(
                current,
                "next"
            )

            if isinstance(
                nxt,
                str
            ):
                print(
                    f"  next() ERROR: {nxt}"
                )
                break

            current = nxt


    subheading(
        "KLP CROSSING INTERNALS"
    )

    projection = L.KLPProjection()

    crossing_records = projection[3]

    print(
        f"KLP header: {projection[:3]}"
    )

    print(
        f"KLP crossings: {len(crossing_records)}"
    )

    for index, crossing in enumerate(
        crossing_records
    ):
        print()
        print(
            f"KLP CROSSING {index}"
        )

        print(
            f"type: {type(crossing).__module__}."
            f"{type(crossing).__name__}"
        )

        print(
            f"repr: {crossing!r}"
        )

        if hasattr(
            crossing,
            "__dict__"
        ):
            print("__dict__:")

            for key, value in sorted(
                crossing.__dict__.items()
            ):
                print(
                    f"  {key}: {value!r}"
                )

        print("public attrs:")

        for name in sorted(
            x
            for x in dir(crossing)
            if not x.startswith("_")
        ):
            try:
                value = getattr(
                    crossing,
                    name
                )

                if callable(value):
                    print(
                        f"  {name}: <callable>"
                    )
                else:
                    print(
                        f"  {name}: {value!r}"
                    )

            except Exception as exc:
                print(
                    f"  {name}: <ERROR {exc}>"
                )


    subheading(
        "PD EDGE INCIDENCE"
    )

    pd = [
        tuple(
            int(value)
            for value in crossing
        )
        for crossing in L.PD_code()
    ]

    occurrences = {}

    for crossing_index, crossing in enumerate(
        pd
    ):
        for slot, edge_label in enumerate(
            crossing
        ):
            occurrences.setdefault(
                edge_label,
                []
            ).append(
                (
                    crossing_index,
                    slot,
                )
            )

    for edge_label in sorted(
        occurrences
    ):
        print(
            f"edge {edge_label:2d}: "
            f"{occurrences[edge_label]}"
        )


    heading(
        "GOAL OF NEXT EXPORT"
    )

    print(
        "Use the certified ordered component traversal, "
        "crossing over/under data, and PD edge incidence "
        "to construct a deterministic planar link diagram."
    )

    print()

    print(
        "Then lift only the crossing neighborhoods in z, "
        "producing a 3D embedding whose XY projection "
        "reproduces this exact certified diagram."
    )


if __name__ == "__main__":
    main()
