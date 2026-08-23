"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  DEFAULT_FIGURE_EIGHT_CUSP_COORDINATE_SPEC,
  DEFAULT_FIGURE_EIGHT_S3_GEOMETRY,
  FIGURE_EIGHT_CUSP_DOMAIN_CORNERS,
  FIGURE_EIGHT_CUSP_HEIGHT,
  FIGURE_EIGHT_CUSP_LONGITUDE_U_SLOPE,
  FIGURE_EIGHT_CUSP_MINOR_ORIGIN,
  FIGURE_EIGHT_S3_STANDARD_PROJECTION,
  FIGURE_EIGHT_S3_SYMMETRIC_PROJECTION,
  cuspCoordinateDomainAxes,
  cuspDomainCoordinates,
  cuspRawPointFromCoordinates,
  cuspTubeCoordinates,
  figureEightS3CenterlinePoint,
  figureEightS3TubePoint4,
  interpolateFigureEightS3Projection,
  rotateFigureEightS3MixedPlanes,
  stereographicFigureEightS3Point,
} from "./figureEightS3Geometry";
import {
  createFigureEightS3ComplementProjection,
} from "./figureEightS3ComplementProjection";
import {
  analyzeSurfaceContacts,
  analyzeSweptSurfaceContacts,
  collectSurfaceBarrierContacts,
} from "./surfaceCollisionDiagnostics";
import {
  createIntrinsicCuspBoundaryCorrespondence,
  createIntrinsicQuotientMesh,
  createIntrinsicVolumeDebugGeometry,
  createIntrinsicVolumeMeshes,
  validateIntrinsicVolumeQuotient,
} from "./intrinsicVolumeMesh";
import {
  createIntrinsicS3CanonicalGeometryState,
  createIntrinsicS3InitialSolverState,
  createIntrinsicS3RefinedCanonicalGeometryState,
  loadIntrinsicS3ConstructiveVolumeState,
} from "./intrinsicS3VolumeSolver";
import {
  loadCertifiedM004SourceSupport,
} from "./certifiedM004AnimationSystem";
import {
  auditCanonicalABInterfaceEmbedding,
} from "./canonicalABInterfaceAudit";
import {
  buildMenascoThreeBallPresentation,
} from "./menascoThreeBallPresentation";

const SCALE = 96;
export const DEFAULT_TRUNCATION_FRACTION = 0.08;
export const MIN_TRUNCATION_FRACTION = 0.04;
export const MAX_TRUNCATION_FRACTION = 0.33;
/*
 * Initial cut-open display spacing.
 *
 * The canonical tetrahedra have no intrinsic ambient separation.
 * Keep them 30% closer than the previous presentation layout;
 * later certified registration is free to move them as required.
 */
export const DEFAULT_TETRAHEDRON_SEPARATION = 420;
export const MIN_TETRAHEDRON_SEPARATION =
  DEFAULT_TETRAHEDRON_SEPARATION;
export const MAX_TETRAHEDRON_SEPARATION = 900;

function interiorBridgePulseStrength(
  segmentIndex,
  pulseStep
) {
  if (
    !Number.isInteger(segmentIndex) ||
    !Number.isInteger(pulseStep)
  ) {
    return 0;
  }

  const distance =
    pulseStep - segmentIndex;

  if (
    distance < 0 ||
    distance >
      INTERIOR_BRIDGE_PULSE_TAIL_STEPS
  ) {
    return 0;
  }

  if (distance === 0) {
    return 1;
  }

  if (distance === 1) {
    return 0.62;
  }

  if (distance === 2) {
    return 0.34;
  }

  return 0.16;
}

function normalizeTruncationFraction(
  value
) {
  const numericValue =
    Number.isFinite(value)
      ? value
      : DEFAULT_TRUNCATION_FRACTION;

  return Math.max(
    MIN_TRUNCATION_FRACTION,
    Math.min(
      MAX_TRUNCATION_FRACTION,
      numericValue
    )
  );
}

function normalizeTetrahedronSeparation(
  value
) {
  const numericValue =
    Number.isFinite(value)
      ? value
      : DEFAULT_TETRAHEDRON_SEPARATION;

  return Math.max(
    MIN_TETRAHEDRON_SEPARATION,
    Math.min(
      MAX_TETRAHEDRON_SEPARATION,
      numericValue
    )
  );
}

export const SEAM_TRANSITION_DURATION_MS = 4000;
const PAIRING_DURATION_MS = 1800;
const FIRST_FACE_ROTATION_END = 0.34;
const FIRST_FACE_ORBIT_END = 0.72;
const SECOND_FACE_BRIDGE_SEGMENTS = 56;
const INTERIOR_BRIDGE_PULSE_STEP_MS = 9;
const INTERIOR_BRIDGE_PULSE_PAUSE_STEPS = 2;
const INTERIOR_BRIDGE_PULSE_TAIL_STEPS = 3;
const SECOND_FACE_BRIDGE_ARC_SAMPLES = 320;
const SECOND_FACE_BRIDGE_COLLAR = 72;
const SECOND_FACE_BRIDGE_COLLAR_FRACTION = 0.2;
const SECOND_FACE_BRIDGE_ARCH = 300;
const SECOND_FACE_BRIDGE_MID_SCALE = 0.44;
const SECOND_FACE_BRIDGE_FULL_STRENGTH = 0.995;

/*
 * Released-face geometry is the ambient realization used once
 * more than one face identification is collapsed. Each released
 * face first leaves its cell along the local outward normal, then
 * bends toward a shared identification face outside the compact
 * two-cell core. Ratios are measured from the face radius so the
 * construction scales with the selected base-cell size.
 */
const RELEASED_FACE_COLLAR_SEGMENTS = 6;
const RELEASED_FACE_DEPARTURE_RATIO = 0.72;
const RELEASED_FACE_CLEARANCE_RATIO = 0.92;
const RELEASED_FACE_APPROACH_RATIO = 0.34;
const RELEASED_FACE_MAX_INFLATION = 1.6;

/*
 * Once a second face is collapsed, the released collars are allowed
 * to pull on the cell meshes themselves. The shared identification
 * face stays fixed during that relaxation pass; the attachment loops
 * move toward it while edge/shape constraints distribute the motion
 * through the complete connected cell complex.
 */
const RELEASED_CELL_RELAX_ITERATIONS = 96;
const RELEASED_CELL_PULL_STIFFNESS = 0.35;
const RELEASED_CELL_PULL_FRACTION = 0.60;
const RELEASED_CELL_SHAPE_STIFFNESS = 0.12;
const RELEASED_CELL_MAX_VERTEX_STEP = 8.0;
export const FACE_MAPPING_DURATION_MS = 1100;
const BRIDGE_ROUTE_CHANGE_DURATION_MS = 1100;
const BRIDGE_TRANSITION_RETRACT_END = 0.22;
const BRIDGE_TRANSITION_REATTACH_START = 0.78;
const BRIDGE_ROUTE_CHANGE_PENALTY = 100000;
const BRIDGE_ROUTE_SWEEP_SAMPLE_COUNT = 9;
const BRIDGE_ATTACHMENT_AUDIT_SEGMENT_WINDOW = 2;
const BRIDGE_ROUTE_SWEEP_CLEARANCE = 180;
const BRIDGE_ROUTE_SWEEP_CLEARANCE_PENALTY = 24000;
const BRIDGE_ROUTE_SWEEP_FAILURE_PENALTY = 500000;
const BRIDGE_SWEEP_ROUTE_CACHE_LIMIT = 64;
const BRIDGE_SWEEP_ROUTE_CACHE = new Map();
const BRIDGE_AUDIT_EPSILON = 1e-6;
/*
 * Triangles within this many longitudinal strips belong
 * to one local patch of the same bridge surface. Testing
 * them as independent surfaces creates false positives
 * where a curved or twisting collar folds its triangulation
 * closely around adjacent rings.
 */
const BRIDGE_AUDIT_LOCAL_SEGMENT_WINDOW = 3;
const BRIDGE_AUDIT_MAX_HITS = 16;
const BRIDGE_AUDIT_CACHE_LIMIT = 256;
const BRIDGE_AUDIT_CACHE = new Map();
const BRIDGE_ROUTE_SELECTION_CACHE_LIMIT = 256;
const BRIDGE_ROUTE_SELECTION_CACHE = new Map();

const DEFAULT_BRIDGE_ROUTE_SPEC =
  Object.freeze({
    id: "radial-exterior",
    kind: "c2-radial-arch",
    family: "exterior",
    lane: 0,
    archDistance:
      SECOND_FACE_BRIDGE_ARCH,
    lateralOffset: 0,
  });

/*
 * The one reusable bridge for faces that do not already
 * share an edge in the quotient. It uses the same arch
 * scale as the edge-adjacent bridge, with one moderate
 * lateral displacement to clear the existing complex.
 */
const NONADJACENT_BRIDGE_ROUTE_SPEC =
  Object.freeze({
    id: "nonadjacent-exterior",
    kind: "c2-offset-arch",
    family: "exterior",
    lane: 1,
    archDistance:
      SECOND_FACE_BRIDGE_ARCH,
    lateralOffset: 220,
  });

const BRIDGE_ROUTE_CANDIDATE_SPECS =
  Object.freeze([
    Object.freeze({
      ...DEFAULT_BRIDGE_ROUTE_SPEC,
      bridgeType: "edge-adjacent",
    }),
    Object.freeze({
      id: "edge-adjacent-positive-inner",
      kind: "c2-offset-arch",
      family: "exterior",
      bridgeType: "edge-adjacent",
      lane: 1,
      archDistance:
        SECOND_FACE_BRIDGE_ARCH,
      lateralOffset: 180,
    }),
    Object.freeze({
      id: "edge-adjacent-negative-inner",
      kind: "c2-offset-arch",
      family: "exterior",
      bridgeType: "edge-adjacent",
      lane: 2,
      archDistance:
        SECOND_FACE_BRIDGE_ARCH,
      lateralOffset: -180,
    }),
    Object.freeze({
      id: "edge-adjacent-positive-outer",
      kind: "c2-offset-arch",
      family: "exterior",
      bridgeType: "edge-adjacent",
      lane: 3,
      archDistance:
        SECOND_FACE_BRIDGE_ARCH,
      lateralOffset: 320,
    }),
    Object.freeze({
      id: "edge-adjacent-negative-outer",
      kind: "c2-offset-arch",
      family: "exterior",
      bridgeType: "edge-adjacent",
      lane: 4,
      archDistance:
        SECOND_FACE_BRIDGE_ARCH,
      lateralOffset: -320,
    }),
    Object.freeze({
      ...NONADJACENT_BRIDGE_ROUTE_SPEC,
      bridgeType: "nonadjacent",
    }),
    Object.freeze({
      id: "nonadjacent-negative-inner",
      kind: "c2-offset-arch",
      family: "exterior",
      bridgeType: "nonadjacent",
      lane: 6,
      archDistance:
        SECOND_FACE_BRIDGE_ARCH,
      lateralOffset: -220,
    }),
    Object.freeze({
      id: "nonadjacent-positive-outer",
      kind: "c2-offset-arch",
      family: "exterior",
      bridgeType: "nonadjacent",
      lane: 7,
      archDistance:
        SECOND_FACE_BRIDGE_ARCH,
      lateralOffset: 360,
    }),
    Object.freeze({
      id: "nonadjacent-negative-outer",
      kind: "c2-offset-arch",
      family: "exterior",
      bridgeType: "nonadjacent",
      lane: 8,
      archDistance:
        SECOND_FACE_BRIDGE_ARCH,
      lateralOffset: -360,
    }),
    Object.freeze({
      id: "nonadjacent-center",
      kind: "c2-radial-arch",
      family: "exterior",
      bridgeType: "nonadjacent",
      lane: 9,
      archDistance:
        SECOND_FACE_BRIDGE_ARCH,
      lateralOffset: 0,
    }),
  ]);

/*
 * EXTEND CUSPS
 *
 * The first material triangle demonstrates the complete extension
 * slowly. Once the operation is visually established, the other
 * seven repeat it in a faster overlapping cascade.
 */
export const CUSP_ASSEMBLY_DURATION_MS = 4800;
export const CUSP_DOMAIN_ASSEMBLY_DURATION_MS = 7200;

/*
 * FIRST PERIPHERAL IDENTIFICATION
 *
 * Give the eye a deliberate stationary material-registration
 * moment before any geometry moves.
 *
 *   0.0 - 0.9 s : fully colored triangles remain still
 *   0.9 - 4.5 s : those exact triangles roll into the cylinder
 */
export const CUSP_FIRST_WRAP_DURATION_MS = 4500;
const CUSP_FIRST_WRAP_COLOR_HOLD_MS = 900;
const CUSP_FIRST_WRAP_HOLD_FRACTION =
  CUSP_FIRST_WRAP_COLOR_HOLD_MS /
  CUSP_FIRST_WRAP_DURATION_MS;

/*
 * SECOND PERIPHERAL IDENTIFICATION
 *
 * Keep the slower explanatory cylinder -> figure-eight weave.
 */
export const CUSP_WRAP_DURATION_MS = 12000;

const CUSP_LAYOUT_CHANGE_DURATION_MS = 4000;

/*
 * Convert the first peripheral clock into geometric motion.
 *
 * The triangle colors are already the canonical material colors,
 * so nothing fades or recolors here. The surface simply remains
 * stationary for the opening hold and then begins rolling.
 */
function firstPeripheralWrapGeometryProgress(
  clockProgress
) {
  const progress =
    Math.max(
      0,
      Math.min(1, clockProgress)
    );

  if (
    progress <=
    CUSP_FIRST_WRAP_HOLD_FRACTION
  ) {
    return 0;
  }

  const rollingProgress =
    (
      progress -
      CUSP_FIRST_WRAP_HOLD_FRACTION
    ) /
    (
      1 -
      CUSP_FIRST_WRAP_HOLD_FRACTION
    );

  return smootherUnitInterval(
    Math.max(
      0,
      Math.min(
        1,
        rollingProgress
      )
    )
  );
}


/*
 * ============================================================
 * FIGURE-EIGHT WEAVE
 * ============================================================
 *
 * The second peripheral identification is deliberately shown in
 * two visually distinct phases.
 *
 * PHASE 1
 *   first-wrap cylinder
 *       ->
 *   long, thin, displaced feed tube
 *
 * PHASE 2
 *   long thin feed tube
 *       ->
 *   progressively woven figure-eight tube
 *
 * These constants affect only the explanatory path between the
 * two exact endpoints.
 *
 * progress = 0:
 *   exact first-wrap cylinder
 *
 * progress = 1:
 *   exact shared S^3 figure-eight tube used by Projection Lab
 */

/*
 * Fraction of the 12-second second identification devoted to
 * visibly stretching/thinning/staging the feed tube.
 */
const FIGURE_EIGHT_WEAVE_PREP_FRACTION = 0.30;

/*
 * Prepared feed-tube geometry.
 */
const FIGURE_EIGHT_WEAVE_PREP_LENGTH_SCALE = 1.65;
const FIGURE_EIGHT_WEAVE_PREP_RADIUS_SCALE = 0.52;

/*
 * Move the prepared tube away from the knot in TWO independent
 * spatial directions.
 *
 * The first offset is perpendicular to the cylinder axis within
 * the old cusp plane.
 *
 * The second offset moves it out of that plane.
 *
 * This prevents the unwoven material from sitting directly on top
 * of the figure-eight it is about to become.
 */
const FIGURE_EIGHT_WEAVE_STAGING_TRANSVERSE_OFFSET = 120;
const FIGURE_EIGHT_WEAVE_STAGING_DEPTH_OFFSET = 170;

/*
 * Fraction of the feed tube actively bending at one time.
 *
 * Smaller -> sharper traveling bend.
 * Larger  -> broader, softer bend.
 */
const FIGURE_EIGHT_WEAVE_FRONT_WIDTH = 0.18;
const CUSP_FLAT_UNIT = 90;
const CUSP_LONG_CYLINDER_RADIUS = 42;
const CUSP_LONG_CYLINDER_LENGTH = 720;
const CUSP_SHORT_CYLINDER_RADIUS = 42;
const CUSP_SHORT_CYLINDER_LENGTH = 720;

/*
 * ============================================================
 * PERSISTENT CUSP MATERIAL TRANSPORT
 * ============================================================
 *
 * The source and assembled cusp are now two positions of ONE mesh.
 *
 * Extend:
 *
 *   truncation triangle -> halfway to its assembled cusp slot
 *
 * Assemble:
 *
 *   halfway position -> exact assembled fundamental domain
 *
 * No collars, funnels, prisms, or replacement surfaces belong to
 * this material transport.
 */
const CUSP_EXTEND_TRANSPORT_FRACTION = 0.5;

const KNOT_VIEW_DURATION_MS = 1800;

/*
 * In the canonical completed cusp, v runs around the torus major circle,
 * so splitting by v divides the doughnut around its left/right sweep.
 * The bagel-style top/bottom cut is instead the minor-circle direction,
 * represented by u when the canonical long boundary is wrapped first.
 *
 * Route indices are A0,A1,A2,A3,B0,B1,B2,B3. The four A cusp triangles
 * all have centroid u = 2/3, while the four B cusp triangles all have
 * centroid u = 1/3. Therefore the desired two meridional halves are
 * exactly A0..A3 versus B0..B3. The lane values order each quartet
 * around the major-circle v direction while it is gathered.
 */
const FIGURE_EIGHT_KNOT_BUNDLE_ID_BY_ROUTE_INDEX =
  Object.freeze([
    0, 0, 0, 0,
    1, 1, 1, 1,
  ]);

const FIGURE_EIGHT_KNOT_BUNDLE_LANE_BY_ROUTE_INDEX =
  Object.freeze([
    -0.5, 1.5, -1.5, 0.5,
    -0.5, 0.5, 1.5, -1.5,
  ]);

/*
 * The two four-funnel groups now share one actual figure-eight-knot
 * centerline.  The A quartet occupies one semicircle of the tube and the
 * B quartet occupies the complementary semicircle.  Their individual
 * lane order remains visible as four colored strips on each half.
 */
const FIGURE_EIGHT_KNOT_COMMON_SCALE_X = 270;
const FIGURE_EIGHT_KNOT_COMMON_SCALE_Y = 225;
const FIGURE_EIGHT_KNOT_COMMON_SCALE_Z = 172.5;
const FIGURE_EIGHT_KNOT_COMMON_PHASE = 0.125;
const FIGURE_EIGHT_KNOT_COMMON_TUBE_RADIUS = 18;
const FIGURE_EIGHT_KNOT_FRAME_EPSILON = 1e-3;
const FIGURE_EIGHT_KNOT_CORE_SAMPLES = 320;

/*
 * The final m004 ambient realization is the same S^3 tube used
 * by the Projection Lab. The cusp material coordinates therefore
 * terminate on one canonical geometric object rather than on a
 * constructor-specific approximation.
 */

/*
 * Peripheral basis correction for the m004 cusp development.
 *
 * Let U and V be the two translations of CUSP_DOMAIN_CORNERS. In the
 * current equilateral cusp layout, U is the unit meridian translation,
 * while the preferred longitude is V + 2U. Equivalently,
 * V = longitude - 2 meridian.
 *
 * Raw domain coordinates therefore correspond to preferred peripheral
 * coordinates (m, l) = (u - 2v, v).
 */
const FIGURE_EIGHT_CUSP_LONGITUDE_MERIDIAN_SHEAR =
  FIGURE_EIGHT_CUSP_LONGITUDE_U_SLOPE;

const FIGURE_EIGHT_REFERENCE_Z_FLATTENING = 1;
const FIGURE_EIGHT_REFERENCE_TARGET_EXTENT = 1500;
const FIGURE_EIGHT_REFERENCE_FIT_T_SAMPLES = 72;
const FIGURE_EIGHT_REFERENCE_FIT_THETA_SAMPLES = 12;
const FIGURE_EIGHT_PROJECTION_POLE_EPSILON = 0.012;

const FIGURE_EIGHT_KNOT_BUNDLE_MERGE_START = 0.06;
const FIGURE_EIGHT_KNOT_BUNDLE_MERGE_END = 0.20;
const FIGURE_EIGHT_KNOT_BUNDLE_FAN_START = 0.80;
const FIGURE_EIGHT_KNOT_BUNDLE_FAN_END = 0.94;
const FIGURE_EIGHT_KNOT_BUNDLE_PULL = 0.95;
const FIGURE_EIGHT_KNOT_BUNDLE_SHAPE_SCALE = 0.44;
const FIGURE_EIGHT_KNOT_LOCAL_TANGENT_SCALE = 0.42;

const CUSP_MESH_DIVISIONS = 8;

/*
 * Connected cusp-surface tessellation.
 *
 * The control specifies the ACTUAL number of triangular facets
 * on the complete eight-tile cusp surface.
 *
 * 288 = 8 * 6^2
 * 288^2 = 82,944
 *
 * Counts advance by 16: eight material triangles times the +2
 * faces created by one boundary-preserving centroid refinement.
 */
export const MIN_CUSP_MESH_FACE_COUNT = 288;
export const MAX_CUSP_MESH_FACE_COUNT = 288 ** 2;
export const DEFAULT_CUSP_MESH_FACE_COUNT =
  8 * 40 ** 2;
export const CUSP_MESH_FACE_STEP = 16;

/*
 * Keep the long cylinder -> figure-eight weave light enough to
 * animate smoothly. A coarser user-selected mesh remains coarse.
 */
const CUSP_KNOT_ANIMATION_FACE_COUNT =
  8 * 24 ** 2;

function normalizeCuspMeshFaceCount(value) {
  const numericValue =
    Number.isFinite(value)
      ? value
      : DEFAULT_CUSP_MESH_FACE_COUNT;

  const clampedValue =
    Math.max(
      MIN_CUSP_MESH_FACE_COUNT,
      Math.min(
        MAX_CUSP_MESH_FACE_COUNT,
        numericValue
      )
    );

  return Math.max(
    MIN_CUSP_MESH_FACE_COUNT,
    Math.min(
      MAX_CUSP_MESH_FACE_COUNT,
      Math.round(
        clampedValue /
          CUSP_MESH_FACE_STEP
      ) *
        CUSP_MESH_FACE_STEP
    )
  );
}

const CUSP_EDGE_SAMPLES = 160;
const CUSP_CENTER_SAMPLES = 24;
const CUSP_HEIGHT =
  FIGURE_EIGHT_CUSP_HEIGHT;
const CUSP_COLLAR_LENGTH = 177;
const CUSP_COLLAR_LOCAL_SEGMENTS = 8;
const CUSP_COLLAR_ROUTE_SEGMENTS = 56;
const CUSP_COLLAR_ROUTE_DEPARTURE = 420;

/*
 * HALF-SPACE STAGING FOR THE PERMANENT TRIANGULAR FUNNELS
 *
 * The developed cusp lies in x = 0.
 *
 *   A routes remain in x < 0.
 *   B routes remain in x > 0.
 *
 * Each route first reaches a parallel copy of its final material
 * triangle. Only then does it make the short normal approach to
 * the actual x = 0 cusp-development plane.
 *
 * The collision solver may translate complete triangular
 * cross-sections, but it must never shrink them.
 */
const CUSP_FUNNEL_STAGING_DISTANCE = 170;
const CUSP_FUNNEL_FINAL_APPROACH_START = 0.80;

const CUSP_FUNNEL_RADIAL_BOW = 220;
const CUSP_FUNNEL_TANGENTIAL_LANE_SPACING = 42;

const CUSP_FUNNEL_HALFSPACE_CLEARANCE = 6;

/*
 * Collision-clearance seed.
 *
 * These displacements move whole triangular rings.
 */
const CUSP_FUNNEL_CLEARANCE_SIDE_PUSH = 120;
const CUSP_FUNNEL_CLEARANCE_RADIAL_PUSH = 180;
const CUSP_FUNNEL_CLEARANCE_TANGENTIAL_PUSH = 48;

/*
 * DISPLAY GRID FOR THE PERMANENT TRIANGULAR FUNNELS
 *
 * Geometry remains fully tessellated. These strides affect only the
 * explanatory grid that is drawn over the material surface.
 */
const CUSP_FUNNEL_LONGITUDINAL_GRID_STRIDE = 2;
const CUSP_FUNNEL_LOCAL_CROSS_GRID_STRIDE = 2;
const CUSP_FUNNEL_ROUTE_CROSS_GRID_STRIDE = 4;

const CUSP_WRAP_COLLISION_SWEEP_SAMPLES = 32;
const CUSP_WRAP_COLLISION_REFINEMENT_STEPS = 6;

/*
 * Every exposed boundary component owns protected ambient space
 * before later surface-routing stages are allowed to use it.
 * For the figure-eight cusp these are eight short triangular-prism
 * exit corridors, one for each truncation triangle.  The mechanism
 * is intentionally phrased as boundary clearance rather than as a
 * special-case cusp route so later boundary components can reuse it.
 */
const BOUNDARY_CLEARANCE_MARGIN = 18;
const BOUNDARY_CLEARANCE_ATTACHMENT_GAP = 0;
const BOUNDARY_CLEARANCE_EXIT_LENGTH =
  CUSP_COLLAR_LENGTH;
const BOUNDARY_CLEARANCE_EPSILON = 1e-6;

const CUSP_COLLAR_COLLISION_SWEEP_SAMPLES = 24;
const CUSP_COLLAR_COLLISION_REFINEMENT_STEPS = 5;
const CUSP_COLLAR_CERTIFICATION_CACHE_LIMIT = 24;
const CUSP_COLLAR_CERTIFICATION_CACHE = new Map();
const CUSP_BOUNDARY_WORLD_SCALE = 12;
const CUSP_BOUNDARY_OVERVIEW_ZOOM = 0.15;
const DEFAULT_PERSPECTIVE_DISTANCE = 950;

/*
 * Automatic framing is solved in the viewer's fixed 1000 x 700 SVG
 * coordinate system. The margins keep outlines and labels away from
 * the frame while allowing each construction stage to use most of it.
 */
const AUTO_FIT_VIEWBOX_WIDTH = 1000;
const AUTO_FIT_VIEWBOX_HEIGHT = 700;
const AUTO_FIT_MARGIN_X = 70;
const AUTO_FIT_MARGIN_Y = 52;

/*
 * A connected planar development of all eight cusp
 * triangles. The remaining boundary edges are paired
 * by the two translations of this parallelogram.
 *
 * Each inner key is the neighboring ideal vertex
 * represented by that corner of the cusp triangle.
 */
const CUSP_FLAT_LAYOUT = {
  A0: {
    1: { x: 0, y: 0 },
    2: { x: 1, y: 0 },
    3: { x: 0.5, y: CUSP_HEIGHT },
  },
  B0: {
    1: { x: 0, y: 0 },
    3: { x: 1, y: 0 },
    2: { x: 0.5, y: -CUSP_HEIGHT },
  },
  B3: {
    2: { x: 0, y: 0 },
    1: { x: 0.5, y: CUSP_HEIGHT },
    0: { x: -0.5, y: CUSP_HEIGHT },
  },
  A3: {
    1: { x: 0.5, y: -CUSP_HEIGHT },
    2: { x: 1, y: 0 },
    0: { x: 1.5, y: -CUSP_HEIGHT },
  },
  A2: {
    0: { x: -0.5, y: CUSP_HEIGHT },
    1: { x: 0.5, y: CUSP_HEIGHT },
    3: { x: 0, y: 2 * CUSP_HEIGHT },
  },
  B1: {
    3: { x: 1.5, y: -CUSP_HEIGHT },
    2: { x: 0.5, y: -CUSP_HEIGHT },
    0: { x: 1, y: -2 * CUSP_HEIGHT },
  },
  A1: {
    0: { x: 1, y: -2 * CUSP_HEIGHT },
    2: { x: 1.5, y: -CUSP_HEIGHT },
    3: { x: 2, y: -2 * CUSP_HEIGHT },
  },
  B2: {
    3: { x: 1, y: -2 * CUSP_HEIGHT },
    1: { x: 2, y: -2 * CUSP_HEIGHT },
    0: { x: 1.5, y: -3 * CUSP_HEIGHT },
  },
};

const CUSP_DOMAIN_CORNERS =
  FIGURE_EIGHT_CUSP_DOMAIN_CORNERS;

/*
 * The parallelogram is only the geometric slot template. Which cusp
 * triangle occupies each slot is derived from the four selected cyclic
 * face maps, so changing a bridge angle changes the assembled cusp.
 */
const CUSP_TILE_IDS = Object.freeze([
  "A0", "A1", "A2", "A3",
  "B0", "B1", "B2", "B3",
]);

function cuspTileCornerIndices(cuspBaseId) {
  const vertexIndex = Number(cuspBaseId.slice(1));
  return [0, 1, 2, 3].filter(
    (index) => index !== vertexIndex
  );
}

function cuspLayoutPointKey(point) {
  return `${point.x.toFixed(9)}:${point.y.toFixed(9)}`;
}

const {
  pointByKey: CUSP_SLOT_POINT_BY_KEY,
  pointKeysBySlot: CUSP_SLOT_POINT_KEYS,
  graph: CUSP_SLOT_GRAPH,
} = (() => {
  const pointByKey = new Map();
  const pointKeysBySlot = {};
  const edgeOwners = new Map();

  Object.entries(CUSP_FLAT_LAYOUT).forEach(([slotId, triangle]) => {
    const pointKeys = [...new Set(
      Object.values(triangle).map((point) => {
        const key = cuspLayoutPointKey(point);
        pointByKey.set(key, point);
        return key;
      })
    )];

    pointKeysBySlot[slotId] = pointKeys;

    for (let first = 0; first < 3; first += 1) {
      for (let second = first + 1; second < 3; second += 1) {
        const edge = [pointKeys[first], pointKeys[second]].sort();
        const edgeKey = edge.join("|");
        const record = edgeOwners.get(edgeKey) ?? { edge, slots: [] };
        record.slots.push(slotId);
        edgeOwners.set(edgeKey, record);
      }
    }
  });

  const graph = new Map(CUSP_TILE_IDS.map((slotId) => [slotId, []]));

  edgeOwners.forEach(({ edge, slots }) => {
    if (slots.length !== 2) return;
    const [firstSlot, secondSlot] = slots;
    graph.get(firstSlot).push({ nextSlot: secondSlot, edge });
    graph.get(secondSlot).push({ nextSlot: firstSlot, edge });
  });

  return { pointByKey, pointKeysBySlot, graph };
})();

function cuspDirectedEdgeGluings(facePairs, orientedMappingIndices) {
  const directed = new Map();

  function register(sourceId, targetId, correspondence) {
    const edgeKey = correspondence
      .map(([sourceCorner]) => sourceCorner)
      .sort((first, second) => first - second)
      .join(",");

    directed.set(`${sourceId}:${edgeKey}`, {
      targetId,
      targetCornerBySourceCorner: new Map(correspondence),
    });
  }

  facePairs.forEach((pair, pairId) => {
    const mappingIndex = normalizeCyclicMappingIndex(
      orientedMappingIndices?.[pairId] ?? 0
    );
    const permutation =
      CYCLIC_FACE_MAPPING_CHOICES[mappingIndex].vertexPermutation;

    pair.A.forEach((vertexA, localIndex) => {
      const vertexB = pair.B[permutation[localIndex]];
      const correspondence = [0, 1, 2]
        .filter((index) => index !== localIndex)
        .map((index) => [pair.A[index], pair.B[permutation[index]]]);

      register(`A${vertexA}`, `B${vertexB}`, correspondence);
      register(
        `B${vertexB}`,
        `A${vertexA}`,
        correspondence.map(([first, second]) => [second, first])
      );
    });
  });

  return directed;
}

function cuspLayoutScore(layout) {
  let score = 0;

  CUSP_TILE_IDS.forEach((tileId) => {
    Object.entries(CUSP_FLAT_LAYOUT[tileId]).forEach(([corner, reference]) => {
      const point = layout[tileId]?.[corner];
      if (!point) {
        score += 1e6;
        return;
      }
      score +=
        (point.x - reference.x) ** 2 +
        (point.y - reference.y) ** 2;
    });
  });

  return score;
}

function deriveCuspFlatLayout(facePairs, orientedMappingIndices) {
  const directed = cuspDirectedEdgeGluings(
    facePairs,
    orientedMappingIndices
  );
  const rootSlot = "A0";
  const rootPointKeys = CUSP_SLOT_POINT_KEYS[rootSlot];
  const candidates = [];

  CUSP_TILE_IDS.forEach((rootTileId) => {
    const rootCorners = cuspTileCornerIndices(rootTileId);

    for (let cyclicIndex = 0; cyclicIndex < 3; cyclicIndex += 1) {
      [false, true].forEach((reverse) => {
        const orderedCorners = rootCorners.map((_, index) => {
          const sourceIndex = reverse
            ? (cyclicIndex - index + 6) % 3
            : (cyclicIndex + index) % 3;
          return rootCorners[sourceIndex];
        });

        const assignments = new Map([[rootSlot, {
          tileId: rootTileId,
          cornerByPointKey: new Map(
            rootPointKeys.map((pointKey, index) => [
              pointKey,
              orderedCorners[index],
            ])
          ),
        }]]);
        const usedTileIds = new Set([rootTileId]);
        const assemblyOrder = [rootTileId];
        let valid = true;

        function propagate(slotId, parentSlot = null) {
          if (!valid) return;
          const source = assignments.get(slotId);

          CUSP_SLOT_GRAPH.get(slotId).forEach(({ nextSlot, edge }) => {
            if (!valid || nextSlot === parentSlot) return;

            const sourceCorners = edge.map((pointKey) =>
              source.cornerByPointKey.get(pointKey)
            );
            const sourceEdgeKey = [...sourceCorners]
              .sort((first, second) => first - second)
              .join(",");
            const gluing = directed.get(`${source.tileId}:${sourceEdgeKey}`);

            if (!gluing || usedTileIds.has(gluing.targetId)) {
              valid = false;
              return;
            }

            const targetEdgeCorners = sourceCorners.map((sourceCorner) =>
              gluing.targetCornerBySourceCorner.get(sourceCorner)
            );
            const thirdPointKey = CUSP_SLOT_POINT_KEYS[nextSlot]
              .find((pointKey) => !edge.includes(pointKey));
            const thirdCorner = cuspTileCornerIndices(gluing.targetId)
              .find((corner) => !targetEdgeCorners.includes(corner));

            assignments.set(nextSlot, {
              tileId: gluing.targetId,
              cornerByPointKey: new Map([
                [edge[0], targetEdgeCorners[0]],
                [edge[1], targetEdgeCorners[1]],
                [thirdPointKey, thirdCorner],
              ]),
            });
            usedTileIds.add(gluing.targetId);
            assemblyOrder.push(gluing.targetId);
            propagate(nextSlot, slotId);
          });
        }

        propagate(rootSlot);
        if (!valid || assignments.size !== 8 || usedTileIds.size !== 8) return;

        const layout = {};
        assignments.forEach(({ tileId, cornerByPointKey }) => {
          layout[tileId] = {};
          cornerByPointKey.forEach((corner, pointKey) => {
            layout[tileId][corner] = CUSP_SLOT_POINT_BY_KEY.get(pointKey);
          });
        });
        candidates.push({
          layout,
          assemblyOrder,
        });
      });
    }
  });

  if (candidates.length === 0) {
    return {
      layout: CUSP_FLAT_LAYOUT,
      assemblyOrder: [...CUSP_TILE_IDS],
      valid: false,
      candidateCount: 0,
    };
  }

  candidates.sort((first, second) =>
    cuspLayoutScore(first.layout) -
    cuspLayoutScore(second.layout)
  );

  return {
    layout: candidates[0].layout,
    assemblyOrder:
      candidates[0].assemblyOrder,
    valid: true,
    candidateCount: candidates.length,
  };
}

function cuspStagedExtensionProgress(
  progress,
  cuspBaseId,
  assemblyOrder
) {
  const order =
    Array.isArray(assemblyOrder) &&
    assemblyOrder.length > 0
      ? assemblyOrder
      : CUSP_TILE_IDS;

  const foundIndex =
    order.indexOf(cuspBaseId);

  const index =
    foundIndex >= 0
      ? foundIndex
      : 0;

  const p =
    clampUnit(progress);

  /*
   * Teach the operation once.
   *
   * The first triangle receives almost half of the complete
   * Extend-cusps clock, so the viewer can clearly see:
   *
   *   truncation face
   *       ->
   *   outward extrusion
   *       ->
   *   complete triangular extension.
   */
  /*
   * FIRST TRIANGLE
   *
   * Do not move immediately.
   *
   * The viewer must first register the actual truncation triangle
   * on the tetrahedron as the SOURCE of the cusp extension.
   */
  const firstHoldEnd = 0.14;
  const firstExtensionEnd = 0.50;

  if (index === 0) {
    return smootherUnitInterval(
      clampUnit(
        (
          p -
          firstHoldEnd
        ) /
        (
          firstExtensionEnd -
          firstHoldEnd
        )
      )
    );
  }

  /*
   * The first triangle is now fully extended and remains still
   * for a short registration beat.
   *
   * Then the remaining seven repeat the same operation quickly.
   */
  const cascadeStart = 0.56;
  const cascadeLastStart = 0.82;
  const cascadeWindow = 0.16;

  const remainingCount =
    Math.max(
      1,
      order.length - 1
    );

  const cascadeIndex =
    index - 1;

  const start =
    remainingCount <= 1
      ? cascadeStart
      : cascadeStart +
        (
          cascadeLastStart -
          cascadeStart
        ) *
        (
          cascadeIndex /
          (remainingCount - 1)
        );

  return smootherUnitInterval(
    clampUnit(
      (p - start) /
        cascadeWindow
    )
  );
}


function cuspStagedMaterialRevealProgress(
  progress,
  cuspBaseId,
  assemblyOrder
) {
  const order =
    Array.isArray(assemblyOrder) &&
    assemblyOrder.length > 0
      ? assemblyOrder
      : CUSP_TILE_IDS;

  const foundIndex =
    order.indexOf(cuspBaseId);

  const index =
    foundIndex >= 0
      ? foundIndex
      : 0;

  const p =
    clampUnit(progress);

  /*
   * FIRST TRIANGLE
   *
   * Fade its material coloring ONTO the original truncation
   * triangle while that triangle is still stationary.
   *
   * By the time geometric extension begins at p = 0.14,
   * the viewer has already seen exactly where it came from.
   */
  if (index === 0) {
    return smootherUnitInterval(
      clampUnit(
        (
          p -
          0.035
        ) /
        0.075
      )
    );
  }

  /*
   * Later triangles receive the same source-registration step,
   * but very quickly just before their own extension begins.
   */
  const cascadeStart = 0.56;
  const cascadeLastStart = 0.82;

  const remainingCount =
    Math.max(
      1,
      order.length - 1
    );

  const cascadeIndex =
    index - 1;

  const extensionStart =
    remainingCount <= 1
      ? cascadeStart
      : cascadeStart +
        (
          cascadeLastStart -
          cascadeStart
        ) *
        (
          cascadeIndex /
          (remainingCount - 1)
        );

  const revealStart =
    extensionStart - 0.035;

  return smootherUnitInterval(
    clampUnit(
      (
        p -
        revealStart
      ) /
      0.055
    )
  );
}


function cuspStagedFunnelAssemblyProgress(
  progress,
  cuspBaseId,
  assemblyOrder
) {
  const order =
    Array.isArray(assemblyOrder) &&
    assemblyOrder.length > 0
      ? assemblyOrder
      : CUSP_TILE_IDS;

  const foundIndex =
    order.indexOf(cuspBaseId);

  const index =
    foundIndex >= 0
      ? foundIndex
      : 0;

  const p =
    clampUnit(progress);

  /*
   * With the 7.2-second Assemble clock,
   * the first complete funnel gets about 2.2 seconds.
   */
  const firstEnd = 0.30;

  if (index === 0) {
    return smootherUnitInterval(
      clampUnit(
        p / firstEnd
      )
    );
  }

  /*
   * Once the operation has been demonstrated,
   * repeat it in a faster overlapping cascade.
   */
  const cascadeStart = 0.34;
  const cascadeLastStart = 0.88;
  const cascadeWindow = 0.12;

  const remainingCount =
    Math.max(
      1,
      order.length - 1
    );

  const cascadeIndex =
    index - 1;

  const start =
    remainingCount <= 1
      ? cascadeStart
      : cascadeStart +
        (
          cascadeLastStart -
          cascadeStart
        ) *
        (
          cascadeIndex /
          (remainingCount - 1)
        );

  return smootherUnitInterval(
    clampUnit(
      (p - start) /
        cascadeWindow
    )
  );
}


function cuspSequentialAssemblyProgress(
  progress,
  cuspBaseId,
  assemblyOrder
) {
  const order =
    Array.isArray(assemblyOrder) &&
    assemblyOrder.length > 0
      ? assemblyOrder
      : CUSP_TILE_IDS;

  const foundIndex =
    order.indexOf(cuspBaseId);

  const index =
    foundIndex >= 0
      ? foundIndex
      : 0;

  /*
   * Divide the complete four-second Assemble motion into eight
   * consecutive windows. A triangle starts only after the previous
   * gluing-adjacent triangle has reached its slot. Undo naturally
   * reverses the sequence because the global progress runs backward.
   */
  return smootherUnitInterval(
    clampUnit(
      progress * order.length - index
    )
  );
}

function interpolateCuspFlatLayouts(
  startLayout,
  endLayout,
  amount,
  assemblyOrder
) {
  return Object.fromEntries(CUSP_TILE_IDS.map((tileId) => {
    /*
     * A bridge-angle change is itself a new cusp assembly. Move the
     * triangles through the derived gluing order instead of morphing all
     * eight at once, so the visible development continues to explain how
     * the selected face maps determine the fundamental domain.
     */
    const tileProgress =
      cuspSequentialAssemblyProgress(
        amount,
        tileId,
        assemblyOrder
      );

    return [
      tileId,
      Object.fromEntries(cuspTileCornerIndices(tileId).map((corner) => {
        const start = startLayout[tileId][corner];
        const end = endLayout[tileId][corner];
        return [corner, {
          x: start.x + (end.x - start.x) * tileProgress,
          y: start.y + (end.y - start.y) * tileProgress,
        }];
      })),
    ];
  }));
}

function useAnimatedCuspFlatLayout(
  targetLayout,
  targetKey,
  assemblyOrder,
  duration = CUSP_LAYOUT_CHANGE_DURATION_MS
) {
  const layoutRef = useRef(targetLayout);
  const targetKeyRef = useRef(targetKey);

  const targetLayoutRef =
    useRef(targetLayout);

  const assemblyOrderRef =
    useRef(assemblyOrder);

  targetLayoutRef.current =
    targetLayout;

  assemblyOrderRef.current =
    assemblyOrder;

  const [layout, setLayout] =
    useState(targetLayout);

  const [
    transitionProgress,
    setTransitionProgress,
  ] = useState(1);

  useEffect(() => {
    const previousTargetKey =
      targetKeyRef.current;

    targetKeyRef.current =
      targetKey;

    /*
     * A render may supply a new layout object carrying exactly the
     * same semantic layout. targetKey is the authoritative identity.
     *
     * Do not call setLayout merely because object identity changed.
     */
    if (
      previousTargetKey ===
      targetKey
    ) {
      return undefined;
    }

    const targetLayoutForTransition =
      targetLayoutRef.current;

    const assemblyOrderForTransition =
      assemblyOrderRef.current;

    const startLayout =
      layoutRef.current;

    const startedAt =
      performance.now();

    let frameId = null;

    setTransitionProgress(
      (current) =>
        current === 0
          ? current
          : 0
    );

    function animate(now) {
      const raw = Math.max(
        0,
        Math.min(
          1,
          (now - startedAt) / duration
        )
      );

      /*
       * Make an angle change visibly reconstruct the cusp. During the
       * first fifth of the four-second transition, hold the old planar
       * layout while the attached triangles retract toward their collars.
       * The remaining time then builds the new derived layout in gluing
       * order, one triangle at a time.
       */
      const layoutRaw =
        raw <= 0.2
          ? 0
          : (raw - 0.2) / 0.8;

      const nextLayout = interpolateCuspFlatLayouts(
        startLayout,
        targetLayoutForTransition,
        bridgeTransitionMappingProgress(
          layoutRaw
        ),
        assemblyOrderForTransition
      );

      layoutRef.current = nextLayout;
      setLayout(nextLayout);
      setTransitionProgress(raw);

      if (raw < 1) {
        frameId = requestAnimationFrame(
          animate
        );
      }
    }

    frameId = requestAnimationFrame(animate);
    return () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [
    targetKey,
    duration,
  ]);

  return {
    layout,
    transitionProgress,
  };
}

function cuspLayoutReassemblyProgress(
  transitionProgress,
  cuspBaseId,
  assemblyOrder
) {
  const progress = clampUnit(
    transitionProgress
  );

  if (progress >= 1) {
    return 1;
  }

  if (progress <= 0.2) {
    return (
      1 -
      smootherUnitInterval(
        progress / 0.2
      )
    );
  }

  return cuspSequentialAssemblyProgress(
    (progress - 0.2) / 0.8,
    cuspBaseId,
    assemblyOrder
  );
}


/*
 * Connected eight-triangle cusp development for the figure-eight
 * sister manifold m003. The two non-zero boundary translations are
 * generated by (2, 0) and (1, -2 * CUSP_HEIGHT), so this is one
 * torus fundamental parallelogram.
 */
const FIGURE_EIGHT_SISTER_CUSP_FLAT_LAYOUT = {
  A0: {
    1: { x: 0, y: 0 },
    2: { x: 1, y: 0 },
    3: { x: 0.5, y: CUSP_HEIGHT },
  },
  A1: {
    2: { x: -0.5, y: CUSP_HEIGHT },
    3: { x: 0, y: 0 },
    0: { x: -1, y: 0 },
  },
  A2: {
    0: { x: 0, y: 0 },
    3: { x: 0.5, y: -CUSP_HEIGHT },
    1: { x: -0.5, y: -CUSP_HEIGHT },
  },
  A3: {
    0: { x: 0.5, y: -CUSP_HEIGHT },
    1: { x: 1, y: 0 },
    2: { x: 1.5, y: -CUSP_HEIGHT },
  },
  B0: {
    2: { x: -1, y: 0 },
    1: { x: 0, y: 0 },
    3: { x: -0.5, y: -CUSP_HEIGHT },
  },
  B1: {
    3: { x: 0, y: 0 },
    0: { x: 1, y: 0 },
    2: { x: 0.5, y: -CUSP_HEIGHT },
  },
  B2: {
    0: { x: 0, y: 0 },
    1: { x: 0.5, y: CUSP_HEIGHT },
    3: { x: -0.5, y: CUSP_HEIGHT },
  },
  B3: {
    1: { x: -1, y: 0 },
    0: { x: -0.5, y: CUSP_HEIGHT },
    2: { x: -1.5, y: CUSP_HEIGHT },
  },
};

const FIGURE_EIGHT_SISTER_CUSP_DOMAIN_CORNERS = [
  { x: -1.5, y: CUSP_HEIGHT },
  { x: 0.5, y: CUSP_HEIGHT },
  { x: 1.5, y: -CUSP_HEIGHT },
  { x: -0.5, y: -CUSP_HEIGHT },
];

/*
 * Material-coordinate handoff for cusp geometry.
 *
 * A developed cusp point first receives intrinsic domain coordinates
 * (u, v). A verified peripheral basis then converts those coordinates
 * to (meridian, longitude). The S^3 tube uses longitude as position
 * along the core and meridian as angle around the tube.
 *
 * m004 has the verified peripheral basis
 *
 *   m = u - 2v
 *   l = v
 *
 * The sister's developed domain is already known, while its preferred
 * peripheral basis remains deliberately unset until it is verified.
 */
const FIGURE_EIGHT_CUSP_COORDINATE_SPEC =
  DEFAULT_FIGURE_EIGHT_CUSP_COORDINATE_SPEC;

const FIGURE_EIGHT_SISTER_CUSP_COORDINATE_SPEC =
  Object.freeze({
    /*
     * m003 is displayed in the same long developed cusp-strip
     * coordinate template as m004. Its triangle assignment differs;
     * the geometric u/v slot coordinates do not.
     *
     * u and v therefore give the two primitive boundary cycles of
     * the displayed Sister fundamental domain.
     */
    domainCorners:
      CUSP_DOMAIN_CORNERS,

    /*
     * Primitive peripheral coordinates for the displayed m003 cusp.
     *
     * This is a material-coordinate basis:
     *
     *   meridian  = u
     *   longitude = v
     *
     * It is sufficient to place the Sister's singly-covered torus
     * onto the shared figure-eight tube. We are not claiming here
     * that this is a preferred knot-theoretic longitude for m003.
     */
    peripheralBasis:
      Object.freeze({
        meridian:
          Object.freeze({
            u: 1,
            v: 0,
          }),

        longitude:
          Object.freeze({
            u: 0,
            v: 1,
          }),
      }),

    closureKind: "figure-eight",

    minorOrigin:
      FIGURE_EIGHT_CUSP_MINOR_ORIGIN,
  });

const VERTICES = [
  { x: 1, y: 1, z: 1 },
  { x: -1, y: -1, z: 1 },
  { x: -1, y: 1, z: -1 },
  { x: 1, y: -1, z: -1 },
];

/*
 * DISPLAY VERTEX LABELS
 *
 * A and B are two copies of the same abstract tetrahedron.
 * Their opening display should therefore use the same intrinsic
 * face names and colors.
 *
 * Do NOT apply this map to the canonical gluing arrays. Those
 * arrays retain their existing ordered vertex correspondences.
 */
const B_DISPLAY_VERTEX_LABELS =
  Object.freeze([
    3, 1, 4, 2,
  ]);

function displayedTetrahedronVertexLabel(
  tetrahedronId,
  vertexIndex
) {
  if (
    tetrahedronId === "B"
  ) {
    return (
      B_DISPLAY_VERTEX_LABELS[
        vertexIndex
      ] ??
      vertexIndex + 1
    );
  }

  return vertexIndex + 1;
}

const TRUNCATION_NEIGHBORS = [
  [2, 1, 3],
  [0, 2, 3],
  [0, 3, 1],
  [2, 0, 1],
];

export const FIGURE_EIGHT_FACE_PAIRS = [
  {
    id: 0,
    label: "Yellow faces",
    color: "#ffe600",
    AColor: "#ffe600",
    BColor: "#ffe600",
    description: "A(123) ↔ B(124)",
    A: [0, 1, 2],
    B: [0, 1, 3],
  },
  {
    id: 1,
    label: "Blue faces",
    color: "#4da3ff",
    AColor: "#4da3ff",
    BColor: "#4da3ff",
    description: "A(124) ↔ B(432)",
    A: [0, 1, 3],
    B: [3, 2, 1],
  },
  {
    id: 2,
    label: "Green faces",
    color: "#159447",
    AColor: "#159447",
    BColor: "#159447",
    description: "A(134) ↔ B(132)",
    A: [0, 2, 3],
    B: [0, 2, 1],
  },
  {
    id: 3,
    label: "Red faces",
    color: "#ff2020",
    AColor: "#ff2020",
    BColor: "#ff2020",
    description: "A(234) ↔ B(341)",
    A: [1, 2, 3],
    B: [2, 3, 0],
  },
];

/*
 * ============================================================
 * CERTIFIED CANONICAL A/B ATLAS
 * ============================================================
 */
const CERTIFIED_CANONICAL_ATLAS_ANCHOR_PAIR_ID = 1;

const CERTIFIED_CANONICAL_VIEWER_TO_CELL_VERTEX =
  Object.freeze({
    A:
      Object.freeze([
        0, 1, 2, 3,
      ]),

    B:
      Object.freeze([
        3, 2, 1, 0,
      ]),
  });


function certifiedCanonicalCellRecordsMatchNodes(cellNodes, cellRecords) {
  if (!Array.isArray(cellNodes) || !Array.isArray(cellRecords) ||
      cellNodes.length !== cellRecords.length) return false;

  const expected = new Set(cellNodes);
  const observed = new Set(
    cellRecords.map((record) =>
      Array.isArray(record) && record.length === 17 ? record[0] : null
    )
  );

  return expected.size === cellNodes.length &&
    observed.size === cellRecords.length &&
    expected.size === observed.size &&
    [...expected].every((cellNode) => observed.has(cellNode));
}

function certifiedCanonicalCellFacet(cellRecord, facetIndex) {
  if (!Array.isArray(cellRecord) || cellRecord.length !== 17 ||
      !Number.isInteger(facetIndex) || facetIndex < 0 || facetIndex > 3) {
    return null;
  }

  const offset = 5 + 3 * facetIndex;

  return {
    facetIndex,
    neighborCellNode: cellRecord[offset],
    neighborFacetIndex: cellRecord[offset + 1],
    permutationIndex: cellRecord[offset + 2],
  };
}

function tetrahedronFacetOppositeVertex(faceVertices) {
  if (!Array.isArray(faceVertices) || faceVertices.length !== 3) {
    return null;
  }

  const used = new Set(faceVertices);

  const missing =
    [0, 1, 2, 3].filter(
      (vertexIndex) =>
        !used.has(vertexIndex)
    );

  return missing.length === 1
    ? missing[0]
    : null;
}


function decodeCertifiedCanonicalSourceTransition(
  record,
  reverseIndex
) {
  if (
    !Array.isArray(record) ||
    record.length < 11
  ) {
    return null;
  }

  const restoredLocalCellRecords =
    Array.isArray(record[9])
      ? record[9]
      : [];

  const removedLocalCellRecords =
    Array.isArray(record[10])
      ? record[10]
      : [];

  const localCellRecordsValid =
    certifiedCanonicalCellRecordsMatchNodes(
      Array.isArray(record[6])
        ? record[6]
        : [],
      restoredLocalCellRecords
    ) &&
    certifiedCanonicalCellRecordsMatchNodes(
      Array.isArray(record[7])
        ? record[7]
        : [],
      removedLocalCellRecords
    );

  return {
    reverseIndex,
    globalStep: record[0],
    kindCode: record[1],
    currentCellCount: record[2],
    resultingCellCount: record[3],
    currentVertexCount: record[4],
    resultingVertexCount: record[5],

    /*
     * Forward-removed cells are precisely the cells restored
     * when this event is traversed in reverse.
     */
    restoredCellNodes:
      Array.isArray(record[6])
        ? record[6]
        : [],

    /*
     * Forward-new cells disappear when the event is reversed.
     */
    removedCellNodes:
      Array.isArray(record[7])
        ? record[7]
        : [],

    frontierCellNodes:
      Array.isArray(record[8])
        ? record[8]
        : [],

    // Exact topology-asset triangulations on the two sides of this move.
    restoredLocalCellRecords,
    removedLocalCellRecords,
    localCellRecordsValid,
  };
}

function buildCertifiedCanonicalAtlasAudit(
  topology
) {
  const canonicalMap =
    topology?.canonicalMap;

  const finalCellNodes =
    topology?.finalCellNodes;

  /*
   * The atlas needs only the canonical two-cell record carried by
   * reverseEvents[0]. Do not build or validate any discarded reconstruction
   * history merely to recover these two exact cell records.
   */
  const sourceTransition =
    decodeCertifiedCanonicalSourceTransition(
      topology?.reverseEvents?.[0],
      0
    );

  if (
    !Array.isArray(canonicalMap) ||
    canonicalMap.length !== 2 ||
    !Array.isArray(finalCellNodes) ||
    finalCellNodes.length !== 2 ||
    !sourceTransition?.localCellRecordsValid
  ) {
    return {
      ready: false,
      error:
        "Canonical A/B atlas audit data are incomplete.",
      sheetRecords: [],
      transportSeedReady: false,
    };
  }

  const canonicalA =
    canonicalMap.find(
      (record) =>
        Array.isArray(record) &&
        record[1] === 0
    ) ?? null;

  const canonicalB =
    canonicalMap.find(
      (record) =>
        Array.isArray(record) &&
        record[1] === 1
    ) ?? null;

  const aCellNode =
    canonicalA?.[0];

  const bCellNode =
    canonicalB?.[0];

  const aCellRecord =
    sourceTransition
      .removedLocalCellRecords
      .find(
        (record) =>
          record?.[0] === aCellNode
      ) ?? null;

  const bCellRecord =
    sourceTransition
      .removedLocalCellRecords
      .find(
        (record) =>
          record?.[0] === bCellNode
      ) ?? null;

  const cellNames =
    topology?.cellNames ?? [];

  const canonicalCellMapVerified =
    Number.isInteger(aCellNode) &&
    Number.isInteger(bCellNode) &&
    finalCellNodes.includes(aCellNode) &&
    finalCellNodes.includes(bCellNode) &&
    cellNames[aCellNode] ===
      "M:6850:0" &&
    cellNames[bCellNode] ===
      "M:6850:1" &&
    Boolean(aCellRecord) &&
    Boolean(bCellRecord);

  const viewerToCellA =
    CERTIFIED_CANONICAL_VIEWER_TO_CELL_VERTEX.A;

  const viewerToCellB =
    CERTIFIED_CANONICAL_VIEWER_TO_CELL_VERTEX.B;

  const sheetRecords =
    FIGURE_EIGHT_FACE_PAIRS.map(
      (pair) => {
        const viewerAFacet =
          tetrahedronFacetOppositeVertex(
            pair.A
          );

        const viewerBFacet =
          tetrahedronFacetOppositeVertex(
            pair.B
          );

        const certifiedAFacet =
          Number.isInteger(viewerAFacet)
            ? viewerToCellA[
                viewerAFacet
              ]
            : null;

        const certifiedBFacet =
          Number.isInteger(viewerBFacet)
            ? viewerToCellB[
                viewerBFacet
              ]
            : null;

        const aFacet =
          certifiedCanonicalCellFacet(
            aCellRecord,
            certifiedAFacet
          );

        const bFacet =
          certifiedCanonicalCellFacet(
            bCellRecord,
            certifiedBFacet
          );

        const gluingVerified =
          canonicalCellMapVerified &&
          aFacet?.neighborCellNode ===
            bCellNode &&
          aFacet?.neighborFacetIndex ===
            certifiedBFacet &&
          bFacet?.neighborCellNode ===
            aCellNode &&
          bFacet?.neighborFacetIndex ===
            certifiedAFacet;

        return {
          pairId:
            pair.id,

          label:
            pair.label,

          viewerFacets: {
            A:
              viewerAFacet,
            B:
              viewerBFacet,
          },

          certifiedCarrierFacets: {
            A:
              certifiedAFacet,
            B:
              certifiedBFacet,
          },

          permutationIndices: {
            AtoB:
              aFacet
                ?.permutationIndex ??
              null,

            BtoA:
              bFacet
                ?.permutationIndex ??
              null,
          },

          gluingVerified,
        };
      }
    );

  const verifiedSheetCount =
    sheetRecords.filter(
      (record) =>
        record.gluingVerified
    ).length;

  const anchorSheet =
    sheetRecords.find(
      (record) =>
        record.pairId ===
        CERTIFIED_CANONICAL_ATLAS_ANCHOR_PAIR_ID
    ) ?? null;

  const sourceTransitionVerified =
    sourceTransition.globalStep === 6850 &&
    anchorSheet
      ?.certifiedCarrierFacets
      ?.A === 2 &&
    anchorSheet
      ?.certifiedCarrierFacets
      ?.B === 3 &&
    anchorSheet
      ?.gluingVerified === true;

  const ready =
    canonicalCellMapVerified &&
    verifiedSheetCount === 4 &&
    sourceTransitionVerified;

  return {
    ready,

    error:
      ready
        ? null
        : "Canonical A/B four-sheet audit failed.",

    canonicalCells: {
      A: {
        cellNode:
          aCellNode ?? null,

        cellName:
          Number.isInteger(aCellNode)
            ? cellNames[
                aCellNode
              ] ?? null
            : null,

        viewerToCellVertex: [
          ...viewerToCellA,
        ],
      },

      B: {
        cellNode:
          bCellNode ?? null,

        cellName:
          Number.isInteger(bCellNode)
            ? cellNames[
                bCellNode
              ] ?? null
            : null,

        viewerToCellVertex: [
          ...viewerToCellB,
        ],
      },
    },

    assetCanonicalMap:
      canonicalMap,

    canonicalCellMapVerified,
    sheetRecords,
    verifiedSheetCount,
    sourceTransitionVerified,

    sourceTransition: {
      globalStep:
        sourceTransition.globalStep,

      removedCellNodes: [
        ...sourceTransition
          .removedCellNodes,
      ],

      restoredCellNodes: [
        ...sourceTransition
          .restoredCellNodes,
      ],

      removedLocalCellRecords:
        sourceTransition
          .removedLocalCellRecords,

      restoredLocalCellRecords:
        sourceTransition
          .restoredLocalCellRecords,
    },

    /*
     * This certifies the exact input to sheet transport.
     * It does not infer any additional transport beyond those source records.
     */
    transportSeedReady:
      ready,
  };
}


function bridgeEndpointFaceColors(pairing) {
  const fallback =
    pairing?.color ??
    "#8f8879";

  return {
    sourceColor:
      pairing?.AColor ??
      fallback,
    targetColor:
      pairing?.BColor ??
      fallback,
  };
}

/*
 * Face color is intrinsic to the endpoint face.
 *
 * The manifold changes which B face an A face is glued to;
 * it does not recolor either tetrahedron to make the pairing
 * appear same-colored.
 */
function faceEndpointColor(
  pairing,
  tetrahedronId
) {
  const {
    sourceColor,
    targetColor,
  } = bridgeEndpointFaceColors(
    pairing
  );

  return tetrahedronId === "B"
    ? targetColor
    : sourceColor;
}

/*
 * m003, the figure-eight sister. The four face-set pairings are
 * read from the published sister face equations; the vertex orders
 * are the unique A-to-B maps that reproduce the two degree-six edge
 * classes from the published edge equations.
 */
export const FIGURE_EIGHT_SISTER_FACE_PAIRS = [
  {
    id: 0,
    label: "Yellow faces",
    color: "#ffe600",
    AColor: "#ffe600",
    BColor: "#ffe600",
    description: "A(123) ↔ B(241)",
    A: [0, 1, 2],
    B: [1, 3, 0],
  },
  {
    id: 1,
    label: "Blue faces",
    color: "#4da3ff",
    AColor: "#4da3ff",
    BColor: "#159447",
    description: "A(124) ↔ B(312)",
    A: [0, 1, 3],
    B: [2, 0, 1],
  },
  {
    id: 2,
    label: "Green faces",
    color: "#159447",
    AColor: "#159447",
    BColor: "#4da3ff",
    description: "A(134) ↔ B(423)",
    A: [0, 2, 3],
    B: [3, 1, 2],
  },
  {
    id: 3,
    label: "Red faces",
    color: "#ff2020",
    AColor: "#ff2020",
    BColor: "#ff2020",
    description: "A(234) ↔ B(341)",
    A: [1, 2, 3],
    B: [2, 3, 0],
  },
];


/*
 * Manifold selection is represented explicitly. The verified m003
 * compact gluing combinatorics now use the shared geometry engine.
 * Its downstream cusp stages remain locked until the peripheral
 * coordinate basis and ambient realization are verified.
 */
const MANIFOLD_SWITCH_DURATION_MS = 1200;

export const MANIFOLD_SPECS = Object.freeze({
  m004: Object.freeze({
    id: "m004",
    label: "Figure-eight",
    fullLabel: "Figure-eight knot complement",
    available: true,
    cuspAvailable: true,
    peripheralAvailable: true,
    cuspRequiresCanonicalMappings: false,
    facePairs: FIGURE_EIGHT_FACE_PAIRS,
    cuspFlatLayout: CUSP_FLAT_LAYOUT,
    cuspDomainCorners: CUSP_DOMAIN_CORNERS,
    cuspCoordinates:
      FIGURE_EIGHT_CUSP_COORDINATE_SPEC,
  }),
  m003: Object.freeze({
    id: "m003",
    label: "Sister",
    fullLabel: "Figure-eight sister manifold",
    available: true,
    cuspAvailable: true,
    peripheralAvailable: true,
    cuspRequiresCanonicalMappings: true,

    /*
     * Connected gluing-adjacent traversal of the verified
     * canonical m003 cusp development.
     */
    cuspAssemblyOrder: Object.freeze([
      "A0", "B1", "A2", "B0",
      "A1", "B2", "B3", "A3",
    ]),

    facePairs: FIGURE_EIGHT_SISTER_FACE_PAIRS,
    cuspFlatLayout:
      FIGURE_EIGHT_SISTER_CUSP_FLAT_LAYOUT,
    cuspDomainCorners:
      CUSP_DOMAIN_CORNERS,
    cuspCoordinates:
      FIGURE_EIGHT_SISTER_CUSP_COORDINATE_SPEC,
  }),
});

function manifoldSpec(manifoldId) {
  return (
    MANIFOLD_SPECS[manifoldId] ??
    MANIFOLD_SPECS.m004
  );
}

function cuspLayoutGeometrySignature(
  cornerMap
) {
  return Object.values(
    cornerMap ?? {}
  )
    .map(cuspLayoutPointKey)
    .sort()
    .join("|");
}

function cuspQuotientIntegerTranslation(
  first,
  second,
  tolerance = 1e-8
) {
  const deltaU =
    first.u - second.u;

  const deltaV =
    first.v - second.v;

  const integerU =
    Math.round(deltaU);

  const integerV =
    Math.round(deltaV);

  if (
    Math.abs(
      deltaU - integerU
    ) > tolerance ||
    Math.abs(
      deltaV - integerV
    ) > tolerance
  ) {
    return null;
  }

  return {
    u: integerU,
    v: integerV,
  };
}

function cuspFixedSlotQuotientGluings() {
  const edges = [];

  CUSP_TILE_IDS.forEach(
    (slotId) => {
      const entries =
        Object.entries(
          CUSP_FLAT_LAYOUT[
            slotId
          ]
        ).map(
          ([
            slotCorner,
            point,
          ]) => ({
            slotCorner:
              Number(slotCorner),

            point,

            pointKey:
              cuspLayoutPointKey(
                point
              ),

            coordinates:
              cuspDomainCoordinates(
                point
              ),
          })
        );

      /*
       * Three unoriented sides of this fixed geometric slot.
       */
      [
        [0, 1],
        [1, 2],
        [2, 0],
      ].forEach(
        ([firstIndex, secondIndex]) => {
          const first =
            entries[firstIndex];

          const second =
            entries[secondIndex];

          const pointKeys =
            [
              first.pointKey,
              second.pointKey,
            ];

          edges.push({
            slotId,

            edgeKey:
              [...pointKeys]
                .sort()
                .join("|"),

            endpoints: [
              first,
              second,
            ],
          });
        }
      );
    }
  );

  const directed =
    new Map();

  const unused =
    new Set(
      edges.map(
        (_, index) =>
          index
      )
    );

  for (
    let firstIndex = 0;
    firstIndex < edges.length;
    firstIndex += 1
  ) {
    if (
      !unused.has(
        firstIndex
      )
    ) {
      continue;
    }

    const first =
      edges[firstIndex];

    unused.delete(
      firstIndex
    );

    let match = null;

    for (
      let secondIndex =
        firstIndex + 1;
      secondIndex <
        edges.length;
      secondIndex += 1
    ) {
      if (
        !unused.has(
          secondIndex
        )
      ) {
        continue;
      }

      const second =
        edges[secondIndex];

      /*
       * An edge in the displayed strip can meet its partner
       * directly OR after an integer torus translation.
       *
       * Test both endpoint orientations.
       */
      for (
        const reversed of
        [false, true]
      ) {
        const secondStart =
          reversed
            ? second.endpoints[1]
            : second.endpoints[0];

        const secondEnd =
          reversed
            ? second.endpoints[0]
            : second.endpoints[1];

        const startTranslation =
          cuspQuotientIntegerTranslation(
            first.endpoints[0]
              .coordinates,
            secondStart
              .coordinates
          );

        if (
          !startTranslation
        ) {
          continue;
        }

        const endTranslation =
          cuspQuotientIntegerTranslation(
            first.endpoints[1]
              .coordinates,
            secondEnd
              .coordinates
          );

        if (
          !endTranslation ||
          endTranslation.u !==
            startTranslation.u ||
          endTranslation.v !==
            startTranslation.v
        ) {
          continue;
        }

        match = {
          secondIndex,
          second,
          reversed,
        };

        break;
      }

      if (match) {
        break;
      }
    }

    if (!match) {
      return {
        valid: false,
        pairCount:
          directed.size / 2,
        directed,
      };
    }

    unused.delete(
      match.secondIndex
    );

    const second =
      match.second;

    const secondEndpoints =
      match.reversed
        ? [
            second.endpoints[1],
            second.endpoints[0],
          ]
        : [
            second.endpoints[0],
            second.endpoints[1],
          ];

    const firstToSecond =
      new Map([
        [
          first.endpoints[0]
            .pointKey,
          secondEndpoints[0]
            .pointKey,
        ],
        [
          first.endpoints[1]
            .pointKey,
          secondEndpoints[1]
            .pointKey,
        ],
      ]);

    const secondToFirst =
      new Map(
        [...firstToSecond.entries()]
          .map(
            ([
              firstPointKey,
              secondPointKey,
            ]) => [
              secondPointKey,
              firstPointKey,
            ]
          )
      );

    directed.set(
      `${first.slotId}:${first.edgeKey}`,
      {
        targetSlotId:
          second.slotId,

        targetPointKeyBySourcePointKey:
          firstToSecond,
      }
    );

    directed.set(
      `${second.slotId}:${second.edgeKey}`,
      {
        targetSlotId:
          first.slotId,

        targetPointKeyBySourcePointKey:
          secondToFirst,
      }
    );
  }

  return {
    valid:
      directed.size === 24 &&
      unused.size === 0,

    pairCount:
      directed.size / 2,

    directed,
  };
}

function deriveCuspMaterialLayoutOnFixedQuotient(
  facePairs,
  orientedMappingIndices
) {
  const materialGluings =
    cuspDirectedEdgeGluings(
      facePairs,
      orientedMappingIndices
    );

  const slotQuotient =
    cuspFixedSlotQuotientGluings();

  if (
    !slotQuotient.valid
  ) {
    return {
      valid: false,
      error:
        "Fixed Cusp quotient did not produce 12 edge pairs.",
      layoutByMaterialId: {},
      materialBySlotId: {},
      assemblyOrder: [],
    };
  }

  /*
   * Absolute anchor.
   *
   * There is NO geometric freedom:
   *
   *   material A0 occupies visible slot A0,
   *
   * and its three material corners use the exact same slot
   * points already used by the figure-eight Cusp.
   */
  const rootSlotId =
    "A0";

  const rootMaterialId =
    "A0";

  const rootCornerByPointKey =
    new Map(
      Object.entries(
        CUSP_FLAT_LAYOUT[
          rootSlotId
        ]
      ).map(
        ([
          materialCorner,
          point,
        ]) => [
          cuspLayoutPointKey(
            point
          ),
          Number(
            materialCorner
          ),
        ]
      )
    );

  const assignments =
    new Map([
      [
        rootSlotId,
        {
          materialId:
            rootMaterialId,

          cornerByPointKey:
            rootCornerByPointKey,
        },
      ],
    ]);

  const usedMaterialIds =
    new Set([
      rootMaterialId,
    ]);

  const assemblyOrder =
    [rootMaterialId];

  const queue =
    [rootSlotId];

  let valid = true;
  let error = null;

  while (
    queue.length > 0 &&
    valid
  ) {
    const sourceSlotId =
      queue.shift();

    const sourceAssignment =
      assignments.get(
        sourceSlotId
      );

    const sourcePointKeys =
      CUSP_SLOT_POINT_KEYS[
        sourceSlotId
      ];

    /*
     * Walk all three sides of this fixed visible triangle.
     */
    for (
      let firstIndex = 0;
      firstIndex < 3;
      firstIndex += 1
    ) {
      const secondIndex =
        (firstIndex + 1) % 3;

      const firstPointKey =
        sourcePointKeys[
          firstIndex
        ];

      const secondPointKey =
        sourcePointKeys[
          secondIndex
        ];

      const slotEdgeKey =
        [
          firstPointKey,
          secondPointKey,
        ]
          .sort()
          .join("|");

      const slotGluing =
        slotQuotient.directed.get(
          `${sourceSlotId}:${slotEdgeKey}`
        );

      if (!slotGluing) {
        valid = false;
        error =
          `No quotient partner for ${sourceSlotId}:${slotEdgeKey}`;
        break;
      }

      const firstMaterialCorner =
        sourceAssignment
          .cornerByPointKey
          .get(
            firstPointKey
          );

      const secondMaterialCorner =
        sourceAssignment
          .cornerByPointKey
          .get(
            secondPointKey
          );

      if (
        !Number.isInteger(
          firstMaterialCorner
        ) ||
        !Number.isInteger(
          secondMaterialCorner
        )
      ) {
        valid = false;
        error =
          `Missing material corner on ${sourceSlotId}:${slotEdgeKey}`;
        break;
      }

      const materialEdgeKey =
        [
          firstMaterialCorner,
          secondMaterialCorner,
        ]
          .sort(
            (a, b) =>
              a - b
          )
          .join(",");

      const materialGluing =
        materialGluings.get(
          `${sourceAssignment.materialId}:${materialEdgeKey}`
        );

      if (!materialGluing) {
        valid = false;
        error =
          `No Sister material gluing for ` +
          `${sourceAssignment.materialId}:${materialEdgeKey}`;
        break;
      }

      const targetSlotId =
        slotGluing
          .targetSlotId;

      const targetMaterialId =
        materialGluing
          .targetId;

      const targetFirstPointKey =
        slotGluing
          .targetPointKeyBySourcePointKey
          .get(
            firstPointKey
          );

      const targetSecondPointKey =
        slotGluing
          .targetPointKeyBySourcePointKey
          .get(
            secondPointKey
          );

      const targetFirstMaterialCorner =
        materialGluing
          .targetCornerBySourceCorner
          .get(
            firstMaterialCorner
          );

      const targetSecondMaterialCorner =
        materialGluing
          .targetCornerBySourceCorner
          .get(
            secondMaterialCorner
          );

      if (
        !targetFirstPointKey ||
        !targetSecondPointKey ||
        !Number.isInteger(
          targetFirstMaterialCorner
        ) ||
        !Number.isInteger(
          targetSecondMaterialCorner
        )
      ) {
        valid = false;
        error =
          `Incomplete endpoint correspondence from ` +
          `${sourceAssignment.materialId}:${materialEdgeKey}`;
        break;
      }

      const targetPointKeys =
        CUSP_SLOT_POINT_KEYS[
          targetSlotId
        ];

      const targetThirdPointKey =
        targetPointKeys.find(
          (pointKey) =>
            pointKey !==
              targetFirstPointKey &&
            pointKey !==
              targetSecondPointKey
        );

      const targetThirdMaterialCorner =
        cuspTileCornerIndices(
          targetMaterialId
        ).find(
          (corner) =>
            corner !==
              targetFirstMaterialCorner &&
            corner !==
              targetSecondMaterialCorner
        );

      if (
        !targetThirdPointKey ||
        !Number.isInteger(
          targetThirdMaterialCorner
        )
      ) {
        valid = false;
        error =
          `Could not resolve third corner for ${targetMaterialId}`;
        break;
      }

      const proposedCornerByPointKey =
        new Map([
          [
            targetFirstPointKey,
            targetFirstMaterialCorner,
          ],
          [
            targetSecondPointKey,
            targetSecondMaterialCorner,
          ],
          [
            targetThirdPointKey,
            targetThirdMaterialCorner,
          ],
        ]);

      const existing =
        assignments.get(
          targetSlotId
        );

      if (existing) {
        if (
          existing.materialId !==
            targetMaterialId
        ) {
          valid = false;
          error =
            `Slot ${targetSlotId} was assigned both ` +
            `${existing.materialId} and ${targetMaterialId}`;
          break;
        }

        for (
          const pointKey of
          targetPointKeys
        ) {
          if (
            existing
              .cornerByPointKey
              .get(pointKey) !==
            proposedCornerByPointKey
              .get(pointKey)
          ) {
            valid = false;
            error =
              `Corner conflict at ${targetSlotId}:${pointKey}`;
            break;
          }
        }

        if (!valid) {
          break;
        }

        continue;
      }

      if (
        usedMaterialIds.has(
          targetMaterialId
        )
      ) {
        valid = false;
        error =
          `Material ${targetMaterialId} was assigned to two slots`;
        break;
      }

      assignments.set(
        targetSlotId,
        {
          materialId:
            targetMaterialId,

          cornerByPointKey:
            proposedCornerByPointKey,
        }
      );

      usedMaterialIds.add(
        targetMaterialId
      );

      assemblyOrder.push(
        targetMaterialId
      );

      queue.push(
        targetSlotId
      );
    }
  }

  if (
    valid &&
    (
      assignments.size !== 8 ||
      usedMaterialIds.size !== 8
    )
  ) {
    valid = false;
    error =
      `Incomplete fixed-slot assignment: ` +
      `${assignments.size}/8 slots, ` +
      `${usedMaterialIds.size}/8 materials`;
  }

  const layoutByMaterialId =
    {};

  const materialBySlotId =
    {};

  if (valid) {
    assignments.forEach(
      (
        {
          materialId,
          cornerByPointKey,
        },
        slotId
      ) => {
        materialBySlotId[
          slotId
        ] = materialId;

        const cornerMap = {};

        cornerByPointKey.forEach(
          (
            materialCorner,
            pointKey
          ) => {
            cornerMap[
              materialCorner
            ] =
              CUSP_SLOT_POINT_BY_KEY
                .get(pointKey);
          }
        );

        layoutByMaterialId[
          materialId
        ] = cornerMap;
      }
    );
  }

  return {
    valid,
    error,

    slotPairCount:
      slotQuotient.pairCount,

    layoutByMaterialId,
    materialBySlotId,
    assemblyOrder,
  };
}

export function cuspMaterialLayoutForManifold(
  manifoldId,
  facePairMappingIndices = []
) {
  const spec =
    manifoldSpec(manifoldId);

  const facePairs =
    spec.facePairs ??
    FIGURE_EIGHT_FACE_PAIRS;

  const orientedMappingIndices =
    facePairs.map(
      (_, pairId) =>
        orientedFacePairMappingIndex(
          pairId,
          facePairMappingIndices?.[
            pairId
          ] ?? 0
        )
    );

  /*
   * Sister uses the EXACT SAME visible eight-slot Cusp geometry
   * as Figure-eight.
   *
   * Only solve the material/corner correspondence on that fixed
   * quotient.
   */
  if (manifoldId === "m003") {
    return (
      deriveCuspMaterialLayoutOnFixedQuotient(
        facePairs,
        orientedMappingIndices
      )
    );
  }

  const derivation =
    deriveCuspFlatLayout(
      facePairs,
      orientedMappingIndices
    );

  /*
   * `layoutByMaterialId` answers:
   *
   *   where does material triangle A0, A1, ... B3 go?
   *
   * Its geometry always consists of one of the existing fixed
   * CUSP_FLAT_LAYOUT slots.
   */
  const layoutByMaterialId =
    derivation.layout;

  /*
   * Reverse that relation for Projection Lab:
   *
   *   which material triangle occupies fixed slot A0, A1, ... B3?
   */
  const slotBySignature =
    new Map(
      Object.entries(
        CUSP_FLAT_LAYOUT
      ).map(
        ([slotId, cornerMap]) => [
          cuspLayoutGeometrySignature(
            cornerMap
          ),
          slotId,
        ]
      )
    );

  const materialBySlotId = {};

  CUSP_TILE_IDS.forEach(
    (materialId) => {
      const slotId =
        slotBySignature.get(
          cuspLayoutGeometrySignature(
            layoutByMaterialId[
              materialId
            ]
          )
        );

      if (slotId) {
        materialBySlotId[
          slotId
        ] = materialId;
      }
    }
  );

  return {
    valid:
      derivation.valid &&
      Object.keys(
        materialBySlotId
      ).length ===
        CUSP_TILE_IDS.length,

    layoutByMaterialId,

    materialBySlotId,

    assemblyOrder:
      derivation.assemblyOrder ??
      CUSP_TILE_IDS,
  };
}

/*
 * ============================================================
 * M003 / SISTER CUSP-CORRESPONDENCE AUDIT
 * ============================================================
 *
 * This is deliberately diagnostic only.
 *
 * It does not alter:
 *   - Cells geometry,
 *   - Cusp geometry,
 *   - material colors,
 *   - animation destinations,
 *   - face pairings.
 *
 * We independently verify:
 *
 *   1. the eight material triangles form a bijection with the
 *      eight fixed visible Cusp slots;
 *
 *   2. all twelve Sister cusp-edge identifications, including
 *      their ordered corner correspondences, close correctly in
 *      the DERIVED fixed-strip arrangement;
 *
 *   3. those same twelve identifications close correctly in the
 *      independently encoded Sister cusp development;
 *
 *   4. material -> slot -> material and every corner assignment
 *      round-trip exactly.
 */

function cuspAuditPointNear(
  first,
  second,
  tolerance = 1e-8
) {
  return (
    first &&
    second &&
    Math.abs(first.x - second.x) <=
      tolerance &&
    Math.abs(first.y - second.y) <=
      tolerance
  );
}

function cuspAuditDomainBasis(
  corners
) {
  if (
    !Array.isArray(corners) ||
    corners.length < 4
  ) {
    return null;
  }

  return {
    first: {
      x:
        corners[1].x -
        corners[0].x,
      y:
        corners[1].y -
        corners[0].y,
    },

    second: {
      x:
        corners[3].x -
        corners[0].x,
      y:
        corners[3].y -
        corners[0].y,
    },
  };
}

function cuspAuditTranslationForEdges(
  sourcePoints,
  targetPoints,
  basis
) {
  if (
    sourcePoints.length !== 2 ||
    targetPoints.length !== 2 ||
    !basis
  ) {
    return null;
  }

  /*
   * One fundamental-domain translation is normally enough,
   * but use +/-3 periods defensively so the certification does
   * not depend on the chosen planar cut.
   */
  for (
    let firstTurn = -3;
    firstTurn <= 3;
    firstTurn += 1
  ) {
    for (
      let secondTurn = -3;
      secondTurn <= 3;
      secondTurn += 1
    ) {
      const offset = {
        x:
          firstTurn *
            basis.first.x +
          secondTurn *
            basis.second.x,

        y:
          firstTurn *
            basis.first.y +
          secondTurn *
            basis.second.y,
      };

      const translated =
        targetPoints.map(
          (point) => ({
            x:
              point.x +
              offset.x,

            y:
              point.y +
              offset.y,
          })
        );

      if (
        cuspAuditPointNear(
          sourcePoints[0],
          translated[0]
        ) &&
        cuspAuditPointNear(
          sourcePoints[1],
          translated[1]
        )
      ) {
        return {
          firstTurn,
          secondTurn,
          offset,
        };
      }
    }
  }

  return null;
}

function cuspAuditEdgeRecords(
  layout,
  domainCorners,
  directedGluings
) {
  const basis =
    cuspAuditDomainBasis(
      domainCorners
    );

  const seenPairs =
    new Set();

  const records = [];

  for (
    const [
      sourceKey,
      gluing,
    ] of directedGluings.entries()
  ) {
    const separatorIndex =
      sourceKey.indexOf(":");

    const sourceId =
      sourceKey.slice(
        0,
        separatorIndex
      );

    const sourceEdgeKey =
      sourceKey.slice(
        separatorIndex + 1
      );

    const sourceCorners =
      sourceEdgeKey
        .split(",")
        .map(Number);

    const targetCorners =
      sourceCorners.map(
        (sourceCorner) =>
          gluing
            .targetCornerBySourceCorner
            .get(sourceCorner)
      );

    const targetEdgeKey =
      [...targetCorners]
        .sort(
          (first, second) =>
            first - second
        )
        .join(",");

    const targetKey =
      `${gluing.targetId}:` +
      targetEdgeKey;

    const undirectedKey =
      [sourceKey, targetKey]
        .sort()
        .join("|");

    if (
      seenPairs.has(
        undirectedKey
      )
    ) {
      continue;
    }

    seenPairs.add(
      undirectedKey
    );

    const sourcePoints =
      sourceCorners.map(
        (corner) =>
          layout?.[
            sourceId
          ]?.[corner]
      );

    /*
     * IMPORTANT:
     *
     * Keep targetCorners in correspondence order rather than
     * sorting them. This certifies the actual vertex map, not
     * merely that two unoriented line segments happen to meet.
     */
    const targetPoints =
      targetCorners.map(
        (corner) =>
          layout?.[
            gluing.targetId
          ]?.[corner]
      );

    const pointsPresent =
      sourcePoints.every(Boolean) &&
      targetPoints.every(Boolean);

    const translation =
      pointsPresent
        ? cuspAuditTranslationForEdges(
            sourcePoints,
            targetPoints,
            basis
          )
        : null;

    records.push({
      source:
        sourceKey,

      target:
        targetKey,

      sourceCorners:
        sourceCorners.join(","),

      targetCorners:
        targetCorners.join(","),

      translation:
        translation
          ? (
              `${translation.firstTurn},` +
              `${translation.secondTurn}`
            )
          : null,

      verified:
        Boolean(
          translation
        ),
    });
  }

  return {
    pairCount:
      records.length,

    verifiedPairCount:
      records.filter(
        (record) =>
          record.verified
      ).length,

    verified:
      records.length === 12 &&
      records.every(
        (record) =>
          record.verified
      ),

    records,
  };
}

function auditFigureEightSisterCuspCorrespondence() {
  const facePairs =
    FIGURE_EIGHT_SISTER_FACE_PAIRS;

  const zeroMappings =
    facePairs.map(
      () => 0
    );

  const orientedMappingIndices =
    facePairs.map(
      (_, pairId) =>
        orientedFacePairMappingIndex(
          pairId,
          zeroMappings[pairId]
        )
    );

  const directedGluings =
    cuspDirectedEdgeGluings(
      facePairs,
      orientedMappingIndices
    );

  const derivation =
    deriveCuspFlatLayout(
      facePairs,
      orientedMappingIndices
    );

  const materialLayout =
    cuspMaterialLayoutForManifold(
      "m003",
      zeroMappings
    );

  /*
   * ----------------------------------------------------------
   * A. Eight-triangle bijection.
   * ----------------------------------------------------------
   */
  const slotEntries =
    Object.entries(
      materialLayout
        .materialBySlotId ??
      {}
    );

  const slotIds =
    slotEntries.map(
      ([slotId]) =>
        slotId
    );

  const materialIds =
    slotEntries.map(
      ([
        ,
        materialId,
      ]) =>
        materialId
    );

  const slotBijectionVerified =
    slotIds.length === 8 &&
    new Set(
      slotIds
    ).size === 8 &&
    new Set(
      materialIds
    ).size === 8 &&
    CUSP_TILE_IDS.every(
      (materialId) =>
        materialIds.includes(
          materialId
        )
    );

  /*
   * ----------------------------------------------------------
   * B. All twelve ordered edge identifications in the derived
   *    fixed-strip arrangement used by the animation.
   * ----------------------------------------------------------
   */
  const derivedEdgeAudit =
    cuspAuditEdgeRecords(
      materialLayout
        .layoutByMaterialId,
      CUSP_DOMAIN_CORNERS,
      directedGluings
    );

  /*
   * ----------------------------------------------------------
   * C. Independently encoded Sister development.
   *
   * This is intentionally a second source of geometry rather
   * than reusing the derived fixed-strip assignment.
   * ----------------------------------------------------------
   */
  const encodedSisterEdgeAudit =
    cuspAuditEdgeRecords(
      FIGURE_EIGHT_SISTER_CUSP_FLAT_LAYOUT,
      FIGURE_EIGHT_SISTER_CUSP_DOMAIN_CORNERS,
      directedGluings
    );

  /*
   * ----------------------------------------------------------
   * D. Exact material/corner round trip through fixed slots.
   * ----------------------------------------------------------
   */
  const roundTripRecords =
    CUSP_TILE_IDS.map(
      (materialId) => {
        const slotEntry =
          slotEntries.find(
            ([
              ,
              candidateMaterialId,
            ]) =>
              candidateMaterialId ===
              materialId
          );

        const slotId =
          slotEntry?.[0] ??
          null;

        const materialCornerMap =
          materialLayout
            .layoutByMaterialId?.[
            materialId
          ] ??
          null;

        const slotCornerMap =
          slotId
            ? CUSP_FLAT_LAYOUT[
                slotId
              ]
            : null;

        const cornerRecords =
          materialCornerMap &&
          slotCornerMap
            ? Object.entries(
                materialCornerMap
              ).map(
                ([
                  materialCorner,
                  point,
                ]) => {
                  const slotCornerEntry =
                    Object.entries(
                      slotCornerMap
                    ).find(
                      ([
                        ,
                        slotPoint,
                      ]) =>
                        cuspAuditPointNear(
                          point,
                          slotPoint
                        )
                    );

                  return {
                    materialCorner:
                      Number(
                        materialCorner
                      ),

                    slotCorner:
                      slotCornerEntry
                        ? Number(
                            slotCornerEntry[
                              0
                            ]
                          )
                        : null,

                    verified:
                      Boolean(
                        slotCornerEntry
                      ),
                  };
                }
              )
            : [];

        const uniqueSlotCorners =
          new Set(
            cornerRecords
              .map(
                (record) =>
                  record.slotCorner
              )
              .filter(
                (value) =>
                  value !== null
              )
          );

        const reverseMaterial =
          slotId
            ? materialLayout
                .materialBySlotId?.[
                slotId
              ] ??
              null
            : null;

        const verified =
          slotId !== null &&
          reverseMaterial ===
            materialId &&
          cornerRecords.length ===
            3 &&
          cornerRecords.every(
            (record) =>
              record.verified
          ) &&
          uniqueSlotCorners.size ===
            3;

        return {
          materialId,
          slotId,
          reverseMaterial,
          corners:
            cornerRecords
              .map(
                (record) =>
                  `${record.materialCorner}` +
                  `->${record.slotCorner}`
              )
              .join("  "),
          verified,
        };
      }
    );

  const roundTripVerified =
    roundTripRecords.every(
      (record) =>
        record.verified
    );

  const certified =
    materialLayout.valid === true &&
    slotBijectionVerified &&
    derivedEdgeAudit.verified &&
    encodedSisterEdgeAudit.verified &&
    roundTripVerified;

  return Object.freeze({
    manifold:
      "m003",

    certified,

    derivationValid:
      derivation.valid,

    candidateCount:
      derivation.candidateCount,

    slotBijectionVerified,

    derivedEdgeAudit,

    encodedSisterEdgeAudit,

    roundTripVerified,

    roundTripRecords,

    materialBySlotId:
      Object.freeze({
        ...materialLayout
          .materialBySlotId,
      }),
  });
}

/*
 * Each truncation triangle sits at one ideal vertex of a tetrahedron.
 * Exactly one large face is opposite that vertex. Use the color of that
 * opposite face as the canonical four-color label for the whole cusp
 * triangle: one triangle of each color on A and one on B.
 */
function cuspTriangleOppositeFacePair(
  cuspBaseId,
  facePairs
) {
  const tetrahedronId =
    cuspBaseId?.[0];

  const vertexIndex = Number(
    cuspBaseId?.slice(1)
  );

  if (
    !["A", "B"].includes(
      tetrahedronId
    ) ||
    !Number.isInteger(vertexIndex)
  ) {
    return null;
  }

  return (
    facePairs.find(
      (pair) =>
        !pair[
          tetrahedronId
        ].includes(vertexIndex)
    ) ?? null
  );
}


/*
 * ============================================================
 * CERTIFIED M004 FOUR-COLOR MATERIAL TILES
 * ============================================================
 *
 * The eight truncation triangles already carry the canonical
 * Orange / Blue / Green / Red material labels.
 *
 * Convert each triangle's three exact developed-cusp corners into
 * the same periodic (route, minor) coordinates used by the shared
 * S3 tube.
 *
 * Later patches will use these records to color the constructive
 * geometry from provenance rather than from spatial guesses.
 */
function wrapPeriodicUnit(value) {
  const wrapped = value % 1;

  return wrapped < 0
    ? wrapped + 1
    : wrapped;
}


function unwrapPeriodicUnitNear(
  value,
  reference
) {
  let result =
    wrapPeriodicUnit(value);

  const target =
    wrapPeriodicUnit(reference);

  while (
    result - target > 0.5
  ) {
    result -= 1;
  }

  while (
    result - target < -0.5
  ) {
    result += 1;
  }

  return result;
}


function pointInsideTriangle2(
  point,
  triangle
) {
  const [a, b, c] = triangle;

  const denominator =
    (b.y - c.y) *
      (a.x - c.x) +
    (c.x - b.x) *
      (a.y - c.y);

  if (
    Math.abs(denominator) < 1e-12
  ) {
    return false;
  }

  const first =
    (
      (b.y - c.y) *
        (point.x - c.x) +
      (c.x - b.x) *
        (point.y - c.y)
    ) / denominator;

  const second =
    (
      (c.y - a.y) *
        (point.x - c.x) +
      (a.x - c.x) *
        (point.y - c.y)
    ) / denominator;

  const third =
    1 - first - second;

  const epsilon = 2e-8;

  return (
    first >= -epsilon &&
    second >= -epsilon &&
    third >= -epsilon
  );
}


function periodicMaterialTriangleContains(
  point,
  triangle
) {
  if (
    !Array.isArray(triangle) ||
    triangle.length !== 3 ||
    !triangle.every(Boolean)
  ) {
    return false;
  }

  /*
   * The material triangle remains in one exact lift of the
   * universal cover R^2 -> T^2.
   *
   * The constructive tube sample is stored modulo the two torus
   * periods. Test its nearby integer translates against that
   * fixed lifted triangle.
   *
   * This preserves seam-crossing triangles exactly instead of
   * collapsing their corners onto the unit square.
   */
  const liftedTriangle =
    triangle.map(
      (corner) => ({
        x: corner.route,
        y: corner.minor,
      })
    );

  for (
    let routeShift = -4;
    routeShift <= 4;
    routeShift += 1
  ) {
    for (
      let minorShift = -4;
      minorShift <= 4;
      minorShift += 1
    ) {
      const liftedPoint = {
        x:
          point.route +
          routeShift,

        y:
          point.minor +
          minorShift,
      };

      if (
        pointInsideTriangle2(
          liftedPoint,
          liftedTriangle
        )
      ) {
        return true;
      }
    }
  }

  return false;
}


function polygonSignedArea2(points) {
  let twiceArea = 0;

  for (
    let index = 0;
    index < points.length;
    index += 1
  ) {
    const current =
      points[index];
    const next =
      points[
        (index + 1) %
          points.length
      ];

    twiceArea +=
      current.x * next.y -
      next.x * current.y;
  }

  return twiceArea;
}


function uvPointInsideClipEdge(
  point,
  edgeStart,
  edgeEnd,
  orientationSign
) {
  const cross =
    (edgeEnd.x - edgeStart.x) *
      (point.v - edgeStart.y) -
    (edgeEnd.y - edgeStart.y) *
      (point.u - edgeStart.x);

  return orientationSign >= 0
    ? cross >= -1e-9
    : cross <= 1e-9;
}


function intersectUvSegmentWithClipLine(
  first,
  second,
  edgeStart,
  edgeEnd
) {
  const segmentDx =
    second.u - first.u;
  const segmentDy =
    second.v - first.v;

  const edgeDx =
    edgeEnd.x - edgeStart.x;
  const edgeDy =
    edgeEnd.y - edgeStart.y;

  const denominator =
    segmentDx * edgeDy -
    segmentDy * edgeDx;

  if (
    Math.abs(denominator) <
    1e-12
  ) {
    return {
      u: first.u,
      v: first.v,
      x: first.x,
      y: first.y,
    };
  }

  const relativeX =
    edgeStart.x - first.u;
  const relativeY =
    edgeStart.y - first.v;

  const rawT =
    (
      relativeX * edgeDy -
      relativeY * edgeDx
    ) / denominator;

  const t =
    Math.max(
      0,
      Math.min(1, rawT)
    );

  return {
    u:
      first.u +
      t * segmentDx,

    v:
      first.v +
      t * segmentDy,

    x:
      first.x +
      t * (second.x - first.x),

    y:
      first.y +
      t * (second.y - first.y),
  };
}


function clipUvScreenPolygonAgainstTriangle(
  subjectVertices,
  clipTriangle
) {
  if (
    !Array.isArray(
      subjectVertices
    ) ||
    subjectVertices.length < 3 ||
    !Array.isArray(
      clipTriangle
    ) ||
    clipTriangle.length !== 3
  ) {
    return [];
  }

  let output =
    subjectVertices.map(
      (vertex) => ({
        u: vertex.u,
        v: vertex.v,
        x: vertex.x,
        y: vertex.y,
      })
    );

  const orientationSign =
    Math.sign(
      polygonSignedArea2(
        clipTriangle
      )
    ) || 1;

  for (
    let edgeIndex = 0;
    edgeIndex < 3;
    edgeIndex += 1
  ) {
    const edgeStart =
      clipTriangle[
        edgeIndex
      ];

    const edgeEnd =
      clipTriangle[
        (edgeIndex + 1) % 3
      ];

    const input = output;
    output = [];

    if (input.length === 0) {
      break;
    }

    for (
      let index = 0;
      index < input.length;
      index += 1
    ) {
      const current =
        input[index];
      const previous =
        input[
          (index - 1 +
            input.length) %
            input.length
        ];

      const currentInside =
        uvPointInsideClipEdge(
          current,
          edgeStart,
          edgeEnd,
          orientationSign
        );

      const previousInside =
        uvPointInsideClipEdge(
          previous,
          edgeStart,
          edgeEnd,
          orientationSign
        );

      if (
        currentInside &&
        previousInside
      ) {
        output.push(current);
        continue;
      }

      if (
        previousInside &&
        !currentInside
      ) {
        output.push(
          intersectUvSegmentWithClipLine(
            previous,
            current,
            edgeStart,
            edgeEnd
          )
        );
        continue;
      }

      if (
        !previousInside &&
        currentInside
      ) {
        output.push(
          intersectUvSegmentWithClipLine(
            previous,
            current,
            edgeStart,
            edgeEnd
          )
        );
        output.push(current);
      }
    }
  }

  return output;
}


function screenPolygonPathFromVertices(
  vertices
) {
  if (
    !Array.isArray(vertices) ||
    vertices.length < 3
  ) {
    return "";
  }

  const twiceArea =
    Math.abs(
      polygonSignedArea2(
        vertices.map(
          (vertex) => ({
            x: vertex.x,
            y: vertex.y,
          })
        )
      )
    );

  if (twiceArea < 0.4) {
    return "";
  }

  return (
    `M${vertices[0].x.toFixed(2)},${vertices[0].y.toFixed(2)}` +
    vertices
      .slice(1)
      .map(
        (vertex) =>
          `L${vertex.x.toFixed(2)},${vertex.y.toFixed(2)}`
      )
      .join("") +
    "Z"
  );
}

function liftedBoundaryFaceSubjectVertices(
  samples,
  screenTriangle
) {
  if (
    !Array.isArray(samples) ||
    samples.length !== 3 ||
    !samples.every(Boolean) ||
    !Array.isArray(screenTriangle) ||
    screenTriangle.length !== 3 ||
    !screenTriangle.every(Boolean)
  ) {
    return null;
  }

  /*
   * Choose ONE local lift for the constructive boundary face.
   *
   * The boundary triangulation is fine enough that neighboring
   * vertices occupy neighboring points on the torus. Anchor the
   * first point and unwrap the remaining two to the nearest copies.
   *
   * Crucially, this lift is chosen ONCE and is then used for every
   * Orange / Blue / Green / Red intersection test.
   */
  const anchorRoute =
    wrapPeriodicUnit(
      samples[0].routeAmount
    );

  const anchorMinor =
    wrapPeriodicUnit(
      samples[0].minorAmount
    );

  return samples.map(
    (sample, index) => ({
      u:
        index === 0
          ? anchorRoute
          : unwrapPeriodicUnitNear(
              sample.routeAmount,
              anchorRoute
            ),

      v:
        index === 0
          ? anchorMinor
          : unwrapPeriodicUnitNear(
              sample.minorAmount,
              anchorMinor
            ),

      x: screenTriangle[index].x,
      y: screenTriangle[index].y,
    })
  );
}


const CERTIFIED_M004_MATERIAL_TILES =
  Object.freeze(
    CUSP_TILE_IDS.map((cuspBaseId) => {
      const pair =
        cuspTriangleOppositeFacePair(
          cuspBaseId,
          FIGURE_EIGHT_FACE_PAIRS
        );

      const corners =
        cuspTileCornerIndices(
          cuspBaseId
        ).map((cornerIndex) => {
          const raw =
            CUSP_FLAT_LAYOUT[
              cuspBaseId
            ][cornerIndex];

          const tube =
            cuspTubeCoordinates(
              raw,
              FIGURE_EIGHT_CUSP_COORDINATE_SPEC
            );

          if (!tube) {
            return null;
          }

          /*
           * IMPORTANT:
           *
           * Keep the triangle in its genuine universal-cover lift.
           *
           * Do NOT wrap these corners independently. A material
           * triangle may cross a torus seam, and wrapping its three
           * vertices separately can identify distinct lifted corners
           * and collapse the triangle.
           */
          return Object.freeze({
            route:
              tube.routeAmount,

            minor:
              tube.minorAngle /
                (Math.PI * 2),
          });
        });

      return Object.freeze({
        cuspBaseId,

        pairId:
          pair?.id ?? null,

        corners:
          Object.freeze(corners),
      });
    })
  );




export const CYCLIC_FACE_MAPPING_CHOICES = [
  {
    id: 0,
    label: "0°",
    description:
      "Canonical vertex correspondence",
    vertexPermutation: [0, 1, 2],
    hexagonShift: 0,
  },
  {
    id: 1,
    label: "120°",
    description:
      "Cyclic vertex shift by one",
    vertexPermutation: [1, 2, 0],
    hexagonShift: 2,
  },
  {
    id: 2,
    label: "240°",
    description:
      "Cyclic vertex shift by two",
    vertexPermutation: [2, 0, 1],
    hexagonShift: 4,
  },
];

/*
 * Exact opening presentation.
 *
 * A:
 *
 *             2
 *            / \
 *           / • \
 *          1-----3
 *
 * The dot is corner 4, exactly on the camera axis and
 * toward the viewer.
 *
 * The three visible faces therefore form three equal
 * triangular wedges:
 *
 *   Blue
 *   Green
 *   Red
 *
 * Orange = face (1,2,3), exactly behind.
 *
 *
 * B:
 *
 * Orange face (1,2,4) is the complete front triangle.
 * Corner 3 is exactly centered behind it.
 *
 * These are explicit proper rotation matrices. No Euler-angle
 * fitting is involved.
 */

const TETRAHEDRON_A_OPENING_ROTATION = [
  -1 / Math.sqrt(2),
  0,
  -1 / Math.sqrt(2),

  -1 / Math.sqrt(6),
  -Math.sqrt(2 / 3),
  1 / Math.sqrt(6),

  -1 / Math.sqrt(3),
  1 / Math.sqrt(3),
  1 / Math.sqrt(3),
];

const TETRAHEDRON_B_OPENING_ROTATION = [
  -1 / Math.sqrt(2),
  -1 / Math.sqrt(2),
  0,

  1 / Math.sqrt(6),
  -1 / Math.sqrt(6),
  -Math.sqrt(2 / 3),

  -1 / Math.sqrt(3),
  1 / Math.sqrt(3),
  -1 / Math.sqrt(3),
];

const TETRAHEDRA = [
  {
    id: "A",

    center: {
      x: -205,
      y: 0,
      z: 0,
    },

    rotationMatrix:
      TETRAHEDRON_A_OPENING_ROTATION,
  },

  {
    id: "B",

    center: {
      x: 205,
      y: 0,
      z: 0,
    },

    rotationMatrix:
      TETRAHEDRON_B_OPENING_ROTATION,
  },
];


function tetrahedraAtSeparation(
  separation
) {
  const halfSeparation =
    normalizeTetrahedronSeparation(
      separation
    ) / 2;

  return TETRAHEDRA.map(
    (tetrahedron, index) => ({
      ...tetrahedron,
      center: {
        ...tetrahedron.center,
        x:
          index === 0
            ? -halfSeparation
            : halfSeparation,
      },
    })
  );
}

function lerpPoint(a, b, amount) {
  return {
    x: a.x + (b.x - a.x) * amount,
    y: a.y + (b.y - a.y) * amount,
    z: a.z + (b.z - a.z) * amount,
  };
}

/*
 * One continuous triangular cusp funnel.
 *
 * Each source corner follows its own cubic curve to the corresponding
 * corner of the developed cusp triangle. Fixed barycentric weights then
 * keep every intermediate cross-section a genuine triangle.
 *
 * laneOffset bends the WHOLE triangle as one cross-section; it never
 * shrinks the bridge into a thin tube. Its envelope and derivative vanish
 * at both ends, preserving the straight cusp direction at departure and
 * the boundary-surface direction at arrival.
 */
function triangularCuspFunnelPoint({
  sourceTriangle,
  targetTriangle,
  sourceDirection,
  sideSign,
  lane,
  weights,
  amount,
}) {
  const s =
    clampUnit(amount);

  const resolvedSideSign =
    sideSign < 0
      ? -1
      : 1;

  const resolvedLane =
    Number.isFinite(lane)
      ? lane
      : 0;

  /*
   * A parallel copy of the final triangle.
   *
   * For the planar assemblage:
   *
   *   A -> x = -d
   *   B -> x = +d
   *
   * Because the actual eight terminal triangles tile without
   * overlap, these translated copies tile without overlap too.
   */
  const preTargetTriangle =
    targetTriangle.map(
      (targetPoint) => ({
        ...targetPoint,

        x:
          targetPoint.x +
          resolvedSideSign *
            CUSP_FUNNEL_STAGING_DISTANCE,
      })
    );

  /*
   * FINAL APPROACH
   *
   * The last 20% is deliberately simple:
   *
   * one full triangular cross-section translates directly from
   * its parallel pre-target copy to the true material triangle.
   *
   * No neighboring route can wander across this portion.
   */
  if (
    s >=
    CUSP_FUNNEL_FINAL_APPROACH_START
  ) {
    const approachAmount =
      smootherUnitInterval(
        clampUnit(
          (
            s -
            CUSP_FUNNEL_FINAL_APPROACH_START
          ) /
          (
            1 -
            CUSP_FUNNEL_FINAL_APPROACH_START
          )
        )
      );

    return blendTrianglePoint(
      preTargetTriangle.map(
        (
          preTargetPoint,
          cornerIndex
        ) =>
          lerpPoint(
            preTargetPoint,
            targetTriangle[
              cornerIndex
            ],
            approachAmount
          )
      ),
      weights
    );
  }

  /*
   * MAIN FUNNEL
   */
  const routeAmount =
    smootherUnitInterval(
      clampUnit(
        s /
          CUSP_FUNNEL_FINAL_APPROACH_START
      )
    );

  const targetCenter =
    averageWorldPoint(
      preTargetTriangle
    );

  /*
   * Outward direction in the yz-plane.
   *
   * The developed cusp is centered at the origin, so its terminal
   * triangle centroid gives a natural radial ordering.
   */
  const radialSeed = {
    x: 0,
    y: targetCenter.y,
    z: targetCenter.z,
  };

  const radialLength =
    Math.hypot(
      radialSeed.y,
      radialSeed.z
    );

  /*
   * A deterministic fallback handles a triangle whose centroid is
   * extremely close to the center.
   */
  const fallbackAngle =
    (
      resolvedLane +
      1.5
    ) *
    Math.PI /
    2;

  const radialDirection =
    radialLength > 1e-8
      ? {
          x: 0,

          y:
            radialSeed.y /
            radialLength,

          z:
            radialSeed.z /
            radialLength,
        }
      : {
          x: 0,

          y:
            Math.cos(
              fallbackAngle
            ),

          z:
            Math.sin(
              fallbackAngle
            ),
        };

  /*
   * Tangent to that radial direction within the assembly plane.
   */
  const tangentDirection = {
    x: 0,
    y: -radialDirection.z,
    z: radialDirection.y,
  };

  /*
   * Zero at both endpoints and strongest through the middle.
   *
   * This moves the complete triangular cross-section together.
   */
  const routeEnvelope =
    Math.sin(
      Math.PI *
        routeAmount
    ) ** 2;

  const commonRouteOffset =
    addPoint(
      multiplyPoint(
        radialDirection,

        CUSP_FUNNEL_RADIAL_BOW *
          routeEnvelope
      ),

      multiplyPoint(
        tangentDirection,

        resolvedLane *
          CUSP_FUNNEL_TANGENTIAL_LANE_SPACING *
          routeEnvelope
      )
    );

  const cornerPoints =
    sourceTriangle.map(
      (
        sourcePoint,
        cornerIndex
      ) => {
        const preTargetPoint =
          preTargetTriangle[
            cornerIndex
          ];

        const distance =
          pointDistance(
            sourcePoint,
            preTargetPoint
          );

        const departure =
          Math.min(
            CUSP_COLLAR_ROUTE_DEPARTURE,

            Math.max(
              CUSP_COLLAR_LENGTH *
                0.85,

              distance *
                0.20
            )
          );

        /*
         * Preserve the visible continuation of the original cusp
         * extension at departure.
         *
         * The curve comes gently to rest at the pre-target triangle.
         */
        const curvedCorner =
          cubicBezierPoint(
            sourcePoint,

            addPoint(
              sourcePoint,

              multiplyPoint(
                sourceDirection,
                departure
              )
            ),

            preTargetPoint,

            preTargetPoint,

            routeAmount
          );

        /*
         * HALF-SPACE INVARIANT
         *
         * Solve x monotonically, independently of the visible yz bow.
         *
         * Before final approach:
         *
         *   A cannot enter x > 0
         *   B cannot enter x < 0
         */
        const monotoneX =
          sourcePoint.x +
          (
            preTargetPoint.x -
            sourcePoint.x
          ) *
            routeAmount;

        const halfspaceX =
          resolvedSideSign < 0
            ? Math.min(
                -CUSP_FUNNEL_HALFSPACE_CLEARANCE,
                monotoneX
              )
            : Math.max(
                CUSP_FUNNEL_HALFSPACE_CLEARANCE,
                monotoneX
              );

        return {
          x: halfspaceX,

          y:
            curvedCorner.y +
            commonRouteOffset.y,

          z:
            curvedCorner.z +
            commonRouteOffset.z,
        };
      }
    );

  return blendTrianglePoint(
    cornerPoints,
    weights
  );
}


function rotationX(angle) {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);

  return [
    1, 0, 0,
    0, cosine, -sine,
    0, sine, cosine,
  ];
}

function rotationY(angle) {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);

  return [
    cosine, 0, -sine,
    0, 1, 0,
    sine, 0, cosine,
  ];
}

function multiplyRotations(left, right) {
  const result = new Array(9);

  for (let row = 0; row < 3; row += 1) {
    for (
      let column = 0;
      column < 3;
      column += 1
    ) {
      result[row * 3 + column] =
        left[row * 3] *
          right[column] +
        left[row * 3 + 1] *
          right[3 + column] +
        left[row * 3 + 2] *
          right[6 + column];
    }
  }

  return result;
}

function rotationFromYawPitch(
  yaw,
  pitch
) {
  return multiplyRotations(
    rotationX(pitch),
    rotationY(yaw)
  );
}

function applyRotation(
  point,
  rotation
) {
  return {
    x:
      rotation[0] * point.x +
      rotation[1] * point.y +
      rotation[2] * point.z,
    y:
      rotation[3] * point.x +
      rotation[4] * point.y +
      rotation[5] * point.z,
    z:
      rotation[6] * point.x +
      rotation[7] * point.y +
      rotation[8] * point.z,
  };
}

function useFacePairStrengths(
  facePairSequence,
  facePairs =
    FIGURE_EIGHT_FACE_PAIRS
) {
  const facePairKey =
    facePairs
      .map(
        (pair) =>
          `${pair.id}:` +
          `${pair.A.join("")}>` +
          `${pair.B.join("")}`
      )
      .join("|");

  const sequenceKey =
    facePairSequence.join(",");

  const effectKey =
    `${facePairKey}::${sequenceKey}`;

  const initialStrengths =
    facePairs.map(
      (pair) =>
        facePairSequence.includes(
          pair.id
        )
          ? 1
          : 0
    );

  const [state, setState] =
    useState(() => ({
      strengths:
        initialStrengths,
      order: [
        ...facePairSequence,
      ],
    }));

  const strengthsRef =
    useRef(initialStrengths);

  const orderRef =
    useRef([
      ...facePairSequence,
    ]);

  const frameRef = useRef(null);

  useEffect(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(
        frameRef.current
      );

      frameRef.current = null;
    }

    const targetSequence =
      sequenceKey.length === 0
        ? []
        : sequenceKey
            .split(",")
            .map(Number);

    const startStrengths = [
      ...strengthsRef.current,
    ];

    const targetStrengths =
      facePairs.map(
        (pair) =>
          targetSequence.includes(
            pair.id
          )
            ? 1
            : 0
      );

    /*
     * Keep a removed final constraint in the solver
     * order while its strength animates back to zero.
     * This gives Undo and Reset a true reverse path.
     */
    const fadingPairIds =
      orderRef.current.filter(
        (pairId) =>
          !targetSequence.includes(
            pairId
          ) &&
          startStrengths[pairId] >
            1e-6
      );

    const transitionOrder = [
      ...targetSequence,
      ...fadingPairIds.filter(
        (pairId) =>
          !targetSequence.includes(
            pairId
          )
      ),
    ];

    orderRef.current =
      transitionOrder;

    const changed =
      targetStrengths.some(
        (target, pairId) =>
          Math.abs(
            target -
              startStrengths[
                pairId
              ]
          ) >
          1e-8
      );

    if (!changed) {
      const strengthsAlreadyMatch =
        numericArraysNearlyEqual(
          strengthsRef.current,
          targetStrengths
        );

      const orderAlreadyMatches =
        orderRef.current.length ===
          targetSequence.length &&
        orderRef.current.every(
          (pairId, index) =>
            pairId ===
            targetSequence[index]
        );

      /*
       * Refs may be synchronized without causing a render.
       * Only publish React state if the semantic value actually
       * changed.
       */
      strengthsRef.current = [
        ...targetStrengths,
      ];

      orderRef.current = [
        ...targetSequence,
      ];

      if (
        !strengthsAlreadyMatch ||
        !orderAlreadyMatches
      ) {
        setState({
          strengths: [
            ...targetStrengths,
          ],

          order: [
            ...targetSequence,
          ],
        });
      }

      return undefined;
    }

    const startedAt =
      performance.now();

    function animate(now) {
      const raw = Math.max(
        0,
        Math.min(
          1,
          (now - startedAt) /
            PAIRING_DURATION_MS
        )
      );

      const eased =
        smoothUnitInterval(raw);

      const nextStrengths =
        startStrengths.map(
          (start, pairId) =>
            start +
            (
              targetStrengths[
                pairId
              ] -
              start
            ) *
              eased
        );

      strengthsRef.current =
        nextStrengths;

      setState({
        strengths:
          nextStrengths,
        order:
          raw < 1
            ? transitionOrder
            : targetSequence,
      });

      if (raw < 1) {
        frameRef.current =
          requestAnimationFrame(
            animate
          );
      } else {
        frameRef.current = null;
        orderRef.current =
          targetSequence;
      }
    }

    frameRef.current =
      requestAnimationFrame(
        animate
      );

    return () => {
      if (
        frameRef.current !== null
      ) {
        cancelAnimationFrame(
          frameRef.current
        );

        frameRef.current = null;
      }
    };
  }, [effectKey]);

  return state;
}

function normalizeCyclicMappingIndex(
  value
) {
  const integer =
    Number.isFinite(value)
      ? Math.round(value)
      : 0;

  return (
    (
      integer %
      CYCLIC_FACE_MAPPING_CHOICES.length
    ) +
    CYCLIC_FACE_MAPPING_CHOICES.length
  ) %
  CYCLIC_FACE_MAPPING_CHOICES.length;
}

function orientedFacePairMappingIndex(
  pairId,
  mappingIndex
) {
  const normalized =
    normalizeCyclicMappingIndex(
      mappingIndex
    );

  /*
   * Green's ordered B-face boundary runs opposite to the
   * displayed counterclockwise mapping convention. Reverse
   * only that pair's discrete mapping index so each 120°
   * button step rotates the bridge end counterclockwise,
   * while the other three face pairs keep their established
   * orientation.
   */
  return pairId === 2
    ? normalizeCyclicMappingIndex(
        -normalized
      )
    : normalized;
}


/*
 * Run the Sister cusp audit only after the cyclic face-mapping
 * constants and orientation helpers have been initialized.
 *
 * The audit helpers are declared earlier, but executing them
 * before CYCLIC_FACE_MAPPING_CHOICES exists triggers the JS
 * temporal-dead-zone ReferenceError.
 */
export const
  FIGURE_EIGHT_SISTER_CUSP_CORRESPONDENCE_AUDIT =
    auditFigureEightSisterCuspCorrespondence();

/*
 * Development-only report.
 *
 * Nothing here affects rendering. It gives us one deterministic
 * certificate to inspect before changing any Sister animation.
 */
if (
  process.env.NODE_ENV !==
  "production"
) {
  const audit =
    FIGURE_EIGHT_SISTER_CUSP_CORRESPONDENCE_AUDIT;

  console.groupCollapsed(
    `[m003 cusp correspondence audit] ` +
    `${audit.certified ? "PASS" : "FAIL"}`
  );

  console.log(
    "8/8 material-slot bijection:",
    audit.slotBijectionVerified
  );

  console.log(
    "derived fixed-strip edge identifications:",
    `${audit.derivedEdgeAudit.verifiedPairCount}/12`
  );

  console.log(
    "encoded Sister edge identifications:",
    `${audit.encodedSisterEdgeAudit.verifiedPairCount}/12`
  );

  console.log(
    "material/corner round trip:",
    audit.roundTripVerified
  );

  console.log(
    "candidate layouts found:",
    audit.candidateCount
  );

  console.table(
    audit.roundTripRecords
  );

  if (
    !audit.derivedEdgeAudit.verified
  ) {
    const failedDerivedRecords =
      audit.derivedEdgeAudit.records.filter(
        (record) =>
          !record.verified
      );

    console.log(
      "FAILED derived edge records:"
    );

    console.table(
      failedDerivedRecords
    );
  }

  if (
    !audit
      .encodedSisterEdgeAudit
      .verified
  ) {
    const failedEncodedRecords =
      audit
        .encodedSisterEdgeAudit
        .records
        .filter(
          (record) =>
            !record.verified
        );

    console.log(
      "FAILED encoded Sister edge records:"
    );

    console.table(
      failedEncodedRecords
    );
  }

  console.groupEnd();
}

function cyclicallyShiftPoints(
  points,
  shift
) {
  if (points.length === 0) {
    return [];
  }

  const normalized =
    (
      (
        shift %
        points.length
      ) +
      points.length
    ) %
    points.length;

  return points.map(
    (_, index) =>
      points[
        (
          index +
          normalized
        ) %
        points.length
      ]
  );
}

function bridgeTransitionMappingProgress(
  rawProgress
) {
  return smootherUnitInterval(
    Math.max(
      0,
      Math.min(
        1,
        rawProgress
      )
    )
  );
}

function bridgeTransitionClearanceEnvelope(
  rawProgress
) {
  if (
    rawProgress <=
    BRIDGE_TRANSITION_RETRACT_END
  ) {
    return smootherUnitInterval(
      rawProgress /
      BRIDGE_TRANSITION_RETRACT_END
    );
  }

  if (
    rawProgress >=
    BRIDGE_TRANSITION_REATTACH_START
  ) {
    return (
      1 -
      smootherUnitInterval(
        (
          rawProgress -
          BRIDGE_TRANSITION_REATTACH_START
        ) /
        (
          1 -
          BRIDGE_TRANSITION_REATTACH_START
        )
      )
    );
  }

  return 1;
}

function nearestEquivalentMappingTurn(
  current,
  targetIndex
) {
  const normalizedTarget =
    normalizeCyclicMappingIndex(
      targetIndex
    );

  const baseMultiple =
    Math.round(
      (
        current -
        normalizedTarget
      ) /
      CYCLIC_FACE_MAPPING_CHOICES.length
    );

  const candidates = [
    normalizedTarget +
      (
        baseMultiple - 1
      ) *
        CYCLIC_FACE_MAPPING_CHOICES.length,
    normalizedTarget +
      baseMultiple *
        CYCLIC_FACE_MAPPING_CHOICES.length,
    normalizedTarget +
      (
        baseMultiple + 1
      ) *
        CYCLIC_FACE_MAPPING_CHOICES.length,
  ];

  return candidates.reduce(
    (best, candidate) =>
      Math.abs(
        candidate -
        current
      ) <
      Math.abs(
        best -
        current
      )
        ? candidate
        : best,
    candidates[0]
  );
}

function useAnimatedCyclicFaceMappings(
  targetMappings,
  duration = FACE_MAPPING_DURATION_MS,
  facePairs =
    FIGURE_EIGHT_FACE_PAIRS
) {
  const facePairKey =
    facePairs
      .map(
        (pair) =>
          `${pair.id}:` +
          `${pair.A.join("")}>` +
          `${pair.B.join("")}`
      )
      .join("|");

  const normalizedTargets =
    facePairs.map(
      (_, pairId) =>
        orientedFacePairMappingIndex(
          pairId,
          targetMappings?.[
            pairId
          ] ?? 0
        )
    );

  const targetKey =
    `${facePairKey}::` +
    normalizedTargets.join(",");

  const [turns, setTurns] =
    useState(
      normalizedTargets
    );

  const turnsRef =
    useRef(
      normalizedTargets
    );

  useEffect(() => {
    const startTurns = [
      ...turnsRef.current,
    ];

    const endTurns =
      normalizedTargets.map(
        (target, pairId) =>
          nearestEquivalentMappingTurn(
            startTurns[
              pairId
            ] ?? 0,
            target
          )
      );

    const changed =
      endTurns.some(
        (target, pairId) =>
          Math.abs(
            target -
            startTurns[
              pairId
            ]
          ) >
          1e-8
      );

    if (!changed) {
      turnsRef.current =
        endTurns;

      setTurns(endTurns);

      return undefined;
    }

    const startedAt =
      performance.now();

    let frameId = null;

    function animate(now) {
      const raw = Math.max(
        0,
        Math.min(
          1,
          (
            now -
            startedAt
          ) /
            duration
        )
      );

      const eased =
        bridgeTransitionMappingProgress(
          raw
        );

      const nextTurns =
        startTurns.map(
          (start, pairId) =>
            start +
            (
              endTurns[
                pairId
              ] -
              start
            ) *
              eased
        );

      turnsRef.current =
        nextTurns;

      setTurns(
        nextTurns
      );

      if (raw < 1) {
        frameId =
          requestAnimationFrame(
            animate
          );
      }
    }

    frameId =
      requestAnimationFrame(
        animate
      );

    return () => {
      if (frameId !== null) {
        cancelAnimationFrame(
          frameId
        );
      }
    };
  }, [
    targetKey,
    duration,
  ]);

  return turns;
}

function useAnimatedAssembly(
  active,
  duration = CUSP_ASSEMBLY_DURATION_MS,
  easing = "easeOut"
) {
  const target = active ? 1 : 0;
  const [progress, setProgress] =
    useState(target);
  const progressRef = useRef(target);

  useEffect(() => {
    const start = progressRef.current;

    /*
     * Do not start a requestAnimationFrame loop when this
     * construction clock is already at its requested endpoint.
     *
     * Several independent assembly clocks are mounted at once.
     * Running no-op state updates from all of them can create a
     * React update-depth feedback storm even though their visible
     * geometry is not changing.
     */
    if (
      Math.abs(
        target - start
      ) <= 1e-8
    ) {
      progressRef.current = target;
      return undefined;
    }

    const startedAt = performance.now();
    let frameId;

    function animate(now) {
      const raw = Math.max(
        0,
        Math.min(
          1,
          (now - startedAt) /
            duration
        )
      );

      /*
       * Peripheral identifications need to spend their entire
       * requested duration on visible geometric change.
       *
       * Other construction animations keep the established
       * ease-out behavior.
       */
      const eased =
        easing === "linear"
          ? raw
          : 1 - Math.pow(1 - raw, 3);

      const next =
        start + (target - start) * eased;

      progressRef.current = next;
      setProgress(next);

      if (raw < 1) {
        frameId =
          requestAnimationFrame(animate);
      }
    }

    frameId =
      requestAnimationFrame(animate);

    return () =>
      cancelAnimationFrame(frameId);
  }, [target, duration, easing]);

  return progress;
}

function numericArraysNearlyEqual(
  first,
  second,
  tolerance = 1e-9
) {
  return (
    Array.isArray(first) &&
    Array.isArray(second) &&
    first.length === second.length &&
    first.every(
      (value, index) =>
        Math.abs(
          value - second[index]
        ) <= tolerance
    )
  );
}


function useAnimatedPairStrengths(
  activePairIds,
  duration = SEAM_TRANSITION_DURATION_MS,
  facePairs =
    FIGURE_EIGHT_FACE_PAIRS
) {
  const facePairKey =
    facePairs
      .map(
        (pair) =>
          `${pair.id}:` +
          `${pair.A.join("")}>` +
          `${pair.B.join("")}`
      )
      .join("|");

  const targetStrengths =
    facePairs.map(
      (pair) =>
        activePairIds.includes(pair.id)
          ? 1
          : 0
    );

  const targetKey =
    `${facePairKey}::` +
    targetStrengths.join(",");

  const [strengths, setStrengths] =
    useState(targetStrengths);

  const strengthsRef =
    useRef(targetStrengths);

  useEffect(() => {
    const startStrengths = [
      ...strengthsRef.current,
    ];

    const changed =
      targetStrengths.some(
        (target, pairId) =>
          Math.abs(
            target -
              startStrengths[pairId]
          ) >
          FACE_CONSTRAINT_EPSILON
      );

    if (!changed) {
      /*
       * targetStrengths is rebuilt during render, so array identity
       * is meaningless here. Do not generate a React update when
       * the actual numeric seam state is already correct.
       */
      if (
        !numericArraysNearlyEqual(
          strengthsRef.current,
          targetStrengths
        )
      ) {
        strengthsRef.current = [
          ...targetStrengths,
        ];

        setStrengths(
          [...targetStrengths]
        );
      }

      return undefined;
    }

    const startedAt = performance.now();
    let frameId = null;

    function animate(now) {
      const raw = Math.max(
        0,
        Math.min(
          1,
          (now - startedAt) /
            duration
        )
      );

      const removingPairIds =
        startStrengths
          .map((start, pairId) =>
            start >
            targetStrengths[pairId] +
              FACE_CONSTRAINT_EPSILON
              ? pairId
              : null
          )
          .filter(
            (pairId) =>
              pairId !== null
          );

      const addingPairIds =
        targetStrengths
          .map((target, pairId) =>
            target >
            startStrengths[pairId] +
              FACE_CONSTRAINT_EPSILON
              ? pairId
              : null
          )
          .filter(
            (pairId) =>
              pairId !== null
          );

      const replacingPair =
        removingPairIds.length > 0 &&
        addingPairIds.length > 0;

      let nextStrengths;

      if (replacingPair) {
        /*
         * Do not interpolate directly between two incompatible
         * face-meeting poses.
         *
         * First retract completely to the separated Cells pose.
         * Then begin the new collision-free approach.
         */
        if (raw < 0.5) {
          const retract =
            smoothUnitInterval(
              raw * 2
            );

          nextStrengths =
            startStrengths.map(
              (start, pairId) =>
                removingPairIds.includes(
                  pairId
                )
                  ? start *
                    (1 - retract)
                  : start
            );
        } else {
          const approach =
            smoothUnitInterval(
              (raw - 0.5) * 2
            );

          nextStrengths =
            targetStrengths.map(
              (target, pairId) =>
                addingPairIds.includes(
                  pairId
                )
                  ? target *
                    approach
                  : target
            );
        }
      } else {
        const eased =
          1 - Math.pow(
            1 - raw,
            3
          );

        nextStrengths =
          startStrengths.map(
            (start, pairId) =>
              start +
              (
                targetStrengths[
                  pairId
                ] -
                start
              ) *
                eased
          );
      }

      if (
        !numericArraysNearlyEqual(
          strengthsRef.current,
          nextStrengths,
          1e-10
        )
      ) {
        strengthsRef.current =
          nextStrengths;

        setStrengths(
          nextStrengths
        );
      }

      if (raw < 1) {
        frameId =
          requestAnimationFrame(animate);
      }
    }

    frameId =
      requestAnimationFrame(animate);

    return () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [targetKey, duration]);

  return strengths;
}

function useAnimatedManifoldSelection(
  initialManifoldId = "m004"
) {
  const [state, setState] = useState(() => ({
    activeId: initialManifoldId,
    targetId: initialManifoldId,
    progress: 1,
  }));

  const frameRef = useRef(null);

  useEffect(
    () => () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(
          frameRef.current
        );
      }
    },
    []
  );

  const request = (targetId) => {
    const targetSpec =
      manifoldSpec(targetId);

    if (
      !targetSpec.available ||
      targetId === state.targetId ||
      state.progress < 1
    ) {
      return;
    }

    const fromId = state.activeId;
    const startedAt = performance.now();

    setState({
      activeId: fromId,
      targetId,
      progress: 0,
    });

    function animate(now) {
      const progress = clampUnit(
        (now - startedAt) /
          MANIFOLD_SWITCH_DURATION_MS
      );

      setState({
        activeId:
          progress < 0.5
            ? fromId
            : targetId,
        targetId,
        progress,
      });

      if (progress < 1) {
        frameRef.current =
          requestAnimationFrame(animate);
      } else {
        frameRef.current = null;
      }
    }

    frameRef.current =
      requestAnimationFrame(animate);
  };

  return {
    ...state,
    switching: state.progress < 1,
    request,
  };
}

function edgePoint(
  fromIndex,
  toIndex,
  truncationFraction =
    DEFAULT_TRUNCATION_FRACTION
) {
  return lerpPoint(
    VERTICES[fromIndex],
    VERTICES[toIndex],
    normalizeTruncationFraction(
      truncationFraction
    )
  );
}

function truncatedVertexKey(
  fromIndex,
  toIndex
) {
  return `${fromIndex}->${toIndex}`;
}

function truncatedHexagonVertexKeys(
  face
) {
  const [a, b, c] = face;

  return [
    truncatedVertexKey(a, b),
    truncatedVertexKey(b, a),
    truncatedVertexKey(b, c),
    truncatedVertexKey(c, b),
    truncatedVertexKey(c, a),
    truncatedVertexKey(a, c),
  ];
}

function meshEdgeKey(
  firstIndex,
  secondIndex
) {
  return firstIndex < secondIndex
    ? `${firstIndex}:${secondIndex}`
    : `${secondIndex}:${firstIndex}`;
}

function pointDistance(first, second) {
  return Math.hypot(
    second.x - first.x,
    second.y - first.y,
    second.z - first.z
  );
}

function triangleArea(
  first,
  second,
  third
) {
  const firstEdge =
    subtractPoint(second, first);

  const secondEdge =
    subtractPoint(third, first);

  const cross =
    crossPoint(
      firstEdge,
      secondEdge
    );

  return (
    0.5 *
    Math.hypot(
      cross.x,
      cross.y,
      cross.z
    )
  );
}

function triangulateMeshFace(
  face,
  vertices
) {
  return Array.from(
    {
      length:
        face.vertexIndices.length - 2,
    },
    (_, index) => {
      const vertexIndices = [
        face.vertexIndices[0],
        face.vertexIndices[index + 1],
        face.vertexIndices[index + 2],
      ];

      const points =
        vertexIndices.map(
          (vertexIndex) =>
            vertices[
              vertexIndex
            ].point
        );

      return {
        id:
          `${face.id}-triangle-${index}`,
        faceId: face.id,
        kind: face.kind,
        pairId:
          face.pairId ?? null,
        vertexIndices,
        restArea:
          triangleArea(
            points[0],
            points[1],
            points[2]
          ),
      };
    }
  );
}

function createTruncatedTetrahedronMesh(
  tetrahedronId,
  truncationFraction =
    DEFAULT_TRUNCATION_FRACTION,
  facePairs =
    FIGURE_EIGHT_FACE_PAIRS
) {
  const normalizedTruncationFraction =
    normalizeTruncationFraction(
      truncationFraction
    );

  const vertices = [];

  VERTICES.forEach(
    (_, fromIndex) => {
      VERTICES.forEach(
        (_, toIndex) => {
          if (fromIndex === toIndex) {
            return;
          }

          vertices.push({
            id: truncatedVertexKey(
              fromIndex,
              toIndex
            ),
            fromIndex,
            toIndex,
            point: edgePoint(
              fromIndex,
              toIndex,
              normalizedTruncationFraction
            ),
          });
        }
      );
    }
  );

  const vertexIndexById =
    new Map(
      vertices.map(
        (vertex, index) => [
          vertex.id,
          index,
        ]
      )
    );

  function vertexIndicesForIds(ids) {
    return ids.map((id) => {
      const index =
        vertexIndexById.get(id);

      if (index === undefined) {
        throw new Error(
          `Missing truncated vertex ${id}`
        );
      }

      return index;
    });
  }

  const largeFaces =
    facePairs.map(
      (pair) => ({
        id:
          `${tetrahedronId}-large-` +
          `${pair.id}`,
        kind: "large",
        pairId: pair.id,
        orderedIdealVertices:
          [...pair[tetrahedronId]],
        vertexIndices:
          vertexIndicesForIds(
            truncatedHexagonVertexKeys(
              pair[tetrahedronId]
            )
          ),
      })
    );

  const cuspFaces =
    VERTICES.map(
      (_, vertexIndex) => ({
        id:
          `${tetrahedronId}-cusp-` +
          `${vertexIndex}`,
        kind: "cusp",
        vertexIndex,
        vertexIndices:
          vertexIndicesForIds(
            TRUNCATION_NEIGHBORS[
              vertexIndex
            ].map(
              (neighborIndex) =>
                truncatedVertexKey(
                  vertexIndex,
                  neighborIndex
                )
            )
          ),
      })
    );

  const faces = [
    ...largeFaces,
    ...cuspFaces,
  ];

  const faceById =
    new Map(
      faces.map((face) => [
        face.id,
        face,
      ])
    );

  const edgeMap = new Map();

  faces.forEach((face) => {
    face.vertexIndices.forEach(
      (firstIndex, index) => {
        const secondIndex =
          face.vertexIndices[
            (index + 1) %
              face.vertexIndices.length
          ];

        const key = meshEdgeKey(
          firstIndex,
          secondIndex
        );

        const existing =
          edgeMap.get(key);

        if (existing) {
          existing.faceIds.push(
            face.id
          );
          return;
        }

        edgeMap.set(key, {
          id:
            `${tetrahedronId}-edge-` +
            `${key}`,
          vertexIndices: [
            firstIndex,
            secondIndex,
          ],
          faceIds: [face.id],
          restLength:
            pointDistance(
              vertices[
                firstIndex
              ].point,
              vertices[
                secondIndex
              ].point
            ),
        });
      }
    );
  });

  const edges =
    [...edgeMap.values()];

  const triangles =
    faces.flatMap(
      (face) =>
        triangulateMeshFace(
          face,
          vertices
        )
    );

  const vertexNeighbors =
    vertices.map(() => new Set());

  const vertexFaceIds =
    vertices.map(() => []);

  edges.forEach((edge) => {
    const [firstIndex, secondIndex] =
      edge.vertexIndices;

    vertexNeighbors[
      firstIndex
    ].add(secondIndex);

    vertexNeighbors[
      secondIndex
    ].add(firstIndex);
  });

  faces.forEach((face) => {
    face.vertexIndices.forEach(
      (vertexIndex) => {
        vertexFaceIds[
          vertexIndex
        ].push(face.id);
      }
    );
  });

  const mesh = {
    tetrahedronId,
    truncationFraction:
      normalizedTruncationFraction,
    vertices,
    vertexIndexById,
    largeFaces,
    cuspFaces,
    faces,
    faceById,
    edges,
    triangles,
    vertexNeighbors:
      vertexNeighbors.map(
        (neighbors) =>
          [...neighbors]
      ),
    vertexFaceIds,
  };

  const invalidEdge =
    edges.find(
      (edge) =>
        edge.faceIds.length !== 2
    );

  const invalidVertex =
    mesh.vertexNeighbors.find(
      (neighbors) =>
        neighbors.length !== 3
    );

  const invalidVertexFaces =
    vertexFaceIds.find(
      (faceIds) =>
        faceIds.length !== 3
    );

  if (
    vertices.length !== 12 ||
    faces.length !== 8 ||
    edges.length !== 18 ||
    triangles.length !== 20 ||
    invalidEdge ||
    invalidVertex ||
    invalidVertexFaces
  ) {
    throw new Error(
      "Invalid truncated-tetrahedron mesh topology"
    );
  }

  return mesh;
}

function createTruncatedTetrahedronMeshes(
  truncationFraction =
    DEFAULT_TRUNCATION_FRACTION,
  facePairs =
    FIGURE_EIGHT_FACE_PAIRS
) {
  const normalizedTruncationFraction =
    normalizeTruncationFraction(
      truncationFraction
    );

  return {
    A: createTruncatedTetrahedronMesh(
      "A",
      normalizedTruncationFraction,
      facePairs
    ),
    B: createTruncatedTetrahedronMesh(
      "B",
      normalizedTruncationFraction,
      facePairs
    ),
  };
}

function createTruncatedEdgeIndexByVertexKey(
  meshes
) {
  return {
    A: new Map(
      meshes.A.edges.map(
        (edge, edgeIndex) => [
          meshEdgeKey(
            edge.vertexIndices[0],
            edge.vertexIndices[1]
          ),
          edgeIndex,
        ]
      )
    ),
    B: new Map(
      meshes.B.edges.map(
        (edge, edgeIndex) => [
          meshEdgeKey(
            edge.vertexIndices[0],
            edge.vertexIndices[1]
          ),
          edgeIndex,
        ]
      )
    ),
  };
}

function createFacePairVertexCorrespondences(
  meshes,
  facePairs =
    FIGURE_EIGHT_FACE_PAIRS
) {
  return facePairs.map(
    (pair) => {
      const faceA =
        meshes.A.largeFaces[
          pair.id
        ];

      const faceB =
        meshes.B.largeFaces[
          pair.id
        ];

      return {
        pairId: pair.id,
        vertexPairs:
          faceA.vertexIndices.map(
            (vertexAIndex, index) => ({
              vertexAIndex,
              vertexBIndex:
                faceB.vertexIndices[
                  index
                ],
            })
          ),
      };
    }
  );
}

export function createTruncatedTetrahedronGeometry(
  truncationFraction =
    DEFAULT_TRUNCATION_FRACTION,
  tetrahedronSeparation =
    DEFAULT_TETRAHEDRON_SEPARATION,
  facePairs =
    FIGURE_EIGHT_FACE_PAIRS
) {
  const normalizedTruncationFraction =
    normalizeTruncationFraction(
      truncationFraction
    );

  const normalizedTetrahedronSeparation =
    normalizeTetrahedronSeparation(
      tetrahedronSeparation
    );

  const tetrahedra =
    tetrahedraAtSeparation(
      normalizedTetrahedronSeparation
    );

  const meshes =
    createTruncatedTetrahedronMeshes(
      normalizedTruncationFraction,
      facePairs
    );

  /*
   * The visible mesh above is the boundary of the compact cell.
   *
   * Build the complete intrinsic 3-volume underneath it.
   * This has no rendering effect yet.
   */
  const intrinsicVolumeMeshes =
    createIntrinsicVolumeMeshes({
      surfaceMeshes: meshes,

      idealVertices:
        VERTICES,

      truncationNeighbors:
        TRUNCATION_NEIGHBORS,
    });

  const initialWorldPositions = {
    A: meshes.A.vertices.map(
      (vertex) =>
        transformPoint(
          vertex.point,
          tetrahedra[0]
        )
    ),
    B: meshes.B.vertices.map(
      (vertex) =>
        transformPoint(
          vertex.point,
          tetrahedra[1]
        )
    ),
  };

  const faceShapeConstraints = {
    A: createShapeConstraints(
      meshes.A,
      initialWorldPositions.A
    ),
    B: createShapeConstraints(
      meshes.B,
      initialWorldPositions.B
    ),
  };

  return {
    truncationFraction:
      normalizedTruncationFraction,
    tetrahedronSeparation:
      normalizedTetrahedronSeparation,
    facePairs,
    tetrahedra,
    meshes,
    intrinsicVolumeMeshes,
    initialWorldPositions,
    faceShapeConstraints,
    edgeIndexByVertexKey:
      createTruncatedEdgeIndexByVertexKey(
        meshes
      ),
    facePairVertexCorrespondences:
      createFacePairVertexCorrespondences(
        meshes,
        facePairs
      ),
  };
}

const DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY =
  createTruncatedTetrahedronGeometry();

const TRUNCATED_TETRAHEDRON_MESHES =
  DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY
    .meshes;

const TRUNCATED_EDGE_INDEX_BY_VERTEX_KEY =
  DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY
    .edgeIndexByVertexKey;

export const FACE_PAIR_VERTEX_CORRESPONDENCES =
  DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY
    .facePairVertexCorrespondences;

function settledCyclicMappingIndex(
  mappingTurn
) {
  const nearestInteger =
    Math.round(
      Number.isFinite(mappingTurn)
        ? mappingTurn
        : 0
    );

  return Math.abs(
    (
      Number.isFinite(mappingTurn)
        ? mappingTurn
        : 0
    ) -
    nearestInteger
  ) <
    1e-8
    ? normalizeCyclicMappingIndex(
        nearestInteger
      )
    : null;
}

function facePairVertexCorrespondence(
  pairId,
  mappingIndex = 0,
  geometry =
    DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY
) {
  const faceA =
    geometry.meshes.A.largeFaces[
      pairId
    ];

  const faceB =
    geometry.meshes.B.largeFaces[
      pairId
    ];

  const normalizedMapping =
    normalizeCyclicMappingIndex(
      mappingIndex
    );

  const hexagonShift =
    CYCLIC_FACE_MAPPING_CHOICES[
      normalizedMapping
    ].hexagonShift;

  return {
    pairId,
    mappingIndex:
      normalizedMapping,
    vertexPairs:
      faceA.vertexIndices.map(
        (vertexAIndex, index) => ({
          vertexAIndex,
          vertexBIndex:
            faceB.vertexIndices[
              (
                index +
                hexagonShift
              ) %
              faceB.vertexIndices.length
            ],
        })
      ),
  };
}


function releasedFacePairMappedBPoints(
  positions,
  pairId,
  mappingTurn = 0,
  geometry =
    DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY
) {
  const finiteTurn =
    Number.isFinite(mappingTurn)
      ? mappingTurn
      : 0;

  const lowerTurn =
    Math.floor(finiteTurn);

  const upperTurn =
    lowerTurn + 1;

  const amount =
    finiteTurn - lowerTurn;

  const lowerCorrespondence =
    facePairVertexCorrespondence(
      pairId,
      lowerTurn,
      geometry
    );

  const upperCorrespondence =
    facePairVertexCorrespondence(
      pairId,
      upperTurn,
      geometry
    );

  const mappingAmount =
    smootherUnitInterval(amount);

  return lowerCorrespondence
    .vertexPairs.map(
      (vertexPair, index) =>
        lerpPoint(
          positions.B[
            vertexPair.vertexBIndex
          ],
          positions.B[
            upperCorrespondence
              .vertexPairs[index]
              .vertexBIndex
          ],
          mappingAmount
        )
    );
}

function releasedFaceMeanRadius(points) {
  if (points.length === 0) {
    return 0;
  }

  const center =
    averageWorldPoint(points);

  return points.reduce(
    (sum, point) =>
      sum +
      pointDistance(
        point,
        center
      ) /
        points.length,
    0
  );
}

function releasedFaceRouteDirection({
  positions,
  baseA,
  baseB,
  rawSharedFace,
}) {
  const centerA =
    averageWorldPoint(
      positions.A
    );

  const centerB =
    averageWorldPoint(
      positions.B
    );

  const normalA =
    outwardFaceNormal(
      baseA,
      centerA
    );

  const normalB =
    outwardFaceNormal(
      baseB,
      centerB
    );

  let direction =
    addPoint(
      normalA,
      normalB
    );

  const coreCenter =
    averageWorldPoint(
      allWorldPoints(
        positions
      )
    );

  const rawSharedCenter =
    averageWorldPoint(
      rawSharedFace
    );

  if (
    Math.hypot(
      direction.x,
      direction.y,
      direction.z
    ) < 0.15
  ) {
    direction =
      subtractPoint(
        rawSharedCenter,
        coreCenter
      );
  }

  if (
    Math.hypot(
      direction.x,
      direction.y,
      direction.z
    ) < 0.15
  ) {
    direction =
      crossPoint(
        normalA,
        normalB
      );
  }

  return {
    coreCenter,
    normalA,
    normalB,
    direction:
      normalizePoint(direction),
  };
}

function releasedFaceSharedTarget({
  positions,
  baseA,
  baseB,
  pinned = false,
}) {
  const rawSharedFace =
    baseA.map(
      (pointA, index) =>
        lerpPoint(
          pointA,
          baseB[index],
          0.5
        )
    );

  if (pinned) {
    return {
      sharedFace:
        rawSharedFace.map(
          clonePoint
        ),
      normalA:
        outwardFaceNormal(
          baseA,
          averageWorldPoint(
            positions.A
          )
        ),
      normalB:
        outwardFaceNormal(
          baseB,
          averageWorldPoint(
            positions.B
          )
        ),
      routeDirection: {
        x: 0,
        y: 0,
        z: 0,
      },
      faceRadius:
        0.5 *
        (
          releasedFaceMeanRadius(
            baseA
          ) +
          releasedFaceMeanRadius(
            baseB
          )
        ),
    };
  }

  const {
    coreCenter,
    normalA,
    normalB,
    direction: routeDirection,
  } =
    releasedFaceRouteDirection({
      positions,
      baseA,
      baseB,
      rawSharedFace,
    });

  const radiusA =
    releasedFaceMeanRadius(
      baseA
    );

  const radiusB =
    releasedFaceMeanRadius(
      baseB
    );

  const faceRadius =
    0.5 *
    (radiusA + radiusB);

  const supportDistance =
    allWorldPoints(
      positions
    ).reduce(
      (maximum, point) =>
        Math.max(
          maximum,
          dotPoint(
            subtractPoint(
              point,
              coreCenter
            ),
            routeDirection
          )
        ),
      0
    );

  const targetCenter =
    addPoint(
      coreCenter,
      multiplyPoint(
        routeDirection,
        supportDistance +
          faceRadius *
            RELEASED_FACE_CLEARANCE_RATIO
      )
    );

  const rawCenter =
    averageWorldPoint(
      rawSharedFace
    );

  const rawRadius =
    releasedFaceMeanRadius(
      rawSharedFace
    );

  const inflation =
    rawRadius >
    FACE_CONSTRAINT_EPSILON
      ? Math.max(
          1,
          Math.min(
            RELEASED_FACE_MAX_INFLATION,
            faceRadius /
              rawRadius
          )
        )
      : 1;

  const sharedFace =
    rawSharedFace.map(
      (point) =>
        addPoint(
          targetCenter,
          multiplyPoint(
            subtractPoint(
              point,
              rawCenter
            ),
            inflation
          )
        )
    );

  return {
    sharedFace,
    normalA,
    normalB,
    routeDirection,
    faceRadius,
  };
}

function releasedFaceRouteRing({
  baseFace,
  sharedFace,
  outwardNormal,
  routeDirection,
  faceRadius,
  amount,
  pinned = false,
}) {
  const progress =
    clampUnit(amount);

  if (pinned) {
    return baseFace.map(
      (point, index) =>
        lerpPoint(
          point,
          sharedFace[index],
          progress
        )
    );
  }

  const departure =
    faceRadius *
    RELEASED_FACE_DEPARTURE_RATIO;

  const approach =
    faceRadius *
    RELEASED_FACE_APPROACH_RATIO;

  return baseFace.map(
    (point, index) => {
      const target =
        sharedFace[index];

      return cubicBezierPoint(
        point,
        addPoint(
          point,
          multiplyPoint(
            outwardNormal,
            departure
          )
        ),
        addPoint(
          target,
          multiplyPoint(
            routeDirection,
            approach
          )
        ),
        target,
        progress
      );
    }
  );
}

function releasedFaceBoundaryClearanceAttachments(
  pairId,
  cellId,
  geometry =
    DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY
) {
  const pair =
    geometry.facePairs[pairId];

  if (!pair) {
    return {
      startIds: [],
      sharedIds: [],
    };
  }

  const sharedIds = [
    ...pair.A.map(
      (vertexIndex) =>
        `boundary-clearance-A${vertexIndex}`
    ),
    ...pair.B.map(
      (vertexIndex) =>
        `boundary-clearance-B${vertexIndex}`
    ),
  ];

  const identifiedFaceIds =
    [...new Set(sharedIds)];

  return {
    startIds: identifiedFaceIds,
    sharedIds: identifiedFaceIds,
  };
}

function releasedFaceCollarFaces({
  pairId,
  cellId,
  baseFace,
  sharedFace,
  outwardNormal,
  routeDirection,
  faceRadius,
  amount,
  pinned = false,
  boundaryClearanceCorridors = [],
  geometry =
    DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY,
}) {
  const activeSegments =
    Math.max(
      1,
      RELEASED_FACE_COLLAR_SEGMENTS
    );

  const boundaryAttachments =
    releasedFaceBoundaryClearanceAttachments(
      pairId,
      cellId,
      geometry
    );

  const rawRings =
    Array.from(
      {
        length:
          activeSegments + 1,
      },
      (_, ringIndex) =>
        releasedFaceRouteRing({
          baseFace,
          sharedFace,
          outwardNormal,
          routeDirection,
          faceRadius,
          amount:
            clampUnit(amount) *
            ringIndex /
            activeSegments,
          pinned,
        })
    );

  let clearanceRings =
    rawRings.map((ring) =>
      ring.map(clonePoint)
    );

  if (
    !pinned &&
    boundaryClearanceCorridors.length > 0 &&
    clearanceRings.length > 1
  ) {
    const lastRingIndex =
      clearanceRings.length - 1;

    const rawEndRing =
      clearanceRings[lastRingIndex];

    const safeEndRing =
      boundaryClearanceTranslateSurfaceOutsideCorridors(
        rawEndRing,
        boundaryClearanceCorridors,
        `released-${pairId}-${cellId}-moving-end`,
        boundaryAttachments.sharedIds
      );

    const endpointCorrection =
      subtractPoint(
        averageWorldPoint(
          safeEndRing
        ),
        averageWorldPoint(
          rawEndRing
        )
      );

    if (
      Math.hypot(
        endpointCorrection.x,
        endpointCorrection.y,
        endpointCorrection.z
      ) >
      BOUNDARY_CLEARANCE_EPSILON
    ) {
      clearanceRings =
        clearanceRings.map(
          (ring, ringIndex) => {
            const progress =
              smootherUnitInterval(
                ringIndex /
                  lastRingIndex
              );

            const correction =
              multiplyPoint(
                endpointCorrection,
                progress
              );

            return ring.map((point) =>
              addPoint(
                point,
                correction
              )
            );
          }
        );
    }
  }

  const rings =
    pinned
      ? clearanceRings
      : boundaryClearanceRouteRings(
          clearanceRings,
          boundaryClearanceCorridors,
          `released-${pairId}-${cellId}`,
          {
            startAllowedCorridorIds:
              boundaryAttachments.startIds,
            endAllowedCorridorIds:
              boundaryAttachments.sharedIds,
          }
        );

  const faces = [];

  for (
    let ringIndex = 0;
    ringIndex < activeSegments;
    ringIndex += 1
  ) {
    const startRing =
      rings[ringIndex];

    const endRing =
      rings[ringIndex + 1];

    for (
      let vertexIndex = 0;
      vertexIndex <
        baseFace.length;
      vertexIndex += 1
    ) {
      const nextVertexIndex =
        (vertexIndex + 1) %
        baseFace.length;

      const boundaryClearanceAllowedIds = [
        ...(
          pinned
            ? boundaryAttachments.sharedIds
            : []
        ),
        ...(
          ringIndex === 0
            ? boundaryAttachments.startIds
            : []
        ),
        ...(
          ringIndex ===
            activeSegments - 1
            ? boundaryAttachments.sharedIds
            : []
        ),
      ];

      faces.push({
        key:
          `released-${pairId}-` +
          `${cellId}-collar-` +
          `${ringIndex}-` +
          `${vertexIndex}`,
        cellId,
        ringIndex,
        boundaryClearanceAllowedIds,
        points: [
          clonePoint(
            startRing[
              vertexIndex
            ]
          ),
          clonePoint(
            startRing[
              nextVertexIndex
            ]
          ),
          clonePoint(
            endRing[
              nextVertexIndex
            ]
          ),
          clonePoint(
            endRing[
              vertexIndex
            ]
          ),
        ],
      });
    }
  }

  return {
    rings,
    faces,
  };
}

function makeReleasedFaceIdentificationModel({
  positions,
  pairId,
  mappingTurn = 0,
  strength = 0,
  pinned = false,
  sharedFaceOverride = null,
  boundaryClearanceCorridors = [],
  geometry =
    DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY,
}) {
  const amount = clampUnit(strength);

  if (
    !Number.isInteger(pairId) ||
    amount <= FACE_CONSTRAINT_EPSILON
  ) {
    return null;
  }

  const correspondence =
    facePairVertexCorrespondence(
      pairId,
      0,
      geometry
    );

  const baseA =
    correspondence.vertexPairs.map(
      (vertexPair) =>
        clonePoint(
          positions.A[
            vertexPair.vertexAIndex
          ]
        )
    );

  const baseB =
    releasedFacePairMappedBPoints(
      positions,
      pairId,
      mappingTurn,
      geometry
    );

  const overrideAvailable =
    !pinned &&
    Array.isArray(sharedFaceOverride) &&
    sharedFaceOverride.length ===
      baseA.length;

  let target;

  if (overrideAvailable) {
    const sharedFace =
      sharedFaceOverride.map(
        clonePoint
      );

    const centerA =
      averageWorldPoint(positions.A);

    const centerB =
      averageWorldPoint(positions.B);

    const normalA =
      outwardFaceNormal(
        baseA,
        centerA
      );

    const normalB =
      outwardFaceNormal(
        baseB,
        centerB
      );

    const coreCenter =
      averageWorldPoint(
        allWorldPoints(positions)
      );

    const sharedCenter =
      averageWorldPoint(sharedFace);

    let routeDirection =
      subtractPoint(
        sharedCenter,
        coreCenter
      );

    if (
      Math.hypot(
        routeDirection.x,
        routeDirection.y,
        routeDirection.z
      ) < 0.15
    ) {
      routeDirection =
        addPoint(normalA, normalB);
    }

    if (
      Math.hypot(
        routeDirection.x,
        routeDirection.y,
        routeDirection.z
      ) < 0.15
    ) {
      routeDirection =
        crossPoint(normalA, normalB);
    }

    target = {
      sharedFace,
      normalA,
      normalB,
      routeDirection:
        normalizePoint(routeDirection),
      faceRadius:
        0.5 *
        (
          releasedFaceMeanRadius(baseA) +
          releasedFaceMeanRadius(baseB)
        ),
    };
  } else {
    target =
      releasedFaceSharedTarget({
        positions,
        baseA,
        baseB,
        pinned,
      });
  }

  const boundaryClearanceSharedIds =
    releasedFaceBoundaryClearanceAttachments(
      pairId,
      "A",
      geometry
    ).sharedIds;

  if (
    !pinned &&
    boundaryClearanceCorridors.length > 0
  ) {
    const safeSharedFace =
      boundaryClearanceTranslateSurfaceOutsideCorridors(
        target.sharedFace,
        boundaryClearanceCorridors,
        `released-${pairId}-shared-face`,
        boundaryClearanceSharedIds
      );

    const coreCenter =
      averageWorldPoint(
        allWorldPoints(positions)
      );

    const safeDirection =
      subtractPoint(
        averageWorldPoint(
          safeSharedFace
        ),
        coreCenter
      );

    target = {
      ...target,
      sharedFace: safeSharedFace,
      routeDirection:
        Math.hypot(
          safeDirection.x,
          safeDirection.y,
          safeDirection.z
        ) > 0.15
          ? normalizePoint(
              safeDirection
            )
          : target.routeDirection,
    };
  }

  const collarA =
    releasedFaceCollarFaces({
      pairId,
      cellId: "A",
      baseFace: baseA,
      sharedFace:
        target.sharedFace,
      outwardNormal:
        target.normalA,
      routeDirection:
        target.routeDirection,
      faceRadius:
        target.faceRadius,
      amount,
      pinned,
      boundaryClearanceCorridors,
      geometry,
    });

  const collarB =
    releasedFaceCollarFaces({
      pairId,
      cellId: "B",
      baseFace: baseB,
      sharedFace:
        target.sharedFace,
      outwardNormal:
        target.normalB,
      routeDirection:
        target.routeDirection,
      faceRadius:
        target.faceRadius,
      amount,
      pinned,
      boundaryClearanceCorridors,
      geometry,
    });

  const releasedA =
    collarA.rings[
      collarA.rings.length - 1
    ].map(clonePoint);

  const releasedB =
    collarB.rings[
      collarB.rings.length - 1
    ].map(clonePoint);

  return {
    pairId,
    strength: amount,
    pinned,
    baseA,
    baseB,
    releasedA,
    releasedB,
    sharedFace:
      target.sharedFace,
    boundaryClearanceSharedIds,
    routeDirection:
      target.routeDirection,
    collarFaces: [
      ...collarA.faces,
      ...collarB.faces,
    ],
  };
}

function triangulateBoundaryPolygon(
  points,
  keyPrefix,
  metadata = {}
) {
  if (!Array.isArray(points) || points.length < 3) {
    return [];
  }

  return Array.from(
    { length: points.length - 2 },
    (_, triangleIndex) => ({
      key: `${keyPrefix}-${triangleIndex}`,
      bridgeIndex: keyPrefix,
      pairId: keyPrefix,
      segmentIndex: 0,
      sideIndex: triangleIndex,
      triangleIndex,
      ...metadata,
      points: [
        clonePoint(points[0]),
        clonePoint(points[triangleIndex + 1]),
        clonePoint(points[triangleIndex + 2]),
      ],
    })
  );
}

function makeBoundaryClearanceCorridor({
  id,
  basePoints,
  outwardDirection,
}) {
  const direction =
    normalizePoint(outwardDirection);

  const startPoints =
    basePoints.map((point) =>
      addPoint(
        point,
        multiplyPoint(
          direction,
          BOUNDARY_CLEARANCE_ATTACHMENT_GAP
        )
      )
    );

  const endPoints =
    basePoints.map((point) =>
      addPoint(
        point,
        multiplyPoint(
          direction,
          BOUNDARY_CLEARANCE_EXIT_LENGTH
        )
      )
    );

  const triangles = [];

  for (
    let edgeIndex = 0;
    edgeIndex < startPoints.length;
    edgeIndex += 1
  ) {
    const nextEdgeIndex =
      (edgeIndex + 1) %
      startPoints.length;

    triangles.push(
      ...triangulateBoundaryPolygon(
        [
          startPoints[edgeIndex],
          startPoints[nextEdgeIndex],
          endPoints[nextEdgeIndex],
          endPoints[edgeIndex],
        ],
        `${id}-wall-${edgeIndex}`,
        {
          boundaryClearance: true,
          boundaryClearanceId: id,
        }
      )
    );
  }

  return {
    id,
    direction,
    startCenter:
      averageWorldPoint(startPoints),
    endCenter:
      averageWorldPoint(endPoints),
    startPoints,
    endPoints,
    triangles,
    triangleRecords:
      triangles.map((triangle) => ({
        triangle,
        bounds:
          bridgeAuditBounds(
            triangle.points
          ),
      })),
    bounds: bridgeAuditBounds([
      ...startPoints,
      ...endPoints,
    ]),
  };
}

function boundaryClearanceWorldMeshPointForPositions(
  positions,
  geometry,
  tetrahedronId,
  modelPoint
) {
  const mesh =
    geometry.meshes[tetrahedronId];

  const vertexIndex =
    mesh.vertices.findIndex(
      (vertex) =>
        pointDistance(
          vertex.point,
          modelPoint
        ) <
        FACE_CONSTRAINT_EPSILON
    );

  return vertexIndex === -1
    ? null
    : positions[tetrahedronId][
        vertexIndex
      ];
}

function boundaryClearanceDirectionsForFacePairs({
  positions,
  pairIds = [],
  facePairMappingTurns = [],
  geometry =
    DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY,
}) {
  const directionListsByBaseId =
    new Map();

  function addDirection(
    cuspBaseId,
    direction
  ) {
    const length = Math.hypot(
      direction.x,
      direction.y,
      direction.z
    );

    if (
      length <=
      BOUNDARY_CLEARANCE_EPSILON
    ) {
      return;
    }

    const directions =
      directionListsByBaseId.get(
        cuspBaseId
      ) ?? [];

    directions.push(
      normalizePoint(direction)
    );

    directionListsByBaseId.set(
      cuspBaseId,
      directions
    );
  }

  pairIds.forEach((pairId) => {
    const settledMapping =
      settledCyclicMappingIndex(
        facePairMappingTurns[pairId] ??
          0
      );

    if (settledMapping === null) {
      return;
    }

    const seamPair =
      geometry.facePairs[pairId];

    const faceA =
      geometry.meshes.A.largeFaces[
        pairId
      ];

    if (!seamPair || !faceA) {
      return;
    }

    const seamFaceA =
      faceA.vertexIndices.map(
        (vertexIndex) =>
          positions.A[vertexIndex]
      );

    const seamFaceCenter =
      averageWorldPoint(seamFaceA);

    const vertexPermutation =
      CYCLIC_FACE_MAPPING_CHOICES[
        settledMapping
      ].vertexPermutation;

    seamPair.A.forEach(
      (vertexA, localVertexIndex) => {
        const sharedEdge =
          cuspSegmentForFace(
            seamPair.A,
            localVertexIndex,
            geometry.truncationFraction
          ).map((modelPoint) =>
            boundaryClearanceWorldMeshPointForPositions(
              positions,
              geometry,
              "A",
              modelPoint
            )
          );

        if (
          sharedEdge.some(
            (point) => point === null
          )
        ) {
          return;
        }

        const direction =
          normalizePoint(
            subtractPoint(
              averageWorldPoint(
                sharedEdge
              ),
              seamFaceCenter
            )
          );

        const vertexB =
          seamPair.B[
            vertexPermutation[
              localVertexIndex
            ]
          ];

        addDirection(
          `A${vertexA}`,
          direction
        );

        addDirection(
          `B${vertexB}`,
          direction
        );
      }
    );
  });

  return new Map(
    [...directionListsByBaseId].map(
      ([cuspBaseId, directions]) => {
        const combinedDirection =
          directions.reduce(
            (sum, direction) =>
              addPoint(
                sum,
                direction
              ),
            { x: 0, y: 0, z: 0 }
          );

        return [
          cuspBaseId,
          normalizePoint(
            combinedDirection
          ),
        ];
      }
    )
  );
}

function boundaryClearanceCorridorsPairwiseClear(
  corridors
) {
  for (
    let firstIndex = 0;
    firstIndex < corridors.length;
    firstIndex += 1
  ) {
    const firstCorridor =
      corridors[firstIndex];

    for (
      let secondIndex =
        firstIndex + 1;
      secondIndex < corridors.length;
      secondIndex += 1
    ) {
      const secondCorridor =
        corridors[secondIndex];

      if (
        firstCorridor.triangles.some(
          (triangle) =>
            boundaryClearanceTriangleHitsCorridor(
              triangle,
              secondCorridor
            )
        )
      ) {
        return false;
      }
    }
  }

  return true;
}

function boundaryClearanceCertifiedDirectionsForPositions({
  positions,
  pairIds = [],
  facePairMappingTurns = [],
  geometry =
    DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY,
}) {
  const preferredDirections =
    boundaryClearanceDirectionsForFacePairs({
      positions,
      pairIds,
      facePairMappingTurns,
      geometry,
    });

  const outwardDirections =
    new Map();

  ["A", "B"].forEach(
    (tetrahedronId) => {
      const bodyCenter =
        averageWorldPoint(
          positions[tetrahedronId]
        );

      VERTICES.forEach(
        (_, vertexIndex) => {
          const cuspFace =
            geometry.meshes[
              tetrahedronId
            ].cuspFaces[vertexIndex];

          const basePoints =
            cuspFace.vertexIndices.map(
              (meshVertexIndex) =>
                positions[
                  tetrahedronId
                ][meshVertexIndex]
            );

          outwardDirections.set(
            `${tetrahedronId}${vertexIndex}`,
            outwardFaceNormal(
              basePoints,
              bodyCenter
            )
          );
        }
      );
    }
  );

  const cellTriangles =
    bridgeAuditTetrahedronTriangles(
      positions
    );

  function directionsAtAmount(amount) {
    return new Map(
      [...outwardDirections].map(
        ([cuspBaseId, outward]) => {
          const preferred =
            preferredDirections.get(
              cuspBaseId
            ) ?? outward;

          const blended =
            lerpPoint(
              preferred,
              outward,
              clampUnit(amount)
            );

          const length = Math.hypot(
            blended.x,
            blended.y,
            blended.z
          );

          return [
            cuspBaseId,
            length >
            BOUNDARY_CLEARANCE_EPSILON
              ? normalizePoint(blended)
              : outward,
          ];
        }
      )
    );
  }

  function configurationAtAmount(
    amount
  ) {
    const directions =
      directionsAtAmount(amount);

    const corridors =
      boundaryClearanceCorridorsForPositions(
        positions,
        geometry,
        directions
      );

    const clear =
      boundaryClearanceTrianglesAreClear(
        cellTriangles,
        corridors
      ) &&
      boundaryClearanceCorridorsPairwiseClear(
        corridors
      );

    return {
      clear,
      directions,
    };
  }

  const preferredConfiguration =
    configurationAtAmount(0);

  if (preferredConfiguration.clear) {
    return preferredConfiguration.directions;
  }

  /*
   * Treat the eight local cusp departures as one boundary system.
   * Every trial advances all eight directions by the same amount
   * from the seam-derived field toward their local outward normals.
   * This removes any A0/A1/... acceptance priority while preserving
   * the seam field as strongly as the embedded boundary permits.
   */
  const commonStepCount = 12;
  let firstClearStep = null;
  let firstClearConfiguration = null;

  for (
    let step = 1;
    step <= commonStepCount;
    step += 1
  ) {
    const amount =
      step / commonStepCount;

    const configuration =
      configurationAtAmount(amount);

    if (configuration.clear) {
      firstClearStep = step;
      firstClearConfiguration =
        configuration;
      break;
    }
  }

  if (
    firstClearConfiguration === null
  ) {
    return outwardDirections;
  }

  let lower =
    (firstClearStep - 1) /
    commonStepCount;
  let upper =
    firstClearStep /
    commonStepCount;
  let best =
    firstClearConfiguration.directions;

  for (
    let refinement = 0;
    refinement < 5;
    refinement += 1
  ) {
    const amount =
      0.5 * (lower + upper);

    const configuration =
      configurationAtAmount(amount);

    if (configuration.clear) {
      upper = amount;
      best = configuration.directions;
    } else {
      lower = amount;
    }
  }

  return best;
}

function boundaryClearanceCorridorsForPositions(
  positions,
  geometry =
    DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY,
  directionByBaseId = null
) {
  return ["A", "B"].flatMap(
    (tetrahedronId) => {
      const bodyCenter =
        averageWorldPoint(
          positions[tetrahedronId]
        );

      return VERTICES.map(
        (_, vertexIndex) => {
          const cuspFace =
            geometry.meshes[
              tetrahedronId
            ].cuspFaces[vertexIndex];

          const basePoints =
            cuspFace.vertexIndices.map(
              (meshVertexIndex) =>
                positions[
                  tetrahedronId
                ][meshVertexIndex]
            );

          const cuspBaseId =
            `${tetrahedronId}${vertexIndex}`;

          return makeBoundaryClearanceCorridor({
            id:
              `boundary-clearance-` +
              cuspBaseId,
            basePoints,
            outwardDirection:
              directionByBaseId?.get(
                cuspBaseId
              ) ??
              outwardFaceNormal(
                basePoints,
                bodyCenter
              ),
          });
        }
      );
    }
  );
}

function boundaryClearanceTriangleHitsCorridor(
  triangle,
  corridor
) {
  if (
    triangle.boundaryClearanceAllowedIds
      ?.includes(corridor.id)
  ) {
    return false;
  }

  const triangleBounds =
    bridgeAuditBounds(
      triangle.points
    );

  if (
    !bridgeAuditBoundsOverlap(
      triangleBounds,
      corridor.bounds
    )
  ) {
    return false;
  }

  for (
    const corridorRecord of
    corridor.triangleRecords
  ) {
    if (
      !bridgeAuditBoundsOverlap(
        triangleBounds,
        corridorRecord.bounds
      ) ||
      bridgeAuditSharesPoint(
        triangle.points,
        corridorRecord
          .triangle.points
      )
    ) {
      continue;
    }

    if (
      bridgeAuditTrianglesIntersect(
        triangle.points,
        corridorRecord
          .triangle.points
      )
    ) {
      return true;
    }
  }

  return false;
}

function boundaryClearanceTrianglesAreClear(
  triangles,
  corridors
) {
  return triangles.every(
    (triangle) =>
      corridors.every(
        (corridor) =>
          !boundaryClearanceTriangleHitsCorridor(
            triangle,
            corridor
          )
      )
  );
}

function boundaryClearanceTranslateSurfaceOutsideCorridors(
  points,
  corridors,
  surfaceId = "boundary-surface",
  allowedCorridorIds = []
) {
  let translated =
    points.map(clonePoint);

  for (
    let iteration = 0;
    iteration < 16;
    iteration += 1
  ) {
    const triangles =
      triangulateBoundaryPolygon(
        translated,
        `${surfaceId}-clearance-${iteration}`,
        {
          boundaryClearanceAllowedIds:
            allowedCorridorIds,
        }
      );

    const blockingCorridors =
      corridors.filter((corridor) =>
        triangles.some((triangle) =>
          boundaryClearanceTriangleHitsCorridor(
            triangle,
            corridor
          )
        )
      );

    if (blockingCorridors.length === 0) {
      return translated;
    }

    const center =
      averageWorldPoint(translated);

    let correction = {
      x: 0,
      y: 0,
      z: 0,
    };

    blockingCorridors.forEach(
      (corridor) => {
        const axisOffset =
          subtractPoint(
            center,
            corridor.startCenter
          );

        const corridorLength =
          pointDistance(
            corridor.startCenter,
            corridor.endCenter
          );

        const axial = Math.max(
          0,
          Math.min(
            corridorLength,
            dotPoint(
              axisOffset,
              corridor.direction
            )
          )
        );

        const axisPoint =
          addPoint(
            corridor.startCenter,
            multiplyPoint(
              corridor.direction,
              axial
            )
          );

        let away =
          subtractPoint(
            center,
            axisPoint
          );

        away =
          subtractPoint(
            away,
            multiplyPoint(
              corridor.direction,
              dotPoint(
                away,
                corridor.direction
              )
            )
          );

        if (
          Math.hypot(
            away.x,
            away.y,
            away.z
          ) <
          BOUNDARY_CLEARANCE_EPSILON
        ) {
          const primary =
            crossPoint(
              corridor.direction,
              { x: 0, y: 1, z: 0 }
            );

          away =
            Math.hypot(
              primary.x,
              primary.y,
              primary.z
            ) >
            BOUNDARY_CLEARANCE_EPSILON
              ? primary
              : crossPoint(
                  corridor.direction,
                  { x: 1, y: 0, z: 0 }
                );
        }

        correction =
          addPoint(
            correction,
            multiplyPoint(
              normalizePoint(away),
              BOUNDARY_CLEARANCE_MARGIN *
                1.25
            )
          );
      }
    );

    const correctionLength =
      Math.hypot(
        correction.x,
        correction.y,
        correction.z
      );

    if (
      correctionLength <
      BOUNDARY_CLEARANCE_EPSILON
    ) {
      break;
    }

    const step =
      multiplyPoint(
        correction,
        1 /
          blockingCorridors.length
      );

    translated =
      translated.map((point) =>
        addPoint(point, step)
      );
  }

  return translated;
}

function boundaryClearanceRouteTriangles(
  rings,
  surfaceId,
  {
    startAllowedCorridorIds = [],
    endAllowedCorridorIds = [],
  } = {}
) {
  if (
    rings.length < 2 ||
    rings[0]?.length < 3
  ) {
    return [];
  }

  const triangles = [];
  const perimeterCount =
    rings[0].length;

  for (
    let ringIndex = 0;
    ringIndex < rings.length - 1;
    ringIndex += 1
  ) {
    for (
      let perimeterIndex = 0;
      perimeterIndex < perimeterCount;
      perimeterIndex += 1
    ) {
      const nextPerimeterIndex =
        (perimeterIndex + 1) %
        perimeterCount;

      triangles.push(
        ...triangulateBoundaryPolygon(
          [
            rings[ringIndex][perimeterIndex],
            rings[ringIndex][nextPerimeterIndex],
            rings[ringIndex + 1][nextPerimeterIndex],
            rings[ringIndex + 1][perimeterIndex],
          ],
          `${surfaceId}-${ringIndex}-${perimeterIndex}`,
          {
            boundaryClearance: true,
            segmentIndex: ringIndex,
            boundaryClearanceAllowedIds: [
              ...(
                ringIndex === 0
                  ? startAllowedCorridorIds
                  : []
              ),
              ...(
                ringIndex ===
                  rings.length - 2
                  ? endAllowedCorridorIds
                  : []
              ),
            ],
          }
        )
      );
    }
  }

  return triangles;
}

function boundaryClearanceRouteCollisionCount(
  rings,
  corridors,
  surfaceId,
  attachmentOptions = {}
) {
  const triangles =
    boundaryClearanceRouteTriangles(
      rings,
      surfaceId,
      attachmentOptions
    );

  let collisionCount = 0;

  triangles.forEach((triangle) => {
    corridors.forEach((corridor) => {
      if (
        boundaryClearanceTriangleHitsCorridor(
          triangle,
          corridor
        )
      ) {
        collisionCount += 1;
      }
    });
  });

  return collisionCount;
}

function boundaryClearanceRouteRings(
  rings,
  corridors,
  surfaceId,
  attachmentOptions = {}
) {
  const clonedRings =
    rings.map((ring) =>
      ring.map(clonePoint)
    );

  if (
    corridors.length === 0 ||
    clonedRings.length < 3
  ) {
    return clonedRings;
  }

  const rawCollisionCount =
    boundaryClearanceRouteCollisionCount(
      clonedRings,
      corridors,
      `${surfaceId}-raw`,
      attachmentOptions
    );

  if (rawCollisionCount === 0) {
    return clonedRings;
  }

  const startCenter =
    averageWorldPoint(
      clonedRings[0]
    );

  const endCenter =
    averageWorldPoint(
      clonedRings[
        clonedRings.length - 1
      ]
    );

  const routeDirection =
    normalizePoint(
      subtractPoint(
        endCenter,
        startCenter
      )
    );

  const primaryPerpendicular =
    crossPoint(
      routeDirection,
      { x: 0, y: 1, z: 0 }
    );

  const firstPerpendicular =
    normalizePoint(
      Math.hypot(
        primaryPerpendicular.x,
        primaryPerpendicular.y,
        primaryPerpendicular.z
      ) >
        BOUNDARY_CLEARANCE_EPSILON
        ? primaryPerpendicular
        : crossPoint(
            routeDirection,
            { x: 1, y: 0, z: 0 }
          )
    );

  const secondPerpendicular =
    normalizePoint(
      crossPoint(
        routeDirection,
        firstPerpendicular
      )
    );

  const rawTriangles =
    boundaryClearanceRouteTriangles(
      clonedRings,
      `${surfaceId}-blocking`,
      attachmentOptions
    );

  const blockingCorridors =
    corridors.filter((corridor) =>
      rawTriangles.some((triangle) =>
        boundaryClearanceTriangleHitsCorridor(
          triangle,
          corridor
        )
      )
    );

  const routeCenter =
    averageWorldPoint(
      clonedRings.flat()
    );

  function awayFromCorridors(
    referenceCenter,
    selectedCorridors
  ) {
    return selectedCorridors.reduce(
      (sum, corridor) => {
        const corridorOffset =
          subtractPoint(
            referenceCenter,
            corridor.startCenter
          );

        const corridorLength =
          pointDistance(
            corridor.startCenter,
            corridor.endCenter
          );

        const axial = Math.max(
          0,
          Math.min(
            corridorLength,
            dotPoint(
              corridorOffset,
              corridor.direction
            )
          )
        );

        const axisPoint =
          addPoint(
            corridor.startCenter,
            multiplyPoint(
              corridor.direction,
              axial
            )
          );

        const away =
          subtractPoint(
            referenceCenter,
            axisPoint
          );

        return Math.hypot(
          away.x,
          away.y,
          away.z
        ) >
        BOUNDARY_CLEARANCE_EPSILON
          ? addPoint(
              sum,
              normalizePoint(away)
            )
          : sum;
      },
      { x: 0, y: 0, z: 0 }
    );
  }

  const lastRouteSegmentIndex =
    clonedRings.length - 2;

  const startBlockingCorridors =
    blockingCorridors.filter(
      (corridor) =>
        rawTriangles.some(
          (triangle) =>
            triangle.segmentIndex === 0 &&
            boundaryClearanceTriangleHitsCorridor(
              triangle,
              corridor
            )
        )
    );

  const endBlockingCorridors =
    blockingCorridors.filter(
      (corridor) =>
        rawTriangles.some(
          (triangle) =>
            triangle.segmentIndex ===
              lastRouteSegmentIndex &&
            boundaryClearanceTriangleHitsCorridor(
              triangle,
              corridor
            )
        )
    );

  const collisionAway =
    awayFromCorridors(
      routeCenter,
      blockingCorridors
    );

  const startCollisionAway =
    awayFromCorridors(
      startCenter,
      startBlockingCorridors
    );

  const endCollisionAway =
    awayFromCorridors(
      endCenter,
      endBlockingCorridors
    );

  const candidateDirections = [];

  function addCandidateDirection(
    direction
  ) {
    const length = Math.hypot(
      direction.x,
      direction.y,
      direction.z
    );

    if (
      length <=
      BOUNDARY_CLEARANCE_EPSILON
    ) {
      return;
    }

    const normalized =
      normalizePoint(direction);

    if (
      candidateDirections.some(
        (candidate) =>
          dotPoint(
            candidate,
            normalized
          ) > 0.995
      )
    ) {
      return;
    }

    candidateDirections.push(
      normalized
    );
  }

  addCandidateDirection(collisionAway);
  addCandidateDirection(
    multiplyPoint(collisionAway, -1)
  );
  addCandidateDirection(startCollisionAway);
  addCandidateDirection(
    multiplyPoint(
      startCollisionAway,
      -1
    )
  );
  addCandidateDirection(endCollisionAway);
  addCandidateDirection(
    multiplyPoint(
      endCollisionAway,
      -1
    )
  );
  addCandidateDirection(firstPerpendicular);
  addCandidateDirection(
    multiplyPoint(
      firstPerpendicular,
      -1
    )
  );
  addCandidateDirection(secondPerpendicular);
  addCandidateDirection(
    multiplyPoint(
      secondPerpendicular,
      -1
    )
  );
  addCandidateDirection(
    addPoint(
      firstPerpendicular,
      secondPerpendicular
    )
  );
  addCandidateDirection(
    subtractPoint(
      firstPerpendicular,
      secondPerpendicular
    )
  );
  addCandidateDirection(
    addPoint(
      collisionAway,
      firstPerpendicular
    )
  );
  addCandidateDirection(
    subtractPoint(
      collisionAway,
      firstPerpendicular
    )
  );
  addCandidateDirection(
    addPoint(
      collisionAway,
      secondPerpendicular
    )
  );
  addCandidateDirection(
    subtractPoint(
      collisionAway,
      secondPerpendicular
    )
  );
  addCandidateDirection(
    addPoint(
      startCollisionAway,
      firstPerpendicular
    )
  );
  addCandidateDirection(
    addPoint(
      startCollisionAway,
      secondPerpendicular
    )
  );
  addCandidateDirection(
    addPoint(
      endCollisionAway,
      firstPerpendicular
    )
  );
  addCandidateDirection(
    addPoint(
      endCollisionAway,
      secondPerpendicular
    )
  );

  const bendProfiles = [
    (amount) =>
      Math.sin(Math.PI * amount),
    (amount) =>
      Math.sin(
        Math.PI * Math.sqrt(amount)
      ),
    (amount) =>
      Math.sin(
        Math.PI *
          (
            1 -
            Math.sqrt(1 - amount)
          )
      ),
  ];

  let bestRings = clonedRings;
  let bestCollisionCount =
    rawCollisionCount;

  for (
    let amplitudeStep = 1;
    amplitudeStep <= 12;
    amplitudeStep += 1
  ) {
    const amplitude =
      BOUNDARY_CLEARANCE_MARGIN *
      1.35 *
      amplitudeStep;

    for (
      const direction of
      candidateDirections
    ) {
      for (const bendProfile of bendProfiles) {
        const candidateRings =
          clonedRings.map(
            (ring, ringIndex) => {
              if (
                ringIndex === 0 ||
                ringIndex ===
                  clonedRings.length - 1
              ) {
                return ring.map(clonePoint);
              }

              const amount =
                ringIndex /
                (clonedRings.length - 1);

              const offset =
                multiplyPoint(
                  direction,
                  amplitude *
                    bendProfile(amount)
                );

              return ring.map((point) =>
                addPoint(point, offset)
              );
            }
          );

        const collisionCount =
          boundaryClearanceRouteCollisionCount(
            candidateRings,
            corridors,
            `${surfaceId}-candidate`,
            attachmentOptions
          );

        if (
          collisionCount <
          bestCollisionCount
        ) {
          bestCollisionCount =
            collisionCount;
          bestRings = candidateRings;
        }

        if (collisionCount === 0) {
          return candidateRings;
        }
      }
    }
  }

  return bestRings;
}

function boundaryClearanceReleasedTriangles(
  releasedModels
) {
  return releasedModels.flatMap(
    (model) => {
      const triangles =
        model.collarFaces.flatMap(
          (face) =>
            triangulateBoundaryPolygon(
              face.points,
              face.key,
              {
                releasedIdentification: true,
                releasedPairId:
                  model.pairId,
                boundaryClearanceAllowedIds:
                  face.boundaryClearanceAllowedIds ??
                  [],
              }
            )
        );

      if (
        model.strength <
        FACE_VALIDITY_FULL_STRENGTH
      ) {
        triangles.push(
          ...triangulateBoundaryPolygon(
            model.releasedA,
            `released-${model.pairId}-moving-A`,
            {
              releasedIdentification: true,
              releasedPairId:
                model.pairId,
              boundaryClearanceAllowedIds:
                model.boundaryClearanceSharedIds ??
                [],
            }
          ),
          ...triangulateBoundaryPolygon(
            model.releasedB,
            `released-${model.pairId}-moving-B`,
            {
              releasedIdentification: true,
              releasedPairId:
                model.pairId,
              boundaryClearanceAllowedIds:
                model.boundaryClearanceSharedIds ??
                [],
            }
          )
        );
      } else {
        triangles.push(
          ...triangulateBoundaryPolygon(
            model.sharedFace,
            `released-${model.pairId}-shared`,
            {
              releasedIdentification: true,
              releasedPairId:
                model.pairId,
              boundaryClearanceAllowedIds:
                model.boundaryClearanceSharedIds ??
                [],
            }
          )
        );
      }

      return triangles;
    }
  );
}

function boundaryClearanceGeometryIsClear({
  positions,
  geometry =
    DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY,
  releasedModels = [],
}) {
  const corridors =
    boundaryClearanceCorridorsForPositions(
      positions,
      geometry
    );

  const cellTriangles =
    bridgeAuditTetrahedronTriangles(
      positions
    );

  if (
    !boundaryClearanceTrianglesAreClear(
      cellTriangles,
      corridors
    )
  ) {
    return false;
  }

  const releasedTriangles =
    boundaryClearanceReleasedTriangles(
      releasedModels
    );

  return boundaryClearanceTrianglesAreClear(
    releasedTriangles,
    corridors
  );
}

function projectReleasedHardIdentification({
  positions,
  pairId,
  mappingTurn = 0,
  geometry =
    DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY,
}) {
  const mappingIndex =
    settledCyclicMappingIndex(
      mappingTurn
    );

  if (mappingIndex === null) {
    return;
  }

  facePairVertexCorrespondence(
    pairId,
    mappingIndex,
    geometry
  ).vertexPairs.forEach(
    (vertexPair) => {
      const pointA =
        positions.A[
          vertexPair.vertexAIndex
        ];

      const pointB =
        positions.B[
          vertexPair.vertexBIndex
        ];

      const midpoint =
        lerpPoint(
          pointA,
          pointB,
          0.5
        );

      pointA.x = midpoint.x;
      pointA.y = midpoint.y;
      pointA.z = midpoint.z;

      pointB.x = midpoint.x;
      pointB.y = midpoint.y;
      pointB.z = midpoint.z;
    }
  );
}

function releasedFaceFixedSharedTarget({
  positions,
  pairId,
  mappingTurn = 0,
  boundaryClearanceCorridors = [],
  geometry =
    DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY,
}) {
  const correspondence =
    facePairVertexCorrespondence(
      pairId,
      0,
      geometry
    );

  const baseA =
    correspondence.vertexPairs.map(
      (vertexPair) =>
        clonePoint(
          positions.A[
            vertexPair.vertexAIndex
          ]
        )
    );

  const baseB =
    releasedFacePairMappedBPoints(
      positions,
      pairId,
      mappingTurn,
      geometry
    );

  const sharedFace =
    releasedFaceSharedTarget({
      positions,
      baseA,
      baseB,
      pinned: false,
    }).sharedFace.map(clonePoint);

  return boundaryClearanceTranslateSurfaceOutsideCorridors(
    sharedFace,
    boundaryClearanceCorridors,
    `released-${pairId}-shared-target`,
    releasedFaceBoundaryClearanceAttachments(
      pairId,
      "A",
      geometry
    ).sharedIds
  );
}

function relaxReleasedFaceCellComplex({
  positions: anchorPositions,
  activePairIds,
  anchorPairId,
  collapseStrengths,
  facePairMappingTurns = [],
  geometry =
    DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY,
}) {
  const seed =
    cloneWorldPositions(anchorPositions);

  const sharedFaceByPairId =
    geometry.facePairs.map(
      () => null
    );

  const releasedPairIds =
    activePairIds.filter(
      (pairId) =>
        pairId !== anchorPairId &&
        (
          collapseStrengths[pairId] ?? 0
        ) > FACE_CONSTRAINT_EPSILON
    );

  const reservedBoundaryDirections =
    boundaryClearanceCertifiedDirectionsForPositions({
      positions: seed,
      pairIds: activePairIds,
      facePairMappingTurns,
      geometry,
    });

  const reservedBoundaryCorridors =
    boundaryClearanceCorridorsForPositions(
      seed,
      geometry,
      reservedBoundaryDirections
    );

  releasedPairIds.forEach(
    (pairId) => {
      sharedFaceByPairId[pairId] =
        releasedFaceFixedSharedTarget({
          positions: seed,
          pairId,
          mappingTurn:
            facePairMappingTurns[
              pairId
            ] ?? 0,
          boundaryClearanceCorridors:
            reservedBoundaryCorridors,
          geometry,
        });
    }
  );

  const anchorMappingSettled =
    anchorPairId === null ||
    settledCyclicMappingIndex(
      facePairMappingTurns[
        anchorPairId
      ] ?? 0
    ) !== null;

  if (
    releasedPairIds.length === 0 ||
    !anchorMappingSettled
  ) {
    return {
      positions: seed,
      sharedFaceByPairId,
    };
  }

  function releasedBoundaryClearanceConstraint(
    candidatePositions
  ) {
    const boundaryClearanceCorridors =
      boundaryClearanceCorridorsForPositions(
        candidatePositions,
        geometry,
        reservedBoundaryDirections
      );

    const cellTriangles =
      bridgeAuditTetrahedronTriangles(
        candidatePositions
      );

    if (
      !boundaryClearanceTrianglesAreClear(
        cellTriangles,
        boundaryClearanceCorridors
      )
    ) {
      return false;
    }

    const sharedFaceTriangles =
      releasedPairIds.flatMap(
        (pairId) => {
          const sharedFace =
            sharedFaceByPairId[pairId];

          return Array.isArray(
            sharedFace
          )
            ? triangulateBoundaryPolygon(
                sharedFace,
                `released-${pairId}-shared-clearance`,
                {
                  boundaryClearanceAllowedIds:
                    releasedFaceBoundaryClearanceAttachments(
                      pairId,
                      "A",
                      geometry
                    ).sharedIds,
                }
              )
            : [];
        }
      );

    return boundaryClearanceTrianglesAreClear(
      sharedFaceTriangles,
      boundaryClearanceCorridors
    );
  }

  const positions =
    cloneWorldPositions(seed);

  const targetCenter =
    averageWorldPoint(
      allWorldPoints(seed)
    );

  if (anchorPairId !== null) {
    projectReleasedHardIdentification({
      positions,
      pairId: anchorPairId,
      mappingTurn:
        facePairMappingTurns[
          anchorPairId
        ] ?? 0,
      geometry,
    });
  }

  for (
    let iteration = 0;
    iteration <
      RELEASED_CELL_RELAX_ITERATIONS;
    iteration += 1
  ) {
    const iterationStart =
      cloneWorldPositions(positions);

    const displacements = {
      A: positions.A.map(() => ({
        x: 0, y: 0, z: 0, weight: 0,
      })),
      B: positions.B.map(() => ({
        x: 0, y: 0, z: 0, weight: 0,
      })),
    };

    releasedPairIds.forEach(
      (pairId) => {
        const mappingIndex =
          settledCyclicMappingIndex(
            facePairMappingTurns[
              pairId
            ] ?? 0
          );

        const sharedFace =
          sharedFaceByPairId[pairId];

        if (
          mappingIndex === null ||
          !Array.isArray(sharedFace)
        ) {
          return;
        }

        const strength =
          clampUnit(
            collapseStrengths[
              pairId
            ] ?? 0
          );

        const correspondence =
          facePairVertexCorrespondence(
            pairId,
            mappingIndex,
            geometry
          );

        correspondence.vertexPairs.forEach(
          (vertexPair, index) => {
            const desiredA =
              lerpPoint(
                seed.A[
                  vertexPair.vertexAIndex
                ],
                sharedFace[index],
                RELEASED_CELL_PULL_FRACTION *
                  strength
              );

            const desiredB =
              lerpPoint(
                seed.B[
                  vertexPair.vertexBIndex
                ],
                sharedFace[index],
                RELEASED_CELL_PULL_FRACTION *
                  strength
              );

            [
              [
                "A",
                vertexPair.vertexAIndex,
                desiredA,
              ],
              [
                "B",
                vertexPair.vertexBIndex,
                desiredB,
              ],
            ].forEach(
              ([
                cellId,
                vertexIndex,
                desiredPoint,
              ]) => {
                const point =
                  positions[cellId][
                    vertexIndex
                  ];

                const delta =
                  subtractPoint(
                    desiredPoint,
                    point
                  );

                const length =
                  Math.hypot(
                    delta.x,
                    delta.y,
                    delta.z
                  );

                const stepScale =
                  length >
                  RELEASED_CELL_MAX_VERTEX_STEP
                    ? RELEASED_CELL_MAX_VERTEX_STEP /
                      length
                    : 1;

                const displacement =
                  displacements[cellId][
                    vertexIndex
                  ];

                displacement.x +=
                  delta.x * stepScale;
                displacement.y +=
                  delta.y * stepScale;
                displacement.z +=
                  delta.z * stepScale;
                displacement.weight += 1;
              }
            );
          }
        );
      }
    );

    ["A", "B"].forEach(
      (cellId) => {
        positions[cellId].forEach(
          (point, vertexIndex) => {
            const displacement =
              displacements[cellId][
                vertexIndex
              ];

            if (displacement.weight <= 0) {
              return;
            }

            const scale =
              RELEASED_CELL_PULL_STIFFNESS /
              displacement.weight;

            point.x +=
              displacement.x * scale;
            point.y +=
              displacement.y * scale;
            point.z +=
              displacement.z * scale;
          }
        );
      }
    );

    projectShapeConstraints(
      positions,
      RELEASED_CELL_SHAPE_STIFFNESS,
      geometry.faceShapeConstraints
    );

    if (anchorPairId !== null) {
      projectReleasedHardIdentification({
        positions,
        pairId: anchorPairId,
        mappingTurn:
          facePairMappingTurns[
            anchorPairId
          ] ?? 0,
        geometry,
      });
    }

    projectShapeConstraints(
      positions,
      RELEASED_CELL_SHAPE_STIFFNESS *
        0.5,
      geometry.faceShapeConstraints
    );

    if (anchorPairId !== null) {
      projectReleasedHardIdentification({
        positions,
        pairId: anchorPairId,
        mappingTurn:
          facePairMappingTurns[
            anchorPairId
          ] ?? 0,
        geometry,
      });
    }

    recenterWorldPositions(
      positions,
      targetCenter
    );

    const admissible =
      admissibleCollapsedCoreSurfaceStep(
        iterationStart,
        positions,
        activePairIds,
        geometry,
        releasedBoundaryClearanceConstraint
      );

    positions.A = admissible.A;
    positions.B = admissible.B;

    if (anchorPairId !== null) {
      projectReleasedHardIdentification({
        positions,
        pairId: anchorPairId,
        mappingTurn:
          facePairMappingTurns[
            anchorPairId
          ] ?? 0,
        geometry,
      });
    }

    if (
      maximumPositionDisplacement(
        iterationStart,
        positions
      ) <= FACE_CONSTRAINT_EPSILON
    ) {
      break;
    }
  }

  const certifiedPositions =
    admissibleCollapsedCoreSurfaceStep(
      seed,
      positions,
      activePairIds,
      geometry,
      releasedBoundaryClearanceConstraint
    );

  if (anchorPairId !== null) {
    projectReleasedHardIdentification({
      positions: certifiedPositions,
      pairId: anchorPairId,
      mappingTurn:
        facePairMappingTurns[
          anchorPairId
        ] ?? 0,
      geometry,
    });
  }

  return {
    positions: certifiedPositions,
    sharedFaceByPairId,
  };
}

function createQuotientDisjointSet(
  size
) {
  const parent =
    Array.from(
      { length: size },
      (_, index) => index
    );

  const rank =
    Array.from(
      { length: size },
      () => 0
    );

  function find(index) {
    let current = index;

    while (
      parent[current] !==
      current
    ) {
      parent[current] =
        parent[
          parent[current]
        ];

      current =
        parent[current];
    }

    return current;
  }

  function union(first, second) {
    const firstRoot =
      find(first);

    const secondRoot =
      find(second);

    if (
      firstRoot ===
      secondRoot
    ) {
      return;
    }

    if (
      rank[firstRoot] <
      rank[secondRoot]
    ) {
      parent[firstRoot] =
        secondRoot;
      return;
    }

    if (
      rank[firstRoot] >
      rank[secondRoot]
    ) {
      parent[secondRoot] =
        firstRoot;
      return;
    }

    parent[secondRoot] =
      firstRoot;

    rank[firstRoot] += 1;
  }

  function canonicalClasses() {
    const classByRoot =
      new Map();

    const membersByClass = [];

    const classByIndex =
      parent.map((_, index) => {
        const root = find(index);

        if (
          !classByRoot.has(root)
        ) {
          classByRoot.set(
            root,
            classByRoot.size
          );

          membersByClass.push([]);
        }

        const classIndex =
          classByRoot.get(root);

        membersByClass[
          classIndex
        ].push(index);

        return classIndex;
      });

    return {
      classByIndex,
      membersByClass,
    };
  }

  return {
    find,
    union,
    canonicalClasses,
  };
}

function truncatedBoundaryEdgeIndex(
  tetrahedronId,
  firstVertexIndex,
  secondVertexIndex,
  geometry =
    DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY
) {
  const edgeIndex =
    geometry.edgeIndexByVertexKey[
      tetrahedronId
    ].get(
      meshEdgeKey(
        firstVertexIndex,
        secondVertexIndex
      )
    );

  if (edgeIndex === undefined) {
    throw new Error(
      `Missing ${tetrahedronId} boundary edge ` +
      `${firstVertexIndex}:${secondVertexIndex}`
    );
  }

  return edgeIndex;
}

function largeFaceBoundaryEdgeIndices(
  tetrahedronId,
  pairId,
  geometry =
    DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY
) {
  const face =
    geometry.meshes[
      tetrahedronId
    ].largeFaces[pairId];

  return face.vertexIndices.map(
    (firstVertexIndex, index) =>
      truncatedBoundaryEdgeIndex(
        tetrahedronId,
        firstVertexIndex,
        face.vertexIndices[
          (
            index + 1
          ) %
          face.vertexIndices.length
        ],
        geometry
      )
  );
}

function describeGlobalQuotientEdge(
  globalEdgeIndex,
  geometry =
    DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY
) {
  const edgeCountA =
    geometry.meshes.A.edges.length;

  const tetrahedronId =
    globalEdgeIndex < edgeCountA
      ? "A"
      : "B";

  const edgeIndex =
    tetrahedronId === "A"
      ? globalEdgeIndex
      : globalEdgeIndex -
        edgeCountA;

  const edge =
    geometry.meshes[
      tetrahedronId
    ].edges[edgeIndex];

  return {
    tetrahedronId,
    edgeIndex,
    edgeId: edge.id,
    vertexIndices: [
      ...edge.vertexIndices,
    ],
    restLength: edge.restLength,
  };
}

function buildFaceIdentificationQuotient({
  identifiedPairIds,
  facePairMappingTurns,
  pairStrengths = null,
  geometry =
    DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY,
}) {
  const vertexCountA =
    geometry.meshes.A.vertices.length;

  const edgeCountA =
    geometry.meshes.A.edges.length;

  const vertexClasses =
    createQuotientDisjointSet(
      vertexCountA +
      geometry.meshes.B.vertices.length
    );

  const edgeClasses =
    createQuotientDisjointSet(
      edgeCountA +
      geometry.meshes.B.edges.length
    );

  const settledMappings = {};

  for (
    const pairId of
      identifiedPairIds
  ) {
    if (
      pairStrengths !== null &&
      (
        pairStrengths[pairId] ?? 0
      ) <
      FACE_LOCK_THRESHOLD
    ) {
      return {
        settled: false,
        status:
          "identification-transition",
        identifiedPairIds: [
          ...identifiedPairIds,
        ],
      };
    }

    const mappingIndex =
      settledCyclicMappingIndex(
        facePairMappingTurns[
          pairId
        ] ?? 0
      );

    if (mappingIndex === null) {
      return {
        settled: false,
        status:
          "mapping-transition",
        identifiedPairIds: [
          ...identifiedPairIds,
        ],
      };
    }

    settledMappings[pairId] =
      mappingIndex;

    const correspondence =
      facePairVertexCorrespondence(
        pairId,
        mappingIndex,
        geometry
      );

    correspondence.vertexPairs.forEach(
      (vertexPair) => {
        vertexClasses.union(
          vertexPair.vertexAIndex,
          vertexCountA +
            vertexPair.vertexBIndex
        );
      }
    );

    const faceA =
      geometry.meshes.A.largeFaces[
        pairId
      ];

    correspondence.vertexPairs.forEach(
      (vertexPair, index) => {
        const nextVertexPair =
          correspondence.vertexPairs[
            (
              index + 1
            ) %
            correspondence
              .vertexPairs.length
          ];

        const edgeAIndex =
          truncatedBoundaryEdgeIndex(
            "A",
            faceA.vertexIndices[index],
            faceA.vertexIndices[
              (
                index + 1
              ) %
              faceA.vertexIndices.length
            ],
            geometry
          );

        const edgeBIndex =
          truncatedBoundaryEdgeIndex(
            "B",
            vertexPair.vertexBIndex,
            nextVertexPair
              .vertexBIndex,
            geometry
          );

        edgeClasses.union(
          edgeAIndex,
          edgeCountA +
            edgeBIndex
        );
      }
    );
  }

  const vertexQuotient =
    vertexClasses.canonicalClasses();

  const edgeQuotient =
    edgeClasses.canonicalClasses();

  return {
    settled: true,
    status: "settled",
    identifiedPairIds: [
      ...identifiedPairIds,
    ],
    settledMappings,
    vertexClassByGlobalIndex:
      vertexQuotient.classByIndex,
    vertexMembersByClass:
      vertexQuotient.membersByClass,
    edgeClassByGlobalIndex:
      edgeQuotient.classByIndex,
    edgeMembersByClass:
      edgeQuotient.membersByClass,
  };
}

function classifyBridgeFaceAdjacency({
  pairId,
  priorPairIds,
  facePairMappingTurns,
  pairStrengths = null,
  geometry =
    DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY,
}) {
  const quotient =
    buildFaceIdentificationQuotient({
      identifiedPairIds:
        priorPairIds,
      facePairMappingTurns,
      pairStrengths,
      geometry,
    });

  if (!quotient.settled) {
    return {
      settled: false,
      status: quotient.status,
      type: "pending",
      pairId,
      priorPairIds: [
        ...priorPairIds,
      ],
      sharedQuotientEdgeClassCount: 0,
      sharedQuotientEdgeClasses: [],
    };
  }

  const edgeCountA =
    geometry.meshes.A.edges.length;

  const faceAEdgeClasses =
    largeFaceBoundaryEdgeIndices(
      "A",
      pairId,
      geometry
    ).map(
      (edgeIndex) =>
        quotient
          .edgeClassByGlobalIndex[
            edgeIndex
          ]
    );

  const faceBEdgeClasses =
    largeFaceBoundaryEdgeIndices(
      "B",
      pairId,
      geometry
    ).map(
      (edgeIndex) =>
        quotient
          .edgeClassByGlobalIndex[
            edgeCountA +
            edgeIndex
          ]
    );

  const faceBClassSet =
    new Set(
      faceBEdgeClasses
    );

  const sharedClassIndices =
    [
      ...new Set(
        faceAEdgeClasses.filter(
          (classIndex) =>
            faceBClassSet.has(
              classIndex
            )
        )
      ),
    ];

  const sharedQuotientEdgeClasses =
    sharedClassIndices.map(
      (classIndex) => ({
        classIndex,
        members:
          quotient
            .edgeMembersByClass[
              classIndex
            ].map(
              (globalEdgeIndex) =>
                describeGlobalQuotientEdge(
                  globalEdgeIndex,
                  geometry
                )
            ),
      })
    );

  return {
    settled: true,
    status: "settled",
    type:
      sharedClassIndices.length > 0
        ? "edge-adjacent"
        : "nonadjacent",
    pairId,
    priorPairIds: [
      ...priorPairIds,
    ],
    settledMappings:
      quotient.settledMappings,
    faceAEdgeClasses,
    faceBEdgeClasses,
    sharedQuotientEdgeClassCount:
      sharedClassIndices.length,
    sharedQuotientEdgeClasses,
  };
}

function bridgeAttachmentGeometry({
  positions,
  pairId,
  mappingIndex,
  geometry =
    DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY,
}) {
  const faceA =
    faceWorldPointsForPair(
      positions,
      "A",
      pairId,
      geometry
    );

  const faceB =
    faceWorldPointsForPair(
      positions,
      "B",
      pairId,
      geometry
    );

  const centerA =
    averageWorldPoint(faceA);

  const centerB =
    averageWorldPoint(faceB);

  const outwardA =
    outwardFaceNormal(
      faceA,
      averageWorldPoint(
        positions.A
      )
    );

  const outwardB =
    outwardFaceNormal(
      faceB,
      averageWorldPoint(
        positions.B
      )
    );

  const attachmentCosine =
    Math.max(
      -1,
      Math.min(
        1,
        dotPoint(
          outwardA,
          multiplyPoint(
            outwardB,
            -1
          )
        )
      )
    );

  const normalizedMapping =
    normalizeCyclicMappingIndex(
      mappingIndex
    );

  return {
    faceCenterDistance:
      pointDistance(
        centerA,
        centerB
      ),
    attachmentNormalAngle:
      Math.acos(
        attachmentCosine
      ),
    mappingTwist:
      normalizedMapping *
      2 *
      Math.PI /
      CYCLIC_FACE_MAPPING_CHOICES.length,
    mappingIndex:
      normalizedMapping,
  };
}

function meshFacePoints(
  mesh,
  face
) {
  return face.vertexIndices.map(
    (vertexIndex) =>
      mesh.vertices[
        vertexIndex
      ].point
  );
}

function averagePoint(points) {
  return points.reduce(
    (sum, point) => ({
      x: sum.x + point.x / points.length,
      y: sum.y + point.y / points.length,
      z: sum.z + point.z / points.length,
    }),
    { x: 0, y: 0, z: 0 }
  );
}

function boundingCenter(points) {
  if (points.length === 0) {
    return { x: 0, y: 0, z: 0 };
  }

  const bounds = points.reduce(
    (current, point) => ({
      minX: Math.min(current.minX, point.x),
      maxX: Math.max(current.maxX, point.x),
      minY: Math.min(current.minY, point.y),
      maxY: Math.max(current.maxY, point.y),
      minZ: Math.min(current.minZ, point.z),
      maxZ: Math.max(current.maxZ, point.z),
    }),
    {
      minX: Infinity,
      maxX: -Infinity,
      minY: Infinity,
      maxY: -Infinity,
      minZ: Infinity,
      maxZ: -Infinity,
    }
  );

  return {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
    z: (bounds.minZ + bounds.maxZ) / 2,
  };
}

function subtractPoint(a, b) {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z,
  };
}

function addPoint(a, b) {
  return {
    x: a.x + b.x,
    y: a.y + b.y,
    z: a.z + b.z,
  };
}

function multiplyPoint(point, factor) {
  return {
    x: point.x * factor,
    y: point.y * factor,
    z: point.z * factor,
  };
}

function dotPoint(a, b) {
  return (
    a.x * b.x +
    a.y * b.y +
    a.z * b.z
  );
}

function crossPoint(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function normalizePoint(point) {
  const length = Math.hypot(
    point.x,
    point.y,
    point.z
  );

  if (length < 1e-10) {
    return { x: 1, y: 0, z: 0 };
  }

  return multiplyPoint(point, 1 / length);
}

function faceFrame(points) {
  const origin = points[0];

  const first = normalizePoint(
    subtractPoint(points[1], origin)
  );

  const towardThird = subtractPoint(
    points[2],
    origin
  );

  const second = normalizePoint(
    subtractPoint(
      towardThird,
      multiplyPoint(
        first,
        dotPoint(towardThird, first)
      )
    )
  );

  return {
    origin,
    first,
    second,
    normal: normalizePoint(
      crossPoint(first, second)
    ),
  };
}

function coordinatesInFrame(point, frame) {
  const delta = subtractPoint(
    point,
    frame.origin
  );

  return {
    x: dotPoint(delta, frame.first),
    y: dotPoint(delta, frame.second),
    z: dotPoint(delta, frame.normal),
  };
}

function pointFromFrame(coordinates, frame) {
  return addPoint(
    frame.origin,
    addPoint(
      multiplyPoint(
        frame.first,
        coordinates.x
      ),
      addPoint(
        multiplyPoint(
          frame.second,
          coordinates.y
        ),
        multiplyPoint(
          frame.normal,
          coordinates.z
        )
      )
    )
  );
}

function oppositeVertexIndex(face) {
  return VERTICES.findIndex(
    (_, vertexIndex) =>
      !face.includes(vertexIndex)
  );
}

function makeFacePlacementTransform(
  pair,
  mappingTurn = 0,
  tetrahedra = TETRAHEDRA
) {
  const tetrahedronA = tetrahedra[0];
  const tetrahedronB = tetrahedra[1];

  const targetFace = pair.A.map(
    (vertexIndex) =>
      transformPoint(
        VERTICES[vertexIndex],
        tetrahedronA
      )
  );

  const sourceFace = pair.B.map(
    (vertexIndex) =>
      transformPoint(
        VERTICES[vertexIndex],
        tetrahedronB
      )
  );

  const sourceFrame = faceFrame(sourceFace);
  const targetFrame = faceFrame(targetFace);

  const sourceOpposite = transformPoint(
    VERTICES[
      oppositeVertexIndex(pair.B)
    ],
    tetrahedronB
  );

  const targetOpposite = transformPoint(
    VERTICES[
      oppositeVertexIndex(pair.A)
    ],
    tetrahedronA
  );

  const sourceSide = coordinatesInFrame(
    sourceOpposite,
    sourceFrame
  ).z;

  const targetSide = coordinatesInFrame(
    targetOpposite,
    targetFrame
  ).z;

  /*
   * Keep the ordered face correspondence exact,
   * while placing B across the face from A.
   */
  const normalDirection =
    sourceSide * targetSide > 0
      ? -1
      : 1;

  const placedFrame = {
    ...targetFrame,
    normal: multiplyPoint(
      targetFrame.normal,
      normalDirection
    ),
  };

  const canonicalPlacement =
    (point) =>
      pointFromFrame(
        coordinatesInFrame(
          point,
          sourceFrame
        ),
        placedFrame
      );

  if (
    Math.abs(mappingTurn) <
    1e-12
  ) {
    return canonicalPlacement;
  }

  const targetCenter =
    averagePoint(
      targetFace
    );

  /*
   * One positive mapping turn sends B's second ideal
   * vertex to A's first ideal vertex. The entire second
   * tetrahedron rotates rigidly around the glued face
   * normal, so fractional turns animate continuously
   * and integer turns land on exact vertex bijections.
   */
  const anglePerMappingTurn =
    signedAngleAroundAxis(
      subtractPoint(
        targetFace[1],
        targetCenter
      ),
      subtractPoint(
        targetFace[0],
        targetCenter
      ),
      placedFrame.normal
    );

  return (point) => {
    const placedPoint =
      canonicalPlacement(
        point
      );

    return addPoint(
      targetCenter,
      rotateAroundAxis(
        subtractPoint(
          placedPoint,
          targetCenter
        ),
        placedFrame.normal,
        anglePerMappingTurn *
          mappingTurn
      )
    );
  };
}

function smoothUnitInterval(value) {
  const amount = Math.max(
    0,
    Math.min(1, value)
  );

  return (
    amount *
    amount *
    (3 - 2 * amount)
  );
}

function smootherUnitInterval(value) {
  const amount = Math.max(
    0,
    Math.min(1, value)
  );

  return (
    amount *
    amount *
    amount *
    (
      amount *
      (
        amount * 6 -
        15
      ) +
      10
    )
  );
}

function slerpDirections(
  startDirection,
  endDirection,
  progress
) {
  const amount =
    smoothUnitInterval(progress);

  const start =
    normalizePoint(
      startDirection
    );

  const end =
    normalizePoint(
      endDirection
    );

  const cosine = Math.max(
    -1,
    Math.min(
      1,
      dotPoint(start, end)
    )
  );

  if (cosine > 0.9995) {
    return normalizePoint(
      lerpPoint(
        start,
        end,
        amount
      )
    );
  }

  const angle =
    Math.acos(cosine);

  const sine =
    Math.sin(angle);

  const startWeight =
    Math.sin(
      (1 - amount) *
        angle
    ) / sine;

  const endWeight =
    Math.sin(
      amount * angle
    ) / sine;

  return normalizePoint(
    addPoint(
      multiplyPoint(
        start,
        startWeight
      ),
      multiplyPoint(
        end,
        endWeight
      )
    )
  );
}

function quaternionFromRotationMatrix(
  matrix
) {
  const [
    m00, m01, m02,
    m10, m11, m12,
    m20, m21, m22,
  ] = matrix;

  const trace =
    m00 + m11 + m22;

  let quaternion;

  if (trace > 0) {
    const scale =
      Math.sqrt(trace + 1) * 2;

    quaternion = {
      w: 0.25 * scale,
      x: (m21 - m12) / scale,
      y: (m02 - m20) / scale,
      z: (m10 - m01) / scale,
    };
  } else if (
    m00 > m11 &&
    m00 > m22
  ) {
    const scale =
      Math.sqrt(
        1 + m00 - m11 - m22
      ) * 2;

    quaternion = {
      w: (m21 - m12) / scale,
      x: 0.25 * scale,
      y: (m01 + m10) / scale,
      z: (m02 + m20) / scale,
    };
  } else if (m11 > m22) {
    const scale =
      Math.sqrt(
        1 + m11 - m00 - m22
      ) * 2;

    quaternion = {
      w: (m02 - m20) / scale,
      x: (m01 + m10) / scale,
      y: 0.25 * scale,
      z: (m12 + m21) / scale,
    };
  } else {
    const scale =
      Math.sqrt(
        1 + m22 - m00 - m11
      ) * 2;

    quaternion = {
      w: (m10 - m01) / scale,
      x: (m02 + m20) / scale,
      y: (m12 + m21) / scale,
      z: 0.25 * scale,
    };
  }

  const length = Math.hypot(
    quaternion.w,
    quaternion.x,
    quaternion.y,
    quaternion.z
  );

  return {
    w: quaternion.w / length,
    x: quaternion.x / length,
    y: quaternion.y / length,
    z: quaternion.z / length,
  };
}

function slerpQuaternion(
  startQuaternion,
  targetQuaternion,
  progress
) {
  const amount =
    smoothUnitInterval(progress);

  let target = {
    ...targetQuaternion,
  };

  let dot =
    startQuaternion.w * target.w +
    startQuaternion.x * target.x +
    startQuaternion.y * target.y +
    startQuaternion.z * target.z;

  /*
   * q and -q encode the same rigid rotation.
   * Choose the representative giving the shortest route.
   */
  if (dot < 0) {
    target = {
      w: -target.w,
      x: -target.x,
      y: -target.y,
      z: -target.z,
    };

    dot = -dot;
  }

  dot = Math.max(
    -1,
    Math.min(1, dot)
  );

  if (dot > 0.9995) {
    const blended = {
      w:
        startQuaternion.w +
        (
          target.w -
          startQuaternion.w
        ) *
          amount,

      x:
        startQuaternion.x +
        (
          target.x -
          startQuaternion.x
        ) *
          amount,

      y:
        startQuaternion.y +
        (
          target.y -
          startQuaternion.y
        ) *
          amount,

      z:
        startQuaternion.z +
        (
          target.z -
          startQuaternion.z
        ) *
          amount,
    };

    const length = Math.hypot(
      blended.w,
      blended.x,
      blended.y,
      blended.z
    );

    return {
      w: blended.w / length,
      x: blended.x / length,
      y: blended.y / length,
      z: blended.z / length,
    };
  }

  const angle =
    Math.acos(dot);

  const sine =
    Math.sin(angle);

  const startWeight =
    Math.sin(
      (1 - amount) * angle
    ) / sine;

  const targetWeight =
    Math.sin(
      amount * angle
    ) / sine;

  return {
    w:
      startQuaternion.w *
        startWeight +
      target.w *
        targetWeight,

    x:
      startQuaternion.x *
        startWeight +
      target.x *
        targetWeight,

    y:
      startQuaternion.y *
        startWeight +
      target.y *
        targetWeight,

    z:
      startQuaternion.z *
        startWeight +
      target.z *
        targetWeight,
  };
}


function slerpIdentityQuaternion(
  targetQuaternion,
  progress
) {
  const amount =
    smoothUnitInterval(progress);

  let target =
    targetQuaternion;

  /*
   * q and -q encode the same rotation. Select the
   * representative producing the shorter rotation.
   */
  if (target.w < 0) {
    target = {
      w: -target.w,
      x: -target.x,
      y: -target.y,
      z: -target.z,
    };
  }

  const dot = Math.max(
    -1,
    Math.min(1, target.w)
  );

  if (dot > 0.9995) {
    const blended = {
      w:
        1 +
        (target.w - 1) *
          amount,
      x: target.x * amount,
      y: target.y * amount,
      z: target.z * amount,
    };

    const length = Math.hypot(
      blended.w,
      blended.x,
      blended.y,
      blended.z
    );

    return {
      w: blended.w / length,
      x: blended.x / length,
      y: blended.y / length,
      z: blended.z / length,
    };
  }

  const angle =
    Math.acos(dot);

  const sine =
    Math.sin(angle);

  const startWeight =
    Math.sin(
      (1 - amount) * angle
    ) / sine;

  const targetWeight =
    Math.sin(amount * angle) /
    sine;

  return {
    w:
      startWeight +
      target.w *
        targetWeight,
    x:
      target.x *
      targetWeight,
    y:
      target.y *
      targetWeight,
    z:
      target.z *
      targetWeight,
  };
}

function rotatePointByQuaternion(
  point,
  quaternion
) {
  const vector = {
    x: quaternion.x,
    y: quaternion.y,
    z: quaternion.z,
  };

  const firstCross =
    crossPoint(
      vector,
      point
    );

  const secondCross =
    crossPoint(
      vector,
      firstCross
    );

  return addPoint(
    point,
    multiplyPoint(
      addPoint(
        multiplyPoint(
          firstCross,
          quaternion.w
        ),
        secondCross
      ),
      2
    )
  );
}

function makeStagedFacePlacementTransform(
  pair,
  strength,
  mappingTurn = 0,
  initialWorldPositions =
    INITIAL_WORLD_VERTEX_POSITIONS,
  tetrahedra = TETRAHEDRA
) {
  const amount = Math.max(
    0,
    Math.min(1, strength)
  );

  const finalPlacement =
    makeFacePlacementTransform(
      pair,
      mappingTurn,
      tetrahedra
    );

  if (
    amount <=
    FACE_CONSTRAINT_EPSILON
  ) {
    return clonePoint;
  }

  if (
    amount >=
    1 -
      FACE_CONSTRAINT_EPSILON
  ) {
    return finalPlacement;
  }

  const sourceCenter =
    averageWorldPoint(
      initialWorldPositions.B
    );

  const finalCenter =
    finalPlacement(
      sourceCenter
    );

  function transformedAxis(axis) {
    return subtractPoint(
      finalPlacement(
        addPoint(
          sourceCenter,
          axis
        )
      ),
      finalCenter
    );
  }

  const transformedX =
    transformedAxis({
      x: 1,
      y: 0,
      z: 0,
    });

  const transformedY =
    transformedAxis({
      x: 0,
      y: 1,
      z: 0,
    });

  const transformedZ =
    transformedAxis({
      x: 0,
      y: 0,
      z: 1,
    });

  const finalQuaternion =
    quaternionFromRotationMatrix([
      transformedX.x,
      transformedY.x,
      transformedZ.x,

      transformedX.y,
      transformedY.y,
      transformedZ.y,

      transformedX.z,
      transformedY.z,
      transformedZ.z,
    ]);

  /*
   * Phase 1: rotate B rigidly about its own center.
   *
   * Phase 2: carry the correctly oriented tetrahedron
   * around A on a constant-radius orbit. This changes
   * the approach direction without crossing A.
   *
   * Phase 3: move radially inward along the selected
   * face normal until the two hexagonal faces coincide.
   */
  const rotationProgress =
    amount /
    FIRST_FACE_ROTATION_END;

  const orbitProgress =
    (
      amount -
      FIRST_FACE_ROTATION_END
    ) /
    (
      FIRST_FACE_ORBIT_END -
      FIRST_FACE_ROTATION_END
    );

  const approachProgress =
    (
      amount -
      FIRST_FACE_ORBIT_END
    ) /
    (
      1 -
      FIRST_FACE_ORBIT_END
    );

  const currentQuaternion =
    slerpIdentityQuaternion(
      finalQuaternion,
      rotationProgress
    );

  const tetrahedronACenter =
    tetrahedra[0].center;

  const sourceDirection =
    normalizePoint(
      subtractPoint(
        sourceCenter,
        tetrahedronACenter
      )
    );

  const finalDirection =
    normalizePoint(
      subtractPoint(
        finalCenter,
        tetrahedronACenter
      )
    );

  const orbitRadius =
    pointDistance(
      sourceCenter,
      tetrahedronACenter
    );

  const finalRadius =
    pointDistance(
      finalCenter,
      tetrahedronACenter
    );

  let currentCenter;

  if (
    amount <=
    FIRST_FACE_ROTATION_END
  ) {
    currentCenter =
      sourceCenter;
  } else if (
    amount <=
    FIRST_FACE_ORBIT_END
  ) {
    const orbitDirection =
      slerpDirections(
        sourceDirection,
        finalDirection,
        orbitProgress
      );

    currentCenter =
      addPoint(
        tetrahedronACenter,
        multiplyPoint(
          orbitDirection,
          orbitRadius
        )
      );
  } else {
    const currentRadius =
      orbitRadius +
      (
        finalRadius -
        orbitRadius
      ) *
        smoothUnitInterval(
          approachProgress
        );

    currentCenter =
      addPoint(
        tetrahedronACenter,
        multiplyPoint(
          finalDirection,
          currentRadius
        )
      );
  }

  return (point) =>
    addPoint(
      currentCenter,
      rotatePointByQuaternion(
        subtractPoint(
          point,
          sourceCenter
        ),
        currentQuaternion
      )
    );
}

/*
 * ============================================================
 * DIRECT RIGID FACE MATCHING
 * ============================================================
 *
 * The Cells presentation no longer needs a bridge between
 * selected faces.
 *
 * Every canonical face pair gets one rigid target pose:
 *
 *             B
 *             |
 *        -----+-----   selected common face, y = 0
 *             |
 *             A
 *
 * Both selected faces coincide exactly in that middle plane.
 * A and B occupy opposite sides of it.
 */

function makeDirectFaceMeetingTransform(
  pair,
  tetrahedronId,
  tetrahedra = TETRAHEDRA
) {
  const tetrahedron =
    tetrahedronId === "A"
      ? tetrahedra[0]
      : tetrahedra[1];

  /*
   * The two tetrahedra must arrive on opposite sides of ONE
   * common triangular face.
   *
   * A keeps the encoded cyclic order. B reverses that order
   * before its rigid frame is built. This is the orientation
   * reversal required by the face gluing, and it makes the two
   * visible large faces coincide instead of forming the current
   * half-turn offset.
   */
  const orderedFaceVertices =
    tetrahedronId === "B"
      ? [
          pair.B[0],
          pair.B[2],
          pair.B[1],
        ]
      : pair.A;

  const face =
    orderedFaceVertices.map(
      (vertexIndex) =>
        transformPoint(
          VERTICES[vertexIndex],
          tetrahedron
        )
    );

  const sourceFrame =
    faceFrame(face);

  const oppositePoint =
    transformPoint(
      VERTICES[
        oppositeVertexIndex(
          pair[tetrahedronId]
        )
      ],
      tetrahedron
    );

  const sourceSide =
    coordinatesInFrame(
      oppositePoint,
      sourceFrame
    ).z;

  /*
   * Screen y follows world y:
   *
   *   B above the common face
   *   A below the common face
   */
  const desiredSide =
    tetrahedronId === "A"
      ? -1
      : 1;

  const sourceSideSign =
    sourceSide >= 0
      ? 1
      : -1;

  const targetNormal = {
    x: 0,
    y:
      desiredSide *
      sourceSideSign,
    z: 0,
  };

  const targetFirst = {
    x: 1,
    y: 0,
    z: 0,
  };

  /*
   * first × second = normal
   */
  const targetSecond =
    normalizePoint(
      crossPoint(
        targetNormal,
        targetFirst
      )
    );

  const faceCenter =
    averagePoint(face);

  const centerCoordinates =
    coordinatesInFrame(
      faceCenter,
      sourceFrame
    );

  /*
   * Choose the target-frame origin so the shared face centroid
   * lands exactly at the world origin.
   */
  const targetOrigin =
    multiplyPoint(
      addPoint(
        multiplyPoint(
          targetFirst,
          centerCoordinates.x
        ),
        multiplyPoint(
          targetSecond,
          centerCoordinates.y
        )
      ),
      -1
    );

  const targetFrame = {
    origin:
      targetOrigin,

    first:
      targetFirst,

    second:
      targetSecond,

    normal:
      targetNormal,
  };

  return (point) =>
    pointFromFrame(
      coordinatesInFrame(
        point,
        sourceFrame
      ),
      targetFrame
    );
}


function rigidPoseFromTransform(
  transform,
  sourceCenter
) {
  const targetCenter =
    transform(
      sourceCenter
    );

  function transformedAxis(
    axis
  ) {
    return subtractPoint(
      transform(
        addPoint(
          sourceCenter,
          axis
        )
      ),
      targetCenter
    );
  }

  const xAxis =
    transformedAxis({
      x: 1,
      y: 0,
      z: 0,
    });

  const yAxis =
    transformedAxis({
      x: 0,
      y: 1,
      z: 0,
    });

  const zAxis =
    transformedAxis({
      x: 0,
      y: 0,
      z: 1,
    });

  return {
    center:
      targetCenter,

    quaternion:
      quaternionFromRotationMatrix([
        xAxis.x,
        yAxis.x,
        zAxis.x,

        xAxis.y,
        yAxis.y,
        zAxis.y,

        xAxis.z,
        yAxis.z,
        zAxis.z,
      ]),
  };
}


function makeStagedDirectFaceMeetingTransform(
  pair,
  tetrahedronId,
  strength,
  geometry =
    DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY
) {
  const amount =
    Math.max(
      0,
      Math.min(1, strength)
    );

  const initialPositions =
    geometry.initialWorldPositions;

  const tetrahedra =
    geometry.tetrahedra ??
    TETRAHEDRA;

  const sourcePositions =
    initialPositions[
      tetrahedronId
    ];

  const sourceCenter =
    averageWorldPoint(
      sourcePositions
    );

  const finalTransform =
    makeDirectFaceMeetingTransform(
      pair,
      tetrahedronId,
      tetrahedra
    );

  if (
    amount <=
    FACE_CONSTRAINT_EPSILON
  ) {
    return clonePoint;
  }

  if (
    amount >=
    1 - FACE_CONSTRAINT_EPSILON
  ) {
    return finalTransform;
  }

  const finalPose =
    rigidPoseFromTransform(
      finalTransform,
      sourceCenter
    );

  /*
   * Collision-free rigid route.
   *
   * Phase 1:
   *   rotate while the cells remain fully separated.
   *
   * Phase 2:
   *   orbit around the common midpoint at the original
   *   center radius.
   *
   * Phase 3:
   *   approach inward along the final face-normal line.
   *
   * A and B follow opposite copies of this route.
   */
  const rotationProgress =
    amount /
    FIRST_FACE_ROTATION_END;

  const orbitProgress =
    (
      amount -
      FIRST_FACE_ROTATION_END
    ) /
    (
      FIRST_FACE_ORBIT_END -
      FIRST_FACE_ROTATION_END
    );

  const approachProgress =
    (
      amount -
      FIRST_FACE_ORBIT_END
    ) /
    (
      1 -
      FIRST_FACE_ORBIT_END
    );

  const currentQuaternion =
    slerpIdentityQuaternion(
      finalPose.quaternion,
      rotationProgress
    );

  const orbitCenter = {
    x: 0,
    y: 0,
    z: 0,
  };

  const sourceDirection =
    normalizePoint(
      subtractPoint(
        sourceCenter,
        orbitCenter
      )
    );

  const finalDirection =
    normalizePoint(
      subtractPoint(
        finalPose.center,
        orbitCenter
      )
    );

  const sourceRadius =
    pointDistance(
      sourceCenter,
      orbitCenter
    );

  const finalRadius =
    pointDistance(
      finalPose.center,
      orbitCenter
    );

  let currentCenter;

  if (
    amount <=
    FIRST_FACE_ROTATION_END
  ) {
    currentCenter =
      sourceCenter;
  } else if (
    amount <=
    FIRST_FACE_ORBIT_END
  ) {
    const orbitDirection =
      slerpDirections(
        sourceDirection,
        finalDirection,
        orbitProgress
      );

    currentCenter =
      addPoint(
        orbitCenter,
        multiplyPoint(
          orbitDirection,
          sourceRadius
        )
      );
  } else {
    const currentRadius =
      sourceRadius +
      (
        finalRadius -
        sourceRadius
      ) *
        smoothUnitInterval(
          approachProgress
        );

    currentCenter =
      addPoint(
        orbitCenter,
        multiplyPoint(
          finalDirection,
          currentRadius
        )
      );
  }

  return (point) =>
    addPoint(
      currentCenter,
      rotatePointByQuaternion(
        subtractPoint(
          point,
          sourceCenter
        ),
        currentQuaternion
      )
    );
}


function quaternionDot(
  first,
  second
) {
  return (
    first.w * second.w +
    first.x * second.x +
    first.y * second.y +
    first.z * second.z
  );
}


function weightedQuaternionAverage(
  entries
) {
  const active =
    entries.filter(
      (entry) =>
        entry.weight >
        1e-12
    );

  if (
    active.length === 0
  ) {
    return {
      w: 1,
      x: 0,
      y: 0,
      z: 0,
    };
  }

  const reference =
    active[0].quaternion;

  const total =
    active.reduce(
      (
        accumulator,
        entry
      ) => {
        const sign =
          quaternionDot(
            reference,
            entry.quaternion
          ) < 0
            ? -1
            : 1;

        return {
          w:
            accumulator.w +
            entry.weight *
              sign *
              entry.quaternion.w,

          x:
            accumulator.x +
            entry.weight *
              sign *
              entry.quaternion.x,

          y:
            accumulator.y +
            entry.weight *
              sign *
              entry.quaternion.y,

          z:
            accumulator.z +
            entry.weight *
              sign *
              entry.quaternion.z,
        };
      },
      {
        w: 0,
        x: 0,
        y: 0,
        z: 0,
      }
    );

  const length =
    Math.hypot(
      total.w,
      total.x,
      total.y,
      total.z
    );

  if (
    length < 1e-12
  ) {
    return {
      w: 1,
      x: 0,
      y: 0,
      z: 0,
    };
  }

  return {
    w:
      total.w / length,

    x:
      total.x / length,

    y:
      total.y / length,

    z:
      total.z / length,
  };
}


function makeCorollaryFaceRotationTransform(
  sourcePair,
  targetPair,
  tetrahedronId,
  progress,
  geometry =
    DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY
) {
  const initialPositions =
    geometry.initialWorldPositions;

  const tetrahedra =
    geometry.tetrahedra ??
    TETRAHEDRA;

  const sourceCenter =
    averageWorldPoint(
      initialPositions[
        tetrahedronId
      ]
    );

  /*
   * Both endpoints are the viewer's EXISTING exact glued poses.
   *
   * Yellow:
   *   m004 Yellow pose -> m003 Yellow pose
   *
   * Since the physical face set is unchanged, this becomes the
   * desired rigid rotation about the common triangular face.
   */
  const sourceTransform =
    makeDirectFaceMeetingTransform(
      sourcePair,
      tetrahedronId,
      tetrahedra
    );

  const targetTransform =
    makeDirectFaceMeetingTransform(
      targetPair,
      tetrahedronId,
      tetrahedra
    );

  const sourcePose =
    rigidPoseFromTransform(
      sourceTransform,
      sourceCenter
    );

  const targetPose =
    rigidPoseFromTransform(
      targetTransform,
      sourceCenter
    );

  const amount =
    Math.max(
      0,
      Math.min(
        1,
        progress
      )
    );

  const currentCenter = {
    x:
      sourcePose.center.x +
      (
        targetPose.center.x -
        sourcePose.center.x
      ) *
        amount,

    y:
      sourcePose.center.y +
      (
        targetPose.center.y -
        sourcePose.center.y
      ) *
        amount,

    z:
      sourcePose.center.z +
      (
        targetPose.center.z -
        sourcePose.center.z
      ) *
        amount,
  };

  const currentQuaternion =
    slerpQuaternion(
      sourcePose.quaternion,
      targetPose.quaternion,
      amount
    );

  return (point) =>
    addPoint(
      currentCenter,
      rotatePointByQuaternion(
        subtractPoint(
          point,
          sourceCenter
        ),
        currentQuaternion
      )
    );
}


function solveDirectFaceMatchPositions(
  strengths,
  geometry =
    DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY,
  corollaryTargetPair = null,
  corollaryProgress = 0
) {
  const facePairs =
    geometry.facePairs ??
    FIGURE_EIGHT_FACE_PAIRS;

  const initialPositions =
    geometry.initialWorldPositions;

  /*
   * Direct Cells mode owns exactly one physical face meeting
   * at a time.
   */
  const activePair =
    facePairs
      .map((pair) => ({
        pair,

        strength:
          Math.max(
            0,
            Math.min(
              1,
              strengths[
                pair.id
              ] ?? 0
            )
          ),
      }))
      .filter(
        (entry) =>
          entry.strength >
          FACE_CONSTRAINT_EPSILON
      )
      .sort(
        (first, second) =>
          second.strength -
          first.strength
      )[0] ?? null;

  if (!activePair) {
    return cloneWorldPositions(
      initialPositions
    );
  }

  const result = {
    A: [],
    B: [],
  };

  ["A", "B"].forEach(
    (tetrahedronId) => {
      const corollaryRotationActive =
        corollaryTargetPair !== null &&
        activePair.strength >=
          1 -
            FACE_CONSTRAINT_EPSILON;

      const transform =
        corollaryRotationActive
          ? makeCorollaryFaceRotationTransform(
              activePair.pair,
              corollaryTargetPair,
              tetrahedronId,
              corollaryProgress,
              geometry
            )
          : makeStagedDirectFaceMeetingTransform(
              activePair.pair,
              tetrahedronId,
              activePair.strength,
              geometry
            );

      result[tetrahedronId] =
        initialPositions[
          tetrahedronId
        ].map(transform);
    }
  );

  return result;
}


function cubicBezierPoint(
  start,
  firstControl,
  secondControl,
  end,
  amount
) {
  const t = Math.max(
    0,
    Math.min(1, amount)
  );

  const inverse =
    1 - t;

  return addPoint(
    addPoint(
      multiplyPoint(
        start,
        inverse *
          inverse *
          inverse
      ),
      multiplyPoint(
        firstControl,
        3 *
          inverse *
          inverse *
          t
      )
    ),
    addPoint(
      multiplyPoint(
        secondControl,
        3 *
          inverse *
          t *
          t
      ),
      multiplyPoint(
        end,
        t * t * t
      )
    )
  );
}

function cuspCollarSurfaceTriangles(
  rings,
  surfaceId
) {
  const ringCount = rings.length;
  const perimeterCount =
    rings[0]?.length ?? 0;

  if (
    ringCount < 2 ||
    perimeterCount < 3
  ) {
    return [];
  }

  const triangles = [];

  for (
    let segmentIndex = 0;
    segmentIndex < ringCount - 1;
    segmentIndex += 1
  ) {
    for (
      let perimeterIndex = 0;
      perimeterIndex < perimeterCount;
      perimeterIndex += 1
    ) {
      const nextPerimeterIndex =
        (
          perimeterIndex + 1
        ) %
        perimeterCount;

      const first =
        rings[
          segmentIndex
        ][perimeterIndex];

      const second =
        rings[
          segmentIndex
        ][nextPerimeterIndex];

      const third =
        rings[
          segmentIndex + 1
        ][nextPerimeterIndex];

      const fourth =
        rings[
          segmentIndex + 1
        ][perimeterIndex];

      triangles.push(
        {
          key:
            `cusp-collar-${surfaceId}-` +
            `${segmentIndex}-` +
            `${perimeterIndex}-0`,
          bridgeIndex:
            `cusp-${surfaceId}`,
          pairId:
            `cusp-${surfaceId}`,
          segmentIndex,
          sideIndex:
            perimeterIndex,
          triangleIndex: 0,
          points: [
            first,
            second,
            third,
          ],
        },
        {
          key:
            `cusp-collar-${surfaceId}-` +
            `${segmentIndex}-` +
            `${perimeterIndex}-1`,
          bridgeIndex:
            `cusp-${surfaceId}`,
          pairId:
            `cusp-${surfaceId}`,
          segmentIndex,
          sideIndex:
            perimeterIndex,
          triangleIndex: 1,
          points: [
            first,
            third,
            fourth,
          ],
        }
      );
    }
  }

  return triangles;
}

function cuspCollarTriangleGroup(
  id,
  triangles,
  kind = "obstacle"
) {
  if (triangles.length === 0) {
    return null;
  }

  return {
    id,
    kind,
    triangles,
    bounds:
      bridgeAuditBounds(
        triangles.flatMap(
          (triangle) =>
            triangle.points
        )
      ),
  };
}

function cuspBoundaryClearanceSeedRings(
  targetRings,
  cuspBaseId
) {
  const lastRingIndex =
    targetRings.length - 1;

  if (lastRingIndex <= 0) {
    return targetRings.map(
      (ring) =>
        ring.map(clonePoint)
    );
  }

  const tetrahedronId =
    cuspBaseId?.[0];

  const vertexIndex =
    Number(
      cuspBaseId?.slice(1)
    );

  const sideSign =
    tetrahedronId === "A"
      ? -1
      : 1;

  const lane =
    Number.isInteger(
      vertexIndex
    )
      ? vertexIndex - 1.5
      : 0;

  /*
   * Clearance seed = same full-width rings, translated outward.
   *
   * Attachment rings remain fixed.
   *
   * Every interior ring retains its exact shape and size.
   */
  return targetRings.map(
    (
      ring,
      ringIndex
    ) => {
      if (
        ringIndex === 0 ||
        ringIndex ===
          lastRingIndex
      ) {
        return ring.map(
          clonePoint
        );
      }

      const routeAmount =
        ringIndex /
        lastRingIndex;

      const envelope =
        Math.sin(
          Math.PI *
            routeAmount
        ) ** 2;

      const ringCenter =
        averageWorldPoint(
          ring
        );

      const radialLength =
        Math.hypot(
          ringCenter.y,
          ringCenter.z
        );

      const fallbackAngle =
        (
          lane +
          1.5
        ) *
        Math.PI /
        2;

      const radialDirection =
        radialLength > 1e-8
          ? {
              x: 0,

              y:
                ringCenter.y /
                radialLength,

              z:
                ringCenter.z /
                radialLength,
            }
          : {
              x: 0,

              y:
                Math.cos(
                  fallbackAngle
                ),

              z:
                Math.sin(
                  fallbackAngle
                ),
            };

      const tangentDirection = {
        x: 0,
        y: -radialDirection.z,
        z: radialDirection.y,
      };

      /*
       * Important:
       *
       * this is ONE translation applied to EVERY point in this
       * triangular ring.
       *
       * Therefore the ring cannot shrink.
       */
      const translation =
        addPoint(
          {
            x:
              sideSign *
              CUSP_FUNNEL_CLEARANCE_SIDE_PUSH *
              envelope,

            y: 0,
            z: 0,
          },

          addPoint(
            multiplyPoint(
              radialDirection,

              CUSP_FUNNEL_CLEARANCE_RADIAL_PUSH *
                envelope
            ),

            multiplyPoint(
              tangentDirection,

              lane *
                CUSP_FUNNEL_CLEARANCE_TANGENTIAL_PUSH *
                envelope
            )
          )
        );

      return ring.map(
        (point) =>
          addPoint(
            point,
            translation
          )
      );
    }
  );
}

function cuspCollarBlendRings(
  initialRings,
  targetRings,
  amount
) {
  const blendAmount =
    clampUnit(amount);

  const lastRingIndex =
    initialRings.length - 1;

  return initialRings.map(
    (ring, ringIndex) =>
      /*
       * The first and final rings are topological
       * attachments. Collision certification may
       * deform only the interior route.
       */
      ringIndex === 0 ||
      ringIndex === lastRingIndex
        ? targetRings[
            ringIndex
          ].map(clonePoint)
        : ring.map(
            (point, perimeterIndex) =>
              lerpPoint(
                point,
                targetRings[
                  ringIndex
                ][perimeterIndex],
                blendAmount
              )
          )
  );
}

function cuspCollarSurfaceIsClear(
  rings,
  surfaceId,
  obstacleGroups
) {
  const triangles =
    cuspCollarSurfaceTriangles(
      rings,
      surfaceId
    );

  if (triangles.length === 0) {
    return true;
  }

  const selfSummary =
    bridgeAuditIntersectionSummary(
      triangles
    );

  if (selfSummary.hitCount > 0) {
    return false;
  }

  const surfaceBounds =
    bridgeAuditBounds(
      rings.flat()
    );

  for (
    const obstacleGroup of
    obstacleGroups
  ) {
    if (
      obstacleGroup === null ||
      !bridgeAuditBoundsOverlap(
        surfaceBounds,
        obstacleGroup.bounds
      )
    ) {
      continue;
    }

    const obstacleSummary =
      bridgeAuditIntersectionSummary(
        triangles,
        obstacleGroup.triangles
      );

    if (
      obstacleSummary.hitCount > 0
    ) {
      return false;
    }
  }

  return true;
}

function cuspCollarSystemIsClear(
  geometries,
  proposedRingsByBaseId,
  fixedObstacleGroups,
  amount
) {
  const candidateGroups = [];

  for (
    const geometry of geometries
  ) {
    const proposedRings =
      proposedRingsByBaseId.get(
        geometry.cuspBaseId
      );

    if (proposedRings === undefined) {
      return false;
    }

    const candidateRings =
      cuspCollarBlendRings(
        geometry.initialRings,
        proposedRings,
        amount
      );

    if (
      !cuspCollarSurfaceIsClear(
        candidateRings,
        geometry.cuspBaseId,
        fixedObstacleGroups
      )
    ) {
      return false;
    }

    const candidateGroup =
      cuspCollarTriangleGroup(
        `route-${geometry.cuspBaseId}`,
        cuspCollarSurfaceTriangles(
          candidateRings,
          geometry.cuspBaseId
        ),
        "cusp-route"
      );

    if (candidateGroup !== null) {
      candidateGroups.push(
        candidateGroup
      );
    }
  }

  /*
   * Test every pair of routed cusp surfaces at the same
   * deformation amount. The acceptance fraction is global,
   * so A/B labels and construction order cannot privilege one
   * collar over another.
   */
  for (
    let firstIndex = 0;
    firstIndex <
      candidateGroups.length;
    firstIndex += 1
  ) {
    const first =
      candidateGroups[
        firstIndex
      ];

    for (
      let secondIndex =
        firstIndex + 1;
      secondIndex <
        candidateGroups.length;
      secondIndex += 1
    ) {
      const second =
        candidateGroups[
          secondIndex
        ];

      if (
        !bridgeAuditBoundsOverlap(
          first.bounds,
          second.bounds
        )
      ) {
        continue;
      }

      const summary =
        bridgeAuditIntersectionSummary(
          first.triangles,
          second.triangles
        );

      if (summary.hitCount > 0) {
        return false;
      }
    }
  }

  return true;
}

function certifyCuspCollarSystem(
  geometries,
  proposedRingsByBaseId,
  fixedObstacleGroups
) {
  /*
   * Certify one common interpolation from the clearance seed
   * to the prescribed routed collar geometry.
   *
   * All eight surfaces receive one common acceptance amount.
   * This keeps the clearance solve symmetric while guaranteeing
   * that the accepted sampled path stays free of self-contact,
   * route-route contact, and contact with fixed obstacles.
   */
  let lastClearAmount = 0;
  let firstBlockedAmount = null;

  for (
    let sampleIndex = 1;
    sampleIndex <=
      CUSP_COLLAR_COLLISION_SWEEP_SAMPLES;
    sampleIndex += 1
  ) {
    const amount =
      sampleIndex /
      CUSP_COLLAR_COLLISION_SWEEP_SAMPLES;

    if (
      cuspCollarSystemIsClear(
        geometries,
        proposedRingsByBaseId,
        fixedObstacleGroups,
        amount
      )
    ) {
      lastClearAmount = amount;
      continue;
    }

    firstBlockedAmount = amount;
    break;
  }

  if (firstBlockedAmount !== null) {
    let lower = lastClearAmount;
    let upper = firstBlockedAmount;

    for (
      let refinementIndex = 0;
      refinementIndex <
        CUSP_COLLAR_COLLISION_REFINEMENT_STEPS;
      refinementIndex += 1
    ) {
      const middle =
        (lower + upper) / 2;

      if (
        cuspCollarSystemIsClear(
          geometries,
          proposedRingsByBaseId,
          fixedObstacleGroups,
          middle
        )
      ) {
        lower = middle;
      } else {
        upper = middle;
      }
    }

    lastClearAmount = lower;
  } else {
    lastClearAmount = 1;
  }

  return {
    acceptedAmount:
      lastClearAmount,
    collisionLimited:
      lastClearAmount <
      1 - FACE_CONSTRAINT_EPSILON,
    ringsByBaseId:
      new Map(
        geometries.map(
          (geometry) => [
            geometry.cuspBaseId,
            cuspCollarBlendRings(
              geometry.initialRings,
              proposedRingsByBaseId.get(
                geometry.cuspBaseId
              ),
              lastClearAmount
            ),
          ]
        )
      ),
  };
}

function cuspCollarRingsKey(
  rings
) {
  return rings
    .flat()
    .map(
      (point) =>
        `${point.x.toFixed(3)},` +
        `${point.y.toFixed(3)},` +
        `${point.z.toFixed(3)}`
    )
    .join(";");
}

function rememberCuspCollarCertification(
  key,
  value
) {
  if (CUSP_COLLAR_CERTIFICATION_CACHE.has(key)) {
    CUSP_COLLAR_CERTIFICATION_CACHE.delete(key);
  }

  CUSP_COLLAR_CERTIFICATION_CACHE.set(
    key,
    value
  );

  while (
    CUSP_COLLAR_CERTIFICATION_CACHE.size >
    CUSP_COLLAR_CERTIFICATION_CACHE_LIMIT
  ) {
    const oldestKey =
      CUSP_COLLAR_CERTIFICATION_CACHE
        .keys()
        .next()
        .value;

    CUSP_COLLAR_CERTIFICATION_CACHE.delete(
      oldestKey
    );
  }
}

function faceWorldPointsForPair(
  positions,
  tetrahedronId,
  pairId,
  geometry =
    DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY
) {
  const face =
    geometry.meshes[
      tetrahedronId
    ].largeFaces[
      pairId
    ];

  return face.vertexIndices.map(
    (vertexIndex) =>
      positions[
        tetrahedronId
      ][vertexIndex]
  );
}

function faceMappingQuaternion(
  sourcePoints,
  targetPoints
) {
  const sourceFrame =
    faceFrame(sourcePoints);

  const targetFrame =
    faceFrame(targetPoints);

  const sourceCenter =
    averageWorldPoint(
      sourcePoints
    );

  const targetCenter =
    averageWorldPoint(
      targetPoints
    );

  function mappedPoint(point) {
    return pointFromFrame(
      coordinatesInFrame(
        point,
        sourceFrame
      ),
      targetFrame
    );
  }

  function transformedAxis(axis) {
    return subtractPoint(
      mappedPoint(
        addPoint(
          sourceCenter,
          axis
        )
      ),
      targetCenter
    );
  }

  const transformedX =
    transformedAxis({
      x: 1,
      y: 0,
      z: 0,
    });

  const transformedY =
    transformedAxis({
      x: 0,
      y: 1,
      z: 0,
    });

  const transformedZ =
    transformedAxis({
      x: 0,
      y: 0,
      z: 1,
    });

  return quaternionFromRotationMatrix([
    transformedX.x,
    transformedY.x,
    transformedZ.x,

    transformedX.y,
    transformedY.y,
    transformedZ.y,

    transformedX.z,
    transformedY.z,
    transformedZ.z,
  ]);
}

function bridgeRouteDirection(
  centerA,
  centerB,
  sceneCenter,
  pairId
) {
  const midpoint =
    averageWorldPoint([
      centerA,
      centerB,
    ]);

  const chord =
    normalizePoint(
      subtractPoint(
        centerB,
        centerA
      )
    );

  const radial =
    subtractPoint(
      midpoint,
      sceneCenter
    );

  let route =
    subtractPoint(
      radial,
      multiplyPoint(
        chord,
        dotPoint(
          radial,
          chord
        )
      )
    );

  if (
    Math.hypot(
      route.x,
      route.y,
      route.z
    ) <
    FACE_CONSTRAINT_EPSILON
  ) {
    const fallbackAxes = [
      {
        x: 0,
        y: 0,
        z: 1,
      },
      {
        x: 0,
        y: 1,
        z: 0,
      },
      {
        x: 1,
        y: 0,
        z: 0,
      },
    ];

    const fallbackAxis =
      fallbackAxes[
        pairId %
        fallbackAxes.length
      ];

    route =
      crossPoint(
        chord,
        fallbackAxis
      );

    if (
      Math.hypot(
        route.x,
        route.y,
        route.z
      ) <
      FACE_CONSTRAINT_EPSILON
    ) {
      route =
        crossPoint(
          chord,
          fallbackAxes[
            (
              pairId +
              1
            ) %
            fallbackAxes.length
          ]
        );
    }
  }

  if (
    dotPoint(
      route,
      radial
    ) <
    0
  ) {
    route =
      multiplyPoint(
        route,
        -1
      );
  }

  return normalizePoint(
    route
  );
}

function normalizeBridgeRouteSpec(
  routeSpec,
  routeLane = 0
) {
  const source =
    routeSpec &&
    typeof routeSpec === "object"
      ? routeSpec
      : DEFAULT_BRIDGE_ROUTE_SPEC;

  return {
    id:
      typeof source.id === "string"
        ? source.id
        : DEFAULT_BRIDGE_ROUTE_SPEC.id,
    kind:
      typeof source.kind === "string"
        ? source.kind
        : DEFAULT_BRIDGE_ROUTE_SPEC.kind,
    family:
      typeof source.family === "string"
        ? source.family
        : DEFAULT_BRIDGE_ROUTE_SPEC.family,
    lane:
      Number.isFinite(source.lane)
        ? source.lane
        : routeLane,
    archDistance:
      Number.isFinite(
        source.archDistance
      )
        ? source.archDistance
        : DEFAULT_BRIDGE_ROUTE_SPEC
            .archDistance,
    lateralOffset:
      Number.isFinite(
        source.lateralOffset
      )
        ? source.lateralOffset
        : DEFAULT_BRIDGE_ROUTE_SPEC
            .lateralOffset,
    midScale:
      Number.isFinite(
        source.midScale
      )
        ? Math.max(
            0.08,
            Math.min(
              1,
              source.midScale
            )
          )
        : SECOND_FACE_BRIDGE_MID_SCALE,
    sectionScale:
      Number.isFinite(
        source.sectionScale
      )
        ? Math.max(
            0.01,
            Math.min(
              1,
              source.sectionScale
            )
          )
        : 1,
    transitionClearance:
      Number.isFinite(
        source.transitionClearance
      )
        ? Math.max(
            0,
            source.transitionClearance
          )
        : 0,
    transitionPinch:
      Number.isFinite(
        source.transitionPinch
      )
        ? Math.max(
            0,
            Math.min(
              0.99,
              source.transitionPinch
            )
          )
        : 0,
  };
}

function bridgeRouteSideDirection(
  centerA,
  centerB,
  routeDirection,
  pairId
) {
  const chord =
    normalizePoint(
      subtractPoint(
        centerB,
        centerA
      )
    );

  let sideDirection =
    crossPoint(
      chord,
      routeDirection
    );

  if (
    Math.hypot(
      sideDirection.x,
      sideDirection.y,
      sideDirection.z
    ) <
    FACE_CONSTRAINT_EPSILON
  ) {
    const fallbackAxes = [
      {
        x: 0,
        y: 0,
        z: 1,
      },
      {
        x: 0,
        y: 1,
        z: 0,
      },
      {
        x: 1,
        y: 0,
        z: 0,
      },
    ];

    sideDirection =
      crossPoint(
        chord,
        fallbackAxes[
          pairId %
          fallbackAxes.length
        ]
      );
  }

  return normalizePoint(
    sideDirection
  );
}

function bridgeRouteCandidateSpecs() {
  return BRIDGE_ROUTE_CANDIDATE_SPECS.map(
    (routeSpec) => ({
      ...routeSpec,
    })
  );
}

function bridgeRouteCandidateSpecsForType(
  bridgeType
) {
  const normalizedType =
    bridgeType === "nonadjacent"
      ? "nonadjacent"
      : "edge-adjacent";

  return BRIDGE_ROUTE_CANDIDATE_SPECS
    .filter(
      (routeSpec) =>
        routeSpec.bridgeType ===
        normalizedType
    )
    .map((routeSpec) => ({
      ...routeSpec,
    }));
}

function bridgeRouteSpecKey(
  routeSpec
) {
  if (routeSpec === null) {
    return "none";
  }

  const normalized =
    normalizeBridgeRouteSpec(
      routeSpec,
      routeSpec.lane
    );

  return [
    normalized.id,
    normalized.kind,
    normalized.family,
    normalized.lane,
    normalized.archDistance.toFixed(6),
    normalized.lateralOffset.toFixed(6),
    normalized.midScale.toFixed(6),
    normalized.sectionScale.toFixed(6),
    normalized.transitionClearance.toFixed(6),
    normalized.transitionPinch.toFixed(6),
  ].join(":");
}

function facePairTableKey(
  facePairs =
    FIGURE_EIGHT_FACE_PAIRS
) {
  return facePairs
    .map(
      (pair) =>
        `${pair.id}:` +
        `${pair.A.join("")}>` +
        `${pair.B.join("")}`
    )
    .join("|");
}

function bridgeRouteSpecArrayKey(
  routeSpecs,
  facePairs =
    FIGURE_EIGHT_FACE_PAIRS
) {
  return facePairs.map(
    (_, pairId) =>
      bridgeRouteSpecKey(
        routeSpecs?.[pairId] ?? null
      )
  ).join("|");
}

function interpolateBridgeRouteSpec(
  startRouteSpec,
  targetRouteSpec,
  amount,
  transitionPhase = amount
) {
  const target =
    normalizeBridgeRouteSpec(
      targetRouteSpec,
      targetRouteSpec.lane
    );

  const start =
    startRouteSpec === null
      ? target
      : normalizeBridgeRouteSpec(
          startRouteSpec,
          startRouteSpec.lane
        );

  const progress = Math.max(
    0,
    Math.min(1, amount)
  );

  const clearanceEnvelope =
    bridgeTransitionClearanceEnvelope(
      Math.max(
        0,
        Math.min(
          1,
          transitionPhase
        )
      )
    );

  return {
    ...target,
    archDistance:
      start.archDistance +
      (
        target.archDistance -
        start.archDistance
      ) *
        progress +
      target.transitionClearance *
        clearanceEnvelope,
    lateralOffset:
      start.lateralOffset +
      (
        target.lateralOffset -
        start.lateralOffset
      ) *
        progress,
    midScale:
      start.midScale +
      (
        target.midScale -
        start.midScale
      ) *
        progress,
    sectionScale:
      start.sectionScale +
      (
        target.sectionScale -
        start.sectionScale
      ) *
        progress,
  };
}

function useAnimatedBridgeRouteSpecs(
  targetRouteSpecs,
  duration =
    BRIDGE_ROUTE_CHANGE_DURATION_MS,
  facePairs =
    FIGURE_EIGHT_FACE_PAIRS
) {
  const normalizedTargets =
    facePairs.map(
      (_, pairId) => {
        const target =
          targetRouteSpecs?.[
            pairId
          ] ?? null;

        return target === null
          ? null
          : normalizeBridgeRouteSpec(
              target,
              target.lane
            );
      }
    );

  const targetKey =
    `${facePairTableKey(facePairs)}::` +
    bridgeRouteSpecArrayKey(
      normalizedTargets,
      facePairs
    );

  const [animatedSpecs, setAnimatedSpecs] =
    useState(normalizedTargets);

  const animatedSpecsRef =
    useRef(normalizedTargets);

  useEffect(() => {
    const startSpecs =
      normalizedTargets.map(
        (target, pairId) =>
          target === null
            ? null
            : animatedSpecsRef
                .current[pairId] ??
              target
      );

    const changed =
      normalizedTargets.some(
        (target, pairId) =>
          bridgeRouteSpecKey(
            target
          ) !==
          bridgeRouteSpecKey(
            animatedSpecsRef
              .current[pairId] ??
              null
          )
      );

    const requiresAnimation =
      normalizedTargets.some(
        (target, pairId) => {
          const current =
            animatedSpecsRef
              .current[pairId] ??
            null;

          return (
            target !== null &&
            current !== null &&
            bridgeRouteSpecKey(
              target
            ) !==
              bridgeRouteSpecKey(
                current
              )
          );
        }
      );

    if (
      !changed ||
      !requiresAnimation
    ) {
      animatedSpecsRef.current =
        normalizedTargets;

      setAnimatedSpecs(
        normalizedTargets
      );

      return undefined;
    }

    const startedAt =
      performance.now();

    let frameId = null;

    function animate(now) {
      const raw = Math.max(
        0,
        Math.min(
          1,
          (now - startedAt) /
            duration
        )
      );

      const eased =
        bridgeTransitionMappingProgress(
          raw
        );

      const nextSpecs =
        normalizedTargets.map(
          (target, pairId) =>
            target === null
              ? null
              : interpolateBridgeRouteSpec(
                  startSpecs[
                    pairId
                  ],
                  target,
                  eased,
                  raw
                )
        );

      animatedSpecsRef.current =
        nextSpecs;

      setAnimatedSpecs(nextSpecs);

      if (raw < 1) {
        frameId =
          requestAnimationFrame(
            animate
          );
      }
    }

    frameId =
      requestAnimationFrame(animate);

    return () => {
      if (frameId !== null) {
        cancelAnimationFrame(
          frameId
        );
      }
    };
  }, [targetKey, duration]);

  return animatedSpecs;
}

function quinticBezierPoint(
  controls,
  amount
) {
  const t = Math.max(
    0,
    Math.min(1, amount)
  );

  const inverse =
    1 - t;

  const weights = [
    inverse ** 5,
    5 * inverse ** 4 * t,
    10 * inverse ** 3 * t ** 2,
    10 * inverse ** 2 * t ** 3,
    5 * inverse * t ** 4,
    t ** 5,
  ];

  return controls.reduce(
    (point, control, index) =>
      addPoint(
        point,
        multiplyPoint(
          control,
          weights[index]
        )
      ),
    {
      x: 0,
      y: 0,
      z: 0,
    }
  );
}

function quinticBezierDerivative(
  controls,
  amount
) {
  const t = Math.max(
    0,
    Math.min(1, amount)
  );

  const inverse =
    1 - t;

  const derivativeWeights = [
    inverse ** 4,
    4 * inverse ** 3 * t,
    6 * inverse ** 2 * t ** 2,
    4 * inverse * t ** 3,
    t ** 4,
  ];

  return derivativeWeights.reduce(
    (point, weight, index) =>
      addPoint(
        point,
        multiplyPoint(
          subtractPoint(
            controls[index + 1],
            controls[index]
          ),
          5 * weight
        )
      ),
    {
      x: 0,
      y: 0,
      z: 0,
    }
  );
}

function quinticBezierTangent(
  controls,
  amount
) {
  return normalizePoint(
    quinticBezierDerivative(
      controls,
      amount
    )
  );
}

function perpendicularComponent(
  vector,
  normal
) {
  return subtractPoint(
    vector,
    multiplyPoint(
      normal,
      dotPoint(
        vector,
        normal
      )
    )
  );
}

function bridgeFrameAxis(
  facePoints,
  center,
  tangent
) {
  for (
    let vertexIndex = 0;
    vertexIndex <
      facePoints.length;
    vertexIndex += 1
  ) {
    const candidate =
      perpendicularComponent(
        subtractPoint(
          facePoints[
            vertexIndex
          ],
          center
        ),
        tangent
      );

    if (
      Math.hypot(
        candidate.x,
        candidate.y,
        candidate.z
      ) >
      FACE_CONSTRAINT_EPSILON
    ) {
      return normalizePoint(
        candidate
      );
    }
  }

  const fallback =
    Math.abs(tangent.x) < 0.8
      ? {
          x: 1,
          y: 0,
          z: 0,
        }
      : {
          x: 0,
          y: 1,
          z: 0,
        };

  return normalizePoint(
    perpendicularComponent(
      fallback,
      tangent
    )
  );
}

function quaternionBetweenDirections(
  fromDirection,
  toDirection
) {
  const from =
    normalizePoint(
      fromDirection
    );

  const to =
    normalizePoint(
      toDirection
    );

  const cosine = Math.max(
    -1,
    Math.min(
      1,
      dotPoint(from, to)
    )
  );

  if (cosine > 0.999999) {
    return {
      w: 1,
      x: 0,
      y: 0,
      z: 0,
    };
  }

  if (cosine < -0.999999) {
    const fallback =
      Math.abs(from.x) < 0.8
        ? {
            x: 1,
            y: 0,
            z: 0,
          }
        : {
            x: 0,
            y: 1,
            z: 0,
          };

    const axis =
      normalizePoint(
        crossPoint(
          from,
          fallback
        )
      );

    return {
      w: 0,
      x: axis.x,
      y: axis.y,
      z: axis.z,
    };
  }

  const axis =
    crossPoint(
      from,
      to
    );

  const scale =
    Math.sqrt(
      2 *
      (
        1 +
        cosine
      )
    );

  return {
    w: scale / 2,
    x: axis.x / scale,
    y: axis.y / scale,
    z: axis.z / scale,
  };
}

function rotateAroundAxis(
  vector,
  axis,
  angle
) {
  const direction =
    normalizePoint(axis);

  const cosine =
    Math.cos(angle);

  const sine =
    Math.sin(angle);

  return addPoint(
    addPoint(
      multiplyPoint(
        vector,
        cosine
      ),
      multiplyPoint(
        crossPoint(
          direction,
          vector
        ),
        sine
      )
    ),
    multiplyPoint(
      direction,
      dotPoint(
        direction,
        vector
      ) *
        (
          1 -
          cosine
        )
    )
  );
}

function signedAngleAroundAxis(
  fromVector,
  toVector,
  axis
) {
  const direction =
    normalizePoint(axis);

  const from =
    normalizePoint(
      perpendicularComponent(
        fromVector,
        direction
      )
    );

  const to =
    normalizePoint(
      perpendicularComponent(
        toVector,
        direction
      )
    );

  return Math.atan2(
    dotPoint(
      crossPoint(
        from,
        to
      ),
      direction
    ),
    dotPoint(
      from,
      to
    )
  );
}

function outwardFaceNormal(
  facePoints,
  bodyCenter
) {
  const center =
    averageWorldPoint(
      facePoints
    );

  let normal =
    faceFrame(
      facePoints
    ).normal;

  if (
    dotPoint(
      normal,
      subtractPoint(
        center,
        bodyCenter
      )
    ) <
    0
  ) {
    normal =
      multiplyPoint(
        normal,
        -1
      );
  }

  return normal;
}

function makeFaceIdentificationBridgeModel({
  positions,
  pairing,
  progress,
  bridgeSpanScale = 1,
  bridgeIndex = 0,
  routeLane = 0,
  routeSpec = null,
  mappingTurn = 0,
  sceneCenter,
  geometry =
    DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY,
}) {
  const pairId =
    Number.isInteger(
      pairing?.id
    )
      ? pairing.id
      : null;

  const {
    sourceColor:
      bridgeSourceColor,
    targetColor:
      bridgeTargetColor,
  } = bridgeEndpointFaceColors(
    pairing
  );

  const amount = Math.max(
    0,
    Math.min(1, progress)
  );

  const spanScale = Math.max(
    0,
    Math.min(
      1,
      bridgeSpanScale
    )
  );

  const resolvedRouteSpec =
    normalizeBridgeRouteSpec(
      routeSpec,
      routeLane
    );

  const resolvedRouteLane =
    resolvedRouteSpec.lane;

  const emptyModel = {
    bridgeIndex,
    pairId,
    pairing:
      pairing ?? null,
    progress: amount,
    bridgeSpanScale:
      spanScale,
    routeLane:
      resolvedRouteLane,
    routeSpec:
      resolvedRouteSpec,
    mappingTurn,
    sourceColor:
      bridgeSourceColor,
    targetColor:
      bridgeTargetColor,
    route: null,
    parameters: [],
    centerline: [],
    tangents: [],
    sections: [],
    triangles: [],
    worldFaces: [],
    totalArcLength: 0,
    visibleSegmentCount: 0,
  };

  if (
    pairId === null ||
    amount <=
      FACE_CONSTRAINT_EPSILON
  ) {
    return emptyModel;
  }

  const faceA =
    faceWorldPointsForPair(
      positions,
      "A",
      pairId,
      geometry
    );

  const baseFaceB =
    faceWorldPointsForPair(
      positions,
      "B",
      pairId,
      geometry
    );

  const centerA =
    averageWorldPoint(
      faceA
    );

  const centerB =
    averageWorldPoint(
      baseFaceB
    );

  const bodyCenterA =
    averageWorldPoint(
      positions.A
    );

  const bodyCenterB =
    averageWorldPoint(
      positions.B
    );

  const outwardA =
    outwardFaceNormal(
      faceA,
      bodyCenterA
    );

  const outwardB =
    outwardFaceNormal(
      baseFaceB,
      bodyCenterB
    );

  const routeDirection =
    bridgeRouteDirection(
      centerA,
      centerB,
      sceneCenter,
      pairId
    );

  const routeSideDirection =
    bridgeRouteSideDirection(
      centerA,
      centerB,
      routeDirection,
      pairId
    );

  const routeArchDistance =
    resolvedRouteSpec
      .archDistance *
    spanScale;

  const routeLateralOffset =
    resolvedRouteSpec
      .lateralOffset *
    spanScale;

  const routeMidScale =
    resolvedRouteSpec
      .midScale;

  const routeSectionScale =
    resolvedRouteSpec
      .sectionScale;

  const collarFraction =
    SECOND_FACE_BRIDGE_COLLAR_FRACTION;

  const bridgeCollarLength =
    SECOND_FACE_BRIDGE_COLLAR *
    spanScale;

  const middleFraction =
    1 -
    2 * collarFraction;

  const startCollarCenter =
    addPoint(
      centerA,
      multiplyPoint(
        outwardA,
        bridgeCollarLength
      )
    );

  const endCollarCenter =
    addPoint(
      centerB,
      multiplyPoint(
        outwardB,
        bridgeCollarLength
      )
    );

  const middleChordLength =
    pointDistance(
      startCollarCenter,
      endCollarCenter
    );

  /*
   * Match the derivative of each straight collar after
   * converting from the full bridge parameter to the
   * middle section's local parameter. This makes the
   * centerline C1-continuous at both collar junctions.
   */
  const middleTangentMagnitude =
    bridgeCollarLength *
    middleFraction /
    collarFraction;

  const startDerivative =
    multiplyPoint(
      outwardA,
      Math.max(
        middleTangentMagnitude * 3,
        middleChordLength * 0.36
      )
    );

  const endDerivative =
    multiplyPoint(
      outwardB,
      -Math.max(
        middleTangentMagnitude * 3,
        middleChordLength * 0.36
      )
    );

  /*
   * A quintic Bézier with these controls has the
   * requested endpoint derivatives and zero endpoint
   * second derivatives. The straight collars therefore
   * meet the curved middle with matching position,
   * tangent, and curvature.
   */
  const middleControls = [
    startCollarCenter,
    addPoint(
      startCollarCenter,
      multiplyPoint(
        startDerivative,
        1 / 5
      )
    ),
    addPoint(
      startCollarCenter,
      multiplyPoint(
        startDerivative,
        2 / 5
      )
    ),
    subtractPoint(
      endCollarCenter,
      multiplyPoint(
        endDerivative,
        2 / 5
      )
    ),
    subtractPoint(
      endCollarCenter,
      multiplyPoint(
        endDerivative,
        1 / 5
      )
    ),
    endCollarCenter,
  ];

  /*
   * This sixth-degree envelope is zero together with
   * its first two derivatives at both ends. It pushes
   * the middle route outward without reintroducing a
   * corner at either collar.
   */
  function archEnvelope(parameter) {
    const t = Math.max(
      0,
      Math.min(1, parameter)
    );

    return (
      64 *
      t *
      t *
      t *
      (
        1 - t
      ) *
      (
        1 - t
      ) *
      (
        1 - t
      )
    );
  }

  function archEnvelopeDerivative(
    parameter
  ) {
    const t = Math.max(
      0,
      Math.min(1, parameter)
    );

    return (
      192 *
      t *
      t *
      (
        1 - t
      ) *
      (
        1 - t
      ) *
      (
        1 -
        2 * t
      )
    );
  }

  function routeOffset(
    envelopeAmount
  ) {
    const radialOffset =
      multiplyPoint(
        routeDirection,
        routeArchDistance *
          envelopeAmount
      );

    if (
      Math.abs(
        routeLateralOffset
      ) <
      FACE_CONSTRAINT_EPSILON
    ) {
      return radialOffset;
    }

    return addPoint(
      radialOffset,
      multiplyPoint(
        routeSideDirection,
        routeLateralOffset *
          envelopeAmount
      )
    );
  }

  function middlePoint(parameter) {
    return addPoint(
      quinticBezierPoint(
        middleControls,
        parameter
      ),
      routeOffset(
        archEnvelope(
          parameter
        )
      )
    );
  }

  function middleDerivative(parameter) {
    return addPoint(
      quinticBezierDerivative(
        middleControls,
        parameter
      ),
      routeOffset(
        archEnvelopeDerivative(
          parameter
        )
      )
    );
  }

  function middleParameter(
    parameter
  ) {
    return Math.max(
      0,
      Math.min(
        1,
        (
          parameter -
          collarFraction
        ) /
          middleFraction
      )
    );
  }

  function centerAt(parameter) {
    if (
      parameter <=
      collarFraction
    ) {
      const local =
        parameter /
        collarFraction;

      return addPoint(
        centerA,
        multiplyPoint(
          outwardA,
          bridgeCollarLength *
          local
        )
      );
    }

    if (
      parameter >=
      1 - collarFraction
    ) {
      const local =
        (
          parameter -
          (
            1 - collarFraction
          )
        ) /
        collarFraction;

      return addPoint(
        centerB,
        multiplyPoint(
          outwardB,
          bridgeCollarLength *
          (
            1 - local
          )
        )
      );
    }

    return middlePoint(
      middleParameter(
        parameter
      )
    );
  }

  function tangentAt(parameter) {
    if (
      parameter <=
      collarFraction
    ) {
      return outwardA;
    }

    if (
      parameter >=
      1 - collarFraction
    ) {
      return multiplyPoint(
        outwardB,
        -1
      );
    }

    return normalizePoint(
      middleDerivative(
        middleParameter(
          parameter
        )
      )
    );
  }

  /*
   * Uniform parameter intervals create visibly bunched
   * rings wherever the centerline moves slowly. Build a
   * dense arc-length table, then place the rendered
   * rings at equal physical distances along the bridge.
   */
  const arcSamples =
    Array.from(
      {
        length:
          SECOND_FACE_BRIDGE_ARC_SAMPLES +
          1,
      },
      (_, index) => {
        const parameter =
          index /
          SECOND_FACE_BRIDGE_ARC_SAMPLES;

        return {
          parameter,
          point:
            centerAt(
              parameter
            ),
          length: 0,
        };
      }
    );

  for (
    let sampleIndex = 1;
    sampleIndex <
      arcSamples.length;
    sampleIndex += 1
  ) {
    arcSamples[
      sampleIndex
    ].length =
      arcSamples[
        sampleIndex - 1
      ].length +
      pointDistance(
        arcSamples[
          sampleIndex - 1
        ].point,
        arcSamples[
          sampleIndex
        ].point
      );
  }

  const totalArcLength =
    arcSamples[
      arcSamples.length - 1
    ].length;

  function parameterAtArcFraction(
    fraction
  ) {
    const targetLength =
      Math.max(
        0,
        Math.min(1, fraction)
      ) *
      totalArcLength;

    let upperIndex = 1;

    while (
      upperIndex <
        arcSamples.length &&
      arcSamples[
        upperIndex
      ].length <
        targetLength
    ) {
      upperIndex += 1;
    }

    if (
      upperIndex >=
      arcSamples.length
    ) {
      return 1;
    }

    const lowerSample =
      arcSamples[
        upperIndex - 1
      ];

    const upperSample =
      arcSamples[
        upperIndex
      ];

    const lengthSpan =
      upperSample.length -
      lowerSample.length;

    const local =
      lengthSpan <=
        FACE_CONSTRAINT_EPSILON
        ? 0
        : (
            targetLength -
            lowerSample.length
          ) /
          lengthSpan;

    return (
      lowerSample.parameter +
      (
        upperSample.parameter -
        lowerSample.parameter
      ) *
      local
    );
  }

  const ringCount =
    SECOND_FACE_BRIDGE_SEGMENTS +
    1;

  const parameters =
    Array.from(
      {
        length: ringCount,
      },
      (_, index) =>
        parameterAtArcFraction(
          index /
          SECOND_FACE_BRIDGE_SEGMENTS
        )
    );

  const centers =
    parameters.map(
      centerAt
    );

  const tangents =
    parameters.map(
      tangentAt
    );

  const startU =
    bridgeFrameAxis(
      faceA,
      centerA,
      outwardA
    );

  const startV =
    normalizePoint(
      crossPoint(
        outwardA,
        startU
      )
    );

  const endTangent =
    multiplyPoint(
      outwardB,
      -1
    );

  const baseFirstOffset =
    subtractPoint(
      baseFaceB[0],
      centerB
    );

  const oneTurnOffset =
    subtractPoint(
      baseFaceB[2],
      centerB
    );

  const anglePerMappingTurn =
    signedAngleAroundAxis(
      baseFirstOffset,
      oneTurnOffset,
      endTangent
    );

  const nearestIntegerTurn =
    Math.round(
      mappingTurn
    );

  const settledMapping =
    Math.abs(
      mappingTurn -
      nearestIntegerTurn
    ) <
    1e-8;

  const faceB =
    settledMapping
      ? cyclicallyShiftPoints(
          baseFaceB,
          2 *
            normalizeCyclicMappingIndex(
              nearestIntegerTurn
            )
        )
      : baseFaceB.map(
          (point) =>
            addPoint(
              centerB,
              rotateAroundAxis(
                subtractPoint(
                  point,
                  centerB
                ),
                endTangent,
                anglePerMappingTurn *
                  mappingTurn
              )
            )
        );

  /*
   * Bridge color and bridge twist encode independent data:
   *
   *   color = which whole faces are identified
   *   twist = which cyclic vertex correspondence is selected
   *
   * The endpoint colors were resolved above. The geometric
   * face-map rotation below remains unchanged.
   */
  const targetU =
    bridgeFrameAxis(
      faceB,
      centerB,
      endTangent
    );

  const targetV =
    normalizePoint(
      crossPoint(
        endTangent,
        targetU
      )
    );

  /*
   * Rotation-minimizing transport preserves a stable
   * cross-sectional frame around the entire centerline.
   */
  const transportedFrames = [
    {
      u: startU,
      v: startV,
    },
  ];

  for (
    let ringIndex = 1;
    ringIndex < ringCount;
    ringIndex += 1
  ) {
    const previousFrame =
      transportedFrames[
        ringIndex - 1
      ];

    const transportRotation =
      quaternionBetweenDirections(
        tangents[
          ringIndex - 1
        ],
        tangents[
          ringIndex
        ]
      );

    let transportedU =
      rotatePointByQuaternion(
        previousFrame.u,
        transportRotation
      );

    transportedU =
      normalizePoint(
        perpendicularComponent(
          transportedU,
          tangents[
            ringIndex
          ]
        )
      );

    const transportedV =
      normalizePoint(
        crossPoint(
          tangents[
            ringIndex
          ],
          transportedU
        )
      );

    transportedFrames.push({
      u: transportedU,
      v: transportedV,
    });
  }

  const finalTwist =
    signedAngleAroundAxis(
      transportedFrames[
        ringCount - 1
      ].u,
      targetU,
      endTangent
    );

  const sourceCoordinates =
    faceA.map(
      (point) => {
        const offset =
          subtractPoint(
            point,
            centerA
          );

        return {
          x:
            dotPoint(
              offset,
              startU
            ),
          y:
            dotPoint(
              offset,
              startV
            ),
        };
      }
    );

  const targetCoordinates =
    faceB.map(
      (point) => {
        const offset =
          subtractPoint(
            point,
            centerB
          );

        return {
          x:
            dotPoint(
              offset,
              targetU
            ),
          y:
            dotPoint(
              offset,
              targetV
            ),
        };
      }
    );

  function pointInSectionFrame(
    center,
    frameU,
    frameV,
    coordinate,
    scale
  ) {
    return addPoint(
      center,
      addPoint(
        multiplyPoint(
          frameU,
          coordinate.x * scale
        ),
        multiplyPoint(
          frameV,
          coordinate.y * scale
        )
      )
    );
  }

  function baseSectionScale(
    parameter
  ) {
    if (
      parameter <=
      collarFraction
    ) {
      const local =
        smootherUnitInterval(
          parameter /
          collarFraction
        );

      return (
        1 +
        (
          routeMidScale -
          1
        ) *
        local
      );
    }

    if (
      parameter >=
      1 - collarFraction
    ) {
      const local =
        smootherUnitInterval(
          (
            parameter -
            (
              1 - collarFraction
            )
          ) /
          collarFraction
        );

      return (
        routeMidScale +
        (
          1 -
          routeMidScale
        ) *
        local
      );
    }

    const middleProgress =
      middleParameter(
        parameter
      );

    return (
      routeMidScale *
      (
        1 -
        0.05 *
        archEnvelope(
          middleProgress
        )
      )
    );
  }

  function desiredSectionScale(
    parameter
  ) {
    return (
      baseSectionScale(parameter) *
      routeSectionScale
    );
  }

  function sectionAtIndex(
    ringIndex
  ) {
    const parameter =
      parameters[
        ringIndex
      ];

    if (
      parameter <=
      collarFraction
    ) {
      const scale =
        desiredSectionScale(
          parameter
        );

      return sourceCoordinates.map(
        (coordinate) =>
          pointInSectionFrame(
            centers[
              ringIndex
            ],
            startU,
            startV,
            coordinate,
            scale
          )
      );
    }

    if (
      parameter >=
      1 - collarFraction
    ) {
      const scale =
        desiredSectionScale(
          parameter
        );

      return targetCoordinates.map(
        (coordinate) =>
          pointInSectionFrame(
            centers[
              ringIndex
            ],
            targetU,
            targetV,
            coordinate,
            scale
          )
      );
    }

    const middleProgress =
      middleParameter(
        parameter
      );

    /*
     * Quintic smootherstep gives zero twist velocity and
     * zero twist acceleration at both collar junctions.
     */
    const smoothMiddleProgress =
      smootherUnitInterval(
        middleProgress
      );

    const twist =
      finalTwist *
      smoothMiddleProgress;

    const frameU =
      normalizePoint(
        rotateAroundAxis(
          transportedFrames[
            ringIndex
          ].u,
          tangents[
            ringIndex
          ],
          twist
        )
      );

    const frameV =
      normalizePoint(
        crossPoint(
          tangents[
            ringIndex
          ],
          frameU
        )
      );

    const scale =
      desiredSectionScale(
        parameter
      );

    return sourceCoordinates.map(
      (
        sourceCoordinate,
        vertexIndex
      ) => {
        const targetCoordinate =
          targetCoordinates[
            vertexIndex
          ];

        return pointInSectionFrame(
          centers[
            ringIndex
          ],
          frameU,
          frameV,
          {
            x:
              sourceCoordinate.x +
              (
                targetCoordinate.x -
                sourceCoordinate.x
              ) *
              smoothMiddleProgress,
            y:
              sourceCoordinate.y +
              (
                targetCoordinate.y -
                sourceCoordinate.y
              ) *
              smoothMiddleProgress,
          },
          scale
        );
      }
    );
  }

  const sections =
    parameters.map(
      (_, ringIndex) =>
        sectionAtIndex(
          ringIndex
        )
    );

  /*
   * Preserve exact attachment geometry at both ends.
   */
  sections[0] =
    faceA.map((point) =>
      addPoint(
        centerA,
        multiplyPoint(
          subtractPoint(
            point,
            centerA
          ),
          routeSectionScale
        )
      )
    );

  sections[
    sections.length - 1
  ] =
    faceB.map((point) =>
      addPoint(
        centerB,
        multiplyPoint(
          subtractPoint(
            point,
            centerB
          ),
          routeSectionScale
        )
      )
    );

  /*
   * Retain a complete world-space triangle mesh for
   * route planning and collision tests. These triangles
   * describe the full bridge even while the visible
   * construction is only partially extended.
   */
  const triangles = [];

  for (
    let segmentIndex = 0;
    segmentIndex <
      SECOND_FACE_BRIDGE_SEGMENTS;
    segmentIndex += 1
  ) {
    const startSection =
      sections[
        segmentIndex
      ];

    const endSection =
      sections[
        segmentIndex + 1
      ];

    startSection.forEach(
      (_, vertexIndex) => {
        const nextVertexIndex =
          (
            vertexIndex +
            1
          ) %
          startSection.length;

        const first =
          startSection[
            vertexIndex
          ];

        const second =
          startSection[
            nextVertexIndex
          ];

        const third =
          endSection[
            nextVertexIndex
          ];

        const fourth =
          endSection[
            vertexIndex
          ];

        triangles.push(
          {
            key:
              `solid-bridge-mesh-${bridgeIndex}-` +
              `${pairId}-${segmentIndex}-` +
              `${vertexIndex}-0`,
            bridgeIndex,
            pairId,
            routeLane:
              resolvedRouteLane,
            mappingTurn,
            segmentIndex,
            sideIndex:
              vertexIndex,
            triangleIndex: 0,
            points: [
              first,
              second,
              third,
            ],
          },
          {
            key:
              `solid-bridge-mesh-${bridgeIndex}-` +
              `${pairId}-${segmentIndex}-` +
              `${vertexIndex}-1`,
            bridgeIndex,
            pairId,
            routeLane:
              resolvedRouteLane,
            mappingTurn,
            segmentIndex,
            sideIndex:
              vertexIndex,
            triangleIndex: 1,
            points: [
              first,
              third,
              fourth,
            ],
          }
        );
      }
    );
  }

  const worldFaces = [];

  const completedSegments =
    Math.floor(
      amount *
      SECOND_FACE_BRIDGE_SEGMENTS
    );

  const partialSegmentAmount =
    amount *
    SECOND_FACE_BRIDGE_SEGMENTS -
    completedSegments;

  const visibleSegmentCount =
    Math.min(
      SECOND_FACE_BRIDGE_SEGMENTS,
      completedSegments +
      (
        partialSegmentAmount >
        FACE_CONSTRAINT_EPSILON
          ? 1
          : 0
      )
    );

  for (
    let segmentIndex = 0;
    segmentIndex <
      visibleSegmentCount;
    segmentIndex += 1
  ) {
    const startSection =
      sections[
        segmentIndex
      ];

    const fullEndSection =
      sections[
        segmentIndex + 1
      ];

    const segmentProgress =
      segmentIndex <
      completedSegments
        ? 1
        : partialSegmentAmount;

    const endSection =
      fullEndSection.map(
        (point, vertexIndex) =>
          lerpPoint(
            startSection[
              vertexIndex
            ],
            point,
            segmentProgress
          )
      );

    startSection.forEach(
      (_, vertexIndex) => {
        const nextVertexIndex =
          (
            vertexIndex +
            1
          ) %
          startSection.length;

        worldFaces.push({
          key:
            `solid-bridge-${bridgeIndex}-` +
            `${pairId}-${segmentIndex}-` +
            `${vertexIndex}`,
          kind:
            "solid-bridge-side",
          bridgeIndex,
          routeLane:
            resolvedRouteLane,
          mappingTurn,
          segmentIndex,
          sideIndex:
            vertexIndex,
          sourceColor:
            bridgeSourceColor,
          targetColor:
            bridgeTargetColor,
          bridgeColor:
            (
              segmentIndex +
              0.5
            ) <
            SECOND_FACE_BRIDGE_SEGMENTS /
              2
              ? bridgeSourceColor
              : bridgeTargetColor,
          points: [
            startSection[
              vertexIndex
            ],
            startSection[
              nextVertexIndex
            ],
            endSection[
              nextVertexIndex
            ],
            endSection[
              vertexIndex
            ],
          ],
          fillOpacity:
            0.18 +
            0.08 *
            amount,
          strokeOpacity:
            0.62 +
            0.24 *
            amount,
        });
      }
    );
  }

  if (
    amount <
    SECOND_FACE_BRIDGE_FULL_STRENGTH
  ) {
    let frontSection;

    if (
      visibleSegmentCount === 0
    ) {
      frontSection =
        sections[0];
    } else {
      const lastSegmentIndex =
        visibleSegmentCount - 1;

      const startSection =
        sections[
          lastSegmentIndex
        ];

      const endSection =
        sections[
          lastSegmentIndex + 1
        ];

      const segmentProgress =
        lastSegmentIndex <
        completedSegments
          ? 1
          : partialSegmentAmount;

      frontSection =
        endSection.map(
          (point, vertexIndex) =>
            lerpPoint(
              startSection[
                vertexIndex
              ],
              point,
              segmentProgress
            )
        );
    }

    worldFaces.push({
      key:
        `solid-bridge-${bridgeIndex}-` +
        `${pairId}-front`,
      kind:
        "solid-bridge-front",
      bridgeIndex,
      routeLane:
        resolvedRouteLane,
      mappingTurn,
      bridgeFront: true,
      sourceColor:
        bridgeSourceColor,
      targetColor:
        bridgeTargetColor,
      bridgeColor:
        amount < 0.5
          ? bridgeSourceColor
          : bridgeTargetColor,
      points:
        frontSection,
      fillOpacity: 0.3,
      strokeOpacity: 0.92,
    });
  }

  return {
    bridgeIndex,
    pairId,
    pairing,
    progress: amount,
    bridgeSpanScale:
      spanScale,
    routeLane:
      resolvedRouteLane,
    routeSpec:
      resolvedRouteSpec,
    mappingTurn,
    sourceColor:
      bridgeSourceColor,
    targetColor:
      bridgeTargetColor,
    route: {
      id:
        resolvedRouteSpec.id,
      kind:
        resolvedRouteSpec.kind,
      family:
        resolvedRouteSpec.family,
      lane:
        resolvedRouteLane,
      direction:
        clonePoint(
          routeDirection
        ),
      sideDirection:
        clonePoint(
          routeSideDirection
        ),
      sceneCenter:
        clonePoint(
          sceneCenter
        ),
      startFaceCenter:
        clonePoint(
          centerA
        ),
      endFaceCenter:
        clonePoint(
          centerB
        ),
      startCollarCenter:
        clonePoint(
          startCollarCenter
        ),
      endCollarCenter:
        clonePoint(
          endCollarCenter
        ),
      outwardA:
        clonePoint(
          outwardA
        ),
      outwardB:
        clonePoint(
          outwardB
        ),
      collarLength:
        bridgeCollarLength,
      spanScale,
      collarFraction:
        SECOND_FACE_BRIDGE_COLLAR_FRACTION,
      archDistance:
        routeArchDistance,
      lateralOffset:
        routeLateralOffset,
      midScale:
        routeMidScale,
      finalTwist,
    },
    parameters,
    centerline:
      centers,
    tangents,
    sections,
    triangles,
    worldFaces,
    totalArcLength,
    visibleSegmentCount,
  };
}


function bridgeAuditBounds(points) {
  return points.reduce(
    (bounds, point) => ({
      minX: Math.min(bounds.minX, point.x),
      maxX: Math.max(bounds.maxX, point.x),
      minY: Math.min(bounds.minY, point.y),
      maxY: Math.max(bounds.maxY, point.y),
      minZ: Math.min(bounds.minZ, point.z),
      maxZ: Math.max(bounds.maxZ, point.z),
    }),
    {
      minX: Infinity,
      maxX: -Infinity,
      minY: Infinity,
      maxY: -Infinity,
      minZ: Infinity,
      maxZ: -Infinity,
    }
  );
}

function bridgeAuditBoundsOverlap(
  first,
  second
) {
  const epsilon =
    BRIDGE_AUDIT_EPSILON;

  return !(
    first.maxX + epsilon <
      second.minX ||
    second.maxX + epsilon <
      first.minX ||
    first.maxY + epsilon <
      second.minY ||
    second.maxY + epsilon <
      first.minY ||
    first.maxZ + epsilon <
      second.minZ ||
    second.maxZ + epsilon <
      first.minZ
  );
}

function bridgeAuditSharesPoint(
  first,
  second
) {
  return first.some(
    (firstPoint) =>
      second.some(
        (secondPoint) =>
          pointDistance(
            firstPoint,
            secondPoint
          ) <=
          BRIDGE_AUDIT_EPSILON
      )
  );
}

function bridgeAuditProjectionRange(
  triangle,
  axis
) {
  const projections =
    triangle.map(
      (point) =>
        dotPoint(point, axis)
    );

  return {
    minimum:
      Math.min(...projections),
    maximum:
      Math.max(...projections),
  };
}

function bridgeAuditAxisSeparates(
  first,
  second,
  axis
) {
  if (
    Math.hypot(
      axis.x,
      axis.y,
      axis.z
    ) <=
    BRIDGE_AUDIT_EPSILON
  ) {
    return false;
  }

  const firstRange =
    bridgeAuditProjectionRange(
      first,
      axis
    );

  const secondRange =
    bridgeAuditProjectionRange(
      second,
      axis
    );

  return (
    firstRange.maximum <
      secondRange.minimum -
        BRIDGE_AUDIT_EPSILON ||
    secondRange.maximum <
      firstRange.minimum -
        BRIDGE_AUDIT_EPSILON
  );
}

function bridgeAuditTrianglesIntersect(
  first,
  second
) {
  const firstEdges = [
    subtractPoint(
      first[1],
      first[0]
    ),
    subtractPoint(
      first[2],
      first[1]
    ),
    subtractPoint(
      first[0],
      first[2]
    ),
  ];

  const secondEdges = [
    subtractPoint(
      second[1],
      second[0]
    ),
    subtractPoint(
      second[2],
      second[1]
    ),
    subtractPoint(
      second[0],
      second[2]
    ),
  ];

  const axes = [
    crossPoint(
      firstEdges[0],
      firstEdges[1]
    ),
    crossPoint(
      secondEdges[0],
      secondEdges[1]
    ),
  ];

  firstEdges.forEach(
    (firstEdge) => {
      secondEdges.forEach(
        (secondEdge) => {
          axes.push(
            crossPoint(
              firstEdge,
              secondEdge
            )
          );
        }
      );
    }
  );

  return !axes.some(
    (axis) =>
      bridgeAuditAxisSeparates(
        first,
        second,
        axis
      )
  );
}

function bridgeAuditTriangleRecords(
  triangles
) {
  return triangles
    .map(
      (triangle) => ({
        triangle,
        bounds:
          bridgeAuditBounds(
            triangle.points
          ),
      })
    )
    .sort(
      (first, second) =>
        first.bounds.minX -
        second.bounds.minX
    );
}

function bridgeAuditIntersectionSummary(
  firstTriangles,
  secondTriangles = null,
  shouldSkipPair = null
) {
  const sameSurface =
    secondTriangles === null;

  const firstRecords =
    bridgeAuditTriangleRecords(
      firstTriangles
    );

  const secondRecords =
    sameSurface
      ? firstRecords
      : bridgeAuditTriangleRecords(
          secondTriangles
        );

  let hitCount = 0;
  let testedPairCount = 0;
  let firstHit = null;
  let secondLowerIndex = 0;

  for (
    let firstIndex = 0;
    firstIndex <
      firstRecords.length;
    firstIndex += 1
  ) {
    const firstRecord =
      firstRecords[
        firstIndex
      ];

    if (!sameSurface) {
      while (
        secondLowerIndex <
          secondRecords.length &&
        secondRecords[
          secondLowerIndex
        ].bounds.maxX +
          BRIDGE_AUDIT_EPSILON <
          firstRecord.bounds.minX
      ) {
        secondLowerIndex += 1;
      }
    }

    for (
      let secondIndex =
        sameSurface
          ? firstIndex + 1
          : secondLowerIndex;
      secondIndex <
        secondRecords.length;
      secondIndex += 1
    ) {
      const secondRecord =
        secondRecords[
          secondIndex
        ];

      if (
        secondRecord.bounds.minX >
        firstRecord.bounds.maxX +
          BRIDGE_AUDIT_EPSILON
      ) {
        break;
      }

      const sameBridgeLocalNeighbors =
        sameSurface &&
        firstRecord.triangle.bridgeIndex ===
          secondRecord.triangle.bridgeIndex &&
        firstRecord.triangle.pairId ===
          secondRecord.triangle.pairId &&
        Number.isInteger(
          firstRecord.triangle.segmentIndex
        ) &&
        Number.isInteger(
          secondRecord.triangle.segmentIndex
        ) &&
        Math.abs(
          firstRecord.triangle.segmentIndex -
            secondRecord.triangle.segmentIndex
        ) <=
          BRIDGE_AUDIT_LOCAL_SEGMENT_WINDOW;

      if (
        !bridgeAuditBoundsOverlap(
          firstRecord.bounds,
          secondRecord.bounds
        ) ||
        (
          typeof shouldSkipPair ===
            "function" &&
          shouldSkipPair(
            firstRecord.triangle,
            secondRecord.triangle
          )
        ) ||
        sameBridgeLocalNeighbors ||
        bridgeAuditSharesPoint(
          firstRecord
            .triangle.points,
          secondRecord
            .triangle.points
        )
      ) {
        continue;
      }

      testedPairCount += 1;

      if (
        !bridgeAuditTrianglesIntersect(
          firstRecord
            .triangle.points,
          secondRecord
            .triangle.points
        )
      ) {
        continue;
      }

      hitCount += 1;

      firstHit ??= {
        firstKey:
          firstRecord
            .triangle.key,
        secondKey:
          secondRecord
            .triangle.key,
      };

      if (
        hitCount >=
        BRIDGE_AUDIT_MAX_HITS
      ) {
        return {
          hitCount,
          testedPairCount,
          firstHit,
          truncated: true,
        };
      }
    }
  }

  return {
    hitCount,
    testedPairCount,
    firstHit,
    truncated: false,
  };
}

function bridgeAuditTetrahedronTriangles(
  positions,
  meshes =
    TRUNCATED_TETRAHEDRON_MESHES
) {
  return ["A", "B"].flatMap(
    (tetrahedronId) =>
      meshes[
        tetrahedronId
      ].triangles.map(
        (triangle) => ({
          key:
            `${tetrahedronId}:` +
            triangle.id,
          tetrahedronId,
          kind: triangle.kind,
          pairId:
            triangle.pairId ?? null,
          points:
            triangle
              .vertexIndices
              .map(
                (vertexIndex) =>
                  positions[
                    tetrahedronId
                  ][
                    vertexIndex
                  ]
              ),
        })
      )
  );
}

function bridgeAuditIsAttachmentContact(
  bridgeTriangle,
  tetrahedronTriangle
) {
  if (
    tetrahedronTriangle.kind !==
      "large" ||
    tetrahedronTriangle.pairId !==
      bridgeTriangle.pairId ||
    !Number.isInteger(
      bridgeTriangle.segmentIndex
    )
  ) {
    return false;
  }

  if (
    tetrahedronTriangle.tetrahedronId ===
    "A"
  ) {
    return (
      bridgeTriangle.segmentIndex <=
      BRIDGE_ATTACHMENT_AUDIT_SEGMENT_WINDOW
    );
  }

  if (
    tetrahedronTriangle.tetrahedronId ===
    "B"
  ) {
    return (
      bridgeTriangle.segmentIndex >=
      SECOND_FACE_BRIDGE_SEGMENTS -
        BRIDGE_ATTACHMENT_AUDIT_SEGMENT_WINDOW
    );
  }

  return false;
}

function analyzeBridgeCandidate({
  candidateModel,
  earlierBridgeModels,
  positions,
  geometry =
    DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY,
}) {
  const selfIntersections =
    bridgeAuditIntersectionSummary(
      candidateModel.triangles
    );

  const tetrahedronIntersections =
    bridgeAuditIntersectionSummary(
      candidateModel.triangles,
      bridgeAuditTetrahedronTriangles(
        positions,
        geometry.meshes
      ),
      bridgeAuditIsAttachmentContact
    );

  const earlierBridgeIntersections =
    earlierBridgeModels.reduce(
      (combined, earlierModel) => {
        const current =
          bridgeAuditIntersectionSummary(
            candidateModel.triangles,
            earlierModel.triangles
          );

        return {
          hitCount:
            Math.min(
              BRIDGE_AUDIT_MAX_HITS,
              combined.hitCount +
                current.hitCount
            ),
          testedPairCount:
            combined
              .testedPairCount +
            current
              .testedPairCount,
          firstHit:
            combined.firstHit ??
            current.firstHit,
          truncated:
            combined.truncated ||
            current.truncated,
        };
      },
      {
        hitCount: 0,
        testedPairCount: 0,
        firstHit: null,
        truncated: false,
      }
    );

  const status =
    selfIntersections.hitCount > 0
      ? "self-intersection"
      : tetrahedronIntersections
          .hitCount > 0
        ? "tetrahedron-intersection"
        : earlierBridgeIntersections
            .hitCount > 0
          ? "earlier-bridge-intersection"
          : "valid";

  return {
    valid:
      status === "valid",
    status,
    selfIntersections,
    tetrahedronIntersections,
    earlierBridgeIntersections,
  };
}

function bridgeAuditCacheKey({
  constructionOrder,
  facePairMappingTurns,
  bridgeIndex,
  routeId,
  obstacleRouteIds = [],
  facePairs =
    FIGURE_EIGHT_FACE_PAIRS,
}) {
  const relevantPairIds =
    constructionOrder.slice(
      0,
      bridgeIndex + 2
    );

  const settledMappings =
    relevantPairIds.map(
      (pairId) =>
        settledCyclicMappingIndex(
          facePairMappingTurns[
            pairId
          ] ?? 0
        )
    );

  if (
    settledMappings.some(
      (mappingIndex) =>
        mappingIndex === null
    )
  ) {
    return null;
  }

  return [
    facePairTableKey(facePairs),
    relevantPairIds.join(","),
    settledMappings.join(","),
    bridgeIndex,
    routeId ??
      DEFAULT_BRIDGE_ROUTE_SPEC.id,
    obstacleRouteIds.join(","),
  ].join("|");
}

function analyzeBridgeCandidateCached({
  candidateModel,
  earlierBridgeModels,
  positions,
  constructionOrder,
  facePairMappingTurns,
  pairStrengths,
  geometry =
    DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY,
}) {
  const relevantPairIds =
    constructionOrder.slice(
      0,
      candidateModel.bridgeIndex +
        2
    );

  if (
    relevantPairIds.length !==
      candidateModel.bridgeIndex +
        2 ||
    relevantPairIds.some(
      (pairId) =>
        (
          pairStrengths[
            pairId
          ] ?? 0
        ) <=
        FACE_CONSTRAINT_EPSILON
    )
  ) {
    return {
      valid: false,
      status:
        "identification-transition",
    };
  }

  const cacheKey =
    bridgeAuditCacheKey({
      constructionOrder,
      facePairMappingTurns,
      bridgeIndex:
        candidateModel.bridgeIndex,
      routeId:
        candidateModel.route?.id ??
        candidateModel.routeSpec?.id,
      obstacleRouteIds:
        earlierBridgeModels.map(
          (bridgeModel) =>
            bridgeModel.route?.id ??
            bridgeModel.routeSpec?.id ??
            DEFAULT_BRIDGE_ROUTE_SPEC.id
        ),
      facePairs:
        geometry.facePairs,
    });

  if (cacheKey === null) {
    return {
      valid: false,
      status:
        "mapping-transition",
    };
  }

  const cached =
    BRIDGE_AUDIT_CACHE.get(
      cacheKey
    );

  if (cached) {
    return cached;
  }

  const diagnostics =
    analyzeBridgeCandidate({
      candidateModel,
      earlierBridgeModels,
      positions,
      geometry,
    });

  if (
    BRIDGE_AUDIT_CACHE.size >=
    BRIDGE_AUDIT_CACHE_LIMIT
  ) {
    const oldestKey =
      BRIDGE_AUDIT_CACHE
        .keys()
        .next()
        .value;

    BRIDGE_AUDIT_CACHE.delete(
      oldestKey
    );
  }

  BRIDGE_AUDIT_CACHE.set(
    cacheKey,
    diagnostics
  );

  return diagnostics;
}

function bridgeRouteSpecForId(
  routeId
) {
  return (
    BRIDGE_ROUTE_CANDIDATE_SPECS.find(
      (routeSpec) =>
        routeSpec.id === routeId
    ) ??
    DEFAULT_BRIDGE_ROUTE_SPEC
  );
}

function bridgeRouteDisplayLabel(
  routeOrId
) {
  const routeId =
    typeof routeOrId === "string"
      ? routeOrId
      : routeOrId?.id ??
        DEFAULT_BRIDGE_ROUTE_SPEC.id;

  const labels = {
    "radial-exterior":
      "edge-adjacent center lane",
    "edge-adjacent-positive-inner":
      "edge-adjacent positive inner lane",
    "edge-adjacent-negative-inner":
      "edge-adjacent negative inner lane",
    "edge-adjacent-positive-outer":
      "edge-adjacent positive outer lane",
    "edge-adjacent-negative-outer":
      "edge-adjacent negative outer lane",
    "nonadjacent-exterior":
      "nonadjacent positive inner lane",
    "nonadjacent-negative-inner":
      "nonadjacent negative inner lane",
    "nonadjacent-positive-outer":
      "nonadjacent positive outer lane",
    "nonadjacent-negative-outer":
      "nonadjacent negative outer lane",
    "nonadjacent-center":
      "nonadjacent center lane",
  };

  return (
    labels[routeId] ??
    routeId.replaceAll("-", " ")
  );
}

function bridgeRouteComplexityPenalty(
  routeSpec
) {
  const preferredRouteSpec =
    routeSpec.bridgeType ===
    "nonadjacent"
      ? NONADJACENT_BRIDGE_ROUTE_SPEC
      : DEFAULT_BRIDGE_ROUTE_SPEC;

  if (
    routeSpec.id ===
    preferredRouteSpec.id
  ) {
    return 0;
  }

  return (
    420 +
    Math.abs(
      routeSpec.lateralOffset -
      preferredRouteSpec
        .lateralOffset
    ) * 0.18 +
    Math.abs(
      routeSpec.archDistance -
      preferredRouteSpec
        .archDistance
    ) * 0.08 +
    routeSpec.lane * 1e-3
  );
}

function bridgeRouteCandidateScore(
  bridgeModel,
  routeSpec
) {
  return (
    bridgeModel.totalArcLength +
    bridgeRouteComplexityPenalty(
      routeSpec
    )
  );
}

function bridgeSweepPositionKey(
  positions
) {
  return ["A", "B"]
    .flatMap((tetrahedronId) =>
      positions[tetrahedronId]
        .flatMap((point) => [
          point.x,
          point.y,
          point.z,
        ])
    )
    .map((value) =>
      value.toFixed(2)
    )
    .join(",");
}

function bridgeSweepRouteSelectionCacheKey({
  definitions,
  positions,
  sceneCenter,
  preferredRouteIdsByPairId,
  sweepStartRouteSpecsByPairId,
  facePairs =
    FIGURE_EIGHT_FACE_PAIRS,
}) {
  const definitionKey =
    definitions.map((definition) =>
      [
        definition.pairId,
        definition.bridgeIndex,
        definition.bridgeType,
        definition.progress.toFixed(4),
        (
          definition.bridgeSpanScale ??
          1
        ).toFixed(4),
        (
          definition.sweepStartMappingTurn ??
          definition.mappingTurn ??
          0
        ).toFixed(6),
        (
          definition.routingMappingTurn ??
          definition.mappingTurn ??
          0
        ).toFixed(6),
      ].join(":")
    ).join("|");

  const preferredKey =
    facePairs.map(
      (_, pairId) =>
        preferredRouteIdsByPairId?.[
          pairId
        ] ?? "none"
    ).join(",");

  return [
    facePairTableKey(facePairs),
    definitionKey,
    bridgeRouteSpecArrayKey(
      sweepStartRouteSpecsByPairId,
      facePairs
    ),
    preferredKey,
    bridgeSweepPositionKey(positions),
    sceneCenter.x.toFixed(2),
    sceneCenter.y.toFixed(2),
    sceneCenter.z.toFixed(2),
  ].join("||");
}

function setBridgeSweepRouteCache(
  cacheKey,
  value
) {
  if (
    BRIDGE_SWEEP_ROUTE_CACHE.size >=
    BRIDGE_SWEEP_ROUTE_CACHE_LIMIT
  ) {
    const oldestKey =
      BRIDGE_SWEEP_ROUTE_CACHE
        .keys()
        .next()
        .value;

    BRIDGE_SWEEP_ROUTE_CACHE.delete(
      oldestKey
    );
  }

  BRIDGE_SWEEP_ROUTE_CACHE.set(
    cacheKey,
    value
  );
}

function buildBridgeSweepModels({
  definition,
  positions,
  sceneCenter,
  startRouteSpec,
  targetRouteSpec,
  geometry =
    DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY,
}) {
  const targetMappingTurn =
    definition.routingMappingTurn ??
    definition.mappingTurn ??
    0;

  const startMappingTurn =
    definition.sweepStartMappingTurn ??
    definition.mappingTurn ??
    targetMappingTurn;

  const normalizedTargetRoute =
    normalizeBridgeRouteSpec(
      targetRouteSpec,
      targetRouteSpec.lane
    );

  const normalizedStartRoute =
    startRouteSpec === null
      ? normalizedTargetRoute
      : normalizeBridgeRouteSpec(
          startRouteSpec,
          startRouteSpec.lane
        );

  const mappingChanges =
    Math.abs(
      targetMappingTurn -
      startMappingTurn
    ) > 1e-8;

  const routeChanges =
    bridgeRouteSpecKey(
      normalizedStartRoute
    ) !==
    bridgeRouteSpecKey(
      normalizedTargetRoute
    );

  const sampleCount =
    mappingChanges || routeChanges
      ? BRIDGE_ROUTE_SWEEP_SAMPLE_COUNT
      : 1;

  const totalDuration = Math.max(
    FACE_MAPPING_DURATION_MS,
    BRIDGE_ROUTE_CHANGE_DURATION_MS
  );

  return Array.from(
    { length: sampleCount },
    (_, sampleIndex) => {
      const elapsed =
        sampleCount === 1
          ? totalDuration
          : totalDuration *
            sampleIndex /
            (sampleCount - 1);

      const mappingRaw = Math.min(
        1,
        elapsed /
          FACE_MAPPING_DURATION_MS
      );

      const routeRaw = Math.min(
        1,
        elapsed /
          BRIDGE_ROUTE_CHANGE_DURATION_MS
      );

      const mappingProgress =
        bridgeTransitionMappingProgress(
          mappingRaw
        );

      const routeProgress =
        bridgeTransitionMappingProgress(
          routeRaw
        );

      const sampledRouteSpec =
        interpolateBridgeRouteSpec(
          normalizedStartRoute,
          normalizedTargetRoute,
          routeProgress,
          routeRaw
        );

      const sampledMappingTurn =
        startMappingTurn +
        (
          targetMappingTurn -
          startMappingTurn
        ) *
          mappingProgress;

      return makeFaceIdentificationBridgeModel({
        positions,
        pairing:
          definition.pairing,
        progress:
          definition.progress,
        bridgeSpanScale:
          definition.bridgeSpanScale ??
          1,
        bridgeIndex:
          definition.bridgeIndex,
        routeLane:
          sampledRouteSpec.lane,
        routeSpec:
          sampledRouteSpec,
        mappingTurn:
          sampledMappingTurn,
        sceneCenter,
        geometry,
      });
    }
  );
}

function analyzeBridgeSweepCandidate({
  sweepModels,
  positions,
  geometry =
    DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY,
}) {
  let lastDiagnostics = null;

  for (
    let sampleIndex = 0;
    sampleIndex < sweepModels.length;
    sampleIndex += 1
  ) {
    const diagnostics =
      analyzeBridgeCandidate({
        candidateModel:
          sweepModels[sampleIndex],
        earlierBridgeModels: [],
        positions,
        geometry,
      });

    lastDiagnostics = diagnostics;

    if (!diagnostics.valid) {
      return {
        ...diagnostics,
        valid: false,
        status:
          sweepModels.length > 1
            ? `swept-${diagnostics.status}`
            : diagnostics.status,
        failedSweepSampleIndex:
          sampleIndex,
        sweepSampleCount:
          sweepModels.length,
      };
    }
  }

  return {
    ...(lastDiagnostics ?? {
      selfIntersections: null,
      tetrahedronIntersections: null,
      earlierBridgeIntersections: null,
    }),
    valid: true,
    status: "valid",
    failedSweepSampleIndex: null,
    sweepSampleCount:
      sweepModels.length,
  };
}

function bridgeSweepAttemptsIntersect(
  firstAttempt,
  secondAttempt
) {
  const sampleCount = Math.max(
    firstAttempt.sweepModels.length,
    secondAttempt.sweepModels.length
  );

  for (
    let sampleIndex = 0;
    sampleIndex < sampleCount;
    sampleIndex += 1
  ) {
    const firstModelIndex =
      sampleCount === 1
        ? 0
        : Math.round(
            sampleIndex *
            (
              firstAttempt
                .sweepModels.length - 1
            ) /
            (sampleCount - 1)
          );

    const secondModelIndex =
      sampleCount === 1
        ? 0
        : Math.round(
            sampleIndex *
            (
              secondAttempt
                .sweepModels.length - 1
            ) /
            (sampleCount - 1)
          );

    const firstModel =
      firstAttempt.sweepModels[
        firstModelIndex
      ];

    const secondModel =
      secondAttempt.sweepModels[
        secondModelIndex
      ];

    if (
      bridgeAuditIntersectionSummary(
        firstModel.triangles,
        secondModel.triangles
      ).hitCount > 0
    ) {
      return true;
    }
  }

  return false;
}

function selectCollisionFreeBridgeRouteSet({
  definitions,
  positions,
  sceneCenter,
  preferredRouteIdsByPairId = null,
  sweepStartRouteSpecsByPairId = null,
  geometry =
    DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY,
}) {
  const cacheKey =
    bridgeSweepRouteSelectionCacheKey({
      definitions,
      positions,
      sceneCenter,
      preferredRouteIdsByPairId,
      sweepStartRouteSpecsByPairId,
      facePairs:
        geometry.facePairs,
    });

  const cached =
    BRIDGE_SWEEP_ROUTE_CACHE.get(
      cacheKey
    );

  if (cached) {
    return cached;
  }

  const globalMappingChanges =
    definitions.some(
      (definition) =>
        Math.abs(
          (
            definition.routingMappingTurn ??
            definition.mappingTurn ??
            0
          ) -
          (
            definition.sweepStartMappingTurn ??
            definition.mappingTurn ??
            0
          )
        ) > 1e-8
    );

  const candidateSets =
    definitions.map((definition) => {
      const routeSpecs =
        bridgeRouteCandidateSpecsForType(
          definition.bridgeType
        );

      /*
       * A bridge's first exposure has no remembered route yet,
       * while every later exposure does. Seed that first route
       * with the canonical candidate for its bridge class so the
       * first Bridge action and every later Bridge action enter
       * the global planner with the same route preference.
       * Backtracking may still choose another lane when the
       * canonical route is blocked.
       */
      const canonicalRouteId =
        routeSpecs[0]?.id ?? null;

      const preferredRouteId =
        preferredRouteIdsByPairId?.[
          definition.pairId
        ] ?? canonicalRouteId;

      const startRouteSpec =
        sweepStartRouteSpecsByPairId?.[
          definition.pairId
        ] ?? null;

      const startMappingTurn =
        definition.sweepStartMappingTurn ??
        definition.mappingTurn ??
        0;

      const targetMappingTurn =
        definition.routingMappingTurn ??
        definition.mappingTurn ??
        startMappingTurn;

      const mappingChanges =
        Math.abs(
          targetMappingTurn -
          startMappingTurn
        ) > 1e-8;

      const attempts = routeSpecs
        .flatMap(
          (routeSpec, routeIndex) => {
            const routeChanges =
              startRouteSpec !== null &&
              bridgeRouteSpecKey(
                startRouteSpec
              ) !==
                bridgeRouteSpecKey({
                  ...routeSpec,
                  transitionClearance: 0,
                });

            const transitionProfiles =
              startRouteSpec !== null &&
              (
                globalMappingChanges ||
                routeChanges
              )
                ? [
                    {
                      transitionClearance: 0,
                      transitionPinch: 0,
                    },
                    {
                      transitionClearance:
                        BRIDGE_ROUTE_SWEEP_CLEARANCE,
                      transitionPinch: 0,
                    },
                  ]
                : [
                    {
                      transitionClearance: 0,
                      transitionPinch: 0,
                    },
                  ];

            return transitionProfiles.map(
              (
                transitionProfile,
                profileIndex
              ) => {
                const {
                  transitionClearance,
                  transitionPinch,
                } = transitionProfile;

                const targetRouteSpec = {
                  ...routeSpec,
                  transitionClearance,
                  transitionPinch,
                };

                const sweepModels =
                  buildBridgeSweepModels({
                    definition,
                    positions,
                    sceneCenter,
                    startRouteSpec,
                    targetRouteSpec,
                    geometry,
                  });

                const model =
                  sweepModels[
                    sweepModels.length - 1
                  ];

                const endpointDiagnostics =
                  analyzeBridgeCandidate({
                    candidateModel: model,
                    earlierBridgeModels: [],
                    positions,
                    geometry,
                  });

                const sweepDiagnostics =
                  analyzeBridgeSweepCandidate({
                    sweepModels,
                    positions,
                    geometry,
                  });

                return {
                  routeSpec:
                    targetRouteSpec,
                  routeIndex:
                    routeIndex * 2 +
                    profileIndex,
                  model,
                  sweepModels,
                  diagnostics:
                    endpointDiagnostics,
                  sweepDiagnostics,
                  sweepClear:
                    sweepDiagnostics.valid,
                  score:
                    bridgeRouteCandidateScore(
                      model,
                      routeSpec
                    ) +
                    (
                      preferredRouteId ===
                        null ||
                      routeSpec.id ===
                        preferredRouteId
                        ? 0
                        : BRIDGE_ROUTE_CHANGE_PENALTY
                    ) +
                    (
                      transitionClearance > 0
                        ? BRIDGE_ROUTE_SWEEP_CLEARANCE_PENALTY
                        : 0
                    ) +
                    (
                      sweepDiagnostics.valid
                        ? 0
                        : BRIDGE_ROUTE_SWEEP_FAILURE_PENALTY
                    ),
                };
              }
            );
          }
        )
        .sort(
          (first, second) =>
            Number(
              second.diagnostics.valid
            ) -
              Number(
                first.diagnostics.valid
              ) ||
            Number(
              second.sweepClear
            ) -
              Number(
                first.sweepClear
              ) ||
            first.score -
              second.score ||
            first.routeIndex -
              second.routeIndex
        );

      return {
        definition,
        attempts,
        endpointValidAttempts:
          attempts.filter(
            (attempt) =>
              attempt.diagnostics.valid
          ),
      };
    });

  const selectedAttempts =
    Array.from(
      { length: candidateSets.length },
      () => null
    );

  function attemptsIntersect(
    firstAttempt,
    secondAttempt,
    requireSweepClear
  ) {
    if (requireSweepClear) {
      return bridgeSweepAttemptsIntersect(
        firstAttempt,
        secondAttempt
      );
    }

    return (
      bridgeAuditIntersectionSummary(
        firstAttempt.model.triangles,
        secondAttempt.model.triangles
      ).hitCount > 0
    );
  }

  function search(
    candidateSetIndex,
    earlierAttempts,
    requireSweepClear
  ) {
    if (
      candidateSetIndex >=
      candidateSets.length
    ) {
      return true;
    }

    const candidateSet =
      candidateSets[
        candidateSetIndex
      ];

    for (
      const attempt of
        candidateSet
          .endpointValidAttempts
    ) {
      if (
        requireSweepClear &&
        !attempt.sweepClear
      ) {
        continue;
      }

      const crossesEarlierBridge =
        earlierAttempts.some(
          (earlierAttempt) =>
            attemptsIntersect(
              attempt,
              earlierAttempt,
              requireSweepClear
            )
        );

      if (crossesEarlierBridge) {
        continue;
      }

      selectedAttempts[
        candidateSetIndex
      ] = attempt;

      if (
        search(
          candidateSetIndex + 1,
          [
            ...earlierAttempts,
            attempt,
          ],
          requireSweepClear
        )
      ) {
        return true;
      }
    }

    selectedAttempts[
      candidateSetIndex
    ] = null;

    return false;
  }

  const sweepClearSelectionFound =
    search(0, [], true);

  if (!sweepClearSelectionFound) {
    selectedAttempts.fill(null);
  }

  const endpointClearSelectionFound =
    sweepClearSelectionFound ||
    search(0, [], false);

  if (!endpointClearSelectionFound) {
    const acceptedAttempts = [];

    candidateSets.forEach(
      (candidateSet, index) => {
        const selectedAttempt =
          candidateSet
            .endpointValidAttempts
            .find(
              (attempt) =>
                !acceptedAttempts.some(
                  (acceptedAttempt) =>
                    attemptsIntersect(
                      attempt,
                      acceptedAttempt,
                      false
                    )
                )
            ) ?? null;

        selectedAttempts[index] =
          selectedAttempt;

        if (selectedAttempt !== null) {
          acceptedAttempts.push(
            selectedAttempt
          );
        }
      }
    );
  }

  const selections =
    candidateSets.map(
      (candidateSet, index) => {
        const selectedAttempt =
          selectedAttempts[index];

        const routeAttempts =
          candidateSet.attempts.map(
            bridgeRouteAttemptSummary
          );

        if (selectedAttempt !== null) {
          return {
            model:
              selectedAttempt.model,
            selectedRouteSpec:
              selectedAttempt.routeSpec,
            selectedRouteScore:
              selectedAttempt.score,
            candidateDiagnostics: {
              ...selectedAttempt
                .diagnostics,
              valid: true,
              status:
                sweepClearSelectionFound
                  ? "global-sweep-clear-route"
                  : endpointClearSelectionFound
                    ? "global-endpoint-clear-route"
                    : "endpoint-clear-partial-route",
              selectedRouteId:
                selectedAttempt
                  .routeSpec.id,
              selectedRouteLabel:
                bridgeRouteDisplayLabel(
                  selectedAttempt
                    .routeSpec
                ),
              selectedRouteScore:
                selectedAttempt.score,
              transitionClearance:
                selectedAttempt
                  .routeSpec
                  .transitionClearance,
              transitionPinch:
                selectedAttempt
                  .routeSpec
                  .transitionPinch,
              sweepValid:
                selectedAttempt
                  .sweepDiagnostics.valid,
              sweepStatus:
                selectedAttempt
                  .sweepDiagnostics.status,
              routeCandidateCount:
                candidateSet
                  .attempts.length,
              validRouteCount:
                candidateSet
                  .endpointValidAttempts
                  .length,
              routeAttempts,
            },
          };
        }

        const fallbackAttempt =
          candidateSet.attempts[0];

        return {
          model:
            fallbackAttempt.model,
          selectedRouteSpec: null,
          selectedRouteScore: null,
          candidateDiagnostics: {
            valid: false,
            status:
              "no-valid-route",
            routeCandidateCount:
              candidateSet.attempts.length,
            validRouteCount:
              candidateSet
                .endpointValidAttempts
                .length,
            routeAttempts,
          },
        };
      }
    );

  setBridgeSweepRouteCache(
    cacheKey,
    selections
  );

  return selections;
}

function bridgeRouteSelectionCacheKey({
  constructionOrder,
  facePairMappingTurns,
  bridgeIndex,
  earlierBridgeModels,
}) {
  return bridgeAuditCacheKey({
    constructionOrder,
    facePairMappingTurns,
    bridgeIndex,
    routeId: "route-selection",
    obstacleRouteIds:
      earlierBridgeModels.map(
        (bridgeModel) =>
          bridgeModel.route?.id ??
          bridgeModel.routeSpec?.id ??
          DEFAULT_BRIDGE_ROUTE_SPEC.id
      ),
  });
}

function setBridgeRouteSelectionCache(
  cacheKey,
  value
) {
  if (
    BRIDGE_ROUTE_SELECTION_CACHE.size >=
    BRIDGE_ROUTE_SELECTION_CACHE_LIMIT
  ) {
    const oldestKey =
      BRIDGE_ROUTE_SELECTION_CACHE
        .keys()
        .next()
        .value;

    BRIDGE_ROUTE_SELECTION_CACHE.delete(
      oldestKey
    );
  }

  BRIDGE_ROUTE_SELECTION_CACHE.set(
    cacheKey,
    value
  );
}

function bridgeRouteAttemptSummary(
  attempt
) {
  return {
    routeId:
      attempt.routeSpec.id,
    routeLabel:
      bridgeRouteDisplayLabel(
        attempt.routeSpec
      ),
    routeLane:
      attempt.routeSpec.lane,
    valid:
      attempt.diagnostics.valid,
    status:
      attempt.diagnostics.status,
    totalArcLength:
      attempt.model.totalArcLength,
    score:
      attempt.score,
  };
}

function selectBridgeRouteCandidate({
  buildCandidateModel,
  earlierBridgeModels,
  positions,
  constructionOrder,
  facePairMappingTurns,
  pairStrengths,
  bridgeIndex,
}) {
  const selectionCacheKey =
    bridgeRouteSelectionCacheKey({
      constructionOrder,
      facePairMappingTurns,
      bridgeIndex,
      earlierBridgeModels,
    });

  if (selectionCacheKey === null) {
    const routeSpec =
      DEFAULT_BRIDGE_ROUTE_SPEC;

    const model =
      buildCandidateModel(
        routeSpec
      );

    const diagnostics =
      analyzeBridgeCandidateCached({
        candidateModel: model,
        earlierBridgeModels,
        positions,
        constructionOrder,
        facePairMappingTurns,
        pairStrengths,
      });

    return {
      model,
      selectedRouteSpec: null,
      selectedRouteScore: null,
      candidateDiagnostics: {
        ...diagnostics,
        routeCandidateCount: 0,
        validRouteCount: 0,
        routeAttempts: [],
      },
    };
  }

  const cachedSelection =
    BRIDGE_ROUTE_SELECTION_CACHE.get(
      selectionCacheKey
    );

  if (cachedSelection) {
    const selectedRouteSpec =
      cachedSelection.selectedRouteId ===
      null
        ? null
        : bridgeRouteSpecForId(
            cachedSelection
              .selectedRouteId
          );

    const displayedRouteSpec =
      selectedRouteSpec ??
      DEFAULT_BRIDGE_ROUTE_SPEC;

    return {
      model:
        buildCandidateModel(
          displayedRouteSpec
        ),
      selectedRouteSpec,
      selectedRouteScore:
        cachedSelection
          .selectedRouteScore,
      candidateDiagnostics:
        cachedSelection
          .candidateDiagnostics,
    };
  }

  const attempts =
    bridgeRouteCandidateSpecs().map(
      (routeSpec, routeIndex) => {
        const model =
          buildCandidateModel(
            routeSpec
          );

        const diagnostics =
          analyzeBridgeCandidateCached({
            candidateModel: model,
            earlierBridgeModels,
            positions,
            constructionOrder,
            facePairMappingTurns,
            pairStrengths,
          });

        return {
          routeSpec,
          routeIndex,
          model,
          diagnostics,
          score:
            bridgeRouteCandidateScore(
              model,
              routeSpec
            ),
        };
      }
    );

  const validAttempts =
    attempts
      .filter(
        (attempt) =>
          attempt.diagnostics.valid
      )
      .sort(
        (first, second) =>
          first.score - second.score ||
          first.routeIndex -
            second.routeIndex
      );

  const selectedAttempt =
    validAttempts[0] ?? null;

  const routeAttempts =
    attempts.map(
      bridgeRouteAttemptSummary
    );

  const candidateDiagnostics =
    selectedAttempt === null
      ? {
          valid: false,
          status:
            "no-valid-route",
          routeCandidateCount:
            attempts.length,
          validRouteCount: 0,
          routeAttempts,
        }
      : {
          ...selectedAttempt
            .diagnostics,
          selectedRouteId:
            selectedAttempt
              .routeSpec.id,
          selectedRouteLabel:
            bridgeRouteDisplayLabel(
              selectedAttempt
                .routeSpec
            ),
          selectedRouteScore:
            selectedAttempt.score,
          routeCandidateCount:
            attempts.length,
          validRouteCount:
            validAttempts.length,
          routeAttempts,
        };

  setBridgeRouteSelectionCache(
    selectionCacheKey,
    {
      selectedRouteId:
        selectedAttempt?.routeSpec.id ??
        null,
      selectedRouteScore:
        selectedAttempt?.score ??
        null,
      candidateDiagnostics,
    }
  );

  return {
    model:
      selectedAttempt?.model ??
      attempts[0].model,
    selectedRouteSpec:
      selectedAttempt?.routeSpec ??
      null,
    selectedRouteScore:
      selectedAttempt?.score ??
      null,
    candidateDiagnostics,
  };
}

function bridgeAuditStatusLabel(
  status
) {
  const labels = {
    "self-intersection":
      "self-intersects",
    "tetrahedron-intersection":
      "crosses a tetrahedron",
    "earlier-bridge-intersection":
      "crosses another bridge",
    "identification-transition":
      "awaits the identification",
    "mapping-transition":
      "awaits the vertex map",
    "earlier-bridge-pending":
      "awaits another bridge",
    "no-valid-route":
      "has no collision-free candidate lane",
    "global-collision-free-route":
      "uses a collision-free lane",
    "collision-free-partial-route":
      "uses an available collision-free lane",
    "swept-self-intersection":
      "would self-intersect during motion",
    "swept-tetrahedron-intersection":
      "would cross a tetrahedron during motion",
    "swept-earlier-bridge-intersection":
      "would cross another bridge during motion",
    "global-sweep-clear-route":
      "uses a sweep-clear lane",
    "sweep-clear-partial-route":
      "uses an available sweep-clear lane",
    "global-endpoint-clear-route":
      "uses a collision-free destination lane",
    "endpoint-clear-partial-route":
      "uses an available destination lane",
    "no-sweep-clear-route":
      "has no sweep-clear candidate lane",
  };

  return (
    labels[status] ??
    "is embedded"
  );
}

function transformPoint(point, tetrahedron) {
  const scaled = {
    x: point.x * SCALE,
    y: point.y * SCALE,
    z: point.z * SCALE,
  };

  if (
    Array.isArray(
      tetrahedron.rotationMatrix
    ) &&
    tetrahedron.rotationMatrix.length === 9
  ) {
    const rotation =
      tetrahedron.rotationMatrix;

    return {
      x:
        rotation[0] * scaled.x +
        rotation[1] * scaled.y +
        rotation[2] * scaled.z +
        tetrahedron.center.x,

      y:
        rotation[3] * scaled.x +
        rotation[4] * scaled.y +
        rotation[5] * scaled.z +
        tetrahedron.center.y,

      z:
        rotation[6] * scaled.x +
        rotation[7] * scaled.y +
        rotation[8] * scaled.z +
        tetrahedron.center.z,
    };
  }

  const cosX =
    Math.cos(
      tetrahedron.rotation.x
    );

  const sinX =
    Math.sin(
      tetrahedron.rotation.x
    );

  const cosY =
    Math.cos(
      tetrahedron.rotation.y
    );

  const sinY =
    Math.sin(
      tetrahedron.rotation.y
    );

  const cosZ =
    Math.cos(
      tetrahedron.rotation.z
    );

  const sinZ =
    Math.sin(
      tetrahedron.rotation.z
    );

  const y1 =
    scaled.y * cosX -
    scaled.z * sinX;

  const z1 =
    scaled.y * sinX +
    scaled.z * cosX;

  const x2 =
    scaled.x * cosY +
    z1 * sinY;

  const z2 =
    -scaled.x * sinY +
    z1 * cosY;

  return {
    x:
      x2 * cosZ -
      y1 * sinZ +
      tetrahedron.center.x,

    y:
      x2 * sinZ +
      y1 * cosZ +
      tetrahedron.center.y,

    z:
      z2 +
      tetrahedron.center.z,
  };
}

const FACE_SOLVER_ITERATIONS = 72;
const FACE_SHAPE_STIFFNESS = 0.72;
const FACE_PARTIAL_SEAM_STIFFNESS = 0.98;
const FACE_SEAM_SUBITERATIONS = 8;

/*
 * Multi-collapse display uses a lightweight, order-independent
 * cell relaxation. It pulls every active identified face toward
 * its mate while leaving enough shape compliance for several
 * identifications to coexist.
 */
const FUNNEL_CORE_RELAX_ITERATIONS = 44;
const FUNNEL_CORE_SHAPE_STIFFNESS = 0.18;
const FUNNEL_CORE_SEAM_STIFFNESS = 0.34;
const FUNNEL_CORE_MIN_WEDGE_RATIO = 0.035;
const FUNNEL_CORE_MIN_EDGE_RATIO = 0.22;
const FUNNEL_CORE_MAX_EDGE_RATIO = 3.8;
const FUNNEL_CORE_BACKTRACK_STEPS = 11;
const FACE_TETHER_STIFFNESS = 0.0012;
const FACE_LOCK_THRESHOLD = 0.999;
const FACE_CONSTRAINT_EPSILON = 1e-6;
const FACE_COLLISION_CLEARANCE = 12;
const FACE_COLLISION_STIFFNESS = 0.72;
const FACE_COLLISION_SHAPE_STIFFNESS = 0.3;
const FACE_COLLISION_INTERVAL = 3;
const FACE_COLLISION_PASSES = 2;
const FACE_COLLISION_FINAL_PASSES = 8;
const FACE_COLLISION_BACKTRACK_STEPS = 9;
const FACE_PLANNER_TRANSIT_DISTANCE = 310;
const FACE_PLANNER_RESIDUAL_DISTANCE = 58;
const FACE_PLANNER_GUIDE_STIFFNESS = 0.18;
const FACE_PLANNER_TRIAL_ITERATIONS = 18;
const FACE_PLANNER_PATH_STEPS = 8;
const FACE_PLANNER_SWEEP_SAMPLES = 5;
const FACE_PLANNER_HYSTERESIS_PENALTY = 18;
const FACE_PLANNER_SEAM_WEIGHT = 7;
const FACE_PLANNER_SHAPE_WEIGHT = 160;
const FACE_PLANNER_NEAR_WEIGHT = 18;
const FACE_PLANNER_BARRIER_WEIGHT = 4;
const FACE_PLANNER_CLEARANCE_WEIGHT = 5;
const FACE_VALIDITY_FULL_STRENGTH = 0.995;
const FACE_VALIDITY_SEAM_TOLERANCE = 0.75;
const FACE_VALIDITY_EDGE_TOLERANCE = 0.55;
const FACE_VALIDITY_COLLAPSE_RATIO = 0.08;
const FACE_VALIDITY_EXPANSION_RATIO = 6;
const FACE_VALIDITY_RESIDUAL_TOLERANCE = 0.12;
const QUOTIENT_CUT_OPEN_STRENGTH = 0.72;
const QUOTIENT_CUT_OPEN_BACKTRACK_FACTORS = [
  1,
  2 / 3,
  1 / 3,
  0,
];
const QUOTIENT_FACE_GAP_PX = 52;
const QUOTIENT_FACE_LANE_PX = 18;

const DEVELOPER_DIAGNOSTICS_RIGHT_X = 546;
const DEVELOPER_DIAGNOSTICS_BOTTOM_Y = 542;

function clonePoint(point) {
  return {
    x: point.x,
    y: point.y,
    z: point.z,
  };
}

function cloneWorldPositions(
  positions
) {
  return {
    A: positions.A.map(
      clonePoint
    ),
    B: positions.B.map(
      clonePoint
    ),
  };
}

function maximumPositionDisplacement(
  first,
  second
) {
  let maximum = 0;

  ["A", "B"].forEach(
    (tetrahedronId) => {
      first[
        tetrahedronId
      ].forEach(
        (point, index) => {
          maximum = Math.max(
            maximum,
            pointDistance(
              point,
              second[
                tetrahedronId
              ][index]
            )
          );
        }
      );
    }
  );

  return maximum;
}

function allWorldPoints(
  positions
) {
  return [
    ...positions.A,
    ...positions.B,
  ];
}

function averageWorldPoint(
  points
) {
  if (points.length === 0) {
    return {
      x: 0,
      y: 0,
      z: 0,
    };
  }

  return points.reduce(
    (sum, point) => ({
      x:
        sum.x +
        point.x /
          points.length,
      y:
        sum.y +
        point.y /
          points.length,
      z:
        sum.z +
        point.z /
          points.length,
    }),
    {
      x: 0,
      y: 0,
      z: 0,
    }
  );
}

function createShapeConstraints(
  mesh,
  restPositions
) {
  const constraints =
    new Map();

  mesh.triangles.forEach(
    (triangle) => {
      const [
        first,
        second,
        third,
      ] = triangle.vertexIndices;

      [
        [first, second],
        [second, third],
        [third, first],
      ].forEach(
        ([
          firstIndex,
          secondIndex,
        ]) => {
          const key = meshEdgeKey(
            firstIndex,
            secondIndex
          );

          if (
            constraints.has(key)
          ) {
            return;
          }

          constraints.set(key, {
            firstIndex,
            secondIndex,
            restLength:
              pointDistance(
                restPositions[
                  firstIndex
                ],
                restPositions[
                  secondIndex
                ]
              ),
          });
        }
      );
    }
  );

  return [
    ...constraints.values(),
  ];
}

const INITIAL_WORLD_VERTEX_POSITIONS =
  DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY
    .initialWorldPositions;

const FACE_SHAPE_CONSTRAINTS =
  DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY
    .faceShapeConstraints;

function satisfyDistanceConstraint(
  points,
  constraint,
  stiffness
) {
  const first =
    points[
      constraint.firstIndex
    ];

  const second =
    points[
      constraint.secondIndex
    ];

  const delta = {
    x: second.x - first.x,
    y: second.y - first.y,
    z: second.z - first.z,
  };

  const length = Math.hypot(
    delta.x,
    delta.y,
    delta.z
  );

  if (
    length <
    FACE_CONSTRAINT_EPSILON
  ) {
    return;
  }

  const scale =
    0.5 *
    stiffness *
    (
      length -
      constraint.restLength
    ) /
    length;

  first.x += delta.x * scale;
  first.y += delta.y * scale;
  first.z += delta.z * scale;

  second.x -= delta.x * scale;
  second.y -= delta.y * scale;
  second.z -= delta.z * scale;
}

function satisfyPartialSeam(
  positions,
  vertexPair,
  strength
) {
  const pointA =
    positions.A[
      vertexPair.vertexAIndex
    ];

  const pointB =
    positions.B[
      vertexPair.vertexBIndex
    ];

  const correction =
    0.5 *
    FACE_PARTIAL_SEAM_STIFFNESS *
    strength;

  const delta = {
    x: pointB.x - pointA.x,
    y: pointB.y - pointA.y,
    z: pointB.z - pointA.z,
  };

  pointA.x +=
    delta.x * correction;

  pointA.y +=
    delta.y * correction;

  pointA.z +=
    delta.z * correction;

  pointB.x -=
    delta.x * correction;

  pointB.y -=
    delta.y * correction;

  pointB.z -=
    delta.z * correction;
}

function createLockedSeamGroups(
  pairStrengths,
  constraintOrder,
  facePairMappingTurns = [],
  geometry =
    DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY
) {
  const countA =
    geometry.meshes.A.vertices.length;

  const countB =
    geometry.meshes.B.vertices.length;

  const parent =
    Array.from(
      {
        length:
          countA + countB,
      },
      (_, index) => index
    );

  function find(index) {
    let current = index;

    while (
      parent[current] !==
      current
    ) {
      parent[current] =
        parent[
          parent[current]
        ];

      current =
        parent[current];
    }

    return current;
  }

  function union(
    first,
    second
  ) {
    const firstRoot =
      find(first);

    const secondRoot =
      find(second);

    if (
      firstRoot !==
      secondRoot
    ) {
      parent[secondRoot] =
        firstRoot;
    }
  }

  constraintOrder.forEach(
    (pairId) => {
      if (
        pairStrengths[
          pairId
        ] <
        FACE_LOCK_THRESHOLD
      ) {
        return;
      }

      const mappingIndex =
        settledCyclicMappingIndex(
          facePairMappingTurns[
            pairId
          ] ?? 0
        );

      /*
       * While a vertex map is rotating continuously,
       * no discrete vertex pairing is valid. Restore the
       * seam lock only when the animation reaches one of
       * the three exact cyclic correspondences.
       */
      if (mappingIndex === null) {
        return;
      }

      const correspondence =
        facePairVertexCorrespondence(
          pairId,
          mappingIndex,
          geometry
        );

      correspondence.vertexPairs.forEach(
        (vertexPair) => {
          union(
            vertexPair.vertexAIndex,
            countA +
              vertexPair.vertexBIndex
          );
        }
      );
    }
  );

  const groups = new Map();

  parent.forEach((_, index) => {
    const root = find(index);

    if (!groups.has(root)) {
      groups.set(root, []);
    }

    groups.get(root).push(
      index
    );
  });

  return [
    ...groups.values(),
  ].filter(
    (group) =>
      group.length > 1
  );
}

function pointFromGlobalIndex(
  positions,
  globalIndex
) {
  const countA =
    positions.A.length;

  return globalIndex < countA
    ? positions.A[
        globalIndex
      ]
    : positions.B[
        globalIndex -
          countA
      ];
}

function projectLockedSeams(
  positions,
  lockedGroups
) {
  lockedGroups.forEach(
    (group) => {
      const points =
        group.map(
          (globalIndex) =>
            pointFromGlobalIndex(
              positions,
              globalIndex
            )
        );

      const center =
        averageWorldPoint(points);

      points.forEach(
        (point) => {
          point.x = center.x;
          point.y = center.y;
          point.z = center.z;
        }
      );
    }
  );
}

function tetherToSeed(
  positions,
  seed
) {
  ["A", "B"].forEach(
    (tetrahedronId) => {
      positions[
        tetrahedronId
      ].forEach(
        (point, index) => {
          const target =
            seed[
              tetrahedronId
            ][index];

          point.x +=
            (
              target.x -
              point.x
            ) *
            FACE_TETHER_STIFFNESS;

          point.y +=
            (
              target.y -
              point.y
            ) *
            FACE_TETHER_STIFFNESS;

          point.z +=
            (
              target.z -
              point.z
            ) *
            FACE_TETHER_STIFFNESS;
        }
      );
    }
  );
}

function recenterWorldPositions(
  positions,
  targetCenter
) {
  const currentCenter =
    averageWorldPoint(
      allWorldPoints(
        positions
      )
    );

  const offset = {
    x:
      targetCenter.x -
      currentCenter.x,
    y:
      targetCenter.y -
      currentCenter.y,
    z:
      targetCenter.z -
      currentCenter.z,
  };

  allWorldPoints(
    positions
  ).forEach((point) => {
    point.x += offset.x;
    point.y += offset.y;
    point.z += offset.z;
  });
}

function applyWeightedDisplacement(
  positions,
  tetrahedronId,
  vertexIndices,
  weights,
  displacement
) {
  const weightSquareSum =
    weights.reduce(
      (sum, weight) =>
        sum +
        weight * weight,
      0
    );

  if (
    weightSquareSum <
    FACE_CONSTRAINT_EPSILON
  ) {
    return;
  }

  vertexIndices.forEach(
    (vertexIndex, index) => {
      const factor =
        weights[index] /
        weightSquareSum;

      const point =
        positions[
          tetrahedronId
        ][vertexIndex];

      point.x +=
        displacement.x *
        factor;

      point.y +=
        displacement.y *
        factor;

      point.z +=
        displacement.z *
        factor;
    }
  );
}

function applyCollisionBarrierContacts(
  positions,
  contacts
) {
  contacts
    .slice()
    .sort(
      (first, second) =>
        Number(second.penetrating) -
        Number(first.penetrating)
    )
    .forEach((contact) => {
      const deficit =
        contact.penetrating
          ? FACE_COLLISION_CLEARANCE
          : Math.max(
              0,
              FACE_COLLISION_CLEARANCE -
                contact.distance
            );

      if (
        deficit <=
        FACE_CONSTRAINT_EPSILON
      ) {
        return;
      }

      const halfCorrection =
        0.5 *
        FACE_COLLISION_STIFFNESS *
        deficit;

      const firstDisplacement = {
        x:
          -contact.direction.x *
          halfCorrection,
        y:
          -contact.direction.y *
          halfCorrection,
        z:
          -contact.direction.z *
          halfCorrection,
      };

      const secondDisplacement = {
        x:
          contact.direction.x *
          halfCorrection,
        y:
          contact.direction.y *
          halfCorrection,
        z:
          contact.direction.z *
          halfCorrection,
      };

      applyWeightedDisplacement(
        positions,
        contact.firstTetrahedronId,
        contact.firstVertexIndices,
        contact.firstWeights,
        firstDisplacement
      );

      applyWeightedDisplacement(
        positions,
        contact.secondTetrahedronId,
        contact.secondVertexIndices,
        contact.secondWeights,
        secondDisplacement
      );
    });
}

function projectActiveFaceConstraints(
  positions,
  activeOrder,
  pairStrengths,
  lockedGroups,
  facePairMappingTurns = [],
  geometry =
    DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY
) {
  projectLockedSeams(
    positions,
    lockedGroups
  );

  activeOrder.forEach(
    (pairId, orderIndex) => {
      const strength =
        pairStrengths[
          pairId
        ];

      /*
       * The first pair follows the established rigid
       * placement path. At full strength it becomes a
       * locked seam. Later pairs use deformable seam
       * attraction against that persistent state.
       */
      if (
        orderIndex === 0 ||
        strength >=
          FACE_LOCK_THRESHOLD
      ) {
        return;
      }

      const mappingIndex =
        settledCyclicMappingIndex(
          facePairMappingTurns[
            pairId
          ] ?? 0
        );

      if (mappingIndex === null) {
        return;
      }

      const effectiveStrength =
        strength * strength;

      facePairVertexCorrespondence(
        pairId,
        mappingIndex,
        geometry
      ).vertexPairs.forEach(
        (vertexPair) =>
          satisfyPartialSeam(
            positions,
            vertexPair,
            effectiveStrength
          )
      );
    }
  );

  projectLockedSeams(
    positions,
    lockedGroups
  );
}

function projectShapeConstraints(
  positions,
  stiffness =
    FACE_SHAPE_STIFFNESS,
  faceShapeConstraints =
    FACE_SHAPE_CONSTRAINTS
) {
  ["A", "B"].forEach(
    (tetrahedronId) => {
      faceShapeConstraints[
        tetrahedronId
      ].forEach(
        (constraint) =>
          satisfyDistanceConstraint(
            positions[
              tetrahedronId
            ],
            constraint,
            stiffness
          )
      );
    }
  );
}

function collapsedCoreSignedWedgeVolume(
  center,
  first,
  second,
  third
) {
  return dotPoint(
    subtractPoint(first, center),
    crossPoint(
      subtractPoint(second, center),
      subtractPoint(third, center)
    )
  );
}

function collapsedCoreTriangleGroup(
  positions,
  tetrahedronId,
  geometry
) {
  return geometry.meshes[
    tetrahedronId
  ].triangles.map(
    (triangle) => ({
      key:
        `collapsed-core-${tetrahedronId}-` +
        triangle.id,
      tetrahedronId,
      kind: triangle.kind,
      pairId:
        triangle.pairId ?? null,
      points:
        triangle.vertexIndices.map(
          (vertexIndex) =>
            positions[
              tetrahedronId
            ][vertexIndex]
        ),
    })
  );
}

function collapsedCoreCellOrientationValid(
  positions,
  tetrahedronId,
  geometry
) {
  const currentCenter =
    averageWorldPoint(
      positions[tetrahedronId]
    );

  const initialCenter =
    averageWorldPoint(
      geometry.initialWorldPositions[
        tetrahedronId
      ]
    );

  return geometry.meshes[
    tetrahedronId
  ].triangles.every(
    (triangle) => {
      const [
        firstIndex,
        secondIndex,
        thirdIndex,
      ] = triangle.vertexIndices;

      const initialVolume =
        collapsedCoreSignedWedgeVolume(
          initialCenter,
          geometry.initialWorldPositions[
            tetrahedronId
          ][firstIndex],
          geometry.initialWorldPositions[
            tetrahedronId
          ][secondIndex],
          geometry.initialWorldPositions[
            tetrahedronId
          ][thirdIndex]
        );

      const currentVolume =
        collapsedCoreSignedWedgeVolume(
          currentCenter,
          positions[tetrahedronId][
            firstIndex
          ],
          positions[tetrahedronId][
            secondIndex
          ],
          positions[tetrahedronId][
            thirdIndex
          ]
        );

      const referenceMagnitude =
        Math.abs(initialVolume);

      if (
        referenceMagnitude <=
        FACE_CONSTRAINT_EPSILON
      ) {
        return true;
      }

      return (
        currentVolume *
          Math.sign(initialVolume) >=
        referenceMagnitude *
          FUNNEL_CORE_MIN_WEDGE_RATIO
      );
    }
  );
}

function collapsedCoreEdgeLengthsValid(
  positions,
  tetrahedronId,
  geometry
) {
  return geometry.faceShapeConstraints[
    tetrahedronId
  ].every((constraint) => {
    const currentLength =
      pointDistance(
        positions[tetrahedronId][
          constraint.firstIndex
        ],
        positions[tetrahedronId][
          constraint.secondIndex
        ]
      );

    const ratio =
      currentLength /
      Math.max(
        FACE_CONSTRAINT_EPSILON,
        constraint.restLength
      );

    return (
      ratio >=
        FUNNEL_CORE_MIN_EDGE_RATIO &&
      ratio <=
        FUNNEL_CORE_MAX_EDGE_RATIO
    );
  });
}

function collapsedCoreSurfaceEmbedded(
  positions,
  activePairIds,
  geometry
) {
  const trianglesA =
    collapsedCoreTriangleGroup(
      positions,
      "A",
      geometry
    );

  const trianglesB =
    collapsedCoreTriangleGroup(
      positions,
      "B",
      geometry
    );

  if (
    bridgeAuditIntersectionSummary(
      trianglesA
    ).hitCount > 0 ||
    bridgeAuditIntersectionSummary(
      trianglesB
    ).hitCount > 0
  ) {
    return false;
  }

  const activePairIdSet =
    new Set(activePairIds);

  return (
    bridgeAuditIntersectionSummary(
      trianglesA,
      trianglesB,
      (firstTriangle, secondTriangle) =>
        firstTriangle.kind ===
          "large" &&
        secondTriangle.kind ===
          "large" &&
        firstTriangle.pairId ===
          secondTriangle.pairId &&
        activePairIdSet.has(
          firstTriangle.pairId
        )
    ).hitCount === 0 &&
    boundaryClearanceGeometryIsClear({
      positions,
      geometry,
    })
  );
}

function collapsedCoreLocalGeometryValid(
  positions,
  geometry
) {
  return (
    collapsedCoreCellOrientationValid(
      positions,
      "A",
      geometry
    ) &&
    collapsedCoreCellOrientationValid(
      positions,
      "B",
      geometry
    ) &&
    collapsedCoreEdgeLengthsValid(
      positions,
      "A",
      geometry
    ) &&
    collapsedCoreEdgeLengthsValid(
      positions,
      "B",
      geometry
    )
  );
}

function interpolateWorldPositions(
  first,
  second,
  amount
) {
  return {
    A: first.A.map(
      (point, index) =>
        lerpPoint(
          point,
          second.A[index],
          amount
        )
    ),
    B: first.B.map(
      (point, index) =>
        lerpPoint(
          point,
          second.B[index],
          amount
        )
    ),
  };
}

function admissibleCollapsedCoreLocalStep(
  fromPositions,
  toPositions,
  activePairIds,
  geometry
) {
  if (
    collapsedCoreLocalGeometryValid(
      toPositions,
      geometry
    )
  ) {
    return toPositions;
  }

  let lower = 0;
  let upper = 1;
  let best =
    cloneWorldPositions(
      fromPositions
    );

  for (
    let step = 0;
    step <
      FUNNEL_CORE_BACKTRACK_STEPS;
    step += 1
  ) {
    const amount =
      0.5 * (lower + upper);

    const candidate =
      interpolateWorldPositions(
        fromPositions,
        toPositions,
        amount
      );

    if (
      collapsedCoreLocalGeometryValid(
        candidate,
        geometry
      )
    ) {
      lower = amount;
      best = candidate;
    } else {
      upper = amount;
    }
  }

  return best;
}

function admissibleCollapsedCoreSurfaceStep(
  fromPositions,
  toPositions,
  activePairIds,
  geometry,
  extraSurfaceConstraint = null
) {
  function candidateIsValid(
    candidate
  ) {
    return (
      collapsedCoreLocalGeometryValid(
        candidate,
        geometry
      ) &&
      collapsedCoreSurfaceEmbedded(
        candidate,
        activePairIds,
        geometry
      ) &&
      (
        typeof extraSurfaceConstraint !==
          "function" ||
        extraSurfaceConstraint(
          candidate
        )
      )
    );
  }

  if (candidateIsValid(toPositions)) {
    return toPositions;
  }

  let lower = 0;
  let upper = 1;
  let best =
    cloneWorldPositions(
      fromPositions
    );

  for (
    let step = 0;
    step <
      FUNNEL_CORE_BACKTRACK_STEPS;
    step += 1
  ) {
    const amount =
      0.5 * (lower + upper);

    const candidate =
      interpolateWorldPositions(
        fromPositions,
        toPositions,
        amount
      );

    if (candidateIsValid(candidate)) {
      lower = amount;
      best = candidate;
    } else {
      upper = amount;
    }
  }

  return best;
}

function solveCollapsedFunnelCorePositions(
  collapseStrengths,
  facePairMappingTurns = [],
  geometry =
    DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY
) {
  const initialPositions =
    geometry.initialWorldPositions;

  const facePairs =
    geometry.facePairs ??
    FIGURE_EIGHT_FACE_PAIRS;

  const activePairIds =
    facePairs
      .map((pair) => pair.id)
      .filter(
        (pairId) =>
          (
            collapseStrengths[
              pairId
            ] ?? 0
          ) >
          FACE_CONSTRAINT_EPSILON
      );

  if (activePairIds.length === 0) {
    return cloneWorldPositions(
      initialPositions
    );
  }

  /*
   * Preserve the established single-collapse motion exactly.
   * With one constraint there is no compatibility problem:
   * tetrahedron B can meet that face by one rigid placement.
   */
  if (activePairIds.length === 1) {
    const pairId =
      activePairIds[0];

    const placement =
      makeStagedFacePlacementTransform(
        facePairs[
          pairId
        ],
        collapseStrengths[
          pairId
        ] ?? 0,
        facePairMappingTurns[
          pairId
        ] ?? 0,
        initialPositions,
        geometry.tetrahedra ??
          TETRAHEDRA
      );

    return {
      A:
        initialPositions.A.map(
          clonePoint
        ),
      B:
        initialPositions.B.map(
          placement
        ),
    };
  }

  /*
   * For several simultaneous collapses there is generally no
   * single rigid placement that satisfies every paired face.
   * Seed B from the weighted consensus of the individual rigid
   * face placements. The weights depend only on the collapse
   * coordinates, never on click/construction order.
   */
  const totalStrength =
    activePairIds.reduce(
      (sum, pairId) =>
        sum +
        (
          collapseStrengths[
            pairId
          ] ?? 0
        ),
      0
    );

  const maximumStrength =
    activePairIds.reduce(
      (maximum, pairId) =>
        Math.max(
          maximum,
          collapseStrengths[
            pairId
          ] ?? 0
        ),
      0
    );

  const targetPlacements =
    activePairIds.map(
      (pairId) => ({
        pairId,
        weight:
          collapseStrengths[
            pairId
          ] ?? 0,
        transform:
          makeFacePlacementTransform(
            facePairs[
              pairId
            ],
            facePairMappingTurns[
              pairId
            ] ?? 0,
            geometry.tetrahedra ??
              TETRAHEDRA
          ),
      })
    );

  const proposedSeed = {
    A:
      initialPositions.A.map(
        clonePoint
      ),
    B:
      initialPositions.B.map(
        (point) => {
          const consensus =
            targetPlacements.reduce(
              (sum, placement) => {
                const target =
                  placement.transform(
                    point
                  );

                return {
                  x:
                    sum.x +
                    target.x *
                      placement.weight,
                  y:
                    sum.y +
                    target.y *
                      placement.weight,
                  z:
                    sum.z +
                    target.z *
                      placement.weight,
                };
              },
              { x: 0, y: 0, z: 0 }
            );

          const averaged = {
            x:
              consensus.x /
              totalStrength,
            y:
              consensus.y /
              totalStrength,
            z:
              consensus.z /
              totalStrength,
          };

          return lerpPoint(
            point,
            averaged,
            maximumStrength
          );
        }
      ),
  };

  /*
   * The consensus placement is only a target. Never begin a
   * multi-collapse solve from a folded, inverted, or intersecting
   * cell complex. Backtrack from the separated valid cells to the
   * furthest admissible point on that path.
   */
  const positions =
    admissibleCollapsedCoreLocalStep(
      initialPositions,
      proposedSeed,
      activePairIds,
      geometry
    );

  const targetCenter =
    averageWorldPoint(
      allWorldPoints(positions)
    );

  /*
   * Apply every seam attraction simultaneously (Jacobi-style)
   * so a vertex shared by several collapsing faces receives the
   * average of those demands rather than whichever pair happens
   * to be processed last.
   */
  for (
    let iteration = 0;
    iteration <
      FUNNEL_CORE_RELAX_ITERATIONS;
    iteration += 1
  ) {
    const iterationStart =
      cloneWorldPositions(
        positions
      );

    projectShapeConstraints(
      positions,
      FUNNEL_CORE_SHAPE_STIFFNESS,
      geometry.faceShapeConstraints
    );

    const displacements = {
      A:
        positions.A.map(
          () => ({
            x: 0,
            y: 0,
            z: 0,
            weight: 0,
          })
        ),
      B:
        positions.B.map(
          () => ({
            x: 0,
            y: 0,
            z: 0,
            weight: 0,
          })
        ),
    };

    activePairIds.forEach(
      (pairId) => {
        const mappingIndex =
          settledCyclicMappingIndex(
            facePairMappingTurns[
              pairId
            ] ?? 0
          );

        if (mappingIndex === null) {
          return;
        }

        const strength =
          collapseStrengths[
            pairId
          ] ?? 0;

        const correction =
          0.5 *
          FUNNEL_CORE_SEAM_STIFFNESS *
          strength;

        facePairVertexCorrespondence(
          pairId,
          mappingIndex,
          geometry
        ).vertexPairs.forEach(
          (vertexPair) => {
            const pointA =
              positions.A[
                vertexPair
                  .vertexAIndex
              ];

            const pointB =
              positions.B[
                vertexPair
                  .vertexBIndex
              ];

            const delta =
              subtractPoint(
                pointB,
                pointA
              );

            const move =
              multiplyPoint(
                delta,
                correction
              );

            const displacementA =
              displacements.A[
                vertexPair
                  .vertexAIndex
              ];

            displacementA.x +=
              move.x;
            displacementA.y +=
              move.y;
            displacementA.z +=
              move.z;
            displacementA.weight +=
              1;

            const displacementB =
              displacements.B[
                vertexPair
                  .vertexBIndex
              ];

            displacementB.x -=
              move.x;
            displacementB.y -=
              move.y;
            displacementB.z -=
              move.z;
            displacementB.weight +=
              1;
          }
        );
      }
    );

    ["A", "B"].forEach(
      (tetrahedronId) => {
        positions[
          tetrahedronId
        ].forEach(
          (point, vertexIndex) => {
            const displacement =
              displacements[
                tetrahedronId
              ][vertexIndex];

            if (
              displacement.weight <=
              0
            ) {
              return;
            }

            point.x +=
              displacement.x /
              displacement.weight;
            point.y +=
              displacement.y /
              displacement.weight;
            point.z +=
              displacement.z /
              displacement.weight;
          }
        );
      }
    );

    projectShapeConstraints(
      positions,
      FUNNEL_CORE_SHAPE_STIFFNESS *
        0.5,
      geometry.faceShapeConstraints
    );

    recenterWorldPositions(
      positions,
      targetCenter
    );

    const admissible =
      admissibleCollapsedCoreLocalStep(
        iterationStart,
        positions,
        activePairIds,
        geometry
      );

    positions.A = admissible.A;
    positions.B = admissible.B;

    if (
      maximumPositionDisplacement(
        iterationStart,
        positions
      ) <=
      FACE_CONSTRAINT_EPSILON
    ) {
      break;
    }
  }

  /*
   * Local positive-volume checks are cheap enough to run on every
   * relaxation iteration. Perform the more expensive full surface
   * intersection audit only once on the final proposal, then
   * backtrack the whole deformation if necessary.
   */
  return admissibleCollapsedCoreSurfaceStep(
    initialPositions,
    positions,
    activePairIds,
    geometry
  );
}

function currentActivePairId(
  pairStrengths,
  constraintOrder
) {
  const activeOrder =
    constraintOrder.filter(
      (pairId) =>
        pairStrengths[
          pairId
        ] >
        FACE_CONSTRAINT_EPSILON
    );

  return activeOrder.length > 0
    ? activeOrder[
        activeOrder.length - 1
      ]
    : null;
}

function collisionDiagnosticsFor(
  positions,
  pairStrengths,
  lockedGroups,
  activePairId,
  meshes =
    TRUNCATED_TETRAHEDRON_MESHES
) {
  return analyzeSurfaceContacts({
    positions,
    meshes,
    pairStrengths,
    lockedGroups,
    activePairId,
    clearance:
      FACE_COLLISION_CLEARANCE,
    activationEpsilon:
      FACE_CONSTRAINT_EPSILON,
  });
}

function collisionBarrierContactsFor(
  positions,
  pairStrengths,
  lockedGroups,
  meshes =
    TRUNCATED_TETRAHEDRON_MESHES
) {
  return collectSurfaceBarrierContacts({
    positions,
    meshes,
    pairStrengths,
    lockedGroups,
    clearance:
      FACE_COLLISION_CLEARANCE,
    activationEpsilon:
      FACE_CONSTRAINT_EPSILON,
  });
}

function faceCentroid(
  positions,
  tetrahedronId,
  pairId,
  meshes =
    TRUNCATED_TETRAHEDRON_MESHES
) {
  const face =
    meshes[
      tetrahedronId
    ].largeFaces[
      pairId
    ];

  return averageWorldPoint(
    face.vertexIndices.map(
      (vertexIndex) =>
        positions[
          tetrahedronId
        ][vertexIndex]
    )
  );
}

function plannerGuideAmounts(
  strength
) {
  const amount =
    Math.max(
      0,
      Math.min(1, strength)
    );

  /*
   * The transit guide is zero at both endpoints and
   * reaches its maximum halfway through the approach.
   * It therefore moves the active face around the
   * obstruction and returns it exactly to its target.
   *
   * The smaller residual guide remains on the body
   * after closure, allowing the surrounding surface to
   * stay routed around the obstruction while the seam
   * vertices coincide.
   */
  return {
    transit:
      FACE_PLANNER_TRANSIT_DISTANCE *
      Math.sin(
        Math.PI * amount
      ),
    residual:
      FACE_PLANNER_RESIDUAL_DISTANCE *
      amount *
      (
        1 -
        0.35 * amount
      ),
  };
}

function applyPlannerGuide(
  positions,
  seed,
  guide,
  lockedGroups,
  meshes =
    TRUNCATED_TETRAHEDRON_MESHES
) {
  if (
    guide === null ||
    (
      guide.transitAmount <=
        FACE_CONSTRAINT_EPSILON &&
      guide.residualAmount <=
        FACE_CONSTRAINT_EPSILON
    )
  ) {
    return;
  }

  const faceA =
    meshes.A.largeFaces[
      guide.pairId
    ];

  const faceB =
    meshes.B.largeFaces[
      guide.pairId
    ];

  const faceAVertices =
    new Set(
      faceA.vertexIndices
    );

  const faceBVertices =
    new Set(
      faceB.vertexIndices
    );

  positions.A.forEach(
    (point, vertexIndex) => {
      const activeFaceVertex =
        faceAVertices.has(
          vertexIndex
        );

      const offset =
        (
          activeFaceVertex
            ? guide.transitAmount *
                0.03
            : guide.residualAmount *
                0.18
        );

      const target = {
        x:
          seed.A[
            vertexIndex
          ].x -
          guide.direction.x *
            offset,
        y:
          seed.A[
            vertexIndex
          ].y -
          guide.direction.y *
            offset,
        z:
          seed.A[
            vertexIndex
          ].z -
          guide.direction.z *
            offset,
      };

      point.x +=
        (
          target.x -
          point.x
        ) *
        FACE_PLANNER_GUIDE_STIFFNESS;

      point.y +=
        (
          target.y -
          point.y
        ) *
        FACE_PLANNER_GUIDE_STIFFNESS;

      point.z +=
        (
          target.z -
          point.z
        ) *
        FACE_PLANNER_GUIDE_STIFFNESS;
    }
  );

  positions.B.forEach(
    (point, vertexIndex) => {
      const activeFaceVertex =
        faceBVertices.has(
          vertexIndex
        );

      const offset =
        activeFaceVertex
          ? guide.transitAmount
          : guide.transitAmount +
            guide.residualAmount;

      const target = {
        x:
          seed.B[
            vertexIndex
          ].x +
          guide.direction.x *
            offset,
        y:
          seed.B[
            vertexIndex
          ].y +
          guide.direction.y *
            offset,
        z:
          seed.B[
            vertexIndex
          ].z +
          guide.direction.z *
            offset,
      };

      point.x +=
        (
          target.x -
          point.x
        ) *
        FACE_PLANNER_GUIDE_STIFFNESS;

      point.y +=
        (
          target.y -
          point.y
        ) *
        FACE_PLANNER_GUIDE_STIFFNESS;

      point.z +=
        (
          target.z -
          point.z
        ) *
        FACE_PLANNER_GUIDE_STIFFNESS;
    }
  );

  /*
   * Any vertex already participating in an earlier
   * completed seam is immediately returned to its
   * transitive locked class.
   */
  projectLockedSeams(
    positions,
    lockedGroups
  );
}

function tangentGuideBasis(
  positions,
  pairId,
  contacts,
  meshes =
    TRUNCATED_TETRAHEDRON_MESHES
) {
  const centerA =
    faceCentroid(
      positions,
      "A",
      pairId,
      meshes
    );

  const centerB =
    faceCentroid(
      positions,
      "B",
      pairId,
      meshes
    );

  const approach =
    normalizePoint(
      subtractPoint(
        centerA,
        centerB
      )
    );

  const accumulatedObstacle =
    contacts.reduce(
      (sum, contact) => {
        const influence =
          contact.penetrating
            ? FACE_COLLISION_CLEARANCE
            : Math.max(
                0,
                FACE_COLLISION_CLEARANCE -
                  contact.distance
              );

        return addPoint(
          sum,
          multiplyPoint(
            contact.direction,
            influence
          )
        );
      },
      {
        x: 0,
        y: 0,
        z: 0,
      }
    );

  let firstTangent =
    subtractPoint(
      accumulatedObstacle,
      multiplyPoint(
        approach,
        dotPoint(
          accumulatedObstacle,
          approach
        )
      )
    );

  if (
    Math.hypot(
      firstTangent.x,
      firstTangent.y,
      firstTangent.z
    ) <
    FACE_CONSTRAINT_EPSILON
  ) {
    const fallbackAxis =
      Math.abs(approach.x) <
        0.72
        ? {
            x: 1,
            y: 0,
            z: 0,
          }
        : {
            x: 0,
            y: 1,
            z: 0,
          };

    firstTangent =
      crossPoint(
        approach,
        fallbackAxis
      );
  }

  firstTangent =
    normalizePoint(
      firstTangent
    );

  const secondTangent =
    normalizePoint(
      crossPoint(
        approach,
        firstTangent
      )
    );

  return {
    approach,
    firstTangent,
    secondTangent,
  };
}

function plannerGuideCandidates(
  positions,
  pairId,
  contacts,
  preferredGuideIndex,
  meshes =
    TRUNCATED_TETRAHEDRON_MESHES
) {
  const {
    firstTangent,
    secondTangent,
  } = tangentGuideBasis(
    positions,
    pairId,
    contacts,
    meshes
  );

  const diagonalOne =
    normalizePoint(
      addPoint(
        firstTangent,
        secondTangent
      )
    );

  const diagonalTwo =
    normalizePoint(
      subtractPoint(
        firstTangent,
        secondTangent
      )
    );

  const directions = [
    firstTangent,
    multiplyPoint(
      firstTangent,
      -1
    ),
    secondTangent,
    multiplyPoint(
      secondTangent,
      -1
    ),
    diagonalOne,
    multiplyPoint(
      diagonalOne,
      -1
    ),
    diagonalTwo,
    multiplyPoint(
      diagonalTwo,
      -1
    ),
  ];

  const candidates =
    directions.map(
      (direction, index) => ({
        index,
        pairId,
        direction,
      })
    );

  if (
    preferredGuideIndex === null ||
    preferredGuideIndex === undefined
  ) {
    return candidates;
  }

  return candidates.sort(
    (first, second) => {
      if (
        first.index ===
        preferredGuideIndex
      ) {
        return -1;
      }

      if (
        second.index ===
        preferredGuideIndex
      ) {
        return 1;
      }

      return (
        first.index -
        second.index
      );
    }
  );
}

function faceSeamError(
  positions,
  pairId,
  mappingTurn = 0,
  geometry =
    DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY
) {
  const correspondence =
    facePairVertexCorrespondence(
      pairId,
      settledCyclicMappingIndex(
        mappingTurn
      ) ??
        normalizeCyclicMappingIndex(
          mappingTurn
        ),
      geometry
    );

  return correspondence.vertexPairs.reduce(
    (sum, vertexPair) =>
      sum +
      pointDistance(
        positions.A[
          vertexPair.vertexAIndex
        ],
        positions.B[
          vertexPair.vertexBIndex
        ]
      ),
    0
  ) /
  correspondence.vertexPairs.length;
}

function shapeDistortion(
  positions,
  faceShapeConstraints =
    FACE_SHAPE_CONSTRAINTS
) {
  let total = 0;
  let count = 0;

  ["A", "B"].forEach(
    (tetrahedronId) => {
      faceShapeConstraints[
        tetrahedronId
      ].forEach(
        (constraint) => {
          const currentLength =
            pointDistance(
              positions[
                tetrahedronId
              ][
                constraint.firstIndex
              ],
              positions[
                tetrahedronId
              ][
                constraint.secondIndex
              ]
            );

          total +=
            Math.abs(
              currentLength -
              constraint.restLength
            ) /
            Math.max(
              constraint.restLength,
              FACE_CONSTRAINT_EPSILON
            );

          count += 1;
        }
      );
    }
  );

  return count > 0
    ? total / count
    : 0;
}


function rootMeanSquare(
  values
) {
  if (values.length === 0) {
    return 0;
  }

  return Math.sqrt(
    values.reduce(
      (sum, value) =>
        sum +
        value * value,
      0
    ) /
    values.length
  );
}

function analyzeFaceSolutionValidity({
  positions,
  pairStrengths,
  constraintOrder,
  acceptedPairStrengths,
  collisionDiagnostics,
  blockedPairId,
  requestedStrength,
  acceptedStrength,
  plannerActive,
  plannerCandidateCount,
  plannerValidCandidateCount,
  plannerBestScore,
  blockedPlannerCandidateCount,
  blockedPlannerValidCandidateCount,
  blockedPlannerBestScore,
  solverResidual,
  initialSolverResidual,
  sweptPenetratingPairCount,
  facePairMappingTurns = [],
  geometry =
    DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY,
}) {
  function diagnosticCorrespondence(
    pairId
  ) {
    const mappingTurn =
      facePairMappingTurns[
        pairId
      ] ?? 0;

    return facePairVertexCorrespondence(
      pairId,
      settledCyclicMappingIndex(
        mappingTurn
      ) ??
        normalizeCyclicMappingIndex(
          mappingTurn
        ),
      geometry
    );
  }

  const pairMetrics =
    constraintOrder
      .filter(
        (pairId) =>
          pairStrengths[
            pairId
          ] >
          FACE_CONSTRAINT_EPSILON
      )
      .map((pairId) => {
        const errors =
          diagnosticCorrespondence(
            pairId
          ).vertexPairs.map(
            (vertexPair) =>
              pointDistance(
                positions.A[
                  vertexPair
                    .vertexAIndex
                ],
                positions.B[
                  vertexPair
                    .vertexBIndex
                ]
              )
          );

        return {
          pairId,
          requestedStrength:
            pairStrengths[
              pairId
            ],
          acceptedStrength:
            acceptedPairStrengths[
              pairId
            ] ?? 0,
          maximumError:
            Math.max(
              0,
              ...errors
            ),
          rmsError:
            rootMeanSquare(
              errors
            ),
        };
      });

  const allSeamErrors =
    pairMetrics.flatMap(
      (metric) =>
        diagnosticCorrespondence(
          metric.pairId
        ).vertexPairs.map(
          (vertexPair) =>
            pointDistance(
              positions.A[
                vertexPair
                  .vertexAIndex
              ],
              positions.B[
                vertexPair
                  .vertexBIndex
              ]
            )
        )
    );

  const edgeDistortions = [];

  ["A", "B"].forEach(
    (tetrahedronId) => {
      geometry.meshes[
        tetrahedronId
      ].edges.forEach(
        (edge) => {
          const [
            firstIndex,
            secondIndex,
          ] = edge.vertexIndices;

          const restLength =
            pointDistance(
              geometry.initialWorldPositions[
                tetrahedronId
              ][firstIndex],
              geometry.initialWorldPositions[
                tetrahedronId
              ][secondIndex]
            );

          const currentLength =
            pointDistance(
              positions[
                tetrahedronId
              ][firstIndex],
              positions[
                tetrahedronId
              ][secondIndex]
            );

          edgeDistortions.push(
            Math.abs(
              currentLength -
              restLength
            ) /
            Math.max(
              restLength,
              FACE_CONSTRAINT_EPSILON
            )
          );
        }
      );
    }
  );

  const triangleAreaRatios = [];
  let collapsedTriangleCount = 0;
  let invertedTriangleCount = 0;

  ["A", "B"].forEach(
    (tetrahedronId) => {
      const initialCenter =
        averageWorldPoint(
          geometry.initialWorldPositions[
            tetrahedronId
          ]
        );

      const currentCenter =
        averageWorldPoint(
          positions[
            tetrahedronId
          ]
        );

      geometry.meshes[
        tetrahedronId
      ].triangles.forEach(
        (triangle) => {
          const initialTriangle =
            triangle.vertexIndices.map(
              (vertexIndex) =>
                geometry.initialWorldPositions[
                  tetrahedronId
                ][vertexIndex]
            );

          const currentTriangle =
            triangle.vertexIndices.map(
              (vertexIndex) =>
                positions[
                  tetrahedronId
                ][vertexIndex]
            );

          const initialArea =
            triangleArea(
              initialTriangle[0],
              initialTriangle[1],
              initialTriangle[2]
            );

          const currentArea =
            triangleArea(
              currentTriangle[0],
              currentTriangle[1],
              currentTriangle[2]
            );

          const areaRatio =
            currentArea /
            Math.max(
              initialArea,
              FACE_CONSTRAINT_EPSILON
            );

          triangleAreaRatios.push(
            areaRatio
          );

          if (
            areaRatio <
            FACE_VALIDITY_COLLAPSE_RATIO
          ) {
            collapsedTriangleCount += 1;
          }

          const initialNormal =
            crossPoint(
              subtractPoint(
                initialTriangle[1],
                initialTriangle[0]
              ),
              subtractPoint(
                initialTriangle[2],
                initialTriangle[0]
              )
            );

          const currentNormal =
            crossPoint(
              subtractPoint(
                currentTriangle[1],
                currentTriangle[0]
              ),
              subtractPoint(
                currentTriangle[2],
                currentTriangle[0]
              )
            );

          const initialFacing =
            dotPoint(
              initialNormal,
              subtractPoint(
                averageWorldPoint(
                  initialTriangle
                ),
                initialCenter
              )
            );

          const currentFacing =
            dotPoint(
              currentNormal,
              subtractPoint(
                averageWorldPoint(
                  currentTriangle
                ),
                currentCenter
              )
            );

          if (
            Math.abs(
              initialFacing
            ) >
              FACE_CONSTRAINT_EPSILON &&
            Math.abs(
              currentFacing
            ) >
              FACE_CONSTRAINT_EPSILON &&
            initialFacing *
              currentFacing <
              0
          ) {
            invertedTriangleCount += 1;
          }
        }
      );
    }
  );

  const maximumSeamError =
    Math.max(
      0,
      ...allSeamErrors
    );

  const maximumEdgeDistortion =
    Math.max(
      0,
      ...edgeDistortions
    );

  const minimumTriangleAreaRatio =
    triangleAreaRatios.length > 0
      ? Math.min(
          ...triangleAreaRatios
        )
      : 1;

  const maximumTriangleAreaRatio =
    triangleAreaRatios.length > 0
      ? Math.max(
          ...triangleAreaRatios
        )
      : 1;

  const allRequestedFull =
    pairMetrics.every(
      (metric) =>
        metric.requestedStrength >=
        FACE_VALIDITY_FULL_STRENGTH
    );

  const allAccepted =
    pairMetrics.every(
      (metric) =>
        metric.acceptedStrength >=
        metric.requestedStrength -
          0.005
    );

  const seamsExact =
    pairMetrics
      .filter(
        (metric) =>
          metric.requestedStrength >=
          FACE_VALIDITY_FULL_STRENGTH
      )
      .every(
        (metric) =>
          metric.maximumError <=
          FACE_VALIDITY_SEAM_TOLERANCE
      );

  const collisionValid =
    collisionDiagnostics
      .penetratingPairs.length ===
      0 &&
    sweptPenetratingPairCount ===
      0;

  const shapeValid =
    maximumEdgeDistortion <=
      FACE_VALIDITY_EDGE_TOLERANCE &&
    minimumTriangleAreaRatio >=
      FACE_VALIDITY_COLLAPSE_RATIO &&
    maximumTriangleAreaRatio <=
      FACE_VALIDITY_EXPANSION_RATIO &&
    collapsedTriangleCount === 0 &&
    invertedTriangleCount === 0;

  const resolvedResidual =
    Number.isFinite(
      solverResidual
    )
      ? solverResidual
      : 0;

  const resolvedInitialResidual =
    Number.isFinite(
      initialSolverResidual
    )
      ? initialSolverResidual
      : 0;

  const residualImprovement =
    resolvedInitialResidual >
      FACE_CONSTRAINT_EPSILON
      ? resolvedInitialResidual /
        Math.max(
          resolvedResidual,
          FACE_CONSTRAINT_EPSILON
        )
      : 1;

  const numericallyConverged =
    resolvedResidual <=
    FACE_VALIDITY_RESIDUAL_TOLERANCE;

  const fullBlockedRequest =
    blockedPairId !== null &&
    (
      requestedStrength ??
      0
    ) >=
      FACE_VALIDITY_FULL_STRENGTH &&
    (
      acceptedStrength ??
      0
    ) <
      (
        requestedStrength ??
        0
      ) -
        0.005;

  const plannerExhausted =
    fullBlockedRequest &&
    blockedPlannerCandidateCount >= 8 &&
    blockedPlannerValidCandidateCount === 0;

  const plannerImproving =
    plannerValidCandidateCount > 0 &&
    Number.isFinite(
      plannerBestScore
    );

  const blockedPlannerImproving =
    blockedPlannerValidCandidateCount >
      0 &&
    Number.isFinite(
      blockedPlannerBestScore
    );

  const stagnating =
    !numericallyConverged &&
    residualImprovement < 1.05;

  let status = "routed";

  if (pairMetrics.length === 0) {
    status = "complete";
  } else if (!allRequestedFull) {
    status = "routed";
  } else if (
    plannerExhausted &&
    (
      stagnating ||
      fullBlockedRequest
    )
  ) {
    /*
     * Operational classification only: the current
     * literal embedded mesh and planner cannot realize
     * the requested quotient identification. This does
     * not prove that every possible representation fails.
     */
    status = "quotient-only";
  } else if (
    blockedPairId !== null
  ) {
    status = "blocked";
  } else if (
    allAccepted &&
    collisionValid &&
    seamsExact &&
    shapeValid
  ) {
    status = "complete";
  } else if (
    allRequestedFull &&
    (
      !collisionValid ||
      !seamsExact ||
      !shapeValid
    )
  ) {
    status = "quotient-only";
  } else if (plannerActive) {
    status = "routed";
  } else {
    status = "blocked";
  }

  return {
    status,
    pairMetrics,
    maximumSeamError,
    rmsSeamError:
      rootMeanSquare(
        allSeamErrors
      ),
    maximumEdgeDistortion,
    rmsEdgeDistortion:
      rootMeanSquare(
        edgeDistortions
      ),
    minimumTriangleAreaRatio,
    maximumTriangleAreaRatio,
    collapsedTriangleCount,
    invertedTriangleCount,
    minimumClearance:
      collisionDiagnostics
        .minimumClearance,
    solverResidual:
      resolvedResidual,
    initialSolverResidual:
      resolvedInitialResidual,
    residualImprovement,
    numericallyConverged,
    stagnating,
    plannerExhausted,
    plannerImproving,
    plannerCandidateCount,
    plannerValidCandidateCount,
    plannerBestScore,
    blockedPlannerCandidateCount,
    blockedPlannerValidCandidateCount,
    blockedPlannerBestScore,
    blockedPlannerImproving,
    allRequestedFull,
    allAccepted,
    seamsExact,
    collisionValid,
    shapeValid,
  };
}

function solveFacePairPositionsAttempt(
  pairStrengths,
  constraintOrder,
  plannerGuide = null,
  iterationCount =
    FACE_SOLVER_ITERATIONS,
  facePairMappingTurns = [],
  geometry =
    DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY
) {
  const positions =
    cloneWorldPositions(
      geometry.initialWorldPositions
    );

  const activeOrder =
    constraintOrder.filter(
      (pairId) =>
        pairStrengths[
          pairId
        ] >
        FACE_CONSTRAINT_EPSILON
    );

  const activePairId =
    activeOrder.length > 0
      ? activeOrder[
          activeOrder.length - 1
        ]
      : null;

  if (
    activeOrder.length === 0
  ) {
    const lockedGroups = [];

    return {
      positions,
      lockedGroups,
      diagnostics:
        collisionDiagnosticsFor(
          positions,
          pairStrengths,
          lockedGroups,
          activePairId,
          geometry.meshes
        ),
      barrierContactCount: 0,
      barrierCorrectionCount: 0,
      plannerGuideIndex: null,
      plannerPairId: null,
      plannerGuideAmount: 0,
      solverResidual: 0,
      initialSolverResidual: 0,
      residualImprovement: 1,
    };
  }

  /*
   * Preserve the exact rigid approach already used for
   * the first selected face. Later constraints deform
   * this shared state.
   */
  const firstPairId =
    activeOrder[0];

  const firstStrength =
    pairStrengths[
      firstPairId
    ];

  const firstPlacement =
    makeStagedFacePlacementTransform(
      geometry.facePairs[
        firstPairId
      ],
      firstStrength,
      facePairMappingTurns[
        firstPairId
      ] ?? 0,
      geometry.initialWorldPositions,
      geometry.tetrahedra ??
        TETRAHEDRA
    );

  positions.B =
    geometry.initialWorldPositions
      .B.map(firstPlacement);

  const seed =
    cloneWorldPositions(
      positions
    );

  const targetCenter =
    averageWorldPoint(
      allWorldPoints(seed)
    );

  const lockedGroups =
    createLockedSeamGroups(
      pairStrengths,
      activeOrder,
      facePairMappingTurns,
      geometry
    );

  /*
   * The first identification follows the prescribed
   * rigid rotation-orbit-approach path exactly. The
   * deformable collision solver and route planner begin
   * only when a second face constraint is introduced.
   */
  if (activeOrder.length === 1) {
    return {
      positions,
      lockedGroups,
      diagnostics:
        collisionDiagnosticsFor(
          positions,
          pairStrengths,
          lockedGroups,
          activePairId,
          geometry.meshes
        ),
      barrierContactCount: 0,
      barrierCorrectionCount: 0,
      plannerGuideIndex: null,
      plannerPairId: null,
      plannerGuideAmount: 0,
      solverResidual: 0,
      initialSolverResidual: 0,
      residualImprovement: 1,
    };
  }

  const resolvedGuide =
    plannerGuide === null
      ? null
      : {
          ...plannerGuide,
          ...(() => {
            const amounts =
              plannerGuideAmounts(
                pairStrengths[
                  plannerGuide.pairId
                ]
              );

            return {
              transitAmount:
                amounts.transit,
              residualAmount:
                amounts.residual,
            };
          })(),
        };

  let barrierCorrectionCount = 0;
  let initialSolverResidual = null;
  let solverResidual = 0;

  for (
    let iteration = 0;
    iteration <
      iterationCount;
    iteration += 1
  ) {
    const iterationStart =
      cloneWorldPositions(
        positions
      );

    tetherToSeed(
      positions,
      seed
    );

    applyPlannerGuide(
      positions,
      seed,
      resolvedGuide,
      lockedGroups,
      geometry.meshes
    );

    projectShapeConstraints(
      positions,
      FACE_SHAPE_STIFFNESS,
      geometry.faceShapeConstraints
    );

    for (
      let seamIteration = 0;
      seamIteration <
        FACE_SEAM_SUBITERATIONS;
      seamIteration += 1
    ) {
      projectActiveFaceConstraints(
        positions,
        activeOrder,
        pairStrengths,
        lockedGroups,
        facePairMappingTurns,
        geometry
      );
    }

    if (
      iteration %
        FACE_COLLISION_INTERVAL ===
        FACE_COLLISION_INTERVAL - 1 ||
      iteration ===
        iterationCount - 1
    ) {
      for (
        let pass = 0;
        pass <
          FACE_COLLISION_PASSES;
        pass += 1
      ) {
        const contacts =
          collisionBarrierContactsFor(
            positions,
            pairStrengths,
            lockedGroups,
            geometry.meshes
          );

        if (
          contacts.length === 0
        ) {
          break;
        }

        barrierCorrectionCount +=
          contacts.length;

        applyCollisionBarrierContacts(
          positions,
          contacts
        );

        applyPlannerGuide(
          positions,
          seed,
          resolvedGuide,
          lockedGroups,
          geometry.meshes
        );

        projectShapeConstraints(
          positions,
          FACE_COLLISION_SHAPE_STIFFNESS,
          geometry.faceShapeConstraints
        );

        projectActiveFaceConstraints(
          positions,
          activeOrder,
          pairStrengths,
          lockedGroups,
          facePairMappingTurns,
          geometry
        );
      }
    }

    projectActiveFaceConstraints(
      positions,
      activeOrder,
      pairStrengths,
      lockedGroups,
      facePairMappingTurns,
      geometry
    );

    recenterWorldPositions(
      positions,
      targetCenter
    );

    solverResidual =
      maximumPositionDisplacement(
        iterationStart,
        positions
      );

    if (
      initialSolverResidual ===
      null
    ) {
      initialSolverResidual =
        solverResidual;
    }
  }

  for (
    let pass = 0;
    pass <
      FACE_COLLISION_FINAL_PASSES;
    pass += 1
  ) {
    const passStart =
      cloneWorldPositions(
        positions
      );

    const contacts =
      collisionBarrierContactsFor(
        positions,
        pairStrengths,
        lockedGroups,
        geometry.meshes
      );

    if (
      contacts.length === 0
    ) {
      break;
    }

    barrierCorrectionCount +=
      contacts.length;

    applyCollisionBarrierContacts(
      positions,
      contacts
    );

    applyPlannerGuide(
      positions,
      seed,
      resolvedGuide,
      lockedGroups,
      geometry.meshes
    );

    projectShapeConstraints(
      positions,
      FACE_COLLISION_SHAPE_STIFFNESS,
      geometry.faceShapeConstraints
    );

    projectActiveFaceConstraints(
      positions,
      activeOrder,
      pairStrengths,
      lockedGroups,
      facePairMappingTurns,
      geometry
    );

    recenterWorldPositions(
      positions,
      targetCenter
    );

    solverResidual =
      maximumPositionDisplacement(
        passStart,
        positions
      );

    if (
      initialSolverResidual ===
      null
    ) {
      initialSolverResidual =
        solverResidual;
    }
  }

  const finalProjectionStart =
    cloneWorldPositions(
      positions
    );

  projectActiveFaceConstraints(
    positions,
    activeOrder,
    pairStrengths,
    lockedGroups,
    facePairMappingTurns,
    geometry
  );

  solverResidual =
    Math.max(
      solverResidual,
      maximumPositionDisplacement(
        finalProjectionStart,
        positions
      )
    );

  if (
    initialSolverResidual === null
  ) {
    initialSolverResidual =
      solverResidual;
  }

  const remainingContacts =
    collisionBarrierContactsFor(
      positions,
      pairStrengths,
      lockedGroups,
      geometry.meshes
    );

  return {
    positions,
    lockedGroups,
    diagnostics:
      collisionDiagnosticsFor(
        positions,
        pairStrengths,
        lockedGroups,
        activePairId,
        geometry.meshes
      ),
    barrierContactCount:
      remainingContacts.length,
    barrierCorrectionCount,
    plannerGuideIndex:
      resolvedGuide?.index ??
      null,
    plannerPairId:
      resolvedGuide?.pairId ??
      null,
    plannerGuideAmount:
      (
        resolvedGuide?.transitAmount ??
        0
      ) +
      (
        resolvedGuide?.residualAmount ??
        0
      ),
    solverResidual,
    initialSolverResidual:
      initialSolverResidual ??
      solverResidual,
    residualImprovement:
      (
        initialSolverResidual ??
        solverResidual
      ) >
        FACE_CONSTRAINT_EPSILON
        ? (
            initialSolverResidual ??
            solverResidual
          ) /
          Math.max(
            solverResidual,
            FACE_CONSTRAINT_EPSILON
          )
        : 1,
  };
}

function sweptDiagnosticsFor(
  fromPositions,
  toPositions,
  pairStrengths,
  lockedGroups,
  activePairId,
  geometry =
    DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY
) {
  return analyzeSweptSurfaceContacts({
    fromPositions,
    toPositions,
    meshes: geometry.meshes,
    pairStrengths,
    lockedGroups,
    activePairId,
    clearance:
      FACE_COLLISION_CLEARANCE,
    activationEpsilon:
      FACE_CONSTRAINT_EPSILON,
    samples:
      FACE_PLANNER_SWEEP_SAMPLES,
  });
}

function plannerCandidateScore(
  attempt,
  swept,
  pairId,
  preferredGuideIndex,
  facePairMappingTurns = [],
  geometry =
    DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY
) {
  const staticPenetrations =
    attempt.diagnostics
      .penetratingPairs.length;

  const sweptPenetrations =
    swept.penetratingPairs.length;

  if (
    staticPenetrations > 0 ||
    sweptPenetrations > 0
  ) {
    return Infinity;
  }

  const clearance =
    Math.min(
      attempt.diagnostics
        .minimumClearance ??
        FACE_COLLISION_CLEARANCE *
          2,
      swept.minimumClearance ??
        FACE_COLLISION_CLEARANCE *
          2
    );

  const preferencePenalty =
    preferredGuideIndex === null ||
    preferredGuideIndex ===
      attempt.plannerGuideIndex
      ? 0
      : FACE_PLANNER_HYSTERESIS_PENALTY;

  return (
    faceSeamError(
      attempt.positions,
      pairId,
      facePairMappingTurns[
        pairId
      ] ?? 0,
      geometry
    ) *
      FACE_PLANNER_SEAM_WEIGHT +
    shapeDistortion(
      attempt.positions,
      geometry.faceShapeConstraints
    ) *
      FACE_PLANNER_SHAPE_WEIGHT +
    attempt.diagnostics
      .nearContactPairs.length *
      FACE_PLANNER_NEAR_WEIGHT +
    attempt.barrierContactCount *
      FACE_PLANNER_BARRIER_WEIGHT -
    clearance *
      FACE_PLANNER_CLEARANCE_WEIGHT +
    preferencePenalty
  );
}

function findDirectionalPlannerAttempt({
  fromAttempt,
  requestedAttempt,
  requestedStrengths,
  constraintOrder,
  pairId,
  preferredGuideIndex,
  facePairMappingTurns = [],
  geometry =
    DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY,
}) {
  const contacts =
    collisionBarrierContactsFor(
      requestedAttempt.positions,
      requestedStrengths,
      requestedAttempt.lockedGroups,
      geometry.meshes
    );

  const candidates =
    plannerGuideCandidates(
      requestedAttempt.positions,
      pairId,
      contacts,
      preferredGuideIndex,
      geometry.meshes
    );

  const requestedStrength =
    requestedStrengths[
      pairId
    ];

  let bestCandidate = null;
  let validCandidateCount = 0;

  for (
    const candidate of candidates
  ) {
    let previousAttempt =
      fromAttempt;

    let finalAttempt = null;
    let pathValid = true;
    let pathMinimumClearance =
      Infinity;
    let pathNearContactCount = 0;

    for (
      let step = 1;
      step <=
        FACE_PLANNER_PATH_STEPS;
      step += 1
    ) {
      const stageStrengths = [
        ...requestedStrengths,
      ];

      stageStrengths[
        pairId
      ] =
        requestedStrength *
        (
          step /
          FACE_PLANNER_PATH_STEPS
        );

      const stageAttempt =
        solveFacePairPositionsAttempt(
          stageStrengths,
          constraintOrder,
          candidate,
          FACE_PLANNER_TRIAL_ITERATIONS,
          facePairMappingTurns,
          geometry
        );

      const stageSweep =
        sweptDiagnosticsFor(
          previousAttempt.positions,
          stageAttempt.positions,
          stageStrengths,
          stageAttempt.lockedGroups,
          pairId,
          geometry
        );

      if (
        stageAttempt.diagnostics
          .penetratingPairs.length >
          0 ||
        stageSweep.penetratingPairs
          .length > 0
      ) {
        pathValid = false;
        break;
      }

      const stageClearance =
        Math.min(
          stageAttempt.diagnostics
            .minimumClearance ??
            FACE_COLLISION_CLEARANCE *
              2,
          stageSweep
            .minimumClearance ??
            FACE_COLLISION_CLEARANCE *
              2
        );

      pathMinimumClearance =
        Math.min(
          pathMinimumClearance,
          stageClearance
        );

      pathNearContactCount +=
        stageAttempt.diagnostics
          .nearContactPairs.length +
        stageSweep
          .nearContactPairs.length;

      previousAttempt =
        stageAttempt;

      finalAttempt =
        stageAttempt;
    }

    if (
      !pathValid ||
      finalAttempt === null
    ) {
      continue;
    }

    const aggregateSweep = {
      minimumClearance:
        Number.isFinite(
          pathMinimumClearance
        )
          ? pathMinimumClearance
          : null,
      nearContactPairs:
        Array.from(
          {
            length:
              pathNearContactCount,
          }
        ),
      penetratingPairs: [],
    };

    const score =
      plannerCandidateScore(
        finalAttempt,
        aggregateSweep,
        pairId,
        preferredGuideIndex,
        facePairMappingTurns,
        geometry
      );

    if (
      !Number.isFinite(score)
    ) {
      continue;
    }

    validCandidateCount += 1;

    if (
      bestCandidate === null ||
      score <
        bestCandidate.score
    ) {
      bestCandidate = {
        candidate,
        score,
        previousAttempt,
      };
    }

    /*
     * Hysteresis: retain the previously successful side
     * when it still gives a fully embedded staged path.
     * This prevents frame-to-frame route chatter.
     */
    if (
      preferredGuideIndex !== null &&
      candidate.index ===
        preferredGuideIndex
    ) {
      break;
    }
  }

  if (
    bestCandidate === null
  ) {
    return {
      attempt: null,
      candidateCount:
        candidates.length,
      validCandidateCount,
      bestScore: null,
    };
  }

  const resolved =
    solveFacePairPositionsAttempt(
      requestedStrengths,
      constraintOrder,
      bestCandidate.candidate,
      FACE_SOLVER_ITERATIONS,
      facePairMappingTurns,
      geometry
    );

  const finalSweep =
    sweptDiagnosticsFor(
      bestCandidate
        .previousAttempt
        .positions,
      resolved.positions,
      requestedStrengths,
      resolved.lockedGroups,
      pairId,
      geometry
    );

  const valid =
    resolved.diagnostics
      .penetratingPairs.length ===
      0 &&
    finalSweep.penetratingPairs
      .length === 0;

  return {
    attempt:
      valid
        ? {
            ...resolved,
            sweptDiagnostics:
              finalSweep,
          }
        : null,
    candidateCount:
      candidates.length,
    validCandidateCount,
    bestScore:
      valid
        ? bestCandidate.score
        : null,
  };
}

function solveFacePairPositions(
  pairStrengths,
  constraintOrder,
  preferredGuideIndex = null,
  facePairMappingTurns = [],
  geometry =
    DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY
) {
  const acceptedStrengths =
    geometry.facePairs.map(
      () => 0
    );

  const activeOrder =
    constraintOrder.filter(
      (pairId) =>
        pairStrengths[
          pairId
        ] >
        FACE_CONSTRAINT_EPSILON
    );

  /*
   * Preserve the first pair's explicit rigid path.
   * The generic swept test interpolates mesh vertices
   * linearly between endpoints, which does not represent
   * an orbiting rigid body and can falsely activate the
   * planner or quotient fallback.
   */
  if (activeOrder.length === 1) {
    const pairId =
      activeOrder[0];

    const requestedStrength =
      pairStrengths[
        pairId
      ];

    const direct =
      solveFacePairPositionsAttempt(
        pairStrengths,
        constraintOrder,
        null,
        FACE_SOLVER_ITERATIONS,
        facePairMappingTurns,
        geometry
      );

    acceptedStrengths[
      pairId
    ] =
      requestedStrength;

    return {
      ...direct,
      blockedPairId: null,
      requestedStrength: null,
      acceptedStrength: null,
      acceptedPairStrengths: [
        ...acceptedStrengths,
      ],
      plannerActive: false,
      plannerCandidateCount: 0,
      plannerValidCandidateCount: 0,
      plannerBestScore: null,
      blockedPlannerCandidateCount: 0,
      blockedPlannerValidCandidateCount: 0,
      blockedPlannerBestScore: null,
      sweptPenetratingPairs: 0,
    };
  }

  let best =
    solveFacePairPositionsAttempt(
      acceptedStrengths,
      constraintOrder,
      null,
      FACE_SOLVER_ITERATIONS,
      facePairMappingTurns,
      geometry
    );

  let plannerCandidateCount = 0;
  let plannerValidCandidateCount = 0;
  let plannerBestScore = null;

  for (
    let orderIndex = 0;
    orderIndex <
      constraintOrder.length;
    orderIndex += 1
  ) {
    const pairId =
      constraintOrder[
        orderIndex
      ];

    const requestedStrength =
      pairStrengths[
        pairId
      ];

    if (
      requestedStrength <=
      FACE_CONSTRAINT_EPSILON
    ) {
      continue;
    }

    const requestedStrengths = [
      ...acceptedStrengths,
    ];

    requestedStrengths[
      pairId
    ] =
      requestedStrength;

    const requested =
      solveFacePairPositionsAttempt(
        requestedStrengths,
        constraintOrder,
        null,
        FACE_SOLVER_ITERATIONS,
        facePairMappingTurns,
        geometry
      );

    /*
     * The first selected pair is the rigid foundation
     * for every later constraint. Accept its prescribed
     * path directly, including when additional pairs are
     * already requested in the same solve.
     */
    if (orderIndex === 0) {
      acceptedStrengths[
        pairId
      ] =
        requestedStrength;

      best = {
        ...requested,
        sweptDiagnostics: {
          minimumClearance:
            requested.diagnostics
              .minimumClearance,
          minimumClearanceSample:
            null,
          nearContactPairs: [],
          penetratingPairs: [],
          sampleCount: 0,
        },
      };

      continue;
    }

    const directSweep =
      sweptDiagnosticsFor(
        best.positions,
        requested.positions,
        requestedStrengths,
        requested.lockedGroups,
        pairId,
        geometry
      );

    const directValid =
      requested.diagnostics
        .penetratingPairs.length ===
        0 &&
      directSweep.penetratingPairs
        .length === 0;

    if (directValid) {
      acceptedStrengths[
        pairId
      ] =
        requestedStrength;

      best = {
        ...requested,
        sweptDiagnostics:
          directSweep,
      };

      continue;
    }

    const planned =
      findDirectionalPlannerAttempt({
        fromAttempt: best,
        requestedAttempt:
          requested,
        requestedStrengths,
        constraintOrder,
        pairId,
        facePairMappingTurns,
        preferredGuideIndex:
          preferredGuideIndex?.pairId ===
            pairId
            ? preferredGuideIndex.index
            : null,
        geometry,
      });

    plannerCandidateCount +=
      planned.candidateCount;

    plannerValidCandidateCount +=
      planned.validCandidateCount;

    if (
      planned.bestScore !== null
    ) {
      plannerBestScore =
        plannerBestScore === null
          ? planned.bestScore
          : Math.min(
              plannerBestScore,
              planned.bestScore
            );
    }

    if (
      planned.attempt !== null
    ) {
      acceptedStrengths[
        pairId
      ] =
        requestedStrength;

      best =
        planned.attempt;

      continue;
    }

    /*
     * Every deterministic tangent route failed. Keep
     * all earlier seams, then binary-search the final
     * direct embedded strength for this step.
     */
    let lowerStrength = 0;
    let upperStrength =
      requestedStrength;

    for (
      let step = 0;
      step <
        FACE_COLLISION_BACKTRACK_STEPS;
      step += 1
    ) {
      const candidateStrength =
        (
          lowerStrength +
          upperStrength
        ) /
        2;

      const candidateStrengths = [
        ...acceptedStrengths,
      ];

      candidateStrengths[
        pairId
      ] =
        candidateStrength;

      const candidate =
        solveFacePairPositionsAttempt(
          candidateStrengths,
          constraintOrder,
          null,
          FACE_SOLVER_ITERATIONS,
          facePairMappingTurns,
          geometry
        );

      const candidateSweep =
        sweptDiagnosticsFor(
          best.positions,
          candidate.positions,
          candidateStrengths,
          candidate.lockedGroups,
          pairId,
          geometry
        );

      if (
        candidate.diagnostics
          .penetratingPairs.length ===
          0 &&
        candidateSweep
          .penetratingPairs.length ===
          0
      ) {
        lowerStrength =
          candidateStrength;

        best = {
          ...candidate,
          sweptDiagnostics:
            candidateSweep,
        };
      } else {
        upperStrength =
          candidateStrength;
      }
    }

    acceptedStrengths[
      pairId
    ] =
      lowerStrength;

    return {
      ...best,
      blockedPairId:
        pairId,
      requestedStrength,
      acceptedStrength:
        lowerStrength,
      acceptedPairStrengths: [
        ...acceptedStrengths,
      ],
      plannerActive: false,
      plannerCandidateCount,
      plannerValidCandidateCount,
      plannerBestScore,
      blockedPlannerCandidateCount:
        planned.candidateCount,
      blockedPlannerValidCandidateCount:
        planned.validCandidateCount,
      blockedPlannerBestScore:
        planned.bestScore,
      sweptPenetratingPairs:
        best.sweptDiagnostics
          ?.penetratingPairs.length ??
        0,
    };
  }

  return {
    ...best,
    blockedPairId: null,
    requestedStrength: null,
    acceptedStrength: null,
    acceptedPairStrengths: [
      ...acceptedStrengths,
    ],
    plannerActive:
      best.plannerGuideIndex !==
      null,
    plannerCandidateCount,
    plannerValidCandidateCount,
    plannerBestScore,
    blockedPlannerCandidateCount: 0,
    blockedPlannerValidCandidateCount: 0,
    blockedPlannerBestScore: null,
    sweptPenetratingPairs:
      best.sweptDiagnostics
        ?.penetratingPairs.length ??
      0,
  };
}

const FACE_ORDER_AUDIT_VERSION = 1;
const FACE_ORDER_AUDIT_DEFAULT_DELAY_MS = 40;

let faceOrderAuditPromise = null;
let faceOrderAuditCancelled = false;

function facePairOrders(values) {
  if (values.length <= 1) {
    return [[...values]];
  }

  return values.flatMap(
    (value, index) =>
      facePairOrders([
        ...values.slice(0, index),
        ...values.slice(index + 1),
      ]).map((tail) => [
        value,
        ...tail,
      ])
  );
}

function auditCollisionDiagnostics(
  faceSolution
) {
  return {
    ...faceSolution.diagnostics,
    blockedPairId:
      faceSolution.blockedPairId,
    requestedStrength:
      faceSolution.requestedStrength,
    acceptedStrength:
      faceSolution.acceptedStrength,
    plannerGuideIndex:
      faceSolution.plannerGuideIndex,
    plannerPairId:
      faceSolution.plannerPairId,
    plannerActive:
      faceSolution.plannerActive,
    plannerCandidateCount:
      faceSolution.plannerCandidateCount,
    plannerValidCandidateCount:
      faceSolution.plannerValidCandidateCount,
    plannerBestScore:
      faceSolution.plannerBestScore,
    blockedPlannerCandidateCount:
      faceSolution
        .blockedPlannerCandidateCount,
    blockedPlannerValidCandidateCount:
      faceSolution
        .blockedPlannerValidCandidateCount,
    blockedPlannerBestScore:
      faceSolution.blockedPlannerBestScore,
    sweptPenetratingPairs:
      faceSolution.sweptPenetratingPairs,
  };
}

function auditValidityDiagnostics({
  faceSolution,
  pairStrengths,
  constraintOrder,
  geometry =
    DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY,
}) {
  const collisionDiagnostics =
    auditCollisionDiagnostics(
      faceSolution
    );

  const validityDiagnostics =
    analyzeFaceSolutionValidity({
      positions:
        faceSolution.positions,
      pairStrengths,
      constraintOrder,
      acceptedPairStrengths:
        faceSolution
          .acceptedPairStrengths,
      collisionDiagnostics,
      blockedPairId:
        faceSolution.blockedPairId,
      requestedStrength:
        faceSolution.requestedStrength,
      acceptedStrength:
        faceSolution.acceptedStrength,
      plannerActive:
        faceSolution.plannerActive,
      plannerCandidateCount:
        faceSolution
          .plannerCandidateCount,
      plannerValidCandidateCount:
        faceSolution
          .plannerValidCandidateCount,
      plannerBestScore:
        faceSolution.plannerBestScore,
      blockedPlannerCandidateCount:
        faceSolution
          .blockedPlannerCandidateCount,
      blockedPlannerValidCandidateCount:
        faceSolution
          .blockedPlannerValidCandidateCount,
      blockedPlannerBestScore:
        faceSolution
          .blockedPlannerBestScore,
      solverResidual:
        faceSolution.solverResidual,
      initialSolverResidual:
        faceSolution
          .initialSolverResidual,
      sweptPenetratingPairCount:
        faceSolution
          .sweptPenetratingPairs,
      geometry,
    });

  return {
    collisionDiagnostics,
    validityDiagnostics,
  };
}

function quotientCutOpenDisplayIsValid({
  faceSolution,
  validityDiagnostics,
}) {
  return (
    validityDiagnostics
      .collisionValid &&
    validityDiagnostics
      .collapsedTriangleCount === 0 &&
    validityDiagnostics
      .invertedTriangleCount === 0 &&
    validityDiagnostics
      .maximumEdgeDistortion <=
      FACE_VALIDITY_EDGE_TOLERANCE &&
    validityDiagnostics
      .minimumTriangleAreaRatio >=
      FACE_VALIDITY_COLLAPSE_RATIO &&
    validityDiagnostics
      .maximumTriangleAreaRatio <=
      FACE_VALIDITY_EXPANSION_RATIO &&
    (
      faceSolution
        .sweptPenetratingPairs ?? 0
    ) === 0
  );
}

function findValidQuotientCutOpenState({
  faceSolution,
  pairStrengths,
  constraintOrder,
  firstOpenIndex,
  preferredGuideIndex = null,
  geometry =
    DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY,
}) {
  const firstOpenPairId =
    constraintOrder[
      firstOpenIndex
    ];

  let lastState = null;

  for (
    const factor of
      QUOTIENT_CUT_OPEN_BACKTRACK_FACTORS
  ) {
    const cutOpenStrength =
      Math.min(
        pairStrengths[
          firstOpenPairId
        ],
        QUOTIENT_CUT_OPEN_STRENGTH *
          factor
      );

    const candidateStrengths =
      geometry.facePairs.map(
        (_, pairId) =>
          faceSolution
            .acceptedPairStrengths[
              pairId
            ] ?? 0
      );

    constraintOrder.forEach(
      (pairId, orderIndex) => {
        if (
          orderIndex <
          firstOpenIndex
        ) {
          candidateStrengths[
            pairId
          ] = pairStrengths[
            pairId
          ];

          return;
        }

        candidateStrengths[
          pairId
        ] =
          orderIndex ===
          firstOpenIndex
            ? cutOpenStrength
            : 0;
      }
    );

    const candidateFaceSolution =
      solveFacePairPositions(
        candidateStrengths,
        constraintOrder,
        preferredGuideIndex,
        [],
        geometry
      );

    const candidateDiagnostics =
      auditValidityDiagnostics({
        faceSolution:
          candidateFaceSolution,
        pairStrengths:
          candidateStrengths,
        constraintOrder,
        geometry,
      });

    const state = {
      faceSolution:
        candidateFaceSolution,
      pairStrengths:
        candidateStrengths,
      collisionDiagnostics:
        candidateDiagnostics
          .collisionDiagnostics,
      validityDiagnostics:
        candidateDiagnostics
          .validityDiagnostics,
      cutOpenStrength,
      valid:
        quotientCutOpenDisplayIsValid({
          faceSolution:
            candidateFaceSolution,
          validityDiagnostics:
            candidateDiagnostics
              .validityDiagnostics,
        }),
    };

    lastState = state;

    if (state.valid) {
      return state;
    }
  }

  return {
    ...lastState,
    valid: false,
  };
}

function auditQuotientState({
  faceSolution,
  pairStrengths,
  constraintOrder,
  collisionDiagnostics,
  validityDiagnostics,
  geometry =
    DEFAULT_TRUNCATED_TETRAHEDRON_GEOMETRY,
}) {
  const requestedMetrics =
    validityDiagnostics.pairMetrics.filter(
      (metric) =>
        metric.requestedStrength >=
        FACE_VALIDITY_FULL_STRENGTH
    );

  const quotientDisplayActive =
    validityDiagnostics.status ===
      "quotient-only" ||
    (
      validityDiagnostics.status ===
        "blocked" &&
      validityDiagnostics
        .allRequestedFull
    );

  const unresolvedPairIds = [];

  if (quotientDisplayActive) {
    requestedMetrics.forEach(
      (metric) => {
        if (
          metric.acceptedStrength <
            metric.requestedStrength -
              0.005 ||
          metric.maximumError >
            FACE_VALIDITY_SEAM_TOLERANCE
        ) {
          unresolvedPairIds.push(
            metric.pairId
          );
        }
      }
    );

    const blockedPairId =
      collisionDiagnostics.blockedPairId;

    if (
      blockedPairId !== null &&
      !unresolvedPairIds.includes(
        blockedPairId
      )
    ) {
      unresolvedPairIds.push(
        blockedPairId
      );
    }

    if (
      unresolvedPairIds.length === 0 &&
      requestedMetrics.length > 0
    ) {
      unresolvedPairIds.push(
        requestedMetrics[
          requestedMetrics.length - 1
        ].pairId
      );
    }
  }

  const quotientPairIds =
    constraintOrder.filter(
      (pairId) =>
        unresolvedPairIds.includes(
          pairId
        )
    );

  let displayFaceSolution =
    faceSolution;

  let displayPairStrengths =
    pairStrengths;

  let quotientCutOpenStrength = null;
  let quotientCutOpenValid = true;

  if (
    validityDiagnostics.status ===
      "quotient-only" &&
    quotientPairIds.length > 0
  ) {
    const firstOpenPairId =
      quotientPairIds[0];

    const firstOpenIndex =
      constraintOrder.indexOf(
        firstOpenPairId
      );

    const cutOpenState =
      findValidQuotientCutOpenState({
        faceSolution,
        pairStrengths,
        constraintOrder,
        firstOpenIndex,
        preferredGuideIndex: null,
        geometry,
      });

    displayFaceSolution =
      cutOpenState.faceSolution;

    displayPairStrengths =
      cutOpenState.pairStrengths;

    quotientCutOpenStrength =
      cutOpenState.cutOpenStrength;

    quotientCutOpenValid =
      cutOpenState.valid;
  }

  const displayDiagnostics =
    auditValidityDiagnostics({
      faceSolution:
        displayFaceSolution,
      pairStrengths:
        displayPairStrengths,
      constraintOrder,
      geometry,
    });

  return {
    requestedMetrics,
    quotientDisplayActive,
    quotientPairIds,
    quotientCutOpenStrength,
    quotientCutOpenValid,
    displayFaceSolution,
    displayCollisionDiagnostics:
      displayDiagnostics
        .collisionDiagnostics,
    displayValidityDiagnostics:
      displayDiagnostics
        .validityDiagnostics,
  };
}

function auditFinalFaceOrder(
  sequence
) {
  const pairStrengths =
    FIGURE_EIGHT_FACE_PAIRS.map(
      (pair) =>
        sequence.includes(pair.id)
          ? 1
          : 0
    );

  const faceSolution =
    solveFacePairPositions(
      pairStrengths,
      sequence,
      null
    );

  const {
    collisionDiagnostics,
    validityDiagnostics,
  } = auditValidityDiagnostics({
    faceSolution,
    pairStrengths,
    constraintOrder: sequence,
  });

  const quotientState =
    auditQuotientState({
      faceSolution,
      pairStrengths,
      constraintOrder: sequence,
      collisionDiagnostics,
      validityDiagnostics,
    });

  const quotientPairSet =
    new Set(
      quotientState.quotientPairIds
    );

  const physicalPairIds =
    quotientState.requestedMetrics
      .filter(
        (metric) =>
          !quotientPairSet.has(
            metric.pairId
          ) &&
          metric.acceptedStrength >=
            metric.requestedStrength -
              0.005 &&
          metric.maximumError <=
            FACE_VALIDITY_SEAM_TOLERANCE
      )
      .map(
        (metric) => metric.pairId
      );

  const representedPairIds =
    [...new Set([
      ...physicalPairIds,
      ...quotientState
        .quotientPairIds,
    ])];

  const missingPairIds =
    sequence.filter(
      (pairId) =>
        !representedPairIds.includes(
          pairId
        )
    );

  const activePairId =
    sequence[
      sequence.length - 1
    ];

  const stalePlannerRoute =
    faceSolution.plannerActive &&
    faceSolution.plannerPairId !==
      activePairId;

  const displayIntersections =
    quotientState
      .displayCollisionDiagnostics
      .penetratingPairs.length;

  const displaySweptIntersections =
    quotientState
      .displayFaceSolution
      .sweptPenetratingPairs ?? 0;

  const failures = [];

  if (missingPairIds.length > 0) {
    failures.push(
      `missing pairs ${missingPairIds.join(
        ","
      )}`
    );
  }

  if (
    representedPairIds.length !== 4
  ) {
    failures.push(
      "representation count is not four"
    );
  }

  if (displayIntersections > 0) {
    failures.push(
      "displayed forbidden intersection"
    );
  }

  if (
    displaySweptIntersections > 0
  ) {
    failures.push(
      "displayed swept intersection"
    );
  }

  if (
    !quotientState
      .quotientCutOpenValid
  ) {
    failures.push(
      "no valid cut-open display state"
    );
  }

  if (
    quotientState
      .displayValidityDiagnostics
      .collapsedTriangleCount > 0
  ) {
    failures.push(
      "displayed collapsed triangle"
    );
  }

  if (
    quotientState
      .displayValidityDiagnostics
      .invertedTriangleCount > 0
  ) {
    failures.push(
      "displayed inverted triangle"
    );
  }

  if (stalePlannerRoute) {
    failures.push(
      `stale planner route ${faceSolution.plannerPairId}`
    );
  }

  return {
    sequence: [...sequence],
    status:
      validityDiagnostics.status,
    physicalPairIds,
    quotientPairIds: [
      ...quotientState
        .quotientPairIds,
    ],
    physicalSeamCount:
      physicalPairIds.length,
    quotientLinkCount:
      quotientState
        .quotientPairIds.length,
    quotientCutOpenStrength:
      quotientState
        .quotientCutOpenStrength,
    quotientCutOpenValid:
      quotientState
        .quotientCutOpenValid,
    representedPairCount:
      representedPairIds.length,
    missingPairIds,
    displayIntersections,
    displaySweptIntersections,
    maximumSeamError:
      validityDiagnostics
        .maximumSeamError,
    maximumEdgeDistortion:
      validityDiagnostics
        .maximumEdgeDistortion,
    displayedMaximumEdgeDistortion:
      quotientState
        .displayValidityDiagnostics
        .maximumEdgeDistortion,
    displayedMinimumTriangleAreaRatio:
      quotientState
        .displayValidityDiagnostics
        .minimumTriangleAreaRatio,
    collapsedTriangleCount:
      quotientState
        .displayValidityDiagnostics
        .collapsedTriangleCount,
    invertedTriangleCount:
      quotientState
        .displayValidityDiagnostics
        .invertedTriangleCount,
    plannerPairId:
      faceSolution.plannerPairId,
    activePairId,
    stalePlannerRoute,
    failures,
    pass: failures.length === 0,
  };
}

function waitForFaceOrderAudit(
  delayMs
) {
  return new Promise((resolve) =>
    setTimeout(resolve, delayMs)
  );
}

export function cancelFigureEightFaceOrderAudit() {
  faceOrderAuditCancelled = true;
}

export async function runFigureEightFaceOrderAudit({
  startIndex = 0,
  count = 24,
  delayMs =
    FACE_ORDER_AUDIT_DEFAULT_DELAY_MS,
} = {}) {
  if (
    process.env.NODE_ENV !==
    "development"
  ) {
    throw new Error(
      "The figure-eight face-order audit is available only in development mode."
    );
  }

  if (faceOrderAuditPromise !== null) {
    return faceOrderAuditPromise;
  }

  faceOrderAuditCancelled = false;

  faceOrderAuditPromise =
    (async () => {
      const allOrders =
        facePairOrders(
          FIGURE_EIGHT_FACE_PAIRS.map(
            (pair) => pair.id
          )
        );

      const firstIndex = Math.max(
        0,
        Math.min(
          allOrders.length,
          Math.floor(startIndex)
        )
      );

      const lastIndex = Math.max(
        firstIndex,
        Math.min(
          allOrders.length,
          firstIndex +
            Math.max(
              0,
              Math.floor(count)
            )
        )
      );

      const selectedOrders =
        allOrders.slice(
          firstIndex,
          lastIndex
        );

      const results = [];

      console.info(
        `Figure-eight final-state audit started: orders ${firstIndex + 1}–${lastIndex} of ${allOrders.length}.`
      );

      for (
        let index = 0;
        index < selectedOrders.length;
        index += 1
      ) {
        if (faceOrderAuditCancelled) {
          break;
        }

        const sequence =
          selectedOrders[index];

        const startedAt =
          performance.now();

        const result =
          auditFinalFaceOrder(
            sequence
          );

        const durationMs =
          performance.now() -
          startedAt;

        results.push({
          ...result,
          orderIndex:
            firstIndex + index,
          durationMs,
        });

        console.info(
          `[${firstIndex + index + 1}/${allOrders.length}] ${sequence.join("→")} — ${result.pass ? "PASS" : "FAIL"} — ${(durationMs / 1000).toFixed(1)} s`
        );

        if (
          typeof window !==
          "undefined"
        ) {
          window.__figureEightFaceOrderAudit = {
            version:
              FACE_ORDER_AUDIT_VERSION,
            running: true,
            cancelled: false,
            startIndex:
              firstIndex,
            endIndex:
              lastIndex,
            completed:
              results.length,
            results: [
              ...results,
            ],
          };
        }

        await waitForFaceOrderAudit(
          Math.max(0, delayMs)
        );
      }

      const failures =
        results.filter(
          (result) =>
            !result.pass
        );

      const representedAllFourCount =
        results.filter(
          (result) =>
            result.representedPairCount ===
              4 &&
            result.missingPairIds
              .length === 0
        ).length;

      const intersectionCount =
        results.reduce(
          (sum, result) =>
            sum +
            result.displayIntersections +
            result
              .displaySweptIntersections,
          0
        );

      const physicalCompletionCount =
        results.filter(
          (result) =>
            result.physicalSeamCount ===
            4
        ).length;

      const quotientCompletionCount =
        results.filter(
          (result) =>
            result.quotientLinkCount >
            0
        ).length;

      const stalePlannerRouteCount =
        results.filter(
          (result) =>
            result.stalePlannerRoute
        ).length;

      const report = {
        version:
          FACE_ORDER_AUDIT_VERSION,
        generatedAt:
          new Date().toISOString(),
        running: false,
        cancelled:
          faceOrderAuditCancelled,
        startIndex:
          firstIndex,
        endIndex:
          lastIndex,
        requestedOrderCount:
          selectedOrders.length,
        completedOrderCount:
          results.length,
        representedAllFourCount,
        intersectionCount,
        physicalCompletionCount,
        quotientCompletionCount,
        stalePlannerRouteCount,
        failureCount:
          failures.length,
        results,
        failures,
        pass:
          !faceOrderAuditCancelled &&
          representedAllFourCount ===
            selectedOrders.length &&
          intersectionCount === 0 &&
          failures.length === 0,
      };

      console.group(
        "Figure-eight 24-order final-state audit"
      );

      console.info(
        `${
          representedAllFourCount ===
          results.length
            ? "PASS"
            : "FAIL"
        }: ${representedAllFourCount}/${results.length} completed orders represent all four pairs`
      );

      console.info(
        `${
          intersectionCount === 0
            ? "PASS"
            : "FAIL"
        }: ${intersectionCount} accepted displayed intersections`
      );

      console.info(
        `Physical completions: ${physicalCompletionCount}`
      );

      console.info(
        `Quotient completions: ${quotientCompletionCount}`
      );

      console.info(
        `Stale planner routes: ${stalePlannerRouteCount}`
      );

      console.info(
        `Failures: ${failures.length}`
      );

      if (faceOrderAuditCancelled) {
        console.warn(
          "Audit cancelled before all requested orders completed."
        );
      }

      console.table(
        results.map((result) => ({
          order:
            result.orderIndex + 1,
          sequence:
            result.sequence.join("→"),
          status: result.status,
          physical:
            result.physicalSeamCount,
          quotient:
            result.quotientLinkCount,
          cutOpen:
            result
              .quotientCutOpenStrength ===
              null
              ? "—"
              : `${Math.round(
                  result
                    .quotientCutOpenStrength *
                    100
                )}%`,
          represented:
            result.representedPairCount,
          intersections:
            result.displayIntersections +
            result
              .displaySweptIntersections,
          collapsed:
            result.collapsedTriangleCount,
          inverted:
            result.invertedTriangleCount,
          stalePlanner:
            result.stalePlannerRoute,
          seconds:
            (
              result.durationMs /
              1000
            ).toFixed(1),
          pass: result.pass,
        }))
      );

      if (failures.length > 0) {
        console.table(
          failures.map((result) => ({
            order:
              result.orderIndex + 1,
            sequence:
              result.sequence.join("→"),
            status: result.status,
            failures:
              result.failures.join("; "),
          }))
        );
      }

      console.groupEnd();

      if (
        typeof window !==
        "undefined"
      ) {
        window.__figureEightFaceOrderAudit =
          report;
      }

      return report;
    })();

  try {
    return await faceOrderAuditPromise;
  } finally {
    faceOrderAuditPromise = null;
  }
}

function projectPoint(point, view) {
  const rotated = applyRotation(
    point,
    view.rotation
  );

  const perspectiveDistance =
    view.perspectiveDistance ??
    DEFAULT_PERSPECTIVE_DISTANCE;

  const perspective =
    1 /
    (
      1 +
      rotated.z / perspectiveDistance
    );

  const scale =
    perspective * view.zoom;

  return {
    x: 500 + rotated.x * scale,
    y: 350 - rotated.y * scale,
    depth: rotated.z,
  };
}

/*
 * Return the interpolated camera-space depth of a projected
 * triangle at one screen point.
 *
 * null means the screen point lies outside the triangle.
 */
function projectedTriangleDepthAtPoint(
  point,
  first,
  second,
  third
) {
  if (
    !point ||
    !first ||
    !second ||
    !third
  ) {
    return null;
  }

  const denominator =
    (
      second.y - third.y
    ) *
      (
        first.x - third.x
      ) +
    (
      third.x - second.x
    ) *
      (
        first.y - third.y
      );

  if (
    Math.abs(denominator) <
    1e-9
  ) {
    return null;
  }

  const firstWeight =
    (
      (
        second.y - third.y
      ) *
        (
          point.x - third.x
        ) +
      (
        third.x - second.x
      ) *
        (
          point.y - third.y
        )
    ) /
    denominator;

  const secondWeight =
    (
      (
        third.y - first.y
      ) *
        (
          point.x - third.x
        ) +
      (
        first.x - third.x
      ) *
        (
          point.y - third.y
        )
    ) /
    denominator;

  const thirdWeight =
    1 -
    firstWeight -
    secondWeight;

  /*
   * Small tolerance keeps a vertex lying exactly on its own
   * projected face boundary from flickering in and out.
   */
  const insideTolerance = 1e-6;

  if (
    firstWeight < -insideTolerance ||
    secondWeight < -insideTolerance ||
    thirdWeight < -insideTolerance
  ) {
    return null;
  }

  return (
    firstWeight *
      first.depth +
    secondWeight *
      second.depth +
    thirdWeight *
      third.depth
  );
}


/*
 * Test whether any rendered polygon lies in front of the
 * TRUE projected anchor of a vertex label.
 *
 * Faces are triangulated as a fan for the depth test only.
 * No visible geometry is changed.
 */
function projectedLabelAnchorIsOccluded(
  label,
  faces
) {
  const anchorPoint =
    label.anchorPoint ??
    label.point;

  if (
    !anchorPoint ||
    !Number.isFinite(
      anchorPoint.depth
    )
  ) {
    return false;
  }

  /*
   * In this projection, smaller camera-space z is nearer
   * the viewer. Require a real depth difference so a label
   * is not hidden by its own incident face.
   */
  const depthTolerance = 0.75;

  for (const face of faces) {
    const polygon =
      face?.projected;

    if (
      !Array.isArray(polygon) ||
      polygon.length < 3
    ) {
      continue;
    }

    const first =
      polygon[0];

    for (
      let index = 1;
      index <
        polygon.length - 1;
      index += 1
    ) {
      const surfaceDepth =
        projectedTriangleDepthAtPoint(
          anchorPoint,
          first,
          polygon[index],
          polygon[index + 1]
        );

      if (
        surfaceDepth === null
      ) {
        continue;
      }

      if (
        surfaceDepth <
        anchorPoint.depth -
          depthTolerance
      ) {
        return true;
      }
    }
  }

  return false;
}

/*
 * ============================================================
 * CUSP SURFACE LIGHTING
 * ============================================================
 *
 * The cusp colors encode material identity, so illumination
 * never reassigns or replaces them. It changes brightness only.
 *
 * The light is fixed in camera space, above-left and somewhat
 * toward the viewer. Rotating the object therefore rotates its
 * actual surface normals relative to this studio light.
 *
 * The diffuse term is intentionally two-sided. Some cusp tiles
 * inherit opposite polygon windings from their material
 * parameterization, while SVG renders both sides. Using the
 * absolute normal/light dot product prevents winding alone from
 * making a correctly colored patch artificially black.
 */

const CUSP_LIGHT_DIRECTION_CAMERA =
  Object.freeze({
    x: -0.436522,
    y: 0.595257,
    z: -0.674624,
  });

const CUSP_LIGHT_AMBIENT = 0.24;
const CUSP_LIGHT_DIFFUSE = 0.76;
const CUSP_LIGHT_CAMERA_FILL = 0.08;
const CUSP_LIGHT_MAX = 1.08;


function cuspFacetLightFactor(
  modelPoints,
  view
) {
  if (
    !Array.isArray(modelPoints) ||
    modelPoints.length < 3
  ) {
    return 1;
  }

  /*
   * Rotate the actual 3D triangle into camera coordinates.
   */
  const a =
    applyRotation(
      modelPoints[0],
      view.rotation
    );

  const b =
    applyRotation(
      modelPoints[1],
      view.rotation
    );

  const c =
    applyRotation(
      modelPoints[2],
      view.rotation
    );


  /*
   * Two tangent vectors.
   */
  const ab = {
    x: b.x - a.x,
    y: b.y - a.y,
    z: b.z - a.z,
  };

  const ac = {
    x: c.x - a.x,
    y: c.y - a.y,
    z: c.z - a.z,
  };


  /*
   * True 3D facet normal:
   *
   *     n = AB x AC
   */
  const normal = {
    x:
      ab.y * ac.z -
      ab.z * ac.y,

    y:
      ab.z * ac.x -
      ab.x * ac.z,

    z:
      ab.x * ac.y -
      ab.y * ac.x,
  };

  const normalLength =
    Math.hypot(
      normal.x,
      normal.y,
      normal.z
    );

  if (normalLength < 1e-10) {
    return 1;
  }

  const nx =
    normal.x / normalLength;

  const ny =
    normal.y / normalLength;

  const nz =
    normal.z / normalLength;


  /*
   * Lambert-style diffuse illumination.
   *
   * abs() makes this robust to opposite material-triangle
   * winding while retaining genuine curvature shading.
   */
  const diffuse =
    Math.pow(
      Math.abs(
        nx *
          CUSP_LIGHT_DIRECTION_CAMERA.x +
        ny *
          CUSP_LIGHT_DIRECTION_CAMERA.y +
        nz *
          CUSP_LIGHT_DIRECTION_CAMERA.z
      ),
      0.85
    );


  /*
   * A small camera-facing fill prevents the front of the tube
   * from becoming muddy when the directional source happens to
   * be tangent to it.
   */
  const cameraFill =
    Math.pow(
      Math.abs(nz),
      1.35
    );


  return Math.min(
    CUSP_LIGHT_MAX,
    Math.max(
      CUSP_LIGHT_AMBIENT,

      CUSP_LIGHT_AMBIENT +
        CUSP_LIGHT_DIFFUSE *
          diffuse +
        CUSP_LIGHT_CAMERA_FILL *
          cameraFill
    )
  );
}


function shadeCuspMaterialColor(
  baseColor,
  modelPoints,
  view
) {
  /*
   * The four canonical material colors are hex colors.
   * Leave any diagnostic/non-material rgba color untouched.
   */
  const match =
    /^#([0-9a-f]{6})$/i.exec(
      baseColor ?? ""
    );

  if (!match) {
    return baseColor;
  }

  const value =
    Number.parseInt(
      match[1],
      16
    );

  const base = [
    (value >> 16) & 255,
    (value >> 8) & 255,
    value & 255,
  ];

  const light =
    cuspFacetLightFactor(
      modelPoints,
      view
    );


  /*
   * Shadows multiply the original color.
   *
   * Highlights blend only slightly toward white, avoiding the
   * shiny-plastic look and preserving strong color identity.
   */
  const channels =
    light <= 1
      ? base.map(
          (channel) =>
            Math.round(
              channel * light
            )
        )
      : base.map(
          (channel) =>
            Math.round(
              channel +
              (255 - channel) *
                Math.min(
                  0.10,
                  (light - 1) * 0.8
                )
            )
        );


  return (
    `rgb(${channels[0]}, ` +
    `${channels[1]}, ` +
    `${channels[2]})`
  );
}

function polygonPoints(points) {
  return points
    .map((point) => `${point.x},${point.y}`)
    .join(" ");
}

function projectedPolylineSegments(
  points,
  cycleKind,
  depthBias = 0.75
) {
  let cumulativeLength = 0;

  return points
    .slice(0, -1)
    .map((point, index) => {
      const nextPoint = points[index + 1];

      const segmentLength = Math.hypot(
        nextPoint.x - point.x,
        nextPoint.y - point.y
      );

      const segment = {
        key: `${cycleKind}-${index}`,
        cycleKind,
        points: [point, nextPoint],
        depth:
          (point.depth + nextPoint.depth) / 2 -
          depthBias,
        dashOffset: -cumulativeLength,
      };

      cumulativeLength += segmentLength;

      return segment;
    });
}

function lerpProjectedPoint(
  start,
  end,
  amount
) {
  return {
    x:
      start.x +
      (end.x - start.x) * amount,
    y:
      start.y +
      (end.y - start.y) * amount,
    depth:
      (start.depth || 0) +
      ((end.depth || 0) -
        (start.depth || 0)) *
        amount,
  };
}

function translateProjectedPoint(
  point,
  offset
) {
  return {
    ...point,
    x: point.x + offset.x,
    y: point.y + offset.y,
  };
}

function projectedBounds(points) {
  if (points.length === 0) {
    return {
      minX: 500,
      maxX: 500,
      minY: 350,
      maxY: 350,
    };
  }

  return points.reduce(
    (current, point) => ({
      minX: Math.min(
        current.minX,
        point.x
      ),
      maxX: Math.max(
        current.maxX,
        point.x
      ),
      minY: Math.min(
        current.minY,
        point.y
      ),
      maxY: Math.max(
        current.maxY,
        point.y
      ),
    }),
    {
      minX: Infinity,
      maxX: -Infinity,
      minY: Infinity,
      maxY: -Infinity,
    }
  );
}

function projectedBoundsCenter(points) {
  const bounds =
    projectedBounds(points);

  return {
    x:
      (bounds.minX +
        bounds.maxX) /
      2,
    y:
      (bounds.minY +
        bounds.maxY) /
      2,
  };
}

/*
 * Blend two already-projected bounding boxes.
 *
 * This lets camera ownership move continuously from the complete
 * construction to the connected cusp surface instead of changing
 * framing sources in a single render.
 */
function interpolateProjectedBounds(
  startBounds,
  endBounds,
  amount
) {
  const progress =
    Math.max(
      0,
      Math.min(1, amount)
    );

  return {
    minX:
      startBounds.minX +
      (
        endBounds.minX -
        startBounds.minX
      ) *
        progress,
    maxX:
      startBounds.maxX +
      (
        endBounds.maxX -
        startBounds.maxX
      ) *
        progress,
    minY:
      startBounds.minY +
      (
        endBounds.minY -
        startBounds.minY
      ) *
        progress,
    maxY:
      startBounds.maxY +
      (
        endBounds.maxY -
        startBounds.maxY
      ) *
        progress,
  };
}

function rawCuspPoint(
  tetrahedronId,
  vertexIndex,
  neighborIndex
) {
  const key =
    `${tetrahedronId}${vertexIndex}`;

  return CUSP_FLAT_LAYOUT[key][
    neighborIndex
  ];
}

function rawCuspPointFromLayout(
  layout,
  tetrahedronId,
  vertexIndex,
  neighborIndex
) {
  const key = `${tetrahedronId}${vertexIndex}`;
  return layout?.[key]?.[neighborIndex] ??
    rawCuspPoint(tetrahedronId, vertexIndex, neighborIndex);
}

/*
 * DEVELOPED CUSP ASSEMBLY PLANE
 *
 * The two tetrahedra are separated along the x-axis.
 *
 * Their natural separating plane is therefore x = 0:
 *
 *             tetrahedron A
 *                  |
 *                  |
 *               x < 0
 *
 *            ===== x = 0 =====
 *             cusp development
 *
 *               x > 0
 *                  |
 *                  |
 *             tetrahedron B
 *
 * Keep the intrinsic 2D cusp coordinates unchanged; only change
 * their embedding in ambient 3-space.
 *
 * old:
 *   cusp coordinates -> xy-plane, z = 0
 *
 * new:
 *   cusp coordinates -> yz-plane, x = 0
 *
 * This places the assembled eight-triangle fundamental domain
 * literally between the two tetrahedra instead of through them.
 */
function cuspFlatPoint(point) {
  const planarU =
    (point.x - 0.75) *
    CUSP_FLAT_UNIT;

  const planarV =
    (point.y + CUSP_HEIGHT / 2) *
    CUSP_FLAT_UNIT;

  return {
    x: 0,
    y: planarU,
    z: planarV,
  };
}

function flatDomainPoint(point) {
  return projectPoint(
    cuspFlatPoint(point),
    {
      rotation: [
        1, 0, 0,
        0, 1, 0,
        0, 0, 1,
      ],
      zoom: 1,
    }
  );
}

function flatCuspPoint(
  tetrahedronId,
  vertexIndex,
  neighborIndex
) {
  return flatDomainPoint(
    rawCuspPoint(
      tetrahedronId,
      vertexIndex,
      neighborIndex
    )
  );
}

function clampUnit(value) {
  return Math.max(
    0,
    Math.min(1, value)
  );
}

function smoothStep(value) {
  const amount = clampUnit(value);

  return (
    amount *
    amount *
    (3 - 2 * amount)
  );
}

function blendTrianglePoint(
  points,
  weights
) {
  return {
    x:
      points[0].x * weights[0] +
      points[1].x * weights[1] +
      points[2].x * weights[2],
    y:
      points[0].y * weights[0] +
      points[1].y * weights[1] +
      points[2].y * weights[2],
    z:
      (points[0].z || 0) * weights[0] +
      (points[1].z || 0) * weights[1] +
      (points[2].z || 0) * weights[2],
  };
}

function blendTriangleWeights(
  cornerWeights,
  localWeights
) {
  return [0, 1, 2].map(
    (coordinateIndex) =>
      cornerWeights[0][coordinateIndex] *
        localWeights[0] +
      cornerWeights[1][coordinateIndex] *
        localWeights[1] +
      cornerWeights[2][coordinateIndex] *
        localWeights[2]
  );
}

function triangularSubdivision(divisions) {
  const cells = [];

  function weights(row, column) {
    const second = row / divisions;
    const third = column / divisions;

    return [
      1 - second - third,
      second,
      third,
    ];
  }

  for (
    let row = 0;
    row < divisions;
    row += 1
  ) {
    for (
      let column = 0;
      column < divisions - row;
      column += 1
    ) {
      const lowerLeft =
        weights(row, column);

      const lowerRight =
        weights(row + 1, column);

      const upperLeft =
        weights(row, column + 1);

      cells.push([
        lowerLeft,
        lowerRight,
        upperLeft,
      ]);

      if (
        column <
        divisions - row - 1
      ) {
        const upperRight =
          weights(
            row + 1,
            column + 1
          );

        cells.push([
          lowerRight,
          upperRight,
          upperLeft,
        ]);
      }
    }
  }

  return cells;
}

/*
 * Exact per-tile refinement.
 *
 * Begin with the largest EVEN uniform subdivision that does not
 * exceed the target. Replacing one selected triangle by three
 * centroid children adds exactly two faces while leaving all
 * three edges of that triangle unchanged. The eight material
 * tiles therefore keep matching boundary partitions.
 */
function triangularSubdivisionWithExactFaceCount(
  faceCount
) {
  const targetFaceCount =
    Math.max(
      2,
      Math.round(faceCount)
    );

  let divisions =
    Math.floor(
      Math.sqrt(targetFaceCount)
    );

  if (divisions % 2 !== 0) {
    divisions -= 1;
  }

  divisions =
    Math.max(
      2,
      divisions
    );

  const baseCells =
    triangularSubdivision(
      divisions
    );

  const centroidSplitCount =
    Math.max(
      0,
      Math.floor(
        (
          targetFaceCount -
          baseCells.length
        ) / 2
      )
    );

  if (
    centroidSplitCount === 0
  ) {
    return baseCells;
  }

  const splitCellIndices =
    new Set();

  for (
    let splitIndex = 0;
    splitIndex < centroidSplitCount;
    splitIndex += 1
  ) {
    /*
     * Spread the extra refinement across the complete tile
     * instead of concentrating it in one corner.
     */
    splitCellIndices.add(
      Math.min(
        baseCells.length - 1,
        Math.floor(
          (
            splitIndex + 0.5
          ) *
            baseCells.length /
            centroidSplitCount
        )
      )
    );
  }

  return baseCells.flatMap(
    (cell, cellIndex) => {
      if (
        !splitCellIndices.has(
          cellIndex
        )
      ) {
        return [cell];
      }

      const centroid =
        [0, 1, 2].map(
          (coordinateIndex) =>
            (
              cell[0][coordinateIndex] +
              cell[1][coordinateIndex] +
              cell[2][coordinateIndex]
            ) / 3
        );

      return [
        [
          cell[0],
          cell[1],
          centroid,
        ],
        [
          cell[1],
          cell[2],
          centroid,
        ],
        [
          cell[2],
          cell[0],
          centroid,
        ],
      ];
    }
  );
}

const CUSP_MESH_CELLS =
  triangularSubdivision(
    CUSP_MESH_DIVISIONS
  );

function cuspConnectedVertexKey(point) {
  return (
    `${point.x.toFixed(9)}:` +
    `${point.y.toFixed(9)}`
  );
}

/*
 * One canonical triangulation of the complete cusp development.
 * Interior tile edges share the same vertex records here; the two
 * remaining pairs of boundary cycles become coincident under the
 * Meridian/Longitude quotient maps.  The same face list is therefore
 * carried continuously through flat domain -> cylinder -> torus.
 */
function createCuspConnectedSurfaceMesh(
  requestedFaceCount
) {
  const vertexByKey = new Map();
  const faces = [];

  const normalizedFaceCount =
    normalizeCuspMeshFaceCount(
      requestedFaceCount
    );

  const surfaceCells =
    triangularSubdivisionWithExactFaceCount(
      normalizedFaceCount / 8
    );

  ["A", "B"].forEach(
    (tetrahedronId) => {
      VERTICES.forEach(
        (_, vertexIndex) => {
          const cuspBaseId =
            `${tetrahedronId}${vertexIndex}`;

          const rawCorners =
            TRUNCATION_NEIGHBORS[
              vertexIndex
            ].map(
              (neighborIndex) =>
                rawCuspPoint(
                  tetrahedronId,
                  vertexIndex,
                  neighborIndex
                )
            );

          surfaceCells.forEach(
            (cell, cellIndex) => {
              const vertexKeys =
                cell.map((weights) => {
                  const rawPoint =
                    blendTrianglePoint(
                      rawCorners,
                      weights
                    );

                  const key =
                    cuspConnectedVertexKey(
                      rawPoint
                    );

                  if (
                    !vertexByKey.has(key)
                  ) {
                    vertexByKey.set(
                      key,
                      rawPoint
                    );
                  }

                  return key;
                });

              faces.push({
                key:
                  `connected-cusp-${cuspBaseId}-` +
                  `${cellIndex}`,
                cuspBaseId,
                vertexKeys,
                weights: cell,
              });
            }
          );
        }
      );
    }
  );

  return {
    vertexByKey,
    faces,
    faceCount: faces.length,
  };
}


function cuspFlatFrame(
  firstBoundary,
  cuspCoordinateSpec =
    FIGURE_EIGHT_CUSP_COORDINATE_SPEC
) {
  const { domainCorners } =
    cuspCoordinateDomainAxes(
      cuspCoordinateSpec
    );

  const origin = cuspFlatPoint(
    domainCorners[0]
  );

  const uEnd = cuspFlatPoint(
    domainCorners[1]
  );

  const vEnd = cuspFlatPoint(
    domainCorners[3]
  );

  const axisVector =
    firstBoundary === "long"
      ? subtractPoint(vEnd, origin)
      : subtractPoint(uEnd, origin);

  const wrappedVector =
    firstBoundary === "long"
      ? subtractPoint(uEnd, origin)
      : subtractPoint(vEnd, origin);

  const axisLength = Math.hypot(
    axisVector.x,
    axisVector.y,
    axisVector.z
  );

  const axisUnit =
    normalizePoint(axisVector);

  const wrappedParallel =
    dotPoint(
      wrappedVector,
      axisUnit
    );

  const transverseVector =
    subtractPoint(
      wrappedVector,
      multiplyPoint(
        axisUnit,
        wrappedParallel
      )
    );

  const transverseLength =
    Math.hypot(
      transverseVector.x,
      transverseVector.y,
      transverseVector.z
    );

  const transverseUnit =
    normalizePoint(
      transverseVector
    );

  return {
    center: addPoint(
      origin,
      multiplyPoint(
        addPoint(
          axisVector,
          wrappedVector
        ),
        0.5
      )
    ),
    axisLength,
    axisUnit,
    wrappedParallel,
    transverseLength,
    transverseUnit,
  };
}

function cuspWrapParameters(
  point,
  firstBoundary,
  cuspCoordinateSpec =
    FIGURE_EIGHT_CUSP_COORDINATE_SPEC
) {
  const coordinates =
    cuspDomainCoordinates(
      point,
      cuspCoordinateSpec
    );

  return {
    /*
     * "long" identifies u = 0 with u = 1.
     * "short" identifies v = 0 with v = 1.
     */
    wrapped:
      firstBoundary === "long"
        ? coordinates.u
        : coordinates.v,

    axial:
      firstBoundary === "long"
        ? coordinates.v
        : coordinates.u,

    cylinderRadius:
      firstBoundary === "long"
        ? CUSP_LONG_CYLINDER_RADIUS
        : CUSP_SHORT_CYLINDER_RADIUS,

    cylinderLength:
      firstBoundary === "long"
        ? CUSP_LONG_CYLINDER_LENGTH
        : CUSP_SHORT_CYLINDER_LENGTH,
  };
}

function pointInCuspFrame(
  frame,
  axialOffset,
  transverseOffset,
  depthOffset
) {
  return addPoint(
    frame.center,
    addPoint(
      multiplyPoint(
        frame.axisUnit,
        axialOffset
      ),
      addPoint(
        multiplyPoint(
          frame.transverseUnit,
          transverseOffset
        ),
        {
          x: 0,
          y: 0,
          z: depthOffset,
        }
      )
    )
  );
}

function cuspRolledCylinderPoint(
  point,
  firstBoundary,
  progress,
  cuspCoordinateSpec =
    FIGURE_EIGHT_CUSP_COORDINATE_SPEC
) {
  const amount = clampUnit(progress);

  const frame =
    cuspFlatFrame(
      firstBoundary,
      cuspCoordinateSpec
    );

  const {
    wrapped,
    axial,
    cylinderRadius,
    cylinderLength,
  } = cuspWrapParameters(
    point,
    firstBoundary,
    cuspCoordinateSpec
  );

  /*
   * The cusp domain is an oblique parallelogram.
   *
   * While it rolls, gradually remove the wrapped
   * direction's axial shear. The parameterization
   * remains one continuous injective surface until
   * the intended boundary pair meets.
   */
  const currentAxisLength =
    frame.axisLength +
    (
      cylinderLength -
      frame.axisLength
    ) *
      amount;

  const targetCircumference =
    Math.PI *
    2 *
    cylinderRadius;

  const currentWrappedLength =
    frame.transverseLength +
    (
      targetCircumference -
      frame.transverseLength
    ) *
      amount;

  const axialOffset =
    (
      axial - 0.5
    ) *
      currentAxisLength +
    (
      wrapped - 0.5
    ) *
      frame.wrappedParallel *
      (1 - amount);

  const angleSpan =
    Math.PI *
    2 *
    amount;

  /*
   * Exact flat-domain limit. Avoid dividing by the
   * vanishing angular span at the initial frame.
   */
  if (angleSpan < 1e-7) {
    return pointInCuspFrame(
      frame,
      axialOffset,
      (
        wrapped - 0.5
      ) *
        currentWrappedLength,
      0
    );
  }

  const radius =
    currentWrappedLength /
    angleSpan;

  const angle =
    (
      wrapped - 0.5
    ) *
    angleSpan;

  return pointInCuspFrame(
    frame,
    axialOffset,
    radius * Math.sin(angle),
    radius *
      (
        Math.cos(angle) - 1
      ) +
      amount * cylinderRadius
  );
}

function cuspPartiallyClosedTorusPoint(
  raw,
  firstBoundary,
  progress,
  cuspCoordinateSpec =
    FIGURE_EIGHT_CUSP_COORDINATE_SPEC
) {
  const amount =
    smootherUnitInterval(
      clampUnit(progress)
    );

  const resolvedFirstBoundary =
    firstBoundary === "short"
      ? "short"
      : "long";

  /*
   * Stage-one geometry: the genuine first quotient cylinder.
   */
  const cylinderPoint =
    cuspRolledCylinderPoint(
      raw,
      resolvedFirstBoundary,
      1,
      cuspCoordinateSpec
    );

  const frame =
    cuspFlatFrame(
      resolvedFirstBoundary,
      cuspCoordinateSpec
    );

  const {
    wrapped,
    axial,
    cylinderRadius,
    cylinderLength,
  } = cuspWrapParameters(
    raw,
    resolvedFirstBoundary,
    cuspCoordinateSpec
  );

  const cylinderCenter =
    pointInCuspFrame(
      frame,
      (axial - 0.5) *
        cylinderLength,
      0,
      0
    );

  const cylinderRadial =
    subtractPoint(
      cylinderPoint,
      cylinderCenter
    );

  /*
   * Close the remaining axial direction into a circle whose
   * circumference equals the cylinder length.
   *
   * At axial = 1/2 the final circle has the same position and
   * tangent as the middle of the original cylinder, which makes
   * the deformation geometrically continuous.
   */
  const majorRadius =
    cylinderLength /
    (
      Math.PI *
      2
    );

  const majorAngle =
    (
      axial - 0.5
    ) *
    Math.PI *
    2;

  const sineMajor =
    Math.sin(
      majorAngle
    );

  const cosineMajor =
    Math.cos(
      majorAngle
    );

  const verticalUnit = {
    x: 0,
    y: 0,
    z: 1,
  };

  const torusCenter =
    addPoint(
      frame.center,
      addPoint(
        multiplyPoint(
          frame.axisUnit,
          majorRadius *
            sineMajor
        ),
        multiplyPoint(
          verticalUnit,
          majorRadius *
            (
              1 -
              cosineMajor
            )
        )
      )
    );

  /*
   * This is the inward normal of the major circle.
   * At majorAngle = 0 it is exactly +z, matching the
   * cylinder's radial frame.
   */
  const majorNormal =
    addPoint(
      multiplyPoint(
        frame.axisUnit,
        -sineMajor
      ),
      multiplyPoint(
        verticalUnit,
        cosineMajor
      )
    );

  const minorAngle =
    (
      wrapped - 0.5
    ) *
    Math.PI *
    2;

  const torusRadial =
    addPoint(
      multiplyPoint(
        frame.transverseUnit,
        cylinderRadius *
          Math.sin(
            minorAngle
          )
      ),
      multiplyPoint(
        majorNormal,
        cylinderRadius *
          Math.cos(
            minorAngle
          )
      )
    );

  /*
   * Bend the cylinder as one tube. Interpolate its centerline
   * and radial frame independently, then restore the constant
   * tube radius. This avoids a pointwise collapse through the
   * interior of the torus.
   */
  const center =
    lerpPoint(
      cylinderCenter,
      torusCenter,
      amount
    );

  const blendedRadial =
    lerpPoint(
      cylinderRadial,
      torusRadial,
      amount
    );

  const blendedLength =
    Math.hypot(
      blendedRadial.x,
      blendedRadial.y,
      blendedRadial.z
    );

  const radialDirection =
    blendedLength > 1e-9
      ? multiplyPoint(
          blendedRadial,
          1 /
            blendedLength
        )
      : normalizePoint(
          torusRadial
        );

  return addPoint(
    center,
    multiplyPoint(
      radialDirection,
      cylinderRadius
    )
  );
}


/*
 * Local deformation amount for one longitudinal section of the
 * open cylinder.
 *
 * globalProgress moves one front from axial = 0 toward axial = 1.
 *
 * At any instant:
 *
 *   axial < front  -> already woven
 *   axial ~ front  -> currently bending
 *   axial > front  -> still cylindrical
 *
 * The front travels slightly beyond the final endpoint so every
 * section reaches exactly 1 when the identification completes.
 */
function figureEightWeaveSectionProgress(
  globalProgress,
  axialCoordinate
) {
  const progress =
    clampUnit(globalProgress);

  const axial =
    clampUnit(axialCoordinate);

  if (progress <= 0) {
    return 0;
  }

  if (progress >= 1) {
    return 1;
  }

  const frontWidth =
    FIGURE_EIGHT_WEAVE_FRONT_WIDTH;

  const frontPosition =
    progress *
    (
      1 +
      frontWidth
    );

  return smootherUnitInterval(
    clampUnit(
      (
        frontPosition -
        axial
      ) /
        frontWidth
    )
  );
}


function cuspPartiallyKnottedTubePoint(
  raw,
  firstBoundary,
  progress,
  cuspCoordinateSpec =
    FIGURE_EIGHT_CUSP_COORDINATE_SPEC
) {
  const globalAmount =
    clampUnit(progress);

  const resolvedFirstBoundary =
    firstBoundary === "short"
      ? "short"
      : "long";

  /*
   * ==========================================================
   * EXACT STARTING GEOMETRY
   * ==========================================================
   *
   * This is the genuine first peripheral quotient: the cylinder.
   */
  const cylinderPoint =
    cuspRolledCylinderPoint(
      raw,
      resolvedFirstBoundary,
      1,
      cuspCoordinateSpec
    );

  const frame =
    cuspFlatFrame(
      resolvedFirstBoundary,
      cuspCoordinateSpec
    );

  const {
    axial,
    cylinderLength,
  } = cuspWrapParameters(
    raw,
    resolvedFirstBoundary,
    cuspCoordinateSpec
  );

  const cylinderCenter =
    pointInCuspFrame(
      frame,
      (axial - 0.5) *
        cylinderLength,
      0,
      0
    );

  const cylinderRadial =
    subtractPoint(
      cylinderPoint,
      cylinderCenter
    );

  const cylinderRadius =
    Math.hypot(
      cylinderRadial.x,
      cylinderRadial.y,
      cylinderRadial.z
    );

  const cylinderRadialDirection =
    cylinderRadius > 1e-9
      ? multiplyPoint(
          cylinderRadial,
          1 / cylinderRadius
        )
      : frame.transverseUnit;


  /*
   * ==========================================================
   * PHASE 1 — PREPARE THE FEED TUBE
   * ==========================================================
   *
   * Before attempting the knot, deliberately make the existing
   * cylinder:
   *
   *   • longer,
   *   • thinner,
   *   • displaced sideways,
   *   • displaced out of the knot plane.
   *
   * The SAME colored material mesh is doing this deformation.
   * Nothing disappears, gets recolored, or gets replaced.
   */
  const prepProgress =
    smootherUnitInterval(
      clampUnit(
        globalAmount /
          FIGURE_EIGHT_WEAVE_PREP_FRACTION
      )
    );

  const preparedLength =
    cylinderLength *
    FIGURE_EIGHT_WEAVE_PREP_LENGTH_SCALE;

  const preparedRadius =
    cylinderRadius *
    FIGURE_EIGHT_WEAVE_PREP_RADIUS_SCALE;

  /*
   * The prepared feed tube remains straight. Its axial coordinate
   * is simply expanded from the cylinder's existing center.
   *
   * The two staging offsets deliberately place it somewhere
   * visibly separate from the final figure-eight region.
   */
  const preparedCenter =
    pointInCuspFrame(
      frame,
      (axial - 0.5) *
        preparedLength,
      FIGURE_EIGHT_WEAVE_STAGING_TRANSVERSE_OFFSET,
      FIGURE_EIGHT_WEAVE_STAGING_DEPTH_OFFSET
    );

  const feedCenter =
    lerpPoint(
      cylinderCenter,
      preparedCenter,
      prepProgress
    );

  const feedRadius =
    cylinderRadius +
    (
      preparedRadius -
      cylinderRadius
    ) *
      prepProgress;

  const feedRadial =
    multiplyPoint(
      cylinderRadialDirection,
      feedRadius
    );

  const feedPoint =
    addPoint(
      feedCenter,
      feedRadial
    );


  /*
   * ==========================================================
   * PHASE 2 — WEAVE THE PREPARED TUBE
   * ==========================================================
   *
   * The weave clock is completely dormant during preparation.
   *
   * At 30% of the global animation:
   *
   *   preparation = complete
   *   weave       = 0
   *
   * At 100%:
   *
   *   weave       = 1
   */
  const weaveProgress =
    clampUnit(
      (
        globalAmount -
        FIGURE_EIGHT_WEAVE_PREP_FRACTION
      ) /
      (
        1 -
        FIGURE_EIGHT_WEAVE_PREP_FRACTION
      )
    );

  /*
   * During the whole preparation interval the exact answer is
   * simply the currently prepared feed tube.
   */
  if (weaveProgress <= 0) {
    return feedPoint;
  }


  const tubeCoordinates =
    cuspTubeCoordinates(
      raw,
      cuspCoordinateSpec
    );

  /*
   * A cusp without an assigned peripheral coordinate system can
   * still form the first cylinder and prepared feed tube.
   *
   * Do not invent a knot target.
   */
  if (!tubeCoordinates) {
    return feedPoint;
  }


  /*
   * One longitudinal cross-section receives one weave amount.
   *
   * Behind the moving front:
   *   exact figure-eight geometry.
   *
   * At the moving front:
   *   active bend.
   *
   * Ahead of the moving front:
   *   long skinny displaced feed tube.
   */
  const amount =
    figureEightWeaveSectionProgress(
      weaveProgress,
      axial
    );


  /*
   * ==========================================================
   * EXACT FINAL GEOMETRY
   * ==========================================================
   *
   * Same shared S^3 centerline and tube used by Projection Lab.
   */
  const knotCenter =
    multiplyPoint(
      figureEightReferenceCoreModelPoint(
        tubeCoordinates.routeAmount,
        0
      ),
      1 / CUSP_BOUNDARY_WORLD_SCALE
    );

  const knotPoint =
    figureEightKnotBoundaryModelPoint(
      raw,
      0,
      cuspCoordinateSpec
    );

  const knotRadial =
    subtractPoint(
      knotPoint,
      knotCenter
    );

  const knotRadius =
    Math.hypot(
      knotRadial.x,
      knotRadial.y,
      knotRadial.z
    );


  /*
   * ==========================================================
   * MOVING BEND
   * ==========================================================
   *
   * Until the front reaches this section, its center remains on
   * the displaced feed line.
   *
   * As the front passes, the section peels away from that line
   * and enters its exact position on the figure-eight core.
   */
  const center =
    lerpPoint(
      preparedCenter,
      knotCenter,
      amount
    );


  /*
   * Keep the waiting material skinny.
   *
   * Recover the exact final tube thickness only as this particular
   * cross-section enters the knot.
   */
  const blendedRadial =
    lerpPoint(
      multiplyPoint(
        cylinderRadialDirection,
        preparedRadius
      ),
      knotRadial,
      amount
    );

  const blendedRadialLength =
    Math.hypot(
      blendedRadial.x,
      blendedRadial.y,
      blendedRadial.z
    );

  const radius =
    preparedRadius +
    (
      knotRadius -
      preparedRadius
    ) *
      amount;

  const radialDirection =
    blendedRadialLength > 1e-9
      ? multiplyPoint(
          blendedRadial,
          1 / blendedRadialLength
        )
      : normalizePoint(
          knotRadial
        );


  return addPoint(
    center,
    multiplyPoint(
      radialDirection,
      radius
    )
  );
}

function cuspModelPointFromStage(
  raw,
  firstBoundary,
  stagedProgress,
  cuspCoordinateSpec =
    FIGURE_EIGHT_CUSP_COORDINATE_SPEC
) {
  const stage =
    Math.max(
      0,
      Math.min(
        2,
        stagedProgress
      )
    );

  const resolvedFirstBoundary =
    firstBoundary === "short"
      ? "short"
      : "long";

  if (stage <= 1) {
    return cuspRolledCylinderPoint(
      raw,
      resolvedFirstBoundary,
      stage,
      cuspCoordinateSpec
    );
  }

  const secondClosureAmount =
    clampUnit(
      stage - 1
    );

  /*
   * The first peripheral quotient is a cylinder.
   *
   * The second quotient carries that same singly-covered material
   * surface onto the shared figure-eight tube.
   *
   * m004 and m003 differ in their material cusp coordinates and
   * triangle assignments; they no longer switch to different
   * torus surface implementations here.
   */
  return cuspPartiallyKnottedTubePoint(
    raw,
    resolvedFirstBoundary,
    secondClosureAmount,
    cuspCoordinateSpec
  );
}

function cuspModelPointFromRaw(
  raw,
  firstBoundary,
  shortWrapProgress,
  longWrapProgress,
  cuspCoordinateSpec =
    FIGURE_EIGHT_CUSP_COORDINATE_SPEC
) {
  return cuspModelPointFromStage(
    raw,
    firstBoundary,
    smoothStep(shortWrapProgress) +
      smoothStep(longWrapProgress),
    cuspCoordinateSpec
  );
}

function wrapUnitInterval(value) {
  const wrapped = value % 1;

  return wrapped < 0
    ? wrapped + 1
    : wrapped;
}

function figureEightKnotCommonSpineModelPoint(
  routeAmount
) {
  const amount = wrapUnitInterval(
    routeAmount +
    FIGURE_EIGHT_KNOT_COMMON_PHASE
  );

  const angle =
    amount * Math.PI * 2;

  /*
   * Standard smooth embedding of a figure-eight knot.  Keeping this as
   * one centerline is the key change: both meridional torus halves now
   * wrap around the same knotted conduit instead of following two
   * neighboring hand-routed splines.
   */
  const radial =
    2 + Math.cos(2 * angle);

  return {
    x:
      FIGURE_EIGHT_KNOT_COMMON_SCALE_X *
      radial *
      Math.cos(3 * angle) /
      3,
    y:
      FIGURE_EIGHT_KNOT_COMMON_SCALE_Y *
      Math.sin(4 * angle),
    z:
      FIGURE_EIGHT_KNOT_COMMON_SCALE_Z *
      radial *
      Math.sin(3 * angle) /
      3,
  };
}

function figureEightKnotCommonSpinePoint(
  routeAmount
) {
  return multiplyPoint(
    figureEightKnotCommonSpineModelPoint(
      routeAmount
    ),
    CUSP_BOUNDARY_WORLD_SCALE
  );
}

function figureEightKnotCommonSpineFrame(
  routeAmount
) {
  const epsilon =
    FIGURE_EIGHT_KNOT_FRAME_EPSILON;

  const center =
    figureEightKnotCommonSpinePoint(
      routeAmount
    );

  const before =
    figureEightKnotCommonSpinePoint(
      routeAmount - epsilon
    );

  const after =
    figureEightKnotCommonSpinePoint(
      routeAmount + epsilon
    );

  const tangent = normalizePoint(
    subtractPoint(after, before)
  );

  /*
   * Use the centerline's radial direction, projected perpendicular to
   * the tangent, as a stable transported cross-section axis.  This
   * avoids the visible frame flip that a changing global reference axis
   * can introduce while the tube passes through the knot crossings.
   */
  let normal = subtractPoint(
    center,
    multiplyPoint(
      tangent,
      dotPoint(center, tangent)
    )
  );

  if (
    Math.hypot(
      normal.x,
      normal.y,
      normal.z
    ) < 1e-6
  ) {
    normal = crossPoint(
      tangent,
      { x: 0, y: 1, z: 0 }
    );
  }

  normal = normalizePoint(normal);

  const binormal = normalizePoint(
    crossPoint(
      tangent,
      normal
    )
  );

  return {
    center,
    tangent,
    normal,
    binormal,
  };
}

function addPoint4(first, second) {
  return {
    w: first.w + second.w,
    x: first.x + second.x,
    y: first.y + second.y,
    z: first.z + second.z,
  };
}

function subtractPoint4(first, second) {
  return {
    w: first.w - second.w,
    x: first.x - second.x,
    y: first.y - second.y,
    z: first.z - second.z,
  };
}

function multiplyPoint4(point, amount) {
  return {
    w: point.w * amount,
    x: point.x * amount,
    y: point.y * amount,
    z: point.z * amount,
  };
}

function dotPoint4(first, second) {
  return (
    first.w * second.w +
    first.x * second.x +
    first.y * second.y +
    first.z * second.z
  );
}

function normalizePoint4(point) {
  const length = Math.hypot(
    point.w,
    point.x,
    point.y,
    point.z
  );

  if (length < 1e-12) {
    return {
      w: 0,
      x: 0,
      y: 0,
      z: 0,
    };
  }

  return multiplyPoint4(
    point,
    1 / length
  );
}

function determinant3(
  a00,
  a01,
  a02,
  a10,
  a11,
  a12,
  a20,
  a21,
  a22
) {
  return (
    a00 * (a11 * a22 - a12 * a21) -
    a01 * (a10 * a22 - a12 * a20) +
    a02 * (a10 * a21 - a11 * a20)
  );
}

function crossPoint4(
  first,
  second,
  third
) {
  return {
    w: determinant3(
      first.x,
      first.y,
      first.z,
      second.x,
      second.y,
      second.z,
      third.x,
      third.y,
      third.z
    ),
    x: -determinant3(
      first.w,
      first.y,
      first.z,
      second.w,
      second.y,
      second.z,
      third.w,
      third.y,
      third.z
    ),
    y: determinant3(
      first.w,
      first.x,
      first.z,
      second.w,
      second.x,
      second.z,
      third.w,
      third.x,
      third.z
    ),
    z: -determinant3(
      first.w,
      first.x,
      first.y,
      second.w,
      second.x,
      second.y,
      third.w,
      third.x,
      third.y
    ),
  };
}

function figureEightReferenceCorePoint4(
  routeAmount
) {
  const point =
    figureEightS3CenterlinePoint(
      wrapUnitInterval(
        routeAmount
      ) *
        Math.PI *
        2,
      DEFAULT_FIGURE_EIGHT_S3_GEOMETRY
        .lambda,
      DEFAULT_FIGURE_EIGHT_S3_GEOMETRY
        .epsilon
    );

  /*
   * The historical constructor 4-vector object uses the names
   * (w,x,y,z) for the Projection Lab array coordinates
   * [x,y,z,w]. Preserve that local contract at this boundary.
   */
  return {
    w: point[0],
    x: point[1],
    y: point[2],
    z: point[3],
  };
}

function figureEightReferenceTubePoint4(
  routeAmount,
  minorAngle
) {
  const point =
    figureEightS3TubePoint4(
      routeAmount,
      minorAngle /
        (
          Math.PI *
          2
        )
    );

  return {
    w: point[0],
    x: point[1],
    y: point[2],
    z: point[3],
  };
}

function figureEightReferenceStereographicPoint(
  point,
  projectionProgress
) {
  const progress =
    clampUnit(
      projectionProgress
    );

  const projection =
    interpolateFigureEightS3Projection(
      FIGURE_EIGHT_S3_STANDARD_PROJECTION,
      FIGURE_EIGHT_S3_SYMMETRIC_PROJECTION,
      progress
    );

  const projected =
    stereographicFigureEightS3Point(
      [
        point.w,
        point.x,
        point.y,
        point.z,
      ],
      projection
    );

  return {
    x: projected[0],
    y: projected[1],
    z: projected[2],
  };
}

const figureEightReferenceProjectionFitCache = {
  key: null,
  value: null,
};

function figureEightReferenceProjectionDenominator(
  point,
  projectionProgress
) {
  const projection =
    interpolateFigureEightS3Projection(
      FIGURE_EIGHT_S3_STANDARD_PROJECTION,
      FIGURE_EIGHT_S3_SYMMETRIC_PROJECTION,
      clampUnit(projectionProgress)
    );

  const rotated =
    rotateFigureEightS3MixedPlanes(
      point.w,
      point.x,
      point.y,
      point.z,
      projection
    );

  return 1 - rotated[3];
}

function figureEightKnotBoundaryProjectionVisible(
  rawPoint,
  projectionProgress,
  cuspCoordinateSpec =
    FIGURE_EIGHT_CUSP_COORDINATE_SPEC
) {
  /*
   * Before the explicit Projection stage there is no reason
   * to cut the completed cusp surface.
   */
  if (
    projectionProgress <=
    FACE_CONSTRAINT_EPSILON
  ) {
    return true;
  }

  const tubeCoordinates =
    cuspTubeCoordinates(
      rawPoint,
      cuspCoordinateSpec
    );

  if (!tubeCoordinates) {
    return true;
  }

  const point =
    figureEightReferenceTubePoint4(
      tubeCoordinates.routeAmount,
      tubeCoordinates.minorAngle
    );

  const denominator =
    figureEightReferenceProjectionDenominator(
      point,
      projectionProgress
    );

  return (
    Number.isFinite(denominator) &&
    Math.abs(denominator) >=
      FIGURE_EIGHT_PROJECTION_POLE_EPSILON
  );
}

function figureEightReferenceProjectionFit(
  projectionProgress
) {
  const progress =
    clampUnit(
      projectionProgress
    );

  const key =
    progress.toFixed(7);

  if (
    figureEightReferenceProjectionFitCache
      .key === key
  ) {
    return (
      figureEightReferenceProjectionFitCache
        .value
    );
  }

  /*
   * Match Projection Lab's stereographic-view fitting rule.
   *
   * Stereographic projection genuinely sends points near the
   * selected pole very far away. Those points belong to the
   * mathematics, but they must not determine the camera scale.
   *
   * Projection Lab therefore:
   *
   *   1. removes samples essentially on the pole;
   *   2. measures the radius of every remaining projection;
   *   3. uses the 98.5th-percentile radius as the view-fit cutoff.
   *
   * The extreme projected material still exists. It simply runs
   * beyond the viewport instead of shrinking/distorting the whole
   * finite part of the surface.
   */
  const projection =
    interpolateFigureEightS3Projection(
      FIGURE_EIGHT_S3_STANDARD_PROJECTION,
      FIGURE_EIGHT_S3_SYMMETRIC_PROJECTION,
      progress
    );

  const samples = [];
  const radii = [];

  for (
    let tIndex = 0;
    tIndex <
    FIGURE_EIGHT_REFERENCE_FIT_T_SAMPLES;
    tIndex += 1
  ) {
    const routeAmount =
      tIndex /
      FIGURE_EIGHT_REFERENCE_FIT_T_SAMPLES;

    for (
      let thetaIndex = 0;
      thetaIndex <
      FIGURE_EIGHT_REFERENCE_FIT_THETA_SAMPLES;
      thetaIndex += 1
    ) {
      const minorAngle =
        thetaIndex /
        FIGURE_EIGHT_REFERENCE_FIT_THETA_SAMPLES *
        Math.PI *
        2;

      const point =
        figureEightReferenceTubePoint4(
          routeAmount,
          minorAngle
        );

      const rotated =
        rotateFigureEightS3MixedPlanes(
          point.w,
          point.x,
          point.y,
          point.z,
          projection
        );

      const denominator =
        1 - rotated[3];

      /*
       * Same pole threshold used by Projection Lab.
       */
      if (
        Math.abs(denominator) <
        FIGURE_EIGHT_PROJECTION_POLE_EPSILON
      ) {
        continue;
      }

      const x =
        rotated[0] /
        denominator;

      const y =
        rotated[1] /
        denominator;

      const z =
        rotated[2] /
        denominator *
        FIGURE_EIGHT_REFERENCE_Z_FLATTENING;

      if (
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        !Number.isFinite(z)
      ) {
        continue;
      }

      const radius =
        Math.hypot(
          x,
          y,
          z
        );

      samples.push({
        x,
        y,
        z,
        radius,
      });

      radii.push(radius);
    }
  }

  if (samples.length === 0) {
    const fallback = {
      center: {
        x: 0,
        y: 0,
        z: 0,
      },
      scale: 1,
    };

    figureEightReferenceProjectionFitCache.key =
      key;

    figureEightReferenceProjectionFitCache.value =
      fallback;

    return fallback;
  }

  radii.sort(
    (a, b) => a - b
  );

  /*
   * Exact same percentile used by Projection Lab.
   */
  const cutoff =
    radii[
      Math.min(
        radii.length - 1,
        Math.floor(
          radii.length *
          0.985
        )
      )
    ];

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  let includedCount = 0;

  samples.forEach(
    (sample) => {
      if (
        sample.radius >
        cutoff
      ) {
        return;
      }

      includedCount += 1;

      minX = Math.min(
        minX,
        sample.x
      );

      maxX = Math.max(
        maxX,
        sample.x
      );

      minY = Math.min(
        minY,
        sample.y
      );

      maxY = Math.max(
        maxY,
        sample.y
      );

      minZ = Math.min(
        minZ,
        sample.z
      );

      maxZ = Math.max(
        maxZ,
        sample.z
      );
    }
  );

  if (includedCount === 0) {
    throw new Error(
      "Projection fit rejected every finite S3 tube sample."
    );
  }

  const center = {
    x:
      (minX + maxX) /
      2,

    y:
      (minY + maxY) /
      2,

    z:
      (minZ + maxZ) /
      2,
  };

  const maximumExtent =
    Math.max(
      maxX - minX,
      maxY - minY,
      maxZ - minZ,
      1e-8
    );

  const value = {
    center,

    scale:
      FIGURE_EIGHT_REFERENCE_TARGET_EXTENT /
      maximumExtent,
  };

  figureEightReferenceProjectionFitCache.key =
    key;

  figureEightReferenceProjectionFitCache.value =
    value;

  return value;
}


function figureEightReferenceModelPoint(
  point4,
  projectionProgress
) {
  const projected =
    figureEightReferenceStereographicPoint(
      point4,
      projectionProgress
    );

  const fit =
    figureEightReferenceProjectionFit(
      projectionProgress
    );

  return {
    x:
      (
        projected.x -
        fit.center.x
      ) *
      fit.scale,
    y:
      (
        projected.y -
        fit.center.y
      ) *
      fit.scale,
    z:
      (
        projected.z *
          FIGURE_EIGHT_REFERENCE_Z_FLATTENING -
        fit.center.z
      ) *
      fit.scale,
  };
}

const CONSTRUCTIVE_VOLUME_EDGE_SEGMENTS = 4;

/*
 * Certified endpoint boundary display.
 *
 * Geometry comes directly from figureEightS3TubePoint4(), the same
 * analytic S3 tube used by Projection Lab.  These counts control only
 * how densely SVG samples that already-defined smooth surface; they do
 * not alter, fit, or smooth the geometry itself.
 *
 * Keep the visible grid topology aligned with the native 144 x 32 tube
 * sampling while oversampling each drawn curve between grid lines so
 * screen-space chords cannot create the large polygonal bumps produced
 * by the constructive tetrahedral boundary 1-skeleton.
 */
const CERTIFIED_ENDPOINT_ROUTE_GRID_COUNT = 144;
const CERTIFIED_ENDPOINT_MINOR_GRID_COUNT = 32;
const CERTIFIED_ENDPOINT_ROUTE_CURVE_SAMPLES = 288;
const CERTIFIED_ENDPOINT_MINOR_CURVE_SAMPLES = 64;

/*
 * During the certified 4608 vertex splits, reveal the analytic tube
 * itself rather than the final compact volume 1-skeleton.
 *
 * These are SVG sampling / matching tolerances only.  They never move
 * a constructive vertex or alter figureEightS3TubePoint4().
 */
const CERTIFIED_SPLIT_ANALYTIC_SEGMENT_SAMPLES = 4;
const CERTIFIED_SPLIT_ANALYTIC_MATCH_SCALE = 1e8;
const CERTIFIED_SPLIT_ANALYTIC_MATCH_TOLERANCE = 5e-7;


function inverseConstructiveStereographicPoint3(
  point3,
  pole4,
  basis4
) {
  const radiusSquared =
    point3[0] * point3[0] +
    point3[1] * point3[1] +
    point3[2] * point3[2];

  const denominator =
    1 + radiusSquared;

  const tangentScale =
    2 / denominator;

  const poleScale =
    (radiusSquared - 1) /
    denominator;

  return [0, 1, 2, 3].map(
    (coordinateIndex) =>
      tangentScale *
        (
          point3[0] *
            basis4[0][coordinateIndex] +
          point3[1] *
            basis4[1][coordinateIndex] +
          point3[2] *
            basis4[2][coordinateIndex]
        ) +
      poleScale *
        pole4[coordinateIndex]
  );
}


function constructiveVolumeModelPoint(
  point3,
  constructiveState,
  projectionProgress
) {
  const point =
    inverseConstructiveStereographicPoint3(
      point3,
      constructiveState.pole4,
      constructiveState.projectionBasis4
    );

  /*
   * figureEightReferenceModelPoint() uses the historical local
   * object convention {w,x,y,z} = native S3 array [x,y,z,w].
   */
  return figureEightReferenceModelPoint(
    {
      w: point[0],
      x: point[1],
      y: point[2],
      z: point[3],
    },
    projectionProgress
  );
}


function figureEightReferenceCoreModelPoint(
  routeAmount,
  projectionProgress
) {
  return figureEightReferenceModelPoint(
    figureEightReferenceCorePoint4(
      routeAmount
    ),
    projectionProgress
  );
}

/*
 * ============================================================
 * MENASCO TWO-BALL DECOMPOSITION INSPECTOR
 * ============================================================
 *
 * A reduced alternating knot diagram splits the knot complement
 * into a top and bottom ideal polyhedron. At each crossing, a
 * crossing bubble records which strand passes over and which passes
 * under. For the figure-eight knot, collapsing the two bigon faces
 * leaves one ideal tetrahedron on each side.
 *
 * The crossing locations below are not hard-coded. They are detected
 * from the actual analytic S3 figure-eight core already used here.
 */
const MENASCO_CORE_SAMPLE_COUNT = 720;
const MENASCO_CROSSING_EPSILON = 1e-7;
const MENASCO_CROSSING_DEDUP_FRACTION = 0.025;
const MENASCO_BUBBLE_MIN_RADIUS_FRACTION = 0.035;
const MENASCO_BUBBLE_ROUTE_HALF_WIDTH = 0.032;
const MENASCO_INSPECTION_DURATION_MS = 6500;
const MENASCO_DIAGRAM_PROJECTION_PROGRESS = 0.5;

function menascoSegmentIntersection2D(
  a,
  b,
  c,
  d
) {
  const rX = b.x - a.x;
  const rY = b.y - a.y;
  const sX = d.x - c.x;
  const sY = d.y - c.y;

  const denominator =
    rX * sY -
    rY * sX;

  if (
    Math.abs(denominator) <
    MENASCO_CROSSING_EPSILON
  ) {
    return null;
  }

  const cax = c.x - a.x;
  const cay = c.y - a.y;

  const t =
    (cax * sY - cay * sX) /
    denominator;

  const u =
    (cax * rY - cay * rX) /
    denominator;

  const endpointMargin = 2e-4;

  if (
    t <= endpointMargin ||
    t >= 1 - endpointMargin ||
    u <= endpointMargin ||
    u >= 1 - endpointMargin
  ) {
    return null;
  }

  return {
    t,
    u,
    x: a.x + rX * t,
    y: a.y + rY * t,
  };
}

function menascoLerpModelPoint(
  first,
  second,
  amount
) {
  return {
    x:
      first.x +
      (second.x - first.x) * amount,
    y:
      first.y +
      (second.y - first.y) * amount,
    z:
      first.z +
      (second.z - first.z) * amount,
  };
}

function menascoCyclicRouteDistance(
  first,
  second
) {
  const direct =
    Math.abs(first - second);

  return Math.min(
    direct,
    1 - direct
  );
}

function buildFigureEightMenascoDiagram(
  projectionProgress
) {
  const samples =
    Array.from(
      {
        length:
          MENASCO_CORE_SAMPLE_COUNT,
      },
      (_, index) => {
        const routeAmount =
          index /
          MENASCO_CORE_SAMPLE_COUNT;

        return {
          routeAmount,
          point:
            figureEightReferenceCoreModelPoint(
              routeAmount,
              projectionProgress
            ),
        };
      }
    );

  const minX = Math.min(
    ...samples.map(
      (sample) => sample.point.x
    )
  );
  const maxX = Math.max(
    ...samples.map(
      (sample) => sample.point.x
    )
  );
  const minY = Math.min(
    ...samples.map(
      (sample) => sample.point.y
    )
  );
  const maxY = Math.max(
    ...samples.map(
      (sample) => sample.point.y
    )
  );

  const diagramExtent = Math.max(
    maxX - minX,
    maxY - minY,
    1
  );

  const dedupDistance =
    diagramExtent *
    MENASCO_CROSSING_DEDUP_FRACTION;

  const crossings = [];

  for (
    let firstIndex = 0;
    firstIndex < samples.length;
    firstIndex += 1
  ) {
    const firstNext =
      (firstIndex + 1) %
      samples.length;

    for (
      let secondIndex =
        firstIndex + 2;
      secondIndex < samples.length;
      secondIndex += 1
    ) {
      const secondNext =
        (secondIndex + 1) %
        samples.length;

      const cyclicGap = Math.min(
        Math.abs(
          firstIndex - secondIndex
        ),
        samples.length -
          Math.abs(
            firstIndex - secondIndex
          )
      );

      if (
        cyclicGap <= 2 ||
        (
          firstIndex === 0 &&
          secondNext === 0
        )
      ) {
        continue;
      }

      const intersection =
        menascoSegmentIntersection2D(
          samples[firstIndex].point,
          samples[firstNext].point,
          samples[secondIndex].point,
          samples[secondNext].point
        );

      if (!intersection) {
        continue;
      }

      const firstPoint =
        menascoLerpModelPoint(
          samples[firstIndex].point,
          samples[firstNext].point,
          intersection.t
        );

      const secondPoint =
        menascoLerpModelPoint(
          samples[secondIndex].point,
          samples[secondNext].point,
          intersection.u
        );

      const duplicate =
        crossings.some(
          (crossing) =>
            Math.hypot(
              crossing.x - intersection.x,
              crossing.y - intersection.y
            ) < dedupDistance
        );

      if (duplicate) {
        continue;
      }

      const firstRoute =
        wrapUnitInterval(
          (
            firstIndex +
            intersection.t
          ) /
          samples.length
        );

      const secondRoute =
        wrapUnitInterval(
          (
            secondIndex +
            intersection.u
          ) /
          samples.length
        );

      const firstOver =
        firstPoint.z >
        secondPoint.z;

      crossings.push({
        x: intersection.x,
        y: intersection.y,
        firstRoute,
        secondRoute,
        firstPoint,
        secondPoint,
        overPoint:
          firstOver
            ? firstPoint
            : secondPoint,
        underPoint:
          firstOver
            ? secondPoint
            : firstPoint,
        overRoute:
          firstOver
            ? firstRoute
            : secondRoute,
        underRoute:
          firstOver
            ? secondRoute
            : firstRoute,
      });
    }
  }

  crossings.sort(
    (first, second) =>
      second.y - first.y ||
      first.x - second.x
  );

  const bubbleRadius = Math.max(
    diagramExtent *
      MENASCO_BUBBLE_MIN_RADIUS_FRACTION,
    ...crossings.map(
      (crossing) =>
        Math.abs(
          crossing.overPoint.z -
          crossing.underPoint.z
        ) * 0.58
    )
  );

  const planeZ =
    crossings.length > 0
      ? crossings.reduce(
          (sum, crossing) =>
            sum +
            (
              crossing.overPoint.z +
              crossing.underPoint.z
            ) /
            2,
          0
        ) / crossings.length
      : 0;

  function menascoTargetPoint(
    sample
  ) {
    let z = planeZ;

    crossings.forEach(
      (crossing) => {
        const overDistance =
          menascoCyclicRouteDistance(
            sample.routeAmount,
            crossing.overRoute
          );

        const underDistance =
          menascoCyclicRouteDistance(
            sample.routeAmount,
            crossing.underRoute
          );

        const radialSquared =
          (sample.point.x - crossing.x) ** 2 +
          (sample.point.y - crossing.y) ** 2;

        const bubbleHeight =
          radialSquared < bubbleRadius * bubbleRadius
            ? Math.sqrt(
                Math.max(
                  0,
                  bubbleRadius * bubbleRadius -
                    radialSquared
                )
              )
            : 0;

        if (
          overDistance <
          MENASCO_BUBBLE_ROUTE_HALF_WIDTH
        ) {
          z = Math.max(
            z,
            planeZ + bubbleHeight
          );
        }

        if (
          underDistance <
          MENASCO_BUBBLE_ROUTE_HALF_WIDTH
        ) {
          z = Math.min(
            z,
            planeZ - bubbleHeight
          );
        }
      }
    );

    return {
      x: sample.point.x,
      y: sample.point.y,
      z,
    };
  }

  return {
    valid:
      crossings.length === 4,
    crossingCount:
      crossings.length,
    samples:
      samples.map(
        (sample) => ({
          ...sample,
          targetPoint:
            menascoTargetPoint(sample),
        })
      ),
    crossings,
    planeZ,
    bubbleRadius,
    bounds: {
      minX,
      maxX,
      minY,
      maxY,
      extent: diagramExtent,
    },
  };
}


function buildFigureEightMenascoRegions(
  menasco,
  projectionProgress
) {
  const crossings =
    menasco?.crossings;

  if (
    !Array.isArray(crossings) ||
    crossings.length !== 4
  ) {
    return {
      valid: false,
      regions: [],
      arcs: [],
      triangleCount: 0,
      bigonCount: 0,
    };
  }

  const occurrences =
    crossings
      .flatMap(
        (
          crossing,
          crossingIndex
        ) => [
          {
            crossingIndex,
            routeAmount:
              crossing.firstRoute,
          },
          {
            crossingIndex,
            routeAmount:
              crossing.secondRoute,
          },
        ]
      )
      .sort(
        (first, second) =>
          first.routeAmount -
          second.routeAmount
      );

  function crossingPlanePoint(
    crossingIndex
  ) {
    const crossing =
      crossings[
        crossingIndex
      ];

    return {
      x: crossing.x,
      y: crossing.y,
      z: menasco.planeZ,
    };
  }

  function routePlanePoint(
    routeAmount
  ) {
    const point =
      figureEightReferenceCoreModelPoint(
        wrapUnitInterval(
          routeAmount
        ),
        projectionProgress
      );

    return {
      x: point.x,
      y: point.y,
      z: menasco.planeZ,
    };
  }

  const arcSampleCount = 36;

  const arcs =
    occurrences.map(
      (
        occurrence,
        occurrenceIndex
      ) => {
        const next =
          occurrences[
            (
              occurrenceIndex +
              1
            ) %
            occurrences.length
          ];

        const startRoute =
          occurrence.routeAmount;

        const endRoute =
          next.routeAmount +
          (
            occurrenceIndex ===
            occurrences.length - 1
              ? 1
              : 0
          );

        const points = [
          crossingPlanePoint(
            occurrence.crossingIndex
          ),
        ];

        for (
          let sampleIndex = 1;
          sampleIndex <
            arcSampleCount;
          sampleIndex += 1
        ) {
          points.push(
            routePlanePoint(
              startRoute +
              (
                endRoute -
                startRoute
              ) *
                (
                  sampleIndex /
                  arcSampleCount
                )
            )
          );
        }

        points.push(
          crossingPlanePoint(
            next.crossingIndex
          )
        );

        return {
          arcIndex:
            occurrenceIndex,

          startCrossingIndex:
            occurrence.crossingIndex,

          endCrossingIndex:
            next.crossingIndex,

          startRoute,
          endRoute,
          points,
        };
      }
    );

  const halfEdges = [];
  const outgoingByCrossing =
    Array.from(
      {
        length:
          crossings.length,
      },
      () => []
    );

  arcs.forEach(
    (
      arc,
      arcIndex
    ) => {
      const first =
        arc.points[0];

      const second =
        arc.points[1];

      const last =
        arc.points[
          arc.points.length - 1
        ];

      const beforeLast =
        arc.points[
          arc.points.length - 2
        ];

      const forwardIndex =
        halfEdges.length;

      halfEdges.push({
        arcIndex,
        from:
          arc.startCrossingIndex,
        to:
          arc.endCrossingIndex,
        forward: true,
        angle:
          Math.atan2(
            second.y - first.y,
            second.x - first.x
          ),
        twin:
          forwardIndex + 1,
      });

      const reverseIndex =
        halfEdges.length;

      halfEdges.push({
        arcIndex,
        from:
          arc.endCrossingIndex,
        to:
          arc.startCrossingIndex,
        forward: false,
        angle:
          Math.atan2(
            beforeLast.y -
              last.y,
            beforeLast.x -
              last.x
          ),
        twin:
          forwardIndex,
      });

      halfEdges[
        forwardIndex
      ].twin =
        reverseIndex;

      outgoingByCrossing[
        arc.startCrossingIndex
      ].push(
        forwardIndex
      );

      outgoingByCrossing[
        arc.endCrossingIndex
      ].push(
        reverseIndex
      );
    }
  );

  outgoingByCrossing
    .forEach(
      (halfEdgeIndices) => {
        halfEdgeIndices.sort(
          (
            firstIndex,
            secondIndex
          ) =>
            halfEdges[
              firstIndex
            ].angle -
            halfEdges[
              secondIndex
            ].angle
        );
      }
    );

  function nextLeftHalfEdge(
    halfEdgeIndex
  ) {
    const halfEdge =
      halfEdges[
        halfEdgeIndex
      ];

    const outgoing =
      outgoingByCrossing[
        halfEdge.to
      ];

    const twinPosition =
      outgoing.indexOf(
        halfEdge.twin
      );

    if (
      twinPosition < 0 ||
      outgoing.length === 0
    ) {
      return null;
    }

    /*
     * Outgoing directions are sorted counter-clockwise.
     * Taking the previous direction keeps the current
     * diagram region on the left of the oriented arc.
     */
    return outgoing[
      (
        twinPosition -
        1 +
        outgoing.length
      ) %
      outgoing.length
    ];
  }

  const visited =
    new Set();

  const regions = [];

  for (
    let seed = 0;
    seed <
      halfEdges.length;
    seed += 1
  ) {
    if (
      visited.has(seed)
    ) {
      continue;
    }

    const loop = [];
    let current = seed;

    while (
      current !== null &&
      !loop.includes(
        current
      )
    ) {
      loop.push(
        current
      );

      visited.add(
        current
      );

      current =
        nextLeftHalfEdge(
          current
        );
    }

    if (
      current !== seed ||
      loop.length < 2
    ) {
      continue;
    }

    const points = [];

    loop.forEach(
      (
        halfEdgeIndex,
        loopIndex
      ) => {
        const halfEdge =
          halfEdges[
            halfEdgeIndex
          ];

        const arc =
          arcs[
            halfEdge.arcIndex
          ];

        const orientedPoints =
          halfEdge.forward
            ? arc.points
            : [
                ...arc.points,
              ].reverse();

        points.push(
          ...(
            loopIndex === 0
              ? orientedPoints
              : orientedPoints.slice(
                  1
                )
          )
        );
      }
    );

    if (
      points.length > 1
    ) {
      const first =
        points[0];

      const last =
        points[
          points.length - 1
        ];

      if (
        Math.hypot(
          first.x - last.x,
          first.y - last.y
        ) <
        MENASCO_CROSSING_EPSILON *
          100
      ) {
        points.pop();
      }
    }

    let signedArea = 0;

    for (
      let index = 0;
      index <
        points.length;
      index += 1
    ) {
      const currentPoint =
        points[index];

      const nextPoint =
        points[
          (
            index + 1
          ) %
          points.length
        ];

      signedArea +=
        currentPoint.x *
          nextPoint.y -
        nextPoint.x *
          currentPoint.y;
    }

    signedArea /= 2;

    const centroid =
      points.reduce(
        (
          sum,
          point
        ) => ({
          x:
            sum.x +
            point.x,
          y:
            sum.y +
            point.y,
          z:
            menasco.planeZ,
        }),
        {
          x: 0,
          y: 0,
          z:
            menasco.planeZ,
        }
      );

    centroid.x /=
      Math.max(
        1,
        points.length
      );

    centroid.y /=
      Math.max(
        1,
        points.length
      );

    regions.push({
      key:
        `menasco-region-${regions.length}`,

      halfEdgeIndices:
        loop,

      edgeCount:
        loop.length,

      points,

      centroid,

      signedArea,

      outer:
        signedArea < 0,

      bigon:
        loop.length === 2,

      triangle:
        loop.length === 3,
    });
  }

  const bigons =
    regions.filter(
      (region) =>
        region.bigon
    );

  const triangles =
    regions.filter(
      (region) =>
        region.triangle
    );

  return {
    valid:
      regions.length === 6 &&
      bigons.length === 2 &&
      triangles.length === 4,

    regions,
    arcs,

    triangleCount:
      triangles.length,

    bigonCount:
      bigons.length,
  };
}


/*
 * ============================================================
 * MENASCO VOLUME-CUT TOPOLOGY AUDIT
 * ============================================================
 *
 * First non-visual go/no-go test for the requested two 3-balls.
 *
 * This audit deliberately starts with the simplest mesh-aligned
 * candidate: classify every AUTHORITATIVE constructive tetrahedron
 * by which side of the already-audited four-crossing diagram plane
 * contains its true inverse-stereographic cell center.
 *
 * It does NOT call that candidate correct merely because it has two
 * colors.  Each side must independently pass a strict 3-ball test:
 *
 *   - one connected tetrahedral component
 *   - Euler characteristic 1
 *   - one closed connected boundary surface
 *   - boundary Euler characteristic 2
 *   - every boundary edge has valence 2
 *   - every boundary-vertex link is one cycle
 *
 * If this flat baseline fails, that is useful evidence: the crossing
 * bubbles must be incorporated into the cut before anything is drawn.
 */
function menascoVolumeCutEdgeKey(
  first,
  second
) {
  return first < second
    ? `${first}:${second}`
    : `${second}:${first}`;
}


function menascoVolumeCutFaceKey(
  first,
  second,
  third
) {
  return [
    first,
    second,
    third,
  ]
    .sort(
      (a, b) => a - b
    )
    .join(":");
}


function menascoVolumeCutCellFaces(
  tetrahedron
) {
  const [a, b, c, d] =
    tetrahedron;

  return [
    [b, c, d],
    [a, c, d],
    [a, b, d],
    [a, b, c],
  ];
}


function menascoVolumeCutCellEdges(
  tetrahedron
) {
  const [a, b, c, d] =
    tetrahedron;

  return [
    [a, b],
    [a, c],
    [a, d],
    [b, c],
    [b, d],
    [c, d],
  ];
}


function menascoVolumeCutConnectedComponents(
  nodeIndices,
  neighbors
) {
  const allowed =
    new Set(nodeIndices);

  const visited =
    new Set();

  const componentSizes =
    [];

  nodeIndices.forEach(
    (seed) => {
      if (visited.has(seed)) {
        return;
      }

      const stack = [seed];
      visited.add(seed);
      let size = 0;

      while (stack.length > 0) {
        const current = stack.pop();
        size += 1;

        (neighbors[current] ?? [])
          .forEach(
            (next) => {
              if (
                allowed.has(next) &&
                !visited.has(next)
              ) {
                visited.add(next);
                stack.push(next);
              }
            }
          );
      }

      componentSizes.push(size);
    }
  );

  componentSizes.sort(
    (a, b) => b - a
  );

  return componentSizes;
}


function menascoBoundaryFaceComponents(
  boundaryFaces
) {
  if (boundaryFaces.length === 0) {
    return [];
  }

  const faceNeighbors =
    Array.from(
      { length: boundaryFaces.length },
      () => []
    );

  const faceIndicesByEdge =
    new Map();

  boundaryFaces.forEach(
    (face, faceIndex) => {
      const [a, b, c] =
        face;

      [
        [a, b],
        [b, c],
        [c, a],
      ].forEach(
        ([first, second]) => {
          const key =
            menascoVolumeCutEdgeKey(
              first,
              second
            );

          if (!faceIndicesByEdge.has(key)) {
            faceIndicesByEdge.set(
              key,
              []
            );
          }

          faceIndicesByEdge
            .get(key)
            .push(faceIndex);
        }
      );
    }
  );

  faceIndicesByEdge.forEach(
    (faceIndices) => {
      for (
        let firstIndex = 0;
        firstIndex < faceIndices.length;
        firstIndex += 1
      ) {
        for (
          let secondIndex =
            firstIndex + 1;
          secondIndex < faceIndices.length;
          secondIndex += 1
        ) {
          const first =
            faceIndices[firstIndex];

          const second =
            faceIndices[secondIndex];

          faceNeighbors[first].push(second);
          faceNeighbors[second].push(first);
        }
      }
    }
  );

  return menascoVolumeCutConnectedComponents(
    boundaryFaces.map(
      (_, index) => index
    ),
    faceNeighbors
  );
}


function auditMenascoBoundaryVertexLinks(
  boundaryFaces
) {
  const incidentFacesByVertex =
    new Map();

  boundaryFaces.forEach(
    (face) => {
      face.forEach(
        (vertexIndex) => {
          if (
            !incidentFacesByVertex.has(
              vertexIndex
            )
          ) {
            incidentFacesByVertex.set(
              vertexIndex,
              []
            );
          }

          incidentFacesByVertex
            .get(vertexIndex)
            .push(face);
        }
      );
    }
  );

  let failureCount = 0;
  const failureExamples = [];

  incidentFacesByVertex.forEach(
    (incidentFaces, vertexIndex) => {
      const linkNeighbors =
        new Map();

      function addLinkNeighbor(
        first,
        second
      ) {
        if (!linkNeighbors.has(first)) {
          linkNeighbors.set(
            first,
            new Set()
          );
        }

        linkNeighbors
          .get(first)
          .add(second);
      }

      incidentFaces.forEach(
        (face) => {
          const otherVertices =
            face.filter(
              (candidate) =>
                candidate !== vertexIndex
            );

          if (otherVertices.length !== 2) {
            return;
          }

          addLinkNeighbor(
            otherVertices[0],
            otherVertices[1]
          );

          addLinkNeighbor(
            otherVertices[1],
            otherVertices[0]
          );
        }
      );

      const linkVertices =
        [...linkNeighbors.keys()];

      const degreesValid =
        linkVertices.length > 0 &&
        linkVertices.every(
          (linkVertex) =>
            linkNeighbors
              .get(linkVertex)
              .size === 2
        );

      let connected =
        linkVertices.length > 0;

      if (connected) {
        const visited =
          new Set([
            linkVertices[0],
          ]);

        const stack = [
          linkVertices[0],
        ];

        while (stack.length > 0) {
          const current =
            stack.pop();

          linkNeighbors
            .get(current)
            .forEach(
              (next) => {
                if (!visited.has(next)) {
                  visited.add(next);
                  stack.push(next);
                }
              }
            );
        }

        connected =
          visited.size ===
          linkVertices.length;
      }

      if (
        !degreesValid ||
        !connected
      ) {
        failureCount += 1;

        if (failureExamples.length < 12) {
          failureExamples.push({
            vertexIndex,
            incidentFaceCount:
              incidentFaces.length,
            linkVertexCount:
              linkVertices.length,
            degreesValid,
            connected,
          });
        }
      }
    }
  );

  return {
    failureCount,
    failureExamples,
  };
}


function auditMenascoVolumeCutRegion({
  owner,
  cellIndices,
  tetrahedra,
  cellNeighbors,
}) {
  const vertexSet =
    new Set();

  const edgeSet =
    new Set();

  const faceCountByKey =
    new Map();

  const faceVerticesByKey =
    new Map();

  cellIndices.forEach(
    (cellIndex) => {
      const tetrahedron =
        tetrahedra[cellIndex];

      tetrahedron.forEach(
        (vertexIndex) =>
          vertexSet.add(vertexIndex)
      );

      menascoVolumeCutCellEdges(
        tetrahedron
      ).forEach(
        ([first, second]) => {
          edgeSet.add(
            menascoVolumeCutEdgeKey(
              first,
              second
            )
          );
        }
      );

      menascoVolumeCutCellFaces(
        tetrahedron
      ).forEach(
        (face) => {
          const key =
            menascoVolumeCutFaceKey(
              face[0],
              face[1],
              face[2]
            );

          faceCountByKey.set(
            key,
            (
              faceCountByKey.get(key) ??
              0
            ) + 1
          );

          if (!faceVerticesByKey.has(key)) {
            faceVerticesByKey.set(
              key,
              [...face]
            );
          }
        }
      );
    }
  );

  const boundaryFaces =
    [];

  faceCountByKey.forEach(
    (count, key) => {
      if (count === 1) {
        boundaryFaces.push(
          faceVerticesByKey.get(key)
        );
      }
    }
  );

  const boundaryVertexSet =
    new Set();

  const boundaryEdgeCountByKey =
    new Map();

  boundaryFaces.forEach(
    (face) => {
      const [a, b, c] = face;

      face.forEach(
        (vertexIndex) =>
          boundaryVertexSet.add(
            vertexIndex
          )
      );

      [
        [a, b],
        [b, c],
        [c, a],
      ].forEach(
        ([first, second]) => {
          const key =
            menascoVolumeCutEdgeKey(
              first,
              second
            );

          boundaryEdgeCountByKey.set(
            key,
            (
              boundaryEdgeCountByKey
                .get(key) ??
              0
            ) + 1
          );
        }
      );
    }
  );

  const nonManifoldBoundaryEdges =
    [...boundaryEdgeCountByKey.entries()]
      .filter(
        ([, count]) => count !== 2
      );

  const boundaryComponents =
    menascoBoundaryFaceComponents(
      boundaryFaces
    );

  const cellComponents =
    menascoVolumeCutConnectedComponents(
      cellIndices,
      cellNeighbors
    );

  const vertexLinkAudit =
    auditMenascoBoundaryVertexLinks(
      boundaryFaces
    );

  const V = vertexSet.size;
  const E = edgeSet.size;
  const F = faceCountByKey.size;
  const T = cellIndices.length;

  const boundaryV =
    boundaryVertexSet.size;

  const boundaryE =
    boundaryEdgeCountByKey.size;

  const boundaryF =
    boundaryFaces.length;

  const eulerCharacteristic =
    V - E + F - T;

  const boundaryEulerCharacteristic =
    boundaryV -
    boundaryE +
    boundaryF;

  const pass =
    T > 0 &&
    cellComponents.length === 1 &&
    eulerCharacteristic === 1 &&
    boundaryComponents.length === 1 &&
    boundaryEulerCharacteristic === 2 &&
    nonManifoldBoundaryEdges.length === 0 &&
    vertexLinkAudit.failureCount === 0;

  return {
    owner,
    cellCount: T,
    connectedComponentCount:
      cellComponents.length,
    connectedComponentSizes:
      cellComponents.slice(0, 12),
    vertexCount: V,
    edgeCount: E,
    faceCount: F,
    eulerCharacteristic,
    boundaryVertexCount:
      boundaryV,
    boundaryEdgeCount:
      boundaryE,
    boundaryFaceCount:
      boundaryF,
    boundaryEulerCharacteristic,
    boundaryComponentCount:
      boundaryComponents.length,
    boundaryComponentFaceCounts:
      boundaryComponents.slice(0, 12),
    nonManifoldBoundaryEdgeCount:
      nonManifoldBoundaryEdges.length,
    nonManifoldBoundaryEdgeExamples:
      nonManifoldBoundaryEdges
        .slice(0, 12),
    boundaryVertexLinkFailureCount:
      vertexLinkAudit.failureCount,
    boundaryVertexLinkFailureExamples:
      vertexLinkAudit.failureExamples,
    pass,
  };
}


function buildFigureEightMenascoVolumeCutAudit(
  constructiveState
) {
  if (
    !constructiveState?.ready ||
    !Array.isArray(constructiveState.vertices3) ||
    !Array.isArray(constructiveState.tetrahedra)
  ) {
    return {
      ready: false,
      pass: false,
      stage: "true-pl-flat-cut",
      reason: "authoritative constructive volume is not ready",
    };
  }

  const vertices3 = constructiveState.vertices3;
  const sourceTetrahedra = constructiveState.tetrahedra;
  const menasco = buildFigureEightMenascoDiagram(
    MENASCO_DIAGRAM_PROJECTION_PROGRESS
  );
  const regions = buildFigureEightMenascoRegions(
    menasco,
    MENASCO_DIAGRAM_PROJECTION_PROGRESS
  );

  if (!menasco.valid || !regions.valid) {
    return {
      ready: false,
      pass: false,
      stage: "true-pl-flat-cut",
      reason: "four-crossing Menasco diagram audit failed",
      crossingCount: menasco.crossingCount,
      regionCount: regions.regions.length,
      triangleRegionCount: regions.triangleCount,
      bigonRegionCount: regions.bigonCount,
    };
  }

  /*
   * Genuine PL cut:
   *
   * Sample the diagram-plane height at every source vertex and
   * extend it linearly through each constructive R3 tetrahedron.
   *
   * Every straddling source tetrahedron is therefore physically
   * clipped into BOTH A and B. We no longer assign the whole
   * tetrahedron from its centroid.
   */
  const modelVertices = vertices3.map((point3) =>
    constructiveVolumeModelPoint(
      point3,
      constructiveState,
      MENASCO_DIAGRAM_PROJECTION_PROGRESS
    )
  );

  const heights = modelVertices.map(
    (point) =>
      point.z - menasco.planeZ
  );

  const epsilon =
    Math.max(
      1,
      ...heights.map(
        (value) => Math.abs(value)
      )
    ) *
    1e-10;

  /*
   * All generated vertices receive one globally shared integer ID.
   *
   * v:i
   *   original constructive vertex
   *
   * e:i:j
   *   zero-plane intersection on one original constructive edge
   *
   * c:A:n / c:B:n
   *   private interior star point for one clipped polyhedron
   */
  const vertexIndexByKey =
    new Map();

  const pointByKey =
    new Map();

  let nextVertexIndex =
    0;

  function vertexIndex(
    key,
    point = null
  ) {
    if (!vertexIndexByKey.has(key)) {
      vertexIndexByKey.set(
        key,
        nextVertexIndex
      );

      nextVertexIndex += 1;

      if (point) {
        pointByKey.set(
          key,
          point
        );
      }
    }

    return vertexIndexByKey.get(
      key
    );
  }

  function sourceKey(
    index
  ) {
    const key =
      `v:${index}`;

    vertexIndex(
      key,
      modelVertices[index]
    );

    return key;
  }

  function cutKey(
    first,
    second
  ) {
    if (
      Math.abs(
        heights[first]
      ) <= epsilon
    ) {
      return sourceKey(first);
    }

    if (
      Math.abs(
        heights[second]
      ) <= epsilon
    ) {
      return sourceKey(second);
    }

    const low =
      Math.min(
        first,
        second
      );

    const high =
      Math.max(
        first,
        second
      );

    const key =
      `e:${low}:${high}`;

    if (!vertexIndexByKey.has(key)) {
      /*
       * Exact zero of the PL scalar along this source edge:
       *
       *   h(t) = (1-t) h0 + t h1
       *
       * so
       *
       *   t = h0 / (h0 - h1).
       */
      const amount =
        heights[first] /
        (
          heights[first] -
          heights[second]
        );

      const a =
        modelVertices[first];

      const b =
        modelVertices[second];

      vertexIndex(
        key,
        {
          x:
            a.x +
            (
              b.x - a.x
            ) *
            amount,

          y:
            a.y +
            (
              b.y - a.y
            ) *
            amount,

          z:
            menasco.planeZ,
        }
      );
    }

    return key;
  }

  function cleanPolygon(
    keys
  ) {
    const result =
      [];

    keys.forEach(
      (key) => {
        if (
          result[
            result.length - 1
          ] !==
          key
        ) {
          result.push(key);
        }
      }
    );

    if (
      result.length > 1 &&
      result[0] ===
        result[
          result.length - 1
        ]
    ) {
      result.pop();
    }

    return result;
  }

  /*
   * Clip one triangular source face against one half-space.
   *
   * The result is:
   *
   *   null,
   *   triangle,
   *   or quadrilateral.
   */
  function clipTriangle(
    face,
    keepPositive
  ) {
    const result =
      [];

    for (
      let index = 0;
      index < 3;
      index += 1
    ) {
      const current =
        face[index];

      const next =
        face[
          (index + 1) % 3
        ];

      const currentInside =
        keepPositive
          ? heights[current] >=
            -epsilon
          : heights[current] <=
            epsilon;

      const nextInside =
        keepPositive
          ? heights[next] >=
            -epsilon
          : heights[next] <=
            epsilon;

      if (currentInside) {
        result.push(
          sourceKey(current)
        );
      }

      if (
        currentInside !==
        nextInside
      ) {
        result.push(
          cutKey(
            current,
            next
          )
        );
      }
    }

    const polygon =
      cleanPolygon(result);

    return polygon.length >= 3
      ? polygon
      : null;
  }

  /*
   * Find the actual plane/tetrahedron intersection polygon.
   *
   * For a nondegenerate cut this has either 3 or 4 vertices.
   */
  function separatorPolygon(
    tetrahedron
  ) {
    const keys =
      new Set();

    tetrahedron.forEach(
      (index) => {
        if (
          Math.abs(
            heights[index]
          ) <= epsilon
        ) {
          keys.add(
            sourceKey(index)
          );
        }
      }
    );

    menascoVolumeCutCellEdges(
      tetrahedron
    ).forEach(
      ([
        first,
        second,
      ]) => {
        if (
          (
            heights[first] >
              epsilon &&
            heights[second] <
              -epsilon
          ) ||
          (
            heights[first] <
              -epsilon &&
            heights[second] >
              epsilon
          )
        ) {
          keys.add(
            cutKey(
              first,
              second
            )
          );
        }
      }
    );

    const polygon =
      [...keys];

    if (
      polygon.length < 3
    ) {
      return null;
    }

    /*
     * Every cut point lies in the same model-space z plane,
     * so x/y angle gives an unambiguous cyclic ordering.
     */
    const center =
      polygon.reduce(
        (
          sum,
          key
        ) => {
          const point =
            pointByKey.get(
              key
            );

          sum.x +=
            point.x /
            polygon.length;

          sum.y +=
            point.y /
            polygon.length;

          return sum;
        },
        {
          x: 0,
          y: 0,
        }
      );

    polygon.sort(
      (
        firstKey,
        secondKey
      ) => {
        const first =
          pointByKey.get(
            firstKey
          );

        const second =
          pointByKey.get(
            secondKey
          );

        return (
          Math.atan2(
            first.y -
              center.y,
            first.x -
              center.x
          ) -
          Math.atan2(
            second.y -
              center.y,
            second.x -
              center.x
          )
        );
      }
    );

    return polygon;
  }

  /*
   * Deterministic polygon triangulation.
   *
   * A clipped source face may be seen from two neighboring
   * tetrahedra in opposite cyclic orientations. Picking the
   * lexicographically smallest vertex as the fan root, then
   * normalizing the orientation, guarantees both copies use
   * the same diagonal.
   */
  function triangulatePolygon(
    polygon
  ) {
    if (
      polygon.length === 3
    ) {
      return [
        polygon,
      ];
    }

    let rootIndex =
      0;

    for (
      let index = 1;
      index <
        polygon.length;
      index += 1
    ) {
      if (
        polygon[index] <
        polygon[rootIndex]
      ) {
        rootIndex =
          index;
      }
    }

    let ordered =
      polygon.map(
        (
          _,
          index
        ) =>
          polygon[
            (
              rootIndex +
              index
            ) %
            polygon.length
          ]
      );

    if (
      ordered[1] >
      ordered[
        ordered.length - 1
      ]
    ) {
      ordered = [
        ordered[0],
        ...ordered
          .slice(1)
          .reverse(),
      ];
    }

    const triangles =
      [];

    for (
      let index = 1;
      index + 1 <
        ordered.length;
      index += 1
    ) {
      triangles.push([
        ordered[0],
        ordered[index],
        ordered[index + 1],
      ]);
    }

    return triangles;
  }

  /*
   * Each clipped convex polyhedron is tetrahedralized by
   * starring all of its boundary triangles from one private
   * interior vertex.
   *
   * This gives auditMenascoVolumeCutRegion() an ordinary,
   * conforming tetrahedral complex to inspect.
   */
  const refinedByOwner = {
    A: [],
    B: [],
  };

  const separatorKeysByOwner = {
    A: new Set(),
    B: new Set(),
  };

  let straddlingSourceCellCount =
    0;

  let separatorConstructionFailureCount =
    0;

  sourceTetrahedra.forEach(
    (
      tetrahedron,
      sourceCellIndex
    ) => {
      const localHeights =
        tetrahedron.map(
          (index) =>
            heights[index]
        );

      const hasPositive =
        localHeights.some(
          (value) =>
            value > epsilon
        );

      const hasNegative =
        localHeights.some(
          (value) =>
            value < -epsilon
        );

      const straddling =
        hasPositive &&
        hasNegative;

      const separator =
        straddling
          ? separatorPolygon(
              tetrahedron
            )
          : null;

      if (straddling) {
        straddlingSourceCellCount +=
          1;

        if (!separator) {
          separatorConstructionFailureCount +=
            1;
        }
      }

      [
        [
          "A",
          true,
          hasPositive,
        ],
        [
          "B",
          false,
          hasNegative,
        ],
      ].forEach(
        ([
          owner,
          keepPositive,
          hasVolume,
        ]) => {
          if (!hasVolume) {
            return;
          }

          const polygons =
            [];

          menascoVolumeCutCellFaces(
            tetrahedron
          ).forEach(
            (face) => {
              const polygon =
                clipTriangle(
                  face,
                  keepPositive
                );

              if (polygon) {
                polygons.push(
                  polygon
                );
              }
            }
          );

          if (separator) {
            polygons.push(
              separator
            );

            separatorKeysByOwner[
              owner
            ].add(
              separator
                .slice()
                .sort()
                .join("|")
            );
          }

          const centerIndex =
            vertexIndex(
              `c:${owner}:${sourceCellIndex}`
            );

          polygons.forEach(
            (polygon) => {
              triangulatePolygon(
                polygon
              ).forEach(
                (triangle) => {
                  refinedByOwner[
                    owner
                  ].push([
                    centerIndex,
                    ...triangle.map(
                      (key) =>
                        vertexIndex(
                          key
                        )
                    ),
                  ]);
                }
              );
            }
          );
        }
      );
    }
  );

  /*
   * Build face-sharing adjacency for one refined side.
   */
  function buildNeighbors(
    tetrahedra
  ) {
    const faceRecords =
      new Map();

    tetrahedra.forEach(
      (
        tetrahedron,
        cellIndex
      ) => {
        menascoVolumeCutCellFaces(
          tetrahedron
        ).forEach(
          (face) => {
            const key =
              menascoVolumeCutFaceKey(
                face[0],
                face[1],
                face[2]
              );

            if (
              !faceRecords.has(
                key
              )
            ) {
              faceRecords.set(
                key,
                []
              );
            }

            faceRecords
              .get(key)
              .push(
                cellIndex
              );
          }
        );
      }
    );

    const neighbors =
      Array.from(
        {
          length:
            tetrahedra.length,
        },
        () => []
      );

    let nonManifoldFaceCount =
      0;

    faceRecords.forEach(
      (cells) => {
        if (
          cells.length === 2
        ) {
          neighbors[
            cells[0]
          ].push(
            cells[1]
          );

          neighbors[
            cells[1]
          ].push(
            cells[0]
          );
        } else if (
          cells.length > 2
        ) {
          nonManifoldFaceCount +=
            1;
        }
      }
    );

    return {
      neighbors,
      nonManifoldFaceCount,
    };
  }

  function auditOwner(
    owner
  ) {
    const tetrahedra =
      refinedByOwner[
        owner
      ];

    const topology =
      buildNeighbors(
        tetrahedra
      );

    const audit =
      auditMenascoVolumeCutRegion({
        owner,

        cellIndices:
          tetrahedra.map(
            (
              _,
              index
            ) => index
          ),

        tetrahedra,

        cellNeighbors:
          topology.neighbors,
      });

    return {
      ...audit,

      clippedTetrahedronCount:
        tetrahedra.length,

      refinedNonManifoldFaceCount:
        topology
          .nonManifoldFaceCount,

      pass:
        audit.pass &&
        topology
          .nonManifoldFaceCount ===
          0,
    };
  }

  /*
   * A and B must see exactly the same separator polygons.
   */
  let separatorMismatchCount =
    0;

  separatorKeysByOwner
    .A
    .forEach(
      (key) => {
        if (
          !separatorKeysByOwner
            .B
            .has(key)
        ) {
          separatorMismatchCount +=
            1;
        }
      }
    );

  separatorKeysByOwner
    .B
    .forEach(
      (key) => {
        if (
          !separatorKeysByOwner
            .A
            .has(key)
        ) {
          separatorMismatchCount +=
            1;
        }
      }
    );

  const A =
    auditOwner("A");

  const B =
    auditOwner("B");

  const pass =
    separatorConstructionFailureCount ===
      0 &&
    separatorMismatchCount ===
      0 &&
    A.pass &&
    B.pass;

  return {
    ready: true,
    pass,

    stage:
      "true-pl-flat-cut",

    interpretation:
      pass
        ? "PASS: the genuine PL flat cut produces two audited 3-balls"
        : "FAIL: the genuine PL flat cut is not yet the two-ball separator; use these topology numbers to determine the crossing correction",

    source: {
      vertexCount:
        vertices3.length,

      tetrahedronCount:
        sourceTetrahedra.length,
    },

    diagram: {
      projectionProgress:
        MENASCO_DIAGRAM_PROJECTION_PROGRESS,

      crossingCount:
        menasco.crossingCount,

      regionCount:
        regions.regions.length,

      triangleRegionCount:
        regions.triangleCount,

      bigonRegionCount:
        regions.bigonCount,

      planeZ:
        menasco.planeZ,

      bubbleRadius:
        menasco.bubbleRadius,
    },

    cut: {
      epsilon,

      straddlingSourceCellCount,

      separatorFaceCount:
        separatorKeysByOwner
          .A
          .size,

      separatorConstructionFailureCount,

      separatorMismatchCount,

      ARefinedTetrahedronCount:
        refinedByOwner
          .A
          .length,

      BRefinedTetrahedronCount:
        refinedByOwner
          .B
          .length,
    },

    A,
    B,
  };
}

function figureEightKnotBoundaryModelPoint(
  rawPoint,
  projectionProgress = 0,
  cuspCoordinateSpec =
    FIGURE_EIGHT_CUSP_COORDINATE_SPEC
) {
  const tubeCoordinates =
    cuspTubeCoordinates(
      rawPoint,
      cuspCoordinateSpec
    );

  if (!tubeCoordinates) {
    throw new Error(
      "No verified peripheral basis is available for this cusp."
    );
  }

  const {
    routeAmount,
    minorAngle,
  } = tubeCoordinates;

  /*
   * cuspBoundaryTargetPoint returns unscaled cusp-model coordinates.
   * attachedCuspTargetPoint applies CUSP_BOUNDARY_WORLD_SCALE exactly
   * once after recentering, so keep the reference embedding in that
   * same coordinate contract here.
   */
  return multiplyPoint(
    figureEightReferenceModelPoint(
      figureEightReferenceTubePoint4(
        routeAmount,
        minorAngle
      ),
      projectionProgress
    ),
    1 / CUSP_BOUNDARY_WORLD_SCALE
  );
}

function figureEightKnotBundleGatherEnvelope(
  routeAmount
) {
  const amount = clampUnit(routeAmount);

  const mergeProgress =
    smootherUnitInterval(
      clampUnit(
        (
          amount -
          FIGURE_EIGHT_KNOT_BUNDLE_MERGE_START
        ) /
        (
          FIGURE_EIGHT_KNOT_BUNDLE_MERGE_END -
          FIGURE_EIGHT_KNOT_BUNDLE_MERGE_START
        )
      )
    );

  const fanProgress =
    smootherUnitInterval(
      clampUnit(
        (
          amount -
          FIGURE_EIGHT_KNOT_BUNDLE_FAN_START
        ) /
        (
          FIGURE_EIGHT_KNOT_BUNDLE_FAN_END -
          FIGURE_EIGHT_KNOT_BUNDLE_FAN_START
        )
      )
    );

  return mergeProgress *
    (1 - fanProgress);
}

function figureEightKnotBundleState(
  cuspRouteIndex,
  routeAmount
) {
  const bundleId =
    FIGURE_EIGHT_KNOT_BUNDLE_ID_BY_ROUTE_INDEX[
      cuspRouteIndex
    ] ?? 0;

  const lane =
    FIGURE_EIGHT_KNOT_BUNDLE_LANE_BY_ROUTE_INDEX[
      cuspRouteIndex
    ] ?? 0;

  const amount = clampUnit(routeAmount);

  const {
    center: bundleCenter,
    normal,
    binormal,
  } = figureEightKnotCommonSpineFrame(
    amount
  );

  /*
   * The four A routes occupy one semicircle and the four B routes the
   * opposite semicircle.  The existing lane order places four colored
   * strips across each half rather than reducing the bundle to a single
   * line.  Together all eight strips surround one common knot tube.
   */
  const halfCenterAngle =
    bundleId === 0
      ? 0
      : Math.PI;

  const laneAngle =
    halfCenterAngle +
    lane * (Math.PI / 4);

  const tubeRadius =
    FIGURE_EIGHT_KNOT_COMMON_TUBE_RADIUS *
    CUSP_BOUNDARY_WORLD_SCALE;

  const laneOffset =
    addPoint(
      multiplyPoint(
        normal,
        Math.cos(laneAngle) *
          tubeRadius
      ),
      multiplyPoint(
        binormal,
        Math.sin(laneAngle) *
          tubeRadius
      )
    );

  /*
   * Merge early, remain on the shared tube throughout the knotted
   * middle, then fan back out to the eight unchanged torus patches.
   */
  const gatherEnvelope =
    figureEightKnotBundleGatherEnvelope(
      amount
    );

  return {
    bundleCenter,
    laneOffset,
    gatherEnvelope,
  };
}

function figureEightLooseLocalCollarPoint({
  basePoint,
  straightOuterPoint,
  routeJoinPoint,
  routeAheadPoint,
  localAmount,
  knotViewAmount,
}) {
  const amount = clampUnit(localAmount);
  const knotAmount = clampUnit(knotViewAmount);

  if (
    knotAmount <=
    FACE_CONSTRAINT_EPSILON
  ) {
    return lerpPoint(
      basePoint,
      straightOuterPoint,
      amount
    );
  }

  /*
   * The old local collar was a rigid straight triangular prism. Knot
   * view now lets that prism become the first smooth portion of the
   * routed sheet. Its endpoint is exactly the first active route ring,
   * while its final Bezier tangent is aligned with the next route ring.
   */
  const endPoint = routeJoinPoint;

  const straightFirstControl =
    lerpPoint(
      basePoint,
      endPoint,
      1 / 3
    );

  const straightSecondControl =
    lerpPoint(
      basePoint,
      endPoint,
      2 / 3
    );

  const looseFirstControl =
    lerpPoint(
      basePoint,
      straightOuterPoint,
      FIGURE_EIGHT_KNOT_LOCAL_TANGENT_SCALE
    );

  const routeTangentVector =
    subtractPoint(
      routeAheadPoint,
      routeJoinPoint
    );

  const routeTangentLength =
    Math.hypot(
      routeTangentVector.x,
      routeTangentVector.y,
      routeTangentVector.z
    );

  const routeTangent =
    routeTangentLength > 1e-6
      ? multiplyPoint(
          routeTangentVector,
          1 / routeTangentLength
        )
      : normalizePoint(
          subtractPoint(
            endPoint,
            basePoint
          )
        );

  const joinHandleLength =
    Math.min(
      CUSP_COLLAR_LENGTH * 0.55,
      pointDistance(
        basePoint,
        endPoint
      ) * 0.34
    );

  const looseSecondControl =
    subtractPoint(
      endPoint,
      multiplyPoint(
        routeTangent,
        joinHandleLength
      )
    );

  const firstControl =
    lerpPoint(
      straightFirstControl,
      looseFirstControl,
      knotAmount
    );

  const secondControl =
    lerpPoint(
      straightSecondControl,
      looseSecondControl,
      knotAmount
    );

  return cubicBezierPoint(
    basePoint,
    firstControl,
    secondControl,
    endPoint,
    amount
  );
}

function figureEightKnottedRoutePoint({
  cuspRouteIndex,
  amount,
  routeCenter,
  routedPoint,
  knotViewAmount,
}) {
  const routeAmount =
    clampUnit(amount);

  const knotAmount =
    clampUnit(knotViewAmount);

  if (
    knotAmount <=
    FACE_CONSTRAINT_EPSILON
  ) {
    return routedPoint;
  }

  const {
    bundleCenter,
    laneOffset,
    gatherEnvelope,
  } = figureEightKnotBundleState(
    cuspRouteIndex,
    routeAmount
  );

  /*
   * Preserve a reduced copy of each route's triangular cross-section
   * around the shared bundle spine. This keeps the four colors legible
   * while making the quartet behave as one composite funnel.
   */
  const shapeOffset =
    subtractPoint(
      routedPoint,
      routeCenter
    );

  const bundledPoint =
    addPoint(
      addPoint(
        bundleCenter,
        laneOffset
      ),
      multiplyPoint(
        shapeOffset,
        FIGURE_EIGHT_KNOT_BUNDLE_SHAPE_SCALE
      )
    );

  return lerpPoint(
    routedPoint,
    bundledPoint,
    knotAmount *
      FIGURE_EIGHT_KNOT_BUNDLE_PULL *
      gatherEnvelope
  );
}

function cuspAssemblyTargetCenterFromStage(
  firstBoundary,
  stagedProgress,
  cuspCoordinateSpec =
    FIGURE_EIGHT_CUSP_COORDINATE_SPEC
) {
  return boundingCenter(
    Array.from(
      { length: CUSP_CENTER_SAMPLES + 1 },
      (_, uIndex) =>
        Array.from(
          { length: CUSP_CENTER_SAMPLES + 1 },
          (_, vIndex) =>
            cuspModelPointFromStage(
              cuspRawPointFromCoordinates(
                uIndex / CUSP_CENTER_SAMPLES,
                vIndex / CUSP_CENTER_SAMPLES,
                cuspCoordinateSpec
              ),
              firstBoundary,
              stagedProgress,
              cuspCoordinateSpec
            )
        )
    ).flat()
  );
}

function cuspProjectionView(
  view,
  wrapProgress
) {
  /*
   * Begin with the flat domain facing the viewer,
   * then introduce the useful oblique cusp view.
   * The automatic cusp orientation is applied first;
   * the user's camera-space orientation is applied
   * afterward and remains active at every stage.
   */
  const orientationProgress =
    smoothStep(
      wrapProgress
    );

  const cuspRotation =
    rotationFromYawPitch(
      -0.68 * orientationProgress,
      0.46 * orientationProgress
    );

  return {
    rotation: multiplyRotations(
      view.rotation,
      cuspRotation
    ),
    zoom: view.zoom,
  };
}

function projectUncenteredCuspPoint(
  raw,
  view,
  firstBoundary,
  shortWrapProgress,
  longWrapProgress
) {
  return projectPoint(
    cuspModelPointFromRaw(
      raw,
      firstBoundary,
      shortWrapProgress,
      longWrapProgress
    ),
    cuspProjectionView(
      view,
      Math.max(
        shortWrapProgress,
        longWrapProgress
      )
    )
  );
}

function cuspScreenCenterOffset(
  view,
  firstBoundary,
  shortWrapProgress,
  longWrapProgress
) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  /*
   * Perspective can move the visible projected
   * bounding box away from the projection origin.
   * Sample the complete cusp domain after its current
   * deformation and measure its actual screen bounds.
   */
  for (
    let uIndex = 0;
    uIndex <= CUSP_CENTER_SAMPLES;
    uIndex += 1
  ) {
    for (
      let vIndex = 0;
      vIndex <= CUSP_CENTER_SAMPLES;
      vIndex += 1
    ) {
      const raw =
        cuspRawPointFromCoordinates(
          uIndex /
            CUSP_CENTER_SAMPLES,
          vIndex /
            CUSP_CENTER_SAMPLES
        );

      const projected =
        projectUncenteredCuspPoint(
          raw,
          view,
          firstBoundary,
          shortWrapProgress,
          longWrapProgress
        );

      minX = Math.min(
        minX,
        projected.x
      );

      maxX = Math.max(
        maxX,
        projected.x
      );

      minY = Math.min(
        minY,
        projected.y
      );

      maxY = Math.max(
        maxY,
        projected.y
      );
    }
  }

  return {
    x:
      500 -
      (minX + maxX) / 2,
    y:
      350 -
      (minY + maxY) / 2,
  };
}

function cuspSurfacePointFromRaw(
  raw,
  view,
  firstBoundary,
  shortWrapProgress,
  longWrapProgress,
  centerOffset
) {
  const projected =
    projectUncenteredCuspPoint(
      raw,
      view,
      firstBoundary,
      shortWrapProgress,
      longWrapProgress
    );

  return {
    ...projected,
    x:
      projected.x +
      centerOffset.x,
    y:
      projected.y +
      centerOffset.y,
  };
}

function cuspSurfacePoint(
  tetrahedronId,
  vertexIndex,
  neighborIndex,
  view,
  firstBoundary,
  shortWrapProgress,
  longWrapProgress,
  centerOffset
) {
  return cuspSurfacePointFromRaw(
    rawCuspPoint(
      tetrahedronId,
      vertexIndex,
      neighborIndex
    ),
    view,
    firstBoundary,
    shortWrapProgress,
    longWrapProgress,
    centerOffset
  );
}

function sameVertexSet(first, second) {
  if (first.length !== second.length) {
    return false;
  }

  const sortedFirst = [...first].sort();
  const sortedSecond = [...second].sort();

  return sortedFirst.every(
    (value, index) =>
      value === sortedSecond[index]
  );
}

function cuspTriangleEdgePair(
  tetrahedronId,
  vertexIndex,
  firstNeighbor,
  secondNeighbor,
  facePairs = FIGURE_EIGHT_FACE_PAIRS
) {
  const containingFace = [
    vertexIndex,
    firstNeighbor,
    secondNeighbor,
  ];

  return (
    facePairs.find(
      (candidate) =>
        sameVertexSet(
          candidate[tetrahedronId],
          containingFace
        )
    ) ?? null
  );
}

function cuspTriangleEdgeColor(
  tetrahedronId,
  vertexIndex,
  firstNeighbor,
  secondNeighbor,
  facePairs = FIGURE_EIGHT_FACE_PAIRS
) {
  const pair = cuspTriangleEdgePair(
    tetrahedronId,
    vertexIndex,
    firstNeighbor,
    secondNeighbor,
    facePairs
  );

  return pair
    ? faceEndpointColor(
        pair,
        tetrahedronId
      )
    : "rgba(250, 244, 225, 0.96)";
}

function cuspSegmentForFace(
  face,
  localVertexIndex,
  truncationFraction =
    DEFAULT_TRUNCATION_FRACTION
) {
  const vertexIndex =
    face[localVertexIndex];

  const firstNeighbor =
    face[(localVertexIndex + 1) % 3];

  const secondNeighbor =
    face[(localVertexIndex + 2) % 3];

  /*
   * At one truncated ideal vertex, the edge lying
   * inside a given large face joins the two truncated
   * points directed toward the other face vertices.
   */
  return [
    edgePoint(
      vertexIndex,
      firstNeighbor,
      truncationFraction
    ),
    edgePoint(
      vertexIndex,
      secondNeighbor,
      truncationFraction
    ),
  ];
}

function averageScreenPoint(points) {
  if (points.length === 0) {
    return { x: 500, y: 350 };
  }

  return points.reduce(
    (sum, point) => ({
      x: sum.x + point.x / points.length,
      y: sum.y + point.y / points.length,
    }),
    { x: 0, y: 0 }
  );
}

function makeTetrahedronCallout(
  tetrahedronId,
  projectedPoints
) {
  const viewerCenter = {
    x: 500,
    y: 350,
  };

  const centroid =
    averageScreenPoint(projectedPoints);

  let directionX =
    centroid.x - viewerCenter.x;

  let directionY =
    centroid.y - viewerCenter.y;

  let directionLength = Math.hypot(
    directionX,
    directionY
  );

  /*
   * Certain viewing angles can project the two
   * tetrahedron centroids almost onto the same point.
   * Preserve a stable A-left / B-right distinction
   * in that degenerate screen-space case.
   */
  if (directionLength < 12) {
    directionX =
      tetrahedronId === "A" ? -1 : 1;

    directionY =
      tetrahedronId === "A" ? 0.22 : -0.22;

    directionLength = Math.hypot(
      directionX,
      directionY
    );
  }

  const unitX =
    directionX / directionLength;

  const unitY =
    directionY / directionLength;

  /*
   * Find the outermost projected point of this
   * tetrahedron in the direction away from the
   * center of the complete complex.
   */
  const outerPoint = projectedPoints.reduce(
    (best, point) => {
      const score =
        point.x * unitX +
        point.y * unitY;

      const bestScore =
        best.x * unitX +
        best.y * unitY;

      return score > bestScore
        ? point
        : best;
    },
    projectedPoints[0]
  );

  const labelDistance = 34;

  const point = {
    x:
      outerPoint.x +
      unitX * labelDistance,
    y:
      outerPoint.y +
      unitY * labelDistance,
  };

  return {
    text: tetrahedronId,
    anchor: centroid,
    point,
    lineEnd: {
      x: point.x - unitX * 16,
      y: point.y - unitY * 16,
    },
  };
}


function canonicalABInterfacePairIdFromBoundaryFaceId(
  boundaryFaceId
) {
  if (typeof boundaryFaceId !== "string") {
    return null;
  }

  const match =
    /-large-(\d+)$/.exec(
      boundaryFaceId
    );

  if (!match) {
    return null;
  }

  const pairId =
    Number(match[1]);

  return Number.isInteger(pairId) &&
    pairId >= 0 &&
    pairId < 4
    ? pairId
    : null;
}


function canonicalABInterfaceTriangleAreaSquared4(
  first,
  second,
  third
) {
  const ax = second.x - first.x;
  const ay = second.y - first.y;
  const az = second.z - first.z;
  const aw = second.w - first.w;

  const bx = third.x - first.x;
  const by = third.y - first.y;
  const bz = third.z - first.z;
  const bw = third.w - first.w;

  const aa =
    ax * ax +
    ay * ay +
    az * az +
    aw * aw;

  const bb =
    bx * bx +
    by * by +
    bz * bz +
    bw * bw;

  const ab =
    ax * bx +
    ay * by +
    az * bz +
    aw * bw;

  return Math.max(
    0,
    aa * bb - ab * ab
  );
}


function buildCanonicalABInterfaceDiagnostic({
  refinedGeometryState,
  relaxationResult,
} = {}) {
  const refinedMesh =
    refinedGeometryState
      ?.quotientMesh;

  const positions =
    relaxationResult
      ?.positions ??
    refinedGeometryState
      ?.positions;

  const failures = [];

  if (
    !refinedMesh?.valid ||
    !Array.isArray(
      refinedMesh.quotientCells
    ) ||
    !Array.isArray(positions)
  ) {
    return {
      ready: false,
      positions: [],
      triangles: [],
      triangleCountByPairId:
        [0, 0, 0, 0],
      failures: [
        {
          reason:
            "refined-canonical-state-unavailable",
        },
      ],
    };
  }

  /*
   * The barycentric refinement is a genuine simplicial complex.
   *
   * Therefore the exact identity of a child face is its sorted
   * triple of quotient vertex indices.
   */
  const cuspBoundaryVertexIndices =
    Array.isArray(
      refinedMesh.quotientVertices
    )
      ? refinedMesh
          .quotientVertices
          .flatMap(
            (
              vertex,
              vertexIndex
            ) =>
              vertex?.cuspBoundary
                ? [vertexIndex]
                : []
          )
      : [];

  const faceIncidence =
    new Map();

  refinedMesh
    .quotientCells
    .forEach(
      (
        cell,
        cellIndex
      ) => {
        if (
          cell?.canonicalSubdivision !==
            true ||
          (
            cell?.tetrahedronId !== "A" &&
            cell?.tetrahedronId !== "B"
          ) ||
          !Array.isArray(
            cell?.quotientVertexIndices
          ) ||
          cell.quotientVertexIndices
            .length !== 4
        ) {
          failures.push({
            reason:
              "invalid-refined-canonical-cell",
            cellIndex,
          });

          return;
        }

        for (
          let omittedIndex = 0;
          omittedIndex < 4;
          omittedIndex += 1
        ) {
          const faceVertices =
            cell
              .quotientVertexIndices
              .filter(
                (
                  _,
                  vertexIndex
                ) =>
                  vertexIndex !==
                  omittedIndex
              );

          const key =
            faceVertices
              .slice()
              .sort(
                (first, second) =>
                  first - second
              )
              .join(":");

          if (!faceIncidence.has(key)) {
            faceIncidence.set(
              key,
              []
            );
          }

          faceIncidence
            .get(key)
            .push({
              cellIndex,

              tetrahedronId:
                cell.tetrahedronId,

              sourceBoundaryFaceId:
                cell.sourceBoundaryFaceId,

              sourceBoundaryKind:
                cell.sourceBoundaryKind,

              quotientVertexIndices:
                faceVertices,
            });
        }
      }
    );

  const triangles = [];

  const triangleCountByPairId =
    [0, 0, 0, 0];

  let minimumTriangleAreaSquared4 =
    Infinity;

  let degenerateTriangleCount =
    0;

  /*
   * A canonical A/B interface triangle is exactly a refined
   * simplicial face whose two incident tetrahedra have opposite
   * source ownership A and B.
   */
  faceIncidence.forEach(
    (
      occurrences,
      key
    ) => {
      if (occurrences.length !== 2) {
        return;
      }

      const occurrenceA =
        occurrences.find(
          (occurrence) =>
            occurrence
              .tetrahedronId === "A"
        );

      const occurrenceB =
        occurrences.find(
          (occurrence) =>
            occurrence
              .tetrahedronId === "B"
        );

      if (!occurrenceA || !occurrenceB) {
        return;
      }

      /*
       * The A/B partition is allowed to cross only one of the
       * four original large-face identifications.
       */
      if (
        occurrenceA
          .sourceBoundaryKind !==
          "large" ||
        occurrenceB
          .sourceBoundaryKind !==
          "large"
      ) {
        failures.push({
          reason:
            "a-b-face-is-not-large-face",

          key,

          sourceBoundaryKinds: [
            occurrenceA
              .sourceBoundaryKind,

            occurrenceB
              .sourceBoundaryKind,
          ],
        });

        return;
      }

      const pairIdA =
        canonicalABInterfacePairIdFromBoundaryFaceId(
          occurrenceA
            .sourceBoundaryFaceId
        );

      const pairIdB =
        canonicalABInterfacePairIdFromBoundaryFaceId(
          occurrenceB
            .sourceBoundaryFaceId
        );

      if (
        !Number.isInteger(pairIdA) ||
        pairIdA !== pairIdB
      ) {
        failures.push({
          reason:
            "a-b-face-pair-id-mismatch",

          key,

          pairIdA,
          pairIdB,

          sourceBoundaryFaceIds: [
            occurrenceA
              .sourceBoundaryFaceId,

            occurrenceB
              .sourceBoundaryFaceId,
          ],
        });

        return;
      }

      const vertexIndices =
        occurrenceA
          .quotientVertexIndices;

      const points =
        vertexIndices.map(
          (vertexIndex) =>
            positions[
              vertexIndex
            ]
        );

      if (
        points.some(
          (point) =>
            !point ||
            !Number.isFinite(point.x) ||
            !Number.isFinite(point.y) ||
            !Number.isFinite(point.z) ||
            !Number.isFinite(point.w)
        )
      ) {
        failures.push({
          reason:
            "a-b-face-position-missing",

          key,
          vertexIndices,
        });

        return;
      }

      /*
       * Audit only the sheet triangle itself.
       *
       * This is intentionally independent of whether either
       * neighboring 3D tetrahedron is currently inverted.
       */
      const areaSquared4 =
        canonicalABInterfaceTriangleAreaSquared4(
          points[0],
          points[1],
          points[2]
        );

      minimumTriangleAreaSquared4 =
        Math.min(
          minimumTriangleAreaSquared4,
          areaSquared4
        );

      if (areaSquared4 <= 1e-18) {
        degenerateTriangleCount +=
          1;
      }

      triangleCountByPairId[
        pairIdA
      ] += 1;

      triangles.push({
        key,

        pairId:
          pairIdA,

        quotientVertexIndices:
          vertexIndices.slice(),

        areaSquared4,
      });
    }
  );

  if (
    triangleCountByPairId.some(
      (count) =>
        count <= 0
    )
  ) {
    failures.push({
      reason:
        "canonical-four-sheet-coverage-incomplete",

      triangleCountByPairId,
    });
  }

  if (degenerateTriangleCount > 0) {
    failures.push({
      reason:
        "canonical-a-b-interface-degenerate-triangles",

      degenerateTriangleCount,
    });
  }


  /*
   * ============================================================
   * CANONICAL BOUNDARY OF COLOR
   * ============================================================
   *
   * The 432 triangles are a computational subdivision of only
   * four canonical 2-cells:
   *
   *   Orange
   *   Blue
   *   Green
   *   Red
   *
   * Do NOT display every subdivision edge as if it were part of
   * the mathematical partition.
   *
   * An edge belongs to the visible boundary-of-color graph iff:
   *
   *   1. its incident interface triangles carry different pairIds,
   *      or
   *
   *   2. both of its endpoints lie on the exact cusp boundary.
   */
  const cuspBoundaryVertexSet =
    new Set(
      cuspBoundaryVertexIndices
    );

  const edgeIncidence =
    new Map();

  triangles.forEach(
    (triangle) => {
      const vertices =
        triangle
          .quotientVertexIndices;

      const triangleEdges = [
        [
          vertices[0],
          vertices[1],
        ],

        [
          vertices[1],
          vertices[2],
        ],

        [
          vertices[2],
          vertices[0],
        ],
      ];

      triangleEdges.forEach(
        (
          [
            firstVertexIndex,
            secondVertexIndex,
          ]
        ) => {
          const ordered =
            firstVertexIndex <
            secondVertexIndex
              ? [
                  firstVertexIndex,
                  secondVertexIndex,
                ]
              : [
                  secondVertexIndex,
                  firstVertexIndex,
                ];

          const key =
            `${ordered[0]}:${ordered[1]}`;

          let record =
            edgeIncidence.get(
              key
            );

          if (!record) {
            record = {
              key,

              quotientVertexIndices:
                ordered,

              pairIds:
                new Set(),

              triangleKeys: [],
            };

            edgeIncidence.set(
              key,
              record
            );
          }

          record
            .pairIds
            .add(
              triangle.pairId
            );

          record
            .triangleKeys
            .push(
              triangle.key
            );
        }
      );
    }
  );


  const colorBoundaryEdges =
    [];

  let colorChangeEdgeCount =
    0;

  let cuspBoundaryEdgeCount =
    0;


  edgeIncidence.forEach(
    (record) => {
      const pairIds = [
        ...record.pairIds,
      ].sort(
        (
          first,
          second
        ) =>
          first - second
      );

      const [
        firstVertexIndex,
        secondVertexIndex,
      ] =
        record
          .quotientVertexIndices;

      const onCuspBoundary =
        cuspBoundaryVertexSet.has(
          firstVertexIndex
        ) &&
        cuspBoundaryVertexSet.has(
          secondVertexIndex
        );

      const changesColor =
        pairIds.length > 1;


      /*
       * Every other edge is merely internal triangulation of one
       * canonical colored face and must not be visible.
       */
      if (
        !changesColor &&
        !onCuspBoundary
      ) {
        return;
      }


      const kind =
        changesColor
          ? "color-change"
          : "cusp-boundary";


      if (
        kind ===
        "color-change"
      ) {
        colorChangeEdgeCount +=
          1;
      } else {
        cuspBoundaryEdgeCount +=
          1;
      }


      colorBoundaryEdges.push({
        key:
          record.key,

        kind,

        pairIds,

        quotientVertexIndices:
          record
            .quotientVertexIndices
            .slice(),

        triangleKeys:
          record
            .triangleKeys
            .slice(),
      });
    }
  );


  return {
    ready:
      failures.length === 0 &&
      triangles.length > 0,

    positions,
    triangles,
    cuspBoundaryVertexIndices,
    colorBoundaryEdges,

    triangleCountByPairId,

    failures,

    summary: {
      triangleCount:
        triangles.length,

      triangleCountByPairId,

      colorBoundaryEdgeCount:
        colorBoundaryEdges.length,

      colorChangeEdgeCount,

      cuspBoundaryEdgeCount,

      degenerateTriangleCount,

      minimumTriangleAreaSquared4:
        Number.isFinite(
          minimumTriangleAreaSquared4
        )
          ? minimumTriangleAreaSquared4
          : 0,
    },
  };
}


/*
 * intrinsicS3VolumeSolver stores points as
 *
 *   { x, y, z, w }
 *
 * while the historical Projection-Lab helper immediately below
 * expects its local object names in the order
 *
 *   { w:x, x:y, y:z, z:w }.
 *
 * This is only a coordinate-name handoff. No geometry changes.
 */
function intrinsicSolverPoint4ToReferencePoint4(
  point
) {
  return {
    w: point.x,
    x: point.y,
    y: point.z,
    z: point.w,
  };
}


export default function TruncatedTetrahedraViewer({
  manifoldId = "m004",
  view,
  facePairSequence = [],
  activeSeamPairId = undefined,
  collapsedBridgePairIds = undefined,
  facePairMappingIndices = [],
  showInterior = false,
  constructiveFinalDisplayActive = false,
  showCuspTriangles,
  extendCusp,
  assembleCusp,
  cuspWrapOrder,
  knotViewActive = false,
  truncationFraction =
    DEFAULT_TRUNCATION_FRACTION,
  cuspMeshFaceCount =
    DEFAULT_CUSP_MESH_FACE_COUNT,
  onPairInteraction = null,
  onConstructionStateChange = null,
  autoFit = true,
  onAutoFitZoom = null,
  onCuspFlightSourceChange = null,
  presentationOpacity = 1,

  /*
   * Temporary Figure-eight <-> Sister same-face comparison.
   * Null during every ordinary Cells operation.
   */
  corollaryTargetManifoldId = null,
  corollaryPairId = null,
  corollaryProgress = 0,
}) {
  const svgRef =
    useRef(null);

  const activeManifold =
    manifoldSpec(manifoldId);

  const activeFacePairs =
    activeManifold.facePairs ??
    FIGURE_EIGHT_FACE_PAIRS;

  const corollaryTargetPair =
    (
      corollaryTargetManifoldId !==
        null &&
      Number.isInteger(
        corollaryPairId
      )
    )
      ? (
          manifoldSpec(
            corollaryTargetManifoldId
          ).facePairs?.[
            corollaryPairId
          ] ??
          null
        )
      : null;

  const activeCuspCoordinateSpec =
    activeManifold.cuspCoordinates ??
    FIGURE_EIGHT_CUSP_COORDINATE_SPEC;

  const normalizedCuspMeshFaceCount =
    normalizeCuspMeshFaceCount(
      cuspMeshFaceCount
    );

  const connectedCuspMeshes =
    useMemo(
      () => {
        /*
         * This is the already-solved canonical triangulation of
         * the complete torus.
         *
         * Build the stationary form regardless of presentation
         * stage so Boundary uses this SAME mesh directly.
         *
         * MESH changes subdivision density only.
         */
        const stationary =
          createCuspConnectedSurfaceMesh(
            normalizedCuspMeshFaceCount
          );

        if (!showCuspTriangles) {
          return {
            stationary,
            animation: null,
          };
        }

        const animationFaceCount =
          Math.min(
            normalizedCuspMeshFaceCount,
            CUSP_KNOT_ANIMATION_FACE_COUNT
          );

        return {
          stationary,

          animation:
            animationFaceCount ===
            normalizedCuspMeshFaceCount
              ? stationary
              : createCuspConnectedSurfaceMesh(
                  animationFaceCount
                ),
        };
      },
      [
        showCuspTriangles,
        normalizedCuspMeshFaceCount,
      ]
    );

  const facePairSequenceKey =
    facePairSequence.join(",");

  const selectedPairId =
    facePairSequence.length > 0
      ? facePairSequence[
          facePairSequence.length - 1
        ]
      : null;

  const [
    showIntrinsicVolumeDebug,
    setShowIntrinsicVolumeDebug,
  ] = useState(false);

  const [
    showIntrinsicBoundaryCorrespondence,
    setShowIntrinsicBoundaryCorrespondence,
  ] = useState(false);

  const [
    canonicalABInterfaceDiagnostic,
    setCanonicalABInterfaceDiagnostic,
  ] = useState(null);

  /*
   * Canonical-cell shell inspection.
   *
   * null   -> ordinary four-color cusp presentation
   * both   -> show complete outer boundary split into A/B ownership
   * A / B  -> show only that canonical cell's cusp-owned boundary patches
   *
   * The internal Orange/Blue/Green/Red A/B interface remains the common
   * boundary in all three shell modes.
   */
  const [
    canonicalCellShellMode,
    setCanonicalCellShellMode,
  ] = useState(null);

  const [
    menascoInspectionActive,
    setMenascoInspectionActive,
  ] = useState(false);

  const [
    menascoThreeBallsVisible,
    setMenascoThreeBallsVisible,
  ] = useState(false);

  const menascoInspectionProgress =
    useAnimatedAssembly(
      menascoInspectionActive,
      MENASCO_INSPECTION_DURATION_MS
    );

  useEffect(() => {
    if (
      process.env.NODE_ENV !==
        "development" ||
      typeof window === "undefined"
    ) {
      return undefined;
    }

    window.showFigureEightMenascoDecomposition =
      () => {
        setCanonicalCellShellMode(null);
        setCanonicalABInterfaceDiagnostic(null);
        setMenascoThreeBallsVisible(false);
        setMenascoInspectionActive(true);
        return true;
      };

    window.hideFigureEightMenascoDecomposition =
      () => {
        setMenascoInspectionActive(false);
        return true;
      };

    return () => {
      delete window.showFigureEightMenascoDecomposition;
      delete window.hideFigureEightMenascoDecomposition;
    };
  }, []);

  /*
   * ============================================================
   * AUTHORITATIVE CONSTRUCTIVE S³ VOLUME
   * ============================================================
   *
   * m004 now has a certified ambient volume:
   *
   *   exact figure-eight S³ tube
   *       ->
   *   certified bounded R³ complement
   *       ->
   *   constrained tetrahedralization
   *       ->
   *   exact inverse-stereographic S³ cell map.
   *
   * Load it asynchronously so the constructor UI never waits for
   * the old harmonic / nonlinear ambient solvers.
   */
  const [
    intrinsicS3ConstructiveVolumeState,
    setIntrinsicS3ConstructiveVolumeState,
  ] = useState(null);

  const [
    intrinsicS3ConstructiveVolumeStatus,
    setIntrinsicS3ConstructiveVolumeStatus,
  ] = useState("idle");


  useEffect(() => {
    const controller =
      new AbortController();

    let disposed =
      false;


    /*
     * The constructive ambient mesh currently certifies m004.
     *
     * Do not silently reuse it for the sister manifold.
     */
    if (
      activeManifold.id !==
      "m004"
    ) {
      setIntrinsicS3ConstructiveVolumeState(
        null
      );

      setIntrinsicS3ConstructiveVolumeStatus(
        "unavailable"
      );

      return () => {
        disposed =
          true;

        controller.abort();
      };
    }


    setIntrinsicS3ConstructiveVolumeState(
      null
    );

    setIntrinsicS3ConstructiveVolumeStatus(
      "loading"
    );


    loadIntrinsicS3ConstructiveVolumeState({
      signal:
        controller.signal,
    })
      .then(
        (result) => {
          if (disposed) {
            return;
          }


          setIntrinsicS3ConstructiveVolumeState(
            result
          );

          setIntrinsicS3ConstructiveVolumeStatus(
            result.ready
              ? "ready"
              : "failed"
          );


          console.info(
            `[constructive-s3-volume:${activeManifold.id}] ` +
              (
                result.ready
                  ? "AUTHORITATIVE READY"
                  : "FAIL"
              ),
            result.summary
          );


          if (
            !result.ready
          ) {
            console.error(
              `[constructive-s3-volume:${activeManifold.id}] failures`,
              result.failures
            );
          }
        }
      );


    return () => {
      disposed =
        true;

      controller.abort();
    };
  }, [
    activeManifold.id,
  ]);


  /*
   * Development inspection only.
   *
   * The geometry itself is loaded automatically above.
   */
  useEffect(() => {
    if (
      process.env.NODE_ENV !==
        "development" ||
      typeof window ===
        "undefined"
    ) {
      return undefined;
    }


    const inspectConstructiveS3Volume =
      () =>
        intrinsicS3ConstructiveVolumeState;


    window
      .inspectFigureEightConstructiveS3Volume =
        inspectConstructiveS3Volume;

    window
      .figureEightConstructiveS3VolumeStatus =
        intrinsicS3ConstructiveVolumeStatus;


    const auditFigureEightMenascoVolumeCut =
      () => {
        const result =
          buildFigureEightMenascoVolumeCutAudit(
            intrinsicS3ConstructiveVolumeState
          );

        window
          .__figureEightMenascoVolumeCutAudit =
            result;

        console.info(
          "MENASCO VOLUME CUT — TRUE PL CUT",
          result
        );

        if (result.ready) {
          console.info(
            `RESULT: ${result.pass ? "PASS" : "FAIL"}`
          );

          console.info(
            "A",
            result.A
          );

          console.info(
            "B",
            result.B
          );
        } else {
          console.error(
            "MENASCO VOLUME CUT NOT READY",
            result
          );
        }

        return result;
      };


    window
      .auditFigureEightMenascoVolumeCut =
        auditFigureEightMenascoVolumeCut;


    return () => {
      if (
        window
          .inspectFigureEightConstructiveS3Volume ===
        inspectConstructiveS3Volume
      ) {
        delete window
          .inspectFigureEightConstructiveS3Volume;
      }


      if (
        window
          .figureEightConstructiveS3VolumeStatus ===
        intrinsicS3ConstructiveVolumeStatus
      ) {
        delete window
          .figureEightConstructiveS3VolumeStatus;
      }


      if (
        window
          .auditFigureEightMenascoVolumeCut ===
        auditFigureEightMenascoVolumeCut
      ) {
        delete window
          .auditFigureEightMenascoVolumeCut;
      }
    };
  }, [
    intrinsicS3ConstructiveVolumeState,
    intrinsicS3ConstructiveVolumeStatus,
  ]);


  /*
   * ============================================================
   * CERTIFIED m004 SOURCE SUPPORT
   * ============================================================
   *
   * Load only certified source records still used by the current
   * viewer:
   *
   *   • canonical topology for the exact A/B four-sheet atlas.
   *
   * No reconstruction replay or intermediate scaffold is loaded or
   * driven here.
   */
  const [
    certifiedM004SourceSupport,
    setCertifiedM004SourceSupport,
  ] = useState(null);

  const [
    certifiedM004SourceStatus,
    setCertifiedM004SourceStatus,
  ] = useState("idle");


  useEffect(() => {
    const controller =
      new AbortController();

    let disposed =
      false;


    if (
      activeManifold.id !==
      "m004"
    ) {
      setCertifiedM004SourceSupport(
        null
      );

      setCertifiedM004SourceStatus(
        "unavailable"
      );

      return () => {
        disposed =
          true;

        controller.abort();
      };
    }


    setCertifiedM004SourceSupport(
      null
    );

    setCertifiedM004SourceStatus(
      "loading"
    );


    loadCertifiedM004SourceSupport({
      signal:
        controller.signal,
    })
      .then(
        (result) => {
          if (disposed) {
            return;
          }


          setCertifiedM004SourceSupport(
            result
          );

          setCertifiedM004SourceStatus(
            "ready"
          );


          console.info(
            `[certified-m004-source:${activeManifold.id}] READY`,
            result.summary
          );
        }
      )
      .catch(
        (error) => {
          if (
            disposed ||
            error?.name ===
              "AbortError"
          ) {
            return;
          }


          setCertifiedM004SourceSupport(
            null
          );

          setCertifiedM004SourceStatus(
            "failed"
          );


          console.error(
            `[certified-m004-source:${activeManifold.id}] FAIL`,
            error
          );
        }
      );


    return () => {
      disposed =
        true;

      controller.abort();
    };
  }, [
    activeManifold.id,
  ]);


  /*
   * Development inspection only.
   *
   * Chrome console:
   *
   *   figureEightCertifiedSourceStatus
   *   inspectFigureEightCertifiedSource()
   */
  useEffect(() => {
    if (
      process.env.NODE_ENV !==
        "development" ||
      typeof window ===
        "undefined"
    ) {
      return undefined;
    }


    const inspectCertifiedSource =
      () =>
        certifiedM004SourceSupport;


    window
      .inspectFigureEightCertifiedSource =
        inspectCertifiedSource;

    window
      .figureEightCertifiedSourceStatus =
        certifiedM004SourceStatus;


    return () => {
      if (
        window
          .inspectFigureEightCertifiedSource ===
        inspectCertifiedSource
      ) {
        delete window
          .inspectFigureEightCertifiedSource;
      }


      if (
        window
          .figureEightCertifiedSourceStatus ===
        certifiedM004SourceStatus
      ) {
        delete window
          .figureEightCertifiedSourceStatus;
      }
    };
  }, [
    certifiedM004SourceSupport,
    certifiedM004SourceStatus,
  ]);


  /*
   * Exact constructive cell-complex topology.
   *
   * Derive edges and boundary faces directly from the authoritative
   * 16,284 constructive tetrahedra. Do not depend on any auxiliary
   * quotient/debug mesh representation for endpoint geometry.
   */
  const intrinsicS3ConstructiveEdgeTopology =
    useMemo(
      () => {
        const state =
          intrinsicS3ConstructiveVolumeState;

        const tetrahedra =
          state?.tetrahedra;

        if (
          !state?.ready ||
          !Array.isArray(tetrahedra)
        ) {
          return {
            interiorEdges: [],
            boundaryEdges: [],
            boundaryFaceCount: 0,
            totalEdgeCount: 0,
          };
        }

        const edgeByKey =
          new Map();

        const faceByKey =
          new Map();

        function registerEdge(
          first,
          second
        ) {
          const low =
            Math.min(first, second);

          const high =
            Math.max(first, second);

          const key =
            `${low}:${high}`;

          if (!edgeByKey.has(key)) {
            edgeByKey.set(
              key,
              {
                quotientVertexIndices: [
                  low,
                  high,
                ],
              }
            );
          }
        }

        function registerFace(
          first,
          second,
          third
        ) {
          const vertices =
            [
              first,
              second,
              third,
            ].sort(
              (a, b) =>
                a - b
            );

          const key =
            vertices.join(":");

          const record =
            faceByKey.get(key);

          if (record) {
            record.count += 1;
          } else {
            faceByKey.set(
              key,
              {
                vertices,
                count: 1,
              }
            );
          }
        }

        tetrahedra.forEach(
          (tetrahedron) => {
            if (
              !Array.isArray(tetrahedron) ||
              tetrahedron.length < 4
            ) {
              return;
            }

            const [
              a,
              b,
              c,
              d,
            ] = tetrahedron;

            [
              [a, b],
              [a, c],
              [a, d],
              [b, c],
              [b, d],
              [c, d],
            ].forEach(
              ([first, second]) =>
                registerEdge(
                  first,
                  second
                )
            );

            [
              [b, c, d],
              [a, c, d],
              [a, b, d],
              [a, b, c],
            ].forEach(
              (face) =>
                registerFace(
                  face[0],
                  face[1],
                  face[2]
                )
            );
          }
        );

        const boundaryEdgeKeys =
          new Set();

        let boundaryFaceCount =
          0;

        faceByKey.forEach(
          (face) => {
            if (face.count !== 1) {
              return;
            }

            boundaryFaceCount += 1;

            const [
              a,
              b,
              c,
            ] = face.vertices;

            [
              [a, b],
              [b, c],
              [c, a],
            ].forEach(
              ([first, second]) => {
                const low =
                  Math.min(
                    first,
                    second
                  );

                const high =
                  Math.max(
                    first,
                    second
                  );

                boundaryEdgeKeys.add(
                  `${low}:${high}`
                );
              }
            );
          }
        );

        const boundaryEdges =
          [];

        const interiorEdges =
          [];

        edgeByKey.forEach(
          (edge, key) => {
            if (
              boundaryEdgeKeys.has(key)
            ) {
              boundaryEdges.push(
                edge
              );
            } else {
              interiorEdges.push(
                edge
              );
            }
          }
        );

        return {
          interiorEdges,
          boundaryEdges,
          boundaryFaceCount,
          totalEdgeCount:
            edgeByKey.size,
        };
      },
      [
        intrinsicS3ConstructiveVolumeState,
      ]
    );


  const intrinsicS3ConstructiveInteriorEdges =
    intrinsicS3ConstructiveEdgeTopology
      .interiorEdges;


  const intrinsicS3ConstructiveBoundaryEdges =
    intrinsicS3ConstructiveEdgeTopology
      .boundaryEdges;




  const [
    interiorBridgePulseTick,
    setInteriorBridgePulseTick,
  ] = useState(0);

  useEffect(() => {
    if (
      !showInterior ||
      facePairSequence.length === 0
    ) {
      setInteriorBridgePulseTick(0);
      return undefined;
    }

    /*
     * A changed identification set starts a fresh synchronized
     * sweep from the A ends of every bridge.
     */
    setInteriorBridgePulseTick(0);

    const intervalId =
      window.setInterval(
        () => {
          setInteriorBridgePulseTick(
            (current) => current + 1
          );
        },
        INTERIOR_BRIDGE_PULSE_STEP_MS
      );

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    showInterior,
    facePairSequenceKey,
  ]);

  /*
   * Every bridge present in the quotient shares the same pulse
   * phase. A single pulse step therefore produces one matching
   * transverse light ring on every existing bridge at once.
   */
  const interiorBridgePulseSpan =
    SECOND_FACE_BRIDGE_SEGMENTS +
    INTERIOR_BRIDGE_PULSE_PAUSE_STEPS;

  const interiorBridgePulseStep =
    interiorBridgePulseTick %
    interiorBridgePulseSpan;

  /*
   * Face-pair construction is symmetric. Every selected
   * identification begins as an exposed bridge; each bridge
   * owns an independent collapse coordinate. Keep the legacy
   * singular prop as a one-element compatibility path until
   * the controller is migrated to collapsedBridgePairIds.
   */
  const requestedCollapsedBridgePairIds =
    Array.isArray(collapsedBridgePairIds)
      ? collapsedBridgePairIds
      : activeSeamPairId !== undefined &&
          activeSeamPairId !== null
        ? [activeSeamPairId]
        : [];

  const resolvedCollapsedBridgePairIds =
    facePairSequence.filter(
      (pairId) =>
        requestedCollapsedBridgePairIds
          .includes(pairId)
    );

  const resolvedCollapsedBridgePairIdsKey =
    resolvedCollapsedBridgePairIds.join(",");

  const certifiedCanonicalAtlasAudit =
    useMemo(
      () =>
        buildCertifiedCanonicalAtlasAudit(
          certifiedM004SourceSupport
            ?.assets
            ?.topology
        ),
      [
        certifiedM004SourceSupport,
      ]
    );

  useEffect(() => {
    if (
      process.env.NODE_ENV !==
        "development" ||
      typeof window ===
        "undefined"
    ) {
      return undefined;
    }

    window.inspectFigureEightCanonicalAtlas =
      () => certifiedCanonicalAtlasAudit;

    return () => {
      delete window
        .inspectFigureEightCanonicalAtlas;
    };
  }, [certifiedCanonicalAtlasAudit]);


  /*
   * Remember which seam was already physically compact when a
   * later collapse was requested. In released-face mode that seam
   * is only an ambient anchor for the two cell cores; every face
   * identification is still represented independently below.
   */
  const collapsedCoreAnchorPairRef =
    useRef(
      resolvedCollapsedBridgePairIds[0] ??
      null
    );

  useEffect(() => {
    const current =
      collapsedCoreAnchorPairRef.current;

    if (
      current !== null &&
      resolvedCollapsedBridgePairIds
        .includes(current)
    ) {
      return;
    }

    collapsedCoreAnchorPairRef.current =
      resolvedCollapsedBridgePairIds[0] ??
      null;
  }, [
    resolvedCollapsedBridgePairIdsKey,
  ]);

  const collapsedBridgeTargetStrengths =
    activeFacePairs.map(
      (pair) =>
        resolvedCollapsedBridgePairIds
          .includes(pair.id)
          ? 1
          : 0
    );

  const truncatedGeometry =
    useMemo(
      () =>
        createTruncatedTetrahedronGeometry(
          truncationFraction,
          DEFAULT_TETRAHEDRON_SEPARATION,
          activeFacePairs
        ),
      [
        truncationFraction,
        activeManifold.id,
      ]
    );

  const bridgeRoutePreferenceByPairRef =
    useRef(
      activeFacePairs.map(
        () => null
      )
    );

  /*
   * Retain the last complete displayed route assignment
   * independently of camera projection. The global planner
   * can temporarily return a partial assignment after its
   * transition-start metadata changes, even though the
   * world-space bridge geometry has not changed. A view
   * rotation must never turn that planner bookkeeping
   * change into a disappearing bridge.
   */
  const lastCompleteBridgeRouteSetRef =
    useRef({
      sceneKey: null,
      routeSpecsByPairId:
        activeFacePairs.map(
          () => null
        ),
    });

  const [
    bridgeRouteTargetSpecs,
    setBridgeRouteTargetSpecs,
  ] = useState(
    () =>
      activeFacePairs.map(
        () => null
      )
  );

  const animatedBridgeRouteSpecs =
    useAnimatedBridgeRouteSpecs(
      bridgeRouteTargetSpecs,
      BRIDGE_ROUTE_CHANGE_DURATION_MS,
      activeFacePairs
    );

  const currentBridgeRouteTargetKey =
    bridgeRouteSpecArrayKey(
      bridgeRouteTargetSpecs,
      activeFacePairs
    );

  const animatedBridgeRouteSpecKey =
    bridgeRouteSpecArrayKey(
      animatedBridgeRouteSpecs,
      activeFacePairs
    );

  const bridgeRouteTransitionRef =
    useRef({
      targetKey:
        currentBridgeRouteTargetKey,
      startSpecs:
        animatedBridgeRouteSpecs,
    });

  if (
    bridgeRouteTransitionRef
      .current.targetKey !==
    currentBridgeRouteTargetKey
  ) {
    bridgeRouteTransitionRef.current = {
      targetKey:
        currentBridgeRouteTargetKey,
      startSpecs:
        animatedBridgeRouteSpecs.map(
          (routeSpec) =>
            routeSpec === null
              ? null
              : { ...routeSpec }
        ),
    };
  }

  const [
    showDeveloperDiagnostics,
    setShowDeveloperDiagnostics,
  ] = useState(false);

  /*
   * Retain the last successful side of an obstacle for
   * the currently active face. This route preference is
   * advisory: a clearly safer candidate may replace it.
   */
  const plannerGuidePreferenceRef =
    useRef(null);

  useEffect(() => {
    if (
      process.env.NODE_ENV !==
      "development" ||
      typeof window === "undefined"
    ) {
      return undefined;
    }

    const auditRunner = (options) =>
      runFigureEightFaceOrderAudit(
        options
      );

    const cancelAudit = () =>
      cancelFigureEightFaceOrderAudit();

    const showDiagnostics = () =>
      setShowDeveloperDiagnostics(true);

    const hideDiagnostics = () =>
      setShowDeveloperDiagnostics(false);

    const toggleDiagnostics = () =>
      setShowDeveloperDiagnostics(
        (current) => !current
      );

    window.runFigureEightFaceOrderAudit =
      auditRunner;

    window.cancelFigureEightFaceOrderAudit =
      cancelAudit;

    window.showFigureEightDiagnostics =
      showDiagnostics;

    window.hideFigureEightDiagnostics =
      hideDiagnostics;

    window.toggleFigureEightDiagnostics =
      toggleDiagnostics;

    console.info(
      "Figure-eight audit ready. Run " +
      "await window.runFigureEightFaceOrderAudit() " +
      "in the browser console."
    );

    console.info(
      "Detailed face diagnostics are hidden. Run " +
      "window.showFigureEightDiagnostics() to display them."
    );

    return () => {
      if (
        window.runFigureEightFaceOrderAudit ===
        auditRunner
      ) {
        delete window
          .runFigureEightFaceOrderAudit;
      }

      if (
        window.cancelFigureEightFaceOrderAudit ===
        cancelAudit
      ) {
        delete window
          .cancelFigureEightFaceOrderAudit;
      }

      if (
        window.showFigureEightDiagnostics ===
        showDiagnostics
      ) {
        delete window
          .showFigureEightDiagnostics;
      }

      if (
        window.hideFigureEightDiagnostics ===
        hideDiagnostics
      ) {
        delete window
          .hideFigureEightDiagnostics;
      }

      if (
        window.toggleFigureEightDiagnostics ===
        toggleDiagnostics
      ) {
        delete window
          .toggleFigureEightDiagnostics;
      }
    };
  }, []);

  const preferredPlannerGuide =
    plannerGuidePreferenceRef.current;

  const {
    strengths:
      facePairStrengths,
    order:
      facePairConstraintOrder,
  } = useFacePairStrengths(
    facePairSequence,
    activeFacePairs
  );

  /*
   * Face-pair motion changes the projected bounds every frame.
   * Do not feed those transient bounds back into the parent
   * auto-fit camera while the rigid identification animation
   * is moving.
   */
  const facePairAnimationActive =
    facePairStrengths.some(
      (strength) =>
        strength > 1e-6 &&
        strength < 1 - 1e-6
    );

  const animatedSeamStrengths =
    useAnimatedPairStrengths(
      resolvedCollapsedBridgePairIds,
      SEAM_TRANSITION_DURATION_MS,
      activeFacePairs
    );

  const animatedSeamStrengthKey =
    animatedSeamStrengths
      .map((strength) =>
        strength.toFixed(6)
      )
      .join(",");

  /*
   * This becomes true on the same render that any bridge is
   * requested to collapse or expand. Route selection therefore
   * stays frozen for the entire geometric seam transition, not
   * only after an animated strength has left an endpoint.
   */
  const seamTransitionInProgress =
    animatedSeamStrengths.some(
      (strength, pairId) =>
        Math.abs(
          strength -
            collapsedBridgeTargetStrengths[
              pairId
            ]
        ) >
        FACE_CONSTRAINT_EPSILON
    );

  const animatedFacePairMappings =
    useAnimatedCyclicFaceMappings(
      facePairMappingIndices,
      FACE_MAPPING_DURATION_MS,
      activeFacePairs
    );

  const animatedFacePairMappingKey =
    animatedFacePairMappings.join(
      ","
    );

  const normalizedFacePairMappingTargets =
    activeFacePairs.map(
      (_, pairId) =>
        orientedFacePairMappingIndex(
          pairId,
          facePairMappingIndices?.[
            pairId
          ] ?? 0
        )
    );

  const facePairMappingTargetKey =
    normalizedFacePairMappingTargets.join(
      ","
    );

  /*
   * Assemble both two-tetrahedron manifolds into the same kind of
   * developed cusp strip.
   *
   * The strip is the geometric slot template. The active manifold's
   * face-pair equations and selected cyclic vertex maps determine which
   * of its eight cusp triangles occupies each slot.
   *
   * In particular, do not replace m003's developed cusp by a compact
   * square/parallelogram target. Its triangles must first assemble into
   * the strip that will later be closed in the two peripheral directions.
   */
  const cuspLayoutDerivation = useMemo(
    () =>
      deriveCuspFlatLayout(
        activeFacePairs,
        normalizedFacePairMappingTargets
      ),
    [
      activeManifold.id,
      facePairMappingTargetKey,
    ]
  );

  const {
    layout: cuspFlatLayout,
    transitionProgress:
      cuspLayoutTransitionProgress,
  } = useAnimatedCuspFlatLayout(
    cuspLayoutDerivation.layout,
    `${activeManifold.id}::${facePairMappingTargetKey}`,
    cuspLayoutDerivation.assemblyOrder ??
      CUSP_TILE_IDS
  );

  const cuspAssemblyOrder =
    cuspLayoutDerivation.assemblyOrder ??
    CUSP_TILE_IDS;

  /*
   * ============================================================
   * INTRINSIC VOLUME VALIDATION
   * ============================================================
   *
   * First checkpoint for the volumetric reconstruction:
   *
   *   • positive tetrahedral volume cells;
   *   • exact large-face quotient correspondence;
   *   • deterministic cusp (u,v) addresses.
   *
   * No ambient bridge geometry participates in this test.
   */
  const intrinsicVolumeDiagnostics =
    useMemo(
      () =>
        validateIntrinsicVolumeQuotient({
          volumeMeshes:
            truncatedGeometry
              .intrinsicVolumeMeshes,

          facePairs:
            activeFacePairs,

          facePairMappingIndices:
            normalizedFacePairMappingTargets,

          mappingPermutations:
            CYCLIC_FACE_MAPPING_CHOICES
              .map(
                (choice) =>
                  choice
                    .vertexPermutation
              ),

          cuspFlatLayout:
            cuspLayoutDerivation
              .layout,

          cuspCoordinateMapper:
            (rawPoint) =>
              cuspDomainCoordinates(
                rawPoint,
                activeCuspCoordinateSpec
              ),
        }),
      [
        truncatedGeometry,
        activeManifold.id,
        facePairMappingTargetKey,
        cuspLayoutDerivation,
        activeCuspCoordinateSpec,
      ]
    );

  const intrinsicVolumeDebugGeometry =
    useMemo(
      () =>
        createIntrinsicVolumeDebugGeometry({
          volumeMeshes:
            truncatedGeometry
              .intrinsicVolumeMeshes,
        }),
      [truncatedGeometry]
    );

  const intrinsicBoundaryCorrespondence =
    useMemo(
      () =>
        createIntrinsicCuspBoundaryCorrespondence({
          volumeMeshes:
            truncatedGeometry
              .intrinsicVolumeMeshes,

          cuspFlatLayout:
            cuspLayoutDerivation.layout,

          cuspCoordinateMapper:
            (rawPoint) =>
              cuspDomainCoordinates(
                rawPoint,
                activeCuspCoordinateSpec
              ),
        }),
      [
        truncatedGeometry,
        cuspLayoutDerivation,
        activeCuspCoordinateSpec,
      ]
    );

  /*
   * ============================================================
   * CANONICAL INTRINSIC QUOTIENT MESH
   * ============================================================
   *
   * Collapse duplicated A/B records on every identified large
   * face into one manifold-level vertex table.
   *
   * All 72 tetrahedral volume cells then reference canonical
   * quotient vertices.
   *
   * This remains intrinsic:
   *
   *     no guessed bridges
   *     no ambient routes
   *     no S³ interior solve yet
   */
  const intrinsicQuotientMesh =
    useMemo(
      () =>
        createIntrinsicQuotientMesh({
          volumeMeshes:
            truncatedGeometry
              .intrinsicVolumeMeshes,

          facePairs:
            activeFacePairs,

          facePairMappingIndices:
            normalizedFacePairMappingTargets,

          mappingPermutations:
            CYCLIC_FACE_MAPPING_CHOICES
              .map(
                (choice) =>
                  choice
                    .vertexPermutation
              ),

          cuspFlatLayout:
            cuspLayoutDerivation.layout,

          cuspCoordinateMapper:
            (rawPoint) =>
              cuspDomainCoordinates(
                rawPoint,
                activeCuspCoordinateSpec
              ),
        }),
      [
        truncatedGeometry,
        activeManifold.id,
        facePairMappingTargetKey,
        cuspLayoutDerivation,
        activeCuspCoordinateSpec,
      ]
    );


  /*
   * ============================================================
   * EXACT S³ BOUNDARY TARGET TABLE
   * ============================================================
   *
   * The intrinsic quotient now has one canonical vertex table.
   *
   * For every cusp-boundary quotient vertex:
   *
   *     intrinsic cusp address
   *           ↓
   *         raw (u,v)
   *           ↓
   *     verified peripheral basis
   *           ↓
   *   routeAmount + minorAngle
   *           ↓
   *  Projection Lab S³ tube point
   *
   * These points are exact boundary conditions for the future
   * volumetric solve.
   *
   * The remaining quotient vertices are the interior unknowns.
   */
  const intrinsicS3BoundaryTargets =
    useMemo(
      () => {
        const S3_NORM_TOLERANCE =
          1e-8;

        const S3_SAMPLE_TOLERANCE =
          1e-8;

        const failures = [];

        const targets = [];

        const targetByQuotientVertexIndex =
          new Map();

        const interiorUnknownVertexIndices =
          [];


        function point4Norm(point) {
          return Math.hypot(
            point.x,
            point.y,
            point.z,
            point.w
          );
        }


        function point4Distance(
          first,
          second
        ) {
          return Math.hypot(
            first.x - second.x,
            first.y - second.y,
            first.z - second.z,
            first.w - second.w
          );
        }


        intrinsicQuotientMesh
          .quotientVertices
          .forEach(
            (vertex) => {
              if (
                !vertex.cuspBoundary
              ) {
                interiorUnknownVertexIndices
                  .push(
                    vertex
                      .quotientVertexIndex
                  );

                return;
              }


              const samples =
                vertex
                  .cuspData
                  ?.samples ??
                [];


              if (
                samples.length === 0
              ) {
                failures.push({
                  quotientVertexIndex:
                    vertex
                      .quotientVertexIndex,

                  reason:
                    "missing-cusp-samples",
                });

                return;
              }


              const sampleTargets =
                samples
                  .map(
                    (
                      sample,
                      sampleIndex
                    ) => {
                      const raw =
                        sample.raw;

                      if (
                        !raw ||
                        !Number.isFinite(
                          raw.x
                        ) ||
                        !Number.isFinite(
                          raw.y
                        )
                      ) {
                        failures.push({
                          quotientVertexIndex:
                            vertex
                              .quotientVertexIndex,

                          sampleIndex,

                          reason:
                            "invalid-raw-cusp-point",
                        });

                        return null;
                      }


                      /*
                       * Convert the intrinsic developed cusp point into
                       * the verified peripheral coordinates used by the
                       * shared S³ tube.
                       */
                      const tubeCoordinates =
                        cuspTubeCoordinates(
                          raw,
                          activeCuspCoordinateSpec
                        );


                      if (
                        !tubeCoordinates ||
                        !Number.isFinite(
                          tubeCoordinates
                            .routeAmount
                        ) ||
                        !Number.isFinite(
                          tubeCoordinates
                            .minorAngle
                        )
                      ) {
                        failures.push({
                          quotientVertexIndex:
                            vertex
                              .quotientVertexIndex,

                          sampleIndex,

                          reason:
                            "missing-peripheral-tube-coordinates",
                        });

                        return null;
                      }


                      /*
                       * IMPORTANT:
                       *
                       * figureEightS3TubePoint4() is the native shared
                       * Projection Lab S³ object.
                       *
                       * Its array coordinate convention is
                       *
                       *     [x, y, z, w]
                       *
                       * and the point lies on the unit 3-sphere.
                       */
                      const nativePoint4 =
                        figureEightS3TubePoint4(
                          tubeCoordinates
                            .routeAmount,

                          tubeCoordinates
                            .minorAngle /
                            (
                              Math.PI *
                              2
                            )
                        );


                      if (
                        !Array.isArray(
                          nativePoint4
                        ) ||
                        nativePoint4.length !==
                          4 ||
                        nativePoint4.some(
                          (value) =>
                            !Number.isFinite(
                              value
                            )
                        )
                      ) {
                        failures.push({
                          quotientVertexIndex:
                            vertex
                              .quotientVertexIndex,

                          sampleIndex,

                          reason:
                            "invalid-s3-point",
                        });

                        return null;
                      }


                      const targetPoint4 = {
                        x:
                          nativePoint4[0],

                        y:
                          nativePoint4[1],

                        z:
                          nativePoint4[2],

                        w:
                          nativePoint4[3],
                      };


                      const norm =
                        point4Norm(
                          targetPoint4
                        );


                      if (
                        Math.abs(
                          norm - 1
                        ) >
                        S3_NORM_TOLERANCE
                      ) {
                        failures.push({
                          quotientVertexIndex:
                            vertex
                              .quotientVertexIndex,

                          sampleIndex,

                          reason:
                            "s3-point-off-unit-sphere",

                          norm,
                        });
                      }


                      return {
                        sampleIndex,

                        tetrahedronId:
                          sample
                            .tetrahedronId,

                        volumeVertexIndex:
                          sample
                            .volumeVertexIndex,

                        raw,

                        coordinates:
                          sample
                            .coordinates,

                        routeAmount:
                          tubeCoordinates
                            .routeAmount,

                        minorAngle:
                          tubeCoordinates
                            .minorAngle,

                        targetPoint4,

                        norm,
                      };
                    }
                  )
                  .filter(Boolean);


              if (
                sampleTargets.length ===
                0
              ) {
                return;
              }


              /*
               * One quotient vertex may have several representatives
               * inherited from the pre-quotient A/B meshes.
               *
               * They must all land on ONE physical S³ boundary point.
               */
              const representative =
                sampleTargets[0];

              let maximumSampleDisagreement =
                0;


              sampleTargets
                .slice(1)
                .forEach(
                  (sampleTarget) => {
                    maximumSampleDisagreement =
                      Math.max(
                        maximumSampleDisagreement,

                        point4Distance(
                          representative
                            .targetPoint4,

                          sampleTarget
                            .targetPoint4
                        )
                      );
                  }
                );


              if (
                maximumSampleDisagreement >
                S3_SAMPLE_TOLERANCE
              ) {
                failures.push({
                  quotientVertexIndex:
                    vertex
                      .quotientVertexIndex,

                  reason:
                    "quotient-representatives-disagree-in-s3",

                  maximumSampleDisagreement,
                });
              }


              const targetRecord = {
                quotientVertexIndex:
                  vertex
                    .quotientVertexIndex,

                memberRefs:
                  vertex.memberRefs,

                raw:
                  representative.raw,

                coordinates:
                  representative
                    .coordinates,

                routeAmount:
                  representative
                    .routeAmount,

                minorAngle:
                  representative
                    .minorAngle,

                targetPoint4:
                  representative
                    .targetPoint4,

                norm:
                  representative.norm,

                sampleCount:
                  sampleTargets.length,

                maximumSampleDisagreement,

                samples:
                  sampleTargets,
              };


              targets.push(
                targetRecord
              );


              targetByQuotientVertexIndex
                .set(
                  vertex
                    .quotientVertexIndex,

                  targetRecord
                );
            }
          );


        const expectedBoundaryCount =
          intrinsicQuotientMesh
            .summary
            .cuspBoundaryQuotientVertexCount;

        const expectedInteriorCount =
          intrinsicQuotientMesh
            .summary
            .interiorQuotientVertexCount;


        const maximumNormError =
          targets.reduce(
            (
              maximum,
              target
            ) =>
              Math.max(
                maximum,

                Math.abs(
                  target.norm -
                  1
                )
              ),
            0
          );


        const maximumRepresentativeDisagreement =
          targets.reduce(
            (
              maximum,
              target
            ) =>
              Math.max(
                maximum,

                target
                  .maximumSampleDisagreement
              ),
            0
          );


        const valid =
          intrinsicQuotientMesh.valid &&
          targets.length ===
            expectedBoundaryCount &&
          interiorUnknownVertexIndices
            .length ===
            expectedInteriorCount &&
          failures.length === 0;


        return {
          valid,

          /*
           * This boundary realization is presently verified for m004.
           */
          manifoldId:
            activeManifold.id,

          targets,

          targetByQuotientVertexIndex,

          interiorUnknownVertexIndices,

          failures,

          summary: {
            quotientVertexCount:
              intrinsicQuotientMesh
                .summary
                .quotientVertexCount,

            boundaryTargetCount:
              targets.length,

            expectedBoundaryTargetCount:
              expectedBoundaryCount,

            interiorUnknownVertexCount:
              interiorUnknownVertexIndices
                .length,

            expectedInteriorUnknownVertexCount:
              expectedInteriorCount,

            maximumNormError,

            maximumRepresentativeDisagreement,
          },
        };
      },
      [
        intrinsicQuotientMesh,
        activeManifold.id,
        activeCuspCoordinateSpec,
      ]
    );


  /*
   * Console checkpoint for the exact S³ Dirichlet boundary data.
   */
  useEffect(() => {
    if (
      process.env.NODE_ENV !==
        "development" ||
      typeof window ===
        "undefined"
    ) {
      return undefined;
    }


    const inspectS3BoundaryTargets =
      () =>
        intrinsicS3BoundaryTargets;


    window
      .inspectFigureEightS3BoundaryTargets =
        inspectS3BoundaryTargets;


    console.info(
      `[intrinsic-s3-boundary:${activeManifold.id}] ` +
        (
          intrinsicS3BoundaryTargets
            .valid
            ? "PASS"
            : "FAIL"
        ),

      intrinsicS3BoundaryTargets
        .summary
    );


    return () => {
      if (
        window
          .inspectFigureEightS3BoundaryTargets ===
        inspectS3BoundaryTargets
      ) {
        delete window
          .inspectFigureEightS3BoundaryTargets;
      }
    };
  }, [
    activeManifold.id,
    intrinsicS3BoundaryTargets,
  ]);


  /*
   * ============================================================
   * FIRST S³ INTERIOR SOLVER STATE
   * ============================================================
   *
   * 36 quotient vertices are fixed exactly.
   *
   * The remaining 10 vertices are obtained from a Dirichlet
   * graph-harmonic solve in R⁴ and then normalized onto S³.
   *
   * This is an initialization, not yet the final nonlinear
   * no-fold solution.
   */
  /*
   * The baseline S³ solve is a development diagnostic.
   *
   * It used to run synchronously inside React on every page
   * rebuild / Fast Refresh.  That can take tens of seconds or
   * minutes and is not needed to render the viewer.
   *
   * Keep only a reference here.  The expensive solve is now
   * launched explicitly from the browser console.
   */
  const intrinsicS3InitialSolverStateRef =
    useRef(null);

  const intrinsicS3CanonicalGeometryStateRef =
    useRef(null);

  const intrinsicCanonicalBarycentricSubdivisionRef =
    useRef(null);

  const intrinsicS3RefinedCanonicalGeometryStateRef =
    useRef(null);


  /*
   * ============================================================
   * CONSTRUCTIVE FIGURE-EIGHT COMPLEMENT PROJECTION
   * ============================================================
   *
   * This is the new production-direction checkpoint.
   *
   * It does NOT use:
   *
   *   • harmonic S³ initialization;
   *   • canonical ambient relaxation;
   *   • barycentric untangling;
   *   • synthetic collars / transition layers.
   *
   * Instead:
   *
   *   exact figure-eight S³ tube
   *           ->
   *   knot-centerline stereographic pole
   *           ->
   *   bounded complement boundary in R³.
   */
  useEffect(() => {
    if (
      process.env.NODE_ENV !==
        "development" ||
      typeof window ===
        "undefined"
    ) {
      return undefined;
    }


    let latestResult =
      null;


    const runConstructiveComplementProjection =
      () => {
        console.info(
          `[constructive-complement:${activeManifold.id}] START`
        );


        const result =
          createFigureEightS3ComplementProjection();


        latestResult =
          result;


        console.info(
          `[constructive-complement:${activeManifold.id}] ` +
            (
              result.valid
                ? "PASS"
                : "FAIL"
            ),

          result.summary
        );


        if (
          !result.valid
        ) {
          console.error(
            `[constructive-complement:${activeManifold.id}] failures`,
            result.failures
          );
        }


        return result;
      };


    const inspectConstructiveComplementProjection =
      () =>
        latestResult;


    window
      .runFigureEightConstructiveComplementProjection =
        runConstructiveComplementProjection;

    window
      .inspectFigureEightConstructiveComplementProjection =
        inspectConstructiveComplementProjection;


    console.info(
      `[constructive-complement:${activeManifold.id}] READY. ` +
        "Run const p = runFigureEightConstructiveComplementProjection()"
    );


    return () => {
      if (
        window
          .runFigureEightConstructiveComplementProjection ===
        runConstructiveComplementProjection
      ) {
        delete window
          .runFigureEightConstructiveComplementProjection;
      }


      if (
        window
          .inspectFigureEightConstructiveComplementProjection ===
        inspectConstructiveComplementProjection
      ) {
        delete window
          .inspectFigureEightConstructiveComplementProjection;
      }
    };
  }, [
    activeManifold.id,
  ]);


  /*
   * ============================================================
   * GEOMETRY-FIRST CANONICAL QUOTIENT CHECKPOINT
   * ============================================================
   *
   * This bypasses the synthetic collar / transition-torus stack.
   *
   * Console:
   *
   *   const canonical =
   *     runFigureEightCanonicalGeometryState()
   */
  useEffect(() => {
    if (
      process.env.NODE_ENV !==
        "development" ||
      typeof window ===
        "undefined"
    ) {
      return undefined;
    }


    const runCanonicalGeometryState =
      () => {
        console.info(
          `[canonical-s3:${activeManifold.id}] START`
        );


        const result =
          createIntrinsicS3CanonicalGeometryState({
            quotientMesh:
              intrinsicQuotientMesh,

            boundaryTargets:
              intrinsicS3BoundaryTargets,
          });


        intrinsicS3CanonicalGeometryStateRef
          .current =
            result;


        console.info(
          `[canonical-s3:${activeManifold.id}] ` +
            (
              result.ready
                ? "READY"
                : "FAIL"
            ),

          result.summary
        );


        return result;
      };


    const inspectCanonicalGeometryState =
      () =>
        intrinsicS3CanonicalGeometryStateRef
          .current;


    /*
     * ==========================================================
     * CANONICAL BARYCENTRIC SUBDIVISION CHECKPOINT
     * ==========================================================
     *
     * This does NOT use the synthetic cusp collar / transition
     * stack.
     *
     * It subdivides the verified 216-cell canonical m004 quotient
     * into its genuine 5,184-cell simplicial refinement and runs
     * the complete combinatorial / topological / hyperbolic audit.
     */
    const runCanonicalBarycentricSubdivision =
      () => {
        const canonicalCore =
          intrinsicQuotientMesh
            ?.canonicalCore;


        if (
          typeof canonicalCore
            ?.createBarycentricSubdivision !==
          "function"
        ) {
          console.error(
            `[canonical-subdivision:${activeManifold.id}] ` +
              "canonical subdivision factory is unavailable"
          );

          return null;
        }


        console.info(
          `[canonical-subdivision:${activeManifold.id}] START`
        );


        const result =
          canonicalCore
            .createBarycentricSubdivision();


        intrinsicCanonicalBarycentricSubdivisionRef
          .current =
            result;


        console.info(
          `[canonical-subdivision:${activeManifold.id}] ` +
            (
              result.valid
                ? "PASS"
                : "FAIL"
            ),
          {
            summary:
              result.summary,

            topologyAudit:
              result.topologyAudit,

            boundaryAudit:
              result.boundaryAudit,

            volumePartitionAudit:
              result.volumePartitionAudit,

            m004CountAudit:
              result.m004CountAudit,
          }
        );


        if (!result.valid) {
          console.error(
            `[canonical-subdivision:${activeManifold.id}] failures`,
            result.failures
          );
        }


        return result;
      };


    const inspectCanonicalBarycentricSubdivision =
      () =>
        intrinsicCanonicalBarycentricSubdivisionRef
          .current;


    /*
     * ==========================================================
     * REFINED CANONICAL S³ CHECKPOINT
     * ==========================================================
     *
     * This uses the verified 1,028-vertex / 5,184-tetrahedron
     * simplicial complex directly.
     *
     * The 216 cusp vertices are fixed from their exact developed
     * material addresses on the shared Projection Lab S³ tube.
     * The 812 genuine interior vertices receive one sparse
     * Dirichlet harmonic initialization.
     */
    const runRefinedCanonicalGeometryState =
      () => {
        const refinedMesh =
          intrinsicCanonicalBarycentricSubdivisionRef
            .current ??
          runCanonicalBarycentricSubdivision();


        if (
          !refinedMesh
            ?.valid
        ) {
          console.error(
            `[refined-canonical-s3:${activeManifold.id}] ` +
              "canonical barycentric subdivision is not valid"
          );

          return null;
        }


        console.info(
          `[refined-canonical-s3:${activeManifold.id}] START`
        );


        const result =
          createIntrinsicS3RefinedCanonicalGeometryState({
            refinedMesh,

            boundaryTargets:
              intrinsicS3BoundaryTargets,

            cuspCoordinateSpec:
              activeCuspCoordinateSpec,
          });


        intrinsicS3RefinedCanonicalGeometryStateRef
          .current =
            result;


        console.info(
          `[refined-canonical-s3:${activeManifold.id}] ` +
            (
              result.ready
                ? "READY"
                : "FAIL"
            ),

          result.summary
        );


        if (
          result.failures
            ?.length >
          0
        ) {
          console.error(
            `[refined-canonical-s3:${activeManifold.id}] failures`,
            result.failures
          );
        }


        return result;
      };


    const inspectRefinedCanonicalGeometryState =
      () =>
        intrinsicS3RefinedCanonicalGeometryStateRef
          .current;


    /*
     * Solve ONLY the genuine canonical ambient problem:
     *
     *   46 quotient vertices
     *   36 fixed cusp vertices
     *   10 movable interior vertices
     *   216 canonical tetrahedra
     */
    const runCanonicalAmbientRelaxation =
      (options = {}) => {
        const canonicalState =
          intrinsicS3CanonicalGeometryStateRef
            .current ??
          runCanonicalGeometryState();


        if (
          !canonicalState
            ?.ready ||
          typeof canonicalState
            .runAmbientRelaxation !==
            "function"
        ) {
          console.error(
            `[canonical-ambient:${activeManifold.id}] ` +
              "canonical geometry state is not ready"
          );

          return null;
        }


        console.info(
          `[canonical-ambient:${activeManifold.id}] START`,
          {
            quotientVertexCount:
              canonicalState
                .summary
                .quotientVertexCount,

            fixedBoundaryVertexCount:
              canonicalState
                .summary
                .fixedBoundaryVertexCount,

            interiorVertexCount:
              canonicalState
                .summary
                .interiorUnknownVertexCount,

            cellCount:
              canonicalState
                .summary
                .cellCount,

            initialOrientationMismatchCount:
              canonicalState
                .summary
                .orientationMismatchCount,

            options,
          }
        );


        const result =
          canonicalState
            .runAmbientRelaxation(
              options
            );


        console.info(
          `[canonical-ambient:${activeManifold.id}] ` +
            (
              result
                ?.success
                ? "SUCCESS"
                : "INCOMPLETE"
            ),

          result
            ?.summary ??
          null
        );


        return result;
      };


    const showCanonicalABInterface =
      (
        relaxationResult =
          window
            .__figureEightRefinedRelax3 ??
          window
            .__figureEightRefinedRelax2 ??
          window
            .__figureEightRefinedRelax1 ??
          null
      ) => {
        const refinedState =
          intrinsicS3RefinedCanonicalGeometryStateRef
            .current ??
          runRefinedCanonicalGeometryState();

        const result =
          buildCanonicalABInterfaceDiagnostic({
            refinedGeometryState:
              refinedState,

            relaxationResult,
          });

        window
          .__figureEightCanonicalABInterface =
            result;

        if (result.ready) {
          setCanonicalABInterfaceDiagnostic(
            result
          );
        } else {
          setCanonicalABInterfaceDiagnostic(
            null
          );
        }

        console.info(
          `[canonical-a-b-interface:${activeManifold.id}] ` +
            (
              result.ready
                ? "READY"
                : "FAIL"
            ),

          result.summary ??
            result.failures
        );

        if (!result.ready) {
          console.error(
            `[canonical-a-b-interface:${activeManifold.id}] failures`,
            result.failures
          );
        }

        return result;
      };


    const hideCanonicalABInterface =
      () => {
        setCanonicalABInterfaceDiagnostic(
          null
        );

        setCanonicalCellShellMode(
          null
        );

        return true;
      };


    const showCanonicalCellShell =
      (
        requestedMode = "both",
        relaxationResult =
          window
            .__figureEightRefinedRelax3 ??
          window
            .__figureEightRefinedRelax2 ??
          window
            .__figureEightRefinedRelax1 ??
          null
      ) => {
        const mode =
          requestedMode === "A" ||
          requestedMode === "B"
            ? requestedMode
            : "both";

        /*
         * The four exact common face classes remain the internal
         * portion of BOTH canonical cell boundaries.
         */
        const interfaceResult =
          showCanonicalABInterface(
            relaxationResult
          );

        if (!interfaceResult?.ready) {
          setCanonicalCellShellMode(
            null
          );

          return {
            ready: false,
            mode,
            interfaceResult,
          };
        }

        setCanonicalCellShellMode(
          mode
        );

        const result = {
          ready: true,
          mode,

          interfaceTriangleCount:
            interfaceResult
              .summary
              ?.triangleCount ??
            interfaceResult
              .triangles
              ?.length ??
            0,

          cuspTileOwners:
            mode === "both"
              ? [
                  "A0",
                  "A1",
                  "A2",
                  "A3",
                  "B0",
                  "B1",
                  "B2",
                  "B3",
                ]
              : [
                  `${mode}0`,
                  `${mode}1`,
                  `${mode}2`,
                  `${mode}3`,
                ],
        };

        window
          .__figureEightCanonicalCellShell =
            result;

        console.info(
          `[canonical-cell-shell:${activeManifold.id}] ` +
            `${mode} READY`,
          result
        );

        return result;
      };


    const showCanonicalBoundaryOwnershipOnly =
      () => {
        /*
         * Show ONLY the exact material ownership already encoded
         * on the actual completed figure-eight cusp torus.
         *
         * No inferred interior sheets.
         * No Menasco volume proxy.
         * No screen-space classification.
         */
        setMenascoInspectionActive(false);

        setMenascoThreeBallsVisible(false);

        setCanonicalABInterfaceDiagnostic(
          null
        );

        setCanonicalCellShellMode(
          "both"
        );

        const result = {
          ready: true,

          mode:
            "exact-boundary-ownership-only",

          cuspTileOwners: [
            "A0",
            "A1",
            "A2",
            "A3",
            "B0",
            "B1",
            "B2",
            "B3",
          ],
        };

        window
          .__figureEightCanonicalBoundaryOwnership =
            result;

        console.info(
          "[canonical-boundary-ownership:m004] READY",
          result
        );

        return result;
      };


    const hideCanonicalCellShell =
      () => {
        /*
         * Shell mode owns the interface diagnostic while it is active.
         * Hiding the shell therefore restores the ordinary scene rather
         * than leaving the four interface sheets behind.
         */
        setCanonicalCellShellMode(
          null
        );

        setCanonicalABInterfaceDiagnostic(
          null
        );

        return true;
      };


    const auditCanonicalABInterface =
      (
        diagnostic =
          window
            .__figureEightCanonicalABInterface ??
          canonicalABInterfaceDiagnostic
      ) => {
        const result =
          auditCanonicalABInterfaceEmbedding(
            diagnostic
          );

        window
          .__figureEightCanonicalABInterfaceAudit =
            result;

        console.info(
          `[canonical-a-b-embedding-audit:${activeManifold.id}]`,
          result.summary ??
            result
        );

        if (
          result
            ?.summary
            ?.selfIntersectionCount >
          0
        ) {
          console.warn(
            `[canonical-a-b-embedding-audit:${activeManifold.id}] interface contacts`,
            result.contactExamples
          );
        }

        if (
          result
            ?.summary
            ?.interiorVertexInsideTubeCount >
          0
        ) {
          console.warn(
            `[canonical-a-b-embedding-audit:${activeManifold.id}] vertices inside removed tube`,
            result.tubeViolationExamples
          );
        }

        return result;
      };


    window
      .runFigureEightCanonicalGeometryState =
        runCanonicalGeometryState;

    window
      .inspectFigureEightCanonicalGeometryState =
        inspectCanonicalGeometryState;

    window
      .runFigureEightCanonicalAmbientRelaxation =
        runCanonicalAmbientRelaxation;

    window
      .runFigureEightCanonicalBarycentricSubdivision =
        runCanonicalBarycentricSubdivision;

    window
      .inspectFigureEightCanonicalBarycentricSubdivision =
        inspectCanonicalBarycentricSubdivision;

    window
      .runFigureEightRefinedCanonicalGeometryState =
        runRefinedCanonicalGeometryState;

    window
      .inspectFigureEightRefinedCanonicalGeometryState =
        inspectRefinedCanonicalGeometryState;

    window
      .showFigureEightCanonicalABInterface =
        showCanonicalABInterface;

    window
      .hideFigureEightCanonicalABInterface =
        hideCanonicalABInterface;

    window
      .auditFigureEightCanonicalABInterface =
        auditCanonicalABInterface;

    window
      .showFigureEightCanonicalCellShell =
        showCanonicalCellShell;

    window
      .hideFigureEightCanonicalCellShell =
        hideCanonicalCellShell;

    window
      .showFigureEightCanonicalBoundaryOwnership =
        showCanonicalBoundaryOwnershipOnly;


    return () => {
      if (
        window
          .runFigureEightCanonicalGeometryState ===
        runCanonicalGeometryState
      ) {
        delete window
          .runFigureEightCanonicalGeometryState;
      }


      if (
        window
          .inspectFigureEightCanonicalGeometryState ===
        inspectCanonicalGeometryState
      ) {
        delete window
          .inspectFigureEightCanonicalGeometryState;
      }


      if (
        window
          .runFigureEightCanonicalAmbientRelaxation ===
        runCanonicalAmbientRelaxation
      ) {
        delete window
          .runFigureEightCanonicalAmbientRelaxation;
      }


      if (
        window
          .runFigureEightCanonicalBarycentricSubdivision ===
        runCanonicalBarycentricSubdivision
      ) {
        delete window
          .runFigureEightCanonicalBarycentricSubdivision;
      }


      if (
        window
          .inspectFigureEightCanonicalBarycentricSubdivision ===
        inspectCanonicalBarycentricSubdivision
      ) {
        delete window
          .inspectFigureEightCanonicalBarycentricSubdivision;
      }


      if (
        window
          .runFigureEightRefinedCanonicalGeometryState ===
        runRefinedCanonicalGeometryState
      ) {
        delete window
          .runFigureEightRefinedCanonicalGeometryState;
      }


      if (
        window
          .inspectFigureEightRefinedCanonicalGeometryState ===
        inspectRefinedCanonicalGeometryState
      ) {
        delete window
          .inspectFigureEightRefinedCanonicalGeometryState;
      }


      if (
        window
          .showFigureEightCanonicalABInterface ===
        showCanonicalABInterface
      ) {
        delete window
          .showFigureEightCanonicalABInterface;
      }


      if (
        window
          .hideFigureEightCanonicalABInterface ===
        hideCanonicalABInterface
      ) {
        delete window
          .hideFigureEightCanonicalABInterface;
      }


      if (
        window
          .auditFigureEightCanonicalABInterface ===
        auditCanonicalABInterface
      ) {
        delete window
          .auditFigureEightCanonicalABInterface;
      }


      if (
        window
          .showFigureEightCanonicalCellShell ===
        showCanonicalCellShell
      ) {
        delete window
          .showFigureEightCanonicalCellShell;
      }


      if (
        window
          .hideFigureEightCanonicalCellShell ===
        hideCanonicalCellShell
      ) {
        delete window
          .hideFigureEightCanonicalCellShell;
      }
    };
  }, [
    activeManifold.id,
    activeCuspCoordinateSpec,
    intrinsicQuotientMesh,
    intrinsicS3BoundaryTargets,
  ]);


  /*
   * Development checkpoint.
   *
   * READY means:
   *
   *   • all 46 quotient vertices have S³ positions;
   *   • all 36 boundary vertices remained exactly fixed;
   *   • all 10 interior unknowns were initialized;
   *   • the 10×10 Dirichlet linear system solved successfully.
   *
   * Cell orientation is reported separately rather than forced.
   */
  useEffect(() => {
    if (
      process.env.NODE_ENV !==
        "development" ||
      typeof window ===
        "undefined"
    ) {
      return undefined;
    }


    const runInitialSolverState =
      () => {
        console.info(
          `[intrinsic-s3-initial:${activeManifold.id}] MANUAL START`
        );


        const result =
          createIntrinsicS3InitialSolverState({
            quotientMesh:
              intrinsicQuotientMesh,

            boundaryTargets:
              intrinsicS3BoundaryTargets,
          });


        intrinsicS3InitialSolverStateRef
          .current =
            result;


        console.info(
          `[intrinsic-s3-initial:${activeManifold.id}] ` +
            (
              result.ready
                ? "READY"
                : "FAIL"
            ),

          result.summary
        );


        return result;
      };


    const inspectInitialSolverState =
      () =>
        intrinsicS3InitialSolverStateRef
          .current;


    window
      .runFigureEightS3InitialSolverState =
        runInitialSolverState;

    window
      .inspectFigureEightS3InitialSolverState =
        inspectInitialSolverState;


    console.info(
      `[intrinsic-s3-initial:${activeManifold.id}] DEFERRED. ` +
        "Run runFigureEightS3InitialSolverState() " +
        "only when the baseline S³ diagnostic is needed."
    );


    return () => {
      if (
        window
          .runFigureEightS3InitialSolverState ===
        runInitialSolverState
      ) {
        delete window
          .runFigureEightS3InitialSolverState;
      }


      if (
        window
          .inspectFigureEightS3InitialSolverState ===
        inspectInitialSolverState
      ) {
        delete window
          .inspectFigureEightS3InitialSolverState;
      }
    };
  }, [
    activeManifold.id,
    intrinsicQuotientMesh,
    intrinsicS3BoundaryTargets,
  ]);



  /*
   * ============================================================
   * MANUAL SHARED-FACE BARYCENTRIC EXPERIMENT
   * ============================================================
   *
   * The normal page always keeps the validated 658-vertex baseline.
   *
   * The much larger shared-incidence experiment runs only when
   * explicitly requested from the development console, and it runs
   * inside a Web Worker so React/Fast Refresh never owns the expensive
   * topology + S³ solve.
   *
   * Console:
   *
   *   await runFigureEightSharedFaceExperiment()
   *   inspectFigureEightSharedFaceExperiment()
   *   cancelFigureEightSharedFaceExperiment()
   *
   * Topology-only smoke test:
   *
   *   await runFigureEightSharedFaceExperiment({
   *     solve: false
   *   })
   *
   * Shared-edge topology smoke test:
   *
   *   await runFigureEightSharedEdgeExperiment({
   *     solve: false
   *   })
   */
  useEffect(() => {
    if (
      process.env.NODE_ENV !==
        "development" ||
      typeof window ===
        "undefined"
    ) {
      return undefined;
    }


    let activeWorker =
      null;

    let activePromise =
      null;

    let activeReject =
      null;

    let lastResult =
      null;


    function terminateActiveWorker() {
      if (activeWorker) {
        activeWorker
          .terminate();

        activeWorker =
          null;
      }
    }


    const inspectExperiment =
      () =>
        lastResult ??
        window
          .figureEightSharedFaceExperiment ??
        null;


    const cancelExperiment =
      () => {
        if (!activeWorker) {
          return false;
        }


        terminateActiveWorker();


        const error =
          new Error(
            "Figure-eight shared-face experiment cancelled."
          );


        if (activeReject) {
          activeReject(
            error
          );
        }


        activeReject =
          null;

        activePromise =
          null;


        window
          .figureEightSharedFaceExperiment =
            {
              status:
                "cancelled",

              manifoldId:
                activeManifold.id,
            };


        console.warn(
          "[shared-face-experiment] CANCELLED"
        );


        return true;
      };


    const runExperiment =
      (
        options = {}
      ) => {
        if (activePromise) {
          console.info(
            "[shared-face-experiment] already running"
          );

          return activePromise;
        }


        const solve =
          options.solve !==
          false;


        const experimentKind =
          options.experimentKind ===
            "shared-edge"
            ? "shared-edge"
            : "shared-face";


        const projectiveOptions =
          options.projectiveOptions &&
          typeof options.projectiveOptions ===
            "object" &&
          !Array.isArray(
            options.projectiveOptions
          )
            ? {
                ...options.projectiveOptions,
              }
            : {};


        lastResult =
          null;


        window
          .figureEightSharedFaceExperiment =
            {
              status:
                "starting",

              manifoldId:
                activeManifold.id,

              solve,

              projectiveOptions,
            };


        console.info(
          "[shared-face-experiment] START",
          {
            manifoldId:
              activeManifold.id,

            solve,

            projectiveOptions,

            baselineQuotientVertexCount:
              intrinsicQuotientMesh
                .summary
                .quotientVertexCount,

            baselineQuotientCellCount:
              intrinsicQuotientMesh
                .summary
                .quotientCellCount,
          }
        );


        activeWorker =
          new Worker(
            new URL(
              "./intrinsicSharedFaceExperiment.worker.js",
              import.meta.url
            ),
            {
              type:
                "module",
            }
          );


        activePromise =
          new Promise(
            (
              resolve,
              reject
            ) => {
              activeReject =
                reject;


              activeWorker
                .onmessage =
                  (
                    event
                  ) => {
                    const message =
                      event.data ??
                      {};


                    if (
                      message.type ===
                      "shared-face-experiment-stage"
                    ) {
                      window
                        .figureEightSharedFaceExperiment =
                          {
                            status:
                              message.stage,

                            manifoldId:
                              activeManifold.id,

                            solve,

                            projectiveOptions,

                            topology:
                              message.topology ??
                              null,

                            boundarySummary:
                              message
                                .boundarySummary ??
                              null,

                            solverSummary:
                              message
                                .solverSummary ??
                              null,
                          };


                      console.info(
                        `[shared-face-experiment] ` +
                          `${message.stage}`,

                        message.topology ??
                        message.boundarySummary ??
                        message.solverSummary ??
                        ""
                      );


                      return;
                    }


                    if (
                      message.type ===
                      "shared-face-experiment-error"
                    ) {
                      const workerError =
                        new Error(
                          message.error
                            ?.message ??
                          "Shared-face worker failed."
                        );


                      if (
                        message.error
                          ?.stack
                      ) {
                        workerError.stack =
                          message.error
                            .stack;
                      }


                      window
                        .figureEightSharedFaceExperiment =
                          {
                            status:
                              "error",

                            manifoldId:
                              activeManifold.id,

                            error:
                              message.error,
                          };


                      console.error(
                        "[shared-face-experiment] ERROR",
                        message.error
                      );


                      reject(
                        workerError
                      );

                      return;
                    }


                    if (
                      message.type !==
                      "shared-face-experiment-result"
                    ) {
                      return;
                    }


                    lastResult =
                      message.result;


                    window
                      .figureEightSharedFaceExperiment =
                        {
                          status:
                            "complete",

                          manifoldId:
                            activeManifold.id,

                          result:
                            lastResult,
                        };


                    console.info(
                      "[shared-face-experiment] COMPLETE",
                      {
                        solved:
                          lastResult
                            ?.solved,

                        topology:
                          lastResult
                            ?.topology
                            ?.summary,

                        projective:
                          lastResult
                            ?.solver
                            ?.projectiveTransitionSurface
                            ?.summary,
                      }
                    );


                    resolve(
                      lastResult
                    );
                  };


              activeWorker
                .onerror =
                  (
                    event
                  ) => {
                    const workerError =
                      new Error(
                        event.message ??
                        "Shared-face worker crashed."
                      );


                    window
                      .figureEightSharedFaceExperiment =
                        {
                          status:
                            "error",

                          manifoldId:
                            activeManifold.id,

                          error: {
                            message:
                              workerError.message,
                          },
                        };


                    console.error(
                      "[shared-face-experiment] WORKER ERROR",
                      event
                    );


                    reject(
                      workerError
                    );
                  };


              activeWorker
                .postMessage({
                  type:
                    "run-shared-face-experiment",

                  solve,

                  experimentKind,

                  projectiveOptions,

                  quotientMesh:
                    intrinsicQuotientMesh,

                  boundaryTargets:
                    intrinsicS3BoundaryTargets,
                });
            }
          )
          .finally(
            () => {
              terminateActiveWorker();

              activeReject =
                null;

              activePromise =
                null;
            }
          );


        return activePromise;
      };


    const runSharedEdgeExperiment =
      (
        options = {}
      ) =>
        runExperiment({
          ...options,

          experimentKind:
            "shared-edge",
        });


    window
      .runFigureEightSharedFaceExperiment =
        runExperiment;

    window
      .runFigureEightSharedEdgeExperiment =
        runSharedEdgeExperiment;

    window
      .inspectFigureEightSharedFaceExperiment =
        inspectExperiment;

    window
      .inspectFigureEightSharedEdgeExperiment =
        inspectExperiment;

    window
      .cancelFigureEightSharedFaceExperiment =
        cancelExperiment;

    window
      .cancelFigureEightSharedEdgeExperiment =
        cancelExperiment;


    console.info(
      "[shared-face-experiment] ready. " +
        "Run await runFigureEightSharedFaceExperiment({ solve: false }) " +
        "for the topology smoke test, then " +
        "await runFigureEightSharedFaceExperiment() for the worker S³ solve. " +
        "Shared-edge smoke test: await runFigureEightSharedEdgeExperiment({ solve: false })."
    );


    return () => {
      terminateActiveWorker();


      if (
        window
          .runFigureEightSharedFaceExperiment ===
        runExperiment
      ) {
        delete window
          .runFigureEightSharedFaceExperiment;
      }


      if (
        window
          .runFigureEightSharedEdgeExperiment ===
        runSharedEdgeExperiment
      ) {
        delete window
          .runFigureEightSharedEdgeExperiment;
      }


      if (
        window
          .inspectFigureEightSharedFaceExperiment ===
        inspectExperiment
      ) {
        delete window
          .inspectFigureEightSharedFaceExperiment;
      }


      if (
        window
          .inspectFigureEightSharedEdgeExperiment ===
        inspectExperiment
      ) {
        delete window
          .inspectFigureEightSharedEdgeExperiment;
      }


      if (
        window
          .cancelFigureEightSharedFaceExperiment ===
        cancelExperiment
      ) {
        delete window
          .cancelFigureEightSharedFaceExperiment;
      }


      if (
        window
          .cancelFigureEightSharedEdgeExperiment ===
        cancelExperiment
      ) {
        delete window
          .cancelFigureEightSharedEdgeExperiment;
      }
    };
  }, [
    activeManifold.id,
    intrinsicQuotientMesh,
    intrinsicS3BoundaryTargets,
  ]);


  /*
   * Development console checkpoint for the actual quotient mesh.
   */
  useEffect(() => {
    if (
      process.env.NODE_ENV !==
        "development" ||
      typeof window ===
        "undefined"
    ) {
      return undefined;
    }

    const inspectIntrinsicQuotient =
      () =>
        intrinsicQuotientMesh;

    window
      .inspectFigureEightIntrinsicQuotient =
        inspectIntrinsicQuotient;

    console.info(
      `[intrinsic-quotient:${activeManifold.id}] ` +
        (
          intrinsicQuotientMesh.valid
            ? "PASS"
            : "FAIL"
        ),
      intrinsicQuotientMesh.summary
    );

    return () => {
      if (
        window
          .inspectFigureEightIntrinsicQuotient ===
        inspectIntrinsicQuotient
      ) {
        delete window
          .inspectFigureEightIntrinsicQuotient;
      }
    };
  }, [
    activeManifold.id,
    intrinsicQuotientMesh,
  ]);

  /*
   * Development diagnostic.
   *
   * Open the browser console and run:
   *
   *   inspectFigureEightIntrinsicVolume()
   *
   * Nothing is drawn yet. This is deliberately a mathematical
   * integrity checkpoint before we construct any ambient map.
   */
  useEffect(() => {
    if (
      process.env.NODE_ENV !==
        "development" ||
      typeof window ===
        "undefined"
    ) {
      return undefined;
    }

    const inspectIntrinsicVolume =
      () =>
        intrinsicVolumeDiagnostics;

    window
      .inspectFigureEightIntrinsicVolume =
        inspectIntrinsicVolume;

    console.info(
      `[intrinsic-volume:${activeManifold.id}] ` +
        (
          intrinsicVolumeDiagnostics
            .valid
            ? "PASS"
            : "FAIL"
        ),
      intrinsicVolumeDiagnostics
    );

    return () => {
      if (
        window
          .inspectFigureEightIntrinsicVolume ===
        inspectIntrinsicVolume
      ) {
        delete window
          .inspectFigureEightIntrinsicVolume;
      }
    };
  }, [
    activeManifold.id,
    intrinsicVolumeDiagnostics,
  ]);

  useEffect(() => {
    if (
      process.env.NODE_ENV !==
        "development" ||
      typeof window ===
        "undefined"
    ) {
      return undefined;
    }

    const showHelper = () =>
      setShowIntrinsicVolumeDebug(
        true
      );

    const hideHelper = () =>
      setShowIntrinsicVolumeDebug(
        false
      );

    const toggleHelper = () =>
      setShowIntrinsicVolumeDebug(
        (current) => !current
      );

    const inspectGeometryHelper =
      () =>
        intrinsicVolumeDebugGeometry;

    window
      .showFigureEightIntrinsicVolume =
        showHelper;

    window
      .hideFigureEightIntrinsicVolume =
        hideHelper;

    window
      .toggleFigureEightIntrinsicVolume =
        toggleHelper;

    window
      .inspectFigureEightIntrinsicVolumeGeometry =
        inspectGeometryHelper;

    console.info(
      `[intrinsic-volume:${activeManifold.id}] ` +
        `run showFigureEightIntrinsicVolume() ` +
        `to render the hidden intrinsic volume overlay.`
    );

    return () => {
      if (
        window
          .showFigureEightIntrinsicVolume ===
        showHelper
      ) {
        delete window
          .showFigureEightIntrinsicVolume;
      }

      if (
        window
          .hideFigureEightIntrinsicVolume ===
        hideHelper
      ) {
        delete window
          .hideFigureEightIntrinsicVolume;
      }

      if (
        window
          .toggleFigureEightIntrinsicVolume ===
        toggleHelper
      ) {
        delete window
          .toggleFigureEightIntrinsicVolume;
      }

      if (
        window
          .inspectFigureEightIntrinsicVolumeGeometry ===
        inspectGeometryHelper
      ) {
        delete window
          .inspectFigureEightIntrinsicVolumeGeometry;
      }
    };
  }, [
    activeManifold.id,
    intrinsicVolumeDebugGeometry,
  ]);

  useEffect(() => {
    if (
      process.env.NODE_ENV !==
        "development" ||
      typeof window ===
        "undefined"
    ) {
      return undefined;
    }

    const showHelper = () => {
      /*
       * The two diagnostics answer different questions.
       * Keep the screen clean when showing the boundary map.
       */
      setShowIntrinsicVolumeDebug(
        false
      );

      setShowIntrinsicBoundaryCorrespondence(
        true
      );
    };

    const hideHelper = () =>
      setShowIntrinsicBoundaryCorrespondence(
        false
      );

    const toggleHelper = () =>
      setShowIntrinsicBoundaryCorrespondence(
        (current) => !current
      );

    const inspectHelper = () =>
      intrinsicBoundaryCorrespondence;

    window
      .showFigureEightBoundaryCorrespondence =
        showHelper;

    window
      .hideFigureEightBoundaryCorrespondence =
        hideHelper;

    window
      .toggleFigureEightBoundaryCorrespondence =
        toggleHelper;

    window
      .inspectFigureEightBoundaryCorrespondence =
        inspectHelper;

    console.info(
      `[intrinsic-boundary:${activeManifold.id}] ` +
        (
          intrinsicBoundaryCorrespondence
            .valid
            ? "PASS"
            : "FAIL"
        ) +
        ". Run " +
        "showFigureEightBoundaryCorrespondence() " +
        "to compare source cusp triangles with " +
        "the exact Projection Lab torus target."
    );

    return () => {
      if (
        window
          .showFigureEightBoundaryCorrespondence ===
        showHelper
      ) {
        delete window
          .showFigureEightBoundaryCorrespondence;
      }

      if (
        window
          .hideFigureEightBoundaryCorrespondence ===
        hideHelper
      ) {
        delete window
          .hideFigureEightBoundaryCorrespondence;
      }

      if (
        window
          .toggleFigureEightBoundaryCorrespondence ===
        toggleHelper
      ) {
        delete window
          .toggleFigureEightBoundaryCorrespondence;
      }

      if (
        window
          .inspectFigureEightBoundaryCorrespondence ===
        inspectHelper
      ) {
        delete window
          .inspectFigureEightBoundaryCorrespondence;
      }
    };
  }, [
    activeManifold.id,
    intrinsicBoundaryCorrespondence,
  ]);

  const facePairMappingTransitionRef =
    useRef({
      targetKey:
        facePairMappingTargetKey,
      startTurns: [
        ...animatedFacePairMappings,
      ],
      targetTurns: [
        ...animatedFacePairMappings,
      ],
    });

  const facePairMappingsSettled =
    normalizedFacePairMappingTargets.every(
      (target, pairId) =>
        settledCyclicMappingIndex(
          animatedFacePairMappings[
            pairId
          ] ?? 0
        ) === target
    );

  if (
    facePairMappingTransitionRef
      .current.targetKey !==
    facePairMappingTargetKey
  ) {
    facePairMappingTransitionRef.current = {
      targetKey:
        facePairMappingTargetKey,
      startTurns: [
        ...animatedFacePairMappings,
      ],
      targetTurns:
        normalizedFacePairMappingTargets.map(
          (target, pairId) =>
            nearestEquivalentMappingTurn(
              animatedFacePairMappings[
                pairId
              ] ?? 0,
              target
            )
        ),
    };
  } else if (facePairMappingsSettled) {
    facePairMappingTransitionRef
      .current.startTurns = [
        ...animatedFacePairMappings,
      ];

    facePairMappingTransitionRef
      .current.targetTurns = [
        ...animatedFacePairMappings,
      ];
  }

  if (
    facePairMappingsSettled &&
    animatedBridgeRouteSpecKey ===
      currentBridgeRouteTargetKey
  ) {
    bridgeRouteTransitionRef
      .current.startSpecs =
        animatedBridgeRouteSpecs.map(
          (routeSpec) =>
            routeSpec === null
              ? null
              : { ...routeSpec }
        );
  }

  const pairingProgress =
    selectedPairId === null
      ? 0
      : facePairStrengths[
          selectedPairId
        ];

  /*
   * Extension and planar assembly are distinct stages.
   * cuspAssemblyProgress retains its historical name because it drives
   * the existing 177-unit collar extension.  The new domain progress
   * moves those already-extended outer triangles into CUSP_FLAT_LAYOUT.
   */
  const cuspAssemblyProgress =
    useAnimatedAssembly(
      showCuspTriangles &&
      extendCusp
    );

  const cuspDomainAssemblyProgress =
    useAnimatedAssembly(
      showCuspTriangles &&
      extendCusp &&
      assembleCusp,
      CUSP_DOMAIN_ASSEMBLY_DURATION_MS
    );

  /*
   * Preserve which peripheral direction was selected first.
   *
   * That first direction owns the short cylinder-forming
   * animation. The other direction owns the slower figure-eight
   * weave, even while Undo is running.
   */
  const cuspFirstBoundaryRef =
    useRef(null);

  useEffect(() => {
    if (cuspWrapOrder.length > 0) {
      cuspFirstBoundaryRef.current =
        cuspWrapOrder[0];
    }
  }, [cuspWrapOrder]);

  const firstBoundaryForTiming =
    cuspWrapOrder[0] ??
    cuspFirstBoundaryRef.current;


  const shortWrapClockProgress =
    useAnimatedAssembly(
      showCuspTriangles &&
      extendCusp &&
      assembleCusp &&
      cuspWrapOrder.includes(
        "short"
      ),
      firstBoundaryForTiming === "short"
        ? CUSP_FIRST_WRAP_DURATION_MS
        : CUSP_WRAP_DURATION_MS,
      "linear"
    );

  const longWrapClockProgress =
    useAnimatedAssembly(
      showCuspTriangles &&
      extendCusp &&
      assembleCusp &&
      cuspWrapOrder.includes(
        "long"
      ),
      firstBoundaryForTiming === "long"
        ? CUSP_FIRST_WRAP_DURATION_MS
        : CUSP_WRAP_DURATION_MS,
      "linear"
    );

  /*
   * The first selected boundary pauses visibly before moving.
   *
   * The second selected boundary goes directly into the existing
   * 12-second figure-eight weave without this hold.
   */
  const shortWrapProgress =
    firstBoundaryForTiming === "short"
      ? firstPeripheralWrapGeometryProgress(
          shortWrapClockProgress
        )
      : shortWrapClockProgress;

  const longWrapProgress =
    firstBoundaryForTiming === "long"
      ? firstPeripheralWrapGeometryProgress(
          longWrapClockProgress
        )
      : longWrapClockProgress;

  const cuspWrapProgress =
    Math.max(
      shortWrapProgress,
      longWrapProgress
    );


  const knotViewProgress =
    useAnimatedAssembly(
      showCuspTriangles &&
      extendCusp &&
      assembleCusp &&
      cuspWrapOrder.length === 2 &&
      knotViewActive,
      KNOT_VIEW_DURATION_MS
    );


  const cuspFirstBoundary =
    cuspWrapOrder[0] ??
    cuspFirstBoundaryRef.current ??
    (
      shortWrapProgress >
      longWrapProgress
        ? "short"
        : "long"
    );

  const cuspWrapCertificationRef =
    useRef({
      key: null,
      acceptedStage: 0,
    });

  const rendered = useMemo(() => {
    const faces = [];
    const labels = [];
    const callouts = [];
    const cuspEdgeMatches = [];
    const cuspMeshFaces = [];
    const cuspTriangleOutlines = [];
    const cuspFlightSourceTriangles = [];
    const canonicalABInterfaceFaces = [];
    const canonicalABColorBoundaryLines = [];

    const menascoPlaneFaces = [];
    const menascoCrossingLines = [];
    const menascoBubblePaths = [];
    const menascoRegionFaces = [];
    const menascoRegionOutlines = [];
    const menascoLabels = [];
    const menascoBallShellFaces = [];
    const menascoBallAutoFitPoints = [];
    let menascoBallAudit = null;
    let menascoCorePath = "";
    let menascoCrossingCount = 0;
    let menascoRegionCount = 0;
    let menascoTriangleRegionCount = 0;
    let menascoBigonRegionCount = 0;
    let menascoBallProgress = 0;
    let menascoStatusAnchor = {
      x: 20,
      y: 28,
    };
    let menascoValid = false;
    let menascoRegionsValid = false;

    const intrinsicVolumeDebugLines = [];
    const intrinsicVolumeDebugPoints = [];
    const intrinsicBoundaryCorrespondenceTriangles = [];

    let constructiveVolumeActive =
      false;

    let constructiveVolumePath =
      "";

    let constructiveVolumeBoundaryPath =
      "";

    const constructiveVolumeAutoFitPoints =
      [];

    const constructiveVolumeBoundaryAutoFitPoints =
      [];

    let constructiveVolumeInternalEdgeCount =
      0;


    /*
     * Before the completed m004 cusp is available, Interior mode
     * retains the constructor bridge mesh. Once the exact knotted
     * boundary exists, the authoritative constructive volume takes
     * over below.
     * No separate screen-space continuation geometry is
     * constructed here.
     */

    let knotMeridianPolyline = [];
    let knotLongitudePolyline = [];
    let knotCycleIntersectionPoint = null;
    let knotCycleClosureError = Infinity;
    let knotCycleOpacity = 0;

    /*
     * Meridian and Longitude form one two-stage boundary path.
     * The raw controls request a stage in [0, 2]. The collision
     * certification below may replace it with the last embedded
     * stage before the geometry is rendered.
     */
    let cuspBoundaryStage =
      Math.max(
        0,
        Math.min(
          2,
          clampUnit(shortWrapProgress) +
            clampUnit(longWrapProgress)
        )
      );


    let cuspBoundaryAssemblyProgress;
    let cuspOverviewProgress;
    let displayView;
    let cuspAssemblyTargetCenter;
    let cuspBoundaryTargetCenter;
    let knotViewBlendAmount;
    let knotEmbeddingProgress;
    let knotProjectionProgress;
    let knotConstructionOpacity;
    let knotMappingAuditProgress;

    function refreshCuspBoundaryStage() {
      /*
       * The overview begins during the explicit planar-assembly stage,
       * before either peripheral boundary is identified.  Once assembled,
       * the same eight triangles remain fully attached while stage 1 rolls
       * the flat domain into the first cylinder and stage 2 closes it onto
       * the knotted tube.
       */
      cuspBoundaryAssemblyProgress =
        Math.max(
          cuspDomainAssemblyProgress,
          clampUnit(cuspBoundaryStage)
        );

      cuspOverviewProgress =
        smoothStep(
          cuspBoundaryAssemblyProgress
        );

      /*
       * Any manifold whose peripheral construction is enabled follows
       * the second-stage material deformation.
       *
       * Stage 1:
       *   assembled cusp -> cylinder
       *
       * Stage 2:
       *   cylinder -> shared figure-eight tube
       *
       * The manifold-specific cusp coordinates determine how its eight
       * material triangles wind across that common tube.
       */
      const nextKnotEmbeddingProgress =
        activeManifold
          .peripheralAvailable !== false
          ? clampUnit(
              cuspBoundaryStage - 1
            )
          : 0;

      /*
       * Keep the camera neutral while the knot is being woven.
       *
       * Dynamic Auto Fit already follows the changing bounds.
       * A separate 3x push-in here obscured the deformation and
       * made the end of the animation look like camera motion.
       */
      const cuspDisplayZoom =
        CUSP_BOUNDARY_OVERVIEW_ZOOM;

      displayView =
        cuspOverviewProgress >
        FACE_CONSTRAINT_EPSILON
          ? {
              ...view,
              zoom:
                view.zoom *
                (
                  1 +
                  (
                    cuspDisplayZoom -
                    1
                  ) *
                    cuspOverviewProgress
                ),
              perspectiveDistance:
                DEFAULT_PERSPECTIVE_DISTANCE *
                (
                  1 +
                  (
                    CUSP_BOUNDARY_WORLD_SCALE -
                    1
                  ) *
                    cuspOverviewProgress
                ),
            }
          : view;

      /*
       * The second peripheral identification closes the first-wrap
       * cylinder directly as the boundary of a tubular neighborhood of
       * the figure-eight knot. Do not pass through an arbitrary round
       * doughnut embedding in R^3: that shape is not part of the cusp
       * geometry. Knot view is reserved for changing the stereographic
       * viewpoint of the already-knotted boundary.
       */
      /*
       * The second peripheral identification has one geometric job:
       *
       *   first-wrap cylinder
       *       -> compact figure-eight tubular boundary in S3
       *
       * Use the complete second-stage interval for that deformation.
       *
       * Stereographic projection is a separate operation that follows
       * the completed peripheral identifications. Do not move the
       * projection pole while Meridian or Longitude is being identified.
       */
      const knotClosureProgress =
        nextKnotEmbeddingProgress;

      knotEmbeddingProgress =
        activeManifold
          .peripheralAvailable !== false
          ? knotClosureProgress
          : 0;

      /*
       * After both peripheral identifications are complete, the explicit
       * Projection control drives the already-existing shared Projection
       * Lab path.
       *
       * The material triangulation does not change. Only the SO(4)
       * orientation relative to the stereographic pole changes from
       * Standard toward Symmetric.
       */
      knotViewBlendAmount =
        knotViewProgress;

      knotProjectionProgress =
        knotViewProgress;

      /*
       * Keep centering synchronized with the actual visible material
       * deformation.
       *
       * Stage 0 -> 1:
       *   planar domain -> first-wrap cylinder
       *
       * Stage 1 -> 2:
       *   cylinder -> exact shared figure-eight S3 tube
       *
       * The complete second control motion is now devoted to this S3
       * embedding. Stereographic projection begins only in a later,
       * explicit stage.
       */
      const visibleCuspGeometryStage =
        activeManifold
          .peripheralAvailable !== false &&
        cuspBoundaryStage > 1
          ? 1 +
            knotEmbeddingProgress
          : cuspBoundaryStage;

      cuspAssemblyTargetCenter =
        cuspBoundaryAssemblyProgress >
        FACE_CONSTRAINT_EPSILON
          ? cuspAssemblyTargetCenterFromStage(
              cuspFirstBoundary,
              visibleCuspGeometryStage,
              activeCuspCoordinateSpec
            )
          : { x: 0, y: 0, z: 0 };

      /*
       * Once the connected cusp surface begins bending into the knotted
       * tube, let the compact-cell construction scaffold recede. The
       * material cusp surface remains fully visible; the original cells,
       * bridges, cusp bases, edge marks, and attachment collars remain as
       * a faint provenance layer rather than obscuring the S3 tube.
       */
      /*
       * Keep the developed cusp strip at full visual strength through
       * Cusp triangles -> Extend -> Assemble for both manifolds.
       *
       * Only m004's later cylinder-to-knotted-S3-tube deformation
       * transfers visual ownership away from the construction scaffold.
       * m003 currently stops at the assembled strip, so no Sister-specific
       * opacity fade belongs here.
       */
      const constructionScaffoldFade =
        smootherUnitInterval(
          clampUnit(
            (knotEmbeddingProgress - 0.08) /
              0.82
          )
        );

      knotConstructionOpacity =
        1 -
        0.88 * constructionScaffoldFade;

      /*
       * As the old quotient construction disappears, strengthen the
       * actual cusp triangulation. This is a mapping audit: the same
       * eight cusp triangles and their true shared edges remain visible
       * on the stereographically projected boundary surface.
       */
      knotMappingAuditProgress =
        smootherUnitInterval(
          clampUnit(
            (knotEmbeddingProgress - 0.28) /
              0.52
          )
        );

      /*
       * The reference projection is fit and centered in model space at
       * every stereographic viewpoint. Recenter the construction only
       * as the actual cusp boundary enters that reference embedding.
       */
      cuspBoundaryTargetCenter =
        lerpPoint(
          cuspAssemblyTargetCenter,
          { x: 0, y: 0, z: 0 },
          knotEmbeddingProgress
        );
    }

    refreshCuspBoundaryStage();

    /*
     * OPENING CELLS PRESENTATION
     *
     * The two separated cells are shown orthographically.
     *
     * This makes each regular tetrahedron read correctly on screen:
     *
     *   A:
     *       outer equilateral triangle
     *       front vertex exactly at its center
     *       three equal visible color wedges
     *
     *   B:
     *       same colored tetrahedron from the opposite side
     *       Orange is the complete nearest face
     *
     * Once an identification starts, ordinary perspective returns.
     */
    const openingCellsPresentation =
      !showCuspTriangles &&
      facePairSequence.length === 0 &&
      resolvedCollapsedBridgePairIds.length === 0;

    if (openingCellsPresentation) {
      displayView = {
        ...displayView,

        /*
         * Effectively orthographic while retaining the existing
         * projection function and all current rotation controls.
         */
        perspectiveDistance: 1e12,
      };
    }

    /*
     * Menasco requires a generic knot diagram with the actual four
     * figure-eight crossings. The current Standard stereographic view
     * has extra diagram self-crossings, while the fixed midpoint on the
     * already-defined Standard -> Symmetric SO(4) projection path has
     * exactly four. Move the ENTIRE existing S3 realization to that
     * viewpoint first; this changes only the projection, never the knot
     * or constructive volume topology.
     */
    const menascoPresentationActive =
      menascoInspectionActive ||
      menascoThreeBallsVisible;

    const menascoProjectionSettleProgress =
      menascoThreeBallsVisible
        ? 1
        : menascoInspectionActive
          ? smootherUnitInterval(
              clampUnit(
                menascoInspectionProgress /
                  0.24
              )
            )
          : 0;

    const effectiveKnotProjectionProgress =
      menascoPresentationActive
        ? knotProjectionProgress +
          (
            MENASCO_DIAGRAM_PROJECTION_PROGRESS -
            knotProjectionProgress
          ) *
            menascoProjectionSettleProgress
        : knotProjectionProgress;

    if (
      menascoPresentationActive &&
      activeManifold.id === "m004" &&
      menascoProjectionSettleProgress >=
        1 - FACE_CONSTRAINT_EPSILON
    ) {
      const menasco =
        buildFigureEightMenascoDiagram(
          MENASCO_DIAGRAM_PROJECTION_PROGRESS
        );

      menascoCrossingCount =
        menasco.crossingCount;

      const menascoRegions =
        buildFigureEightMenascoRegions(
          menasco,
          MENASCO_DIAGRAM_PROJECTION_PROGRESS
        );

      menascoRegionCount =
        menascoRegions
          .regions
          .length;

      menascoTriangleRegionCount =
        menascoRegions
          .triangleCount;

      menascoBigonRegionCount =
        menascoRegions
          .bigonCount;

      menascoRegionsValid =
        menascoRegions.valid;

      menascoValid =
        menasco.valid &&
        menascoRegions.valid;

      const diagramProgress =
        menascoThreeBallsVisible
          ? 1
          : smootherUnitInterval(
              clampUnit(
                (
                  menascoInspectionProgress -
                  0.24
                ) / 0.34
              )
            );

      const bubbleProgress =
        menascoThreeBallsVisible
          ? 1
          : smootherUnitInterval(
              clampUnit(
                (
                  menascoInspectionProgress -
                  0.42
                ) / 0.30
              )
            );

      const regionProgress =
        menascoThreeBallsVisible
          ? 0
          : smootherUnitInterval(
              clampUnit(
                (
                  menascoInspectionProgress -
                  0.50
                ) / 0.20
              )
            );

      const bigonCollapseProgress =
        menascoThreeBallsVisible
          ? 1
          : smootherUnitInterval(
              clampUnit(
                (
                  menascoInspectionProgress -
                  0.70
                ) / 0.18
              )
            );

      const ballProgress =
        menascoThreeBallsVisible
          ? 1
          : smootherUnitInterval(
              clampUnit(
                (
                  menascoInspectionProgress -
                  0.88
                ) / 0.12
              )
            );

      menascoBallProgress =
        ballProgress;

      const projectedCore =
        menasco.samples.map(
          (sample) => {
            const modelPoint =
              menascoLerpModelPoint(
                sample.point,
                sample.targetPoint,
                diagramProgress
              );

            return projectPoint(
              modelPoint,
              displayView
            );
          }
        );

      menascoCorePath =
        projectedCore
          .map(
            (point, index) =>
              `${
                index === 0 ? "M" : "L"
              }${point.x.toFixed(2)},${point.y.toFixed(2)}`
          )
          .join(" ") +
        (projectedCore.length > 0
          ? " Z"
          : "");

      const pad =
        menasco.bounds.extent * 0.12;

      const planeCorners = [
        {
          x: menasco.bounds.minX - pad,
          y: menasco.bounds.minY - pad,
          z: menasco.planeZ,
        },
        {
          x: menasco.bounds.maxX + pad,
          y: menasco.bounds.minY - pad,
          z: menasco.planeZ,
        },
        {
          x: menasco.bounds.maxX + pad,
          y: menasco.bounds.maxY + pad,
          z: menasco.planeZ,
        },
        {
          x: menasco.bounds.minX - pad,
          y: menasco.bounds.maxY + pad,
          z: menasco.planeZ,
        },
      ];

      const projectedPlaneCorners =
        planeCorners.map(
          (point) =>
            projectPoint(
              point,
              displayView
            )
        );

      menascoStatusAnchor = {
        x:
          Math.min(
            ...projectedPlaneCorners.map(
              (point) => point.x
            )
          ) +
          14,
        y:
          Math.min(
            ...projectedPlaneCorners.map(
              (point) => point.y
            )
          ) +
          22,
      };

      if (menascoThreeBallsVisible) {
        const presentation =
          buildMenascoThreeBallPresentation({
            menasco,
            regions: menascoRegions,
          });

        menascoBallAudit =
          presentation.audit;

        presentation.points.forEach(
          (point) => {
            menascoBallAutoFitPoints.push(
              projectPoint(
                point,
                displayView
              )
            );
          }
        );

        presentation.faces.forEach(
          (face) => {
            const projected =
              face.points.map(
                (point) =>
                  projectPoint(
                    point,
                    displayView
                  )
              );

            menascoBallShellFaces.push({
              ...face,

              projected,

              depth:
                projected.reduce(
                  (sum, point) =>
                    sum +
                    point.depth /
                      projected.length,
                  0
                ),
            });
          }
        );

        menascoBallShellFaces.sort(
          (first, second) =>
            second.depth -
            first.depth
        );

        menascoValid =
          menascoValid &&
          presentation.valid;
      }

      if (
        regionProgress <
        1 - FACE_CONSTRAINT_EPSILON
      ) {
        menascoPlaneFaces.push({
          key: "menasco-projection-sphere-plane",
          projected:
            projectedPlaneCorners,
          opacity:
            0.022 *
            (
              1 -
              regionProgress
            ),
        });
      }

      let triangleOrdinal = 0;
      let bigonOrdinal = 0;

      menascoRegions
        .regions
        .forEach(
          (region) => {
            const projected =
              region.points.map(
                (point) =>
                  projectPoint(
                    point,
                    displayView
                  )
              );

            const labelProjected =
              projectPoint(
                region.centroid,
                displayView
              );

            if (region.bigon) {
              bigonOrdinal += 1;
            } else if (
              region.triangle
            ) {
              triangleOrdinal += 1;
            }

            const collapseVisibility =
              region.bigon
                ? (
                    1 -
                    bigonCollapseProgress
                  )
                : 1;

            const faceOpacity =
              region.bigon
                ? (
                    region.outer
                      ? 0
                      : 0.14 *
                        regionProgress *
                        collapseVisibility
                  )
                : 0.28 *
                  regionProgress;

            if (
              faceOpacity >
              FACE_CONSTRAINT_EPSILON
            ) {
              menascoRegionFaces.push({
                key:
                  `${region.key}-face`,
                projected,
                fill:
                  region.bigon
                    ? "rgba(180, 180, 180, 1)"
                    : "rgba(236, 211, 114, 1)",
                opacity:
                  faceOpacity,
              });
            }

            const outlineOpacity =
              regionProgress *
              (
                region.bigon
                  ? collapseVisibility
                  : 1
              );

            if (
              outlineOpacity >
              FACE_CONSTRAINT_EPSILON
            ) {
              menascoRegionOutlines.push({
                key:
                  `${region.key}-outline`,
                projected,
                bigon:
                  region.bigon,
                outer:
                  region.outer,
                opacity:
                  0.86 *
                  outlineOpacity,
              });

              menascoLabels.push({
                key:
                  `${region.key}-label`,
                text:
                  region.bigon
                    ? (
                        region.outer
                          ? "bigon through infinity"
                          : `bigon ${bigonOrdinal}`
                      )
                    : `face ${triangleOrdinal}`,
                color:
                  region.bigon
                    ? "#d0d0d0"
                    : "#fff1b8",
                projected:
                  labelProjected,
                opacity:
                  Math.min(
                    1,
                    1.25 *
                    outlineOpacity
                  ),
                small:
                  true,
              });
            }
          }
        );

      menasco.crossings.forEach(
        (crossing, crossingIndex) => {
          const center = {
            x: crossing.x,
            y: crossing.y,
            z: menasco.planeZ,
          };

          const overProjected =
            projectPoint(
              menascoThreeBallsVisible
                ? {
                    x: crossing.x,
                    y: crossing.y,
                    z:
                      menasco.planeZ +
                      menasco.bubbleRadius,
                  }
                : crossing.overPoint,
              displayView
            );

          const underProjected =
            projectPoint(
              menascoThreeBallsVisible
                ? {
                    x: crossing.x,
                    y: crossing.y,
                    z:
                      menasco.planeZ -
                      menasco.bubbleRadius,
                  }
                : crossing.underPoint,
              displayView
            );

          menascoCrossingLines.push({
            key:
              `menasco-crossing-edge-${crossingIndex}`,
            first: underProjected,
            second: overProjected,
            opacity:
              bubbleProgress,
          });

          [
            "xz",
            "yz",
          ].forEach(
            (ringKind) => {
              const ringPoints = [];

              for (
                let ringIndex = 0;
                ringIndex <= 48;
                ringIndex += 1
              ) {
                const angle =
                  ringIndex / 48 *
                  Math.PI * 2;

                const c =
                  Math.cos(angle);
                const q =
                  Math.sin(angle);

                const point =
                  ringKind === "xz"
                    ? {
                        x:
                          center.x +
                          menasco.bubbleRadius * c,
                        y: center.y,
                        z:
                          center.z +
                          menasco.bubbleRadius * q,
                      }
                    : {
                        x: center.x,
                        y:
                          center.y +
                          menasco.bubbleRadius * c,
                        z:
                          center.z +
                          menasco.bubbleRadius * q,
                      };

                ringPoints.push(
                  projectPoint(
                    point,
                    displayView
                  )
                );
              }

              menascoBubblePaths.push({
                key:
                  `menasco-bubble-${crossingIndex}-${ringKind}`,
                path:
                  ringPoints
                    .map(
                      (point, index) =>
                        `${
                          index === 0 ? "M" : "L"
                        }${point.x.toFixed(2)},${point.y.toFixed(2)}`
                    )
                    .join(" "),
                opacity:
                  (
                    menascoThreeBallsVisible
                      ? 0.20
                      : 0.62
                  ) *
                  bubbleProgress,
              });
            }
          );
        }
      );

    }


    if (
      canonicalABInterfaceDiagnostic
        ?.ready &&
      activeManifold.id === "m004"
    ) {
      canonicalABInterfaceDiagnostic
        .triangles
        .forEach(
          (triangle) => {
            const point4s =
              triangle
                .quotientVertexIndices
                .map(
                  (vertexIndex) =>
                    canonicalABInterfaceDiagnostic
                      .positions[
                        vertexIndex
                      ]
                );

            if (
              point4s.some(
                (point) =>
                  !point
              )
            ) {
              return;
            }

            const referencePoint4s =
              point4s.map(
                intrinsicSolverPoint4ToReferencePoint4
              );

            /*
             * Respect the genuine stereographic point at infinity.
             */
            if (
              effectiveKnotProjectionProgress >
                FACE_CONSTRAINT_EPSILON &&
              referencePoint4s.some(
                (point4) =>
                  Math.abs(
                    figureEightReferenceProjectionDenominator(
                      point4,
                      effectiveKnotProjectionProgress
                    )
                  ) <
                  FIGURE_EIGHT_PROJECTION_POLE_EPSILON
              )
            ) {
              return;
            }

            const modelPoints =
              referencePoint4s.map(
                (point4) =>
                  figureEightReferenceModelPoint(
                    point4,
                    effectiveKnotProjectionProgress
                  )
              );

            const projected =
              modelPoints.map(
                (point) =>
                  projectPoint(
                    point,
                    displayView
                  )
              );

            if (
              projected.some(
                (point) =>
                  !Number.isFinite(point.x) ||
                  !Number.isFinite(point.y) ||
                  !Number.isFinite(point.depth)
              )
            ) {
              return;
            }

            canonicalABInterfaceFaces.push({
              key:
                triangle.key,

              pairId:
                triangle.pairId,

              projected,

              depth:
                projected.reduce(
                  (sum, point) =>
                    sum + point.depth,
                  0
                ) /
                projected.length,
            });
          }
        );

      /*
       * SVG has no z-buffer.
       * Painter-order the sheet triangles back-to-front.
       */
      canonicalABInterfaceFaces.sort(
        (first, second) =>
          second.depth -
          first.depth
      );


      (
        canonicalABInterfaceDiagnostic
          .colorBoundaryEdges ??
        []
      ).forEach(
        (edge) => {
          const point4s =
            edge
              .quotientVertexIndices
              .map(
                (vertexIndex) =>
                  canonicalABInterfaceDiagnostic
                    .positions[
                      vertexIndex
                    ]
              );


          if (
            point4s.some(
              (point) =>
                !point
            )
          ) {
            return;
          }


          const referencePoint4s =
            point4s.map(
              intrinsicSolverPoint4ToReferencePoint4
            );


          if (
            effectiveKnotProjectionProgress >
              FACE_CONSTRAINT_EPSILON &&
            referencePoint4s.some(
              (point4) =>
                Math.abs(
                  figureEightReferenceProjectionDenominator(
                    point4,
                    effectiveKnotProjectionProgress
                  )
                ) <
                FIGURE_EIGHT_PROJECTION_POLE_EPSILON
            )
          ) {
            return;
          }


          const projected =
            referencePoint4s
              .map(
                (point4) =>
                  projectPoint(
                    figureEightReferenceModelPoint(
                      point4,
                      effectiveKnotProjectionProgress
                    ),

                    displayView
                  )
              );


          if (
            projected.some(
              (point) =>
                !Number.isFinite(
                  point.x
                ) ||
                !Number.isFinite(
                  point.y
                ) ||
                !Number.isFinite(
                  point.depth
                )
            )
          ) {
            return;
          }


          canonicalABColorBoundaryLines.push({
            key:
              edge.key,

            kind:
              edge.kind,

            pairIds:
              edge.pairIds,

            projected,

            depth:
              (
                projected[0].depth +
                projected[1].depth
              ) /
              2,
          });
        }
      );


      canonicalABColorBoundaryLines.sort(
        (first, second) =>
          second.depth -
          first.depth
      );
    }


    constructiveVolumeActive =
      Boolean(
        activeManifold.id ===
          "m004" &&
        intrinsicS3ConstructiveVolumeState
          ?.ready &&
        intrinsicS3ConstructiveInteriorEdges
          .length >
          0 &&
        (
          constructiveFinalDisplayActive ||
          menascoInspectionActive ||
          (
            showInterior &&
            knotEmbeddingProgress >=
              1 -
                FACE_CONSTRAINT_EPSILON
          )
        )
      );


    if (constructiveVolumeActive) {
      const pathParts =
        [];

      const vertices3 =
        intrinsicS3ConstructiveVolumeState
          .vertices3;

      function appendConstructiveEdgePath(
        edge,
        targetPathParts,
        autoFitTarget = null
      ) {
        const [
          firstVertexIndex,
          secondVertexIndex,
        ] =
          edge
            .quotientVertexIndices;

        const first =
          vertices3[
            firstVertexIndex
          ];

        const second =
          vertices3[
            secondVertexIndex
          ];

        if (
          !first ||
          !second
        ) {
          return;
        }

        for (
          let sampleIndex = 0;
          sampleIndex <=
            CONSTRUCTIVE_VOLUME_EDGE_SEGMENTS;
          sampleIndex += 1
        ) {
          const amount =
            sampleIndex /
            CONSTRUCTIVE_VOLUME_EDGE_SEGMENTS;

          const point3 = [
            first[0] +
              (
                second[0] -
                first[0]
              ) *
                amount,

            first[1] +
              (
                second[1] -
                first[1]
              ) *
                amount,

            first[2] +
              (
                second[2] -
                first[2]
              ) *
                amount,
          ];

          const modelPoint =
            constructiveVolumeModelPoint(
              point3,
              intrinsicS3ConstructiveVolumeState,
              effectiveKnotProjectionProgress
            );

          const projected =
            projectPoint(
              modelPoint,
              displayView
            );

          if (
            !Number.isFinite(
              projected.x
            ) ||
            !Number.isFinite(
              projected.y
            )
          ) {
            continue;
          }

          if (
            Array.isArray(autoFitTarget)
          ) {
            autoFitTarget.push(
              projected
            );
          }

          targetPathParts.push(
            `${
              sampleIndex === 0
                ? "M"
                : "L"
            }${projected.x.toFixed(2)},${projected.y.toFixed(2)}`
          );
        }
      }


      constructiveVolumeInternalEdgeCount =
        intrinsicS3ConstructiveInteriorEdges
          .length;


      intrinsicS3ConstructiveInteriorEdges
        .forEach(
          (edge) =>
            appendConstructiveEdgePath(
              edge,
              pathParts,
              constructiveVolumeAutoFitPoints
            )
        );


      constructiveVolumePath =
        pathParts.join(" ");

      /*
       * The completed display uses only the authoritative constructive
       * interior and the exact analytic cusp boundary.
       */
      if (
        constructiveFinalDisplayActive ||
        menascoInspectionActive
      ) {
        const boundaryPathParts =
          [];

        function appendAnalyticBoundaryCurve(
          point4AtAmount,
          sampleCount
        ) {
          let subpathOpen = false;

          for (
            let sampleIndex = 0;
            sampleIndex <=
              sampleCount;
            sampleIndex += 1
          ) {
            const amount =
              sampleIndex /
              sampleCount;

            const point4 =
              point4AtAmount(amount);

            /*
             * The later Projection control can move the
             * stereographic pole through the tube. Split the SVG
             * curve at that genuine point at infinity rather than
             * drawing an artificial line across the viewport.
             */
            if (
              effectiveKnotProjectionProgress >
                FACE_CONSTRAINT_EPSILON &&
              Math.abs(
                figureEightReferenceProjectionDenominator(
                  point4,
                  effectiveKnotProjectionProgress
                )
              ) <
                FIGURE_EIGHT_PROJECTION_POLE_EPSILON
            ) {
              subpathOpen = false;
              continue;
            }

            const modelPoint =
              figureEightReferenceModelPoint(
                point4,
                effectiveKnotProjectionProgress
              );

            const projected =
              projectPoint(
                modelPoint,
                displayView
              );

            if (
              !Number.isFinite(
                projected.x
              ) ||
              !Number.isFinite(
                projected.y
              )
            ) {
              subpathOpen = false;
              continue;
            }

            constructiveVolumeBoundaryAutoFitPoints
              .push(projected);

            boundaryPathParts.push(
              `${
                subpathOpen
                  ? "L"
                  : "M"
              }${projected.x.toFixed(2)},${projected.y.toFixed(2)}`
            );

            subpathOpen = true;
          }
        }

        /*
         * Longitudinal curves: fixed minor angle, one full trip
         * around the figure-eight route.
         */
        for (
          let minorIndex = 0;
          minorIndex <
            CERTIFIED_ENDPOINT_MINOR_GRID_COUNT;
          minorIndex += 1
        ) {
          const minorAngle =
            minorIndex /
              CERTIFIED_ENDPOINT_MINOR_GRID_COUNT *
            Math.PI *
            2;

          appendAnalyticBoundaryCurve(
            (routeAmount) =>
              figureEightReferenceTubePoint4(
                routeAmount,
                minorAngle
              ),
            CERTIFIED_ENDPOINT_ROUTE_CURVE_SAMPLES
          );
        }

        /*
         * Meridional curves: fixed route position, one full trip
         * around the tube cross-section.
         */
        for (
          let routeIndex = 0;
          routeIndex <
            CERTIFIED_ENDPOINT_ROUTE_GRID_COUNT;
          routeIndex += 1
        ) {
          const routeAmount =
            routeIndex /
            CERTIFIED_ENDPOINT_ROUTE_GRID_COUNT;

          appendAnalyticBoundaryCurve(
            (minorAmount) =>
              figureEightReferenceTubePoint4(
                routeAmount,
                minorAmount *
                  Math.PI *
                  2
              ),
            CERTIFIED_ENDPOINT_MINOR_CURVE_SAMPLES
          );
        }

        constructiveVolumeBoundaryPath =
          boundaryPathParts.join(" ");
      }
    }




    function cuspBoundaryTargetPoint(
      rawPoint
    ) {
      /*
       * One material point now follows one continuous geometric path.
       *
       * Before the second peripheral identification:
       *
       *   planar cusp -> first-wrap cylinder
       *
       * During the embedding portion of the second identification:
       *
       *   cylinder -> tube-preserving figure-eight deformation
       *
       * cuspModelPointFromStage() owns that entire path. Its stage-two
       * endpoint is exactly the same shared S3 tube used by Projection Lab.
       */
      const materialStage =
        activeManifold
          .peripheralAvailable !== false &&
        cuspBoundaryStage > 1
          ? 1 +
            knotEmbeddingProgress
          : cuspBoundaryStage;

      const materialPoint =
        cuspModelPointFromStage(
          rawPoint,
          cuspFirstBoundary,
          materialStage,
          activeCuspCoordinateSpec
        );

      /*
       * Until the S3 tube has been completely established, render the
       * tube-preserving material deformation directly. There is no
       * straight vertex-by-vertex interpolation to the final surface.
       */
      if (
        effectiveKnotProjectionProgress <=
        FACE_CONSTRAINT_EPSILON
      ) {
        return materialPoint;
      }

      /*
       * At this boundary the materialPoint is already the exact shared
       * Projection Lab tube at the Standard projection.
       *
       * From here forward the material coordinates stay fixed. Only the
       * shared SO(4) / stereographic projection changes from Standard
       * toward Symmetric.
       */
      return figureEightKnotBoundaryModelPoint(
        rawPoint,
        effectiveKnotProjectionProgress,
        activeCuspCoordinateSpec
      );
    }

    function attachedCuspTargetPoint(
      rawPoint
    ) {
      return multiplyPoint(
        subtractPoint(
          cuspBoundaryTargetPoint(
            rawPoint
          ),
          cuspBoundaryTargetCenter
        ),
        CUSP_BOUNDARY_WORLD_SCALE
      );
    }

    /*
     * Carry a canonical meridian/longitude basis through the exact same
     * cusp-boundary map as the eight colored triangles.  The raw v-cycle
     * carries two meridian turns, so the preferred longitude follows
     * u = 1/2 + 2v while the meridian keeps v fixed.  These representatives
     * close on the final torus and intersect once.
     */
    /*
     * Keep peripheral-cycle diagnostics out of the surface audit for now.
     * First verify that the eight source triangles themselves form the
     * smooth knotted torus; the meridian/longitude overlay can return
     * after that geometry is certified.
     */
    knotCycleOpacity = 0;

    if (
      showCuspTriangles &&
      knotCycleOpacity >
        FACE_CONSTRAINT_EPSILON
    ) {
      const cycleSamples = 192;

      const meridianStart =
        attachedCuspTargetPoint(
          cuspRawPointFromCoordinates(
            0,
            0.5
          )
        );

      const meridianEnd =
        attachedCuspTargetPoint(
          cuspRawPointFromCoordinates(
            1,
            0.5
          )
        );

      const longitudeStart =
        attachedCuspTargetPoint(
          cuspRawPointFromCoordinates(
            0.5,
            0
          )
        );

      const longitudeEnd =
        attachedCuspTargetPoint(
          cuspRawPointFromCoordinates(
            0.5 +
              FIGURE_EIGHT_CUSP_LONGITUDE_MERIDIAN_SHEAR,
            1
          )
        );

      knotCycleClosureError = Math.max(
        pointDistance(
          meridianStart,
          meridianEnd
        ),
        pointDistance(
          longitudeStart,
          longitudeEnd
        )
      );

      knotCycleIntersectionPoint =
        projectPoint(
          attachedCuspTargetPoint(
            cuspRawPointFromCoordinates(
              0.5,
              0.5
            )
          ),
          displayView
        );

      knotMeridianPolyline =
        Array.from(
          { length: cycleSamples + 1 },
          (_, sampleIndex) => {
            const amount =
              sampleIndex / cycleSamples;

            return projectPoint(
              attachedCuspTargetPoint(
                cuspRawPointFromCoordinates(
                  amount,
                  0.5
                )
              ),
              displayView
            );
          }
        );

      knotLongitudePolyline =
        Array.from(
          { length: cycleSamples + 1 },
          (_, sampleIndex) => {
            const amount =
              sampleIndex / cycleSamples;

            return projectPoint(
              attachedCuspTargetPoint(
                cuspRawPointFromCoordinates(
                  0.5 +
                    FIGURE_EIGHT_CUSP_LONGITUDE_MERIDIAN_SHEAR *
                      amount,
                  amount
                )
              ),
              displayView
            );
          }
        );
    }



    const requestedCuspBoundaryStage =
      cuspBoundaryStage;

    /*
     * The eight subdivided cusp triangles are the torus surface itself.
     * As soon as the first peripheral identification starts rolling the
     * assembled development, hand visibility to this one connected
     * high-resolution mesh.  At stage one it is the single triangulated
     * cusp cylinder; stage two deforms that same connected surface into
     * the knotted torus.  Do not substitute separate tile envelopes.
     */
    const connectedCuspSurfaceProgress =
      smootherUnitInterval(
        clampUnit(cuspBoundaryStage)
      ) *
      smootherUnitInterval(
        clampUnit(
          (
            cuspLayoutTransitionProgress -
            0.92
          ) / 0.08
        )
      );

    /*
     * AUTHORITATIVE CONNECTED CUSP SURFACE
     *
     * Once Assemble has finished, the eight cusp triangles already form
     * one connected fundamental parallelogram. From that exact moment
     * onward, keep ONE material mesh in ownership:
     *
     *   assembled parallelogram
     *       -> first quotient cylinder
     *       -> final knotted torus.
     *
     * This is the backward construction from the known-correct final
     * figure-eight tube. The older per-tile caps, collars, and funnel
     * surfaces remain useful only before planar assembly is complete.
     */
    const connectedCuspSurfaceVisibility =
      (
        cuspDomainAssemblyProgress >=
          1 - FACE_CONSTRAINT_EPSILON &&
        cuspLayoutTransitionProgress >=
          1 - FACE_CONSTRAINT_EPSILON
      )
        ? 1
        : 0;

    const torusSurfaceProgress =
      smootherUnitInterval(
        clampUnit(
          cuspBoundaryStage / 2
        )
      );

    /*
     * The cusp is an attached boundary of this same
     * face-pairing construction. Revealing it must not
     * discard the manifold identifications underneath it.
     */
    const effectivePairStrengths =
      facePairStrengths;

    const effectiveConstraintOrder =
      facePairConstraintOrder;

    const physicalSeamPairIds =
      effectiveConstraintOrder.filter(
        (pairId) =>
          (
            animatedSeamStrengths[
              pairId
            ] ?? 0
          ) >
          FACE_CONSTRAINT_EPSILON
      );

    /*
     * Compatibility field for diagnostics that still expect a
     * singular seam. It is intentionally null once more than one
     * bridge is physically collapsed.
     */
    const physicalSeamPairId =
      physicalSeamPairIds.length === 1
        ? physicalSeamPairIds[0]
        : null;

    /*
     * Every selected face pairing owns the same bridge-state
     * definition. Identifications always enter as exposed
     * bridges. Any one of them may later be collapsed into the
     * physical seam, independently of construction order.
     */
    /*
     * Simplified Cells interaction:
     *
     * zero or one requested identification uses the direct rigid
     * face-matching presentation. No bridge is required.
     */
    const directFaceMatchMode =
      !showCuspTriangles &&
      facePairSequence.length <= 1 &&
      requestedCollapsedBridgePairIds.length <= 1;

    const pairingBridgeDefinitions =
      effectiveConstraintOrder.map(
        (pairId, pairingIndex) => {
          const priorPairIds =
            effectiveConstraintOrder.slice(
              0,
              pairingIndex
            );

          const bridgeClassification =
            classifyBridgeFaceAdjacency({
              pairId,
              priorPairIds,
              facePairMappingTurns:
                normalizedFacePairMappingTargets,
              pairStrengths:
                effectivePairStrengths,
              geometry:
                truncatedGeometry,
            });

          const seamStrength =
            Math.max(
              0,
              Math.min(
                1,
                animatedSeamStrengths[
                  pairId
                ] ?? 0
              )
            );

          const bridgeExposure =
            directFaceMatchMode
              ? 0
              : 1 - seamStrength;

          const seamTargetStrength =
            collapsedBridgeTargetStrengths[
              pairId
            ] ?? 0;

          const seamTransitionActive =
            Math.abs(
              seamStrength -
                seamTargetStrength
            ) >
              FACE_CONSTRAINT_EPSILON ||
            (
              seamStrength >
                FACE_CONSTRAINT_EPSILON &&
              bridgeExposure >
                FACE_CONSTRAINT_EPSILON
            );

          const bridgeSpanScale =
            bridgeExposure;

          const collapsed =
            bridgeExposure <=
            FACE_CONSTRAINT_EPSILON;

          return {
            pairId,
            pairing:
              activeFacePairs[
                pairId
              ],
            pairingIndex,
            bridgeIndex: null,
            priorPairIds,
            collapsed,
            seamStrength,
            bridgeExposure,
            bridgeSpanScale,
            seamTransitionActive,
            bridgeType:
              bridgeClassification.type,
            bridgeClassification,
            routeLane: 0,
            routeSpec:
              DEFAULT_BRIDGE_ROUTE_SPEC,
            mappingTurn:
              animatedFacePairMappings[
                pairId
              ] ?? 0,
            sweepStartMappingTurn:
              facePairMappingTransitionRef
                .current.startTurns[
                  pairId
                ] ?? 0,
            routingMappingTurn:
              facePairMappingTransitionRef
                .current.targetTurns[
                  pairId
                ] ??
              animatedFacePairMappings[
                pairId
              ] ??
              0,
            mappingIndex:
              normalizeCyclicMappingIndex(
                facePairMappingIndices?.[
                  pairId
                ] ?? 0
              ),
            progress:
              Math.min(
                1,
                effectivePairStrengths[
                  pairId
                ] ?? 0
              ),
          };
        }
      );

    const solidBridgeDefinitions =
      pairingBridgeDefinitions
        .filter(
          (definition) =>
            definition.bridgeExposure >
            FACE_CONSTRAINT_EPSILON
        )
        .map(
          (definition, bridgeIndex) => ({
            ...definition,
            bridgeIndex,
          })
        );

    /*
     * Do not send simultaneous collapsed faces through the old
     * collision/planner solver: that solver assumes literal rigid
     * face coincidence and becomes overconstrained after the first
     * seam. The lightweight collapsed-core solver below owns the
     * displayed cell deformation instead.
     */
    const physicalPairStrengths =
      activeFacePairs.map(
        () => 0
      );

    const physicalConstraintOrder = [];

    const faceSolution =
      solveFacePairPositions(
        physicalPairStrengths,
        physicalConstraintOrder,
        preferredPlannerGuide,
        animatedFacePairMappings,
        truncatedGeometry
      );

    /*
     * One literal face coincidence can still be shown by the
     * established rigid placement. Once a second collapse is
     * requested, keep one already-completed seam as the compact
     * cell anchor and move every collapsing colored face into the
     * released-face layer below. This prevents a later collapse
     * from tearing open the first identification or folding the
     * 12-vertex cell shell through itself.
     */
    const releasedFaceMode =
      resolvedCollapsedBridgePairIds.length >
      1;

    const rememberedCoreAnchorPairId =
      collapsedCoreAnchorPairRef.current;

    const coreAnchorPairId =
      releasedFaceMode
        ? rememberedCoreAnchorPairId !==
            null &&
          resolvedCollapsedBridgePairIds
            .includes(
              rememberedCoreAnchorPairId
            )
          ? rememberedCoreAnchorPairId
          : resolvedCollapsedBridgePairIds[0]
        : null;

    const coreCollapseStrengths =
      releasedFaceMode
        ? activeFacePairs.map(
            (pair) =>
              pair.id === coreAnchorPairId
                ? animatedSeamStrengths[
                    pair.id
                  ] ?? 0
                : 0
          )
        : animatedSeamStrengths;

    const anchoredWorldPositions =
      directFaceMatchMode
        ? solveDirectFaceMatchPositions(
            animatedSeamStrengths,
            truncatedGeometry,
            corollaryTargetPair,
            corollaryProgress
          )
        : solveCollapsedFunnelCorePositions(
            coreCollapseStrengths,
            animatedFacePairMappings,
            truncatedGeometry
          );

    const releasedCellComplex =
      releasedFaceMode
        ? relaxReleasedFaceCellComplex({
            positions:
              anchoredWorldPositions,
            activePairIds:
              physicalSeamPairIds,
            anchorPairId:
              coreAnchorPairId,
            collapseStrengths:
              animatedSeamStrengths,
            facePairMappingTurns:
              animatedFacePairMappings,
            geometry:
              truncatedGeometry,
          })
        : {
            positions:
              anchoredWorldPositions,
            sharedFaceByPairId:
              activeFacePairs.map(
                () => null
              ),
          };

    const physicalWorldPositions =
      releasedCellComplex.positions;

    const collisionDiagnostics =
      showCuspTriangles
        ? {
            minimumClearance: null,
            minimumClearancePair: null,
            nearContactPairs: [],
            penetratingPairs: [],
            blockedPairId: null,
            testedPairCount: 0,
            adjacentPairCount: 0,
            allowedContactPairCount: 0,
            clearanceThreshold:
              FACE_COLLISION_CLEARANCE,
            barrierContactCount: 0,
            barrierCorrectionCount: 0,
            requestedStrength: null,
            acceptedStrength: null,
            plannerGuideIndex: null,
            plannerPairId: null,
            plannerGuideAmount: 0,
            plannerActive: false,
            plannerCandidateCount: 0,
            plannerValidCandidateCount: 0,
            plannerBestScore: null,
            blockedPlannerCandidateCount: 0,
            blockedPlannerValidCandidateCount: 0,
            blockedPlannerBestScore: null,
            sweptPenetratingPairs: 0,
          }
        : {
            ...faceSolution
              .diagnostics,
            blockedPairId:
              faceSolution
                .blockedPairId,
            barrierContactCount:
              faceSolution
                .barrierContactCount,
            barrierCorrectionCount:
              faceSolution
                .barrierCorrectionCount,
            requestedStrength:
              faceSolution
                .requestedStrength,
            acceptedStrength:
              faceSolution
                .acceptedStrength,
            plannerGuideIndex:
              faceSolution
                .plannerGuideIndex,
            plannerPairId:
              faceSolution
                .plannerPairId,
            plannerGuideAmount:
              faceSolution
                .plannerGuideAmount,
            plannerActive:
              faceSolution
                .plannerActive,
            plannerCandidateCount:
              faceSolution
                .plannerCandidateCount,
            plannerValidCandidateCount:
              faceSolution
                .plannerValidCandidateCount,
            plannerBestScore:
              faceSolution
                .plannerBestScore,
            blockedPlannerCandidateCount:
              faceSolution
                .blockedPlannerCandidateCount,
            blockedPlannerValidCandidateCount:
              faceSolution
                .blockedPlannerValidCandidateCount,
            blockedPlannerBestScore:
              faceSolution
                .blockedPlannerBestScore,
            sweptPenetratingPairs:
              faceSolution
                .sweptPenetratingPairs,
          };

    const validityDiagnostics =
      showCuspTriangles
        ? {
            status: "complete",
            pairMetrics: [],
            maximumSeamError: 0,
            rmsSeamError: 0,
            maximumEdgeDistortion: 0,
            rmsEdgeDistortion: 0,
            minimumTriangleAreaRatio: 1,
            maximumTriangleAreaRatio: 1,
            collapsedTriangleCount: 0,
            invertedTriangleCount: 0,
            minimumClearance: null,
            solverResidual: 0,
            initialSolverResidual: 0,
            residualImprovement: 1,
            numericallyConverged: true,
            stagnating: false,
            plannerExhausted: false,
            plannerImproving: false,
            plannerCandidateCount: 0,
            plannerValidCandidateCount: 0,
            plannerBestScore: null,
            blockedPlannerCandidateCount: 0,
            blockedPlannerValidCandidateCount: 0,
            blockedPlannerBestScore: null,
            blockedPlannerImproving: false,
            allRequestedFull: true,
            allAccepted: true,
            seamsExact: true,
            collisionValid: true,
            shapeValid: true,
          }
        : analyzeFaceSolutionValidity({
            positions:
              physicalWorldPositions,
            pairStrengths:
              physicalPairStrengths,
            constraintOrder:
              physicalConstraintOrder,
            acceptedPairStrengths:
              faceSolution
                .acceptedPairStrengths,
            collisionDiagnostics,
            blockedPairId:
              faceSolution
                .blockedPairId,
            requestedStrength:
              faceSolution
                .requestedStrength,
            acceptedStrength:
              faceSolution
                .acceptedStrength,
            plannerActive:
              faceSolution
                .plannerActive,
            plannerCandidateCount:
              faceSolution
                .plannerCandidateCount,
            plannerValidCandidateCount:
              faceSolution
                .plannerValidCandidateCount,
            plannerBestScore:
              faceSolution
                .plannerBestScore,
            blockedPlannerCandidateCount:
              faceSolution
                .blockedPlannerCandidateCount,
            blockedPlannerValidCandidateCount:
              faceSolution
                .blockedPlannerValidCandidateCount,
            blockedPlannerBestScore:
              faceSolution
                .blockedPlannerBestScore,
            solverResidual:
              faceSolution
                .solverResidual,
            initialSolverResidual:
              faceSolution
                .initialSolverResidual,
            sweptPenetratingPairCount:
              faceSolution
                .sweptPenetratingPairs,
            facePairMappingTurns:
              animatedFacePairMappings,
            geometry:
              truncatedGeometry,
          });

    const firstPhysicalPairId =
      physicalConstraintOrder[0] ??
      null;

    const firstFaceMappingInTransition =
      !showCuspTriangles &&
      firstPhysicalPairId !== null &&
      physicalConstraintOrder.length ===
        1 &&
      physicalPairStrengths[
        firstPhysicalPairId
      ] >=
        FACE_VALIDITY_FULL_STRENGTH &&
      settledCyclicMappingIndex(
        animatedFacePairMappings[
          firstPhysicalPairId
        ] ?? 0
      ) === null;

    /*
     * During a first-seam vertex-map change, tetrahedron
     * B follows an exact rigid rotation around the shared
     * face normal. Intermediate angles intentionally do
     * not define a discrete vertex correspondence. Do not
     * invoke the quotient cut-open fallback during those
     * frames: it would pull the tetrahedra apart and
     * replace the rotating seam with dotted links.
     */
    const quotientDisplayActive =
      !firstFaceMappingInTransition &&
      !showCuspTriangles &&
      (
        validityDiagnostics.status ===
          "quotient-only" ||
        (
          validityDiagnostics.status ===
            "blocked" &&
          validityDiagnostics
            .allRequestedFull
        )
      );

    const requestedFullPairMetrics =
      validityDiagnostics.pairMetrics.filter(
        (metric) =>
          metric.requestedStrength >=
          FACE_VALIDITY_FULL_STRENGTH
      );

    const quotientUnresolvedPairIds = [];

    if (quotientDisplayActive) {
      requestedFullPairMetrics.forEach(
        (metric) => {
          if (
            metric.acceptedStrength <
              metric.requestedStrength -
                0.005 ||
            metric.maximumError >
              FACE_VALIDITY_SEAM_TOLERANCE
          ) {
            quotientUnresolvedPairIds.push(
              metric.pairId
            );
          }
        }
      );

      const blockedPairId =
        collisionDiagnostics
          .blockedPairId;

      if (
        blockedPairId !== null &&
        !quotientUnresolvedPairIds.includes(
          blockedPairId
        )
      ) {
        quotientUnresolvedPairIds.push(
          blockedPairId
        );
      }

      /*
       * A quotient-only result can arise from collapse
       * or inversion after every seam was numerically
       * accepted. In that case, reopen the final
       * requested pair and represent that identification
       * explicitly rather than displaying the invalid
       * literal coincidence.
       */
      if (
        quotientUnresolvedPairIds.length ===
          0 &&
        requestedFullPairMetrics.length > 0
      ) {
        quotientUnresolvedPairIds.push(
          requestedFullPairMetrics[
            requestedFullPairMetrics.length -
              1
          ].pairId
        );
      }
    }

    const orderedQuotientPairIds =
      effectiveConstraintOrder.filter(
        (pairId) =>
          quotientUnresolvedPairIds.includes(
            pairId
          )
      );

    let displayFaceSolution = {
      ...faceSolution,
      positions:
        physicalWorldPositions,
    };

    let quotientCutOpenStrength = null;
    let quotientCutOpenValid = true;

    if (
      validityDiagnostics.status ===
        "quotient-only" &&
      orderedQuotientPairIds.length > 0
    ) {
      const firstOpenPairId =
        orderedQuotientPairIds[0];

      const firstOpenIndex =
        effectiveConstraintOrder.indexOf(
          firstOpenPairId
        );

      const cutOpenState =
        findValidQuotientCutOpenState({
          faceSolution,
          pairStrengths:
            effectivePairStrengths,
          constraintOrder:
            effectiveConstraintOrder,
          firstOpenIndex,
          preferredGuideIndex:
            preferredPlannerGuide,
          geometry:
            truncatedGeometry,
        });

      displayFaceSolution =
        cutOpenState.faceSolution;

      quotientCutOpenStrength =
        cutOpenState.cutOpenStrength;

      quotientCutOpenValid =
        cutOpenState.valid;
    }

    const solvedWorldPositions =
      displayFaceSolution.positions;

    const releasedBoundaryClearanceDirections =
      releasedFaceMode
        ? boundaryClearanceCertifiedDirectionsForPositions({
            positions:
              solvedWorldPositions,
            pairIds:
              physicalSeamPairIds,
            facePairMappingTurns:
              animatedFacePairMappings,
            geometry:
              truncatedGeometry,
          })
        : new Map();

    const releasedBoundaryClearanceCorridors =
      releasedFaceMode
        ? boundaryClearanceCorridorsForPositions(
            solvedWorldPositions,
            truncatedGeometry,
            releasedBoundaryClearanceDirections
          )
        : [];

    const releasedFaceModels =
      releasedFaceMode
        ? physicalSeamPairIds
            .map((pairId) =>
              makeReleasedFaceIdentificationModel({
                positions:
                  solvedWorldPositions,
                pairId,
                mappingTurn:
                  animatedFacePairMappings[
                    pairId
                  ] ?? 0,
                strength:
                  animatedSeamStrengths[
                    pairId
                  ] ?? 0,
                pinned:
                  pairId ===
                  coreAnchorPairId,
                sharedFaceOverride:
                  releasedCellComplex
                    .sharedFaceByPairId[
                    pairId
                  ],
                boundaryClearanceCorridors:
                  releasedBoundaryClearanceCorridors,
                geometry:
                  truncatedGeometry,
              })
            )
            .filter(Boolean)
        : [];

    function worldPoint(
      point,
      tetrahedron
    ) {
      const mesh =
        truncatedGeometry.meshes[
          tetrahedron.id
        ];

      /*
       * All rendered truncated-surface points resolve
       * to one of the twelve shared mesh vertices.
       * A fallback remains for any auxiliary point that
       * is not part of the indexed surface.
       */
      const vertexIndex =
        mesh.vertices.findIndex(
          (vertex) =>
            pointDistance(
              vertex.point,
              point
            ) <
            FACE_CONSTRAINT_EPSILON
        );

      if (vertexIndex === -1) {
        return transformPoint(
          point,
          tetrahedron
        );
      }

      return solvedWorldPositions[
        tetrahedron.id
      ][vertexIndex];
    }

    /*
     * Recompute the center of the complete current
     * geometry on every animation frame. This makes
     * the combined complex, rather than the original
     * world origin, the orbit and projection center.
     */
    const sceneTetrahedra =
      truncatedGeometry.tetrahedra ??
      TETRAHEDRA;

    const scenePoints = [
      ...sceneTetrahedra.flatMap(
        (tetrahedron) => {
          const mesh =
            truncatedGeometry.meshes[
              tetrahedron.id
            ];

          return mesh.vertices.map(
            (vertex) =>
              worldPoint(
                vertex.point,
                tetrahedron
              )
          );
        }
      ),
      ...releasedFaceModels.flatMap(
        (model) => [
          ...model.releasedA,
          ...model.releasedB,
          ...model.sharedFace,
        ]
      ),
    ];

    const sceneCenter =
      boundingCenter(scenePoints);

    function centeredWorldPoint(
      point,
      tetrahedron
    ) {
      return subtractPoint(
        worldPoint(point, tetrahedron),
        sceneCenter
      );
    }

    /*
     * Reconstruct the virtual ideal vertex removed by truncation.
     *
     * Each original tetrahedron vertex has three incident edges.
     * The mesh contains both truncated points on every edge, so
     * the missing endpoint can be recovered from the current
     * deformed world-space positions rather than from the original
     * undeformed tetrahedron.
     *
     * Averaging the three edge reconstructions gives one stable
     * label position that follows the actual current tetrahedron.
     */
    function centeredIdealVertexPoint(
      tetrahedron,
      vertexIndex
    ) {
      const mesh =
        truncatedGeometry.meshes[
          tetrahedron.id
        ];

      const fraction =
        truncatedGeometry
          .truncationFraction;

      const denominator =
        1 - 2 * fraction;

      if (
        Math.abs(denominator) <
        FACE_CONSTRAINT_EPSILON
      ) {
        return subtractPoint(
          transformPoint(
            VERTICES[vertexIndex],
            tetrahedron
          ),
          sceneCenter
        );
      }

      const reconstructedPoints =
        TRUNCATION_NEIGHBORS[
          vertexIndex
        ]
          .map((neighborIndex) => {
            const nearIndex =
              mesh.vertexIndexById.get(
                truncatedVertexKey(
                  vertexIndex,
                  neighborIndex
                )
              );

            const farIndex =
              mesh.vertexIndexById.get(
                truncatedVertexKey(
                  neighborIndex,
                  vertexIndex
                )
              );

            if (
              nearIndex === undefined ||
              farIndex === undefined
            ) {
              return null;
            }

            const nearPoint =
              solvedWorldPositions[
                tetrahedron.id
              ][nearIndex];

            const farPoint =
              solvedWorldPositions[
                tetrahedron.id
              ][farIndex];

            if (
              !nearPoint ||
              !farPoint
            ) {
              return null;
            }

            return {
              x:
                (
                  (1 - fraction) *
                    nearPoint.x -
                  fraction *
                    farPoint.x
                ) /
                denominator,

              y:
                (
                  (1 - fraction) *
                    nearPoint.y -
                  fraction *
                    farPoint.y
                ) /
                denominator,

              z:
                (
                  (1 - fraction) *
                    nearPoint.z -
                  fraction *
                    farPoint.z
                ) /
                denominator,
            };
          })
          .filter(Boolean);

      if (
        reconstructedPoints.length ===
        0
      ) {
        return subtractPoint(
          transformPoint(
            VERTICES[vertexIndex],
            tetrahedron
          ),
          sceneCenter
        );
      }

      return subtractPoint(
        averageWorldPoint(
          reconstructedPoints
        ),
        sceneCenter
      );
    }

    /*
     * Every settled face seam contributes to the cusp extension
     * direction field.  The same field is used by the reserved
     * boundary corridors and by the rendered cusp collars, so the
     * collapse solver reserves exactly the walls that Assemble cusp
     * will later instantiate.
     */
    const sharedCuspSeamPairIds =
      physicalSeamPairIds.filter(
        (pairId) =>
          settledCyclicMappingIndex(
            animatedFacePairMappings[
              pairId
            ] ?? 0
          ) !== null
      );

    const sharedCuspSeamPairIdSet =
      new Set(sharedCuspSeamPairIds);

    const sharedCuspCollarDirectionByBaseId =
      releasedFaceMode
        ? releasedBoundaryClearanceDirections
        : boundaryClearanceCertifiedDirectionsForPositions({
            positions:
              solvedWorldPositions,
            pairIds:
              sharedCuspSeamPairIds,
            facePairMappingTurns:
              animatedFacePairMappings,
            geometry:
              truncatedGeometry,
          });

    /*
     * Boundary clearance is solved once for the complete eight-
     * collar system before any individual collar is rendered.
     * The prescribed cusp extension is certified from Assemble
     * onward and remains the routed attachment surface.
     *
     * Every common-step certification sees:
     *   - both truncated tetrahedra;
     *   - every currently exposed face bridge;
     *   - every released-identification collar and shared face;
     *   - all fixed 177-unit local cusp collars;
     *   - the fixed cusp-torus surface;
     *   - every other routed cusp collar.
     *
     * All eight routed collars receive one acceptance amount.
     * No A/B label or iteration order can receive priority.
     */
    const cuspClearRouteRingsByBaseId =
      new Map();

    if (
      cuspAssemblyProgress >
      FACE_CONSTRAINT_EPSILON
    ) {
      function buildCuspClearanceGeometry(
        tetrahedron,
        vertexIndex
      ) {
        function targetPointForStage(
          rawPoint
        ) {
          return multiplyPoint(
            subtractPoint(
              cuspBoundaryTargetPoint(
                rawPoint
              ),
              cuspBoundaryTargetCenter
            ),
            CUSP_BOUNDARY_WORLD_SCALE
          );
        }

        const mesh =
          truncatedGeometry.meshes[
            tetrahedron.id
          ];

        const neighbors =
          TRUNCATION_NEIGHBORS[
            vertexIndex
          ];

        const cuspMeshFace =
          mesh.cuspFaces[
            vertexIndex
          ];

        const modelPoints =
          meshFacePoints(
            mesh,
            cuspMeshFace
          ).map((point) =>
            centeredWorldPoint(
              point,
              tetrahedron
            )
          );

        const tetrahedronBodyCenter =
          averageWorldPoint(
            mesh.vertices.map(
              (vertex) =>
                centeredWorldPoint(
                  vertex.point,
                  tetrahedron
                )
            )
          );

        const outwardNormal =
          outwardFaceNormal(
            modelPoints,
            tetrahedronBodyCenter
          );

        const cuspBaseId =
          `${tetrahedron.id}${vertexIndex}`;

        const boundaryExtensionProgress =
          cuspStagedExtensionProgress(
            cuspAssemblyProgress,
            cuspBaseId,
            cuspAssemblyOrder
          );

        const boundaryAssemblyProgress =
          Math.min(
            cuspStagedFunnelAssemblyProgress(
              cuspDomainAssemblyProgress,
              cuspBaseId,
              cuspAssemblyOrder
            ),
            cuspLayoutReassemblyProgress(
              cuspLayoutTransitionProgress,
              cuspBaseId,
              cuspAssemblyOrder
            )
          );

        const collarDirection =
          sharedCuspCollarDirectionByBaseId
            .get(cuspBaseId) ??
          outwardNormal;

        const outerModelPoints =
          modelPoints.map(
            (point) =>
              addPoint(
                point,
                multiplyPoint(
                  collarDirection,
                  CUSP_COLLAR_LENGTH
                )
              )
          );

        const rawFlatPoints =
          neighbors.map(
            (neighborIndex) =>
              rawCuspPointFromLayout(
                cuspFlatLayout,
                tetrahedron.id,
                vertexIndex,
                neighborIndex
              )
          );

        /*
         * A and B approach the central cusp development from
         * opposite half-spaces.
         */
        const cuspRouteSideSign =
          tetrahedron.id === "A"
            ? -1
            : 1;

        /*
         * Symmetric lane order within each four-funnel family.
         */
        const cuspRouteLane =
          vertexIndex - 1.5;

        const cuspRouteTargetPoints =
          rawFlatPoints.map(
            targetPointForStage
          );

        function routeWeightsForEdge(
          firstIndex,
          secondIndex,
          acrossAmount
        ) {
          const weights = [0, 0, 0];

          weights[firstIndex] =
            1 - acrossAmount;

          weights[secondIndex] =
            acrossAmount;

          return weights;
        }

        function routedPoint(
          weights,
          routeAmount
        ) {
          const assemblyRouteAmount =
            clampUnit(routeAmount) *
            boundaryAssemblyProgress;

          const funnelPoint =
            triangularCuspFunnelPoint({
              sourceTriangle:
                outerModelPoints,

              targetTriangle:
                cuspRouteTargetPoints,

              sourceDirection:
                collarDirection,

              sideSign:
                cuspRouteSideSign,

              lane:
                cuspRouteLane,

              weights,

              amount:
                assemblyRouteAmount,
            });

          const basePoint =
            blendTrianglePoint(
              modelPoints,
              weights
            );

          return lerpPoint(
            basePoint,
            funnelPoint,
            boundaryExtensionProgress
          );
        }

        function localPoint(
          weights,
          localAmount
        ) {
          const basePoint =
            blendTrianglePoint(
              modelPoints,
              weights
            );

          const outerPoint =
            blendTrianglePoint(
              outerModelPoints,
              weights
            );

          const fullLocalPoint =
            lerpPoint(
              basePoint,
              outerPoint,
              clampUnit(localAmount)
            );

          return lerpPoint(
            basePoint,
            fullLocalPoint,
            boundaryExtensionProgress
          );
        }

        const perimeterWeights =
          [
            [0, 1],
            [1, 2],
            [2, 0],
          ].flatMap(
            ([firstIndex, secondIndex]) =>
              Array.from(
                {
                  length:
                    CUSP_MESH_DIVISIONS,
                },
                (_, acrossIndex) =>
                  routeWeightsForEdge(
                    firstIndex,
                    secondIndex,
                    acrossIndex /
                      CUSP_MESH_DIVISIONS
                  )
              )
          );

        const initialRings =
          Array.from(
            {
              length:
                CUSP_COLLAR_ROUTE_SEGMENTS +
                1,
            },
            (_, segmentIndex) =>
              perimeterWeights.map(
                (weights) =>
                  routedPoint(
                    weights,
                    segmentIndex /
                      CUSP_COLLAR_ROUTE_SEGMENTS
                  )
              )
          );

        const localRings =
          Array.from(
            {
              length:
                CUSP_COLLAR_LOCAL_SEGMENTS +
                1,
            },
            (_, segmentIndex) =>
              perimeterWeights.map(
                (weights) =>
                  localPoint(
                    weights,
                    segmentIndex /
                      CUSP_COLLAR_LOCAL_SEGMENTS
                  )
              )
          );

        const localTriangles =
          cuspCollarSurfaceTriangles(
            localRings,
            `local-${cuspBaseId}`
          );

        const targetTriangles =
          CUSP_MESH_CELLS.map(
            (cell, cellIndex) => ({
              key:
                `cusp-target-${cuspBaseId}-` +
                `${cellIndex}`,
              bridgeIndex:
                `cusp-target-${cuspBaseId}`,
              pairId:
                `cusp-target-${cuspBaseId}`,
              segmentIndex: 0,
              sideIndex: cellIndex,
              triangleIndex: 0,
              points:
                cell.map((weights) =>
                  routedPoint(weights, 1)
                ),
            })
          );

        return {
          cuspBaseId,
          initialRings,
          localTriangles,
          targetTriangles,
        };
      }

      let cuspClearanceGeometries =
        sceneTetrahedra.flatMap(
          (tetrahedron) =>
            VERTICES.map(
              (_, vertexIndex) =>
                buildCuspClearanceGeometry(
                  tetrahedron,
                  vertexIndex
                )
            )
        );

      const tetrahedronObstacleGroup =
        cuspCollarTriangleGroup(
          "truncated-tetrahedra",
          bridgeAuditTetrahedronTriangles(
            solvedWorldPositions,
            truncatedGeometry.meshes
          ).map(
            (triangle) => ({
              ...triangle,
              points:
                triangle.points.map(
                  (point) =>
                    subtractPoint(
                      point,
                      sceneCenter
                    )
                ),
            })
          ),
          "tetrahedron"
        );

      const bridgeObstacleGroups =
        pairingBridgeDefinitions
          .filter(
            (definition) =>
              definition.bridgeExposure >
                FACE_CONSTRAINT_EPSILON &&
              definition.progress >
                FACE_CONSTRAINT_EPSILON
          )
          .map(
            (definition, bridgeIndex) => {
              const routeSpec =
                animatedBridgeRouteSpecs[
                  definition.pairId
                ] ??
                bridgeRouteCandidateSpecsForType(
                  definition.bridgeType
                )[0] ??
                DEFAULT_BRIDGE_ROUTE_SPEC;

              const bridgeModel =
                makeFaceIdentificationBridgeModel({
                  positions:
                    solvedWorldPositions,
                  pairing:
                    definition.pairing,
                  progress:
                    definition.progress,
                  bridgeSpanScale:
                    definition.bridgeSpanScale,
                  bridgeIndex,
                  routeLane:
                    routeSpec.lane,
                  routeSpec,
                  mappingTurn:
                    definition.mappingTurn,
                  sceneCenter,
                  geometry:
                    truncatedGeometry,
                });

              return cuspCollarTriangleGroup(
                `bridge-${definition.pairId}`,
                bridgeModel.triangles.map(
                  (triangle) => ({
                    ...triangle,
                    points:
                      triangle.points.map(
                        (point) =>
                          subtractPoint(
                            point,
                            sceneCenter
                          )
                      ),
                  })
                ),
                "bridge"
              );
            }
          )
          .filter(Boolean);

      const releasedIdentificationObstacleGroups =
        releasedFaceModels
          .map((model) =>
            cuspCollarTriangleGroup(
              `released-${model.pairId}`,
              boundaryClearanceReleasedTriangles(
                [model]
              ).map((triangle) => ({
                ...triangle,
                points:
                  triangle.points.map(
                    (point) =>
                      subtractPoint(
                        point,
                        sceneCenter
                      )
                  ),
              })),
              "released-identification"
            )
          )
          .filter(Boolean);

      const localCollarObstacleGroups =
        cuspClearanceGeometries
          .map(
            (geometry) =>
              cuspCollarTriangleGroup(
                `local-${geometry.cuspBaseId}`,
                geometry.localTriangles,
                "local-collar"
              )
          )
          .filter(Boolean);

      /*
       * The first quotient is the cylinder.  The second quotient now moves
       * directly into the already-defined smooth figure-eight knot tube, so
       * there is no synthetic round-torus bend to certify here.  The m004
       * knot tube is the canonical target of this stage; routed attachment
       * sheets still receive the full collision/clearance solve below.
       */
      function cuspWrapBoundaryStageIsClear(
        candidateStage
      ) {
        const stage = Math.max(
          0,
          Math.min(2, candidateStage)
        );

        return (
          stage <= 1 ||
          activeManifold
            .peripheralAvailable !== false
        );
      }

      const wrapEnvironmentKey = [
        cuspFirstBoundary,
        animatedBridgeRouteSpecKey,
        animatedFacePairMappingKey,
        effectiveConstraintOrder.join(","),
        physicalSeamPairIds.join(",") ||
          "none",
        animatedSeamStrengths
          .map((strength) =>
            strength.toFixed(4)
          )
          .join(","),
        cuspAssemblyProgress.toFixed(4),
        truncatedGeometry
          .truncationFraction
          .toFixed(5),
        truncatedGeometry
          .tetrahedronSeparation
          .toFixed(2),
        sceneCenter.x.toFixed(2),
        sceneCenter.y.toFixed(2),
        sceneCenter.z.toFixed(2),
        ...releasedFaceModels.map(
          (model) => {
            const center =
              averageWorldPoint(
                model.sharedFace
              );

            return (
              `${model.pairId}:` +
              `${model.strength.toFixed(4)}:` +
              `${center.x.toFixed(2)},` +
              `${center.y.toFixed(2)},` +
              `${center.z.toFixed(2)}`
            );
          }
        ),
      ].join("||");

      const wrapCertification =
        cuspWrapCertificationRef.current;

      if (
        wrapCertification.key !==
        wrapEnvironmentKey
      ) {
        wrapCertification.key =
          wrapEnvironmentKey;
        wrapCertification.acceptedStage =
          0;
      }

      /*
       * Advance through the canonical cusp homotopy only while its
       * analytic embedding condition remains valid.  Undo traverses
       * an already-certified prefix of the same path.
       */
      if (
        requestedCuspBoundaryStage <=
        wrapCertification.acceptedStage +
          FACE_CONSTRAINT_EPSILON
      ) {
        /*
         * Undo traverses a prefix of the same certified path.
         */
        wrapCertification.acceptedStage =
          requestedCuspBoundaryStage;
      } else {
        const startStage =
          wrapCertification.acceptedStage;

        const requestedAdvance =
          requestedCuspBoundaryStage -
          startStage;

        const sampleCount =
          Math.max(
            1,
            Math.ceil(
              requestedAdvance *
                CUSP_WRAP_COLLISION_SWEEP_SAMPLES
            )
          );

        let lastClearStage =
          startStage;
        let firstBlockedStage = null;

        for (
          let sampleIndex = 1;
          sampleIndex <= sampleCount;
          sampleIndex += 1
        ) {
          const candidateStage =
            startStage +
            requestedAdvance *
              (sampleIndex / sampleCount);

          if (
            cuspWrapBoundaryStageIsClear(
              candidateStage
            )
          ) {
            lastClearStage =
              candidateStage;
            continue;
          }

          firstBlockedStage =
            candidateStage;
          break;
        }

        if (firstBlockedStage !== null) {
          let lower = lastClearStage;
          let upper =
            firstBlockedStage;

          for (
            let refinement = 0;
            refinement <
              CUSP_WRAP_COLLISION_REFINEMENT_STEPS;
            refinement += 1
          ) {
            const candidateStage =
              0.5 * (lower + upper);

            if (
              cuspWrapBoundaryStageIsClear(
                candidateStage
              )
            ) {
              lower = candidateStage;
            } else {
              upper = candidateStage;
            }
          }

          lastClearStage = lower;
        }

        wrapCertification.acceptedStage =
          lastClearStage;
      }

      cuspBoundaryStage =
        wrapCertification.acceptedStage;

      refreshCuspBoundaryStage();

      if (
        Math.abs(
          cuspBoundaryStage -
            requestedCuspBoundaryStage
        ) > FACE_CONSTRAINT_EPSILON
      ) {
        cuspClearanceGeometries =
          sceneTetrahedra.flatMap(
            (tetrahedron) =>
              VERTICES.map(
                (_, vertexIndex) =>
                  buildCuspClearanceGeometry(
                    tetrahedron,
                    vertexIndex
                  )
              )
          );
      }

      const connectedCuspSurfaceObstacle =
        cuspCollarTriangleGroup(
          "connected-cusp-surface",
          cuspClearanceGeometries.flatMap(
            (geometry) =>
              geometry.targetTriangles
          ),
          "cusp-torus"
        );

      const fixedObstacleGroups = [
        tetrahedronObstacleGroup,
        ...bridgeObstacleGroups,
        ...releasedIdentificationObstacleGroups,
        ...localCollarObstacleGroups,
        connectedCuspSurfaceObstacle,
      ].filter(Boolean);

      const releasedObstacleKey =
        releasedFaceModels
          .map((model) => {
            const centers = [
              averageWorldPoint(
                model.releasedA
              ),
              averageWorldPoint(
                model.releasedB
              ),
              averageWorldPoint(
                model.sharedFace
              ),
            ];

            return [
              model.pairId,
              model.strength.toFixed(4),
              ...centers.flatMap(
                (point) => [
                  point.x.toFixed(2),
                  point.y.toFixed(2),
                  point.z.toFixed(2),
                ]
              ),
            ].join(",");
          })
          .join(";");

      /*
       * First certify the prescribed extension itself.  At the
       * start of a peripheral wrap every routed section is
       * collapsed onto its local outer triangle.  The candidate
       * state is the full prescribed route at the current frame.
       * One common acceptance amount is applied to all eight.
       */
      const clearanceSeedGeometries =
        cuspClearanceGeometries.map(
          (geometry) => ({
            ...geometry,
            /*
             * Keep the full triangular cross-section.
             *
             * Collision clearance is obtained only by translating
             * complete interior rings.
             */
            initialRings:
              cuspBoundaryClearanceSeedRings(
                geometry.initialRings,
                geometry.cuspBaseId
              ),
          })
        );

      const prescribedRingsByBaseId =
        new Map(
          cuspClearanceGeometries.map(
            (geometry) => [
              geometry.cuspBaseId,
              geometry.initialRings,
            ]
          )
        );

      const clearanceCacheKey = [
        "boundary-clearance",
        animatedBridgeRouteSpecKey,
        animatedFacePairMappingKey,
        effectiveConstraintOrder.join(","),
        physicalSeamPairIds.join(",") ||
          "none",
        animatedSeamStrengths
          .map((strength) =>
            strength.toFixed(4)
          )
          .join(","),
        releasedObstacleKey,
        ...cuspClearanceGeometries.map(
          (geometry) =>
            `${geometry.cuspBaseId}:` +
            cuspCollarRingsKey(
              geometry.initialRings
            )
        ),
      ].join("||");

      let certifiedClearance =
        CUSP_COLLAR_CERTIFICATION_CACHE.get(
          clearanceCacheKey
        );

      if (!certifiedClearance) {
        certifiedClearance =
          certifyCuspCollarSystem(
            clearanceSeedGeometries,
            prescribedRingsByBaseId,
            fixedObstacleGroups
          );

        rememberCuspCollarCertification(
          clearanceCacheKey,
          certifiedClearance
        );
      }

      certifiedClearance.ringsByBaseId
        .forEach(
          (rings, cuspBaseId) =>
            cuspClearRouteRingsByBaseId
              .set(
                cuspBaseId,
                rings
              )
        );


    }

    sceneTetrahedra.forEach((tetrahedron) => {
      const mesh =
        truncatedGeometry.meshes[
          tetrahedron.id
        ];

      mesh.largeFaces.forEach(
        (meshFace) => {
          const pair =
            activeFacePairs[
              meshFace.pairId
            ];

          const modelPoints =
            meshFacePoints(
              mesh,
              meshFace
            ).map((point) =>
              centeredWorldPoint(
                point,
                tetrahedron
              )
            );

          const projected =
            modelPoints.map((point) =>
              projectPoint(
                point,
                displayView
              )
            );

          const releasedStrength =
            releasedFaceMode
              ? animatedSeamStrengths[
                  meshFace.pairId
                ] ?? 0
              : 0;

          const baseFaceDepth =
            projected.reduce(
              (sum, point) =>
                sum + point.depth,
              0
            ) /
            projected.length;

          /*
           * Fade the old A/B face coloring under a new-cell overlay.
           *
           * The physical carrier face does not move. Only its visual
           * ownership changes from the old two-cell decomposition to
           * one of the three new tetrahedra.
           */
          faces.push({
            key: meshFace.id,
            pair,
            faceColor:
              faceEndpointColor(
                pair,
                tetrahedron.id
              ),
            meshFace,
            tetrahedronId:
              tetrahedron.id,
            surfaceOpacity:
              1 - clampUnit(
                releasedStrength
              ),
            modelPoints,
            projected,
            depth:
              baseFaceDepth,
          });


        }
      );

      /*
       * Required geometric center of the tetrahedral body.
       * This is used to orient each cusp-face normal outward.
       *
       * The old tetrahedronScreenCenters bookkeeping is gone,
       * but this model-space center is still essential.
       */
      const tetrahedronBodyCenter =
        averageWorldPoint(
          mesh.vertices.map((vertex) =>
            centeredWorldPoint(
              vertex.point,
              tetrahedron
            )
          )
        );

      VERTICES.forEach((_, vertexIndex) => {
        const neighbors =
          TRUNCATION_NEIGHBORS[
            vertexIndex
          ];

        const cuspMeshFace =
          mesh.cuspFaces[
            vertexIndex
          ];

        const modelPoints =
          meshFacePoints(
            mesh,
            cuspMeshFace
          ).map((point) =>
            centeredWorldPoint(
              point,
              tetrahedron
            )
          );

        const projectedInSpace =
          modelPoints.map((point) =>
            projectPoint(
              point,
              displayView
            )
          );

        const cuspBaseCenter =
          averageWorldPoint(modelPoints);

        const outwardNormal =
          outwardFaceNormal(
            modelPoints,
            tetrahedronBodyCenter
          );

        const cuspBaseId =
          `${tetrahedron.id}${vertexIndex}`;

        const tileExtensionProgress =
          cuspStagedExtensionProgress(
            cuspAssemblyProgress,
            cuspBaseId,
            cuspAssemblyOrder
          );

        /*
         * Material color appears before motion.
         *
         * For the first triangle this produces the crucial visual:
         *
         *   small truncation face on tetrahedron
         *       -> becomes colored IN PLACE
         *       -> then moves outward.
         */
        const tileMaterialRevealProgress =
          cuspStagedMaterialRevealProgress(
            cuspAssemblyProgress,
            cuspBaseId,
            cuspAssemblyOrder
          );

        const tileAssemblyProgress =
          Math.min(
            cuspStagedFunnelAssemblyProgress(
              cuspDomainAssemblyProgress,
              cuspBaseId,
              cuspAssemblyOrder
            ),
            cuspLayoutReassemblyProgress(
              cuspLayoutTransitionProgress,
              cuspBaseId,
              cuspAssemblyOrder
            )
          );

        const collarDirection =
          sharedCuspCollarDirectionByBaseId
            .get(cuspBaseId) ??
          outwardNormal;

        const outerModelPoints =
          modelPoints.map((point) =>
            addPoint(
              point,
              multiplyPoint(
                collarDirection,
                CUSP_COLLAR_LENGTH
              )
            )
          );

        const rawFlatPoints =
          neighbors.map((neighborIndex) =>
            rawCuspPointFromLayout(
              cuspFlatLayout,
              tetrahedron.id,
              vertexIndex,
              neighborIndex
            )
          );

        const projected =
          projectedInSpace;

        /*
         * A cusp attachment now has three geometric parts:
         *
         * 1. the original straight 177-unit triangular extrusion;
         * 2. a full-width curved triangular funnel that stays in
         *    its tetrahedron's A/B half-space;
         * 3. a short normal triangular prism from a parallel
         *    pre-target triangle onto the terminal cusp tile.
         *
         * Every intermediate cross-section remains a genuine
         * full-width triangle.
         */
        /*
         * Keep A in x < 0 and B in x > 0 until the final
         * normal approach to the moving terminal tile.
         */
        const cuspRouteSideSign =
          tetrahedron.id === "A"
            ? -1
            : 1;

        const cuspRouteLane =
          vertexIndex - 1.5;

        const cuspRouteTargetPoints =
          rawFlatPoints.map(
            attachedCuspTargetPoint
          );

        function cuspRouteWeightsForEdge(
          firstIndex,
          secondIndex,
          acrossAmount
        ) {
          const weights = [0, 0, 0];

          weights[firstIndex] =
            1 - acrossAmount;

          weights[secondIndex] =
            acrossAmount;

          return weights;
        }

        function routedCuspModelPoint(
          weights,
          routeAmount
        ) {
          const assemblyRouteAmount =
            clampUnit(routeAmount) *
            tileAssemblyProgress;

          return triangularCuspFunnelPoint({
            sourceTriangle:
              outerModelPoints,

            targetTriangle:
              cuspRouteTargetPoints,

            sourceDirection:
              collarDirection,

            sideSign:
              cuspRouteSideSign,

            lane:
              cuspRouteLane,

            weights,

            amount:
              assemblyRouteAmount,
          });
        }

        function localCollarModelPoint(
          weights,
          localAmount
        ) {
          const basePoint =
            blendTrianglePoint(
              modelPoints,
              weights
            );

          const outerPoint =
            blendTrianglePoint(
              outerModelPoints,
              weights
            );

          const fullLocalPoint =
            lerpPoint(
              basePoint,
              outerPoint,
              clampUnit(localAmount)
            );

          return lerpPoint(
            basePoint,
            fullLocalPoint,
            tileExtensionProgress
          );
        }

        function activeRoutedCuspModelPoint(
          weights,
          routeAmount
        ) {
          const basePoint =
            blendTrianglePoint(
              modelPoints,
              weights
            );

          const routedPoint =
            routedCuspModelPoint(
              weights,
              routeAmount
            );

          return lerpPoint(
            basePoint,
            routedPoint,
            tileExtensionProgress
          );
        }

        /*
         * Build one shared perimeter ring for each longitudinal
         * route section. Three edge ribbons later read from this
         * common ring, so the corners remain welded while every
         * interior surface vertex has its own 3D position.
         */
        const cuspRoutePerimeterWeights =
          [
            [0, 1],
            [1, 2],
            [2, 0],
          ].flatMap(
            ([firstIndex, secondIndex]) =>
              Array.from(
                {
                  length:
                    CUSP_MESH_DIVISIONS,
                },
                (_, acrossIndex) =>
                  cuspRouteWeightsForEdge(
                    firstIndex,
                    secondIndex,
                    acrossIndex /
                      CUSP_MESH_DIVISIONS
                  )
              )
          );

        const cuspRoutePerimeterCount =
          cuspRoutePerimeterWeights.length;

        const initialCuspRouteRings =
          Array.from(
            {
              length:
                CUSP_COLLAR_ROUTE_SEGMENTS +
                1,
            },
            (_, segmentIndex) =>
              cuspRoutePerimeterWeights.map(
                (weights) =>
                  activeRoutedCuspModelPoint(
                    weights,
                    segmentIndex /
                      CUSP_COLLAR_ROUTE_SEGMENTS
                  )
              )
          );

        function assembledCuspFunnelModelPoint(
          edgeIndex,
          acrossIndex,
          segmentIndex
        ) {
          const perimeterIndex =
            (
              edgeIndex *
                CUSP_MESH_DIVISIONS +
              acrossIndex
            ) %
            cuspRoutePerimeterCount;

          /*
           * Render the collision-certified route.
           *
           * Certification now moves complete triangular rings;
           * it does not thin them.
           */
          const renderedRouteRings =
            cuspClearRouteRingsByBaseId
              .get(cuspBaseId) ??
            initialCuspRouteRings;

          return renderedRouteRings[
            segmentIndex
          ][perimeterIndex];
        }

        /*
         * MATERIAL IDENTITY OF THIS CUSP TRIANGLE
         *
         * The three incident face colors belong to the three longitudinal
         * provenance directions. The one opposite face color is the actual
         * material carried by the triangle and by the complete funnel.
         */
        const cuspMaterialFacePair =
          cuspTriangleOppositeFacePair(
            cuspBaseId,
            activeFacePairs
          );

        const cuspMaterialFill =
          cuspMaterialFacePair
            ? faceEndpointColor(
                cuspMaterialFacePair,
                tetrahedron.id
              )
            : "rgba(208, 208, 204, 0.72)";

        /*
         * Exact opening-cell source record for the top-level
         * Cells -> Cusp material flight.
         *
         * The point order is the canonical truncation-neighbor order,
         * so each ideal-vertex corner can be matched to the exact
         * corner of the active manifold's final cusp slot.
         */
        cuspFlightSourceTriangles.push({
          id: cuspBaseId,
          color: cuspMaterialFill,

          pointsByCorner:
            Object.fromEntries(
              neighbors.map(
                (
                  neighborIndex,
                  pointIndex
                ) => [
                  neighborIndex,
                  projectedInSpace[
                    pointIndex
                  ],
                ]
              )
            ),

          /*
           * Each side of this truncation triangle lies inside one
           * of the three large tetrahedron faces incident to the
           * ideal vertex.
           *
           * Preserve that ACTUAL face color as edge provenance.
           */
          edgeSegments:
            [0, 1, 2].map(
              (firstIndex) => {
                const secondIndex =
                  (firstIndex + 1) % 3;

                const firstNeighbor =
                  neighbors[firstIndex];

                const secondNeighbor =
                  neighbors[secondIndex];

                return {
                  startCorner:
                    firstNeighbor,

                  endCorner:
                    secondNeighbor,

                  color:
                    cuspTriangleEdgeColor(
                      tetrahedron.id,
                      vertexIndex,
                      firstNeighbor,
                      secondNeighbor,
                      activeFacePairs
                    ),
                };
              }
            ),
        });

        /*
         * Torus ownership is a property of the eight truncation
         * triangles themselves. Build all three sector records here,
         * before any bridge/seam visibility logic is considered.
         * Collapsing, releasing, or suppressing an interior wall may
         * change the compact realization, but it can never remove one
         * of these cusp-torus sectors.
         */


        const torusOverlaySpecs = [
          [0, 1],
          [1, 2],
          [2, 0],
        ].map(
          ([firstIndex, secondIndex], edgeIndex) => {
            const firstNeighbor =
              neighbors[firstIndex];

            const secondNeighbor =
              neighbors[secondIndex];

            const edgePair =
              cuspTriangleEdgePair(
                tetrahedron.id,
                vertexIndex,
                firstNeighbor,
                secondNeighbor,
                activeFacePairs
              );

            return {
              key:
                `${tetrahedron.id}-cusp-torus-sector-` +
                `${vertexIndex}-${edgeIndex}`,
              firstIndex,
              secondIndex,
              edgePair,
              color:
                edgePair
                  ? faceEndpointColor(
                      edgePair,
                      tetrahedron.id
                    )
                  : "rgba(250, 244, 225, 0.96)",
            };
          }
        );

        if (showCuspTriangles) {
          /*
           * Keep the original truncation triangle attached.
           * A second copy moves outward and the three side
           * walls form a triangular cusp collar between them.
           */
          faces.push({
            key:
              `${tetrahedron.id}-cusp-base-` +
              `${vertexIndex}`,
            pair: null,
            cuspBase: true,
            cuspBaseOpacity:
              knotConstructionOpacity *
              (
                1 -
                tileExtensionProgress
              ),
            cuspMaterialColor:
              shadeCuspMaterialColor(
                cuspMaterialFill,
                modelPoints,
                displayView
              ),
            cuspBaseId,
            cuspBaseCenter,
            outwardNormal,
            collarDirection,
            projected: projectedInSpace,
            depth:
              projectedInSpace.reduce(
                (sum, point) =>
                  sum + (point.depth || 0),
                0
              ) / projectedInSpace.length,
          });

          if (
            tileExtensionProgress >
            FACE_CONSTRAINT_EPSILON
          ) {
            torusOverlaySpecs.forEach(
              ({
                firstIndex,
                secondIndex,
                edgePair,
              }, edgeIndex) => {
                const sharedWithPhysicalSeam =
                  edgePair !== null &&
                  edgePair !== undefined &&
                  sharedCuspSeamPairIdSet.has(
                    edgePair.id
                  );

                /*
                 * In the original literal-seam realization, every
                 * collapsed A/B cusp wall coincided and the B copy
                 * could be suppressed. Released-face mode changes
                 * that geometry: only the core anchor seam is still
                 * a literal coincidence on the cell meshes. The other
                 * collapsed pairings are connected through distinct
                 * released-face collars, so both cusp-wall copies must
                 * remain visible and attached to their own cusp bases.
                 */
                const coincidentWithCoreSeam =
                  sharedWithPhysicalSeam &&
                  (
                    !releasedFaceMode ||
                    edgePair.id ===
                      coreAnchorPairId
                  );

                const collarColor =
                  torusOverlaySpecs[
                    edgeIndex
                  ].color;

                if (
                  coincidentWithCoreSeam &&
                  tetrahedron.id === "B"
                ) {
                  return;
                }

                /*
                 * Build each colored wall as a sequence of
                 * triangular cross-sections rather than one
                 * direct sheet.
                 *
                 * The first few sections are the unchanged
                 * straight cusp prism. The routed sections then
                 * carry the same compact edge cross-section along
                 * a 3D centerline and fit it to the curved torus
                 * edge only near the end.
                 */
                const acrossWeights =
                  Array.from(
                    {
                      length:
                        CUSP_MESH_DIVISIONS +
                        1,
                    },
                    (_, acrossIndex) =>
                      cuspRouteWeightsForEdge(
                        firstIndex,
                        secondIndex,
                        acrossIndex /
                          CUSP_MESH_DIVISIONS
                      )
                  );

                const localGrid =
                  acrossWeights.map(
                    (weights) =>
                      Array.from(
                        {
                          length:
                            CUSP_COLLAR_LOCAL_SEGMENTS +
                            1,
                        },
                        (_, segmentIndex) =>
                          localCollarModelPoint(
                            weights,
                            segmentIndex /
                              CUSP_COLLAR_LOCAL_SEGMENTS
                          )
                      )
                  );

                const routeGrid =
                  acrossWeights.map(
                    (_, acrossIndex) =>
                      Array.from(
                        {
                          length:
                            CUSP_COLLAR_ROUTE_SEGMENTS +
                            1,
                        },
                        (_, segmentIndex) =>
                          assembledCuspFunnelModelPoint(
                            edgeIndex,
                            acrossIndex,
                            segmentIndex
                          )
                      )
                  );

                function pushCollarGridCells(
                  grid,
                  segmentCount,
                  segmentKind
                ) {
                  for (
                    let acrossIndex = 0;
                    acrossIndex <
                    CUSP_MESH_DIVISIONS;
                    acrossIndex += 1
                  ) {
                    for (
                      let segmentIndex = 0;
                      segmentIndex <
                      segmentCount;
                      segmentIndex += 1
                    ) {
                      const collarModelPoints = [
                        grid[
                          acrossIndex
                        ][segmentIndex],
                        grid[
                          acrossIndex + 1
                        ][segmentIndex],
                        grid[
                          acrossIndex + 1
                        ][segmentIndex + 1],
                        grid[
                          acrossIndex
                        ][segmentIndex + 1],
                      ];

                      const collarProjected =
                        collarModelPoints.map(
                          (point) =>
                            projectPoint(
                              point,
                              displayView
                            )
                        );

                      const collarMaterialColor =
                        shadeCuspMaterialColor(
                          cuspMaterialFill,
                          collarModelPoints,
                          displayView
                        );

                      faces.push({
                        key:
                          `${tetrahedron.id}-cusp-collar-` +
                          `${vertexIndex}-${edgeIndex}-` +
                          `${segmentKind}-` +
                          `${acrossIndex}-${segmentIndex}`,
                        pair: null,
                        cuspCollar: true,
                        cuspBaseId,
                        cuspTileAssemblyProgress:
                          tileAssemblyProgress,
                        cuspCollarEdgeIndex:
                          edgeIndex,
                        cuspCollarAcrossIndex:
                          acrossIndex,
                        cuspCollarSegmentIndex:
                          segmentIndex,
                        cuspCollarSegmentKind:
                          segmentKind,
                        cuspCollarAcrossDivisions:
                          CUSP_MESH_DIVISIONS,
                        cuspCollarSegmentCount:
                          segmentCount,
                        /*
                         * Surface hue is intrinsic to the triangle.
                         * Provenance hue belongs only to the longitudinal
                         * rulings drawn over this surface.
                         */
                        cuspMaterialColor:
                          collarMaterialColor,
                        cuspMaterialBaseColor:
                          cuspMaterialFill,
                        cuspProvenanceColor:
                          collarColor,
                        cuspCollarColor:
                          collarColor,
                        cuspCollarOpacity: 1,
                        cuspCollarSharedFace:
                          coincidentWithCoreSeam,
                        cuspCollarModelPoints:
                          collarModelPoints,
                        projected: collarProjected,
                        depth:
                          collarProjected.reduce(
                            (sum, point) =>
                              sum +
                              (point.depth || 0),
                            0
                          ) /
                          collarProjected.length,
                      });
                    }
                  }

                  /*
                   * VISUAL GRID
                   *
                   * Longitudinal rulings:
                   *   color = incident-face / edge provenance.
                   *
                   * Cross-sectional rulings:
                   *   color = intrinsic material-face color.
                   *
                   * This grid is deliberately much coarser than the
                   * computational tessellation.
                   */
                  function pushFunnelGridPolyline(
                    modelLinePoints,
                    color,
                    kind,
                    keySuffix,
                    width,
                    opacity
                  ) {
                    const projectedLine =
                      modelLinePoints.map(
                        (point) =>
                          projectPoint(
                            point,
                            displayView
                          )
                      );

                    faces.push({
                      key:
                        `${tetrahedron.id}-cusp-funnel-grid-` +
                        `${vertexIndex}-${edgeIndex}-` +
                        `${segmentKind}-${keySuffix}`,
                      pair: null,
                      cuspFunnelGridLine: true,
                      cuspBaseId,
                      cuspFunnelGridKind: kind,
                      cuspFunnelGridColor: color,
                      cuspFunnelGridWidth: width,
                      cuspFunnelGridOpacity: opacity,
                      projected: projectedLine,
                      depth:
                        projectedLine.reduce(
                          (sum, point) =>
                            sum +
                            (point.depth || 0),
                          0
                        ) /
                          projectedLine.length -
                        0.18,
                    });
                  }

                  /*
                   * Five longitudinal rulings across each wall:
                   *
                   *   0, 2, 4, 6, 8
                   *
                   * They all inherit THIS wall's provenance color.
                   */
                  const longitudinalIndices =
                    Array.from(
                      {
                        length:
                          CUSP_MESH_DIVISIONS + 1,
                      },
                      (_, index) => index
                    ).filter(
                      (index) =>
                        index === 0 ||
                        index ===
                          CUSP_MESH_DIVISIONS ||
                        index %
                          CUSP_FUNNEL_LONGITUDINAL_GRID_STRIDE ===
                          0
                    );

                  longitudinalIndices.forEach(
                    (acrossIndex) => {
                      pushFunnelGridPolyline(
                        grid[acrossIndex],
                        collarColor,
                        "longitudinal",
                        `long-${acrossIndex}`,
                        1.0,
                        0.90
                      );
                    }
                  );

                  /*
                   * Cross-sectional rings use the material color.
                   *
                   * The short straight extrusion receives a few more;
                   * the long curved funnel is sampled more sparsely.
                   */
                  const crossStride =
                    segmentKind === "local"
                      ? CUSP_FUNNEL_LOCAL_CROSS_GRID_STRIDE
                      : CUSP_FUNNEL_ROUTE_CROSS_GRID_STRIDE;

                  for (
                    let segmentIndex = 0;
                    segmentIndex <=
                    segmentCount;
                    segmentIndex +=
                      crossStride
                  ) {
                    pushFunnelGridPolyline(
                      grid.map(
                        (acrossLine) =>
                          acrossLine[
                            Math.min(
                              segmentIndex,
                              segmentCount
                            )
                          ]
                      ),
                      cuspMaterialFill,
                      "cross",
                      `cross-${segmentIndex}`,
                      0.78,
                      0.72
                    );
                  }

                  /*
                   * Always draw the final cross-section even when the
                   * stride does not divide the segment count exactly.
                   */
                  if (
                    segmentCount %
                      crossStride !==
                    0
                  ) {
                    pushFunnelGridPolyline(
                      grid.map(
                        (acrossLine) =>
                          acrossLine[
                            segmentCount
                          ]
                      ),
                      cuspMaterialFill,
                      "cross",
                      `cross-${segmentCount}`,
                      0.78,
                      0.72
                    );
                  }
                }

                pushCollarGridCells(
                  localGrid,
                  CUSP_COLLAR_LOCAL_SEGMENTS,
                  "local"
                );

                /*
                 * Before Meridian/Longitude begins, every routed
                 * section is collapsed onto the local outer
                 * triangle. It therefore contributes zero area.
                 * As the peripheral identification progresses,
                 * these sections open along the routed centerline.
                 */
                pushCollarGridCells(
                  routeGrid,
                  CUSP_COLLAR_ROUTE_SEGMENTS,
                  "route"
                );
              }
            );
          }

          function cuspModelPointFromWeights(
            weights
          ) {
            /*
             * ========================================================
             * ONE MATERIAL POINT
             * ========================================================
             *
             * weights are the persistent barycentric coordinates of
             * this point inside its cusp triangle.
             *
             * sourcePoint:
             *   exact point on the truncation triangle.
             *
             * targetPoint:
             *   the SAME material address in the assembled flat cusp.
             *
             * targetPoint is obtained from attachedCuspTargetPoint(),
             * which is also the stage-zero endpoint of the connected
             *
             *   flat -> cylinder -> figure-eight
             *
             * map. Therefore there is no representation change here.
             */
            const sourcePoint =
              blendTrianglePoint(
                modelPoints,
                weights
              );

            const targetPoint =
              blendTrianglePoint(
                cuspRouteTargetPoints,
                weights
              );

            /*
             * Extend and Assemble divide one motion into two intervals.
             *
             * end Extend:
             *   transportAmount = 1/2
             *
             * end Assemble:
             *   transportAmount = 1
             */
            const transportAmount =
              clampUnit(
                CUSP_EXTEND_TRANSPORT_FRACTION *
                  tileExtensionProgress +
                (
                  1 -
                  CUSP_EXTEND_TRANSPORT_FRACTION
                ) *
                  tileAssemblyProgress
              );

            return lerpPoint(
              sourcePoint,
              targetPoint,
              smootherUnitInterval(
                transportAmount
              )
            );
          }


          function projectCuspWeights(weights) {
            /*
             * The visible outer triangle is literally the terminal ring
             * of its permanent attachment route. The cap therefore moves
             * along the same collision-checked path as the collar and can
             * never become a detached straight-line copy.
             */
            return projectPoint(
              cuspModelPointFromWeights(
                weights
              ),
              displayView
            );
          }

          /*
           * The three colored attachment walls continue onto the
           * torus itself.  During the second peripheral
           * identification each wall grows a matching sector from
           * its torus edge toward the tile centroid.  At completion
           * the three sectors partition the whole cusp triangle,
           * while the dark torus remains underneath as the visual
           * envelope.
           */
          /*
           * The three incident face colors remain on the three boundary
           * edges and on the longitudinal provenance rulings. The funnel
           * surface itself carries the unique fourth/opposite face color,
           * exactly like the source and terminal triangles.
           */

          /*
           * MATERIAL COLOR IS FIXED.
          /*
           * MATERIAL COLOR IS FIXED.
           *
           * This triangle does not become a different color when
           * the planar cusp is rolled into the cylinder.
           *
           * Use exactly the same intrinsic cusp-triangle color
           * here that the completed connected tube uses later.
           */
          const tileFacePair =
            cuspTriangleOppositeFacePair(
              cuspBaseId,
              activeFacePairs
            );

          const tileFill =
            tileFacePair
              ? faceEndpointColor(
                  tileFacePair,
                  tetrahedron.id
                )
              : "rgba(208, 208, 204, 0.72)";

          /*
           * ONE PERSISTENT MATERIAL TRIANGLE
           *
           * Every truncation triangle already carries all four
           * face colors:
           *
           *   • its three edges inherit the three incident faces;
           *   • its interior inherits the one opposite face.
           *
           * Keep that exact material triangle continuously visible
           * from the truncation face through Extend cusps and through
           * sequential planar assembly.
           *
           * At completed Assemble, the connected high-resolution cusp
           * mesh occupies exactly the same flat material surface and
           * takes over for the cylinder and figure-eight stages.
           */
          const materialTileOpacity =
            tileMaterialRevealProgress *
            (
              1 -
              connectedCuspSurfaceVisibility
            );

          CUSP_MESH_CELLS.forEach(
            (cell, cellIndex) => {
              /*
               * Keep the actual 3D triangle long enough to compute
               * its illumination before projecting it to SVG.
               */
              const meshModelPoints =
                cell.map(
                  cuspModelPointFromWeights
                );

              const meshProjected =
                meshModelPoints.map(
                  (modelPoint) =>
                    projectPoint(
                      modelPoint,
                      displayView
                    )
                );

              const meshDepth =
                meshProjected.reduce(
                  (sum, point) =>
                    sum +
                    (point.depth || 0),
                  0
                ) /
                meshProjected.length;

              const shadedTileFill =
                shadeCuspMaterialColor(
                  tileFill,
                  meshModelPoints,
                  displayView
                );

              cuspMeshFaces.push({
                key:
                  `${tetrahedron.id}-` +
                  `${vertexIndex}-mesh-` +
                  `${cellIndex}`,

                projected:
                  meshProjected,

                /*
                 * Same intrinsic color.
                 * Only brightness depends on 3D orientation.
                 */
                fill:
                  shadedTileFill,

                /*
                 * This is the same material triangle as the
                 * depth-sorted copy below.
                 *
                 * It must obey the source-registration clock too;
                 * otherwise an already-large detached triangle
                 * appears on the first animation frame.
                 */
                opacity:
                  materialTileOpacity,

                connectedCuspSurface: false,

                depth:
                  meshDepth,
              });

              /*
               * The ordinary cusp mesh above is painted before
               * rendered.faces. That allowed the three colored
               * collar walls to paint over this otherwise-solid
               * material triangle.
               *
               * Put the assembled material tile into the SAME
               * painter-order stack as those walls.
               *
               * A tiny forward depth bias resolves the intentional
               * coplanar meeting at the triangle boundary in favor
               * of the material face. Truly nearer 3D surfaces still
               * occlude it normally.
               */
              if (
                materialTileOpacity >
                FACE_CONSTRAINT_EPSILON
              ) {
                faces.push({
                  key:
                    `${tetrahedron.id}-` +
                    `${vertexIndex}-material-tile-` +
                    `${cellIndex}`,

                  pair: null,

                  cuspMaterialTile: true,

                  cuspBaseId,

                  cuspMaterialColor:
                    shadedTileFill,

                  cuspMaterialOpacity:
                    materialTileOpacity,

                  projected:
                    meshProjected,

                  /*
                   * Slightly camera-forward so the actual material
                   * face owns its boundary over the trailing
                   * extension scaffold.
                   */
                  depth:
                    meshDepth - 0.9,
                });
              }
            }
          );

          const edgeVertexPairs = [
            [0, 1],
            [1, 2],
            [2, 0],
          ];

          /*
           * Find the edge through which this tile joins the
           * already-assembled portion of the planar development.
           *
           * Two equal target vertices uniquely identify that edge.
           */
          const assemblyIndex =
            cuspAssemblyOrder.indexOf(
              cuspBaseId
            );

          let assemblyAttachmentCorners =
            new Set();

          if (assemblyIndex > 0) {
            const currentLayout =
              cuspFlatLayout[cuspBaseId] ??
              {};

            for (
              let previousIndex =
                assemblyIndex - 1;
              previousIndex >= 0;
              previousIndex -= 1
            ) {
              const previousId =
                cuspAssemblyOrder[
                  previousIndex
                ];

              const previousPointKeys =
                new Set(
                  Object.values(
                    cuspFlatLayout[
                      previousId
                    ] ?? {}
                  ).map(
                    cuspLayoutPointKey
                  )
                );

              const sharedCorners =
                neighbors
                  .map(
                    (
                      neighborIndex,
                      localIndex
                    ) => {
                      const currentPoint =
                        currentLayout[
                          neighborIndex
                        ];

                      if (!currentPoint) {
                        return -1;
                      }

                      return previousPointKeys.has(
                        cuspLayoutPointKey(
                          currentPoint
                        )
                      )
                        ? localIndex
                        : -1;
                    }
                  )
                  .filter(
                    (localIndex) =>
                      localIndex >= 0
                  );

              if (
                sharedCorners.length === 2
              ) {
                assemblyAttachmentCorners =
                  new Set(
                    sharedCorners
                  );

                break;
              }
            }
          }

          /*
           * The attaching edge swells briefly while the triangle
           * is moving, then returns to normal width when seated.
           */
          const assemblyEdgeHighlight =
            assembleCusp
              ? Math.sin(
                  Math.PI *
                    clampUnit(
                      tileAssemblyProgress
                    )
                )
              : 0;

          const curvedEdges =
            edgeVertexPairs.map(
              ([startIndex, endIndex]) => {
                const firstNeighbor =
                  neighbors[startIndex];

                const secondNeighbor =
                  neighbors[endIndex];

                return {
                  color:
                    cuspTriangleEdgeColor(
                      tetrahedron.id,
                      vertexIndex,
                      firstNeighbor,
                      secondNeighbor,
                      activeFacePairs
                    ),

                  assemblyAttachmentEdge:
                    assemblyAttachmentCorners.has(
                      startIndex
                    ) &&
                    assemblyAttachmentCorners.has(
                      endIndex
                    ),

                  points: Array.from(
                    {
                      length:
                        CUSP_EDGE_SAMPLES + 1,
                    },
                    (_, sampleIndex) => {
                      const amount =
                        sampleIndex /
                        CUSP_EDGE_SAMPLES;

                      const weights = [
                        0,
                        0,
                        0,
                      ];

                      weights[startIndex] =
                        1 - amount;

                      weights[endIndex] =
                        amount;

                      return projectCuspWeights(
                        weights
                      );
                    }
                  ),
                };
              }
            );

          /*
           * Before the connected cusp mesh takes ownership, these
           * are the actual material edges of the moving triangle.
           *
           * Downsample the display curve slightly: 40 segments per
           * edge is visually smooth and far lighter than 160 SVG
           * line objects per edge.
           */
          if (
            materialTileOpacity >
            FACE_CONSTRAINT_EPSILON
          ) {
            curvedEdges.forEach(
              (edge, edgeIndex) => {
                const materialEdgePoints =
                  edge.points.filter(
                    (_, pointIndex) =>
                      pointIndex % 4 === 0 ||
                      pointIndex ===
                        edge.points.length - 1
                  );

                projectedPolylineSegments(
                  materialEdgePoints,
                  `material-edge-${cuspBaseId}-${edgeIndex}`,
                  1.15
                ).forEach(
                  (segment) => {
                    faces.push({
                      key:
                        `material-edge-` +
                        `${cuspBaseId}-` +
                        `${edgeIndex}-` +
                        `${segment.key}`,

                      pair: null,

                      cuspMaterialEdge: true,

                      cuspBaseId,

                      cuspMaterialEdgeColor:
                        edge.color,

                      cuspMaterialEdgeOpacity:
                        materialTileOpacity,

                      cuspMaterialEdgeWidth:
                        1.8 +
                        (
                          edge
                            .assemblyAttachmentEdge
                            ? 2.2 *
                              assemblyEdgeHighlight
                            : 0
                        ),

                      projected:
                        segment.points,

                      depth:
                        segment.depth,
                    });
                  }
                );
              }
            );
          }

          const outlinePoints =
            curvedEdges.flatMap(
              (edge) => edge.points
            );

          cuspTriangleOutlines.push({
            key:
              `${tetrahedron.id}-` +
              `${vertexIndex}-outline`,
            edges: curvedEdges,
            depth:
              outlinePoints.reduce(
                (sum, point) =>
                  sum +
                  (point.depth || 0),
                0
              ) / outlinePoints.length,
          });
        } else {
          faces.push({
            key: `${tetrahedron.id}-cusp-${vertexIndex}`,
            pair: null,
            projected,
            depth:
              projected.reduce(
                (sum, point) =>
                  sum +
                  (point.depth || 0),
                0
              ) / projected.length,
          });
        }

        if (!showCuspTriangles) {
          labels.push({
            key: `${tetrahedron.id}-${vertexIndex}`,

            /*
             * Keep the annotation tied to the cell that owns it.
             * Collision separation later uses this identity so an
             * A/B coincidence separates toward the two tetrahedra,
             * rather than arbitrarily left/right on the screen.
             */
            tetrahedronId:
              tetrahedron.id,

            text: String(
              displayedTetrahedronVertexLabel(
                tetrahedron.id,
                vertexIndex
              )
            ),

            point: projectPoint(
              centeredIdealVertexPoint(
                tetrahedron,
                vertexIndex
              ),
              displayView
            ),

            /*
             * Visibility always belongs to the real geometric
             * vertex, not to the later screen-space annotation
             * displacement.
             */
            anchorPoint: projectPoint(
              centeredIdealVertexPoint(
                tetrahedron,
                vertexIndex
              ),
              displayView
            ),
          });
        }
      });

      /*
       * Use all twelve truncated vertices to locate
       * the current projected body of this tetrahedron.
       * The callout therefore follows the complete
       * deformed tetrahedron rather than a fixed point.
       */
      const tetrahedronProjectedPoints =
        mesh.vertices
          .map((vertex) =>
            centeredWorldPoint(
              vertex.point,
              tetrahedron
            )
          )
          .map((point) =>
            projectPoint(
              point,
              displayView
            )
          );

      callouts.push({
        key: `${tetrahedron.id}-callout`,
        ...makeTetrahedronCallout(
          tetrahedron.id,
          tetrahedronProjectedPoints
        ),
        /*
         * Keep the tetrahedron identity labels visible while the
         * cells move into a face identification.
         *
         * Their positions already follow the complete projected
         * body of each moving tetrahedron, so there is no reason
         * to fade them during pairing.
         *
         * They still disappear when the construction advances to
         * the cusp-triangle stage, where A/B no longer serve as
         * useful cell callouts.
         */
        opacity:
          showCuspTriangles
            ? 0
            : 1,
      });
    });

    /*
     * Interior continuation will be animated directly on the
     * bridge's existing sequential longitudinal segments. Stage
     * one leaves them static so the face-color bridge itself can
     * be inspected before a pulse is added.
     */

    /*
     * After Assemble cusp the eight independently moving caps are
     * replaced by one canonical connected mesh.  Every vertex is
     * evaluated from the intrinsic cusp coordinate under the same
     * flat/cylinder/torus map, so shared tile edges are literally
     * the same geometric boundary and the completed surface is a
     * closed torus (with no geometric cut-away windows).
     */
    if (
      showCuspTriangles &&
      connectedCuspSurfaceVisibility >
        FACE_CONSTRAINT_EPSILON
    ) {
      /*
       * The resting object uses the exact slider-selected count.
       * During the long weave, use the lighter animation mesh
       * whenever the selected count is denser than 4,608 facets.
       */
      const connectedCuspAnimationActive =
        knotEmbeddingProgress >
          FACE_CONSTRAINT_EPSILON &&
        knotEmbeddingProgress <
          1 - FACE_CONSTRAINT_EPSILON;

      const connectedCuspMesh =
        connectedCuspAnimationActive
          ? connectedCuspMeshes.animation
          : connectedCuspMeshes.stationary;


      /*
       * A dense triangulation shares most of its vertices.
       *
       * Previously each triangle independently called
       * attachedCuspTargetPoint() and projectPoint() for all
       * three corners. That meant tens of thousands of repeated
       * S3/material transforms on every animation frame.
       *
       * Cache by the CURRENT intrinsic cusp coordinate so one
       * material vertex is transformed exactly once per frame.
       */
      const connectedCuspVertexCache =
        new Map();

      const connectedCuspRawCornerCache =
        new Map();

      const connectedCuspStyleCache =
        new Map();


      function connectedCuspRawCorners(
        cuspBaseId
      ) {
        const cached =
          connectedCuspRawCornerCache.get(
            cuspBaseId
          );

        if (cached) {
          return cached;
        }

        const tetrahedronId =
          cuspBaseId[0];

        const vertexIndex =
          Number(
            cuspBaseId.slice(1)
          );

        const rawCorners =
          TRUNCATION_NEIGHBORS[
            vertexIndex
          ].map(
            (neighborIndex) =>
              rawCuspPointFromLayout(
                cuspFlatLayout,
                tetrahedronId,
                vertexIndex,
                neighborIndex
              )
          );

        connectedCuspRawCornerCache.set(
          cuspBaseId,
          rawCorners
        );

        return rawCorners;
      }


      function connectedCuspStyle(
        cuspBaseId
      ) {
        const cached =
          connectedCuspStyleCache.get(
            cuspBaseId
          );

        if (cached) {
          return cached;
        }

        const tetrahedronId =
          cuspBaseId[0];

        const oppositeFacePair =
          cuspTriangleOppositeFacePair(
            cuspBaseId,
            activeFacePairs
          );

        const style = {
          fill:
            oppositeFacePair
              ? faceEndpointColor(
                  oppositeFacePair,
                  tetrahedronId
                )
              : "rgba(208, 208, 204, 0.72)",

          pairId:
            oppositeFacePair
              ? oppositeFacePair.id
              : null,
        };

        connectedCuspStyleCache.set(
          cuspBaseId,
          style
        );

        return style;
      }


      function connectedCuspVertexRecord(
        rawPoint
      ) {
        const key =
          cuspConnectedVertexKey(
            rawPoint
          );

        const cached =
          connectedCuspVertexCache.get(
            key
          );

        if (cached !== undefined) {
          return cached;
        }

        /*
         * Preserve the existing stereographic-pole clipping
         * behavior for the later Projection path.
         */
        const visible =
          !(
            effectiveKnotProjectionProgress >
              FACE_CONSTRAINT_EPSILON &&
            !figureEightKnotBoundaryProjectionVisible(
              rawPoint,
              effectiveKnotProjectionProgress,
              activeCuspCoordinateSpec
            )
          );

        if (!visible) {
          const hiddenRecord = {
            visible: false,
            projected: null,
          };

          connectedCuspVertexCache.set(
            key,
            hiddenRecord
          );

          return hiddenRecord;
        }

        const modelPoint =
          attachedCuspTargetPoint(
            rawPoint
          );

        const projected =
          projectPoint(
            modelPoint,
            displayView
          );

        const record = {
          visible: true,
          modelPoint,
          projected,
        };

        connectedCuspVertexCache.set(
          key,
          record
        );

        return record;
      }


      connectedCuspMesh.faces.forEach(
        (meshFace) => {
          const rawCorners =
            connectedCuspRawCorners(
              meshFace.cuspBaseId
            );

          const rawPoints =
            meshFace.weights.map(
              (weights) =>
                blendTrianglePoint(
                  rawCorners,
                  weights
                )
            );

          const vertexRecords =
            rawPoints.map(
              connectedCuspVertexRecord
            );

          /*
           * A facet touching the stereographic pole is omitted,
           * exactly as before.
           */
          if (
            vertexRecords.some(
              (record) =>
                !record.visible
            )
          ) {
            return;
          }

          const meshProjected =
            vertexRecords.map(
              (record) =>
                record.projected
            );

          const meshModelPoints =
            vertexRecords.map(
              (record) =>
                record.modelPoint
            );

          const style =
            connectedCuspStyle(
              meshFace.cuspBaseId
            );

          cuspMeshFaces.push({
            key: meshFace.key,

            cuspBaseId:
              meshFace.cuspBaseId,

            projected:
              meshProjected,

            /*
             * Real per-facet 3D illumination.
             *
             * style.fill remains the intrinsic material color;
             * the light only changes its displayed brightness.
             */
            fill:
              shadeCuspMaterialColor(
                style.fill,
                meshModelPoints,
                displayView
              ),

            opacity:
              connectedCuspSurfaceVisibility,

            /*
             * The tiny triangulation grid is useful when the
             * surface is stationary, but painting thousands of
             * nearly-transparent strokes while the tube moves is
             * wasted browser work and contributes visibly to
             * dropped frames.
             */
            strokeOpacity:
              connectedCuspAnimationActive
                ? 0
                : (
                    0.08 +
                    0.10 *
                      torusSurfaceProgress +
                    0.10 *
                      connectedCuspSurfaceProgress
                  ),

            connectedCuspSurface: true,

            depth:
              meshProjected.reduce(
                (sum, point) =>
                  sum +
                  (point.depth || 0),
                0
              ) /
              meshProjected.length,
          });
        }
      );
    }

    /*
     * ============================================================
     * AUTHORITATIVE COLORED BOUNDARY TRIANGULATION
     * ============================================================
     *
     * The connected cusp mesh is already the solved triangulation
     * of the complete torus.
     *
     * Every mesh face carries exactly one cuspBaseId:
     *
     *   A0 ... A3
     *   B0 ... B3
     *
     * and each cuspBaseId belongs to exactly one of the four
     * canonical face pairs:
     *
     *   Orange
     *   Blue
     *   Green
     *   Red
     *
     * There are no material edge cases here.
     *
     * For the completed Boundary view, map this exact triangulation
     * directly onto the exact figure-eight S3 tube.
     */
    if (
      (
        constructiveFinalDisplayActive ||
        canonicalCellShellMode !== null
      ) &&
      activeManifold.id === "m004" &&
      connectedCuspMeshes.stationary
    ) {
      const certifiedBoundaryMesh =
        connectedCuspMeshes.stationary;

      const certifiedBoundaryVertexCache =
        new Map();

      const certifiedBoundaryRawCornerCache =
        new Map();


      function certifiedBoundaryRawCorners(
        cuspBaseId
      ) {
        const cached =
          certifiedBoundaryRawCornerCache.get(
            cuspBaseId
          );

        if (cached) {
          return cached;
        }

        const tetrahedronId =
          cuspBaseId[0];

        const vertexIndex =
          Number(
            cuspBaseId.slice(1)
          );

        const rawCorners =
          TRUNCATION_NEIGHBORS[
            vertexIndex
          ].map(
            (neighborIndex) =>
              rawCuspPointFromLayout(
                cuspFlatLayout,
                tetrahedronId,
                vertexIndex,
                neighborIndex
              )
          );

        certifiedBoundaryRawCornerCache.set(
          cuspBaseId,
          rawCorners
        );

        return rawCorners;
      }


      function certifiedBoundaryVertexRecord(
        rawPoint
      ) {
        const key =
          cuspConnectedVertexKey(
            rawPoint
          );

        const cached =
          certifiedBoundaryVertexCache.get(
            key
          );

        if (cached !== undefined) {
          return cached;
        }

        const tubeCoordinates =
          cuspTubeCoordinates(
            rawPoint,
            activeCuspCoordinateSpec
          );

        if (!tubeCoordinates) {
          const record = {
            visible: false,
            projected: null,
          };

          certifiedBoundaryVertexCache.set(
            key,
            record
          );

          return record;
        }

        /*
         * This is the SAME exact S3 tube used by the constructive
         * boundary correspondence and Projection Lab.
         */
        const modelPoint =
          figureEightReferenceModelPoint(
            figureEightReferenceTubePoint4(
              tubeCoordinates.routeAmount,
              tubeCoordinates.minorAngle
            ),
            effectiveKnotProjectionProgress
          );

        const projected =
          projectPoint(
            modelPoint,
            displayView
          );

        const visible =
          Number.isFinite(
            projected.x
          ) &&
          Number.isFinite(
            projected.y
          );

        const record = {
          visible,
          modelPoint,

          projected:
            visible
              ? projected
              : null,
        };

        certifiedBoundaryVertexCache.set(
          key,
          record
        );

        return record;
      }


      certifiedBoundaryMesh.faces.forEach(
        (meshFace) => {
          const rawCorners =
            certifiedBoundaryRawCorners(
              meshFace.cuspBaseId
            );

          const rawPoints =
            meshFace.weights.map(
              (weights) =>
                blendTrianglePoint(
                  rawCorners,
                  weights
                )
            );

          const vertexRecords =
            rawPoints.map(
              certifiedBoundaryVertexRecord
            );

          if (
            vertexRecords.some(
              (record) =>
                !record.visible
            )
          ) {
            return;
          }

          /*
           * THIS is the material assignment.
           *
           * Not vertex membership.
           * Not clipping.
           * Not a screen-space test.
           *
           * The source cusp triangle owns the complete mesh face.
           */
          const pair =
            cuspTriangleOppositeFacePair(
              meshFace.cuspBaseId,
              activeFacePairs
            );

          if (!pair) {
            return;
          }

          const tetrahedronId =
            meshFace.cuspBaseId[0];

          const meshProjected =
            vertexRecords.map(
              (record) =>
                record.projected
            );

          const canonicalShellActive =
            canonicalCellShellMode !==
            null;

          const canonicalShellOwnerVisible =
            canonicalCellShellMode ===
              "both" ||
            canonicalCellShellMode ===
              tetrahedronId;

          /*
           * These colors identify the two 3-cells themselves.
           * Orange/Blue/Green/Red remain reserved for the four
           * portions of their common internal boundary.
           */
          const canonicalShellFill =
            tetrahedronId === "A"
              ? "#9fcfff"
              : "#d7b8ff";


          cuspMeshFaces.push({
            key:
              `certified-boundary-${meshFace.key}`,

            cuspBaseId:
              meshFace.cuspBaseId,

            canonicalCellOwner:
              tetrahedronId,

            boundaryPairId:
              pair.id,

            projected:
              meshProjected,

            /*
             * Ordinary Boundary view keeps the four canonical face
             * colors.
             *
             * Canonical-cell shell mode instead reveals which outer
             * cusp patches belong to cell A and which belong to B.
             */
            fill:
              canonicalShellActive
                ? canonicalShellFill
                : faceEndpointColor(
                    pair,
                    tetrahedronId
                  ),

            opacity:
              canonicalShellActive
                ? (
                    canonicalShellOwnerVisible
                      ? (
                          canonicalCellShellMode ===
                            "both"
                            ? 0.52
                            : 0.72
                        )
                      : 0
                  )
                : 1,

            /*
             * The fine tessellation is computational structure,
             * not the boundary we are teaching here.
             */
            strokeOpacity:
              canonicalShellActive
                ? (
                    canonicalShellOwnerVisible
                      ? 0.06
                      : 0
                  )
                : 0.28,

            connectedCuspSurface: true,
            certifiedCanonicalBoundary: true,

            depth:
              meshProjected.reduce(
                (sum, point) =>
                  sum +
                  (point.depth || 0),
                0
              ) /
              meshProjected.length,
          });
        }
      );
    }


    /*
     * Each ordered large-face pairing induces three
     * edge pairings among the truncation triangles.
     *
     * Color identifies the large-face pair and carries
     * the edge correspondence without additional hash marks.
     */
    if (releasedFaceMode) {
      releasedFaceModels.forEach(
        (model) => {
          const pair =
            activeFacePairs[
              model.pairId
            ];

          function pushReleasedFace({
            key,
            points,
            kind,
            opacity,
            color = pair.color,
          }) {
            const projected =
              points
                .map((point) =>
                  subtractPoint(
                    point,
                    sceneCenter
                  )
                )
                .map((point) =>
                  projectPoint(
                    point,
                    displayView
                  )
                );

            faces.push({
              key,
              pair,
              releasedColor: color,
              releasedIdentification: true,
              releasedIdentificationKind:
                kind,
              releasedIdentificationOpacity:
                opacity,
              projected,
              depth:
                projected.reduce(
                  (sum, point) =>
                    sum + point.depth,
                  0
                ) /
                projected.length,
            });
          }

          model.collarFaces.forEach(
            (collarFace) =>
              pushReleasedFace({
                key: collarFace.key,
                points:
                  collarFace.points,
                kind: "collar",
                opacity:
                  0.2 * model.strength,
              })
          );

          if (
            model.strength <
            FACE_VALIDITY_FULL_STRENGTH
          ) {
            pushReleasedFace({
              key:
                `released-${model.pairId}-face-A`,
              points: model.releasedA,
              kind: "moving-face",
              color:
                faceEndpointColor(
                  pair,
                  "A"
                ),
              opacity:
                0.32 * model.strength,
            });

            pushReleasedFace({
              key:
                `released-${model.pairId}-face-B`,
              points: model.releasedB,
              kind: "moving-face",
              color:
                faceEndpointColor(
                  pair,
                  "B"
                ),
              opacity:
                0.32 * model.strength,
            });
          }

          if (
            model.strength >=
            FACE_VALIDITY_FULL_STRENGTH
          ) {
            pushReleasedFace({
              key:
                `released-${model.pairId}-shared-face`,
              points: model.sharedFace,
              kind: "shared-face",
              opacity: 0.5,
            });
          }
        }
      );
    }

    if (showCuspTriangles) {
      activeFacePairs.forEach(
        (pair) => {
          [0, 1, 2].forEach(
            (localVertexIndex) => {
              const vertexA =
                pair.A[
                  localVertexIndex
                ];

              const vertexB =
                pair.B[
                  localVertexIndex
                ];

              const neighborPositions = [
                (localVertexIndex + 1) % 3,
                (localVertexIndex + 2) % 3,
              ];

              const segmentAInSpace =
                cuspSegmentForFace(
                  pair.A,
                  localVertexIndex,
                  truncatedGeometry
                    .truncationFraction
                )
                  .map((point) =>
                    centeredWorldPoint(
                      point,
                      sceneTetrahedra[0]
                    )
                  )
                  .map((point) =>
                    projectPoint(
                      point,
                      displayView
                    )
                  );

              const segmentBInSpace =
                cuspSegmentForFace(
                  pair.B,
                  localVertexIndex,
                  truncatedGeometry
                    .truncationFraction
                )
                  .map((point) =>
                    centeredWorldPoint(
                      point,
                      sceneTetrahedra[1]
                    )
                  )
                  .map((point) =>
                    projectPoint(
                      point,
                      displayView
                    )
                  );

              /*
               * These colored edges belong to the
               * attached cusp bases, so they do not travel
               * with the moving outer collar triangles.
               */
              const segmentA =
                segmentAInSpace;

              const segmentB =
                segmentBInSpace;

              cuspEdgeMatches.push({
                key:
                  `${pair.id}-` +
                  `${localVertexIndex}`,
                color: pair.color,

                colors: [
                  faceEndpointColor(
                    pair,
                    "A"
                  ),
                  faceEndpointColor(
                    pair,
                    "B"
                  ),
                ],

                segments: [
                  segmentA,
                  segmentB,
                ],
              });
            }
          );
        }
      );
    }

    /*
     * Center the geometry actually visible after all
     * current deformation, projection, and interpolation.
     *
     * Model-space centering does not guarantee that the
     * projected screen-space bounds remain centered under
     * perspective. Measure the rendered geometry for this
     * exact frame and correct its vertical position.
     *
     * In cusp mode, use the cusp mesh itself. In ordinary
     * tetrahedron and face-pair modes, use all projected
     * faces of the current complex.
     */
    /*
     * Cusp triangles are initially just another visible layer on the
     * same construction. Merely revealing them must not hand camera
     * ownership to a different set of bounds.
     *
     * Once Extend begins, include the moving cusp mesh in the full
     * construction bounds. During the first peripheral wrap, visual
     * ownership transfers continuously to the connected cusp surface;
     * make the camera follow that same continuous transfer.
     */
    const constructionCenteringPoints =
      faces.flatMap(
        (face) => face.projected
      );

    const cuspCenteringPoints =
      cuspMeshFaces
        .filter(
          (meshFace) =>
            (
              meshFace.opacity ??
              1
            ) >
            FACE_CONSTRAINT_EPSILON
        )
        .flatMap(
          (meshFace) =>
            meshFace.projected
        );

    const cuspCenteringActive =
      showCuspTriangles &&
      extendCusp &&
      cuspCenteringPoints.length > 0;

    const centeringPoints =
      cuspCenteringActive
        ? [
            ...constructionCenteringPoints,
            ...cuspCenteringPoints,
          ]
        : constructionCenteringPoints;

    const fullSceneCenteringBounds =
      projectedBounds(
        centeringPoints
      );

    const cuspOnlyCenteringBounds =
      projectedBounds(
        cuspCenteringPoints
      );

    const cuspCenteringOwnership =
      cuspCenteringActive
        ? clampUnit(
            connectedCuspSurfaceProgress
          )
        : 0;

    const visibleSceneBounds =
      cuspCenteringOwnership >
      FACE_CONSTRAINT_EPSILON
        ? interpolateProjectedBounds(
            fullSceneCenteringBounds,
            cuspOnlyCenteringBounds,
            cuspCenteringOwnership
          )
        : fullSceneCenteringBounds;

    const visibleSceneCenter = {
      x:
        (
          visibleSceneBounds.minX +
          visibleSceneBounds.maxX
        ) / 2,
      y:
        (
          visibleSceneBounds.minY +
          visibleSceneBounds.maxY
        ) / 2,
    };

    /*
     * The live geometry itself determines the default zoom.
     *
     * Projected extents are proportional to `view.zoom`, so
     * multiplying the current zoom by the required screen-space
     * fit ratio gives the actual camera zoom that will fit this
     * exact geometry.
     *
     * Because this calculation occurs for every animation frame,
     * bridges, cusp extensions, strip assembly, wrapping, etc.
     * are tracked continuously.
     */
    /*
     * Scale fitting is deliberately deferred until the END of this
     * render calculation.
     *
     * At this point the tetrahedral/cusp surfaces exist, but the
     * large solid face-identification bridges have not yet been
     * appended to `faces`.
     *
     * Measuring here was the reason bridge construction never caused
     * the camera to pull back.
     */
    /*
     * Auto-fit centers horizontally as well as vertically.
     *
     * Manual camera mode preserves the historical horizontal
     * composition while retaining the existing vertical drift
     * correction.
     *
     * Rotation is never changed here.
     */
    const displayedSceneOffset = {
      x: autoFit
        ? AUTO_FIT_VIEWBOX_WIDTH /
            2 -
          visibleSceneCenter.x
        : 0,
      y:
        AUTO_FIT_VIEWBOX_HEIGHT /
          2 -
        visibleSceneCenter.y,
    };

    const shiftPoint = (point) =>
      translateProjectedPoint(
        point,
        displayedSceneOffset
      );

    if (centeringPoints.length > 0) {
      faces.forEach((face) => {
        face.projected =
          face.projected.map(
            shiftPoint
          );
      });

      labels.forEach((label) => {
        label.point =
          shiftPoint(label.point);
      });

      callouts.forEach((callout) => {
        callout.anchor =
          shiftPoint(callout.anchor);

        callout.point =
          shiftPoint(callout.point);

        callout.lineEnd =
          shiftPoint(callout.lineEnd);
      });

      cuspEdgeMatches.forEach(
        (match) => {
          match.segments =
            match.segments.map(
              (segment) =>
                segment.map(
                  shiftPoint
                )
            );
        }
      );

      cuspMeshFaces.forEach(
        (meshFace) => {
          meshFace.projected =
            meshFace.projected.map(
              shiftPoint
            );
        }
      );

      cuspTriangleOutlines.forEach(
        (outline) => {
          outline.edges =
            outline.edges.map(
              (edge) => ({
                ...edge,
                points:
                  edge.points.map(
                    shiftPoint
                  ),
              })
            );
        }
      );

      knotMeridianPolyline =
        knotMeridianPolyline.map(
          shiftPoint
        );

      knotLongitudePolyline =
        knotLongitudePolyline.map(
          shiftPoint
        );

      if (knotCycleIntersectionPoint) {
        knotCycleIntersectionPoint =
          shiftPoint(
            knotCycleIntersectionPoint
          );
      }
    }

    const activeSolidBridgeDefinitions =
      solidBridgeDefinitions.filter(
        (definition) =>
          definition.progress >
          FACE_CONSTRAINT_EPSILON
      );

    /*
     * Face positions change on every seam-transition frame.
     * Re-running the global candidate/sweep search for each of
     * those intermediate positions blocks the browser's main
     * thread. Since animation progress is measured from wall
     * time, the next available frame then jumps far ahead.
     *
     * During this one continuous motion, preserve each bridge's
     * already selected lane and only rebuild its geometry at the
     * current face positions. The full collision audit resumes
     * after the seam reaches its endpoint.
     */
    const bridgeRouteSceneKey =
      [
        effectiveConstraintOrder.join(","),
        normalizedFacePairMappingTargets.join(
          ","
        ),
        truncatedGeometry
          .truncationFraction
          .toFixed(6),
        truncatedGeometry
          .tetrahedronSeparation
          .toFixed(6),
        pairingBridgeDefinitions
          .map(
            (definition) =>
              `${definition.pairId}:` +
              `${definition.bridgeType}`
          )
          .join(","),
      ].join("||");

    const plannedBridgeRouteSelections =
      seamTransitionInProgress
        ? activeSolidBridgeDefinitions.map(
            (definition) => {
              const preferredRouteId =
                bridgeRoutePreferenceByPairRef
                  .current[
                    definition.pairId
                  ];

              const canonicalRouteSpec =
                bridgeRouteCandidateSpecsForType(
                  definition.bridgeType
                )[0] ??
                DEFAULT_BRIDGE_ROUTE_SPEC;

              const stableRouteSpec =
                normalizeBridgeRouteSpec(
                  animatedBridgeRouteSpecs[
                    definition.pairId
                  ] ??
                    (
                      preferredRouteId ===
                      null
                        ? canonicalRouteSpec
                        : bridgeRouteSpecForId(
                            preferredRouteId
                          )
                    ),
                  canonicalRouteSpec.lane
                );

              const model =
                makeFaceIdentificationBridgeModel({
                  positions:
                    solvedWorldPositions,
                  pairing:
                    definition.pairing,
                  progress:
                    definition.progress,
                  bridgeSpanScale:
                    definition.bridgeSpanScale,
                  bridgeIndex:
                    definition.bridgeIndex,
                  routeLane:
                    stableRouteSpec.lane,
                  routeSpec:
                    stableRouteSpec,
                  mappingTurn:
                    definition.mappingTurn,
                  sceneCenter,
                  geometry:
                    truncatedGeometry,
                });

              return {
                model,
                selectedRouteSpec:
                  stableRouteSpec,
                selectedRouteScore: null,
                candidateDiagnostics: {
                  valid: true,
                  status:
                    "seam-transition-fixed-route",
                  selectedRouteId:
                    stableRouteSpec.id,
                  selectedRouteLabel:
                    bridgeRouteDisplayLabel(
                      stableRouteSpec
                    ),
                  selectedRouteScore: null,
                  routeCandidateCount: 0,
                  validRouteCount: 1,
                  routeAttempts: [],
                },
              };
            }
          )
        : selectCollisionFreeBridgeRouteSet({
            definitions:
              activeSolidBridgeDefinitions,
            positions:
              solvedWorldPositions,
            sceneCenter,
            preferredRouteIdsByPairId:
              bridgeRoutePreferenceByPairRef
                .current,
            sweepStartRouteSpecsByPairId:
              bridgeRouteTransitionRef
                .current.startSpecs,
            geometry:
              truncatedGeometry,
          });

    const plannedRouteSetComplete =
      plannedBridgeRouteSelections.length ===
        activeSolidBridgeDefinitions.length &&
      plannedBridgeRouteSelections.every(
        (selection) =>
          selection
            .candidateDiagnostics.valid &&
          selection.selectedRouteSpec !==
            null
      );

    if (plannedRouteSetComplete) {
      const routeSpecsByPairId =
        lastCompleteBridgeRouteSetRef
          .current.sceneKey ===
          bridgeRouteSceneKey
          ? [
              ...lastCompleteBridgeRouteSetRef
                .current.routeSpecsByPairId,
            ]
          : activeFacePairs.map(
              () => null
            );

      activeSolidBridgeDefinitions.forEach(
        (definition, definitionIndex) => {
          const selectedRouteSpec =
            plannedBridgeRouteSelections[
              definitionIndex
            ].selectedRouteSpec;

          routeSpecsByPairId[
            definition.pairId
          ] = normalizeBridgeRouteSpec(
            selectedRouteSpec,
            selectedRouteSpec.lane
          );
        }
      );

      lastCompleteBridgeRouteSetRef.current = {
        sceneKey:
          bridgeRouteSceneKey,
        routeSpecsByPairId,
      };
    }

    const retainedRouteSpecs =
      lastCompleteBridgeRouteSetRef
        .current.sceneKey ===
        bridgeRouteSceneKey
        ? lastCompleteBridgeRouteSetRef
            .current.routeSpecsByPairId
        : null;

    const retainedRouteSetComplete =
      retainedRouteSpecs !== null &&
      activeSolidBridgeDefinitions.every(
        (definition) =>
          retainedRouteSpecs[
            definition.pairId
          ] !== null
      );

    const bridgeRouteSelections =
      !seamTransitionInProgress &&
      !plannedRouteSetComplete &&
      retainedRouteSetComplete
        ? activeSolidBridgeDefinitions.map(
            (definition) => {
              const retainedRouteSpec =
                normalizeBridgeRouteSpec(
                  retainedRouteSpecs[
                    definition.pairId
                  ],
                  retainedRouteSpecs[
                    definition.pairId
                  ].lane
                );

              const model =
                makeFaceIdentificationBridgeModel({
                  positions:
                    solvedWorldPositions,
                  pairing:
                    definition.pairing,
                  progress:
                    definition.progress,
                  bridgeSpanScale:
                    definition.bridgeSpanScale,
                  bridgeIndex:
                    definition.bridgeIndex,
                  routeLane:
                    retainedRouteSpec.lane,
                  routeSpec:
                    retainedRouteSpec,
                  mappingTurn:
                    definition.routingMappingTurn ??
                    definition.mappingTurn,
                  sceneCenter,
                  geometry:
                    truncatedGeometry,
                });

              return {
                model,
                selectedRouteSpec:
                  retainedRouteSpec,
                selectedRouteScore: null,
                candidateDiagnostics: {
                  valid: true,
                  status:
                    "retained-complete-route-set",
                  selectedRouteId:
                    retainedRouteSpec.id,
                  selectedRouteLabel:
                    bridgeRouteDisplayLabel(
                      retainedRouteSpec
                    ),
                  selectedRouteScore: null,
                  routeCandidateCount: 0,
                  validRouteCount: 1,
                  routeAttempts: [],
                },
              };
            }
          )
        : plannedBridgeRouteSelections;

    const nextBridgeRouteTargetSpecs =
      activeFacePairs.map(
        () => null
      );

    activeSolidBridgeDefinitions.forEach(
      (definition, definitionIndex) => {
        const routeSelection =
          bridgeRouteSelections[
            definitionIndex
          ];

        const continuityRouteSpec =
          animatedBridgeRouteSpecs[
            definition.pairId
          ] ??
          bridgeRouteCandidateSpecsForType(
            definition.bridgeType
          )[0] ??
          DEFAULT_BRIDGE_ROUTE_SPEC;

        /*
         * Route validity controls rerouting, never bridge
         * existence. If the global audit temporarily has no
         * complete collision-free assignment while a vertex map
         * changes, retain the route already on screen. A newly
         * exposed bridge with no remembered route uses its
         * canonical route until the planner supplies a better one.
         */
        nextBridgeRouteTargetSpecs[
          definition.pairId
        ] =
          routeSelection
            .candidateDiagnostics.valid &&
          routeSelection
            .selectedRouteSpec !== null
            ? routeSelection
                .selectedRouteSpec
            : continuityRouteSpec;
      }
    );

    const solidBridges =
      activeSolidBridgeDefinitions.map(
        (definition, definitionIndex) => {
          const routeSelection =
            bridgeRouteSelections[
              definitionIndex
            ];

          const routedBridgeModel =
            routeSelection.model;

          const candidateDiagnostics =
            routeSelection
              .candidateDiagnostics;

          const candidateValid =
            candidateDiagnostics.valid;

          const renderSeamTransition =
            definition.seamTransitionActive;

          const candidatePending =
            !candidateValid &&
            !renderSeamTransition;

          const selectedRouteSpec =
            routeSelection
              .selectedRouteSpec;

          /*
           * Route selection is audited at the settled target
           * mapping. Once a collision-free lane is chosen,
           * rebuild that bridge with the continuously animated
           * mapping turn so the 0°/120°/240° transitions remain
           * visible instead of disappearing until the endpoint.
           */
          const displayRouteSpec =
            animatedBridgeRouteSpecs[
              definition.pairId
            ] ?? selectedRouteSpec;

          const continuityRouteSpec =
            bridgeRouteCandidateSpecsForType(
              definition.bridgeType
            )[0] ??
            DEFAULT_BRIDGE_ROUTE_SPEC;

          const stableDisplayRouteSpec =
            displayRouteSpec ??
            continuityRouteSpec;

          const bridgeModel =
            seamTransitionInProgress
              ? routedBridgeModel
              : makeFaceIdentificationBridgeModel({
                  positions:
                    solvedWorldPositions,
                  pairing:
                    definition.pairing,
                  progress:
                    definition.progress,
                  bridgeSpanScale:
                    definition.bridgeSpanScale,
                  bridgeIndex:
                    definition.bridgeIndex,
                  routeLane:
                    stableDisplayRouteSpec.lane,
                  routeSpec:
                    stableDisplayRouteSpec,
                  mappingTurn:
                    definition.mappingTurn,
                  sceneCenter,
                  geometry:
                    truncatedGeometry,
                });

          /*
           * An identified, exposed bridge is always renderable.
           * Candidate validity is diagnostic/planning state; it
           * must never delete the geometric representative of an
           * identification while a mapping transition is underway.
           */
          const bridgeRenderable = true;

          const renderedFaces =
            bridgeRenderable
              ? bridgeModel.worldFaces.map(
                  (bridgeFace) => {
                    const projected =
                      bridgeFace.points
                        .map((point) =>
                          subtractPoint(
                            point,
                            sceneCenter
                          )
                        )
                        .map((point) =>
                          projectPoint(
                            point,
                            displayView
                          )
                        )
                        .map(shiftPoint);

                    return {
                      key: bridgeFace.key,
                      pair:
                        definition.pairing,
                      bridgeIndex:
                        definition.bridgeIndex,
                      routeLane:
                        bridgeModel.routeLane,
                      routeId:
                        bridgeModel.route?.id ??
                        bridgeModel.routeSpec?.id,
                      mappingTurn:
                        definition.mappingTurn,
                      mappingIndex:
                        definition.mappingIndex,
                      bridgeKind:
                        bridgeFace.kind,
                      bridge: true,
                      segmentIndex:
                        bridgeFace.segmentIndex ??
                        null,
                      sideIndex:
                        bridgeFace.sideIndex ??
                        null,
                      sourceColor:
                        bridgeFace.sourceColor ??
                        null,
                      targetColor:
                        bridgeFace.targetColor ??
                        null,
                      bridgeColor:
                        bridgeFace.bridgeColor ??
                        definition.pairing.color,
                      bridgeFront:
                        Boolean(
                          bridgeFace.bridgeFront
                        ),
                      projected,
                      fillOpacity:
                        bridgeFace.fillOpacity,
                      strokeOpacity:
                        bridgeFace.strokeOpacity,
                      depth:
                        projected.reduce(
                          (sum, point) =>
                            sum +
                            (point.depth || 0),
                          0
                        ) /
                        projected.length,
                    };
                  }
                )
              : [];

          faces.push(
            ...renderedFaces
          );

          return {
            ...definition,
            routeLane:
              bridgeModel.routeLane,
            routeSpec:
              bridgeModel.routeSpec,
            selectedRouteId:
              selectedRouteSpec?.id ??
              null,
            selectedRouteLabel:
              selectedRouteSpec === null
                ? null
                : bridgeRouteDisplayLabel(
                    selectedRouteSpec
                  ),
            selectedRouteScore:
              routeSelection
                .selectedRouteScore,
            routeAttempts:
              candidateDiagnostics
                .routeAttempts ?? [],
            routeCandidateCount:
              candidateDiagnostics
                .routeCandidateCount ?? 0,
            validRouteCount:
              candidateDiagnostics
                .validRouteCount ?? 0,
            active:
              renderedFaces.length > 0,
            candidateValid,
            candidatePending,
            candidateStatus:
              candidateDiagnostics.status,
            candidateDiagnostics,
            faceCount:
              renderedFaces.length,
            faces:
              renderedFaces,
            model:
              bridgeModel,
            route:
              bridgeModel.route,
            centerline:
              bridgeModel.centerline,
            tangents:
              bridgeModel.tangents,
            sections:
              bridgeModel.sections,
            sourceColor:
              bridgeModel.sourceColor,
            targetColor:
              bridgeModel.targetColor,
            triangles:
              bridgeModel.triangles,
            worldFaces:
              bridgeModel.worldFaces,
          };
        });

    const quotientIdentifications = [];

    if (
      quotientDisplayActive &&
      orderedQuotientPairIds.length > 0
    ) {
      orderedQuotientPairIds.forEach(
        (pairId, quotientIndex) => {
          const faceA =
            faces.find(
              (face) =>
                face.meshFace?.pairId ===
                  pairId &&
                face.meshFace.id.startsWith(
                  "A-"
                )
            );

          const faceB =
            faces.find(
              (face) =>
                face.meshFace?.pairId ===
                  pairId &&
                face.meshFace.id.startsWith(
                  "B-"
                )
            );

          if (
            !faceA ||
            !faceB
          ) {
            return;
          }

          const centerA =
            averageScreenPoint(
              faceA.projected
            );

          const centerB =
            averageScreenPoint(
              faceB.projected
            );

          let directionX =
            centerB.x -
            centerA.x;

          let directionY =
            centerB.y -
            centerA.y;

          let directionLength =
            Math.hypot(
              directionX,
              directionY
            );

          if (directionLength < 1) {
            const fallbackAngle =
              Math.PI *
              (
                0.25 +
                pairId * 0.5
              );

            directionX =
              Math.cos(
                fallbackAngle
              );

            directionY =
              Math.sin(
                fallbackAngle
              );

            directionLength = 1;
          }

          const unitX =
            directionX /
            directionLength;

          const unitY =
            directionY /
            directionLength;

          const perpendicularX =
            -unitY;

          const perpendicularY =
            unitX;

          const laneOffset =
            (
              quotientIndex -
              (
                orderedQuotientPairIds
                  .length -
                1
              ) /
                2
            ) *
            QUOTIENT_FACE_LANE_PX;

          const midpoint = {
            x:
              (
                centerA.x +
                centerB.x
              ) /
                2 +
              perpendicularX *
                laneOffset,
            y:
              (
                centerA.y +
                centerB.y
              ) /
                2 +
              perpendicularY *
                laneOffset,
          };

          const targetCenterA = {
            x:
              midpoint.x -
              unitX *
                QUOTIENT_FACE_GAP_PX /
                2,
            y:
              midpoint.y -
              unitY *
                QUOTIENT_FACE_GAP_PX /
                2,
          };

          const targetCenterB = {
            x:
              midpoint.x +
              unitX *
                QUOTIENT_FACE_GAP_PX /
                2,
            y:
              midpoint.y +
              unitY *
                QUOTIENT_FACE_GAP_PX /
                2,
          };

          const offsetA = {
            x:
              targetCenterA.x -
              centerA.x,
            y:
              targetCenterA.y -
              centerA.y,
          };

          const offsetB = {
            x:
              targetCenterB.x -
              centerB.x,
            y:
              targetCenterB.y -
              centerB.y,
          };

          const projectedA =
            faceA.projected.map(
              (point) =>
                translateProjectedPoint(
                  point,
                  offsetA
                )
            );

          const projectedB =
            faceB.projected.map(
              (point) =>
                translateProjectedPoint(
                  point,
                  offsetB
                )
            );

          const connectors =
            projectedA.map(
              (start, index) => {
                const end =
                  projectedB[index];

                const curveOffset =
                  (
                    index -
                    (
                      projectedA.length -
                      1
                    ) /
                      2
                  ) *
                  2.4;

                const control = {
                  x:
                    (
                      start.x +
                      end.x
                    ) /
                      2 +
                    perpendicularX *
                      curveOffset,
                  y:
                    (
                      start.y +
                      end.y
                    ) /
                      2 +
                    perpendicularY *
                      curveOffset,
                };

                return {
                  key:
                    `${pairId}-connector-` +
                    `${index}`,
                  start,
                  end,
                  path:
                    `M ${start.x} ${start.y} ` +
                    `Q ${control.x} ${control.y} ` +
                    `${end.x} ${end.y}`,
                };
              }
            );

          quotientIdentifications.push({
            key:
              `quotient-pair-${pairId}`,
            pair:
              activeFacePairs[
                pairId
              ],
            projectedA,
            projectedB,
            connectors,
            symbolPoint: midpoint,
            stems: [
              {
                start: centerA,
                end:
                  targetCenterA,
              },
              {
                start: centerB,
                end:
                  targetCenterB,
              },
            ],
          });
        }
      );
    }

    if (showIntrinsicVolumeDebug) {
      /*
       * Map one INTRINSIC volume vertex into the exact current
       * rendered tetrahedral shell.
       *
       * This is only a visualization map. The barycentric /
       * quotient data remain unchanged.
       */
      function currentIntrinsicVolumePoint(
        tetrahedronId,
        volumeVertexIndex
      ) {
        const volumeMesh =
          truncatedGeometry
            .intrinsicVolumeMeshes[
            tetrahedronId
          ];

        const surfaceMesh =
          truncatedGeometry
            .meshes[
            tetrahedronId
          ];

        const volumeVertex =
          volumeMesh?.vertices?.[
            volumeVertexIndex
          ];

        if (
          !volumeVertex ||
          !surfaceMesh
        ) {
          return null;
        }

        /*
         * The twelve truncated corners are already vertices of the
         * solved surface shell. Use their exact current positions.
         */
        if (
          volumeVertex.kind ===
            "truncated-corner" &&
          Number.isInteger(
            volumeVertex
              .surfaceVertexIndex
          )
        ) {
          return subtractPoint(
            solvedWorldPositions[
              tetrahedronId
            ][
              volumeVertex
                .surfaceVertexIndex
            ],
            sceneCenter
          );
        }

        /*
         * A boundary-face center follows the current deformed face.
         */
        if (
          volumeVertex.kind ===
          "face-center"
        ) {
          const surfaceFace =
            surfaceMesh.faceById.get(
              volumeVertex
                .surfaceFaceId
            );

          if (surfaceFace) {
            const faceWorldPoints =
              surfaceFace
                .vertexIndices
                .map(
                  (surfaceVertexIndex) =>
                    solvedWorldPositions[
                      tetrahedronId
                    ][
                      surfaceVertexIndex
                    ]
                );

            return subtractPoint(
              averageWorldPoint(
                faceWorldPoints
              ),
              sceneCenter
            );
          }
        }

        /*
         * The body center follows the current compact tetrahedral
         * cell as a whole.
         */
        if (
          volumeVertex.kind ===
          "body-center"
        ) {
          return subtractPoint(
            averageWorldPoint(
              solvedWorldPositions[
                tetrahedronId
              ]
            ),
            sceneCenter
          );
        }

        /*
         * Defensive fallback.
         */
        const tetrahedron =
          sceneTetrahedra.find(
            (candidate) =>
              candidate.id ===
              tetrahedronId
          );

        return tetrahedron
          ? centeredWorldPoint(
              volumeVertex.point,
              tetrahedron
            )
          : null;
      }


      intrinsicVolumeDebugGeometry.lines.forEach(
        (line) => {
          const start =
            currentIntrinsicVolumePoint(
              line.tetrahedronId,
              line.startVertexIndex
            );

          const end =
            currentIntrinsicVolumePoint(
              line.tetrahedronId,
              line.endVertexIndex
            );

          if (!start || !end) {
            return;
          }

          const projected = [
            projectPoint(
              start,
              displayView
            ),

            projectPoint(
              end,
              displayView
            ),
          ];

          intrinsicVolumeDebugLines.push({
            ...line,

            projected,

            depth:
              (
                projected[0].depth +
                projected[1].depth
              ) /
              2,
          });
        }
      );


      intrinsicVolumeDebugGeometry.points.forEach(
        (point) => {
          const modelPoint =
            currentIntrinsicVolumePoint(
              point.tetrahedronId,
              point.vertexIndex
            );

          if (!modelPoint) {
            return;
          }

          const projected =
            projectPoint(
              modelPoint,
              displayView
            );

          intrinsicVolumeDebugPoints.push({
            ...point,
            projected,
            depth:
              projected.depth,
          });
        }
      );


      intrinsicVolumeDebugLines.sort(
        (a, b) =>
          b.depth - a.depth
      );

      intrinsicVolumeDebugPoints.sort(
        (a, b) =>
          b.depth - a.depth
      );
    }

    if (
      showIntrinsicBoundaryCorrespondence
    ) {
      intrinsicBoundaryCorrespondence
        .triangles
        .forEach(
          (triangle) => {
            const tetrahedronId =
              triangle.tetrahedronId;

            /*
             * SOURCE
             *
             * Exact current positions of the three truncated-corner
             * vertices in the compact tetrahedral cells.
             */
            const sourceModelCorners =
              triangle.corners.map(
                (corner) =>
                  subtractPoint(
                    solvedWorldPositions[
                      tetrahedronId
                    ][
                      corner
                        .surfaceVertexIndex
                    ],

                    sceneCenter
                  )
              );

            /*
             * TARGET
             *
             * Exact raw developed cusp addresses.
             */
            const rawCorners =
              triangle.corners.map(
                (corner) =>
                  corner.raw
              );

            /*
             * Use the exact standard Projection Lab figure-eight
             * boundary embedding.
             *
             * There is NO route or funnel between source and target.
             */
            const targetModelPoint =
              (rawPoint) =>
                multiplyPoint(
                  figureEightKnotBoundaryModelPoint(
                    rawPoint,
                    0,
                    activeCuspCoordinateSpec
                  ),

                  CUSP_BOUNDARY_WORLD_SCALE
                );

            const targetModelCorners =
              rawCorners.map(
                targetModelPoint
              );

            const sourceProjected =
              sourceModelCorners.map(
                (point) =>
                  projectPoint(
                    point,
                    displayView
                  )
              );

            const targetProjected =
              targetModelCorners.map(
                (point) =>
                  projectPoint(
                    point,
                    displayView
                  )
              );

            /*
             * Same material-color rule established earlier:
             *
             *   triangle interior = opposite fourth face
             */
            const materialPair =
              cuspTriangleOppositeFacePair(
                triangle.cuspBaseId,
                activeFacePairs
              );

            const materialColor =
              materialPair
                ? faceEndpointColor(
                    materialPair,
                    tetrahedronId
                  )
                : "rgba(238, 232, 214, 0.96)";

            /*
             * Draw the target as an actual curved patch of the
             * Projection Lab torus.
             */
            const targetCells =
              CUSP_MESH_CELLS.map(
                (
                  cell,
                  cellIndex
                ) => {
                  const modelPoints =
                    cell.map(
                      (weights) =>
                        targetModelPoint(
                          blendTrianglePoint(
                            rawCorners,
                            weights
                          )
                        )
                    );

                  const projected =
                    modelPoints.map(
                      (point) =>
                        projectPoint(
                          point,
                          displayView
                        )
                    );

                  return {
                    key:
                      `${triangle.cuspBaseId}-` +
                      `target-cell-${cellIndex}`,

                    projected,

                    depth:
                      projected.reduce(
                        (
                          sum,
                          point
                        ) =>
                          sum +
                          (
                            point.depth ||
                            0
                          ),
                        0
                      ) /
                      projected.length,
                  };
                }
              ).sort(
                (a, b) =>
                  b.depth - a.depth
              );

            /*
             * The three target edges follow the exact torus map too.
             * They are not straight chords between the corners.
             */
            const targetEdges =
              [
                [0, 1],
                [1, 2],
                [2, 0],
              ].map(
                (
                  [
                    firstIndex,
                    secondIndex,
                  ],
                  edgeIndex
                ) => {
                  const firstCorner =
                    triangle.corners[
                      firstIndex
                    ];

                  const secondCorner =
                    triangle.corners[
                      secondIndex
                    ];

                  const points =
                    Array.from(
                      {
                        length: 33,
                      },
                      (
                        _,
                        sampleIndex
                      ) => {
                        const amount =
                          sampleIndex /
                          32;

                        const rawPoint = {
                          x:
                            firstCorner
                              .raw.x +
                            (
                              secondCorner
                                .raw.x -
                              firstCorner
                                .raw.x
                            ) *
                              amount,

                          y:
                            firstCorner
                              .raw.y +
                            (
                              secondCorner
                                .raw.y -
                              firstCorner
                                .raw.y
                            ) *
                              amount,
                        };

                        return projectPoint(
                          targetModelPoint(
                            rawPoint
                          ),
                          displayView
                        );
                      }
                    );

                  return {
                    key:
                      `${triangle.cuspBaseId}-` +
                      `target-edge-${edgeIndex}`,

                    color:
                      cuspTriangleEdgeColor(
                        tetrahedronId,

                        triangle
                          .idealVertexIndex,

                        firstCorner
                          .neighborIndex,

                        secondCorner
                          .neighborIndex,

                        activeFacePairs
                      ),

                    points,
                  };
                }
              );

            const sourceEdges =
              [
                [0, 1],
                [1, 2],
                [2, 0],
              ].map(
                (
                  [
                    firstIndex,
                    secondIndex,
                  ],
                  edgeIndex
                ) => ({
                  key:
                    `${triangle.cuspBaseId}-` +
                    `source-edge-${edgeIndex}`,

                  color:
                    cuspTriangleEdgeColor(
                      tetrahedronId,

                      triangle
                        .idealVertexIndex,

                      triangle
                        .corners[
                        firstIndex
                      ].neighborIndex,

                      triangle
                        .corners[
                        secondIndex
                      ].neighborIndex,

                      activeFacePairs
                    ),

                  start:
                    sourceProjected[
                      firstIndex
                    ],

                  end:
                    sourceProjected[
                      secondIndex
                    ],
                })
              );

            const sourceCenter =
              averageScreenPoint(
                sourceProjected
              );

            const targetCenter =
              averageScreenPoint(
                targetProjected
              );

            intrinsicBoundaryCorrespondenceTriangles.push({
              key:
                `intrinsic-boundary-` +
                `${triangle.cuspBaseId}`,

              cuspBaseId:
                triangle.cuspBaseId,

              tetrahedronId,

              materialColor,

              sourceProjected,

              targetProjected,

              sourceEdges,

              targetEdges,

              targetCells,

              sourceCenter,

              targetCenter,

              /*
               * These lines are deliberately NOT candidate paths.
               *
               * They mean only:
               *
               *   this source corner
               *       corresponds to
               *   this exact target corner.
               */
              connectors:
                sourceProjected.map(
                  (
                    sourcePoint,
                    index
                  ) => ({
                    key:
                      `${triangle.cuspBaseId}-` +
                      `correspondence-${index}`,

                    source:
                      sourcePoint,

                    target:
                      targetProjected[
                        index
                      ],
                  })
                ),
            });
          }
        );
    }

    const quotientPhysicalSeamCount =
      requestedFullPairMetrics.filter(
        (metric) =>
          !orderedQuotientPairIds.includes(
            metric.pairId
          ) &&
          metric.acceptedStrength >=
            metric.requestedStrength -
              0.005 &&
          metric.maximumError <=
            FACE_VALIDITY_SEAM_TOLERANCE
      ).length;

    const quotientRequestedPairCount =
      requestedFullPairMetrics.length;

    faces.sort((a, b) => {
      if (
        showCuspTriangles &&
        Boolean(a.pair) !==
          Boolean(b.pair)
      ) {
        return a.pair ? -1 : 1;
      }

      return b.depth - a.depth;
    });

    /*
     * Vertex labels are annotations, not geometry.
     *
     * When two identified tetrahedron vertices project to the
     * same screen location, their labels used to sit directly
     * on top of one another.
     *
     * Preserve each label's true projected anchor, but give the
     * displayed text a small deterministic screen-space
     * separation.
     */
    const separatedLabels =
      labels.map((label) => ({
        ...label,

        point: {
          ...label.point,
        },
      }));

    /*
     * Projected label-center of each tetrahedron.
     *
     * These use the ORIGINAL projected vertex anchors, before any
     * annotation separation. Therefore the ownership direction
     * follows the tetrahedra themselves as the viewer rotates.
     */
    const labelCenterByTetrahedron =
      new Map();

    for (
      const tetrahedronId of
      ["A", "B"]
    ) {
      const ownedLabels =
        labels.filter(
          (label) =>
            label.tetrahedronId ===
            tetrahedronId
        );

      if (ownedLabels.length === 0) {
        continue;
      }

      labelCenterByTetrahedron.set(
        tetrahedronId,
        {
          x:
            ownedLabels.reduce(
              (sum, label) =>
                sum + label.point.x,
              0
            ) /
            ownedLabels.length,

          y:
            ownedLabels.reduce(
              (sum, label) =>
                sum + label.point.y,
              0
            ) /
            ownedLabels.length,
        }
      );
    }

    const minimumLabelSpacing = 18;

    for (
      let pass = 0;
      pass < 5;
      pass += 1
    ) {
      for (
        let firstIndex = 0;
        firstIndex <
          separatedLabels.length;
        firstIndex += 1
      ) {
        for (
          let secondIndex =
            firstIndex + 1;
          secondIndex <
            separatedLabels.length;
          secondIndex += 1
        ) {
          const first =
            separatedLabels[
              firstIndex
            ];

          const second =
            separatedLabels[
              secondIndex
            ];

          const screenDx =
            second.point.x -
            first.point.x;

          const screenDy =
            second.point.y -
            first.point.y;

          const screenDistance =
            Math.hypot(
              screenDx,
              screenDy
            );

          if (
            screenDistance >=
            minimumLabelSpacing
          ) {
            continue;
          }

          let dx = screenDx;
          let dy = screenDy;

          /*
           * Different tetrahedra:
           *
           * Separate along the line joining their projected centers.
           * This guarantees that each number retreats toward the
           * tetrahedron that owns it instead of becoming an arbitrary
           * left/right pair.
           */
          if (
            first.tetrahedronId &&
            second.tetrahedronId &&
            first.tetrahedronId !==
              second.tetrahedronId
          ) {
            const firstCenter =
              labelCenterByTetrahedron.get(
                first.tetrahedronId
              );

            const secondCenter =
              labelCenterByTetrahedron.get(
                second.tetrahedronId
              );

            if (
              firstCenter &&
              secondCenter
            ) {
              dx =
                secondCenter.x -
                firstCenter.x;

              dy =
                secondCenter.y -
                firstCenter.y;
            }
          }

          let directionLength =
            Math.hypot(dx, dy);

          /*
           * Degenerate fallback only. Ordinarily A/B ownership
           * supplies a geometric direction.
           */
          if (directionLength < 1e-6) {
            dx =
              String(first.key) <
              String(second.key)
                ? -1
                : 1;

            dy = 0;
            directionLength = 1;
          }

          const push =
            (
              minimumLabelSpacing -
              screenDistance
            ) /
            2;

          const nx =
            dx / directionLength;

          const ny =
            dy / directionLength;

          first.point.x -=
            nx * push;

          first.point.y -=
            ny * push;

          second.point.x +=
            nx * push;

          second.point.y +=
            ny * push;
        }
      }
    }

    /*
     * Label repulsion affects only annotation placement.
     * Occlusion is evaluated from each label's original
     * geometric anchor against the projected surface.
     */
    separatedLabels.forEach(
      (label) => {
        label.occluded =
          projectedLabelAnchorIsOccluded(
            label,
            faces
          );
      }
    );

    cuspMeshFaces.sort(
      (a, b) => b.depth - a.depth
    );

    cuspTriangleOutlines.sort(
      (a, b) => b.depth - a.depth
    );

    /*
     * Insert the two peripheral cycles into the same painter-order stack
     * as the cusp surface. A small forward depth bias keeps a cycle visible
     * on its local tile, while genuinely nearer tiles are still painted
     * afterward and occlude portions that pass behind the surface.
     */
    const knotCycleSegments =
      knotCycleOpacity >
      FACE_CONSTRAINT_EPSILON
        ? [
            ...projectedPolylineSegments(
              knotMeridianPolyline,
              "meridian"
            ),
            ...projectedPolylineSegments(
              knotLongitudePolyline,
              "longitude"
            ),
          ]
        : [];

    /*
     * Hidden-line rendering for cusp boundaries.
     *
     * A complete SVG polyline has only one paint position. That means
     * the rear half of a curved boundary can remain visible even when
     * the cusp surface is geometrically in front of it.
     *
     * Split every curved outline into short depth-aware segments and
     * place those segments in the same painter-order stack as the
     * surface facets. Nearer facets can then cover rear outline
     * segments naturally.
     */
    /*
     * Once the connected cusp mesh owns the material surface,
     * do not paint the legacy per-tile/funnel outlines over it.
     *
     * Those outlines belong to the earlier construction geometry.
     * Keeping them after the handoff produced an apparent second
     * covering of the cylinder and intermediate torus.
     *
     * The connected mesh itself is the single authoritative
     * triangulated cusp surface.
     */
    const cuspOutlineSegments = [];

    const cuspSurfaceLayers = [
      ...cuspMeshFaces.map(
        (meshFace) => ({
          kind: "face",
          key: `face-${meshFace.key}`,
          depth: meshFace.depth,
          meshFace,
        })
      ),
      ...cuspOutlineSegments.map(
        (segment) => ({
          kind: "outline",
          key: `outline-${segment.key}`,
          depth: segment.depth,
          segment,
        })
      ),
      ...knotCycleSegments.map(
        (segment) => ({
          kind: "cycle",
          key: `cycle-${segment.key}`,
          depth: segment.depth,
          segment,
        })
      ),
      ...(
        knotCycleIntersectionPoint &&
        knotCycleClosureError < 1e-3
          ? [
              {
                kind: "cycle-intersection",
                key: "cycle-intersection",
                depth:
                  knotCycleIntersectionPoint.depth -
                  0.95,
                point:
                  knotCycleIntersectionPoint,
              },
            ]
          : []
      ),
    ].sort(
      (a, b) => b.depth - a.depth
    );

    /*
     * The old detached planar-domain presentation is suppressed.
     * The next stage will join the eight moving outer triangles
     * into the torus while these base collars remain attached.
     */
    const cuspDomainOpacity = 0;

    const cuspEdgeOpacity =
      showCuspTriangles &&
      !assembleCusp
        ? knotConstructionOpacity *
          (1 - connectedCuspSurfaceProgress)
        : 0;

    const cuspGridOpacity =
      showCuspTriangles ? 0.24 : 0;

    const solidBridgeClassCounts =
      solidBridges.reduce(
        (counts, bridge) => {
          const bridgeType =
            bridge.bridgeType ??
            "pending";

          counts[bridgeType] =
            (
              counts[bridgeType] ?? 0
            ) + 1;

          return counts;
        },
        {
          "edge-adjacent": 0,
          nonadjacent: 0,
          pending: 0,
        }
      );

    /*
     * FINAL visible-scene fit.
     *
     * Cusp triangles do not become a different scene when they are
     * revealed. Keep fitting the complete construction through
     * Cusp triangles -> Extend -> Assemble.
     *
     * During the first peripheral wrap, connectedCuspSurfaceProgress
     * is also the visual ownership handoff from the old construction
     * scaffold to the connected cusp surface. Interpolate the camera
     * bounds by that same amount so framing changes continuously.
     */
    const constructionAutoFitPoints =
      faces
        .filter(
          (face) =>
            !(
              showCuspTriangles &&
              (
                face.cuspCollar ||
                face.cuspFunnelGridLine ||
                face.cuspMaterialEdge
              )
            )
        )
        .flatMap(
          (face) =>
            face.projected
        );

    const cuspAutoFitPoints =
      cuspMeshFaces
        .filter(
          (meshFace) =>
            (
              meshFace.opacity ??
              1
            ) >
            FACE_CONSTRAINT_EPSILON
        )
        .flatMap(
          (meshFace) =>
            meshFace.projected
        );

    /*
     * Canonical-cell shell mode owns its camera framing too.
     * Do not fit the hidden constructor tetrahedra, bridges, or an
     * older moving cusp copy. Fit only the visible certified A/B
     * outer boundary plus the exact common internal interface.
     */
    const canonicalShellCuspAutoFitPoints =
      cuspMeshFaces
        .filter(
          (meshFace) =>
            meshFace
              .certifiedCanonicalBoundary &&
            (
              meshFace.opacity ??
              1
            ) >
              FACE_CONSTRAINT_EPSILON
        )
        .flatMap(
          (meshFace) =>
            meshFace.projected
        );

    const canonicalShellAutoFitPoints = [
      ...canonicalShellCuspAutoFitPoints,
      ...canonicalABInterfaceFaces
        .flatMap(
          (face) =>
            face.projected
        ),
    ];

    const canonicalShellAutoFitActive =
      canonicalCellShellMode !== null &&
      canonicalShellAutoFitPoints.length > 0;

    const cuspAutoFitActive =
      showCuspTriangles &&
      extendCusp &&
      cuspAutoFitPoints.length > 0;

    const correspondenceAutoFitPoints =
      intrinsicBoundaryCorrespondenceTriangles
        .flatMap(
          (triangle) => [
            ...triangle.sourceProjected,
            ...triangle.targetProjected,
          ]
        );

    const correspondenceAutoFitActive =
      showIntrinsicBoundaryCorrespondence &&
      correspondenceAutoFitPoints.length > 0;

    const autoFitPoints =
      menascoThreeBallsVisible &&
      menascoBallAutoFitPoints.length > 0
        ? menascoBallAutoFitPoints
        : canonicalShellAutoFitActive
          ? canonicalShellAutoFitPoints
          : (
              constructiveFinalDisplayActive ||
              menascoInspectionActive
            ) &&
          constructiveVolumeBoundaryAutoFitPoints.length > 0
          ? constructiveVolumeBoundaryAutoFitPoints
        : correspondenceAutoFitActive
          ? [
              ...constructionAutoFitPoints,
              ...correspondenceAutoFitPoints,
            ]
          : cuspAutoFitActive
            ? [
                ...constructionAutoFitPoints,
                ...cuspAutoFitPoints,
              ]
            : constructionAutoFitPoints;

    const fullSceneAutoFitBounds =
      projectedBounds(
        autoFitPoints
      );

    const cuspOnlyAutoFitBounds =
      projectedBounds(
        cuspAutoFitPoints
      );

    const cuspAutoFitOwnership =
      correspondenceAutoFitActive
        ? 0
        : cuspAutoFitActive
          ? clampUnit(
              connectedCuspSurfaceProgress
            )
          : 0;

    const autoFitBounds =
      cuspAutoFitOwnership >
      FACE_CONSTRAINT_EPSILON
        ? interpolateProjectedBounds(
            fullSceneAutoFitBounds,
            cuspOnlyAutoFitBounds,
            cuspAutoFitOwnership
          )
        : fullSceneAutoFitBounds;

    const autoFitWidth =
      Math.max(
        autoFitBounds.maxX -
          autoFitBounds.minX,
        1
      );

    const autoFitHeight =
      Math.max(
        autoFitBounds.maxY -
          autoFitBounds.minY,
        1
      );

    /*
     * The same completed scene that controls zoom also controls
     * framing position.
     *
     * Keeping the viewBox dimensions fixed preserves scale;
     * changing only its origin pans the camera so the complete
     * visible construction remains centered.
     */
    const autoFitCenterX =
      (
        autoFitBounds.minX +
        autoFitBounds.maxX
      ) / 2;

    const autoFitCenterY =
      (
        autoFitBounds.minY +
        autoFitBounds.maxY
      ) / 2;

    const ordinaryAutoFitViewBox =
      autoFitPoints.length > 0
        ? [
            autoFitCenterX -
              AUTO_FIT_VIEWBOX_WIDTH / 2,
            autoFitCenterY -
              AUTO_FIT_VIEWBOX_HEIGHT / 2,
            AUTO_FIT_VIEWBOX_WIDTH,
            AUTO_FIT_VIEWBOX_HEIGHT,
          ].join(" ")
        : "0 0 1000 700";

    const autoFitViewBox =
      ordinaryAutoFitViewBox;

    const finalAutoFitRatio =
      autoFit &&
      autoFitPoints.length > 0
        ? Math.min(
            (
              AUTO_FIT_VIEWBOX_WIDTH -
              AUTO_FIT_MARGIN_X * 2
            ) /
              autoFitWidth,
            (
              AUTO_FIT_VIEWBOX_HEIGHT -
              AUTO_FIT_MARGIN_Y * 2
            ) /
              autoFitHeight
          )
        : 1;

    const suggestedAutoFitZoom =
      autoFit &&
      Number.isFinite(
        finalAutoFitRatio
      )
        ? view.zoom *
          finalAutoFitRatio
        : null;

    return {
      faces,
      labels: separatedLabels,
      suggestedAutoFitZoom,
      autoFitViewBox,
      callouts,
      cuspEdgeMatches,
      cuspDomain: {
        opacity: cuspDomainOpacity,
      },
      connectedCuspSurfaceProgress,
      connectedCuspSurfaceVisibility,
      cuspEdgeOpacity,
      cuspGridOpacity,
      knotConstructionOpacity,
      knotMappingAuditProgress,
      knotMeridianPolyline,
      knotLongitudePolyline,
      knotCycleIntersectionPoint,
      knotCycleClosureError,
      knotCycleOpacity,
      cuspMeshFaces,
      cuspSurfaceLayers,
      cuspTriangleOutlines,
      cuspFlightSourceTriangles,
      canonicalABInterfaceFaces,
      canonicalABColorBoundaryLines,
      menascoPlaneFaces,
      menascoCrossingLines,
      menascoBubblePaths,
      menascoRegionFaces,
      menascoRegionOutlines,
      menascoLabels,
      menascoBallShellFaces,
      menascoBallAudit,
      menascoCorePath,
      menascoCrossingCount,
      menascoRegionCount,
      menascoTriangleRegionCount,
      menascoBigonRegionCount,
      menascoBallProgress,
      menascoStatusAnchor,
      menascoValid,
      menascoRegionsValid,
      intrinsicVolumeDebugLines,
      intrinsicVolumeDebugPoints,
      intrinsicBoundaryCorrespondenceTriangles,
      constructiveVolumeActive,
      constructiveVolumePath,
      constructiveVolumeBoundaryPath,
      constructiveVolumeInternalEdgeCount,
      collisionDiagnostics,
      validityDiagnostics,
      quotientDisplayActive,
      quotientCutOpenStrength,
      quotientCutOpenValid,
      quotientUnresolvedPairIds:
        orderedQuotientPairIds,
      quotientIdentifications,
      quotientPhysicalSeamCount,
      quotientRequestedPairCount,
      physicalSeamPairId,
      physicalSeamPairIds,
      physicalSeamCount:
        physicalSeamPairIds.length,
      pairingBridgeDefinitions,
      bridgeRouteTargetSpecs:
        nextBridgeRouteTargetSpecs,
      collapsedBridgeCount:
        pairingBridgeDefinitions.filter(
          (definition) =>
            definition.collapsed
        ).length,
      solidBridges,
      solidBridgeClassCounts,
      solidBridgeActive:
        solidBridges.some(
          (bridge) => bridge.active
        ),
      solidBridgeCount:
        solidBridges.filter(
          (bridge) => bridge.active
        ).length,
      solidBridgeCandidateCount:
        solidBridges.length,
      pendingSolidBridgeCount:
        solidBridges.filter(
          (bridge) =>
            bridge.candidatePending
        ).length,
      solidBridgeFaceCount:
        solidBridges.reduce(
          (count, bridge) =>
            count + bridge.faceCount,
          0
        ),
    };
  }, [
    view,
    selectedPairId,
    pairingProgress,
    resolvedCollapsedBridgePairIdsKey,
    animatedSeamStrengthKey,
    seamTransitionInProgress,
    showInterior,
    constructiveFinalDisplayActive,
    canonicalABInterfaceDiagnostic,
    canonicalCellShellMode,
    menascoInspectionActive,
    menascoInspectionProgress,
    menascoThreeBallsVisible,
    showCuspTriangles,
    extendCusp,
    assembleCusp,
    cuspWrapOrder,
    cuspFirstBoundary,
    facePairStrengths,
    facePairConstraintOrder,
    facePairMappingIndices,
    animatedFacePairMappingKey,
    corollaryTargetManifoldId,
    corollaryPairId,
    corollaryProgress,
    animatedBridgeRouteSpecs,
    preferredPlannerGuide,
    truncatedGeometry,
    cuspAssemblyProgress,
    cuspDomainAssemblyProgress,
    cuspAssemblyOrder,
    cuspFlatLayout,
    cuspLayoutTransitionProgress,
    shortWrapProgress,
    longWrapProgress,
    cuspWrapProgress,
    knotViewProgress,
    connectedCuspMeshes,
    autoFit,
    showIntrinsicVolumeDebug,
    intrinsicVolumeDebugGeometry,
    showIntrinsicBoundaryCorrespondence,
    intrinsicBoundaryCorrespondence,
    intrinsicQuotientMesh,
    intrinsicS3BoundaryTargets,
    activeManifold.id,
    intrinsicS3ConstructiveVolumeState,
    intrinsicS3ConstructiveInteriorEdges,
    intrinsicS3ConstructiveBoundaryEdges,
    certifiedM004SourceSupport,
  ]);

  const lastAutoFitZoomRequestRef =
    useRef(null);

  /*
   * Treat the parent callback as an imperative sink.
   *
   * Its function identity is not part of the geometry state and must
   * not restart this effect merely because the parent rendered again.
   */
  const onAutoFitZoomRef =
    useRef(onAutoFitZoom);

  onAutoFitZoomRef.current =
    onAutoFitZoom;

  useEffect(() => {
    const nextZoom =
      rendered.suggestedAutoFitZoom;

    const autoFitCallback =
      onAutoFitZoomRef.current;

    if (
      !autoFit ||
      facePairAnimationActive ||
      typeof autoFitCallback !==
        "function" ||
      !Number.isFinite(nextZoom)
    ) {
      lastAutoFitZoomRequestRef.current =
        null;

      return;
    }

    const previousZoom =
      lastAutoFitZoomRequestRef.current;

    const tolerance =
      Math.max(
        1e-7,
        Math.abs(nextZoom) * 1e-7
      );

    if (
      Number.isFinite(previousZoom) &&
      Math.abs(
        nextZoom - previousZoom
      ) <= tolerance
    ) {
      return;
    }

    lastAutoFitZoomRequestRef.current =
      nextZoom;

    /*
     * Never synchronously feed a child effect back into the
     * parent camera state.
     *
     * Deferring one frame preserves the exact same requested
     * zoom while preventing a React update-depth feedback loop.
     */
    const frameId =
      requestAnimationFrame(() => {
        autoFitCallback(
          nextZoom
        );
      });

    return () =>
      cancelAnimationFrame(
        frameId
      );
  }, [
    autoFit,
    activeManifold.id,
    facePairAnimationActive,
    rendered.suggestedAutoFitZoom,
  ]);

  const nextBridgeRouteTargetKey =
    bridgeRouteSpecArrayKey(
      rendered.bridgeRouteTargetSpecs,
      activeFacePairs
    );

  useEffect(() => {
    const nextTargets =
      rendered.bridgeRouteTargetSpecs.map(
        (routeSpec) =>
          routeSpec === null
            ? null
            : normalizeBridgeRouteSpec(
                routeSpec,
                routeSpec.lane
              )
      );

    bridgeRoutePreferenceByPairRef.current =
      bridgeRoutePreferenceByPairRef
        .current.map(
          (currentRouteId, pairId) => {
            const targetRoute =
              nextTargets[pairId];

            if (targetRoute !== null) {
              return targetRoute.id;
            }

            return facePairSequence.includes(
              pairId
            )
              ? currentRouteId
              : null;
          }
        );

    setBridgeRouteTargetSpecs(
      (currentTargets) =>
        bridgeRouteSpecArrayKey(
          currentTargets,
          activeFacePairs
        ) === nextBridgeRouteTargetKey
          ? currentTargets
          : nextTargets
    );
  }, [
    nextBridgeRouteTargetKey,
    facePairSequenceKey,
  ]);

  useEffect(() => {
    const diagnostics =
      rendered.collisionDiagnostics;

    if (
      diagnostics.plannerActive &&
      diagnostics.plannerPairId !==
        null &&
      diagnostics.plannerGuideIndex !==
        null
    ) {
      plannerGuidePreferenceRef.current = {
        pairId:
          diagnostics.plannerPairId,
        index:
          diagnostics.plannerGuideIndex,
      };

      return;
    }

    if (
      selectedPairId === null ||
      plannerGuidePreferenceRef
        .current?.pairId !==
        selectedPairId
    ) {
      plannerGuidePreferenceRef.current =
        null;
    }
  }, [
    selectedPairId,
    rendered.collisionDiagnostics
      .plannerActive,
    rendered.collisionDiagnostics
      .plannerPairId,
    rendered.collisionDiagnostics
      .plannerGuideIndex,
  ]);

  const activeSolidBridges =
    rendered.solidBridges.filter(
      (bridge) => bridge.active
    );

  const pendingSolidBridge =
    rendered.solidBridges.find(
      (bridge) =>
        bridge.candidatePending
    ) ??
    null;

  const latestSolidBridge =
    activeSolidBridges.length > 0
      ? activeSolidBridges[
          activeSolidBridges.length - 1
        ]
      : null;

  const solidBridgePair =
    latestSolidBridge?.pairing ??
    null;

  const pendingBridgePair =
    pendingSolidBridge?.pairing ??
    null;

  const statusBridgePair =
    pendingBridgePair ??
    solidBridgePair;

  const solidBridgeMapping =
    latestSolidBridge === null
      ? null
      : CYCLIC_FACE_MAPPING_CHOICES[
          latestSolidBridge
            .mappingIndex
        ];

  const solidBridgeRouteLabel =
    latestSolidBridge?.selectedRouteLabel ??
    bridgeRouteDisplayLabel(
      latestSolidBridge?.route
    );

  const pendingRouteCandidateCount =
    pendingSolidBridge
      ?.routeCandidateCount ?? 0;

  const pendingRouteUnavailable =
    pendingSolidBridge !== null &&
    [
      "no-valid-route",
      "no-sweep-clear-route",
    ].includes(
      pendingSolidBridge
        .candidateStatus
    );

  const physicalSeamSummary =
    `${rendered.physicalSeamCount} collapsed ` +
    `${rendered.physicalSeamCount === 1 ? "seam" : "seams"}`;

  const representedPairCount =
    rendered.pairingBridgeDefinitions
      .filter(
        (definition) =>
          definition.seamStrength >
            FACE_CONSTRAINT_EPSILON ||
          definition.progress >
            FACE_CONSTRAINT_EPSILON
      )
      .length;

  const compactStatus =
    pendingSolidBridge !== null
      ? pendingRouteUnavailable
        ? `${pendingBridgePair?.label ?? "Face-pair"} bridge route pending`
        : `Planning ${pendingBridgePair?.label ?? "face-pair"} bridge`
      : rendered.solidBridgeActive
        ? latestSolidBridge.progress >=
            SECOND_FACE_BRIDGE_FULL_STRENGTH
          ? `${solidBridgePair?.label ?? "Faces"} connected by solid bridge`
          : `Extending ${solidBridgePair?.label ?? "face-pair"} bridge`
        : facePairSequence.length === 0
          ? "Two tetrahedra — faces separate"
          : rendered
              .validityDiagnostics
              .status === "complete"
            ? "Physical face identification complete"
            : rendered
                .validityDiagnostics
                .status === "routed"
              ? rendered
                  .collisionDiagnostics
                  .plannerActive
                ? `Routing ${activeFacePairs[selectedPairId]?.label ?? "active faces"}`
                : `Joining ${activeFacePairs[selectedPairId]?.label ?? "active faces"}`
              : rendered
                  .validityDiagnostics
                  .status === "blocked"
                ? rendered
                    .quotientDisplayActive
                  ? "Cut-open quotient representation"
                  : "Face-identification route paused"
                : rendered
                    .quotientCutOpenValid
                  ? "Cut-open quotient representation"
                  : "No valid cut-open representation";

  const compactDetail =
    pendingSolidBridge !== null
      ? pendingRouteUnavailable
        ? `${physicalSeamSummary} · ${rendered.solidBridgeCount}/${rendered.solidBridgeCandidateCount} bridges displayed · ${pendingRouteCandidateCount} transition routes tested · ${facePairSequence.length}/4 pairings selected`
        : `${physicalSeamSummary} · ${rendered.solidBridgeCount} solid ${rendered.solidBridgeCount === 1 ? "bridge" : "bridges"} · candidate ${bridgeAuditStatusLabel(pendingSolidBridge.candidateStatus)} · ${facePairSequence.length}/4 pairs selected`
      : rendered.solidBridgeActive
        ? latestSolidBridge?.bridgeIndex > 0
          ? `${physicalSeamSummary} · ${rendered.solidBridgeCount} solid ${rendered.solidBridgeCount === 1 ? "bridge" : "bridges"} · route ${solidBridgeRouteLabel} · map ${solidBridgeMapping?.label ?? "0°"} · ${representedPairCount}/4 pairs represented`
          : `${physicalSeamSummary} · ${rendered.solidBridgeCount} solid ${rendered.solidBridgeCount === 1 ? "bridge" : "bridges"} · map ${solidBridgeMapping?.label ?? "0°"} · ${representedPairCount}/4 pairs represented`
        : rendered.quotientDisplayActive
          ? `${rendered.quotientPhysicalSeamCount} physical ${rendered.quotientPhysicalSeamCount === 1 ? "seam" : "seams"} · ${rendered.quotientIdentifications.length} quotient ${rendered.quotientIdentifications.length === 1 ? "link" : "links"} · ${rendered.quotientRequestedPairCount}/4 pairs represented`
          : facePairSequence.length === 0
            ? "Choose the first face-pair identification"
            : `${facePairSequence.length}/4 face pairs selected`;

  const compactAccent =
    pendingSolidBridge !== null ||
    rendered.solidBridgeActive
      ? statusBridgePair?.color ??
        "rgba(96, 222, 255, 0.96)"
      : rendered
          .validityDiagnostics
          .status === "complete"
        ? "rgba(112, 232, 166, 0.92)"
        : rendered
            .validityDiagnostics
            .status === "routed"
          ? "rgba(96, 222, 255, 0.96)"
          : rendered
              .validityDiagnostics
              .status === "blocked"
            ? "rgba(255, 176, 64, 0.94)"
            : "rgba(196, 148, 255, 0.96)";

  const compactTextAccent =
    pendingSolidBridge !== null ||
    rendered.solidBridgeActive
      ? statusBridgePair?.color ??
        "rgba(118, 226, 255, 0.98)"
      : rendered
          .validityDiagnostics
          .status === "complete"
        ? "rgba(138, 244, 186, 0.98)"
        : rendered
            .validityDiagnostics
            .status === "routed"
          ? "rgba(118, 226, 255, 0.98)"
          : rendered
              .validityDiagnostics
              .status === "blocked"
            ? "rgba(255, 188, 92, 0.98)"
            : "rgba(214, 178, 255, 0.98)";

  useEffect(() => {
    if (
      facePairAnimationActive ||
      typeof onCuspFlightSourceChange !==
        "function"
    ) {
      return;
    }

    const svg =
      svgRef.current;

    const matrix =
      svg?.getScreenCTM();

    if (!svg || !matrix) {
      return;
    }

    function screenPoint(point) {
      const svgPoint =
        svg.createSVGPoint();

      svgPoint.x = point.x;
      svgPoint.y = point.y;

      const transformed =
        svgPoint.matrixTransform(
          matrix
        );

      return {
        x: transformed.x,
        y: transformed.y,
      };
    }

    const bounds =
      svg.getBoundingClientRect();

    onCuspFlightSourceChange({
      /*
       * Preserve the complete opening Cells SVG as a static
       * snapshot during flight. This guarantees that neither
       * tetrahedron moves when the Cusp controller width becomes
       * active underneath it.
       */
      svgMarkup:
        svg.outerHTML,

      rect: {
        left: bounds.left,
        top: bounds.top,
        width: bounds.width,
        height: bounds.height,
      },

      triangles:
        rendered
          .cuspFlightSourceTriangles
          .map(
            (triangle) => ({
              id: triangle.id,
              color: triangle.color,

              /*
               * Preserve the three actual tetrahedral-face colors
               * carried by the sides of this truncation triangle.
               *
               * These corner IDs remain semantic IDs; only the
               * triangle points themselves need screen conversion.
               */
              edgeSegments:
                (
                  triangle.edgeSegments ??
                  []
                ).map(
                  (edge) => ({
                    startCorner:
                      edge.startCorner,

                    endCorner:
                      edge.endCorner,

                    color:
                      edge.color,
                  })
                ),

              pointsByCorner:
                Object.fromEntries(
                  Object.entries(
                    triangle
                      .pointsByCorner
                  ).map(
                    ([
                      corner,
                      point,
                    ]) => [
                      corner,
                      screenPoint(
                        point
                      ),
                    ]
                  )
                ),
            })
          ),
    });
  }, [
    facePairAnimationActive,
    onCuspFlightSourceChange,
    rendered.cuspFlightSourceTriangles,
    rendered.autoFitViewBox,
  ]);

  useEffect(() => {
    if (
      typeof onConstructionStateChange !==
      "function"
    ) {
      return;
    }

    onConstructionStateChange(
      showCuspTriangles
        ? null
        : {
            status: compactStatus,
            detail: compactDetail,
            accent: compactAccent,
            textAccent:
              compactTextAccent,
          }
    );
  }, [
    onConstructionStateChange,
    showCuspTriangles,
    compactStatus,
    compactDetail,
    compactAccent,
    compactTextAccent,
  ]);

  useEffect(() => {
    if (
      typeof onConstructionStateChange !==
      "function"
    ) {
      return undefined;
    }

    return () =>
      onConstructionStateChange(
        null
      );
  }, [
    onConstructionStateChange,
  ]);

  function handleBridgePointerDown(
    event
  ) {
    event.stopPropagation();
  }

  function handleBridgeClick(
    event,
    pairId
  ) {
    event.stopPropagation();

    if (
      typeof onPairInteraction ===
      "function"
    ) {
      onPairInteraction(pairId);
    }
  }


  /*
   * ============================================================
   * CUSP CONSTRUCTION -> MATERIAL-SURFACE HANDOFF
   * ============================================================
   *
   * The long triangular funnels explain how the eight truncation
   * triangles reach the assembled cusp domain.
   *
   * They are construction scaffolding, not part of the final
   * displayed cusp surface.
   *
   * During Assemble:
   *
   *   full funnel
   *       ->
   *   faint provenance funnel
   *
   * Once Meridian or Longitude starts:
   *
   *   provenance funnel
   *       ->
   *   zero
   *
   * This leaves the actual connected cusp material surface in
   * visual ownership of the cylinder and final knotted torus.
   */
  const cuspAssemblySettledProgress =
    smootherUnitInterval(
      clampUnit(
        (
          cuspDomainAssemblyProgress -
          0.82
        ) /
          0.18
      )
    );

  const cuspAssemblyScaffoldVisibility =
    1 -
    0.86 *
      cuspAssemblySettledProgress;

  const cuspPeripheralStartedProgress =
    smootherUnitInterval(
      clampUnit(
        (
          shortWrapProgress +
          longWrapProgress
        ) /
          0.18
      )
    );

  const cuspFunnelScaffoldVisibility =
    cuspAssemblyScaffoldVisibility *
    (
      1 -
      cuspPeripheralStartedProgress
    );

  return (
    <svg
      ref={svgRef}
      style={{
        opacity: presentationOpacity,
      }}
      viewBox={
        rendered.autoFitViewBox ??
        "0 0 1000 700"
      }
      /*
       * Auto Fit has already selected a viewBox containing the
       * complete visible construction.
       *
       * "meet" guarantees that complete fitted box remains
       * visible at every browser/window aspect ratio.
       *
       * "slice" cropped the fitted box on wide viewers, which
       * is why bridges could still disappear through the top
       * and bottom even though their calculated bounds fit.
       */
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={
        showCuspTriangles
          ? cuspWrapOrder.length === 2
            ? "Two truncated tetrahedra with eight attached cusp collars whose outer triangles assemble into the cusp torus"
            : cuspWrapOrder.length === 1
              ? "Two truncated tetrahedra with eight attached cusp collars whose outer triangles form the first cusp cylinder"
              : assembleCusp
                ? "Two truncated tetrahedra with eight extended cusp triangles assembled into one planar fundamental domain"
                : extendCusp
                  ? "Two truncated tetrahedra with their face identifications and eight attached cusp collars extending outward"
                  : "Two truncated tetrahedra with their face identifications and eight attached cusp-base triangles highlighted"
          : rendered.solidBridgeActive
            ? rendered.physicalSeamCount > 0
              ? "Two truncated tetrahedra with collapsed face seams and the remaining selected pairs connected by solid bridges"
              : "Two truncated tetrahedra with every selected face pair connected by a solid bridge"
            : rendered.quotientDisplayActive
              ? "Cut-open quotient representation of unresolved face identifications between two truncated tetrahedra"
              : "Two truncated tetrahedra deforming so that a selected face pair coincides"
      }
    >
      {menascoInspectionActive &&
        rendered.menascoPlaneFaces.map(
          (face) => (
            <polygon
              key={face.key}
              points={polygonPoints(
                face.projected
              )}
              fill="rgba(238, 229, 196, 1)"
              opacity={face.opacity}
              stroke="rgba(255, 245, 210, 0.75)"
              strokeOpacity={
                face.opacity * 2.8
              }
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
          )
        )}

      {!menascoInspectionActive &&
        !menascoThreeBallsVisible &&
        (
          showCuspTriangles ||
          constructiveFinalDisplayActive ||
          canonicalCellShellMode !== null
        ) &&
        (
          !showIntrinsicBoundaryCorrespondence ||
          canonicalCellShellMode !== null
        ) &&
        rendered.cuspSurfaceLayers.map(
          (layer) => {
            const secondPeripheralProgress =
              cuspWrapOrder.length === 2
                ? (
                    cuspWrapOrder[1] ===
                    "short"
                      ? shortWrapProgress
                      : longWrapProgress
                  )
                : 0;

            const hideCompletedKnotGuides =
              cuspWrapOrder.length === 2 &&
              secondPeripheralProgress >=
                1 - FACE_CONSTRAINT_EPSILON;

            /*
             * Shell inspection is an exclusive scene. The only cusp
             * layer allowed through is the certified A/B-owned outer
             * boundary; cycle guides and historical outlines are noise.
             */
            if (
              canonicalCellShellMode !== null &&
              layer.kind !== "face"
            ) {
              return null;
            }

            if (
              layer.kind ===
              "cycle-intersection"
            ) {
              if (hideCompletedKnotGuides) {
                return null;
              }
              return (
                <g
                  key={layer.key}
                  pointerEvents="none"
                  opacity={
                    rendered.knotCycleOpacity
                  }
                >
                  <circle
                    cx={layer.point.x}
                    cy={layer.point.y}
                    r="6.2"
                    fill="rgba(8, 8, 8, 0.98)"
                  />
                  <circle
                    cx={layer.point.x}
                    cy={layer.point.y}
                    r="2.8"
                    fill="rgba(255, 248, 218, 1)"
                  />
                </g>
              );
            }

            if (layer.kind === "outline") {
              if (hideCompletedKnotGuides) {
                return null;
              }

              const segment = layer.segment;

              return (
                <line
                  key={layer.key}
                  x1={segment.points[0].x}
                  y1={segment.points[0].y}
                  x2={segment.points[1].x}
                  y2={segment.points[1].y}
                  stroke={segment.color}
                  opacity={1}
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  pointerEvents="none"
                />
              );
            }

            if (layer.kind === "cycle") {
              if (hideCompletedKnotGuides) {
                return null;
              }

              const segment = layer.segment;
              const longitude =
                segment.cycleKind ===
                "longitude";

              return (
                <g
                  key={layer.key}
                  pointerEvents="none"
                  opacity={
                    rendered.knotCycleOpacity
                  }
                >
                  <line
                    x1={segment.points[0].x}
                    y1={segment.points[0].y}
                    x2={segment.points[1].x}
                    y2={segment.points[1].y}
                    stroke="rgba(8, 8, 8, 0.96)"
                    strokeWidth="3.6"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                  <line
                    x1={segment.points[0].x}
                    y1={segment.points[0].y}
                    x2={segment.points[1].x}
                    y2={segment.points[1].y}
                    stroke="rgba(255, 248, 218, 0.99)"
                    strokeWidth="1.45"
                    strokeDasharray={
                      longitude
                        ? "7 5"
                        : undefined
                    }
                    strokeDashoffset={
                      longitude
                        ? segment.dashOffset
                        : undefined
                    }
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              );
            }

            const meshFace =
              layer.meshFace;

            if (
              canonicalCellShellMode !== null &&
              !meshFace
                .certifiedCanonicalBoundary
            ) {
              return null;
            }

            return (
              <polygon
                key={layer.key}
                points={polygonPoints(
                  meshFace.projected
                )}
                fill={meshFace.fill}
                opacity={
                  meshFace.opacity ?? 1
                }
                stroke="rgba(248, 242, 224, 1)"
                strokeOpacity={
                  (
                    meshFace.strokeOpacity ??
                    rendered.cuspGridOpacity
                  ) *
                  (
                    1 -
                    0.92 *
                      rendered
                        .connectedCuspSurfaceProgress
                  )
                }
                strokeWidth={
                  0.45 +
                  0.08 *
                    (
                      1 -
                      rendered
                        .connectedCuspSurfaceProgress
                    )
                }
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                pointerEvents="none"
              />
            );
          }
        )}

      <g
        opacity={
          (
            constructiveFinalDisplayActive ||
            canonicalCellShellMode !== null ||
            menascoInspectionActive ||
            menascoThreeBallsVisible
          )
            ? 0
            : 1
        }
        pointerEvents={
          canonicalCellShellMode !== null
            ? "none"
            : undefined
        }
      >
      {rendered.faces.map((face) => {
        const focused =
          selectedPairId === null ||
          facePairSequence.includes(
            face.pair?.id
          );

        const quotientUnresolved =
          rendered
            .quotientUnresolvedPairIds
            .includes(
              face.pair?.id
            );

        const bridgePulseStrength =
          showInterior &&
          face.bridge &&
          facePairSequence.includes(
            face.pair?.id
          )
            ? interiorBridgePulseStrength(
                face.segmentIndex,
                interiorBridgePulseStep
              )
            : 0;

        const pairFaceColor =
          face.pair
            ? (
                face.faceColor ??
                face.releasedColor ??
                faceEndpointColor(
                  face.pair,
                  face.tetrahedronId
                )
              )
            : null;

        /*
         * SINGLE-COVER OWNERSHIP GATE
         *
         * Once the connected cusp mesh exists, no older per-tile cusp
         * construction surface is allowed to paint over it.
         *
         * This removes:
         *
         *   • old collar walls
         *   • old material-tile copies
         *   • old material-edge copies
         *   • old funnel grids
         *   • old cusp-base copies
         *
         * The connected mesh is now the sole cusp surface.
         */
        const connectedCuspOwnsSurface =
          rendered.connectedCuspSurfaceVisibility >
          FACE_CONSTRAINT_EPSILON;

        /*
         * ========================================================
         * LEGACY CUSP ROUTE IS NOW INERT
         * ========================================================
         *
         * These were the old invented ambient attachments:
         *
         *   collar walls
         *   routed funnel walls
         *   funnel grid rulings
         *
         * They are no longer part of the visible material animation.
         */
        if (
          showCuspTriangles &&
          (
            face.cuspCollar ||
            face.cuspMaterialEdge ||
            face.cuspFunnelGridLine
          )
        ) {
          return null;
        }

        /*
         * Before Assemble completes, cuspMaterialTile is the
         * painter-order copy of the SAME moving material triangle.
         *
         * Once the connected mesh takes ownership, both that copy
         * and the original source marker disappear.
         */
        if (
          connectedCuspOwnsSurface &&
          (
            face.cuspMaterialTile ||
            face.cuspBase
          )
        ) {
          return null;
        }

        if (
          showIntrinsicBoundaryCorrespondence &&
          (
            face.cuspCollar ||
            face.cuspMaterialTile ||
            face.cuspMaterialEdge ||
            face.cuspFunnelGridLine
          )
        ) {
          return null;
        }

        if (face.cuspFunnelGridLine) {
          return (
            <polyline
              key={face.key}
              points={polygonPoints(
                face.projected
              )}
              fill="none"
              stroke={
                face.cuspFunnelGridColor
              }
              opacity={
                (
                  face.cuspFunnelGridOpacity ??
                  1
                ) *
                cuspFunnelScaffoldVisibility
              }
              strokeWidth={
                face.cuspFunnelGridWidth ??
                1
              }
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
          );
        }

        if (face.cuspMaterialEdge) {
          return (
            <line
              key={face.key}
              x1={face.projected[0].x}
              y1={face.projected[0].y}
              x2={face.projected[1].x}
              y2={face.projected[1].y}
              stroke={
                face.cuspMaterialEdgeColor
              }
              opacity={
                face.cuspMaterialEdgeOpacity ??
                1
              }
              strokeWidth={
                face.cuspMaterialEdgeWidth ??
                1.8
              }
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
          );
        }

        /*
         * The connected cusp mesh owns the terminal boundary surface.
         * The triangular funnels remain permanent attachments behind it.
         */
        const materialSurfaceOwnership =
          showCuspTriangles
            ? clampUnit(
                rendered
                  .connectedCuspSurfaceProgress
              )
            : 0;

        const constructionSurfaceVisibility =
          Math.min(
            1 - materialSurfaceOwnership,
            cuspAssemblyScaffoldVisibility
          );

        /*
         * The long funnel is explanatory construction geometry, not the
         * completed cusp surface.
         *
         * It remains strong while the cusp is being extended and assembled,
         * becomes faint once the planar fundamental domain is complete,
         * and disappears when a peripheral identification begins.
         */
        const cuspAssemblyCollarVisibility =
          cuspFunnelScaffoldVisibility;

        const cuspAttachmentVisibility =
          cuspFunnelScaffoldVisibility;

        return (
          <polygon
            key={face.key}
            points={polygonPoints(face.projected)}
            opacity={
              face.cuspMaterialTile
                ? 1
                : showInterior
                ? (
                    face.bridge &&
                    bridgePulseStrength > 0
                      ? 0.24 +
                        0.76 *
                          bridgePulseStrength
                      : 0.24
                  )
                : 1
            }
            fill={
              face.cuspMaterialTile
                ? face.cuspMaterialColor
                : face.releasedIdentification
                ? pairFaceColor
                : face.bridge
                  ? face.bridgeColor ??
                    pairFaceColor
                  : face.pair
                    ? pairFaceColor
                    : showCuspTriangles
                    ? face.cuspCollar
                      ? face.cuspTorusOverlay
                        ? face.cuspCollarColor
                        : face.cuspMaterialColor ??
                          face.cuspCollarColor
                      : face.cuspBase &&
                        face.cuspMaterialColor
                        ? face.cuspMaterialColor
                        : "rgba(244, 240, 226, 0.34)"
                    : "none"
            }
            fillOpacity={
              face.cuspMaterialTile
                ? (
                    face.cuspMaterialOpacity ??
                    1
                  )
                : face.releasedIdentification
                ? (
                    face
                      .releasedIdentificationOpacity ??
                    1
                  ) *
                  (
                    showCuspTriangles
                      ? rendered
                          .knotConstructionOpacity *
                        constructionSurfaceVisibility
                      : 1
                  )
                : face.bridge
                  ? Math.max(
                      (face.fillOpacity ?? 1) *
                        (
                          showCuspTriangles
                            ? rendered
                                .knotConstructionOpacity *
                              constructionSurfaceVisibility
                            : 1
                        ),
                      showInterior
                        ? 0.82 *
                          bridgePulseStrength
                        : 0
                    )
                  : face.pair
                    ? (
                        showCuspTriangles
                          ? (
                              focused
                                ? quotientUnresolved
                                  ? 0.40
                                  : 0.75
                                : 0.44
                            )
                          : (
                              /*
                               * Ordinary Cells mode:
                               *
                               * Keep the tetrahedral faces visually
                               * solid so only the canonical four
                               * identification colors are perceived.
                               *
                               * This prevents the monastery background
                               * and overlapping translucent faces from
                               * producing false gray regions.
                               */
                              focused
                                ? quotientUnresolved
                                  ? 0.90
                                  : 0.92
                                : 0.90
                            )
                      ) *
                      (
                        face.surfaceOpacity ??
                        1
                      ) *
                      (
                        showCuspTriangles
                          ? rendered
                              .knotConstructionOpacity *
                            constructionSurfaceVisibility
                          : 1
                      )
                    : showCuspTriangles
                    ? face.cuspBase
                      ? 0.86 *
                        (
                          face.cuspBaseOpacity ??
                          1
                        ) *
                        constructionSurfaceVisibility
                      : face.cuspCollar
                        ? face.cuspTorusOverlay
                          ? 0.48 *
                            (
                              face.cuspCollarOpacity ??
                              1
                            ) *
                            (
                              1 -
                              rendered
                                .connectedCuspSurfaceProgress
                            )
                          : (
                              face.cuspCollarSharedFace
                                ? 0.86
                                : 0.92
                            ) *
                            (
                              face.cuspCollarOpacity ??
                              1
                            ) *
                            cuspAttachmentVisibility *
                            cuspAssemblyCollarVisibility
                        : 1
                    : 1
            }
            stroke={
              face.cuspMaterialTile
                ? face.cuspMaterialColor
                : face.releasedIdentification
                ? pairFaceColor
                : face.bridge
                  ? face.bridgeColor ??
                    pairFaceColor
                  : face.pair
                    ? pairFaceColor
                    : face.cuspCollar
                  ? face.cuspTorusOverlay
                    ? face.cuspCollarColor
                    : face.cuspMaterialColor ??
                      face.cuspCollarColor
                  : face.cuspBase &&
                    face.cuspMaterialColor
                    ? face.cuspMaterialColor
                    : "rgba(244, 240, 226, 0.92)"
            }
            strokeOpacity={
              face.cuspMaterialTile
                ? (
                    face.cuspMaterialOpacity ??
                    1
                  )
                : face.releasedIdentification
                ? (
                    face
                      .releasedIdentificationKind ===
                    "shared-face"
                      ? 1
                      : 0.86
                  ) *
                  (
                    showCuspTriangles
                      ? rendered
                          .knotConstructionOpacity *
                        constructionSurfaceVisibility
                      : 1
                  )
                : face.bridge
                  ? Math.max(
                      (face.strokeOpacity ?? 1) *
                        (
                          showCuspTriangles
                            ? rendered
                                .knotConstructionOpacity *
                              constructionSurfaceVisibility
                            : 1
                        ),
                      showInterior
                        ? bridgePulseStrength
                        : 0
                    )
                  : face.pair
                    ? (
                        focused
                          ? quotientUnresolved
                            ? 0.62
                            : 0.95
                          : 0.2
                      ) *
                      (
                        face.surfaceOpacity ??
                        1
                      ) *
                      (
                        showCuspTriangles
                          ? rendered
                              .knotConstructionOpacity *
                            constructionSurfaceVisibility
                          : 1
                      )
                    : showCuspTriangles
                    ?
                      0.95 *
                      (
                        face.cuspCollar
                          ? face.cuspTorusOverlay
                            ? 0.95 *
                              (face.cuspCollarOpacity ??
                                1) *
                              (
                                1 -
                                rendered
                                  .connectedCuspSurfaceProgress
                              )
                            : 0.08 *
                              cuspAssemblyCollarVisibility
                          : face.cuspBase
                            ?
                              (face.cuspBaseOpacity ??
                                1) *
                              constructionSurfaceVisibility
                            : constructionSurfaceVisibility
                      )
                    : 0.2
            }
            strokeWidth={
              face.cuspMaterialTile
                ? 0.45
                : face.releasedIdentification
                ? face
                    .releasedIdentificationKind ===
                  "shared-face"
                  ? 2.2
                  : 1.2
                : face.bridge
                  ? face.bridgeKind ===
                    "solid-bridge-front"
                  ? 1.7
                  : 1.05 +
                    1.45 *
                      bridgePulseStrength
                : face.pair
                  ? focused
                    ? quotientUnresolved
                      ? 1.7
                      : 2.2
                    : 1
                  : showCuspTriangles
                    ? face.cuspTorusOverlay
                      ? 1.25
                      : 0.35
                    : 1
            }
            strokeDasharray={
              !face.bridge &&
              !showCuspTriangles &&
              quotientUnresolved
                ? "5 4"
                : undefined
            }
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            onPointerDown={
              face.bridge &&
              (
                !showCuspTriangles ||
                rendered
                  .knotConstructionOpacity *
                  constructionSurfaceVisibility >
                  FACE_CONSTRAINT_EPSILON
              ) &&
              typeof onPairInteraction ===
                "function"
                ? handleBridgePointerDown
                : undefined
            }
            onClick={
              face.bridge &&
              (
                !showCuspTriangles ||
                rendered
                  .knotConstructionOpacity *
                  constructionSurfaceVisibility >
                  FACE_CONSTRAINT_EPSILON
              ) &&
              typeof onPairInteraction ===
                "function"
                ? (event) =>
                    handleBridgeClick(
                      event,
                      face.pair.id
                    )
                : undefined
            }
            style={
              face.bridge &&
              (
                !showCuspTriangles ||
                rendered
                  .knotConstructionOpacity *
                  constructionSurfaceVisibility >
                  FACE_CONSTRAINT_EPSILON
              ) &&
              typeof onPairInteraction ===
                "function"
                ? {
                    cursor: "pointer",
                  }
                : undefined
            }
          />
        );
      })}
      </g>




      {rendered
        .canonicalABInterfaceFaces
        ?.map(
          (face) => {
            const pair =
              activeFacePairs[
                face.pairId
              ];

            const color =
              pair?.color ??
              "#fff1ae";

            return (
              <polygon
                key={
                  `canonical-a-b-interface-${face.key}`
                }
                points={
                  polygonPoints(
                    face.projected
                  )
                }
                fill={color}
                fillOpacity="0.28"
                stroke="none"
                pointerEvents="none"
              />
            );
          }
        )}


      {rendered
        .canonicalABColorBoundaryLines
        ?.map(
          (edge) => {
            /*
             * Once the outer A/B shell is present, its intersection
             * with the internal sheets is already visible. Keep only
             * the genuine color-change seams; the cusp-edge outline
             * segments otherwise read as a stack of white polygon rings.
             */
            if (
              canonicalCellShellMode !== null &&
              edge.kind !== "color-change"
            ) {
              return null;
            }

            const [
              first,
              second,
            ] =
              edge.projected;

            const isColorChange =
              edge.kind ===
              "color-change";

            return (
              <line
                key={
                  `canonical-color-boundary-${edge.key}`
                }
                x1={first.x}
                y1={first.y}
                x2={second.x}
                y2={second.y}
                stroke={
                  isColorChange
                    ? "rgba(255, 248, 220, 0.98)"
                    : "rgba(255, 232, 156, 0.86)"
                }
                strokeOpacity={
                  isColorChange
                    ? 0.98
                    : 0.82
                }
                strokeWidth={
                  isColorChange
                    ? 2.0
                    : 1.35
                }
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                pointerEvents="none"
              />
            );
          }
        )}


      {menascoThreeBallsVisible &&
        rendered.menascoBallShellFaces.map(
          (face) => (
            <polygon
              key={face.key}

              points={
                polygonPoints(
                  face.projected
                )
              }

              fill={face.fill}
              fillOpacity={face.opacity}

              stroke={face.fill}

              strokeOpacity={
                face.kind === "inner"
                  ? 0.16
                  : 0.055
              }

              strokeWidth="0.5"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
          )
        )}

      {menascoInspectionActive &&
        rendered.constructiveVolumePath && (
          <path
            d={rendered.constructiveVolumePath}
            fill="none"
            stroke="rgba(225, 232, 242, 0.30)"
            strokeOpacity={0.055}
            strokeWidth="0.34"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
          />
        )}

      {menascoInspectionActive &&
        rendered.constructiveVolumeBoundaryPath && (
          <path
            d={rendered.constructiveVolumeBoundaryPath}
            fill="none"
            stroke="rgba(255, 232, 156, 0.92)"
            strokeOpacity={0.11}
            strokeWidth="0.62"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
          />
        )}

      {(
        menascoInspectionActive ||
        menascoThreeBallsVisible
      ) && (
        <g pointerEvents="none">
          {rendered.menascoRegionFaces.map(
            (face) => (
              <polygon
                key={face.key}
                points={
                  polygonPoints(
                    face.projected
                  )
                }
                fill={face.fill}
                fillOpacity={
                  face.opacity
                }
                stroke="none"
                pointerEvents="none"
              />
            )
          )}

          {rendered.menascoRegionOutlines.map(
            (region) => (
              <polygon
                key={region.key}
                points={
                  polygonPoints(
                    region.projected
                  )
                }
                fill="none"
                stroke={
                  region.bigon
                    ? "rgba(210, 210, 210, 0.94)"
                    : "rgba(255, 241, 184, 0.98)"
                }
                strokeOpacity={
                  region.opacity
                }
                strokeWidth={
                  region.bigon
                    ? "1.2"
                    : "1.8"
                }
                strokeDasharray={
                  region.bigon
                    ? (
                        region.outer
                          ? "8 5"
                          : "4 4"
                      )
                    : undefined
                }
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                pointerEvents="none"
              />
            )
          )}

          {rendered.menascoBubblePaths.map(
            (bubble) => (
              <path
                key={bubble.key}
                d={bubble.path}
                fill="none"
                stroke="rgba(255, 214, 94, 1)"
                strokeOpacity={bubble.opacity}
                strokeWidth="1.5"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            )
          )}

          {rendered.menascoCrossingLines.map(
            (edge) => (
              <line
                key={edge.key}
                x1={edge.first.x}
                y1={edge.first.y}
                x2={edge.second.x}
                y2={edge.second.y}
                stroke="rgba(255, 186, 54, 1)"
                strokeOpacity={edge.opacity}
                strokeWidth="3"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            )
          )}

          {rendered.menascoCorePath && (
            <path
              d={rendered.menascoCorePath}
              fill="none"
              stroke={
                rendered.menascoValid
                  ? "rgba(255, 250, 229, 0.98)"
                  : "rgba(255, 84, 84, 0.98)"
              }
              strokeWidth={
                menascoThreeBallsVisible
                  ? "6.2"
                  : "3.2"
              }
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {rendered.menascoLabels.map(
            (label) => (
              <text
                key={label.key}
                x={label.projected.x}
                y={label.projected.y}
                textAnchor="middle"
                fill={label.color}
                fillOpacity={label.opacity}
                stroke="rgba(6, 8, 12, 0.92)"
                strokeOpacity={label.opacity}
                strokeWidth={
                  label.small
                    ? "2.5"
                    : "4"
                }
                paintOrder="stroke"
                fontFamily="Times New Roman, serif"
                fontSize={
                  label.small
                    ? "12"
                    : "22"
                }
                pointerEvents="none"
              >
                {label.text}
              </text>
            )
          )}

          <text
            x={
              rendered
                .menascoStatusAnchor
                .x
            }
            y={
              rendered
                .menascoStatusAnchor
                .y
            }
            fill={
              rendered.menascoValid
                ? "rgba(245, 238, 217, 0.96)"
                : "rgba(255, 96, 96, 0.98)"
            }
            stroke="rgba(5, 7, 10, 0.94)"
            strokeWidth="3"
            paintOrder="stroke"
            fontFamily="Times New Roman, serif"
            fontSize="14"
          >
            <tspan
              x={
                rendered
                  .menascoStatusAnchor
                  .x
              }
              dy="0"
            >
              {
                `${rendered.menascoCrossingCount} crossings · ` +
                `${rendered.menascoRegionCount} regions`
              }
            </tspan>

            <tspan
              x={
                rendered
                  .menascoStatusAnchor
                  .x
              }
              dy="18"
            >
              {
                `${rendered.menascoTriangleRegionCount} triangles + ` +
                `${rendered.menascoBigonRegionCount} bigons`
              }
            </tspan>

            <tspan
              x={
                rendered
                  .menascoStatusAnchor
                  .x
              }
              dy="18"
              fill={
                rendered
                  .menascoBallProgress >
                1 -
                  FACE_CONSTRAINT_EPSILON
                  ? "#9fcfff"
                  : "rgba(245, 238, 217, 0.96)"
              }
            >
              {
                rendered
                  .menascoBallProgress >
                1 -
                  FACE_CONSTRAINT_EPSILON
                  ? "4 faces cut the complement into two open 3-balls"
                  : "collapse the two bigons → four triangular faces"
              }
            </tspan>
          </text>
        </g>
      )}

      {canonicalCellShellMode === null &&
        !menascoInspectionActive &&
        !menascoThreeBallsVisible &&
        constructiveFinalDisplayActive &&
        rendered.constructiveVolumeBoundaryPath && (
          <path
            d={
              rendered
                .constructiveVolumeBoundaryPath
            }
            fill="none"
            stroke="rgba(255, 232, 156, 0.96)"
            strokeOpacity={0.92}
            strokeWidth="1.15"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
          />
        )}


      {canonicalCellShellMode === null &&
        showInterior &&
        !rendered.constructiveVolumeActive &&
        rendered.faces.map((face) => {
          const structuralColor =
            face.bridge
              ? face.bridgeColor ??
                face.faceColor ??
                face.releasedColor ??
                face.pair?.color ??
                "rgba(244, 240, 226, 0.88)"
              : face.faceColor ??
                face.releasedColor ??
                (
                  face.pair
                    ? faceEndpointColor(
                        face.pair,
                        face.tetrahedronId
                      )
                    : null
                ) ??
                "rgba(244, 240, 226, 0.88)";

          const isContinuationFace =
            Boolean(
              face.pair ||
              face.bridge ||
              face.releasedIdentification
            );

          return (
            <polygon
              key={`interior-shell-${face.key}`}
              points={
                polygonPoints(
                  face.projected
                )
              }
              fill={
                isContinuationFace
                  ? "none"
                  : "rgba(244, 240, 226, 0.10)"
              }
              stroke={structuralColor}
              strokeOpacity={
                isContinuationFace
                  ? 0.72
                  : 0.52
              }
              strokeWidth={
                isContinuationFace
                  ? 1.45
                  : 1.0
              }
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
          );
        })}

      {canonicalCellShellMode === null &&
        rendered.intrinsicVolumeDebugLines.map(
        (line) => {
          const tetrahedronColor =
            line.tetrahedronId === "A"
              ? "rgba(255, 214, 120, 0.92)"
              : "rgba(126, 216, 255, 0.92)";

          const stroke =
            line.kind === "core-spoke"
              ? tetrahedronColor
              : line.kind === "face-spoke"
              ? tetrahedronColor
              : line.kind === "boundary-rim"
              ? tetrahedronColor
              : line.kind === "cell-diagonal"
              ? tetrahedronColor
              : tetrahedronColor;

          const strokeWidth =
            line.kind === "core-spoke"
              ? 1.7
              : line.kind === "face-spoke"
              ? 1.15
              : line.kind === "boundary-rim"
              ? 0.92
              : line.kind === "cell-diagonal"
              ? 0.72
              : 0.85;

          const opacity =
            line.kind === "core-spoke"
              ? 0.96
              : line.kind === "face-spoke"
              ? 0.82
              : line.kind === "boundary-rim"
              ? 0.54
              : line.kind === "cell-diagonal"
              ? 0.26
              : 0.44;

          return (
            <line
              key={line.key}
              x1={line.projected[0].x}
              y1={line.projected[0].y}
              x2={line.projected[1].x}
              y2={line.projected[1].y}
              stroke={stroke}
              strokeOpacity={opacity}
              strokeWidth={strokeWidth}
              strokeDasharray={
                line.kind ===
                "cell-diagonal"
                  ? "3 3"
                  : undefined
              }
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
          );
        }
      )}

      {canonicalCellShellMode === null &&
        rendered.intrinsicVolumeDebugPoints.map(
        (point) => {
          const fill =
            point.tetrahedronId === "A"
              ? "rgba(255, 214, 120, 0.96)"
              : "rgba(126, 216, 255, 0.96)";

          const radius =
            point.kind === "body-center"
              ? 3.0
              : 2.0;

          return (
            <circle
              key={point.key}
              cx={point.projected.x}
              cy={point.projected.y}
              r={radius}
              fill={fill}
              fillOpacity={
                point.kind ===
                "body-center"
                  ? 0.92
                  : 0.76
              }
              stroke="rgba(12, 12, 12, 0.55)"
              strokeWidth={0.55}
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
          );
        }
      )}

      {canonicalCellShellMode === null &&
        showIntrinsicBoundaryCorrespondence &&
        rendered
          .intrinsicBoundaryCorrespondenceTriangles
          .map(
            (triangle) => (
              <g
                key={triangle.key}
                pointerEvents="none"
              >
                {/*
                  Correspondence lines are deliberately faint.
                  They encode equality of material address,
                  NOT an ambient route.
                */}
                {triangle.connectors.map(
                  (connector) => (
                    <line
                      key={connector.key}
                      x1={
                        connector
                          .source.x
                      }
                      y1={
                        connector
                          .source.y
                      }
                      x2={
                        connector
                          .target.x
                      }
                      y2={
                        connector
                          .target.y
                      }
                      stroke={
                        triangle
                          .materialColor
                      }
                      strokeOpacity="0.24"
                      strokeWidth="0.9"
                      strokeDasharray="4 5"
                      vectorEffect="non-scaling-stroke"
                    />
                  )
                )}

                {/*
                  SOURCE:
                  the actual truncation triangle in the compact cell.
                */}
                <polygon
                  points={
                    polygonPoints(
                      triangle
                        .sourceProjected
                    )
                  }
                  fill={
                    triangle
                      .materialColor
                  }
                  fillOpacity="0.20"
                  stroke={
                    triangle
                      .materialColor
                  }
                  strokeOpacity="0.72"
                  strokeWidth="1.1"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />

                {triangle
                  .sourceEdges
                  .map(
                    (edge) => (
                      <line
                        key={
                          edge.key
                        }
                        x1={
                          edge.start.x
                        }
                        y1={
                          edge.start.y
                        }
                        x2={
                          edge.end.x
                        }
                        y2={
                          edge.end.y
                        }
                        stroke={
                          edge.color
                        }
                        strokeOpacity="0.98"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                      />
                    )
                  )}

                {/*
                  TARGET:
                  the exact curved figure-eight torus material patch.
                */}
                {triangle
                  .targetCells
                  .map(
                    (cell) => (
                      <polygon
                        key={
                          cell.key
                        }
                        points={
                          polygonPoints(
                            cell.projected
                          )
                        }
                        fill={
                          triangle
                            .materialColor
                        }
                        fillOpacity="0.48"
                        stroke={
                          triangle
                            .materialColor
                        }
                        strokeOpacity="0.12"
                        strokeWidth="0.35"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                      />
                    )
                  )}

                {triangle
                  .targetEdges
                  .map(
                    (edge) => (
                      <polyline
                        key={
                          edge.key
                        }
                        points={
                          polygonPoints(
                            edge.points
                          )
                        }
                        fill="none"
                        stroke={
                          edge.color
                        }
                        strokeOpacity="0.98"
                        strokeWidth="2.0"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                      />
                    )
                  )}

                {triangle.connectors.map(
                  (connector) => (
                    <g
                      key={
                        `${connector.key}-points`
                      }
                    >
                      <circle
                        cx={
                          connector
                            .source.x
                        }
                        cy={
                          connector
                            .source.y
                        }
                        r="2.8"
                        fill={
                          triangle
                            .materialColor
                        }
                        stroke="rgba(10,10,10,0.9)"
                        strokeWidth="0.7"
                      />

                      <circle
                        cx={
                          connector
                            .target.x
                        }
                        cy={
                          connector
                            .target.y
                        }
                        r="2.8"
                        fill={
                          triangle
                            .materialColor
                        }
                        stroke="rgba(10,10,10,0.9)"
                        strokeWidth="0.7"
                      />
                    </g>
                  )
                )}

                <text
                  x={
                    triangle
                      .sourceCenter.x
                  }
                  y={
                    triangle
                      .sourceCenter.y -
                    8
                  }
                  textAnchor="middle"
                  fill="rgba(248,242,224,0.95)"
                  stroke="rgba(8,8,8,0.9)"
                  strokeWidth="3"
                  paintOrder="stroke"
                  fontFamily="Times New Roman, serif"
                  fontSize="12"
                >
                  {
                    triangle
                      .cuspBaseId
                  }
                </text>

                <text
                  x={
                    triangle
                      .targetCenter.x
                  }
                  y={
                    triangle
                      .targetCenter.y -
                    8
                  }
                  textAnchor="middle"
                  fill="rgba(248,242,224,0.95)"
                  stroke="rgba(8,8,8,0.9)"
                  strokeWidth="3"
                  paintOrder="stroke"
                  fontFamily="Times New Roman, serif"
                  fontSize="12"
                >
                  {
                    triangle
                      .cuspBaseId
                  }
                </text>
              </g>
            )
          )}

      {canonicalCellShellMode === null &&
        !showCuspTriangles &&
        rendered
          .quotientIdentifications
          .map((identification) => (
            <g
              key={identification.key}
              pointerEvents="none"
            >
              {identification.stems.map(
                (stem, stemIndex) => (
                  <line
                    key={
                      `stem-${stemIndex}`
                    }
                    x1={stem.start.x}
                    y1={stem.start.y}
                    x2={stem.end.x}
                    y2={stem.end.y}
                    stroke="rgba(232, 223, 200, 0.34)"
                    strokeWidth="1"
                    strokeDasharray="3 5"
                    vectorEffect="non-scaling-stroke"
                  />
                )
              )}

              <polygon
                points={polygonPoints(
                  identification.projectedA
                )}
                fill={
                  identification.pair.AColor ??
                    identification.pair.color
                }
                fillOpacity="0.16"
                stroke={
                  identification.pair.AColor ??
                    identification.pair.color
                }
                strokeOpacity="0.9"
                strokeWidth="1.7"
                strokeDasharray="5 4"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />

              <polygon
                points={polygonPoints(
                  identification.projectedB
                )}
                fill={
                  identification.pair.BColor ??
                    identification.pair.color
                }
                fillOpacity="0.16"
                stroke={
                  identification.pair.BColor ??
                    identification.pair.color
                }
                strokeOpacity="0.9"
                strokeWidth="1.7"
                strokeDasharray="5 4"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />

              {identification.connectors.map(
                (connector) => (
                  <g key={connector.key}>
                    <path
                      d={connector.path}
                      fill="none"
                      stroke={
                        identification
                          .pair.color
                      }
                      strokeOpacity="0.72"
                      strokeWidth="1.35"
                      strokeDasharray="3 3"
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                    />

                    <circle
                      cx={connector.start.x}
                      cy={connector.start.y}
                      r="2"
                      fill={
                        identification
                          .pair.color
                      }
                    />

                    <circle
                      cx={connector.end.x}
                      cy={connector.end.y}
                      r="2"
                      fill={
                        identification
                          .pair.color
                      }
                    />
                  </g>
                )
              )}

              <circle
                cx={
                  identification
                    .symbolPoint.x
                }
                cy={
                  identification
                    .symbolPoint.y
                }
                r="11"
                fill="rgba(8, 8, 8, 0.9)"
                stroke={
                  identification.pair.color
                }
                strokeWidth="1.4"
                vectorEffect="non-scaling-stroke"
              />

              <text
                x={
                  identification
                    .symbolPoint.x
                }
                y={
                  identification
                    .symbolPoint.y +
                  5
                }
                textAnchor="middle"
                fill="rgba(250, 246, 232, 0.98)"
                fontFamily="Times New Roman, serif"
                fontSize="18"
              >
                ∼
              </text>
            </g>
          ))}

      {canonicalCellShellMode === null &&
        showCuspTriangles && (
        <g
          opacity={
            rendered.cuspDomain.opacity
          }
          pointerEvents="none"
        >
                    <text
            x="500"
            y="126"
            textAnchor="middle"
            fill="rgba(232, 223, 200, 0.86)"
            fontFamily="Times New Roman, serif"
            fontSize="16"
          >
            cusp-torus fundamental domain
          </text>

          <text
            x="500"
            y="588"
            textAnchor="middle"
            fill="rgba(232, 223, 200, 0.7)"
            fontFamily="Times New Roman, serif"
            fontSize="13"
          >
            matching boundary paths are identified
          </text>
        </g>
      )}

      {canonicalCellShellMode === null &&
        showCuspTriangles &&
        !constructiveFinalDisplayActive &&
        rendered.cuspEdgeMatches.map(
          (match) => (
            <g
              key={match.key}
              opacity={
                rendered.cuspEdgeOpacity
              }
              pointerEvents="none"
            >
              {match.segments.map(
                (segment, segmentIndex) => (
                  <g
                    key={segmentIndex}
                  >
                    <line
                      x1={segment[0].x}
                      y1={segment[0].y}
                      x2={segment[1].x}
                      y2={segment[1].y}
                      stroke={
                        match.colors?.[
                          segmentIndex
                        ] ?? match.color
                      }
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                    />


                  </g>
                )
              )}
            </g>
          )
        )}

      {canonicalCellShellMode === null &&
        !constructiveFinalDisplayActive &&
      rendered.labels
        .filter(
          (label) =>
            !label.occluded
        )
        .map((label) => (
        <text
          key={label.key}
          x={label.point.x}
          y={label.point.y + 4}
          textAnchor="middle"
          fill="rgba(232, 223, 200, 0.78)"
          fillOpacity={
            label.opacity ?? 1
          }
          fontFamily="Times New Roman, serif"
          fontSize="13"
          pointerEvents="none"
        >
          {label.text}
        </text>
      ))}

      {canonicalCellShellMode === null &&
        !constructiveFinalDisplayActive &&
      rendered.callouts.map((callout) => (
        <text
          key={callout.key}
          x={callout.point.x}
          y={callout.point.y + 7}
          textAnchor="middle"
          fill="rgba(245, 238, 219, 0.96)"
          fillOpacity={callout.opacity}
          stroke="rgba(10, 9, 8, 0.88)"
          strokeOpacity={callout.opacity}
          strokeWidth="4"
          paintOrder="stroke"
          fontFamily="Times New Roman, serif"
          fontSize="24"
          fontStyle="italic"
          pointerEvents="none"
        >
          {callout.text}
        </text>
      ))}
      {canonicalCellShellMode === null &&
        !showCuspTriangles &&
        !constructiveFinalDisplayActive &&
        process.env.NODE_ENV ===
          "development" &&
        showDeveloperDiagnostics && (
          <g pointerEvents="none">
            <rect
              x={DEVELOPER_DIAGNOSTICS_RIGHT_X}
              y={DEVELOPER_DIAGNOSTICS_BOTTOM_Y}
              width="430"
              height="76"
              rx="6"
              fill="rgba(8, 8, 8, 0.82)"
              stroke={compactAccent}
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />

            <text
              x={DEVELOPER_DIAGNOSTICS_RIGHT_X + 12}
              y={DEVELOPER_DIAGNOSTICS_BOTTOM_Y + 21}
              fill={compactTextAccent}
              fontFamily="Times New Roman, serif"
              fontSize="13"
            >
              {rendered
                .validityDiagnostics
                .status ===
                "complete"
                ? "embedding state: complete"
                : rendered
                    .validityDiagnostics
                    .status ===
                    "routed"
                  ? rendered
                      .collisionDiagnostics
                      .plannerActive
                    ? "embedding state: routed — directional planner active"
                    : "embedding state: routed — identification in progress"
                  : rendered
                      .validityDiagnostics
                      .status ===
                      "blocked"
                    ? rendered
                        .quotientDisplayActive
                      ? `embedding state: blocked — cut-open ${activeFacePairs[rendered.collisionDiagnostics.blockedPairId]?.label ?? "active face"}`
                      : `embedding state: blocked — ${activeFacePairs[rendered.collisionDiagnostics.blockedPairId]?.label ?? "active face"}`
                    : rendered
                        .quotientCutOpenValid
                      ? "quotient state: cut-open completion"
                      : "quotient state: no valid cut-open display state"}
            </text>

            <text
              x={DEVELOPER_DIAGNOSTICS_RIGHT_X + 12}
              y={DEVELOPER_DIAGNOSTICS_BOTTOM_Y + 41}
              fill="rgba(232, 223, 200, 0.76)"
              fontFamily="Times New Roman, serif"
              fontSize="12"
            >
              {`seam max ${rendered.validityDiagnostics.maximumSeamError.toFixed(2)} · clearance ${rendered.validityDiagnostics.minimumClearance === null ? "—" : rendered.validityDiagnostics.minimumClearance.toFixed(2)} · edge ${Math.round(rendered.validityDiagnostics.maximumEdgeDistortion * 100)}%`}
            </text>

            <text
              x={DEVELOPER_DIAGNOSTICS_RIGHT_X + 12}
              y={DEVELOPER_DIAGNOSTICS_BOTTOM_Y + 61}
              fill="rgba(232, 223, 200, 0.62)"
              fontFamily="Times New Roman, serif"
              fontSize="12"
            >
              {rendered
                .quotientDisplayActive
                ? `physical seams ${rendered.quotientPhysicalSeamCount} · quotient links ${rendered.quotientIdentifications.length} · abstract pairs ${rendered.quotientRequestedPairCount}/4 · cut-open ${rendered.quotientCutOpenStrength === null ? "—" : `${Math.round(rendered.quotientCutOpenStrength * 100)}%`}`
                : rendered
                    .collisionDiagnostics
                    .blockedPairId !== null
                  ? `accepted ${Math.round((rendered.collisionDiagnostics.acceptedStrength ?? 0) * 100)}% of ${Math.round((rendered.collisionDiagnostics.requestedStrength ?? 0) * 100)}% · routes ${rendered.collisionDiagnostics.blockedPlannerValidCandidateCount}/${rendered.collisionDiagnostics.blockedPlannerCandidateCount} · residual ${rendered.validityDiagnostics.solverResidual.toFixed(3)}`
                  : `area ${rendered.validityDiagnostics.minimumTriangleAreaRatio.toFixed(2)}–${rendered.validityDiagnostics.maximumTriangleAreaRatio.toFixed(2)} · residual ${rendered.validityDiagnostics.solverResidual.toFixed(3)} · inverted ${rendered.validityDiagnostics.invertedTriangleCount}`}
            </text>
          </g>
        )}





    </svg>
  );
}
