import { BOX_WORD, multiplyWords } from "./boundaryWords";
import { OPERATOR_EXPRS } from "./operatorExpr";

export function makeOrdinaryLeg({ id, boundaryWord, externalAmplitude }) {
  return Object.freeze({
    id,
    branchKind: "ordinary",
    boundaryWord,
    netTypeDisplacement: boundaryWord.netType,
    scalarReadout: externalAmplitude,
    scalarExpression: externalAmplitude.expression,
    sectorAction: OPERATOR_EXPRS.identity,
    loopInsertions: [],
  });
}

export function makeInversionLeg({
  id,
  boundaryWord,
  externalAmplitude,
  internalReadout,
  kappa,
  boxWord = BOX_WORD,
}) {
  const compositeWord = multiplyWords({
    id: `${boundaryWord.id}_with_box`,
    name: `${boundaryWord.name} with inversion boundary loop`,
    words: [boundaryWord, boxWord],
    wordKind: "boundary_path_with_closed_loop",
    loopClass: boxWord.loopClass,
  });

  return Object.freeze({
    id,
    branchKind: "inversion_boundary",
    boundaryWord: compositeWord,
    netTypeDisplacement: compositeWord.netType,
    scalarReadout: {
      id: `${id}_scalar_readout`,
      symbol: `${externalAmplitude.symbol} ${kappa} ${internalReadout.symbol} ⊠`,
      expression: `${externalAmplitude.expression} * ${kappa} * ${internalReadout.expression} * ⊠`,
      readoutRole: "inversion_branch_scalar",
    },
    scalarExpression: `${externalAmplitude.expression} * ${kappa} * ${internalReadout.expression} * ⊠`,
    sectorAction: {
      id: `${id}_sector_action`,
      symbol: `${internalReadout.symbol} ⊠̂`,
      expression: `Î_α(P) ⊠̂`,
      operatorKind: "symbolic_inversion_branch_operator",
      factors: [OPERATOR_EXPRS.internal_action_hat, OPERATOR_EXPRS.box_hat],
    },
    loopInsertions: [boxWord.id],
  });
}
