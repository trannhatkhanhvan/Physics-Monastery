'use client';

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import katex from 'katex';

import {
  MONODROMY_A_STAR,
  MONODROMY_B_STAR,
  MONODROMY_BASEPOINT,
  MONODROMY_BRANCHES,
  buildMonodromyTrajectory,
  compareTransportedRoots,
  formatComplex,
  permutationCycleNotation,
  transportRootsAlongSegment,
} from './math/monodromy';

import { createPortal } from 'react-dom';

import styles from
  './MonodromyStage.module.css';

import MonodromyBraid3D from
  './MonodromyBraid3D';

import RiemannSurfaceViewer from
  './RiemannSurfaceViewer';



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


const BRANCH_EQUATION_FONT_SIZE =
  18;


function BranchEquationSvg({
  src,
  alt,
  fontSize = BRANCH_EQUATION_FONT_SIZE,
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

          /*
           * Typography-driven sizing:
           * 1em means the SVG is controlled entirely by
           * BRANCH_EQUATION_FONT_SIZE above.
           */
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


function ASymbol({
  className = '',
}) {
  return (
    <span
      className={className}
      role="img"
      aria-label="a"
      style={{
        display: 'inline-block',

        position: 'relative',

        top:
          '1px',

        fontSize:
          '0.78em',

        width: '0.72em',
        height: '1em',

        flex: '0 0 auto',

        backgroundColor:
          'currentColor',

        WebkitMaskImage:
          'url("/equations/a_symbol.svg")',

        maskImage:
          'url("/equations/a_symbol.svg")',

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

        verticalAlign:
          '-0.08em',
      }}
    />
  );
}


const ZHE_ASSETS = {
  1: '/equations/zhe_1.svg',
  2: '/equations/zhe_2.svg',
  3: '/equations/zhe_3.svg',
  4: '/equations/zhe_4.svg',
};


function ColoredZheSymbol({
  kind,
  color,
  size = 'var(--quartic-symbol-size, 14px)',
  className = '',
}) {
  const src =
    ZHE_ASSETS[kind];

  return (
    <span
      className={className}
      aria-label={`zhe ${kind}`}
      style={{
        display: 'inline-block',

        width:
          `calc(${size} * 1.55)`,

        height: size,

        flex:
          '0 0 auto',

        backgroundColor:
          color,

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


/*
 * EXACT numerical formatting rule used by the Roots view:
 *
 *   - 15 significant digits
 *   - magnitude of Im used separately
 *   - explicit + / - operator
 *
 * This prevents the sign from being embedded incorrectly
 * in the imaginary coefficient.
 */
function monodromyRootLatex(root) {
  const imaginary =
    Math.abs(root.im);

  const hasImaginary =
    imaginary > 1e-10;

  if (hasImaginary) {
    return (
      root.im < 0
        ? (
            `= ${root.re.toPrecision(15)}` +
            ` - ${imaginary.toPrecision(15)}\\, i`
          )
        : (
            `= ${root.re.toPrecision(15)}` +
            ` + ${imaginary.toPrecision(15)}\\, i`
          )
    );
  }

  return (
    `= ${root.re.toPrecision(15)}`
  );
}


const ROOT_COLORS = [
  '#ff4040',
  '#ffe600',
  '#47d16c',
  '#2f8cff',
];

const ROOT_LABELS = [
  'ж₁',
  'ж₂',
  'ж₃',
  'ж₄',
];


const ROOT_READOUT_GAP_PX =
  8;

const ROOT_VIEW_ZOOM_MIN_STEP =
  -2;

const ROOT_VIEW_ZOOM_MAX_STEP =
  10;

const SVG = {
  width: 700,
  height: 470,

  left: 58,
  right: 674,
  top: 24,
  bottom: 430,
};

const SVG_ASPECT =
  (
    SVG.right -
    SVG.left
  ) /
  (
    SVG.bottom -
    SVG.top
  );


const FREE_PARAMETER_BOUNDS = {
  minRe: -4.25,
  maxRe: 13.75,
  minIm: -5.935,
  maxIm: 5.935,
};


const PARAMETER_PLANE_SCALE =
  1.25;


/*
 * Mouse-drawn paths may approach the actual parameter-
 * plane frame.  This replaces the old inner-plot clamp.
 */
const PARAMETER_DRAG_EDGE_MARGIN =
  6;


const BRANCH_LABEL_FONT_SIZE = 12;


const BRANCH_TOOLTIPS = {
  'plus-real': {
    title: 'a₁',
    lines: [
      'Positive real branch value',
      'Two roots coalesce here',
      'Double root: x ≈ 0.859735116',
    ],
  },

  'minus-real': {
    title: '−a₁',
    lines: [
      'Negative real branch value',
      'Two roots coalesce here',
      'Double root: x ≈ −0.859735116',
    ],
  },

  'plus-imaginary': {
    title: 'b₁',
    lines: [
      'Upper imaginary branch value',
      'Two roots coalesce here',
      'Double root: x ≈ 1.683312084i',
    ],
  },

  'minus-imaginary': {
    title: '−b₁',
    lines: [
      'Lower imaginary branch value',
      'Two roots coalesce here',
      'Double root: x ≈ −1.683312084i',
    ],
  },
};


function distance(
  left,
  right
) {
  return Math.hypot(
    left.re - right.re,
    left.im - right.im
  );
}


function bestReadoutSlotAssignment(
  currentRoots,
  initialRoots
) {
  if (
    !currentRoots ||
    !initialRoots ||
    currentRoots.length !== 4 ||
    initialRoots.length !== 4
  ) {
    return [
      0,
      1,
      2,
      3,
    ];
  }

  let bestCost =
    Infinity;

  let bestSlots = [
    0,
    1,
    2,
    3,
  ];

  const candidateSlots =
    new Array(4);

  const usedSlots = [
    false,
    false,
    false,
    false,
  ];

  function search(
    identityIndex,
    accumulatedCost
  ) {
    if (
      accumulatedCost >=
      bestCost
    ) {
      return;
    }

    if (
      identityIndex === 4
    ) {
      bestCost =
        accumulatedCost;

      bestSlots =
        [...candidateSlots];

      return;
    }

    const root =
      currentRoots[
        identityIndex
      ];

    for (
      let slot = 0;
      slot < 4;
      slot += 1
    ) {
      if (
        usedSlots[slot]
      ) {
        continue;
      }

      const target =
        initialRoots[slot];

      const dx =
        root.re -
        target.re;

      const dy =
        root.im -
        target.im;

      const cost =
        dx * dx +
        dy * dy;

      candidateSlots[
        identityIndex
      ] =
        slot;

      usedSlots[slot] =
        true;

      search(
        identityIndex + 1,
        accumulatedCost +
          cost
      );

      usedSlots[slot] =
        false;
    }
  }

  search(
    0,
    0
  );

  return bestSlots;
}


function expandedBounds(
  points,
  minimumSpan = 1
) {
  let minRe = Infinity;
  let maxRe = -Infinity;
  let minIm = Infinity;
  let maxIm = -Infinity;

  points.forEach(
    (point) => {
      minRe =
        Math.min(
          minRe,
          point.re
        );

      maxRe =
        Math.max(
          maxRe,
          point.re
        );

      minIm =
        Math.min(
          minIm,
          point.im
        );

      maxIm =
        Math.max(
          maxIm,
          point.im
        );
    }
  );

  let width =
    Math.max(
      minimumSpan,
      maxRe - minRe
    );

  let height =
    Math.max(
      minimumSpan,
      maxIm - minIm
    );

  const xPad =
    Math.max(
      0.12,
      width * 0.07
    );

  const yPad =
    Math.max(
      0.12,
      height * 0.09
    );

  minRe -= xPad;
  maxRe += xPad;
  minIm -= yPad;
  maxIm += yPad;

  width =
    maxRe - minRe;

  height =
    maxIm - minIm;

  const currentAspect =
    width / height;

  if (
    currentAspect <
    SVG_ASPECT
  ) {
    const desiredWidth =
      height *
      SVG_ASPECT;

    const extra =
      (
        desiredWidth -
        width
      ) / 2;

    minRe -= extra;
    maxRe += extra;
  } else {
    const desiredHeight =
      width /
      SVG_ASPECT;

    const extra =
      (
        desiredHeight -
        height
      ) / 2;

    minIm -= extra;
    maxIm += extra;
  }

  return {
    minRe,
    maxRe,
    minIm,
    maxIm,
  };
}


function mapPoint(
  point,
  bounds
) {
  const x =
    SVG.left +
    (
      point.re -
      bounds.minRe
    ) /
    (
      bounds.maxRe -
      bounds.minRe
    ) *
    (
      SVG.right -
      SVG.left
    );

  const y =
    SVG.bottom -
    (
      point.im -
      bounds.minIm
    ) /
    (
      bounds.maxIm -
      bounds.minIm
    ) *
    (
      SVG.bottom -
      SVG.top
    );

  return {
    x,
    y,
  };
}


function unmapPoint(
  point,
  bounds
) {
  const re =
    bounds.minRe +
    (
      point.x -
      SVG.left
    ) /
    (
      SVG.right -
      SVG.left
    ) *
    (
      bounds.maxRe -
      bounds.minRe
    );

  const im =
    bounds.maxIm -
    (
      point.y -
      SVG.top
    ) /
    (
      SVG.bottom -
      SVG.top
    ) *
    (
      bounds.maxIm -
      bounds.minIm
    );

  return {
    re,
    im,
  };
}


function minimumRootSeparation(
  roots
) {
  let minimum = Infinity;

  for (
    let first = 0;
    first < 4;
    first += 1
  ) {
    for (
      let second =
        first + 1;
      second < 4;
      second += 1
    ) {
      minimum =
        Math.min(
          minimum,
          distance(
            roots[first],
            roots[second]
          )
        );
    }
  }

  return minimum;
}


function pathString(
  points,
  bounds
) {
  return points
    .map(
      point => {
        const mapped =
          mapPoint(
            point,
            bounds
          );

        return (
          `${mapped.x},${mapped.y}`
        );
      }
    )
    .join(' ');
}


function scientific(value) {
  if (
    !Number.isFinite(value)
  ) {
    return '—';
  }

  if (value === 0) {
    return '0';
  }

  return value
    .toExponential(3)
    .replace(
      'e+',
      'e'
    );
}


function PlotAxes({
  bounds,
}) {
  const zero =
    mapPoint(
      {
        re: 0,
        im: 0,
      },
      bounds
    );

  const horizontalVisible =
    bounds.minIm <= 0 &&
    bounds.maxIm >= 0;

  const verticalVisible =
    bounds.minRe <= 0 &&
    bounds.maxRe >= 0;

  return (
    <>
      {horizontalVisible && (
        <line
          x1={SVG.left}
          y1={zero.y}
          x2={SVG.right}
          y2={zero.y}
          className={styles.axis}
        />
      )}

      {verticalVisible && (
        <line
          x1={zero.x}
          y1={SVG.top}
          x2={zero.x}
          y2={SVG.bottom}
          className={styles.axis}
        />
      )}

    </>
  );
}


function ParameterPlane({
  trajectory,
  frameIndex,
  freeMode = false,
  freeDragging = false,
  onFreeDragStart,
  onFreeDragPoint,
  onFreeDragEnd,
}) {
  const path =
    trajectory.frames.map(
      frame =>
        frame.a
    );

  const [
    hoveredBranchId,
    setHoveredBranchId,
  ] =
    useState(null);

  const [
    branchTooltipPosition,
    setBranchTooltipPosition,
  ] =
    useState(null);

  const baseBounds =
    freeMode
      ? FREE_PARAMETER_BOUNDS
      : expandedBounds(
          [
            ...path,
            MONODROMY_BASEPOINT,

            ...MONODROMY_BRANCHES.map(
              branch =>
                branch.center
            ),
          ],
          2
        );

  const safePlaneScale =
    PARAMETER_PLANE_SCALE;

  const boundsCenterRe =
    (
      baseBounds.minRe +
      baseBounds.maxRe
    ) / 2;

  const boundsCenterIm =
    (
      baseBounds.minIm +
      baseBounds.maxIm
    ) / 2;

  const boundsHalfRe =
    (
      baseBounds.maxRe -
      baseBounds.minRe
    ) /
    (
      2 *
      safePlaneScale
    );

  const boundsHalfIm =
    (
      baseBounds.maxIm -
      baseBounds.minIm
    ) /
    (
      2 *
      safePlaneScale
    );

  const bounds = {
    minRe:
      boundsCenterRe -
      boundsHalfRe,

    maxRe:
      boundsCenterRe +
      boundsHalfRe,

    minIm:
      boundsCenterIm -
      boundsHalfIm,

    maxIm:
      boundsCenterIm +
      boundsHalfIm,
  };

  const current =
    trajectory.frames[
      frameIndex
    ].a;

  const parameterZero =
    mapPoint(
      {
        re: 0,
        im: 0,
      },
      bounds
    );

  const parameterHorizontalVisible =
    bounds.minIm <= 0 &&
    bounds.maxIm >= 0;

  const parameterVerticalVisible =
    bounds.minRe <= 0 &&
    bounds.maxRe >= 0;

  const mappedCurrent =
    mapPoint(
      current,
      bounds
    );

  const mappedBasepoint =
    mapPoint(
      MONODROMY_BASEPOINT,
      bounds
    );

  function showBranchTooltip(
    event,
    branchId
  ) {
    const circle =
      event.currentTarget
        .querySelector('circle');

    const rectangle =
      (
        circle ??
        event.currentTarget
      ).getBoundingClientRect();

    const tooltipWidth = 238;
    const tooltipHeight = 88;
    const gap = 12;

    let left =
      rectangle.right +
      gap;

    if (
      left +
      tooltipWidth >
      window.innerWidth - 8
    ) {
      left =
        rectangle.left -
        tooltipWidth -
        gap;
    }

    left =
      Math.max(
        8,
        Math.min(
          window.innerWidth -
            tooltipWidth -
            8,
          left
        )
      );

    let top =
      rectangle.top -
      18;

    top =
      Math.max(
        8,
        Math.min(
          window.innerHeight -
            tooltipHeight -
            8,
          top
        )
      );

    setHoveredBranchId(
      branchId
    );

    setBranchTooltipPosition({
      left,
      top,
    });
  }


  function hideBranchTooltip(
    branchId
  ) {
    setHoveredBranchId(
      current =>
        current === branchId
          ? null
          : current
    );

    setBranchTooltipPosition(
      null
    );
  }


  function pointerSvgPoint(event) {
    const rectangle =
      event.currentTarget
        .getBoundingClientRect();

    return {
      x:
        (
          event.clientX -
          rectangle.left
        ) /
        rectangle.width *
        SVG.width,

      y:
        SVG.top +
        (
          event.clientY -
          rectangle.top
        ) /
        rectangle.height *
        (
          SVG.bottom -
          SVG.top
        ),
    };
  }

  function handlePointerDown(event) {
    if (!freeMode) {
      return;
    }

    const pointer =
      pointerSvgPoint(event);

    const grabDistance =
      Math.hypot(
        pointer.x -
          mappedCurrent.x,

        pointer.y -
          mappedCurrent.y
      );

    /*
     * Free mode works by physically grabbing the
     * current white a point, rather than teleporting
     * a across the parameter plane.
     */
    if (grabDistance > 28) {
      return;
    }

    event.preventDefault();

    event.currentTarget
      .setPointerCapture(
        event.pointerId
      );

    onFreeDragStart?.();
  }

  function handlePointerMove(event) {
    if (
      !freeMode ||
      !freeDragging
    ) {
      return;
    }

    event.preventDefault();

    const pointer =
      pointerSvgPoint(event);

    const clamped = {
      x:
        Math.max(
          PARAMETER_DRAG_EDGE_MARGIN,
          Math.min(
            SVG.width -
              PARAMETER_DRAG_EDGE_MARGIN,
            pointer.x
          )
        ),

      y:
        Math.max(
          SVG.top +
            PARAMETER_DRAG_EDGE_MARGIN,
          Math.min(
            SVG.bottom -
              PARAMETER_DRAG_EDGE_MARGIN,
            pointer.y
          )
        ),
    };

    onFreeDragPoint?.(
      unmapPoint(
        clamped,
        bounds
      )
    );
  }

  function handlePointerEnd(event) {
    if (!freeMode) {
      return;
    }

    if (
      event.currentTarget
        .hasPointerCapture?.(
          event.pointerId
        )
    ) {
      event.currentTarget
        .releasePointerCapture(
          event.pointerId
        );
    }

    onFreeDragEnd?.();
  }

  return (
    <>
    <svg
      viewBox={`0 ${SVG.top} ${SVG.width} ${SVG.bottom - SVG.top}`}
      className={styles.plot}
      aria-label="Complex parameter plane"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      style={{
        cursor:
          freeMode
            ? (
                freeDragging
                  ? 'grabbing'
                  : 'grab'
              )
            : undefined,

        touchAction:
          freeMode
            ? 'none'
            : undefined,

        userSelect:
          freeMode
            ? 'none'
            : undefined,
      }}
    >
      <rect
        x="1"
        y={SVG.top}
        width={SVG.width - 2}
        height={SVG.bottom - SVG.top}
        rx="8"
        className={styles.plotBackground}
      />

      {parameterHorizontalVisible && (
        <line
          x1={0}
          y1={parameterZero.y}
          x2={SVG.width}
          y2={parameterZero.y}
          className={styles.axis}
        />
      )}

      {parameterVerticalVisible && (
        <line
          x1={parameterZero.x}
          y1={SVG.top}
          x2={parameterZero.x}
          y2={SVG.bottom}
          className={styles.axis}
        />
      )}

      <polyline
        points={
          pathString(
            path,
            bounds
          )
        }
        className={styles.parameterPath}
      />

      {MONODROMY_BRANCHES.map(
        branch => {
          const mapped =
            mapPoint(
              branch.center,
              bounds
            );

          const labelAsset =
            branch.id === 'minus-real'
              ? {
                  src:
                    '/equations/negative_a_1.svg',

                  x:
                    mapped.x - 88,

                  y:
                    mapped.y - 16,

                  justifyContent:
                    'flex-end',

                  alignItems:
                    'center',
                }
              : branch.id === 'plus-real'
                ? {
                    src:
                      '/equations/a_1.svg',

                    x:
                      mapped.x + 8,

                    y:
                      mapped.y - 16,

                    justifyContent:
                      'flex-start',

                    alignItems:
                      'center',
                  }
                : branch.id === 'plus-imaginary'
                  ? {
                      src:
                        '/equations/b_1.svg',

                      x:
                        mapped.x - 40,

                      y:
                        mapped.y - 40,

                      justifyContent:
                        'center',

                      alignItems:
                        'flex-end',
                    }
                  : {
                      src:
                        '/equations/negative_b_1.svg',

                      x:
                        mapped.x - 40,

                      y:
                        mapped.y + 8,

                      justifyContent:
                        'center',

                      alignItems:
                        'flex-start',
                    };

          return (
            <g
              key={branch.id}
              className={styles.branchHotspot}
              onMouseEnter={
                event =>
                  showBranchTooltip(
                    event,
                    branch.id
                  )
              }
              onMouseLeave={() =>
                hideBranchTooltip(
                  branch.id
                )
              }
              onFocus={
                event =>
                  showBranchTooltip(
                    event,
                    branch.id
                  )
              }
              onBlur={() =>
                hideBranchTooltip(
                  branch.id
                )
              }
              tabIndex={0}
            >
              <circle
                cx={mapped.x}
                cy={mapped.y}
                r="3.5"
                className={styles.branch}
              />

              <foreignObject
                x={labelAsset.x}
                y={labelAsset.y}
                width="80"
                height="32"
                pointerEvents="none"
                style={{
                  overflow:
                    'visible',
                }}
              >
                <div
                  xmlns="http://www.w3.org/1999/xhtml"
                  style={{
                    width: '100%',
                    height: '100%',

                    display: 'flex',

                    justifyContent:
                      labelAsset
                        .justifyContent,

                    alignItems:
                      labelAsset
                        .alignItems,

                    overflow:
                      'visible',

                    pointerEvents:
                      'none',
                  }}
                >
                  <img
                    src={labelAsset.src}
                    alt=""
                    aria-hidden="true"
                    style={{
                      display:
                        'block',

                      width:
                        'auto',

                      height:
                        'auto',

                      maxWidth:
                        'none',

                      maxHeight:
                        'none',

                      transform:
                        `scale(${
                          BRANCH_LABEL_FONT_SIZE /
                          12
                        })`,

                      transformOrigin:
                        'center center',

                      pointerEvents:
                        'none',
                    }}
                  />
                </div>
              </foreignObject>

            </g>
          );
        }
      )}

      <circle
        cx={mappedBasepoint.x}
        cy={mappedBasepoint.y}
        r="5.5"
        className={styles.basepoint}
      />

      <text
        x={mappedBasepoint.x - 10}
        y={mappedBasepoint.y - 11}
        textAnchor="end"
        className={styles.basepointLabel}
        style={{
          opacity: 0,
        }}
      >
        a
      </text>

      <foreignObject
        x={mappedBasepoint.x - 56}
        y={mappedBasepoint.y - 12}
        width="40"
        height="24"
        pointerEvents="none"
        style={{
          overflow: 'visible',
        }}
      >
        <div
          xmlns="http://www.w3.org/1999/xhtml"
          style={{
            width: '100%',
            height: '100%',

            display: 'flex',

            justifyContent:
              'flex-end',

            alignItems:
              'center',

            overflow:
              'visible',

            pointerEvents:
              'none',
          }}
        >
          <img
            src="/equations/a_symbol.svg"
            alt=""
            aria-hidden="true"
            style={{
              display:
                'block',

              width:
                'auto',

              height:
                'auto',

              maxWidth:
                'none',

              maxHeight:
                'none',

              transform:
                `scale(${
                  BRANCH_LABEL_FONT_SIZE /
                  12
                })`,

              transformOrigin:
                'center center',

              pointerEvents:
                'none',
            }}
          />
        </div>
      </foreignObject>

      <circle
        cx={mappedCurrent.x}
        cy={mappedCurrent.y}
        r="10"
        className={styles.parameterHalo}
      />

      <circle
        cx={mappedCurrent.x}
        cy={mappedCurrent.y}
        r="5"
        className={styles.parameterPoint}
      />
    </svg>

    {
      hoveredBranchId &&
      branchTooltipPosition &&
      typeof document !== 'undefined' &&
      createPortal(
        <div
          style={{
            position: 'fixed',

            left:
              branchTooltipPosition.left,

            top:
              branchTooltipPosition.top,

            zIndex: 100000,

            width: '238px',

            boxSizing: 'border-box',

            padding:
              '8px 10px 9px',

            pointerEvents: 'none',

            border:
              '1px solid rgba(232, 223, 200, 0.42)',

            borderRadius: '5px',

            background:
              'rgba(10, 8, 6, 0.97)',

            color:
              'rgba(245, 239, 224, 0.94)',

            fontFamily:
              '"Times New Roman", Times, serif',

            lineHeight: 1.2,
          }}
        >
          <div
            style={{
              marginBottom: '4px',

              color:
                'rgba(255, 250, 238, 0.98)',

              fontFamily:
                '"Cambria Math", "STIX Two Math", "Times New Roman", serif',

              fontSize: '14px',
            }}
          >
            {
              BRANCH_TOOLTIPS[
                hoveredBranchId
              ].title
            }
          </div>

          {
            BRANCH_TOOLTIPS[
              hoveredBranchId
            ].lines.map(
              (
                line,
                index
              ) => (
                <div
                  key={
                    `branch-tooltip-line-${index}`
                  }
                  style={{
                    marginTop:
                      '2px',

                    color:
                      'rgba(232, 223, 200, 0.88)',

                    fontSize:
                      '12px',
                  }}
                >
                  {line}
                </div>
              )
            )
          }
        </div>,
        document.body
      )
    }
    </>
  );
}


function RootPlane({
  trajectory,
  frameIndex,
  showTrails,
}) {
  const allRoots =
    trajectory.frames.flatMap(
      frame =>
        frame.roots
    );

  const bounds =
    expandedBounds(
      allRoots,
      2
    );

  const currentRoots =
    trajectory.frames[
      frameIndex
    ].roots;

  /*
   * DISPLAY-ONLY ROOT-PLANE ALIGNMENT
   *
   * Do not alter:
   *   - adaptive root bounds
   *   - root scale
   *   - 700 x 470 viewBox
   *   - RootPlane wrapper/layout
   *   - bottom root readouts
   *
   * We translate only the plotted coordinate system so
   * that z = 0 lands on the same screen point as z = 0
   * in the existing Roots tab.
   */
  const rootPlaneZero =
    mapPoint(
      {
        re: 0,
        im: 0,
      },
      bounds
    );

  const rootPlaneAxisTarget = {
    x: SVG.width / 2,
    y: 248.375,
  };

  const rootPlaneTranslation = {
    x:
      rootPlaneAxisTarget.x -
      rootPlaneZero.x,

    y:
      rootPlaneAxisTarget.y -
      rootPlaneZero.y,
  };

  return (
    <svg
      viewBox="0 0 700 470"
      className={styles.plot}
      aria-label="Complex root plane"
      style={{
        overflow: 'visible',
      }}
    >
      <line
        x1={-SVG.width * 4}
        y1={rootPlaneAxisTarget.y}
        x2={SVG.width * 5}
        y2={rootPlaneAxisTarget.y}
        className={
          styles.rootPlaneAxis
        }
      />

      <line
        x1={rootPlaneAxisTarget.x}
        y1={-SVG.height * 4}
        x2={rootPlaneAxisTarget.x}
        y2={SVG.height * 5}
        className={
          styles.rootPlaneAxis
        }
      />

      <g
        transform={
          `translate(${rootPlaneTranslation.x} ${rootPlaneTranslation.y})`
        }
      >
      {showTrails &&
        ROOT_COLORS.map(
          (
            color,
            rootIndex
          ) => {
            const trail =
              trajectory.frames
                .slice(
                  0,
                  frameIndex + 1
                )
                .map(
                  frame =>
                    frame.roots[
                      rootIndex
                    ]
                );

            if (
              trail.length < 2
            ) {
              return null;
            }

            return (
              <polyline
                key={
                  `trail-${rootIndex}`
                }
                points={
                  pathString(
                    trail,
                    bounds
                  )
                }
                className={styles.rootTrail}
                style={{
                  stroke: color,
                }}
              />
            );
          }
        )}

      {currentRoots.map(
        (
          root,
          rootIndex
        ) => {
          const mapped =
            mapPoint(
              root,
              bounds
            );

          return (
            <g
              key={
                `root-${rootIndex}`
              }
            >
              <circle
                cx={mapped.x}
                cy={mapped.y}
                r="3.5"
                style={{
                  fill:
                    ROOT_COLORS[
                      rootIndex
                    ],
                }}
              />

            </g>
          );
        }
      )}
      </g>
    </svg>
  );
}


export default function MonodromyStage() {


  const [
    freeDragging,
    setFreeDragging,
  ] =
    useState(false);

  const [
    returnTooltipPosition,
    setReturnTooltipPosition,
  ] =
    useState(null);

  const [
    coordinatePopupPosition,
    setCoordinatePopupPosition,
  ] =
    useState(null);

  const [
    frameIndex,
    setFrameIndex,
  ] =
    useState(0);

  const [
    rootViewerMode,
    setRootViewerMode,
  ] =
    useState('2D');

  const [
    root2DDisplayMode,
    setRoot2DDisplayMode,
  ] =
    useState('trace');

  const [
    showRootDots,
    setShowRootDots,
  ] =
    useState(true);

  const [
    rootZoomStep,
    setRootZoomStep,
  ] =
    useState(0);

  const [
    root3DDisplayMode,
    setRoot3DDisplayMode,
  ] =
    useState('strands');

  const [
    showCutGluings,
    setShowCutGluings,
  ] =
    useState(false);

  const [
    root4DPoleXWAngle,
    setRoot4DPoleXWAngle,
  ] =
    useState(0);

  const [
    root4DPoleYWAngle,
    setRoot4DPoleYWAngle,
  ] =
    useState(0);

  const [
    root4DPoleZWAngle,
    setRoot4DPoleZWAngle,
  ] =
    useState(0);

  const [
    root4DPolePlaying,
    setRoot4DPolePlaying,
  ] =
    useState({
      XW: false,
      YW: false,
      ZW: false,
    });

  const [
    root4DSurfaceOpacity,
    setRoot4DSurfaceOpacity,
  ] =
    useState(1);


  /*
   * Temporary visual-tuning controls.
   * Once the preferred values are chosen we can bake them in
   * and remove these sliders.
   */
  const [
    rootCameraRollCommand,
    setRootCameraRollCommand,
  ] =
    useState({
      id: 0,
      direction: 0,
    });


  /*
   * Discrete reset command for the shared 3D Strands / Sheets
   * camera. This resets camera rotation + zoom only.
   */
  const [
    rootCameraResetCommand,
    setRootCameraResetCommand,
  ] =
    useState({
      id: 0,
    });

  const traceAnimationRef =
    useRef(null);

  const poleAnimationFrameRef =
    useRef(null);

  /*
   * Each 4D pole control can animate independently.
   *
   * One complete -pi -> +pi sweep takes 20 seconds,
   * matching the established pi-radians-per-10-seconds
   * viewer rotation rate.
   */
  useEffect(
    () => {
      const playing =
        root4DPolePlaying;

      const anythingPlaying =
        playing.XW ||
        playing.YW ||
        playing.ZW;

      if (
        rootViewerMode !== '4D' ||
        !anythingPlaying
      ) {
        if (
          poleAnimationFrameRef.current !==
          null
        ) {
          window.cancelAnimationFrame(
            poleAnimationFrameRef.current
          );

          poleAnimationFrameRef.current =
            null;
        }

        return undefined;
      }

      let previousTime =
        performance.now();

      const radiansPerMillisecond =
        2 * Math.PI / 20000;

      const advanceAngle = (
        setter,
        elapsed
      ) => {
        setter(
          current => {
            let next =
              current +
              elapsed *
                radiansPerMillisecond;

            while (next > Math.PI) {
              next -=
                2 * Math.PI;
            }

            return next;
          }
        );
      };

      function animate(now) {
        const elapsed =
          now -
          previousTime;

        previousTime =
          now;

        if (playing.XW) {
          advanceAngle(
            setRoot4DPoleXWAngle,
            elapsed
          );
        }

        if (playing.YW) {
          advanceAngle(
            setRoot4DPoleYWAngle,
            elapsed
          );
        }

        if (playing.ZW) {
          advanceAngle(
            setRoot4DPoleZWAngle,
            elapsed
          );
        }

        poleAnimationFrameRef.current =
          window.requestAnimationFrame(
            animate
          );
      }

      poleAnimationFrameRef.current =
        window.requestAnimationFrame(
          animate
        );

      return () => {
        if (
          poleAnimationFrameRef.current !==
          null
        ) {
          window.cancelAnimationFrame(
            poleAnimationFrameRef.current
          );

          poleAnimationFrameRef.current =
            null;
        }
      };
    },
    [
      root4DPolePlaying,
      rootViewerMode,
    ]
  );


  const rootReadoutGridRef =
    useRef(null);

  const rootReadoutReferenceRefs =
    useRef([]);

  const [
    rootReadoutSlotTops,
    setRootReadoutSlotTops,
  ] =
    useState([
      0,
      0,
      0,
      0,
    ]);

  /*
   * Match the established Roots / Möbius / Cross-ratio
   * placement exactly.
   *
   * A hidden normal-flow reference stack uses the same
   * row geometry and 8px gap as those working tabs.
   * The animated Monodromy identities then move to the
   * exact measured top of one of those four slots.
   */
  useLayoutEffect(
    () => {
      const grid =
        rootReadoutGridRef.current;

      const rows =
        rootReadoutReferenceRefs
          .current;

      if (
        !grid ||
        rows.length < 4 ||
        rows.some(
          row => !row
        )
      ) {
        return undefined;
      }

      const measure = () => {
        const gridRect =
          grid.getBoundingClientRect();

        const next =
          rows.map(
            row =>
              row
                .getBoundingClientRect()
                .top -
              gridRect.top
          );

        setRootReadoutSlotTops(
          previous => {
            const unchanged =
              previous.length ===
                next.length &&
              previous.every(
                (
                  value,
                  index
                ) =>
                  Math.abs(
                    value -
                    next[index]
                  ) < 0.01
              );

            return unchanged
              ? previous
              : next;
          }
        );
      };

      measure();

      const observer =
        typeof ResizeObserver !==
        'undefined'
          ? new ResizeObserver(
              measure
            )
          : null;

      observer?.observe(grid);

      rows.forEach(
        row =>
          observer?.observe(row)
      );

      window.addEventListener(
        'resize',
        measure
      );

      return () => {
        observer?.disconnect();

        window.removeEventListener(
          'resize',
          measure
        );
      };
    },
    []
  );

  const seedTrajectory =
    useMemo(
      () =>
        buildMonodromyTrajectory({
          branchId: 'plus-real',
          loopRadius: 0.18,
          sampleCount: 1,
        }),
      []
    );

  const initialFreeFrame =
    useMemo(
      () => ({
        ...seedTrajectory.frames[0],

        segmentMaximumRootStep: 0,

        segmentMinimumRootSeparation:
          minimumRootSeparation(
            seedTrajectory
              .frames[0]
              .roots
          ),
      }),
      [seedTrajectory]
    );

  const [
    freeFrames,
    setFreeFrames,
  ] =
    useState(
      () => [
        initialFreeFrame,
      ]
    );

  const freeFramesRef =
    useRef(freeFrames);

  useEffect(
    () => {
      freeFramesRef.current =
        freeFrames;
    },
    [freeFrames]
  );

  useEffect(
    () => (
      () => {
        if (
          traceAnimationRef.current !==
          null
        ) {
          window.cancelAnimationFrame(
            traceAnimationRef.current
          );

          traceAnimationRef.current =
            null;
        }
      }
    ),
    []
  );

  const freeTrajectory =
    useMemo(
      () => {
        const firstFrame =
          freeFrames[0];

        const finalFrame =
          freeFrames[
            freeFrames.length - 1
          ];

        const comparison =
          compareTransportedRoots(
            finalFrame.roots,
            firstFrame.roots
          );

        let maximumResidual = 0;
        let maximumRootStep = 0;
        let minimumSeparation =
          Infinity;

        freeFrames.forEach(
          frame => {
            maximumResidual =
              Math.max(
                maximumResidual,
                frame.residual ?? 0
              );

            maximumRootStep =
              Math.max(
                maximumRootStep,
                frame
                  .segmentMaximumRootStep ??
                  0
              );

            minimumSeparation =
              Math.min(
                minimumSeparation,

                frame
                  .segmentMinimumRootSeparation ??
                  minimumRootSeparation(
                    frame.roots
                  )
              );
          }
        );

        return {
          frames:
            freeFrames,

          initialRoots:
            firstFrame.roots,

          finalPermutation:
            comparison.permutation,

          closureError:
            comparison.closureError,

          maximumResidual,
          maximumRootStep,

          minimumRootSeparation:
            minimumSeparation,
        };
      },
      [freeFrames]
    );

  const trajectory =
    freeTrajectory;

  const lastFrame =
    trajectory.frames.length -
    1;

  const safeFrameIndex =
    Math.min(
      frameIndex,
      lastFrame
    );

  const currentFrame =
    trajectory.frames[
      safeFrameIndex
    ];

  function stopTraceAnimation() {
    if (
      traceAnimationRef.current !==
      null
    ) {
      window.cancelAnimationFrame(
        traceAnimationRef.current
      );

      traceAnimationRef.current =
        null;
    }
  }


  function reset() {
    stopTraceAnimation();

    setFreeDragging(false);

    const resetFrame = {
      ...initialFreeFrame,

      segmentMaximumRootStep: 0,

      segmentMinimumRootSeparation:
        minimumRootSeparation(
          initialFreeFrame.roots
        ),
    };

    const resetFrames = [
      resetFrame,
    ];

    freeFramesRef.current =
      resetFrames;

    setFreeFrames(
      resetFrames
    );

    setFrameIndex(0);

    /*
     * Reset the current Monodromy mode in place.
     *
     * Preserve the selected dimension, Trace / Fill mode,
     * and Roots toggle. Restore the canonical camera scale.
     */
    setRootZoomStep(0);

    /*
     * Reset the shared movable camera as part of the main
     * Monodromy Reset:
     *
     *   rotation -> identity
     *   zoom     -> 1
     *
     * Incrementing the command id is essential; assigning a
     * fixed id would not reliably trigger the child effect.
     */
    setRootCameraResetCommand(
      current => ({
        id:
          current.id + 1,
      })
    );

    setShowCutGluings(
      false
    );

    setRoot4DPoleXWAngle(0);
    setRoot4DPoleYWAngle(0);
    setRoot4DPoleZWAngle(0);

    setRoot4DPolePlaying({
      XW: false,
      YW: false,
      ZW: false,
    });

    setRoot4DSurfaceOpacity(
      0.13
    );

    setRootCameraRollCommand({
      id: 0,
      direction: 0,
    });

  }


  function beginFreeDrag() {
    stopTraceAnimation();

    /*
     * If the timeline was scrubbed backward, drawing
     * from there creates a new continuation branch and
     * discards the future portion of the old gesture.
     */
    const currentFrames =
      freeFramesRef.current;

    const truncated =
      currentFrames.slice(
        0,
        safeFrameIndex + 1
      );

    freeFramesRef.current =
      truncated;

    setFreeFrames(
      truncated
    );

    setFreeDragging(true);
  }


  function extendFreePath(targetA) {
    const currentFrames =
      freeFramesRef.current;

    const previous =
      currentFrames[
        currentFrames.length - 1
      ];

    if (
      distance(
        previous.a,
        targetA
      ) < 0.008
    ) {
      return;
    }

    const transported =
      transportRootsAlongSegment({
        fromA:
          previous.a,

        roots:
          previous.roots,

        toA:
          targetA,

        maxParameterStep:
          0.025,
      });

    const nextFrame = {
      a:
        transported.a,

      roots:
        transported.roots,

      residual:
        transported.residual,

      segmentMaximumRootStep:
        transported
          .maximumRootStep,

      segmentMinimumRootSeparation:
        transported
          .minimumRootSeparation,
    };

    const nextFrames = [
      ...currentFrames,
      nextFrame,
    ];

    freeFramesRef.current =
      nextFrames;

    setFreeFrames(
      nextFrames
    );

    setFrameIndex(
      nextFrames.length - 1
    );
  }


  function endFreeDrag() {
    setFreeDragging(false);
  }


  function returnFreePathToBasepoint() {
    stopTraceAnimation();

    setFreeDragging(false);

    extendFreePath(
      MONODROMY_BASEPOINT
    );
  }


  function traceAxesAndBoundary() {
    stopTraceAnimation();

    setFreeDragging(false);

    /*
     * Reconstruct the exact visible free-parameter bounds
     * used by ParameterPlane.
     */
    const centerRe =
      (
        FREE_PARAMETER_BOUNDS.minRe +
        FREE_PARAMETER_BOUNDS.maxRe
      ) / 2;

    const centerIm =
      (
        FREE_PARAMETER_BOUNDS.minIm +
        FREE_PARAMETER_BOUNDS.maxIm
      ) / 2;

    const halfRe =
      (
        FREE_PARAMETER_BOUNDS.maxRe -
        FREE_PARAMETER_BOUNDS.minRe
      ) /
      (
        2 *
        PARAMETER_PLANE_SCALE
      );

    const halfIm =
      (
        FREE_PARAMETER_BOUNDS.maxIm -
        FREE_PARAMETER_BOUNDS.minIm
      ) /
      (
        2 *
        PARAMETER_PLANE_SCALE
      );

    const traceBounds = {
      minRe:
        centerRe - halfRe,

      maxRe:
        centerRe + halfRe,

      minIm:
        centerIm - halfIm,

      maxIm:
        centerIm + halfIm,
    };

    const mappedBasepoint =
      mapPoint(
        MONODROMY_BASEPOINT,
        traceBounds
      );

    const mappedZero =
      mapPoint(
        {
          re: 0,
          im: 0,
        },
        traceBounds
      );

    /*
     * Trace the mathematical parameter-domain boundary,
     * not the decorative outer SVG frame.
     *
     * These are the same mapped bounds used by the 4D sheet
     * domain, so the continuation trace and sheet perimeter
     * represent exactly the same parameter values.
     */
    const left =
      SVG.left;

    const right =
      SVG.right;

    const top =
      SVG.top;

    const bottom =
      SVG.bottom;

    const leftMid = {
      x: left,
      y: mappedZero.y,
    };

    const rightMid = {
      x: right,
      y: mappedZero.y,
    };

    const topMid = {
      x: mappedZero.x,
      y: top,
    };

    const bottomMid = {
      x: mappedZero.x,
      y: bottom,
    };

    const topLeft = {
      x: left,
      y: top,
    };

    const topRight = {
      x: right,
      y: top,
    };

    const bottomLeft = {
      x: left,
      y: bottom,
    };

    const bottomRight = {
      x: right,
      y: bottom,
    };

    const mappedMinusReal =
      mapPoint(
        {
          re:
            -MONODROMY_A_STAR,
          im: 0,
        },
        traceBounds
      );

    const mappedPlusReal =
      mapPoint(
        {
          re:
            MONODROMY_A_STAR,
          im: 0,
        },
        traceBounds
      );

    const mappedPlusImag =
      mapPoint(
        {
          re: 0,
          im:
            MONODROMY_B_STAR,
        },
        traceBounds
      );

    const mappedMinusImag =
      mapPoint(
        {
          re: 0,
          im:
            -MONODROMY_B_STAR,
        },
        traceBounds
      );

    const mappedAxisOrigin =
      mapPoint(
        {
          re: 0,
          im: 0,
        },
        traceBounds
      );

    /*
     * Build the preset in SVG coordinates first.
     *
     * This makes "axes" and "boundary" mean exactly the
     * lines the user sees on screen.
     */
    const screenPoints = [
      {
        x: mappedBasepoint.x,
        y: mappedBasepoint.y,
      },
    ];

    const lineTo = (
      target,
      spacing = 8
    ) => {
      const start =
        screenPoints[
          screenPoints.length - 1
        ];

      const length =
        Math.hypot(
          target.x - start.x,
          target.y - start.y
        );

      const steps =
        Math.max(
          1,
          Math.ceil(
            length / spacing
          )
        );

      for (
        let step = 1;
        step <= steps;
        step += 1
      ) {
        const t =
          step / steps;

        screenPoints.push({
          x:
            start.x +
            (
              target.x -
              start.x
            ) * t,

          y:
            start.y +
            (
              target.y -
              start.y
            ) * t,
        });
      }
    };


    /*
     * Numerically avoid the exact discriminant points while
     * keeping the displayed trace visually on the axes.
     *
     * The 1 px transverse offset lies inside the visible
     * branch-point dot, so the bypass is effectively hidden.
     */
    const collisionWindowPx =
      4;

    const collisionOffsetPx =
      1;


    const bypassRealBranch = (
      mappedBranch,
      offsetSign
    ) => {
      const bypassY =
        mappedZero.y +
        offsetSign *
        collisionOffsetPx;

      lineTo({
        x:
          mappedBranch.x +
          collisionWindowPx,

        y:
          mappedZero.y,
      });

      lineTo(
        {
          x:
            mappedBranch.x +
            collisionWindowPx,

          y:
            bypassY,
        },
        1
      );

      lineTo(
        {
          x:
            mappedBranch.x -
            collisionWindowPx,

          y:
            bypassY,
        },
        1
      );

      lineTo(
        {
          x:
            mappedBranch.x -
            collisionWindowPx,

          y:
            mappedZero.y,
        },
        1
      );
    };


    const bypassImagBranch = (
      mappedBranch,
      offsetSign
    ) => {
      const bypassX =
        mappedZero.x +
        offsetSign *
        collisionOffsetPx;

      lineTo({
        x:
          mappedZero.x,

        y:
          mappedBranch.y -
          collisionWindowPx,
      });

      lineTo(
        {
          x:
            bypassX,

          y:
            mappedBranch.y -
            collisionWindowPx,
        },
        1
      );

      lineTo(
        {
          x:
            bypassX,

          y:
            mappedBranch.y +
            collisionWindowPx,
        },
        1
      );

      lineTo(
        {
          x:
            mappedZero.x,

          y:
            mappedBranch.y +
            collisionWindowPx,
        },
        1
      );
    };


    /*
     * 1. Start at physical a and move to the right edge.
     */
    lineTo(rightMid);


    /*
     * 2. Trace the complete visible boundary clockwise.
     */
    lineTo(topRight);
    lineTo(topLeft);
    lineTo(bottomLeft);
    lineTo(bottomRight);
    lineTo(rightMid);


    /*
     * 3. Trace the real axis from right to left.
     *
     * Stay visually on the axis, but miss the two exact
     * double-root points by 1 screen pixel.
     */
    bypassRealBranch(
      mappedPlusReal,
      -1
    );

    lineTo(mappedAxisOrigin);

    bypassRealBranch(
      mappedMinusReal,
      1
    );

    lineTo(leftMid);


    /*
     * 4. Use already-traced boundary segments to reach the
     *    top of the imaginary axis.
     */
    lineTo(topLeft);
    lineTo(topMid);


    /*
     * 5. Trace the imaginary axis from top to bottom.
     *
     * Stay visually on the axis, but miss the two exact
     * double-root points by 1 screen pixel.
     */
    bypassImagBranch(
      mappedPlusImag,
      1
    );

    lineTo(mappedAxisOrigin);

    bypassImagBranch(
      mappedMinusImag,
      -1
    );

    lineTo(bottomMid);


    /*
     * 6. Follow already-traced boundary segments back to the
     *    right side, then return exactly to physical a.
     */
    lineTo(bottomRight);
    lineTo(rightMid);
    lineTo(mappedBasepoint);


    /*
     * Convert the visible screen path back into complex
     * parameter values and analytically continue the roots.
     */
    const nextFrames = [
      {
        ...initialFreeFrame,

        segmentMaximumRootStep: 0,

        segmentMinimumRootSeparation:
          minimumRootSeparation(
            initialFreeFrame.roots
          ),
      },
    ];

    let previous =
      nextFrames[0];

    screenPoints
      .slice(1)
      .forEach(
        screenPoint => {
          const targetA =
            unmapPoint(
              screenPoint,
              traceBounds
            );

          if (
            distance(
              previous.a,
              targetA
            ) < 1e-10
          ) {
            return;
          }

          const transported =
            transportRootsAlongSegment({
              fromA:
                previous.a,

              roots:
                previous.roots,

              toA:
                targetA,

              maxParameterStep:
                0.01,
            });

          const nextFrame = {
            a:
              transported.a,

            roots:
              transported.roots,

            residual:
              transported.residual,

            segmentMaximumRootStep:
              transported
                .maximumRootStep,

            segmentMinimumRootSeparation:
              transported
                .minimumRootSeparation,
          };

          nextFrames.push(
            nextFrame
          );

          previous =
            nextFrame;
        }
      );


    /*
     * Force the final point to the exact physical basepoint
     * so the Path result registers as closed.
     */
    if (
      distance(
        previous.a,
        MONODROMY_BASEPOINT
      ) > 1e-12
    ) {
      const transported =
        transportRootsAlongSegment({
          fromA:
            previous.a,

          roots:
            previous.roots,

          toA:
            MONODROMY_BASEPOINT,

          maxParameterStep:
            0.01,
        });

      nextFrames.push({
        a:
          transported.a,

        roots:
          transported.roots,

        residual:
          transported.residual,

        segmentMaximumRootStep:
          transported
            .maximumRootStep,

        segmentMinimumRootSeparation:
          transported
            .minimumRootSeparation,
      });
    }


    freeFramesRef.current =
      nextFrames;

    setFreeFrames(
      nextFrames
    );

    setFrameIndex(0);


    /*
     * Animate the transported roots through the finished
     * continuation. The colored root trails therefore grow
     * across the root plane instead of appearing all at once.
     */
    const durationMs =
      6000;

    let startTime =
      null;

    const animate = (
      timestamp
    ) => {
      if (
        startTime === null
      ) {
        startTime =
          timestamp;
      }

      const progress =
        Math.min(
          1,
          (
            timestamp -
            startTime
          ) /
          durationMs
        );

      const nextIndex =
        Math.min(
          nextFrames.length - 1,
          Math.floor(
            progress *
            (
              nextFrames.length -
              1
            )
          )
        );

      setFrameIndex(
        nextIndex
      );

      if (
        progress < 1
      ) {
        traceAnimationRef.current =
          window.requestAnimationFrame(
            animate
          );
      } else {
        traceAnimationRef.current =
          null;
      }
    };

    traceAnimationRef.current =
      window.requestAnimationFrame(
        animate
      );
  }


  const currentParameter =
    currentFrame.a;

  const currentRoots =
    currentFrame.roots;

  /*
   * DISPLAY ONLY:
   *
   * Root identities remain continuously transported
   * as ж1, ж2, ж3, ж4.
   *
   * This assignment only asks which original A0 readout
   * slot each transported identity currently occupies.
   */
  const currentReadoutSlots =
    bestReadoutSlotAssignment(
      currentRoots,
      trajectory.initialRoots
    );

  const freePathClosed =
    freeFrames.length > 2 &&
    distance(
      freeFrames[
        freeFrames.length - 1
      ].a,
      MONODROMY_BASEPOINT
    ) < 1e-8;

  const resultClosed =
    freePathClosed;

  const permutation =
    resultClosed
      ? permutationCycleNotation(
          trajectory
            .finalPermutation
        )
      : 'open path';

  return (
    <div className={styles.standardStage}>
      <section
        className={styles.rootViewer}
        aria-label="Root monodromy viewer"
      >
        <div className={styles.rootViewerHeader}>
          <div className={styles.rootViewerTitle}>
            Root monodromy: analytic continuation in the complex{' '}
            <ASymbol />-plane
          </div>

        </div>

        <div
          className={styles.rootPlotWrap}
          style={{
            position: 'relative',
          }}
        >
          <MonodromyBraid3D
            active={
              rootViewerMode === '2D' ||
              rootViewerMode === '4D'
            }
            interactionEnabled={
              rootViewerMode === '2D' ||
              rootViewerMode === '4D'
            }
            dimensionMode={
              rootViewerMode === '2D'
                ? '3D'
                : rootViewerMode
            }
            trajectory={trajectory}
            frameIndex={safeFrameIndex}
            rootColors={ROOT_COLORS}
            showRootDots={
              showRootDots
            }
            zoomStep={
              rootZoomStep
            }
            displayMode={
              (
                rootViewerMode === '2D' ||
                rootViewerMode === '4D'
              )
                ? (
                    root2DDisplayMode === 'fill'
                      ? 'sheets'
                      : 'strands'
                  )
                : root3DDisplayMode
            }
            showGluePairs={
              showCutGluings
            }
            fourDPoleXWAngle={
              root4DPoleXWAngle
            }
            fourDPoleYWAngle={
              root4DPoleYWAngle
            }
            fourDPoleZWAngle={
              root4DPoleZWAngle
            }
            surfaceOpacity={
              root4DSurfaceOpacity
            }
            cameraRollCommand={
              rootCameraRollCommand
            }
            cameraResetCommand={
              rootCameraResetCommand
            }
          />

          <RiemannSurfaceViewer
            active={
              rootViewerMode ===
              'Riemann'
            }
            surfaceOpacity={
              root4DSurfaceOpacity
            }
          />

        </div>

        <div className={styles.currentRootsFooter}>
          <div
            ref={rootReadoutGridRef}
            className={styles.currentRootsGrid}
          >
            <div
              className={
                styles.rootReadoutReferenceStack
              }
              aria-hidden="true"
            >
              {trajectory.initialRoots.map(
                (
                  root,
                  index
                ) => (
                  <div
                    key={
                      `root-reference-${index}`
                    }
                    ref={
                      node => {
                        rootReadoutReferenceRefs
                          .current[
                            index
                          ] =
                            node;
                      }
                    }
                    className={
                      styles.rootReadoutReferenceRow
                    }
                  >
                    <ColoredZheSymbol
                      kind={index + 1}
                      color={
                        ROOT_COLORS[index]
                      }
                      className={
                        styles.monodromyZheSymbol
                      }
                    />

                    <MathInline
                      className={
                        styles.monodromyRootValueMath
                      }
                      latex={
                        monodromyRootLatex(
                          root
                        )
                      }
                    />
                  </div>
                )
              )}
            </div>

            {currentRoots.map(
              (
                root,
                index
              ) => (
                <div
                  key={
                    `root-value-${index}`
                  }
                  className={styles.currentRootRow}
                  style={{
                    transform:
                      `translateY(${
                        rootReadoutSlotTops[
                          currentReadoutSlots[
                            index
                          ]
                        ] ?? 0
                      }px)`,

                    /*
                     * Do not animate the initial layout measurement.
                     * Once the user actually draws a path, restore the
                     * existing CSS transition for genuine root swaps.
                     */
                    transition:
                      freeFrames.length > 1
                        ? undefined
                        : 'none',
                  }}
                >
                  <ColoredZheSymbol
                    kind={index + 1}
                    color={
                      ROOT_COLORS[index]
                    }
                    className={
                      styles.monodromyZheSymbol
                    }
                  />

                  <MathInline
                    className={
                      styles.monodromyRootValueMath
                    }
                    latex={
                      monodromyRootLatex(
                        root
                      )
                    }
                  />
                </div>
              )
            )}
          </div>
        </div>
      </section>

      <aside
        className={styles.sidePanel}
        aria-label="Monodromy controls"
      >
        <section className={styles.sideSection}>
          <div
            className={styles.parameterHeaderRow}
            style={{
              position: 'relative',
            }}
          >
            <div className={styles.sideSectionTitle}>
              Parameter plane
            </div>

            {
              distance(
                currentParameter,
                MONODROMY_BASEPOINT
              ) < 1e-10
                ? (
                    <div
                      className={
                        styles.parameterExactReadout
                      }
                    >
                      <div
                        className={
                          styles.parameterExactLine
                        }
                      >
                        <img
                          src="/equations/a_scale.svg"
                          alt="a defining expression"
                          className={
                            styles.parameterExactFormula
                          }
                          style={{
                            height: '30px',
                            width: 'auto',
                            flex: '0 0 auto',
                          }}
                        />

                        <span>
                          = {
                            MONODROMY_BASEPOINT
                              .re
                              .toPrecision(15)
                          }
                        </span>
                      </div>

                      <div
                        className={
                          styles.parameterExactNote
                        }
                        style={{
                          position: 'absolute',
                          top:
                            '32px',
                          right: 0,
                          zIndex: 5,
                          margin: 0,
                          pointerEvents: 'none',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        principal value of{' '}

                        <MathInline
                          latex={
                            String.raw`i^i`
                          }
                        />
                      </div>
                    </div>
                  )
                : (
                    <div
                      className={
                        styles.parameterReadout
                      }
                    >
                      <ASymbol /> = {
                        formatComplex(
                          currentParameter,
                          15
                        )
                      }
                    </div>
                  )
            }
          </div>

          <div
            className={styles.parameterPlaneWrap}
            style={{
              height:
                '254px',
            }}
          >
            <ParameterPlane
              trajectory={trajectory}
              frameIndex={safeFrameIndex}
              freeMode={true}

              freeDragging={
                freeDragging
              }

              onFreeDragStart={
                beginFreeDrag
              }

              onFreeDragPoint={
                extendFreePath
              }

              onFreeDragEnd={
                endFreeDrag
              }
            />
          </div>

          <div className={styles.parameterHint}>
            Drag the white <ASymbol /> point to draw a path.
          </div>

          <div className={styles.parameterActions}>
            <button
              type="button"
              onClick={
                returnFreePathToBasepoint
              }
              onMouseEnter={event => {
                const rectangle =
                  event.currentTarget
                    .getBoundingClientRect();

                const tooltipWidth = 330;
                const tooltipHeight = 48;
                const gap = 10;

                let left =
                  rectangle.left +
                  rectangle.width / 2 -
                  tooltipWidth / 2;

                left = Math.max(
                  8,
                  Math.min(
                    window.innerWidth -
                      tooltipWidth -
                      8,
                    left
                  )
                );

                let top =
                  rectangle.top -
                  tooltipHeight -
                  gap;

                if (top < 8) {
                  top =
                    rectangle.bottom +
                    gap;
                }

                setReturnTooltipPosition({
                  left,
                  top,
                });
              }}
              onMouseLeave={() =>
                setReturnTooltipPosition(null)
              }
              onFocus={event => {
                const rectangle =
                  event.currentTarget
                    .getBoundingClientRect();

                const tooltipWidth = 330;
                const tooltipHeight = 48;
                const gap = 10;

                let left =
                  rectangle.left +
                  rectangle.width / 2 -
                  tooltipWidth / 2;

                left = Math.max(
                  8,
                  Math.min(
                    window.innerWidth -
                      tooltipWidth -
                      8,
                    left
                  )
                );

                let top =
                  rectangle.top -
                  tooltipHeight -
                  gap;

                if (top < 8) {
                  top =
                    rectangle.bottom +
                    gap;
                }

                setReturnTooltipPosition({
                  left,
                  top,
                });
              }}
              onBlur={() =>
                setReturnTooltipPosition(null)
              }
            >
              Return to <ASymbol />
            </button>

            {
              returnTooltipPosition &&
              typeof document !== 'undefined' &&
              createPortal(
                <div
                  role="tooltip"
                  style={{
                    position: 'fixed',

                    left:
                      returnTooltipPosition.left,

                    top:
                      returnTooltipPosition.top,

                    zIndex: 100000,

                    width: '330px',

                    boxSizing:
                      'border-box',

                    padding:
                      '8px 10px 9px',

                    pointerEvents:
                      'none',

                    border:
                      '1px solid rgba(232, 223, 200, 0.42)',

                    borderRadius:
                      '5px',

                    background:
                      'rgba(10, 8, 6, 0.97)',

                    color:
                      'rgba(232, 223, 200, 0.88)',

                    fontFamily:
                      '"Times New Roman", Times, serif',

                    fontSize:
                      '12px',

                    lineHeight:
                      1.2,
                  }}
                >
                  Return to <ASymbol /> to close the path and compute
                  the transported-root permutation.
                </div>,
                document.body
              )
            }

            <button
              type="button"
              onClick={reset}
            >
              Reset
            </button>

            <button
              type="button"
              onClick={
                traceAxesAndBoundary
              }
            >
              Trace axes and boundary
            </button>

            <span
              role="group"
              aria-label="Root viewer dimension"
              style={{
                display: 'inline-flex',
                alignItems: 'center',

                minHeight: '30px',

                border:
                  '1px solid rgba(232, 223, 200, 0.24)',

                borderRadius:
                  '4px',

                overflow:
                  'hidden',

                background:
                  'rgba(0, 0, 0, 0.20)',
              }}
            >
              <button
                type="button"
                aria-pressed={
                  rootViewerMode === '2D'
                }
                onClick={() =>
                  setRootViewerMode('2D')
                }
                style={{
                  minHeight:
                    '28px',

                  padding:
                    '4px 8px',

                  border:
                    'none',

                  borderRadius:
                    0,

                  background:
                    rootViewerMode === '2D'
                      ? 'rgba(255, 255, 255, 0.12)'
                      : 'transparent',
                }}
              >
                2D
              </button>

              <span
                aria-hidden="true"
                style={{
                  color:
                    'rgba(232, 223, 200, 0.42)',

                  fontSize:
                    '13px',
                }}
              >
                |
              </span>

              <button
                type="button"
                aria-pressed={
                  rootViewerMode === '4D'
                }
                onClick={() =>
                  setRootViewerMode('4D')
                }
                style={{
                  minHeight:
                    '28px',

                  padding:
                    '4px 8px',

                  border:
                    'none',

                  borderRadius:
                    0,

                  background:
                    rootViewerMode === '4D'
                      ? 'rgba(255, 255, 255, 0.12)'
                      : 'transparent',
                }}
              >
                4D
              </button>

            </span>

          </div>

          {
            (
              rootViewerMode === '2D' ||
              rootViewerMode === '4D'
            ) && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '0px',
                }}
              >
                <button
                  type="button"
                  aria-pressed={
                    root2DDisplayMode ===
                    'trace'
                  }
                  onClick={() => {
                    setRoot2DDisplayMode(
                      'trace'
                    );

                    setRootCompactified(
                      false
                    );

                    setRootZoomStep(
                      0
                    );
                  }}
                  style={{
                    minHeight:
                      '30px',

                    padding:
                      '4px 10px',

                    border:
                      '1px solid rgba(232, 223, 200, 0.24)',

                    borderRadius:
                      '4px',

                    background:
                      root2DDisplayMode ===
                      'trace'
                        ? 'rgba(255, 255, 255, 0.12)'
                        : 'rgba(0, 0, 0, 0.20)',
                  }}
                >
                  Trace
                </button>

                <button
                  type="button"
                  aria-pressed={
                    root2DDisplayMode ===
                    'fill'
                  }
                  onClick={() =>
                    setRoot2DDisplayMode(
                      'fill'
                    )
                  }
                  style={{
                    minHeight:
                      '30px',

                    padding:
                      '4px 10px',

                    border:
                      '1px solid rgba(232, 223, 200, 0.24)',

                    borderRadius:
                      '4px',

                    background:
                      root2DDisplayMode ===
                      'fill'
                        ? 'rgba(255, 255, 255, 0.12)'
                        : 'rgba(0, 0, 0, 0.20)',
                  }}
                >
                  Fill
                </button>

                <button
                  type="button"
                  aria-pressed={
                    showRootDots
                  }
                  onClick={() =>
                    setShowRootDots(
                      current =>
                        !current
                    )
                  }
                  style={{
                    minHeight:
                      '30px',

                    padding:
                      '4px 10px',

                    border:
                      '1px solid rgba(232, 223, 200, 0.24)',

                    borderRadius:
                      '4px',

                    background:
                      showRootDots
                        ? 'rgba(255, 255, 255, 0.12)'
                        : 'rgba(0, 0, 0, 0.20)',
                  }}
                >
                  Roots
                </button>

                <span
                  role="group"
                  aria-label="Zoom controls"
                  style={{
                    display:
                      'inline-flex',

                    alignItems:
                      'stretch',

                    minHeight:
                      '30px',

                    border:
                      '1px solid rgba(232, 223, 200, 0.24)',

                    borderRadius:
                      '4px',

                    overflow:
                      'hidden',

                    background:
                      'rgba(0, 0, 0, 0.20)',
                  }}
                >
                  <button
                    type="button"
                    aria-label="Zoom out"
                    title="Zoom out"
                    disabled={
                      rootZoomStep <=
                      ROOT_VIEW_ZOOM_MIN_STEP
                    }
                    onClick={() =>
                      setRootZoomStep(
                        current =>
                          Math.max(
                            ROOT_VIEW_ZOOM_MIN_STEP,
                            current - 1
                          )
                      )
                    }
                    style={{
                      minHeight:
                        '28px',

                      minWidth:
                        '34px',

                      padding:
                        '4px 8px',

                      border:
                        'none',

                      borderRadius:
                        0,

                      background:
                        'transparent',

                      opacity:
                        rootZoomStep <=
                        ROOT_VIEW_ZOOM_MIN_STEP
                          ? 0.34
                          : 1,

                      cursor:
                        rootZoomStep <=
                        ROOT_VIEW_ZOOM_MIN_STEP
                          ? 'default'
                          : 'pointer',
                    }}
                  >
                    −
                  </button>

                  <span
                    aria-hidden="true"
                    style={{
                      width:
                        '1px',

                      alignSelf:
                        'stretch',

                      background:
                        'rgba(232, 223, 200, 0.24)',
                    }}
                  />

                  <button
                    type="button"
                    aria-label="Zoom in"
                    title="Zoom in"
                    disabled={
                      rootZoomStep >=
                      ROOT_VIEW_ZOOM_MAX_STEP
                    }
                    onClick={() =>
                      setRootZoomStep(
                        current =>
                          Math.min(
                            ROOT_VIEW_ZOOM_MAX_STEP,
                            current + 1
                          )
                      )
                    }
                    style={{
                      minHeight:
                        '28px',

                      minWidth:
                        '34px',

                      padding:
                        '4px 8px',

                      border:
                        'none',

                      borderRadius:
                        0,

                      background:
                        'transparent',

                      opacity:
                        rootZoomStep >=
                        ROOT_VIEW_ZOOM_MAX_STEP
                          ? 0.34
                          : 1,

                      cursor:
                        rootZoomStep >=
                        ROOT_VIEW_ZOOM_MAX_STEP
                          ? 'default'
                          : 'pointer',
                    }}
                  >
                    +
                  </button>
                </span>



              </div>
            )
          }

          {
            rootViewerMode === '3D' && (
              <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '8px',
                  flexWrap: 'wrap',
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setRootCameraResetCommand(
                      current => ({
                        id:
                          current.id + 1,
                      })
                    )
                  }
                  style={{
                    minHeight:
                      '30px',

                    padding:
                      '4px 10px',

                    border:
                      '1px solid rgba(232, 223, 200, 0.24)',

                    borderRadius:
                      '4px',

                    color:
                      'rgba(245, 239, 224, 0.88)',

                    background:
                      'rgba(0, 0, 0, 0.20)',

                    font:
                      'inherit',

                    cursor:
                      'pointer',
                  }}
                >
                  Reset view
                </button>

                <span
                  role="group"
                  aria-label="3D root-cover display"
                  style={{
                    display:
                      'inline-flex',

                    alignItems:
                      'center',

                    minHeight:
                      '30px',

                    border:
                      '1px solid rgba(232, 223, 200, 0.24)',

                    borderRadius:
                      '4px',

                    overflow:
                      'hidden',

                    background:
                      'rgba(0, 0, 0, 0.20)',
                  }}
                >
                  <button
                    type="button"
                    aria-pressed={
                      root3DDisplayMode ===
                        'strands'
                    }
                    onClick={() =>
                      setRoot3DDisplayMode(
                        'strands'
                      )
                    }
                    style={{
                      minHeight:
                        '28px',

                      padding:
                        '4px 8px',

                      border:
                        'none',

                      borderRadius:
                        0,

                      background:
                        root3DDisplayMode ===
                          'strands'
                          ? 'rgba(255, 255, 255, 0.12)'
                          : 'transparent',
                    }}
                  >
                    Strands
                  </button>

                  <span
                    aria-hidden="true"
                    style={{
                      color:
                        'rgba(232, 223, 200, 0.42)',

                      fontSize:
                        '13px',
                    }}
                  >
                    |
                  </span>

                  <button
                    type="button"
                    aria-pressed={
                      root3DDisplayMode ===
                        'sheets'
                    }
                    onClick={() =>
                      setRoot3DDisplayMode(
                        'sheets'
                      )
                    }
                    style={{
                      minHeight:
                        '28px',

                      padding:
                        '4px 8px',

                      border:
                        'none',

                      borderRadius:
                        0,

                      background:
                        root3DDisplayMode ===
                          'sheets'
                          ? 'rgba(255, 255, 255, 0.12)'
                          : 'transparent',
                    }}
                  >
                    Sheets
                  </button>
                </span>

                <button
                  type="button"
                  aria-expanded={
                    Boolean(
                      coordinatePopupPosition
                    )
                  }
                  onClick={event => {
                    if (
                      coordinatePopupPosition
                    ) {
                      setCoordinatePopupPosition(
                        null
                      );

                      return;
                    }

                    const rectangle =
                      event.currentTarget
                        .getBoundingClientRect();

                    const width = 500;
                    const gap = 8;
                    const edge = 10;

                    let left =
                      rectangle.right -
                      width;

                    left =
                      Math.max(
                        edge,
                        Math.min(
                          left,
                          window.innerWidth -
                            width -
                            edge
                        )
                      );

                    let top =
                      rectangle.bottom +
                      gap;

                    const estimatedHeight =
                      root3DDisplayMode ===
                      'sheets'
                        ? 205
                        : 105;

                    if (
                      top +
                        estimatedHeight >
                      window.innerHeight -
                        edge
                    ) {
                      top =
                        rectangle.top -
                        estimatedHeight -
                        gap;
                    }

                    top =
                      Math.max(
                        edge,
                        top
                      );

                    setCoordinatePopupPosition({
                      left,
                      top,
                    });
                  }}
                  style={{
                    minHeight:
                      '30px',

                    padding:
                      '4px 10px',

                    border:
                      '1px solid rgba(232, 223, 200, 0.24)',

                    borderRadius:
                      '4px',

                    color:
                      'rgba(245, 239, 224, 0.88)',

                    background:
                      coordinatePopupPosition
                        ? 'rgba(255, 255, 255, 0.12)'
                        : 'rgba(0, 0, 0, 0.20)',

                    font:
                      'inherit',

                    cursor:
                      'pointer',
                  }}
                >
                  Coordinates
                </button>


                {
                  root3DDisplayMode === 'sheets' && (
                    <button
                      type="button"
                      aria-pressed={
                        showCutGluings
                      }
                      onClick={() =>
                        setShowCutGluings(
                          current => !current
                        )
                      }
                      style={{
                        minHeight:
                          '30px',

                        padding:
                          '4px 10px',

                        border:
                          '1px solid rgba(232, 223, 200, 0.24)',

                        borderRadius:
                          '4px',

                        color:
                          'rgba(245, 239, 224, 0.88)',

                        background:
                          showCutGluings
                            ? 'rgba(255, 255, 255, 0.12)'
                            : 'rgba(0, 0, 0, 0.20)',

                        font:
                          'inherit',

                        cursor:
                          'pointer',
                      }}
                    >
                      Cuts / glue pairs
                    </button>
                  )
                }

              </div>

              {
                coordinatePopupPosition &&
                typeof document !==
                  'undefined' &&
                createPortal(
                  <div
                    role="dialog"
                    aria-label="Coordinate convention"
                    style={{
                      position:
                        'fixed',

                      left:
                        coordinatePopupPosition.left,

                      top:
                        coordinatePopupPosition.top,

                      zIndex:
                        100000,

                      width:
                        '500px',

                      maxWidth:
                        'calc(100vw - 20px)',

                      boxSizing:
                        'border-box',

                      padding:
                        '11px 12px 12px',

                      border:
                        '1px solid rgba(232, 223, 200, 0.42)',

                      borderRadius:
                        '5px',

                      background:
                        'rgba(10, 8, 6, 0.97)',

                      color:
                        'rgba(245, 239, 224, 0.94)',

                      fontFamily:
                        '"Times New Roman", Times, serif',

                      boxShadow:
                        '0 8px 28px rgba(0, 0, 0, 0.48)',
                    }}
                  >
                    <div
                      style={{
                        display:
                          'flex',

                        alignItems:
                          'center',

                        justifyContent:
                          'space-between',

                        gap:
                          '12px',

                        marginBottom:
                          '9px',
                      }}
                    >
                      <strong
                        style={{
                          fontSize:
                            '14px',

                          fontWeight:
                            600,
                        }}
                      >
                        Coordinate convention
                      </strong>

                      <button
                        type="button"
                        aria-label="Close coordinate convention"
                        onClick={() =>
                          setCoordinatePopupPosition(
                            null
                          )
                        }
                        style={{
                          border:
                            'none',

                          padding:
                            '0 3px',

                          background:
                            'transparent',

                          color:
                            'rgba(245, 239, 224, 0.72)',

                          font:
                            'inherit',

                          fontSize:
                            '18px',

                          lineHeight:
                            1,

                          cursor:
                            'pointer',
                        }}
                      >
                        ×
                      </button>
                    </div>

                    <div
                      style={{
                        fontSize:
                          '13px',

                        lineHeight:
                          1.35,
                      }}
                    >
                      {
                        root3DDisplayMode ===
                        'strands'
                          ? (
                              <MathInline
                                latex={
                                  'X=\\operatorname{Re}(x)\\;\\cdot\\;Y=\\operatorname{Im}(x)\\;\\cdot\\;Z=\\text{continuation time}'
                                }
                              />
                            )
                          : (
                              <>
                                <div
                                  style={{
                                    marginBottom:
                                      '9px',
                                  }}
                                >
                                  <MathInline
                                    latex={
                                      'X=\\operatorname{Re}(x)\\;\\cdot\\;Y=\\operatorname{Im}(x)\\;\\cdot\\;Z=\\operatorname{Re}(a)'
                                    }
                                  />
                                </div>

                                <div
                                  style={{
                                    display:
                                      'grid',

                                    gap:
                                      '6px',
                                  }}
                                >
                                  <div
                                    style={{
                                      display:
                                        'flex',

                                      alignItems:
                                        'baseline',

                                      gap:
                                        '8px',

                                      flexWrap:
                                        'wrap',
                                    }}
                                  >
                                    <MathInline
                                      latex={
                                        'Z=\\operatorname{Re}(a)'
                                      }
                                    />

                                    <span
                                      style={{
                                        opacity:
                                          0.62,

                                        fontSize:
                                          '11px',
                                      }}
                                    >
                                      visible depth
                                    </span>
                                  </div>

                                  <div
                                    style={{
                                      display:
                                        'flex',

                                      alignItems:
                                        'baseline',

                                      gap:
                                        '8px',

                                      flexWrap:
                                        'wrap',
                                    }}
                                  >
                                    <MathInline
                                      latex={
                                        'W=\\operatorname{Im}(a)'
                                      }
                                    />

                                    <span
                                      style={{
                                        opacity:
                                          0.62,

                                        fontSize:
                                          '11px',
                                      }}
                                    >
                                      hidden direction
                                    </span>
                                  </div>

                                </div>
                              </>
                            )
                      }
                    </div>
                  </div>,
                  document.body
                )
              }
              </>
            )
          }

          {
            rootViewerMode === 'Riemann' && (
              <div
                style={{
                  marginTop: '8px',
                  display: 'grid',
                  gap: '7px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flexWrap: 'wrap',
                  }}
                >
                  <span
                    style={{
                      fontSize: '12px',
                      opacity: 0.76,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Surface opacity
                  </span>

                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={
                      root4DSurfaceOpacity
                    }
                    onChange={event =>
                      setRoot4DSurfaceOpacity(
                        Number(
                          event.target.value
                        )
                      )
                    }
                    aria-label="Riemann surface opacity"
                    style={{
                      width: '150px',
                      maxWidth: '100%',
                    }}
                  />

                  <span
                    style={{
                      minWidth: '54px',
                      fontSize: '12px',
                      opacity: 0.88,
                      fontVariantNumeric:
                        'tabular-nums',
                    }}
                  >
                    {
                      Math.round(
                        root4DSurfaceOpacity *
                        100
                      )
                    }%
                  </span>
                </div>

                <div
                  style={{
                    fontSize: '12px',
                    opacity: 0.72,
                  }}
                >
                  <MathInline
                    latex={
                      String.raw`\mathbb{CP}^{1}_{x}\xrightarrow{\;a(x)=x^{3}/(2\pi)+x+1/x\;}\mathbb{CP}^{1}_{a}`
                    }
                  />
                </div>
              </div>
            )
          }

          {
            rootViewerMode === '4D' && (
              <div
                style={{
                  marginTop: '8px',
                  display: 'grid',
                  gap: '5px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flexWrap: 'wrap',
                  }}
                >
                  <span
                    style={{
                      fontSize: '12px',
                      opacity: 0.7,
                      marginRight: '2px',
                    }}
                  >
                    4D projection pole
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setRoot4DPoleXWAngle(0);
                      setRoot4DPoleYWAngle(0);
                      setRoot4DPoleZWAngle(0);

                      setRoot4DPolePlaying({
                        XW: false,
                        YW: false,
                        ZW: false,
                      });

                      setRootZoomStep(0);

                      /*
                       * Reset viewing orientation only:
                       *
                       *   4D pole -> identity
                       *   camera rotation -> identity
                       *   camera zoom -> default
                       *
                       * Preserve path, frame, dimension mode,
                       * Trace / Fill, and all other selections.
                       */
                      setRootCameraResetCommand(
                        current => ({
                          id:
                            current.id + 1,
                        })
                      );
                    }}
                    style={{
                      minHeight: '26px',
                      padding: '3px 7px',
                    }}
                  >
                    Reset pole
                  </button>

                  <button
                    type="button"
                    aria-label="Rotate viewer counterclockwise"
                    title="Rotate viewer counterclockwise"
                    onClick={() =>
                      setRootCameraRollCommand(
                        current => ({
                          id:
                            current.id + 1,

                          direction:
                            1,
                        })
                      )
                    }
                    style={{
                      minWidth: '30px',
                      minHeight: '26px',
                      padding: '3px 7px',
                    }}
                  >
                    ↺
                  </button>

                  <button
                    type="button"
                    aria-label="Rotate viewer clockwise"
                    title="Rotate viewer clockwise"
                    onClick={() =>
                      setRootCameraRollCommand(
                        current => ({
                          id:
                            current.id + 1,

                          direction:
                            -1,
                        })
                      )
                    }
                    style={{
                      minWidth: '30px',
                      minHeight: '26px',
                      padding: '3px 7px',
                    }}
                  >
                    ↻
                  </button>
                </div>

                {[
                  {
                    plane: 'XW',
                    symbol: '\\alpha',
                    value: root4DPoleXWAngle,
                    setValue: setRoot4DPoleXWAngle,
                  },
                  {
                    plane: 'YW',
                    symbol: '\\beta',
                    value: root4DPoleYWAngle,
                    setValue: setRoot4DPoleYWAngle,
                  },
                  {
                    plane: 'ZW',
                    symbol: '\\gamma',
                    value: root4DPoleZWAngle,
                    setValue: setRoot4DPoleZWAngle,
                  },
                ].map(
                  control => (
                    <div
                      key={control.plane}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        minHeight: '26px',

                        marginBottom:
                          control.plane === 'ZW'
                            ? 0
                            : '-12px',
                      }}
                    >
                      <span
                        style={{
                          width: '24px',
                          fontSize: '12px',
                          opacity: 0.76,
                        }}
                      >
                        {control.plane}
                      </span>

                      <button
                        type="button"
                        aria-label={
                          root4DPolePlaying[
                            control.plane
                          ]
                            ? `Pause ${control.plane} pole animation`
                            : `Play ${control.plane} pole animation`
                        }
                        title={
                          root4DPolePlaying[
                            control.plane
                          ]
                            ? 'Pause'
                            : 'Play'
                        }
                        onClick={() =>
                          setRoot4DPolePlaying(
                            current => ({
                              ...current,

                              [control.plane]:
                                !current[
                                  control.plane
                                ],
                            })
                          )
                        }
                        style={{
                          minWidth: '30px',
                          minHeight: '26px',
                          padding: '3px 7px',
                        }}
                      >
                        {
                          root4DPolePlaying[
                            control.plane
                          ]
                            ? '❚❚'
                            : '▶'
                        }
                      </button>

                      <input
                        type="range"
                        min={-Math.PI}
                        max={Math.PI}
                        step={Math.PI / 180}
                        value={control.value}
                        onChange={event => {
                          setRoot4DPolePlaying(
                            current => ({
                              ...current,

                              [control.plane]:
                                false,
                            })
                          );

                          control.setValue(
                            Number(
                              event.target.value
                            )
                          );
                        }}
                        aria-label={
                          `${control.plane} pole angle in radians`
                        }
                        className={
                          styles.poleAngleSlider
                        }
                      />

                      <span
                        style={{
                          width: '64px',
                          flex: '0 0 64px',
                          fontSize: '12px',
                          opacity: 0.88,
                          fontVariantNumeric:
                            'tabular-nums',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <MathInline
                          latex={
                            `${control.symbol}=${control.value.toFixed(3)}`
                          }
                        />
                      </span>
                    </div>
                  )
                )}

              </div>
            )
          }

        </section>

        <div className={styles.sideDivider} />

        <section className={styles.sideSection}>
          <div className={styles.sideSectionTitle}>
            Path result
          </div>

          <div className={styles.sideDataRows}>
            <div>
              <span>
                status
              </span>

              <strong>
                {
                  freePathClosed
                    ? (
                        <>
                          closed at{' '}
                          <ASymbol />
                        </>
                      )
                    : 'open path'
                }
              </strong>
            </div>

            <div>
              <span>
                final permutation
              </span>

              <strong>
                {permutation}
              </strong>
            </div>

            <div>
              <span>
                unordered closure error
              </span>

              <strong>
                {
                  resultClosed
                    ? scientific(
                        trajectory
                          .closureError
                      )
                    : '—'
                }
              </strong>
            </div>
          </div>
        </section>

        <div className={styles.sideDivider} />

        <section className={styles.sideSection}>
          <div className={styles.sideSectionTitle}>
            Branch values
          </div>

          <div
            className={styles.sideDataRows}
          >
            <div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'baseline',
                  gap: '0.24em',
                  whiteSpace: 'nowrap',
                  color:
                    'rgba(232, 223, 200, 0.78)',
                  transform:
                    'translateY(7px)',
                }}
              >
                <BranchEquationSvg
                  src="/equations/a_1_equation.svg"
                  alt="a1 equals square root of 4u times 1 plus 2u over 2 pi"
                  fontSize={24}
                />

                <span>,</span>

                <BranchEquationSvg
                  src="/equations/u_equation.svg?v=20260920-1"
                  alt="definition of u"
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
                  MONODROMY_A_STAR
                    .toPrecision(15)
                }
              </strong>
            </div>

            <div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'baseline',
                  gap: '0.24em',
                  whiteSpace: 'nowrap',
                  color:
                    'rgba(232, 223, 200, 0.78)',
                  transform:
                    'translateY(7px)',
                }}
              >
                <BranchEquationSvg
                  src="/equations/b_1_equation.svg"
                  alt="b1 equals square root of 4v times 1 minus 2v over 2 pi"
                  fontSize={24}
                />

                <span>,</span>

                <BranchEquationSvg
                  src="/equations/v_equation.svg?v=20260920-1"
                  alt="definition of v"
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
                    0 + 0.330118849042346
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

        </section>

      </aside>
    </div>
  );
}
