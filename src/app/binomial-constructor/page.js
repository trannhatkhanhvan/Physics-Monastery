'use client';

import LayoutWrapper from '@/components/LayoutWrapper';
import '../globals.css';

export default function BinomialConstructor() {
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
      <div className="partition-content">
        <div className="legend-title">the binomial constructor</div>

        <div className="equation-line" style={{ display: 'flex', justifyContent: 'center', gap: '3rem' }}>
  <img
    src="/equations/binomial_constructor_equation.svg"
    alt="binomial constructor equation"
    style={{ height: '30px', width: 'auto' }}
  />
  <img
    src="/equations/box_symbol_equation.svg"
    alt="box symbol equation"
    style={{ height: '48px', width: 'auto' }}
  />
</div>

        <div style={{ height: '2.0rem' }} />

        <p className="equation-description">
          The binomial constructor encodes the general two-part structure of the complement of the {' '}
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
    hyperbolic figure eight knot
  </a>,
          and its coherent external transform space—the volume of the {' '}
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
  </a>.
          Where <img
            src="/equations/a_external.svg"
            alt="A_external"
            style={{ height: '15px', width: 'auto', verticalAlign: '-0.25em', display: 'inline' }}
          /> = the external geometric action of each transform,{" "}
          <img
            src="/equations/b_external.svg"
            alt="B_external"
            style={{ height: '15px', width: 'auto', verticalAlign: '-0.25em', display: 'inline' }}
          /> = the external boundaries that action takes place on—expressed in {' '}
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
  </a>,{" "}
          <img
            src="/equations/a_internal.svg"
            alt="A_internal"
            style={{ height: '15px', width: 'auto', verticalAlign: '-0.25em', display: 'inline' }}
          />= the internal geometric action, and{" "}
          <img
            src="/equations/box_symbol.svg"
            alt="box symbol"
            style={{ height: '15px', width: 'auto', verticalAlign: '-0.1em', display: 'inline' }}
          /> = the hyperbolic inversion boundary—constructed from the normalized{" "}
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

        <div style={{ height: '1.5rem' }} />

        <p className="equation-description">
          Every constant of Nature uses one of the {' '}
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
    hyperbolic partition equation
  </a>&apos;s simple (one–dimensional) transforms—defining a symmetric transform coherently maintained by this bi–part structure.

          Those transforms include: two polar expressions (expressed in powers of <img
            src="/equations/zhe_theta.svg"
            alt="zhe_theta"
            style={{ height: '14px', width: 'auto', verticalAlign: '-0.25em', display: 'inline' }}
          /> and <img
            src="/equations/zhe_r.svg"
            alt="zhe_r"
            style={{ height: '14px', width: 'auto', verticalAlign: '-0.25em', display: 'inline' }}
          />),
          and 6 Cartesian expressions: the 2–part products, the 3–part products,
          the 2–part sums, the 3–part sums, the 2–part quadrances, and the 3–part quadrances.
        </p>

        <div style={{ height: '1.0rem' }} />

        <div
  style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(6, auto)',
    justifyContent: 'center',
    gap: '1.0rem 1.4rem',
    marginTop: '1rem',
    marginBottom: '1rem',
  }}
>
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <img src="/equations/2-part_products_1_and_2.svg" alt="2-part products 1 and 2" style={{ height: '13px', width: 'auto' }} />
  </div>
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <img src="/equations/3-part_products_1.svg" alt="3-part products 1" style={{ height: '13px', width: 'auto' }} />
  </div>
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <img src="/equations/2-part_sums_plus.svg" alt="2-part sums plus" style={{ height: '18px', width: 'auto' }} />
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

        <div style={{ height: '1.0rem' }} />

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
  </a> page to see which transform each constant uses.
        </p>

        <div style={{ height: '12.5rem' }} />

      </div>
    </LayoutWrapper>
  );
}
