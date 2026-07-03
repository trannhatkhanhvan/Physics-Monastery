import { makeType } from "./typeVector";

export const BOUNDARY_TOKENS = Object.freeze({
  t_p: {
    id: "t_p",
    symbol: "t_p",
    displaySymbol: "tₚ",
    name: "Planck time",
    type: makeType({ t: 1 }),
    tokenKind: "planck_boundary",
  },

  l_p: {
    id: "l_p",
    symbol: "l_p",
    displaySymbol: "lₚ",
    name: "Planck length",
    type: makeType({ l: 1 }),
    tokenKind: "planck_boundary",
  },

  q_p: {
    id: "q_p",
    symbol: "q_p",
    displaySymbol: "qₚ",
    name: "Planck charge",
    type: makeType({ q: 1 }),
    tokenKind: "planck_boundary",
  },

  T_p: {
    id: "T_p",
    symbol: "T_p",
    displaySymbol: "Tₚ",
    name: "Planck temperature",
    type: makeType({ theta: 1 }),
    tokenKind: "planck_boundary",
  },

  m_p: {
    id: "m_p",
    symbol: "m_p",
    displaySymbol: "mₚ",
    name: "Planck mass",
    type: makeType({ m: 1 }),
    tokenKind: "planck_boundary",
  },

  N_A: {
    id: "N_A",
    symbol: "N_A",
    displaySymbol: "N_A",
    name: "Avogadro constant",
    type: makeType({ n: -1 }),
    tokenKind: "amount_anchor",
    note: "Closed physical-boundary construction that opens the inverse amount axis.",
  },

  C_SI: {
    id: "C_SI",
    symbol: "C_SI",
    displaySymbol: "C",
    name: "SI coulomb unit",
    type: makeType({ q: 1 }),
    tokenKind: "si_unit",
  },

  m_SI: {
    id: "m_SI",
    symbol: "m_SI",
    displaySymbol: "m",
    name: "SI meter unit",
    type: makeType({ l: 1 }),
    tokenKind: "si_unit",
  },

  kg_SI: {
    id: "kg_SI",
    symbol: "kg_SI",
    displaySymbol: "kg",
    name: "SI kilogram unit",
    type: makeType({ m: 1 }),
    tokenKind: "si_unit",
  },

  mol_SI: {
    id: "mol_SI",
    symbol: "mol_SI",
    displaySymbol: "mol",
    name: "SI mole unit",
    type: makeType({ n: 1 }),
    tokenKind: "si_unit",
  },
});

export function getBoundaryToken(tokenId) {
  const token = BOUNDARY_TOKENS[tokenId];

  if (!token) {
    throw new Error(`Unknown boundary token: ${tokenId}`);
  }

  return token;
}

export const BOUNDARY_TOKEN_LIST = Object.freeze(Object.values(BOUNDARY_TOKENS));
