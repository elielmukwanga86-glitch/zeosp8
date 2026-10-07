# Générateur des dossiers PDF

Produit les dossiers de projet (Word + PDF) avec la même identité que le portfolio :
IBM Plex, encre `#12161C`, accent orange `#E8572A`, couverture, fiche « En bref », sommaire paginé.

## Prérequis

- Node.js 18 ou plus, puis `npm install` dans ce dossier (module `docx` 9.7.1)
- Python 3 avec `pypdf` (`pip install pypdf`)
- LibreOffice (`soffice`) pour la conversion en PDF
- Playwright (facultatif) pour redessiner les figures depuis `schemas.html`

## Utilisation

```bash
./generer.sh projet-mairie          # un projet
./generer.sh --tous                 # tous les projets (sauf ceux qui commencent par _)
./generer.sh projet-mairie --schemas      # force le rendu des figures
./generer.sh projet-mairie --sans-copie   # ne copie pas le PDF dans le site
```

Résultat : `sortie/<projet>.pdf` et `sortie/<projet>.docx` (non versionnés). Le PDF est aussi copié
dans `src/assets/docs/` sous le nom indiqué par `publication` dans `contenu.js` ; il reste ensuite
à lancer `node src/build.js` à la racine du dépôt.

## Nouveau dossier

```bash
cp -r projets/_modele projets/projet-xxx
```

1. `contenu.js` : le texte du dossier. Le modèle montre tous les blocs disponibles (titres, paragraphes,
   listes, étapes, tableaux, code, encadrés, chiffres clés, figures).
2. `schemas.html` : les figures et la couverture, dessinées en HTML/SVG, capturées en PNG par
   `rendu-schemas.js`.
3. `./generer.sh projet-xxx`, puis relire le PDF.

## Structure

| Fichier | Rôle |
| --- | --- |
| `lib/doc-lib.js` | Blocs de mise en page (docx-js) et masquage des adresses IP |
| `lib/embed_fonts.py` | Embarque les polices IBM Plex dans le .docx et numérote le sommaire |
| `lib/pages.py` | Lit les numéros de page dans le PDF pour le sommaire (deuxième passe) |
| `lib/capture-schemas.js` | Capture des figures avec Playwright |
| `lib/verifier-ip.js` | Refuse une adresse IP complète dans les sources d’un projet masqué |
| `fonts/` | IBM Plex (licence SIL OFL, voir `OFL.txt`) |
| `projets/<projet>/` | `contenu.js`, `schemas.html`, `rendu-schemas.js`, `img/` |

## Règles

- Le dépôt est public : les adresses IP internes réelles s’écrivent **masquées** dans les sources
  (`192.168.x.x`). Avec `maskIps: true`, le PDF les masque aussi et `generer.sh` bloque toute
  adresse complète oubliée.
- On reprend la documentation de l’étudiant sans inventer de faits ni de chiffres ; on corrige
  l’orthographe et la clarté en gardant ses formulations.
