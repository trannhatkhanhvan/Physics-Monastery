#!/usr/bin/env python3

from pathlib import Path
import json

import regina


HERE = Path(__file__).resolve().parent

INITIAL_PATH = (
    HERE.parent /
    "data" /
    "generated" /
    "m129_to_m004_recorded_reduction.json"
)

OUTPUT = (
    HERE.parent /
    "data" /
    "generated" /
    "m129_to_m004_complete_recorded_path.json"
)

TARGET_ISOSIG = "cPcbbbiht"


def heading(text):
    print()
    print("=" * 72)
    print(text)
    print("=" * 72)


def heuristic_score(tri):
    probe = regina.Triangulation3(
        tri
    )

    probe.intelligentSimplify()

    return (
        probe.size(),
        probe.isoSig(),
    )


def reducing_candidates(tri):
    out = []


    #
    # 3 -> 2 Pachner moves.
    #
    for edge_index in range(
        tri.countEdges()
    ):
        edge = tri.edge(
            edge_index
        )

        candidate = tri.withPachner(
            edge
        )

        if candidate is None:
            continue

        if candidate.size() >= tri.size():
            continue

        out.append({
            "kind":
                "3-2",

            "face_dimension":
                1,

            "face_index":
                edge_index,

            "edge_degree":
                edge.degree(),

            "result":
                candidate,
        })


    #
    # 2 -> 0 about vertices.
    #
    for vertex_index in range(
        tri.countVertices()
    ):
        vertex = tri.vertex(
            vertex_index
        )

        candidate = tri.with20(
            vertex
        )

        if candidate is None:
            continue

        if candidate.size() >= tri.size():
            continue

        out.append({
            "kind":
                "2-0",

            "face_dimension":
                0,

            "face_index":
                vertex_index,

            "result":
                candidate,
        })


    #
    # 2 -> 0 about edges.
    #
    for edge_index in range(
        tri.countEdges()
    ):
        edge = tri.edge(
            edge_index
        )

        candidate = tri.with20(
            edge
        )

        if candidate is None:
            continue

        if candidate.size() >= tri.size():
            continue

        out.append({
            "kind":
                "2-0",

            "face_dimension":
                1,

            "face_index":
                edge_index,

            "edge_degree":
                edge.degree(),

            "result":
                candidate,
        })


    #
    # 2 -> 1 moves.
    #
    for edge_index in range(
        tri.countEdges()
    ):
        edge = tri.edge(
            edge_index
        )

        for edge_end in (
            0,
            1,
        ):
            candidate = tri.with21(
                edge,
                edge_end,
            )

            if candidate is None:
                continue

            if candidate.size() >= tri.size():
                continue

            out.append({
                "kind":
                    "2-1",

                "face_dimension":
                    1,

                "face_index":
                    edge_index,

                "edge_end":
                    edge_end,

                "edge_degree":
                    edge.degree(),

                "result":
                    candidate,
            })

    return out


def choose_reducing_move(tri):
    candidates = reducing_candidates(
        tri
    )

    if not candidates:
        return None

    scored = []

    for record in candidates:
        candidate = record[
            "result"
        ]

        h_size, h_sig = (
            heuristic_score(
                candidate
            )
        )

        scored.append(
            (
                h_size,
                candidate.size(),
                record["kind"],
                record["face_dimension"],
                record["face_index"],
                record.get(
                    "edge_end",
                    -1,
                ),
                h_sig,
                record,
            )
        )

    scored.sort(
        key=lambda x: (
            x[0],
            x[1],
            x[2],
            x[3],
            x[4],
            x[5],
            x[6],
        )
    )

    return scored[0][-1]


def descend_explicitly(
    start,
):
    current = regina.Triangulation3(
        start
    )

    moves = []

    while True:
        record = choose_reducing_move(
            current
        )

        if record is None:
            break

        result = record.pop(
            "result"
        )

        move = {
            **record,

            "before_tetrahedra":
                current.size(),

            "after_tetrahedra":
                result.size(),

            "before_isoSig":
                current.isoSig(),

            "after_isoSig":
                result.isoSig(),
        }

        moves.append(
            move
        )

        current = result

    return (
        current,
        moves,
    )


def legal_23_candidates(tri):
    out = []

    for triangle_index in range(
        tri.countTriangles()
    ):
        triangle = tri.triangle(
            triangle_index
        )

        candidate = tri.withPachner(
            triangle
        )

        if candidate is None:
            continue

        if candidate.size() != (
            tri.size() + 1
        ):
            continue

        out.append({
            "triangle_index":
                triangle_index,

            "result":
                candidate,
        })

    return out


def find_best_escape(
    local_minimum,
):
    """
    Search for an explicit escape from a local minimum.

    First try one 2->3 Pachner move.

    If NO one-step expansion reaches a strictly lower
    local minimum after explicit reducing descent, try
    two consecutive 2->3 Pachner moves.

    Every accepted expansion is returned explicitly.
    No hidden simplification state enters the path.
    """

    start_size = (
        local_minimum.size()
    )

    #
    # ========================================================
    # DEPTH 1
    # ========================================================
    #
    first_escapes = (
        legal_23_candidates(
            local_minimum
        )
    )

    print(
        "legal depth-1 2-3 escapes:",
        len(first_escapes)
    )

    best = None

    for escape in first_escapes:
        expanded = escape[
            "result"
        ]

        endpoint, descent = (
            descend_explicitly(
                expanded
            )
        )

        h_size, h_sig = (
            heuristic_score(
                endpoint
            )
        )

        candidate_record = {
            "expansions": [
                {
                    "triangle_index":
                        escape[
                            "triangle_index"
                        ],

                    "before_tetrahedra":
                        local_minimum.size(),

                    "after_tetrahedra":
                        expanded.size(),

                    "before_isoSig":
                        local_minimum.isoSig(),

                    "after_isoSig":
                        expanded.isoSig(),

                    "result":
                        expanded,
                }
            ],

            "expanded":
                expanded,

            "endpoint":
                endpoint,

            "descent":
                descent,

            "local_minimum_tetrahedra":
                endpoint.size(),

            "heuristic_tetrahedra":
                h_size,

            "heuristic_isoSig":
                h_sig,
        }

        score = (
            endpoint.size(),
            h_size,
            len(descent),
            escape[
                "triangle_index"
            ],
        )

        if (
            best is None or
            score < best[
                "score"
            ]
        ):
            best = {
                **candidate_record,
                "score":
                    score,
            }

        if (
            endpoint.size() <
            start_size
        ):
            print(
                f"  depth-1 improvement: "
                f"triangle "
                f"{escape['triangle_index']}  "
                f"{start_size} -> "
                f"{expanded.size()} -> "
                f"{endpoint.size()}"
            )

    if (
        best is not None and
        best[
            "local_minimum_tetrahedra"
        ] <
        start_size
    ):
        print()
        print(
            "depth-1 escape succeeds."
        )

        return best


    #
    # ========================================================
    # DEPTH 2
    # ========================================================
    #
    # A single expansion is not enough.
    #
    # Search
    #
    #     N -> N+1 -> N+2
    #
    # using two individually legal 2->3 Pachner moves,
    # and then run the same explicit reducing descent.
    #
    # We stop at the FIRST deterministic strict improvement.
    # This is enough to continue the certified path and avoids
    # searching thousands of equivalent branches after a valid
    # escape has already been found.
    #
    print()
    print(
        "No depth-1 escape lowers the "
        f"{start_size}-tet local minimum."
    )

    print(
        "Beginning deterministic depth-2 search..."
    )

    seen_second_states = set()

    tested_second_states = 0

    for first_number, first_escape in enumerate(
        first_escapes,
        start=1,
    ):
        middle = first_escape[
            "result"
        ]

        second_escapes = (
            legal_23_candidates(
                middle
            )
        )

        for second_escape in second_escapes:
            twice_expanded = (
                second_escape[
                    "result"
                ]
            )

            second_sig = (
                twice_expanded.isoSig()
            )

            #
            # Different face choices can produce combinatorially
            # identical second-level states. Test each isoSig once.
            #
            if second_sig in seen_second_states:
                continue

            seen_second_states.add(
                second_sig
            )

            tested_second_states += 1

            endpoint, descent = (
                descend_explicitly(
                    twice_expanded
                )
            )

            if (
                tested_second_states %
                100 ==
                0
            ):
                print(
                    f"  depth-2 states tested: "
                    f"{tested_second_states}  "
                    f"current endpoint: "
                    f"{endpoint.size()}"
                )

            if (
                endpoint.size() >=
                start_size
            ):
                continue

            h_size, h_sig = (
                heuristic_score(
                    endpoint
                )
            )

            print()
            print(
                "DEPTH-2 IMPROVEMENT FOUND"
            )

            print(
                "  first triangle:",
                first_escape[
                    "triangle_index"
                ]
            )

            print(
                "  second triangle:",
                second_escape[
                    "triangle_index"
                ]
            )

            print(
                "  path:",
                f"{start_size} -> "
                f"{middle.size()} -> "
                f"{twice_expanded.size()} -> "
                f"{endpoint.size()}"
            )

            print(
                "  reducing moves:",
                len(descent)
            )

            return {
                "expansions": [
                    {
                        "triangle_index":
                            first_escape[
                                "triangle_index"
                            ],

                        "before_tetrahedra":
                            local_minimum.size(),

                        "after_tetrahedra":
                            middle.size(),

                        "before_isoSig":
                            local_minimum.isoSig(),

                        "after_isoSig":
                            middle.isoSig(),

                        "result":
                            middle,
                    },

                    {
                        "triangle_index":
                            second_escape[
                                "triangle_index"
                            ],

                        "before_tetrahedra":
                            middle.size(),

                        "after_tetrahedra":
                            twice_expanded.size(),

                        "before_isoSig":
                            middle.isoSig(),

                        "after_isoSig":
                            twice_expanded.isoSig(),

                        "result":
                            twice_expanded,
                    },
                ],

                "expanded":
                    twice_expanded,

                "endpoint":
                    endpoint,

                "descent":
                    descent,

                "local_minimum_tetrahedra":
                    endpoint.size(),

                "heuristic_tetrahedra":
                    h_size,

                "heuristic_isoSig":
                    h_sig,

                "score": (
                    endpoint.size(),
                    h_size,
                    len(descent),
                    first_escape[
                        "triangle_index"
                    ],
                    second_escape[
                        "triangle_index"
                    ],
                ),
            }

        print(
            f"  completed first expansion "
            f"{first_number}/"
            f"{len(first_escapes)} "
            f"(triangle "
            f"{first_escape['triangle_index']})"
        )


    print()
    print(
        "Depth-2 search exhausted."
    )

    print(
        "unique second-level states tested:",
        tested_second_states
    )

    return None

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
        "COMPLETE EXPLICIT m129 -> m004 "
        "RETRIANGULATION PATH"
    )

    seed = json.loads(
        INITIAL_PATH.read_text()
    )

    states = list(
        seed[
            "states"
        ]
    )

    current = (
        regina.Triangulation3
        .fromIsoSig(
            states[-1][
                "isoSig"
            ]
        )
    )

    target = (
        regina.Triangulation3
        .fromIsoSig(
            TARGET_ISOSIG
        )
    )

    print(
        "starting local minimum:",
        current.size()
    )

    print(
        "initial recorded states:",
        len(states)
    )


    escape_round = 0

    while (
        current.isIsomorphicTo(
            target
        )
        is None
    ):
        escape_round += 1

        heading(
            f"ESCAPE ROUND {escape_round} "
            f"FROM {current.size()} TETS"
        )

        best = find_best_escape(
            current
        )

        if best is None:
            raise RuntimeError(
                "No depth-1 or depth-2 "
                "2-3 escape reaches a lower "
                "local minimum. "
                "Need a depth-3 expansion search."
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
        # Record EVERY expansion individually.
        #
        for expansion in best[
            "expansions"
        ]:
            expanded = expansion[
                "result"
            ]

            escape_move = {
                "kind":
                    "2-3",

                "face_dimension":
                    2,

                "face_index":
                    expansion[
                        "triangle_index"
                    ],

                "before_tetrahedra":
                    expansion[
                        "before_tetrahedra"
                    ],

                "after_tetrahedra":
                    expansion[
                        "after_tetrahedra"
                    ],

                "before_isoSig":
                    expansion[
                        "before_isoSig"
                    ],

                "after_isoSig":
                    expansion[
                        "after_isoSig"
                    ],
            }

            append_state(
                states,
                expanded,
                escape_move,
            )

            current = expanded

            print(
                "  2-3 about triangle",
                expansion[
                    "triangle_index"
                ],
                ":",
                escape_move[
                    "before_tetrahedra"
                ],
                "->",
                escape_move[
                    "after_tetrahedra"
                ],
            )

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

            current = next_tri

            print(
                f"  {move['kind']}  "
                f"{move['before_tetrahedra']} "
                f"-> "
                f"{move['after_tetrahedra']}"
            )

        print()
        print(
            "new local minimum:",
            current.size()
        )

        print(
            "heuristic destination:",
            best[
                "heuristic_tetrahedra"
            ]
        )

        if current.size() == 61:
            checkpoint_path = (
                HERE.parent /
                "data" /
                "generated" /
                "m129_to_m004_61_checkpoint.json"
            )

            checkpoint_path.write_text(
                json.dumps(
                    {
                        "tetrahedra":
                            current.size(),

                        "isoSig":
                            current.isoSig(),

                        "recorded_state_count":
                            len(states),

                        "states":
                            states,
                    },
                    indent=2,
                )
                +
                "\n"
            )

            print()
            print(
                "wrote 61-tet checkpoint:",
                checkpoint_path
            )

            print(
                "Saved full 123 -> 61 recorded path."
            )

            return


    heading(
        "FINAL CERTIFICATION"
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
        "total states:",
        len(states)
    )

    print(
        "total moves:",
        len(states) - 1
    )

    output = {
        "schema":
            "physics-monastery."
            "complete-recorded-retriangulation.v1",

        "source":
            seed[
                "source"
            ],

        "target":
            seed[
                "target"
            ],

        "complete":
            (
                current.isIsomorphicTo(
                    target
                )
                is not None
            ),

        "escape_rounds":
            escape_round,

        "state_count":
            len(states),

        "move_count":
            len(states) - 1,

        "states":
            states,
    }

    OUTPUT.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

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
        "wrote:",
        OUTPUT
    )

    print()
    print(
        "PASS: complete path consists only "
        "of individually recorded legal "
        "retriangulation moves."
    )


if __name__ == "__main__":
    main()
