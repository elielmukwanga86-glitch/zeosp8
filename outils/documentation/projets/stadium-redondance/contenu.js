// =====================================================================
// StadiumCompany — dossier « Redondance des services d'infrastructure »
// =====================================================================
// Projet annuel BTS SIO (épreuve E5), mission 2, laboratoire VMware.
// Sources : étude de cas publiée (src/contenu/projets/stadiumcompany.js) et travaux de l'étudiant.
// Le plan 172.20.0.0/22 est celui d'une entreprise fictive (cahier des charges) : publiable tel quel.
// Ne JAMAIS écrire ici un mot de passe du laboratoire.
// =====================================================================
const path = require('path');
const { createDoc } = require('../../lib/doc-lib');

const AUTHOR = 'Eliel Mukwanga';
const EDITION = 'Édition novembre 2026';

const d = createDoc({
  maskIps: false, // adressage fictif du cahier des charges
  imgDir: path.join(__dirname, 'img'),
  publication: 'StadiumCompany_Redondance.pdf',
  header: { code: 'STADIUMCOMPANY', titre: 'REDONDANCE DES SERVICES', droite: 'DOCUMENTATION TECHNIQUE' },
  footer: `${AUTHOR}  ·  BTS SIO SISR  ·  ENSITECH`,
  meta: {
    creator: AUTHOR,
    title: 'StadiumCompany — Redondance de l’annuaire, du DNS et du DHCP',
    subject: 'Documentation technique — BTS SIO SISR',
    description: 'Deux contrôleurs de domaine, DNS répliqué et DHCP en basculement Hot Standby dans le laboratoire StadiumCompany.',
    keywords: 'StadiumCompany, redondance, Active Directory, DNS, DHCP, basculement, Hot Standby, pfSense',
  },
});

const { C, add, P, partOpener, h1, h2, annexe, bullets, steps, code, callout, dataTable, kpis, figure } = d;

// ---------- Couverture ----------
d.cover({
  image: 'cover.png',
  imageAlt: 'Deux serveurs reliés par une liaison de réplication',
  surtitre: 'DOCUMENTATION TECHNIQUE  ·  BTS SIO OPTION SISR',
  projet: 'PROJET STADIUMCOMPANY',
  titre: ['Redondance de', 'l’annuaire, du DNS', 'et du DHCP'],
  tailleTitre: 70, interligneTitre: 800,
  description: 'Deux contrôleurs de domaine Windows Server 2022, un DNS répliqué par Active Directory et un DHCP en basculement, testés en coupant le serveur principal.',
  fiche: [['SERVICES', 'AD · DNS · DHCP'], ['SERVEURS', 'SRV-DC01 · DC02'], ['DHCP', 'Hot Standby'], ['ROUTEUR', 'pfSense']],
  auteur: AUTHOR,
  infos: ['ENSITECH', EDITION],
  mention: 'Projet annuel · épreuve E5 · mission 2   ·   Adressage fictif du cahier des charges',
});

// ---------- En bref ----------
d.enBref({
  accroche: 'Si le serveur principal tombe, les utilisateurs doivent pouvoir continuer à ouvrir leur session et à obtenir une adresse IP. J’ai donc doublé l’annuaire, le DNS et le DHCP sur un second serveur, puis je l’ai vérifié en arrêtant le premier.',
  cases: [
    ['Contexte', 'Projet annuel **StadiumCompany** (épreuve E5), mission 2 : services d’infrastructure du domaine `stadiumcompany.com`, montés seul dans un laboratoire VMware.'],
    ['Objectif', 'Ne pas dépendre d’un seul serveur : **DNS primaire et secondaire**, deux contrôleurs de domaine et un DHCP capable de prendre le relais.'],
    ['Réalisation', '**SRV-DC02** promu dans le domaine existant, DNS répliqué par Active Directory, DHCP en **basculement Hot Standby**, relais DHCP de pfSense vers les deux serveurs.'],
    ['Résultat', 'DHCP de SRV-DC01 arrêté : adresse donnée par SRV-DC02. SRV-DC01 éteint : session authentifiée par `\\\\SRV-DC02`. Limite : les partages restent sur SRV-DC01.'],
  ],
  chiffres: [['2', 'contrôleurs de domaine'], ['9', 'étendues DHCP en basculement'], ['2', 'tests de panne réussis'], ['11 / 11', 'tests de la mission 2']],
  titreDeroule: 'DÉROULÉ',
  deroule: [['SRV-DC01', 'forêt, DNS, DHCP'], ['SRV-DC02', 'promu contrôleur'], ['DNS', 'répliqué par l’AD'], ['DHCP', 'basculement Hot Standby'], ['Tests', 'coupure du principal']],
  competences: ['Windows Server 2022', 'Active Directory · réplication', 'DNS intégré à l’AD', 'DHCP · basculement', 'pfSense · relais DHCP', 'PowerShell', 'Plan de tests'],
});

// =====================================================================
// A — CONTEXTE
// =====================================================================
add(partOpener('A', 'Contexte', 'Pourquoi doubler les services, et sur quelle architecture.'));

add(h1(1, 'Le besoin'));
add(P('StadiumCompany est une organisation fictive qui exploite un stade, une billetterie et un magasin. Le cahier des charges de l’école découpe le projet annuel en 14 missions. La mission 2 demande de déployer les services d’infrastructure : annuaire Active Directory pour le domaine `stadiumcompany.com`, **DNS primaire et secondaire**, DHCP par VLAN, structure de l’annuaire, partages, profils et GPO, puis de tout tester.'));
add(P('Avec un seul serveur, une panne bloquerait tout le monde : plus d’ouverture de session, plus de résolution de noms et, à l’expiration des baux, plus d’adresse IP pour les postes. Ce dossier décrit la partie **redondance** de la mission : ce qui a été doublé, comment, et ce que les tests ont montré.'));
add(callout('note', 'Périmètre', 'La redondance de la passerelle (pfSense) et des liaisons entre sites relève de la mission 4 (redondance et tolérance de panne). Les adresses .2 et .3 de chaque VLAN du stade sont déjà réservées pour elle.'));

add(h1(2, 'L’architecture'));
add(P('Toutes les machines tournent sur ma tour, dans VMware Workstation. Chaque VLAN est simulé par un segment LAN isolé. pfSense relie les segments, filtre les flux et relaie les demandes DHCP des postes vers les deux serveurs.', { keepNext: true }));
add(figure('redondance.png', 560 / 1000, 'Les deux contrôleurs de domaine et le relais DHCP de pfSense'));
add(dataTable(['Machine', 'Système', 'Adresse', 'Rôle dans la redondance'], [
  ['SRV-DC01', 'Windows Server 2022', '`172.20.2.132`', 'Contrôleur de domaine, DNS, **DHCP actif**'],
  ['SRV-DC02', 'Windows Server 2022', '`172.20.2.133`', 'Contrôleur de domaine, DNS répliqué, **DHCP de secours**'],
  ['pfSense', 'pfSense CE 2.9', '`172.20.2.129`', 'Passerelle des serveurs, relais DHCP vers les deux serveurs'],
  ['CLI-01', 'Windows 11 Entreprise', 'DHCP', 'Poste de test joint au domaine (VLAN 20 · Équipes)'],
], [17, 24, 19, 40]));

// =====================================================================
// B — MISE EN ŒUVRE
// =====================================================================
add(partOpener('B', 'Mise en œuvre', 'Les trois services doublés, dans l’ordre où je les ai mis en place.'));

add(h1(3, 'Un second contrôleur de domaine'));
add(P('SRV-DC01 porte la forêt `stadiumcompany.com`, créée en PowerShell. Une fois l’annuaire en place, j’ai installé **SRV-DC02** sous Windows Server 2022 avec une adresse fixe, puis je l’ai **promu contrôleur de domaine dans le domaine existant**, avec le rôle DNS.'));
add(steps([
  'Préparer SRV-DC02 : adresse fixe `172.20.2.133`, passerelle `172.20.2.129`, DNS pointant vers SRV-DC01.',
  'Installer les rôles AD DS et DNS.',
  'Promouvoir le serveur comme contrôleur supplémentaire du domaine `stadiumcompany.com`.',
  'Laisser la réplication copier l’annuaire (comptes, groupes, unités d’organisation, GPO).',
]));
add(callout('warn', 'Commande introuvable sur SRV-DC02', '`Install-WindowsFeature` n’était pas reconnue. J’avais ouvert PowerShell ISE en version x86 (32 bits), où le module ServerManager n’existe pas. La version 64 bits a réglé le problème.'));

add(h1(4, 'Un DNS répliqué par Active Directory'));
add(P('Les zones DNS sont intégrées à Active Directory : elles sont donc copiées sur SRV-DC02 par la réplication de l’annuaire, sans transfert de zone à configurer. Les deux serveurs répondent pour `stadiumcompany.com` et pour les quatre zones de recherche inversée.'));
add(P('Les postes reçoivent les **deux serveurs DNS** par DHCP (`172.20.2.132` puis `172.20.2.133`). Si le premier ne répond plus, le poste interroge le second.'));

add(h1(5, 'Un DHCP en basculement'));
add(P('Les neuf étendues, une par VLAN, sont créées sur SRV-DC01. Je les ai ensuite associées à SRV-DC02 avec le **basculement DHCP en mode Hot Standby** : SRV-DC01 est le serveur actif et distribue les adresses ; SRV-DC02 garde une copie des étendues et des baux, et prend le relais si SRV-DC01 ne répond plus.', { keepNext: true }));
add(code('powershell', [
  '# Sur SRV-DC01, une fois les étendues créées',
  'Add-DhcpServerv4Failover -Name "FO-DC01-DC02" -PartnerServer "srv-dc02.stadiumcompany.com" -ServerRole Active',
], 'Création de la relation de basculement (extrait)'));
add(P('Les postes ne sont pas sur le même segment que les serveurs : c’est **pfSense** qui relaie leurs demandes DHCP. Le relais est configuré vers les **deux** serveurs, sinon SRV-DC02 ne recevrait jamais les demandes en cas de panne.'));
add(callout('note', 'Le mode Hot Standby', 'Dans ce mode, un seul serveur distribue les adresses en temps normal et l’autre reste en secours. On sait donc toujours quel serveur a donné une adresse.'));

// =====================================================================
// C — TESTS ET BILAN
// =====================================================================
add(partOpener('C', 'Tests et bilan', 'Couper le serveur principal et regarder ce qui continue de fonctionner.'));

add(h1(6, 'Les tests de panne'));
add(P('La mission 2 compte onze scénarios de test, tous réussis et réalisés avec une capture d’écran datée. Ceux qui concernent la redondance :', { after: 100 }));
add(dataTable(['N°', 'Test', 'Résultat obtenu'], [
  ['1', 'DHCP par le relais (VLAN Équipes)', 'Adresse `172.20.1.11/25`, passerelle, DNS et suffixe reçus'],
  ['8', 'DNS direct et inverse', 'Les deux résolutions répondent'],
  ['10', 'Arrêt du DHCP de SRV-DC01', 'Adresse attribuée par **SRV-DC02**'],
  ['11', 'SRV-DC01 éteint', 'Ouverture de session authentifiée par `\\\\SRV-DC02`'],
], [8, 42, 50], { plainFirst: true }));
add(h2('6.1', 'Ce que montre le test 10'));
add(figure('bascule.png', 300 / 1000, 'Déroulé du test de basculement DHCP'));
add(callout('note', 'Le basculement n’est pas instantané', 'Juste après l’arrêt du service sur SRV-DC01, le poste a d’abord pris une adresse en 169.254 : SRV-DC02 n’avait pas encore constaté la panne. Quelques instants plus tard, il a répondu et le poste a retrouvé la même adresse.'));
add(callout('ok', 'Résultat', 'Avec SRV-DC01 hors service, un poste obtient toujours une adresse IP et un utilisateur ouvre toujours sa session : l’authentification, le DNS et le DHCP ne dépendent plus d’un seul serveur.'));
add(kpis([['2 / 2', 'tests de panne réussis'], ['11 / 11', 'tests de la mission 2']]));

add(h1(7, 'Limites et suite'));
add(bullets([
  '**Les partages** (lecteurs H:, S: et P:, profils itinérants) sont hébergés sur SRV-DC01 : si ce serveur tombe, l’authentification continue grâce à SRV-DC02, mais plus les fichiers. Un serveur de fichiers dédié ou une réplication DFS réglerait ce point.',
  '**La passerelle** pfSense reste unique dans le laboratoire. Sa redondance est prévue dans la mission 4, avec les adresses .2 et .3 réservées dans chaque VLAN du stade.',
  '**Le laboratoire** ne simule que trois VLAN ; les dix VLAN, les commutateurs Cisco et les trois sites sont traités dans Packet Tracer (missions 1, 3 et 4).',
]));
add(P('Pour suivre l’état de la redondance au quotidien, ces commandes sont utiles :', { after: 100 }));
add(code('powershell', [
  'Get-DhcpServerv4Failover          # état de la relation de basculement',
  'repadmin /replsummary             # résumé de la réplication entre contrôleurs',
  'dcdiag /s:SRV-DC02                # diagnostic du second contrôleur',
  'Resolve-DnsName srv-dc01.stadiumcompany.com -Server 172.20.2.133',
], 'Commandes de contrôle'));

add(annexe('Références techniques'));
add(P('Documentation officielle Microsoft :', { after: 100 }));
d.add(d.liens([
  ['Basculement DHCP (Windows Server)', 'https://learn.microsoft.com/fr-fr/windows-server/networking/technologies/dhcp/dhcp-failover'],
  ['Installer un contrôleur de domaine supplémentaire', 'https://learn.microsoft.com/fr-fr/windows-server/identity/ad-ds/deploy/install-a-replica-windows-server-2012-domain-controller-in-an-existing-domain--level-200-'],
]));
add(callout('note', 'Adressage', 'Le plan `172.20.0.0/22` est celui de l’entreprise fictive du cahier des charges. Les mots de passe du laboratoire ne figurent pas dans ce dossier.'));

d.render();
