'use client';

import LayoutWrapper from '@/components/LayoutWrapper';
import '../globals.css';

export default function CoherentUnits() {
  return (
    <LayoutWrapper>
  <div className="coherent-units-page">
    <div
  className="symbol-overlay"
  style={{
    left: 0,
    width: "100vw",
  }}
/>

    <div
  className="partition-content"
  style={{
    width: "min(1750px, calc(100vw - var(--sidebar-width) - 4rem))",
    maxWidth: "none",
  }}
>
      <div className="legend-title">coherent units</div>

<div
        className="equation-description"
        style={{
          textAlign: 'center',
          fontStyle: 'italic',
        }}
      >
        Coherence means that the equations, not convention, determine how the units fit together.
      </div>

      <div style={{ height: '2.0rem' }} />

      <div className="equation-description">
        Measurement began as a collection of largely unrelated human conventions—feet,
        hours, weights, temperatures. Physics progressively revealed that a useful system
        cannot merely assign names to quantities: its units must close under the equations
        of Nature. If force is mass × acceleration, the unit of force should emerge from the units
        of mass, length, and time without an arbitrary correction factor. If energy is
        force × distance, its unit should follow from the same system. This is the essential
        meaning of a <i>coherent</i> system of units.
      </div>

      <div className="equation-description">
      The deeper importance of measurement is that measured quantities do not remain isolated: once expressed quantitatively, they constrain one other. Galileo’s analysis of falling bodies made this especially clear: distance, time, velocity, and acceleration form a connected system rather than a collection of independent observations.
      </div>

      <div className="equation-description">
        In geometry and mechanics, length and time first appear as distinct primitive
        measurements. Newtonian mechanics binds them through velocity and
        acceleration, while mass introduces another independent dimension. Force,
        momentum, energy, and the other mechanical quantities then arise as combinations
        of these underlying dimensions.
      </div>

      <div className="equation-description">
        Electromagnetism made the demand for coherence still more explicit. Gauss,
        Weber, Maxwell, and others found that electrical and magnetic quantities could
        not be treated as an unrelated collection of measures: the equations themselves impose
        relations among them. The nineteenth-century absolute systems of units grew from the effort to make systems of measurement reflect the algebraic structure of
        physical laws.
      </div>

      <div className="equation-description">
        Dimensional analysis made this principle systematic. An equation whose dimensions
        do not balance can be rejected before any numerical measurement is made.
        Coherence therefore does more than simplify notation: it constrains which
        mathematical expressions can represent physical relations at all. Dimensional consistency is a requirement of physical law.
      </div>

      <div className="equation-description">
        With Giorgi&apos;s MKS proposal, and eventually the International System of Units,
        coherence became an explicit organizing principle. Derived units are constructed as products of
        powers of the base units without any additional numerical conversion factors.
        Force, energy, power, electric potential, resistance, and the other derived quantities therefore do not
        require independent dimensional conventions; their units follow from the dimensional structure of
        the system.
      </div>

      <div className="equation-description">
        Relativity deepened this picture. Space and time are no longer independent backgrounds for
        physical events: <i>x</i> and <i>ct</i> belong to a common spacetime geometry,
        joined by the invariant speed of light. In other words, the meter is realized through the second together with the fixed value of <i>c</i>.
        Therefore, our unit of space is defined
        through our unit of time and an invariant of Nature. What once appeared to require two independent standards is revealed as a constrained relationship. Likewise, every constant of Nature encodes a fixed relationship in the dimensions of physical reality. Taken together, they constrain how the measurable dimensions of physical reality fit into one coherent system.
      </div>

      <div style={{ height: '1.0rem' }} />

      <div className="equation-description">
        A coherent system is therefore more than a common language for measurement:
        its units reproduce the dimensional structure of physical laws. The
        quantities governing persistent atomic constructions reveal a minimal
        coherent basis.
      </div>

      <div className="equation-description">
        There are <img
            src="/equations/red-5.svg"
            alt="5"
            style={{ height: '13px', width: 'auto', display: 'inline-block', position: 'relative', top: '-2px' }}
          /> coherent units (or bases) of atomic logic: the second, meter, coulomb,
        kelvin, and kilogram. Together, these provide the dimensional basis to describe the internally
        consistent constructive logic of persistent forms (atoms).
      </div>

      <div style={{ height: '1.0rem' }} />

      <div
  style={{
    textAlign: 'center',
    fontSize: '1.2rem',
    fontWeight: 'normal',
    color: 'rgba(226, 205, 92, 0.58)',
    margin: '0rem 0 1.25rem',
  }}
>
  coherent units
</div>

      <div className="equation-line" style={{ marginLeft: '-0.0rem' }}>
        <img
          src="/equations/5_units.svg"
          alt="5 coherent units"
          style={{ height: '144px', width: 'auto' }}
        />
      </div>

      <div style={{ height: '1.0rem' }} />

      <div className="equation-description">
        Combining these <img
            src="/equations/red-5.svg"
            alt="5"
            style={{ height: '13px', width: 'auto', display: 'inline-block', position: 'relative', top: '-2px' }}
          /> coherent units—without introducing any scalar conversion factors—generates the composite units of physics and chemistry.
        Their dimensional relations therefore arise from a single common basis, allowing the units to work together as one internally consistent system for describing the action parameters for atomic exchanges.
      </div>

      <div style={{ height: '1.0rem' }} />

      <div style={{ textAlign: 'center', fontSize: '1.2rem', fontWeight: 'normal', color: 'rgba(226, 205, 92, 0.58)', marginBottom: '-0.0rem' }}>
  composite units
</div>

<div className="equation-line" style={{ marginTop: '-0.5rem', marginLeft: '0rem' }}>
  <img
    src="/equations/composite_units.svg"
    alt="the composite units"
    style={{ height: '200px', width: 'auto', marginTop: '0rem' }}
  />
</div>

        <div style={{ height: '1.0rem' }} />

      <div className="equation-description">
        There are also <img
            src="/equations/red-5.svg"
            alt="5"
            style={{ height: '13px', width: 'auto', display: 'inline-block', position: 'relative', top: '-2px' }}
          /> derived units of atomic logic, the: megahertz, femtometer, electron-volt, megaelectron-volt, and the gigaelectron-volt.
        Each is obtained from the coherent base system by a power of ten rescaling, without introducing an independent dimensional conversion factor. Equivalently, each uses a unit coefficient multiplying a power of ten, while preserving the same underlying dimensional relations.
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

      <div style={{ height: '1.0rem' }} />

      <div style={{ textAlign: 'center', fontSize: '1.2rem', fontWeight: 'normal', color: 'rgba(226, 205, 92, 0.58)', margin: '0rem 0 0rem' }}>
  derived units
</div>

      <div style={{ height: '1.2rem' }} />

      <div className="equation-line" style={{ marginLeft: '-0.0rem' }}>
          <img
            src="/equations/derived_units.svg"
            alt="derived units"
            style={{ height: '170px', width: 'auto' }}
          />
        </div>

      <div style={{ height: '1.0rem' }} />

      <div className="equation-description">
        The mole is different in kind from these dimensional units: it represents an amount found to be special in atomic constructions rather than an additional physical dimension.
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
