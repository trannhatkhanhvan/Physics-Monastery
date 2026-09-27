import fs
  from "node:fs";

import {
  buildM129CertifiedGeometry,
} from "../geometry/m129CertifiedGeometry.js";


const jsonUrl =
  new URL(
    "../data/generated/m129_certified_state.json",
    import.meta.url
  );

const m129State =
  JSON.parse(
    fs.readFileSync(
      jsonUrl,
      "utf8"
    )
  );

const geometry =
  buildM129CertifiedGeometry(
    m129State
  );


console.log(
  "m129:",
  geometry.isometrySignature
);

console.log(
  "tetrahedra:",
  geometry.tetrahedronCount
);

console.log(
  "cusps:",
  geometry.cuspCount
);

console.log(
  "cusp triangles:",
  geometry.cuspTriangles.length
);

console.log(
  "triangles per cusp:",
  geometry
    .cuspTrianglesByCusp
    .map(
      (triangles) =>
        triangles.length
    )
);

console.log(
  "cusp edge pairs:",
  geometry.cuspEdgePairs.length
);

console.log(
  "edge pairs per cusp:",
  geometry
    .cuspEdgePairsByCusp
    .map(
      (pairs) =>
        pairs.length
    )
);

console.log(
  "tetrahedron shapes:",
  geometry
    .tetrahedronShapes
    .map(
      ({ z }) =>
        `${z.re} + ${z.im}i`
    )
);

console.log(
  "cusp shapes:",
  geometry
    .cuspShapes
    .map(
      ({ tau }) =>
        `${tau.re} + ${tau.im}i`
    )
);

console.log(
  "return filling:",
  geometry
    .directedSurgery
    .returnFilling
);

console.log(
  "M129 FRONTEND GEOMETRY CERTIFIED"
);
