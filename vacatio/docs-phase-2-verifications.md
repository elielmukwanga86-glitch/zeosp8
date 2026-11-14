# Phase 2 — vérifications (module A)

Automatiques (passées ici) : `npm test` (61 tests), `npm run typecheck`, `npm run lint`, `npm run build`,
rendu du planning vérifié en capture (1440 px et 390 px, sans débordement de page).

À faire avec votre projet Supabase (`npm run db:push` d'abord, la migration 0009 est nouvelle) :

**Clients et sites**
1. `/app/clients` : créer un client, puis un site avec une vraie adresse → pas de message « adresse non localisée ».
2. Fiche du site : ajouter un code d'accès, deux zones, trois tâches, un contrat (prix horaire 25 €, 60 h/mois),
   puis un créneau lun-mar-jeu-ven 06:00–09:00 avec un agent habituel.
3. Créer un QR code, ouvrir « Imprimer le QR code ».

**Agents**
4. Créer 3 agents (dont un à 10 h/semaine) avec un mobile. Sur le forfait Découverte (essai expiré), le 4ᵉ est refusé avec le bouton « Passer au forfait supérieur ».
5. Ajouter un document « Titre de séjour » qui expire dans 10 jours → badge « À renouveler » dans la liste.
6. « Envoyer le lien de connexion par SMS » → SMS reçu (ou ligne `[sms:dev]` dans les logs Vercel si Brevo n'est pas configuré).

**Planning**
7. `/app/planning` → « Générer depuis les contrats » → vacations en pointillés (brouillons).
8. Glisser une vacation sur un autre agent ; placer un agent à 22:00 puis 06:00 le lendemain → refus « Repos de 8 h ».
9. Mettre 3 vacations le même jour à l'agent à 10 h/semaine → « 2 coupures (maximum 1) ».
10. « Copier sur la semaine suivante », puis « Publier » → les agents reçoivent un SMS « planning modifié » sous 5 à 7 minutes.

**Pointage**
11. Sur le téléphone de l'agent : scanner le QR code → « J'arrive » → coche verte. Dans `/app/pointages`, l'arrivée apparaît avec « QR ».
12. Pointer depuis l'accueil agent sans QR, loin du site → enregistré mais signalé (« Pointage à … m du site »).
13. Fiche site → « Créer une borne de pointage » → ouvrir le lien sur un autre téléphone → pointer un agent.
14. Laisser passer 15 min après le début d'une vacation sans pointage → alerte au tableau de bord + e-mail au gérant.

**Absences et remplacements**
15. Agent : « Je suis absent » (malade, aujourd'hui) → le gérant reçoit un e-mail ; la vacation passe « À pourvoir ».
16. `/app/absences` → « Trouver un remplaçant » → liste classée → « Proposer par SMS » à deux agents.
17. Le premier qui clique « J'accepte » obtient la vacation ; le second voit « un collègue a déjà pris cette vacation ».

**Conformité**
18. `/app/conformite` : passer « Heures complémentaires max. » à 0,33 → le planning accepte plus d'heures complémentaires.
