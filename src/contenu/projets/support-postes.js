'use strict';
/** Réalisation courte (sans page dédiée) : déploiement de postes et support pendant les stages en mairie. */
module.exports = {
  slug: 'support-postes',
  ordre: 4,
  page: false,

  nom: 'Support et postes',
  titre: 'Déploiement de postes et support utilisateurs',
  milieu: 'professionnel',
  cadre: { type: 'Stages', organisation: 'Mairie des Clayes-sous-Bois', periode: '2024–2026', court: '2024–2026' },
  filtre: 'Stages en mairie',

  details: [
    'Préparation, installation et configuration de postes Windows.',
    'Mise en service d’imprimantes réseau.',
    'Maintenance des postes informatiques et des équipements réseau.',
    'Diagnostic et résolution d’incidents matériels et logiciels auprès des utilisateurs.',
    'Assistance technique et support informatique de premier niveau.',
  ],

  competencesBts: ['b1-patrimoine', 'b1-incidents', 'b1-service'],
};
