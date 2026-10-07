'use strict';
/**
 * MODÈLE — copier ce fichier en <slug>.js (sans le « _ ») pour ajouter une réalisation.
 * Les fichiers qui commencent par « _ » sont ignorés par le générateur.
 *
 * Deux formats :
 *   page: true   étude de cas complète (page dédiée + carte sur l’accueil)
 *   page: false  réalisation courte (ligne dépliable sur l’accueil, champ « details »)
 *
 * Syntaxe dans les textes : **gras**, `code`. Les espaces insécables (avant « : ; ? ! »,
 * entre un nombre et son unité) sont ajoutés automatiquement.
 *
 * Confidentialité : le dépôt est public. Toute adresse IP interne réelle doit être masquée
 * (ex. 192.168.x.x) ; le site refuse de se générer sinon.
 */
module.exports = {
  slug: 'mon-projet',            // nom du fichier et de la page : minuscules, chiffres, tirets
  ordre: 5,                      // position sur l’accueil et dans le tableau de synthèse
  page: false,

  nom: 'Mon projet',             // nom court (cartes, filtres, synthèse)
  titre: 'Titre descriptif de la réalisation',
  milieu: 'formation',           // 'professionnel' (stage) ou 'formation' (atelier, TP, projet d’école)
  cadre: { type: 'Atelier', organisation: 'ENSITECH', periode: 'octobre 2026', court: 'oct. 2026', annee: '2026' },
  filtre: 'Mon projet',          // libellé du bouton de filtre dans « Compétences »

  // Identifiants de contenu/referentiel.js (b1-patrimoine, b1-incidents, b1-presence, b1-projet,
  // b1-service, b1-devpro, b2-concevoir, b2-installer, b2-exploiter).
  competencesBts: [],

  // --- Réalisation courte (page: false) ---
  details: [
    'Ce que j’ai fait, une action par ligne.',
  ],

  // --- Étude de cas (page: true) : décommenter et remplir ---
  // accroche: 'Une phrase qui résume le projet.',
  // resume: 'Deux lignes pour la carte de l’accueil.',
  // intro: 'Le paragraphe d’introduction de la page.',
  // description: 'Description pour les moteurs de recherche (≈ 150 caractères).',
  // visuel: { src: 'img/mon-projet-visuel.webp', largeur: 1600, hauteur: 1000, alt: '…' },
  // chiffres: [['2', 'VLAN'], ['…', '…']],
  // technologies: ['…'],
  // fiche: [['Système', '…'], ['Outil', '…']],
  // documents: [{ titre: 'Documentation technique', fichier: 'docs/Mon-Projet.pdf', pages: 10, phrase: '…', description: '…' }],
  // sections: [
  //   { id: 'contexte', label: 'Contexte', titre: '…', blocs: [
  //     { p: 'Paragraphe.' },
  //     { titre: 'Sous-titre' },
  //     { liste: ['…', '…'] },
  //     { etapes: [['Étape', 'Détail'], ['…', '…']] },
  //     { figure: { src: 'img/….webp', largeur: 2000, hauteur: 1000, legende: '…', alt: '…' } },
  //     { code: { type: 'shell', label: '…', lignes: ['commande   # commentaire'] } },
  //     { tableau: { entetes: ['…', '…'], lignes: [['…', '…']] } },
  //     { encadre: { type: 'warn', titre: '…', texte: '…' } },   // type : 'warn' ou 'ok'
  //     { chiffres: 'projet' },                                   // reprend les chiffres du projet
  //     { lettre: ['Bonjour…', '…'] },
  //     { tags: ['…'] },
  //     { referentiel: true },                                    // compétences BTS du projet
  //   ] },
  // ],
};
