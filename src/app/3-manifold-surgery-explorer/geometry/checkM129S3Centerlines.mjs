import {
  M129_WHITEHEAD_BRAID_WORD,
  m129BraidPermutation,
  m129S3CenterlineCycles,
  m129S3CenterlinePoint,
} from "./m129S3Centerlines.js";


function norm4(
  point
) {
  return Math.sqrt(
    point.reduce(
      (
        sum,
        value
      ) =>
        sum +
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
        sum,
        value,
        index
      ) =>
        sum +
        (
          value -
          second[index]
        ) ** 2,
      0
    )
  );
}


const expectedWord =
  [
    1,
    -2,
    1,
    -2,
    -2,
  ];


if (
  JSON.stringify(
    M129_WHITEHEAD_BRAID_WORD
  ) !==
  JSON.stringify(
    expectedWord
  )
) {
  throw new Error(
    "Whitehead braid word changed."
  );
}


const permutation =
  m129BraidPermutation();

const cycles =
  m129S3CenterlineCycles();


const SAMPLE_COUNT =
  4096;


let maximumNormError =
  0;

let minimumIntercomponentDistance =
  Infinity;


const samples =
  [
    [],
    [],
  ];


for (
  let component = 0;
  component < 2;
  component += 1
) {
  for (
    let index = 0;
    index < SAMPLE_COUNT;
    index += 1
  ) {
    const t =
      (
        2 *
        Math.PI *
        index
      ) /
      SAMPLE_COUNT;

    const point =
      m129S3CenterlinePoint(
        component,
        t
      );

    samples[
      component
    ].push(
      point
    );

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


for (
  const first
  of samples[0]
) {
  for (
    const second
    of samples[1]
  ) {
    minimumIntercomponentDistance =
      Math.min(
        minimumIntercomponentDistance,
        distance4(
          first,
          second
        )
      );
  }
}


const closureErrors =
  [
    0,
    1,
  ].map(
    (component) =>
      distance4(
        m129S3CenterlinePoint(
          component,
          0
        ),
        m129S3CenterlinePoint(
          component,
          2 *
            Math.PI -
            1e-8
        )
      )
  );


console.log(
  "=".repeat(
    72
  )
);

console.log(
  "m129 WHITEHEAD S^3 CENTERLINE CERTIFICATION"
);

console.log(
  "=".repeat(
    72
  )
);

console.log();

console.log(
  "braid word:",
  M129_WHITEHEAD_BRAID_WORD
);

console.log(
  "permutation:",
  permutation
);

console.log(
  "cycles:",
  cycles
);

console.log();

console.log(
  "maximum S^3 norm error:",
  maximumNormError
);

console.log(
  "closure errors:",
  closureErrors
);

console.log(
  "minimum intercomponent distance:",
  minimumIntercomponentDistance
);


if (
  cycles.length !==
  2
) {
  throw new Error(
    "Expected exactly two components."
  );
}


if (
  maximumNormError >
  1e-12
) {
  throw new Error(
    "Centerline left S^3."
  );
}


if (
  minimumIntercomponentDistance <
  1e-5
) {
  throw new Error(
    "Whitehead components intersect."
  );
}


console.log();

console.log(
  "WHITEHEAD S^3 CENTERLINE SYSTEM PASSED BASIC CERTIFICATION"
);
