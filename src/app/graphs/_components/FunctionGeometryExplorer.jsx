'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from '@/app/closed-forms/_components/explorer-layout.module.css';
import { compileComplexFunction } from '@/lib/complex-function-geometry';
import { normalizeMathFunction } from '@/lib/math-function-input-parser';
import MathFunctionInput, {
  MathVariableLabel
} from './MathFunctionInput';
import FunctionGeometryViewer from './FunctionGeometryViewer';

// Identical hue conversion and fixed saturation to Planck surface controls.
const PLANCK_COLOR = '#FFAC0A';
const VIEW_IDS = ['surface', 'phase', 'surface2', 'magnitude'];
function hueFromHex(hex) {
  const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(...rgb), min = Math.min(...rgb), d = max - min;
  if (!d) return 0;
  let h;
  if (max === rgb[0]) h = ((rgb[1] - rgb[2]) / d + 6) % 6;
  else if (max === rgb[1]) h = (rgb[2] - rgb[0]) / d + 2;
  else h = (rgb[0] - rgb[1]) / d + 4;
  return 60 * h;
}
function planckHueColor(hue) {
  const saturation = 1 - 10 / 255;
  const k = n => (n + hue / 60) % 6;
  const channel = n => 1 - saturation * Math.max(0, Math.min(k(n), 4 - k(n), 1));
  return '#' + [5, 3, 1].map(n =>
    Math.round(channel(n) * 255).toString(16).padStart(2, '0')
  ).join('').toUpperCase();
}

function LightingRange({
  label, min, max, value, onChange, ticks, trackOffset = 0
}) {
  const progress = 100 * (value - min) / (max - min);
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '75px minmax(0, 1fr)',
      alignItems: 'center', gap: 8, marginBottom: 7, fontSize: 12
    }}>
      <span>{label}</span>
      <div style={{
        minWidth: 0,
        position: 'relative',
        top: trackOffset
      }}>
        <input type="range" min={min} max={max} step="1"
          aria-label={label} value={value} onChange={onChange}
          className="graph-lighting-range"
          style={{ width: '100%', margin: 0, display: 'block',
            '--progress': `${progress}%` }} />
        <div style={{ display: 'flex', justifyContent: 'space-between',
          fontSize: 10, opacity: 0.85, marginTop: 2 }}>
          {ticks.map((tick, i) => <span key={i}>{tick}</span>)}
        </div>
      </div>
    </div>
  );
}


// One-line settings control with numerical readout.
function SettingsSliderRow({
  label, displayValue, value, min, max, step, onChange,
  labelWidth = 112
}) {
  return (
    <label style={{
      display: 'grid',
      gridTemplateColumns: `${labelWidth}px minmax(0, 1fr)`,
      alignItems: 'center',
      gap: 8,
      marginTop: 9,
      fontSize: 12
    }}>
      <span style={{ whiteSpace: 'nowrap' }}>
        {label} {displayValue}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        aria-label={label}
        aria-valuetext={String(displayValue)}
        className="graph-lighting-range"
        style={{
          display: 'block',
          width: '100%',
          margin: 0,
          '--progress': `${100 * (value - min) / (max - min)}%`
        }}
      />
    </label>
  );
}


// Two independently adjustable endpoints on a logarithmic
// scale extending from 0.001x to 1000x.
//
// Both native range inputs occupy the same track.
// Each thumb remains independently draggable and keyboard
// accessible. The left limit cannot exceed 1x; the right
// limit cannot fall below 1x.
const formatScaleLimit = value =>
  Number(value.toPrecision(5)).toString();

const scaleLimitPercent = value =>
  100 * (Math.log10(value) + 3) / 6;

function ScaleLimitsRange({
  minScale,
  maxScale,
  onMinChange,
  onMaxChange
}) {
  const left = scaleLimitPercent(minScale);
  const right = scaleLimitPercent(maxScale);

  const trackBackground = `linear-gradient(to right,
    #b5b0a7 0%,
    #b5b0a7 ${left}%,
    #1676ed ${left}%,
    #1676ed ${right}%,
    #b5b0a7 ${right}%,
    #b5b0a7 100%)`;

  return (
    <div style={{
      marginTop: 17,
      paddingTop: 12,
      borderTop: '1px solid #52657e'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 8,
        marginBottom: 8
      }}>
        <strong style={{ fontSize: 12 }}>
          Scale limits
        </strong>

        <span style={{
          fontSize: 12,
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap'
        }}>
          {formatScaleLimit(minScale)}× – {formatScaleLimit(maxScale)}×
        </span>
      </div>

      <div style={{
        position: 'relative',
        height: 26,
        width: '100%'
      }}>
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 7,
            right: 7,
            top: 12,
            height: 3,
            borderRadius: 999,
            background: trackBackground
          }}
        />

        <input
          type="range"
          min="-3"
          max="3"
          step="0.001"
          value={Math.log10(minScale)}
          onChange={event => {
            const exponent = Math.min(
              0, Number(event.target.value)
            );

            onMinChange(Math.pow(10, exponent));
          }}
          aria-label="Minimum display scale"
          aria-valuetext={`${formatScaleLimit(minScale)} times`}
          className="graph-scale-limit-input"
          style={{ zIndex: minScale >= 1 ? 3 : 2 }}
        />

        <input
          type="range"
          min="-3"
          max="3"
          step="0.001"
          value={Math.log10(maxScale)}
          onChange={event => {
            const exponent = Math.max(
              0, Number(event.target.value)
            );

            onMaxChange(Math.pow(10, exponent));
          }}
          aria-label="Maximum display scale"
          aria-valuetext={`${formatScaleLimit(maxScale)} times`}
          className="graph-scale-limit-input"
          style={{ zIndex: 2 }}
        />
      </div>

      <div style={{
        position: 'relative',
        height: 15,
        margin: '0 7px',
        fontSize: 10,
        opacity: 0.85,
        fontVariantNumeric: 'tabular-nums'
      }}>
        {[0.001, 0.01, 0.1, 1, 10, 100, 1000].map(
          (tick, index) => (
            <span
              key={tick}
              style={{
                position: 'absolute',
                left: `${index * 100 / 6}%`,
                transform: 'translateX(-50%)',
                whiteSpace: 'nowrap'
              }}
            >
              {tick}
            </span>
          )
        )}
      </div>
    </div>
  );
}

// Logarithmic slider mapping for positive ranges.
const logPosition = (value, min, max) =>
  Math.log(value / min) / Math.log(max / min);

const logValue = (position, min, max) =>
  Number(
    (min * Math.pow(max / min, position)).toPrecision(4)
  );

const control = {
  background: '#0d1420', color: '#eff4fb',
  border: '1px solid #54677f', borderRadius: 7,
  padding: '8px 10px', fontFamily: "'Times New Roman', Times, serif"
};
const tab = (active) => ({
  ...control,
  cursor: 'pointer',
  background: active
    ? 'linear-gradient(155deg, rgba(205,225,246,0.25) 0%, rgba(91,115,145,0.13) 42%, rgba(12,19,30,0.92) 100%)'
    : '#0d1420',
  borderColor: active ? '#a6c8ed' : '#465a70',
  boxShadow: active
    ? 'inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(120,155,190,0.12), 0 0 7px rgba(155,195,235,0.12)'
    : 'none',
  color: active ? '#ffffff' : '#eff4fb',
  fontWeight: active ? 700 : 400,
  padding: '7px 13px'
});

const settingsActionButton = {
  ...tab(false),
  boxSizing: 'border-box',
  height: 32,
  minHeight: 32,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0 9px',
  fontSize: 12,
  lineHeight: 1,
  borderRadius: 6,
  whiteSpace: 'nowrap'
};

export default function FunctionGeometryExplorer() {
  const [draft, setDraft] = useState(String.raw`\Gamma(1+z)\,\Gamma(1-z)`);
  const [functionTitle, setFunctionTitle] =
    useState('Euler gamma reflection product');
  const [plottedLatex, setPlottedLatex] =
    useState(String.raw`\Gamma(1+z)\,\Gamma(1-z)`);
  const [expression, setExpression] = useState(
    'gamma(1+z)*gamma(1-z)'
  );
  const [inputError, setInputError] = useState('');
  const [surfacePart, setSurfacePart] = useState('re');
  const [surface3D, setSurface3D] = useState(true);
  const [phase3D, setPhase3D] = useState(false);
  const [secondSurfacePart, setSecondSurfacePart] =
    useState('im');
  const [secondSurface3D, setSecondSurface3D] =
    useState(true);
  const [secondMagnitudePart, setSecondMagnitudePart] =
    useState('derivative');
  const [secondPlane3D, setSecondPlane3D] =
    useState(true);
  const [viewsLocked, setViewsLocked] = useState(false);
  const [visiblePlots, setVisiblePlots] = useState(['surface', 'phase']);
  const showExtraPlots = visiblePlots.includes('surface2') ||
    visiblePlots.includes('magnitude');

  const closePlot = id => {
    const remaining = visiblePlots.filter(view => view !== id);
    const link = cameraLinkRef.current;

    if (link.beforeLock) delete link.beforeLock[id];
    if (link.driver === id) link.driver = remaining[0] || null;
    if (link.lastMoved === id) link.lastMoved = remaining[0] || null;

    if (link.locked && remaining.length === 0) {
      link.locked = false;
      link.driver = null;
      link.beforeLock = null;
      link.movedWhileLocked = false;
      setViewsLocked(false);
    }

    if (remaining.length === 0) {
      setZoomViews(current => Object.fromEntries(
        VIEW_IDS.map(view => [
          view, { ...current[view], playing: false }
        ])
      ));
    }

    setVisiblePlots(remaining);
  };

  const cameraLinkRef = useRef({
    locked: false,
    lastMoved: null,
    driver: null,
    movedWhileLocked: false,
    beforeLock: null,
    views: {}
  });
  const [inverted, setInverted] = useState(false);
  const [domain, setDomain] = useState(4);

  // Adjustable display-scale limits.
  // Initially 0.10x to 10x, with 1x at the center.
  const [scaleLimits, setScaleLimits] = useState({
    min: 0.1,
    max: 10
  });

  const ZOOM_OUT_LIMIT = 1 / scaleLimits.min;
  const ZOOM_IN_LIMIT = scaleLimits.max;

  // Slider position -2 ... 0 ... +2.
  // Each half is logarithmic, with 1x at the center.
  const [zoomStops, setZoomStops] = useState(0);

  const zoomScale = zoomStops <= 0
    ? Math.pow(ZOOM_OUT_LIMIT, zoomStops / 2)
    : Math.pow(ZOOM_IN_LIMIT, zoomStops / 2);

  // Scale and Play are globally synchronized.
  // The camera padlock affects camera movement only.
  const [zoomViews, setZoomViews] = useState(() =>
    Object.fromEntries(VIEW_IDS.map(id => [
      id, { stops: 0, playing: false }
    ]))
  );

  const scaleForView = id => {
    const stops = zoomViews[id].stops;
    return stops <= 0
      ? Math.pow(ZOOM_OUT_LIMIT, stops / 2)
      : Math.pow(ZOOM_IN_LIMIT, stops / 2);
  };
  const [heightRange, setHeightRange] = useState(4);
  const [lineMode, setLineMode] = useState('contours');
  const [surfaceHue, setSurfaceHue] = useState(() => hueFromHex(PLANCK_COLOR));
  const surfaceColor = planckHueColor(surfaceHue);
  const [resolution, setResolution] = useState(320);
  const [lightDirection, setLightDirection] = useState(144);
  const [lightElevation, setLightElevation] = useState(10);
  const [ambientStrength, setAmbientStrength] = useState(0.65);
  const lightingTrackOffset = 10;
  const sliderDotSize = 14;
  const [lightStrength, setLightStrength] = useState(2.4);
  // Same phase/anchor model used by the Planck lighting orbit.
  const [lightOrbit, setLightOrbit] = useState({
    period: 20, phase: 0, anchor: 0
  });
  const [orbitSeconds, setOrbitSeconds] = useState(20);
  const [orbitDisplayTime, setOrbitDisplayTime] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsHost, setSettingsHost] = useState(null);
  const [fullscreenSettingsHost, setFullscreenSettingsHost] =
    useState(null);
  const settingsRef = useRef(null);

  const zoomSweepRef = useRef(Object.fromEntries(
    VIEW_IDS.map(id => [id, { position: 0, direction: 1 }])
  ));

  const changeZoomManually = (value, viewId = null) => {
    const stops = Number(value);

    // Manual Scale adjustments always synchronize all four graphs,
    // independently of the camera padlock.
    for (const id of VIEW_IDS) {
      zoomSweepRef.current[id].position = stops;
    }

    setZoomViews(current => {
      const next = { ...current };
      for (const id of VIEW_IDS) {
        next[id] = { stops, playing: false };
      }
      return next;
    });

    setZoomStops(stops);
  };

  const toggleZoomPlayback = () => {
    // The toolbar Play button controls all four graphs.
    const nextPlaying = !zoomViews.surface.playing;
    const stops = zoomViews.surface.stops;

    // Maintain one shared sweep position and direction.
    const sweep = zoomSweepRef.current.surface;

    if (nextPlaying) {
      sweep.position = stops;

      if (stops >= 2) {
        sweep.direction = -1;
      } else if (stops <= -2) {
        sweep.direction = 1;
      }
    }

    for (const id of VIEW_IDS) {
      zoomSweepRef.current[id] = { ...sweep };
    }

    setZoomViews(current =>
      Object.fromEntries(
        VIEW_IDS.map(id => [
          id,
          { stops, playing: nextPlaying }
        ])
      )
    );

    setZoomStops(stops);
  };

  // Establish the orbit clock after hydration, not during SSR.
  useEffect(() => {
    setLightOrbit(current => ({ ...current, anchor: performance.now() }));
  }, []);

  // Display instantaneous angles in the open settings menu.
  useEffect(() => {
    if (!settingsOpen || lightOrbit.period <= 0) return;
    setOrbitDisplayTime(performance.now());
    let frame;
    let last = 0;
    const tick = now => {
      if (now - last >= 80) {
        setOrbitDisplayTime(now);
        last = now;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [settingsOpen, lightOrbit.period]);

  const orbitAngle = (
    lightDirection + lightOrbit.phase +
    (lightOrbit.period > 0 && lightOrbit.anchor > 0
      ? 360 * (orbitDisplayTime - lightOrbit.anchor) /
          (lightOrbit.period * 1000)
      : 0)
  ) * Math.PI / 180;
  const inclination = lightElevation * Math.PI / 180;
  const displayedAzimuth = lightOrbit.period > 0
    ? (Math.atan2(
        Math.cos(inclination) * Math.sin(orbitAngle),
        Math.cos(orbitAngle)
      ) * 180 / Math.PI + 360) % 360
    : lightDirection;
  const displayedElevation = lightOrbit.period > 0
    ? Math.asin(Math.max(-1, Math.min(1,
        Math.sin(inclination) * Math.sin(orbitAngle)
      ))) * 180 / Math.PI
    : lightElevation;

  const pauseLightOrbit = () => {
    if (lightOrbit.period <= 0) return;
    const now = performance.now();
    const angle = (lightDirection + lightOrbit.phase +
      (lightOrbit.anchor > 0
        ? 360 * (now - lightOrbit.anchor) / (lightOrbit.period * 1000)
        : 0)) * Math.PI / 180;
    const tilt = lightElevation * Math.PI / 180;
    setLightDirection((Math.atan2(
      Math.cos(tilt) * Math.sin(angle), Math.cos(angle)
    ) * 180 / Math.PI + 360) % 360);
    setLightElevation(Math.asin(Math.max(-1, Math.min(1,
      Math.sin(tilt) * Math.sin(angle)
    ))) * 180 / Math.PI);
    setLightOrbit({ period: 0, phase: 0, anchor: now });
  };

  const toggleLightOrbit = () => {
    if (lightOrbit.period > 0) pauseLightOrbit();
    else setLightOrbit({
      period: orbitSeconds, phase: 0, anchor: performance.now()
    });
  };

  const changeOrbitSeconds = value => {
    const period = Math.max(2, Math.min(60, Number(value)));
    const now = performance.now();
    setOrbitSeconds(period);
    setLightOrbit(previous => ({
      period: previous.period > 0 ? period : 0,
      phase: previous.period > 0 && previous.anchor > 0
        ? (previous.phase + 360 * (now - previous.anchor) /
            (previous.period * 1000)) % 360
        : previous.phase,
      anchor: now
    }));
  };

  const resetLighting = () => {
    setLightDirection(144);
    setLightElevation(10);
    setAmbientStrength(0.65);
    setLightStrength(2.4);
    setOrbitSeconds(20);
    setLightOrbit({ period: 20, phase: 0, anchor: performance.now() });
  };

  useEffect(() => {
    setSettingsHost(
      document.getElementById('function-geometry-header-settings')
    );
  }, []);

  useEffect(() => {
    if (!settingsOpen) return;

    const dismiss = event => {
      if (
        event.type === 'keydown' &&
        event.key !== 'Escape'
      ) return;

      if (
        event.type === 'pointerdown' &&
        settingsRef.current?.contains(event.target)
      ) return;

      setSettingsOpen(false);
    };

    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', dismiss);

    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', dismiss);
    };
  }, [settingsOpen]);
  // One animation clock for all four graphs.
  // Scale and Play are independent of the camera padlock.
  // Endpoint-to-endpoint traversal takes 20 seconds.
  // Rendering updates remain limited to 12 fps.
  const zoomPlaying = zoomViews.surface.playing;

  useEffect(() => {
    if (!zoomPlaying) return undefined;

    let frame;
    let lastTime = null;
    let lastUpdate = 0;

    const animate = time => {
      if (lastTime === null) lastTime = time;

      const dt = Math.min(time - lastTime, 250);
      lastTime = time;

      const sweep = zoomSweepRef.current.surface;

      sweep.position += sweep.direction * dt * 4 / 20000;

      if (sweep.position >= 2) {
        sweep.position = 4 - sweep.position;
        sweep.direction = -1;
      } else if (sweep.position <= -2) {
        sweep.position = -4 - sweep.position;
        sweep.direction = 1;
      }

      // All four graphs inherit exactly the same scale,
      // including graphs currently hidden from view.
      for (const id of VIEW_IDS) {
        if (id === 'surface') continue;
        zoomSweepRef.current[id] = { ...sweep };
      }

      if (time - lastUpdate >= 1000 / 12) {
        const stops = sweep.position;

        setZoomViews(current =>
          Object.fromEntries(
            VIEW_IDS.map(id => [
              id,
              { stops, playing: true }
            ])
          )
        );

        setZoomStops(stops);
        lastUpdate = time;
      }

      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frame);
  }, [zoomPlaying]);

  const parsed = useMemo(() => {
    try { return { evaluate: compileComplexFunction(expression), error: '' }; }
    catch (error) { return { evaluate: null, error: error.message }; }
  }, [expression]);

  const toggleViewLock = () => {
    const link = cameraLinkRef.current;
    const ids = VIEW_IDS.filter(id => visiblePlots.includes(id));

    if (link.locked) {
      const original = link.beforeLock;
      const restore = !link.movedWhileLocked && original;

      // Disconnect before optionally restoring independent views.
      link.locked = false;
      link.driver = null;
      link.beforeLock = null;
      link.movedWhileLocked = false;

      if (restore) {
        for (const id of ids) {
          link.views[id]?.restore(original[id]);
        }
      }

      // Keep current zoom and playback states when unlocking.
      setViewsLocked(false);
      return;
    }

    // All four cameras must exist before synchronization.
    if (!ids.every(id => link.views[id])) return;

    // Preserve each camera's independent state.
    link.beforeLock = Object.fromEntries(
      ids.map(id => [id, link.views[id].read()])
    );

    link.movedWhileLocked = false;

    const source = ids.includes(link.lastMoved)
      ? link.lastMoved
      : 'surface';

    const snapshot = link.beforeLock[source];

    // Scale and Play are already globally synchronized.
    // Camera locking must not alter their shared state.

    link.locked = true;
    link.driver = source;

    for (const id of ids) {
      if (id !== source) {
        link.views[id].follow(snapshot);
      }
    }

    setViewsLocked(true);
  };

  const apply = event => {
    event.preventDefault();

    try {
      const normalized = normalizeMathFunction(draft);

      // Validate before replacing the plotted expression.
      compileComplexFunction(normalized);

      setExpression(normalized);
      setPlottedLatex(draft);
      setInputError('');
    } catch (error) {
      setInputError(error.message);
    }
  };

  return (
    <div style={{ fontFamily: "'Times New Roman', Times, serif", color: '#eaf0f9' }}>
      <style>{`
        .graph-lighting-range {
          appearance: none; -webkit-appearance: none;
          height: 3px; border: 0; border-radius: 999px;
          background: linear-gradient(to right,
            #1676ed 0%, #1676ed var(--progress),
            #b5b0a7 var(--progress), #b5b0a7 100%);
          cursor: pointer;
        }
        .graph-lighting-range::-webkit-slider-thumb {
          appearance: none; -webkit-appearance: none;
          width: var(--graph-dot-size, 18px);
          height: var(--graph-dot-size, 18px); border-radius: 50%;
          background: #1676ed;
          border: 1px solid #d7e9ff;
          box-sizing: border-box;
        }
        .graph-lighting-range::-moz-range-thumb {
          width: var(--graph-dot-size, 18px);
          height: var(--graph-dot-size, 18px); border-radius: 50%;
          background: #1676ed;
          border: 1px solid #d7e9ff;
          box-sizing: border-box;
        }
        .graph-scale-limit-input {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          height: 26px;
          margin: 0;
          padding: 0;
          border: 0;
          background: transparent;
          appearance: none;
          -webkit-appearance: none;
          pointer-events: none;
        }
        .graph-scale-limit-input::-webkit-slider-runnable-track {
          height: 3px;
          border: 0;
          background: transparent;
        }
        .graph-scale-limit-input::-webkit-slider-thumb {
          appearance: none;
          -webkit-appearance: none;
          box-sizing: border-box;
          width: 14px;
          height: 14px;
          margin-top: -5.5px;
          border-radius: 50%;
          background: #1676ed;
          border: 1px solid #d7e9ff;
          pointer-events: auto;
          cursor: ew-resize;
        }
        .graph-scale-limit-input::-moz-range-track {
          height: 3px;
          border: 0;
          background: transparent;
        }
        .graph-scale-limit-input::-moz-range-thumb {
          box-sizing: border-box;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #1676ed;
          border: 1px solid #d7e9ff;
          pointer-events: auto;
          cursor: ew-resize;
        }
        .graph-scale-limit-input:focus-visible::-webkit-slider-thumb {
          box-shadow: 0 0 0 3px rgba(166, 200, 237, 0.45);
        }
        .graph-hue-range {
          appearance: none; -webkit-appearance: none;
          height: 3px; border: 0; border-radius: 999px;
          background: linear-gradient(to right,
            #ff0a0a 0%, #ffff0a 16.67%, #0aff0a 33.33%,
            #0affff 50%, #0a0aff 66.67%, #ff0aff 83.33%,
            #ff0a0a 100%);
          cursor: pointer;
        }
        .graph-hue-range::-webkit-slider-thumb {
          appearance: none; -webkit-appearance: none;
          width: 18px; height: 18px; border-radius: 50%;
          background: var(--selected-hue-color); border: 1px solid white;
          
        }
        .graph-hue-range::-moz-range-thumb {
          width: 18px; height: 18px; border-radius: 50%;
          background: var(--selected-hue-color); border: 1px solid white;
          
        }
      `}</style>
      {(fullscreenSettingsHost || settingsHost) && createPortal(
        <div ref={settingsRef} style={{
          position: 'relative',
          '--graph-dot-size': `${sliderDotSize}px`
        }}>
          <button
            type="button"
            title="Visualization settings"
            aria-label="Visualization settings"
            aria-expanded={settingsOpen}
            aria-controls="function-geometry-settings"
            onClick={() => setSettingsOpen(value => !value)}
            style={{
              ...tab(settingsOpen),
              width: fullscreenSettingsHost ? 34 : 42,
              height: fullscreenSettingsHost ? 34 : 42,
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <svg
              width="23"
              height="23"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"/>
              <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06-1.88 1.88-.06-.06A1.7 1.7 0 0 0 16 18.4a1.7 1.7 0 0 0-1 1.56V20h-2.66v-.04a1.7 1.7 0 0 0-1-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06-1.88-1.88.06-.06A1.7 1.7 0 0 0 7.93 15a1.7 1.7 0 0 0-1.56-1H6.3v-2.66h.07a1.7 1.7 0 0 0 1.56-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06 1.88-1.88.06.06A1.7 1.7 0 0 0 11.34 6a1.7 1.7 0 0 0 1-1.56V4.4H15v.04A1.7 1.7 0 0 0 16 6a1.7 1.7 0 0 0 1.87-.34l.06-.06 1.88 1.88-.06.06a1.7 1.7 0 0 0-.34 1.87 1.7 1.7 0 0 0 1.56 1h.07v2.66h-.07A1.7 1.7 0 0 0 19.4 15Z"
                transform="translate(-1.33 -0.2)"/>
            </svg>
          </button>

          {settingsOpen && (
            <div
              id="function-geometry-settings"
              role="group"
              aria-label="Visualization settings"
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: 390,
                maxWidth: 'calc(100vw - 32px)',
                boxSizing: 'border-box',
                padding: 16,
                color: '#eaf0f9',
                background: '#101a2b',
                border: '1px solid #607c9a',
                borderRadius: 10,
                boxShadow: '0 15px 40px rgba(0,0,0,0.65)',
                maxHeight: 'min(72vh, 680px)',
                overflowY: 'auto'
              }}
            >
              <div style={{
                fontSize: 18,
                borderBottom: '1px solid #52657e',
                paddingBottom: 9,
                marginBottom: 18
              }}>
                Visualization settings
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: 12,
                marginBottom: 12
              }}>
                <strong>Rendering</strong>
                <span style={{
                  fontSize: 12,
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                  whiteSpace: 'nowrap'
                }}>
                  Resolution: {resolution} × {Math.round(resolution * 9 / 16)}
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="512"
                step="1"
                aria-label="Plot resolution"
                value={resolution}
                onChange={event =>
                  setResolution(Number(event.target.value))
                }
                className="graph-lighting-range"
                style={{
                  width: '100%',
                  display: 'block',
                  margin: '0 0 16px',
                  '--progress': `${100 * (resolution - 50) / 462}%`
                }}
              />

              <details style={{
                borderTop: '1px solid #52657e',
                paddingTop: 11
              }}>
                <summary style={{
                  fontWeight: 700,
                  cursor: 'pointer',
                  marginBottom: 10,
                  position: 'relative',
                  minHeight: 32,
                  lineHeight: '32px',
                  paddingRight: 112
                }}>
                  Lighting
                  <span style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    display: 'inline-flex',
                    gap: 8
                  }}>
                    <button type="button"
                      style={settingsActionButton}
                      onClick={event => {
                        event.preventDefault();
                        event.stopPropagation();
                        setSettingsOpen(false);
                      }}>Set</button>
                    <button type="button"
                      style={settingsActionButton}
                      onClick={event => {
                        event.preventDefault();
                        event.stopPropagation();
                        resetLighting();
                      }}>Reset</button>
                  </span>
                </summary>
              <LightingRange label="Azimuth" trackOffset={lightingTrackOffset} min={0} max={360}
                value={Math.round(displayedAzimuth)}
                ticks={['0', 'π/2', 'π', '3π/2', '2π']}
                onChange={event => {
                  pauseLightOrbit();
                  setLightDirection(Number(event.target.value));
                }} />
              <LightingRange label="Elevation" trackOffset={lightingTrackOffset} min={-90} max={90}
                value={Math.round(displayedElevation)}
                ticks={['−π/2', '0', 'π/2']}
                onChange={event => {
                  pauseLightOrbit();
                  setLightElevation(Number(event.target.value));
                }} />
              <div style={{ display: 'grid',
                gridTemplateColumns: '75px minmax(0,1fr)',
                gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 12 }}>
                  Orbit{' '}
                  <button type="button" aria-pressed={lightOrbit.period > 0}
                    onClick={toggleLightOrbit}
                    style={{ background: 'transparent', border: 0,
                      color: lightOrbit.period > 0 ? '#7fc2ff' : '#eff4fb',
                      padding: 0, font: 'inherit', textDecoration: 'underline',
                      cursor: 'pointer' }}>
                    {lightOrbit.period > 0 ? 'On' : 'Off'}
                  </button>
                </span>
                <div style={{
                  minWidth: 0,
                  position: 'relative',
                  top: lightingTrackOffset
                }}>
                  <input type="range" min="2" max="60" step="1"
                    aria-label="Orbit seconds per revolution"
                    className="graph-lighting-range"
                    value={orbitSeconds}
                    onChange={event => changeOrbitSeconds(event.target.value)}
                    style={{ width: '100%', display: 'block', margin: 0,
                      '--progress': `${100 * (orbitSeconds - 2) / 58}%` }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between',
                    fontSize: 10, opacity: 0.85, marginTop: 2 }}>
                    {['2s','15s','30s','45s','60s'].map(t =>
                      <span key={t}>{t}</span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{
                marginTop: 12,
                fontSize: 12
              }}>
                Light intensity
              </div>

                <SettingsSliderRow
                  label="Ambient"
                  displayValue={ambientStrength.toFixed(2)}
                  value={ambientStrength}
                  min={0}
                  max={2}
                  step={0.05}
                  onChange={event =>
                    setAmbientStrength(Number(event.target.value))
                  }
                />

                <SettingsSliderRow
                  label="Directional"
                  displayValue={lightStrength.toFixed(1)}
                  value={lightStrength}
                  min={0}
                  max={5}
                  step={0.1}
                  onChange={event =>
                    setLightStrength(Number(event.target.value))
                  }
                />
                            </details>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                paddingTop: 12,
                borderTop: '1px solid #52657e',
                marginTop: 16,
                marginBottom: 10
              }}>
                <strong>Surface color</strong>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button"
                    style={settingsActionButton}
                    onClick={() => setSettingsOpen(false)}>
                    Set
                  </button>
                  <button type="button"
                    style={settingsActionButton}
                    onClick={() =>
                      setSurfaceHue(hueFromHex(PLANCK_COLOR))
                    }>
                    Reset
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <input type="range" min="0" max="360" step="1"
                  className="graph-hue-range"
                  aria-label="Surface hue" value={Math.round(surfaceHue)}
                  onChange={event => setSurfaceHue(Number(event.target.value))}
                  style={{
                     flex: 1,
                     minWidth: 0,
                     '--selected-hue-color': surfaceColor
                   }} />
              </div>

              <div style={{
                fontWeight: 700,
                marginTop: 16,
                paddingTop: 11,
                borderTop: '1px solid #52657e'
              }}>
                View
              </div>

              <div style={{ marginTop: 12 }}>
                <SettingsSliderRow
                  label="Domain ±"
                  displayValue={domain}
                  value={logPosition(domain, 0.05, 100)}
                  min={0}
                  max={1}
                  step={0.001}
                  labelWidth={112}
                  onChange={event =>
                    setDomain(
                      logValue(Number(event.target.value), 0.05, 100)
                    )
                  }
                />

                <SettingsSliderRow
                  label="Surface cutoff ±"
                  displayValue={heightRange}
                  value={logPosition(heightRange, 0.05, 1000)}
                  min={0}
                  max={1}
                  step={0.001}
                  labelWidth={112}
                  onChange={event =>
                    setHeightRange(
                      logValue(Number(event.target.value), 0.05, 1000)
                    )
                  }
                />

                <ScaleLimitsRange
                  minScale={scaleLimits.min}
                  maxScale={scaleLimits.max}
                  onMinChange={value =>
                    setScaleLimits(current => ({
                      ...current,
                      min: Math.max(0.001, Math.min(1, value))
                    }))
                  }
                  onMaxChange={value =>
                    setScaleLimits(current => ({
                      ...current,
                      max: Math.max(1, Math.min(1000, value))
                    }))
                  }
                />
              </div>
            </div>
          )}
        </div>,
        fullscreenSettingsHost || settingsHost
      )}

      <form
        onSubmit={apply}
        className={`${styles.matchedInputPanel} ${styles.matchedInputRow} ${styles.geometryInputRow}`}
      >
        <div style={{ minWidth: 0 }}>
          <label htmlFor="geometry-expression">
            Function{' '}
            <span style={{
              display: 'inline-flex',
              alignItems: 'baseline',
              gap: 2,
              whiteSpace: 'nowrap',
              fontFamily: "'Times New Roman', Times, serif",
              fontWeight: 600,
              marginLeft: 3,
              marginRight: 3
            }}>
              <i style={{ fontWeight: 400 }}>f</i>
              <span>(</span>
              <i style={{ fontWeight: 400 }}>z</i>
              <span>)</span>
            </span>
            {functionTitle && (
              <span style={{ fontWeight: 400 }}>
                {' = '}{functionTitle}
              </span>
            )}
          </label>

          <MathFunctionInput
            latex={draft}
            onLatexChange={value => {
              setDraft(value);
              setFunctionTitle('');
            }}
            onFunctionSelect={setFunctionTitle}
            lockControl={

            <button
              type="button"
              onClick={toggleViewLock}
              aria-pressed={viewsLocked}
              aria-label={viewsLocked
                ? 'Unlock graph views'
                : 'Lock graph views'}
              title={viewsLocked
                ? 'Unlock synchronized graph cameras'
                : 'Match and synchronize graph cameras'}
              style={{
                ...tab(viewsLocked),
                flexShrink: 0,
                width: 35,
                height: 35,
                padding: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect
                  x="5" y="10"
                  width="14" height="11" rx="2"
                />
                {viewsLocked
                  ? <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                  : <path d="M8 10V7a4 4 0 0 1 7.5-2" />}
              </svg>
            </button>
            }
          />
        </div>

        <div style={{
          minWidth: 0,
          position: 'relative'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            width: '100%',            marginBottom: 4
          }}>
            <label htmlFor="geometry-plot-button">
              Plot action
            </label>
            <button
              type="button"
              title={zoomPlaying
                ? 'Pause mathematical zoom sweep'
                : 'Play logarithmic zoom sweep'}
              aria-label={zoomPlaying
                ? 'Pause mathematical zoom sweep'
                : 'Play mathematical zoom sweep'}
              aria-pressed={zoomPlaying}
              onClick={toggleZoomPlayback}
              style={{
                ...tab(zoomPlaying),
                position: 'absolute',
                top: -4,
                right: 0,
                zIndex: 1,
                boxSizing: 'border-box',
                width: 31,
                minWidth: 31,
                height: 31,
                padding: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 17,
                flex: '0 0 auto'
              }}
            >
              {zoomPlaying ? 'Ⅱ' : '▶'}
            </button>
          </div>

          <div
            className={styles.geometryActionRow}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              flexWrap: 'nowrap',
              gap: 8,
              width: '100%',
              minWidth: 0,
              boxSizing: 'border-box',

            }}
          >
            <button
              id="geometry-plot-button"
              type="submit"
              style={{
                ...tab(true),
                height: 43,
                flex: '0 0 auto',
                padding: '7px 14px',
                whiteSpace: 'nowrap'
              }}
            >
              Plot function
            </button>

            <div
              role="group"
              aria-label="Complex coordinate: z or 1/z"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                height: 43,
                padding: '0 12px',
                boxSizing: 'border-box',
                border: '1px solid #54677f',
                borderRadius: 7,
                background: '#0d1420',
                whiteSpace: 'nowrap',
                flex: '0 0 auto'
              }}
            >
              {[
                { label: 'z', value: false },
                { label: '1/z', value: true }
              ].map((choice, index) => (
                <span
                  key={choice.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  {index > 0 && (
                    <span style={{ opacity: 0.6 }}>|</span>
                  )}
                  <button
                    type="button"
                    aria-pressed={inverted === choice.value}
                    onClick={() => setInverted(choice.value)}
                    style={{
                      border: 0,
                      background: 'transparent',
                      padding: 0,
                      font: 'inherit',
                      cursor: 'pointer',
                      color: inverted === choice.value
                        ? '#ffffff'
                        : '#8d9bab'
                    }}
                  >
                    <MathVariableLabel text={choice.label} />
                  </button>
                </span>
              ))}
            </div>

            <div role="group" aria-label="Surface lines: Contours or Grid"
              style={{ display: 'flex', alignItems: 'center', gap: 6,
                height: 43, padding: '0 12px', boxSizing: 'border-box',
                border: '1px solid #54677f', borderRadius: 7,
                background: '#0d1420', whiteSpace: 'nowrap' }}>
              {['contours', 'grid'].map((mode, index) => (
                <span key={mode} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {index > 0 && <span style={{ opacity: 0.6 }}>|</span>}
                  <button type="button" aria-pressed={lineMode === mode}
                    onClick={() => setLineMode(current => current === mode ? 'none' : mode)}
                    style={{ border: 0, background: 'transparent',
                      padding: 0, font: 'inherit', cursor: 'pointer',
                      color: lineMode === mode ? '#fff' : '#8d9bab' }}>
                    {mode === 'contours' ? 'Contours' : 'Grid'}
                  </button>
                </span>
              ))}
            </div>

            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flex: '1 1 0',
              minWidth: 0,
              height: 43,
              whiteSpace: 'nowrap'
            }}>
              <span style={{ fontSize: 12 }}>Scale</span>
              <input
                type="range"
                min="-2"
                max="2"
                step="0.01"
                value={zoomStops}
                aria-label="Mathematical function zoom"
                aria-valuetext={`${zoomScale.toFixed(2)} times`}
                onChange={event =>
                  changeZoomManually(event.target.value)
                }
                className="graph-lighting-range"
                style={{
                  width: '100%',
                  minWidth: 45,
                  flex: '1 1 auto',
                  margin: 0,
                  '--progress': `${(zoomStops + 2) * 25}%`,
                  '--graph-dot-size': '14px'
                }}
              />
              <span style={{
                flex: '0 0 auto',
                fontSize: 12,
                fontVariantNumeric: 'tabular-nums'
              }}>
                {zoomScale.toFixed(2)}×
              </span>
            </label>

          </div>
        </div>
      </form>
      {(inputError || parsed.error) ? (
        <div role="alert" style={{ border: '1px solid #d08080', background: '#301b25', padding: 12, borderRadius: 8, marginBottom: 12 }}>
          Function error: {inputError || parsed.error}
        </div>
      ) : null}
      {parsed.evaluate &&
        (visiblePlots.includes('surface') ||
         visiblePlots.includes('phase')) && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 450px), 1fr))',
          gap: 12, alignItems: 'start', marginTop: 12
        }}>
          {visiblePlots.includes('surface') && (
          <div style={{ minWidth: 0 }}>
            <FunctionGeometryViewer kind="surface" viewId="surface" onClose={() => closePlot('surface')} cameraLink={cameraLinkRef.current} evaluate={parsed.evaluate} part={surfacePart}
              domain={domain / scaleForView('surface')} heightRange={heightRange} inverted={inverted}
              is3D={surface3D} showGrid={false} lineMode={lineMode}
              surfaceColor={surfaceColor}
              lightDirection={lightDirection} lightElevation={lightElevation}
              lightOrbit={lightOrbit} resolution={resolution}
              ambientStrength={ambientStrength} lightStrength={lightStrength}

              onPartChange={setSurfacePart}
              onModeChange={setSurface3D}
              onFullscreenSettingsHostChange={
                setFullscreenSettingsHost
              }
              zoomStops={zoomViews['surface'].stops}
              zoomFactor={scaleForView('surface')}
              onZoomStopsChange={value => changeZoomManually(value, 'surface')}
              onZoomPlaybackToggle={toggleZoomPlayback}
              zoomPlaying={zoomViews['surface'].playing}
              functionLatex={plottedLatex}
              />
          </div>
          )}
          {visiblePlots.includes('phase') && (
          <div style={{ minWidth: 0 }}>
            <FunctionGeometryViewer kind="phase" viewId="phase" onClose={() => closePlot('phase')} cameraLink={cameraLinkRef.current} evaluate={parsed.evaluate} part="re"
              domain={domain / scaleForView('phase')} heightRange={heightRange} inverted={inverted}
              is3D={phase3D} showGrid={lineMode === 'grid'} lineMode={lineMode}
              lightDirection={lightDirection} lightElevation={lightElevation}
              lightOrbit={lightOrbit} resolution={resolution}
              ambientStrength={ambientStrength} lightStrength={lightStrength}
              onModeChange={setPhase3D}
              onFullscreenSettingsHostChange={
                setFullscreenSettingsHost
              }
              zoomStops={zoomViews['phase'].stops}
              zoomFactor={scaleForView('phase')}
              onZoomStopsChange={value => changeZoomManually(value, 'phase')}
              onZoomPlaybackToggle={toggleZoomPlayback}
              zoomPlaying={zoomViews['phase'].playing}
              functionLatex={plottedLatex}
              />


          </div>
          )}
        </div>
      )}
      

      {parsed.evaluate && showExtraPlots && (
        <div style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(min(100%, 450px), 1fr))',
          gap: 12,
          alignItems: 'start',
          marginTop: 12
        }}>
          {visiblePlots.includes('surface2') && (
          <div style={{ minWidth: 0 }}>
            <FunctionGeometryViewer
              kind="surface"
              viewId="surface2" onClose={() => closePlot('surface2')}
              cameraLink={cameraLinkRef.current}
              evaluate={parsed.evaluate}
              part={secondSurfacePart}
              compactSurfaceButtons
              compactHeader
              headerOptions={[
                {
                  value: 're',
                  label: 'Re',
                  title: 'Real component'
                },
                {
                  value: 'im',
                  label: 'Im',
                  title: 'Imaginary component'
                }
              ]}
              selectedHeaderOption={secondSurfacePart}
              onHeaderOptionChange={setSecondSurfacePart}
              domain={domain / scaleForView('surface2')}
              heightRange={heightRange}
              inverted={inverted}
              is3D={secondSurface3D}
              showGrid={false}
              lineMode={lineMode}
              surfaceColor={surfaceColor}
              lightDirection={lightDirection}
              lightElevation={lightElevation}
              lightOrbit={lightOrbit}
              resolution={resolution}
              ambientStrength={ambientStrength}
              lightStrength={lightStrength}
              onModeChange={setSecondSurface3D}
              onFullscreenSettingsHostChange={
                setFullscreenSettingsHost
              }
              zoomStops={zoomViews['surface2'].stops}
              zoomFactor={scaleForView('surface2')}
              onZoomStopsChange={value => changeZoomManually(value, 'surface2')}
              onZoomPlaybackToggle={toggleZoomPlayback}
              zoomPlaying={zoomViews['surface2'].playing}
              functionLatex={plottedLatex}
            />
          </div>
          )}

          {visiblePlots.includes('magnitude') && (
          <div style={{ minWidth: 0 }}>
            <FunctionGeometryViewer
              kind="surface"
              viewId="magnitude" onClose={() => closePlot('magnitude')}
              cameraLink={cameraLinkRef.current}
              evaluate={parsed.evaluate}
              part={secondMagnitudePart}
              compactHeader
              compactSurfaceButtons
              headerOptions={[
                {
                  value: 'derivative',
                  label: '|f′|',
                  title: 'Derivative magnitude'
                },
                {
                  value: 'logabs',
                  label: 'log|f|',
                  title: 'Logarithmic magnitude'
                },
                {
                  value: 'abs',
                  label: '|f|',
                  title: 'Magnitude'
                }
              ]}
              selectedHeaderOption={secondMagnitudePart}
              onHeaderOptionChange={setSecondMagnitudePart}
              domain={domain / scaleForView('magnitude')}
              heightRange={heightRange}
              inverted={inverted}
              is3D={secondPlane3D}
              showGrid={false}
              lineMode={lineMode}
              lightDirection={lightDirection}
              lightElevation={lightElevation}
              lightOrbit={lightOrbit}
              resolution={resolution}
              ambientStrength={ambientStrength}
              lightStrength={lightStrength}
              onModeChange={setSecondPlane3D}
              onFullscreenSettingsHostChange={
                setFullscreenSettingsHost
              }
              zoomStops={zoomViews['magnitude'].stops}
              zoomFactor={scaleForView('magnitude')}
              onZoomStopsChange={value => changeZoomManually(value, 'magnitude')}
              onZoomPlaybackToggle={toggleZoomPlayback}
              zoomPlaying={zoomViews['magnitude'].playing}
              functionLatex={plottedLatex}
            />
          </div>
          )}
        </div>
      )}

      {parsed.evaluate && visiblePlots.length < VIEW_IDS.length && (
        <button
          type="button"
          aria-label="Restore missing graphs"
          title="Show all four graphs"
          onClick={() => setVisiblePlots([...VIEW_IDS])}
          style={{
            ...tab(false),
            width: 34,
            height: 34,
            padding: 0,
            marginTop: 12,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            fontWeight: 400,
            lineHeight: 1
          }}
        >
          +
        </button>
      )}
    </div>
  );
}
