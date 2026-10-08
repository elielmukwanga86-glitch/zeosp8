'use strict';
/** Réalisation : supervision Zabbix à la mairie des Clayes-sous-Bois (stage, juillet–août 2026). */
module.exports = {
  slug: 'projet-mairie',
  ordre: 1,
  page: true,

  nom: 'Projet Mairie',
  titre: 'Supervision Zabbix en mairie',
  accroche: 'Un serveur Zabbix qui découvre les équipements de la mairie et commence à les classer par type.',
  resume: 'Installation de Zabbix 7.4 sur une VM Debian 13 (VMware ESXi), supervision ICMP et SNMP, règles de découverte par réseau et actions de classement automatique.',
  intro: 'Pendant mon stage de première année, j’ai installé Zabbix 7.4 sur une VM Debian 13 hébergée sous VMware ESXi. J’ai ensuite mis en place la découverte automatique en ICMP et SNMP, puis commencé à classer les équipements trouvés sur les réseaux de la mairie.',
  description: 'Étude de cas : installation de Zabbix 7.4 sur Debian 13 (VMware ESXi) à la mairie des Clayes-sous-Bois, découverte automatique ICMP / SNMP et classement des équipements.',

  // milieu : 'professionnel' (stage) ou 'formation' (atelier, TP, projet d’école)
  milieu: 'professionnel',
  anneeBts: 1,                // stage de 1re année (tableau de synthèse E4)
  cadre: { type: 'Stage', organisation: 'Mairie des Clayes-sous-Bois', periode: 'juillet – août 2026', court: 'juil. – août 2026', annee: '2026' },
  filtre: 'Projet Mairie',

  visuel: {
    src: 'img/mairie-visuel.webp', largeur: 1600, hauteur: 999,
    alt: 'Illustration : le serveur Zabbix au centre et les neuf VLAN recensés de la mairie.',
  },
  chiffres: [
    ['≈ 169', 'hôtes découverts lors des essais'],
    ['9', 'VLAN recensés'],
    ['9', 'groupes d’équipements'],
    ['2', 'protocoles : ICMP et SNMP'],
  ],
  technologies: ['Zabbix 7.4', 'Debian 13', 'VMware ESXi', 'SNMP', 'MariaDB', 'Active Directory'],
  fiche: [['Hyperviseur', 'VMware ESXi'], ['Système', 'Debian 13'], ['Supervision', 'Zabbix 7.4'], ['Protocoles', 'ICMP · SNMP']],

  // Correspondance avec le référentiel (contenu/referentiel.js), utilisée par le tableau de synthèse.
  competencesBts: ['b1-patrimoine', 'b1-incidents', 'b1-service', 'b2-installer', 'b2-exploiter'],

  documents: [{
    titre: 'Documentation technique',
    fichier: 'docs/Projet-Mairie_Supervision-Zabbix.pdf',
    pages: 19,
    phrase: 'Toute l’installation, commande par commande.',
    description: 'Plan d’adressage, installation, base de données, SNMP, découverte, tests et dépannage. La fin des adresses IP internes de la mairie est masquée (x.x).',
  }],

  sections: [
    {
      id: 'contexte', label: 'Contexte', titre: 'Une administration encore manuelle',
      blocs: [
        { p: 'Pendant mon stage de juillet–août 2026 à la **mairie des Clayes-sous-Bois**, j’ai mis en place une solution de supervision centralisée de l’infrastructure informatique. Le parc est réparti sur plusieurs réseaux (VLAN) : serveurs, données, VoIP, caméras, école, libre-service… Jusque-là, il était surtout administré à la main.' },
        { titre: 'Objectifs' },
        { liste: [
          'Installer Debian 13 sur une machine virtuelle VMware ESXi et y déployer le serveur Zabbix.',
          'Mettre en place la supervision ICMP et SNMP.',
          'Découvrir automatiquement les équipements présents sur les différents réseaux.',
          'Classer automatiquement les équipements par type : PC, switch, serveur, caméra, antenne, hyperviseur, imprimante / copieur, routeur…',
          'Identifier les imprimantes et copieurs à partir d’informations SNMP et de leur nom.',
        ] },
      ],
    },
    {
      id: 'architecture', label: 'Architecture', titre: 'Un serveur au centre, les VLAN de la mairie autour',
      blocs: [
        { p: 'Le serveur Zabbix tourne dans une VM Debian 13 sur l’hyperviseur VMware ESXi. Il interroge les équipements en ICMP (disponibilité) et en SNMP (UDP 161), enregistre les résultats dans MariaDB et les affiche dans l’interface web, servie par Apache et PHP.' },
        { figure: {
          src: 'img/mairie-architecture.webp', largeur: 2000, hauteur: 1200,
          legende: 'Architecture de la solution de supervision',
          alt: 'Schéma : les équipements supervisés (switches, serveurs, imprimantes, caméras, postes) sont interrogés en ICMP et SNMP par le serveur Zabbix, installé dans une VM Debian 13 sur VMware ESXi avec MariaDB, Apache + PHP et l’agent Zabbix.',
        } },
      ],
    },
    {
      id: 'demarche', label: 'Ma démarche', titre: 'De la VM au serveur opérationnel',
      blocs: [
        { etapes: [
          ['Créer la VM Debian 13 sous VMware ESXi', 'Ressources, carte réseau connectée au réseau qui permet d’atteindre les VLAN supervisés, adresse IP fixe, puis installation de SSH pour administrer le serveur à distance.'],
          ['Installer Zabbix 7.4 depuis le dépôt officiel', 'Serveur Zabbix, interface web (Apache + PHP), agent Zabbix et base MariaDB avec un utilisateur dédié.'],
          ['Configurer la supervision SNMP', 'Communauté SNMP, tests avec `snmpwalk` et ouverture des flux sur le pare-feu géré par Active Directory.'],
          ['Créer les règles et les actions de découverte', 'Une règle par réseau à analyser, puis des actions qui créent l’hôte, l’ajoutent au bon groupe et lui associent un modèle.'],
          ['Organiser, tester, dépanner', 'Groupes d’équipements, tests de validation, gestion des doublons et diagnostic réseau étape par étape.'],
        ] },
        { figure: {
          src: 'img/mairie-snmp.webp', largeur: 2000, hauteur: 662,
          legende: 'Interrogation SNMP d’un équipement par le serveur Zabbix',
          alt: 'Schéma : le serveur Zabbix envoie une requête SNMP (UDP 161) à un équipement, qui répond avec les valeurs des OID : disponibilité, interfaces, trafic, informations système, compteurs.',
        } },
      ],
    },
    {
      id: 'decouverte', label: 'Découverte automatique', titre: 'Ne plus ajouter les équipements à la main',
      blocs: [
        { p: 'Zabbix analyse régulièrement des plages d’adresses IP. Chaque réponse ICMP ou SNMP crée un événement de découverte, puis une action décide quoi faire de l’équipement.' },
        { figure: {
          src: 'img/mairie-decouverte.webp', largeur: 2000, hauteur: 858,
          legende: 'Chaîne de découverte, de la plage IP à l’action',
          alt: 'Schéma en six étapes : plage IP, test ICMP, test SNMP, collecte des informations, événement de découverte, action (créer l’hôte, l’ajouter au groupe, lier le modèle, poser les tags).',
        } },
        { code: { type: 'logique', label: 'Exemple de logique d’action', lignes: [
          'SI équipement découvert',
          'ET Discovery status = Up',
          'ET information SNMP = équipement réseau',
          'ALORS',
          '  → créer / activer l’hôte',
          '  → l’ajouter au groupe Switch ou Routeur',
          '  → lier le modèle correspondant',
        ] } },
        { p: 'Les imprimantes et les copieurs répondent au ping mais n’ont pas d’agent Zabbix : pour les reconnaître, je me suis appuyé sur un OID SNMP et sur le nom de l’hôte.' },
      ],
    },
    {
      id: 'resultats', label: 'Résultats', titre: 'Une vue d’ensemble du parc',
      blocs: [
        { chiffres: 'projet' },
        { liste: [
          'Serveur Zabbix opérationnel sur une VM Debian 13 hébergée sous VMware ESXi.',
          'Supervision ICMP et SNMP en place, avec la découverte automatique de plusieurs réseaux.',
          'Classement automatique en groupes mis en place pour les principaux types d’équipements, encore à finaliser pour les autres.',
          'Imprimantes et copieurs pris en compte grâce à l’identification SNMP.',
        ] },
      ],
    },
    {
      id: 'difficulte', label: 'Diagnostic', titre: 'Diagnostiquer un problème de passerelle',
      blocs: [
        { encadre: { type: 'warn', titre: 'Difficulté rencontrée', texte: 'Pendant la mise en place, la connexion vers la passerelle posait problème alors que le serveur DNS répondait. J’ai vérifié chaque étape dans l’ordre : l’interface, l’adresse IP, la route par défaut, la passerelle, le DNS, puis l’accès aux réseaux supervisés.' } },
        { code: { type: 'shell', label: 'Diagnostic pas à pas', lignes: [
          'ip addr                 # l’interface et l’adresse',
          'ip route                # la route par défaut',
          'ping -c 4 <passerelle>',
          'ping -c 4 <serveur DNS>',
        ] } },
      ],
    },
    {
      id: 'evolutions', label: 'Évolutions', titre: 'Ce que j’ajouterais ensuite',
      blocs: [
        { liste: [
          'Finaliser la classification automatique de tous les types d’équipements.',
          'Configurer des alertes et des notifications adaptées.',
          'Passer en SNMPv3 lorsque les équipements le permettent.',
          'Créer des tableaux de bord par service ou par type d’équipement.',
          'Superviser plus finement les serveurs avec Zabbix agent 2 et sauvegarder régulièrement la base.',
        ] },
      ],
    },
    {
      id: 'competences', label: 'Compétences', titre: 'Ce que le projet m’a fait pratiquer',
      blocs: [
        { tags: ['Virtualisation · VMware ESXi', 'Administration Linux · Debian', 'SSH', 'Zabbix 7.4', 'SNMP · ICMP', 'VLAN · adressage IPv4', 'Pare-feu · Active Directory', 'MariaDB', 'Apache + PHP', 'Diagnostic réseau', 'Documentation technique'] },
        { referentiel: true },
      ],
    },
  ],
};
