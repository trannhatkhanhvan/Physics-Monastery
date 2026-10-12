#!/usr/bin/env python3

from pathlib import Path
import json

import regina


HERE = Path(__file__).resolve().parent

DATA = (
    HERE.parent /
    "data" /
    "generated"
)

SOURCE = (
    DATA /
    "m129_to_m004_cusp_movie.json"
)

OUTPUT = (
    DATA /
    "m129_to_m004_cusp_transitions.json"
)


EXPECTED_CHANGING_MOVES = [
    141, 142, 143, 144, 145, 146,
    147, 148, 149, 150, 151, 152,
    156, 159, 160, 162, 163, 164,
    165, 166, 171, 172, 174, 175,
    176, 177, 178, 179, 182, 183,
    184, 185, 186, 187, 188, 189,
    190, 191, 192, 193, 194,
]


def surviving_torus_link(
    manifold_iso_sig
):
    tri = (
        regina.Triangulation3
        .fromIsoSig(
            manifold_iso_sig
        )
    )

    candidates = []

    for i in range(
        tri.countVertices()
    ):
        vertex = tri.vertex(i)

        if not vertex.isIdeal():
            continue

        if (
            vertex.linkType() ==
            regina.Vertex3.Link.Torus
        ):
            candidates.append(
                vertex
            )

    if len(candidates) != 1:
        raise RuntimeError(
            "Expected exactly one surviving "
            f"torus cusp; found {len(candidates)}."
        )

    return candidates[0].buildLink()


def link_iso_sig(
    manifold_iso_sig
):
    link = surviving_torus_link(
        manifold_iso_sig
    )

    signature = link.isoSig()

    return {
        "isoSig":
            signature,

        "vertices":
            link.countVertices(),

        "edges":
            link.countEdges(),

        "triangles":
            link.size(),

        "euler_characteristic":
            (
                link.countVertices() -
                link.countEdges() +
                link.size()
            ),
    }


def main():
    movie = json.loads(
        SOURCE.read_text()
    )

    states = movie[
        "states"
    ]

    moves = movie[
        "moves"
    ]

    if (
        len(states) != 196 or
        len(moves) != 195
    ):
        raise RuntimeError(
            "Unexpected cusp-movie size."
        )

    print(
        "Computing canonical Regina "
        "cusp-link signatures..."
    )

    link_states = []

    for i, state in enumerate(
        states
    ):
        record = link_iso_sig(
            state[
                "manifold_isoSig"
            ]
        )

        record[
            "state_index"
        ] = i

        link_states.append(
            record
        )

        if (
            i % 20 == 0 or
            i == len(states) - 1
        ):
            print(
                f"state {i:3d}: "
                f"V={record['vertices']} "
                f"E={record['edges']} "
                f"F={record['triangles']} "
                f"chi="
                f"{record['euler_characteristic']}"
            )

    changing = []
    transitions = []

    for move_index, move in enumerate(
        moves
    ):
        before = (
            link_states[
                move_index
            ]
        )

        after = (
            link_states[
                move_index + 1
            ]
        )

        changed = (
            before[
                "isoSig"
            ] !=
            after[
                "isoSig"
            ]
        )

        if changed:
            changing.append(
                move_index
            )

        transitions.append({
            "move_index":
                move_index,

            "state_before":
                move_index,

            "state_after":
                move_index + 1,

            "move_kind":
                move.get(
                    "kind"
                ),

            "touches_cusp":
                changed,

            "tetrahedra_before":
                states[
                    move_index
                ][
                    "manifold_tetrahedra"
                ],

            "tetrahedra_after":
                states[
                    move_index + 1
                ][
                    "manifold_tetrahedra"
                ],

            "cusp_before":
                before,

            "cusp_after":
                after,
        })

    print()
    print(
        "Canonical cusp-changing moves:"
    )
    print(
        changing
    )
    print()

    if (
        changing !=
        EXPECTED_CHANGING_MOVES
    ):
        raise RuntimeError(
            "Canonical cusp-change sequence "
            "does not match expected set.\n"
            f"found: {changing}"
        )

    output = {
        "schema":
            "physics-monastery."
            "m129-to-m004-cusp-transitions.v2",

        "comparison":
            "canonical Regina Triangulation2 isoSig",

        "state_count":
            len(states),

        "move_count":
            len(moves),

        "cusp_changing_move_count":
            len(
                changing
            ),

        "cusp_changing_move_indices":
            changing,

        "link_states":
            link_states,

        "transitions":
            transitions,
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
        "CUSP TRANSITION MANIFEST"
    )

    print(
        "moves:",
        len(
            transitions
        )
    )

    print(
        "boundary-changing moves:",
        len(
            changing
        )
    )

    print(
        "first boundary change:",
        changing[0]
    )

    print(
        "last boundary change:",
        changing[-1]
    )

    print(
        "wrote:",
        OUTPUT
    )

    print()

    for index in changing:
        transition = (
            transitions[
                index
            ]
        )

        before = (
            transition[
                "cusp_before"
            ]
        )

        after = (
            transition[
                "cusp_after"
            ]
        )

        print(
            f"{index:3d} "
            f"{transition['move_kind']:>3}  "
            f"V {before['vertices']}"
            f"->{after['vertices']}  "
            f"E {before['edges']}"
            f"->{after['edges']}  "
            f"F {before['triangles']}"
            f"->{after['triangles']}"
        )

    print()
    print(
        "PASS: 41 genuine cusp changes "
        "certified modulo combinatorial "
        "relabeling."
    )


if __name__ == "__main__":
    main()
