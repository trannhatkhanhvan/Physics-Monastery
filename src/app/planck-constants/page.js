'use client';

import { useEffect, useRef, useState } from 'react';
import LayoutWrapper from '@/components/LayoutWrapper';
import GFunctionsExplorer, { renderSignedGPhase } from '../g-functions/GFunctionsExplorer';
import PlanckTimeSurface from './PlanckTimeSurface';
import PlanckPhaseSurface from './PlanckPhaseSurface';
import PlanckPhaseFullscreen from './PlanckPhaseFullscreen';
import '../globals.css';


// Final calibrated mathematical windows and camera sizes.
// Keys: constant index - real/imaginary - direct/inverted.
// All twenty entries were approved on October 14, 2026.
// EXPERIMENT: set to false to restore the original
// solid dark backgrounds in all fullscreen surface viewers.
const FULLSCREEN_DIMMED_BACKDROP = false;

const PLANCK_SURFACE_SETTINGS = {
  // Planck time
  '0-re-z':   { domain: 10.0000, cutoff: 1.9953, size: 2.95 },
  '0-im-z':   { domain:  7.7625, cutoff: 1.9953, size: 2.95 },
  '0-re-inv': { domain:  0.9120, cutoff: 2.0000, size: 2.95 },
  '0-im-inv': { domain:  1.0000, cutoff: 2.0000, size: 2.95 },

  // Planck length
  '1-re-z':   { domain:  5.8884, cutoff: 3.5481, size: 2.95 },
  '1-im-z':   { domain:  6.6069, cutoff: 3.7584, size: 2.70 },
  '1-re-inv': { domain:  0.0977, cutoff: 2.0000, size: 2.95 },
  '1-im-inv': { domain:  0.0759, cutoff: 2.0000, size: 2.95 },

  // Planck charge
  '2-re-z':   { domain:  2.3988, cutoff: 2.9854, size: 2.95 },
  '2-im-z':   { domain:  1.7378, cutoff: 1.9953, size: 2.95 },
  '2-re-inv': { domain:  0.7762, cutoff: 2.0000, size: 2.95 },
  '2-im-inv': { domain:  0.8913, cutoff: 2.0000, size: 2.95 },

  // Planck temperature
  '3-re-z':   { domain:  1.7783, cutoff: 1.9953, size: 2.95 },
  '3-im-z':   { domain:  0.9333, cutoff: 1.9953, size: 2.95 },
  '3-re-inv': { domain:  2.2909, cutoff: 2.0000, size: 2.95 },
  '3-im-inv': { domain: 10.0000, cutoff: 2.0000, size: 2.95 },

  // Planck mass
  '4-re-z':   { domain:  3.0903, cutoff: 1.9953, size: 2.95 },
  '4-im-z':   { domain:  1.2303, cutoff: 1.9953, size: 2.95 },
  '4-re-inv': { domain:  1.1749, cutoff: 2.0000, size: 2.95 },
  '4-im-inv': { domain: 10.0000, cutoff: 2.0000, size: 2.95 },
};

// Approved full-screen mathematical windows.
// Separate from PLANCK_SURFACE_SETTINGS (the small plots).
// Only the ten explicitly marked Set are baked in.
const FULLSCREEN_APPROVED_WINDOWS = {
  // Re F_k(z): calibrated full-screen mathematical windows.
  '0-re-z': { domain: 137, minDomain: 3, maxDomain: 137 },
  '1-re-z': { domain: 100, minDomain: 2, maxDomain: 100 },
  '2-re-z': { domain: 80, minDomain: 1, maxDomain: 80 },
  '3-re-z': { domain: 12, minDomain: 2, maxDomain: 12 },

  // Im F_k(z): approved full-screen domain windows.
  '0-im-z': { domain: 100, minDomain: 3, maxDomain: 100 },
  '1-im-z': { domain: 80, minDomain: 2, maxDomain: 80 },
  '2-im-z': { domain: 44, minDomain: 1.05, maxDomain: 44 },
  '3-im-z': { domain: 10, minDomain: 1, maxDomain: 10 },
  '4-im-z': { domain: 1.2303, minDomain: 1, maxDomain: 10 },

  '0-re-inv': { domain: 8.0, minDomain: 0.001, maxDomain: 8.0 },
  '0-im-inv': { domain: 1.0, minDomain: 0.001, maxDomain: 10.0 },
  '1-re-inv': { domain: 0.24802963, minDomain: 0.025, maxDomain: 0.25 },
  '1-im-inv': { domain: 0.1, minDomain: 0.02, maxDomain: 0.1 },
  '2-re-inv': { domain: 1.0, minDomain: 0.0035, maxDomain: 1.0 },
  '2-im-inv': { domain: 0.079853179, minDomain: 0.07, maxDomain: 1.618 },
  '3-re-inv': { domain: 18.0, minDomain: 0.015, maxDomain: 18.0 },
  '3-im-inv': { domain: 99.457009, minDomain: 0.015, maxDomain: 100.0 },
  '4-re-inv': { domain: 8.0, minDomain: 0.0055, maxDomain: 8.0 },
  '4-im-inv': { domain: 195.54412, minDomain: 0.007, maxDomain: 200.0 },
};

const PHASE_IDS = ['G0', 'G1', 'G2', 'G3', 'G4'];
const PHASE_INITIAL_ZOOM = {
  normal: [33.12, 35.16, 43.82, 4.06, 4.57],
  inverted: [0.41, 0.21, 0.80, 7.39, 5.70],
};

function SignedPhaseCanvas({ id, halfWidth, inverted, expanded = false }) {
  const ref = useRef(null);
  const width = expanded ? 960 : 320;
  const height = expanded ? 540 : 180;

  useEffect(() => {
    renderSignedGPhase(ref.current, id, halfWidth, inverted);
  }, [id, halfWidth, inverted, expanded]);

  return (
    <canvas
      ref={ref}
      width={width}
      height={height}
      aria-label={`${id}(${inverted ? "1/z" : "z"}) signed phase field`}
      style={{
        display: 'block',
        width: '100%',
        height: 'auto',
        aspectRatio: '16 / 9',
        borderRadius: '0.4rem',
      }}
    />
  );
}


function clampPhaseZoomFactor(value, zoomOutLimit, zoomInLimit) {
  const minFactor = 1 / Math.max(1, zoomOutLimit);
  const maxFactor = Math.max(1, zoomInLimit);
  return Math.min(maxFactor, Math.max(minFactor, value));
}

function sliderToZoomFactor(position, zoomOutLimit, zoomInLimit) {
  const p = Math.max(0, Math.min(1, position));
  const minFactor = 1 / Math.max(1, zoomOutLimit);
  const maxFactor = Math.max(1, zoomInLimit);

  if (p <= 0.5) {
    if (minFactor === 1) return 1;
    const t = p / 0.5;
    return Math.exp(Math.log(minFactor) * (1 - t));
  }

  if (maxFactor === 1) return 1;
  const t = (p - 0.5) / 0.5;
  return Math.exp(Math.log(maxFactor) * t);
}

function zoomFactorToSlider(zoomFactor, zoomOutLimit, zoomInLimit) {
  const z = clampPhaseZoomFactor(
    zoomFactor,
    zoomOutLimit,
    zoomInLimit
  );

  const minFactor = 1 / Math.max(1, zoomOutLimit);
  const maxFactor = Math.max(1, zoomInLimit);

  if (z <= 1) {
    if (minFactor === 1) return 0.5;
    const t =
      (Math.log(z) - Math.log(minFactor)) /
      (0 - Math.log(minFactor));
    return 0.5 * t;
  }

  if (maxFactor === 1) return 0.5;
  const t = Math.log(z) / Math.log(maxFactor);
  return 0.5 + 0.5 * t;
}

function NavigablePhaseCanvas({
  id, initialHalfWidth, inverted, onClose, zoomLimits
}) {
  const canvasRef = useRef(null);
  const frameRef = useRef(null);
  const dragRef = useRef(null);
  const [isZoomPlaying, setIsZoomPlaying] = useState(false);
  const playbackRef = useRef({ position: 0.5, direction: 1 });

  const [rasterSize, setRasterSize] = useState({
    width: 960,
    height: 540,
  });

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return undefined;

    const measure = () => {
      const rect = frame.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      const scale = Math.min(
        dpr,
        2560 / rect.width,
        1600 / rect.height
      );

      const width = Math.max(1, Math.round(rect.width * scale));
      const height = Math.max(1, Math.round(rect.height * scale));

      setRasterSize(previous =>
        previous.width === width && previous.height === height
          ? previous
          : { width, height }
      );
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    window.addEventListener("resize", measure);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const { out: zoomOutLimit, in: zoomInLimit } = zoomLimits;

  const [camera, setCamera] = useState({
    halfWidth: initialHalfWidth,
    re: 0,
    im: 0,
  });

  const zoomFactor = initialHalfWidth / camera.halfWidth;
  const zoomSliderValue = zoomFactorToSlider(
    zoomFactor,
    zoomOutLimit,
    zoomInLimit
  );

  useEffect(() => {
    renderSignedGPhase(
      canvasRef.current,
      id,
      camera.halfWidth,
      inverted,
      180,
      camera.re,
      camera.im
    );
  }, [id, inverted, camera, rasterSize]);

  const setZoomFactor = nextZoomFactor => {
    const selected = clampPhaseZoomFactor(
      nextZoomFactor,
      zoomOutLimit,
      zoomInLimit
    );

    setCamera(current => ({
      ...current,
      halfWidth: initialHalfWidth / selected,
    }));
  };

  const zoomBy = factor => {
    setZoomFactor(zoomFactor * factor);
  };

  // Automatic back-and-forth zoom.
  // One complete left-to-right traversal takes about 25 seconds.
  useEffect(() => {
    if (!isZoomPlaying) return undefined;

    let frameId;
    let lastTime = null;
    let lastRender = 0;

    const traverseMs = 20000;
    const renderIntervalMs = 140;

    const animate = time => {
      if (lastTime === null) lastTime = time;

      // Ignore long gaps when the tab is inactive.
      const dt = Math.min(time - lastTime, 250);
      lastTime = time;

      const motion = playbackRef.current;
      motion.position += motion.direction * dt / traverseMs;

      if (motion.position >= 1) {
        motion.position = 2 - motion.position;
        motion.direction = -1;
      } else if (motion.position <= 0) {
        motion.position = -motion.position;
        motion.direction = 1;
      }

      if (time - lastRender >= renderIntervalMs) {
        const factor = sliderToZoomFactor(
          motion.position,
          zoomOutLimit,
          zoomInLimit
        );

        setCamera(current => ({
          ...current,
          halfWidth: initialHalfWidth / factor,
        }));

        lastRender = time;
      }

      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frameId);
  }, [
    isZoomPlaying,
    initialHalfWidth,
    zoomOutLimit,
    zoomInLimit,
  ]);

  const toggleZoomPlayback = () => {
    if (isZoomPlaying) {
      setIsZoomPlaying(false);
      return;
    }

    playbackRef.current = {
      position: zoomFactorToSlider(
        initialHalfWidth / camera.halfWidth,
        zoomOutLimit,
        zoomInLimit
      ),
      direction: 1,
    };

    setIsZoomPlaying(true);
  };

  const onWheel = event => {
    event.preventDefault();
    setIsZoomPlaying(false);
    zoomBy(Math.exp(-event.deltaY * 0.0012));
  };

  const onPointerDown = event => {
    if (event.button !== 0) return;

    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      re: camera.re,
      im: camera.im,
      halfWidth: camera.halfWidth,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = event => {
    const drag = dragRef.current;
    if (!drag) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const unitsPerPixel = (2 * drag.halfWidth) / rect.width;

    setCamera(current => ({
      ...current,
      re: drag.re - (event.clientX - drag.x) * unitsPerPixel,
      im: drag.im + (event.clientY - drag.y) * unitsPerPixel,
    }));
  };

  const stopDrag = () => {
    dragRef.current = null;
  };

  return (
    <>
    <style jsx global>{`
      .planck-phase-thin-zoom {
        appearance: none;
        -webkit-appearance: none;
        display: block;
        width: 100%;
        height: 14px;
        margin: 0;
        background: transparent;
        cursor: pointer;
      }
      .planck-phase-thin-zoom::-webkit-slider-runnable-track {
        height: 2px;
        border-radius: 1px;
        background: rgba(210, 230, 245, 0.85);
      }
      .planck-phase-thin-zoom::-moz-range-track {
        height: 2px;
        border-radius: 1px;
        background: rgba(210, 230, 245, 0.85);
      }
      .planck-phase-thin-zoom::-webkit-slider-thumb {
        appearance: none;
        -webkit-appearance: none;
        width: 10px;
        height: 10px;
        margin-top: -4px;
        border: 0;
        border-radius: 50%;
        background: #75c7ff;
      }
      .planck-phase-thin-zoom::-moz-range-thumb {
        width: 10px;
        height: 10px;
        border: 0;
        border-radius: 50%;
        background: #75c7ff;
      }
    `}</style>
    <div
      ref={frameRef}
      className="phase-viewer-image"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
        <div
          style={{
            position: 'absolute',
            bottom: '0.55rem',
            right: '0.55rem',
            zIndex: 3,
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.45rem',
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}>
            <button
              type="button"
              onClick={toggleZoomPlayback}
              aria-label={
                isZoomPlaying ? "Pause zoom animation" : "Play zoom animation"
              }
              title={
                isZoomPlaying ? "Pause animation" : "Play bouncing zoom"
              }
              style={{
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '6px',
                background: 'rgba(0,0,0,0.45)',
                color: '#fff',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              {isZoomPlaying ? "Ⅱ" : "▶"}
            </button>

            <div style={{
              width: '185px',
              height: '30px',
              padding: '0 0.5rem',
              borderRadius: '7px',
              background: 'rgba(0,0,0,0.38)',
              color: '#fff',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}>
            <input
              type="range"
              className="planck-phase-thin-zoom"
              min="0"
              max="1"
              step="0.001"
              value={zoomSliderValue}
              onChange={event => {
                setIsZoomPlaying(false);
                setZoomFactor(sliderToZoomFactor(
                  Number(event.target.value),
                  zoomOutLimit,
                  zoomInLimit
                ));
              }}
              aria-label="Zoom phase image"
              title="Drag left to zoom out, right to zoom in"
            />

          </div>

          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close phase viewer"
            style={{
              padding: '0.3rem 0.5rem',
              color: '#fff',
              background: 'rgba(0,0,0,0.45)',
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: '6px',
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            Close ×
          </button>
        </div>

        <canvas
          ref={canvasRef}
          width={rasterSize.width}
          height={rasterSize.height}
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={stopDrag}
          onPointerCancel={stopDrag}
          onLostPointerCapture={stopDrag}
          aria-label={`Interactive ${id} phase field`}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            flexShrink: 0,
            borderRadius: 0,
            cursor: 'grab',
            touchAction: 'none',
          }}
        />
    </div>
    </>
  );
}


const BOUNDARY_DIGIT_STOPS = [[15.22426999999999,24.2837,36.4243,45.2836,54.143,63.0023,72.2568,81.5113,90.7657,100.0202,109.2747,118.5291,127.7836,137.0381,160.7778],[15.224299999999971,24.2837,36.4243,45.2836,54.143,63.0023,71.8617,81.1655,90.4694,99.7732,109.0771,118.3809,127.6847,136.9886,160.7777],[15.224280000000022,24.2837,36.4243,45.2837,54.1431,63.0025,71.8619,80.7213,89.5807,99.0326,108.4846,117.9365,127.3884,136.8404,160.7779],[15.225889999999993,24.2853,36.4259,45.2853,54.1447,63.0041,71.8635,81.1673,90.4711,99.7749,109.0787,118.3825,127.6863,136.9901,160.7795],[15.225929999999948,24.2853,36.4259,45.2852,54.1446,63.0039,72.2584,81.5129,90.7673,100.0218,109.2763,118.5307,127.7852,137.0397,160.7794]];


// Custom appearance controls; no native browser color picker.
function surfaceHexFromHsv(h, s, v) {
  const k = n => (n + h / 60) % 6;
  const f = n => v - v * s *
    Math.max(0, Math.min(k(n), 4 - k(n), 1));

  return `#${[f(5), f(3), f(1)].map(value =>
    Math.round(value * 255).toString(16).padStart(2, '0')
  ).join('').toUpperCase()}`;
}

function surfaceHsvFromHex(hex) {
  const raw = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map(i =>
    parseInt(raw.slice(i, i + 2), 16) / 255
  );

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;

  if (delta > 0) {
    if (max === r) h = ((g - b) / delta + 6) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
  }

  return {
    h: h * 60,
    s: max === 0 ? 0 : delta / max,
    v: max,
  };
}

function SurfaceAppearanceMenu({
  id,
  appearance,
  setAppearance,
  colorWidth,
  directionWidth,
  lightOrbit,
  toggleLightOrbit,
  changeOrbitSeconds,
  orbitSeconds,
  resetLightOrbit,
  stopLightOrbit,
}) {
  const hostRef = useRef(null);
  const popupRef = useRef(null);

  const [panel, setPanel] = useState(null);

  // Display-only clock for the Azimuth slider.
  // It does not control or restart the light orbit.
  const [orbitDisplayTime, setOrbitDisplayTime] = useState(0);

  useEffect(() => {
    if (panel !== 'lighting') return undefined;

    let frame;

    const update = () => {
      setOrbitDisplayTime(performance.now());

      if (lightOrbit.period > 0) {
        frame = requestAnimationFrame(update);
      }
    };

    update();

    return () => {
      if (frame !== undefined) {
        cancelAnimationFrame(frame);
      }
    };
  }, [
    panel,
    lightOrbit.period,
    lightOrbit.phase,
    lightOrbit.anchor,
  ]);

  // Match the inclined-circle geometry used in all renderers.
  // Display instantaneous coordinates, not orbit parameters.
  const orbitAngle = (
    appearance.direction + lightOrbit.phase +
    (lightOrbit.period > 0
      ? 360 * (orbitDisplayTime - lightOrbit.anchor) /
          (lightOrbit.period * 1000)
      : 0)
  ) * Math.PI / 180;

  const inclination =
    (appearance.elevation ?? 10) * Math.PI / 180;

  const displayedAzimuth = lightOrbit.period > 0
    ? ((Math.atan2(
        Math.cos(inclination) * Math.sin(orbitAngle),
        Math.cos(orbitAngle)
      ) * 180 / Math.PI) + 360) % 360
    : ((appearance.direction + lightOrbit.phase) % 360 + 360) % 360;

  const displayedElevation = lightOrbit.period > 0
    ? Math.asin(Math.max(-1, Math.min(1,
        Math.sin(inclination) * Math.sin(orbitAngle)
      ))) * 180 / Math.PI
    : (appearance.elevation ?? 10);

  const pauseAtCurrentPosition = () => {
    if (lightOrbit.period <= 0) return;

    stopLightOrbit();

    setAppearance(current => ({
      ...current,
      direction: displayedAzimuth,
      elevation: displayedElevation,
    }));
  };

  // Approved Lighting popup height.
  const LIGHTING_POPUP_HEIGHT = 126;

  // Approved Lighting slider dimensions and alignment.



  const [draft, setDraft] = useState(() =>
    surfaceHsvFromHex(appearance.color)
  );

  const color = surfaceHexFromHsv(
    draft.h,
    surfaceHsvFromHex('#FFAC0A').s,
    1
  );

  useEffect(() => {
    if (!panel) return undefined;

    const dismiss = event => {
      if (
        !hostRef.current?.contains(event.target) &&
        !popupRef.current?.contains(event.target)
      ) {

        setPanel(null);
      }
    };

    const escape = event => {
      if (event.key === 'Escape') {

        setPanel(null);
      }
    };

    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);

    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', escape);
    };
  }, [panel]);

  const chooseDirection = event => {
    const rect = event.currentTarget.getBoundingClientRect();

    const dx = event.clientX - rect.left - rect.width / 2;
    const dy = event.clientY - rect.top - rect.height / 2;

    const angle = Math.round(
      Math.atan2(dx, -dy) * 180 / Math.PI
    );

    setAppearance(current => ({
      ...current,
      direction: angle,
    }));
  };

  const buttonStyle = {
    border: '1px solid rgba(214,207,188,0.55)',
    borderRadius: 6,
    background: 'rgba(22,22,18,0.88)',
    color: '#f0cf78',
    padding: '5px 10px',
    cursor: 'pointer',
    font: 'inherit',
  };

  return (
    <div
      ref={hostRef}
      style={{
        position: 'relative',
        zIndex: panel ? 20 : 1,
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <button
          type="button"
          aria-expanded={panel === 'color'}
          aria-label="Surface color"
          style={{
            ...buttonStyle,
            color: 'rgba(242, 237, 224, 0.94)',
            padding: '0.12rem 0.28rem',
            borderRadius: '8px',
            background: 'rgba(22, 22, 18, 0.36)',
            border: '1px solid rgba(214, 207, 188, 0.48)',
            fontSize: '0.82rem',
            lineHeight: 'inherit',
            whiteSpace: 'nowrap',
            width: colorWidth,
            boxSizing: 'border-box',
            textAlign: 'center',
          }}
          onClick={() => {
            setDraft(surfaceHsvFromHex(appearance.color));
            setPanel(current =>
              current === 'color' ? null : 'color'
            );
          }}
        >
          Color
        </button>
        <button
          type="button"
          aria-expanded={panel === 'lighting'}
          aria-label="Surface lighting"
          onClick={() =>
            setPanel(current =>
              current === 'lighting' ? null : 'lighting'
            )
          }
          style={{
            ...buttonStyle,
            color: 'rgba(242, 237, 224, 0.94)',
            padding: '0.12rem 0.28rem',
            borderRadius: 8,
            background: 'rgba(22,22,18,0.36)',
            border: '1px solid rgba(214,207,188,0.48)',
            fontSize: '0.82rem',
            lineHeight: 'inherit',
            width: directionWidth,
            boxSizing: 'border-box',
          }}
        >
          Lighting
        </button>
      </div>

      {panel === 'lighting' && (
        <div
          ref={popupRef}
          style={{
            position: 'absolute',
            right: 0,
            bottom: 'calc(100% + 7px)',
            width: 390,
            maxWidth: 'calc(100vw - 32px)',
            height: LIGHTING_POPUP_HEIGHT,
            '--light-track-thickness': '2px',
            '--light-thumb-size': '10px',
            maxHeight: 'calc(100dvh - 16px)',
            overflowY: 'auto',
            zIndex: 50,
            display: 'grid',
            gap: 2,
            padding: '5px 9px',
            boxSizing: 'border-box',
            background: 'rgba(14,17,20,0.96)',
            border: '1px solid rgba(214,207,188,0.45)',
            borderRadius: 8,
            color: '#eee',
            fontSize: 11,
          }}
        >
          <style jsx global>{`
            .planck-lighting-range {
              -webkit-appearance: none;
              appearance: none;
              height: var(--light-track-thickness);
              border: none;
              border-radius: 999px;
              outline-offset: 5px;
            }
            .planck-lighting-range::-webkit-slider-thumb {
              -webkit-appearance: none;
              appearance: none;
              width: var(--light-thumb-size);
              height: var(--light-thumb-size);
              border: none;
              border-radius: 50%;
              background: #1676ed;
              cursor: pointer;
            }
            .planck-lighting-range::-moz-range-thumb {
              width: var(--light-thumb-size);
              height: var(--light-thumb-size);
              border: none;
              border-radius: 50%;
              background: #1676ed;
              cursor: pointer;
            }
          `}</style>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '62px minmax(0,1fr)',
            alignItems: 'center',
            columnGap: 8,
          }}>
            <span>Azimuth</span>
            <div style={{
              minWidth: 0,
              transform: 'translateY(6px)',
            }}>
              <input
                type="range"
                min="0"
                max="360"
                step="1"
                value={displayedAzimuth}
                aria-label="Light azimuth"
                onChange={event => {
                  pauseAtCurrentPosition();
                  setAppearance(current => ({
                    ...current,
                    direction: Number(event.target.value),
                    elevation: displayedElevation,
                  }));
                }}
                className="planck-lighting-range"
                style={{

                  display: 'block',
                  width: '100%',
                  margin: 0,
                  cursor: 'pointer',
                  background: `linear-gradient(to right,
                    #1676ed 0%,
                    #1676ed var(--progress),
                    #b5b0a7 var(--progress),
                    #b5b0a7 100%)`,
                  '--progress':
                    `${displayedAzimuth / 360 * 100}%`,
                }}
              />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 9,
                lineHeight: '12px',
                opacity: 0.85,
              }}>
                <span>0</span>
                <span>π/2</span>
                <span>π</span>
                <span>3π/2</span>
                <span>2π</span>
              </div>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '62px minmax(0,1fr)',
            alignItems: 'center',
            columnGap: 8,
          }}>
            <span title={lightOrbit.period > 0
              ? `Orbit inclination: ${appearance.elevation ?? 10}°`
              : "Manual light elevation"}>Elevation</span>
            <div style={{
              minWidth: 0,
              transform: 'translateY(6px)',
            }}>
              <input
                type="range"
                min="-90"
                max="90"
                step="1"
                value={displayedElevation}
                aria-label="Light elevation"
                onChange={event => {
                  pauseAtCurrentPosition();
                  setAppearance(current => ({
                    ...current,
                    direction: displayedAzimuth,
                    elevation: Number(event.target.value),
                  }));
                }}
                className="planck-lighting-range"
                style={{

                  display: 'block',
                  width: '100%',
                  margin: 0,
                  cursor: 'pointer',
                  background: `linear-gradient(to right,
                    #1676ed 0%,
                    #1676ed var(--progress),
                    #b5b0a7 var(--progress),
                    #b5b0a7 100%)`,
                  '--progress':
                    `${(displayedElevation + 90) / 180 * 100}%`,
                }}
              />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 9,
                lineHeight: '12px',
                opacity: 0.85,
              }}>
                <span>−π/2</span>
                <span>0</span>
                <span>π/2</span>
              </div>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '62px minmax(0,1fr)',
            alignItems: 'center',
            columnGap: 8,
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              whiteSpace: 'nowrap',
            }}>
              <span>Orbit</span>
              <button
                type="button"
                aria-pressed={lightOrbit.period > 0}
                onClick={() => {
                  if (lightOrbit.period > 0) {
                    pauseAtCurrentPosition();
                  } else {
                    toggleLightOrbit();
                  }
                }}
                style={{
                  padding: 0,
                  margin: 0,
                  border: 'none',
                  background: 'none',
                  color: lightOrbit.period > 0
                    ? '#7fc2ff'
                    : 'rgba(245,238,220,0.92)',
                  font: 'inherit',
                  lineHeight: 'inherit',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  textUnderlineOffset: '0.12em',
                }}
              >
                {lightOrbit.period > 0 ? 'On' : 'Off'}
              </button>
            </div>

            <div style={{
              minWidth: 0,
              transform: 'translateY(6px)',
            }}>
              <input
                type="range"
                min="2"
                max="60"
                step="1"
                value={orbitSeconds}
                aria-label="Orbit seconds per revolution"
                title="Orbit speed in seconds per revolution"
                onChange={event =>
                  changeOrbitSeconds(event.target.value)
                }
                className="planck-lighting-range"
                style={{
                  display: 'block',
                  width: '100%',
                  margin: 0,
                  cursor: 'pointer',
                  background: `linear-gradient(to right,
                    #1676ed 0%,
                    #1676ed var(--progress),
                    #b5b0a7 var(--progress),
                    #b5b0a7 100%)`,
                  '--progress':
                    `${((orbitSeconds - 2) / 58) * 100}%`,
                }}
              />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 9,
                lineHeight: '12px',
                opacity: 0.85,
              }}>
                <span>2s</span>
                <span>15s</span>
                <span>30s</span>
                <span>45s</span>
                <span>60s</span>
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 8,
            marginTop: 0,
          }}>


            <button
              type="button"
              style={{
                ...buttonStyle,
                color: 'rgba(242,237,224,0.94)',
                padding: '0.12rem 0.28rem',
                fontSize: '0.82rem',
                lineHeight: 'inherit',
                background: 'rgba(22,22,18,0.36)',
                borderRadius: 8,
              }}
              onClick={() => setPanel(null)}
            >
              Set
            </button>

            <button
              type="button"
              style={{
                ...buttonStyle,
                color: 'rgba(242,237,224,0.94)',
                padding: '0.12rem 0.28rem',
                fontSize: '0.82rem',
                lineHeight: 'inherit',
                background: 'rgba(22,22,18,0.36)',
                borderRadius: 8,
              }}
              onClick={() => {
                resetLightOrbit();
                setAppearance(current => ({
                  ...current,
                  direction: 144,
                  elevation: 10,
                }));
              }}
            >
              Reset
            </button>
          </div>


        </div>
      )}

      {panel === 'color' && (
        <div style={{
          position: 'absolute',
          right: 0,
          bottom: 'calc(100% + 7px)',
          width: 410,
          maxWidth: 'calc(100vw - 36px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 8,
          padding: 0,
          boxSizing: 'border-box',
          background: 'transparent',
          border: 'none',
          borderRadius: 0,
          boxShadow: 'none',
          zIndex: 50,
        }}>
          <style jsx global>{`
            .planck-inline-hue {
              appearance: none;
              -webkit-appearance: none;
              height: 10px;
              border-radius: 999px;
              border: 0;
              outline-offset: 4px;
              background: linear-gradient(
                to right,
                #ff0a0a 0%,
                #ffff0a 16.67%,
                #0aff0a 33.33%,
                #0affff 50%,
                #0a0aff 66.67%,
                #ff0aff 83.33%,
                #ff0a0a 100%
              );
              cursor: pointer;
            }

            .planck-inline-hue::-webkit-slider-thumb {
              appearance: none;
              -webkit-appearance: none;
              width: 14px;
              height: 14px;
              border-radius: 50%;
              background: white;
              border: 2px solid #333;
              box-shadow: 0 0 0 1px white;
            }

            .planck-inline-hue::-moz-range-thumb {
              width: 12px;
              height: 12px;
              border-radius: 50%;
              background: white;
              border: 2px solid #333;
              box-shadow: 0 0 0 1px white;
            }
          `}</style>

          <input
            className="planck-inline-hue"
            type="range"
            min="0"
            max="360"
            step="1"
            value={draft.h}
            aria-label="Surface hue"
            onChange={event => {
              const h = Number(event.target.value);
              const liveColor = surfaceHexFromHsv(
                h,
                surfaceHsvFromHex('#FFAC0A').s,
                1
              );

              setDraft(current => ({
                ...current,
                h,
                s: surfaceHsvFromHex('#FFAC0A').s,
                v: 1,
              }));

              setAppearance(current => ({
                ...current,
                color: liveColor,
              }));
            }}
            style={{
              flex: 1,
              minWidth: 90,
              width: '100%',
              margin: 0,
              padding: 0,
            }}
          />

          <button
            type="button"
            style={{
              ...buttonStyle,
              color: 'rgba(242, 237, 224, 0.94)',
              padding: '0.12rem 0.28rem',
              fontSize: '0.82rem',
              lineHeight: 'inherit',
              borderRadius: 8,
              background: 'rgba(22,22,18,0.36)',
              border: '1px solid rgba(214,207,188,0.48)',
              boxSizing: 'border-box',
              whiteSpace: 'nowrap',
            }}
            onClick={() => {
              setPanel(null);
            }}
          >
            Set
          </button>
          <button
            type="button"
            style={{
              ...buttonStyle,
              color: 'rgba(242, 237, 224, 0.94)',
              padding: '0.12rem 0.28rem',
              fontSize: '0.82rem',
              lineHeight: 'inherit',
              borderRadius: 8,
              background: 'rgba(22,22,18,0.36)',
              border: '1px solid rgba(214,207,188,0.48)',
              boxSizing: 'border-box',
              whiteSpace: 'nowrap',
            }}
            onClick={() => {
              setDraft(surfaceHsvFromHex('#FFAC0A'));
              setAppearance(current => ({
                ...current,
                color: '#FFAC0A',
              }));
            }}
          >
            Reset
          </button>
        </div>
      )}


    </div>
  );
}

export default function PlanckConstants() {
    const constants = [
    'Planck time',
    'Planck length',
    'Planck charge',
    'Planck temperature',
    'Planck mass'
  ];

  const constantLinks = [
    'https://www.wolframalpha.com/input?i=plot+pi*%28sinh%281%2F4*1%2F%28x%2Biy%29%29%29%5E2*%28e%5E5.39125836832313%2F44%29%2C+%7Bx%2C-1%2C1%7D',
    'https://www.wolframalpha.com/input?i=plot+%28sinh%28sinh%281%2F7*%28x%2Biy%29%29%29%29%5E%28-1%29*%28e%5E1.61625918175645%2F35%29%2C+%7Bx%2C-1%2C1%7D',
    'https://www.wolframalpha.com/input?i=plot+5%2F7%5E%281%2F2%29*%283%5E%28-1%2F3%29%2F%282%5E%285%2F4%29*pi%5E%281%2F2%29*e%5E%284pi%2F32%29%2F%28gamma%281%2F4*%28x%2Biy%29%29%29%5E2%29%29*e%5E1.87554596713962%2F18%2C+%7Bx%2C-1%2C1%7D',
    'https://www.wolframalpha.com/input?i=plot+2*%285%2F7%5E%281%2F2%29%29%5E2*%28cos%285i%2F2*1%2F%28x%2Biy%29%29%29%5E2*%28cos%287%2F5*1%2F%28x%2Biy%29%29%29%5E2*%28e%5E1.4167869859079%2F32%29%2C+%7Bx%2C-7%2C7%7D',
    'https://www.wolframalpha.com/input?i=plot+5*4pi%2F2*%28cos%287%2F5*1%2F%28x%2Biy%29%29%29%5E2*%28e%5E2.17642683817579%2F8%29%2C+%7Bx%2C-4%2C4%7D'
  ];

  // Base keys used to build filenames
  const constantKeys = ['time', 'length', 'charge', 'temperature', 'mass'];

  const videoFiles = [
  'planck_time.mp4',
  'planck_length.mp4',
  'planck_charge.mp4',
  'planck_temperature.mp4',
  'planck_mass.mp4'
];

  // Toggle 1: 3D vs 2D
  const [is3D, setIs3D] = useState(true);

  // Approved switch contrast: brightness 66%, opacity 0%.

  // Toggle 2: Real vs Imaginary
  const [isReal, setIsReal] = useState(false);
  const [surfaceFirstInverted, setSurfaceFirstInverted] =
    useState(true);



  // TEMPORARY: visual magnification of both 3D previews.
  const [surfaceDomainLeft, setSurfaceDomainLeft] = useState(1);
  const [surfaceDomainRight, setSurfaceDomainRight] = useState(1);


  // TEMPORARY: independent vertical ranges and plot sizes.
  const [surfaceHeightLeft, setSurfaceHeightLeft] = useState(5);
  const [surfaceHeightRight, setSurfaceHeightRight] = useState(2);
  const [surfaceSizeLeft, setSurfaceSizeLeft] = useState(1);
  const [surfaceSizeRight, setSurfaceSizeRight] = useState(1);

  // Temporary visual calibration; no geometry changes.
  const [appearanceLeft, setAppearanceLeft] = useState({
    ambient: 0.65,
    lighting: 2.4,
    direction: 144,
    elevation: 10,
    color: '#FFAC0A',
  });

  const [appearanceRight, setAppearanceRight] = useState({
    ambient: 0.50,
    lighting: 5.00,
    direction: 144,
    elevation: 10,
    color: '#FFAC0A',
  });

  // Additional Planck-time previews.
  const [surfaceDomainRealZ, setSurfaceDomainRealZ] = useState(1);
  const [surfaceHeightRealZ, setSurfaceHeightRealZ] = useState(5);
  const [surfaceSizeRealZ, setSurfaceSizeRealZ] = useState(1);

  const [surfaceDomainImagInv, setSurfaceDomainImagInv] = useState(1);
  const [surfaceHeightImagInv, setSurfaceHeightImagInv] = useState(2);
  const [surfaceSizeImagInv, setSurfaceSizeImagInv] = useState(1);

  const [appearanceRealZ, setAppearanceRealZ] = useState({
    ambient: 0.65,
    lighting: 2.4,
    direction: 144,
    elevation: 10,
    color: '#FFAC0A',
  });

  const [appearanceImagInv, setAppearanceImagInv] = useState({
    ambient: 0.50,
    lighting: 5.00,
    direction: 144,
    elevation: 10,
    color: '#FFAC0A',
  });

  const [renderDomainRealZ, setRenderDomainRealZ] = useState(1);
  const [renderHeightRealZ, setRenderHeightRealZ] = useState(5);

  const [renderDomainImagInv, setRenderDomainImagInv] = useState(1);
  const [renderHeightImagInv, setRenderHeightImagInv] = useState(2);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setRenderDomainRealZ(surfaceDomainRealZ);
      setRenderHeightRealZ(surfaceHeightRealZ);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [surfaceDomainRealZ, surfaceHeightRealZ]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setRenderDomainImagInv(surfaceDomainImagInv);
      setRenderHeightImagInv(surfaceHeightImagInv);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [surfaceDomainImagInv, surfaceHeightImagInv]);

  // Delay costly mathematical resampling while sliders move.
  const [renderDomainLeft, setRenderDomainLeft] = useState(1);
  const [renderDomainRight, setRenderDomainRight] = useState(1);
  const [renderHeightLeft, setRenderHeightLeft] = useState(5);
  const [renderHeightRight, setRenderHeightRight] = useState(2);


  useEffect(() => {
    const timer = window.setTimeout(() => {
      setRenderDomainLeft(surfaceDomainLeft);
      setRenderHeightLeft(surfaceHeightLeft);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [surfaceDomainLeft, surfaceHeightLeft]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setRenderDomainRight(surfaceDomainRight);
      setRenderHeightRight(surfaceHeightRight);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [surfaceDomainRight, surfaceHeightRight]);

  // Logarithmic domain scale: 0.001 through 10.
  const surfaceSliderToDomain = value =>
    Math.pow(10, Number(value) / 100 - 3);

  const surfaceDomainToSlider = domain =>
    100 * (Math.log10(domain) + 3);

  const [modalImage, setModalImage] = useState(null);
  const [modalVideo, setModalVideo] = useState(null);
  const phaseZooms = PHASE_INITIAL_ZOOM;

  const [expandedPhase, setExpandedPhase] = useState(null);

  const [expandedSurface, setExpandedSurface] = useState(null);

  // Shared orientation for the five thumbnail cameras.
  // Mutable ref avoids rebuilding React or Three.js scenes
  // on every rotation frame.
  const thumbnailOrientationRef = useRef({
    owner: null,
    position: null,
    up: null,
    version: 0,
  });

  // Approved widths of the three surface controls.
  // Approved Lighting button width.
  const lightingButtonWidth = 64;

  // Shared light orbit. Angles remain in degrees internally.
  const [lightOrbit, setLightOrbit] = useState({
    period: 20,
    phase: 0,
    anchor: 0,
  });

  // Continuous orbit speed: seconds per revolution.
  const [orbitSeconds, setOrbitSeconds] = useState(20);

  const toggleLightOrbit = () => {
    setLightOrbit(previous => {
      const now = performance.now();

      const phase = previous.period > 0
        ? (
            previous.phase +
            360 * (now - previous.anchor) /
              (previous.period * 1000)
          ) % 360
        : previous.phase;

      return {
        period: previous.period > 0 ? 0 : orbitSeconds,
        phase,
        anchor: now,
      };
    });
  };

  const changeOrbitSeconds = value => {
    const seconds = Math.max(
      2, Math.min(60, Number(value))
    );
    const now = performance.now();

    setOrbitSeconds(seconds);

    setLightOrbit(previous => {
      const phase = previous.period > 0
        ? (
            previous.phase +
            360 * (now - previous.anchor) /
              (previous.period * 1000)
          ) % 360
        : previous.phase;

      return {
        period: previous.period > 0 ? seconds : 0,
        phase,
        anchor: now,
      };
    });
  };

  const stopLightOrbit = () => {
    setLightOrbit({
      period: 0,
      phase: 0,
      anchor: performance.now(),
    });
  };

  const resetLightOrbit = () => {
    setOrbitSeconds(20);
    setLightOrbit({
      period: 20,
      phase: 0,
      anchor: performance.now(),
    });
  };

  const surfaceControlWidths = {
    contours: 107,
    color: 49,
    direction: 98,
  };

  const surfaceArgumentWidth = 55;
  const [surfaceLineMode, setSurfaceLineMode] =
    useState("contours");

  // Full-screen mathematical-domain playback.
  // A complete minimum-to-maximum sweep takes 20 seconds.
  const [surfaceDomainPlaying, setSurfaceDomainPlaying] = useState(false);
  const surfacePlaybackRef = useRef({
    key: null,
    position: 0,
    direction: 1,
  });


  // TEMPORARY: twenty independent full-screen plotting windows.
  // These never change the five small calibrated previews.
  const [surfaceWindowDrafts, setSurfaceWindowDrafts] = useState(
    () => Object.fromEntries(
      Object.entries(PLANCK_SURFACE_SETTINGS).map(
        ([key, values]) => [
          key, {
            ...values,
            domain: FULLSCREEN_APPROVED_WINDOWS[key]?.domain
              ?? values.domain,
            zoom: 1,
          }
        ]
      )
    )
  );

  const [surfaceWindowRendered, setSurfaceWindowRendered] = useState(
    () => Object.fromEntries(
      Object.entries(PLANCK_SURFACE_SETTINGS).map(
        ([key, values]) => [
          key, {
            ...values,
            domain: FULLSCREEN_APPROVED_WINDOWS[key]?.domain
              ?? values.domain,
            zoom: 1,
          }
        ]
      )
    )
  );

  const [surfaceWindowSaved, setSurfaceWindowSaved] = useState(
    () => Object.fromEntries(
      Object.entries(FULLSCREEN_APPROVED_WINDOWS).map(
        ([key, values]) => [
          key,
          {
            ...PLANCK_SURFACE_SETTINGS[key],
            ...values,
            zoom: 1,
          },
        ]
      )
    )
  );

  // TEMPORARY: independent domain slider endpoints, per state.
  const [surfaceDomainBounds, setSurfaceDomainBounds] = useState(
    () => Object.fromEntries(
      Object.entries(PLANCK_SURFACE_SETTINGS).map(([key, v]) => [
        key,
        {
          min: FULLSCREEN_APPROVED_WINDOWS[key]?.minDomain
            ?? Math.max(0.000001, v.domain / 10),
          max: FULLSCREEN_APPROVED_WINDOWS[key]?.maxDomain
            ?? v.domain * 10,
        },
      ])
    )
  );

  const changeDomainBound = (key, end, value) => {
    if (!Number.isFinite(value) || value <= 0) return;

    const current = surfaceDomainBounds[key];
    if (end === 'min' && value >= current.max) return;
    if (end === 'max' && value <= current.min) return;

    setSurfaceDomainBounds(previous => ({
      ...previous,
      [key]: { ...previous[key], [end]: value },
    }));

    const selected = surfaceWindowDrafts[key].domain;
    const next = end === 'min'
      ? Math.max(value, selected)
      : Math.min(value, selected);

    if (next !== selected) {
      updateSurfaceWindow(key, 'domain', next);
    }
  };

  const currentSurfaceWindowKey = expandedSurface === null
    ? null
    : `${expandedSurface.index}-${isReal ? 're' : 'im'}-` +
      `${surfaceFirstInverted ? 'inv' : 'z'}`;

  // Debounce mesh reconstruction, not camera magnification.
  useEffect(() => {
    if (!currentSurfaceWindowKey) return undefined;

    const key = currentSurfaceWindowKey;
    const draft = surfaceWindowDrafts[key];

    const timer = window.setTimeout(() => {
      setSurfaceWindowRendered(previous => ({
        ...previous,
        [key]: {
          ...previous[key],
          domain: draft.domain,
          cutoff: draft.cutoff,
        },
      }));
    }, surfaceDomainPlaying ? 35 : 260);

    return () => window.clearTimeout(timer);
  }, [
    currentSurfaceWindowKey,
    surfaceWindowDrafts,
    surfaceDomainPlaying,
  ]);

  const updateSurfaceWindow = (key, field, value) => {
    if (!Number.isFinite(value)) return;

    const limits = field === 'zoom'
      ? [0.1, 10]
      : [0.000001, Number.MAX_SAFE_INTEGER];

    const selected = Math.max(
      limits[0],
      Math.min(limits[1], value)
    );

    setSurfaceWindowDrafts(previous => ({
      ...previous,
      [key]: {
        ...previous[key],
        [field]: selected,
      },
    }));
  };

  // Animate in logarithmic domain coordinates.
  // One decade takes 40 seconds, capped at 120 seconds.
  // Pause/resume retains position and direction.
  useEffect(() => {
    if (!surfaceDomainPlaying || !currentSurfaceWindowKey) {
      return undefined;
    }

    const key = currentSurfaceWindowKey;
    const bounds = surfaceDomainBounds[key];
    const logMin = Math.log(bounds.min);
    const logSpan = Math.log(bounds.max) - logMin;

    if (!(logSpan > 0)) return undefined;

    const decades = logSpan / Math.log(10);
    const traverseMs = Math.max(
      15360,
      Math.min(61440, 20480 * decades)
    );

    const motion = surfacePlaybackRef.current;
    let frameId;
    let lastTime = null;
    let lastUpdate = -Infinity;

    const tick = now => {
      if (lastTime === null) lastTime = now;

      // Avoid large jumps after an inactive browser tab.
      const dt = Math.max(0, Math.min(now - lastTime, 250));
      lastTime = now;

      motion.position += motion.direction * dt / traverseMs;

      // Reflect smoothly at either end of the slider.
      if (motion.position >= 1) {
        motion.position = 2 - motion.position;
        motion.direction = -1;
      } else if (motion.position <= 0) {
        motion.position = -motion.position;
        motion.direction = 1;
      }

      motion.position = Math.max(
        0,
        Math.min(1, motion.position)
      );

      // Throttle costly mesh rebuilds while remaining smooth.
      if (now - lastUpdate >= 140) {
        const domain = Math.exp(
          logMin + motion.position * logSpan
        );

        updateSurfaceWindow(key, 'domain', domain);
        lastUpdate = now;
      }

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frameId);
  }, [surfaceDomainPlaying, currentSurfaceWindowKey]);

  const copyFiveImagDirectWindows = async () => {
    const names = [
      'Planck time',
      'Planck length',
      'Planck charge',
      'Planck temperature',
      'Planck mass',
    ];

    const rows = names.map((name, index) => {
      const key = `${index}-im-z`;
      const draft = surfaceWindowDrafts[key];
      const bounds = surfaceDomainBounds[key];

      return (
        `${name} — Im F${index}(z)\n` +
        `Domain: ±${draft.domain.toPrecision(10)}\n` +
        `Minimum domain: ${bounds.min.toPrecision(10)}\n` +
        `Maximum domain: ${bounds.max.toPrecision(10)}`
      );
    });

    const report = rows.join('\n\n');

    try {
      await navigator.clipboard.writeText(report);
    } catch {
      window.prompt('Copy all five Im(z) settings:', report);
    }
  };

  const copyAllSurfaceWindows = async () => {
    const names = [
      'Planck time', 'Planck length', 'Planck charge',
      'Planck temperature', 'Planck mass'
    ];

    const rows = [];

    for (let index = 0; index < 5; index++) {
      for (const component of ['re', 'im']) {
        for (const argument of ['z', 'inv']) {
          const key = `${index}-${component}-${argument}`;
          const saved = surfaceWindowSaved[key];
          const draft = surfaceWindowDrafts[key];
          const bounds = surfaceDomainBounds[key];

          const domain = saved?.domain ?? draft.domain;
          const minimum = saved?.minDomain ?? bounds.min;
          const maximum = saved?.maxDomain ?? bounds.max;

          rows.push(
            `${names[index]} — ${component === 're' ? 'Re' : 'Im'} ` +
            `F${index}(${argument === 'z' ? 'z' : '1/z'})\n` +
            `Domain: ±${domain.toPrecision(8)}\n` +
            `Minimum domain: ${minimum.toPrecision(8)}\n` +
            `Maximum domain: ${maximum.toPrecision(8)}\n` +
            `Status: ${saved ? 'Set' : 'Not set'}`
          );
        }
      }
    }

    const report = rows.join('\n\n');

    try {
      await navigator.clipboard.writeText(report);
    } catch {
      window.prompt('Copy all 20 settings:', report);
    }
  };
  const phasePlotMode = surfaceFirstInverted ? "inverted" : "normal";
  const phaseZoomLimits = {
    normal: [
      { out: 2.42, in: 2.96 },  // G0(z)
      { out: 2.27, in: 10.9 },  // G1(z)
      { out: 12.0, in: 129 },  // G2(z)
      { out: 2.94, in: 2.07 },  // G3(z)
      { out: 3.01, in: 2.36 },  // G4(z)
    ],
    inverted: [
      { out: 1.67, in: 445 },   // G0(1/z)
      { out: 10, in: 100 },     // G1(1/z)
      { out: 10, in: 100 },     // G2(1/z)
      { out: 9.46, in: 437 },   // G3(1/z)
      { out: 9.29, in: 586 },   // G4(1/z)
    ],
  };

  const gExplorerHostRef = useRef(null);
  const gScrollLockRef = useRef({
    locked: false,
    armed: true,
    upwardGestures: 0,
    lastUpwardEvent: 0,
    lastGestureDirection: 0,
  });

  useEffect(() => {
    const host = gExplorerHostRef.current;
    if (!host) return undefined;

    const state = gScrollLockRef.current;
    let lastScrollY = window.scrollY;

    const onScroll = () => {
      const y = window.scrollY;
      const movingDown = y > lastScrollY;
      const rect = host.getBoundingClientRect();

      if (!state.armed && rect.top > 120) {
        state.armed = true;
      }

      if (
        state.armed &&
        !state.locked &&
        movingDown &&
        rect.top <= 0 &&
        rect.bottom > window.innerHeight * 0.5
      ) {
        state.locked = true;
        state.upwardGestures = 0;
        state.lastGestureDirection = 0;
        window.scrollTo(0, y + rect.top);
      }

      lastScrollY = window.scrollY;
    };

    const onWheel = event => {
      if (!state.locked) return;

      // Preserve gestures inside the actual graph and
      // scrollable explorer controls.
      const target = event.target;
      const interactive =
        target instanceof Element &&
        (
          target.closest('.g-plane-wrap') ||
          target.closest('.g-toolbar')
        );

      if (interactive) return;

      const direction = Math.sign(event.deltaY);

      if (direction >= 0) {
        state.upwardGestures = 0;
        state.lastGestureDirection = direction;
        event.preventDefault();
        return;
      }

      const now = performance.now();

      if (
        state.lastGestureDirection !== -1 ||
        now - state.lastUpwardEvent > 350
      ) {
        state.upwardGestures += 1;
      }

      state.lastUpwardEvent = now;
      state.lastGestureDirection = -1;

      if (state.upwardGestures >= 2) {
        state.locked = false;
        state.armed = false;
        state.upwardGestures = 0;
        return;
      }

      event.preventDefault();
    };

    window.addEventListener('scroll', onScroll, {
      passive: true,
    });

    window.addEventListener('wheel', onWheel, {
      capture: true,
      passive: false,
    });

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('wheel', onWheel, true);
      state.locked = false;
    };
  }, []);


  const [gExplorerFrame, setGExplorerFrame] = useState({
    left: 0,
    width: 0,
    ready: false,
  });

  useEffect(() => {
    const host = gExplorerHostRef.current;
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');

    if (!host) return undefined;

    const oldOverflowX = mainContent?.style.overflowX ?? '';

    if (mainContent) {
      mainContent.style.overflowX = 'visible';
    }

    const measure = () => {
      const hostRect = host.getBoundingClientRect();
      const sidebarRect = sidebar?.getBoundingClientRect();
      const sidebarRight = sidebarRect?.right ?? 0;

      const viewportRight =
        document.documentElement.clientWidth;

      setGExplorerFrame({
        left: sidebarRight - hostRect.left,
        width: Math.max(0, viewportRight - sidebarRight),
        ready: true,
      });
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(host);

    if (sidebar) observer.observe(sidebar);

    window.addEventListener('resize', measure);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);

      if (mainContent) {
        mainContent.style.overflowX = oldOverflowX;
      }
    };
  }, []);

  /*
   * Each geometry expands independently.
   *
   *   0 = compact symbolic relation
   *   1 = signed geometry + signed integer
   *   2 = common negative signs cancelled
   */
  const GEOMETRY_KEYS = [
    'time',
    'length',
    'charge',
    'temperature',
    'mass',
  ];

  const [geometryExpansionStages, setGeometryExpansionStages] =
    useState({
      time: 0,
      length: 0,
      charge: 0,
      temperature: 0,
      mass: 0,
    });

  const geometryTimersRef = useRef({});

  const anyGeometryExpanded =
    GEOMETRY_KEYS.some(
      key => geometryExpansionStages[key] > 0
    );

  const allGeometriesExpanded =
    GEOMETRY_KEYS.every(
      key => geometryExpansionStages[key] > 0
    );

  /*
   * Each normalized Planck boundary expands independently.
   */
  const BOUNDARY_KEYS = [
    'time',
    'length',
    'charge',
    'temperature',
    'mass',
  ];

  /*
   * Normalized Planck-boundary animation stages:
   *
   *   0 = compact equation at collapsed/right position
   *   1 = compact equation at expanded/left position
   *   2 = full expanded equation at expanded/left position
   *
   * This prevents the full equation from appearing over the
   * neighboring columns while it is still sliding left.
   */
  const [
    boundaryExpansionStates,
    setBoundaryExpansionStates,
  ] = useState({
    time: 0,
    length: 0,
    charge: 0,
    temperature: 0,
    mass: 0,
  });

  const boundaryTimersRef = useRef({});
  const [boundaryDigitCounts, setBoundaryDigitCounts] = useState({
    time: 0, length: 0, charge: 0, temperature: 0, mass: 0,
  });
  const BOUNDARY_ANIMATION_MS = 2000;
  const BOUNDARY_SYMBOL_TRAVEL_MS = 900;
  const BOUNDARY_RHS_TRAVEL_MS = 500;
  const BOUNDARY_DIGITS_START_MS = 1000;
  const BOUNDARY_DIGITS_END_MS = 1850;

  const allBoundariesExpanded =
    BOUNDARY_KEYS.every(
      key => boundaryExpansionStates[key] > 0
    );

  const clearBoundaryTimer = key => {
    (boundaryTimersRef.current[key] || []).forEach(window.clearTimeout);
    delete boundaryTimersRef.current[key];
  };

  const scheduleBoundaryReveal = key => {
    clearBoundaryTimer(key);
    const rowIndex = BOUNDARY_KEYS.indexOf(key);
    const steps = BOUNDARY_DIGIT_STOPS[rowIndex].length - 1;
    const timers = [];

    const schedule = (ms, callback) => {
      timers.push(window.setTimeout(callback, ms));
    };

    // The persistent 10 settles first; the Planck symbol follows.
    schedule(920, () => {
      setBoundaryExpansionStates(current =>
        current[key] === 1 ? { ...current, [key]: 2 } : current
      );
    });

    // Reveal original SVG digits individually.
    for (let count = 1; count <= steps; count++) {
      const ms = BOUNDARY_DIGITS_START_MS +
        (count - 1) *
        (BOUNDARY_DIGITS_END_MS - BOUNDARY_DIGITS_START_MS) /
        Math.max(1, steps - 1);

      schedule(Math.round(ms), () => {
        setBoundaryDigitCounts(current => ({
          ...current,
          [key]: count,
        }));
      });
    }

    // Replace symbolic exponent last, at exactly 2 seconds.
    schedule(BOUNDARY_ANIMATION_MS, () => {
      setBoundaryExpansionStates(current =>
        current[key] > 0 ? { ...current, [key]: 3 } : current
      );
    });

    boundaryTimersRef.current[key] = timers;
  };

  const expandBoundaryRow = key => {
    clearBoundaryTimer(key);
    setBoundaryDigitCounts(current => ({ ...current, [key]: 0 }));
    setBoundaryExpansionStates(current => ({ ...current, [key]: 1 }));
    scheduleBoundaryReveal(key);
  };

  const collapseBoundaryRow = key => {
    clearBoundaryTimer(key);
    setBoundaryExpansionStates(current => ({ ...current, [key]: 0 }));
    setBoundaryDigitCounts(current => ({ ...current, [key]: 0 }));
  };

  const toggleBoundaryRow = key => {
    if (boundaryExpansionStates[key] > 0) {
      collapseBoundaryRow(key);
    } else {
      expandBoundaryRow(key);
    }
  };

  const expandAllBoundaries = () => {
    const keys = BOUNDARY_KEYS.filter(
      key => boundaryExpansionStates[key] === 0
    );
    keys.forEach(expandBoundaryRow);
  };

  const collapseAllBoundaries = () => {
    BOUNDARY_KEYS.forEach(collapseBoundaryRow);
  };

  useEffect(() => {
    return () => {
      Object.values(
        boundaryTimersRef.current
      ).forEach((timers) => {
        timers.forEach(window.clearTimeout);
      });
    };
  }, []);


  // TEMPORARY inline-math SVG tuning
  /*
   * TEMPORARY INLINE-MATH SVG TUNING
   *
   * These SVGs were all authored from the same 12-point
   * mathematical font. Preserve their intrinsic dimensions
   * and scale them together rather than forcing a common
   * width or height.
   */
  /*
   * INLINE-MATH SVG TYPOGRAPHY
   *
   * All symbols preserve their intrinsic dimensions.
   * The accepted common scale and baseline are now fixed.
   */
  const INLINE_MATH_SCALE = 1.09;
  const INLINE_MATH_Y = -0.5;

  /*
   * Final inline-math baseline adjustments.
   */
  const INLINE_MATH_N_K_Y = 1.3;
  const INLINE_MATH_E_PHI_K_Y = -3.9;

  /*
   * Final u_k baseline adjustment.
   */
  const INLINE_MATH_U_K_Y = 1.2;

  const inlineMathStyle = {
    width: 'auto',
    height: 'auto',
    display: 'inline-block',
    position: 'relative',
    top: `${INLINE_MATH_Y}px`,
    transform: `scale(${INLINE_MATH_SCALE})`,
    transformOrigin: 'center center',
  };

  const inlineMathNKStyle = {
    ...inlineMathStyle,
    top: `${INLINE_MATH_N_K_Y}px`,
  };

  const inlineMathEPhiKStyle = {
    ...inlineMathStyle,
    top: `${INLINE_MATH_E_PHI_K_Y}px`,
  };

  const inlineMathUKStyle = {
    ...inlineMathStyle,
    top: `${INLINE_MATH_U_K_Y}px`,
  };

  /*
   * Independent geometry-expansion timers.
   *
   * Every row gets its own 900 ms signed stage, so rows can be
   * expanded in any order without resetting one another.
   */
  useEffect(() => {
    return () => {
      Object.values(
        geometryTimersRef.current
      ).forEach((timer) => {
        window.clearTimeout(timer);
      });
    };
  }, []);

  const scheduleGeometryCancellation = (key) => {
    if (geometryTimersRef.current[key]) {
      window.clearTimeout(
        geometryTimersRef.current[key]
      );
    }

    geometryTimersRef.current[key] =
      window.setTimeout(() => {
        setGeometryExpansionStages(
          current => {
            if (current[key] !== 1) {
              return current;
            }

            return {
              ...current,
              [key]: 2,
            };
          }
        );

        delete geometryTimersRef.current[key];
      }, 900);
  };

  const expandGeometryRow = (key) => {
    setGeometryExpansionStages(
      current => ({
        ...current,
        [key]: 1,
      })
    );

    scheduleGeometryCancellation(key);
  };

  const collapseGeometryRow = (key) => {
    if (geometryTimersRef.current[key]) {
      window.clearTimeout(
        geometryTimersRef.current[key]
      );
      delete geometryTimersRef.current[key];
    }

    setGeometryExpansionStages(
      current => ({
        ...current,
        [key]: 0,
      })
    );
  };

  const toggleGeometryRow = (key) => {
    if (geometryExpansionStages[key] > 0) {
      collapseGeometryRow(key);
    } else {
      expandGeometryRow(key);
    }
  };

  const expandAllGeometries = () => {
    const keysToExpand =
      GEOMETRY_KEYS.filter(
        key => geometryExpansionStages[key] === 0
      );

    if (keysToExpand.length === 0) {
      return;
    }

    setGeometryExpansionStages(
      current => {
        const next = { ...current };

        keysToExpand.forEach((key) => {
          next[key] = 1;
        });

        return next;
      }
    );

    keysToExpand.forEach((key) => {
      scheduleGeometryCancellation(key);
    });
  };

  const collapseAllGeometries = () => {
    Object.values(
      geometryTimersRef.current
    ).forEach((timer) => {
      window.clearTimeout(timer);
    });

    geometryTimersRef.current = {};

    setGeometryExpansionStages({
      time: 0,
      length: 0,
      charge: 0,
      temperature: 0,
      mass: 0,
    });
  };


  // Build the filename from the two toggles
  // planck_time_real_3d.png, etc.
  const getImageFilename = (key) => {
    const partRI = isReal ? 'real' : 'imag';
    const part23 = is3D ? '3d' : '2d';
    return `planck_${key}_${partRI}_${part23}.png`;
  };

  /*
   * TEMPORARY GEOMETRY-STACK TUNING
   *
   * Compact SVGs preserve their intrinsic dimensions.
   * COMPACT_RELATION_SCALE scales them uniformly.
   */
  /*
   * Compact geometric-relation layout.
   *
   * Measured directly from the new
   * geometric_relation_equation.svg:
   *
   *   G_k visible bounds: 0.0000 – 14.9375
   *   RHS begins at:      22.0000
   *
   * therefore:
   *
   *   G_k -> RHS gap = 7.0625
   */
  const COMPACT_RELATION_SCALE = 1.12;

  /*
   * Final compact relation row spacing.
   */
  const GEOMETRY_ROW_GAP = 1.50;
  /*
   * Final horizontal placement of the complete aligned
   * six-equation group.
   */
  /*
   * Final horizontal placement.
   */
  const RELATION_GROUP_X = 202;

  /*
   * Final upper geometry horizontal placement.
   */
  const GEOMETRY_EQUATIONS_X = -25;
  const GEOMETRY_TITLES_X = -42;
  const GEOMETRY_BUTTONS_X_UPPER = -98;

  /*
   * Final geometry-control placement.
   */
  const GENERAL_RELATION_X = 206;
  const GEOMETRY_BUTTON_HEIGHT = 24;

  /*
   * Final shared width for all 12 expand/collapse buttons.
   */
  const GEOMETRY_BUTTON_WIDTH = 61;

  /*
   * General relation and the five specific relations share
   * this same outer block, so their G terms have one exact
   * mathematical left edge.
   */
  const RELATION_BLOCK_WIDTH = 420;

  const GENERAL_G_VISIBLE_WIDTH = 14.9375;
  const GENERAL_G_RHS_GAP = 7.0625;

  const COMPACT_G_COLUMN_WIDTH =
    GENERAL_G_VISIBLE_WIDTH *
    COMPACT_RELATION_SCALE;

  const COMPACT_G_RHS_GAP =
    GENERAL_G_RHS_GAP *
    COMPACT_RELATION_SCALE;

  /*
   * ONE SHARED EQUALS-SIGN SPINE FOR ALL 12 EQUATIONS.
   *
   * Authority:
   *   G_0, G_1, G_2, G_3, G_4
   *
   * The compact G rows place "=" at the beginning of their
   * RHS column, after the rendered G width and G/RHS gap.
   */
  const SHARED_EQUALS_X =
    GEOMETRY_EQUATIONS_X +
    COMPACT_G_COLUMN_WIDTH +
    COMPACT_G_RHS_GAP;

  /*
   * Exact native visible X position of "=" inside
   * geometric_relation_equation.svg.
   *
   * Measured directly from the supplied SVG geometry.
   */
  const GENERAL_G_EQUALS_NATIVE_X = 22.015626256;

  const GENERAL_G_RELATION_X =
    SHARED_EQUALS_X -
    GENERAL_G_EQUALS_NATIVE_X *
      COMPACT_RELATION_SCALE;


  /*
   * Independent gap between the mathematical relation
   * and its physical-quantity label.
   */
  const RELATION_LABEL_GAP = 28;

  /*
   * Fixed expanded RHS column.
   *
   * This keeps the physical-quantity labels at one invariant
   * X position while the signed integer changes during the
   * cancellation animation.
   */
  const EXPANDED_RHS_COLUMN_WIDTH = 64;

  /*
   * Expanded relations remain split into two independently
   * authored SVGs:
   *
   *   [full geometry] [signed/cancelled RHS] [label]
   */
  const EXPANDED_RELATION_SCALE = 1.12;

  /*
   * Normalized Planck-boundary layout.
   *
   * The value column is right-anchored so expanding one row
   * grows leftward without moving its label or button.
   */
  /*
   * Normalized Planck-boundary row architecture:
   *
   *   [boundary symbol] [RHS] [label] [button]
   *
   * The RHS is left-anchored so the "=" embedded at the
   * beginning of every RHS SVG remains fixed through expansion.
   */
  const BOUNDARY_SYMBOL_COLUMN_WIDTH = 24;
  const BOUNDARY_SYMBOL_RHS_GAP = 10;
  const BOUNDARY_RHS_COLUMN_WIDTH = 270;

  /*
   * Fixed SI-unit column for normalized Planck boundaries.
   *
   * The mathematical RHS moves left on expansion while the
   * physical unit remains anchored.
   */
  const BOUNDARY_UNIT_COLUMN_WIDTH = 32;

  /*
   * TEMPORARY unit / expanded-end-position X tuner.
   *
   * This moves the fixed SI-unit symbols and the expanded
   * equations together. Collapsed equations remain locked
   * to the shared 12-equation equals-sign spine.
   */
  /*
   * Final unit / expanded-endpoint placement.
   */
  const BOUNDARY_UNIT_GROUP_X = 30;
  const BOUNDARY_UNIT_GROUP_Y = 0;

  /*
   * The fixed SI-unit geometry was finalized with this
   * lower-boundary group reference.
   */
  const BOUNDARY_EQUATION_GROUP_X = 23;

  /*
   * Exact native visible X position of "=" inside
   * boundary_relation_equation.svg.
   *
   * Measured directly from the supplied SVG geometry.
   */
  const GENERAL_B_EQUALS_NATIVE_X = 22.812505008;

  /*
   * Place the general B_k equation on the SAME equals spine.
   */
  const BOUNDARY_RELATION_X =
    SHARED_EQUALS_X -
    GENERAL_B_EQUALS_NATIVE_X *
      COMPACT_RELATION_SCALE;

  /*
   * Collapsed Planck equations:
   *
   * [boundary symbol][gap][RHS beginning with "="]
   *
   * Therefore the RHS origin is placed directly on the
   * shared equals-sign spine.
   */
  const BOUNDARY_COLLAPSED_EQUATIONS_X =
    SHARED_EQUALS_X -
    BOUNDARY_SYMBOL_COLUMN_WIDTH -
    BOUNDARY_SYMBOL_RHS_GAP;

  /*
   * Expanded Planck equations retain the exact absolute
   * position established before this alignment pass.
   *
   * Previously:
   *
   *   23 + (-233) = -210 px
   *
   * Keeping that value preserves the expanded equation/unit
   * geometry exactly.
   */
  const BOUNDARY_EXPANDED_EQUATIONS_X =
    BOUNDARY_EQUATION_GROUP_X - 233;

  /*
   * Exact shared button column.
   *
   * The lower five row buttons and lower master button align
   * to the same X position as the six controls above.
   */
  const UPPER_BUTTON_COLUMN_X =
    COMPACT_G_COLUMN_WIDTH +
    COMPACT_G_RHS_GAP +
    EXPANDED_RHS_COLUMN_WIDTH +
    RELATION_LABEL_GAP +
    150 +
    14 +
    GEOMETRY_BUTTONS_X_UPPER;

  const LOWER_BUTTON_COLUMN_X =
    BOUNDARY_SYMBOL_COLUMN_WIDTH +
    BOUNDARY_SYMBOL_RHS_GAP +
    BOUNDARY_RHS_COLUMN_WIDTH +
    BOUNDARY_UNIT_COLUMN_WIDTH +
    14;

  const BOUNDARY_BUTTONS_X =
    UPPER_BUTTON_COLUMN_X -
    LOWER_BUTTON_COLUMN_X;

  /*
   * Final normalized-boundary vertical layout.
   */
  const BOUNDARY_ROW_GAP = 0.50;
  const BOUNDARY_EXPANDED_RHS_Y = -2.75;
  // TEMPORARY: horizontal position of all five expanded equations.
  const boundaryExpandedGroupX = -12;

  // TEMPORARY: move only the three ellipsis dots.
  const boundaryEllipsisX = -1;

  const geometryRelationRows = [
    {
      key: 'time',
      label: 'time',
      compactGeoSrc: '/equations/G_0.svg',
      rhsSrc: '/equations/rhs_0.svg',

      signedGeoSrc:
        '/equations/G_0_expanded_signed.svg',
      signedRhsSrc:
        '/equations/rhs_0_expanded_signed.svg',

      cancelledGeoSrc:
        '/equations/G_0_expanded_cancelled.svg',
      cancelledRhsSrc:
        '/equations/rhs_0_expanded_cancelled.svg',
    },
    {
      key: 'length',
      label: 'length',
      compactGeoSrc: '/equations/G_1.svg',
      rhsSrc: '/equations/rhs_1.svg',

      signedGeoSrc:
        '/equations/G_1_expanded_signed.svg',
      signedRhsSrc:
        '/equations/rhs_1_expanded_signed.svg',

      cancelledGeoSrc:
        '/equations/G_1_expanded_cancelled.svg',
      cancelledRhsSrc:
        '/equations/rhs_1_expanded_cancelled.svg',
    },
    {
      key: 'charge',
      label: 'charge',
      compactGeoSrc: '/equations/G_2.svg',
      rhsSrc: '/equations/rhs_2.svg',

      signedGeoSrc:
        '/equations/G_2_expanded_signed.svg',
      signedRhsSrc:
        '/equations/rhs_2_expanded_signed.svg',

      cancelledGeoSrc:
        '/equations/G_2_expanded_cancelled.svg',
      cancelledRhsSrc:
        '/equations/rhs_2_expanded_cancelled.svg',
    },
    {
      key: 'temperature',
      label: 'temperature',
      compactGeoSrc: '/equations/G_3.svg',
      rhsSrc: '/equations/rhs_3.svg',

      signedGeoSrc:
        '/equations/G_3_expanded_signed.svg',
      signedRhsSrc:
        '/equations/rhs_3_expanded_signed.svg',

      /*
       * Temperature is already positive, so there is no
       * common minus sign to cancel. Stage 2 reuses stage 1.
       */
      cancelledGeoSrc:
        '/equations/G_3_expanded_signed.svg',
      cancelledRhsSrc:
        '/equations/rhs_3_expanded_signed.svg',
    },
    {
      key: 'mass',
      label: 'mass',
      compactGeoSrc: '/equations/G_4.svg',
      rhsSrc: '/equations/rhs_4.svg',

      signedGeoSrc:
        '/equations/G_4_expanded_signed.svg',
      signedRhsSrc:
        '/equations/rhs_4_expanded_signed.svg',

      cancelledGeoSrc:
        '/equations/G_4_expanded_cancelled.svg',
      cancelledRhsSrc:
        '/equations/rhs_4_expanded_cancelled.svg',
    },
  ];

  const boundaryRelationRows = [
    {
      key: 'time',
      label: 'time',
      symbolSrc: '/equations/planck_time.svg',
      symbolAlt: 't_p',
      symbolHeight: '16.5px',
      unitSrc: '/equations/second.svg',
      unitAlt: 's',
      expandedAnchorCorrectionX: 0,
      unitTranslateY: 0.13312528,
      rhsSrc: '/equations/boundary_rhs_0.svg',
      expandedRhsSrc:
        '/equations/boundary_rhs_0_expanded.svg',
      noTenSrc: '/equations/boundary_rhs_0_no10.svg',
      expandedNoTenSrc: '/equations/boundary_rhs_0_expanded_no10.svg',
      tenSrc: '/equations/boundary_rhs_0_ten.svg',
      symbolicCoreSrc: '/equations/boundary_rhs_0_symbolic_core_animated.svg',
      symbolicExponentSrc: '/equations/boundary_rhs_0_symbolic_exponent_animated.svg',
      digitsSrc: '/equations/boundary_rhs_0_digits_tuned.svg',
      ellipsisSrc: '/equations/boundary_rhs_0_ellipsis_tuned.svg',
      exponentSrc: '/equations/boundary_rhs_0_exponent_animated.svg',
      expandedSvgWidth: 211.2196,
      compactSvgWidth: 69.039192,
      compactSvgHeight: 14.695312,
      expandedSvgHeight: 12.882813,
      tenMoveX: 133.802810,
      tenMoveY: -0.127230,
    },
    {
      key: 'length',
      label: 'length',
      symbolSrc: '/equations/planck_length.svg',
      symbolAlt: 'l_p',
      symbolHeight: '16.5px',
      unitSrc: '/equations/meter.svg',
      unitAlt: 'm',
      expandedAnchorCorrectionX: 0.0875,
      unitTranslateY: 0.26401968,
      rhsSrc: '/equations/boundary_rhs_1.svg',
      expandedRhsSrc:
        '/equations/boundary_rhs_1_expanded.svg',
      noTenSrc: '/equations/boundary_rhs_1_no10.svg',
      expandedNoTenSrc: '/equations/boundary_rhs_1_expanded_no10.svg',
      tenSrc: '/equations/boundary_rhs_1_ten.svg',
      symbolicCoreSrc: '/equations/boundary_rhs_1_symbolic_core_animated.svg',
      symbolicExponentSrc: '/equations/boundary_rhs_1_symbolic_exponent_animated.svg',
      digitsSrc: '/equations/boundary_rhs_1_digits_tuned.svg',
      ellipsisSrc: '/equations/boundary_rhs_1_ellipsis_tuned.svg',
      exponentSrc: '/equations/boundary_rhs_1_exponent_animated.svg',
      expandedSvgWidth: 217.65723,
      compactSvgWidth: 68.679665,
      compactSvgHeight: 14.695312,
      expandedSvgHeight: 13.226562,
      tenMoveX: 134.162200,
      tenMoveY: 0.044333,
    },
    {
      key: 'charge',
      label: 'charge',
      symbolSrc: '/equations/planck_charge.svg',
      symbolAlt: 'q_p',
      symbolHeight: '13.5px',
      unitSrc: '/equations/coulomb.svg',
      unitAlt: 'C',
      expandedAnchorCorrectionX: -0.2275,
      unitTranslateY: -1.60812472,
      rhsSrc: '/equations/boundary_rhs_2.svg',
      expandedRhsSrc:
        '/equations/boundary_rhs_2_expanded.svg',
      noTenSrc: '/equations/boundary_rhs_2_no10.svg',
      expandedNoTenSrc: '/equations/boundary_rhs_2_expanded_no10.svg',
      tenSrc: '/equations/boundary_rhs_2_ten.svg',
      symbolicCoreSrc: '/equations/boundary_rhs_2_symbolic_core_animated.svg',
      symbolicExponentSrc: '/equations/boundary_rhs_2_symbolic_exponent_animated.svg',
      digitsSrc: '/equations/boundary_rhs_2_digits_tuned.svg',
      ellipsisSrc: '/equations/boundary_rhs_2_ellipsis_tuned.svg',
      exponentSrc: '/equations/boundary_rhs_2_exponent_animated.svg',
      expandedSvgWidth: 213.34482,
      compactSvgWidth: 69.039192,
      compactSvgHeight: 14.695312,
      expandedSvgHeight: 12.960938,
      tenMoveX: 133.802910,
      tenMoveY: -0.088167,
    },
    {
      key: 'temperature',
      label: 'temperature',
      symbolSrc: '/equations/planck_temperature.svg',
      symbolAlt: 'T_p',
      symbolHeight: '16px',
      unitSrc: '/equations/kelvin.svg',
      unitAlt: 'K',
      expandedAnchorCorrectionX: 8.9879,
      unitTranslateY: -1.60812472,
      rhsSrc: '/equations/boundary_rhs_3.svg',
      expandedRhsSrc:
        '/equations/boundary_rhs_3_expanded.svg',
      noTenSrc: '/equations/boundary_rhs_3_no10.svg',
      expandedNoTenSrc: '/equations/boundary_rhs_3_expanded_no10.svg',
      tenSrc: '/equations/boundary_rhs_3_ten.svg',
      symbolicCoreSrc: '/equations/boundary_rhs_3_symbolic_core_animated.svg',
      symbolicExponentSrc: '/equations/boundary_rhs_3_symbolic_exponent_animated.svg',
      digitsSrc: '/equations/boundary_rhs_3_digits_tuned.svg',
      ellipsisSrc: '/equations/boundary_rhs_3_ellipsis_tuned.svg',
      exponentSrc: '/equations/boundary_rhs_3_exponent_animated.svg',
      expandedSvgWidth: 206.17969,
      compactSvgWidth: 69.039192,
      compactSvgHeight: 14.695312,
      expandedSvgHeight: 12.960938,
      tenMoveX: 133.804490,
      tenMoveY: -0.088167,
    },
    {
      key: 'mass',
      label: 'mass',
      symbolSrc: '/equations/planck_mass.svg',
      symbolAlt: 'm_p',
      symbolHeight: '14.5px',
      unitSrc: '/equations/kilogram.svg',
      unitAlt: 'kg',
      expandedAnchorCorrectionX: 7.6050,
      unitTranslateY: -1.82686912,
      rhsSrc: '/equations/boundary_rhs_4.svg',
      expandedRhsSrc:
        '/equations/boundary_rhs_4_expanded.svg',
      noTenSrc: '/equations/boundary_rhs_4_no10.svg',
      expandedNoTenSrc: '/equations/boundary_rhs_4_expanded_no10.svg',
      tenSrc: '/equations/boundary_rhs_4_ten.svg',
      symbolicCoreSrc: '/equations/boundary_rhs_4_symbolic_core_animated.svg',
      symbolicExponentSrc: '/equations/boundary_rhs_4_symbolic_exponent_animated.svg',
      digitsSrc: '/equations/boundary_rhs_4_digits_tuned.svg',
      ellipsisSrc: '/equations/boundary_rhs_4_ellipsis_tuned.svg',
      exponentSrc: '/equations/boundary_rhs_4_exponent_animated.svg',
      expandedSvgWidth: 214.08551,
      compactSvgWidth: 69.039192,
      compactSvgHeight: 14.695312,
      expandedSvgHeight: 16.335938,
      tenMoveX: 133.804400,
      tenMoveY: -1.775667,
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
    width: "min(1750px, calc(100vw - var(--sidebar-width) - 4rem))",
    maxWidth: "none",
  }}
>
        <div className="legend-title">the Planck constants</div>

        <p className="equation-description">
          The Planck constants define the boundaries of the coherent bases of atomic logic.
          Below, the same five boundaries are shown through real and imaginary surface plots, phase plots, and their coherent closed-form definitions.
        </p>

        <div style={{ height: '1.2rem' }} />

        {/* -------------------------------------------------- */}
        {/* Surface plots header + controls                    */}
        {/* -------------------------------------------------- */}

        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '1320px',
            minHeight: '2rem',
            margin: '0 auto 0.45rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
          }}
        >
          <div
            style={{
              display: 'flex',
              width: '100%',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              fontSize: '0.82rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{
              display: 'flex', alignItems: 'center',
              gap: '0.4rem', flexWrap: 'wrap',
            }}>
            {/* 2D | 3D */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                color: 'rgba(242, 237, 224, 0.94)',
                padding: '0.12rem 0.28rem',
                border: '1px solid rgba(214, 207, 188, 0.48)',
                borderRadius: '8px',
                background: 'rgba(22, 22, 18, 0.36)',
                minWidth: '67px',
                boxSizing: 'border-box',
                justifyContent: 'center',
              }}
            >
              <span
                onClick={() => setIs3D(false)}
                style={{
                  cursor: is3D ? 'pointer' : 'default',
                  color: !is3D
                    ? 'rgba(255, 250, 236, 1)'
                    : 'rgba(242, 237, 224, 0.34)',
                  fontWeight: 400,
                  background: !is3D
                    ? 'rgba(232, 223, 200, 0)'
                    : 'transparent',
                  borderRadius: '5px',
                  padding: '0',
                  transition:
                    'background 160ms ease, color 160ms ease',
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
                  color: is3D
                    ? 'rgba(255, 250, 236, 1)'
                    : 'rgba(242, 237, 224, 0.34)',
                  fontWeight: 400,
                  background: is3D
                    ? 'rgba(232, 223, 200, 0)'
                    : 'transparent',
                  borderRadius: '5px',
                  padding: '0',
                  transition:
                    'background 160ms ease, color 160ms ease',
                  display: 'inline-block',
                }}
              >
                3D
              </span>
            </div>

            {/* Re | Im */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                color: 'rgba(242, 237, 224, 0.94)',
                padding: '0.12rem 0.28rem',
                border: '1px solid rgba(214, 207, 188, 0.48)',
                borderRadius: '8px',
                background: 'rgba(22, 22, 18, 0.36)',
                minWidth: '67px',
                boxSizing: 'border-box',
                justifyContent: 'center',
              }}
            >
              <span
                onClick={() => setIsReal(true)}
                style={{
                  cursor: !isReal ? 'pointer' : 'default',
                  color: isReal
                    ? 'rgba(255, 250, 236, 1)'
                    : 'rgba(242, 237, 224, 0.34)',
                  fontWeight: 400,
                  background: isReal
                    ? 'rgba(232, 223, 200, 0)'
                    : 'transparent',
                  borderRadius: '5px',
                  padding: '0',
                  transition:
                    'background 160ms ease, color 160ms ease',
                  display: 'inline-block',
                }}
              >
                Re
              </span>

              <span style={{ opacity: 0.6 }}>|</span>

              <span
                onClick={() => setIsReal(false)}
                style={{
                  cursor: isReal ? 'pointer' : 'default',
                  color: !isReal
                    ? 'rgba(255, 250, 236, 1)'
                    : 'rgba(242, 237, 224, 0.34)',
                  fontWeight: 400,
                  background: !isReal
                    ? 'rgba(232, 223, 200, 0)'
                    : 'transparent',
                  borderRadius: '5px',
                  padding: '0',
                  transition:
                    'background 160ms ease, color 160ms ease',
                  display: 'inline-block',
                }}
              >
                Im
              </span>
            </div>

            {/* Switch which surface row appears first. */}
            <div style={{
              display:'flex',
              alignItems:'center',
              gap:'0.35rem',
              padding:'0.12rem 0.45rem',
              border:'1px solid rgba(214,207,188,0.48)',
              borderRadius:8,
              background:'rgba(22,22,18,0.36)',
              width: surfaceArgumentWidth,
              boxSizing: 'border-box',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              {[
                [false,'z'],
                [true,'1/z'],
              ].map(([inverse,label],i)=>(
                <span key={label} style={{
                  display:'inline-flex',
                  gap:6,
                }}>
                  {i>0 && <span style={{opacity:0.5}}>|</span>}
                  <button
                    type="button"
                    onClick={() =>
                      setSurfaceFirstInverted(inverse)
                    }
                    aria-pressed={
                      surfaceFirstInverted===inverse
                    }
                    style={{
                      position: 'relative',
                      border: 0,
                      padding: 0,
                      font: 'inherit',
                      background: 'transparent',
                      borderRadius: 5,
                      cursor: 'pointer',
                      color:
                        surfaceFirstInverted === inverse
                          ? 'rgba(255, 250, 236, 1)'
                          : 'rgba(242, 237, 224, 0.34)',
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: label === 'z' ? 20 : 30,
                        height: 20,
                        borderRadius: 999,
                        border: 'none',
                        boxSizing: 'border-box',
                        pointerEvents: 'none',
                      }}
                    />
                    <span style={{
                      position: 'relative',
                      zIndex: 1,
                      pointerEvents: 'none',
                    }}>
                      {label}
                    </span>
                  </button>
                </span>
              ))}
            </div>



            </div>
            <div style={{
              display: 'flex', alignItems: 'center',
              gap: '0.4rem', flexWrap: 'wrap',
            }}>
            {/* Contours | Grid: shared surface overlay mode. */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                color: 'rgba(242, 237, 224, 0.94)',
                padding: '0.12rem 0.28rem',
                border: '1px solid rgba(214, 207, 188, 0.48)',
                borderRadius: '8px',
                background: 'rgba(22, 22, 18, 0.36)',
                boxSizing: 'border-box',
                justifyContent: 'center',
                width: surfaceControlWidths.contours,
                whiteSpace: 'nowrap',
              }}
            >
              {[
                ['contours', 'Contours'],
                ['grid', 'Grid'],
              ].map(([mode, label], index) => (
                <span
                  key={mode}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                  }}
                >
                  {index > 0 && (
                    <span style={{ opacity: 0.6 }}>|</span>
                  )}
                  <button
                    type="button"
                    onClick={() => setSurfaceLineMode(mode)}
                    aria-pressed={surfaceLineMode === mode}
                    style={{
                      cursor: surfaceLineMode === mode
                        ? 'default' : 'pointer',
                      color: surfaceLineMode === mode
                        ? 'rgba(255, 250, 236, 1)'
                        : 'rgba(242, 237, 224, 0.34)',
                      fontWeight: 400,
                      background: surfaceLineMode === mode
                        ? 'rgba(232, 223, 200, 0)'
                        : 'transparent',
                      border: 0,
                      borderRadius: '5px',
                      padding: 0,
                      font: 'inherit',
                      transition:
                        'background 160ms ease, color 160ms ease',
                    }}
                  >
                    {label}
                  </button>
                </span>
              ))}
            </div>

            <SurfaceAppearanceMenu
              id="surface-plots"
              colorWidth={surfaceControlWidths.color}
              directionWidth={lightingButtonWidth}
              lightOrbit={lightOrbit}
              toggleLightOrbit={toggleLightOrbit}
              changeOrbitSeconds={changeOrbitSeconds}
              orbitSeconds={orbitSeconds}
              resetLightOrbit={resetLightOrbit}
              stopLightOrbit={stopLightOrbit}
              appearance={
                surfaceFirstInverted
                  ? appearanceRight
                  : appearanceLeft
              }
              setAppearance={
                surfaceFirstInverted
                  ? setAppearanceRight
                  : setAppearanceLeft
              }
            />            </div>

          </div>
        </div>

        {/* Two aligned rows: five constants, four function states. */}
        <div style={{
          display:'grid',
          gap:'1rem',
          width:'100%',
          maxWidth:'1320px',
          margin:'0 auto 1.5rem',
        }}>
          {[surfaceFirstInverted].map(inverted=>{
            const appearance=
              inverted ? appearanceRight : appearanceLeft;

            return (
              <div key={inverted ? 'inverse-row' : 'direct-row'}>
                <div style={{
                  display:'grid',
                  position:'relative',
                  gridTemplateColumns:
                    'repeat(5, minmax(0, 1fr))',
                  gap:'clamp(0.45rem, 1.15vw, 1rem)',
                  alignItems:'start',
                }}>
                  <div style={{
                    position: 'absolute',
                    left: '-34px',
                    top: '50%',
                    writingMode: 'vertical-rl',
                    transform: 'translateY(-50%) rotate(180deg)',
                    whiteSpace: 'nowrap',
                    fontSize: '0.88rem',
                    color: 'rgba(255, 255, 255, 0.40)',
                  }}>Surface plots</div>
                  {constantKeys.map((key,index)=>(
                    <div
                      key={`${key}-${inverted}`}
                      style={{
                        minWidth:0,
                        textAlign:'center',
                      }}
                    >

                        <PlanckTimeSurface
                          orientationLink={thumbnailOrientationRef}
                          lineMode={surfaceLineMode}
                          is3D={is3D}
                          onOpen={view => {
                            const key =
                              `${index}-${isReal ? 're' : 'im'}-` +
                              `${surfaceFirstInverted ? 'inv' : 'z'}`;

                            const starter = PLANCK_SURFACE_SETTINGS[key];

                            // Open at the small graph's exact domain.
                            // Keep the calibrated slider endpoints.
                            setSurfaceWindowDrafts(previous => ({
                              ...previous,
                              [key]: {
                                ...previous[key],
                                domain: starter.domain,
                              },
                            }));
                            setSurfaceWindowRendered(previous => ({
                              ...previous,
                              [key]: {
                                ...previous[key],
                                domain: starter.domain,
                              },
                            }));
                            setExpandedSurface({ index, view });
                          }}
                          constantIndex={index}
                          inverted={inverted}
                          real={isReal}
                          scale={
                            PLANCK_SURFACE_SETTINGS[
                              `${index}-${isReal ? 're' : 'im'}-${inverted ? 'inv' : 'z'}`
                            ].domain
                          }
                          heightRange={
                            PLANCK_SURFACE_SETTINGS[
                              `${index}-${isReal ? 're' : 'im'}-${inverted ? 'inv' : 'z'}`
                            ].cutoff
                          }
                          displayScale={
                            PLANCK_SURFACE_SETTINGS[
                              `${index}-${isReal ? 're' : 'im'}-${inverted ? 'inv' : 'z'}`
                            ].size
                          }
                          ambientStrength={appearance.ambient}
                          lightStrength={appearance.lighting}
                          lightDirection={appearance.direction}
                          lightElevation={appearance.elevation}
                          lightOrbit={lightOrbit}
                          surfaceColor={appearance.color}
                        />


                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{
          display: 'grid',
          position: 'relative',
          gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
          gap: 'clamp(0.45rem, 1.15vw, 1rem)',
          width: '100%',
          maxWidth: '1320px',
          margin: '0 auto',
          alignItems: 'start',
          marginTop: '-9px',
        }}>
          <div style={{
            position: 'absolute',
            left: '-34px',
            top: '50%',
            writingMode: 'vertical-rl',
            transform: 'translateY(-50%) rotate(180deg)',
            whiteSpace: 'nowrap',
            fontSize: '0.88rem',
            color: 'rgba(255, 255, 255, 0.40)',
          }}>Phase plots</div>
          {PHASE_IDS.map((id, index) => (
            <div key={id} style={{ minWidth: 0, textAlign: 'center' }}>
              <PlanckPhaseSurface
                id={id}
                halfWidth={phaseZooms[phasePlotMode][index]}
                inverted={phasePlotMode === "inverted"}
                orientationLink={thumbnailOrientationRef}
                is3D={is3D}
                lightDirection={
                  (surfaceFirstInverted
                    ? appearanceRight
                    : appearanceLeft).direction
                }
                lightElevation={
                  (surfaceFirstInverted
                    ? appearanceRight
                    : appearanceLeft).elevation
                }
                lightOrbit={lightOrbit}
                onOpen={() => setExpandedPhase(index)}
              />

            </div>
          ))}
        </div>

        {/* One shared title row for the five paired columns. */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
          gap: 'clamp(0.45rem, 1.15vw, 1rem)',
          maxWidth: '1320px',
          width: '100%',
          margin: '0.4rem auto 0',
          textAlign: 'center',
          fontSize: 'clamp(0.75rem, 1.25vw, 1rem)',
        }}>
          {constants.map((name, index) => (
            <a
              key={name}
              href={constantLinks[index]}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'inherit', textDecoration: 'none' }}
            >
              {name}
            </a>
          ))}
        </div>

        <div style={{ height: '2.0rem' }} />

        <p
          className="equation-description"
          style={{
            fontSize: '1.15rem',
            textAlign: 'center',
            color: 'rgba(255, 255, 255, 0.40)',
            marginLeft: 0,
            textIndent: 0,
          }}
        >
          Closed-form encoding of the Planck boundaries
        </p>

        <div style={{ height: '1.5rem' }} />

        <p className="equation-description">
          Each Planck boundary is associated with a geometric factor{' '}
          <img
            src="/equations/G_k.svg"
            alt="G_k"
            style={inlineMathStyle}
          />{' '}
          that connects its continuous scalar coordinate{' '}
          <img
            src="/equations/phi_k.svg"
            alt="phi_k"
            style={inlineMathStyle}
          />{' '}
          to its discrete integer lattice value{' '}
          <img
            src="/equations/n_k.svg"
            alt="n_k"
            style={inlineMathNKStyle}
          />
          :
        </p>

        <div style={{ height: '1.3rem' }} />

        <div
          style={{
            position: 'relative',
            width: `${RELATION_BLOCK_WIDTH}px`,
            maxWidth: '100%',
            margin: '0 auto',
            transform:
              `translateX(${RELATION_GROUP_X}px)`,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-start',
              transform:
                `translateX(${GENERAL_G_RELATION_X}px)`,
            }}
          >
            <img
              src="/equations/geometric_relation_equation.svg"
              alt="G_k equals n_k divided by e to the phi_k"
              style={{
                width: 'auto',
                height: 'auto',
                display: 'block',
                transform:
                  `scale(${COMPACT_RELATION_SCALE})`,
                transformOrigin: 'left center',
              }}
            />
          </div>
        </div>

        <div style={{ height: '1.5rem' }} />

        <div
          style={{
            position: 'relative',
            width: '100%',
          }}
        >
          <p
            className="equation-description"
            style={{
              marginBottom: 0,
            }}
          >
            For the five Planck boundaries,
          </p>

          <div
            style={{
              position: 'absolute',

              /*
               * Align master control above the existing
               * five-button column.
               */
              left:
                `calc(50% + ${
                  (
                    -RELATION_BLOCK_WIDTH / 2 +
                    RELATION_GROUP_X +
                    COMPACT_G_COLUMN_WIDTH +
                    COMPACT_G_RHS_GAP +
                    EXPANDED_RHS_COLUMN_WIDTH +
                    RELATION_LABEL_GAP +
                    150 +
                    14 +
                    GEOMETRY_BUTTONS_X_UPPER
                  )
                }px)`,

              top: '50%',
              transform: 'translateY(-50%)',

              display: 'flex',
              justifyContent: 'flex-start',
              whiteSpace: 'nowrap',
            }}
          >
            <button
              type="button"
              onClick={() => {
                if (allGeometriesExpanded) {
                  collapseAllGeometries();
                } else {
                  expandAllGeometries();
                }
              }}
              aria-expanded={
                allGeometriesExpanded
              }
              style={{
                width:
                  `${GEOMETRY_BUTTON_WIDTH}px`,
                height:
                  `${GEOMETRY_BUTTON_HEIGHT}px`,
                boxSizing: 'border-box',
                fontFamily:
                  "'Times New Roman', Times, serif",
                fontSize: '0.82rem',
                color:
                  'rgba(242, 237, 224, 0.40)',
                border:
                  '1px solid rgba(214, 207, 188, 0.48)',
                borderRadius: '7px',
                background:
                  'rgba(22, 22, 18, 0.36)',
                padding: '0 0.5rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              all
            </button>
          </div>
        </div>

        <div style={{ height: '1.25rem' }} />

        <div
          className="planck-geometry-stack"
          style={{
            position: 'relative',
            width: `${RELATION_BLOCK_WIDTH}px`,
            maxWidth: '100%',
            margin: '0 auto',
            transform:
              `translateX(${RELATION_GROUP_X}px)`,
          }}
        >
          <div
            className="planck-geometry-stack-grid"
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              maxWidth: '100%',
              alignItems: 'stretch',
              gap: `${GEOMETRY_ROW_GAP}rem`,
              margin: 0,
              overflow: 'visible',
            }}
          >
            {geometryRelationRows.map((row) => {
              const stage =
                geometryExpansionStages[row.key];

              const isExpanded = stage > 0;

              return (
                <div
                  key={row.key}
                  className="planck-geometry-row"
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      `${COMPACT_G_COLUMN_WIDTH}px ` +
                      `${COMPACT_G_RHS_GAP}px ` +
                      `${EXPANDED_RHS_COLUMN_WIDTH}px ` +
                      `${RELATION_LABEL_GAP}px ` +
                      `150px 14px ${GEOMETRY_BUTTON_WIDTH}px`,
                    alignItems: 'center',
                    columnGap: 0,
                    width: '100%',
                    overflow: 'visible',
                  }}
                >
                  {isExpanded ? (
                    <>
                      {/* Full geometry.
                          Its RIGHT edge remains fixed. */}
                      <div
                        style={{
                          width:
                            `${COMPACT_G_COLUMN_WIDTH}px`,
                          display: 'flex',
                          justifyContent: 'flex-end',
                          alignItems: 'center',
                          overflow: 'visible',
                          transform:
                            `translateX(${GEOMETRY_EQUATIONS_X}px)`,
                        }}
                      >
                        <img
                          key={
                            `geo-${row.key}-${stage}`
                          }
                          src={
                            stage >= 2
                              ? row.cancelledGeoSrc
                              : row.signedGeoSrc
                          }
                          alt={
                            stage >= 2
                              ? `Sign-cancelled geometry for ${row.label}`
                              : `Signed geometry for ${row.label}`
                          }
                          style={{
                            width: 'auto',
                            height: 'auto',
                            maxWidth: 'none',
                            display: 'block',
                            flexShrink: 0,
                            transform:
                              `scale(${EXPANDED_RELATION_SCALE})`,
                            transformOrigin:
                              'right center',
                            transition:
                              'opacity 220ms ease',
                          }}
                        />
                      </div>

                      <div />

                      {/* Expanded RHS.
                          "=" is the first glyph and its left
                          edge remains invariant. */}
                      <div
                        style={{
                          width:
                            `${EXPANDED_RHS_COLUMN_WIDTH}px`,
                          display: 'flex',
                          justifyContent:
                            'flex-start',
                          alignItems: 'center',
                          overflow: 'visible',
                          transform:
                            `translateX(${GEOMETRY_EQUATIONS_X}px)`,
                        }}
                      >
                        <img
                          key={
                            `rhs-${row.key}-${stage}`
                          }
                          src={
                            stage >= 2
                              ? row.cancelledRhsSrc
                              : row.signedRhsSrc
                          }
                          alt={
                            stage >= 2
                              ? `Sign-cancelled right-hand relation for ${row.label}`
                              : `Signed right-hand relation for ${row.label}`
                          }
                          style={{
                            width: 'auto',
                            height: 'auto',
                            display: 'block',
                            flexShrink: 0,
                            transform:
                              `scale(${EXPANDED_RELATION_SCALE})`,
                            transformOrigin:
                              'left center',
                            transition:
                              'opacity 220ms ease',
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Compact G_i */}
                      <div
                        style={{
                          width:
                            `${COMPACT_G_COLUMN_WIDTH}px`,
                          display: 'flex',
                          justifyContent:
                            'flex-start',
                          alignItems: 'center',
                          transform:
                            `translateX(${GEOMETRY_EQUATIONS_X}px)`,
                        }}
                      >
                        <img
                          src={row.compactGeoSrc}
                          alt={`G for ${row.label}`}
                          style={{
                            width: 'auto',
                            height: 'auto',
                            display: 'block',
                            transform:
                              `scale(${COMPACT_RELATION_SCALE})`,
                            transformOrigin:
                              'left center',
                          }}
                        />
                      </div>

                      <div />

                      {/* Compact RHS */}
                      <div
                        style={{
                          width:
                            `${EXPANDED_RHS_COLUMN_WIDTH}px`,
                          display: 'flex',
                          justifyContent:
                            'flex-start',
                          alignItems: 'center',
                          overflow: 'visible',
                          transform:
                            `translateX(${GEOMETRY_EQUATIONS_X}px)`,
                        }}
                      >
                        <img
                          src={row.rhsSrc}
                          alt={
                            `Right-hand relation for ${row.label}`
                          }
                          style={{
                            width: 'auto',
                            height: 'auto',
                            display: 'block',
                            transform:
                              `scale(${COMPACT_RELATION_SCALE})`,
                            transformOrigin:
                              'left center',
                          }}
                        />
                      </div>
                    </>
                  )}

                  <div />

                  {/* Fixed physical-quantity label column */}
                  <div
                    style={{
                      width: '150px',
                      whiteSpace: 'nowrap',
                      textAlign: 'left',
                      justifySelf: 'start',
                      transform:
                        `translateX(${GEOMETRY_TITLES_X}px)`,
                    }}
                  >
                    {row.label}
                  </div>

                  <div />

                  {/* Independent row control */}
                  <button
                    type="button"
                    onClick={() =>
                      toggleGeometryRow(row.key)
                    }
                    aria-expanded={isExpanded}
                    style={{
                      width: `${GEOMETRY_BUTTON_WIDTH}px`,
                      height:
                        `${GEOMETRY_BUTTON_HEIGHT}px`,
                      boxSizing: 'border-box',
                      fontFamily:
                        "'Times New Roman', Times, serif",
                      fontSize: '0.82rem',
                      color:
                        'rgba(242, 237, 224, 0.40)',
                      border:
                        '1px solid rgba(214, 207, 188, 0.48)',
                      borderRadius: '7px',
                      background:
                        'rgba(22, 22, 18, 0.36)',
                      padding:
                        '0 0.5rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transform:
                        `translateX(${GEOMETRY_BUTTONS_X_UPPER}px)`,
                    }}
                  >
                    {isExpanded
                      ? 'collapse'
                      : 'expand'}
                  </button>
                </div>
              );
            })}

          </div>
        </div>

        {anyGeometryExpanded && (
          <>
            <div style={{ height: '2rem' }} />

            <p
              className="equation-description"
              style={{
                textIndent: 0,
                marginLeft: 0,
                paddingLeft: 0,
              }}
            >
              Where{' '}
              <img
                src="/equations/pi.svg"
                alt="pi"
                style={{
                  height: '8px',
                  width: 'auto',
                  display: 'inline-block',
                  position: 'relative',
                  top: '-0px',
                }}
              />{' '}
              ={' '}
              <a
                href="https://en.wikipedia.org/wiki/Pi"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'inherit',
                  textDecoration: 'none',
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.color =
                    'yellow')
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.color =
                    'inherit')
                }
              >
                Archimedes&apos; constant
              </a>
              ,{' '}
              <img
                src="/equations/sinh_x.svg"
                alt="sinh(x)"
                style={{
                  height: '15px',
                  width: 'auto',
                  display: 'inline-block',
                  position: 'relative',
                  top: '-2px',
                }}
              />{' '}
              ={' '}
              <a
                href="https://mathworld.wolfram.com/HyperbolicSine.html"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'inherit',
                  textDecoration: 'none',
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.color =
                    'yellow')
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.color =
                    'inherit')
                }
              >
                the hyperbolic sine function
              </a>
              ,{' '}
              <img
                src="/equations/euler_s_number.svg"
                alt="e"
                style={{
                  height: '8px',
                  width: 'auto',
                  display: 'inline-block',
                  position: 'relative',
                  top: '-0px',
                }}
              />{' '}
              ={' '}
              <a
                href="https://en.wikipedia.org/wiki/E_(mathematical_constant)"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'inherit',
                  textDecoration: 'none',
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.color =
                    'yellow')
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.color =
                    'inherit')
                }
              >
                Euler&apos;s number
              </a>
              ,{' '}
              <img
                src="/equations/w_we.svg"
                alt="W_We"
                style={{
                  height: '15px',
                  width: 'auto',
                  display: 'inline-block',
                  position: 'relative',
                  top: '-1px',
                }}
              />{' '}
              ={' '}
              <a
                href="https://mathworld.wolfram.com/WeierstrassConstant.html"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'inherit',
                  textDecoration: 'none',
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.color =
                    'yellow')
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.color =
                    'inherit')
                }
              >
                the Weierstrass constant
              </a>
              ,{' '}
              <img
                src="/equations/i.svg"
                alt="i"
                style={{
                  height: '11px',
                  width: 'auto',
                  display: 'inline-block',
                  position: 'relative',
                  top: '-1.5px',
                }}
              />{' '}
              ={' '}
              <a
                href="https://en.wikipedia.org/wiki/Imaginary_unit"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'inherit',
                  textDecoration: 'none',
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.color =
                    'yellow')
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.color =
                    'inherit')
                }
              >
                the imaginary unit
              </a>
              , and{' '}
              <img
                src="/equations/cos_x.svg"
                alt="cos(x)"
                style={{
                  height: '16px',
                  width: 'auto',
                  display: 'inline-block',
                  position: 'relative',
                  top: '-1.5px',
                }}
              />{' '}
              ={' '}
              <a
                href="https://mathworld.wolfram.com/Cosine.html"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'inherit',
                  textDecoration: 'none',
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.color =
                    'yellow')
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.color =
                    'inherit')
                }
              >
                the cosine function
              </a>
              .
            </p>
          </>
        )}

        <div style={{ height: '2.5rem' }} />

        <p
          className="equation-description"
          style={{
            textIndent: 0,
            marginLeft: 0,
            paddingLeft: 0,
          }}
        >
          Here k ∈ {'{ 0, 1, 2, 3, 4 }'},{' '}
          <img
            src="/equations/G_k.svg"
            alt="G_k"
            style={inlineMathStyle}
          />{' '}
          is the geometric factor supplied by the k<sup>th</sup> closed form,{' '}
          <img
            src="/equations/phi_k.svg"
            alt="phi_k"
            style={inlineMathStyle}
          />{' '}
          is its continuous scalar coordinate,{' '}
          <img
            src="/equations/e_phi_k.svg"
            alt="e to the phi_k"
            style={inlineMathEPhiKStyle}
          />{' '}
          is the exponential image of that scalar, and{' '}
          <img
            src="/equations/n_k.svg"
            alt="n_k"
            style={inlineMathNKStyle}
          />{' '}
          ∈ Z is the discrete integer lattice value selected by the relation.
        </p>

        <div style={{ height: '2.0rem' }} />

        <p className="equation-description">
          The same pair ({' '}
          <img
            src="/equations/phi_k.svg"
            alt="phi_k"
            style={inlineMathStyle}
          />
          ,{' '}
          <img
            src="/equations/n_k.svg"
            alt="n_k"
            style={inlineMathNKStyle}
          />
          {' '}) is then used to locate the normalized Planck boundary in
          decimal scale. The continuous scalar{' '}
          <img
            src="/equations/phi_k.svg"
            alt="phi_k"
            style={inlineMathStyle}
          />{' '}
          becomes the significand, while the signed integer{' '}
          <img
            src="/equations/n_k.svg"
            alt="n_k"
            style={inlineMathNKStyle}
          />{' '}
          becomes the decimal exponent:
        </p>

        <div style={{ height: '2.0rem' }} />

        {/* General normalized-boundary relation */}
        <div
          style={{
            position: 'relative',
            width: `${RELATION_BLOCK_WIDTH}px`,
            maxWidth: '100%',
            margin: '0 auto',
            transform:
              `translateX(${RELATION_GROUP_X}px)`,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-start',
              transform:
                `translateX(${BOUNDARY_RELATION_X}px)`,
            }}
          >
            <img
              src="/equations/boundary_relation_equation.svg"
              alt="B_k equals phi_k times ten to the n_k times u_k"
              style={{
                width: 'auto',
                height: 'auto',
                display: 'block',
                transform:
                  `scale(${COMPACT_RELATION_SCALE})`,
                transformOrigin: 'left center',
              }}
            />
          </div>
        </div>

        <div style={{ height: '2.0rem' }} />

        <p
          className="equation-description"
          style={{
            textIndent: 0,
            marginLeft: 0,
            paddingLeft: 0,
          }}
        >
          Here{' '}
          <img
            src="/equations/B_k.svg"
            alt="B_k"
            style={inlineMathStyle}
          />{' '}
          is the k<sup>th</sup> Planck boundary and{' '}
          <img
            src="/equations/u_k.svg"
            alt="u_k"
            style={inlineMathUKStyle}
          />{' '}
          is the coherent base unit of the corresponding
          physical quantity. Thus, for the five Planck boundaries,
        </p>

        <div style={{ height: '2.00rem' }} />

        {/* Five normalized Planck boundaries */}
        <div
          className="planck-boundary-stack"
          style={{
            position: 'relative',
            width: `${RELATION_BLOCK_WIDTH}px`,
            maxWidth: '100%',
            margin: '0 auto',
            transform:
              `translateX(${RELATION_GROUP_X}px)`,
          }}
        >
          <div
            className="planck-boundary-stack-grid"
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              maxWidth: '100%',
              alignItems: 'stretch',
              gap: `${BOUNDARY_ROW_GAP}rem`,
              margin: 0,
              overflow: 'visible',
            }}
          >
            {boundaryRelationRows.map((row) => {
              const stage =
                boundaryExpansionStates[row.key];

              const isExpanded = stage > 0;
              const showExpandedEquation = stage >= 2;
              const digitCount = boundaryDigitCounts[row.key];
              const stops = BOUNDARY_DIGIT_STOPS[
                BOUNDARY_KEYS.indexOf(row.key)
              ];
              const digitClip = row.expandedSvgWidth - (
                digitCount >= stops.length - 1
                  ? stops[stops.length - 1] + 10
                  : stops[Math.min(digitCount, stops.length - 1)]
              );

              return (
                <div
                  key={row.key}
                  className="planck-boundary-row"
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      `${BOUNDARY_SYMBOL_COLUMN_WIDTH}px ` +
                      `${BOUNDARY_SYMBOL_RHS_GAP}px ` +
                      `${BOUNDARY_RHS_COLUMN_WIDTH}px ` +
                      `${BOUNDARY_UNIT_COLUMN_WIDTH}px ` +
                      `14px ${GEOMETRY_BUTTON_WIDTH}px`,
                    alignItems: 'center',
                    columnGap: 0,
                    width: '100%',
                    overflow: 'visible',
                  }}
                >
                  {/* Fixed Planck-boundary symbol */}
                  <div
                    style={{
                      width:
                        `${BOUNDARY_SYMBOL_COLUMN_WIDTH}px`,
                      display: 'flex',
                      justifyContent: 'flex-end',
                      alignItems: 'center',
                      overflow: 'visible',
                      transform:
                        `translateX(${
                          isExpanded
                            ? (
                                BOUNDARY_EXPANDED_EQUATIONS_X +
                                row.expandedAnchorCorrectionX +
                                BOUNDARY_UNIT_GROUP_X +
                                boundaryExpandedGroupX
                              )
                            : BOUNDARY_COLLAPSED_EQUATIONS_X
                        }px)`,
                      transition:
                        `transform ${BOUNDARY_SYMBOL_TRAVEL_MS}ms ease`,
                    }}
                  >
                    <img
                      src={row.symbolSrc}
                      alt={row.symbolAlt}
                      style={{
                        height: row.symbolHeight,
                        width: 'auto',
                        maxWidth: 'none',
                        display: 'block',
                        flexShrink: 0,
                      }}
                    />
                  </div>

                  <div />

                  {/* Symbolic / numeric RHS.
                      "=" is the first glyph in every SVG,
                      so its left edge remains fixed. */}
                  <div
                    style={{
                      width:
                        `${BOUNDARY_RHS_COLUMN_WIDTH}px`,
                      display: 'flex',
                      justifyContent: 'flex-start',
                      alignItems: 'center',
                      overflow: 'visible',
                      transform:
                        `translateX(${
                          isExpanded
                            ? (
                                BOUNDARY_EXPANDED_EQUATIONS_X +
                                row.expandedAnchorCorrectionX +
                                BOUNDARY_UNIT_GROUP_X +
                                boundaryExpandedGroupX
                              )
                            : BOUNDARY_COLLAPSED_EQUATIONS_X
                        }px)`,
                      transition:
                        `transform ${BOUNDARY_SYMBOL_TRAVEL_MS}ms ease`,
                    }}
                  >
                    <div
                      style={{
                        position: 'relative',
                        width: `${row.compactSvgWidth}px`,
                        height: `${row.compactSvgHeight}px`,
                        flexShrink: 0,
                        transform: `scale(${COMPACT_RELATION_SCALE})`,
                        transformOrigin: 'left center',
                      }}
                    >
                      <img
                        src={row.symbolicCoreSrc}
                        alt={`Symbolic ${row.label} equation`}
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: '50%',
                          width: 'auto',
                          height: 'auto',
                          maxWidth: 'none',
                          transform: 'translateY(-50%)',
                          opacity: showExpandedEquation ? 0 : 1,
                          transition: 'opacity 80ms ease',
                          pointerEvents: 'none',
                        }}
                      />

                      {/* Persistent equals sign: remains visible
                          when the symbolic phi_k fades away. */}
                      <img
                        src={row.symbolicCoreSrc}
                        alt=""
                        aria-hidden="true"
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: '50%',
                          width: 'auto',
                          height: 'auto',
                          maxWidth: 'none',
                          transform: 'translateY(-50%)',
                          clipPath: 'inset(0 calc(100% - 16px) 0 0)',
                          pointerEvents: 'none',
                        }}
                      />

                      <img
                        src={row.digitsSrc}
                        alt={`Numerical ${row.label} equation`}
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: `calc(50% + ${BOUNDARY_EXPANDED_RHS_Y / COMPACT_RELATION_SCALE}px)`,
                          width: 'auto',
                          height: 'auto',
                          maxWidth: 'none',
                          transform: 'translateY(-50%)',
                          opacity: stage >= 2 ? 1 : 0,
                          clipPath: `inset(0 ${Math.max(0, digitClip)}px 0 0)`,
                          transition: 'opacity 80ms ease',
                          pointerEvents: 'none',
                        }}
                      />

                      {/* Independently positioned SVG ellipsis. */}
                      <img
                        src={row.ellipsisSrc}
                        alt=""
                        aria-hidden="true"
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: `calc(50% + ${BOUNDARY_EXPANDED_RHS_Y / COMPACT_RELATION_SCALE}px)`,
                          width: 'auto',
                          height: 'auto',
                          maxWidth: 'none',
                          transform: `translate(${boundaryEllipsisX}px, -50%)`,
                          opacity:
                            stage >= 2 &&
                            digitCount >= stops.length - 1
                              ? 1 : 0,
                          pointerEvents: 'none',
                        }}
                      />

                      {/* Symbolic exponent remains until 2 seconds. */}
                      <img
                        src={row.symbolicExponentSrc}
                        alt=""
                        aria-hidden="true"
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: '50%',
                          width: 'auto',
                          height: 'auto',
                          maxWidth: 'none',
                          transform: `translate(${isExpanded ? row.tenMoveX : 0}px, calc(-50% + ${isExpanded ? row.tenMoveY : 0}px))`,
                          opacity: stage < 3 ? 1 : 0,
                          transition: `opacity 80ms ease, transform ${BOUNDARY_SYMBOL_TRAVEL_MS}ms ease`,
                          pointerEvents: 'none',
                        }}
                      />

                      {/* Numerical exponent is revealed last. */}
                      <img
                        src={row.exponentSrc}
                        alt=""
                        aria-hidden="true"
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: `calc(50% + ${BOUNDARY_EXPANDED_RHS_Y / COMPACT_RELATION_SCALE}px)`,
                          width: 'auto',
                          height: 'auto',
                          maxWidth: 'none',
                          transform: 'translate(10px, -50%)',
                          opacity: stage >= 3 ? 1 : 0,
                          transition: 'opacity 100ms ease',
                          pointerEvents: 'none',
                        }}
                      />

                      <img
                        src={row.tenSrc}
                        alt=""
                        aria-hidden="true"
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: '50%',
                          width: 'auto',
                          height: 'auto',
                          maxWidth: 'none',
                          transform: `translate(${isExpanded ? row.tenMoveX : 0}px, calc(-50% + ${isExpanded ? row.tenMoveY : 0}px))`,
                          transition: `transform ${BOUNDARY_SYMBOL_TRAVEL_MS}ms ease`,
                          pointerEvents: 'none',
                        }}
                      />
                    </div>
                  </div>

                  {/* Fixed coherent SI unit.
                      This does NOT receive the equation X translation,
                      so it remains stationary during expansion. */}
                  <div
                    style={{
                      width:
                        `${BOUNDARY_UNIT_COLUMN_WIDTH}px`,
                      display: 'flex',
                      justifyContent: 'flex-start',
                      alignItems: 'center',
                      overflow: 'visible',
                      transform:
                        `translateX(${
                          BOUNDARY_EQUATION_GROUP_X -
                          273.3115 +
                          BOUNDARY_UNIT_GROUP_X
                        }px) translateY(${
                          row.unitTranslateY +
                          BOUNDARY_UNIT_GROUP_Y
                        }px)`,
                    }}
                  >
                    <img
                      src={row.unitSrc}
                      alt={row.unitAlt}
                      style={{
                        width: 'auto',
                        height: 'auto',
                        maxWidth: 'none',
                        display: 'block',
                        flexShrink: 0,
                        transform:
                          `scale(${COMPACT_RELATION_SCALE})`,
                        transformOrigin:
                          'left center',
                      }}
                    />
                  </div>

                  <div />

                  {/* Independent boundary control */}
                  <button
                    type="button"
                    onClick={() =>
                      toggleBoundaryRow(row.key)
                    }
                    aria-expanded={isExpanded}
                    style={{
                      width:
                        `${GEOMETRY_BUTTON_WIDTH}px`,
                      height:
                        `${GEOMETRY_BUTTON_HEIGHT}px`,
                      boxSizing: 'border-box',
                      fontFamily:
                        "'Times New Roman', Times, serif",
                      fontSize: '0.82rem',
                      color:
                        'rgba(242, 237, 224, 0.40)',
                      border:
                        '1px solid rgba(214, 207, 188, 0.48)',
                      borderRadius: '7px',
                      background:
                        'rgba(22, 22, 18, 0.36)',
                      padding: '0 0.5rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transform:
                        `translateX(${BOUNDARY_BUTTONS_X}px) translateY(${BOUNDARY_EXPANDED_RHS_Y}px)`,
                    }}
                  >
                    {isExpanded
                      ? 'collapse'
                      : 'expand'}
                  </button>
                </div>
              );
            })}

            {/* Master boundary control */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: `${GEOMETRY_BUTTON_HEIGHT}px`,
                marginTop: '0.15rem',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  if (allBoundariesExpanded) {
                    collapseAllBoundaries();
                  } else {
                    expandAllBoundaries();
                  }
                }}
                aria-expanded={
                  allBoundariesExpanded
                }
                style={{
                  position: 'absolute',
                  left:
                    `${
                      LOWER_BUTTON_COLUMN_X +
                      BOUNDARY_BUTTONS_X
                    }px`,
                  top: 0,
                  width:
                    `${GEOMETRY_BUTTON_WIDTH}px`,
                  height:
                    `${GEOMETRY_BUTTON_HEIGHT}px`,
                  boxSizing: 'border-box',
                  fontFamily:
                    "'Times New Roman', Times, serif",
                  fontSize: '0.82rem',
                  color:
                    'rgba(242, 237, 224, 0.40)',
                  border:
                    '1px solid rgba(214, 207, 188, 0.48)',
                  borderRadius: '7px',
                  background:
                    'rgba(22, 22, 18, 0.36)',
                  padding: '0 0.5rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                all
              </button>
            </div>
          </div>
        </div>

        <div style={{ height: '2.0rem' }} />

        <p className="equation-description">
          Together, these relations present the same five Planck boundaries
          in three complementary forms: as real
          and imaginary surfaces, as complex phase structure, and as exact closed-form coordinates. The
          geometric factors{' '}
          <img
            src="/equations/G_k.svg"
            alt="G_k"
            style={inlineMathStyle}
          />{' '}
          connect the continuous scalars{' '}
          <img
            src="/equations/phi_k.svg"
            alt="phi_k"
            style={inlineMathStyle}
          />{' '}
          to the discrete lattice values{' '}
          <img
            src="/equations/n_k.svg"
            alt="n_k"
            style={inlineMathNKStyle}
          />
          , while the same ({' '}
          <img
            src="/equations/phi_k.svg"
            alt="phi_k"
            style={inlineMathStyle}
          />
          ,{' '}
          <img
            src="/equations/n_k.svg"
            alt="n_k"
            style={inlineMathNKStyle}
          />
          {' '}) pairs locate the corresponding Planck boundaries on their
          physical decimal scales. In this way, the geometric and numerical
          descriptions are two representations of the same boundary
          structure.
        </p>

        <div style={{ height: '2rem' }} />
      </div>


      {/*
       * G₀–G₄ Complex Geometry
       *
       * Embedded below the Planck constants article.
       * Same explorer as /g-functions, without an iframe
       * or a second LayoutWrapper.
       */}
      <section
        ref={gExplorerHostRef}
        id="g-functions-explorer"
        aria-label="G₀–G₄ Complex Geometry explorer"
        style={{
          position: 'relative',
          width: '100%',
          height: 'calc(100vh + 300px)',
          minHeight: '100vh',
        }}
      >
        <div
          style={{
            position: 'sticky',
            top: 0,
            height: '100vh',
            left: `${gExplorerFrame.left}px`,
            width: `${gExplorerFrame.width}px`,
            maxWidth: 'none',
            minWidth: 0,
            boxSizing: 'border-box',
            overflow: 'hidden',
            visibility: gExplorerFrame.ready
              ? 'visible'
              : 'hidden',
          }}
        >
          <GFunctionsExplorer />
        </div>
      </section>


      {expandedSurface !== null && (() => {
        const index = expandedSurface.index;
        const key = currentSurfaceWindowKey;

        const draft = surfaceWindowDrafts[key];
        const rendered = surfaceWindowRendered[key];
        // Use the calibrated minimum and maximum as the
        // actual slider endpoints. The saved domain is the
        // initial thumb position, not the upper limit.
        const bounds = surfaceDomainBounds[key];

        const baseline = PLANCK_SURFACE_SETTINGS[key];

        const appearance = surfaceFirstInverted
          ? appearanceRight : appearanceLeft;

        // Keep the previously chosen full-screen framing.
        const expandedDisplayScale = baseline.size * 0.82;

        // Logarithmic domain slider, bounded independently
        // for each of the twenty function configurations.
        const position = Math.max(0, Math.min(1,
          (Math.log(draft.domain) - Math.log(bounds.min)) /
          (Math.log(bounds.max) - Math.log(bounds.min))
        ));

        return (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${constants[index]} surface viewer`}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 10020,
              background: FULLSCREEN_DIMMED_BACKDROP
                ? 'rgba(16,19,24,0.82)'
                : '#101318',
            }}
          >
            <PlanckTimeSurface
              key={`expanded-${index}-${isReal}-${surfaceFirstInverted}`}
              constantIndex={index}
              is3D={true}
              fullscreen
              initialOverhead={!is3D}
              transparentBackground={FULLSCREEN_DIMMED_BACKDROP}
              lineMode={surfaceLineMode}
              initialView={
                is3D
                  ? expandedSurface.view
                  : {
                      position: [0, 10.9, 0.0001],
                      up: [0, 0, -1],
                    }
              }
              inverted={surfaceFirstInverted}
              real={isReal}
              scale={rendered.domain}
              heightRange={baseline.cutoff}
              displayScale={expandedDisplayScale}
              ambientStrength={appearance.ambient}
              lightStrength={appearance.lighting}
              lightDirection={appearance.direction}
                          lightElevation={appearance.elevation}
                          lightOrbit={lightOrbit}
              surfaceColor={appearance.color}
            />

            {/* Mathematical domain slider, bottom right. */}
            <div style={{
              position: 'absolute',
              bottom: 12,
              right: 12,
              zIndex: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <div style={{
                width: 185,
                height: 30,
                boxSizing: 'border-box',
                padding: '0 8px',
                display: 'flex',
                alignItems: 'center',
                borderRadius: 7,
                background: 'rgba(0,0,0,0.65)',
              }}>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.0005"
                  value={position}
                  onChange={event => {
                    setSurfaceDomainPlaying(false);
                    const p = Number(event.target.value);
                    surfacePlaybackRef.current = {
                      key,
                      position: p,
                      direction: p >= 1 ? -1 : 1,
                    };
                    const domain = Math.exp(
                      Math.log(bounds.min) +
                      p * (Math.log(bounds.max) -
                           Math.log(bounds.min))
                    );
                    updateSurfaceWindow(key, 'domain', domain);
                  }}
                  aria-label="Mathematical domain range"
                  style={{
                    width: '100%',
                    accentColor: '#75c7ff',
                    cursor: 'pointer',
                  }}
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!surfaceDomainPlaying) {
                    const current = surfaceWindowDrafts[key].domain;
                    const logSpan =
                      Math.log(bounds.max) - Math.log(bounds.min);

                    const position = logSpan > 0
                      ? Math.max(0, Math.min(1,
                          (Math.log(current) - Math.log(bounds.min))
                            / logSpan
                        ))
                      : 0;

                    const previous = surfacePlaybackRef.current;

                    surfacePlaybackRef.current = {
                      key,
                      position,
                      direction: previous.key === key
                        ? previous.direction
                        : 1,
                    };

                    // At the maximum, begin moving inward.
                    if (position >= 1) {
                      surfacePlaybackRef.current.direction = -1;
                    }
                    if (position <= 0) {
                      surfacePlaybackRef.current.direction = 1;
                    }
                  }

                  setSurfaceDomainPlaying(playing => !playing);
                }}
                aria-label={
                  surfaceDomainPlaying
                    ? "Pause domain sweep"
                    : "Play domain sweep"
                }
                title={
                  surfaceDomainPlaying
                    ? "Pause"
                    : "Play mathematical-domain sweep"
                }
                style={{
                  width: 32,
                  height: 30,
                  padding: 0,
                  color: '#fff',
                  background: 'rgba(0,0,0,0.7)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: 6,
                  fontSize: 15,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {surfaceDomainPlaying ? 'Ⅱ' : '▶'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setSurfaceDomainPlaying(false);
                  setExpandedSurface(null);
                }}
                style={{
                  padding: '7px 11px',
                  color: '#fff',
                  background: 'rgba(0,0,0,0.7)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: 6,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Close ×
              </button>
            </div>
          </div>
        );
      })()}

      {expandedPhase !== null && (
        <div
          onClick={() => setExpandedPhase(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10010,
            background: 'rgba(0,0,0,0.92)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
          }}
        >
          <div
            onClick={event => event.stopPropagation()}
            style={{
              width: '100vw',
              height: '100dvh',
              overflow: 'hidden',
              textAlign: 'center',
            }}
          >
{(
              <PlanckPhaseFullscreen
                key={`3d-${phasePlotMode}-${expandedPhase}`}
                id={PHASE_IDS[expandedPhase]}
                initialHalfWidth={phaseZooms[phasePlotMode][expandedPhase]}
                inverted={phasePlotMode === "inverted"}
                zoomLimits={phaseZoomLimits[phasePlotMode][expandedPhase]}
                initialOrientation={
                  is3D ? thumbnailOrientationRef.current : null
                }
                initialOverhead={!is3D}
                lightDirection={
                  (surfaceFirstInverted
                    ? appearanceRight
                    : appearanceLeft).direction
                }
                lightElevation={
                  (surfaceFirstInverted
                    ? appearanceRight
                    : appearanceLeft).elevation
                }
                lightOrbit={lightOrbit}
                onClose={() => setExpandedPhase(null)}
              />
            )}
          </div>
        </div>
      )}

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
      <video
        src={`/videos/${modalVideo}`}
        controls
        autoPlay
        playsInline
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  </div>
)}




    </LayoutWrapper>
  );
}
