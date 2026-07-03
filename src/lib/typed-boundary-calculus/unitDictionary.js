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
    aliases: ["u"],
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
    aliases: ["MeV/c"],
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
    aliases: ["eV", "MeV", "GeV", "E_h", "Hartree"],
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

  // CODATA reciprocal / density / geometry units
  {
    id: "inverse_mole",
    group: "Thermal / molar units",
    name: "inverse mole",
    symbol: "1/mol",
    unitFormula: "1/mol",
    factors: [f("N_A", 1)],
  },
  {
    id: "inverse_meter",
    group: "Reciprocal / density units",
    name: "inverse meter",
    symbol: "1/m",
    unitFormula: "1/m",
    factors: [f("l_p", -1)],
  },
  {
    id: "inverse_cubic_meter",
    group: "Reciprocal / density units",
    name: "inverse cubic meter",
    symbol: "1/m^3",
    unitFormula: "1/m^3",
    factors: [f("l_p", -3)],
  },
  {
    id: "square_meter",
    group: "Reciprocal / density units",
    name: "square meter",
    symbol: "m^2",
    unitFormula: "m^2",
    factors: [f("l_p", 2)],
  },
  {
    id: "square_meter_per_second",
    group: "Reciprocal / density units",
    name: "square meter per second",
    symbol: "m^2/s",
    unitFormula: "m^2/s",
    factors: [f("t_p", -1), f("l_p", 2)],
  },
  {
    id: "cubic_meter_per_mole",
    group: "Thermal / molar units",
    name: "cubic meter per mole",
    symbol: "m^3/mol",
    unitFormula: "m^3/mol",
    factors: [f("l_p", 3), f("N_A", 1)],
  },

  // CODATA action / spectral / radiation units
  {
    id: "joule_second",
    group: "Action / spectral units",
    name: "joule second",
    symbol: "J s",
    unitFormula: "m^2 kg/s",
    factors: [f("t_p", -1), f("l_p", 2), f("m_p", 1)],
    aliases: ["eV s", "eV/Hz"],
  },
  {
    id: "joule_meter",
    group: "Action / spectral units",
    name: "joule meter",
    symbol: "J m",
    unitFormula: "m^3 kg/s^2",
    factors: [f("t_p", -2), f("l_p", 3), f("m_p", 1)],
    aliases: ["MeV fm"],
  },
  {
    id: "watt_square_meter",
    group: "Action / spectral units",
    name: "watt square meter",
    symbol: "W m^2",
    unitFormula: "m^4 kg/s^3",
    factors: [f("t_p", -3), f("l_p", 4), f("m_p", 1)],
  },
  {
    id: "stefan_boltzmann_unit",
    group: "Action / spectral units",
    name: "watt per square meter kelvin fourth",
    symbol: "W/(m^2 K^4)",
    unitFormula: "kg/(s^3 K^4)",
    factors: [f("t_p", -3), f("T_p", -4), f("m_p", 1)],
  },
  {
    id: "joule_second_per_mole",
    group: "Thermal / molar units",
    name: "joule second per mole",
    symbol: "J s/mol",
    unitFormula: "m^2 kg/(s mol)",
    factors: [f("t_p", -1), f("l_p", 2), f("m_p", 1), f("N_A", 1)],
  },

  // CODATA gravitational / natural-unit powers
  {
    id: "newtonian_gravitation_unit",
    group: "Gravitational / natural-unit powers",
    name: "newtonian gravitation unit",
    symbol: "m^3/(s^2 kg)",
    unitFormula: "m^3/(s^2 kg)",
    factors: [f("t_p", -2), f("l_p", 3), f("m_p", -1)],
  },
  {
    id: "inverse_square_joule",
    group: "Gravitational / natural-unit powers",
    name: "inverse square joule",
    symbol: "J^-2",
    unitFormula: "s^4/(m^4 kg^2)",
    factors: [f("t_p", 4), f("l_p", -4), f("m_p", -2)],
    aliases: ["GeV^-2"],
  },
  {
    id: "inverse_square_kilogram",
    group: "Gravitational / natural-unit powers",
    name: "inverse square kilogram",
    symbol: "kg^-2",
    unitFormula: "kg^-2",
    factors: [f("m_p", -2)],
    aliases: ["c^4/GeV^2"],
  },

  // CODATA electric and magnetic field units
  {
    id: "volt_per_meter",
    group: "Field / polarizability units",
    name: "volt per meter",
    symbol: "V/m",
    unitFormula: "m kg/(s^2 C)",
    factors: [f("t_p", -2), f("l_p", 1), f("q_p", -1), f("m_p", 1)],
  },
  {
    id: "volt_per_square_meter",
    group: "Field / polarizability units",
    name: "volt per square meter",
    symbol: "V/m^2",
    unitFormula: "kg/(s^2 C)",
    factors: [f("t_p", -2), f("q_p", -1), f("m_p", 1)],
  },
  {
    id: "farad_per_meter",
    group: "Field / polarizability units",
    name: "farad per meter",
    symbol: "F/m",
    unitFormula: "s^2 C^2/(m^3 kg)",
    factors: [f("t_p", 2), f("l_p", -3), f("q_p", 2), f("m_p", -1)],
  },
  {
    id: "meter_per_farad",
    group: "Field / polarizability units",
    name: "meter per farad",
    symbol: "m/F",
    unitFormula: "m^3 kg/(s^2 C^2)",
    factors: [f("t_p", -2), f("l_p", 3), f("q_p", -2), f("m_p", 1)],
  },
  {
    id: "newton_per_ampere_squared",
    group: "Field / polarizability units",
    name: "newton per ampere squared",
    symbol: "N/A^2",
    unitFormula: "m kg/C^2",
    factors: [f("l_p", 1), f("q_p", -2), f("m_p", 1)],
  },
  {
    id: "coulomb_per_kilogram",
    group: "Field / polarizability units",
    name: "coulomb per kilogram",
    symbol: "C/kg",
    unitFormula: "C/kg",
    factors: [f("q_p", 1), f("m_p", -1)],
    aliases: ["Hz/T", "MHz/T", "1/(s T)"],
  },
  {
    id: "ampere_per_joule",
    group: "Field / polarizability units",
    name: "ampere per joule",
    symbol: "A/J",
    unitFormula: "s C/(m^2 kg)",
    factors: [f("t_p", 1), f("l_p", -2), f("q_p", 1), f("m_p", -1)],
    aliases: ["Hz/V"],
  },
  {
    id: "inverse_meter_per_tesla",
    group: "Field / polarizability units",
    name: "inverse meter per tesla",
    symbol: "1/(m T)",
    unitFormula: "s C/(m kg)",
    factors: [f("t_p", 1), f("l_p", -1), f("q_p", 1), f("m_p", -1)],
  },
  {
    id: "kelvin_per_tesla",
    group: "Field / polarizability units",
    name: "kelvin per tesla",
    symbol: "K/T",
    unitFormula: "s C K/kg",
    factors: [f("t_p", 1), f("q_p", 1), f("T_p", 1), f("m_p", -1)],
  },
  {
    id: "joule_per_tesla",
    group: "Field / polarizability units",
    name: "joule per tesla",
    symbol: "J/T",
    unitFormula: "m^2 C/s",
    factors: [f("t_p", -1), f("l_p", 2), f("q_p", 1)],
    aliases: ["eV/T"],
  },
  {
    id: "joule_per_tesla_squared",
    group: "Field / polarizability units",
    name: "joule per tesla squared",
    symbol: "J/T^2",
    unitFormula: "m^2 C^2/kg",
    factors: [f("l_p", 2), f("q_p", 2), f("m_p", -1)],
  },

  // CODATA charge distribution / polarizability units
  {
    id: "coulomb_per_cubic_meter",
    group: "Field / polarizability units",
    name: "coulomb per cubic meter",
    symbol: "C/m^3",
    unitFormula: "C/m^3",
    factors: [f("l_p", -3), f("q_p", 1)],
  },
  {
    id: "coulomb_meter",
    group: "Field / polarizability units",
    name: "coulomb meter",
    symbol: "C m",
    unitFormula: "C m",
    factors: [f("l_p", 1), f("q_p", 1)],
  },
  {
    id: "coulomb_square_meter",
    group: "Field / polarizability units",
    name: "coulomb square meter",
    symbol: "C m^2",
    unitFormula: "C m^2",
    factors: [f("l_p", 2), f("q_p", 1)],
  },
  {
    id: "electric_polarizability",
    group: "Field / polarizability units",
    name: "electric polarizability",
    symbol: "m^2 C^2/J",
    unitFormula: "s^2 C^2/kg",
    factors: [f("t_p", 2), f("q_p", 2), f("m_p", -1)],
  },
  {
    id: "first_hyperpolarizability",
    group: "Field / polarizability units",
    name: "first hyperpolarizability",
    symbol: "m^3 C^3/J^2",
    unitFormula: "s^4 C^3/(m kg^2)",
    factors: [f("t_p", 4), f("l_p", -1), f("q_p", 3), f("m_p", -2)],
  },
  {
    id: "second_hyperpolarizability",
    group: "Field / polarizability units",
    name: "second hyperpolarizability",
    symbol: "m^4 C^4/J^3",
    unitFormula: "s^6 C^4/(m^2 kg^3)",
    factors: [f("t_p", 6), f("l_p", -2), f("q_p", 4), f("m_p", -3)],
  },

  // CODATA thermal conversion units
  {
    id: "meter_kelvin",
    group: "Thermal / molar units",
    name: "meter kelvin",
    symbol: "m K",
    unitFormula: "m K",
    factors: [f("l_p", 1), f("T_p", 1)],
  },
  {
    id: "inverse_meter_kelvin",
    group: "Thermal / molar units",
    name: "inverse meter per kelvin",
    symbol: "1/(m K)",
    unitFormula: "1/(m K)",
    factors: [f("l_p", -1), f("T_p", -1)],
  },
  {
    id: "hertz_per_kelvin",
    group: "Thermal / molar units",
    name: "hertz per kelvin",
    symbol: "Hz/K",
    unitFormula: "1/(s K)",
    factors: [f("t_p", -1), f("T_p", -1)],
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
  "Reciprocal / density units",
  "Mechanical units",
  "Electromagnetic units",
  "Field / polarizability units",
  "Thermal / molar units",
  "Action / spectral units",
  "Gravitational / natural-unit powers",
];

export const UNIT_SELECTOR_GROUPS = Object.freeze(
  groupOrder.map((title) => ({
    title,
    ids: UNIT_TRANSFORMS
      .filter((transform) => transform.selectorGroup === title)
      .map((transform) => transform.id),
  }))
);
