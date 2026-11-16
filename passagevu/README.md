# PassageVu — preuve de passage pour les sociétés de nettoyage

Un QR code par site. L’agent le scanne, coche ses tâches, photographie le lieu et valide.
Le client (syndic, gérant de bureaux) reçoit la preuve. Aucune application à installer.

- **Technique** : Next.js 16 (App Router) + TypeScript + Tailwind 4, Supabase (Postgres, Auth, Storage), Resend pour les e-mails, Vercel pour l’hébergement et les tâches planifiées.
- **Dossier** : tout le code de l’application est dans `passagevu/`. Le reste du dépôt est un autre projet, qu’il ne faut pas toucher.

---

## 1. Créer le projet Supabase (base de données)

1. Va sur **https://supabase.com/dashboard** et connecte-toi (bouton **Sign in**, avec GitHub par exemple).
2. Clique sur **New project**.
   - **Organization** : la tienne (créée automatiquement).
   - **Project name** : `passagevu`.
   - **Database password** : clique sur **Generate a password**, puis **copie-le dans un gestionnaire de mots de passe**. Tu en auras rarement besoin, mais il ne se récupère pas.
   - **Region** : choisis une région en Europe (par exemple **West EU (Paris)**), pour que les données restent dans l’UE.
   - Clique sur **Create new project** et attends environ 2 minutes.
3. Récupère les trois valeurs dont l’application a besoin :
   - Clique sur le bouton **Connect** en haut de la page du projet, puis copie l’**URL du projet** (`https://xxxx.supabase.co`).
   - Menu de gauche : **Project Settings** (roue dentée) → **API Keys** :
     - **Publishable key** (commence par `sb_publishable_`) : copie-la.
     - **Secret keys** → **+ New secret key** → nom `passagevu-serveur` → **Create**, puis copie la clé (commence par `sb_secret_`).
       ⚠️ Cette clé donne tous les droits sur ta base : ne la mets **jamais** dans un message, une capture ou un fichier committé.

> Les tables, la sécurité (RLS), les droits (GRANT) et les données de démonstration seront ajoutés à l’**étape 2**, avec des fichiers SQL fournis dans `supabase/migrations/`.

## 2. Mettre l’application en ligne avec Vercel

Le téléphone a besoin d’une adresse en **https** pour ouvrir l’appareil photo et la position : on teste donc directement sur Vercel.

1. Va sur **https://vercel.com/new** et connecte-toi avec **GitHub**.
2. Dans **Import Git Repository**, trouve le dépôt **zeosp8** et clique sur **Import**.
   (S’il n’apparaît pas : **Adjust GitHub App Permissions** → autorise ce dépôt.)
3. Sur l’écran de configuration :
   - **Project Name** : `passagevu`.
   - **Root Directory** : clique sur **Edit**, choisis le dossier **`passagevu`**, puis **Continue**.
   - **Framework Preset** : **Next.js** (détecté tout seul).
   - Ouvre **Environment Variables** et ajoute une par une les variables de `.env.example` :

     | Nom | Valeur |
     |---|---|
     | `NEXT_PUBLIC_SUPABASE_URL` | l’URL du projet Supabase |
     | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | la clé `sb_publishable_…` |
     | `SUPABASE_SECRET_KEY` | la clé `sb_secret_…` |
     | `AGENT_SESSION_SECRET` | une longue phrase aléatoire d’au moins 32 caractères (voir plus bas) |
     | `EMAIL_PROVIDER` | `console` pour l’instant |
     | `NEXT_PUBLIC_SITE_URL` | à remplir après le premier déploiement (étape 5 ci-dessous) |

   - Clique sur **Deploy**.
4. **Choisir la bonne branche.** Le code de PassageVu est sur la branche `claude/passagvu-v1-build-c5eiio`, et non sur la branche par défaut du dépôt.
   Dans le projet Vercel : **Settings** → **Environments** → **Production** → **Branch Tracking**, remplace la branche par `claude/passagvu-v1-build-c5eiio`, puis **Save**.
   Ensuite, va dans **Deployments**, ouvre le menu **⋯** du dernier déploiement et choisis **Redeploy**.
   (Les tâches planifiées de Vercel ne tournent qu’en production : ce réglage est nécessaire.)
5. Copie l’adresse de production (par exemple `https://passagevu.vercel.app`). Retourne dans **Settings** → **Environment Variables**, mets-la dans `NEXT_PUBLIC_SITE_URL`, puis fais **Redeploy**.

**Générer un secret** : sur Mac ou Linux, tape `openssl rand -base64 48` dans un terminal. Tu peux aussi utiliser un générateur de mots de passe (48 caractères, sans espace).

> ⚠️ Le plan gratuit **Hobby** de Vercel est réservé à un usage non commercial. Il suffit pour une démo ; pour de vrais clients payants, il faudra passer au plan Pro (ou à un autre hébergeur).

## 3. Vérifier l’installation sur ton téléphone

Ouvre `https://<ton-adresse-vercel>/sante` :

- les 4 premières lignes doivent être **vertes** ;
- la ligne **Base de données** restera rouge jusqu’à l’étape 2 (les tables n’existent pas encore) : c’est normal.

## 4. Travailler sur un ordinateur (facultatif)

Il faut Node.js 20.9 ou plus récent.

```bash
cd passagevu
cp .env.example .env.local   # puis remplis les valeurs
npm install
npm run dev                  # http://localhost:3000
```

Commandes utiles :

| Commande | Rôle |
|---|---|
| `npm run dev` | serveur de développement |
| `npm run build` | compilation de production |
| `npm test` | tests automatiques (Vitest) |
| `npm run typecheck` | vérification TypeScript |
| `npm run lint` | vérification du style du code |

## Organisation du code

```
passagevu/
├── src/app/             pages (chaque dossier = une adresse du site)
│   ├── (legal)/         mentions légales, confidentialité, CGU (textes à compléter)
│   └── sante/           page de diagnostic de l’installation
├── src/lib/             code partagé (Supabase, calcul de distance…)
│   └── supabase/        server.ts (gérant, avec RLS) · admin.ts (serveur seulement) · browser.ts
├── src/proxy.ts         rafraîchit la session du gérant et protège /gerant
├── tests/               tests automatiques
└── .env.example         liste des variables à configurer
```

## Sécurité : les principes

- **RLS** (sécurité par ligne) activée sur toutes les tables : un gérant ne lit que les lignes de **sa** société.
- **GRANT explicites** : depuis 2026, Supabase n’ouvre plus automatiquement les nouvelles tables à l’API. On donne les droits nécessaires au rôle `authenticated` (gérant connecté, toujours filtré par la RLS), et **aucun** au rôle `anon` (visiteur anonyme).
- Les agents, les clients et le public **n’accèdent jamais directement à la base** : ils passent par le serveur Next.js, qui vérifie le jeton du QR, le PIN ou le lien client avant de lire ou d’écrire.
- Photos dans des buckets **privés**, affichées avec des liens signés qui expirent.
