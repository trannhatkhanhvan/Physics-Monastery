import {
  M129_WHITEHEAD_BRAID_WORD,
  M004_FIGURE_EIGHT_BRAID_WORD,
  braidCyclesForWord,
  m129SurgeryOpenBraidStrandPoint4,
} from "../geometry/m129S3Centerlines.js";


function norm4(
  point
) {
  return Math.hypot(
    point[0],
    point[1],
    point[2],
    point[3]
  );
}


function distance4(
  first,
  second
) {
  return Math.hypot(
    first[0] - second[0],
    first[1] - second[1],
    first[2] - second[2],
    first[3] - second[3]
  );
}


const surgeryAmounts =
  [
    0,
    0.25,
    0.5,
    0.75,
    1,
  ];

const sampleCount =
  2048;

let maximumNormError =
  0;

let minimumStrandSeparation =
  Infinity;


for (
  const surgeryAmount
  of surgeryAmounts
) {
  for (
    let index = 0;
    index < sampleCount;
    index += 1
  ) {
    const braidAmount =
      index /
      sampleCount;

    const theta =
      2 *
      Math.PI *
      braidAmount;

    const points =
      [0, 1, 2].map(
        (strandLabel) =>
          m129SurgeryOpenBraidStrandPoint4(
            strandLabel,
            braidAmount,
            theta,
            surgeryAmount
          )
      );

    for (
      const point
      of points
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

    for (
      let first = 0;
      first < 3;
      first += 1
    ) {
      for (
        let second =
          first + 1;
        second < 3;
        second += 1
      ) {
        minimumStrandSeparation =
          Math.min(
            minimumStrandSeparation,
            distance4(
              points[first],
              points[second]
            )
          );
      }
    }
  }
}


console.log(
  "=".repeat(
    72
  )
);

console.log(
  "m129 SURGERY OPEN-BRAID CERTIFICATION"
);

console.log(
  "=".repeat(
    72
  )
);

console.log();

console.log(
  "Whitehead cycles:",
  braidCyclesForWord(
    M129_WHITEHEAD_BRAID_WORD
  )
);

console.log(
  "Figure-eight cycles:",
  braidCyclesForWord(
    M004_FIGURE_EIGHT_BRAID_WORD
  )
);

console.log();

console.log(
  "maximum S3 norm error:",
  maximumNormError
);

console.log(
  "minimum open-strand separation:",
  minimumStrandSeparation
);


if (
  maximumNormError >
    1e-12
) {
  throw new Error(
    "Surgery braid left S3."
  );
}


if (
  minimumStrandSeparation <
    1e-5
) {
  throw new Error(
    "Surgery braid strands intersect."
  );
}


console.log();

console.log(
  "SURGERY OPEN-BRAID PATH CERTIFIED"
);
