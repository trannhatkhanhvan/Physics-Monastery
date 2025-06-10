'use client';

import LayoutWrapper from '@/components/LayoutWrapper';
import '../globals.css';

export default function CoherentUnits() {
  return (
    <LayoutWrapper>
  <div className="coherent-units-page">
    <div className="symbol-overlay" />

    <div className="partition-content">
      <div className="legend-title">coherent units</div>

      <div className="equation-description">
        There are <img
            src="/equations/red-5.svg"
            alt="5"
            style={{ height: '13px', width: 'auto', display: 'inline-block', position: 'relative', top: '-2px' }}
          /> coherent units (or bases) of atomic logic, the: second, meter, coulomb, kelvin, and kilogram.
        Each of these bases defines a unit in the internally consistent constructive logic of persistent forms (atoms).
      </div>

      <div style={{ height: '2.0rem' }} />

      <div style={{ textAlign: 'center', fontSize: '1.2rem', fontWeight: 'normal', margin: '0rem 0 0rem' }}>
  units of atomic logic
</div>

      <div style={{ height: '1.0rem' }} />

      <div className="equation-line" style={{ marginLeft: '-0.0rem' }}>
          <img
            src="/equations/5_units.svg"
            alt="5 coherent units"
            style={{ height: '144px', width: 'auto' }}
          />
        </div>

      <div style={{ height: '2.0rem' }} />

      <div className="equation-description">
        Combining those <img
            src="/equations/red-5.svg"
            alt="5"
            style={{ height: '13px', width: 'auto', display: 'inline-block', position: 'relative', top: '-2px' }}
          /> coherent units—without any scalars—gives us the composite units of physics and chemistry.
        All of these units work in unison, logically capturing the action parameters of allowed atomic exchanges.
      </div>

      <div style={{ height: '2.5rem' }} />

      <div style={{ textAlign: 'center', fontSize: '1.2rem', fontWeight: 'normal', marginBottom: '-0.0rem' }}>
  composite units of atomic logic
</div>

<div className="equation-line" style={{ marginTop: '0rem', marginLeft: '0rem' }}>
  <img
    src="/equations/composite_units.svg"
    alt="the composite units"
    style={{ height: '200px', width: 'auto', marginTop: '0rem' }}
  />
</div>

        <div style={{ height: '2.0rem' }} />

      <div className="equation-description">
        There are also <img
            src="/equations/red-5.svg"
            alt="5"
            style={{ height: '13px', width: 'auto', display: 'inline-block', position: 'relative', top: '-2px' }}
          /> derived units of atomic logic, the: megahertz, femtometer, electron-volt, mega electron-volt, and the giga electron-volt.
        These are defined as products of powers of the base units (or combinations of the base units) without any additional numerical factor other than one.
        That is, every derived unit has a value of {' '}
  <a
    href="https://en.wikipedia.org/wiki/International_System_of_Units?"
    target="_blank"
    rel="noopener noreferrer"
    style={{
      color: 'inherit',
      textDecoration: 'none',
    }}
    onMouseOver={e => (e.target.style.color = 'yellow')}
    onMouseOut={e => (e.target.style.color = 'inherit')}
  >
    1 raised to some power of 10
  </a>—making them coherent with the rest of the units of atomic logic.
      </div>

      <div style={{ height: '2.5rem' }} />

      <div style={{ textAlign: 'center', fontSize: '1.2rem', fontWeight: 'normal', margin: '0rem 0 0rem' }}>
  derived units of atomic logic
</div>

      <div style={{ height: '1.5rem' }} />

      <div className="equation-line" style={{ marginLeft: '-0.0rem' }}>
          <img
            src="/equations/derived_units.svg"
            alt="derived units"
            style={{ height: '170px', width: 'auto' }}
          />
        </div>

      <div style={{ height: '2.0rem' }} />

      <div className="equation-description">
        Note, the mol is not a unit of measure—it is a unit of amount, found to be special in atomic constructions.
        The candela is a unit of luminous intensity—an amount of lumens (a unit based on the sensitivity of the human eye) divided by 4<img
            src="/equations/pi.svg"
            alt="pi"
            style={{ height: '9px', width: 'auto', display: 'inline-block', position: 'relative', top: '-1px' }}
          /> steradians (the geometric unit of solid angle).
      </div>

      <div style={{ height: '13.0rem' }} />

    </div>
  </div>
</LayoutWrapper>
  );
}
