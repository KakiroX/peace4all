// A tiny, safe arithmetic evaluator for numeric answers.
// Accepts things like: 3000, 3.0e3, 3.0×10^3, 3.0x10^3, 7/9, 3e, 2pi, sqrt(3)/2, 1.0×10⁵,
// "100,000", "0,5" and trailing units ("3000 N", "36%", "10 rad s⁻¹").

type Token =
  | { t: "num"; v: number; pos: number }
  | { t: "id"; v: string; pos: number }
  | { t: "op"; v: string; pos: number };

const CONSTANTS: Record<string, number> = { pi: Math.PI, "π": Math.PI, e: Math.E };
const FUNCTIONS: Record<string, (x: number) => number> = {
  sqrt: Math.sqrt,
  "√": Math.sqrt,
  ln: Math.log,
  log: Math.log10,
  abs: Math.abs,
};

const SUPERSCRIPTS: Record<string, string> = {
  "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4",
  "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁻": "-", "⁺": "+",
};

class ParseError extends Error {
  constructor(message: string, public pos: number) {
    super(message);
  }
}

function normalize(input: string): string {
  let s = input.trim();
  // Unicode operators → ASCII.
  s = s.replace(/[×·⋅∗]/g, "*").replace(/÷/g, "/").replace(/[−–—]/g, "-");
  // "3.2 x 10^5" / "3.2X10^5" → "3.2*10^5"
  s = s.replace(/(\d)\s*[xX]\s*(10\s*(\^|\*\*|[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]))/g, "$1*$2");
  s = s.replace(/\*\*/g, "^");
  // Superscript runs → ^(…)
  s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]+/g, (run) => `^(${[...run].map((c) => SUPERSCRIPTS[c]).join("")})`);
  // Thousands separators: 100,000 or 1,234,567.89
  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?/.test(s)) s = s.replace(/(\d),(?=\d{3}\b)/g, "$1");
  // Decimal comma: "0,5" → "0.5" (only when there is no dot at all)
  if (!s.includes(".")) s = s.replace(/(\d),(\d)/g, "$1.$2");
  // Thin/normal spaces between digit groups: "100 000" → "100000"
  s = s.replace(/(\d)[\s  ](?=\d{3}\b)/g, "$1");
  return s;
}

function tokenize(s: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    const num = /^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(s.slice(i));
    if (num) {
      tokens.push({ t: "num", v: parseFloat(num[0]), pos: i });
      i += num[0].length;
      continue;
    }
    if ("+-*/^()".includes(c)) {
      tokens.push({ t: "op", v: c, pos: i });
      i++;
      continue;
    }
    if (c === "π" || c === "√") {
      tokens.push({ t: "id", v: c, pos: i });
      i++;
      continue;
    }
    const id = /^[a-zA-Z]+/.exec(s.slice(i));
    if (id) {
      tokens.push({ t: "id", v: id[0].toLowerCase(), pos: i });
      i += id[0].length;
      continue;
    }
    throw new ParseError(`Unexpected "${c}"`, i);
  }
  return tokens;
}

function parseTokens(tokens: Token[]): number {
  let p = 0;
  const peek = () => tokens[p];
  const isOp = (v: string) => peek()?.t === "op" && peek()!.v === v;

  function expr(): number {
    let v = term();
    while (isOp("+") || isOp("-")) {
      const op = tokens[p++].v;
      const r = term();
      v = op === "+" ? v + r : v - r;
    }
    return v;
  }

  function startsAtom(tok: Token | undefined): boolean {
    if (!tok) return false;
    return tok.t === "num" || tok.t === "id" || (tok.t === "op" && tok.v === "(");
  }

  function term(): number {
    let v = unary();
    for (;;) {
      if (isOp("*") || isOp("/")) {
        const op = tokens[p++].v;
        const r = unary();
        v = op === "*" ? v * r : v / r;
      } else if (startsAtom(peek())) {
        v *= power(); // implicit multiplication: 2pi, 3e, 2(1+1)
      } else {
        return v;
      }
    }
  }

  function unary(): number {
    if (isOp("-")) {
      p++;
      return -unary();
    }
    if (isOp("+")) {
      p++;
      return unary();
    }
    return power();
  }

  function power(): number {
    const base = atom();
    if (isOp("^")) {
      p++;
      return Math.pow(base, unary());
    }
    return base;
  }

  function atom(): number {
    const tok = tokens[p];
    if (!tok) throw new ParseError("Unexpected end", Infinity);
    if (tok.t === "num") {
      p++;
      return tok.v;
    }
    if (tok.t === "op" && tok.v === "(") {
      p++;
      const v = expr();
      if (!isOp(")")) throw new ParseError("Missing )", tokens[p]?.pos ?? Infinity);
      p++;
      return v;
    }
    if (tok.t === "id") {
      if (tok.v in FUNCTIONS) {
        p++;
        // allow both sqrt(3) and √3
        return FUNCTIONS[tok.v](isOp("(") ? atom() : power());
      }
      if (tok.v in CONSTANTS) {
        p++;
        return CONSTANTS[tok.v];
      }
      throw new ParseError(`Unknown "${tok.v}"`, tok.pos);
    }
    throw new ParseError(`Unexpected "${tok.v}"`, tok.pos);
  }

  const value = expr();
  if (p < tokens.length) throw new ParseError("Unexpected input", tokens[p].pos);
  return value;
}

function evaluate(s: string): number {
  return parseTokens(tokenize(s));
}

/**
 * Parse a learner's numeric answer. Returns null if it can't be read.
 * Trailing units are ignored: if the full string fails, we retry with everything
 * from the first unrecognised word/symbol onwards removed.
 */
export function parseNumericAnswer(input: string): number | null {
  const s = normalize(input);
  if (!s) return null;
  try {
    const v = evaluate(s);
    return Number.isFinite(v) ? v : null;
  } catch (err) {
    if (!(err instanceof ParseError) || !Number.isFinite(err.pos) || err.pos === 0) return null;
    const prefix = s.slice(0, err.pos).trim();
    if (!prefix) return null;
    try {
      const v = evaluate(prefix);
      return Number.isFinite(v) ? v : null;
    } catch {
      return null;
    }
  }
}
