'use client';

import { useState } from 'react';
import LayoutWrapper from '@/components/LayoutWrapper';
import '../globals.css';

export default function MonasteryEvents() {
  const [activeImage, setActiveImage] = useState(null);

  const photoList = Array.from({ length: 21 }, (_, i) => {
    const index = i + 1;
    return {
      thumb: `/photos/thumbnails/photo_${index}_thumb.jpg`,
      full: `/photos/photo_${index}.jpg`,
      alt: `Monastery Photo ${index}`,
    };
  });

  return (
    <LayoutWrapper>
      {/* ✅ Shared background overlay */}
      <div className="symbol-overlay" />

      {/* ✅ Content structure */}
      <div className="partition-content">
        <div className="legend-title">Physics Monastery events</div>

        {/* 1️⃣ First two lines */}
        <p className="equation-description">
          The next Physics Monastery Science Retreat will be May 13-20, 2026, in Logan, Utah.
        </p>
        <div style={{ height: '1rem' }} />
        <p className="equation-description">
          Scroll down for details.
        </p>

        <div style={{ height: '1rem' }} />

        {/* 2️⃣ Thumbnail gallery section (moved up) */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1.5rem',
            justifyContent: 'center',
            padding: '1rem 0',
          }}
        >
          {photoList.map((photo, index) => (
            <img
              key={index}
              src={photo.thumb}
              alt={photo.alt}
              onClick={() => setActiveImage(photo.full)}
              style={{
                width: '200px',
                height: '150px',
                objectFit: 'cover',
                cursor: 'pointer',
                borderRadius: '0.4rem',
                boxShadow: '0 0 6px rgba(0,0,0,0.25)',
                transition: 'transform 0.2s',
              }}
            />
          ))}
        </div>

        <div style={{ height: '1.5rem' }} />

        {/* 3️⃣ Rest of the text */}
        {/* Main descriptive block (without the two-column items) */}
<div
  className="equation-description"
  style={{ whiteSpace: 'pre-wrap', textIndent: 0 }}
>
{`         Join us, as we explore the combinatorial logic of atomic structures. We will focus on:
                 
                 the language of Calculus
                 geometries available to Calculus: manifolds
                 simplest manifold: Gieseking's 3-manifold
                 and its double cover: the hyperbolic figure eight knot
                 
                 laws of physics
                     forces
                     built-in rules
                     built-in limits
                     
                 288 constants of Nature
                 288 metric transforms available to tetrahedral structured volumes
                 the transform space avilable to that manifold: the 24D unit hypersphere (Leech lattice)
                 link types: 118 unimodular lattices available in 23D (consuming 1D to connect)
                 118 atoms
                 
`}
</div>

{/* Two-column list */}
<div
  className="equation-description"
  style={{
    textIndent: 0,
    marginTop: '0.5rem',
    marginBottom: '0.5rem',
    marginLeft: '4.5rem'   // ← THIS IS THE INDENT
  }}
>
  <div
    style={{
      display: 'flex',
      gap: '4rem',
      justifyContent: 'flex-start',
      flexWrap: 'nowrap',
    }}
  >
    <div>
      <div>primes</div>
      <div>Riemann zeta function</div>
      <div>gamma function</div>
      <div>modular arithmetic</div>
      <div>unimodular lattices</div>
    </div>

    <div>
      <div>Euclidean algorithm</div>
      <div>continued fractions</div>
      <div>fractals</div>
      <div>Mandelbrot set</div>
      <div>recursion</div>
    </div>
  </div>
</div>


{/* Resume original text */}
<div
  className="equation-description"
  style={{ whiteSpace: 'pre-wrap', textIndent: 0 }}
>
{`                 
                 Coding all of these rules as a closed set                 
                                  
         Weekend camping activities:
                 slot canyons
                 hiking
                 observational astronomy`}
</div>


        <div style={{ height: '2rem' }} />

        <p className="equation-description">
          <a
            href="/contact-us"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'inherit', textDecoration: 'none' }}
            onMouseOver={(e) => (e.currentTarget.style.color = 'yellow')}
            onMouseOut={(e) => (e.currentTarget.style.color = 'inherit')}
          >
            Contact us
          </a>{' '}
          to participate in this in-person collaborative problem-solving session.
        </p>

        <div style={{ height: '2rem' }} />

        <p className="equation-description">
          All events aim to deepen our shared understanding of the structural foundations of Nature and to inspire a collective pursuit of insight.
        </p>

        <div style={{ height: '8rem' }} />
      </div>

      {/* ✅ Modal for full-size image */}
      {activeImage && (
        <div
          onClick={() => setActiveImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            cursor: 'zoom-out',
          }}
        >
          <img
            src={activeImage}
            alt="Full size event photo"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              borderRadius: '0.5rem',
              boxShadow: '0 0 16px black',
            }}
          />
        </div>
      )}
    </LayoutWrapper>
  );
}
