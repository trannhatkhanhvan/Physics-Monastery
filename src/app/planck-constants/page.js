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

  const imageFilenames2D = [
    'planck_time_2d.png',
    'planck_length_2d.png',
    'planck_charge_2d.png',
    'planck_temperature_2d.png',
    'planck_mass_2d.png'
  ];

  const imageFilenames3D = [
    'planck_time_3d.png',
    'planck_length_3d.png',
    'planck_charge_3d.png',
    'planck_temperature_3d.png',
    'planck_mass_3d.png'
  ];

  const videoYouTubeIDs = [
    '3MH9gyNuscA',
    'aHIc7732vy0',
    'yBXzPSHHtJM',
    'vQwunytYJAM',
    'NGPv-oH_BDE'
  ];

  const [is3D, setIs3D] = useState(true);
  const [modalImage, setModalImage] = useState(null);
  const [modalVideo, setModalVideo] = useState(null);

  return (
    <LayoutWrapper>
      <div className="symbol-overlay" />
      <div className="partition-content">
        <div className="legend-title">the Planck constants</div>

        <p className="equation-description">
          The Planck constants are the coherent building blocks that structure all physical <a
            href="/constants-of-nature"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'inherit', textDecoration: 'none' }}
            onMouseOver={e => (e.target.style.color = 'yellow')}
            onMouseOut={e => (e.target.style.color = 'inherit')}
          >
            constants of Nature
          </a>.
          Here we showcase their phase plots, 3D and 2D surface plots, and their quantized plane-wave definitions.
        </p>

        <div style={{ height: '2rem' }} />

        <p className="equation-description">
          Phase plots of the <img
            src="/equations/red-5.svg"
            alt="5"
            style={{ height: '13px', width: 'auto', display: 'inline-block', position: 'relative', top: '-2px' }}
          /> Planck constants.
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
          3D and 2D surface plots of the <img
            src="/equations/red-5.svg"
            alt="5"
            style={{ height: '13px', width: 'auto', display: 'inline-block', position: 'relative', top: '-2px' }}
          /> Planck constants.
        </p>

           <div style={{ height: '2rem' }} />


        {/* Image grid */}
<div
  style={{
    display: 'flex',
    justifyContent: 'center',
    gap: is3D ? '0.8rem' : '2.5rem', // ← Different gap for 3D vs 2D
    flexWrap: 'wrap',
  }}
>
  {(is3D ? imageFilenames3D : imageFilenames2D).map((filename, index) => (
    <div key={index} style={{ textAlign: 'center' }}>
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
          transform:
            !is3D && filename === 'planck_temperature_2d.png'
              ? 'translateX(12.5px)'
              : 'none',
        }}
      />
      <div style={{ marginTop: '0.5rem' }}>{constants[index]}</div>
    </div>
  ))}
</div>



          <div style={{ height: '1.5rem' }} />

           {/* Toggle switch */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
          <button
            onClick={() => setIs3D(prev => !prev)}
            style={{
              padding: '0.4rem 1rem',
              backgroundColor: '#222',
              color: 'white',
              border: '1px solid white',
              borderRadius: '1rem',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            View: {is3D ? '2D Surface Plots' : '3D Surface Plots'}
          </button>
        </div>

        <div style={{ height: '2rem' }} />

        <p className="equation-description">
          Quantized plane-wave definitions of the <img
            src="/equations/red-5.svg"
            alt="5"
            style={{ height: '13px', width: 'auto', display: 'inline-block', position: 'relative', top: '-2px' }}
          /> Planck constants.
        </p>

        <div style={{ height: '2rem' }} />

        <div className="equation-line">
          <img
            src="/equations/planck_time_equation.svg"
            alt="Planck time equation"
            style={{ height: '44px', width: 'auto' }}
          />
        </div>

        <div style={{ height: '1.5rem' }} />

        <div className="equation-line" style={{ marginLeft: '-0.7rem' }}>
          <img
            src="/equations/planck_length_equation.svg"
            alt="Planck length equation"
            style={{ height: '44px', width: 'auto' }}
          />
        </div>

        <div style={{ height: '1.5rem' }} />

        <div className="equation-line" style={{ marginLeft: '2.9rem' }}>
          <img
            src="/equations/planck_charge_equation.svg"
            alt="Planck charge equation"
            style={{ height: '56px', width: 'auto' }}
          />
        </div>

        <div style={{ height: '1.5rem' }} />

        <div className="equation-line" style={{ marginLeft: '-5.2rem' }}>
          <img
            src="/equations/planck_temperature_equation.svg"
            alt="Planck temperature equation"
            style={{ height: '49px', width: 'auto' }}
          />
        </div>

        <div style={{ height: '1.5rem' }} />

        <div className="equation-line" style={{ marginLeft: '-0.5rem' }}>
          <img
            src="/equations/planck_mass_equation.svg"
            alt="Planck mass equation"
            style={{ height: '45px', width: 'auto' }}
          />
        </div>

        <div style={{ height: '2.0rem' }} />

        <p className="equation-description">
          Where <img
            src="/equations/pi.svg"
            alt="pi"
            style={{ height: '8px', width: 'auto', display: 'inline-block', position: 'relative', top: '-0px' }}
          /> = <a
            href="https://en.wikipedia.org/wiki/Pi"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'inherit', textDecoration: 'none' }}
            onMouseOver={e => (e.target.style.color = 'yellow')}
            onMouseOut={e => (e.target.style.color = 'inherit')}
          >
            Archimedes&apos; constant
          </a>, <img
            src="/equations/i.svg"
            alt="i"
            style={{ height: '11px', width: 'auto', display: 'inline-block', position: 'relative', top: '-1.5px' }}
          /> = <a
            href="https://en.wikipedia.org/wiki/Imaginary_unit"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'inherit', textDecoration: 'none' }}
            onMouseOver={e => (e.target.style.color = 'yellow')}
            onMouseOut={e => (e.target.style.color = 'inherit')}
          >
            the imaginary unit
          </a>, <img
            src="/equations/euler_s_number.svg"
            alt="e"
            style={{ height: '8px', width: 'auto', display: 'inline-block', position: 'relative', top: '-0px' }}
          /> = <a
            href="https://en.wikipedia.org/wiki/E_(mathematical_constant)"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'inherit', textDecoration: 'none' }}
            onMouseOver={e => (e.target.style.color = 'yellow')}
            onMouseOut={e => (e.target.style.color = 'inherit')}
          >
            Euler&apos;s number
          </a>, <img
            src="/equations/w_we.svg"
            alt="W_We"
            style={{ height: '15px', width: 'auto', display: 'inline-block', position: 'relative', top: '-1px' }}
          /> = <a
            href="https://mathworld.wolfram.com/WeierstrassConstant.html"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'inherit', textDecoration: 'none' }}
            onMouseOver={e => (e.target.style.color = 'yellow')}
            onMouseOut={e => (e.target.style.color = 'inherit')}
          >
            the Weierstrass constant
          </a>, <img
            src="/equations/sinh_x.svg"
            alt="sinh(x)"
            style={{ height: '15px', width: 'auto', display: 'inline-block', position: 'relative', top: '-2px' }}
          /> = <a
            href="https://mathworld.wolfram.com/HyperbolicSine.html"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'inherit', textDecoration: 'none' }}
            onMouseOver={e => (e.target.style.color = 'yellow')}
            onMouseOut={e => (e.target.style.color = 'inherit')}
          >
            the hyperbolic sine function
          </a>, and <img
            src="/equations/cos_x.svg"
            alt="cos(x)"
            style={{ height: '16px', width: 'auto', display: 'inline-block', position: 'relative', top: '-1.5px' }}
          /> = <a
            href="https://mathworld.wolfram.com/Cosine.html"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'inherit', textDecoration: 'none' }}
            onMouseOver={e => (e.target.style.color = 'yellow')}
            onMouseOut={e => (e.target.style.color = 'inherit')}
          >
            the cosine function
          </a>.
        </p>

        <div style={{ height: '2.0rem' }} />

        <p className="equation-description">
          These constructions define <img
            src="/equations/red-5.svg"
            alt="5"
            style={{ height: '13px', width: 'auto', display: 'inline-block', position: 'relative', top: '-2px' }}
          /> scalars ( <img
            src="/equations/scalar_0.svg"
            alt="phi_0"
            style={{ height: '15px', width: 'auto', display: 'inline-block', position: 'relative', top: '-1px' }}
          />, <img
            src="/equations/scalar_1.svg"
            alt="phi_1"
            style={{ height: '15px', width: 'auto', display: 'inline-block', position: 'relative', top: '-1px' }}
          />, <img
            src="/equations/scalar_2.svg"
            alt="phi_2"
            style={{ height: '15px', width: 'auto', display: 'inline-block', position: 'relative', top: '-1px' }}
          />, <img
            src="/equations/scalar_3.svg"
            alt="phi_3"
            style={{ height: '15px', width: 'auto', display: 'inline-block', position: 'relative', top: '-1px' }}
          />, and <img
            src="/equations/scalar_4.svg"
            alt="phi_4"
            style={{ height: '15px', width: 'auto', display: 'inline-block', position: 'relative', top: '-1px' }}
          /> ).
            Combining those scalars with their quantized powers we arrive at exact geometric definitions for the Planck constants.
        </p>

        <div style={{ height: '2.0rem' }} />

        <div className="equation-line">
          <img
            src="/equations/phi_0_equation.svg"
            alt="phi_0 equation"
            style={{ height: '16px', width: 'auto' }}
          />
        </div>

        <div style={{ height: '1.0rem' }} />

        <div className="equation-line">
          <img
            src="/equations/phi_1_equation.svg"
            alt="phi_1 equation"
            style={{ height: '16px', width: 'auto' }}
          />
        </div>

        <div style={{ height: '1.0rem' }} />

        <div className="equation-line">
          <img
            src="/equations/phi_2_equation.svg"
            alt="phi_2 equation"
            style={{ height: '16px', width: 'auto' }}
          />
        </div>

        <div style={{ height: '1.0rem' }} />

        <div className="equation-line">
          <img
            src="/equations/phi_3_equation.svg"
            alt="phi_3 equation"
            style={{ height: '16px', width: 'auto' }}
          />
        </div>

        <div style={{ height: '1.0rem' }} />

        <div className="equation-line">
          <img
            src="/equations/phi_4_equation.svg"
            alt="phi_4 equation"
            style={{ height: '16px', width: 'auto' }}
          />
        </div>

        <div style={{ height: '2.0rem' }} />

        <p className="equation-description">
  Where <img
    src="/equations/integers.svg"
    alt="integers"
    style={{
      height: '12px',
      width: 'auto',
      display: 'inline-block',
      position: 'relative',
      top: '-2.3px',
    }}
  /> .
</p>

        <div style={{ height: '2.0rem' }} />

        <div className="equation-line">
          <img
            src="/equations/bunch_planck.svg"
            alt="Planck final results"
            style={{ height: '172px', width: 'auto' }}
          />
        </div>

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