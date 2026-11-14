'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { sampleComplexGeometry } from '@/lib/complex-function-geometry';

const WIDTH = 3.4;
const DEPTH = WIDTH * 9 / 16;
// 130 × 74 is the current approved default sampling resolution.
const DEFAULT_RESOLUTION = 320;

function clipTriangle(triangle, limit, lower) {
  const inside = p => lower ? p.value >= limit : p.value <= limit;
  const result = [];
  for (let k = 0; k < triangle.length; k++) {
    const a = triangle[k];
    const b = triangle[(k + 1) % triangle.length];
    if (inside(a)) result.push(a);
    if (inside(a) !== inside(b)) {
      const t = (limit - a.value) / (b.value - a.value);
      result.push({
        x: a.x + t * (b.x - a.x),
        z: a.z + t * (b.z - a.z),
        value: limit,
        color: a.color.clone().lerp(b.color, t)
      });
    }
  }
  return result;
}

function geometryFor({ evaluate, kind, part, domain, heightRange, inverted, resolution }) {
  const selectedResolution = Math.max(
    50, Math.min(512, Math.round(resolution || DEFAULT_RESOLUTION))
  );

  // Phase coloring has finer spatial structure than the
  // surface-height plot, particularly near zeros and poles.
  // Sample it at twice the selected resolution in each
  // direction, without changing the mathematical domain.
  const NX = kind === 'phase'
    ? Math.min(1024, 2 * selectedResolution)
    : selectedResolution;

  const NY = Math.max(1, Math.round(NX * 9 / 16));
  const vertices = Array.from({ length: (NX + 1) * (NY + 1) });
  const reusable = new THREE.Color();
  const low = new THREE.Color('#a85a12');
  const mid = new THREE.Color('#d8891c');
  const high = new THREE.Color('#f2d24f');
  for (let j = 0; j <= NY; j++) {
    const v = j / NY;
    const im = domain * (9 / 16) * (1 - 2 * v);
    for (let i = 0; i <= NX; i++) {
      const u = i / NX;
      const re = domain * (2 * u - 1);
      const sample = sampleComplexGeometry(evaluate, re, im, inverted);
      if (!sample) continue;
      let surfaceValue;

      if (part === 're') {
        surfaceValue = sample.re;
      } else if (part === 'im') {
        surfaceValue = sample.im;
      } else if (part === 'abs') {
        surfaceValue = Math.hypot(sample.re, sample.im);
      } else if (part === 'logabs') {
        surfaceValue = sample.logAbs;
      } else if (part === 'derivative') {
        // Symmetric numerical derivative along the real axis.
        const h = Math.max(1e-6, domain / NX * 0.12);

        const minus = sampleComplexGeometry(
          evaluate, re - h, im, inverted
        );
        const plus = sampleComplexGeometry(
          evaluate, re + h, im, inverted
        );

        surfaceValue = minus && plus
          ? Math.hypot(
              plus.re - minus.re,
              plus.im - minus.im
            ) / (2 * h)
          : NaN;
      } else {
        surfaceValue = sample.re;
      }

      const value = kind === 'phase'
        ? 1.05 * Math.tanh((sample.logAbs / Math.LN10) / 1.8)
        : surfaceValue;
      if (!Number.isFinite(value)) continue;
      let color;
      let phaseColor = null;

      if (kind === 'phase') {
        if (sample.logAbs === -Infinity) {
          color = new THREE.Color('#252525');
          phaseColor = color.clone();
        } else {
          const hue = ((sample.arg / (2 * Math.PI) + 1) % 1 + 1) % 1;

          // Pure phase: hue varies, mathematical lightness
          // stays constant.
          phaseColor = reusable.setHSL(
            hue, 0.78, 0.5, THREE.SRGBColorSpace
          ).clone();

          // Enhanced domain coloring: identical hue,
          // with magnitude-dependent lightness.
          const domainLightness = 0.42 + 0.25 * Math.tanh(
            (sample.logAbs / Math.LN10) / 1.8
          );

          color = reusable.setHSL(
            hue, 0.78, domainLightness, THREE.SRGBColorSpace
          ).clone();
        }
      } else {
        const t = Math.max(0, Math.min(1, (value / heightRange + 1) / 2));
        color = t < 0.5 ? low.clone().lerp(mid, 2 * t) : mid.clone().lerp(high, 2 * t - 1);
      }
      vertices[j * (NX + 1) + i] = {
        x: (u - 0.5) * WIDTH,
        z: (v - 0.5) * DEPTH,
        value,
        color,
        phaseColor
      };
    }
  }

  const xyz = [];
  const rgb = [];
  const phaseRgb = kind === 'phase' ? [] : null;
  // Deduplicate actual rendered phase vertices.
  const phaseVertices = kind === 'phase' ? new Set() : null;
  function emit(a, b, c) {
    for (const p of [a, b, c]) {
      if (phaseVertices) phaseVertices.add(p);
      xyz.push(p.x, kind === 'phase' ? p.value : 1.05 * p.value / heightRange, p.z);
      rgb.push(p.color.r, p.color.g, p.color.b);

      if (phaseRgb) {
        phaseRgb.push(
          p.phaseColor.r,
          p.phaseColor.g,
          p.phaseColor.b
        );
      }
    }
  }
  for (let j = 0; j < NY; j++) {
    for (let i = 0; i < NX; i++) {
      const a = vertices[j * (NX + 1) + i];
      const b = vertices[j * (NX + 1) + i + 1];
      const c = vertices[(j + 1) * (NX + 1) + i];
      const d = vertices[(j + 1) * (NX + 1) + i + 1];
      for (const tri of [[a, b, c], [b, d, c]]) {
        if (tri.some(p => !p)) continue;
        let polygon = tri;
        if (kind === 'surface') {
          polygon = clipTriangle(polygon, -heightRange, true);
          if (polygon.length < 3) continue;
          polygon = clipTriangle(polygon, heightRange, false);
        }
        for (let k = 1; k + 1 < polygon.length; k++) {
          emit(polygon[0], polygon[k], polygon[k + 1]);
        }
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(xyz, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(rgb, 3));
  if (xyz.length) geometry.computeVertexNormals();

  if (phaseVertices) {
    // Both palettes belong to the same mathematical mesh.
    // Switching palettes never changes its geometry.
    geometry.userData.domainColors =
      geometry.getAttribute('color').array.slice();

    geometry.userData.phaseColors =
      new Float32Array(phaseRgb);

    const points = new Float32Array(phaseVertices.size * 3);
    let offset = 0;
    for (const p of phaseVertices) {
      points[offset++] = p.x;
      points[offset++] = p.value;
      points[offset++] = p.z;
    }
    geometry.userData.phaseProjectionPoints = points;
  }

  return geometry;
}

// Exact intersections with the rendered (already clipped) triangles.
// Both contour and coordinate-grid segments therefore lie ON the surface,
// including near poles and the specified height cutoff.
function surfaceOverlayGeometry(meshGeometry, mode) {
  const positions = meshGeometry.getAttribute('position');
  const segments = [];
  if (!positions) return new THREE.BufferGeometry();
  const levels = mode === 'contours'
    ? Array.from({ length: 9 }, (_, i) => (i - 4) * 1.05 / 5)
    : null;
  const xGrid = mode === 'grid'
    ? Array.from({ length: 11 }, (_, i) => WIDTH * (i - 5) / 10)
    : null;
  const zGrid = mode === 'grid'
    ? Array.from({ length: 7 }, (_, i) => DEPTH * (i - 3) / 6)
    : null;
  const epsilon = 1e-8;

  // Do not project a drawn line onto the mesh. Derive its exact
  // endpoints by intersecting the existing triangle edges.
  const section = (triangle, axis, level) => {
    const hits = [];
    for (let edge = 0; edge < 3; edge++) {
      const a = triangle[edge];
      const b = triangle[(edge + 1) % 3];
      const delta = b[axis] - a[axis];
      if (Math.abs(delta) < epsilon) continue;
      const t = (level - a[axis]) / delta;
      if (t < -epsilon || t > 1 + epsilon) continue;
      const u = Math.max(0, Math.min(1, t));
      const hit = [
        a[0] + (b[0] - a[0]) * u,
        a[1] + (b[1] - a[1]) * u,
        a[2] + (b[2] - a[2]) * u
      ];
      if (!hits.some(p =>
        Math.hypot(p[0] - hit[0], p[1] - hit[1], p[2] - hit[2]) < epsilon
      )) hits.push(hit);
    }
    if (hits.length < 2) return;
    let ia = 0, ib = 1, maxDistance = 0;
    for (let i = 0; i < hits.length; i++) {
      for (let j = i + 1; j < hits.length; j++) {
        const d = Math.hypot(
          hits[i][0] - hits[j][0],
          hits[i][1] - hits[j][1],
          hits[i][2] - hits[j][2]
        );
        if (d > maxDistance) { maxDistance = d; ia = i; ib = j; }
      }
    }
    if (maxDistance > epsilon) segments.push(...hits[ia], ...hits[ib]);
  };

  for (let i = 0; i + 2 < positions.count; i += 3) {
    const triangle = [i, i + 1, i + 2].map(k => [
      positions.getX(k), positions.getY(k), positions.getZ(k)
    ]);
    if (mode === 'contours') {
      const bottom = Math.min(...triangle.map(p => p[1]));
      const top = Math.max(...triangle.map(p => p[1]));
      for (const level of levels) {
        if (level >= bottom - epsilon && level <= top + epsilon) {
          section(triangle, 1, level);
        }
      }
    } else {
      const xmin = Math.min(...triangle.map(p => p[0]));
      const xmax = Math.max(...triangle.map(p => p[0]));
      const zmin = Math.min(...triangle.map(p => p[2]));
      const zmax = Math.max(...triangle.map(p => p[2]));
      for (const x of xGrid) {
        if (x >= xmin - epsilon && x <= xmax + epsilon) {
          section(triangle, 0, x);
        }
      }
      for (const z of zGrid) {
        if (z >= zmin - epsilon && z <= zmax + epsilon) {
          section(triangle, 2, z);
        }
      }
    }
  }
  const result = new THREE.BufferGeometry();
  result.setAttribute('position', new THREE.Float32BufferAttribute(segments, 3));
  return result;
}

// Both phase overlays are derived from the exact triangles
// currently rendered. Each overlay is cached per mesh geometry.
function ensurePhaseOverlay(runtime, mode) {
  const isGrid = mode === 'grid';

  const lines = isGrid
    ? runtime.surfaceGridLines
    : runtime.contourLines;

  const cacheKey = isGrid
    ? 'phaseGridSource'
    : 'phaseContourSource';

  if (runtime[cacheKey] === runtime.mesh.geometry) {
    return;
  }

  const replacement = surfaceOverlayGeometry(
    runtime.mesh.geometry,
    mode
  );

  const previous = lines.geometry;

  lines.geometry = replacement;
  runtime[cacheKey] = runtime.mesh.geometry;

  previous.dispose();
}

// Show the actual plotted expression in the fullscreen header.
// This is a read-only MathLive field, not a second editor.
function PlottedFunctionLabel({ latex }) {
  const hostRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let field = null;

    import('mathlive').then(({ MathfieldElement }) => {
      if (cancelled || !hostRef.current) return;

      field = new MathfieldElement();
      field.readOnly = true;
      field.mathVirtualKeyboardPolicy = 'manual';
      field.tabIndex = -1;
      field.value = latex;

      field.style.cssText = [
        'display:inline-block',
        'width:auto',
        'max-width:100%',
        'min-height:0',
        'height:auto',
        'margin:0',
        'padding:0',
        'border:0',
        'outline:0',
        'background:transparent',
        'color:#eaf0f9',
        'font-size:16px',
        'pointer-events:none'
      ].join(';');

      hostRef.current.replaceChildren(field);
    }).catch(error => {
      if (!cancelled) {
        console.error(
          'Fullscreen function label unavailable:',
          error
        );
      }
    });

    return () => {
      cancelled = true;
      field?.remove();
    };
  }, [latex]);

  return (
    <span
      ref={hostRef}
      aria-label={`Plotted function: ${latex}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        minWidth: 0,
        maxWidth: '100%',
        overflow: 'hidden'
      }}
    />
  );
}

// Shared mathematical notation for graph mode labels.
function GraphModeLabel({ value, label }) {
  if (!['abs', 'logabs', 'derivative'].includes(value)) {
    return label;
  }

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'baseline',
      justifyContent: 'center',
      gap: 2,
      whiteSpace: 'nowrap',
      fontSize: 14,
      lineHeight: 1
    }}>
      {value === 'logabs' && (
        <span style={{ marginRight: 3 }}>log</span>
      )}

      <span>|</span>

      <i style={{
        fontWeight: 400,
        marginLeft: 2,
        marginRight: 2
      }}>
        f
      </i>

      {value === 'derivative' && (
        <span style={{
          fontFamily: "'Times New Roman', Times, serif",
          fontSize: 14,
          fontWeight: 400,
          fontStyle: 'normal',
          lineHeight: 1,
          marginLeft: 2,
          position: 'relative',
          top: -3
        }}>
          ′
        </span>
      )}

      <span>|</span>
    </span>
  );
}

export default function FunctionGeometryViewer({
  evaluate, kind, part, domain, heightRange, inverted,
  planeMode = 'domain', compactSurfaceButtons = false,
  compactHeader = false, headerOptions = null,
  selectedHeaderOption, onHeaderOptionChange,
  is3D, showGrid, lineMode = 'contours', surfaceColor = '#FFAC0A',
  lightDirection, lightElevation,
  lightOrbit, resolution = DEFAULT_RESOLUTION,
  ambientStrength = 0.65, lightStrength = 2.4,
  onPartChange, onModeChange, cameraLink, viewId, headerAccessory,
  onClose,
  onFullscreenSettingsHostChange,
  functionLatex = '',
  zoomStops = 0,
  zoomFactor = 1,
  onZoomStopsChange,
  zoomPlaying = false
}) {
  const hostRef = useRef(null);
  const panelRef = useRef(null);
  const runtimeRef = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [axisView, setAxisView] = useState(null);
  const [resetCount, setResetCount] = useState(0);
  const axisRef = useRef(null);
  const cameraBridgeRef = useRef(null);
  const linkId = viewId || kind;

  const selectAxis = axis => {
    axisRef.current = axis;
    setAxisView(axis);
  };

  const publishCamera = (mode = null, axis = undefined) => {
    const link = cameraLink;
    const bridge = cameraBridgeRef.current;
    if (!link || !bridge) return;

    link.lastMoved = linkId;
    link.driver = linkId;
    if (!link.locked) return;

    link.movedWhileLocked = true;

    const snapshot = bridge.read();

    if (mode !== null) snapshot.is3D = mode;
    if (axis !== undefined) snapshot.axis = axis;

    for (const [id, other] of Object.entries(link.views)) {
      if (id !== linkId) other.follow(snapshot);
    }
  };

  // Escape closes the expanded graph without resetting its state.
  useEffect(() => {
    if (!expanded) return undefined;

    const onEscape = event => {
      if (event.key !== 'Escape') return;

      event.preventDefault();
      setExpanded(false);
    };

    document.addEventListener('keydown', onEscape);

    return () => {
      document.removeEventListener('keydown', onEscape);
    };
  }, [expanded]);



  // Position fullscreen beside the actual sidebar boundary.
  // Do not move or remount the WebGL canvas.
  useLayoutEffect(() => {
    if (!expanded) return undefined;

    const panel = panelRef.current;
    if (!panel) return undefined;

    const sidebar = document.querySelector('.sidebar');

    const reposition = () => {
      // A transformed layout ancestor may establish the
      // containing block for position:fixed. Determine its
      // viewport offset rather than assuming it is zero.
      const specifiedLeft =
        Number.parseFloat(panel.style.left) || 12;

      const fixedOrigin =
        panel.getBoundingClientRect().left - specifiedLeft;

      const sidebarRight = sidebar
        ? Math.max(0, sidebar.getBoundingClientRect().right)
        : 0;

      const targetLeft = Math.max(
        12,
        sidebarRight + 12 - fixedOrigin
      );

      panel.style.left = `${targetLeft}px`;
    };

    reposition();

    const observer = new ResizeObserver(reposition);
    if (sidebar) observer.observe(sidebar);

    const mutations = new MutationObserver(reposition);
    if (sidebar) {
      mutations.observe(sidebar, {
        attributes: true,
        attributeFilter: ['class', 'style']
      });
      sidebar.addEventListener('transitionend', reposition);
    }

    window.addEventListener('resize', reposition);

    return () => {
      observer.disconnect();
      mutations.disconnect();
      sidebar?.removeEventListener('transitionend', reposition);
      window.removeEventListener('resize', reposition);
      panel.style.left = '';
    };
  }, [expanded]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#101318');
    const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.05, 150);
    camera.position.set(6.4, 4.8, 7.8);
    camera.zoom = 2.35;
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    const flatCamera = new THREE.OrthographicCamera(-1.8, 1.8, 1.1, -1.1, 0.05, 100);
    flatCamera.zoom = 1;
    flatCamera.updateProjectionMatrix();
    flatCamera.position.set(0, 12, 0.0001);
    flatCamera.up.set(0, 0, -1);
    flatCamera.lookAt(0, 0, 0);
    // The temporary camera blends the actual 3D and overhead
    // projections. Neither mathematical mesh is transformed.
    const transitionCamera = camera.clone();

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    // The canvas must not contribute intrinsic height to the
    // plot container. Its parent alone determines layout size.
    renderer.domElement.style.cssText =
      'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none';
    host.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 2.8;
    controls.maxDistance = 35;
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({
      side: THREE.DoubleSide,
      vertexColors: kind === 'phase',
      color: kind === 'surface' ? surfaceColor : '#ffffff',
      roughness: 0.58, metalness: 0,
      polygonOffset: true,
      polygonOffsetFactor: 1, polygonOffsetUnits: 1
    }));
    const flatMaterial = new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
      vertexColors: kind === 'phase',
      color: kind === 'surface' ? surfaceColor : '#ffffff',
      polygonOffset: true,
      polygonOffsetFactor: 1, polygonOffsetUnits: 1
    });
    const litMaterial = mesh.material;
    scene.add(mesh);
    const contourLines = new THREE.LineSegments(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({
        color: kind === 'phase' ? '#101827' : '#241609',
        transparent: true,
        opacity: 0.88,
        depthTest: true,
        depthWrite: false
      })
    );
    const surfaceGridLines = new THREE.LineSegments(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({
        color: kind === 'phase' ? '#101827' : '#241609',
        transparent: true,
        opacity: 0.83,
        depthTest: true,
        depthWrite: false
      })
    );
    contourLines.renderOrder = 1;
    surfaceGridLines.renderOrder = 1;
    scene.add(contourLines, surfaceGridLines);
    const ambient = new THREE.AmbientLight('#ffffff', ambientStrength);
    const light = new THREE.DirectionalLight('#ffffff', lightStrength);
    scene.add(ambient, light);

    const resize = () => {
      const w = Math.max(1, host.clientWidth);
      const h = Math.max(1, host.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      const halfHeight = Math.max(DEPTH / 2, WIDTH / (2 * (w / h))) * 1.03;
      flatCamera.left = -halfHeight * w / h;
      flatCamera.right = halfHeight * w / h;
      flatCamera.top = halfHeight;
      flatCamera.bottom = -halfHeight;
      flatCamera.updateProjectionMatrix();
      if (runtimeRef.current?.transition) {
        const active = runtimeRef.current;
        active.transition.toProjection.copy(
          active.is3D
            ? active.camera.projectionMatrix
            : flatCamera.projectionMatrix
        );
      }
      renderer.setSize(w, h, false);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    const runtime = {
      scene, renderer, camera, flatCamera, transitionCamera,
      controls, mesh, contourLines, surfaceGridLines,
      phaseGridSource: null,
      phaseContourSource: null,
      ambient, light, litMaterial, flatMaterial,
      is3D, transition: null,
      lightingState: null,
      saved3D: {
        position: camera.position.clone(),
        quaternion: camera.quaternion.clone(),
        up: camera.up.clone(),
        zoom: camera.zoom,
        target: controls.target.clone()
      }
    };
    runtime.mesh.material = is3D ? litMaterial : flatMaterial;
    controls.object = is3D ? camera : flatCamera;
    controls.enableRotate = is3D;
    runtimeRef.current = runtime;

    const readView = () => {
      const pose = runtime.is3D ? {
        position: camera.position.toArray(),
        quaternion: camera.quaternion.toArray(),
        up: camera.up.toArray(),
        zoom: camera.zoom,
        target: controls.target.toArray()
      } : {
        position: runtime.saved3D.position.toArray(),
        quaternion: runtime.saved3D.quaternion.toArray(),
        up: runtime.saved3D.up.toArray(),
        zoom: runtime.saved3D.zoom,
        target: runtime.saved3D.target.toArray()
      };

      return {
        is3D: runtime.is3D,
        axis: axisRef.current,
        threeD: pose,
        flat: {
          position: flatCamera.position.toArray(),
          quaternion: flatCamera.quaternion.toArray(),
          up: flatCamera.up.toArray(),
          zoom: flatCamera.zoom,
          target: runtime.is3D
            ? [0, 0, 0]
            : controls.target.toArray()
        }
      };
    };

    const followView = snapshot => {
      if (!snapshot) return;

      runtime.applyingLinkedView = true;
      try {
        const pose = snapshot.threeD;

        runtime.saved3D = {
          position: new THREE.Vector3().fromArray(pose.position),
          quaternion: new THREE.Quaternion().fromArray(pose.quaternion),
          up: new THREE.Vector3().fromArray(pose.up),
          zoom: pose.zoom,
          target: new THREE.Vector3().fromArray(pose.target)
        };

        if (snapshot.is3D !== runtime.is3D) {
          // Keep the existing animated 2D/3D transition.
          runtime.pendingLinkedView = snapshot;
          onModeChange?.(snapshot.is3D);
        } else {
          runtime.pendingLinkedView = null;
          runtime.transition = null;

          const active = snapshot.is3D
            ? pose
            : snapshot.flat;

          const activeCamera = snapshot.is3D
            ? camera
            : flatCamera;

          activeCamera.position.fromArray(active.position);
          activeCamera.quaternion.fromArray(active.quaternion);
          activeCamera.up.fromArray(active.up);
          activeCamera.zoom = active.zoom;
          activeCamera.updateProjectionMatrix();

          controls.object = activeCamera;
          controls.enabled = true;
          controls.enableRotate = snapshot.is3D;

          const damping = controls.enableDamping;
          controls.enableDamping = false;
          controls.target.fromArray(active.target);
          controls.update();
          controls.enableDamping = damping;

          runtime.mesh.material = snapshot.is3D
            ? litMaterial
            : flatMaterial;
        }

        axisRef.current = snapshot.axis;
        setAxisView(snapshot.axis);
      } finally {
        runtime.applyingLinkedView = false;
      }
    };

    const restoreView = snapshot => {
      if (!snapshot) return;

      // Restore the exact camera snapshot, and explicitly
      // settle the parent viewing mode. This also handles
      // an unfinished or not-yet-committed lock transition.
      followView(snapshot);
      onModeChange?.(snapshot.is3D);
    };

    const bridge = {
      read: readView,
      follow: followView,
      restore: restoreView
    };
    cameraBridgeRef.current = bridge;

    if (cameraLink) {
      cameraLink.views[linkId] = bridge;

      // A viewer mounted after the padlock was engaged
      // joins the existing synchronized camera group.
      if (cameraLink.locked) {
        if (cameraLink.beforeLock) {
          cameraLink.beforeLock[linkId] = bridge.read();
        }

        const leader =
          cameraLink.views[cameraLink.driver] ||
          cameraLink.views.surface;

        if (leader && leader !== bridge) {
          bridge.follow(leader.read());
        }
      }
    }

    const markDragged = () => {
      if (!cameraLink || runtime.applyingLinkedView) return;

      cameraLink.lastMoved = linkId;
      cameraLink.driver = linkId;

      if (cameraLink.locked) {
        cameraLink.movedWhileLocked = true;
      }

      axisRef.current = null;
      setAxisView(null);
    };

    const syncDragged = () => {
      if (
        !cameraLink?.locked ||
        cameraLink.driver !== linkId ||
        runtime.applyingLinkedView ||
        runtime.transition
      ) return;

      const snapshot = readView();

      for (const [id, other] of Object.entries(cameraLink.views)) {
        if (id !== linkId) other.follow(snapshot);
      }
    };

    controls.addEventListener('start', markDragged);
    controls.addEventListener('change', syncDragged);

    let frame;
    const draw = () => {
      frame = requestAnimationFrame(draw);
      // The smooth quintic easing and quaternion interpolation
      // follow PlanckTimeSurface. The active projection morphs
      // perspective-to-orthographic over 1.15 seconds.
      let displayCamera;
      const motion = runtime.transition;
      if (motion) {
        const t = Math.min(1,
          (performance.now() - motion.start) / 1150
        );
        const eased = t * t * t * (t * (t * 6 - 15) + 10);
        const rotating = transitionCamera;
        const orientation = motion.fromQuaternion.clone()
          .slerp(motion.toQuaternion, eased);
        const target = motion.fromTarget.clone()
          .lerp(motion.toTarget, eased);
        motion.currentTarget.copy(target);
        const distance = THREE.MathUtils.lerp(
          motion.fromRadius, motion.toRadius, eased
        );
        rotating.quaternion.copy(orientation);
        rotating.position.copy(target).addScaledVector(
          new THREE.Vector3(0, 0, 1).applyQuaternion(orientation),
          distance
        );
        const a = motion.fromProjection.elements;
        const b = motion.toProjection.elements;
        const elements = rotating.projectionMatrix.elements;
        for (let i = 0; i < 16; i++) {
          elements[i] = THREE.MathUtils.lerp(a[i], b[i], eased);
        }
        rotating.projectionMatrixInverse
          .copy(rotating.projectionMatrix).invert();
        rotating.updateMatrixWorld(true);
        displayCamera = rotating;

        if (t === 1) {
          runtime.transition = null;
          controls.object = runtime.is3D ? camera : flatCamera;
          controls.target.copy(motion.toTarget);
          controls.enableRotate = runtime.is3D;
          controls.enableDamping = true;
          controls.enabled = true;
          controls.update();
          runtime.mesh.material = runtime.is3D
            ? litMaterial : flatMaterial;
          // Exactly matching endpoint cameras: no last-frame snap.
          displayCamera = runtime.is3D ? camera : flatCamera;
        }
      } else {
        // Identical OrbitControls behavior for both viewers.
        // Never change the projection matrix during dragging.
        controls.update();
        displayCamera = runtime.is3D ? camera : flatCamera;
      }

      // Same inclined circular light orbit as PlanckTimeSurface.
      const lighting = runtime.lightingState;
      if (lighting) {
        const orbit = lighting.orbit;
        const angle = (
          lighting.direction + orbit.phase +
          (orbit.period > 0 && orbit.anchor > 0
            ? 360 * (performance.now() - orbit.anchor) /
                (orbit.period * 1000)
            : 0)
        ) * Math.PI / 180;
        const tilt = lighting.elevation * Math.PI / 180;
        const radius = Math.sqrt(146);
        const base = Math.atan2(-4, 7);
        if (orbit.period > 0) {
          const east = Math.cos(angle);
          const north = Math.cos(tilt) * Math.sin(angle);
          const up = Math.sin(tilt) * Math.sin(angle);
          light.position.set(
            radius * (Math.sin(base) * east - Math.cos(base) * north),
            radius * up,
            radius * (Math.cos(base) * east + Math.sin(base) * north)
          );
        } else {
          const horizontal = radius * Math.cos(tilt);
          const bearing = base - angle;
          light.position.set(
            horizontal * Math.sin(bearing),
            radius * Math.sin(tilt),
            horizontal * Math.cos(bearing)
          );
        }
      }

      renderer.render(scene, displayCamera);
    };
    draw();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.removeEventListener('start', markDragged);
      controls.removeEventListener('change', syncDragged);

      if (cameraLink?.views[linkId] === bridge) {
        delete cameraLink.views[linkId];
      }

      if (cameraBridgeRef.current === bridge) {
        cameraBridgeRef.current = null;
      }

      controls.dispose();
      mesh.geometry.dispose();
      for (const lines of [contourLines, surfaceGridLines]) {
        lines.geometry.dispose();
        lines.material.dispose();
      }
      litMaterial.dispose();
      flatMaterial.dispose();

      renderer.dispose();

      // Release the browser's WebGL context when this graph
      // is removed. Disposing Three.js resources alone does
      // not immediately release the underlying context.
      // A restored graph receives a new renderer and context.
      renderer.forceContextLoss();

      renderer.domElement.remove();
      if (runtimeRef.current === runtime) runtimeRef.current = null;
    };
  }, []);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    const rebuildStart = performance.now();
    const next = geometryFor({ evaluate, kind, part, domain, heightRange, inverted, resolution });
    const meshMs = performance.now() - rebuildStart;
    const previous = runtime.mesh.geometry;
    runtime.mesh.geometry = next;
    // A new mathematical mesh invalidates both overlay caches.
    // Generate only the overlay that is actually visible.
    runtime.phaseGridSource = null;
    runtime.phaseContourSource = null;

    const activeMode = lineMode === 'none'
      ? 'none'
      : kind === 'phase'
        ? (showGrid ? 'grid' : 'contours')
        : lineMode;

    const overlayStart = performance.now();

    if (activeMode !== 'none') {
      ensurePhaseOverlay(runtime, activeMode);
    }

    const overlayMs = performance.now() - overlayStart;
    runtime.contourLines.visible = activeMode === 'contours';
    runtime.surfaceGridLines.visible = activeMode === 'grid';

    // Measure the real cost while playback is running.
    if (
      zoomPlaying &&
      performance.now() - (runtime.lastPerformanceReport || 0) >= 2000
    ) {
      const totalMs = performance.now() - rebuildStart;

      console.info(
        '[Geometry playback]',
        viewId || kind,
        'mesh:', meshMs.toFixed(1) + 'ms',
        'overlay:', overlayMs.toFixed(1) + 'ms',
        'total:', totalMs.toFixed(1) + 'ms',
        'resolution:', resolution
      );

      runtime.lastPerformanceReport = performance.now();
    }

    previous.dispose();
  }, [evaluate, kind, part, domain, heightRange, inverted, resolution]);

  // Switching Phase/Domain changes vertex colors only.
  // No mesh rebuilding, contour regeneration, camera
  // movement, or lighting updates are necessary.
  useEffect(() => {
    if (kind !== 'phase') return;

    const geometry = runtimeRef.current?.mesh.geometry;
    if (!geometry) return;

    const colors = geometry.getAttribute('color');

    const palette = planeMode === 'phase'
      ? geometry.userData.phaseColors
      : geometry.userData.domainColors;

    if (
      !colors ||
      !palette ||
      colors.array.length !== palette.length
    ) return;

    colors.array.set(palette);
    colors.needsUpdate = true;
  }, [
    kind, planeMode, evaluate, part,
    domain, heightRange, inverted, resolution
  ]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    const activeMode = lineMode === 'none'
      ? 'none'
      : kind === 'phase'
        ? (showGrid ? 'grid' : 'contours')
        : lineMode;

    if (activeMode !== 'none') {
      ensurePhaseOverlay(runtime, activeMode);
    }

    runtime.contourLines.visible = activeMode === 'contours';
    runtime.surfaceGridLines.visible = activeMode === 'grid';
  }, [kind, lineMode, showGrid]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime || kind !== 'surface') return;
    runtime.litMaterial.color.set(surfaceColor);
    runtime.flatMaterial.color.set(surfaceColor);
  }, [surfaceColor, kind]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime || runtime.is3D === is3D) return;
    const { camera, flatCamera, controls, transitionCamera } = runtime;

    // Capture the precise 3D pose before moving overhead.
    if (!is3D) {
      runtime.saved3D = {
        position: camera.position.clone(),
        quaternion: camera.quaternion.clone(),
        up: camera.up.clone(),
        zoom: camera.zoom,
        target: controls.target.clone()
      };
      flatCamera.position.set(0, 12, 0.0001);
      flatCamera.up.set(0, 0, -1);
      flatCamera.lookAt(0, 0, 0);
      flatCamera.updateProjectionMatrix();
    } else {
      // Restore the exact pre-2D view, not a default angle.
      const saved = runtime.saved3D;
      camera.position.copy(saved.position);
      camera.quaternion.copy(saved.quaternion);
      camera.up.copy(saved.up);
      camera.zoom = saved.zoom;
      camera.updateProjectionMatrix();
    }

    // Preserve the visible source camera independently of
    // any new synchronized destination pose.
    const source = (runtime.transition
      ? transitionCamera
      : runtime.is3D ? camera : flatCamera).clone();
    const fromTarget = runtime.transition
      ? runtime.transition.currentTarget.clone()
      : controls.target.clone();
    source.updateMatrixWorld(true);

    if (runtime.pendingLinkedView) {
      const linked = runtime.pendingLinkedView;
      const pose = linked.threeD;

      camera.position.fromArray(pose.position);
      camera.quaternion.fromArray(pose.quaternion);
      camera.up.fromArray(pose.up);
      camera.zoom = pose.zoom;
      camera.updateProjectionMatrix();

      runtime.saved3D = {
        position: camera.position.clone(),
        quaternion: camera.quaternion.clone(),
        up: camera.up.clone(),
        zoom: camera.zoom,
        target: new THREE.Vector3().fromArray(pose.target)
      };

      if (!is3D) {
        flatCamera.position.fromArray(linked.flat.position);
        flatCamera.quaternion.fromArray(linked.flat.quaternion);
        flatCamera.up.fromArray(linked.flat.up);
        flatCamera.zoom = linked.flat.zoom;
        flatCamera.updateProjectionMatrix();
      }

      runtime.pendingLinkedView = null;
    }

    const dest = is3D ? camera : flatCamera;
    dest.updateMatrixWorld(true);
    const toTarget = is3D
      ? runtime.saved3D.target.clone()
      : new THREE.Vector3(0, 0, 0);

    runtime.transition = {
      start: performance.now(),
      fromQuaternion: source.quaternion.clone(),
      toQuaternion: dest.quaternion.clone(),
      fromRadius: source.position.distanceTo(fromTarget),
      toRadius: dest.position.distanceTo(toTarget),
      fromTarget,
      toTarget,
      currentTarget: fromTarget.clone(),
      fromProjection: source.projectionMatrix.clone(),
      toProjection: dest.projectionMatrix.clone()
    };
    runtime.is3D = is3D;

    // Restore shading immediately when returning to 3D.
    // Keep shading during the movement toward 2D;
    // the existing transition endpoint removes it.
    if (is3D) {
      runtime.mesh.material = runtime.litMaterial;
    }

    controls.enableDamping = false;
    controls.enabled = false;
  }, [is3D, kind]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    runtime.ambient.intensity = ambientStrength;
    runtime.light.intensity = lightStrength;
    runtime.lightingState = {
      direction: lightDirection,
      elevation: lightElevation,
      orbit: lightOrbit ?? { period: 0, phase: 0, anchor: 0 }
    };
  }, [showGrid, lightDirection, lightElevation,
      lightOrbit, ambientStrength, lightStrength]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime || resetCount === 0) return;
    runtime.transition = null;
    runtime.camera.position.set(6.4, 4.8, 7.8);
    runtime.camera.up.set(0, 1, 0);
    runtime.camera.zoom = 2.35;
    runtime.camera.lookAt(0, 0, 0);
    runtime.camera.updateProjectionMatrix();
    runtime.saved3D = {
      position: runtime.camera.position.clone(),
      quaternion: runtime.camera.quaternion.clone(),
      up: runtime.camera.up.clone(),
      zoom: runtime.camera.zoom,
      target: new THREE.Vector3()
    };
    runtime.flatCamera.position.set(0, 12, 0.0001);
    runtime.flatCamera.up.set(0, 0, -1);
    runtime.flatCamera.lookAt(0, 0, 0);
    runtime.flatCamera.zoom = 1;
    runtime.flatCamera.updateProjectionMatrix();
    runtime.controls.object = runtime.is3D
      ? runtime.camera : runtime.flatCamera;
    runtime.controls.target.set(0, 0, 0);
    runtime.controls.enableRotate = runtime.is3D;
    runtime.controls.enableDamping = true;
    runtime.controls.enabled = true;
    if (cameraLink) {
      cameraLink.lastMoved = linkId;
      cameraLink.driver = linkId;
    }

    selectAxis(null);
    runtime.controls.update();
    runtime.mesh.material = runtime.is3D
      ? runtime.litMaterial : runtime.flatMaterial;

    publishCamera();
  }, [resetCount]);

  // The complex plane occupies world X/Z; world Y is
  // the function-height direction. Looking along +X or
  // +Z gives the two side views requested.
  const viewAlongAxis = axis => {
    const runtime = runtimeRef.current;
    if (!runtime) return;

    const {
      camera, flatCamera, transitionCamera, controls
    } = runtime;

    // Preserve the currently visible pose, including an
    // interrupted 2D/3D camera transition.
    const source = runtime.transition
      ? transitionCamera
      : runtime.is3D ? camera : flatCamera;

    const fromTarget = runtime.transition
      ? runtime.transition.currentTarget.clone()
      : controls.target.clone();

    source.updateMatrixWorld(true);

    const fromQuaternion = source.quaternion.clone();
    const fromProjection = source.projectionMatrix.clone();
    const fromRadius =
      source.position.distanceTo(fromTarget);

    const toTarget = new THREE.Vector3(0, 0, 0);
    const direction = axis === 'x'
      ? new THREE.Vector3(1, 0, 0)
      : axis === 'y'
        ? new THREE.Vector3(0, 0, 1)
        : new THREE.Vector3(6.4, 4.8, 7.8).normalize();

    const radius = camera.position.distanceTo(
      controls.target
    );

    camera.position.copy(toTarget).addScaledVector(
      direction, radius
    );
    camera.up.set(0, 1, 0);
    camera.lookAt(toTarget);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);

    // Save the new axis view so the established 2D/3D
    // buttons can still restore the current 3D orientation.
    runtime.saved3D = {
      position: camera.position.clone(),
      quaternion: camera.quaternion.clone(),
      up: camera.up.clone(),
      zoom: camera.zoom,
      target: toTarget.clone()
    };

    runtime.transition = {
      start: performance.now(),
      fromQuaternion,
      toQuaternion: camera.quaternion.clone(),
      fromRadius,
      toRadius: radius,
      fromTarget,
      toTarget,
      currentTarget: fromTarget.clone(),
      fromProjection,
      toProjection: camera.projectionMatrix.clone()
    };

    runtime.is3D = true;
    runtime.mesh.material = runtime.litMaterial;

    controls.enableDamping = false;
    controls.enabled = false;

    selectAxis(axis === 'default' ? null : axis);
    onModeChange?.(true);
    publishCamera(true, axis === 'default' ? null : axis);
  };

  return (
    <section ref={panelRef} style={{
      position: expanded ? 'fixed' : 'relative',
      inset: expanded ? 12 : undefined,
      zIndex: expanded ? 20000 : undefined,
      background: '#101318',
      border: '1px solid #465a70', borderRadius: 9,
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      minWidth: 0,
      boxShadow: expanded ? '0 0 0 100vmax rgba(0,0,0,.87)' : 'none'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8,
        padding: '7px 9px',
        minHeight: 42,
        boxSizing: 'border-box',
        color: '#eaf0f9',
        background: '#142030',
        fontFamily: "'Times New Roman', Times, serif",
        fontSize: 13
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          minWidth: 0,
          maxWidth: '100%',
          overflow: 'hidden',
          flex: '0 1 auto'
        }}>
          <strong style={{
            whiteSpace: 'nowrap',
            flex: '0 0 auto'
          }}>
            {kind === 'phase' ? (
              'Phase/domain coloring'
            ) : (
              <span style={{
                display: 'inline-flex',
                alignItems: 'baseline',
                gap: 4
              }}>
                <span>Surface:</span>
                <GraphModeLabel
                  value={part}
                  label={
                    part === 're' ? 'Real'
                    : part === 'im' ? 'Imaginary'
                    : ''
                  }
                />
              </span>
            )}
          </strong>

          {expanded && functionLatex && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              minWidth: 0,
              overflow: 'hidden',
              whiteSpace: 'nowrap'
            }}>
              <PlottedFunctionLabel latex={functionLatex} />
            </div>
          )}
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 6,
          flexWrap: 'wrap',
          marginLeft: 'auto'
        }}>
          {headerAccessory}

          {headerOptions?.map(option => (
            <button
              key={option.value}
              type="button"
              title={option.title}
              aria-label={option.title}
              aria-pressed={
                selectedHeaderOption === option.value
              }
              onClick={() =>
                onHeaderOptionChange?.(option.value)
              }
              style={{
                ...headerButton(
                  selectedHeaderOption === option.value
                ),
                ...(option.value === 'abs' ||
                    option.value === 'logabs' ||
                    option.value === 'derivative'
                  ? {
                      fontWeight: 400
                    }
                  : {})
              }}
            >
              <GraphModeLabel
                value={option.value}
                label={option.label}
              />
            </button>
          ))}

          {kind === 'surface' && !compactSurfaceButtons && (
            <>
              <button
                type="button"
                aria-pressed={part === 're'}
                onClick={() => onPartChange?.('re')}
                style={headerButton(part === 're')}
              >
                Re
              </button>

              <button
                type="button"
                aria-pressed={part === 'im'}
                onClick={() => onPartChange?.('im')}
                style={headerButton(part === 'im')}
              >
                Im
              </button>
            </>
          )}

          <button
            type="button"
            aria-pressed={!is3D}
            onClick={() => {
              selectAxis(null);
              onModeChange?.(false);
              publishCamera(false, null);
            }}
            style={headerButton(!is3D)}
          >
            2D
          </button>

          <button
            type="button"
            aria-pressed={is3D && axisView === null}
            onClick={() => viewAlongAxis('default')}
            style={headerButton(is3D && axisView === null)}
          >
            3D
          </button>

          {expanded && (
            <>
              <button
                type="button"
                title="Look along the real-coordinate X axis"
                aria-pressed={is3D && axisView === 'x'}
                onClick={() => viewAlongAxis('x')}
                style={headerButton(is3D && axisView === 'x')}
              >
                X
              </button>

              <button
                type="button"
                title="Look along the imaginary-coordinate Y axis"
                aria-pressed={is3D && axisView === 'y'}
                onClick={() => viewAlongAxis('y')}
                style={headerButton(is3D && axisView === 'y')}
              >
                Y
              </button>
            </>
          )}

          {expanded && (
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              minWidth: 190,
              width: 235,
              height: 32,
              marginRight: 7,
              fontFamily: 'inherit',
              fontSize: 12,
              whiteSpace: 'nowrap'
            }}>
              <span>Scale</span>

              <input
                type="range"
                min="-2"
                max="2"
                step="0.01"
                value={zoomStops}
                aria-label="Fullscreen mathematical function zoom"
                aria-valuetext={`${zoomFactor.toFixed(2)} times`}
                onChange={event =>
                  onZoomStopsChange?.(Number(event.target.value))
                }
                className="graph-lighting-range"
                style={{
                  '--graph-dot-size': '14px',
                  width: '100%',
                  minWidth: 70,
                  flex: '1 1 auto',
                  margin: 0,
                  '--progress': `${(zoomStops + 2) * 25}%`
                }}
              />

              <span style={{
                minWidth: 48,
                textAlign: 'right',
                fontVariantNumeric: 'tabular-nums'
              }}>
                {zoomFactor.toFixed(2)}×
              </span>
            </label>
          )}

          <button
            type="button"
            onClick={() => setResetCount(n => n + 1)}
            style={headerButton(false)}
          >
            Reset
          </button>

          <button
            type="button"
            onClick={() => setExpanded(x => !x)}
            style={headerButton(false)}
          >
            {expanded ? 'Close fullscreen' : 'Fullscreen'}
          </button>
          {expanded && (
            <span
              ref={onFullscreenSettingsHostChange}
              aria-label="Fullscreen visualization settings host"
              style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 34,
                height: 34,
                flex: '0 0 34px'
              }}
            />
          )}
          {onClose && (
            <button
              type="button"
              title="Remove this graph"
              aria-label="Remove this graph"
              onClick={onClose}
              style={{
                ...headerButton(false),
                width: 32,
                minWidth: 32,
                padding: 0,
                fontSize: 18,
                lineHeight: 1
              }}
            >
              ×
            </button>
          )}
        </div>
      </div>
      <div ref={hostRef} style={{
        // The plot area owns its dimensions; the absolutely
        // positioned canvas simply fills this measured area.
        position: 'relative',
        width: '100%',
        minWidth: 0,
        minHeight: 0,
        aspectRatio: expanded ? undefined : '16 / 9',
        flex: expanded ? '1 1 0%' : '0 0 auto'
      }} />
    </section>
  );
}

const toolButton = {
  boxSizing: 'border-box',
  height: 32,
  minHeight: 32,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  border: '1px solid #54677f',
  borderRadius: 6,
  color: '#ecf2fc',
  background: '#0d1420',
  cursor: 'pointer',
  padding: '0 9px',
  fontSize: 12,
  lineHeight: 1,
  fontFamily: "'Times New Roman', Times, serif",
  whiteSpace: 'nowrap'
};

function headerButton(active) {
  return {
    ...toolButton,
    background: active
      ? 'linear-gradient(155deg, rgba(205,225,246,0.25) 0%, rgba(91,115,145,0.13) 42%, rgba(12,19,30,0.92) 100%)'
      : '#0d1420',
    borderColor: active ? '#a6c8ed' : '#54677f',
    boxShadow: active
      ? 'inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(120,155,190,0.12), 0 0 7px rgba(155,195,235,0.12)'
      : 'none',
    color: active ? '#ffffff' : '#ecf2fc',
    fontWeight: active ? 700 : 400
  };
}
