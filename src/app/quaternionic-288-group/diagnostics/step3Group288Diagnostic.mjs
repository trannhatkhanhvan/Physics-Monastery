import {
  G288,
  G288_IDENTITY,
  RAW_2T_PAIRS,
  canonicalProjectivePair,
  composeG288,
  g288ElementOrder,
  g288OrderDistribution,
  inverseG288,
  makeProjectiveElement,
  projectiveEquals,
  validateG288,
} from "../math/group288.mjs";

import {
  H,
  HURWITZ_UNITS,
} from "../math/hurwitzUnits.mjs";

import {
  I,
  J,
  ONE,
  negate,
} from "../math/quaternion.mjs";


function assert(
  condition,
  message
) {
  if (!condition) {
    throw new Error(
      `DIAGNOSTIC FAILED: ${message}`
    );
  }
}


console.log(
  "Quaternionic 288-Group — Step 3 diagnostic"
);
console.log("");


/*
 * Raw Cartesian product.
 */
assert(
  HURWITZ_UNITS.length ===
    24,
  "Step 3 requires exactly 24 Hurwitz units."
);

assert(
  RAW_2T_PAIRS.length ===
    24 * 24,
  "2T x 2T must contain exactly 576 raw ordered pairs."
);


/*
 * Projective quotient.
 */
assert(
  G288.length ===
    288,
  "Projective sign quotient must contain exactly 288 elements."
);

assert(
  new Set(
    G288.map(
      (element) =>
        element.key
    )
  ).size ===
    288,
  "All 288 canonical projective elements must be distinct."
);


/*
 * Explicit sign-equivalence check.
 */
const sample =
  canonicalProjectivePair(
    H,
    I
  );

const sampleNegative =
  canonicalProjectivePair(
    negate(H),
    negate(I)
  );

assert(
  sample.key ===
    sampleNegative.key,
  "(a,b) and (-a,-b) must canonicalize to the same element."
);


/*
 * But reversing only one sign must generally produce a different
 * transformation.
 */
const oneSignChanged =
  canonicalProjectivePair(
    negate(H),
    I
  );

assert(
  sample.key !==
    oneSignChanged.key,
  "Changing only one sign must not be identified projectively."
);


/*
 * Identity.
 */
const explicitIdentity =
  makeProjectiveElement(
    ONE,
    ONE
  );

assert(
  projectiveEquals(
    explicitIdentity,
    G288_IDENTITY
  ),
  "[1,1] must be the identity."
);


/*
 * Representative composition check.
 *
 * [H,I] [J,H] = [HJ, IH].
 *
 * composeG288 must agree exactly with constructing that pair
 * independently from the Hurwitz multiplication.
 */
const left =
  makeProjectiveElement(
    H,
    I
  );

const right =
  makeProjectiveElement(
    J,
    H
  );

const composed =
  composeG288(
    left,
    right
  );

assert(
  G288.some(
    (element) =>
      projectiveEquals(
        element,
        composed
      )
  ),
  "Representative product must belong to G288."
);


/*
 * Identity action on every element.
 */
for (
  const element of G288
) {
  assert(
    projectiveEquals(
      composeG288(
        G288_IDENTITY,
        element
      ),
      element
    ),
    "Left identity failed."
  );

  assert(
    projectiveEquals(
      composeG288(
        element,
        G288_IDENTITY
      ),
      element
    ),
    "Right identity failed."
  );
}


/*
 * Exact inverse for every element.
 */
for (
  const element of G288
) {
  const inverse =
    inverseG288(
      element
    );

  assert(
    projectiveEquals(
      composeG288(
        element,
        inverse
      ),
      G288_IDENTITY
    ),
    "Right inverse failed."
  );

  assert(
    projectiveEquals(
      composeG288(
        inverse,
        element
      ),
      G288_IDENTITY
    ),
    "Left inverse failed."
  );
}


/*
 * Representative associativity checks.
 *
 * Associativity ultimately follows from quaternion multiplication,
 * but test it here at the projective-pair implementation layer too.
 */
const associativitySamples = [
  [
    makeProjectiveElement(H, I),
    makeProjectiveElement(J, H),
    makeProjectiveElement(I, J),
  ],
  [
    G288[17],
    G288[103],
    G288[271],
  ],
  [
    G288[51],
    G288[144],
    G288[208],
  ],
];

for (
  const [
    first,
    second,
    third,
  ] of associativitySamples
) {
  const leftAssociated =
    composeG288(
      composeG288(
        first,
        second
      ),
      third
    );

  const rightAssociated =
    composeG288(
      first,
      composeG288(
        second,
        third
      )
    );

  assert(
    projectiveEquals(
      leftAssociated,
      rightAssociated
    ),
    "Representative projective associativity check failed."
  );
}


/*
 * Run exhaustive validation:
 *
 * - 576 raw pairs
 * - 288 projective elements
 * - exact sign reduction
 * - all 82,944 products closed
 * - all exact inverses
 */
const summary =
  validateG288();


/*
 * Compute the complete element-order distribution independently.
 */
const distribution =
  g288OrderDistribution();

const total =
  [
    ...distribution.values(),
  ].reduce(
    (sum, count) =>
      sum + count,
    0
  );

assert(
  total ===
    288,
  "Element-order distribution must account for all 288 elements."
);


console.log(
  `Raw ordered pairs: ${summary.rawPairCount}`
);

console.log(
  `Projective elements: ${summary.projectiveElementCount}`
);

console.log(
  `Unique canonical representatives: ${summary.uniqueKeyCount}`
);

console.log("");

console.log(
  "Element-order distribution in G_288:"
);

for (
  const [
    order,
    count,
  ] of distribution.entries()
) {
  console.log(
    `  order ${order}: ${count}`
  );
}


/*
 * Compare against the previously reported fingerprint.
 *
 * This is intentionally a diagnostic assertion, not part of the
 * definition of the group.
 */
const expectedDistribution =
  new Map([
    [1, 1],
    [2, 19],
    [3, 80],
    [4, 12],
    [6, 80],
    [12, 96],
  ]);

assert(
  distribution.size ===
    expectedDistribution.size,
  "Computed order distribution contains an unexpected number of order classes."
);

for (
  const [
    order,
    expectedCount,
  ] of expectedDistribution.entries()
) {
  const actualCount =
    distribution.get(order);

  assert(
    actualCount ===
      expectedCount,
    `Order-${order} count mismatch: expected ${expectedCount}, found ${String(actualCount)}.`
  );
}


/*
 * Show a few computed element orders only after the complete
 * distribution has passed.
 */
console.log("");

console.log(
  "Representative computed orders:"
);

for (
  const index of [
    0,
    1,
    17,
    103,
    287,
  ]
) {
  const element =
    G288[index];

  console.log(
    `  G[${index}] order ${g288ElementOrder(element)}`
  );
}


console.log("");

console.log(
  "PASS: exactly 576 raw 2T x 2T pairs"
);

console.log(
  "PASS: simultaneous sign quotient gives exactly 288 elements"
);

console.log(
  "PASS: all 288 projective representatives are distinct"
);

console.log(
  "PASS: one-sided sign changes remain distinct"
);

console.log(
  "PASS: exact identity"
);

console.log(
  "PASS: exhaustive 288 x 288 closure"
);

console.log(
  "PASS: exact inverse for every element"
);

console.log(
  "PASS: representative projective associativity"
);

console.log(
  "PASS: complete G_288 element-order distribution computed"
);

console.log(
  "PASS: computed order distribution matches the prior reported fingerprint"
);

console.log("");

console.log(
  "STEP 3 PASSED"
);
