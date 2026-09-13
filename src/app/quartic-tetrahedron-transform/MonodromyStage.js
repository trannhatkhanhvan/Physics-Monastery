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
    title: 'a₃',
    lines: [
      'Positive real branch value',
      'Two roots coalesce here',
      'Double root: x ≈ 0.859735116',
    ],
  },

  'minus-real': {
    title: '−a₃',
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
        (
          event.clientY -
          rectangle.top
        ) /
        rectangle.height *
        SVG.height,
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
          PARAMETER_DRAG_EDGE_MARGIN,
          Math.min(
            SVG.height -
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
      viewBox="0 0 700 470"
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
        y="1"
        width="698"
        height="468"
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
                    '/equations/negative_a_3.svg',

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
                      '/equations/a_3.svg',

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
    frameIndex,
    setFrameIndex,
  ] =
    useState(0);

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

  function reset() {
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
  }


  function beginFreeDrag() {
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
    setFreeDragging(false);

    extendFreePath(
      MONODROMY_BASEPOINT
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

        <div className={styles.rootPlotWrap}>
          <RootPlane
            trajectory={trajectory}
            frameIndex={safeFrameIndex}
            showTrails={true}
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
          <div className={styles.parameterHeaderRow}>
            <div className={styles.sideSectionTitle}>
              Parameter plane
            </div>

            <div className={styles.parameterReadout}>
              <ASymbol /> = {
                formatComplex(
                  currentParameter,
                  15
                )
              }
            </div>
          </div>

          <div className={styles.parameterPlaneWrap}>
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
            >
              Return to <ASymbol />
            </button>

            <button
              type="button"
              onClick={reset}
            >
              Reset <ASymbol />
            </button>
          </div>

          <div
            className={
              `${styles.sideNote} ${styles.returnPathNote}`
            }
          >
            Return to <ASymbol /> to close the path and compute
            the transported-root permutation.
          </div>
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

          <div className={styles.sideDataRows}>
            <div>
              <span
                aria-label="a₃"
                className={
                  `${styles.branchValueSvgLabel} ${styles.branchValueA3}`
                }
                style={{
                  '--branch-label-scale':
                    0.68,
                }}
              >
                a₃
              </span>

              <strong>
                {
                  MONODROMY_A_STAR
                    .toPrecision(15)
                }
              </strong>
            </div>

            <div>
              <span
                aria-label="b₁"
                className={
                  `${styles.branchValueSvgLabel} ${styles.branchValueB1}`
                }
                style={{
                  '--branch-label-scale':
                    0.68,
                }}
              >
                b₁
              </span>

              <strong>
                {
                  formatComplex(
                    {
                      re: 0,
                      im:
                        MONODROMY_B_STAR,
                    },
                    15
                  )
                }
              </strong>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'max-content minmax(0, 1fr) max-content',
                gridTemplateRows:
                  'auto',
                alignItems: 'center',
                columnGap: '12px',
              }}
            >
              <div
                style={{
                  position: 'relative',

                  gridColumn: '1 / 3',
                  gridRow: '1',

                  alignSelf: 'center',
                  justifySelf: 'stretch',

                  height: '12px',
                  minWidth: 0,

                  overflow: 'visible',
                }}
              >
                <img
                  src="/equations/a_scale.svg"
                  alt="a defining expression"
                  style={{
                    position: 'absolute',

                    left: 0,
                    top: '50%',

                    display: 'block',

                    width: 'auto',
                    height: 'auto',

                    maxWidth: 'none',
                    maxHeight: 'none',

                    transform:
                      'translate(1px, -50%) scale(0.69)',

                    transformOrigin:
                      'left center',

                    pointerEvents:
                      'none',
                  }}
                />
              </div>

              <strong
                style={{
                  gridColumn: '3',
                  gridRow: '1',
                }}
              >
                {
                  MONODROMY_BASEPOINT
                    .re
                    .toPrecision(15)
                }
              </strong>

              <div
                style={{
                  gridColumn: '1 / 3',
                  gridRow: '1',

                  justifySelf: 'start',
                  alignSelf: 'center',

                  marginLeft:
                    '106px',

                  color:
                    'rgba(232, 223, 200, 0.52)',

                  fontFamily:
                    '"Cambria Math", "STIX Two Math", "Times New Roman", serif',

                  fontSize: '10px',
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
          </div>
        </section>

      </aside>
    </div>
  );
}
