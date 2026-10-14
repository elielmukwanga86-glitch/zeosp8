# Site de la Fondation FLEJOM

Site statique (HTML, CSS, JavaScript), sans dépendance : il suffit de copier le contenu du dossier `flejom/` chez l'hébergeur.

## Pages
`index.html` (accueil), `a-propos.html`, `actions.html`, `galerie.html`, `partenaires.html`, `don.html`, `contact.html`, `404.html`.

## Galerie photos
- Les photos sont dans `galerie/` (grand format) et `galerie/thumbs/` (vignettes).
- Sur l'accueil, deux bandeaux font défiler les photos ; la page Galerie propose un diaporama automatique (pause, plein écran, miniatures) et une grille.

## Modifier les textes ou ajouter des photos
Les textes sont dans `generer.py`. Après une modification, ou après avoir ajouté des photos dans `galerie/` :

```bash
python3 flejom/generer.py
```
