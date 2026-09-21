/*
 * Exact conjugacy-class and centralizer structure of G_288.
 */

import {
  G288,
  composeG288,
  inverseG288,
  projectiveEquals,
} from "./group288.mjs";

import {
  G288_SPECTRAL_RECORDS,
} from "./spectralClassification.mjs";

import {
  K32,
  isK32Element,
} from "./subgroups.mjs";

import {
  cosetContaining,
  quotientCoordinates,
} from "./quotientC3xC3.mjs";

import {
  tetrahedralActionForG288,
  tetrahedralActionKey,
} from "./tetrahedralActions.mjs";


const SPECTRAL_BY_KEY =
  new Map(
    G288_SPECTRAL_RECORDS.map(
      (record) => [
        record.element.key,
        record,
      ]
    )
  );


export function conjugateElement(
  conjugator,
  element
) {
  return composeG288(
    composeG288(
      conjugator,
      element
    ),
    inverseG288(
      conjugator
    )
  );
}


export function centralizerOf(
  element
) {
  return Object.freeze(
    G288.filter(
      (candidate) =>
        projectiveEquals(
          composeG288(
            candidate,
            element
          ),
          composeG288(
            element,
            candidate
          )
        )
    )
  );
}


export function conjugacyClassOf(
  element
) {
  const byKey =
    new Map();

  for (
    const conjugator of G288
  ) {
    const conjugate =
      conjugateElement(
        conjugator,
        element
      );

    byKey.set(
      conjugate.key,
      conjugate
    );
  }

  return Object.freeze(
    [...byKey.values()]
  );
}


function buildConjugacyClasses() {
  const unassigned =
    new Map(
      G288.map(
        (element) => [
          element.key,
          element,
        ]
      )
    );

  const classes = [];

  while (
    unassigned.size > 0
  ) {
    const representative =
      unassigned.values().next().value;

    const members =
      conjugacyClassOf(
        representative
      );

    for (
      const member of members
    ) {
      unassigned.delete(
        member.key
      );
    }

    const centralizer =
      centralizerOf(
        representative
      );

    classes.push(
      Object.freeze({
        representative,
        members,
        centralizer,
      })
    );
  }

  return classes;
}


export const G288_CONJUGACY_CLASSES =
  Object.freeze(
    buildConjugacyClasses()
  );


export function conjugacyClassRecord(
  conjugacyClass
) {
  const representative =
    conjugacyClass.representative;

  const spectral =
    SPECTRAL_BY_KEY.get(
      representative.key
    );

  if (!spectral) {
    throw new Error(
      "Missing spectral record for conjugacy-class representative."
    );
  }

  const quotientCoset =
    cosetContaining(
      representative
    );

  const quotient =
    quotientCoset
      ? quotientCoordinates(
          quotientCoset
        )
      : null;

  const tetrahedralAction =
    tetrahedralActionForG288(
      representative
    );

  const k32MemberCount =
    conjugacyClass.members.filter(
      isK32Element
    ).length;

  return Object.freeze({
    representative,

    classSize:
      conjugacyClass.members.length,

    centralizerSize:
      conjugacyClass.centralizer.length,

    order:
      spectral.order,

    characteristicPolynomial:
      spectral.characteristicPolynomialText,

    trace:
      spectral.trace,

    fixedSpaceDimension:
      spectral.fixedSpaceDimension,

    sixthPowerMinusIdentity:
      spectral.sixthPowerMinusIdentity,

    k32MemberCount,

    entirelyInsideK32:
      k32MemberCount ===
      conjugacyClass.members.length,

    quotientCoordinates:
      quotient,

    tetrahedralActionKey:
      tetrahedralActionKey(
        tetrahedralAction
      ),
  });
}


export const G288_CONJUGACY_CLASS_RECORDS =
  Object.freeze(
    G288_CONJUGACY_CLASSES.map(
      conjugacyClassRecord
    )
  );


export function spectralClassToConjugacyClasses() {
  const result =
    new Map();

  for (
    const record of
      G288_CONJUGACY_CLASS_RECORDS
  ) {
    const key =
      [
        record.order,
        record.characteristicPolynomial,
      ].join(" | ");

    if (
      !result.has(key)
    ) {
      result.set(
        key,
        []
      );
    }

    result.get(key).push(
      record
    );
  }

  return result;
}


export function validateConjugacyClasses() {
  const covered =
    new Set();

  for (
    const conjugacyClass of
      G288_CONJUGACY_CLASSES
  ) {
    const classSize =
      conjugacyClass.members.length;

    const centralizerSize =
      conjugacyClass.centralizer.length;

    if (
      classSize *
        centralizerSize !==
      288
    ) {
      throw new Error(
        "Conjugacy orbit/centralizer identity failed:\n" +
        `class=${classSize}\n` +
        `centralizer=${centralizerSize}`
      );
    }

    for (
      const member of
        conjugacyClass.members
    ) {
      if (
        covered.has(
          member.key
        )
      ) {
        throw new Error(
          "Conjugacy classes overlap."
        );
      }

      covered.add(
        member.key
      );
    }

    /*
     * Every member of a conjugacy class must have the same
     * spectral fingerprint.
     */
    const representativeSpectral =
      SPECTRAL_BY_KEY.get(
        conjugacyClass.representative.key
      );

    for (
      const member of
        conjugacyClass.members
    ) {
      const memberSpectral =
        SPECTRAL_BY_KEY.get(
          member.key
        );

      if (
        memberSpectral.order !==
          representativeSpectral.order ||
        memberSpectral.characteristicPolynomialKey !==
          representativeSpectral.characteristicPolynomialKey ||
        memberSpectral.fixedSpaceDimension !==
          representativeSpectral.fixedSpaceDimension
      ) {
        throw new Error(
          "Conjugacy class is not spectrally uniform."
        );
      }
    }
  }

  if (
    covered.size !== 288
  ) {
    throw new Error(
      `Conjugacy classes cover ${covered.size} elements instead of 288.`
    );
  }

  return Object.freeze({
    classCount:
      G288_CONJUGACY_CLASSES.length,

    coveredCount:
      covered.size,
  });
}
