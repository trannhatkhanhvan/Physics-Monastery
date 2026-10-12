#!/usr/bin/env python3

from pathlib import Path
import json


HERE = Path(__file__).resolve().parent
DATA = HERE.parent / "data" / "generated"

CHECKPOINT_61 = (
    DATA /
    "m129_to_m004_61_checkpoint.json"
)

DEPTH3_61 = (
    DATA /
    "m129_to_m004_depth3_from_61.json"
)

CONTINUATION_60 = (
    DATA /
    "m129_to_m004_continuation_from_60.json"
)

DEPTH3_9 = (
    DATA /
    "m129_to_m004_depth3_from_9.json"
)

RECORDED_REDUCTION = (
    DATA /
    "m129_to_m004_recorded_reduction.json"
)

OUTPUT = (
    DATA /
    "m129_to_m004_retriangulation_manifest.json"
)

TARGET_ISOSIG = "cPcbbbiht"


def load(path):
    return json.loads(
        path.read_text()
    )


def normalize_move(move):
    if move is None:
        return None

    return {
        key: value
        for key, value in move.items()
        if key not in {
            "result",
        }
    }


def append_move(
    states,
    moves,
    move,
    label,
):
    move = normalize_move(move)

    if not move:
        raise RuntimeError(
            f"{label}: missing move record."
        )

    current = states[-1]

    before_sig = move.get(
        "before_isoSig"
    )

    after_sig = move.get(
        "after_isoSig"
    )

    before_tets = move.get(
        "before_tetrahedra"
    )

    after_tets = move.get(
        "after_tetrahedra"
    )

    if before_sig != current["isoSig"]:
        raise RuntimeError(
            f"{label}: isoSig discontinuity.\n"
            f"current: {current['isoSig']}\n"
            f"move before: {before_sig}"
        )

    if before_tets != current["tetrahedra"]:
        raise RuntimeError(
            f"{label}: tetrahedron-count discontinuity.\n"
            f"current: {current['tetrahedra']}\n"
            f"move before: {before_tets}"
        )

    index = len(moves)

    record = {
        "index":
            index,

        **move,
    }

    moves.append(
        record
    )

    states.append({
        "index":
            len(states),

        "tetrahedra":
            after_tets,

        "isoSig":
            after_sig,

        "entered_by_move":
            index,
    })


def append_state_sequence(
    states,
    moves,
    source_states,
    label,
):
    if not source_states:
        raise RuntimeError(
            f"{label}: empty state sequence."
        )

    first = source_states[0]

    current = states[-1]

    if (
        first["isoSig"] !=
        current["isoSig"]
    ):
        raise RuntimeError(
            f"{label}: first-state isoSig "
            "does not match current endpoint."
        )

    if (
        first["tetrahedra"] !=
        current["tetrahedra"]
    ):
        raise RuntimeError(
            f"{label}: first-state tetrahedron "
            "count does not match current endpoint."
        )

    for offset, state in enumerate(
        source_states[1:],
        start=1,
    ):
        append_move(
            states,
            moves,
            state.get("move"),
            f"{label} state {offset}",
        )

        generated = states[-1]

        if (
            generated["isoSig"] !=
            state["isoSig"]
        ):
            raise RuntimeError(
                f"{label} state {offset}: "
                "after isoSig mismatch."
            )

        if (
            generated["tetrahedra"] !=
            state["tetrahedra"]
        ):
            raise RuntimeError(
                f"{label} state {offset}: "
                "after tetrahedron count mismatch."
            )


def append_expansion_descent(
    states,
    moves,
    block,
    label,
):
    start = block["start"]

    current = states[-1]

    if (
        start["isoSig"] !=
        current["isoSig"] or
        start["tetrahedra"] !=
        current["tetrahedra"]
    ):
        raise RuntimeError(
            f"{label}: start does not match "
            "current endpoint."
        )

    for i, move in enumerate(
        block["expansions"]
    ):
        append_move(
            states,
            moves,
            move,
            f"{label} expansion {i}",
        )

    for i, move in enumerate(
        block["descent"]
    ):
        append_move(
            states,
            moves,
            move,
            f"{label} descent {i}",
        )

    endpoint = block["endpoint"]
    current = states[-1]

    if (
        current["isoSig"] !=
        endpoint["isoSig"] or
        current["tetrahedra"] !=
        endpoint["tetrahedra"]
    ):
        raise RuntimeError(
            f"{label}: generated endpoint "
            "does not match recorded endpoint."
        )


def main():
    checkpoint = load(
        CHECKPOINT_61
    )

    depth3_61 = load(
        DEPTH3_61
    )

    continuation = load(
        CONTINUATION_60
    )

    depth3_9 = load(
        DEPTH3_9
    )

    reduction = load(
        RECORDED_REDUCTION
    )

    checkpoint_states = (
        checkpoint.get("states")
    )

    if not checkpoint_states:
        raise RuntimeError(
            "61 checkpoint does not contain "
            "the full states array."
        )

    if (
        checkpoint_states[0][
            "tetrahedra"
        ] != 123
    ):
        raise RuntimeError(
            "Expected canonical path to begin "
            "at 123 tetrahedra."
        )

    if (
        checkpoint_states[-1][
            "tetrahedra"
        ] != 61
    ):
        raise RuntimeError(
            "Expected checkpoint path to end "
            "at 61 tetrahedra."
        )

    states = [{
        "index":
            0,

        "tetrahedra":
            checkpoint_states[0][
                "tetrahedra"
            ],

        "isoSig":
            checkpoint_states[0][
                "isoSig"
            ],

        "entered_by_move":
            None,
    }]

    moves = []

    append_state_sequence(
        states,
        moves,
        checkpoint_states,
        "123-to-61",
    )

    append_expansion_descent(
        states,
        moves,
        depth3_61,
        "61-to-60",
    )

    append_state_sequence(
        states,
        moves,
        continuation["states"],
        "60-to-9",
    )

    append_expansion_descent(
        states,
        moves,
        depth3_9,
        "9-to-2",
    )

    final = states[-1]

    if final["tetrahedra"] != 2:
        raise RuntimeError(
            "Final state is not two tetrahedra."
        )

    if final["isoSig"] != TARGET_ISOSIG:
        raise RuntimeError(
            "Final state is not canonical m004: "
            f"{final['isoSig']}"
        )

    for i, state in enumerate(states):
        if state["index"] != i:
            raise RuntimeError(
                "State indexing failure."
            )

    for i, move in enumerate(moves):
        if move["index"] != i:
            raise RuntimeError(
                "Move indexing failure."
            )

    manifest = {
        "schema":
            "physics-monastery."
            "m129-to-m004-retriangulation.v1",

        "certification": {
            "source_manifold":
                "m129",

            "target_manifold":
                "m004",

            "viewer_slope":
                reduction[
                    "source"
                ][
                    "viewer_slope"
                ],

            "link_basis_slope":
                reduction[
                    "source"
                ][
                    "link_basis_slope"
                ],

            "boundary_cuts":
                reduction[
                    "source"
                ][
                    "boundary_cuts"
                ],

            "layered_solid_torus":
                reduction[
                    "source"
                ][
                    "layered_solid_torus"
                ],

            "attachment":
                reduction[
                    "source"
                ][
                    "attachment"
                ],

            "source_tetrahedra":
                states[0][
                    "tetrahedra"
                ],

            "source_isoSig":
                states[0][
                    "isoSig"
                ],

            "target_tetrahedra":
                2,

            "target_isoSig":
                TARGET_ISOSIG,
        },

        "complete":
            True,

        "state_count":
            len(states),

        "move_count":
            len(moves),

        "states":
            states,

        "moves":
            moves,
    }

    OUTPUT.write_text(
        json.dumps(
            manifest,
            indent=2,
        )
        +
        "\n"
    )

    print()
    print(
        "CANONICAL RETRIANGULATION MANIFEST"
    )
    print(
        "states:",
        len(states)
    )
    print(
        "moves:",
        len(moves)
    )
    print(
        "start:",
        states[0]["tetrahedra"]
    )
    print(
        "end:",
        states[-1]["tetrahedra"]
    )
    print(
        "final isoSig:",
        states[-1]["isoSig"]
    )
    print(
        "wrote:",
        OUTPUT
    )
    print()
    print(
        "PASS: complete certified "
        "123 -> 2 move chain assembled."
    )


if __name__ == "__main__":
    main()
