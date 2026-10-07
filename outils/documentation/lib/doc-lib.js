// =====================================================================
// doc-lib.js — bibliothèque commune des dossiers PDF du portfolio
// =====================================================================
// Produit un .docx (docx-js 9.x) à l'identité visuelle des dossiers :
// IBM Plex Sans / Condensed / Mono, encre #12161C, accent #E8572A,
// couverture pleine page, fiche « En bref », sommaire, parties A, B, C…
//
// Usage dans projets/<projet>/contenu.js :
//
//   const path = require('path');
//   const { createDoc } = require('../../lib/doc-lib');
//   const d = createDoc({ maskIps: true, imgDir: path.join(__dirname, 'img'), header: {…}, footer: '…', meta: {…} });
//   d.cover({…});  d.enBref({…});
//   d.add(d.partOpener('A', 'Titre', 'Description'), d.h1(1, 'Titre'), d.P('Texte'));
//   d.render();   // lit <sortie.docx> et --pages <pages.json> sur la ligne de commande
//
// Le fichier .docx écrit est « brut » : generer.sh l'enrichit ensuite
// (polices embarquées, numéros de page du sommaire) avec embed_fonts.py.
// Voir README.md pour la description de chaque bloc.
// =====================================================================
const fs = require('fs');
const path = require('path');
const docx = require('docx');

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun, Header, Footer,
  AlignmentType, WidthType, BorderStyle, ShadingType, HeadingLevel, LevelFormat, PageNumber,
  TabStopType, Tab, Bookmark, InternalHyperlink, ExternalHyperlink, VerticalAlign,
  HorizontalPositionRelativeFrom, VerticalPositionRelativeFrom, TextWrappingType, TableLayoutType,
  LineRuleType,
} = docx;

// ---------- Jetons de design (identiques pour tous les dossiers) ----------
const F = 'IBM Plex Sans';
const F_SB = 'IBM Plex Sans SmBld';   // IBM Plex Sans SemiBold (nom court, embarqué par embed_fonts.py)
const F_COND = 'IBM Plex Sans Cond';  // IBM Plex Sans Condensed Bold : titres
const MONO = 'IBM Plex Mono';
const C = {
  ink: '12161C', text: '2B323B', mut: '6B7480', line: 'DDE1E6', tint: 'F3F4F6', acc: 'E8572A',
  accSoft: 'F59A75', ok: '23946A', okTint: 'EAF5EF', warn: 'B7770C', warnTint: 'FDF4E3',
  noteTint: 'F1F3F5', code: '12161C', codeFg: 'E4E7EB', codeCom: '7F8995', white: 'FFFFFF',
  coverMut: '8B95A1', coverSub: 'C4CAD2',
};
const PAGE_W = 11906, PAGE_H = 16838, MX = 1250; // A4, marges latérales (twips)
const CW = PAGE_W - 2 * MX; // largeur utile (twips)
const PX = Math.round(CW / 15); // largeur utile en px à 96 dpi (largeur des figures)

const NONE = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const noBorders = { top: NONE, bottom: NONE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE };

// Mots-clés colorés dans les blocs de code
const SQL_KW = /\b(CREATE|DATABASE|CHARACTER|SET|COLLATE|USER|IDENTIFIED|BY|GRANT|ALL|PRIVILEGES|ON|TO|GLOBAL|QUIT)\b/g;
const CMD = /^(\s*)(sudo|wget|dpkg|zcat|snmpwalk|ping|ip|systemctl|apt-get|apt|cd|ls|cat|nano|cp|mv|rm|mkdir|chmod|chown|ssh|scp|curl|git|docker|journalctl|ufw|iptables|nft|ss|traceroute|tracert|nslookup|dig|ipconfig|ifconfig|netstat|netsh|arp|route|hostnamectl|useradd|usermod|passwd|mount|(?:Get|Set|New|Remove|Add|Install|Test|Enable|Disable|Import|Export|Restart|Start|Stop)-[A-Za-z]+)\b(.*)$/;

// ---------- Masquage des adresses IPv4 internes ----------
// Garde les deux premiers octets et remplace la suite par x.x (ex. 10.20.30.40 -> 10.20.x.x).
// Une plage 172.x hors RFC 1918 (172.16 à 172.31) est masquée d'un octet de plus (172.x.x.x).
// Ne touche ni aux OID (1.3.6.1.4.1…), ni aux numéros de version (7.4), ni aux adresses déjà masquées,
// ni aux masques de sous-réseau (255.255.255.0), ni aux résolveurs DNS publics connus (1.1.1.1…).
const IPV4 = /(?<![\d.])(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?![\d.])/g;
const PUBLIC_IPS = new Set(['0.0.0.0', '1.1.1.1', '1.0.0.1', '8.8.8.8', '8.8.4.4', '9.9.9.9', '149.112.112.112']);
const isNetmask = (o) => {
  if (o.some((x) => x > 255)) return false;
  const n = ((o[0] << 24) | (o[1] << 16) | (o[2] << 8) | o[3]) >>> 0;
  const inv = ~n >>> 0;
  return n !== 0 && ((inv + 1) & inv) >>> 0 === 0; // uns contigus puis zéros (255.255.255.0, 255.255.254.0…)
};
const keepIPv4 = (m, o) => PUBLIC_IPS.has(m) || isNetmask(o);
const maskIPv4 = (s) => String(s).replace(IPV4, (m, a, b, c, d) => {
  if (keepIPv4(m, [a, b, c, d].map(Number))) return m;
  return a === '172' && !(+b >= 16 && +b <= 31) ? `${a}.x.x.x` : `${a}.${b}.x.x`;
});

function createDoc(opts = {}) {
  const {
    maskIps = true, // sûr par défaut : un dépôt public ne doit jamais publier un adressage interne réel
    imgDir,
    header: hd = {},
    footer: ft = '',
    meta = {},
    publication = '', // nom du PDF copié dans le site (src/assets/docs/) par generer.sh ; vide = pas de copie
  } = opts;
  if (!imgDir) throw new Error('createDoc : imgDir est obligatoire (dossier des PNG du projet)');

  const mask = (s) => (maskIps ? maskIPv4(s) : s);
  const IMG = (n) => fs.readFileSync(path.join(imgDir, n));
  // TextRun dont le texte passe par mask() : filet de sécurité appliqué à tous les textes.
  const T = (text, o = {}) => new TextRun({ ...o, text: mask(text ?? '') });

  // ---------- État du document ----------
  const toc = []; // {anchor, num, title} ou {part, letter, title}
  const body = [];
  let coverChildren = null;
  let enBrefChildren = [];
  let pages = {};
  let figN = 0;
  let stepInstance = 0;
  const add = (...xs) => xs.forEach((x) => (Array.isArray(x) ? body.push(...x) : body.push(x)));

  // ---------- Texte enrichi : `code` et **gras** ----------
  function rich(text, o = {}) {
    const runs = [];
    const re = /(`[^`]+`|\*\*[^*]+\*\*)/g;
    let last = 0, m;
    const base = { font: o.font || F, size: o.size || 20, color: o.color || C.text, bold: o.bold, italics: o.italics };
    const push = (t, extra = {}) => t && runs.push(new TextRun({ ...base, ...extra, text: mask(t) }));
    while ((m = re.exec(text))) {
      push(text.slice(last, m.index));
      const tok = m[0];
      if (tok.startsWith('`')) push(tok.slice(1, -1), { font: MONO, size: Math.round((o.size || 20) * 0.9), color: o.codeColor || C.ink, shading: o.noShade ? undefined : { type: ShadingType.CLEAR, color: 'auto', fill: C.tint } });
      else push(tok.slice(2, -2), { font: F_SB, color: o.strongColor || C.ink });
      last = m.index + tok.length;
    }
    push(text.slice(last));
    return runs;
  }

  // Paragraphe courant. Un texte qui finit par « : » reste collé au bloc suivant.
  const P = (text, o = {}) => new Paragraph({
    children: rich(text, o),
    spacing: { before: o.before ?? 0, after: o.after ?? 140, line: o.line ?? 300, lineRule: LineRuleType.AUTO },
    alignment: o.align,
    keepNext: o.keepNext ?? /:\s*$/.test(text),
    indent: o.indent,
  });
  const spacer = (h = 120) => new Paragraph({ children: [], spacing: { before: 0, after: 0, line: h, lineRule: LineRuleType.EXACT } });

  // ---------- Titres ----------
  function partOpener(letter, title, desc) {
    toc.push({ part: true, letter, title });
    return [
      new Paragraph({
        pageBreakBefore: letter === 'A',
        keepNext: true,
        spacing: { before: letter === 'A' ? 0 : 720, after: 80 },
        children: [T(`PARTIE ${letter}`, { font: MONO, bold: true, size: 16, color: C.acc, characterSpacing: 60 })],
      }),
      new Paragraph({
        keepNext: true,
        spacing: { before: 0, after: 100, line: 640, lineRule: LineRuleType.AT_LEAST },
        children: [T(title, { font: F_COND, bold: true, size: 56, color: C.ink })],
      }),
      new Paragraph({
        keepNext: true,
        spacing: { before: 0, after: 200, line: 300, lineRule: LineRuleType.AUTO },
        border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: C.ink, space: 14 } },
        children: rich(desc, { size: 21, color: C.mut }),
      }),
    ];
  }

  function h1(num, title) {
    const anchor = `sec${num}`;
    toc.push({ anchor, num, title });
    return new Paragraph({
      heading: HeadingLevel.HEADING_1,
      tabStops: [{ type: TabStopType.LEFT, position: 760 }],
      indent: { left: 760, hanging: 760 },
      children: [new Bookmark({
        id: anchor,
        children: [
          T(String(num).padStart(2, '0'), { font: MONO, bold: true, size: 24, color: C.acc }),
          new TextRun({ children: [new Tab()] }),
          T(title),
        ],
      })],
    });
  }

  function h2(num, title) {
    return new Paragraph({
      heading: HeadingLevel.HEADING_2,
      tabStops: [{ type: TabStopType.LEFT, position: 760 }],
      indent: { left: 760, hanging: 760 },
      children: [
        T(num, { font: MONO, size: 18, color: C.acc, bold: true }),
        new TextRun({ children: [new Tab()] }),
        T(title),
      ],
    });
  }

  // Titre de niveau 1 sans numéro (« — »), pour les références ou une annexe en fin de dossier.
  function annexe(title, anchor = 'refs') {
    toc.push({ anchor, num: 'R', title });
    return new Paragraph({
      heading: HeadingLevel.HEADING_1,
      tabStops: [{ type: TabStopType.LEFT, position: 760 }],
      children: [new Bookmark({ id: anchor, children: [T('—', { font: MONO, bold: true, size: 24, color: C.acc }), new TextRun({ children: [new Tab()] }), T(title)] })],
    });
  }

  // ---------- Listes ----------
  const bullets = (items, o = {}) => items.map((t) => new Paragraph({
    numbering: { reference: 'bul', level: 0 },
    spacing: { before: 0, after: 70, line: 290, lineRule: LineRuleType.AUTO },
    children: rich(t, o),
  }));
  function steps(items) {
    stepInstance += 1;
    return items.map((t) => new Paragraph({
      numbering: { reference: 'steps', level: 0, instance: stepInstance },
      spacing: { before: 0, after: 80, line: 290, lineRule: LineRuleType.AUTO },
      children: rich(t),
    }));
  }
  // Liste de liens : [['Libellé', 'https://…'], …]
  const liens = (items) => items.map(([l, u]) => new Paragraph({
    numbering: { reference: 'bul', level: 0 },
    spacing: { before: 0, after: 70, line: 290, lineRule: LineRuleType.AUTO },
    children: [
      T(`${l} — `, { font: F_SB, size: 19, color: C.ink }),
      new ExternalHyperlink({ link: u, children: [T(u, { font: MONO, size: 15, color: C.acc, underline: {} })] }),
    ],
  }));

  // ---------- Blocs de code ----------
  function codeLine(line, lang) {
    const base = { font: MONO, size: 17, color: C.codeFg };
    if (!line) return [new TextRun({ ...base, text: ' ' })];
    if (/^\s*#/.test(line)) return [T(line, { ...base, color: C.codeCom })];
    if (lang === 'logique') {
      const out = [];
      line.split(/(\bSI\b|\bET\b|\bOU\b|\bALORS\b|→)/).forEach((t) => {
        if (!t) return;
        if (t === '→') out.push(T(t, { ...base, color: C.ok, bold: true }));
        else if (/^(SI|ET|OU|ALORS)$/.test(t)) out.push(T(t, { ...base, color: C.accSoft, bold: true }));
        else out.push(T(t, base));
      });
      return out;
    }
    if (lang === 'sql') {
      const out = []; let last = 0, m; SQL_KW.lastIndex = 0;
      while ((m = SQL_KW.exec(line))) {
        if (m.index > last) out.push(T(line.slice(last, m.index), base));
        out.push(T(m[0], { ...base, color: C.accSoft }));
        last = m.index + m[0].length;
      }
      if (last < line.length) out.push(T(line.slice(last), base));
      return out;
    }
    if (lang === 'conf') {
      const m = line.match(/^([^=]+)(=)(.*)$/);
      if (m) return [T(m[1], { ...base, color: C.accSoft }), T(m[2], { ...base, color: C.codeCom }), T(m[3], base)];
    }
    const m = line.match(CMD);
    if (m) return [T(m[1], base), T(m[2], { ...base, color: C.accSoft }), T(m[3], base)];
    return [T(line, base)];
  }
  // lang : bash, powershell, conf (clé=valeur), sql, logique (SI / ET / ALORS / →), oid… ; title : légende du bloc
  function code(lang, lines, title) {
    const label = new Paragraph({
      spacing: { before: 0, after: 100 },
      children: [
        T(lang.toUpperCase(), { font: MONO, bold: true, size: 14, color: C.accSoft, characterSpacing: 40 }),
        ...(title ? [T(`   ${title}`, { font: MONO, size: 14, color: C.codeCom })] : []),
      ],
    });
    const lns = lines.map((l) => new Paragraph({ spacing: { before: 0, after: 0, line: 270, lineRule: LineRuleType.AUTO }, indent: { left: 360, hanging: 360 }, children: codeLine(l, lang) }));
    return [boxTable([label, ...lns], { fill: C.code, margins: { top: 170, bottom: 190, left: 260, right: 260 } }), spacer(200)];
  }

  // ---------- Encadrés ----------
  // Tableau d'une seule cellule (fond, bordures, marges) ; par défaut il ne se coupe pas entre deux pages.
  function boxTable(children, { fill, borders, margins, split = false } = {}) {
    return new Table({
      width: { size: CW, type: WidthType.DXA },
      columnWidths: [CW],
      borders: noBorders,
      layout: TableLayoutType.FIXED,
      rows: [new TableRow({
        cantSplit: !split,
        children: [new TableCell({
          width: { size: CW, type: WidthType.DXA },
          shading: fill ? { type: ShadingType.CLEAR, color: 'auto', fill } : undefined,
          borders: borders || { top: NONE, bottom: NONE, left: NONE, right: NONE },
          margins: margins || { top: 160, bottom: 160, left: 260, right: 260 },
          children,
        })],
      })],
    });
  }
  // kind : note (gris), warn (ambre), ok (vert)
  function callout(kind, label, text) {
    const k = { note: [C.ink, C.noteTint], warn: [C.warn, C.warnTint], ok: [C.ok, C.okTint] }[kind];
    if (!k) throw new Error(`callout : type inconnu « ${kind} » (note, warn ou ok)`);
    const kids = [
      new Paragraph({ spacing: { before: 0, after: 60 }, children: [T(label.toUpperCase(), { font: MONO, bold: true, size: 15, color: k[0], characterSpacing: 40 })] }),
      new Paragraph({ spacing: { before: 0, after: 0, line: 290, lineRule: LineRuleType.AUTO }, children: rich(text, { color: C.ink }) }),
    ];
    return [spacer(60), boxTable(kids, {
      fill: k[1],
      borders: { left: { style: BorderStyle.SINGLE, size: 24, color: k[0] }, top: NONE, bottom: NONE, right: NONE },
      margins: { top: 170, bottom: 190, left: 280, right: 280 },
    }), spacer(220)];
  }
  // Courrier ou compte rendu sur fond gris : une ligne par paragraphe, « – » en tête = retrait, dernière ligne = signature.
  function lettre(lines) {
    return [boxTable(lines.map((t, i) => new Paragraph({
      spacing: { before: 0, after: i === lines.length - 1 ? 0 : 140, line: 300, lineRule: LineRuleType.AUTO },
      indent: t.startsWith('–') ? { left: 280 } : undefined,
      children: rich(t, { size: 19, color: C.ink, font: i === lines.length - 1 ? F_SB : F }),
    })), { fill: C.tint, margins: { top: 300, bottom: 300, left: 420, right: 420 }, split: true }), spacer(240)];
  }
  // Ligne de référence (ex. en-tête de devis) : gauche en capitales mono, complément gris, texte calé à droite.
  function ligneRef(gauche, complement, droite) {
    return new Paragraph({
      spacing: { before: 0, after: 160 },
      keepNext: true,
      tabStops: [{ type: TabStopType.RIGHT, position: CW }],
      children: [
        T(gauche, { font: MONO, bold: true, size: 17, color: C.ink, characterSpacing: 30 }),
        ...(complement ? [T(`   ${complement}`, { font: MONO, size: 17, color: C.mut })] : []),
        new TextRun({ children: [new Tab()] }),
        ...(droite ? [T(droite, { font: F_SB, size: 18, color: C.ink })] : []),
      ],
    });
  }

  // ---------- Tableaux de données ----------
  // widths : proportions relatives des colonnes. Options : plainFirst (1re colonne non grasse),
  // monoCols (indices des colonnes en police mono), allowSplit (autorise la coupure d'un tableau court).
  function dataTable(headers, rows, widths, o = {}) {
    const total = widths.reduce((a, b) => a + b, 0);
    const W = widths.map((w) => Math.round((w / total) * CW));
    W[W.length - 1] += CW - W.reduce((a, b) => a + b, 0);
    const cell = (content, i, header, last) => new TableCell({
      width: { size: W[i], type: WidthType.DXA },
      borders: {
        top: NONE, left: NONE, right: NONE,
        bottom: header ? { style: BorderStyle.SINGLE, size: 10, color: C.ink } : last ? { style: BorderStyle.SINGLE, size: 6, color: C.line } : { style: BorderStyle.SINGLE, size: 4, color: C.line },
      },
      margins: { top: header ? 60 : 95, bottom: header ? 80 : 95, left: i === 0 ? 0 : 120, right: 120 },
      verticalAlign: VerticalAlign.CENTER,
      children: [new Paragraph({
        spacing: { before: 0, after: 0, line: 270, lineRule: LineRuleType.AUTO },
        children: header
          ? [T(content.toUpperCase(), { font: MONO, bold: true, size: 14, color: C.mut, characterSpacing: 30 })]
          : rich(content, {
            size: 18,
            font: i === 0 && !o.plainFirst ? F_SB : (o.monoCols || []).includes(i) ? MONO : F,
            color: i === 0 ? C.ink : C.text,
            noShade: true,
            codeColor: C.ink,
          }),
      })],
    });
    const table = new Table({
      width: { size: CW, type: WidthType.DXA },
      columnWidths: W,
      borders: noBorders,
      layout: TableLayoutType.FIXED,
      rows: [
        new TableRow({ tableHeader: true, children: headers.map((h, i) => cell(h, i, true)) }),
        ...rows.map((r, ri) => new TableRow({ cantSplit: true, children: r.map((c, i) => cell(c, i, false, ri === rows.length - 1)) })),
      ],
    });
    // Les tableaux courts sont enveloppés dans une ligne insécable : ils ne se coupent jamais entre deux pages.
    const keep = rows.length <= 12 && !o.allowSplit;
    return [keep ? boxTable([table, new Paragraph({ children: [], spacing: { before: 0, after: 0, line: 20, lineRule: LineRuleType.EXACT } })], { margins: { top: 0, bottom: 0, left: 0, right: 0 } }) : table, spacer(240)];
  }

  // ---------- Chiffres clés : [['≈ 169', 'hôtes découverts'], …] ----------
  function kpis(items) {
    const w = Math.floor(CW / items.length);
    const W = items.map((_, i) => (i === items.length - 1 ? CW - w * (items.length - 1) : w));
    return [new Table({
      width: { size: CW, type: WidthType.DXA },
      columnWidths: W,
      borders: noBorders,
      layout: TableLayoutType.FIXED,
      rows: [new TableRow({
        cantSplit: true,
        children: items.map(([n, l], i) => new TableCell({
          width: { size: W[i], type: WidthType.DXA },
          borders: { top: { style: BorderStyle.SINGLE, size: 16, color: i === 0 ? C.acc : C.ink }, bottom: NONE, left: NONE, right: NONE },
          margins: { top: 140, bottom: 60, left: 0, right: 240 },
          children: [
            new Paragraph({ spacing: { before: 0, after: 20, line: 600, lineRule: LineRuleType.AT_LEAST }, children: [T(n, { font: F_COND, bold: true, size: 52, color: C.ink })] }),
            new Paragraph({ spacing: { before: 0, after: 0, line: 260, lineRule: LineRuleType.AUTO }, children: [T(l, { font: F, size: 16, color: C.mut })] }),
          ],
        })),
      })],
    }), spacer(260)];
  }

  // ---------- Frise d'étapes : [['Titre', 'détail'], …] (la dernière est en noir) ----------
  function timeline(items) {
    const w = Math.floor(CW / items.length);
    const W = items.map((_, i) => (i === items.length - 1 ? CW - w * (items.length - 1) : w));
    return [new Table({
      width: { size: CW, type: WidthType.DXA }, columnWidths: W, borders: noBorders, layout: TableLayoutType.FIXED,
      rows: [new TableRow({
        cantSplit: true,
        children: items.map(([t, d], i) => new TableCell({
          width: { size: W[i], type: WidthType.DXA },
          shading: { type: ShadingType.CLEAR, color: 'auto', fill: i === items.length - 1 ? C.ink : C.tint },
          borders: { top: NONE, bottom: NONE, left: i ? { style: BorderStyle.SINGLE, size: 24, color: C.white } : NONE, right: NONE },
          margins: { top: 150, bottom: 170, left: 180, right: 140 },
          children: [
            new Paragraph({ spacing: { before: 0, after: 60 }, children: [T(String(i + 1).padStart(2, '0'), { font: MONO, bold: true, size: 15, color: C.acc })] }),
            new Paragraph({ spacing: { before: 0, after: 40 }, children: [T(t, { font: F_SB, size: 19, color: i === items.length - 1 ? C.white : C.ink })] }),
            new Paragraph({ spacing: { before: 0, after: 0, line: 250, lineRule: LineRuleType.AUTO }, children: [T(d, { font: F, size: 15, color: i === items.length - 1 ? C.coverSub : C.mut })] }),
          ],
        })),
      })],
    }), spacer(320)];
  }

  // ---------- Grille d'étiquettes numérotées : ['PC', 'Switch', …] ----------
  function chipGrid(items, cols = 3) {
    const w = Math.floor(CW / cols);
    const W = Array.from({ length: cols }, (_, i) => (i === cols - 1 ? CW - w * (cols - 1) : w));
    const rows = [];
    for (let r = 0; r < items.length; r += cols) {
      rows.push(new TableRow({
        cantSplit: true,
        children: W.map((wd, i) => {
          const it = items[r + i];
          const white = { style: BorderStyle.SINGLE, size: 24, color: C.white };
          const lastRow = r + cols >= items.length;
          return new TableCell({
            width: { size: wd, type: WidthType.DXA },
            shading: it ? { type: ShadingType.CLEAR, color: 'auto', fill: C.tint } : undefined,
            borders: { top: r === 0 ? NONE : white, bottom: lastRow ? NONE : white, left: i === 0 ? NONE : white, right: i === cols - 1 ? NONE : white },
            margins: { top: 120, bottom: 120, left: 200, right: 160 },
            children: [new Paragraph({
              spacing: { before: 0, after: 0 },
              children: it ? [
                T(String(r + i + 1).padStart(2, '0') + '  ', { font: MONO, bold: true, size: 15, color: C.acc }),
                T(it, { font: F_SB, size: 19, color: C.ink }),
              ] : [],
            })],
          });
        }),
      }));
    }
    return [new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: W, borders: noBorders, layout: TableLayoutType.FIXED, rows }), spacer(240)];
  }

  // ---------- Figures : PNG de img/, pleine largeur ; ratio = hauteur / largeur ----------
  // Avec maskIps, une variante « <nom>-anon.png » est préférée si elle existe.
  function figure(file, ratio, caption) {
    figN += 1;
    const w = PX;
    const anon = file.replace(/\.png$/, '-anon.png');
    const src = maskIps && anon !== file && fs.existsSync(path.join(imgDir, anon)) ? anon : file;
    return [
      new Paragraph({
        spacing: { before: 120, after: 80, line: 240, lineRule: LineRuleType.AUTO },
        keepNext: true,
        children: [new ImageRun({ type: 'png', data: IMG(src), transformation: { width: w, height: Math.round(w * ratio) }, altText: { title: mask(caption), description: mask(caption), name: file } })],
      }),
      new Paragraph({
        spacing: { before: 0, after: 300 },
        children: [
          T(`FIGURE ${figN}`, { font: MONO, bold: true, size: 14, color: C.acc, characterSpacing: 30 }),
          T(`   ${caption}`, { font: MONO, size: 14, color: C.mut }),
        ],
      }),
    ];
  }

  // ---------- Couverture (page 1, image de fond pleine page) ----------
  function cover(o) {
    const fiche = o.fiche || [];
    const titre = Array.isArray(o.titre) ? o.titre : [o.titre];
    const size = o.tailleTitre ?? 76;
    const kids = [
      new Paragraph({
        spacing: { before: 0, after: 0 },
        children: [
          ...(o.image ? [new ImageRun({
            type: 'png', data: IMG(o.image),
            transformation: { width: 794, height: 1123 },
            altText: { title: 'Couverture', description: mask(o.imageAlt || 'Couverture'), name: 'cover' },
            floating: {
              horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, offset: 0 },
              verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, offset: 0 },
              behindDocument: true, allowOverlap: true, lockAnchor: true,
              wrap: { type: TextWrappingType.NONE },
            },
          })] : []),
          T(o.surtitre, { font: MONO, size: 15, color: C.coverMut, characterSpacing: 40 }),
        ],
      }),
      new Paragraph({
        spacing: { before: 1100, after: 160 },
        children: [T(o.projet, { font: MONO, bold: true, size: 20, color: C.acc, characterSpacing: 80 })],
      }),
      new Paragraph({
        spacing: { before: 0, after: 0, line: o.interligneTitre ?? 860, lineRule: LineRuleType.AT_LEAST },
        children: titre.map((t, i) => T(t, { font: F_COND, bold: true, size, color: C.white, ...(i ? { break: 1 } : {}) })),
      }),
      new Paragraph({
        spacing: { before: 320, after: 0, line: 320, lineRule: LineRuleType.AUTO },
        indent: { right: o.retraitDescription ?? 2200 },
        children: [T(o.description, { font: F, size: 22, color: C.coverSub })],
      }),
      spacer(360),
    ];
    if (fiche.length) {
      const w = Math.floor(CW / fiche.length);
      const W = fiche.map((_, i) => (i === fiche.length - 1 ? CW - w * (fiche.length - 1) : w));
      kids.push(new Table({
        width: { size: CW, type: WidthType.DXA }, columnWidths: W, borders: noBorders, layout: TableLayoutType.FIXED,
        rows: [new TableRow({
          children: fiche.map(([l, v], i) => new TableCell({
            width: { size: W[i], type: WidthType.DXA },
            borders: { top: { style: BorderStyle.SINGLE, size: 6, color: '3A424D' }, bottom: NONE, left: NONE, right: NONE },
            margins: { top: 130, bottom: 0, left: 0, right: 200 },
            children: [
              new Paragraph({ spacing: { before: 0, after: 40 }, children: [T(l, { font: MONO, size: 13, color: C.coverMut, characterSpacing: 40 })] }),
              new Paragraph({ spacing: { before: 0, after: 0 }, children: [T(v, { font: F_SB, size: 21, color: C.white })] }),
            ],
          })),
        })],
      }));
    }
    kids.push(new Paragraph({
      spacing: { before: 300, after: 0 },
      children: [
        T(o.auteur, { font: F_SB, size: 20, color: C.white }),
        T((o.infos || []).map((s) => `   ·   ${s}`).join(''), { font: F, size: 18, color: C.coverMut }),
      ],
    }));
    if (o.mention) {
      kids.push(new Paragraph({
        spacing: { before: 60, after: 0 },
        children: [T(o.mention, { font: F, size: 18, color: C.coverMut })],
      }));
    }
    coverChildren = kids;
  }

  // ---------- Fiche « En bref » (page 2) ----------
  function enBref(o) {
    const cells = o.cases || [];
    const half = Math.floor(CW / 2);
    const W = [half, CW - half];
    const mk = ([l, t], i) => new TableCell({
      width: { size: W[i % 2], type: WidthType.DXA },
      borders: { top: { style: BorderStyle.SINGLE, size: 8, color: C.ink }, bottom: NONE, left: NONE, right: NONE },
      margins: { top: 140, bottom: 260, left: 0, right: i % 2 === 0 ? 400 : 0 },
      children: [
        new Paragraph({ spacing: { before: 0, after: 80 }, children: [T(l.toUpperCase(), { font: MONO, bold: true, size: 15, color: C.acc, characterSpacing: 40 })] }),
        new Paragraph({ spacing: { before: 0, after: 0, line: 300, lineRule: LineRuleType.AUTO }, children: rich(t, { size: 19 }) }),
      ],
    });
    const rows = [];
    for (let i = 0; i < cells.length; i += 2) {
      rows.push(new TableRow({ cantSplit: true, children: [mk(cells[i], 0), cells[i + 1] ? mk(cells[i + 1], 1) : mk(['', ''], 1)] }));
    }
    const label = (text, after = 120) => new Paragraph({ spacing: { before: 0, after }, children: [T(text, { font: MONO, bold: true, size: 15, color: C.mut, characterSpacing: 40 })] });
    const out = [
      new Paragraph({ spacing: { before: 0, after: 80 }, children: [T(o.surtitre || 'FICHE PROJET', { font: MONO, bold: true, size: 16, color: C.acc, characterSpacing: 60 })] }),
      new Paragraph({ heading: HeadingLevel.TITLE, spacing: { before: 0, after: 220, line: 640, lineRule: LineRuleType.AT_LEAST }, children: [T(o.titre || 'En bref', { font: F_COND, bold: true, size: 56, color: C.ink })] }),
      new Paragraph({
        spacing: { before: 0, after: 420, line: 340, lineRule: LineRuleType.AUTO },
        children: [T(o.accroche, { font: F, size: 25, color: C.ink })],
      }),
    ];
    if (rows.length) out.push(new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: W, borders: noBorders, layout: TableLayoutType.FIXED, rows }), spacer(200));
    if (o.chiffres && o.chiffres.length) out.push(label(o.titreChiffres || 'EN CHIFFRES'), ...kpis(o.chiffres));
    if (o.deroule && o.deroule.length) out.push(label(o.titreDeroule || 'DÉROULÉ DU PROJET'), ...timeline(o.deroule));
    if (o.competences && o.competences.length) {
      const skillRuns = [];
      o.competences.forEach((s, i) => {
        if (i) skillRuns.push(new TextRun({ text: '   ', size: 18 }));
        // Espaces insécables : une compétence ne se coupe jamais en fin de ligne.
        skillRuns.push(T(` ${s} `.replace(/ /g, ' '), { font: F_SB, size: 17, color: C.ink, shading: { type: ShadingType.CLEAR, color: 'auto', fill: C.tint } }));
      });
      out.push(label(o.titreCompetences || 'COMPÉTENCES MOBILISÉES', 140), new Paragraph({ spacing: { before: 0, after: 0, line: 420, lineRule: LineRuleType.AUTO }, children: skillRuns }));
    }
    enBrefChildren = out;
  }

  // ---------- Sommaire (généré à partir des titres, numéros de page calculés par pages.py) ----------
  function sommaire() {
    const out = [
      new Paragraph({ pageBreakBefore: true, spacing: { before: 0, after: 80 }, children: [T('SOMMAIRE', { font: MONO, bold: true, size: 16, color: C.acc, characterSpacing: 60 })] }),
      new Paragraph({ heading: HeadingLevel.TITLE, spacing: { before: 0, after: 180, line: 640, lineRule: LineRuleType.AT_LEAST }, children: [T('Sommaire', { font: F_COND, bold: true, size: 56, color: C.ink })] }),
    ];
    for (const e of toc) {
      if (e.part) {
        out.push(new Paragraph({
          spacing: { before: 260, after: 60 },
          keepNext: true,
          children: [T(`PARTIE ${e.letter}  —  ${e.title.toUpperCase()}`, { font: MONO, bold: true, size: 15, color: C.acc, characterSpacing: 40 })],
        }));
        continue;
      }
      const page = pages[e.anchor] ? String(pages[e.anchor]) : '—';
      out.push(new Paragraph({
        spacing: { before: 0, after: 0, line: 300, lineRule: LineRuleType.AUTO },
        tabStops: [{ type: TabStopType.LEFT, position: 620 }, { type: TabStopType.RIGHT, position: CW }],
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.line, space: 4 } },
        children: [new InternalHyperlink({
          anchor: e.anchor,
          children: [
            T(e.num === 'R' ? '—' : String(e.num).padStart(2, '0'), { font: MONO, size: 17, color: C.mut }),
            new TextRun({ children: [new Tab()] }),
            T(e.title, { font: F, size: 19, color: C.ink }),
            new TextRun({ children: [new Tab()] }),
            // Marqueur transformé en champ PAGEREF (avec ce numéro en cache) par embed_fonts.py.
            new TextRun({ text: `§PG:${e.anchor}:${page}§`, font: MONO, size: 17, color: C.ink }),
          ],
        })],
      }));
    }
    return out;
  }

  // ---------- En-tête et pied de page (toutes les pages sauf la couverture) ----------
  function makeHeader() {
    return new Header({
      children: [new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: CW }],
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.line, space: 6 } },
        spacing: { after: 0 },
        children: [
          T(hd.code || '', { font: MONO, bold: true, size: 13, color: C.acc, characterSpacing: 40 }),
          T(`   ${hd.titre || ''}`, { font: MONO, size: 13, color: C.mut, characterSpacing: 40 }),
          new TextRun({ children: [new Tab()], font: MONO, size: 13 }),
          T(hd.droite || '', { font: MONO, size: 13, color: C.mut, characterSpacing: 40 }),
        ],
      })],
    });
  }
  function makeFooter() {
    return new Footer({
      children: [new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: CW }],
        spacing: { before: 0 },
        children: [
          T(ft, { font: MONO, size: 13, color: C.mut, characterSpacing: 20 }),
          new TextRun({ children: [new Tab()], font: MONO, size: 13 }),
          new TextRun({ children: [PageNumber.CURRENT], font: MONO, bold: true, size: 14, color: C.ink }),
          new TextRun({ children: [' / ', PageNumber.TOTAL_PAGES], font: MONO, size: 14, color: C.mut }),
        ],
      })],
    });
  }

  // ---------- Assemblage et écriture du .docx brut ----------
  // render(<sortie.docx>, <pages.json>) ; sans argument, lit « <sortie.docx> --pages <pages.json> » sur la ligne de commande.
  // Écrit aussi <sortie.docx>.toc.json (liste des titres, pour pages.py) et <sortie.docx>.info.json
  // (nom de publication et masquage, lus par generer.sh).
  function render(outPath, pagesPath) {
    const argv = process.argv.slice(2);
    const out = outPath || argv.find((a, i) => !a.startsWith('--') && argv[i - 1] !== '--pages');
    if (!pagesPath) { const i = argv.indexOf('--pages'); if (i > -1) pagesPath = argv[i + 1]; }
    if (!out) throw new Error('usage : node contenu.js <sortie.docx> [--pages pages.json]');
    pages = pagesPath && fs.existsSync(pagesPath) ? JSON.parse(fs.readFileSync(pagesPath, 'utf8')) : {};

    const pageProps = (m) => ({ page: { size: { width: PAGE_W, height: PAGE_H }, margin: m } });
    const bodyChildren = [...enBrefChildren, ...sommaire(), ...body];
    const sections = [];
    if (coverChildren) sections.push({ properties: pageProps({ top: 1080, bottom: 900, left: MX, right: MX }), children: coverChildren });
    sections.push({
      properties: pageProps({ top: 1300, bottom: 1250, left: MX, right: MX, header: 640, footer: 620 }),
      headers: { default: makeHeader() },
      footers: { default: makeFooter() },
      children: bodyChildren,
    });

    const doc = new Document({
      creator: meta.creator,
      title: meta.title,
      subject: meta.subject,
      description: meta.description,
      keywords: meta.keywords,
      styles: {
        default: {
          document: { run: { font: F, size: 20, color: C.text, language: { value: 'fr-FR' } }, paragraph: { spacing: { line: 300, lineRule: LineRuleType.AUTO } } },
        },
        paragraphStyles: [
          { id: 'Title', name: 'Title', basedOn: 'Normal', next: 'Normal', run: { font: F_COND, bold: true, size: 56, color: C.ink }, paragraph: { outlineLevel: 0 } },
          { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
            run: { font: F_SB, size: 36, color: C.ink },
            paragraph: { spacing: { before: 520, after: 160, line: 480, lineRule: LineRuleType.EXACT }, keepNext: true, keepLines: true, outlineLevel: 0 } },
          { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
            run: { font: F_SB, size: 24, color: C.ink },
            paragraph: { spacing: { before: 340, after: 120, line: 320, lineRule: LineRuleType.AUTO }, keepNext: true, keepLines: true, outlineLevel: 1 } },
        ],
      },
      numbering: {
        config: [
          { reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '–', alignment: AlignmentType.LEFT,
            style: { run: { color: C.acc, font: F_SB }, paragraph: { indent: { left: 400, hanging: 280 } } } }] },
          { reference: 'steps', levels: [{ level: 0, format: LevelFormat.DECIMAL_ZERO, text: '%1', alignment: AlignmentType.LEFT,
            style: { run: { color: C.acc, font: MONO, bold: true, size: 16 }, paragraph: { indent: { left: 560, hanging: 560 } } } }] },
        ],
      },
      sections,
    });

    return Packer.toBuffer(doc).then((buf) => {
      fs.writeFileSync(out, buf);
      fs.writeFileSync(out + '.toc.json', JSON.stringify(toc.filter((t) => !t.part)));
      fs.writeFileSync(out + '.info.json', JSON.stringify({ publication, maskIps }));
      console.log('écrit', out, buf.length, 'octets');
    });
  }

  return {
    // jetons et utilitaires
    C, F, F_SB, F_COND, MONO, PAGE_W, PAGE_H, MX, CW, PX, NONE, noBorders, docx, mask, rich, T,
    // état
    toc, body, add,
    // blocs
    P, spacer, partOpener, h1, h2, annexe, bullets, steps, liens, code, boxTable, callout, lettre, ligneRef,
    dataTable, kpis, timeline, chipGrid, figure, cover, enBref, sommaire, render,
  };
}

module.exports = { createDoc, maskIPv4, IPV4 };
