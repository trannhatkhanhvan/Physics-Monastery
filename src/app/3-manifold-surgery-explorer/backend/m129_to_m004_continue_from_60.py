#!/usr/bin/env python3

from pathlib import Path
import json

import regina

from m129_to_m004_complete_recorded_path import (
    find_best_escape,
)


HERE = Path(__file__).resolve().parent

SOURCE = (
    HERE.parent /
    "data" /
    "generated" /
    "m129_to_m004_depth3_from_61.json"
)

OUTPUT = (
    HERE.parent /
    "data" /
    "generated" /
    "m129_to_m004_continuation_from_60.json"
)

TARGET_ISOSIG = "cPcbbbiht"


def heading(text):
    print()
    print("=" * 72)
    print(text)
    print("=" * 72)


def append_state(
    states,
    tri,
    move,
):
    states.append({
        "step":
            len(states),

        "tetrahedra":
            tri.size(),

        "isoSig":
            tri.isoSig(),

        "move":
            move,
    })


def main():
    heading(
        "CONTINUE EXPLICIT m129 -> m004 "
        "PATH FROM 60 TETRAHEDRA"
    )

    source = json.loads(
        SOURCE.read_text()
    )

    endpoint = source[
        "endpoint"
    ]

    current = (
        regina.Triangulation3
        .fromIsoSig(
            endpoint[
                "isoSig"
            ]
        )
    )

    if current.size() != 60:
        raise RuntimeError(
            "Expected the saved depth-3 branch "
            f"to end at 60 tetrahedra; got "
            f"{current.size()}."
        )

    target = (
        regina.Triangulation3
        .fromIsoSig(
            TARGET_ISOSIG
        )
    )

    states = [{
        "step":
            0,

        "tetrahedra":
            current.size(),

        "isoSig":
            current.isoSig(),

        "move":
            None,
    }]

    print(
        "starting tetrahedra:",
        current.size()
    )

    print(
        "target tetrahedra:",
        target.size()
    )

    round_number = 0

    while (
        current.isIsomorphicTo(
            target
        )
        is None
    ):
        round_number += 1

        heading(
            f"CONTINUATION ROUND {round_number} "
            f"FROM {current.size()} TETS"
        )

        before_round_size = (
            current.size()
        )

        best = find_best_escape(
            current
        )

        if best is None:
            #
            # Save all progress BEFORE stopping.
            #
            output = {
                "schema":
                    "physics-monastery."
                    "continuation-from-60.v1",

                "complete":
                    False,

                "start_tetrahedra":
                    60,

                "current_tetrahedra":
                    current.size(),

                "current_isoSig":
                    current.isoSig(),

                "rounds_completed":
                    round_number - 1,

                "states":
                    states,
            }

            OUTPUT.write_text(
                json.dumps(
                    output,
                    indent=2,
                )
                +
                "\n"
            )

            print()
            print(
                "SAVED PROGRESS:",
                OUTPUT
            )

            raise RuntimeError(
                "Depth-1 and depth-2 search "
                f"cannot escape the "
                f"{current.size()}-tet local minimum. "
                "Progress has been saved; the next "
                "search should begin exactly here."
            )

        print()
        print(
            "selected expansion depth:",
            len(
                best[
                    "expansions"
                ]
            )
        )

        #
        # Record every 2 -> 3 expansion.
        #
        for expansion in best[
            "expansions"
        ]:
            next_tri = expansion[
                "result"
            ]

            move = {
                "kind":
                    "2-3",

                "face_dimension":
                    2,

                "face_index":
                    expansion[
                        "triangle_index"
                    ],

                "before_tetrahedra":
                    current.size(),

                "after_tetrahedra":
                    next_tri.size(),

                "before_isoSig":
                    current.isoSig(),

                "after_isoSig":
                    next_tri.isoSig(),
            }

            append_state(
                states,
                next_tri,
                move,
            )

            print(
                "  2-3",
                move[
                    "before_tetrahedra"
                ],
                "->",
                move[
                    "after_tetrahedra"
                ],
                "triangle",
                move[
                    "face_index"
                ],
            )

            current = next_tri

        #
        # Record every subsequent reducing move.
        #
        for move in best[
            "descent"
        ]:
            next_tri = (
                regina.Triangulation3
                .fromIsoSig(
                    move[
                        "after_isoSig"
                    ]
                )
            )

            append_state(
                states,
                next_tri,
                move,
            )

            print(
                " ",
                move[
                    "kind"
                ],
                move[
                    "before_tetrahedra"
                ],
                "->",
                move[
                    "after_tetrahedra"
                ],
            )

            current = next_tri

        print()
        print(
            "new local minimum:",
            current.size()
        )

        if current.size() >= before_round_size:
            raise RuntimeError(
                "Internal error: selected escape "
                "did not lower the local minimum."
            )

        #
        # Save after EVERY successful round.
        #
        output = {
            "schema":
                "physics-monastery."
                "continuation-from-60.v1",

            "complete":
                (
                    current.isIsomorphicTo(
                        target
                    )
                    is not None
                ),

            "start_tetrahedra":
                60,

            "current_tetrahedra":
                current.size(),

            "current_isoSig":
                current.isoSig(),

            "rounds_completed":
                round_number,

            "states":
                states,
        }

        OUTPUT.write_text(
            json.dumps(
                output,
                indent=2,
            )
            +
            "\n"
        )

        print(
            "checkpoint saved:",
            OUTPUT
        )


    heading(
        "TARGET REACHED"
    )

    print(
        "final tetrahedra:",
        current.size()
    )

    print(
        "final isoSig:",
        current.isoSig()
    )

    print(
        "isomorphic to native m004:",
        current.isIsomorphicTo(
            target
        ) is not None
    )

    print(
        "continuation moves:",
        len(states) - 1
    )

    print()
    print(
        "PASS: continuation from the "
        "60-tet state reaches native m004 "
        "using only recorded legal moves."
    )


if __name__ == "__main__":
    main()
