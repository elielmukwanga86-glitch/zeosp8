'use strict';
/**
 * Compétences du référentiel BTS SIO utilisées par le tableau de synthèse.
 * Bloc 1 : intitulés et activités repris mot pour mot de l’annexe 6-1
 * « Tableau de synthèse des réalisations professionnelles — Épreuve E4 ».
 * Chaque réalisation (contenu/projets/*.js) liste les identifiants de ses compétences
 * dans `competencesBts`.
 */
module.exports = [
  {
    id: 'bloc1',
    titre: 'Bloc 1',
    epreuve: 'Épreuve E4',
    intitule: 'Support et mise à disposition de services informatiques',
    competences: [
      { id: 'b1-patrimoine', nom: 'Gérer le patrimoine informatique', activites: [
        'Recenser et identifier les ressources numériques',
        'Exploiter des référentiels, normes et standards adoptés par le prestataire informatique',
        'Mettre en place et vérifier les niveaux d’habilitation associés à un service',
        'Vérifier les conditions de la continuité d’un service informatique',
        'Gérer des sauvegardes',
        'Vérifier le respect des règles d’utilisation des ressources numériques',
      ] },
      { id: 'b1-incidents', nom: 'Répondre aux incidents et aux demandes d’assistance et d’évolution', activites: [
        'Collecter, suivre et orienter des demandes',
        'Traiter des demandes concernant les services réseau et système, applicatifs',
        'Traiter des demandes concernant les applications',
      ] },
      { id: 'b1-presence', nom: 'Développer la présence en ligne de l’organisation', activites: [
        'Participer à la valorisation de l’image de l’organisation sur les médias numériques en tenant compte du cadre juridique et des enjeux économiques',
        'Référencer les services en ligne de l’organisation et mesurer leur visibilité',
        'Participer à l’évolution d’un site Web exploitant les données de l’organisation',
      ] },
      { id: 'b1-projet', nom: 'Travailler en mode projet', activites: [
        'Analyser les objectifs et les modalités d’organisation d’un projet',
        'Planifier les activités',
        'Évaluer les indicateurs de suivi d’un projet et analyser les écarts',
      ] },
      { id: 'b1-service', nom: 'Mettre à disposition des utilisateurs un service informatique', activites: [
        'Réaliser les tests d’intégration et d’acceptation d’un service',
        'Déployer un service',
        'Accompagner les utilisateurs dans la mise en place d’un service',
      ] },
      { id: 'b1-devpro', nom: 'Organiser son développement professionnel', activites: [
        'Mettre en place son environnement d’apprentissage personnel',
        'Mettre en œuvre des outils et stratégies de veille informationnelle',
        'Gérer son identité professionnelle',
        'Développer son projet professionnel',
      ] },
    ],
  },
  {
    id: 'bloc2',
    titre: 'Bloc 2 · SISR',
    epreuve: 'Épreuve E5',
    intitule: 'Administration des systèmes et des réseaux',
    competences: [
      { id: 'b2-concevoir', nom: 'Concevoir une solution d’infrastructure réseau' },
      { id: 'b2-installer', nom: 'Installer, tester et déployer une solution d’infrastructure réseau' },
      { id: 'b2-exploiter', nom: 'Exploiter, dépanner et superviser une solution d’infrastructure réseau' },
    ],
  },
];
