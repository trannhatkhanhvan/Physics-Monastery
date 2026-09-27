import {
  m129BoundaryPoint4,
  m129BoundaryTriangles4,
  m129CertifiedCuspTranslations,
  m129PeripheralCoordinates,
} from "./m129BoundarySpec.js";


function norm4(
  point
) {
  return Math.sqrt(
    point.reduce(
      (
        total,
        value
      ) =>
        total +
        value *
          value,
      0
    )
  );
}


function distance4(
  first,
  second
) {
  return Math.sqrt(
    first.reduce(
      (
        total,
        value,
        index
      ) =>
        total +
        (
          value -
          second[index]
        ) ** 2,
      0
    )
  );
}


function addComplex(
  first,
  second
) {
  return {
    re:
      first.re +
      second.re,

    im:
      first.im +
      second.im,
  };
}


const triangles =
  m129BoundaryTriangles4();

const translations =
  m129CertifiedCuspTranslations();


console.log(
  "=".repeat(
    72
  )
);

console.log(
  "m129 CERTIFIED CUSP -> S^3 BOUNDARY MAPPING"
);

console.log(
  "=".repeat(
    72
  )
);

console.log();


if (
  triangles.length !==
  16
) {
  throw new Error(
    `Expected 16 cusp triangles, found ${triangles.length}.`
  );
}


const countsByCusp =
  [
    0,
    0,
  ];

let maximumNormError =
  0;


for (
  const triangle
  of triangles
) {
  countsByCusp[
    triangle.cusp
  ] += 1;

  if (
    triangle.points4.length !==
    3
  ) {
    throw new Error(
      `${triangle.id} does not have three S^3 vertices.`
    );
  }

  for (
    const point
    of triangle.points4
  ) {
    maximumNormError =
      Math.max(
        maximumNormError,
        Math.abs(
          norm4(
            point
          ) -
          1
        )
      );
  }
}


console.log(
  "triangles:",
  triangles.length
);

console.log(
  "triangles by cusp:",
  countsByCusp
);

console.log(
  "maximum mapped S^3 norm error:",
  maximumNormError
);


if (
  countsByCusp[0] !==
    8 ||
  countsByCusp[1] !==
    8
) {
  throw new Error(
    "Expected 8 triangles on each m129 cusp."
  );
}


if (
  maximumNormError >
  1e-12
) {
  throw new Error(
    "Mapped cusp point left S^3."
  );
}


/*
 * Verify the certified peripheral bases themselves:
 *
 *   M -> (1,0)
 *   L -> (0,1)
 */
for (
  const record
  of translations
) {
  const cusp =
    record.cusp;

  const meridianCoordinates =
    m129PeripheralCoordinates(
      cusp,
      record.meridian
    );

  const longitudeCoordinates =
    m129PeripheralCoordinates(
      cusp,
      record.longitude
    );


  console.log();

  console.log(
    `cusp ${cusp} meridian coordinates:`,
    meridianCoordinates
  );

  console.log(
    `cusp ${cusp} longitude coordinates:`,
    longitudeCoordinates
  );


  const basisTolerance =
    1e-12;

  if (
    Math.abs(
      meridianCoordinates
        .meridian -
      1
    ) >
      basisTolerance ||
    Math.abs(
      meridianCoordinates
        .longitude
    ) >
      basisTolerance
  ) {
    throw new Error(
      `Cusp ${cusp} meridian basis inversion failed.`
    );
  }


  if (
    Math.abs(
      longitudeCoordinates
        .meridian
    ) >
      basisTolerance ||
    Math.abs(
      longitudeCoordinates
        .longitude -
      1
    ) >
      basisTolerance
  ) {
    throw new Error(
      `Cusp ${cusp} longitude basis inversion failed.`
    );
  }
}


/*
 * Periodicity test.
 *
 * A developed point and that point translated by one
 * meridian or one longitude must land on exactly the same
 * boundary torus point because the generic tube sampler
 * works modulo one turn in both material directions.
 */

let maximumMeridianClosureError =
  0;

let maximumLongitudeClosureError =
  0;


for (
  const triangle
  of triangles
) {
  const translation =
    translations.find(
      (record) =>
        record.cusp ===
        triangle.cusp
    );

  for (
    const point
    of triangle.developedPoints
  ) {
    const basePoint = {
      re:
        point.re,

      im:
        point.im,
    };

    const base =
      m129BoundaryPoint4(
        triangle.cusp,
        basePoint
      );

    const meridianShifted =
      m129BoundaryPoint4(
        triangle.cusp,
        addComplex(
          basePoint,
          translation.meridian
        )
      );

    const longitudeShifted =
      m129BoundaryPoint4(
        triangle.cusp,
        addComplex(
          basePoint,
          translation.longitude
        )
      );


    maximumMeridianClosureError =
      Math.max(
        maximumMeridianClosureError,
        distance4(
          base,
          meridianShifted
        )
      );

    maximumLongitudeClosureError =
      Math.max(
        maximumLongitudeClosureError,
        distance4(
          base,
          longitudeShifted
        )
      );
  }
}


console.log();

console.log(
  "maximum meridian closure error:",
  maximumMeridianClosureError
);

console.log(
  "maximum longitude closure error:",
  maximumLongitudeClosureError
);


const closureTolerance =
  1e-10;


if (
  maximumMeridianClosureError >
    closureTolerance ||
  maximumLongitudeClosureError >
    closureTolerance
) {
  throw new Error(
    "Peripheral lattice does not close on the S^3 boundary tubes."
  );
}


console.log();

console.log(
  "m129 CUSP MATERIAL COORDINATES CLOSE EXACTLY ON THE GENERIC S^3 TUBES"
);

console.log(
  "16 CERTIFIED TRIANGLES ARE READY FOR BOUNDARY RENDERING"
);
