/*
 * Exact 24 Hurwitz unit quaternions.
 *
 * This module is derived entirely from the exact quaternion kernel.
 * No floating-point arithmetic is used for equality, closure,
 * multiplication, order, or membership.
 */

import {
  I,
  J,
  K,
  NEG_ONE,
  ONE,
  equals,
  inverseUnit,
  isUnit,
  multiply,
  negate,
  quaternion,
  serialize,
} from "./quaternion.mjs";

export const Q8 = Object.freeze([
  ONE,
  NEG_ONE,
  I,
  negate(I),
  J,
  negate(J),
  K,
  negate(K),
]);

function generateHalfHurwitzUnits() {
  const result = [];

  for (const A of [-1, 1]) {
    for (const B of [-1, 1]) {
      for (const C of [-1, 1]) {
        for (const D of [-1, 1]) {
          result.push(
            quaternion(A, B, C, D)
          );
        }
      }
    }
  }

  return result;
}

export const HALF_HURWITZ_UNITS =
  Object.freeze(
    generateHalfHurwitzUnits()
  );

export const HURWITZ_UNITS =
  Object.freeze([
    ...Q8,
    ...HALF_HURWITZ_UNITS,
  ]);

export const H =
  quaternion(1, -1, -1, -1);

const HURWITZ_BY_KEY =
  new Map(
    HURWITZ_UNITS.map(
      (value) => [
        serialize(value),
        value,
      ]
    )
  );

export function isHurwitzUnit(value) {
  return HURWITZ_BY_KEY.has(
    serialize(value)
  );
}

export function getHurwitzUnitByKey(key) {
  return HURWITZ_BY_KEY.get(key) ?? null;
}

export function multiplyHurwitz(left, right) {
  const product =
    multiply(left, right);

  const canonical =
    getHurwitzUnitByKey(
      serialize(product)
    );

  if (!canonical) {
    throw new Error(
      "Hurwitz closure failure: product is not one of the 24 units.\n" +
      `left=${serialize(left)}\n` +
      `right=${serialize(right)}\n` +
      `product=${serialize(product)}`
    );
  }

  return canonical;
}

export function inverseHurwitz(value) {
  const inverse =
    inverseUnit(value);

  const canonical =
    getHurwitzUnitByKey(
      serialize(inverse)
    );

  if (!canonical) {
    throw new Error(
      "Hurwitz inverse failure: inverse is not one of the 24 units."
    );
  }

  return canonical;
}

export function elementOrder(
  value,
  maxSteps = 48
) {
  let current = ONE;

  for (
    let step = 1;
    step <= maxSteps;
    step += 1
  ) {
    current =
      multiplyHurwitz(
        current,
        value
      );

    if (equals(current, ONE)) {
      return step;
    }
  }

  throw new Error(
    `Failed to determine order within ${maxSteps} steps for ${serialize(value)}`
  );
}

export function orderDistribution() {
  const counts = new Map();

  for (const value of HURWITZ_UNITS) {
    const order =
      elementOrder(value);

    counts.set(
      order,
      (counts.get(order) ?? 0) + 1
    );
  }

  return new Map(
    [...counts.entries()].sort(
      ([left], [right]) =>
        left - right
    )
  );
}

export function leftMultiplicationPermutation(
  multiplier
) {
  return HURWITZ_UNITS.map(
    (value) => {
      const product =
        multiplyHurwitz(
          multiplier,
          value
        );

      return HURWITZ_UNITS.findIndex(
        (candidate) =>
          equals(candidate, product)
      );
    }
  );
}

export function validateHurwitzUnits() {
  const serialized =
    HURWITZ_UNITS.map(
      serialize
    );

  const uniqueCount =
    new Set(serialized).size;

  if (HURWITZ_UNITS.length !== 24) {
    throw new Error(
      `Expected 24 Hurwitz units; found ${HURWITZ_UNITS.length}.`
    );
  }

  if (uniqueCount !== 24) {
    throw new Error(
      `Expected 24 distinct Hurwitz units; found ${uniqueCount}.`
    );
  }

  for (const value of HURWITZ_UNITS) {
    if (!isUnit(value)) {
      throw new Error(
        `Non-unit quaternion found in Hurwitz set: ${serialize(value)}`
      );
    }
  }

  for (const left of HURWITZ_UNITS) {
    for (const right of HURWITZ_UNITS) {
      multiplyHurwitz(
        left,
        right
      );
    }
  }

  for (const value of HURWITZ_UNITS) {
    inverseHurwitz(value);
  }

  return Object.freeze({
    count: 24,
    uniqueCount,
    q8Count: Q8.length,
    halfHurwitzCount:
      HALF_HURWITZ_UNITS.length,
    orderDistribution:
      Object.fromEntries(
        orderDistribution()
      ),
  });
}
