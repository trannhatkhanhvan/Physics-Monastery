'use client';

import { useState } from 'react';
import LayoutWrapper from '@/components/LayoutWrapper';
import '../globals.css';

export default function MonasteryEvents() {
  const [activeImage, setActiveImage] = useState(null);

  const photoList = Array.from({ length: 15 }, (_, i) => {
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

        <div style={{ height: '1rem' }} />

        <p className="equation-description">
          Interested in volunteering at the Physics Monastery? {' '}
          <a
            href="contact-us"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'inherit', textDecoration: 'none' }}
            onMouseOver={e => (e.target.style.color = 'yellow')}
            onMouseOut={e => (e.target.style.color = 'inherit')}
          >
            Contact us
          </a> to participate in research retreats and collaborative problem-solving sessions.
        </p>

        <div style={{ height: '2rem' }} />

        {/* ✅ Thumbnail gallery section */}
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
