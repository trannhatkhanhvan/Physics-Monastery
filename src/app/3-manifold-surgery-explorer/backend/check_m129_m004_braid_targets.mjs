import {
  M129_WHITEHEAD_BRAID_WORD,
  M004_FIGURE_EIGHT_BRAID_WORD,
  braidPermutationForWord,
  braidCyclesForWord,
  figureEightBraidS3CenterlinePoint,
} from "../geometry/m129S3Centerlines.js";


function norm4(point) {
  return Math.hypot(
    point[0],
    point[1],
    point[2],
    point[3]
  );
}


console.log(
  "=".repeat(72)
);

console.log(
  "m129 -> m004 BRAID TARGET CERTIFICATION"
);

console.log(
  "=".repeat(72)
);

console.log();

console.log(
  "Whitehead word:",
  M129_WHITEHEAD_BRAID_WORD
);

console.log(
  "Whitehead permutation:",
  braidPermutationForWord(
    M129_WHITEHEAD_BRAID_WORD
  )
);

console.log(
  "Whitehead cycles:",
  braidCyclesForWord(
    M129_WHITEHEAD_BRAID_WORD
  )
);

console.log();

console.log(
  "Figure-eight word:",
  M004_FIGURE_EIGHT_BRAID_WORD
);

console.log(
  "Figure-eight permutation:",
  braidPermutationForWord(
    M004_FIGURE_EIGHT_BRAID_WORD
  )
);

console.log(
  "Figure-eight cycles:",
  braidCyclesForWord(
    M004_FIGURE_EIGHT_BRAID_WORD
  )
);


const sampleCount = 4096;

let maximumNormError = 0;


for (
  let index = 0;
  index < sampleCount;
  index += 1
) {
  const t =
    2 *
    Math.PI *
    index /
    sampleCount;

  const point =
    figureEightBraidS3CenterlinePoint(
      t
    );

  maximumNormError =
    Math.max(
      maximumNormError,
      Math.abs(
        norm4(point) -
        1
      )
    );
}


console.log();

console.log(
  "maximum figure-eight S^3 norm error:",
  maximumNormError
);


const whiteheadCycles =
  braidCyclesForWord(
    M129_WHITEHEAD_BRAID_WORD
  );

const figureEightCycles =
  braidCyclesForWord(
    M004_FIGURE_EIGHT_BRAID_WORD
  );


if (
  whiteheadCycles.length !== 2
) {
  throw new Error(
    "Whitehead target must have exactly two components."
  );
}


if (
  figureEightCycles.length !== 1 ||
  figureEightCycles[0].length !== 3
) {
  throw new Error(
    "Figure-eight target must be one three-strand closure cycle."
  );
}


if (
  maximumNormError > 1e-12
) {
  throw new Error(
    "Figure-eight braid centerline left S^3."
  );
}


console.log();

console.log(
  "BRAID TARGETS CERTIFIED"
);
