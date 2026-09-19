'use client';

import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import LayoutWrapper from '@/components/LayoutWrapper';

import {
  maxRootResidual,
  solveQuarticRoots,
} from './math/quarticRoots';

import {
  computeCrossRatio,
} from './math/crossRatio';

import {
  FIGURE_EIGHT_VOLUME,
  REGULAR_IDEAL_TETRAHEDRON_VOLUME,
  idealTetrahedronVolume,
} from './math/idealTetrahedronVolume';
import MonodromyStage from './MonodromyStage';
import RiemannSurfaceViewer from './RiemannSurfaceViewer';
import styles from './QuarticTetrahedronTransform.module.css';
import '../globals.css';

function MathInline({
  latex,
  className = '',
}) {
  const html =
    katex.renderToString(
      latex,
      {
        throwOnError: false,
        displayMode: false,
        output: 'html',
      }
    );

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{
        __html: html,
      }}
    />
  );
}

function MathDisplay({
  latex,
  className = '',
}) {
  const html =
    katex.renderToString(
      latex,
      {
        throwOnError: false,
        displayMode: true,
        output: 'html',
      }
    );

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{
        __html: html,
      }}
    />
  );
}

const ZHE_LATEX = String.raw`\mathit{ж}`;

const ZHE_ASSETS = {
  1: '/equations/zhe_1.svg',
  2: '/equations/zhe_2.svg',
  3: '/equations/zhe_3.svg',
  4: '/equations/zhe_4.svg',
  r: '/equations/zhe_r.svg',
  theta: '/equations/zhe_theta.svg',
};

function ColoredZheSymbol({
  kind,
  color,
  size = 'var(--quartic-symbol-size, 14px)',
  className = '',
}) {
  const src = ZHE_ASSETS[kind];

  return (
    <span
      className={className}
      aria-label={`zhe ${kind}`}
      style={{
        display: 'inline-block',
        width: `calc(${size} * 1.55)`,
        height: size,
        flex: '0 0 auto',

        backgroundColor: color,

        WebkitMaskImage:
          `url(${src})`,
        maskImage:
          `url(${src})`,

        WebkitMaskRepeat:
          'no-repeat',
        maskRepeat:
          'no-repeat',

        WebkitMaskPosition:
          'center',
        maskPosition:
          'center',

        WebkitMaskSize:
          'contain',
        maskSize:
          'contain',
      }}
    />
  );
}

function ASymbol({
  size = '1em',
  className = '',
}) {
  return (
    <img
      src="/equations/a_symbol.svg"
      alt="a"
      className={className}
      style={{
        display: 'inline-block',
        height: size,
        width: 'auto',
        verticalAlign: '-0.12em',
        flex: '0 0 auto',
      }}
    />
  );
}


function RiemannBranchEquationSvg({
  src,
  alt,
  fontSize = 18,
  translateY = 0,
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontSize:
          `${fontSize}px`,
        lineHeight: 1,
        verticalAlign:
          'middle',
        transform:
          `translateY(${translateY}px)`,
        flex:
          '0 0 auto',
      }}
    >
      <img
        src={src}
        alt={alt}
        style={{
          display: 'block',
          height: '1em',
          width: 'auto',
          maxWidth: 'none',
          maxHeight: 'none',
          flex: '0 0 auto',
        }}
      />
    </span>
  );
}


function InfinitySymbol({
  size = '1em',
  className = '',
}) {
  return (
    <img
      src="/equations/infinity.svg"
      alt="infinity"
      className={className}
      style={{
        display: 'inline-block',
        height: size,
        width: 'auto',
        verticalAlign: '-0.08em',
        flex: '0 0 auto',
      }}
    />
  );
}


function ZheSymbol({
  kind,
  size = 'var(--quartic-symbol-size, 18px)',
  className = '',
}) {
  return (
    <img
      src={ZHE_ASSETS[kind]}
      alt={`zhe ${kind}`}
      className={className}
      style={{
        height: size,
        width: 'auto',
        display: 'inline-block',
        verticalAlign: '-0.16em',
      }}
    />
  );
}

function LambdaSymbol({
  size = 18,
  className = '',
}) {
  return (
    <img
      src="/equations/cross-ratio_symbol.svg"
      alt="lambda"
      className={className}
      style={{
        display: 'inline-block',
        height:
          typeof size === 'number'
            ? `${size}px`
            : size,
        width: 'auto',
        flex: '0 0 auto',
        verticalAlign: '-0.12em',
      }}
    />
  );
}

function ColoredLambdaSymbol({
  color,
  size = 14,
  className = '',
}) {
  const resolvedSize =
    typeof size === 'number'
      ? `${size}px`
      : size;

  return (
    <span
      className={className}
      aria-label="lambda"
      style={{
        display: 'inline-block',
        width: `calc(${resolvedSize} * 0.82)`,
        height: resolvedSize,
        flex: '0 0 auto',
        backgroundColor: color,

        WebkitMaskImage:
          'url(/equations/cross-ratio_symbol.svg)',
        maskImage:
          'url(/equations/cross-ratio_symbol.svg)',

        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',

        WebkitMaskPosition: 'center',
        maskPosition: 'center',

        WebkitMaskSize: 'contain',
        maskSize: 'contain',

        verticalAlign: '-0.12em',
      }}
    />
  );
}

function AnharmonicLambdaSymbol({
  index,
  color,
  size = 14,
  className = '',
}) {
  const suffixLatex = [
    '',
    "'",
    "''",
    '^{-1}',
    "'^{-1}",
    "''^{-1}",
  ][index];

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.02em',
        color,
        whiteSpace: 'nowrap',
      }}
    >
      <ColoredLambdaSymbol
        color={color}
        size={size}
      />

      {suffixLatex && (
        <MathInline
          className={styles.rootValueMath}
          latex={suffixLatex}
        />
      )}
    </span>
  );
}


const ROOT_COLORS = [
  '#ff4040', // ж1 — red
  '#ffe600', // ж2 — yellow
  '#47d16c', // ж3 — green
  '#2f8cff', // ж4 — blue
];

const ANHARMONIC_COLORS = [
  '#ff3030', // red
  '#ff8a00', // orange
  '#ffe600', // yellow
  '#39ff6a', // green
  '#2f8cff', // blue
  '#d65cff', // purple
];


/*
 * Möbius-panel math must use the same SVG zhe glyphs used
 * everywhere else on the page. Do not fall back to a font's
 * Cyrillic ж inside KaTeX.
 */
const MOBIUS_ZHE_KIND = {
  '₁': 1,
  '₂': 2,
  '₃': 3,
  '₄': 4,
};

function MobiusPanelZhe({
  kind,
  size = '1em',
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        verticalAlign: '-0.12em',
        transform: 'translateY(2.75px)',
        lineHeight: 1,
      }}
    >
      <ColoredZheSymbol
        kind={kind}
        color={ROOT_COLORS[kind - 1]}
        size={size}
        className={styles.legendStyleZhe}
      />
    </span>
  );
}


function MobiusPanelText({
  text,
}) {
  const parts =
    String(text).split(
      /(ж[₁₂₃₄])/g
    );

  return (
    <>
      {parts.map(
        (
          part,
          index
        ) => {
          const match =
            /^ж([₁₂₃₄])$/.exec(
              part
            );

          if (!match) {
            return (
              <span
                key={
                  `text-${index}`
                }
              >
                {part}
              </span>
            );
          }

          return (
            <MobiusPanelZhe
              key={
                `zhe-${index}`
              }
              kind={
                MOBIUS_ZHE_KIND[
                  match[1]
                ]
              }
              size="0.95em"
            />
          );
        }
      )}
    </>
  );
}


function MobiusPanelFraction({
  numerator,
  denominator,
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        justifyContent: 'center',
        verticalAlign: 'middle',
        margin: '0 0.16em',
        lineHeight: 1.05,
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding:
            '0 0.12em 0.08em',
          borderBottom:
            '1px solid currentColor',
          whiteSpace: 'nowrap',
        }}
      >
        {numerator}
      </span>

      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding:
            '0.08em 0.12em 0',
          whiteSpace: 'nowrap',
        }}
      >
        {denominator}
      </span>
    </span>
  );
}


function MobiusPanelFormula({
  stage,
}) {
  const math =
    (
      latex,
      key
    ) => (
      <MathInline
        key={key}
        className={
          styles.rootValueMath
        }
        latex={latex}
      />
    );

  const zhe =
    (
      kind,
      key
    ) => (
      <MobiusPanelZhe
        key={key}
        kind={kind}
      />
    );

  const rowStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1.1,
    whiteSpace: 'nowrap',
    color:
      'rgba(245, 239, 224, 0.96)',
  };


  if (stage === 1) {
    return (
      <div style={rowStyle}>
        {math(
          'F_4(w)=',
          'a'
        )}

        <MobiusPanelFraction
          numerator={
            math(
              '1',
              'n'
            )
          }
          denominator={
            <>
              {math(
                'w-',
                'd1'
              )}
              {zhe(
                4,
                'd2'
              )}
            </>
          }
        />
      </div>
    );
  }


  if (stage === 2) {
    return (
      <div style={rowStyle}>
        {math(
          'F_3(w)=w-',
          'a'
        )}

        {zhe(
          3,
          'b'
        )}
      </div>
    );
  }


  if (stage === 3) {
    return (
      <div style={rowStyle}>
        {math(
          'F_{43}(w)=',
          'a'
        )}

        <MobiusPanelFraction
          numerator={
            <>
              {math(
                'w-',
                'n1'
              )}
              {zhe(
                3,
                'n2'
              )}
            </>
          }
          denominator={
            <>
              {math(
                'w-',
                'd1'
              )}
              {zhe(
                4,
                'd2'
              )}
            </>
          }
        />
      </div>
    );
  }


  if (stage === 4) {
    return (
      <div style={rowStyle}>
        {math(
          'F_2(w)=',
          'a'
        )}

        <MobiusPanelFraction
          numerator={
            math(
              'w',
              'n'
            )
          }
          denominator={
            zhe(
              2,
              'd'
            )
          }
        />
      </div>
    );
  }


  if (stage === 5) {
    return (
      <div style={rowStyle}>
        {math(
          'F_{42}(w)=',
          'a'
        )}

        <MobiusPanelFraction
          numerator={
            <>
              {zhe(
                2,
                'n1'
              )}
              {math(
                '-',
                'n2'
              )}
              {zhe(
                4,
                'n3'
              )}
            </>
          }
          denominator={
            <>
              {math(
                'w-',
                'd1'
              )}
              {zhe(
                4,
                'd2'
              )}
            </>
          }
        />
      </div>
    );
  }


  if (stage === 6) {
    return (
      <div style={rowStyle}>
        {math(
          'F_{32}(w)=',
          'a'
        )}

        <MobiusPanelFraction
          numerator={
            <>
              {math(
                'w-',
                'n1'
              )}
              {zhe(
                3,
                'n2'
              )}
            </>
          }
          denominator={
            <>
              {zhe(
                2,
                'd1'
              )}
              {math(
                '-',
                'd2'
              )}
              {zhe(
                3,
                'd3'
              )}
            </>
          }
        />
      </div>
    );
  }


  if (stage === 7) {
    return (
      <div style={rowStyle}>
        {math(
          'M(w)=',
          'a'
        )}

        <MobiusPanelFraction
          numerator={
            <>
              {math(
                '(w-',
                'n1'
              )}
              {zhe(
                3,
                'n2'
              )}
              {math(
                ')(',
                'n3'
              )}
              {zhe(
                2,
                'n4'
              )}
              {math(
                '-',
                'n5'
              )}
              {zhe(
                4,
                'n6'
              )}
              {math(
                ')',
                'n7'
              )}
            </>
          }
          denominator={
            <>
              {math(
                '(w-',
                'd1'
              )}
              {zhe(
                4,
                'd2'
              )}
              {math(
                ')(',
                'd3'
              )}
              {zhe(
                2,
                'd4'
              )}
              {math(
                '-',
                'd5'
              )}
              {zhe(
                3,
                'd6'
              )}
              {math(
                ')',
                'd7'
              )}
            </>
          }
        />
      </div>
    );
  }

  return null;
}


function CrossRatioEquation() {
  return (
    <MathDisplay
      latex={String.raw`\lambda=\frac{(\text{ж}_1-\text{ж}_3)(\text{ж}_2-\text{ж}_4)}{(\text{ж}_1-\text{ж}_4)(\text{ж}_2-\text{ж}_3)}`}
    />
  );
}

const PHYSICAL_A = 11.791761367470536;

const UNIT_CIRCLE_A =
  1 - 1 / (2 * Math.PI);

const HARMONIC_A =
  Math.sqrt(
    8 / 3 -
    (4 * Math.PI) / 27
  );

const BRANCH_X2 =
  (
    Math.sqrt(
      Math.PI * Math.PI +
      6 * Math.PI
    ) -
    Math.PI
  ) / 3;

const BRANCH_A =
  2 *
  Math.sqrt(BRANCH_X2) *
  (
    1 +
    BRANCH_X2 /
      Math.PI
  );

const BRANCH_Q =
  Math.sqrt(
    (2 * Math.PI / 6) ** 2 +
    2 * Math.PI / 3
  ) +
  2 * Math.PI / 6;

const BRANCH_B =
  Math.sqrt(
    4 * BRANCH_Q
  ) *
  (
    1 -
    BRANCH_Q /
      Math.PI
  );

function aFromUpperRootAngle(phi) {
  const coefficient =
    4 *
    Math.cos(phi) ** 2 -
    1;

  const y =
    (
      -Math.PI +
      Math.sqrt(
        Math.PI ** 2 +
        2 *
        Math.PI *
        coefficient
      )
    ) /
    coefficient;

  const r =
    Math.sqrt(y);

  return (
    r ** 3 *
      Math.cos(3 * phi) +
    2 *
      Math.PI *
      r *
      Math.cos(phi) +
    2 *
      Math.PI *
      Math.cos(phi) /
      r
  ) /
  (
    2 *
    Math.PI
  );
}

/*
 * Continuous root tracking for the Root angles graph.
 *
 * solveQuarticRoots() is allowed to return its four roots in a
 * different array order at different values of a. For graph color,
 * however, each root must retain its identity continuously.
 *
 * With only four roots, the robust solution is to test all 4! = 24
 * permutations and choose the one minimizing total squared motion
 * in the complex plane.
 */
const ROOT_TRACK_PERMUTATIONS = [
  [0, 1, 2, 3],
  [0, 1, 3, 2],
  [0, 2, 1, 3],
  [0, 2, 3, 1],
  [0, 3, 1, 2],
  [0, 3, 2, 1],

  [1, 0, 2, 3],
  [1, 0, 3, 2],
  [1, 2, 0, 3],
  [1, 2, 3, 0],
  [1, 3, 0, 2],
  [1, 3, 2, 0],

  [2, 0, 1, 3],
  [2, 0, 3, 1],
  [2, 1, 0, 3],
  [2, 1, 3, 0],
  [2, 3, 0, 1],
  [2, 3, 1, 0],

  [3, 0, 1, 2],
  [3, 0, 2, 1],
  [3, 1, 0, 2],
  [3, 1, 2, 0],
  [3, 2, 0, 1],
  [3, 2, 1, 0],
];

function orderRootsByContinuity(
  previousRoots,
  nextRoots
) {
  let bestPermutation =
    ROOT_TRACK_PERMUTATIONS[0];

  let bestCost = Infinity;

  for (
    const permutation
    of ROOT_TRACK_PERMUTATIONS
  ) {
    let cost = 0;

    for (
      let index = 0;
      index < 4;
      index += 1
    ) {
      const previous =
        previousRoots[index];

      const next =
        nextRoots[
          permutation[index]
        ];

      const dx =
        next.re - previous.re;

      const dy =
        next.im - previous.im;

      cost +=
        dx * dx +
        dy * dy;
    }

    if (cost < bestCost) {
      bestCost = cost;
      bestPermutation =
        permutation;
    }
  }

  return bestPermutation.map(
    (index) => nextRoots[index]
  );
}

/*
 * Canonical persistent root identities used by every sweep graph.
 *
 * Minimum-motion tracking works away from a double root, but at
 * a = +/-a1 the first two roots coalesce exactly.  After that
 * collision, motion alone cannot decide which outgoing real
 * branch keeps the name zhe_1 versus zhe_2.
 *
 * Convention:
 *
 *   central region:
 *     zhe_1 = upper member of the small conjugate pair
 *     zhe_2 = lower member of the small conjugate pair
 *
 *   a < -a1:
 *     zhe_1 = large negative real root
 *     zhe_2 = small negative real root
 *
 *   a > +a1:
 *     zhe_1 = small positive real root
 *     zhe_2 = large positive real root
 *
 *   all real a:
 *     zhe_3 = upper member of the large conjugate pair
 *     zhe_4 = lower member of the large conjugate pair
 */

function seedPersistentRootIdentities(
  sampleA,
  rawRoots
) {
  const realRoots = rawRoots
    .filter(
      (root) =>
        Math.abs(root.im) < 1e-7
    )
    .sort(
      (left, right) =>
        Math.abs(right.re) -
        Math.abs(left.re)
    );

  const complexRoots = rawRoots
    .filter(
      (root) =>
        Math.abs(root.im) >= 1e-7
    )
    .sort(
      (left, right) =>
        right.im - left.im
    );

  /*
   * The sweep begins on the negative outer branch.
   * Anchor all four identities there explicitly.
   */
  if (
    sampleA < -BRANCH_A &&
    realRoots.length === 2 &&
    complexRoots.length === 2
  ) {
    return [
      realRoots[0],     // zhe_1: large negative real
      realRoots[1],     // zhe_2: small negative real
      complexRoots[0],  // zhe_3: upper conjugate
      complexRoots[1],  // zhe_4: lower conjugate
    ];
  }

  return rawRoots;
}


function canonicalizePersistentRootIdentities(
  sampleA,
  trackedRoots
) {
  const ordered = [...trackedRoots];

  const swap = (left, right) => {
    const temporary =
      ordered[left];

    ordered[left] =
      ordered[right];

    ordered[right] =
      temporary;
  };

  /*
   * zhe_1 / zhe_2
   */
  if (
    sampleA <
    -BRANCH_A - 1e-10
  ) {
    /*
     * Negative outer region:
     *
     * zhe_1 = large real root
     * zhe_2 = small real root
     */
    if (
      Math.hypot(
        ordered[0].re,
        ordered[0].im
      ) <
      Math.hypot(
        ordered[1].re,
        ordered[1].im
      )
    ) {
      swap(0, 1);
    }
  } else if (
    sampleA >
    BRANCH_A + 1e-10
  ) {
    /*
     * Positive outer region:
     *
     * zhe_1 = small real root
     * zhe_2 = large real root
     */
    if (
      Math.hypot(
        ordered[0].re,
        ordered[0].im
      ) >
      Math.hypot(
        ordered[1].re,
        ordered[1].im
      )
    ) {
      swap(0, 1);
    }
  } else {
    /*
     * Central conjugate pair:
     *
     * zhe_1 = upper
     * zhe_2 = lower
     */
    if (
      ordered[0].im <
      ordered[1].im
    ) {
      swap(0, 1);
    }
  }

  /*
   * zhe_3 / zhe_4 remain the large conjugate pair:
   *
   * zhe_3 = upper
   * zhe_4 = lower
   */
  if (
    ordered[2].im <
    ordered[3].im
  ) {
    swap(2, 3);
  }

  return ordered;
}


const SPECIAL_ROOT_ANGLES = [
  {
    n: 8,
    phi: 4 * Math.PI / 8,
  },
  {
    n: 18,
    phi: 4 * Math.PI / 18,
  },
  {
    n: 32,
    phi: 4 * Math.PI / 32,
  },
  {
    n: 35,
    phi: 4 * Math.PI / 35,
  },
  {
    n: 44,
    phi: 4 * Math.PI / 44,
  },
  {
    n: 120,
    phi: 4 * Math.PI / 120,
  },
].map((item) => ({
  ...item,
  a:
    aFromUpperRootAngle(
      item.phi
    ),
}));

const VIEW_MODES = [
  'Roots',
  'Möbius transform',
  'Cross-ratio',
  'Monodromy',
  'Riemann surface',
];


/*
 * Internal navigation for the three closely related root views.
 *
 * Stage 1:
 *   Keep the existing top-level tabs intact.
 *
 * Once this selector is verified, Root angles and Root magnitudes
 * can be removed from the top navigation and accessed through Roots.
 */
const ROOT_FAMILY_MODES = [
  'Roots',
  'Root angles',
  'Root magnitudes',
];


const RIEMANN_STRUCTURE_MODES = [
  {
    id: 'root-paths',
    label: 'Root paths',
  },

  {
    id: 'real-locus',
    label: 'Real locus',
  },

  {
    id: 'imaginary-locus',
    label: 'Imaginary locus',
  },

  {
    id: 'sheet-cuts',
    label: 'Sheet cuts',
  },
];

/*
 * Three-regime compactification of the quartic parameter.
 *
 * slider t:
 *
 *   [-1, -1/3]   : -infinity -> -a*
 *   [-1/3, 1/3]  : -a* -> +a*
 *   [1/3, 1]     : +a* -> +infinity
 *
 * The middle third is linear in a. The outer thirds use
 * tangent compactification, with their local scale chosen so
 * that da/dt is continuous at +/-a*.
 */

const OUTER_A_SCALE =
  4 * BRANCH_A / Math.PI;

function sliderFromA(a) {
  if (a === Infinity) {
    return 1;
  }

  if (a === -Infinity) {
    return -1;
  }

  if (a < -BRANCH_A) {
    const u =
      (2 / Math.PI) *
      Math.atan(
        (
          -a -
          BRANCH_A
        ) /
        OUTER_A_SCALE
      );

    return -(
      1 +
      2 * u
    ) / 3;
  }

  if (a > BRANCH_A) {
    const u =
      (2 / Math.PI) *
      Math.atan(
        (
          a -
          BRANCH_A
        ) /
        OUTER_A_SCALE
      );

    return (
      1 +
      2 * u
    ) / 3;
  }

  return (
    a /
    (
      3 *
      BRANCH_A
    )
  );
}

function aFromSlider(t) {
  if (t <= -1) {
    return -Infinity;
  }

  if (t >= 1) {
    return Infinity;
  }

  if (t < -1 / 3) {
    const u =
      (
        -3 * t -
        1
      ) / 2;

    return (
      -BRANCH_A -
      OUTER_A_SCALE *
      Math.tan(
        Math.PI *
        u /
        2
      )
    );
  }

  if (t > 1 / 3) {
    const u =
      (
        3 * t -
        1
      ) / 2;

    return (
      BRANCH_A +
      OUTER_A_SCALE *
      Math.tan(
        Math.PI *
        u /
        2
      )
    );
  }

  return (
    3 *
    BRANCH_A *
    t
  );
}

export default function QuarticTetrahedronTransform({ embedded = false }) {


  const PageShell =
    embedded ? Fragment : LayoutWrapper;

  const [mode, setMode] = useState('Roots');
  const [a, setA] = useState(0);

  const [
    riemannStructureModes,
    setRiemannStructureModes,
  ] = useState([
    'root-paths',
  ]);


  /*
   * Riemann graph visibility.
   *
   * Both graphs are shown by default.
   * At least one graph must remain visible.
   */
  const [
    riemannGraphsVisible,
    setRiemannGraphsVisible,
  ] = useState({
    sphere: true,
    map: true,
  });


  /*
   * Incrementing this remounts the Riemann viewers and therefore
   * restores their internal camera / zoom state.
   */
  const [
    riemannResetKey,
    setRiemannResetKey,
  ] = useState(0);










  function toggleRiemannGraph(
    graphId
  ) {
    setRiemannGraphsVisible(
      current => {
        const next = {
          ...current,
          [graphId]:
            !current[
              graphId
            ],
        };

        /*
         * Never allow the stage to become empty.
         */
        if (
          !next.sphere &&
          !next.map
        ) {
          return current;
        }

        return next;
      }
    );
  }


  function resetRiemannView() {
    /*
     * Restore the Riemann tab to its reload/default state.
     */
    setRiemannGraphsVisible({
      sphere: true,
      map: true,
    });

    setRiemannStructureModes([
      'root-paths',
    ]);

    setA(0);
    setAsymptoticEnd(0);

    /*
     * Force the two viewer instances back to their initial
     * rotation / zoom state.
     */
    setRiemannResetKey(
      current =>
        current + 1
    );
  }
  function toggleRiemannStructureMode(
    modeId
  ) {
    setRiemannStructureModes(
      currentModes =>
        currentModes.includes(
          modeId
        )
          ? currentModes.filter(
              id =>
                id !== modeId
            )
          : [
              ...currentModes,
              modeId,
            ]
    );
  }


  const [
    rootMagnitudeVisible,
    setRootMagnitudeVisible,
  ] = useState([
    true,
    true,
    true,
    true,
  ]);

  const [
    rootMagnitudeSignedRadial,
    setRootMagnitudeSignedRadial,
  ] = useState(true);

  const [
    asymptoticEnd,
    setAsymptoticEnd,
  ] = useState(0);

  /*
   * Temporary Roots-view placement controls.
   * Once the positions are right, we will bake these values
   * into CSS and remove the sliders.
   */
  const [rootsLeft, setRootsLeft] = useState(0);
  const [rootsBottom, setRootsBottom] = useState(0);

  /*
   * ROOTS FOOTER GEOMETRY
   *
   * The polar readout (ж_r, ж_theta) is anchored to the
   * rendered RIGHT EDGE of the four-root block, not to the
   * viewer width.
   */
  const rootsListRef = useRef(null);

  const [
    rootsListWidth,
    setRootsListWidth,
  ] = useState(0);

  const ROOTS_POLAR_GAP = 56;

  useEffect(() => {
    const node = rootsListRef.current;

    if (!node) {
      return;
    }

    const measure = () => {
      const nextWidth =
        node.getBoundingClientRect().width;

      /*
       * ResizeObserver can fire repeatedly for tiny
       * sub-pixel layout changes. Do not trigger a React
       * state update unless the measured width has actually
       * changed by a meaningful amount.
       */
      setRootsListWidth(
        (previousWidth) =>
          Math.abs(
            previousWidth - nextWidth
          ) < 0.25
            ? previousWidth
            : nextWidth
      );
    };

    measure();

    const observer =
      new ResizeObserver(measure);

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [
    mode,
  ]);

  /*
   * Shared Cross-ratio data alignment line.
   *
   * This ONE X coordinate controls:
   *   lambda / |lambda| / theta
   *   lambda / lambda' / lambda''
   *   Vol(lambda)
   *   zhe_r / zhe_theta
   */

const [polarBottom, setPolarBottom] = useState(0);

  /*
   * Fixed left-edge position for the three
   * Cross-ratio footer readouts:
   *
   *   Vol(lambda)
   *   zhe_r
   *   zhe_theta
   *
   * Independent of the changing width of the root readouts.
   */
  const crossRatioFooterLeft = 404;


  /*
   * ONE horizontal coordinate for every Cross-ratio
   * right/footer readout.
   */
  const [
    crossRatioDataX,
    setCrossRatioDataX,
  ] = useState(593);

  /*
   * Temporary Roots-scene placement controls.
   * These affect only the equation + root diagram.
   */

const [sceneScale, setSceneScale] = useState(130);
  const [showUnitCircle, setShowUnitCircle] = useState(true);

  /*
   * Final Roots complex-readout geometry.
   */
  const rootsComplexReadoutBottom = 32;
  const rootsComplexZheYOffset = 2;

  /*
   * Final Root-angles geometry.
   *
   * The graph itself is responsive within the available
   * region above the fixed argument readouts.
   */
  const rootAnglesLineWidth = 2.0;

  const rootAnglesCurrentPointRadius = 4.0;
  const rootMagnitudesDotRadius = 4.5;
  const rootsDotRadius = 3.5;
  const mobiusDotRadius = 3.5;
  const crossRatioDotRadius = 5.5;

  const rootAnglesSpecialPointRadius = 4.0;

  const rootAnglesFourPiOverEightLabelX = -31;
  const rootAnglesFourPiOverEightLabelY = 1;

  const rootAnglesXAxisFontSize = 18.0;

  const rootAnglesNegativeInfinityX = -10;
  const rootAnglesPositiveInfinityX = 5;

  /*
   * PERMANENT ROOTS CIRCLE CONTROLS
   *
   * These are two separate geometric layers:
   *   - Unit circle
   *   - Circle at infinity
   *
   * Keep both states independent of view-navigation UI.
   */
  const [
    showInfinityCircle,
    setShowInfinityCircle,
  ] = useState(true);
  const [
    showAnharmonicValues,
    setShowAnharmonicValues,
  ] = useState(false);

  /*
   * Final quartic-slider label geometry.
   */
  const specialLabelFontSize = 7;
  const specialLabelYOffset = 4;
  const endpointLabelYOffset = 1.5;
  const zeroLabelXOffset = -2.75;
  const negativeInfinityLabelXOffset = -7;
  const positiveInfinityLabelXOffset = -4;

  /*
   * QUARTIC PARAMETER PLAYBACK
   *
   * Full ping-pong period:
   *
   *   -infinity -> +infinity -> -infinity
   *
   * = 7 seconds total.
   */
  const [
    isAPlaying,
    setIsAPlaying,
  ] = useState(false);

  const [
    showMobiusTraces,
    setShowMobiusTraces,
  ] = useState(false);

  const [
    mobiusTraceMode,
    setMobiusTraceMode,
  ] = useState('current');

  /*
   * Normalized Möbius-plane representation.
   *
   * affine:
   *   the ordinary complex chart C.
   *
   * compactified:
   *   the Riemann sphere C ∪ {∞}, shown as the quotient disk
   *   D²/∂D². The entire dashed boundary is ONE point: ∞.
   *
   * For z = r e^{iθ}, inverse stereographic projection puts z
   * at spherical distance α = 2 atan(r) from the south pole 0.
   * The quotient-disk display uses that spherical distance:
   *
   *   ρ = R α/π = (2R/π) atan(r).
   *
   * Hence r=0 -> ρ=0, r=1 -> ρ=R/2, and r->∞ -> ρ->R.
   */
  const mobiusPlaneMode =
    'compactified';

  const [
    mobiusTraceBank,
    setMobiusTraceBank,
  ] = useState({});

  const [
    mobiusCatalogView,
    setMobiusCatalogView,
  ] = useState(null);

  /*
   * Separate the VIEW context from the assignment stage.
   *
   * false = original quartic-root picture
   * true  = normalized Riemann-sphere coordinate picture
   *
   * mobiusStage then describes only which assignments
   * have actually been imposed inside that normalized context.
   */
  const [
    mobiusNormalizedContext,
    setMobiusNormalizedContext,
  ] = useState(false);

  /*
   * Snapshot of the VIEW context at the beginning of a
   * Möbius transition.
   *
   * This is separate from mobiusFromStage because stage 0
   * can now mean either:
   *
   *   - original-root scene
   *   - normalized Riemann-sphere scene with zero assignments
   *
   * Keeping the source context lets the WHOLE scene animate
   * continuously instead of snapping before the roots move.
   */
  const [
    mobiusFromNormalizedContext,
    setMobiusFromNormalizedContext,
  ] = useState(false);

  const mobiusDisplayPointsRef = useRef(null);

  const aPlayFrameRef = useRef(null);

  const aPlayStateRef = useRef({
    position: 0,
    direction: 1,
  });
  const [
    mobiusStage,
    setMobiusStage,
  ] = useState(0);

  const [
    mobiusFromStage,
    setMobiusFromStage,
  ] = useState(0);

  const [
    mobiusHistory,
    setMobiusHistory,
  ] = useState([]);

  const [
    mobiusMix,
    setMobiusMix,
  ] = useState(1);

  const [
    mobiusAnimating,
    setMobiusAnimating,
  ] = useState(false);

  const mobiusAnimationRef = useRef(null);

  function chooseMobiusStage(targetStage) {
    if (mobiusAnimating) {
      return;
    }

    if (targetStage === mobiusStage) {
      return;
    }

    setMobiusHistory(
      (history) => [
        ...history,
        mobiusStage,
      ]
    );

    setMobiusFromNormalizedContext(
      mobiusNormalizedContext
    );
    setMobiusFromStage(mobiusStage);
    setMobiusStage(targetStage);
    setMobiusMix(0);
  }

  function toggleMobiusConstraint(bit) {
    if (mobiusAnimating) {
      return;
    }

    setMobiusNormalizedContext(true);

    const nextStage =
      mobiusStage ^ bit;

    setMobiusHistory(
      (history) => [
        ...history,
        mobiusStage,
      ]
    );

    setMobiusFromNormalizedContext(
      mobiusNormalizedContext
    );
    setMobiusFromStage(mobiusStage);
    setMobiusStage(nextStage);
    setMobiusMix(0);
  }

  function toggleMobiusCatalogConstraint(
    entry,
    bit
  ) {
    if (mobiusAnimating) {
      return;
    }

    setMobiusNormalizedContext(true);

    const current =
      mobiusStory.catalogStageLookup[
        mobiusStage
      ];

    const currentMask =
      current &&
      current.entryIndex === entry.entryIndex
        ? current.mask
        : 0;

    const nextMask =
      currentMask ^ bit;

    const targetStage =
      nextMask === 0
        ? 0
        : entry.stepStages[nextMask];

    chooseMobiusStage(targetStage);
  }

  function undoMobiusNormalization() {
    if (
      mobiusAnimating ||
      mobiusHistory.length === 0
    ) {
      return;
    }

    const previousStage =
      mobiusHistory[
        mobiusHistory.length - 1
      ];

    setMobiusHistory(
      (history) =>
        history.slice(0, -1)
    );

    setMobiusFromNormalizedContext(
      mobiusNormalizedContext
    );
    setMobiusFromStage(mobiusStage);
    setMobiusStage(previousStage);
    setMobiusMix(0);
  }

  useEffect(
    () => {
      if (mobiusFromStage === mobiusStage) {
        setMobiusMix(1);
        setMobiusAnimating(false);
        return undefined;
      }

      if (
        mobiusAnimationRef.current !== null
      ) {
        cancelAnimationFrame(
          mobiusAnimationRef.current
        );
      }

      setMobiusAnimating(true);

      const duration = 900;
      let startTime = null;

      const animate = (time) => {
        if (startTime === null) {
          startTime = time;
        }

        const linear =
          Math.min(
            1,
            (
              time -
              startTime
            ) /
            duration
          );

        const eased =
          linear *
          linear *
          (
            3 -
            2 * linear
          );

        setMobiusMix(eased);

        if (linear < 1) {
          mobiusAnimationRef.current =
            requestAnimationFrame(
              animate
            );
        } else {
          mobiusAnimationRef.current = null;
          setMobiusAnimating(false);
        }
      };

      mobiusAnimationRef.current =
        requestAnimationFrame(
          animate
        );

      return () => {
        if (
          mobiusAnimationRef.current !== null
        ) {
          cancelAnimationFrame(
            mobiusAnimationRef.current
          );
        }
      };
    },
    [
      mobiusFromStage,
      mobiusStage,
    ]
  );

  useEffect(() => {
    if (mode !== 'Möbius transform') {
      setMobiusFromStage(0);
      setMobiusStage(0);
      setMobiusHistory([]);
      setMobiusMix(1);
      setMobiusAnimating(false);
      setShowMobiusTraces(false);
      setMobiusTraceMode('current');
      setMobiusTraceBank({});
      setMobiusCatalogView(null);
      setMobiusNormalizedContext(false);
      setMobiusFromNormalizedContext(false);
    }
  }, [mode]);

  const sliderValue =
    asymptoticEnd !== 0
      ? asymptoticEnd
      : sliderFromA(a);

  /*
   * Apply one compactified slider coordinate directly.
   * This is shared by playback and preserves the exact
   * +/-infinity endpoint states.
   */
  function setAFromSliderPosition(t) {
    if (t <= -1) {
      setAsymptoticEnd(-1);
      return;
    }

    if (t >= 1) {
      setAsymptoticEnd(1);
      return;
    }

    setAsymptoticEnd(0);
    setA(aFromSlider(t));
  }

  function toggleAPlayback() {
    if (isAPlaying) {
      setIsAPlaying(false);
      return;
    }

    if (
      mode === 'Möbius transform' &&
      showMobiusTraces
    ) {
      /*
       * A new sweep replaces the trace for the CURRENT
       * normalization state, but preserves every other state
       * already collected in Accumulate mode.
       */
      setMobiusTraceBank(
        (bank) => ({
          ...bank,
          [mobiusStage]: [[], [], [], []],
        })
      );
    }

    aPlayStateRef.current = {
      position: sliderValue,

      /*
       * At +infinity, begin by moving left.
       * Everywhere else, begin by moving right.
       */
      direction:
        sliderValue >= 1
          ? -1
          : 1,
    };

    setIsAPlaying(true);
  }


  /*
   * Space bar toggles quartic parameter playback.
   *
   * Do not intercept Space while the user is operating
   * an input, slider, button, select, textarea, or editable field.
   */
  useEffect(() => {
    const handlePlaybackSpace = (event) => {
      if (
        mode === 'Monodromy' ||
        mode === 'Riemann surface'
      ) {
        return;
      }

      if (
        event.code !== 'Space' &&
        event.key !== ' '
      ) {
        return;
      }

      const target = event.target;

      /*
       * Space is a page-level play/pause shortcut.
       *
       * Allow it even when the quartic range slider or one of
       * the page buttons has focus. Only preserve normal Space
       * behavior inside genuine text-entry controls.
       */
      if (
        target instanceof HTMLElement &&
        (
          target.isContentEditable ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          (
            target.tagName === 'INPUT' &&
            target.getAttribute('type') !== 'range'
          )
        )
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      toggleAPlayback();
    };

    window.addEventListener(
      'keydown',
      handlePlaybackSpace
    );

    return () => {
      window.removeEventListener(
        'keydown',
        handlePlaybackSpace
      );
    };
  }, [
    isAPlaying,
    mode,
    showMobiusTraces,
    mobiusStage,
    sliderValue,
  ]);

  function enterMobiusNormalizedContext() {
    setMobiusNormalizedContext(true);
  }

  function resetMobiusAssignmentsForCatalog() {
    if (mobiusAnimationRef.current !== null) {
      cancelAnimationFrame(
        mobiusAnimationRef.current
      );
      mobiusAnimationRef.current = null;
    }

    setMobiusNormalizedContext(true);
    setMobiusFromNormalizedContext(true);

    /*
     * Zero assignments, but remain in the normalized
     * Riemann-sphere coordinate picture.
     */
    setMobiusFromStage(0);
    setMobiusStage(0);
    setMobiusHistory([]);
    setMobiusMix(1);
    setMobiusAnimating(false);

    /*
     * Opening a catalog is an assignment exercise,
     * not a request to draw a finished trace family.
     */
    setShowMobiusTraces(false);
    setMobiusTraceMode('current');
  }

  function toggleMobiusTraces() {
    setShowMobiusTraces(
      (visible) => !visible
    );
  }

  function clearMobiusTraces() {
    setMobiusTraceBank({});
    setMobiusTraceMode('current');
  }

  /*
   * Record the ACTUAL displayed positions during the a sweep.
   *
   * This means traces follow whatever Möbius normalization
   * state is currently active.
   */
  useEffect(() => {
    if (
      mode !== 'Möbius transform' ||
      !showMobiusTraces ||
      !isAPlaying ||
      mobiusAnimating
    ) {
      return;
    }

    const points =
      mobiusDisplayPointsRef.current;

    if (!points || points.length !== 4) {
      return;
    }

    setMobiusTraceBank(
      (bank) => {
        const paths =
          bank[mobiusStage] ??
          [[], [], [], []];

        const nextPaths = paths.map(
          (path, index) => {
            const point = points[index];

            /*
             * Find the most recent ACTUAL point.
             * A null entry means the trace was intentionally
             * broken at a discontinuity.
             */
            const last =
              path.length > 0
                ? path[path.length - 1]
                : null;

            const jump =
              last
                ? Math.hypot(
                    point.x - last.x,
                    point.y - last.y
                  )
                : 0;

            /*
             * Avoid storing nearly identical points while the
             * animation pauses at a keyed a-value.
             */
            if (
              last &&
              jump < 0.35
            ) {
              return path;
            }

            /*
             * A Möbius-transformed root can pass through
             * infinity and reappear elsewhere on the
             * compactified plane.
             *
             * That is a discontinuity of this affine chart,
             * NOT a straight trajectory across the viewer.
             *
             * Insert a pen-up marker so the renderer starts a
             * new trace segment instead of drawing a chord.
             */
            if (
              last &&
              jump > 36
            ) {
              return [
                ...path,
                null,
                {
                  x: point.x,
                  y: point.y,
                },
              ];
            }

            return [
              ...path,
              {
                x: point.x,
                y: point.y,
              },
            ];
          }
        );

        return {
          ...bank,
          [mobiusStage]: nextPaths,
        };
      }
    );
  }, [
    a,
    asymptoticEnd,
    isAPlaying,
    mode,
    showMobiusTraces,
  ]);

  /*
   * Trace sets are intentionally NOT cleared when mobiusStage
   * changes. Each partial/full normalization keeps its own
   * four-root trajectory in mobiusTraceBank.
   */

  useEffect(
    () => {
      if (!isAPlaying) {
        if (aPlayFrameRef.current !== null) {
          cancelAnimationFrame(
            aPlayFrameRef.current
          );

          aPlayFrameRef.current = null;
        }

        return;
      }

      /*
       * PLAYBACK KEYED TO THE NINE SPECIAL POSITIONS
       *
       *   -∞
       *   -a*
       *   -a_h
       *   -a†
       *    0
       *   +a†
       *   +a_h
       *   +a*
       *   +∞
       *
       * Each keyed position is held briefly so its exact
       * symbolic / limiting data is actually rendered.
       */
      const keyedStops = [
        {
          position: -1,
          aValue: -Infinity,
        },
        {
          position:
            sliderFromA(
              -BRANCH_A
            ),
          aValue:
            -BRANCH_A,
        },
        {
          position:
            sliderFromA(
              -HARMONIC_A
            ),
          aValue:
            -HARMONIC_A,
        },
        {
          position:
            sliderFromA(
              -UNIT_CIRCLE_A
            ),
          aValue:
            -UNIT_CIRCLE_A,
        },
        {
          position: 0,
          aValue: 0,
        },
        {
          position:
            sliderFromA(
              UNIT_CIRCLE_A
            ),
          aValue:
            UNIT_CIRCLE_A,
        },
        {
          position:
            sliderFromA(
              HARMONIC_A
            ),
          aValue:
            HARMONIC_A,
        },
        {
          position:
            sliderFromA(
              BRANCH_A
            ),
          aValue:
            BRANCH_A,
        },
        {
          position: 1,
          aValue: Infinity,
        },
      ];


      /*
       * Add one zero-hold guide stop halfway between every pair
       * of established keyed positions.
       *
       * The midpoint is taken in the compactified SLIDER
       * coordinate, not by averaging a-values. That preserves the
       * intended geometry of the parameter control.
       *
       * 9 keyed stops + 8 guide stops = 17 total stops.
       */
      const guideStops =
        keyedStops
          .slice(
            0,
            -1
          )
          .map(
            (
              stop,
              index
            ) => {
              const nextStop =
                keyedStops[
                  index + 1
                ];

              const position =
                (
                  stop.position +
                  nextStop.position
                ) / 2;

              return {
                position,

                aValue:
                  aFromSlider(
                    position
                  ),

                holdMs: 0,
              };
            }
          );


      const specialStops = [
        ...keyedStops.map(
          stop => ({
            ...stop,

            holdMs:
              Math.abs(
                stop.position
              ) >= 1
                ? 700
                : 35,
          })
        ),

        ...guideStops,
      ].sort(
        (
          left,
          right
        ) =>
          left.position -
          right.position
      );

      /*
       * Playback timing.
       *
       * Keep the established travel speed, but make the
       * +/-infinity states substantially easier to see.
       *
       * Previous infinity hold: 240 ms.
       * New infinity hold:      700 ms.
       */
      const stopHoldMs = 35;
      const infinityStopHoldMs = 700;

      /*
       * Smooth Riemann-view playback:
       *
       * The moving portion is now twice as long as before:
       *
       *   previous moving duration = 4310 ms
       *   new moving duration      = 8620 ms
       *
       * The semantic holds are unchanged. Additional midpoint
       * guide stops carry zero hold time and exist only to prevent
       * large visual steps between neighboring keyed positions.
       */
      const movingDuration = 8620;

      const speed =
        2 /
        movingDuration;

      const applyExactStop =
        (stop) => {
          if (
            stop.aValue ===
            -Infinity
          ) {
            setAsymptoticEnd(-1);
            return;
          }

          if (
            stop.aValue ===
            Infinity
          ) {
            setAsymptoticEnd(1);
            return;
          }

          setAsymptoticEnd(0);
          setA(stop.aValue);
        };

      let previousTime = null;

      /*
       * Extend the existing playback ref without changing
       * its public behavior.
       */
      aPlayStateRef.current = {
        ...aPlayStateRef.current,
        holdUntil: 0,
      };

      const animate = (time) => {
        if (previousTime === null) {
          previousTime = time;
        }

        const elapsed =
          time - previousTime;

        previousTime = time;

        let {
          position,
          direction,
          holdUntil = 0,
        } = aPlayStateRef.current;

        /*
         * Stay exactly on a keyed position during its
         * short display hold.
         */
        if (
          holdUntil > 0 &&
          time < holdUntil
        ) {
          aPlayFrameRef.current =
            requestAnimationFrame(
              animate
            );

          return;
        }

        if (holdUntil > 0) {
          holdUntil = 0;
        }

        const proposedPosition =
          position +
          direction *
          speed *
          elapsed;

        /*
         * Find the FIRST keyed stop crossed during this
         * frame. This prevents requestAnimationFrame from
         * numerically stepping over any preset.
         */
        let crossedStop = null;

        if (direction > 0) {
          for (
            let index = 0;
            index <
            specialStops.length;
            index += 1
          ) {
            const stop =
              specialStops[index];

            if (
              stop.position >
                position +
                  1e-12 &&
              stop.position <=
                proposedPosition +
                  1e-12
            ) {
              crossedStop = stop;
              break;
            }
          }
        } else {
          for (
            let index =
              specialStops.length - 1;
            index >= 0;
            index -= 1
          ) {
            const stop =
              specialStops[index];

            if (
              stop.position <
                position -
                  1e-12 &&
              stop.position >=
                proposedPosition -
                  1e-12
            ) {
              crossedStop = stop;
              break;
            }
          }
        }

        if (crossedStop) {
          position =
            crossedStop.position;

          applyExactStop(
            crossedStop
          );

          /*
           * Infinity is a REAL animation state now.
           * Land there first, display it, then reverse.
           */
          if (
            position >= 1
          ) {
            direction = -1;
          } else if (
            position <= -1
          ) {
            direction = 1;
          }

          aPlayStateRef.current = {
            position,
            direction,
            holdUntil:
              time +
              (
                crossedStop.holdMs ??
                (
                  Math.abs(position) >= 1
                    ? infinityStopHoldMs
                    : stopHoldMs
                )
              ),
          };

          aPlayFrameRef.current =
            requestAnimationFrame(
              animate
            );

          return;
        }

        /*
         * Between keyed positions, move continuously.
         */
        position =
          Math.max(
            -1,
            Math.min(
              1,
              proposedPosition
            )
          );

        aPlayStateRef.current = {
          position,
          direction,
          holdUntil: 0,
        };

        setAFromSliderPosition(
          position
        );

        aPlayFrameRef.current =
          requestAnimationFrame(
            animate
          );
      };

      aPlayFrameRef.current =
        requestAnimationFrame(
          animate
        );

      return () => {
        if (
          aPlayFrameRef.current !== null
        ) {
          cancelAnimationFrame(
            aPlayFrameRef.current
          );

          aPlayFrameRef.current = null;
        }
      };
    },
    [isAPlaying]
  );

  const isBranchPreset =
    asymptoticEnd === 0 &&
    Math.abs(
      Math.abs(a) -
      BRANCH_A
    ) < 1e-12;

  const isUnitCirclePreset =
    asymptoticEnd === 0 &&
    Math.abs(
      Math.abs(a) -
      UNIT_CIRCLE_A
    ) < 1e-12;

  const isNegativeUnitCirclePreset =
    isUnitCirclePreset &&
    a < 0;

  const isPositiveUnitCirclePreset =
    isUnitCirclePreset &&
    a > 0;

  const isHarmonicPreset =
    asymptoticEnd === 0 &&
    Math.abs(
      Math.abs(a) -
      HARMONIC_A
    ) < 1e-12;

  const aDisplayLatex =
    asymptoticEnd === 1
      ? String.raw`a = +\infty`
      : asymptoticEnd === -1
        ? String.raw`a = -\infty`
        : isHarmonicPreset
          ? (
              a < 0
                ? String.raw`a = -\sqrt{\frac{8}{3}-\frac{4\pi}{27}}`
                : String.raw`a = \sqrt{\frac{8}{3}-\frac{4\pi}{27}}`
            )
          : isUnitCirclePreset
            ? (
                a < 0
                  ? String.raw`a = -\left(1-\frac{1}{2\pi}\right)`
                  : String.raw`a = 1-\frac{1}{2\pi}`
              )
            : Math.abs(a) < 1e-12
              ? 'a = 0'
              : `a = ${a.toPrecision(15)}`;

  const roots = useMemo(
    () => solveQuarticRoots(a),
    [a]
  );

  const displayRoots = useMemo(
    () =>
      roots.map((root) => {
        const scale = Math.max(
          1,
          Math.abs(root.re),
          Math.abs(root.im)
        );

        const zeroTol =
          1e-8 * scale;

        return {
          re:
            Math.abs(root.re) < zeroTol
              ? 0
              : root.re,

          im:
            Math.abs(root.im) < zeroTol
              ? 0
              : root.im,
        };
      }),
    [roots]
  );

  const residual = useMemo(
    () => maxRootResidual(
      roots,
      a
    ),
    [roots, a]
  );

  const crossRatio = useMemo(
    () => computeCrossRatio(
      roots
    ),
    [roots]
  );

  /*
   * In the central regime |a| <= a*, the cross-ratio and
   * its companion shapes are mathematically real.
   * Suppress numerical imaginary residue in the UI.
   */
  const crossRatioDisplay = useMemo(
    () => {
      /*
       * At either compactified endpoint, the displayed
       * projective shape is the exact regular ideal
       * tetrahedron:
       *
       *   lambda = exp(i*pi/3)
       *
       * and the two companion shape parameters coincide
       * with lambda.
       */
      if (asymptoticEnd !== 0) {
        const regularShape = {
          re: 0.5,
          im: Math.sqrt(3) / 2,
        };

        return {
          z: regularShape,
          zPrime: regularShape,
          zDoublePrime: regularShape,
          modulus: 1,
          theta: Math.PI / 3,
        };
      }

      /*
       * At either real branch point a = +/-a_*,
       * the first two persistent roots coalesce.
       *
       * Therefore the cross-ratio degenerates exactly to
       *
       *   lambda   = 1
       *   lambda'  = infinity
       *   lambda'' = 0
       *
       * Do not expose floating-point residues here.
       */
      if (isBranchPreset) {
        return {
          z: {
            re: 1,
            im: 0,
          },

          zPrime: {
            re: Infinity,
            im: 0,
          },

          zDoublePrime: {
            re: 0,
            im: 0,
          },

          modulus: 1,
          theta: 0,
        };
      }

      /*
       * At either harmonic preset a = +/-a_h, the six
       * anharmonic values collapse pairwise to
       *
       *   1/2, 2, -1, 2, 1/2, -1.
       */
      if (isHarmonicPreset) {
        return {
          z: {
            re: 1 / 2,
            im: 0,
          },

          zPrime: {
            re: 2,
            im: 0,
          },

          zDoublePrime: {
            re: -1,
            im: 0,
          },

          modulus: 1 / 2,
          theta: 0,
        };
      }

      /*
       * In the central regime |a| <= a*, the cross-ratio
       * and its companion shapes are mathematically real.
       * Suppress numerical imaginary residue in the UI.
       */
      const central =
        Math.abs(a) <= BRANCH_A;

      const cleanComplex = (value) => ({
        re: value.re,
        im: central ? 0 : value.im,
      });

      return {
        z: cleanComplex(
          crossRatio.z
        ),

        zPrime: cleanComplex(
          crossRatio.zPrime
        ),

        zDoublePrime:
          cleanComplex(
            crossRatio.zDoublePrime
          ),

        modulus:
          crossRatio.modulus,

        theta:
          central
            ? 0
            : crossRatio.theta,
      };
    },
    [
      a,
      asymptoticEnd,
      crossRatio,
      isBranchPreset,
      isHarmonicPreset,
    ]
  );

  const anharmonicReadouts = useMemo(
    () => {
      const one = { re: 1, im: 0 };
      const lambda = crossRatioDisplay.z;

      const divideComplex = (u, v) => {
        const denominator =
          v.re ** 2 + v.im ** 2;

        if (denominator < 1e-14) {
          return null;
        }

        return {
          re:
            (
              u.re * v.re +
              u.im * v.im
            ) / denominator,
          im:
            (
              u.im * v.re -
              u.re * v.im
            ) / denominator,
        };
      };

      const oneMinusLambda = {
        re: 1 - lambda.re,
        im: -lambda.im,
      };

      const lambdaMinusOne = {
        re: lambda.re - 1,
        im: lambda.im,
      };

      const inverseLambda =
        divideComplex(one, lambda);

      const inverseOneMinusLambda =
        divideComplex(
          one,
          oneMinusLambda
        );

      const oneMinusInverseLambda =
        inverseLambda
          ? {
              re: 1 - inverseLambda.re,
              im: -inverseLambda.im,
            }
          : null;

      const lambdaOverLambdaMinusOne =
        divideComplex(
          lambda,
          lambdaMinusOne
        );

      return [
        {
          key: 'lambda',
          latex: String.raw`\lambda`,
          value: lambda,
        },
        {
          key: 'lambda-prime',
          latex: String.raw`\lambda'`,
          value: inverseOneMinusLambda,
        },
        {
          key: 'lambda-double-prime',
          latex: String.raw`\lambda''`,
          value: oneMinusInverseLambda,
        },
        {
          key: 'inverse-lambda',
          latex: String.raw`\lambda^{-1}`,
          value: inverseLambda,
        },
        {
          key: 'inverse-lambda-prime',
          latex: String.raw`{\lambda'}^{-1}`,
          value: oneMinusLambda,
        },
        {
          key: 'inverse-lambda-double-prime',
          latex: String.raw`{\lambda''}^{-1}`,
          value: lambdaOverLambdaMinusOne,
        },
      ];
    },
    [crossRatioDisplay]
  );

  const tetrahedron = useMemo(
    () => idealTetrahedronVolume(
      crossRatio
    ),
    [crossRatio]
  );

  const zhe1 = displayRoots[0];
  const zhe2 = displayRoots[1];
  const zhe3 = displayRoots[2];
  const zhe4 = displayRoots[3];

  const zhe1Modulus =
    Math.hypot(
      zhe1.re,
      zhe1.im
    );

  const zhe2Modulus =
    Math.hypot(
      zhe2.re,
      zhe2.im
    );

  const zhe3Modulus =
    Math.hypot(
      zhe3.re,
      zhe3.im
    );

  const zhe4Modulus =
    Math.hypot(
      zhe4.re,
      zhe4.im
    );

  const zhe1Arg =
    Math.atan2(
      zhe1.im,
      zhe1.re
    );

  const zhe2Arg =
    Math.atan2(
      zhe2.im,
      zhe2.re
    );

  const zhe3Arg =
    Math.atan2(
      zhe3.im,
      zhe3.re
    );

  const zhe4Arg =
    Math.atan2(
      zhe4.im,
      zhe4.re
    );

  const zheR =
    zhe3Modulus;

  const zheTheta =
    zhe3Arg;

  const rootsPolarArgs = [
    zhe1Arg,
    zhe2Arg,
    zhe3Arg,
    zhe4Arg,
  ];

  const rootsPolarModuli = [
    zhe1Modulus,
    zhe2Modulus,
    zhe3Modulus,
    zhe4Modulus,
  ];

  function rootsPolarArgLatex(index) {
    /*
     * Exact compactified endpoint arguments.
     *
     * +infinity:
     *   zhe_1 -> 0
     *   zhe_2 -> infinity at angle 0
     *   zhe_3 -> infinity at +2pi/3
     *   zhe_4 -> infinity at -2pi/3
     *
     * -infinity:
     *   zhe_1 -> infinity at angle pi
     *   zhe_2 -> 0
     *   zhe_3 -> infinity at +2pi/6
     *   zhe_4 -> infinity at -2pi/6
     */
    if (asymptoticEnd === 1) {
      const positiveInfinityArgs = [
        String.raw`) = 0\;\text{radians}`,
        String.raw`) = 0\;\text{radians}`,
        String.raw`) = \frac{2\pi}{3}\;\text{radians}`,
        String.raw`) = -\frac{2\pi}{3}\;\text{radians}`,
      ];

      return positiveInfinityArgs[index];
    }

    if (asymptoticEnd === -1) {
      const negativeInfinityArgs = [
        String.raw`) = \pi\;\text{radians}`,
        String.raw`) = \pi\;\text{radians}`,
        String.raw`) = \frac{2\pi}{6}\;\text{radians}`,
        String.raw`) = -\frac{2\pi}{6}\;\text{radians}`,
      ];

      return negativeInfinityArgs[index];
    }

    /*
     * Exact angular readouts at keyed presets.
     *
     * Every displayed argument retains the unit "radians".
     */

    if (Math.abs(a) < 1e-12) {
      return (
        index === 0 ||
        index === 2
          ? String.raw`) = \frac{2\pi}{4}\;\text{radians}`
          : String.raw`) = -\frac{2\pi}{4}\;\text{radians}`
      );
    }

    if (
      isNegativeUnitCirclePreset
    ) {
      if (index < 2) {
        return (
          index === 0
            ? String.raw`) = \frac{2\pi}{3}\;\text{radians}`
            : String.raw`) = -\frac{2\pi}{3}\;\text{radians}`
        );
      }

      return (
        index === 2
          ? String.raw`) = \arctan\sqrt{8\pi-1}\;\text{radians}`
          : String.raw`) = -\arctan\sqrt{8\pi-1}\;\text{radians}`
      );
    }

    if (
      isPositiveUnitCirclePreset
    ) {
      if (index < 2) {
        return (
          index === 0
            ? String.raw`) = \frac{2\pi}{6}\;\text{radians}`
            : String.raw`) = -\frac{2\pi}{6}\;\text{radians}`
        );
      }

      return (
        index === 2
          ? String.raw`) = \pi-\arctan\sqrt{8\pi-1}\;\text{radians}`
          : String.raw`) = -\pi+\arctan\sqrt{8\pi-1}\;\text{radians}`
      );
    }

    if (
      asymptoticEnd === 0 &&
      Math.abs(a) >=
        BRANCH_A - 1e-12 &&
      index < 2
    ) {
      return (
        a < 0
          ? String.raw`) = \pi\;\text{radians}`
          : String.raw`) = 0\;\text{radians}`
      );
    }

    return (
      `) = ${rootsPolarArgs[index].toPrecision(15)}` +
      `\\;\\text{radians}`
    );
  }

  function rootsPolarModulusLatex(index) {
    if (isUnitCirclePreset) {
      if (index < 2) {
        return '| = 1';
      }

      return String.raw`| = \sqrt{2\pi}`;
    }

    if (
      isBranchPreset &&
      index >= 2
    ) {
      return String.raw`| = \sqrt{\pi+\sqrt{\pi^2+6\pi}}`;
    }

    return (
      `| = ${rootsPolarModuli[index].toPrecision(15)}`
    );
  }

  const rootAngleSamples = useMemo(
    () => {
      const samples = [];
      const count = 241;

      /*
       * Dense ordinary samples PLUS exact junction coordinates.
       *
       * The exact +/-a_* samples make adjoining curve pieces share
       * the same point. The visible +/-infinity endpoints are drawn
       * at t = +/-1 so no curve stops short of the graph boundary.
       */
      const tValues = [];

      for (
        let index = 0;
        index < count;
        index += 1
      ) {
        tValues.push(
          -0.985 +
          (
            1.97 *
            index /
            (count - 1)
          )
        );
      }

      tValues.push(
        -1,
        sliderFromA(-BRANCH_A),
        sliderFromA(BRANCH_A),
        1
      );

      /*
       * Resolve the actual one-sided approach to each branch pole.
       *
       * These are genuine quartic samples, not screen-space
       * interpolation. They let both the affine and compactified
       * trajectories reveal their real limiting geometry.
       */
      const branchApproachScales = [
        1e-2,
        3e-3,
        1e-3,
        3e-4,
        1e-4,
        3e-5,
        1e-5,
        3e-6,
        1e-6,
        3e-7,
        1e-7,
      ];

      for (const branchSign of [-1, 1]) {
        const branchA =
          branchSign * BRANCH_A;

        for (
          const scale of branchApproachScales
        ) {
          const delta =
            BRANCH_A * scale;

          tValues.push(
            sliderFromA(
              branchA - delta
            ),
            sliderFromA(
              branchA + delta
            )
          );
        }
      }

      tValues.sort(
        (left, right) =>
          left - right
      );

      const orderedTValues =
        tValues.filter(
          (value, index) =>
            index === 0 ||
            Math.abs(
              value -
              tValues[index - 1]
            ) > 1e-12
        );

      let previousRoots = null;

      for (const t of orderedTValues) {
        /*
         * At t = +/-1, a is infinite. Evaluate the roots a hair
         * inside the endpoint, but DRAW the sample exactly at
         * the compactified graph boundary.
         */
        const evaluationT =
          t <= -1
            ? -0.9999
            : t >= 1
              ? 0.9999
              : t;

        const sampleA =
          aFromSlider(evaluationT);

        const rawRoots =
          solveQuarticRoots(
            sampleA
          );

        const continuityRoots =
          previousRoots === null
            ? seedPersistentRootIdentities(
                sampleA,
                rawRoots
              )
            : orderRootsByContinuity(
                previousRoots,
                rawRoots
              );

        const sampleRoots =
          canonicalizePersistentRootIdentities(
            sampleA,
            continuityRoots
          );

        previousRoots =
          sampleRoots;

        const args =
          sampleRoots.map(
            (root) => {
              let angle =
                Math.atan2(
                  root.im,
                  root.re
                );

              if (angle < 0) {
                angle +=
                  2 * Math.PI;
              }

              return angle;
            }
          );

        samples.push({
          t,
          a:
            t === -1
              ? -Infinity
              : t === 1
                ? Infinity
                : sampleA,
          roots: sampleRoots,
          args,
        });
      }

      return samples;
    },
    []
  );

  const rootMagnitudeTrackedCurrentRoots = useMemo(() => {
    const currentT = asymptoticEnd !== 0
      ? asymptoticEnd
      : Math.max(-1, Math.min(1, sliderFromA(a)));

    const nearestSample = rootAngleSamples.reduce(
      (best, sample) =>
        Math.abs(sample.t - currentT) < Math.abs(best.t - currentT)
          ? sample
          : best,
      rootAngleSamples[0]
    );

    if (asymptoticEnd !== 0) {
      return nearestSample.roots;
    }

    return canonicalizePersistentRootIdentities(
      a,
      orderRootsByContinuity(
        nearestSample.roots,
        roots
      )
    );
  }, [a, asymptoticEnd, rootAngleSamples, roots]);

  const rootMagnitudeTrackedCurrentModuli =
    rootMagnitudeTrackedCurrentRoots.map(
      (root) => Math.hypot(root.re, root.im)
    );

  function rootLogMagnitudeLatex(index) {
    if (asymptoticEnd === 1) {
      return index === 0
        ? String.raw`= -\infty`
        : String.raw`= +\infty`;
    }

    if (asymptoticEnd === -1) {
      return index === 1
        ? String.raw`= -\infty`
        : String.raw`= +\infty`;
    }

    /*
     * Exact keyed Root-magnitude values.
     *
     * These replace the numerical readout ONLY at the
     * corresponding exact quartic-parameter stops.
     */

    /*
     * a = 0
     *
     * |zhe_1| = |zhe_2|
     *   = sqrt(pi - sqrt(pi^2 - 2pi))
     *
     * |zhe_3| = |zhe_4|
     *   = sqrt(pi + sqrt(pi^2 - 2pi))
     */
    if (Math.abs(a) < 1e-12) {
      return index < 2
        ? String.raw`= \frac{1}{2}\log\!\left(\pi-\sqrt{\pi^2-2\pi}\right)`
        : String.raw`= \frac{1}{2}\log\!\left(\pi+\sqrt{\pi^2-2\pi}\right)`;
    }

    /*
     * a = +/-a_3
     *
     * |zhe_1| = |zhe_2| = 1
     * |zhe_3| = |zhe_4| = sqrt(2pi)
     */
    if (isUnitCirclePreset) {
      return index < 2
        ? '= 0'
        : String.raw`= \frac{1}{2}\log(2\pi)`;
    }

    /*
     * a = +/-a_1
     *
     * The first pair coalesces at
     *
     *   |zhe|^2 =
     *   (sqrt(pi^2 + 6pi) - pi) / 3.
     *
     * The second conjugate pair follows from
     * |zhe_1 zhe_2 zhe_3 zhe_4| = 2pi.
     */
    if (isBranchPreset) {
      return index < 2
        ? String.raw`= \frac{1}{2}\log\!\left(\frac{\sqrt{\pi^2+6\pi}-\pi}{3}\right)`
        : String.raw`= \frac{1}{2}\log\!\left(\frac{6\pi}{\sqrt{\pi^2+6\pi}-\pi}\right)`;
    }

    const value = Math.log(
      rootMagnitudeTrackedCurrentModuli[index]
    );

    return Math.abs(value) < 1e-12
      ? '= 0'
      : `= ${value.toPrecision(15)}`;
  }

  function rootSignedRadialLatex(index) {
    /*
     * Signed radial coordinate:
     *
     *   rho_s(zhe) =
     *     +|zhe|  in the upper half-plane,
     *     -|zhe|  in the lower half-plane,
     *     sgn(Re zhe)|zhe| on the real axis.
     */

    if (asymptoticEnd === 1) {
      const values = [
        '= 0',
        String.raw`= +\infty`,
        String.raw`= +\infty`,
        String.raw`= -\infty`,
      ];

      return values[index];
    }

    if (asymptoticEnd === -1) {
      const values = [
        String.raw`= -\infty`,
        '= 0',
        String.raw`= +\infty`,
        String.raw`= -\infty`,
      ];

      return values[index];
    }

    /*
     * a = 0
     */
    if (Math.abs(a) < 1e-12) {
      const small =
        String.raw`\sqrt{\pi-\sqrt{\pi^2-2\pi}}`;

      const large =
        String.raw`\sqrt{\pi+\sqrt{\pi^2-2\pi}}`;

      return [
        `= +${small}`,
        `= -${small}`,
        `= +${large}`,
        `= -${large}`,
      ][index];
    }

    /*
     * a = +/-a_3
     */
    if (isUnitCirclePreset) {
      return [
        '= +1',
        '= -1',
        String.raw`= +\sqrt{2\pi}`,
        String.raw`= -\sqrt{2\pi}`,
      ][index];
    }

    /*
     * a = +/-a_1
     *
     * First two roots coalesce on the real axis.
     */
    if (isBranchPreset) {
      const collision =
        String.raw`\sqrt{\frac{\sqrt{\pi^2+6\pi}-\pi}{3}}`;

      const outer =
        String.raw`\sqrt{\frac{6\pi}{\sqrt{\pi^2+6\pi}-\pi}}`;

      if (a < 0) {
        return [
          `= -${collision}`,
          `= -${collision}`,
          `= +${outer}`,
          `= -${outer}`,
        ][index];
      }

      return [
        `= +${collision}`,
        `= +${collision}`,
        `= +${outer}`,
        `= -${outer}`,
      ][index];
    }

    const root =
      rootMagnitudeTrackedCurrentRoots[
        index
      ];

    const magnitude =
      Math.hypot(
        root.re,
        root.im
      );

    const tolerance =
      1e-9 *
      Math.max(
        1,
        Math.abs(root.re),
        Math.abs(root.im)
      );

    let signedValue = 0;

    if (
      Math.abs(root.im) >
      tolerance
    ) {
      signedValue =
        root.im > 0
          ? magnitude
          : -magnitude;
    } else if (
      Math.abs(root.re) >
      tolerance
    ) {
      signedValue =
        root.re > 0
          ? magnitude
          : -magnitude;
    }

    if (
      Math.abs(signedValue) <
      1e-12
    ) {
      return '= 0';
    }

    return (
      `= ${signedValue.toPrecision(15)}`
    );
  }


  const shapeSamples = useMemo(
    () => {
      const samples = [];
      const count = 321;

      for (
        let index = 0;
        index < count;
        index += 1
      ) {
        const t =
          -0.992 +
          (
            1.984 *
            index /
            (count - 1)
          );

        const sampleA =
          aFromSlider(t);

        const sampleRoots =
          solveQuarticRoots(
            sampleA
          );

        const sampleShape =
          computeCrossRatio(
            sampleRoots
          );

        samples.push({
          t,
          a: sampleA,
          z: sampleShape.z,
          modulus:
            sampleShape.modulus,
          theta:
            sampleShape.theta,
        });
      }

      return samples;
    },
    []
  );

  const volumeSamples = useMemo(
    () =>
      shapeSamples.map(
        (sample) => {
          const shape = {
            z: sample.z,

            zPrime: {
              re:
                (
                  1 -
                  sample.z.re
                ) /
                (
                  (
                    1 -
                    sample.z.re
                  ) ** 2 +
                  sample.z.im ** 2
                ),

              im:
                sample.z.im /
                (
                  (
                    1 -
                    sample.z.re
                  ) ** 2 +
                  sample.z.im ** 2
                ),
            },

            zDoublePrime: (() => {
              const denominator =
                sample.z.re ** 2 +
                sample.z.im ** 2;

              return {
                re:
                  1 -
                  sample.z.re /
                    denominator,

                im:
                  sample.z.im /
                    denominator,
              };
            })(),
          };

          const result =
            idealTetrahedronVolume(
              shape
            );

          const volume =
            Math.max(
              0,
              result.volume
            );

          return {
            ...sample,
            volume,
            doubledVolume:
              2 * volume,
          };
        }
      ),
    [shapeSamples]
  );

  function jumpToSpecialA(nextA) {
    setIsAPlaying(false);

    if (nextA === -Infinity) {
      setAsymptoticEnd(-1);
      return;
    }

    if (nextA === Infinity) {
      setAsymptoticEnd(1);
      return;
    }

    setAsymptoticEnd(0);
    setA(nextA);
  }

  function handleSliderChange(event) {
    const t = Number(event.target.value);

    setIsAPlaying(false);

    /*
     * MANUAL SLIDER SNAP
     *
     * The special positions generally do not lie on the
     * range input's 0.00025 numerical step, so ordinary
     * dragging almost never hits them exactly.
     *
     * Give each interior keyed position a small magnetic
     * capture zone. Once the pointer enters that zone,
     * land on the exact preset value so all exact symbolic
     * readouts activate.
     */
    const snapStops = [
      {
        position:
          sliderFromA(-BRANCH_A),
        aValue:
          -BRANCH_A,
      },
      {
        position:
          sliderFromA(-HARMONIC_A),
        aValue:
          -HARMONIC_A,
      },
      {
        position:
          sliderFromA(-UNIT_CIRCLE_A),
        aValue:
          -UNIT_CIRCLE_A,
      },
      {
        position: 0,
        aValue: 0,
      },
      {
        position:
          sliderFromA(UNIT_CIRCLE_A),
        aValue:
          UNIT_CIRCLE_A,
      },
      {
        position:
          sliderFromA(HARMONIC_A),
        aValue:
          HARMONIC_A,
      },
      {
        position:
          sliderFromA(BRANCH_A),
        aValue:
          BRANCH_A,
      },
    ];

    /*
     * In the slider's [-1, 1] coordinate this is a modest
     * capture radius: noticeable enough to make the presets
     * easy to hit, but small enough that continuous dragging
     * between them remains smooth.
     */
    const snapRadius = 0.014;

    let nearestStop = null;
    let nearestDistance = Infinity;

    for (const stop of snapStops) {
      const distance =
        Math.abs(
          t -
          stop.position
        );

      if (
        distance <= snapRadius &&
        distance < nearestDistance
      ) {
        nearestStop = stop;
        nearestDistance = distance;
      }
    }

    if (nearestStop) {
      setAsymptoticEnd(0);
      setA(
        nearestStop.aValue
      );
      return;
    }

    setAFromSliderPosition(t);
  }

  function handleAInputChange(event) {
    const next = Number(event.target.value);

    if (Number.isFinite(next)) {
      setAsymptoticEnd(0);
      setA(next);
    }
  }

  function resetPhysicalA() {
    setIsAPlaying(false);
    setAsymptoticEnd(0);
    setA(PHYSICAL_A);
  }

  const sliderThumbRadiusPx = 7;

  function sliderCenterLeft(t) {
    return `calc(${
      50 * (t + 1)
    }% + ${
      -sliderThumbRadiusPx * t
    }px)`;
  }

  function formatCrossRatio15(value) {
    if (value === Infinity) {
      return String.raw`\infty`;
    }

    if (value === -Infinity) {
      return String.raw`-\infty`;
    }

    if (
      isHarmonicPreset &&
      Math.abs(value - 0.5) < 1e-12
    ) {
      return '1/2';
    }

    if (
      Math.abs(value) < 1e-12
    ) {
      return '0';
    }

    const nearestInteger =
      Math.round(value);

    if (
      Math.abs(
        value -
        nearestInteger
      ) < 1e-12
    ) {
      return String(
        nearestInteger
      );
    }

    return value.toPrecision(15);
  }

  function formatCrossRatioAngleLatex(value) {
    if (Math.abs(value) < 1e-12) {
      return '0';
    }

    const piAngles = [
      [1 / 6, String.raw`\frac{\pi}{6}`],
      [1 / 4, String.raw`\frac{\pi}{4}`],
      [1 / 3, String.raw`\frac{2\pi}{6}`],
      [1 / 2, String.raw`\frac{\pi}{2}`],
      [2 / 3, String.raw`\frac{2\pi}{3}`],
      [3 / 4, String.raw`\frac{3\pi}{4}`],
      [5 / 6, String.raw`\frac{5\pi}{6}`],
      [1, String.raw`\pi`],
    ];

    for (const [multiple, latex] of piAngles) {
      const target =
        multiple * Math.PI;

      if (
        Math.abs(value - target) < 1e-12
      ) {
        return latex;
      }

      if (
        Math.abs(value + target) < 1e-12
      ) {
        return `-${latex}`;
      }
    }

    return formatCrossRatio15(value);
  }

  function complexCrossRatioLatex(value) {
    const re =
      Math.abs(value.re) < 1e-12
        ? 0
        : value.re;

    const im =
      Math.abs(value.im) < 1e-12
        ? 0
        : value.im;

    if (im === 0) {
      return formatCrossRatio15(re);
    }

    return (
      `${formatCrossRatio15(re)} ` +
      `${im < 0 ? '-' : '+'} ` +
      `${formatCrossRatio15(Math.abs(im))}` +
      String.raw`\,i`
    );
  }

  function mobiusValueLatex(value) {
    if (
      value == null ||
      !Number.isFinite(value.re) ||
      !Number.isFinite(value.im)
    ) {
      return String.raw`\infty`;
    }

    return complexCrossRatioLatex({
      re:
        Math.abs(value.re) < 1e-12
          ? 0
          : value.re,
      im:
        Math.abs(value.im) < 1e-12
          ? 0
          : value.im,
    });
  }

  const mobiusStory = useMemo(
    () => {
      const subtract = (u, v) => ({
        re: u.re - v.re,
        im: u.im - v.im,
      });

      const multiply = (u, v) => ({
        re:
          u.re * v.re -
          u.im * v.im,

        im:
          u.re * v.im +
          u.im * v.re,
      });

      const divide = (u, v) => {
        const denom =
          v.re ** 2 + v.im ** 2;

        if (denom < 1e-14) {
          return null;
        }

        return {
          re:
            (
              u.re * v.re +
              u.im * v.im
            ) / denom,

          im:
            (
              u.im * v.re -
              u.re * v.im
            ) / denom,
        };
      };

      const one = { re: 1, im: 0 };

      const inf = {
        re: Infinity,
        im: 0,
      };

      const z2 = displayRoots[1];
      const z3 = displayRoots[2];
      const z4 = displayRoots[3];

      const applyToRoots = (transform) =>
        displayRoots.map(
          (root) => transform(root)
        );

      /*
       * The three bits are independent constraints:
       *
       *   1: zhe_4 -> infinity
       *   2: zhe_3 -> 0
       *   4: zhe_2 -> 1
       *
       * Every subset has one fixed canonical map.
       * The destination therefore depends only on the
       * selected constraints, never on click order.
       */
      const values = new Array(8);

      values[0] = displayRoots;


      /*
       * {4}
       *
       * zhe_4 -> infinity
       */
      values[1] = applyToRoots(
        (w) =>
          divide(
            one,
            subtract(w, z4)
          ) ?? inf
      );

      values[1][3] = inf;


      /*
       * {3}
       *
       * zhe_3 -> 0
       */
      values[2] = applyToRoots(
        (w) =>
          subtract(w, z3)
      );

      values[2][2] = {
        re: 0,
        im: 0,
      };


      /*
       * {2}
       *
       * zhe_2 -> 1
       */
      values[4] = applyToRoots(
        (w) =>
          divide(w, z2) ?? inf
      );

      values[4][1] = {
        re: 1,
        im: 0,
      };


      /*
       * {4,3}
       *
       * zhe_4 -> infinity
       * zhe_3 -> 0
       */
      values[3] = applyToRoots(
        (w) =>
          divide(
            subtract(w, z3),
            subtract(w, z4)
          ) ?? inf
      );

      values[3][2] = {
        re: 0,
        im: 0,
      };

      values[3][3] = inf;


      /*
       * {4,2}
       *
       * zhe_4 -> infinity
       * zhe_2 -> 1
       */
      const z2MinusZ4 =
        subtract(z2, z4);

      values[5] = applyToRoots(
        (w) =>
          divide(
            z2MinusZ4,
            subtract(w, z4)
          ) ?? inf
      );

      values[5][1] = {
        re: 1,
        im: 0,
      };

      values[5][3] = inf;


      /*
       * {3,2}
       *
       * zhe_3 -> 0
       * zhe_2 -> 1
       */
      const z2MinusZ3 =
        subtract(z2, z3);

      values[6] = applyToRoots(
        (w) =>
          divide(
            subtract(w, z3),
            z2MinusZ3
          ) ?? inf
      );

      values[6][1] = {
        re: 1,
        im: 0,
      };

      values[6][2] = {
        re: 0,
        im: 0,
      };


      /*
       * {4,3,2}
       *
       * Full Möbius normalization.
       */
      values[7] = applyToRoots(
        (w) => {
          const numerator =
            multiply(
              subtract(w, z3),
              z2MinusZ4
            );

          const denominator =
            multiply(
              subtract(w, z4),
              z2MinusZ3
            );

          return divide(
            numerator,
            denominator
          ) ?? inf;
        }
      );

      values[7][0] = {
        re: crossRatioDisplay.z.re,
        im: crossRatioDisplay.z.im,
      };

      values[7][1] = {
        re: 1,
        im: 0,
      };

      values[7][2] = {
        re: 0,
        im: 0,
      };

      values[7][3] = inf;


      const prefixOpen = [
        '',
        String.raw`F_{4}(`,
        String.raw`F_{3}(`,
        String.raw`F_{43}(`,
        String.raw`F_{2}(`,
        String.raw`F_{42}(`,
        String.raw`F_{32}(`,
        String.raw`M(`,
      ];

      const prefixClose = [
        '',
        ')',
        ')',
        ')',
        ')',
        ')',
        ')',
        ')',
      ];


      /*
       * Symbolic Möbius readouts.
       *
       * Intermediate states show the algebraic image of each
       * original root rather than its decimal evaluation.
       *
       * Only the canonical destinations
       *
       *   infinity, 0, 1, lambda
       *
       * are collapsed to their final symbols.
       */
      const rowLatex = [
        [],

        /*
         * {4}
         *
         * F_4(w) = 1 / (w - zhe_4)
         */
        [
          String.raw`= \frac{1}{\mathrm{ж}_1-\mathrm{ж}_4}`,
          String.raw`= \frac{1}{\mathrm{ж}_2-\mathrm{ж}_4}`,
          String.raw`= \frac{1}{\mathrm{ж}_3-\mathrm{ж}_4}`,
          String.raw`= \infty`,
        ],

        /*
         * {3}
         *
         * F_3(w) = w - zhe_3
         */
        [
          String.raw`= \mathrm{ж}_1-\mathrm{ж}_3`,
          String.raw`= \mathrm{ж}_2-\mathrm{ж}_3`,
          String.raw`= 0`,
          String.raw`= \mathrm{ж}_4-\mathrm{ж}_3`,
        ],

        /*
         * {4,3}
         *
         * F_43(w) = (w-zhe_3)/(w-zhe_4)
         */
        [
          String.raw`= \frac{\mathrm{ж}_1-\mathrm{ж}_3}{\mathrm{ж}_1-\mathrm{ж}_4}`,
          String.raw`= \frac{\mathrm{ж}_2-\mathrm{ж}_3}{\mathrm{ж}_2-\mathrm{ж}_4}`,
          String.raw`= 0`,
          String.raw`= \infty`,
        ],

        /*
         * {2}
         *
         * F_2(w) = w / zhe_2
         */
        [
          String.raw`= \frac{\mathrm{ж}_1}{\mathrm{ж}_2}`,
          String.raw`= 1`,
          String.raw`= \frac{\mathrm{ж}_3}{\mathrm{ж}_2}`,
          String.raw`= \frac{\mathrm{ж}_4}{\mathrm{ж}_2}`,
        ],

        /*
         * {4,2}
         *
         * F_42(w) = (zhe_2-zhe_4)/(w-zhe_4)
         */
        [
          String.raw`= \frac{\mathrm{ж}_2-\mathrm{ж}_4}{\mathrm{ж}_1-\mathrm{ж}_4}`,
          String.raw`= 1`,
          String.raw`= \frac{\mathrm{ж}_2-\mathrm{ж}_4}{\mathrm{ж}_3-\mathrm{ж}_4}`,
          String.raw`= \infty`,
        ],

        /*
         * {3,2}
         *
         * F_32(w) = (w-zhe_3)/(zhe_2-zhe_3)
         */
        [
          String.raw`= \frac{\mathrm{ж}_1-\mathrm{ж}_3}{\mathrm{ж}_2-\mathrm{ж}_3}`,
          String.raw`= 1`,
          String.raw`= 0`,
          String.raw`= \frac{\mathrm{ж}_4-\mathrm{ж}_3}{\mathrm{ж}_2-\mathrm{ж}_3}`,
        ],

        /*
         * {4,3,2}
         *
         * Fully normalized.
         */
        [
          String.raw`= \lambda = \dfrac{(\mathrm{ж}_1-\mathrm{ж}_3)(\mathrm{ж}_2-\mathrm{ж}_4)}{(\mathrm{ж}_1-\mathrm{ж}_4)(\mathrm{ж}_2-\mathrm{ж}_3)}`,
          String.raw`= 1`,
          String.raw`= 0`,
          String.raw`= \infty`,
        ],
      ];


      const titles = [
        'Original roots',
        'ж₄ fixed at infinity',
        'ж₃ fixed at 0',
        'ж₄ fixed at infinity and ж₃ fixed at 0',
        'ж₂ fixed at 1',
        'ж₄ fixed at infinity and ж₂ fixed at 1',
        'ж₃ fixed at 0 and ж₂ fixed at 1',
        'Fully normalized',
      ];


      const formulaTop = [
        String.raw`(\mathrm{ж}_1,\mathrm{ж}_2,\mathrm{ж}_3,\mathrm{ж}_4)`,

        String.raw`F_4(w)=\frac{1}{w-\mathrm{ж}_4}`,

        String.raw`F_3(w)=w-\mathrm{ж}_3`,

        String.raw`F_{43}(w)=\frac{w-\mathrm{ж}_3}{w-\mathrm{ж}_4}`,

        String.raw`F_2(w)=\frac{w}{\mathrm{ж}_2}`,

        String.raw`F_{42}(w)=\frac{\mathrm{ж}_2-\mathrm{ж}_4}{w-\mathrm{ж}_4}`,

        String.raw`F_{32}(w)=\frac{w-\mathrm{ж}_3}{\mathrm{ж}_2-\mathrm{ж}_3}`,

        String.raw`M(w)=\frac{(w-\mathrm{ж}_3)(\mathrm{ж}_2-\mathrm{ж}_4)}{(w-\mathrm{ж}_4)(\mathrm{ж}_2-\mathrm{ж}_3)}`,
      ];


      const formulaBottom = [
        String.raw`\text{Choose any subset of the three normalizations.}`,

        String.raw`F_4(\mathrm{ж}_4)=\infty`,

        String.raw`F_3(\mathrm{ж}_3)=0`,

        String.raw`F_{43}(\mathrm{ж}_4)=\infty,\qquad F_{43}(\mathrm{ж}_3)=0`,

        String.raw`F_2(\mathrm{ж}_2)=1`,

        String.raw`F_{42}(\mathrm{ж}_4)=\infty,\qquad F_{42}(\mathrm{ж}_2)=1`,

        String.raw`F_{32}(\mathrm{ж}_3)=0,\qquad F_{32}(\mathrm{ж}_2)=1`,

        String.raw`M(\mathrm{ж}_1)=\lambda,\quad M(\mathrm{ж}_2)=1,\quad M(\mathrm{ж}_3)=0,\quad M(\mathrm{ж}_4)=\infty`,
      ];


      const explanation = [
        'The first three controls are independent. Turn them on in any order; the same selected set always gives the same Möbius normalization.',

        'Only ж₄ is constrained: it is sent to infinity. The other three roots move to the positions forced by that same Möbius map.',

        'Only ж₃ is constrained: it is translated to 0. The other three roots move with the same map.',

        'Both selected constraints are enforced simultaneously. Their destination is independent of which button was selected first.',

        'Only ж₂ is constrained: the configuration is rescaled so ж₂ lands at 1.',

        'Both selected constraints are enforced simultaneously. ж₄ is at infinity and ж₂ is at 1.',

        'Both selected constraints are enforced simultaneously. ж₃ is at 0 and ж₂ is at 1.',

        'All three Möbius freedoms have now been used. The fourth image was not chosen: ж₁ is forced to the cross-ratio λ.',
      ];

      /*
       * ALL 24 ORDERED MOBIUS NORMALIZATIONS
       *
       * Tuple convention:
       *
       *   [a, b, c, d]
       *
       * means
       *
       *   zhe_a -> 0
       *   zhe_b -> 1
       *   zhe_c -> infinity
       *   zhe_d -> the forced anharmonic value.
       *
       * The 24 permutations split into six classes of four.
       */
      const catalogGroups = [
        {
          latex: String.raw`\lambda`,
          tuples: [
            [1, 4, 2, 3],
            [2, 3, 1, 4],
            [3, 2, 4, 1],
            [4, 1, 3, 2],
          ],
        },
        {
          latex: String.raw`\lambda'`,
          tuples: [
            [1, 2, 3, 4],
            [2, 1, 4, 3],
            [3, 4, 1, 2],
            [4, 3, 2, 1],
          ],
        },
        {
          latex: String.raw`\lambda''`,
          tuples: [
            [1, 3, 4, 2],
            [2, 4, 3, 1],
            [3, 1, 2, 4],
            [4, 2, 1, 3],
          ],
        },
        {
          latex: String.raw`\lambda^{-1}`,
          tuples: [
            [1, 3, 2, 4],
            [2, 4, 1, 3],
            [3, 1, 4, 2],
            [4, 2, 3, 1],
          ],
        },
        {
          latex: String.raw`{\lambda'}^{-1}`,
          tuples: [
            [1, 4, 3, 2],
            [2, 3, 4, 1],
            [3, 2, 1, 4],
            [4, 1, 2, 3],
          ],
        },
        {
          latex: String.raw`{\lambda''}^{-1}`,
          tuples: [
            [1, 2, 4, 3],
            [2, 1, 3, 4],
            [3, 4, 2, 1],
            [4, 3, 1, 2],
          ],
        },
      ];

      const catalogEntries = [];
      const catalogStageLookup = {};

      /*
       * Build a canonical Möbius map for ANY subset of one
       * ordered normalization.
       *
       * Constraint bits:
       *
       *   1 = chosen root -> 0
       *   2 = chosen root -> 1
       *   4 = chosen root -> infinity
       *
       * Therefore every selectable cell in every catalog row
       * can be clicked independently and in any order.
       */
      const configurationForCatalogMask = (
        entry,
        mask
      ) => {
        const zeroRoot =
          displayRoots[
            entry.zeroRoot - 1
          ];

        const oneRoot =
          displayRoots[
            entry.oneRoot - 1
          ];

        const infinityRoot =
          displayRoots[
            entry.infinityRoot - 1
          ];

        const transform = (w) => {
          /*
           * ONE CONSTRAINT
           */

          /*
           * a -> 0
           */
          if (mask === 1) {
            return subtract(
              w,
              zeroRoot
            );
          }

          /*
           * b -> 1
           */
          if (mask === 2) {
            return (
              divide(
                w,
                oneRoot
              ) ?? inf
            );
          }

          /*
           * c -> infinity
           */
          if (mask === 4) {
            return (
              divide(
                one,
                subtract(
                  w,
                  infinityRoot
                )
              ) ?? inf
            );
          }


          /*
           * TWO CONSTRAINTS
           */

          /*
           * a -> 0
           * b -> 1
           */
          if (mask === 3) {
            return (
              divide(
                subtract(
                  w,
                  zeroRoot
                ),
                subtract(
                  oneRoot,
                  zeroRoot
                )
              ) ?? inf
            );
          }

          /*
           * a -> 0
           * c -> infinity
           */
          if (mask === 5) {
            return (
              divide(
                subtract(
                  w,
                  zeroRoot
                ),
                subtract(
                  w,
                  infinityRoot
                )
              ) ?? inf
            );
          }

          /*
           * b -> 1
           * c -> infinity
           */
          if (mask === 6) {
            return (
              divide(
                subtract(
                  oneRoot,
                  infinityRoot
                ),
                subtract(
                  w,
                  infinityRoot
                )
              ) ?? inf
            );
          }


          /*
           * ALL THREE CONSTRAINTS
           *
           * a -> 0
           * b -> 1
           * c -> infinity
           */
          const numerator =
            multiply(
              subtract(
                w,
                zeroRoot
              ),
              subtract(
                oneRoot,
                infinityRoot
              )
            );

          const denominator =
            multiply(
              subtract(
                w,
                infinityRoot
              ),
              subtract(
                oneRoot,
                zeroRoot
              )
            );

          return (
            divide(
              numerator,
              denominator
            ) ?? inf
          );
        };


        const configuration =
          displayRoots.map(
            transform
          );


        /*
         * Force selected destinations to their exact
         * canonical values.
         */
        if (mask & 1) {
          configuration[
            entry.zeroRoot - 1
          ] = {
            re: 0,
            im: 0,
          };
        }

        if (mask & 2) {
          configuration[
            entry.oneRoot - 1
          ] = {
            re: 1,
            im: 0,
          };
        }

        if (mask & 4) {
          configuration[
            entry.infinityRoot - 1
          ] = inf;
        }

        /*
         * Once all three choices are fixed, the fourth root
         * is no longer free: it is the appropriate anharmonic
         * value.
         */
        if (mask === 7) {
          configuration[
            entry.remainingRoot - 1
          ] =
            anharmonicReadouts[
              entry.groupIndex
            ].value;
        }

        return configuration;
      };


      catalogGroups.forEach(
        (group, groupIndex) => {
          group.tuples.forEach(
            (tuple) => {
              const [
                zeroRoot,
                oneRoot,
                infinityRoot,
                remainingRoot,
              ] = tuple;

              const entryIndex =
                catalogEntries.length;

              const entry = {
                entryIndex,
                groupIndex,

                valueLatex:
                  group.latex,

                zeroRoot,
                oneRoot,
                infinityRoot,
                remainingRoot,

                stepStages: {},

                /*
                 * Tell the UI what each original root is being
                 * assigned to in this normalization.
                 */
                targetByRoot: {
                  [zeroRoot]: {
                    target: '0',
                    bit: 1,
                  },

                  [oneRoot]: {
                    target: '1',
                    bit: 2,
                  },

                  [infinityRoot]: {
                    target: '∞',
                    bit: 4,
                  },
                },
              };


              /*
               * Seven fixed stages:
               *
               *   001
               *   010
               *   011
               *   100
               *   101
               *   110
               *   111
               */
              for (
                let mask = 1;
                mask <= 7;
                mask += 1
              ) {
                const stage =
                  8 +
                  entryIndex * 7 +
                  (mask - 1);

                entry.stepStages[
                  mask
                ] = stage;

                catalogStageLookup[
                  stage
                ] = {
                  entryIndex,
                  mask,
                };


                values[stage] =
                  configurationForCatalogMask(
                    entry,
                    mask
                  );


                /*
                 * Footer readout for the current partial state.
                 */
                rowLatex[stage] =
                  values[stage].map(
                    (
                      value,
                      rootIndex
                    ) => {
                      const rootNumber =
                        rootIndex + 1;

                      /*
                       * The fourth point becomes an anharmonic
                       * value only after all three actual
                       * normalization choices are fixed.
                       */
                      if (
                        mask === 7 &&
                        rootNumber ===
                          remainingRoot
                      ) {
                        const r =
                          `\\mathrm{ж}_${remainingRoot}`;

                        const z =
                          `\\mathrm{ж}_${zeroRoot}`;

                        const o =
                          `\\mathrm{ж}_${oneRoot}`;

                        const infRoot =
                          `\\mathrm{ж}_${infinityRoot}`;

                        return (
                          `= ${group.latex}=` +
                          `\\dfrac{` +
                          `(${r}-${z})` +
                          `(${o}-${infRoot})` +
                          `}{` +
                          `(${r}-${infRoot})` +
                          `(${o}-${z})` +
                          `}`
                        );
                      }

                      const assignment =
                        entry.targetByRoot[
                          rootNumber
                        ];

                      if (
                        assignment &&
                        (
                          mask &
                          assignment.bit
                        )
                      ) {
                        if (
                          assignment.target ===
                          '∞'
                        ) {
                          return (
                            String.raw`= \infty`
                          );
                        }

                        return (
                          `= ${assignment.target}`
                        );
                      }

                      /*
                       * Keep every unconstrained image symbolic.
                       * Point placement still uses the numerical
                       * transform above; this footer shows the
                       * corresponding algebra in the original roots.
                       */
                      const w =
                        `\\mathrm{ж}_${rootNumber}`;

                      const z =
                        `\\mathrm{ж}_${zeroRoot}`;

                      const o =
                        `\\mathrm{ж}_${oneRoot}`;

                      const infRoot =
                        `\\mathrm{ж}_${infinityRoot}`;

                      if (mask === 1) {
                        return `= ${w}-${z}`;
                      }

                      if (mask === 2) {
                        return `= \\frac{${w}}{${o}}`;
                      }

                      if (mask === 4) {
                        return (
                          `= \\frac{1}{${w}-${infRoot}}`
                        );
                      }

                      if (mask === 3) {
                        return (
                          `= \\frac{${w}-${z}}{${o}-${z}}`
                        );
                      }

                      if (mask === 5) {
                        return (
                          `= \\frac{${w}-${z}}{${w}-${infRoot}}`
                        );
                      }

                      if (mask === 6) {
                        return (
                          `= \\frac{${o}-${infRoot}}{${w}-${infRoot}}`
                        );
                      }

                      return (
                        `= \\frac{` +
                        `(${w}-${z})` +
                        `(${o}-${infRoot})` +
                        `}{` +
                        `(${w}-${infRoot})` +
                        `(${o}-${z})` +
                        `}`
                      );
                    }
                  );


                const selectedAssignments = [
                  (mask & 1)
                    ? `${zeroRoot}\\to0`
                    : null,

                  (mask & 2)
                    ? `${oneRoot}\\to1`
                    : null,

                  (mask & 4)
                    ? `${infinityRoot}\\to\\infty`
                    : null,
                ]
                  .filter(Boolean)
                  .join(',\\;');

                prefixOpen[stage] =
                  mask === 7
                    ? (
                        `M_{${zeroRoot}${oneRoot}${infinityRoot}}(`
                      )
                    : (
                        `F_{${selectedAssignments}}(`
                      );

                prefixClose[
                  stage
                ] = ')';


                titles[stage] =
                  mask === 7
                    ? (
                        `Fully normalized: ж${remainingRoot} is forced`
                      )
                    : (
                        'Partial normalization for the selected assignments'
                      );


                formulaTop[stage] =
                  `M_{${zeroRoot}${oneRoot}${infinityRoot}}(w)=` +
                  `\\frac{` +
                  `(w-\\mathrm{ж}_${zeroRoot})` +
                  `(\\mathrm{ж}_${oneRoot}-\\mathrm{ж}_${infinityRoot})` +
                  `}{` +
                  `(w-\\mathrm{ж}_${infinityRoot})` +
                  `(\\mathrm{ж}_${oneRoot}-\\mathrm{ж}_${zeroRoot})` +
                  `}`;


                formulaBottom[
                  stage
                ] =
                  mask === 7
                    ? (
                        `M_{${zeroRoot}${oneRoot}${infinityRoot}}` +
                        `(\\mathrm{ж}_${remainingRoot})=` +
                        `${group.latex}`
                      )
                    : (
                        String.raw`\text{Select the remaining assignments in any order.}`
                      );


                explanation[
                  stage
                ] =
                  mask === 7
                    ? (
                        `All three assignments are fixed. ` +
                        `The remaining root ж${remainingRoot} ` +
                        `is therefore forced to ${group.latex}.`
                      )
                    : (
                        `This is the canonical partial Möbius ` +
                        `normalization for the assignments ` +
                        `currently selected in this row.`
                      );
              }


              /*
               * Full-row destination retained for compatibility.
               */
              entry.stage =
                entry.stepStages[7];

              catalogEntries.push(
                entry
              );
            }
          );
        }
      );



      return {
        values,
        prefixOpen,
        prefixClose,
        rowLatex,
        titles,
        formulaTop,
        formulaBottom,
        explanation,
        catalogEntries,
        catalogStageLookup,
      };
    },
    [
      anharmonicReadouts,
      crossRatioDisplay,
      displayRoots,
      isBranchPreset,
    ]
  );

  /*
   * MATHEMATICAL MOBIUS TRACE AUDIT
   *
   * These traces are computed directly from the quartic roots
   * over the complete compactified a-sweep. They do NOT record
   * animated screen positions.
   *
   * FULL:
   *   all 24 ordered normalizations. The 24 trajectories must
   *   collapse four-by-four onto the six anharmonic loci.
   *
   * PARTIAL:
   *   every UNIQUE nonempty proper subset of assignments.
   *   Duplicate catalog representations of the same partial
   *   Möbius map are intentionally removed.
   */
  const mobiusAuditTraces = useMemo(
    () => {
      const subtract = (u, v) => ({
        re: u.re - v.re,
        im: u.im - v.im,
      });

      const multiply = (u, v) => ({
        re:
          u.re * v.re -
          u.im * v.im,

        im:
          u.re * v.im +
          u.im * v.re,
      });

      const divide = (u, v) => {
        const denominator =
          v.re ** 2 +
          v.im ** 2;

        /*
         * A zero denominator is a genuine pole of the affine
         * chart. Return null so the SVG path lifts the pen
         * instead of drawing a chord through infinity.
         */
        if (denominator < 1e-18) {
          return null;
        }

        return {
          re:
            (
              u.re * v.re +
              u.im * v.im
            ) / denominator,

          im:
            (
              u.im * v.re -
              u.re * v.im
            ) / denominator,
        };
      };

      const one = {
        re: 1,
        im: 0,
      };

      /*
       * Exact same 24 ordered normalizations as the catalog.
       *
       * [group, [zero, one, infinity, determined]]
       */
      const catalog = [
        [0, [1, 4, 2, 3]],
        [0, [2, 3, 1, 4]],
        [0, [3, 2, 4, 1]],
        [0, [4, 1, 3, 2]],

        [1, [1, 2, 3, 4]],
        [1, [2, 1, 4, 3]],
        [1, [3, 4, 1, 2]],
        [1, [4, 3, 2, 1]],

        [2, [1, 3, 4, 2]],
        [2, [2, 4, 3, 1]],
        [2, [3, 1, 2, 4]],
        [2, [4, 2, 1, 3]],

        [3, [1, 3, 2, 4]],
        [3, [2, 4, 1, 3]],
        [3, [3, 1, 4, 2]],
        [3, [4, 2, 3, 1]],

        [4, [1, 4, 3, 2]],
        [4, [2, 3, 4, 1]],
        [4, [3, 2, 1, 4]],
        [4, [4, 1, 2, 3]],

        [5, [1, 2, 4, 3]],
        [5, [2, 1, 3, 4]],
        [5, [3, 4, 2, 1]],
        [5, [4, 3, 1, 2]],
      ];


      /*
       * Canonical lambda directly from the four tracked roots.
       */
      const lambdaForRoots =
        (sample) => {
          /*
           * Exact compactified endpoint limit.
           */
          if (
            sample.t === -1 ||
            sample.t === 1
          ) {
            return {
              re: 0.5,
              im:
                Math.sqrt(3) /
                2,
            };
          }

          const [
            z1,
            z2,
            z3,
            z4,
          ] = sample.roots;

          return divide(
            multiply(
              subtract(z1, z3),
              subtract(z2, z4)
            ),
            multiply(
              subtract(z1, z4),
              subtract(z2, z3)
            )
          );
        };


      /*
       * The six exact anharmonic images.
       */
      const anharmonicValue = (
        lambda,
        variantIndex
      ) => {
        if (!lambda) {
          return null;
        }

        const oneMinusLambda = {
          re:
            1 - lambda.re,

          im:
            -lambda.im,
        };

        const inverseLambda =
          divide(
            one,
            lambda
          );

        const lambdaMinusOne = {
          re:
            lambda.re - 1,

          im:
            lambda.im,
        };

        switch (variantIndex) {
          /*
           * lambda
           */
          case 0:
            return lambda;

          /*
           * lambda' = 1 / (1 - lambda)
           */
          case 1:
            return divide(
              one,
              oneMinusLambda
            );

          /*
           * lambda'' = 1 - 1/lambda
           */
          case 2:
            return inverseLambda
              ? {
                  re:
                    1 -
                    inverseLambda.re,

                  im:
                    -inverseLambda.im,
                }
              : null;

          /*
           * lambda^-1
           */
          case 3:
            return inverseLambda;

          /*
           * lambda'^-1 = 1 - lambda
           */
          case 4:
            return oneMinusLambda;

          /*
           * lambda''^-1 =
           * lambda / (lambda - 1)
           */
          case 5:
            return divide(
              lambda,
              lambdaMinusOne
            );

          default:
            return null;
        }
      };


      /*
       * ALL 24 complete normalizations.
       *
       * We deliberately keep all 24. Four curves in each
       * anharmonic class should lie exactly on top of one
       * another. That is part of the audit.
       */
      const full =
        catalog.map(
          (
            [
              variantIndex,
              tuple,
            ],
            entryIndex
          ) => ({
            key:
              `full-${entryIndex}`,

            variantIndex,

            tuple,

            points:
              rootAngleSamples.map(
                (sample) => {
                  /*
                   * Genuine poles:
                   *
                   *   lambda'     = 1/(1-lambda)
                   *   lambda''^-1 = lambda/(lambda-1)
                   *
                   * At a = +/-a_* we have lambda = 1, so these
                   * two paths pass through infinity.
                   */
                  const isBranchPole =
                    Number.isFinite(sample.a) &&
                    Math.abs(
                      Math.abs(sample.a) -
                      BRANCH_A
                    ) < 1e-9 &&
                    (
                      variantIndex === 1 ||
                      variantIndex === 5
                    );

                  if (isBranchPole) {
                    return null;
                  }

                  return anharmonicValue(
                    lambdaForRoots(
                      sample
                    ),
                    variantIndex
                  );
                }
              ),
          })
        );


      /*
       * One representative for each of the six anharmonic
       * cross-ratio families.
       */
      const uniqueFull =
        full.filter(
          (
            trace,
            index,
            traces
          ) =>
            traces.findIndex(
              (candidate) =>
                candidate.variantIndex ===
                trace.variantIndex
            ) === index
        );


      /*
       * Evaluate one partial canonical map directly.
       *
       * mask:
       *
       *   1 = zeroRoot -> 0
       *   2 = oneRoot -> 1
       *   4 = infinityRoot -> infinity
       */
      const partialMap = (
        roots,
        tuple,
        mask,
        rootIndex
      ) => {
        const [
          zeroRootNumber,
          oneRootNumber,
          infinityRootNumber,
        ] = tuple;

        const zeroRoot =
          roots[
            zeroRootNumber - 1
          ];

        const oneRoot =
          roots[
            oneRootNumber - 1
          ];

        const infinityRoot =
          roots[
            infinityRootNumber - 1
          ];

        const w =
          roots[rootIndex];


        /*
         * ONE CONSTRAINT
         */

        if (mask === 1) {
          return subtract(
            w,
            zeroRoot
          );
        }

        if (mask === 2) {
          return divide(
            w,
            oneRoot
          );
        }

        if (mask === 4) {
          return divide(
            one,
            subtract(
              w,
              infinityRoot
            )
          );
        }


        /*
         * TWO CONSTRAINTS
         */

        if (mask === 3) {
          return divide(
            subtract(
              w,
              zeroRoot
            ),
            subtract(
              oneRoot,
              zeroRoot
            )
          );
        }

        if (mask === 5) {
          return divide(
            subtract(
              w,
              zeroRoot
            ),
            subtract(
              w,
              infinityRoot
            )
          );
        }

        /*
         * mask === 6
         */
        return divide(
          subtract(
            oneRoot,
            infinityRoot
          ),
          subtract(
            w,
            infinityRoot
          )
        );
      };


      /*
       * UNIQUE partial normalizations.
       *
       * Many of the 24 catalog rows contain the same proper
       * partial assignment. We calculate each mathematical map
       * once instead of overdrawing identical copies.
       */
      const partial = [];

      const seenPartialMaps =
        new Set();

      catalog.forEach(
        (
          [
            ,
            tuple,
          ],
          entryIndex
        ) => {
          const [
            zeroRoot,
            oneRoot,
            infinityRoot,
          ] = tuple;

          for (
            let mask = 1;
            mask <= 6;
            mask += 1
          ) {
            const assignments = [
              (mask & 1)
                ? `${zeroRoot}->0`
                : null,

              (mask & 2)
                ? `${oneRoot}->1`
                : null,

              (mask & 4)
                ? `${infinityRoot}->inf`
                : null,
            ]
              .filter(Boolean)
              .sort()
              .join('|');

            if (
              seenPartialMaps.has(
                assignments
              )
            ) {
              continue;
            }

            seenPartialMaps.add(
              assignments
            );

            for (
              let rootIndex = 0;
              rootIndex < 4;
              rootIndex += 1
            ) {
              const rootNumber =
                rootIndex + 1;

              /*
               * A root explicitly fixed at 0, 1, or infinity
               * does not generate a moving trajectory.
               */
              const fixed =
                (
                  (mask & 1) &&
                  rootNumber ===
                    zeroRoot
                ) ||
                (
                  (mask & 2) &&
                  rootNumber ===
                    oneRoot
                ) ||
                (
                  (mask & 4) &&
                  rootNumber ===
                    infinityRoot
                );

              if (fixed) {
                continue;
              }

              partial.push({
                key:
                  `partial-${entryIndex}-${mask}-${rootIndex}`,

                rootIndex,

                points:
                  rootAngleSamples.map(
                    (sample) =>
                      partialMap(
                        sample.roots,
                        tuple,
                        mask,
                        rootIndex
                      )
                  ),
              });
            }
          }
        }
      );

      /*
       * GEOMETRIC PARTIAL-LOCUS AUDIT
       *
       * Compare partial trajectories as UNORDERED sampled point
       * sets on the Riemann sphere. This identifies trajectories
       * that trace the same geometric locus even when they are
       * generated by different partial assignments or traversed
       * in the opposite direction.
       */
      const spherePointKey = (point) => {
        if (
          !point ||
          !Number.isFinite(point.re) ||
          !Number.isFinite(point.im)
        ) {
          /*
           * North pole = infinity.
           */
          return '0,0,100000';
        }

        const r2 =
          point.re * point.re +
          point.im * point.im;

        const denominator =
          1 + r2;

        const x =
          2 * point.re /
          denominator;

        const y =
          2 * point.im /
          denominator;

        const z =
          (r2 - 1) /
          denominator;

        /*
         * Quantize only enough to suppress floating residue.
         * The grouping is still based on the actual sampled
         * Riemann-sphere trajectory.
         */
        const q = (value) =>
          Math.round(
            value * 100000
          );

        return (
          `${q(x)},` +
          `${q(y)},` +
          `${q(z)}`
        );
      };

      const partialLocusGroups =
        new Map();

      partial.forEach((trace) => {
        const signature = [
          ...new Set(
            trace.points.map(
              spherePointKey
            )
          ),
        ]
          .sort()
          .join('|');

        const existing =
          partialLocusGroups.get(
            signature
          );

        if (existing) {
          existing.multiplicity += 1;

          existing.memberKeys.push(
            trace.key
          );

          return;
        }

        partialLocusGroups.set(
          signature,
          {
            ...trace,

            multiplicity: 1,

            memberKeys: [
              trace.key,
            ],
          }
        );
      });

      const partialLoci = [
        ...partialLocusGroups.values(),
      ].map(
        (
          trace,
          locusIndex
        ) => ({
          ...trace,
          locusIndex,
        })
      );

      return {
        full,
        uniqueFull,
        partial,
        partialLoci,
      };
    },
    [
      rootAngleSamples,
    ]
  );


  function renderSharedRootsFooter() {
    return (
      <div
        className={styles.rootsFooter}
        style={{
          '--roots-left':
            `${rootsLeft}px`,
          '--roots-bottom':
            `${rootsBottom}px`,
          '--polar-x':
            `calc(
              var(--roots-left)
              + ${rootsListWidth}px
              + ${ROOTS_POLAR_GAP}px
            )`,
          '--polar-bottom':
            `${polarBottom}px`,
        }}
      >
        {false && (
          <div
            style={{
              position: 'absolute',
              left: 'var(--polar-x)',
              top: '-46px',
              zIndex: 5,
              width: 'max-content',
              whiteSpace: 'nowrap',
              fontSize: '15px',
              lineHeight: 1,
              color:
                'rgba(232, 223, 200, 0.78)',
            }}
          >
            <MathInline
              latex={aDisplayLatex}
            />
          </div>
        )}

        {false && (
          <div
            style={{
              position: 'absolute',
              left: 'var(--polar-x)',
              top: '50%',
              transform:
                'translateY(-50%)',
              zIndex: 5,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '62px',
              width: 'max-content',
              whiteSpace: 'nowrap',
              fontSize:
                'var(--quartic-math-size, 14px)',
              lineHeight: 1,
              color:
                'rgba(245, 239, 224, 0.96)',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '8px',
              }}
            >
              <MathInline
                className={styles.rootValueMath}
                latex={`\\lambda = ${complexCrossRatioLatex(
                  crossRatioDisplay.z
                )}`}
              />

              <MathInline
                className={styles.rootValueMath}
                latex={`|\\lambda| = ${formatCrossRatio15(
                  crossRatioDisplay.modulus
                )}`}
              />

              <MathInline
                className={styles.rootValueMath}
                latex={`\\text{θ} = ${formatCrossRatio15(
                  crossRatioDisplay.theta
                )}\\,\\mathrm{radians}`}
              />
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '8px',
              }}
            >
              <MathInline
                className={styles.rootValueMath}
                latex={`\\lambda = ${complexCrossRatioLatex(
                  crossRatioDisplay.z
                )}`}
              />

              <MathInline
                className={styles.rootValueMath}
                latex={`\\lambda' = (1-\\lambda)^{-1} = ${complexCrossRatioLatex(
                  crossRatioDisplay.zPrime
                )}`}
              />

              <MathInline
                className={styles.rootValueMath}
                latex={`\\lambda'' = 1-\\lambda^{-1} = ${complexCrossRatioLatex(
                  crossRatioDisplay.zDoublePrime
                )}`}
              />
            </div>
          </div>
        )}

        {false && (
          <div
            style={{
              position: 'absolute',

              /*
               * Exact mirror of the left root block:
               *
               * left roots:
               *   left: var(--roots-left)
               *
               * right data:
               *   right: var(--roots-left)
               */
              right: 'var(--roots-left)',
              left: 'auto',

              top: '18px',
              bottom: '18px',

              zIndex: 10,

              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',

              width: 'max-content',
              maxWidth:
                'calc(100% - 2 * var(--roots-left))',

              whiteSpace: 'nowrap',

              color:
                'rgba(245, 239, 224, 0.96)',

              pointerEvents: 'none',
            }}
          >
            {/* a */}
            <div
              style={{
                marginBottom: '30px',
              }}
            >
              <MathInline
                className={styles.rootValueMath}
                latex={aDisplayLatex}
              />
            </div>

            {/* defining equations */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '10px',
                marginBottom: '36px',
              }}
            >
              <CrossRatioEquation />

              <MathInline
                className={styles.rootValueMath}
                latex={
                  String.raw`|a| > a^\dagger \Longrightarrow |\lambda| = 1`
                }
              />
            </div>

            {/* primary shape data */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '9px',
                marginBottom: '34px',
              }}
            >
              <MathInline
                className={styles.rootValueMath}
                latex={`\\lambda = ${complexCrossRatioLatex(
                  crossRatioDisplay.z
                )}`}
              />

              <MathInline
                className={styles.rootValueMath}
                latex={`|\\lambda| = ${formatCrossRatio15(
                  crossRatioDisplay.modulus
                )}`}
              />

              <MathInline
                className={styles.rootValueMath}
                latex={`\\text{θ} = ${formatCrossRatio15(
                  crossRatioDisplay.theta
                )}\\,\\mathrm{radians}`}
              />
            </div>

            {/* companion shapes */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '9px',
                marginBottom: 'auto',
              }}
            >
              <MathInline
                className={styles.rootValueMath}
                latex={`\\lambda' = (1-\\lambda)^{-1} = ${complexCrossRatioLatex(
                  crossRatioDisplay.zPrime
                )}`}
              />

              <MathInline
                className={styles.rootValueMath}
                latex={`\\lambda'' = 1-\\lambda^{-1} = ${complexCrossRatioLatex(
                  crossRatioDisplay.zDoublePrime
                )}`}
              />
            </div>

            {/*
             * Bottom readouts mirror the four ж1–ж4 rows
             * exactly:
             *
             *   row 1  Vol(lambda)   <-> ж1
             *   row 2  blank         <-> ж2
             *   row 3  жr            <-> ж3
             *   row 4  жtheta        <-> ж4
             *
             * Same bottom inset and same 8px row gap as
             * the left rootList.
             */}
            <div
              style={{
                display: 'none',
                position: 'absolute',
                right: 0,
                bottom: 'var(--roots-bottom)',
                display: 'grid',
                gridTemplateRows:
                  'repeat(4, auto)',
                rowGap: '8px',
                alignItems: 'center',
                width: 'max-content',
              }}
            >
              {/* row 1 — aligned with ж1 */}
              <div
                className={styles.mathEquationRow}
                style={{
                  visibility: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  width: 'max-content',
                  margin: 0,
                  padding: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                <MathInline
                  className={styles.rootValueMath}
                  latex={
                    String.raw`\mathrm{Vol}(\lambda)=`
                  }
                />

                {' '}

                {(
                  Math.abs(a) < 1e-14 ||
                  isBranchPreset
                ) ? (
                  <MathInline
                    className={styles.rootValueMath}
                    latex="0"
                  />
                ) : asymptoticEnd !== 0 ? (
                  <>
                    <MathInline
                      className={styles.rootValueMath}
                      latex={
                        REGULAR_IDEAL_TETRAHEDRON_VOLUME.toPrecision(
                          15
                        )
                      }
                    />

                    <MathInline
                      className={styles.rootValueMath}
                      latex="="
                    />

                    <MathInline
                      className={styles.rootValueMath}
                      latex={
                        String.raw`G_{\mathrm{Gi}}`
                      }
                    />
                  </>
                ) : (
                  <MathInline
                    className={styles.rootValueMath}
                    latex={
                      tetrahedron.volume.toPrecision(
                        15
                      )
                    }
                  />
                )}
              </div>

              {/* row 2 — aligned with ж2, intentionally empty */}
              <div
                aria-hidden="true"
                style={{
                  height: '1em',
                }}
              />

              {/* row 3 — aligned with ж3 */}
              <div
                className={styles.mathEquationRow}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4em',
                  width: 'max-content',
                  margin: 0,
                  padding: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                <span
                  className={styles.polarMatchCell}
                >
                  <ZheSymbol
                    kind="r"
                    className={
                      styles.legendStyleZhe
                    }
                  />
                </span>

                <MathInline
                  className={styles.rootValueMath}
                  latex={
                    asymptoticEnd !== 0
                      ? String.raw`= \infty`
                      : isUnitCirclePreset
                      ? String.raw`= \sqrt{2\pi}`
                      : isBranchPreset
                        ? String.raw`= \sqrt{\pi+\sqrt{\pi^2+6\pi}}`
                        : `= ${zheR.toPrecision(15)}`
                  }
                />
              </div>

              {/* row 4 — aligned with ж4 */}
              <div
                className={styles.mathEquationRow}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4em',
                  width: 'max-content',
                  margin: 0,
                  padding: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                <span
                  className={styles.polarMatchCell}
                >
                  <ZheSymbol
                    kind="theta"
                    className={
                      styles.legendStyleZhe
                    }
                  />
                </span>

                <MathInline
                  className={styles.rootValueMath}
                  latex={
                    asymptoticEnd === 1
                      ? String.raw`= \frac{2\pi}{3}`
                      : asymptoticEnd === -1
                        ? String.raw`= \frac{2\pi}{6}`
                        : Math.abs(a) < 1e-14
                          ? String.raw`= \frac{2\pi}{4} = 1.57079632679490\;\text{radians}`
                          : isNegativeUnitCirclePreset
                            ? String.raw`= \arctan\sqrt{8\pi-1}\;\text{radians}`
                            : isPositiveUnitCirclePreset
                              ? String.raw`= \pi-\arctan\sqrt{8\pi-1}\;\text{radians}`
                              : `= ${zheTheta.toPrecision(15)}\\;\\text{radians}`
                  }
                />
              </div>
            </div>

        {mode === 'Cross-ratio' && (
          <div
            className={styles.rootList}
            style={{
              left: 0,
              right: 'auto',
            }}
          >
            {/* row 1 — EXACT SAME BOX GEOMETRY AS ж1 */}
            <div
              className={styles.rootRow}
              style={{
                position: 'relative',
              }}
            >
              {/*
               * Hidden ж1-equivalent contents establish
               * the exact same row height/baseline geometry
               * as the real left-side ж1 row.
               */}
              <div
                style={{
                  visibility: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                }}
                aria-hidden="true"
              >
                <ColoredZheSymbol
                  kind={1}
                  color={ROOT_COLORS[0]}
                  className={styles.legendStyleZhe}
                />

                <MathInline
                  className={styles.rootValueMath}
                  latex="=0"
                />
              </div>

              {/*
               * Vol(lambda) occupies that exact row box
               * without changing its geometry.
               */}
              <div
                style={{
                  transform: 'translateY(20px)',
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  width: 'max-content',
                  whiteSpace: 'nowrap',
                }}
              >
                <MathInline
                  className={styles.rootValueMath}
                  latex={
                    String.raw`\mathrm{Vol}(\lambda)=`
                  }
                />

                {' '}

                {(
                  Math.abs(a) < 1e-14 ||
                  isBranchPreset
                ) ? (
                  <MathInline
                    className={styles.rootValueMath}
                    latex="0"
                  />
                ) : asymptoticEnd !== 0 ? (
                  <>
                    <MathInline
                      className={styles.rootValueMath}
                      latex={
                        REGULAR_IDEAL_TETRAHEDRON_VOLUME.toPrecision(
                          15
                        )
                      }
                    />

                    <MathInline
                      className={styles.rootValueMath}
                      latex="="
                    />

                    <MathInline
                      className={styles.rootValueMath}
                      latex={
                        String.raw`G_{\mathrm{Gi}}`
                      }
                    />
                  </>
                ) : (
                  <MathInline
                    className={styles.rootValueMath}
                    latex={
                      tetrahedron.volume.toPrecision(
                        15
                      )
                    }
                  />
                )}
              </div>
            </div>

            {/* row 2 — exact real rootRow placeholder */}
            <div
              className={styles.rootRow}
              style={{
                visibility: 'hidden',
              }}
              aria-hidden="true"
            >
              <ColoredZheSymbol
                kind={2}
                color={ROOT_COLORS[1]}
                className={styles.legendStyleZhe}
              />
              <MathInline
                className={styles.rootValueMath}
                latex="=0"
              />
            </div>

            {/* row 3 — exact real rootRow placeholder */}
            <div
              className={styles.rootRow}
              style={{
                visibility: 'hidden',
              }}
              aria-hidden="true"
            >
              <ColoredZheSymbol
                kind={3}
                color={ROOT_COLORS[2]}
                className={styles.legendStyleZhe}
              />
              <MathInline
                className={styles.rootValueMath}
                latex="=0"
              />
            </div>

            {/* row 4 — exact real rootRow placeholder */}
            <div
              className={styles.rootRow}
              style={{
                visibility: 'hidden',
              }}
              aria-hidden="true"
            >
              <ColoredZheSymbol
                kind={4}
                color={ROOT_COLORS[3]}
                className={styles.legendStyleZhe}
              />
              <MathInline
                className={styles.rootValueMath}
                latex="=0"
              />
            </div>
          </div>
        )}

          </div>
        )}

        {mode === 'Cross-ratio' && (
          <div
            className={styles.rootList}
            style={{
              left: `${crossRatioFooterLeft}px`,
              right: 'auto',
              pointerEvents: 'none',
            }}
          >
            {/* row 1: Vol(lambda) aligned with ж1 */}
            <div
              className={styles.rootRow}
              style={{
                position: 'relative',
              }}
            >
              {/*
               * Hidden structural contents give this row
               * the exact same geometry as a real root row.
               */}
              <div
                aria-hidden="true"
                style={{
                  visibility: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <ColoredZheSymbol
                  kind={1}
                  color={ROOT_COLORS[0]}
                  className={styles.legendStyleZhe}
                />

                <MathInline
                  className={styles.rootValueMath}
                  latex="=0"
                />
              </div>

              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  transform: 'translateY(-5px)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.32em',
                  width: 'max-content',
                  whiteSpace: 'nowrap',
                }}
              >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    whiteSpace: 'nowrap',
                    gap: '0.04em',
                  }}
                >
                  <MathInline
                    className={styles.rootValueMath}
                    latex={String.raw`\mathrm{Vol}(`}
                  />

                  <LambdaSymbol
                    size={14}
                  />

                  <MathInline
                    className={styles.rootValueMath}
                    latex=")="
                  />
                </div>

                {(
                  asymptoticEnd === 0 &&
                  Math.abs(a) <=
                    BRANCH_A + 1e-12
                ) ? (
                  <MathInline
                    className={styles.rootValueMath}
                    latex="0"
                  />
                ) : asymptoticEnd !== 0 ? (
                  <>
                    <MathInline
                      className={styles.rootValueMath}
                      latex={
                        REGULAR_IDEAL_TETRAHEDRON_VOLUME.toPrecision(
                          15
                        )
                      }
                    />

                    <MathInline
                      className={styles.rootValueMath}
                      latex="="
                    />

                    <MathInline
                      className={styles.rootValueMath}
                      latex={
                        String.raw`G_{\mathrm{Gi}}`
                      }
                    />
                  </>
                ) : (
                  <MathInline
                    className={styles.rootValueMath}
                    latex={
                      tetrahedron.volume.toPrecision(
                        15
                      )
                    }
                  />
                )}
              </div>
            </div>

            {/* rows 2–4 preserve the exact root-list stack */}
            {[2, 3, 4].map((kind) => (
              <div
                key={kind}
                className={styles.rootRow}
                aria-hidden="true"
                style={{
                  visibility: 'hidden',
                }}
              >
                <ColoredZheSymbol
                  kind={kind}
                  color={ROOT_COLORS[kind - 1]}
                  className={styles.legendStyleZhe}
                />

                <MathInline
                  className={styles.rootValueMath}
                  latex="=0"
                />
              </div>
            ))}
          </div>
        )}

        <div
          ref={rootsListRef}
          className={styles.rootList}
        >
        {(
          [0, 1, 2, 3]
        ).map(
          (index) => {
            const root =
              displayRoots[index];

            const imaginary =
              Math.abs(root.im);

            const hasImaginary =
              imaginary > 1e-10;

            const asymptoticLatex =
              asymptoticEnd === 1
                ? [
                    String.raw`= 0,\;0`,
                    String.raw`= \infty,\;0`,
                    String.raw`= \infty,\;\frac{2\pi}{3}`,
                    String.raw`= \infty,\;-\frac{2\pi}{3}`,
                  ][index]
                : asymptoticEnd === -1
                  ? [
                      String.raw`= \infty,\;\frac{2\pi}{2}`,
                      String.raw`= 0,\;0`,
                      String.raw`= \infty,\;\frac{2\pi}{6}`,
                      String.raw`= \infty,\;-\frac{2\pi}{6}`,
                    ][index]
                  : null;

            const mobiusStageLatex =
              mode === 'Möbius transform' &&
              mobiusStage > 0
                ? mobiusStory.rowLatex[
                    mobiusStage
                  ][index]
                : null;

            const exactA3LargeRootLatex =
              mode === 'Roots' &&
              isUnitCirclePreset &&
              index >= 2
                ? (
                    isNegativeUnitCirclePreset
                      ? (
                          index === 2
                            ? String.raw`= \frac12+\frac12\sqrt{8\pi-1}\,i`
                            : String.raw`= \frac12-\frac12\sqrt{8\pi-1}\,i`
                        )
                      : (
                          index === 2
                            ? String.raw`= -\frac12+\frac12\sqrt{8\pi-1}\,i`
                            : String.raw`= -\frac12-\frac12\sqrt{8\pi-1}\,i`
                        )
                  )
                : null;

            const latexValue =
              mobiusStageLatex ??
              exactA3LargeRootLatex ??
              (
                asymptoticLatex ??
                (
                  hasImaginary
                    ? (
                        root.im < 0
                          ? `= ${root.re.toPrecision(15)} - ${imaginary.toPrecision(15)}\\, i`
                          : `= ${root.re.toPrecision(15)} + ${imaginary.toPrecision(15)}\\, i`
                      )
                    : `= ${root.re.toPrecision(15)}`
                )
              );

            /*
             * FULL Möbius states use the same SVG lambda-family
             * symbol as the control panel. Keep the exact zhe
             * definition in KaTeX immediately to its right.
             */
            let fullMobiusVariant = null;

            if (
              mode === 'Möbius transform' &&
              mobiusStage === 7 &&
              index === 0
            ) {
              fullMobiusVariant = {
                variantIndex: 0,
                definitionLatex:
                  String.raw`\dfrac{(\mathrm{ж}_1-\mathrm{ж}_3)(\mathrm{ж}_2-\mathrm{ж}_4)}{(\mathrm{ж}_1-\mathrm{ж}_4)(\mathrm{ж}_2-\mathrm{ж}_3)}`,
              };
            } else if (
              mode === 'Möbius transform'
            ) {
              const catalogState =
                mobiusStory.catalogStageLookup[
                  mobiusStage
                ];

              if (
                catalogState &&
                catalogState.mask === 7
              ) {
                const entry =
                  mobiusStory.catalogEntries[
                    catalogState.entryIndex
                  ];

                if (
                  entry &&
                  index ===
                    entry.remainingRoot - 1
                ) {
                  const r =
                    entry.remainingRoot;

                  const z =
                    entry.zeroRoot;

                  const o =
                    entry.oneRoot;

                  const inf =
                    entry.infinityRoot;

                  fullMobiusVariant = {
                    variantIndex:
                      entry.groupIndex,

                    definitionLatex:
                      `\\dfrac{` +
                      `(\\mathrm{ж}_${r}-\\mathrm{ж}_${z})` +
                      `(\\mathrm{ж}_${o}-\\mathrm{ж}_${inf})` +
                      `}{` +
                      `(\\mathrm{ж}_${r}-\\mathrm{ж}_${inf})` +
                      `(\\mathrm{ж}_${o}-\\mathrm{ж}_${z})` +
                      `}`,
                  };
                }
              }
            }

            return (
              <div
                key={index}
                className={
                  styles.rootRow
                }
                style={
                  mode === 'Möbius transform'
                    ? {
                        height: '1.55em',
                        minHeight: '1.55em',
                        overflow: 'visible',
                      }
                    : undefined
                }
              >
                {mode === 'Möbius transform' &&
                mobiusStage > 0 ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      color: ROOT_COLORS[index],
                    }}
                  >
                    <MathInline
                      className={styles.rootValueMath}
                      latex={
                        mobiusStory.prefixOpen[
                          mobiusStage
                        ]
                      }
                    />

                    <ColoredZheSymbol
                      kind={index + 1}
                      color={ROOT_COLORS[index]}
                      className={
                        styles.legendStyleZhe
                      }
                    />

                    <MathInline
                      className={styles.rootValueMath}
                      latex={
                        mobiusStory.prefixClose[
                          mobiusStage
                        ]
                      }
                    />
                  </span>
                ) : (
                  <ColoredZheSymbol
                    kind={index + 1}
                    color={
                      mode === 'Cross-ratio'
                        ? 'rgba(245, 239, 224, 0.96)'
                        : ROOT_COLORS[index]
                    }
                    className={
                      styles.legendStyleZhe
                    }
                  />
                )}

                {fullMobiusVariant ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.22em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <MathInline
                      className={
                        styles.rootValueMath
                      }
                      latex="="
                    />

                    <AnharmonicLambdaSymbol
                      index={
                        fullMobiusVariant
                          .variantIndex
                      }
                      color={
                        ANHARMONIC_COLORS[
                          fullMobiusVariant
                            .variantIndex
                        ]
                      }
                      size={14}
                    />

                    <MathInline
                      className={
                        styles.rootValueMath
                      }
                      latex={
                        `= ${fullMobiusVariant.definitionLatex}`
                      }
                    />
                  </span>
                ) : mode === 'Roots' &&
                isUnitCirclePreset &&
                index < 2 ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.34em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <MathInline
                      className={
                        styles.rootValueMath
                      }
                      latex="="
                    />

                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'baseline',
                        fontSize:
                          'var(--quartic-math-size, 14px)',
                        lineHeight: 1,
                      }}
                    >
                      <img
                        src={
                          isNegativeUnitCirclePreset
                            ? (
                                index === 0
                                  ? '/equations/igr_2_power.svg'
                                  : '/equations/igr_inverse_-2_power.svg'
                              )
                            : (
                                index === 0
                                  ? '/equations/imaginary_golden_ratio_symbol.svg'
                                  : '/equations/igr_inverse_1_power.svg'
                              )
                        }
                        alt={
                          isNegativeUnitCirclePreset
                            ? (
                                index === 0
                                  ? 'imaginary golden ratio squared'
                                  : 'imaginary golden ratio to the negative second power'
                              )
                            : (
                                index === 0
                                  ? 'imaginary golden ratio'
                                  : 'inverse imaginary golden ratio'
                              )
                        }
                        style={{
                          display: 'inline-block',
                          width: 'auto',

                          /*
                           * The powered SVGs contain extra vertical
                           * room for the superscript. Their base
                           * phi_i occupies only about 68% of the
                           * total SVG height.
                           *
                           * Therefore:
                           *
                           *   plain phi_i      -> 1.00em
                           *   powered phi_i^n -> 1.47em
                           *
                           * This makes the BASE phi_i match the
                           * surrounding math font rather than making
                           * the whole SVG box one em tall.
                           */
                          height:
                            (
                              isNegativeUnitCirclePreset ||
                              index === 1
                            )
                              ? '1.47em'
                              : '1em',

                          /*
                           * Keep the base glyphs on the same visual
                           * baseline. The extra powered-SVG height
                           * extends upward into the superscript area.
                           */
                          verticalAlign:
                            (
                              isNegativeUnitCirclePreset ||
                              index === 1
                            )
                              ? '-0.14em'
                              : '-0.14em',

                          flex: '0 0 auto',
                        }}
                      />
                    </span>
                  </span>
                ) : (
                  <MathInline
                    className={
                      styles.rootValueMath
                    }
                    latex={
                      latexValue
                    }
                  />
                )}
              </div>
            );
          }
        )}

        {false && (
          <div
            className={styles.mathEquationRow}
            style={{
                position: 'absolute',
                right: 0,
                bottom:
                  `calc(
                    var(--roots-bottom)
                    + 3 * (1em + 8px)
                  )`,
                display: 'flex',
                alignItems: 'center',
                width: 'max-content',
                margin: 0,
              }}
          >
            <MathInline
              className={styles.rootValueMath}
              latex={String.raw`\mathrm{Vol}(\lambda)=`}
            />
            {' '}

            {(
                  Math.abs(a) < 1e-14 ||
                  isBranchPreset
                ) ? (
              <MathInline
                className={styles.rootValueMath}
                latex="0"
              />
            ) : asymptoticEnd !== 0 ? (
              <>
                <MathInline
                  className={styles.rootValueMath}
                  latex={
                    REGULAR_IDEAL_TETRAHEDRON_VOLUME.toPrecision(
                      15
                    )
                  }
                />
                {' = '}
                <MathInline
                  className={styles.rootValueMath}
                  latex={String.raw`G_{\mathrm{Gi}}`}
                />
              </>
            ) : (
              <MathInline
                className={styles.rootValueMath}
                latex={
                  tetrahedron.volume.toPrecision(15)
                }
              />
            )}
          </div>
        )}
      </div>


      {mode !== 'Möbius transform' && (
        <div
          className={styles.polarReadout}
          style={{
            left: `${crossRatioFooterLeft}px`,
            right: 'auto',
          }}
        >
          <div className={styles.mathEquationRow}>
            <span
              className={
                styles.polarMatchCell
              }
            >
              <ZheSymbol
                kind="r"
                className={
                  styles.legendStyleZhe
                }
              />
            </span>

            <MathInline
              className={
                styles.rootValueMath
              }
              latex={
                asymptoticEnd !== 0
                  ? String.raw`= \infty`
                  : isUnitCirclePreset
                      ? String.raw`= \sqrt{2\pi}`
                      : isBranchPreset
                        ? String.raw`= \sqrt{\pi+\sqrt{\pi^2+6\pi}}`
                        : `= ${zheR.toPrecision(15)}`
              }
            />
          </div>

          <div className={styles.mathEquationRow}>
            <span
              className={
                styles.polarMatchCell
              }
            >
              <ZheSymbol
                kind="theta"
                className={
                  styles.legendStyleZhe
                }
              />
            </span>

            <MathInline
              className={
                styles.rootValueMath
              }
              latex={
                asymptoticEnd === 1
                  ? String.raw`= \frac{2\pi}{3}`
                  : asymptoticEnd === -1
                    ? String.raw`= \frac{2\pi}{6}`
                    : Math.abs(a) < 1e-14
                      ? String.raw`= \frac{2\pi}{4}`
                      : isNegativeUnitCirclePreset
                            ? String.raw`= \arctan\sqrt{8\pi-1}\;\text{radians}`
                            : isPositiveUnitCirclePreset
                              ? String.raw`= \pi-\arctan\sqrt{8\pi-1}\;\text{radians}`
                              : `= ${zheTheta.toPrecision(15)}\\;\\text{radians}`
              }
            />
          </div>
        </div>
      )}



      </div>
    );
  }

  return (
    <PageShell>
      <div
        style={{
          position: 'relative',
          minHeight: '100vh',
          width: '100%',
          backgroundImage:
            "url('/physics_monastery_background.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
        }}
      >
        {embedded ? (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(0, 0, 0, 0.75)',
              zIndex: 0,
              pointerEvents: 'none',
            }}
          />
        ) : (
          <div
            className="symbol-overlay"
            style={{
              left: 0,
              width: '100vw',
              zIndex: 0,
              pointerEvents: 'none',
            }}
          />
        )}

        <main
          className={styles.page}
          style={{
            position: 'relative',
            zIndex: 1,
            '--quartic-symbol-size': '14px',
            '--quartic-math-size': '14px',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'minmax(0, 1fr) clamp(460px, 32.5vw, 620px)',
              columnGap: 0,
              alignItems: 'baseline',
              marginBottom: '12px',
            }}
          >
            <div
              style={{
                gridColumn: '1',
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: '24px',
                minWidth: 0,
              }}
            >
              <h1
                className={styles.title}
                style={{ margin: 0 }}
              >
                Quartic → Ideal Tetrahedron
              </h1>

                <span
                  style={{
                    flex: '0 0 auto',
                    fontSize:
                      'clamp(16px, 1.35vw, 20px)',
                    lineHeight: 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <MathInline
                    latex={String.raw`
                      T_a(x)
                      =
                      x^4
                      +
                      2\pi x^2
                      -
                      2\pi a x
                      +
                      2\pi
                    `}
                  />
                </span>
            </div>
          </div>

          <nav
            aria-label="Quartic tetrahedron views"
            role="tablist"
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              width: '100%',
              marginBottom: 0,
              paddingLeft: '10px',
              overflowX: 'auto',
              overflowY: 'hidden',
              scrollbarWidth: 'thin',
            }}
          >
            {VIEW_MODES.map((viewMode) => {
              const active =
                mode === viewMode;

              return (
                <button
                  key={viewMode}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    if (
                      viewMode === 'Monodromy' ||
                      viewMode === 'Riemann surface'
                    ) {
                      setIsAPlaying(false);
                    }

                    setMode(viewMode);
                  }}
                  style={{
                    position: 'relative',
                    flex: '0 0 auto',
                    minWidth: '112px',

                    marginBottom: '-1px',

                    padding:
                      active
                        ? '11px 14px 9px'
                        : '8px 14px 9px',

                    borderTop:
                      active
                        ? '1px solid rgba(255, 255, 255, 0.46)'
                        : '1px solid rgba(255, 255, 255, 0.16)',

                    borderLeft:
                      active
                        ? '1px solid rgba(255, 255, 255, 0.46)'
                        : '1px solid rgba(255, 255, 255, 0.16)',

                    borderRight:
                      active
                        ? '1px solid rgba(255, 255, 255, 0.46)'
                        : '1px solid rgba(255, 255, 255, 0.16)',

                    borderBottom:
                      active
                        ? '1px solid transparent'
                        : '1px solid rgba(255, 255, 255, 0.12)',

                    borderRadius:
                      '6px 6px 0 0',

                    background:
                      active
                        ? 'rgba(0, 0, 0, 0.30)'
                        : 'transparent',

                    color:
                      active
                        ? 'rgba(255, 250, 236, 1)'
                        : 'rgba(245, 239, 224, 0.70)',

                    font: 'inherit',
                    fontSize:
                      'clamp(12px, 0.95vw, 15px)',
                    lineHeight: 1.15,

                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                  }}
                >
                  {viewMode}
                </button>
              );
            })}
          </nav>

          <div className={styles.workspace}>
            {mode === 'Monodromy' && (
              <div
                style={{
                  gridColumn: '1 / -1',
                  minWidth: 0,
                  minHeight: 0,
                  display: 'flex',
                }}
              >
                <MonodromyStage />
              </div>
            )}

            <section
              className={styles.viewer}
              aria-label="Quartic tetrahedron transform viewer"
              style={{
                display:
                  mode === 'Monodromy'
                    ? 'none'
                    : undefined,
              }}
            >
              <div className={styles.viewerReadout}>
                <span className={styles.viewerMode}>
                  {mode === 'Cross-ratio'
                    ? (
                        asymptoticEnd !== 0
                          ? 'Cross-ratio: the projective shape parameter = an ideal tetrahedron'
                          : 'Cross-ratio: the projective shape parameter'
                      )
                    : mode === 'Roots' &&
                        asymptoticEnd !== 0
                      ? 'Roots: ideal tetrahedron'
                      : mode === 'Möbius transform' &&
                          asymptoticEnd !== 0 &&
                          !mobiusNormalizedContext &&
                          mobiusStage === 0
                        ? 'Möbius transform: ideal tetrahedron'
                        : mode}
                </span>

              </div>

              {mode === 'Riemann surface' && (
                <div
                  style={{
                    position: 'absolute',
                    left: '14px',
                    right: '14px',
                    top: '46px',
                    bottom: '14px',

                    display: 'grid',

                    gridTemplateColumns:
                      riemannGraphsVisible.sphere &&
                      riemannGraphsVisible.map
                        ? 'repeat(2, minmax(0, 1fr))'
                        : 'minmax(0, 1fr)',

                    columnGap: '0px',

                    alignItems: 'center',

                    minWidth: 0,
                    minHeight: 0,
                  }}
                >
                  {riemannGraphsVisible.map && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '-46px',

                        left:
                          riemannGraphsVisible.sphere
                            ? '50%'
                            : '0',

                        width:
                          riemannGraphsVisible.sphere
                            ? '50%'
                            : '100%',

                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start',

                        boxSizing: 'border-box',
                        paddingLeft: '14px',

                        height: '46px',

                        color:
                          'rgba(250, 247, 238, 0.92)',

                        fontFamily:
                          '"Times New Roman", Times, serif',

                        fontSize: '15px',

                        pointerEvents: 'none',
                      }}
                    >
                      Planar map
                    </div>
                  )}


                  {riemannGraphsVisible.sphere && (
                    <div
                      style={{
                        minWidth: 0,
                        minHeight: 0,
                        overflow: 'visible',

                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <div
                        style={{
                          width:
                            riemannGraphsVisible.map
                              ? '112%'
                              : '74%',

                          maxWidth:
                            riemannGraphsVisible.map
                              ? '112%'
                              : '74%',

                          flex:
                            riemannGraphsVisible.map
                              ? '0 0 112%'
                              : '0 0 74%',
                        }}
                      >
                        <RiemannSurfaceViewer
                          key={
                            `riemann-sphere-${riemannResetKey}`
                          }
                          active={true}
                          displayMode="sphere"
                          showDiagnostics={false}
                          structureMode={
                            riemannStructureModes
                          }
                          conventionAngle={180}
                          asymptoticEnd={
                            asymptoticEnd
                          }
                          roots={
                            rootMagnitudeTrackedCurrentRoots
                          }
                        />
                      </div>
                    </div>
                  )}


                  {riemannGraphsVisible.map && (
                    <div
                      style={{
                        minWidth: 0,
                        minHeight: 0,

                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <div
                        style={{
                          position: 'relative',

                          width:
                            riemannGraphsVisible.sphere
                              ? '108%'
                              : '72%',

                          maxWidth:
                            riemannGraphsVisible.sphere
                              ? '108%'
                              : '72%',

                          flex:
                            riemannGraphsVisible.sphere
                              ? '0 0 108%'
                              : '0 0 72%',
                        }}
                      >
                        <RiemannSurfaceViewer
                          key={
                            `riemann-map-${riemannResetKey}`
                          }
                          active={true}
                          displayMode="map"
                          showDiagnostics={false}
                          structureMode={
                            riemannStructureModes
                          }
                          conventionAngle={180}
                          asymptoticEnd={
                            asymptoticEnd
                          }
                          roots={
                            rootMagnitudeTrackedCurrentRoots
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {mode === 'Root angles' && (
                <div
                  className={styles.rootAnglesView}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div className={styles.rootAnglesGraph}>
                    {(() => {
                      const width = 820;
                      const height = 590;

                      const left = 76;
                      const right = 28;
                      const top = 28;
                      const bottom = 54;

                      const plotWidth =
                        width - left - right;

                      const plotHeight =
                        height - top - bottom;

                      const thetaMin = 0;
                      const thetaMax =
                        2 * Math.PI;

                      const tickData = [
                        {
                          value: 0,
                          latex: '0',
                        },
                        {
                          value: Math.PI / 3,
                          latex: String.raw`\frac{2\pi}{6}`,
                        },
                        {
                          value: Math.PI / 2,
                          latex: String.raw`\frac{2\pi}{4}`,
                        },
                        {
                          value: 2 * Math.PI / 3,
                          latex: String.raw`\frac{2\pi}{3}`,
                        },
                        {
                          value: Math.PI,
                          latex: String.raw`\frac{2\pi}{2}`,
                        },
                        {
                          value: 4 * Math.PI / 3,
                          latex: String.raw`-\frac{2\pi}{3}`,
                        },
                        {
                          value: 3 * Math.PI / 2,
                          latex: String.raw`-\frac{2\pi}{4}`,
                        },
                        {
                          value: 5 * Math.PI / 3,
                          latex: String.raw`-\frac{2\pi}{6}`,
                        },
                        {
                          value: 2 * Math.PI,
                          latex: '0',
                        },
                      ];

                      const xForT =
                        (t) =>
                          left +
                          (
                            (t + 1) /
                            2
                          ) *
                          plotWidth;

                      const yForTheta =
                        (theta) =>
                          top +
                          (
                            1 -
                            (
                              theta -
                              thetaMin
                            ) /
                            (
                              thetaMax -
                              thetaMin
                            )
                          ) *
                          plotHeight;

                      /*
                       * zhe_1 and zhe_2 can have the same displayed
                       * principal argument even while remaining
                       * distinct roots in C.
                       *
                       * When that happens, do not let one color hide
                       * the other. Remove the ordinary solid yellow /
                       * blue paths over the shared segment and render
                       * the overlap explicitly as interleaved dashed
                       * yellow + blue.
                       */
                      const sharedBlueYellowTolerance =
                        1e-6;

                      const isSharedBlueYellowSample =
                        (sample) =>
                          Math.abs(
                            sample.args[0] -
                              sample.args[1]
                          ) <=
                          sharedBlueYellowTolerance;

                      /*
                       * On the right of the positive branch point,
                       * zhe_1 and zhe_2 lie on the same identified
                       * projective edge: one is drawn on the bottom
                       * edge (angle 0), the other on the top edge
                       * (angle 2π).
                       *
                       * Draw BOTH dashed edge cues there.
                       */
                      const isSharedBlueYellowPositiveEdgeSample =
                        (sample) =>
                          sample.a >=
                          BRANCH_A - 1e-9;

                      const isSharedBlueYellowNonPositiveEdgeSample =
                        (sample) =>
                          isSharedBlueYellowSample(
                            sample
                          ) &&
                          sample.a <
                            BRANCH_A - 1e-9;

                      const buildAnglePath =
                        (
                          rootIndex,
                          includeSample = () =>
                            true
                        ) => {
                          let d = '';
                          let drawing = false;
                          let previous = null;

                          for (
                            const sample
                            of rootAngleSamples
                          ) {
                            if (
                              !includeSample(
                                sample
                              )
                            ) {
                              drawing = false;
                              previous = null;
                              continue;
                            }

                            const angle =
                              sample.args[
                                rootIndex
                              ];

                            if (
                              !Number.isFinite(
                                angle
                              )
                            ) {
                              drawing = false;
                              previous = null;
                              continue;
                            }

                            if (
                              previous !==
                                null &&
                              Math.abs(
                                angle -
                                  previous
                              ) > Math.PI
                            ) {
                              drawing = false;
                            }

                            const x =
                              xForT(
                                sample.t
                              );

                            const y =
                              yForTheta(
                                angle
                              );

                            d +=
                              (
                                drawing
                                  ? 'L'
                                  : 'M'
                              ) +
                              ` ${x} ${y} `;

                            drawing = true;
                            previous = angle;
                          }

                          return d.trim();
                        };

                      const buildConstantAnglePath =
                        (
                          angle,
                          includeSample = () =>
                            true
                        ) => {
                          let d = '';
                          let drawing = false;

                          for (
                            const sample
                            of rootAngleSamples
                          ) {
                            if (
                              !includeSample(
                                sample
                              )
                            ) {
                              drawing = false;
                              continue;
                            }

                            const x =
                              xForT(
                                sample.t
                              );

                            const y =
                              yForTheta(
                                angle
                              );

                            d +=
                              (
                                drawing
                                  ? 'L'
                                  : 'M'
                              ) +
                              ` ${x} ${y} `;

                            drawing = true;
                          }

                          return d.trim();
                        };

                      const isBlueYellowBranchJunctionSample =
                        (sample) =>
                          Number.isFinite(
                            sample.a
                          ) &&
                          Math.abs(
                            Math.abs(sample.a) -
                              BRANCH_A
                          ) <= 1e-9;

                      const pathForTrackedRoot =
                        (rootIndex) =>
                          buildAnglePath(
                            rootIndex,
                            (sample) =>
                              !(
                                (
                                  rootIndex ===
                                    0 ||
                                  rootIndex ===
                                    1
                                ) &&
                                isSharedBlueYellowSample(
                                  sample
                                ) &&
                                !isBlueYellowBranchJunctionSample(
                                  sample
                                )
                              )
                          );

                      const sharedBlueYellowPath =
                        buildAnglePath(
                          0,
                          isSharedBlueYellowNonPositiveEdgeSample
                        );

                      const sharedBlueYellowTopRightPath =
                        buildConstantAnglePath(
                          2 * Math.PI,
                          isSharedBlueYellowPositiveEdgeSample
                        );

                      const sharedBlueYellowBottomRightPath =
                        buildConstantAnglePath(
                          0,
                          isSharedBlueYellowPositiveEdgeSample
                        );

                      const keyedGraphStops = [
                        {
                          label: '−a₁',
                          aValue: -BRANCH_A,
                        },
                        {
                          label: '−a₂',
                          aValue: -HARMONIC_A,
                        },
                        {
                          label: '−a₃',
                          aValue: -UNIT_CIRCLE_A,
                        },
                        {
                          label: '0',
                          aValue: 0,
                        },
                        {
                          label: 'a₃',
                          aValue: UNIT_CIRCLE_A,
                        },
                        {
                          label: 'a₂',
                          aValue: HARMONIC_A,
                        },
                        {
                          label: 'a₁',
                          aValue: BRANCH_A,
                        },
                      ].map((stop) => ({
                        ...stop,
                        x:
                          xForT(
                            sliderFromA(
                              stop.aValue
                            )
                          ),
                      }));

                      const physicalX =
                        xForT(
                          sliderFromA(
                            PHYSICAL_A
                          )
                        );

                      const currentT =
                        asymptoticEnd !== 0
                          ? asymptoticEnd
                          : Math.max(
                              -1,
                              Math.min(
                                1,
                                sliderFromA(a)
                              )
                            );

                      const currentX =
                        xForT(
                          currentT
                        );

                      /*
                       * Match the live four roots to the nearest
                       * already-tracked graph sample. This keeps the
                       * moving colored dots on the same root identities
                       * as the four continuous colored curves.
                       */
                      const nearestSampleIndex =
                        Math.max(
                          0,
                          Math.min(
                            rootAngleSamples.length - 1,
                            Math.round(
                              (
                                (
                                  currentT +
                                  0.985
                                ) /
                                1.97
                              ) *
                              (
                                rootAngleSamples.length -
                                1
                              )
                            )
                          )
                        );

                      const currentTrackedRoots =
                        asymptoticEnd !== 0
                          ? rootAngleSamples[
                              nearestSampleIndex
                            ].roots
                          : orderRootsByContinuity(
                              rootAngleSamples[
                                nearestSampleIndex
                              ].roots,
                              roots
                            );

                      const currentArgs =
                        currentTrackedRoots.map(
                          (root) => {
                            let angle =
                              Math.atan2(
                                root.im,
                                root.re
                              );

                            if (
                              angle < 0
                            ) {
                              angle +=
                                2 *
                                Math.PI;
                            }

                            return angle;
                          }
                        );

                      /*
                       * DISPLAY-ONLY wrapped arguments for the moving dots.
                       *
                       * On the positive outer branch, zhe_1 and zhe_2 both
                       * have principal argument 0.
                       *
                       * Display zhe_1 (red) on the BOTTOM 0 edge and zhe_2
                       * (yellow) on the identified TOP 2π edge. This begins
                       * exactly at +a₁ and continues through +infinity.
                       *
                       * The numerical/readout arguments remain unchanged;
                       * only the yellow graph marker is wrapped to 2π.
                       */
                      const currentDisplayArgs =
                        currentArgs.map(
                          (angle, index) =>
                            (
                              index === 1 &&
                              (
                                asymptoticEnd === 1 ||
                                (
                                  asymptoticEnd === 0 &&
                                  a >=
                                    BRANCH_A -
                                      1e-12
                                )
                              )
                            )
                              ? 2 * Math.PI
                              : angle
                        );

                      return (
                        <svg
                          className={
                            styles.rootAnglesSvg
                          }
                          viewBox={
                            `0 0 ${width} ${height}`
                          }
                          role="img"
                          aria-label="Principal arguments of the four quartic roots as functions of the parameter a"
                        >
                          <line
                            x1={left}
                            y1={top}
                            x2={left}
                            y2={
                              height -
                              bottom
                            }
                            className={
                              styles.graphAxis
                            }
                          />

                          <line
                            x1={left}
                            y1={
                              height -
                              bottom
                            }
                            x2={
                              width -
                              right
                            }
                            y2={
                              height -
                              bottom
                            }
                            className={
                              styles.graphAxis
                            }
                          />

                          {tickData.map(
                            (tick) => {
                              const y =
                                yForTheta(
                                  tick.value
                                );

                              return (
                                <g
                                  key={
                                    `root-angle-tick-${tick.value}`
                                  }
                                >
                                  <line
                                    x1={left}
                                    y1={y}
                                    x2={
                                      width -
                                      right
                                    }
                                    y2={y}
                                    className={
                                      styles.rootAngleGrid
                                    }
                                    style={{
                                      opacity: 0.82,
                                    }}
                                  />

                                  <foreignObject
                                    x={
                                      left -
                                      58
                                    }
                                    y={
                                      y -
                                      18
                                    }
                                    width="48"
                                    height="36"
                                    style={{
                                      overflow:
                                        'visible',
                                    }}
                                  >
                                    <div
                                      xmlns="http://www.w3.org/1999/xhtml"
                                      style={{
                                        width:
                                          '48px',
                                        height:
                                          '36px',
                                        display:
                                          'flex',
                                        alignItems:
                                          'center',
                                        justifyContent:
                                          'flex-end',
                                        color:
                                          'rgba(232, 223, 200, 0.88)',
                                        fontSize:
                                          '14px',
                                        lineHeight:
                                          1,
                                        whiteSpace:
                                          'nowrap',
                                      }}
                                    >
                                      <MathInline
                                        latex={
                                          tick.latex
                                        }
                                      />
                                    </div>
                                  </foreignObject>
                                </g>
                              );
                            }
                          )}

                          {keyedGraphStops.map(
                            (stop) => (
                              <g
                                key={
                                  `keyed-root-angle-${stop.label}`
                                }
                              >
                                <line
                                  x1={stop.x}
                                  y1={top}
                                  x2={stop.x}
                                  y2={
                                    height -
                                    bottom
                                  }
                                  className={
                                    styles.branchGraphLine
                                  }
                                  style={{
                                    opacity:
                                      stop.aValue === 0
                                        ? 0.76
                                        : 0.62,
                                  }}
                                />

                                <text
                                  x={stop.x}
                                  y={
                                    height - 16
                                  }
                                  textAnchor="middle"
                                  className={
                                    styles.branchGraphLabel
                                  }
                                  style={{
                                    fontSize:
                                      `${rootAnglesXAxisFontSize}px`,
                                  }}
                                >
                                  {stop.label}
                                </text>
                              </g>
                            )
                          )}

                          {/*
                           * Physical-value guide.
                           * Matches the tan triangle cue used in
                           * the quartic-parameter control panel.
                           */}
                          <line
                            x1={physicalX}
                            y1={top}
                            x2={physicalX}
                            y2={
                              height -
                              bottom
                            }
                            className={
                              styles.branchGraphLine
                            }
                            style={{
                              opacity: 0.78,
                              strokeDasharray:
                                '4 6',
                            }}
                          />

                          <line
                            x1={physicalX}
                            y1={
                              height -
                              bottom -
                              8
                            }
                            x2={physicalX}
                            y2={
                              height -
                              bottom +
                              8
                            }
                            style={{
                              stroke:
                                'rgba(232, 223, 200, 0.96)',
                              strokeWidth: 1.5,
                            }}
                          />

                          <polygon
                            points={
                              `${physicalX - 7},${height - bottom + 24} ` +
                              `${physicalX + 7},${height - bottom + 24} ` +
                              `${physicalX},${height - bottom + 13}`
                            }
                            fill="rgba(239, 203, 139, 0.98)"
                            aria-label="Physical value"
                          />

                          {[0, 1, 2, 3].map(
                            (index) => (
                              <path
                                key={index}
                                d={
                                  pathForTrackedRoot(
                                    index
                                  )
                                }
                                className={
                                  styles[
                                    `rootArgPath${index}`
                                  ]
                                }
                                style={{
                                  fill: 'none',
                                  stroke:
                                    ROOT_COLORS[index],
                                  strokeWidth:
                                    rootAnglesLineWidth,
                                  strokeDasharray:
                                    'none',
                                  strokeLinecap:
                                    'round',
                                  strokeLinejoin:
                                    'round',
                                }}
                              />
                            )
                          )}

                          {/*
                           * Shared zhe_1 / zhe_2 argument track.
                           *
                           * Two offset dash patterns make both root
                           * identities visible on exactly the same
                           * geometric curve.
                           */}
                          <path
                            d={sharedBlueYellowPath}
                            style={{
                              fill: 'none',
                              stroke:
                                ROOT_COLORS[0],
                              strokeWidth:
                                rootAnglesLineWidth + 0.4,
                              strokeDasharray:
                                '8 8',
                              strokeDashoffset:
                                '0',
                              strokeLinecap:
                                'round',
                              strokeLinejoin:
                                'round',
                            }}
                          />

                          <path
                            d={sharedBlueYellowPath}
                            style={{
                              fill: 'none',
                              stroke:
                                ROOT_COLORS[1],
                              strokeWidth:
                                rootAnglesLineWidth + 0.4,
                              strokeDasharray:
                                '8 8',
                              strokeDashoffset:
                                '8',
                              strokeLinecap:
                                'round',
                              strokeLinejoin:
                                'round',
                            }}
                          />

                          <path
                            d={sharedBlueYellowBottomRightPath}
                            style={{
                              fill: 'none',
                              stroke:
                                ROOT_COLORS[0],
                              strokeWidth:
                                rootAnglesLineWidth + 0.4,
                              strokeDasharray:
                                '8 8',
                              strokeDashoffset:
                                '0',
                              strokeLinecap:
                                'round',
                              strokeLinejoin:
                                'round',
                            }}
                          />

                          <path
                            d={sharedBlueYellowTopRightPath}
                            style={{
                              fill: 'none',
                              stroke:
                                ROOT_COLORS[1],
                              strokeWidth:
                                rootAnglesLineWidth + 0.4,
                              strokeDasharray:
                                '8 8',
                              strokeDashoffset:
                                '0',
                              strokeLinecap:
                                'round',
                              strokeLinejoin:
                                'round',
                            }}
                          />

                          {SPECIAL_ROOT_ANGLES
                            .filter(
                              (special) =>
                                special.n === 8
                            )
                            .map(
                              (special) => {
                                const x =
                                  xForT(
                                    sliderFromA(
                                      special.a
                                    )
                                  );

                                const y =
                                  yForTheta(
                                    special.phi
                                  );

                                return (
                                  <g
                                    key={
                                      `special-${special.n}`
                                    }
                                  >
                                    <circle
                                      cx={x}
                                      cy={y}
                                      r={
                                        rootAnglesSpecialPointRadius
                                      }
                                      className={
                                        styles.specialAnglePoint
                                      }
                                    />

                                    <text
                                      x={
                                        x +
                                        rootAnglesFourPiOverEightLabelX
                                      }
                                      y={
                                        y +
                                        rootAnglesFourPiOverEightLabelY
                                      }
                                      className={
                                        styles.specialAngleLabel
                                      }
                                    >
                                      4π/{special.n}
                                    </text>
                                  </g>
                                );
                              }
                            )}

                          <line
                            x1={currentX}
                            y1={top}
                            x2={currentX}
                            y2={
                              height -
                              bottom
                            }
                            className={
                              styles.currentGuide
                            }
                            style={{
                              opacity: 0.82,
                            }}
                          />

                          {currentDisplayArgs.map(
                            (
                              angle,
                              index
                            ) => (
                              <circle
                                key={index}
                                cx={currentX}
                                cy={yForTheta(angle)}
                                r={
                                  rootAnglesCurrentPointRadius
                                }
                                className={
                                  styles.currentArgPoint
                                }
                                style={{
                                  fill:
                                    ROOT_COLORS[index],
                                  stroke:
                                    ROOT_COLORS[index],
                                }}
                              />
                            )
                          )}

                          <text
                            x={
                              left +
                              rootAnglesNegativeInfinityX
                            }
                            y={
                              height - 16
                            }
                            className={
                              styles.volumeGraphLabel
                            }
                            style={{
                              fontSize:
                                `${rootAnglesXAxisFontSize}px`,
                              cursor:
                                'pointer',
                            }}
                            onClick={() =>
                              jumpToSpecialA(
                                -Infinity
                              )
                            }
                            role="button"
                            tabIndex="0"
                            aria-label="Set a to negative infinity"
                            onKeyDown={(event) => {
                              if (
                                event.key ===
                                  'Enter' ||
                                event.key ===
                                  ' '
                              ) {
                                event.preventDefault();
                                jumpToSpecialA(
                                  -Infinity
                                );
                              }
                            }}
                          >
                            −∞
                          </text>

                          <text
                            x={
                              width -
                              right +
                              rootAnglesPositiveInfinityX
                            }
                            y={
                              height - 16
                            }
                            textAnchor="end"
                            className={
                              styles.volumeGraphLabel
                            }
                            style={{
                              fontSize:
                                `${rootAnglesXAxisFontSize}px`,
                              cursor:
                                'pointer',
                            }}
                            onClick={() =>
                              jumpToSpecialA(
                                Infinity
                              )
                            }
                            role="button"
                            tabIndex="0"
                            aria-label="Set a to positive infinity"
                            onKeyDown={(event) => {
                              if (
                                event.key ===
                                  'Enter' ||
                                event.key ===
                                  ' '
                              ) {
                                event.preventDefault();
                                jumpToSpecialA(
                                  Infinity
                                );
                              }
                            }}
                          >
                            +∞
                          </text>
                        </svg>
                      );
                    })()}
                  </div>

                </div>
              )}

              {mode === 'Root magnitudes' && (
                <div
                  className={styles.rootAnglesView}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div className={styles.rootAnglesGraph}>
                    {(() => {
                      const width = 820;
                      const height = 590;

                      const left = 76;
                      const right = 28;
                      const top = 28;
                      const bottom = 54;

                      const plotWidth =
                        width - left - right;

                      const plotHeight =
                        height - top - bottom;

                      /*
                       * Compactified MAGNITUDE coordinate.
                       *
                       * The paths already provide
                       *
                       *   L = log|ж|.
                       *
                       * Convert that to the direct compactified
                       * positive magnitude:
                       *
                       *   u = |ж| / (1 + |ж|)
                       *     = exp(L) / (1 + exp(L)).
                       *
                       * Therefore:
                       *
                       *   |ж| = 0        -> bottom
                       *   |ж| = 1        -> center
                       *   |ж| = infinity -> top
                       *
                       * Reciprocal magnitudes are reflected
                       * exactly about the |ж| = 1 center line:
                       *
                       *   u(1/|ж|) = 1 - u(|ж|).
                       */
                      const xForT =
                        (t) =>
                          left +
                          (
                            (t + 1) /
                            2
                          ) *
                          plotWidth;

                      const yForLog =
                        (logMagnitude) => {
                          if (
                            logMagnitude ===
                            -Infinity
                          ) {
                            return (
                              top +
                              plotHeight
                            );
                          }

                          if (
                            logMagnitude ===
                            Infinity
                          ) {
                            return top;
                          }

                          /*
                           * Direct magnitude compactification:
                           *
                           *   C(m) = m / (1 + m),
                           *
                           * where m = |ж|.
                           *
                           * The tick labels remain actual magnitude
                           * values: 0, 1/4, 1/2, 1, 2, 4, infinity.
                           */
                          const compactMagnitude =
                            logMagnitude >= 0
                              ? 1 /
                                (
                                  1 +
                                  Math.exp(
                                    -logMagnitude
                                  )
                                )
                              : Math.exp(
                                  logMagnitude
                                ) /
                                (
                                  1 +
                                  Math.exp(
                                    logMagnitude
                                  )
                                );

                          return (
                            top +
                            (
                              1 -
                              compactMagnitude
                            ) *
                            plotHeight
                          );
                        };

                      /*
                       * Signed radial diagnostic.
                       *
                       * Complex roots:
                       *   upper half-plane -> +|ж|
                       *   lower half-plane -> -|ж|
                       *
                       * Real roots:
                       *   sign follows Re(ж).
                       */
                      const signedRadial =
                        (root) => {
                          const magnitude =
                            Math.hypot(
                              root.re,
                              root.im
                            );

                          const tolerance =
                            1e-9 *
                            Math.max(
                              1,
                              Math.abs(
                                root.re
                              ),
                              Math.abs(
                                root.im
                              )
                            );

                          if (
                            Math.abs(
                              root.im
                            ) >
                            tolerance
                          ) {
                            return (
                              root.im > 0
                                ? magnitude
                                : -magnitude
                            );
                          }

                          if (
                            Math.abs(
                              root.re
                            ) >
                            tolerance
                          ) {
                            return (
                              root.re > 0
                                ? magnitude
                                : -magnitude
                            );
                          }

                          return 0;
                        };

                      const yForSignedRadial =
                        (value) => {
                          if (
                            value === Infinity
                          ) {
                            return top;
                          }

                          if (
                            value === -Infinity
                          ) {
                            return (
                              top +
                              plotHeight
                            );
                          }

                          const compact =
                            value /
                            (
                              1 +
                              Math.abs(
                                value
                              )
                            );

                          return (
                            top +
                            (
                              1 -
                              (
                                compact +
                                1
                              ) /
                              2
                            ) *
                            plotHeight
                          );
                        };

                      const magnitudeTicks = [
                        [
                          -Infinity,
                          '0',
                        ],
                        [
                          -Math.log(4),
                          String.raw`\frac{1}{4}`,
                        ],
                        [
                          -Math.log(2),
                          String.raw`\frac{1}{2}`,
                        ],
                        [
                          0,
                          '1',
                        ],
                        [
                          Math.log(2),
                          '2',
                        ],
                        [
                          Math.log(4),
                          '4',
                        ],
                        [
                          Infinity,
                          String.raw`\infty`,
                        ],
                      ];

                      /*
                       * Signed radial uses exactly the same
                       * compactified magnitude ladder as the
                       * Magnitude view, mirrored through zero:
                       *
                       *   C(m) = m / (1 + m).
                       *
                       * This makes equal absolute magnitudes
                       * directly comparable across the two modes.
                       */
                      const signedRadialTicks = [
                        [
                          -Infinity,
                          String.raw`-\infty`,
                        ],
                        [-4, '-4'],
                        [-2, '-2'],
                        [-1, '-1'],
                        [
                          -1 / 2,
                          String.raw`-\frac{1}{2}`,
                        ],
                        [
                          -1 / 4,
                          String.raw`-\frac{1}{4}`,
                        ],
                        [0, '0'],
                        [
                          1 / 4,
                          String.raw`\frac{1}{4}`,
                        ],
                        [
                          1 / 2,
                          String.raw`\frac{1}{2}`,
                        ],
                        [1, '1'],
                        [2, '2'],
                        [4, '4'],
                        [
                          Infinity,
                          String.raw`\infty`,
                        ],
                      ];

                      const ticks =
                        rootMagnitudeSignedRadial
                          ? signedRadialTicks
                          : magnitudeTicks;

                      /*
                       * Exact compactified endpoint behavior.
                       *
                       * -∞:
                       *   ж2 -> 0
                       *   ж1,ж3,ж4 -> ∞
                       *
                       * +∞:
                       *   ж1 -> 0
                       *   ж2,ж3,ж4 -> ∞
                       */
                      const endpointLog =
                        (
                          sample,
                          index
                        ) => {
                          if (
                            sample.t <= -1
                          ) {
                            return (
                              index === 1
                                ? -Infinity
                                : Infinity
                            );
                          }

                          if (
                            sample.t >= 1
                          ) {
                            return (
                              index === 0
                                ? -Infinity
                                : Infinity
                            );
                          }

                          const root =
                            sample.roots[
                              index
                            ];

                          return Math.log(
                            Math.hypot(
                              root.re,
                              root.im
                            )
                          );
                        };

                      const endpointSignedRadial =
                        (
                          sample,
                          index
                        ) => {
                          if (
                            sample.t <= -1
                          ) {
                            const negativeInfinityValues = [
                              -Infinity,
                              0,
                              Infinity,
                              -Infinity,
                            ];

                            return negativeInfinityValues[
                              index
                            ];
                          }

                          if (
                            sample.t >= 1
                          ) {
                            const positiveInfinityValues = [
                              0,
                              Infinity,
                              Infinity,
                              -Infinity,
                            ];

                            return positiveInfinityValues[
                              index
                            ];
                          }

                          return signedRadial(
                            sample.roots[
                              index
                            ]
                          );
                        };

                      const pathForMagnitude =
                        (index) =>
                          rootAngleSamples
                            .map(
                              (
                                sample,
                                sampleIndex
                              ) => {
                                const x =
                                  xForT(
                                    sample.t
                                  );

                                const y =
                                  rootMagnitudeSignedRadial
                                    ? yForSignedRadial(
                                        endpointSignedRadial(
                                          sample,
                                          index
                                        )
                                      )
                                    : yForLog(
                                        endpointLog(
                                          sample,
                                          index
                                        )
                                      );

                                return (
                                  `${
                                    sampleIndex === 0
                                      ? 'M'
                                      : 'L'
                                  } ${x} ${y}`
                                );
                              }
                            )
                            .join(' ');

                      const buildSharedMagnitudePath =
                        (
                          firstIndex,
                          secondIndex,
                          includeSample
                        ) => {
                          let path = '';
                          let drawing = false;

                          for (
                            const sample
                            of rootAngleSamples
                          ) {
                            if (
                              !includeSample(
                                sample
                              )
                            ) {
                              drawing = false;
                              continue;
                            }

                            const first =
                              endpointLog(
                                sample,
                                firstIndex
                              );

                            const second =
                              endpointLog(
                                sample,
                                secondIndex
                              );

                            const bothPositiveInfinity =
                              first === Infinity &&
                              second === Infinity;

                            const bothNegativeInfinity =
                              first === -Infinity &&
                              second === -Infinity;

                            const bothFiniteAndEqual =
                              Number.isFinite(
                                first
                              ) &&
                              Number.isFinite(
                                second
                              ) &&
                              Math.abs(
                                first -
                                second
                              ) < 1e-8;

                            if (
                              !bothPositiveInfinity &&
                              !bothNegativeInfinity &&
                              !bothFiniteAndEqual
                            ) {
                              drawing = false;
                              continue;
                            }

                            const x =
                              xForT(
                                sample.t
                              );

                            const y =
                              yForLog(
                                first
                              );

                            path +=
                              `${
                                drawing
                                  ? 'L'
                                  : 'M'
                              } ${x} ${y} `;

                            drawing = true;
                          }

                          return path.trim();
                        };

                      /*
                       * Equal-magnitude branches.
                       *
                       * zhe_1 / zhe_2:
                       * conjugate pair between -a1 and +a1.
                       *
                       * zhe_3 / zhe_4:
                       * conjugate pair through the entire sweep.
                       */
                      const sharedMagnitude12Path =
                        buildSharedMagnitudePath(
                          0,
                          1,
                          (sample) =>
                            (
                              sample.a !==
                                -Infinity &&
                              sample.a !==
                                Infinity &&
                              Math.abs(
                                sample.a
                              ) <=
                                BRANCH_A +
                                  1e-10
                            )
                        );

                      const sharedMagnitude34Path =
                        buildSharedMagnitudePath(
                          2,
                          3,
                          () => true
                        );

                      const keyedStops = [
                        [
                          '−a₁',
                          -BRANCH_A,
                        ],
                        [
                          '−a₂',
                          -HARMONIC_A,
                        ],
                        [
                          '−a₃',
                          -UNIT_CIRCLE_A,
                        ],
                        [
                          '0',
                          0,
                        ],
                        [
                          'a₃',
                          UNIT_CIRCLE_A,
                        ],
                        [
                          'a₂',
                          HARMONIC_A,
                        ],
                        [
                          'a₁',
                          BRANCH_A,
                        ],
                      ].map(
                        (
                          [
                            label,
                            aValue,
                          ]
                        ) => ({
                          label,
                          aValue,
                          x:
                            xForT(
                              sliderFromA(
                                aValue
                              )
                            ),
                        })
                      );

                      const currentT =
                        asymptoticEnd !== 0
                          ? asymptoticEnd
                          : Math.max(
                              -1,
                              Math.min(
                                1,
                                sliderFromA(a)
                              )
                            );

                      const currentSignedRadials =
                        rootMagnitudeTrackedCurrentRoots.map(
                          (
                            root,
                            index
                          ) => {
                            if (
                              asymptoticEnd ===
                              1
                            ) {
                              return [
                                0,
                                Infinity,
                                Infinity,
                                -Infinity,
                              ][index];
                            }

                            if (
                              asymptoticEnd ===
                              -1
                            ) {
                              return [
                                -Infinity,
                                0,
                                Infinity,
                                -Infinity,
                              ][index];
                            }

                            return signedRadial(
                              root
                            );
                          }
                        );

                      const currentLogs =
                        rootMagnitudeTrackedCurrentRoots.map(
                          (
                            root,
                            index
                          ) => {
                            if (
                              asymptoticEnd ===
                              1
                            ) {
                              return (
                                index === 0
                                  ? -Infinity
                                  : Infinity
                              );
                            }

                            if (
                              asymptoticEnd ===
                              -1
                            ) {
                              return (
                                index === 1
                                  ? -Infinity
                                  : Infinity
                              );
                            }

                            return Math.log(
                              Math.hypot(
                                root.re,
                                root.im
                              )
                            );
                          }
                        );

                      return (
                        <svg
                          className={
                            styles.rootAnglesSvg
                          }
                          viewBox={
                            `0 0 ${width} ${height}`
                          }
                          role="img"
                          aria-label={
                            rootMagnitudeSignedRadial
                              ? 'Signed radial coordinates of the four quartic roots as functions of a'
                              : 'Compactified magnitudes of the four quartic roots as functions of a'
                          }
                        >
                          <line
                            x1={left}
                            y1={top}
                            x2={left}
                            y2={
                              height -
                              bottom
                            }
                            className={
                              styles.graphAxis
                            }
                          />

                          <foreignObject
                            x={12}
                            y={
                              top +
                              plotHeight / 2 -
                              18
                            }
                            width="42"
                            height="36"
                            style={{
                              overflow:
                                'visible',
                            }}
                          >
                            <div
                              xmlns="http://www.w3.org/1999/xhtml"
                              style={{
                                width: '42px',
                                height: '36px',
                                display: 'flex',
                                alignItems:
                                  'center',
                                justifyContent:
                                  'center',
                                color:
                                  'rgba(232, 223, 200, 0.90)',
                                fontSize:
                                  '16px',
                                whiteSpace:
                                  'nowrap',
                              }}
                            >
                              <MathInline
                                latex={
                                  rootMagnitudeSignedRadial
                                    ? String.raw`\rho_s`
                                    : String.raw`|\mathit{ж}|`
                                }
                              />
                            </div>
                          </foreignObject>

                          <line
                            x1={left}
                            y1={
                              height -
                              bottom
                            }
                            x2={
                              width -
                              right
                            }
                            y2={
                              height -
                              bottom
                            }
                            className={
                              styles.graphAxis
                            }
                          />

                          {ticks.map(
                            (
                              [
                                value,
                                latex,
                              ]
                            ) => {
                              const y =
                                rootMagnitudeSignedRadial
                                  ? yForSignedRadial(
                                      value
                                    )
                                  : yForLog(
                                      value
                                    );

                              return (
                                <g
                                  key={
                                    `root-magnitude-tick-${latex}`
                                  }
                                >
                                  <line
                                    x1={left}
                                    y1={y}
                                    x2={
                                      width -
                                      right
                                    }
                                    y2={y}
                                    className={
                                      styles.rootAngleGrid
                                    }
                                    style={{
                                      opacity:
                                        value ===
                                        0
                                          ? 0.88
                                          : 0.68,
                                    }}
                                  />

                                  <foreignObject
                                    x={
                                      left -
                                      66
                                    }
                                    y={
                                      y -
                                      18
                                    }
                                    width="56"
                                    height="36"
                                    style={{
                                      overflow:
                                        'visible',
                                    }}
                                  >
                                    <div
                                      xmlns="http://www.w3.org/1999/xhtml"
                                      style={{
                                        width:
                                          '56px',
                                        height:
                                          '36px',
                                        display:
                                          'flex',
                                        alignItems:
                                          'center',
                                        justifyContent:
                                          'flex-end',
                                        color:
                                          'rgba(232, 223, 200, 0.88)',
                                        fontSize:
                                          '14px',
                                        lineHeight:
                                          1,
                                        whiteSpace:
                                          'nowrap',
                                      }}
                                    >
                                      <MathInline
                                        latex={
                                          latex
                                        }
                                      />
                                    </div>
                                  </foreignObject>
                                </g>
                              );
                            }
                          )}

                          {keyedStops.map(
                            (stop) => (
                              <g
                                key={
                                  `keyed-root-magnitude-${stop.label}`
                                }
                              >
                                <line
                                  x1={
                                    stop.x
                                  }
                                  y1={top}
                                  x2={
                                    stop.x
                                  }
                                  y2={
                                    height -
                                    bottom
                                  }
                                  className={
                                    styles.branchGraphLine
                                  }
                                  style={{
                                    opacity:
                                      stop.aValue ===
                                      0
                                        ? 0.72
                                        : 0.45,
                                  }}
                                />

                                <text
                                  x={
                                    stop.x
                                  }
                                  y={
                                    height -
                                    16
                                  }
                                  textAnchor="middle"
                                  className={
                                    styles.branchGraphLabel
                                  }
                                  style={{
                                    fontSize:
                                      `${rootAnglesXAxisFontSize}px`,
                                  }}
                                >
                                  {
                                    stop.label
                                  }
                                </text>
                              </g>
                            )
                          )}

                          {[
                            0,
                            1,
                            2,
                            3,
                          ]
                            .filter(
                              (index) =>
                                rootMagnitudeVisible[
                                  index
                                ]
                            )
                            .map(
                              (index) => (
                                <path
                                  key={
                                    `root-magnitude-path-${index}`
                                  }
                                  d={
                                    pathForMagnitude(
                                      index
                                    )
                                  }
                                  style={{
                                    fill:
                                      'none',
                                    stroke:
                                      ROOT_COLORS[
                                        index
                                      ],
                                    strokeWidth:
                                      rootAnglesLineWidth,
                                    strokeLinecap:
                                      'round',
                                    strokeLinejoin:
                                      'round',
                                  }}
                                />
                              )
                            )}

                          {!rootMagnitudeSignedRadial &&
                            rootMagnitudeVisible[0] &&
                            rootMagnitudeVisible[1] && (
                              <>
                                {/*
                                 * Shared zhe_1 / zhe_2 magnitude track:
                                 * red + yellow.
                                 */}
                                <path
                                  d={
                                    sharedMagnitude12Path
                                  }
                                  style={{
                                    fill: 'none',
                                    stroke:
                                      ROOT_COLORS[0],
                                    strokeWidth:
                                      rootAnglesLineWidth +
                                      0.4,
                                    strokeDasharray:
                                      '8 8',
                                    strokeDashoffset:
                                      '0',
                                    strokeLinecap:
                                      'round',
                                    strokeLinejoin:
                                      'round',
                                  }}
                                />

                                <path
                                  d={
                                    sharedMagnitude12Path
                                  }
                                  style={{
                                    fill: 'none',
                                    stroke:
                                      ROOT_COLORS[1],
                                    strokeWidth:
                                      rootAnglesLineWidth +
                                      0.4,
                                    strokeDasharray:
                                      '8 8',
                                    strokeDashoffset:
                                      '8',
                                    strokeLinecap:
                                      'round',
                                    strokeLinejoin:
                                      'round',
                                  }}
                                />
                              </>
                            )}

                          {!rootMagnitudeSignedRadial &&
                            rootMagnitudeVisible[2] &&
                            rootMagnitudeVisible[3] && (
                              <>
                                {/*
                                 * Shared zhe_3 / zhe_4 magnitude track:
                                 * green + blue.
                                 */}
                                <path
                                  d={
                                    sharedMagnitude34Path
                                  }
                                  style={{
                                    fill: 'none',
                                    stroke:
                                      ROOT_COLORS[2],
                                    strokeWidth:
                                      rootAnglesLineWidth +
                                      0.4,
                                    strokeDasharray:
                                      '8 8',
                                    strokeDashoffset:
                                      '0',
                                    strokeLinecap:
                                      'round',
                                    strokeLinejoin:
                                      'round',
                                  }}
                                />

                                <path
                                  d={
                                    sharedMagnitude34Path
                                  }
                                  style={{
                                    fill: 'none',
                                    stroke:
                                      ROOT_COLORS[3],
                                    strokeWidth:
                                      rootAnglesLineWidth +
                                      0.4,
                                    strokeDasharray:
                                      '8 8',
                                    strokeDashoffset:
                                      '8',
                                    strokeLinecap:
                                      'round',
                                    strokeLinejoin:
                                      'round',
                                  }}
                                />
                              </>
                            )}

                          <line
                            x1={
                              xForT(
                                currentT
                              )
                            }
                            y1={top}
                            x2={
                              xForT(
                                currentT
                              )
                            }
                            y2={
                              height -
                              bottom
                            }
                            className={
                              styles.branchGraphLine
                            }
                            style={{
                              opacity:
                                0.72,
                            }}
                          />

                          {currentLogs.map(
                            (
                              value,
                              index
                            ) =>
                              rootMagnitudeVisible[
                                index
                              ] ? (
                              <circle
                                key={
                                  `current-root-magnitude-${index}`
                                }
                                cx={
                                  xForT(
                                    currentT
                                  )
                                }
                                cy={
                                  rootMagnitudeSignedRadial
                                    ? yForSignedRadial(
                                        currentSignedRadials[
                                          index
                                        ]
                                      )
                                    : yForLog(
                                        value
                                      )
                                }
                                r={rootMagnitudesDotRadius}
                                fill={
                                  ROOT_COLORS[
                                    index
                                  ]
                                }
                                stroke="rgba(0,0,0,0.42)"
                                strokeWidth="1.2"
                              />
                            ) : null
                          )}

                          <text
                            x={
                              left +
                              rootAnglesNegativeInfinityX
                            }
                            y={
                              height -
                              16
                            }
                            className={
                              styles.volumeGraphLabel
                            }
                            style={{
                              fontSize:
                                `${rootAnglesXAxisFontSize}px`,
                            }}
                          >
                            −∞
                          </text>

                          <text
                            x={
                              width -
                              right +
                              rootAnglesPositiveInfinityX
                            }
                            y={
                              height -
                              16
                            }
                            textAnchor="end"
                            className={
                              styles.volumeGraphLabel
                            }
                            style={{
                              fontSize:
                                `${rootAnglesXAxisFontSize}px`,
                            }}
                          >
                            +∞
                          </text>
                        </svg>
                      );
                    })()}
                  </div>
                </div>
              )}

              {mode === 'Cross-ratio' && (
                <div className={styles.crossRatioView}>
                  <div
                    className={styles.crossRatioFormula}
                    style={{
                      position: 'absolute',
                      left:
                        `${crossRatioDataX}px`,
                      top: '34px',
                      width: 'max-content',
                      transform: 'none',
                      display: 'none',
                      justifyContent: 'flex-start',
                      alignItems: 'center',
                      zIndex: 5,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        gap: '8px',
                        width: 'max-content',
                      }}
                    >
                      <CrossRatioEquation />

                      <MathInline
                        latex={String.raw`|a| > a^\dagger \Longrightarrow |\lambda| = 1`}
                      />
                    </div>
                  </div>

                  <div className={styles.shapePlane}>
                    {(() => {
                      const width = 620;
                      const height = 470;

                      const cx =
                        width / 2 - 39;

                      const cy =
                        height / 2 - 40;

                      const scale = 238;

                      const leftCircleLeft =
                        cx - scale;

                      const rightCircleRight =
                        cx +
                        2 * scale;

                      const divideComplex = (u, v) => {
                        const denominator =
                          v.re ** 2 +
                          v.im ** 2;

                        if (denominator < 1e-14) {
                          return null;
                        }

                        return {
                          re:
                            (
                              u.re * v.re +
                              u.im * v.im
                            ) / denominator,

                          im:
                            (
                              u.im * v.re -
                              u.re * v.im
                            ) / denominator,
                        };
                      };

                      const lambda =
                        crossRatioDisplay.z;

                      const one = {
                        re: 1,
                        im: 0,
                      };

                      const oneMinusLambda = {
                        re: 1 - lambda.re,
                        im: -lambda.im,
                      };

                      const lambdaMinusOne = {
                        re: lambda.re - 1,
                        im: lambda.im,
                      };

                      const inverseLambda =
                        divideComplex(
                          one,
                          lambda
                        );

                      const inverseOneMinusLambda =
                        divideComplex(
                          one,
                          oneMinusLambda
                        );

                      const lambdaOverLambdaMinusOne =
                        divideComplex(
                          lambda,
                          lambdaMinusOne
                        );

                      const oneMinusInverseLambda =
                        inverseLambda
                          ? {
                              re:
                                1 -
                                inverseLambda.re,

                              im:
                                -inverseLambda.im,
                            }
                          : null;

                      const anharmonicValues = [
                        {
                          key: 'lambda',
                          label: 'λ',
                          value: lambda,
                          color: ANHARMONIC_COLORS[0],
                        },

                        {
                          key: 'lambda-prime',
                          label: "λ'",
                          value:
                            inverseOneMinusLambda,
                          color: ANHARMONIC_COLORS[1],
                        },

                        {
                          key: 'lambda-double-prime',
                          label: "λ''",
                          value:
                            oneMinusInverseLambda,
                          color: ANHARMONIC_COLORS[2],
                        },

                        {
                          key: 'inverse-lambda',
                          label: 'λ⁻¹',
                          value: inverseLambda,
                          color: ANHARMONIC_COLORS[3],
                        },

                        {
                          key: 'inverse-lambda-prime',
                          label: "λ'⁻¹",
                          value: oneMinusLambda,
                          color: ANHARMONIC_COLORS[4],
                        },

                        {
                          key: 'inverse-lambda-double-prime',
                          label: "λ''⁻¹",
                          value:
                            lambdaOverLambdaMinusOne,
                          color: ANHARMONIC_COLORS[5],
                        },
                      ].filter(
                        (item) =>
                          item.value !== null &&
                          Number.isFinite(
                            item.value.re
                          ) &&
                          Number.isFinite(
                            item.value.im
                          )
                      );

                      const target = {
                        re: 0.5,
                        im:
                          Math.sqrt(3) /
                          2,
                      };

                      const point = {
                        x:
                          asymptoticEnd !== 0
                            ? (
                                cx +
                                target.re *
                                  scale
                              )
                            : (
                                cx +
                                crossRatio.z.re *
                                  scale
                              ),

                        y:
                          asymptoticEnd !== 0
                            ? (
                                cy -
                                target.im *
                                  scale
                              )
                            : (
                                cy -
                                crossRatio.z.im *
                                  scale
                              ),
                      };

                      const targetPoint = {
                        x:
                          cx +
                          target.re *
                            scale,

                        y:
                          cy -
                          target.im *
                            scale,
                      };

                      const inverseTargetPoint = {
                        x:
                          cx +
                          target.re *
                            scale,

                        y:
                          cy +
                          target.im *
                            scale,
                      };

                      return (
                        <svg
                          className={styles.shapeSvg}
                          style={{
                            overflow: 'visible',
                          }}
                          viewBox={
                            `0 0 ${width} ${height}`
                          }
                          role="img"
                          aria-label="Cross-ratio in ideal tetrahedron shape space"
                        >
                          {/*
                           * Faded dotted continuation of the x-axis.
                           *
                           * This sits BEHIND the solid axis.  The long
                           * span deliberately extends beyond the SVG
                           * viewBox so the visible portion runs to the
                           * edges of the scene.
                           */}
                          <line
                            x1={-width}
                            y1={cy}
                            x2={2 * width}
                            y2={cy}
                            className={
                              styles.axisLine
                            }
                            style={{
                              strokeDasharray:
                                '5 7',
                              opacity: 0.34,
                            }}
                          />

                          {/*
                           * Solid x-axis:
                           *
                           * default state:
                           *   left edge -> right edge of first circle
                           *
                           * anharmonic state:
                           *   left edge of first circle ->
                           *   right edge of second circle
                           */}
                          <line
                            x1={leftCircleLeft}
                            y1={cy}
                            x2={
                              showAnharmonicValues
                                ? rightCircleRight
                                : cx + scale
                            }
                            y2={cy}
                            className={
                              styles.axisLine
                            }
                          />

                          <line
                            x1={cx}
                            y1={
                              cy - scale
                            }
                            x2={cx}
                            y2={
                              cy + scale
                            }
                            className={
                              styles.axisLine
                            }
                          />

                          <circle
                            cx={cx}
                            cy={cy}
                            r={scale}
                            className={
                              styles.unitCircle
                            }
                          />

                          {showAnharmonicValues && (
                            <>
                              {/*
                               * Second unit circle.
                               * Use the SAME bright dotted styling
                               * as the original circle.
                               */}
                              <circle
                                cx={
                                  cx +
                                  scale
                                }
                                cy={cy}
                                r={scale}
                                className={
                                  styles.unitCircle
                                }
                              />

                              {/*
                               * Projective symmetry guide x = 1/2.
                               * Faded and dotted, extending beyond
                               * the SVG viewBox to the visible
                               * top/bottom edges of the scene.
                               */}
                              <line
                                x1={
                                  cx +
                                  0.5 * scale
                                }
                                y1={-height}
                                x2={
                                  cx +
                                  0.5 * scale
                                }
                                y2={2 * height}
                                className={
                                  styles.axisLine
                                }
                                style={{
                                  strokeDasharray:
                                    '5 7',
                                  opacity: 0.34,
                                }}
                              />
                            </>
                          )}

                          <text
                            x={
                              cx +
                              scale +
                              8
                            }
                            y={
                              cy + 18
                            }
                            className={
                              styles.shapeLabel
                            }
                          >
                            1
                          </text>

                          {showAnharmonicValues && (
                            <text
                              x={
                                cx +
                                2 * scale +
                                8
                              }
                              y={
                                cy + 18
                              }
                              className={
                                styles.shapeLabel
                              }
                            >
                              2
                            </text>
                          )}

                          <text
                            x={
                              cx -
                              scale +
                              8
                            }
                            y={
                              cy + 18
                            }
                            className={
                              styles.shapeLabel
                            }
                          >
                            -1
                          </text>

                          <text
                            x={
                              cx + 8
                            }
                            y={
                              cy + 18
                            }
                            className={
                              styles.shapeLabel
                            }
                          >
                            0
                          </text>

                          <line
                            x1={cx}
                            y1={cy}
                            x2={
                              point.x
                            }
                            y2={
                              point.y
                            }
                            className={
                              styles.shapeRadius
                            }
                          />


                          <circle
                            cx={
                              targetPoint.x
                            }
                            cy={
                              targetPoint.y
                            }
                            r="5"
                            className={
                              styles.targetPoint
                            }
                          />

                          <image
                            href="/equations/imaginary_golden_ratio_symbol.svg"
                            x={
                              targetPoint.x +
                              8
                            }
                            y={
                              targetPoint.y -
                              23
                            }
                            width="28"
                            height="18"
                            preserveAspectRatio="xMinYMid meet"
                          />

                          {showAnharmonicValues && (
                            <>
                              <circle
                                cx={
                                  inverseTargetPoint.x
                                }
                                cy={
                                  inverseTargetPoint.y
                                }
                                r="5"
                                className={
                                  styles.targetPoint
                                }
                              />

                              <image
                                href="/equations/igr_inverse_1_power.svg"
                                x={
                                  inverseTargetPoint.x +
                                  8
                                }
                                y={
                                  inverseTargetPoint.y -
                                  4
                                }
                                width="47"
                                height="26"
                                preserveAspectRatio="xMinYMid meet"
                              />
                            </>
                          )}

                          {showAnharmonicValues ? (
                            <g>
                              {anharmonicValues.map(
                                (item) => {
                                  const orbitPoint = {
                                    x:
                                      cx +
                                      item.value.re *
                                        scale,

                                    y:
                                      cy -
                                      item.value.im *
                                        scale,
                                  };

                                  return (
                                    <circle
                                      key={item.key}
                                      cx={orbitPoint.x}
                                      cy={orbitPoint.y}
                                      r={crossRatioDotRadius}
                                      className={
                                        styles.shapePoint
                                      }
                                      style={{
                                        fill: item.color,
                                      }}
                                    />
                                  );
                                }
                              )}
                            </g>
                          ) : (
                            <>
                              <circle
                                cx={
                                  point.x
                                }
                                cy={
                                  point.y
                                }
                                r={crossRatioDotRadius}
                                className={
                                  styles.shapePoint
                                }
                              />

                              <text
                                x={
                                  point.x +
                                  12
                                }
                                y={
                                  point.y +
                                  4
                                }
                                className={
                                  styles.shapePointLabel
                                }
                                style={{
                                  fontFamily:
                                    'KaTeX_Math',

                                  fontStyle:
                                    'italic',
                                }}
                              >
                                λ
                              </text>
                            </>
                          )}
                        </svg>
                      );
                    })()}
                  </div>

                  {mode === 'Möbius transform' && (
                    <div
                      style={{
                        position: 'absolute',
                        left: '50%',
                        bottom: '108px',
                        transform: 'translateX(-50%)',
                        zIndex: 11,
                        padding: '7px 12px',
                        borderRadius: '6px',
                        background:
                          'rgba(8,8,8,0.62)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <MathInline
                        className={styles.rootValueMath}
                        latex={
                          String.raw`\operatorname{cr}\!\left(M(\mathrm{ж}_1),M(\mathrm{ж}_2);M(\mathrm{ж}_3),M(\mathrm{ж}_4)\right)=\operatorname{cr}\!\left(\mathrm{ж}_1,\mathrm{ж}_2;\mathrm{ж}_3,\mathrm{ж}_4\right)=\lambda`
                        }
                      />
                    </div>
                  )}

                  {renderSharedRootsFooter()}
                </div>
              )}

              {(mode === 'Roots' ||
                mode === 'Möbius transform') && (
                <div className={styles.rootView}>

                  <div
                    className={styles.rootScene}
                    style={{
                      '--root-scene-scale':
                        sceneScale / 100,
                    }}
                  >
                    <div className={styles.rootGeometry}>
                    {(() => {
                      const width = 720;
                      const height = 360;

                      const cx = width / 2;
                      const cy = height / 2;

                                            /*
                       * The middle third of the slider is an ordinary
                       * finite complex-plane view.
                       *
                       * Once we pass either collision point, the
                       * infinity circle moves inward as the camera
                       * effectively zooms out.
                       */

                      const absSlider =
                        Math.abs(
                          sliderValue
                        );

                      const outerProgress =
                        absSlider <= 1 / 3
                          ? 0
                          : Math.min(
                              1,
                              (
                                absSlider -
                                1 / 3
                              ) /
                              (
                                2 / 3
                              )
                            );

                      const easedOuterProgress =
                        outerProgress *
                        outerProgress *
                        (
                          3 -
                          2 *
                          outerProgress
                        );

                      /*
                       * TWO-STAGE ROOT CAMERA
                       *
                       * Stage 1 keeps the ordinary complex-plane
                       * scale EXACTLY:
                       *
                       *   rho = 48 |z|.
                       *
                       * We do not begin zooming until the outgoing
                       * real root reaches modulus 2:
                       *
                       *   negative side: zhe_1 = -2
                       *   positive side: zhe_2 = +2
                       *
                       * After that threshold, every finite root remains
                       * on ONE common linear scale. The camera scale
                       * zooms out while the largest outgoing roots move
                       * monotonically toward the final infinity radius.
                       *
                       * The circle at infinity simultaneously moves
                       * inward and meets them at radius 180.
                       *
                       * Since the unit circle uses this same scale,
                       * |z| = 1 remains exact throughout.
                       */
                      const farInfinityRadius =
                        1600;

                      const finalInfinityRadius =
                        180;

                      const baseFinitePlaneScale =
                        48;

                      const outerSign =
                        sliderValue >= 0
                          ? 1
                          : -1;

                      const zoomAnchorIndex =
                        outerSign < 0
                          ? 0
                          : 1;

                      const zoomAnchorRoot =
                        displayRoots[
                          zoomAnchorIndex
                        ];

                      const zoomAnchorMagnitude =
                        Math.hypot(
                          zoomAnchorRoot.re,
                          zoomAnchorRoot.im
                        );

                      const zoomThresholdMagnitude =
                        2;

                      /*
                       * T_a(2)=0 gives
                       *
                       *   a = 5/2 + 4/pi.
                       *
                       * The negative side is its symmetric negative.
                       */
                      const zoomThresholdA =
                        5 / 2 + 4 / Math.PI;

                      const zoomThresholdRoots =
                        solveQuarticRoots(
                          outerSign *
                          zoomThresholdA
                        );

                      const zoomThresholdMaxMagnitude =
                        Math.max(
                          ...zoomThresholdRoots.map(
                            (root) =>
                              Math.hypot(
                                root.re,
                                root.im
                              )
                          )
                        );

                      const zoomThresholdMaxScreenRadius =
                        baseFinitePlaneScale *
                        zoomThresholdMaxMagnitude;

                      const currentMaxMagnitude =
                        Math.max(
                          ...displayRoots.map(
                            (root) =>
                              Math.hypot(
                                root.re,
                                root.im
                              )
                          )
                        );

                      const zoomActive =
                        outerProgress > 0 &&
                        zoomAnchorMagnitude >
                          zoomThresholdMagnitude;

                      let finitePlaneScale =
                        baseFinitePlaneScale;

                      let infinityRadius =
                        farInfinityRadius;

                      if (zoomActive) {
                        const remainingRadius =
                          finalInfinityRadius -
                          zoomThresholdMaxScreenRadius;

                        /*
                         * Match the original radial derivative
                         * exactly at the switching point so the dots
                         * do not visibly stop or kink when zoom begins.
                         */
                        const approachRate =
                          baseFinitePlaneScale /
                          remainingRadius;

                        const maxScreenRadius =
                          finalInfinityRadius -
                          remainingRadius *
                          Math.exp(
                            -approachRate *
                            (
                              currentMaxMagnitude -
                              zoomThresholdMaxMagnitude
                            )
                          );

                        finitePlaneScale =
                          maxScreenRadius /
                          currentMaxMagnitude;

                        /*
                         * The roots' radial expansion and their angular
                         * rotation do not finish on the same clock.
                         *
                         * Drive the infinity circle from the remaining
                         * OUTER-PARAMETER phase instead of from radial
                         * camera progress. This keeps the circle moving
                         * while the roots finish rotating.
                         */
                        const zoomThresholdSlider =
                          Math.abs(
                            sliderFromA(
                              outerSign *
                              zoomThresholdA
                            )
                          );

                        const zoomThresholdOuterProgress =
                          Math.max(
                            0,
                            Math.min(
                              1,
                              (
                                zoomThresholdSlider -
                                1 / 3
                              ) /
                              (
                                2 / 3
                              )
                            )
                          );

                        const zoomPhase =
                          Math.max(
                            0,
                            Math.min(
                              1,
                              (
                                outerProgress -
                                zoomThresholdOuterProgress
                              ) /
                              (
                                1 -
                                zoomThresholdOuterProgress
                              )
                            )
                          );

                        /*
                         * Let the circle reach its final radius only
                         * just before the roots reach their endpoint.
                         *
                         * The power delays the middle of the approach
                         * without introducing a stop or reversal.
                         */
                        const infinityCircleArrivalPhase =
                          0.9995;

                        const arrivalNormalized =
                          Math.min(
                            1,
                            zoomPhase /
                              infinityCircleArrivalPhase
                          );

                        const delayedCirclePhase =
                          arrivalNormalized ** 2.5;

                        const easedCircleProgress =
                          delayedCirclePhase *
                          delayedCirclePhase *
                          (
                            3 -
                            2 *
                            delayedCirclePhase
                          );

                        infinityRadius =
                          farInfinityRadius +
                          (
                            finalInfinityRadius -
                            farInfinityRadius
                          ) *
                          easedCircleProgress;
                      }

                      if (asymptoticEnd !== 0) {
                        finitePlaneScale = 0;
                        infinityRadius =
                          finalInfinityRadius;
                      }

                      const projectRadius =
                        (r) =>
                          finitePlaneScale * r;

                      const unitCircleRadius =
                        projectRadius(1);

                      const finitePoint =
                        (root, index) => {
                          const r =
                            Math.hypot(
                              root.re,
                              root.im
                            );

                          if (r < 1e-15) {
                            return {
                              x: cx,
                              y: cy,
                            };
                          }

                          const theta =
                            Math.atan2(
                              root.im,
                              root.re
                            );

                          const rho =
                            projectRadius(r);

                          return {
                            x:
                              cx +
                              rho *
                              Math.cos(theta),

                            y:
                              cy -
                              rho *
                              Math.sin(theta),
                          };
                        };

                      const pointAtAngle =
                        (theta) => ({
                          x:
                            cx +
                            infinityRadius *
                            Math.cos(theta),

                          y:
                            cy -
                            infinityRadius *
                            Math.sin(theta),
                        });

                      const asymptoticPoint =
                        (index) => {
                          if (asymptoticEnd === 1) {
                            if (index === 0) {
                              return {
                                x: cx,
                                y: cy,
                              };
                            }

                            if (index === 1) {
                              return pointAtAngle(0);
                            }

                            if (index === 2) {
                              return pointAtAngle(
                                2 * Math.PI / 3
                              );
                            }

                            return pointAtAngle(
                              -2 * Math.PI / 3
                            );
                          }

                          if (asymptoticEnd === -1) {
                            if (index === 1) {
                              return {
                                x: cx,
                                y: cy,
                              };
                            }

                            if (index === 0) {
                              return pointAtAngle(
                                Math.PI
                              );
                            }

                            if (index === 2) {
                              return pointAtAngle(
                                Math.PI / 3
                              );
                            }

                            return pointAtAngle(
                              -Math.PI / 3
                            );
                          }

                          return finitePoint(
                            displayRoots[index],
                            index
                          );
                        };

                      const points =
                        roots.map(
                          (_, index) =>
                            asymptoticPoint(index)
                        );

                      const normalizedInfinityRadius =
                        finalInfinityRadius;

                      /*
                       * Normalized coordinates use the ordinary
                       * finite-plane scale:
                       *
                       *   |z| = 1  ->  radius 48.
                       */
                      const normalizedUnitRadius =
                        baseFinitePlaneScale;

                      /*
                       * TRUE RIEMANN-SPHERE COMPACTIFICATION
                       *
                       * Inverse stereographic projection gives
                       *
                       *   alpha = 2 atan(|z|)
                       *
                       * as the spherical distance from z=0.
                       *
                       * Display S² as D²/∂D²:
                       *
                       *   rho = R alpha/pi
                       *       = (2R/pi) atan(|z|).
                       *
                       * Every point of the dashed boundary is the
                       * SAME north-pole point infinity.
                       */
                      const riemannDiskRadius = (
                        magnitude,
                        infinityR
                      ) =>
                        infinityR *
                        (
                          2 * Math.atan(magnitude) /
                          Math.PI
                        );

                      /*
                       * |z| = 1 is the equator of the Riemann sphere,
                       * therefore it lies exactly halfway from
                       * z=0 to infinity in spherical distance.
                       */
                      const normalizedRiemannUnitRadius =
                        normalizedInfinityRadius / 2;

                      const normalizedDisplayUnitRadius =
                        mobiusPlaneMode === 'compactified'
                          ? normalizedRiemannUnitRadius
                          : normalizedUnitRadius;

                      const fromInfinityRadius =
                        mobiusFromStage === 0 &&
                        !mobiusFromNormalizedContext
                          ? infinityRadius
                          : normalizedInfinityRadius;

                      const toInfinityRadius =
                        mobiusStage === 0 &&
                        !mobiusNormalizedContext
                          ? infinityRadius
                          : normalizedInfinityRadius;

                      const displayInfinityRadius =
                        fromInfinityRadius +
                        (
                          toInfinityRadius -
                          fromInfinityRadius
                        ) *
                        mobiusMix;

                      const fromUnitCircleRadius =
                        mobiusFromStage === 0 &&
                        !mobiusFromNormalizedContext
                          ? unitCircleRadius
                          : normalizedDisplayUnitRadius;

                      const toUnitCircleRadius =
                        mobiusStage === 0 &&
                        !mobiusNormalizedContext
                          ? unitCircleRadius
                          : normalizedDisplayUnitRadius;

                      const displayUnitCircleRadius =
                        fromUnitCircleRadius +
                        (
                          toUnitCircleRadius -
                          fromUnitCircleRadius
                        ) *
                        mobiusMix;

                      /*
                       * Project one transformed complex point
                       * into the compactified viewer.
                       *
                       * Infinity is placed at the right-hand
                       * point of the infinity circle.
                       */
                      const mobiusPoint = (
                        value,
                        infinityR
                      ) => {
                        if (
                          value == null ||
                          !Number.isFinite(value.re) ||
                          !Number.isFinite(value.im)
                        ) {
                          return {
                            x:
                              cx +
                              infinityR,
                            y: cy,
                          };
                        }

                        const theta =
                          Math.atan2(
                            value.im,
                            value.re
                          );

                        const magnitude =
                          Math.hypot(
                            value.re,
                            value.im
                          );

                        /*
                         * AFFINE PLANE:
                         *   ordinary complex coordinate z.
                         *
                         * COMPACTIFIED:
                         *   actual Riemann-sphere one-point
                         *   compactification, displayed in D²/∂D²:
                         *
                         *     rho = (2R/pi) atan(|z|).
                         *
                         * The dashed boundary is one identified
                         * point: infinity.
                         */
                        const radius =
                          mobiusPlaneMode ===
                          'compactified'
                            ? riemannDiskRadius(
                                magnitude,
                                infinityR
                              )
                            : (
                                magnitude *
                                normalizedUnitRadius
                              );

                        return {
                          x:
                            cx +
                            radius *
                            Math.cos(theta),

                          y:
                            cy -
                            radius *
                            Math.sin(theta),
                        };
                      };

                      const stagePoints = (
                        stage,
                        infinityR,
                        normalizedContext
                      ) =>
                        stage === 0
                          ? (
                              normalizedContext
                                ? displayRoots.map(
                                    (value) =>
                                      mobiusPoint(
                                        value,
                                        infinityR
                                      )
                                  )
                                : points
                            )
                          : mobiusStory.values[
                              stage
                            ].map(
                              (value) =>
                                mobiusPoint(
                                  value,
                                  infinityR
                                )
                            );

                      const stageValues = (stage) =>
                        stage === 0
                          ? displayRoots
                          : mobiusStory.values[stage];

                      const fromValues =
                        stageValues(
                          mobiusFromStage
                        );

                      const toValues =
                        stageValues(
                          mobiusStage
                        );

                      const isFiniteMobiusValue =
                        (value) =>
                          value != null &&
                          Number.isFinite(
                            value.re
                          ) &&
                          Number.isFinite(
                            value.im
                          );

                      const isRenderableMobiusValue =
                        (value) => {
                          if (value == null) {
                            return false;
                          }

                          if (
                            mobiusPlaneMode ===
                            'compactified'
                          ) {
                            return true;
                          }

                          return isFiniteMobiusValue(
                            value
                          );
                        };

                      const shouldRenderDisplayPoint =
                        (index) => {
                          if (
                            mode !==
                              'Möbius transform'
                          ) {
                            return true;
                          }

                          if (mobiusAnimating) {
                            return (
                              isRenderableMobiusValue(
                                fromValues[index]
                              ) ||
                              isRenderableMobiusValue(
                                toValues[index]
                              )
                            );
                          }

                          return isRenderableMobiusValue(
                            toValues[index]
                          );
                        };

                      const fromPoints =
                        stagePoints(
                          mobiusFromStage,
                          fromInfinityRadius,
                          mobiusFromNormalizedContext
                        );

                      const toPoints =
                        stagePoints(
                          mobiusStage,
                          toInfinityRadius,
                          mobiusNormalizedContext
                        );

                      /*
                       * Animate ALL FOUR roots from whatever
                       * fixed state we are currently in to
                       * whichever fixed state was selected.
                       */
                      const displayPoints =
                        fromPoints.map(
                          (point, index) => ({
                            x:
                              point.x +
                              (
                                toPoints[index].x -
                                point.x
                              ) *
                              mobiusMix,

                            y:
                              point.y +
                              (
                                toPoints[index].y -
                                point.y
                              ) *
                              mobiusMix,
                          })
                        );

                      if (
                        mode === 'Möbius transform'
                      ) {
                        mobiusDisplayPointsRef.current =
                          displayPoints.map(
                            (point) => ({
                              x: point.x,
                              y: point.y,
                            })
                          );
                      }

                      const displayTheta =
                        asymptoticEnd === 1
                          ? 2 * Math.PI / 3
                          : asymptoticEnd === -1
                            ? Math.PI / 3
                            : zheTheta;

                      const p3 =
                        displayPoints[2];

                      const arcRadius = 52;

                      const arcStart = {
                        x:
                          cx +
                          arcRadius,

                        y: cy,
                      };

                      const arcEnd = {
                        x:
                          cx +
                          arcRadius *
                          Math.cos(
                            displayTheta
                          ),

                        y:
                          cy -
                          arcRadius *
                          Math.sin(
                            displayTheta
                          ),
                      };

                      const largeArc =
                        displayTheta >
                        Math.PI
                          ? 1
                          : 0;

                      const infiniteIndices =
                        asymptoticEnd === 1
                          ? [1, 2, 3]
                          : asymptoticEnd === -1
                            ? [0, 2, 3]
                            : [];

                      const trianglePoints =
                        infiniteIndices
                          .map(
                            (index) =>
                              `${points[index].x},${points[index].y}`
                          )
                          .join(' ');

                      const buildAngleMarker = (
                        vertex,
                        neighborA,
                        neighborB
                      ) => {
                        const v1x =
                          neighborA.x -
                          vertex.x;
                        const v1y =
                          neighborA.y -
                          vertex.y;
                        const v2x =
                          neighborB.x -
                          vertex.x;
                        const v2y =
                          neighborB.y -
                          vertex.y;

                        const len1 =
                          Math.hypot(
                            v1x,
                            v1y
                          ) || 1;
                        const len2 =
                          Math.hypot(
                            v2x,
                            v2y
                          ) || 1;

                        const u1x =
                          v1x / len1;
                        const u1y =
                          v1y / len1;
                        const u2x =
                          v2x / len2;
                        const u2y =
                          v2y / len2;

                        const bisectorX =
                          u1x + u2x;
                        const bisectorY =
                          u1y + u2y;

                        const bisectorLength =
                          Math.hypot(
                            bisectorX,
                            bisectorY
                          ) || 1;

                        const bx =
                          bisectorX /
                          bisectorLength;
                        const by =
                          bisectorY /
                          bisectorLength;

                        const arcRadius = 18;
                        const controlRadius = 21;
                        const labelRadius = 30;

                        const startPoint = {
                          x:
                            vertex.x +
                            u1x *
                              arcRadius,
                          y:
                            vertex.y +
                            u1y *
                              arcRadius,
                        };

                        const endPoint = {
                          x:
                            vertex.x +
                            u2x *
                              arcRadius,
                          y:
                            vertex.y +
                            u2y *
                              arcRadius,
                        };

                        const controlPoint = {
                          x:
                            vertex.x +
                            bx *
                              controlRadius,
                          y:
                            vertex.y +
                            by *
                              controlRadius,
                        };

                        const labelPoint = {
                          x:
                            vertex.x +
                            bx *
                              labelRadius,
                          y:
                            vertex.y +
                            by *
                              labelRadius,
                        };

                        return {
                          arcD:
                            `M ${startPoint.x} ${startPoint.y} ` +
                            `Q ${controlPoint.x} ${controlPoint.y} ` +
                            `${endPoint.x} ${endPoint.y}`,
                          labelX:
                            labelPoint.x,
                          labelY:
                            labelPoint.y,
                        };
                      };

                      const angleMarkers =
                        asymptoticEnd === 1
                          ? [
                              buildAngleMarker(
                                points[1],
                                points[3],
                                points[2]
                              ),
                              buildAngleMarker(
                                points[2],
                                points[1],
                                points[3]
                              ),
                              buildAngleMarker(
                                points[3],
                                points[2],
                                points[1]
                              ),
                            ]
                          : asymptoticEnd === -1
                            ? [
                                buildAngleMarker(
                                  points[0],
                                  points[2],
                                  points[3]
                                ),
                                buildAngleMarker(
                                  points[2],
                                  points[0],
                                  points[3]
                                ),
                                buildAngleMarker(
                                  points[3],
                                  points[2],
                                  points[0]
                                ),
                              ]
                            : [];

                      return (
                        <svg
                          className={
                            styles.rootSvg
                          }
                          viewBox={
                            `0 0 ${width} ${height}`
                          }
                          role="img"
                          aria-label="Compactified complex plane showing quartic roots and the circle at infinity"
                          style={{
                            overflow: 'visible',
                          }}
                        >
                          {showInfinityCircle && ((
                            mobiusStage === 0 &&
                            (
                              mobiusNormalizedContext ||
                              outerProgress > 0
                            )
                          ) || (
                            mobiusPlaneMode ===
                              'compactified' &&
                            (
                              mobiusStage > 0 ||
                              (
                                mobiusAnimating &&
                                mobiusFromStage > 0
                              )
                            )
                          )) && (
                            <>
                              <circle
                                cx={cx}
                                cy={cy}
                                r={
                                  displayInfinityRadius
                                }
                                className={
                                  styles.rootInfinityCircle
                                }
                              />
                              <defs>
                                <path
                                  id="root-infinity-label-arc"
                                  d={
                                    (() => {
                                      const labelRadius =
                                        displayInfinityRadius +
                                        7;

                                      const startAngle =
                                        -1.02;

                                      const endAngle =
                                        -0.48;

                                      const x1 =
                                        cx +
                                        labelRadius *
                                        Math.cos(
                                          startAngle
                                        );

                                      const y1 =
                                        cy +
                                        labelRadius *
                                        Math.sin(
                                          startAngle
                                        );

                                      const x2 =
                                        cx +
                                        labelRadius *
                                        Math.cos(
                                          endAngle
                                        );

                                      const y2 =
                                        cy +
                                        labelRadius *
                                        Math.sin(
                                          endAngle
                                        );

                                      return (
                                        `M ${x1} ${y1} ` +
                                        `A ${labelRadius} ${labelRadius} ` +
                                        `0 0 1 ${x2} ${y2}`
                                      );
                                    })()
                                  }
                                />
                              </defs>

                              <text
                                className={
                                  styles.infinityCircleLabel
                                }
                              >
                                <textPath
                                  href="#root-infinity-label-arc"
                                  startOffset="50%"
                                  textAnchor="middle"
                                >
                                  circle at ∞
                                </textPath>
                              </text>
                            </>
                          )}

                          <line
                            x1={0}
                            y1={cy}
                            x2={width}
                            y2={cy}
                            className={
                              styles.axisLine
                            }
                          />

                          <line
                            x1={cx}
                            y1={-height}
                            x2={cx}
                            y2={height * 2}
                            className={
                              styles.axisLine
                            }
                          />

                          <text
                            x={width - 16}
                            y={cy}
                            textAnchor="end"
                            dominantBaseline="middle"
                            className={
                              styles.axisLabel
                            }
                          >
                            Re
                          </text>


                          {showUnitCircle && (
                            <>
                              <circle
                                cx={cx}
                                cy={cy}
                                r={
                                  displayUnitCircleRadius
                                }
                                fill="none"
                                stroke="rgba(232, 223, 200, 0.20)"
                                strokeWidth="1"
                                strokeDasharray="3 4"
                                vectorEffect="non-scaling-stroke"
                              />

                            </>
                          )}

                          <line
                            x1={cx}
                            y1={cy}
                            x2={p3.x}
                            y2={p3.y}
                            className={
                              styles.zheVector
                            }
                          />

                          {mode !== 'Möbius transform' && (
                            <path
                              d={
                                `M ${arcStart.x} ${arcStart.y} ` +
                                `A ${arcRadius} ${arcRadius} 0 ${largeArc} 0 ` +
                                `${arcEnd.x} ${arcEnd.y}`
                              }
                              className={
                                styles.angleArc
                              }
                            />
                          )}

                          {asymptoticEnd !== 0 &&
                          (
                            mode !== 'Möbius transform' ||
                            (
                              mobiusStage === 0 &&
                              !mobiusNormalizedContext
                            )
                          ) && (
                            <>
                              <polygon
                                points={
                                  trianglePoints
                                }
                                className={
                                  styles.asymptoticTriangle
                                }
                              />

                              {angleMarkers.map(
                                (
                                  marker,
                                  index
                                ) => (
                                  <g
                                    key={
                                      index
                                    }
                                  >
                                    <path
                                      d={
                                        marker.arcD
                                      }
                                      className={
                                        styles.asymptoticAngleArc
                                      }
                                    />
                                    <text
                                      x={
                                        marker.labelX
                                      }
                                      y={
                                        marker.labelY
                                      }
                                      textAnchor="middle"
                                      dominantBaseline="middle"
                                      className={
                                        styles.asymptoticAngleLabel
                                      }
                                    >
                                      60°
                                    </text>
                                  </g>
                                )
                              )}
                            </>
                          )}

                          {mode === 'Möbius transform' &&
                          showMobiusTraces &&
                          (() => {
                            /*
                             * Convert an ACTUAL complex trajectory
                             * directly into this viewer's affine
                             * coordinates.
                             *
                             * No clipping or artificial infinity
                             * boundary is applied.
                             */
                            const complexPathD =
                              (points) => {
                                const commands = [];
                                let penDown = false;

                                for (const point of points) {
                                  const finite =
                                    point &&
                                    Number.isFinite(point.re) &&
                                    Number.isFinite(point.im);

                                  /*
                                   * A genuine pole is the single
                                   * point infinity of the Riemann
                                   * sphere. In this quotient-disk
                                   * chart we lift the pen there.
                                   */
                                  if (!finite) {
                                    penDown = false;
                                    continue;
                                  }

                                  const magnitude =
                                    Math.hypot(
                                      point.re,
                                      point.im
                                    );

                                  const theta =
                                    Math.atan2(
                                      point.im,
                                      point.re
                                    );

                                  const radius =
                                    mobiusPlaneMode ===
                                    'compactified'
                                      ? riemannDiskRadius(
                                          magnitude,
                                          normalizedInfinityRadius
                                        )
                                      : (
                                          magnitude *
                                          normalizedUnitRadius
                                        );

                                  const x =
                                    cx +
                                    radius *
                                      Math.cos(theta);

                                  const y =
                                    cy -
                                    radius *
                                      Math.sin(theta);

                                  commands.push(
                                    `${
                                      penDown
                                        ? 'L'
                                        : 'M'
                                    } ${x} ${y}`
                                  );

                                  penDown = true;
                                }

                                return commands.join(
                                  ' '
                                );
                              };

                            /*
                             * SIX UNIQUE ANHARMONIC LOCI
                             */
                            if (
                              mobiusTraceMode ===
                              'unique'
                            ) {
                              return (
                                mobiusAuditTraces
                                  .uniqueFull
                                  .map(
                                    (trace) => (
                                      <path
                                        key={
                                          trace.key
                                        }
                                        d={
                                          complexPathD(
                                            trace.points
                                          )
                                        }
                                        fill="none"
                                        stroke={
                                          ANHARMONIC_COLORS[
                                            trace
                                              .variantIndex
                                          ]
                                        }
                                        strokeWidth="1.85"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        opacity="0.92"
                                        vectorEffect="non-scaling-stroke"
                                        pointerEvents="none"
                                      />
                                    )
                                  )
                              );
                            }

                            /*
                             * ALL 24 FULL NORMALIZATIONS
                             *
                             * Four paths in each color should
                             * coincide exactly, producing the six
                             * anharmonic loci.
                             */
                            if (
                              mobiusTraceMode ===
                              'full'
                            ) {
                              return (
                                mobiusAuditTraces
                                  .full
                                  .map(
                                    (trace) => (
                                      <path
                                        key={
                                          trace.key
                                        }
                                        d={
                                          complexPathD(
                                            trace.points
                                          )
                                        }
                                        fill="none"
                                        stroke={
                                          ANHARMONIC_COLORS[
                                            trace
                                              .variantIndex
                                          ]
                                        }
                                        strokeWidth="1.35"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        opacity="0.58"
                                        vectorEffect="non-scaling-stroke"
                                        pointerEvents="none"
                                      />
                                    )
                                  )
                              );
                            }


                            /*
                             * ALL UNIQUE PARTIAL NORMALIZATIONS
                             */
                            if (
                              mobiusTraceMode ===
                              'partial'
                            ) {
                              return (
                                mobiusAuditTraces
                                  .partialLoci
                                  .map(
                                    (trace) => (
                                      <path
                                        key={
                                          `partial-locus-${trace.locusIndex}`
                                        }
                                        d={
                                          complexPathD(
                                            trace.points
                                          )
                                        }
                                        fill="none"
                                        stroke={
                                          `hsl(${(
                                            trace.locusIndex *
                                            137.507764
                                          ) % 360} 82% 64%)`
                                        }
                                        strokeWidth="1.35"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        opacity="0.76"
                                        vectorEffect="non-scaling-stroke"
                                        pointerEvents="none"
                                      />
                                    )
                                  )
                              );
                            }


                            /*
                             * CURRENT / ACCUMULATE
                             *
                             * Preserve the existing interactive
                             * trace-bank behavior.
                             */
                            return (
                              Object.entries(
                                mobiusTraceBank
                              )
                                .filter(
                                  (
                                    [
                                      stageKey,
                                    ]
                                  ) =>
                                    mobiusTraceMode ===
                                      'accumulate' ||
                                    Number(
                                      stageKey
                                    ) ===
                                      mobiusStage
                                )
                                .flatMap(
                                  (
                                    [
                                      stageKey,
                                      paths,
                                    ]
                                  ) =>
                                    paths.map(
                                      (
                                        path,
                                        index
                                      ) =>
                                        path.length >
                                        1 ? (
                                          <path
                                            key={`mobius-trace-${stageKey}-${index}`}
                                            d={(() => {
                                              let penDown =
                                                false;

                                              return path
                                                .map(
                                                  (
                                                    point
                                                  ) => {
                                                    if (
                                                      !point
                                                    ) {
                                                      penDown =
                                                        false;

                                                      return '';
                                                    }

                                                    const command =
                                                      penDown
                                                        ? 'L'
                                                        : 'M';

                                                    penDown =
                                                      true;

                                                    return (
                                                      `${command} ` +
                                                      `${point.x} ${point.y}`
                                                    );
                                                  }
                                                )
                                                .filter(
                                                  Boolean
                                                )
                                                .join(
                                                  ' '
                                                );
                                            })()}
                                            fill="none"
                                            stroke={
                                              ROOT_COLORS[
                                                index
                                              ]
                                            }
                                            strokeWidth="1.25"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            opacity={
                                              Number(
                                                stageKey
                                              ) ===
                                              mobiusStage
                                                ? 0.86
                                                : 0.42
                                            }
                                            vectorEffect="non-scaling-stroke"
                                            pointerEvents="none"
                                          />
                                        ) : null
                                    )
                                )
                            );
                          })()}


                          {mode === 'Möbius transform' &&
                          showMobiusTraces &&
                          mobiusTraceMode === 'unique' && (
                            <g>
                              {anharmonicReadouts.map(
                                (
                                  item,
                                  index
                                ) => {
                                  const value =
                                    item.value;

                                  if (
                                    !value ||
                                    !Number.isFinite(
                                      value.re
                                    ) ||
                                    !Number.isFinite(
                                      value.im
                                    )
                                  ) {
                                    return null;
                                  }

                                  const magnitude =
                                    Math.hypot(
                                      value.re,
                                      value.im
                                    );

                                  const theta =
                                    Math.atan2(
                                      value.im,
                                      value.re
                                    );

                                  const radius =
                                    mobiusPlaneMode ===
                                    'compactified'
                                      ? riemannDiskRadius(
                                          magnitude,
                                          normalizedInfinityRadius
                                        )
                                      : (
                                          magnitude *
                                          normalizedUnitRadius
                                        );

                                  const x =
                                    cx +
                                    radius *
                                      Math.cos(theta);

                                  const y =
                                    cy -
                                    radius *
                                      Math.sin(theta);

                                  return (
                                    <circle
                                      key={
                                        `anharmonic-live-${item.key}`
                                      }
                                      cx={x}
                                      cy={y}
                                      r={mobiusDotRadius}
                                      fill={
                                        ANHARMONIC_COLORS[
                                          index
                                        ]
                                      }
                                      stroke="rgba(12, 10, 7, 0.92)"
                                      strokeWidth="1.2"
                                      vectorEffect="non-scaling-stroke"
                                      pointerEvents="none"
                                    />
                                  );
                                }
                              )}
                            </g>
                          )}

                          {displayPoints.map(
                            (
                              point,
                              index
                            ) =>
                              shouldRenderDisplayPoint(
                                index
                              ) ? (
                                <circle
                                  key={index}
                                  cx={
                                    point.x
                                  }
                                  cy={
                                    point.y
                                  }
                                  r={
                                    mode === 'Möbius transform'
                                      ? mobiusDotRadius
                                      : rootsDotRadius
                                  }
                                  className={
                                    styles.rootPoint
                                  }
                                  style={{
                                    fill:
                                      ROOT_COLORS[
                                        index
                                      ],
                                  }}
                                />
                              ) : null
                          )}

                          <circle
                            cx={cx}
                            cy={cy}
                            r="3"
                            className={
                              styles.rootOriginPoint
                            }
                          />

                        </svg>
                      );
                    })()}
                  </div>
                  </div>

                  {renderSharedRootsFooter()}

                </div>
              )}
            </section>

            <aside
              className={styles.controls}
              aria-label="Quartic tetrahedron controls"
              style={{
                position: 'relative',
                display:
                  mode === 'Monodromy'
                    ? 'none'
                    : undefined,
              }}
            >

              {/* SHARED CONTROL — present on every tab */}
              <div className={styles.controlSection}>
                <div className={styles.sectionTitle}>
                  Quartic parameter
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    marginTop: '4px',
                    marginBottom: '-2px',
                  }}
                >
                  <div
                    style={{
                      minWidth: 0,
                      fontSize:
                        'clamp(16px, 1.2vw, 19px)',
                      lineHeight: 1.2,
                      color:
                        'rgba(245, 239, 224, 0.96)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {
                      mode === 'Riemann surface' &&
                      asymptoticEnd === 0 &&
                      Math.abs(
                        a - PHYSICAL_A
                      ) < 1e-12
                        ? (
                            <img
                              src="/equations/a_scale.svg"
                              alt="physical quartic parameter"
                              style={{
                                display:
                                  'block',
                                height:
                                  '44px',
                                width:
                                  'auto',
                                maxWidth:
                                  'none',
                                maxHeight:
                                  'none',
                              }}
                            />
                          )
                        : (
                            <MathInline
                              latex={aDisplayLatex}
                            />
                          )
                    }
                  </div>


                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      flex: '0 0 auto',
                    }}
                  >
                    <button
                      type="button"
                      className={
                        isAPlaying
                          ? styles.modeButtonActive
                          : styles.resetButton
                      }
                      onClick={toggleAPlayback}
                      aria-label={
                        isAPlaying
                          ? 'Pause quartic parameter animation'
                          : 'Play quartic parameter animation'
                      }
                      title={
                        isAPlaying
                          ? 'Pause'
                          : 'Play'
                      }
                      style={{
                        flex: '0 0 auto',
                        width: '42px',
                        minWidth: '42px',
                        marginTop: 0,
                        paddingLeft: 0,
                        paddingRight: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isAPlaying
                        ? '❚❚'
                        : '▶'}
                    </button>

                    <button
                      type="button"
                      className={styles.resetButton}
                      onClick={resetPhysicalA}
                      style={{
                        flex: '0 0 auto',
                        width: 'auto',
                        marginTop: 0,
                        paddingLeft: '18px',
                        paddingRight: '18px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Physical value
                    </button>
                  </div>
                </div>

                <div className={styles.sliderSpecialLabels}>
                  <button
                    type="button"
                    className={styles.sliderSpecialLabelButton}
                    style={{
                      left:
                        sliderCenterLeft(-1),
                    }}
                    onClick={() =>
                      jumpToSpecialA(
                        -Infinity
                      )
                    }
                    title="Set a = −∞"
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        transform:
                          `translate(${negativeInfinityLabelXOffset}px, ${endpointLabelYOffset}px)`,
                      }}
                    >
                      −∞
                    </span>
                  </button>

                  <button
                    type="button"
                    className={styles.sliderSpecialLabelButton}
                    style={{
                      left:
                        sliderCenterLeft(
                          sliderFromA(
                            -BRANCH_A
                          )
                        ),
                    }}
                    onClick={() =>
                      jumpToSpecialA(
                        -BRANCH_A
                      )
                    }
                    title="Set a = −a₁"
                  >
                    <img
                      src="/equations/negative_a_1.svg"
                      alt=""
                      aria-hidden="true"
                      style={{
                        display: 'block',
                        width: 'auto',
                        height: 'auto',
                        margin: '0 auto',
                        transform:
                          `translateY(${specialLabelYOffset}px) scale(${specialLabelFontSize / 12})`,
                        transformOrigin:
                          'center center',
                        pointerEvents: 'none',
                      }}
                    />
                  </button>

                  <button
                    type="button"
                    className={styles.sliderSpecialLabelButton}
                    style={{
                      left:
                        sliderCenterLeft(
                          sliderFromA(
                            -HARMONIC_A
                          )
                        ),
                    }}
                    onClick={() =>
                      jumpToSpecialA(
                        -HARMONIC_A
                      )
                    }
                    title="Set a = −a₂"
                  >
                    <img
                      src="/equations/negative_a_2.svg"
                      alt=""
                      aria-hidden="true"
                      style={{
                        display: 'block',
                        width: 'auto',
                        height: 'auto',
                        margin: '0 auto',
                        transform:
                          `translateY(${specialLabelYOffset}px) scale(${specialLabelFontSize / 12})`,
                        transformOrigin:
                          'center center',
                        pointerEvents: 'none',
                      }}
                    />
                  </button>

                  <button
                    type="button"
                    className={styles.sliderSpecialLabelButton}
                    style={{
                      left:
                        sliderCenterLeft(
                          sliderFromA(
                            -UNIT_CIRCLE_A
                          )
                        ),
                    }}
                    onClick={() =>
                      jumpToSpecialA(
                        -UNIT_CIRCLE_A
                      )
                    }
                    title="Set a = −a₃"
                  >
                    <img
                      src="/equations/negative_a_3.svg"
                      alt=""
                      aria-hidden="true"
                      style={{
                        display: 'block',
                        width: 'auto',
                        height: 'auto',
                        margin: '0 auto',
                        transform:
                          `translateY(${specialLabelYOffset}px) scale(${specialLabelFontSize / 12})`,
                        transformOrigin:
                          'center center',
                        pointerEvents: 'none',
                      }}
                    />
                  </button>

                  <button
                    type="button"
                    className={styles.sliderSpecialLabelButton}
                    style={{
                      left:
                        sliderCenterLeft(0),
                    }}
                    onClick={() =>
                      jumpToSpecialA(0)
                    }
                    title="Set a = 0"
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        transform:
                          `translate(${zeroLabelXOffset}px, ${endpointLabelYOffset}px)`,
                      }}
                    >
                      0
                    </span>
                  </button>

                  <button
                    type="button"
                    className={styles.sliderSpecialLabelButton}
                    style={{
                      left:
                        sliderCenterLeft(
                          sliderFromA(
                            UNIT_CIRCLE_A
                          )
                        ),
                    }}
                    onClick={() =>
                      jumpToSpecialA(
                        UNIT_CIRCLE_A
                      )
                    }
                    title="Set a = a₃"
                  >
                    <img
                      src="/equations/a_3.svg"
                      alt=""
                      aria-hidden="true"
                      style={{
                        display: 'block',
                        width: 'auto',
                        height: 'auto',
                        margin: '0 auto',
                        transform:
                          `translateY(${specialLabelYOffset}px) scale(${specialLabelFontSize / 12})`,
                        transformOrigin:
                          'center center',
                        pointerEvents: 'none',
                      }}
                    />
                  </button>

                  <button
                    type="button"
                    className={styles.sliderSpecialLabelButton}
                    style={{
                      left:
                        sliderCenterLeft(
                          sliderFromA(
                            HARMONIC_A
                          )
                        ),
                    }}
                    onClick={() =>
                      jumpToSpecialA(
                        HARMONIC_A
                      )
                    }
                    title="Set a = a₂"
                  >
                    <img
                      src="/equations/a_2.svg"
                      alt=""
                      aria-hidden="true"
                      style={{
                        display: 'block',
                        width: 'auto',
                        height: 'auto',
                        margin: '0 auto',
                        transform:
                          `translateY(${specialLabelYOffset}px) scale(${specialLabelFontSize / 12})`,
                        transformOrigin:
                          'center center',
                        pointerEvents: 'none',
                      }}
                    />
                  </button>

                  <button
                    type="button"
                    className={styles.sliderSpecialLabelButton}
                    style={{
                      left:
                        sliderCenterLeft(
                          sliderFromA(
                            BRANCH_A
                          )
                        ),
                    }}
                    onClick={() =>
                      jumpToSpecialA(
                        BRANCH_A
                      )
                    }
                    title="Set a = a₁"
                  >
                    <img
                      src="/equations/a_1.svg"
                      alt=""
                      aria-hidden="true"
                      style={{
                        display: 'block',
                        width: 'auto',
                        height: 'auto',
                        margin: '0 auto',
                        transform:
                          `translateY(${specialLabelYOffset}px) scale(${specialLabelFontSize / 12})`,
                        transformOrigin:
                          'center center',
                        pointerEvents: 'none',
                      }}
                    />
                  </button>

                  <button
                    type="button"
                    className={styles.sliderSpecialLabelButton}
                    style={{
                      left:
                        sliderCenterLeft(1),
                    }}
                    onClick={() =>
                      jumpToSpecialA(
                        Infinity
                      )
                    }
                    title="Set a = ∞"
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        transform:
                          `translate(${positiveInfinityLabelXOffset}px, ${endpointLabelYOffset}px)`,
                      }}
                    >
                      ∞
                    </span>
                  </button>
                </div>

                <div className={styles.sliderWrap}>
                  <input
                    className={styles.aSlider}
                    type="range"
                    min="-1"
                    max="1"
                    step="0.00025"
                    value={sliderValue}
                    onChange={handleSliderChange}
                    style={{
                      '--quartic-slider-fill':
                        `${
                          50 *
                          (
                            sliderValue +
                            1
                          )
                        }%`,
                    }}
                    aria-label="Quartic parameter a"
                  />

                  <span
                    className={styles.physicalSliderMark}
                    style={{
                      left:
                        sliderCenterLeft(
                          sliderFromA(
                            PHYSICAL_A
                          )
                        ),
                      pointerEvents: 'auto',
                      cursor: 'pointer',
                    }}
                    title="Physical value"
                    role="button"
                    tabIndex="0"
                    aria-label="Set a to physical value"
                    onClick={resetPhysicalA}
                    onKeyDown={(event) => {
                      if (
                        event.key === 'Enter' ||
                        event.key === ' '
                      ) {
                        event.preventDefault();
                        resetPhysicalA();
                      }
                    }}
                  />

                  <button
                    type="button"
                    className={`${styles.branchSliderMark} ${styles.sliderHashButton}`}
                    style={{
                      left:
                        sliderCenterLeft(
                          sliderFromA(
                            -BRANCH_A
                          )
                        ),
                    }}
                    onClick={() =>
                      jumpToSpecialA(
                        -BRANCH_A
                      )
                    }
                    aria-label="Set a to negative branch point"
                    title="a = −a†"
                  />

                  <button
                    type="button"
                    className={`${styles.branchSliderMark} ${styles.sliderHashButton}`}
                    style={{
                      left:
                        sliderCenterLeft(
                          sliderFromA(
                            BRANCH_A
                          )
                        ),
                    }}
                    onClick={() =>
                      jumpToSpecialA(
                        BRANCH_A
                      )
                    }
                    aria-label="Set a to positive branch point"
                    title="a = +a†"
                  />

                  <button
                    type="button"
                    className={`${styles.endSliderMark} ${styles.sliderHashButton}`}
                    style={{
                      left:
                        sliderCenterLeft(-1),
                    }}
                    onClick={() =>
                      jumpToSpecialA(
                        -Infinity
                      )
                    }
                    aria-label="Set a to negative infinity"
                    title="a = −∞"
                  />

                  <button
                    type="button"
                    className={`${styles.branchSliderMark} ${styles.sliderHashButton}`}
                    style={{
                      left:
                        sliderCenterLeft(
                          sliderFromA(
                            -HARMONIC_A
                          )
                        ),
                    }}
                    onClick={() =>
                      jumpToSpecialA(
                        -HARMONIC_A
                      )
                    }
                    aria-label="Set a to negative harmonic point"
                    title="a = −a_h"
                  />

                  <button
                    type="button"
                    className={`${styles.branchSliderMark} ${styles.sliderHashButton}`}
                    style={{
                      left:
                        sliderCenterLeft(
                          sliderFromA(
                            -UNIT_CIRCLE_A
                          )
                        ),
                    }}
                    onClick={() =>
                      jumpToSpecialA(
                        -UNIT_CIRCLE_A
                      )
                    }
                    aria-label="Set a to negative unit-circle crossing"
                    title="a = −(1 − 1/(2π))"
                  />

                  <button
                    type="button"
                    className={`${styles.endSliderMark} ${styles.sliderHashButton}`}
                    style={{
                      left:
                        sliderCenterLeft(0),
                    }}
                    onClick={() =>
                      jumpToSpecialA(0)
                    }
                    aria-label="Set a to zero"
                    title="a = 0"
                  />

                  <button
                    type="button"
                    className={`${styles.branchSliderMark} ${styles.sliderHashButton}`}
                    style={{
                      left:
                        sliderCenterLeft(
                          sliderFromA(
                            UNIT_CIRCLE_A
                          )
                        ),
                    }}
                    onClick={() =>
                      jumpToSpecialA(
                        UNIT_CIRCLE_A
                      )
                    }
                    aria-label="Set a to positive unit-circle crossing"
                    title="a = 1 − 1/(2π)"
                  />

                  <button
                    type="button"
                    className={`${styles.branchSliderMark} ${styles.sliderHashButton}`}
                    style={{
                      left:
                        sliderCenterLeft(
                          sliderFromA(
                            HARMONIC_A
                          )
                        ),
                    }}
                    onClick={() =>
                      jumpToSpecialA(
                        HARMONIC_A
                      )
                    }
                    aria-label="Set a to positive harmonic point"
                    title="a = +a_h"
                  />

                  <button
                    type="button"
                    className={`${styles.endSliderMark} ${styles.sliderHashButton}`}
                    style={{
                      left:
                        sliderCenterLeft(1),
                    }}
                    onClick={() =>
                      jumpToSpecialA(
                        Infinity
                      )
                    }
                    aria-label="Set a to positive infinity"
                    title="a = +∞"
                  />
                </div>

              </div>

              <div className={styles.divider} />

              {ROOT_FAMILY_MODES.includes(mode) && (
                <>
                  <div
                    className={styles.controlSection}
                    style={{
                      paddingTop: '10px',
                      paddingBottom: '10px',
                    }}
                  >
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns:
                          'repeat(3, minmax(0, 1fr))',
                        gap: '6px',
                        width: '100%',
                      }}
                    >
                      {ROOT_FAMILY_MODES.map(
                        rootMode => {
                          const active =
                            mode === rootMode;

                          return (
                            <button
                              key={rootMode}
                              type="button"
                              className={
                                active
                                  ? styles.modeButtonActive
                                  : styles.modeButton
                              }
                              aria-pressed={
                                active
                              }
                              onClick={() =>
                                setMode(
                                  rootMode
                                )
                              }
                              style={{
                                minWidth: 0,
                                width: '100%',
                                whiteSpace:
                                  'nowrap',
                              }}
                            >
                              {rootMode}
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>

                  <div
                    className={
                      styles.divider
                    }
                  />
                </>
              )}

              {mode === 'Riemann surface' && (
                <>
                  <div className={styles.controlSection}>
                    <div className={styles.sectionTitle}>
                      Riemann surface
                    </div>

                    <div
                      style={{
                        marginTop: '8px',
                        display: 'grid',
                        gridTemplateColumns:
                          'repeat(3, minmax(0, 1fr))',
                        gap: '6px',
                      }}
                    >
                      <button
                        type="button"
                        className={
                          riemannGraphsVisible.sphere
                            ? styles.modeButtonActive
                            : styles.modeButton
                        }
                        aria-pressed={
                          riemannGraphsVisible.sphere
                        }
                        onClick={() =>
                          toggleRiemannGraph(
                            'sphere'
                          )
                        }
                      >
                        Riemann surface
                      </button>

                      <button
                        type="button"
                        className={
                          riemannGraphsVisible.map
                            ? styles.modeButtonActive
                            : styles.modeButton
                        }
                        aria-pressed={
                          riemannGraphsVisible.map
                        }
                        onClick={() =>
                          toggleRiemannGraph(
                            'map'
                          )
                        }
                      >
                        Planar map
                      </button>


                      <button
                        type="button"
                        className={
                          styles.modeButton
                        }
                        onClick={
                          resetRiemannView
                        }
                      >
                        Reset
                      </button>
                    </div>


                    <div
                      style={{
                        marginTop: '8px',
                        display: 'grid',
                        gridTemplateColumns:
                          'repeat(4, minmax(0, 1fr))',
                        gap: '6px',
                        width: '100%',
                      }}
                    >
                      {
                        RIEMANN_STRUCTURE_MODES.map(
                          item => (
                            <button
                              key={item.id}
                              type="button"
                              className={
                                riemannStructureModes.includes(
                                  item.id
                                )
                                  ? styles.modeButtonActive
                                  : styles.modeButton
                              }
                              aria-pressed={
                                riemannStructureModes.includes(
                                  item.id
                                )
                              }
                              onClick={() =>
                                toggleRiemannStructureMode(
                                  item.id
                                )
                              }
                              style={{
                                minWidth: 0,
                                width: '100%',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {item.label}
                            </button>
                          )
                        )
                      }
                    </div>

                    <div
                      style={{
                        marginTop: '10px',
                        display: 'grid',
                        gap: '7px',

                        color:
                          'rgba(232, 223, 200, 0.82)',

                        fontSize:
                          '12px',

                        lineHeight: 1.35,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          flexWrap: 'wrap',
                          gap: '0.18em',
                        }}
                      >
                        <span>Degree:</span>

                        <span>
                          4-sheeted branched cover of the
                        </span>

                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'baseline',
                            gap: 0,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <img
                            src="/equations/a_symbol.svg"
                            alt="a"
                            style={{
                              display: 'inline-block',
                              width: 'auto',
                              height: 'auto',
                              maxWidth: 'none',
                              maxHeight: 'none',

                              transform:
                                `translateY(0.10em) scale(0.8333333333333333)`,

                              transformOrigin:
                                'left center',

                              marginRight:
                                '-0.11em',

                              flex: '0 0 auto',
                            }}
                          />

                          <span>-sphere</span>
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          flexWrap: 'wrap',
                          gap: '0.18em',
                        }}
                      >
                        <span>Branch points:</span>

                        <img
                          src="/equations/negative_a_1.svg"
                          alt="-a3"
                          style={{
                            display: 'inline-block',

                            /*
                             * Equation SVGs use a 12px source-font basis.
                             * Preserve intrinsic SVG dimensions and size
                             * them exactly BY FONT SIZE:
                             *
                             *     desired font size / 12
                             */
                            width: 'auto',
                            height: 'auto',
                            maxWidth: 'none',
                            maxHeight: 'none',

                            transform:
                              `translateY(0.28em) scale(0.8333333333333333)`,

                            transformOrigin:
                              'left center',

                            flex: '0 0 auto',
                          }}
                        />

                        <span>,</span>

                        <img
                          src="/equations/a_1.svg"
                          alt="a3"
                          style={{
                            display: 'inline-block',

                            /*
                             * Equation SVGs use a 12px source-font basis.
                             * Preserve intrinsic SVG dimensions and size
                             * them exactly BY FONT SIZE:
                             *
                             *     desired font size / 12
                             */
                            width: 'auto',
                            height: 'auto',
                            maxWidth: 'none',
                            maxHeight: 'none',

                            transform:
                              `translateY(0.28em) scale(0.8333333333333333)`,

                            transformOrigin:
                              'left center',

                            flex: '0 0 auto',
                          }}
                        />

                        <span>,</span>

                        <img
                          src="/equations/negative_b_1.svg"
                          alt="-ib1"
                          style={{
                            display: 'inline-block',

                            /*
                             * Equation SVGs use a 12px source-font basis.
                             * Preserve intrinsic SVG dimensions and size
                             * them exactly BY FONT SIZE:
                             *
                             *     desired font size / 12
                             */
                            width: 'auto',
                            height: 'auto',
                            maxWidth: 'none',
                            maxHeight: 'none',

                            transform:
                              `translateY(0.32em) scale(0.8333333333333333)`,

                            transformOrigin:
                              'left center',

                            flex: '0 0 auto',
                          }}
                        />

                        <span>,</span>

                        <img
                          src="/equations/b_1.svg"
                          alt="ib1"
                          style={{
                            display: 'inline-block',

                            /*
                             * Equation SVGs use a 12px source-font basis.
                             * Preserve intrinsic SVG dimensions and size
                             * them exactly BY FONT SIZE:
                             *
                             *     desired font size / 12
                             */
                            width: 'auto',
                            height: 'auto',
                            maxWidth: 'none',
                            maxHeight: 'none',

                            transform:
                              `translateY(0.32em) scale(0.8333333333333333)`,

                            transformOrigin:
                              'left center',

                            flex: '0 0 auto',
                          }}
                        />

                        <span>.</span>
                      </div>

                      <div>
                        Ramification: simple
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          flexWrap: 'wrap',
                          gap: '0.18em',
                        }}
                      >
                        <InfinitySymbol size="7px" />

                        <span>
                          : ramification index 3;
                        </span>

                        <span>
                          0: unramified second point over
                        </span>

                        <img
                          src="/equations/a_equals_infinity.svg"
                          alt="a equals infinity"
                          style={{
                            display: 'inline-block',
                            width: 'auto',
                            height: 'auto',
                            maxWidth: 'none',
                            maxHeight: 'none',

                            transform:
                              `translate(0.04em, 0.07em) scale(0.8333333333333333)`,

                            transformOrigin:
                              'left center',

                            flex: '0 0 auto',
                          }}
                        />
                      </div>


                    </div>
                  </div>

                  <div
                    className={
                      styles.divider
                    }
                  />

                  <div
                    className={
                      styles.controlSection
                    }
                  >
                    <div
                      className={
                        styles.sectionTitle
                      }
                    >
                      Branch values
                    </div>

                    <div
                      style={{
                        marginTop: '14px',
                        display: 'grid',
                        gap: '18px',
                      }}
                    >
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns:
                            'minmax(0, 1fr) max-content',
                          alignItems: 'center',
                          columnGap: '16px',
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'baseline',
                            gap: '0.24em',
                            whiteSpace: 'nowrap',
                            color:
                              'rgba(232, 223, 200, 0.78)',
                          }}
                        >
                          <RiemannBranchEquationSvg
                            src="/equations/a_1_equation.svg"
                            alt="a1 equals square root of 4p times 1 plus 2p over 2 pi"
                            fontSize={24}
                          />

                          <span>,</span>

                          <RiemannBranchEquationSvg
                            src="/equations/p_equation.svg"
                            alt="definition of p"
                            fontSize={
                              24 * 28 / 18
                            }
                            translateY={3}
                          />
                        </span>

                        <strong
                          style={{
                            color:
                              'rgba(245, 239, 224, 0.94)',
                            fontFamily:
                              '"Times New Roman", Times, serif',
                            fontSize: '16px',
                            fontWeight: 400,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {
                            BRANCH_A
                              .toPrecision(15)
                          }
                        </strong>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns:
                            'minmax(0, 1fr) max-content',
                          alignItems: 'center',
                          columnGap: '16px',
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'baseline',
                            gap: '0.24em',
                            whiteSpace: 'nowrap',
                            color:
                              'rgba(232, 223, 200, 0.78)',
                          }}
                        >
                          <RiemannBranchEquationSvg
                            src="/equations/b_1_equation.svg"
                            alt="b1 equals square root of 4q times 1 minus 2q over 2 pi"
                            fontSize={24}
                          />

                          <span>,</span>

                          <RiemannBranchEquationSvg
                            src="/equations/q_equation.svg"
                            alt="definition of q"
                            fontSize={
                              24 * 28 / 18
                            }
                            translateY={3}
                          />
                        </span>

                        <strong
                          style={{
                            color:
                              'rgba(245, 239, 224, 0.94)',
                            fontWeight: 400,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'baseline',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <span
                              style={{
                                fontFamily:
                                  '"Times New Roman", Times, serif',
                                fontSize: '16px',
                                fontWeight: 400,
                                color:
                                  'rgba(245, 239, 224, 0.94)',
                              }}
                            >
                              {
                                `0 + ${BRANCH_B.toPrecision(15)}`
                              }
                            </span>

                            <img
                              src="/equations/i.svg"
                              alt="i"
                              style={{
                                display: 'inline-block',
                                height: '12px',
                                width: 'auto',
                                maxWidth: 'none',
                                maxHeight: 'none',
                                marginLeft: '0.24em',
                                transform:
                                  'translateY(-0.02em)',
                                flex: '0 0 auto',
                              }}
                            />
                          </span>
                        </strong>
                      </div>
                    </div>


                  </div>

                </>
              )}

              {mode === 'Möbius transform' && (
                <>
                  <div className={styles.controlSection}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                      }}
                    >
                      <div className={styles.sectionTitle}>
                        Möbius normalization
                      </div>

                      <div
                        style={{
                          marginLeft: 'auto',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <button
                          type="button"
                          className={
                            !mobiusNormalizedContext
                              ? styles.modeButtonActive
                              : styles.modeButton
                          }
                          onClick={() => {
                            setMobiusCatalogView(null);
                            setShowMobiusTraces(false);
                            setMobiusTraceMode('current');

                            if (
                              mobiusNormalizedContext ||
                              mobiusStage !== 0
                            ) {
                              chooseMobiusStage(0);
                              setMobiusNormalizedContext(false);
                            }
                          }}
                          disabled={mobiusAnimating}
                          style={{
                            minWidth: '104px',
                            opacity:
                              mobiusAnimating
                                ? 0.65
                                : 1,
                          }}
                        >
                          Original roots
                        </button>

                        <button
                          type="button"
                          className={
                            mobiusNormalizedContext &&
                            mobiusStage === 7
                              ? styles.modeButtonActive
                              : styles.modeButton
                          }
                          onClick={() => {
                            setMobiusCatalogView(
                              null
                            );

                            /*
                             * chooseMobiusStage() snapshots the
                             * current ORIGINAL context first.
                             *
                             * Then normalized becomes the TARGET.
                             * The existing 900 ms mobiusMix now
                             * moves the whole scene and all roots
                             * together.
                             */
                            chooseMobiusStage(7);
                            setMobiusNormalizedContext(
                              true
                            );
                          }}
                          disabled={mobiusAnimating}
                          style={{
                            minWidth: '104px',
                            opacity:
                              mobiusAnimating
                                ? 0.65
                                : 1,
                          }}
                        >
                          Normalized
                        </button>
                      </div>
                    </div>

                    {/*
                     * ROW 2: trace controls + undo
                     */}
                    <div
                      style={{
                        marginTop: '0px',
                        display: 'grid',
                        gridTemplateColumns:
                          'repeat(5, minmax(0, 1fr))',
                        gap: '8px',
                      }}
                    >
                      <button
                        type="button"
                        className={
                          showMobiusTraces
                            ? styles.modeButtonActive
                            : styles.modeButton
                        }
                        onClick={
                          toggleMobiusTraces
                        }
                      >
                        Traces
                      </button>

                      <button
                        type="button"
                        className={
                          mobiusTraceMode === 'current' &&
                          showMobiusTraces
                            ? styles.modeButtonActive
                            : styles.modeButton
                        }
                        onClick={() => {
                          setMobiusTraceMode(
                            'current'
                          );
                          setShowMobiusTraces(
                            true
                          );
                        }}
                      >
                        Current
                      </button>

                      <button
                        type="button"
                        className={
                          mobiusTraceMode === 'accumulate' &&
                          showMobiusTraces
                            ? styles.modeButtonActive
                            : styles.modeButton
                        }
                        onClick={() => {
                          setMobiusTraceMode(
                            'accumulate'
                          );
                          setShowMobiusTraces(
                            true
                          );
                        }}
                      >
                        Accumulate
                      </button>

                      <button
                        type="button"
                        className={
                          styles.modeButton
                        }
                        onClick={
                          clearMobiusTraces
                        }
                      >
                        Clear traces
                      </button>

                      <button
                        type="button"
                        className={
                          styles.modeButton
                        }
                        onClick={
                          undoMobiusNormalization
                        }
                        disabled={
                          mobiusAnimating ||
                          mobiusHistory.length === 0
                        }
                        style={{
                          opacity:
                            mobiusAnimating ||
                            mobiusHistory.length === 0
                              ? 0.45
                              : 1,
                        }}
                      >
                        Undo
                      </button>
                    </div>

                    {/*
                     * ROW 4: normalization catalogs
                     */}
                    <div
                      style={{
                        marginTop: '0px',
                        display: 'grid',
                        gridTemplateColumns:
                          'repeat(2, minmax(0, 1fr))',
                        gap: '8px',
                      }}
                    >
                      <button
                        type="button"
                        className={
                          mobiusCatalogView === '6'
                            ? styles.modeButtonActive
                            : styles.modeButton
                        }
                        onClick={() => {
                          const opening =
                            mobiusCatalogView !== '6';

                          resetMobiusAssignmentsForCatalog();

                          setMobiusCatalogView(
                            opening
                              ? '6'
                              : null
                          );
                        }}
                      >
                        Unique 6 normalizations
                      </button>

                      <button
                        type="button"
                        className={
                          mobiusCatalogView === '24'
                            ? styles.modeButtonActive
                            : styles.modeButton
                        }
                        onClick={() => {
                          const opening =
                            mobiusCatalogView !== '24';

                          resetMobiusAssignmentsForCatalog();

                          setMobiusCatalogView(
                            opening
                              ? '24'
                              : null
                          );
                        }}
                      >
                        All 24 normalizations
                      </button>
                    </div>

                    {!mobiusCatalogView && (
                    <div
                      style={{
                        marginTop: '10px',
                        display: 'grid',
                        gridTemplateColumns:
                          '0.86fr 0.86fr 0.86fr 1.42fr',
                        gap: '8px',
                      }}
                    >
                      {[
                        {
                          bit: 1,
                          kind: 4,
                          suffix: '→ ∞',
                        },
                        {
                          bit: 2,
                          kind: 3,
                          suffix: '→ 0',
                        },
                        {
                          bit: 4,
                          kind: 2,
                          suffix: '→ 1',
                        },
                      ].map((item) => {
                        const active =
                          mobiusStage < 8 &&
                          (
                            mobiusStage &
                            item.bit
                          ) !== 0;

                        return (
                          <button
                            key={item.bit}
                            type="button"
                            className={
                              active
                                ? styles.modeButtonActive
                                : styles.modeButton
                            }
                            onClick={() =>
                              toggleMobiusConstraint(
                                item.bit
                              )
                            }
                            disabled={mobiusAnimating}
                            style={{
                              minWidth: 0,
                              width: '100%',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.18em',
                              paddingLeft: '5px',
                              paddingRight: '5px',
                              whiteSpace: 'nowrap',
                              opacity:
                                mobiusAnimating
                                  ? 0.65
                                  : 1,
                            }}
                          >
                            <ColoredZheSymbol
                              kind={item.kind}
                              color={
                                ROOT_COLORS[
                                  item.kind - 1
                                ]
                              }
                              size="13px"
                              className={
                                styles.legendStyleZhe
                              }
                            />

                            <span>
                              {item.suffix}
                            </span>
                          </button>
                        );
                      })}


                      {/*
                       * This is NOT a button.
                       *
                       * zhe_1 -> lambda is the consequence of
                       * fixing the three other points.
                       */}
                      <div
                        aria-label="zhe 1 is forced to lambda when fully normalized"
                        title="Consequence of fixing zhe 4, zhe 3, and zhe 2"
                        style={{
                          minWidth: 0,
                          width: '100%',
                          minHeight: '36px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.18em',
                          padding: '0 5px',
                          boxSizing: 'border-box',

                          border:
                            mobiusStage === 7
                              ? '1px solid rgba(232, 223, 200, 0.72)'
                              : '1px dashed rgba(232, 223, 200, 0.28)',

                          borderRadius: '6px',

                          background:
                            mobiusStage === 7
                              ? 'rgba(232, 223, 200, 0.12)'
                              : 'rgba(255, 255, 255, 0.018)',

                          color:
                            mobiusStage === 7
                              ? 'rgba(250, 247, 238, 0.98)'
                              : 'rgba(232, 223, 200, 0.44)',

                          whiteSpace: 'nowrap',
                          cursor: 'default',
                          userSelect: 'none',
                        }}
                      >
                        <ColoredZheSymbol
                          kind={1}
                          color={ROOT_COLORS[0]}
                          size="13px"
                          className={
                            styles.legendStyleZhe
                          }
                        />

                        <span>→ λ</span>

                        <span
                          style={{
                            marginLeft: '0.2em',
                            fontSize: '10px',
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            opacity: 0.72,
                          }}
                        >
                          forced
                        </span>
                      </div>
                    </div>
                    )}

                    {mobiusCatalogView ? (
                      <div
                        style={{
                          marginTop: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                        }}
                      >
                        {(() => {
                          /*
                           * SIX VALUES
                           *
                           * Keep only the six normalizations in
                           * which zhe_1 is the forced point.
                           *
                           * This gives exactly the six permutations
                           * of zhe_4, zhe_3, zhe_2 over
                           *
                           *   0, 1, infinity.
                           */
                          const entries =
                            mobiusCatalogView === '6'
                              ? (
                                  mobiusStory
                                    .catalogEntries
                                    .filter(
                                      (entry) =>
                                        entry.remainingRoot ===
                                        1
                                    )
                                    .sort(
                                      (
                                        left,
                                        right
                                      ) =>
                                        left.groupIndex -
                                        right.groupIndex
                                    )
                                )
                              : (
                                  /*
                                   * 24 NORMALIZATIONS
                                   *
                                   * Group strictly by anharmonic OUTPUT:
                                   *
                                   *   4 -> lambda
                                   *   4 -> lambda'
                                   *   4 -> lambda''
                                   *   4 -> lambda^-1
                                   *   4 -> lambda'^-1
                                   *   4 -> lambda''^-1
                                   */
                                  [
                                    ...mobiusStory
                                      .catalogEntries,
                                  ].sort(
                                    (left, right) =>
                                      left.groupIndex -
                                      right.groupIndex
                                  )
                                );


                          const currentCatalogState =
                            mobiusStory
                              .catalogStageLookup[
                                mobiusStage
                              ];


                          return entries.map(
                            (
                              entry,
                              index
                            ) => {
                              const previous =
                                entries[
                                  index - 1
                                ];

                              const startsOutputGroup =
                                mobiusCatalogView ===
                                  '24' &&
                                index > 0 &&
                                previous.groupIndex !==
                                  entry.groupIndex;

                              /*
                               * SIX VALUES keeps the established
                               * 4,3,2,1 order because zhe_1 is
                               * always the forced point there.
                               *
                               * In the 24 view, place the three
                               * chosen normalization controls first
                               * and the forced root LAST.
                               */
                              const displayRootOrder =
                                mobiusCatalogView === '24'
                                  ? [
                                      4,
                                      3,
                                      2,
                                      1,
                                    ]
                                      .filter(
                                        (rootNumber) =>
                                          rootNumber !==
                                          entry.remainingRoot
                                      )
                                      .concat(
                                        entry.remainingRoot
                                      )
                                  : [
                                      4,
                                      3,
                                      2,
                                      1,
                                    ];


                              return (
                                <div
                                  key={
                                    entry.entryIndex
                                  }
                                  style={{
                                    display:
                                      'flex',
                                    flexDirection:
                                      'column',
                                    gap: '6px',

                                    marginTop:
                                      startsOutputGroup
                                        ? '12px'
                                        : 0,
                                  }}
                                >


                                  {/*
                                   * STANDARDIZED CATALOG ROW:
                                   *
                                   *   three clickable choices
                                   *   followed by one forced result.
                                   *
                                   * All four rows in an output group
                                   * therefore END in the same
                                   * anharmonic value.
                                   */}
                                  <div
                                    style={{
                                      display:
                                        'grid',

                                      gridTemplateColumns:
                                        '0.86fr 0.86fr 0.86fr 1.42fr',

                                      gap: '8px',
                                    }}
                                  >
                                    {displayRootOrder.map(
                                      (
                                        rootNumber
                                      ) => {
                                        const assignment =
                                          entry
                                            .targetByRoot[
                                              rootNumber
                                            ];

                                        const isForced =
                                          rootNumber ===
                                          entry
                                            .remainingRoot;

                                        const activeMask =
                                          currentCatalogState &&
                                          currentCatalogState
                                            .entryIndex ===
                                            entry
                                              .entryIndex
                                            ? (
                                                currentCatalogState
                                                  .mask
                                              )
                                            : 0;

                                        const active =
                                          assignment
                                            ? (
                                                (
                                                  activeMask &
                                                  assignment.bit
                                                ) !== 0
                                              )
                                            : (
                                                activeMask ===
                                                7
                                              );


                                        /*
                                         * FORCED CELL
                                         *
                                         * Not clickable.
                                         */
                                        if (
                                          isForced
                                        ) {
                                          return (
                                            <div
                                              key={
                                                rootNumber
                                              }
                                              style={{
                                                minWidth: 0,
                                                width: '100%',
                                                minHeight: '36px',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '0.18em',
                                                padding: '0 5px',
                                                boxSizing: 'border-box',

                                                border:
                                                  active
                                                    ? '1px solid rgba(232, 223, 200, 0.72)'
                                                    : '1px dashed rgba(232, 223, 200, 0.28)',

                                                borderRadius: '6px',

                                                background:
                                                  active
                                                    ? 'rgba(232, 223, 200, 0.12)'
                                                    : 'rgba(255, 255, 255, 0.018)',

                                                opacity:
                                                  active
                                                    ? 1
                                                    : 0.5,

                                                whiteSpace: 'nowrap',
                                                cursor: 'default',
                                                userSelect: 'none',
                                              }}
                                            >
                                              <ColoredZheSymbol
                                                kind={
                                                  rootNumber
                                                }
                                                color={
                                                  ROOT_COLORS[
                                                    rootNumber -
                                                    1
                                                  ]
                                                }
                                                size="12px"
                                              />

                                              <span>
                                                →
                                              </span>

                                              <AnharmonicLambdaSymbol
                                                index={
                                                  entry
                                                    .groupIndex
                                                }
                                                color={
                                                  ANHARMONIC_COLORS[
                                                    entry
                                                      .groupIndex
                                                  ]
                                                }
                                                size={
                                                  12
                                                }
                                              />

                                              <span
                                                style={{
                                                  marginLeft: '0.22em',
                                                  fontSize: '9px',
                                                  letterSpacing: '0.04em',
                                                  textTransform: 'uppercase',
                                                  opacity: 0.72,
                                                }}
                                              >
                                                forced
                                              </span>
                                            </div>
                                          );
                                        }


                                        /*
                                         * ACTUAL NORMALIZATION STEP
                                         *
                                         * Independently clickable.
                                         */
                                        return (
                                          <button
                                            key={
                                              rootNumber
                                            }
                                            type="button"
                                            className={
                                              active
                                                ? (
                                                    styles
                                                      .modeButtonActive
                                                  )
                                                : (
                                                    styles
                                                      .modeButton
                                                  )
                                            }
                                            onClick={() =>
                                              toggleMobiusCatalogConstraint(
                                                entry,
                                                assignment
                                                  .bit
                                              )
                                            }
                                            disabled={
                                              mobiusAnimating
                                            }
                                            style={{
                                              minWidth: 0,
                                              width: '100%',
                                              minHeight: '36px',
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              gap: '0.18em',
                                              paddingLeft: '5px',
                                              paddingRight: '5px',
                                              whiteSpace: 'nowrap',
                                              opacity:
                                                mobiusAnimating
                                                  ? 0.65
                                                  : 1,
                                            }}
                                          >
                                            <ColoredZheSymbol
                                              kind={
                                                rootNumber
                                              }
                                              color={
                                                ROOT_COLORS[
                                                  rootNumber -
                                                  1
                                                ]
                                              }
                                              size="12px"
                                            />

                                            <span>
                                              →
                                              {
                                                assignment.target
                                              }
                                            </span>
                                          </button>
                                        );
                                      }
                                    )}
                                  </div>
                                </div>
                              );
                            }
                          );
                        })()}
                      </div>
                    ) : (
                    <div
                      style={{
                        marginTop: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'stretch',
                        gap: '9px',
                      }}
                    >
                      <div
                        style={{
                          textAlign: 'center',
                          fontSize: '14px',
                          lineHeight: 1.3,
                          color:
                            'rgba(232, 223, 200, 0.86)',
                        }}
                      >
                        <MobiusPanelText
                          text={
                            mobiusNormalizedContext &&
                            mobiusStage === 0
                              ? 'Normalized roots — no assignments yet'
                              : mobiusStory.titles[
                                  mobiusStage
                                ]
                          }
                        />
                      </div>

                      {mobiusStage === 0 ? (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            lineHeight: 1,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <MathInline
                            className={styles.rootValueMath}
                            latex="("
                          />

                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              transform:
                                'translateY(2.25px)',
                            }}
                          >
                            <ColoredZheSymbol
                              kind={1}
                              color={ROOT_COLORS[0]}
                              className={styles.legendStyleZhe}
                            />
                          </span>

                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              transform:
                                'translateY(2.25px)',
                            }}
                          >
                            <MathInline
                              className={styles.rootValueMath}
                              latex=","
                            />
                          </span>

                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              transform:
                                'translateY(2.25px)',
                            }}
                          >
                            <ColoredZheSymbol
                              kind={2}
                              color={ROOT_COLORS[1]}
                              className={styles.legendStyleZhe}
                            />
                          </span>

                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              transform:
                                'translateY(2.25px)',
                            }}
                          >
                            <MathInline
                              className={styles.rootValueMath}
                              latex=","
                            />
                          </span>

                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              transform:
                                'translateY(2.25px)',
                            }}
                          >
                            <ColoredZheSymbol
                              kind={3}
                              color={ROOT_COLORS[2]}
                              className={styles.legendStyleZhe}
                            />
                          </span>

                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              transform:
                                'translateY(2.25px)',
                            }}
                          >
                            <MathInline
                              className={styles.rootValueMath}
                              latex=","
                            />
                          </span>

                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              transform:
                                'translateY(2.25px)',
                            }}
                          >
                            <ColoredZheSymbol
                              kind={4}
                              color={ROOT_COLORS[3]}
                              className={styles.legendStyleZhe}
                            />
                          </span>

                          <MathInline
                            className={styles.rootValueMath}
                            latex=")"
                          />
                        </div>
                      ) : (
                        mobiusStage <= 7 ? (
                          <MobiusPanelFormula
                            stage={
                              mobiusStage
                            }
                          />
                        ) : (
                          <MathDisplay
                            latex={
                              mobiusStory.formulaTop[
                                mobiusStage
                              ]
                            }
                          />
                        )
                      )}

                      <div
                        style={{
                          padding: '0 2px',
                          fontSize: '14px',
                          lineHeight: 1.45,
                          color:
                            'rgba(232, 223, 200, 0.84)',
                        }}
                      >
                        <MobiusPanelText
                          text={
                            mobiusStory.explanation[
                              mobiusStage
                            ]
                          }
                        />
                      </div>
                    </div>
                    )}
                  </div>
                </>
              )}

              {/*
               * PERMANENT_CROSS_RATIO_ANHARMONIC_CONTROL
               *
               * This controls the full six-value anharmonic
               * visualization:
               *   - second unit circle
               *   - x = 1/2 guide line
               *   - all six anharmonic cross-ratio values
               *
               * Keep this independent of view-navigation UI.
               */}

              {mode === 'Cross-ratio' && (
                <>
                  <div className={styles.controlSection}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '16px',
                        width: '100%',
                      }}
                    >
                      <div
                        className={styles.sectionTitle}
                        style={{
                          margin: 0,
                        }}
                      >
                        Cross-ratio readouts
                      </div>

                      <div
                        style={{
                          flex: '0 0 auto',
                          marginLeft: 'auto',
                          width: '140px',
                        }}
                      >
                        <button
                          type="button"
                          className={
                            showAnharmonicValues
                              ? styles.modeButtonActive
                              : styles.modeButton
                          }
                          onClick={() =>
                            setShowAnharmonicValues(
                              (value) => !value
                            )
                          }
                          style={{
                            width: '100%',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          6 anharmonic values
                        </button>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        gap: '10px',
                        width: '100%',
                        marginTop: '-12px',
                        fontSize:
                          'var(--quartic-math-size, 14px)',
                        lineHeight: 1.25,
                        whiteSpace: 'nowrap',
                        overflowX: 'auto',
                        overflowY: 'hidden',
                        color:
                          'rgba(245, 239, 224, 0.96)',
                      }}
                    >
                      {/* definition + unit-circle condition */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          justifyContent: 'space-between',
                          gap: '28px',
                          width: '100%',
                          marginBottom: '4px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <div
                          style={{
                            flex: '0 0 auto',
                            display: 'flex',
                            alignItems: 'center',
                            whiteSpace: 'nowrap',
                            transform:
                              'translateY(12px)',
                          }}
                        >
                          <img
                            src="/equations/cross-ratio.svg"
                            alt="Cross-ratio equation"
                            style={{
                              display: 'block',
                              width: '230px',
                              height: 'auto',
                              maxWidth: '100%',
                            }}
                          />
                        </div>

                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            whiteSpace: 'nowrap',
                            gap: '0.08em',
                            transform:
                              'translateY(-8px)',
                          }}
                        >
                          <MathInline
                            className={styles.rootValueMath}
                            latex={String.raw`|a| > a^\dagger \Longrightarrow |`}
                          />

                          <LambdaSymbol
                            size={14}
                          />

                          <MathInline
                            className={styles.rootValueMath}
                            latex={String.raw`| = 1`}
                          />
                        </div>
                      </div>

                      <div
                        style={{
                          width: '100%',
                          height: '1px',
                          margin: '4px 0',
                          background:
                            'rgba(245, 239, 224, 0.12)',
                        }}
                      />

                      {showAnharmonicValues ? (
                        <>
                          {/* six anharmonic values */}
                          {anharmonicReadouts.map(
                            (item, index) => (
                              <div
                                key={item.key}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.42em',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.02em',
                                    color:
                                      ANHARMONIC_COLORS[index],
                                  }}
                                >
                                  <ColoredLambdaSymbol
                                    color={
                                      ANHARMONIC_COLORS[index]
                                    }
                                    size={14}
                                  />

                                  {index === 1 && (
                                    <MathInline
                                      className={
                                        styles.rootValueMath
                                      }
                                      latex="'"
                                    />
                                  )}

                                  {index === 2 && (
                                    <MathInline
                                      className={
                                        styles.rootValueMath
                                      }
                                      latex="''"
                                    />
                                  )}

                                  {index === 3 && (
                                    <MathInline
                                      className={
                                        styles.rootValueMath
                                      }
                                      latex="^{-1}"
                                    />
                                  )}

                                  {index === 4 && (
                                    <MathInline
                                      className={
                                        styles.rootValueMath
                                      }
                                      latex="'^{-1}"
                                    />
                                  )}

                                  {index === 5 && (
                                    <MathInline
                                      className={
                                        styles.rootValueMath
                                      }
                                      latex="''^{-1}"
                                    />
                                  )}
                                </span>

                                {asymptoticEnd !== 0 ? (
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.28em',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    <MathInline
                                      className={
                                        styles.rootValueMath
                                      }
                                      latex="="
                                    />

                                    <img
                                      src="/equations/imaginary_golden_ratio_symbol.svg"
                                      alt="imaginary golden ratio"
                                      style={{
                                        display: 'block',
                                        height: '1em',
                                        width: 'auto',
                                      }}
                                    />

                                    {index >= 3 && (
                                      <MathInline
                                        className={
                                          styles.rootValueMath
                                        }
                                        latex="^{-1}"
                                      />
                                    )}
                                  </span>
                                ) : (
                                  <MathInline
                                    className={
                                      styles.rootValueMath
                                    }
                                    latex={
                                      item.value
                                        ? `= ${complexCrossRatioLatex(
                                            item.value
                                          )}`
                                        : String.raw`= \infty`
                                    }
                                  />
                                )}
                              </div>
                            )
                          )}

                          <div
                            style={{
                              width: '100%',
                              height: '1px',
                              margin: '4px 0',
                              background:
                                'rgba(245, 239, 224, 0.12)',
                            }}
                          />

                          {/* magnitudes */}
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.08em',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <MathInline
                              className={styles.rootValueMath}
                              latex="|"
                            />

                            <LambdaSymbol size={14} />

                            <MathInline
                              className={styles.rootValueMath}
                              latex={`| = ${formatCrossRatio15(
                                crossRatioDisplay.modulus
                              )}`}
                            />
                          </div>

                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.08em',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <MathInline
                              className={styles.rootValueMath}
                              latex="|"
                            />

                            <LambdaSymbol size={14} />

                            <MathInline
                              className={styles.rootValueMath}
                              latex={`'| = ${formatCrossRatio15(
                                Math.hypot(
                                  crossRatioDisplay.zPrime.re,
                                  crossRatioDisplay.zPrime.im
                                )
                              )}`}
                            />
                          </div>

                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.08em',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <MathInline
                              className={styles.rootValueMath}
                              latex="|"
                            />

                            <LambdaSymbol size={14} />

                            <MathInline
                              className={styles.rootValueMath}
                              latex={`''| = ${formatCrossRatio15(
                                Math.hypot(
                                  crossRatioDisplay.zDoublePrime.re,
                                  crossRatioDisplay.zDoublePrime.im
                                )
                              )}`}
                            />
                          </div>

                          <div
                            style={{
                              width: '100%',
                              height: '1px',
                              margin: '4px 0',
                              background:
                                'rgba(245, 239, 224, 0.12)',
                            }}
                          />

                          {/* arguments */}
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.08em',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <MathInline
                              className={styles.rootValueMath}
                              latex={String.raw`\arg(`}
                            />

                            <LambdaSymbol size={14} />

                            <MathInline
                              className={styles.rootValueMath}
                              latex={`) = ${formatCrossRatioAngleLatex(
                                crossRatioDisplay.theta
                              )}\\;\\mathrm{radians}`}
                            />
                          </div>

                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.08em',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <MathInline
                              className={styles.rootValueMath}
                              latex={String.raw`\arg(`}
                            />

                            <LambdaSymbol size={14} />

                            <MathInline
                              className={styles.rootValueMath}
                              latex={`') = ${formatCrossRatioAngleLatex(
                                Math.abs(
                                  Math.atan2(
                                    crossRatioDisplay.zPrime.im,
                                    crossRatioDisplay.zPrime.re
                                  )
                                ) < 1e-12
                                  ? 0
                                  : Math.atan2(
                                      crossRatioDisplay.zPrime.im,
                                      crossRatioDisplay.zPrime.re
                                    )
                              )}\\;\\mathrm{radians}`}
                            />
                          </div>

                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.08em',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <MathInline
                              className={styles.rootValueMath}
                              latex={String.raw`\arg(`}
                            />

                            <LambdaSymbol size={14} />

                            <MathInline
                              className={styles.rootValueMath}
                              latex={`'') = ${formatCrossRatioAngleLatex(
                                Math.abs(
                                  Math.atan2(
                                    crossRatioDisplay.zDoublePrime.im,
                                    crossRatioDisplay.zDoublePrime.re
                                  )
                                ) < 1e-12
                                  ? 0
                                  : Math.atan2(
                                      crossRatioDisplay.zDoublePrime.im,
                                      crossRatioDisplay.zDoublePrime.re
                                    )
                              )}\\;\\mathrm{radians}`}
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          {/* default: lambda, magnitude, argument */}
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.16em',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <LambdaSymbol size={14} />

                            {asymptoticEnd !== 0 ? (
                              <>
                                <MathInline
                                  className={styles.rootValueMath}
                                  latex="="
                                />

                                <img
                                  src="/equations/imaginary_golden_ratio_symbol.svg"
                                  alt="imaginary golden ratio"
                                  style={{
                                    display: 'block',
                                    height: '1em',
                                    width: 'auto',
                                  }}
                                />
                              </>
                            ) : Math.abs(a) < 1e-12 ? (
                              <MathInline
                                className={styles.rootValueMath}
                                latex={
                                  String.raw`(0) = \tanh\!\left(\frac14\log\frac{4\pi}{8}\right)`
                                }
                              />
                            ) : (
                              <MathInline
                                className={styles.rootValueMath}
                                latex={`= ${complexCrossRatioLatex(
                                  crossRatioDisplay.z
                                )}`}
                              />
                            )}
                          </div>

                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.08em',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <MathInline
                              className={styles.rootValueMath}
                              latex="|"
                            />

                            <LambdaSymbol size={14} />

                            <MathInline
                              className={styles.rootValueMath}
                              latex={`| = ${formatCrossRatio15(
                                crossRatioDisplay.modulus
                              )}`}
                            />
                          </div>

                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.08em',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <MathInline
                              className={styles.rootValueMath}
                              latex={String.raw`\arg(`}
                            />

                            <LambdaSymbol size={14} />

                            <MathInline
                              className={styles.rootValueMath}
                              latex={`) = ${formatCrossRatioAngleLatex(
                                crossRatioDisplay.theta
                              )}\\;\\mathrm{radians}`}
                            />
                          </div>
                        </>
                      )}

                    </div>
                  </div>
                </>
              )}

              {mode === 'Root magnitudes' && (
                <div
                  style={{
                    position: 'absolute',
                    left: '18px',
                    right: '18px',
                    bottom:
                      `${rootsComplexReadoutBottom + 172}px`,
                    display: 'flex',
                    gap: '7px',
                    zIndex: 7,
                    pointerEvents: 'auto',
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setRootMagnitudeSignedRadial(
                        true
                      )
                    }
                    style={{
                      border:
                        '1px solid rgba(232,223,200,0.55)',
                      borderRadius: '5px',
                      padding:
                        '5px 10px',
                      background:
                        rootMagnitudeSignedRadial
                          ? 'rgba(232,223,200,0.18)'
                          : 'rgba(0,0,0,0.24)',
                      color:
                        rootMagnitudeSignedRadial
                          ? 'rgba(250,247,238,0.98)'
                          : 'rgba(232,223,200,0.60)',
                      cursor: 'pointer',
                    }}
                  >
                    Signed radial magnitude
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setRootMagnitudeSignedRadial(
                        false
                      )
                    }
                    style={{
                      border:
                        '1px solid rgba(232,223,200,0.55)',
                      borderRadius: '5px',
                      padding:
                        '5px 10px',
                      background:
                        !rootMagnitudeSignedRadial
                          ? 'rgba(232,223,200,0.18)'
                          : 'rgba(0,0,0,0.24)',
                      color:
                        !rootMagnitudeSignedRadial
                          ? 'rgba(250,247,238,0.98)'
                          : 'rgba(232,223,200,0.60)',
                      cursor: 'pointer',
                    }}
                  >
                    Log of magnitude
                  </button>
                </div>
              )}

              {mode === 'Root magnitudes' && (
                <div
                  style={{
                    position: 'absolute',
                    left: '18px',
                    right: '18px',
                    bottom:
                      `${rootsComplexReadoutBottom}px`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '8px',
                    width: 'max-content',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'auto',
                    zIndex: 5,
                  }}
                >
                  {rootMagnitudeTrackedCurrentModuli.map(
                    (
                      value,
                      index
                    ) => (
                      <div
                        key={
                          `root-magnitude-control-readout-${index}`
                        }
                        className={
                          styles.mathEquationRow
                        }
                        style={{
                          display:
                            'flex',
                          alignItems:
                            'center',
                          gap:
                            '0.16em',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setRootMagnitudeVisible(
                              (previous) =>
                                previous.map(
                                  (
                                    visible,
                                    itemIndex
                                  ) =>
                                    itemIndex ===
                                    index
                                      ? !visible
                                      : visible
                                )
                            )
                          }
                          aria-pressed={
                            rootMagnitudeVisible[
                              index
                            ]
                          }
                          aria-label={
                            `${
                              rootMagnitudeVisible[
                                index
                              ]
                                ? 'Hide'
                                : 'Show'
                            } root ${index + 1} ${
                              rootMagnitudeSignedRadial
                                ? 'signed radial'
                                : 'magnitude'
                            } trace`
                          }
                          style={{
                            appearance: 'none',
                            border: 'none',
                            padding: 0,
                            margin: 0,
                            background: 'none',
                            display:
                              'inline-flex',
                            alignItems:
                              'center',
                            color:
                              rootMagnitudeVisible[
                                index
                              ]
                                ? ROOT_COLORS[
                                    index
                                  ]
                                : 'rgba(170, 170, 170, 0.72)',
                            cursor: 'pointer',
                            font: 'inherit',
                          }}
                        >
                          {rootMagnitudeSignedRadial ? (
                            <>
                              <MathInline
                                className={
                                  styles.rootValueMath
                                }
                                latex={
                                  String.raw`\rho_s(`
                                }
                              />

                              <span
                                style={{
                                  display:
                                    'inline-flex',
                                  alignItems:
                                    'center',
                                  transform:
                                    `translateY(${rootsComplexZheYOffset}px)`,
                                }}
                              >
                                <ColoredZheSymbol
                                  kind={
                                    index +
                                    1
                                  }
                                  color={
                                    rootMagnitudeVisible[
                                      index
                                    ]
                                      ? ROOT_COLORS[
                                          index
                                        ]
                                      : 'rgba(170, 170, 170, 0.72)'
                                  }
                                  className={
                                    styles.legendStyleZhe
                                  }
                                />
                              </span>

                              <MathInline
                                className={
                                  styles.rootValueMath
                                }
                                latex=")"
                              />
                            </>
                          ) : (
                            <>
                              <MathInline
                                className={
                                  styles.rootValueMath
                                }
                                latex={
                                  String.raw`\log\lvert`
                                }
                              />

                              <span
                                style={{
                                  display:
                                    'inline-flex',
                                  alignItems:
                                    'center',
                                  transform:
                                    `translateY(${rootsComplexZheYOffset}px)`,
                                }}
                              >
                                <ColoredZheSymbol
                                  kind={
                                    index +
                                    1
                                  }
                                  color={
                                    rootMagnitudeVisible[
                                      index
                                    ]
                                      ? ROOT_COLORS[
                                          index
                                        ]
                                      : 'rgba(170, 170, 170, 0.72)'
                                  }
                                  className={
                                    styles.legendStyleZhe
                                  }
                                />
                              </span>

                              <MathInline
                                className={
                                  styles.rootValueMath
                                }
                                latex={
                                  String.raw`\rvert`
                                }
                              />
                            </>
                          )}
                        </button>

                        {rootMagnitudeSignedRadial &&
                        Math.abs(
                          a - PHYSICAL_A
                        ) < 1e-12 ? (
                          <span
                            style={{
                              display:
                                'inline-flex',
                              alignItems:
                                'center',
                              gap:
                                '0.12em',
                            }}
                          >
                            <MathInline
                              className={
                                styles.rootValueMath
                              }
                              latex="="
                            />

                            {index === 3 && (
                              <MathInline
                                className={
                                  styles.rootValueMath
                                }
                                latex="-"
                              />
                            )}

                            <span
                              style={{
                                display:
                                  'inline-flex',
                                alignItems:
                                  'center',
                                marginLeft:
                                  '0.22em',
                                transform:
                                  'translateY(3px)',
                              }}
                            >
                              <ZheSymbol
                                kind={
                                  index === 0
                                    ? 1
                                    : index === 1
                                      ? 2
                                      : 'r'
                                }
                                size="17px"
                                className={
                                  styles.legendStyleZhe
                                }
                              />
                            </span>
                          </span>
                        ) : (
                          <MathInline
                            className={
                              styles.rootValueMath
                            }
                            latex={
                              rootMagnitudeSignedRadial
                                ? rootSignedRadialLatex(
                                    index
                                  )
                                : rootLogMagnitudeLatex(
                                    index
                                  )
                            }
                          />
                        )}
                      </div>
                    )
                  )}

                </div>
              )}

              {mode === 'Root angles' && (
                <div
                  style={{
                    position: 'absolute',
                    left: '18px',
                    right: '18px',
                    bottom:
                      `${rootsComplexReadoutBottom}px`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '8px',
                    width: 'max-content',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    zIndex: 5,
                  }}
                >
                  {rootsPolarArgs.map(
                    (value, index) => (
                      <div
                        key={`root-angle-control-readout-${index}`}
                        className={styles.mathEquationRow}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.16em',
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            color:
                              ROOT_COLORS[index],
                          }}
                        >
                          <MathInline
                            className={styles.rootValueMath}
                            latex={String.raw`\arg(`}
                          />

                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              transform:
                                `translateY(${rootsComplexZheYOffset}px)`,
                            }}
                          >
                            <ColoredZheSymbol
                              kind={index + 1}
                              color={ROOT_COLORS[index]}
                              className={styles.legendStyleZhe}
                            />
                          </span>

                          <MathInline
                            className={styles.rootValueMath}
                            latex=")"
                          />
                        </span>

                        {Math.abs(
                          a - PHYSICAL_A
                        ) < 1e-12 ? (
                          index < 2 ? (
                            <MathInline
                              className={
                                styles.rootValueMath
                              }
                              latex={
                                String.raw`= \;0\;\text{radians}`
                              }
                            />
                          ) : (
                            <span
                              style={{
                                display:
                                  'inline-flex',
                                alignItems:
                                  'center',
                                whiteSpace:
                                  'nowrap',
                              }}
                            >
                              <MathInline
                                className={
                                  styles.rootValueMath
                                }
                                latex="="
                              />

                              <span
                                style={{
                                  display:
                                    'inline-flex',
                                  alignItems:
                                    'center',
                                  marginLeft:
                                    index === 2
                                      ? '0.34em'
                                      : '0.22em',
                                }}
                              >
                                {index === 3 && (
                                  <MathInline
                                    className={
                                      styles.rootValueMath
                                    }
                                    latex="-"
                                  />
                                )}

                                <span
                                  style={{
                                    display:
                                      'inline-flex',
                                    alignItems:
                                      'center',
                                    transform:
                                      `translateY(${rootsComplexZheYOffset}px)`,
                                  }}
                                >
                                  <ZheSymbol
                                    kind="theta"
                                    size="17px"
                                    className={
                                      styles.legendStyleZhe
                                    }
                                  />
                                </span>
                              </span>

                              <MathInline
                                className={
                                  styles.rootValueMath
                                }
                                latex={
                                  String.raw`\;\text{radians}`
                                }
                              />
                            </span>
                          )
                        ) : (
                          <MathInline
                            className={
                              styles.rootValueMath
                            }
                            latex={
                              rootsPolarArgLatex(
                                index
                              ).replace(
                                /^\)/,
                                ''
                              )
                            }
                          />
                        )}
                      </div>
                    )
                  )}
                </div>
              )}

              {/*
               * PERMANENT_ROOTS_CIRCLE_CONTROLS
               *
               * Do not nest this inside navigation controls.
               * These are persistent Roots-view geometry controls.
               */}
              {mode === 'Roots' && (
                <>
                  {(
                      <div
                        style={{
                          position: 'absolute',
                          left: '18px',
                          right: '18px',
                          bottom:
                            `${rootsComplexReadoutBottom}px`,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          gap: '8px',
                          width: 'max-content',
                          whiteSpace: 'nowrap',
                          pointerEvents: 'none',
                          zIndex: 5,
                        }}
                      >
                        {rootsPolarArgs.map(
                          (value, index) => (
                            <div
                              key={`root-arg-${index}`}
                              className={styles.mathEquationRow}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.16em',
                              }}
                            >
                              <MathInline
                                className={styles.rootValueMath}
                                latex={String.raw`\arg(`}
                              />

                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  transform:
                                    `translateY(${rootsComplexZheYOffset}px)`,
                                }}
                              >
                                <ColoredZheSymbol
                                  kind={index + 1}
                                  color={ROOT_COLORS[index]}
                                  className={styles.legendStyleZhe}
                                />
                              </span>

                              {Math.abs(
                                a - PHYSICAL_A
                              ) < 1e-12 ? (
                                index < 2 ? (
                                  <MathInline
                                    className={
                                      styles.rootValueMath
                                    }
                                    latex={
                                      String.raw`) = \;0\;\text{radians}`
                                    }
                                  />
                                ) : (
                                  <span
                                    style={{
                                      display:
                                        'inline-flex',
                                      alignItems:
                                        'center',
                                      whiteSpace:
                                        'nowrap',
                                    }}
                                  >
                                    <MathInline
                                      className={
                                        styles.rootValueMath
                                      }
                                      latex=") ="
                                    />

                                    <span
                                      style={{
                                        display:
                                          'inline-flex',
                                        alignItems:
                                          'center',
                                        marginLeft:
                                          index === 2
                                            ? '0.34em'
                                            : '0.22em',
                                      }}
                                    >
                                      {index === 3 && (
                                        <MathInline
                                          className={
                                            styles.rootValueMath
                                          }
                                          latex="-"
                                        />
                                      )}

                                      <span
                                        style={{
                                          display:
                                            'inline-flex',
                                          alignItems:
                                            'center',
                                          transform:
                                            `translateY(${rootsComplexZheYOffset}px)`,
                                        }}
                                      >
                                        <ZheSymbol
                                          kind="theta"
                                          size="17px"
                                          className={
                                            styles.legendStyleZhe
                                          }
                                        />
                                      </span>
                                    </span>

                                    <MathInline
                                      className={
                                        styles.rootValueMath
                                      }
                                      latex={
                                        String.raw`\;\text{radians}`
                                      }
                                    />
                                  </span>
                                )
                              ) : (
                                <MathInline
                                  className={
                                    styles.rootValueMath
                                  }
                                  latex={
                                    rootsPolarArgLatex(
                                      index
                                    )
                                  }
                                />
                              )}
                            </div>
                          )
                        )}

                        {rootsPolarModuli.map(
                          (value, index) => (
                            <div
                              key={`root-modulus-${index}`}
                              className={styles.mathEquationRow}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.16em',
                                marginTop:
                                  index === 0
                                    ? '6px'
                                    : 0,
                              }}
                            >
                              <MathInline
                                className={styles.rootValueMath}
                                latex="|"
                              />

                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  transform:
                                    `translateY(${rootsComplexZheYOffset}px)`,
                                }}
                              >
                                <ColoredZheSymbol
                                  kind={index + 1}
                                  color={ROOT_COLORS[index]}
                                  className={styles.legendStyleZhe}
                                />
                              </span>

                              {Math.abs(
                                a - PHYSICAL_A
                              ) < 1e-12 ? (
                                <span
                                  style={{
                                    display:
                                      'inline-flex',
                                    alignItems:
                                      'center',
                                    whiteSpace:
                                      'nowrap',
                                  }}
                                >
                                  <MathInline
                                    className={
                                      styles.rootValueMath
                                    }
                                    latex="| ="
                                  />

                                  <span
                                    style={{
                                      display:
                                        'inline-flex',
                                      alignItems:
                                        'center',
                                      marginLeft:
                                        '0.34em',
                                      transform:
                                        'translateY(3px)',
                                    }}
                                  >
                                    <ZheSymbol
                                      kind={
                                        index === 0
                                          ? 1
                                          : index === 1
                                            ? 2
                                            : 'r'
                                      }
                                      size="17px"
                                      className={
                                        styles.legendStyleZhe
                                      }
                                    />
                                  </span>
                                </span>
                              ) : (
                                <MathInline
                                  className={
                                    styles.rootValueMath
                                  }
                                  latex={
                                    rootsPolarModulusLatex(
                                      index
                                    )
                                  }
                                />
                              )}
                            </div>
                          )
                        )}
                      </div>
                    )}
                </>
              )}



            </aside>
          </div>
        </main>
      </div>
    </PageShell>
  );
}
