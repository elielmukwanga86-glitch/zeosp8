# Configuration Claude Code du portfolio

Sources : **ECC** (ci-dessous), **agent-skills** d’Addy Osmani, les agents de **VoltAgent** (MIT)
et la skill `webapp-testing` d’**Anthropic** (Apache 2.0), chacune dans sa section plus bas.

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

## Agents VoltAgent (Windows Server, PowerShell, relecture)

Repris de https://github.com/VoltAgent/awesome-claude-code-subagents (licence MIT, voir `LICENSE-VoltAgent`),
commit `ed74d11`. Fichiers copiés tels quels dans `agents/`. Ils complètent ECC, qui ne couvre ni Windows Server ni PowerShell.

- SISR : `windows-infra-admin` (Active Directory, DNS, DHCP, GPO), `ad-security-reviewer` (audit de sécurité AD et GPO),
  `powershell-5.1-expert`, `powershell-7-expert`, `powershell-security-hardening`, `network-engineer`, `it-ops-orchestrator`
- Site : `accessibility-tester` (WCAG), `ai-writing-auditor` (repère les tournures « écrites par une IA » ;
  il réécrit sans rien ajouter, et les règles de contenu de `CLAUDE.md` s’appliquent)

## Skill `webapp-testing` (Anthropic)

Reprise de https://github.com/anthropics/skills (licence Apache 2.0, `skills/webapp-testing/LICENSE.txt`), commit `1780c5e`.
Scripts Playwright en **Python** pour tester les pages et faire des captures. Le module Python n’est pas installé
par défaut : `pip install playwright`, puis lancer Chromium avec `executable_path='/opt/pw-browsers/chromium-1243/chrome-linux64/chrome'`
(ne pas lancer `playwright install`). Le Playwright Node déjà présent reste la solution la plus simple pour les captures du site.

## Hors de `.claude/`

- `.mcp.json` : serveur MCP **Playwright** (https://github.com/microsoft/playwright-mcp, Apache 2.0), sans affichage
  et sans profil persistant ; Claude Code demande l’autorisation au premier lancement. Il permet de piloter le navigateur
  directement pour vérifier le site.
- `.github/workflows/lighthouse.yml` + `lighthouserc.json` : audit **Lighthouse CI** (https://github.com/GoogleChrome/lighthouse-ci)
  des quatre pages à chaque push qui modifie `docs/`. Contrôle séparé : il ne bloque jamais la publication.
  Seuils visés : accessibilité 0,95, référencement 0,9, bonnes pratiques 0,9, performance 0,85, pour l’instant en
  avertissement ; une fois les premiers scores connus, passer accessibilité et référencement en `"error"`.
  Rapports HTML dans les artefacts du run (dossier local `.lighthouseci/`, ignoré par git).

## Écarté volontairement

Règles générales d’ECC (TDD obligatoire, 80 % de couverture de tests : inadapté à un site statique),
skills et agents propres à d’autres langages ou métiers, `doc-coauthoring` d’Anthropic (pas de fichier de licence dans son dossier), commandes en doublon avec celles déjà
intégrées à Claude Code (`/code-review`, `/security-review`, mode plan), scanner AgentShield (`npx`).
