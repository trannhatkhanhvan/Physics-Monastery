#!/usr/bin/env python3

from math import gcd, pi

import snappy
from spherogram import Link


WHITEHEAD_LINK_NAME = "5^2_1"
FIGURE_EIGHT_NAME = "m004"
MAX_SLOPE = 8


def primitive_slopes(limit):
    slopes = []

    for p in range(-limit, limit + 1):
        for q in range(-limit, limit + 1):
            if p == 0 and q == 0:
                continue

            if gcd(abs(p), abs(q)) != 1:
                continue

            # One representative of the unoriented slope.
            if p < 0 or (p == 0 and q < 0):
                continue

            slopes.append((p, q))

    return slopes


def safe_signature(manifold, of_link=False):
    try:
        return manifold.isometry_signature(of_link=of_link)
    except Exception as exc:
        return f"<unavailable: {exc}>"


def safe_identify(manifold):
    try:
        return [str(item) for item in manifold.identify()]
    except Exception as exc:
        return [f"<unavailable: {exc}>"]


def component_summary(link):
    print("LINK COMPONENTS")
    print("-" * 72)

    for index, component in enumerate(link.link_components):
        print(f"component {index}")
        print(f"  crossing strands: {len(component)}")

    print()


def search_figure_eight_fillings(source, target):
    matches = []

    for cusp_index in range(source.num_cusps()):
        for slope in primitive_slopes(MAX_SLOPE):
            candidate = source.copy()

            try:
                candidate.dehn_fill(slope, cusp_index)

                candidate = candidate.filled_triangulation(
                    [cusp_index]
                )
            except Exception:
                continue

            if candidate.num_cusps() != 1:
                continue

            try:
                isometric = candidate.is_isometric_to(target)
            except Exception:
                isometric = False

            if not isometric:
                continue

            matches.append(
                {
                    "cusp": cusp_index,
                    "slope": slope,
                    "signature": safe_signature(candidate),
                    "link_signature": safe_signature(
                        candidate,
                        of_link=True,
                    ),
                    "identify": safe_identify(candidate),
                }
            )

    return matches


def probe_dehn_deformation(
    source,
    target,
    filled_cusp=1,
    surviving_cusp=0,
    viewer_slope=(3, -1),
):
    """
    Follow the genuine hyperbolic Dehn-filling deformation while
    preserving the original m129 triangulation.

    Once the Dehn-filling coefficients are assigned, SnapPy's
    set_target_holonomy() solves the hyperbolic gluing equations
    with the holonomy of that filling curve constrained to the
    requested value.

    We test the natural continuation

        H_fill(t) = 2*pi*i*t,

    from the complete structure at t=0 to the completed filling
    equation at t=1.
    """

    # Certified peripheral-basis conversion.
    #
    # Viewer basis:
    #
    #     mu_v = mu_link
    #     lambda_v = 2 mu_link - lambda_link
    #
    # Hence:
    #
    #     (p,q)_v -> (p + 2q, -q)_link
    slope = (
        viewer_slope[0] +
        2 * viewer_slope[1],
        -viewer_slope[1],
    )

    samples = [
        0.00,
        0.05,
        0.10,
        0.20,
        0.35,
        0.50,
        0.65,
        0.80,
        0.90,
        0.95,
        1.00,
    ]

    print("=" * 72)
    print("HYPERBOLIC DEHN-DEFORMATION PROBE")
    print("=" * 72)
    print()

    print(f"filled cusp:       {filled_cusp}")
    print(f"surviving cusp:    {surviving_cusp}")
    print(
        "viewer slope:      "
        f"{viewer_slope}"
    )

    print(
        "SnapPy/link slope: "
        f"{slope}"
    )

    print()

    deformation_source = source.copy()

    # Assign the actual topological filling slope, but retain the
    # original ideal triangulation while we vary its holonomy.
    deformation_source.dehn_fill(
        slope,
        filled_cusp,
    )

    previous_shapes = None

    for t in samples:
        state = deformation_source.copy()

        requested = (
            2j *
            pi *
            t
        )

        try:
            state.set_target_holonomy(
                requested,
                filled_cusp,
            )
        except Exception as exc:
            print("-" * 72)
            print(f"t = {t:.2f}")
            print(
                "set_target_holonomy FAILED: "
                f"{type(exc).__name__}: {exc}"
            )
            print()
            continue

        filled_info = state.cusp_info(
            filled_cusp
        )

        surviving_info = state.cusp_info(
            surviving_cusp
        )

        meridian, longitude = [
            complex(value)
            for value in
            filled_info["holonomies"]
        ]

        filling_holonomy = (
            slope[0] *
            meridian +
            slope[1] *
            longitude
        )

        shapes = [
            complex(shape)
            for shape in
            state.tetrahedra_shapes(
                "rect"
            )
        ]

        print("-" * 72)
        print(f"t = {t:.2f}")
        print()

        print(
            "solution type:       "
            f"{state.solution_type()}"
        )

        print(
            "volume:              "
            f"{state.volume()}"
        )

        print(
            "requested H_fill:    "
            f"{requested.real:+.12f} "
            f"{requested.imag:+.12f}i"
        )

        print(
            "actual H_fill:       "
            f"{filling_holonomy.real:+.12f} "
            f"{filling_holonomy.imag:+.12f}i"
        )

        print(
            "holonomy error:      "
            f"{abs(filling_holonomy - requested):.3e}"
        )

        print(
            "filled meridian:     "
            f"{meridian.real:+.12f} "
            f"{meridian.imag:+.12f}i"
        )

        print(
            "filled longitude:    "
            f"{longitude.real:+.12f} "
            f"{longitude.imag:+.12f}i"
        )

        surviving_holonomies = [
            complex(value)
            for value in
            surviving_info["holonomies"]
        ]

        surviving_shape = complex(
            surviving_info["shape"]
        )

        print(
            "surviving cusp shape:"
            f" {surviving_shape.real:+.12f} "
            f"{surviving_shape.imag:+.12f}i"
        )

        print(
            "surviving meridian:  "
            f"{surviving_holonomies[0].real:+.12f} "
            f"{surviving_holonomies[0].imag:+.12f}i"
        )

        print(
            "surviving longitude: "
            f"{surviving_holonomies[1].real:+.12f} "
            f"{surviving_holonomies[1].imag:+.12f}i"
        )

        print()
        print("tetrahedron shapes:")

        for index, shape in enumerate(
            shapes
        ):
            print(
                f"  z{index}: "
                f"{shape.real:+.12f} "
                f"{shape.imag:+.12f}i"
            )

        if previous_shapes is not None:
            max_shape_step = max(
                abs(
                    current -
                    previous
                )
                for current, previous
                in zip(
                    shapes,
                    previous_shapes,
                )
            )

            print(
                "max shape step:     "
                f"{max_shape_step:.6e}"
            )

        previous_shapes = shapes

        print()

    print("=" * 72)
    print("DEFORMATION ENDPOINT CHECK")
    print("=" * 72)
    print()

    endpoint = deformation_source.copy()

    endpoint.set_target_holonomy(
        2j * pi,
        filled_cusp,
    )

    filled = endpoint.filled_triangulation(
        [filled_cusp]
    )

    print(
        "cusps after filling:   "
        f"{filled.num_cusps()}"
    )

    try:
        isometric = filled.is_isometric_to(
            target
        )
    except Exception:
        isometric = False

    print(
        "isometric to m004:     "
        f"{isometric}"
    )

    print(
        "identify():            "
        f"{safe_identify(filled)}"
    )

    print()


def main():
    print("=" * 72)
    print("3-MANIFOLD SURGERY EXPLORER — LINK COMPONENT PROBE")
    print("=" * 72)
    print()

    whitehead = Link(WHITEHEAD_LINK_NAME)

    print("SPHEROGRAM LINK")
    print("-" * 72)
    print(f"name:             {WHITEHEAD_LINK_NAME}")
    print(f"components:       {len(whitehead.link_components)}")
    print(f"crossings:        {len(whitehead.crossings)}")
    print(f"PD code:          {whitehead.PD_code()}")
    print(f"DT code:          {whitehead.DT_code(DT_alpha=True)}")
    print(f"linking matrix:   {whitehead.linking_matrix()}")
    print()

    component_summary(whitehead)

    # Rebuild from the PD code.  This gives us an explicit representation
    # whose component ordering can be stored as project data rather than
    # relying forever on a census name.
    pd_code = whitehead.PD_code()
    rebuilt = Link(pd_code)

    print("PD ROUND TRIP")
    print("-" * 72)
    print(
        "same PD code:      "
        f"{rebuilt.PD_code() == pd_code}"
    )
    print(
        "component lengths: "
        f"{[len(c) for c in rebuilt.link_components]}"
    )
    print()

    exterior = rebuilt.exterior()
    census = snappy.Manifold("m129")

    print("LINK-DERIVED EXTERIOR")
    print("-" * 72)
    print(f"cusps:                 {exterior.num_cusps()}")
    print(f"volume:                {exterior.volume()}")
    print(
        "isometry signature:    "
        f"{safe_signature(exterior)}"
    )
    print(
        "link signature:        "
        f"{safe_signature(exterior, of_link=True)}"
    )
    print(
        "isometric to m129:     "
        f"{exterior.is_isometric_to(census)}"
    )
    print(f"identify():             {safe_identify(exterior)}")
    print()

    print("LINK-DERIVED CUSP DATA")
    print("-" * 72)

    for index, info in enumerate(exterior.cusp_info()):
        print(f"cusp {index}")
        print(f"  complete: {info['complete?']}")
        print(f"  filling:  {info['filling']}")
        print(f"  shape:    {info['shape']}")

    print()

    target = snappy.Manifold(FIGURE_EIGHT_NAME)

    matches = search_figure_eight_fillings(
        exterior,
        target,
    )

    print("=" * 72)
    print("FIGURE-EIGHT FILLINGS IN LINK-DERIVED BASIS")
    print("=" * 72)
    print()

    if not matches:
        raise SystemExit(
            "No figure-eight filling was found in the "
            "link-derived peripheral basis."
        )

    for index, match in enumerate(matches, start=1):
        print(f"MATCH {index}")
        print(f"  filled cusp:     {match['cusp']}")
        print(f"  slope:           {match['slope']}")
        print(f"  signature:       {match['signature']}")
        print(f"  link signature:  {match['link_signature']}")
        print(f"  identify():      {match['identify']}")
        print()

    probe_dehn_deformation(
        exterior,
        target,
        filled_cusp=1,
        surviving_cusp=0,
        viewer_slope=(3, -1),
    )

    print("=" * 72)
    print("PROPOSED PERSISTENT LABELING")
    print("=" * 72)
    print()
    print(
        "For the first directed surgery edge we will choose one "
        "ordered component as CROSSING_CIRCLE and the other as "
        "SURVIVING_KNOT."
    )
    print()
    print(
        "This labeling is not claimed to be intrinsic to the "
        "unmarked Whitehead-link complement: its two cusps are "
        "symmetric.  It becomes meaningful as part of the directed "
        "operation m004 -> Whitehead link -> m004."
    )


if __name__ == "__main__":
    main()
