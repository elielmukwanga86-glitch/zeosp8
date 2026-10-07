'use strict';
/**
 * Compétences du référentiel BTS SIO utilisées par le tableau de synthèse.
 * Chaque réalisation (contenu/projets/*.js) liste les identifiants de ses compétences
 * dans `competencesBts`.
 */
module.exports = [
  {
    id: 'bloc1',
    titre: 'Bloc 1',
    intitule: 'Support et mise à disposition de services informatiques',
    competences: [
      { id: 'b1-patrimoine', nom: 'Gérer le patrimoine informatique' },
      { id: 'b1-incidents', nom: 'Répondre aux incidents et aux demandes d’assistance et d’évolution' },
      { id: 'b1-presence', nom: 'Développer la présence en ligne de l’organisation' },
      { id: 'b1-projet', nom: 'Travailler en mode projet' },
      { id: 'b1-service', nom: 'Mettre à disposition des utilisateurs un service informatique' },
      { id: 'b1-devpro', nom: 'Organiser son développement professionnel' },
    ],
  },
  {
    id: 'bloc2',
    titre: 'Bloc 2 · SISR',
    intitule: 'Administration des systèmes et des réseaux',
    competences: [
      { id: 'b2-concevoir', nom: 'Concevoir une solution d’infrastructure réseau' },
      { id: 'b2-installer', nom: 'Installer, tester et déployer une solution d’infrastructure réseau' },
      { id: 'b2-exploiter', nom: 'Exploiter, dépanner et superviser une solution d’infrastructure réseau' },
    ],
  },
];
