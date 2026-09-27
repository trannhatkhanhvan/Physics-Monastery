'use client';

import { useEffect, useRef, useState } from 'react';
import LayoutWrapper from '@/components/LayoutWrapper';
import '../globals.css';

export default function PlanckConstants() {
    const constants = [
    'Planck time',
    'Planck length',
    'Planck charge',
    'Planck temperature',
    'Planck mass'
  ];

  const constantLinks = [
    'https://www.wolframalpha.com/input?i=plot+pi*%28sinh%281%2F4*1%2F%28x%2Biy%29%29%29%5E2*%28e%5E5.39125836832313%2F44%29%2C+%7Bx%2C-1%2C1%7D',
    'https://www.wolframalpha.com/input?i=plot+%28sinh%28sinh%281%2F7*%28x%2Biy%29%29%29%29%5E%28-1%29*%28e%5E1.61625918175645%2F35%29%2C+%7Bx%2C-1%2C1%7D',
    'https://www.wolframalpha.com/input?i=plot+5%2F7%5E%281%2F2%29*%283%5E%28-1%2F3%29%2F%282%5E%285%2F4%29*pi%5E%281%2F2%29*e%5E%284pi%2F32%29%2F%28gamma%281%2F4*%28x%2Biy%29%29%29%5E2%29%29*e%5E1.87554596713962%2F18%2C+%7Bx%2C-1%2C1%7D',
    'https://www.wolframalpha.com/input?i=plot+2*%285%2F7%5E%281%2F2%29%29%5E2*%28cos%285i%2F2*1%2F%28x%2Biy%29%29%29%5E2*%28cos%287%2F5*1%2F%28x%2Biy%29%29%29%5E2*%28e%5E1.4167869859079%2F32%29%2C+%7Bx%2C-7%2C7%7D',
    'https://www.wolframalpha.com/input?i=plot+5*4pi%2F2*%28cos%287%2F5*1%2F%28x%2Biy%29%29%29%5E2*%28e%5E2.17642683817579%2F8%29%2C+%7Bx%2C-4%2C4%7D'
  ];

  // Base keys used to build filenames
  const constantKeys = ['time', 'length', 'charge', 'temperature', 'mass'];

  const videoFiles = [
  'planck_time.mp4',
  'planck_length.mp4',
  'planck_charge.mp4',
  'planck_temperature.mp4',
  'planck_mass.mp4'
];

  // Toggle 1: 3D vs 2D
  const [is3D, setIs3D] = useState(true);

  // Toggle 2: Real vs Imaginary
  const [isReal, setIsReal] = useState(true);

  const [modalImage, setModalImage] = useState(null);
  const [modalVideo, setModalVideo] = useState(null);

  /*
   * Each geometry expands independently.
   *
   *   0 = compact symbolic relation
   *   1 = signed geometry + signed integer
   *   2 = common negative signs cancelled
   */
  const GEOMETRY_KEYS = [
    'time',
    'length',
    'charge',
    'temperature',
    'mass',
  ];

  const [geometryExpansionStages, setGeometryExpansionStages] =
    useState({
      time: 0,
      length: 0,
      charge: 0,
      temperature: 0,
      mass: 0,
    });

  const geometryTimersRef = useRef({});

  const anyGeometryExpanded =
    GEOMETRY_KEYS.some(
      key => geometryExpansionStages[key] > 0
    );

  const allGeometriesExpanded =
    GEOMETRY_KEYS.every(
      key => geometryExpansionStages[key] > 0
    );

  /*
   * Each normalized Planck boundary expands independently.
   */
  const BOUNDARY_KEYS = [
    'time',
    'length',
    'charge',
    'temperature',
    'mass',
  ];

  /*
   * Normalized Planck-boundary animation stages:
   *
   *   0 = compact equation at collapsed/right position
   *   1 = compact equation at expanded/left position
   *   2 = full expanded equation at expanded/left position
   *
   * This prevents the full equation from appearing over the
   * neighboring columns while it is still sliding left.
   */
  const [
    boundaryExpansionStates,
    setBoundaryExpansionStates,
  ] = useState({
    time: 0,
    length: 0,
    charge: 0,
    temperature: 0,
    mass: 0,
  });

  const boundaryTimersRef = useRef({});

  const allBoundariesExpanded =
    BOUNDARY_KEYS.every(
      key => boundaryExpansionStates[key] > 0
    );

  const clearBoundaryTimer = (key) => {
    if (boundaryTimersRef.current[key]) {
      window.clearTimeout(
        boundaryTimersRef.current[key]
      );
      delete boundaryTimersRef.current[key];
    }
  };

  const scheduleBoundaryReveal = (key) => {
    clearBoundaryTimer(key);

    boundaryTimersRef.current[key] =
      window.setTimeout(() => {
        setBoundaryExpansionStates(
          current => {
            if (current[key] !== 1) {
              return current;
            }

            return {
              ...current,
              [key]: 2,
            };
          }
        );

        delete boundaryTimersRef.current[key];
      }, 330);
  };

  const expandBoundaryRow = (key) => {
    clearBoundaryTimer(key);

    setBoundaryExpansionStates(
      current => ({
        ...current,
        [key]: 1,
      })
    );

    scheduleBoundaryReveal(key);
  };

  const collapseBoundaryRow = (key) => {
    clearBoundaryTimer(key);

    const currentStage =
      boundaryExpansionStates[key];

    /*
     * If the full equation is visible, first replace it with
     * the compact equation while remaining at the left position.
     * Then, on the next short beat, slide the compact equation
     * back to its collapsed position.
     */
    if (currentStage === 2) {
      setBoundaryExpansionStates(
        current => ({
          ...current,
          [key]: 1,
        })
      );

      boundaryTimersRef.current[key] =
        window.setTimeout(() => {
          setBoundaryExpansionStates(
            current => ({
              ...current,
              [key]: 0,
            })
          );

          delete boundaryTimersRef.current[key];
        }, 40);

      return;
    }

    setBoundaryExpansionStates(
      current => ({
        ...current,
        [key]: 0,
      })
    );
  };

  const toggleBoundaryRow = (key) => {
    if (boundaryExpansionStates[key] > 0) {
      collapseBoundaryRow(key);
    } else {
      expandBoundaryRow(key);
    }
  };

  const expandAllBoundaries = () => {
    const keysToExpand =
      BOUNDARY_KEYS.filter(
        key => boundaryExpansionStates[key] === 0
      );

    if (keysToExpand.length === 0) {
      return;
    }

    keysToExpand.forEach(clearBoundaryTimer);

    setBoundaryExpansionStates(
      current => {
        const next = { ...current };

        keysToExpand.forEach((key) => {
          next[key] = 1;
        });

        return next;
      }
    );

    keysToExpand.forEach((key) => {
      scheduleBoundaryReveal(key);
    });
  };

  const collapseAllBoundaries = () => {
    BOUNDARY_KEYS.forEach(clearBoundaryTimer);

    /*
     * First return every expanded RHS to its compact form,
     * while leaving the rows in their left-hand positions.
     */
    setBoundaryExpansionStates(
      current => {
        const next = { ...current };

        BOUNDARY_KEYS.forEach((key) => {
          if (next[key] > 0) {
            next[key] = 1;
          }
        });

        return next;
      }
    );

    /*
     * Then slide all compact equations back to the right.
     */
    boundaryTimersRef.current.__collapseAll =
      window.setTimeout(() => {
        setBoundaryExpansionStates({
          time: 0,
          length: 0,
          charge: 0,
          temperature: 0,
          mass: 0,
        });

        delete boundaryTimersRef.current.__collapseAll;
      }, 40);
  };

  useEffect(() => {
    return () => {
      Object.values(
        boundaryTimersRef.current
      ).forEach((timer) => {
        window.clearTimeout(timer);
      });
    };
  }, []);


  // TEMPORARY inline-math SVG tuning
  /*
   * TEMPORARY INLINE-MATH SVG TUNING
   *
   * These SVGs were all authored from the same 12-point
   * mathematical font. Preserve their intrinsic dimensions
   * and scale them together rather than forcing a common
   * width or height.
   */
  /*
   * INLINE-MATH SVG TYPOGRAPHY
   *
   * All symbols preserve their intrinsic dimensions.
   * The accepted common scale and baseline are now fixed.
   */
  const INLINE_MATH_SCALE = 1.09;
  const INLINE_MATH_Y = -0.5;

  /*
   * Final inline-math baseline adjustments.
   */
  const INLINE_MATH_N_K_Y = 1.3;
  const INLINE_MATH_E_PHI_K_Y = -3.9;

  /*
   * Final u_k baseline adjustment.
   */
  const INLINE_MATH_U_K_Y = 1.2;

  const inlineMathStyle = {
    width: 'auto',
    height: 'auto',
    display: 'inline-block',
    position: 'relative',
    top: `${INLINE_MATH_Y}px`,
    transform: `scale(${INLINE_MATH_SCALE})`,
    transformOrigin: 'center center',
  };

  const inlineMathNKStyle = {
    ...inlineMathStyle,
    top: `${INLINE_MATH_N_K_Y}px`,
  };

  const inlineMathEPhiKStyle = {
    ...inlineMathStyle,
    top: `${INLINE_MATH_E_PHI_K_Y}px`,
  };

  const inlineMathUKStyle = {
    ...inlineMathStyle,
    top: `${INLINE_MATH_U_K_Y}px`,
  };

  /*
   * Independent geometry-expansion timers.
   *
   * Every row gets its own 900 ms signed stage, so rows can be
   * expanded in any order without resetting one another.
   */
  useEffect(() => {
    return () => {
      Object.values(
        geometryTimersRef.current
      ).forEach((timer) => {
        window.clearTimeout(timer);
      });
    };
  }, []);

  const scheduleGeometryCancellation = (key) => {
    if (geometryTimersRef.current[key]) {
      window.clearTimeout(
        geometryTimersRef.current[key]
      );
    }

    geometryTimersRef.current[key] =
      window.setTimeout(() => {
        setGeometryExpansionStages(
          current => {
            if (current[key] !== 1) {
              return current;
            }

            return {
              ...current,
              [key]: 2,
            };
          }
        );

        delete geometryTimersRef.current[key];
      }, 900);
  };

  const expandGeometryRow = (key) => {
    setGeometryExpansionStages(
      current => ({
        ...current,
        [key]: 1,
      })
    );

    scheduleGeometryCancellation(key);
  };

  const collapseGeometryRow = (key) => {
    if (geometryTimersRef.current[key]) {
      window.clearTimeout(
        geometryTimersRef.current[key]
      );
      delete geometryTimersRef.current[key];
    }

    setGeometryExpansionStages(
      current => ({
        ...current,
        [key]: 0,
      })
    );
  };

  const toggleGeometryRow = (key) => {
    if (geometryExpansionStages[key] > 0) {
      collapseGeometryRow(key);
    } else {
      expandGeometryRow(key);
    }
  };

  const expandAllGeometries = () => {
    const keysToExpand =
      GEOMETRY_KEYS.filter(
        key => geometryExpansionStages[key] === 0
      );

    if (keysToExpand.length === 0) {
      return;
    }

    setGeometryExpansionStages(
      current => {
        const next = { ...current };

        keysToExpand.forEach((key) => {
          next[key] = 1;
        });

        return next;
      }
    );

    keysToExpand.forEach((key) => {
      scheduleGeometryCancellation(key);
    });
  };

  const collapseAllGeometries = () => {
    Object.values(
      geometryTimersRef.current
    ).forEach((timer) => {
      window.clearTimeout(timer);
    });

    geometryTimersRef.current = {};

    setGeometryExpansionStages({
      time: 0,
      length: 0,
      charge: 0,
      temperature: 0,
      mass: 0,
    });
  };


  // Build the filename from the two toggles
  // planck_time_real_3d.png, etc.
  const getImageFilename = (key) => {
    const partRI = isReal ? 'real' : 'imag';
    const part23 = is3D ? '3d' : '2d';
    return `planck_${key}_${partRI}_${part23}.png`;
  };

  /*
   * TEMPORARY GEOMETRY-STACK TUNING
   *
   * Compact SVGs preserve their intrinsic dimensions.
   * COMPACT_RELATION_SCALE scales them uniformly.
   */
  /*
   * Compact geometric-relation layout.
   *
   * Measured directly from the new
   * geometric_relation_equation.svg:
   *
   *   G_k visible bounds: 0.0000 – 14.9375
   *   RHS begins at:      22.0000
   *
   * therefore:
   *
   *   G_k -> RHS gap = 7.0625
   */
  const COMPACT_RELATION_SCALE = 1.12;

  /*
   * Final compact relation row spacing.
   */
  const GEOMETRY_ROW_GAP = 1.50;
  /*
   * Final horizontal placement of the complete aligned
   * six-equation group.
   */
  /*
   * Final horizontal placement.
   */
  const RELATION_GROUP_X = 202;

  /*
   * Final upper geometry horizontal placement.
   */
  const GEOMETRY_EQUATIONS_X = -25;
  const GEOMETRY_TITLES_X = -42;
  const GEOMETRY_BUTTONS_X_UPPER = -98;

  /*
   * Final geometry-control placement.
   */
  const GENERAL_RELATION_X = 206;
  const GEOMETRY_BUTTON_HEIGHT = 24;

  /*
   * Final shared width for all 12 expand/collapse buttons.
   */
  const GEOMETRY_BUTTON_WIDTH = 61;

  /*
   * General relation and the five specific relations share
   * this same outer block, so their G terms have one exact
   * mathematical left edge.
   */
  const RELATION_BLOCK_WIDTH = 420;

  const GENERAL_G_VISIBLE_WIDTH = 14.9375;
  const GENERAL_G_RHS_GAP = 7.0625;

  const COMPACT_G_COLUMN_WIDTH =
    GENERAL_G_VISIBLE_WIDTH *
    COMPACT_RELATION_SCALE;

  const COMPACT_G_RHS_GAP =
    GENERAL_G_RHS_GAP *
    COMPACT_RELATION_SCALE;

  /*
   * ONE SHARED EQUALS-SIGN SPINE FOR ALL 12 EQUATIONS.
   *
   * Authority:
   *   G_0, G_1, G_2, G_3, G_4
   *
   * The compact G rows place "=" at the beginning of their
   * RHS column, after the rendered G width and G/RHS gap.
   */
  const SHARED_EQUALS_X =
    GEOMETRY_EQUATIONS_X +
    COMPACT_G_COLUMN_WIDTH +
    COMPACT_G_RHS_GAP;

  /*
   * Exact native visible X position of "=" inside
   * geometric_relation_equation.svg.
   *
   * Measured directly from the supplied SVG geometry.
   */
  const GENERAL_G_EQUALS_NATIVE_X = 22.015626256;

  const GENERAL_G_RELATION_X =
    SHARED_EQUALS_X -
    GENERAL_G_EQUALS_NATIVE_X *
      COMPACT_RELATION_SCALE;


  /*
   * Independent gap between the mathematical relation
   * and its physical-quantity label.
   */
  const RELATION_LABEL_GAP = 28;

  /*
   * Fixed expanded RHS column.
   *
   * This keeps the physical-quantity labels at one invariant
   * X position while the signed integer changes during the
   * cancellation animation.
   */
  const EXPANDED_RHS_COLUMN_WIDTH = 64;

  /*
   * Expanded relations remain split into two independently
   * authored SVGs:
   *
   *   [full geometry] [signed/cancelled RHS] [label]
   */
  const EXPANDED_RELATION_SCALE = 1.12;

  /*
   * Normalized Planck-boundary layout.
   *
   * The value column is right-anchored so expanding one row
   * grows leftward without moving its label or button.
   */
  /*
   * Normalized Planck-boundary row architecture:
   *
   *   [boundary symbol] [RHS] [label] [button]
   *
   * The RHS is left-anchored so the "=" embedded at the
   * beginning of every RHS SVG remains fixed through expansion.
   */
  const BOUNDARY_SYMBOL_COLUMN_WIDTH = 24;
  const BOUNDARY_SYMBOL_RHS_GAP = 10;
  const BOUNDARY_RHS_COLUMN_WIDTH = 270;

  /*
   * Fixed SI-unit column for normalized Planck boundaries.
   *
   * The mathematical RHS moves left on expansion while the
   * physical unit remains anchored.
   */
  const BOUNDARY_UNIT_COLUMN_WIDTH = 32;

  /*
   * TEMPORARY unit / expanded-end-position X tuner.
   *
   * This moves the fixed SI-unit symbols and the expanded
   * equations together. Collapsed equations remain locked
   * to the shared 12-equation equals-sign spine.
   */
  /*
   * Final unit / expanded-endpoint placement.
   */
  const BOUNDARY_UNIT_GROUP_X = 30;
  const BOUNDARY_UNIT_GROUP_Y = 0;

  /*
   * The fixed SI-unit geometry was finalized with this
   * lower-boundary group reference.
   */
  const BOUNDARY_EQUATION_GROUP_X = 23;

  /*
   * Exact native visible X position of "=" inside
   * boundary_relation_equation.svg.
   *
   * Measured directly from the supplied SVG geometry.
   */
  const GENERAL_B_EQUALS_NATIVE_X = 22.812505008;

  /*
   * Place the general B_k equation on the SAME equals spine.
   */
  const BOUNDARY_RELATION_X =
    SHARED_EQUALS_X -
    GENERAL_B_EQUALS_NATIVE_X *
      COMPACT_RELATION_SCALE;

  /*
   * Collapsed Planck equations:
   *
   * [boundary symbol][gap][RHS beginning with "="]
   *
   * Therefore the RHS origin is placed directly on the
   * shared equals-sign spine.
   */
  const BOUNDARY_COLLAPSED_EQUATIONS_X =
    SHARED_EQUALS_X -
    BOUNDARY_SYMBOL_COLUMN_WIDTH -
    BOUNDARY_SYMBOL_RHS_GAP;

  /*
   * Expanded Planck equations retain the exact absolute
   * position established before this alignment pass.
   *
   * Previously:
   *
   *   23 + (-233) = -210 px
   *
   * Keeping that value preserves the expanded equation/unit
   * geometry exactly.
   */
  const BOUNDARY_EXPANDED_EQUATIONS_X =
    BOUNDARY_EQUATION_GROUP_X - 233;

  /*
   * Exact shared button column.
   *
   * The lower five row buttons and lower master button align
   * to the same X position as the six controls above.
   */
  const UPPER_BUTTON_COLUMN_X =
    COMPACT_G_COLUMN_WIDTH +
    COMPACT_G_RHS_GAP +
    EXPANDED_RHS_COLUMN_WIDTH +
    RELATION_LABEL_GAP +
    150 +
    14 +
    GEOMETRY_BUTTONS_X_UPPER;

  const LOWER_BUTTON_COLUMN_X =
    BOUNDARY_SYMBOL_COLUMN_WIDTH +
    BOUNDARY_SYMBOL_RHS_GAP +
    BOUNDARY_RHS_COLUMN_WIDTH +
    BOUNDARY_UNIT_COLUMN_WIDTH +
    14;

  const BOUNDARY_BUTTONS_X =
    UPPER_BUTTON_COLUMN_X -
    LOWER_BUTTON_COLUMN_X;

  /*
   * Final normalized-boundary vertical layout.
   */
  const BOUNDARY_ROW_GAP = 0.50;
  const BOUNDARY_EXPANDED_RHS_Y = -2.75;

  const geometryRelationRows = [
    {
      key: 'time',
      label: 'time',
      compactGeoSrc: '/equations/G_0.svg',
      rhsSrc: '/equations/rhs_0.svg',

      signedGeoSrc:
        '/equations/G_0_expanded_signed.svg',
      signedRhsSrc:
        '/equations/rhs_0_expanded_signed.svg',

      cancelledGeoSrc:
        '/equations/G_0_expanded_cancelled.svg',
      cancelledRhsSrc:
        '/equations/rhs_0_expanded_cancelled.svg',
    },
    {
      key: 'length',
      label: 'length',
      compactGeoSrc: '/equations/G_1.svg',
      rhsSrc: '/equations/rhs_1.svg',

      signedGeoSrc:
        '/equations/G_1_expanded_signed.svg',
      signedRhsSrc:
        '/equations/rhs_1_expanded_signed.svg',

      cancelledGeoSrc:
        '/equations/G_1_expanded_cancelled.svg',
      cancelledRhsSrc:
        '/equations/rhs_1_expanded_cancelled.svg',
    },
    {
      key: 'charge',
      label: 'charge',
      compactGeoSrc: '/equations/G_2.svg',
      rhsSrc: '/equations/rhs_2.svg',

      signedGeoSrc:
        '/equations/G_2_expanded_signed.svg',
      signedRhsSrc:
        '/equations/rhs_2_expanded_signed.svg',

      cancelledGeoSrc:
        '/equations/G_2_expanded_cancelled.svg',
      cancelledRhsSrc:
        '/equations/rhs_2_expanded_cancelled.svg',
    },
    {
      key: 'temperature',
      label: 'temperature',
      compactGeoSrc: '/equations/G_3.svg',
      rhsSrc: '/equations/rhs_3.svg',

      signedGeoSrc:
        '/equations/G_3_expanded_signed.svg',
      signedRhsSrc:
        '/equations/rhs_3_expanded_signed.svg',

      /*
       * Temperature is already positive, so there is no
       * common minus sign to cancel. Stage 2 reuses stage 1.
       */
      cancelledGeoSrc:
        '/equations/G_3_expanded_signed.svg',
      cancelledRhsSrc:
        '/equations/rhs_3_expanded_signed.svg',
    },
    {
      key: 'mass',
      label: 'mass',
      compactGeoSrc: '/equations/G_4.svg',
      rhsSrc: '/equations/rhs_4.svg',

      signedGeoSrc:
        '/equations/G_4_expanded_signed.svg',
      signedRhsSrc:
        '/equations/rhs_4_expanded_signed.svg',

      cancelledGeoSrc:
        '/equations/G_4_expanded_cancelled.svg',
      cancelledRhsSrc:
        '/equations/rhs_4_expanded_cancelled.svg',
    },
  ];

  const boundaryRelationRows = [
    {
      key: 'time',
      label: 'time',
      symbolSrc: '/equations/planck_time.svg',
      symbolAlt: 't_p',
      symbolHeight: '16.5px',
      unitSrc: '/equations/second.svg',
      unitAlt: 's',
      expandedAnchorCorrectionX: 0,
      unitTranslateY: 0.13312528,
      rhsSrc: '/equations/boundary_rhs_0.svg',
      expandedRhsSrc:
        '/equations/boundary_rhs_0_expanded.svg',
    },
    {
      key: 'length',
      label: 'length',
      symbolSrc: '/equations/planck_length.svg',
      symbolAlt: 'l_p',
      symbolHeight: '16.5px',
      unitSrc: '/equations/meter.svg',
      unitAlt: 'm',
      expandedAnchorCorrectionX: 0.0875,
      unitTranslateY: 0.26401968,
      rhsSrc: '/equations/boundary_rhs_1.svg',
      expandedRhsSrc:
        '/equations/boundary_rhs_1_expanded.svg',
    },
    {
      key: 'charge',
      label: 'charge',
      symbolSrc: '/equations/planck_charge.svg',
      symbolAlt: 'q_p',
      symbolHeight: '13.5px',
      unitSrc: '/equations/coulomb.svg',
      unitAlt: 'C',
      expandedAnchorCorrectionX: -0.2275,
      unitTranslateY: -1.60812472,
      rhsSrc: '/equations/boundary_rhs_2.svg',
      expandedRhsSrc:
        '/equations/boundary_rhs_2_expanded.svg',
    },
    {
      key: 'temperature',
      label: 'temperature',
      symbolSrc: '/equations/planck_temperature.svg',
      symbolAlt: 'T_p',
      symbolHeight: '16px',
      unitSrc: '/equations/kelvin.svg',
      unitAlt: 'K',
      expandedAnchorCorrectionX: 8.9879,
      unitTranslateY: -1.60812472,
      rhsSrc: '/equations/boundary_rhs_3.svg',
      expandedRhsSrc:
        '/equations/boundary_rhs_3_expanded.svg',
    },
    {
      key: 'mass',
      label: 'mass',
      symbolSrc: '/equations/planck_mass.svg',
      symbolAlt: 'm_p',
      symbolHeight: '14.5px',
      unitSrc: '/equations/kilogram.svg',
      unitAlt: 'kg',
      expandedAnchorCorrectionX: 7.6050,
      unitTranslateY: -1.82686912,
      rhsSrc: '/equations/boundary_rhs_4.svg',
      expandedRhsSrc:
        '/equations/boundary_rhs_4_expanded.svg',
    },
  ];

  return (
    <LayoutWrapper>

      <div
  className="symbol-overlay"
  style={{
    left: 0,
    width: "100vw",
  }}
/>
      <div
  className="partition-content"
  style={{
    width: "min(1750px, calc(100vw - var(--sidebar-width) - 4rem))",
    maxWidth: "none",
  }}
>
        <div className="legend-title">the Planck constants</div>

        <p className="equation-description">
          The Planck constants define the boundaries of the coherent bases of atomic logic.
          Below, the same five boundaries are shown through real and imaginary surface plots, phase plots, and their coherent closed-form definitions.
        </p>

        <div style={{ height: '2.2rem' }} />

        {/* -------------------------------------------------- */}
        {/* Surface plots header + controls                    */}
        {/* -------------------------------------------------- */}

        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '1320px',
            minHeight: '2rem',
            margin: '0 auto 0.45rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              fontSize: '0.88rem',
              lineHeight: 1,
              fontWeight: 'normal',
              color: 'rgba(255, 255, 255, 0.40)',
              textAlign: 'center',
              whiteSpace: 'nowrap',
            }}
          >
            Surface plots
          </div>

          <div
            style={{
              position: 'absolute',
              right: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.82rem',
            }}
          >
            {/* 2D | 3D */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                color: 'rgba(242, 237, 224, 0.94)',
                padding: '0.12rem 0.28rem',
                border: '1px solid rgba(214, 207, 188, 0.48)',
                borderRadius: '8px',
                background: 'rgba(22, 22, 18, 0.36)',
                minWidth: '67px',
                boxSizing: 'border-box',
                justifyContent: 'center',
              }}
            >
              <span
                onClick={() => setIs3D(false)}
                style={{
                  cursor: is3D ? 'pointer' : 'default',
                  color: !is3D
                    ? 'rgba(255, 250, 236, 1)'
                    : 'rgba(242, 237, 224, 0.58)',
                  fontWeight: 400,
                  background: !is3D
                    ? 'rgba(232, 223, 200, 0.10)'
                    : 'transparent',
                  borderRadius: '5px',
                  padding: '0',
                  transition:
                    'background 160ms ease, color 160ms ease',
                  display: 'inline-block',
                }}
              >
                2D
              </span>

              <span style={{ opacity: 0.6 }}>|</span>

              <span
                onClick={() => setIs3D(true)}
                style={{
                  cursor: !is3D ? 'pointer' : 'default',
                  color: is3D
                    ? 'rgba(255, 250, 236, 1)'
                    : 'rgba(242, 237, 224, 0.58)',
                  fontWeight: 400,
                  background: is3D
                    ? 'rgba(232, 223, 200, 0.10)'
                    : 'transparent',
                  borderRadius: '5px',
                  padding: '0',
                  transition:
                    'background 160ms ease, color 160ms ease',
                  display: 'inline-block',
                }}
              >
                3D
              </span>
            </div>

            {/* Re | Im */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                color: 'rgba(242, 237, 224, 0.94)',
                padding: '0.12rem 0.28rem',
                border: '1px solid rgba(214, 207, 188, 0.48)',
                borderRadius: '8px',
                background: 'rgba(22, 22, 18, 0.36)',
                minWidth: '67px',
                boxSizing: 'border-box',
                justifyContent: 'center',
              }}
            >
              <span
                onClick={() => setIsReal(true)}
                style={{
                  cursor: !isReal ? 'pointer' : 'default',
                  color: isReal
                    ? 'rgba(255, 250, 236, 1)'
                    : 'rgba(242, 237, 224, 0.58)',
                  fontWeight: 400,
                  background: isReal
                    ? 'rgba(232, 223, 200, 0.10)'
                    : 'transparent',
                  borderRadius: '5px',
                  padding: '0',
                  transition:
                    'background 160ms ease, color 160ms ease',
                  display: 'inline-block',
                }}
              >
                Re
              </span>

              <span style={{ opacity: 0.6 }}>|</span>

              <span
                onClick={() => setIsReal(false)}
                style={{
                  cursor: isReal ? 'pointer' : 'default',
                  color: !isReal
                    ? 'rgba(255, 250, 236, 1)'
                    : 'rgba(242, 237, 224, 0.58)',
                  fontWeight: 400,
                  background: !isReal
                    ? 'rgba(232, 223, 200, 0.10)'
                    : 'transparent',
                  borderRadius: '5px',
                  padding: '0',
                  transition:
                    'background 160ms ease, color 160ms ease',
                  display: 'inline-block',
                }}
              >
                Im
              </span>
            </div>
          </div>
        </div>

        {/* -------------------------------------------------- */}
        {/* Surface plot row                                  */}
        {/* -------------------------------------------------- */}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
            gap: 'clamp(0.45rem, 1.15vw, 1rem)',
            width: '100%',
            maxWidth: '1320px',
            margin: '0 auto',
            alignItems: 'start',
          }}
        >
          {constantKeys.map((key, index) => {
            const filename = getImageFilename(key);

            return (
              <div
                key={key}
                style={{
                  textAlign: 'center',
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <img
                    src={`/images/${filename}`}
                    alt={constants[index]}
                    onClick={() =>
                      setModalImage(`/images/${filename}`)
                    }
                    style={{
                      display: 'block',
                      width: '100%',
                      height: 'auto',
                      maxWidth: 'none',
                      cursor: 'pointer',
                      borderRadius: '0.3rem',
                      boxShadow: '0 0 8px rgba(0,0,0,0.3)',

                      transform:
                        !is3D &&
                        filename ===
                          `planck_temperature_${isReal ? 'real' : 'imag'}_2d.png`
                          ? 'translateX(6px)'
                          : 'none',
                    }}
                  />
                </div>

                <a
                  href={constantLinks[index]}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    marginTop: '0.5rem',
                    display: 'inline-block',
                    color: 'inherit',
                    textDecoration: 'none',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    fontSize: 'clamp(0.75rem, 1.25vw, 1rem)',

                    transform:
                      index === 3
                        ? 'translateY(5px)'
                        : 'none',
                  }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.color = 'yellow')
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.color = 'inherit')
                  }
                >
                  {constants[index]}
                </a>
              </div>
            );
          })}
        </div>

        <div style={{ height: '2.0rem' }} />

        {/* -------------------------------------------------- */}
        {/* Phase plots                                        */}
        {/* -------------------------------------------------- */}

        <div
          style={{
            width: '100%',
            maxWidth: '1320px',
            margin: '0 auto 0.7rem',
            textAlign: 'center',
            fontSize: '0.88rem',
            lineHeight: 1,
            fontWeight: 'normal',
            color: 'rgba(255, 255, 255, 0.40)',
          }}
        >
          Phase plots
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
            gap: 'clamp(0.45rem, 1.15vw, 1rem)',
            width: '100%',
            maxWidth: '1320px',
            margin: '0 auto',
            alignItems: 'start',
          }}
        >
          {videoFiles.map((file, index) => (
            <div
              key={file}
              style={{
                textAlign: 'center',
                minWidth: 0,
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '16 / 9',
                  margin: '0 auto',
                }}
              >
                <img
                  src={`/videos/${file.replace('.mp4', '_thumbnail.jpg')}`}
                  alt={constants[index]}
                  onClick={() => setModalVideo(file)}
                  style={{
                    display: 'block',
                    width: '100%',
                    height: '100%',
                    borderRadius: '0.4rem',
                    boxShadow: '0 0 8px rgba(0,0,0,0.3)',
                    cursor: 'pointer',
                    objectFit: 'cover',
                  }}
                />

                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                  }}
                >
                  <div
                    style={{
                      width: 0,
                      height: 0,
                      borderTop: '6.4px solid transparent',
                      borderBottom: '6.4px solid transparent',
                      borderLeft: '9.6px solid white',
                      filter: 'drop-shadow(0 0 1.5px black)',
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  marginTop: '0.5rem',
                  whiteSpace: 'nowrap',
                  fontSize: 'clamp(0.75rem, 1.25vw, 1rem)',
                }}
              >
                {constants[index]}
              </div>
            </div>
          ))}
        </div>

        <div style={{ height: '2.0rem' }} />

        <p
          className="equation-description"
          style={{
            fontSize: '1.15rem',
            textAlign: 'center',
            color: 'rgba(255, 255, 255, 0.40)',
            marginLeft: 0,
            textIndent: 0,
          }}
        >
          Closed-form encoding of the Planck boundaries
        </p>

        <div style={{ height: '1.5rem' }} />

        <p className="equation-description">
          Each Planck boundary is associated with a geometric factor{' '}
          <img
            src="/equations/G_k.svg"
            alt="G_k"
            style={inlineMathStyle}
          />{' '}
          that connects its continuous scalar coordinate{' '}
          <img
            src="/equations/phi_k.svg"
            alt="phi_k"
            style={inlineMathStyle}
          />{' '}
          to its discrete integer lattice value{' '}
          <img
            src="/equations/n_k.svg"
            alt="n_k"
            style={inlineMathNKStyle}
          />
          :
        </p>

        <div style={{ height: '1.3rem' }} />

        <div
          style={{
            position: 'relative',
            width: `${RELATION_BLOCK_WIDTH}px`,
            maxWidth: '100%',
            margin: '0 auto',
            transform:
              `translateX(${RELATION_GROUP_X}px)`,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-start',
              transform:
                `translateX(${GENERAL_G_RELATION_X}px)`,
            }}
          >
            <img
              src="/equations/geometric_relation_equation.svg"
              alt="G_k equals n_k divided by e to the phi_k"
              style={{
                width: 'auto',
                height: 'auto',
                display: 'block',
                transform:
                  `scale(${COMPACT_RELATION_SCALE})`,
                transformOrigin: 'left center',
              }}
            />
          </div>
        </div>

        <div style={{ height: '1.5rem' }} />

        <div
          style={{
            position: 'relative',
            width: '100%',
          }}
        >
          <p
            className="equation-description"
            style={{
              marginBottom: 0,
            }}
          >
            For the five Planck boundaries,
          </p>

          <div
            style={{
              position: 'absolute',

              /*
               * Align master control above the existing
               * five-button column.
               */
              left:
                `calc(50% + ${
                  (
                    -RELATION_BLOCK_WIDTH / 2 +
                    RELATION_GROUP_X +
                    COMPACT_G_COLUMN_WIDTH +
                    COMPACT_G_RHS_GAP +
                    EXPANDED_RHS_COLUMN_WIDTH +
                    RELATION_LABEL_GAP +
                    150 +
                    14 +
                    GEOMETRY_BUTTONS_X_UPPER
                  )
                }px)`,

              top: '50%',
              transform: 'translateY(-50%)',

              display: 'flex',
              justifyContent: 'flex-start',
              whiteSpace: 'nowrap',
            }}
          >
            <button
              type="button"
              onClick={() => {
                if (allGeometriesExpanded) {
                  collapseAllGeometries();
                } else {
                  expandAllGeometries();
                }
              }}
              aria-expanded={
                allGeometriesExpanded
              }
              style={{
                width:
                  `${GEOMETRY_BUTTON_WIDTH}px`,
                height:
                  `${GEOMETRY_BUTTON_HEIGHT}px`,
                boxSizing: 'border-box',
                fontFamily:
                  "'Times New Roman', Times, serif",
                fontSize: '0.82rem',
                color:
                  'rgba(242, 237, 224, 0.40)',
                border:
                  '1px solid rgba(214, 207, 188, 0.48)',
                borderRadius: '7px',
                background:
                  'rgba(22, 22, 18, 0.36)',
                padding: '0 0.5rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              all
            </button>
          </div>
        </div>

        <div style={{ height: '1.25rem' }} />

        <div
          style={{
            position: 'relative',
            width: `${RELATION_BLOCK_WIDTH}px`,
            maxWidth: '100%',
            margin: '0 auto',
            transform:
              `translateX(${RELATION_GROUP_X}px)`,
          }}
        >
          <div
            style={{
              display: 'grid',

              /*
               * One invariant horizontal architecture for all
               * mixed states:
               *
               * geometry | gap | RHS | gap | label | gap | button
               *
               * Using the fixed RHS column preserves the "="
               * and label anchors while individual rows expand.
               */
              gridTemplateColumns:
                `${COMPACT_G_COLUMN_WIDTH}px ` +
                `${COMPACT_G_RHS_GAP}px ` +
                `${EXPANDED_RHS_COLUMN_WIDTH}px ` +
                `${RELATION_LABEL_GAP}px ` +
                `150px 14px ${GEOMETRY_BUTTON_WIDTH}px`,

              width: '100%',
              maxWidth: '100%',
              alignItems: 'center',
              justifyContent: 'start',

              /*
               * Keep the accepted collapsed/final row gap.
               * Expanded rows become intrinsically taller, so
               * surrounding rows move apart naturally.
               */
              rowGap: `${GEOMETRY_ROW_GAP}rem`,
              columnGap: 0,
              margin: 0,
              overflow: 'visible',
            }}
          >
            {geometryRelationRows.map((row) => {
              const stage =
                geometryExpansionStages[row.key];

              const isExpanded = stage > 0;

              return (
                <div
                  key={row.key}
                  style={{
                    gridColumn: '1 / -1',
                    display: 'grid',
                    gridTemplateColumns:
                      `${COMPACT_G_COLUMN_WIDTH}px ` +
                      `${COMPACT_G_RHS_GAP}px ` +
                      `${EXPANDED_RHS_COLUMN_WIDTH}px ` +
                      `${RELATION_LABEL_GAP}px ` +
                      `150px 14px ${GEOMETRY_BUTTON_WIDTH}px`,
                    alignItems: 'center',
                    columnGap: 0,
                    width: '100%',
                    overflow: 'visible',
                  }}
                >
                  {isExpanded ? (
                    <>
                      {/* Full geometry.
                          Its RIGHT edge remains fixed. */}
                      <div
                        style={{
                          width:
                            `${COMPACT_G_COLUMN_WIDTH}px`,
                          display: 'flex',
                          justifyContent: 'flex-end',
                          alignItems: 'center',
                          overflow: 'visible',
                          transform:
                            `translateX(${GEOMETRY_EQUATIONS_X}px)`,
                        }}
                      >
                        <img
                          key={
                            `geo-${row.key}-${stage}`
                          }
                          src={
                            stage >= 2
                              ? row.cancelledGeoSrc
                              : row.signedGeoSrc
                          }
                          alt={
                            stage >= 2
                              ? `Sign-cancelled geometry for ${row.label}`
                              : `Signed geometry for ${row.label}`
                          }
                          style={{
                            width: 'auto',
                            height: 'auto',
                            maxWidth: 'none',
                            display: 'block',
                            flexShrink: 0,
                            transform:
                              `scale(${EXPANDED_RELATION_SCALE})`,
                            transformOrigin:
                              'right center',
                            transition:
                              'opacity 220ms ease',
                          }}
                        />
                      </div>

                      <div />

                      {/* Expanded RHS.
                          "=" is the first glyph and its left
                          edge remains invariant. */}
                      <div
                        style={{
                          width:
                            `${EXPANDED_RHS_COLUMN_WIDTH}px`,
                          display: 'flex',
                          justifyContent:
                            'flex-start',
                          alignItems: 'center',
                          overflow: 'visible',
                          transform:
                            `translateX(${GEOMETRY_EQUATIONS_X}px)`,
                        }}
                      >
                        <img
                          key={
                            `rhs-${row.key}-${stage}`
                          }
                          src={
                            stage >= 2
                              ? row.cancelledRhsSrc
                              : row.signedRhsSrc
                          }
                          alt={
                            stage >= 2
                              ? `Sign-cancelled right-hand relation for ${row.label}`
                              : `Signed right-hand relation for ${row.label}`
                          }
                          style={{
                            width: 'auto',
                            height: 'auto',
                            display: 'block',
                            flexShrink: 0,
                            transform:
                              `scale(${EXPANDED_RELATION_SCALE})`,
                            transformOrigin:
                              'left center',
                            transition:
                              'opacity 220ms ease',
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Compact G_i */}
                      <div
                        style={{
                          width:
                            `${COMPACT_G_COLUMN_WIDTH}px`,
                          display: 'flex',
                          justifyContent:
                            'flex-start',
                          alignItems: 'center',
                          transform:
                            `translateX(${GEOMETRY_EQUATIONS_X}px)`,
                        }}
                      >
                        <img
                          src={row.compactGeoSrc}
                          alt={`G for ${row.label}`}
                          style={{
                            width: 'auto',
                            height: 'auto',
                            display: 'block',
                            transform:
                              `scale(${COMPACT_RELATION_SCALE})`,
                            transformOrigin:
                              'left center',
                          }}
                        />
                      </div>

                      <div />

                      {/* Compact RHS */}
                      <div
                        style={{
                          width:
                            `${EXPANDED_RHS_COLUMN_WIDTH}px`,
                          display: 'flex',
                          justifyContent:
                            'flex-start',
                          alignItems: 'center',
                          overflow: 'visible',
                          transform:
                            `translateX(${GEOMETRY_EQUATIONS_X}px)`,
                        }}
                      >
                        <img
                          src={row.rhsSrc}
                          alt={
                            `Right-hand relation for ${row.label}`
                          }
                          style={{
                            width: 'auto',
                            height: 'auto',
                            display: 'block',
                            transform:
                              `scale(${COMPACT_RELATION_SCALE})`,
                            transformOrigin:
                              'left center',
                          }}
                        />
                      </div>
                    </>
                  )}

                  <div />

                  {/* Fixed physical-quantity label column */}
                  <div
                    style={{
                      width: '150px',
                      whiteSpace: 'nowrap',
                      textAlign: 'left',
                      justifySelf: 'start',
                      transform:
                        `translateX(${GEOMETRY_TITLES_X}px)`,
                    }}
                  >
                    {row.label}
                  </div>

                  <div />

                  {/* Independent row control */}
                  <button
                    type="button"
                    onClick={() =>
                      toggleGeometryRow(row.key)
                    }
                    aria-expanded={isExpanded}
                    style={{
                      width: `${GEOMETRY_BUTTON_WIDTH}px`,
                      height:
                        `${GEOMETRY_BUTTON_HEIGHT}px`,
                      boxSizing: 'border-box',
                      fontFamily:
                        "'Times New Roman', Times, serif",
                      fontSize: '0.82rem',
                      color:
                        'rgba(242, 237, 224, 0.40)',
                      border:
                        '1px solid rgba(214, 207, 188, 0.48)',
                      borderRadius: '7px',
                      background:
                        'rgba(22, 22, 18, 0.36)',
                      padding:
                        '0 0.5rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transform:
                        `translateX(${GEOMETRY_BUTTONS_X_UPPER}px)`,
                    }}
                  >
                    {isExpanded
                      ? 'collapse'
                      : 'expand'}
                  </button>
                </div>
              );
            })}

          </div>
        </div>

        {anyGeometryExpanded && (
          <>
            <div style={{ height: '2rem' }} />

            <p
              className="equation-description"
              style={{
                textIndent: 0,
                marginLeft: 0,
                paddingLeft: 0,
              }}
            >
              Where{' '}
              <img
                src="/equations/pi.svg"
                alt="pi"
                style={{
                  height: '8px',
                  width: 'auto',
                  display: 'inline-block',
                  position: 'relative',
                  top: '-0px',
                }}
              />{' '}
              ={' '}
              <a
                href="https://en.wikipedia.org/wiki/Pi"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'inherit',
                  textDecoration: 'none',
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.color =
                    'yellow')
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.color =
                    'inherit')
                }
              >
                Archimedes&apos; constant
              </a>
              ,{' '}
              <img
                src="/equations/sinh_x.svg"
                alt="sinh(x)"
                style={{
                  height: '15px',
                  width: 'auto',
                  display: 'inline-block',
                  position: 'relative',
                  top: '-2px',
                }}
              />{' '}
              ={' '}
              <a
                href="https://mathworld.wolfram.com/HyperbolicSine.html"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'inherit',
                  textDecoration: 'none',
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.color =
                    'yellow')
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.color =
                    'inherit')
                }
              >
                the hyperbolic sine function
              </a>
              ,{' '}
              <img
                src="/equations/euler_s_number.svg"
                alt="e"
                style={{
                  height: '8px',
                  width: 'auto',
                  display: 'inline-block',
                  position: 'relative',
                  top: '-0px',
                }}
              />{' '}
              ={' '}
              <a
                href="https://en.wikipedia.org/wiki/E_(mathematical_constant)"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'inherit',
                  textDecoration: 'none',
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.color =
                    'yellow')
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.color =
                    'inherit')
                }
              >
                Euler&apos;s number
              </a>
              ,{' '}
              <img
                src="/equations/w_we.svg"
                alt="W_We"
                style={{
                  height: '15px',
                  width: 'auto',
                  display: 'inline-block',
                  position: 'relative',
                  top: '-1px',
                }}
              />{' '}
              ={' '}
              <a
                href="https://mathworld.wolfram.com/WeierstrassConstant.html"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'inherit',
                  textDecoration: 'none',
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.color =
                    'yellow')
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.color =
                    'inherit')
                }
              >
                the Weierstrass constant
              </a>
              ,{' '}
              <img
                src="/equations/i.svg"
                alt="i"
                style={{
                  height: '11px',
                  width: 'auto',
                  display: 'inline-block',
                  position: 'relative',
                  top: '-1.5px',
                }}
              />{' '}
              ={' '}
              <a
                href="https://en.wikipedia.org/wiki/Imaginary_unit"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'inherit',
                  textDecoration: 'none',
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.color =
                    'yellow')
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.color =
                    'inherit')
                }
              >
                the imaginary unit
              </a>
              , and{' '}
              <img
                src="/equations/cos_x.svg"
                alt="cos(x)"
                style={{
                  height: '16px',
                  width: 'auto',
                  display: 'inline-block',
                  position: 'relative',
                  top: '-1.5px',
                }}
              />{' '}
              ={' '}
              <a
                href="https://mathworld.wolfram.com/Cosine.html"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'inherit',
                  textDecoration: 'none',
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.color =
                    'yellow')
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.color =
                    'inherit')
                }
              >
                the cosine function
              </a>
              .
            </p>
          </>
        )}

        <div style={{ height: '2.5rem' }} />

        <p
          className="equation-description"
          style={{
            textIndent: 0,
            marginLeft: 0,
            paddingLeft: 0,
          }}
        >
          Here k ∈ {'{ 0, 1, 2, 3, 4 }'},{' '}
          <img
            src="/equations/G_k.svg"
            alt="G_k"
            style={inlineMathStyle}
          />{' '}
          is the geometric factor supplied by the k<sup>th</sup> closed form,{' '}
          <img
            src="/equations/phi_k.svg"
            alt="phi_k"
            style={inlineMathStyle}
          />{' '}
          is its continuous scalar coordinate,{' '}
          <img
            src="/equations/e_phi_k.svg"
            alt="e to the phi_k"
            style={inlineMathEPhiKStyle}
          />{' '}
          is the exponential image of that scalar, and{' '}
          <img
            src="/equations/n_k.svg"
            alt="n_k"
            style={inlineMathNKStyle}
          />{' '}
          ∈ Z is the discrete integer lattice value selected by the relation.
        </p>

        <div style={{ height: '2.0rem' }} />

        <p className="equation-description">
          The same pair ({' '}
          <img
            src="/equations/phi_k.svg"
            alt="phi_k"
            style={inlineMathStyle}
          />
          ,{' '}
          <img
            src="/equations/n_k.svg"
            alt="n_k"
            style={inlineMathNKStyle}
          />
          {' '}) is then used to locate the normalized Planck boundary in
          decimal scale. The continuous scalar{' '}
          <img
            src="/equations/phi_k.svg"
            alt="phi_k"
            style={inlineMathStyle}
          />{' '}
          becomes the significand, while the signed integer{' '}
          <img
            src="/equations/n_k.svg"
            alt="n_k"
            style={inlineMathNKStyle}
          />{' '}
          becomes the decimal exponent:
        </p>

        <div style={{ height: '2.0rem' }} />

        {/* General normalized-boundary relation */}
        <div
          style={{
            position: 'relative',
            width: `${RELATION_BLOCK_WIDTH}px`,
            maxWidth: '100%',
            margin: '0 auto',
            transform:
              `translateX(${RELATION_GROUP_X}px)`,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-start',
              transform:
                `translateX(${BOUNDARY_RELATION_X}px)`,
            }}
          >
            <img
              src="/equations/boundary_relation_equation.svg"
              alt="B_k equals phi_k times ten to the n_k times u_k"
              style={{
                width: 'auto',
                height: 'auto',
                display: 'block',
                transform:
                  `scale(${COMPACT_RELATION_SCALE})`,
                transformOrigin: 'left center',
              }}
            />
          </div>
        </div>

        <div style={{ height: '2.0rem' }} />

        <p
          className="equation-description"
          style={{
            textIndent: 0,
            marginLeft: 0,
            paddingLeft: 0,
          }}
        >
          Here{' '}
          <img
            src="/equations/B_k.svg"
            alt="B_k"
            style={inlineMathStyle}
          />{' '}
          is the k<sup>th</sup> Planck boundary and{' '}
          <img
            src="/equations/u_k.svg"
            alt="u_k"
            style={inlineMathUKStyle}
          />{' '}
          is the coherent base unit of the corresponding
          physical quantity. Thus, for the five Planck boundaries,
        </p>

        <div style={{ height: '1.50rem' }} />

        {/* Five normalized Planck boundaries */}
        <div
          style={{
            position: 'relative',
            width: `${RELATION_BLOCK_WIDTH}px`,
            maxWidth: '100%',
            margin: '0 auto',
            transform:
              `translateX(${RELATION_GROUP_X}px)`,
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                `${BOUNDARY_SYMBOL_COLUMN_WIDTH}px ` +
                `${BOUNDARY_SYMBOL_RHS_GAP}px ` +
                `${BOUNDARY_RHS_COLUMN_WIDTH}px ` +
                `${BOUNDARY_UNIT_COLUMN_WIDTH}px ` +
                `14px ${GEOMETRY_BUTTON_WIDTH}px`,
              width: '100%',
              maxWidth: '100%',
              alignItems: 'center',
              justifyContent: 'start',
              rowGap: `${BOUNDARY_ROW_GAP}rem`,
              columnGap: 0,
              margin: 0,
              overflow: 'visible',
            }}
          >
            {boundaryRelationRows.map((row) => {
              const stage =
                boundaryExpansionStates[row.key];

              const isExpanded = stage > 0;
              const showExpandedEquation =
                stage === 2;

              return (
                <div
                  key={row.key}
                  style={{
                    gridColumn: '1 / -1',
                    display: 'grid',
                    gridTemplateColumns:
                      `${BOUNDARY_SYMBOL_COLUMN_WIDTH}px ` +
                      `${BOUNDARY_SYMBOL_RHS_GAP}px ` +
                      `${BOUNDARY_RHS_COLUMN_WIDTH}px ` +
                      `${BOUNDARY_UNIT_COLUMN_WIDTH}px ` +
                      `14px ${GEOMETRY_BUTTON_WIDTH}px`,
                    alignItems: 'center',
                    columnGap: 0,
                    width: '100%',
                    overflow: 'visible',
                  }}
                >
                  {/* Fixed Planck-boundary symbol */}
                  <div
                    style={{
                      width:
                        `${BOUNDARY_SYMBOL_COLUMN_WIDTH}px`,
                      display: 'flex',
                      justifyContent: 'flex-end',
                      alignItems: 'center',
                      overflow: 'visible',
                      transform:
                        `translateX(${
                          isExpanded
                            ? (
                                BOUNDARY_EXPANDED_EQUATIONS_X +
                                row.expandedAnchorCorrectionX +
                                BOUNDARY_UNIT_GROUP_X
                              )
                            : BOUNDARY_COLLAPSED_EQUATIONS_X
                        }px)`,
                      transition:
                        'transform 320ms ease',
                    }}
                  >
                    <img
                      src={row.symbolSrc}
                      alt={row.symbolAlt}
                      style={{
                        height: row.symbolHeight,
                        width: 'auto',
                        maxWidth: 'none',
                        display: 'block',
                        flexShrink: 0,
                      }}
                    />
                  </div>

                  <div />

                  {/* Symbolic / numeric RHS.
                      "=" is the first glyph in every SVG,
                      so its left edge remains fixed. */}
                  <div
                    style={{
                      width:
                        `${BOUNDARY_RHS_COLUMN_WIDTH}px`,
                      display: 'flex',
                      justifyContent: 'flex-start',
                      alignItems: 'center',
                      overflow: 'visible',
                      transform:
                        `translateX(${
                          isExpanded
                            ? (
                                BOUNDARY_EXPANDED_EQUATIONS_X +
                                row.expandedAnchorCorrectionX +
                                BOUNDARY_UNIT_GROUP_X
                              )
                            : BOUNDARY_COLLAPSED_EQUATIONS_X
                        }px)`,
                      transition:
                        'transform 320ms ease',
                    }}
                  >
                    <img
                      key={
                        `boundary-rhs-${row.key}-${showExpandedEquation ? 'expanded' : 'compact'}`
                      }
                      src={
                        showExpandedEquation
                          ? row.expandedRhsSrc
                          : row.rhsSrc
                      }
                      alt={
                        showExpandedEquation
                          ? `Expanded normalized Planck ${row.label} relation`
                          : `Symbolic normalized Planck ${row.label} relation`
                      }
                      style={{
                        width: 'auto',
                        height: 'auto',
                        maxWidth: 'none',
                        display: 'block',
                        flexShrink: 0,
                        transform: showExpandedEquation
                          ? `translateY(${BOUNDARY_EXPANDED_RHS_Y}px) scale(${COMPACT_RELATION_SCALE})`
                          : `scale(${COMPACT_RELATION_SCALE})`,
                        transformOrigin:
                          'left center',
                        transition:
                          'opacity 220ms ease, transform 120ms ease',
                      }}
                    />
                  </div>

                  {/* Fixed coherent SI unit.
                      This does NOT receive the equation X translation,
                      so it remains stationary during expansion. */}
                  <div
                    style={{
                      width:
                        `${BOUNDARY_UNIT_COLUMN_WIDTH}px`,
                      display: 'flex',
                      justifyContent: 'flex-start',
                      alignItems: 'center',
                      overflow: 'visible',
                      transform:
                        `translateX(${
                          BOUNDARY_EQUATION_GROUP_X -
                          273.3115 +
                          BOUNDARY_UNIT_GROUP_X
                        }px) translateY(${
                          row.unitTranslateY +
                          BOUNDARY_UNIT_GROUP_Y
                        }px)`,
                    }}
                  >
                    <img
                      src={row.unitSrc}
                      alt={row.unitAlt}
                      style={{
                        width: 'auto',
                        height: 'auto',
                        maxWidth: 'none',
                        display: 'block',
                        flexShrink: 0,
                        transform:
                          `scale(${COMPACT_RELATION_SCALE})`,
                        transformOrigin:
                          'left center',
                      }}
                    />
                  </div>

                  <div />

                  {/* Independent boundary control */}
                  <button
                    type="button"
                    onClick={() =>
                      toggleBoundaryRow(row.key)
                    }
                    aria-expanded={isExpanded}
                    style={{
                      width:
                        `${GEOMETRY_BUTTON_WIDTH}px`,
                      height:
                        `${GEOMETRY_BUTTON_HEIGHT}px`,
                      boxSizing: 'border-box',
                      fontFamily:
                        "'Times New Roman', Times, serif",
                      fontSize: '0.82rem',
                      color:
                        'rgba(242, 237, 224, 0.40)',
                      border:
                        '1px solid rgba(214, 207, 188, 0.48)',
                      borderRadius: '7px',
                      background:
                        'rgba(22, 22, 18, 0.36)',
                      padding: '0 0.5rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transform:
                        `translateX(${BOUNDARY_BUTTONS_X}px) translateY(${BOUNDARY_EXPANDED_RHS_Y}px)`,
                    }}
                  >
                    {isExpanded
                      ? 'collapse'
                      : 'expand'}
                  </button>
                </div>
              );
            })}

            {/* Master boundary control */}
            <div
              style={{
                gridColumn: '6',
                justifySelf: 'start',
                marginTop: '0.15rem',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  if (allBoundariesExpanded) {
                    collapseAllBoundaries();
                  } else {
                    expandAllBoundaries();
                  }
                }}
                aria-expanded={
                  allBoundariesExpanded
                }
                style={{
                  width:
                    `${GEOMETRY_BUTTON_WIDTH}px`,
                  height:
                    `${GEOMETRY_BUTTON_HEIGHT}px`,
                  boxSizing: 'border-box',
                  fontFamily:
                    "'Times New Roman', Times, serif",
                  fontSize: '0.82rem',
                  color:
                    'rgba(242, 237, 224, 0.40)',
                  border:
                    '1px solid rgba(214, 207, 188, 0.48)',
                  borderRadius: '7px',
                  background:
                    'rgba(22, 22, 18, 0.36)',
                  padding: '0 0.5rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transform:
                    `translateX(${BOUNDARY_BUTTONS_X}px)`,
                }}
              >
                all
              </button>
            </div>
          </div>
        </div>

        <div style={{ height: '2.5rem' }} />

        <p className="equation-description">
          Together, these relations present the same five Planck boundaries
          in three complementary forms: as real
          and imaginary surfaces, as complex phase structure, and as exact closed-form coordinates. The
          geometric factors{' '}
          <img
            src="/equations/G_k.svg"
            alt="G_k"
            style={inlineMathStyle}
          />{' '}
          connect the continuous scalars{' '}
          <img
            src="/equations/phi_k.svg"
            alt="phi_k"
            style={inlineMathStyle}
          />{' '}
          to the discrete lattice values{' '}
          <img
            src="/equations/n_k.svg"
            alt="n_k"
            style={inlineMathNKStyle}
          />
          , while the same ({' '}
          <img
            src="/equations/phi_k.svg"
            alt="phi_k"
            style={inlineMathStyle}
          />
          ,{' '}
          <img
            src="/equations/n_k.svg"
            alt="n_k"
            style={inlineMathNKStyle}
          />
          {' '}) pairs locate the corresponding Planck boundaries on their
          physical decimal scales. In this way, the geometric and numerical
          descriptions are two representations of the same boundary
          structure.
        </p>

        <div style={{ height: '16rem' }} />
      </div>


      {/* Image Modal */}
      {modalImage && (
        <div
          onClick={() => setModalImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
          }}
        >
          <img
            src={modalImage}
            alt="Full size"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              borderRadius: '0.5rem',
              boxShadow: '0 0 24px black',
            }}
          />
        </div>
      )}

      {/* Video Modal */}
{modalVideo && (
  <div
    onClick={() => setModalVideo(null)}
    style={{
      position: 'fixed',
      inset: 0,
      paddingLeft: '180px',
      backgroundColor: 'rgba(0,0,0,0.85)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'relative',
        width: 'calc(100vw - 240px)',
        maxWidth: '960px',
        aspectRatio: '16/9',
        borderRadius: '0.5rem',
        overflow: 'hidden',
        boxShadow: '0 0 24px black',
        backgroundColor: '#000',
      }}
    >
      <video
        src={`/videos/${modalVideo}`}
        controls
        autoPlay
        playsInline
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  </div>
)}




    </LayoutWrapper>
  );
}
