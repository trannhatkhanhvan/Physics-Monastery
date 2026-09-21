"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import styles from "./G288Viewer.module.css";
import katex from "katex";
import { createPortal } from "react-dom";

import {
  formatExact,
} from "./math/quaternion.mjs";

import {
  G288,
  composeG288,
  g288ElementOrder,
} from "./math/group288.mjs";

import {
  matrix2ForG288,
} from "./math/matrices4d.mjs";

import {
  G288_SPECTRAL_RECORDS,
  powerG288,
} from "./math/spectralClassification.mjs";

import {
  isK32Element,
} from "./math/subgroups.mjs";

import {
  cosetContaining,
  quotientCoordinates,
} from "./math/quotientC3xC3.mjs";

import {
  TETRAHEDRON_EDGE_FEATURES,
  TETRAHEDRON_OPPOSITE_EDGE_PAIR_FEATURES,
  TETRAHEDRON_VERTEX_FEATURES,
  edgeFeatureKey,
  oppositeEdgePairFeatureKey,
  tetrahedralActionForG288,
  vertexFeatureKey,
} from "./math/tetrahedralActions.mjs";

import {
  PAIRED_EDGE_DATA,
  PAIRED_OPPOSITE_EDGE_DATA,
  PAIRED_VERTEX_DATA,
  QUOTIENT_TO_PAIRED_OPPOSITE_EDGE,
  actOnPairedEdge,
  actOnPairedOppositeEdgePair,
  actOnPairedVertex,
  pairedEdgeKey,
  pairedOppositeEdgePairKey,
  pairedVertexKey,
} from "./math/pairedTetrahedralActions.mjs";


const SPECTRAL_BY_KEY =
  new Map(
    G288_SPECTRAL_RECORDS.map(
      (record) => [
        record.element.key,
        record,
      ]
    )
  );



function gcdInteger(
  left,
  right
) {
  let a = Math.abs(left);
  let b = Math.abs(right);

  while (b !== 0) {
    const next = a % b;
    a = b;
    b = next;
  }

  return a;
}


const G288_INDEX_BY_KEY =
  new Map(
    G288.map(
      (element, index) => [
        element.key,
        index,
      ]
    )
  );


const G288_CONJUGACY_CLASS_DATA =
  (() => {
    const assignedKeys =
      new Set();

    const classes = [];

    const classIndexByElementKey =
      new Map();


    for (
      let representativeIndex = 0;
      representativeIndex < G288.length;
      representativeIndex += 1
    ) {
      const representative =
        G288[
          representativeIndex
        ];


      if (
        assignedKeys.has(
          representative.key
        )
      ) {
        continue;
      }


      const conjugateKeys =
        new Set();


      for (
        const conjugator of G288
      ) {
        const conjugatorOrder =
          g288ElementOrder(
            conjugator
          );

        const inverse =
          powerG288(
            conjugator,
            conjugatorOrder - 1
          );

        const conjugate =
          composeG288(
            composeG288(
              conjugator,
              representative
            ),
            inverse
          );

        conjugateKeys.add(
          conjugate.key
        );
      }


      const memberIndices =
        [...conjugateKeys]
          .map(
            (key) => {
              const index =
                G288_INDEX_BY_KEY.get(
                  key
                );

              if (
                index === undefined
              ) {
                throw new Error(
                  "Conjugacy census produced an element outside G288."
                );
              }

              return index;
            }
          )
          .sort(
            (left, right) =>
              left - right
          );


      const classIndex =
        classes.length;


      for (
        const memberIndex of
        memberIndices
      ) {
        const key =
          G288[
            memberIndex
          ].key;

        assignedKeys.add(
          key
        );

        classIndexByElementKey.set(
          key,
          classIndex
        );
      }


      const spectral =
        SPECTRAL_BY_KEY.get(
          representative.key
        );

      if (!spectral) {
        throw new Error(
          "Conjugacy census representative has no spectral record."
        );
      }


      const classSize =
        memberIndices.length;

      if (
        288 % classSize !== 0
      ) {
        throw new Error(
          "Conjugacy class size does not divide 288."
        );
      }


      classes.push(
        Object.freeze({
          index:
            classIndex,

          representative,

          representativeIndex,

          memberIndices:
            Object.freeze(
              memberIndices
            ),

          classSize,

          centralizerSize:
            288 / classSize,

          order:
            g288ElementOrder(
              representative
            ),

          spectral,

          tetrahedral:
            tetrahedralActionForG288(
              representative
            ),
        })
      );
    }


    const total =
      classes.reduce(
        (
          sum,
          conjugacyClass
        ) =>
          sum +
          conjugacyClass.classSize,
        0
      );


    if (
      classes.length !== 25
    ) {
      throw new Error(
        "Conjugacy census failed: " +
        `expected 25 classes, found ${classes.length}.`
      );
    }


    if (
      total !== 288 ||
      assignedKeys.size !== 288 ||
      classIndexByElementKey.size !== 288
    ) {
      throw new Error(
        "Conjugacy census failed to partition all 288 elements."
      );
    }


    return Object.freeze({
      classes:
        Object.freeze(
          classes
        ),

      classIndexByElementKey,

      total,
    });
  })();


const G288_CONJUGACY_SPECTRAL_DATA =
  (() => {
    const familyByPolynomial =
      new Map();

    const families = [];

    const classIndexToFamilyIndex =
      new Map();


    for (
      const conjugacyClass of
      G288_CONJUGACY_CLASS_DATA.classes
    ) {
      const polynomialText =
        conjugacyClass
          .spectral
          .characteristicPolynomialText;

      let family =
        familyByPolynomial.get(
          polynomialText
        );


      if (!family) {
        family = {
          index:
            families.length,

          polynomialText,

          classIndices: [],

          elementCount: 0,
        };

        families.push(
          family
        );

        familyByPolynomial.set(
          polynomialText,
          family
        );
      }


      family.classIndices.push(
        conjugacyClass.index
      );

      family.elementCount +=
        conjugacyClass.classSize;

      classIndexToFamilyIndex.set(
        conjugacyClass.index,
        family.index
      );
    }


    if (
      families.length !== 9
    ) {
      throw new Error(
        "Conjugacy spectral-family census failed: " +
        `expected 9 families, found ${families.length}.`
      );
    }


    const classCount =
      families.reduce(
        (
          sum,
          family
        ) =>
          sum +
          family.classIndices.length,
        0
      );


    const elementCount =
      families.reduce(
        (
          sum,
          family
        ) =>
          sum +
          family.elementCount,
        0
      );


    if (
      classCount !== 25 ||
      elementCount !== 288 ||
      classIndexToFamilyIndex.size !== 25
    ) {
      throw new Error(
        "Conjugacy spectral-family census failed to " +
        "partition the 25 classes and 288 elements."
      );
    }


    return Object.freeze({
      families:
        Object.freeze(
          families.map(
            (family) =>
              Object.freeze({
                ...family,

                classIndices:
                  Object.freeze(
                    [...family.classIndices]
                  ),
              })
          )
        ),

      classIndexToFamilyIndex,
    });
  })();


function cyclicSubgroupKey(
  generator
) {
  const order =
    g288ElementOrder(
      generator
    );

  return (
    Array.from(
      {
        length: order,
      },
      (_, exponent) =>
        powerG288(
          generator,
          exponent
        ).key
    )
      .sort()
      .join("||")
  );
}


const C12_SUBGROUPS =
  (() => {
    const byKey =
      new Map();

    G288.forEach(
      (
        element,
        elementIndex
      ) => {
        if (
          g288ElementOrder(
            element
          ) !== 12
        ) {
          return;
        }

        const subgroupKey =
          cyclicSubgroupKey(
            element
          );

        if (
          !byKey.has(
            subgroupKey
          )
        ) {
          const powers =
            Array.from(
              {
                length: 12,
              },
              (_, exponent) =>
                powerG288(
                  element,
                  exponent
                )
            );

          const elementIndices =
            powers.map(
              (power) => {
                const index =
                  G288_INDEX_BY_KEY.get(
                    power.key
                  );

                if (
                  index === undefined
                ) {
                  throw new Error(
                    "C12 census produced an element outside G288."
                  );
                }

                return index;
              }
            );

          const primitiveGeneratorIndices =
            elementIndices.filter(
              (
                index,
                exponent
              ) =>
                gcdInteger(
                  exponent,
                  12
                ) === 1
            );

          byKey.set(
            subgroupKey,
            Object.freeze({
              key: subgroupKey,

              elementIndices:
                Object.freeze(
                  elementIndices
                ),

              primitiveGeneratorIndices:
                Object.freeze(
                  primitiveGeneratorIndices
                ),
            })
          );
        }
      }
    );


    const groups =
      [...byKey.values()];


    if (
      groups.length !== 24
    ) {
      throw new Error(
        "C12 census failed: " +
        `expected 24 subgroups, found ${groups.length}.`
      );
    }


    for (
      const subgroup of groups
    ) {
      if (
        subgroup.elementIndices.length !==
        12
      ) {
        throw new Error(
          "C12 subgroup does not contain 12 powers."
        );
      }

      if (
        subgroup.primitiveGeneratorIndices.length !==
        4
      ) {
        throw new Error(
          "C12 subgroup does not have exactly four primitive generators."
        );
      }
    }


    return Object.freeze(
      groups
    );
  })();


const C12_SUBGROUP_INDEX_BY_ELEMENT_KEY =
  (() => {
    const map =
      new Map();

    C12_SUBGROUPS.forEach(
      (
        subgroup,
        subgroupIndex
      ) => {
        subgroup
          .primitiveGeneratorIndices
          .forEach(
            (elementIndex) => {
              map.set(
                G288[
                  elementIndex
                ].key,
                subgroupIndex
              );
            }
          );
      }
    );

    if (
      map.size !== 96
    ) {
      throw new Error(
        "C12 primitive-generator census failed: " +
        `expected 96 elements, found ${map.size}.`
      );
    }

    return map;
  })();


/*
 * ============================================================
 * Exact K32 internal structure
 * ============================================================
 *
 * We derive this directly from the already authoritative
 * G288 + isK32Element machinery.
 *
 * Expected exact decomposition:
 *
 *   32 = 2 + 18 + 12
 *
 *   18 = 9 x 2
 *   12 = 6 x 2
 */


function q8FactorDescriptor(
  quaternion
) {
  const coordinates = [
    Number(quaternion.A),
    Number(quaternion.B),
    Number(quaternion.C),
    Number(quaternion.D),
  ];

  const [
    A,
    B,
    C,
    D,
  ] = coordinates;


  if (
    Math.abs(A) === 2 &&
    B === 0 &&
    C === 0 &&
    D === 0
  ) {
    return Object.freeze({
      kind: "scalar",
      sign:
        Math.sign(A),
    });
  }


  if (
    A === 0
  ) {
    const imaginary = [
      B,
      C,
      D,
    ];

    const nonzero =
      imaginary
        .map(
          (
            value,
            index
          ) => ({
            value,
            index,
          })
        )
        .filter(
          ({ value }) =>
            value !== 0
        );

    if (
      nonzero.length === 1 &&
      Math.abs(
        nonzero[0].value
      ) === 2
    ) {
      const axis =
        ["i", "j", "k"][
          nonzero[0].index
        ];

      return Object.freeze({
        kind: "axis",
        axis,
        sign:
          Math.sign(
            nonzero[0].value
          ),
      });
    }
  }


  throw new Error(
    "K32 classification encountered a factor outside Q8: " +
    coordinates.join(",")
  );
}


function isTetrahedrallyCentral(
  element
) {
  const action =
    tetrahedralActionForG288(
      element
    );

  return (
    permutationIsIdentity(
      action.left
    ) &&
    permutationIsIdentity(
      action.right
    )
  );
}


const K32_CORE_DATA =
  (() => {
    const records =
      G288
        .map(
          (
            element,
            elementIndex
          ) => ({
            element,
            elementIndex,
          })
        )
        .filter(
          ({ element }) =>
            isK32Element(
              element
            )
        );


    if (
      records.length !== 32
    ) {
      throw new Error(
        "K32 core census failed: " +
        `expected 32 elements, found ${records.length}.`
      );
    }


    const center = [];

    const complexByDirection =
      new Map();

    const couplingByDirection =
      new Map();


    for (
      const record of records
    ) {
      const {
        element,
      } = record;

      const order =
        g288ElementOrder(
          element
        );

      const left =
        q8FactorDescriptor(
          element.a
        );

      const right =
        q8FactorDescriptor(
          element.b
        );


      /*
       * The two elements invisible in both tetrahedral factors
       * are exactly I and -I.
       */
      if (
        isTetrahedrallyCentral(
          element
        )
      ) {
        center.push(
          Object.freeze({
            ...record,

            label:
              order === 1
                ? "I"
                : "−I",
          })
        );

        continue;
      }


      /*
       * Pure left/right quarter-turn structures:
       *
       *   L_i, L_j, L_k,
       *   R_i, R_j, R_k.
       *
       * Each projective direction contains the two opposite
       * orientations J and J^{-1}.
       */
      if (order === 4) {
        let direction = null;

        if (
          left.kind === "axis" &&
          right.kind === "scalar"
        ) {
          direction =
            `L_${left.axis}`;
        } else if (
          left.kind === "scalar" &&
          right.kind === "axis"
        ) {
          direction =
            `R_${right.axis}`;
        } else {
          throw new Error(
            "Order-4 K32 element is not a pure left/right complex structure."
          );
        }


        if (
          !complexByDirection.has(
            direction
          )
        ) {
          complexByDirection.set(
            direction,
            []
          );
        }

        complexByDirection
          .get(direction)
          .push(
            Object.freeze(record)
          );

        continue;
      }


      /*
       * Noncentral involutions are simultaneous left-right
       * Q8 axis couplings.
       */
      if (
        order === 2 &&
        left.kind === "axis" &&
        right.kind === "axis"
      ) {
        const direction =
          `${left.axis}:${right.axis}`;

        if (
          !couplingByDirection.has(
            direction
          )
        ) {
          couplingByDirection.set(
            direction,
            []
          );
        }

        couplingByDirection
          .get(direction)
          .push(
            Object.freeze(record)
          );

        continue;
      }


      throw new Error(
        "Unclassified exact K32 element encountered."
      );
    }


    const complexDirections =
      [
        "L_i",
        "L_j",
        "L_k",
        "R_i",
        "R_j",
        "R_k",
      ].map(
        (direction) => {
          const elements =
            complexByDirection.get(
              direction
            ) ?? [];

          if (
            elements.length !== 2
          ) {
            throw new Error(
              `K32 complex direction ${direction} ` +
              `has ${elements.length} elements instead of 2.`
            );
          }

          return Object.freeze({
            direction,
            elements:
              Object.freeze(
                [...elements]
              ),
          });
        }
      );


    const couplingDirections =
      ["i", "j", "k"]
        .flatMap(
          (leftAxis) =>
            ["i", "j", "k"]
              .map(
                (rightAxis) => {
                  const direction =
                    `${leftAxis}:${rightAxis}`;

                  const elements =
                    couplingByDirection.get(
                      direction
                    ) ?? [];

                  if (
                    elements.length !== 2
                  ) {
                    throw new Error(
                      `K32 coupling ${direction} ` +
                      `has ${elements.length} elements instead of 2.`
                    );
                  }

                  return Object.freeze({
                    leftAxis,
                    rightAxis,

                    elements:
                      Object.freeze(
                        [...elements]
                      ),
                  });
                }
              )
        );


    const complexCount =
      complexDirections.reduce(
        (
          sum,
          direction
        ) =>
          sum +
          direction.elements.length,
        0
      );

    const couplingCount =
      couplingDirections.reduce(
        (
          sum,
          direction
        ) =>
          sum +
          direction.elements.length,
        0
      );


    if (
      center.length !== 2 ||
      couplingCount !== 18 ||
      complexCount !== 12
    ) {
      throw new Error(
        "K32 decomposition failed: " +
        `center=${center.length}, ` +
        `couplings=${couplingCount}, ` +
        `complex=${complexCount}.`
      );
    }


    return Object.freeze({
      center:
        Object.freeze(
          [...center]
        ),

      complexDirections:
        Object.freeze(
          complexDirections
        ),

      couplingDirections:
        Object.freeze(
          couplingDirections
        ),

      counts:
        Object.freeze({
          center: 2,
          couplings: 18,
          complex: 12,
          complexDirections: 6,
          couplingDirections: 9,
        }),
    });
  })();


const K32_PROJECTIVE_DATA =
  (() => {
    const couplingDirections =
      K32_CORE_DATA
        .couplingDirections
        .map(
          (
            direction,
            index
          ) =>
            Object.freeze({
              id:
                `C-${direction.leftAxis}-${direction.rightAxis}`,

              type:
                "coupling",

              projectiveIndex:
                index,

              leftAxis:
                direction.leftAxis,

              rightAxis:
                direction.rightAxis,

              label:
                `L_${direction.leftAxis}R_${direction.rightAxis}`,

              elements:
                direction.elements,
            })
        );


    const complexDirections =
      K32_CORE_DATA
        .complexDirections
        .map(
          (
            direction,
            index
          ) =>
            Object.freeze({
              id:
                `J-${direction.direction}`,

              type:
                "complex",

              projectiveIndex:
                couplingDirections.length +
                index,

              label:
                direction.direction,

              elements:
                direction.elements,
            })
        );


    const points =
      Object.freeze([
        ...couplingDirections,
        ...complexDirections,
      ]);


    if (
      couplingDirections.length !== 9 ||
      complexDirections.length !== 6 ||
      points.length !== 15
    ) {
      throw new Error(
        "K32 projective collapse failed: " +
        `expected 9 + 6 = 15, found ` +
        `${couplingDirections.length} + ` +
        `${complexDirections.length} = ` +
        `${points.length}.`
      );
    }


    for (
      const point of points
    ) {
      if (
        point.elements.length !== 2
      ) {
        throw new Error(
          "K32 projective point does not contain exactly " +
          "two opposite orientations."
        );
      }
    }


    return Object.freeze({
      zero:
        K32_CORE_DATA.center,

      couplingDirections:
        Object.freeze(
          couplingDirections
        ),

      complexDirections:
        Object.freeze(
          complexDirections
        ),

      points,
    });
  })();


/*
 * ============================================================
 * Exact projective incidence structure of K32
 * ============================================================
 *
 * A projective point is one central-sign pair {g, -g}.
 *
 * Two projective points are collinear exactly when their
 * representatives commute; for a commuting pair p,q the
 * projective class of pq is the third point on the line.
 *
 * Nothing below hard-codes W(3,2).  We derive the triples and
 * then assert the generalized-quadrangle counts.
 */


const K32_PROJECTIVE_DIRECTION_BY_ELEMENT_KEY =
  (() => {
    const map =
      new Map();

    for (
      const direction of
      K32_PROJECTIVE_DATA.points
    ) {
      for (
        const record of
        direction.elements
      ) {
        map.set(
          record.element.key,
          direction
        );
      }
    }


    if (
      map.size !== 30
    ) {
      throw new Error(
        "Projective direction map failed: " +
        `expected 30 noncentral K32 elements, found ${map.size}.`
      );
    }


    return map;
  })();


function projectiveDirectionsCommute(
  leftDirection,
  rightDirection
) {
  const left =
    leftDirection.elements[0]
      .element;

  const right =
    rightDirection.elements[0]
      .element;

  return (
    composeG288(
      left,
      right
    ).key ===
    composeG288(
      right,
      left
    ).key
  );
}


const K32_DOILY_DATA =
  (() => {
    const points =
      K32_PROJECTIVE_DATA.points;

    const pointById =
      new Map(
        points.map(
          (point) => [
            point.id,
            point,
          ]
        )
      );

    const lineByKey =
      new Map();


    for (
      let leftIndex = 0;
      leftIndex < points.length;
      leftIndex += 1
    ) {
      for (
        let rightIndex =
          leftIndex + 1;

        rightIndex < points.length;
        rightIndex += 1
      ) {
        const left =
          points[leftIndex];

        const right =
          points[rightIndex];


        if (
          !projectiveDirectionsCommute(
            left,
            right
          )
        ) {
          continue;
        }


        const product =
          composeG288(
            left.elements[0].element,
            right.elements[0].element
          );


        const third =
          K32_PROJECTIVE_DIRECTION_BY_ELEMENT_KEY
            .get(
              product.key
            );


        if (!third) {
          throw new Error(
            "Commuting K32 directions produced a product " +
            "outside the 15 nonzero projective directions."
          );
        }


        if (
          third.id === left.id ||
          third.id === right.id
        ) {
          throw new Error(
            "Degenerate projective incidence triple encountered."
          );
        }


        const ids =
          [
            left.id,
            right.id,
            third.id,
          ].sort();

        const lineKey =
          ids.join("::");


        if (
          !lineByKey.has(
            lineKey
          )
        ) {
          lineByKey.set(
            lineKey,
            Object.freeze({
              key:
                lineKey,

              pointIds:
                Object.freeze(
                  ids
                ),
            })
          );
        }
      }
    }


    const lines =
      [...lineByKey.values()]
        .sort(
          (left, right) =>
            left.key.localeCompare(
              right.key
            )
        )
        .map(
          (
            line,
            index
          ) =>
            Object.freeze({
              ...line,
              index,
            })
        );


    if (
      lines.length !== 15
    ) {
      throw new Error(
        "Doily incidence derivation failed: " +
        `expected 15 lines, found ${lines.length}.`
      );
    }


    const lineIndicesByPointId =
      new Map(
        points.map(
          (point) => [
            point.id,
            [],
          ]
        )
      );


    for (
      const line of lines
    ) {
      if (
        line.pointIds.length !== 3
      ) {
        throw new Error(
          "Derived projective line does not contain 3 points."
        );
      }


      for (
        const pointId of
        line.pointIds
      ) {
        const incidences =
          lineIndicesByPointId.get(
            pointId
          );

        if (!incidences) {
          throw new Error(
            "Derived line references an unknown projective point."
          );
        }

        incidences.push(
          line.index
        );
      }
    }


    for (
      const [
        pointId,
        lineIndices,
      ] of
      lineIndicesByPointId
    ) {
      if (
        lineIndices.length !== 3
      ) {
        throw new Error(
          `Projective point ${pointId} lies on ` +
          `${lineIndices.length} lines instead of 3.`
        );
      }
    }


    /*
     * A point in W(3,2) is collinear with six other points:
     * three lines through the point, two other points per line.
     */
    for (
      const point of points
    ) {
      const neighbors =
        new Set();

      for (
        const lineIndex of
        lineIndicesByPointId.get(
          point.id
        )
      ) {
        for (
          const pointId of
          lines[lineIndex]
            .pointIds
        ) {
          if (
            pointId !== point.id
          ) {
            neighbors.add(
              pointId
            );
          }
        }
      }


      if (
        neighbors.size !== 6
      ) {
        throw new Error(
          `Projective point ${point.id} has ` +
          `${neighbors.size} collinear neighbors instead of 6.`
        );
      }
    }


    return Object.freeze({
      points,

      pointById,

      lines:
        Object.freeze(
          lines
        ),

      lineIndicesByPointId,
    });
  })();


/*
 * ============================================================
 * Canonical fivefold doily presentation
 * ============================================================
 *
 * The incidence structure above remains authoritative.
 *
 * This layer chooses a deterministic 5-point ovoid and uses
 * it to coordinatize the same 15 projective points in the
 * familiar fivefold doily presentation.
 */


function doilyPointsCollinear(
  leftPointId,
  rightPointId
) {
  return K32_DOILY_DATA.lines.some(
    (line) =>
      line.pointIds.includes(
        leftPointId
      ) &&
      line.pointIds.includes(
        rightPointId
      )
  );
}


const K32_STANDARD_DOILY_LAYOUT =
  (() => {
    const points =
      K32_DOILY_DATA.points;

    let ovoid = null;


    function searchOvoid(
      chosen,
      startIndex
    ) {
      if (chosen.length === 5) {
        const chosenIds =
          new Set(
            chosen.map(
              (point) =>
                point.id
            )
          );

        const meetsEveryLineOnce =
          K32_DOILY_DATA.lines.every(
            (line) =>
              line.pointIds.filter(
                (pointId) =>
                  chosenIds.has(
                    pointId
                  )
              ).length === 1
          );

        if (meetsEveryLineOnce) {
          ovoid =
            Object.freeze(
              [...chosen]
            );

          return true;
        }

        return false;
      }


      for (
        let index = startIndex;
        index < points.length;
        index += 1
      ) {
        const candidate =
          points[index];

        const noncollinearWithChosen =
          chosen.every(
            (point) =>
              !doilyPointsCollinear(
                point.id,
                candidate.id
              )
          );

        if (!noncollinearWithChosen) {
          continue;
        }

        if (
          searchOvoid(
            [
              ...chosen,
              candidate,
            ],
            index + 1
          )
        ) {
          return true;
        }
      }

      return false;
    }


    if (
      !searchOvoid(
        [],
        0
      )
    ) {
      throw new Error(
        "Standard doily layout failed to find a 5-point ovoid."
      );
    }


    const templateNameToPoint =
      new Map();

    const pointIdToTemplateName =
      new Map();


    /*
     * E0 ... E4 are the selected ovoid.
     */
    ovoid.forEach(
      (
        point,
        index
      ) => {
        const name =
          `E${index}`;

        templateNameToPoint.set(
          name,
          point
        );

        pointIdToTemplateName.set(
          point.id,
          name
        );
      }
    );


    /*
     * Every point outside an ovoid is collinear with exactly
     * three ovoid points and noncollinear with exactly two.
     *
     * Those missing pairs uniquely identify the remaining
     * ten positions in the fivefold doily template.
     */
    const templateNameByMissingOvoidPair =
      new Map([
        ["1,3", "O0"],
        ["2,4", "O1"],
        ["0,3", "O2"],
        ["1,4", "O3"],
        ["0,2", "O4"],

        ["0,4", "I0"],
        ["0,1", "I1"],
        ["1,2", "I2"],
        ["2,3", "I3"],
        ["3,4", "I4"],
      ]);


    for (
      const point of points
    ) {
      if (
        pointIdToTemplateName.has(
          point.id
        )
      ) {
        continue;
      }


      const missingIndices =
        ovoid
          .map(
            (
              ovoidPoint,
              index
            ) => ({
              index,

              collinear:
                doilyPointsCollinear(
                  point.id,
                  ovoidPoint.id
                ),
            })
          )
          .filter(
            ({ collinear }) =>
              !collinear
          )
          .map(
            ({ index }) =>
              index
          );


      if (
        missingIndices.length !== 2
      ) {
        throw new Error(
          "Standard doily coordinatization expected every " +
          "non-ovoid point to miss exactly two ovoid points."
        );
      }


      const pairKey =
        missingIndices
          .sort(
            (
              left,
              right
            ) =>
              left - right
          )
          .join(",");


      const templateName =
        templateNameByMissingOvoidPair.get(
          pairKey
        );


      if (!templateName) {
        throw new Error(
          `No standard doily position for ovoid pair ${pairKey}.`
        );
      }


      templateNameToPoint.set(
        templateName,
        point
      );

      pointIdToTemplateName.set(
        point.id,
        templateName
      );
    }


    if (
      templateNameToPoint.size !== 15 ||
      pointIdToTemplateName.size !== 15
    ) {
      throw new Error(
        "Standard doily coordinatization did not assign all 15 points."
      );
    }


    const exactLineByPointSet =
      new Map(
        K32_DOILY_DATA.lines.map(
          (line) => [
            [...line.pointIds]
              .sort()
              .join("::"),

            line,
          ]
        )
      );


    function exactLineForTemplateNames(
      names
    ) {
      const pointIds =
        names.map(
          (name) => {
            const point =
              templateNameToPoint.get(
                name
              );

            if (!point) {
              throw new Error(
                `Missing standard doily point ${name}.`
              );
            }

            return point.id;
          }
        );


      const key =
        [...pointIds]
          .sort()
          .join("::");


      const exactLine =
        exactLineByPointSet.get(
          key
        );


      if (!exactLine) {
        throw new Error(
          "Standard doily template produced a triple " +
          "that is not an exact K32 line: " +
          names.join(", ")
        );
      }


      return exactLine;
    }


    const lineLayouts = [];


    /*
     * Five outer pentagon edges.
     */
    for (
      let index = 0;
      index < 5;
      index += 1
    ) {
      const names = [
        `O${index}`,
        `E${index}`,
        `O${(index + 1) % 5}`,
      ];

      lineLayouts.push(
        Object.freeze({
          type:
            "edge",

          names:
            Object.freeze(
              names
            ),

          line:
            exactLineForTemplateNames(
              names
            ),
        })
      );
    }


    /*
     * Five straight interior lines.
     */
    for (
      let index = 0;
      index < 5;
      index += 1
    ) {
      const names = [
        `O${index}`,
        `I${index}`,
        `E${(index + 2) % 5}`,
      ];

      lineLayouts.push(
        Object.freeze({
          type:
            "spoke",

          names:
            Object.freeze(
              names
            ),

          line:
            exactLineForTemplateNames(
              names
            ),
        })
      );
    }


    /*
     * Five curved doily lines.
     */
    for (
      let index = 0;
      index < 5;
      index += 1
    ) {
      const names = [
        `I${(index + 4) % 5}`,
        `E${index}`,
        `I${(index + 2) % 5}`,
      ];

      lineLayouts.push(
        Object.freeze({
          type:
            "arc",

          names:
            Object.freeze(
              names
            ),

          line:
            exactLineForTemplateNames(
              names
            ),
        })
      );
    }


    const exactLineIndices =
      new Set(
        lineLayouts.map(
          ({ line }) =>
            line.index
        )
      );


    if (
      lineLayouts.length !== 15 ||
      exactLineIndices.size !== 15
    ) {
      throw new Error(
        "Standard doily layout does not cover all 15 " +
        "exact lines exactly once."
      );
    }


    return Object.freeze({
      ovoid,

      templateNameToPoint,

      pointIdToTemplateName,

      lineLayouts:
        Object.freeze(
          lineLayouts
        ),
    });
  })();


/*
 * ============================================================
 * Exact ovoids of W(3,2)
 * ============================================================
 *
 * An ovoid is a five-point subset meeting every one of the
 * 15 doily lines in exactly one point.
 *
 * We search the actual derived incidence geometry rather than
 * inserting the known answer.
 */


const K32_DOILY_OVOIDS =
  (() => {
    const points =
      K32_DOILY_DATA.points;

    const ovoids = [];


    function testCombination(
      indices
    ) {
      const pointIds =
        indices.map(
          (index) =>
            points[index].id
        );

      const pointIdSet =
        new Set(
          pointIds
        );


      const meetsEveryLineOnce =
        K32_DOILY_DATA.lines.every(
          (line) =>
            line.pointIds.filter(
              (pointId) =>
                pointIdSet.has(
                  pointId
                )
            ).length === 1
        );


      if (!meetsEveryLineOnce) {
        return;
      }


      ovoids.push(
        Object.freeze({
          index:
            ovoids.length,

          pointIds:
            Object.freeze(
              pointIds
            ),

          pointIdSet,

          points:
            Object.freeze(
              indices.map(
                (index) =>
                  points[index]
              )
            ),
        })
      );
    }


    for (
      let a = 0;
      a < points.length - 4;
      a += 1
    ) {
      for (
        let b = a + 1;
        b < points.length - 3;
        b += 1
      ) {
        for (
          let d = b + 1;
          d < points.length - 2;
          d += 1
        ) {
          for (
            let e = d + 1;
            e < points.length - 1;
            e += 1
          ) {
            for (
              let f = e + 1;
              f < points.length;
              f += 1
            ) {
              testCombination([
                a,
                b,
                d,
                e,
                f,
              ]);
            }
          }
        }
      }
    }


    if (
      ovoids.length !== 6
    ) {
      throw new Error(
        "Doily ovoid derivation failed: " +
        `expected 6 ovoids, found ${ovoids.length}.`
      );
    }


    for (
      const ovoid of ovoids
    ) {
      if (
        ovoid.points.length !== 5
      ) {
        throw new Error(
          "Derived doily ovoid does not contain 5 points."
        );
      }


      for (
        let leftIndex = 0;
        leftIndex < ovoid.points.length;
        leftIndex += 1
      ) {
        for (
          let rightIndex =
            leftIndex + 1;

          rightIndex < ovoid.points.length;
          rightIndex += 1
        ) {
          if (
            doilyPointsCollinear(
              ovoid.points[leftIndex].id,
              ovoid.points[rightIndex].id
            )
          ) {
            throw new Error(
              "Derived doily ovoid contains a collinear pair."
            );
          }
        }
      }
    }


    return Object.freeze(
      ovoids
    );
  })();


/*
 * ============================================================
 * Exact automorphisms from the six doily ovoids
 * ============================================================
 *
 * Every doily point lies in exactly two of the six ovoids.
 * Hence the 15 points are canonically identified with the
 * 15 unordered pairs of six ovoid labels.
 *
 * We generate all 6! permutations of the ovoids, induce their
 * action on the 15 points, and retain only those preserving
 * the exact derived line set.
 */


function permutationList(
  values
) {
  if (
    values.length <= 1
  ) {
    return [
      [...values],
    ];
  }


  const result = [];


  for (
    let index = 0;
    index < values.length;
    index += 1
  ) {
    const head =
      values[index];

    const rest = [
      ...values.slice(
        0,
        index
      ),

      ...values.slice(
        index + 1
      ),
    ];


    for (
      const tail of
      permutationList(
        rest
      )
    ) {
      result.push([
        head,
        ...tail,
      ]);
    }
  }


  return result;
}


function ovoidPairKey(
  left,
  right
) {
  return [
    left,
    right,
  ]
    .sort(
      (
        a,
        b
      ) =>
        a - b
    )
    .join(":");
}


const K32_DOILY_AUTOMORPHISM_DATA =
  (() => {
    const membershipsByPointId =
      new Map();


    for (
      const point of
      K32_DOILY_DATA.points
    ) {
      const memberships =
        K32_DOILY_OVOIDS
          .filter(
            (ovoid) =>
              ovoid.pointIdSet.has(
                point.id
              )
          )
          .map(
            (ovoid) =>
              ovoid.index
          );


      if (
        memberships.length !== 2
      ) {
        throw new Error(
          `Doily point ${point.id} belongs to ` +
          `${memberships.length} ovoids instead of 2.`
        );
      }


      membershipsByPointId.set(
        point.id,
        Object.freeze(
          memberships
        )
      );
    }


    const pointByOvoidPairKey =
      new Map();


    for (
      const point of
      K32_DOILY_DATA.points
    ) {
      const [
        left,
        right,
      ] =
        membershipsByPointId.get(
          point.id
        );

      const key =
        ovoidPairKey(
          left,
          right
        );


      if (
        pointByOvoidPairKey.has(
          key
        )
      ) {
        throw new Error(
          `Duplicate doily point for ovoid pair ${key}.`
        );
      }


      pointByOvoidPairKey.set(
        key,
        point
      );
    }


    if (
      pointByOvoidPairKey.size !== 15
    ) {
      throw new Error(
        "Ovoid-pair coordinatization failed: " +
        `expected 15 pairs, found ${pointByOvoidPairKey.size}.`
      );
    }


    const exactLineKeys =
      new Set(
        K32_DOILY_DATA.lines.map(
          (line) =>
            [...line.pointIds]
              .sort()
              .join("::")
        )
      );


    const sixPermutations =
      permutationList([
        0,
        1,
        2,
        3,
        4,
        5,
      ]);


    if (
      sixPermutations.length !== 720
    ) {
      throw new Error(
        "S6 permutation generation failed: " +
        `expected 720, found ${sixPermutations.length}.`
      );
    }


    const automorphisms = [];


    for (
      const permutation of
      sixPermutations
    ) {
      const pointImageById =
        new Map();


      for (
        const point of
        K32_DOILY_DATA.points
      ) {
        const [
          left,
          right,
        ] =
          membershipsByPointId.get(
            point.id
          );

        const imagePairKey =
          ovoidPairKey(
            permutation[left],
            permutation[right]
          );


        const imagePoint =
          pointByOvoidPairKey.get(
            imagePairKey
          );


        if (!imagePoint) {
          throw new Error(
            "Ovoid permutation produced an unknown projective point."
          );
        }


        pointImageById.set(
          point.id,
          imagePoint.id
        );
      }


      const preservesLines =
        K32_DOILY_DATA.lines.every(
          (line) => {
            const imageLineKey =
              line.pointIds
                .map(
                  (pointId) =>
                    pointImageById.get(
                      pointId
                    )
                )
                .sort()
                .join("::");


            return (
              exactLineKeys.has(
                imageLineKey
              )
            );
          }
        );


      if (!preservesLines) {
        continue;
      }


      automorphisms.push(
        Object.freeze({
          index:
            automorphisms.length,

          ovoidPermutation:
            Object.freeze(
              [...permutation]
            ),

          pointImageById,
        })
      );
    }


    if (
      automorphisms.length !== 720
    ) {
      throw new Error(
        "Doily automorphism derivation failed: " +
        `expected 720, found ${automorphisms.length}.`
      );
    }


    return Object.freeze({
      membershipsByPointId,

      pointByOvoidPairKey,

      automorphisms:
        Object.freeze(
          automorphisms
        ),
    });
  })();


function ovoidStabilizerAutomorphisms(
  ovoidIndex
) {
  const stabilizer =
    K32_DOILY_AUTOMORPHISM_DATA
      .automorphisms
      .filter(
        (automorphism) =>
          automorphism
            .ovoidPermutation[
              ovoidIndex
            ] ===
          ovoidIndex
      );


  if (
    stabilizer.length !== 120
  ) {
    throw new Error(
      `Ovoid ${ovoidIndex + 1} stabilizer has ` +
      `${stabilizer.length} elements instead of 120.`
    );
  }


  return stabilizer;
}


function ovoidPointPermutation(
  ovoidIndex,
  automorphism
) {
  const ovoid =
    K32_DOILY_OVOIDS[
      ovoidIndex
    ];


  const imageIndices =
    ovoid.points.map(
      (point) => {
        const imagePointId =
          automorphism
            .pointImageById
            .get(
              point.id
            );


        const imageIndex =
          ovoid.points.findIndex(
            (candidate) =>
              candidate.id ===
              imagePointId
          );


        if (
          imageIndex < 0
        ) {
          throw new Error(
            "Ovoid stabilizer mapped a point outside the selected ovoid."
          );
        }


        return imageIndex;
      }
    );


  return Object.freeze(
    imageIndices
  );
}


function permutationHasFixedPoint(
  permutation
) {
  return permutation.some(
    (
      image,
      index
    ) =>
      image === index
  );
}


const K32_DOILY_OVOID_SYMMETRY_DATA =
  Object.freeze(
    K32_DOILY_OVOIDS.map(
      (ovoid) => {
        const stabilizer =
          ovoidStabilizerAutomorphisms(
            ovoid.index
          );


        const records =
          stabilizer.map(
            (
              automorphism,
              index
            ) => {
              const pointPermutation =
                ovoidPointPermutation(
                  ovoid.index,
                  automorphism
                );


              return Object.freeze({
                index,

                automorphism,

                pointPermutation,

                derangement:
                  !permutationHasFixedPoint(
                    pointPermutation
                  ),
              });
            }
          );


        const uniquePointPermutations =
          new Set(
            records.map(
              (record) =>
                record
                  .pointPermutation
                  .join(",")
            )
          );


        if (
          uniquePointPermutations.size !== 120
        ) {
          throw new Error(
            "Ovoid stabilizer does not induce all 120 S5 permutations."
          );
        }


        const derangements =
          records.filter(
            (record) =>
              record.derangement
          );


        if (
          derangements.length !== 44
        ) {
          throw new Error(
            `Ovoid ${ovoid.index + 1} has ` +
            `${derangements.length} derangements instead of 44.`
          );
        }


        return Object.freeze({
          stabilizer:
            Object.freeze(
              records
            ),

          derangements:
            Object.freeze(
              derangements
            ),
        });
      }
    )
  );


const CHARACTERISTIC_POLYNOMIAL_DISPLAY =
  Object.freeze({
    "x^4 - 4x^3 + 6x^2 - 4x + 1":
      Object.freeze({
        expanded:
          "x^4 - 4x^3 + 6x^2 - 4x + 1",
        factored:
          "(x - 1)^4",
      }),

    "x^4 + 4x^3 + 6x^2 + 4x + 1":
      Object.freeze({
        expanded:
          "x^4 + 4x^3 + 6x^2 + 4x + 1",
        factored:
          "(x + 1)^4",
      }),

    "x^4 - 2x^2 + 1":
      Object.freeze({
        expanded:
          "x^4 - 2x^2 + 1",
        factored:
          "(x - 1)^2 (x + 1)^2",
      }),

    "x^4 + 2x^3 + 3x^2 + 2x + 1":
      Object.freeze({
        expanded:
          "x^4 + 2x^3 + 3x^2 + 2x + 1",
        factored:
          "(x^2 + x + 1)^2",
      }),

    "x^4 - x^3 - x + 1":
      Object.freeze({
        expanded:
          "x^4 - x^3 - x + 1",
        factored:
          "(x - 1)^2 (x^2 + x + 1)",
      }),

    "x^4 + 2x^2 + 1":
      Object.freeze({
        expanded:
          "x^4 + 2x^2 + 1",
        factored:
          "(x^2 + 1)^2",
      }),

    "x^4 + x^3 + x + 1":
      Object.freeze({
        expanded:
          "x^4 + x^3 + x + 1",
        factored:
          "(x + 1)^2 (x^2 - x + 1)",
      }),

    "x^4 - 2x^3 + 3x^2 - 2x + 1":
      Object.freeze({
        expanded:
          "x^4 - 2x^3 + 3x^2 - 2x + 1",
        factored:
          "(x^2 - x + 1)^2",
      }),

    "x^4 - x^2 + 1":
      Object.freeze({
        expanded:
          "x^4 - x^2 + 1",
        factored:
          "x^4 - x^2 + 1",
      }),
  });


/*
 * Exact principal SO(4) rotation angles.
 *
 * Every characteristic polynomial has the form
 *
 *   (x^2 - 2 cos(alpha) x + 1)
 *   (x^2 - 2 cos(beta)  x + 1),
 *
 * with 0 <= alpha,beta <= pi.
 */
const ROTATION_ANGLES_BY_CHARACTERISTIC_POLYNOMIAL =
  Object.freeze({

    "x^4 - 4x^3 + 6x^2 - 4x + 1":
      String.raw`\left(0,0\right)`,

    "x^4 + 4x^3 + 6x^2 + 4x + 1":
      String.raw`\left(\pi,\pi\right)`,

    "x^4 - 2x^2 + 1":
      String.raw`\left(0,\pi\right)`,

    "x^4 + 2x^3 + 3x^2 + 2x + 1":
      String.raw`\left(\frac{2\pi}{3},\frac{2\pi}{3}\right)`,

    "x^4 - x^3 - x + 1":
      String.raw`\left(0,\frac{2\pi}{3}\right)`,

    "x^4 + 2x^2 + 1":
      String.raw`\left(\frac{\pi}{2},\frac{\pi}{2}\right)`,

    "x^4 + x^3 + x + 1":
      String.raw`\left(\frac{\pi}{3},\pi\right)`,

    "x^4 - 2x^3 + 3x^2 - 2x + 1":
      String.raw`\left(\frac{\pi}{3},\frac{\pi}{3}\right)`,

    "x^4 - x^2 + 1":
      String.raw`\left(\frac{\pi}{6},\frac{5\pi}{6}\right)`,
  });


/*
 * ============================================================
 * Exact spectral census of K32
 * ============================================================
 *
 * This is derived from the actual 32 subgroup elements.
 *
 * No spectral counts are hard-coded here.
 */
const K32_SPECTRAL_SUMMARY =
  (() => {
    const records =
      G288
        .map(
          (
            element,
            elementIndex
          ) => ({
            element,
            elementIndex,
          })
        )
        .filter(
          ({ element }) =>
            isK32Element(
              element
            )
        );


    if (
      records.length !== 32
    ) {
      throw new Error(
        "K32 spectral census failed: " +
        `expected 32 elements, found ${records.length}.`
      );
    }


    const byPolynomial =
      new Map();


    for (
      const record of records
    ) {
      const spectral =
        SPECTRAL_BY_KEY.get(
          record.element.key
        );


      if (!spectral) {
        throw new Error(
          "K32 spectral census encountered an element " +
          "without a spectral record."
        );
      }


      const polynomialText =
        spectral
          .characteristicPolynomialText;


      const familyIndex =
        G288_CONJUGACY_SPECTRAL_DATA
          .families
          .findIndex(
            (family) =>
              family.polynomialText ===
              polynomialText
          );


      if (
        familyIndex < 0
      ) {
        throw new Error(
          "K32 spectral census encountered an unknown " +
          "spectral family."
        );
      }


      if (
        !byPolynomial.has(
          polynomialText
        )
      ) {
        byPolynomial.set(
          polynomialText,
          {
            familyIndex,
            polynomialText,
            elementIndices: [],
            elementKeys: [],
          }
        );
      }


      const summary =
        byPolynomial.get(
          polynomialText
        );


      summary.elementIndices.push(
        record.elementIndex
      );

      summary.elementKeys.push(
        record.element.key
      );
    }


    const families =
      [...byPolynomial.values()]
        .sort(
          (
            left,
            right
          ) =>
            left.familyIndex -
            right.familyIndex
        )
        .map(
          (family) => {
            const angles =
              ROTATION_ANGLES_BY_CHARACTERISTIC_POLYNOMIAL[
                family.polynomialText
              ];


            if (!angles) {
              throw new Error(
                "K32 spectral census has no exact angle pair " +
                `for ${family.polynomialText}.`
              );
            }


            return Object.freeze({
              familyIndex:
                family.familyIndex,

              polynomialText:
                family.polynomialText,

              angles,

              count:
                family.elementIndices.length,

              elementIndices:
                Object.freeze(
                  [...family.elementIndices]
                ),

              elementKeys:
                Object.freeze(
                  [...family.elementKeys]
                ),
            });
          }
        );


    const total =
      families.reduce(
        (
          sum,
          family
        ) =>
          sum +
          family.count,
        0
      );


    if (
      total !== 32
    ) {
      throw new Error(
        "K32 spectral census failed: " +
        `spectral counts sum to ${total} instead of 32.`
      );
    }


    return Object.freeze(
      families
    );
  })();


function LatexInline({
  latex,
  className = "",
}) {
  const html =
    katex.renderToString(
      latex,
      {
        throwOnError: false,
        displayMode: false,
        output: "html",
      }
    );

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{
        __html: html,
      }}
    />
  );
}


function quaternionLatex(
  quaternion
) {
  const A = Number(quaternion.A);
  const B = Number(quaternion.B);
  const C = Number(quaternion.C);
  const D = Number(quaternion.D);

  const terms = [];


  function pushTerm(
    coefficient,
    symbol = ""
  ) {
    if (coefficient === 0) {
      return;
    }

    const absolute =
      Math.abs(coefficient);

    let body = "";

    if (symbol) {
      body =
        absolute === 1
          ? symbol
          : `${absolute}${symbol}`;
    } else {
      body =
        String(absolute);
    }

    if (terms.length === 0) {
      terms.push(
        coefficient < 0
          ? `-${body}`
          : body
      );
    } else {
      terms.push(
        coefficient < 0
          ? `-${body}`
          : `+${body}`
      );
    }
  }


  pushTerm(A);
  pushTerm(B, "i");
  pushTerm(C, "j");
  pushTerm(D, "k");


  const numerator =
    terms.length > 0
      ? terms.join("")
      : "0";

  return `\\frac{${numerator}}{2}`;
}


function projectivePairLatex(
  element
) {
  return (
    `\\left[` +
    quaternionLatex(element.a) +
    `,\\,` +
    quaternionLatex(element.b) +
    `\\right]`
  );
}


function matrixEntryLatex(
  doubledEntry
) {
  if (
    doubledEntry % 2 === 0
  ) {
    return String(
      doubledEntry / 2
    );
  }

  return (
    doubledEntry < 0
      ? `-\\tfrac{${Math.abs(doubledEntry)}}{2}`
      : `\\tfrac{${doubledEntry}}{2}`
  );
}


const TETRA_VERTICES_3D = Object.freeze([
  Object.freeze([ 1,  1,  1]),
  Object.freeze([ 1, -1, -1]),
  Object.freeze([-1,  1, -1]),
  Object.freeze([-1, -1,  1]),
]);


const TETRA_EDGES = Object.freeze([
  Object.freeze([0, 1]),
  Object.freeze([0, 2]),
  Object.freeze([0, 3]),
  Object.freeze([1, 2]),
  Object.freeze([1, 3]),
  Object.freeze([2, 3]),
]);


const TETRA_FACES = Object.freeze([
  Object.freeze([0, 1, 2]),
  Object.freeze([0, 3, 1]),
  Object.freeze([0, 2, 3]),
  Object.freeze([1, 3, 2]),
]);


const TETRA_FACE_COLORS =
  Object.freeze([
    "#ffe600", // Yellow
    "#4da3ff", // Blue
    "#159447", // Green
    "#ff2020", // Red
  ]);


const BASE_CAMERA_YAW = -0.62;
const BASE_CAMERA_PITCH = 0.43;


/*
 * ============================================================
 * Exact regular 24-cell
 * ============================================================
 *
 * The 24 Hurwitz units are already present in G288 as the
 * quaternion factors a and b.
 *
 * A doubled-coordinate quaternion
 *
 *   (A,B,C,D)
 *
 * represents
 *
 *   (A + Bi + Cj + Dk) / 2.
 *
 * We recover the 24 distinct units here rather than defining a
 * second independent copy of 2T inside the viewer.
 */

function quaternionCoordinateArray(
  quaternion
) {
  return [
    Number(quaternion.A),
    Number(quaternion.B),
    Number(quaternion.C),
    Number(quaternion.D),
  ];
}


function coordinateKey(
  coordinates
) {
  return coordinates.join(",");
}


const HURWITZ_24 =
  (() => {
    const byKey =
      new Map();

    for (const element of G288) {
      for (
        const quaternion of [
          element.a,
          element.b,
        ]
      ) {
        const coordinates =
          quaternionCoordinateArray(
            quaternion
          );

        byKey.set(
          coordinateKey(
            coordinates
          ),
          coordinates
        );
      }
    }

    const vertices =
      [...byKey.values()];

    if (vertices.length !== 24) {
      throw new Error(
        "24-cell construction failed: " +
        `expected 24 Hurwitz units, found ${vertices.length}`
      );
    }

    /*
     * Stable presentation order:
     *
     *   first the eight Q8 vertices,
     *   then the sixteen half-Hurwitz vertices.
     */
    vertices.sort(
      (left, right) => {
        const leftQ8 =
          left.filter(
            (value) =>
              value !== 0
          ).length === 1;

        const rightQ8 =
          right.filter(
            (value) =>
              value !== 0
          ).length === 1;

        if (leftQ8 !== rightQ8) {
          return leftQ8
            ? -1
            : 1;
        }

        for (
          let index = 0;
          index < 4;
          index += 1
        ) {
          if (
            left[index] !==
            right[index]
          ) {
            return (
              right[index] -
              left[index]
            );
          }
        }

        return 0;
      }
    );

    return Object.freeze(
      vertices.map(
        (vertex) =>
          Object.freeze(vertex)
      )
    );
  })();



/*
 * ============================================================
 * Exact 24-cell vertex angular-displacement spectrum
 * ============================================================
 *
 * HURWITZ_24 stores doubled coordinates:
 *
 *   V = 2v.
 *
 * matrix2ForG288(g) returns
 *
 *   matrix2 = 2M.
 *
 * Therefore the exact doubled image is
 *
 *   V' = (matrix2 V) / 2.
 *
 * Every Hurwitz vertex is a unit vector, so
 *
 *   cos(theta_v)
 *     = v . Mv
 *     = (V . V') / 4.
 *
 * Thus the cosine is obtained exactly as a rational number
 * before any display formatting occurs.
 */

function reducedIntegerFraction(
  numerator,
  denominator
) {
  if (denominator === 0) {
    throw new Error(
      "Cannot reduce a fraction with zero denominator."
    );
  }

  let sign =
    denominator < 0
      ? -1
      : 1;

  let n =
    numerator * sign;

  let d =
    Math.abs(
      denominator
    );

  const divisor =
    gcdInteger(
      n,
      d
    );

  n /= divisor;
  d /= divisor;

  return Object.freeze({
    numerator: n,
    denominator: d,
    key: `${n}/${d}`,
  });
}


function rationalCosineAngleLatex(
  numerator,
  denominator
) {
  const fraction =
    reducedIntegerFraction(
      numerator,
      denominator
    );

  const n =
    fraction.numerator;

  const d =
    fraction.denominator;


  /*
   * The rational cosine values corresponding to the familiar
   * rational multiples of pi are handled explicitly.
   *
   * Any other exact rational cosine remains exact as arccos(n/d).
   */
  if (n === d) {
    return "0";
  }

  if (n === -d) {
    return String.raw`\pi`;
  }

  if (n === 0) {
    return String.raw`\frac{\pi}{2}`;
  }

  if (
    n * 2 === d
  ) {
    return String.raw`\frac{\pi}{3}`;
  }

  if (
    n * 2 === -d
  ) {
    return String.raw`\frac{2\pi}{3}`;
  }


  const cosineLatex =
    d === 1
      ? String(n)
      : String.raw`\frac{${n}}{${d}}`;


  return String.raw`\arccos\!\left(${cosineLatex}\right)`;
}


function vertexDisplacementSpectrumForElement(
  element
) {
  const matrix2 =
    matrix2ForG288(
      element
    );

  const byCosine =
    new Map();


  for (
    let vertexIndex = 0;
    vertexIndex < HURWITZ_24.length;
    vertexIndex += 1
  ) {
    const vertex =
      HURWITZ_24[
        vertexIndex
      ];


    /*
     * Exact doubled image V' = (matrix2 V)/2.
     */
    const image =
      matrix2.map(
        (row) => {
          const numerator =
            row.reduce(
              (
                sum,
                entry,
                coordinateIndex
              ) =>
                sum +
                entry *
                  vertex[
                    coordinateIndex
                  ],
              0
            );


          if (
            numerator % 2 !== 0
          ) {
            throw new Error(
              "Vertex-displacement census lost exact integrality."
            );
          }


          return numerator / 2;
        }
      );


    /*
     * All doubled Hurwitz vertices have squared norm 4.
     *
     * Therefore
     *
     *   cos(theta) = (V . V') / 4.
     */
    const dotNumerator =
      vertex.reduce(
        (
          sum,
          coordinate,
          coordinateIndex
        ) =>
          sum +
          coordinate *
            image[
              coordinateIndex
            ],
        0
      );


    const cosine =
      reducedIntegerFraction(
        dotNumerator,
        4
      );


    if (
      cosine.numerator <
        -cosine.denominator ||
      cosine.numerator >
        cosine.denominator
    ) {
      throw new Error(
        "Vertex-displacement cosine lies outside [-1,1]."
      );
    }


    if (
      !byCosine.has(
        cosine.key
      )
    ) {
      byCosine.set(
        cosine.key,
        {
          numerator:
            cosine.numerator,

          denominator:
            cosine.denominator,

          vertexIndices: [],
        }
      );
    }


    byCosine
      .get(
        cosine.key
      )
      .vertexIndices
      .push(
        vertexIndex
      );
  }


  const spectrum =
    [...byCosine.values()]
      .map(
        (entry) => {
          const cosineValue =
            entry.numerator /
            entry.denominator;

          const angleRadians =
            Math.acos(
              Math.max(
                -1,
                Math.min(
                  1,
                  cosineValue
                )
              )
            );


          return Object.freeze({
            numerator:
              entry.numerator,

            denominator:
              entry.denominator,

            angleLatex:
              rationalCosineAngleLatex(
                entry.numerator,
                entry.denominator
              ),

            angleRadians,

            count:
              entry.vertexIndices.length,

            vertexIndices:
              Object.freeze(
                [...entry.vertexIndices]
              ),
          });
        }
      )
      .sort(
        (
          left,
          right
        ) =>
          left.angleRadians -
          right.angleRadians
      );


  const vertexCount =
    spectrum.reduce(
      (
        sum,
        entry
      ) =>
        sum +
        entry.count,
      0
    );


  if (
    vertexCount !== 24
  ) {
    throw new Error(
      "Vertex-displacement spectrum failed: " +
      `expected 24 vertices, found ${vertexCount}.`
    );
  }


  /*
   * Secondary aggregate quantities.
   *
   * These are intentionally not displayed yet.  They let us
   * inspect whether total/mean angular displacement develops
   * a useful pattern before deciding whether it belongs in UI.
   */
  const totalAngleRadians =
    spectrum.reduce(
      (
        sum,
        entry
      ) =>
        sum +
        entry.angleRadians *
        entry.count,
      0
    );

  const meanAngleRadians =
    totalAngleRadians /
    24;


  return Object.freeze({
    spectrum:
      Object.freeze(
        spectrum
      ),

    vertexCount,

    totalAngleRadians,

    meanAngleRadians,
  });
}



/*
 * ============================================================
 * Full G288 vertex-displacement census
 * ============================================================
 *
 * This asks:
 *
 *   How many distinct exact 24-vertex displacement spectra
 *   occur among all 288 elements?
 *
 * The spectrum key is built only from the exact rational
 * cosine and exact vertex multiplicity:
 *
 *   cos(theta_1):n_1 | cos(theta_2):n_2 | ...
 *
 * No floating-point angle is used to decide whether two
 * spectra are equal.
 */

function vertexDisplacementSpectrumKey(
  displacement
) {
  return displacement
    .spectrum
    .map(
      (entry) =>
        `${entry.numerator}/${entry.denominator}:${entry.count}`
    )
    .join("|");
}


function vertexDisplacementSpectrumText(
  displacement
) {
  return displacement
    .spectrum
    .map(
      (entry) =>
        `${entry.angleLatex} (${entry.count})`
    )
    .join("  ·  ");
}


const G288_VERTEX_DISPLACEMENT_CENSUS =
  (() => {
    const bySpectrumKey =
      new Map();


    G288.forEach(
      (
        element,
        elementIndex
      ) => {
        const displacement =
          vertexDisplacementSpectrumForElement(
            element
          );

        const spectrumKey =
          vertexDisplacementSpectrumKey(
            displacement
          );


        const conjugacyClassIndex =
          G288_CONJUGACY_CLASS_DATA
            .classIndexByElementKey
            .get(
              element.key
            );


        if (
          conjugacyClassIndex ===
          undefined
        ) {
          throw new Error(
            "Vertex-displacement census could not locate conjugacy class."
          );
        }


        const spectralFamilyIndex =
          G288_CONJUGACY_SPECTRAL_DATA
            .classIndexToFamilyIndex
            .get(
              conjugacyClassIndex
            );


        if (
          spectralFamilyIndex ===
          undefined
        ) {
          throw new Error(
            "Vertex-displacement census could not locate spectral family."
          );
        }


        if (
          !bySpectrumKey.has(
            spectrumKey
          )
        ) {
          bySpectrumKey.set(
            spectrumKey,
            {
              spectrumKey,

              displacement,

              elementIndices: [],

              elementKeys:
                new Set(),

              spectralFamilyIndices:
                new Set(),

              conjugacyClassIndices:
                new Set(),
            }
          );
        }


        const bucket =
          bySpectrumKey.get(
            spectrumKey
          );


        bucket.elementIndices.push(
          elementIndex
        );

        bucket.elementKeys.add(
          element.key
        );

        bucket.spectralFamilyIndices.add(
          spectralFamilyIndex
        );

        bucket.conjugacyClassIndices.add(
          conjugacyClassIndex
        );
      }
    );


    const spectra =
      [...bySpectrumKey.values()]
        .map(
          (
            bucket,
            index
          ) =>
            Object.freeze({
              index,

              spectrumKey:
                bucket.spectrumKey,

              displacement:
                bucket.displacement,

              spectrumText:
                vertexDisplacementSpectrumText(
                  bucket.displacement
                ),

              elementCount:
                bucket.elementIndices.length,

              elementIndices:
                Object.freeze(
                  [...bucket.elementIndices]
                ),

              spectralFamilyIndices:
                Object.freeze(
                  [...bucket.spectralFamilyIndices]
                    .sort(
                      (
                        left,
                        right
                      ) =>
                        left - right
                    )
                ),

              conjugacyClassIndices:
                Object.freeze(
                  [...bucket.conjugacyClassIndices]
                    .sort(
                      (
                        left,
                        right
                      ) =>
                        left - right
                    )
                ),
            })
        )
        .sort(
          (
            left,
            right
          ) => {
            /*
             * Put simpler / larger families first,
             * but keep the ordering deterministic.
             */
            if (
              right.elementCount !==
              left.elementCount
            ) {
              return (
                right.elementCount -
                left.elementCount
              );
            }

            return (
              left.spectrumKey
                .localeCompare(
                  right.spectrumKey
                )
            );
          }
        )
        .map(
          (
            record,
            index
          ) =>
            Object.freeze({
              ...record,
              index,
            })
        );


    const totalElements =
      spectra.reduce(
        (
          sum,
          spectrum
        ) =>
          sum +
          spectrum.elementCount,
        0
      );


    const uniqueElementKeys =
      new Set(
        spectra.flatMap(
          (spectrum) =>
            spectrum.elementIndices.map(
              (elementIndex) =>
                G288[
                  elementIndex
                ].key
            )
        )
      );


    if (
      totalElements !== 288 ||
      uniqueElementKeys.size !== 288
    ) {
      throw new Error(
        "Vertex-displacement census failed to partition all 288 elements."
      );
    }


    /*
     * Determine how the new classification compares with the
     * existing 9 spectral families.
     */
    const displacementSpectraBySpectralFamily =
      new Map(
        Array.from(
          {
            length:
              G288_CONJUGACY_SPECTRAL_DATA
                .families
                .length,
          },
          (
            _,
            familyIndex
          ) => [
            familyIndex,
            [],
          ]
        )
      );


    for (
      const spectrum of spectra
    ) {
      for (
        const familyIndex of
        spectrum.spectralFamilyIndices
      ) {
        displacementSpectraBySpectralFamily
          .get(
            familyIndex
          )
          .push(
            spectrum.index
          );
      }
    }


    const spectralFamiliesThatSplit =
      [...displacementSpectraBySpectralFamily.entries()]
        .filter(
          (
            [
              _familyIndex,
              displacementSpectrumIndices,
            ]
          ) =>
            displacementSpectrumIndices.length >
            1
        )
        .map(
          (
            [
              familyIndex,
              displacementSpectrumIndices,
            ]
          ) =>
            Object.freeze({
              familyIndex,

              displacementSpectrumIndices:
                Object.freeze(
                  [
                    ...displacementSpectrumIndices,
                  ]
                ),
            })
        );


    const displacementSpectraThatMergeSpectralFamilies =
      spectra
        .filter(
          (spectrum) =>
            spectrum
              .spectralFamilyIndices
              .length >
            1
        );


    return Object.freeze({
      spectra:
        Object.freeze(
          spectra
        ),

      count:
        spectra.length,

      totalElements,

      displacementSpectraBySpectralFamily,

      spectralFamiliesThatSplit:
        Object.freeze(
          spectralFamiliesThatSplit
        ),

      displacementSpectraThatMergeSpectralFamilies:
        Object.freeze(
          displacementSpectraThatMergeSpectralFamilies
        ),
    });
  })();


/*
 * ============================================================
 * Split-family geometry inside the exact 24-cell
 * ============================================================
 *
 * Two principal-angle families refine into two different
 * 24-cell vertex-incidence types.
 *
 * In each split type exactly six Hurwitz vertices lie wholly
 * in one of the two principal rotation planes.
 *
 * The six vertices are derived from the exact displacement
 * spectrum of the selected element.  No vertex list is
 * hard-coded here.
 */

const SPLIT_24_CELL_PRINCIPAL_PLANE_DATA =
  Object.freeze({
    "x^4 - x^3 - x + 1":
      Object.freeze({
        alphaAngleLatex:
          "0",

        betaAngleLatex:
          String.raw`\frac{2\pi}{3}`,
      }),

    "x^4 + x^3 + x + 1":
      Object.freeze({
        alphaAngleLatex:
          String.raw`\frac{\pi}{3}`,

        betaAngleLatex:
          String.raw`\pi`,
      }),
  });


function split24CellGeometryForElement(
  element
) {
  const spectral =
    SPECTRAL_BY_KEY.get(
      element.key
    );


  if (!spectral) {
    throw new Error(
      "24-cell displacement view could not locate spectral record."
    );
  }


  const displacement =
    vertexDisplacementSpectrumForElement(
      element
    );


  const conjugacyClassIndex =
    G288_CONJUGACY_CLASS_DATA
      .classIndexByElementKey
      .get(
        element.key
      );


  if (
    conjugacyClassIndex ===
    undefined
  ) {
    throw new Error(
      "24-cell displacement view could not locate conjugacy class."
    );
  }


  const spectralFamilyIndex =
    G288_CONJUGACY_SPECTRAL_DATA
      .classIndexToFamilyIndex
      .get(
        conjugacyClassIndex
      );


  if (
    spectralFamilyIndex ===
    undefined
  ) {
    throw new Error(
      "24-cell displacement view could not locate spectral family."
    );
  }


  const spectrumKey =
    vertexDisplacementSpectrumKey(
      displacement
    );


  const displacementType =
    G288_VERTEX_DISPLACEMENT_CENSUS
      .spectra
      .find(
        (record) =>
          record.spectrumKey ===
          spectrumKey
      );


  if (!displacementType) {
    throw new Error(
      "24-cell displacement view could not locate displacement type."
    );
  }


  const classes =
    displacement.spectrum.map(
      (
        entry,
        classIndex
      ) =>
        Object.freeze({
          classIndex,

          angleLatex:
            entry.angleLatex,

          count:
            entry.count,

          vertexIndices:
            entry.vertexIndices,
        })
    );


  const classIndexByVertexIndex =
    new Map();


  for (
    const displacementClass of
    classes
  ) {
    for (
      const vertexIndex of
      displacementClass.vertexIndices
    ) {
      if (
        classIndexByVertexIndex.has(
          vertexIndex
        )
      ) {
        throw new Error(
          "24-cell displacement classes overlap at a vertex."
        );
      }

      classIndexByVertexIndex.set(
        vertexIndex,
        displacementClass.classIndex
      );
    }
  }


  if (
    classIndexByVertexIndex.size !== 24
  ) {
    throw new Error(
      "24-cell displacement classes do not partition all 24 vertices."
    );
  }


  const counts =
    classes.map(
      (displacementClass) =>
        displacementClass.count
    );


  const partitionKey =
    counts.length === 1
      ? String(
          counts[0]
        )
      : counts.length === 2
        ? [...counts]
            .sort(
              (
                left,
                right
              ) =>
                left - right
            )
            .join("+")
        : counts.join("+");


  return Object.freeze({
    spectralFamilyLabel:
      `S${spectralFamilyIndex + 1}`,

    displacementTypeLabel:
      `D${displacementType.index + 1}`,

    principalAnglesLatex:
      ROTATION_ANGLES_BY_CHARACTERISTIC_POLYNOMIAL[
        spectral.characteristicPolynomialText
      ],

    partitionKey,

    classes:
      Object.freeze(
        classes
      ),

    classIndexByVertexIndex,
  });
}


if (
  typeof window !==
  "undefined"
) {
  console.group(
    "[G288] Exact 24-cell vertex-displacement census"
  );

  console.log(
    "Distinct displacement spectra:",
    G288_VERTEX_DISPLACEMENT_CENSUS.count
  );

  console.log(
    "Elements accounted for:",
    G288_VERTEX_DISPLACEMENT_CENSUS.totalElements
  );


  console.table(
    G288_VERTEX_DISPLACEMENT_CENSUS
      .spectra
      .map(
        (spectrum) => ({
          spectrum:
            `D${spectrum.index + 1}`,

          vertexDisplacement:
            spectrum.spectrumText,

          elements:
            spectrum.elementCount,

          spectralFamilies:
            spectrum
              .spectralFamilyIndices
              .map(
                (familyIndex) =>
                  `S${familyIndex + 1}`
              )
              .join(", "),

          conjugacyClasses:
            spectrum
              .conjugacyClassIndices
              .map(
                (classIndex) =>
                  `C${classIndex + 1}`
              )
              .join(", "),
        })
      )
  );


  /*
   * Compact D1 ... D11 structural census.
   *
   * Diagnostic only: no rendered UI is changed.
   */
  const displacementTypeRows =
    G288_VERTEX_DISPLACEMENT_CENSUS
      .spectra
      .map(
        (spectrum) => {
          if (
            spectrum.spectralFamilyIndices.length !==
            1
          ) {
            throw new Error(
              `Displacement type D${spectrum.index + 1} ` +
              "does not belong to exactly one spectral family."
            );
          }


          const spectralFamilyIndex =
            spectrum
              .spectralFamilyIndices[0];

          const spectralFamily =
            G288_CONJUGACY_SPECTRAL_DATA
              .families[
                spectralFamilyIndex
              ];


          if (!spectralFamily) {
            throw new Error(
              `Displacement type D${spectrum.index + 1} ` +
              "has no spectral-family record."
            );
          }


          const principalAngles =
            ROTATION_ANGLES_BY_CHARACTERISTIC_POLYNOMIAL[
              spectralFamily.polynomialText
            ] ??
            "unknown";


          const vertexPartition =
            spectrum
              .displacement
              .spectrum
              .map(
                (entry) =>
                  entry.count
              )
              .join("+");


          return {
            displacementType:
              `D${spectrum.index + 1}`,

            spectralFamily:
              `S${spectralFamilyIndex + 1}`,

            principalAngles,

            vertexSpectrum:
              spectrum.spectrumText,

            vertexPartition,

            elements:
              spectrum.elementCount,

            conjugacyClassCount:
              spectrum
                .conjugacyClassIndices
                .length,

            conjugacyClasses:
              spectrum
                .conjugacyClassIndices
                .map(
                  (classIndex) =>
                    `C${classIndex + 1}`
                )
                .join(", "),
          };
        }
      );


  const displacementTypeElementTotal =
    displacementTypeRows.reduce(
      (
        total,
        row
      ) =>
        total +
        row.elements,
      0
    );


  if (
    displacementTypeRows.length !== 11 ||
    displacementTypeElementTotal !== 288
  ) {
    throw new Error(
      "D1-D11 compact census failed: " +
      `types=${displacementTypeRows.length}, ` +
      `elements=${displacementTypeElementTotal}.`
    );
  }


  console.group(
    "[G288] D1-D11 exact 24-cell displacement types"
  );

  console.table(
    displacementTypeRows
  );

  console.log(
    "Hierarchy:",
    "25 conjugacy classes -> 11 displacement types -> 9 spectral families"
  );

  console.log(
    "Elements accounted for:",
    displacementTypeElementTotal
  );

  console.groupEnd();




  if (
    G288_VERTEX_DISPLACEMENT_CENSUS
      .spectralFamiliesThatSplit
      .length === 0
  ) {
    console.log(
      "No spectral family splits into multiple vertex-displacement spectra."
    );
  } else {
    console.log(
      "Spectral families that split:",
      G288_VERTEX_DISPLACEMENT_CENSUS
        .spectralFamiliesThatSplit
        .map(
          (record) => ({
            spectralFamily:
              `S${record.familyIndex + 1}`,

            displacementSpectra:
              record
                .displacementSpectrumIndices
                .map(
                  (index) =>
                    `D${index + 1}`
                )
                .join(", "),
          })
        )
    );
  }


  /*
   * ------------------------------------------------------------
   * Focused diagnostic for spectral families that split
   * ------------------------------------------------------------
   *
   * This makes the S5 -> D6/D7 and S7 -> D8/D9 refinement
   * explicit, without requiring manual expansion of nested arrays.
   */

  const splitDisplacementRows =
    G288_VERTEX_DISPLACEMENT_CENSUS
      .spectralFamiliesThatSplit
      .flatMap(
        (splitRecord) => {
          const spectralFamily =
            G288_CONJUGACY_SPECTRAL_DATA
              .families[
                splitRecord.familyIndex
              ];

          const principalAngles =
            ROTATION_ANGLES_BY_CHARACTERISTIC_POLYNOMIAL[
              spectralFamily.polynomialText
            ] ??
            "unknown";


          return splitRecord
            .displacementSpectrumIndices
            .map(
              (displacementIndex) => {
                const displacementType =
                  G288_VERTEX_DISPLACEMENT_CENSUS
                    .spectra[
                      displacementIndex
                    ];


                return {
                  spectralFamily:
                    `S${splitRecord.familyIndex + 1}`,

                  principalAngles,

                  displacementType:
                    `D${displacementType.index + 1}`,

                  vertexDisplacement:
                    displacementType.spectrumText,

                  exactCosinePattern:
                    displacementType.spectrumKey,

                  elements:
                    displacementType.elementCount,

                  conjugacyClasses:
                    displacementType
                      .conjugacyClassIndices
                      .map(
                        (classIndex) =>
                          `C${classIndex + 1}`
                      )
                      .join(", "),

                  representativeElements:
                    displacementType
                      .elementIndices
                      .slice(
                        0,
                        8
                      )
                      .map(
                        (elementIndex) =>
                          `#${elementIndex + 1}`
                      )
                      .join(", ") +
                    (
                      displacementType
                        .elementIndices
                        .length > 8
                        ? ", …"
                        : ""
                    ),

                  totalAngleRadians:
                    Number(
                      displacementType
                        .displacement
                        .totalAngleRadians
                        .toFixed(12)
                    ),

                  meanAngleRadians:
                    Number(
                      displacementType
                        .displacement
                        .meanAngleRadians
                        .toFixed(12)
                    ),
                };
              }
            );
        }
      );


  console.group(
    "[G288] Split spectral families — exact 24-cell refinement"
  );

  console.table(
    splitDisplacementRows
  );


  for (
    const splitRecord of
    G288_VERTEX_DISPLACEMENT_CENSUS
      .spectralFamiliesThatSplit
  ) {
    const spectralFamily =
      G288_CONJUGACY_SPECTRAL_DATA
        .families[
          splitRecord.familyIndex
        ];

    const principalAngles =
      ROTATION_ANGLES_BY_CHARACTERISTIC_POLYNOMIAL[
        spectralFamily.polynomialText
      ] ??
      "unknown";


    console.group(
      `S${splitRecord.familyIndex + 1}  ${principalAngles}`
    );


    for (
      const displacementIndex of
      splitRecord
        .displacementSpectrumIndices
    ) {
      const displacementType =
        G288_VERTEX_DISPLACEMENT_CENSUS
          .spectra[
            displacementIndex
          ];


      console.log(
        `D${displacementType.index + 1}:`,
        displacementType.spectrumText,
        `| ${displacementType.elementCount} elements`,
        `| classes ${
          displacementType
            .conjugacyClassIndices
            .map(
              (classIndex) =>
                `C${classIndex + 1}`
            )
            .join(", ")
        }`
      );


      console.table(
        displacementType
          .displacement
          .spectrum
          .map(
            (entry) => ({
              angle:
                entry.angleLatex,

              exactCosine:
                `${entry.numerator}/${entry.denominator}`,

              vertices:
                entry.count,

              vertexNumbers:
                entry.vertexIndices
                  .map(
                    (vertexIndex) =>
                      `V${vertexIndex + 1}`
                  )
                  .join(", "),
            })
          )
      );
    }


    console.groupEnd();
  }


  console.groupEnd();


  if (
    G288_VERTEX_DISPLACEMENT_CENSUS
      .displacementSpectraThatMergeSpectralFamilies
      .length === 0
  ) {
    console.log(
      "No vertex-displacement spectrum merges multiple spectral families."
    );
  } else {
    console.log(
      "Vertex-displacement spectra that merge spectral families:",
      G288_VERTEX_DISPLACEMENT_CENSUS
        .displacementSpectraThatMergeSpectralFamilies
        .map(
          (record) => ({
            displacementSpectrum:
              `D${record.index + 1}`,

            spectralFamilies:
              record
                .spectralFamilyIndices
                .map(
                  (index) =>
                    `S${index + 1}`
                )
                .join(", "),
          })
        )
    );
  }


  console.groupEnd();
}


const HURWITZ_INDEX_BY_KEY =
  new Map(
    HURWITZ_24.map(
      (vertex, index) => [
        coordinateKey(vertex),
        index,
      ]
    )
  );


/*
 * For unit 24-cell vertices, adjacent vertices have
 *
 *   <u,v> = 1/2.
 *
 * In doubled coordinates this is exactly
 *
 *   A_u A_v + B_u B_v + C_u C_v + D_u D_v = 2.
 */

const CELL24_EDGES =
  (() => {
    const edges = [];

    for (
      let left = 0;
      left < HURWITZ_24.length;
      left += 1
    ) {
      for (
        let right = left + 1;
        right < HURWITZ_24.length;
        right += 1
      ) {
        const dot =
          HURWITZ_24[left][0] *
            HURWITZ_24[right][0] +
          HURWITZ_24[left][1] *
            HURWITZ_24[right][1] +
          HURWITZ_24[left][2] *
            HURWITZ_24[right][2] +
          HURWITZ_24[left][3] *
            HURWITZ_24[right][3];

        if (dot === 2) {
          edges.push(
            Object.freeze([
              left,
              right,
            ])
          );
        }
      }
    }

    if (edges.length !== 96) {
      throw new Error(
        "24-cell edge construction failed: " +
        `expected 96 edges, found ${edges.length}`
      );
    }

    return Object.freeze(edges);
  })();


function cell24UndirectedEdgeKey(
  left,
  right
) {
  return left < right
    ? `${left}:${right}`
    : `${right}:${left}`;
}


const CELL24_EDGE_KEY_SET =
  new Set(
    CELL24_EDGES.map(
      ([left, right]) =>
        cell24UndirectedEdgeKey(
          left,
          right
        )
    )
  );


/*
 * ============================================================
 * Exact octahedral cells of the 24-cell
 * ============================================================
 *
 * HURWITZ_24 stores doubled coordinates.
 *
 * The supporting hyperplanes of this exact 24-cell are
 *
 *   s_i A_i + s_j A_j = 2
 *
 * for one coordinate pair i<j and signs s_i,s_j = +/-1.
 *
 * Each such hyperplane contains exactly six vertices:
 * one octahedral 3-cell.
 *
 * There are:
 *
 *   6 coordinate pairs x 4 sign choices = 24 cells.
 */
const CELL24_CELLS =
  (() => {
    const cells = [];

    let pairIndex = 0;


    for (
      let leftAxis = 0;
      leftAxis < 4;
      leftAxis += 1
    ) {
      for (
        let rightAxis =
          leftAxis + 1;

        rightAxis < 4;
        rightAxis += 1
      ) {
        for (
          const leftSign of
          [-1, 1]
        ) {
          for (
            const rightSign of
            [-1, 1]
          ) {
            const vertexIndices =
              HURWITZ_24
                .map(
                  (
                    vertex,
                    index
                  ) => ({
                    vertex,
                    index,
                  })
                )
                .filter(
                  ({ vertex }) =>
                    leftSign *
                      vertex[
                        leftAxis
                      ] +
                    rightSign *
                      vertex[
                        rightAxis
                      ] ===
                    2
                )
                .map(
                  ({ index }) =>
                    index
                );


            if (
              vertexIndices.length !==
              6
            ) {
              throw new Error(
                "24-cell facet construction failed: " +
                `expected 6 vertices, found ${vertexIndices.length}.`
              );
            }


            const cellEdges =
              CELL24_EDGES.filter(
                (
                  [
                    left,
                    right,
                  ]
                ) =>
                  vertexIndices.includes(
                    left
                  ) &&
                  vertexIndices.includes(
                    right
                  )
              );


            if (
              cellEdges.length !== 12
            ) {
              throw new Error(
                "24-cell facet construction failed: " +
                `expected 12 octahedral edges, found ${cellEdges.length}.`
              );
            }


            const triangularFaces =
              [];


            for (
              let a = 0;
              a <
              vertexIndices.length;
              a += 1
            ) {
              for (
                let b =
                  a + 1;

                b <
                vertexIndices.length;
                b += 1
              ) {
                for (
                  let d =
                    b + 1;

                  d <
                  vertexIndices.length;
                  d += 1
                ) {
                  const first =
                    vertexIndices[a];

                  const second =
                    vertexIndices[b];

                  const third =
                    vertexIndices[d];


                  const isTriangle =
                    CELL24_EDGE_KEY_SET.has(
                      cell24UndirectedEdgeKey(
                        first,
                        second
                      )
                    ) &&
                    CELL24_EDGE_KEY_SET.has(
                      cell24UndirectedEdgeKey(
                        first,
                        third
                      )
                    ) &&
                    CELL24_EDGE_KEY_SET.has(
                      cell24UndirectedEdgeKey(
                        second,
                        third
                      )
                    );


                  if (isTriangle) {
                    triangularFaces.push(
                      Object.freeze([
                        first,
                        second,
                        third,
                      ])
                    );
                  }
                }
              }
            }


            if (
              triangularFaces.length !==
              8
            ) {
              throw new Error(
                "24-cell facet construction failed: " +
                `expected 8 triangular faces, found ${triangularFaces.length}.`
              );
            }


            cells.push(
              Object.freeze({
                index:
                  cells.length,

                pairIndex,

                leftAxis,
                rightAxis,

                leftSign,
                rightSign,

                vertexIndices:
                  Object.freeze(
                    [
                      ...vertexIndices,
                    ]
                  ),

                edges:
                  Object.freeze(
                    [
                      ...cellEdges,
                    ]
                  ),

                triangularFaces:
                  Object.freeze(
                    triangularFaces
                  ),
              })
            );
          }
        }

        pairIndex += 1;
      }
    }


    if (
      cells.length !== 24
    ) {
      throw new Error(
        "24-cell facet construction failed: " +
        `expected 24 octahedra, found ${cells.length}.`
      );
    }


    /*
     * Every triangular face belongs to exactly two
     * neighboring octahedral cells:
     *
     *   24 x 8 / 2 = 96
     *
     * unique triangular faces.
     */
    const faceMultiplicity =
      new Map();


    for (
      const cell of cells
    ) {
      for (
        const face of
        cell.triangularFaces
      ) {
        const key =
          [...face]
            .sort(
              (
                left,
                right
              ) =>
                left - right
            )
            .join(":");


        faceMultiplicity.set(
          key,
          (
            faceMultiplicity.get(
              key
            ) ?? 0
          ) + 1
        );
      }
    }


    if (
      faceMultiplicity.size !==
        96 ||
      [...faceMultiplicity.values()]
        .some(
          (count) =>
            count !== 2
        )
    ) {
      throw new Error(
        "24-cell triangular-face incidence failed: " +
        "expected 96 faces, each shared by exactly two octahedral cells."
      );
    }


    return Object.freeze(
      cells
    );
  })();


function cell24PermutationForElement(
  element
) {
  const matrix2 =
    matrix2ForG288(
      element
    );

  const permutation =
    HURWITZ_24.map(
      (vertex) => {
        /*
         * matrix2 = 2M.
         *
         * vertex stores doubled coordinates 2v.
         * Therefore the doubled coordinates of Mv are
         *
         *   (matrix2 * vertex) / 2.
         *
         * Every result must again be an exact Hurwitz vertex.
         */
        const image =
          matrix2.map(
            (row) => {
              const numerator =
                row.reduce(
                  (
                    sum,
                    entry,
                    index
                  ) =>
                    sum +
                    entry *
                      vertex[index],
                  0
                );

              if (
                numerator % 2 !== 0
              ) {
                throw new Error(
                  "24-cell action lost exact integrality."
                );
              }

              return numerator / 2;
            }
          );

        const imageIndex =
          HURWITZ_INDEX_BY_KEY.get(
            coordinateKey(image)
          );

        if (
          imageIndex === undefined
        ) {
          throw new Error(
            "24-cell action left the Hurwitz vertex set."
          );
        }

        return imageIndex;
      }
    );

  if (
    new Set(permutation).size !== 24
  ) {
    throw new Error(
      "24-cell action is not a permutation."
    );
  }

  return permutation;
}


function rotate4Plane(
  vector,
  leftIndex,
  rightIndex,
  angle
) {
  const result =
    [...vector];

  const cosine =
    Math.cos(angle);

  const sine =
    Math.sin(angle);

  const left =
    vector[leftIndex];

  const right =
    vector[rightIndex];

  result[leftIndex] =
    cosine * left -
    sine * right;

  result[rightIndex] =
    sine * left +
    cosine * right;

  return result;
}


/*
 * EASY 24-CELL SIZE CONTROL
 *
 * EDIT ONLY THIS NUMBER.
 *
 * Larger = larger projected 24-cell.
 * Smaller = smaller projected 24-cell.
 */
const CELL24_VIEW_SCALE = 220;


function project24CellPoint(
  unitCoordinates,
  viewYaw = 0,
  viewPitch = 0
) {
  let point =
    [...unitCoordinates];

  /*
   * Fixed 4D viewing orientation.
   *
   * These rotations are only the display camera.
   * The moving point itself comes from the genuine
   *
   *   z -> a z bar(b)
   *
   * action in S^3.
   */
  point =
    rotate4Plane(
      point,
      0,
      3,
      0.58
    );

  point =
    rotate4Plane(
      point,
      1,
      3,
      -0.39
    );

  point =
    rotate4Plane(
      point,
      2,
      3,
      0.27
    );

  const [
    w,
    x,
    y,
    z,
  ] = point;

  const baseCameraPoint =
    applyTetraCamera([
      x,
      y,
      z,
    ]);


  /*
   * Interactive viewing rotation.
   *
   * This happens AFTER the exact 4D G288 transformation.
   * Dragging therefore changes only where the observer is
   * looking from. It never changes the group element or the
   * 24-cell itself.
   */
  const yawCos =
    Math.cos(viewYaw);

  const yawSin =
    Math.sin(viewYaw);

  const yawX =
    yawCos *
      baseCameraPoint[0] +
    yawSin *
      baseCameraPoint[2];

  const yawZ =
    -yawSin *
      baseCameraPoint[0] +
    yawCos *
      baseCameraPoint[2];


  const pitchCos =
    Math.cos(viewPitch);

  const pitchSin =
    Math.sin(viewPitch);


  const cameraPoint = [
    yawX,

    pitchCos *
      baseCameraPoint[1] -
    pitchSin *
      yawZ,

    pitchSin *
      baseCameraPoint[1] +
    pitchCos *
      yawZ,
  ];


  const perspective =
    1 /
    (
      1.18 -
      0.28 * w
    );

  return {
    x:
      260 +
      cameraPoint[0] *
        CELL24_VIEW_SCALE *
        perspective,

    y:
      170 -
      cameraPoint[1] *
        CELL24_VIEW_SCALE *
        perspective,

    depth:
      cameraPoint[2] +
      0.42 * w,
  };
}


function project24CellVertex(
  doubledCoordinates
) {
  return project24CellPoint(
    doubledCoordinates.map(
      (value) =>
        value / 2
    )
  );
}


const PROJECTED_24_CELL =
  Object.freeze(
    HURWITZ_24.map(
      project24CellVertex
    )
  );


function multiplyQuaternion4(
  left,
  right
) {
  const [
    a,
    b,
    c,
    d,
  ] = left;

  const [
    e,
    f,
    g,
    h,
  ] = right;

  return [
    a * e -
      b * f -
      c * g -
      d * h,

    a * f +
      b * e +
      c * h -
      d * g,

    a * g -
      b * h +
      c * e +
      d * f,

    a * h +
      b * g -
      c * f +
      d * e,
  ];
}


function conjugateQuaternion4(
  quaternion
) {
  return [
    quaternion[0],
    -quaternion[1],
    -quaternion[2],
    -quaternion[3],
  ];
}


function applyLeftRightQuaternionAction(
  point,
  leftQuaternion,
  rightQuaternion
) {
  return multiplyQuaternion4(
    multiplyQuaternion4(
      leftQuaternion,
      point
    ),
    conjugateQuaternion4(
      rightQuaternion
    )
  );
}


/*
 * Spherical interpolation with NO q -> -q shortcut.
 *
 * That shortcut is legitimate for a single SO(3) quaternion,
 * but not independently for the two factors of
 *
 *   z -> a z bar(b).
 *
 * Pair signs are handled coherently below.
 */
function slerpQuaternionDirected(
  startQuaternion,
  targetQuaternion,
  t
) {
  const start =
    normalizeQuaternion(
      startQuaternion
    );

  const target =
    normalizeQuaternion(
      targetQuaternion
    );

  let dot =
    quaternionDot(
      start,
      target
    );

  dot =
    Math.max(
      -1,
      Math.min(
        1,
        dot
      )
    );

  if (dot > 0.9995) {
    return normalizeQuaternion(
      start.map(
        (value, index) =>
          value +
          t *
          (
            target[index] -
            value
          )
      )
    );
  }

  /*
   * Antipodal endpoints need a chosen great-circle direction.
   * Construct one deterministic orthogonal direction.
   */
  if (dot < -0.9995) {
    let basisIndex = 0;

    for (
      let index = 1;
      index < 4;
      index += 1
    ) {
      if (
        Math.abs(start[index]) <
        Math.abs(start[basisIndex])
      ) {
        basisIndex = index;
      }
    }

    const basis =
      [0, 0, 0, 0];

    basis[basisIndex] = 1;

    const projection =
      quaternionDot(
        basis,
        start
      );

    const orthogonal =
      normalizeQuaternion(
        basis.map(
          (value, index) =>
            value -
            projection *
              start[index]
        )
      );

    const angle =
      Math.PI * t;

    return start.map(
      (value, index) =>
        Math.cos(angle) *
          value +
        Math.sin(angle) *
          orthogonal[index]
    );
  }

  const theta0 =
    Math.acos(dot);

  const sinTheta0 =
    Math.sin(theta0);

  const theta =
    theta0 * t;

  const startWeight =
    Math.sin(
      theta0 -
      theta
    ) /
    sinTheta0;

  const targetWeight =
    Math.sin(theta) /
    sinTheta0;

  return [
    startWeight * start[0] +
      targetWeight * target[0],

    startWeight * start[1] +
      targetWeight * target[1],

    startWeight * start[2] +
      targetWeight * target[2],

    startWeight * start[3] +
      targetWeight * target[3],
  ];
}


function chooseEquivalentTargetPair(
  startLeft,
  startRight,
  targetLeft,
  targetRight
) {
  /*
   * Only the simultaneous sign change
   *
   *   (a,b) -> (-a,-b)
   *
   * preserves the same G288 element.
   *
   * Choose between those TWO representatives by total
   * spherical proximity to the currently rendered pair.
   */
  const score =
    quaternionDot(
      startLeft,
      targetLeft
    ) +
    quaternionDot(
      startRight,
      targetRight
    );

  if (score >= 0) {
    return {
      left: targetLeft,
      right: targetRight,
    };
  }

  return {
    left:
      targetLeft.map(
        (value) =>
          -value
      ),

    right:
      targetRight.map(
        (value) =>
          -value
      ),
  };
}


function Cell24Diagram({
  element,
  orbitGenerator,
  orbitTrailEnabled,
  cellRenderMode,
  setCellRenderMode,
  selectedCellIndex,
  setSelectedCellIndex,
}) {
  const [
    viewRotation,
    setViewRotation,
  ] = useState({
    yaw: 0,
    pitch: 0,
  });


  const [
    sidebarPortalHost,
    setSidebarPortalHost,
  ] = useState(null);


  useEffect(() => {
    setSidebarPortalHost(
      document.getElementById(
        "g288-24-cell-sidebar-controls"
      )
    );
  }, []);


  const dragStateRef =
    useRef(null);


  function handleViewPointerDown(
    event
  ) {
    event.currentTarget
      .setPointerCapture(
        event.pointerId
      );

    dragStateRef.current = {
      pointerId:
        event.pointerId,

      x:
        event.clientX,

      y:
        event.clientY,
    };
  }


  function handleViewPointerMove(
    event
  ) {
    const drag =
      dragStateRef.current;

    if (
      !drag ||
      drag.pointerId !==
        event.pointerId
    ) {
      return;
    }


    const deltaX =
      event.clientX -
      drag.x;

    const deltaY =
      event.clientY -
      drag.y;


    drag.x =
      event.clientX;

    drag.y =
      event.clientY;


    setViewRotation(
      (current) => ({
        yaw:
          current.yaw +
          deltaX * 0.009,

        pitch:
          Math.max(
            -1.35,
            Math.min(
              1.35,
              current.pitch +
              deltaY * 0.009
            )
          ),
      })
    );
  }


  function handleViewPointerUp(
    event
  ) {
    const drag =
      dragStateRef.current;

    if (
      drag &&
      drag.pointerId ===
        event.pointerId
    ) {
      dragStateRef.current =
        null;

      if (
        event.currentTarget
          .hasPointerCapture(
            event.pointerId
          )
      ) {
        event.currentTarget
          .releasePointerCapture(
            event.pointerId
          );
      }
    }
  }


  function resetView() {
    setViewRotation({
      yaw: 0,
      pitch: 0,
    });
  }


  /*
   * Exact endpoint permutation. This remains our authoritative
   * check of where every Hurwitz vertex must land.
   */
  const permutation =
    useMemo(
      () =>
        cell24PermutationForElement(
          element
        ),
      [element]
    );


  const splitGeometry =
    useMemo(
      () =>
        split24CellGeometryForElement(
          element
        ),
      [element]
    );


  const displacementClassIndexByVertex =
    splitGeometry
      .classIndexByVertexIndex;


  const splitModeActive =
    cellRenderMode ===
    "split";


  const targetLeft =
    useMemo(
      () =>
        quaternionComponents(
          element.a
        ),
      [element.a]
    );

  const targetRight =
    useMemo(
      () =>
        quaternionComponents(
          element.b
        ),
      [element.b]
    );


  const renderedPairRef =
    useRef({
      left: [1, 0, 0, 0],
      right: [1, 0, 0, 0],
    });

  const frameRef =
    useRef(null);

  const [
    renderedPair,
    setRenderedPair,
  ] =
    useState({
      left: [1, 0, 0, 0],
      right: [1, 0, 0, 0],
    });


  /*
   * Animate from the actually displayed SO(4) transformation
   * to the newly selected group element.
   */
  useEffect(
    () => {
      if (
        frameRef.current !== null
      ) {
        window.cancelAnimationFrame(
          frameRef.current
        );
      }

      const startLeft =
        renderedPairRef.current.left;

      const startRight =
        renderedPairRef.current.right;

      const targetPair =
        chooseEquivalentTargetPair(
          startLeft,
          startRight,
          targetLeft,
          targetRight
        );

      const duration = 620;

      let startTime = null;


      function animate(
        timestamp
      ) {
        if (
          startTime === null
        ) {
          startTime =
            timestamp;
        }

        const rawT =
          Math.min(
            1,
            (
              timestamp -
              startTime
            ) /
            duration
          );

        const easedT =
          easeInOutCubic(
            rawT
          );

        const nextPair = {
          left:
            slerpQuaternionDirected(
              startLeft,
              targetPair.left,
              easedT
            ),

          right:
            slerpQuaternionDirected(
              startRight,
              targetPair.right,
              easedT
            ),
        };

        renderedPairRef.current =
          nextPair;

        setRenderedPair(
          nextPair
        );

        if (rawT < 1) {
          frameRef.current =
            window.requestAnimationFrame(
              animate
            );
        } else {
          renderedPairRef.current =
            targetPair;

          setRenderedPair(
            targetPair
          );

          frameRef.current =
            null;
        }
      }


      frameRef.current =
        window.requestAnimationFrame(
          animate
        );


      return () => {
        if (
          frameRef.current !== null
        ) {
          window.cancelAnimationFrame(
            frameRef.current
          );

          frameRef.current =
            null;
        }
      };
    },
    [
      targetLeft,
      targetRight,
    ]
  );


  /*
   * Every displayed vertex is the original material Hurwitz
   * vertex acted on by the currently interpolated pair.
   */
  const projectedVertices =
    useMemo(
      () =>
        HURWITZ_24.map(
          (
            doubledCoordinates
          ) => {
            const point =
              doubledCoordinates.map(
                (value) =>
                  value / 2
              );

            const movedPoint =
              applyLeftRightQuaternionAction(
                point,
                renderedPair.left,
                renderedPair.right
              );

            return project24CellPoint(
              movedPoint,
              viewRotation.yaw,
              viewRotation.pitch
            );
          }
        ),
      [
        renderedPair,
        viewRotation,
      ]
    );


  /*
   * The selected octahedron has a permanent identity.
   * The current G288 element sends its six vertices to the
   * six vertices of exactly one other octahedral cell.
   *
   * This lets the viewer say, for example,
   *
   *   C1 -> C14
   *
   * without guessing from the projection.
   */
  const selectedCellImageIndex =
    useMemo(
      () => {
        const sourceCell =
          CELL24_CELLS[
            selectedCellIndex
          ];

        const imageVertexKey =
          sourceCell
            .vertexIndices
            .map(
              (vertexIndex) =>
                permutation[
                  vertexIndex
                ]
            )
            .sort(
              (
                left,
                right
              ) =>
                left - right
            )
            .join(":");


        const imageCell =
          CELL24_CELLS.find(
            (candidate) =>
              candidate
                .vertexIndices
                .slice()
                .sort(
                  (
                    left,
                    right
                  ) =>
                    left - right
                )
                .join(":") ===
              imageVertexKey
          );


        if (!imageCell) {
          throw new Error(
            "24-cell action sent an octahedral cell outside the 24-cell."
          );
        }


        return imageCell.index;
      },
      [
        permutation,
        selectedCellIndex,
      ]
    );


  /*
   * Complete exact orbit of the selected octahedral cell
   * under powers of the chosen matrix generator:
   *
   *   C, MC, M^2 C, ...
   *
   * We stop after the generator order, and retain only
   * distinct cell positions.
   */
  const orbitCellIndices =
    useMemo(
      () => {
        if (
          !orbitTrailEnabled ||
          !orbitGenerator
        ) {
          return [];
        }

        const sourceCell =
          CELL24_CELLS[
            selectedCellIndex
          ];

        const seen =
          new Set();

        const result = [];

        const order =
          g288ElementOrder(
            orbitGenerator
          );

        for (
          let powerIndex = 0;
          powerIndex < order;
          powerIndex += 1
        ) {
          const orbitElement =
            powerG288(
              orbitGenerator,
              powerIndex
            );

          const orbitPermutation =
            cell24PermutationForElement(
              orbitElement
            );

          const imageVertexKey =
            sourceCell
              .vertexIndices
              .map(
                (vertexIndex) =>
                  orbitPermutation[
                    vertexIndex
                  ]
              )
              .sort(
                (left, right) =>
                  left - right
              )
              .join(":");

          const imageCell =
            CELL24_CELLS.find(
              (candidate) =>
                candidate
                  .vertexIndices
                  .slice()
                  .sort(
                    (left, right) =>
                      left - right
                  )
                  .join(":") ===
                imageVertexKey
            );

          if (!imageCell) {
            throw new Error(
              "24-cell orbit trail sent a cell outside the 24-cell."
            );
          }

          if (
            !seen.has(
              imageCell.index
            )
          ) {
            seen.add(
              imageCell.index
            );

            result.push(
              imageCell.index
            );
          }
        }

        return result;
      },
      [
        orbitTrailEnabled,
        orbitGenerator,
        selectedCellIndex,
      ]
    );


  /*
   * Reference position of the untransformed 24-cell.
   *
   * Only the tracked cell uses this layer. It remains as
   * a dashed outline while the material cell moves.
   */
  const referenceProjectedVertices =
    useMemo(
      () =>
        HURWITZ_24.map(
          (
            doubledCoordinates
          ) =>
            project24CellPoint(
              doubledCoordinates.map(
                (value) =>
                  value / 2
              ),
              viewRotation.yaw,
              viewRotation.pitch
            )
        ),
      [viewRotation]
    );


  const projectedCellFaces =
    useMemo(
      () => {
        if (
          cellRenderMode ===
            "edges" ||
          cellRenderMode ===
            "split"
        ) {
          return [];
        }


        const visibleCells =
          cellRenderMode ===
          "one"
            ? [
                CELL24_CELLS[
                  selectedCellIndex
                ],
              ]
            : CELL24_CELLS;


        return visibleCells
          .flatMap(
            (cell) =>
              cell
                .triangularFaces
                .map(
                  (
                    face,
                    faceIndex
                  ) => ({
                    cell,
                    face,
                    faceIndex,

                    depth:
                      face.reduce(
                        (
                          sum,
                          vertexIndex
                        ) =>
                          sum +
                          projectedVertices[
                            vertexIndex
                          ].depth,
                        0
                      ) /
                      3,
                  })
                )
          )
          .sort(
            (
              left,
              right
            ) =>
              left.depth -
              right.depth
          );
      },
      [
        projectedVertices,
        cellRenderMode,
        selectedCellIndex,
      ]
    );


  const sortedEdges =
    useMemo(
      () =>
        CELL24_EDGES
          .map(
            (
              edge,
              index
            ) => ({
              edge,
              index,

              depth:
                (
                  projectedVertices[
                    edge[0]
                  ].depth +
                  projectedVertices[
                    edge[1]
                  ].depth
                ) /
                2,
            })
          )
          .sort(
            (
              left,
              right
            ) =>
              left.depth -
              right.depth
          ),
      [projectedVertices]
    );


  const sortedVertices =
    useMemo(
      () =>
        projectedVertices
          .map(
            (
              point,
              sourceIndex
            ) => ({
              point,
              sourceIndex,
            })
          )
          .sort(
            (
              left,
              right
            ) =>
              left.point.depth -
              right.point.depth
          ),
      [projectedVertices]
    );


  const movedCount =
    permutation.reduce(
      (
        count,
        image,
        index
      ) =>
        count +
        (
          image === index
            ? 0
            : 1
        ),
      0
    );

  const fixedCount =
    permutation.length -
    movedCount;


  const cell24SidebarControls = (
    <div className={styles.cell24SidebarControls}>
      <div className={styles.cell24SidebarStats}>
        <span>24 octahedral cells</span>
        <span>96 triangular faces</span>
        <span>96 edges</span>
      </div>

      <div className={styles.cell24DisplayModes}>
        <button
          type="button"
          className={
            cellRenderMode === "cells"
              ? styles.cell24DisplayButtonActive
              : styles.cell24DisplayButton
          }
          onClick={() =>
            setCellRenderMode(
              "cells"
            )
          }
        >
          Cells
        </button>

        <button
          type="button"
          className={
            cellRenderMode === "one"
              ? styles.cell24DisplayButtonActive
              : styles.cell24DisplayButton
          }
          onClick={() =>
            setCellRenderMode(
              "one"
            )
          }
        >
          One cell
        </button>

        <button
          type="button"
          className={
            cellRenderMode === "edges"
              ? styles.cell24DisplayButtonActive
              : styles.cell24DisplayButton
          }
          onClick={() =>
            setCellRenderMode(
              "edges"
            )
          }
        >
          Edges
        </button>

        <button
          type="button"
          className={
            cellRenderMode === "split"
              ? styles.cell24DisplayButtonActive
              : styles.cell24DisplayButton
          }
          onClick={() =>
            setCellRenderMode(
              "split"
            )
          }
        >
          Angles
        </button>
      </div>


      {
        splitModeActive
          ? (
            <div className={styles.cell24SplitDiagnostic}>
              <div
                className={
                  styles.cell24SplitDiagnosticHeader
                }
              >
                <span>
                  {splitGeometry.displacementTypeLabel}
                  {" · "}
                  {splitGeometry.spectralFamilyLabel}
                  {" · "}
                  {splitGeometry.partitionKey}
                </span>

                <LatexInline
                  latex={
                    splitGeometry.principalAnglesLatex
                  }
                  className={
                    styles.cell24SplitAnglesMath
                  }
                />
              </div>


              <div
                className={
                  styles.cell24DisplacementLegend
                }
              >
                {
                  splitGeometry.classes.map(
                    (displacementClass) => (
                      <span
                        key={
                          displacementClass.classIndex
                        }
                        className={
                          styles.cell24DisplacementLegendItem
                        }
                      >
                        <span
                          className={
                            `${styles.cell24DisplacementSwatch} ` +
                            styles[
                              `cell24DisplacementSwatch${displacementClass.classIndex}`
                            ]
                          }
                          aria-hidden="true"
                        />

                        <LatexInline
                          latex={
                            displacementClass.angleLatex
                          }
                          className={
                            styles.cell24SplitSpectrumMath
                          }
                        />

                        <span>
                          {displacementClass.count}
                        </span>
                      </span>
                    )
                  )
                }
              </div>


              <div
                className={
                  styles.cell24SplitDiagnosticText
                }
              >
                Vertices are colored by their exact angular
                displacement under the selected element.
              </div>
            </div>
          )
          : null
      }


      {
        (
          cellRenderMode !== "edges" &&
          cellRenderMode !== "split"
        )
          ? (
            <div className={styles.cell24SidebarTrackRow}>
              <span className={styles.cell24SidebarLabel}>
                Tracked cell
              </span>

              <div className={styles.cell24CellStepper}>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedCellIndex(
                      (current) =>
                        (
                          current +
                          CELL24_CELLS.length -
                          1
                        ) %
                        CELL24_CELLS.length
                    )
                  }
                >
                  −
                </button>

                <span>
                  C{selectedCellIndex + 1}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedCellIndex(
                      (current) =>
                        (
                          current +
                          1
                        ) %
                        CELL24_CELLS.length
                    )
                  }
                >
                  +
                </button>
              </div>

              <span className={styles.cell24TrackReadout}>
                C{selectedCellIndex + 1}
                {" → "}
                C{selectedCellImageIndex + 1}
                {
                  selectedCellImageIndex ===
                  selectedCellIndex
                    ? " · fixed"
                    : ""
                }
              </span>
            </div>
          )
          : null
      }


      <div className={styles.cell24SidebarUtilityRow}>
        {
          splitModeActive
            ? (
              <span className={styles.cell24DisplacementUtility}>
                exact vertex-angle partition
              </span>
            )
            : (
              <>
                <span className={styles.cell24LegendItem}>
                  <span
                    className={
                      `${styles.cell24LegendSwatch} ` +
                      styles.cell24LegendSwatchMoved
                    }
                    aria-hidden="true"
                  />

                  {movedCount} moved
                </span>

                <span className={styles.cell24LegendItem}>
                  <span
                    className={
                      `${styles.cell24LegendSwatch} ` +
                      styles.cell24LegendSwatchFixed
                    }
                    aria-hidden="true"
                  />

                  {fixedCount} fixed
                </span>
              </>
            )
        }

        <button
          type="button"
          className={styles.cell24ResetView}
          onClick={resetView}
        >
          Reset view
        </button>
      </div>


      {
        splitModeActive
          ? null
          : (
            <div className={styles.cell24SidebarExplanation}>
              The red octahedron is the tracked material cell. Its dashed
              outline marks its reference position. The Cᵢ → Cⱼ readout
              shows exactly where the selected element carries it.
            </div>
          )
      }
    </div>
  );


  return (
    <section className={styles.cell24Card}>
      {
        sidebarPortalHost
          ? createPortal(
              cell24SidebarControls,
              sidebarPortalHost
            )
          : null
      }


      <svg
        className={styles.cell24Svg}
        viewBox="0 0 520 340"
        onPointerDown={handleViewPointerDown}
        onPointerMove={handleViewPointerMove}
        onPointerUp={handleViewPointerUp}
        onPointerCancel={handleViewPointerUp}
        role="img"
        aria-label={
          "Animated SO(4) action on the 24 Hurwitz vertices"
        }
      >
        {
          (
            cellRenderMode !==
              "edges" &&
            cellRenderMode !==
              "split"
          )
            ? CELL24_CELLS[
                selectedCellIndex
              ]
                .triangularFaces
                .map(
                  (
                    face,
                    faceIndex
                  ) => {
                    const points =
                      face
                        .map(
                          (
                            vertexIndex
                          ) => {
                            const point =
                              referenceProjectedVertices[
                                vertexIndex
                              ];

                            return (
                              `${point.x},${point.y}`
                            );
                          }
                        )
                        .join(" ");


                    return (
                      <polygon
                        key={
                          `24-reference-cell-face-${faceIndex}`
                        }
                        points={points}
                        className={
                          styles.cell24TrackedReferenceFace
                        }
                        aria-label={
                          `Reference position of C${selectedCellIndex + 1}`
                        }
                      />
                    );
                  }
                )
            : null
        }


        {
          orbitTrailEnabled
            ? orbitCellIndices
                .filter(
                  (cellIndex) =>
                    cellIndex !==
                    selectedCellImageIndex
                )
                .flatMap(
                  (cellIndex) =>
                    CELL24_CELLS[
                      cellIndex
                    ]
                      .triangularFaces
                      .map(
                        (
                          face,
                          faceIndex
                        ) => {
                          const points =
                            face
                              .map(
                                (
                                  vertexIndex
                                ) => {
                                  const point =
                                    referenceProjectedVertices[
                                      vertexIndex
                                    ];

                                  return (
                                    `${point.x},${point.y}`
                                  );
                                }
                              )
                              .join(" ");

                          return (
                            <polygon
                              key={
                                `24-orbit-trail-${cellIndex}-${faceIndex}`
                              }
                              points={points}
                              className={
                                styles.cell24OrbitTrailFace
                              }
                              aria-label={
                                `Orbit position C${cellIndex + 1}`
                              }
                            />
                          );
                        }
                      )
                )
            : null
        }


        {
          projectedCellFaces.map(
            ({
              cell,
              face,
              faceIndex,
            }) => {
              const points =
                face
                  .map(
                    (
                      vertexIndex
                    ) => {
                      const point =
                        projectedVertices[
                          vertexIndex
                        ];

                      return (
                        `${point.x},${point.y}`
                      );
                    }
                  )
                  .join(" ");


              /*
               * Six stable hues correspond to the six
               * coordinate-pair families of octahedral cells.
               */
              const hueByPair = [
                42,
                205,
                124,
                4,
                282,
                178,
              ];


              const hue =
                hueByPair[
                  cell.pairIndex
                ];


              const isSelected =
                cell.index ===
                selectedCellIndex;


              /*
               * The tracked material octahedron is deliberately
               * unmistakable. All other cells remain context.
               */
              const fill =
                isSelected
                  ? "rgba(255, 74, 64, 0.64)"
                  : `hsla(${hue}, 48%, 58%, ${
                      cellRenderMode ===
                      "one"
                        ? 0.18
                        : 0.072
                    })`;


              return (
                <polygon
                  key={
                    `24-cell-${cell.index}-face-${faceIndex}`
                  }
                  points={points}
                  className={
                    isSelected
                      ? styles.cell24FaceSelected
                      : styles.cell24Face
                  }
                  style={{
                    fill,
                  }}
                  onClick={(
                    event
                  ) => {
                    if (
                      cellRenderMode ===
                      "cells"
                    ) {
                      event.stopPropagation();

                      setSelectedCellIndex(
                        cell.index
                      );
                    }
                  }}
                  aria-label={
                    isSelected
                      ? `Tracked octahedral cell C${cell.index + 1} → C${selectedCellImageIndex + 1}`
                      : `Octahedral cell C${cell.index + 1}`
                  }
                />
              );
            }
          )
        }


        {
          (
            cellRenderMode ===
              "edges" ||
            cellRenderMode ===
              "one" ||
            cellRenderMode ===
              "split"
          )
            ? sortedEdges.map(
                ({
                  edge,
                  index,
                }) => {
                  const left =
                    projectedVertices[
                      edge[0]
                    ];

                  const right =
                    projectedVertices[
                      edge[1]
                    ];


                  return (
                    <line
                      key={
                        `24-edge-${index}`
                      }
                      x1={left.x}
                      y1={left.y}
                      x2={right.x}
                      y2={right.y}
                      className={
                        styles.cell24Edge
                      }
                    />
                  );
                }
              )
            : null
        }


        {
          (
            cellRenderMode ===
              "edges" ||
            cellRenderMode ===
              "split"
          )
            ? sortedVertices.map(
                ({
                  point,
                  sourceIndex,
                }) => {
                  const imageIndex =
                    permutation[
                      sourceIndex
                    ];

                  const moved =
                    sourceIndex !==
                    imageIndex;

                  const source =
                    HURWITZ_24[
                      sourceIndex
                    ];


                  return (
                    <g
                      key={
                        `24-vertex-${sourceIndex}`
                      }
                      transform={
                        `translate(${point.x} ${point.y})`
                      }
                      className={
                        splitModeActive
                          ? styles[
                              `cell24DisplacementVertex${
                                displacementClassIndexByVertex.get(
                                  sourceIndex
                                )
                              }`
                            ]
                          : (
                              moved
                                ? styles.cell24MovedVertex
                                : styles.cell24FixedVertex
                            )
                      }
                    >
                      <title>
                        {
                          `#${sourceIndex + 1}: ` +
                          `(${source.join(", ")})/2 ` +
                          `→ vertex ${imageIndex + 1}`
                        }
                      </title>

                      <circle
                        r={
                          splitModeActive
                            ? 8.6
                            : 8
                        }
                      />

                      <text
                        x="0"
                        y="3"
                        textAnchor="middle"
                      >
                        {sourceIndex + 1}
                      </text>
                    </g>
                  );
                }
              )
            : null
        }
      </svg>

    </section>
  );
}



const TETRA_PROJECT_SCALE = 67;

const TETRA_PROJECT_CENTER =
  Object.freeze({
    x: 150,
    y: 122,
  });


function quaternionComponents(
  quaternion
) {
  /*
   * Project quaternions use doubled coordinates:
   *
   *   (A + B i + C j + D k) / 2.
   *
   * The common factor 1/2 disappears after normalization.
   */
  const values = [
    Number(quaternion.A),
    Number(quaternion.B),
    Number(quaternion.C),
    Number(quaternion.D),
  ];

  const norm =
    Math.hypot(
      values[0],
      values[1],
      values[2],
      values[3]
    );

  if (
    !Number.isFinite(norm) ||
    norm === 0
  ) {
    return [1, 0, 0, 0];
  }

  return values.map(
    (value) =>
      value / norm
  );
}


function normalizeQuaternion(
  quaternion
) {
  const norm =
    Math.hypot(
      quaternion[0],
      quaternion[1],
      quaternion[2],
      quaternion[3]
    );

  if (
    !Number.isFinite(norm) ||
    norm === 0
  ) {
    return [1, 0, 0, 0];
  }

  return quaternion.map(
    (value) =>
      value / norm
  );
}


function quaternionDot(
  left,
  right
) {
  return (
    left[0] * right[0] +
    left[1] * right[1] +
    left[2] * right[2] +
    left[3] * right[3]
  );
}


function slerpQuaternion(
  startQuaternion,
  targetQuaternion,
  t
) {
  const start =
    normalizeQuaternion(
      startQuaternion
    );

  let target =
    normalizeQuaternion(
      targetQuaternion
    );

  let dot =
    quaternionDot(
      start,
      target
    );

  /*
   * q and -q represent the same SO(3) rotation.
   * Choose the shorter interpolation.
   */
  if (dot < 0) {
    target =
      target.map(
        (value) =>
          -value
      );

    dot = -dot;
  }

  dot =
    Math.max(
      -1,
      Math.min(
        1,
        dot
      )
    );

  if (dot > 0.9995) {
    return normalizeQuaternion(
      start.map(
        (value, index) =>
          value +
          t *
          (
            target[index] -
            value
          )
      )
    );
  }

  const theta0 =
    Math.acos(dot);

  const sinTheta0 =
    Math.sin(theta0);

  const theta =
    theta0 * t;

  const startWeight =
    Math.sin(
      theta0 -
      theta
    ) /
    sinTheta0;

  const targetWeight =
    Math.sin(theta) /
    sinTheta0;

  return [
    startWeight * start[0] +
      targetWeight * target[0],

    startWeight * start[1] +
      targetWeight * target[1],

    startWeight * start[2] +
      targetWeight * target[2],

    startWeight * start[3] +
      targetWeight * target[3],
  ];
}


function rotateVectorByQuaternion(
  vector,
  quaternion
) {
  const [w, x, y, z] =
    quaternion;

  const [vx, vy, vz] =
    vector;

  /*
   * Unit-quaternion form of q v q^{-1}.
   */
  const tx =
    2 * (
      y * vz -
      z * vy
    );

  const ty =
    2 * (
      z * vx -
      x * vz
    );

  const tz =
    2 * (
      x * vy -
      y * vx
    );

  return [
    vx +
      w * tx +
      (
        y * tz -
        z * ty
      ),

    vy +
      w * ty +
      (
        z * tx -
        x * tz
      ),

    vz +
      w * tz +
      (
        x * ty -
        y * tx
      ),
  ];
}


function applyTetraCamera(
  vector
) {
  const [x, y, z] =
    vector;

  const cy =
    Math.cos(
      BASE_CAMERA_YAW
    );

  const sy =
    Math.sin(
      BASE_CAMERA_YAW
    );

  const cp =
    Math.cos(
      BASE_CAMERA_PITCH
    );

  const sp =
    Math.sin(
      BASE_CAMERA_PITCH
    );

  const x1 =
    cy * x +
    sy * z;

  const z1 =
    -sy * x +
    cy * z;

  const y2 =
    cp * y -
    sp * z1;

  const z2 =
    sp * y +
    cp * z1;

  return [
    x1,
    y2,
    z2,
  ];
}


function projectTetraVertex(
  vector
) {
  const [x, y, z] =
    applyTetraCamera(
      vector
    );

  const perspective =
    1 /
    (
      1 +
      0.11 * z
    );

  return {
    x:
      TETRA_PROJECT_CENTER.x +
      x *
      TETRA_PROJECT_SCALE *
      perspective,

    y:
      TETRA_PROJECT_CENTER.y -
      y *
      TETRA_PROJECT_SCALE *
      perspective,

    z,
  };
}


function easeInOutCubic(
  t
) {
  return (
    t < 0.5
      ? 4 * t * t * t
      : 1 -
        Math.pow(
          -2 * t + 2,
          3
        ) /
        2
  );
}


function matrixEntryText(
  doubledEntry
) {
  if (
    doubledEntry % 2 === 0
  ) {
    return String(
      doubledEntry / 2
    );
  }

  return `${doubledEntry}/2`;
}


function MatrixDisplay({
  element,
}) {
  const matrix2 =
    matrix2ForG288(
      element
    );

  const rows =
    matrix2.map(
      (row) =>
        row
          .map(
            matrixEntryText
          )
          .join(" & ")
    );

  const latex =
    `\\begin{pmatrix}` +
    rows.join(" \\\\ ") +
    `\\end{pmatrix}`;

  return (
    <div className={styles.matrixWrap}>
      <LatexInline
        latex={latex}
        className={
          styles.matrixKatex
        }
      />
    </div>
  );
}


function permutationCycleText(
  permutation
) {
  const visited =
    new Array(
      permutation.length
    ).fill(false);

  const cycles = [];

  for (
    let start = 0;
    start < permutation.length;
    start += 1
  ) {
    if (
      visited[start] ||
      permutation[start] === start
    ) {
      visited[start] = true;
      continue;
    }

    const cycle = [];
    let current = start;

    while (
      !visited[current]
    ) {
      visited[current] = true;
      cycle.push(current);
      current =
        permutation[current];
    }

    cycles.push(
      `(${cycle.join(" ")})`
    );
  }

  return (
    cycles.length > 0
      ? cycles.join("")
      : "identity"
  );
}


function TetrahedronDiagram({
  title,
  subtitle,
  permutation,
  factorQuaternion,
}) {
  const targetQuaternion =
    useMemo(
      () =>
        quaternionComponents(
          factorQuaternion
        ),
      [factorQuaternion]
    );

  const renderedQuaternionRef =
    useRef([1, 0, 0, 0]);

  const frameRef =
    useRef(null);

  const [
    renderedQuaternion,
    setRenderedQuaternion,
  ] =
    useState([
      1, 0, 0, 0,
    ]);


  useEffect(
    () => {
      if (
        frameRef.current !== null
      ) {
        window.cancelAnimationFrame(
          frameRef.current
        );
      }

      const startQuaternion =
        renderedQuaternionRef.current;

      let target =
        targetQuaternion;

      if (
        quaternionDot(
          startQuaternion,
          target
        ) < 0
      ) {
        target =
          target.map(
            (value) =>
              -value
          );
      }

      const duration = 620;

      let startTime = null;


      function animate(
        timestamp
      ) {
        if (
          startTime === null
        ) {
          startTime =
            timestamp;
        }

        const rawT =
          Math.min(
            1,
            (
              timestamp -
              startTime
            ) /
            duration
          );

        const easedT =
          easeInOutCubic(
            rawT
          );

        const nextQuaternion =
          slerpQuaternion(
            startQuaternion,
            target,
            easedT
          );

        renderedQuaternionRef.current =
          nextQuaternion;

        setRenderedQuaternion(
          nextQuaternion
        );

        if (rawT < 1) {
          frameRef.current =
            window.requestAnimationFrame(
              animate
            );
        } else {
          renderedQuaternionRef.current =
            target;

          frameRef.current =
            null;
        }
      }


      frameRef.current =
        window.requestAnimationFrame(
          animate
        );


      return () => {
        if (
          frameRef.current !== null
        ) {
          window.cancelAnimationFrame(
            frameRef.current
          );

          frameRef.current =
            null;
        }
      };
    },
    [targetQuaternion]
  );


  const projectedVertices =
    useMemo(
      () =>
        TETRA_VERTICES_3D.map(
          (vertex) =>
            projectTetraVertex(
              rotateVectorByQuaternion(
                vertex,
                renderedQuaternion
              )
            )
        ),
      [renderedQuaternion]
    );


  const sortedFaces =
    useMemo(
      () =>
        TETRA_FACES
          .map(
            (
              face,
              faceIndex
            ) => ({
              face,
              faceIndex,

              depth:
                (
                  projectedVertices[
                    face[0]
                  ].z +
                  projectedVertices[
                    face[1]
                  ].z +
                  projectedVertices[
                    face[2]
                  ].z
                ) /
                3,
            })
          )
          .sort(
            (
              left,
              right
            ) =>
              left.depth -
              right.depth
          ),
      [projectedVertices]
    );


  const sortedVertices =
    useMemo(
      () =>
        projectedVertices
          .map(
            (
              vertex,
              index
            ) => ({
              vertex,
              index,
            })
          )
          .sort(
            (
              left,
              right
            ) =>
              left.vertex.z -
              right.vertex.z
          ),
      [projectedVertices]
    );


  return (
    <section className={styles.tetraCard}>
      <div className={styles.tetraHeading}>
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>

        <div className={styles.cycleNotation}>
          {permutationCycleText(
            permutation
          )}
        </div>
      </div>

      <svg
        className={styles.tetraSvg}
        viewBox="-24 -28 348 301"
        role="img"
        aria-label={`${title} animated tetrahedral rotation`}
      >
        {sortedFaces.map(
          ({
            face,
            faceIndex,
            depth,
          }) => {
            const points =
              face
                .map(
                  (index) =>
                    `${
                      projectedVertices[
                        index
                      ].x
                    },${
                      projectedVertices[
                        index
                      ].y
                    }`
                )
                .join(" ");

            const opacity =
              Math.max(
                0.035,
                Math.min(
                  0.13,
                  0.075 +
                  0.025 * depth
                )
              );

            return (
              <polygon
                key={
                  `face-${faceIndex}`
                }
                points={points}
                className={
                  styles.tetraFace
                }
                style={{
                  fill:
                    TETRA_FACE_COLORS[
                      faceIndex
                    ],
                  opacity:
                    Math.max(
                      0.18,
                      Math.min(
                        0.42,
                        opacity * 3.1
                      )
                    ),
                }}
              />
            );
          }
        )}

        {TETRA_EDGES.map(
          ([left, right]) => (
            <line
              key={`${left}-${right}`}
              x1={
                projectedVertices[
                  left
                ].x
              }
              y1={
                projectedVertices[
                  left
                ].y
              }
              x2={
                projectedVertices[
                  right
                ].x
              }
              y2={
                projectedVertices[
                  right
                ].y
              }
              className={
                styles.tetraEdge
              }
            />
          )
        )}

        {sortedVertices.map(
          ({
            vertex,
            index,
          }) => {
            const image =
              permutation[index];

            const depthScale =
              1 +
              0.035 *
              vertex.z;

            return (
              <g
                key={index}
                transform={
                  `translate(${vertex.x} ${vertex.y}) scale(${depthScale})`
                }
              >
                <circle
                  r="15"
                  className={
                    image === index
                      ? styles.fixedVertex
                      : styles.movedVertex
                  }
                />

                <text
                  x="0"
                  y="5"
                  textAnchor="middle"
                  className={
                    styles.vertexNumber
                  }
                >
                  {index}
                </text>
              </g>
            );
          }
        )}
      </svg>

      <div className={styles.permutationRow}>
        {permutation.map(
          (image, index) => (
            <span
              key={index}
              className={
                styles.permutationCell
              }
            >
              {index}→{image}
            </span>
          )
        )}
      </div>
    </section>
  );
}


function permutationIsIdentity(
  permutation
) {
  return permutation.every(
    (image, index) =>
      image === index
  );
}


const QUOTIENT_C3X3_CELLS =
  (() => {
    const cells =
      new Map();

    G288.forEach(
      (
        element,
        elementIndex
      ) => {
        const coset =
          cosetContaining(
            element
          );

        if (!coset) {
          throw new Error(
            "Quotient census failed: element has no K32 coset."
          );
        }

        const coordinates =
          quotientCoordinates(
            coset
          );

        const key =
          `${coordinates.a},${coordinates.b}`;

        if (!cells.has(key)) {
          cells.set(
            key,
            {
              a: coordinates.a,
              b: coordinates.b,
              elementIndices: [],
            }
          );
        }

        cells.get(key)
          .elementIndices
          .push(
            elementIndex
          );
      }
    );


    const records =
      [...cells.values()]
        .sort(
          (left, right) =>
            left.b - right.b ||
            left.a - right.a
        )
        .map(
          (record) =>
            Object.freeze({
              a: record.a,
              b: record.b,

              elementIndices:
                Object.freeze([
                  ...record.elementIndices,
                ]),
            })
        );


    if (records.length !== 9) {
      throw new Error(
        "Quotient census failed: " +
        `expected 9 cosets, found ${records.length}.`
      );
    }


    for (const record of records) {
      if (
        record.elementIndices.length !== 32
      ) {
        throw new Error(
          "Quotient census failed: " +
          `coset (${record.a},${record.b}) has ` +
          `${record.elementIndices.length} elements instead of 32.`
        );
      }
    }


    const total =
      records.reduce(
        (
          sum,
          record
        ) =>
          sum +
          record.elementIndices.length,
        0
      );

    if (total !== 288) {
      throw new Error(
        "Quotient census failed: " +
        `expected 288 total elements, found ${total}.`
      );
    }


    return Object.freeze(
      records
    );
  })();


function oppositeEdgePairIndex(
  pair
) {
  const key =
    oppositeEdgePairFeatureKey(
      pair
    );

  return (
    TETRAHEDRON_OPPOSITE_EDGE_PAIR_FEATURES
      .findIndex(
        (candidate) =>
          oppositeEdgePairFeatureKey(
            candidate
          ) === key
      )
  );
}


function oppositeEdgePairLabel(
  pair
) {
  return (
    pair
      .map(
        (edge) =>
          edge.join("")
      )
      .join(", ")
  );
}


function edgeBelongsToPair(
  edge,
  pair
) {
  const edgeKey =
    [...edge]
      .sort(
        (left, right) =>
          left - right
      )
      .join("-");

  return pair.some(
    (candidate) =>
      [...candidate]
        .sort(
          (left, right) =>
            left - right
        )
        .join("-") ===
      edgeKey
  );
}


function OppositeEdgePairTetrahedron({
  title,
  pair,
}) {
  const projectedVertices =
    TETRA_VERTICES_3D.map(
      (vertex) =>
        projectTetraVertex(
          vertex
        )
    );

  const pairIndex =
    oppositeEdgePairIndex(
      pair
    );

  return (
    <div className={styles.quotientTetraCard}>
      <div className={styles.quotientTetraTitle}>
        {title}
      </div>

      <svg
        className={styles.quotientTetraSvg}
        viewBox="-8 -12 316 270"
        role="img"
        aria-label={
          `${title} opposite-edge pairing`
        }
      >
        {
          TETRA_EDGES.map(
            (
              edge,
              index
            ) => {
              const [
                left,
                right,
              ] = edge;

              const highlighted =
                edgeBelongsToPair(
                  edge,
                  pair
                );

              return (
                <line
                  key={
                    `quotient-edge-${index}`
                  }
                  x1={
                    projectedVertices[
                      left
                    ].x
                  }
                  y1={
                    projectedVertices[
                      left
                    ].y
                  }
                  x2={
                    projectedVertices[
                      right
                    ].x
                  }
                  y2={
                    projectedVertices[
                      right
                    ].y
                  }
                  className={
                    highlighted
                      ? styles.quotientTetraEdgeActive
                      : styles.quotientTetraEdge
                  }
                />
              );
            }
          )
        }

        {
          projectedVertices.map(
            (
              vertex,
              index
            ) => (
              <g
                key={
                  `quotient-vertex-${index}`
                }
                transform={
                  `translate(${vertex.x} ${vertex.y})`
                }
              >
                <circle
                  r="13"
                  className={
                    styles.quotientTetraVertex
                  }
                />

                <text
                  x="0"
                  y="4"
                  textAnchor="middle"
                  className={
                    styles.quotientTetraVertexNumber
                  }
                >
                  {index}
                </text>
              </g>
            )
          )
        }
      </svg>

      <div className={styles.quotientPairReadout}>
        Pair {pairIndex + 1}:{" "}
        <LatexInline
          latex={
            `\\{${oppositeEdgePairLabel(pair)}\\}`
          }
          className={
            styles.inlineKatex
          }
        />
      </div>
    </div>
  );
}


const PAIRED_ORBIT_TYPES =
  Object.freeze({
    opposite: Object.freeze({
      id: "opposite",
      label: "Opposite-edge pairs",
      shortLabel: "Opposite edges",
      features:
        TETRAHEDRON_OPPOSITE_EDGE_PAIR_FEATURES,
      data:
        PAIRED_OPPOSITE_EDGE_DATA,
      act:
        actOnPairedOppositeEdgePair,
      key:
        pairedOppositeEdgePairKey,
      orbitSize: 9,
      stabilizerSize: 32,
    }),

    vertex: Object.freeze({
      id: "vertex",
      label: "Vertices",
      shortLabel: "Vertices",
      features:
        TETRAHEDRON_VERTEX_FEATURES,
      data:
        PAIRED_VERTEX_DATA,
      act:
        actOnPairedVertex,
      key:
        pairedVertexKey,
      orbitSize: 16,
      stabilizerSize: 18,
    }),

    edge: Object.freeze({
      id: "edge",
      label: "Edges",
      shortLabel: "Edges",
      features:
        TETRAHEDRON_EDGE_FEATURES,
      data:
        PAIRED_EDGE_DATA,
      act:
        actOnPairedEdge,
      key:
        pairedEdgeKey,
      orbitSize: 36,
      stabilizerSize: 8,
    }),
  });


function pairedFeatureLabel(
  orbitType,
  feature
) {
  if (orbitType === "opposite") {
    return (
      "{" +
      feature
        .map(
          (edge) =>
            edge.join("")
        )
        .join(", ") +
      "}"
    );
  }

  if (orbitType === "vertex") {
    return String(feature);
  }

  return feature.join("");
}


function pairedStateText(
  orbitType,
  pair
) {
  return (
    pairedFeatureLabel(
      orbitType,
      pair.left
    ) +
    " × " +
    pairedFeatureLabel(
      orbitType,
      pair.right
    )
  );
}


function pairedOppositeEdgeStateText(
  pair
) {
  return (
    `{${oppositeEdgePairLabel(pair.left)}}` +
    " × " +
    `{${oppositeEdgePairLabel(pair.right)}}`
  );
}


function stabilizerIndicesForPairedState(
  config,
  pairedState
) {
  const targetKey =
    config.key(
      pairedState
    );

  const indices =
    G288
      .map(
        (
          element,
          index
        ) => {
          const image =
            config.act(
              element,
              pairedState
            );

          return (
            config.key(
              image
            ) === targetKey
              ? index
              : null
          );
        }
      )
      .filter(
        (index) =>
          index !== null
      );


  if (
    indices.length !==
    config.stabilizerSize
  ) {
    throw new Error(
      `${config.label} stabilizer mismatch: ` +
      `expected ${config.stabilizerSize}, ` +
      `found ${indices.length}.`
    );
  }

  return Object.freeze(
    indices
  );
}


function PairedFeatureTetrahedron({
  title,
  orbitType,
  feature,
}) {
  const projectedVertices =
    TETRA_VERTICES_3D.map(
      (vertex) =>
        projectTetraVertex(
          vertex
        )
    );

  const activeVertex =
    orbitType === "vertex"
      ? feature
      : null;

  const activeEdges =
    orbitType === "edge"
      ? [feature]
      : orbitType === "opposite"
        ? feature
        : [];


  function edgeActive(
    edge
  ) {
    const key =
      [...edge]
        .sort(
          (a, b) =>
            a - b
        )
        .join("-");

    return activeEdges.some(
      (candidate) =>
        [...candidate]
          .sort(
            (a, b) =>
              a - b
          )
          .join("-") === key
    );
  }


  return (
    <div className={styles.quotientTetraCard}>
      <div className={styles.quotientTetraTitle}>
        {title}
      </div>

      <svg
        className={styles.quotientTetraSvg}
        viewBox="-8 -12 316 270"
      >
        {
          TETRA_EDGES.map(
            (
              edge,
              index
            ) => {
              const [
                left,
                right,
              ] = edge;

              return (
                <line
                  key={index}
                  x1={
                    projectedVertices[left].x
                  }
                  y1={
                    projectedVertices[left].y
                  }
                  x2={
                    projectedVertices[right].x
                  }
                  y2={
                    projectedVertices[right].y
                  }
                  className={
                    edgeActive(edge)
                      ? styles.quotientTetraEdgeActive
                      : styles.quotientTetraEdge
                  }
                />
              );
            }
          )
        }

        {
          projectedVertices.map(
            (
              vertex,
              index
            ) => (
              <g
                key={index}
                transform={
                  `translate(${vertex.x} ${vertex.y})`
                }
              >
                <circle
                  r={
                    activeVertex === index
                      ? 17
                      : 13
                  }
                  className={
                    activeVertex === index
                      ? styles.quotientTetraVertexActive
                      : styles.quotientTetraVertex
                  }
                />

                <text
                  x="0"
                  y="4"
                  textAnchor="middle"
                  className={
                    styles.quotientTetraVertexNumber
                  }
                >
                  {index}
                </text>
              </g>
            )
          )
        }
      </svg>

      <div className={styles.quotientPairReadout}>
        {
          orbitType === "opposite"
            ? "Pair "
            : orbitType === "vertex"
              ? "Vertex "
              : "Edge "
        }

        {pairedFeatureLabel(
          orbitType,
          feature
        )}
      </div>
    </div>
  );
}


function QuotientC3xC3Diagram({
  currentCoordinates,
  currentElement,
  currentElementKey,
  onSelectCoset,
  onSelectElement,
}) {
  const [
    orbitType,
    setOrbitType,
  ] = useState("opposite");

  const config =
    PAIRED_ORBIT_TYPES[
      orbitType
    ];
  const basePairedState =
    config.data.feature;

  const pairedState =
    config.act(
      currentElement,
      basePairedState
    );

  const pairedStateKey =
    config.key(
      pairedState
    );

  const stabilizerIndices =
    useMemo(
      () =>
        stabilizerIndicesForPairedState(
          config,
          pairedState
        ),
      [
        orbitType,
        pairedStateKey,
      ]
    );

  const isBaseState =
    pairedStateKey ===
    config.key(
      basePairedState
    );


  const orbitStates =
    useMemo(
      () =>
        config.features.flatMap(
          (left) =>
            config.features.map(
              (right) => ({
                left,
                right,
              })
            )
        ),
      [orbitType]
    );


  function representativeForState(
    state
  ) {
    const stateKey =
      config.key(
        state
      );

    return G288.findIndex(
      (candidate) =>
        config.key(
          config.act(
            candidate,
            basePairedState
          )
        ) === stateKey
    );
  }


  return (
    <section className={styles.quotientGridCard}>
      <div className={styles.quotientGridHeading}>
        <div>
          <h3>
            Quotient by K₃₂
          </h3>

          <p>
            9 cosets · 32 elements each
          </p>
        </div>

        <LatexInline
          latex={
            "G_{288}/K_{32}\\cong C_3\\times C_3"
          }
          className={
            styles.quotientGridEquation
          }
        />
      </div>


      <div className={styles.orbitTypeSelector}>
        {
          Object.values(
            PAIRED_ORBIT_TYPES
          ).map(
            (candidate) => (
              <button
                key={
                  candidate.id
                }
                type="button"
                className={
                  orbitType ===
                  candidate.id
                    ? styles.orbitTypeButtonActive
                    : styles.orbitTypeButton
                }
                onClick={() =>
                  setOrbitType(
                    candidate.id
                  )
                }
              >
                {candidate.label}
              </button>
            )
          )
        }
      </div>


      {
        orbitType === "opposite"
          ? (
            <div className={styles.quotientGrid}>
        {
          QUOTIENT_C3X3_CELLS.map(
            (cell) => {
              const active =
                currentCoordinates &&
                currentCoordinates.a ===
                  cell.a &&
                currentCoordinates.b ===
                  cell.b;

              const isKernel =
                cell.a === 0 &&
                cell.b === 0;

              return (
                <button
                  key={
                    `${cell.a},${cell.b}`
                  }
                  type="button"
                  className={
                    active
                      ? styles.quotientGridCellActive
                      : styles.quotientGridCell
                  }
                  onClick={() =>
                    onSelectCoset(
                      cell
                    )
                  }
                >
                  <div className={styles.quotientGridCoordinate}>
                    <LatexInline
                      latex={
                        `(${cell.a},${cell.b})`
                      }
                      className={
                        styles.quotientGridCoordinateMath
                      }
                    />
                  </div>

                  <div className={styles.quotientGridCellMeta}>
                    {config.stabilizerSize} elements
                  </div>

                  {
                    isKernel
                      ? (
                        <div className={styles.quotientKernelTag}>
                          <LatexInline
                            latex="K_{32}"
                            className={
                              styles.inlineKatex
                            }
                          />
                        </div>
                      )
                      : null
                  }
                </button>
              );
            }
          )
        }
            </div>
          )
          : (
            <div
              className={
                orbitType === "vertex"
                  ? styles.orbitStateGrid4
                  : styles.orbitStateGrid6
              }
            >
              {
                orbitStates.map(
                  (
                    state,
                    index
                  ) => {
                    const stateKey =
                      config.key(
                        state
                      );

                    const active =
                      stateKey ===
                      pairedStateKey;

                    const representativeIndex =
                      representativeForState(
                        state
                      );

                    return (
                      <button
                        key={
                          `${orbitType}-${stateKey}`
                        }
                        type="button"
                        className={
                          active
                            ? styles.orbitStateCellActive
                            : styles.orbitStateCell
                        }
                        onClick={() =>
                          onSelectElement(
                            representativeIndex
                          )
                        }
                      >
                        <div>
                          {pairedFeatureLabel(
                            orbitType,
                            state.left
                          )}
                          {" × "}
                          {pairedFeatureLabel(
                            orbitType,
                            state.right
                          )}
                        </div>

                        <small>
                          {config.stabilizerSize} elements
                        </small>
                      </button>
                    );
                  }
                )
              }
            </div>
          )
      }


      <div className={styles.quotientOrbitSection}>
        <div className={styles.quotientOrbitHeading}>
          <div>
            <div className={styles.quotientOrbitTitle}>
              Paired {config.shortLabel.toLowerCase()} state
            </div>

            <div className={styles.quotientOrbitSubtitle}>
              The selected coset sends the base state to this exact pair.
            </div>
          </div>

          <div className={styles.quotientOrbitStats}>
            <span>
              Orbit{" "}
              <strong>
                {config.orbitSize}
              </strong>
            </span>

            <span>
              Stabilizer{" "}
              <strong>
                {config.stabilizerSize}
              </strong>
            </span>
          </div>
        </div>

        <div className={styles.quotientStateTransport}>
          <span className={styles.quotientStateTransportLabel}>
            Base
          </span>

          <span className={styles.quotientStateTransportValue}>
            {pairedStateText(
              orbitType,
              basePairedState
            )}
          </span>

          <span
            className={styles.quotientStateTransportArrow}
            aria-hidden="true"
          >
            →
          </span>

          <span className={styles.quotientStateTransportLabel}>
            Current
          </span>

          <span className={styles.quotientStateTransportValue}>
            {pairedStateText(
              orbitType,
              pairedState
            )}
          </span>
        </div>


        <div className={styles.quotientTetraPair}>
          <PairedFeatureTetrahedron
            title="Left tetrahedron"
            orbitType={
              orbitType
            }
            feature={
              pairedState.left
            }
          />

          <PairedFeatureTetrahedron
            title="Right tetrahedron"
            orbitType={
              orbitType
            }
            feature={
              pairedState.right
            }
          />
        </div>

        <div className={styles.quotientStabilizerNote}>
          {
            isBaseState &&
            orbitType === "opposite"
              ? (
                <>
                  The stabilizer of this base paired state is exactly{" "}
                  <LatexInline
                    latex="K_{32}"
                    className={
                      styles.inlineKatex
                    }
                  />
                  .
                </>
              )
              : (
                <>
                  This state has its own conjugate
                  32-element stabilizer.
                </>
              )
          }
        </div>


        <details className={styles.quotientStabilizerDetails}>
          <summary className={styles.quotientStabilizerSummary}>
            <span>
              Stabilizer
            </span>

            <strong>
              32 elements
            </strong>

            {
              isBaseState &&
              orbitType === "opposite"
                ? (
                  <span className={styles.quotientStabilizerK32}>
                    = K₃₂
                  </span>
                )
                : null
            }
          </summary>

          <div className={styles.quotientStabilizerElements}>
            {
              stabilizerIndices.map(
                (elementIndex) => {
                  const candidate =
                    G288[
                      elementIndex
                    ];

                  const active =
                    candidate.key ===
                    currentElementKey;

                  return (
                    <button
                      key={
                        candidate.key
                      }
                      type="button"
                      className={
                        active
                          ? styles.quotientStabilizerElementActive
                          : styles.quotientStabilizerElement
                      }
                      onClick={() =>
                        onSelectElement(
                          elementIndex
                        )
                      }
                    >
                      #{elementIndex + 1}
                    </button>
                  );
                }
              )
            }
          </div>
        </details>
      </div>


      <div className={styles.quotientGridExplanation}>
        Each square is one coset of{" "}
        <LatexInline
          latex="K_{32}"
          className={
            styles.inlineKatex
          }
        />
        . Together they make the exact factorization{" "}
        <LatexInline
          latex={String.raw`288=9\times32`}
          className={
            styles.inlineKatex
          }
        />
        .
      </div>
    </section>
  );
}


function exactElementData(
  element
) {
  const spectral =
    SPECTRAL_BY_KEY.get(
      element.key
    );

  const coset =
    cosetContaining(
      element
    );

  const coordinates =
    coset
      ? quotientCoordinates(
          coset
        )
      : null;

  const tetrahedral =
    tetrahedralActionForG288(
      element
    );

  return {
    spectral,
    coordinates,
    tetrahedral,
  };
}


function projectiveDirectionContainsElement(
  direction,
  elementKey
) {
  return direction.elements.some(
    (record) =>
      record.element.key ===
      elementKey
  );
}


function projectiveDirectionLatex(
  direction
) {
  if (
    direction.type === "coupling"
  ) {
    return (
      `L_{${direction.leftAxis}}` +
      `R_{${direction.rightAxis}}`
    );
  }

  const [
    side,
    axis,
  ] =
    direction.label.split("_");

  return (
    `${side}_{${axis}}`
  );
}


function FiniteGeometryViewTabs({
  value,
  onChange,
}) {
  return (
    <div className={styles.finiteGeometryViewTabs}>
      <button
        type="button"
        className={
          value === "points"
            ? styles.finiteGeometryViewTabActive
            : styles.finiteGeometryViewTab
        }
        onClick={() =>
          onChange(
            "points"
          )
        }
      >
        Projective points
      </button>

      <button
        type="button"
        className={
          value === "doily"
            ? styles.finiteGeometryViewTabActive
            : styles.finiteGeometryViewTab
        }
        onClick={() =>
          onChange(
            "doily"
          )
        }
      >
        Doily
      </button>

      <button
        type="button"
        className={
          value === "ovoid"
            ? styles.finiteGeometryViewTabActive
            : styles.finiteGeometryViewTab
        }
        onClick={() =>
          onChange(
            "ovoid"
          )
        }
      >
        Ovoids
      </button>

      <button
        type="button"
        className={
          value === "incidence"
            ? styles.finiteGeometryViewTabActive
            : styles.finiteGeometryViewTab
        }
        onClick={() =>
          onChange(
            "incidence"
          )
        }
      >
        Incidence graph
      </button>
    </div>
  );
}


function doilyPointShortLabel(
  point
) {
  return (
    point.type === "coupling"
      ? `L${point.leftAxis}R${point.rightAxis}`
      : point.label.replace(
          "_",
          ""
        )
  );
}


function CompactDoilyDiagram({
  currentElementKey,
  onSelectElement,
  ovoidPointIds = null,
}) {
  const activePoint =
    K32_DOILY_DATA.points.find(
      (point) =>
        projectiveDirectionContainsElement(
          point,
          currentElementKey
        )
    ) ?? null;


  const activeLineIndices =
    activePoint
      ? new Set(
          K32_DOILY_DATA
            .lineIndicesByPointId
            .get(
              activePoint.id
            )
        )
      : new Set();


  const collinearPointIds =
    new Set();


  if (activePoint) {
    for (
      const lineIndex of
      activeLineIndices
    ) {
      for (
        const pointId of
        K32_DOILY_DATA.lines[
          lineIndex
        ].pointIds
      ) {
        if (
          pointId !==
          activePoint.id
        ) {
          collinearPointIds.add(
            pointId
          );
        }
      }
    }
  }


  const centerX = 300;
  const centerY = 245;

  const outerRadius = 190;


  const positions =
    new Map();


  /*
   * Outer pentagon vertices.
   */
  for (
    let index = 0;
    index < 5;
    index += 1
  ) {
    const angle =
      -Math.PI / 2 +
      (
        2 *
        Math.PI *
        index
      ) /
      5;

    positions.set(
      `O${index}`,
      {
        x:
          centerX +
          outerRadius *
            Math.cos(angle),

        y:
          centerY +
          outerRadius *
            Math.sin(angle),
      }
    );
  }


  /*
   * Five points on the outer pentagon edges.
   */
  for (
    let index = 0;
    index < 5;
    index += 1
  ) {
    const left =
      positions.get(
        `O${index}`
      );

    const right =
      positions.get(
        `O${(index + 1) % 5}`
      );

    positions.set(
      `E${index}`,
      {
        x:
          (
            left.x +
            right.x
          ) /
          2,

        y:
          (
            left.y +
            right.y
          ) /
          2,
      }
    );
  }


  /*
   * Five interior points on the straight doily lines.
   */
  for (
    let index = 0;
    index < 5;
    index += 1
  ) {
    const start =
      positions.get(
        `O${index}`
      );

    const end =
      positions.get(
        `E${(index + 2) % 5}`
      );

    const t = 0.30;

    positions.set(
      `I${index}`,
      {
        x:
          start.x +
          (
            end.x -
            start.x
          ) *
          t,

        y:
          start.y +
          (
            end.y -
            start.y
          ) *
          t,
      }
    );
  }


  function pointAt(
    name
  ) {
    const point =
      positions.get(
        name
      );

    if (!point) {
      throw new Error(
        `Missing compact doily coordinate ${name}.`
      );
    }

    return point;
  }


  /*
   * A quadratic Bézier passing exactly through the requested
   * middle point at t = 1/2.
   */
  function quadraticThrough(
    start,
    middle,
    end
  ) {
    const exactControl = {
      x:
        2 * middle.x -
        (
          start.x +
          end.x
        ) /
        2,

      y:
        2 * middle.y -
        (
          start.y +
          end.y
        ) /
        2,
    };


    /*
     * Push the control point radially away from the center.
     *
     * This changes only the isotopy of the rendered curve.
     * The curve still passes through the exact middle point
     * because the final control is constructed from that
     * middle-point condition.
     */
    const radialX =
      exactControl.x -
      centerX;

    const radialY =
      exactControl.y -
      centerY;

    const radialLength =
      Math.hypot(
        radialX,
        radialY
      ) || 1;

    const bow = 28;

    const targetControl = {
      x:
        exactControl.x +
        (
          radialX /
          radialLength
        ) *
        bow,

      y:
        exactControl.y +
        (
          radialY /
          radialLength
        ) *
        bow,
    };


    /*
     * Re-solve the quadratic midpoint condition after the
     * outward shift so the displayed curve still passes
     * exactly through 'middle'.
     */
    const midpointCorrection = {
      x:
        2 * middle.x -
        (
          start.x +
          end.x
        ) /
        2,

      y:
        2 * middle.y -
        (
          start.y +
          end.y
        ) /
        2,
    };


    const control = {
      x:
        (
          targetControl.x +
          midpointCorrection.x
        ) /
        2,

      y:
        (
          targetControl.y +
          midpointCorrection.y
        ) /
        2,
    };


    return (
      `M ${start.x} ${start.y} ` +
      `Q ${control.x} ${control.y} ` +
      `${end.x} ${end.y}`
    );
  }


  const displayNames = [
    ...Array.from(
      {
        length: 5,
      },
      (
        _,
        index
      ) =>
        `O${index}`
    ),

    ...Array.from(
      {
        length: 5,
      },
      (
        _,
        index
      ) =>
        `E${index}`
    ),

    ...Array.from(
      {
        length: 5,
      },
      (
        _,
        index
      ) =>
        `I${index}`
    ),
  ];


  return (
    <div className={styles.compactDoilyWrap}>
      <div className={styles.doilyStats}>
        <span>
          <strong>
            15
          </strong>
          {" "}points
        </span>

        <span>
          <strong>
            15
          </strong>
          {" "}lines
        </span>

        <span>
          <strong>
            3
          </strong>
          {" "}points / line
        </span>

        <span>
          <strong>
            3
          </strong>
          {" "}lines / point
        </span>
      </div>


      <svg
        className={styles.compactDoilySvg}
        viewBox="0 0 600 490"
        role="img"
        aria-label="Fivefold doily drawing derived from exact K32 incidence"
      >
        {
          K32_STANDARD_DOILY_LAYOUT
            .lineLayouts
            .map(
              (
                layout,
                index
              ) => {
                const active =
                  activeLineIndices.has(
                    layout.line.index
                  );

                const first =
                  pointAt(
                    layout.names[0]
                  );

                const middle =
                  pointAt(
                    layout.names[1]
                  );

                const last =
                  pointAt(
                    layout.names[2]
                  );


                const path =
                  layout.type ===
                  "arc"
                    ? quadraticThrough(
                        first,
                        middle,
                        last
                      )
                    : (
                        `M ${first.x} ${first.y} ` +
                        `L ${last.x} ${last.y}`
                      );


                return (
                  <path
                    key={
                      `compact-doily-line-${index}`
                    }
                    d={
                      path
                    }
                    className={
                      ovoidPointIds
                        ? (
                          layout.type ===
                          "arc"
                            ? styles.compactDoilyArc
                            : styles.compactDoilyLine
                        )
                        : active
                          ? styles.compactDoilyLineActive
                          : activePoint
                            ? styles.compactDoilyLineDimmed
                            : layout.type ===
                              "arc"
                              ? styles.compactDoilyArc
                              : styles.compactDoilyLine
                    }
                  />
                );
              }
            )
        }


        {
          displayNames.map(
            (templateName) => {
              const point =
                K32_STANDARD_DOILY_LAYOUT
                  .templateNameToPoint
                  .get(
                    templateName
                  );

              const position =
                pointAt(
                  templateName
                );

              const active =
                activePoint?.id ===
                point.id;

              const collinear =
                collinearPointIds.has(
                  point.id
                );

              const inOvoid =
                ovoidPointIds?.has(
                  point.id
                ) ?? false;


              return (
                <g
                  key={
                    templateName
                  }
                  transform={
                    `translate(${position.x} ${position.y})`
                  }
                  className={
                    styles.doilyPointGroup
                  }
                  onClick={() =>
                    onSelectElement(
                      point.elements[0]
                        .elementIndex
                    )
                  }
                >
                  <circle
                    r={
                      templateName.startsWith(
                        "O"
                      )
                        ? 20
                        : 18
                    }
                    className={
                      ovoidPointIds
                        ? (
                          inOvoid
                            ? styles.compactDoilyPointOvoid
                            : styles.compactDoilyPointOvoidDimmed
                        )
                        : active
                          ? styles.doilyPointActive
                          : collinear
                            ? styles.compactDoilyPointNeighbor
                            : activePoint
                              ? styles.compactDoilyPointDimmed
                              : point.type ===
                                "complex"
                                ? styles.doilyPointComplex
                                : styles.doilyPointCoupling
                    }
                  />

                  <text
                    x="0"
                    y="-2"
                    textAnchor="middle"
                    className={
                      styles.doilyPointIndex
                    }
                  >
                    {
                      point.projectiveIndex +
                      1
                    }
                  </text>

                  <text
                    x="0"
                    y="9"
                    textAnchor="middle"
                    className={
                      styles.doilyPointLabel
                    }
                  >
                    {
                      doilyPointShortLabel(
                        point
                      )
                    }
                  </text>
                </g>
              );
            }
          )
        }


        <circle
          cx={centerX}
          cy={centerY}
          r="3"
          className={
            styles.compactDoilyCenterMark
          }
        />
      </svg>


      <div className={styles.compactDoilyLegend}>
        <span>
          10 straight lines
        </span>

        <span>
          5 curved lines
        </span>
      </div>


      <div className={styles.doilyExplanation}>
        The fivefold doily uses the same 15 exact commuting
        triples as the audit incidence graph. Selecting a point
        highlights its three lines and its six collinear
        neighbors.
      </div>
    </div>
  );
}


function OvoidExplorer({
  currentElementKey,
  onSelectElement,
}) {
  const [
    selectedOvoidIndex,
    setSelectedOvoidIndex,
  ] = useState(0);

  const [
    symmetryMode,
    setSymmetryMode,
  ] = useState("all");

  const [
    symmetryIndex,
    setSymmetryIndex,
  ] = useState(0);


  const selectedOvoid =
    K32_DOILY_OVOIDS[
      selectedOvoidIndex
    ];


  const symmetryData =
    K32_DOILY_OVOID_SYMMETRY_DATA[
      selectedOvoidIndex
    ];


  const visibleSymmetries =
    symmetryMode === "s6"
      ? K32_DOILY_AUTOMORPHISM_DATA.automorphisms
      : symmetryMode === "derangements"
        ? symmetryData.derangements
        : symmetryData.stabilizer;


  const selectedSymmetry =
    visibleSymmetries[
      symmetryIndex %
      visibleSymmetries.length
    ];


  const selectedAutomorphism =
    symmetryMode === "s6"
      ? selectedSymmetry
      : selectedSymmetry.automorphism;


  const selectedPointPermutation =
    symmetryMode === "s6"
      ? null
      : selectedSymmetry.pointPermutation;


  const ovoidPermutation =
    selectedAutomorphism.ovoidPermutation;


  useEffect(
    () => {
      setSymmetryIndex(0);
    },
    [
      selectedOvoidIndex,
      symmetryMode,
    ]
  );


  function stepSymmetry(
    delta
  ) {
    setSymmetryIndex(
      (current) =>
        (
          current +
          delta +
          visibleSymmetries.length
        ) %
        visibleSymmetries.length
    );
  }


  function stepOvoid(
    delta
  ) {
    setSelectedOvoidIndex(
      (current) =>
        (
          current +
          delta +
          K32_DOILY_OVOIDS.length
        ) %
        K32_DOILY_OVOIDS.length
    );
  }


  return (
    <div className={styles.ovoidExplorer}>
      <div className={styles.ovoidHeader}>
        <div>
          <strong>
            Six exact ovoids
          </strong>

          <span>
            five pairwise noncollinear points · one point on every line
          </span>
        </div>

        <div className={styles.ovoidNavigator}>
          <button
            type="button"
            onClick={() =>
              stepOvoid(-1)
            }
            aria-label="Previous ovoid"
          >
            ←
          </button>

          <span>
            Ovoid{" "}
            {selectedOvoidIndex + 1}
            {" / "}
            {K32_DOILY_OVOIDS.length}
          </span>

          <button
            type="button"
            onClick={() =>
              stepOvoid(1)
            }
            aria-label="Next ovoid"
          >
            →
          </button>
        </div>
      </div>


      <div className={styles.ovoidWorkspace}>
        <div className={styles.ovoidControlColumn}>

          <div className={styles.ovoidSelector}>
        {
          K32_DOILY_OVOIDS.map(
            (
              ovoid,
              index
            ) => (
              <button
                key={
                  index
                }
                type="button"
                className={
                  index ===
                  selectedOvoidIndex
                    ? styles.ovoidSelectorButtonActive
                    : styles.ovoidSelectorButton
                }
                onClick={() =>
                  setSelectedOvoidIndex(
                    index
                  )
                }
              >
                {index + 1}

                <span>
                  {
                    ovoid.points
                      .map(
                        (point) =>
                          point.projectiveIndex + 1
                      )
                      .join(" · ")
                  }
                </span>
              </button>
            )
          )
        }
      </div>


      <div className={styles.ovoidSymmetryPanel}>
        <div className={styles.ovoidSymmetryStats}>
          <div>
            <strong>
              720
            </strong>

            <span>
              automorphisms
            </span>

            <small>
              6!
            </small>
          </div>

          <div>
            <strong>
              6
            </strong>

            <span>
              ovoid orbit
            </span>

            <small>
              transitive
            </small>
          </div>

          <div>
            <strong>
              120
            </strong>

            <span>
              stabilizer
            </span>

            <small>
              5!
            </small>
          </div>

          <div>
            <strong>
              44
            </strong>

            <span>
              derangements
            </span>

            <small>
              !5
            </small>
          </div>
        </div>


        <div className={styles.ovoidSymmetryControls}>
          <div className={styles.ovoidSymmetryMode}>
            <button
              type="button"
              className={
                symmetryMode === "s6"
                  ? styles.ovoidSymmetryModeActive
                  : styles.ovoidSymmetryModeButton
              }
              onClick={() =>
                setSymmetryMode(
                  "s6"
                )
              }
            >
              All S6 720
            </button>

            <button
              type="button"
              className={
                symmetryMode === "all"
                  ? styles.ovoidSymmetryModeActive
                  : styles.ovoidSymmetryModeButton
              }
              onClick={() =>
                setSymmetryMode(
                  "all"
                )
              }
            >
              Stabilizer 120
            </button>

            <button
              type="button"
              className={
                symmetryMode === "derangements"
                  ? styles.ovoidSymmetryModeActive
                  : styles.ovoidSymmetryModeButton
              }
              onClick={() =>
                setSymmetryMode(
                  "derangements"
                )
              }
            >
              Derangements 44
            </button>
          </div>


          <div className={styles.ovoidSymmetryNavigator}>
            <button
              type="button"
              onClick={() =>
                stepSymmetry(-1)
              }
            >
              ←
            </button>

            <span>
              {
                symmetryIndex + 1
              }
              {" / "}
              {
                visibleSymmetries.length
              }
            </span>

            <button
              type="button"
              onClick={() =>
                stepSymmetry(1)
              }
            >
              →
            </button>
          </div>
        </div>


        <div className={styles.ovoidOrbitMap}>
          <svg
            viewBox="0 0 360 138"
            className={styles.ovoidOrbitSvg}
            role="img"
            aria-label="Permutation of the six exact ovoids"
          >
            <defs>
              <marker
                id="ovoid-arrow"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path
                  d="M 0 0 L 10 5 L 0 10 z"
                  className={styles.ovoidOrbitArrowHead}
                />
              </marker>
            </defs>

            {
              ovoidPermutation.map(
                (
                  imageIndex,
                  sourceIndex
                ) => {
                  if (
                    imageIndex ===
                    sourceIndex
                  ) {
                    return null;
                  }

                  const angleA =
                    -Math.PI / 2 +
                    sourceIndex *
                      Math.PI / 3;

                  const angleB =
                    -Math.PI / 2 +
                    imageIndex *
                      Math.PI / 3;

                  const radius = 48;
                  const cx = 180;
                  const cy = 69;

                  const x1 =
                    cx +
                    radius *
                      Math.cos(angleA);

                  const y1 =
                    cy +
                    radius *
                      Math.sin(angleA);

                  const x2 =
                    cx +
                    radius *
                      Math.cos(angleB);

                  const y2 =
                    cy +
                    radius *
                      Math.sin(angleB);

                  const dx = x2 - x1;
                  const dy = y2 - y1;

                  const length =
                    Math.hypot(dx, dy) || 1;

                  const bend =
                    sourceIndex < imageIndex
                      ? 13
                      : -13;

                  const mx =
                    (x1 + x2) / 2 -
                    (dy / length) * bend;

                  const my =
                    (y1 + y2) / 2 +
                    (dx / length) * bend;

                  return (
                    <path
                      key={
                        `ovoid-map-${sourceIndex}`
                      }
                      d={
                        `M ${x1} ${y1} ` +
                        `Q ${mx} ${my} ${x2} ${y2}`
                      }
                      className={
                        styles.ovoidOrbitArrow
                      }
                      markerEnd="url(#ovoid-arrow)"
                    />
                  );
                }
              )
            }

            {
              K32_DOILY_OVOIDS.map(
                (
                  _ovoid,
                  index
                ) => {
                  const angle =
                    -Math.PI / 2 +
                    index *
                      Math.PI / 3;

                  const radius = 48;

                  const x =
                    180 +
                    radius *
                      Math.cos(angle);

                  const y =
                    69 +
                    radius *
                      Math.sin(angle);

                  const isSelected =
                    index ===
                    selectedOvoidIndex;

                  const isSelectedImage =
                    index ===
                    ovoidPermutation[
                      selectedOvoidIndex
                    ];

                  const fixed =
                    ovoidPermutation[index] ===
                    index;

                  return (
                    <g
                      key={index}
                      transform={
                        `translate(${x} ${y})`
                      }
                      className={
                        styles.ovoidOrbitNodeGroup
                      }
                      onClick={() =>
                        setSelectedOvoidIndex(
                          index
                        )
                      }
                    >
                      <circle
                        r="17"
                        className={
                          isSelected
                            ? styles.ovoidOrbitNodeSelected
                            : isSelectedImage
                              ? styles.ovoidOrbitNodeImage
                              : fixed
                                ? styles.ovoidOrbitNodeFixed
                                : styles.ovoidOrbitNode
                        }
                      />

                      <text
                        x="0"
                        y="4"
                        textAnchor="middle"
                        className={
                          styles.ovoidOrbitNodeText
                        }
                      >
                        O{index + 1}
                      </text>
                    </g>
                  );
                }
              )
            }
          </svg>

          <div className={styles.ovoidOrbitCaption}>
            O{selectedOvoidIndex + 1}
            {" → "}
            O{
              ovoidPermutation[
                selectedOvoidIndex
              ] + 1
            }
            {
              symmetryMode !== "s6"
                ? " · selected ovoid fixed by its stabilizer"
                : " · full S6 action on six ovoids"
            }
          </div>
        </div>


        {selectedPointPermutation && (
          <div className={styles.ovoidPermutationRow}>
            {
              selectedOvoid.points.map(
                (
                  point,
                  index
                ) => {
                  const imageIndex =
                    selectedPointPermutation[
                      index
                    ];

                  const imagePoint =
                    selectedOvoid.points[
                      imageIndex
                    ];


                  return (
                    <div
                      key={
                        point.id
                      }
                      className={
                        index === imageIndex
                          ? styles.ovoidPermutationFixed
                          : styles.ovoidPermutationMoved
                      }
                    >
                      <LatexInline
                        latex={
                          projectiveDirectionLatex(
                            point
                          )
                        }
                        className={
                          styles.inlineKatex
                        }
                      />

                      <span>
                        →
                      </span>

                      <LatexInline
                        latex={
                          projectiveDirectionLatex(
                            imagePoint
                          )
                        }
                        className={
                          styles.inlineKatex
                        }
                      />
                    </div>
                  );
                }
              )
            }
          </div>
        )}


        <div className={styles.ovoidSymmetryStatus}>
          {
            symmetryMode === "s6"
              ? (
                `Ovoid permutation: ${
                  ovoidPermutation
                    .map(
                      (image, index) =>
                        `${index + 1}→${image + 1}`
                    )
                    .join(" · ")
                }`
              )
              : selectedSymmetry.derangement
                ? "Fixed-point-free permutation of the five ovoid points."
                : "This stabilizer element fixes at least one ovoid point."
          }
        </div>
      </div>

        </div>

        <div className={styles.ovoidGeometryColumn}>

          <CompactDoilyDiagram
        currentElementKey={
          currentElementKey
        }
        onSelectElement={
          onSelectElement
        }
        ovoidPointIds={
          selectedOvoid.pointIdSet
        }
      />


      <div className={styles.ovoidPointList}>
        {
          selectedOvoid.points.map(
            (point) => (
              <button
                key={
                  point.id
                }
                type="button"
                onClick={() =>
                  onSelectElement(
                    point.elements[0]
                      .elementIndex
                  )
                }
              >
                <LatexInline
                  latex={
                    projectiveDirectionLatex(
                      point
                    )
                  }
                  className={
                    styles.inlineKatex
                  }
                />
              </button>
            )
          )
        }
      </div>


          <div className={styles.ovoidExplanation}>
            Every highlighted five-point set meets each of the
            15 exact doily lines in exactly one point. No two
            highlighted points are collinear.
          </div>

        </div>
      </div>
    </div>
  );
}


function DoilyIncidenceDiagram({
  currentElementKey,
  onSelectElement,
}) {
  const activePoint =
    K32_DOILY_DATA.points.find(
      (point) =>
        projectiveDirectionContainsElement(
          point,
          currentElementKey
        )
    ) ?? null;


  const activeLineIndices =
    activePoint
      ? new Set(
          K32_DOILY_DATA
            .lineIndicesByPointId
            .get(
              activePoint.id
            )
        )
      : new Set();


  /*
   * This first exact rendering is the Levi/incidence graph:
   *
   *   outer ring = the 15 projective points
   *   inner ring = the 15 derived projective lines
   *
   * Every edge is one actual point-line incidence.
   *
   * The next presentation layer can isotop this exact graph
   * into the familiar compact "doily" drawing without changing
   * any incidence data.
   */
  const centerX = 300;
  const centerY = 245;

  const pointRadius = 190;
  const lineRadius = 105;


  const pointPositions =
    new Map(
      K32_DOILY_DATA.points.map(
        (
          point,
          index
        ) => {
          const angle =
            -Math.PI / 2 +
            (
              2 *
              Math.PI *
              index
            ) /
            K32_DOILY_DATA
              .points.length;

          return [
            point.id,
            {
              x:
                centerX +
                pointRadius *
                  Math.cos(angle),

              y:
                centerY +
                pointRadius *
                  Math.sin(angle),
            },
          ];
        }
      )
    );


  const linePositions =
    K32_DOILY_DATA.lines.map(
      (
        line,
        index
      ) => {
        const angle =
          -Math.PI / 2 +
          (
            2 *
            Math.PI *
            (
              index +
              0.5
            )
          ) /
          K32_DOILY_DATA
            .lines.length;

        return {
          line,
          x:
            centerX +
            lineRadius *
              Math.cos(angle),

          y:
            centerY +
            lineRadius *
              Math.sin(angle),
        };
      }
    );


  return (
    <div className={styles.doilyWrap}>
      <div className={styles.doilyStats}>
        <span>
          <strong>
            15
          </strong>
          {" "}points
        </span>

        <span>
          <strong>
            15
          </strong>
          {" "}lines
        </span>

        <span>
          <strong>
            3
          </strong>
          {" "}points / line
        </span>

        <span>
          <strong>
            3
          </strong>
          {" "}lines / point
        </span>
      </div>


      <svg
        className={styles.doilySvg}
        viewBox="0 0 600 490"
        role="img"
        aria-label="Exact point-line incidence graph derived from K32"
      >
        {
          linePositions.flatMap(
            ({
              line,
              x,
              y,
            }) =>
              line.pointIds.map(
                (pointId) => {
                  const point =
                    pointPositions.get(
                      pointId
                    );

                  const active =
                    activePoint?.id ===
                      pointId ||
                    activeLineIndices.has(
                      line.index
                    );

                  return (
                    <line
                      key={
                        `${line.key}-${pointId}`
                      }
                      x1={
                        point.x
                      }
                      y1={
                        point.y
                      }
                      x2={x}
                      y2={y}
                      className={
                        active
                          ? styles.doilyIncidenceActive
                          : styles.doilyIncidence
                      }
                    />
                  );
                }
              )
          )
        }


        {
          linePositions.map(
            ({
              line,
              x,
              y,
            }) => {
              const active =
                activeLineIndices.has(
                  line.index
                );

              return (
                <g
                  key={
                    line.key
                  }
                  transform={
                    `translate(${x} ${y})`
                  }
                >
                  <circle
                    r="10"
                    className={
                      active
                        ? styles.doilyLineNodeActive
                        : styles.doilyLineNode
                    }
                  />

                  <text
                    x="0"
                    y="3"
                    textAnchor="middle"
                    className={
                      styles.doilyLineNumber
                    }
                  >
                    {line.index + 1}
                  </text>
                </g>
              );
            }
          )
        }


        {
          K32_DOILY_DATA.points.map(
            (
              point,
              index
            ) => {
              const position =
                pointPositions.get(
                  point.id
                );

              const active =
                activePoint?.id ===
                point.id;

              return (
                <g
                  key={
                    point.id
                  }
                  transform={
                    `translate(${position.x} ${position.y})`
                  }
                  className={
                    styles.doilyPointGroup
                  }
                  onClick={() =>
                    onSelectElement(
                      point.elements[0]
                        .elementIndex
                    )
                  }
                >
                  <circle
                    r="22"
                    className={
                      active
                        ? styles.doilyPointActive
                        : point.type ===
                          "complex"
                          ? styles.doilyPointComplex
                          : styles.doilyPointCoupling
                    }
                  />

                  <text
                    x="0"
                    y="-1"
                    textAnchor="middle"
                    className={
                      styles.doilyPointIndex
                    }
                  >
                    {index + 1}
                  </text>

                  <text
                    x="0"
                    y="11"
                    textAnchor="middle"
                    className={
                      styles.doilyPointLabel
                    }
                  >
                    {
                      point.type ===
                      "coupling"
                        ? `L${point.leftAxis}R${point.rightAxis}`
                        : point.label.replace(
                            "_",
                            ""
                          )
                    }
                  </text>
                </g>
              );
            }
          )
        }


        <g
          transform={
            `translate(${centerX} ${centerY})`
          }
        >
          <text
            x="0"
            y="-7"
            textAnchor="middle"
            className={
              styles.doilyCenterTitle
            }
          >
            W(3,2)
          </text>

          <text
            x="0"
            y="10"
            textAnchor="middle"
            className={
              styles.doilyCenterMeta
            }
          >
            exact incidence
          </text>
        </g>
      </svg>


      <div className={styles.doilyLineList}>
        {
          K32_DOILY_DATA.lines.map(
            (line) => (
              <div
                key={
                  line.key
                }
                className={
                  activeLineIndices.has(
                    line.index
                  )
                    ? styles.doilyLineChipActive
                    : styles.doilyLineChip
                }
              >
                <span>
                  {line.index + 1}
                </span>

                <div>
                  {
                    line.pointIds.map(
                      (
                        pointId,
                        pointIndex
                      ) => {
                        const point =
                          K32_DOILY_DATA
                            .pointById
                            .get(
                              pointId
                            );

                        return (
                          <span
                            key={
                              pointId
                            }
                          >
                            {
                              pointIndex > 0
                                ? " · "
                                : ""
                            }

                            {
                              point.type ===
                              "coupling"
                                ? `L${point.leftAxis}R${point.rightAxis}`
                                : point.label
                            }
                          </span>
                        );
                      }
                    )
                  }
                </div>
              </div>
            )
          )
        }
      </div>


      <div className={styles.doilyExplanation}>
        Every inner node is one commuting triple derived from
        exact multiplication in K₃₂. Selecting an outer point
        highlights exactly its three incident lines.
      </div>
    </div>
  );
}


function FiniteGeometryDiagram({
  currentElementKey,
  onSelectElement,
}) {
  const [
    finiteView,
    setFiniteView,
  ] = useState("doily");


  const activeDirection =
    K32_PROJECTIVE_DATA.points.find(
      (direction) =>
        projectiveDirectionContainsElement(
          direction,
          currentElementKey
        )
    ) ?? null;


  const currentIsProjectiveZero =
    K32_PROJECTIVE_DATA.zero.some(
      (record) =>
        record.element.key ===
        currentElementKey
    );


  function selectDirection(
    direction
  ) {
    onSelectElement(
      direction.elements[0]
        .elementIndex
    );
  }


  if (
    finiteView === "doily" ||
    finiteView === "ovoid" ||
    finiteView === "incidence"
  ) {
    const auditView =
      finiteView ===
      "incidence";

    const ovoidView =
      finiteView ===
      "ovoid";

    return (
      <section className={styles.finiteGeometryCard}>
        <div className={styles.finiteGeometryHeading}>
          <div>
            <h3>
              Finite geometry
            </h3>

            <p>
              {
                auditView
                  ? "Exact point-line incidence graph of the 15 projective directions"
                  : ovoidView
                    ? "Six exact five-point ovoids of the derived doily"
                    : "Fivefold doily presentation of the exact K32 incidence"
              }
            </p>
          </div>

          <FiniteGeometryViewTabs
            value={
              finiteView
            }
            onChange={
              setFiniteView
            }
          />

          <LatexInline
            latex={
              "W(3,2)"
            }
            className={
              styles.finiteGeometryEquation
            }
          />
        </div>

        {
          auditView
            ? (
              <DoilyIncidenceDiagram
                currentElementKey={
                  currentElementKey
                }
                onSelectElement={
                  onSelectElement
                }
              />
            )
            : ovoidView
              ? (
                <OvoidExplorer
                  currentElementKey={
                    currentElementKey
                  }
                  onSelectElement={
                    onSelectElement
                  }
                />
              )
              : (
                <CompactDoilyDiagram
                  currentElementKey={
                    currentElementKey
                  }
                  onSelectElement={
                    onSelectElement
                  }
                />
              )
        }
      </section>
    );
  }


  return (
    <section className={styles.finiteGeometryCard}>
      <div className={styles.finiteGeometryHeading}>
        <div>
          <h3>
            Finite geometry
          </h3>

          <p>
            Projective quotient of the 32-core
          </p>
        </div>

        <LatexInline
          latex={
            "15=9+6"
          }
          className={
            styles.finiteGeometryEquation
          }
        />
      </div>

      <FiniteGeometryViewTabs
        value={
          finiteView
        }
        onChange={
          setFiniteView
        }
      />


      <div className={styles.projectiveCollapse}>
        <div className={styles.projectiveCollapseSource}>
          <LatexInline
            latex="K_{32}"
            className={
              styles.inlineKatex
            }
          />

          <span>
            32 elements
          </span>
        </div>

        <span
          className={styles.projectiveCollapseArrow}
          aria-hidden="true"
        >
          →
        </span>

        <div className={styles.projectiveCollapseCenter}>
          quotient by{" "}
          <LatexInline
            latex="\{I,-I\}"
            className={
              styles.inlineKatex
            }
          />
        </div>

        <span
          className={styles.projectiveCollapseArrow}
          aria-hidden="true"
        >
          →
        </span>

        <div className={styles.projectiveCollapseTarget}>
          <strong>
            15
          </strong>

          <span>
            nonzero projective directions
          </span>
        </div>
      </div>


      <div className={styles.projectiveZeroRow}>
        <span>
          Projective zero/reference
        </span>

        <div className={styles.projectiveZeroPair}>
          {
            K32_PROJECTIVE_DATA.zero.map(
              (record) => (
                <button
                  key={
                    record.element.key
                  }
                  type="button"
                  className={
                    record.element.key ===
                    currentElementKey
                      ? styles.projectiveZeroButtonActive
                      : styles.projectiveZeroButton
                  }
                  onClick={() =>
                    onSelectElement(
                      record.elementIndex
                    )
                  }
                >
                  {record.label}
                </button>
              )
            )
          }
        </div>

        <LatexInline
          latex="\{I,-I\}\mapsto 0"
          className={
            styles.inlineKatex
          }
        />
      </div>


      <div className={styles.projectivePointSection}>
        <div className={styles.projectivePointSectionHeading}>
          <div>
            <strong>
              9 coupling directions
            </strong>

            <span>
              each collapses two opposite K₃₂ elements
            </span>
          </div>

          <LatexInline
            latex="18\,/\,2=9"
            className={
              styles.inlineKatex
            }
          />
        </div>

        <div className={styles.projectiveCouplingGrid}>
          {
            K32_PROJECTIVE_DATA
              .couplingDirections
              .map(
                (direction) => {
                  const active =
                    activeDirection?.id ===
                    direction.id;

                  return (
                    <button
                      key={
                        direction.id
                      }
                      type="button"
                      className={
                        active
                          ? styles.projectivePointCouplingActive
                          : styles.projectivePointCoupling
                      }
                      onClick={() =>
                        selectDirection(
                          direction
                        )
                      }
                    >
                      <span className={styles.projectivePointNumber}>
                        {direction.projectiveIndex + 1}
                      </span>

                      <LatexInline
                        latex={
                          projectiveDirectionLatex(
                            direction
                          )
                        }
                        className={
                          styles.projectivePointMath
                        }
                      />

                      <small>
                        ± pair
                      </small>
                    </button>
                  );
                }
              )
          }
        </div>
      </div>


      <div className={styles.projectivePointSection}>
        <div className={styles.projectivePointSectionHeading}>
          <div>
            <strong>
              6 complex directions
            </strong>

            <span>
              left/right complex structures modulo orientation
            </span>
          </div>

          <LatexInline
            latex="12\,/\,2=6"
            className={
              styles.inlineKatex
            }
          />
        </div>

        <div className={styles.projectiveComplexGrid}>
          {
            K32_PROJECTIVE_DATA
              .complexDirections
              .map(
                (direction) => {
                  const active =
                    activeDirection?.id ===
                    direction.id;

                  return (
                    <button
                      key={
                        direction.id
                      }
                      type="button"
                      className={
                        active
                          ? styles.projectivePointComplexActive
                          : styles.projectivePointComplex
                      }
                      onClick={() =>
                        selectDirection(
                          direction
                        )
                      }
                    >
                      <span className={styles.projectivePointNumber}>
                        {direction.projectiveIndex + 1}
                      </span>

                      <LatexInline
                        latex={
                          projectiveDirectionLatex(
                            direction
                          )
                        }
                        className={
                          styles.projectivePointMath
                        }
                      />

                      <small>
                        ± orientation
                      </small>
                    </button>
                  );
                }
              )
          }
        </div>
      </div>


      <div className={styles.projectiveSplitSummary}>
        <div>
          <strong>
            9
          </strong>

          <span>
            left-right couplings
          </span>
        </div>

        <span className={styles.projectivePlus}>
          +
        </span>

        <div>
          <strong>
            6
          </strong>

          <span>
            complex directions
          </span>
        </div>

        <span className={styles.projectiveEquals}>
          =
        </span>

        <div>
          <strong>
            15
          </strong>

          <span>
            projective points
          </span>
        </div>
      </div>


      <div className={styles.finiteGeometryExplanation}>
        {
          currentIsProjectiveZero
            ? (
              <>
                The current element belongs to the central pair{" "}
                <LatexInline
                  latex="\{I,-I\}"
                  className={
                    styles.inlineKatex
                  }
                />
                , which collapses to the projective zero/reference.
              </>
            )
            : activeDirection
              ? (
                <>
                  The current element and its central-sign partner
                  represent the same projective direction{" "}
                  <LatexInline
                    latex={
                      projectiveDirectionLatex(
                        activeDirection
                      )
                    }
                    className={
                      styles.inlineKatex
                    }
                  />
                  .
                </>
              )
              : (
                <>
                  The current element lies outside{" "}
                  <LatexInline
                    latex="K_{32}"
                    className={
                      styles.inlineKatex
                    }
                  />
                  . Select one of the 15 projective points above
                  to enter the finite geometry.
                </>
              )
        }
      </div>
    </section>
  );
}


function CoreElementButton({
  record,
  currentElementKey,
  onSelectElement,
  children,
}) {
  const active =
    record.element.key ===
    currentElementKey;

  return (
    <button
      type="button"
      className={
        active
          ? styles.coreElementButtonActive
          : styles.coreElementButton
      }
      onClick={() =>
        onSelectElement(
          record.elementIndex
        )
      }
    >
      {children}
    </button>
  );
}


function k32SpectralStructuralRole(
  family
) {
  const familyKeySet =
    new Set(
      family.elementKeys
    );


  const centerMatches =
    K32_CORE_DATA.center.filter(
      (record) =>
        familyKeySet.has(
          record.element.key
        )
    );


  const complexMatches =
    K32_CORE_DATA.complexDirections
      .flatMap(
        (direction) =>
          direction.elements
      )
      .filter(
        (record) =>
          familyKeySet.has(
            record.element.key
          )
      );


  const couplingMatches =
    K32_CORE_DATA.couplingDirections
      .flatMap(
        (direction) =>
          direction.elements
      )
      .filter(
        (record) =>
          familyKeySet.has(
            record.element.key
          )
      );


  const totalMatches =
    centerMatches.length +
    complexMatches.length +
    couplingMatches.length;


  if (
    totalMatches !==
    family.count
  ) {
    throw new Error(
      "K32 spectral/structural bridge failed: " +
      `family S${family.familyIndex + 1} contains ` +
      `${family.count} spectral elements but ${totalMatches} ` +
      "structural matches."
    );
  }


  if (
    family.count === 1 &&
    centerMatches.length === 1
  ) {
    return centerMatches[0].label === "I"
      ? "Identity"
      : "Central inversion";
  }


  if (
    complexMatches.length ===
    family.count
  ) {
    return "Complex operations";
  }


  if (
    couplingMatches.length ===
    family.count
  ) {
    return "Left-right couplings";
  }


  throw new Error(
    "K32 spectral family does not match a unique structural role."
  );
}


function Core32Diagram({
  currentElementKey,
  onSelectElement,
}) {
  const categoryForElementKey =
    (elementKey) => {
      if (
        K32_CORE_DATA.center.some(
          (record) =>
            record.element.key ===
            elementKey
        )
      ) {
        return "center";
      }

      if (
        K32_CORE_DATA.complexDirections.some(
          (direction) =>
            direction.elements.some(
              (record) =>
                record.element.key ===
                elementKey
            )
        )
      ) {
        return "complex";
      }

      if (
        K32_CORE_DATA.couplingDirections.some(
          (direction) =>
            direction.elements.some(
              (record) =>
                record.element.key ===
                elementKey
            )
        )
      ) {
        return "couplings";
      }

      return null;
    };


  const currentCategory =
    categoryForElementKey(
      currentElementKey
    );


  const [
    selectedCoreCategory,
    setSelectedCoreCategory,
  ] = useState(
    currentCategory ??
    "center"
  );


  useEffect(
    () => {
      if (currentCategory) {
        setSelectedCoreCategory(
          currentCategory
        );
      }
    },
    [
      currentCategory,
    ]
  );


  const currentInCore =
    K32_CORE_DATA.center.some(
      (record) =>
        record.element.key ===
        currentElementKey
    ) ||
    K32_CORE_DATA.complexDirections.some(
      (direction) =>
        direction.elements.some(
          (record) =>
            record.element.key ===
            currentElementKey
        )
    ) ||
    K32_CORE_DATA.couplingDirections.some(
      (direction) =>
        direction.elements.some(
          (record) =>
            record.element.key ===
            currentElementKey
        )
    );


  return (
    <section className={styles.core32Card}>
      <div className={styles.core32Heading}>
        <div>
          <h3>
            32-core
          </h3>

          <p>
            Exact internal structure of the normal subgroup K₃₂
          </p>
        </div>

        <LatexInline
          latex={
            "32=2+18+12"
          }
          className={
            styles.core32MainEquation
          }
        />
      </div>


      {
        !currentInCore
          ? (
            <div className={styles.core32OutsideNotice}>
              The current element lies outside K₃₂.
              Select any core element below to inspect it.
            </div>
          )
          : null
      }


      <div className={styles.core32UnifiedSummary}>
        <div className={styles.core32UnifiedHeader}>
          <span>
            Structural role
          </span>

          <span>
            Elements
          </span>

          <span>
            Spectral family
          </span>

          <span>
            Rotation angles
          </span>
        </div>

        <div className={styles.core32UnifiedRows}>
          {
            K32_SPECTRAL_SUMMARY.map(
              (family) => {
                const active =
                  family
                    .elementKeys
                    .includes(
                      currentElementKey
                    );

                const structuralRole =
                  k32SpectralStructuralRole(
                    family
                  );

                return (
                  <button
                    key={
                      family.polynomialText
                    }
                    type="button"
                    className={
                      active
                        ? styles.core32UnifiedRowActive
                        : styles.core32UnifiedRow
                    }
                    onClick={() =>
                      onSelectElement(
                        family
                          .elementIndices[0]
                      )
                    }
                  >
                    <span className={styles.core32UnifiedRole}>
                      {
                        structuralRole ===
                        "Identity"
                          ? (
                            <LatexInline
                              latex="I"
                              className={
                                styles.core32UnifiedRoleMath
                              }
                            />
                          )
                          : structuralRole ===
                            "Central inversion"
                            ? (
                              <LatexInline
                                latex="-I"
                                className={
                                  styles.core32UnifiedRoleMath
                                }
                              />
                            )
                            : structuralRole ===
                            "Complex operations"
                            ? "Complex"
                            : structuralRole ===
                              "Left-right couplings"
                              ? "Couplings"
                              : structuralRole
                      }
                    </span>

                    <strong className={styles.core32UnifiedCount}>
                      {family.count}
                    </strong>

                    <span className={styles.core32UnifiedFamily}>
                      S{
                        family.familyIndex +
                        1
                      }
                    </span>

                    <LatexInline
                      latex={
                        family.angles
                      }
                      className={
                        styles.core32UnifiedAngles
                      }
                    />
                  </button>
                );
              }
            )
          }
        </div>

      </div>


      <div className={styles.core32CategoryTabs}>
        <button
          type="button"
          className={
            selectedCoreCategory ===
            "center"
              ? styles.core32CategoryTabActive
              : styles.core32CategoryTab
          }
          onClick={() =>
            setSelectedCoreCategory(
              "center"
            )
          }
        >
          <strong>
            2
          </strong>

          <span>
            Central pair
          </span>
        </button>

        <button
          type="button"
          className={
            selectedCoreCategory ===
            "complex"
              ? styles.core32CategoryTabActive
              : styles.core32CategoryTab
          }
          onClick={() =>
            setSelectedCoreCategory(
              "complex"
            )
          }
        >
          <strong>
            12
          </strong>

          <span>
            Complex operations
          </span>
        </button>

        <button
          type="button"
          className={
            selectedCoreCategory ===
            "couplings"
              ? styles.core32CategoryTabActive
              : styles.core32CategoryTab
          }
          onClick={() =>
            setSelectedCoreCategory(
              "couplings"
            )
          }
        >
          <strong>
            18
          </strong>

          <span>
            Left-right couplings
          </span>
        </button>
      </div>


      <div className={styles.core32CompactDetail}>
        {
          selectedCoreCategory ===
          "center"
            ? (
              <>
                <div className={styles.core32CompactTitle}>
                  <span>
                    Central pair
                  </span>

                  <LatexInline
                    latex="\{I,-I\}"
                    className={
                      styles.inlineKatex
                    }
                  />
                </div>

                <div className={styles.core32CompactCenter}>
                  {
                    K32_CORE_DATA.center.map(
                      (record) => {
                        const active =
                          record.element.key ===
                          currentElementKey;

                        return (
                          <button
                            key={
                              record.element.key
                            }
                            type="button"
                            className={
                              active
                                ? styles.core32CompactElementActive
                                : styles.core32CompactElement
                            }
                            onClick={() =>
                              onSelectElement(
                                record.elementIndex
                              )
                            }
                          >
                            <span>
                              {record.label}
                            </span>

                            <small>
                              #{record.elementIndex + 1}
                            </small>
                          </button>
                        );
                      }
                    )
                  }
                </div>
              </>
            )
            : selectedCoreCategory ===
              "complex"
              ? (
                <>
                  <div className={styles.core32CompactTitle}>
                    <span>
                      Complex operations
                    </span>

                    <LatexInline
                      latex="12=6\times2"
                      className={
                        styles.inlineKatex
                      }
                    />
                  </div>

                  <div className={styles.core32CompactMatrix}>
                    <div className={styles.core32CompactMatrixHeader}>
                      <span>
                        Direction
                      </span>

                      <span>
                        Orientation 1
                      </span>

                      <span>
                        Orientation 2
                      </span>
                    </div>

                    {
                      K32_CORE_DATA
                        .complexDirections
                        .map(
                          (direction) => (
                            <div
                              key={
                                direction.direction
                              }
                              className={
                                styles.core32CompactMatrixRow
                              }
                            >
                              <LatexInline
                                latex={
                                  direction.direction
                                    .replace(
                                      "_",
                                      "_{"
                                    ) +
                                  "}"
                                }
                                className={
                                  styles.core32CompactDirection
                                }
                              />

                              {
                                direction.elements.map(
                                  (record) => {
                                    const active =
                                      record.element.key ===
                                      currentElementKey;

                                    return (
                                      <button
                                        key={
                                          record.element.key
                                        }
                                        type="button"
                                        className={
                                          active
                                            ? styles.core32CompactElementActive
                                            : styles.core32CompactElement
                                        }
                                        onClick={() =>
                                          onSelectElement(
                                            record.elementIndex
                                          )
                                        }
                                      >
                                        #{record.elementIndex + 1}
                                      </button>
                                    );
                                  }
                                )
                              }
                            </div>
                          )
                        )
                    }
                  </div>
                </>
              )
              : (
                <>
                  <div className={styles.core32CompactTitle}>
                    <span>
                      Left-right couplings
                    </span>

                    <LatexInline
                      latex="18=9\times2"
                      className={
                        styles.inlineKatex
                      }
                    />
                  </div>

                  <div className={styles.core32CompactMatrix}>
                    <div className={styles.core32CompactMatrixHeader}>
                      <span>
                        Direction
                      </span>

                      <span>
                        Orientation 1
                      </span>

                      <span>
                        Orientation 2
                      </span>
                    </div>

                    {
                      K32_CORE_DATA
                        .couplingDirections
                        .map(
                          (direction) => (
                            <div
                              key={
                                `${direction.leftAxis}:${direction.rightAxis}`
                              }
                              className={
                                styles.core32CompactMatrixRow
                              }
                            >
                              <LatexInline
                                latex={
                                  `L_${direction.leftAxis}R_${direction.rightAxis}`
                                }
                                className={
                                  styles.core32CompactDirection
                                }
                              />

                              {
                                direction.elements.map(
                                  (record) => {
                                    const active =
                                      record.element.key ===
                                      currentElementKey;

                                    return (
                                      <button
                                        key={
                                          record.element.key
                                        }
                                        type="button"
                                        className={
                                          active
                                            ? styles.core32CompactElementActive
                                            : styles.core32CompactElement
                                        }
                                        onClick={() =>
                                          onSelectElement(
                                            record.elementIndex
                                          )
                                        }
                                      >
                                        #{record.elementIndex + 1}
                                      </button>
                                    );
                                  }
                                )
                              }
                            </div>
                          )
                        )
                    }
                  </div>
                </>
              )
        }
      </div>


    </section>
  );
}


function CyclicOrbitDiagram({
  generator,
  exponent,
  onSelectPower,
  onSelectGenerator,
}) {
  const order =
    g288ElementOrder(
      generator
    );

  const powers =
    useMemo(
      () =>
        Array.from(
          {
            length: order,
          },
          (_, powerExponent) =>
            powerG288(
              generator,
              powerExponent
            )
        ),
      [
        generator,
        order,
      ]
    );


  const subgroupIndex =
    order === 12
      ? C12_SUBGROUP_INDEX_BY_ELEMENT_KEY.get(
          generator.key
        )
      : undefined;


  if (
    order === 12 &&
    subgroupIndex === undefined
  ) {
    throw new Error(
      "Order-12 generator is missing from the exact C12 census."
    );
  }


  const halfTurn =
    order === 12
      ? powers[6]
      : null;

  if (
    order === 12
  ) {
    const halfAction =
      tetrahedralActionForG288(
        halfTurn
      );

    const halfIsCentral =
      g288ElementOrder(
        halfTurn
      ) === 2 &&
      permutationIsIdentity(
        halfAction.left
      ) &&
      permutationIsIdentity(
        halfAction.right
      );

    if (!halfIsCentral) {
      throw new Error(
        "Order-12 half-power is not the central -I element."
      );
    }
  }


  function stepC12Subgroup(
    delta
  ) {
    if (
      subgroupIndex === undefined
    ) {
      return;
    }

    const nextIndex =
      (
        subgroupIndex +
        delta +
        C12_SUBGROUPS.length
      ) %
      C12_SUBGROUPS.length;

    const nextGeneratorIndex =
      C12_SUBGROUPS[
        nextIndex
      ].primitiveGeneratorIndices[0];

    onSelectGenerator(
      nextGeneratorIndex
    );
  }


  return (
    <section className={styles.cyclicOrbitCard}>
      <div className={styles.cyclicOrbitHeading}>
        <div>
          <h3>
            Cyclic orbit
          </h3>

          <p>
            Exact powers of the selected generator
          </p>
        </div>

        <div className={styles.cyclicOrbitOrder}>
          <LatexInline
            latex={
              `\\operatorname{ord}(g)=${order}`
            }
            className={
              styles.inlineKatex
            }
          />
        </div>
      </div>


      {
        order === 12
          ? (
            <div className={styles.c12Overview}>
              <div className={styles.c12OverviewHeader}>
                <div className={styles.c12OverviewTitle}>
                  <strong>
                    24 distinct C₁₂ subgroups
                  </strong>

                  <span>
                    96 order-12 elements = 24 × 4 primitive generators
                  </span>
                </div>

                <div className={styles.c12OverviewNavigator}>
                  <button
                    type="button"
                    aria-label="Previous C12 subgroup"
                    onClick={() =>
                      stepC12Subgroup(-1)
                    }
                  >
                    ←
                  </button>

                  <span>
                    {subgroupIndex + 1}
                    {" / "}
                    {C12_SUBGROUPS.length}
                  </span>

                  <button
                    type="button"
                    aria-label="Next C12 subgroup"
                    onClick={() =>
                      stepC12Subgroup(1)
                    }
                  >
                    →
                  </button>
                </div>
              </div>

              <div className={styles.c12SubgroupGrid}>
                {
                  C12_SUBGROUPS.map(
                    (
                      subgroup,
                      index
                    ) => {
                      const active =
                        index ===
                        subgroupIndex;

                      const primitiveElementNumbers =
                        subgroup
                          .primitiveGeneratorIndices
                          .map(
                            (elementIndex) =>
                              elementIndex + 1
                          );

                      return (
                        <button
                          key={
                            subgroup.key
                          }
                          type="button"
                          className={
                            active
                              ? styles.c12SubgroupCellActive
                              : styles.c12SubgroupCell
                          }
                          title={
                            "Primitive generators: " +
                            primitiveElementNumbers
                              .map(
                                (number) =>
                                  `#${number}`
                              )
                              .join(", ")
                          }
                          onClick={() =>
                            onSelectGenerator(
                              subgroup
                                .primitiveGeneratorIndices[0]
                            )
                          }
                        >
                          <span className={styles.c12SubgroupNumber}>
                            {index + 1}
                          </span>

                          <span
                            className={styles.c12PrimitiveDots}
                            aria-label="four primitive generators"
                          >
                            {
                              subgroup
                                .primitiveGeneratorIndices
                                .map(
                                  (
                                    elementIndex
                                  ) => (
                                    <i
                                      key={
                                        elementIndex
                                      }
                                    />
                                  )
                                )
                            }
                          </span>
                        </button>
                      );
                    }
                  )
                }
              </div>
            </div>
          )
          : null
      }


      <div className={styles.cyclicOrbitStage}>
        <div className={styles.cyclicOrbitGuide} />

        {
          powers.map(
            (
              powerElement,
              powerExponent
            ) => {
              const angle =
                (
                  2 *
                  Math.PI *
                  powerExponent
                ) /
                order;

              const x =
                50 +
                39 *
                Math.cos(angle);

              const y =
                50 -
                39 *
                Math.sin(angle);

              const active =
                powerExponent ===
                (
                  exponent %
                  order
                );

              const primitive =
                powerExponent > 0 &&
                gcdInteger(
                  powerExponent,
                  order
                ) === 1;

              const centralHalfTurn =
                order === 12 &&
                powerExponent === 6;

              return (
                <button
                  key={
                    powerElement.key
                  }
                  type="button"
                  className={
                    active
                      ? styles.cyclicNodeActive
                      : primitive
                        ? styles.cyclicNodePrimitive
                        : styles.cyclicNode
                  }
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                  }}
                  onClick={() =>
                    onSelectPower(
                      powerExponent
                    )
                  }
                >
                  <span className={styles.cyclicNodePower}>
                    {
                      powerExponent === 0
                        ? "1"
                        : `g^${powerExponent}`
                    }
                  </span>

                  {
                    centralHalfTurn
                      ? (
                        <span className={styles.cyclicNodeSpecial}>
                          −I
                        </span>
                      )
                      : primitive &&
                        order === 12
                        ? (
                          <span className={styles.cyclicNodeSpecial}>
                            primitive
                          </span>
                        )
                        : null
                  }
                </button>
              );
            }
          )
        }


        <div className={styles.cyclicOrbitCenter}>
          <LatexInline
            latex={
              `\\langle g\\rangle\\cong C_{${order}}`
            }
            className={
              styles.cyclicOrbitCenterMath
            }
          />

          {
            order === 12
              ? (
                <span>
                  12 steps · 4 primitive generators
                </span>
              )
              : (
                <span>
                  {order} elements
                </span>
              )
          }
        </div>
      </div>


      {
        order === 12
          ? (
            <div className={styles.cyclicOrbitExplanation}>
              Primitive exponents{" "}
              <LatexInline
                latex="1,5,7,11"
                className={
                  styles.inlineKatex
                }
              />
              . The halfway power is{" "}
              <LatexInline
                latex="g^6=-I"
                className={
                  styles.inlineKatex
                }
              />
              , and{" "}
              <LatexInline
                latex="g^{12}=I"
                className={
                  styles.inlineKatex
                }
              />
              .
            </div>
          )
          : (
            <div className={styles.cyclicOrbitExplanation}>
              Clicking a node selects that exact power of the
              current generator.
            </div>
          )
      }
    </section>
  );
}


function ConjugacyClassDiagram({
  currentElementKey,
  onSelectElement,
  onSelectDisplacementType,
}) {
  const currentClassIndex =
    G288_CONJUGACY_CLASS_DATA
      .classIndexByElementKey
      .get(
        currentElementKey
      ) ?? 0;


  const [
    selectedClassIndex,
    setSelectedClassIndex,
  ] = useState(
    currentClassIndex
  );


  useEffect(
    () => {
      setSelectedClassIndex(
        currentClassIndex
      );
    },
    [
      currentClassIndex,
    ]
  );


  const selectedClass =
    G288_CONJUGACY_CLASS_DATA
      .classes[
        selectedClassIndex
      ];


  const selectedSpectralFamilyIndex =
    G288_CONJUGACY_SPECTRAL_DATA
      .classIndexToFamilyIndex
      .get(
        selectedClassIndex
      );


  const selectedSpectralFamily =
    G288_CONJUGACY_SPECTRAL_DATA
      .families[
        selectedSpectralFamilyIndex
      ];


  const selectedFamilyAngles =
    ROTATION_ANGLES_BY_CHARACTERISTIC_POLYNOMIAL[
      selectedSpectralFamily
        .polynomialText
    ];


  const selectedDisplacementGeometry =
    split24CellGeometryForElement(
      selectedClass.representative
    );


  const displacementTypesBySpectralFamily =
    useMemo(
      () =>
        G288_CONJUGACY_SPECTRAL_DATA
          .families
          .map(
            (family) => {
              const displacementSpectrumIndices =
                G288_VERTEX_DISPLACEMENT_CENSUS
                  .displacementSpectraBySpectralFamily
                  .get(
                    family.index
                  ) ?? [];


              const displacementTypes =
                displacementSpectrumIndices
                  .map(
                    (spectrumIndex) => {
                      const spectrum =
                        G288_VERTEX_DISPLACEMENT_CENSUS
                          .spectra[
                            spectrumIndex
                          ];


                      if (!spectrum) {
                        throw new Error(
                          "Conjugacy spectral-family view could not locate " +
                          `displacement spectrum D${spectrumIndex + 1}.`
                        );
                      }


                      if (
                        spectrum.elementIndices.length ===
                        0
                      ) {
                        throw new Error(
                          "Conjugacy spectral-family view found an empty " +
                          `displacement spectrum D${spectrumIndex + 1}.`
                        );
                      }


                      return Object.freeze({
                        displacementTypeIndex:
                          spectrum.index,

                        label:
                          `D${spectrum.index + 1}`,

                        representativeElementIndex:
                          spectrum.elementIndices[0],
                      });
                    }
                  )
                  .sort(
                    (
                      left,
                      right
                    ) =>
                      left.displacementTypeIndex -
                      right.displacementTypeIndex
                  );


              if (
                displacementTypes.length ===
                0
              ) {
                throw new Error(
                  `Spectral family S${family.index + 1} has no ` +
                  "24-cell displacement type."
                );
              }


              return Object.freeze(
                displacementTypes
              );
            }
          ),
      []
    );


  const selectedFamilyDisplacementTypes =
    displacementTypesBySpectralFamily[
      selectedSpectralFamilyIndex
    ];


  function selectClass(
    conjugacyClass
  ) {
    setSelectedClassIndex(
      conjugacyClass.index
    );

    onSelectElement(
      conjugacyClass
        .representativeIndex
    );
  }


  function selectSpectralFamily(
    family
  ) {
    const firstClassIndex =
      family.classIndices[0];

    selectClass(
      G288_CONJUGACY_CLASS_DATA
        .classes[
          firstClassIndex
        ]
    );
  }


  return (
    <div className={styles.conjugacyPanel}>
      <div className={styles.conjugacyHeading}>
        <div>
          <h3>
            25 conjugacy classes
          </h3>

          <p>
            Exact partition of all 288 group elements
          </p>
        </div>

        <div className={styles.conjugacySpectralBridge}>
          <LatexInline
            latex={
              "25\\longrightarrow11\\longrightarrow9"
            }
            className={
              styles.conjugacyHeadingMath
            }
          />

          <span>
            conjugacy classes → 24-cell types → spectral families
          </span>
        </div>
      </div>


      <div className={styles.conjugacyWorkspace}>
        <div className={styles.conjugacyClassGrid}>
          {
            G288_CONJUGACY_CLASS_DATA
              .classes
              .map(
                (
                  conjugacyClass,
                  index
                ) => (
                  <button
                    key={index}
                    type="button"
                    className={
                      index ===
                      selectedClassIndex
                        ? styles.conjugacyClassButtonActive
                        : styles.conjugacyClassButton
                    }
                    onClick={() =>
                      selectClass(
                        conjugacyClass
                      )
                    }
                  >
                    <strong>
                      C{index + 1}
                    </strong>

                    <span>
                      |[g]|={" "}
                      {
                        conjugacyClass
                          .classSize
                      }
                    </span>

                    <small>
                      S{
                        G288_CONJUGACY_SPECTRAL_DATA
                          .classIndexToFamilyIndex
                          .get(
                            conjugacyClass.index
                          ) + 1
                      }
                      {" · "}
                      ord{" "}
                      {
                        conjugacyClass
                          .order
                      }
                    </small>
                  </button>
                )
              )
          }
        </div>


        <div className={styles.conjugacyDetail}>
          <div className={styles.conjugacyDetailHeader}>
            <div>
              <span>
                Selected class
              </span>

              <strong>
                C{
                  selectedClassIndex +
                  1
                }
              </strong>
            </div>

            <div>
              <span>
                24-cell type
              </span>

              <strong>
                {
                  selectedDisplacementGeometry
                    .displacementTypeLabel
                }
              </strong>
            </div>

            <div>
              <span>
                Spectral family
              </span>

              <strong>
                S{
                  selectedSpectralFamilyIndex +
                  1
                }
              </strong>
            </div>

            <div>
              <span>
                Representative
              </span>

              <strong>
                #
                {
                  selectedClass
                    .representativeIndex +
                  1
                }
              </strong>
            </div>
          </div>


          <div className={styles.conjugacySpectralFamilies}>
            {
              G288_CONJUGACY_SPECTRAL_DATA
                .families
                .map(
                  (family) => {
                    const displacementTypes =
                      displacementTypesBySpectralFamily[
                        family.index
                      ];


                    return (
                      <div
                        key={
                          family.index
                        }
                        className={
                          family.index ===
                          selectedSpectralFamilyIndex
                            ? styles.conjugacySpectralFamilyActive
                            : styles.conjugacySpectralFamily
                        }
                      >
                        <button
                          type="button"
                          className={
                            styles.conjugacySpectralFamilySelect
                          }
                          onClick={() =>
                            selectSpectralFamily(
                              family
                            )
                          }
                        >
                          <strong>
                            S{
                              family.index +
                              1
                            }
                          </strong>

                          <span>
                            {
                              family
                                .classIndices
                                .length
                            } cls
                            {" · "}
                            {
                              family
                                .elementCount
                            } el
                          </span>
                        </button>


                        <div
                          className={
                            styles.conjugacySpectralDisplacements
                          }
                        >
                          {
                            displacementTypes.map(
                              (
                                displacementType,
                                index
                              ) => (
                                <span
                                  key={
                                    displacementType.label
                                  }
                                  className={
                                    styles.conjugacySpectralDisplacementWrap
                                  }
                                >
                                  <button
                                    type="button"
                                    className={
                                      styles.conjugacySpectralDisplacement
                                    }
                                    onClick={() =>
                                      onSelectDisplacementType(
                                        displacementType
                                          .representativeElementIndex
                                      )
                                    }
                                    aria-label={
                                      `Open ${displacementType.label} ` +
                                      "in the 24-cell Angles view"
                                    }
                                  >
                                    {
                                      displacementType.label
                                    }
                                  </button>

                                  {
                                    index <
                                    displacementTypes.length -
                                    1
                                      ? (
                                        <span
                                          className={
                                            styles.conjugacySpectralDisplacementDivider
                                          }
                                          aria-hidden="true"
                                        >
                                          |
                                        </span>
                                      )
                                      : null
                                  }
                                </span>
                              )
                            )
                          }
                        </div>
                      </div>
                    );
                  }
                )
            }
          </div>


          <div className={styles.conjugacySpectralDetail}>
            <div
              className={
                styles.conjugacySpectralDetailIdentity
              }
            >
              <span>
                Spectral family · 24-cell type
              </span>

              <div
                className={
                  styles.conjugacySpectralDetailBridge
                }
              >
                <strong>
                  S{
                    selectedSpectralFamilyIndex +
                    1
                  }
                </strong>

                <span
                  className={
                    styles.conjugacySpectralDetailArrow
                  }
                  aria-hidden="true"
                >
                  ←
                </span>

                {
                  selectedFamilyDisplacementTypes
                    .map(
                      (
                        displacementType,
                        index
                      ) => (
                        <span
                          key={
                            displacementType.label
                          }
                          className={
                            styles.conjugacySpectralDisplacementWrap
                          }
                        >
                          <button
                            type="button"
                            className={
                              styles.conjugacySpectralDisplacement
                            }
                            onClick={() =>
                              onSelectDisplacementType(
                                displacementType
                                  .representativeElementIndex
                              )
                            }
                          >
                            {
                              displacementType.label
                            }
                          </button>

                          {
                            index <
                            selectedFamilyDisplacementTypes.length -
                            1
                              ? (
                                <span
                                  className={
                                    styles.conjugacySpectralDisplacementDivider
                                  }
                                  aria-hidden="true"
                                >
                                  |
                                </span>
                              )
                              : null
                          }
                        </span>
                      )
                    )
                }
              </div>
            </div>

            <LatexInline
              latex={
                String.raw`(\alpha,\beta)=` +
                (
                  selectedFamilyAngles ??
                  String.raw`\text{—}`
                )
              }
              className={
                styles.conjugacySpectralPolynomial
              }
            />
          </div>


          <div className={styles.conjugacyKeyStats}>
            <div>
              <span>
                Class size
              </span>

              <strong>
                {
                  selectedClass
                    .classSize
                }
              </strong>
            </div>

            <div>
              <span>
                Centralizer
              </span>

              <strong>
                {
                  selectedClass
                    .centralizerSize
                }
              </strong>
            </div>
          </div>


          <div className={styles.conjugacyEquation}>
            <LatexInline
              latex={
                `|[g]|=${selectedClass.classSize}` +
                `,\\qquad |C_G(g)|=${selectedClass.centralizerSize}` +
                `,\\qquad 288=` +
                `${selectedClass.classSize}\\cdot` +
                `${selectedClass.centralizerSize}`
              }
              className={
                styles.conjugacyEquationMath
              }
            />
          </div>


          <div className={styles.conjugacyAudit}>
            25 classes · 288 elements · exact conjugation-orbit census
          </div>
        </div>
      </div>
    </div>
  );
}


function DecompositionDiagram({
  onSelectDisplacementType,
}) {
  const rows =
    G288_VERTEX_DISPLACEMENT_CENSUS
      .spectra
      .map(
        (spectrum) => {
          if (
            spectrum.spectralFamilyIndices.length !== 1
          ) {
            throw new Error(
              `Decomposition row D${spectrum.index + 1} ` +
              "does not belong to exactly one spectral family."
            );
          }


          const spectralFamilyIndex =
            spectrum.spectralFamilyIndices[0];

          const spectralFamily =
            G288_CONJUGACY_SPECTRAL_DATA
              .families[
                spectralFamilyIndex
              ];


          if (!spectralFamily) {
            throw new Error(
              `Decomposition row D${spectrum.index + 1} ` +
              "has no spectral-family record."
            );
          }


          const displacementEntries =
            spectrum.displacement.spectrum;

          const counts =
            displacementEntries.map(
              (entry) => entry.count
            );


          let partitionKey;


          if (counts.length === 1) {
            partitionKey =
              String(counts[0]);
          } else if (counts.length === 2) {
            /*
             * Normalize 18+6 and 6+18 into the same
             * geometric partition class 6+18.
             */
            partitionKey =
              [...counts]
                .sort(
                  (left, right) =>
                    left - right
                )
                .join("+");
          } else {
            /*
             * Preserve angular order for the unique
             * three-level 4+16+4 case.
             */
            partitionKey =
              counts.join("+");
          }


          return Object.freeze({
            displacementType:
              `D${spectrum.index + 1}`,

            representativeElementIndex:
              spectrum.elementIndices[0],

            spectralFamily:
              `S${spectralFamilyIndex + 1}`,

            principalAngles:
              ROTATION_ANGLES_BY_CHARACTERISTIC_POLYNOMIAL[
                spectralFamily.polynomialText
              ] ??
              String.raw`\text{—}`,

            displacementEntries,

            partitionKey,

            elements:
              spectrum.elementCount,

            conjugacyClasses:
              spectrum
                .conjugacyClassIndices
                .map(
                  (classIndex) =>
                    `C${classIndex + 1}`
                )
                .join(", "),
          });
        }
      );


  const partitionOrder = [
    "24",
    "12+12",
    "6+18",
    "4+16+4",
  ];


  const partitionSummary =
    partitionOrder.map(
      (partitionKey) => ({
        partitionKey,

        typeCount:
          rows.filter(
            (row) =>
              row.partitionKey ===
              partitionKey
          ).length,
      })
    );


  const accountedElements =
    rows.reduce(
      (
        total,
        row
      ) =>
        total +
        row.elements,
      0
    );


  if (
    rows.length !== 11 ||
    accountedElements !== 288 ||
    partitionSummary.reduce(
      (
        total,
        record
      ) =>
        total +
        record.typeCount,
      0
    ) !== 11
  ) {
    throw new Error(
      "Decomposition display failed its exact census checks."
    );
  }


  return (
    <div className={styles.decompositionPanel}>
      <div className={styles.decompositionHeading}>
        <div>
          <h3>
            Exact decomposition of G288
          </h3>

          <p>
            The same 288 transformations viewed at three exact
            classification scales.
          </p>
        </div>
      </div>


      <div className={styles.decompositionHierarchy}>
        <div className={styles.decompositionHierarchyItem}>
          <strong>288</strong>
          <span>transformations</span>
        </div>

        <span className={styles.decompositionArrow}>
          →
        </span>

        <div className={styles.decompositionHierarchyItem}>
          <strong>25</strong>
          <span>conjugacy classes</span>
        </div>

        <span className={styles.decompositionArrow}>
          →
        </span>

        <div className={styles.decompositionHierarchyItem}>
          <strong>11</strong>
          <span>24-cell types</span>
        </div>

        <span className={styles.decompositionArrow}>
          →
        </span>

        <div className={styles.decompositionHierarchyItem}>
          <strong>9</strong>
          <span>spectral families</span>
        </div>
      </div>


      <div className={styles.decompositionTableWrap}>
        <table className={styles.decompositionTable}>
          <thead>
            <tr>
              <th>24-cell type</th>
              <th>Partition</th>
              <th>Vertex displacement</th>
              <th>Spectral family</th>
              <th>Principal angles</th>
              <th>Elements</th>
              <th>Conjugacy classes</th>
            </tr>
          </thead>

          <tbody>
            {
              rows.map(
                (row) => (
                  <tr
                    key={
                      row.displacementType
                    }
                    className={
                      styles.decompositionClickableRow
                    }
                    tabIndex={0}
                    role="button"
                    aria-label={
                      `Open ${row.displacementType} in the 24-cell Angles view`
                    }
                    onClick={() =>
                      onSelectDisplacementType(
                        row.representativeElementIndex
                      )
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" ||
                        event.key === " "
                      ) {
                        event.preventDefault();

                        onSelectDisplacementType(
                          row.representativeElementIndex
                        );
                      }
                    }}
                  >
                    <td
                      className={
                        styles.decompositionTypeCell
                      }
                    >
                      {row.displacementType}
                    </td>

                    <td
                      className={
                        styles.decompositionPartitionCell
                      }
                    >
                      {row.partitionKey}
                    </td>

                    <td
                      className={
                        styles.decompositionSpectrumCell
                      }
                    >
                      {
                        row.displacementEntries.map(
                          (
                            entry,
                            index
                          ) => (
                            <span
                              key={
                                `${entry.numerator}/${entry.denominator}`
                              }
                              className={
                                styles.decompositionSpectrumEntry
                              }
                            >
                              <LatexInline
                                latex={
                                  entry.angleLatex
                                }
                                className={
                                  styles.decompositionMath
                                }
                              />

                              <span>
                                ({entry.count})
                              </span>

                              {
                                index <
                                row
                                  .displacementEntries
                                  .length - 1
                                  ? (
                                    <span
                                      className={
                                        styles.decompositionDot
                                      }
                                    >
                                      ·
                                    </span>
                                  )
                                  : null
                              }
                            </span>
                          )
                        )
                      }
                    </td>

                    <td>
                      {row.spectralFamily}
                    </td>

                    <td>
                      <LatexInline
                        latex={
                          row.principalAngles
                        }
                        className={
                          styles.decompositionMath
                        }
                      />
                    </td>

                    <td
                      className={
                        styles.decompositionElementsCell
                      }
                    >
                      {row.elements}
                    </td>

                    <td
                      className={
                        styles.decompositionClassesCell
                      }
                    >
                      {row.conjugacyClasses}
                    </td>
                  </tr>
                )
              )
            }
          </tbody>
        </table>
      </div>


      <div className={styles.decompositionPartitions}>
        <span
          className={
            styles.decompositionPartitionsLabel
          }
        >
          Vertex-partition geometries
        </span>

        {
          partitionSummary.map(
            (record) => (
              <div
                key={
                  record.partitionKey
                }
                className={
                  styles.decompositionPartitionSummary
                }
              >
                <strong>
                  {record.partitionKey}
                </strong>

                <span>
                  {
                    record.typeCount === 1
                      ? "1 type"
                      : `${record.typeCount} types`
                  }
                </span>
              </div>
            )
          )
        }
      </div>
    </div>
  );
}


export default function G288Viewer() {
  const [
    generatorIndex,
    setGeneratorIndex,
  ] = useState(0);

  const [
    exponent,
    setExponent,
  ] = useState(0);

  const [
    playing,
    setPlaying,
  ] = useState(false);

  const [
    geometryMode,
    setGeometryMode,
  ] = useState("24-cell");

  const [
    cellRenderMode,
    setCellRenderMode,
  ] = useState("cells");

  const [
    selectedCellIndex,
    setSelectedCellIndex,
  ] = useState(0);

  const [
    orbitTrailEnabled,
    setOrbitTrailEnabled,
  ] = useState(false);


  const generator =
    G288[generatorIndex];

  const generatorOrder =
    useMemo(
      () =>
        g288ElementOrder(
          generator
        ),
      [generator]
    );

  const element =
    useMemo(
      () =>
        powerG288(
          generator,
          exponent %
            generatorOrder
        ),
      [
        generator,
        exponent,
        generatorOrder,
      ]
    );

  const data =
    useMemo(
      () =>
        exactElementData(
          element
        ),
      [element]
    );


  const vertexDisplacement =
    useMemo(
      () =>
        vertexDisplacementSpectrumForElement(
          element
        ),
      [element]
    );


  const currentDisplacementGeometry =
    useMemo(
      () =>
        split24CellGeometryForElement(
          element
        ),
      [element]
    );


  useEffect(
    () => {
      const selectedOrder =
        g288ElementOrder(
          G288[
            generatorIndex
          ]
        );

      setExponent(
        selectedOrder > 1
          ? 1
          : 0
      );

      setPlaying(false);
    },
    [generatorIndex]
  );


  useEffect(
    () => {
      if (
        !playing ||
        generatorOrder <= 1
      ) {
        return undefined;
      }

      const timer =
        window.setInterval(
          () => {
            setExponent(
              (current) =>
                (
                  current + 1
                ) %
                generatorOrder
            );
          },
          900
        );

      return () =>
        window.clearInterval(
          timer
        );
    },
    [
      playing,
      generatorOrder,
    ]
  );


  function stepGenerator(
    delta
  ) {
    setGeneratorIndex(
      (current) =>
        (
          current +
          delta +
          G288.length
        ) %
        G288.length
    );
  }


  function stepPower(
    delta
  ) {
    setExponent(
      (current) =>
        (
          current +
          delta +
          generatorOrder
        ) %
        generatorOrder
    );
  }


  function applyMatrixAgain() {
    setGeometryMode("24-cell");
    setCellRenderMode("one");
    setPlaying(false);

    setExponent(
      (current) =>
        (
          current + 1
        ) %
        generatorOrder
    );
  }


  function resetMatrixAction() {
    setGeometryMode("24-cell");
    setCellRenderMode("one");
    setPlaying(false);
    setExponent(0);
  }


  function toggleOrbitTrail() {
    setGeometryMode("24-cell");
    setCellRenderMode("one");
    setPlaying(false);

    setOrbitTrailEnabled(
      (current) =>
        !current
    );
  }


  function selectQuotientCoset(
    cell
  ) {
    const representativeIndex =
      cell.elementIndices[0];

    setGeneratorIndex(
      representativeIndex
    );

    setPlaying(false);
  }


  function selectExactElement(
    elementIndex
  ) {
    setGeneratorIndex(
      elementIndex
    );

    setPlaying(false);
  }


  function selectCoreElement(
    elementIndex
  ) {
    setGeneratorIndex(
      elementIndex
    );

    setExponent(1);

    setPlaying(false);
  }


  function selectDisplacementType(
    elementIndex
  ) {
    setGeneratorIndex(
      elementIndex
    );

    setExponent(1);

    setPlaying(false);

    setGeometryMode(
      "24-cell"
    );

    setCellRenderMode(
      "split"
    );
  }


  function selectCyclicPower(
    powerExponent
  ) {
    setExponent(
      powerExponent
    );

    setPlaying(false);
  }


  const quotientText =
    data.coordinates
      ? `(${data.coordinates.a}, ${data.coordinates.b})`
      : "—";

  const currentOrder =
    g288ElementOrder(
      element
    );

  const tetrahedralActionIsIdentity =
    permutationIsIdentity(
      data.tetrahedral.left
    ) &&
    permutationIsIdentity(
      data.tetrahedral.right
    );

  const hiddenByTetrahedralQuotient =
    currentOrder > 1 &&
    tetrahedralActionIsIdentity;


  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>
          Quaternionic 288-Group
        </h1>

        <div className={styles.groupDefinition}>
          <LatexInline
            latex={
              "G_{288}=\\frac{2T_L\\times 2T_R}{\\{(1,1),(-1,-1)\\}}"
            }
            className={
              styles.headerKatex
            }
          />
        </div>
      </header>

      <section className={styles.viewerShell}>
        <div
          className={
            geometryMode === "decomposition"
              ? `${styles.viewerLayout} ${styles.viewerLayoutDecomposition}`
              : styles.viewerLayout
          }
        >

          <aside className={`${styles.viewerSidebar} ${styles.controlRoomCard} ${styles.viewerControlPanel}`}>
            <h2 className={styles.controlRoomHeading}>
              Element control
            </h2>

            <div className={styles.compactElementHeader}>
              <button
                type="button"
                className={styles.compactElementArrow}
                onClick={() => stepGenerator(-1)}
                aria-label="Previous element"
              >
                ←
              </button>

              <button
                type="button"
                className={styles.compactElementArrow}
                onClick={() => stepGenerator(1)}
                aria-label="Next element"
              >
                →
              </button>

              <div className={styles.compactElementSelectWrap}>
                <select
                  className={styles.compactElementSelect}
                  value={generatorIndex}
                  onChange={(event) =>
                    setGeneratorIndex(
                      Number(
                        event.target.value
                      )
                    )
                  }
                  aria-label="Select element"
                >
                  {G288.map(
                    (candidate, index) => (
                      <option
                        key={candidate.key}
                        value={index}
                      >
                        Element {index + 1} · order {g288ElementOrder(candidate)} · [{formatExact(candidate.a)}, {formatExact(candidate.b)}]
                      </option>
                    )
                  )}
                </select>

                <span
                  className={styles.compactElementSelectValue}
                  aria-hidden="true"
                >
                  Element {generatorIndex + 1}
                </span>

                <span
                  className={styles.compactElementChevron}
                  aria-hidden="true"
                >
                  ▾
                </span>
              </div>

              <span className={styles.compactElementOrder}>
                order {generatorOrder}
              </span>
            </div>


            <div
              className={
                `${styles.viewerControls} ` +
                styles.viewerControlsCompact
              }
            >
              <div className={styles.compactPowerRow}>
                <button
                  type="button"
                  className={styles.compactPowerStep}
                  onClick={() => stepPower(-1)}
                  aria-label="Previous power"
                >
                  −
                </button>

                <div className={styles.powerReadout}>
                  <LatexInline
                    latex={
                      `g^{${exponent}}\\,/\\,${generatorOrder}`
                    }
                    className={
                      styles.controlKatex
                    }
                  />
                </div>

                <button
                  type="button"
                  className={styles.compactPowerStep}
                  onClick={() => stepPower(1)}
                  aria-label="Next power"
                >
                  +
                </button>

                <div className={styles.compactPowerActions}>
                  <button
                    type="button"
                    className={styles.powerPlayButton}
                    onClick={() =>
                      setPlaying(
                        (current) => !current
                      )
                    }
                    disabled={generatorOrder <= 1}
                  >
                    {playing ? "Pause" : "Play"}
                  </button>

                  <button
                    type="button"
                    className={styles.powerResetButton}
                    onClick={() => {
                      setExponent(0);
                      setPlaying(false);
                    }}
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>


            <div className={styles.viewerModeInfo}>
              <div
                id="g288-24-cell-sidebar-controls"
                className={
                  styles.viewerModeLocalControls
                }
              />
            </div>


            <div
              className={
                `${styles.viewerReadout} ` +
                styles.compactReadout
              }
            >
              <div className={styles.readoutPair}>
                <div>
                  <span className={styles.readoutLabel}>
                    Generator
                  </span>

                  <LatexInline
                    latex={
                      projectivePairLatex(
                        generator
                      )
                    }
                    className={
                      styles.readoutKatex
                    }
                  />
                </div>

                <div>
                  <span className={styles.readoutLabel}>
                    Current
                  </span>

                  <LatexInline
                    latex={
                      `g^{${exponent}}=` +
                      projectivePairLatex(
                        element
                      )
                    }
                    className={
                      styles.readoutKatex
                    }
                  />
                </div>
              </div>


              <div className={styles.compactReadoutBottom}>
                <div>
                  <span className={styles.readoutLabel}>
                    Quotient
                  </span>

                  <LatexInline
                    latex={
                      data.coordinates
                        ? `(${data.coordinates.a},${data.coordinates.b})`
                        : "\\text{—}"
                    }
                    className={
                      styles.readoutKatex
                    }
                  />
                </div>

                <div>
                  <span className={styles.readoutLabel}>
                    <LatexInline
                      latex="K_{32}"
                      className={
                        styles.labelKatex
                      }
                    />
                  </span>

                  <span className={styles.mathValue}>
                    {
                      isK32Element(element)
                        ? "yes"
                        : "no"
                    }
                  </span>
                </div>

                <div className={styles.compactActionCell}>
                  <span className={styles.readoutLabel}>
                    Action
                  </span>

                  <LatexInline
                    latex={String.raw`z\mapsto az\bar b`}
                    className={
                      styles.readoutKatex
                    }
                  />

                  <span className={styles.compactActionMeta}>
                    {
                      geometryMode === "tetrahedral"
                        ? "tetrahedral quotient"
                        : geometryMode === "24-cell"
                          ? "full SO(4)"
                          : geometryMode === "quotient"
                            ? "orbit / stabilizer"
                            : geometryMode === "cyclic"
                              ? "cyclic powers"
                              : geometryMode === "core"
                                ? "K32 structure"
                                : "projective action"
                    }
                  </span>
                </div>
              </div>
            </div>
          </aside>




          {
            geometryMode !== "24-cell"
              ? (
                <div
                  style={{
                    display: "none",
                  }}
                  aria-hidden="true"
                >
                  <Cell24Diagram
                    element={element}
                    orbitGenerator={
                      generator
                    }
                    orbitTrailEnabled={
                      orbitTrailEnabled
                    }
                    cellRenderMode={
                      cellRenderMode
                    }
                    setCellRenderMode={
                      setCellRenderMode
                    }
                    selectedCellIndex={
                      selectedCellIndex
                    }
                    setSelectedCellIndex={
                      setSelectedCellIndex
                    }
                  />
                </div>
              )
              : null
          }


          <div className={styles.tetraStage}>
            <div className={styles.geometryModeHeader}>
              <div className={styles.geometryModeButtons}>
                <button
                  type="button"
                  className={
                    geometryMode ===
                    "tetrahedral"
                      ? styles.geometryModeButtonActive
                      : styles.geometryModeButton
                  }
                  onClick={() =>
                    setGeometryMode(
                      "tetrahedral"
                    )
                  }
                >
                  Tetrahedral quotient
                </button>

                <button
                  type="button"
                  className={
                    geometryMode ===
                    "24-cell"
                      ? styles.geometryModeButtonActive
                      : styles.geometryModeButton
                  }
                  onClick={() =>
                    setGeometryMode(
                      "24-cell"
                    )
                  }
                >
                  Projected 24-cell
                </button>

                <button
                  type="button"
                  className={
                    geometryMode ===
                    "quotient"
                      ? styles.geometryModeButtonActive
                      : styles.geometryModeButton
                  }
                  onClick={() =>
                    setGeometryMode(
                      "quotient"
                    )
                  }
                >
                  Orbit explorer
                </button>

                <button
                  type="button"
                  className={
                    geometryMode ===
                    "cyclic"
                      ? styles.geometryModeButtonActive
                      : styles.geometryModeButton
                  }
                  onClick={() =>
                    setGeometryMode(
                      "cyclic"
                    )
                  }
                >
                  Cyclic orbit
                </button>

                <button
                  type="button"
                  className={
                    geometryMode ===
                    "core"
                      ? styles.geometryModeButtonActive
                      : styles.geometryModeButton
                  }
                  onClick={() =>
                    setGeometryMode(
                      "core"
                    )
                  }
                >
                  32-core
                </button>

                <button
                  type="button"
                  className={
                    geometryMode ===
                    "finite"
                      ? styles.geometryModeButtonActive
                      : styles.geometryModeButton
                  }
                  onClick={() =>
                    setGeometryMode(
                      "finite"
                    )
                  }
                >
                  Finite geometry
                </button>

                <button
                  type="button"
                  className={
                    geometryMode ===
                    "classes"
                      ? styles.geometryModeButtonActive
                      : styles.geometryModeButton
                  }
                  onClick={() =>
                    setGeometryMode(
                      "classes"
                    )
                  }
                >
                  Conjugacy classes
                </button>

                <button
                  type="button"
                  className={
                    geometryMode ===
                    "decomposition"
                      ? styles.geometryModeButtonActive
                      : styles.geometryModeButton
                  }
                  onClick={() =>
                    setGeometryMode(
                      "decomposition"
                    )
                  }
                >
                  Decomposition
                </button>
              </div>


            </div>

            {
              geometryMode ===
              "24-cell"
                ? (
                  <div className={styles.geometryStageIdentity}>
                    <h3>
                      Projected 24-cell
                    </h3>

                    <LatexInline
                      latex="|G_{288}|=288"
                      className={
                        styles.geometryStageIdentityMath
                      }
                    />
                  </div>
                )
                : null
            }

            {
              geometryMode ===
              "tetrahedral"
                ? (
                  <>
                    <div className={styles.tetraPanel}>
                      <TetrahedronDiagram
                        title="Left tetrahedron"
                        subtitle="action of a"
                        permutation={
                          data.tetrahedral.left
                        }
                        factorQuaternion={
                          element.a
                        }
                      />
                    </div>

                    <div className={styles.stageDivider} />

                    <div className={styles.tetraPanel}>
                      <TetrahedronDiagram
                        title="Right tetrahedron"
                        subtitle="action of b"
                        permutation={
                          data.tetrahedral.right
                        }
                        factorQuaternion={
                          element.b
                        }
                      />
                    </div>
                  </>
                )
                : geometryMode ===
                  "24-cell"
                  ? (
                    <div className={styles.cell24Panel}>
                      <Cell24Diagram
                        element={element}
                        orbitGenerator={
                          generator
                        }
                        orbitTrailEnabled={
                          orbitTrailEnabled
                        }
                        cellRenderMode={
                          cellRenderMode
                        }
                        setCellRenderMode={
                          setCellRenderMode
                        }
                        selectedCellIndex={
                          selectedCellIndex
                        }
                        setSelectedCellIndex={
                          setSelectedCellIndex
                        }
                      />
                    </div>
                  )
                  : geometryMode ===
                    "quotient"
                    ? (
                      <div className={styles.quotientGridPanel}>
                        <QuotientC3xC3Diagram
                        currentCoordinates={
                          data.coordinates
                        }
                        currentElement={
                          element
                        }
                        currentElementKey={
                          element.key
                        }
                        onSelectCoset={
                          selectQuotientCoset
                        }
                        onSelectElement={
                          selectExactElement
                        }
                      />
                    </div>
                  )
                  : geometryMode ===
                    "cyclic"
                    ? (
                      <div className={styles.cyclicOrbitPanel}>
                        <CyclicOrbitDiagram
                          generator={
                            generator
                          }
                          exponent={
                            exponent
                          }
                          onSelectPower={
                            selectCyclicPower
                          }
                          onSelectGenerator={
                            selectExactElement
                          }
                        />
                      </div>
                    )
                    : geometryMode ===
                      "core"
                      ? (
                        <div className={styles.core32Panel}>
                          <Core32Diagram
                            currentElementKey={
                              element.key
                            }
                            onSelectElement={
                              selectCoreElement
                            }
                          />
                        </div>
                      )
                      : geometryMode ===
                        "finite"
                        ? (
                          <div className={styles.finiteGeometryPanel}>
                            <FiniteGeometryDiagram
                              currentElementKey={
                                element.key
                              }
                              onSelectElement={
                                selectCoreElement
                              }
                            />
                          </div>
                        )
                        : geometryMode ===
                          "classes"
                          ? (
                            <div className={styles.conjugacyPanelWrap}>
                              <ConjugacyClassDiagram
                                currentElementKey={
                                  element.key
                                }
                                onSelectElement={
                                  selectCoreElement
                                }
                                onSelectDisplacementType={
                                  selectDisplacementType
                                }
                              />
                            </div>
                          )
                          : (
                            <DecompositionDiagram
                              onSelectDisplacementType={
                                selectDisplacementType
                              }
                            />
                          )
            }
          </div>
        </div>
      </section>

      <section
        className={
          geometryMode === "decomposition"
            ? `${styles.lowerGrid} ${styles.lowerGridDecomposition}`
            : styles.lowerGrid
        }
      >


        <section className={styles.infoCard}>
          <h2>
            Exact classification
          </h2>

          <dl className={styles.infoList}>
            <div className={styles.classificationSummaryRow}>
              <div className={styles.classificationSummaryItem}>
                <dt>Current order</dt>
                <dd>
                  {g288ElementOrder(element)}
                </dd>
              </div>

              <div className={styles.classificationSummaryItem}>
                <dt>
                  Fixed-space dimension
                </dt>
                <dd>
                  {
                    data.spectral
                      .fixedSpaceDimension
                  }
                </dd>
              </div>
            </div>

            <div>
              <dt>
                Characteristic polynomial
              </dt>

              <dd className={styles.polynomialDisplay}>
                {(() => {
                  const polynomial =
                    CHARACTERISTIC_POLYNOMIAL_DISPLAY[
                      data.spectral
                        .characteristicPolynomialText
                    ];

                  if (!polynomial) {
                    return (
                      <LatexInline
                        latex={
                          data.spectral
                            .characteristicPolynomialText
                        }
                        className={
                          styles.katexMath
                        }
                      />
                    );
                  }

                  return (
                    <>
                      <div className={styles.polynomialLatexLine}>
                        <LatexInline
                          latex={
                            `=${polynomial.factored}`
                          }
                          className={
                            styles.katexMath
                          }
                        />
                      </div>

                      <div className={styles.polynomialLatexLine}>
                        <LatexInline
                          latex={
                            `=${polynomial.expanded}`
                          }
                          className={
                            styles.katexMath
                          }
                        />
                      </div>
                    </>
                  );
                })()}
              </dd>
            </div>

            <div>
              <dt>
                Rotation angles
              </dt>

              <dd>
                <LatexInline
                  latex={
                    ROTATION_ANGLES_BY_CHARACTERISTIC_POLYNOMIAL[
                      data.spectral
                        .characteristicPolynomialText
                    ] ?? String.raw`\text{—}`
                  }
                  className={
                    styles.rotationAnglesKatex
                  }
                />
              </dd>
            </div>

            <div>
              <dt
                className={
                  styles.vertexDisplacementLabelRow
                }
              >
                <span>
                  Vertex displacement
                </span>

                <span
                  className={
                    styles.currentDisplacementType
                  }
                >
                  {
                    currentDisplacementGeometry
                      .displacementTypeLabel
                  }
                  {" → "}
                  {
                    currentDisplacementGeometry
                      .spectralFamilyLabel
                  }
                </span>
              </dt>

              <dd className={styles.vertexDisplacementSpectrum}>
                {
                  vertexDisplacement
                    .spectrum
                    .map(
                      (
                        entry,
                        index
                      ) => (
                        <span
                          key={
                            `${entry.numerator}/${entry.denominator}`
                          }
                          className={
                            styles.vertexDisplacementEntry
                          }
                        >
                          <LatexInline
                            latex={
                              entry.angleLatex
                            }
                            className={
                              styles.vertexDisplacementAngle
                            }
                          />

                          <span
                            className={
                              styles.vertexDisplacementMultiplicity
                            }
                          >
                            {
                              entry.count === 1
                                ? "1 vertex"
                                : `${entry.count} vertices`
                            }
                          </span>

                          {
                            index <
                            vertexDisplacement
                              .spectrum
                              .length - 1
                              ? (
                                <span
                                  className={
                                    styles.vertexDisplacementSeparator
                                  }
                                >
                                  ·
                                </span>
                              )
                              : null
                          }
                        </span>
                      )
                    )
                }
              </dd>
            </div>

            <div>
              <dt>
                Left / Right tetrahedral action
              </dt>

              <dd className={styles.tetrahedralActionPair}>
                <span>
                  {
                    permutationCycleText(
                      data.tetrahedral.left
                    )
                  }
                </span>

                <span
                  className={
                    styles.tetrahedralActionSeparator
                  }
                >
                  /
                </span>

                <span>
                  {
                    permutationCycleText(
                      data.tetrahedral.right
                    )
                  }
                </span>
              </dd>
            </div>
          </dl>
        </section>

        <section className={styles.infoCard}>
          <div className={styles.matrixPanelHeading}>
            <h2>
              Exact 4D matrix
            </h2>
          </div>

          <p className={styles.cardNote}>
            basis{" "}
            <LatexInline
              latex="(1,i,j,k)"
              className={
                styles.inlineKatex
              }
            />
          </p>

          <div className={styles.matrixActionBody}>
            <div className={styles.matrixActionControls}>
              <LatexInline
                latex={
                  `M^{${exponent}}`
                }
                className={
                  styles.matrixPowerKatex
                }
              />

              <button
                type="button"
                className={styles.matrixApplyButton}
                onClick={applyMatrixAgain}
                disabled={generatorOrder <= 1}
              >
                Apply matrix
              </button>

              <button
                type="button"
                className={styles.matrixResetButton}
                onClick={resetMatrixAction}
              >
                Reset
              </button>

              <button
                type="button"
                className={
                  orbitTrailEnabled
                    ? styles.matrixOrbitButtonActive
                    : styles.matrixOrbitButton
                }
                onClick={toggleOrbitTrail}
                aria-pressed={
                  orbitTrailEnabled
                }
              >
                Orbit trail
              </button>
            </div>

            <MatrixDisplay
              element={generator}
            />
          </div>
        </section>
      </section>

      <p className={styles.footerNote}>
        The tabs reveal different exact structures within the same
        288 transformations of the projected 24-cell.
      </p>
    </main>
  );}
