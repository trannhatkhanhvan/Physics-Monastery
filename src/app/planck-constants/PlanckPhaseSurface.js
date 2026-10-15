"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  sampleSignedGPhase,
  renderSignedGPhase,
} from "../g-functions/GFunctionsExplorer";

// Shared GPU context for the five phase thumbnails.
// Each thumbnail retains independent geometry and controls.
let sharedPhaseRenderer = null;
let sharedPhaseUsers = 0;

function acquirePhaseRenderer() {
  if (!sharedPhaseRenderer) {
    sharedPhaseRenderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
    });
    sharedPhaseRenderer.setPixelRatio(1);
    sharedPhaseRenderer.outputColorSpace = THREE.SRGBColorSpace;
  }
  sharedPhaseUsers += 1;
  return sharedPhaseRenderer;
}

function releasePhaseRenderer() {
  sharedPhaseUsers -= 1;
  if (sharedPhaseUsers === 0 && sharedPhaseRenderer) {
    sharedPhaseRenderer.dispose();
    sharedPhaseRenderer.forceContextLoss();
    sharedPhaseRenderer = null;
  }
}

// Exact overhead projection, independent of surface height.
function getPhase2DZoom(id) {
  return 1;
}

export default function PlanckPhaseSurface({
  id,
  halfWidth,
  inverted = false,
  is3D = true,
  orientationLink = null,
  lightDirection = 144,
  lightElevation = 10,
  lightOrbit = null,
  onOpen = null,
}) {
  const hostRef = useRef(null);
  const openRef = useRef(onOpen);
  const startRef = useRef(null);
  const identityRef = useRef(null);
  const runtimeRef = useRef(null);
  // Approved vertical offset for inverted G3 and G4.
  const bakedVerticalOffsetPx =
    inverted && (id === "G3" || id === "G4") ? 9 : 0;
  const flatCanvasRef = useRef(null);
  const [showFlat, setShowFlat] = useState(() => !is3D);

  openRef.current = onOpen;

  // Keep the exact original 2D phase image available.
  useEffect(() => {
    if (flatCanvasRef.current) {
      renderSignedGPhase(
        flatCanvasRef.current,
        id,
        halfWidth,
        inverted
      );
    }
  }, [id, halfWidth, inverted]);

  // The existing 3D camera rotates for 1150 ms.
  // Reveal the exact 2D image only at the end.
  useEffect(() => {
    if (is3D) {
      setShowFlat(false);
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setShowFlat(true);
    }, 1030);

    return () => window.clearTimeout(timer);
  }, [is3D]);

  if (!identityRef.current) {
    identityRef.current = Symbol("phase-surface");
  }

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#101318");

    const camera = new THREE.OrthographicCamera(
      -1.7, 1.7, 1.7 * 9 / 16, -1.7 * 9 / 16,
      0.05, 100
    );

    camera.position.set(6.4, 4.8, 7.8);
    camera.zoom = is3D ? 0.65 : getPhase2DZoom(id);

    if (!is3D) {
      camera.position.set(0, 10.9, 0.001);
      camera.up.set(0, 0, -1);
      camera.lookAt(0, 0, 0);
    }

    camera.updateProjectionMatrix();

    const renderer = acquirePhaseRenderer();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { alpha: false });

    if (!ctx) {
      releasePhaseRenderer();
      throw new Error("2D thumbnail canvas unavailable");
    }

    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.touchAction = "none";
    canvas.style.display = "block";
    host.appendChild(canvas);

    const controls = new OrbitControls(camera, canvas);

    controls.target.set(0, 0, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 3;
    controls.maxDistance = 18;
    controls.enableRotate = is3D;
    controls.update();

    const link = orientationLink?.current;

    if (is3D && link?.position?.length === 3) {
      const direction = new THREE.Vector3()
        .fromArray(link.position).normalize();

      const radius = camera.position.length();

      camera.position.copy(direction.multiplyScalar(radius));

      if (link.up?.length === 3) {
        camera.up.fromArray(link.up);
      }

      camera.lookAt(0, 0, 0);
      controls.update();
    }

    // The visible phase plane is 16:9, just like its
    // original 2D canvas.
    const nx = 320;
    const nz = 180;
    const width = 3.4;
    const depth = width * 9 / 16;

    const positions = [];
    const colors = [];
    const indices = [];

    for (let j = 0; j <= nz; j++) {
      const v = j / nz;
      const im = halfWidth * (9 / 16) * (2 * v - 1);

      for (let i = 0; i <= nx; i++) {
        const u = i / nx;
        const re = halfWidth * (2 * u - 1);

        const sample = sampleSignedGPhase(
          id, re, im, inverted
        );

        // Exact bounded logarithmic-lightness function
        // from the existing domain-coloring implementation.
        //
        // lightness = .43 + .18*tanh(log10|G|/1.8)
        //
        // Map its centered variation into height.
        const log10 = sample.logAbs / Math.LN10;

        const normalized = Number.isFinite(log10)
          ? Math.tanh(log10 / 1.8)
          : log10 > 0 ? 1 : log10 < 0 ? -1 : 0;

        const height = 1.05 * normalized;

        positions.push(
          (u - 0.5) * width,
          height,
          (0.5 - v) * depth
        );

        const [r, g, b] = sample.rgba;
        // Canvas colors are sRGB; Three.js vertex
        // attributes require linear RGB.
        const linear = new THREE.Color().setRGB(
          r / 255, g / 255, b / 255,
          THREE.SRGBColorSpace
        );

        colors.push(
          linear.r, linear.g, linear.b
        );
      }
    }

    // Skip cells with undefined or singular values.
    // A finite bounded height does not make an undefined
    // mathematical point valid.
    for (let j = 0; j < nz; j++) {
      for (let i = 0; i < nx; i++) {
        const a = j * (nx + 1) + i;
        const b = a + 1;
        const c = a + nx + 1;
        const d = c + 1;

        // Upward-facing winding for correct illumination.
        indices.push(a, b, c, b, d, c);
      }
    }

    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
    geometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(colors, 3)
    );
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    // Physically based diffuse response, matching the
    // upper surface renderer while preserving phase colors.
    // The phase RGB values remain vertex attributes.
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      roughness: 0.78,
      metalness: 0,
      flatShading: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Ambient fill preserves phase-color readability.
    // Directional lighting supplies geometric relief.
    const phaseAmbient = new THREE.AmbientLight(
      0xffffff, 0.65
    );

    const phaseLight = new THREE.DirectionalLight(
      0xffffff, 2.4
    );

    scene.add(phaseAmbient, phaseLight);

    // Reusable samples of the actual mathematical surface.
    // Include all four corners and regularly spaced vertices.
    // No mesh coordinates or mathematical domains are changed.
    const phasePositions = geometry.getAttribute("position");
    const centeringSamples = [];

    for (let i = 0; i < phasePositions.count; i += 16) {
      centeringSamples.push(i);
    }

    centeringSamples.push(
      0,
      nx,
      nz * (nx + 1),
      (nz + 1) * (nx + 1) - 1
    );

    const projectedPoint = new THREE.Vector3();

    function centerPhaseProjection() {
      // Restore the camera's unshifted projection first.
      // Otherwise the correction would accumulate each frame.
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();

      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;

      for (const index of centeringSamples) {
        projectedPoint
          .fromBufferAttribute(phasePositions, index)
          .project(camera);

        if (
          !Number.isFinite(projectedPoint.x) ||
          !Number.isFinite(projectedPoint.y)
        ) continue;

        minX = Math.min(minX, projectedPoint.x);
        maxX = Math.max(maxX, projectedPoint.x);
        minY = Math.min(minY, projectedPoint.y);
        maxY = Math.max(maxY, projectedPoint.y);
      }

      if (!Number.isFinite(minX) ||
          !Number.isFinite(minY)) return;

      // Translate the image in normalized screen coordinates.
      // The camera orientation, zoom and mesh remain unchanged.
      const offsetX = (minX + maxX) / 2;
      const offsetY = (minY + maxY) / 2;

      camera.projectionMatrix.elements[12] -= offsetX;
      camera.projectionMatrix.elements[13] -= offsetY;

      // Visual-only vertical adjustment after auto-centering.
      // Convert CSS pixels to normalized device coordinates.
      camera.projectionMatrix.elements[13] +=
        2 * bakedVerticalOffsetPx /
        Math.max(1, host.clientHeight);

      camera.projectionMatrixInverse
        .copy(camera.projectionMatrix)
        .invert();
    }

    const idOfCamera = identityRef.current;

    runtimeRef.current = {
      camera,
      controls,
      mode3D: is3D,
      transition: null,
      savedDirection: camera.position.clone().normalize(),
      phaseLighting: null,
    };

    const beginInteraction = () => {
      if (orientationLink && runtimeRef.current?.mode3D) {
        orientationLink.current.owner = idOfCamera;
      }
    };

    controls.addEventListener("start", beginInteraction);

    const resize = () => {
      const w = Math.max(1, host.clientWidth);
      const h = Math.max(1, host.clientHeight);

      const halfHeight = Math.max(
        3.4 * 9 / 32,
        3.4 / (2 * (w / h))
      );
      camera.left = -halfHeight * w / h;
      camera.right = halfHeight * w / h;
      camera.top = halfHeight;
      camera.bottom = -halfHeight;
      camera.updateProjectionMatrix();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
    };

    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    let frame;

    const animate = () => {
      frame = requestAnimationFrame(animate);

      const runtime = runtimeRef.current;
      const motion = runtime?.transition;

      if (motion) {
        const t = Math.min(
          1,
          (performance.now() - motion.start) / 1150
        );

        const eased =
          t * t * t * (t * (t * 6 - 15) + 10);

        const rotation = new THREE.Quaternion()
          .identity()
          .slerp(motion.rotation, eased);

        const direction = motion.fromDir.clone()
          .applyQuaternion(rotation);

        camera.position.copy(controls.target)
          .addScaledVector(direction, motion.radius);

        camera.up.copy(motion.fromUp)
          .lerp(motion.toUp, eased)
          .normalize();

        camera.zoom = THREE.MathUtils.lerp(
          motion.fromZoom,
          motion.toZoom,
          eased
        );

        camera.updateProjectionMatrix();
        camera.lookAt(controls.target);

        if (t === 1) {
          if (!runtime.mode3D) {
            camera.position.copy(controls.target).add(
              new THREE.Vector3(0, motion.radius, 0.0001)
            );
            camera.up.set(0, 0, -1);
            camera.zoom = getPhase2DZoom(id);
            camera.updateProjectionMatrix();
            camera.lookAt(controls.target);
          }

          runtime.transition = null;
          controls.enabled = true;
          controls.enableRotate = runtime.mode3D;
          controls.update();
        }
      } else {
        controls.update();
      }

      const shared = orientationLink?.current;

      if (shared && runtime?.mode3D && !motion) {
        if (shared.owner === idOfCamera) {
          shared.position = camera.position.clone()
            .sub(controls.target).toArray();
          shared.up = camera.up.toArray();
          shared.version += 1;
        } else if (shared.position?.length === 3) {
          const distance = camera.position.distanceTo(
            controls.target
          );

          const direction = new THREE.Vector3()
            .fromArray(shared.position).normalize();

          camera.position.copy(controls.target)
            .addScaledVector(direction, distance);

          if (shared.up?.length === 3) {
            camera.up.fromArray(shared.up);
          }

          camera.lookAt(controls.target);
        }
      }

      // One GPU context renders the five independent scenes.
      // Copy each completed frame to its display canvas.
      if (canvas.width && canvas.height) {
        renderer.setSize(canvas.width, canvas.height, false);

        // Center the projected 3D silhouette every frame,
        // including during synchronized camera rotations.
        centerPhaseProjection();

        // Shared sun direction and orbit phase.
        // Lighting moves; mesh and camera do not.
        const lighting = runtime?.phaseLighting;

        if (lighting) {
          const orbit = lighting.orbit;

          const orbitPhase = orbit
            ? orbit.phase + (
                orbit.period > 0
                  ? 360 * (
                      performance.now() - orbit.anchor
                    ) / (orbit.period * 1000)
                  : 0
              )
            : 0;

          const azimuth = (
            lighting.direction + orbitPhase
          ) * Math.PI / 180;

          const elevation =
            lighting.elevation * Math.PI / 180;

          // Match the directional light coordinates
          // used by PlanckTimeSurface.
          const radius = Math.sqrt(146);
          const horizontal =
            radius * Math.cos(elevation);

          const bearing =
            Math.atan2(-4, 7) - azimuth;

          phaseLight.position.set(
            horizontal * Math.sin(bearing),
            radius * Math.sin(elevation),
            horizontal * Math.cos(bearing)
          );
        }

        renderer.render(scene, camera);
        ctx.drawImage(
          renderer.domElement, 0, 0,
          canvas.width, canvas.height
        );
      }
    };

    animate();

    const pointerDown = event => {
      startRef.current = event.button === 0
        ? { x: event.clientX, y: event.clientY }
        : null;
    };

    const click = event => {
      const start = startRef.current;
      startRef.current = null;

      if (!start || !openRef.current) return;

      const moved = Math.hypot(
        event.clientX - start.x,
        event.clientY - start.y
      );

      if (moved <= 5) {
        openRef.current();
      }
    };

    host.addEventListener("pointerdown", pointerDown);
    host.addEventListener("click", click);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();

      host.removeEventListener("pointerdown", pointerDown);
      host.removeEventListener("click", click);

      controls.removeEventListener("start", beginInteraction);

      if (runtimeRef.current?.camera === camera) {
        runtimeRef.current = null;
      }

      controls.dispose();

      geometry.dispose();
      material.dispose();
      canvas.remove();
      releasePhaseRenderer();
    };
  }, [id, halfWidth, inverted, orientationLink]);

  // Update only lighting parameters on the existing scene.
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

  // Move the existing camera without rebuilding the
  // mesh, WebGL renderer, or phase colors.
  useEffect(() => {
    const runtime = runtimeRef.current;

    if (!runtime || runtime.mode3D === is3D) {
      return;
    }

    const { camera, controls } = runtime;
    const offset = camera.position.clone()
      .sub(controls.target);

    if (runtime.mode3D) {
      runtime.savedDirection.copy(offset).normalize();
    }

    runtime.mode3D = is3D;

    const shared = orientationLink?.current;

    const targetDirection = is3D
      ? (
          shared?.position?.length === 3
            ? new THREE.Vector3()
                .fromArray(shared.position)
                .normalize()
            : runtime.savedDirection.clone()
        )
      : new THREE.Vector3(0, 1, 0.0001)
          .normalize();

    const currentDirection = offset.clone()
      .normalize();

    runtime.transition = {
      start: performance.now(),
      fromDir: currentDirection,
      rotation: new THREE.Quaternion()
        .setFromUnitVectors(
          currentDirection,
          targetDirection
        ),
      radius: offset.length(),
      fromUp: camera.up.clone(),
      toUp: is3D
        ? new THREE.Vector3(0, 1, 0)
        : new THREE.Vector3(0, 0, -1),
      fromZoom: camera.zoom,
      toZoom: is3D ? 0.65 : getPhase2DZoom(id),
    };

    controls.enabled = false;
  }, [is3D, orientationLink]);

  return (
    <div
      ref={hostRef}
      aria-label={`3D phase-height surface for ${id}`}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "16 / 9",
        border: "1px solid #3d4752",
        borderRadius: 8,
        overflow: "hidden",
        background: "#101318",
        cursor: "grab",
      }}
    >
      <canvas
        ref={flatCanvasRef}
        width={320}
        height={180}
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          display: "block",
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          opacity: showFlat ? 1 : 0,
          transition: "opacity 120ms ease-in-out",
        }}
      />
    </div>
  );
}
