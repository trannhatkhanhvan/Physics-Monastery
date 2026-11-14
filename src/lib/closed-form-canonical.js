// Exact symbolic identity for generated multiplicative candidates.
// No floating-point comparisons or unverified named-constant identities.

function stripRootAction(expression) {
  const text = String(expression).trim();
  if (!text.startsWith('(')) return [text, ''];

  let depth = 0;

  for (let i = 0; i < text.length; i++) {
    if (text[i] === '(') depth++;
    if (text[i] === ')') depth--;

    if (depth === 0) {
      const suffix = text.slice(i + 1);

      if (suffix.startsWith('*(') && suffix.endsWith(')')) {
        return [text.slice(1, i), suffix];
      }
      break;
    }
  }

  return [text, ''];
}

function gcdBigInt(a, b) {
  while (b !== 0n) {
    [a, b] = [b, a % b];
  }
  return a;
}

function squarefree(n) {
  let square = 1;
  let remaining = n;

  for (let d = 2; d * d <= remaining; d++) {
    while (remaining % (d * d) === 0) {
      square *= d;
      remaining /= d * d;
    }
  }

  return [square, remaining];
}

export function canonicalCandidateKey(expression) {
  const [base, rootSuffix] = stripRootAction(expression);

  const match =
    /^(-?)([^/()]+)(?:\/(?:\(([^()]*)\)|([^/()]+)))?$/
      .exec(base);

  if (!match) return `raw:${expression}`;

  let numerator = 1n;
  let denominator = 1n;
  let radicand = 1;

  // Exact exponent arithmetic: sixths represent integers,
  // half-powers and cube-root powers without floating point.
  const powers = new Map();

  const addPower = (name, sixths) => {
    powers.set(
      name,
      (powers.get(name) || 0) + sixths
    );
  };

  function consume(atom, direction) {
    if (/^[1-9]\d*$/.test(atom)) {
      const n = BigInt(atom);

      if (direction > 0) numerator *= n;
      else denominator *= n;

      return true;
    }

    const radical = /^sqrt_([1-9]\d*)$/.exec(atom);

    if (radical) {
      const n = Number(radical[1]);

      if (!Number.isSafeInteger(n) || n > 1000000) {
        return false;
      }

      const [square, free] = squarefree(n);

      if (direction > 0) {
        numerator *= BigInt(square);
      } else {
        denominator *= BigInt(square * free);
      }

      if (!Number.isSafeInteger(radicand * free)) {
        return false;
      }

      radicand *= free;

      const [extra, newFree] = squarefree(radicand);
      numerator *= BigInt(extra);
      radicand = newFree;

      return true;
    }

    const named =
      /^([A-Za-z_][A-Za-z_0-9]*)(?:\^([1-9]\d*|0\.5|0\.3333333333333333))?$/
        .exec(atom);

    if (!named) return false;

    const exponent = named[2] || '1';

    let sixths;

    if (exponent === '0.5') {
      sixths = 3;
    } else if (exponent === '0.3333333333333333') {
      sixths = 2;
    } else {
      const n = Number(exponent);

      if (!Number.isSafeInteger(n) || n > 1000000) {
        return false;
      }

      sixths = 6 * n;
    }

    sixths *= direction;

    // Exact identity: zeta(2) = pi^2 / 6.
    // Apply it only to integral powers.
    if (
      named[1] === 'zeta_2' &&
      sixths % 6 === 0
    ) {
      const n = sixths / 6;

      addPower('pi', 12 * n);

      const factor = 6n ** BigInt(Math.abs(n));

      if (n > 0) {
        denominator *= factor;
      } else {
        numerator *= factor;
      }
    } else {
      addPower(named[1], sixths);
    }

    return true;
  }

  const top = match[2].split('*');

  const bottom = (match[3] || match[4] || '')
    .split('*')
    .filter(Boolean);

  for (const atom of top) {
    if (!consume(atom, 1)) {
      return `raw:${expression}`;
    }
  }

  for (const atom of bottom) {
    if (!consume(atom, -1)) {
      return `raw:${expression}`;
    }
  }

  const divisor = gcdBigInt(numerator, denominator);

  numerator /= divisor;
  denominator /= divisor;

  const symbolic = [...powers.entries()]
    .filter(([, power]) => power !== 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, power]) => `${name}:${power}`)
    .join(',');

  return (
    `${match[1]}|${numerator}/${denominator}` +
    `|sqrt:${radicand}` +
    `|${symbolic}` +
    `|${rootSuffix}`
  );
}
