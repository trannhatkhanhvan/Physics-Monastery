'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { solveQuarticRoots } from './math/quarticRoots';

const COLORS = ['#ff4040', '#ffe600', '#47d16c', '#2f8cff'];
const EDGES = [[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];
const RANGE = 20;
const W = 1000;
const H = 620;

function orderedRoots(a, incoming) {
  const roots = [...incoming];
  const upper = roots.filter(r => r.im > 1e-7)
    .sort((x,y) => Math.abs(y.im) - Math.abs(x.im));
  const lower = roots.filter(r => r.im < -1e-7)
    .sort((x,y) => Math.abs(y.im) - Math.abs(x.im));

  if (upper.length === 2 && lower.length === 2) {
    return [upper[1], lower[1], upper[0], lower[0]];
  }

  const real = roots.filter(r => Math.abs(r.im) <= 1e-7);

  if (real.length === 2 && upper.length === 1 && lower.length === 1) {
    real.sort((x,y) => x.re - y.re);
    return [real[0], real[1], upper[0], lower[0]];
  }

  return roots.sort((x,y) => x.re - y.re || y.im - x.im);
}

function lift(root) {
  return [
    root.re,
    root.im,
    root.re * root.re + root.im * root.im,
  ];
}

function signedVolume(points) {
  const [a,b,c,d] = points;
  const sub = (x,y) => x.map((v,i) => v-y[i]);
  const u = sub(b,a), v = sub(c,a), w = sub(d,a);
  return (
    u[0]*(v[1]*w[2]-v[2]*w[1]) -
    u[1]*(v[0]*w[2]-v[2]*w[0]) +
    u[2]*(v[0]*w[1]-v[1]*w[0])
  ) / 6;
}

function calculateTraces() {
  const samples = [];

  for (let i=0; i<=320; i++) {
    const a = -RANGE + 2*RANGE*i/320;
    const roots = orderedRoots(a, solveQuarticRoots(a));

    if (roots.every(r => Number.isFinite(r.re) && Number.isFinite(r.im))) {
      samples.push({ a, points: roots.map(lift) });
    }
  }

  return samples;
}

function getAsymptoticConfiguration(asymptoticEnd) {
  if (asymptoticEnd > 0) {
    return {
      originIndex: 0, // ж1 -> 0 as a -> +∞
      rays: [
        { index: 1, angle: 0 },                  // ж2
        { index: 2, angle: 2 * Math.PI / 3 },   // ж3
        { index: 3, angle: 4 * Math.PI / 3 },   // ж4
      ],
    };
  }

  if (asymptoticEnd < 0) {
    return {
      originIndex: 1, // ж2 -> 0 as a -> -∞
      rays: [
        { index: 0, angle: Math.PI },           // ж1
        { index: 2, angle: Math.PI / 3 },       // ж3
        { index: 3, angle: 5 * Math.PI / 3 },   // ж4
      ],
    };
  }

  return null;
}

const INFINITY_RADIUS = 16;
const ENDPOINT_TWEEN_MS = 600;

function idealEndpoint(configuration) {
  if (!configuration) return null;

  const result = Array.from(
    { length: 4 },
    () => [0, 0, 0]
  );

  for (const ray of configuration.rays) {
    const r = INFINITY_RADIUS;

    result[ray.index] = [
      r * Math.cos(ray.angle),
      r * Math.sin(ray.angle),
      r * r,
    ];
  }

  return result;
}

function blendPoints(from, to, fraction) {
  return from.map((point, i) =>
    point.map(
      (value, k) =>
        value + (to[i][k] - value) * fraction
    )
  );
}

const OPTIONS = [
  ['paraboloid','Paraboloid'],
  ['plane','Root plane'],
  ['verticals','Lift lines'],
  ['edges','Tetrahedron'],
  ['traces','Root traces'],
  ['labels','Labels'],
];

export default function ParaboloidLiftViewer({
  a,
  roots,
  asymptoticEnd = 0,
  cameraCommand,
}) {
  const [camera,setCamera] = useState({azimuth:0,tilt:0,autoFit:false});
  const [zoom,setZoom] = useState(1);

  const cameraRef = useRef(camera);
  const cameraAnimationRef = useRef(null);

  const [visible,setVisible] = useState({
    paraboloid:true,
    plane:true,
    verticals:true,
    edges:true,
    traces:false,
    labels:false,
  });

  // Keep the camera reference synchronized with manual dragging.
  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  function stopCameraAnimation() {
    if (cameraAnimationRef.current !== null) {
      cancelAnimationFrame(cameraAnimationRef.current);
      cameraAnimationRef.current = null;
    }
  }

  useEffect(() => {
    if (!cameraCommand || cameraCommand.sequence === 0) {
      return undefined;
    }

    const action = cameraCommand.action;

    if (action === 'zoomIn') {
      setZoom(z => Math.min(3, z * 1.2));
      return undefined;
    }

    if (action === 'zoomOut') {
      setZoom(z => Math.max(0.3, z / 1.2));
      return undefined;
    }

    const targets = {
      top: {
        azimuth: 0,
        tilt: 0,
      },
      plusX: {
        azimuth: Math.PI / 2,
        tilt: Math.PI / 2,
      },
      plusY: {
        azimuth: 0,
        tilt: Math.PI / 2,
      },
      reset: {
        azimuth: 0,
        tilt: 0,
      },
    };

    const target = targets[action];

    if (!target) return undefined;

    stopCameraAnimation();

    const from = { ...cameraRef.current };

    // Rotate through the shortest angular displacement.
    const angleDifference = (fromAngle, toAngle) =>
      Math.atan2(
        Math.sin(toAngle - fromAngle),
        Math.cos(toAngle - fromAngle)
      );

    const deltaAzimuth = angleDifference(
      from.azimuth,
      target.azimuth
    );

    const deltaTilt = target.tilt - from.tilt;

    const duration = 650;
    let startTime = null;

    const animate = timestamp => {
      if (startTime === null) startTime = timestamp;

      const t = Math.min(
        1,
        (timestamp - startTime) / duration
      );

      // Smooth acceleration and deceleration.
      const eased = t * t * (3 - 2 * t);

      const next = {
        azimuth: from.azimuth + deltaAzimuth * eased,
        tilt: from.tilt + deltaTilt * eased,
        autoFit: false,
      };

      cameraRef.current = next;
      setCamera(next);

      if (t < 1) {
        cameraAnimationRef.current =
          requestAnimationFrame(animate);
      } else {
        cameraAnimationRef.current = null;
      }
    };

    cameraAnimationRef.current =
      requestAnimationFrame(animate);

    if (action === 'reset') {
      setZoom(1);
    }

    return () => {
      stopCameraAnimation();
    };
  }, [cameraCommand]);

  const dragging = useRef(null);
  const samples = useMemo(calculateTraces, []);

  const finite = asymptoticEnd === 0 && Number.isFinite(a);
  const current = finite ? orderedRoots(a,roots) : [];
  const points = current.map(lift);
  const volume = points.length === 4 ? signedVolume(points) : null;

  const asymptotic = useMemo(
    () => getAsymptoticConfiguration(asymptoticEnd),
    [asymptoticEnd]
  );

  const infinityPoints = useMemo(
    () => idealEndpoint(asymptotic),
    [asymptotic]
  );

  const lastFinitePoints = useRef(null);
  const previousEnd = useRef(0);
  const previousEndpointRef = useRef(0);

  const [transition, setTransition] = useState(null);

  if (finite && points.length === 4) {
    lastFinitePoints.current = points;
  }

  if (asymptoticEnd !== 0) {
    previousEndpointRef.current = asymptoticEnd;
  }

  useEffect(() => {
    const oldEnd = previousEnd.current;
    previousEnd.current = asymptoticEnd;

    if (oldEnd === asymptoticEnd) {
      return undefined;
    }

    const oldConfiguration =
      getAsymptoticConfiguration(oldEnd);

    const startingPoints = oldConfiguration
      ? idealEndpoint(oldConfiguration)
      : lastFinitePoints.current;

    if (!startingPoints) {
      return undefined;
    }

    let frame = null;
    let startTime = null;

    const entering = asymptoticEnd !== 0;

    setTransition({
      from: startingPoints,
      entering,
      progress: 0,
    });

    const animate = time => {
      if (startTime === null) {
        startTime = time;
      }

      const linear = Math.min(
        1,
        (time - startTime) / ENDPOINT_TWEEN_MS
      );

      const smooth =
        linear * linear * (3 - 2 * linear);

      if (linear < 1) {
        setTransition({
          from: startingPoints,
          entering,
          progress: smooth,
        });

        frame = requestAnimationFrame(animate);
      } else {
        setTransition(null);
      }
    };

    frame = requestAnimationFrame(animate);

    return () => {
      if (frame !== null) {
        cancelAnimationFrame(frame);
      }
    };
  }, [asymptoticEnd]);

  const targetPoints = finite
    ? points
    : infinityPoints;

  const displayPoints =
    transition && targetPoints
      ? blendPoints(
          transition.from,
          targetPoints,
          transition.progress
        )
      : targetPoints;

  const outerEdgeOpacity = transition
    ? (
        transition.entering
          ? 1 - transition.progress
          : transition.progress
      )
    : (finite ? 1 : 0);

  const endpointForRendering =
    asymptotic ||
    (
      transition && !transition.entering
        ? getAsymptoticConfiguration(
            previousEndpointRef.current
          )
        : null
    );

  function outerOpacity(index) {
    if (
      endpointForRendering &&
      index !== endpointForRendering.originIndex
    ) {
      return outerEdgeOpacity;
    }

    return 1;
  }

  function project(p) {
    const [x,y,z] = p;
    const ca = Math.cos(camera.azimuth);
    const sa = Math.sin(camera.azimuth);
    const ct = Math.cos(camera.tilt);
    const st = Math.sin(camera.tilt);

    const right = ca*x-sa*y;
    const depth = sa*x+ca*y;
    // Match the Roots tab's 48-unit scale at 130%.
    // The 1000-unit SVG maps this to its displayed width.
    const scale = zoom * 75;

    // Positive imaginary roots appear above the real axis.
    // Positive lift height rises into the oblique view.
    const up = depth*ct+z*st;

    return [
      W/2 + right*scale,
      H/2-48 - up*scale,
    ];
  }

  function segment(p,q,props={}) {
    const [x1,y1] = project(p);
    const [x2,y2] = project(q);
    const { key, ...lineProps } = props;
    return (
      <line
        key={key}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        {...lineProps}
      />
    );
  }

  function tracePath(index) {
    const negativeEndpoint = idealEndpoint(
      getAsymptoticConfiguration(-1)
    );

    const positiveEndpoint = idealEndpoint(
      getAsymptoticConfiguration(1)
    );

    const pathPoints = [
      negativeEndpoint[index],
      ...samples.map(sample => sample.points[index]),
      positiveEndpoint[index],
    ];

    let result = '';
    let started = false;

    for (const point of pathPoints) {
      const [x, y] = project(point);

      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        started = false;
        continue;
      }

      result += `${started ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)} `;
      started = true;
    }

    return result;
  }

  function onPointerMove(e) {
    if (!dragging.current) return;

    const d = dragging.current;
    const next = {
      azimuth: d.azimuth + (e.clientX-d.x)*.007,
      tilt: Math.max(
        -Math.PI / 2,
        Math.min(Math.PI / 2,d.tilt-(e.clientY-d.y)*.007)
      ),
      autoFit: false,
    };

    cameraRef.current = next;
    setCamera(next);
  }

  const buttonStyle = {
    padding:'5px 10px',
    border:'1px solid rgba(255,255,255,.3)',
    borderRadius:5,
    color:'inherit',
    background:'rgba(255,255,255,.07)',
    cursor:'pointer',
  };

  return (
    <div style={{
      position:'absolute',
      inset:'40px 0 0',
      display:'flex',
      flexDirection:'column',
      minWidth:0,
      minHeight:0,
      color:'rgba(245,239,224,.93)',
    }}>
      <div style={{
        flex:'1 1 auto',
        minHeight:0,
        position:'relative',
        touchAction:'none',
        cursor:'grab',
      }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          width="100%"
          height="100%"
          aria-label="Interactive paraboloid lift of the quartic roots"
          onPointerDown={e=>{
            stopCameraAnimation();

            dragging.current = {
              x:e.clientX,
              y:e.clientY,
              ...cameraRef.current,
            };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={onPointerMove}
          onPointerUp={e=>{
            dragging.current = null;
            if (e.currentTarget.hasPointerCapture(e.pointerId)) {
              e.currentTarget.releasePointerCapture(e.pointerId);
            }
          }}
          onPointerCancel={()=>{dragging.current=null;}}
          onWheel={e=>{
            if (e.ctrlKey) return;
            setZoom(z=>Math.max(
              .3,Math.min(3,z*(e.deltaY>0?.94:1.06))
            ));
          }}
        >
          {visible.plane && (
            <>
              <polygon
                points={[
                  [-6,-6,0],[6,-6,0],[6,6,0],[-6,6,0],
                ].map(p=>project(p).join(',')).join(' ')}
                fill="#9da8b6"
                fillOpacity=".055"
                stroke="#9da8b6"
                strokeOpacity=".18"
              />
              {segment([-6,0,0],[6,0,0],{
                stroke:'#b5bcc5',strokeOpacity:.45,strokeWidth:1.2,
              })}
              {segment([0,-6,0],[0,6,0],{
                stroke:'#b5bcc5',strokeOpacity:.45,strokeWidth:1.2,
              })}
            </>
          )}

          {visible.paraboloid &&
            Array.from({length:25},(_,i)=>{
              const v=-6+i*.5;
              const values=Array.from(
                {length:49},(_,k)=>-6+k*.25
              );

              const row=values.map(x=>
                project([x,v,x*x+v*v]).join(',')
              ).join(' ');

              const col=values.map(y=>
                project([v,y,v*v+y*y]).join(',')
              ).join(' ');

              return (
                <g key={`mesh-${i}`}
                  stroke="#6eb7d5"
                  strokeWidth=".75"
                  strokeOpacity=".22"
                  fill="none">
                  <polyline points={row}/>
                  <polyline points={col}/>
                </g>
              );
            })}

          {visible.traces && [0,1,2,3].map(i=>(
            <path
              key={`trace-${i}`}
              d={tracePath(i)}
              fill="none"
              stroke={COLORS[i]}
              strokeWidth="2"
              strokeOpacity=".65"
            />
          ))}

          {displayPoints && visible.verticals &&
            displayPoints.map((p,i) => {
              const opacity = outerOpacity(i);

              if (opacity <= 0.001) return null;

              return segment([p[0],p[1],0],p,{
                key:`vertical-${i}`,
                stroke:COLORS[i],
                strokeOpacity:.7 * opacity,
                strokeWidth:1.5,
                strokeDasharray:'6 5',
              });
            })
          }

          {displayPoints && visible.edges &&
            EDGES.map(([i,j]) => {
              const touchesOrigin =
                !endpointForRendering ||
                i === endpointForRendering.originIndex ||
                j === endpointForRendering.originIndex;

              const opacity = touchesOrigin
                ? 0.86
                : 0.86 * outerEdgeOpacity;

              if (opacity <= 0.001) return null;

              return segment(
                displayPoints[i],
                displayPoints[j],
                {
                  key:`edge-${i}-${j}`,
                  stroke:'#f1e7d0',
                  strokeOpacity:opacity,
                  strokeWidth:2.3,
                  strokeLinecap:'round',
                }
              );
            })
          }

          {displayPoints && visible.plane &&
            displayPoints.map((p,i) => {
              const opacity = outerOpacity(i);

              if (opacity <= 0.001) return null;

              const [x,y] = project([p[0],p[1],0]);

              return (
                <circle
                  key={`base-${i}`}
                  cx={x}
                  cy={y}
                  r="4"
                  fill="none"
                  stroke={COLORS[i]}
                  strokeOpacity={opacity}
                  strokeWidth="2"
                />
              );
            })
          }

          {displayPoints && displayPoints.map((p,i) => {
            const opacity = outerOpacity(i);

            if (opacity <= 0.001) return null;

            const [x,y] = project(p);

            return (
              <g key={`root-${i}`} opacity={opacity}>
                <circle
                  cx={x}
                  cy={y}
                  r="5.5"
                  stroke="#111"
                  strokeWidth="1"
                  fill={COLORS[i]}
                />

                {visible.labels && (
                  <text
                    x={x+10}
                    y={y-10}
                    fill={COLORS[i]}
                    fontSize="17"
                    fontWeight="600"
                  >
                    ж{i+1}
                  </text>
                )}
              </g>
            );
          })}

          {segment([0,0,0],[0,0,5],{
            stroke:'#efc47b',
            strokeWidth:1.5,
            strokeDasharray:'4 4',
          })}
        </svg>

        <div style={{
          position:'absolute',
          bottom:8,
          left:14,
          fontSize:12,
          opacity:.8,
          pointerEvents:'none',
        }}>
          Drag to rotate · Scroll to zoom ·
          Traces extend to both infinity endpoints
        </div>
      </div>

      <div style={{
        display:'flex',
        justifyContent:'center',
        gap:12,
        flexWrap:'wrap',
        padding:'6px 12px',
        fontSize:13,
      }}>
        <span>Lift: (Re ж, Im ж, |ж|²)</span>
        <span>
          Signed volume: {
            volume === null ? '—' : volume.toPrecision(11)
          }
        </span>
      </div>

      <div style={{
        display:'flex',
        justifyContent:'center',
        gap:12,
        flexWrap:'wrap',
        padding:'6px 12px 10px',
        fontSize:12,
      }}>
        {OPTIONS.map(([key,label])=>(
          <label key={key} style={{whiteSpace:'nowrap'}}>
            <input
              type="checkbox"
              checked={visible[key]}
              onChange={()=>setVisible(v=>({
                ...v,[key]:!v[key],
              }))}
            />
            {' '}{label}
          </label>
        ))}
      </div>
    </div>
  );
}
