/*
 * Exact quaternion kernel for Quaternionic 288-Group.
 *
 * Authoritative representation:
 *
 *   (A, B, C, D)
 *
 * means
 *
 *   (A + B i + C j + D k) / 2.
 *
 * We restrict this kernel to the Hurwitz lattice:
 * A, B, C, D are integers of one common parity
 * (all even or all odd).
 *
 * No floating-point arithmetic is used for authoritative
 * quaternion equality, multiplication, norm, or unit inversion.
 */

function assertInteger(value, label) {
  if (!Number.isSafeInteger(value)) {
    throw new TypeError(
      `${label} must be a safe integer; received ${String(value)}`
    );
  }
}

function normalizedParity(value) {
  return Math.abs(value % 2);
}

export function isHurwitzCoordinateTuple(A, B, C, D) {
  const values = [A, B, C, D];

  if (!values.every(Number.isSafeInteger)) {
    return false;
  }

  const parity = normalizedParity(A);

  return values.every(
    (value) => normalizedParity(value) === parity
  );
}

export function quaternion(A, B, C, D) {
  assertInteger(A, "A");
  assertInteger(B, "B");
  assertInteger(C, "C");
  assertInteger(D, "D");

  if (!isHurwitzCoordinateTuple(A, B, C, D)) {
    throw new RangeError(
      "Hurwitz quaternion coordinates must be all even or all odd."
    );
  }

  return Object.freeze({ A, B, C, D });
}

export const ZERO = quaternion(0, 0, 0, 0);
export const ONE = quaternion(2, 0, 0, 0);
export const NEG_ONE = quaternion(-2, 0, 0, 0);

export const I = quaternion(0, 2, 0, 0);
export const J = quaternion(0, 0, 2, 0);
export const K = quaternion(0, 0, 0, 2);

export function equals(left, right) {
  return (
    left.A === right.A &&
    left.B === right.B &&
    left.C === right.C &&
    left.D === right.D
  );
}

export function negate(value) {
  return quaternion(
    -value.A,
    -value.B,
    -value.C,
    -value.D
  );
}

export function add(left, right) {
  return quaternion(
    left.A + right.A,
    left.B + right.B,
    left.C + right.C,
    left.D + right.D
  );
}

export function conjugate(value) {
  return quaternion(
    value.A,
    -value.B,
    -value.C,
    -value.D
  );
}

function exactHalf(value, label) {
  if (value % 2 !== 0) {
    throw new Error(
      `${label} was not divisible by 2. ` +
      "The operands are not closed in the Hurwitz lattice."
    );
  }

  return value / 2;
}

export function multiply(left, right) {
  const A = left.A;
  const B = left.B;
  const C = left.C;
  const D = left.D;

  const E = right.A;
  const F = right.B;
  const G = right.C;
  const H = right.D;

  /*
   * Since each quaternion carries an overall denominator 2,
   * the raw Hamilton-product numerators carry denominator 4.
   * Closure of the Hurwitz lattice guarantees that the four
   * bilinear numerators below are even, allowing us to return
   * to the canonical denominator-2 coordinate system exactly.
   */
  return quaternion(
    exactHalf(
      A * E - B * F - C * G - D * H,
      "real product coordinate"
    ),
    exactHalf(
      A * F + B * E + C * H - D * G,
      "i product coordinate"
    ),
    exactHalf(
      A * G - B * H + C * E + D * F,
      "j product coordinate"
    ),
    exactHalf(
      A * H + B * G - C * F + D * E,
      "k product coordinate"
    )
  );
}

/*
 * Exact squared norm:
 *
 *   |q|^2 = numerator / 4.
 *
 * We deliberately retain numerator and denominator rather than
 * converting authoritative norm data to floating point.
 */
export function normSquared(value) {
  return Object.freeze({
    numerator:
      value.A * value.A +
      value.B * value.B +
      value.C * value.C +
      value.D * value.D,
    denominator: 4,
  });
}

export function isUnit(value) {
  const norm = normSquared(value);

  return norm.numerator === norm.denominator;
}

/*
 * For a unit quaternion q:
 *
 *   q^{-1} = conjugate(q).
 *
 * General non-unit inversion is intentionally not implemented
 * here because its coordinates need not remain in this
 * denominator-2 Hurwitz representation.
 */
export function inverseUnit(value) {
  if (!isUnit(value)) {
    throw new RangeError(
      "inverseUnit requires an exact unit quaternion."
    );
  }

  return conjugate(value);
}

export function serialize(value) {
  return `${value.A},${value.B},${value.C},${value.D}`;
}

export function deserialize(serialized) {
  if (typeof serialized !== "string") {
    throw new TypeError(
      "Serialized quaternion must be a string."
    );
  }

  const parts = serialized.split(",");

  if (parts.length !== 4) {
    throw new RangeError(
      "Serialized quaternion must contain exactly four coordinates."
    );
  }

  const values = parts.map((part) => {
    const trimmed = part.trim();

    if (!/^-?\d+$/.test(trimmed)) {
      throw new RangeError(
        `Invalid quaternion coordinate: ${part}`
      );
    }

    const value = Number(trimmed);

    if (!Number.isSafeInteger(value)) {
      throw new RangeError(
        `Quaternion coordinate is outside the safe integer range: ${part}`
      );
    }

    return value;
  });

  return quaternion(...values);
}

export function formatExact(value) {
  const terms = [
    ["", value.A],
    ["i", value.B],
    ["j", value.C],
    ["k", value.D],
  ];

  const numerator = terms
    .map(([symbol, coefficient], index) => {
      if (coefficient === 0) {
        return null;
      }

      const sign =
        coefficient < 0
          ? "-"
          : index === 0
            ? ""
            : "+";

      return `${sign}${Math.abs(coefficient)}${symbol}`;
    })
    .filter(Boolean)
    .join("");

  return `(${numerator || "0"})/2`;
}
