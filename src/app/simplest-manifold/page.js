'use client';

import { useState } from 'react';
import LayoutWrapper from '@/components/LayoutWrapper';
import ClosedManifoldViewer from '../figure-eight-complement/ClosedManifoldViewer';
import '../globals.css';

export default function SimplestManifold() {
  const [modalVideoId, setModalVideoId] = useState(null);
  const videos = [
  {
    id: 'hyperbolic_figure_eight_knot_1',
    file: 'hyperbolic_figure_eight_knot_1.mp4',
    thumbnail: 'hfek_1_thumbnail.jpg',
    title: '',
  },
  {
    id: 'hyperbolic_figure_eight_knot_2',
    file: 'hyperbolic_figure_eight_knot_2.mp4',
    thumbnail: 'hfek_2_thumbnail.jpg',
    title: '',
  },
];


  return (
    <LayoutWrapper>
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
    width: "min(1400px, calc(100vw - 220px))",
    maxWidth: "none",
  }}
>
        <div className="legend-title">the simplest manifold</div>

        <p className="equation-description">
          The simplest self-persistent stage in topology is the hyperbolic figure eight knot.
          This topology is defined as a double-cover of the simplest possible 3–manifold (the{' '}
          <a
            href="https://en.wikipedia.org/wiki/Gieseking_manifold"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'inherit', textDecoration: 'none' }}
            onMouseOver={e => (e.target.style.color = 'yellow')}
            onMouseOut={e => (e.target.style.color = 'inherit')}
          >
            Gieseking Manifold
          </a>) defining the complement with the smallest possible volume.
        </p>

        <div style={{ height: '2rem' }} />

        {/* 🎥 Video grid */}
<div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
  {videos.map(({ id, thumbnail, title }, index) => (
    <div key={id} style={{ textAlign: 'center' }}>
      <div style={{ position: 'relative', width: '320px', height: '180px' }}>
        <img
          src={`/videos/${thumbnail}`}
          alt="Video thumbnail"
          width="320"
          height="180"
          onClick={() => setModalVideoId(id)}
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
      {title ? <div style={{ marginTop: '0.5rem' }}>{title}</div> : null}
    </div>
  ))}
</div>


        <div style={{ height: '1rem' }} />

        <p className="equation-description">Videos by Jeff Chapple, based on work by{' '}
          <a
            href="https://www.thingiverse.com/thing:1668611"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'inherit', textDecoration: 'none' }}
            onMouseOver={e => (e.target.style.color = 'yellow')}
            onMouseOut={e => (e.target.style.color = 'inherit')}
          >
            Henry Segerman
          </a>.
        </p>

        <div style={{ height: '2.5rem' }} />

        <p className="equation-description">The constructive equations for the hyperbolic figure eight knot volume and its real conjugate are:</p>
        <div style={{ height: '2rem' }} />

        <div className="equation-line">
          <img src="/equations/v_fe_equation.svg" alt="Equation 1" style={{ height: '48px', width: 'auto', transform: 'translateX(32px)' }} />
        </div>
        <div style={{ height: '2rem' }} />

        <div className="equation-line">
          <img src="/equations/real_conjugate_equation.svg" alt="Equation 2" style={{ height: '66px', width: 'auto', transform: 'translateX(-118px)'  }} />
        </div>
        <div style={{ height: '2rem' }} />

        <p className="equation-description" style={{
    textIndent: 0,
    marginLeft: 0,
    paddingLeft: 0,
  }}>Where <img
            src="/equations/li_2_symbol.svg"
            alt="Li_2(x)"
            style={{ height: '16px', width: 'auto', display: 'inline-block', position: 'relative', top: '-1px' }}
          /> = <a
            href="https://mathworld.wolfram.com/Dilogarithm.html"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'inherit', textDecoration: 'none' }}
            onMouseOver={e => (e.target.style.color = 'yellow')}
            onMouseOut={e => (e.target.style.color = 'inherit')}
          >
            the polylogarithm of order 2 (the dilogarithm)
          </a>, <img
            src="/equations/i.svg"
            alt="i"
            style={{ height: '12px', width: 'auto', display: 'inline-block', position: 'relative', top: '-2px' }}
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
            src="/equations/imaginary_golden_ratio_symbol.svg"
            alt="phi_i"
            style={{ height: '13px', width: 'auto', display: 'inline-block', position: 'relative', top: '-0px' }}
          /> = <a
            href="https://mathforums.com/t/imaginary-golden-ratio.17605/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'inherit', textDecoration: 'none' }}
            onMouseOver={e => (e.target.style.color = 'yellow')}
            onMouseOut={e => (e.target.style.color = 'inherit')}
          >
            the imaginary golden ratio
          </a>, <img
            src="/equations/v_fe_2_g_gi.svg"
            alt="V_fe=2G_Gi"
            style={{ height: '16px', width: 'auto', display: 'inline-block', position: 'relative', top: '0px' }}
          />, <img
            src="/equations/g_gi.svg"
            alt="G_Gi"
            style={{ height: '16px', width: 'auto', display: 'inline-block', position: 'relative', top: '-1px' }}
          /> = <a
            href="https://mathworld.wolfram.com/GiesekingsConstant.html"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'inherit', textDecoration: 'none' }}
            onMouseOver={e => (e.target.style.color = 'yellow')}
            onMouseOut={e => (e.target.style.color = 'inherit')}
          >
            Gieseking&apos;s constant for the minimum 3-manifold
          </a> and <img
            src="/equations/pi.svg"
            alt="pi"
            style={{ height: '9px', width: 'auto', display: 'inline-block', position: 'relative', top: '0px' }}
          /> = <a
            href="https://en.wikipedia.org/wiki/Pi"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'inherit', textDecoration: 'none' }}
            onMouseOver={e => (e.target.style.color = 'yellow')}
            onMouseOut={e => (e.target.style.color = 'inherit')}
          >
            Archimedes&apos; constant
          </a>.</p>
        <div style={{ height: '2rem' }} />

        <div className="equation-line" style={{ display: 'flex', justifyContent: 'center', gap: '4rem' }}>
          <img src="/equations/imaginary_golden_ratio_equation.svg" alt="Equation 5a" style={{ height: '26px', width: 'auto' }} />
          <img src="/equations/i_equation.svg" alt="Equation 5b" style={{ height: '26px', width: 'auto' }} />
        </div>
        <div style={{ height: '2.5rem' }} />

        <p className="equation-description">These constructions pull apart into two dilogarithms, made of identical real and inverse imaginary parts.</p>
        <div style={{ height: '2rem' }} />

        <div className="equation-line" style={{ display: 'flex', justifyContent: 'center', gap: '4rem' }}>
          <img src="/equations/li_2_inverse.svg" alt="Equation 5a" style={{ height: '48px', width: 'auto' }} />
          <img src="/equations/li_2_regular.svg" alt="Equation 5b" style={{ height: '48px', width: 'auto' }} />
        </div>
        <div style={{ height: '2rem' }} />

        <p className="equation-description" style={{
    textIndent: 0,
    marginLeft: 0,
    paddingLeft: 0,
  }}>Where <img
            src="/equations/gamma_function.svg"
            alt="gamma(x)"
            style={{ height: '16px', width: 'auto', display: 'inline-block', position: 'relative', top: '-1px' }}
          /> = <a
            href="https://en.wikipedia.org/wiki/Gamma_function"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'inherit', textDecoration: 'none' }}
            onMouseOver={e => (e.target.style.color = 'yellow')}
            onMouseOut={e => (e.target.style.color = 'inherit')}
          >
            the gamma function
          </a>.</p>
        <div style={{ height: '2rem' }} />

        <p className="equation-description">Switching the arguments of that construction, from the imaginary golden ratio to the imaginary unit, yields twice <a
            href="https://mathworld.wolfram.com/CatalansConstant.html"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'inherit', textDecoration: 'none' }}
            onMouseOver={e => (e.target.style.color = 'yellow')}
            onMouseOut={e => (e.target.style.color = 'inherit')}
          >
            Catalan&apos;s constant
          </a>—<img
            src="/equations/catalan_s_constant.svg"
            alt="K"
            style={{ height: '12px', width: 'auto', display: 'inline-block', position: 'relative', top: '-2px' }}
          />.</p>
        <div style={{ height: '2rem' }} />

        <div className="equation-line" style={{ display: 'flex', justifyContent: 'center' }}>
  <img src="/equations/2k_equation.svg" alt="Equation 2" style={{ height: '58px', width: 'auto', position: 'relative', top: '0px', left: '-151px' }} />
</div>
        <div style={{ height: '2rem' }} />

        <p className="equation-description">These dilogarithm constructions naturally divide the world up into electron, proton, and neutron radii.</p>
        <div style={{ height: '2rem' }} />

        <div className="equation-line" style={{ display: 'flex', justifyContent: 'center', gap: '4rem' }}>
          <img src="/equations/neutron_electron_radius_ratio.svg" alt="Equation 5a" style={{ height: '48px', width: 'auto', position: 'relative', top: '0px', left: '-0px' }} />
          <img src="/equations/neutron_proton_radius_ratio.svg" alt="Equation 5b" style={{ height: '42px', width: 'auto', position: 'relative', top: '4px', left: '-0px' }} />
        </div>
        <div style={{ height: '2rem' }} />

        <p className="equation-description" style={{
    textIndent: 0,
    marginLeft: 0,
    paddingLeft: 0,
  }}>Where <img
            src="/equations/r_neutron.svg"
            alt="r_n"
            style={{ height: '13px', width: 'auto', display: 'inline-block', position: 'relative', top: '1px' }}
          /> = <a
            href="https://en.wikipedia.org/wiki/Neutron"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'inherit', textDecoration: 'none' }}
            onMouseOver={e => (e.target.style.color = 'yellow')}
            onMouseOut={e => (e.target.style.color = 'inherit')}
          >
            the neutron radius
          </a>, <img
            src="/equations/r_e_symbol.svg"
            alt="gamma(x)"
            style={{ height: '13px', width: 'auto', display: 'inline-block', position: 'relative', top: '1px' }}
          /> = <a
            href="https://physics.nist.gov/cgi-bin/cuu/Value?re|search_for=radius"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'inherit', textDecoration: 'none' }}
            onMouseOver={e => (e.target.style.color = 'yellow')}
            onMouseOut={e => (e.target.style.color = 'inherit')}
          >
            the classical electron radius
          </a>, and <img
            src="/equations/r_proton.svg"
            alt="r_+"
            style={{ height: '13px', width: 'auto', display: 'inline-block', position: 'relative', top: '1px' }}
          /> = <a
            href="https://physics.nist.gov/cgi-bin/cuu/Value?rp"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'inherit', textDecoration: 'none' }}
            onMouseOver={e => (e.target.style.color = 'yellow')}
            onMouseOut={e => (e.target.style.color = 'inherit')}
          >
            the proton rms charge radius
          </a>.</p>
        <div style={{ height: '4rem' }} />
      </div>

      <ClosedManifoldViewer embedded />

      <div style={{ height: '10rem' }} />

           {modalVideoId && (
  <div
    onClick={() => setModalVideoId(null)}
    style={{
      position: 'fixed',
      top: 0,
      bottom: 0,
      left: '180px',
      right: 0,
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
        aspectRatio: '16 / 9',
        borderRadius: '0.5rem',
        overflow: 'hidden',
        boxShadow: '0 0 24px black',
        backgroundColor: '#000',
      }}
    >
      <video
        src={`/videos/${modalVideoId}.mp4`}
        controls
        autoPlay
        playsInline
        preload="metadata"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  </div>
)}



    </LayoutWrapper>
  );
}
