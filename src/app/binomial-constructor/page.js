'use client';

import { useEffect, useRef } from 'react';
import LayoutWrapper from '@/components/LayoutWrapper';
import '../globals.css';

export default function BinomialConstructor() {
  const leftEquationGroupY = 9;
  const rightEquationGroupY = -5;

  const closureDown = -23;
  const closureTitleGap = 18;
  const closureLineGap = 18;

  const transformGridRef = useRef(null);
  const firstColumnRef = useRef(null);
  const firstColumnTitleRef = useRef(null);
  const closureHostRef = useRef(null);
  const closureTitleRef = useRef(null);
  const closureLeftRef = useRef(0);

  useEffect(() => {
    const measureClosureAlignment = () => {
      const target = firstColumnRef.current;
      const titleTarget = firstColumnTitleRef.current;
      const host = closureHostRef.current;
      const closureTitle = closureTitleRef.current;

      if (!target || !host) {
        return;
      }

      const targetRect = target.getBoundingClientRect();
      const hostRect = host.getBoundingClientRect();
      const closureLeft = targetRect.left - hostRect.left;

      closureLeftRef.current = closureLeft;
      host.style.paddingLeft = `${closureLeft}px`;

      if (titleTarget && closureTitle) {
        const titleTargetRect =
          titleTarget.getBoundingClientRect();

        closureTitle.style.position = 'relative';
        closureTitle.style.left =
          `${titleTargetRect.left - targetRect.left}px`;
      }
    };

    measureClosureAlignment();

    const observer = new ResizeObserver(
      measureClosureAlignment
    );

    if (transformGridRef.current) {
      observer.observe(transformGridRef.current);
    }

    if (closureHostRef.current) {
      observer.observe(closureHostRef.current);
    }

    window.addEventListener(
      'resize',
      measureClosureAlignment
    );

    return () => {
      observer.disconnect();

      window.removeEventListener(
        'resize',
        measureClosureAlignment
      );
    };
  }, []);

  const externalWidth = 37.5;
  const internalStart = 47;
  const internalEnd = 94.5;
  const topBraceY = 29;
  const inversionBraceY = 53;
  const inversionLeft = 0;
  const inversionRight = 0;
  const braceDepth = 20;
  const labelOpacity = 50;

  const braceYOffset = 6;

  const UnderbraceLabel = ({ label }) => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
      }}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 100 24"
        preserveAspectRatio="none"
        style={{
          display: 'block',
          width: '100%',
          height: '18px',
          overflow: 'visible',
        }}
      >
        <path
          d={`M1 1
             C1 1, 1 17, 12 17
             L39 17
             C46 17, 48 17, 50 ${braceDepth}
             C52 17, 54 17, 61 17
             L88 17
             C99 17, 99 1, 99 1`}
          fill="none"
          stroke="rgba(255,255,255,0.62)"
          strokeWidth="1.15"
          strokeLinecap="round"
        />
      </svg>

      <div
        style={{
          marginTop: '2px',
          fontSize: '12px',
          lineHeight: 1.05,
          color: `rgba(255,255,255,${labelOpacity / 100})`,
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </div>
    </div>
  );

  return (
    <LayoutWrapper>
      {/* ✅ Apply page-specific background and overlay */}
      <div
  className="symbol-overlay"
  style={{
    left: 0,
    width: "100vw",
  }}
/>

      {/* ✅ Use the shared layout style for content */}
      <div
  className="partition-content"
  style={{
    width: "min(1600px, calc(100vw - 100px))",
    maxWidth: "none",
  }}
>
        <div className="legend-title">the binomial constructor</div>

        <div
  className="equation-line"
  style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: '3rem',
  }}
>
  <div
    style={{
      position: 'relative',
      display: 'inline-block',
      paddingBottom: '2.7rem',
      top: `${leftEquationGroupY}px`,
    }}
  >
    <img
      src="/equations/binomial_constructor_equation.svg"
      alt="binomial constructor equation"
      style={{
        height: '24px',
        width: 'auto',
        display: 'block',
      }}
    />

    <div
      style={{
        position: 'absolute',
        left: '0%',
        top: `${topBraceY + braceYOffset}px`,
        width: `${externalWidth}%`,
      }}
    >
      <UnderbraceLabel label="external" />
    </div>

    <div
      style={{
        position: 'absolute',
        left: `${internalStart}%`,
        top: `${topBraceY + braceYOffset}px`,
        width: `${Math.max(1, internalEnd - internalStart)}%`,
      }}
    >
      <UnderbraceLabel label="internal" />
    </div>
  </div>

  <div
    style={{
      position: 'relative',
      display: 'inline-block',
      paddingBottom: '2.7rem',
      top: `${rightEquationGroupY}px`,
    }}
  >
    <img
      src="/equations/box_symbol_equation.svg"
      alt="box symbol equation"
      style={{
        height: '52px',
        width: 'auto',
        display: 'block',
      }}
    />

    <div
      style={{
        position: 'absolute',
        left: `${inversionLeft}%`,
        right: `${inversionRight}%`,
        top: `${inversionBraceY + braceYOffset}px`,
      }}
    >
      <UnderbraceLabel label="inversion boundary" />
    </div>
  </div>
</div>

        <div style={{ height: '1.4rem' }} />

        <p className="equation-description">
          The binomial constructor encodes the two-part transformations of the {' '}
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
    hyperbolic figure-eight knot complement
  </a> within its coherent external transform space—the {' '}
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
    24-dimensional unit ball
  </a>. In Erlangen terms, the constructor separates each transform into an
          external action, its boundary data, and a bounded internal action.
          Here, <img
            src="/equations/a_external.svg"
            alt="A_external"
            style={{ height: '15px', width: 'auto', verticalAlign: '-0.25em', display: 'inline' }}
          /> = the external geometric action of each transform,{" "}
          <img
            src="/equations/b_external.svg"
            alt="B_external"
            style={{ height: '15px', width: 'auto', verticalAlign: '-0.25em', display: 'inline' }}
          /> = the external boundary data on which that action is defined, {" "}
          <img
            src="/equations/a_internal.svg"
            alt="A_internal"
            style={{ height: '15px', width: 'auto', verticalAlign: '-0.25em', display: 'inline' }}
          />= the internal geometric action, and{" "}
          <img
            src="/equations/box_symbol.svg"
            alt="box symbol"
            style={{ height: '15px', width: 'auto', verticalAlign: '-0.1em', display: 'inline' }}
          /> = the hyperbolic inversion boundary. The inversion boundary is constructed from the normalized{" "}
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
    Planck length = <img
            src="/equations/normalized_planck_length.svg"
            alt="l_p"
            style={{ height: '17px', width: 'auto', verticalAlign: '-0.40em', display: 'inline' }}
          />
  </a>, the normalized {" "}
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
    Planck mass = <img
            src="/equations/normalized_planck_mass.svg"
            alt="m_p"
            style={{ height: '17px', width: 'auto', verticalAlign: '-0.40em', display: 'inline' }}
          />
  </a>, and the square of the normalized{" "}
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
    Planck charge = <img
            src="/equations/normalized_planck_charge.svg"
            alt="q_p"
            style={{ height: '17px', width: 'auto', verticalAlign: '-0.40em', display: 'inline' }}
          />
  </a>.

        </p>

        <div style={{ height: '0.9rem' }} />

        <p className="equation-description">
          Every constant of Nature is a transform built from the roots of the {' '}
  <a
    href="/hyperbolic-partition-eq"
    target="_blank"
    rel="noopener noreferrer"
    style={{
      color: 'inherit',
      textDecoration: 'none',
    }}
    onMouseOver={e => (e.target.style.color = 'yellow')}
    onMouseOut={e => (e.target.style.color = 'inherit')}
  >
    hyperbolic partition equation.
  </a> These roots supply the primitive quantities from which the transform families are built.

          2 families are polar (expressed in powers of <img
            src="/equations/zhe_theta.svg"
            alt="zhe_theta"
            style={{ height: '14px', width: 'auto', verticalAlign: '-0.25em', display: 'inline' }}
          /> and <img
            src="/equations/zhe_r.svg"
            alt="zhe_r"
            style={{ height: '14px', width: 'auto', verticalAlign: '-0.25em', display: 'inline' }}
          />),
          while 6 are Cartesian combinations of the roots: the 2–part products, the 3–part products,
          the 2–part sums, the 3–part sums, the 2–part quadrances, and the 3–part quadrances.
        </p>

        <div style={{ height: '1.0rem' }} />

        <div
  ref={transformGridRef}
  style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(6, auto)',
    justifyContent: 'center',
    gap: '1.0rem 1.4rem',
    marginTop: '1rem',
    marginBottom: '1rem',
  }}
>
  {[
    '2-part product',
    '3-part product',
    '2-part sum',
    '3-part sum',
    '2-part quadrance',
    '3-part quadrance',
  ].map((heading) => (
    <div
      key={heading}
      ref={
        heading === '2-part product'
          ? firstColumnTitleRef
          : null
      }
      style={{
        textAlign: 'center',
        fontSize: '13px',
        lineHeight: '1.2',
        color: 'rgba(255, 255, 255, 0.72)',
        paddingBottom: '0.25rem',
        whiteSpace: 'nowrap',
      }}
    >
      {heading}
    </div>
  ))}

  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <img
      ref={firstColumnRef}
      src="/equations/2-part_products_1_and_2.svg"
      alt="2-part products 1 and 2"
      style={{ height: '13px', width: 'auto' }}
    />
  </div>
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <img src="/equations/3-part_products_1.svg" alt="3-part products 1" style={{ height: '13px', width: 'auto' }} />
  </div>
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <img
      src="/equations/2-part_sums_plus.svg"
      alt="2-part sums plus"
      style={{ height: '18px', width: 'auto' }}
    />
  </div>
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <img src="/equations/3-part_sums_plus_1.svg" alt="3-part sums plus" style={{ height: '18px', width: 'auto' }} />
  </div>
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <img src="/equations/2-part_quadrances_plus_1.svg" alt="2-part quadrances plus 1" style={{ height: '23px', width: 'auto' }} />
  </div>
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <img src="/equations/3-part_quadrances_plus_1.svg" alt="3-part quadrances plus 1" style={{ height: '24px', width: 'auto' }} />
  </div>
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <img src="/equations/2-part_products_3_and_4.svg" alt="2-part products 3 and 4" style={{ height: '13px', width: 'auto' }} />
  </div>
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <img src="/equations/3-part_products_2.svg" alt="3-part products 2" style={{ height: '13px', width: 'auto' }} />
  </div>
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <img src="/equations/2-part_sums_minus.svg" alt="2-part sums minus" style={{ height: '18px', width: 'auto' }} />
  </div>
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <img src="/equations/3-part_sums_minus_1.svg" alt="3-part sums minus 1" style={{ height: '18px', width: 'auto' }} />
  </div>
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <img src="/equations/2-part_quadrances_minus_1.svg" alt="2-part quadrances minus 1" style={{ height: '23px', width: 'auto' }} />
  </div>
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <img src="/equations/3-part_quadrances_minus_1.svg" alt="3-part quadrances minus 1" style={{ height: '24px', width: 'auto' }} />
  </div>
  {/* ⬇️ Empty slot */}
  <div />
  {/* ⬇️ Empty slot */}
  <div />
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <img src="/equations/2-part_sums_plus_3.svg" alt="2-part sums plus 3" style={{ height: '18px', width: 'auto' }} />
  </div>
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <img src="/equations/3-part_sums_plus_2.svg" alt="3-part sums plus 2" style={{ height: '18px', width: 'auto' }} />
  </div>
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <img src="/equations/2-part_quadrances_plus_3.svg" alt="2-part quadrances plus 3" style={{ height: '23px', width: 'auto' }} />
  </div>
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <img src="/equations/3-part_quadrances_plus_2.svg" alt="3-part quadrances plus 2" style={{ height: '24px', width: 'auto' }} />
  </div>
  {/* ⬇️ Empty slot */}
  <div />
  {/* ⬇️ Empty slot */}
  <div />
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <img src="/equations/2-part_sums_minus_3.svg" alt="2-part sums minus 3" style={{ height: '18px', width: 'auto' }} />
  </div>
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <img src="/equations/3-part_sums_minus_2.svg" alt="2-part sums minus 2" style={{ height: '18px', width: 'auto' }} />
  </div>
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <img src="/equations/2-part_quadrances_minus_3.svg" alt="2-part quadrances minus 3" style={{ height: '23px', width: 'auto' }} />
  </div>
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <img src="/equations/3-part_quadrances_minus_2.svg" alt="3-part quadrances minus 2" style={{ height: '24px', width: 'auto' }} />
  </div>

</div>

        <div
          ref={closureHostRef}
          style={{
            marginTop: '1.6rem',
            marginBottom: '0.5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            position: 'relative',
            width: '100%',
            boxSizing: 'border-box',
            paddingLeft: '0px',
            top: `${closureDown}px`,
          }}
        >
          <div
            ref={closureTitleRef}
            style={{
              fontSize: '14px',
              marginBottom: `${closureTitleGap}px`,
              color: 'rgba(255,255,255,0.72)',
            }}
          >
            root closure
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: `${closureLineGap}px`,
            }}
          >
            <img
              src="/equations/hyperbolic_partition_product.svg"
              alt="Hyperbolic Partition Product"
              style={{
                height: '18px',
                width: 'auto',
                display: 'block',
              }}
            />

            <img
              src="/equations/hyperbolic_partition_sum.svg"
              alt="Hyperbolic Partition Sum"
              style={{
                height: '18px',
                width: 'auto',
                display: 'block',
              }}
            />

            <img
              src="/equations/hyperbolic_partition_quadrance.svg"
              alt="Hyperbolic Partition Quadrance"
              style={{
                height: '21px',
                width: 'auto',
                display: 'block',
              }}
            />
          </div>
        </div>

        <p className="equation-description">
          Explore the{' '}
  <a
    href="/constants-of-nature"
    target="_blank"
    rel="noopener noreferrer"
    style={{
      color: 'inherit',
      textDecoration: 'none',
    }}
    onMouseOver={e => (e.target.style.color = 'yellow')}
    onMouseOut={e => (e.target.style.color = 'inherit')}
  >
    Constants of Nature
  </a> page to see how the roots of the hyperbolic partition equation construct each constant of Nature.
        </p>

        <div style={{ height: '12.5rem' }} />

      </div>
    </LayoutWrapper>
  );
}
