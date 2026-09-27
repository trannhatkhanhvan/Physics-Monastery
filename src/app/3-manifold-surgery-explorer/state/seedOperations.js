import {
  FIGURE_EIGHT_STATE_ID,
  WHITEHEAD_STATE_ID,
} from "./seedStates";


export const FIGURE_EIGHT_WHITEHEAD_EDGE_ID =
  "figure-eight-whitehead-crossing-circle";


export const figureEightWhiteheadEdge = {
  id: FIGURE_EIGHT_WHITEHEAD_EDGE_ID,

  sourceStateId: FIGURE_EIGHT_STATE_ID,
  targetStateId: WHITEHEAD_STATE_ID,

  forward: {
    type: "drill-crossing-circle",

    description:
      "Introduce the designated crossing-circle component and remove " +
      "its tubular neighborhood, producing the two-cusped Whitehead-link " +
      "complement.",

    sourceComponentId: "figure-eight-knot-component",

    createdComponent: {
      id: "crossing-circle-component",
      targetCuspId: "crossing-circle-cusp",
    },

    preservedComponent: {
      sourceId: "figure-eight-knot-component",
      targetId: "surviving-knot-component",
      targetCuspId: "surviving-knot-cusp",
    },

    cuspCount: {
      before: 1,
      after: 2,
    },

    componentCount: {
      before: 1,
      after: 2,
    },
  },

  reverse: {
    type: "dehn-fill",

    sourceCuspId: "crossing-circle-cusp",

    /*
     * This is the exact filling slope found in the peripheral basis
     * induced by the stored Whitehead-link diagram.
     */
    slope: [1, 1],

    slopeBasis: {
      meridian: [1, 0],
      longitude: [0, 1],
    },

    resultStateId: FIGURE_EIGHT_STATE_ID,

    cuspCount: {
      before: 2,
      after: 1,
    },

    componentCount: {
      before: 2,
      after: 1,
    },
  },

  certification: {
    status: "verified",

    source: {
      manifold: "m129",
      isometrySignature: "eLPkbdcddhgggb",
      peripheralizedLinkSignature: "eLPkbdcddhgggb_baCbbaCb",
    },

    filling: {
      cuspIndex: 0,
      slope: [1, 1],
    },

    result: {
      manifold: "m004",
      isometrySignature: "cPcbbbiht",
      peripheralizedLinkSignature: "cPcbbbiht_bacb",
    },

    note:
      "Because the Whitehead-link complement has a cusp-exchanging " +
      "symmetry, filling cusp 1 along the same link-derived slope (1,1) " +
      "also yields the same peripheralized figure-eight complement. " +
      "This directed edge fixes cusp 0 as the crossing-circle cusp.",
  },
};


export const seedOperations = {
  [FIGURE_EIGHT_WHITEHEAD_EDGE_ID]: figureEightWhiteheadEdge,
};
