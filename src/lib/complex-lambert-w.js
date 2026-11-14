
// Branch-indexed Lambert W: w * exp(w) = z.
// Double-precision numerical implementation.
// Returns NaN when a numerical result cannot be validated.

const C = (re, im = 0) => ({ re, im });

const add = (a, b) =>
  C(a.re + b.re, a.im + b.im);

const sub = (a, b) =>
  C(a.re - b.re, a.im - b.im);

const mul = (a, b) =>
  C(
    a.re * b.re - a.im * b.im,
    a.re * b.im + a.im * b.re
  );

const div = (a, b) => {
  const d = b.re * b.re + b.im * b.im;

  return C(
    (a.re * b.re + a.im * b.im) / d,
    (a.im * b.re - a.re * b.im) / d
  );
};

const abs = a => Math.hypot(a.re, a.im);

const log = a =>
  C(Math.log(abs(a)), Math.atan2(a.im, a.re));

const exp = a => {
  const radius = Math.exp(a.re);

  return C(
    radius * Math.cos(a.im),
    radius * Math.sin(a.im)
  );
};

const invalid = () => C(NaN, NaN);

function halley(z, guess) {
  let w = guess;

  for (let n = 0; n < 45; n++) {
    const ew = exp(w);
    const f = sub(mul(w, ew), z);
    const wp1 = add(w, C(1));

    const denominator = sub(
      mul(ew, wp1),
      div(
        mul(add(w, C(2)), f),
        mul(C(2), wp1)
      )
    );

    if (
      abs(denominator) < 1e-300 ||
      !Number.isFinite(abs(denominator))
    ) {
      return invalid();
    }

    const step = div(f, denominator);
    w = sub(w, step);

    if (!Number.isFinite(abs(w))) {
      return invalid();
    }

    if (
      abs(step) <
      2e-13 * Math.max(1, abs(w))
    ) {
      break;
    }
  }

  const residual = abs(
    sub(mul(w, exp(w)), z)
  );

  return residual <=
    2e-10 * Math.max(1, abs(z))
      ? w
      : invalid();
}

// Real W_-1, with w <= -1.
function realNegative(x) {
  let lo = -2;
  let hi = -1;

  while (lo * Math.exp(lo) < x) {
    lo *= 2;
  }

  for (let n = 0; n < 65; n++) {
    const mid = (lo + hi) / 2;

    if (mid * Math.exp(mid) > x) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  return C((lo + hi) / 2);
}

export function lambertW(z, k = 0) {
  if (
    !Number.isFinite(z.re) ||
    !Number.isFinite(z.im) ||
    !Number.isSafeInteger(k) ||
    Math.abs(k) > 32
  ) {
    return invalid();
  }

  if (z.re === 0 && z.im === 0) {
    return k === 0 ? C(0) : invalid();
  }

  const branchPoint = -1 / Math.E;

  if (
    z.im === 0 &&
    z.re === branchPoint &&
    (k === 0 || k === -1)
  ) {
    return C(-1);
  }

  if (
    z.im === 0 &&
    z.re > branchPoint &&
    z.re < 0 &&
    k === -1
  ) {
    return realNegative(z.re);
  }

  let guess;

  if (k === 0) {
    if (abs(z) < 0.35) {
      guess = z;
    } else {
      const ez1 = add(
        C(1),
        C(Math.E * z.re, Math.E * z.im)
      );

      if (abs(ez1) < 0.9) {
        const p = exp(
          C(
            Math.log(abs(ez1)) / 2,
            Math.atan2(ez1.im, ez1.re) / 2
          )
        );

        guess = add(
          C(-1),
          sub(
            p,
            div(mul(p, p), C(3))
          )
        );
      } else {
        const L = log(z);

        guess = abs(z) < 2
          ? log(add(C(1), z))
          : sub(L, log(L));
      }
    }
  } else {
    const L = add(
      log(z),
      C(0, 2 * Math.PI * k)
    );

    guess = sub(L, log(L));
  }

  return halley(z, guess);
}
