// =====================================================================
// Projet Mairie — supervision centralisée avec Zabbix (stage de BTS SIO SISR)
// Contenu du dossier. La mise en page vient de ../../lib/doc-lib.js.
// Génération : ./generer.sh projet-mairie (depuis outils/documentation)
//
// Dépôt public : les adresses IP internes de la mairie sont écrites masquées
// (deux premiers octets, puis x.x ; 172.x.x.x pour la plage 172.168). maskIps
// reste activé en filet de sécurité si une adresse complète était ajoutée par erreur.
// =====================================================================
const path = require('path');
const { createDoc } = require('../../lib/doc-lib');

const AUTHOR = 'Eliel Mukwanga';
const EDITION = 'Édition octobre 2026';
const MAIRIE = 'la mairie des Clayes-sous-Bois';
const STAGE = 'Stage · Mairie des Clayes-sous-Bois · juillet – août 2026';

const d = createDoc({
  maskIps: true,
  imgDir: path.join(__dirname, 'img'),
  publication: 'Projet-Mairie_Supervision-Zabbix.pdf', // copié dans src/assets/docs/ du portfolio
  header: { code: 'PROJET MAIRIE', titre: 'SUPERVISION ZABBIX', droite: 'DOCUMENTATION TECHNIQUE' },
  footer: `${AUTHOR}  ·  BTS SIO SISR  ·  ENSITECH`,
  meta: {
    creator: AUTHOR,
    title: 'Projet Mairie — Supervision centralisée avec Zabbix',
    subject: 'Documentation technique — BTS SIO SISR',
    description: 'Déploiement de Zabbix 7.4 sur Debian 13 (VMware ESXi), découverte ICMP/SNMP et classement des équipements.',
    keywords: 'Zabbix, Debian 13, VMware ESXi, SNMP, ICMP, supervision, BTS SIO SISR',
  },
});
const { add, P, spacer, partOpener, h1, h2, annexe, bullets, steps, liens, code, callout, dataTable, kpis, chipGrid, figure } = d;

// ---------- Couverture ----------
d.cover({
  image: 'cover.png',
  imageAlt: 'Topologie stylisée des réseaux supervisés',
  surtitre: 'DOCUMENTATION TECHNIQUE  ·  BTS SIO OPTION SISR',
  projet: 'PROJET MAIRIE',
  titre: ['Supervision centralisée', 'de l’infrastructure', 'municipale avec Zabbix'],
  description: 'Déploiement de Zabbix 7.4 sur une VM Debian 13 hébergée sous VMware ESXi, découverte automatique ICMP / SNMP et classement des équipements sur les réseaux de la mairie.',
  fiche: [['HYPERVISEUR', 'VMware ESXi'], ['SYSTÈME', 'Debian 13'], ['SUPERVISION', 'Zabbix 7.4'], ['PROTOCOLES', 'ICMP · SNMP']],
  auteur: AUTHOR,
  infos: ['ENSITECH', EDITION],
  mention: `${STAGE}   ·   Adresses IP masquées`,
});

// ---------- En bref ----------
d.enBref({
  accroche: 'Passer d’une administration principalement manuelle à une supervision centralisée : un serveur Zabbix qui découvre automatiquement les équipements de la mairie et commence à les classer par type.',
  cases: [
    ['Contexte', `Stage de juillet – août 2026 à ${MAIRIE} : une infrastructure répartie sur plusieurs VLAN (serveurs, données, VoIP, caméras, école…), administrée jusque-là principalement à la main.`],
    ['Objectif', 'Centraliser la supervision avec Zabbix et automatiser la détection, l’identification et le classement des équipements.'],
    ['Réalisation', 'VM Debian 13 sous VMware ESXi administrée en SSH, Zabbix 7.4 avec MariaDB et Apache + PHP, flux ouverts sur le pare-feu (Active Directory), règles de découverte ICMP / SNMP, actions de classement, identification des imprimantes / copieurs par OID.'],
    ['Résultat', 'Environ 169 hôtes découverts lors des essais ; classement automatique en groupes mis en place pour les principaux types d’équipements, à finaliser pour les autres. Tout est consultable depuis une interface web unique.'],
  ],
  chiffres: [['≈ 169', 'hôtes découverts lors des essais'], ['9', 'VLAN recensés'], ['9', 'groupes d’équipements'], ['2', 'protocoles : ICMP et SNMP']],
  titreDeroule: 'DÉROULÉ DU PROJET',
  deroule: [['VM Debian 13', 'VMware ESXi, adresse fixe, SSH'], ['Zabbix 7.4', 'Dépôt officiel, MariaDB, Apache + PHP'], ['SNMP', 'Communauté SNMP, pare-feu, snmpwalk'], ['Découverte', 'Règles par VLAN, actions de classement'], ['Validation', 'Tests, dépannage, doublons']],
  competences: ['Virtualisation · VMware ESXi', 'Administration Linux · Debian, SSH', 'Supervision · Zabbix, ICMP, SNMP', 'Réseau · VLAN, adressage IPv4', 'Pare-feu · Active Directory', 'Base de données · MariaDB', 'Diagnostic et dépannage', 'Documentation technique'],
});

// =====================================================================
// CORPS DU DOSSIER
// =====================================================================
// PARTIE A
add(partOpener('A', 'Contexte et architecture', 'Pourquoi superviser, avec quels outils, et sur quels réseaux.'));
add(h1(1, 'Présentation du projet'));
add(P(`L’objectif du projet, réalisé pendant mon stage de juillet – août 2026, est de mettre en place une solution de supervision centralisée de l’infrastructure informatique de ${MAIRIE}. La solution retenue est **Zabbix**, installé sur une machine virtuelle **Debian 13** hébergée sur **VMware ESXi**.`));
add(P('La supervision doit permettre de détecter automatiquement les équipements présents sur les différents réseaux, de vérifier leur disponibilité, de récupérer des informations via SNMP lorsque cela est possible et d’organiser automatiquement les équipements découverts dans des groupes adaptés.'));
add(P('Les objectifs principaux sont :', { after: 100, keepNext: true }));
add(bullets([
  'Installer Debian 13 sur une machine virtuelle VMware ESXi.',
  'Déployer et configurer le serveur Zabbix.',
  'Mettre en place la supervision ICMP et SNMP.',
  'Découvrir automatiquement les équipements présents sur les différents réseaux.',
  'Créer des règles et des actions de découverte.',
  'Classer automatiquement les équipements dans des groupes : PC, switch, serveur, caméra, antenne, hyperviseur, imprimante / copieur, routeur, etc.',
  'Superviser les équipements réseau et les serveurs.',
  'Identifier les imprimantes / copieurs à partir d’informations SNMP et de leur nom.',
]));
add(callout('note', 'Point de départ', 'Le projet s’appuie sur une procédure d’installation fournie au départ, rédigée pour Ubuntu 24.04. Elle a été adaptée à l’environnement réellement utilisé : Debian 13, VMware ESXi et supervision multi-réseaux.'));

add(h1(2, 'Architecture et environnement technique'));
add(P('Le serveur Zabbix est hébergé sous forme de machine virtuelle sur l’hyperviseur VMware ESXi. Il centralise les informations remontées par les équipements supervisés.', { keepNext: true }));
add(dataTable(['Élément', 'Technologie', 'Rôle'], [
  ['Hyperviseur', 'VMware ESXi', 'Héberge la VM Zabbix'],
  ['Machine virtuelle', 'Debian 13', 'Système d’exploitation du serveur'],
  ['Supervision', 'Zabbix 7.4', 'Collecte, stockage et visualisation'],
  ['Supervision réseau', 'SNMP', 'Récupération d’informations sur les équipements'],
  ['Disponibilité', 'ICMP', 'Vérification de la présence d’un équipement'],
  ['Base de données', 'MariaDB (compatible MySQL)', 'Stockage des données Zabbix'],
  ['Web', 'Apache + PHP', 'Interface d’administration et de supervision'],
], [26, 30, 44]));
add(h2('2.1', 'Schéma logique'));
add(P('Les équipements sont interrogés par ICMP et SNMP ; le serveur Zabbix stocke les résultats dans sa base de données et les restitue dans l’interface web.', { keepNext: true }));
add(figure('arch.png', 1800 / 3000, 'Architecture de la solution de supervision'));

add(h1(3, 'Plan d’adressage et réseaux supervisés'));
add(P('Le serveur Zabbix utilise l’adresse IP fournie pour le projet. Les plages ci-dessous correspondent aux réseaux pris en compte lors de la configuration de la découverte.', { keepNext: true }));
add(dataTable(['VLAN', 'Plage / adresse indiquée', 'Usage'], [
  ['VLAN 1', '`10.92.x.x`', 'Management'],
  ['VLAN 50', '`192.168.x.x/24`', 'Serveurs'],
  ['VLAN 100', '`172.x.x.x`', 'VoIP'],
  ['VLAN 101', '`192.168.x.x`', 'Données'],
  ['VLAN 102', '`192.168.x.x`', 'Événement'],
  ['VLAN 106', '`192.168.x.x`', 'Gestion des accès'],
  ['VLAN 200', '`192.168.x.x`', 'Libre-service'],
  ['VLAN 300', '`10.0.x.x`', 'Caméras'],
  ['VLAN 72', '`192.168.x.x`', 'École'],
], [22, 40, 38]));
add(h2('3.1', 'Adressage du serveur Zabbix'));
add(dataTable(['Paramètre', 'Valeur'], [
  ['Adresse du serveur Zabbix', '`192.168.x.x/24`'],
  ['Passerelle', '`192.168.x.x`'],
  ['DNS', '`192.168.x.x`'],
], [45, 55]));

// PARTIE B
add(partOpener('B', 'Installation', 'De la machine virtuelle au serveur Zabbix opérationnel.'));
add(h1(4, 'Installation de Debian 13 sur VMware ESXi'));
add(P('Le serveur Zabbix est installé dans une machine virtuelle créée sur VMware ESXi. Debian fournit un environnement Linux stable pour héberger le serveur de supervision.'));
add(h2('4.1', 'Création de la machine virtuelle'));
add(steps([
  'Créer une nouvelle machine virtuelle dans VMware ESXi.',
  'Choisir Debian 64 bits comme système invité.',
  'Attribuer les ressources CPU, mémoire et stockage nécessaires au serveur de supervision.',
  'Connecter la carte réseau virtuelle au réseau permettant au serveur d’atteindre les différents VLAN supervisés.',
  'Monter l’image ISO de Debian 13.',
  'Démarrer la VM et lancer l’installation de Debian.',
]));
add(h2('4.2', 'Installation de Debian'));
add(steps([
  'Sélectionner la langue et la disposition du clavier.',
  'Configurer le nom du serveur.',
  'Configurer le réseau avec l’adresse prévue pour le serveur Zabbix.',
  'Définir la passerelle et le DNS.',
  'Créer le compte administrateur nécessaire à l’administration du serveur.',
  'Partitionner le disque selon les besoins de la VM.',
  'Installer le système de base et les composants nécessaires.',
  'Redémarrer la VM après l’installation.',
]));
add(spacer(120));
add(code('bash', ['# Vérification de l’adresse IP', 'ip addr', '', '# Vérification de la route par défaut', 'ip route', '', '# Test de la passerelle', 'ping -c 4 192.168.x.x', '', '# Test du DNS', 'ping -c 4 192.168.x.x'], 'Vérifications après installation'));

add(h1(5, 'Configuration réseau de Debian'));
add(P('Le serveur Zabbix doit disposer d’une adresse fixe afin que les équipements soient supervisés de manière fiable et que l’interface web reste accessible à la même adresse.'));
add(P('Paramètres utilisés pour le projet :', { after: 100, keepNext: true }));
add(bullets(['IP : `192.168.x.x/24`', 'Passerelle : `192.168.x.x`', 'DNS : `192.168.x.x`']));
add(spacer(100));
add(code('conf', ['# /etc/network/interfaces  (exemple, nom d’interface à adapter : ip link)', 'auto ens192', 'iface ens192 inet static', '    address 192.168.x.x/24', '    gateway 192.168.x.x', '', '# /etc/resolv.conf', 'nameserver 192.168.x.x'], 'Adresse statique'));
add(code('bash', ['# Appliquer la configuration (coupe une session SSH si l’adresse change)', 'sudo systemctl restart networking'], 'Prise en compte'));
add(P('Après modification de la configuration réseau, vérifier la connectivité vers la passerelle, le serveur DNS et les réseaux nécessaires à la supervision.'));
add(h2('5.1', 'Administration à distance (SSH)'));
add(P('Le service SSH a été installé et configuré afin d’administrer le serveur à distance, sans passer par la console de l’hyperviseur.', { keepNext: true }));
add(code('bash', ['sudo apt install openssh-server', 'sudo systemctl enable --now ssh', 'sudo systemctl status ssh'], 'Service SSH'));

add(h1(6, 'Déploiement du serveur Zabbix'));
add(P('Zabbix est installé à partir du dépôt officiel afin d’utiliser les paquets maintenus par l’éditeur. La documentation officielle recommande ces paquets plutôt que ceux, potentiellement plus anciens, fournis par la distribution.'));
add(h2('6.1', 'Préparation du système'));
add(code('bash', ['sudo apt update', 'sudo apt upgrade -y'], 'Mise à jour'));
add(P('Le paquet de dépôt Zabbix dépend de la version de Debian et de la version de Zabbix retenue. La page officielle de téléchargement génère la commande adaptée ; pour Zabbix 7.4 sur Debian 13 :'));
add(code('bash', ['wget https://repo.zabbix.com/zabbix/7.4/release/debian/pool/main/z/\\', 'zabbix-release/zabbix-release_latest_7.4+debian13_all.deb', 'sudo dpkg -i zabbix-release_latest_7.4+debian13_all.deb', 'sudo apt update'], 'Ajout du dépôt officiel'));
add(h2('6.2', 'Installation des composants'));
add(P('L’installation comprend le serveur Zabbix, l’interface web, la base de données, le serveur web et l’agent, qui permet au serveur de se superviser lui-même.', { keepNext: true }));
add(code('bash', ['sudo apt install zabbix-server-mysql zabbix-frontend-php \\', '    zabbix-apache-conf zabbix-sql-scripts zabbix-agent', 'sudo apt install mariadb-server'], 'Paquets'));
add(callout('warn', 'Attention', 'Les noms exacts des paquets PHP et des services peuvent dépendre de la version de Debian et du paquet Zabbix sélectionné. Utiliser les paquets générés par le dépôt officiel correspondant à l’environnement. Sous Debian, le serveur de base de données fourni est MariaDB (paquet `mariadb-server`), compatible avec le paquet `zabbix-server-mysql`.'));

add(h1(7, 'Configuration de la base de données'));
add(P('La base de données stocke la configuration de Zabbix ainsi que les données collectées. Un utilisateur dédié est créé afin que Zabbix n’utilise pas le compte root.', { keepNext: true }));
add(code('sql', ['sudo mysql -uroot -p', '', 'CREATE DATABASE zabbix CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;', 'CREATE USER \'zabbix\'@\'localhost\' IDENTIFIED BY \'MOT_DE_PASSE\';', 'GRANT ALL PRIVILEGES ON zabbix.* TO \'zabbix\'@\'localhost\';', 'SET GLOBAL log_bin_trust_function_creators = 1;', 'QUIT;'], 'Création de la base et de l’utilisateur'));
add(h2('7.1', 'Import du schéma Zabbix'));
add(code('bash', ['# Zabbix 7.2 et suivants : schéma dans /usr/share/zabbix/sql-scripts', '# (vérifier avec : dpkg -L zabbix-sql-scripts)', 'zcat /usr/share/zabbix/sql-scripts/mysql/server.sql.gz | \\', '    mysql --default-character-set=utf8mb4 -uzabbix -p zabbix'], 'Import'));
add(P('Une fois le schéma importé, désactiver l’option activée temporairement pour l’import :'));
add(code('sql', ['sudo mysql -uroot -p', '', 'SET GLOBAL log_bin_trust_function_creators = 0;', 'QUIT;'], 'Après l’import'));
add(h2('7.2', 'Configuration du serveur Zabbix'));
add(code('conf', ['# sudo nano /etc/zabbix/zabbix_server.conf', 'DBName=zabbix', 'DBUser=zabbix', 'DBPassword=MOT_DE_PASSE'], '/etc/zabbix/zabbix_server.conf'));
add(P('Le paramètre `DBPassword` doit contenir le mot de passe défini lors de la création de l’utilisateur, sans quoi le serveur Zabbix ne peut pas se connecter à la base.'));

add(h1(8, 'Configuration de l’interface web'));
add(P('L’interface web permet d’administrer Zabbix : création des hôtes, des modèles, des règles de découverte et des actions. Elle repose sur Apache et PHP, installés à l’étape 6.2 comme dépendances des paquets `zabbix-apache-conf` et `zabbix-frontend-php`.', { keepNext: true }));
add(code('bash', ['sudo systemctl enable --now apache2', 'sudo systemctl status apache2'], 'Activation d’Apache'));
add(h2('8.1', 'Fuseau horaire'));
add(P('Depuis Zabbix 5.2, le fuseau horaire se choisit dans l’assistant d’installation de l’interface web (fuseau horaire par défaut : `Europe/Paris`), puis peut être modifié dans **Administration → Général → Interface graphique**. Le fuseau `Europe/Paris` est utilisé afin que les horaires affichés dans Zabbix correspondent à l’heure locale.'));
add(h2('8.2', 'Démarrage des services'));
add(code('bash', ['sudo systemctl restart zabbix-server zabbix-agent apache2', 'sudo systemctl enable zabbix-server zabbix-agent apache2', 'sudo systemctl status zabbix-server'], 'Services'));
add(P('Une fois le serveur démarré, ouvrir l’interface web à l’adresse `http://192.168.x.x/zabbix` et terminer l’assistant d’installation en renseignant les informations de la base de données.'));

// PARTIE C
add(partOpener('C', 'Supervision et découverte', 'Découvrir automatiquement les équipements, les identifier puis les classer.'));
add(h1(9, 'Configuration de la supervision SNMP'));
add(P('SNMP est utilisé pour superviser les équipements qui ne peuvent pas recevoir d’agent Zabbix, notamment les switches, routeurs, imprimantes, copieurs, onduleurs et certains équipements spécifiques. Zabbix interroge ces équipements en SNMP via UDP.'));
add(h2('9.1', 'Principe'));
add(figure('snmp.png', 993 / 3000, 'Interrogation SNMP d’un équipement par le serveur Zabbix'));
add(h2('9.2', 'Vérification SNMP'));
add(code('bash', ['# Outils SNMP (snmpwalk)', 'sudo apt install snmp', '', '# Exemple de test SNMP', 'snmpwalk -v2c -c COMMUNAUTE <ip_equipement>'], 'Test depuis le serveur'));
add(P('La communauté SNMP utilisée doit correspondre à celle configurée sur l’équipement. Dans un environnement réel, il est recommandé de limiter les sources autorisées et d’utiliser **SNMPv3** lorsque cela est possible.'));

add(h2('9.3', 'Ouverture des flux sur le pare-feu'));
add(P('Les règles de pare-feu gérées par Active Directory ont été configurées afin d’autoriser les communications entre le serveur Zabbix et les équipements du réseau, par exemple les réponses au ping (ICMP), que le pare-feu Windows bloque par défaut.'));
add(h1(10, 'Découverte automatique des équipements'));
add(P('La découverte réseau permet à Zabbix d’analyser périodiquement des plages d’adresses IP afin d’identifier les équipements disponibles. Elle s’appuie notamment sur les plages IP, la disponibilité de services, les agents Zabbix et les agents SNMP.'));
add(h2('10.1', 'Objectifs'));
add(bullets([
  'Éviter l’ajout manuel de chaque équipement.',
  'Détecter les équipements répondant au ping.',
  'Détecter les équipements disposant de SNMP.',
  'Permettre à Zabbix d’identifier la nature de l’équipement.',
  'Ajouter automatiquement les équipements au bon groupe.',
  'Associer automatiquement un modèle de supervision lorsque l’identification est suffisamment fiable.',
]));
add(h2('10.2', 'Principe de découverte'));
add(figure('disc.png', 1287 / 3000, 'Chaîne de découverte, de la plage IP à l’action'));

add(h1(11, 'Création des règles de découverte'));
add(P('Les règles de découverte sont configurées dans l’interface Zabbix afin de couvrir les différents réseaux de la mairie. Pour chaque règle, définir notamment :', { after: 100, keepNext: true }));
add(bullets([
  'le nom de la règle ;',
  'la plage d’adresses IP à analyser ;',
  'l’intervalle de découverte ;',
  'le type de vérification : ICMP et/ou SNMP ;',
  'la communauté SNMP ou les paramètres SNMPv3 si nécessaire ;',
  'les conditions permettant d’identifier le type d’équipement.',
]));
add(h2('11.1', 'Exemple de découpage'));
add(dataTable(['Règle', 'Réseau', 'Méthode'], [
  ['Découverte VLAN 50', '`192.168.x.x/24`', 'ICMP + SNMP'],
  ['Découverte VLAN 101', '`192.168.x.x`', 'ICMP + SNMP'],
  ['Découverte VLAN 102', '`192.168.x.x`', 'ICMP + SNMP'],
  ['Découverte VLAN 106', '`192.168.x.x`', 'ICMP + SNMP'],
  ['Découverte VLAN 200', '`192.168.x.x`', 'ICMP + SNMP'],
  ['Découverte VLAN 300', '`10.0.x.x`', 'ICMP + SNMP'],
  ['Découverte VLAN 72', '`192.168.x.x`', 'ICMP + SNMP'],
], [36, 36, 28]));
add(callout('ok', 'Résultat observé', 'La découverte du réseau a permis d’identifier environ **169 hôtes** lors des essais réalisés sur l’infrastructure.'));

add(h1(12, 'Création des actions de découverte'));
add(P('Les actions sont déclenchées par les événements générés par les règles de découverte. Elles permettent notamment d’ajouter ou d’activer un hôte, de lui attribuer un groupe et de lui lier un modèle.'));
add(h2('12.1', 'Exemple de logique'));
add(code('logique', ['SI équipement découvert', 'ET Discovery status = Up', 'ET information SNMP correspond à un équipement réseau', 'ALORS', '  → créer / activer l’hôte', '  → ajouter au groupe Switch ou Routeur', '  → lier le modèle correspondant', '  → ajouter les tags nécessaires'], 'Action de découverte'));
add(P('La condition **Discovery status = Up** est importante : elle évite qu’une action d’ajout d’hôte soit déclenchée lors d’un événement de perte de service. C’est la recommandation de la documentation officielle Zabbix.'));

add(h1(13, 'Organisation des équipements par groupes'));
add(P('Pour faciliter l’administration de l’infrastructure, les hôtes découverts sont répartis dans des groupes selon leur fonction.', { keepNext: true }));
add(chipGrid(['PC', 'Switch', 'Serveur', 'Caméra', 'Antenne', 'Hyperviseur', 'Imprimante / Copieur', 'Routeur', 'Base de données']));
add(P('Cette organisation permet de filtrer rapidement les équipements, d’appliquer des modèles adaptés et de construire des tableaux de bord plus lisibles.'));

add(h1(14, 'Identification et supervision des imprimantes / copieurs'));
add(P('L’identification automatique des imprimantes et copieurs est une problématique particulière du projet. Certains équipements peuvent répondre au ping sans disposer d’agent Zabbix : SNMP est donc utilisé pour récupérer leurs informations.'));
add(h2('14.1', 'OID utilisé pour l’identification'));
add(code('oid', ['1.3.6.1.4.1.1347.40.10.1.1.5.1'], 'Identifiant SNMP retenu'));
add(P('Cet OID a été retenu comme information permettant d’identifier les imprimantes / copieurs. La classification peut également s’appuyer sur les informations récupérées par SNMP et sur le nom de l’hôte.'));
add(h2('14.2', 'Exemple de logique de classification'));
add(code('logique', ['SI nom de l’hôte contient :', '  imprimante OU printer OU copieur OU copier', 'ALORS', '  → groupe : Imprimante / Copieur', '  → modèle SNMP adapté', '  → tags : type=imprimante'], 'Classement par nom'));
add(P('Pour une classification plus fiable, il est préférable de combiner plusieurs critères lorsque les informations disponibles le permettent : nom, OID, constructeur, `sysObjectID` et informations SNMP.'));

add(h1(15, 'Supervision des équipements réseau et des serveurs'));
add(h2('15.1', 'Équipements réseau'));
add(bullets(['Disponibilité par ICMP.', 'État des interfaces réseau.', 'Trafic entrant et sortant.', 'Erreurs et paquets perdus.', 'Informations générales de l’équipement via SNMP.', 'État des ports lorsque les informations SNMP nécessaires sont disponibles.']));
add(h2('15.2', 'Serveurs'));
add(bullets(['Disponibilité du serveur.', 'Utilisation CPU.', 'Mémoire.', 'Espace disque.', 'Interfaces réseau.', 'État des services lorsque les modèles ou agents adaptés sont configurés.']));
add(h2('15.3', 'Serveur Zabbix lui-même'));
add(P('Le serveur Zabbix peut également être supervisé grâce à l’agent Zabbix installé localement, ce qui permet de vérifier que le serveur de supervision reste disponible et dispose des ressources nécessaires.'));

// PARTIE D
add(partOpener('D', 'Exploitation et bilan', 'Fiabiliser, tester, dépanner, puis mesurer le résultat.'));
add(h1(16, 'Gestion des doublons et bonnes pratiques'));
add(P('La découverte automatique peut créer des doublons si plusieurs règles couvrent les mêmes plages ou si un même équipement est identifié par des paramètres différents.'));
add(bullets([
  'Éviter le chevauchement inutile des plages IP.',
  'Utiliser un nommage cohérent des hôtes.',
  'Conserver une adresse IP ou un identifiant cohérent pour chaque équipement.',
  'Utiliser les conditions d’action pour éviter la création répétée d’hôtes.',
  'Vérifier les événements de découverte avant d’automatiser une action de création.',
  'Tester les règles sur un petit périmètre avant de les étendre à tous les VLAN.',
]));

add(h1(17, 'Tests et validation'));
add(P('Les tests suivants permettent de valider progressivement la solution.', { keepNext: true }));
add(dataTable(['Test', 'Commande / action', 'Résultat attendu'], [
  ['IP du serveur', '`ip addr`', '`192.168.x.x/24`'],
  ['Passerelle', '`ping 192.168.x.x`', 'Réponse'],
  ['DNS', '`ping 192.168.x.x`', 'Réponse'],
  ['Zabbix Server', '`systemctl status zabbix-server`', '`active (running)`'],
  ['Apache', '`systemctl status apache2`', '`active (running)`'],
  ['SNMP', '`snmpwalk …`', 'Réponse SNMP'],
  ['Découverte', 'Monitoring → Discovery', 'Hôtes détectés'],
  ['Actions', 'Événements de découverte', 'Actions exécutées'],
], [24, 44, 32]));
add(h2('17.1', 'Validation fonctionnelle'));
add(bullets([
  'Un équipement répondant au ping apparaît comme disponible.',
  'Un équipement SNMP fournit des informations exploitables.',
  'Un équipement découvert est placé dans le bon groupe.',
  'Le modèle correspondant est associé lorsque les conditions sont satisfaites.',
  'Les informations sont visibles dans **Monitoring → Hosts**.',
]));

add(h1(18, 'Dépannage et problèmes rencontrés'));
add(h2('18.1', 'Problème de connectivité'));
add(P('Lors de la mise en place, un problème de connectivité vers la passerelle a été rencontré alors que le serveur DNS répondait. La vérification se fait par étapes : interface, adresse IP, route par défaut, passerelle, DNS, puis accès aux réseaux supervisés.', { keepNext: true }));
add(code('bash', ['ip addr', 'ip route', 'ping -c 4 192.168.x.x', 'ping -c 4 192.168.x.x'], 'Diagnostic pas à pas'));
add(h2('18.2', 'Équipement détecté mais pas de données SNMP'));
add(bullets(['Vérifier que SNMP est activé sur l’équipement.', 'Vérifier la communauté ou les paramètres SNMPv3.', 'Vérifier l’accès en UDP 161 depuis le serveur Zabbix.', 'Tester l’équipement avec `snmpwalk`.', 'Vérifier les OID utilisés par le modèle.']));
add(h2('18.3', 'Équipement détecté deux fois'));
add(bullets(['Vérifier si plusieurs règles couvrent la même IP.', 'Vérifier les paramètres de création automatique des hôtes.', 'Vérifier le nom attribué à l’hôte.', 'Supprimer ou désactiver les anciennes règles qui se chevauchent.']));

add(h1(19, 'Résultats obtenus'));
add(P('La mise en place fournit une supervision centralisée de l’infrastructure municipale. La découverte automatique a permis d’identifier environ 169 hôtes lors des essais. Le système peut s’appuyer sur ICMP pour les équipements sans SNMP et sur SNMP pour récupérer des informations détaillées sur les équipements compatibles.'));
add(kpis([['≈ 169', 'hôtes découverts'], ['9', 'VLAN recensés'], ['9', 'groupes d’équipements'], ['2', 'protocoles : ICMP et SNMP']]));
add(bullets([
  'Serveur Zabbix installé sur une VM Debian 13 hébergée sous VMware ESXi.',
  'Interface web de supervision disponible.',
  'Supervision ICMP et SNMP mise en place.',
  'Découverte automatique de plusieurs réseaux.',
  'Règles de découverte configurées.',
  'Actions de découverte permettant l’automatisation du classement.',
  'Groupes d’équipements définis.',
  'Prise en compte des imprimantes / copieurs avec identification SNMP.',
  'Supervision des équipements réseau et des serveurs.',
]));

add(h1(20, 'Conclusion et évolutions'));
add(P('Ce projet fait passer l’infrastructure d’une administration principalement manuelle à une supervision centralisée et automatisée. Zabbix fournit une vue globale de l’état de l’infrastructure et facilite la détection des équipements et des problèmes.'));
add(P('Évolutions possibles :', { after: 100, keepNext: true }));
add(bullets([
  'Finaliser la classification automatique de tous les types d’équipements.',
  'Ajouter ou améliorer les modèles SNMP pour les constructeurs présents dans l’infrastructure.',
  'Mettre en place des tableaux de bord par service ou par type d’équipement.',
  'Configurer des alertes et notifications adaptées.',
  'Utiliser SNMPv3 lorsque les équipements le permettent.',
  'Ajouter une supervision plus détaillée des serveurs avec Zabbix agent 2.',
  'Mettre en place des sauvegardes régulières de la base de données et de la configuration.',
  'Documenter les OID spécifiques utilisés pour chaque constructeur.',
]));

// Références
add(annexe('Références techniques'));
add(P('Cette documentation reprend la structure et plusieurs éléments d’une procédure d’installation fournie en début de projet : installation du serveur, base de données, Apache / PHP et démarrage des services. Les parties relatives à Debian 13, VMware ESXi, SNMP, la découverte réseau et l’organisation des équipements ont été adaptées au projet de supervision réalisé en mairie, ainsi que la configuration SSH et l’ouverture des flux sur le pare-feu.'));
add(P('Ressources officielles Zabbix 7.4 :', { after: 100, keepNext: true }));
add(liens([
  ['Installation et premiers pas', 'https://www.zabbix.com/documentation/7.4/en/manual/installation'],
  ['Découverte réseau', 'https://www.zabbix.com/documentation/7.4/fr/manual/discovery/network_discovery'],
  ['Supervision SNMP', 'https://www.zabbix.com/documentation/7.4/en/manual/config/items/itemtypes/snmp'],
  ['Téléchargement et dépôts officiels', 'https://www.zabbix.com/download'],
]));
add(callout('note', 'Confidentialité', 'Pour des raisons de confidentialité, la fin des adresses IP internes de la mairie a été masquée (`x.x`).'));

d.render();
