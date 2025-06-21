'use client';

import LayoutWrapper from '@/components/LayoutWrapper';
import '../globals.css';

export default function ExternalTransformSpace() {
  return (
    <LayoutWrapper>
      {/* ✅ Page-specific overlay */}
      <div className="symbol-overlay" />

      {/* ✅ Shared layout and font styling */}
      <div className="partition-content">
        <div className="legend-title">the external transform space</div>

        <div className="equation-line">
          <img
            src="/equations/v_24_equation.svg"
            alt="Hyperbolic Partition Equation"
            style={{ height: '48px', width: 'auto' }}
          />
        </div>

        <div style={{ height: '2.0rem' }} />

        <div className="equation-line" style={{ marginLeft: '-1.5rem' }}>
  <img
    src="/equations/leech_lattice_equation.svg"
    alt="Hyperbolic Partition Equation"
    style={{ height: '48px', width: 'auto' }}
  />
</div>

        <div style={{ height: '2.0rem' }} />

        <p className="equation-description">
          The external transform space defines the set of coherent transformations available to the minimal arena—the{' '}
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
  </a>.
            It is equal to the volume of the {' '}
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
  </a>—<img
            src="/equations/v_24_symbol.svg"
            alt="V_24"
            style={{ height: '16px', width: 'auto', display: 'inline-block', position: 'relative', top: '0px' }}
          />, which also defines the density of the {' '}
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
  </a>—<img
            src="/equations/leech_lattice_symbol.svg"
            alt="rho_Leech"
            style={{ height: '12px', width: 'auto', display: 'inline-block', position: 'relative', top: '1px' }}
          />. Where &nbsp;<img
            src="/equations/factorial_5_symbol.svg"
            alt="5!"
            style={{ height: '13px', width: 'auto', display: 'inline-block', position: 'relative', top: '-2px' }}
          /> = 120—the <a
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
          /> = 44—the <a
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
          />.
        </p>

        <div style={{ height: '1.5rem' }} />

        <p className="equation-description">
  The divisors of that space ( &nbsp;<img
            src="/equations/factorial_5_symbol.svg"
            alt="5!"
            style={{ height: '13px', width: 'auto', display: 'inline-block', position: 'relative', top: '-2px' }}
          />, &nbsp;<img
            src="/equations/derangement_5_symbol.svg"
            alt="!5"
            style={{ height: '13px', width: 'auto', display: 'inline-block', position: 'relative', top: '-2px' }}
          />, 35, 18, 32, and 8 ) define its structure.
  The first factors into the{' '}
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
    120-cell
  </a>
  —which contains examples of <i>every</i> relationship among <i>all</i> the convex regular polytopes found in the first 4 dimensions. The coherent divisors of that structure ( 44, 35, 18, 32, and 8 ) define the quantized powers of the{' '}
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
  </a>.
</p>

        <div style={{ height: '1.5rem' }} />

        <p className="equation-description">
          The controlling root of that structure—its highest power component—is equal to the product of the {' '}
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
  </a>&apos;s <i>twisted</i> zeros.
        </p>

        <div style={{ height: '1.5rem' }} />

        <p className="equation-description">
          The hyperbolic figure eight knot's constructive zeros.
        </p>

        <div style={{ height: '1.5rem' }} />

        <div className="equation-line" style={{ marginLeft: '-4.4rem' }}>
          <img
            src="/equations/constructive_zero_1.svg"
            alt="1st constructive zero"
            style={{ height: '44px', width: 'auto' }}
          />
        </div>

        <div style={{ height: '1.5rem' }} />

        <div className="equation-line" style={{ marginLeft: '-4.4rem' }}>
          <img
            src="/equations/constructive_zero_2.svg"
            alt="2nd constructive zero"
            style={{ height: '44px', width: 'auto' }}
          />
        </div>

        <div style={{ height: '1.5rem' }} />

        <p className="equation-description">
          The hyperbolic figure eight knot's <i>twisted</i> zeros.
        </p>

        <div style={{ height: '1.5rem' }} />

        <div className="equation-line">
          <img
            src="/equations/twisted_zero_1.svg"
            alt="Hyperbolic Partition Equation"
            style={{ height: '48px', width: 'auto' }}
          />
        </div>

        <div style={{ height: '1.5rem' }} />

        <div className="equation-line" style={{ marginLeft: '-1.0rem' }}>
          <img
            src="/equations/twisted_zero_2.svg"
            alt="Hyperbolic Partition Equation"
            style={{ height: '48px', width: 'auto' }}
          />
        </div>

        <div style={{ height: '1.5rem' }} />

        <div className="equation-line" style={{ marginLeft: '8.2rem' }}>
          <img
            src="/equations/twisted_zero_product.svg"
            alt="Hyperbolic Partition Equation"
            style={{ height: '43.0px', width: 'auto' }}
          />
        </div>

        <div style={{ height: '10rem' }} />
      </div>
    </LayoutWrapper>
  );
}
