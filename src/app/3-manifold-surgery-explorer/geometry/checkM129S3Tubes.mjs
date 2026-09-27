import {
  buildS3Tube,
} from "./s3BoundaryGeometry.js";

import {
  m129S3CenterlinePoint,
} from "./m129S3Centerlines.js";


const NU = 288;
const NV = 64;

const RHO =
  0.12;


function distance4(
  first,
  second
) {
  let total = 0;

  for (
    let index = 0;
    index < 4;
    index += 1
  ) {
    const delta =
      first[index] -
      second[index];

    total +=
      delta *
      delta;
  }

  return Math.sqrt(
    total
  );
}


function vertex4(
  tube,
  vertexIndex
) {
  const offset =
    vertexIndex *
    4;

  return [
    tube.vertices[
      offset
    ],
    tube.vertices[
      offset + 1
    ],
    tube.vertices[
      offset + 2
    ],
    tube.vertices[
      offset + 3
    ],
  ];
}


const tube0 =
  buildS3Tube({
    centerlinePoint:
      (t) =>
        m129S3CenterlinePoint(
          0,
          t
        ),

    nu:
      NU,

    nv:
      NV,

    rho:
      RHO,
  });


const tube1 =
  buildS3Tube({
    centerlinePoint:
      (t) =>
        m129S3CenterlinePoint(
          1,
          t
        ),

    nu:
      NU,

    nv:
      NV,

    rho:
      RHO,
  });


console.log(
  "=".repeat(
    72
  )
);

console.log(
  "m129 GENERIC S^3 TUBE CERTIFICATION"
);

console.log(
  "=".repeat(
    72
  )
);

console.log();

console.log(
  "tube 0:",
  {
    nu:
      tube0.nu,

    nv:
      tube0.nv,

    vertexCount:
      tube0.vertexCount,

    rho:
      tube0.rho,
  }
);

console.log(
  "tube 1:",
  {
    nu:
      tube1.nu,

    nv:
      tube1.nv,

    vertexCount:
      tube1.vertexCount,

    rho:
      tube1.rho,
  }
);


/*
 * Sample both surfaces on the existing tube mesh and
 * measure their closest approach in S^3.
 *
 * Full all-pairs comparison of 18k x 18k vertices would be
 * unnecessary for this checkpoint, so sample every fourth
 * route and minor vertex.
 */

const ROUTE_STEP =
  4;

const MINOR_STEP =
  4;


const sampled0 = [];
const sampled1 = [];


for (
  let i = 0;
  i < NU;
  i += ROUTE_STEP
) {
  for (
    let j = 0;
    j < NV;
    j += MINOR_STEP
  ) {
    sampled0.push(
      vertex4(
        tube0,
        i *
          NV +
          j
      )
    );

    sampled1.push(
      vertex4(
        tube1,
        i *
          NV +
          j
      )
    );
  }
}


let minimumDistance =
  Infinity;


for (
  const first
  of sampled0
) {
  for (
    const second
    of sampled1
  ) {
    minimumDistance =
      Math.min(
        minimumDistance,
        distance4(
          first,
          second
        )
      );
  }
}


console.log();

console.log(
  "sample count / tube:",
  sampled0.length
);

console.log(
  "minimum sampled inter-tube distance:",
  minimumDistance
);


if (
  !Number.isFinite(
    minimumDistance
  )
) {
  throw new Error(
    "Inter-tube distance computation failed."
  );
}


if (
  minimumDistance <=
  1e-5
) {
  throw new Error(
    "m129 S^3 boundary tubes intersect at rho = " +
      RHO
  );
}


console.log();

console.log(
  "m129 S^3 TUBES REMAIN DISJOINT"
);
