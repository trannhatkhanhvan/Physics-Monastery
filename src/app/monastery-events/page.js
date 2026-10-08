'use client';

import { useState } from 'react';
import LayoutWrapper from '@/components/LayoutWrapper';
import '../globals.css';

export default function MonasteryEvents() {
  const [activeImage, setActiveImage] = useState(null);

  const photoOrder = [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
    40, 31, 32, 69, 34, 35, 37, 36, 39, 38, 41,
    55, 43, 60, 54, 52, 44, 48, 64, 49, 59, 45, 67, 46, 42, 50, 61, 71, 47,
    51, 57, 58, 56, 53,
    66, 72, 63, 65, 62, 68, 70,
  ];

  const photoList = photoOrder.map((index) => ({
    thumb: `/photos/thumbnails/photo_${index}_thumb.jpg`,
    full: `/photos/photo_${index}.jpg`,
    alt: `Monastery Photo ${index}`,
  }));

  return (
    <LayoutWrapper>
      {/* ✅ Shared background overlay */}
      <div
  className="symbol-overlay"
  style={{
    left: 0,
    width: "100vw",
  }}
/>

      {/* ✅ Content structure */}
      <div
  className="partition-content"
  style={{
    width: "100%",
    maxWidth: "1800px",
  }}
>
        <div className="legend-title">Physics Monastery events</div>

        {/* 1️⃣ First two lines */}
        <p className="equation-description">
          The next Physics Monastery Science Retreat will be in Yellowstone National Park, late spring 2027.
        </p>
        <div style={{ height: '1rem' }} />
        <p className="equation-description">
          Details forthcoming.
        </p>

        <div style={{ height: '1rem' }} />

        {/* 2️⃣ Thumbnail gallery section (moved up) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.5rem',
            width: '100%',
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
                width: '100%',
                aspectRatio: '4 / 3',
                height: 'auto',
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
{`         Join us as we explore the combinatorial logic of atomic structures. We will focus on:
                 
                 the language of Calculus
                 the geometries on which Calculus operates: manifolds
                 the simplest hyperbolic 3-manifold: the Gieseking manifold
                 and its orientable double cover: the hyperbolic figure-eight knot
                 laws of physics
                     forces
                     structural rules
                     fundamental limits
                     the 288 constants of Nature
                 the 24-dimensional Leech lattice and its transformation structure
                 unimodular lattices, links, and their possible relation to atomic structure.
                 
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
                 Coding the logic of physics with the simplest closed set.                 
                                  
                `}
</div>

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
          to participate in our next Physics Monastery retreat, or in-person collaborative problem-solving session.
        </p>

        <div style={{ height: '0.25rem' }} />

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
