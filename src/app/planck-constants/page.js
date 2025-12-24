'use client';

import { useState } from 'react';
import LayoutWrapper from '@/components/LayoutWrapper';
import '../globals.css';

export default function PlanckConstants() {
  const constants = [
    'Planck time',
    'Planck length',
    'Planck charge',
    'Planck temperature',
    'Planck mass'
  ];

  // Base keys used to build filenames
  const constantKeys = ['time', 'length', 'charge', 'temperature', 'mass'];

  const videoYouTubeIDs = [
    '3MH9gyNuscA',
    'aHIc7732vy0',
    'yBXzPSHHtJM',
    'vQwunytYJAM',
    'NGPv-oH_BDE'
  ];

  // Toggle 1: 3D vs 2D
  const [is3D, setIs3D] = useState(true);

  // Toggle 2: Real vs Imaginary
  const [isReal, setIsReal] = useState(true);

  const [modalImage, setModalImage] = useState(null);
  const [modalVideo, setModalVideo] = useState(null);

  // Build the filename from the two toggles
  // planck_time_real_3d.png, etc.
  const getImageFilename = (key) => {
    const partRI = isReal ? 'real' : 'imag';
    const part23 = is3D ? '3d' : '2d';
    return `planck_${key}_${partRI}_${part23}.png`;
  };

  return (
    <LayoutWrapper>
      <div className="symbol-overlay" />
      <div className="partition-content">
        <div className="legend-title">the Planck constants</div>

        <p className="equation-description">
          The Planck constants define the boundaries of the coherent bases of atomic logic.
          Here we showcase their phase plots, 3D and 2D surface plots, and their quantized plane-wave definitions.
        </p>

        <div style={{ height: '2rem' }} />

        <p className="equation-description">
          Phase plots of the{' '}
          <img
            src="/equations/red-5.svg"
            alt="5"
            style={{
              height: '13px',
              width: 'auto',
              display: 'inline-block',
              position: 'relative',
              top: '-2px',
            }}
          />{' '}
          Planck boundaries.
        </p>

        <div style={{ height: '2rem' }} />

        {/* Updated YouTube-style video thumbnails */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
          {videoYouTubeIDs.map((id, index) => (
            <div key={index} style={{ textAlign: 'center' }}>
              <div style={{ position: 'relative', width: '320px', height: '180px' }}>
                <img
                  src={`/videos/${id}_thumbnail.jpg`}
                  alt={constants[index]}
                  width="320"
                  height="180"
                  onClick={() => setModalVideo(id)}
                  style={{
                    borderRadius: '0.4rem',
                    boxShadow: '0 0 8px rgba(0,0,0,0.3)',
                    cursor: 'pointer',
                    objectFit: 'cover',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                  }}
                >
                  <div
                    style={{
                      width: 0,
                      height: 0,
                      borderTop: '12px solid transparent',
                      borderBottom: '12px solid transparent',
                      borderLeft: '18px solid white',
                      filter: 'drop-shadow(0 0 3px black)',
                    }}
                  />
                </div>
              </div>
              <div style={{ marginTop: '0.5rem' }}>{constants[index]}</div>
            </div>
          ))}
        </div>

        <div style={{ height: '2rem' }} />

        <p className="equation-description">
          {is3D ? '3D' : '2D'} {isReal ? 'real' : 'imaginary'} surface plots of the{' '}
          <img
            src="/equations/red-5.svg"
            alt="5"
            style={{
              height: '13px',
              width: 'auto',
              display: 'inline-block',
              position: 'relative',
              top: '-2px',
            }}
          />{' '}
          Planck boundaries.
        </p>

        <div style={{ height: '2rem' }} />

        {/* Image grid */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: is3D ? '0.8rem' : '2.5rem',
            flexWrap: 'wrap',
          }}
        >
          {constantKeys.map((key, index) => {
            const filename = getImageFilename(key);

            return (
              <div key={key} style={{ textAlign: 'center' }}>
                <img
                  src={`/images/${filename}`}
                  alt={constants[index]}
                  onClick={() => setModalImage(`/images/${filename}`)}
                  style={{
                    height: is3D ? '110px' : '100px',
                    width: 'auto',
                    cursor: 'pointer',
                    borderRadius: '0.3rem',
                    boxShadow: '0 0 8px rgba(0,0,0,0.3)',
                    // keep your special temperature shift, but only apply it for 2D
                    transform:
                      !is3D && filename === `planck_temperature_${isReal ? 'real' : 'imag'}_2d.png`
                        ? 'translateX(12.5px)'
                        : 'none',
                  }}
                />
                <div style={{ marginTop: '0.5rem' }}>{constants[index]}</div>
              </div>
            );
          })}
        </div>

        <div style={{ height: '1.5rem' }} />

{/* Two text toggles on the same line */}
<div
  style={{
    display: 'flex',
    justifyContent: 'center',
    gap: '2rem',
    flexWrap: 'wrap',
    marginBottom: '1rem',
    fontSize: '0.95rem',
    userSelect: 'none',
  }}
>
  {/* 2D | 3D surface plots */}
  <div
  style={{
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: 'white',
    padding: '0.45rem 0.9rem',
    border: '1.5px solid white',
    borderRadius: '999px',
    backgroundColor: 'rgba(0,0,0,0.35)',
  }}
>

    <span
      onClick={() => setIs3D(false)}
      style={{
        cursor: is3D ? 'pointer' : 'default',
        color: !is3D ? 'yellow' : 'white',
        fontWeight: !is3D ? 700 : 400,
        transform: !is3D ? 'scale(1.05)' : 'scale(1)',
        transition: 'transform 0.18s ease, color 0.18s ease',
        display: 'inline-block',
      }}
    >
      2D
    </span>

    <span style={{ opacity: 0.6 }}>|</span>

    <span
      onClick={() => setIs3D(true)}
      style={{
        cursor: !is3D ? 'pointer' : 'default',
        color: is3D ? 'yellow' : 'white',
        fontWeight: is3D ? 700 : 400,
        transform: is3D ? 'scale(1.05)' : 'scale(1)',
        transition: 'transform 0.18s ease, color 0.18s ease',
        display: 'inline-block',
      }}
    >
      3D
    </span>

  </div>

  {/* real | imaginary */}
  <div
  style={{
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: 'white',
    padding: '0.45rem 0.9rem',
    border: '1.5px solid white',
    borderRadius: '999px',
    backgroundColor: 'rgba(0,0,0,0.35)',
  }}
>

    <span
      onClick={() => setIsReal(true)}
      style={{
        cursor: !isReal ? 'pointer' : 'default',
        color: isReal ? 'yellow' : 'white',
        fontWeight: isReal ? 700 : 400,
        transform: isReal ? 'scale(1.05)' : 'scale(1)',
        transition: 'transform 0.18s ease, color 0.18s ease',
        display: 'inline-block',
      }}
    >
      real
    </span>

    <span style={{ opacity: 0.6 }}>|</span>

    <span
      onClick={() => setIsReal(false)}
      style={{
        cursor: isReal ? 'pointer' : 'default',
        color: !isReal ? 'yellow' : 'white',
        fontWeight: !isReal ? 700 : 400,
        transform: !isReal ? 'scale(1.05)' : 'scale(1)',
        transition: 'transform 0.18s ease, color 0.18s ease',
        display: 'inline-block',
      }}
    >
      imaginary
    </span>
  </div>
</div>
          
        <div style={{ height: '2rem' }} />

        <p className="equation-description" style={{ fontSize: '20px', marginLeft: '14.9rem', textIndent: 0 }}>
          Exponential Planck boundaries
        </p>

        <div style={{ height: '2rem' }} />

        <div className="equation-line" style={{ marginLeft: '-0.55rem' }}>
          <img src="/equations/planck_time_equation.svg" alt="Planck time equation" style={{ height: '44px', width: 'auto' }} />
        </div>

        <div style={{ height: '1.5rem' }} />

        <div className="equation-line" style={{ marginLeft: '-1.25rem' }}>
          <img src="/equations/planck_length_equation.svg" alt="Planck length equation" style={{ height: '44px', width: 'auto' }} />
        </div>

        <div style={{ height: '1.5rem' }} />

        <div className="equation-line" style={{ marginLeft: '2.3rem' }}>
          <img src="/equations/planck_charge_equation.svg" alt="Planck charge equation" style={{ height: '56px', width: 'auto' }} />
        </div>

        <div style={{ height: '1.5rem' }} />

        <div className="equation-line" style={{ marginLeft: '-5.8rem' }}>
          <img
            src="/equations/planck_temperature_equation.svg"
            alt="Planck temperature equation"
            style={{ height: '49px', width: 'auto' }}
          />
        </div>

        <div style={{ height: '1.5rem' }} />

        <div className="equation-line" style={{ marginLeft: '-1.1rem' }}>
          <img src="/equations/planck_mass_equation.svg" alt="Planck mass equation" style={{ height: '45px', width: 'auto' }} />
        </div>

        <div style={{ height: '2.0rem' }} />

        {/* ...everything below here is unchanged from your current file... */}
        <p className="equation-description">
          Where{' '}
          <img
            src="/equations/pi.svg"
            alt="pi"
            style={{ height: '8px', width: 'auto', display: 'inline-block', position: 'relative', top: '-0px' }}
          />{' '}
          ={' '}
          <a
            href="https://en.wikipedia.org/wiki/Pi"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'inherit', textDecoration: 'none' }}
            onMouseOver={(e) => (e.target.style.color = 'yellow')}
            onMouseOut={(e) => (e.target.style.color = 'inherit')}
          >
            Archimedes&apos; constant
          </a>
          ,{' '}
          <img
            src="/equations/i.svg"
            alt="i"
            style={{ height: '11px', width: 'auto', display: 'inline-block', position: 'relative', top: '-1.5px' }}
          />{' '}
          ={' '}
          <a
            href="https://en.wikipedia.org/wiki/Imaginary_unit"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'inherit', textDecoration: 'none' }}
            onMouseOver={(e) => (e.target.style.color = 'yellow')}
            onMouseOut={(e) => (e.target.style.color = 'inherit')}
          >
            the imaginary unit
          </a>
          ,{' '}
          <img
            src="/equations/euler_s_number.svg"
            alt="e"
            style={{ height: '8px', width: 'auto', display: 'inline-block', position: 'relative', top: '-0px' }}
          />{' '}
          ={' '}
          <a
            href="https://en.wikipedia.org/wiki/E_(mathematical_constant)"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'inherit', textDecoration: 'none' }}
            onMouseOver={(e) => (e.target.style.color = 'yellow')}
            onMouseOut={(e) => (e.target.style.color = 'inherit')}
          >
            Euler&apos;s number
          </a>
          ,{' '}
          <img
            src="/equations/w_we.svg"
            alt="W_We"
            style={{ height: '15px', width: 'auto', display: 'inline-block', position: 'relative', top: '-1px' }}
          />{' '}
          ={' '}
          <a
            href="https://mathworld.wolfram.com/WeierstrassConstant.html"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'inherit', textDecoration: 'none' }}
            onMouseOver={(e) => (e.target.style.color = 'yellow')}
            onMouseOut={(e) => (e.target.style.color = 'inherit')}
          >
            the Weierstrass constant
          </a>
          ,{' '}
          <img
            src="/equations/sinh_x.svg"
            alt="sinh(x)"
            style={{ height: '15px', width: 'auto', display: 'inline-block', position: 'relative', top: '-2px' }}
          />{' '}
          ={' '}
          <a
            href="https://mathworld.wolfram.com/HyperbolicSine.html"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'inherit', textDecoration: 'none' }}
            onMouseOver={(e) => (e.target.style.color = 'yellow')}
            onMouseOut={(e) => (e.target.style.color = 'inherit')}
          >
            the hyperbolic sine function
          </a>
          , and{' '}
          <img
            src="/equations/cos_x.svg"
            alt="cos(x)"
            style={{ height: '16px', width: 'auto', display: 'inline-block', position: 'relative', top: '-1.5px' }}
          />{' '}
          ={' '}
          <a
            href="https://mathworld.wolfram.com/Cosine.html"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'inherit', textDecoration: 'none' }}
            onMouseOver={(e) => (e.target.style.color = 'yellow')}
            onMouseOut={(e) => (e.target.style.color = 'inherit')}
          >
            the cosine function
          </a>
          .
        </p>

        <div style={{ height: '16rem' }} />
      </div>

      {/* Image Modal */}
      {modalImage && (
        <div
          onClick={() => setModalImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
          }}
        >
          <img
            src={modalImage}
            alt="Full size"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              borderRadius: '0.5rem',
              boxShadow: '0 0 24px black',
            }}
          />
        </div>
      )}

      {/* Video Modal */}
      {modalVideo && (
        <div
          onClick={() => setModalVideo(null)}
          style={{
            position: 'fixed',
            inset: 0,
            paddingLeft: '180px',
            backgroundColor: 'rgba(0,0,0,0.85)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              width: 'calc(100vw - 240px)',
              maxWidth: '960px',
              aspectRatio: '16/9',
              borderRadius: '0.5rem',
              overflow: 'hidden',
              boxShadow: '0 0 24px black',
              backgroundColor: '#000',
            }}
          >
            <iframe
              src={`https://www.youtube.com/embed/${modalVideo}?autoplay=1`}
              title="YouTube video"
              frameBorder="0"
              allow="autoplay; encrypted-media"
              allowFullScreen
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        </div>
      )}
    </LayoutWrapper>
  );
}
