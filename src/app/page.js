'use client';

import { useEffect, useState } from 'react';
import LayoutWrapper from '@/components/LayoutWrapper';

export default function HomePage() {
  const [showParagraph, setShowParagraph] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [hideMessage, setHideMessage] = useState(false);

  useEffect(() => {
    const paragraphTimer = setTimeout(() => setShowParagraph(true), 2000);
    const showTimer = setTimeout(() => setShowMessage(true), 5000);
    const hideTimer = setTimeout(() => setHideMessage(true), 12000);
    return () => {
      clearTimeout(paragraphTimer);
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  const videoData = [
    { id: 'vRPYe9ZotcM', list: 'PLEvMwDb3CwhQBHKmFcYzM2QkkFOlO-4Gr' },
    { id: 'HyKyOdsDZKs' },
    { id: 'uhlj0wOybBA' },
    { id: 'peM1oCfX7X4' },
    { id: 'kwoNjQNiczU' },
    { id: 'DTVfhTaWSOU' }
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


        {/* Paragraph and overlay container */}
        {showParagraph && (
          <div
            style={{
              marginTop: '20rem', // Adjust vertical positioning here
              backgroundColor: 'rgba(0, 0, 0, 0.60)',
              padding: '1.5rem',
              borderRadius: '1rem',
              maxWidth: '52rem',
              transition: 'opacity 2s ease-in-out',
              opacity: showParagraph ? 1 : 0,
            }}
          >
            <p
              style={{
                fontSize: '1.1rem',
                color: 'white',
                textAlign: 'justify',
                textIndent: '2em',
                margin: 0,
              }}
            >
              At the Physics Monastery, we are dedicated to uncovering the hidden structure of Nature—not through speculation, but by systematically decoding the precise relationships embedded in the physical constants of Nature. Everything explored here is part of a larger effort to reveal how all 288 physical constants arise from a coherent geometric foundation. Our goal is simple: to understand why the universe is the way it is—and to show that its structure is intelligible, inevitable, and breathtakingly elegant.
            </p>
          </div>
        )}
      </div>

      {/* Scroll section with related YouTube videos */}
      <div
        style={{
          padding: '4rem 2rem',
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
      </div>
    </LayoutWrapper>
  );
}
