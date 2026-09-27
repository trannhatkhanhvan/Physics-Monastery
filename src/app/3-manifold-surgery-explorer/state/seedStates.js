export const FIGURE_EIGHT_STATE_ID = "figure-eight";
export const WHITEHEAD_STATE_ID = "whitehead-link";

export const figureEightState = {
  id: FIGURE_EIGHT_STATE_ID,

  manifold: {
    censusName: "m004",
    isometrySignature: "cPcbbbiht",
    peripheralizedLinkSignature: "cPcbbbiht_bacb",
    cuspCount: 1,
    orientable: true,
  },

  link: {
    name: "4_1",
    componentCount: 1,
    certification: {
      status: "known-by-construction",
    },
  },

  cusps: [
    {
      id: "figure-eight-knot-cusp",
      index: 0,
      componentId: "figure-eight-knot-component",

      role: "knot",

      peripheralBasis: {
        meridian: [1, 0],
        longitude: [0, 1],
      },

      complete: true,
      filling: null,
    },
  ],

  certification: {
    manifoldIdentity: "certified",
    linkIdentity: "certified",
    peripheralStructure: "certified",
  },
};


export const whiteheadState = {
  id: WHITEHEAD_STATE_ID,

  manifold: {
    censusName: "m129",
    linkName: "5^2_1",
    isometrySignature: "eLPkbdcddhgggb",
    peripheralizedLinkSignature: "eLPkbdcddhgggb_baCbbaCb",
    cuspCount: 2,
    orientable: true,
  },

  link: {
    name: "5^2_1",
    componentCount: 2,

    pdCode: [
      [6, 5, 7, 0],
      [0, 3, 1, 4],
      [8, 2, 9, 1],
      [2, 8, 3, 7],
      [4, 9, 5, 6],
    ],

    dtCode: "DT[ebcbBDECA]",

    certification: {
      status: "known-by-construction",
    },
  },

  /*
   * The Whitehead-link complement has a symmetry exchanging its two cusps.
   *
   * Therefore the labels below are NOT intrinsic labels of the unmarked
   * manifold m129. They are persistent labels attached to this directed
   * surgery presentation.
   *
   * For the first edge we choose component/cusp 0 as the crossing circle
   * and component/cusp 1 as the surviving knot component.
   *
   * Because of the cusp-exchanging symmetry, the opposite convention would
   * define an equivalent directed presentation.
   */
  cusps: [
    {
      id: "crossing-circle-cusp",
      index: 0,
      componentId: "crossing-circle-component",

      role: "crossing-circle",

      peripheralBasis: {
        meridian: [1, 0],
        longitude: [0, 1],
      },

      complete: true,
      filling: null,
    },

    {
      id: "surviving-knot-cusp",
      index: 1,
      componentId: "surviving-knot-component",

      role: "knot",

      peripheralBasis: {
        meridian: [1, 0],
        longitude: [0, 1],
      },

      complete: true,
      filling: null,
    },
  ],

  certification: {
    manifoldIdentity: "certified",
    linkIdentity: "certified",
    peripheralStructure: "certified",
  },
};


export const seedStates = {
  [FIGURE_EIGHT_STATE_ID]: figureEightState,
  [WHITEHEAD_STATE_ID]: whiteheadState,
};
