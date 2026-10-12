#!/usr/bin/env python3

from pathlib import Path
import inspect

import regina


HERE = Path(__file__).resolve().parent

INPUT = (
    HERE /
    "m129_marked.snappea"
)


def heading(text):
    print()
    print("=" * 72)
    print(text)
    print("=" * 72)


def describe_callable(
    obj,
    name,
):
    method = getattr(
        obj,
        name,
        None
    )

    print()
    print(
        name
    )
    print("-" * 40)

    if method is None:
        print(
            "MISSING"
        )
        return

    try:
        signature = inspect.signature(
            method
        )
    except Exception:
        signature = "(signature unavailable)"

    print(
        "signature:",
        signature
    )

    print()
    print(
        "doc:"
    )

    print(
        getattr(
            method,
            "__doc__",
            None
        )
    )


def try_call(
    label,
    callable_,
    *args,
):
    print()
    print(
        label
    )
    print("-" * 40)

    try:
        result = callable_(
            *args
        )
    except Exception as error:
        print(
            "FAILED:",
            type(error).__name__,
            error,
        )
        return None

    print(
        "type:",
        type(result)
    )

    print(
        "repr:",
        repr(result)
    )

    try:
        print(
            "str:",
            str(result)
        )
    except Exception:
        pass

    return result


def main():
    heading(
        "m129 REGINA PERIPHERAL "
        "CURVE PROBE"
    )

    if not INPUT.exists():
        raise RuntimeError(
            "Missing marked SnapPea bridge file:\n"
            f"{INPUT}"
        )

    snap = regina.SnapPeaTriangulation(
        INPUT.read_text()
    )

    print(
        "type:",
        type(snap)
    )

    print(
        "tetrahedra:",
        snap.size()
    )

    print(
        "cusps:",
        snap.countCusps()
    )

    print(
        "isoSig:",
        snap.isoSig()
    )


    heading(
        "METHOD DOCUMENTATION"
    )

    for name in (
        "meridian",
        "longitude",
        "longitudeCuts",
        "meridianLongitude",
        "slopeEquations",
        "fill",
        "fillTorus",
    ):
        describe_callable(
            snap,
            name
        )


    heading(
        "DIRECT PERIPHERAL CALLS"
    )

    for cusp_index in range(
        snap.countCusps()
    ):
        print()
        print(
            "#" * 72
        )
        print(
            f"CUSP {cusp_index}"
        )
        print(
            "#" * 72
        )

        try_call(
            f"meridian({cusp_index})",
            snap.meridian,
            cusp_index,
        )

        try_call(
            f"longitude({cusp_index})",
            snap.longitude,
            cusp_index,
        )

        try_call(
            f"longitudeCuts({cusp_index})",
            snap.longitudeCuts,
            cusp_index,
        )

        try_call(
            f"meridianLongitude({cusp_index})",
            snap.meridianLongitude,
            cusp_index,
        )


    heading(
        "SLOPE EQUATIONS"
    )

    try_call(
        "slopeEquations()",
        snap.slopeEquations,
    )

    for cusp_index in range(
        snap.countCusps()
    ):
        try_call(
            f"slopeEquations({cusp_index})",
            snap.slopeEquations,
            cusp_index,
        )


    heading(
        "CERTIFIED FILLING INPUT CHECK"
    )

    #
    # Our already-certified viewer slope
    #
    #     (3,-1)
    #
    # converts to SnapPy/SnapPea basis
    #
    #     (1,1)
    #
    # on cusp 1.
    #
    # Do not mutate the authoritative object.
    #
    # Work on a fresh copy loaded from the same marked data.
    #
    filled = regina.SnapPeaTriangulation(
        INPUT.read_text()
    )

    try_call(
        "fill(1, 1, cusp=1)",
        filled.fill,
        1,
        1,
        1,
    )

    print()
    print(
        "after fill:"
    )

    print(
        "complete cusps:",
        filled.countCompleteCusps()
    )

    print(
        "filled cusps:",
        filled.countFilledCusps()
    )

    print(
        "cusp 1:",
        filled.cusp(1)
    )


    heading(
        "RESULT"
    )

    print(
        "Probe complete."
    )

    print(
        "The outputs above tell us exactly "
        "how Regina 7.4 encodes the marked "
        "meridian and longitude for cusp 1."
    )


if __name__ == "__main__":
    main()
