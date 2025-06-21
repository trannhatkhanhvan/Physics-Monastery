'use client';

import LayoutWrapper from '@/components/LayoutWrapper';
import '../globals.css';

export default function HyperbolicPartitionEq() {
  return (
    <LayoutWrapper>
      <div className="symbol-overlay" />
      <div className="hyperbolic-partition-content">
        <div className="legend-title">the hyperbolic partition equation</div>

        <div className="equation-line">
          <img
            src="/equations/hyperbolic_partition_equation.svg"
            alt="Hyperbolic Partition Equation"
            style={{ height: '48px', width: 'auto' }}
          />
        </div>

        <div style={{ height: '2.0rem' }} />

       <p className="equation-description">
  The hyperbolic partition equation encodes the allowable transformations of the <a
              href="/simplest-manifold"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            figure-eight knot complement
          </a>,
  hyperbolically partitioning the <a
              href="/constants-of-nature"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            288 constants of Nature
          </a> inside the {' '}
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
    Planck mass
  </a> gap.
  It&apos;s 4 solutions&nbsp;
  <img src="/equations/zhe_1.svg" alt="zhe_1" style={{ height: '14px', width: 'auto', verticalAlign: '-0.25em', display: 'inline' }} />,{' '}
  <img src="/equations/zhe_2.svg" alt="zhe_2" style={{ height: '14px', width: 'auto', verticalAlign: '-0.25em', display: 'inline' }} />,{' '}
  <img src="/equations/zhe_3.svg" alt="zhe_3" style={{ height: '14px', width: 'auto', verticalAlign: '-0.25em', display: 'inline' }} />{' '}
  and{' '}
  <img src="/equations/zhe_4.svg" alt="zhe_4" style={{ height: '14px', width: 'auto', verticalAlign: '-0.25em', display: 'inline' }} />—the hyperbolic partition constants—possess the following product, sum and quadrance.
</p>


        <div style={{ height: '2.0rem' }} />

        <div className="equation-line" style={{ marginLeft: '-7.5rem' }}>
          <img src="/equations/hyperbolic_partition_product.svg" alt="Hyperbolic Partition Product" style={{ height: '19px', width: 'auto' }} />
        </div>

        <div style={{ height: '0.8rem' }} />

        <div className="equation-line" style={{ marginLeft: '-3.4rem' }}>
          <img src="/equations/hyperbolic_partition_sum.svg" alt="Hyperbolic Partition Sum" style={{ height: '19px', width: 'auto' }} />
        </div>

        <div style={{ height: '0.8rem' }} />

        <div className="equation-line" style={{ marginLeft: '1.2rem' }}>
          <img src="/equations/hyperbolic_partition_quadrance.svg" alt="Hyperbolic Partition Quadrance" style={{ height: '22.0px', width: 'auto' }} />
        </div>

        <div style={{ height: '2rem' }} />

        <div className="zhe-value-section">
          <div className="zhe-values-column">
            {[
              { src: 'zhe_1.svg', value: '0.0854245431533304 ...' },
              { src: 'zhe_2.svg', value: '3.66756753485501 ...' },
              { src: 'zhe_3.svg', value: '- 1.87649603900417 ... + 4.06615262615972 ...', imag: true },
              { src: 'zhe_4.svg', value: '- 1.87649603900417 ... - 4.06615262615972 ...', imag: true },
            ].map(({ src, value, imag }, i) => (
              <div key={i} className="equation-line-left" style={{ marginBottom: '0.4rem', paddingLeft: '2.0rem' }}>
                <img src={`/equations/${src}`} alt={src} style={{ height: '14px', width: 'auto', position: 'relative', top: '3px' }} />
                <span style={{ marginLeft: '0.4em' }}>= {value}</span>
                {imag && <img src="/equations/i.svg" alt="i" style={{ height: '13px', width: 'auto', position: 'relative', top: '-2px', marginLeft: '0.3em' }} />}
              </div>
            ))}
          </div>
        </div>

        <div style={{ height: '1.0rem' }} />

        <p className="equation-description" style={{ marginTop: '2rem' }}>
  The first of those quadrances is <a
              href="https://physics.nist.gov/cgi-bin/cuu/Value?alph"
              target="_blank"
              rel="noopener noreferrer"
              className="legend-link"
          >
            the fine structure constant
          </a> &nbsp;
  <img src="/equations/zhe_1_squared_equation.svg" alt="zhe_squared=alpha" style={{ height: '21px', width: 'auto', verticalAlign: '-0.30em', display: 'inline' }} />.
</p>
        <div style={{ height: '1.0rem' }} />

        <p className="equation-description" style={{ marginTop: '2rem' }}>
  In polar coordinates&nbsp;
  <img src="/equations/zhe_3.svg" alt="zhe_3" style={{ height: '14px', width: 'auto', verticalAlign: '-0.25em', display: 'inline' }} />{' '}
  and{' '}
  <img src="/equations/zhe_4.svg" alt="zhe_4" style={{ height: '14px', width: 'auto', verticalAlign: '-0.25em', display: 'inline' }} /> are expressed as&nbsp;
  <img src="/equations/zhe_3_polar_equation.svg" alt="zhe_3_polar" style={{ height: '22px', width: 'auto', verticalAlign: '-0.25em', display: 'inline' }} />{' '}
  and{' '}
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

        <div style={{ height: '2.0rem' }} />

        <p className="equation-description">
          In addition to their product, sum, and quadrance, these hyperbolic partition constants possess the following algebraic-geometric symmetries.
        </p>

        <div style={{ height: '1.8rem' }} />

        <div className="equation-line-left" style={{ paddingLeft: '2.0rem' }}>
  <img src="/equations/zhe_big_product.svg" alt="zhe big product" style={{ height: '60px', width: 'auto', marginRight: '2.5rem' }} />
  <img src="/equations/zhe_big_sum.svg" alt="zhe big sum" style={{ height: '60px', width: 'auto', marginRight: '2.5rem' }} />
  <img src="/equations/zhe_big_quadrance.svg" alt="zhe big quadrance" style={{ height: '60px', width: 'auto' }} />
</div>

<div style={{ height: '2.0rem' }} />

<div className="equation-line-left" style={{ paddingLeft: '2.0rem' }}>
  <img src="/equations/zhe_3_zhe_4_product.svg" alt="zhe_3 zhe_4 product" style={{ height: '21px', width: 'auto', marginRight: '4rem' }} />
  <img src="/equations/zhe_1_zhe_2_product.svg" alt="zhe_1 zhe_2 product" style={{ height: '46px', width: 'auto' }} />
</div>

<div style={{ height: '2.0rem' }} />

<div className="equation-line-left" style={{ paddingLeft: '2.0rem' }}>
  <img src="/equations/zhe_negative_one.svg" alt="zhe -1" style={{ height: '45px', width: 'auto', marginRight: '4rem' }} />
  <img src="/equations/zhe_inversion.svg" alt="zhe inversion" style={{ height: '45px', width: 'auto' }} />
</div>

<div style={{ height: '2.0rem' }} />

<div className="equation-line-left" style={{ paddingLeft: '2.0rem' }}>
  <img src="/equations/zhe_bi_product_sum.svg" alt="zhe bi product sum" style={{ height: '17px', width: 'auto' }} />
</div>

        <div style={{ height: '3.5rem' }} />

        <div
  className="zhe-image-column"
  style={{
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '-5rem'
  }}
>
  <svg viewBox="-5 -5 10 10" width="400" height="400">
    <line x1="-5" y1="0" x2="5" y2="0" stroke="white" strokeWidth="0.02" />
    <line x1="0" y1="-5" x2="0" y2="5" stroke="white" strokeWidth="0.02" />
    {[...Array(11).keys()].map(i => {
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

          <div style={{ height: '10.0rem' }} />

        <div style={{ display: 'block', width: '100%' }} />
        <div style={{ height: '2.0rem' }} />
      </div>
    </LayoutWrapper>
  );
}
