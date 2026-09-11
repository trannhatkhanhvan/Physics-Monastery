const TAU = 2 * Math.PI;

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

function abs(z) {
  return Math.hypot(
    z.re,
    z.im
  );
}

function scaleComplex(z, s) {
  return {
    re: z.re * s,
    im: z.im * s,
  };
}

function polynomialNormalized(
  z,
  c2,
  c1,
  c0
) {
  const z2 = mul(z, z);
  const z4 = mul(z2, z2);

  return add(
    add(
      z4,
      scaleComplex(z2, c2)
    ),
    add(
      scaleComplex(z, c1),
      { re: c0, im: 0 }
    )
  );
}

function polynomialOriginal(z, a) {
  const z2 = mul(z, z);
  const z3 = mul(z2, z);
  const z4 = mul(z2, z2);

  return add(
    add(
      z4,
      scaleComplex(z2, TAU)
    ),
    add(
      scaleComplex(
        z,
        -TAU * a
      ),
      { re: TAU, im: 0 }
    )
  );
}

function derivativeOriginal(z, a) {
  const z2 = mul(z, z);
  const z3 = mul(z2, z);

  return add(
    add(
      scaleComplex(z3, 4),
      scaleComplex(
        z,
        2 * TAU
      )
    ),
    {
      re: -TAU * a,
      im: 0,
    }
  );
}

function polishRoot(root, a) {
  let z = root;

  for (
    let iteration = 0;
    iteration < 12;
    iteration += 1
  ) {
    const f =
      polynomialOriginal(
        z,
        a
      );

    const fp =
      derivativeOriginal(
        z,
        a
      );

    if (abs(fp) < 1e-15) {
      break;
    }

    const correction =
      div(f, fp);

    z =
      sub(
        z,
        correction
      );

    if (
      abs(correction) <
      1e-14
    ) {
      break;
    }
  }

  if (
    Math.abs(z.im) <
    1e-11
  ) {
    return {
      re: z.re,
      im: 0,
    };
  }

  return z;
}

function canonicalSort(roots) {
  /*
   * Global branch convention:
   *
   * ж3 is the upper-half-plane root belonging
   * to the larger-modulus conjugate pair.
   *
   * ж4 is its lower-half-plane conjugate.
   *
   * This is the pair containing the physical
   * complex root and it remains the large
   * complex pair through the central regime.
   */
  const upperRoots =
    roots.filter(
      (root) =>
        root.im > 1e-9
    );

  let zhe3 = null;

  if (upperRoots.length > 0) {
    zhe3 =
      [...upperRoots].sort(
        (a, b) =>
          abs(b) - abs(a)
      )[0];
  }

  let zhe4 = null;

  if (zhe3) {
    zhe4 =
      [...roots]
        .filter(
          (root) =>
            root !== zhe3
        )
        .sort(
          (a, b) => {
            const da =
              Math.hypot(
                a.re - zhe3.re,
                a.im + zhe3.im
              );

            const db =
              Math.hypot(
                b.re - zhe3.re,
                b.im + zhe3.im
              );

            return da - db;
          }
        )[0];
  }

  const remaining =
    roots
      .filter(
        (root) =>
          root !== zhe3 &&
          root !== zhe4
      )
      .sort(
        (a, b) => {
          const aReal =
            Math.abs(a.im) <
            1e-9;

          const bReal =
            Math.abs(b.im) <
            1e-9;

          if (
            aReal &&
            bReal
          ) {
            return a.re - b.re;
          }

          if (
            a.im > 0 &&
            b.im < 0
          ) {
            return -1;
          }

          if (
            a.im < 0 &&
            b.im > 0
          ) {
            return 1;
          }

          return a.re - b.re;
        }
      );

  if (
    !zhe3 ||
    !zhe4
  ) {
    return [...roots].sort(
      (a, b) => {
        if (
          Math.abs(a.im - b.im) >
          1e-9
        ) {
          return b.im - a.im;
        }

        return a.re - b.re;
      }
    );
  }

  return [
    remaining[0],
    remaining[1],
    zhe3,
    zhe4,
  ];
}

export function evaluateQuartic(
  root,
  a
) {
  return polynomialOriginal(
    root,
    a
  );
}

export function solveQuarticRoots(a) {
  /*
   * Scale x = scale * y before
   * Durand-Kerner iteration.
   *
   * This keeps the moving roots
   * numerically O(1), even for
   * large |a|.
   */
  const scale =
    Math.max(
      1,
      Math.sqrt(TAU),
      Math.cbrt(
        TAU *
          Math.max(
            1,
            Math.abs(a)
          )
      )
    );

  const c2 =
    TAU /
    (scale * scale);

  const c1 =
    -TAU *
    a /
    (
      scale *
      scale *
      scale
    );

  const c0 =
    TAU /
    (
      scale *
      scale *
      scale *
      scale
    );

  let roots = [
    { re: 1.0, im: 0.15 },
    { re: 0.2, im: 1.05 },
    { re: -1.0, im: 0.35 },
    { re: -0.35, im: -0.95 },
  ];

  for (
    let iteration = 0;
    iteration < 160;
    iteration += 1
  ) {
    let maxCorrection = 0;

    const nextRoots =
      roots.map(
        (root, index) => {
          let denominator = {
            re: 1,
            im: 0,
          };

          roots.forEach(
            (
              other,
              otherIndex
            ) => {
              if (
                otherIndex ===
                index
              ) {
                return;
              }

              denominator =
                mul(
                  denominator,
                  sub(
                    root,
                    other
                  )
                );
            }
          );

          if (
            abs(denominator) <
            1e-18
          ) {
            denominator =
              add(
                denominator,
                {
                  re: 1e-12,
                  im: 1e-12,
                }
              );
          }

          const correction =
            div(
              polynomialNormalized(
                root,
                c2,
                c1,
                c0
              ),
              denominator
            );

          maxCorrection =
            Math.max(
              maxCorrection,
              abs(correction)
            );

          return sub(
            root,
            correction
          );
        }
      );

    roots = nextRoots;

    if (
      maxCorrection <
      1e-14
    ) {
      break;
    }
  }

  const polished =
    roots.map(
      (root) =>
        polishRoot(
          scaleComplex(
            root,
            scale
          ),
          a
        )
    );

  return canonicalSort(
    polished
  );
}

export function rootResidual(
  root,
  a
) {
  return abs(
    evaluateQuartic(
      root,
      a
    )
  );
}

export function maxRootResidual(
  roots,
  a
) {
  return Math.max(
    ...roots.map(
      (root) =>
        rootResidual(
          root,
          a
        )
    )
  );
}
