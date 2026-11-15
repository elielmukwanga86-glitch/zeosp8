# Configuration Claude Code du portfolio

Deux sources, toutes deux sous licence MIT : **ECC** (ci-dessous) et **agent-skills** d’Addy Osmani
(section dédiée plus bas).

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
| Présentation | `frontend-slides` (diaporama HTML, utile pour préparer les oraux E4 / E5 ; export PDF par `scripts/export-pdf.sh`) |
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

## agent-skills (Addy Osmani)

Repris de https://github.com/addyosmani/agent-skills (licence MIT, voir `LICENSE-agent-skills`),
commit `39b723c` (version 0.6.16). Fichiers copiés tels quels.

| Usage | Éléments |
|---|---|
| Site et génération | skills `frontend-ui-engineering`, `performance-optimization`, `debugging-and-error-recovery`, `incremental-implementation` ; agent `web-performance-auditor` ; commande `/webperf` (audit de performance, Lighthouse possible avec le Chromium installé) |
| Publication | `shipping-and-launch` (liste avant mise en ligne), `ci-cd-and-automation` (workflow GitHub Pages) |
| Documentation | `documentation-and-adrs` (trace des choix, documentation qui ne suit plus le code), `source-driven-development` (vérifier dans la documentation officielle avant d’écrire, utile aussi pour les procédures SISR), `context-engineering` (tenir `CLAUDE.md` à jour) |
| Échanges | `interview-me` : questions une par une quand une demande ou une documentation est floue (au lieu de deviner, ce qui respecte « ne rien inventer ») |

Listes de contrôle dans `references/` (accessibilité, performance, sécurité, définition de « terminé »),
appelées par ces skills avec des chemins relatifs.

Non repris : TDD, conception d’API, observabilité, migrations (sans objet pour un site statique) ;
`code-review-and-quality`, `code-simplification`, `planning-and-task-breakdown`, `git-workflow-and-versioning`,
`security-and-hardening` et les agents `code-reviewer`, `security-auditor`, `test-engineer` (doublons
d’ECC ou des commandes intégrées `/code-review`, `/simplify`, `/security-review`) ; `browser-testing-with-devtools`
(exige le MCP Chrome DevTools, on utilise Playwright via `browser-qa`) ; `idea-refine`, `spec-driven-development`,
`doubt-driven-development`, `constraint-driven-development`, la méta-skill `using-agent-skills`, les hooks
(`session-start`, cache SDD), `/ship` (dépend des agents non repris) et la configuration des autres outils
(Gemini, Codex, Cursor…).

## Écarté volontairement

Règles générales d’ECC (TDD obligatoire, 80 % de couverture de tests : inadapté à un site statique),
skills et agents propres à d’autres langages ou métiers, commandes en doublon avec celles déjà
intégrées à Claude Code (`/code-review`, `/security-review`, mode plan), scanner AgentShield (`npx`).
