#!/usr/bin/env python3

from __future__ import annotations

from itertools import permutations

import json
import subprocess
import sys

import snappy

from spherogram import Link
from spherogram.links import tangles


SOURCE_SIGNATURE = (
    snappy.Manifold("m129")
    .isometry_signature()
)

TARGET_SIGNATURE = (
    snappy.Manifold("m004")
    .isometry_signature()
)


# Exact cut edges:
#
# K1: (2,1) <-> (3,0)
# K4: (4,2) <-> (0,1)
#
CUT_ENDPOINTS = (
    (2, 1),
    (3, 0),
    (4, 2),
    (0, 1),
)


CHILD_CODE = r'''
import json
import sys

from spherogram import Link

pd = json.loads(
    sys.argv[1]
)

try:
    L = Link(
        [
            tuple(
                int(value)
                for value in crossing
            )
            for crossing in pd
        ]
    )

    result = {
        "components":
            len(
                L.link_components
            ),

        "crossings":
            len(
                L.crossings
            ),
    }

    try:
        E = L.exterior()

        result["signature"] = (
            E.isometry_signature()
        )

        result["ok"] = True

    except Exception as exc:
        result["signature"] = None
        result["ok"] = False
        result["error"] = repr(exc)

    print(
        json.dumps(
            result
        )
    )

except Exception as exc:
    print(
        json.dumps(
            {
                "ok": False,
                "signature": None,
                "error": repr(exc),
            }
        )
    )
'''


def certify_link_in_child(
    link,
):
    pd_code = (
        link.PD_code()
    )

    encoded = json.dumps(
        [
            list(crossing)
            for crossing in
            pd_code
        ]
    )

    completed = subprocess.run(
        [
            sys.executable,
            "-c",
            CHILD_CODE,
            encoded,
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )

    if completed.returncode != 0:
        return {
            "signature": None,
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
            "signature": None,
            "crashed": False,
            "error":
                "child produced no output",
        }

    try:
        result = json.loads(
            lines[-1]
        )
    except Exception as exc:
        return {
            "signature": None,
            "crashed": False,
            "error":
                f"parse failure: {exc}",
        }

    result["crashed"] = False

    return result


def make_outside_tangle(
    order,
):
    link = Link(
        "5^2_1"
    )

    crossings = (
        link.crossings
    )

    crossing_index = {
        crossing: index
        for index, crossing in
        enumerate(crossings)
    }

    expected_pairs = (
        (
            (2, 1),
            (3, 0),
        ),
        (
            (4, 2),
            (0, 1),
        ),
    )

    for first, second in (
        expected_pairs
    ):
        c1, s1 = first

        adjacent = (
            crossings[c1]
            .adjacent[s1]
        )

        if adjacent is None:
            raise RuntimeError(
                f"missing source edge {first}"
            )

        other_crossing, other_strand = (
            adjacent
        )

        actual = (
            crossing_index[
                other_crossing
            ],
            int(
                other_strand
            ),
        )

        if actual != second:
            raise RuntimeError(
                f"{first} -> {actual}, "
                f"expected {second}"
            )

    # Sever both ends of both certified edges.
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
        "m129 exact outside disk tangle",
    )


def close_tangle(
    tangle,
    closure,
):
    if closure == "denominator":
        return (
            tangle
            .denominator_closure()
        )

    if closure == "numerator":
        return (
            tangle
            .numerator_closure()
        )

    raise ValueError(
        closure
    )


def compose(
    outside,
    inserted,
    side,
):
    if side == "above":
        return (
            inserted *
            outside
        )

    if side == "below":
        return (
            outside *
            inserted
        )

    raise ValueError(
        side
    )


def result_text(
    result,
):
    if result.get(
        "crashed"
    ):
        return (
            "CRASH "
            f"{result.get('returncode')}"
        )

    signature = (
        result.get(
            "signature"
        )
    )

    if signature is not None:
        return (
            f"signature={signature}"
        )

    return (
        "NO SIGNATURE "
        f"{result.get('error', '')}"
    )


def main():
    print(
        "=" * 72
    )

    print(
        "m129 EXACT CROSSING-DISK TANGLE PROBE"
    )

    print(
        "=" * 72
    )

    print()

    print(
        "source signature:",
        SOURCE_SIGNATURE,
    )

    print(
        "target signature:",
        TARGET_SIGNATURE,
    )

    print(
        "cut endpoints:",
        CUT_ENDPOINTS,
    )

    print()

    source_valid = []
    target_hits = []
    crashes = 0

    # ========================================================
    # Stage 1:
    # Find the actual boundary order + closure pairing which
    # reconstructs the original Whitehead link directly.
    # ========================================================

    for order in permutations(
        CUT_ENDPOINTS
    ):
        outside = (
            make_outside_tangle(
                order
            )
        )

        for closure in (
            "denominator",
            "numerator",
        ):
            try:
                reconstructed = (
                    close_tangle(
                        outside,
                        closure,
                    )
                )

                result = (
                    certify_link_in_child(
                        reconstructed
                    )
                )

            except Exception as exc:
                continue

            if result.get(
                "crashed"
            ):
                crashes += 1
                continue

            if (
                result.get(
                    "signature"
                ) !=
                SOURCE_SIGNATURE
            ):
                continue

            source_valid.append(
                {
                    "order":
                        order,

                    "closure":
                        closure,
                }
            )

            print(
                "-" * 72
            )

            print(
                "SOURCE RECONSTRUCTION"
            )

            print(
                "order:",
                order,
            )

            print(
                "closure:",
                closure,
            )

            print(
                "signature:",
                result[
                    "signature"
                ],
            )

            print()

    # ========================================================
    # Stage 2:
    # For each source-certified boundary convention, insert
    # one positive or negative full twist and keep the same
    # closure convention.
    # ========================================================

    print(
        "=" * 72
    )

    print(
        "TWIST TESTS"
    )

    print(
        "=" * 72
    )

    print()

    for source_case in (
        source_valid
    ):
        order = (
            source_case[
                "order"
            ]
        )

        closure = (
            source_case[
                "closure"
            ]
        )

        outside = (
            make_outside_tangle(
                order
            )
        )

        print(
            "-" * 72
        )

        print(
            "source-valid convention"
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
            inserted = (
                tangles.IntegerTangle(
                    twist
                )
            )

            for side in (
                "above",
                "below",
            ):
                try:
                    candidate_tangle = (
                        compose(
                            outside,
                            inserted,
                            side,
                        )
                    )

                    candidate_link = (
                        close_tangle(
                            candidate_tangle,
                            closure,
                        )
                    )

                    result = (
                        certify_link_in_child(
                            candidate_link
                        )
                    )

                except Exception as exc:
                    print(
                        f"  twist {twist:+d}, "
                        f"{side:<5} "
                        f"BUILD FAILED {exc}"
                    )

                    continue

                if result.get(
                    "crashed"
                ):
                    crashes += 1

                is_target = (
                    result.get(
                        "signature"
                    ) ==
                    TARGET_SIGNATURE
                )

                print(
                    f"  twist {twist:+d}, "
                    f"{side:<5} "
                    f"{result_text(result)} "
                    f"m004={is_target}"
                )

                if is_target:
                    target_hits.append(
                        {
                            "order":
                                order,

                            "closure":
                                closure,

                            "twist":
                                twist,

                            "side":
                                side,
                        }
                    )

        print()

    # ========================================================
    # Summary
    # ========================================================

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
        "source-valid conventions:",
        len(
            source_valid
        ),
    )

    print(
        "m004 hits:",
        len(
            target_hits
        ),
    )

    print(
        "isolated child crashes:",
        crashes,
    )

    print()

    for hit in target_hits:
        print(
            hit
        )

    print()

    twist_signs = sorted(
        {
            hit[
                "twist"
            ]
            for hit in
            target_hits
        }
    )

    print(
        "target-producing IntegerTangle signs:",
        twist_signs,
    )

    print()

    if len(
        twist_signs
    ) == 1:
        print(
            "EXACT DIAGRAM TWIST SIGN SELECTED:",
            twist_signs[0],
        )

    elif len(
        twist_signs
    ) > 1:
        print(
            "Both signs occur under different "
            "boundary orientations."
        )

    else:
        print(
            "No inserted ±2 twist produced m004."
        )

    print()

    print(
        "EXACT CROSSING-DISK TANGLE PROBE COMPLETE"
    )


if __name__ == "__main__":
    main()
