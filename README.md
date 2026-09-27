# Prof IA 🎓

Application web d'aide aux devoirs propulsée par Claude (Anthropic). Pour les élèves du primaire à l'université, dans toutes les matières.

## Fonctionnalités

| Mode | Ce que fait l'IA |
|---|---|
| **Résoudre** | Corrige un exercice pas à pas : reformulation, méthode, résolution détaillée, résultat encadré, vérification, pièges, et un exercice similaire pour s'entraîner. |
| **Expliquer** | Explique une notion de cours simplement : idée clé, explication progressive, formules, exemple résolu, erreurs fréquentes, mini-quiz. |
| **Cours LaTeX** | Rédige un cours complet au format LaTeX (définitions, théorèmes, méthodes, exemples, exercices et corrigés). Téléchargement `.tex`, ouverture dans Overleaf en un clic, et aperçu PDF si `pdflatex` est installé sur le serveur. |

- Formules mathématiques affichées avec KaTeX.
- Photo ou PDF de l'énoncé : bouton trombone, glisser-déposer ou Ctrl+V d'une capture.
- Choix de la matière et du niveau pour adapter les explications.
- Conversation : l'élève peut poser des questions de suivi.
- Réponses en direct (streaming), bouton d'arrêt, interface adaptée au mobile et au mode sombre.

## Installation

Il faut Node.js 22 ou plus récent et une clé API Anthropic (https://console.anthropic.com).

```bash
npm install
cp .env.example .env   # puis colle ta clé dans ANTHROPIC_API_KEY
npm start
```

Ouvre ensuite http://localhost:3000.

### Aperçu PDF des cours (optionnel)

Pour compiler les cours LaTeX directement dans l'application, installe une distribution TeX sur le serveur :

```bash
# Debian / Ubuntu
sudo apt install texlive-latex-extra texlive-lang-french texlive-science texlive-pictures
```

Sans `pdflatex`, le bouton « Ouvrir dans Overleaf » permet de compiler le cours en ligne gratuitement.

## Configuration

| Variable | Rôle | Défaut |
|---|---|---|
| `ANTHROPIC_API_KEY` | Clé API Anthropic | — |
| `CLAUDE_MODEL` | Modèle utilisé | `claude-opus-5` |
| `PORT` | Port HTTP | `3000` |

## Structure

```
server.js       Serveur Express : /api/chat (streaming), /api/compile (LaTeX → PDF)
prompts.js      Consignes pédagogiques de chaque mode
validation.js   Validation des requêtes et conversion vers l'API Claude
public/         Interface (HTML, CSS, JS) et rendu Markdown + KaTeX
test/           Tests unitaires (npm test)
```

## Notes

- La clé API reste côté serveur ; le navigateur ne la voit jamais.
- Si tu déploies l'application publiquement, ajoute une authentification ou une limite de requêtes : chaque question consomme des crédits API.
- La compilation LaTeX s'exécute sans `shell-escape` et avec un délai maximum de 60 s.
