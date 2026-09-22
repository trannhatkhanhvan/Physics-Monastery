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


function ZeroSwapViewer() {
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
          className="zero-state-label zero-state-label-row-1"
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
          className="zero-state-label zero-state-label-row-2"
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
          right: calc(100% + 14px);

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
          .zero-swap-moving,
          .zero-swap-result,
          .zero-swap-product-zero,
          .zero-swap-product-twisted,
          .zero-state-prefix {
            transition: none;
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

        <div style={{ height: '1.5rem' }} />

        <div
          className="equation-line"
          style={{ marginLeft: '-4.4rem' }}
        >
          <ZeroSwapViewer />
        </div>

        <div style={{ height: '1.5rem' }} />

        <p className="equation-description">
          Swap either side to produce a pair of <i>twisted</i> zeros.
        </p>

        <div style={{ height: '1.5rem' }} />

        <div style={{ height: '10rem' }} />
      </div>
    </LayoutWrapper>
  );
}
