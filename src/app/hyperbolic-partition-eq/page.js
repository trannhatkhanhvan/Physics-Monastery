'use client';
export const dynamic = 'force-dynamic';

import LayoutWrapper from '@/components/LayoutWrapper';
import '../globals.css';

export default function HyperbolicPartitionEq() {
  return (
    <LayoutWrapper>
      <div
  className="symbol-overlay"
  style={{
    left: 0,
    width: "100vw",
  }}
/>
      <div
  className="hyperbolic-partition-content"
  style={{
    width: "min(1400px, calc(100vw - 220px))",
    maxWidth: "none",
  }}
>
        <div style={{ height: '0.5rem' }} />

        <div className="legend-title">the hyperbolic partition equation</div>

        <div className="equation-line">
          <img
            src="/equations/hyperbolic_partition_equation.svg"
            alt="Hyperbolic Partition Equation"
            style={{ height: '46px', width: 'auto' }}
          />
        </div>

        <div style={{ height: '2.0rem' }} />

        <p className="equation-description">
          The hyperbolic partition equation encodes how the two-layer system coherently partitions within its mass gap—the normalized{' '}
          <a
            href="/planck-constants"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'inherit', textDecoration: 'none' }}
            onMouseOver={(e) => (e.currentTarget.style.color = 'yellow')}
            onMouseOut={(e) => (e.currentTarget.style.color = 'inherit')}
          >
            Planck mass.{' '}
          </a>Its 4 roots{' '}
          <img src="/equations/zhe_1.svg" alt="zhe_1" style={{ height: '14px', width: 'auto', verticalAlign: '-0.25em', display: 'inline' }} />,{' '}
          <img src="/equations/zhe_2.svg" alt="zhe_2" style={{ height: '14px', width: 'auto', verticalAlign: '-0.25em', display: 'inline' }} />,{' '}
          <img src="/equations/zhe_3.svg" alt="zhe_3" style={{ height: '14px', width: 'auto', verticalAlign: '-0.25em', display: 'inline' }} /> and{' '}
          <img src="/equations/zhe_4.svg" alt="zhe_4" style={{ height: '14px', width: 'auto', verticalAlign: '-0.25em', display: 'inline' }} />
          {' '}define the hyperbolic partition constants—which possess the following product, sum and quadrance (sum of squares).
        </p>

        <div style={{ height: '2.0rem' }} />

        <div className="equation-line" style={{ marginLeft: '-7.5rem' }}>
          <img src="/equations/hyperbolic_partition_product.svg" alt="Hyperbolic Partition Product" style={{ height: '18px', width: 'auto' }} />
        </div>

        <div style={{ height: '0.8rem' }} />

        <div className="equation-line" style={{ marginLeft: '-3.8rem' }}>
          <img src="/equations/hyperbolic_partition_sum.svg" alt="Hyperbolic Partition Sum" style={{ height: '18px', width: 'auto' }} />
        </div>

        <div style={{ height: '0.8rem' }} />

        <div className="equation-line" style={{ marginLeft: '0.7rem' }}>
          <img src="/equations/hyperbolic_partition_quadrance.svg" alt="Hyperbolic Partition Quadrance" style={{ height: '21px', width: 'auto' }} />
        </div>

        <div style={{ height: '2rem' }} />

        <div className="zhe-value-section">
          <div className="zhe-values-column">
            {[{ src: 'zhe_1.svg', value: '0.0854245431533304 ...' },
              { src: 'zhe_2.svg', value: '3.66756753485501 ...' },
              { src: 'zhe_3.svg', value: '–1.87649603900417 ... + 4.06615262615972 ...', imag: true },
              { src: 'zhe_4.svg', value: '–1.87649603900417 ... – 4.06615262615972 ...', imag: true }].map(({ src, value, imag }, i) => (
              <div key={i} className="equation-line-left" style={{ marginBottom: '0.4rem', paddingLeft: '2.0rem' }}>
                <img src={'/equations/' + src} alt={src} style={{ height: '14px', width: 'auto', position: 'relative', top: '3px' }} />
                <span style={{ marginLeft: '0.4em' }}>= {value}</span>
                {imag && (
                  <img src="/equations/i.svg" alt="i" style={{ height: '13px', width: 'auto', position: 'relative', top: '-2px', marginLeft: '0.3em' }} />
                )}
              </div>
            ))}
          </div>
        </div>

        <p className="equation-description" style={{ marginTop: '2rem' }}>
          The square of the first solution is{' '}
          <a
            href="https://physics.nist.gov/cgi-bin/cuu/Value?alph"
            target="_blank"
            rel="noopener noreferrer"
            className="legend-link"
          >
            the fine structure constant
          </a>{' '}
          <img src="/equations/zhe_1_squared_equation.svg" alt="zhe_squared=alpha" style={{ height: '21px', width: 'auto', verticalAlign: '-0.30em', display: 'inline' }} />.
        </p>

        <div style={{ height: '3.5rem' }} />

        <div className="zhe-image-column" style={{ display: 'flex', justifyContent: 'center', marginBottom: '-5rem' }}>
          <svg viewBox="-5 -5 10 10" width="360" height="360">
            <line x1="-5" y1="0" x2="5" y2="0" stroke="white" strokeWidth="0.02" />
            <line x1="0" y1="-5" x2="0" y2="5" stroke="white" strokeWidth="0.02" />
            {[...Array(11).keys()].map((i) => {
              const v = i - 5;
              return (
                <g key={v}>
                  <line x1={v} y1="-0.1" x2={v} y2="0.1" stroke="white" strokeWidth="0.01" />
                  <line x1="-0.1" y1={v} x2="0.1" y2={v} stroke="white" strokeWidth="0.01" />
                </g>
              );
            })}
            <circle cx="0.0854" cy="0" r="0.1" fill="yellow" />
            <circle cx="3.6676" cy="0" r="0.1" fill="yellow" />
            <circle cx="-1.8765" cy="4.0662" r="0.1" fill="yellow" />
            <circle cx="-1.8765" cy="-4.0662" r="0.1" fill="yellow" />
            <line x1="0" y1="0" x2="-1.8765" y2="4.0662" stroke="white" strokeWidth="0.015" />
            <line x1="0" y1="0" x2="-1.8765" y2="-4.0662" stroke="white" strokeWidth="0.015" />
            <image href="/equations/zhe_1.svg" x="0.4" y="0.2" width="0.7" height="0.7" />
            <image href="/equations/zhe_2.svg" x="4.0" y="0.2" width="0.7" height="0.7" />
            <image href="/equations/zhe_4.svg" x="-2.8" y="4.2" width="0.7" height="0.7" />
            <image href="/equations/zhe_3.svg" x="-2.8" y="-4.9" width="0.7" height="0.7" />
          </svg>
        </div>

        <div style={{ height: '7.0rem' }} />

        <p className="equation-description" style={{ marginTop: '2rem' }}>
          In polar coordinates{' '}
          <img src="/equations/zhe_3.svg" alt="zhe_3" style={{ height: '14px', width: 'auto', verticalAlign: '-0.25em', display: 'inline' }} />{' '}and{' '}
          <img src="/equations/zhe_4.svg" alt="zhe_4" style={{ height: '14px', width: 'auto', verticalAlign: '-0.25em', display: 'inline' }} />{' '}are expressed as{' '}
          <img src="/equations/zhe_3_polar_equation.svg" alt="zhe_3_polar" style={{ height: '22px', width: 'auto', verticalAlign: '-0.25em', display: 'inline' }} />{' '}and{' '}
          <img src="/equations/zhe_4_polar_equation.svg" alt="zhe_4_polar" style={{ height: '22px', width: 'auto', verticalAlign: '-0.25em', display: 'inline' }} />, where:
        </p>

        <div style={{ height: '2.0rem' }} />

        <div className="zhe-values-column">
          <div className="equation-line-left" style={{ marginBottom: '0.4rem', paddingLeft: '2.0rem' }}>
            <img src="/equations/zhe_r.svg" alt="zhe_r" style={{ height: '14px', width: 'auto', position: 'relative', top: '3px' }} />
            <span>= 4.47826244916751 ...</span>
          </div>
          <div className="equation-line-left" style={{ marginBottom: '0.4rem', paddingLeft: '2.0rem' }}>
            <img src="/equations/zhe_theta.svg" alt="zhe_theta" style={{ height: '14px', width: 'auto', position: 'relative', top: '3px' }} />
            <span>= 2.00316562310924 ...</span>
          </div>
        </div>

        <div style={{ height: '1.5rem' }} />

        <p className="equation-description">
  In 1591, François Viète showed that the invariants (
  <span style={{ display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle' }}>
    <img
      src="/equations/a.svg"
      alt="A"
      style={{
        height: '12px',
        width: 'auto',
        position: 'relative',
        top: '-2px'
      }}
    />
  </span>,{' '}
  <span style={{ display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle' }}>
    <img
      src="/equations/b.svg"
      alt="B"
      style={{
        height: '12px',
        width: 'auto',
        position: 'relative',
        top: '-2px'
      }}
    />
  </span>,{' '}
  <span style={{ display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle' }}>
    <img
      src="/equations/c.svg"
      alt="C"
      style={{
        height: '12px',
        width: 'auto',
        position: 'relative',
        top: '-2px'
      }}
    />
  </span>,{' '}
  <span style={{ display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle' }}>
    <img
      src="/equations/d.svg"
      alt="D"
      style={{
        height: '12px',
        width: 'auto',
        position: 'relative',
        top: '-2px'
      }}
    />
  </span>
  ) of the general monic quartic
</p>

{/* Spacer above equation */}
<div style={{ height: '2.0rem' }} />

{/* Centered equation line */}
<div style={{ display: 'flex', justifyContent: 'center' }}>
  <img
    src="/equations/general_monic_quartic.svg"
    alt="x^4 + a x^3 + b x^2 + c x + d"
    style={{ height: '15.5px', width: 'auto' }}
  />
</div>

{/* Spacer below equation */}
<div style={{ height: '2.0rem' }} />

<p
  className="equation-description"
  style={{ textIndent: 0 }}
>
  with roots{' '}
  <span style={{ display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle'}}>
    <img src="/equations/x_1.svg" alt="x₁" style={{ height: '12px', width: 'auto', position: 'relative', top: '1px' }} />
  </span>,{' '}
  <span style={{ display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle' }}>
    <img src="/equations/x_2.svg" alt="x₂" style={{ height: '12px', width: 'auto', position: 'relative', top: '1px' }} />
  </span>,{' '}
  <span style={{ display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle' }}>
    <img src="/equations/x_3.svg" alt="x₃" style={{ height: '12px', width: 'auto', position: 'relative', top: '1px' }} />
  </span>, and{' '}
  <span style={{ display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle' }}>
    <img src="/equations/x_4.svg" alt="x₄" style={{ height: '12px', width: 'auto', position: 'relative', top: '1px' }} />
  </span>
  , are prescribed by its sum of roots, pairwise product sum of roots, triple product sum of roots, and its product of roots.
</p>

        <div style={{ height: '2.0rem' }} />

        <div className="equation-line" style={{ display: 'flex', justifyContent: 'center' }}>
  <img src="/equations/vieta_sum_roots.svg" alt="∑ x_i = −a" style={{ height: '65px', width: 'auto', marginRight: '3.6rem' }} />
  <img src="/equations/vieta_pairwise_product_sum.svg" alt="∑ x_i x_j = b" style={{ height: '65px', width: 'auto', marginRight: '3.6rem' }} />
  <img src="/equations/vieta_triple_product_sum.svg" alt="∑ x_i x_j x_k = −c" style={{ height: '65px', width: 'auto', marginRight: '3.6rem' }} />
  <img src="/equations/vieta_product_roots.svg" alt="∏ x_i = d" style={{ height: '65px', width: 'auto' }} />
</div>
          <div style={{ height: '2.0rem' }} />

        <p className="equation-description">
          Let’s apply these insights to the hyperbolic partition equation, which converts into a monic depressed quartic
        </p>

        <div style={{ height: '2.0rem' }} />

        <div className="equation-line" style={{ display: 'flex', justifyContent: 'center' }}>
  <img src="/equations/monic_depressed_quartic.svg" alt="∑ x_i = −a" style={{ height: '20px', width: 'auto', marginRight: '3.6rem' }} />
  </div>
          <div style={{ height: '2.0rem' }} />

        <p
  className="equation-description"
  style={{ textIndent: '0' }}
>
  with{' '}
  <span style={{ display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle' }}>
    <img
      src="/equations/component_1.svg"
      alt="component 1"
      style={{ height: '17px', width: 'auto'}}
    />
  </span>
  ,{' '}
  <span style={{ display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle' }}>
    <img
      src="/equations/component_2.svg"
      alt="component 2"
      style={{ height: '17px', width: 'auto'}}
    />
  </span>
  ,{' '}
  <span style={{ display: 'inline-flex', alignItems: 'center' }}>
    <img
      src="/equations/component_3.svg"
      alt="component 3"
      style={{ height: '13px', width: 'auto'}}
    />
  </span>
  , and{' '}
  <span style={{ display: "inline-flex", alignItems: "center", verticalAlign: "middle" }}>
    <img
        src="/equations/a_scale.svg"
        alt="a_scale"
        style={{
        height: '44px',
        width: 'auto',
        position: 'relative',
        top: '-2px'
      }}
    />
</span>
  {' '}.
</p>


<div style={{ height: '2.0rem' }} />

        <div className="equation-line-left" style={{ paddingLeft: '2.0rem' }}>
          <img src="/equations/zhe_big_product.svg" alt="zhe big product" style={{ height: '66px', width: 'auto', marginRight: '4.0rem' }} />
          <img src="/equations/root_sum_big.svg" alt="root sum" style={{ height: '66px', width: 'auto', marginRight: '8.4rem' }} />
          <img src="/equations/zhe_big_quadrance.svg" alt="zhe big quadrance" style={{ height: '66px', width: 'auto' }} />
        </div>

        <div style={{ height: '2.0rem' }} />

        <div className="equation-line-left" style={{ paddingLeft: '2.0rem' }}>
          <img src="/equations/zhe_inverse_product.svg" alt="zhe inverse product" style={{ height: '66px', width: 'auto', marginRight: '4.0rem' }} />
          <img src="/equations/zhe_biproduct_sum.svg" alt="bi-product root sum" style={{ height: '66px', width: 'auto', marginRight: '6.4rem' }} />
          <img src="/equations/sum_of_cubes_big.svg" alt="sum of cubes" style={{ height: '66px', width: 'auto' }} />
        </div>

        <div style={{ height: '2.0rem' }} />

        <div className="equation-line-left" style={{ paddingLeft: '2.0rem' }}>
          <img src="/equations/inverse_sum_big.svg" alt="inverse sum" style={{ height: '66px', width: 'auto', marginRight: '4.2rem' }} />
          <img src="/equations/triple_product_sum_big.svg" alt="triple product sum of roots" style={{ height: '66px', width: 'auto', marginRight: '3.5rem' }} />
          <img src="/equations/sum_of_fourth_powers_big.svg" alt="sum of fourth powers" style={{ height: '66px', width: 'auto' }} />
        </div>

        <div style={{ height: '2.0rem' }} />

        <div className="equation-line-left" style={{ paddingLeft: '2.0rem' }}>
          <img src="/equations/inverse_biproduct_sum_big.svg" alt="inverse biproduct sum" style={{ height: '66px', width: 'auto', marginRight: '3.2rem' }} />
          <img src="/equations/inverse_triproduct_sum_big.svg" alt="inverse triple product sum of roots" style={{ height: '66px', width: 'auto', marginRight: '4.7rem' }} />
          <img src="/equations/inverse_square_biproduct_sum_big.svg" alt="inverse product" style={{ height: '66px', width: 'auto', marginRight: '3.2rem' }} />
        </div>

        <div style={{ height: '2.0rem' }} />

        <div className="equation-line-left" style={{ paddingLeft: '2.0rem' }}>
          <img src="/equations/inverse_square_triple_product_sum_big.svg" alt="inverse product" style={{ height: '66px', width: 'auto', marginRight: '4.7rem' }} />
        </div>

        <div style={{ height: '4.0rem' }} />

        <div className="equation-line-left" style={{ paddingLeft: '2.0rem' }}>
          <img src="/equations/hyperbolic_partition_product.svg" alt="hyperbolic partition product" style={{ height: '18px', width: 'auto' }} />
        </div>

        <div style={{ height: '2.0rem' }} />

        <div className="equation-line-left" style={{ paddingLeft: '2.0rem' }}>
          <img src="/equations/hyperbolic_partition_sum.svg" alt="hyperbolic partition sum" style={{ height: '18px', width: 'auto' }} />
        </div>

        <div style={{ height: '2rem' }} />

        <div className="equation-line-left" style={{ paddingLeft: '2.0rem' }}>
          <img src="/equations/zhe_bi_product_sum.svg" alt="zhe bi product sum" style={{ height: '18px', width: 'auto' }} />
        </div>

        <div style={{ height: '2.0rem' }} />

        <div className="equation-line-left" style={{ paddingLeft: '2.0rem' }}>
          <img src="/equations/triple_product_sum.svg" alt="zhe triple product sum" style={{ height: '18px', width: 'auto' }} />
        </div>

        <div style={{ height: '2.0rem' }} />

        <div className="equation-line-left" style={{ paddingLeft: '2.0rem' }}>
          <img src="/equations/hyperbolic_partition_quadrance.svg" alt="hyperbolic partition quadrance" style={{ height: '20px', width: 'auto' }} />
        </div>

        <div style={{ height: '2.0rem' }} />

        <div className="equation-line-left" style={{ paddingLeft: '2.0rem' }}>
          <img src="/equations/sum_of_cubes.svg" alt="sum of cubes" style={{ height: '20px', width: 'auto' }} />
        </div>

        <div style={{ height: '2.0rem' }} />

        <div className="equation-line-left" style={{ paddingLeft: '2.0rem' }}>
          <img src="/equations/sum_of_fourth_powers.svg" alt="sum of fourth powers" style={{ height: '20px', width: 'auto' }} />
        </div>

        <div style={{ height: '2.0rem' }} />

        <div className="equation-line-left" style={{ paddingLeft: '2.0rem' }}>
        <img src="/equations/inverse_sum.svg" alt="inverse sum" style={{ height: '42px', width: 'auto' }} />
        </div>

        <div style={{ height: '2.0rem' }} />

        <div className="equation-line-left" style={{ paddingLeft: '2.0rem' }}>
        <img src="/equations/inverse_biproduct_sum.svg" alt="inverse biproduct sum" style={{ height: '42px', width: 'auto' }} />
        </div>

        <div style={{ height: '2.0rem' }} />

        <div className="equation-line-left" style={{ paddingLeft: '2.0rem' }}>
        <img src="/equations/inverse_triple_product_sum.svg" alt="inverse triple product sum" style={{ height: '42px', width: 'auto' }} />
        </div>

        <div style={{ height: '2.0rem' }} />

        <div className="equation-line-left" style={{ paddingLeft: '2.0rem' }}>
          <img src="/equations/inverse_product.svg" alt="inverse product" style={{ height: '42px', width: 'auto' }} />
        </div>

        <div style={{ height: '2.0rem' }} />

        <div className="equation-line-left" style={{ paddingLeft: '2.0rem' }}>
          <img src="/equations/inverse_square_biproduct_sum.svg" alt="inverse product" style={{ height: '42px', width: 'auto' }} />
        </div>

        <div style={{ height: '2.0rem' }} />

        <div className="equation-line-left" style={{ paddingLeft: '2.0rem' }}>
          <img src="/equations/inverse_square_triple_product_sum.svg" alt="inverse product" style={{ height: '42px', width: 'auto' }} />
        </div>

        <div style={{ height: '2.0rem' }} />

        <div className="equation-line-left" style={{ paddingLeft: '2.0rem' }}>
          <img src="/equations/zhe_negative_one.svg" alt="zhe -1" style={{ height: '42px', width: 'auto', marginRight: '6.2rem' }} />
          <img src="/equations/zhe_inversion.svg" alt="zhe inversion" style={{ height: '47px', width: 'auto' }} />
        </div>

        <div style={{ height: '2.0rem' }} />

        <div className="equation-line-left" style={{ paddingLeft: '2.0rem' }}>
          <img src="/equations/zhe_1_zhe_2_product.svg" alt="zhe_1 zhe_2 product" style={{ height: '44px', width: 'auto', marginRight: '7.6rem' }} />
          <img src="/equations/zhe_3_zhe_4_product.svg" alt="zhe_3 zhe_4 product" style={{ height: '20px', width: 'auto' }} />
        </div>

        <div style={{ height: '1.0rem' }} />

        {/* =========================
    New section (bottom)
========================= */}
<div style={{ height: '2.0rem' }} />

<div
  className="legend-title"
  style={{ fontSize: '1.50rem', color: 'yellow' }}
>
  the Companion Matrix
</div>


<p className="equation-description">
  {/* Paragraph 1 */}
  The associated Frobenius companion matrix of this quartic system is
</p>

<div style={{ height: '2.0rem' }} />

<div className="equation-line" style={{ display: 'flex', justifyContent: 'center' }}>
  <img
    src="/equations/companion_matrix.svg"
    alt="companion matrix"
    style={{ height: '82px', width: 'auto' }}
  />
</div>

<div style={{ height: '2.0rem' }} />

<p className="equation-description">
  This matrix acts as the step-forward operator of the corresponding linear recurrence: it advances the system by one discrete tick, encoding the quartic relation as a first-order evolution in a four-dimensional state space.
  The fundamental invariants of{' '}
  <img
    src="/equations/m_matrix.svg"
    alt="M"
    style={{ height: '12px', width: 'auto', verticalAlign: '-0.00em', display: 'inline' }}
  />{' '}
  are its eigenvalues and the symmetric relationships they encode through traces and determinants. The eigenvalues of{' '}
  <img
    src="/equations/m_matrix.svg"
    alt="M"
    style={{ height: '12px', width: 'auto', verticalAlign: '-0.00em', display: 'inline' }}
  />{' '}
  are the four roots {'{'}
<img
  src="/equations/zhe_1.svg"
  alt="x1"
  style={{ height: '14px', width: 'auto', verticalAlign: '-0.25em', display: 'inline', marginLeft: '0.2em' }}
/>,{' '}
<img
  src="/equations/zhe_2.svg"
  alt="x2"
  style={{ height: '14px', width: 'auto', verticalAlign: '-0.25em', display: 'inline' }}
/>,{' '}
<img
  src="/equations/zhe_3.svg"
  alt="x3"
  style={{ height: '14px', width: 'auto', verticalAlign: '-0.25em', display: 'inline' }}
/>,{' '}
<img
  src="/equations/zhe_4.svg"
  alt="x4"
  style={{ height: '14px', width: 'auto', verticalAlign: '-0.25em', display: 'inline' }}
/>
{'}'} of{' '}

<img
  src="/equations/t_of_x.svg"
  alt="T(x)"
  style={{
    height: '16px',
    width: 'auto',
    verticalAlign: '-0.20em',
    display: 'inline',
    marginLeft: '0.25em'
  }}
/>.

</p>

<p className="equation-description">
  The trace of{' '}
  <img
    src="/equations/m_matrix.svg"
    alt="M"
    style={{ height: '12px', width: 'auto', verticalAlign: '-0.00em', display: 'inline' }}
  />{' '}
  is the sum of its eigenvalues,{' '}
  <img
    src="/equations/trace_m.svg"
    alt="tr(M)=0"
    style={{ height: '16px', width: 'auto', verticalAlign: '-0.20em', display: 'inline', marginLeft: '0.2em' }}
  />
  , while the trace of higher powers encodes higher power sums; for example,{' '}
  <img
    src="/equations/trace_m_squared.svg"
    alt="tr(M^2)=-4π"
    style={{ height: '16px', width: 'auto', verticalAlign: '-0.20em', display: 'inline', marginLeft: '0.2em' }}
  />
  . These traces provide coordinate-free access to the quartic’s internal invariants.
</p>

<p className="equation-description">
  The determinant of{' '}
  <img
    src="/equations/m_matrix.svg"
    alt="M"
    style={{ height: '12px', width: 'auto', verticalAlign: '-0.00em', display: 'inline' }}
  />{' '}
  is the product of its eigenvalues,{' '}
  <img
    src="/equations/2pi.svg"
    alt="2π"
    style={{ height: '12px', width: 'auto', verticalAlign: '-0.10em', display: 'inline', marginLeft: '0.0em' }}
  />
  , and more generally,{' '}
  <img
    src="/equations/det_m_to_k.svg"
    alt="det(M^k) = (2π)^k"
    style={{ height: '16px', width: 'auto', verticalAlign: '-0.20em', display: 'inline', marginLeft: '0.2em' }}
  />
  {' '}for all integers {' '}
  <img
    src="/equations/integer_k.svg"
    alt="k"
    style={{ height: '12px', width: 'auto', verticalAlign: '-0.00em', display: 'inline', marginLeft: '0.0em' }}
  />. By contrast,{' '}
  <img
    src="/equations/det_e_to_m.svg"
    alt="det(e^M) = e^{tr(M)} = 1"
    style={{ height: '18px', width: 'auto', verticalAlign: '-0.20em', display: 'inline', marginLeft: '0.2em' }}
  />
  , so the exponential{' '}
  <img
    src="/equations/e_to_m.svg"
    alt="e^M"
    style={{ height: '16px', width: 'auto', verticalAlign: '-0.00em', display: 'inline', marginLeft: '0.2em' }}
  />
  {' '}is a volume-preserving transformation in 4-dimensions. This reflects only the vanishing trace of{' '}
  <img
    src="/equations/m_matrix.svg"
    alt="M"
    style={{ height: '12px', width: 'auto', verticalAlign: '-0.00em', display: 'inline' }}
  />
  {' '}in the exponential map, not the volume rescaling induced by the discrete step itself: the discrete evolution rescales volume by a factor of{' '}
  <img
    src="/equations/2pi.svg"
    alt="2π"
    style={{ height: '12px', width: 'auto', verticalAlign: '-0.00em', display: 'inline', marginLeft: '0.1em' }}
  />
  {' '}at each tick.
</p>
<p className="equation-description">
  The spectral radius of{' '}
  <img
    src="/equations/m_matrix.svg"
    alt="M"
    style={{ height: '12px', width: 'auto', verticalAlign: '-0.00em', display: 'inline' }}
  />{' '}
  is determined by the modulus of the complex pair,{' '}
  <img
    src="/equations/modulus.svg"
    alt="zhe_r"
    style={{ height: '16px', width: 'auto', verticalAlign: '-0.20em', display: 'inline', marginLeft: '0.2em' }}
  />.
</p>

<div style={{ height: '2.0rem' }} />

<div className="equation-line" style={{ display: 'flex', justifyContent: 'center' }}>
  <img
    src="/equations/matrix_properties.svg"
    alt="matrix properties"
    style={{ height: '140px', width: 'auto' }}
  />
</div>

<div style={{ height: '2.0rem' }} />

<p className="equation-description">
  Since{' '}
  <img
    src="/equations/m_matrix.svg"
    alt="M"
    style={{ height: '12px', width: 'auto', verticalAlign: '-0.05em', display: 'inline' }}
  />{' '}
  is invertible, it admits a complex matrix logarithm on a chosen spectral branch. Let{' '}
  <img
    src="/equations/a_log_m.svg"
    alt="Λ = log(M)"
    style={{ height: '16px', width: 'auto', verticalAlign: '-0.25em', display: 'inline', marginLeft: '0.0em' }}
  />.{' '}
  Choose the conjugate-symmetric branch for which{' '}
    <img
    src="/equations/trace_log_2pi.svg"
    alt="e^Λ=M"
    style={{ height: '16px', width: 'auto', verticalAlign: '-0.25em', display: 'inline', marginLeft: '0.0em' }}
  />.{' '}
    Then{' '}
  <img
    src="/equations/e_to_m.svg"
    alt="e^Λ=M"
    style={{ height: '16px', width: 'auto', verticalAlign: '-0.10em', display: 'inline', marginLeft: '0.0em' }}
  />,{' '}
  and the continuous interpolation of the discrete dynamics is{' '}
  <img
    src="/equations/m_to_t.svg"
    alt="e^{Λt} = M^t"
    style={{ height: '16px', width: 'auto', verticalAlign: '-0.00em', display: 'inline', marginLeft: '0.2em' }}
  />
  . At integer times{' '}
    <img
    src="/equations/t_equal_k.svg"
    alt="e^M"
    style={{ height: '14px', width: 'auto', verticalAlign: '-0.10em', display: 'inline', marginLeft: '0.0em' }}
  />, this returns the ordinary matrix powers{' '}
    <img
    src="/equations/m_to_k.svg"
    alt="M^k"
    style={{ height: '16px', width: 'auto', verticalAlign: '-0.00em', display: 'inline', marginLeft: '0.0em' }}
  />. Unlike{' '}
  <img
    src="/equations/e_to_matrix.svg"
    alt="e^M"
    style={{ height: '16px', width: 'auto', verticalAlign: '-0.00em', display: 'inline', marginLeft: '0.0em' }}
  />
  , the interpolating flow{' '}
  <img
    src="/equations/e_to_lambdat.svg"
    alt="e^{Λt}"
    style={{ height: '16px', width: 'auto', verticalAlign: '-0.00em', display: 'inline', marginLeft: '0.0em' }}
  />{' '}
  does not preserve volume. Its determinant is
  <span
    style={{
      display: 'flex',
      justifyContent: 'center',
      width: '100%',
      marginTop: '1.8rem',
      marginBottom: '1.8rem'
    }}
  >
    <img
      src="/equations/det_e_to_at.svg"
      alt="det(e^{Λt}) = e^{tr(Λ)t} = (2π)^t"
      style={{ height: '20px', width: 'auto', display: 'block' }}
    />
  </span>
  so volume scales continuously by a factor of{' '}
  <img
    src="/equations/2pi_to_t.svg"
    alt="(2π)^t"
    style={{ height: '16px', width: 'auto', verticalAlign: '-0.20em', display: 'inline', marginLeft: '0.2em' }}
  />
  , matching the discrete jumps{' '}
  <img
    src="/equations/2pi_to_k.svg"
    alt="(2π)^k"
    style={{ height: '16px', width: 'auto', verticalAlign: '-0.20em', display: 'inline', marginLeft: '0.2em' }}
  />{' '}
  at integer times. The algebraic structure is clear: the discrete step{' '}
  <img
    src="/equations/m_matrix.svg"
    alt="M"
    style={{ height: '12px', width: 'auto', verticalAlign: '-0.05em', display: 'inline' }}
  />{' '}
  rescales volume in quantized steps, while its logarithmic generator induces a smooth dilation whose integer-time restriction reproduces those jumps. This is the signature of a system whose geometry is continuous, but whose action is discrete.
</p>

<div style={{ height: '2.0rem' }} />

<p className="equation-description">
  The coefficient{' '}
  <img
    src="/equations/2pia_not_0.svg"
    alt="2πa"
    style={{ height: '12px', width: 'auto', verticalAlign: '-0.05em', display: 'inline' }}
  /> introduces an odd-degree asymmetry into the recurrence. Relative to the simplest bilinear structures, this breaks time-reversal symmetry and acts as the discrete analogue of a non-symmetric (and later, non-self-adjoint) contribution. Because the coefficients of{' '}
  <img
    src="/equations/t_of_x.svg"
    alt="T(x)"
    style={{ height: '16px', width: 'auto', verticalAlign: '-0.20em', display: 'inline', marginLeft: '0.2em' }}
  />{' '}
  are real, any nonreal eigenvalues occur in complex-conjugate pairs. In the parameter regime relevant to our hyperbolic partitions, two eigenvalues form a complex conjugate pair; together they span a real two-dimensional oscillatory plane, characterized by simultaneous rotation and radial dilation. The other two eigenvalues are real and generate a hyperbolic invariant subspace.
</p>

<p className="equation-description">
  In real Jordan form, therefore,{' '}
  <img
    src="/equations/m_matrix.svg"
    alt="M"
    style={{ height: '12px', width: 'auto', verticalAlign: '-0.05em', display: 'inline' }}
  />{' '}
  decomposes into a two-dimensional oscillatory block and a two-dimensional hyperbolic block, yielding the invariant splitting

  <span
    style={{
      display: 'flex',
      justifyContent: 'center',
      width: '100%',
      marginTop: '1.8rem',
      marginBottom: '1.8rem'
    }}
  >
    <img
      src="/equations/real_4_split.svg"
      alt="ℝ^4 ≅ ℝ_osc^2 ⨁ ℝ_hyp^2"
      style={{ height: '24px', width: 'auto', display: 'block' }}
    />
  </span>
</p>

<p className="equation-description">
  Viewed this way,{' '}
  <img
    src="/equations/m_matrix.svg"
    alt="M"
    style={{ height: '12px', width: 'auto', verticalAlign: '-0.05em', display: 'inline' }}
  />{' '}
  acts as the discrete-time propagator of the system, while{' '}
  <img
    src="/equations/a_log_m.svg"
    alt="A = log(M)"
    style={{ height: '16px', width: 'auto', verticalAlign: '-0.20em', display: 'inline', marginLeft: '0.2em' }}
  />{' '}
  functions as its continuous generator. Together, the quartic{' '}
  <img
    src="/equations/t_of_x.svg"
    alt="T(x)"
    style={{ height: '16px', width: 'auto', verticalAlign: '-0.20em', display: 'inline', marginLeft: '0.2em' }}
  />{' '}
  and its companion matrix define a clockable computational architecture: a system whose geometry is continuous, but whose action advances in discrete, quantized steps.
</p>


        <div style={{ display: 'block', width: '100%' }} />
        <div style={{ height: '2.0rem' }} />
        <div style={{ height: '10.0rem' }} />
      </div>
    </LayoutWrapper>
  );
}
