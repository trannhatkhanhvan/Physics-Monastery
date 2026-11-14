import {
  parseMathFunction,
  FUNCTION_REGISTRY
} from './math-function-ast';
import { lambertW } from './complex-lambert-w';

// Safe complex-expression interpreter. No eval(), Function(), or dynamic code.
const C = (re, im = 0) => ({ re, im });
const add = (a, b) => C(a.re + b.re, a.im + b.im);
const sub = (a, b) => C(a.re - b.re, a.im - b.im);
const mul = (a, b) => C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
const scale = (a, k) => C(a.re * k, a.im * k);
const abs = a => Math.hypot(a.re, a.im);
const arg = a => Math.atan2(a.im, a.re);
function div(a, b) {
  if (b.re === 0 && b.im === 0) return C(NaN, NaN);
  if (Math.abs(b.re) >= Math.abs(b.im)) {
    const r = b.im / b.re;
    const d = b.re + b.im * r;
    return C((a.re + a.im * r) / d, (a.im - a.re * r) / d);
  }
  const r = b.re / b.im;
  const d = b.im + b.re * r;
  return C((a.re * r + a.im) / d, (a.im * r - a.re) / d);
}
const exp = a => scale(C(Math.cos(a.im), Math.sin(a.im)), Math.exp(a.re));
const log = a => C(Math.log(abs(a)), arg(a));
function pow(a, b) {
  if (a.re === 0 && a.im === 0 && b.im === 0 && b.re > 0) return C(0);
  if (b.im === 0 && Number.isSafeInteger(b.re) && Math.abs(b.re) <= 10000) {
    if (b.re === 0) return C(1);
    let base = a;
    let result = C(1);
    let n = Math.abs(b.re);
    while (n) {
      if (n % 2) result = mul(result, base);
      n = Math.floor(n / 2);
      if (n) base = mul(base, base);
    }
    return b.re < 0 ? div(C(1), result) : result;
  }
  return exp(mul(b, log(a)));
}
const sin = z => C(Math.sin(z.re) * Math.cosh(z.im), Math.cos(z.re) * Math.sinh(z.im));
const cos = z => C(Math.cos(z.re) * Math.cosh(z.im), -Math.sin(z.re) * Math.sinh(z.im));
const sinh = z => C(Math.sinh(z.re) * Math.cos(z.im), Math.cosh(z.re) * Math.sin(z.im));
const cosh = z => C(Math.cosh(z.re) * Math.cos(z.im), Math.sinh(z.re) * Math.sin(z.im));
const gammaCoefficients = [
  0.9999999999998099, 676.5203681218851, -1259.1392167224028,
  771.3234287776531, -176.6150291621406, 12.507343278686905,
  -0.13857109526572012, 9.984369578019572e-6, 1.5056327351493116e-7
];
function gamma(z) {
  if (z.im === 0 && z.re <= 0 && Number.isInteger(z.re)) return C(NaN, NaN);
  if (z.re < 0.5) {
    return div(C(Math.PI), mul(sin(scale(z, Math.PI)), gamma(sub(C(1), z))));
  }
  const w = sub(z, C(1));
  let s = C(gammaCoefficients[0]);
  for (let k = 1; k < gammaCoefficients.length; k++) {
    s = add(s, div(C(gammaCoefficients[k]), add(w, C(k))));
  }
  const t = add(w, C(7.5));
  return scale(mul(mul(pow(t, add(w, C(0.5))), exp(scale(t, -1))), s), Math.sqrt(2 * Math.PI));
}

// Complex special functions for geometric visualization.
// Principal branches are used where the functions are multivalued.
const finiteComplex = z =>
  Number.isFinite(z.re) && Number.isFinite(z.im);

const undefinedComplex = () => C(NaN, NaN);

function li2Series(z) {
  let term = C(1);
  let sum = C(0);

  for (let n = 1; n <= 180; n++) {
    term = mul(term, z);
    const increment = scale(term, 1 / (n * n));
    sum = add(sum, increment);

    if (abs(increment) <
        2e-14 * Math.max(1, abs(sum))) break;
  }

  return sum;
}

function li2(z, depth = 0) {
  if (!finiteComplex(z) || depth > 12) {
    return undefinedComplex();
  }

  if (abs(z) <= 0.55) return li2Series(z);

  const oneMinus = sub(C(1), z);

  if (abs(oneMinus) <= 0.55) {
    return sub(
      sub(C(Math.PI ** 2 / 6), mul(log(z), log(oneMinus))),
      li2(oneMinus, depth + 1)
    );
  }

  if (abs(z) >= 1.25) {
    // On the real cut x > 1, use the conventional
    // principal Li2(x) value with negative imaginary part.
    const minusZ = C(-z.re, z.im === 0 ? 0 : -z.im);
    const L = log(minusZ);

    return sub(
      sub(scale(mul(L, L), -0.5), C(Math.PI ** 2 / 6)),
      li2(div(C(1), z), depth + 1)
    );
  }

  const transformed = div(z, sub(z, C(1)));

  return sub(
    scale(mul(log(oneMinus), log(oneMinus)), -0.5),
    li2(transformed, depth + 1)
  );
}

function zeta(s) {
  if (abs(sub(s, C(1))) < 1e-12) {
    return undefinedComplex();
  }

  // Euler transformation of the alternating eta series.
  // The bounded number of terms is intentional for interactive plots.
  const nMax = 32;
  const values = [];

  for (let k = 1; k <= nMax + 1; k++) {
    values.push(exp(scale(s, -Math.log(k))));
  }

  let eta = C(0);
  let weight = 0.5;

  for (let n = 0; n < nMax; n++) {
    eta = add(eta, scale(values[0], weight));

    for (let k = 0; k < nMax - n; k++) {
      values[k] = sub(values[k], values[k + 1]);
    }

    weight *= 0.5;
  }

  return div(
    eta,
    sub(C(1), exp(scale(sub(C(1), s), Math.LN2)))
  );
}

function beta(a, b) {
  return div(
    mul(gamma(a), gamma(b)),
    gamma(add(a, b))
  );
}

function psi(z) {
  if (z.im === 0 && z.re <= 0 &&
      Number.isInteger(z.re)) {
    return undefinedComplex();
  }

  if (z.re < 0.5) {
    const p = scale(z, Math.PI);

    return sub(
      psi(sub(C(1), z)),
      scale(div(cos(p), sin(p)), Math.PI)
    );
  }

  let w = z;
  let correction = C(0);

  for (let k = 0; k < 32 && w.re < 10; k++) {
    correction = sub(correction, div(C(1), w));
    w = add(w, C(1));
  }

  const inv = div(C(1), w);
  const inv2 = mul(inv, inv);

  let result = sub(log(w), scale(inv, 0.5));

  result = sub(result, scale(inv2, 1 / 12));
  result = add(result, scale(pow(inv, C(4)), 1 / 120));
  result = sub(result, scale(pow(inv, C(6)), 1 / 252));
  result = add(result, scale(pow(inv, C(8)), 1 / 240));
  result = sub(result, scale(pow(inv, C(10)), 5 / 660));

  return add(result, correction);
}

function erf(z) {
  if (z.re < 0) return scale(erf(scale(z, -1)), -1);

  let term = z;
  let sum = z;
  const z2 = mul(z, z);

  for (let n = 1; n <= 190; n++) {
    term = scale(mul(term, z2), -1 / n);

    const increment = scale(term, 1 / (2 * n + 1));
    sum = add(sum, increment);

    if (abs(increment) <
        2e-14 * Math.max(1, abs(sum))) break;
  }

  return scale(sum, 2 / Math.sqrt(Math.PI));
}

function airyAi(z) {
  // Airy differential equation: Ai''(z) = z Ai(z).
  const coefficients = [
    0.35502805388781723926,
    -0.2588194037928067984,
    0
  ];

  const powers = [C(1), z, mul(z, z)];

  let result = add(
    C(coefficients[0]),
    scale(z, coefficients[1])
  );

  for (let n = 3; n < 145; n++) {
    coefficients[n] =
      coefficients[n - 3] / (n * (n - 1));

    powers[n] = mul(powers[n - 1], z);

    const increment = scale(
      powers[n],
      coefficients[n]
    );

    result = add(result, increment);

    if (n > 24 && abs(increment) <
        1e-15 * Math.max(1, abs(result))) break;
  }

  return result;
}

const sqrt = a => pow(a, C(0.5));
const I = C(0, 1);

const asin = a => mul(
  C(0, -1),
  log(add(mul(I, a), sqrt(sub(C(1), pow(a, C(2))))))
);

const acos = a => sub(C(Math.PI / 2), asin(a));

const atan = a => scale(
  mul(I, sub(
    log(sub(C(1), mul(I, a))),
    log(add(C(1), mul(I, a)))
  )),
  0.5
);

const asinh = a =>
  log(add(a, sqrt(add(pow(a, C(2)), C(1)))));

const acosh = a =>
  log(add(a, mul(
    sqrt(add(a, C(1))),
    sqrt(sub(a, C(1)))
  )));

const atanh = a => scale(
  sub(log(add(C(1), a)), log(sub(C(1), a))),
  0.5
);

const operations = {
  lambertw: z => lambertW(z, 0),
  sin, cos, sinh, cosh, exp, log, gamma,
  li2, zeta, beta, psi, erf,
  ai: airyAi,
  erfc: a => sub(C(1), erf(a)),

  tan: a => div(sin(a), cos(a)),
  cot: a => div(cos(a), sin(a)),
  sec: a => div(C(1), cos(a)),
  csc: a => div(C(1), sin(a)),

  tanh: a => div(sinh(a), cosh(a)),
  coth: a => div(cosh(a), sinh(a)),
  csch: a => div(C(1), sinh(a)),
  sech: a => div(C(1), cosh(a)),

  asin, acos, atan, asinh, acosh, atanh,
  sqrt,
  root: (a, n) => pow(a, div(C(1), n)),
  pow,

  log2: a => div(log(a), C(Math.LN2)),
  log10: a => div(log(a), C(Math.LN10)),

  abs: a => C(abs(a)),
  arg: a => C(arg(a)),
  conj: a => C(a.re, -a.im),
  re: a => C(a.re),
  im: a => C(a.im)
};

const arity = {
  beta: 2,
  root: 2,
  pow: 2,
  log: [1, 2]
};
const symbols = { pi: C(Math.PI), e: C(Math.E), i: C(0, 1) };

export function compileComplexFunction(expression) {
  const ast = parseMathFunction(expression);

  function compile(node) {
    if (node.type === 'number') {
      return () => C(node.value);
    }

    if (node.type === 'symbol') {
      if (node.name === 'z') return z => z;

      if (Object.hasOwn(symbols, node.name)) {
        return () => symbols[node.name];
      }

      throw Error(`Unknown symbol '${node.name}'.`);
    }

    if (node.type === 'unary') {
      const argument = compile(node.arg);
      return z => scale(argument(z), -1);
    }

    if (node.type === 'binary') {
      const left = compile(node.left);
      const right = compile(node.right);

      const operators = {
        '+': add,
        '-': sub,
        '*': mul,
        '/': div,
        '^': pow
      };

      const operation = operators[node.op];

      if (!operation) {
        throw Error(`Unsupported operator '${node.op}'.`);
      }

      return z => operation(left(z), right(z));
    }

    if (node.type === 'call') {
      const operation = operations[node.name];

      if (!operation) {
        throw Error(
          `Numerical implementation unavailable for '${node.name}'.`
        );
      }

      const registryEntry = FUNCTION_REGISTRY[node.name];
      const allowed = registryEntry?.[0];

      const [minimum, maximum] = Array.isArray(allowed)
        ? allowed
        : [allowed, allowed];

      if (
        node.args.length < minimum ||
        node.args.length > maximum
      ) {
        const count = minimum === maximum
          ? String(minimum)
          : `${minimum}-${maximum}`;

        throw Error(
          `Function '${node.name}' expects ${count} argument(s).`
        );
      }

      if (node.name === 'lambertw') {
        if (
          node.args.length < 1 ||
          node.args.length > 2
        ) {
          throw Error(
            'lambertw expects one or two arguments.'
          );
        }

        const branchNode = node.args.length === 2
          ? node.args[0]
          : null;

        const branch = !branchNode
          ? 0
          : branchNode.type === 'number'
            ? branchNode.value
            : branchNode.type === 'unary' &&
              branchNode.op === '-' &&
              branchNode.arg.type === 'number'
                ? -branchNode.arg.value
                : NaN;

        if (
          !Number.isSafeInteger(branch) ||
          Math.abs(branch) > 32
        ) {
          throw Error(
            'Lambert W branch must be a literal integer ' +
            'from -32 to 32.'
          );
        }

        const argument = compile(
          node.args[node.args.length - 1]
        );

        return z => lambertW(
          argument(z),
          branch
        );
      }

      const args = node.args.map(compile);

      if (node.name === 'log' && args.length === 2) {
        return z => div(
          log(args[0](z)),
          log(args[1](z))
        );
      }

      return z => operation(
        ...args.map(arg => arg(z))
      );
    }

    throw Error('Unknown mathematical expression node.');
  }

  const evaluate = compile(ast);

  return (re, im) => evaluate(C(re, im));
}

export function sampleComplexGeometry(evaluate, re, im, inverted = false) {
  if (inverted) {
    const inverse = div(C(1), C(re, im));
    if (!Number.isFinite(inverse.re) || !Number.isFinite(inverse.im)) return null;
    ({ re, im } = inverse);
  }
  const value = evaluate(re, im);
  if (!value || !Number.isFinite(value.re) || !Number.isFinite(value.im)) return null;
  const magnitude = abs(value);
  if (!Number.isFinite(magnitude)) return null;
  return { ...value, logAbs: magnitude === 0 ? -Infinity : Math.log(magnitude), arg: arg(value) };
}
