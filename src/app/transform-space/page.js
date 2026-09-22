'use client';

import { useEffect, useState } from 'react';
import LayoutWrapper from '@/components/LayoutWrapper';
import '../globals.css';


const ZERO_SWAP = Object.freeze({
  sourceWidth: 212.88651,
  sourceHeight: 37.128906,
  displayHeight: 42,

  // Existing 42px equation followed by the 1.5rem gap.
  rowGap: 66,

  // Boundaries between glyph groups in the original SVG.
  firstLeft: 18.5,
  firstRight: 91.7,

  secondLeft: 106.9,
  secondRight: 174.9,

  rhsLeft: 185.2,

  twisted1Width: 275.65979,
  twisted2Width: 261.04141,
  twistedSourceHeight: 40.449219,
});


const ALL_DILOG_ROWS = Object.freeze([
  {
    power: 1,
    label: "vfe",
    src: "/equations/dilog_difference_1.svg",
  },
  {
    power: 2,
    label: "twoThirdsVfe",
    src: "/equations/dilog_difference_2.svg",
  },
  {
    power: 3,
    label: "zero",
    src: "/equations/constructive_zero_1.svg",
  },
  {
    power: 4,
    label: "minusTwoThirdsVfe",
    src: "/equations/dilog_difference_4.svg",
  },
  {
    power: 5,
    label: "minusVfe",
    src: "/equations/dilog_difference_5.svg",
  },
  {
    power: 6,
    label: "zero",
    src: "/equations/constructive_zero_2.svg",
  },
]);


const DILOG_EXPANSION = Object.freeze({
  labelFadeMs: 150,
  motionWindowMs: 1850,

  // The two original zero equations move at the same speed.
  // Row 3 moves 132px in 850ms.
  // Row 6 moves 264px in 1700ms.
  row3MotionMs: 850,
  row6MotionMs: 1700,
});


function equationClip(left, right, width = ZERO_SWAP.sourceWidth) {
  const leftPercent = (left / width) * 100;
  const rightPercent = ((width - right) / width) * 100;

  return `inset(0 ${rightPercent}% 0 ${leftPercent}%)`;
}



function TransformMeasureEquation() {
  const [showLeech, setShowLeech] = useState(false);
  const [paused, setPaused] = useState(false);


  useEffect(() => {
    if (paused) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setShowLeech((value) => !value);
    }, 5000);

    return () => {
      window.clearInterval(timer);
    };
  }, [paused]);

  return (
    <>
    <button
      type="button"
      className="transform-measure-equation"
      style={{
        transform: "translateX(-132px)",
      }}
      onClick={() =>
        setShowLeech((value) => !value)
      }
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-label={
        showLeech
          ? "Show 24-dimensional hypersphere volume equation"
          : "Show Leech lattice density equation"
      }
      title="Click to switch equation"
    >
      <img
        className={
          showLeech
            ? "transform-measure-equation-image hidden"
            : "transform-measure-equation-image"
        }
        src="/equations/v_24_equation.svg"
        alt="Volume of the 24-dimensional unit hypersphere"
      />

      <img
        className={
          showLeech
            ? "transform-measure-equation-image"
            : "transform-measure-equation-image hidden"
        }
        src="/equations/leech_lattice_equation.svg"
        alt="Leech lattice density"
      />
    </button>

  </>
  );
}


function DilogFractionTwoThirds() {
  return (
    <span
      className="dilog-word-fraction"
      aria-label="two-thirds"
    >
      <span className="dilog-word-fraction-top">
        2
      </span>
      <span className="dilog-word-fraction-bottom">
        3
      </span>
    </span>
  );
}


function DilogRowLabel({ label }) {
  if (label === "zero") {
    return (
      <span className="dilog-word-label-zero">
        zero
      </span>
    );
  }

  if (label === "vfe") {
    return (
      <span className="dilog-word-label">
        figure-eight knot hyperbolic volume
      </span>
    );
  }

  if (label === "twoThirdsVfe") {
    return (
      <span className="dilog-word-label">
        <DilogFractionTwoThirds />
        <span>figure-eight knot hyperbolic volume</span>
      </span>
    );
  }

  if (label === "minusTwoThirdsVfe") {
    return (
      <span className="dilog-word-label">
        <span className="dilog-word-minus">−</span>
        <DilogFractionTwoThirds />
        <span>figure-eight knot hyperbolic volume</span>
      </span>
    );
  }

  return (
    <span className="dilog-word-label">
      <span className="dilog-word-minus">−</span>
      <span>figure-eight knot hyperbolic volume</span>
    </span>
  );
}


function DilogAllViewer({
  transitionDirection = null,
}) {
  const compactStageWidth =
    ZERO_SWAP.sourceWidth *
    (ZERO_SWAP.displayHeight / ZERO_SWAP.sourceHeight);

  const compactCompositionWidth =
    compactStageWidth + 80 + 140;

  const [motionStarted, setMotionStarted] =
    useState(false);

  useEffect(() => {
    if (!transitionDirection) {
      return undefined;
    }

    const frame = window.requestAnimationFrame(() => {
      setMotionStarted(true);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [transitionDirection]);

  const expanded =
    transitionDirection === "expand"
      ? motionStarted
      : transitionDirection === "collapse"
        ? !motionStarted
        : true;

  const transitionClass =
    transitionDirection
      ? ` dilog-transition-grid direction-${transitionDirection}`
      : "";

  const positionClass =
    expanded
      ? " is-expanded"
      : " is-collapsed";

  return (
    <div
      className="dilog-all-viewer"
      style={{
        width: `${compactCompositionWidth}px`,
      }}
    >
      <div
        className={
          `dilog-all-grid${transitionClass}${positionClass}`
        }
      >
        {ALL_DILOG_ROWS.map((row) => (
          <div
            className="dilog-all-row"
            key={row.power}
          >
            <div className="dilog-all-equation-anchor">

              <img
                className="dilog-all-equation"
                data-power={row.power}
                src={row.src}
                alt={`Dilogarithmic difference at operation power ${row.power}`}
                style={{
                  gridRow: row.power,
                }}
              />

              <div
                className={
                  row.label === "zero"
                    ? "dilog-all-label dilog-all-label-zero"
                    : "dilog-all-label"
                }
                data-power={row.power}
                style={{
                  gridRow: row.power,
                }}
              >
                <DilogRowLabel label={row.label} />
              </div>

            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


function ZeroSwapViewer({
  hideStateLabels = false,
}) {
  const [swapFirst, setSwapFirst] = useState(false);
  const [swapSecond, setSwapSecond] = useState(false);
  const [displayProductNonzero, setDisplayProductNonzero] =
    useState(false);

  const scale =
    ZERO_SWAP.displayHeight / ZERO_SWAP.sourceHeight;

  const stageWidth =
    ZERO_SWAP.sourceWidth * scale;

  const stageHeight =
    ZERO_SWAP.displayHeight + ZERO_SWAP.rowGap;

  const twistedHeight =
    ZERO_SWAP.twistedSourceHeight * scale;

  const nonzero = swapFirst !== swapSecond;

  useEffect(() => {
    const productUpdateTimer = window.setTimeout(() => {
      setDisplayProductNonzero(nonzero);
    }, 700);

    return () => {
      window.clearTimeout(productUpdateTimer);
    };
  }, [nonzero]);

  const row1 =
    "/equations/constructive_zero_1.svg";

  const row2 =
    "/equations/constructive_zero_2.svg";


  const fixedSlices = [
    [0, ZERO_SWAP.firstLeft],

    [
      ZERO_SWAP.firstRight,
      ZERO_SWAP.secondLeft,
    ],

    [
      ZERO_SWAP.secondRight,
      ZERO_SWAP.rhsLeft,
    ],
  ];


  const fixedPieces = (src, top, key) =>
    fixedSlices.map(([left, right], index) => (
      <img
        key={`${key}-${index}`}
        className="zero-swap-layer"
        src={src}
        alt=""
        aria-hidden="true"
        style={{
          top: `${top}px`,
          height: `${ZERO_SWAP.displayHeight}px`,
          clipPath: equationClip(left, right),
        }}
      />
    ));


  const movingPiece = (
    src,
    top,
    left,
    right,
    translateY,
    key
  ) => (
    <img
      key={key}
      className="zero-swap-layer zero-swap-moving"
      src={src}
      alt=""
      aria-hidden="true"
      style={{
        top: `${top}px`,
        height: `${ZERO_SWAP.displayHeight}px`,
        clipPath: equationClip(left, right),
        transform: `translateY(${translateY}px)`,
      }}
    />
  );


  const zeroResult = (
    src,
    top,
    visible,
    key
  ) => (
    <img
      key={key}
      className="zero-swap-layer zero-swap-result"
      src={src}
      alt=""
      aria-hidden="true"
      style={{
        top: `${top}px`,
        height: `${ZERO_SWAP.displayHeight}px`,
        clipPath: equationClip(
          ZERO_SWAP.rhsLeft,
          ZERO_SWAP.sourceWidth
        ),
        opacity: visible ? 1 : 0,
      }}
    />
  );


  const twistedResult = (
    src,
    width,
    top,
    visible,
    key
  ) => (
    <img
      key={key}
      className="zero-swap-layer zero-swap-result zero-swap-twisted-result"
      src={src}
      alt=""
      aria-hidden="true"
      style={{
        top: `${top}px`,
        height: `${twistedHeight}px`,
        clipPath: equationClip(
          ZERO_SWAP.rhsLeft,
          width,
          width
        ),
        opacity: visible ? 1 : 0,
      }}
    />
  );


  return (
    <div className="zero-swap-composition">

      <div
        className="zero-swap-viewer"
        style={{
          width: `${stageWidth}px`,
          transform: "translate(35px, 0px)",
          "--zero-content-x": "14px",
        }}
      >

      <div
        className="zero-swap-stage"
        style={{
          width: `${stageWidth}px`,
          height: `${stageHeight}px`,
        }}
      >

        <div
          className={
            hideStateLabels
              ? "zero-state-label zero-state-label-row-1 hidden"
              : "zero-state-label zero-state-label-row-1"
          }
          aria-hidden="true"
        >
          <span
            className={
              displayProductNonzero
                ? "zero-state-prefix visible"
                : "zero-state-prefix"
            }
          >
            twisted-
          </span>
          <span className="zero-state-word">
            zero
          </span>
        </div>

        <div
          className={
            hideStateLabels
              ? "zero-state-label zero-state-label-row-2 hidden"
              : "zero-state-label zero-state-label-row-2"
          }
          aria-hidden="true"
        >
          <span
            className={
              displayProductNonzero
                ? "zero-state-prefix visible"
                : "zero-state-prefix"
            }
          >
            twisted-
          </span>
          <span className="zero-state-word">
            zero
          </span>
        </div>

        {/* Fixed equation geometry */}
        {fixedPieces(row1, 0, "fixed-row-1")}
        {fixedPieces(
          row2,
          ZERO_SWAP.rowGap,
          "fixed-row-2"
        )}


        {/* FIRST Li₂ expressions */}
        {movingPiece(
          row1,
          0,
          ZERO_SWAP.firstLeft,
          ZERO_SWAP.firstRight,
          swapFirst ? ZERO_SWAP.rowGap : 0,
          "first-row-1"
        )}

        {movingPiece(
          row2,
          ZERO_SWAP.rowGap,
          ZERO_SWAP.firstLeft,
          ZERO_SWAP.firstRight,
          swapFirst ? -ZERO_SWAP.rowGap : 0,
          "first-row-2"
        )}


        {/* SECOND Li₂ expressions */}
        {movingPiece(
          row1,
          0,
          ZERO_SWAP.secondLeft,
          ZERO_SWAP.secondRight,
          swapSecond ? ZERO_SWAP.rowGap : 0,
          "second-row-1"
        )}

        {movingPiece(
          row2,
          ZERO_SWAP.rowGap,
          ZERO_SWAP.secondLeft,
          ZERO_SWAP.secondRight,
          swapSecond ? -ZERO_SWAP.rowGap : 0,
          "second-row-2"
        )}


        {/* Original zero results */}
        {zeroResult(
          row1,
          0,
          !nonzero,
          "zero-row-1"
        )}

        {zeroResult(
          row2,
          ZERO_SWAP.rowGap,
          !nonzero,
          "zero-row-2"
        )}


        {/*
          SECOND pair swapped:
          row 1 gets negative result
          row 2 gets positive result
        */}
        {twistedResult(
          "/equations/twisted_zero_1.svg",
          ZERO_SWAP.twisted1Width,
          0,
          nonzero && swapSecond,
          "twisted-negative-row-1"
        )}

        {twistedResult(
          "/equations/twisted_zero_2.svg",
          ZERO_SWAP.twisted2Width,
          ZERO_SWAP.rowGap,
          nonzero && swapSecond,
          "twisted-positive-row-2"
        )}


        {/*
          FIRST pair swapped:
          same results appear on opposite rows.
        */}
        {twistedResult(
          "/equations/twisted_zero_2.svg",
          ZERO_SWAP.twisted2Width,
          0,
          nonzero && swapFirst,
          "twisted-positive-row-1"
        )}

        {twistedResult(
          "/equations/twisted_zero_1.svg",
          ZERO_SWAP.twisted1Width,
          ZERO_SWAP.rowGap,
          nonzero && swapFirst,
          "twisted-negative-row-2"
        )}

      </div>


      <div className="zero-swap-controls">

        <button
          type="button"
          className={
            swapFirst
              ? "zero-swap-button active"
              : "zero-swap-button"
          }
          style={{
            width: "87px",
            height: "31px",
            transform: "translate(-10px, 4px) scale(0.8)",
            transformOrigin: "center center",
          }}
          onClick={() =>
            setSwapFirst(value => !value)
          }
        >
          Swap left
        </button>

        <button
          type="button"
          className={
            swapSecond
              ? "zero-swap-button active"
              : "zero-swap-button"
          }
          style={{
            width: "87px",
            height: "31px",
            transform: "translate(-9px, 4px) scale(0.8)",
            transformOrigin: "center center",
          }}
          onClick={() =>
            setSwapSecond(value => !value)
          }
        >
          Swap right
        </button>

      </div>

      </div>

      <div
        className="zero-swap-product-group"
        style={{
          transform: "translate(99px, -31px)",
        }}
      >
        <div className="zero-swap-product-stage">

          <img
            className="zero-swap-product-prefix"
            src="/equations/product_equals.svg"
            alt="product equals"
          />

          <img
            className={
              displayProductNonzero
                ? "zero-swap-product-zero hidden"
                : "zero-swap-product-zero"
            }
            src="/equations/zero.svg"
            alt="zero"
          />

          <img
            className={
              displayProductNonzero
                ? "zero-swap-product-twisted"
                : "zero-swap-product-twisted hidden"
            }
            src="/equations/twisted_state.svg"
            alt="four pi over eight to the fourth power"
          />

        </div>

      </div>

    </div>
  );
}


export default function TransformSpace() {
  const [dilogMode, setDilogMode] =
    useState("zeros");

  const dilogAnimating =
    dilogMode !== "zeros" &&
    dilogMode !== "all";

  useEffect(() => {
    let timer = null;

    if (dilogMode === "pre-expand") {
      timer = window.setTimeout(() => {
        setDilogMode("expanding");
      }, DILOG_EXPANSION.labelFadeMs);
    }

    if (dilogMode === "expanding") {
      timer = window.setTimeout(() => {
        setDilogMode("all");
      }, DILOG_EXPANSION.motionWindowMs);
    }

    if (dilogMode === "collapsing") {
      timer = window.setTimeout(() => {
        setDilogMode("post-collapse");
      }, DILOG_EXPANSION.motionWindowMs);
    }

    if (dilogMode === "post-collapse") {
      timer = window.setTimeout(() => {
        setDilogMode("zeros");
      }, DILOG_EXPANSION.labelFadeMs);
    }

    return () => {
      if (timer !== null) {
        window.clearTimeout(timer);
      }
    };
  }, [dilogMode]);

  const handleDilogModeToggle = () => {
    if (dilogAnimating) {
      return;
    }

    if (dilogMode === "zeros") {
      setDilogMode("pre-expand");
      return;
    }

    setDilogMode("collapsing");
  };


  return (
    <LayoutWrapper>
      <style>{`
        .transform-measure-equation {
          position: relative;

          display: block;

          width: 640px;
          height: 54px;

          margin: 0;
          padding: 0;

          border: 0;
          background: transparent;

          cursor: pointer;
        }

        .transform-measure-equation-image {
          position: absolute;

          right: 0;
          left: auto;
          top: 50%;

          height: 42px;
          width: auto;
          max-width: none;

          transform: translateY(-50%);

          opacity: 1;

          transition:
            opacity 450ms ease;

          pointer-events: none;
          user-select: none;
        }

        .transform-measure-equation-image.hidden {
          opacity: 0;
        }


        .dilog-section-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          width: 100%;
        }

        .dilog-section-heading .equation-description {
          flex: 1;
          min-width: 0;
        }

        .dilog-mode-toggle {
          flex: 0 0 auto;

          width: 70px;
          height: 25px;
          padding: 0;

          background: rgba(22, 22, 18, 0.36);
          color: rgba(242, 237, 224, 0.94);

          border: 1px solid rgba(214, 207, 188, 0.48);
          border-radius: 7px;

          font-family:
            "Times New Roman",
            Times,
            serif;
          font-size: 10.5px;
          font-weight: normal;

          cursor: pointer;

          transition:
            background 160ms ease,
            border-color 160ms ease,
            color 160ms ease;
        }

        .dilog-mode-toggle:hover {
          background: rgba(232, 223, 200, 0.10);
          border-color: rgba(232, 223, 200, 0.72);
          color: rgba(255, 250, 236, 1);
        }

        .dilog-all-viewer {
          display: block;

          flex-shrink: 0;

          margin: 0;
          overflow: visible;
        }

        .dilog-all-grid {
          display: grid;

          /*
           * Column 1 = widest equation.
           * Column 2 = shared label column.
           *
           * This inner grid may extend beyond the fixed-width
           * outer viewer. That is intentional: labels must not
           * participate in centering the equation group.
           */
          grid-template-columns:
            max-content
            285px;

          column-gap: 14px;

          /*
           * Match compact Zeros mode:
           * 42px equation height + 24px visible gap
           * = 66px row-to-row spacing.
           */
          row-gap: 24px;

          align-items: center;

          width: max-content;

          /*
           * Exact expanded equation anchor.
           *
           * 35px compact viewer shift
           * + 14px compact equation-content shift
           * = 49px.
           *
           * Do not change this when adjusting labels.
           */
          padding-left: 49px;
        }

        .dilog-all-row,
        .dilog-all-equation-anchor {
          display: contents;
        }

        .dilog-all-label {
          position: static;

          grid-column: 2;

          width: 285px;

          transform: none;

          text-align: left;

          color: rgba(242, 237, 224, 0.58);

          opacity: 1;
          animation:
            dilog-all-labels-in
            180ms
            ease
            both;

          font-family:
            "Times New Roman",
            Times,
            serif;
          font-size: 13px;
          font-style: normal;
          line-height: 1.05;

          white-space: normal;
          pointer-events: none;
          user-select: none;
        }

        @keyframes dilog-all-labels-in {
          from {
            opacity: 0;
          }

          to {
            opacity: 1;
          }
        }

        .dilog-all-label-zero {
          color: rgba(242, 237, 224, 0.58);
          font-size: 15px;
          font-style: italic;
        }

        .dilog-word-label {
          display: inline-flex;
          align-items: center;
          justify-content: flex-start;
          gap: 4px;

          white-space: nowrap;
        }

        .dilog-word-label-zero {
          font-style: italic;
        }

        .dilog-word-minus {
          display: inline-block;

          font-family:
            "Times New Roman",
            Times,
            serif;
          font-style: normal;
          font-size: 1.08em;
          line-height: 1;
        }

        .dilog-word-fraction {
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          min-width: 12px;

          font-family:
            "Times New Roman",
            Times,
            serif;
          font-style: italic;
          font-size: 0.92em;
          line-height: 0.72;

          vertical-align: middle;
        }

        .dilog-word-fraction-top {
          display: block;
          min-width: 11px;
          padding: 0 1px 1px;

          text-align: center;

          border-bottom:
            1px solid rgba(242, 237, 224, 0.58);
        }

        .dilog-word-fraction-bottom {
          display: block;
          min-width: 11px;
          padding-top: 1px;

          text-align: center;
        }

        .dilog-all-equation {
          grid-column: 1;

          display: block;

          height: 42px;
          width: auto;
          max-width: 100%;

          margin-left: 0;
        }


        /*
         * --------------------------------------------------
         * ZEROS <-> ALL expansion animation
         * --------------------------------------------------
         *
         * STRICT SLOT MOTION
         *
         * Every vertical move is exactly one 66px row.
         * A destination row is cleared before an original
         * zero equation is allowed to move into it.
         *
         * This prevents row 6 from visually overtaking or
         * passing through another visible equation.
         */

        .dilog-transition-grid
        .dilog-all-equation,
        .dilog-transition-grid
        .dilog-all-label {
          will-change:
            transform,
            opacity;
        }


        /*
         * Static compact positions before expansion:
         *
         * p3 final row = 132px
         * compact row  =   0px
         * transform    = -132px
         *
         * p6 final row = 330px
         * compact row  =  66px
         * transform    = -264px
         */

        .dilog-transition-grid.is-collapsed
        .dilog-all-equation[data-power="3"] {
          transform: translateY(-132px);
        }

        .dilog-transition-grid.is-collapsed
        .dilog-all-equation[data-power="6"] {
          transform: translateY(-264px);
        }

        .dilog-transition-grid.is-expanded
        .dilog-all-equation[data-power="3"],
        .dilog-transition-grid.is-expanded
        .dilog-all-equation[data-power="6"] {
          transform: translateY(0);
        }


        /*
         * EXPAND
         *
         * 0-300      both zeros move down one slot
         * 300-400    hold; row 1 appears
         * 400-700    both zeros move down one slot
         * 700-800    hold; row 2 appears, p3 lands
         * 800-1100   p6 moves down one slot
         * 1100-1200  hold; row 4 appears
         * 1200-1500  p6 moves down one slot
         * 1500+      row 5 and p6 zero label appear
         */

        .dilog-transition-grid.direction-expand.is-expanded
        .dilog-all-equation[data-power="3"] {
          animation:
            dilog-expand-p3
            1850ms
            linear
            forwards;
        }

        .dilog-transition-grid.direction-expand.is-expanded
        .dilog-all-equation[data-power="6"] {
          animation:
            dilog-expand-p6
            1850ms
            linear
            forwards;
        }

        @keyframes dilog-expand-p3 {
          0% {
            transform: translateY(-132px);
            animation-timing-function:
              cubic-bezier(0.42, 0, 0.20, 1);
          }

          18% {
            transform: translateY(-66px);
          }

          18.6% {
            transform: translateY(-66px);
            animation-timing-function:
              cubic-bezier(0.42, 0, 0.20, 1);
          }

          38% {
            transform: translateY(0);
          }

          100% {
            transform: translateY(0);
          }
        }

        @keyframes dilog-expand-p6 {
          0% {
            transform: translateY(-264px);
            animation-timing-function:
              cubic-bezier(0.42, 0, 0.20, 1);
          }

          18% {
            transform: translateY(-198px);
          }

          18.6% {
            transform: translateY(-198px);
            animation-timing-function:
              cubic-bezier(0.42, 0, 0.20, 1);
          }

          38% {
            transform: translateY(-132px);
          }

          38.6% {
            transform: translateY(-132px);
            animation-timing-function:
              cubic-bezier(0.42, 0, 0.20, 1);
          }

          58% {
            transform: translateY(-66px);
          }

          58.6% {
            transform: translateY(-66px);
            animation-timing-function:
              cubic-bezier(0.42, 0, 0.20, 1);
          }

          78% {
            transform: translateY(0);
          }

          100% {
            transform: translateY(0);
          }
        }


        /*
         * COLLAPSE
         *
         * 0-100      row 5 clears
         * 100-400    p6 moves up one slot
         * 400-500    row 4 clears
         * 500-800    p6 moves up one slot
         * 800-900    row 2 clears
         * 900-1200   p3 + p6 move up together
         * 1200-1300  row 1 clears
         * 1300-1600  p3 + p6 move up together
         * 1600+      compact positions held
         */

        .dilog-transition-grid.direction-collapse.is-collapsed
        .dilog-all-equation[data-power="3"] {
          animation:
            dilog-collapse-p3
            1850ms
            linear
            forwards;
        }

        .dilog-transition-grid.direction-collapse.is-collapsed
        .dilog-all-equation[data-power="6"] {
          animation:
            dilog-collapse-p6
            1850ms
            linear
            forwards;
        }

        @keyframes dilog-collapse-p3 {
          0% {
            transform: translateY(0);
          }

          40% {
            transform: translateY(0);
            animation-timing-function:
              cubic-bezier(0.42, 0, 0.20, 1);
          }

          58% {
            transform: translateY(-66px);
          }

          60% {
            transform: translateY(-66px);
            animation-timing-function:
              cubic-bezier(0.42, 0, 0.20, 1);
          }

          78% {
            transform: translateY(-132px);
          }

          100% {
            transform: translateY(-132px);
          }
        }

        @keyframes dilog-collapse-p6 {
          0% {
            transform: translateY(0);
          }

          0.6% {
            transform: translateY(0);
            animation-timing-function:
              cubic-bezier(0.42, 0, 0.20, 1);
          }

          20% {
            transform: translateY(-66px);
          }

          20.6% {
            transform: translateY(-66px);
            animation-timing-function:
              cubic-bezier(0.42, 0, 0.20, 1);
          }

          40% {
            transform: translateY(-132px);
          }

          40.6% {
            transform: translateY(-132px);
            animation-timing-function:
              cubic-bezier(0.42, 0, 0.20, 1);
          }

          60% {
            transform: translateY(-198px);
          }

          60.6% {
            transform: translateY(-198px);
            animation-timing-function:
              cubic-bezier(0.42, 0, 0.20, 1);
          }

          80% {
            transform: translateY(-264px);
          }

          100% {
            transform: translateY(-264px);
          }
        }


        /*
         * The four added equations do not travel.
         * They appear only AFTER their slot has been vacated.
         */

        .dilog-transition-grid
        .dilog-all-equation[data-power="1"],
        .dilog-transition-grid
        .dilog-all-equation[data-power="2"],
        .dilog-transition-grid
        .dilog-all-equation[data-power="4"],
        .dilog-transition-grid
        .dilog-all-equation[data-power="5"] {
          transition:
            opacity 180ms ease;
        }

        .dilog-transition-grid.is-collapsed
        .dilog-all-equation[data-power="1"],
        .dilog-transition-grid.is-collapsed
        .dilog-all-equation[data-power="2"],
        .dilog-transition-grid.is-collapsed
        .dilog-all-equation[data-power="4"],
        .dilog-transition-grid.is-collapsed
        .dilog-all-equation[data-power="5"] {
          opacity: 0;
        }

        .dilog-transition-grid.is-expanded
        .dilog-all-equation[data-power="1"],
        .dilog-transition-grid.is-expanded
        .dilog-all-equation[data-power="2"],
        .dilog-transition-grid.is-expanded
        .dilog-all-equation[data-power="4"],
        .dilog-transition-grid.is-expanded
        .dilog-all-equation[data-power="5"] {
          opacity: 1;
        }


        /* EXPAND: rows appear only after being cleared */

        .dilog-transition-grid.direction-expand
        .dilog-all-equation[data-power="1"] {
          transition-delay: 300ms;
        }

        .dilog-transition-grid.direction-expand
        .dilog-all-equation[data-power="2"] {
          transition-delay: 700ms;
        }

        .dilog-transition-grid.direction-expand
        .dilog-all-equation[data-power="4"] {
          transition-delay: 1100ms;
        }

        .dilog-transition-grid.direction-expand
        .dilog-all-equation[data-power="5"] {
          transition-delay: 1500ms;
        }


        /* COLLAPSE: clear each slot BEFORE entering it */

        .dilog-transition-grid.direction-collapse
        .dilog-all-equation[data-power="5"] {
          transition-delay: 0ms;
        }

        .dilog-transition-grid.direction-collapse
        .dilog-all-equation[data-power="4"] {
          transition-delay: 400ms;
        }

        .dilog-transition-grid.direction-collapse
        .dilog-all-equation[data-power="2"] {
          transition-delay: 800ms;
        }

        .dilog-transition-grid.direction-collapse
        .dilog-all-equation[data-power="1"] {
          transition-delay: 1200ms;
        }


        /*
         * LABELS
         *
         * Keep the entire motion sequence visually clean:
         *
         * EXPAND:
         *   compact zero labels disappear first;
         *   no expanded labels are visible while equations move;
         *   all six labels appear together only after All is settled.
         *
         * COLLAPSE:
         *   all expanded labels disappear immediately;
         *   no labels are visible while equations move;
         *   compact zero labels return only after collapse finishes.
         */

        .dilog-transition-grid
        .dilog-all-label {
          animation: none;
          opacity: 0;
          transition:
            opacity 150ms ease;
        }


        .dilog-mode-toggle:disabled {
          opacity: 0.62;
          cursor: default;
        }


        .zero-swap-composition {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 80px;
          overflow: visible;
        }

        .zero-swap-viewer {
          display: inline-flex;
          flex-direction: column;
          align-items: flex-start;
          overflow: visible;
          flex-shrink: 0;
        }

        .zero-swap-product-group {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex-shrink: 0;
        }

        .zero-swap-product-stage {
          position: relative;
          width: 140px;
          height: 42px;
        }

        .zero-swap-product-prefix,
        .zero-swap-product-zero,
        .zero-swap-product-twisted {
          position: absolute;
          width: auto;
          max-width: none;
          pointer-events: none;
          user-select: none;
        }

        .zero-swap-product-prefix {
          left: 0.28px;
          top: 16.83px;
          height: 16.32px;
        }

        .zero-swap-product-zero {
          left: 84.43px;
          top: 17.30px;
          height: 12.25px;
          opacity: 1;
          transition: opacity 180ms linear;
        }

        .zero-swap-product-twisted {
          left: 85.08px;
          top: 0;
          height: 42px;
          opacity: 1;
          transition: opacity 180ms linear;
        }

        .zero-swap-product-zero.hidden,
        .zero-swap-product-twisted.hidden {
          opacity: 0;
        }

        .zero-swap-stage {
          position: relative;
          overflow: visible;
        }

        .zero-state-label {
          position: absolute;
          right: 100%;

          width: 92px;
          height: 24px;

          color: rgba(242, 237, 224, 0.58);

          font-family:
            "Times New Roman",
            Times,
            serif;
          font-size: 15px;
          font-style: italic;

          white-space: nowrap;
          pointer-events: none;
          user-select: none;

          z-index: 5;

          opacity: 1;
          transition:
            opacity 150ms linear;
        }

        .zero-state-label.hidden {
          opacity: 0;
        }

        .zero-state-label-row-1 {
          top: 9px;
        }

        .zero-state-label-row-2 {
          top: 75px;
        }

        .zero-state-word {
          position: absolute;
          right: 0;
          top: 0;
        }

        .zero-state-prefix {
          position: absolute;
          right: 29px;
          top: 0;

          opacity: 0;

          transition:
            opacity 180ms linear;
        }

        .zero-state-prefix.visible {
          opacity: 1;
        }

        .zero-swap-layer {
          position: absolute;
          left: var(--zero-content-x, 0px);
          width: auto;
          max-width: none;
          pointer-events: none;
          user-select: none;
        }

        .zero-swap-moving {
          z-index: 2;
          transition:
            transform 700ms
            cubic-bezier(0.4, 0, 0.2, 1);
          will-change: transform;
        }

        .zero-swap-result {
          z-index: 3;
          transition: opacity 180ms linear 360ms;
        }

        .zero-swap-twisted-result {
          /*
           * Tiny vertical correction can be tuned after
           * seeing the first render.
           */
          transform: translateY(-3.5px);
        }

        .zero-swap-controls {
          display: flex;
          align-items: center;
          align-self: center;
          width: max-content;
          gap: 8px;
          margin-top: 12px;

          transform:
            translateX(var(--zero-content-x, 0px));
        }

        .zero-swap-button {
          padding: 0 14px;

          background: rgba(22, 22, 18, 0.36);
          color: rgba(242, 237, 224, 0.94);

          border: 1px solid rgba(214, 207, 188, 0.48);
          border-radius: 9px;

          font-family:
            "Times New Roman",
            Times,
            serif;
          font-size: 13px;
          font-weight: normal;

          cursor: pointer;

          transition:
            background 160ms ease,
            border-color 160ms ease,
            color 160ms ease;
        }

        .zero-swap-button:hover {
          background: rgba(232, 223, 200, 0.10);
          border-color: rgba(232, 223, 200, 0.72);
          color: rgba(255, 250, 236, 1);
        }

        .zero-swap-button.active {
          background: rgba(232, 223, 200, 0.14);
          border-color: rgba(232, 223, 200, 0.78);
          color: rgba(255, 250, 236, 1);
        }

        @media (prefers-reduced-motion: reduce) {
          .transform-measure-equation-image,
          .dilog-transition-grid .dilog-all-equation,
          .dilog-transition-grid .dilog-all-label,
          .zero-state-label,
          .zero-swap-moving,
          .zero-swap-result,
          .zero-swap-product-zero,
          .zero-swap-product-twisted,
          .zero-state-prefix {
            transition: none;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .dilog-transition-grid .dilog-all-equation,
          .dilog-transition-grid .dilog-all-label,
          .dilog-all-label {
            animation: none !important;
          }
        }

      `}</style>
      {/* ✅ Page-specific overlay */}
      <div
  className="symbol-overlay"
  style={{
    left: 0,
    width: "100vw",
  }}
/>

      {/* ✅ Shared layout and font styling */}
      <div
  className="partition-content"
  style={{
    width: "min(1750px, calc(100vw - var(--sidebar-width) - 4rem))",
    maxWidth: "none",
  }}
>
        <div
          className="legend-title"
          style={{ marginBottom: "1.5rem" }}
        >
          the transform space
        </div>

        <div className="equation-line">
          <TransformMeasureEquation />
        </div>

        <div style={{ height: '1.5rem' }} />

        <p className="equation-description">
          The transform space is the set of coherent transformations available to the minimal arena—the{' '}
  <a
    href="/simplest-manifold"
    target="_blank"
    rel="noopener noreferrer"
    style={{
      color: 'inherit',
      textDecoration: 'none',
    }}
    onMouseOver={e => (e.target.style.color = 'yellow')}
    onMouseOut={e => (e.target.style.color = 'inherit')}
  >
    hyperbolic figure-eight knot
  </a>.
            Its measure is equal to both the volume of the {' '}
  <a
    href="https://mathworld.wolfram.com/HyperspherePacking.html"
    target="_blank"
    rel="noopener noreferrer"
    style={{
      color: 'inherit',
      textDecoration: 'none',
    }}
    onMouseOver={e => (e.target.style.color = 'yellow')}
    onMouseOut={e => (e.target.style.color = 'inherit')}
  >
    24-dimensional unit hypersphere
  </a>{' '}( <img
            src="/equations/v_24_symbol.svg"
            alt="V_24"
            style={{ height: '16px', width: 'auto', display: 'inline-block', position: 'relative', top: '0px' }}
          /> ), and the density of the {' '}
  <a
    href="https://en.wikipedia.org/wiki/Leech_lattice"
    target="_blank"
    rel="noopener noreferrer"
    style={{
      color: 'inherit',
      textDecoration: 'none',
    }}
    onMouseOver={e => (e.target.style.color = 'yellow')}
    onMouseOut={e => (e.target.style.color = 'inherit')}
  >
    Leech lattice{' '}
  </a>( <img
            src="/equations/leech_lattice_symbol.svg"
            alt="rho_Leech"
            style={{ height: '12px', width: 'auto', display: 'inline-block', position: 'relative', top: '1px' }}
          /> ). Here, &nbsp;<img
            src="/equations/factorial_5_symbol.svg"
            alt="5!"
            style={{ height: '13px', width: 'auto', display: 'inline-block', position: 'relative', top: '-2px' }}
          /> = 120, the <a
              href="https://en.wikipedia.org/wiki/Factorial"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            factorial
          </a> of &nbsp;<img
            src="/equations/red-5.svg"
            alt="5"
            style={{ height: '13px', width: 'auto', display: 'inline-block', position: 'relative', top: '-2px' }}
          />, and &nbsp;<img
            src="/equations/derangement_5_symbol.svg"
            alt="!5"
            style={{ height: '13px', width: 'auto', display: 'inline-block', position: 'relative', top: '-2px' }}
          /> = 44, the number of <a
              href="https://en.wikipedia.org/wiki/Derangement"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            derangements
          </a> of &nbsp;<img
            src="/equations/red-5.svg"
            alt="5"
            style={{ height: '14px', width: 'auto', display: 'inline-block', position: 'relative', top: '-3px' }}
          /> objects.
        </p>

        <div style={{ height: '0.0rem' }} />

        <p className="equation-description">
  The divisors of this space ( <img
            src="/equations/factorial_5_symbol.svg"
            alt="5!"
            style={{ height: '13px', width: 'auto', display: 'inline-block', position: 'relative', top: '-2px' }}
          />, &nbsp;<img
            src="/equations/derangement_5_symbol.svg"
            alt="!5"
            style={{ height: '13px', width: 'auto', display: 'inline-block', position: 'relative', top: '-2px' }}
          />, 35, 18, 32, and 8 ) define its coherent structure.
  The first divisor introduces the{' '}
  <a
    href="https://en.wikipedia.org/wiki/120-cell"
    target="_blank"
    rel="noopener noreferrer"
    style={{
      color: 'inherit',
      textDecoration: 'none',
    }}
    onMouseOver={e => (e.target.style.color = 'yellow')}
    onMouseOut={e => (e.target.style.color = 'inherit')}
  >
    120–cell
  </a>{' '}structure. The remaining divisors ( 44, 35, 18, 32, and 8 ) define the quantized powers of the {' '}
  <a
    href="/planck-constants"
    target="_blank"
    rel="noopener noreferrer"
    style={{
      color: 'inherit',
      textDecoration: 'none',
    }}
    onMouseOver={e => (e.target.style.color = 'yellow')}
    onMouseOut={e => (e.target.style.color = 'inherit')}
  >
    Planck constants
  </a>: the division boundaries that connect the transform space. The 120-cell encodes relationships among the convex regular polytopes of the first 4 dimensions. The highest-power component of this structure is determined by the product of the {' '}
  <a
    href="/simplest-manifold"
    target="_blank"
    rel="noopener noreferrer"
    style={{
      color: 'inherit',
      textDecoration: 'none',
    }}
    onMouseOver={e => (e.target.style.color = 'yellow')}
    onMouseOut={e => (e.target.style.color = 'inherit')}
  >
    hyperbolic figure-eight knot
  </a>&apos;s <i>twisted</i> zeros.
        </p>

        <div style={{ height: '1.0rem' }} />

        <div className="dilog-section-heading">
          <p className="equation-description">
          The constructive zeros of the{" "}
          <a
            href="/simplest-manifold"
            style={{
              color: "inherit",
              textDecoration: "none",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.color = "yellow";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = "inherit";
            }}
          >
            hyperbolic figure-eight knot
          </a>{" "}
          are:
          </p>
          <button
            type="button"
            className="dilog-mode-toggle"
            onClick={handleDilogModeToggle}
            disabled={dilogAnimating}
          >
            {
              dilogMode === "all" ||
              dilogMode === "collapsing"
                ? "Zeros"
                : "All"
            }
          </button>
        </div>

        <div style={{ height: '1.5rem' }} />

        <div
          className="equation-line"
          style={{
            marginLeft: "-4.4rem",
            transform: "translateX(-19px)",
          }}
        >
          {dilogMode === "zeros" && (
            <ZeroSwapViewer />
          )}

          {dilogMode === "pre-expand" && (
            <ZeroSwapViewer
              hideStateLabels={true}
            />
          )}

          {dilogMode === "expanding" && (
            <DilogAllViewer
              key="dilog-expanding"
              transitionDirection="expand"
            />
          )}

          {dilogMode === "all" && (
            <DilogAllViewer
              key="dilog-all"
            />
          )}

          {dilogMode === "collapsing" && (
            <DilogAllViewer
              key="dilog-collapsing"
              transitionDirection="collapse"
            />
          )}

          {dilogMode === "post-collapse" && (
            <ZeroSwapViewer
              hideStateLabels={true}
            />
          )}
        </div>

        {(
          dilogMode === "zeros" ||
          dilogMode === "pre-expand" ||
          dilogMode === "post-collapse"
        ) && (
          <>
            <div style={{ height: '1.5rem' }} />

            <p className="equation-description">
              Swap either side to produce a pair of <i>twisted</i> zeros.
            </p>

            <div style={{ height: '1.5rem' }} />
          </>
        )}

        <div style={{ height: '10rem' }} />
      </div>
    </LayoutWrapper>
  );
}
