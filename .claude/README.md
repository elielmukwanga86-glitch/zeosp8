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

## Skill `unslop` (`skills/unslop/`)

Reprise de https://github.com/heydamir/unslop (commit `a6f121e` du 1ᵉʳ novembre 2026),
créée par Damir Sokolovsky (@heydamir), licence **CC BY 4.0** (`skills/unslop/LICENSE`) :
le crédit doit rester dans toute copie ou adaptation. Elle repère les marques d’une interface
« générée par IA » (dégradés violets, lueurs, émojis, espacements irréguliers, textes tape-à-l’œil)
puis corrige l’écran en neuf passes. Appel : `/unslop` ou en le demandant simplement.

Pour ce portfolio : l’identité visuelle de `CLAUDE.md` est une vraie charte, donc unslop doit
travailler en mode « polish » (corriger seulement ce que l’audit trouve, garder palette, polices
et mise en page) et ne jamais inventer de contenu. Les fichiers de travail (`unslop/`,
`unslop-story/`, vidéo) sont ignorés par `.gitignore`. Les scripts (`scripts/snapshot.mjs`,
`scripts/story.mjs`) utilisent Playwright, et ffmpeg pour la vidéo.
Non repris : la fiche Codex (`agents/openai.yaml`) et les deux écrans d’exemple.

## Écarté volontairement

Règles générales d’ECC (TDD obligatoire, 80 % de couverture de tests : inadapté à un site statique),
skills et agents propres à d’autres langages ou métiers, commandes en doublon avec celles déjà
intégrées à Claude Code (`/code-review`, `/security-review`, mode plan), scanner AgentShield (`npx`).

## Serveurs MCP (`../.mcp.json`)

| Serveur | Rôle | Configuration |
|---|---|---|
| `playwright` | Piloter un navigateur (captures 1440 px / 390 px, vérification du site) | `@playwright/mcp@0.0.80`, épinglé : c’est la version qui correspond au Chromium préinstallé des sessions cloud (révision 1243). En local, lancer une fois `npx @playwright/mcp@0.0.80 install-browser chromium`. Les captures vont dans `.playwright-mcp/` (ignoré par git). |
| `perplexity` | Recherche web avec réponses sourcées (`perplexity_search`, `_ask`, `_research`, `_reason`) | `@perplexity-ai/mcp-server@1.3.0`. Clé `PERPLEXITY_API_KEY` : en local, variable d’environnement ; en session cloud, secret réseau pour `api.perplexity.ai` (le proxy remplace la valeur factice). |
| `composio` | Accès aux applications connectées à Composio | Serveur hébergé `https://connect.composio.dev/mcp`, authentification OAuth : lancer `/mcp` puis « Authenticate ». |
| Firecrawl | Recherche et extraction de pages | Déjà fourni comme connecteur claude.ai (outils `mcp__Firecrawl__*`), donc pas dupliqué ici. En local sans connecteur : `claude mcp add firecrawl -e FIRECRAWL_API_KEY=… -- npx -y firecrawl-mcp`. |

Aucune clé n’est écrite dans le dépôt (public).
