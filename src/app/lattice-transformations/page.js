"use client";


import { useEffect, useMemo, useState } from "react";

const AXES = [
  { key: "t", label: "time" },
  { key: "l", label: "space" },
  { key: "q", label: "charge" },
  { key: "theta", label: "temp" },
  { key: "m", label: "mass" },
  { key: "n", label: "mol" },
];

const AXIS_COLORS = [
  "#ff4545",
  "#fff000",
  "#3a9cff",
  "#1eff73",
  "#ff63ff",
  "#39fff3",
];

const BASIS_6_TO_3 = [
  [-1.05, -0.24, 0.16],
  [0.95, -0.32, 0.25],
  [0.08, 0.98, -0.38],
  [-0.48, 0.58, 0.74],
  [0.58, 0.34, 0.72],
  [-0.62, 0.28, -0.8],
];

const VIEW = { width: 1040, height: 650, pad: 74 };

const CELL_RENDER_STYLE = {
  edgeStrokeWidth: "2.00",
  edgeOpacity: "0.80",
  rewriteScaffoldStrokeWidth: "1.25",
  rewriteScaffoldOpacity: "0.24",
  activeBondStrokeWidth: "4.0",
  activeBondOpacity: "0.90",
  vertexRadius: "4.0",
  vertexStrokeWidth: "1.2",
};

const SWAP_ARC_HEIGHT_FACTOR = 0.55;

function cubeOppositeFaceBonds(windingCount = 1) {
  return [
    // Branch A: hinge path on the c=0 face of ONE selected subcube:
    // 000→100→110 rewrites to 000→010→110.
    {
      id: `cube-branch-A-${windingCount}-leg-1`,
      before: ["0,0,0", "1,0,0"],
      after: ["0,0,0", "0,1,0"],
      closureBefore: ["0,0", "1,0"],
      closureAfter: ["0,0", "0,1"],
      color: "#f2c66d",
    },
    {
      id: `cube-branch-A-${windingCount}-leg-2`,
      before: ["1,0,0", "1,1,0"],
      after: ["0,1,0", "1,1,0"],
      closureBefore: ["1,0", "1,1"],
      closureAfter: ["0,1", "1,1"],
      color: "#f2c66d",
    },

    // Branch B: complementary hinge path on the adjacent b=0 face
    // of that same selected subcube:
    // 000→001→101 rewrites to 000→100→101.
    {
      id: `cube-branch-B-complement-${windingCount}-leg-1`,
      before: ["0,0,0", "0,0,1"],
      after: ["0,0,0", "1,0,0"],
      closureBefore: ["0,0", "0,1"],
      closureAfter: ["0,0", "1,0"],
      color: "#8fb8ff",
    },
    {
      id: `cube-branch-B-complement-${windingCount}-leg-2`,
      before: ["0,0,1", "1,0,1"],
      after: ["1,0,0", "1,0,1"],
      closureBefore: ["0,1", "1,1"],
      closureAfter: ["1,0", "1,1"],
      color: "#8fb8ff",
    },
  ];
}

function faceHingeBonds(windingCount = 1, paired = false) {
  const branchA = [
    {
      id: `ordinary-${windingCount}-leg-1`,
      before: ["0,0", "1,0"],
      after: ["0,0", "0,1"],
      color: "#f2c66d",
    },
    {
      id: `ordinary-${windingCount}-leg-2`,
      before: ["1,0", "1,1"],
      after: ["0,1", "1,1"],
      color: "#f2c66d",
    },
  ];

  const branchB = [
    {
      id: `complement-${windingCount}-leg-1`,
      before: ["0,0", "0,1"],
      after: ["0,0", "1,0"],
      color: "#8fb8ff",
    },
    {
      id: `complement-${windingCount}-leg-2`,
      before: ["0,1", "1,1"],
      after: ["1,0", "1,1"],
      color: "#8fb8ff",
    },
  ];

  return paired ? [...branchA, ...branchB] : branchA;
}

function threeEdgeChainBonds(windingCount = 1, paired = false) {
  const branchA = [
    // Before: 00→10→11→01
    // After:  00→01→11→10
    {
      id: `ordinary-chain-${windingCount}-leg-1`,
      before: ["0,0", "1,0"],
      after: ["0,0", "0,1"],
      color: "#f2c66d",
    },
    {
      id: `ordinary-chain-${windingCount}-leg-2`,
      before: ["1,0", "1,1"],
      after: ["0,1", "1,1"],
      color: "#f2c66d",
    },
    {
      id: `ordinary-chain-${windingCount}-leg-3`,
      before: ["1,1", "0,1"],
      after: ["1,1", "1,0"],
      color: "#f2c66d",
    },
  ];

  const branchB = [
    // Complement: inverse chain transfer.
    {
      id: `complement-chain-${windingCount}-leg-1`,
      before: ["0,0", "0,1"],
      after: ["0,0", "1,0"],
      color: "#8fb8ff",
    },
    {
      id: `complement-chain-${windingCount}-leg-2`,
      before: ["0,1", "1,1"],
      after: ["1,0", "1,1"],
      color: "#8fb8ff",
    },
    {
      id: `complement-chain-${windingCount}-leg-3`,
      before: ["1,1", "1,0"],
      after: ["1,1", "0,1"],
      color: "#8fb8ff",
    },
  ];

  return paired ? [...branchA, ...branchB] : branchA;
}

function edgeFlipBonds(windingCount = 1, paired = false) {
  const branchA = [
    {
      id: `ordinary-edge-${windingCount}`,
      before: ["0", "1"],
      after: ["1", "0"],
      color: "#f2c66d",
    },
  ];

  const branchB = [
    {
      id: `complement-edge-${windingCount}`,
      before: ["1", "0"],
      after: ["0", "1"],
      color: "#8fb8ff",
    },
  ];

  return paired ? [...branchA, ...branchB] : branchA;
}

function supportRankLabel(rank) {
  if (rank === "edge1") return "1D edge";
  if (rank === "chain3") return "3-edge chain";
  if (rank === "cube3") return "3D subcube";
  return "2D face";
}

function moveSupportRank(move) {
  return move.supportRank ?? "face2";
}

const MOVE_LIBRARY = [
  {
    key: "identity",
    label: "identity",
    dimensions: [1, 2, 3, 4, 5, 6],
    kind: "cell symmetry",
    description: "The reference cell. No vertices or bonds change.",
  },
  {
    key: "orientationReversal",
    label: "orientation reversal",
    dimensions: [1],
    kind: "cell symmetry",
    description: "The two endpoints exchange addresses. The interval returns to itself.",
  },
  {
    key: "edgeSwap1",
    label: "edge swap 1",
    dimensions: [1, 2, 3, 4, 5, 6],
    kind: "edge rewrite",
    supportRank: "edge1",
    windingCount: 1,
    description:
      "A selected one-edge support swaps its two endpoint addresses by a midpoint half-turn.",
    beforeLabel: "E₀ = oriented edge 0→1",
    afterLabel: "E₁ = oriented edge 1→0",
    bonds: edgeFlipBonds(1, false),
  },
  {
    key: "pairedEdgeSwap1",
    label: "edge swap 1 + complement 1",
    dimensions: [1, 2, 3, 4, 5, 6],
    kind: "paired edge rewrite",
    supportRank: "edge1",
    windingCount: 1,
    description:
      "An edge endpoint swap paired with its reverse complement. The undirected edge support is preserved.",
    beforeLabel: "paired total before: edge orientation and reverse complement",
    afterLabel: "paired total after: edge orientation and reverse complement",
    bonds: edgeFlipBonds(1, true),
  },
  {
    key: "edgeSwap2",
    label: "edge swap 2",
    dimensions: [1, 2, 3, 4, 5, 6],
    kind: "edge rewrite",
    supportRank: "edge1",
    windingCount: 2,
    description:
      "The same selected one-edge endpoint swap with one extra midpoint winding before landing.",
    beforeLabel: "E₀ = oriented edge 0→1",
    afterLabel: "E₁ = oriented edge 1→0",
    bonds: edgeFlipBonds(2, false),
  },
  {
    key: "pairedEdgeSwap2",
    label: "edge swap 2 + complement 2",
    dimensions: [1, 2, 3, 4, 5, 6],
    kind: "paired edge rewrite",
    supportRank: "edge1",
    windingCount: 2,
    description:
      "The one-edge endpoint swap and reverse complement with matching winding count.",
    beforeLabel: "paired total before: edge orientation and reverse complement",
    afterLabel: "paired total after: edge orientation and reverse complement",
    bonds: edgeFlipBonds(2, true),
  },
  {
    key: "edgeSwap3",
    label: "edge swap 3",
    dimensions: [1, 2, 3, 4, 5, 6],
    kind: "edge rewrite",
    supportRank: "edge1",
    windingCount: 3,
    description:
      "The same selected one-edge endpoint swap with two extra midpoint windings before landing.",
    beforeLabel: "E₀ = oriented edge 0→1",
    afterLabel: "E₁ = oriented edge 1→0",
    bonds: edgeFlipBonds(3, false),
  },
  {
    key: "pairedEdgeSwap3",
    label: "edge swap 3 + complement 3",
    dimensions: [1, 2, 3, 4, 5, 6],
    kind: "paired edge rewrite",
    supportRank: "edge1",
    windingCount: 3,
    description:
      "The one-edge endpoint swap and reverse complement with matching winding count.",
    beforeLabel: "paired total before: edge orientation and reverse complement",
    afterLabel: "paired total after: edge orientation and reverse complement",
    bonds: edgeFlipBonds(3, true),
  },

  {
    key: "genericAxisFlip",
    label: "flip selected axis",
    dimensions: [2, 3, 4, 5, 6],
    kind: "cell symmetry",
    description: "Global automorphism: flip the selected axis A across its midpoint.",
  },
  {
    key: "genericAxisSwap",
    label: "swap selected axes",
    dimensions: [2, 3, 4, 5, 6],
    kind: "cell symmetry",
    description: "Global automorphism: swap selected axes A and B.",
  },
  {
    key: "genericPlaneRotation90",
    label: "π/2 rotation in selected plane",
    dimensions: [2, 3, 4, 5, 6],
    kind: "cell symmetry",
    description: "Global automorphism: rotate every selected A-B face by π/2.",
  },
  {
    key: "genericPlaneRotation180",
    label: "π rotation in selected plane",
    dimensions: [2, 3, 4, 5, 6],
    kind: "cell symmetry",
    description: "Global automorphism: rotate every selected A-B face by π.",
  },
  {
    key: "genericPlaneRotation270",
    label: "3π/2 rotation in selected plane",
    dimensions: [2, 3, 4, 5, 6],
    kind: "cell symmetry",
    description: "Global automorphism: rotate every selected A-B face by 3π/2.",
  },
  {
    key: "genericFullInversion",
    label: "full cell inversion",
    dimensions: [2, 3, 4, 5, 6],
    kind: "cell symmetry",
    description: "Global automorphism: invert every active coordinate through the cell center.",
  },
  {
    key: "verticalReflection",
    label: "vertical reflection",
    dimensions: [2],
    kind: "cell symmetry",
    description: "Reflect the square across the vertical midline: t ↦ 1−t.",
  },
  {
    key: "horizontalReflection",
    label: "horizontal reflection",
    dimensions: [2],
    kind: "cell symmetry",
    description: "Reflect the square across the horizontal midline: l ↦ 1−l.",
  },
  {
    key: "axisSwap",
    label: "axis swap / diagonal reflection",
    dimensions: [2],
    kind: "cell symmetry",
    description: "Swap the two active axes: (t,l) ↦ (l,t).",
  },
  {
    key: "antiDiagonalReflection",
    label: "anti-diagonal reflection",
    dimensions: [2],
    kind: "cell symmetry",
    description: "Reflect the square across the anti-diagonal: (t,l) ↦ (1−l,1−t).",
  },
  {
    key: "rotation270",
    label: "3π/2 rotation",
    dimensions: [2],
    kind: "cell symmetry",
    description: "Cycle the four vertices counterclockwise: (t,l) ↦ (l,1−t).",
  },
  {
    key: "rotation180",
    label: "π rotation",
    dimensions: [2],
    kind: "cell symmetry",
    description: "Rotate the square cell by 180°: (t,l) ↦ (1−t,1−l).",
  },
  {
    key: "rotation90",
    label: "π/2 rotation",
    dimensions: [2],
    kind: "cell symmetry",
    description: "Cycle the four vertices around the square: (t,l) ↦ (1−l,t).",
  },
  {
    key: "flipT3D",
    label: "flip t axis",
    dimensions: [3],
    kind: "cell symmetry",
    description: "Reflect the cube across the t midpoint: t ↦ 1−t.",
  },
  {
    key: "flipL3D",
    label: "flip l axis",
    dimensions: [3],
    kind: "cell symmetry",
    description: "Reflect the cube across the l midpoint: l ↦ 1−l.",
  },
  {
    key: "flipQ3D",
    label: "flip q axis",
    dimensions: [3],
    kind: "cell symmetry",
    description: "Reflect the cube across the q midpoint: q ↦ 1−q.",
  },
  {
    key: "swapTL3D",
    label: "axis swap t↔l",
    dimensions: [3],
    kind: "cell symmetry",
    description: "Exchange the t and l axes while q remains fixed.",
  },
  {
    key: "swapTQ3D",
    label: "axis swap t↔q",
    dimensions: [3],
    kind: "cell symmetry",
    description: "Exchange the t and q axes while l remains fixed.",
  },
  {
    key: "swapLQ3D",
    label: "axis swap l↔q",
    dimensions: [3],
    kind: "cell symmetry",
    description: "Exchange the l and q axes while t remains fixed.",
  },
  {
    key: "faceRotationTL3D",
    label: "t-l face rotation",
    dimensions: [3],
    kind: "cell symmetry",
    description: "Rotate each t-l square face by 90° while q remains fixed: (t,l,q) ↦ (1−l,t,q).",
  },
  {
    key: "cubeInversion3D",
    label: "cube inversion",
    dimensions: [3],
    kind: "cell symmetry",
    description: "Invert the cube through its center: (t,l,q) ↦ (1−t,1−l,1−q).",
  },
  {
    key: "pairedOppositeFaceRewrite1",
    label: "cube-boundary closure 1",
    kind: "cube-boundary rewrite",
    dimensions: [3, 4, 5, 6],
    supportRank: "cube3",
    windingCount: 1,
    description:
      "A connected hinge rewrite on one face of the selected 3D subcube, paired with an adjacent-face hinge complement and closed by the remaining cube-boundary shell.",
    beforeLabel: "branch A and branch B begin on adjacent faces of the same selected subcube",
    afterLabel: "the active pair closes through the remaining cube-boundary shell",
    bonds: cubeOppositeFaceBonds(1),
  },
  {
    key: "pairedOppositeFaceRewrite2",
    label: "cube-boundary closure 2",
    kind: "cube-boundary rewrite",
    dimensions: [3, 4, 5, 6],
    supportRank: "cube3",
    windingCount: 2,
    description:
      "The same cube-boundary closure with one extra midpoint winding before landing.",
    beforeLabel: "branch A and branch B begin on adjacent faces of the same selected subcube",
    afterLabel: "the active pair closes through the remaining cube-boundary shell after one extra winding",
    bonds: cubeOppositeFaceBonds(2),
  },
  {
    key: "pairedOppositeFaceRewrite3",
    label: "cube-boundary closure 3",
    kind: "cube-boundary rewrite",
    dimensions: [3, 4, 5, 6],
    supportRank: "cube3",
    windingCount: 3,
    description:
      "The same cube-boundary closure with two extra midpoint windings before landing.",
    beforeLabel: "branch A and branch B begin on adjacent faces of the same selected subcube",
    afterLabel: "the active pair closes through the remaining cube-boundary shell after two extra windings",
    bonds: cubeOppositeFaceBonds(3),
  },

  {
    key: "faceBondSwitch3D",
    label: "embedded face bond switch",
    dimensions: [],
    kind: "bond rewrite",
    description: "A 2D bond switch embedded on the q=0 face of the cube.",
    beforeLabel: "q=0 face: E₀ = {(000,100), (010,110)}",
    afterLabel: "q=0 face: E₁ = {(000,010), (100,110)}",
    bonds: [
      {
        id: "face-bond-one",
        before: ["0,0,0", "1,0,0"],
        after: ["0,0,0", "0,1,0"],
        color: "#f2c66d",
      },
      {
        id: "face-bond-two",
        before: ["0,1,0", "1,1,0"],
        after: ["1,0,0", "1,1,0"],
        color: "#8fb8ff",
      },
    ],
  },
  {
    key: "embeddedFaceRotationTL",
    label: "embedded t-l face rotation",
    dimensions: [],
    kind: "embedded face move",
    description:
      "Rotate the t-l square face while holding the extra coordinates fixed at zero.",
  },
  {
    key: "embeddedFaceBondSwitchTL",
    label: "embedded t-l face bond switch",
    dimensions: [],
    kind: "bond rewrite",
    description:
      "Apply the 2D horizontal-to-vertical bond switch inside the t-l face of the higher-dimensional cell.",
    beforeLabel: "t-l face: E₀ = path 00→10→11",
    afterLabel: "t-l face: E₁ = path 00→01→11",
    bonds: (dimension) => [
      {
        id: "embedded-face-bond-one",
        before: [faceId([0, 0], dimension), faceId([1, 0], dimension)],
        after: [faceId([0, 0], dimension), faceId([0, 1], dimension)],
        color: "#f2c66d",
      },
      {
        id: "embedded-face-bond-two",
        before: [faceId([0, 1], dimension), faceId([1, 1], dimension)],
        after: [faceId([1, 0], dimension), faceId([1, 1], dimension)],
        color: "#8fb8ff",
      },
    ],
  },
  {
    key: "chainSwitch1",
    label: "3-edge chain switch 1",
    dimensions: [2, 3, 4, 5, 6],
    kind: "chain rewrite",
    supportRank: "chain3",
    windingCount: 1,
    description:
      "A connected three-segment boundary path transfers its missing edge across the selected face: 00→10→11→01 rewrites to 00→01→11→10.",
    beforeLabel: "E₀ = path 00→10→11→01",
    afterLabel: "E₁ = path 00→01→11→10",
    bonds: threeEdgeChainBonds(1, false),
  },
  {
    key: "pairedChainSwitch1",
    label: "3-edge chain switch 1 + complement 1",
    dimensions: [2, 3, 4, 5, 6],
    kind: "paired chain rewrite",
    supportRank: "chain3",
    windingCount: 1,
    description:
      "A three-segment chain transfer paired with its inverse complement, preserving the square-boundary support as a typed total.",
    beforeLabel: "paired total before: chain path and inverse complement",
    afterLabel: "paired total after: chain path and inverse complement",
    bonds: threeEdgeChainBonds(1, true),
  },
  {
    key: "chainSwitch2",
    label: "3-edge chain switch 2",
    dimensions: [2, 3, 4, 5, 6],
    kind: "chain rewrite",
    supportRank: "chain3",
    windingCount: 2,
    description:
      "The same connected three-segment chain transfer with one extra midpoint winding before landing.",
    beforeLabel: "E₀ = path 00→10→11→01",
    afterLabel: "E₁ = path 00→01→11→10",
    bonds: threeEdgeChainBonds(2, false),
  },
  {
    key: "pairedChainSwitch2",
    label: "3-edge chain switch 2 + complement 2",
    dimensions: [2, 3, 4, 5, 6],
    kind: "paired chain rewrite",
    supportRank: "chain3",
    windingCount: 2,
    description:
      "The three-segment chain transfer and inverse complement with matching winding count.",
    beforeLabel: "paired total before: chain path and inverse complement",
    afterLabel: "paired total after: chain path and inverse complement",
    bonds: threeEdgeChainBonds(2, true),
  },
  {
    key: "chainSwitch3",
    label: "3-edge chain switch 3",
    dimensions: [2, 3, 4, 5, 6],
    kind: "chain rewrite",
    supportRank: "chain3",
    windingCount: 3,
    description:
      "The same connected three-segment chain transfer with two extra midpoint windings before landing.",
    beforeLabel: "E₀ = path 00→10→11→01",
    afterLabel: "E₁ = path 00→01→11→10",
    bonds: threeEdgeChainBonds(3, false),
  },
  {
    key: "pairedChainSwitch3",
    label: "3-edge chain switch 3 + complement 3",
    dimensions: [2, 3, 4, 5, 6],
    kind: "paired chain rewrite",
    supportRank: "chain3",
    windingCount: 3,
    description:
      "The three-segment chain transfer and inverse complement with matching winding count.",
    beforeLabel: "paired total before: chain path and inverse complement",
    afterLabel: "paired total after: chain path and inverse complement",
    bonds: threeEdgeChainBonds(3, true),
  },

  {
    key: "bondSwitch",
    label: "local bond switch 1",
    dimensions: [2, 3, 4, 5, 6],
    kind: "bond rewrite",
    description: "Local bond switch 1: a connected two-segment hinge path rewrites from 00→10→11 to 00→01→11.",
    beforeLabel: "E₀ = path 00→10→11",
    afterLabel: "E₁ = path 00→01→11",
    bonds: faceHingeBonds(1, false),
  },
  {
    key: "bondSwitch2",
    label: "local bond switch 2",
    dimensions: [2, 3, 4, 5, 6],
    kind: "bond rewrite",
    windingCount: 2,
    description:
      "Local bond switch 2: the same connected hinge-path rewrite, with one extra full midpoint winding before landing.",
    beforeLabel: "E₀ = path 00→10→11",
    afterLabel: "E₁ = path 00→01→11",
    bonds: faceHingeBonds(2, false),
  },
  {
    key: "pairedBondSwitch2D2",
    label: "local bond switch 2 + complement 2",
    dimensions: [2, 3, 4, 5, 6],
    kind: "paired rewrite",
    windingCount: 2,
    description:
      "Local bond switch 2 and complement 2 trade complementary connected corner paths with matching winding count. The paired total preserves the square boundary support.",
    beforeLabel: "paired total before: all four square-edge supports present",
    afterLabel: "paired total after: all four square-edge supports present",
    bonds: faceHingeBonds(2, true),
  },
  {
    key: "bondSwitch3",
    label: "local bond switch 3",
    dimensions: [2, 3, 4, 5, 6],
    kind: "bond rewrite",
    windingCount: 3,
    description:
      "Local bond switch 3: the same connected hinge-path rewrite, with two extra full midpoint windings before landing.",
    beforeLabel: "E₀ = path 00→10→11",
    afterLabel: "E₁ = path 00→01→11",
    bonds: faceHingeBonds(3, false),
  },
  {
    key: "pairedBondSwitch2D3",
    label: "local bond switch 3 + complement 3",
    dimensions: [2, 3, 4, 5, 6],
    kind: "paired rewrite",
    windingCount: 3,
    description:
      "Local bond switch 3 and complement 3 trade complementary connected corner paths with matching winding count. The paired total preserves the square boundary support.",
    beforeLabel: "paired total before: all four square-edge supports present",
    afterLabel: "paired total after: all four square-edge supports present",
    bonds: faceHingeBonds(3, true),
  },
  {
    key: "pairedBondSwitch2D",
    label: "local bond switch 1 + complement 1",
    dimensions: [2, 3, 4, 5, 6],
    kind: "paired rewrite",
    description:
      "Local bond switch 1 rewrites one connected corner path. Complement 1 rewrites the opposite connected corner path. The paired total preserves the full square boundary support.",
    beforeLabel: "paired total before: all four square-edge supports present",
    afterLabel: "paired total after: all four square-edge supports present",
    bonds: faceHingeBonds(1, true),
  },

];

function vectorKey(v) {
  return v.join(",");
}

function faceId(baseBits, dimension) {
  const bits = [...baseBits];

  while (bits.length < dimension) {
    bits.push(0);
  }

  return vectorKey(bits);
}

function normalizedAxisPair(dimension, selectedAxisA = 0, selectedAxisB = 1) {
  const axisA = Math.max(0, Math.min(dimension - 1, selectedAxisA));
  const fallbackB = axisA === 0 ? 1 : 0;
  const axisB =
    selectedAxisB === axisA
      ? fallbackB
      : Math.max(0, Math.min(dimension - 1, selectedAxisB));

  return { axisA, axisB };
}

function selectedEdgeId(
  edgeBit,
  dimension,
  selectedAxisA = 0,
  rewriteSliceBits = []
) {
  const axisA = Math.max(0, Math.min(dimension - 1, selectedAxisA));

  const bits = Array.from({ length: dimension }, (_, index) =>
    Number(rewriteSliceBits[index] ?? 0)
  );

  bits[axisA] = Number(edgeBit ?? 0);

  return vectorKey(bits);
}

function selectedFaceId(
  faceBits,
  dimension,
  selectedAxisA = 0,
  selectedAxisB = 1,
  rewriteSliceBits = []
) {
  const { axisA, axisB } = normalizedAxisPair(
    dimension,
    selectedAxisA,
    selectedAxisB
  );

  const bits = Array.from({ length: dimension }, (_, index) =>
    Number(rewriteSliceBits[index] ?? 0)
  );

  bits[axisA] = Number(faceBits[0] ?? 0);
  bits[axisB] = Number(faceBits[1] ?? 0);

  return vectorKey(bits);
}

function normalizedAxisTriple(
  dimension,
  selectedAxisA = 0,
  selectedAxisB = 1,
  selectedAxisC = 2
) {
  const axisA = Math.max(0, Math.min(dimension - 1, selectedAxisA));
  const axisB =
    selectedAxisB !== axisA && selectedAxisB < dimension
      ? selectedAxisB
      : [...Array(dimension).keys()].find((index) => index !== axisA) ?? 0;
  const axisC =
    selectedAxisC !== axisA &&
    selectedAxisC !== axisB &&
    selectedAxisC < dimension
      ? selectedAxisC
      : [...Array(dimension).keys()].find(
          (index) => index !== axisA && index !== axisB
        ) ?? 0;

  return { axisA, axisB, axisC };
}

function selectedSubcubeId(
  cubeBits,
  dimension,
  selectedAxisA = 0,
  selectedAxisB = 1,
  selectedAxisC = 2,
  rewriteSliceBits = []
) {
  const { axisA, axisB, axisC } = normalizedAxisTriple(
    dimension,
    selectedAxisA,
    selectedAxisB,
    selectedAxisC
  );

  const bits = Array.from({ length: dimension }, (_, index) =>
    Number(rewriteSliceBits[index] ?? 0)
  );

  bits[axisA] = Number(cubeBits[0] ?? 0);
  bits[axisB] = Number(cubeBits[1] ?? 0);
  bits[axisC] = Number(cubeBits[2] ?? 0);

  return vectorKey(bits);
}

function selectedSubcubeEdgeIds(
  dimension,
  selectedAxisA = 0,
  selectedAxisB = 1,
  selectedAxisC = 2,
  rewriteSliceBits = []
) {
  if (dimension < 3) return [];

  const localVertices = [];

  for (let a = 0; a <= 1; a += 1) {
    for (let b = 0; b <= 1; b += 1) {
      for (let c = 0; c <= 1; c += 1) {
        localVertices.push([a, b, c]);
      }
    }
  }

  const edges = [];

  localVertices.forEach((bits) => {
    for (let localAxis = 0; localAxis < 3; localAxis += 1) {
      if (bits[localAxis] !== 0) continue;

      const next = [...bits];
      next[localAxis] = 1;

      const aId = selectedSubcubeId(
        bits,
        dimension,
        selectedAxisA,
        selectedAxisB,
        selectedAxisC,
        rewriteSliceBits
      );
      const bId = selectedSubcubeId(
        next,
        dimension,
        selectedAxisA,
        selectedAxisB,
        selectedAxisC,
        rewriteSliceBits
      );

      edges.push({
        id: `${aId}:${bId}`,
        a: aId,
        b: bId,
      });
    }
  });

  return edges;
}

function remapRewriteBondId(
  id,
  dimension,
  selectedAxisA = 0,
  selectedAxisB = 1,
  rewriteSliceBits = [],
  selectedAxisC = 2,
  supportRank = "face2"
) {
  const parts = String(id).split(",").map(Number);

  if (parts.length === 3 && dimension >= 3 && supportRank === "cube3") {
    return selectedSubcubeId(
      parts,
      dimension,
      selectedAxisA,
      selectedAxisB,
      selectedAxisC,
      rewriteSliceBits
    );
  }

  if (parts.length === 1 && supportRank === "edge1") {
    return selectedEdgeId(
      parts[0],
      dimension,
      selectedAxisA,
      rewriteSliceBits
    );
  }

  if (parts.length === 2 && dimension >= 2) {
    return selectedFaceId(
      parts,
      dimension,
      selectedAxisA,
      selectedAxisB,
      rewriteSliceBits
    );
  }

  return id;
}

function sliceLabel(
  dimension,
  selectedAxisA,
  selectedAxisB,
  rewriteSliceBits,
  selectedAxisC = 2,
  supportRank = "face2"
) {
  const { axisA, axisB } = normalizedAxisPair(
    dimension,
    selectedAxisA,
    selectedAxisB
  );

  const axisC =
    supportRank === "cube3"
      ? normalizedAxisTriple(
          dimension,
          selectedAxisA,
          selectedAxisB,
          selectedAxisC
        ).axisC
      : null;

  const fixed = AXES.slice(0, dimension)
    .map((axis, index) =>
      index === axisA ||
      (supportRank !== "edge1" && index === axisB) ||
      (supportRank === "cube3" && index === axisC)
        ? null
        : `${axis.key}=${Number(rewriteSliceBits[index] ?? 0)}`
    )
    .filter(Boolean);

  return fixed.length ? fixed.join(", ") : "none";
}

function formatAddressValue(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function addressLabel(v) {
  return `(${v.map(formatAddressValue).join(",")})`;
}

function cellVertexCount(dimension) {
  return 2 ** dimension;
}

function cellEdgeCount(dimension) {
  return dimension * 2 ** (dimension - 1);
}

function factorial(n) {
  return n <= 1 ? 1 : n * factorial(n - 1);
}

function automorphismCount(dimension) {
  return 2 ** dimension * factorial(dimension);
}

function binomial(n, k) {
  if (k < 0 || k > n) return 0;

  const r = Math.min(k, n - k);
  let result = 1;

  for (let i = 1; i <= r; i += 1) {
    result = (result * (n - r + i)) / i;
  }

  return result;
}

function kFaceCount(dimension, k) {
  return binomial(dimension, k) * 2 ** (dimension - k);
}

function kFaceLabel(k) {
  if (k === 0) return "vertices";
  if (k === 1) return "edges";
  if (k === 2) return "square faces";
  if (k === 3) return "cube cells";
  if (k === 4) return "4-cells";
  if (k === 5) return "5-cells";
  if (k === 6) return "6-cell";
  return `${k}-faces`;
}

function kFaceSummary(dimension) {
  return Array.from({ length: dimension + 1 }, (_, k) => ({
    k,
    label: kFaceLabel(k),
    count: kFaceCount(dimension, k),
  }));
}

function moveFamilyKey(move) {
  return move.kind === "cell symmetry" ? "automorphisms" : "rewrites";
}

function moveFamilyLabel(familyKey) {
  return familyKey === "automorphisms"
    ? "cell automorphisms"
    : "local rewrites";
}

const GENERIC_AUTOMORPHISM_KEYS = new Set([
  "genericAxisFlip",
  "genericAxisSwap",
  "genericPlaneRotation90",
  "genericPlaneRotation180",
  "genericPlaneRotation270",
  "genericFullInversion",
]);

function moveDisplayRank(move) {
  const order = {
    identity: 0,

    genericAxisFlip: 20,
    genericAxisSwap: 30,
    genericPlaneRotation90: 40,
    genericPlaneRotation180: 50,
    genericPlaneRotation270: 60,
    genericFullInversion: 70,

    rotation90: 100,
    rotation180: 110,
    rotation270: 120,

    edgeSwap1: 170,
    pairedEdgeSwap1: 171,
    edgeSwap2: 172,
    pairedEdgeSwap2: 173,
    edgeSwap3: 174,
    pairedEdgeSwap3: 175,

    bondSwitch: 200,
    pairedBondSwitch2D: 210,
    bondSwitch2: 220,
    pairedBondSwitch2D2: 230,
    bondSwitch3: 240,
    pairedBondSwitch2D3: 250,

    chainSwitch1: 260,
    pairedChainSwitch1: 261,
    chainSwitch2: 262,
    pairedChainSwitch2: 263,
    chainSwitch3: 264,
    pairedChainSwitch3: 265,
  };

  return order[move.key] ?? 1000;
}

function availableMoves(dimension, familyKey, supportRank = "face2") {
  return MOVE_LIBRARY.filter((move) => {
    if (!move.dimensions.includes(dimension)) return false;
    if (move.key === "identity") return true;

    if (familyKey === "automorphisms" && dimension >= 2) {
      return GENERIC_AUTOMORPHISM_KEYS.has(move.key);
    }

    if (moveFamilyKey(move) !== familyKey) return false;

    if (familyKey === "rewrites") {
      return moveSupportRank(move) === supportRank;
    }

    return true;
  }).sort((a, b) => moveDisplayRank(a) - moveDisplayRank(b));
}

function visualDictionaryTypeForMove(move) {
  if (move.kind === "edge rewrite" || move.kind === "paired edge rewrite") {
    return "local edge rewrite";
  }

  if (move.kind === "chain rewrite" || move.kind === "paired chain rewrite") {
    return "local chain rewrite";
  }

  if (move.kind === "cell symmetry") return "cell automorphism";
  if (move.kind === "cube-boundary rewrite") return "cube-boundary rewrite";
  if (move.kind === "paired rewrite") return "paired face rewrite";
  if (move.kind === "bond rewrite") return "local face rewrite";
  return move.kind ?? "move";
}

function visualDictionarySupportForMove(move) {
  if (move.key === "identity") return "full cell";
  if (move.supportRank === "edge1") return "selected 1D edge";
  if (move.supportRank === "chain3") return "selected 3-edge chain";
  if (move.key === "orientationReversal") return "1D edge";
  if (move.kind === "cell symmetry") return "full cell";
  if (move.supportRank === "cube3") return "selected 3D subcube boundary";
  if (moveSupportRank(move) === "face2") return "selected 2D face";
  return moveSupportRank(move);
}

function visualDictionaryComplexityForMove(move) {
  if (move.key === "identity") return "0 / reference";
  if (move.supportRank === "edge1") return "1 segment";
  if (move.supportRank === "chain3") return "3 connected segments";
  if (move.key === "orientationReversal") return "1 segment";
  if (move.key === "genericAxisFlip") return "1-axis flip";
  if (move.key === "genericAxisSwap") return "2-axis swap";
  if (move.key?.startsWith("genericPlaneRotation")) return "2-axis face rotation";
  if (move.key === "genericFullInversion") return "d-axis inversion";
  if (move.supportRank === "cube3") return "cube-boundary closure";
  if (move.kind === "paired rewrite") return "paired 2-segment hinge";
  if (move.kind === "bond rewrite") return "2 connected segments";
  return "typed move";
}

function visualDictionaryClosureForMove(move) {
  if (move.key === "identity") return "already closed";
  if (move.kind === "edge rewrite") return "open oriented edge branch";
  if (move.kind === "paired edge rewrite") return "paired oriented edge complement";
  if (move.kind === "chain rewrite") return "open 3-edge chain branch";
  if (move.kind === "paired chain rewrite") return "paired 3-edge chain complement";
  if (move.kind === "cell symmetry") return "closed automorphism";
  if (move.supportRank === "cube3") return "cube-boundary shell";
  if (move.kind === "paired rewrite") return "paired face closure";
  if (move.kind === "bond rewrite") return "open local branch";
  return "—";
}

function previewDimensionForMove(move) {
  if (move.supportRank === "edge1") return 1;
  if (move.supportRank === "chain3") return 2;
  if (move.key === "orientationReversal") return 1;
  if (move.supportRank === "cube3") return 3;
  if (moveSupportRank(move) === "face2" && moveFamilyKey(move) === "rewrites") {
    return 2;
  }

  const implementedDimensions = move.dimensions?.filter((dimension) => dimension >= 1) ?? [];
  return Math.min(3, Math.max(1, implementedDimensions[0] ?? 2));
}

function moveDictionaryEntries() {
  const implemented = MOVE_LIBRARY
    .filter((move) => move.dimensions?.length)
    .map((move) => ({
      id: move.key,
      move,
      dimension: previewDimensionForMove(move),
      type: visualDictionaryTypeForMove(move),
      support: visualDictionarySupportForMove(move),
      complexity: visualDictionaryComplexityForMove(move),
      closure: visualDictionaryClosureForMove(move),
      status: "implemented",
    }));

  const planned = [
    {
      id: "planned-square-loop",
      move: null,
      dimension: 2,
      type: "local rewrite",
      support: "selected 4-edge boundary loop",
      complexity: "4 connected segments",
      closure: "closed square-boundary rewrite",
      status: "planned",
      label: "closed boundary-loop catalogue",
    },
  ];

  return [...implemented, ...planned].sort((a, b) => {
    if (a.dimension !== b.dimension) return a.dimension - b.dimension;
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    if (a.complexity !== b.complexity) {
      return a.complexity.localeCompare(b.complexity);
    }
    if (a.status !== b.status) return a.status === "implemented" ? -1 : 1;
    return (a.move?.label ?? a.label).localeCompare(b.move?.label ?? b.label);
  });
}

function makeCellGraph(dimension) {
  const vertices = [];

  function walk(prefix) {
    if (prefix.length === dimension) {
      const fullAddress = [0, 0, 0, 0, 0, 0];
      prefix.forEach((value, index) => {
        fullAddress[index] = value;
      });

      vertices.push({
        id: vectorKey(prefix),
        bits: prefix,
        address: fullAddress,
      });
      return;
    }

    walk([...prefix, 0]);
    walk([...prefix, 1]);
  }

  walk([]);

  const vertexSet = new Set(vertices.map((vertex) => vertex.id));
  const edges = [];

  vertices.forEach((vertex) => {
    for (let axisIndex = 0; axisIndex < dimension; axisIndex += 1) {
      if (vertex.bits[axisIndex] !== 0) continue;

      const nextBits = [...vertex.bits];
      nextBits[axisIndex] = 1;
      const nextId = vectorKey(nextBits);

      if (!vertexSet.has(nextId)) continue;

      edges.push({
        id: `${vertex.id}:${AXES[axisIndex].key}`,
        a: vertex.id,
        b: nextId,
        axisIndex,
      });
    }
  });

  return { vertices, edges };
}

function targetBitsForMove(
  bits,
  dimension,
  moveKey,
  selectedAxisA = 0,
  selectedAxisB = 1
) {
  if (moveKey === "identity") return [...bits];

  if (dimension >= 2) {
    const axisA = Math.max(0, Math.min(dimension - 1, selectedAxisA));
    const fallbackB = axisA === 0 ? 1 : 0;
    const axisB =
      selectedAxisB === axisA
        ? fallbackB
        : Math.max(0, Math.min(dimension - 1, selectedAxisB));

    const out = [...bits];

    if (moveKey === "genericAxisFlip") {
      out[axisA] = 1 - out[axisA];
      return out;
    }

    if (moveKey === "genericAxisSwap") {
      [out[axisA], out[axisB]] = [out[axisB], out[axisA]];
      return out;
    }

    if (moveKey === "genericPlaneRotation90") {
      const a = out[axisA];
      const b = out[axisB];
      out[axisA] = 1 - b;
      out[axisB] = a;
      return out;
    }

    if (moveKey === "genericPlaneRotation180") {
      out[axisA] = 1 - out[axisA];
      out[axisB] = 1 - out[axisB];
      return out;
    }

    if (moveKey === "genericPlaneRotation270") {
      const a = out[axisA];
      const b = out[axisB];
      out[axisA] = b;
      out[axisB] = 1 - a;
      return out;
    }

    if (moveKey === "genericFullInversion") {
      return bits.map((value, index) => (index < dimension ? 1 - value : value));
    }
  }

  if (moveKey === "orientationReversal" && dimension === 1) {
    return [1 - bits[0]];
  }

  if (dimension === 2) {
    const [t, l] = bits;

    if (moveKey === "verticalReflection") return [1 - t, l];
    if (moveKey === "horizontalReflection") return [t, 1 - l];
    if (moveKey === "axisSwap") return [l, t];
    if (moveKey === "antiDiagonalReflection") return [1 - l, 1 - t];
    if (moveKey === "rotation180") return [1 - t, 1 - l];
    if (moveKey === "rotation90") return [1 - l, t];
    if (moveKey === "rotation270") return [l, 1 - t];
  }

  if (dimension === 3) {
    const [t, l, q] = bits;

    if (moveKey === "flipT3D") return [1 - t, l, q];
    if (moveKey === "flipL3D") return [t, 1 - l, q];
    if (moveKey === "flipQ3D") return [t, l, 1 - q];
    if (moveKey === "swapTL3D") return [l, t, q];
    if (moveKey === "swapTQ3D") return [q, l, t];
    if (moveKey === "swapLQ3D") return [t, q, l];
    if (moveKey === "faceRotationTL3D") return [1 - l, t, q];
    if (moveKey === "cubeInversion3D") return [1 - t, 1 - l, 1 - q];
  }

  if (dimension >= 4 && moveKey === "embeddedFaceRotationTL") {
    const [t, l, ...rest] = bits;
    const inZeroSlice = rest.every((value) => value === 0);

    if (inZeroSlice) return [1 - l, t, ...rest];
  }

  return [...bits];
}

function targetAddressForMove(
  vertex,
  dimension,
  moveKey,
  selectedAxisA = 0,
  selectedAxisB = 1
) {
  const targetBits = targetBitsForMove(
    vertex.bits,
    dimension,
    moveKey,
    selectedAxisA,
    selectedAxisB
  );
  const target = [0, 0, 0, 0, 0, 0];

  targetBits.forEach((value, index) => {
    target[index] = value;
  });

  return target;
}

function addressForHalfTurn(vertex, halfTurnCount) {
  if (halfTurnCount % 2 === 0) return vertex.address;

  return [1 - vertex.address[0], 0, 0, 0, 0, 0];
}

function lerpValue(a, b, progress) {
  return a + (b - a) * progress;
}

function lerpAddress(a, b, progress) {
  return a.map((value, index) => lerpValue(value, b[index], progress));
}

function sameAddress(a, b) {
  return a.every((value, index) => Math.abs(value - b[index]) < 1e-9);
}

function arcSwapMoveEligible(moveKey) {
  return [
    "orientationReversal",
    "genericAxisFlip",
    "genericAxisSwap",
    "genericFullInversion",
    "verticalReflection",
    "horizontalReflection",
    "axisSwap",
    "antiDiagonalReflection",
    "flipT3D",
    "flipL3D",
    "flipQ3D",
    "swapTL3D",
    "swapTQ3D",
    "swapLQ3D",
    "cubeInversion3D",
  ].includes(moveKey);
}

function swapArcAddress(
  startAddress,
  targetAddress,
  progress,
  dimension,
  selectedAxisA = 0,
  selectedAxisB = 1
) {
  if (sameAddress(startAddress, targetAddress)) return startAddress;

  const center = startAddress.map(
    (value, index) => (value + targetAddress[index]) / 2
  );
  const delta = startAddress.map((value, index) => value - center[index]);
  const perpendicular = [0, 0, 0, 0, 0, 0];

  const activeAxes = delta
    .map((value, index) => (Math.abs(value) > 1e-9 ? index : -1))
    .filter((index) => index >= 0);

  if (dimension === 1) {
    perpendicular[1] = delta[0] * SWAP_ARC_HEIGHT_FACTOR;
  } else if (activeAxes.length === 1) {
    const axis = activeAxes[0];
    const otherAxis =
      selectedAxisB !== axis
        ? selectedAxisB
        : selectedAxisA !== axis
          ? selectedAxisA
          : (axis + 1) % Math.max(2, dimension);

    perpendicular[otherAxis] = delta[axis] * SWAP_ARC_HEIGHT_FACTOR;
  } else {
    const axis0 = activeAxes[0];
    const axis1 = activeAxes[1];

    perpendicular[axis0] = -delta[axis1] * SWAP_ARC_HEIGHT_FACTOR;
    perpendicular[axis1] = delta[axis0] * SWAP_ARC_HEIGHT_FACTOR;
  }

  const angle = Math.PI * progress;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return center.map(
    (value, index) => value + delta[index] * cos + perpendicular[index] * sin
  );
}

function rotationAngleForMove(moveKey) {
  if (moveKey === "rotation90") return Math.PI / 2;
  if (moveKey === "rotation180") return Math.PI;
  if (moveKey === "rotation270") return (3 * Math.PI) / 2;

  if (moveKey === "genericPlaneRotation90") return Math.PI / 2;
  if (moveKey === "genericPlaneRotation180") return Math.PI;
  if (moveKey === "genericPlaneRotation270") return (3 * Math.PI) / 2;

  return null;
}

function rotateSquareAddress(address, angle) {
  const x = address[0] - 0.5;
  const y = address[1] - 0.5;

  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return [
    0.5 + x * cos - y * sin,
    0.5 + x * sin + y * cos,
    0,
    0,
    0,
    0,
  ];
}

function rotatePlaneAddress(address, axisA, axisB, angle) {
  const out = [...address];
  const x = out[axisA] - 0.5;
  const y = out[axisB] - 0.5;

  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  out[axisA] = 0.5 + x * cos - y * sin;
  out[axisB] = 0.5 + x * sin + y * cos;

  return out;
}

function currentAddressForMove(
  vertex,
  dimension,
  moveKey,
  progress,
  startAddress,
  targetAddress,
  selectedAxisA = 0,
  selectedAxisB = 1
) {
  const rotationAngle = rotationAngleForMove(moveKey);

  if (moveKey.startsWith("genericPlaneRotation") && rotationAngle !== null) {
    return rotatePlaneAddress(
      vertex.address,
      selectedAxisA,
      selectedAxisB,
      rotationAngle * progress
    );
  }

  if (dimension === 2 && rotationAngle !== null) {
    return rotateSquareAddress(vertex.address, rotationAngle * progress);
  }

  if (arcSwapMoveEligible(moveKey)) {
    return swapArcAddress(
      startAddress,
      targetAddress,
      progress,
      dimension,
      selectedAxisA,
      selectedAxisB
    );
  }

  return lerpAddress(startAddress, targetAddress, progress);
}

function centerAddress(address, dimension) {
  return address.map((value, index) => {
    if (index >= dimension) return 0;
    return value - 0.5;
  });
}

function project6To3(v) {
  return v.reduce(
    (acc, value, index) => [
      acc[0] + value * BASIS_6_TO_3[index][0],
      acc[1] + value * BASIS_6_TO_3[index][1],
      acc[2] + value * BASIS_6_TO_3[index][2],
    ],
    [0, 0, 0]
  );
}

function rotate3(point, yaw, pitch) {
  const [x, y, z] = point;

  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);

  const x1 = x * cy - z * sy;
  const z1 = x * sy + z * cy;

  const y2 = y * cp - z1 * sp;
  const z2 = y * sp + z1 * cp;

  return [x1, y2, z2];
}

function rawProject(address, dimension, yaw, pitch) {
  if (dimension === 1) {
    return [address[0] - 0.5, address[1] ?? 0, 0];
  }

  return rotate3(project6To3(centerAddress(address, dimension)), yaw, pitch);
}

function makeLayout(vertices, dimension, yaw, pitch) {
  const raw = vertices.map((vertex) =>
    rawProject(vertex.address, dimension, yaw, pitch)
  );

  const xs = raw.map((point) => point[0]);
  const ys = raw.map((point) => point[1]);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const spanX = Math.max(0.001, maxX - minX);
  const spanY = Math.max(0.001, maxY - minY);

  return {
    dimension,
    yaw,
    pitch,
    scale: Math.min(
      (VIEW.width - VIEW.pad * 2) / spanX,
      (VIEW.height - VIEW.pad * 2) / spanY
    ),
    midX: (minX + maxX) / 2,
    midY: (minY + maxY) / 2,
  };
}

function projectPoint(address, layout) {
  const [rawX, rawY, z] = rawProject(
    address,
    layout.dimension,
    layout.yaw,
    layout.pitch
  );

  return {
    x: VIEW.width / 2 + (rawX - layout.midX) * layout.scale,
    y: VIEW.height / 2 - (rawY - layout.midY) * layout.scale,
    z,
  };
}

function makeFrame(
  graph,
  dimension,
  yaw,
  pitch,
  moveKey,
  progress,
  move,
  halfTurnFrom,
  selectedAxisA = 0,
  selectedAxisB = 1
) {
  const layout = makeLayout(graph.vertices, dimension, yaw, pitch);
  const shouldMoveVertices =
    move.kind === "cell symmetry" || move.kind === "embedded face move";

  const vertices = graph.vertices
    .map((vertex) => {
      let startAddress = vertex.address;
      let targetAddress = vertex.address;

      if (
        dimension === 1 &&
        moveKey === "orientationReversal" &&
        shouldMoveVertices
      ) {
        startAddress = addressForHalfTurn(vertex, halfTurnFrom);
        targetAddress = addressForHalfTurn(vertex, halfTurnFrom + 1);
      } else if (shouldMoveVertices) {
        targetAddress = targetAddressForMove(
          vertex,
          dimension,
          moveKey,
          selectedAxisA,
          selectedAxisB
        );
      }

      const currentAddress = currentAddressForMove(
        vertex,
        dimension,
        moveKey,
        progress,
        startAddress,
        targetAddress,
        selectedAxisA,
        selectedAxisB
      );
      const active = vectorKey(startAddress) !== vectorKey(targetAddress);

      return {
        ...vertex,
        active,
        currentAddress,
        targetAddress,
        ...projectPoint(currentAddress, layout),
      };
    })
    .sort((a, b) => a.z - b.z);

  const vertexMap = new Map(vertices.map((vertex) => [vertex.id, vertex]));

  const edges = graph.edges
    .map((edge) => {
      const a = vertexMap.get(edge.a);
      const b = vertexMap.get(edge.b);

      return {
        ...edge,
        a,
        b,
        active: a.active || b.active,
        z: (a.z + b.z) / 2,
      };
    })
    .sort((a, b) => a.z - b.z);

  return { vertices, edges };
}

function resolveMoveBonds(
  move,
  dimension,
  selectedAxisA = 0,
  selectedAxisB = 1,
  rewriteSliceBits = [],
  selectedAxisC = 2,
  supportRank = "face2"
) {
  if (!move.bonds) return [];

  const rawBonds =
    typeof move.bonds === "function"
      ? move.bonds(
          dimension,
          selectedAxisA,
          selectedAxisB,
          rewriteSliceBits,
          selectedAxisC,
          supportRank
        )
      : move.bonds;

  return rawBonds.map((bond) => ({
    ...bond,
    before: bond.before.map((id) =>
      remapRewriteBondId(
        id,
        dimension,
        selectedAxisA,
        selectedAxisB,
        rewriteSliceBits,
        selectedAxisC,
        supportRank
      )
    ),
    after: bond.after.map((id) =>
      remapRewriteBondId(
        id,
        dimension,
        selectedAxisA,
        selectedAxisB,
        rewriteSliceBits,
        selectedAxisC,
        supportRank
      )
    ),
  }));
}

function normalizedEdge(edge) {
  return [...edge].sort().join(" -- ");
}

function directedEdge(edge) {
  return edge.join(" → ");
}

function reverseDirectedEdge(edge) {
  return [edge[1], edge[0]].join(" → ");
}

function directedEdgeSet(edges) {
  return new Set(edges.map(directedEdge));
}

function parseAddressId(id) {
  return String(id)
    .split(",")
    .map((part) => Number(part));
}

function typedEdgeSignature(edge) {
  const from = parseAddressId(edge[0]);
  const to = parseAddressId(edge[1]);

  const changed = [];

  for (let index = 0; index < Math.max(from.length, to.length); index += 1) {
    if (from[index] !== to[index]) changed.push(index);
  }

  if (changed.length === 1) {
    const axisIndex = changed[0];
    const axis = AXES[axisIndex]?.key ?? `x${axisIndex}`;
    const orientation =
      Number(from[axisIndex]) === 0 && Number(to[axisIndex]) === 1
        ? "+"
        : Number(from[axisIndex]) === 1 && Number(to[axisIndex]) === 0
          ? "-"
          : "?";

    return `${edge[0]} -[${axis}${orientation}]-> ${edge[1]}`;
  }

  if (changed.length === 0) {
    return `${edge[0]} -[loop]-> ${edge[1]}`;
  }

  return `${edge[0]} -[multi:${changed.join(",")}]-> ${edge[1]}`;
}

function typedEdgeSet(edges) {
  return new Set(edges.map(typedEdgeSignature));
}

function edgeSet(edges) {
  return new Set(edges.map(normalizedEdge));
}

function vertexSetFromEdges(edges) {
  return new Set(edges.flatMap((edge) => edge));
}

function degreeCounts(edges) {
  const counts = new Map();

  edges.forEach(([a, b]) => {
    counts.set(a, (counts.get(a) ?? 0) + 1);
    counts.set(b, (counts.get(b) ?? 0) + 1);
  });

  return counts;
}

function sameMapValues(a, b) {
  const keys = new Set([...a.keys(), ...b.keys()]);

  for (const key of keys) {
    if ((a.get(key) ?? 0) !== (b.get(key) ?? 0)) return false;
  }

  return true;
}

function sameSet(a, b) {
  if (a.size !== b.size) return false;

  for (const value of a) {
    if (!b.has(value)) return false;
  }

  return true;
}

function summarizeRewriteEdges(beforeEdges, afterEdges) {
  const beforeSet = edgeSet(beforeEdges);
  const afterSet = edgeSet(afterEdges);

  const removed = [...beforeSet].filter((edge) => !afterSet.has(edge));
  const added = [...afterSet].filter((edge) => !beforeSet.has(edge));
  const unchanged = [...beforeSet].filter((edge) => afterSet.has(edge));

  const beforeDirectedSet = directedEdgeSet(beforeEdges);
  const afterDirectedSet = directedEdgeSet(afterEdges);

  const orientedRemoved = [...beforeDirectedSet].filter(
    (edge) => !afterDirectedSet.has(edge)
  );
  const orientedAdded = [...afterDirectedSet].filter(
    (edge) => !beforeDirectedSet.has(edge)
  );
  const orientedUnchanged = [...beforeDirectedSet].filter((edge) =>
    afterDirectedSet.has(edge)
  );

  const beforeTypedSet = typedEdgeSet(beforeEdges);
  const afterTypedSet = typedEdgeSet(afterEdges);

  const typedRemoved = [...beforeTypedSet].filter(
    (edge) => !afterTypedSet.has(edge)
  );
  const typedAdded = [...afterTypedSet].filter(
    (edge) => !beforeTypedSet.has(edge)
  );
  const typedUnchanged = [...beforeTypedSet].filter((edge) =>
    afterTypedSet.has(edge)
  );

  const reversedOrientations = beforeEdges.filter(
    (edge) =>
      !afterDirectedSet.has(directedEdge(edge)) &&
      afterDirectedSet.has(reverseDirectedEdge(edge))
  ).length;

  const beforeDegrees = degreeCounts(beforeEdges);
  const afterDegrees = degreeCounts(afterEdges);

  const beforeSupport = vertexSetFromEdges(beforeEdges);
  const afterSupport = vertexSetFromEdges(afterEdges);

  const activeVertices = new Set([...beforeSupport, ...afterSupport]).size;
  const activeEdges = new Set([...beforeSet, ...afterSet]).size;

  return {
    beforeEdges: [...beforeSet],
    afterEdges: [...afterSet],
    directedBeforeEdges: [...beforeDirectedSet],
    directedAfterEdges: [...afterDirectedSet],
    typedBeforeEdges: [...beforeTypedSet],
    typedAfterEdges: [...afterTypedSet],
    removed,
    added,
    unchanged,
    orientedRemoved,
    orientedAdded,
    orientedUnchanged,
    typedRemoved,
    typedAdded,
    typedUnchanged,
    activeVertices,
    activeEdges,
    degreeBalanced: sameMapValues(beforeDegrees, afterDegrees),
    supportPreserved: sameSet(beforeSupport, afterSupport),
    undirectedSupportPreserved: removed.length === 0 && added.length === 0,
    orientedSupportPreserved:
      orientedRemoved.length === 0 && orientedAdded.length === 0,
    typedSupportPreserved:
      typedRemoved.length === 0 && typedAdded.length === 0,
    reversedOrientations,
    closedAlone: removed.length === 0 && added.length === 0,
    orientedClosedAlone:
      orientedRemoved.length === 0 && orientedAdded.length === 0,
    typedClosedAlone: typedRemoved.length === 0 && typedAdded.length === 0,
  };
}

function rewriteBranchLabel(bond) {
  const id = String(bond.id ?? "");

  if (id.startsWith("cube-branch-A")) {
    return "branch A — selected face";
  }

  if (id.startsWith("cube-branch-B")) {
    return "branch B — adjacent-face complement";
  }

  if (id.startsWith("ordinary-chain")) {
    return "branch A — 3-edge chain";
  }

  if (id.startsWith("complement-chain")) {
    return "branch B — 3-edge chain complement";
  }

  if (
    id.startsWith("ordinary") ||
    id.startsWith("bond-") ||
    id.startsWith("face-bond") ||
    id.startsWith("embedded-face-bond")
  ) {
    return "branch A — local bond switch";
  }

  if (id.startsWith("inversion") || id.startsWith("complement")) {
    return "branch B — complement";
  }

  return "branch";
}

function rewriteAccounting(
  move,
  dimension,
  selectedAxisA = 0,
  selectedAxisB = 1,
  rewriteSliceBits = [],
  selectedAxisC = 2,
  supportRank = "face2"
) {
  const bonds = resolveMoveBonds(
    move,
    dimension,
    selectedAxisA,
    selectedAxisB,
    rewriteSliceBits,
    selectedAxisC,
    supportRank
  );

  if (!bonds.length) return null;

  const beforeEdges = bonds.map((bond) => bond.before);
  const afterEdges = bonds.map((bond) => bond.after);
  const total = summarizeRewriteEdges(beforeEdges, afterEdges);

  const closureBeforeEdges = bonds.map((bond) => bond.closureBefore ?? bond.before);
  const closureAfterEdges = bonds.map((bond) => bond.closureAfter ?? bond.after);
  const closureTotal = summarizeRewriteEdges(
    closureBeforeEdges,
    closureAfterEdges
  );

  const branchMap = new Map();

  bonds.forEach((bond) => {
    const label = rewriteBranchLabel(bond);

    if (!branchMap.has(label)) {
      branchMap.set(label, {
        label,
        beforeEdges: [],
        afterEdges: [],
      });
    }

    const branch = branchMap.get(label);
    branch.beforeEdges.push(bond.before);
    branch.afterEdges.push(bond.after);
  });

  const branches = [...branchMap.values()].map((branch) => ({
    label: branch.label,
    ...summarizeRewriteEdges(branch.beforeEdges, branch.afterEdges),
  }));

  return {
    ...total,
    branches,
    closureRemoved: closureTotal.removed,
    closureAdded: closureTotal.added,
    closureOrientedRemoved: closureTotal.orientedRemoved,
    closureOrientedAdded: closureTotal.orientedAdded,
    closureTypedRemoved: closureTotal.typedRemoved,
    closureTypedAdded: closureTotal.typedAdded,
    closedAsPairedTotal: closureTotal.closedAlone,
    closedAsOrientedPairedTotal: closureTotal.orientedClosedAlone,
    closedAsTypedPairedTotal: closureTotal.typedClosedAlone,
    complementaryBefore: [...edgeSet(afterEdges)],
    complementaryAfter: [...edgeSet(beforeEdges)],
  };
}

function edgeListLabel(edges) {
  return edges.length ? edges.join(", ") : "none";
}

function normalizeAngleDelta(delta) {
  let normalized = delta;

  while (normalized <= -Math.PI) normalized += Math.PI * 2;
  while (normalized > Math.PI) normalized -= Math.PI * 2;

  return normalized;
}

function distance2D(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function pointOnWindingPath(pivot, start, end, progress, windingCount) {
  const startAngle = Math.atan2(start.y - pivot.y, start.x - pivot.x);
  const endAngle = Math.atan2(end.y - pivot.y, end.x - pivot.x);

  const baseDelta = normalizeAngleDelta(endAngle - startAngle);
  const sign = baseDelta >= 0 ? 1 : -1;
  const delta = baseDelta + sign * Math.PI * 2 * Math.max(0, windingCount - 1);

  const radius = lerpValue(distance2D(pivot, start), distance2D(pivot, end), progress);
  const angle = startAngle + delta * progress;

  return {
    x: pivot.x + Math.cos(angle) * radius,
    y: pivot.y + Math.sin(angle) * radius,
  };
}

function pointOnSwapArc(start, end, progress, windingCount = 1) {
  const center = {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
  };

  const dx = start.x - center.x;
  const dy = start.y - center.y;
  const startAngle = Math.atan2(dy, dx);
  const radius = Math.hypot(dx, dy);

  const angle =
    startAngle + (Math.PI + Math.PI * 2 * Math.max(0, windingCount - 1)) * progress;

  return {
    x: center.x + Math.cos(angle) * radius,
    y: center.y + Math.sin(angle) * radius,
  };
}

function currentBondEndpoints(bond, verticesById, progress, windingCount) {
  const beforeA = verticesById.get(bond.before[0]);
  const beforeB = verticesById.get(bond.before[1]);
  const afterA = verticesById.get(bond.after[0]);
  const afterB = verticesById.get(bond.after[1]);

  const shared = bond.before.find((id) => bond.after.includes(id));

  if (shared) {
    const pivot = verticesById.get(shared);
    const movingBeforeId = bond.before.find((id) => id !== shared);
    const movingAfterId = bond.after.find((id) => id !== shared);

    const movingStart = verticesById.get(movingBeforeId);
    const movingEnd = verticesById.get(movingAfterId);
    const moving = pointOnSwapArc(
      movingStart,
      movingEnd,
      progress,
      windingCount
    );

    if (bond.before[0] === shared) {
      return { a: pivot, b: moving };
    }

    return { a: moving, b: pivot };
  }

  return {
    a: pointOnSwapArc(beforeA, afterA, progress, windingCount),
    b: pointOnSwapArc(beforeB, afterB, progress, windingCount),
  };
}

function makeActiveBonds(
  move,
  frame,
  progress,
  dimension,
  selectedAxisA = 0,
  selectedAxisB = 1,
  rewriteSliceBits = [],
  selectedAxisC = 2,
  supportRank = "face2"
) {
  const bonds = resolveMoveBonds(
    move,
    dimension,
    selectedAxisA,
    selectedAxisB,
    rewriteSliceBits,
    selectedAxisC,
    supportRank
  );

  if (!bonds.length) return [];

  const verticesById = new Map(frame.vertices.map((vertex) => [vertex.id, vertex]));
  const windingCount = move.windingCount ?? 1;

  return bonds.map((bond) => ({
    ...bond,
    ...currentBondEndpoints(bond, verticesById, progress, windingCount),
  }));
}

function makeMoveStats(
  graph,
  dimension,
  move,
  selectedAxisA = 0,
  selectedAxisB = 1
) {
  const movesVertices =
    move.kind === "cell symmetry" || move.kind === "embedded face move";

  if (!movesVertices) return null;

  const map = new Map();
  const movedVertexIds = new Set();

  graph.vertices.forEach((vertex) => {
    const targetBits = targetBitsForMove(
      vertex.bits,
      dimension,
      move.key,
      selectedAxisA,
      selectedAxisB
    );
    const targetId = vectorKey(targetBits);

    map.set(vertex.id, targetId);

    if (vertex.id !== targetId) {
      movedVertexIds.add(vertex.id);
    }
  });

  const visited = new Set();
  const cycles = [];

  graph.vertices.forEach((vertex) => {
    if (visited.has(vertex.id)) return;

    const cycle = [];
    let current = vertex.id;

    while (!visited.has(current)) {
      visited.add(current);
      cycle.push(current);
      current = map.get(current);
    }

    cycles.push(cycle);
  });

  const fixed = cycles.filter((cycle) => cycle.length === 1).length;
  const participating = graph.vertices.length - fixed;
  const activeEdges = graph.edges.filter(
    (edge) => movedVertexIds.has(edge.a) || movedVertexIds.has(edge.b)
  ).length;

  return {
    fixed,
    participating,
    activeEdges,
    cycles,
  };
}

function cycleNotation(cycles) {
  return cycles
    .map((cycle) => {
      if (cycle.length === 1) return `(${cycle[0]})`;
      return `(${cycle.join(" → ")})`;
    })
    .join("  ");
}

function dimensionName(dimension) {
  if (dimension === 1) return "1D interval cell";
  if (dimension === 2) return "2D square cell";
  if (dimension === 3) return "3D cube cell";
  if (dimension === 4) return "4D tesseract cell";
  if (dimension === 5) return "5D hypercube cell";
  return "6D hypercube cell";
}

export default function QuantizedLatticeMovesPage() {
  const [dimension, setDimension] = useState(2);
  const [moveFamily, setMoveFamily] = useState("automorphisms");
  const [moveKey, setMoveKey] = useState("identity");
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [halfTurnCount, setHalfTurnCount] = useState(0);
  const [halfTurnFrom, setHalfTurnFrom] = useState(0);
  const [selectedAxisA, setSelectedAxisA] = useState(0);
  const [selectedAxisB, setSelectedAxisB] = useState(1);
  const [selectedAxisC, setSelectedAxisC] = useState(2);
  const [supportRank, setSupportRank] = useState("face2");
  const [rewriteSliceBits, setRewriteSliceBits] = useState([0, 0, 0, 0, 0, 0]);
  const [showMoveDictionary, setShowMoveDictionary] = useState(false);
  const [dictionaryProgress, setDictionaryProgress] = useState(0);
  const [yaw, setYaw] = useState(0.55);
  const [pitch, setPitch] = useState(0.42);
  const [drag, setDrag] = useState(null);

  const moves = useMemo(
    () => availableMoves(dimension, moveFamily, supportRank),
    [dimension, moveFamily, supportRank]
  );

  const dictionaryEntries = useMemo(() => moveDictionaryEntries(), []);
  const move = moves.find((item) => item.key === moveKey) ?? moves[0] ?? MOVE_LIBRARY[0];

  const graph = useMemo(() => makeCellGraph(dimension), [dimension]);
  const moveStats = useMemo(
    () => makeMoveStats(graph, dimension, move, selectedAxisA, selectedAxisB),
    [graph, dimension, move, selectedAxisA, selectedAxisB]
  );

  const accounting = useMemo(
    () =>
      rewriteAccounting(
        move,
        dimension,
        selectedAxisA,
        selectedAxisB,
        rewriteSliceBits,
        selectedAxisC,
        supportRank
      ),
    [
      move,
      dimension,
      selectedAxisA,
      selectedAxisB,
      selectedAxisC,
      supportRank,
      rewriteSliceBits,
    ]
  );

  useEffect(() => {
    setMoveFamily("automorphisms");
    setMoveKey("identity");
    setProgress(0);
    setPlaying(false);
    setHalfTurnCount(0);
    setHalfTurnFrom(0);
    setSelectedAxisA(0);
    setSelectedAxisB(dimension > 1 ? 1 : 0);
    setSelectedAxisC(dimension > 2 ? 2 : 0);
    if (dimension < 2) {
      setSupportRank("edge1");
    } else if (dimension < 3) {
      setSupportRank("face2");
    }
    setRewriteSliceBits([0, 0, 0, 0, 0, 0]);
  }, [dimension]);

  useEffect(() => {
    const availableAxisIndices = AXES.slice(0, dimension).map((_, index) => index);
    const nextB =
      selectedAxisB !== selectedAxisA && selectedAxisB < dimension
        ? selectedAxisB
        : availableAxisIndices.find((index) => index !== selectedAxisA) ?? 0;
    const nextC =
      selectedAxisC !== selectedAxisA &&
      selectedAxisC !== nextB &&
      selectedAxisC < dimension
        ? selectedAxisC
        : availableAxisIndices.find(
            (index) => index !== selectedAxisA && index !== nextB
          ) ?? 0;

    if (nextB !== selectedAxisB) setSelectedAxisB(nextB);
    if (nextC !== selectedAxisC) setSelectedAxisC(nextC);
  }, [dimension, selectedAxisA, selectedAxisB, selectedAxisC]);

  useEffect(() => {
    const nextMove = availableMoves(dimension, moveFamily, supportRank)[0] ?? MOVE_LIBRARY[0];

    setMoveKey(nextMove.key);
    setProgress(0);
    setPlaying(false);
  }, [dimension, moveFamily, supportRank]);

  useEffect(() => {
    if (!showMoveDictionary) return;

    let frameId;
    const duration = 1900;

    const tick = (time) => {
      setDictionaryProgress((time % duration) / duration);
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [showMoveDictionary]);

  useEffect(() => {
    if (!playing) return;

    let frameId;
    let start = null;
    const duration = 1500;

    const tick = (time) => {
      if (start === null) start = time;

      const next = Math.min(1, (time - start) / duration);
      setProgress(next);

      if (next < 1) {
        frameId = requestAnimationFrame(tick);
      } else {
        setPlaying(false);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [playing, moveKey]);

  const frame = useMemo(
    () =>
      makeFrame(
        graph,
        dimension,
        yaw,
        pitch,
        move.key,
        progress,
        move,
        halfTurnFrom,
        selectedAxisA,
        selectedAxisB
      ),
    [graph, dimension, yaw, pitch, move, progress, halfTurnFrom, selectedAxisA, selectedAxisB]
  );

  const activeMoveBonds = useMemo(
    () =>
      makeActiveBonds(
        move,
        frame,
        progress,
        dimension,
        selectedAxisA,
        selectedAxisB,
        rewriteSliceBits,
        selectedAxisC,
        supportRank
      ),
    [
      move,
      frame,
      progress,
      dimension,
      selectedAxisA,
      selectedAxisB,
      selectedAxisC,
      supportRank,
      rewriteSliceBits,
    ]
  );

  const selectedSubcubeEdges = useMemo(() => {
    if (!(moveFamily === "rewrites" && supportRank === "cube3")) return [];

    const verticesById = new Map(frame.vertices.map((vertex) => [vertex.id, vertex]));

    return selectedSubcubeEdgeIds(
      dimension,
      selectedAxisA,
      selectedAxisB,
      selectedAxisC,
      rewriteSliceBits
    )
      .map((edge) => ({
        ...edge,
        a: verticesById.get(edge.a),
        b: verticesById.get(edge.b),
      }))
      .filter((edge) => edge.a && edge.b);
  }, [
    moveFamily,
    supportRank,
    frame.vertices,
    dimension,
    selectedAxisA,
    selectedAxisB,
    selectedAxisC,
    rewriteSliceBits,
  ]);

  const cubeClosureShellEdges = useMemo(() => {
    if (!(moveFamily === "rewrites" && supportRank === "cube3")) return [];

    const activeSupportEdges = new Set(
      activeMoveBonds.flatMap((bond) => [
        normalizedEdge(bond.before),
        normalizedEdge(bond.after),
      ])
    );

    return selectedSubcubeEdges.filter((edge) => {
      const edgeKey = normalizedEdge([edge.a.id, edge.b.id]);
      return !activeSupportEdges.has(edgeKey);
    });
  }, [moveFamily, supportRank, selectedSubcubeEdges, activeMoveBonds]);

  const startMove = (key) => {
    if (dimension === 1 && key === "orientationReversal") {
      const nextFrom = halfTurnCount;

      setMoveKey(key);
      setHalfTurnFrom(nextFrom);
      setHalfTurnCount(nextFrom + 1);
      setProgress(0);
      setPlaying(true);
      return;
    }

    if (key === "identity") {
      setHalfTurnCount(0);
      setHalfTurnFrom(0);
    }

    setMoveKey(key);
    setProgress(0);
    setPlaying(key !== "identity");
  };

  const handlePointerDown = (event) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);

    setDrag({
      x: event.clientX,
      y: event.clientY,
      yaw,
      pitch,
    });
  };

  const handlePointerMove = (event) => {
    if (!drag) return;

    event.preventDefault();

    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;

    setYaw(drag.yaw + dx * 0.008);
    setPitch(Math.max(-1.35, Math.min(1.35, drag.pitch + dy * 0.008)));
  };

  const handlePointerUp = (event) => {
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    setDrag(null);
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "26px 24px 34px",
        color: "#eee7d1",
        background:
          "radial-gradient(circle at top, rgba(70,60,42,0.32), rgba(0,0,0,0.96) 58%)",
        fontFamily: "Times New Roman, Times, serif",
      }}
    >
      <section
        style={{
          maxWidth: "1520px",
          margin: "0 auto",
          display: "grid",
          gap: "18px",
        }}
      >
        <header>
          <p
            style={{
              margin: "0 0 6px",
              color: "rgba(238,231,209,0.58)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontSize: "13px",
            }}
          >
            Typed Boundary Calculus
          </p>

          <h1 style={{ margin: 0, fontSize: "34px", fontWeight: 400 }}>
            Quantized Lattice Moves
          </h1>

          <p style={{ maxWidth: "940px", color: "rgba(238,231,209,0.72)" }}>
            A d-dimensional lattice cell has 2ᵈ vertices and d·2ᵈ⁻¹ edges.
            Cell automorphisms are the strict same-lattice moves. Local rewrites are
            separated so they can be studied without confusing them with the
            automorphism group.
          </p>
        </header>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 205px",
            gap: "18px",
            alignItems: "start",
          }}
        >
          <aside
            style={{
              order: 2,
              position: "sticky",
              top: "12px",
              maxHeight: "calc(100vh - 24px)",
              overflowY: "auto",
              overflowX: "hidden",
              border: "1px solid rgba(238,231,209,0.16)",
              background: "rgba(0,0,0,0.42)",
              borderRadius: "8px",
              padding: "10px",
              display: "grid",
              gap: "10px",
            }}
          >
            <div>
              <h2 style={{ margin: "0 0 10px", fontSize: "20px", fontWeight: 400 }}>
                dimension
              </h2>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "7px" }}>
                {[1, 2, 3, 4, 5, 6].map((value) => (
                  <button
                    key={value}
                    onClick={() => setDimension(value)}
                    style={{
                      ...buttonStyle,
                      border:
                        dimension === value
                          ? "1px solid rgba(242,198,109,0.9)"
                          : buttonStyle.border,
                      background:
                        dimension === value
                          ? "rgba(242,198,109,0.16)"
                          : buttonStyle.background,
                    }}
                  >
                    {value}D
                  </button>
                ))}
              </div>
            </div>

            <div
              style={{
                borderTop: "1px solid rgba(238,231,209,0.12)",
                paddingTop: "12px",
                display: "grid",
                gap: "8px",
                color: "rgba(238,231,209,0.78)",
                fontSize: "14px",
                lineHeight: 1.45,
              }}
            >
              {moveFamily === "rewrites" && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto minmax(0, 1fr)",
                    gap: "8px",
                    alignItems: "start",
                  }}
                >
                  <div style={{ marginTop: "7px" }}>support</div>

                  <div style={{ display: "grid", gap: "7px", minWidth: 0 }}>
                    {[
                      "edge1",
                      ...(dimension >= 2 ? ["face2", "chain3"] : []),
                      ...(dimension >= 3 ? ["cube3"] : []),
                    ].map((rank) => (
                      <button
                        key={rank}
                        onClick={() => setSupportRank(rank)}
                        style={{
                          ...buttonStyle,
                          border:
                            supportRank === rank
                              ? "1px solid rgba(242,198,109,0.9)"
                              : buttonStyle.border,
                          background:
                            supportRank === rank
                              ? "rgba(242,198,109,0.16)"
                              : buttonStyle.background,
                        }}
                      >
                        {supportRankLabel(rank)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {dimension >= 2 && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    columnGap: "8px",
                    rowGap: "6px",
                    marginTop: "6px",
                  }}
                >
                  <strong style={{ gridColumn: "1 / -1" }}>
                    {moveFamily === "rewrites"
                      ? supportRank === "edge1"
                        ? "selected rewrite edge axis"
                        : supportRank === "chain3"
                          ? "selected rewrite chain face axes"
                          : supportRank === "cube3"
                            ? "selected rewrite subcube axes"
                            : "selected rewrite face axes"
                      : "selected automorphism axes"}
                  </strong>

                  <label style={{ display: "grid", gap: "4px" }}>
                    axis A
                    <select
                      value={selectedAxisA}
                      onChange={(event) => {
                        const next = Number(event.target.value);
                        setSelectedAxisA(next);

                        if (next === selectedAxisB) {
                          setSelectedAxisB(next === 0 ? 1 : 0);
                        }
                      }}
                      style={selectStyle}
                    >
                      {AXES.slice(0, dimension).map((axis, index) => (
                        <option key={axis.key} value={index}>
                          {axis.key} — {axis.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  {supportRank !== "edge1" && (
                  <label style={{ display: "grid", gap: "4px" }}>
                    axis B
                    <select
                      value={selectedAxisB}
                      onChange={(event) => setSelectedAxisB(Number(event.target.value))}
                      style={selectStyle}
                    >
                      {AXES.slice(0, dimension)
                        .map((axis, index) => ({ axis, index }))
                        .filter((item) => item.index !== selectedAxisA)
                        .map((item) => (
                          <option key={item.axis.key} value={item.index}>
                            {item.axis.key} — {item.axis.label}
                          </option>
                        ))}
                    </select>
                  </label>

                  )}

                  {dimension >= 3 &&
                    moveFamily === "rewrites" &&
                    supportRank === "cube3" && (
                      <label style={{ display: "grid", gap: "4px" }}>
                        axis C
                        <select
                          value={selectedAxisC}
                          onChange={(event) =>
                            setSelectedAxisC(Number(event.target.value))
                          }
                          style={selectStyle}
                        >
                          {AXES.slice(0, dimension)
                            .map((axis, index) => ({ axis, index }))
                            .filter(
                              (item) =>
                                item.index !== selectedAxisA &&
                                item.index !== selectedAxisB
                            )
                            .map((item) => (
                              <option key={item.axis.key} value={item.index}>
                                {item.axis.key} — {item.axis.label}
                              </option>
                            ))}
                        </select>
                      </label>
                    )}

                  {moveFamily === "rewrites" &&
                    ((supportRank === "edge1" && dimension >= 2) ||
                      ((supportRank === "face2" || supportRank === "chain3") &&
                        dimension >= 3) ||
                      (supportRank === "cube3" && dimension >= 4)) && (
                    <div
                      style={{
                        gridColumn: "1 / -1",
                        display: "grid",
                        gap: "6px",
                      }}
                    >
                      <strong>
                        {supportRank === "edge1"
                          ? "fixed edge slice"
                          : supportRank === "cube3"
                            ? "fixed subcube slice"
                            : "fixed rewrite slice"}
                      </strong>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                          gap: "6px",
                        }}
                      >
                        {AXES.slice(0, dimension)
                          .map((axis, index) => ({ axis, index }))
                          .filter(
                            (item) =>
                              item.index !== selectedAxisA &&
                              (supportRank === "edge1" ||
                                item.index !== selectedAxisB) &&
                              (supportRank !== "cube3" ||
                                item.index !== selectedAxisC)
                          )
                          .map((item) => (
                            <button
                              key={item.axis.key}
                              onClick={() =>
                                setRewriteSliceBits((bits) =>
                                  bits.map((value, index) =>
                                    index === item.index ? 1 - Number(value) : value
                                  )
                                )
                              }
                              style={buttonStyle}
                            >
                              {item.axis.key}={Number(rewriteSliceBits[item.index] ?? 0)}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}


            </div>

            <div
              style={{
                borderTop: "1px solid rgba(238,231,209,0.12)",
                paddingTop: "12px",
                display: "grid",
                gap: "10px",
                color: "rgba(238,231,209,0.72)",
                fontSize: "14px",
                lineHeight: 1.45,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto minmax(0, 1fr)",
                  gap: "8px",
                  alignItems: "start",
                }}
              >
                <h3
                  style={{
                    margin: "20px 0 0",
                    fontSize: "17px",
                    fontWeight: 400,
                  }}
                >
                  moves
                </h3>

                <div style={{ display: "grid", gap: "7px", minWidth: 0 }}>
                  {["automorphisms", "rewrites"].map((familyKey) => (
                    <button
                      key={familyKey}
                      onClick={() => setMoveFamily(familyKey)}
                      style={{
                        ...buttonStyle,
                        border:
                          moveFamily === familyKey
                            ? "1px solid rgba(242,198,109,0.9)"
                            : buttonStyle.border,
                        background:
                          moveFamily === familyKey
                            ? "rgba(242,198,109,0.16)"
                            : buttonStyle.background,
                      }}
                    >
                      {familyKey === "automorphisms" ? "automorphisms" : "rewrites"}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setShowMoveDictionary(true)}
                style={{
                  ...buttonStyle,
                  textAlign: "left",
                  border: "1px solid rgba(57,255,243,0.48)",
                  background: "rgba(57,255,243,0.08)",
                }}
              >
                open visual move dictionary
              </button>

              <div style={{ display: "grid", gap: "7px" }}>
                {moves.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => startMove(item.key)}
                    style={{
                      ...buttonStyle,
                      textAlign: "left",
                      border:
                        move.key === item.key
                          ? "1px solid rgba(242,198,109,0.9)"
                          : buttonStyle.border,
                      background:
                        move.key === item.key
                          ? "rgba(242,198,109,0.16)"
                          : buttonStyle.background,
                    }}
                  >
                    {dimension === 1 && item.key === "orientationReversal"
                      ? "next 180° half-turn"
                      : item.label}
                  </button>
                ))}
              </div>

              {dimension === 1 && (
                <div
                  style={{
                    border: "1px solid rgba(242,198,109,0.22)",
                    borderRadius: "6px",
                    padding: "10px",
                    background: "rgba(242,198,109,0.055)",
                  }}
                >
                  <div><strong>half-turn count:</strong> {halfTurnCount}</div>
                  <div><strong>angle:</strong> {halfTurnCount} × 180° = {halfTurnCount * 180}°</div>
                  <div>
                    <strong>endpoint state:</strong>{" "}
                    {halfTurnCount % 2 === 0 ? "identity" : "swapped"}
                  </div>
                </div>
              )}

              <label style={{ display: "grid", gap: "7px" }}>
                move progress
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.001"
                  value={progress}
                  onChange={(event) => {
                    setPlaying(false);
                    setProgress(Number(event.target.value));
                  }}
                />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <button
                  onClick={() => {
                    setProgress(0);
                    setPlaying(false);
                  }}
                  style={buttonStyle}
                >
                  reset
                </button>

                <button
                  onClick={() => {
                    setProgress(1);
                    setPlaying(false);
                  }}
                  style={buttonStyle}
                >
                  complete
                </button>
              </div>
            </div>
          </aside>

          <section
            style={{
              order: 1,
              border: "1px solid rgba(238,231,209,0.16)",
              background: "rgba(0,0,0,0.48)",
              borderRadius: "8px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "12px 14px",
                borderBottom: "1px solid rgba(238,231,209,0.12)",
                color: "rgba(238,231,209,0.82)",
                display: "grid",
                gap: "4px",
              }}
            >
              <strong style={{ fontSize: "18px", fontWeight: 400 }}>
                {move.label}
              </strong>
              <span>
                {dimensionName(dimension)} — {move.kind}
              </span>
            </div>

            <svg
              viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
              style={{
                display: "block",
                width: "100%",
                aspectRatio: "16 / 9",
                cursor: drag ? "grabbing" : "grab",
                userSelect: "none",
                WebkitUserSelect: "none",
                touchAction: "none",
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <rect width={VIEW.width} height={VIEW.height} fill="rgba(0,0,0,0.16)" />

              {frame.edges.map((edge) => (
                <line
                  key={edge.id}
                  x1={edge.a.x}
                  y1={edge.a.y}
                  x2={edge.b.x}
                  y2={edge.b.y}
                  stroke={
                    moveFamily === "rewrites"
                      ? "rgba(238,231,209,0.24)"
                      : AXIS_COLORS[edge.axisIndex]
                  }
                  strokeWidth={
                    moveFamily === "rewrites"
                      ? CELL_RENDER_STYLE.rewriteScaffoldStrokeWidth
                      : CELL_RENDER_STYLE.edgeStrokeWidth
                  }
                  opacity={
                    moveFamily === "rewrites"
                      ? CELL_RENDER_STYLE.rewriteScaffoldOpacity
                      : CELL_RENDER_STYLE.edgeOpacity
                  }
                  strokeLinecap="round"
                />
              ))}

              {selectedSubcubeEdges.map((edge) => (
                <line
                  key={`selected-subcube-${edge.id}`}
                  x1={edge.a.x}
                  y1={edge.a.y}
                  x2={edge.b.x}
                  y2={edge.b.y}
                  stroke="rgba(242,198,109,0.42)"
                  strokeWidth="3"
                  opacity="0.72"
                  strokeDasharray="7 5"
                  strokeLinecap="round"
                />
              ))}

              {cubeClosureShellEdges.map((edge) => (
                <line
                  key={`cube-closure-shell-${edge.id}`}
                  x1={edge.a.x}
                  y1={edge.a.y}
                  x2={edge.b.x}
                  y2={edge.b.y}
                  stroke="rgba(57,255,243,0.66)"
                  strokeWidth="5"
                  opacity="0.72"
                  strokeDasharray="2 7"
                  strokeLinecap="round"
                />
              ))}

              {activeMoveBonds.map((bond) => (
                <line
                  key={bond.id}
                  x1={bond.a.x}
                  y1={bond.a.y}
                  x2={bond.b.x}
                  y2={bond.b.y}
                  stroke={bond.color}
                  strokeWidth={CELL_RENDER_STYLE.activeBondStrokeWidth}
                  opacity={CELL_RENDER_STYLE.activeBondOpacity}
                  strokeLinecap="round"
                />
              ))}

              {frame.vertices.map((vertex) => (
                <g key={vertex.id}>
                  <circle
                    cx={vertex.x}
                    cy={vertex.y}
                    r={CELL_RENDER_STYLE.vertexRadius}
                    fill="#eee7d1"
                    stroke="rgba(0,0,0,0.78)"
                    strokeWidth={CELL_RENDER_STYLE.vertexStrokeWidth}
                  />

                  {dimension <= 2 && (
                    <text
                      x={vertex.x}
                      y={vertex.y - 16}
                      textAnchor="middle"
                      fill="rgba(238,231,209,0.68)"
                      fontSize="13"
                    >
                      {addressLabel(vertex.currentAddress)}
                    </text>
                  )}
                </g>
              ))}

              <g transform="translate(-40 36)">
                <text x="0" y="0" fill="rgba(238,231,209,0.78)" fontSize="18">
                  {dimensionName(dimension)}
                </text>

                <text x="0" y="30" fill="rgba(238,231,209,0.58)" fontSize="14">
                  active axes: {AXES.slice(0, dimension).map((axis) => axis.key).join(", ")}
                </text>

                <text x="0" y="64" fill="rgba(238,231,209,0.46)" fontSize="14">
                  drag to rotate the projected cell
                </text>
              </g>
            </svg>

            <div
              style={{
                borderTop: "1px solid rgba(238,231,209,0.12)",
                padding: "12px",
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: "12px",
                color: "rgba(238,231,209,0.74)",
                fontSize: "14px",
                lineHeight: 1.42,
              }}
            >
              <div>
                <div style={{ marginBottom: "7px" }}><strong>current move</strong></div>
                <div><strong>family:</strong> {moveFamilyLabel(moveFamily)}</div>
                <div><strong>kind:</strong> {move.kind}</div>
                {moveFamily === "rewrites" && (
                  <div><strong>support:</strong> {supportRankLabel(supportRank)}</div>
                )}
                <div><strong>dimension:</strong> {dimensionName(dimension)}</div>
                {dimension >= 2 && (
                  <div>
                    <strong>selected axes:</strong>{" "}
                    {AXES[selectedAxisA]?.key} / {AXES[selectedAxisB]?.key}
                    {moveFamily === "rewrites" && supportRank === "cube3"
                      ? ` / ${AXES[selectedAxisC]?.key}`
                      : ""}
                  </div>
                )}
                {dimension >= 3 && moveFamily === "rewrites" && (
                  <div>
                    <strong>fixed slice:</strong>{" "}
                    {sliceLabel(
                      dimension,
                      selectedAxisA,
                      selectedAxisB,
                      rewriteSliceBits,
                      selectedAxisC,
                      supportRank
                    )}
                  </div>
                )}
                {move.windingCount && (
                  <div><strong>winding count:</strong> {move.windingCount}</div>
                )}
                <div>{move.description}</div>
              </div>

              <div>
                <div style={{ marginBottom: "7px" }}><strong>cell supports</strong></div>
                {kFaceSummary(dimension).map((item) => (
                  <div key={item.k}>
                    {item.label}: {item.count}
                  </div>
                ))}
                <div style={{ marginTop: "6px" }}>
                  |Aut(<span style={{ fontStyle: "italic" }}>Q</span>
                  <sub>{dimension}</sub>)|: {automorphismCount(dimension)}
                </div>
              </div>

              <div>
                {moveStats && (
                  <>
                    <div style={{ marginBottom: "7px" }}><strong>automorphism data</strong></div>
                    <div><strong>vertices:</strong> {graph.vertices.length}</div>
                    <div><strong>active vertices:</strong> {moveStats.participating}</div>
                    <div><strong>fixed vertices:</strong> {moveStats.fixed}</div>
                    <div><strong>edges:</strong> {graph.edges.length}</div>
                    <div><strong>active edges:</strong> {moveStats.activeEdges}</div>
                    <div><strong>cycles:</strong> {cycleNotation(moveStats.cycles)}</div>
                  </>
                )}

                {accounting && (
                  <>
                    <div style={{ marginBottom: "7px" }}><strong>rewrite accounting</strong></div>
                    <div><strong>active vertices:</strong> {accounting.activeVertices}</div>
                    <div><strong>active edge supports:</strong> {accounting.activeEdges}</div>
                    <div><strong>removed:</strong> {edgeListLabel(accounting.removed)}</div>
                    <div><strong>added:</strong> {edgeListLabel(accounting.added)}</div>
                    <div>
                      <strong>undirected support preserved:</strong>{" "}
                      {accounting.undirectedSupportPreserved ? "yes" : "no"}
                    </div>
                    <div>
                      <strong>oriented support preserved:</strong>{" "}
                      {accounting.orientedSupportPreserved ? "yes" : "no"}
                    </div>
                    <div>
                      <strong>typed support preserved:</strong>{" "}
                      {accounting.typedSupportPreserved ? "yes" : "no"}
                    </div>
                    <div>
                      <strong>orientation reversals:</strong>{" "}
                      {accounting.reversedOrientations ?? 0}
                    </div>
                    <div><strong>oriented removed:</strong> {edgeListLabel(accounting.orientedRemoved ?? [])}</div>
                    <div><strong>oriented added:</strong> {edgeListLabel(accounting.orientedAdded ?? [])}</div>
                    <div><strong>typed removed:</strong> {edgeListLabel(accounting.typedRemoved ?? [])}</div>
                    <div><strong>typed added:</strong> {edgeListLabel(accounting.typedAdded ?? [])}</div>
                    {accounting.branches?.length > 1 && (
                      <div
                        style={{
                          marginTop: "7px",
                          display: "grid",
                          gap: "7px",
                        }}
                      >
                        <div><strong>branch closure</strong></div>

                        {accounting.branches.map((branch) => (
                          <div
                            key={branch.label}
                            style={{
                              borderTop: "1px solid rgba(238,231,209,0.12)",
                              paddingTop: "6px",
                            }}
                          >
                            <div><strong>{branch.label}</strong></div>
                            <div>removes: {edgeListLabel(branch.removed)}</div>
                            <div>adds: {edgeListLabel(branch.added)}</div>
                            <div>oriented removes: {edgeListLabel(branch.orientedRemoved ?? [])}</div>
                            <div>oriented adds: {edgeListLabel(branch.orientedAdded ?? [])}</div>
                            <div>typed removes: {edgeListLabel(branch.typedRemoved ?? [])}</div>
                            <div>typed adds: {edgeListLabel(branch.typedAdded ?? [])}</div>
                            <div>
                              closed alone: {branch.closedAlone ? "yes" : "no"}
                            </div>
                            <div>
                              oriented closed: {branch.orientedClosedAlone ? "yes" : "no"}
                            </div>
                            <div>
                              typed closed: {branch.typedClosedAlone ? "yes" : "no"}
                            </div>
                          </div>
                        ))}

                        <div style={{ color: "rgba(242,198,109,0.88)" }}>
                          closed as paired total:{" "}
                          {accounting.closedAsPairedTotal ? "yes" : "no"}
                        </div>
                        <div style={{ color: "rgba(242,198,109,0.88)" }}>
                          closed as oriented total:{" "}
                          {accounting.closedAsOrientedPairedTotal ? "yes" : "no"}
                        </div>
                        <div style={{ color: "rgba(242,198,109,0.88)" }}>
                          closed as typed total:{" "}
                          {accounting.closedAsTypedPairedTotal ? "yes" : "no"}
                        </div>
                      </div>
                    )}
                    <div>
                      <strong>undirected closed:</strong>{" "}
                      {accounting.closedAlone ? "yes" : "no — needs complement"}
                    </div>
                    <div>
                      <strong>oriented closed:</strong>{" "}
                      {accounting.orientedClosedAlone
                        ? "yes"
                        : "no — oriented complement needed"}
                    </div>
                    <div>
                      <strong>typed closed:</strong>{" "}
                      {accounting.typedClosedAlone
                        ? "yes"
                        : "no — typed complement needed"}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div
              style={{
                borderTop: "1px solid rgba(238,231,209,0.12)",
                padding: "12px",
              }}
            >
              <div
                style={{
                  display: "none",
                  border: "1px solid rgba(238,231,209,0.12)",
                  borderRadius: "6px",
                  padding: "10px",
                  background: "rgba(255,255,255,0.035)",
                }}
              >
                <div><strong>family:</strong> {moveFamilyLabel(moveFamily)}</div>
                <div><strong>kind:</strong> {move.kind}</div>
                {dimension >= 2 && moveFamily === "automorphisms" && (
                  <div>
                    <strong>selected axes:</strong>{" "}
                    {AXES[selectedAxisA]?.key} / {AXES[selectedAxisB]?.key}
                  </div>
                )}
                {move.windingCount && (
                  <div><strong>winding count:</strong> {move.windingCount}</div>
                )}
                <div>{move.description}</div>
                {moveStats && (
                  <>
                    <div><strong>vertices:</strong> {graph.vertices.length}</div>
                    <div><strong>active vertices:</strong> {moveStats.participating}</div>
                    <div><strong>fixed vertices:</strong> {moveStats.fixed}</div>
                    <div><strong>edges:</strong> {graph.edges.length}</div>
                    <div><strong>active edges:</strong> {moveStats.activeEdges}</div>
                    <div><strong>cycles:</strong> {cycleNotation(moveStats.cycles)}</div>
                  </>
                )}

                {accounting && (
                  <>
                    <div style={{ marginTop: "8px" }}>
                      <strong>rewrite accounting</strong>
                    </div>
                    <div><strong>vertices:</strong> {graph.vertices.length}</div>
                    <div><strong>active vertices:</strong> {accounting.activeVertices}</div>
                    <div><strong>edges:</strong> {graph.edges.length}</div>
                    <div><strong>active edge supports:</strong> {accounting.activeEdges}</div>
                    <div><strong>before bonds:</strong> {edgeListLabel(accounting.beforeEdges)}</div>
                    <div><strong>after bonds:</strong> {edgeListLabel(accounting.afterEdges)}</div>
                    <div><strong>removed:</strong> {edgeListLabel(accounting.removed)}</div>
                    <div><strong>added:</strong> {edgeListLabel(accounting.added)}</div>
                    {accounting.branches?.length > 1 && (
                      <div
                        style={{
                          marginTop: "7px",
                          display: "grid",
                          gap: "7px",
                        }}
                      >
                        <div><strong>branch closure</strong></div>

                        {accounting.branches.map((branch) => (
                          <div
                            key={branch.label}
                            style={{
                              borderTop: "1px solid rgba(238,231,209,0.12)",
                              paddingTop: "6px",
                            }}
                          >
                            <div><strong>{branch.label}</strong></div>
                            <div>removes: {edgeListLabel(branch.removed)}</div>
                            <div>adds: {edgeListLabel(branch.added)}</div>
                            <div>oriented removes: {edgeListLabel(branch.orientedRemoved ?? [])}</div>
                            <div>oriented adds: {edgeListLabel(branch.orientedAdded ?? [])}</div>
                            <div>typed removes: {edgeListLabel(branch.typedRemoved ?? [])}</div>
                            <div>typed adds: {edgeListLabel(branch.typedAdded ?? [])}</div>
                            <div>
                              closed alone: {branch.closedAlone ? "yes" : "no"}
                            </div>
                            <div>
                              oriented closed: {branch.orientedClosedAlone ? "yes" : "no"}
                            </div>
                            <div>
                              typed closed: {branch.typedClosedAlone ? "yes" : "no"}
                            </div>
                          </div>
                        ))}

                        <div style={{ color: "rgba(242,198,109,0.88)" }}>
                          closed as paired total:{" "}
                          {accounting.closedAsPairedTotal ? "yes" : "no"}
                        </div>
                        <div style={{ color: "rgba(242,198,109,0.88)" }}>
                          closed as oriented total:{" "}
                          {accounting.closedAsOrientedPairedTotal ? "yes" : "no"}
                        </div>
                        <div style={{ color: "rgba(242,198,109,0.88)" }}>
                          closed as typed total:{" "}
                          {accounting.closedAsTypedPairedTotal ? "yes" : "no"}
                        </div>
                      </div>
                    )}
                    <div><strong>unchanged:</strong> {edgeListLabel(accounting.unchanged)}</div>
                    <div>
                      <strong>support preserved:</strong>{" "}
                      {accounting.supportPreserved ? "yes" : "no"}
                    </div>
                    <div>
                      <strong>degree balanced:</strong>{" "}
                      {accounting.degreeBalanced ? "yes" : "no"}
                    </div>
                    <div>
                      <strong>
                        {move.kind === "paired rewrite"
                          ? "closed as paired total:"
                          : "closed alone:"}
                      </strong>{" "}
                      {accounting.closedAlone ? "yes" : "no — needs complement"}
                    </div>
                    {!accounting.closedAlone && (
                      <div style={{ marginTop: "8px", color: "rgba(242,198,109,0.86)" }}>
                        complement 1: remove [{edgeListLabel(accounting.added)}],
                        add [{edgeListLabel(accounting.removed)}]
                      </div>
                    )}
                  </>
                )}

                {move.beforeLabel && <div>{move.beforeLabel}</div>}
                {move.afterLabel && <div>{move.afterLabel}</div>}
              </div>
            </div>
          </section>
        </div>
      </section>

      {showMoveDictionary && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            background: "rgba(0,0,0,0.76)",
            display: "grid",
            placeItems: "center",
            padding: "24px",
          }}
        >
          <div
            style={{
              width: "min(1280px, 96vw)",
              maxHeight: "90vh",
              overflow: "hidden",
              border: "1px solid rgba(238,231,209,0.22)",
              borderRadius: "10px",
              background:
                "linear-gradient(180deg, rgba(28,27,23,0.98), rgba(0,0,0,0.98))",
              boxShadow: "0 18px 70px rgba(0,0,0,0.55)",
              display: "grid",
              gridTemplateRows: "auto 1fr",
            }}
          >
            <div
              style={{
                padding: "16px 18px",
                borderBottom: "1px solid rgba(238,231,209,0.14)",
                display: "flex",
                justifyContent: "space-between",
                gap: "14px",
                alignItems: "start",
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: "24px", fontWeight: 400 }}>
                  Visual Move Dictionary
                </h2>

                <p
                  style={{
                    margin: "6px 0 0",
                    color: "rgba(238,231,209,0.68)",
                    maxWidth: "840px",
                    lineHeight: 1.35,
                  }}
                >
                  Each card is generated from the same move definitions used by the
                  main viewer. Implemented cards animate live; planned cards mark
                  the next catalogue layers.
                </p>
              </div>

              <button
                onClick={() => setShowMoveDictionary(false)}
                style={{
                  ...buttonStyle,
                  width: "auto",
                  padding: "7px 12px",
                }}
              >
                close
              </button>
            </div>

            <div
              style={{
                overflow: "auto",
                padding: "14px 18px 20px",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                  gap: "13px",
                }}
              >
                {dictionaryEntries.map((entry) => (
                  <MoveDictionaryCard
                    key={entry.id}
                    entry={entry}
                    progress={dictionaryProgress}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}

const dictionaryCellStyle = {
  padding: "8px 9px",
  borderBottom: "1px solid rgba(238,231,209,0.08)",
  verticalAlign: "top",
};

function MoveDictionaryCard({ entry, progress }) {
  const move = entry.move;

  return (
    <div
      style={{
        border: "1px solid rgba(238,231,209,0.14)",
        borderRadius: "8px",
        background:
          entry.status === "implemented"
            ? "rgba(255,255,255,0.045)"
            : "rgba(255,255,255,0.02)",
        overflow: "hidden",
        minHeight: "290px",
        display: "grid",
        gridTemplateRows: "155px auto",
      }}
    >
      {move ? (
        <MoveDictionaryPreview move={move} dimension={entry.dimension} progress={progress} />
      ) : (
        <div
          style={{
            display: "grid",
            placeItems: "center",
            color: "rgba(238,231,209,0.42)",
            borderBottom: "1px solid rgba(238,231,209,0.08)",
            background: "rgba(0,0,0,0.32)",
            fontSize: "14px",
            textAlign: "center",
            padding: "12px",
          }}
        >
          planned visual catalogue layer
        </div>
      )}

      <div style={{ padding: "10px 11px", display: "grid", gap: "5px" }}>
        <div
          style={{
            fontSize: "16px",
            color:
              entry.status === "implemented"
                ? "#eee7d1"
                : "rgba(238,231,209,0.56)",
            lineHeight: 1.18,
          }}
        >
          {move?.label ?? entry.label}
        </div>

        <div style={moveDictionaryMetaStyle}>
          <strong>dimension:</strong> {entry.dimension}D
        </div>
        <div style={moveDictionaryMetaStyle}>
          <strong>type:</strong> {entry.type}
        </div>
        <div style={moveDictionaryMetaStyle}>
          <strong>support:</strong> {entry.support}
        </div>
        <div style={moveDictionaryMetaStyle}>
          <strong>complexity:</strong> {entry.complexity}
        </div>
        <div style={moveDictionaryMetaStyle}>
          <strong>closure:</strong> {entry.closure}
        </div>
      </div>
    </div>
  );
}

function MoveDictionaryPreview({ move, dimension, progress }) {
  const selectedAxisA = 0;
  const selectedAxisB = dimension >= 2 ? 1 : 0;
  const selectedAxisC = dimension >= 3 ? 2 : 0;
  const supportRank = move.supportRank ?? "face2";
  const rewriteSliceBits = [0, 0, 0, 0, 0, 0];
  const moveFamily = moveFamilyKey(move);
  const graph = useMemo(() => makeCellGraph(dimension), [dimension]);

  const frame = useMemo(
    () =>
      makeFrame(
        graph,
        dimension,
        0.55,
        0.42,
        move.key,
        move.key === "identity" ? 0 : progress,
        move,
        0,
        selectedAxisA,
        selectedAxisB
      ),
    [graph, dimension, move, progress]
  );

  const activeMoveBonds = useMemo(
    () =>
      makeActiveBonds(
        move,
        frame,
        move.key === "identity" ? 0 : progress,
        dimension,
        selectedAxisA,
        selectedAxisB,
        rewriteSliceBits,
        selectedAxisC,
        supportRank
      ),
    [move, frame, progress, dimension, supportRank]
  );

  const selectedSubcubeEdges = useMemo(() => {
    if (!(moveFamily === "rewrites" && supportRank === "cube3")) return [];

    const verticesById = new Map(frame.vertices.map((vertex) => [vertex.id, vertex]));

    return selectedSubcubeEdgeIds(
      dimension,
      selectedAxisA,
      selectedAxisB,
      selectedAxisC,
      rewriteSliceBits
    )
      .map((edge) => ({
        ...edge,
        a: verticesById.get(edge.a),
        b: verticesById.get(edge.b),
      }))
      .filter((edge) => edge.a && edge.b);
  }, [moveFamily, supportRank, frame.vertices, dimension]);

  const cubeClosureShellEdges = useMemo(() => {
    if (!(moveFamily === "rewrites" && supportRank === "cube3")) return [];

    const activeSupportEdges = new Set(
      activeMoveBonds.flatMap((bond) => [
        normalizedEdge(bond.before),
        normalizedEdge(bond.after),
      ])
    );

    return selectedSubcubeEdges.filter((edge) => {
      const edgeKey = normalizedEdge([edge.a.id, edge.b.id]);
      return !activeSupportEdges.has(edgeKey);
    });
  }, [moveFamily, supportRank, selectedSubcubeEdges, activeMoveBonds]);

  return (
    <svg
      viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
      style={{
        width: "100%",
        height: "155px",
        display: "block",
        background:
          "radial-gradient(circle at 50% 22%, rgba(75,70,58,0.32), rgba(0,0,0,0.88) 68%)",
        borderBottom: "1px solid rgba(238,231,209,0.08)",
      }}
    >
      {frame.edges.map((edge) => (
        <line
          key={edge.id}
          x1={edge.a.x}
          y1={edge.a.y}
          x2={edge.b.x}
          y2={edge.b.y}
          stroke={AXIS_COLORS[edge.axisIndex % AXIS_COLORS.length]}
          strokeWidth={CELL_RENDER_STYLE.edgeStrokeWidth}
          opacity={moveFamily === "rewrites" ? 0.12 : 0.46}
          strokeLinecap="round"
        />
      ))}

      {selectedSubcubeEdges.map((edge) => (
        <line
          key={`preview-selected-subcube-${edge.id}`}
          x1={edge.a.x}
          y1={edge.a.y}
          x2={edge.b.x}
          y2={edge.b.y}
          stroke="rgba(242,198,109,0.48)"
          strokeWidth="4"
          opacity="0.66"
          strokeDasharray="8 6"
          strokeLinecap="round"
        />
      ))}

      {cubeClosureShellEdges.map((edge) => (
        <line
          key={`preview-cube-shell-${edge.id}`}
          x1={edge.a.x}
          y1={edge.a.y}
          x2={edge.b.x}
          y2={edge.b.y}
          stroke="rgba(57,255,243,0.66)"
          strokeWidth="5"
          opacity="0.68"
          strokeDasharray="2 8"
          strokeLinecap="round"
        />
      ))}

      {activeMoveBonds.map((bond) => (
        <line
          key={bond.id}
          x1={bond.a.x}
          y1={bond.a.y}
          x2={bond.b.x}
          y2={bond.b.y}
          stroke={bond.color ?? "#f2c66d"}
          strokeWidth="8"
          opacity="0.92"
          strokeLinecap="round"
        />
      ))}

      {frame.vertices.map((vertex) => (
        <circle
          key={vertex.id}
          cx={vertex.x}
          cy={vertex.y}
          r={moveFamily === "rewrites" ? 9 : vertex.active ? 10 : 7}
          fill={vertex.active ? "#f2c66d" : "#eee7d1"}
          stroke="rgba(0,0,0,0.72)"
          strokeWidth="2"
        />
      ))}
    </svg>
  );
}

const moveDictionaryMetaStyle = {
  color: "rgba(238,231,209,0.64)",
  fontSize: "13px",
  lineHeight: 1.2,
};

const selectStyle = {
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  padding: "6px 7px",
  borderRadius: "5px",
  border: "1px solid rgba(238,231,209,0.22)",
  background: "rgba(0,0,0,0.58)",
  color: "#eee7d1",
  fontFamily: "Times New Roman, Times, serif",
  fontSize: "14px",
  lineHeight: 1.15,
};

const buttonStyle = {
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  padding: "6px 7px",
  borderRadius: "5px",
  border: "1px solid rgba(238,231,209,0.22)",
  background: "rgba(255,255,255,0.05)",
  color: "#eee7d1",
  fontFamily: "Times New Roman, Times, serif",
  fontSize: "14px",
  lineHeight: 1.15,
  cursor: "pointer",
  overflowWrap: "break-word",
};
