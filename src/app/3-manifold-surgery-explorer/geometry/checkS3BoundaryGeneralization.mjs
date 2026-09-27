import {
  DEFAULT_FIGURE_EIGHT_S3_GEOMETRY,
  buildFigureEightS3Tube,
  figureEightS3CenterlinePoint,
  sampleFigureEightS3TubePoint4,
  stereographicFigureEightS3Point,
} from "../../figure-eight-complement/figureEightS3Geometry.js";

import {
  buildS3Tube,
  sampleS3TubePoint4,
  stereographicS3Point,
} from "./s3BoundaryGeometry.js";


const geometry =
  DEFAULT_FIGURE_EIGHT_S3_GEOMETRY;

const NU = 144;
const NV = 32;


function maxArrayDifference(
  first,
  second
) {
  if (
    first.length !==
    second.length
  ) {
    throw new Error(
      `Array length mismatch: ${first.length} vs ${second.length}`
    );
  }

  let maximum = 0;

  for (
    let index = 0;
    index < first.length;
    index += 1
  ) {
    maximum =
      Math.max(
        maximum,
        Math.abs(
          Number(
            first[index]
          ) -
          Number(
            second[index]
          )
        )
      );
  }

  return maximum;
}


function flattenVectors(
  vectors
) {
  return vectors.flatMap(
    (vector) =>
      Array.from(
        vector
      )
  );
}


const oldTube =
  buildFigureEightS3Tube(
    NU,
    NV,
    geometry
  );


const genericTube =
  buildS3Tube({
    centerlinePoint:
      (t) =>
        figureEightS3CenterlinePoint(
          t,
          geometry.lambda,
          geometry.epsilon
        ),

    nu:
      NU,

    nv:
      NV,

    rho:
      geometry.rho,
  });


const vertexDifference =
  maxArrayDifference(
    oldTube.vertices,
    genericTube.vertices
  );

const indexDifference =
  maxArrayDifference(
    oldTube.indices,
    genericTube.indices
  );

const centerlineDifference =
  maxArrayDifference(
    flattenVectors(
      oldTube.centerline
    ),
    flattenVectors(
      genericTube.centerline
    )
  );

const normal1Difference =
  maxArrayDifference(
    flattenVectors(
      oldTube.normal1
    ),
    flattenVectors(
      genericTube.normal1
    )
  );

const normal2Difference =
  maxArrayDifference(
    flattenVectors(
      oldTube.normal2
    ),
    flattenVectors(
      genericTube.normal2
    )
  );


let sampleDifference = 0;

const samples = [
  [0, 0],
  [0.125, 0.25],
  [0.25, 0.5],
  [0.4375, 0.8125],
  [0.73, -0.2],
  [0.999, 1.15],
];

for (
  const [
    route,
    minor,
  ]
  of samples
) {
  const oldPoint =
    sampleFigureEightS3TubePoint4(
      oldTube,
      route,
      minor
    );

  const genericPoint =
    sampleS3TubePoint4(
      genericTube,
      route,
      minor
    );

  sampleDifference =
    Math.max(
      sampleDifference,
      maxArrayDifference(
        oldPoint,
        genericPoint
      )
    );
}


let projectionDifference = 0;

const projection = {
  xw: 0,
  yw: 90,
  zw: 180,
};

for (
  const [
    route,
    minor,
  ]
  of samples
) {
  const oldPoint4 =
    sampleFigureEightS3TubePoint4(
      oldTube,
      route,
      minor
    );

  const genericPoint4 =
    sampleS3TubePoint4(
      genericTube,
      route,
      minor
    );

  const oldPoint3 =
    stereographicFigureEightS3Point(
      oldPoint4,
      projection
    );

  const genericPoint3 =
    stereographicS3Point(
      genericPoint4,
      projection
    );

  projectionDifference =
    Math.max(
      projectionDifference,
      maxArrayDifference(
        oldPoint3,
        genericPoint3
      )
    );
}


console.log(
  "=".repeat(72)
);

console.log(
  "S^3 BOUNDARY GENERALIZATION — m004 REGRESSION TEST"
);

console.log(
  "=".repeat(72)
);

console.log();

console.log(
  "old tube:",
  {
    nu: oldTube.nu,
    nv: oldTube.nv,
    vertexCount:
      oldTube.vertexCount,
  }
);

console.log(
  "generic tube:",
  {
    nu: genericTube.nu,
    nv: genericTube.nv,
    vertexCount:
      genericTube.vertexCount,
  }
);

console.log();

console.log(
  "maximum differences"
);

console.log(
  "  centerline:",
  centerlineDifference
);

console.log(
  "  normal1:",
  normal1Difference
);

console.log(
  "  normal2:",
  normal2Difference
);

console.log(
  "  vertices:",
  vertexDifference
);

console.log(
  "  indices:",
  indexDifference
);

console.log(
  "  arbitrary tube samples:",
  sampleDifference
);

console.log(
  "  stereographic projections:",
  projectionDifference
);


const tolerance =
  1e-12;

const certified =
  centerlineDifference <=
    tolerance &&
  normal1Difference <=
    tolerance &&
  normal2Difference <=
    tolerance &&
  vertexDifference <=
    tolerance &&
  indexDifference ===
    0 &&
  sampleDifference <=
    tolerance &&
  projectionDifference <=
    tolerance;


console.log();

if (
  !certified
) {
  throw new Error(
    "Generic S^3 engine does not exactly reproduce the established m004 implementation."
  );
}


console.log(
  "GENERIC S^3 BOUNDARY ENGINE CERTIFIED AGAINST m004"
);
