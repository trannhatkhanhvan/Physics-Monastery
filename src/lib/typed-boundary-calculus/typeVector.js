export const TYPE_AXES = Object.freeze([
  { key: "t", symbol: "T", label: "time" },
  { key: "l", symbol: "L", label: "length" },
  { key: "q", symbol: "Q", label: "charge" },
  { key: "theta", symbol: "Θ", label: "temperature" },
  { key: "m", symbol: "M", label: "mass" },
  { key: "n", symbol: "N", label: "amount / mole-counting" },
]);

export function makeType({ t = 0, l = 0, q = 0, theta = 0, m = 0, n = 0 } = {}) {
  return Object.freeze({ t, l, q, theta, m, n });
}

export const ZERO_TYPE = makeType();

export function addType(a, b) {
  return makeType({
    t: a.t + b.t,
    l: a.l + b.l,
    q: a.q + b.q,
    theta: a.theta + b.theta,
    m: a.m + b.m,
    n: a.n + b.n,
  });
}

export function scaleType(k, a) {
  return makeType({
    t: k * a.t,
    l: k * a.l,
    q: k * a.q,
    theta: k * a.theta,
    m: k * a.m,
    n: k * a.n,
  });
}

export function subtractType(a, b) {
  return addType(a, scaleType(-1, b));
}

export function equalType(a, b) {
  return (
    a.t === b.t &&
    a.l === b.l &&
    a.q === b.q &&
    a.theta === b.theta &&
    a.m === b.m &&
    a.n === b.n
  );
}

export function isZeroType(a) {
  return equalType(a, ZERO_TYPE);
}

export function typeToArray(a) {
  return [a.t, a.l, a.q, a.theta, a.m, a.n];
}

export function formatType(a) {
  return `(${typeToArray(a).join(", ")})`;
}

export function formatTypeDetailed(a) {
  return TYPE_AXES.map((axis) => `${axis.symbol}:${a[axis.key]}`).join("  ");
}
