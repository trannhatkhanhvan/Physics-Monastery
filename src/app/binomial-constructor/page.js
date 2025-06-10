'use client';

import LayoutWrapper from '@/components/LayoutWrapper';
import '../globals.css';

export default function BinomialConstructor() {
  return (
    <LayoutWrapper>
      {/* ✅ Apply page-specific background and overlay */}
      <div className="symbol-overlay" />

      {/* ✅ Use the shared layout style for content */}
      <div className="partition-content">
        <div className="legend-title">the binomial constructor</div>

        <div className="equation-line">
          <img
            src="/equations/binomial_constructor_equation.svg"
            alt="binomial constructor equation"
            style={{ height: '35px', width: 'auto' }}
          />
        </div>

        <div style={{ height: '2.0rem' }} />

        <p className="equation-description">
          The binomial constructor encodes the general two-part structure maintained by the complement of the {' '}
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
          and its coherent external transform space—defined by the the volume of the {' '}
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
  </a>, or the density of the {' '}
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
    Leech lattice
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
          /> = the internal inversion boundary of the minimal hyperbolic structure.

        </p>

        <div style={{ height: '2.0rem' }} />

        <div className="equation-line">
          <img
            src="/equations/box_symbol_equation.svg"
            alt="box symbol equation"
            style={{ height: '52px', width: 'auto' }}
          />
        </div>

        <div style={{ height: '2.0rem' }} />

        <p className="equation-description">
          Where{" "}
          <img
            src="/equations/planck_length.svg"
            alt="l_p"
            style={{ height: '18px', width: 'auto', verticalAlign: '-0.40em', display: 'inline' }}
          /> = {' '}
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
    the Planck length
  </a>,{" "}
          <img
            src="/equations/planck_mass.svg"
            alt="m_p"
            style={{ height: '15px', width: 'auto', verticalAlign: '-0.40em', display: 'inline' }}
          /> = {' '}
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
    the Planck mass
  </a>, and{" "}
          <img
            src="/equations/planck_charge.svg"
            alt="q_p"
            style={{ height: '15px', width: 'auto', verticalAlign: '-0.40em', display: 'inline' }}
          /> = {' '}
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
    the Planck charge
  </a>.
        </p>

        <div style={{ height: '2rem' }} />

        <p className="equation-description">
          Every constant of Nature is coherently maintained by this bi-part structure,
          using one of the {' '}
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
  </a>'s simple (one-dimensional) transforms.
          Those transforms include: two polar expressions (expressed in powers of <img
            src="/equations/zhe_r.svg"
            alt="zhe_r"
            style={{ height: '14px', width: 'auto', verticalAlign: '-0.25em', display: 'inline' }}
          /> and <img
            src="/equations/zhe_theta.svg"
            alt="zhe_theta"
            style={{ height: '14px', width: 'auto', verticalAlign: '-0.25em', display: 'inline' }}
          />),
          and 6 Cartesian expressions—the 2-part products, the 3-part products,
          the 2-part sums, the 3-part sums, the 2-part quadrances, and the 3-part quadrances.
        </p>

        <div style={{ height: '1rem' }} />

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
    <img src="/equations/3-part_products_1.svg" alt="2-part products 5 and 6" style={{ height: '13px', width: 'auto' }} />
  </div>
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <img src="/equations/2-part_sums_plus.svg" alt="2-part products 5 and 6" style={{ height: '18px', width: 'auto' }} />
  </div>
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <img src="/equations/3-part_sums_plus_1.svg" alt="2-part products 5 and 6" style={{ height: '18px', width: 'auto' }} />
  </div>
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <img src="/equations/2-part_quadrances_plus_1.svg" alt="2-part products 5 and 6" style={{ height: '23px', width: 'auto' }} />
  </div>
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <img src="/equations/3-part_quadrances_plus_1.svg" alt="2-part products 5 and 6" style={{ height: '24px', width: 'auto' }} />
  </div>
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <img src="/equations/2-part_products_3_and_4.svg" alt="2-part products 3 and 4" style={{ height: '13px', width: 'auto' }} />
  </div>
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <img src="/equations/3-part_products_2.svg" alt="2-part products 5 and 6" style={{ height: '13px', width: 'auto' }} />
  </div>
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <img src="/equations/2-part_sums_minus.svg" alt="2-part products 5 and 6" style={{ height: '18px', width: 'auto' }} />
  </div>
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <img src="/equations/3-part_sums_minus_1.svg" alt="2-part products 5 and 6" style={{ height: '18px', width: 'auto' }} />
  </div>
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <img src="/equations/2-part_quadrances_minus_1.svg" alt="2-part products 5 and 6" style={{ height: '23px', width: 'auto' }} />
  </div>
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <img src="/equations/3-part_quadrances_minus_1.svg" alt="2-part products 5 and 6" style={{ height: '24px', width: 'auto' }} />
  </div>
  {/* ⬇️ Empty slot */}
  <div />
  {/* ⬇️ Empty slot */}
  <div />
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <img src="/equations/2-part_sums_plus_3.svg" alt="2-part products 5 and 6" style={{ height: '18px', width: 'auto' }} />
  </div>
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <img src="/equations/3-part_sums_plus_2.svg" alt="2-part products 5 and 6" style={{ height: '18px', width: 'auto' }} />
  </div>
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <img src="/equations/2-part_quadrances_plus_3.svg" alt="2-part products 5 and 6" style={{ height: '23px', width: 'auto' }} />
  </div>
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <img src="/equations/3-part_quadrances_plus_2.svg" alt="2-part products 5 and 6" style={{ height: '24px', width: 'auto' }} />
  </div>
  {/* ⬇️ Empty slot */}
  <div />
  {/* ⬇️ Empty slot */}
  <div />
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <img src="/equations/2-part_sums_minus_3.svg" alt="2-part products 5 and 6" style={{ height: '18px', width: 'auto' }} />
  </div>
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <img src="/equations/3-part_sums_minus_2.svg" alt="2-part products 5 and 6" style={{ height: '18px', width: 'auto' }} />
  </div>
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <img src="/equations/2-part_quadrances_minus_3.svg" alt="2-part products 5 and 6" style={{ height: '23px', width: 'auto' }} />
  </div>
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <img src="/equations/3-part_quadrances_minus_2.svg" alt="2-part products 5 and 6" style={{ height: '24px', width: 'auto' }} />
  </div>

</div>

        <div style={{ height: '1rem' }} />

        <p className="equation-description">
          Check the{' '}
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
  </a> page to see which simple transform each constant uses.
        </p>

        <div style={{ height: '12.5rem' }} />

      </div>
    </LayoutWrapper>
  );
}
