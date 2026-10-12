#!/usr/bin/env python3

from pathlib import Path
import json

import regina

from m129_to_m004_complete_recorded_path import (
    legal_23_candidates,
    descend_explicitly,
)


HERE = Path(__file__).resolve().parent

SOURCE = (
    HERE.parent /
    "data" /
    "generated" /
    "m129_to_m004_continuation_from_60.json"
)

OUTPUT = (
    HERE.parent /
    "data" /
    "generated" /
    "m129_to_m004_depth3_from_9.json"
)


def heading(text):
    print()
    print("=" * 72)
    print(text)
    print("=" * 72)


def expansion_record(
    before,
    triangle_index,
    after,
):
    return {
        "kind":
            "2-3",

        "face_dimension":
            2,

        "face_index":
            triangle_index,

        "before_tetrahedra":
            before.size(),

        "after_tetrahedra":
            after.size(),

        "before_isoSig":
            before.isoSig(),

        "after_isoSig":
            after.isoSig(),
    }


def main():
    heading(
        "DEPTH-3 EXPLICIT SEARCH "
        "FROM 9 TETRAHEDRA"
    )

    source = json.loads(
        SOURCE.read_text()
    )

    start = (
        regina.Triangulation3
        .fromIsoSig(
            source[
                "current_isoSig"
            ]
        )
    )

    if start.size() != 9:
        raise RuntimeError(
            f"Expected saved 9-tet state; "
            f"got {start.size()}."
        )

    print(
        "start tetrahedra:",
        start.size()
    )

    #
    # DEPTH 1
    #
    depth1 = legal_23_candidates(
        start
    )

    print(
        "depth-1 states:",
        len(depth1)
    )

    #
    # DEPTH 2
    #
    depth2 = {}

    for first in depth1:
        state1 = first[
            "result"
        ]

        for second in legal_23_candidates(
            state1
        ):
            state2 = second[
                "result"
            ]

            sig2 = state2.isoSig()

            if sig2 in depth2:
                continue

            depth2[
                sig2
            ] = {
                "first_triangle":
                    first[
                        "triangle_index"
                    ],

                "state1":
                    state1,

                "second_triangle":
                    second[
                        "triangle_index"
                    ],

                "state2":
                    state2,
            }

    print(
        "unique depth-2 states:",
        len(depth2)
    )

    #
    # DEPTH 3
    #
    heading(
        "SEARCH DEPTH 3"
    )

    seen3 = set()

    tested = 0

    for record in depth2.values():
        state2 = record[
            "state2"
        ]

        for third in legal_23_candidates(
            state2
        ):
            state3 = third[
                "result"
            ]

            sig3 = state3.isoSig()

            if sig3 in seen3:
                continue

            seen3.add(
                sig3
            )

            tested += 1

            endpoint, descent = (
                descend_explicitly(
                    state3
                )
            )

            if tested % 25 == 0:
                print(
                    "depth-3 states tested:",
                    tested,
                    "endpoint:",
                    endpoint.size(),
                )

            if endpoint.size() >= 9:
                continue

            state1 = record[
                "state1"
            ]

            heading(
                "DEPTH-3 IMPROVEMENT FOUND"
            )

            print(
                "first triangle:",
                record[
                    "first_triangle"
                ]
            )

            print(
                "second triangle:",
                record[
                    "second_triangle"
                ]
            )

            print(
                "third triangle:",
                third[
                    "triangle_index"
                ]
            )

            print(
                "path:",
                f"9 -> 10 -> 11 -> 12 -> "
                f"{endpoint.size()}"
            )

            print(
                "reducing moves:",
                len(descent)
            )

            result = {
                "start": {
                    "tetrahedra":
                        9,

                    "isoSig":
                        start.isoSig(),
                },

                "expansions": [
                    expansion_record(
                        start,
                        record[
                            "first_triangle"
                        ],
                        state1,
                    ),

                    expansion_record(
                        state1,
                        record[
                            "second_triangle"
                        ],
                        state2,
                    ),

                    expansion_record(
                        state2,
                        third[
                            "triangle_index"
                        ],
                        state3,
                    ),
                ],

                "descent":
                    descent,

                "endpoint": {
                    "tetrahedra":
                        endpoint.size(),

                    "isoSig":
                        endpoint.isoSig(),
                },

                "tested_depth3_states":
                    tested,
            }

            OUTPUT.write_text(
                json.dumps(
                    result,
                    indent=2,
                )
                +
                "\n"
            )

            print()
            print(
                "wrote:",
                OUTPUT
            )

            print()
            print(
                "PASS: depth-3 escape "
                "found below 9 tetrahedra."
            )

            return

    heading(
        "DEPTH-3 EXHAUSTED"
    )

    print(
        "unique depth-3 states tested:",
        tested
    )

    raise RuntimeError(
        "No depth-3 escape reaches "
        "below 9 tetrahedra."
    )


if __name__ == "__main__":
    main()
