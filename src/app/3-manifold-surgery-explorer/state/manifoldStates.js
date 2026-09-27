export const MANIFOLD_STATES = Object.freeze({
  m004: Object.freeze({
    id: "m004",

    displayName:
      "Figure-eight knot complement",

    knotLinkName:
      "4₁",

    topologyType:
      "knot-complement",

    componentCount: 1,
    cuspCount: 1,

    isometrySignature:
      "cPcbbbiht",

    linkSignature:
      "cPcbbbiht_bacb",

    certified: true,

    cusps: Object.freeze([
      Object.freeze({
        id: "knot-cusp",
        label: "Cusp 1",
        role: "knot",
        peripheralBasis: Object.freeze({
          meridian: "μ",
          longitude: "λ",
        }),
      }),
    ]),
  }),

  m129: Object.freeze({
    id: "m129",

    displayName:
      "Whitehead link complement",

    knotLinkName:
      "5²₁",

    topologyType:
      "link-complement",

    componentCount: 2,
    cuspCount: 2,

    isometrySignature:
      "eLPkbdcddhgggb",

    linkSignature:
      "eLPkbdcddhgggb_baCbbaCb",

    certified: true,

    /*
     * These roles belong to the directed surgery operation.
     * The unmarked Whitehead-link complement itself has
     * symmetric cusps.
     */
    cusps: Object.freeze([
      Object.freeze({
        id: "surviving-knot-cusp",
        label: "Knot cusp",
        role: "surviving-knot",
        peripheralBasis: Object.freeze({
          meridian: "μ",
          longitude: "λ",
        }),
      }),

      Object.freeze({
        id: "crossing-circle-cusp",
        label: "Crossing-circle cusp",
        role: "crossing-circle",
        peripheralBasis: Object.freeze({
          meridian: "μ",
          longitude: "λ",
        }),
      }),
    ]),
  }),
});


export const SURGERY_EDGES = Object.freeze({
  drillCrossingCircle: Object.freeze({
    id: "drill-crossing-circle",

    operation:
      "drill-crossing-circle",

    sourceStateId:
      "m004",

    targetStateId:
      "m129",

    sourceCuspCount: 1,
    targetCuspCount: 2,

    certified: true,

    inverse: Object.freeze({
      operation:
        "dehn-fill",

      filledCuspRole:
        "crossing-circle",

      slope: Object.freeze({
        p: 1,
        q: 1,
      }),

      targetStateId:
        "m004",
    }),
  }),
});
