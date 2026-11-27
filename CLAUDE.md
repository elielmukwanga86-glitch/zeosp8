# Portfolio BTS SIO — consignes pour les sessions suivantes

Portfolio d’**Eliel Mukwanga**, étudiant en **2ᵉ année de BTS SIO option SISR** à ENSITECH
(Montigny-le-Bretonneux), en formation initiale. Tout le contenu est en français.
Site publié par GitHub Pages (workflow `.github/workflows/deploy-pages.yml`, dossier `docs/`) à chaque push sur la branche par défaut `claude/quirky-curie-ebilp7` ; garder `main` et `claude/quirky-curie-ebilp7` alignées sur `claude/gifted-pasteur-8nd9c6`. URL : https://elielmukwanga86-glitch.github.io/zeosp8/

## Architecture

- `src/contenu/` : tout le texte (site.js, referentiel.js, projets/*.js). `projets/_modele.js` = modèle.
- `src/templates/` : gabarits HTML en JavaScript ; `src/lib/html.js` : échappement et typographie française.
- `src/assets/` : CSS, JS, `img/` (WebP), `docs/` (PDF publiés).
- `docs/` : site **généré** par `node src/build.js` — ne jamais l’éditer à la main, toujours régénérer et committer.
- `outils/documentation/` : générateur des dossiers PDF/DOCX (`./generer.sh <projet>`), voir son README.
- `outils/synthese/` : remplit l’annexe 6-1 officielle (tableau de synthèse E4) : `npm run synthese`.
  Le référentiel (`referentiel.js`, bloc 1) reprend mot pour mot les intitulés et activités de cette annexe.

## Quand l’étudiant envoie une nouvelle documentation

1. Lire le document en entier. Choisir le format : étude de cas (`page: true`) si le projet est
   documenté de bout en bout, sinon réalisation courte (`page: false`).
2. Si un dossier PDF est utile : `cp -r outils/documentation/projets/_modele outils/documentation/projets/<slug>`,
   remplir `contenu.js` et `schemas.html`, `./generer.sh <slug>`, relire le PDF (rendu des pages en PNG).
3. Créer `src/contenu/projets/<slug>.js` à partir de `_modele.js` : `milieu` ('professionnel' pour un stage,
   'formation' sinon), `competencesBts` (identifiants de referentiel.js), images dans `src/assets/img/`.
4. Mettre à jour `site.js` : `contextes` des compétences concernées, parcours si c’est un stage.
5. `node src/build.js`, vérifier en capture (bureau 1440 px et mobile 390 px, aucun défilement horizontal),
   puis commit et push. Le tableau de synthèse se met à jour tout seul ; régénérer l’Excel (`npm run synthese`)
   et l’envoyer à l’étudiant. Une réalisation en stage doit avoir `anneeBts` (1 ou 2).
6. Épreuve E5 (support ENSITECH : bloc 1 = épreuve E5, compétences C1–C6) : chaque compétence du bloc 1
   cochée a son champ `preuves` (activité + où la voir) ; une étude de cas a son `analyse` en seize points
   (situer, cadrer, réaliser, valider, en distinguant ce que l’étudiant a fait lui-même). Retirer l’entrée de
   `site.aCouvrir` dès qu’une réalisation couvre C3 (présence en ligne) ou C6 (développement professionnel).

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

Direction « dossier technique éditorial » (refonte de novembre 2026) : le site se lit comme un rapport technique
imprimé — fond papier clair, titres en IBM Plex Serif, texte en IBM Plex Sans, métadonnées en IBM Plex Mono,
sections numérotées (01–05, « Annexe A » pour la synthèse), notes en marge, figures et tableaux numérotés,
sommaire de l’accueil dessiné comme une topologie en étoile. Encre `#0E1217`, papier `#F3F2EE`,
orange `#E8572A` comme seul accent (`#B03D19` pour du texte orange sur fond clair). Les dossiers PDF partagent
cette identité (IBM Plex, orange).

## Outillage Claude Code (`.claude/`)

Skills, agents et règles web repris d’ECC (détail et licence dans `.claude/README.md`).
Un hook (`.claude/hooks/garde-fous.js`) bloque toute modification manuelle de `docs/` et toute IPv4
non masquée écrite dans `src/` ou `outils/`. Skill `unslop` (@heydamir, CC BY 4.0) : sur ce site, toujours
en mode « polish », sans toucher à l’identité visuelle ni au contenu. Ces consignes priment sur celles d’ECC et d’unslop.
