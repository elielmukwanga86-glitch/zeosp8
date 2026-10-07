// =====================================================================
// MODÈLE DE DOSSIER — à copier pour un nouveau projet
// =====================================================================
//   cp -r projets/_modele projets/projet-xxx
//   (éditer contenu.js et schemas.html, puis)  ./generer.sh projet-xxx
//
// Ce fichier montre TOUS les blocs disponibles. Garder ceux dont le projet a besoin.
// Règles de rédaction (détail dans README.md) :
//   - reprendre la documentation fournie par l'étudiant, sans inventer de faits, de chiffres
//     ni de résultats ; garder ses formulations (on corrige l'orthographe et la clarté) ;
//   - typographie française : espace insécable avant « : ; ? ! » et dans « 17 h », « 600 € » ;
//     apostrophe typographique (’), guillemets « », tiret demi-cadratin (–) dans les listes ;
//   - adresses IP internes réelles : JAMAIS en clair dans ce fichier (dépôt public).
//     Les écrire masquées : 192.168.x.x, 10.92.x.x, 172.x.x.x.
//
// Mise en forme dans le texte : **gras** et `code` (police mono sur fond gris).
// Un paragraphe P() qui se termine par « : » reste sur la même page que le bloc suivant.
// =====================================================================
const path = require('path');
const { createDoc } = require('../../lib/doc-lib');

const AUTHOR = 'Eliel Mukwanga';
const EDITION = 'Édition [mois année]';

const d = createDoc({
  // true : toute adresse IPv4 complète du texte devient 192.168.x.x (filet de sécurité).
  // false seulement pour un adressage fictif conçu pour un cas d'école (ex. projet-cloison).
  maskIps: true,
  imgDir: path.join(__dirname, 'img'),
  // Nom du PDF copié dans src/assets/docs/ du site. Vide : pas de publication.
  publication: '',
  // En-tête de toutes les pages sauf la couverture : code en orange, titre en gris, mention à droite.
  header: { code: 'PROJET MODÈLE', titre: 'SUJET EN QUELQUES MOTS', droite: 'DOCUMENTATION TECHNIQUE' },
  // Pied de page (le numéro « n / total » est ajouté automatiquement à droite).
  footer: `${AUTHOR}  ·  BTS SIO SISR  ·  ENSITECH`,
  // Propriétés du fichier (visibles dans le PDF).
  meta: {
    creator: AUTHOR,
    title: 'Projet Modèle — Titre complet du dossier',
    subject: 'Documentation technique — BTS SIO SISR',
    description: 'Une phrase qui résume le projet.',
    keywords: 'mots-clés, séparés, par des virgules',
  },
});

// Tous les blocs : on ne garde que ceux utilisés.
const {
  C, add, P, spacer, partOpener, h1, h2, annexe, bullets, steps, liens, code, callout, lettre, ligneRef,
  dataTable, kpis, timeline, chipGrid, figure,
} = d;

// ---------- Couverture (page 1) ----------
d.cover({
  image: 'cover.png', // décor pleine page rendu depuis schemas.html (#cover)
  imageAlt: 'Description courte du décor',
  surtitre: 'DOCUMENTATION TECHNIQUE  ·  BTS SIO OPTION SISR', // ou « DOSSIER DE RÉALISATION »
  projet: 'PROJET MODÈLE',
  titre: ['Titre sur deux', 'ou trois lignes courtes'], // une entrée = une ligne
  // tailleTitre: 76, interligneTitre: 860,  // valeurs par défaut ; 70 / 800 pour un titre plus long
  description: 'Deux lignes au plus : ce qui a été fait, avec quels outils, pour qui.',
  // retraitDescription: 2200,              // retrait à droite du paragraphe (twips)
  fiche: [['THÈME', 'Valeur'], ['SYSTÈME', 'Valeur'], ['OUTIL', 'Valeur'], ['PROTOCOLES', 'Valeur']],
  auteur: AUTHOR,
  infos: ['ENSITECH', EDITION],
  mention: 'Stage · Lieu · période   ·   Adresses IP masquées', // facultatif
});

// ---------- Fiche « En bref » (page 2) ----------
d.enBref({
  accroche: 'Une ou deux phrases qui disent l’essentiel du projet : le problème, la solution, le résultat.',
  cases: [ // 4 cases (2 × 2) ; **gras** et `code` acceptés
    ['Contexte', 'Où, quand, pour qui, quelle situation de départ.'],
    ['Objectif', 'Ce qui était demandé.'],
    ['Réalisation', 'Ce qui a été fait, étape par étape, en une phrase.'],
    ['Résultat', 'Ce qui fonctionne à la fin, ce qui reste à faire.'],
  ],
  chiffres: [['3', 'chiffre réel du projet'], ['2', 'autre chiffre'], ['1', 'pas de chiffre inventé'], ['4', 'quatre au plus']],
  titreDeroule: 'DÉROULÉ DU PROJET', // ou « DÉROULÉ DE LA MISSION »
  deroule: [['Étape 1', 'détail court'], ['Étape 2', 'détail court'], ['Étape 3', 'détail court'], ['Étape 4', 'détail court'], ['Bilan', 'la dernière étape est en noir']],
  competences: ['Domaine · outil', 'Réseau · VLAN', 'Documentation technique'],
});
// Le sommaire (page 3) est généré automatiquement à partir des parties et des titres.

// =====================================================================
// CORPS DU DOSSIER
// =====================================================================

// Partie : lettre, titre, phrase d'introduction. La partie A commence une nouvelle page.
add(partOpener('A', 'Contexte', 'Une phrase qui annonce le contenu de la partie.'));

// Titre de niveau 1 (numéroté 01, 02… et repris au sommaire) puis paragraphes.
add(h1(1, 'Présentation du projet'));
add(P('Paragraphe courant. Le **gras** met un mot en valeur, le `code` sert aux commandes, fichiers et valeurs techniques.'));
add(P('Options d’un paragraphe : `{ keepNext: true }` le garde avec le bloc suivant, `{ after: 100 }` réduit l’espace après, `{ size: 17, color: C.mut }` pour une petite mention grise.', { keepNext: true }));
add(P('Liste à puces :', { after: 100 }));
add(bullets(['Premier point.', 'Deuxième point avec `une commande`.', 'Troisième point.']));
add(callout('note', 'Point de départ', 'Encadré neutre : contexte, rappel, remarque.'));

add(h1(2, 'Architecture'));
add(h2('2.1', 'Schéma'));
add(P('Une figure est un PNG de img/ rendu depuis schemas.html ; le ratio vaut hauteur / largeur de l’élément HTML.', { keepNext: true }));
add(figure('schema.png', 360 / 1000, 'Légende de la figure'));
add(h2('2.2', 'Tableau'));
// dataTable(entêtes, lignes, largeurs relatives, options)
// options : plainFirst (1re colonne non grasse), monoCols: [1] (colonnes en police mono), allowSplit (tableau coupable)
add(dataTable(['Élément', 'Technologie', 'Rôle'], [
  ['Serveur', 'Debian 13', 'Héberge le service'],
  ['Réseau', '`192.168.x.x/24`', 'Adresse masquée'],
], [30, 30, 40]));

add(partOpener('B', 'Mise en œuvre', 'Les étapes, dans l’ordre où elles ont été réalisées.'));
add(h1(3, 'Installation'));
add(steps(['Étape numérotée 01.', 'Étape numérotée 02.', 'Étape numérotée 03.'])); // la numérotation repart à 01 à chaque steps()
add(code('bash', ['# Commentaire en gris', 'sudo apt update', 'ip addr', 'ping -c 4 192.168.x.x'], 'Légende du bloc de code'));
add(code('conf', ['# /etc/exemple.conf', 'Parametre=valeur'], 'Fichier de configuration'));
add(code('sql', ['CREATE DATABASE exemple;'], 'Requête SQL'));
add(code('logique', ['SI condition', 'ET autre condition', 'ALORS', '  → action'], 'Règle'));
add(code('powershell', ['Get-NetIPAddress', 'Test-NetConnection exemple.fr -Port 443'], 'Windows'));
add(callout('warn', 'Attention', 'Encadré orange : piège, prérequis, point de vigilance.'));
add(callout('ok', 'Résultat observé', 'Encadré vert : résultat vérifié, test réussi.'));

add(partOpener('C', 'Bilan', 'Résultats, chiffres et suite du projet.'));
add(h1(4, 'Résultats'));
add(kpis([['3', 'chiffre réel'], ['2', 'autre chiffre réel']]));
add(timeline([['Avant', 'situation de départ'], ['Pendant', 'mise en place'], ['Après', 'résultat']]));
add(chipGrid(['Groupe 1', 'Groupe 2', 'Groupe 3', 'Groupe 4'], 3));
add(h2('4.1', 'Devis et compte rendu'));
add(ligneRef('DEVIS N° 2026-000', 'du jj/mm/aaaa', 'Client · contact'));
add(dataTable(['Désignation', 'Qté', 'Total HT'], [['Matériel', '1', '0 €'], ['**Total HT**', '', '**0 €**']], [60, 15, 25], { plainFirst: true }));
add(lettre(['Bonjour Madame, Monsieur,', 'Compte rendu écrit pour l’utilisateur, sans jargon.', '–  **Point important** : une ligne qui commence par « – » est en retrait.', AUTHOR]));
add(spacer(120)); // espace vertical libre (en twips)

// Titre sans numéro (« — ») pour les références, en fin de dossier.
add(annexe('Références techniques'));
add(P('Ressources officielles :', { after: 100 }));
add(liens([['Documentation officielle', 'https://example.org/documentation']]));
add(callout('note', 'Confidentialité', 'Pour des raisons de confidentialité, la fin des adresses IP internes a été masquée (`x.x`).'));

// Pour un bloc sur mesure : d.docx donne accès aux classes docx (Paragraph, TextRun, Table…),
// d.rich(texte, options) au texte enrichi, d.boxTable([...], { fill }) à un encadré.

d.render();
