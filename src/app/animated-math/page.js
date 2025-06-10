'use client';

import { useState } from 'react';
import LayoutWrapper from '@/components/LayoutWrapper';
import '../globals.css';

export default function AnimatedMath() {
  const videoTitles = [
  <>
    infinite power tower of{' '}
    <img
      src="/equations/i.svg"
      alt="i"
      style={{
      height: '0.75em',
      width: 'auto',
      display: 'inline-block',
      marginLeft: '0.1em',
      transform: 'translateY(-0.15em)',
    }}

    />
  </>,
  <>Mobius strip</>,
  <>double cone slice</>,
  <>cosine spindle</>,
  <>unit wave</>,
  <>unit lemniscate</>,
  <>tetrahedron rotations</>,
  <>
    {' '}
    <img
      src="/equations/omega_1_constant.svg"
      alt="w_1"
      style={{
      height: '0.85em',
      width: 'auto',
      display: 'inline-block',
      marginLeft: '0.1em',
      transform: 'translateY(0.05em)',
    }}

    /> and <img
      src="/equations/omega_2_constant.svg"
      alt="w_2"
      style={{
      height: '0.85em',
      width: 'auto',
      display: 'inline-block',
      marginLeft: '0.1em',
      transform: 'translateY(0.05em)',
    }}

    /> lattice{' '}

  </>,
  <>
    <img
      src="/equations/gamma_of_z.svg"
      alt="gamma(z)"
      style={{
      height: '1em',
      width: 'auto',
      display: 'inline-block',
      marginLeft: '0.1em',
      transform: 'translateY(0.05em)',
    }}

    /> phase plot
  </>,
  <>
    <img
      src="/equations/gamma_of_inverse_z.svg"
      alt="gamma(1/z)"
      style={{
      height: '2.25em',
      width: 'auto',
      display: 'inline-block',
      marginLeft: '0.1em',
      transform: 'translateY(-0.05em)',
    }}

    /> phase plot
  </>,
  <>
    <img
      src="/equations/log_of_gamma_of_z.svg"
      alt="log(gamma(z))"
      style={{
      height: '1.3em',
      width: 'auto',
      display: 'inline-block',
      marginLeft: '0.1em',
      transform: 'translateY(0.05em)',
    }}

    /> phase plot
  </>,
  <>
    <img
      src="/equations/log_of_gamma_inverse_z.svg"
      alt="log(gamma(1/z))"
      style={{
      height: '2.8em',
      width: 'auto',
      display: 'inline-block',
      marginLeft: '0.1em',
      transform: 'translateY(0.05em)',
    }}

    /> phase plot
  </>,
  <><img
      src="/equations/sin_of_inverse_z.svg"
      alt="sin(1/z)"
      style={{
      height: '2.25em',
      width: 'auto',
      display: 'inline-block',
      marginLeft: '0.1em',
      transform: 'translateY(-0.05em)',
    }}

    /> phase plot</>,
  <><img
      src="/equations/cos_of_inverse_z.svg"
      alt="cos(1/z)"
      style={{
      height: '2.25em',
      width: 'auto',
      display: 'inline-block',
      marginLeft: '0.1em',
      transform: 'translateY(-0.05em)',
    }}

    /> phase plot</>,
  <><img
      src="/equations/sinh_of_inverse_z.svg"
      alt="sinh(1/z)"
      style={{
      height: '2.25em',
      width: 'auto',
      display: 'inline-block',
      marginLeft: '0.1em',
      transform: 'translateY(-0.05em)',
    }}

    /> phase plot</>,
  <><img
      src="/equations/cosh_of_inverse_z.svg"
      alt="gamma(1/z)"
      style={{
      height: '2.25em',
      width: 'auto',
      display: 'inline-block',
      marginLeft: '0.1em',
      transform: 'translateY(-0.05em)',
    }}

    /> phase plot</>,

    <><img
      src="/equations/tan_of_inverse_z.svg"
      alt="tan(1/z)"
      style={{
      height: '2.25em',
      width: 'auto',
      display: 'inline-block',
      marginLeft: '0.1em',
      transform: 'translateY(-0.05em)',
    }}

    /> phase plot</>,
  <><img
      src="/equations/tanh_of_inverse_z.svg"
      alt="tanh(1/z)"
      style={{
      height: '2.25em',
      width: 'auto',
      display: 'inline-block',
      marginLeft: '0.1em',
      transform: 'translateY(-0.05em)',
    }}

    /> phase plot</>
];


  const videoFilenames = [
    'infinite_power_tower_of_i.mp4',
    'mobius_strip.mp4',
    'double_cone_slice.mp4',
    'cosine_spindle.mp4',
    'unit_wave.mp4',
    'unit_lemniscate.mp4',
    'tetrahedron_rotations.mp4',
    'omega_1_and_omega_2_lattice.mp4',
    'gamma_z.mp4',
    'gamma_inverse_z.mp4',
    'log_gamma_z.mp4',
    'log_gamma_inverse_z.mp4',
    'sin_inverse_z.mp4',
    'cos_inverse_z.mp4',
    'sinh_inverse_z.mp4',
    'cosh_inverse_z.mp4',
    'tan_inverse_z.mp4',
    'tanh_inverse_z.mp4'
  ];

  const [modalVideo, setModalVideo] = useState(null);

  return (
    <LayoutWrapper>
      <div className="symbol-overlay" />
      <div className="partition-content">
        <div className="legend-title">animated math</div>

        <div style={{ height: '1rem' }} />

        <p className="equation-description">
          This page brings mathematical structures to life through dynamic visualization.
          Each animation is crafted to reveal geometric intuition, highlight transformation symmetry, and demonstrate the evolution of mathematical relationships over time.
        </p>

        <div style={{ height: '2rem' }} />

        {/* 🎥 Video grid */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
          {videoFilenames.map((filename, index) => {
            const thumbnail = filename.replace('.mp4', '_thumbnail.jpg');
            return (
              <div key={index} style={{ textAlign: 'center' }}>
                <video
                  src={`/videos/${filename}`}
                  poster={`/videos/${thumbnail}`}
                  controls
                  muted
                  onClick={() => setModalVideo(filename)}
                  style={{
                    height: '180px',
                    width: 'auto',
                    cursor: 'pointer',
                    borderRadius: '0.3rem',
                    boxShadow: '0 0 8px rgba(0,0,0,0.3)',
                  }}
                />
                <div style={{ marginTop: '0.5rem' }}>
  {videoTitles[index]}
</div>

              </div>
            );
          })}
        </div>

        <div style={{ height: '11rem' }} />
      </div>

      {/* 🎥 Modal viewer */}
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
          <video
            src={`/videos/${modalVideo}`}
            controls
            autoPlay
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 'calc(100vw - 200px)',
              maxHeight: '80vh',
              borderRadius: '0.5rem',
              boxShadow: '0 0 24px black',
            }}
          />
        </div>
      )}
    </LayoutWrapper>
  );
}
