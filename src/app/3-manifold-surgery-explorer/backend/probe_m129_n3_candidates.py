#!/usr/bin/env python3

from __future__ import annotations

import snappy

from spherogram import Link
from spherogram.links import tangles


BOUNDARY_ORDER = (
    (0, 0),
    (0, 3),
    (0, 1),
    (0, 2),
)


def make_outside():
    source = (
        Link("5^2_1")
        .sublink(0)
    )

    crossings = (
        source.crossings
    )

    for strand_id in range(4):
        crossings[0].adjacent[
            strand_id
        ] = None

    entries = [
        (
            crossings[
                crossing_id
            ],
            strand_id,
        )
        for crossing_id, strand_id
        in BOUNDARY_ORDER
    ]

    return tangles.Tangle(
        (2, 2),
        crossings,
        entries,
        "m129 surviving outside tangle",
    )


def inspect_candidate(
    n,
    side,
):
    outside = (
        make_outside()
    )

    inserted = (
        tangles.IntegerTangle(
            n
        )
    )

    if side == "before":
        candidate = (
            inserted *
            outside
        )
    else:
        candidate = (
            outside *
            inserted
        )

    L = (
        candidate
        .numerator_closure()
    )

    print(
        "=" * 72
    )

    print(
        f"n={n:+d}, vertical {side}"
    )

    print(
        "=" * 72
    )

    print()

    print(
        "components:",
        len(
            L.link_components
        ),
    )

    print(
        "crossings:",
        len(
            L.crossings
        ),
    )

    print(
        "signs:",
        [
            crossing.sign
            for crossing in
            L.crossings
        ],
    )

    try:
        print(
            "PD:",
            L.PD_code(),
        )
    except Exception as exc:
        print(
            "PD FAILED:",
            repr(exc),
        )

    try:
        print(
            "DT:",
            L.DT_code(),
        )
    except Exception as exc:
        print(
            "DT FAILED:",
            repr(exc),
        )

    print()

    try:
        E = (
            L.exterior()
        )

        print(
            "signature:",
            E.isometry_signature(),
        )

        print(
            "identify:",
            [
                str(item)
                for item in
                E.identify()
            ],
        )

        print(
            "volume:",
            E.volume(),
        )

    except Exception as exc:
        print(
            "EXTERIOR FAILED:"
        )

        print(
            repr(exc)
        )

    print()


def main():
    print(
        "=" * 72
    )

    print(
        "REFERENCE FIGURE-EIGHT"
    )

    print(
        "=" * 72
    )

    reference = Link(
        "4_1"
    )

    print(
        "signs:",
        [
            crossing.sign
            for crossing in
            reference.crossings
        ],
    )

    print(
        "PD:",
        reference.PD_code(),
    )

    print(
        "DT:",
        reference.DT_code(),
    )

    print()

    for n in (
        -3,
        3,
    ):
        for side in (
            "before",
            "after",
        ):
            inspect_candidate(
                n,
                side,
            )


if __name__ == "__main__":
    main()
