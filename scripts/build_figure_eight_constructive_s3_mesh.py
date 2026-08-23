#!/usr/bin/env python3

import json
import math
from pathlib import Path

import numpy as np


INPUT_PATH = Path(
    "public/geometry/figure-eight-complement/"
    "m004-constructive-tetmesh-r3.json"
)

OUTPUT_PATH = Path(
    "public/geometry/figure-eight-complement/"
    "m004-constructive-tetmesh-s3.json"
)

TOLERANCE = 1e-10


def fail(message):
    raise RuntimeError(message)


def inverse_stereographic(points3, pole4, basis4):
    points3 = np.asarray(
        points3,
        dtype=np.float64,
    )

    radius_squared = np.einsum(
        "ij,ij->i",
        points3,
        points3,
    )

    denominator = 1.0 + radius_squared

    tangent4 = points3 @ basis4

    points4 = (
        (2.0 / denominator)[:, None] *
        tangent4
        +
        (
            (radius_squared - 1.0) /
            denominator
        )[:, None] *
        pole4
    )

    return points4


def stereographic(points4, pole4, basis4):
    points4 = np.asarray(
        points4,
        dtype=np.float64,
    )

    denominator = (
        1.0 -
        points4 @ pole4
    )

    if np.any(
        ~np.isfinite(
            denominator
        )
    ):
        fail(
            "Non-finite stereographic denominator encountered."
        )

    if np.any(
        denominator <= 0.0
    ):
        fail(
            "An S3 sample reached or crossed "
            "the stereographic pole."
        )

    coordinates = (
        points4 @
        basis4.T
    )

    return (
        coordinates /
        denominator[:, None]
    )


def main():
    if not INPUT_PATH.exists():
        fail(
            "Missing certified R3 mesh: "
            f"{INPUT_PATH}"
        )

    source = json.loads(
        INPUT_PATH.read_text()
    )

    if not source.get(
        "valid",
        False,
    ):
        fail(
            "The R3 constructive mesh "
            "is not marked valid."
        )

    vertices3 = np.asarray(
        source["vertices3"],
        dtype=np.float64,
    )

    tetrahedra = np.asarray(
        source["tetrahedra"],
        dtype=np.int64,
    )

    pole4 = np.asarray(
        source["pole4"],
        dtype=np.float64,
    )

    basis4 = np.asarray(
        source["projectionBasis4"],
        dtype=np.float64,
    )


    if (
        vertices3.ndim != 2
        or
        vertices3.shape[1] != 3
    ):
        fail(
            "Unexpected R3 vertex array shape: "
            f"{vertices3.shape}"
        )


    if (
        tetrahedra.ndim != 2
        or
        tetrahedra.shape[1] != 4
    ):
        fail(
            "Unexpected tetrahedron array shape: "
            f"{tetrahedra.shape}"
        )


    if pole4.shape != (4,):
        fail(
            "Unexpected pole shape: "
            f"{pole4.shape}"
        )


    if basis4.shape != (3, 4):
        fail(
            "Unexpected projection basis shape: "
            f"{basis4.shape}"
        )


    if (
        len(vertices3) == 0
        or
        len(tetrahedra) == 0
    ):
        fail(
            "The certified R3 mesh is empty."
        )


    if (
        int(tetrahedra.min()) < 0
        or
        int(tetrahedra.max()) >=
            len(vertices3)
    ):
        fail(
            "Tetrahedron indices are outside "
            "the R3 vertex array."
        )


    pole_norm = float(
        np.linalg.norm(
            pole4
        )
    )


    if (
        not math.isfinite(
            pole_norm
        )
        or
        pole_norm <= 0.0
    ):
        fail(
            "Projection pole is degenerate."
        )


    pole4 = (
        pole4 /
        pole_norm
    )


    frame = np.vstack(
        (
            pole4[None, :],
            basis4,
        )
    )


    frame_gram = (
        frame @
        frame.T
    )


    maximum_frame_orthonormal_error = float(
        np.max(
            np.abs(
                frame_gram -
                np.eye(4)
            )
        )
    )


    vertices4 = inverse_stereographic(
        vertices3,
        pole4,
        basis4,
    )


    finite_vertex_count = int(
        np.sum(
            np.all(
                np.isfinite(
                    vertices4
                ),
                axis=1,
            )
        )
    )


    norms4 = np.linalg.norm(
        vertices4,
        axis=1,
    )


    maximum_s3_norm_error = float(
        np.max(
            np.abs(
                norms4 -
                1.0
            )
        )
    )


    recovered_vertices3 = stereographic(
        vertices4,
        pole4,
        basis4,
    )


    maximum_vertex_round_trip_error = float(
        np.max(
            np.linalg.norm(
                recovered_vertices3 -
                vertices3,
                axis=1,
            )
        )
    )


    cell_centers3 = np.mean(
        vertices3[
            tetrahedra
        ],
        axis=1,
    )


    cell_centers4 = inverse_stereographic(
        cell_centers3,
        pole4,
        basis4,
    )


    maximum_cell_center_s3_norm_error = float(
        np.max(
            np.abs(
                np.linalg.norm(
                    cell_centers4,
                    axis=1,
                ) -
                1.0
            )
        )
    )


    recovered_cell_centers3 = stereographic(
        cell_centers4,
        pole4,
        basis4,
    )


    maximum_cell_center_round_trip_error = float(
        np.max(
            np.linalg.norm(
                recovered_cell_centers3 -
                cell_centers3,
                axis=1,
            )
        )
    )


    pole_denominators = (
        1.0 -
        vertices4 @ pole4
    )


    minimum_pole_denominator = float(
        np.min(
            pole_denominators
        )
    )


    maximum_pole_denominator = float(
        np.max(
            pole_denominators
        )
    )


    summary = {
        "vertexCount":
            int(
                len(vertices4)
            ),

        "cellCount":
            int(
                len(tetrahedra)
            ),

        "finiteVertexCount":
            finite_vertex_count,

        "maximumFrameOrthonormalError":
            maximum_frame_orthonormal_error,

        "maximumS3NormError":
            maximum_s3_norm_error,

        "maximumVertexRoundTripError":
            maximum_vertex_round_trip_error,

        "maximumCellCenterS3NormError":
            maximum_cell_center_s3_norm_error,

        "maximumCellCenterRoundTripError":
            maximum_cell_center_round_trip_error,

        "minimumPoleDenominator":
            minimum_pole_denominator,

        "maximumPoleDenominator":
            maximum_pole_denominator,

        "topologyPreserved":
            True,

        "linearR4Tetrahedra":
            False,
    }


    valid = (
        finite_vertex_count ==
            len(vertices4)

        and
        maximum_frame_orthonormal_error <=
            TOLERANCE

        and
        maximum_s3_norm_error <=
            TOLERANCE

        and
        maximum_vertex_round_trip_error <=
            TOLERANCE

        and
        maximum_cell_center_s3_norm_error <=
            TOLERANCE

        and
        maximum_cell_center_round_trip_error <=
            TOLERANCE

        and
        minimum_pole_denominator >
            0.0
    )


    print()
    print(
        "CONSTRUCTIVE S3 MAP AUDIT"
    )
    print()


    for key, value in summary.items():
        print(
            f"  {key}: {value}"
        )


    if not valid:
        print()
        print(
            "CONSTRUCTIVE S3 MAP: FAIL"
        )

        raise SystemExit(
            2
        )


    OUTPUT_PATH.parent.mkdir(
        parents=True,
        exist_ok=True,
    )


    OUTPUT_PATH.write_text(
        json.dumps(
            {
                "valid":
                    True,

                "method":
                    (
                        "exact inverse stereographic "
                        "image of the certified "
                        "constructive R3 "
                        "figure-eight complement"
                    ),

                "vertices3":
                    vertices3.tolist(),

                "vertices4":
                    vertices4.tolist(),

                "tetrahedra":
                    tetrahedra.tolist(),

                "boundaryInputToVolumeVertex":
                    source[
                        "boundaryInputToVolumeVertex"
                    ],

                "pole4":
                    pole4.tolist(),

                "projectionBasis4":
                    basis4.tolist(),

                "cellMap": {
                    "type":
                        "inverse-stereographic-image",

                    "interpolationRule":
                        (
                            "barycentrically interpolate "
                            "inside each Euclidean R3 "
                            "tetrahedron, then apply "
                            "inverse stereographic projection"
                        ),

                    "linearR4Tetrahedra":
                        False,
                },

                "sourceR3Summary":
                    source[
                        "summary"
                    ],

                "summary":
                    summary,
            },

            separators=(
                ",",
                ":"
            ),
        )
    )


    print()
    print(
        "CONSTRUCTIVE S3 MAP: PASS"
    )
    print(
        f"Saved: {OUTPUT_PATH}"
    )


if __name__ == "__main__":
    main()
