# Vacatio

> Chaque vacation couverte, chaque heure facturée.

SaaS B2B pour les sociétés de propreté françaises (3 à 50 agents) : planning, pointage,
remplacements, conformité IDCC 3043, qualité, facturation, paie.

Stack : Next.js 16 (App Router) · TypeScript · Tailwind 4 · composants shadcn/ui ·
Supabase (Auth, PostgreSQL, Storage, RLS) · Stripe · Resend · Brevo · Vercel (région Paris `cdg1`).

---

## État d'avancement

| Phase | Contenu | État |
|---|---|---|
| 1 | Architecture, schéma complet, RLS, auth, multi-entreprises | **livrée** |
| 2 | Module A (opérations) | **livrée** |
| 3 | Modules B et E + compte de démo | à faire |
| 4 | Modules C et D | à faire |
| 5 | Prêt à vendre (F1-F5, F7-F10) | à faire |
| 6 | Sécurité, tests, performance, mise en production | à faire |

---

## Architecture

```
Navigateur (gérant / chef)  ─┐
Mobile agent (PWA, 5 langues) ├─► Vercel (Next.js, cdg1) ──► Supabase UE (Postgres + RLS, Auth, Storage)
Portail client (lien sécurisé)┘        │                         ▲
                                       ├─► Resend (e-mails)      │ Edge Functions + pg_cron
                                       ├─► Brevo (SMS)           │ (alertes, relances, file d'envoi)
                                       └─► Stripe (abonnements) ─┘ webhooks
```

**Principes**

1. **Multi-entreprises par `org_id`** : chaque table métier porte `org_id`. Les clés étrangères
   sont composites `(org_id, id)` : une vacation ne peut physiquement pas pointer vers le site
   d'une autre entreprise. `org_id` est immuable (déclencheur).
2. **RLS sur toutes les tables**, appuyée sur des fonctions `app.*` (`SECURITY DEFINER`,
   `search_path` vide) : `org_role`, `is_gerant`, `is_staff`, `can_manage_site` (zones du chef),
   `my_agent_id`, `agent_works_on_site_now`.
3. **Rôles** : `gerant` (tout), `chef_equipe` (planning, pointage, qualité, réclamations des
   sites de ses zones ; ni prix, ni factures, ni documents RH), `agent` (ses vacations, ses
   absences, ses messages ; codes d'accès d'un site uniquement pendant sa vacation),
   client final via **portail à lien** (jeton haché, accès serveur), super-admin via `platform_admins`.
4. **Le serveur ne contourne la RLS** (clé `service_role`) que pour : webhooks Stripe, portail
   client, liens SMS des agents, limitation de débit, numérotation des factures.
5. **Règles métier critiques en base** : double affectation interdite (contrainte d'exclusion
   GiST), facture émise figée (avoir obligatoire), numérotation sans trou, limites de forfait
   (blocage doux `PLAN_LIMIT_*`), journal d'audit automatique.
6. **RGPD / CNIL** : position GPS stockée uniquement dans `time_entries` au moment du pointage,
   aucun suivi continu ; hébergement UE ; table `gdpr_requests` pour export/suppression.

### Authentification

| Public | Méthode |
|---|---|
| Gérant | e-mail + mot de passe, confirmation par e-mail → `/bienvenue` crée l'entreprise et l'essai Pro 14 jours |
| Chef d'équipe / 2ᵉ gérant | invitation e-mail (jeton haché SHA-256, 7 jours) → `/invitation/[jeton]` |
| Agent | **lien magique par SMS** : Vacatio crée un compte technique (`{agent_id}@agents.vacatio.fr`, jamais contacté), génère le lien avec l'API admin Supabase et l'envoie via Brevo. L'agent peut redemander un lien sur `/agent/connexion` avec son numéro (réponse identique que le numéro soit connu ou non, limité à 3 demandes / 15 min). |
| Client final | lien de portail (phase 3) |
| Super-admin | compte gérant + ligne dans `platform_admins` |

L'entreprise active est mémorisée dans le cookie `vacatio_org` (un utilisateur peut appartenir à
plusieurs entreprises ; l'appartenance est revérifiée à chaque requête).

### Schéma de la base (`supabase/migrations/`)

| Migration | Tables |
|---|---|
| `0001_socle` | types énumérés, schéma `app`, utilitaires |
| `0002_multi_entreprises` | `organizations`, `profiles`, `memberships`, `zones`, `zone_managers`, `invitations`, `platform_admins`, `promo_codes`, `stripe_events`, `audit_log`, `notification_outbox`, `rate_limits`, `gdpr_requests`, `demo_requests`, `public_holidays` |
| `0003_operations` (A1-A5) | `clients`, `client_contacts`, `sites`, `site_access_codes`, `site_areas`, `site_tasks`, `service_contracts`, `contract_schedules`, `agents`, `agent_documents`, `agent_availabilities`, `agent_usual_sites`, `shifts`, `shift_changes`, `schedule_publications`, `site_checkpoints`, `time_entries`, `shared_devices`, `absences`, `replacement_offers`, `alerts` |
| `0004_qualite_finance_rh` (B, C, D) | `quality_grids`, `quality_grid_items`, `quality_inspections`, `quality_results`, `quality_photos`, `client_portal_links`, `complaints`, `complaint_events`, `complaint_photos`, `document_sequences`, `quotes`, `quote_lines`, `ad_hoc_services`, `invoices`, `invoice_lines`, `invoice_shifts`, `invoice_attachments`, `payments`, `invoice_reminders`, `payroll_exports`, `transfer_dossiers`, `transfer_dossier_agents`, `products`, `site_stock`, `stock_requests`, `stock_movements`, `messages`, `message_recipients` |
| `0005_fonctions_et_rls` | fonctions d'autorisation, politiques RLS, limites de forfait, audit, RPC `create_organization`, `accept_invitation`, `update_member`, `remove_member`, `next_document_number`, `check_rate_limit` |
| `0006_stockage` | 9 buckets privés, chemins `{org_id}/…`, politiques Storage |
| `0007_donnees_reference` | jours fériés 2026-2027, code `FONDATEUR` (-40 %, 10 utilisations) |
| `0008_rpc_publiques` | `is_platform_admin`, `effective_plan`, `set_my_locale` |

| `0009_operations_fonctions` | génération des récurrences (heure de Paris, changement d'heure), duplication de semaine, publication, suivi des changements, pointage `clock()`, remplacements, alertes de non-pointage et de documents |

Les règles de conformité (A6) sont dans `src/config/conformite/regles.ts` (fichier séparé, source
de chaque valeur indiquée), surchargeables par entreprise depuis `/app/conformite`.

### Module A (phase 2)

| Besoin | Où |
|---|---|
| A1 Clients, sites, consignes, codes d'accès, cahier des charges, contrats (heures vendues, prix), créneaux récurrents | `/app/clients`, `/app/sites/[id]` |
| A2 Agents, contrat, ancienneté, disponibilités, documents RH avec alerte d'expiration, sites habituels, lien SMS | `/app/agents`, `/app/agents/[id]` |
| A3 Planning jour / semaine / mois, par agent ou par site, glisser-déposer, génération depuis les contrats, copie de semaine, publication + SMS | `/app/planning` |
| A4 Pointage QR / NFC (même lien), position lue une seule fois, borne partagée, saisie par le chef, alerte à +15 min | `/agent/pointer`, `/borne/[jeton]`, `/app/pointages`, cron |
| A5 Déclaration d'absence (agent ou gérant), libération des vacations, suggestions classées, proposition SMS acceptée en un clic, traçabilité, heures facturables | `/agent/absence`, `/app/absences`, `/r/[jeton]` |
| A6 Repos 11 h, 10 h/jour, amplitude, 48 h et moyenne 44 h, repos hebdo 35 h, coupures selon le contrat, heures complémentaires, temps plein interdit au temps partiel | `src/lib/planning/conformite.ts`, `/app/conformite` |

Tâches planifiées (Vercel Cron, `vercel.json`) : `/api/cron/frequent` toutes les 5 min
(non-pointages, SMS de changement de planning, file d'envoi) et `/api/cron/quotidien`
(documents qui expirent, purge). Protégées par `CRON_SECRET`.

### Arborescence

```
vacatio/
├── supabase/
│   ├── config.toml
│   └── migrations/              schéma, RLS, stockage, données de référence
├── src/
│   ├── proxy.ts                 rafraîchit la session, protège /app /agent /admin
│   ├── app/
│   │   ├── (auth)/              connexion, inscription, mot de passe oublié/réinitialisation
│   │   ├── auth/                confirm (liens e-mail/SMS), callback (PKCE), deconnexion
│   │   ├── bienvenue/           création de l'entreprise + essai 14 jours
│   │   ├── invitation/[token]/  acceptation d'invitation
│   │   ├── app/                 back-office gérant / chef (layout, tableau de bord, équipe, entreprise)
│   │   ├── agent/               espace agent mobile + connexion SMS + choix de langue
│   │   └── admin/               super-admin (version minimale)
│   ├── components/ui/           composants shadcn/ui
│   ├── config/                  plans.ts (forfaits), roles.ts
│   ├── i18n/agent.ts            fr, en, pt, es, ar (RTL)
│   ├── lib/                     supabase/, auth/, validation/ (Zod), notifications, rate-limit, tokens
│   └── types/
└── tests/
    ├── db/                      Postgres réel (PGlite) : RLS, isolation, contraintes
    └── unit/                    forfaits, jetons, redirections, validation
```

---

## Installation

```bash
cd vacatio
npm install
cp .env.example .env.local        # puis remplir les clés
npm test                          # 61 tests (dont 40 sur une vraie base PostgreSQL, sans Docker)
npm run dev                       # http://localhost:3000
```

### Mettre en place Supabase (hébergé)

1. Créer un projet sur supabase.com, **région Europe West (Paris)**.
2. `npx supabase login` puis `npx supabase link --project-ref <ref>`.
3. `npm run db:push` (applique les 9 migrations).
4. Authentication → URL Configuration : *Site URL* = `NEXT_PUBLIC_APP_URL` ; *Redirect URLs* :
   `https://<domaine>/auth/confirm**` et `http://localhost:3000/auth/confirm**`.
5. Authentication → Email Templates (liens compatibles serveur, sans PKCE) :
   - *Confirm signup* : `<a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email">Confirmer mon adresse</a>`
   - *Reset password* : `<a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery">Choisir un nouveau mot de passe</a>`
   - *Magic link* : `<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink&next=/app">Me connecter</a>`
6. Authentication → SMTP : brancher Resend (le SMTP intégré de Supabase est limité à quelques e-mails/heure).
7. Se déclarer super-admin (SQL editor) : `insert into platform_admins (user_id) select id from auth.users where email = '<votre e-mail>';`
8. `npm run db:types` pour générer les types TypeScript de la base.

Développement 100 % local possible avec `npx supabase start` (nécessite Docker).

### Variables d'environnement

| Variable | Où | Rôle |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | public | URL de l'application (liens e-mail/SMS) |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | client Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | serveur | opérations privilégiées (jamais côté navigateur) |
| `RESEND_API_KEY`, `EMAIL_FROM` | serveur | e-mails (vide = affichage console) |
| `BREVO_API_KEY`, `SMS_SENDER` | serveur | SMS (vide = affichage console) |
| `AGENT_EMAIL_DOMAIN` | serveur | domaine technique des comptes agents |
| `CRON_SECRET` | serveur | protège les tâches planifiées |

### Déploiement Vercel

1. vercel.com → *Add New… → Project* → importer le dépôt GitHub.
2. *Root Directory* : `vacatio` (le framework Next.js est détecté).
3. *Settings → Git → Production Branch* : la branche qui porte Vacatio (aujourd'hui
   `claude/focused-faraday-gcx4ay`). Activer « Skip deployments when there are no changes to the
   root directory » pour ne pas redéployer à chaque modification du portfolio.
4. *Settings → Environment Variables* : toutes les variables ci-dessus + `CRON_SECRET`
   (`openssl rand -hex 32`). `NEXT_PUBLIC_APP_URL` = l'URL Vercel (puis le domaine personnalisé).
5. Supabase → Authentication → URL Configuration : ajouter `https://<projet>.vercel.app/auth/confirm**`.
6. Domaine personnalisé : *Settings → Domains*, puis mettre à jour `NEXT_PUBLIC_APP_URL` et Supabase.

**Tâches planifiées** : la tâche toutes les 5 minutes exige **Vercel Pro**. Sur l'offre gratuite
(Hobby), une tâche plus fréquente qu'une fois par jour fait échouer le déploiement : retirer
temporairement la ligne `/api/cron/frequent` de `vercel.json` (les alertes de non-pointage et les
SMS de changement de planning ne partiront alors plus automatiquement).

---

## Services payants

| Service | Gratuit pour démarrer ? | En production |
|---|---|---|
| Supabase | oui (projet mis en pause après 7 jours d'inactivité, pas de sauvegarde quotidienne) | **Pro ≈ 25 $/mois** obligatoire (sauvegardes, pas de pause) ; PITR en option payante |
| Vercel | Hobby gratuit mais **interdit l'usage commercial** | **Pro ≈ 20 $/mois** |
| Brevo SMS | non | **payant au SMS** (de l'ordre de 0,04 à 0,05 € HT en France) |
| Resend | oui (3 000 e-mails/mois) | payant au-delà |
| Stripe | pas d'abonnement | commission par paiement |
| WhatsApp (Twilio / Brevo) | non | payant par conversation + validation Meta (phase 4) |
| Sentry | oui (offre gratuite) | payant au-delà du quota |
| Nom de domaine | non | ≈ 10 €/an |

Les tarifs sont indicatifs : à vérifier sur le site de chaque fournisseur avant de s'engager.

---

## Points ouverts (signalés, pas de TODO cachés)

- **Types générés** : `src/types/database.ts` n'existe pas encore (nécessite un projet Supabase lié :
  `npm run db:types`). Les requêtes de la phase 1 sont typées à la main.
- **Règles de conformité à valider** (fichier `regles.ts`, mention « À VALIDER ») : nombre et durée
  des coupures pour les temps partiels, plafond des heures complémentaires (1/10 légal par défaut,
  la CCN peut aller au 1/3), plage des heures de nuit. Elles doivent être confirmées avec le texte
  de la convention ou un expert-comptable avant de vendre.
- **Géocodage** : adresse des sites et code postal des agents via la Base Adresse Nationale
  (service public gratuit). Domicile = centre de la commune, pas l'adresse exacte (minimisation RGPD).
- **NFC** : programmer une étiquette NFC avec le même lien que le QR code (indiqué sur l'affiche).
  Le lecteur NFC du téléphone ouvre le lien ; aucune lecture NFC « native » n'est faite par l'appli.
- **Stock et messages** côté agent : boutons grisés, livrés avec le module D (phase 4).
- **Écrans « bientôt »** dans le menu : modules des phases 3 à 5.
- **Pages légales** `/cgu` et `/confidentialite` : liées depuis l'inscription, rédigées en phase 5.
- **Super-admin** : liste des entreprises seulement ; MRR, utilisation, connexion « en tant que » en phase 5.
- **Jours fériés** : 2026-2027 en dur ; génération automatique annuelle en phase 4.
- **Captures des écrans connectés** non réalisées : elles nécessitent un projet Supabase réel.
