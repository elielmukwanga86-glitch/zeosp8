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
| 2 | Module A (opérations) | à faire |
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

Les règles de conformité IDCC 3043 (A6) seront dans `src/config/conformite/` (fichier séparé et
modifiable, phase 2), avec surcharges possibles par entreprise (`organizations.compliance_overrides`).

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
npm test                          # 34 tests (dont 25 sur la base réelle, sans Docker)
npm run dev                       # http://localhost:3000
```

### Mettre en place Supabase (hébergé)

1. Créer un projet sur supabase.com, **région Europe West (Paris)**.
2. `npx supabase login` puis `npx supabase link --project-ref <ref>`.
3. `npm run db:push` (applique les 8 migrations).
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

### Déploiement Vercel

Importer le dépôt, *Root Directory* = `vacatio`, renseigner les variables ci-dessus. La région
des fonctions est fixée à Paris (`vercel.json`).

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
- **Pointage agent** : aucune insertion directe autorisée ; la RPC `clock_in/clock_out`
  (vérification QR + distance) arrive en phase 2.
- **Écrans « bientôt »** dans le menu : modules des phases 2 à 5 (affichés grisés, non cliquables).
- **Pages légales** `/cgu` et `/confidentialite` : liées depuis l'inscription, rédigées en phase 5.
- **Super-admin** : liste des entreprises seulement ; MRR, utilisation, connexion « en tant que » en phase 5.
- **Jours fériés** : 2026-2027 en dur ; génération automatique annuelle en phase 4.
- **Captures des écrans connectés** non réalisées : elles nécessitent un projet Supabase réel.
