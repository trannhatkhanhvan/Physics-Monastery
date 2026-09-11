function add(a, b) {
  return {
    re: a.re + b.re,
    im: a.im + b.im,
  };
}

function sub(a, b) {
  return {
    re: a.re - b.re,
    im: a.im - b.im,
  };
}

function mul(a, b) {
  return {
    re:
      a.re * b.re -
      a.im * b.im,

    im:
      a.re * b.im +
      a.im * b.re,
  };
}

function div(a, b) {
  const d =
    b.re * b.re +
    b.im * b.im;

  return {
    re:
      (
        a.re * b.re +
        a.im * b.im
      ) / d,

    im:
      (
        a.im * b.re -
        a.re * b.im
      ) / d,
  };
}

function conjugate(z) {
  return {
    re: z.re,
    im: -z.im,
  };
}

function magnitude(z) {
  return Math.hypot(
    z.re,
    z.im
  );
}

export function computeCrossRatio(
  roots
) {
  if (
    !Array.isArray(roots) ||
    roots.length !== 4
  ) {
    throw new Error(
      "computeCrossRatio requires exactly four roots"
    );
  }

  const [
    z1,
    z2,
    z3,
    z4,
  ] = roots;

  const numerator =
    mul(
      sub(z1, z3),
      sub(z2, z4)
    );

  const denominator =
    mul(
      sub(z1, z4),
      sub(z2, z3)
    );

  const raw =
    div(
      numerator,
      denominator
    );

  /*
   * For geometric display we use the
   * positively oriented representative.
   *
   * Complex conjugation reverses the
   * orientation of the ideal tetrahedron.
   */
  const z =
    raw.im < 0
      ? conjugate(raw)
      : raw;

  const one = {
    re: 1,
    im: 0,
  };

  const zPrime =
    div(
      one,
      sub(one, z)
    );

  const zDoublePrime =
    sub(
      one,
      div(one, z)
    );

  return {
    raw,
    z,
    zPrime,
    zDoublePrime,

    modulus:
      magnitude(z),

    theta:
      Math.atan2(
        z.im,
        z.re
      ),
  };
}
