'use strict';
/**
 * Small helpers shared by the templates: HTML escaping, French typography
 * and a tiny inline syntax for content strings.
 *
 * Inline syntax accepted in content strings:
 *   **texte**  -> <strong>texte</strong>
 *   `code`     -> <code>code</code>
 */

const NBSP = ' ';

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** French typography: non-breaking spaces before high punctuation, inside guillemets, between numbers and units. */
function typo(text) {
  return String(text ?? '')
    .replace(/ ([:;?!»])/g, `${NBSP}$1`)
    .replace(/« /g, `«${NBSP}`)
    .replace(/(\d) (\d{3})\b/g, `$1${NBSP}$2`)
    .replace(/(\d) (€|%|h|min|minutes|ms|s|secondes|m|m²|jours|pages|Mbit\/s|Mbps|GHz|MHz|dBm|hôtes|VLAN)(?![\wÀ-ſ])/g, `$1${NBSP}$2`)
    .replace(/≈ /g, `≈${NBSP}`)
    .replace(/ – /g, `${NBSP}– `)
    // Non-breaking hyphens in names that must not be split at the end of a line.
    .replace(/Wi-Fi|Montigny-le-Bretonneux|Clayes-sous-Bois|Chesnay-Rocquencourt|e-mail/g, (m) => m.replace(/-/g, '‑'));
}

/** Escaped, typeset text with **bold** and `code`. */
function inline(text) {
  const parts = String(text ?? '').split(/(`[^`]+`)/g);
  return parts.map((part) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 1) {
      return `<code>${esc(part.slice(1, -1))}</code>`;
    }
    return typo(esc(part))
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\b(\d+)e(?=[\s ])/g, '$1<sup>e</sup>');
  }).join('');
}

/** Plain escaped and typeset text (no inline markup). */
function text(value) {
  return typo(esc(value));
}

/** Join an array of HTML strings, skipping empty values. */
function join(items, sep = '') {
  return items.filter((x) => x !== undefined && x !== null && x !== false && x !== '').join(sep);
}

module.exports = { NBSP, esc, typo, inline, text, join };
