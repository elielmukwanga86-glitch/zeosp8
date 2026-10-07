# Portfolio — Eliel Mukwanga · BTS SIO SISR

Portfolio de 2ᵉ année de BTS SIO, option SISR (ENSITECH). Site statique en HTML, CSS et JavaScript, sans dépendance ni étape de compilation.

## Contenu

| Fichier | Rôle |
| --- | --- |
| `index.html` | Accueil : projets, parcours, compétences, à propos, contact |
| `projets/projet-mairie.html` | Étude de cas : supervision Zabbix à la mairie des Clayes-sous-Bois |
| `projets/projet-cloison.html` | Étude de cas : réseau Wi-Fi à deux VLAN pour un cabinet de kiné (cas d’école) |
| `404.html` | Page d’erreur |
| `assets/css/style.css` | Styles (identité commune avec les dossiers PDF) |
| `assets/js/main.js` | Menu, animations au défilement, horloge, filtres, visionneuse d’images |
| `assets/js/topology.js` | Animation du réseau en haut de l’accueil |
| `assets/docs/` | Dossiers PDF téléchargeables |
| `assets/img/` | Schémas et visuels des projets |

Les adresses IP internes de la mairie sont masquées (`x.x`) dans la documentation publiée.

## Modifier le contenu

Tout le texte est directement dans les fichiers HTML. Pour ajouter un projet, dupliquer un bloc `<article class="project">` dans `index.html` et une page dans `projets/`.

## Voir le site en local

Ouvrir `index.html` dans un navigateur, ou lancer un petit serveur :

```bash
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

## Publier avec GitHub Pages

1. Fusionner la branche dans `main`.
2. Sur GitHub : **Settings → Pages → Build and deployment → Deploy from a branch**, branche `main`, dossier `/ (root)`.
3. Le site est publié à l’adresse `https://<utilisateur>.github.io/<dépôt>/`.

Tous les liens sont relatifs : le site fonctionne aussi dans un sous-dossier.
