// Rendu Markdown + formules LaTeX (KaTeX) des réponses.

const TOKEN_RE =
  /(```[\s\S]*?(?:```|$)|`[^`\n]*`)|\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$(?![\s$])((?:\\.|[^$\\\n])+?)(?<!\s)\$(?!\d)/g;

// Remplace les formules par des marqueurs pour que le Markdown ne les abîme
// pas (les _ et * des formules seraient pris pour de l'italique).
// Le code (``` et `) est laissé tel quel.
export function extractMath(src) {
  const math = [];
  const text = src.replace(TOKEN_RE, (match, code, block, bracket, paren, inline) => {
    if (code !== undefined) return match;
    const display = block !== undefined || bracket !== undefined;
    math.push({ tex: (block ?? bracket ?? paren ?? inline).trim(), display });
    return `\u0000M${math.length - 1}\u0000`;
  });
  return { text, math };
}

const KATEX_MACROS = {
  "\\R": "\\mathbb{R}",
  "\\N": "\\mathbb{N}",
  "\\Z": "\\mathbb{Z}",
  "\\Q": "\\mathbb{Q}",
  "\\C": "\\mathbb{C}",
};

function renderMath({ tex, display }) {
  try {
    return window.katex.renderToString(tex, {
      displayMode: display,
      throwOnError: false,
      macros: { ...KATEX_MACROS },
    });
  } catch {
    const el = document.createElement("code");
    el.textContent = tex;
    return el.outerHTML;
  }
}

export function renderMarkdown(src) {
  const { text, math } = extractMath(src);
  const rendered = math.map(renderMath);
  const html = window.marked.parse(text, { gfm: true, breaks: false });
  const withMath = html.replace(/\u0000M(\d+)\u0000/g, (_, i) => rendered[Number(i)] ?? "");
  return window.DOMPurify.sanitize(withMath, {
    ADD_TAGS: ["semantics", "annotation", "math", "mrow", "mi", "mo", "mn", "msup", "msub", "mfrac", "msqrt", "mtext", "mspace", "mover", "munder", "mtable", "mtr", "mtd", "mstyle", "mpadded", "mphantom", "menclose", "mroot", "munderover", "msubsup"],
    ADD_ATTR: ["encoding", "aria-hidden"],
  });
}

// Retire d'éventuelles balises ``` autour d'un document LaTeX.
export function cleanLatex(src) {
  let tex = src.trim();
  const fenced = tex.match(/^```(?:latex|tex)?\s*\n([\s\S]*?)(?:\n```\s*)?$/);
  if (fenced) tex = fenced[1];
  return tex.trim();
}
