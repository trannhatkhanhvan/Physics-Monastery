#!/usr/bin/env python3

from pathlib import Path
import json

import regina


HERE = Path(__file__).resolve().parent

CHECKPOINT = (
    HERE.parent /
    "data" /
    "generated" /
    "m129_to_m004_61_checkpoint.json"
)

OUTPUT = (
    HERE.parent /
    "data" /
    "generated" /
    "m129_to_m004_depth3_from_61.json"
)


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

    for edge_index in range(
        tri.countEdges()
    ):
        edge = tri.edge(
            edge_index
        )

        candidate = tri.withPachner(
            edge
        )

        if (
            candidate is not None and
            candidate.size() < tri.size()
        ):
            out.append({
                "kind": "3-2",
                "face_dimension": 1,
                "face_index": edge_index,
                "result": candidate,
            })

    for vertex_index in range(
        tri.countVertices()
    ):
        vertex = tri.vertex(
            vertex_index
        )

        candidate = tri.with20(
            vertex
        )

        if (
            candidate is not None and
            candidate.size() < tri.size()
        ):
            out.append({
                "kind": "2-0",
                "face_dimension": 0,
                "face_index": vertex_index,
                "result": candidate,
            })

    for edge_index in range(
        tri.countEdges()
    ):
        edge = tri.edge(
            edge_index
        )

        candidate = tri.with20(
            edge
        )

        if (
            candidate is not None and
            candidate.size() < tri.size()
        ):
            out.append({
                "kind": "2-0",
                "face_dimension": 1,
                "face_index": edge_index,
                "result": candidate,
            })

        for edge_end in (
            0,
            1,
        ):
            candidate = tri.with21(
                edge,
                edge_end,
            )

            if (
                candidate is not None and
                candidate.size() < tri.size()
            ):
                out.append({
                    "kind": "2-1",
                    "face_dimension": 1,
                    "face_index": edge_index,
                    "edge_end": edge_end,
                    "result": candidate,
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
        key=lambda x: x[:-1]
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

        result = record.pop(
            "result"
        )

        moves.append({
            **record,
            "before_tetrahedra":
                current.size(),
            "after_tetrahedra":
                result.size(),
            "before_isoSig":
                current.isoSig(),
            "after_isoSig":
                result.isoSig(),
        })

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

        if (
            candidate is not None and
            candidate.size() ==
            tri.size() + 1
        ):
            out.append({
                "triangle_index":
                    triangle_index,
                "result":
                    candidate,
            })

    return out


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
        "DEPTH-3 EXPLICIT PACHNER SEARCH "
        "FROM 61 TETRAHEDRA"
    )

    checkpoint = json.loads(
        CHECKPOINT.read_text()
    )

    start = (
        regina.Triangulation3
        .fromIsoSig(
            checkpoint[
                "isoSig"
            ]
        )
    )

    if start.size() != 61:
        raise RuntimeError(
            f"Expected 61 tets, got {start.size()}."
        )

    depth1 = legal_23_candidates(
        start
    )

    print(
        "legal depth-1 states:",
        len(depth1)
    )

    depth2_records = {}

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

            if sig2 in depth2_records:
                continue

            depth2_records[
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
        len(depth2_records)
    )

    seen_depth3 = set()

    tested = 0

    for record in (
        depth2_records.values()
    ):
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

            if sig3 in seen_depth3:
                continue

            seen_depth3.add(
                sig3
            )

            tested += 1

            endpoint, descent = (
                explicit_descent(
                    state3
                )
            )

            if tested % 100 == 0:
                print(
                    "depth-3 states tested:",
                    tested,
                    "endpoint:",
                    endpoint.size(),
                )

            if endpoint.size() >= 61:
                continue

            state1 = record[
                "state1"
            ]

            h_size, h_sig = (
                heuristic_score(
                    endpoint
                )
            )

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
                f"61 -> 62 -> 63 -> 64 -> "
                f"{endpoint.size()}"
            )

            print(
                "reducing moves:",
                len(descent)
            )

            result = {
                "start": {
                    "tetrahedra":
                        61,
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
                    "heuristic_tetrahedra":
                        h_size,
                    "heuristic_isoSig":
                        h_sig,
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
                "PASS: depth-3 escape found."
            )

            return

    raise RuntimeError(
        "Depth-3 search exhausted "
        "without improvement below 61."
    )


if __name__ == "__main__":
    main()
