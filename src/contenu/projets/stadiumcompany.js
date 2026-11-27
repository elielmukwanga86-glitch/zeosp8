'use strict';
/**
 * Réalisation : projet annuel StadiumCompany (épreuve E5, ENSITECH, 2026-2027).
 * Mission 2 réalisée en laboratoire VMware : pfSense, deux contrôleurs de domaine, DNS, DHCP avec
 * basculement, annuaire, partages et GPO, 11 tests validés.
 * Le plan d'adressage 172.20.0.0/22 est celui d'une entreprise fictive (cahier des charges) : il peut
 * être publié tel quel (voir la liste blanche de src/build.js).
 */
module.exports = {
  slug: 'stadiumcompany',
  ordre: 1,
  page: true,

  nom: 'Projet StadiumCompany',
  titre: 'Annuaire, DNS et DHCP redondants pour StadiumCompany',
  accroche: 'Deux contrôleurs de domaine, un DHCP qui bascule et des droits qui passent par les groupes : la mission 2 du projet annuel, testée de bout en bout.',
  resume: 'Projet fil rouge de 2e année. J’ai monté le laboratoire sous VMware : pfSense entre trois VLAN, deux contrôleurs de domaine Windows Server 2022, neuf étendues DHCP en basculement, annuaire, partages et GPO. Onze tests sur onze validés.',
  intro: 'StadiumCompany est une organisation fictive qui exploite un stade, une billetterie et un magasin. Ce projet annuel suit 14 missions, de septembre à mai. Pour la mission 2, j’ai construit seul, à partir de zéro, l’infrastructure Windows de l’entreprise dans un laboratoire VMware : routage et filtrage avec pfSense, annuaire Active Directory sur deux serveurs, DNS, DHCP redondant, partages et stratégies de groupe. J’ai ensuite validé le tout avec onze scénarios de test.',
  description: 'Étude de cas : projet annuel StadiumCompany (BTS SIO SISR) — pfSense, Active Directory sur deux contrôleurs, DNS, DHCP en basculement, partages AGDLP et GPO, 11 tests validés.',

  milieu: 'formation',
  cadre: { type: 'Projet annuel (épreuve E5)', organisation: 'ENSITECH', periode: 'octobre – novembre 2026', court: 'Oct. – nov. 2026', annee: '2026' },
  filtre: 'Projet StadiumCompany',
  synthese: { periode: 'oct. – nov. 2026' },
  productions: [
    'Plan d’adressage VLSM 172.20.0.0/22',
    'Scripts PowerShell de déploiement (AD, DNS, DHCP, GPO)',
    'Rapport de tests de la mission 2 (11 scénarios)',
  ],

  documents: [{
    titre: 'Dossier Redondance',
    fichier: 'docs/StadiumCompany_Redondance.pdf',
    pages: 9,
    phrase: 'Deux contrôleurs, un DNS répliqué, un DHCP qui bascule.',
    description: 'Second contrôleur de domaine, DNS intégré à Active Directory, basculement DHCP Hot Standby, relais pfSense et tests de panne.',
  }],

  visuel: {
    src: 'img/stadium-visuel.webp', largeur: 1600, hauteur: 1000,
    alt: 'Illustration : pfSense au centre relie le WAN et les VLAN Serveurs, Admin et Équipes ; SRV-DC01 et SRV-DC02 sont reliés par la réplication et le basculement.',
  },
  chiffres: [
    ['11 / 11', 'tests validés'],
    ['2', 'contrôleurs de domaine'],
    ['9', 'étendues DHCP, une par VLAN'],
    ['14', 'comptes utilisateurs dans 7 services'],
  ],
  technologies: ['Windows Server 2022', 'Active Directory', 'DNS', 'DHCP', 'GPO', 'pfSense', 'VMware Workstation', 'PowerShell'],
  fiche: [['Domaine', 'stadiumcompany.com'], ['Serveurs', 'Windows Server 2022'], ['Pare-feu', 'pfSense CE 2.9'], ['Tests', '11 sur 11 validés']],

  competencesBts: ['b1-patrimoine', 'b1-incidents', 'b1-service', 'b2-concevoir', 'b2-installer', 'b2-exploiter'],

  sections: [
    {
      id: 'contexte', label: 'Contexte', titre: 'Un projet fil rouge sur toute l’année',
      blocs: [
        { p: 'StadiumCompany exploite trois sites : le stade, la billetterie et le magasin. Le cahier des charges de l’école découpe le projet en **14 missions progressives**, qui servent de réalisations pour l’épreuve E5. Je le mène **seul**, et je suis reparti de zéro en octobre avec un nouveau plan d’adressage.' },
        { p: 'La mission 2 demande de déployer les services d’infrastructure : annuaire Active Directory pour le domaine `stadiumcompany.com`, DNS primaire et secondaire, DHCP par VLAN, structure de l’annuaire, partages, profils et GPO, puis de tout tester.' },
        { titre: 'Avancement du projet' },
        { missions: [
          [1, 'Restructuration de l’infrastructure réseau', 'cours', 'Plan VLSM conçu, maquette Packet Tracer en cours'],
          [2, 'Services d’infrastructure (AD, DNS, DHCP, GPO)', 'fait', '11 tests sur 11 validés'],
          [3, 'Administration à distance et VPN entre sites', 'avenir'],
          [4, 'Redondance et tolérance de panne', 'avenir'],
          [5, 'Accès Internet sécurisé et DMZ', 'avenir'],
          [6, 'Wi-Fi employés et visiteurs', 'avenir'],
          [7, 'Gestion de parc et helpdesk (GLPI)', 'cours', 'Serveur GLPI installé ; liaison avec l’Active Directory à faire'],
          [8, 'Supervision open source', 'avenir'],
          [9, 'Supervision et annuaire LDAP', 'avenir'],
          [10, 'SIEM et détection des incidents', 'avenir'],
          [11, 'Sauvegarde et restauration (Bacula)', 'avenir'],
          [12, 'Site Web de l’entreprise', 'avenir'],
          [13, 'Référencement du site', 'avenir'],
          [14, 'Veille et projet professionnel', 'avenir'],
        ] },
      ],
    },
    {
      id: 'adressage', label: 'Plan d’adressage', titre: 'Un /22 découpé au plus juste',
      blocs: [
        { p: 'Le cahier des charges impose la plage `172.20.0.0/22` et la méthode VLSM. Comme il ne donne pas les effectifs, j’ai fixé des hypothèses par service, puis attribué les sous-réseaux du plus grand au plus petit. Il reste 172 adresses libres pour la suite (la future DMZ ira en `172.20.3.128/25`).' },
        { tableau: {
          entetes: ['VLAN', 'Service', 'Réseau', 'Passerelle', 'Hôtes'],
          mono: [2, 3], droite: [4],
          lignes: [
            ['30', 'Wi-Fi', '172.20.0.0/24', '172.20.0.1', '254'],
            ['20', 'Équipes', '172.20.1.0/25', '172.20.1.1', '126'],
            ['40', 'Caméras', '172.20.1.128/25', '172.20.1.129', '126'],
            ['10', 'Administration', '172.20.2.0/26', '172.20.2.1', '62'],
            ['50', 'VIP / Presse', '172.20.2.64/26', '172.20.2.65', '62'],
            ['80', 'Serveurs', '172.20.2.128/27', '172.20.2.129', '30'],
            ['70', 'Restaurant', '172.20.2.160/27', '172.20.2.161', '30'],
            ['60', 'Fournisseurs', '172.20.2.192/27', '172.20.2.193', '30'],
            ['110', 'Billetterie', '172.20.2.224/27', '172.20.2.225', '30'],
            ['120', 'Magasin', '172.20.3.0/27', '172.20.3.1', '30'],
          ],
        } },
        { p: 'Les petits réseaux (gestion des équipements en /28 et /29, liaisons entre sites en /30) complètent le plan. Les adresses .2 et .3 de chaque VLAN du stade sont réservées pour la redondance de passerelle de la mission 4.' },
      ],
    },
    {
      id: 'architecture', label: 'Architecture', titre: 'Le laboratoire sous VMware',
      blocs: [
        { p: 'Toutes les machines tournent sur ma tour, dans VMware Workstation. Chaque VLAN est simulé par un **segment LAN** isolé. pfSense joue le rôle du routeur : il relie les segments, filtre les flux et relaie les demandes DHCP vers les deux serveurs.' },
        { figure: {
          src: 'img/stadium-architecture.webp', largeur: 2000, hauteur: 1200,
          legende: 'Architecture du laboratoire de la mission 2',
          alt: 'Schéma : pfSense relié à Internet par le NAT de VMware et à trois segments (Serveurs, Admin, Équipes). SRV-DC01 et SRV-DC02 sont sur le segment Serveurs, reliés par la réplication et le basculement DHCP. CLI-01 est sur le segment Équipes et reçoit son adresse par le relais DHCP.',
        } },
        { tableau: {
          entetes: ['Machine', 'Système', 'Adresse', 'Rôle'],
          mono: [2],
          lignes: [
            ['pfSense', 'pfSense CE 2.9', '172.20.2.129 · .2.1 · .1.1', 'Routage, filtrage, relais DHCP'],
            ['SRV-DC01', 'Windows Server 2022', '172.20.2.132', 'AD DS, DNS, DHCP actif, partages'],
            ['SRV-DC02', 'Windows Server 2022', '172.20.2.133', 'AD DS, DNS répliqué, DHCP de secours'],
            ['CLI-01', 'Windows 11 Entreprise', 'DHCP', 'Poste de test joint au domaine'],
          ],
        } },
      ],
    },
    {
      id: 'deploiement', label: 'Déploiement', titre: 'Du pare-feu au poste client',
      blocs: [
        { etapes: [
          ['Installer et configurer pfSense', 'Quatre cartes réseau (WAN en NAT, puis Serveurs, Admin, Équipes), adresses des interfaces, règles de pare-feu par segment et relais DHCP vers les deux serveurs.'],
          ['Créer la forêt stadiumcompany.com', 'SRV-DC01 sous Windows Server 2022 : adresse fixe, rôle AD DS et DNS, création de la forêt en PowerShell.'],
          ['Configurer le DNS', 'Quatre zones de recherche inversée, redirecteurs vers Internet, enregistrements des équipements réseau.'],
          ['Configurer le DHCP', 'Neuf étendues, une par VLAN, avec plages d’exclusion, passerelle, DNS, suffixe et une réservation.'],
          ['Ajouter un second contrôleur', 'SRV-DC02 promu dans le domaine existant ; DNS répliqué par Active Directory et basculement DHCP en mode Hot Standby.'],
          ['Structurer l’annuaire et les partages', 'Unités d’organisation, groupes, 14 comptes, dossiers des services, dossiers personnels et profils itinérants.'],
          ['Appliquer les GPO', 'Politique de mots de passe et de verrouillage, restrictions des postes, sécurité et lecteurs réseau.'],
          ['Joindre un poste et tester', 'CLI-01 sous Windows 11 Entreprise rejoint le domaine, puis je déroule les onze scénarios de test.'],
        ] },
        { code: { type: 'shell', label: 'Extrait — création d’une étendue DHCP (PowerShell)', lignes: [
          'Add-DhcpServerv4Scope -Name "V20-EQUIPES" -StartRange 172.20.1.1 -EndRange 172.20.1.126 -SubnetMask 255.255.255.128',
          'Add-DhcpServerv4ExclusionRange -ScopeId 172.20.1.0 -StartRange 172.20.1.1 -EndRange 172.20.1.10',
          'Set-DhcpServerv4OptionValue -ScopeId 172.20.1.0 -Router 172.20.1.1',
          'Add-DhcpServerv4Failover -Name "FO-DC01-DC02" -PartnerServer "srv-dc02.stadiumcompany.com" -ServerRole Active',
        ] } },
      ],
    },
    {
      id: 'annuaire', label: 'Annuaire et droits', titre: 'Des droits qui passent par les groupes',
      blocs: [
        { p: 'J’ai appliqué la méthode **AGDLP** : les comptes vont dans un groupe global par service (`GG_Equipes`…), ces groupes entrent dans des groupes de domaine local (`DL_Partage-Equipes_RW`…), et seuls ces derniers reçoivent des droits NTFS. Aucun droit n’est donné à un compte individuel.' },
        { tableau: {
          entetes: ['Élément', 'Contenu'],
          lignes: [
            ['Unités d’organisation', 'Utilisateurs (7 services), Ordinateurs (Stade, Billetterie, Magasin), Groupes, Serveurs, Comptes-Admin'],
            ['Comptes', '14 comptes `prenom.nom`, mot de passe à changer à la première connexion'],
            ['Partage Services (S:)', 'Un dossier par service ; énumération basée sur l’accès : chacun ne voit que le sien'],
            ['Partage Commun (P:)', 'Lecteur distribué à tous sauf aux prestataires et à la presse (ciblage GPO)'],
            ['Dossier personnel (H:)', 'Un dossier par compte, droits pour son seul propriétaire'],
            ['Profils', 'Profils itinérants stockés sur le serveur'],
          ],
        } },
        { titre: 'Stratégies de groupe' },
        { liste: [
          '**Mots de passe** : 12 caractères minimum, complexité, historique de 24, verrouillage après 5 échecs pendant 15 minutes.',
          '**Restrictions utilisateurs** : panneau de configuration, invite de commandes et éditeur du Registre bloqués ; écran de veille verrouillé après 10 minutes.',
          '**Sécurité des postes** : stockage USB bloqué, message d’avertissement à l’ouverture de session, pare-feu forcé sur tous les profils.',
          '**Lecteurs réseau** : S: et P: distribués par les préférences de GPO, avec ciblage par groupe.',
        ] },
      ],
    },
    {
      id: 'tests', label: 'Tests', titre: 'Onze scénarios, onze réussites',
      blocs: [
        { p: 'J’ai réalisé chaque test avec une capture d’écran datée. Le cahier des charges fixe un indicateur clé : un poste branché sur n’importe quel VLAN doit obtenir une configuration complète sans intervention manuelle.' },
        { tableau: {
          entetes: ['N°', 'Test', 'Résultat obtenu'],
          lignes: [
            ['1', 'DHCP par le relais (VLAN Équipes)', 'Adresse 172.20.1.11/25, passerelle, DNS et suffixe reçus'],
            ['2', 'DHCP sur un autre VLAN (Admin)', 'Adresse 172.20.2.12/26 ; la .11 est bien réservée'],
            ['3', 'Première connexion d’un utilisateur', 'Changement de mot de passe imposé'],
            ['4', 'Lecteurs H:, S: et P:', 'Présents ; seul le dossier Équipes est visible dans S:'],
            ['5', 'Accès au dossier d’un autre service', 'Refusé'],
            ['6', 'Invite de commandes', 'Bloquée par la GPO'],
            ['7', 'GPO appliquées (`gpresult /r`)', 'Les deux GPO utilisateur sont listées'],
            ['8', 'DNS direct et inverse', 'Les deux résolutions répondent'],
            ['9', 'Verrouillage du compte', 'Verrouillé après 5 échecs, puis déverrouillé'],
            ['10', 'Arrêt du DHCP de SRV-DC01', 'Adresse attribuée par SRV-DC02'],
            ['11', 'SRV-DC01 éteint', 'Ouverture de session authentifiée par `\\\\SRV-DC02`'],
          ],
        } },
        { chiffres: 'projet' },
      ],
    },
    {
      id: 'difficultes', label: 'Difficultés', titre: 'Ce qui n’a pas marché du premier coup',
      blocs: [
        { encadre: { type: 'warn', titre: 'Le premier ping échouait', texte: 'Le serveur répondait « hôte de destination injoignable ». La VM pfSense était simplement éteinte : depuis, je démarre toujours le routeur avant les serveurs.' } },
        { encadre: { type: 'warn', titre: 'Commande introuvable sur SRV-DC02', texte: '`Install-WindowsFeature` n’était pas reconnue. J’avais ouvert PowerShell ISE en version x86 (32 bits), où le module ServerManager n’existe pas. La version 64 bits a réglé le problème.' } },
        { encadre: { type: 'warn', titre: 'Le lecteur P: n’apparaissait pas', texte: 'Le ciblage de la GPO indiquait « est membre de GG_Fournisseurs ET de GG_VIP-Presse » : personne ne recevait le lecteur. Il fallait « n’est pas membre ». Le `gpresult /r` m’a aidé à le voir.' } },
        { encadre: { type: 'note', titre: 'Le basculement DHCP n’est pas instantané', texte: 'Juste après l’arrêt du service sur SRV-DC01, le poste a d’abord pris une adresse en 169.254 : SRV-DC02 n’avait pas encore constaté la panne. Quelques instants plus tard, il a répondu et le poste a retrouvé la même adresse.' } },
      ],
    },
    {
      id: 'limites', label: 'Limites', titre: 'Ce que j’améliorerais',
      blocs: [
        { liste: [
          'Les partages sont hébergés sur SRV-DC01 : si ce serveur tombe, l’authentification continue grâce à SRV-DC02, mais plus les fichiers. Un serveur de fichiers dédié ou une réplication DFS réglerait ce point.',
          'La GPO bloque l’invite de commandes, mais pas PowerShell.',
          'Le compte Administrateur est encore générique : la mission 3 prévoit des comptes d’administration nominatifs.',
          'Le laboratoire VMware ne simule que trois VLAN ; les dix VLAN, les commutateurs Cisco et les trois sites sont traités dans Packet Tracer (missions 1, 3 et 4).',
        ] },
      ],
    },
    {
      id: 'competences', label: 'Compétences', titre: 'Ce que le projet m’a fait pratiquer',
      blocs: [
        { tags: ['Windows Server 2022', 'Active Directory', 'DNS', 'DHCP · basculement', 'GPO', 'AGDLP · droits NTFS', 'pfSense', 'VLSM', 'VMware Workstation', 'PowerShell', 'Plan de tests', 'Diagnostic'] },
        { referentiel: true },
      ],
    },
  ],
};
