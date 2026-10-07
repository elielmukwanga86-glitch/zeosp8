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

  statut: { court: 'En formation initiale', detail: 'Ouvert à une proposition de stage' },

  accroche: 'Systèmes, réseaux et supervision.',
  intro: 'Étudiant en deuxième année de BTS SIO option SISR à ENSITECH (Montigny-le-Bretonneux). Ce portfolio regroupe mes réalisations en stage et en formation, mon parcours et mon tableau de synthèse.',
  description: 'Portfolio d’Eliel Mukwanga, en 2e année de BTS SIO option SISR à ENSITECH : réalisations, stages, compétences et tableau de synthèse.',

  contact: {
    email: 'elielmukwanga86@gmail.com',
    linkedin: { url: 'https://www.linkedin.com/in/eliel-mukwanga-505169388', libelle: 'in/eliel-mukwanga-505169388' },
    github: { url: 'https://github.com/elielmukwanga86-glitch', libelle: 'elielmukwanga86-glitch' },
    phrase: 'Pour une question sur un projet ou une proposition de stage, vous pouvez m’écrire par e-mail.',
  },

  aPropos: {
    phrase: 'Je suis Eliel Mukwanga. Ce qui m’intéresse : déployer, superviser et **documenter** des infrastructures réseau.',
    paragraphes: [
      'Actuellement en **deuxième année de BTS SIO option SISR** à l’école ENSITECH, à Montigny-le-Bretonneux, je suis passionné par l’informatique, les innovations technologiques et les infrastructures réseau.',
      'Mes stages et mes projets m’ont permis d’acquérir des compétences en administration des systèmes et des réseaux, en support informatique, en virtualisation et en supervision avec Zabbix.',
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
        { nom: 'Windows Server' },
        { nom: 'Debian 13', contextes: ['projet-mairie'] },
        { nom: 'Linux (Ubuntu)' },
        { nom: 'Active Directory', contextes: ['projet-mairie'] },
        { nom: 'VMware ESXi', contextes: ['projet-mairie'] },
        { nom: 'VirtualBox' },
      ],
    },
    {
      domaine: 'Réseaux',
      items: [
        { nom: 'TCP/IP', contextes: ['cisco-packet-tracer', 'projet-cloison'] },
        { nom: 'LAN / WAN', contextes: ['cisco-packet-tracer'] },
        { nom: 'VLAN', contextes: ['projet-mairie', 'projet-cloison'] },
        { nom: 'Adressage IPv4', contextes: ['cisco-packet-tracer', 'projet-cloison', 'projet-mairie'] },
        { nom: 'Routage statique', contextes: ['cisco-packet-tracer'] },
        { nom: 'RIP', contextes: ['cisco-packet-tracer'] },
        { nom: 'Switching', contextes: ['cisco-packet-tracer'] },
        { nom: 'DHCP', contextes: ['projet-cloison'] },
        { nom: 'Wi-Fi', contextes: ['projet-cloison'] },
        { nom: 'SNMP', contextes: ['projet-mairie'] },
        { nom: 'SSH', contextes: ['projet-mairie'] },
      ],
    },
    {
      domaine: 'Supervision',
      items: [
        { nom: 'Zabbix', contextes: ['projet-mairie'] },
        { nom: 'MariaDB', contextes: ['projet-mairie'] },
        { nom: 'Apache + PHP (interface web Zabbix)', contextes: ['projet-mairie'] },
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
      ],
    },
    {
      domaine: 'Méthode',
      items: [
        { nom: 'Qualifier une demande', contextes: ['projet-cloison'] },
        { nom: 'Audit réseau en ligne de commande', contextes: ['projet-cloison'] },
        { nom: 'Devis', contextes: ['projet-cloison'] },
        { nom: 'Compte rendu client', contextes: ['projet-cloison'] },
        { nom: 'Documentation technique', contextes: ['projet-mairie', 'projet-cloison'] },
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

  // Certifications : { nom, organisme, date, url }
  certifications: [],
};
