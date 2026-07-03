import { makeType, ZERO_TYPE } from "./typeVector";
import {
  BOX_WORD,
  VELOCITY_WORD,
  BOLTZMANN_WORD,
  AVOGADRO_PHYSICAL_CLOSURE_WORD,
  AVOGADRO_AMOUNT_WORD,
  FARADAY_WORD,
  GAS_CONSTANT_WORD,
  MOLAR_MASS_WORD,
} from "./boundaryWords";
import { READOUT_RULES } from "./readoutRules";
import { makePairedConstantTransform } from "./pairedTransforms";
import {
  validateBoundaryWord,
  validateClosedNontrivialLoop,
  validatePairedTransform,
} from "./validators";

export const SEED_BOUNDARY_WORDS = Object.freeze([
  BOX_WORD,
  VELOCITY_WORD,
  BOLTZMANN_WORD,
  AVOGADRO_PHYSICAL_CLOSURE_WORD,
  AVOGADRO_AMOUNT_WORD,
  FARADAY_WORD,
  GAS_CONSTANT_WORD,
  MOLAR_MASS_WORD,
]);

export const SEED_TYPED_OBJECTS = Object.freeze([
  {
    id: "box_boundary",
    name: "inversion boundary",
    symbol: "⊠",
    netType: BOX_WORD.netType,
    boundaryWord: BOX_WORD,
    objectKind: "closed_boundary_loop",
    dimensionlessKind: "closed_boundary_loop",
    loopClass: BOX_WORD.loopClass,
    scalarReadout: READOUT_RULES.box_scalar,
    operator: "⊠̂",
  },

  {
    id: "avogadro_boundary",
    name: "Avogadro amount boundary",
    symbol: "N_A",
    netType: makeType({ n: -1 }),
    physicalProjectionWord: AVOGADRO_PHYSICAL_CLOSURE_WORD,
    boundaryWord: AVOGADRO_AMOUNT_WORD,
    objectKind: "amount_anchor",
    constructionClass: "closed physical-boundary construction opens inverse amount axis",
  },

  {
    id: "faraday_type",
    name: "Faraday molar charge type",
    symbol: "F",
    netType: makeType({ q: 1, n: -1 }),
    boundaryWord: FARADAY_WORD,
    objectKind: "molar_constant_type",
  },

  {
    id: "gas_constant_type",
    name: "gas constant molar energy-temperature type",
    symbol: "R",
    netType: makeType({ t: -2, l: 2, theta: -1, m: 1, n: -1 }),
    boundaryWord: GAS_CONSTANT_WORD,
    objectKind: "molar_constant_type",
  },

  {
    id: "molar_mass_type",
    name: "molar mass type",
    symbol: "M_x",
    netType: makeType({ m: 1, n: -1 }),
    boundaryWord: MOLAR_MASS_WORD,
    objectKind: "molar_constant_type",
  },
]);

export const SEED_TRANSFORMS = Object.freeze([
  makePairedConstantTransform({
    id: "generic_velocity_transform",
    name: "generic velocity-type paired transform",
    symbol: "C_velocity",
    sourceType: ZERO_TYPE,
    boundaryWord: VELOCITY_WORD,
    externalAmplitude: READOUT_RULES.E_alpha,
    internalReadout: READOUT_RULES.I_alpha,
    kappa: "κ_α",
    transformSignature24D: {
      ordinarySupport: ["global120", "T44", "L35"],
      inversionSupport: ["M8a", "M8b", "M8c", "M8d"],
    },
    notes: "Seed example using l_p/t_p as the ordinary boundary monomial.",
  }),

  makePairedConstantTransform({
    id: "generic_energy_temperature_transform",
    name: "generic energy-temperature paired transform",
    symbol: "C_energy_temperature",
    sourceType: ZERO_TYPE,
    boundaryWord: BOLTZMANN_WORD,
    externalAmplitude: READOUT_RULES.root_difference,
    internalReadout: READOUT_RULES.root_product,
    kappa: "κ_β",
    transformSignature24D: {
      ordinarySupport: ["global120", "T44", "L35", "Theta32a"],
      inversionSupport: ["M8a", "M8b", "M8c", "M8d"],
    },
    notes: "Seed example using l_p^2 m_p /(t_p^2 T_p).",
  }),

  makePairedConstantTransform({
    id: "avogadro_amount_transform",
    name: "Avogadro inverse-amount paired transform",
    symbol: "N_A",
    sourceType: ZERO_TYPE,
    boundaryWord: AVOGADRO_AMOUNT_WORD,
    externalAmplitude: READOUT_RULES.E_alpha,
    internalReadout: READOUT_RULES.I_alpha,
    kappa: "κ_N",
    transformSignature24D: {
      ordinarySupport: ["global120"],
      inversionSupport: ["M8a", "M8b", "M8c", "M8d"],
    },
    notes: "Tests the inverse amount axis: τ(N_A) = (0,0,0,0,0,-1).",
  }),

  makePairedConstantTransform({
    id: "faraday_transform",
    name: "Faraday molar charge paired transform",
    symbol: "F",
    sourceType: ZERO_TYPE,
    boundaryWord: FARADAY_WORD,
    externalAmplitude: READOUT_RULES.E_alpha,
    internalReadout: READOUT_RULES.I_alpha,
    kappa: "κ_F",
    transformSignature24D: {
      ordinarySupport: ["global120", "Q18a", "Q18b"],
      inversionSupport: ["M8a", "M8b", "M8c", "M8d"],
    },
    notes: "Tests molar charge type: τ(F) = (0,0,1,0,0,-1).",
  }),

  makePairedConstantTransform({
    id: "gas_constant_transform",
    name: "gas constant molar paired transform",
    symbol: "R",
    sourceType: ZERO_TYPE,
    boundaryWord: GAS_CONSTANT_WORD,
    externalAmplitude: READOUT_RULES.root_difference,
    internalReadout: READOUT_RULES.I_alpha,
    kappa: "κ_R",
    transformSignature24D: {
      ordinarySupport: ["global120", "T44", "L35", "Theta32a"],
      inversionSupport: ["M8a", "M8b", "M8c", "M8d"],
    },
    notes: "Tests molar energy-temperature type: τ(R)=(-2,2,0,-1,1,-1).",
  }),

  makePairedConstantTransform({
    id: "molar_mass_transform",
    name: "molar mass paired transform",
    symbol: "M_x",
    sourceType: ZERO_TYPE,
    boundaryWord: MOLAR_MASS_WORD,
    externalAmplitude: READOUT_RULES.E_alpha,
    internalReadout: READOUT_RULES.I_alpha,
    kappa: "κ_M",
    transformSignature24D: {
      ordinarySupport: ["global120", "M8a"],
      inversionSupport: ["M8a", "M8b", "M8c", "M8d"],
    },
    notes: "Tests molar mass type: τ(M_x) = (0,0,0,0,1,-1).",
  }),
]);

export const MODEL_VALIDATION = Object.freeze({
  boxLoop: validateClosedNontrivialLoop(BOX_WORD),
  boundaryWords: SEED_BOUNDARY_WORDS.map((word) => ({
    id: word.id,
    name: word.name,
    checks: validateBoundaryWord(word),
  })),
  pairedTransforms: SEED_TRANSFORMS.map((transform) => ({
    id: transform.id,
    name: transform.name,
    checks: validatePairedTransform(transform),
  })),
});
