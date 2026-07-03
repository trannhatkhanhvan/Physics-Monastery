import { ZERO_TYPE, addType } from "./typeVector";
import { makeOrdinaryLeg, makeInversionLeg } from "./transformLegs";

export function makePairedConstantTransform({
  id,
  name,
  symbol,
  sourceType = ZERO_TYPE,
  boundaryWord,
  externalAmplitude,
  internalReadout,
  kappa = "κ_α",
  transformSignature24D = null,
  notes = "",
}) {
  const targetType = addType(sourceType, boundaryWord.netType);

  const ordinaryLeg = makeOrdinaryLeg({
    id: `${id}_ordinary`,
    boundaryWord,
    externalAmplitude,
  });

  const inversionLeg = makeInversionLeg({
    id: `${id}_inversion`,
    boundaryWord,
    externalAmplitude,
    internalReadout,
    kappa,
  });

  return Object.freeze({
    id,
    name,
    symbol,
    sourceType,
    targetType,
    boundaryWord,
    ordinaryLeg,
    inversionLeg,
    externalAmplitude,
    internalReadout,
    kappa,
    transformSignature24D,
    compiledScalarFormula: `${symbol} = B · ${externalAmplitude.expression} · (1 + ${kappa} · ${internalReadout.expression} · ⊠)`,
    compiledOperatorFormula: `U_${symbol} = ${externalAmplitude.expression}(I + ${kappa} Î_α(P)⊠̂)`,
    notes,
  });
}
