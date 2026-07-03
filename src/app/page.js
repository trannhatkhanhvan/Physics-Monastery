'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import LayoutWrapper from '@/components/LayoutWrapper';

export default function HomePage() {
  const [showParagraph, setShowParagraph] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [hideMessage, setHideMessage] = useState(false);
  const [foxHovered, setFoxHovered] = useState(false);

  useEffect(() => {
    const paragraphTimer = setTimeout(() => setShowParagraph(true), 2000);
    const showTimer = setTimeout(() => setShowMessage(true), 3000);
    const hideTimer = setTimeout(() => setHideMessage(true), 24000);
    return () => {
      clearTimeout(paragraphTimer);
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  const videoData = [
    { id: '23BhfLN65jI' },
    { id: 'yvaqdHpGU-g' },
    { id: 'sDHcTJzbzos' },
    { id: 'vRPYe9ZotcM', list: 'PLEvMwDb3CwhQBHKmFcYzM2QkkFOlO-4Gr' },
    { id: 'HyKyOdsDZKs' },
    { id: 'uhlj0wOybBA' },
    { id: 'peM1oCfX7X4' },
    { id: 'kwoNjQNiczU' },
  ];

  return (
    <LayoutWrapper>
      {/* Top intro section */}
      <div
        className="partition-content"
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'center',
          textAlign: 'center',
          paddingTop: '2rem',
        }}
      >
        <div className="legend-title">Welcome to the Physics Monastery</div>

        {/* Reserved scroll prompt space below the title */}
<div
  style={{
    height: '2rem', // Reserve space to prevent layout shift
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: '-1.5rem',
  }}
>
  <div
    style={{
      fontSize: '1.2rem',
      color: 'white',
      opacity: showMessage && !hideMessage ? 1 : 0,
      transition: 'opacity 2s ease-in-out',
    }}
  >
    Explore the menu to the left, or scroll down for related videos.

  </div>
</div>

                {/* Center thesis text */}
        <div
          style={{
            position: 'absolute',
            top: '30%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '100%',
            maxWidth: '52rem',
            padding: '0 1.5rem',
            boxSizing: 'border-box',
            textAlign: 'justify',
          }}
        >
          <div
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              padding: '1.1rem 1.3rem',
              borderRadius: '1rem',
              color: 'white',
              lineHeight: '1.6',
              fontSize: '1.00rem',
            }}
          >
            Central Thesis: A Universe that persists must instantiate a geometry capable of persistence. The simplest such geometry is the hyperbolic figure-eight knot complement. Its 288 transformational degrees of freedom appear in physics as the constants of Nature.
          </div>
        </div>


        {/* Paragraph and overlay container */}
        {showParagraph && (
          <div
  style={{
    position: 'absolute',
    bottom: '1.5rem',                 // ⬅️ Bottom padding restored
    left: '1.5rem',                   // ⬅️ from left edge
    right: '1.5rem',                  // ⬅️ from right edge
    margin: '0 auto',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    padding: '1.0rem',
    borderRadius: '1rem',
    maxWidth: '52rem',              // ⬅️ Still caps max width
    transition: 'opacity 2s ease-in-out',
    opacity: showParagraph ? 1 : 0,
  }}
>

            <p
              style={{
                fontSize: '1.0rem',
                color: 'white',
                textAlign: 'justify',
                margin: 0,
              }}
            >
              Unveiling the hidden structure of reality by systematically decoding the precise relationships embedded in the physical constants of Nature. Our goal is to understand why the Universe is the way it is by specifying the rules underlying atomic logic and the coherent geometric foundation from which all 288 physical constants arise.
            </p>
          </div>
        )}
      </div>

      {/* Scroll section with related YouTube videos */}
      <div
        style={{
          position: 'relative',
          padding: '4rem 2rem 6rem',
          color: '#fff',
          textAlign: 'center',
          backgroundColor: 'transparent',
        }}
      >
        <h2 style={{ fontSize: '1.8rem', marginBottom: '2rem' }}>Related Videos</h2>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '2rem',
          }}
        >
          {videoData.map((video, idx) => {
            let src = `https://www.youtube.com/embed/${video.id}`;
            if (video.list) {
              src += `?list=${video.list}`;
            }

            return (
              <iframe
                key={idx}
                width="360"
                height="203"
                src={src}
                title={`YouTube video ${idx + 1}`}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{
                  borderRadius: '0.5rem',
                  boxShadow: '0 0 12px rgba(0,0,0,0.4)',
                }}
              />
            );
          })}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: '2.75rem',
            paddingRight: '0rem',
            paddingBottom: '0.0rem',
          }}
        >
          <Link
            href="/typed-boundary-calculus"
            aria-label="Open Typed Boundary Calculus"
            title=""
            onMouseEnter={() => setFoxHovered(true)}
            onMouseLeave={() => setFoxHovered(false)}
            onFocus={() => setFoxHovered(true)}
            onBlur={() => setFoxHovered(false)}
            style={{
              position: 'relative',
              display: 'inline-block',
              width: '94px',
              height: '67px',
              opacity: 0.9,
              textDecoration: 'none',
              transform: 'translate(20px, 80px)',
              filter: foxHovered
                ? 'drop-shadow(0 0 10px rgba(255, 204, 0, 0.85))'
                : 'drop-shadow(0 0 5px rgba(255, 255, 255, 0.28))',
              transition: 'filter 0.25s ease, opacity 0.25s ease, transform 0.25s ease',
            }}
          >
            <img
              src="/images/hidden_fox_full_body.png"
              alt=""
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                opacity: foxHovered ? 0 : 1,
                pointerEvents: 'none',
                transition: 'opacity 0.22s ease',
              }}
            />
            <img
              src="/images/hidden_fox_full_body_gold.png"
              alt=""
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                opacity: foxHovered ? 1 : 0,
                pointerEvents: 'none',
                transition: 'opacity 0.22s ease',
              }}
            />
          </Link>
        </div>
      </div>
    </LayoutWrapper>
  );
}
