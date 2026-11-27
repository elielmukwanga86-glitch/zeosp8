'use strict';
/**
 * Réalisation courte : serveur GLPI du laboratoire StadiumCompany (projet annuel, mission 7 en cours).
 * L'adresse 172.20.2.135 appartient au plan fictif 172.20.0.0/22 du cahier des charges (publiable).
 * Ne jamais publier les mots de passe du labo.
 */
module.exports = {
  slug: 'glpi-stadiumcompany',
  ordre: 4,
  page: false,

  nom: 'GLPI StadiumCompany',
  titre: 'Serveur GLPI pour StadiumCompany',
  milieu: 'formation',
  cadre: { type: 'Projet annuel (épreuve E5)', organisation: 'StadiumCompany · ENSITECH', periode: 'novembre 2026', court: 'Nov. 2026', annee: '2026' },
  filtre: 'GLPI',

  details: [
    'Création d’une VM Debian (SRV-GLPI) dans le VLAN Serveurs du laboratoire StadiumCompany, à l’adresse `172.20.2.135`.',
    'Installation de la pile web : Apache, MariaDB et PHP avec les extensions demandées par GLPI.',
    'Création d’une base de données et d’un utilisateur dédiés, puis installation de GLPI en français.',
    'Accès à l’interface en HTTPS, avec un certificat auto-signé, sur `glpi.stadiumcompany.com`.',
    'Première étape de la mission 7 (gestion de parc et helpdesk) ; la prochaine est la liaison avec l’Active Directory (LDAP).',
  ],


  preuves: {
    'b1-service': { activite: 'Installation de GLPI sur une VM Debian (Apache, MariaDB, PHP), accessible en HTTPS sur `glpi.stadiumcompany.com`.' },
  },
  competencesBts: ['b1-service', 'b2-installer'],
};
