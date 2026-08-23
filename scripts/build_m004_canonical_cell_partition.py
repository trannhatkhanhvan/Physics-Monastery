#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

ASSET_DIR = (
    ROOT
    / "public"
    / "geometry"
    / "figure-eight-complement"
)

TOPOLOGY_PATH = (
    ASSET_DIR
    / "m004-certified-animation-topology.json"
)

OUTPUT_PATH = (
    ASSET_DIR
    / "m004-canonical-cell-partition.json"
)


def require(
    condition,
    message,
):
    if not condition:
        raise RuntimeError(message)


def main():
    topology = json.loads(
        TOPOLOGY_PATH.read_text()
    )

    require(
        topology.get("schema")
        ==
        "m004-certified-animation-topology-v1",
        "unexpected topology schema",
    )

    require(
        topology.get("certified") is True,
        "topology is not certified",
    )

    require(
        topology.get("canonicalIsoSig")
        ==
        "cPcbbbiht",
        "isoSig mismatch",
    )

    names = topology["cellNames"]

    final_nodes = (
        topology["finalCellNodes"]
    )

    canonical_map = (
        topology["canonicalMap"]
    )

    reverse = (
        topology["reverseEvents"][0]
    )

    require(
        len(final_nodes) == 2,
        "expected two final cells",
    )

    require(
        len(canonical_map) == 2,
        "expected two canonicalMap records",
    )

    canonical_by_index = {
        int(record[1]): int(record[0])
        for record in canonical_map
    }

    require(
        set(canonical_by_index)
        ==
        {0, 1},
        "bad canonicalMap",
    )

    step = int(reverse[0])

    kind = int(reverse[1])

    reverse_counts = [
        int(reverse[2]),
        int(reverse[3]),
    ]

    reverse_vertex_counts = [
        int(reverse[4]),
        int(reverse[5]),
    ]

    predecessors = [
        int(value)
        for value in reverse[6]
    ]

    removed = [
        int(value)
        for value in reverse[7]
    ]

    require(
        step == 6850,
        "first reverse event is not step 6850",
    )

    require(
        kind == 1,
        "step 6850 is not the Pachner event kind",
    )

    require(
        reverse_counts == [2, 3],
        "step 6850 is not reverse 2->3",
    )

    require(
        reverse_vertex_counts == [1, 1],
        "step 6850 changes vertex count",
    )

    require(
        len(predecessors) == 3,
        "step 6850 does not restore three cells",
    )

    require(
        set(removed)
        ==
        set(final_nodes),
        "step 6850 does not remove final cells",
    )

    a = canonical_by_index[0]
    b = canonical_by_index[1]

    # Standard PL triangular-bipyramid
    # carrier for the final 3<->2 move.
    #
    # These are LOCAL display coordinates.
    # They are deliberately NOT claimed to
    # be ambient knot-exterior coordinates.
    vertices = {
        "q0": [
            -1.0,
            -0.5773502691896258,
            0.0,
        ],

        "q1": [
            1.0,
            -0.5773502691896258,
            0.0,
        ],

        "q2": [
            0.0,
            1.1547005383792517,
            0.0,
        ],

        "top": [
            0.0,
            0.0,
            1.25,
        ],

        "bottom": [
            0.0,
            0.0,
            -1.25,
        ],
    }

    predecessor_tets = [
        [
            "top",
            "bottom",
            "q0",
            "q1",
        ],

        [
            "top",
            "bottom",
            "q1",
            "q2",
        ],

        [
            "top",
            "bottom",
            "q2",
            "q0",
        ],
    ]

    result = {
        "schema":
            "m004-canonical-cell-partition-v1",

        "certifiedTopology":
            True,

        "canonicalIsoSig":
            topology["canonicalIsoSig"],

        "geometryStatus":
            "derived-local-pachner-carrier-not-ambient",

        "source": {
            "topology":
                "/geometry/"
                "figure-eight-complement/"
                "m004-certified-animation-topology.json",
        },

        "canonicalCells": [
            {
                "label":
                    "A",

                "cellNode":
                    a,

                "cellName":
                    names[a],
            },

            {
                "label":
                    "B",

                "cellNode":
                    b,

                "cellName":
                    names[b],
            },
        ],

        "stages": [
            {
                "id":
                    "reverse-6850",

                "globalStep":
                    step,

                "kind":
                    "inverse-final-3-to-2-pachner",

                "topology": {
                    "canonicalCellNodes": [
                        a,
                        b,
                    ],

                    "canonicalCellNames": [
                        names[a],
                        names[b],
                    ],

                    "predecessorCellNodes":
                        predecessors,

                    "predecessorCellNames": [
                        names[node]
                        for node
                        in predecessors
                    ],

                    "reverseTetrahedra":
                        reverse_counts,

                    "reverseVertices":
                        reverse_vertex_counts,
                },

                "carrier": {
                    "kind":
                        "triangular-bipyramid",

                    "coordinateStatus":
                        "deterministic-local-display-realisation",

                    "vertices":
                        vertices,

                    "outerFaces": [
                        [
                            "top",
                            "q0",
                            "q1",
                        ],

                        [
                            "top",
                            "q1",
                            "q2",
                        ],

                        [
                            "top",
                            "q2",
                            "q0",
                        ],

                        [
                            "bottom",
                            "q1",
                            "q0",
                        ],

                        [
                            "bottom",
                            "q2",
                            "q1",
                        ],

                        [
                            "bottom",
                            "q0",
                            "q2",
                        ],
                    ],
                },

                # This partition DOES NOT MOVE.
                #
                # A is the upper tetrahedron.
                # B is the lower tetrahedron.
                #
                # The equatorial triangle is
                # their material interface.
                "materialPartition": {
                    "A": {
                        "tetrahedron": [
                            "q0",
                            "q1",
                            "q2",
                            "top",
                        ],
                    },

                    "B": {
                        "tetrahedron": [
                            "q0",
                            "q2",
                            "q1",
                            "bottom",
                        ],
                    },

                    "interface": [
                        "q0",
                        "q1",
                        "q2",
                    ],
                },

                # What DOES change is the
                # triangulation of the carrier.
                "triangulations": {
                    "canonicalTwo": [
                        {
                            "cellNode":
                                a,

                            "cellName":
                                names[a],

                            "vertices": [
                                "q0",
                                "q1",
                                "q2",
                                "top",
                            ],
                        },

                        {
                            "cellNode":
                                b,

                            "cellName":
                                names[b],

                            "vertices": [
                                "q0",
                                "q2",
                                "q1",
                                "bottom",
                            ],
                        },
                    ],

                    "predecessorThree": [
                        {
                            "cellNode":
                                node,

                            "cellName":
                                names[node],

                            "vertices":
                                tet,
                        }
                        for node, tet
                        in zip(
                            predecessors,
                            predecessor_tets,
                        )
                    ],

                    "canonicalInternalFace": [
                        "q0",
                        "q1",
                        "q2",
                    ],

                    "predecessorInternalEdge": [
                        "top",
                        "bottom",
                    ],
                },
            },
        ],
    }

    OUTPUT_PATH.write_text(
        json.dumps(
            result,
            separators=(",", ":"),
        )
        +
        "\n"
    )

    print(
        "m004 canonical A/B "
        "partition stage 1: PASS"
    )

    print(
        "output:",
        OUTPUT_PATH,
    )

    print(
        "A:",
        names[a],
    )

    print(
        "B:",
        names[b],
    )

    print(
        "predecessors:",
        ", ".join(
            names[node]
            for node
            in predecessors
        ),
    )

    print(
        "geometry status:",
        result["geometryStatus"],
    )


if __name__ == "__main__":
    main()
