#!/usr/bin/env python3

from __future__ import annotations

import json
import subprocess
import sys

from spherogram import Link
from spherogram.links import tangles


TARGET_SIGNATURE = "cPcbbbiht"


# ============================================================
# CERTIFIED CROSSING-DISK BOUNDARY ORDER
# ============================================================
#
# Crossing-circle traversal in the original 5^2_1 diagram:
#
#   0 -> 3 -> 2 -> 4 -> 0
#
# The outside ends of those four disk positions map, after
# removal of the mixed crossings, to surviving-crossing strands:
#
#   crossing-circle 0 -> surviving strand 0
#   crossing-circle 3 -> surviving strand 1
#   crossing-circle 2 -> surviving strand 2
#   crossing-circle 4 -> surviving strand 3
#
# Thus one cyclic orientation is:
#
#   0, 1, 2, 3
#
# and the reversed cyclic orientation is:
#
#   0, 3, 2, 1
#
# We use the reversed orientation because numerator_closure()
# then restores the exact no-surgery pairings:
#
#   slot 0 <-> slot 1  => strand 0 <-> strand 3 = K4
#   slot 2 <-> slot 3  => strand 2 <-> strand 1 = K1
#
# This preserves the marked crossing-disk framing that was lost
# in the previous arbitrary boundary convention.
# ============================================================

BOUNDARY_ORDER = (
    (0, 0),
    (0, 3),
    (0, 2),
    (0, 1),
)

CLOSURE = "numerator"


CHILD_CODE = r'''
import json
import sys

import snappy

from spherogram import Link
from spherogram.links import tangles


payload = json.loads(
    sys.argv[1]
)

twist = int(
    payload["twist"]
)

composition = payload[
    "composition"
]

side = payload[
    "side"
]


BOUNDARY_ORDER = (
    (0, 0),
    (0, 3),
    (0, 2),
    (0, 1),
)


def build_outside():
    source = (
        Link("5^2_1")
        .sublink(0)
    )

    crossings = (
        source.crossings
    )

    if len(crossings) != 1:
        raise RuntimeError(
            "Expected surviving component to have "
            f"one crossing; found {len(crossings)}."
        )

    # Cut the two disk-passing arcs.
    #
    # K4 = strand 0 <-> strand 3
    # K1 = strand 1 <-> strand 2
    #
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
        "m129 certified crossing-disk outside",
    )


outside = (
    build_outside()
)

inserted = (
    tangles.IntegerTangle(
        twist
    )
)


if composition == "vertical":
    if side == "before":
        candidate = (
            inserted *
            outside
        )

    elif side == "after":
        candidate = (
            outside *
            inserted
        )

    else:
        raise ValueError(
            side
        )

elif composition == "horizontal":
    if side == "before":
        candidate = (
            inserted +
            outside
        )

    elif side == "after":
        candidate = (
            outside +
            inserted
        )

    else:
        raise ValueError(
            side
        )

else:
    raise ValueError(
        composition
    )


L = (
    candidate
    .numerator_closure()
)


result = {
    "twist":
        twist,

    "composition":
        composition,

    "side":
        side,

    "components":
        len(
            L.link_components
        ),

    "crossings":
        len(
            L.crossings
        ),

    "signs":
        [
            crossing.sign
            for crossing in
            L.crossings
        ],

    "PD":
        L.PD_code(),

    "DT":
        L.DT_code(),

    "signature":
        None,

    "identify":
        [],

    "is_m004":
        False,
}


if len(
    L.link_components
) == 1:
    try:
        E = (
            L.exterior()
        )

        signature = (
            E.isometry_signature()
        )

        result[
            "signature"
        ] = signature

        result[
            "identify"
        ] = [
            str(item)
            for item in
            E.identify()
        ]

        result[
            "is_m004"
        ] = (
            signature ==
            "cPcbbbiht"
        )

    except Exception as exc:
        result[
            "error"
        ] = repr(
            exc
        )


print(
    json.dumps(
        result
    )
)
'''


def edge_set(link):
    crossing_index = {
        crossing: index
        for index, crossing in
        enumerate(
            link.crossings
        )
    }

    edges = set()

    for crossing_id, crossing in enumerate(
        link.crossings
    ):
        for strand_id in range(4):
            adjacent = (
                crossing.adjacent[
                    strand_id
                ]
            )

            if adjacent is None:
                continue

            other_crossing, other_strand = (
                adjacent
            )

            endpoints = (
                (
                    crossing_id,
                    strand_id,
                ),
                (
                    crossing_index[
                        other_crossing
                    ],
                    int(
                        other_strand
                    ),
                ),
            )

            edges.add(
                tuple(
                    sorted(
                        endpoints
                    )
                )
            )

    return edges


def build_parent_outside():
    source = (
        Link("5^2_1")
        .sublink(0)
    )

    crossings = (
        source.crossings
    )

    if len(crossings) != 1:
        raise RuntimeError(
            "Expected exactly one surviving crossing."
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
        "m129 certified crossing-disk outside",
    )


def certify_zero_twist():
    source = (
        Link("5^2_1")
        .sublink(0)
    )

    expected = (
        edge_set(
            source
        )
    )

    outside = (
        build_parent_outside()
    )

    reconstructed = (
        outside
        .numerator_closure()
    )

    actual = (
        edge_set(
            reconstructed
        )
    )

    return {
        "expected":
            expected,

        "actual":
            actual,

        "exact":
            (
                expected ==
                actual
            ),

        "components":
            len(
                reconstructed
                .link_components
            ),

        "crossings":
            len(
                reconstructed
                .crossings
            ),
    }


def run_candidate(
    twist,
    composition,
    side,
):
    payload = {
        "twist":
            twist,

        "composition":
            composition,

        "side":
            side,
    }

    try:
        completed = subprocess.run(
            [
                sys.executable,
                "-c",
                CHILD_CODE,
                json.dumps(
                    payload
                ),
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=10,
        )

    except subprocess.TimeoutExpired:
        return {
            "timeout": True,
        }

    if completed.returncode != 0:
        return {
            "crashed": True,

            "returncode":
                completed.returncode,

            "stderr":
                completed.stderr.strip(),
        }

    lines = [
        line.strip()
        for line in
        completed.stdout.splitlines()
        if line.strip()
    ]

    if not lines:
        return {
            "error":
                "child produced no output",
        }

    try:
        return json.loads(
            lines[-1]
        )

    except Exception as exc:
        return {
            "error":
                f"JSON parse failed: {exc}",

            "stdout":
                completed.stdout,
        }


def main():
    print(
        "=" * 72
    )

    print(
        "m129 FINAL CROSSING-DISK TWIST-SIGN CERTIFICATION"
    )

    print(
        "=" * 72
    )

    print()

    print(
        "certified filling slope:",
        "(1, 1) ~ (-1, -1)",
    )

    print(
        "target signature:",
        TARGET_SIGNATURE,
    )

    print(
        "disk boundary order:",
        BOUNDARY_ORDER,
    )

    print(
        "closure:",
        CLOSURE,
    )

    print()


    # ========================================================
    # First certify that the disk-framed boundary convention
    # gives back the exact surviving source at zero twist.
    # ========================================================

    zero = (
        certify_zero_twist()
    )

    print(
        "ZERO-TWIST SOURCE CERTIFICATION"
    )

    print(
        "-" * 72
    )

    print(
        "expected edges:",
        sorted(
            zero[
                "expected"
            ]
        ),
    )

    print(
        "rebuilt edges:",
        sorted(
            zero[
                "actual"
            ]
        ),
    )

    print(
        "exact reconstruction:",
        zero[
            "exact"
        ],
    )

    print(
        "components:",
        zero[
            "components"
        ],
    )

    print(
        "crossings:",
        zero[
            "crossings"
        ],
    )

    print()

    if not zero[
        "exact"
    ]:
        raise SystemExit(
            "FAILED: certified crossing-disk boundary "
            "order does not reconstruct source."
        )


    # ========================================================
    # Test only ONE FULL TWIST:
    #
    #     IntegerTangle(+2)
    #     IntegerTangle(-2)
    #
    # We test the two tangle-category compositions and sides
    # because Spherogram's boundary convention determines which
    # expression realizes insertion into this marked disk.
    # ========================================================

    print(
        "=" * 72
    )

    print(
        "ONE-FULL-TWIST TEST"
    )

    print(
        "=" * 72
    )

    print()

    hits = []

    test_number = 0

    for twist in (
        -2,
        2,
    ):
        for composition in (
            "vertical",
            "horizontal",
        ):
            for side in (
                "before",
                "after",
            ):
                test_number += 1

                print(
                    f"[{test_number}/8] "
                    f"twist={twist:+d} "
                    f"{composition:<10} "
                    f"{side:<6}",
                    flush=True,
                )

                result = (
                    run_candidate(
                        twist,
                        composition,
                        side,
                    )
                )

                if result.get(
                    "timeout"
                ):
                    print(
                        "    TIMEOUT"
                    )

                    continue

                if result.get(
                    "crashed"
                ):
                    print(
                        "    CHILD CRASH:",
                        result.get(
                            "returncode"
                        ),
                    )

                    continue

                if result.get(
                    "error"
                ):
                    print(
                        "    ERROR:",
                        result[
                            "error"
                        ],
                    )

                    continue

                print(
                    "    components:",
                    result.get(
                        "components"
                    ),
                )

                print(
                    "    crossings:",
                    result.get(
                        "crossings"
                    ),
                )

                print(
                    "    signs:",
                    result.get(
                        "signs"
                    ),
                )

                print(
                    "    PD:",
                    result.get(
                        "PD"
                    ),
                )

                print(
                    "    DT:",
                    result.get(
                        "DT"
                    ),
                )

                print(
                    "    signature:",
                    result.get(
                        "signature"
                    ),
                )

                print(
                    "    identify:",
                    result.get(
                        "identify"
                    ),
                )

                print(
                    "    m004:",
                    result.get(
                        "is_m004"
                    ),
                )

                if result.get(
                    "error"
                ):
                    print(
                        "    exterior error:",
                        result[
                            "error"
                        ],
                    )

                if result.get(
                    "is_m004"
                ):
                    hits.append(
                        result
                    )

                    print(
                        "    >>> CERTIFIED m004 HIT"
                    )

                print()


    print(
        "=" * 72
    )

    print(
        "SUMMARY"
    )

    print(
        "=" * 72
    )

    print()

    print(
        "m004 hits:",
        len(
            hits
        ),
    )

    signs = sorted(
        {
            hit[
                "twist"
            ]
            for hit in
            hits
        }
    )

    print(
        "target-producing IntegerTangle signs:",
        signs,
    )

    print()

    for hit in hits:
        print(
            {
                "twist":
                    hit[
                        "twist"
                    ],

                "composition":
                    hit[
                        "composition"
                    ],

                "side":
                    hit[
                        "side"
                    ],

                "PD":
                    hit[
                        "PD"
                    ],

                "DT":
                    hit[
                        "DT"
                    ],

                "signature":
                    hit[
                        "signature"
                    ],
            }
        )

    print()

    if len(signs) == 1:
        print(
            "============================================================"
        )

        print(
            "PLANAR TWIST SIGN CERTIFIED"
        )

        print(
            "Spherogram IntegerTangle sign:",
            signs[0],
        )

        print(
            "full twists:",
            1,
        )

        print(
            "============================================================"
        )

    elif len(signs) == 0:
        print(
            "NO SIGN CERTIFIED: neither one-full-twist "
            "candidate produced m004."
        )

    else:
        print(
            "SIGN AMBIGUOUS: both planar signs produced m004."
        )

    print()

    print(
        "FINAL CROSSING-DISK TWIST-SIGN PROBE COMPLETE"
    )


if __name__ == "__main__":
    main()
