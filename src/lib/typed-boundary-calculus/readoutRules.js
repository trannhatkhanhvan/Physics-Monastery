export const READOUT_RULES = Object.freeze({
  E_alpha: {
    id: "E_alpha",
    name: "external geometric amplitude",
    symbol: "E_α",
    expression: "E_α",
    readoutRole: "external_amplitude",
  },

  I_alpha: {
    id: "I_alpha",
    name: "internal spectral/root action",
    symbol: "I_α",
    expression: "I_α",
    readoutRole: "internal_twisted_insertion_readout",
  },

  box_scalar: {
    id: "box_scalar",
    name: "scalar inversion boundary",
    symbol: "⊠",
    expression: "(lₚmₚ/qₚ²)(C_SI²/(m_SI kg_SI))",
    readoutRole: "closed_boundary_loop_scalar",
  },

  root_difference: {
    id: "root_difference",
    name: "partition-root difference",
    symbol: "ж₁ − ж₂",
    expression: "ж₁ − ж₂",
    readoutRole: "spectral_readout",
  },

  root_product: {
    id: "root_product",
    name: "complex root product",
    symbol: "ж₃ж₄",
    expression: "ж₃ж₄",
    readoutRole: "spectral_readout",
  },
});

export function getReadoutRule(id) {
  const rule = READOUT_RULES[id];

  if (!rule) {
    throw new Error(`Unknown readout rule: ${id}`);
  }

  return rule;
}
