'use client';

import { useState } from 'react';
import LayoutWrapper from '@/components/LayoutWrapper';
import '../globals.css';

export default function SimplestManifold() {
  const [modalVideo, setModalVideo] = useState(null);

  const videos = [
    { filename: 'figure_eight_knot_movie_1.mp4', thumbnail: 'fek_thumbnail_1.jpg' },
    { filename: 'figure_eight_knot_movie_2.mp4', thumbnail: 'fek_thumbnail_2.jpg' }
  ];

  return (
    <LayoutWrapper>
      <div className="symbol-overlay" />
      <div className="partition-content">
        <div className="legend-title">the simplest manifold</div>

        <p className="equation-description">
          Here we introduce the simplest self-persistent stage in topology—the hyperbolic figure eight knot.
          This topology is defined as a double-cover of the simplest possible 3-manifold ( the {' '}
          <a
            href="https://en.wikipedia.org/wiki/Gieseking_manifold"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'inherit', textDecoration: 'none' }}
            onMouseOver={e => (e.target.style.color = 'yellow')}
            onMouseOut={e => (e.target.style.color = 'inherit')}
          >
            Gieseking Manifold
          </a> ) defining the complement with the smallest possible volume.
        </p>

        <div style={{ height: '2rem' }} />

        {/* ✅ Video Grid with Pop-up Modal Behavior */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
          {videos.map(({ filename, thumbnail }, index) => (
            <div key={index} style={{ textAlign: 'center' }}>
              <video
                src={`/videos/${filename}`}
                poster={`/videos/${thumbnail}`}
                controls
                muted
                onClick={() => setModalVideo(filename)}
                style={{
                  height: '160px',
                  width: 'auto',
                  cursor: 'pointer',
                  borderRadius: '0.3rem',
                  boxShadow: '0 0 8px rgba(0,0,0,0.3)',
                }}
              />
            </div>
          ))}
        </div>

        <div style={{ height: '1rem' }} />

        <p className="equation-description">Videos by Jeff Chapple, based on work by {' '}
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

        <p className="equation-description">The constructive equation for the hyperbolic figure eight knot volume is:</p>
        <div style={{ height: '2rem' }} />

        <div className="equation-line">
          <img src="/equations/v_fe_equation.svg" alt="Equation 1" style={{ height: '52px', width: 'auto' }} />
        </div>
        <div style={{ height: '2rem' }} />

        <p className="equation-description">Where <img
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
            the polylogarithm of order 2 (the dilogarithm )
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
            style={{ height: '18px', width: 'auto', display: 'inline-block', position: 'relative', top: '1px' }}
          />, and <img
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
          </a>.</p>
        <div style={{ height: '2rem' }} />

        <div className="equation-line" style={{ display: 'flex', justifyContent: 'center', gap: '4rem' }}>
          <img src="/equations/imaginary_golden_ratio_equation.svg" alt="Equation 5a" style={{ height: '28px', width: 'auto' }} />
          <img src="/equations/i_equation.svg" alt="Equation 5b" style={{ height: '28px', width: 'auto' }} />
        </div>
        <div style={{ height: '2.5rem' }} />

        <p className="equation-description">The real conjugate of the hyperblic figure eight knot defines a double covered sphere, divided into 288 pieces—each associated to a unique constant of Nature.</p>
        <div style={{ height: '2rem' }} />

        <div className="equation-line">
          <img src="/equations/real_conjugate_equation.svg" alt="Equation 2" style={{ height: '52px', width: 'auto' }} />
        </div>
        <div style={{ height: '2rem' }} />

        <p className="equation-description">Where <img
            src="/equations/pi.svg"
            alt="pi"
            style={{ height: '9px', width: 'auto', display: 'inline-block', position: 'relative', top: '-1px' }}
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

        <p className="equation-description">These constructions pull apart into two dilogarithm pieces, made of identical real and inverse imagainry parts.</p>
        <div style={{ height: '2rem' }} />

        <div className="equation-line" style={{ display: 'flex', justifyContent: 'center', gap: '4rem' }}>
          <img src="/equations/li_2_inverse.svg" alt="Equation 5a" style={{ height: '52px', width: 'auto' }} />
          <img src="/equations/li_2_regular.svg" alt="Equation 5b" style={{ height: '52px', width: 'auto' }} />
        </div>
        <div style={{ height: '2rem' }} />

        <p className="equation-description">Where <img
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
  <img src="/equations/2k_equation.svg" alt="Equation 2" style={{ height: '64px', width: 'auto', position: 'relative', top: '0px', left: '-151px' }} />
</div>
        <div style={{ height: '2rem' }} />

        <p className="equation-description">These constructions naturally divide the world up into electron, proton, and neutron radii.</p>
        <div style={{ height: '2rem' }} />

        <div className="equation-line" style={{ display: 'flex', justifyContent: 'center', gap: '4rem' }}>
          <img src="/equations/neutron_electron_radius_ratio.svg" alt="Equation 5a" style={{ height: '52px', width: 'auto', position: 'relative', top: '0px', left: '-0px' }} />
          <img src="/equations/neutron_proton_radius_ratio.svg" alt="Equation 5b" style={{ height: '46px', width: 'auto', position: 'relative', top: '4px', left: '-0px' }} />
        </div>
        <div style={{ height: '2rem' }} />

        <p className="equation-description">Where <img
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
        <div style={{ height: '10rem' }} />

      </div>

      {/* ✅ Modal for Full-Size Video View */}
      {modalVideo && (
        <div
          onClick={() => setModalVideo(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            paddingLeft: '180px', // match sidebar
            backgroundColor: 'rgba(0,0,0,0.85)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
          }}
        >
          <video
            src={`/videos/${modalVideo}`}
            controls
            autoPlay
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 'calc(100vw - 200px)',
              maxHeight: '80vh',
              borderRadius: '0.5rem',
              boxShadow: '0 0 24px black'
            }}
          />
        </div>
      )}
    </LayoutWrapper>
  );
}
