"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// Fit the full rectangular surface into an overhead
// perspective view without modifying its geometry.
function surface2DZoom(camera, distance) {
  const meshWidth = 3.4;
  const meshDepth = meshWidth * 9 / 16;
  const requiredHeight = Math.max(
    meshDepth,
    meshWidth / camera.aspect
  );
  const halfFov = THREE.MathUtils.degToRad(camera.fov) / 2;

  // Small safety margin prevents border clipping.
  return 0.99 * (
    2 * distance * Math.tan(halfFov) / requiredHeight
  );
}

// Blend perspective into an exact overhead orthographic
// projection. This changes projection only, never geometry.
function applySurfaceProjection(runtime, mix, displayScale) {
  const { camera } = runtime;

  // The perspective endpoint keeps its existing calibrated zoom.
  // Preserve the current zoom during the transition.
  camera.updateProjectionMatrix();

  if (mix <= 0) return;

  const perspective = camera.projectionMatrix.clone();

  // The rectangular mesh measures 3.4 by 3.4 * 9/16.
  // Fit it without stretching or cropping.
  const width = 3.4;
  const depth = width * 9 / 16;
  const aspect = camera.aspect || 16 / 9;

  const halfHeight = Math.max(
    depth / 2,
    width / (2 * aspect)
  );

  const ortho = new THREE.OrthographicCamera(
    -halfHeight * aspect,
     halfHeight * aspect,
     halfHeight,
    -halfHeight,
    camera.near,
    camera.far
  );

  ortho.updateProjectionMatrix();

  const a = perspective.elements;
  const b = ortho.projectionMatrix.elements;
  const result = camera.projectionMatrix.elements;

  for (let i = 0; i < 16; i++) {
    result[i] = THREE.MathUtils.lerp(a[i], b[i], mix);
  }

  camera.projectionMatrixInverse
    .copy(camera.projectionMatrix).invert();
}

export default function PlanckTimeSurface({
  constantIndex = 0,
  is3D = true,
  fullscreen = false,
  initialOverhead = false,
  transparentBackground = false,
  lineMode = "contours",
  showGridLabels = false,
  initialView = null,
  orientationLink = null,
  onOpen = null,
  inverted = false,
  real = true,
  scale = 1,
  heightRange = 5,
  displayScale = 1,
  ambientStrength = 0.65,
  lightStrength = 2.4,
  lightDirection = 0,
  lightElevation = Math.atan2(9, Math.sqrt(65)) * 180 / Math.PI,
  lightOrbit = null,
  surfaceColor = '#FF9800',
}) {
  const hostRef = useRef(null);
  const cameraRef = useRef(null);
  const runtimeRef = useRef(null);
  const pointerStartRef = useRef(null);
  const orientationIdRef = useRef(null);
  if (orientationIdRef.current === null) {
    orientationIdRef.current = Symbol("surface-camera");
  }
  const openRef = useRef(onOpen);
  openRef.current = onOpen;

  // Camera-only adjustment: no mesh or WebGL recreation.
  useEffect(() => {
    const camera = cameraRef.current;
    if (!camera) return;
    const runtime = runtimeRef.current;
    if (runtime?.transition) return;

    camera.zoom = runtime?.mode3D === false
      ? surface2DZoom(
          camera,
          camera.position.distanceTo(runtime.controls.target)
        )
      : displayScale;

    camera.updateProjectionMatrix();
  }, [displayScale]);


  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    scene.background = transparentBackground
      ? null
      : new THREE.Color("#101318");

    const camera = new THREE.PerspectiveCamera(
      40, 1, 0.05, 100
    );
    camera.position.set(6.4, 4.8, 7.8);
    if (initialView?.position?.length === 3) {
      camera.position.fromArray(initialView.position);
      if (initialView.up?.length === 3) {
        camera.up.fromArray(initialView.up);
      }
      camera.lookAt(0, 0, 0);
    }
    cameraRef.current = camera;
    camera.zoom = displayScale;
    camera.updateProjectionMatrix();


    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: transparentBackground,
    });
    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, 2.5)
    );
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);

    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.touchAction = "none";

    const controls = new OrbitControls(
      camera, renderer.domElement
    );
    controls.target.set(0, 0, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 2.8;
    controls.maxDistance = 18;
    controls.update();

    const orientationState = orientationLink?.current;

    if (orientationState) {
      const existing = orientationState.position;

      if (existing && existing.length === 3) {
        const direction = new THREE.Vector3(
          ...existing
        ).normalize();

        const radius = camera.position.distanceTo(
          controls.target
        );

        camera.position.copy(controls.target)
          .addScaledVector(direction, radius);

        if (orientationState.up) {
          camera.up.fromArray(orientationState.up);
        }

        camera.lookAt(controls.target);
        controls.update();
      } else {
        orientationState.position =
          camera.position.clone()
            .sub(controls.target).toArray();

        orientationState.up = camera.up.toArray();
      }
    }

    const originalPosition = camera.position.clone();

    const ambient = new THREE.AmbientLight("#ffffff", ambientStrength);
    scene.add(ambient);

    const light = new THREE.DirectionalLight("#ffffff", lightStrength);
    light.position.set(-4, 9, 7);
    scene.add(light);

    const plotGroup = new THREE.Group();
    scene.add(plotGroup);
    runtimeRef.current = {
      scene, plotGroup, ambient, light, camera, controls,
      mode3D: true,
      transition: null,
      projectionMix: 0,
      lightingState: null,
      saved3D: {
        position: camera.position.clone(),
        up: camera.up.clone(),
        zoom: camera.zoom,
      },
    };

    const observer = new ResizeObserver(() => {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      camera.aspect = width / height;

      // Fit the entire mathematical rectangle when
      // fullscreen was entered from a 2D thumbnail.
      // Preserve the approved 3D camera zoom otherwise.
      if (fullscreen && initialOverhead &&
          runtimeRef.current?.mode3D === false &&
          !runtimeRef.current?.transition) {
        camera.zoom = surface2DZoom(
          camera,
          camera.position.distanceTo(controls.target)
        );
      }

      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    });
    observer.observe(host);

    const reset = () => {
      if (orientationLink) {
        orientationLink.current.owner =
          orientationIdRef.current;
      }

      camera.position.copy(originalPosition);
      controls.target.set(0, 0, 0);
      controls.update();
    };

    host.addEventListener("dblclick", reset);

    let frame;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const runtime = runtimeRef.current;
      const motion = runtime?.transition;
      if (motion) {
        const t = Math.min(
          1, (performance.now() - motion.start) / 1150
        );
        const eased = t * t * t * (t * (t * 6 - 15) + 10);

        // Smooth spherical camera motion at a stable radius.
        // These are the exact endpoints stored by the effect.
        // One quaternion interpolates the complete camera
        // orientation, combining tilt and roll continuously.
        motion.currentQuaternion.copy(motion.fromQuaternion)
          .slerp(motion.toQuaternion, eased);

        const radius = THREE.MathUtils.lerp(
          motion.fromRadius, motion.toRadius, eased
        );

        camera.position.copy(controls.target).addScaledVector(
          motion.backward.set(0, 0, 1)
            .applyQuaternion(motion.currentQuaternion),
          radius
        );

        camera.quaternion.copy(motion.currentQuaternion);
        camera.up.set(0, 1, 0)
          .applyQuaternion(motion.currentQuaternion);

        runtime.projectionMix = THREE.MathUtils.lerp(
          motion.fromProjectionMix,
          motion.toProjectionMix,
          eased
        );

        // Zoom and quaternion rotation advance together.
        camera.zoom = THREE.MathUtils.lerp(
          motion.fromZoom,
          motion.toZoom,
          eased
        );
        camera.updateProjectionMatrix();

        if (t === 1) {
          // End at the exact destination, with no residual
          // damping motion or last-frame camera correction.
          camera.quaternion.copy(motion.toQuaternion);
          camera.position.copy(controls.target).addScaledVector(
            new THREE.Vector3(0, 0, 1)
              .applyQuaternion(motion.toQuaternion),
            motion.toRadius
          );
          camera.up.set(0, 1, 0)
            .applyQuaternion(motion.toQuaternion);
          camera.zoom = motion.toZoom;
          camera.updateProjectionMatrix();

          runtime.projectionMix = motion.toProjectionMix;
          runtime.transition = null;
          controls.update();
          controls.enableRotate = runtime.mode3D;
          controls.enableDamping = true;
          controls.enabled = true;
        }
      } else {
        controls.update();
      }

      // Synchronize orientation only, never camera radius,
      // mathematical geometry, or displayScale.
      const linked = orientationLink?.current;

      if (linked && runtime?.mode3D &&
          !runtime.transition) {
        const id = orientationIdRef.current;

        if (linked.owner === id) {
          // Active camera: publish its current rotation,
          // including its natural damping after release.
          linked.position = camera.position.clone()
            .sub(controls.target).toArray();
          linked.up = camera.up.toArray();
          linked.version += 1;
        } else if (linked.position) {
          // Other cameras: adopt the same direction while
          // retaining their own distance from the surface.
          const radius = camera.position.distanceTo(
            controls.target
          );

          const direction = new THREE.Vector3()
            .fromArray(linked.position).normalize();

          camera.position.copy(controls.target)
            .addScaledVector(direction, radius);

          if (linked.up) {
            camera.up.fromArray(linked.up);
          }

          camera.lookAt(controls.target);
        }
      }

      // Directional light orbit.
      // Shared timing keeps all five plots synchronized.
      const lighting = runtime?.lightingState;

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
          light.position.set(
            radius * (Math.sin(base) * east - Math.cos(base) * north),
            radius * up,
            radius * (Math.cos(base) * east + Math.sin(base) * north)
          );
        } else {
          // Orbit off: fixed azimuth and signed elevation.
          const horizontal = radius * Math.cos(tilt);
          const bearing = base - angle;
          light.position.set(
            horizontal * Math.sin(bearing),
            radius * Math.sin(tilt),
            horizontal * Math.cos(bearing)
          );
        }
      }

      applySurfaceProjection(
        runtime,
        runtime.projectionMix,
        displayScale
      );
      runtime?.updateGridLabels?.(performance.now());
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      host.removeEventListener("dblclick", reset);
      controls.dispose();
      if (cameraRef.current === camera) {
        cameraRef.current = null;
      }
      renderer.dispose();
      renderer.domElement.remove();
      if (runtimeRef.current?.scene === scene) {
        runtimeRef.current = null;
      }
    };
  }, []);
  // 2D is an overhead camera view, not a change to the surface.
  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime || runtime.mode3D === is3D) return;

    const { camera, controls } = runtime;

    if (runtime.mode3D) {
      runtime.saved3D = {
        position: camera.position.clone(),
        up: camera.up.clone(),
        zoom: camera.zoom,
      };
    }

    runtime.mode3D = is3D;

    const distance = camera.position.distanceTo(controls.target);
    const target = is3D
      ? runtime.saved3D
      : {
          // Nearly overhead; the small Z offset prevents the
          // lookAt singularity when camera.up is (0,1,0).
          position: controls.target.clone().add(
            new THREE.Vector3(0, distance, 0)
          ),
        };

    const fromOffset = camera.position.clone()
      .sub(controls.target);
    const toOffset = target.position.clone()
      .sub(controls.target);

    // Construct the exact destination orientation first.
    const destination = camera.clone();
    destination.position.copy(target.position);
    destination.up.copy(
      is3D
        ? runtime.saved3D.up
        : new THREE.Vector3(0, 0, -1)
    );
    destination.lookAt(controls.target);

    runtime.transition = {
      start: performance.now(),
      fromQuaternion: camera.quaternion.clone(),
      toQuaternion: destination.quaternion.clone(),
      currentQuaternion: new THREE.Quaternion(),
      backward: new THREE.Vector3(),
      fromRadius: fromOffset.length(),
      toRadius: toOffset.length(),
      fromZoom: camera.zoom,
      toZoom: is3D
        ? (fullscreen
            ? (runtime.saved3D.zoom ?? displayScale)
            : displayScale)
        : surface2DZoom(camera, toOffset.length()),
      fromProjectionMix: runtime.projectionMix,
      toProjectionMix: is3D ? 0 : 1,
    };

    controls.enableDamping = false;
    controls.update();
    controls.enabled = false;
  }, [is3D]);

  // Update mathematical geometry without recreating WebGL.
  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return undefined;

    const { plotGroup } = runtime;

    // Compare F0(z) and F0(1/z) on the same domain.
    // These use the positive historical Wolfram plotting sign.
    // Adaptive mathematical surface reconstruction.
    // F0(w) = pi * exp(5.39125836832313/44) * sinh(w/4)^2.
    // w is z or 1/z, according to the selected preview.
    // Approved fullscreen sampling matches the phase renderer.
    // Keep thumbnails at their existing lighter resolution.
    // Shared regular lattice: adjacent cells have matching edges.
    const stepsX = fullscreen
      ? 512
      : (constantIndex === 0 ? 160 : 100);
    const stepsZ = fullscreen
      ? 288
      : (constantIndex === 0 ? 160 : 100);
    // Mathematical domain:
    // vertical span remains [-scale,+scale]
    // horizontal span is extended to fill a true 16:9 surface.
    const span = 2.0 * scale;
    const spanX = span * 16 / 9;
    const spanY = span;
    const verticalMin = -heightRange;
    const verticalMax = heightRange;
    const normalization =
      Math.PI * Math.exp(5.39125836832313 / 44);

    // Rectangular surface footprint matching the plot frame.
    const meshWidth = 3.4;
    const meshDepth = meshWidth * 9 / 16;

    const positions = [];
    const normals = [];
    const colors = [];
    const indices = [];
    const heightCache = new Map();

    // Neighboring triangles reuse the same lattice vertices.
    // Clipped boundary vertices retain their own coordinates.
    const vertexIndexCache = new WeakMap();


    // Complex arithmetic for the five reference functions.
    const C = (r, i = 0) => [r, i];
    const add = (a,b) => C(a[0]+b[0],a[1]+b[1]);
    const sub = (a,b) => C(a[0]-b[0],a[1]-b[1]);
    const mul = (a,b) => C(
      a[0]*b[0]-a[1]*b[1],
      a[0]*b[1]+a[1]*b[0]
    );
    const times = (a,k) => C(a[0]*k,a[1]*k);
    const div = (a,b) => {
      const d=b[0]*b[0]+b[1]*b[1];
      return C(
        (a[0]*b[0]+a[1]*b[1])/d,
        (a[1]*b[0]-a[0]*b[1])/d
      );
    };
    const exp = a => {
      const t=Math.exp(a[0]);
      return C(t*Math.cos(a[1]),t*Math.sin(a[1]));
    };
    const log = a => C(
      Math.log(Math.hypot(a[0],a[1])),
      Math.atan2(a[1],a[0])
    );
    const sin = a => C(
      Math.sin(a[0])*Math.cosh(a[1]),
      Math.cos(a[0])*Math.sinh(a[1])
    );
    const cos = a => C(
      Math.cos(a[0])*Math.cosh(a[1]),
      -Math.sin(a[0])*Math.sinh(a[1])
    );
    const sinh = a => C(
      Math.sinh(a[0])*Math.cos(a[1]),
      Math.cosh(a[0])*Math.sin(a[1])
    );
    const sq = a => mul(a,a);

    // Complex log Gamma: Lanczos with reflection.
    const coefficients = [
      0.99999999999980993,
      676.5203681218851,
      -1259.1392167224028,
      771.32342877765313,
      -176.6150291621406,
      12.507343278686905,
      -0.13857109526572012,
      9.984369578019572e-6,
      1.5056327351493116e-7
    ];

    function logGamma(z) {
      if (z[0] < 0.5) {
        return sub(
          C(Math.log(Math.PI)),
          add(
            log(sin(times(z,Math.PI))),
            logGamma(sub(C(1),z))
          )
        );
      }

      const v=sub(z,C(1));
      let sum=C(coefficients[0]);

      for (let i=1;i<coefficients.length;i++) {
        sum=add(sum,div(C(coefficients[i]),add(v,C(i))));
      }

      const t=add(v,C(7.5));

      return add(
        C(0.9189385332046727),
        add(
          mul(add(v,C(0.5)),log(t)),
          sub(log(sum),t)
        )
      );
    }

    function complexValue(x,y) {
      const z=C(x,y);
      const d=x*x+y*y;

      if (inverted && d < 1e-12) {
        return C(NaN,NaN);
      }

      const w=inverted ? div(C(1),z) : z;

      switch (constantIndex) {
        case 0:
          return times(
            sq(sinh(times(w,0.25))),
            normalization
          );

        case 1:
          return times(
            div(C(1),sinh(sinh(times(w,1/7)))),
            Math.exp(1.61625918175645/35)
          );

        case 2: {
          const coefficient =
            5/Math.sqrt(7) *
            Math.pow(3,-1/3) /
            (Math.pow(2,5/4)*Math.sqrt(Math.PI)) *
            Math.exp(
              -4*Math.PI/32 +
              1.87554596713962/18
            );

          return times(
            exp(times(logGamma(times(w,0.25)),2)),
            coefficient
          );
        }

        case 3:
          return times(
            mul(
              sq(cos(mul(C(0,2.5),w))),
              sq(cos(times(w,7/5)))
            ),
            50/7 * Math.exp(1.4167869859079/32)
          );

        case 4:
          return times(
            sq(cos(times(w,7/5))),
            10*Math.PI*Math.exp(2.17642683817579/8)
          );

        default:
          return C(NaN,NaN);
      }
    }

    function heightAt(x,y) {
      const v=complexValue(x,y)[real ? 0 : 1];
      return Number.isFinite(v) ? v : NaN;
    }

    function sample(x, z) {
      const key = `${x.toPrecision(15)},${z.toPrecision(15)}`;

      if (!heightCache.has(key)) {
        heightCache.set(key, {
          x,
          z,
          h: heightAt(x, z),
        });
      }

      return heightCache.get(key);
    }

    // Sutherland-Hodgman clipping against the vertical
    // plot limits. Intersections are interpolated along
    // the sampled triangle edges, not inserted as arbitrary
    // flat replacement values.
    function clipPolygon(polygon, limit, keepAbove) {
      const result = [];

      for (let i = 0; i < polygon.length; i++) {
        const current = polygon[i];
        const next = polygon[(i + 1) % polygon.length];

        const insideCurrent = keepAbove
          ? current.h >= limit
          : current.h <= limit;

        const insideNext = keepAbove
          ? next.h >= limit
          : next.h <= limit;

        if (insideCurrent) result.push(current);

        if (insideCurrent !== insideNext) {
          const denominator = next.h - current.h;

          if (denominator === 0) continue;

          const t = (limit - current.h) / denominator;

          result.push({
            x: current.x + t * (next.x - current.x),
            z: current.z + t * (next.z - current.z),
            h: limit,
          });
        }
      }

      return result;
    }

    const lowSurfaceColor = new THREE.Color("#a85a12");
    const midSurfaceColor = new THREE.Color("#d8891c");
    const highSurfaceColor = new THREE.Color("#f2d24f");
    const workingSurfaceColor = new THREE.Color();

    function warmSurfaceColor(t) {
      const low = lowSurfaceColor;
      const mid = midSurfaceColor;
      const high = highSurfaceColor;
      const color = workingSurfaceColor;

      if (t < 0.58) {
        color.copy(low).lerp(mid, t / 0.58);
      } else {
        color.copy(mid).lerp(high, (t - 0.58) / 0.42);
      }

      return color;
    }


    // Smooth derivative-based normals for all five functions.
    function smoothNormal(x,y) {
      const delta=Math.max(1e-7,scale*1e-4);

      const xp=heightAt(x+delta,y);
      const xm=heightAt(x-delta,y);
      const yp=heightAt(x,y+delta);
      const ym=heightAt(x,y-delta);

      if (![xp,xm,yp,ym].every(Number.isFinite)) {
        return [0,1,0];
      }

      const dx=(xp-xm)/(2*delta);
      const dy=(yp-ym)/(2*delta);

      const nx = -dx * 0.35 / (meshWidth / spanX);
      const nz = -dy * 0.35 / (meshDepth / spanY);
      const len=Math.hypot(nx,1,nz);

      return Number.isFinite(len) && len>0
        ? [nx/len,1/len,nz/len]
        : [0,1,0];
    }

    function addVertex(point) {
      const cached = vertexIndexCache.get(point);
      if (cached !== undefined) return cached;

      const index = positions.length / 3;
      vertexIndexCache.set(point, index);

      positions.push(
        point.x * (meshWidth / spanX),
        point.h * 0.35,
        point.z * (meshDepth / spanY)
      );

      normals.push(...smoothNormal(point.x, point.z));

      const t = Math.max(
        0,
        Math.min(
          1,
          (point.h - verticalMin) /
            (verticalMax - verticalMin)
        )
      );

      const color = warmSurfaceColor(t);

      colors.push(color.r, color.g, color.b);

      return index;
    }

    function emitTriangle(a, b, c) {
      if (![a.h, b.h, c.h].every(Number.isFinite)) {
        return;
      }

      // Fast path: the triangle is entirely inside the
      // approved height range, so clipping is unnecessary.
      if (
        a.h >= verticalMin && a.h <= verticalMax &&
        b.h >= verticalMin && b.h <= verticalMax &&
        c.h >= verticalMin && c.h <= verticalMax
      ) {
        indices.push(addVertex(a), addVertex(b), addVertex(c));
        return;
      }

      let polygon = [a, b, c];

      polygon = clipPolygon(polygon, verticalMin, true);

      if (polygon.length < 3) return;

      polygon = clipPolygon(polygon, verticalMax, false);

      if (polygon.length < 3) return;

      // Reverse the initial triangle order so that the
      // top face is consistently oriented upward.
      const first = addVertex(polygon[0]);

      for (let j = 1; j + 1 < polygon.length; j++) {
        const second = addVertex(polygon[j]);
        const third = addVertex(polygon[j + 1]);

        indices.push(first, second, third);
      }
    }

    // Conforming regular triangulation.
    // Every neighboring cell uses identical boundary coordinates.
    // Undefined singular points remain absent.
    for (let iy = 0; iy < stepsZ; iy++) {
      const z0 = -spanY / 2 + spanY * iy / stepsZ;
      const z1 = -spanY / 2 + spanY * (iy + 1) / stepsZ;

      for (let ix = 0; ix < stepsX; ix++) {
        const x0 = -spanX / 2 + spanX * ix / stepsX;
        const x1 = -spanX / 2 + spanX * (ix + 1) / stepsX;

        const a = sample(x0, z0);
        const b = sample(x1, z0);
        const c = sample(x0, z1);
        const d = sample(x1, z1);

        emitTriangle(a, c, b);
        emitTriangle(b, c, d);
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
    geometry.setAttribute(
      "normal",
      new THREE.Float32BufferAttribute(normals, 3)
    );

    const material = new THREE.MeshStandardMaterial({
      side: THREE.DoubleSide,
      color: "#FF9800",
      vertexColors: false,
      roughness: 0.58,
      metalness: 0,
      flatShading: false,
      // Shift mesh depth slightly behind its own contour lines.
      // Actual mathematical geometry remains unchanged.
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });

    const surface = new THREE.Mesh(geometry, material);
    plotGroup.add(surface);
    runtime.surfaceMaterial = material;
    material.color.set(surfaceColor);

    // TEMP: outline exposed upper clipping edges in fullscreen.
    // These are actual triangle edges at the height cutoff,
    // not edges of the triangulation or invented contours.
    let topEdgeLines = null;
    let topEdgeGeometry = null;
    let topEdgeMaterial = null;

    if (fullscreen) {
      const topY = verticalMax * 0.35;
      const tolerance = 1e-5;
      const topPositions = [];
      const seen = new Set();
      const surfaceVertices = geometry.getAttribute("position");

      const pointKey = index => [
        surfaceVertices.getX(index),
        surfaceVertices.getY(index),
        surfaceVertices.getZ(index),
      ].map(value => Math.round(value * 1e5)).join(",");

      for (let k = 0; k < indices.length; k += 3) {
        const triangle = [
          indices[k],
          indices[k + 1],
          indices[k + 2],
        ];

        for (let edge = 0; edge < 3; edge++) {
          const a = triangle[edge];
          const b = triangle[(edge + 1) % 3];

          if (
            Math.abs(surfaceVertices.getY(a) - topY) > tolerance ||
            Math.abs(surfaceVertices.getY(b) - topY) > tolerance
          ) continue;

          const ka = pointKey(a);
          const kb = pointKey(b);
          if (ka === kb) continue;

          const id = ka < kb
            ? ka + "|" + kb
            : kb + "|" + ka;

          if (seen.has(id)) continue;
          seen.add(id);

          topPositions.push(
            surfaceVertices.getX(a),
            surfaceVertices.getY(a),
            surfaceVertices.getZ(a),
            surfaceVertices.getX(b),
            surfaceVertices.getY(b),
            surfaceVertices.getZ(b)
          );
        }
      }

      topEdgeGeometry = new THREE.BufferGeometry();
      topEdgeGeometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(topPositions, 3)
      );

      topEdgeMaterial = new THREE.LineBasicMaterial({
        color: "#241609",
        transparent: true,
        opacity: 0.9,
        depthTest: true,
        depthWrite: false,
      });

      topEdgeLines = new THREE.LineSegments(
        topEdgeGeometry,
        topEdgeMaterial
      );
      topEdgeLines.renderOrder = 1;
      plotGroup.add(topEdgeLines);
    }

    // Constant-height contours ON the mathematical surface.
    // These are not x/y coordinate-grid lines.
    const contourPositions = [];
    const contourLevels = Array.from(
      { length: 9 },
      (_, i) => (i - 4) * heightRange / 5
    );

    const surfacePosition = geometry.getAttribute("position");
    const contourTolerance = 1e-8;

    // Exact intersections with the rendered triangle faces.
    // No displacement along the normal or vertical axis.
    function contourCrossing(i, j, levelY) {
      const ya = surfacePosition.getY(i);
      const yb = surfacePosition.getY(j);
      const delta = yb - ya;

      if (Math.abs(delta) < contourTolerance) {
        return null;
      }

      const t = (levelY - ya) / delta;

      if (
        t < -contourTolerance ||
        t > 1 + contourTolerance
      ) {
        return null;
      }

      const u = Math.max(0, Math.min(1, t));

      return [
        surfacePosition.getX(i) + u *
          (surfacePosition.getX(j) - surfacePosition.getX(i)),
        levelY,
        surfacePosition.getZ(i) + u *
          (surfacePosition.getZ(j) - surfacePosition.getZ(i)),
      ];
    }

    for (let k = 0; k < indices.length; k += 3) {
      const triangle = [
        indices[k],
        indices[k + 1],
        indices[k + 2],
      ];

      const heights = triangle.map(
        i => surfacePosition.getY(i)
      );

      const low = Math.min(...heights);
      const high = Math.max(...heights);

      if (high - low < contourTolerance) continue;

      for (const level of contourLevels) {
        const y = level * 0.35;

        if (y < low || y > high) continue;

        const hits = [];

        for (let edge = 0; edge < 3; edge++) {
          const p = contourCrossing(
            triangle[edge],
            triangle[(edge + 1) % 3],
            y
          );

          if (!p) continue;

          const duplicate = hits.some(q =>
            Math.hypot(
              p[0] - q[0],
              p[1] - q[1],
              p[2] - q[2]
            ) < contourTolerance
          );

          if (!duplicate) hits.push(p);
        }

        if (hits.length === 2) {
          contourPositions.push(...hits[0], ...hits[1]);
        }
      }
    }

    const contourGeometry = new THREE.BufferGeometry();
    contourGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(contourPositions, 3)
    );

    const contourMaterial = new THREE.LineBasicMaterial({
      color: "#38210a",
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });

    const contourLines = new THREE.LineSegments(
      contourGeometry,
      contourMaterial
    );

    plotGroup.add(contourLines);

    // Coordinate grid following the rendered triangle surface.
    // Intersect constant-X and constant-Z planes with the mesh,
    // rather than drawing an unrelated flat grid.
    const gridPositions = [];
    const gridTolerance = 1e-7;

    function gridIntersections(triangle, axis, coordinate) {
      const hits = [];

      for (let edge = 0; edge < 3; edge++) {
        const ia = triangle[edge];
        const ib = triangle[(edge + 1) % 3];

        const a = axis === 'x'
          ? surfacePosition.getX(ia)
          : surfacePosition.getZ(ia);

        const b = axis === 'x'
          ? surfacePosition.getX(ib)
          : surfacePosition.getZ(ib);

        const difference = b - a;

        if (Math.abs(difference) < gridTolerance) continue;

        const t = (coordinate - a) / difference;

        if (t < -gridTolerance ||
            t > 1 + gridTolerance) continue;

        const u = Math.max(0, Math.min(1, t));

        const point = [
          surfacePosition.getX(ia) + u *
            (surfacePosition.getX(ib) -
             surfacePosition.getX(ia)),
          surfacePosition.getY(ia) + u *
            (surfacePosition.getY(ib) -
             surfacePosition.getY(ia)),
          surfacePosition.getZ(ia) + u *
            (surfacePosition.getZ(ib) -
             surfacePosition.getZ(ia)),
        ];

        if (!hits.some(q =>
          Math.hypot(
            point[0] - q[0],
            point[1] - q[1],
            point[2] - q[2]
          ) < gridTolerance
        )) {
          hits.push(point);
        }
      }

      return hits;
    }

    // Shared mathematical coordinates for grid lines AND labels.
    // Fullscreen uses nice 1/2/5 decimal intervals.
    // Thumbnails retain their original eleven-line grid.
    const niceStep = span => {
      const rough = span / 8;
      const power = 10 ** Math.floor(Math.log10(rough));
      const multiple = rough / power;
      const nice = multiple <= 1 ? 1
        : multiple <= 2 ? 2
        : multiple <= 5 ? 5 : 10;
      return nice * power;
    };

    const gridStepX = niceStep(spanX);
    const gridStepZ = niceStep(spanY);

    const coordinateValues = (span, step) => {
      const count = Math.floor(
        (span / 2 + step * 1e-9) / step
      );
      return Array.from(
        { length: count * 2 + 1 },
        (_, i) => (i - count) * step
      );
    };

    const mathematicalX = fullscreen
      ? coordinateValues(spanX, gridStepX)
      : Array.from(
          { length: 11 },
          (_, i) => -spanX / 2 + i * spanX / 10
        );

    const mathematicalZ = fullscreen
      ? coordinateValues(spanY, gridStepZ)
      : Array.from(
          { length: 11 },
          (_, i) => -spanY / 2 + i * spanY / 10
        );

    const gridXCoordinates = mathematicalX.map(
      x => x * meshWidth / spanX
    );

    const gridZCoordinates = mathematicalZ.map(
      z => z * meshDepth / spanY
    );

    for (let k = 0; k < indices.length; k += 3) {
      const triangle = [
        indices[k],
        indices[k + 1],
        indices[k + 2],
      ];

      const x0 = Math.min(
        surfacePosition.getX(triangle[0]),
        surfacePosition.getX(triangle[1]),
        surfacePosition.getX(triangle[2])
      );
      const x1 = Math.max(
        surfacePosition.getX(triangle[0]),
        surfacePosition.getX(triangle[1]),
        surfacePosition.getX(triangle[2])
      );
      const z0 = Math.min(
        surfacePosition.getZ(triangle[0]),
        surfacePosition.getZ(triangle[1]),
        surfacePosition.getZ(triangle[2])
      );
      const z1 = Math.max(
        surfacePosition.getZ(triangle[0]),
        surfacePosition.getZ(triangle[1]),
        surfacePosition.getZ(triangle[2])
      );

      for (const coordinate of gridXCoordinates) {
        if (coordinate < x0 - gridTolerance ||
            coordinate > x1 + gridTolerance) continue;

        const hits = gridIntersections(
          triangle,
          'x',
          coordinate
        );

        if (hits.length === 2) {
          gridPositions.push(...hits[0], ...hits[1]);
        }
      }

      for (const coordinate of gridZCoordinates) {
        if (coordinate < z0 - gridTolerance ||
            coordinate > z1 + gridTolerance) continue;

        const hits = gridIntersections(
          triangle,
          'z',
          coordinate
        );

        if (hits.length === 2) {
          gridPositions.push(...hits[0], ...hits[1]);
        }
      }
    }

    const gridGeometry = new THREE.BufferGeometry();
    gridGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(gridPositions, 3)
    );

    const gridMaterial = new THREE.LineBasicMaterial({
      color: "#38210a",
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });

    const gridLines = new THREE.LineSegments(
      gridGeometry,
      gridMaterial
    );

    plotGroup.add(gridLines);

    // Mathematical coordinate labels for the EXISTING grid.
    // These are baked flat onto the surface rather than floating above it.
    const gridLabelGroup = new THREE.Group();
    const gridLabelResources = [];
    plotGroup.add(gridLabelGroup);

    if (fullscreen) {
      const formatCoordinate = (value, step) => {
        const absStep = Math.abs(step);
        const tolerance = absStep * 1e-4;

        if (Math.abs(value) < tolerance) return "0";

        if (absStep >= 1) {
          const rounded = Math.round(value);
          if (Math.abs(value - rounded) < tolerance) {
            return String(rounded);
          }
        }

        const decimals = absStep >= 1
          ? 0
          : Math.max(1, Math.min(
              12, Math.ceil(-Math.log10(absStep)) + 1
            ));

        if (absStep < 1e-12) {
          return value.toExponential(2);
        }

        return String(Number(value.toFixed(decimals)));
      };

      const gridLabelEntries = [];

      const addFlatLabel = ({
        text,
        x,
        z,
        h,
      }) => {
        // A clipped or undefined height must not erase a valid
        // mathematical grid coordinate in the overhead view.
        // In 3D, such labels remain hidden.
        const onSurface = Number.isFinite(h) &&
          h >= verticalMin && h <= verticalMax;
        const anchorHeight = onSurface ? h : 0;

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.font = 'normal 48px "Times New Roman", Georgia, serif';
        const textWidth = Math.ceil(ctx.measureText(text).width);

        canvas.width = Math.max(64, textWidth + 20);
        canvas.height = 76;

        const draw = canvas.getContext("2d");
        if (!draw) return;

        draw.clearRect(0, 0, canvas.width, canvas.height);
        draw.fillStyle = "#ffffff";
        draw.strokeStyle = "rgba(0,0,0,0.9)";
        draw.lineWidth = 3;
        draw.lineJoin = "round";
        draw.font = 'normal 48px "Times New Roman", Georgia, serif';
        draw.textAlign = "center";
        draw.textBaseline = "middle";
        draw.strokeText(text, canvas.width / 2, canvas.height / 2);
        draw.fillText(text, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;

        const material = new THREE.SpriteMaterial({
          map: texture,
          color: "#ffffff",
          transparent: true,
          depthTest: true,
          depthWrite: false,
          sizeAttenuation: true,
        });

        const sprite = new THREE.Sprite(material);
        sprite.position.set(
          x * meshWidth / spanX,
          anchorHeight * 0.35 + 0.025,
          z * meshDepth / spanY
        );
        sprite.renderOrder = 50;

        gridLabelGroup.add(sprite);
        gridLabelEntries.push({
          sprite,
          aspect: canvas.width / canvas.height,
          x,
          z,
          baseHeight: anchorHeight,
          onSurface,
        });
        gridLabelResources.push({ texture, material });
      };

      // Keep labels camera-facing and approximately 19 screen
      // pixels high. Suppress overlapping or offscreen labels.
      const projectedLabelPosition = new THREE.Vector3();
      let lastLabelLayout = -Infinity;

      runtime.updateGridLabels = time => {
        if (!gridLabelGroup.visible) return;
        if (time - lastLabelLayout < 100) return;
        lastLabelLayout = time;

        const camera = runtime.camera;
        const heightPixels = Math.max(1, hostRef.current?.clientHeight || 1);
        const widthPixels = Math.max(1, hostRef.current?.clientWidth || 1);

        camera.updateMatrixWorld();

        const occupied = [];
        const fontHeight = 19;

        // A completed overhead view is an annotation view:
        // numbers must not be cut apart by the surface depth
        // buffer. Preserve true depth testing in 3D.
        const overhead =
          runtime.mode3D === false && !runtime.transition;

        for (const entry of gridLabelEntries) {
          const { sprite, aspect, x, z, baseHeight, onSurface } = entry;

          sprite.material.depthTest = !overhead;

          const cameraDistance = camera.position.distanceTo(
            sprite.position
          );

          // World-space size corresponding to a stable
          // screen-space font size for a perspective camera.
          const worldHeight = (
            2 * cameraDistance *
            Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)
          ) * fontHeight / (heightPixels * camera.zoom);

          sprite.scale.set(
            worldHeight * aspect,
            worldHeight,
            1
          );

          // Measure the surface around the full screen-facing
          // label footprint, not just its central grid point.
          // Keep the mathematical X/Z anchor exactly unchanged.
          const radiusX = Math.min(
            spanX / 2,
            worldHeight * aspect * spanX / meshWidth * 0.65
          );
          const radiusZ = Math.min(
            spanY / 2,
            worldHeight * aspect * spanY / meshDepth * 0.65
          );

          const samples = [
            [0, 0],
            [-radiusX, 0], [radiusX, 0],
            [0, -radiusZ], [0, radiusZ],
            [-radiusX, -radiusZ], [-radiusX, radiusZ],
            [radiusX, -radiusZ], [radiusX, radiusZ],
          ];

          // When viewing from underneath, clearance must be
          // measured toward the camera on the lower side.
          const above = camera.position.y >= baseHeight * 0.35;
          let requiredClearance = 0;
          let validSamples = 0;

          for (const [dx, dz] of samples) {
            const sx = x + dx;
            const sz = z + dz;

            if (Math.abs(sx) > spanX / 2 ||
                Math.abs(sz) > spanY / 2) continue;

            const neighbor = heightAt(sx, sz);

            if (!Number.isFinite(neighbor) ||
                neighbor < verticalMin ||
                neighbor > verticalMax) continue;

            validSamples += 1;

            const difference = above
              ? (neighbor - baseHeight) * 0.35
              : (baseHeight - neighbor) * 0.35;

            requiredClearance = Math.max(
              requiredClearance, difference
            );
          }

          // Do not let labels float far from their grid point.
          // Extreme slopes are better left without a number.
          const maxClearance = 0.16;
          const clearanceAllowed =
            validSamples >= 3 &&
            requiredClearance <= maxClearance;

          sprite.position.y =
            baseHeight * 0.35 +
            (above ? 1 : -1) *
              (0.025 + Math.min(requiredClearance, maxClearance));

          projectedLabelPosition.copy(sprite.position)
            .project(camera);

          const px = (projectedLabelPosition.x + 1) *
            widthPixels / 2;
          const py = (1 - projectedLabelPosition.y) *
            heightPixels / 2;

          const halfW = fontHeight * aspect / 2 + 7;
          const halfH = fontHeight / 2 + 5;

          const visible =
            (overhead || (onSurface && clearanceAllowed)) &&
            projectedLabelPosition.z > -1 &&
            projectedLabelPosition.z < 1 &&
            px - halfW > 8 &&
            px + halfW < widthPixels - 8 &&
            py - halfH > 8 &&
            py + halfH < heightPixels - 8 &&
            !occupied.some(box =>
              px - halfW < box.right &&
              px + halfW > box.left &&
              py - halfH < box.bottom &&
              py + halfH > box.top
            );

          sprite.visible = visible;

          if (visible) {
            occupied.push({
              left: px - halfW,
              right: px + halfW,
              top: py - halfH,
              bottom: py + halfH,
            });
          }
        }
      };

      // Use the EXACT same mathematical coordinates as
      // the lines created by gridIntersections above.
      // Thus every number belongs to an actual grid line.
      for (const x of mathematicalX) {
        if (Math.abs(x) < gridStepX * 1e-8) continue;

        addFlatLabel({
          text: formatCoordinate(x, gridStepX),
          x,
          z: 0,
          h: heightAt(x, 0),
          font: 'normal 26px "Times New Roman", Georgia, serif',
          heightWorld: 0.06,
        });
      }

      for (const z of mathematicalZ) {
        if (Math.abs(z) < gridStepZ * 1e-8) continue;

        addFlatLabel({
          text: formatCoordinate(z, gridStepZ),
          x: 0,
          z,
          h: heightAt(0, z),
          font: 'normal 26px "Times New Roman", Georgia, serif',
          heightWorld: 0.06,
        });
      }
    }
    runtime.gridLabelGroup = gridLabelGroup;
    runtime.contourLines = contourLines;
    runtime.gridLines = gridLines;

    // Both thumbnails and fullscreen plots use the selected overlay.
    contourLines.visible = lineMode !== "grid";
    gridLines.visible = lineMode === "grid";
    gridLabelGroup.visible =
      fullscreen && lineMode === "grid" && showGridLabels;

    return () => {
      plotGroup.remove(surface);
      plotGroup.remove(contourLines);
      plotGroup.remove(gridLines);
      plotGroup.remove(gridLabelGroup);
      if (runtime.gridLabelGroup === gridLabelGroup) {
        runtime.gridLabelGroup = null;
      }
      if (runtime.updateGridLabels) {
        runtime.updateGridLabels = null;
      }
      for (const resource of gridLabelResources) {
        resource.texture.dispose();
        resource.material.dispose();
      }
      if (topEdgeLines) plotGroup.remove(topEdgeLines);

      if (runtime.contourLines === contourLines) {
        runtime.contourLines = null;
      }
      if (runtime.gridLines === gridLines) {
        runtime.gridLines = null;
      }

      if (topEdgeGeometry) topEdgeGeometry.dispose();
      if (topEdgeMaterial) topEdgeMaterial.dispose();
      gridGeometry.dispose();
      gridMaterial.dispose();
      contourGeometry.dispose();
      contourMaterial.dispose();
      geometry.dispose();
      material.dispose();
      if (runtime.surfaceMaterial === material) {
        runtime.surfaceMaterial = null;
      }
    };
  }, [constantIndex, inverted, real, scale, heightRange, fullscreen]);

  // Toggle line overlays without reconstructing the mesh.
  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;

    if (runtime.contourLines) {
      runtime.contourLines.visible = lineMode !== "grid";
    }

    if (runtime.gridLines) {
      runtime.gridLines.visible = lineMode === "grid";
    }

    if (runtime.gridLabelGroup) {
      runtime.gridLabelGroup.visible =
        fullscreen && lineMode === "grid" && showGridLabels;
    }
  }, [lineMode, fullscreen, showGridLabels]);

  // Appearance-only color update: geometry remains fixed.
  useEffect(() => {
    const material = runtimeRef.current?.surfaceMaterial;
    if (material) material.color.set(surfaceColor);
  }, [surfaceColor, constantIndex, inverted, real, scale, heightRange]);

  // Update the existing light without recreating geometry.
  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;

    runtime.ambient.intensity = ambientStrength;
    runtime.light.intensity = lightStrength;

    runtime.lightingState = {
      direction: lightDirection,
      elevation: lightElevation,
      orbit: lightOrbit,
    };
  }, [
    ambientStrength,
    lightStrength,
    lightDirection,
    lightElevation,
    lightOrbit,
  ]);

  return (
    <div style={{
      width: "100%",
      maxWidth: '100%',
      height: fullscreen ? '100%' : 'auto',
      margin: "0 auto",
      color: "#ddd",
      fontFamily: "Arial, sans-serif",
    }}>
      <div
        ref={hostRef}
        onPointerDownCapture={event => {
          pointerStartRef.current = event.button === 0
            ? { x: event.clientX, y: event.clientY }
            : null;

          if (
            event.button === 0 &&
            orientationLink &&
            !fullscreen &&
            is3D
          ) {
            orientationLink.current.owner =
              orientationIdRef.current;
          }
        }}
        onClick={event => {
          const start = pointerStartRef.current;
          pointerStartRef.current = null;

          if (!start || !openRef.current) return;

          if (Math.hypot(
            event.clientX - start.x,
            event.clientY - start.y
          ) > 5) return;

          const camera = cameraRef.current;
          if (!camera) return;

          openRef.current({
            position: camera.position.toArray(),
            up: camera.up.toArray(),
          });
        }}
        style={{
          width: "100%",
          height: fullscreen ? '100%' : 'auto',
          aspectRatio: fullscreen ? 'auto' : "16 / 9",
          border: "1px solid #3d4752",
          borderRadius: 8,
          overflow: "hidden",
          background: transparentBackground
            ? "transparent"
            : "#101318",
        }}
      />


    </div>
  );
}
