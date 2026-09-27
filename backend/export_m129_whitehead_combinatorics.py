import json

import snappy
from spherogram import Link


EXPECTED_PD = [
    (6, 5, 7, 0),
    (0, 3, 1, 4),
    (8, 2, 9, 1),
    (2, 8, 3, 7),
    (4, 9, 5, 6),
]

EXPECTED_SIG = "eLPkbdcddhgggb"


def entry_record(entry):
    return {
        "crossing":
            int(entry.crossing.label),

        "strand_index":
            int(entry.strand_index),

        "component":
            int(entry.component_label()),

        "is_over":
            bool(entry.is_over_crossing()),

        "is_under":
            bool(entry.is_under_crossing()),

        "next": {
            "crossing":
                int(entry.next().crossing.label),

            "strand_index":
                int(entry.next().strand_index),
        },

        "opposite": {
            "crossing":
                int(entry.opposite().crossing.label),

            "strand_index":
                int(entry.opposite().strand_index),
        },
    }


def main():
    L = Link("5^2_1")

    pd = [
        tuple(
            int(value)
            for value in crossing
        )
        for crossing in L.PD_code()
    ]

    if pd != EXPECTED_PD:
        raise RuntimeError(
            "Certified Whitehead PD code changed."
        )

    M = L.exterior()

    sig = M.isometry_signature()

    if sig != EXPECTED_SIG:
        raise RuntimeError(
            f"Expected m129 signature {EXPECTED_SIG}, got {sig}."
        )


    projection = L.KLPProjection()

    klp_crossings = projection[3]


    components = []

    for component_index, component in enumerate(
        L.link_components
    ):
        components.append({
            "component":
                component_index,

            "role":
                (
                    "SURVIVING_KNOT"
                    if component_index == 0
                    else "CROSSING_CIRCLE"
                ),

            "entries": [
                entry_record(entry)
                for entry in component
            ],
        })


    crossings = []

    for crossing in klp_crossings:
        crossings.append({
            "index":
                int(crossing.index),

            "sign":
                str(crossing.sign),

            "Xcomponent":
                int(crossing.Xcomponent),

            "Ycomponent":
                int(crossing.Ycomponent),

            "neighbor": {
                key:
                    int(value)
                for key, value
                in crossing.neighbor.items()
            },

            "strand": {
                key:
                    str(value)
                for key, value
                in crossing.strand.items()
            },
        })


    occurrences = {}

    for crossing_index, crossing in enumerate(
        pd
    ):
        for slot, edge_label in enumerate(
            crossing
        ):
            occurrences.setdefault(
                str(edge_label),
                []
            ).append({
                "crossing":
                    crossing_index,

                "slot":
                    slot,
            })


    result = {
        "manifold":
            "m129",

        "link_name":
            "5^2_1",

        "isometry_signature":
            sig,

        "pd_code":
            [list(x) for x in pd],

        "component_lengths":
            [
                len(component)
                for component
                in L.link_components
            ],

        "components":
            components,

        "klp_header":
            [
                int(projection[0]),
                int(projection[1]),
                int(projection[2]),
            ],

        "crossings":
            crossings,

        "edge_incidence":
            occurrences,
    }


    output = (
        "src/app/3-manifold-surgery-explorer/"
        "data/generated/"
        "m129_whitehead_combinatorics.json"
    )

    with open(
        output,
        "w",
        encoding="utf-8"
    ) as handle:
        json.dump(
            result,
            handle,
            indent=2,
            sort_keys=True,
        )

        handle.write("\n")


    print(
        "M129 WHITEHEAD COMBINATORICS EXPORTED"
    )

    print(
        f"isometry signature: {sig}"
    )

    print(
        f"components: {[len(c) for c in L.link_components]}"
    )

    print(
        f"crossings: {len(crossings)}"
    )

    print(
        f"PD edges: {len(occurrences)}"
    )

    print(
        f"output: {output}"
    )

    print()

    print(
        json.dumps(
            {
                "components":
                    components,

                "crossings":
                    crossings,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
