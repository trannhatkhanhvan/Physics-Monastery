export const REGULAR_IDEAL_TETRAHEDRON_VOLUME =
  1.0149416064096536;

export const FIGURE_EIGHT_VOLUME =
  2 * REGULAR_IDEAL_TETRAHEDRON_VOLUME;

function principalAngle(angle) {
  let value = angle;

  while (value <= -Math.PI) {
    value += 2 * Math.PI;
  }

  while (value > Math.PI) {
    value -= 2 * Math.PI;
  }

  return value;
}

/*
 * Lobachevsky function
 *
 * Λ(theta) =
 *   - integral_0^theta log|2 sin(t)| dt
 *
 * We remove the endpoint logarithmic singularity
 * with the substitution t = theta * u^2.
 */
export function lobachevsky(theta) {
  if (!Number.isFinite(theta)) {
    return 0;
  }

  /*
   * Exact identity:
   *
   *   Λ(theta + π) = Λ(theta)
   *
   * Reduce first to [-π/2, π/2].
   *
   * This is crucial near theta = π:
   * Λ(π) = Λ(0) = 0 exactly, rather than
   * numerically integrating across the
   * logarithmic endpoint singularity.
   */
  let reduced =
    theta -
    Math.PI *
    Math.round(
      theta /
      Math.PI
    );

  if (
    Math.abs(reduced) <
    1e-14
  ) {
    return 0;
  }

  const sign =
    reduced < 0
      ? -1
      : 1;

  const magnitude =
    Math.abs(reduced);

  /*
   * Remove the remaining t = 0 logarithmic
   * endpoint with t = magnitude * u^2.
   */
  const n = 2048;
  const h = 1 / n;

  function integrand(u) {
    if (u === 0) {
      return 0;
    }

    const t =
      magnitude *
      u *
      u;

    const sine =
      Math.abs(
        Math.sin(t)
      );

    if (sine < 1e-15) {
      return 0;
    }

    return (
      -Math.log(
        2 * sine
      ) *
      2 *
      magnitude *
      u
    );
  }

  let sum =
    integrand(0) +
    integrand(1);

  for (
    let i = 1;
    i < n;
    i += 1
  ) {
    const u =
      i * h;

    sum +=
      (
        i % 2 === 0
          ? 2
          : 4
      ) *
      integrand(u);
  }

  return (
    sign *
    sum *
    h /
    3
  );
}

export function idealTetrahedronAngles(
  shape
) {
  const {
    z,
    zPrime,
    zDoublePrime,
  } = shape;

  let alpha =
    principalAngle(
      Math.atan2(
        z.im,
        z.re
      )
    );

  let beta =
    principalAngle(
      Math.atan2(
        zPrime.im,
        zPrime.re
      )
    );

  let gamma =
    principalAngle(
      Math.atan2(
        zDoublePrime.im,
        zDoublePrime.re
      )
    );

  /*
   * computeCrossRatio already chooses the
   * upper-half-plane orientation.
   *
   * Small floating-point negatives near
   * degeneracy are normalized to zero.
   */
  if (
    alpha < 0 &&
    alpha > -1e-12
  ) {
    alpha = 0;
  }

  if (
    beta < 0 &&
    beta > -1e-12
  ) {
    beta = 0;
  }

  if (
    gamma < 0 &&
    gamma > -1e-12
  ) {
    gamma = 0;
  }

  return {
    alpha,
    beta,
    gamma,
    sum:
      alpha +
      beta +
      gamma,
  };
}

export function idealTetrahedronVolume(
  shape
) {
  const angles =
    idealTetrahedronAngles(
      shape
    );

  const volume =
    lobachevsky(
      angles.alpha
    ) +
    lobachevsky(
      angles.beta
    ) +
    lobachevsky(
      angles.gamma
    );

  return {
    volume,
    doubledVolume:
      2 * volume,

    angles,

    regularFraction:
      volume /
      REGULAR_IDEAL_TETRAHEDRON_VOLUME,

    figureEightFraction:
      (
        2 * volume
      ) /
      FIGURE_EIGHT_VOLUME,
  };
}
