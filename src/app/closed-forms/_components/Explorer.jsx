'use client';

import styles from './explorer-layout.module.css';
import { createPortal } from 'react-dom';
import {
  scoreCandidatePreference,
  compareCandidatePreference,
  compareCandidateGroupPreference,
  fractionalGroupRank,
  hasNamedGeometricConstant
} from '../../../lib/closed-form-preference';
// Full Run merges candidates by displayed numerical value.
import {
  certifyFractionalTop1000
} from '../../../lib/closed-form-fractional-stop';
import rootActions from './root-actions.json';
import { CLOSED_FORM_ADDITIONS } from
  '../../../lib/closed-form-library';
import {
  countSearchMonomials,
  maxQuickFactors,
  maxQuickDepth,
  QUICK_MONOMIAL_LIMIT
} from '../../../lib/closed-form-count';
import symbolSvgs from './symbol-svgs.json';
import symbolFontWidths from './symbol-font-widths.json';

import {
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

const EXCLUDED_CONSTANTS = new Set(["zhe_2", "zhe_1", "IB", "zhe_r", "zhe_theta", "nu_peak", "lambda_peak"]);

const CONSTANT_DISPLAY_ORDER = [
  "G_Gi",
  "s",
  "V_fe",
  "L",
  "K",
  "L_1",
  "C_d",
  "L_2",
  "D_d",
  "C_U",
  "pi",
  "G_Ga",
  "P_up",
  "S",
  "e",
  "W_We",
  "e_pi",
  "zeta_2",
  "e_gamma",
  "zeta_3",
  "x_infinity",
  "C_Q",
  "C_CF",
  "D_Do",
  "omega_2",
  "C_CFP",
  "P",
  "C_R1",
  "L_LL",
  "M",
  "j_01",
  "L_Li",
  "F*",
  "rho_prime",
  "V_5_2",
  "V_6_1",
  "V_7_2",
  "V_8_1",
  "V_9_2",
  "V_10_1",
  "V_11a247",
  "V_12a803",
  "V_13a3143",
];

const CONSTANT_ORDER_STORAGE_KEY =
  'closed-form-constant-order-v2';

const panel = {
  background: 'rgba(17, 25, 38, 0.80)',
  border: '1px solid #334156',
  borderRadius: 12,
  padding: 13,
  marginBottom: 0
};

const field = {
  color: '#eaf0f9',
  background: '#0d1420',
  border: '1px solid #54677f',
  borderRadius: 7,
  padding: '8px 10px',
  width: '100%'
};

const button = {
  color: '#f6faff',
  background: '#274768',
  border: '1px solid #6383a5',
  borderRadius: 7,
  padding: '9px 15px',
  cursor: 'pointer'
};

function parseMeasurement(input) {
  const match =
    /^\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))\((\d{2,3})\)(?:[eE]([+-]?\d+))?\s*$/
      .exec(input);

  if (!match) {
    throw Error(
      'Enter 3.66114(23), 3.66114(235), or use e-27.'
    );
  }

  const [, mantissa, errors, exponentText] = match;
  const exponent = Number(exponentText || 0);

  const count = mantissa
    .replace(/[+\-.]/g, '')
    .replace(/^0+/, '').length;

  if (
    count < 3 ||
    count > 20 ||
    exponent < -290 ||
    exponent > 290
  ) {
    throw Error(
      'Use 3–14 significant digits and an exponent between −290 and 290.'
    );
  }

  const places = (mantissa.split('.')[1] || '').length;
  const center = Number(mantissa) * 10 ** exponent;
  const oneSigma = Number(errors) * 10 ** (exponent - places);

  if (
    !Number.isFinite(center) ||
    !Number.isFinite(oneSigma) ||
    oneSigma <= 0
  ) {
    throw Error('The value or uncertainty is out of range.');
  }

  // Preserve the original 444-seeded, five-precision search.
  const seed = Number(
    mantissa.includes('.')
      ? mantissa + '444'
      : mantissa + '.444'
  );

  const digits = Array.from(
    { length: 5 },
    (_, i) => count + 2 - i
  );

  const values = digits.map(n =>
    (seed * 10 ** exponent).toPrecision(n)
  );

  return {
    center,
    oneSigma,
    count,
    exponent,
    seed,
    digits,
    values
  };
}

const MAX_CANDIDATE_COMPONENTS = 10;

const MAX_NUMERIC_COMPONENT = 288;

function hasOversizedNumericComponent(expression) {
  const numberPattern =
    /(?<![\p{L}\p{N}_])(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?(?![\p{L}\p{N}_])/gu;

  for (const match of String(expression).matchAll(numberPattern)) {
    if (Math.abs(Number(match[0])) > MAX_NUMERIC_COMPONENT) {
      return true;
    }
  }

  return false;
}


function evaluateCandidate(source, symbolValues, additionalNumbers = []) {
  let text = source
    .replace(/Catalan(?:'s)? constant/gi, 'K')
    .replace(/Gauss(?:'s)? constant/gi, 'G_Ga')
    .replace(/Gieseking(?:'s)? constant/gi, 'G_Gi')
    .replace(/golden ratio/gi, 'phi')
    .replace(/π/g, 'pi')
    .replace(/√\s*\(/g, 'sqrt(')
    .replace(/[−–]/g, '-')
    .replace(/[×·]/g, '*')
    .replace(/÷/g, '/')
    .trim();

  // Normalize additional WolframAlpha mathematical notation.
  text = text
    .replace(/Weierstrass(?:'s)? constant/gi, 'W_We')
    .replace(/Riemann zeta function/gi, 'zeta')
    .replace(/ζ/g, 'zeta')
    .replace(/∛\s*\(([^()]+)\)/g, 'cbrt($1)')
    .replace(/∛\s*(\d+(?:\.\d+)?)/g, 'cbrt($1)')
    .replace(/\bln\s*\(/g, 'log(');

  if (
    text.length > 110 ||
    text.includes('...') ||
    text.includes('…')
  ) return null;

  text = text
    .replace(
      /(\d)\s*(?=(?:pi|K|sqrt|phi)\b)/g,
      '$1*'
    )
    .replace(/\)\s*(?=\()/g, ')*(');

  // WolframAlpha may omit multiplication signs.
  text = text
    .replace(
      /(\d|\))\s*(?=(?:sqrt|cbrt|zeta|pi|phi|K|W_We)\b)/g,
      '$1*'
    );

  const tokens = [];
  const regex =
    /\d+(?:\.\d*)?(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?|[A-Za-z_][A-Za-z_0-9]*|[()+*/^,-]/y;

  let pos = 0;

  while (pos < text.length) {
    if (/\s/.test(text[pos])) {
      pos++;
      continue;
    }

    regex.lastIndex = pos;
    const match = regex.exec(text);

    if (!match) return null;

    tokens.push(match[0]);
    pos = regex.lastIndex;
  }

  // Each number, named constant, function or operator
  // contributes one component. Grouping punctuation does not.
  const componentCount = tokens.filter(token =>
    token !== '(' &&
    token !== ')' &&
    token !== ','
  ).length;

  if (componentCount > MAX_CANDIDATE_COMPONENTS) {
    return null;
  }

  let at = 0;
  let operations = 0;
  const symbols = new Set();

  const peek = () => tokens[at];

  const consume = c => {
    if (peek() !== c) {
      throw Error('Unexpected token');
    }
    at++;
  };

  const atom = () => {
    if (peek() === '+' || peek() === '-') {
      const sign = tokens[at++];
      operations++;
      return (sign === '-' ? -1 : 1) * atom();
    }

    if (peek() === '(') {
      at++;
      const v = sum();
      consume(')');
      return v;
    }

    const t = tokens[at++];

    if (!t) throw Error('Missing term');

    if (/^(?:\d|\.)/.test(t)) return Number(t);

    if (
      peek() === '(' &&
      [
        'sqrt', 'cbrt', 'exp', 'log', 'abs',
        'zeta', 'sin', 'cos', 'tan',
        'sinh', 'cosh', 'tanh'
      ].includes(t)
    ) {
      at++;

      const v = sum();
      consume(')');

      operations += 2;

      return ({
        sqrt: Math.sqrt,
        cbrt: Math.cbrt,
        exp: Math.exp,
        log: Math.log,
        abs: Math.abs,
        sin: Math.sin,
        cos: Math.cos,
        tan: Math.tan,
        sinh: Math.sinh,
        cosh: Math.cosh,
        tanh: Math.tanh,
        zeta: n => {
          // Established special values. Unsupported arguments
          // return NaN rather than an invented approximation.
          const values = {
            2: Math.PI ** 2 / 6,
            3: 1.2020569031595942854,
            4: Math.PI ** 4 / 90,
            5: 1.0369277551433699,
            6: Math.PI ** 6 / 945
          };
          return Object.prototype.hasOwnProperty.call(values, n)
            ? values[n] : NaN;
        }
      })[t](v);
    }

    if (!(t in symbolValues)) {
      throw Error('Unknown symbol');
    }

    symbols.add(t);
    return symbolValues[t];
  };

  const power = () => {
    const v = atom();

    if (peek() === '^') {
      at++;
      operations += 2;
      return v ** power();
    }

    return v;
  };

  const product = () => {
    let v = power();

    while (peek() === '*' || peek() === '/') {
      const op = tokens[at++];
      operations++;

      const b = power();
      v = op === '*' ? v * b : v / b;
    }

    return v;
  };

  const sum = () => {
    let v = product();

    while (peek() === '+' || peek() === '-') {
      const op = tokens[at++];
      operations += 2;

      const b = product();
      v = op === '+' ? v + b : v - b;
    }

    return v;
  };

  try {
    const value = sum();

    if (
      at !== tokens.length ||
      !Number.isFinite(value)
    ) return null;

    const meaningful =
      symbols.size ||
      /sqrt|cbrt|exp|log|zeta|sin|cos|tan/.test(text) ||
      additionalNumbers.some(number =>
        text.includes(number)
      );

    if (!meaningful) return null;

    return {
      value,
      complexity: componentCount
    };
  } catch {
    return null;
  }
}

// Count visible mathematical components, not the internal
// complexity of a named constant.
function wolframComponents(expression) {
  let text = String(expression).trim();

  // A named constant is one component.
  text = text.replace(
    /(?:[A-Za-z][A-Za-z'-]*\s+){0,5}[A-Za-z][A-Za-z'-]*\s+constant\b/gi,
    'NamedConstant'
  );

  // A special function evaluated at a single numerical
  // argument is one component, e.g. zeta(2).
  // Elementary operations such as sqrt remain separate.
  text = text.replace(
    /([\p{L}_][\p{L}\p{N}_]*)\s*\(\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*\)/gu,
    (whole, name) =>
      /^(sqrt|cbrt|exp|log|ln|abs|sin|cos|tan)$/i.test(name)
        ? whole
        : 'NamedFunction'
  );

  // A rational exponent (1/3) is one component.
  text = text.replace(
    /\(\s*[+-]?\d+\s*\/\s*\d+\s*\)/g,
    'RationalNumber'
  );

  // Count numbers, symbols, named functions and radicals.
  // Never count arithmetic operators, signs or parentheses.
  const tokens = text.match(
    /(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|[\p{L}_][\p{L}\p{N}_]*|[√∛]/gu
  ) || [];

  return tokens.length;
}

// Extract a numerical approximation explicitly associated
// with a WolframAlpha symbolic expression.
function wolframApproximation(line) {
  const match =
    /^(.+?)\s*(?:≈|≃|~=|=)\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)(\s*(?:\.{3}|…))?\s*$/
      .exec(line.trim());

  if (!match) return null;

  const expression = match[1].trim();

  if (
    !expression ||
    /^[+\-\d.\sEe]+$/.test(expression)
  ) {
    return null;
  }

  const value = Number(match[2]);

  const parts =
    /^([+-]?(?:\d+(?:\.\d*)?|\.\d+))(?:[eE]([+-]?\d+))?$/
      .exec(match[2]);

  if (!parts || !Number.isFinite(value)) return null;

  const decimals = (parts[1].split('.')[1] || '').length;

  const lastPlace =
    10 ** (Number(parts[2] || 0) - decimals);

  if (!Number.isFinite(lastPlace) || lastPlace <= 0) {
    return null;
  }

  // Account for the precision of WolframAlpha's decimal.
  // Ellipses may indicate truncation rather than rounding.
  const roundingBound =
    lastPlace * (match[3] ? 1 : 0.5);

  return { expression, value, roundingBound };
}

// Reject binary addition and subtraction in candidate expressions.
// Preserve unary signs and signs inside scientific notation.
function hasAdditiveOperation(expression) {
  const tokens = String(expression).match(
    /(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|[\p{L}_][\p{L}\p{N}_]*|[()+*/^,\[\]]|[+\-−–]/gu
  ) || [];

  let previous = null;

  for (const token of tokens) {
    if (['+', '-', '−', '–'].includes(token)) {
      const binary = previous !== null && (
        previous === ')' ||
        previous === ']' ||
        /^(?:\d|\.|[\p{L}_])/u.test(previous)
      );

      if (binary) return true;
    }

    previous = token;
  }

  return false;
}

function findCandidates(
  responses,
  constants,
  measurement,
  sigma,
  selected,
  additionalNumbers
) {
  const audit = {
    inspected: 0,
    oversized: 0,
    overComplexity: 0,
    noEvaluation: 0,
    outsideSigma: 0,
    passingOccurrences: 0,
    unique: 0,
    bins: Array(10).fill(0)
  };
  if (!measurement) return { matches: [], audit };

  const symbols = {
    pi: Math.PI,
    Pi: Math.PI,
    e: Math.E,
    E: Math.E,
    phi: (1 + Math.sqrt(5)) / 2
  };

  for (const constant of constants) {
    symbols[constant.token] = Number(constant.value);
  }

  const found = new Map();
  const limit = sigma * measurement.oneSigma;

  for (const result of responses) {
    for (const pod of result.pods || []) {

      // minput is WolframAlpha's input representation,
      // not necessarily a computed result.
      const output = String(
        pod.text || pod.moutput || ''
      );

      for (const line of output.split(/\n/)) {
        const approximate = wolframApproximation(line);

        const pieces = approximate
          ? [approximate]
          : line
              .split(/\s*(?:≈|≃|=)\s*/)
              .map(expression => ({
                expression: expression.trim()
              }));

        for (const piece of pieces) {
          const expression = piece.expression;
          if (!expression) continue;
          audit.inspected++;
          if (hasAdditiveOperation(expression)) {
            continue;
          }
          if (hasOversizedNumericComponent(expression)) {
            audit.oversized++;
            continue;
          }

          // Apply the complexity filter first.
          const complexity =
            wolframComponents(expression);

          if (
            !complexity ||
            complexity > MAX_CANDIDATE_COMPONENTS
          ) {
            audit.overComplexity++;
            continue;
          }

          let value;
          let bound = 0;
          let precisionSource = 'local';

          if (approximate) {
            // WolframAlpha has already evaluated this
            // expression, including its named constants.
            value = approximate.value;
            bound = approximate.roundingBound;
            precisionSource = 'WolframAlpha';
          } else {
            // Preserve the existing evaluator as a fallback
            // when no approximation accompanies the expression.
            const evaluated = evaluateCandidate(
              expression,
              symbols,
              additionalNumbers
            );

            if (!evaluated) {
              audit.noEvaluation++;
              continue;
            }

            value = evaluated.value;
          }

          if (!Number.isFinite(value)) {
            audit.noEvaluation++;
            continue;
          }

          const difference =
            Math.abs(value - measurement.center);

          // Include the precision uncertainty of the
          // WolframAlpha decimal in the acceptance test.
          // Ambiguous boundary cases are not certified.
          if (difference + bound > limit) {
            audit.outsideSigma++;
            continue;
          }

          const z =
            difference / measurement.oneSigma;
          audit.passingOccurrences++;

          const existing = found.get(expression);

          // Prefer a more precise representation if
          // WolframAlpha repeats the same expression.
          if (
            existing &&
            existing.precisionBound <= bound
          ) {
            continue;
          }

          found.set(expression, {
            expression,
            value,
            z,
            passes: true,
            complexity,
            score: complexity,
            precisionBound: bound,
            precisionSource,
            source: result.query,
            podTitle: pod.title || ''
          });
        }
      }
    }
  }

  const matches = [...found.values()];
  audit.unique = matches.length;

  for (const match of matches) {
    const signedSigma =
      (match.value - measurement.center) /
      measurement.oneSigma;

    const bin = Math.min(9, Math.max(0,
      Math.floor((signedSigma + sigma) * 10 / (2 * sigma))
    ));

    audit.bins[bin]++;
  }

  return { matches, audit };
}

// Display-only renderer for multiplicative closed forms.
// The root action is shown in the toolbar, not in each candidate.
const NEW_KNOT_VOLUME_PARTS = Object.freeze({
  V_7_2: ['7', '2'],
  V_8_1: ['8', '1'],
  V_9_2: ['9', '2'],
  V_10_1: ['10', '1'],
  V_11a247: ['11a', '247'],
  V_12a803: ['12a', '803'],
  V_13a3143: ['13a', '3143'],
});

function CompositeConstantSymbol({ token }) {
  const knot = NEW_KNOT_VOLUME_PARTS[token];

  if (knot) {
    return (
      <span style={{ fontStyle: 'italic' }}>
        V<sub>{knot[0]}<sub>{knot[1]}</sub></sub>
      </span>
    );
  }

  if (token === 'i') {
    return <span style={{ fontStyle: 'italic' }}>i</span>;
  }
  if (token === 'rho_prime') {
    return <span style={{ fontStyle: 'italic' }}>
      ρ<sub>p</sub>
    </span>;
  }
  if (token === 'V_5_2') {
    return <span style={{ fontStyle: 'italic' }}>
      V<sub>5₂</sub>
    </span>;
  }
  if (token === 'V_6_1') {
    return <span style={{ fontStyle: 'italic' }}>
      V<sub>6₁</sub>
    </span>;
  }
  if (token === 'e_pi') return <span>e<sup>π</sup></span>;
  if (token === 'e_gamma') return <span>e<sup>γ</sup></span>;
  if (token === 'zeta_2') return <span>ζ(2)</span>;
  if (token === 'zeta_3') return <span>ζ(3)</span>;
  return <span>{token}</span>;
}

function CandidateMath({ expression, hasRoot }) {
  let formula = String(expression).trim();

  // The local generator appends root actions as
  // (candidate)*(root label). Remove that display suffix
  // without changing the candidate or its numerical value.
  if (hasRoot && formula.startsWith('(')) {
    let depth = 0;
    let close = -1;

    for (let i = 0; i < formula.length; i++) {
      if (formula[i] === '(') depth++;
      if (formula[i] === ')') depth--;

      if (depth === 0) {
        close = i;
        break;
      }
    }

    if (
      close > 0 &&
      formula.slice(close + 1).startsWith('*(') &&
      formula.endsWith(')')
    ) {
      formula = formula.slice(1, close);
    }
  }

  const negative = formula.startsWith('-');
  const unsigned = negative ? formula.slice(1) : formula;

  // Generated candidates use numerator/(denominator).
  const slash = unsigned.indexOf('/(');

  let numerator = unsigned;
  let denominator = '';

  if (slash >= 0 && unsigned.endsWith(')')) {
    numerator = unsigned.slice(0, slash);
    denominator = unsigned.slice(slash + 2, -1);
  }

  const atomPattern =
    /^(?:[A-Za-z_][A-Za-z_0-9]*|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)(?:\^(?:[1-5]|0\.5|0\.3333333333333333))?$/;

  const top = numerator.split('*');
  const bottom = denominator ? denominator.split('*') : [];

  // The generator records the required imaginary unit
  // in the numerator for consistent search bookkeeping.
  // Display it to the RIGHT of the complete closed form.
  const imaginaryIndex = top.indexOf('i');
  const trailingImaginary = imaginaryIndex !== -1;

  if (trailingImaginary) {
    top.splice(imaginaryIndex, 1);
  }

  const valid = [...top, ...bottom].every(
    atom => atomPattern.test(atom)
  );

  if (!valid) {
    return (
      <span title={expression}>
        {formula}
      </span>
    );
  }

  function renderAtom(atom, key) {
    const match = /^(.+?)(?:\^([1-5]|0\.5|0\.3333333333333333))?$/.exec(atom);
    const token = match[1];
    const exponent = match[2];

    const svg = symbolSvgs[token];
    const width = Number(symbolFontWidths[token]);
    const radical = /^sqrt_([1-9][0-9]*)$/.exec(token);

    return (
      <span
        key={key}
        style={{
          display: 'inline-flex',
          alignItems: 'baseline',
          whiteSpace: 'nowrap'
        }}
      >
        {radical ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'baseline',
              fontFamily: 'serif',
              whiteSpace: 'nowrap'
            }}
          >
            <span style={{ fontSize: '1.15em' }}>√</span>
            <span style={{
              borderTop: '1.5px solid currentColor',
              padding: '0 1px',
              lineHeight: 1.05
            }}>
              {radical[1]}
            </span>
          </span>
        ) : svg ? (
          <img
            src={svg}
            alt={token}
            draggable={false}
            style={{
              width: `${Number.isFinite(width) && width > 0 ? width : 1}em`,
              height: 'auto',
              maxHeight: '1.2em',
              verticalAlign: 'middle',
              alignSelf: 'center'
            }}
          />
        ) : (
          <CompositeConstantSymbol token={token} />
        )}

        {exponent && (
          <sup style={{
            fontSize: '0.65em',
            lineHeight: 1,
            marginLeft: '1px'
          }}>
            {exponent === '0.5'
              ? '½'
              : exponent === '0.3333333333333333'
                ? '⅓'
                : exponent}
          </sup>
        )}
      </span>
    );
  }

  function renderProduct(atoms, prefix) {
    return atoms.map((atom, index) =>
      renderAtom(atom, `${prefix}-${index}`)
    );
  }

  return (
    <span
      title={expression}
      aria-label={formula}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.18em',
        fontSize: 20,
        fontWeight: 500,
        lineHeight: 1.25,
        verticalAlign: 'middle'
      }}
    >
      {negative && <span>−</span>}

      {bottom.length ? (
        <span style={{
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'center',
          verticalAlign: 'middle',
          maxWidth: '100%'
        }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.12em',
            padding: '0 0.28em 0.12em'
          }}>
            {renderProduct(top, 'top')}
          </span>

          <span style={{
            width: '100%',
            borderTop: '1.5px solid currentColor'
          }} />

          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.12em',
            padding: '0.12em 0.28em 0'
          }}>
            {renderProduct(bottom, 'bottom')}
          </span>
        </span>
      ) : (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.12em'
        }}>
          {renderProduct(top, 'top')}
        </span>
      )}

      {trailingImaginary && (
        <span
          aria-label="imaginary unit"
          style={{
            fontFamily: 'serif',
            fontStyle: 'italic',
            marginLeft: '0.06em',
            flex: '0 0 auto'
          }}
        >
          i
        </span>
      )}
    </span>
  );
}

function formatSearchDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return 'calculating';
  const seconds = Math.ceil(ms / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}m`;
  if (minutes) return `${minutes}m`;
  return `${seconds}s`;
}

// Group by the 15 significant digits displayed in the interface.
// This establishes numerical agreement, not symbolic identity.
function groupByDisplayedValue(candidates) {
  const groups = new Map();

  for (const candidate of candidates) {
    if (!Number.isFinite(candidate.value)) continue;

    // Different root transformations remain distinct.
    const key = `${candidate.rootActionId || 'single'}|` +
      candidate.value.toPrecision(15);

    let group = groups.get(key);
    if (!group) {
      group = new Map();
      groups.set(key, group);
    }

    // Include alternatives already found by the search engine.
    for (const expression of [
      candidate.expression,
      ...(candidate.equivalentExpressions || [])
    ]) {
      const alternative = {
        ...candidate,
        expression,
        preference: scoreCandidatePreference(
          expression, candidate.complexity
        )
      };

      const previous = group.get(expression);

      if (!previous ||
          compareCandidatePreference(alternative, previous) < 0) {
        group.set(expression, alternative);
      }
    }
  }

  return [...groups.values()].map(group => {
    const forms = [...group.values()].sort(
      compareCandidatePreference
    );

    const representative = forms[0];

    return {
      ...representative,
      equivalentExpressions: forms.slice(1).map(
        form => form.expression
      ),
      numericEquivalentCount: forms.length
    };
  });
}

function compareGroupedCandidates(a, b) {
  return compareCandidateGroupPreference(a, b);
}

export default function Explorer({ initialConstants = [] }) {
  const [numberText, setNumberText] = useState('');
  const [uncertaintyText, setUncertaintyText] = useState('');

  const uncertaintyRef = useRef(null);
  const numberRef = useRef(null);

  const exponentIndex = numberText.search(/[eE]/);
  const mantissaText = exponentIndex < 0
    ? numberText
    : numberText.slice(0, exponentIndex);
  const exponentText = exponentIndex < 0
    ? ''
    : numberText.slice(exponentIndex);

  const input =
    `${mantissaText}(${uncertaintyText})${exponentText}`;
  const [sigma, setSigma] = useState(5);
  const [complexity, setComplexity] = useState(3);
  const [rootAction, setRootAction] = useState('');
  const allRootsSelected = rootAction === 'ALL';
  // A canonical string encodes the chosen set, so saved-run
  // signatures distinguish different custom selections.
  const customRootsSelected = rootAction === 'CUSTOM' ||
    rootAction.startsWith('CUSTOM|');
  const customRootIds = customRootsSelected
    ? rootAction.split('|').slice(1) : [];
  const multiRootMode = allRootsSelected || customRootsSelected;
  const selectedRootIndices = rootActions.reduce((indices, action, index) => {
    if (allRootsSelected || customRootIds.includes(action.id)) {
      indices.push(index);
    }
    return indices;
  }, []);
  // Preserve old saved runs without mixing ranking versions.
  const checkpointStorageKey = customRootsSelected
    ? 'closed-form-custom-run-rank-v5'
    : allRootsSelected
      ? 'closed-form-all-run-rank-v5'
      : 'closed-form-full-run-rank-v5';
  const [rootMenuOpen, setRootMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef(null);
  const [headerSettingsHost, setHeaderSettingsHost] = useState(null);

  useEffect(() => {
    setHeaderSettingsHost(
      document.getElementById('closed-form-header-settings')
    );
  }, []);
  const rootChevronTuck = 14;
  // Preserve the chevrons' original position from the left edge.
  // Root navigation arrows: pixels from the left edge
  // of the Root action field.
  const rootArrowLeft = 124;
  const rootMenuRef = useRef(null);
  const [constants] = useState(() => {
    const additions = CLOSED_FORM_ADDITIONS.filter(
      added => !initialConstants.some(
        existing => existing.token === added.token
      )
    );
    return [...initialConstants, ...additions];
  });
  const [constantOrder, setConstantOrder] =
    useState(CONSTANT_DISPLAY_ORDER);
  const [draftConstantOrder, setDraftConstantOrder] =
    useState(CONSTANT_DISPLAY_ORDER);
  const [reorderingConstants, setReorderingConstants] =
    useState(false);
  const [draggedConstant, setDraggedConstant] = useState(null);
  const [overConstant, setOverConstant] = useState(null);
  const [constantOrderMessage, setConstantOrderMessage] =
    useState('');
  const [chosen, setChosen] = useState([]);
  const [checkedNumbers, setCheckedNumbers] = useState([]);
  const [additionalNumbers, setAdditionalNumbers] = useState([]);
  const [numberDraft, setNumberDraft] = useState('');
  const [numberError, setNumberError] = useState('');
  const [responses, setResponses] = useState([]);
  const [progress, setProgress] = useState(0);
  const [usage, setUsage] = useState(null);
  const [running, setRunning] = useState(false);
  const [fullRunning, setFullRunning] = useState(false);
  const [fullSelectionMode, setFullSelectionMode] = useState(false);
  const [fullSearchDepth, setFullSearchDepth] = useState(5);
  const [fullSaved, setFullSaved] = useState(null);
  const fullStop = useRef(false);
  const fullAbort = useRef(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(checkpointStorageKey);
      setFullSaved(saved ? JSON.parse(saved) : null);
    } catch {
      // Invalid saved checkpoint cannot be resumed.
    }
  }, [rootAction]);
  const [message, setMessage] = useState('');
  const [showCount, setShowCount] = useState(200);

  const cancel = useRef(false);
  const abort = useRef(null);

  useEffect(() => {
    if (!settingsOpen) return;

    const onPointerDown = event => {
      if (!settingsRef.current?.contains(event.target)) {
        setSettingsOpen(false);
      }
    };

    const onKeyDown = event => {
      if (event.key === 'Escape') {
        setSettingsOpen(false);
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [settingsOpen]);

  useEffect(() => {
    if (!rootMenuOpen) return;

    const onPointerDown = event => {
      if (!rootMenuRef.current?.contains(event.target)) {
        setRootMenuOpen(false);
      }
    };

    const onKeyDown = event => {
      if (event.key === 'Escape') {
        setRootMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [rootMenuOpen]);



  useEffect(() => {
    try {
      const stored = JSON.parse(
        localStorage.getItem(CONSTANT_ORDER_STORAGE_KEY)
      );

      if (
        Array.isArray(stored) &&
        stored.every(token => typeof token === 'string') &&
        new Set(stored).size === stored.length
      ) {
        const saved = [
          ...stored,
          ...CONSTANT_DISPLAY_ORDER.filter(
            token => !stored.includes(token)
          )
        ];
        setConstantOrder(saved);
        setDraftConstantOrder(saved);
      }
    } catch {
      // No saved ordering: use the source default.
    }
  }, []);

  const visibleConstants = useMemo(() => {
    const order = reorderingConstants
      ? draftConstantOrder : constantOrder;
    const positions = new Map(
      order.map((token, index) => [token, index])
    );

    return constants
      .filter(c => !EXCLUDED_CONSTANTS.has(c.token))
      .map((constant, index) => ({ constant, index }))
      .sort((a, b) => {
        const aPosition = positions.get(a.constant.token);
        const bPosition = positions.get(b.constant.token);

        if (aPosition !== undefined && bPosition !== undefined) {
          return aPosition - bPosition;
        }
        if (aPosition !== undefined) return -1;
        if (bPosition !== undefined) return 1;

        return a.index - b.index;
      })
      .map(item => item.constant);
  }, [
    constants, constantOrder,
    draftConstantOrder, reorderingConstants
  ]);

  function startConstantReorder() {
    setDraftConstantOrder(
      visibleConstants.map(c => c.token)
    );
    setConstantOrderMessage('');
    setReorderingConstants(true);
  }

  function moveDraftConstant(fromToken, toToken) {
    if (!fromToken || !toToken ||
        fromToken === toToken) return;

    setDraftConstantOrder(previous => {
      const next = [...previous];
      const from = next.indexOf(fromToken);
      const to = next.indexOf(toToken);

      if (from < 0 || to < 0) return previous;

      next.splice(from, 1);
      next.splice(to, 0, fromToken);
      return next;
    });
  }

  function setConstantDisplayOrder() {
    const next = visibleConstants.map(c => c.token);

    try {
      localStorage.setItem(
        CONSTANT_ORDER_STORAGE_KEY,
        JSON.stringify(next)
      );
    } catch {
      setConstantOrderMessage(
        'Browser storage unavailable. Use Copy order.'
      );
      return;
    }

    setConstantOrder(next);
    setDraftConstantOrder(next);
    setReorderingConstants(false);
    setDraggedConstant(null);
    setOverConstant(null);
    setConstantOrderMessage(
      'Order saved in this browser. Copy order to share it.'
    );
  }

  async function copyConstantDisplayOrder() {
    const tokens = visibleConstants.map(c => c.token);

    const code = 'const CONSTANT_DISPLAY_ORDER = [\\n' +
      tokens.map(token =>
        '  ' + JSON.stringify(token) + ','
      ).join('\\n') +
      '\\n];';

    try {
      await navigator.clipboard.writeText(code);
      setConstantOrderMessage(
        'Order copied. Paste it into our chat.'
      );
    } catch {
      window.prompt('Copy this constant order:', code);
    }
  }

  const parsed = useMemo(() => {
    if (
      !mantissaText ||
      ![2, 3].includes(uncertaintyText.length) ||
      /[eE][+-]?$/.test(numberText)
    ) {
      return { value: null, error: null };
    }

    try {
      return {
        value: parseMeasurement(input)
      };
    } catch (error) {
      return {
        error: error.message
      };
    }
  }, [input]);

  const activeRoot =
    rootActions.find(option => option.id === rootAction) || null;

  const imaginaryRoot =
    activeRoot?.kind === 'imaginary' &&
    Number.isFinite(Number(activeRoot.imagValue)) &&
    Number(activeRoot.imagValue) !== 0;

  const rootFactor = activeRoot
    ? Number(
        imaginaryRoot
          ? -Number(activeRoot.imagValue)
          : activeRoot.value
      )
    : 1;
  const validRoot = customRootsSelected
    ? customRootIds.length > 0
    : Number.isFinite(rootFactor) && rootFactor !== 0;

  const searchMeasurement = useMemo(() => {
    if (!parsed.value || !validRoot) return null;

    const original = parsed.value;

    const center = original.center / rootFactor;
    const oneSigma =
      original.oneSigma / Math.abs(rootFactor);

    if (
      !Number.isFinite(center) ||
      !Number.isFinite(oneSigma) ||
      oneSigma <= 0
    ) {
      return null;
    }

    // Preserve exactly five 444-seeded precision queries.
    const seeded = original.seed * 10 ** original.exponent / rootFactor;
    if (!Number.isFinite(seeded)) return null;

    const values = original.digits.map(digits =>
      seeded.toPrecision(digits)
    );

    return {
      ...original,
      center,
      oneSigma,
      values
    };
  }, [parsed, rootFactor, validRoot]);

  const count = searchMeasurement
    ? searchMeasurement.values.length *
      (1 + 2 * (chosen.length + checkedNumbers.length))
    : 0;

  const minimumQuickDepth = Math.max(4, complexity);

  const quickLimit = useMemo(
    () => maxQuickFactors(minimumQuickDepth),
    [minimumQuickDepth]
  );

  const selectedFactorCount =
    chosen.length + checkedNumbers.length;

  const monomialsPerRoot = useMemo(
    () => countSearchMonomials(
      selectedFactorCount, fullSearchDepth
    ),
    [selectedFactorCount, fullSearchDepth]
  );

  const proposedFullPositions = multiRootMode
    ? monomialsPerRoot * selectedRootIndices.length
    : monomialsPerRoot;

  // Use observed processing speed when available.
  // Otherwise use a clearly identified reference rate.
  const measuredFullRate =
    fullSaved?.activeMs > 0 && fullSaved?.cursor > 0
      ? 1000 * fullSaved.cursor / fullSaved.activeMs
      : null;

  const estimateRate = measuredFullRate || 500000;
  const proposedFullDuration =
    1000 * proposedFullPositions / estimateRate;

  const quickSearchDepth = Math.max(4, complexity);

  const quickMonomialCount = quickSearchDepth
    ? countSearchMonomials(
        selectedFactorCount, quickSearchDepth
      )
    : Infinity;

  const quickAllowed =
    selectedFactorCount <= quickLimit &&
    quickMonomialCount <= QUICK_MONOMIAL_LIMIT;

  const selected = useMemo(
    () => new Set(chosen),
    [chosen]
  );

  const candidateAnalysis = useMemo(() => {
    const result = responses[0];

    const matches = (result?.candidates || [])
      .map(candidate => ({
        ...candidate,
        preference: scoreCandidatePreference(
          candidate.expression,
          candidate.complexity
        )
      }))
      .filter(candidate =>
        candidate.passes &&
        hasNamedGeometricConstant(candidate.expression) &&
        candidate.z <= sigma
      );

    const bins = Array(10).fill(0);

    if (parsed.value) {
      for (const match of matches) {
        const signed =
          (match.value - parsed.value.center) /
          parsed.value.oneSigma;

        const index = Math.min(9, Math.max(0,
          Math.floor(
            (signed + sigma) * 10 / (2 * sigma)
          )
        ));

        bins[index]++;
      }
    }

    return {
      matches,
      audit: {
        inspected: result?.inspected || 0,
        unique: matches.length,
        bins
      }
    };
  }, [responses, sigma, complexity, parsed.value]);

  const matches = candidateAnalysis.matches;
  const audit = candidateAnalysis.audit;

  const ranked = useMemo(
    () => groupByDisplayedValue(
      matches.filter(m => m.passes)
    ).sort(compareGroupedCandidates),
    [matches]
  );

  function addCustomNumber() {
    if (!fullSelectionMode && selectedFactorCount >= quickLimit) {
      setNumberError(`Quick selection limit: ${quickLimit}. Open Full Run to lift it.`);
      return;
    }
    const value = numberDraft.trim();

    const valid =
      value.length <= 45 &&
      /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d{1,3})?$/i.test(value) &&
      Number.isFinite(Number(value)) &&
      Number(value) !== 0;

    if (!valid) {
      setNumberError(
        'Enter a nonzero number, optionally in scientific notation.'
      );
      return;
    }

    const existing = additionalNumbers.find(
      number => Number(number) === Number(value)
    );

    const stored = existing || value;

    setAdditionalNumbers(previous =>
      existing ? previous : [...previous, value]
    );

    setCheckedNumbers(previous =>
      previous.includes(stored)
        ? previous
        : [...previous, stored]
    );

    setNumberDraft('');
    setNumberError('');
  }

  // Invalidate results and status when search inputs change.
  useEffect(() => {
    setResponses([]);
    setProgress(0);
    setMessage('');
  }, [
    chosen,
    checkedNumbers,
    complexity,
    numberText,
    uncertaintyText,
    rootAction,
    sigma
  ]);

  async function runSelectedQuick() {
    if (!parsed.value || !validRoot || !quickAllowed ||
        running || fullRunning) return;

    cancel.current = false;
    setRunning(true);
    setResponses([]);
    setProgress(0);
    setMessage('');
    abort.current = new AbortController();
    const results = [];

    try {
      for (const id of customRootIds) {
        if (cancel.current) return;

        const response = await fetch('/api/closed-form', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            center: parsed.value.center,
            oneSigma: parsed.value.oneSigma,
            sigma,
            complexity,
            tokens: chosen,
            numbers: checkedNumbers,
            rootAction: id
          }),
          signal: abort.current.signal
        });

        const data = await response.json();
        if (!response.ok) {
          throw Error(data.error || `HTTP ${response.status}`);
        }
        if (cancel.current) return;

        results.push(data);
        setProgress(results.length / customRootIds.length);
      }

      const data = {
        ...results[0],
        // Match All-mode policy: keep the best verified
        // candidate from each selected root action.
        candidates: results.flatMap((r, i) =>
          r.candidates.length ? [{
            ...r.candidates[0],
            rootActionId: customRootIds[i]
          }] : []
        ),
        totalMatches: results.reduce(
          (n, r) => n + r.totalMatches, 0
        ),
        inspected: results.reduce(
          (n, r) => n + r.inspected, 0
        ),
        monomials: results.reduce(
          (n, r) => n + r.monomials, 0
        ),
        incomplete: results.some(r => r.incomplete),
        coverage:
          `${results[0].coverage}; ${customRootIds.length} selected roots`
      };

      setResponses([{
        ...data,
        query: 'Selected root actions'
      }]);
      setMessage(
        `Search complete: ${data.totalMatches} matches; ` +
        `${data.candidates.length} roots with candidates.`
      );
      setProgress(1);
    } catch (error) {
      if (!cancel.current) {
        setMessage(`Search failed: ${error.message}`);
      }
    } finally {
      setRunning(false);
      abort.current = null;
    }
  }

  async function run() {
    if (customRootsSelected) return runSelectedQuick();
    if (
      !parsed.value ||
      !validRoot ||
      !quickAllowed ||
      running || fullRunning
    ) return;

    cancel.current = false;
    setRunning(true);
    setResponses([]);
    setProgress(0);
    setMessage('');

    abort.current = new AbortController();

    try {
      const request = await fetch('/api/closed-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          center: parsed.value.center,
          oneSigma: parsed.value.oneSigma,
          sigma,
          complexity,
          tokens: chosen,
          numbers: checkedNumbers,
          rootAction
        }),
        signal: abort.current.signal
      });

      const data = await request.json();

      if (!request.ok) {
        throw Error(data.error || `HTTP ${request.status}`);
      }

      if (!cancel.current) {
        setResponses([{
          ...data,
          query: 'Local multiplicative search',
          pods: [{
            title: 'Search coverage',
            text: data.coverage + '\n' +
              `Search depth: ${data.searchDepth}\n` +
              `Max reported adjusted complexity: ${data.reportComplexity}\n` +
              `Monomials checked: ${data.monomials}\n` +
              `Candidate matches: ${data.totalMatches}\n` +
              `Search complete: ${!data.incomplete}\n` +
              `Completed monomial complexity: ${data.highestCompletedMonomialComplexity}`
          }]
        }]);

        setProgress(1);

        setMessage(data.incomplete
          ? `Partial search: work limit reached. ${data.candidates.length} best candidates returned.`
          : `Search complete: ${data.totalMatches} matches; ${data.candidates.length} best candidates returned.`
        );
      }
    } catch (error) {
      if (!cancel.current) {
        setMessage(`Search failed: ${error.message}`);
      }
    } finally {
      setRunning(false);
      abort.current = null;
    }
  }


  async function runFull(resume = false) {
    if (
      running ||
      fullRunning ||
      !parsed.value ||
      !validRoot
    ) return;

    const signature = JSON.stringify({
      center: parsed.value.center,
      oneSigma: parsed.value.oneSigma,
      sigma,
      complexity,
      chosen,
      checkedNumbers,
      rootAction
    });

    let checkpoint =
      resume &&
      fullSaved?.signature === signature &&
      (fullSaved?.searchDepth ?? 8) === fullSearchDepth &&
      fullSaved?.total === proposedFullPositions &&
      (!multiRootMode || (
        Array.isArray(fullSaved.rootCursors) &&
        fullSaved.rootCursors.length === rootActions.length
      ))
        ? fullSaved
        : {
            signature,
            cursor: 0,
            total: 0,
            matches: 0,
            discardedPotentialFloor: null,
            rootCursors: multiRootMode
              ? Array(rootActions.length).fill(0)
              : null,
            nextRootIndex: multiRootMode ? selectedRootIndices[0] : 0,
            candidates: []
          };

    if (!resume) {
      setResponses([]);
      setProgress(0);
      setFullSaved(null);
    }

    fullStop.current = false;
    setFullRunning(true);
    setMessage('Full search started.');

    try {
      while (!fullStop.current) {
        if (
          checkpoint.total > 0 &&
          checkpoint.cursor >= checkpoint.total
        ) break;

        const controller = new AbortController();
        fullAbort.current = controller;
        const batchStartedAt = Date.now();

        const batchRootIndex = multiRootMode
          ? checkpoint.nextRootIndex ?? selectedRootIndices[0]
          : null;

        const batchStart = multiRootMode
          ? checkpoint.rootCursors[batchRootIndex]
          : checkpoint.cursor;

        const request = await fetch('/api/closed-form', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            center: parsed.value.center,
            oneSigma: parsed.value.oneSigma,
            sigma,
            complexity,
            tokens: chosen,
            numbers: checkedNumbers,
            rootAction: multiRootMode ? 'ALL' : rootAction,
            mode: 'full-batch',
            fullSearchDepth,
            startMonomial: batchStart,
            rootIndex: batchRootIndex,
            batchSize: multiRootMode
              ? (
                  checkpoint.activeMs > 0 &&
                  checkpoint.cursor > 0
                    ? Math.max(1000, Math.min(
                        25000,
                        Math.floor(
                          2500 * checkpoint.cursor /
                          checkpoint.activeMs
                        )
                      ))
                    : 1000
                )
              : 25000
          }),
          signal: controller.signal
        });

        const data = await request.json();

        if (!request.ok) {
          throw Error(data.error || `HTTP ${request.status}`);
        }

        if (
          data.batchStartCursor !== batchStart ||
          !Object.prototype.hasOwnProperty.call(
            data, 'discardedPotentialFloor'
          ) ||
          !(
            data.discardedPotentialFloor === null ||
            Number.isFinite(data.discardedPotentialFloor)
          ) ||
          !Number.isSafeInteger(data.nextCursor) ||
          data.nextCursor <= batchStart ||
          !Number.isSafeInteger(data.totalMonomialPositions) ||
          (multiRootMode && (
            data.rootIndex !== batchRootIndex ||
            data.totalMonomialPositions !== monomialsPerRoot
          ))
        ) {
          throw Error('Invalid Full Run checkpoint response');
        }

        const nextRootCursors = multiRootMode
          ? [...checkpoint.rootCursors]
          : null;

        if (multiRootMode) {
          nextRootCursors[batchRootIndex] = data.nextCursor;
        }

        const completedPositions = multiRootMode
          ? selectedRootIndices.reduce(
              (sum, index) => sum + nextRootCursors[index], 0
            )
          : data.nextCursor;

        // Round-robin: the next unfinished root is selected.
        const nextRootIndex = multiRootMode
          ? (
              Array.from(
                { length: selectedRootIndices.length },
                (_, offset) => selectedRootIndices[
                  (selectedRootIndices.indexOf(batchRootIndex) + 1 + offset) %
                  selectedRootIndices.length
                ]
              ).find(index =>
                nextRootCursors[index] < monomialsPerRoot
              ) ?? selectedRootIndices[0]
            )
          : 0;

        // A Top 1000 from each batch is sufficient to
        // reconstruct the global Top 1000 exactly.
        const byValue = new Map();

        for (const incoming of [
          ...checkpoint.candidates,
          ...data.candidates
        ]) {
          if (!hasNamedGeometricConstant(
            incoming.expression
          )) continue;

          // Never trust a preference stored by an older scorer.
          const candidate = {
            ...incoming,
            preference: scoreCandidatePreference(
              incoming.expression,
              incoming.complexity
            )
          };

          const identity =
            `${candidate.rootActionId || 'none'}:` +
            candidate.value.toPrecision(15);

          const previous = byValue.get(identity);

          if (!previous) {
            byValue.set(identity, candidate);
          } else {
            const alternatives = [...new Set([
              previous.expression,
              ...(previous.equivalentExpressions || []),
              candidate.expression,
              ...(candidate.equivalentExpressions || [])
            ])];

            const preferred =
              compareCandidatePreference(
                candidate, previous
              ) < 0
                ? candidate
                : previous;

            byValue.set(identity, {
              ...preferred,
              equivalentExpressions: alternatives.filter(
                expression => expression !== preferred.expression
              )
            });
          }
        }

        const ranked = [...byValue.values()]
          .sort(compareCandidateGroupPreference);

        const best = ranked.slice(0, 1000);

        // Include groups discarded while merging batches.
        const omittedGlobalFloor = ranked.slice(1000).reduce(
          (minimum, candidate) => Math.min(
            minimum,
            fractionalGroupRank(candidate, true)
          ),
          Infinity
        );

        const discardedPotentialFloor = Math.min(
          checkpoint.discardedPotentialFloor ?? Infinity,
          data.discardedPotentialFloor ?? Infinity,
          omittedGlobalFloor
        );

        // Compare this batch's Top 1000 with the preceding one.
        const previousBest = checkpoint.candidates;
        const previousExpressions = new Set(
          previousBest.map(c => c.expression)
        );

        const newTopEntries = best.filter(
          c => !previousExpressions.has(c.expression)
        ).length;

        const changedPositions = best.reduce(
          (count, candidate, index) =>
            count + Number(
              previousBest[index]?.expression !==
              candidate.expression
            ),
          0
        );

        // Verify the retained list is correctly ranked.
        if (
          best.length > 1000 ||
          best.some((candidate, i) =>
            (i > 0 &&
              compareCandidateGroupPreference(best[i - 1], candidate) > 0)
          )
        ) {
          throw Error('Top 1000 ranking invariant failed');
        }

        checkpoint = {
          signature,
          inputs: {
            numberText,
            uncertaintyText,
            complexity,
            fullSearchDepth,
            sigma,
            chosen,
            checkedNumbers,
            rootAction
          },
          searchDepth: fullSearchDepth,
          cursor: completedPositions,
          total: proposedFullPositions,
          rootCursors: nextRootCursors,
          nextRootIndex,
          lastRootIndex: batchRootIndex,
          activeMs: (checkpoint.activeMs || 0) +
            Math.max(1, Date.now() - batchStartedAt),
          matches:
            checkpoint.matches + data.totalMatches,
          discardedPotentialFloor:
            Number.isFinite(discardedPotentialFloor)
              ? discardedPotentialFloor : null,
          candidates: best,
          lastBatchMatches: data.totalMatches,
          lastBatchNewTop: newTopEntries,
          lastBatchChangedPositions: changedPositions,
          cumulativeTopEntries:
            (checkpoint.cumulativeTopEntries || 0) +
            newTopEntries,
          worstAdjustedComplexity: best.length
            ? best[best.length - 1].preference.adjustedComplexity
            : null
        };

        // Certify only when all remaining constructions and
        // omitted groups are unable to enter the Top 1000.
        const certificate = certifyFractionalTop1000({
          candidates: checkpoint.candidates,
          matches: checkpoint.matches,
          factorCount: chosen.length,
          hasCustomNumbers: checkedNumbers.length > 0,
          searchDepth: fullSearchDepth,
          cursors: multiRootMode
            ? selectedRootIndices.map(
                index => nextRootCursors[index]
              )
            : [data.nextCursor],
          discardedPotentialFloor:
            checkpoint.discardedPotentialFloor
        });

        if (certificate) {
          checkpoint = {
            ...checkpoint,
            earlyStopped: true,
            rankingCertificate: certificate
          };
        }

        // Save the completed batch before proceeding.
        localStorage.setItem(
          checkpointStorageKey,
          JSON.stringify(checkpoint)
        );

        setFullSaved(checkpoint);

        setResponses([{
          ...data,
          candidates: best,
          totalMatches: checkpoint.matches,
          monomials: checkpoint.cursor,
          query: 'Full search',
          incomplete:
            !checkpoint.earlyStopped &&
            checkpoint.cursor < checkpoint.total
        }]);

        const percent =
          100 * checkpoint.cursor / checkpoint.total;

        setMessage('');

        if (checkpoint.earlyStopped) {
          setMessage(
            `Full search certified Top 1000 group membership. ` +
            `Remaining score bound: ` +
            `${checkpoint.rankingCertificate.remainingMinimum.toFixed(3)}; ` +
            `1000th score: ` +
            `${checkpoint.rankingCertificate.cutoff.toFixed(3)}. ` +
            `${checkpoint.cursor.toLocaleString()} of ` +
            `${checkpoint.total.toLocaleString()} positions examined. ` +
            `Equivalent-form lists may be incomplete.`
          );
          break;
        }

        if (checkpoint.cursor >= checkpoint.total) {
          setMessage(
            `Full search complete. ` +
            `${checkpoint.matches.toLocaleString()} ` +
            `qualifying matches; ${best.length} best retained.`
          );
          break;
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        setMessage('Full search paused. Progress saved.');
      } else {
        setMessage(
          `Full search stopped: ${error.message}. ` +
          `Last completed batch remains saved.`
        );
      }
    } finally {
      fullAbort.current = null;
      setFullRunning(false);
    }
  }

  const currentFullSignature = parsed.value
    ? JSON.stringify({
        center: parsed.value.center,
        oneSigma: parsed.value.oneSigma,
        sigma,
        complexity,
        chosen,
        checkedNumbers,
        rootAction
      })
    : null;

  const fullCanResume =
    fullSaved?.signature === currentFullSignature &&
    (fullSaved?.searchDepth ?? 8) === fullSearchDepth &&
    fullSaved?.total === proposedFullPositions &&
    fullSaved?.cursor < fullSaved?.total &&
    !fullSaved?.earlyStopped;

  // A completed Full Run retains its candidates in the
  // checkpoint. Restore those candidates to the results panel
  // after a reload or after restoring saved search settings.
  //
  // Partial checkpoints retain their existing Resume behavior.
  useEffect(() => {
    if (
      running ||
      fullRunning ||
      !fullSaved ||
      !Array.isArray(fullSaved.candidates) ||
      fullSaved.signature !== currentFullSignature ||
      (fullSaved.searchDepth ?? 8) !== fullSearchDepth ||
      fullSaved.total !== proposedFullPositions ||
      !(fullSaved.total > 0) ||
      !(
        fullSaved.earlyStopped ||
        fullSaved.cursor >= fullSaved.total
      )
    ) return;

    setResponses([{
      candidates: fullSaved.candidates,
      totalMatches: fullSaved.matches,
      monomials: fullSaved.cursor,
      query: 'Restored Full Run',
      incomplete: false,
      coverage: fullSaved.earlyStopped
        ? 'Fractional ranking cutoff (equivalents not exhaustive)'
        : 'Completed Full Run',
      highestCompletedMonomialComplexity: fullSearchDepth
    }]);

    setProgress(1);
  }, [
    fullSaved,
    currentFullSignature,
    fullSearchDepth,
    proposedFullPositions,
    running,
    fullRunning
  ]);

  // Four buttons appear together when Restore and Return are available.
  const fourFullRunButtons =
    Boolean(fullSaved?.inputs) &&
    fullSaved.signature !== currentFullSignature &&
    fullSelectionMode &&
    !running &&
    !fullRunning &&
    !fullCanResume;

  const fullCurrentLayer =
    fullSaved?.total > 0 &&
    fullSaved.signature === currentFullSignature
      ? (
          Array.from(
            { length: fullSearchDepth }, (_, i) => i + 1
          )
            .find(depth =>
              (multiRootMode
                ? (fullSaved.rootCursors?.[
                    fullSaved.nextRootIndex ?? 0
                  ] || 0)
                : fullSaved.cursor) <
              countSearchMonomials(selectedFactorCount, depth)
            ) || fullSearchDepth
        )
      : null;

  const polarRootActions = rootActions.filter(option =>
    /zhe_(r|theta)/.test(option.id)
  );

  const cartesianRootActions = rootActions.filter(option =>
    !/zhe_(r|theta)/.test(option.id)
  );

  function rootPartCount(option) {
    const names = option.id.match(/zhe_[1-4]/g) || [];
    return names.length;
  }

  function rootKind(option) {
    const expression = option.id
      .replace('i*(', '')
      .replace('-i*(', '')
      .replace(')', '');

    if (
      expression.includes('^2') &&
      !expression.includes('*')
    ) {
      return 'Quadrance';
    }

    if (expression.includes('*')) {
      return 'Product';
    }

    return 'Sum';
  }

  // Match the actual dropdown order: Polar first, then
  // Cartesian grouped by part count and structure.
  const orderedRootActions = [
    ...['zhe_theta', 'zhe_r'].flatMap(token =>
      polarRootActions.filter(option =>
        option.id.includes(token)
      )
    ),
    // Traverse each Cartesian column from top to bottom:
    // all Products, then all Sums, then all Quadrances.
    // Within each column, visit 2-part before 3-part.
    ...['Product', 'Sum', 'Quadrance'].flatMap(kind =>
      [2, 3].flatMap(parts =>
        cartesianRootActions.filter(option =>
          rootPartCount(option) === parts &&
          rootKind(option) === kind
        )
      )
    ),
    ...cartesianRootActions.filter(option =>
      ![2, 3].includes(rootPartCount(option))
    )
  ];

  function cycleRoot(direction) {
    if (!rootAction || running || fullRunning) return;

    const current = orderedRootActions.findIndex(
      option => option.id === rootAction
    );

    if (current < 0 || orderedRootActions.length === 0) {
      return;
    }

    const next = (
      current + direction + orderedRootActions.length
    ) % orderedRootActions.length;

    setRootAction(orderedRootActions[next].id);
    setRootMenuOpen(false);
    setResponses([]);
    setProgress(0);
  }

  function renderRootLabel(option) {
    const label = option.label;

    const subDigits = '₀₁₂₃₄₅₆₇₈₉';
    const supDigits = '⁰¹²³⁴⁵⁶⁷⁸⁹';

    const tokens = label.split(
      /(θ|ᵣ|[₀₁₂₃₄₅₆₇₈₉]+|[⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g
    );

    const convertDigits = (text, alphabet) =>
      [...text].map(character =>
        String(alphabet.indexOf(character))
      ).join('');

    return (
      <span className={styles.rootMathLabel}>
        {tokens.map((token, index) => {
          if (!token) return null;

          if (
            token === 'θ' &&
            label.startsWith('жθ')
          ) {
            return <sub key={index}>θ</sub>;
          }

          if (token === 'ᵣ') {
            return <sub key={index}>r</sub>;
          }

          if ([...token].every(character =>
            subDigits.includes(character)
          )) {
            return (
              <sub key={index}>
                {convertDigits(token, subDigits)}
              </sub>
            );
          }

          if ([...token].every(character =>
            supDigits.includes(character)
          )) {
            return (
              <sup key={index}>
                {convertDigits(token, supDigits)}
              </sup>
            );
          }

          return <span key={index}>{token}</span>;
        })}
      </span>
    );
  }

  function chooseRootOption(option, event) {
    if (running || fullRunning) return;

    if (customRootsSelected || event.metaKey ||
        event.shiftKey || event.ctrlKey) {
      const existing = customRootsSelected
        ? customRootIds
        : rootActions.some(root => root.id === rootAction)
          ? [rootAction] : [];

      const next = existing.includes(option.id)
        ? existing.filter(id => id !== option.id)
        : [...existing, option.id];

      const canonical = rootActions
        .filter(root => next.includes(root.id))
        .map(root => root.id);

      setRootAction(['CUSTOM', ...canonical].join('|'));
    } else {
      setRootAction(option.id);
      setRootMenuOpen(false);
    }

    setResponses([]);
    setProgress(0);
  }

  function renderRootOption(option) {
    const value = Number(option.value);
    const usable = option.kind === 'imaginary'
      ? Number.isFinite(Number(option.imagValue)) &&
        Number(option.imagValue) !== 0
      : Number.isFinite(value) && value !== 0;

    return (
      <button
        type="button"
        key={option.id}
        className={styles.rootPickerChoice}
        disabled={!usable || running || fullRunning}
        aria-pressed={
          rootAction === option.id || customRootIds.includes(option.id)
        }
        title={usable
          ? 'Click: single root. Shift/Command-click: edit a set.'
          : 'Complex-valued root action'}
        onClick={event => chooseRootOption(option, event)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 5,
          alignItems: 'center',
          background: customRootIds.includes(option.id)
            ? '#304f73' : undefined
        }}
      >
        {renderRootLabel(option)}
        {customRootIds.includes(option.id) && (
          <span aria-hidden="true">✓</span>
        )}
      </button>
    );
  }

  return (
    <div className={styles.workspace}>

      <section
        className={`${styles.inputPanel} ${styles.matchedInputPanel}`}
        style={panel}
      >
        <div className={styles.matchedInputRow} style={{
          display: 'grid',
          gridTemplateColumns:
            'minmax(0, 1fr) minmax(0, 1fr)',
          gap: 20,
          alignItems: 'start',
          width: '100%'
        }}>
          <div style={{ gridColumn: '1', gridRow: '1', minWidth: 0 }}>
            <label htmlFor="measured">
              Number with uncertainty
            </label>

            <div
              style={{
                ...field,
                marginTop: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                minHeight: 43,
                boxSizing: 'border-box',
                cursor: 'text'
              }}
              onClick={event => {
                if (running) return;

                // Preserve direct editing of the uncertainty field.
                if (
                  event.target === uncertaintyRef.current ||
                  event.target === numberRef.current
                ) return;

                const input = numberRef.current;
                if (!input) return;

                input.focus();
                const end = input.value.length;
                input.setSelectionRange(end, end);
              }}
            >
              <input
                ref={numberRef}
                aria-label="Number, up to 20 digits"
                inputMode="decimal"
                autoComplete="off"
                value={numberText.replace(/^-/, '−')}
                disabled={running}
                placeholder=" "
                onChange={event => {
                  const next = event.target.value.replace(/−/g, '-');
                  if (
                    !/^[+-]?(?:\d*\.?\d*)(?:[eE][+-]?\d*)?$/.test(next)
                  ) return;

                  const main = next.split(/[eE]/)[0];
                  const digits = (main.match(/\d/g) || []).length;

                  if (digits > 20) return;

                  setNumberText(next);
                  setResponses([]);
                  setProgress(0);
                }}
                onKeyDown={event => {
                  if (
                    event.key === 'ArrowRight' &&
                    event.currentTarget.selectionStart ===
                      event.currentTarget.value.length
                  ) {
                    event.preventDefault();
                    uncertaintyRef.current?.focus();
                    uncertaintyRef.current?.setSelectionRange(
                      0, 0
                    );
                  }
                }}
                style={{
                  background: 'transparent',
                  border: 0,
                  outline: 'none',
                  color: 'inherit',
                  padding: 0,
                  margin: 0,
                  font: 'inherit',
                  flex: '0 1 auto',
                  width: `${Math.max(1, numberText.length)}ch`,
                  minWidth: '2ch',
                  maxWidth: 'calc(100% - 65px)',
                  boxSizing: 'content-box'
                }}
              />

              <span
                aria-hidden="true"
                style={{
                  marginLeft: '-3px',
                  flexShrink: 0
                }}
              >(</span>

              <input
                ref={uncertaintyRef}
                aria-label="Two- or three-digit uncertainty"
                inputMode="numeric"
                autoComplete="off"
                value={uncertaintyText}
                disabled={running}
                placeholder="  "
                maxLength={3}
                onChange={event => {
                  const next = event.target.value;
                  if (!/^\d{0,3}$/.test(next)) return;

                  setUncertaintyText(next);
                  setResponses([]);
                  setProgress(0);
                }}
                onKeyDown={event => {
                  if (
                    event.key === 'ArrowLeft' &&
                    event.currentTarget.selectionStart === 0
                  ) {
                    event.preventDefault();
                    numberRef.current?.focus();

                    const input = numberRef.current;
                    input?.setSelectionRange(
                      input.value.length,
                      input.value.length
                    );
                  }
                }}
                style={{
                  background: 'transparent',
                  border: 0,
                  outline: 'none',
                  color: 'inherit',
                  padding: 0,
                  margin: 0,
                  font: 'inherit',
                  width: uncertaintyText.length === 3 ? '3.5ch' : '2.5ch',
                  minWidth: uncertaintyText.length === 3 ? '3.5ch' : '2.5ch',
                  textAlign: 'center',
                  boxSizing: 'content-box'
                }}
              />

              <span aria-hidden="true">)</span>
            </div>

          </div>

          <div ref={rootMenuRef} className={styles.rootPicker} style={{ gridColumn: '2', gridRow: '1', minWidth: 0 }}>
            <label htmlFor="root-action">
              Root action
            </label>

            <div style={{
              position: 'relative',
              width: '100%'
            }}>
              <button
                id="root-action"
                type="button"
                className={styles.rootPickerButton}
                disabled={running || fullRunning}
                aria-haspopup="true"
                aria-expanded={rootMenuOpen}
                onClick={() => setRootMenuOpen(open => !open)}
                style={{
                  width: '100%',
                  position: 'relative',
                  paddingRight: activeRoot ? 100 : undefined
                }}
              >
                <span>
                  {allRootsSelected
                    ? 'All root actions'
                    : customRootsSelected
                      ? `Selected root actions (${customRootIds.length})`
                    : activeRoot
                      ? renderRootLabel(activeRoot)
                      : 'No root action'}
                </span>
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    right: 14,
                    top: '50%',
                    display: 'inline-block',
                    lineHeight: 1,
                    transform: rootMenuOpen
                      ? 'translateY(-50%) rotate(180deg)'
                      : 'translateY(-50%)',
                    pointerEvents: 'none'
                  }}
                >
                  ▾
                </span>
              </button>

              {activeRoot && (
                <div
                  style={{
                    position: 'absolute',
                    left: rootArrowLeft,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    zIndex: 1
                  }}
                >
                  {[
                    ['❮', -1, 'Previous root action'],
                    ['❯', 1, 'Next root action']
                  ].map(([symbol, direction, label]) => (
                    <button
                      key={direction}
                      type="button"
                      disabled={running || fullRunning}
                      aria-label={label}
                      title={label}
                      onClick={() => cycleRoot(direction)}
                      style={{
                        border: 'none',
                        borderRadius: 0,
                        background: 'transparent',
                        color: '#eef5ff',
                        fontSize: 20,
                        lineHeight: 1,
                        width: 26,
                        height: 28,
                        padding: 0,
                        cursor: running
                          ? 'not-allowed' : 'pointer',
                        transform: direction === 1
                          ? `translateX(-${rootChevronTuck}px)`
                          : 'none',
                        opacity: running ? 0.4 : 1
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          display: 'inline-block',
                          fontSize: 16,
                          lineHeight: 1,
                          transform: direction === -1
                            ? 'rotate(90deg)'
                            : 'rotate(-90deg)'
                        }}
                      >
                        ▾
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {rootMenuOpen && (
              <div
                className={styles.rootPickerMenu}
                style={{
                  width: 'min(1120px, calc(100vw - 120px))',
                  maxWidth: 'calc(100vw - 32px)',
                  maxHeight: '72vh'
                }}
                role="group"
                aria-label="Root action choices"
              >
                <div
                  className={styles.rootPickerScrollArea}
                >

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '145px minmax(0, 1fr)',
                  gap: 18,
                  alignItems: 'start',
                  marginTop: 12
                }}>
                  <div className={`${styles.rootVerticalSection} ${styles.rootPolarSection}`} style={{ minWidth: 0 }}>
                    <h3 className={styles.rootVerticalHeading}>Polar</h3>

                    {[
                      ['Radian', 'zhe_theta'],
                      ['Radial', 'zhe_r']
                    ].map(([title, token]) => (
                      <div key={token} style={{
                        marginBottom: 12
                      }}>
                        <h4 style={{
                          color: '#a9c4e9',
                          fontWeight: 'normal',
                          margin: '0 0 5px'
                        }}>
                          {title}
                        </h4>

                        {polarRootActions
                          .filter(option =>
                            option.id.includes(token)
                          )
                          .map(renderRootOption)}
                      </div>
                    ))}
                  </div>

                  <div className={`${styles.rootVerticalSection} ${styles.rootCartesianSection}`} style={{ minWidth: 0 }}>
                    <h3 className={styles.rootVerticalHeading}>Cartesian</h3>

                    <div style={{
                      overflowX: 'auto',
                      width: '100%'
                    }}>
                      <table style={{
                        width: '100%',
                        minWidth: 620,
                        borderCollapse: 'collapse',
                        tableLayout: 'fixed'
                      }}>
                        <thead>
                          <tr>
                            <th style={{ width: 75 }} />
                            {[
                              'Product', 'Sum', 'Quadrance'
                            ].map(kind => (
                              <th key={kind} style={{
                                textAlign: 'left',
                                color: '#a9c4e9',
                                fontWeight: 'normal',
                                padding: 8,
                                borderBottom:
                                  '1px solid #52657e'
                              }}>
                                {kind}
                              </th>
                            ))}
                          </tr>
                        </thead>

                        <tbody>
                          {[2, 3].map(parts => (
                            <tr key={parts}>
                              <th style={{
                                textAlign: 'left',
                                verticalAlign: 'top',
                                color: '#a9c4e9',
                                fontWeight: 'normal',
                                padding: 8
                              }}>
                                {parts}-part
                              </th>

                              {[
                                'Product', 'Sum', 'Quadrance'
                              ].map(kind => (
                                <td key={kind} style={{
                                  verticalAlign: 'top',
                                  padding: 5,
                                  borderLeft:
                                    '1px solid #334156'
                                }}>
                                  {cartesianRootActions
                                    .filter(option =>
                                      rootPartCount(option) === parts &&
                                      rootKind(option) === kind
                                    )
                                    .map(renderRootOption)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {cartesianRootActions.some(option =>
                      ![2, 3].includes(rootPartCount(option))
                    ) && (
                      <div style={{ marginTop: 14 }}>
                        <h4 style={{
                          color: '#a9c4e9',
                          fontWeight: 'normal'
                        }}>
                          Other structures
                        </h4>

                        {cartesianRootActions
                          .filter(option =>
                            ![2, 3].includes(
                              rootPartCount(option)
                            )
                          )
                          .map(renderRootOption)}
                      </div>
                    )}
                  </div>
                </div>

                <p style={{
                  fontSize: 12,
                  color: '#a9c4e9',
                  margin: '8px 0 2px'
                }}>
                  Shift / Command-click to build a set,
                  or choose Select multiple.
                </p>
                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-start',
                  alignItems: 'center',
                  gap: 12,
                  marginTop: 12,
                  paddingTop: 8,
                  borderTop: '1px solid #52657e'
                }}>
                  {[
                    ['', 'No root action'],
                    ['CUSTOM', customRootsSelected
                      ? `Done (${customRootIds.length})`
                      : 'Select multiple'],
                    ['ALL', 'All']
                  ].map(([value, label]) => (
                    <button
                      key={value || 'none'}
                      type="button"
                      className={styles.rootPickerChoice}
                      aria-pressed={rootAction === value}
                      disabled={
                        running || fullRunning ||
                        (value === 'CUSTOM' &&
                         customRootsSelected &&
                         customRootIds.length === 0)
                      }
                      style={{
                        width: 'auto',
                        minWidth: 110,
                        marginLeft: value === 'CUSTOM'
                          ? 'auto' : undefined,
                        padding: '7px 12px',
                        textAlign: 'center',
                        border: '1px solid #6383a5',
                        background: rootAction === value
                          ? '#304f73' : 'transparent'
                      }}
                      onClick={() => {
                        if (value === 'CUSTOM') {
                          if (customRootsSelected) {
                            setRootMenuOpen(false);
                          } else {
                            setRootAction(activeRoot
                              ? ['CUSTOM', rootAction].join('|')
                              : 'CUSTOM');
                          }
                        } else {
                          setRootAction(value);
                          setRootMenuOpen(false);
                        }
                        setResponses([]);
                        setProgress(0);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                </div>

              </div>
            )}

            {activeRoot && !validRoot && (
              <small role="alert">
                Choose a real-valued phase variant of this root.
              </small>
            )}
          </div>
        </div>

        {headerSettingsHost && createPortal(
        <div ref={settingsRef} className={styles.settingsPicker} style={{ position: 'relative', top: 'auto', right: 'auto' }}>
          <button
            type="button"
            className={styles.settingsButton}
            aria-label="Search settings"
            aria-expanded={settingsOpen}
            aria-controls="closed-form-settings"
            title="Search settings"
            onClick={() => setSettingsOpen(open => !open)}
          >
            <svg
              width="23"
              height="23"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"/>
              <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06-1.88 1.88-.06-.06A1.7 1.7 0 0 0 16 18.4a1.7 1.7 0 0 0-1 1.56V20h-2.66v-.04a1.7 1.7 0 0 0-1-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06-1.88-1.88.06-.06A1.7 1.7 0 0 0 7.93 15a1.7 1.7 0 0 0-1.56-1H6.3v-2.66h.07a1.7 1.7 0 0 0 1.56-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06 1.88-1.88.06.06A1.7 1.7 0 0 0 11.34 6a1.7 1.7 0 0 0 1-1.56V4.4H15v.04A1.7 1.7 0 0 0 16 6a1.7 1.7 0 0 0 1.87-.34l.06-.06 1.88 1.88-.06.06a1.7 1.7 0 0 0-.34 1.87 1.7 1.7 0 0 0 1.56 1h.07v2.66h-.07A1.7 1.7 0 0 0 19.4 15Z"
                transform="translate(-1.33 -0.2)"/>
            </svg>
          </button>

          {settingsOpen && (
            <div
              id="closed-form-settings"
              className={styles.settingsMenu}
              role="group"
              aria-label="Search settings"
            >
              <div className={styles.settingsTitle}>
                Search settings
              </div>

              <div className={styles.settingsControl}>
                <label htmlFor="sigma">
                  Tolerance
                </label>
                <strong>{sigma}σ</strong>
                <input
                  id="sigma"
                  type="range"
                  style={{ '--settings-progress': `${100 * (sigma - 1) / 4}%` }}
                  min="1"
                  max="5"
                  step="1"
                  value={sigma}
                  onChange={event =>
                    setSigma(Number(event.target.value))
                  }
                />
              </div>

              <div className={styles.settingsControl}>
                <label htmlFor="complexity">
                  Complexity
                </label>
                <strong>{complexity}</strong>
                <input
                  id="complexity"
                  type="range"
                  style={{ '--settings-progress': `${100 * (complexity - 1) / 5}%` }}
                  min="1"
                  max="6"
                  step="1"
                  value={complexity}
                  disabled={fullRunning || fullCanResume}
                  onChange={event => {
                    if (fullRunning || fullCanResume) return;
                    setComplexity(Number(event.target.value));
                  }}
                />
              </div>

              <div className={styles.settingsControl}>
                <label htmlFor="full-search-depth">
                  Search depth
                </label>
                <strong>{fullSearchDepth}</strong>
                <input
                  id="full-search-depth"
                  type="range"
                  style={{ '--settings-progress': `${100 * (fullSearchDepth - 1) / 5}%` }}
                  min="1"
                  max="6"
                  step="1"
                  value={fullSearchDepth}
                  disabled={fullRunning}
                  onChange={event =>
                    setFullSearchDepth(Number(event.target.value))
                  }
                />
              </div>

              <div className={styles.settingsControl}>
                <label htmlFor="show-candidates">
                  Show max
                </label>
                <strong>{showCount}</strong>
                <input
                  id="show-candidates"
                  type="range"
                  style={{ '--settings-progress': `${100 * (showCount - 100) / 400}%` }}
                  min="100"
                  max="500"
                  step="10"
                  value={showCount}
                  onChange={event =>
                    setShowCount(Number(event.target.value))
                  }
                  aria-label="Maximum candidates to display"
                />
              </div>
            </div>
          )}
        </div>,
          headerSettingsHost
        )}

        {parsed.error && (
          <p style={{ color: '#ffc2c2' }}>
            {parsed.error}
          </p>
        )}
      </section>

      <section className={styles.constantsPanel} style={panel}>
        <div className={styles.constantsHeader}>
          <h2 style={{ margin: 0, fontSize: 20 }}>
            Constants to include in search
          </h2>

          <div className={styles.constantsActions}>
{(fullSelectionMode) && (
              <button
                type="button"
                style={{ ...button, height: 32, boxSizing: 'border-box' }}
                disabled={running || fullRunning}
                onClick={() => {
                  setFullSelectionMode(true);
                  setChosen(visibleConstants.map(c => c.token));
                  setCheckedNumbers([...additionalNumbers]);
                }}
              >
                Select all
              </button>
            )}

            <button
              type="button"
              style={{ ...button, height: 32, boxSizing: 'border-box' }}
              disabled={running || fullRunning}
              onClick={() => {
                setFullSelectionMode(false);
                setChosen([]);
                setCheckedNumbers([]);
              }}
            >
              Clear selection
            </button>

          </div>
        </div>

        

        {(reorderingConstants || constantOrderMessage) && (
          <div style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            alignItems: 'center',
            marginBottom: 8,
            fontSize: 13
          }}>
            {reorderingConstants && (
              <>
                <span>
                  Drag constants into the desired order.
                </span>
                <button
                  type="button"
                  style={{ ...button, padding: '5px 10px' }}
                  onClick={() => {
                    setReorderingConstants(false);
                    setDraggedConstant(null);
                    setOverConstant(null);
                    setConstantOrderMessage('');
                  }}
                >
                  Cancel
                </button>
              </>
            )}

            <button
              type="button"
              style={{ ...button, padding: '5px 10px' }}
              onClick={copyConstantDisplayOrder}
            >
              Copy order
            </button>

            {constantOrderMessage && (
              <span role="status">
                {constantOrderMessage}
              </span>
            )}
          </div>
        )}

        <div className={styles.constantList}>
          {visibleConstants.map(c => (
            <label
              key={c.token}
              className={styles.constantEntry}
              title={
                reorderingConstants
                  ? 'Drag to reorder'
                  : String(c.value)
              }
              draggable={
                reorderingConstants &&
                !running &&
                !fullRunning
              }
              onDragStart={event => {
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData(
                  'text/plain', c.token
                );
                setDraggedConstant(c.token);
              }}
              onDragOver={event => {
                if (!reorderingConstants) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                setOverConstant(c.token);
              }}
              onDrop={event => {
                if (!reorderingConstants) return;
                event.preventDefault();

                moveDraftConstant(
                  draggedConstant ||
                    event.dataTransfer.getData('text/plain'),
                  c.token
                );

                setDraggedConstant(null);
                setOverConstant(null);
              }}
              onDragEnd={() => {
                setDraggedConstant(null);
                setOverConstant(null);
              }}
              style={reorderingConstants ? {
                cursor: 'grab',
                userSelect: 'none',
                borderRadius: 4,
                outline: overConstant === c.token
                  ? '2px solid #76baff'
                  : '1px dashed #54677f',
                background: draggedConstant === c.token
                  ? 'rgba(77,119,171,0.25)'
                  : undefined
              } : undefined}
            >
              {reorderingConstants && (
                <span
                  aria-hidden="true"
                  style={{
                    color: '#a9cbf5',
                    fontSize: 18,
                    cursor: 'grab',
                    flex: '0 0 auto'
                  }}
                >
                  ⠿
                </span>
              )}
              <input
                type="checkbox"
                aria-label={`Include ${c.name} and reciprocal`}
                checked={selected.has(c.token) || (c.token === 'F*' && selected.has('F'))}
                disabled={
                  reorderingConstants ||
                  running ||
                  fullRunning ||
                  (!fullSelectionMode && !selected.has(c.token) &&
                   selectedFactorCount >= quickLimit)
                }
                onChange={event =>
                  setChosen(previous =>
                    event.target.checked
                      ? [...previous, c.token]
                      : previous.filter(t => t !== c.token && !(c.token === 'F*' && t === 'F'))
                  )
                }
              />

              {c.token === 'F*' ? (
                <strong className={styles.constantSymbolFallback}>
                  <span style={{ fontStyle: 'italic' }}>F</span>
                </strong>
              ) : symbolSvgs[c.token] ? (
                <img
                  className={styles.constantSymbol}
                  src={symbolSvgs[c.token]}
                  style={{
                    width: `${symbolFontWidths[c.token]}em`
                  }}
                  alt={c.token}
                  draggable={false}
                />
              ) : (
                <strong className={styles.constantSymbolFallback}>
                  <CompositeConstantSymbol token={c.token} />
                </strong>
              )}

              <span className={styles.constantName}>
                {c.token === 'V_5_2' ? (
                  <>volume of the 5<sub>2</sub> knot complement</>
                ) : c.token === 'V_6_1' ? (
                  <>volume of the 6<sub>1</sub> knot complement</>
                ) : NEW_KNOT_VOLUME_PARTS[c.token] ? (
                  <>
                    volume of the{' '}
                    {NEW_KNOT_VOLUME_PARTS[c.token][0]}
                    <sub>{NEW_KNOT_VOLUME_PARTS[c.token][1]}</sub>
                    {' '}knot complement
                  </>
                ) : (
                  c.name
                )}
              </span>
            </label>
          ))}

          {additionalNumbers.map(number => (
            <div
              key={'custom-' + number}
              className={styles.customNumberRow}
            >
              <input
                type="checkbox"
                checked={checkedNumbers.includes(number)}
                disabled={running || fullRunning || (
                  !fullSelectionMode && !checkedNumbers.includes(number) &&
                  selectedFactorCount >= quickLimit
                )}
                aria-label={`Include ${number} and its reciprocal`}
                onChange={event =>
                  setCheckedNumbers(previous =>
                    event.target.checked
                      ? [...previous, number]
                      : previous.filter(x => x !== number)
                  )
                }
              />

              <span title={`Include ${number} and 1/(${number})`}>
                {number} and reciprocal
              </span>

              <button
                type="button"
                disabled={running}
                className={styles.removeNumber}
                aria-label={`Remove ${number}`}
                onClick={() => {
                  setAdditionalNumbers(previous =>
                    previous.filter(x => x !== number)
                  );
                  setCheckedNumbers(previous =>
                    previous.filter(x => x !== number)
                  );
                }}
              >
                ×
              </button>
            </div>
          ))}

          <div className={styles.customNumberRow}>
            <input
              type="checkbox"
              checked={false}
              disabled={running}
              aria-label="Add entered number and reciprocal"
              onChange={addCustomNumber}
            />

            <input
              type="text"
              aria-label="New numerical constant"
              disabled={running}
              placeholder="Enter number; check box or press Enter"
              value={numberDraft}
              onChange={event => {
                setNumberDraft(event.target.value);
                setNumberError('');
              }}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addCustomNumber();
                }
              }}
            />

            {numberError && (
              <span
                role="alert"
                className={styles.numberError}
              >
                {numberError}
              </span>
            )}
          </div>
        </div>
      </section>

      <section className={styles.searchPanel} style={panel}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          flexWrap: 'wrap'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 10,
            width: '100%'
          }}>
          <button
            type="button"
            style={{
              ...button,
              width: '100%',
              height: 32,
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              lineHeight: 1,
              background: '#235d8e',
              opacity:
                running ||
                !parsed.value ||
                !validRoot ||
                !quickAllowed
                  ? 0.5 : 1
            }}
            disabled={
              running ||
              !parsed.value ||
              !validRoot ||
              !quickAllowed || fullSelectionMode || fullRunning
            }
            onClick={run}
          >
            Search closed forms
          </button>

          <button
            type="button"
            style={{
              ...button,
              width: '100%',
              height: 32,
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              lineHeight: 1,
              opacity:
                running || fullRunning ||
                !parsed.value || !validRoot
                  ? 0.45 : 1,
              cursor:
                running || fullRunning ||
                !parsed.value || !validRoot
                  ? 'not-allowed' : 'pointer'
            }}
            disabled={
              running || fullRunning ||
              !parsed.value || !validRoot
            }
            className={
              fullSelectionMode && !fullCanResume
                ? styles.fullRunReady
                : undefined
            }
            onClick={() => fullSelectionMode || fullCanResume
              ? runFull(false) : setFullSelectionMode(true)}
          >
            {fullSelectionMode || fullCanResume
              ? 'Start Full Run' : 'Full Run'}
          </button>
          </div>

          {/* Always-visible Full Run progress indicator.
              Before the first completed batch, progress is 0%. */}
          {(fullRunning || fullCanResume || (
            fullSaved?.signature === currentFullSignature &&
            fullSaved?.total === proposedFullPositions &&
            fullSaved?.total > 0
          )) && (
            <div style={{
              width: '100%',
              marginTop: 9,
              marginBottom: 4
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 10,
                marginBottom: 5,
                fontSize: 13,
                color: '#c3d8f2'
              }}>
                <span>
                  {fullRunning
                    ? (multiRootMode
                        ? `Root ${
                            selectedRootIndices.indexOf(
                              fullSaved?.nextRootIndex ??
                                selectedRootIndices[0]
                            ) + 1
                          }/${selectedRootIndices.length}`
                        : 'Full Run in progress')
                    : fullSaved?.earlyStopped
                      ? 'Full Run stopped at structural ranking cutoff'
                    : fullSaved?.cursor >= fullSaved?.total
                      ? 'Full Run complete'
                      : 'Full Run paused'}
                </span>
                <span style={{
                  fontVariantNumeric: 'tabular-nums'
                }}>
                  {(
                    100 * (
                      fullSaved?.signature === currentFullSignature &&
                      fullSaved?.total === proposedFullPositions
                        ? fullSaved.cursor
                        : 0
                    ) / Math.max(1, proposedFullPositions)
                  ).toFixed(multiRootMode ? 8 : 4)}%
                  {multiRootMode && fullSaved?.cursor > 0 && (
                    ` · ${fullSaved.cursor.toLocaleString()} positions`
                  )}
                </span>
              </div>

              <div
                role="progressbar"
                aria-label="Full Run progress"
                aria-valuemin={0}
                aria-valuemax={proposedFullPositions}
                aria-valuenow={
                  fullSaved?.signature === currentFullSignature &&
                  fullSaved?.total === proposedFullPositions
                    ? fullSaved.cursor
                    : 0
                }
                style={{
                  width: '100%',
                  height: 8,
                  borderRadius: 8,
                  background: '#465366',
                  overflow: 'hidden'
                }}
              >
                <div style={{
                  height: '100%',
                  width: `${
                    100 * (
                      fullSaved?.signature === currentFullSignature &&
                      fullSaved?.total === proposedFullPositions
                        ? fullSaved.cursor
                        : 0
                    ) / Math.max(1, proposedFullPositions)
                  }%`,
                  background: '#1684f9',
                  borderRadius: 8,
                  transition: 'width 180ms ease'
                }} />
              </div>
            </div>
          )}

          {(fullSelectionMode) && (
            <div style={{
              width: '100%',
              padding: '10px 0 4px',
              display: 'grid',
              gap: 8
            }}>
              <div style={{
                fontSize: 13,
                lineHeight: 1.5,
                color: '#c3d8f2'
              }}>
                <div>
                  Proposed positions: {
                    proposedFullPositions.toLocaleString()
                  }
                </div>
                <div>
                  Estimated runtime: {
                    multiRootMode && !measuredFullRate
                      ? 'measuring first batch'
                      : formatSearchDuration(proposedFullDuration)
                  }
                  {measuredFullRate
                    ? ' (observed processing rate)'
                    : multiRootMode
                      ? ' (no estimate until measured)'
                      : ' (reference rate: 500,000 positions/s)'}
                </div>
                <div>
                  Maximum adjusted complexity: {complexity}
                </div>
                {fullSearchDepth < 7 && (
                  <div style={{ color: '#ffd39b' }}>
                    Limited-depth search: deeper expressions
                    with low adjusted complexity may be missed.
                  </div>
                )}
              </div>
            </div>
          )}

          <p style={{
            margin: '8px 0 4px', fontSize: 13, lineHeight: 1.45,
            color: fullSelectionMode || quickAllowed ? '#a9c4e9' : '#ffc2c2'
          }}>
            {fullSelectionMode ? (
              <>Full Run selection: {selectedFactorCount} factors.
                {' '}Limit lifted; select additional constants if needed.</>
            ) : (
              <>Quick search: {selectedFactorCount} of {quickLimit} allowed
                {' '}at complexity {complexity}. Search depth: {quickSearchDepth}.
                {!quickAllowed && ''}</>
            )}
          </p>

          {(fullSaved || fullRunning ||
            fullSelectionMode) && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: fourFullRunButtons
                ? 'minmax(0, 1.1fr) minmax(0, 1.15fr) minmax(0, 0.7fr) minmax(0, 0.65fr)'
                : fullRunning
                  ? 'minmax(0, 1.7fr) minmax(0, 1fr) minmax(0, 1fr)'
                  : 'minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1fr)',
              gap: 6,
              width: '100%'
            }}>
              <div style={fourFullRunButtons
                ? { display: 'contents' }
                : { minWidth: 0 }}>
          {fullSaved?.inputs &&
            fullSaved.signature !== currentFullSignature &&
            !fullRunning && !running && (
            <button
              type="button"
              style={{
                ...button,
                width: '100%',
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                boxSizing: 'border-box',
                padding: '0 6px',
                whiteSpace: 'nowrap'
              }}
              onClick={() => {
                const saved = fullSaved.inputs;
                setNumberText(saved.numberText);
                setUncertaintyText(saved.uncertaintyText);
                setComplexity(Math.min(6, saved.complexity));
                setFullSearchDepth(Math.min(6, saved.fullSearchDepth ?? 8));
                setSigma(saved.sigma);
                setChosen(saved.chosen);
                setCheckedNumbers(saved.checkedNumbers);
                setRootAction(saved.rootAction);
                setMessage(
                  (saved.fullSearchDepth ?? 8) > 6 || saved.complexity > 6
                    ? 'Settings restored within the new maximum of 6. Older runs exceeding these limits cannot resume; start a new Full Run.'
                    : 'Saved Full Run restored. Press Resume.'
                );
              }}
            >
              Restore search
            </button>
          )}

          {fullSelectionMode &&
            !running &&
            !fullRunning &&
            !fullCanResume && (
            <button
              type="button"
              style={{
                ...button,
                width: '100%',
                height: 32,
                  whiteSpace: 'nowrap',
                  whiteSpace: 'nowrap',
                  whiteSpace: 'nowrap',
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '0 6px',
                lineHeight: 1
              }}
              onClick={() => setFullSelectionMode(false)}
            >
              Quick Selection
            </button>
          )}

          {fullCanResume && !fullRunning && (
            <button
              type="button"
              style={{
                ...button,
                width: '100%',
                height: 32,
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '0 8px',
                lineHeight: 1
              }}
              className={
                fullCanResume && !running && !fullRunning
                  ? styles.resumeReady
                  : undefined
              }
              disabled={running}
              onClick={() => runFull(true)}
            >
              Resume
            </button>
          )}

          {fullRunning && (
            <button
              type="button"
              style={{
                ...button,
                width: '100%',
                minWidth: 0,
                height: 32,
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '0 8px',
                lineHeight: 1,
                whiteSpace: 'nowrap'
              }}
              onClick={() => {
                fullStop.current = true;
                fullAbort.current?.abort();
              }}
            >
              Pause Full Run
            </button>
          )}


              </div>

              <button
                type="button"
                style={{
                  ...button,
                  width: '100%',
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  boxSizing: 'border-box',
                  padding: '0 8px',
                  opacity: fullRunning || running ? 0.45 : 1
                }}
                disabled={fullRunning || running}
                onClick={() => {
                  setFullSelectionMode(false);
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                style={{
                  ...button,
                  width: '100%',
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  boxSizing: 'border-box',
                  padding: '0 8px',
                  opacity:
                    fullRunning || running || !fullSaved ? 0.45 : 1
                }}
                disabled={fullRunning || running || !fullSaved}
                onClick={() => {
                  localStorage.removeItem(checkpointStorageKey);
                  localStorage.removeItem(
                    'closed-form-full-run-v1'
                  );
                  setFullSaved(null);
                  setResponses([]);
                  setProgress(0);
                  setMessage('');
                }}
              >
                Delete
              </button>
            </div>
          )}

          {running && (
            <button
              type="button"
              style={button}
              onClick={() => {
                cancel.current = true;
                abort.current?.abort();
              }}
            >
              Stop
            </button>
          )}


        </div>

        {fullSaved?.signature === currentFullSignature &&
          (fullSaved?.searchDepth ?? 8) === fullSearchDepth &&
          fullSaved.total === proposedFullPositions &&
          fullSaved.total > 0 && (
          <div style={{
            padding: 12, marginTop: 12, background: '#102035',
            border: '1px solid #435b76', borderRadius: 8,
            color: '#eaf0f9', lineHeight: 1.5,
            width: '100%', boxSizing: 'border-box'
          }}>
            <strong>{fullRunning ? 'Full Run in progress' :
              fullSaved.earlyStopped
                ? 'Full Run stopped at structural ranking cutoff' :
              fullSaved.cursor >= fullSaved.total
                ? 'Full Run complete' : 'Full Run paused / ready'}</strong>

            <div>
              {(100 * fullSaved.cursor / fullSaved.total).toFixed(4)}%
              {' · '}{fullSaved.cursor.toLocaleString()} of
              {' '}{fullSaved.total.toLocaleString()} monomials
            </div>

            <div>
              Qualifying matches: {fullSaved.matches.toLocaleString()}
            </div>

            <div>
              Current original-complexity layer: {fullCurrentLayer} / {fullSearchDepth}
            </div>
            <div>
              Qualifying matches in latest batch: {
                (fullSaved.lastBatchMatches || 0).toLocaleString()
              }
            </div>
            <div>
              New Top 1000 entries in latest batch: {
                fullSaved.lastBatchNewTop || 0
              }
            </div>
            <div>
              Cumulative Top 1000 entries: {
                (fullSaved.cumulativeTopEntries || 0).toLocaleString()
              }
            </div>
            <div>
              Ranked positions changed in latest batch: {
                fullSaved.lastBatchChangedPositions || 0
              }
            </div>
            <div>
              Worst retained adjusted complexity: {
                fullSaved.worstAdjustedComplexity ?? 'none'
              }
            </div>

            <div>
              Best expressions retained: {fullSaved.candidates.length} / 1000
              {fullSaved.cursor < fullSaved.total &&
                !fullSaved.earlyStopped
                ? ' (provisional)'
                : ''}
            </div>

            {fullSaved.activeMs > 0 &&
              !fullSaved.earlyStopped && (
              <div>
                Estimated remaining: {formatSearchDuration(
                  (fullSaved.total - fullSaved.cursor) *
                  fullSaved.activeMs /
                  Math.max(1, fullSaved.cursor)
                )}
                {' · '}Rate: {Math.round(
                  1000 * fullSaved.cursor / fullSaved.activeMs
                ).toLocaleString()} monomials/s
              </div>
            )}
          </div>
        )}

        {message && (
          <p role="status" style={{
            color: '#d0deef',
            marginTop: 20
          }}>
            {message}
          </p>
        )}

        {responses.length > 0 && (
          <details style={{ marginTop: 10 }}>
            <summary style={{ cursor: 'pointer' }}>
              Search diagnostics
            </summary>

            <div style={{
              marginTop: 8,
              fontSize: 13,
              lineHeight: 1.65
            }}>
              <div>
                Monomials evaluated: {responses[0].monomials}
              </div>
              <div>
                Rational candidates verified: {audit.inspected}
              </div>
              <div>
                Matches before display limit: {responses[0].totalMatches}
              </div>
              <div>
                Search coverage: {responses[0].coverage}
              </div>
              <div>
                Complete within stated coverage: {responses[0].incomplete ? 'No' : 'Yes'}
              </div>
              <div>
                Maximum completed monomial complexity: {responses[0].highestCompletedMonomialComplexity}
              </div>
              <div>
                Currently displayed: {Math.min(showCount, ranked.length)}
              </div>
            </div>
          </details>
        )}
      </section>

      <section className={`${styles.verifiedPanel} ${
          multiRootMode ? styles.allRootCandidates : ''
        }`} style={panel}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: 20
          }}>
            Verified candidates ({ranked.length})
          </h2>


        </div>


        {ranked.length === 0 ? (
          <p style={{ color: '#b2c3d7' }}>
            No automatically verified candidates inside
            the selected sigma range yet.
          </p>
        ) : ranked.slice(0, showCount).map((m, i) => (
          <div
            key={`${m.rootActionId || 'single'}:${m.expression}`}
            style={{
              padding: '12px 0',
              borderBottom: '1px solid #334156'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 7,
              minWidth: 0
            }}>
              <strong style={{
                flex: '0 0 auto',
                alignSelf: 'center'
              }}>
                {i + 1}.
              </strong>

              <div style={{
                minWidth: 0,
                overflowX: 'auto',
                padding: '4px 2px',
                flex: '1 1 auto'
              }}>
                <div style={{
                  display: 'inline-flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: 7
                }}>
                  <CandidateMath
                    expression={m.expression}
                    hasRoot={Boolean(activeRoot) || multiRootMode}
                  />
                  {multiRootMode && m.rootActionId && (
                    <span style={{ whiteSpace: 'nowrap' }}>
                      {!/zhe_(r|theta)/.test(m.rootActionId) && '('}
                      {renderRootLabel(rootActions.find(
                        action => action.id === m.rootActionId
                      ))}
                      {!/zhe_(r|theta)/.test(m.rootActionId) && ')'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div style={{
              color: '#b2c3d7',
              fontSize: 13,
              lineHeight: 1.5
            }}>
              <div>
                Value {m.value.toPrecision(15)}
              </div>
              <div>
                Error {m.z.toPrecision(4)}σ
              </div>
            </div>

            {Array.isArray(m.equivalentExpressions) &&
              m.equivalentExpressions.length > 0 && (
                <details style={{
                  marginTop: 10,
                  marginLeft: 0,
                  color: '#ffd39b',
                  fontSize: 13
                }}>
                  <summary style={{
                    cursor: 'pointer',
                    userSelect: 'none',
                    color: '#ffd39b',
                    fontWeight: 400
                  }}>
                    Equivalent forms
                    ({m.equivalentExpressions.length})
                  </summary>

                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 9,
                    padding: '12px 0 4px 14px'
                  }}>
                    {m.equivalentExpressions.map(
                      (expression, index) => (
                        <div
                          key={`${index}:${expression}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            maxWidth: '100%'
                          }}
                        >
                          <CandidateMath
                            expression={expression}
                            hasRoot={
                              Boolean(activeRoot) || multiRootMode
                            }
                          />
                          {multiRootMode && m.rootActionId && (
                            <span style={{
                              whiteSpace: 'nowrap'
                            }}>
                              {renderRootLabel(rootActions.find(
                                action => action.id === m.rootActionId
                              ))}
                            </span>
                          )}
                        </div>
                      )
                    )}
                  </div>
                </details>
              )}
          </div>
        ))}
      </section>

      <section className={styles.rawPanel} style={panel}>
        <h2 style={{
          margin: '0 0 12px',
          fontSize: 20
        }}>
          Search details ({responses.length} runs)
        </h2>


        <div style={{
          maxHeight: 480,
          overflowY: 'auto'
        }}>
          {responses.map((r, i) => (
            <details
              key={i}
              style={{
                borderBottom: '1px solid #334156',
                padding: '9px 0'
              }}
            >
              <summary style={{ cursor: 'pointer' }}>
                {r.query}
                {' '}
                {r.expansionRequests ? `— ${r.expansionRequests} More request(s)` : ''}
                {r.moreAvailable ? ' — More results still available' : ''}
                {r.warning ? ` — ${r.warning}` : ''}
              </summary>

              {(r.pods || []).map((p, j) => (
                <div
                  key={j}
                  style={{
                    margin: '12px 0',
                    color: '#c7d6e8'
                  }}
                >
                  <strong>{p.title}</strong>

                  <pre style={{
                    whiteSpace: 'pre-wrap',
                    overflowWrap: 'anywhere',
                    fontSize: 12
                  }}>
                    {p.text || p.minput}
                  </pre>
                </div>
              ))}
            </details>
          ))}
        </div>
      </section>

    </div>
  );
}
