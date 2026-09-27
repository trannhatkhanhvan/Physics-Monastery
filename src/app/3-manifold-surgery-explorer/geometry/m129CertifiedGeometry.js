function invariant(condition, message) {
  if (!condition) {
    throw new Error(
      `m129 certified geometry: ${message}`
    );
  }
}

function localVertexKey(
  tetrahedron,
  vertex
) {
  return `${tetrahedron}:${vertex}`;
}

function cuspHalfEdgeKey(
  tetrahedron,
  idealVertex,
  face
) {
  return (
    `${tetrahedron}:` +
    `${idealVertex}:` +
    `${face}`
  );
}


export function buildM129CertifiedGeometry(
  m129State
) {
  invariant(
    m129State.manifold.id === "m129",
    "expected manifold id m129"
  );

  invariant(
    m129State.manifold.isometry_signature ===
      "eLPkbdcddhgggb",
    "unexpected isometry signature"
  );

  invariant(
    m129State.manifold.tetrahedron_count === 4,
    "expected four ideal tetrahedra"
  );

  invariant(
    m129State.manifold.cusp_count === 2,
    "expected two cusps"
  );

  invariant(
    m129State.ideal_vertex_orbits.length === 2,
    "expected two ideal-vertex orbits"
  );

  invariant(
    m129State
      .certified_operations
      .fill_crossing_circle_to_m004
      .certified === true,
    "return filling is not certified"
  );


  /*
   * ------------------------------------------------------------
   * Local ideal vertex -> cusp lookup
   * ------------------------------------------------------------
   */

  const cuspIndexByLocalVertex =
    new Map();

  m129State
    .ideal_vertex_orbits
    .forEach(
      (orbit, cuspIndex) => {
        orbit.forEach(
          ({
            tetrahedron,
            vertex,
          }) => {
            const key =
              localVertexKey(
                tetrahedron,
                vertex
              );

            invariant(
              !cuspIndexByLocalVertex.has(
                key
              ),
              `duplicate local ideal vertex ${key}`
            );

            cuspIndexByLocalVertex.set(
              key,
              cuspIndex
            );
          }
        );
      }
    );

  invariant(
    cuspIndexByLocalVertex.size === 16,
    "expected sixteen local ideal vertices"
  );


  /*
   * ------------------------------------------------------------
   * Sixteen truncation triangles:
   *
   * 4 tetrahedra x 4 ideal vertices.
   * ------------------------------------------------------------
   */

  const cuspTriangles =
    [];

  for (
    let tetrahedron = 0;
    tetrahedron < 4;
    tetrahedron += 1
  ) {
    for (
      let idealVertex = 0;
      idealVertex < 4;
      idealVertex += 1
    ) {
      const cuspIndex =
        cuspIndexByLocalVertex.get(
          localVertexKey(
            tetrahedron,
            idealVertex
          )
        );

      invariant(
        cuspIndex !== undefined,
        (
          "missing cusp assignment for " +
          `${tetrahedron}:${idealVertex}`
        )
      );

      cuspTriangles.push(
        Object.freeze({
          id:
            `T${tetrahedron}V${idealVertex}`,

          tetrahedron,
          idealVertex,
          cuspIndex,

          cuspRole:
            m129State
              .cusps[
                cuspIndex
              ]
              .role,

          cornerVertices:
            Object.freeze(
              [0, 1, 2, 3].filter(
                (vertex) =>
                  vertex !==
                  idealVertex
              )
            ),
        })
      );
    }
  }

  const cuspTrianglesByCusp =
    [0, 1].map(
      (cuspIndex) =>
        Object.freeze(
          cuspTriangles.filter(
            (triangle) =>
              triangle.cuspIndex ===
              cuspIndex
          )
        )
    );

  invariant(
    cuspTriangles.length === 16,
    "expected sixteen cusp triangles"
  );

  invariant(
    cuspTrianglesByCusp[0].length === 8,
    "cusp 0 should have eight triangles"
  );

  invariant(
    cuspTrianglesByCusp[1].length === 8,
    "cusp 1 should have eight triangles"
  );


  /*
   * ------------------------------------------------------------
   * Tetrahedron face-gluing lookup
   * ------------------------------------------------------------
   */

  const gluingByTetFace =
    new Map();

  m129State
    .face_gluings
    .forEach(
      ({
        tetrahedron,
        faces,
      }) => {
        faces.forEach(
          (faceRecord) => {
            gluingByTetFace.set(
              `${tetrahedron}:${faceRecord.face}`,
              faceRecord
            );
          }
        );
      }
    );

  invariant(
    gluingByTetFace.size === 16,
    "expected sixteen face-gluing records"
  );


  /*
   * ------------------------------------------------------------
   * Induced cusp-edge pairings.
   *
   * A cusp-triangle edge at ideal vertex v lying in face f
   * maps under tetrahedron face permutation p to
   *
   *   v -> p(v)
   *   f -> p(f)
   *
   * in the neighboring tetrahedron.
   * ------------------------------------------------------------
   */

  const pairMap =
    new Map();

  for (
    let tetrahedron = 0;
    tetrahedron < 4;
    tetrahedron += 1
  ) {
    for (
      let idealVertex = 0;
      idealVertex < 4;
      idealVertex += 1
    ) {
      const sourceCuspIndex =
        cuspIndexByLocalVertex.get(
          localVertexKey(
            tetrahedron,
            idealVertex
          )
        );

      for (
        let face = 0;
        face < 4;
        face += 1
      ) {
        if (
          face === idealVertex
        ) {
          continue;
        }

        const gluing =
          gluingByTetFace.get(
            `${tetrahedron}:${face}`
          );

        invariant(
          gluing,
          (
            "missing gluing at " +
            `${tetrahedron}:${face}`
          )
        );

        const permutation =
          gluing.vertex_permutation;

        invariant(
          Array.isArray(
            permutation
          ) &&
          permutation.length === 4,
          "invalid vertex permutation"
        );

        const targetTetrahedron =
          gluing
            .neighbor_tetrahedron;

        const targetIdealVertex =
          permutation[
            idealVertex
          ];

        const targetFace =
          permutation[
            face
          ];

        const targetCuspIndex =
          cuspIndexByLocalVertex.get(
            localVertexKey(
              targetTetrahedron,
              targetIdealVertex
            )
          );

        invariant(
          sourceCuspIndex ===
            targetCuspIndex,
          (
            "face gluing crossed cusp orbits at " +
            `${tetrahedron}:${idealVertex}:${face}`
          )
        );

        const sourceKey =
          cuspHalfEdgeKey(
            tetrahedron,
            idealVertex,
            face
          );

        const targetKey =
          cuspHalfEdgeKey(
            targetTetrahedron,
            targetIdealVertex,
            targetFace
          );

        const canonicalKey =
          [
            sourceKey,
            targetKey,
          ]
            .sort()
            .join("|");

        if (
          pairMap.has(
            canonicalKey
          )
        ) {
          continue;
        }

        pairMap.set(
          canonicalKey,
          Object.freeze({
            id:
              `E${pairMap.size}`,

            cuspIndex:
              sourceCuspIndex,

            cuspRole:
              m129State
                .cusps[
                  sourceCuspIndex
                ]
                .role,

            first:
              Object.freeze({
                tetrahedron,
                idealVertex,
                face,
              }),

            second:
              Object.freeze({
                tetrahedron:
                  targetTetrahedron,

                idealVertex:
                  targetIdealVertex,

                face:
                  targetFace,
              }),
          })
        );
      }
    }
  }

  const cuspEdgePairs =
    Array.from(
      pairMap.values()
    );

  const cuspEdgePairsByCusp =
    [0, 1].map(
      (cuspIndex) =>
        Object.freeze(
          cuspEdgePairs.filter(
            (pair) =>
              pair.cuspIndex ===
              cuspIndex
          )
        )
    );

  invariant(
    cuspEdgePairs.length === 24,
    (
      "expected 24 cusp edge pairs, got " +
      cuspEdgePairs.length
    )
  );

  invariant(
    cuspEdgePairsByCusp[0].length === 12,
    "cusp 0 should have twelve edge pairs"
  );

  invariant(
    cuspEdgePairsByCusp[1].length === 12,
    "cusp 1 should have twelve edge pairs"
  );


  /*
   * ------------------------------------------------------------
   * Hyperbolic tetrahedron shapes
   * ------------------------------------------------------------
   */

  const tetrahedronShapes =
    m129State
      .tetrahedron_shapes
      .map(
        ({
          tetrahedron,
          z,
        }) =>
          Object.freeze({
            tetrahedron,

            z:
              Object.freeze({
                re:
                  Number(
                    z.real
                  ),

                im:
                  Number(
                    z.imag
                  ),
              }),
          })
      );

  tetrahedronShapes.forEach(
    ({
      tetrahedron,
      z,
    }) => {
      invariant(
        Number.isFinite(
          z.re
        ) &&
        Number.isFinite(
          z.im
        ) &&
        z.im > 0,
        (
          "invalid tetrahedron shape " +
          `at tetrahedron ${tetrahedron}`
        )
      );
    }
  );


  /*
   * ------------------------------------------------------------
   * Euclidean cusp shapes
   * ------------------------------------------------------------
   */

  const cuspShapes =
    m129State
      .cusps
      .map(
        (cusp) =>
          Object.freeze({
            index:
              cusp.index,

            role:
              cusp.role,

            tau:
              Object.freeze({
                re:
                  Number(
                    cusp
                      .shape
                      .real
                  ),

                im:
                  Number(
                    cusp
                      .shape
                      .imag
                  ),
              }),
          })
      );


  const returnFilling =
    m129State
      .certified_operations
      .fill_crossing_circle_to_m004;


  return Object.freeze({
    manifoldId:
      m129State
        .manifold
        .id,

    isometrySignature:
      m129State
        .manifold
        .isometry_signature,

    tetrahedronCount:
      m129State
        .manifold
        .tetrahedron_count,

    cuspCount:
      m129State
        .manifold
        .cusp_count,

    tetrahedronShapes:
      Object.freeze(
        tetrahedronShapes
      ),

    cuspShapes:
      Object.freeze(
        cuspShapes
      ),

    cuspTriangles:
      Object.freeze(
        cuspTriangles
      ),

    cuspTrianglesByCusp:
      Object.freeze(
        cuspTrianglesByCusp
      ),

    cuspEdgePairs:
      Object.freeze(
        cuspEdgePairs
      ),

    cuspEdgePairsByCusp:
      Object.freeze(
        cuspEdgePairsByCusp
      ),

    directedSurgery:
      Object.freeze({
        survivingKnotCusp:
          m129State
            .directed_marking
            .surviving_knot_cusp,

        crossingCircleCusp:
          m129State
            .directed_marking
            .crossing_circle_cusp,

        returnFilling:
          Object.freeze({
            cusp:
              returnFilling
                .filled_cusp,

            slope:
              Object.freeze([
                ...returnFilling
                  .slope
              ]),

            resultIsometrySignature:
              returnFilling
                .result_isometry_signature,

            certified:
              returnFilling
                .certified,
          }),
      }),
  });
}
