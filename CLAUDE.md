# Portfolio BTS SIO — consignes pour les sessions suivantes

Portfolio d’**Eliel Mukwanga**, étudiant en **2ᵉ année de BTS SIO option SISR** à ENSITECH
(Montigny-le-Bretonneux), en formation initiale. Tout le contenu est en français.
Site publié par GitHub Pages depuis la branche `claude/gifted-pasteur-8nd9c6`, dossier `/docs` : https://elielmukwanga86-glitch.github.io/zeosp8/

## Architecture

- `src/contenu/` : tout le texte (site.js, referentiel.js, projets/*.js). `projets/_modele.js` = modèle.
- `src/templates/` : gabarits HTML en JavaScript ; `src/lib/html.js` : échappement et typographie française.
- `src/assets/` : CSS, JS, `img/` (WebP), `docs/` (PDF publiés).
- `docs/` : site **généré** par `node src/build.js` — ne jamais l’éditer à la main, toujours régénérer et committer.
- `outils/documentation/` : générateur des dossiers PDF/DOCX (`./generer.sh <projet>`), voir son README.

## Quand l’étudiant envoie une nouvelle documentation

1. Lire le document en entier. Choisir le format : étude de cas (`page: true`) si le projet est
   documenté de bout en bout, sinon réalisation courte (`page: false`).
2. Si un dossier PDF est utile : `cp -r outils/documentation/projets/_modele outils/documentation/projets/<slug>`,
   remplir `contenu.js` et `schemas.html`, `./generer.sh <slug>`, relire le PDF (rendu des pages en PNG).
3. Créer `src/contenu/projets/<slug>.js` à partir de `_modele.js` : `milieu` ('professionnel' pour un stage,
   'formation' sinon), `competencesBts` (identifiants de referentiel.js), images dans `src/assets/img/`.
4. Mettre à jour `site.js` : `contextes` des compétences concernées, parcours si c’est un stage.
5. `node src/build.js`, vérifier en capture (bureau 1440 px et mobile 390 px, aucun défilement horizontal),
   puis commit et push. Le tableau de synthèse se met à jour tout seul.

## Règles de contenu (impératives)

- **Ne rien inventer** : ni fait, ni chiffre, ni résultat, ni compétence. Garder les formulations de
  l’étudiant ; corriger seulement l’orthographe, la grammaire et la clarté. Ton d’étudiant de BTS,
  à la première personne, phrases simples ; pas de formules marketing.
- **Confidentialité, dépôt public** : aucune adresse IP interne réelle (mairie ou autre organisation)
  en clair, nulle part (site, PDF, sources, commits). Masquer les deux derniers octets (`x.x`) ;
  la plage 172.168.x.x de la mairie (erreur de configuration) s’écrit `172.x.x.x`.
  `src/build.js` refuse toute IPv4 hors liste blanche (plan fictif du cas Cloison, 1.1.1.1…).
  Masquer aussi adresses MAC, préfixes IPv6 et noms d’hôtes personnels.
- Pas de photo, de téléphone, d’adresse postale, de permis ni de recherche d’alternance sur le site.
- Typographie française : apostrophe ’, guillemets « », espaces insécables gérées par `typo()`.
- Veille technologique et certifications : la section apparaît dès que `site.veille` / `site.certifications`
  ont du contenu ; ne les remplir qu’avec ce que l’étudiant fournit.

## Identité visuelle

IBM Plex Sans / Condensed / Mono ; anthracite `#0E1217`, papier `#F3F2EE`, orange `#E8572A`
(`--acc-ink: #B03D19` pour du texte orange sur fond clair). Les dossiers PDF partagent cette identité.
