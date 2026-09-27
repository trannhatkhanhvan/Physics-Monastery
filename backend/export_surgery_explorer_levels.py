import json
from pathlib import Path

import snappy


OUTPUT = Path(
    "src/app/3-manifold-surgery-explorer/"
    "data/generated/surgery_explorer_levels.json"
)


LEVEL_BY_TETRAHEDRA = {
    2: 1,
    3: 2,
}


def safe_link_identifications(manifold):
    names = []

    try:
        identified = manifold.identify()
    except Exception:
        identified = []

    for candidate in identified or []:
        try:
            name = str(candidate)
        except Exception:
            continue

        if name and name not in names:
            names.append(name)

    return names


def safe_link_signature(manifold):
    try:
        return manifold.link().exterior().isometry_signature(
            of_link=True
        )
    except Exception:
        return None


def manifold_record(manifold):
    tetrahedra = manifold.num_tetrahedra()

    try:
        isometry_signature = manifold.isometry_signature()
    except Exception:
        isometry_signature = None

    try:
        volume = float(manifold.volume())
    except Exception:
        volume = None

    try:
        cusp_count = manifold.num_cusps()
    except Exception:
        cusp_count = None

    return {
        "id": str(manifold),
        "level": LEVEL_BY_TETRAHEDRA[tetrahedra],
        "idealTetrahedra": tetrahedra,
        "cusps": cusp_count,
        "volume": volume,
        "isometrySignature": isometry_signature,
        "identifications": safe_link_identifications(
            manifold
        ),
        "linkSignature": safe_link_signature(
            manifold
        ),
    }


def main():
    levels = {
        "definition": {
            "level1": {
                "idealTetrahedra": 2,
                "description": (
                    "Orientable cusped hyperbolic "
                    "3-manifolds represented at the "
                    "minimal two-ideal-tetrahedron "
                    "complexity."
                ),
            },
            "level2": {
                "idealTetrahedra": 3,
                "description": (
                    "Orientable cusped hyperbolic "
                    "3-manifolds at the next "
                    "three-ideal-tetrahedron "
                    "complexity."
                ),
            },
        },
        "levels": {
            "1": [],
            "2": [],
        },
    }

    census = snappy.OrientableCuspedCensus

    for census_manifold in census:
        tetrahedra = (
            census_manifold.num_tetrahedra()
        )

        if tetrahedra not in LEVEL_BY_TETRAHEDRA:
            if tetrahedra > 3:
                break

            continue

        manifold = snappy.Manifold(
            str(census_manifold)
        )

        record = manifold_record(
            manifold
        )

        level = str(
            record["level"]
        )

        levels["levels"][
            level
        ].append(
            record
        )

    OUTPUT.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    OUTPUT.write_text(
        json.dumps(
            levels,
            indent=2,
            sort_keys=False,
        )
        + "\n"
    )

    print()
    print("3-MANIFOLD SURGERY EXPLORER")
    print("===========================")

    for level in ("1", "2"):
        entries = levels["levels"][level]

        tetrahedra = (
            levels["definition"][
                f"level{level}"
            ]["idealTetrahedra"]
        )

        print()
        print(
            f"LEVEL {level} · "
            f"{tetrahedra} IDEAL TETRAHEDRA"
        )
        print(
            "-" * 42
        )

        for entry in entries:
            ids = ", ".join(
                entry["identifications"]
            )

            suffix = (
                f" · {ids}"
                if ids
                else ""
            )

            volume = entry["volume"]

            volume_text = (
                f"{volume:.12f}"
                if volume is not None
                else "unknown"
            )

            print(
                f"{entry['id']:8s}"
                f" cusps={entry['cusps']}"
                f" volume={volume_text}"
                f"{suffix}"
            )

        print()
        print(
            f"count = {len(entries)}"
        )

    print()
    print(
        "WROTE:",
        OUTPUT,
    )


if __name__ == "__main__":
    main()
