# Portfolio — Eliel Mukwanga · BTS SIO SISR

Portfolio de 2ᵉ année de BTS SIO, option SISR (ENSITECH, Montigny-le-Bretonneux).

En ligne : **https://elielmukwanga86-glitch.github.io/zeosp8/**

## Organisation du dépôt

| Dossier | Rôle |
| --- | --- |
| `src/contenu/site.js` | Textes généraux : présentation, parcours, compétences, veille, certifications, contact |
| `src/contenu/projets/` | Une réalisation par fichier (`_modele.js` sert de modèle) |
| `src/contenu/referentiel.js` | Compétences du référentiel BTS SIO (tableau de synthèse) |
| `src/templates/` | Gabarits HTML (accueil, étude de cas, synthèse, 404) |
| `src/assets/` | CSS, JavaScript, images (`img/`) et dossiers PDF (`docs/`) |
| `docs/` | **Site généré**, publié par GitHub Pages — ne pas modifier à la main |
| `outils/documentation/` | Générateur des dossiers PDF/Word des projets (voir son README) |

## Mettre à jour le site

```bash
node src/build.js      # régénère docs/ (Node 18 ou plus, aucune dépendance)
npm run serve          # aperçu sur http://localhost:8000
```

Le générateur vérifie le contenu avant d’écrire quoi que ce soit : champs manquants, images
absentes, compétences inconnues et **adresses IP internes non masquées** (le dépôt est public).

## Ajouter une réalisation

1. Produire le dossier PDF avec `outils/documentation/` (facultatif pour une réalisation courte).
2. Copier `src/contenu/projets/_modele.js` en `src/contenu/projets/<slug>.js` et le remplir.
3. Déposer les images dans `src/assets/img/` (WebP, ≈ 2000 px de large) et le PDF dans `src/assets/docs/`.
4. Relier les compétences : `competencesBts` dans le projet, `contextes` dans `site.js`.
5. `node src/build.js`, vérifier l’aperçu, puis commit et push.

Les sections **Veille** et **Certifications** apparaissent sur l’accueil dès qu’elles ont du contenu
(`veille` et `certifications` dans `site.js`).

## Publication (GitHub Pages)

Une seule fois : *Settings → Pages → Build and deployment → Source : Deploy from a branch*, branche
`claude/gifted-pasteur-8nd9c6`, dossier `/docs`, puis *Save*. Ensuite, chaque push sur cette branche
met le site à jour en une à deux minutes (onglet *Actions* : « pages build and deployment »).

## Confidentialité

- Les adresses IP internes de la mairie sont masquées (`x.x`) partout : site, PDF et sources.
- Pas de photo, de téléphone ni d’adresse postale sur le site.
