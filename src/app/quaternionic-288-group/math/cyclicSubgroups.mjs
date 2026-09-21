/*
 * Exact cyclic-subgroup and power-ladder structure of G_288.
 *
 * Step 11 focuses on the order-12 sector.
 */

import {
  G288_IDENTITY,
  composeG288,
  g288ElementOrder,
  projectiveEquals,
} from "./group288.mjs";

import {
  CENTRAL_MINUS_IDENTITY,
  G288_SPECTRAL_RECORDS,
  powerG288,
} from "./spectralClassification.mjs";

import {
  isK32Element,
} from "./subgroups.mjs";

import {
  cosetContaining,
  quotientCoordinates,
  quotientElementOrder,
} from "./quotientC3xC3.mjs";

import {
  G288_CONJUGACY_CLASSES,
} from "./conjugacyClasses.mjs";


const SPECTRAL_BY_ELEMENT_KEY =
  new Map(
    G288_SPECTRAL_RECORDS.map(
      (record) => [
        record.element.key,
        record,
      ]
    )
  );


const CONJUGACY_CLASS_INDEX_BY_ELEMENT_KEY =
  new Map();

for (
  let classIndex = 0;
  classIndex <
    G288_CONJUGACY_CLASSES.length;
  classIndex += 1
) {
  for (
    const element of
      G288_CONJUGACY_CLASSES[
        classIndex
      ].members
  ) {
    CONJUGACY_CLASS_INDEX_BY_ELEMENT_KEY.set(
      element.key,
      classIndex
    );
  }
}


function gcd(a, b) {
  let left = Math.abs(a);
  let right = Math.abs(b);

  while (right !== 0) {
    const next =
      left % right;

    left = right;
    right = next;
  }

  return left;
}


function subgroupKey(
  elements
) {
  return elements
    .map(
      (element) =>
        element.key
    )
    .sort()
    .join("||");
}


export function cyclicSubgroupGeneratedBy(
  generator
) {
  const order =
    g288ElementOrder(
      generator
    );

  const elements = [];

  for (
    let exponent = 0;
    exponent < order;
    exponent += 1
  ) {
    elements.push(
      powerG288(
        generator,
        exponent
      )
    );
  }

  const uniqueKeys =
    new Set(
      elements.map(
        (element) =>
          element.key
      )
    );

  if (
    uniqueKeys.size !== order
  ) {
    throw new Error(
      "Generated cyclic subgroup does not contain the expected number of distinct powers."
    );
  }

  return Object.freeze({
    generator,
    order,
    elements:
      Object.freeze(
        elements
      ),
    key:
      subgroupKey(
        elements
      ),
  });
}


export const ORDER_12_ELEMENTS =
  Object.freeze(
    G288_SPECTRAL_RECORDS
      .filter(
        (record) =>
          record.order === 12
      )
      .map(
        (record) =>
          record.element
      )
  );


function generateDistinctC12Subgroups() {
  const byKey =
    new Map();

  for (
    const element of
      ORDER_12_ELEMENTS
  ) {
    const subgroup =
      cyclicSubgroupGeneratedBy(
        element
      );

    if (
      subgroup.order !== 12
    ) {
      throw new Error(
        "Order-12 element failed to generate a C12 subgroup."
      );
    }

    if (
      !byKey.has(
        subgroup.key
      )
    ) {
      byKey.set(
        subgroup.key,
        subgroup
      );
    }
  }

  return [
    ...byKey.values(),
  ];
}


export const C12_SUBGROUPS =
  Object.freeze(
    generateDistinctC12Subgroups()
  );


export function primitiveExponent(
  exponent,
  modulus = 12
) {
  return (
    exponent > 0 &&
    exponent < modulus &&
    gcd(
      exponent,
      modulus
    ) === 1
  );
}


export function powerLadderFor(
  generator
) {
  const generatorOrder =
    g288ElementOrder(
      generator
    );

  if (
    generatorOrder !== 12
  ) {
    throw new RangeError(
      `powerLadderFor requires an order-12 generator; received order ${generatorOrder}.`
    );
  }

  const ladder = [];

  for (
    let exponent = 0;
    exponent < 12;
    exponent += 1
  ) {
    const element =
      powerG288(
        generator,
        exponent
      );

    const spectral =
      SPECTRAL_BY_ELEMENT_KEY.get(
        element.key
      );

    if (!spectral) {
      throw new Error(
        "Power ladder element is missing spectral data."
      );
    }

    const coset =
      cosetContaining(
        element
      );

    if (!coset) {
      throw new Error(
        "Power ladder element is missing quotient coset."
      );
    }

    const coordinates =
      quotientCoordinates(
        coset
      );

    if (!coordinates) {
      throw new Error(
        "Power ladder quotient coset is missing coordinates."
      );
    }

    const conjugacyClassIndex =
      CONJUGACY_CLASS_INDEX_BY_ELEMENT_KEY.get(
        element.key
      );

    if (
      conjugacyClassIndex == null
    ) {
      throw new Error(
        "Power ladder element is missing conjugacy-class membership."
      );
    }

    ladder.push(
      Object.freeze({
        exponent,
        element,

        order:
          g288ElementOrder(
            element
          ),

        primitiveGeneratorPosition:
          primitiveExponent(
            exponent,
            12
          ),

        characteristicPolynomial:
          spectral.characteristicPolynomialText,

        trace:
          spectral.trace,

        fixedSpaceDimension:
          spectral.fixedSpaceDimension,

        inK32:
          isK32Element(
            element
          ),

        quotientCoordinates:
          Object.freeze({
            a: coordinates.a,
            b: coordinates.b,
          }),

        quotientOrder:
          quotientElementOrder(
            coset
          ),

        conjugacyClassIndex,
      })
    );
  }

  return Object.freeze(
    ladder
  );
}


export function generatorsOfCyclicSubgroup(
  subgroup
) {
  return Object.freeze(
    subgroup.elements.filter(
      (element) =>
        g288ElementOrder(
          element
        ) === subgroup.order
    )
  );
}


export function isSubgroupExact(
  subgroup
) {
  const keys =
    new Set(
      subgroup.elements.map(
        (element) =>
          element.key
      )
    );

  if (
    keys.size !==
    subgroup.order
  ) {
    return false;
  }

  for (
    const left of
      subgroup.elements
  ) {
    for (
      const right of
        subgroup.elements
    ) {
      const product =
        composeG288(
          left,
          right
        );

      if (
        !keys.has(
          product.key
        )
      ) {
        return false;
      }
    }
  }

  return true;
}


export function c12GeneratorConjugacyPattern(
  subgroup
) {
  const generators =
    generatorsOfCyclicSubgroup(
      subgroup
    );

  return Object.freeze(
    generators
      .map(
        (element) =>
          CONJUGACY_CLASS_INDEX_BY_ELEMENT_KEY.get(
            element.key
          )
      )
      .sort(
        (a, b) =>
          a - b
      )
  );
}


export function validateC12Subgroups() {
  if (
    ORDER_12_ELEMENTS.length !==
    96
  ) {
    throw new Error(
      `Expected 96 order-12 elements; found ${ORDER_12_ELEMENTS.length}.`
    );
  }

  if (
    C12_SUBGROUPS.length !==
    24
  ) {
    throw new Error(
      `Expected 24 distinct C12 subgroups; found ${C12_SUBGROUPS.length}.`
    );
  }

  const generatorOwnership =
    new Map();

  for (
    const subgroup of
      C12_SUBGROUPS
  ) {
    if (
      subgroup.order !== 12
    ) {
      throw new Error(
        "A purported C12 subgroup does not have order 12."
      );
    }

    if (
      !isSubgroupExact(
        subgroup
      )
    ) {
      throw new Error(
        "C12 subgroup failed exact closure verification."
      );
    }

    const generators =
      generatorsOfCyclicSubgroup(
        subgroup
      );

    if (
      generators.length !== 4
    ) {
      throw new Error(
        `Expected exactly four generators of C12; found ${generators.length}.`
      );
    }

    for (
      const generator of generators
    ) {
      if (
        generatorOwnership.has(
          generator.key
        )
      ) {
        throw new Error(
          "An order-12 element is acting as generator of more than one distinct C12 subgroup."
        );
      }

      generatorOwnership.set(
        generator.key,
        subgroup.key
      );
    }

    const ladder =
      powerLadderFor(
        subgroup.generator
      );

    if (
      ladder.length !== 12
    ) {
      throw new Error(
        "C12 power ladder does not have 12 positions."
      );
    }

    if (
      !projectiveEquals(
        ladder[0].element,
        G288_IDENTITY
      )
    ) {
      throw new Error(
        "C12 power ladder does not begin at identity."
      );
    }

    if (
      !projectiveEquals(
        ladder[6].element,
        CENTRAL_MINUS_IDENTITY
      )
    ) {
      throw new Error(
        "C12 midpoint g^6 is not -I."
      );
    }

    const primitiveExponents =
      ladder
        .filter(
          (record) =>
            record.primitiveGeneratorPosition
        )
        .map(
          (record) =>
            record.exponent
        );

    const expectedPrimitive =
      [1, 5, 7, 11];

    if (
      primitiveExponents.length !==
        expectedPrimitive.length ||
      primitiveExponents.some(
        (value, index) =>
          value !==
          expectedPrimitive[index]
      )
    ) {
      throw new Error(
        `Unexpected primitive generator positions: ${primitiveExponents.join(",")}`
      );
    }

    /*
     * Since the image of an order-12 element in
     * G288/K32 has order 3, exactly the powers divisible
     * by 3 should lie in K32.
     */
    for (
      const record of ladder
    ) {
      const expectedK32 =
        record.exponent % 3 === 0;

      if (
        record.inK32 !==
        expectedK32
      ) {
        throw new Error(
          `Unexpected K32 membership at exponent ${record.exponent}.`
        );
      }
    }
  }

  if (
    generatorOwnership.size !==
    96
  ) {
    throw new Error(
      `Expected the 24 C12 subgroups to account for all 96 order-12 generators exactly once; accounted for ${generatorOwnership.size}.`
    );
  }

  return Object.freeze({
    order12ElementCount:
      ORDER_12_ELEMENTS.length,

    c12SubgroupCount:
      C12_SUBGROUPS.length,

    generatorsPerC12: 4,

    primitiveExponents:
      Object.freeze([
        1, 5, 7, 11,
      ]),

    generatorOwnershipCount:
      generatorOwnership.size,
  });
}
