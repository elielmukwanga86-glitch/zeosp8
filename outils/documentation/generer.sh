#!/usr/bin/env bash
# =====================================================================
# generer.sh — construit le dossier PDF d'un projet du portfolio
# =====================================================================
# Usage : ./generer.sh <projet> [--schemas] [--sans-copie]
#         ./generer.sh --tous [--schemas] [--sans-copie]
#
#   <projet>      nom d'un dossier de projets/ (ex. projet-mairie)
#   --tous        génère tous les projets (sauf ceux dont le nom commence par _)
#   --schemas     force le rendu des figures (sinon : seulement si schemas.html
#                 ou rendu-schemas.js ont changé depuis le dernier rendu)
#   --sans-copie  ne copie pas le PDF dans le site (src/assets/docs/)
#
# Étapes : figures (Playwright, si besoin) → contrôle des adresses IP →
# construction en deux passes (docx-js → polices embarquées → PDF LibreOffice →
# numéros de page du sommaire) → validation du .docx (si le validateur est
# présent) → sortie/<projet>.docx et sortie/<projet>.pdf → copie dans le site.
#
# Variables d'environnement facultatives :
#   SOFFICE          chemin de LibreOffice (défaut : soffice dans le PATH)
#   PORTFOLIO_DOCS   dossier de publication (défaut : <dépôt>/src/assets/docs)
#   DOCX_VALIDATOR   chemin de validate.py (skill docx) ; « aucun » pour ne pas valider
# =====================================================================
set -euo pipefail

ICI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPOT="$(cd "$ICI/../.." && pwd)"
DEST="${PORTFOLIO_DOCS:-$DEPOT/src/assets/docs}"

erreur() { echo "erreur : $*" >&2; exit 1; }
info() { echo "› $*"; }

usage() { sed -n '5,13p' "$0" | sed 's/^# \{0,1\}//'; exit "${1:-0}"; }

[ $# -ge 1 ] || usage 1
case "$1" in -h|--help|aide) usage 0 ;; esac

# ---------- Tous les projets ----------
if [ "$1" = "--tous" ] || [ "$1" = "tous" ]; then
  shift
  for d in "$ICI"/projets/*/; do
    p="$(basename "$d")"
    case "$p" in _*) continue ;; esac
    "$0" "$p" "$@"
  done
  exit 0
fi

PROJET="$(basename "${1%/}")"; shift
DIR="$ICI/projets/$PROJET"
[ -f "$DIR/contenu.js" ] || erreur "projet introuvable : $DIR/contenu.js (projets disponibles : $(ls "$ICI/projets" | tr '\n' ' '))"

SCHEMAS=0; COPIE=1
for a in "$@"; do
  case "$a" in
    --schemas) SCHEMAS=1 ;;
    --sans-copie) COPIE=0 ;;
    *) erreur "option inconnue : $a" ;;
  esac
done

# ---------- Prérequis ----------
command -v node >/dev/null || erreur "Node.js est requis (version 18 ou plus)"
command -v python3 >/dev/null || erreur "Python 3 est requis"
(cd "$ICI/lib" && node -e "require('docx')" 2>/dev/null) \
  || erreur "module npm « docx » introuvable : lancer « npm install » dans $ICI"
python3 -c "import pypdf" 2>/dev/null || erreur "module Python « pypdf » introuvable : pip install pypdf"
SOFFICE="${SOFFICE:-$(command -v soffice || command -v libreoffice || true)}"
[ -z "$SOFFICE" ] && [ -x /Applications/LibreOffice.app/Contents/MacOS/soffice ] && SOFFICE=/Applications/LibreOffice.app/Contents/MacOS/soffice
[ -n "$SOFFICE" ] || erreur "LibreOffice (soffice) est requis pour produire le PDF"

empreinte() {
  if command -v sha256sum >/dev/null; then cat "$@" | sha256sum | cut -d' ' -f1
  else cat "$@" | shasum -a 256 | cut -d' ' -f1; fi
}

TRAVAIL="$ICI/sortie/.travail/$PROJET"
mkdir -p "$TRAVAIL"
PROFIL="$(mktemp -d)"
trap 'rm -rf "$PROFIL"' EXIT

# ---------- 1. Figures ----------
if [ -f "$DIR/schemas.html" ] && [ -f "$DIR/rendu-schemas.js" ]; then
  EMP="$(empreinte "$DIR/schemas.html" "$DIR/rendu-schemas.js")"
  ACTUELLE="$(cat "$DIR/img/.empreinte" 2>/dev/null || true)"
  if [ "$SCHEMAS" = 1 ] || [ "$EMP" != "$ACTUELLE" ] || ! ls "$DIR"/img/*.png >/dev/null 2>&1; then
    info "$PROJET : rendu des figures (Playwright)"
    if (cd "$DIR" && node rendu-schemas.js); then
      echo "$EMP" > "$DIR/img/.empreinte"
    elif ls "$DIR"/img/*.png >/dev/null 2>&1; then
      echo "  attention : rendu impossible, les PNG existants de img/ sont utilisés" >&2
    else
      erreur "rendu des figures impossible et aucune image dans $DIR/img"
    fi
  fi
fi

# ---------- 2. Construction (au moins deux passes : le sommaire a besoin des numéros de page) ----------
RAW="$TRAVAIL/$PROJET.raw.docx"
DOCX="$TRAVAIL/$PROJET.docx"
PDF="$TRAVAIL/$PROJET.pdf"
PAGES="$TRAVAIL/$PROJET.pages.json"
rm -f "$PAGES"
for passe in 1 2 3 4; do
  info "$PROJET : passe $passe"
  AVANT="$(cat "$PAGES" 2>/dev/null || echo '{}')"
  node "$DIR/contenu.js" "$RAW" --pages "$PAGES" >/dev/null
  python3 "$ICI/lib/embed_fonts.py" "$RAW" "$DOCX" "$ICI/fonts" >/dev/null
  rm -f "$PDF"
  SAL_USE_VCLPLUGIN=svp "$SOFFICE" "-env:UserInstallation=file://$PROFIL" --headless \
    --convert-to pdf --outdir "$TRAVAIL" "$DOCX" >/dev/null 2>&1 || true
  [ -s "$PDF" ] || erreur "LibreOffice n'a pas produit $PDF"
  RES="$(python3 "$ICI/lib/pages.py" "$PDF" "$RAW.toc.json" "$PAGES")"
  case "$RES" in *"missing []"*) ;; *) echo "  attention : titres absents du sommaire : $RES" >&2 ;; esac
  # Point fixe : les numéros utilisés pour construire ce PDF sont ceux qu'on y lit.
  if [ "$passe" -ge 2 ] && [ "$AVANT" = "$(cat "$PAGES")" ]; then break; fi
  [ "$passe" = 4 ] && echo "  attention : numéros de page du sommaire non stabilisés après 4 passes" >&2
done
NB_PAGES="${RES##*total }"

# ---------- 3. Confidentialité : aucune adresse IP complète dans les sources d'un projet masqué ----------
read -r PUBLICATION MASQUE < <(node -e "const i=require(process.argv[1]); console.log((i.publication||'-')+' '+i.maskIps)" "$RAW.info.json")
if [ "$MASQUE" = "true" ]; then
  node "$ICI/lib/verifier-ip.js" "$DIR/contenu.js" "$DIR/schemas.html" \
    || erreur "adresses IP internes en clair dans les sources de $PROJET (dépôt public) : les écrire masquées"
fi

# ---------- 4. Validation du .docx (facultative) ----------
VALIDATEUR="${DOCX_VALIDATOR:-}"
if [ -z "$VALIDATEUR" ]; then
  for c in /mnt/skills/public/docx/scripts/office/validate.py \
           "$HOME"/.claude/skills/docx/scripts/office/validate.py \
           "$HOME"/.claude/skills/*/docx/scripts/office/validate.py \
           "$HOME"/.claude/skills/synced/*/docx/scripts/office/validate.py; do
    [ -f "$c" ] && { VALIDATEUR="$c"; break; }
  done
fi
if [ -n "$VALIDATEUR" ] && [ "$VALIDATEUR" != "aucun" ]; then
  if SORTIE_VAL="$(cd "$(dirname "$VALIDATEUR")" && python3 "$VALIDATEUR" "$DOCX" 2>&1)"; then
    info "$PROJET : docx valide ($(echo "$SORTIE_VAL" | tail -1))"
  else
    echo "$SORTIE_VAL" >&2
    erreur "le .docx ne passe pas la validation OOXML"
  fi
else
  info "$PROJET : validation du docx ignorée (validateur absent)"
fi

# ---------- 5. Sorties ----------
mkdir -p "$ICI/sortie"
cp "$DOCX" "$ICI/sortie/$PROJET.docx"
cp "$PDF" "$ICI/sortie/$PROJET.pdf"
info "$PROJET : $NB_PAGES pages → sortie/$PROJET.pdf et sortie/$PROJET.docx"

if [ "$COPIE" = 1 ] && [ "$PUBLICATION" != "-" ]; then
  mkdir -p "$DEST"
  cp "$PDF" "$DEST/$PUBLICATION"
  info "$PROJET : publié dans ${DEST#"$DEPOT"/}/$PUBLICATION"
fi
