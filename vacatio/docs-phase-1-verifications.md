# Phase 1 — vérifications à faire de votre côté

Automatiques (déjà passées ici) :
- [x] `npm test` : 34 tests (isolation entre entreprises, rôles, double affectation, limites de forfait, factures figées, invitations, audit, RLS sur toutes les tables)
- [x] `npm run typecheck`, `npm run lint`, `npm run build`
- [x] Pages publiques sans défilement horizontal à 1440 px et 390 px

Manuelles (avec votre projet Supabase) :
1. `npm run db:push` passe sans erreur ; dans Table Editor, chaque table affiche « RLS enabled ».
2. Inscription sur `/inscription` → e-mail reçu → clic → `/bienvenue` → « Créer mon espace » → `/app` avec le bandeau « Essai gratuit : 14 jours restants ».
3. `/app/entreprise` : saisir un SIRET de 13 chiffres → message d'erreur ; saisie correcte → « Informations enregistrées ».
4. `/app/equipe` : inviter une 2ᵉ adresse en chef d'équipe → e-mail reçu → ouvrir le lien en navigation privée → créer le compte (sans nom d'entreprise demandé) → rejoindre → le menu n'affiche pas « Entreprise » ni la finance.
5. Avec un 2ᵉ compte gérant (autre entreprise) : il ne voit rien de la 1ʳᵉ.
6. Agent (SQL editor, en attendant l'écran Agents de la phase 2) :
   `insert into agents (org_id, first_name, last_name, phone, weekly_contract_hours) values ('<org_id>', 'Test', 'Agent', '+336XXXXXXXX', 24);`
   puis `/agent/connexion` avec ce numéro → SMS (ou console si `BREVO_API_KEY` vide) → lien → `/agent` ; changer la langue en arabe → affichage de droite à gauche.
7. Ouvrir `/app` en étant agent → redirection vers `/agent`. Ouvrir `/admin` sans être super-admin → 404.
8. 10 connexions ratées de suite → « Trop de tentatives ».
