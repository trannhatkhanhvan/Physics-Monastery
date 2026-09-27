#!/usr/bin/env python3

from math import gcd

import snappy


FIGURE_EIGHT_NAME = "m004"
WHITEHEAD_NAME = "m129"
MAX_SLOPE = 8


def primitive_slopes(limit):
    slopes = []

    for p in range(-limit, limit + 1):
        for q in range(-limit, limit + 1):
            if p == 0 and q == 0:
                continue

            if gcd(abs(p), abs(q)) != 1:
                continue

            # (p,q) and (-p,-q) represent the same unoriented slope.
            if p < 0 or (p == 0 and q < 0):
                continue

            slopes.append((p, q))

    return slopes


def print_cusp_data(manifold, label):
    print()
    print(label)
    print("-" * 72)

    cusp_info = manifold.cusp_info()

    for i, info in enumerate(cusp_info):
        print(f"Cusp {i}")
        print(f"  complete:        {info['complete?']}")
        print(f"  filling:         {info['filling']}")
        print(f"  shape:           {info['shape']}")
        print()


def fill_one_cusp(source, cusp_index, slope):
    candidate = source.copy()
    candidate.dehn_fill(slope, cusp_index)

    # Remove the filled cusp from the triangulation while preserving
    # the remaining complete cusp.
    return candidate.filled_triangulation()


def safe_isometry_signature(manifold):
    try:
        return manifold.isometry_signature()
    except Exception as exc:
        return f"<unavailable: {exc}>"


def safe_link_signature(manifold):
    try:
        return manifold.isometry_signature(of_link=True)
    except Exception as exc:
        return f"<unavailable: {exc}>"


def safe_identify(manifold):
    try:
        matches = manifold.identify()
        return [str(match) for match in matches]
    except Exception as exc:
        return [f"<unavailable: {exc}>"]


def main():
    figure_eight = snappy.Manifold(FIGURE_EIGHT_NAME)
    whitehead = snappy.Manifold(WHITEHEAD_NAME)

    print("=" * 72)
    print("3-MANIFOLD SURGERY EXPLORER — PERIPHERAL PROBE")
    print("=" * 72)

    print()
    print("TARGET")
    print("-" * 72)
    print(f"name:                 {figure_eight.name()}")
    print(f"cusps:                {figure_eight.num_cusps()}")
    print(f"isometry signature:   {safe_isometry_signature(figure_eight)}")
    print(f"link signature:       {safe_link_signature(figure_eight)}")
    print(f"identify():           {safe_identify(figure_eight)}")

    print_cusp_data(
        figure_eight,
        "TARGET PERIPHERAL DATA",
    )

    print()
    print("SOURCE")
    print("-" * 72)
    print(f"name:                 {whitehead.name()}")
    print(f"cusps:                {whitehead.num_cusps()}")
    print(f"isometry signature:   {safe_isometry_signature(whitehead)}")
    print(f"link signature:       {safe_link_signature(whitehead)}")
    print(f"identify():           {safe_identify(whitehead)}")

    print_cusp_data(
        whitehead,
        "SOURCE PERIPHERAL DATA",
    )

    matches = []

    for cusp_index in range(whitehead.num_cusps()):
        for slope in primitive_slopes(MAX_SLOPE):
            try:
                candidate = fill_one_cusp(
                    whitehead,
                    cusp_index,
                    slope,
                )
            except Exception:
                continue

            if candidate.num_cusps() != 1:
                continue

            try:
                isometric = candidate.is_isometric_to(figure_eight)
            except Exception:
                isometric = False

            if not isometric:
                continue

            matches.append(
                {
                    "cusp_index": cusp_index,
                    "slope": slope,
                    "candidate": candidate,
                }
            )

    print()
    print("=" * 72)
    print("FIGURE-EIGHT FILLING CANDIDATES")
    print("=" * 72)

    if not matches:
        raise SystemExit(
            "No candidate filling of m129 produced a manifold "
            f"isometric to {FIGURE_EIGHT_NAME}."
        )

    for index, match in enumerate(matches, start=1):
        cusp_index = match["cusp_index"]
        slope = match["slope"]
        candidate = match["candidate"]

        print()
        print(f"CANDIDATE {index}")
        print("-" * 72)
        print(f"filled cusp:          {cusp_index}")
        print(f"slope:                {slope}")
        print(f"cusps after filling:  {candidate.num_cusps()}")
        print(f"volume:               {candidate.volume()}")
        print(
            "isometry signature:   "
            f"{safe_isometry_signature(candidate)}"
        )
        print(
            "link signature:       "
            f"{safe_link_signature(candidate)}"
        )
        print(
            "identify():           "
            f"{safe_identify(candidate)}"
        )

        print_cusp_data(
            candidate,
            f"CANDIDATE {index} SURVIVING CUSP DATA",
        )

    print()
    print("=" * 72)
    print("INTERPRETATION")
    print("=" * 72)
    print(
        "Every entry above is a filling of one cusp of m129 whose "
        "resulting one-cusped manifold is isometric to m004."
    )
    print()
    print(
        "We have NOT yet declared which cusp is the crossing-circle cusp."
    )
    print(
        "The next step is to construct the Whitehead link from its link "
        "description, attach persistent component identities to its two "
        "cusps, and determine which component is the crossing circle."
    )


if __name__ == "__main__":
    main()
