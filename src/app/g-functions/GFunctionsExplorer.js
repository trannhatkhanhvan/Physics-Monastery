"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const SVG_WIDTH = 1000;
const SVG_HEIGHT = 680;

const G2_C2 =
  -5 /
  (
    Math.pow(3, 1 / 3) *
    Math.pow(2, 5 / 4) *
    Math.sqrt(7 * Math.PI) *
    Math.exp(Math.PI / 8)
  );

const FUNCTIONS = {
  G0: {
    label: "G₀",
    color: "#ffd166",
    formula: "−π sinh²(z/4)",
  },
  G1: {
    label: "G₁",
    color: "#ff7b72",
    formula: "−csch(sinh(z/7))",
  },
  G2: {
    label: "G₂",
    color: "#c084fc",
    formula: "C₂ Γ²(z/4)",
  },
  G3: {
    label: "G₃",
    color: "#7ee787",
    formula: "(50/7) cosh²(5z/2) cos²(7z/5)",
  },
  G4: {
    label: "G₄",
    color: "#75c7ff",
    formula: "−10π cos²(7z/5)",
  },
};

const PLANCK_BOUNDARIES = {
  G0: {
    name: "Time",
    phiLabel: "φ₀",
    planckLabel: "tₚ",
    n: -44,
    unit: "s",
  },
  G1: {
    name: "Length",
    phiLabel: "φ₁",
    planckLabel: "lₚ",
    n: -35,
    unit: "m",
  },
  G2: {
    name: "Charge",
    phiLabel: "φ₂",
    planckLabel: "qₚ",
    n: -18,
    unit: "C",
  },
  G3: {
    name: "Temperature",
    phiLabel: "φ₃",
    planckLabel: "Tₚ",
    n: 32,
    unit: "K",
  },
  G4: {
    name: "Mass",
    phiLabel: "φ₄",
    planckLabel: "mₚ",
    n: -8,
    unit: "kg",
  },
};

const PLANCK_STACK_OFFSETS = [2, 1, 0, -1, -2];

function integerRange(min, max) {
  const values = [];
  for (let n = Math.ceil(min); n <= Math.floor(max); n += 1) {
    values.push(n);
  }
  return values;
}

function formatNumber(value) {
  if (Math.abs(value) < 1e-10) return "0";

  if (Math.abs(value) >= 1e5 || Math.abs(value) < 1e-4) {
    return value.toExponential(3).replace("-", "−");
  }

  return Number(value.toPrecision(6))
    .toString()
    .replace("-", "−");
}

function complex(re = 0, im = 0) {
  return { re, im };
}

function complexAdd(a, b) {
  return complex(a.re + b.re, a.im + b.im);
}

function complexSub(a, b) {
  return complex(a.re - b.re, a.im - b.im);
}

function complexScale(a, scalar) {
  return complex(a.re * scalar, a.im * scalar);
}

function complexMul(a, b) {
  return complex(
    a.re * b.re - a.im * b.im,
    a.re * b.im + a.im * b.re
  );
}

function complexDiv(a, b) {
  const ar = a.re;
  const ai = a.im;
  const br = b.re;
  const bi = b.im;

  /*
   * Reject actual NaNs first.
   */
  if (
    Number.isNaN(ar) ||
    Number.isNaN(ai) ||
    Number.isNaN(br) ||
    Number.isNaN(bi)
  ) {
    return complex(NaN, NaN);
  }

  /*
   * Finite numerator divided by an infinite denominator
   * tends to zero. This matters for functions such as G₁,
   * whose nested sinh can become enormous very quickly.
   */
  if (
    Number.isFinite(ar) &&
    Number.isFinite(ai) &&
    (
      !Number.isFinite(br) ||
      !Number.isFinite(bi)
    )
  ) {
    return complex(0, 0);
  }

  /*
   * True zero denominator.
   */
  if (
    Math.abs(br) < 1e-14 &&
    Math.abs(bi) < 1e-14
  ) {
    return complex(
      Infinity,
      Infinity
    );
  }

  /*
   * Smith's stable complex-division algorithm.
   *
   * This avoids forming br² + bi² directly, which can
   * overflow even when the quotient itself is perfectly
   * representable.
   */
  if (
    Math.abs(br) >=
    Math.abs(bi)
  ) {
    const ratio =
      bi / br;

    const denominator =
      br + bi * ratio;

    return complex(
      (ar + ai * ratio) /
        denominator,
      (ai - ar * ratio) /
        denominator
    );
  }

  const ratio =
    br / bi;

  const denominator =
    bi + br * ratio;

  return complex(
    (ar * ratio + ai) /
      denominator,
    (ai * ratio - ar) /
      denominator
  );
}

function complexAbs(z) {
  return Math.hypot(z.re, z.im);
}

function invertComplexArgument(z) {
  if (z.re === 0 && z.im === 0) {
    return complex(NaN, NaN);
  }
  return complexDiv(complex(1, 0), z);
}

function complexArg(z) {
  return Math.atan2(z.im, z.re);
}

function complexExp(z) {
  const radial = Math.exp(z.re);

  return complex(
    radial * Math.cos(z.im),
    radial * Math.sin(z.im)
  );
}

function complexLog(z) {
  return complex(
    Math.log(complexAbs(z)),
    complexArg(z)
  );
}

function complexPow(a, b) {
  return complexExp(
    complexMul(
      b,
      complexLog(a)
    )
  );
}

function complexSin(z) {
  return complex(
    Math.sin(z.re) * Math.cosh(z.im),
    Math.cos(z.re) * Math.sinh(z.im)
  );
}

function complexCos(z) {
  return complex(
    Math.cos(z.re) * Math.cosh(z.im),
    -Math.sin(z.re) * Math.sinh(z.im)
  );
}

function complexSinh(z) {
  return complex(
    Math.sinh(z.re) * Math.cos(z.im),
    Math.cosh(z.re) * Math.sin(z.im)
  );
}

function complexCosh(z) {
  return complex(
    Math.cosh(z.re) * Math.cos(z.im),
    Math.sinh(z.re) * Math.sin(z.im)
  );
}

/*
 * Complex Gamma via the Lanczos approximation.
 * This is for the interactive probe only; the landmark
 * geometry itself remains analytic/exact.
 */
function complexGamma(z) {
  const nearestInteger =
    Math.round(z.re);

  if (
    Math.abs(z.im) < 1e-12 &&
    nearestInteger <= 0 &&
    Math.abs(z.re - nearestInteger) < 1e-12
  ) {
    return complex(Infinity, Infinity);
  }

  const coefficients = [
    676.5203681218851,
    -1259.1392167224028,
    771.3234287776531,
    -176.6150291621406,
    12.507343278686905,
    -0.13857109526572012,
    9.984369578019572e-6,
    1.5056327351493116e-7,
  ];

  if (z.re < 0.5) {
    const piZ =
      complexScale(z, Math.PI);

    const reflected =
      complexGamma(
        complexSub(
          complex(1, 0),
          z
        )
      );

    return complexDiv(
      complex(Math.PI, 0),
      complexMul(
        complexSin(piZ),
        reflected
      )
    );
  }

  const shifted =
    complexSub(
      z,
      complex(1, 0)
    );

  let x =
    complex(
      0.9999999999998099,
      0
    );

  coefficients.forEach(
    (coefficient, index) => {
      x = complexAdd(
        x,
        complexDiv(
          complex(coefficient, 0),
          complexAdd(
            shifted,
            complex(index + 1, 0)
          )
        )
      );
    }
  );

  const t =
    complexAdd(
      shifted,
      complex(7.5, 0)
    );

  const power =
    complexPow(
      t,
      complexAdd(
        shifted,
        complex(0.5, 0)
      )
    );

  return complexScale(
    complexMul(
      complexMul(
        power,
        complexExp(
          complexScale(t, -1)
        )
      ),
      x
    ),
    Math.sqrt(2 * Math.PI)
  );
}

function evaluateGValues(z) {
  const quarter =
    complexScale(z, 1 / 4);

  const g0Sinh =
    complexSinh(quarter);

  const g0 =
    complexScale(
      complexMul(
        g0Sinh,
        g0Sinh
      ),
      -Math.PI
    );

  const g1Inner =
    complexSinh(
      complexScale(z, 1 / 7)
    );

  const g1 =
    complexDiv(
      complex(-1, 0),
      complexSinh(g1Inner)
    );

  const gamma =
    complexGamma(quarter);

  const g2 =
    complexScale(
      complexMul(
        gamma,
        gamma
      ),
      G2_C2
    );

  const g3Hyperbolic =
    complexCosh(
      complexScale(z, 5 / 2)
    );

  const g3Circular =
    complexCos(
      complexScale(z, 7 / 5)
    );

  const g3 =
    complexScale(
      complexMul(
        complexMul(
          g3Hyperbolic,
          g3Hyperbolic
        ),
        complexMul(
          g3Circular,
          g3Circular
        )
      ),
      50 / 7
    );

  const g4Circular =
    complexCos(
      complexScale(z, 7 / 5)
    );

  const g4 =
    complexScale(
      complexMul(
        g4Circular,
        g4Circular
      ),
      -10 * Math.PI
    );

  return {
    G0: g0,
    G1: g1,
    G2: g2,
    G3: g3,
    G4: g4,
  };
}

function evaluateSingleG(id, z) {
  switch (id) {
    case "G0": {
      const s =
        complexSinh(
          complexScale(
            z,
            1 / 4
          )
        );

      return complexScale(
        complexMul(s, s),
        -Math.PI
      );
    }

    case "G1": {
      const inner =
        complexSinh(
          complexScale(
            z,
            1 / 7
          )
        );

      return complexDiv(
        complex(-1, 0),
        complexSinh(inner)
      );
    }

    case "G2": {
      const gamma =
        complexGamma(
          complexScale(
            z,
            1 / 4
          )
        );

      return complexScale(
        complexMul(
          gamma,
          gamma
        ),
        G2_C2
      );
    }

    case "G3": {
      const hyperbolic =
        complexCosh(
          complexScale(
            z,
            5 / 2
          )
        );

      const circular =
        complexCos(
          complexScale(
            z,
            7 / 5
          )
        );

      return complexScale(
        complexMul(
          complexMul(
            hyperbolic,
            hyperbolic
          ),
          complexMul(
            circular,
            circular
          )
        ),
        50 / 7
      );
    }

    case "G4": {
      const circular =
        complexCos(
          complexScale(
            z,
            7 / 5
          )
        );

      return complexScale(
        complexMul(
          circular,
          circular
        ),
        -10 * Math.PI
      );
    }

    default:
      return complex(
        NaN,
        NaN
      );
  }
}


/*
 * Log-polar representation for domain coloring.
 *
 * We carry
 *
 *     logAbs = ln |f(z)|
 *     arg    = arg f(z)
 *
 * separately.
 *
 * This preserves phase information even when |f(z)| is far
 * outside ordinary IEEE-754 floating-point range.
 */
function normalizeAngle(angle) {
  if (!Number.isFinite(angle)) {
    return angle;
  }

  const twoPi =
    2 * Math.PI;

  return (
    (
      angle + Math.PI
    ) % twoPi +
    twoPi
  ) % twoPi - Math.PI;
}


function complexToLogPolar(value) {
  if (!value) {
    return {
      logAbs: NaN,
      arg: NaN,
    };
  }

  const magnitude =
    complexAbs(value);

  if (magnitude === 0) {
    return {
      logAbs: -Infinity,
      arg: 0,
    };
  }

  if (
    !Number.isFinite(magnitude)
  ) {
    return {
      logAbs: Infinity,
      arg:
        Number.isFinite(value.re) &&
        Number.isFinite(value.im)
          ? complexArg(value)
          : 0,
    };
  }

  return {
    logAbs:
      Math.log(magnitude),
    arg:
      complexArg(value),
  };
}


function logPolarMul(a, b) {
  return {
    logAbs:
      a.logAbs +
      b.logAbs,
    arg:
      normalizeAngle(
        a.arg + b.arg
      ),
  };
}


function logPolarDiv(a, b) {
  return {
    logAbs:
      a.logAbs -
      b.logAbs,
    arg:
      normalizeAngle(
        a.arg - b.arg
      ),
  };
}


function logPolarIntegerPow(
  value,
  exponent
) {
  if (exponent === 0) {
    return {
      logAbs: 0,
      arg: 0,
    };
  }

  return {
    logAbs:
      value.logAbs *
      exponent,
    arg:
      normalizeAngle(
        value.arg *
        exponent
      ),
  };
}


/*
 * Numerically stable log-polar G₁.
 *
 * G₁(z) = csch(sinh(z/7)).
 *
 * Let
 *
 *     w = sinh(z/7) = a + ib.
 *
 * For large |a| we never form sinh(w), because that would
 * overflow. Instead:
 *
 *   a >> 0:
 *     sinh(w) ~ 1/2 exp(a + ib)
 *
 *   a << 0:
 *     sinh(w) ~ -1/2 exp(-a - ib)
 *
 * so both ln|G₁| and arg(G₁) remain available exactly enough
 * for domain coloring.
 */
function evaluateG1LogPolar(z) {
  const w =
    complexSinh(
      complexScale(
        z,
        1 / 7
      )
    );

  const a = w.re;
  const b = w.im;

  /*
   * G1 = -csch(w).
   * The minus sign rotates the phase by π.
   */
  if (a > 20) {
    return {
      logAbs:
        Math.log(2) - a,
      arg:
        normalizeAngle(
          -b + Math.PI
        ),
    };
  }

  if (a < -20) {
    return {
      logAbs:
        Math.log(2) + a,
      arg:
        normalizeAngle(b),
    };
  }

  const denominator =
    complexSinh(w);

  const denominatorPolar =
    complexToLogPolar(
      denominator
    );

  return {
    logAbs:
      -denominatorPolar.logAbs,
    arg:
      normalizeAngle(
        -denominatorPolar.arg +
        Math.PI
      ),
  };
}


function evaluateSingleGLogPolar(
  id,
  z
) {
  if (id === "G1") {
    return evaluateG1LogPolar(z);
  }

  return complexToLogPolar(
    evaluateSingleG(
      id,
      z
    )
  );
}


function evaluatePhiComplex(
  id,
  z,
  sheet = 0
) {
  const boundary =
    PLANCK_BOUNDARIES[id];

  const gPolar =
    evaluateSingleGLogPolar(
      id,
      z
    );

  const n =
    boundary.n;

  /*
   * Signed defining relation:
   *
   *     G_k e^(φ_k) = n_k
   *
   * so
   *
   *     φ_k = Log(n_k / G_k) + 2π i m.
   */
  const quotientLogAbs =
    Math.log(
      Math.abs(n)
    ) -
    gPolar.logAbs;

  const nArg =
    n < 0
      ? Math.PI
      : 0;

  const quotientArg =
    normalizeAngle(
      nArg -
      gPolar.arg
    );

  return complex(
    quotientLogAbs,
    quotientArg +
      2 * Math.PI * sheet
  );
}


function evaluatePlanckLogPolar(
  id,
  z,
  sheet,
  quantity
) {
  const phi =
    evaluatePhiComplex(
      id,
      z,
      sheet
    );

  const phiPolar =
    complexToLogPolar(phi);

  if (quantity === "phi") {
    return phiPolar;
  }

  /*
   * Full Planck construction:
   *
   *     P_k = φ_k × 10^n
   *
   * Carry the TRUE physical scale in log-polar form so there is
   * no underflow for time, length, or charge.
   */
  return {
    logAbs:
      phiPolar.logAbs +
      PLANCK_BOUNDARIES[id].n *
        Math.LN10,
    arg:
      phiPolar.arg,
  };
}


function evaluatePlanckAlgebra(a, b, op, z, sheet) {
  const first = evaluatePlanckLogPolar(
    a, z, sheet, "planck"
  );

  if (!b) return first;

  const second = evaluatePlanckLogPolar(
    b, z, sheet, "planck"
  );

  if (op === "mul") {
    return logPolarMul(first, second);
  }

  if (op === "div") {
    return logPolarDiv(first, second);
  }

  // Mixed dimensions: compare dimensionless phi functions.
  // Equal dimensions: add the physical Planck quantities.
  const mixedDimensions = a !== b;

  const leftLogAbs = mixedDimensions
    ? first.logAbs - PLANCK_BOUNDARIES[a].n * Math.LN10
    : first.logAbs;

  const rightLogAbs = mixedDimensions
    ? second.logAbs - PLANCK_BOUNDARIES[b].n * Math.LN10
    : second.logAbs;

  // Stable addition/subtraction at a common logarithmic scale.
  const m = Math.max(leftLogAbs, rightLogAbs);

  if (m === -Infinity) {
    return { logAbs: -Infinity, arg: 0 };
  }

  const sign = op === "sub" ? -1 : 1;

  const re =
    Math.exp(leftLogAbs - m) * Math.cos(first.arg) +
    sign * Math.exp(rightLogAbs - m) * Math.cos(second.arg);

  const im =
    Math.exp(leftLogAbs - m) * Math.sin(first.arg) +
    sign * Math.exp(rightLogAbs - m) * Math.sin(second.arg);

  const polar = complexToLogPolar(complex(re, im));

  return {
    logAbs: m + polar.logAbs,
    arg: polar.arg,
  };
}

function evaluatePowerProductLogPolar(
  exponents,
  z
) {
  let result = {
    logAbs: 0,
    arg: 0,
  };

  for (
    const id of
    Object.keys(FUNCTIONS)
  ) {
    const exponent =
      exponents[id] || 0;

    if (exponent === 0) {
      continue;
    }

    result =
      logPolarMul(
        result,
        logPolarIntegerPow(
          evaluateSingleGLogPolar(
            id,
            z
          ),
          exponent
        )
      );
  }

  return result;
}


/*
 * Standard phase coloring:
 *
 * hue      = arg H
 * brightness responds smoothly to |H|
 *
 * Zeros become darker; very large values become brighter.
 * No probe or selected point is involved.
 */
function hslToRgb(
  hue,
  saturation,
  lightness
) {
  const h =
    ((hue % 1) + 1) % 1;

  if (saturation === 0) {
    const gray =
      Math.round(
        lightness * 255
      );

    return [
      gray,
      gray,
      gray,
    ];
  }

  const q =
    lightness < 0.5
      ? lightness *
        (1 + saturation)
      : lightness +
        saturation -
        lightness *
          saturation;

  const p =
    2 * lightness - q;

  function channel(t) {
    let value = t;

    if (value < 0) {
      value += 1;
    }

    if (value > 1) {
      value -= 1;
    }

    if (value < 1 / 6) {
      return (
        p +
        (q - p) *
          6 *
          value
      );
    }

    if (value < 1 / 2) {
      return q;
    }

    if (value < 2 / 3) {
      return (
        p +
        (q - p) *
          (2 / 3 - value) *
          6
      );
    }

    return p;
  }

  return [
    Math.round(
      channel(
        h + 1 / 3
      ) * 255
    ),
    Math.round(
      channel(h) * 255
    ),
    Math.round(
      channel(
        h - 1 / 3
      ) * 255
    ),
  ];
}


function derivedDomainColorLogPolar(
  value,
  hueOffset = 0
) {
  if (
    !value ||
    Number.isNaN(value.logAbs) ||
    Number.isNaN(value.arg)
  ) {
    return [
      40,
      40,
      40,
      255,
    ];
  }

  const argument =
    normalizeAngle(
      value.arg
    );

  const hue =
    argument /
      (2 * Math.PI) +
    0.5 +
    hueOffset;

  /*
   * Convert natural-log magnitude to base-10 only for the
   * brightness mapping.
   *
   * No exp() is performed, so values such as
   *
   *     ln |H| = -500000
   *
   * remain perfectly representable.
   */
  const logMagnitude10 =
    value.logAbs /
    Math.LN10;

  const lightness =
    0.43 +
    0.18 *
      Math.tanh(
        logMagnitude10 /
        1.8
      );

  const [
    red,
    green,
    blue,
  ] =
    hslToRgb(
      hue,
      0.78,
      lightness
    );

  return [
    red,
    green,
    blue,
    255,
  ];
}


function planckDomainColor(
  value,
  id,
  quantity
) {
  if (quantity !== "planck") {
    return derivedDomainColorLogPolar(
      value
    );
  }

  /*
   * value contains the TRUE physical magnitude:
   *
   *   ln|P_k|
   *     =
   *   ln|φ_k| + n_k ln(10).
   *
   * For DISPLAY brightness only, recenter on the natural
   * physical scale 10^n_k.
   *
   * This does not alter the function being evaluated.
   * It merely prevents 10^-44, 10^-35, etc. from flattening
   * the visible contrast.
   */
  return derivedDomainColorLogPolar({
    logAbs:
      value.logAbs -
      PLANCK_BOUNDARIES[id].n *
        Math.LN10,
    arg:
      value.arg,
  });
}


function continuationPiLabel(
  coefficient
) {
  if (coefficient === 0) {
    return "0";
  }

  const sign =
    coefficient < 0
      ? "−"
      : "+";

  const magnitude =
    Math.abs(coefficient);

  const factor =
    magnitude === 1
      ? ""
      : String(magnitude);

  return `${sign}${factor}πi`;
}


function buildPlanckContinuation(
  id,
  target,
  radius,
  sheet,
  direction = 1,
  samples = 180
) {
  if (!target || !(radius > 0)) {
    return null;
  }

  const points = [];

  let previousPrincipalIm =
    null;

  let unwrappedIm =
    null;

  for (
    let j = 0;
    j <= samples;
    j += 1
  ) {
    const theta =
      direction *
      (
        2 *
        Math.PI *
        j
      ) /
      samples;

    const z = {
      re:
        target.re +
        radius *
          Math.cos(theta),

      im:
        target.im +
        radius *
          Math.sin(theta),
    };

    /*
     * Evaluate on principal sheet first.
     * We then unwrap the imaginary coordinate continuously
     * along the path.
     */
    const principal =
      evaluatePhiComplex(
        id,
        z,
        0
      );

    let currentIm =
      principal.im;

    if (
      previousPrincipalIm !== null &&
      Number.isFinite(currentIm) &&
      Number.isFinite(
        previousPrincipalIm
      )
    ) {
      let step =
        currentIm -
        previousPrincipalIm;

      while (step > Math.PI) {
        step -=
          2 * Math.PI;
      }

      while (step < -Math.PI) {
        step +=
          2 * Math.PI;
      }

      unwrappedIm +=
        step;
    } else {
      unwrappedIm =
        currentIm;
    }

    previousPrincipalIm =
      currentIm;

    points.push({
      z,

      phi: {
        re:
          principal.re,

        im:
          unwrappedIm +
          2 *
            Math.PI *
            sheet,
      },
    });
  }

  const first =
    points[0]?.phi;

  const last =
    points[
      points.length - 1
    ]?.phi;

  return {
    points,

    deltaPhi:
      first && last
        ? {
            re:
              last.re -
              first.re,

            im:
              last.im -
              first.im,
          }
        : null,
  };
}


function derivedDomainColor(value) {
  if (!value) {
    return [
      8,
      8,
      8,
      255,
    ];
  }

  const magnitude =
    complexAbs(value);

  if (
    !Number.isFinite(
      magnitude
    )
  ) {
    return [
      245,
      245,
      245,
      255,
    ];
  }

  const argument =
    complexArg(value);

  const hue =
    argument /
      (2 * Math.PI) +
    0.5;

  const logMagnitude =
    Math.log10(
      magnitude +
      1e-14
    );

  /*
   * Smooth magnitude response.
   *
   * Small |H| -> dark.
   * |H| around 1 -> middle brightness.
   * Large |H| -> bright.
   */
  const lightness =
    0.43 +
    0.18 *
      Math.tanh(
        logMagnitude /
          1.8
      );

  const [
    red,
    green,
    blue,
  ] =
    hslToRgb(
      hue,
      0.78,
      lightness
    );

  return [
    red,
    green,
    blue,
    255,
  ];
}


function formatComplex(z) {
  if (
    !Number.isFinite(z.re) ||
    !Number.isFinite(z.im)
  ) {
    return "∞";
  }

  const re =
    Math.abs(z.re) < 1e-11
      ? 0
      : z.re;

  const im =
    Math.abs(z.im) < 1e-11
      ? 0
      : z.im;

  if (im === 0) {
    return formatNumber(re);
  }

  if (re === 0) {
    return `${formatNumber(im)}i`;
  }

  return (
    `${formatNumber(re)} ` +
    `${im >= 0 ? "+" : "−"} ` +
    `${formatNumber(Math.abs(im))}i`
  );
}

function residual(a, b) {
  if (
    !Number.isFinite(a.re) ||
    !Number.isFinite(a.im) ||
    !Number.isFinite(b.re) ||
    !Number.isFinite(b.im)
  ) {
    return Infinity;
  }

  return complexAbs(
    complexSub(a, b)
  );
}

const DERIVED_COLOR = "#ff9ff3";

const ZERO_MULTIPLICITY = {
  G0: 2,
  G1: 1,
  G2: 1,
  G3: 2,
  G4: 2,
};

const POLE_MULTIPLICITY = {
  G0: 1,
  G1: 1,
  G2: 2,
  G3: 1,
  G4: 1,
};

function combineGValues(a, b, operator) {
  if (!a || !b) {
    return null;
  }

  switch (operator) {
    case "add":
      return complexAdd(a, b);

    case "sub":
      return complexSub(a, b);

    case "mul":
      return complexMul(a, b);

    case "div":
      return complexDiv(a, b);

    default:
      return null;
  }
}

function algebraOperatorSymbol(operator) {
  switch (operator) {
    case "add":
      return "+";

    case "sub":
      return "−";

    case "mul":
      return "×";

    case "div":
      return "÷";

    default:
      return "?";
  }
}

function algebraFactorText(
  id,
  power
) {
  if (!id) {
    return "";
  }

  return (
    FUNCTIONS[id].label +
    (
      power === 1
        ? ""
        : `^${power}`
    )
  );
}


function algebraExpression(
  aId,
  bId,
  operator,
  aPower = 1,
  bPower = 1
) {
  if (!aId || !bId) {
    return null;
  }

  return (
    `${algebraFactorText(
      aId,
      aPower
    )} ` +
    `${algebraOperatorSymbol(operator)} ` +
    `${algebraFactorText(
      bId,
      bPower
    )}`
  );
}


function complexIntegerPow(value, exponent) {
  if (!Number.isInteger(exponent)) {
    return complex(NaN, NaN);
  }

  if (exponent === 0) {
    return complex(1, 0);
  }

  const negative =
    exponent < 0;

  let remaining =
    Math.abs(exponent);

  let base = value;

  let result =
    complex(1, 0);

  while (remaining > 0) {
    if (remaining % 2 === 1) {
      result =
        complexMul(
          result,
          base
        );
    }

    remaining =
      Math.floor(
        remaining / 2
      );

    if (remaining > 0) {
      base =
        complexMul(
          base,
          base
        );
    }
  }

  if (negative) {
    return complexDiv(
      complex(1, 0),
      result
    );
  }

  return result;
}


function evaluatePowerProduct(
  exponents,
  z
) {
  let result =
    complex(1, 0);

  for (
    const id of
    Object.keys(FUNCTIONS)
  ) {
    const exponent =
      exponents[id] || 0;

    if (exponent === 0) {
      continue;
    }

    result =
      complexMul(
        result,
        complexIntegerPow(
          evaluateSingleG(
            id,
            z
          ),
          exponent
        )
      );
  }

  return result;
}


function powerExpressionText(exponents) {
  const numerator = [];
  const denominator = [];

  Object.entries(FUNCTIONS).forEach(
    ([id, info]) => {
      const exponent =
        exponents[id] || 0;

      if (exponent === 0) {
        return;
      }

      const absoluteExponent =
        Math.abs(exponent);

      const factor =
        absoluteExponent === 1
          ? info.label
          : `${info.label}^${absoluteExponent}`;

      if (exponent > 0) {
        numerator.push(factor);
      } else {
        denominator.push(factor);
      }
    }
  );

  if (
    numerator.length === 0 &&
    denominator.length === 0
  ) {
    return "1";
  }

  const numeratorText =
    numerator.length
      ? numerator.join(" · ")
      : "1";

  if (!denominator.length) {
    return numeratorText;
  }

  return (
    `${numeratorText} / ` +
    `${denominator.join(" · ")}`
  );
}

/*
 * Divisor arithmetic:
 *
 *     ord_z(A B) = ord_z(A) + ord_z(B)
 *
 *     ord_z(A/B) = ord_z(A) - ord_z(B)
 *
 * positive order -> zero
 * negative order -> pole
 *
 * This gives exact zero/pole inheritance for products
 * and quotients from the landmark data already present.
 */
function buildDerivedLandmarks(
  landmarks,
  aId,
  bId,
  operator,
  aPower = 1,
  bPower = 1
) {
  const result = {
    zeros: [],
    poles: [],
    critical: [],
    exactGeometry:
      operator === "mul" ||
      operator === "div",
  };

  if (
    !aId ||
    !bId ||
    !result.exactGeometry
  ) {
    return result;
  }

  const orders = new Map();

  function addOrder(
    point,
    contribution,
    functionId,
    sourceKind,
    baseOrder,
    factor
  ) {
    const key =
      landmarkKey(point);

    if (!orders.has(key)) {
      orders.set(key, {
        re: point.re,
        im: point.im,
        exact:
          point.exact ||
          formatComplex(point),
        order: 0,
        contributors: [],
      });
    }

    const entry =
      orders.get(key);

    entry.order +=
      contribution;

    entry.contributors.push({
      functionId,
      functionLabel:
        FUNCTIONS[functionId].label,
      sourceKind,
      baseOrder,
      factor,
      contribution,
    });
  }

  function addFunction(
    functionId,
    factor
  ) {
    const data =
      landmarks[functionId];

    if (!data) {
      return;
    }

    const zeroMultiplicity =
      ZERO_MULTIPLICITY[
        functionId
      ] || 1;

    const poleMultiplicity =
      POLE_MULTIPLICITY[
        functionId
      ] || 1;

    data.zeros.forEach(
      (point) => {
        const baseOrder =
          zeroMultiplicity;

        addOrder(
          point,
          factor * baseOrder,
          functionId,
          "zero",
          baseOrder,
          factor
        );
      }
    );

    data.poles.forEach(
      (point) => {
        const baseOrder =
          -poleMultiplicity;

        addOrder(
          point,
          factor * baseOrder,
          functionId,
          "pole",
          baseOrder,
          factor
        );
      }
    );
  }

  addFunction(
    aId,
    aPower
  );

  addFunction(
    bId,
    (
      operator === "div"
        ? -1
        : 1
    ) * bPower
  );

  orders.forEach(
    (entry) => {
      const functionIds =
        new Set(
          entry.contributors.map(
            (contributor) =>
              contributor.functionId
          )
        );

      const isCommon =
        functionIds.size > 1;

      if (entry.order > 0) {
        result.zeros.push({
          re: entry.re,
          im: entry.im,
          exact: entry.exact,
          multiplicity:
            entry.order,
          netOrder:
            entry.order,
          isCommon,
          contributors:
            entry.contributors,
        });
      }

      if (entry.order < 0) {
        result.poles.push({
          re: entry.re,
          im: entry.im,
          exact: entry.exact,
          multiplicity:
            Math.abs(
              entry.order
            ),
          netOrder:
            entry.order,
          isCommon,
          contributors:
            entry.contributors,
        });
      }
    }
  );

  return result;
}


function buildPowerLandmarks(
  landmarks,
  exponents
) {
  const result = {
    zeros: [],
    poles: [],
    critical: [],
    exactGeometry: true,
  };

  const orders =
    new Map();

  function addOrder(
    point,
    delta,
    sourceLabel
  ) {
    const key =
      landmarkKey(point);

    if (!orders.has(key)) {
      orders.set(key, {
        re: point.re,
        im: point.im,
        exact:
          point.exact ||
          formatComplex(point),
        order: 0,
        sources: [],
      });
    }

    const entry =
      orders.get(key);

    entry.order += delta;

    entry.sources.push(
      sourceLabel
    );
  }

  Object.entries(FUNCTIONS).forEach(
    ([functionId, info]) => {
      const exponent =
        exponents[functionId] || 0;

      if (exponent === 0) {
        return;
      }

      const data =
        landmarks[functionId];

      if (!data) {
        return;
      }

      const zeroMultiplicity =
        ZERO_MULTIPLICITY[
          functionId
        ] || 1;

      const poleMultiplicity =
        POLE_MULTIPLICITY[
          functionId
        ] || 1;

      data.zeros.forEach(
        (point) => {
          addOrder(
            point,
            exponent *
              zeroMultiplicity,
            `${info.label} zero × ${exponent}`
          );
        }
      );

      data.poles.forEach(
        (point) => {
          addOrder(
            point,
            exponent *
              (-poleMultiplicity),
            `${info.label} pole × ${exponent}`
          );
        }
      );
    }
  );

  orders.forEach(
    (entry) => {
      if (entry.order > 0) {
        result.zeros.push({
          re: entry.re,
          im: entry.im,
          exact: entry.exact,
          multiplicity:
            entry.order,
          sources:
            entry.sources,
        });
      }

      if (entry.order < 0) {
        result.poles.push({
          re: entry.re,
          im: entry.im,
          exact: entry.exact,
          multiplicity:
            Math.abs(
              entry.order
            ),
          sources:
            entry.sources,
        });
      }
    }
  );

  return result;
}


function makeLandmarks(bounds) {
  const data = {
    G0: { zeros: [], poles: [], critical: [] },
    G1: {
      zeros: [],
      poles: [],
      critical: [],
    },
    G2: { zeros: [], poles: [], critical: [] },
    G3: { zeros: [], poles: [], critical: [] },
    G4: { zeros: [], poles: [], critical: [] },
  };

  integerRange(
    bounds.minY / (4 * Math.PI),
    bounds.maxY / (4 * Math.PI)
  ).forEach((n) => {
    data.G0.zeros.push({
      re: 0,
      im: 4 * Math.PI * n,
      exact:
        n === 0
          ? "0"
          : `4πi(${n})`,
    });
  });

  integerRange(
    bounds.minY / (2 * Math.PI),
    bounds.maxY / (2 * Math.PI)
  ).forEach((n) => {
    data.G0.critical.push({
      re: 0,
      im: 2 * Math.PI * n,
      exact:
        n === 0
          ? "0"
          : `2πi(${n})`,
    });
  });

  /*
   * Complete G₁ pole set.
   *
   * G₁(z) = csch(sinh(z/7))
   *
   * Poles satisfy
   *
   *     sinh(z/7) = nπi.
   *
   * There are two geometrically transparent families:
   *
   *     z = 7πik
   *
   * and, for n >= 1,
   *
   *     z = ±7 arcosh(nπ)
   *         + 7πi(k + 1/2).
   */

  const g1AxialKMin =
    Math.ceil(
      bounds.minY /
        (7 * Math.PI)
    );

  const g1AxialKMax =
    Math.floor(
      bounds.maxY /
        (7 * Math.PI)
    );

  for (
    let k = g1AxialKMin;
    k <= g1AxialKMax;
    k += 1
  ) {
    data.G1.poles.push({
      re: 0,
      im: 7 * Math.PI * k,
      exact:
        k === 0
          ? "0"
          : k > 0
          ? `${7 * k}πi`
          : `−${7 * Math.abs(k)}πi`,
    });
  }

  const g1PixelsPerUnit =
    SVG_WIDTH /
    (bounds.maxX - bounds.minX);

  function g1PoleX(n) {
    return (
      7 *
      Math.acosh(
        n * Math.PI
      )
    );
  }

  function g1InversePoleIndex(x) {
    return (
      Math.cosh(
        Math.abs(x) / 7
      ) /
      Math.PI
    );
  }

  function g1SpacingPixels(n) {
    return (
      (
        g1PoleX(n + 1) -
        g1PoleX(n)
      ) *
      g1PixelsPerUnit
    );
  }

  /*
   * Add one genuine G1 pole to the landmark set.
   *
   * displayScale shrinks smoothly as the true neighboring
   * poles get closer together on screen.
   */
  function addG1Pole(
    n,
    sign,
    y,
    verticalExact,
    sampled = false
  ) {
    if (
      !Number.isFinite(n) ||
      n < 1
    ) {
      return;
    }

    const integerN =
      Math.max(
        1,
        Math.round(n)
      );

    const absX =
      g1PoleX(integerN);

    const x =
      sign * absX;

    const epsilon =
      1e-9;

    if (
      x < bounds.minX - epsilon ||
      x > bounds.maxX + epsilon
    ) {
      return;
    }

    data.G1.poles.push({
      re: x,
      im: y,
      exact:
        `${sign < 0 ? "−" : ""}` +
        `7 arcosh(${integerN}π)` +
        verticalExact,
      sampled,
      poleIndex:
        integerN,
    });
  }

  const g1HalfRowMin =
    Math.ceil(
      bounds.minY /
        (7 * Math.PI) -
      0.5
    );

  const g1HalfRowMax =
    Math.floor(
      bounds.maxY /
        (7 * Math.PI) -
      0.5
    );

  /*
   * In the dense region we still draw only genuine poles.
   *
   * We merely avoid constructing hundreds of thousands of
   * SVG nodes that would map into the same few pixels.
   *
   * A representative actual pole is chosen approximately
   * every 2.4 screen pixels.
   */
  const g1SamplePixelStep = 2.4;

  const g1SampleWorldStep =
    g1SamplePixelStep /
    g1PixelsPerUnit;

  /*
   * Individual exact poles are drawn until their neighboring
   * separation reaches the screen-sampling interval.
   *
   * After that, actual pole indices are selected by inverting
   * x_n = 7 arcosh(nπ).
   */
  const g1ResolvedPixelSpacing =
    g1SamplePixelStep;

  for (
    let k = g1HalfRowMin;
    k <= g1HalfRowMax;
    k += 1
  ) {
    const y =
      7 *
      Math.PI *
      (k + 0.5);

    const odd =
      2 * k + 1;

    const verticalExact =
      odd > 0
        ? ` + ${7 * odd}πi/2`
        : ` − ${7 * Math.abs(odd)}πi/2`;

    for (const sign of [-1, 1]) {
      /*
       * Visible absolute-x interval for this branch.
       */
      let branchMin;
      let branchMax;

      if (sign > 0) {
        branchMin =
          Math.max(
            0,
            bounds.minX
          );

        branchMax =
          bounds.maxX;
      } else {
        branchMin =
          Math.max(
            0,
            -bounds.maxX
          );

        branchMax =
          -bounds.minX;
      }

      if (
        branchMax <= 0 ||
        branchMax < branchMin
      ) {
        continue;
      }

      /*
       * Pole n=1 begins at x_1.
       */
      const firstPoleX =
        g1PoleX(1);

      branchMin =
        Math.max(
          branchMin,
          firstPoleX
        );

      if (
        branchMin >
        branchMax
      ) {
        continue;
      }

      const visibleNMin =
        Math.max(
          1,
          Math.ceil(
            g1InversePoleIndex(
              branchMin
            ) -
            1e-10
          )
        );

      const visibleNMax =
        Math.max(
          0,
          Math.floor(
            g1InversePoleIndex(
              branchMax
            ) +
            1e-10
          )
        );

      if (
        visibleNMax <
        visibleNMin
      ) {
        continue;
      }

      /*
       * Find the first pole whose exact screen spacing has
       * become smaller than our display sampling interval.
       */
      let firstDenseN = null;

      if (
        g1SpacingPixels(
          visibleNMin
        ) <
        g1ResolvedPixelSpacing
      ) {
        firstDenseN =
          visibleNMin;
      } else if (
        g1SpacingPixels(
          visibleNMax
        ) <
        g1ResolvedPixelSpacing
      ) {
        let low =
          visibleNMin;

        let high =
          visibleNMax;

        while (
          low + 1 <
          high
        ) {
          const mid =
            Math.floor(
              (low + high) / 2
            );

          if (
            g1SpacingPixels(mid) <
            g1ResolvedPixelSpacing
          ) {
            high = mid;
          } else {
            low = mid;
          }
        }

        firstDenseN =
          high;
      }

      /*
       * Part 1:
       * draw every exact pole while they remain resolvable.
       */
      const exactNMax =
        firstDenseN === null
          ? visibleNMax
          : Math.max(
              visibleNMin - 1,
              firstDenseN - 1
            );

      for (
        let n = visibleNMin;
        n <= exactNMax;
        n += 1
      ) {
        addG1Pole(
          n,
          sign,
          y,
          verticalExact,
          false
        );
      }

      /*
       * Part 2:
       * the pole sequence may contain hundreds of thousands
       * of members here.
       *
       * Walk across DISPLAY x instead of n. At each screen
       * sample, invert x_n and select the nearest genuine pole.
       *
       * Thus every dot/cross shown below is still exactly at
       * x_n = 7 arcosh(nπ), and the sequence reaches the edge
       * of the viewport instead of stopping.
       */
      if (
        firstDenseN !== null
      ) {
        const denseStartX =
          Math.max(
            branchMin,
            g1PoleX(
              firstDenseN
            )
          );

        let previousN = null;

        for (
          let targetX = denseStartX;
          targetX <= branchMax;
          targetX += g1SampleWorldStep
        ) {
          let n =
            Math.round(
              g1InversePoleIndex(
                targetX
              )
            );

          n =
            Math.max(
              firstDenseN,
              Math.min(
                visibleNMax,
                n
              )
            );

          if (
            n === previousN
          ) {
            continue;
          }

          previousN = n;

          addG1Pole(
            n,
            sign,
            y,
            verticalExact,
            true
          );
        }

        /*
         * Guarantee that the outermost visible genuine pole
         * is represented too.
         */
        if (
          visibleNMax >=
          firstDenseN &&
          visibleNMax !== previousN
        ) {
          addG1Pole(
            visibleNMax,
            sign,
            y,
            verticalExact,
            true
          );
        }
      }
    }
  }

  const g2Start = Math.max(0, Math.ceil(-bounds.maxX / 4));
  const g2End = Math.max(g2Start, Math.floor(-bounds.minX / 4));

  for (let n = g2Start; n <= g2End; n += 1) {
    data.G2.poles.push({
      re: -4 * n,
      im: 0,
      exact:
        n === 0
          ? "0"
          : `−4(${n})`,
    });
  }

  const g3RealStart = Math.ceil(
    ((14 * bounds.minX) / (5 * Math.PI) - 1) / 2
  );

  const g3RealEnd = Math.floor(
    ((14 * bounds.maxX) / (5 * Math.PI) - 1) / 2
  );

  for (let n = g3RealStart; n <= g3RealEnd; n += 1) {
    data.G3.zeros.push({
      re: (5 * (2 * n + 1) * Math.PI) / 14,
      im: 0,
      exact:
        `5(${2 * n + 1})π/14`,
    });
  }

  const g3ImagStart = Math.ceil(
    ((5 * bounds.minY) / Math.PI - 1) / 2
  );

  const g3ImagEnd = Math.floor(
    ((5 * bounds.maxY) / Math.PI - 1) / 2
  );

  for (let n = g3ImagStart; n <= g3ImagEnd; n += 1) {
    data.G3.zeros.push({
      re: 0,
      im: ((2 * n + 1) * Math.PI) / 5,
      exact:
        `${2 * n + 1}πi/5`,
    });
  }

  const g4ZeroStart = Math.ceil(
    ((14 * bounds.minX) / (5 * Math.PI) - 1) / 2
  );

  const g4ZeroEnd = Math.floor(
    ((14 * bounds.maxX) / (5 * Math.PI) - 1) / 2
  );

  for (let n = g4ZeroStart; n <= g4ZeroEnd; n += 1) {
    data.G4.zeros.push({
      re: (5 * (2 * n + 1) * Math.PI) / 14,
      im: 0,
      exact:
        `5(${2 * n + 1})π/14`,
    });
  }

  const g4CriticalStart = Math.ceil(
    (14 * bounds.minX) / (5 * Math.PI)
  );

  const g4CriticalEnd = Math.floor(
    (14 * bounds.maxX) / (5 * Math.PI)
  );

  for (let n = g4CriticalStart; n <= g4CriticalEnd; n += 1) {
    data.G4.critical.push({
      re: (5 * Math.PI * n) / 14,
      im: 0,
      exact:
        n === 0
          ? "0"
          : `5π(${n})/14`,
    });
  }

  return data;
}

function landmarkKey(point) {
  const scale = 1e9;

  const re =
    Math.round(point.re * scale);

  const im =
    Math.round(point.im * scale);

  return `${re}:${im}`;
}

function groupLandmarks(
  landmarks,
  active,
  show
) {
  const groups = new Map();

  Object.entries(FUNCTIONS).forEach(
    ([functionId, info]) => {
      if (!active[functionId]) {
        return;
      }

      [
        ["zeros", "zero"],
        ["poles", "pole"],
        ["critical", "critical"],
      ].forEach(([sourceType, eventType]) => {
        if (!show[sourceType]) {
          return;
        }

        landmarks[functionId][sourceType]
          .forEach((point) => {
            const key =
              landmarkKey(point);

            if (!groups.has(key)) {
              groups.set(key, {
                re: point.re,
                im: point.im,
                exact:
                  point.exact ||
                  formatComplex(point),
                events: [],
              });
            }

            groups.get(key).events.push({
              functionId,
              functionLabel:
                info.label,
              color:
                info.color,
              type:
                eventType,
            });
          });
      });
    }
  );

  return Array.from(
    groups.values()
  );
}

function greatestCommonDivisor(a, b) {
  let x =
    Math.abs(a);

  let y =
    Math.abs(b);

  while (y !== 0) {
    const remainder =
      x % y;

    x = y;
    y = remainder;
  }

  return x || 1;
}


function reduceExactPiLabel(label) {
  if (!label) {
    return label;
  }

  /*
   * Match labels of the form:
   *
   *   35πi/5
   *   −35πi/5
   *   35π/5
   *
   * and reduce the integer coefficient fraction.
   */
  const match =
    String(label).match(
      /^([−-]?)(\d+)π(i?)\/(\d+)$/
    );

  if (!match) {
    return label;
  }

  const sign =
    match[1] ? "−" : "";

  const numerator =
    Number(match[2]);

  const imaginary =
    match[3];

  const denominator =
    Number(match[4]);

  if (
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator) ||
    denominator === 0
  ) {
    return label;
  }

  const divisor =
    greatestCommonDivisor(
      numerator,
      denominator
    );

  const reducedNumerator =
    numerator / divisor;

  const reducedDenominator =
    denominator / divisor;

  const coefficient =
    reducedNumerator === 1
      ? ""
      : String(reducedNumerator);

  if (reducedDenominator === 1) {
    return (
      `${sign}${coefficient}π${imaginary}`
    );
  }

  return (
    `${sign}${reducedNumerator}π${imaginary}` +
    `/${reducedDenominator}`
  );
}


function signedOrder(value) {
  if (value > 0) {
    return `+${value}`;
  }

  return `${value}`;
}


function eventDescription(event) {
  if (event.type === "zero") {
    return `${event.functionLabel}: zero`;
  }

  if (event.type === "pole") {
    return `${event.functionLabel}: pole`;
  }

  return `${event.functionLabel}: critical`;
}

function marker(
  type,
  x,
  y,
  color,
  key,
  scale = 1
) {
  if (type === "zero") {
    return (
      <g key={key}>
        <circle
          cx={x}
          cy={y}
          r={6 * scale}
          fill="#080808"
          stroke={color}
          strokeWidth={
            Math.max(
              1,
              2 * scale
            )
          }
        />

        <circle
          cx={x}
          cy={y}
          r={
            Math.max(
              0.8,
              2 * scale
            )
          }
          fill={color}
        />
      </g>
    );
  }

  if (type === "pole") {
    return (
      <g key={key}>
        <circle
          cx={x}
          cy={y}
          r={7 * scale}
          fill="#080808"
          stroke={color}
          strokeWidth={
            Math.max(
              0.9,
              1.5 * scale
            )
          }
        />

        <line
          x1={x - 5 * scale}
          y1={y - 5 * scale}
          x2={x + 5 * scale}
          y2={y + 5 * scale}
          stroke={color}
          strokeWidth={
            Math.max(
              0.9,
              2 * scale
            )
          }
        />

        <line
          x1={x + 5 * scale}
          y1={y - 5 * scale}
          x2={x - 5 * scale}
          y2={y + 5 * scale}
          stroke={color}
          strokeWidth={
            Math.max(
              0.9,
              2 * scale
            )
          }
        />
      </g>
    );
  }

  return (
    <rect
      key={key}
      x={x - 4 * scale}
      y={y - 4 * scale}
      width={8 * scale}
      height={8 * scale}
      fill="#080808"
      stroke={color}
      strokeWidth={
        Math.max(
          0.9,
          1.8 * scale
        )
      }
      transform={`rotate(45 ${x} ${y})`}
    />
  );
}


// Shared mathematical sampler for the 2D and 3D phase views.
// The returned color uses exactly the existing domain coloring.
export function sampleSignedGPhase(
  id, re, im, inverted = false, hueDegrees = 180
) {
  const point = { re, im };
  const z = inverted ? invertComplexArgument(point) : point;
  const polar = evaluateSingleGLogPolar(id, z);

  return {
    logAbs: polar.logAbs,
    arg: polar.arg,
    rgba: derivedDomainColorLogPolar(
      polar, hueDegrees / 360
    ),
  };
}

export function renderSignedGPhase(
  canvas, id, halfWidth, inverted = false, hueDegrees = 180,
  centerRe = 0, centerIm = 0
) {
  if (!canvas || !(halfWidth > 0)) return;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) return;

  const width = canvas.width;
  const height = canvas.height;
  const halfHeight = halfWidth * height / width;
  const image = context.createImageData(width, height);
  const pixels = image.data;

  for (let py = 0; py < height; py++) {
    const im = centerIm + halfHeight * (1 - 2 * (py + 0.5) / height);

    for (let px = 0; px < width; px++) {
      const re = centerRe + halfWidth * (2 * (px + 0.5) / width - 1);
      const position = { re, im };
      const z = inverted ? invertComplexArgument(position) : position;

      const rgba = derivedDomainColorLogPolar(
        evaluateSingleGLogPolar(id, z),
        hueDegrees / 360
      );

      const offset = 4 * (py * width + px);
      pixels[offset] = rgba[0];
      pixels[offset + 1] = rgba[1];
      pixels[offset + 2] = rgba[2];
      pixels[offset + 3] = 255;
    }
  }

  context.putImageData(image, 0, 0);
}

export default function GFunctionsExplorer() {
  const svgRef = useRef(null);
  const domainCanvasRef = useRef(null);
  const dragRef = useRef(null);

  const [center, setCenter] = useState({ re: 0, im: 0 });
  const [spanX, setSpanX] = useState(34);

  // Fixed limits shared by all three tabs.
  const scaleLimits = { min: 0.00217847, max: 423.862 };

  const scaleSliderValue =
    1000 *
    Math.log(spanX / scaleLimits.min) /
    Math.log(scaleLimits.max / scaleLimits.min);

  const setScaleFromSlider = value => {
    const fraction = Number(value) / 1000;
    setSpanX(
      scaleLimits.min *
      Math.pow(
        scaleLimits.max / scaleLimits.min,
        fraction
      )
    );
  };
  const [scalePlaying, setScalePlaying] = useState(false);
  const [wheelZoomEnabled, setWheelZoomEnabled] = useState(false);

  // One logarithmic sweep, 70 seconds per direction.
  useEffect(() => {
    if (!scalePlaying) return;

    const minLog = Math.log(scaleLimits.min);
    const logRange = Math.log(scaleLimits.max) - minLog;
    let position = Math.max(0, Math.min(1,
      (Math.log(spanX) - minLog) / logRange
    ));
    let direction = position >= 1 ? -1 : 1;
    let lastTime = performance.now();

    const timer = window.setInterval(() => {
      const now = performance.now();
      const delta = Math.min((now - lastTime) / 70000, 0.05);
      lastTime = now;

      position += direction * delta;

      if (position >= 1) {
        position = 2 - position;
        direction = -1;
      } else if (position <= 0) {
        position = -position;
        direction = 1;
      }

      setSpanX(Math.exp(minLog + logRange * position));
    }, 100);

    return () => window.clearInterval(timer);
  }, [scalePlaying]);

  const [probe, setProbe] = useState({
    re: 1,
    im: 0,
  });

  const [showProbe, setShowProbe] =
    useState(false);

  const [viewMode, setViewMode] =
    useState("shared");

  /*
   * Shared mode can optionally domain-color ONE G-function
   * behind the multi-function landmark geometry.
   *
   * null = black background
   * "G0"..."G4" = that function's domain-colored field
   */
  const [sharedField, setSharedField] =
    useState(null);

  const [sharedInvertedField, setSharedInvertedField] =
    useState(null);

  const invertedHueDegrees = 180;

  const [planckId, setPlanckId] =
    useState("G0");

   const [planckSheet, setPlanckSheet] =
    useState(0);

  const [planckDisplay, setPlanckDisplay] =
    useState("field");

  const [planckA, setPlanckA] = useState("G0");
  const [planckB, setPlanckB] = useState(null);
  const [planckOp, setPlanckOp] = useState("div");
  const [planckArgument, setPlanckArgument] = useState("z");

  const [
    planckContinuationIndex,
    setPlanckContinuationIndex,
  ] = useState(0);

  const [
    planckLoopScale,
    setPlanckLoopScale,
  ] = useState(0.16);

  const [
    planckTraversalProgress,
    setPlanckTraversalProgress,
  ] = useState(0);

  const [
    planckTraversalDirection,
    setPlanckTraversalDirection,
  ] = useState(1);

  const [
    planckTraversalPlaying,
    setPlanckTraversalPlaying,
  ] = useState(false);

  const traversalAnimationRef =
    useRef(null);

  const traversalStartTimeRef =
    useRef(null);

  const [algebraA, setAlgebraA] =
    useState(null);

  const [algebraAPower, setAlgebraAPower] =
    useState(1);

  const [algebraB, setAlgebraB] =
    useState(null);

  const [algebraBPower, setAlgebraBPower] =
    useState(1);

  const [algebraOp, setAlgebraOp] =
    useState("div");

  const [algebraArgument, setAlgebraArgument] =
    useState("z");

  const [pendingOperator, setPendingOperator] =
    useState(false);

  const [showDerived, setShowDerived] =
    useState(true);

  const [selectedLandmark, setSelectedLandmark] =
    useState(null);

  const [lastTransform, setLastTransform] =
    useState(null);

  const [active, setActive] = useState({
    G0: true,
    G1: true,
    G2: true,
    G3: true,
    G4: true,
  });

  const [show, setShow] = useState({
    zeros: true,
    poles: true,
    critical: true,
    shifts: false,
  });

  const spanY = spanX * SVG_HEIGHT / SVG_WIDTH;

  const bounds = useMemo(
    () => ({
      minX: center.re - spanX / 2,
      maxX: center.re + spanX / 2,
      minY: center.im - spanY / 2,
      maxY: center.im + spanY / 2,
    }),
    [center, spanX, spanY]
  );

  const landmarks = useMemo(
    () => makeLandmarks(bounds),
    [bounds]
  );

  const probeValues = useMemo(
    () => evaluateGValues(probe),
    [probe]
  );

  const algebraReady =
    Boolean(
      algebraA &&
      algebraB
    );

  const algebraGraphReady =
    Boolean(algebraA);

  const derivedExpression =
    algebraExpression(
      algebraA,
      algebraB,
      algebraOp,
      algebraAPower,
      algebraBPower
    );

  const derivedValue = useMemo(
    () => {
      if (!algebraReady) {
        return null;
      }

      return combineGValues(
        probeValues[algebraA],
        probeValues[algebraB],
        algebraOp
      );
    },
    [
      algebraReady,
      probeValues,
      algebraA,
      algebraB,
      algebraOp,
      algebraAPower,
      algebraBPower,
    ]
  );

  const derivedLandmarks = useMemo(
    () =>
      buildDerivedLandmarks(
        landmarks,
        algebraA,
        algebraB,
        algebraOp,
        algebraAPower,
        algebraBPower
      ),
    [
      landmarks,
      algebraA,
      algebraB,
      algebraOp,
    ]
  );

  const derivedCommonPoints =
    useMemo(
      () => [
        ...derivedLandmarks.zeros.map(
          (point) => ({
            ...point,
            resultKind: "zero",
          })
        ),
        ...derivedLandmarks.poles.map(
          (point) => ({
            ...point,
            resultKind: "pole",
          })
        ),
      ].filter(
        (point) =>
          point.isCommon
      ),
      [derivedLandmarks]
    );


  /*
   * In Continuation mode the relevant landmarks are the
   * divisor of the selected G_k:
   *
   *   positive order -> zero
   *   negative order -> pole
   */
  const planckContinuationCandidates =
    useMemo(() => {
      const data =
        landmarks[planckId];

      if (!data) {
        return [];
      }

      const zeroOrder =
        ZERO_MULTIPLICITY[
          planckId
        ] || 1;

      const poleOrder =
        POLE_MULTIPLICITY[
          planckId
        ] || 1;

      return [
        ...data.zeros.map(
          (point) => ({
            ...point,
            kind: "zero",
            order:
              zeroOrder,
          })
        ),

        ...data.poles.map(
          (point) => ({
            ...point,
            kind: "pole",
            order:
              -poleOrder,
          })
        ),
      ].sort(
        (a, b) => {
          const da =
            Math.hypot(
              a.re - center.re,
              a.im - center.im
            );

          const db =
            Math.hypot(
              b.re - center.re,
              b.im - center.im
            );

          return da - db;
        }
      );
    }, [
      landmarks,
      planckId,
      center,
    ]);


  useEffect(() => {
    setPlanckContinuationIndex(
      0
    );
    setPlanckTraversalProgress(0);
    setPlanckTraversalPlaying(false);
  }, [planckId]);


  useEffect(() => {
    if (
      planckDisplay !==
      "continuation"
    ) {
      setPlanckTraversalPlaying(
        false
      );
    }
  }, [planckDisplay]);


  /*
   * Animate one complete circuit in about 3.2 seconds.
   */
  useEffect(() => {
    if (!planckTraversalPlaying) {
      traversalStartTimeRef.current =
        null;

      if (
        traversalAnimationRef.current
      ) {
        cancelAnimationFrame(
          traversalAnimationRef.current
        );

        traversalAnimationRef.current =
          null;
      }

      return;
    }

    const durationMs = 3200;

    function animate(timestamp) {
      if (
        traversalStartTimeRef.current ===
        null
      ) {
        traversalStartTimeRef.current =
          timestamp;
      }

      const progress =
        Math.min(
          1,
          (
            timestamp -
            traversalStartTimeRef.current
          ) /
          durationMs
        );

      setPlanckTraversalProgress(
        progress
      );

      if (progress >= 1) {
        setPlanckTraversalPlaying(
          false
        );

        return;
      }

      traversalAnimationRef.current =
        requestAnimationFrame(
          animate
        );
    }

    traversalAnimationRef.current =
      requestAnimationFrame(
        animate
      );

    return () => {
      if (
        traversalAnimationRef.current
      ) {
        cancelAnimationFrame(
          traversalAnimationRef.current
        );
      }

      traversalAnimationRef.current =
        null;
      traversalStartTimeRef.current =
        null;
    };
  }, [planckTraversalPlaying]);


  const planckContinuationTarget =
    planckContinuationCandidates.length
      ? planckContinuationCandidates[
          (
            planckContinuationIndex %
              planckContinuationCandidates.length +
            planckContinuationCandidates.length
          ) %
            planckContinuationCandidates.length
        ]
      : null;


  /*
   * Keep the loop small enough not to enclose the neighboring
   * divisor point.
   */
  const planckContinuationRadius =
    useMemo(() => {
      if (
        !planckContinuationTarget
      ) {
        return 0;
      }

      let nearest =
        Infinity;

      planckContinuationCandidates.forEach(
        (point) => {
          if (
            point ===
            planckContinuationTarget
          ) {
            return;
          }

          const distance =
            Math.hypot(
              point.re -
                planckContinuationTarget.re,

              point.im -
                planckContinuationTarget.im
            );

          if (
            distance > 1e-9 &&
            distance < nearest
          ) {
            nearest =
              distance;
          }
        }
      );

      const reference =
        Number.isFinite(nearest)
          ? nearest
          : spanX * 0.2;

      return Math.max(
        spanX * 0.012,

        Math.min(
          spanX * 0.12,
          reference *
            planckLoopScale
        )
      );
    }, [
      planckContinuationTarget,
      planckContinuationCandidates,
      spanX,
      planckLoopScale,
    ]);


  const planckContinuation =
    useMemo(
      () =>
        buildPlanckContinuation(
          planckId,
          planckContinuationTarget,
          planckContinuationRadius,
          planckSheet,
          planckTraversalDirection
        ),
      [
        planckId,
        planckContinuationTarget,
        planckContinuationRadius,
        planckSheet,
        planckTraversalDirection,
      ]
    );


  /*
   * Build the mini lifted-coordinate plot.
   *
   * For Planck quantity, this uses the actual
   *
   *     P_k = φ_k 10^n_k
   *
   * values. The mini SVG then fits those coordinates to its own
   * frame, so even 10^-44 remains visible without altering the
   * mathematical path.
   */
  const planckLiftedPath =
    useMemo(() => {
      if (
        !planckContinuation ||
        !planckContinuation.points.length
      ) {
        return "";
      }

      const scale = 1;

      const values =
        planckContinuation.points.map(
          (point) => ({
            re:
              point.phi.re *
              scale,

            im:
              point.phi.im *
              scale,
          })
        );

      const visibleCount =
        Math.max(
          1,
          Math.min(
            values.length,
            Math.round(
              planckTraversalProgress *
              (values.length - 1)
            ) + 1
          )
        );

      const visibleValues =
        values.slice(
          0,
          visibleCount
        );

      const finite =
        values.filter(
          (value) =>
            Number.isFinite(
              value.re
            ) &&
            Number.isFinite(
              value.im
            )
        );

      if (!finite.length) {
        return "";
      }

      const minRe =
        Math.min(
          ...finite.map(
            (value) =>
              value.re
          )
        );

      const maxRe =
        Math.max(
          ...finite.map(
            (value) =>
              value.re
          )
        );

      const minIm =
        Math.min(
          ...finite.map(
            (value) =>
              value.im
          )
        );

      const maxIm =
        Math.max(
          ...finite.map(
            (value) =>
              value.im
          )
        );

      const width = 260;
      const height = 150;
      const padding = 14;

      const spanRe =
        Math.max(
          1e-30,
          maxRe - minRe
        );

      const spanIm =
        Math.max(
          1e-30,
          maxIm - minIm
        );

      return visibleValues
        .map((value) => {
          const x =
            padding +
            (
              (
                value.re -
                minRe
              ) /
              spanRe
            ) *
              (
                width -
                2 * padding
              );

          const y =
            height -
            padding -
            (
              (
                value.im -
                minIm
              ) /
              spanIm
            ) *
              (
                height -
                2 * padding
              );

          return `${x},${y}`;
        })
        .join(" ");
    }, [
      planckContinuation,
      planckId,
      planckTraversalProgress,
    ]);


  const planckTraversalPoint =
    useMemo(() => {
      if (
        !planckContinuation ||
        !planckContinuation.points.length
      ) {
        return null;
      }

      const index =
        Math.max(
          0,
          Math.min(
            planckContinuation.points.length - 1,
            Math.round(
              planckTraversalProgress *
              (
                planckContinuation.points.length -
                1
              )
            )
          )
        );

      return planckContinuation.points[
        index
      ];
    }, [
      planckContinuation,
      planckTraversalProgress,
    ]);


  const planckTraversalDeltaPhi =
    useMemo(() => {
      if (
        !planckContinuation ||
        !planckTraversalPoint ||
        !planckContinuation.points.length
      ) {
        return null;
      }

      const first =
        planckContinuation.points[0].phi;

      const current =
        planckTraversalPoint.phi;

      return {
        re:
          current.re -
          first.re,

        im:
          current.im -
          first.im,
      };
    }, [
      planckContinuation,
      planckTraversalPoint,
    ]);


  useEffect(() => {
    const canvas =
      domainCanvasRef.current;

    if (!canvas) {
      return;
    }

    const context =
      canvas.getContext(
        "2d"
      );

    if (!context) {
      return;
    }

    /*
     * Clear H completely whenever Compare is incomplete
     * or H has been hidden.
     */
    const showSharedField =
      viewMode === "shared" &&
      Boolean(sharedField || sharedInvertedField);

    const showAlgebraField =
      viewMode === "algebra" &&
      algebraGraphReady &&
      showDerived;

    const showPlanckField =
      viewMode === "planck";

    if (
      !showSharedField &&
      !showAlgebraField &&
      !showPlanckField
    ) {
      context.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
      );

      return;
    }

    /*
     * Sharper domain-color rendering.
     *
     * The previous internal width=190 was being stretched to the
     * full viewer width, which made the graph look fuzzy.
     *
     * Here we render at a substantially higher internal resolution
     * and also account for devicePixelRatio.
     */
    const deviceScale =
      typeof window === "undefined"
        ? 1
        : Math.min(
            2,
            window.devicePixelRatio || 1
          );

    const baseWidth =
      Math.max(
        640,
        Math.min(
          900,
          Math.round(SVG_WIDTH * 0.8)
        )
      );

    const width =
      Math.round(
        baseWidth * deviceScale
      );

    const height =
      Math.round(
        width *
        SVG_HEIGHT /
        SVG_WIDTH
      );

    canvas.width = width;
    canvas.height = height;

    context.setTransform(
      1,
      0,
      0,
      1,
      0,
      0
    );

    context.clearRect(
      0,
      0,
      width,
      height
    );

    context.imageSmoothingEnabled = true;

    const image =
      context.createImageData(
        width,
        height
      );

    const pixels =
      image.data;

    for (
      let py = 0;
      py < height;
      py += 1
    ) {
      const im =
        bounds.maxY -
        (
          (py + 0.5) /
          height
        ) *
          (
            bounds.maxY -
            bounds.minY
          );

      for (
        let px = 0;
        px < width;
        px += 1
      ) {
        const re =
          bounds.minX +
          (
            (px + 0.5) /
            width
          ) *
            (
              bounds.maxX -
              bounds.minX
            );

        const z = {
          re,
          im,
        };

        const algebraZ =
          viewMode === "algebra" &&
          algebraArgument === "inverse"
            ? invertComplexArgument(z)
            : z;

        let pixelColor;

        if (
          viewMode === "shared"
        ) {
          const fieldId =
            sharedInvertedField || sharedField;

          const argument =
            sharedInvertedField
              ? invertComplexArgument(z)
              : z;

          pixelColor =
            derivedDomainColorLogPolar(
              evaluateSingleGLogPolar(
                fieldId,
                argument
              ),
              sharedInvertedField
                ? invertedHueDegrees / 360
                : 0
            );
        } else if (
          viewMode === "planck"
        ) {
          let sampleZ = z;
          let sampleSheet = planckSheet;

          if (planckDisplay === "stack") {
            const bandCount =
              PLANCK_STACK_OFFSETS.length;

            const bandHeight =
              height / bandCount;

            const bandIndex = Math.max(
              0,
              Math.min(
                bandCount - 1,
                Math.floor(py / bandHeight)
              )
            );

            const localY =
              py - bandIndex * bandHeight;

            sampleZ = {
              re,

              im:
                bounds.maxY -
                ((localY + 0.5) / bandHeight) *
                  (bounds.maxY - bounds.minY),
            };

            sampleSheet =
              planckSheet +
              PLANCK_STACK_OFFSETS[bandIndex];
          }

          const planckArgumentZ =
            planckArgument === "inverse"
              ? invertComplexArgument(sampleZ)
              : sampleZ;

          pixelColor = planckDisplay === "algebra"
            ? derivedDomainColorLogPolar(
                evaluatePlanckAlgebra(
                  planckA,
                  planckB,
                  planckOp,
                  planckArgumentZ,
                  sampleSheet
                )
              )
            : planckDomainColor(
                evaluatePlanckLogPolar(
                  planckId,
                  planckArgumentZ,
                  sampleSheet,
                  "phi"
                ),
                planckId,
                "phi"
              );

          /*
           * In stack mode, brighten the preimage of the
           * principal Log branch cut:
           *
           *     n_k / G_k(z) ∈ (-∞, 0].
           *
           * On the principal logarithm this is where
           *
           *     Im φ_k = ±π.
           *
           * This is the seam across which analytic continuation
           * passes to an adjacent sheet.
           */
          if (planckDisplay === "stack") {
            const principalPhi =
              evaluatePhiComplex(
                planckId,
                planckArgumentZ,
                0
              );

            const seamDistance =
              Math.abs(
                Math.PI -
                Math.abs(
                  normalizeAngle(
                    principalPhi.im
                  )
                )
              );

            if (seamDistance < 0.07) {
              pixelColor = [
                Math.round(
                  pixelColor[0] *
                    0.3 +
                  255 *
                    0.7
                ),

                Math.round(
                  pixelColor[1] *
                    0.3 +
                  255 *
                    0.7
                ),

                Math.round(
                  pixelColor[2] *
                    0.3 +
                  255 *
                    0.7
                ),

                255,
              ];
            }
          }
        } else if (!algebraB) {
          pixelColor =
            derivedDomainColorLogPolar(
              logPolarIntegerPow(
                evaluateSingleGLogPolar(
                  algebraA,
                  algebraZ
                ),
                algebraAPower
              )
            );
        } else if (
          algebraOp === "mul" ||
          algebraOp === "div"
        ) {
          const aPolar =
            logPolarIntegerPow(
              evaluateSingleGLogPolar(
                algebraA,
                algebraZ
              ),
              algebraAPower
            );

          const bPolar =
            logPolarIntegerPow(
              evaluateSingleGLogPolar(
                algebraB,
                algebraZ
              ),
              algebraBPower
            );

          pixelColor =
            derivedDomainColorLogPolar(
              algebraOp === "mul"
                ? logPolarMul(
                    aPolar,
                    bPolar
                  )
                : logPolarDiv(
                    aPolar,
                    bPolar
                  )
            );
        } else {
          /*
           * For + and −, raise each operand first and then
           * perform ordinary complex addition/subtraction.
           */
          const aValue =
            complexIntegerPow(
              evaluateSingleG(
                algebraA,
                algebraZ
              ),
              algebraAPower
            );

          const bValue =
            complexIntegerPow(
              evaluateSingleG(
                algebraB,
                algebraZ
              ),
              algebraBPower
            );

          pixelColor =
            derivedDomainColor(
              combineGValues(
                aValue,
                bValue,
                algebraOp
              )
            );
        }

        const [
          red,
          green,
          blue,
          alpha,
        ] = pixelColor;

        const offset =
          4 *
          (
            py * width +
            px
          );

        pixels[
          offset
        ] = red;

        pixels[
          offset + 1
        ] = green;

        pixels[
          offset + 2
        ] = blue;

        pixels[
          offset + 3
        ] = alpha;
      }
    }

    context.putImageData(
      image,
      0,
      0
    );
  }, [
    bounds,
    viewMode,
    sharedField,
    sharedInvertedField,
    invertedHueDegrees,
    planckId,
    planckSheet,
    planckDisplay,
    planckA,
    planckB,
    planckOp,
    planckArgument,
    algebraGraphReady,
    algebraA,
    algebraB,
    algebraOp,
    algebraAPower,
    algebraBPower,
    algebraArgument,
    showDerived,
  ]);


  const groupedLandmarks = useMemo(
    () =>
      groupLandmarks(
        landmarks,
        active,
        show
      ),
    [
      landmarks,
      active,
      show,
    ]
  );

  const lastTransformValues =
    useMemo(() => {
      if (!lastTransform) {
        return null;
      }

      return {
        before:
          evaluateGValues(
            lastTransform.before
          ),
        after:
          evaluateGValues(
            lastTransform.after
          ),
      };
    }, [lastTransform]);

  function toScreen(point) {
    return {
      x:
        ((point.re - bounds.minX) /
          (bounds.maxX - bounds.minX)) *
        SVG_WIDTH,
      y:
        SVG_HEIGHT -
        ((point.im - bounds.minY) /
          (bounds.maxY - bounds.minY)) *
          SVG_HEIGHT,
    };
  }

  function screenToComplex(clientX, clientY) {
    const svg = svgRef.current;
    if (!svg) return probe;

    const rect = svg.getBoundingClientRect();

    const px =
      ((clientX - rect.left) / rect.width) *
      SVG_WIDTH;

    const py =
      ((clientY - rect.top) / rect.height) *
      SVG_HEIGHT;

    return {
      re:
        bounds.minX +
        (px / SVG_WIDTH) *
          (bounds.maxX - bounds.minX),

      im:
        bounds.maxY -
        (py / SVG_HEIGHT) *
          (bounds.maxY - bounds.minY),
    };
  }

  function handlePointerDown(event) {
    event.currentTarget.setPointerCapture(event.pointerId);

    dragRef.current = {
      mode: "pan",
      startX: event.clientX,
      startY: event.clientY,
      center,
    };
  }

  function handleProbeDown(event) {
    event.stopPropagation();

    dragRef.current = {
      mode: "probe",
    };
  }

  function handlePointerMove(event) {
    if (!dragRef.current) return;

    if (dragRef.current.mode === "probe") {
      setProbe(
        screenToComplex(
          event.clientX,
          event.clientY
        )
      );
      return;
    }

    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();

    const dx =
      event.clientX - dragRef.current.startX;

    const dy =
      event.clientY - dragRef.current.startY;

    setCenter({
      re:
        dragRef.current.center.re -
        (dx / rect.width) * spanX,

      im:
        dragRef.current.center.im +
        (dy / rect.height) * spanY,
    });
  }

  function handlePointerUp() {
    dragRef.current = null;
  }

  function handleWheel(event) {
    if (!wheelZoomEnabled) {
      return;
    }

    event.preventDefault();
    setScalePlaying(false);

    const factor = Math.exp(
      event.deltaY * 0.001
    );

    setSpanX(current =>
      Math.max(
        scaleLimits.min,
        Math.min(scaleLimits.max, current * factor)
      )
    );
  }

  function applyProbeTransform(
    label,
    transform
  ) {
    setProbe((current) => {
      const next =
        transform(current);

      setLastTransform({
        label,
        before: current,
        after: next,
      });

      return next;
    });
  }

  const transformChecks =
    useMemo(() => {
      if (
        !lastTransform ||
        !lastTransformValues
      ) {
        return [];
      }

      const before =
        lastTransformValues.before;

      const after =
        lastTransformValues.after;

      const z =
        lastTransform.before;

      switch (lastTransform.label) {
        case "−z":
          return [
            {
              label:
                "G₀(−z) = G₀(z)",
              value:
                residual(
                  after.G0,
                  before.G0
                ),
            },
            {
              label:
                "G₁(−z) = −G₁(z)",
              value:
                residual(
                  after.G1,
                  complexScale(
                    before.G1,
                    -1
                  )
                ),
            },
            {
              label:
                "G₃(−z) = G₃(z)",
              value:
                residual(
                  after.G3,
                  before.G3
                ),
            },
            {
              label:
                "G₄(−z) = G₄(z)",
              value:
                residual(
                  after.G4,
                  before.G4
                ),
            },
          ];

        case "+2πi":
          return [
            {
              label:
                "G₀(z+2πi) = π − G₀(z)",
              value:
                residual(
                  after.G0,
                  complexSub(
                    complex(Math.PI, 0),
                    before.G0
                  )
                ),
            },
          ];

        case "+7πi":
          return [
            {
              label:
                "G₁(z+7πi) = −G₁(z)",
              value:
                residual(
                  after.G1,
                  complexScale(
                    before.G1,
                    -1
                  )
                ),
            },
          ];

        case "+4":
          return [
            {
              label:
                "G₂(z+4) = (z/4)²G₂(z)",
              value:
                residual(
                  after.G2,
                  complexMul(
                    complexMul(
                      complexScale(
                        z,
                        1 / 4
                      ),
                      complexScale(
                        z,
                        1 / 4
                      )
                    ),
                    before.G2
                  )
                ),
            },
          ];

        case "+5π/14":
          return [
            {
              label:
                "G₄(z+5π/14) = −10π − G₄(z)",
              value:
                residual(
                  after.G4,
                  complexSub(
                    complex(
                      -10 * Math.PI,
                      0
                    ),
                    before.G4
                  )
                ),
            },
          ];

        default:
          return [];
      }
    }, [
      lastTransform,
      lastTransformValues,
    ]);

  const probeScreen = toScreen(probe);
  const origin = toScreen({ re: 0, im: 0 });

  const markerScale =
    Math.max(
      0.35,
      Math.min(
        1,
        34 / spanX
      )
    );

  // Approximately 10–15 grid intervals across the plane.
  const targetGridStep = spanX / 12;
  const gridMagnitude = Math.pow(
    10,
    Math.floor(Math.log10(targetGridStep))
  );
  const gridNormalized = targetGridStep / gridMagnitude;
  const gridStep =
    (gridNormalized <= 1 ? 1 :
     gridNormalized <= 2 ? 2 :
     gridNormalized <= 5 ? 5 : 10) *
    gridMagnitude;

  const xGrid = integerRange(
    bounds.minX / gridStep,
    bounds.maxX / gridStep
  ).map((n) => n * gridStep);

  const yGrid = integerRange(
    bounds.minY / gridStep,
    bounds.maxY / gridStep
  ).map((n) => n * gridStep);

  const shiftVectors = {
    G0: [
      {
        re: 0,
        im: 2 * Math.PI,
        label: "2πi",
      },
      {
        re: 0,
        im: 4 * Math.PI,
        label: "4πi",
      },
    ],

    G1: [
      {
        re: 0,
        im: 7 * Math.PI,
        label: "7πi",
      },
    ],

    G2: [
      {
        re: 4,
        im: 0,
        label: "4",
      },
    ],

    G3: [
      {
        re: (5 * Math.PI) / 7,
        im: 0,
        label: "5π/7",
      },
      {
        re: 0,
        im: (2 * Math.PI) / 5,
        label: "2πi/5",
      },
    ],

    G4: [
      {
        re: (5 * Math.PI) / 14,
        im: 0,
        label: "5π/14",
      },
      {
        re: (5 * Math.PI) / 7,
        im: 0,
        label: "5π/7",
      },
    ],
  };

  function selectAlgebraFirst(id) {
    if (algebraA === id) {
      setAlgebraAPower(
        (current) =>
          current + 1
      );
    } else {
      setAlgebraA(id);
      setAlgebraAPower(1);
    }

    setShowDerived(true);
    setSelectedLandmark(null);

    if (!algebraB) {
      setPendingOperator(false);
    }
  }

  function selectAlgebraSecond(id) {
    if (!algebraA) {
      return;
    }

    if (algebraB === id) {
      setAlgebraBPower(
        (current) =>
          current + 1
      );
    } else {
      setAlgebraB(id);
      setAlgebraBPower(1);
    }

    setPendingOperator(false);
    setShowDerived(true);
    setSelectedLandmark(null);
  }

  function handleAlgebraOperator(operator) {
    if (!algebraA) {
      return;
    }

    /*
     * Changing the operation changes ONLY the operation.
     * Existing A, B, and their powers remain intact.
     */
    setAlgebraOp(operator);

    setPendingOperator(
      !algebraB
    );

    setShowDerived(true);
    setSelectedLandmark(null);
  }

  const continuationTargetScreen =
    planckContinuationTarget
      ? toScreen(
          planckContinuationTarget
        )
      : null;

  const continuationRadiusPixels =
    planckContinuationRadius > 0
      ? (
          planckContinuationRadius /
          (
            bounds.maxX -
            bounds.minX
          )
        ) *
        SVG_WIDTH
      : 0;

  const planckTraversalPointScreen =
    planckTraversalPoint
      ? toScreen(
          planckTraversalPoint.z
        )
      : null;

  /*
   * Highlight only the part of the circuit that has actually
   * been traversed. This trail sits directly on the colored
   * Planck field, so the continuation is visible in the same
   * geometry whose phase is winding.
   */
  const planckTraversalVisibleCount =
    planckContinuation?.points?.length
      ? Math.max(
          1,
          Math.min(
            planckContinuation.points.length,
            Math.round(
              planckTraversalProgress *
              (
                planckContinuation.points.length -
                1
              )
            ) + 1
          )
        )
      : 0;

  const planckTraversalTrailPoints =
    planckTraversalVisibleCount > 1
      ? planckContinuation.points
          .slice(
            0,
            planckTraversalVisibleCount
          )
          .map((point) => {
            const screen =
              toScreen(point.z);

            return `${screen.x},${screen.y}`;
          })
          .join(" ")
      : "";

  /*
   * One logarithm sheet corresponds to 2πi.
   *
   * For a divisor of order r:
   *
   *     Δφ = -2πi r
   *
   * for one CCW circuit.
   */
  const planckFullSheetShift =
    planckContinuationTarget
      ? -planckContinuationTarget.order *
        planckTraversalDirection
      : 0;

  /*
   * This is the continuously accumulated lift, expressed in
   * units of one logarithm sheet.
   *
   * It is intentionally continuous during the animation.
   */
  const planckLiftSheetDisplacement =
    planckTraversalDeltaPhi &&
    Number.isFinite(
      planckTraversalDeltaPhi.im
    )
      ? planckTraversalDeltaPhi.im /
        (2 * Math.PI)
      : 0;

  const planckTraversalComplete =
    planckTraversalProgress >=
    0.999;


  return (
    <main className="g-functions-page">
        <style>{`
          .g-functions-page {
            height: 100dvh;
            min-height: 0;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            background: rgba(0, 0, 0, 0.35);
            color: #eeeeee;
            padding: 12px 24px 12px;
            box-sizing: border-box;
            font-family: "Times New Roman", Times, serif;
          }

          .g-title {
            margin: 0 0 4px;
            font-size: 22px;
            font-weight: 500;
          }

          .g-intro {
            margin: 0 0 12px;
            color: #bbbbbb;
            font-size: 14px;
            line-height: 1.45;
          }

          .g-toolbar {
            display: flex;
            align-items: center;
            flex-wrap: nowrap;
            gap: 8px 18px;
            overflow-x: auto;
            overflow-y: hidden;
            margin-bottom: 10px;
            padding: 9px 12px;
            background: rgba(15, 15, 15, 0.60);
            border: 1px solid #303030;
          }

          /* Shared / Algebra / Planck tabs */
          /* Floating tabs above the control panel. */
          .g-control-shell {
            position: relative;
            min-width: 0;
            min-height: 0;
            display: flex;
            flex-direction: column;
          }

          .g-control-shell > .g-side-panel {
            flex: 1 1 auto;
            min-height: 0;
            width: 100%;
            box-sizing: border-box;
          }

          .g-floating-tabs {
            position: absolute;
            left: 0;
            right: 0;
            bottom: 100%;
            z-index: 10;
            display: flex;
            justify-content: flex-start;
            align-items: flex-end;
            padding-left: 0;
            gap: 0;
          }

          .g-floating-tabs .g-floating-tab {
            flex: 1 1 0;
            min-width: 0;
            margin: 0 0 -1px;
            padding: 8px 5px;
            border: 1px solid rgba(245,239,224,0.25);
            border-radius: 6px 6px 0 0;
            background: rgba(0,0,0,0.16);
            color: rgba(245,239,224,0.72);
            font-family: inherit;
            font-size: 13px;
            line-height: 1.15;
            cursor: pointer;
          }

          .g-floating-tabs .g-floating-tab:hover {
            color: #ffffff;
            background: rgba(0,0,0,0.28);
          }

          .g-floating-tabs .g-floating-tab.active {
            background: rgba(0,0,0,0.38);
            border-color: rgba(245,239,224,0.50);
            border-bottom-color: transparent;
            color: #ffffff;
          }

          /* Toolbar controls inside the right panel. */
          .g-side-panel .g-toolbar {
            display: flex;
            flex-direction: column;
            align-items: stretch;
            gap: 13px;
            margin: 0 0 18px;
            padding: 0 0 16px;
            background: transparent;
            border: none;
            border-bottom: 1px solid rgba(255,255,255,.18);
            overflow: visible;
          }

          /* Two-column Shared controls only in stacked layout. */
          @media (max-width: 1000px) {
            .g-side-panel .g-toolbar-shared {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              column-gap: 20px;
              row-gap: 16px;
              align-items: start;
            }

            .g-side-panel .g-toolbar-shared > .g-group:first-child {
              grid-column: 1 / -1;
            }

            .g-side-panel .g-toolbar-shared > .g-group {
              min-width: 0;
            }
          }

          .g-side-panel .g-group {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 6px;
            min-width: 0;
          }

          .g-side-panel .g-group > .g-label {
            display: block;
            flex: 0 0 100%;
            margin-bottom: 2px;
            color: #e0d7c6;
            font-size: 13px;
          }

          .g-side-panel .g-group .g-button {
            flex: 0 0 auto;
            min-width: 0;
            padding: 5px 8px;
          }

          .g-group {
            display: flex;
            align-items: center;
            gap: 6px;
            flex-wrap: nowrap;
            flex: 0 0 auto;
          }

          .g-label {
            color: #999999;
            font-size: 13px;
          }

          .g-button {
            background: #222222;
            color: #dddddd;
            border: 1px solid #444444;
            padding: 5px 9px;
            font-family: "Times New Roman", Times, serif;
            font-size: 13px;
            cursor: pointer;
          }

          .g-button:hover {
            background: #303030;
          }

          .g-button.active {
            border-color: #75c7ff;
            background: #334b5f;
            color: white;
          }

          .g-layout {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 280px;
            gap: 12px;
            flex: 1 1 auto;
            min-height: 0;
            min-width: 0;
          }

          .g-plane-panel {
            position: relative;
            display: flex;
            flex-direction: column;
            min-height: 0;
            min-width: 0;
            overflow: visible;
          }

          .g-side-panel {
            min-height: 0;
            min-width: 0;
            overflow-y: auto;
            overscroll-behavior: contain;
          }

          .g-plane-panel,
          .g-side-panel {
            background: rgba(15, 15, 15, 0.60);
            border: 1px solid #303030;
          }

          .g-plane-header {
            position: absolute;
            top: 0;
            left: 0;
            z-index: 3;
            display: flex;
            justify-content: space-between;
            gap: 12px;
            padding: 8px 11px;
            background: rgba(0, 0, 0, 0.55);
            pointer-events: none;
          }

          .g-plane-title {
            font-size: 15px;
          }

          /* Plane scale: match the enlarged-photo slider. */
          #g-shared-scale {
            -webkit-appearance: none;
            appearance: none;
            height: 6px;
            padding: 0;
            border: 1px solid rgba(255, 255, 255, 0.20);
            border-radius: 999px;
            background: rgba(18, 23, 29, 0.65);
            cursor: pointer;
          }

          #g-shared-scale::-webkit-slider-runnable-track {
            height: 4px;
            border-radius: 999px;
            background: transparent;
          }

          #g-shared-scale::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 14px;
            height: 14px;
            margin-top: -5px;
            border: none;
            border-radius: 50%;
            background: #63bfee;
            cursor: grab;
          }

          #g-shared-scale::-moz-range-track {
            height: 4px;
            border: none;
            border-radius: 999px;
            background: transparent;
          }

          #g-shared-scale::-moz-range-thumb {
            width: 14px;
            height: 14px;
            border: none;
            border-radius: 50%;
            background: #63bfee;
            cursor: grab;
          }

          .g-range {
            color: #777777;
            font-family: Menlo, Monaco, Consolas, monospace;
            font-size: 10px;
          }

          .g-plane-wrap {
            position: relative;
            width: 100%;
            flex: 1 1 auto;
            min-height: 0;
            min-width: 0;
            aspect-ratio: auto;
            background: rgba(0, 0, 0, 0.72);
            overflow: visible;
          }

          .g-domain-canvas {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            display: block;
            pointer-events: none;
            z-index: 0;
            image-rendering: auto;
          }

          .g-plane {
            position: relative;
            z-index: 1;
            display: block;
            width: 100%;
            height: 100%;
            cursor: grab;
            touch-action: none;
          }

          .g-plane:active {
            cursor: grabbing;
          }

          .g-coordinate-x {
            position: absolute;
            top: 100%;
            left: 0;
            width: 100%;
            height: 18px;
            pointer-events: none;
            color: #cccccc;
            font: 10px Menlo, Monaco, Consolas, monospace;
            z-index: 3;
          }

          .g-coordinate-y {
            position: absolute;
            right: 100%;
            top: 0;
            width: 53px;
            height: 100%;
            pointer-events: none;
            color: #cccccc;
            font: 10px Menlo, Monaco, Consolas, monospace;
            z-index: 3;
          }

          .g-footer {
            position: relative;
            display: flex;
            justify-content: space-between;
            gap: 12px;
            padding: 7px 10px;
            color: #777777;
            border-top: 1px solid #303030;
            font-size: 10px;
          }

          .g-footer > span {
            position: relative;
            top: 5px;
          }

          .g-side-panel {
            padding: 12px;
          }

          .g-side-title {
            color: #ffd166;
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 8px;
          }

          .g-probe {
            background: #101010;
            border: 1px solid #333333;
            padding: 8px;
            font-family: Menlo, Monaco, Consolas, monospace;
            font-size: 12px;
            margin-bottom: 12px;
          }

          .g-function-info {
            padding: 8px 0;
            border-bottom: 1px solid #292929;
          }

          .g-function-heading {
            display: flex;
            align-items: baseline;
            gap: 8px;
            margin-bottom: 3px;
          }

          .g-function-symbol {
            font-size: 16px;
            font-weight: bold;
          }

          .g-function-formula {
            color: #bbbbbb;
            font-size: 11px;
          }

          .g-value-row {
            display: grid;
            grid-template-columns: 42px minmax(0, 1fr);
            gap: 7px;
            padding: 7px 0;
            border-bottom: 1px solid #292929;
          }

          .g-value-symbol {
            font-size: 16px;
            font-weight: bold;
          }

          .g-value-number {
            font-family: Menlo, Monaco, Consolas, monospace;
            color: #eeeeee;
            font-size: 10px;
            line-height: 1.35;
            overflow-wrap: anywhere;
          }

          .g-value-polar {
            margin-top: 2px;
            color: #777777;
            font-family: Menlo, Monaco, Consolas, monospace;
            font-size: 9px;
          }

          .g-section-divider {
            margin: 13px 0 9px;
            border-top: 1px solid #333333;
          }

          .g-compare-row {
            margin-top: 9px;
          }

          .g-compare-row:first-child {
            margin-top: 0;
          }

          .g-compare-label {
            margin-bottom: 5px;
            color: #aaaaaa;
            font-size: 11px;
          }

          .g-compare-buttons {
            display: flex;
            gap: 5px;
            flex-wrap: wrap;
          }

          .g-compare-button {
            min-width: 37px;
            padding: 4px 7px;
            background: #222222;
            color: #dddddd;
            border: 1px solid #444444;
            font-family: "Times New Roman", Times, serif;
            font-size: 12px;
            cursor: pointer;
          }

          .g-compare-button:hover {
            background: #303030;
          }

          .g-compare-button.selected {
            background: #334b5f;
            color: #ffffff;
          }

          .g-compare-expression {
            margin-top: 11px;
            padding-top: 9px;
            border-top: 1px solid #333333;
            color: #eeeeee;
            font-size: 12px;
          }

          .g-compare-expression-symbol {
            color: #ff9ff3;
            font-weight: bold;
          }

          .g-algebra-mode-buttons {
            display: flex;
            gap: 5px;
            margin-bottom: 10px;
          }

          .g-power-grid {
            display: grid;
            gap: 6px;
          }

          .g-power-row {
            display: grid;
            grid-template-columns:
              34px 30px 42px 30px;
            align-items: center;
            gap: 5px;
          }

          .g-power-symbol {
            font-size: 15px;
            font-weight: bold;
          }

          .g-power-step {
            width: 30px;
            height: 27px;
            padding: 0;
            background: #222222;
            color: #dddddd;
            border: 1px solid #444444;
            font-family: "Times New Roman", Times, serif;
            font-size: 15px;
            cursor: pointer;
          }

          .g-power-step:hover {
            background: #303030;
          }

          .g-power-input {
            width: 42px;
            height: 27px;
            box-sizing: border-box;
            padding: 2px 4px;
            text-align: center;
            background: #161616;
            color: #eeeeee;
            border: 1px solid #444444;
            font-family: Menlo, Monaco, Consolas, monospace;
            font-size: 11px;
          }

          .g-side-panel:has(.g-side-title) .g-detail-box {
            border-bottom: none;
          }

          .g-detail-box {
            padding: 8px;
            background: #101010;
            border: 1px solid #333333;
            font-size: 10px;
            line-height: 1.45;
          }

          .g-detail-coordinate {
            margin-bottom: 6px;
            color: #eeeeee;
            font-family: Menlo, Monaco, Consolas, monospace;
            font-size: 11px;
          }

          .g-event-line {
            margin: 2px 0;
          }

          .g-transform-title {
            margin-bottom: 4px;
            color: #eeeeee;
            font-size: 11px;
          }

          .g-transform-coordinate {
            color: #888888;
            font-family: Menlo, Monaco, Consolas, monospace;
            font-size: 9px;
            line-height: 1.45;
          }

          .g-check-row {
            margin-top: 5px;
            color: #bbbbbb;
            font-size: 9px;
            line-height: 1.35;
          }

          .g-check-residual {
            color: #7ee787;
            font-family: Menlo, Monaco, Consolas, monospace;
          }

          .g-note {
            margin-top: 12px;
            color: #888888;
            font-size: 10px;
            line-height: 1.45;
          }

          @media (max-width: 1000px) {
            .g-functions-page {
              height: 100dvh;
              min-height: 0;
              overflow-x: hidden;
              overflow-y: auto;
              overscroll-behavior-y: contain;
              -webkit-overflow-scrolling: touch;
            }

            .g-layout {
              grid-template-columns: 1fr;
              flex: none;
              min-height: 0;
              row-gap: 20px;
            }

            .g-plane-wrap {
              height: min(60dvh, 680px);
              flex: none;
            }

            .g-side-panel {
              overflow-y: visible;
            }

            /* In stacked layout, keep tabs in normal flow
               above the controls instead of over the graph. */
            .g-floating-tabs {
              position: static;
              left: auto;
              right: auto;
              bottom: auto;
              width: 100%;
              flex: 0 0 auto;
            }
          }
        `}</style>

        <h1 className="g-title">
          <a
            href="/g-functions"
            target="_blank"
            rel="noopener noreferrer"
            title="Open the standalone G₀–G₄ explorer"
            style={{
              color: 'inherit',
              textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            G₀–G₄ Complex Geometry
          </a>
        </h1>

        <p className="g-intro">
          Shared analytic structure of the five G-functions:
          zeros, poles, critical points, lattice directions,
          periods, and shift symmetries.
        </p>

        <div className="g-layout">
          <section className="g-plane-panel">
            <div className="g-plane-header">
              <span className="g-plane-title">
                {viewMode === "shared"
                  ? "Shared z-plane"
                  : viewMode === "algebra"
                  ? "Algebra graph"
                  : planckDisplay === "algebra"
                  ? "Planck algebra graph"
                  : `${PLANCK_BOUNDARIES[planckId].name} · ${
                      PLANCK_BOUNDARIES[planckId].phiLabel
                    }${
                      planckDisplay === "stack"
                        ? " · sheet stack"
                        : ""
                    }`}
              </span>

            </div>

            <div className="g-plane-wrap">
              <canvas
                ref={domainCanvasRef}
                className="g-domain-canvas"
              />

              <svg
                ref={svgRef}
                className="g-plane"
                viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                preserveAspectRatio="none"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onWheel={handleWheel}
              >
                <defs>
                  <marker
                    id="arrow"
                    markerWidth="8"
                    markerHeight="8"
                    refX="7"
                    refY="4"
                    orient="auto"
                  >
                    <path
                      d="M 0 0 L 8 4 L 0 8 z"
                      fill="context-stroke"
                    />
                  </marker>
                </defs>

                <rect
                  x="0"
                  y="0"
                  width={SVG_WIDTH}
                  height={SVG_HEIGHT}
                  fill={
                    (
                      viewMode === "shared" &&
                      (sharedField || sharedInvertedField)
                    ) ||
                    (
                      viewMode === "algebra" &&
                      algebraGraphReady &&
                      showDerived
                    ) ||
                    viewMode === "planck"
                      ? "transparent"
                      : "#080808"
                  }
                />

                {xGrid.map((value) => {
                  const p = toScreen({
                    re: value,
                    im: 0,
                  });

                  return (
                    <line
                      key={`x-${value}`}
                      x1={p.x}
                      y1="0"
                      x2={p.x}
                      y2={SVG_HEIGHT}
                      stroke={
                        Math.abs(value) < 1e-10
                          ? "#666666"
                          : "#202020"
                      }
                      strokeWidth={
                        Math.abs(value) < 1e-10
                          ? "1.5"
                          : "1"
                      }
                    />
                  );
                })}

                {!(
                  viewMode === "planck" &&
                  planckDisplay === "stack"
                ) && yGrid.map((value) => {
                  const p = toScreen({
                    re: 0,
                    im: value,
                  });

                  return (
                    <line
                      key={`y-${value}`}
                      x1="0"
                      y1={p.y}
                      x2={SVG_WIDTH}
                      y2={p.y}
                      stroke={
                        Math.abs(value) < 1e-10
                          ? "#666666"
                          : "#202020"
                      }
                      strokeWidth={
                        Math.abs(value) < 1e-10
                          ? "1.5"
                          : "1"
                      }
                    />
                  );
                })}

                {viewMode === "planck" &&
                  planckDisplay === "stack" && (
                    <g pointerEvents="none">
                      {PLANCK_STACK_OFFSETS.map(
                        (offset, index) => {
                          const bandTop =
                            (
                              index *
                              SVG_HEIGHT
                            ) /
                            PLANCK_STACK_OFFSETS.length;

                          const bandBottom =
                            (
                              (index + 1) *
                              SVG_HEIGHT
                            ) /
                            PLANCK_STACK_OFFSETS.length;

                          const centerY =
                            (
                              bandTop +
                              bandBottom
                            ) /
                            2;

                          const sheetValue =
                            planckSheet +
                            offset;

                          return (
                            <g
                              key={`sheet-band-${sheetValue}`}
                            >
                              <line
                                x1="0"
                                y1={bandTop}
                                x2={SVG_WIDTH}
                                y2={bandTop}
                                stroke="#303030"
                                strokeWidth="1.5"
                              />

                              <line
                                x1="0"
                                y1={bandBottom}
                                x2={SVG_WIDTH}
                                y2={bandBottom}
                                stroke="#303030"
                                strokeWidth="1.5"
                              />

                              <rect
                                x="8"
                                y={
                                  centerY -
                                  18
                                }
                                width="68"
                                height="36"
                                rx="3"
                                fill="#101010"
                                fillOpacity="0.82"
                                stroke={
                                  sheetValue ===
                                  planckSheet
                                    ? "#f2c94c"
                                    : "#555555"
                                }
                                strokeWidth="1"
                              />

                              <text
                                x="18"
                                y={
                                  centerY -
                                  2
                                }
                                fill={
                                  sheetValue ===
                                  planckSheet
                                    ? "#f2c94c"
                                    : "#dddddd"
                                }
                                fontSize="11"
                                fontFamily="Menlo, Monaco, Consolas, monospace"
                              >
                                {`m = ${sheetValue}`}
                              </text>

                              <text
                                x="18"
                                y={
                                  centerY +
                                  11
                                }
                                fill="#888888"
                                fontSize="8"
                                fontFamily="Menlo, Monaco, Consolas, monospace"
                              >
                                {sheetValue ===
                                planckSheet
                                  ? "center sheet"
                                  : `offset ${
                                      offset > 0
                                        ? "+"
                                        : ""
                                    }${offset}`}
                              </text>

                              {index <
                                PLANCK_STACK_OFFSETS.length -
                                  1 && (
                                <g>
                                  <line
                                    x1={
                                      SVG_WIDTH -
                                      34
                                    }
                                    y1={
                                      centerY +
                                      22
                                    }
                                    x2={
                                      SVG_WIDTH -
                                      34
                                    }
                                    y2={
                                      centerY +
                                      SVG_HEIGHT /
                                        PLANCK_STACK_OFFSETS.length -
                                      22
                                    }
                                    stroke="#f2c94c"
                                    strokeWidth="1.5"
                                    strokeDasharray="4 3"
                                  />

                                  <text
                                    x={
                                      SVG_WIDTH -
                                      78
                                    }
                                    y={
                                      bandBottom -
                                      5
                                    }
                                    fill="#f2c94c"
                                    fontSize="8"
                                    fontFamily="Menlo, Monaco, Consolas, monospace"
                                  >
                                    ±2πi
                                  </text>
                                </g>
                              )}
                            </g>
                          );
                        }
                      )}
                    </g>
                  )}

                {viewMode === "planck" &&
                  planckDisplay === "continuation" &&
                  planckContinuationCandidates
                    .slice(0, 240)
                    .map(
                      (point, index) => {
                        const p =
                          toScreen(point);

                        return marker(
                          point.kind,
                          p.x,
                          p.y,
                          FUNCTIONS[
                            planckId
                          ].color,
                          `planck-source-${index}`,
                          0.72
                        );
                      }
                    )}

                {viewMode === "planck" &&
                  planckDisplay === "continuation" &&
                  continuationTargetScreen && (
                    <>
                      <circle
                        cx={
                          continuationTargetScreen.x
                        }
                        cy={
                          continuationTargetScreen.y
                        }
                        r={
                          continuationRadiusPixels
                        }
                        fill="none"
                        stroke="#f2c94c"
                        strokeWidth="2"
                        strokeDasharray="7 5"
                      />

                      {planckTraversalTrailPoints && (
                        <>
                          <polyline
                            points={
                              planckTraversalTrailPoints
                            }
                            fill="none"
                            stroke="#101010"
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            opacity="0.72"
                            pointerEvents="none"
                          />

                          <polyline
                            points={
                              planckTraversalTrailPoints
                            }
                            fill="none"
                            stroke="#fff3a6"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            pointerEvents="none"
                          />
                        </>
                      )}

                      <circle
                        cx={
                          continuationTargetScreen.x
                        }
                        cy={
                          continuationTargetScreen.y
                        }
                        r="11"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="2"
                      />

                      {planckTraversalPointScreen && (
                        <circle
                          cx={
                            planckTraversalPointScreen.x
                          }
                          cy={
                            planckTraversalPointScreen.y
                          }
                          r="7"
                          fill="#f2c94c"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />
                      )}
                    </>
                  )}

                {viewMode === "shared" &&
                  Object.entries(FUNCTIONS).map(
                  ([id, info]) => {
                    if (!active[id]) return null;

                    const data = landmarks[id];

                    return (
                      <g key={id}>
                        {show.shifts &&
                          shiftVectors[id].map(
                            (vector, index) => {
                              const end =
                                toScreen(vector);

                              return (
                                <g
                                  key={`${id}-shift-${index}`}
                                >
                                  <line
                                    x1={origin.x}
                                    y1={origin.y}
                                    x2={end.x}
                                    y2={end.y}
                                    stroke={info.color}
                                    strokeWidth="1.5"
                                    strokeDasharray="6 5"
                                    opacity="0.72"
                                    markerEnd="url(#arrow)"
                                  />

                                  <text
                                    x={
                                      (origin.x +
                                        end.x) /
                                        2 +
                                      5
                                    }
                                    y={
                                      (origin.y +
                                        end.y) /
                                        2 -
                                      5
                                    }
                                    fill={info.color}
                                    fontSize="10"
                                  >
                                    {vector.label}
                                  </text>
                                </g>
                              );
                            }
                          )}

                        {show.zeros &&
                          data.zeros.map(
                            (point, index) => {
                              const p =
                                toScreen(point);

                              return marker(
                                "zero",
                                p.x,
                                p.y,
                                info.color,
                                `${id}-zero-${index}`,
                                markerScale
                              );
                            }
                          )}

                        {show.poles &&
                          data.poles.map(
                            (point, index) => {
                              const p =
                                toScreen(point);

                              return marker(
                                "pole",
                                p.x,
                                p.y,
                                info.color,
                                `${id}-pole-${index}`,
                                markerScale
                              );
                            }
                          )}

                        {show.critical &&
                          data.critical.map(
                            (point, index) => {
                              const p =
                                toScreen(point);

                              return marker(
                                "critical",
                                p.x,
                                p.y,
                                info.color,
                                `${id}-critical-${index}`,
                                markerScale
                              );
                            }
                          )}
                      </g>
                    );
                  }
                )}

                {viewMode === "algebra" &&
                  algebraReady &&
                  showDerived &&
                  algebraArgument === "z" &&
                  derivedLandmarks.exactGeometry && (
                    <g>
                      {show.zeros &&
                        derivedLandmarks.zeros.map(
                          (
                            point,
                            index
                          ) => {
                            const p =
                              toScreen(
                                point
                              );

                            return marker(
                              "zero",
                              p.x,
                              p.y,
                              DERIVED_COLOR,
                              `H-zero-${index}`,
                              markerScale
                            );
                          }
                        )}

                      {show.poles &&
                        derivedLandmarks.poles.map(
                          (
                            point,
                            index
                          ) => {
                            const p =
                              toScreen(
                                point
                              );

                            return marker(
                              "pole",
                              p.x,
                              p.y,
                              DERIVED_COLOR,
                              `H-pole-${index}`,
                              markerScale
                            );
                          }
                        )}
                    </g>
                  )}

                {viewMode === "algebra" &&
                  algebraReady &&
                  algebraArgument === "z" &&
                  derivedLandmarks.exactGeometry &&
                  derivedCommonPoints.length <= 20 &&
                  derivedCommonPoints.map(
                    (
                      point,
                      index
                    ) => {
                      const p =
                        toScreen(
                          point
                        );

                      const label =
                        `common: ${reduceExactPiLabel(
                          point.exact
                        )}`;

                      const width =
                        Math.max(
                          46,
                          label.length * 5.8 +
                            10
                        );

                      return (
                        <g
                          key={`common-label-${index}`}
                          pointerEvents="none"
                        >
                          <rect
                            x={p.x + 8}
                            y={p.y - 19}
                            width={width}
                            height="15"
                            rx="2"
                            fill="#101010"
                            fillOpacity="0.88"
                            stroke={DERIVED_COLOR}
                            strokeWidth="0.7"
                          />

                          <text
                            x={p.x + 13}
                            y={p.y - 8}
                            fill={DERIVED_COLOR}
                            fontSize="9"
                            fontFamily="Menlo, Monaco, Consolas, monospace"
                          >
                            {label}
                          </text>
                        </g>
                      );
                    }
                  )}

                {viewMode === "shared" &&
                  groupedLandmarks.map(
                  (group, groupIndex) => {
                    const p =
                      toScreen(group);

                    const uniqueFunctions =
                      Array.from(
                        new Map(
                          group.events.map(
                            (event) => [
                              event.functionId,
                              event,
                            ]
                          )
                        ).values()
                      );

                    const isCoincidence =
                      group.events.length > 1;

                    const tooltip = [
                      `z = ${group.exact}`,
                      ...group.events.map(
                        eventDescription
                      ),
                    ].join("\n");

                    return (
                      <g
                        key={`grouped-${groupIndex}`}
                        onClick={(event) => {
                          event.stopPropagation();

                          setSelectedLandmark(
                            group
                          );
                        }}
                        style={{
                          cursor: "pointer",
                        }}
                      >
                        {isCoincidence &&
                          uniqueFunctions.map(
                            (event, index) => (
                              <circle
                                key={`${groupIndex}-halo-${event.functionId}`}
                                cx={p.x}
                                cy={p.y}
                                r={
                                  9 +
                                  index * 3
                                }
                                fill="none"
                                stroke={
                                  event.color
                                }
                                strokeWidth="1.4"
                                opacity="0.9"
                              />
                            )
                          )}

                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={
                            isCoincidence
                              ? 15 +
                                uniqueFunctions.length *
                                  2
                              : 10
                          }
                          fill="transparent"
                          stroke="none"
                        >
                          <title>
                            {tooltip}
                          </title>
                        </circle>
                      </g>
                    );
                  }
                )}

              </svg>

              {/* Coordinates outside the full plotting area. */}
              <div className="g-coordinate-x" aria-hidden="true">
                {xGrid
                  .filter(value =>
                    Math.round(value / gridStep) %
                      Math.max(
                        1,
                        Math.ceil(
                          100 * spanX / (SVG_WIDTH * gridStep)
                        )
                      ) === 0
                  )
                  .map(value => {
                    const percent =
                      100 * toScreen({
                        re: value,
                        im: 0
                      }).x / SVG_WIDTH;

                    if (percent < 5 || percent > 95) return null;

                    return (
                      <span
                        key={`x-coordinate-${value}`}
                        style={{
                          position: "absolute",
                          left: `${percent}%`,
                          top: 3,
                          transform: "translateX(-50%)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatNumber(value)}
                      </span>
                    );
                  })}
              </div>

              {!(viewMode === "planck" &&
                planckDisplay === "stack") && (
                <div className="g-coordinate-y" aria-hidden="true">
                  {yGrid
                    .filter(value =>
                      Math.round(value / gridStep) %
                        Math.max(
                          1,
                          Math.ceil(
                            62 * spanY /
                            (SVG_HEIGHT * gridStep)
                          )
                        ) === 0
                    )
                    .map(value => {
                      const percent =
                        100 * toScreen({
                          re: 0,
                          im: value
                        }).y / SVG_HEIGHT;

                      if (percent < 3 || percent > 97) return null;

                      return (
                        <span
                          key={`y-coordinate-${value}`}
                          style={{
                            position: "absolute",
                            right: 5,
                            top: `${percent}%`,
                            transform: "translateY(-50%)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatNumber(value)}
                        </span>
                      );
                    })}
                </div>
              )}
            </div>

            <div className="g-footer">
              <span>
                drag plane = pan · wheel = zoom
              </span>

              <span>
                {viewMode === "shared"
                  ? sharedInvertedField
                    ? `field = ${FUNCTIONS[sharedInvertedField].label}(1/z) · landmarks can be toggled independently`
                    : sharedField
                    ? `field = ${FUNCTIONS[sharedField].label}(z) · landmarks can be toggled independently`
                    : "shared geometry · color field off · toggle any combination of G-functions"
                  : viewMode === "planck"
                  ? planckDisplay === "algebra"
                    ? "Planck algebra · dimensionful complex field"
                    : planckDisplay === "stack"
                    ? `${PLANCK_BOUNDARIES[planckId].name} · ${PLANCK_BOUNDARIES[planckId].phiLabel} · sheets ${planckSheet + 2} to ${planckSheet - 2} · bright seam = adjacent-sheet gluing`
                    : `${PLANCK_BOUNDARIES[planckId].name} · ${PLANCK_BOUNDARIES[planckId].phiLabel} · sheet m = ${planckSheet}`
                  : !algebraA
                  ? "select the first G-function"
                  : !algebraB
                  ? `graph = ${algebraFactorText(
                      algebraA,
                      algebraAPower
                    )}`
                  : `graph = ${derivedExpression}`}
              </span>
            </div>
          </section>

          <div className="g-control-shell">
        <div
          className="g-floating-tabs"
          role="group"
          aria-label="Explorer view"
        >
            <button
              type="button"
              className={`g-button g-floating-tab ${
                viewMode === "shared"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setViewMode("shared")
              }
            >
              Shared
            </button>

            <button
              type="button"
              className={`g-button g-floating-tab ${
                viewMode === "algebra"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setViewMode("algebra")
              }
            >
              Algebra
            </button>

            <button
              type="button"
              className={`g-button g-floating-tab ${
                viewMode === "planck"
                  ? "active"
                  : ""
              }`}
              onClick={() => {
                setViewMode("planck");
                setSelectedLandmark(null);
              }}
            >
              Planck
            </button>
        </div>
          <aside className="g-side-panel">




        <div className={`g-toolbar ${
          viewMode === "shared" ? "g-toolbar-shared" : ""
        }`}>
          <div className="g-group">
            <label className="g-label" htmlFor="g-shared-scale">
              Plane scale
            </label>

            <input
              id="g-shared-scale"
              type="range"
              min="0"
              max="1000"
              step="1"
              value={scaleSliderValue}
              onChange={event => {
                setScalePlaying(false);
                setWheelZoomEnabled(true);
                setScaleFromSlider(event.target.value);
              }}
              style={{
                display: "block",
                width: "100%",
                marginTop: 9,
                accentColor: "#75c7ff",
              }}
            />

            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexWrap: "nowrap",
              width: "100%",
              marginTop: 10,
            }}>
            <button
              type="button"
              className={`g-button ${scalePlaying ? "active" : ""}`}
              aria-pressed={scalePlaying}
              onClick={() => setScalePlaying(playing => !playing)}
            >
              {scalePlaying ? "Stop" : "Play"}
            </button>
            <button
              type="button"
              className="g-button"
              title="Zoom out"
              aria-label="Zoom out"
              onClick={() => {
                setScalePlaying(false);
                setWheelZoomEnabled(true);
                setSpanX(current =>
                  Math.min(scaleLimits.max, current * 1.2)
                );
              }}
            >
              −
            </button>

            <button
              type="button"
              className="g-button"
              title="Zoom in"
              aria-label="Zoom in"
              onClick={() => {
                setScalePlaying(false);
                setWheelZoomEnabled(true);
                setSpanX(current =>
                  Math.max(scaleLimits.min, current / 1.2)
                );
              }}
            >
              +
            </button>

            <button
              className="g-button"
              onClick={() => {
                setScalePlaying(false);
                setCenter({ re: 0, im: 0 });
                setSpanX(34);

                setWheelZoomEnabled(false);
                setProbe({ re: 1, im: 0 });
                setShowProbe(false);
                setLastTransform(null);
                setSelectedLandmark(null);

                setViewMode("shared");
                setSharedField(null);
                setSharedInvertedField(null);

                setPlanckId("G0");
                 setPlanckSheet(0);
                setPlanckDisplay("field");
                setPlanckContinuationIndex(0);
                setPlanckLoopScale(0.16);
                setPlanckTraversalProgress(0);
                setPlanckTraversalDirection(1);
                setPlanckTraversalPlaying(false);

                setShow({
                  zeros: true,
                  poles: true,
                  critical: true,
                  shifts: false,
                });

                setActive({
                  G0: true,
                  G1: true,
                  G2: true,
                  G3: true,
                  G4: true,
                });

                setAlgebraA(null);
                setAlgebraAPower(1);
                setAlgebraB(null);
                setAlgebraBPower(1);
                setAlgebraOp("div");
                setPendingOperator(false);
                setShowDerived(true);
              }}
            >
              Reset
            </button>


            </div>

          </div>
          {viewMode === "shared" && (
            <div className="g-group">
              <span className="g-label">
                Functions
              </span>

              {Object.entries(FUNCTIONS).map(
                ([id, info]) => (
                  <button
                    key={id}
                    type="button"
                    className={`g-button ${
                      active[id]
                        ? "active"
                        : ""
                    }`}
                    style={{
                      borderColor:
                        active[id]
                          ? info.color
                          : undefined,
                    }}
                    onClick={() =>
                      setActive((old) => ({
                        ...old,
                        [id]: !old[id],
                      }))
                    }
                  >
                    {info.label}
                  </button>
                )
              )}

            </div>
          )}

          {viewMode !== "planck" && (
            <div className="g-group">
              <span className="g-label">
                Geometry
              </span>

              {[
                ["zeros", "Zeros"],
                ["poles", "Poles"],
                ["critical", "Critical"],
                ["shifts", "Shifts"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`g-button ${
                    show[id] ? "active" : ""
                  }`}
                  onClick={() =>
                    setShow((old) => ({
                      ...old,
                      [id]: !old[id],
                    }))
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          )}


          {viewMode === "shared" && (
            <div className="g-group">
              <span className="g-label">
                Color field
              </span>

              {Object.entries(FUNCTIONS).map(
                ([id, info]) => (
                  <button
                    key={`field-${id}`}
                    type="button"
                    className={`g-button ${
                      sharedField === id
                        ? "active"
                        : ""
                    }`}
                    style={{
                      borderColor:
                        sharedField === id
                          ? info.color
                          : undefined,
                    }}
                    onClick={() => {
                      setSharedInvertedField(null);
                      setSharedField((current) =>
                        current === id ? null : id
                      );
                    }}
                  >
                    {info.label}
                  </button>
                )
              )}
            </div>
          )}

          {viewMode === "shared" && (
            <div className="g-group">
              <span className="g-label">
                Inverted color field
              </span>

              {Object.entries(FUNCTIONS).map(
                ([id, info]) => (
                  <button
                    key={`inverse-field-${id}`}
                    type="button"
                    className={`g-button ${
                      sharedInvertedField === id
                        ? "active"
                        : ""
                    }`}
                    style={{
                      borderColor:
                        sharedInvertedField === id
                          ? info.color
                          : undefined,
                    }}
                    onClick={() => {
                      setSharedField(null);
                      setSharedInvertedField((current) =>
                        current === id ? null : id
                      );
                    }}
                  >
                    {info.label}
                  </button>
                )
              )}
            </div>
          )}

        </div>

            {viewMode === "shared" ? (
              <>
                <div className="g-side-title">
                  Shared geometry
                </div>

                <div
                  className="g-detail-box"
                  style={{
                    border: "none",
                    borderBottom: "none",
                    padding: "2px 0",
                    margin: "2px 0 0",
                    background: "transparent",
                  }}
                >
                  <div
                    style={{
                      color: "#bbbbbb",
                      lineHeight: 1.45,
                    }}
                  >
                    Toggle G₀–G₄ independently to compare
                    their landmarks. Color field selects one
                    function as the domain-colored background.
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      color: "#999999",
                    }}
                  >
                    Landmarks:{" "}
                    {Object.entries(FUNCTIONS)
                      .filter(([id]) => active[id])
                      .map(([, info]) => info.label)
                      .join(", ") || "none"}

                    <div
                      style={{
                        marginTop: 6,
                      }}
                    >
                      Color field:{" "}
                      {sharedInvertedField
                        ? `${FUNCTIONS[sharedInvertedField].label}(1/z)`
                        : sharedField
                        ? `${FUNCTIONS[sharedField].label}(z)`
                        : "Off"}
                    </div>
                  </div>
                </div>
              </>
            ) : viewMode === "algebra" ? (
              <>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 12,
                    width: "100%",
                  }}
                >
                <div
                  className="g-side-title"
                  style={{
                    color: DERIVED_COLOR,
                  }}
                >
                  Algebra graph
                </div>

                <div
                  className="g-group"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: 7,
                    marginLeft: "auto",
                    marginBottom: 0,
                  }}
                >
                  <span
                    className="g-label"
                    style={{
                      marginBottom: 0,
                      textAlign: "right",
                    }}
                  >
                    Color argument
                  </span>
                  <div className="g-compare-buttons">
                    <button
                      type="button"
                      className={`g-compare-button ${
                        algebraArgument === "z" ? "active" : ""
                      }`}
                      style={{
                        background: algebraArgument === "z"
                          ? "#245c85" : "#242424",
                        border: algebraArgument === "z"
                          ? "2px solid #75c7ff"
                          : "2px solid #444",
                        color: algebraArgument === "z"
                          ? "#ffffff" : "#aaaaaa",
                        fontWeight: algebraArgument === "z"
                          ? 700 : 400,
                      }}
                      aria-pressed={algebraArgument === "z"}
                      onClick={() => setAlgebraArgument("z")}
                    >
                      z
                    </button>
                    <button
                      type="button"
                      className={`g-compare-button ${
                        algebraArgument === "inverse" ? "active" : ""
                      }`}
                      style={{
                        background: algebraArgument === "inverse"
                          ? "#245c85" : "#242424",
                        border: algebraArgument === "inverse"
                          ? "2px solid #75c7ff"
                          : "2px solid #444",
                        color: algebraArgument === "inverse"
                          ? "#ffffff" : "#aaaaaa",
                        fontWeight: algebraArgument === "inverse"
                          ? 700 : 400,
                      }}
                      aria-pressed={algebraArgument === "inverse"}
                      onClick={() => setAlgebraArgument("inverse")}
                    >
                      1/z
                    </button>
                  </div>
                </div>
                </div>

                <div className="g-detail-box">
                  <div className="g-compare-row">
                    <div className="g-compare-label">
                      1. Select first function
                    </div>

                    <div className="g-compare-buttons">
                      {Object.entries(
                        FUNCTIONS
                      ).map(
                        ([id, info]) => (
                          <button
                            key={`algebra-a-${id}`}
                            type="button"
                            className={`g-compare-button ${
                              algebraA === id
                                ? "selected"
                                : ""
                            }`}
                            style={{
                              borderColor:
                                algebraA === id
                                  ? info.color
                                  : undefined,
                            }}
                            onClick={() =>
                              selectAlgebraFirst(
                                id
                              )
                            }
                          >
                            {info.label}

                            {algebraA === id &&
                              algebraAPower > 1 && (
                                <sup>
                                  {algebraAPower}
                                </sup>
                              )}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  <div className="g-compare-row">
                    <div className="g-compare-label">
                      2. Choose operation
                    </div>

                    <div className="g-compare-buttons">
                      {[
                        ["add", "+"],
                        ["sub", "−"],
                        ["mul", "×"],
                        ["div", "÷"],
                      ].map(
                        ([
                          operator,
                          symbol,
                        ]) => (
                          <button
                            key={`algebra-op-${operator}`}
                            type="button"
                            disabled={!algebraA}
                            className={`g-compare-button ${
                              algebraOp ===
                                operator &&
                              (
                                pendingOperator ||
                                algebraB
                              )
                                ? "selected"
                                : ""
                            }`}
                            style={{
                              borderColor:
                                algebraOp ===
                                  operator &&
                                (
                                  pendingOperator ||
                                  algebraB
                                )
                                  ? DERIVED_COLOR
                                  : undefined,
                              opacity:
                                algebraA
                                  ? 1
                                  : 0.45,
                            }}
                            onClick={() =>
                              handleAlgebraOperator(
                                operator
                              )
                            }
                          >
                            {symbol}
                          </button>
                        )
                      )}
                      {algebraA && (
                        <div style={{ marginLeft: 8 }}>
                        <button
                          type="button"
                          className="g-button"
                          onClick={() => {
                            setAlgebraA(null);
                            setAlgebraAPower(1);
                            setAlgebraB(null);
                            setAlgebraBPower(1);
                            setAlgebraOp("div");
                            setPendingOperator(false);
                            setShowDerived(true);
                            setSelectedLandmark(null);
                          }}
                        >
                          Clear
                        </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="g-compare-row">
                    <div className="g-compare-label">
                      3. Select second function
                    </div>

                    <div className="g-compare-buttons">
                      {Object.entries(
                        FUNCTIONS
                      ).map(
                        ([id, info]) => (
                          <button
                            key={`algebra-b-${id}`}
                            type="button"
                            disabled={!algebraA}
                            className={`g-compare-button ${
                              algebraB === id
                                ? "selected"
                                : ""
                            }`}
                            style={{
                              borderColor:
                                algebraB === id
                                  ? info.color
                                  : undefined,
                              opacity:
                                algebraA
                                  ? 1
                                  : 0.45,
                            }}
                            onClick={() =>
                              selectAlgebraSecond(
                                id
                              )
                            }
                          >
                            {info.label}

                            {algebraB === id &&
                              algebraBPower > 1 && (
                                <sup>
                                  {algebraBPower}
                                </sup>
                              )}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {algebraA && (
                    <div className="g-compare-expression">
                      <span className="g-compare-expression-symbol">
                        {algebraB
                          ? "H(z)"
                          : "G(z)"}
                      </span>

                      {" = "}

                      {algebraB
                        ? derivedExpression
                        : algebraFactorText(
                            algebraA,
                            algebraAPower
                          )}

                      <div
                        style={{
                          marginTop: 7,
                          color: "#888888",
                        }}
                      >
                        Click the selected function again to increase its power.
                      </div>

                    </div>
                  )}
                </div>
                {algebraReady &&
                  derivedLandmarks.exactGeometry && (
                    <>
                      <div className="g-section-divider" />

                      <div
                        className="g-side-title"
                        style={{
                          color:
                            DERIVED_COLOR,
                        }}
                      >
                        Common points
                      </div>

                      {derivedCommonPoints.length === 0 ? (
                        <div className="g-detail-box">
                          <div
                            style={{
                              color:
                                "#888888",
                            }}
                          >
                            No common zero/pole points are visible
                            in the current window.
                          </div>
                        </div>
                      ) : (
                        <div className="g-detail-box">
                          {derivedCommonPoints.map(
                            (
                              point,
                              pointIndex
                            ) => (
                              <div
                                key={`common-panel-${pointIndex}`}
                                style={{
                                  paddingBottom:
                                    pointIndex ===
                                    derivedCommonPoints.length - 1
                                      ? 0
                                      : 9,
                                  marginBottom:
                                    pointIndex ===
                                    derivedCommonPoints.length - 1
                                      ? 0
                                      : 9,
                                  borderBottom:
                                    pointIndex ===
                                    derivedCommonPoints.length - 1
                                      ? "none"
                                      : "1px solid #292929",
                                }}
                              >
                                <div
                                  style={{
                                    color:
                                      DERIVED_COLOR,
                                    fontFamily:
                                      "Menlo, Monaco, Consolas, monospace",
                                    fontSize:
                                      10,
                                    marginBottom:
                                      5,
                                  }}
                                >
                                  z = {reduceExactPiLabel(
                                    point.exact
                                  )}
                                </div>

                                {point.contributors.map(
                                  (
                                    contributor,
                                    contributorIndex
                                  ) => (
                                    <div
                                      key={`common-contributor-${pointIndex}-${contributorIndex}`}
                                      style={{
                                        color:
                                          FUNCTIONS[
                                            contributor.functionId
                                          ].color,
                                        fontSize:
                                          10,
                                        lineHeight:
                                          1.45,
                                      }}
                                    >
                                      {contributor.functionLabel}
                                      {": "}
                                      {contributor.sourceKind}
                                      {" "}
                                      order{" "}
                                      {signedOrder(
                                        contributor.baseOrder
                                      )}
                                      {" → "}
                                      {signedOrder(
                                        contributor.contribution
                                      )}
                                      {" in H"}
                                    </div>
                                  )
                                )}

                                <div
                                  style={{
                                    marginTop:
                                      5,
                                    color:
                                      "#eeeeee",
                                    fontSize:
                                      10,
                                    fontWeight:
                                      "bold",
                                  }}
                                >
                                  Net: H{" "}
                                  {point.resultKind}
                                  {" · order "}
                                  {signedOrder(
                                    point.netOrder
                                  )}
                                </div>
                              </div>
                            )
                          )}

                          {derivedCommonPoints.length > 20 && (
                            <div
                              style={{
                                marginTop:
                                  8,
                                color:
                                  "#888888",
                              }}
                            >
                              All visible common points are listed here.
                              Scene labels are hidden at this zoom level
                              to avoid covering the graph.
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}

              </>
            ) : (
              <>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 12,
                }}>
                  <div
                    className="g-side-title"
                    style={{ color: "#f2c94c" }}
                  >
                    Planck view
                  </div>

                  <div style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: 6,
                    flexShrink: 0,
                  }}>
                    <span
                      className="g-label"
                      style={{ marginBottom: 0 }}
                    >
                      Color argument
                    </span>

                    <div
                      className="g-compare-buttons"
                      style={{ justifyContent: "flex-end" }}
                    >
                      <button
                        type="button"
                        className={`g-compare-button ${
                          planckArgument === "z"
                            ? "selected"
                            : ""
                        }`}
                        aria-pressed={planckArgument === "z"}
                        onClick={() => setPlanckArgument("z")}
                      >
                        z
                      </button>

                      <button
                        type="button"
                        className={`g-compare-button ${
                          planckArgument === "inverse"
                            ? "selected"
                            : ""
                        }`}
                        aria-pressed={planckArgument === "inverse"}
                        onClick={() => setPlanckArgument("inverse")}
                      >
                        1/z
                      </button>
                    </div>
                  </div>
                </div>

                <div className="g-detail-box">
                  {planckDisplay !== "algebra" && (
                    <>
                  <div className="g-compare-label">
                    1. Select boundary
                  </div>

                  <div className="g-compare-buttons">
                    {Object.entries(
                      PLANCK_BOUNDARIES
                    ).map(
                      ([id, boundary]) => (
                        <button
                          key={`planck-${id}`}
                          type="button"
                          className={`g-compare-button ${
                            planckId === id
                              ? "selected"
                              : ""
                          }`}
                          style={{
                            borderColor:
                              planckId === id
                                ? FUNCTIONS[id].color
                                : undefined,
                          }}
                          onClick={() =>
                            setPlanckId(id)
                          }
                        >
                          {boundary.name}
                        </button>
                      )
                    )}
                  </div>

                    </>
                  )}

                  <div
                    className="g-compare-row"
                    style={{
                      marginTop: 12,
                    }}
                  >
                    <div className="g-compare-label">
                      Display
                    </div>

                    <div className="g-compare-buttons">
                      <button
                        type="button"
                        className={`g-compare-button ${
                          planckDisplay === "field"
                            ? "selected"
                            : ""
                        }`}
                        onClick={() =>
                          setPlanckDisplay(
                            "field"
                          )
                        }
                      >
                        Field
                      </button>

                      <button
                        type="button"
                        className={`g-compare-button ${
                          planckDisplay === "stack"
                            ? "selected"
                            : ""
                        }`}
                        onClick={() =>
                          setPlanckDisplay(
                            "stack"
                          )
                        }
                      >
                        Sheet stack
                      </button>

                      <button
                        type="button"
                        className={`g-compare-button ${
                          planckDisplay === "algebra"
                            ? "selected"
                            : ""
                        }`}
                        onClick={() =>
                          setPlanckDisplay("algebra")
                        }
                      >
                        Algebra
                      </button>
                    </div>
                  </div>

                  <div
                    className="g-compare-row"
                    style={{
                      marginTop: 12,
                    }}
                  >
                    <div className="g-compare-label">
                      3. Center sheet
                    </div>

                    <div className="g-compare-buttons">
                      <button
                        type="button"
                        className="g-compare-button"
                        onClick={() =>
                          setPlanckSheet(
                            (current) =>
                              current - 1
                          )
                        }
                      >
                        −
                      </button>

                      <button
                        type="button"
                        className="g-compare-button selected"
                        onClick={() =>
                          setPlanckSheet(0)
                        }
                      >
                        {planckSheet}
                      </button>

                      <button
                        type="button"
                        className="g-compare-button"
                        onClick={() =>
                          setPlanckSheet(
                            (current) =>
                              current + 1
                          )
                        }
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {planckDisplay === "algebra" && (
                    <div
                      style={{
                        marginTop: 14,
                        paddingTop: 12,
                        borderTop: "1px solid #333",
                      }}
                    >
                      <div className="g-compare-label">
                        1. First Planck quantity
                      </div>

                      <div className="g-compare-buttons">
                        {Object.entries(PLANCK_BOUNDARIES).map(
                          ([id, boundary]) => (
                            <button
                              key={`pa-${id}`}
                              type="button"
                              className={`g-compare-button ${
                                planckA === id ? "selected" : ""
                              }`}
                              onClick={() => setPlanckA(id)}
                            >
                              {boundary.planckLabel}
                            </button>
                          )
                        )}
                      </div>

                      <div
                        className="g-compare-label"
                        style={{ marginTop: 12 }}
                      >
                        2. Operation
                      </div>

                      <div className="g-compare-buttons">
                        {[
                          ["add", "+"],
                          ["sub", "−"],
                          ["mul", "×"],
                          ["div", "÷"],
                        ].map(([op, symbol]) => (
                          <button
                            key={op}
                            type="button"
                            className={`g-compare-button ${
                              planckOp === op ? "selected" : ""
                            }`}
                            onClick={() => setPlanckOp(op)}
                          >
                            {symbol}
                          </button>
                        ))}

                        <button
                          type="button"
                          className="g-compare-button"
                          onClick={() => {
                            setPlanckA("G0");
                            setPlanckB(null);
                            setPlanckOp("div");
                          }}
                        >
                          Clear
                        </button>
                      </div>

                      <div
                        className="g-compare-label"
                        style={{ marginTop: 12 }}
                      >
                        3. Second Planck quantity
                      </div>

                      <div className="g-compare-buttons">
                        {Object.entries(PLANCK_BOUNDARIES).map(
                          ([id, boundary]) => (
                            <button
                              key={`pb-${id}`}
                              type="button"
                              className={`g-compare-button ${
                                planckB === id ? "selected" : ""
                              }`}
                              onClick={() => setPlanckB(id)}
                            >
                              {boundary.planckLabel}
                            </button>
                          )
                        )}
                      </div>

                      <div
                        style={{
                          marginTop: 14,
                          fontFamily: "Menlo, monospace",
                          fontSize: 11,
                          lineHeight: 1.8,
                          overflowWrap: "anywhere",
                        }}
                      >
                        <div>
                          {planckB &&
                          planckB !== planckA &&
                          (planckOp === "add" ||
                           planckOp === "sub")
                            ? PLANCK_BOUNDARIES[planckA].phiLabel
                            : PLANCK_BOUNDARIES[planckA].planckLabel}
                          {planckB
                            ? ` ${
                                {
                                  add: "+",
                                  sub: "−",
                                  mul: "×",
                                  div: "÷",
                                }[planckOp]
                              } ${
                                planckB !== planckA &&
                                (planckOp === "add" ||
                                 planckOp === "sub")
                                  ? PLANCK_BOUNDARIES[planckB].phiLabel
                                  : PLANCK_BOUNDARIES[planckB].planckLabel
                              }`
                            : ""}
                        </div>

                        {planckB &&
                         planckA !== planckB &&
                         (planckOp === "add" ||
                          planckOp === "sub") ? (
                          <div style={{
                            color: "#f2c94c",
                            marginTop: 6,
                            lineHeight: 1.6,
                          }}>
                            Formal normalized comparison (dimensionless).
                            <div style={{ color: "#aaa" }}>
                              The physical quantities have incompatible
                              SI dimensions. Their dimensionless
                              logarithmic factors are combined instead.
                            </div>
                            <div style={{ color: "#999" }}>
                              Individual scales: 10
                              <sup>{PLANCK_BOUNDARIES[planckA].n}</sup>
                              {" "}{PLANCK_BOUNDARIES[planckA].unit}
                              {" and "}10
                              <sup>{PLANCK_BOUNDARIES[planckB].n}</sup>
                              {" "}{PLANCK_BOUNDARIES[planckB].unit}
                            </div>
                          </div>
                        ) : (
                        <div style={{ color: "#f2c94c" }}>
                          Scale: 10
                          <sup>
                            {!planckB
                              ? PLANCK_BOUNDARIES[planckA].n
                              : planckOp === "mul"
                              ? PLANCK_BOUNDARIES[planckA].n +
                                PLANCK_BOUNDARIES[planckB].n
                              : planckOp === "div"
                              ? PLANCK_BOUNDARIES[planckA].n -
                                PLANCK_BOUNDARIES[planckB].n
                              : PLANCK_BOUNDARIES[planckA].n}
                          </sup>
                          {" "}
                          {!planckB ||
                          planckOp === "add" ||
                          planckOp === "sub"
                            ? PLANCK_BOUNDARIES[planckA].unit
                            : `${
                                PLANCK_BOUNDARIES[planckA].unit
                              }${
                                planckOp === "mul" ? "·" : "/"
                              }${
                                PLANCK_BOUNDARIES[planckB].unit
                              }`}
                        </div>
                        )}

                        <div style={{ color: "#999" }}>
                          Color represents complex phase and
                          logarithmic magnitude.
                          Both operands use {planckArgument === "inverse" ? "1/z" : "z"} and sheet m = {planckSheet}.
                        </div>
                      </div>
                    </div>
                  )}

                  {planckDisplay !== "algebra" && (
                    <>
                  <div
                    className="g-compare-expression"
                    style={{
                      marginTop: 14,
                    }}
                  >
                    <div
                      style={{
                        color:
                          FUNCTIONS[planckId].color,
                        fontWeight: "bold",
                      }}
                    >
                      {PLANCK_BOUNDARIES[planckId].name}
                    </div>

                    <div
                      style={{
                        marginTop: 6,
                      }}
                    >
                      nₖ ={" "}
                      {PLANCK_BOUNDARIES[planckId].n}
                    </div>

                    <div
                      style={{
                        marginTop: 6,
                        fontFamily:
                          "Menlo, Monaco, Consolas, monospace",
                        fontSize: 10,
                        lineHeight: 1.5,
                      }}
                    >
                      {PLANCK_BOUNDARIES[planckId].phiLabel}
                      {"("}
                      {planckArgument === "inverse" ? "1/z" : "z"}
                      {") = Log("}
                      {PLANCK_BOUNDARIES[planckId].n}
                      {" / "}
                      {FUNCTIONS[planckId].label}
                      {"("}
                      {planckArgument === "inverse" ? "1/z" : "z"}
                      {")) + 2πi("}
                      {planckSheet}
                      {")"}
                    </div>

                    <div
                      style={{
                        marginTop: 6,
                        fontFamily:
                          "Menlo, Monaco, Consolas, monospace",
                        fontSize: 10,
                        lineHeight: 1.5,
                      }}
                    >
                      {PLANCK_BOUNDARIES[planckId].planckLabel}
                      {"("}
                      {planckArgument === "inverse" ? "1/z" : "z"}
                      {") = "}
                      {PLANCK_BOUNDARIES[planckId].phiLabel}
                      {"("}
                      {planckArgument === "inverse" ? "1/z" : "z"}
                      {") × 10"}
                      <sup>
                        {PLANCK_BOUNDARIES[planckId].n}
                      </sup>
                      {" "}
                      {PLANCK_BOUNDARIES[planckId].unit}
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 14,
                      paddingTop: 12,
                      borderTop:
                        "1px solid #333333",
                    }}
                  >
                    <div className="g-compare-label">
                      {planckDisplay === "field"
                        ? "How to read the field"
                        : "How the sheets connect"}
                    </div>

                    <div
                      style={{
                        marginTop: 7,
                        color: "#999999",
                        lineHeight: 1.5,
                      }}
                    >
                      {planckDisplay === "field"
                        ? `This is the logarithmic coordinate ${PLANCK_BOUNDARIES[planckId].phiLabel}(z). The Planck factor 10^nₖ rescales the value but does not change its sheet structure.`
                        : `Each strip is the same z-plane on a different branch ${PLANCK_BOUNDARIES[planckId].phiLabel} + 2πim. Bright seam curves are the preimage of the principal logarithm cut. Crossing a seam does not stop the coordinate; it continues onto the adjacent sheet, changing m by one.`}
                    </div>

                    {planckDisplay === "stack" && (
                      <div
                        style={{
                          marginTop: 10,
                          padding:
                            "9px 10px",
                          background:
                            "#151515",
                          border:
                            "1px solid #3b3b3b",
                          fontFamily:
                            "Menlo, Monaco, Consolas, monospace",
                          fontSize: 10,
                          lineHeight: 1.55,
                        }}
                      >
                        <div>
                          same z-coordinate on every strip
                        </div>

                        <div>
                          adjacent sheets differ by 2πi
                        </div>

                        <div>
                          crossing seam: m ↔ m ± 1
                        </div>
                      </div>
                    )}
                  </div>

                  {planckId === "G2" && (
                    <div
                      style={{
                        marginTop: 12,
                        color: "#999999",
                        lineHeight: 1.45,
                      }}
                    >
                      G₂(z) = C₂ Γ²(z/4), with
                      {" "}
                      C₂ = −5 /
                      (3^(1/3) · 2^(5/4) · √(7π) · e^(π/8))
                      ≈ {G2_C2.toPrecision(10)}.
                    </div>
                  )}
                    </>
                  )}
                </div>
              </>
            )}

            {selectedLandmark && (
              <>
                <div className="g-section-divider" />

                <div className="g-side-title">
                  Selected landmark
                </div>

                <div className="g-detail-box">
                  <div className="g-detail-coordinate">
                    z ={" "}
                    {selectedLandmark.exact}
                  </div>

                  <div className="g-transform-coordinate">
                    ≈{" "}
                    {formatComplex(
                      selectedLandmark
                    )}
                  </div>

                  {selectedLandmark.events.map(
                    (event, index) => (
                      <div
                        key={`event-${index}`}
                        className="g-event-line"
                        style={{
                          color:
                            event.color,
                        }}
                      >
                        {eventDescription(
                          event
                        )}
                      </div>
                    )
                  )}
                </div>
              </>
            )}

          </aside>
          </div>
        </div>
    </main>
  );
}
