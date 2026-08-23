/*
 * Direct finite R3 presentation of the two Menasco open 3-balls.
 *
 * The true top/bottom balls extend through the point at infinity.
 * For finite display we truncate each one with a distant rectangular
 * cap. The important inner surface is the Menasco diagram surface:
 * the diagram plane with upper/lower crossing hemispheres.
 */

function edgeKey(a, b) {
  return a < b
    ? `${a}:${b}`
    : `${b}:${a}`;
}

export function buildMenascoThreeBallPresentation({
  menasco,
  regions,
  gridCount = 24,
}) {
  if (
    !menasco?.valid ||
    !regions?.valid
  ) {
    return {
      valid: false,
      faces: [],
      points: [],
      audit: null,
    };
  }

  const extent =
    menasco.bounds.extent;

  const pad =
    extent * 0.18;

  const depth =
    extent * 0.52;

  const minX =
    menasco.bounds.minX - pad;

  const maxX =
    menasco.bounds.maxX + pad;

  const minY =
    menasco.bounds.minY - pad;

  const maxY =
    menasco.bounds.maxY + pad;

  function surfaceZ(
    x,
    y,
    sign
  ) {
    let z =
      menasco.planeZ;

    for (
      const crossing
      of menasco.crossings
    ) {
      const dx =
        x - crossing.x;

      const dy =
        y - crossing.y;

      const r2 =
        dx * dx +
        dy * dy;

      const R2 =
        menasco.bubbleRadius **
        2;

      if (r2 >= R2) {
        continue;
      }

      const h =
        Math.sqrt(
          Math.max(
            0,
            R2 - r2
          )
        );

      z =
        sign > 0
          ? Math.max(
              z,
              menasco.planeZ + h
            )
          : Math.min(
              z,
              menasco.planeZ - h
            );
    }

    return z;
  }

  function buildBall(
    owner,
    sign,
    fill
  ) {
    const vertices = [];

    const indexByKey =
      new Map();

    const indexedFaces =
      [];

    function vertex(
      i,
      j,
      layer
    ) {
      const key =
        `${layer}:${i}:${j}`;

      const cached =
        indexByKey.get(key);

      if (
        cached !== undefined
      ) {
        return cached;
      }

      const x =
        minX +
        (
          maxX - minX
        ) *
          i /
          gridCount;

      const y =
        minY +
        (
          maxY - minY
        ) *
          j /
          gridCount;

      const z =
        layer === "inner"
          ? surfaceZ(
              x,
              y,
              sign
            )
          : menasco.planeZ +
            sign * depth;

      const index =
        vertices.length;

      vertices.push({
        x,
        y,
        z,
      });

      indexByKey.set(
        key,
        index
      );

      return index;
    }

    function triangle(
      a,
      b,
      c,
      kind
    ) {
      indexedFaces.push({
        indices: [
          a,
          b,
          c,
        ],
        kind,
      });
    }

    function quad(
      a,
      b,
      c,
      d,
      kind
    ) {
      triangle(
        a,
        b,
        c,
        kind
      );

      triangle(
        a,
        c,
        d,
        kind
      );
    }

    /*
     * Inner Menasco surface and
     * distant display cap.
     */
    for (
      let j = 0;
      j < gridCount;
      j += 1
    ) {
      for (
        let i = 0;
        i < gridCount;
        i += 1
      ) {
        const i00 =
          vertex(
            i,
            j,
            "inner"
          );

        const i10 =
          vertex(
            i + 1,
            j,
            "inner"
          );

        const i11 =
          vertex(
            i + 1,
            j + 1,
            "inner"
          );

        const i01 =
          vertex(
            i,
            j + 1,
            "inner"
          );

        const c00 =
          vertex(
            i,
            j,
            "cap"
          );

        const c10 =
          vertex(
            i + 1,
            j,
            "cap"
          );

        const c11 =
          vertex(
            i + 1,
            j + 1,
            "cap"
          );

        const c01 =
          vertex(
            i,
            j + 1,
            "cap"
          );

        quad(
          i00,
          i10,
          i11,
          i01,
          "inner"
        );

        quad(
          c00,
          c01,
          c11,
          c10,
          "cap"
        );
      }
    }

    /*
     * Four finite display walls.
     */
    for (
      let i = 0;
      i < gridCount;
      i += 1
    ) {
      quad(
        vertex(
          i,
          0,
          "inner"
        ),
        vertex(
          i + 1,
          0,
          "inner"
        ),
        vertex(
          i + 1,
          0,
          "cap"
        ),
        vertex(
          i,
          0,
          "cap"
        ),
        "wall"
      );

      quad(
        vertex(
          i,
          gridCount,
          "inner"
        ),
        vertex(
          i,
          gridCount,
          "cap"
        ),
        vertex(
          i + 1,
          gridCount,
          "cap"
        ),
        vertex(
          i + 1,
          gridCount,
          "inner"
        ),
        "wall"
      );
    }

    for (
      let j = 0;
      j < gridCount;
      j += 1
    ) {
      quad(
        vertex(
          0,
          j,
          "inner"
        ),
        vertex(
          0,
          j,
          "cap"
        ),
        vertex(
          0,
          j + 1,
          "cap"
        ),
        vertex(
          0,
          j + 1,
          "inner"
        ),
        "wall"
      );

      quad(
        vertex(
          gridCount,
          j,
          "inner"
        ),
        vertex(
          gridCount,
          j + 1,
          "inner"
        ),
        vertex(
          gridCount,
          j + 1,
          "cap"
        ),
        vertex(
          gridCount,
          j,
          "cap"
        ),
        "wall"
      );
    }

    /*
     * Audit the finite closed shell.
     */
    const edges =
      new Set();

    for (
      const face
      of indexedFaces
    ) {
      const [
        a,
        b,
        c,
      ] =
        face.indices;

      edges.add(
        edgeKey(a, b)
      );

      edges.add(
        edgeKey(b, c)
      );

      edges.add(
        edgeKey(c, a)
      );
    }

    const chi =
      vertices.length -
      edges.size +
      indexedFaces.length;

    return {
      audit: {
        owner,

        vertexCount:
          vertices.length,

        edgeCount:
          edges.size,

        faceCount:
          indexedFaces.length,

        eulerCharacteristic:
          chi,

        sphereBoundary:
          chi === 2,
      },

      points:
        vertices,

      faces:
        indexedFaces.map(
          (
            face,
            faceIndex
          ) => ({
            key:
              `menasco-ball-${owner}-${faceIndex}`,

            owner,

            kind:
              face.kind,

            fill,

            opacity:
              face.kind ===
              "inner"
                ? 0.24
                : face.kind ===
                    "wall"
                  ? 0.12
                  : 0.075,

            points:
              face.indices.map(
                (index) =>
                  vertices[index]
              ),
          })
        ),
    };
  }

  const A =
    buildBall(
      "A",
      1,
      "#77bfff"
    );

  const B =
    buildBall(
      "B",
      -1,
      "#c89cff"
    );

  /*
   * Figure-eight projection graph:
   *
   * V = 4 crossings
   * E = 8 diagram arcs
   * F = 6 regions
   *
   * V - E + F = 2.
   */
  const diagramChi =
    menasco.crossings.length -
    regions.arcs.length +
    regions.regions.length;

  const valid =
    diagramChi === 2 &&
    A.audit.sphereBoundary &&
    B.audit.sphereBoundary;

  return {
    valid,

    faces: [
      ...A.faces,
      ...B.faces,
    ],

    points: [
      ...A.points,
      ...B.points,
    ],

    audit: {
      valid,

      crossingCount:
        menasco.crossings.length,

      diagramArcCount:
        regions.arcs.length,

      diagramRegionCount:
        regions.regions.length,

      diagramEulerCharacteristic:
        diagramChi,

      A:
        A.audit,

      B:
        B.audit,
    },
  };
}
