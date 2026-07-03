import { addType, scaleType, ZERO_TYPE, equalType, isZeroType } from "./typeVector";
import { getBoundaryToken } from "./boundaryTokens";

export function makeFactor(tokenId, exponent = 1) {
  if (!Number.isInteger(exponent)) {
    throw new Error(`Boundary-word exponents must be integers. Received ${exponent}`);
  }

  getBoundaryToken(tokenId);

  return Object.freeze({ tokenId, exponent });
}

export function aggregateFactors(factors) {
  const map = new Map();

  factors.forEach((factor) => {
    const previous = map.get(factor.tokenId) ?? 0;
    const next = previous + factor.exponent;

    if (next === 0) {
      map.delete(factor.tokenId);
    } else {
      map.set(factor.tokenId, next);
    }
  });

  return Array.from(map.entries()).map(([tokenId, exponent]) =>
    makeFactor(tokenId, exponent)
  );
}

export function computeWordNetType(factors) {
  return factors.reduce((acc, factor) => {
    const token = getBoundaryToken(factor.tokenId);
    return addType(acc, scaleType(factor.exponent, token.type));
  }, ZERO_TYPE);
}

export function makeBoundaryWord({
  id,
  name,
  pathFactors = [],
  factors = [],
  wordKind = "monomial",
  loopClass = null,
  constructionClass = null,
} = {}) {
  const orderedPathFactors = Object.freeze(
    (pathFactors.length ? pathFactors : factors).map((factor) =>
      makeFactor(factor.tokenId, factor.exponent)
    )
  );

  const normalizedFactors = aggregateFactors(orderedPathFactors);
  const netType = computeWordNetType(orderedPathFactors);

  return Object.freeze({
    id,
    name,
    pathFactors: orderedPathFactors,
    factors: Object.freeze(normalizedFactors),
    netType,
    wordKind,
    loopClass,
    constructionClass,
    isClosed: isZeroType(netType),
    isTrivial: orderedPathFactors.length === 0,
  });
}

export function multiplyWords({ id, name, words, wordKind = "path", loopClass = null }) {
  const pathFactors = words.flatMap((word) => word.pathFactors ?? word.factors);

  return makeBoundaryWord({
    id,
    name,
    pathFactors,
    wordKind,
    loopClass,
  });
}

export function sameNetType(wordA, wordB) {
  return equalType(wordA.netType, wordB.netType);
}

export function isClosedWord(word) {
  return isZeroType(word.netType);
}

export function isTrivialWord(word) {
  return (word.pathFactors ?? word.factors).length === 0;
}

const SUPERSCRIPTS = {
  "-": "⁻",
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
};

function toSuperscript(value) {
  return String(value)
    .split("")
    .map((char) => SUPERSCRIPTS[char] ?? char)
    .join("");
}

function formatExponent(exponent) {
  if (exponent === 1) return "";
  return toSuperscript(exponent);
}

function formatFactors(factors) {
  if (!factors || factors.length === 0) return "1";

  return factors
    .map((factor) => {
      const token = getBoundaryToken(factor.tokenId);
      return `${token.displaySymbol ?? token.symbol}${formatExponent(factor.exponent)}`;
    })
    .join(" · ");
}

export function formatBoundaryWord(word) {
  return formatFactors(word.factors);
}

export function formatBoundaryPathWord(word) {
  return formatFactors(word.pathFactors ?? word.factors);
}

export function formatStructuredProduct(wordA, wordB) {
  return `(${formatBoundaryPathWord(wordA)})(${formatBoundaryPathWord(wordB)})`;
}

const LATEX_TOKEN_SYMBOLS = {
  t_p: "t_p",
  l_p: "l_p",
  q_p: "q_p",
  T_p: "T_p",
  m_p: "m_p",
  N_A: "N_A",
  C_SI: "\\mathrm{C}",
  m_SI: "\\mathrm{m}",
  kg_SI: "\\mathrm{kg}",
  mol_SI: "\\mathrm{mol}",
};

const TOKEN_DISPLAY_ORDER = {
  // Canonical displayed base order:
  // time, length, charge, temperature, mass, amount,
  // with SI closure bases placed beside the corresponding physical base.
  t_p: 0,

  l_p: 10,
  m_SI: 11,

  q_p: 20,
  C_SI: 21,

  T_p: 30,

  m_p: 40,
  kg_SI: 41,

  N_A: 50,
  mol_SI: 51,
};

function sortFactorsForDisplay(factors) {
  return [...(factors ?? [])].sort((a, b) => {
    const rankA = TOKEN_DISPLAY_ORDER[a.tokenId] ?? 1000;
    const rankB = TOKEN_DISPLAY_ORDER[b.tokenId] ?? 1000;

    if (rankA !== rankB) return rankA - rankB;
    return a.tokenId.localeCompare(b.tokenId);
  });
}

function formatLatexExponent(exponent) {
  if (exponent === 1) return "";
  return `^{${exponent}}`;
}

function latexTokenSymbol(tokenId) {
  return LATEX_TOKEN_SYMBOLS[tokenId] ?? getBoundaryToken(tokenId).symbol;
}

function formatFactorsLatex(factors) {
  if (!factors || factors.length === 0) return "1";

  return sortFactorsForDisplay(factors)
    .map((factor) => `${latexTokenSymbol(factor.tokenId)}${formatLatexExponent(factor.exponent)}`)
    .join(String.raw` \cdot `);
}

export function formatBoundaryPathLatex(word) {
  return formatFactorsLatex(word.factors ?? word.pathFactors);
}

export function formatBoundaryWordLatex(word) {
  return formatFactorsLatex(word.factors);
}

export function formatStructuredProductLatex(wordA, wordB) {
  return `\\left(${formatBoundaryPathLatex(wordA)}\\right)\\left(${formatBoundaryPathLatex(wordB)}\\right)`;
}

const PATH_ENUMERATION_LIMIT = 720;

function expandFactorsToUnitSteps(factors) {
  return (factors ?? []).flatMap((factor) => {
    const exponent = factor.exponent ?? 1;
    const count = Math.abs(exponent);
    const stepExponent = Math.sign(exponent) || 1;

    return Array.from({ length: count }, () => ({
      ...factor,
      exponent: stepExponent,
    }));
  });
}

function canonicalRepresentativeUnitFactors(word) {
  const representativeFactors =
    word?.representativePathFactors ??
    (word?.pathOrderSource === "dictionary_explicit" ? word?.pathFactors : undefined) ??
    sortFactorsForDisplay(word?.factors ?? word?.pathFactors ?? []);

  return expandFactorsToUnitSteps(representativeFactors);
}

function factorStepKey(factor) {
  return `${factor.tokenId}:${factor.exponent}`;
}

function enumerateDistinctUnitPaths(unitFactors, limit = PATH_ENUMERATION_LIMIT) {
  const sortedFactors = sortFactorsForDisplay(unitFactors);
  const counts = new Map();

  sortedFactors.forEach((factor) => {
    const key = factorStepKey(factor);
    const entry = counts.get(key);

    if (entry) {
      entry.count += 1;
    } else {
      counts.set(key, {
        factor,
        count: 1,
      });
    }
  });

  const entries = Array.from(counts.values());
  const paths = [];

  function backtrack(currentPath) {
    if (paths.length >= limit) return;

    if (currentPath.length === sortedFactors.length) {
      paths.push(currentPath.map((factor) => ({ ...factor })));
      return;
    }

    entries.forEach((entry) => {
      if (entry.count <= 0) return;

      entry.count -= 1;
      currentPath.push(entry.factor);
      backtrack(currentPath);
      currentPath.pop();
      entry.count += 1;
    });
  }

  backtrack([]);
  return paths;
}

export function getRepresentativePathFactors(word, options = {}) {
  const mode = options.pathMode ?? word?.pathFamilyMode ?? "canonical";
  const selectedPathIndex = options.selectedPathIndex ?? word?.selectedPathIndex ?? 0;
  const canonical = canonicalRepresentativeUnitFactors(word);

  if (mode !== "cycle") return canonical;

  const metadata = getPathFamilyMetadata(word);
  if (metadata.pathFamilySize <= 1 || metadata.pathFamilySize > PATH_ENUMERATION_LIMIT) {
    return canonical;
  }

  const algebraicFactors = word?.factors ?? word?.pathFactors ?? word?.representativePathFactors ?? [];
  const unitFactors = expandFactorsToUnitSteps(algebraicFactors);
  const paths = enumerateDistinctUnitPaths(unitFactors, PATH_ENUMERATION_LIMIT);

  if (paths.length === 0) return canonical;

  const index = ((selectedPathIndex % paths.length) + paths.length) % paths.length;
  return paths[index];
}

export function expandPathFactors(word, options = {}) {
  // Backward-compatible alias.
  // Important: this now means "expand the selected representative path,"
  // not "the monomial contains one uniquely determined path."
  return getRepresentativePathFactors(word, options);
}

function countDistinctUnitOrderings(unitFactors) {
  const n = unitFactors.length;
  if (n <= 1) return 1;

  const multiplicities = new Map();
  unitFactors.forEach((factor) => {
    const key = factorStepKey(factor);
    multiplicities.set(key, (multiplicities.get(key) ?? 0) + 1);
  });

  let count = factorialNumber(n);
  multiplicities.forEach((multiplicity) => {
    count /= factorialNumber(multiplicity);
  });

  return Math.round(count);
}

function factorialNumber(n) {
  let value = 1;
  for (let k = 2; k <= n; k += 1) value *= k;
  return value;
}

export function getPathFamilyMetadata(word) {
  const algebraicFactors = word?.factors ?? word?.pathFactors ?? word?.representativePathFactors ?? [];
  const unitFactors = expandFactorsToUnitSteps(algebraicFactors);
  const hasExplicitRepresentative = Boolean(word?.representativePathFactors);

  return {
    pathFamilyMode: word?.pathFamilyMode ?? "canonical",
    pathOrderSource:
      word?.pathOrderSource ??
      (hasExplicitRepresentative ? "dictionary_explicit" : "canonical_visualization"),
    pathFamilySize: word?.pathFamilySize ?? countDistinctUnitOrderings(unitFactors),
    selectedPathIndex: word?.selectedPathIndex ?? 0,
    enumerationLimit: PATH_ENUMERATION_LIMIT,
  };
}

export const TRIVIAL_WORD = makeBoundaryWord({
  id: "trivial_word",
  name: "trivial boundary word",
  pathFactors: [],
  wordKind: "identity",
});

export const BOX_WORD = makeBoundaryWord({
  id: "w_box",
  name: "inversion boundary loop",
  wordKind: "closed_boundary_loop",
  loopClass: "inversion_boundary / twisted_zero_boundary",
  pathFactors: [
    makeFactor("l_p", 1),
    makeFactor("m_p", 1),
    makeFactor("q_p", -2),
    makeFactor("C_SI", 2),
    makeFactor("m_SI", -1),
    makeFactor("kg_SI", -1),
  ],
});

export const VELOCITY_WORD = makeBoundaryWord({
  id: "w_velocity",
  name: "velocity-type boundary word",
  wordKind: "boundary_monomial",
  pathFactors: [makeFactor("l_p", 1), makeFactor("t_p", -1)],
});

export const BOLTZMANN_WORD = makeBoundaryWord({
  id: "w_boltzmann_type",
  name: "energy-temperature boundary word",
  wordKind: "boundary_monomial",
  pathFactors: [
    makeFactor("l_p", 2),
    makeFactor("m_p", 1),
    makeFactor("t_p", -2),
    makeFactor("T_p", -1),
  ],
});

export const AVOGADRO_PHYSICAL_CLOSURE_WORD = makeBoundaryWord({
  id: "w_avogadro_physical_closure",
  name: "Avogadro closed physical-boundary construction",
  wordKind: "closed_physical_projection",
  constructionClass: "closed_physical_projection_opens_amount_axis",
  pathFactors: [
    makeFactor("C_SI", 1),
    makeFactor("kg_SI", 1),
    makeFactor("q_p", -1),
    makeFactor("m_p", -1),
  ],
});

export const AVOGADRO_AMOUNT_WORD = makeBoundaryWord({
  id: "w_avogadro_amount",
  name: "Avogadro inverse-amount boundary word",
  wordKind: "amount_axis_opening",
  constructionClass: "inverse_amount_axis_opening",
  pathFactors: [makeFactor("N_A", 1)],
});

export const FARADAY_WORD = makeBoundaryWord({
  id: "w_faraday_type",
  name: "Faraday-type molar charge boundary word",
  wordKind: "molar_boundary_monomial",
  pathFactors: [makeFactor("q_p", 1), makeFactor("N_A", 1)],
});

export const GAS_CONSTANT_WORD = makeBoundaryWord({
  id: "w_gas_constant_type",
  name: "gas-constant-type molar energy-temperature boundary word",
  wordKind: "molar_boundary_monomial",
  pathFactors: [
    makeFactor("l_p", 2),
    makeFactor("m_p", 1),
    makeFactor("t_p", -2),
    makeFactor("T_p", -1),
    makeFactor("N_A", 1),
  ],
});

export const MOLAR_MASS_WORD = makeBoundaryWord({
  id: "w_molar_mass_type",
  name: "molar-mass-type boundary word",
  wordKind: "molar_boundary_monomial",
  pathFactors: [makeFactor("m_p", 1), makeFactor("N_A", 1)],
});
