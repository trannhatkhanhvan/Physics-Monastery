#!/usr/bin/env python3

from __future__ import annotations

from itertools import permutations

import json
import subprocess
import sys

import snappy

from spherogram import Link
from spherogram.links import tangles


CUT_ENDPOINTS = (
    (2, 1),
    (3, 0),
    (4, 2),
    (0, 1),
)


CHILD_CODE = r'''
import json
import sys

import snappy

from spherogram import Link
from spherogram.links import tangles


payload = json.loads(
    sys.argv[1]
)

order = [
    tuple(item)
    for item in
    payload["order"]
]

closure = payload[
    "closure"
]

twist = payload.get(
    "twist"
)

composition = payload.get(
    "composition"
)

side = payload.get(
    "side"
)


CUT_ENDPOINTS = (
    (2, 1),
    (3, 0),
    (4, 2),
    (0, 1),
)


def make_outside():
    link = Link(
        "5^2_1"
    )

    crossings = (
        link.crossings
    )

    # Cut the two certified disk-passing edges.
    for crossing_id, strand_id in (
        CUT_ENDPOINTS
    ):
        crossings[
            crossing_id
        ].adjacent[
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
        in order
    ]

    return tangles.Tangle(
        (2, 2),
        crossings,
        entry_points,
        "exact m129 outside tangle",
    )


def close_tangle(T):
    if closure == "numerator":
        return (
            T.numerator_closure()
        )

    if closure == "denominator":
        return (
            T.denominator_closure()
        )

    raise ValueError(
        closure
    )


outside = (
    make_outside()
)


if twist is None:
    final_tangle = (
        outside
    )

else:
    inserted = (
        tangles.IntegerTangle(
            int(twist)
        )
    )

    if composition == "vertical":
        if side == "before":
            final_tangle = (
                inserted *
                outside
            )
        elif side == "after":
            final_tangle = (
                outside *
                inserted
            )
        else:
            raise ValueError(
                side
            )

    elif composition == "horizontal":
        if side == "before":
            final_tangle = (
                inserted +
                outside
            )
        elif side == "after":
            final_tangle = (
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


L = close_tangle(
    final_tangle
)

result = {
    "crossings":
        len(
            L.crossings
        ),

    "components":
        len(
            L.link_components
        ),
}

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

    result[
        "volume"
    ] = float(
        E.volume()
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


def run_child(
    order,
    closure,
    twist=None,
    composition=None,
    side=None,
):
    payload = {
        "order": [
            list(item)
            for item in order
        ],

        "closure":
            closure,

        "twist":
            twist,

        "composition":
            composition,

        "side":
            side,
    }

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
    )

    if completed.returncode != 0:
        return {
            "crashed": True,
            "returncode":
                completed.returncode,
        }

    lines = [
        line.strip()
        for line in
        completed.stdout.splitlines()
        if line.strip()
    ]

    if not lines:
        return {
            "crashed": False,
            "error":
                "no child output",
        }

    try:
        result = json.loads(
            lines[-1]
        )
    except Exception as exc:
        return {
            "crashed": False,
            "error":
                f"JSON parse failed: {exc}",
        }

    result[
        "crashed"
    ] = False

    return result


def edge_set(
    link,
):
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


def make_parent_outside(
    order,
):
    link = Link(
        "5^2_1"
    )

    crossings = (
        link.crossings
    )

    for crossing_id, strand_id in (
        CUT_ENDPOINTS
    ):
        crossings[
            crossing_id
        ].adjacent[
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
        in order
    ]

    return tangles.Tangle(
        (2, 2),
        crossings,
        entry_points,
    )


def close_parent(
    outside,
    closure,
):
    if closure == "numerator":
        return (
            outside
            .numerator_closure()
        )

    return (
        outside
        .denominator_closure()
    )


def main():
    source = Link(
        "5^2_1"
    )

    source_edges = (
        edge_set(
            source
        )
    )

    source_signature = (
        source
        .exterior()
        .isometry_signature()
    )

    target_signature = (
        __import__(
            "snappy"
        )
        .Manifold(
            "m004"
        )
        .isometry_signature()
    )

    print(
        "=" * 72
    )

    print(
        "m129 EXACT DISK-TWIST CERTIFICATION"
    )

    print(
        "=" * 72
    )

    print()

    print(
        "source signature:",
        source_signature,
    )

    print(
        "target signature:",
        target_signature,
    )

    print()

    exact_conventions = []

    # --------------------------------------------------------
    # First recover the 16 exact combinatorial conventions.
    # --------------------------------------------------------

    for order in permutations(
        CUT_ENDPOINTS
    ):
        for closure in (
            "numerator",
            "denominator",
        ):
            try:
                outside = (
                    make_parent_outside(
                        order
                    )
                )

                reconstructed = (
                    close_parent(
                        outside,
                        closure,
                    )
                )

                if (
                    edge_set(
                        reconstructed
                    )
                    ==
                    source_edges
                ):
                    exact_conventions.append(
                        (
                            order,
                            closure,
                        )
                    )

            except Exception:
                pass

    print(
        "exact source adjacency conventions:",
        len(
            exact_conventions
        ),
    )

    print()

    # --------------------------------------------------------
    # Verify those exact conventions directly in child SnapPy,
    # without serializing through PD_code().
    # --------------------------------------------------------

    source_certified = []

    for order, closure in (
        exact_conventions
    ):
        result = run_child(
            order,
            closure,
        )

        if (
            result.get(
                "signature"
            )
            ==
            source_signature
        ):
            source_certified.append(
                (
                    order,
                    closure,
                )
            )

    print(
        "source conventions certified by SnapPy:",
        len(
            source_certified
        ),
    )

    print()

    if not source_certified:
        raise SystemExit(
            "FAILED: exact combinatorial source "
            "reconstructions do not certify as m129."
        )

    # --------------------------------------------------------
    # Test both signs, both tangle compositions, and both sides,
    # keeping each exact source boundary convention fixed.
    # --------------------------------------------------------

    hits = []
    crashes = 0

    for order, closure in (
        source_certified
    ):
        print(
            "-" * 72
        )

        print(
            "order:",
            order,
        )

        print(
            "closure:",
            closure,
        )

        for twist in (
            2,
            -2,
        ):
            for composition in (
                "vertical",
                "horizontal",
            ):
                for side in (
                    "before",
                    "after",
                ):
                    result = (
                        run_child(
                            order,
                            closure,
                            twist=twist,
                            composition=composition,
                            side=side,
                        )
                    )

                    if result.get(
                        "crashed"
                    ):
                        crashes += 1

                    signature = (
                        result.get(
                            "signature"
                        )
                    )

                    is_target = (
                        signature ==
                        target_signature
                    )

                    if is_target:
                        hits.append(
                            {
                                "order":
                                    order,

                                "closure":
                                    closure,

                                "twist":
                                    twist,

                                "composition":
                                    composition,

                                "side":
                                    side,

                                "crossings":
                                    result.get(
                                        "crossings"
                                    ),

                                "components":
                                    result.get(
                                        "components"
                                    ),
                            }
                        )

                    print(
                        f"  twist {twist:+d} "
                        f"{composition:<10} "
                        f"{side:<6} "
                        f"signature={signature} "
                        f"m004={is_target}"
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
        "exact adjacency conventions:",
        len(
            exact_conventions
        ),
    )

    print(
        "SnapPy-certified source conventions:",
        len(
            source_certified
        ),
    )

    print(
        "m004 hits:",
        len(
            hits
        ),
    )

    print(
        "isolated child crashes:",
        crashes,
    )

    print()

    for hit in hits:
        print(
            hit
        )

    print()

    signs = sorted(
        {
            hit[
                "twist"
            ]
            for hit in
            hits
        }
    )

    compositions = sorted(
        {
            hit[
                "composition"
            ]
            for hit in
            hits
        }
    )

    print(
        "target-producing twist signs:",
        signs,
    )

    print(
        "target-producing compositions:",
        compositions,
    )

    print()

    if len(signs) == 1:
        print(
            "EXACT SOURCE-DIAGRAM TWIST SIGN:",
            signs[0],
        )

    print()

    print(
        "EXACT DISK-TWIST CERTIFICATION COMPLETE"
    )


if __name__ == "__main__":
    main()
