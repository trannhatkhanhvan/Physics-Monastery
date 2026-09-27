#!/usr/bin/env python3

from __future__ import annotations

import json
import subprocess
import sys

from spherogram import Link
from spherogram.links import tangles


TARGET_SIGNATURE = "cPcbbbiht"


# ============================================================
# Exact surviving-only diagram
# ============================================================
#
# After deleting crossing-circle component 1:
#
#   K1 -> (0,1) <-> (0,2)
#   K4 -> (0,0) <-> (0,3)
#
# Choose one exact numerator-closure convention:
#
#   bottom pair: (0,0), (0,3)
#   top pair:    (0,1), (0,2)
#
# numerator_closure reconnects:
#
#   boundary 0 <-> 1
#   boundary 2 <-> 3
#
# which restores both original surviving edges exactly.
# ============================================================

BOUNDARY_ORDER = (
    (0, 0),
    (0, 3),
    (0, 1),
    (0, 2),
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

n = int(
    payload["n"]
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
    (0, 1),
    (0, 2),
)


# ------------------------------------------------------------
# Build the exact surviving-only one-crossing unknot.
# ------------------------------------------------------------

source = (
    Link("5^2_1")
    .sublink(0)
)

crossings = (
    source.crossings
)

if len(crossings) != 1:
    raise RuntimeError(
        "Expected surviving sublink to have exactly "
        f"one crossing, found {len(crossings)}."
    )


# Cut both surviving disk-passing edges.
for strand_id in range(4):
    crossings[0].adjacent[
        strand_id
    ] = None


entry_points = [
    (
        crossings[
            crossing_id
        ],
        strand_id,
    )
    for crossing_id, strand_id
    in BOUNDARY_ORDER
]


outside = tangles.Tangle(
    (2, 2),
    crossings,
    entry_points,
    "m129 surviving outside tangle",
)


inserted = tangles.IntegerTangle(
    n
)


# ------------------------------------------------------------
# Test the possible tangle-category placements.
# ------------------------------------------------------------

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


# Keep the exact source boundary convention fixed.
L = (
    candidate
    .numerator_closure()
)


result = {
    "n":
        n,

    "composition":
        composition,

    "side":
        side,

    "crossings":
        len(
            L.crossings
        ),

    "components":
        len(
            L.link_components
        ),

    "signature":
        None,

    "identify":
        [],
}


if (
    len(
        L.link_components
    ) == 1
):
    try:
        E = L.exterior()

        result[
            "signature"
        ] = (
            E.isometry_signature()
        )

        result[
            "identify"
        ] = [
            str(item)
            for item in
            E.identify()
        ]

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

    result = set()

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

            result.add(
                tuple(
                    sorted(
                        (
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
                    )
                )
            )

    return result


def make_outside():
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
        "m129 surviving outside tangle",
    )


def verify_source_convention():
    source = (
        Link("5^2_1")
        .sublink(0)
    )

    expected_edges = (
        edge_set(
            source
        )
    )

    outside = (
        make_outside()
    )

    reconstructed = (
        outside
        .numerator_closure()
    )

    actual_edges = (
        edge_set(
            reconstructed
        )
    )

    return {
        "expected_edges":
            expected_edges,

        "actual_edges":
            actual_edges,

        "exact":
            (
                actual_edges ==
                expected_edges
            ),

        "crossings":
            len(
                reconstructed
                .crossings
            ),

        "components":
            len(
                reconstructed
                .link_components
            ),
    }


def test_candidate(
    n,
    composition,
    side,
):
    payload = {
        "n":
            n,

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
            timeout=8,
        )

    except subprocess.TimeoutExpired:
        return {
            "timeout": True,
            "signature": None,
        }

    if completed.returncode != 0:
        return {
            "crashed": True,
            "returncode":
                completed.returncode,

            "signature":
                None,
        }

    lines = [
        line.strip()
        for line in
        completed.stdout.splitlines()
        if line.strip()
    ]

    if not lines:
        return {
            "signature": None,
            "error":
                "child produced no output",
        }

    try:
        return json.loads(
            lines[-1]
        )

    except Exception as exc:
        return {
            "signature": None,
            "error":
                f"JSON parse failed: {exc}",
        }


def main():
    print(
        "=" * 72
    )

    print(
        "m129 FAST SURVIVING-TANGLE REWRITE PROBE"
    )

    print(
        "=" * 72
    )

    print()

    source = (
        Link("5^2_1")
        .sublink(0)
    )

    print(
        "surviving source PD:",
        source.PD_code(),
    )

    print(
        "boundary order:",
        BOUNDARY_ORDER,
    )

    print(
        "closure:",
        CLOSURE,
    )

    print()

    # ========================================================
    # Mandatory exact-source sanity check.
    # ========================================================

    source_check = (
        verify_source_convention()
    )

    print(
        "source expected edges:",
        sorted(
            source_check[
                "expected_edges"
            ]
        ),
    )

    print(
        "source rebuilt edges:",
        sorted(
            source_check[
                "actual_edges"
            ]
        ),
    )

    print(
        "exact source reconstruction:",
        source_check[
            "exact"
        ],
    )

    print(
        "reconstructed crossings:",
        source_check[
            "crossings"
        ],
    )

    print(
        "reconstructed components:",
        source_check[
            "components"
        ],
    )

    print()

    if not source_check[
        "exact"
    ]:
        raise SystemExit(
            "FAILED: chosen boundary convention does not "
            "reconstruct the exact surviving source."
        )

    print(
        "=" * 72
    )

    print(
        "INTEGER-TANGLE SEARCH"
    )

    print(
        "=" * 72
    )

    print()

    hits = []
    crashes = 0
    timeouts = 0

    n_values = [
        n
        for n in range(
            -8,
            9,
        )
        if n != 0
    ]

    total = (
        len(
            n_values
        ) *
        4
    )

    test_number = 0

    for n in n_values:
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
                    f"[{test_number:02d}/{total}] "
                    f"n={n:+d} "
                    f"{composition:<10} "
                    f"{side:<6}",
                    end="  ",
                    flush=True,
                )

                result = (
                    test_candidate(
                        n,
                        composition,
                        side,
                    )
                )

                if result.get(
                    "timeout"
                ):
                    timeouts += 1

                    print(
                        "TIMEOUT"
                    )

                    continue

                if result.get(
                    "crashed"
                ):
                    crashes += 1

                    print(
                        "CRASH "
                        f"{result.get('returncode')}"
                    )

                    continue

                signature = (
                    result.get(
                        "signature"
                    )
                )

                components = (
                    result.get(
                        "components"
                    )
                )

                crossings = (
                    result.get(
                        "crossings"
                    )
                )

                is_target = (
                    signature ==
                    TARGET_SIGNATURE
                )

                print(
                    f"components={components} "
                    f"crossings={crossings} "
                    f"signature={signature} "
                    f"m004={is_target}"
                )

                if is_target:
                    hit = {
                        "integer_tangle":
                            n,

                        "composition":
                            composition,

                        "side":
                            side,

                        "crossings":
                            crossings,

                        "components":
                            components,

                        "identify":
                            result.get(
                                "identify"
                            ),
                    }

                    hits.append(
                        hit
                    )

                    print(
                        "    >>> m004 HIT:",
                        hit,
                        flush=True,
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
        "tests:",
        total,
    )

    print(
        "m004 hits:",
        len(
            hits
        ),
    )

    print(
        "child crashes:",
        crashes,
    )

    print(
        "timeouts:",
        timeouts,
    )

    print()

    values = sorted(
        {
            hit[
                "integer_tangle"
            ]
            for hit in
            hits
        }
    )

    print(
        "target-producing IntegerTangle(n):",
        values,
    )

    print()

    for hit in hits:
        print(
            hit
        )

    print()

    print(
        "FAST SURVIVING-TANGLE REWRITE PROBE COMPLETE"
    )


if __name__ == "__main__":
    main()
