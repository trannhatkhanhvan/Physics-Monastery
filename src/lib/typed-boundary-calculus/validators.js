import { addType, equalType, formatType } from "./typeVector";
import { computeWordNetType, isClosedWord, isTrivialWord, sameNetType } from "./boundaryWords";

function result(label, pass, detail = "") {
  return Object.freeze({ label, pass, detail });
}

export function validateBoundaryWord(word) {
  const computed = computeWordNetType(word.factors);

  return [
    result(
      "stored net type equals computed net type",
      equalType(word.netType, computed),
      `stored ${formatType(word.netType)} / computed ${formatType(computed)}`
    ),
  ];
}

export function validateClosedNontrivialLoop(word) {
  return [
    result(
      "loop has zero net type",
      isClosedWord(word),
      `net type ${formatType(word.netType)}`
    ),
    result(
      "loop is not the trivial word",
      !isTrivialWord(word),
      `word has ${word.factors.length} boundary factors`
    ),
  ];
}

export function validatePairedTransform(transform) {
  const ordinaryWord = transform.ordinaryLeg.boundaryWord;
  const inversionWord = transform.inversionLeg.boundaryWord;

  const ordinaryTarget = addType(transform.sourceType, ordinaryWord.netType);
  const inversionTarget = addType(transform.sourceType, inversionWord.netType);

  return [
    result(
      "ordinary leg lands at target type",
      equalType(ordinaryTarget, transform.targetType),
      `${formatType(transform.sourceType)} + ${formatType(ordinaryWord.netType)} = ${formatType(ordinaryTarget)}`
    ),
    result(
      "inversion leg lands at target type",
      equalType(inversionTarget, transform.targetType),
      `${formatType(transform.sourceType)} + ${formatType(inversionWord.netType)} = ${formatType(inversionTarget)}`
    ),
    result(
      "ordinary and inversion legs have same net displacement",
      sameNetType(ordinaryWord, inversionWord),
      `${formatType(ordinaryWord.netType)} vs ${formatType(inversionWord.netType)}`
    ),
    result(
      "inversion leg carries the ⊠ loop insertion",
      transform.inversionLeg.loopInsertions.includes("w_box"),
      `loop insertions: ${transform.inversionLeg.loopInsertions.join(", ") || "none"}`
    ),
  ];
}
