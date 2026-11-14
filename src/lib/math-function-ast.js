// Structural mathematical parser for the Function Geometry Explorer.
// No eval(), Function(), or arbitrary JavaScript execution.

export const FUNCTION_REGISTRY = Object.freeze({
  sin: [1], cos: [1], tan: [1],
  cot: [1], sec: [1], csc: [1],
  sinh: [1], cosh: [1], tanh: [1],
  coth: [1], csch: [1], sech: [1],

  asin: [1, ['arcsin']],
  acos: [1, ['arccos']],
  atan: [1, ['arctan']],
  asinh: [1, ['arcsinh']],
  acosh: [1, ['arccosh']],
  atanh: [1, ['arctanh']],

  exp: [1],
  log: [[1, 2], ['ln']],
  log2: [1],
  log10: [1],
  sqrt: [1],

  gamma: [1],
  psi: [1, ['digamma']],
  zeta: [1],
  li2: [1, ['dilog']],
  beta: [2],
  erf: [1],
  erfc: [1],
  ai: [1],

  abs: [1],
  arg: [1],
  conj: [1],
  re: [1],
  im: [1],
  root: [2],
  pow: [2],
  lambertw: [[1, 2], ['productlog', 'W', 'LambertW']],});

const aliases = new Map();

for (const [canonical, [, names = []]] of
  Object.entries(FUNCTION_REGISTRY)) {
  aliases.set(canonical.toLowerCase(), canonical);

  for (const name of names) {
    aliases.set(name.toLowerCase(), canonical);
  }
}

export const resolveFunction = name =>
  aliases.get(String(name).toLowerCase());

export function parseMathFunction(source) {
  const text = String(source ?? '')
    .trim()
    .replace(/^f\s*\(\s*z\s*\)\s*=/i, '');

  if (!text || text.length > 2400) {
    throw Error('Enter a function of z (up to 2400 characters).');
  }

  const tokens = [];
  let i = 0;

  const op = value => tokens.push({ type: 'op', value });
  const word = value => tokens.push({ type: 'word', value });

  function command() {
    i++;
    const match = /^[A-Za-z]+/.exec(text.slice(i));

    if (!match) {
      const c = text[i++];

      if (',;! '.includes(c)) return;

      throw Error(`Unsupported LaTeX escape \\${c}.`);
    }

    const c = match[0];
    i += c.length;

    if ([
      'left', 'right', 'big', 'Big', 'bigl', 'bigr',
      'quad', 'qquad'
    ].includes(c)) return;

    if (['cdot', 'times'].includes(c)) return op('*');
    if (c === 'div') return op('/');

    if (['frac', 'dfrac', 'tfrac'].includes(c)) {
      return op('@frac');
    }

    if (c === 'sqrt') return op('@sqrt');

    if (['operatorname', 'mathrm', 'text'].includes(c)) {
      return op('@name');
    }

    if (c === 'mathbin') return op('@mathbin');
    if ([
      'lvert', 'rvert', 'vert',
      'lVert', 'rVert', 'Vert'
    ].includes(c)) return op('|');

    if (c === 'pi') return word('pi');

    if (c === 'infty') {
      throw Error('Infinity is not a finite complex constant.');
    }

    if (resolveFunction(c)) return word(c);

    throw Error(`Unsupported mathematical command \\${c}.`);
  }

  while (i < text.length) {
    const ch = text[i];

    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    if (ch === '\\') {
      command();
      continue;
    }

    if ('(){}[]+-*/^_,|'.includes(ch)) {
      op(ch);
      i++;
      continue;
    }

    if ('−–'.includes(ch)) {
      op('-');
      i++;
      continue;
    }

    if ('×·'.includes(ch)) {
      op('*');
      i++;
      continue;
    }

    if (ch === '÷') {
      op('/');
      i++;
      continue;
    }

    if (ch === 'π' || ch === 'Γ') {
      word(ch === 'π' ? 'pi' : 'gamma');
      i++;
      continue;
    }

    if (ch === '²' || ch === '³') {
      op('^');
      tokens.push({
        type: 'number',
        value: ch === '²' ? 2 : 3
      });
      i++;
      continue;
    }

    const number =
      /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/
        .exec(text.slice(i));

    if (number) {
      tokens.push({
        type: 'number',
        value: Number(number[0])
      });
      i += number[0].length;
      continue;
    }

    const identifier =
      /^[A-Za-z][A-Za-z_0-9]*/.exec(text.slice(i));

    if (identifier) {
      word(identifier[0]);
      i += identifier[0].length;
      continue;
    }

    throw Error(
      `Unsupported symbol '${ch}' at position ${i + 1}.`
    );
  }

  tokens.push({ type: 'end', value: '<end>' });

  if (tokens.length > 650) {
    throw Error('Expression has too many terms.');
  }

  let p = 0;

  const peek = () => tokens[p];

  const accept = value => {
    if (peek().value !== value) return false;
    p++;
    return true;
  };

  const expect = value => {
    if (!accept(value)) {
      throw Error(
        `Expected '${value}' near '${peek().value}'.`
      );
    }
  };

  const startsFactor = token =>
    token.type === 'number' ||
    token.type === 'word' ||
    ['(', '{', '[', '@frac', '@sqrt', '@name']
      .includes(token.value);

  const binary = (symbol, a, b) => ({
    type: 'binary',
    op: symbol,
    left: a,
    right: b
  });

  function requiredGroup() {
    const opening = peek().value;

    if (!['{', '('].includes(opening)) {
      throw Error('Expected a grouped mathematical argument.');
    }

    p++;

    const result = expression();
    expect(opening === '{' ? '}' : ')');

    return result;
  }

  function expression(minimum = 0) {
    let left;
    const item = peek();

    if (accept('+')) {
      left = expression(25);
    } else if (accept('-')) {
      left = {
        type: 'unary',
        op: '-',
        arg: expression(25)
      };
    } else if (accept('|')) {
      const inside = expression();
      expect('|');

      left = {
        type: 'call',
        name: 'abs',
        args: [inside]
      };
    } else if (item.type === 'number') {
      p++;
      left = {
        type: 'number',
        value: item.value
      };
    } else if (['(', '{', '['].includes(item.value)) {
      p++;

      const closing = {
        '(': ')',
        '{': '}',
        '[': ']'
      }[item.value];

      left = expression();
      expect(closing);
    } else if (accept('@frac')) {
      left = binary(
        '/',
        requiredGroup(),
        requiredGroup()
      );
    } else if (accept('@sqrt')) {
      if (accept('[')) {
        const degree = expression();
        expect(']');

        left = {
          type: 'call',
          name: 'root',
          args: [requiredGroup(), degree]
        };
      } else {
        left = {
          type: 'call',
          name: 'sqrt',
          args: [requiredGroup()]
        };
      }
    } else if (
      item.type === 'word' ||
      item.value === '@name'
    ) {
      let name;

      if (accept('@name')) {
        expect('{');

        if (peek().type !== 'word') {
          throw Error('Expected function name.');
        }

        name = peek().value;
        p++;
        expect('}');
      } else {
        p++;
        name = item.value;
      }

      if (name.toLowerCase() === 'li' && accept('_')) {
        const braced = accept('{');

        if (peek().value !== 2) {
          throw Error('Only Li_2 is supported currently.');
        }

        p++;

        if (braced) expect('}');
        name = 'li2';
      }

      const canonical = resolveFunction(name);

      if (
        canonical &&
        ['(', '{'].includes(peek().value)
      ) {
        const closing = accept('(')
          ? ')'
          : (expect('{'), '}');

        const args = [];

        if (peek().value !== closing) {
          do {
            args.push(expression());
          } while (accept(','));
        }

        expect(closing);

        left = {
          type: 'call',
          name: canonical,
          args
        };
      } else if (
        name.toLowerCase() === 'z' ||
        ['pi', 'e', 'i'].includes(name.toLowerCase())
      ) {
        left = {
          type: 'symbol',
          name: name.toLowerCase()
        };
      } else if (canonical) {
        throw Error(
          `Function '${name}' needs parentheses and arguments.`
        );
      } else {
        throw Error(
          `Unknown function or constant '${name}'.`
        );
      }
    } else {
      throw Error(`Unexpected '${item.value}'.`);
    }

    while (true) {
      const next = peek();
      let symbol;
      let leftPower;
      let rightPower;
      let implicit = false;

      if (next.value === '^') {
        symbol = '^';
        leftPower = 40;
        rightPower = 40;
      } else if (
        next.value === '*' ||
        next.value === '/'
      ) {
        symbol = next.value;
        leftPower = 20;
        rightPower = 21;
      } else if (
        next.value === '+' ||
        next.value === '-'
      ) {
        symbol = next.value;
        leftPower = 10;
        rightPower = 11;
      } else if (next.value === '@mathbin') {
        if (20 < minimum) break;

        p++;
        expect('{');
        expect('/');
        expect('}');

        left = binary(
          '/',
          left,
          expression(21)
        );

        continue;
      } else if (startsFactor(next)) {
        symbol = '*';
        leftPower = 20;
        rightPower = 21;
        implicit = true;
      } else {
        break;
      }

      if (leftPower < minimum) break;

      if (!implicit) p++;

      left = binary(
        symbol,
        left,
        expression(rightPower)
      );
    }

    return left;
  }

  const ast = expression();

  if (peek().type !== 'end') {
    throw Error(`Unexpected '${peek().value}'.`);
  }

  return ast;
}

export function printMathFunction(ast) {
  switch (ast.type) {
    case 'number':
      return String(ast.value);

    case 'symbol':
      return ast.name;

    case 'unary':
      return `(-${printMathFunction(ast.arg)})`;

    case 'binary':
      return (
        `(${printMathFunction(ast.left)}` +
        `${ast.op}${printMathFunction(ast.right)})`
      );

    case 'call':
      return (
        `${ast.name}(` +
        ast.args.map(printMathFunction).join(',') +
        ')'
      );

    default:
      throw Error('Unknown expression tree node.');
  }
}
