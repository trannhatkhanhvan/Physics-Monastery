import { ZERO_TYPE } from "./typeVector";
import { makeBoundaryWord, makeFactor, multiplyWords, BOX_WORD } from "./boundaryWords";

function f(tokenId, exponent = 1) {
  return makeFactor(tokenId, exponent);
}

const UNIT_ENTRIES = [
  // Base dimensional addresses
  {
    id: "second",
    group: "Base units",
    name: "second",
    symbol: "s",
    unitFormula: "s",
    factors: [f("t_p", 1)],
  },
  {
    id: "meter",
    group: "Base units",
    name: "meter",
    symbol: "m",
    unitFormula: "m",
    factors: [f("l_p", 1)],
    aliases: ["fm"],
  },
  {
    id: "coulomb",
    group: "Base units",
    name: "coulomb",
    symbol: "C",
    unitFormula: "C",
    factors: [f("q_p", 1)],
  },
  {
    id: "kelvin",
    group: "Base units",
    name: "kelvin",
    symbol: "K",
    unitFormula: "K",
    factors: [f("T_p", 1)],
  },
  {
    id: "kilogram",
    group: "Base units",
    name: "kilogram",
    symbol: "kg",
    unitFormula: "kg",
    factors: [f("m_p", 1)],
  },
  {
    id: "mole",
    group: "Base units",
    name: "mole",
    symbol: "mol",
    unitFormula: "mol",
    // N_A has inverse-amount type, so N_A^-1 represents the mole axis.
    factors: [f("N_A", -1)],
  },

  // Kinematic / reciprocal units
  {
    id: "hertz",
    group: "Kinematic / reciprocal units",
    name: "hertz",
    symbol: "Hz",
    unitFormula: "1/s",
    factors: [f("t_p", -1)],
    aliases: ["MHz"],
  },
  {
    id: "velocity",
    group: "Kinematic / reciprocal units",
    name: "velocity type",
    symbol: "v",
    unitFormula: "m/s",
    factors: [f("t_p", -1), f("l_p", 1)],
  },
  {
    id: "acceleration",
    group: "Kinematic / reciprocal units",
    name: "acceleration type",
    symbol: "a",
    unitFormula: "m/s^2",
    factors: [f("t_p", -2), f("l_p", 1)],
  },

  // Mechanical units
  {
    id: "noether",
    group: "Mechanical units",
    name: "noether",
    symbol: "𝒩",
    unitFormula: "m kg/s",
    factors: [f("t_p", -1), f("l_p", 1), f("m_p", 1)],
  },
  {
    id: "newton",
    group: "Mechanical units",
    name: "newton",
    symbol: "N",
    unitFormula: "m kg/s^2",
    factors: [f("t_p", -2), f("l_p", 1), f("m_p", 1)],
  },
  {
    id: "joule",
    group: "Mechanical units",
    name: "joule",
    symbol: "J",
    unitFormula: "m^2 kg/s^2",
    factors: [f("t_p", -2), f("l_p", 2), f("m_p", 1)],
    aliases: ["eV", "MeV", "GeV"],
  },
  {
    id: "watt",
    group: "Mechanical units",
    name: "watt",
    symbol: "W",
    unitFormula: "m^2 kg/s^3",
    factors: [f("t_p", -3), f("l_p", 2), f("m_p", 1)],
  },
  {
    id: "pascal",
    group: "Mechanical units",
    name: "pascal",
    symbol: "Pa",
    unitFormula: "kg/(s^2 m)",
    factors: [f("t_p", -2), f("l_p", -1), f("m_p", 1)],
  },

  // Electromagnetic units
  {
    id: "ampere",
    group: "Electromagnetic units",
    name: "ampere",
    symbol: "A",
    unitFormula: "C/s",
    factors: [f("t_p", -1), f("q_p", 1)],
  },
  {
    id: "volt",
    group: "Electromagnetic units",
    name: "volt",
    symbol: "V",
    unitFormula: "m^2 kg/(s^2 C)",
    factors: [f("t_p", -2), f("l_p", 2), f("q_p", -1), f("m_p", 1)],
  },
  {
    id: "ohm",
    group: "Electromagnetic units",
    name: "ohm",
    symbol: "Ω",
    unitFormula: "m^2 kg/(s C^2)",
    factors: [f("t_p", -1), f("l_p", 2), f("q_p", -2), f("m_p", 1)],
  },
  {
    id: "siemens",
    group: "Electromagnetic units",
    name: "siemens",
    symbol: "S",
    unitFormula: "s C^2/(m^2 kg)",
    factors: [f("t_p", 1), f("l_p", -2), f("q_p", 2), f("m_p", -1)],
  },
  {
    id: "farad",
    group: "Electromagnetic units",
    name: "farad",
    symbol: "F",
    unitFormula: "s^2 C^2/(m^2 kg)",
    factors: [f("t_p", 2), f("l_p", -2), f("q_p", 2), f("m_p", -1)],
  },
  {
    id: "henry",
    group: "Electromagnetic units",
    name: "henry",
    symbol: "H",
    unitFormula: "m^2 kg/C^2",
    factors: [f("l_p", 2), f("q_p", -2), f("m_p", 1)],
  },
  {
    id: "tesla",
    group: "Electromagnetic units",
    name: "tesla",
    symbol: "T",
    unitFormula: "kg/(s C)",
    factors: [f("t_p", -1), f("q_p", -1), f("m_p", 1)],
  },
  {
    id: "weber",
    group: "Electromagnetic units",
    name: "weber",
    symbol: "Wb",
    unitFormula: "m^2 kg/(s C)",
    factors: [f("t_p", -1), f("l_p", 2), f("q_p", -1), f("m_p", 1)],
  },

  // Thermal / molar units
  {
    id: "joule_per_kelvin",
    group: "Thermal / molar units",
    name: "joule per kelvin",
    symbol: "J/K",
    unitFormula: "m^2 kg/(s^2 K)",
    factors: [f("t_p", -2), f("l_p", 2), f("T_p", -1), f("m_p", 1)],
  },
  {
    id: "coulomb_per_mole",
    group: "Thermal / molar units",
    name: "coulomb per mole",
    symbol: "C/mol",
    unitFormula: "C/mol",
    factors: [f("q_p", 1), f("N_A", 1)],
  },
  {
    id: "joule_per_mole",
    group: "Thermal / molar units",
    name: "joule per mole",
    symbol: "J/mol",
    unitFormula: "m^2 kg/(s^2 mol)",
    factors: [f("t_p", -2), f("l_p", 2), f("m_p", 1), f("N_A", 1)],
  },
  {
    id: "joule_per_mole_kelvin",
    group: "Thermal / molar units",
    name: "joule per mole kelvin",
    symbol: "J/(mol K)",
    unitFormula: "m^2 kg/(s^2 mol K)",
    factors: [f("t_p", -2), f("l_p", 2), f("T_p", -1), f("m_p", 1), f("N_A", 1)],
  },
  {
    id: "kilogram_per_mole",
    group: "Thermal / molar units",
    name: "kilogram per mole",
    symbol: "kg/mol",
    unitFormula: "kg/mol",
    factors: [f("m_p", 1), f("N_A", 1)],
  },
];

function makeUnitTransform(entry) {
  const ordinaryWord = makeBoundaryWord({
    id: `w_unit_${entry.id}`,
    name: `${entry.name} unit-address word`,
    wordKind: "unit_address_monomial",
    pathFactors: entry.factors,
  });

  const inversionWord = multiplyWords({
    id: `w_unit_${entry.id}_box`,
    name: `${entry.name} unit-address word with inversion loop`,
    words: [ordinaryWord, BOX_WORD],
    wordKind: "unit_address_with_inversion_loop",
    loopClass: "inversion_boundary_inserted",
  });

  return Object.freeze({
    id: `unit_${entry.id}`,
    modelKind: "unit_model",
    hideInversionBranch: true,
    name: entry.name,
    symbol: entry.symbol,
    selectorGroup: entry.group,
    unitFormula: entry.unitFormula,
    aliases: entry.aliases ?? [],

    sourceType: ZERO_TYPE,
    targetType: ordinaryWord.netType,

    ordinaryLeg: {
      boundaryWord: ordinaryWord,
      netTypeDisplacement: ordinaryWord.netType,
    },

    inversionLeg: {
      boundaryWord: inversionWord,
      netTypeDisplacement: inversionWord.netType,
      loopInsertions: [BOX_WORD.id],
    },

    externalAmplitude: {
      symbol: entry.symbol,
    },
    internalReadout: {
      symbol: "I_unit",
    },
    kappa: "κ_unit",

    compiledScalarFormula: `${entry.symbol} = ${entry.unitFormula}`,
    compiledOperatorFormula: `${entry.symbol}: typed unit-address transform`,

    transformSignature24D: {
      ordinarySupport: [],
      inversionSupport: [],
    },
  });
}

export const UNIT_TRANSFORMS = Object.freeze(UNIT_ENTRIES.map(makeUnitTransform));

const groupOrder = [
  "Base units",
  "Kinematic / reciprocal units",
  "Mechanical units",
  "Electromagnetic units",
  "Thermal / molar units",
];

export const UNIT_SELECTOR_GROUPS = Object.freeze(
  groupOrder.map((title) => ({
    title,
    ids: UNIT_TRANSFORMS
      .filter((transform) => transform.selectorGroup === title)
      .map((transform) => transform.id),
  }))
);
