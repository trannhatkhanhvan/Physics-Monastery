#!/usr/bin/env python3

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import snappy
from spherogram import Link


HERE = Path(__file__).resolve().parent

APP_DIR = HERE.parent

GENERATED_DIR = (
    APP_DIR /
    "data" /
    "generated"
)

DEHN_PATH_FILE = (
    GENERATED_DIR /
    "m129_to_m004_dehn_path.json"
)

ANIMATION_MANIFEST_FILE = (
    GENERATED_DIR /
    "m129_animation_manifest.json"
)

CUSP_TRIANGLES_FILE = (
    GENERATED_DIR /
    "m129_cusp_triangles.json"
)

OUTPUT_FILE = (
    GENERATED_DIR /
    "m129_to_m004_surgery_edge.json"
)


SOURCE_MANIFOLD = "m129"
TARGET_MANIFOLD = "m004"
SPHEROGRAM_LINK_NAME = "5^2_1"

FILLED_CUSP = 1
SURVIVING_CUSP = 0

VIEWER_SLOPE = (3, -1)
SNAPPY_SLOPE = (1, 1)

# Column-vector convention:
#
#   [ p_snap ]   [ 1  2 ] [ p_view ]
#   [ q_snap ] = [ 0 -1 ] [ q_view ]
#
# Hence
#
#   (3,-1)_viewer -> (1,1)_SnapPy.
#
VIEWER_TO_SNAPPY_SLOPE_MATRIX = (
    (1, 2),
    (0, -1),
)


def load_json(path: Path):
    if not path.exists():
        raise RuntimeError(
            f"Required generated asset does not exist: {path}"
        )

    return json.loads(
        path.read_text()
    )


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()

    with path.open("rb") as handle:
        while True:
            block = handle.read(
                1024 * 1024
            )

            if not block:
                break

            digest.update(block)

    return digest.hexdigest()


def manifold_signature(manifold):
    return str(
        manifold.isometry_signature()
    )


def identify_strings(manifold):
    try:
        return [
            str(item)
            for item in manifold.identify()
        ]
    except Exception:
        return []


def complex_record(value):
    return {
        "re": float(value.real),
        "im": float(value.imag),
    }


def slope_transform(
    slope,
    matrix,
):
    p, q = slope

    return (
        matrix[0][0] * p +
        matrix[0][1] * q,
        matrix[1][0] * p +
        matrix[1][1] * q,
    )


def entry_crossing(entry):
    crossing = getattr(
        entry,
        "crossing",
        None,
    )

    if crossing is not None:
        return crossing

    try:
        return entry[0]
    except Exception:
        return None


def entry_strand(entry):
    strand = getattr(
        entry,
        "strand_index",
        None,
    )

    if strand is not None:
        return int(strand)

    try:
        return int(entry[1])
    except Exception:
        return None


def diagram_record(link):
    try:
        dt_code = str(
            link.DT_code()
        )
    except Exception:
        dt_code = None

    return {
        "component_count":
            len(
                link.link_components
            ),

        "crossing_count":
            len(
                link.crossings
            ),

        "pd_code": [
            [
                int(value)
                for value in crossing
            ]
            for crossing in
            link.PD_code()
        ],

        "dt_code":
            dt_code,
    }


def certified_crossing_disk_record(
    link,
    surviving_component,
    crossing_circle_component,
):
    crossing_indices = {
        crossing: index
        for index, crossing in
        enumerate(link.crossings)
    }

    surviving_entries = list(
        link.link_components[
            surviving_component
        ]
    )

    circle_entries = list(
        link.link_components[
            crossing_circle_component
        ]
    )

    circle_crossings = [
        crossing_indices[
            entry_crossing(entry)
        ]
        for entry in
        circle_entries
    ]

    circle_edges = {
        frozenset(
            (
                circle_crossings[index],
                circle_crossings[
                    (index + 1) %
                    len(circle_crossings)
                ],
            )
        )
        for index in range(
            len(circle_crossings)
        )
    }

    mixed_crossings = set(
        circle_crossings
    )

    disk_strands = []

    for arc_index, start in enumerate(
        surviving_entries
    ):
        end = surviving_entries[
            (arc_index + 1) %
            len(surviving_entries)
        ]

        start_crossing = (
            crossing_indices[
                entry_crossing(start)
            ]
        )

        end_crossing = (
            crossing_indices[
                entry_crossing(end)
            ]
        )

        both_mixed = (
            start_crossing in
            mixed_crossings and
            end_crossing in
            mixed_crossings
        )

        adjacent_on_circle = (
            frozenset(
                (
                    start_crossing,
                    end_crossing,
                )
            )
            in circle_edges
        )

        if (
            both_mixed and
            adjacent_on_circle
        ):
            disk_strands.append(
                {
                    "arc":
                        arc_index,

                    "start":
                        {
                            "crossing":
                                start_crossing,

                            "strand":
                                entry_strand(
                                    start
                                ),
                        },

                    "end":
                        {
                            "crossing":
                                end_crossing,

                            "strand":
                                entry_strand(
                                    end
                                ),
                        },
                }
            )

    certified_arc_ids = [
        record["arc"]
        for record in
        disk_strands
    ]

    if certified_arc_ids != [1, 4]:
        raise RuntimeError(
            "Crossing-disk strand certification failed: "
            f"found {certified_arc_ids}, expected [1, 4]."
        )

    return {
        "crossing_circle_component":
            crossing_circle_component,

        "surviving_component":
            surviving_component,

        "mixed_crossings":
            sorted(
                mixed_crossings
            ),

        "crossing_circle_cyclic_order":
            circle_crossings,

        "disk_puncture_arcs":
            certified_arc_ids,

        "disk_puncture_strands":
            disk_strands,

        "certification":
            (
                "Each selected surviving-component arc has "
                "two mixed-crossing endpoints, and those "
                "endpoints are adjacent in the cyclic traversal "
                "of the crossing-circle component."
            ),
    }


def spherogram_link_record(link):
    pd_code = link.PD_code()

    try:
        dt_code = str(
            link.DT_code()
        )
    except Exception:
        dt_code = None

    try:
        linking_matrix = [
            [
                int(value)
                for value in row
            ]
            for row in
            link.linking_matrix()
        ]
    except Exception:
        linking_matrix = None

    component_lengths = [
        len(component)
        for component in
        link.link_components
    ]

    return {
        "name": SPHEROGRAM_LINK_NAME,

        "component_count":
            len(
                link.link_components
            ),

        "crossing_count":
            len(
                link.crossings
            ),

        "pd_code": [
            [
                int(value)
                for value in crossing
            ]
            for crossing in
            pd_code
        ],

        "dt_code":
            dt_code,

        "linking_matrix":
            linking_matrix,

        "component_lengths":
            component_lengths,
    }


def certify_dehn_path(
    dehn_path,
):
    states = (
        dehn_path.get("states")
        or []
    )

    if len(states) != 201:
        raise RuntimeError(
            "Expected exactly 201 certified "
            f"Dehn states; found {len(states)}."
        )

    first = states[0]
    last = states[-1]

    first_t = float(
        first.get("t")
    )

    last_t = float(
        last.get("t")
    )

    if abs(first_t) > 1e-12:
        raise RuntimeError(
            "First Dehn state is not t=0."
        )

    if abs(last_t - 1.0) > 1e-12:
        raise RuntimeError(
            "Last Dehn state is not t=1."
        )

    first_volume = float(
        first.get("volume")
    )

    last_volume = float(
        last.get("volume")
    )

    return {
        "sample_count":
            len(states),

        "parameter_start":
            first_t,

        "parameter_end":
            last_t,

        "source_volume":
            first_volume,

        "target_volume":
            last_volume,
    }


def main():
    dehn_path = load_json(
        DEHN_PATH_FILE
    )

    animation_manifest = load_json(
        ANIMATION_MANIFEST_FILE
    )

    cusp_triangles = load_json(
        CUSP_TRIANGLES_FILE
    )

    path_summary = certify_dehn_path(
        dehn_path
    )


    print(
        "=" * 72
    )

    print(
        "m129 -> m004 SURGERY EDGE GENERATOR"
    )

    print(
        "=" * 72
    )

    print()


    # ========================================================
    # SnapPy source and target census manifolds.
    # ========================================================

    source = snappy.Manifold(
        SOURCE_MANIFOLD
    )

    target = snappy.Manifold(
        TARGET_MANIFOLD
    )

    source_signature = (
        manifold_signature(
            source
        )
    )

    target_signature = (
        manifold_signature(
            target
        )
    )


    # ========================================================
    # Spherogram link presentation.
    #
    # This is not decorative metadata. It independently
    # reconstructs the Whitehead-link exterior.
    # ========================================================

    link = Link(
        SPHEROGRAM_LINK_NAME
    )

    link_record = (
        spherogram_link_record(
            link
        )
    )

    link_exterior = link.exterior()

    link_signature = (
        manifold_signature(
            link_exterior
        )
    )

    source_isometric = (
        link_exterior.is_isometric_to(
            source
        )
    )

    if not source_isometric:
        raise RuntimeError(
            "Spherogram link exterior is not "
            "isometric to m129."
        )


    # ========================================================
    # Certified peripheral-basis conversion.
    # ========================================================

    transformed_slope = (
        slope_transform(
            VIEWER_SLOPE,
            VIEWER_TO_SNAPPY_SLOPE_MATRIX,
        )
    )

    if transformed_slope != SNAPPY_SLOPE:
        raise RuntimeError(
            "Viewer-to-SnapPy slope conversion failed: "
            f"{VIEWER_SLOPE} -> {transformed_slope}, "
            f"expected {SNAPPY_SLOPE}."
        )


    # ========================================================
    # Let SnapPy perform the actual topological Dehn filling.
    # ========================================================

    filled_source = (
        link_exterior.copy()
    )

    filled_source.dehn_fill(
        SNAPPY_SLOPE,
        FILLED_CUSP,
    )

    filled = (
        filled_source
        .filled_triangulation()
    )

    endpoint_isometric = (
        filled.is_isometric_to(
            target
        )
    )

    if not endpoint_isometric:
        raise RuntimeError(
            "Certified filling does not produce m004."
        )

    endpoint_signature = (
        manifold_signature(
            filled
        )
    )

    endpoint_identify = (
        identify_strings(
            filled
        )
    )


    # ========================================================
    # Recover a planar target-knot diagram from the filled
    # one-cusped manifold using SnapPy itself.
    # ========================================================

    recovered_target_link = (
        filled.exterior_to_link(
            check_input=True,
            check_answer=True,
            careful_perturbation=True,
            simplify_link=True,
            pachner_search_tries=20,
            seed=1729,
        )
    )

    if (
        len(
            recovered_target_link
                .link_components
        ) != 1
    ):
        raise RuntimeError(
            "SnapPy post-fill link recovery did not "
            "produce exactly one component."
        )

    recovered_target_exterior = (
        recovered_target_link
        .exterior()
    )

    recovered_target_isometric = (
        recovered_target_exterior
        .is_isometric_to(
            target
        )
    )

    if not recovered_target_isometric:
        raise RuntimeError(
            "SnapPy recovered target-knot diagram "
            "is not isometric to m004."
        )

    source_diagram = (
        diagram_record(
            link
        )
    )

    target_diagram = (
        diagram_record(
            recovered_target_link
        )
    )

    crossing_disk = (
        certified_crossing_disk_record(
            link,
            SURVIVING_CUSP,
            FILLED_CUSP,
        )
    )


    # ========================================================
    # Basic source / target numerical checks.
    # ========================================================

    source_volume = float(
        source.volume()
    )

    target_volume = float(
        target.volume()
    )

    if (
        abs(
            path_summary[
                "source_volume"
            ] -
            source_volume
        ) >
        1e-8
    ):
        raise RuntimeError(
            "Dehn path source volume does not "
            "match SnapPy m129 volume."
        )

    if (
        abs(
            path_summary[
                "target_volume"
            ] -
            target_volume
        ) >
        1e-8
    ):
        raise RuntimeError(
            "Dehn path target volume does not "
            "match SnapPy m004 volume."
        )


    # ========================================================
    # One authoritative surgery-edge object.
    # ========================================================

    manifest = {
        "schema":
            "physics-monastery.surgery-edge",

        "schema_version":
            1,

        "edge_id":
            "m129-cusp1-1_1-to-m004",

        "operation":
            "dehn_fill",

        "direction":
            {
                "source": SOURCE_MANIFOLD,
                "target": TARGET_MANIFOLD,
            },

        "mathematical_engine":
            {
                "topology":
                    "SnapPy + Spherogram",

                "hyperbolic_structure":
                    "SnapPy",

                "frontend_role":
                    "interactive visualization only",
            },

        "source":
            {
                "manifold":
                    SOURCE_MANIFOLD,

                "isometry_signature":
                    source_signature,

                "cusp_count":
                    int(
                        source.num_cusps()
                    ),

                "volume":
                    source_volume,
            },

        "target":
            {
                "manifold":
                    TARGET_MANIFOLD,

                "isometry_signature":
                    target_signature,

                "cusp_count":
                    int(
                        target.num_cusps()
                    ),

                "volume":
                    target_volume,

                "identify":
                    identify_strings(
                        target
                    ),
            },

        "link_presentation":
            {
                **link_record,

                "exterior_isometry_signature":
                    link_signature,

                "exterior_isometric_to_source":
                    bool(
                        source_isometric
                    ),

                "component_roles":
                    [
                        {
                            "component":
                                SURVIVING_CUSP,

                            "role":
                                "surviving_knot",
                        },
                        {
                            "component":
                                FILLED_CUSP,

                            "role":
                                "crossing_circle",
                        },
                    ],
            },

        "filling":
            {
                "filled_cusp":
                    FILLED_CUSP,

                "filled_cusp_role":
                    "crossing_circle",

                "surviving_cusp":
                    SURVIVING_CUSP,

                "surviving_cusp_role":
                    "surviving_knot",

                "viewer_basis":
                    {
                        "slope":
                            list(
                                VIEWER_SLOPE
                            ),

                        "expression":
                            "3μ - λ",
                    },

                "snappy_basis":
                    {
                        "slope":
                            list(
                                SNAPPY_SLOPE
                            ),
                    },

                "viewer_to_snappy_matrix":
                    [
                        list(row)
                        for row in
                        VIEWER_TO_SNAPPY_SLOPE_MATRIX
                    ],

                "basis_orientation_determinant":
                    -1,

                "endpoint":
                    {
                        "isometry_signature":
                            endpoint_signature,

                        "isometric_to_target":
                            bool(
                                endpoint_isometric
                            ),

                        "identify":
                            endpoint_identify,
                    },
            },

        "surgery_presentation":
            {
                "source_diagram":
                    source_diagram,

                "crossing_disk":
                    crossing_disk,

                "target_diagram":
                    {
                        **target_diagram,

                        "exterior_isometry_signature":
                            manifold_signature(
                                recovered_target_exterior
                            ),

                        "exterior_isometric_to_target":
                            bool(
                                recovered_target_isometric
                            ),
                    },

                "local_twist":
                    {
                        "status":
                            "orientation_pending",

                        "full_twists":
                            1,

                        "sign":
                            None,

                        "reason":
                            (
                                "The two disk-puncturing strands "
                                "and the SnapPy-certified target "
                                "diagram are known, but the signed "
                                "local crossing-disk twist has not "
                                "yet been independently certified "
                                "against the chosen peripheral "
                                "orientation."
                            ),
                    },
            },

        "hyperbolic_deformation":
            {
                "parameter":
                    "t",

                "interval":
                    [0.0, 1.0],

                "sample_count":
                    path_summary[
                        "sample_count"
                    ],

                "driver":
                    "SnapPy set_target_holonomy",

                "filled_cusp_target_holonomy":
                    "2*pi*i*t",

                "data":
                    dehn_path,
            },

        "persistent_cusp_geometry":
            {
                "animation_manifest":
                    animation_manifest,

                "cusp_triangles":
                    cusp_triangles,
            },

        "provenance":
            {
                "generated_from":
                    {
                        "dehn_path":
                            DEHN_PATH_FILE.name,

                        "animation_manifest":
                            ANIMATION_MANIFEST_FILE.name,

                        "cusp_triangles":
                            CUSP_TRIANGLES_FILE.name,
                    },

                "sha256":
                    {
                        "dehn_path":
                            sha256_file(
                                DEHN_PATH_FILE
                            ),

                        "animation_manifest":
                            sha256_file(
                                ANIMATION_MANIFEST_FILE
                            ),

                        "cusp_triangles":
                            sha256_file(
                                CUSP_TRIANGLES_FILE
                            ),
                    },
            },
    }


    GENERATED_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    OUTPUT_FILE.write_text(
        json.dumps(
            manifest,
            indent=2,
            sort_keys=False,
        ) +
        "\n"
    )


    print(
        f"source:              {SOURCE_MANIFOLD}"
    )

    print(
        f"source signature:    {source_signature}"
    )

    print(
        f"Spherogram link:     {SPHEROGRAM_LINK_NAME}"
    )

    print(
        f"link exterior:       {link_signature}"
    )

    print(
        f"link exterior=m129:  {source_isometric}"
    )

    print()

    print(
        "viewer slope:        "
        f"{VIEWER_SLOPE}"
    )

    print(
        "SnapPy slope:        "
        f"{SNAPPY_SLOPE}"
    )

    print(
        "basis conversion:    "
        f"{VIEWER_SLOPE} -> {transformed_slope}"
    )

    print()

    print(
        f"filled cusp:         {FILLED_CUSP}"
    )

    print(
        f"surviving cusp:      {SURVIVING_CUSP}"
    )

    print(
        f"endpoint signature:  {endpoint_signature}"
    )

    print(
        f"endpoint=m004:       {endpoint_isometric}"
    )

    print(
        f"endpoint identify:   {endpoint_identify}"
    )

    print()

    print(
        "disk puncture arcs:  "
        f"{crossing_disk['disk_puncture_arcs']}"
    )

    print(
        "target diagram:      "
        f"{target_diagram['crossing_count']} crossings, "
        f"{target_diagram['component_count']} component"
    )

    print(
        "target diagram=m004: "
        f"{recovered_target_isometric}"
    )

    print()

    print(
        "Dehn samples:        "
        f"{path_summary['sample_count']}"
    )

    print(
        "volume:              "
        f"{path_summary['source_volume']:.12f} "
        "-> "
        f"{path_summary['target_volume']:.12f}"
    )

    print()

    print(
        f"wrote: {OUTPUT_FILE}"
    )

    print()

    print(
        "SURGERY EDGE CERTIFIED"
    )


if __name__ == "__main__":
    main()
