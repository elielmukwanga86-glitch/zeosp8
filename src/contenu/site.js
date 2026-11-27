'use strict';
/**
 * Contenu général du portfolio.
 * Les projets sont dans contenu/projets/ (un fichier par projet).
 * Les sections « Veille » et « Certifications » n’apparaissent sur le site que lorsqu’elles ont du contenu.
 */
module.exports = {
  nom: 'Eliel Mukwanga',
  prenom: 'Eliel',
  nomFamille: 'Mukwanga',

  // URL publique du site (GitHub Pages). Sert aux balises de partage (Open Graph), au sitemap et à la page 404.
  url: 'https://elielmukwanga86-glitch.github.io/zeosp8/',

  formation: {
    diplome: 'BTS SIO',
    intitule: 'Services informatiques aux organisations',
    option: 'SISR',
    optionLong: 'Solutions d’infrastructure, systèmes et réseaux',
    annee: '2e année',
    ecole: 'ENSITECH',
    ville: 'Montigny-le-Bretonneux',
    promotion: '2025–2027',
  },

  // Affiché dans le bandeau de l’accueil (laisser vide pour afficher le statut).
  projetAnnuel: 'StadiumCompany · mission 2 validée',

  statut: { court: 'En formation initiale', detail: 'Ouvert à une proposition de stage' },

  accroche: 'Systèmes, réseaux, annuaire et supervision.',
  intro: 'Étudiant en deuxième année de BTS SIO option SISR à ENSITECH (Montigny-le-Bretonneux). Ce portfolio regroupe mes réalisations en stage et en formation, dont mon projet annuel StadiumCompany, mon parcours et mon tableau de synthèse.',
  description: 'Portfolio d’Eliel Mukwanga, en 2e année de BTS SIO option SISR à ENSITECH : réalisations, stages, compétences et tableau de synthèse.',

  contact: {
    email: 'elielmukwanga86@gmail.com',
    linkedin: { url: 'https://www.linkedin.com/in/eliel-mukwanga-505169388', libelle: 'in/eliel-mukwanga-505169388' },
    github: { url: 'https://github.com/elielmukwanga86-glitch', libelle: 'elielmukwanga86-glitch' },
    cv: { fichier: 'assets/docs/CV_Eliel_Mukwanga.pdf', libelle: 'PDF · 1 page' },
    phrase: 'Pour une question sur un projet ou une proposition de stage, vous pouvez m’écrire par e-mail.',
  },

  aPropos: {
    phrase: 'Je suis Eliel Mukwanga. Ce qui m’intéresse : déployer, superviser et **documenter** des infrastructures réseau.',
    paragraphes: [
      'Actuellement en **deuxième année de BTS SIO option SISR** à l’école ENSITECH, à Montigny-le-Bretonneux, je suis passionné par l’informatique, les innovations technologiques et les infrastructures réseau.',
      'Mes stages et mes projets m’ont permis d’acquérir des compétences en administration des systèmes et des réseaux, en support informatique, en virtualisation et en supervision avec Zabbix. Cette année, mon projet annuel StadiumCompany m’a fait déployer une infrastructure Windows Server complète : Active Directory sur deux contrôleurs, DNS, DHCP redondant, GPO et pare-feu pfSense.',
      'Rigoureux, autonome et curieux, je souhaite contribuer au bon fonctionnement et à l’évolution d’une infrastructure informatique.',
    ],
    fiche: [
      ['Formation', 'BTS SIO, option SISR', '2e année · ENSITECH'],
      ['Diplôme', 'Bac Pro SN, option RISC', 'Mention Bien · 2025'],
      ['Langues', 'Français', 'Anglais : intermédiaire'],
      ['Statut', 'En formation initiale', 'Ouvert à une proposition de stage'],
    ],
  },

  // Du plus récent au plus ancien. type : 'formation' | 'stage' | 'diplome'
  parcours: [
    {
      periode: '2025–2027', type: 'formation',
      titre: 'BTS SIO option SISR — 2e année',
      lieu: 'ENSITECH, Montigny-le-Bretonneux',
      description: 'Services informatiques aux organisations, option Solutions d’infrastructure, systèmes et réseaux.',
      missions: [
        'Projet annuel StadiumCompany (épreuve E5) : 14 missions de septembre à mai, menées seul.',
        'Mission 2 réalisée : Active Directory sur deux contrôleurs, DNS, DHCP en basculement, partages et GPO, 11 tests validés.',
      ],
      projet: 'stadiumcompany',
    },
    {
      periode: 'juil. – août 2026', type: 'stage',
      titre: 'Stage de 1re année de BTS — technicien informatique',
      lieu: 'Mairie des Clayes-sous-Bois (78)',
      missions: [
        'Installation d’un serveur de supervision Zabbix sur une VM Debian 13 hébergée sous VMware ESXi.',
        'Mise en place du service SSH pour administrer le serveur à distance.',
        'Découverte automatique des équipements en ICMP et SNMP, règles de découverte et actions de classement.',
        'Configuration des règles de pare-feu gérées par Active Directory pour autoriser les échanges entre Zabbix et les équipements.',
        'Préparation, installation et configuration de postes ; résolution d’incidents auprès des utilisateurs.',
      ],
      projet: 'projet-mairie',
    },
    {
      periode: 'déc. 2024 – janv. 2025', type: 'stage',
      titre: 'Stage de Bac Pro — technicien informatique',
      lieu: 'Mairie des Clayes-sous-Bois (78)',
      missions: [
        'Maintenance des postes informatiques et des équipements réseau.',
        'Préparation, installation et configuration de postes Windows.',
        'Assistance technique et support informatique de premier niveau.',
        'Mise en service d’imprimantes réseau ; suivi des équipements et services réseau.',
      ],
    },
    {
      periode: '2023–2025', type: 'diplome',
      titre: 'Bac Pro Systèmes Numériques, option RISC — mention Bien',
      lieu: 'Lycée Jean Moulin, Le Chesnay-Rocquencourt · obtenu en 2025',
      description: 'Réseaux informatiques et systèmes communicants.',
    },
  ],

  // contextes : identifiants (slug) des réalisations où la compétence a été mise en pratique.
  competences: [
    {
      domaine: 'Systèmes',
      items: [
        { nom: 'Windows 10 / 11', contextes: ['support-postes'] },
        { nom: 'Windows Server 2022', contextes: ['stadiumcompany'] },
        { nom: 'Windows 11 Entreprise', contextes: ['stadiumcompany'] },
        { nom: 'Debian 13', contextes: ['projet-mairie'] },
        { nom: 'Linux (Ubuntu)' },
        { nom: 'Active Directory', contextes: ['projet-mairie', 'stadiumcompany'] },
        { nom: 'GPO', contextes: ['stadiumcompany'] },
        { nom: 'Partages et droits NTFS (AGDLP)', contextes: ['stadiumcompany'] },
        { nom: 'PowerShell', contextes: ['stadiumcompany'] },
        { nom: 'VMware ESXi', contextes: ['projet-mairie'] },
        { nom: 'VMware Workstation', contextes: ['stadiumcompany'] },
        { nom: 'VirtualBox' },
      ],
    },
    {
      domaine: 'Réseaux',
      items: [
        { nom: 'TCP/IP', contextes: ['cisco-packet-tracer', 'projet-cloison'] },
        { nom: 'LAN / WAN', contextes: ['cisco-packet-tracer'] },
        { nom: 'VLAN', contextes: ['projet-mairie', 'projet-cloison', 'stadiumcompany'] },
        { nom: 'Adressage IPv4 · VLSM', contextes: ['cisco-packet-tracer', 'projet-cloison', 'projet-mairie', 'stadiumcompany'] },
        { nom: 'Routage statique', contextes: ['cisco-packet-tracer'] },
        { nom: 'RIP', contextes: ['cisco-packet-tracer'] },
        { nom: 'Switching', contextes: ['cisco-packet-tracer'] },
        { nom: 'DHCP (relais, basculement)', contextes: ['projet-cloison', 'stadiumcompany'] },
        { nom: 'DNS', contextes: ['stadiumcompany'] },
        { nom: 'pfSense', contextes: ['stadiumcompany'] },
        { nom: 'Wi-Fi', contextes: ['projet-cloison'] },
        { nom: 'SNMP', contextes: ['projet-mairie'] },
        { nom: 'SSH', contextes: ['projet-mairie'] },
      ],
    },
    {
      domaine: 'Supervision',
      items: [
        { nom: 'Zabbix', contextes: ['projet-mairie'] },
        { nom: 'MariaDB', contextes: ['projet-mairie', 'glpi-stadiumcompany'] },
        { nom: 'Apache + PHP', contextes: ['projet-mairie', 'glpi-stadiumcompany'] },
        { nom: 'Découverte automatique des équipements', contextes: ['projet-mairie'] },
        { nom: 'Supervision d’infrastructures', contextes: ['projet-mairie'] },
      ],
    },
    {
      domaine: 'Support informatique',
      items: [
        { nom: 'Préparation et déploiement de postes', contextes: ['support-postes'] },
        { nom: 'Installation et configuration de logiciels', contextes: ['support-postes'] },
        { nom: 'Diagnostic et résolution d’incidents', contextes: ['support-postes'] },
        { nom: 'Assistance utilisateurs', contextes: ['support-postes'] },
        { nom: 'Imprimantes réseau', contextes: ['support-postes'] },
        { nom: 'GLPI (gestion de parc et helpdesk)', contextes: ['glpi-stadiumcompany'] },
      ],
    },
    {
      domaine: 'Méthode',
      items: [
        { nom: 'Qualifier une demande', contextes: ['projet-cloison'] },
        { nom: 'Audit réseau en ligne de commande', contextes: ['projet-cloison'] },
        { nom: 'Devis', contextes: ['projet-cloison'] },
        { nom: 'Compte rendu client', contextes: ['projet-cloison'] },
        { nom: 'Plan de tests et recette', contextes: ['stadiumcompany'] },
        { nom: 'Documentation technique', contextes: ['projet-mairie', 'projet-cloison', 'stadiumcompany'] },
      ],
    },
    {
      domaine: 'Langues',
      items: [{ nom: 'Français' }, { nom: 'Anglais : intermédiaire' }],
    },
  ],

  // Veille technologique : la section apparaît dès qu’un thème ou un article est renseigné.
  // articles : { date: '2026-10', titre, source, url, resume }
  veille: { theme: '', description: '', articles: [] },

  // Compétences du bloc 1 pas encore couvertes par une réalisation : ce qui est prévu (affiché sur la
  // page de synthèse, sans cocher la compétence). Ne mettre que des faits ; retirer une entrée dès
  // qu’une réalisation la couvre.
  aCouvrir: {
    'b1-presence': 'Prévu dans le projet StadiumCompany : mission 12 (site Web de l’entreprise) et mission 13 (référencement du site).',
    'b1-devpro': 'Prévu dans le projet StadiumCompany : mission 14 (veille et projet professionnel). Déjà en place : mon identité professionnelle en ligne (ce portfolio, LinkedIn, GitHub et CV).',
  },

  // Certifications : { nom, organisme, date, url }
  certifications: [],
};
