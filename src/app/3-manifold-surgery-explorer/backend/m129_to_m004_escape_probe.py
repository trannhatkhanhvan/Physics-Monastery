#!/usr/bin/env python3

from pathlib import Path
import json

import regina


HERE = Path(__file__).resolve().parent

REDUCTION_PATH = (
    HERE.parent /
    "data" /
    "generated" /
    "m129_to_m004_recorded_reduction.json"
)

TARGET_ISOSIG = "cPcbbbiht"


def heading(text):
    print()
    print("=" * 72)
    print(text)
    print("=" * 72)


def terminal_score(tri):
    probe = regina.Triangulation3(
        tri
    )

    probe.intelligentSimplify()

    return (
        probe.size(),
        probe.isoSig(),
    )


def candidate_reducing_moves(tri):
    out = []

    #
    # 3 -> 2 Pachner moves:
    # Pachner move about an edge.
    #
    for edge_index in range(
        tri.countEdges()
    ):
        edge = tri.edge(
            edge_index
        )

        candidate = (
            tri.withPachner(
                edge
            )
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
    # 2 -> 0 moves.
    #
    for vertex_index in range(
        tri.countVertices()
    ):
        vertex = tri.vertex(
            vertex_index
        )

        candidate = (
            tri.with20(
                vertex
            )
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


    for edge_index in range(
        tri.countEdges()
    ):
        edge = tri.edge(
            edge_index
        )

        candidate = (
            tri.with20(
                edge
            )
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
            candidate = (
                tri.with21(
                    edge,
                    edge_end,
                )
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
    candidates = (
        candidate_reducing_moves(
            tri
        )
    )

    if not candidates:
        return None

    scored = []

    for record in candidates:
        candidate = record["result"]

        heuristic_size, heuristic_sig = (
            terminal_score(
                candidate
            )
        )

        scored.append(
            (
                heuristic_size,
                candidate.size(),
                record["kind"],
                record["face_dimension"],
                record["face_index"],
                record.get(
                    "edge_end",
                    -1,
                ),
                heuristic_sig,
                record,
            )
        )

    scored.sort(
        key=lambda item: (
            item[0],
            item[1],
            item[2],
            item[3],
            item[4],
            item[5],
            item[6],
        )
    )

    return scored[0][-1]


def explicit_descent(start):
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

        next_tri = record.pop(
            "result"
        )

        move_record = {
            **record,

            "before_tetrahedra":
                current.size(),

            "after_tetrahedra":
                next_tri.size(),

            "before_isoSig":
                current.isoSig(),

            "after_isoSig":
                next_tri.isoSig(),
        }

        moves.append(
            move_record
        )

        current = next_tri

    return (
        current,
        moves,
    )


def legal_23_moves(tri):
    candidates = []

    #
    # In dimension 3, a Pachner move about a
    # triangle is a 2 -> 3 move.
    #
    for triangle_index in range(
        tri.countTriangles()
    ):
        triangle = tri.triangle(
            triangle_index
        )

        candidate = (
            tri.withPachner(
                triangle
            )
        )

        if candidate is None:
            continue

        if candidate.size() != (
            tri.size() + 1
        ):
            continue

        candidates.append(
            {
                "triangle_index":
                    triangle_index,

                "result":
                    candidate,
            }
        )

    return candidates


def main():
    heading(
        "m129 -> m004 LOCAL 2-3 ESCAPE PROBE"
    )

    data = json.loads(
        REDUCTION_PATH.read_text()
    )

    final_state = data[
        "states"
    ][-1]

    stuck_sig = final_state[
        "isoSig"
    ]

    stuck = (
        regina.Triangulation3
        .fromIsoSig(
            stuck_sig
        )
    )

    print(
        "stuck tetrahedra:",
        stuck.size()
    )

    print(
        "stuck isoSig:",
        stuck.isoSig()
    )


    heading(
        "LEGAL 2-3 MOVES"
    )

    escapes = legal_23_moves(
        stuck
    )

    print(
        "legal 2-3 moves:",
        len(escapes)
    )

    if not escapes:
        raise RuntimeError(
            "No legal 2-3 Pachner moves "
            "from the stuck triangulation."
        )


    heading(
        "TEST EACH ESCAPE + EXPLICIT DESCENT"
    )

    results = []

    for index, escape in enumerate(
        escapes
    ):
        expanded = escape[
            "result"
        ]

        endpoint, moves = (
            explicit_descent(
                expanded
            )
        )

        heuristic_size, heuristic_sig = (
            terminal_score(
                endpoint
            )
        )

        result = {
            "triangle_index":
                escape[
                    "triangle_index"
                ],

            "expanded_tetrahedra":
                expanded.size(),

            "expanded_isoSig":
                expanded.isoSig(),

            "descent_move_count":
                len(moves),

            "local_minimum_tetrahedra":
                endpoint.size(),

            "local_minimum_isoSig":
                endpoint.isoSig(),

            "heuristic_simplified_tetrahedra":
                heuristic_size,

            "heuristic_simplified_isoSig":
                heuristic_sig,

            "moves":
                moves,
        }

        results.append(
            result
        )

        print(
            f"{index + 1:3d}/"
            f"{len(escapes):3d}  "
            f"triangle "
            f"{result['triangle_index']:3d}:  "
            f"{stuck.size()} -> "
            f"{result['expanded_tetrahedra']} -> "
            f"{result['local_minimum_tetrahedra']}  "
            f"({result['descent_move_count']} "
            f"reducing moves)"
        )


    results.sort(
        key=lambda record: (
            record[
                "local_minimum_tetrahedra"
            ],
            record[
                "heuristic_simplified_tetrahedra"
            ],
            record[
                "descent_move_count"
            ],
            record[
                "triangle_index"
            ],
        )
    )

    best = results[0]


    heading(
        "BEST ESCAPE"
    )

    print(
        "triangle index:",
        best[
            "triangle_index"
        ]
    )

    print(
        "expanded tetrahedra:",
        best[
            "expanded_tetrahedra"
        ]
    )

    print(
        "expanded isoSig:",
        best[
            "expanded_isoSig"
        ]
    )

    print(
        "reducing moves:",
        best[
            "descent_move_count"
        ]
    )

    print(
        "new local minimum:",
        best[
            "local_minimum_tetrahedra"
        ]
    )

    print(
        "new local-minimum isoSig:",
        best[
            "local_minimum_isoSig"
        ]
    )

    print(
        "heuristic simplification:",
        best[
            "heuristic_simplified_tetrahedra"
        ]
    )

    print(
        "heuristic isoSig:",
        best[
            "heuristic_simplified_isoSig"
        ]
    )


    heading(
        "BEST BRANCH MOVES"
    )

    print(
        "escape:"
    )

    print(
        f"  2-3 about triangle "
        f"{best['triangle_index']}"
    )

    for i, move in enumerate(
        best["moves"],
        start=1,
    ):
        print(
            f"  {i:2d}. "
            f"{move['kind']}  "
            f"{move['before_tetrahedra']} -> "
            f"{move['after_tetrahedra']}"
        )


    heading(
        "RESULT"
    )

    if (
        best[
            "local_minimum_tetrahedra"
        ] <
        stuck.size()
    ):
        print(
            "PASS: an explicit 2-3 escape "
            "reaches a strictly lower local minimum."
        )

    else:
        print(
            "No one-step 2-3 escape reaches "
            "a lower local minimum."
        )

        print(
            "The next search must allow two "
            "consecutive 2-3 moves before descent."
        )


if __name__ == "__main__":
    main()
