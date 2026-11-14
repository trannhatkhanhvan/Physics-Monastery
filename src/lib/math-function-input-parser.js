import {
  parseMathFunction,
  printMathFunction
} from './math-function-ast';

export function normalizeMathFunction(source) {
  return printMathFunction(parseMathFunction(source));
}

// Convert complete built-up fractions to inline division.
// Balanced brace scanning preserves nested grouping.
// Incomplete expressions remain unchanged.
export function inlineDivisionLatex(latex) {
  const source = String(latex ?? '');
  let index = 0;

  const whitespace = () => {
    while (index < source.length &&
           /\s/.test(source[index])) index++;
  };

  function parse(close = null) {
    let out = '';

    while (index < source.length) {
      if (close && source[index] === close) {
        index++;
        return out;
      }

      if (source[index] === '\\') {
        const cmd = /^\\(?:frac|dfrac|tfrac)(?![A-Za-z])/
          .exec(source.slice(index));

        if (cmd) {
          index += cmd[0].length;
          whitespace();

          if (source[index] !== '{') {
            out += cmd[0];
            continue;
          }

          index++;
          const numerator = parse('}');
          whitespace();

          if (source[index] !== '{') {
            out += cmd[0] + '{' + numerator + '}';
            continue;
          }

          index++;
          const denominator = parse('}');

          const simple =
            /^(?:\d+(?:\.\d+)?|[a-zA-Z]|\\[a-zA-Z]+)$/;

          const wrap = part =>
            simple.test(part)
              ? part
              : String.raw`\left(` + part +
                String.raw`\right)`;

          out += wrap(numerator) +
                 String.raw`\mathbin{/}` +
                 wrap(denominator);

          continue;
        }

        const control = /^\\(?:[A-Za-z]+|.)/
          .exec(source.slice(index));

        if (control) {
          out += control[0];
          index += control[0].length;
          continue;
        }
      }

      if (source[index] === '{') {
        index++;
        out += '{' + parse('}') + '}';
        continue;
      }

      out += source[index++];
    }

    if (close) throw Error('Incomplete mathematical group');
    return out;
  }

  try {
    return parse();
  } catch {
    return source;
  }
}
