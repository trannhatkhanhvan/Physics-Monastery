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
      /> and{' '}
      <img
        src="/equations/omega_2_constant.svg"
        alt="w_2"
        style={{
          height: '0.85em',
          width: 'auto',
          display: 'inline-block',
          marginLeft: '0.1em',
          transform: 'translateY(0.05em)',
        }}
      /> lattice
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
    <>
      <img
        src="/equations/sin_of_inverse_z.svg"
        alt="sin(1/z)"
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
        src="/equations/cos_of_inverse_z.svg"
        alt="cos(1/z)"
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
        src="/equations/sinh_of_inverse_z.svg"
        alt="sinh(1/z)"
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
        src="/equations/cosh_of_inverse_z.svg"
        alt="cosh(1/z)"
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
        src="/equations/tan_of_inverse_z.svg"
        alt="tan(1/z)"
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
        src="/equations/tanh_of_inverse_z.svg"
        alt="tanh(1/z)"
        style={{
          height: '2.25em',
          width: 'auto',
          display: 'inline-block',
          marginLeft: '0.1em',
          transform: 'translateY(-0.05em)',
        }}
      /> phase plot
    </>
  ];

  const youtubeVideoIds = [
    'BroLf3jh7v8', // infinite power tower of i
    'VuM-QbTEpWA',
    'KupWVPwyT7k',
    'QVl-4mbGOl0',
    '9SDIHhvbH4I',
    '35hE2yTlAfs',
    'p71JAaMwz3E',
    'IH6ka421POI',
    'qO-mRqJzVn4',
    'aEEvHX9OmGI',
    'q-NNO3cji8A',
    'oksmc4_5lj0',
    'sSQrFKslj4s',
    '5Fj4H_FKr4k',
    'Q5OVllcovqs',
    'JiVhFv6quX4',
    'VjpqarkKhoI',
    '6H_khWpT-7s'
  ];

  const [modalVideoId, setModalVideoId] = useState(null);

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
          {youtubeVideoIds.map((videoId, index) => (
            <div key={videoId} style={{ textAlign: 'center' }}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
  <img
    src={`/videos/${videoId}_thumbnail.jpg`}
    alt="video thumbnail"
    onClick={() => setModalVideoId(videoId)}
    style={{
      height: '180px',
      width: 'auto',
      cursor: 'pointer',
      borderRadius: '0.3rem',
      boxShadow: '0 0 8px rgba(0,0,0,0.3)',
      display: 'block',
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
    <div style={{
      width: 0,
      height: 0,
      borderTop: '12px solid transparent',
      borderBottom: '12px solid transparent',
      borderLeft: '18px solid white',
      filter: 'drop-shadow(0 0 3px black)',
    }} />
  </div>

</div>

              <div
  style={{
    marginTop:
      index === 8 ? '0.6rem' :
      index === 9 ? '0.6rem' :
      index === 10 ? '0.8rem' :
      index === 11 ? '0.4rem' :
      index === 12 ? '0.6rem' :
      index === 13 ? '0.6rem' :
      index === 14 ? '0.6rem' :
      index === 15 ? '0.6rem' :
      index === 16 ? '0.6rem' :
      index === 17 ? '0.6rem' :
      '0.5rem',
  }}
>
  {videoTitles[index]}
</div>

            </div>
          ))}
        </div>

        <div style={{ height: '11rem' }} />
      </div>

      {/* 🎥 Modal viewer */}
      {modalVideoId && (
        <div
          onClick={() => setModalVideoId(null)}
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
              src={`https://www.youtube.com/embed/${modalVideoId}?autoplay=1`}
              title="YouTube video"
              frameBorder="0"
              allow="autoplay; encrypted-media"
              allowFullScreen
              style={{
                width: '100%',
                height: '100%',
              }}
            />
          </div>
        </div>
      )}
    </LayoutWrapper>
  );
}
