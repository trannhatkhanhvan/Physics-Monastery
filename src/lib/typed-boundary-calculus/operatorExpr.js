export const OPERATOR_EXPRS = Object.freeze({
  identity: {
    id: "identity",
    symbol: "I",
    expression: "I",
    operatorKind: "identity",
  },

  partition_operator: {
    id: "partition_operator",
    symbol: "P",
    expression: "P^4 + 2πP^2 - 2πaP + 2πI = 0",
    operatorKind: "partition_operator",
  },

  box_hat: {
    id: "box_hat",
    symbol: "⊠̂",
    expression: "⊠̂",
    operatorKind: "closed_loop_insertion",
    supportedSectors: ["M8a", "M8b", "M8c", "M8d"],
  },

  internal_action_hat: {
    id: "internal_action_hat",
    symbol: "Î_α(P)",
    expression: "Î_α(P)",
    operatorKind: "spectral_readout_operator",
  },
});
