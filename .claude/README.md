# Configuration Claude Code du portfolio

Éléments repris d’**ECC** (https://github.com/affaan-m/ECC, licence MIT, voir `LICENSE-ECC`),
commit `b38be6a` du 29 octobre 2026. Seul ce qui sert au portfolio (site statique, dossiers PDF)
ou à l’option SISR a été gardé ; les fichiers sont copiés tels quels, sauf les renvois vers des
parties d’ECC non reprises. En cas de conflit, **`CLAUDE.md` à la racine l’emporte toujours**
(règles de contenu, confidentialité, identité visuelle).

## Hook propre au dépôt (`hooks/garde-fous.js`, branché dans `settings.json`)

Avant chaque Edit / Write :
- refuse de modifier `docs/` à la main (site généré par `node src/build.js`) ;
- refuse une adresse IPv4 non masquée dans `src/` ou `outils/` (même liste blanche que `src/build.js`).

Les hooks d’ECC eux-mêmes n’ont pas été repris : ils dépendent de tout l’environnement ECC.

## Skills (`skills/`)

| Usage | Skills |
|---|---|
| Site web | `accessibility`, `frontend-a11y`, `seo`, `design-system`, `make-interfaces-feel-better`, `browser-qa`, `click-path-audit` |
| Qualité, sécurité, git | `verification-loop`, `web-security-review`, `coding-standards`, `search-first`, `git-workflow` |
| Réseau / SISR | `cisco-ios-patterns`, `network-config-validation`, `network-interface-health`, `network-bgp-diagnostics`, `netmiko-ssh-automation`, `homelab-network-setup`, `homelab-network-readiness`, `homelab-vlan-segmentation`, `homelab-wireguard-vpn`, `homelab-pihole-dns` |

## Agents (`agents/`)

- Site : `a11y-architect`, `seo-specialist`, `performance-optimizer`, `code-reviewer`, `security-reviewer`, `silent-failure-hunter`, `planner`
- Dépôt public : `opensource-sanitizer` (recherche de secrets, IP, données personnelles avant publication)
- Réseau / SISR : `network-architect`, `network-config-reviewer`, `network-troubleshooter`, `homelab-architect`

## Commande et règles

- `commands/build-fix.md` : `/build-fix`, corriger pas à pas une erreur de génération.
- `rules/web/` : règles web d’ECC, chargées seulement quand on touche des fichiers CSS/HTML.

## Écarté volontairement

Règles générales d’ECC (TDD obligatoire, 80 % de couverture de tests : inadapté à un site statique),
skills et agents propres à d’autres langages ou métiers, commandes en doublon avec celles déjà
intégrées à Claude Code (`/code-review`, `/security-review`, mode plan), scanner AgentShield (`npx`).
