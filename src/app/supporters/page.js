'use client';

import React from 'react';
import LayoutWrapper from '@/components/LayoutWrapper';
import '../globals.css';
import Image from 'next/image';

export default function Supporters() {
  const categoryGap = { marginTop: '1.00rem' };
  const rightPatreonColumnSpacer = '1.35rem';

  return (
    <LayoutWrapper>
      {/* Shared background overlay */}
      <div className="symbol-overlay" />

      {/* Page content */}
      <div className="partition-content">
        <div className="legend-title">supporters</div>

        <p className="equation-description">
          The Physics Monastery&apos;s research is made possible by{' '}
          <a
            href="https://www.wolframalpha.com/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'inherit', textDecoration: 'none' }}
            onMouseOver={e => (e.target.style.color = 'yellow')}
            onMouseOut={e => (e.target.style.color = 'inherit')}
          >
            WolframAlpha
          </a>
          ,{' '}
          <a
            href="https://physics.nist.gov/cuu/Constants/index.html"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'inherit', textDecoration: 'none' }}
            onMouseOver={e => (e.target.style.color = 'yellow')}
            onMouseOut={e => (e.target.style.color = 'inherit')}
          >
            NIST/CODATA
          </a>
          , and a growing community of supporters who believe in the pursuit of
          deep understanding and the unification of physical law. Thank you all!
        </p>

        {/* Double-column list of names */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            margin: '2rem 0',
            gap: '4rem',
          }}
        >
          <ul style={{ listStyleType: 'none', padding: 0 }}>
            <li>Angela Arvizu</li>
            <li>Vanessa Moon</li>
            <li>Matthew Fox</li>
            <li>David Heggli</li>
            <li>Eschelon Azha</li>
            <li>Avi Rubin</li>
          </ul>

          <ul style={{ listStyleType: 'none', padding: 0 }}>
            <li>Wayne Eskridge</li>
            <li>Dan Whitaker</li>
            <li>Kevin Sirios</li>
            <li>Mike Ritter</li>
            <li>Jerry Gardner</li>
            <li>Shauna Montgomery</li>
          </ul>
        </div>

        {/* Patreon supporters section */}
        <div style={{ marginBottom: '2rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '1rem',
              marginBottom: '1rem',
            }}
          >
            <h3 style={{ margin: 0, textAlign: 'center', fontSize: '1.40rem' }}>
  Patreon supporters
</h3>

            <a
              href="https://www.patreon.com/physicsmonastery"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                position: 'relative',
                top: '-3px',
                display: 'inline-block',
                padding: '2px',
                borderRadius: '4px',
                backgroundColor: 'transparent',
              }}
              onMouseOver={e =>
                (e.currentTarget.style.backgroundColor = '#ffcc00')
              }
              onMouseOut={e =>
                (e.currentTarget.style.backgroundColor = 'transparent')
              }
            >
              <Image
                src="/images/patreon-logo_1.png"
                alt="Support us on Patreon"
                width={30}
                height={30}
              />
            </a>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '5rem',
            }}
          >
            {/* Left pair: names + titles */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto auto',
                columnGap: '1.5rem',
              }}
            >
              <ul style={{ listStyleType: 'none', margin: 0, padding: 0 }}>
                <li>Tim Dodge</li>
                <li>Attie Retief</li>
                <li>Seth Lamancusa</li>

                <li style={categoryGap}>Bráulio Oliveira</li>
                <li>InvaderH</li>

                <li style={categoryGap}>Mike Godzina</li>
                <li>L</li>

                <li style={categoryGap}>Cully O&apos;Meara</li>
                <li>Joakim Pettersson</li>
                <li>Duarte Cunha Leão</li>
                <li>Rongomai Bailey</li>
                <li>Yishai Mendelsohn</li>
                <li>Harvey Summers</li>
                <li>Tyler Weldon</li>
                <li>Michael Jacobson</li>
              </ul>

              <ul style={{ listStyleType: 'none', margin: 0, padding: 0 }}>
                <li>Natural Philosopher</li>
                <li>Natural Philosopher</li>
                <li>Natural Philosopher</li>

                <li style={categoryGap}>Friar</li>
                <li>Friar</li>

                <li style={categoryGap}>Advocate</li>
                <li>Advocate</li>

                <li style={categoryGap}>Volunteer</li>
                <li>Volunteer</li>
                <li>Volunteer</li>
                <li>Volunteer</li>
                <li>Volunteer</li>
                <li>Volunteer</li>
                <li>Volunteer</li>
                <li>Volunteer</li>
              </ul>
            </div>

            {/* Right pair: names + titles */}
<div
  style={{
    display: 'grid',
    gridTemplateColumns: 'auto auto',
    columnGap: '1rem',
    paddingTop: rightPatreonColumnSpacer,
  }}
>
              <ul style={{ listStyleType: 'none', margin: 0, padding: 0 }}>
                <li>Gregg Stadhams</li>
                <li>Titanium Heart</li>
                <li>Alex Shevchenko</li>
                <li>Christoph Schiller</li>
                <li>Joseph Mavor</li>
                <li>James Rohan</li>
                <li>Nikhil</li>
                <li>Colleen</li>
                <li>Chuck</li>
                <li>bspidel</li>
                <li>beads</li>
                <li>Jim</li>
                <li>Dan Girshovich</li>
                <li>lmcc</li>
                <li>Sarah-Stisnt</li>
              </ul>

              <ul style={{ listStyleType: 'none', margin: 0, padding: 0 }}>
                <li>Volunteer</li>
                <li>Volunteer</li>
                <li>Volunteer</li>
                <li>Volunteer</li>
                <li>Volunteer</li>
                <li>Volunteer</li>
                <li>Volunteer</li>
                <li>Volunteer</li>
                <li>Volunteer</li>
                <li>Volunteer</li>
                <li>Volunteer</li>
                <li>Volunteer</li>
                <li>Volunteer</li>
                <li>Volunteer</li>
                <li>Volunteer</li>
              </ul>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <p style={{ marginTop: '1rem' }}>
            Join our supporters and help illuminate the path toward a unified
            understanding of Nature.
          </p>

          <div style={{ height: '2.0rem' }} />

          <p>
            <a
              href="https://www.youtube.com/watch?v=hda0_31_dyc"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'white',
                textDecoration: 'underline',
                textDecorationColor: '#ffcc00',
              }}
            >
              Why true breakthroughs in physics require independent research.
            </a>
          </p>

          <div style={{ height: '12.0rem' }} />
        </div>
      </div>
    </LayoutWrapper>
  );
}