"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { sampleSignedGPhase } from "../g-functions/GFunctionsExplorer";

// Independent fullscreen 3D phase-height viewer.
// Camera/render loop persist while the mathematical domain changes.
export default function PlanckPhaseFullscreen({
  id,
  initialHalfWidth,
  inverted = false,
  zoomLimits,
  initialOrientation = null,
  initialOverhead = false,
  lightDirection = 144,
  lightElevation = 10,
  lightOrbit = null,
  onReset,
  onClose,
}) {
  const hostRef = useRef(null);
  const runtimeRef = useRef(null);
  const [domain, setDomain] = useState(initialHalfWidth);

  // Approved fullscreen phase mesh resolution: 1024 × 576.
  const [playing, setPlaying] = useState(false);
  const playingRef = useRef(false);
  const sweepRef = useRef({ position: 0.5, direction: 1 });

  const minimum = initialHalfWidth / Math.max(1, zoomLimits.in);
  const maximum = initialHalfWidth * Math.max(1, zoomLimits.out);
  const logMin = Math.log(minimum);
  const logSpan = Math.log(maximum) - logMin;

  const toPosition = value =>
    logSpan > 0
      ? Math.max(0, Math.min(1, (Math.log(value) - logMin) / logSpan))
      : 0.5;

  const toDomain = position =>
    Math.exp(logMin + position * logSpan);

  const setDomainFromPosition = position => {
    const p = Math.max(0, Math.min(1, position));
    sweepRef.current.position = p;
    setDomain(toDomain(p));
  };

  // Create WebGL, camera, controls and one persistent mesh.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#101318");

    const camera = new THREE.PerspectiveCamera(
      40, 1, 0.05, 150
    );

    camera.position.set(6.4, 4.8, 7.8);

    if (initialOrientation?.position?.length === 3) {
      const direction = new THREE.Vector3()
        .fromArray(initialOrientation.position)
        .normalize();

      camera.position.copy(direction.multiplyScalar(11));

      if (initialOrientation.up?.length === 3) {
        camera.up.fromArray(initialOrientation.up);
      }
    }

    if (initialOverhead) {
      camera.position.set(0, 10.9, 0.0001);
      camera.up.set(0, 0, -1);
    }

    camera.zoom = 2.35;
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    });

    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, 2)
    );
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.touchAction = "none";

    host.appendChild(renderer.domElement);

    const controls = new OrbitControls(
      camera, renderer.domElement
    );

    controls.target.set(0, 0, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 3;
    controls.maxDistance = 35;
    controls.update();

    // Build indexed geometry independently of camera and renderer.
    const buildGeometry = (nx, nz) => {
      const count = (nx + 1) * (nz + 1);
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const indices = [];

      for (let j = 0; j <= nz; j++) {
        for (let i = 0; i <= nx; i++) {
          const vertex = j * (nx + 1) + i;
          const k = vertex * 3;
          positions[k] = (i / nx - 0.5) * 3.4;
          positions[k + 2] = (0.5 - j / nz) * 3.4 * 9 / 16;
        }
      }

      for (let j = 0; j < nz; j++) {
        for (let i = 0; i < nx; i++) {
          const a = j * (nx + 1) + i;
          const b = a + 1;
          const c = a + nx + 1;
          const d = c + 1;
          indices.push(a, b, c, b, d, c);
        }
      }

      const geometry = new THREE.BufferGeometry();
      const positionAttribute =
        new THREE.BufferAttribute(positions, 3);
      const colorAttribute =
        new THREE.BufferAttribute(colors, 3);

      geometry.setAttribute("position", positionAttribute);
      geometry.setAttribute("color", colorAttribute);
      geometry.setIndex(indices);
      geometry.computeVertexNormals();

      return {
        nx, nz, positions, colors,
        positionAttribute, colorAttribute, geometry,
      };
    };

    const initialGrid = buildGeometry(1024, 576);
    const geometry = initialGrid.geometry;

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      roughness: 0.78,
      metalness: 0,
      flatShading: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Match the approved phase-thumbnail illumination.
    const phaseAmbient = new THREE.AmbientLight(
      0xffffff, 0.65
    );
    const phaseLight = new THREE.DirectionalLight(
      0xffffff, 2.4
    );

    scene.add(phaseAmbient, phaseLight);

    const resize = () => {
      const w = Math.max(1, host.clientWidth);
      const h = Math.max(1, host.clientHeight);

      camera.aspect = w / h;

      if (initialOverhead) {
        // Fit the complete 3.4 x (3.4 * 9/16)
        // phase plane without changing its geometry.
        const width = 3.4;
        const depth = width * 9 / 16;
        const requiredHeight = Math.max(
          depth,
          width / camera.aspect
        );

        const halfFov =
          THREE.MathUtils.degToRad(camera.fov) / 2;

        const distance =
          camera.position.distanceTo(controls.target);

        camera.zoom =
          0.96 * (
            2 * distance * Math.tan(halfFov) /
            requiredHeight
          );
      }

      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    let frame;

    const animate = () => {
      frame = requestAnimationFrame(animate);

      // Rotation and damping continue independently of
      // changes in the mathematical domain.
      controls.update();

      const lighting = runtimeRef.current?.phaseLighting;

      if (lighting) {
        const orbit = lighting.orbit;

        const phase = orbit
          ? orbit.phase + (
              orbit.period > 0
                ? 360 * (
                    performance.now() - orbit.anchor
                  ) / (orbit.period * 1000)
                : 0
            )
          : 0;

        const angle = (lighting.direction + phase) * Math.PI / 180;
        const tilt = lighting.elevation * Math.PI / 180;
        const radius = Math.sqrt(146);
        const base = Math.atan2(-4, 7);

        if (orbit?.period > 0) {
          // True inclined circular orbit.
          // Opposite points have opposite elevations.
          const east = Math.cos(angle);
          const north = Math.cos(tilt) * Math.sin(angle);
          const up = Math.sin(tilt) * Math.sin(angle);
          phaseLight.position.set(
            radius * (Math.sin(base) * east - Math.cos(base) * north),
            radius * up,
            radius * (Math.cos(base) * east + Math.sin(base) * north)
          );
        } else {
          // Orbit off: fixed azimuth and signed elevation.
          const horizontal = radius * Math.cos(tilt);
          const bearing = base - angle;
          phaseLight.position.set(
            horizontal * Math.sin(bearing),
            radius * Math.sin(tilt),
            horizontal * Math.cos(bearing)
          );
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    runtimeRef.current = {
      ...initialGrid,
      mesh,
      buildGeometry,
      camera, renderer, controls,
      phaseLighting: null,
    };

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();

      if (runtimeRef.current?.renderer === renderer) {
        runtimeRef.current = null;
      }

      mesh.geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  // Lighting-only updates; no WebGL or mesh reconstruction.
  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;

    runtime.phaseLighting = {
      direction: lightDirection,
      elevation: lightElevation,
      orbit: lightOrbit,
    };
  }, [
    lightDirection,
    lightElevation,
    lightOrbit,
  ]);

  // Resample the same phase-color mathematics used by
  // the original 2D canvas, retaining the camera and WebGL.
  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;

    const {
      nx, nz, positions, colors,
      positionAttribute, colorAttribute,
    } = runtime;

    const linear = new THREE.Color();

    for (let j = 0; j <= nz; j++) {
      const v = j / nz;
      const im = domain * (9 / 16) * (1 - 2 * v);

      for (let i = 0; i <= nx; i++) {
        const u = i / nx;
        const re = domain * (2 * u - 1);
        const k = (j * (nx + 1) + i) * 3;

        const sample = sampleSignedGPhase(
          id, re, im, inverted
        );

        const log10 = sample.logAbs / Math.LN10;

        const h = Number.isFinite(log10)
          ? Math.tanh(log10 / 1.8)
          : log10 > 0 ? 1 : log10 < 0 ? -1 : 0;

        positions[k + 1] = 1.05 * h;

        const [r, g, b] = sample.rgba;

        linear.setRGB(
          r / 255,
          g / 255,
          b / 255,
          THREE.SRGBColorSpace
        );

        colors[k] = linear.r;
        colors[k + 1] = linear.g;
        colors[k + 2] = linear.b;
      }
    }

    positionAttribute.needsUpdate = true;
    colorAttribute.needsUpdate = true;

    // Recalculate surface normals from the new heights.
    // Without this, moving the domain slider would leave
    // the lighting attached to the previous surface shape.
    runtime.geometry.computeVertexNormals();
    runtime.geometry.getAttribute("normal").needsUpdate = true;

    // Center the projected surface when fullscreen first opens.
    // Preserve the mesh, camera orientation, and zoom.
    // Do not recenter during subsequent domain sweeps or rotation.
    if (!runtime.initialProjectionCentered) {
      runtime.initialProjectionCentered = true;

      const { camera, controls } = runtime;
      camera.updateMatrixWorld();
      camera.updateProjectionMatrix();

      const point = new THREE.Vector3();
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;

      // Sample the high-resolution surface for framing.
      for (let j = 0; j <= nz; j += 6) {
        for (let i = 0; i <= nx; i += 6) {
          const k = (j * (nx + 1) + i) * 3;

          point.set(
            positions[k],
            positions[k + 1],
            positions[k + 2]
          );
          point.project(camera);

          if (
            !Number.isFinite(point.x) ||
            !Number.isFinite(point.y)
          ) continue;

          minX = Math.min(minX, point.x);
          maxX = Math.max(maxX, point.x);
          minY = Math.min(minY, point.y);
          maxY = Math.max(maxY, point.y);
        }
      }

      if ([minX, maxX, minY, maxY].every(Number.isFinite)) {
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        const distance =
          camera.position.distanceTo(controls.target);

        const halfHeight = distance * Math.tan(
          THREE.MathUtils.degToRad(camera.fov) / 2
        ) / camera.zoom;

        const halfWidth = halfHeight * camera.aspect;

        const viewRight = new THREE.Vector3()
          .setFromMatrixColumn(camera.matrixWorld, 0);

        const viewUp = new THREE.Vector3()
          .setFromMatrixColumn(camera.matrixWorld, 1);

        const translation = viewRight
          .multiplyScalar(centerX * halfWidth)
          .add(
            viewUp.multiplyScalar(centerY * halfHeight)
          );

        camera.position.add(translation);
        controls.target.add(translation);
        controls.update();
      }
    }
  }, [id, domain, inverted]);

  // One 25-second logarithmic traverse.
  // Updating the mesh is deliberately throttled so dragging
  // the camera remains responsive during playback.
  useEffect(() => {
    if (!playing) return undefined;

    playingRef.current = true;

    let frame;
    let last = null;
    let lastUpdate = 0;

    const animate = time => {
      if (last === null) last = time;

      const dt = Math.min(time - last, 250);
      last = time;

      const sweep = sweepRef.current;

      sweep.position += sweep.direction * dt / 20000;

      if (sweep.position >= 1) {
        sweep.position = 2 - sweep.position;
        sweep.direction = -1;
      } else if (sweep.position <= 0) {
        sweep.position = -sweep.position;
        sweep.direction = 1;
      }

      if (time - lastUpdate >= 260) {
        setDomain(toDomain(sweep.position));
        lastUpdate = time;
      }

      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);

    return () => {
      playingRef.current = false;
      cancelAnimationFrame(frame);
    };
  }, [playing, initialHalfWidth, zoomLimits.in, zoomLimits.out]);

  const togglePlayback = () => {
    if (!playing) {
      const p = toPosition(domain);
      sweepRef.current.position = p;

      if (p >= 1) sweepRef.current.direction = -1;
      if (p <= 0) sweepRef.current.direction = 1;
    }

    setPlaying(value => !value);
  };

  return (
    <div style={{
      position: "relative",
      width: "100%",
      height: "100%",
      background: "#101318",
    }}>
      <div
        ref={hostRef}
        aria-label={`Interactive fullscreen 3D phase surface ${id}`}
        style={{
          width: "100%",
          height: "100%",
          cursor: "grab",
          overflow: "hidden",
        }}
      />

      <div style={{
        position: "absolute",
        right: 12,
        bottom: 12,
        zIndex: 5,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}>
        <div style={{
          width: 185,
          height: 30,
          padding: "0 8px",
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          background: "rgba(0,0,0,0.7)",
          borderRadius: 7,
        }}>
          <input
            type="range"
            min="0"
            max="1"
            step="0.0005"
            value={toPosition(domain)}
            onChange={event => {
              setPlaying(false);
              setDomainFromPosition(Number(event.target.value));
            }}
            aria-label="3D phase mathematical domain"
            style={{
              width: "100%",
              accentColor: "#75c7ff",
            }}
          />
        </div>

        <button
          type="button"
          onClick={togglePlayback}
          aria-label={playing ? "Pause domain sweep" : "Play domain sweep"}
          style={{
            width: 32,
            height: 30,
            color: "#fff",
            background: "rgba(0,0,0,0.7)",
            border: "1px solid #777",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          {playing ? "Ⅱ" : "▶"}
        </button>

        <button
          type="button"
          onClick={onReset}
          aria-label="Reset fullscreen phase view"
          title="Restore this phase plot's opening orientation, zoom and domain"
          style={{
            padding: "7px 11px",
            color: "#fff",
            background: "rgba(0,0,0,0.7)",
            border: "1px solid #777",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          Reset
        </button>

        <button
          type="button"
          onClick={onClose}
          style={{
            padding: "7px 11px",
            color: "#fff",
            background: "rgba(0,0,0,0.7)",
            border: "1px solid #777",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          Close ×
        </button>
      </div>
    </div>
  );
}
