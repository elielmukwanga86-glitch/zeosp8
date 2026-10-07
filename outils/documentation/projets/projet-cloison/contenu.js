// =====================================================================
// Projet Cloison — un Wi-Fi pour le cabinet, un autre pour les patients
// Cas d'école : Mission 1 de l'atelier de professionnalisation ENSITECH.
// Contenu du dossier. La mise en page vient de ../../lib/doc-lib.js.
// Génération : ./generer.sh projet-cloison (depuis outils/documentation)
//
// L'adressage (192.168.10.x, 192.168.20.x, box 192.168.1.1…) est un plan fictif
// conçu pour l'exercice : il reste visible (maskIps: false).
// =====================================================================
const path = require('path');
const { createDoc } = require('../../lib/doc-lib');

const AUTHOR = 'Eliel Mukwanga';
const EDITION = 'Septembre 2026';

const d = createDoc({
  maskIps: false,
  imgDir: path.join(__dirname, 'img'),
  publication: 'Projet-Cloison_Reseau-cabinet-kine.pdf', // copié dans src/assets/docs/ du portfolio
  header: { code: 'PROJET CLOISON', titre: 'RÉSEAU D’UN CABINET DE KINÉ', droite: 'DOSSIER DE RÉALISATION' },
  footer: `${AUTHOR}  ·  BTS SIO SISR  ·  CAS D’ÉCOLE`,
  meta: {
    creator: AUTHOR,
    title: 'Projet Cloison — Un Wi-Fi pour le cabinet, un autre pour les patients',
    subject: 'Dossier de réalisation — BTS SIO SISR',
    description: 'Audit réseau, VLAN, plan d’adressage, devis et compte rendu pour un cabinet de kinésithérapie (cas d’école ENSITECH).',
    keywords: 'VLAN, Wi-Fi, DHCP, audit réseau, TP-Link Omada, devis, BTS SIO',
  },
});
const { C, add, P, partOpener, h1, h2, steps, callout, lettre, ligneRef, dataTable, kpis, figure } = d;

// ---------- Couverture ----------
d.cover({
  image: 'cover.png',
  imageAlt: 'Deux réseaux séparés par une règle d’isolation',
  surtitre: 'DOSSIER DE RÉALISATION  ·  BTS SIO OPTION SISR',
  projet: 'PROJET CLOISON',
  titre: ['Un Wi-Fi pour le cabinet,', 'un autre pour les patients'],
  tailleTitre: 70,
  interligneTitre: 800,
  description: 'Audit réseau, conception d’un réseau à deux VLAN, devis et compte rendu pour un cabinet de kinésithérapie. Cas d’école : Mission 1 de l’atelier de professionnalisation ENSITECH.',
  retraitDescription: 2000,
  fiche: [['RÉSEAUX', 'VLAN 10 · VLAN 20'], ['MATÉRIEL', 'TP-Link Omada'], ['SCHÉMA', 'diagrams.net'], ['DEVIS', '600 € HT']],
  auteur: AUTHOR,
  infos: ['ENSITECH', EDITION],
});

// ---------- En bref ----------
d.enBref({
  accroche: 'Coupures en fin de journée, imprimante qui disparaît, patients sur le même Wi-Fi que le cabinet : je qualifie la demande, je mesure, je conçois un réseau à deux VLAN, je chiffre la solution et je rends compte au client avec des mots simples.',
  cases: [
    ['Contexte', 'Cas d’école de l’atelier de professionnalisation ENSITECH. Je travaille en freelance ; un cabinet de kinésithérapie (fictif) commande une offre d’audit réseau. Budget d’environ 1 000 €, travaux possibles un samedi matin.'],
    ['Objectif', 'Remettre au client ce qu’un vrai prestataire lui aurait remis : un schéma de son futur réseau, un devis et un compte rendu qu’il comprend sans être informaticien.'],
    ['Réalisation', 'Qualification de la demande, audit en ligne de commande (débit, latence, IP, DHCP, DNS, port 443, Wi-Fi), plan d’adressage à deux VLAN, schéma sous diagrams.net, choix du matériel et devis.'],
    ['Résultat', 'Deux Wi-Fi isolés (cabinet et patients), une borne Wi-Fi 6 au plafond du couloir, une imprimante à adresse réservée, pour 600 € HT dans un budget d’environ 1 000 €.'],
  ],
  chiffres: [['4', 'problèmes qualifiés'], ['2', 'VLAN isolés'], ['4 h', 'd’intervention un samedi'], ['600 €', 'HT pour un budget d’environ 1 000 €']],
  titreDeroule: 'DÉROULÉ DE LA MISSION',
  deroule: [['Qualifier', 'Reformuler, classer, questionner'], ['Auditer', 'Mesures en ligne de commande'], ['Concevoir', 'VLAN, adressage, schéma'], ['Chiffrer', 'Matériel et devis'], ['Rendre compte', 'Compte rendu au client']],
  competences: ['Audit réseau · ipconfig, ping, tracert, nslookup', 'Adressage IPv4 · VLAN', 'DHCP · réservations', 'Wi-Fi · bandes et canaux', 'Matériel TP-Link Omada', 'Devis', 'Communication avec le client'],
});

// =====================================================================
// CORPS DU DOSSIER
// =====================================================================
// PARTIE A
add(partOpener('A', 'Qualifier la demande', 'Un client décrit ce qu’il voit, pas ce qui cause le problème.'));
add(h1(1, 'La demande du client'));
add(P('M. Marchal, kinésithérapeute, a commandé une offre d’audit réseau. Le cabinet est inventé pour le cours ; voici ce qu’il a décrit lors de l’appel.', { keepNext: true }));
add(dataTable(['Sujet', 'Ce que dit le client'], [
  ['Locaux', 'Rez-de-chaussée de 120 m² : accueil, salle d’attente, deux salles de soin, un bureau. Murs en béton.'],
  ['Internet', 'Box fibre SFR, dans le placard du couloir.'],
  ['Postes', 'PC de l’accueil en câble sur la box ; PC de la salle 1 et portable de la salle 2 en Wi-Fi.'],
  ['Imprimante', 'Brother en Wi-Fi, son adresse lui est donnée par la box.'],
  ['Wi-Fi', 'Un seul réseau ; le code est affiché dans la salle d’attente.'],
  ['Coupures', 'Surtout entre 17 h et 19 h, quand la salle d’attente est pleine.'],
  ['Données', 'Logiciel de dossiers patients en ligne, chez un hébergeur agréé données de santé ; bilans scannés dans un dossier partagé du PC de l’accueil.'],
  ['Budget', 'Autour de 1 000 € ; travaux possibles un samedi matin, cabinet fermé.'],
], [20, 80]));
add(figure('avant.png', 1410 / 3000, 'Le réseau actuel du cabinet et ses quatre problèmes'));
add(h2('1.1', 'Reformulation'));
add(P('Vous souhaitez que le réseau de votre cabinet fonctionne sans coupure, y compris en fin de journée quand la salle d’attente est pleine, et que l’imprimante reste toujours disponible depuis l’accueil. Vous souhaitez aussi savoir si le Wi-Fi partagé avec vos patients pose un risque, et recevoir une proposition réalisable un samedi matin pour un budget d’environ 1 000 €.'));
add(h2('1.2', 'Classement des problèmes'));
add(dataTable(['Problème relevé', 'Type'], [
  ['Coupures entre 17 h et 19 h', 'Panne'],
  ['L’imprimante disparaît du PC de l’accueil', 'Confort'],
  ['Les patients ont le même Wi-Fi que le cabinet', 'Sécurité'],
  ['Bilans scannés sur un dossier partagé du PC de l’accueil', 'Sécurité'],
], [72, 28], { plainFirst: true }));
add(h2('1.3', 'Le risque du Wi-Fi partagé'));
add(P('Le code Wi-Fi est affiché dans la salle d’attente : les patients se connectent donc au même réseau que le PC de l’accueil. Il y a un risque de fuite de données et de non-respect du RGPD : le dossier partagé qui contient les bilans scannés devient à portée de n’importe quel appareil connecté.'));
add(callout('warn', 'Données de santé', 'Un bilan, une ordonnance ou un compte rendu de séance sont des données de santé. Le RGPD (article 9) en fait une catégorie particulière, que l’on protège plus que les autres données.'));
add(h2('1.4', 'Hypothèse sur les coupures'));
add(P('Entre 17 h et 19 h, la salle d’attente est pleine et les patients, qui ont le code Wi-Fi, connectent leurs téléphones (vidéos, réseaux sociaux, mises à jour). La box serait alors saturée par trop d’appareils et le logiciel patients décrocherait. Sur place, je vérifierais le nombre d’appareils connectés et je comparerais la latence en heure creuse et à 18 h.'));
add(h2('1.5', 'Questions envoyées au client'));
add(steps([
  'Y a-t-il déjà des prises réseau dans les salles de soin et le bureau ?',
  'Combien d’appareils du cabinet se connectent en tout ?',
  'Qui a besoin d’ouvrir le dossier des bilans, et depuis quels postes ?',
  'Peut-on fixer un petit boîtier au plafond du couloir, et y a-t-il une prise électrique près du placard ?',
  'Avez-vous les identifiants d’accès à la box SFR ?',
]));

// PARTIE B
add(partOpener('B', 'Auditer', 'Les mêmes commandes que chez le client, sur mon propre réseau.'));
add(h1(2, 'Méthode'));
add(P('Chez le client, j’aurais mesuré son réseau. Pour l’atelier, les mêmes mesures sont faites sur mon propre réseau : le partage de connexion de mon téléphone (4G), depuis un Mac. On ne balaie jamais un réseau qui n’est pas le sien sans autorisation écrite, même pour apprendre.', { keepNext: true }));
add(dataTable(['Outil ou commande', 'Ce que l’on mesure'], [
  ['fast.com', 'Débit (réception, envoi) et latence, à vide puis ligne chargée'],
  ['`ipconfig /all` · `ipconfig getpacket en0`', 'Adresse IP, masque, passerelle, serveur DHCP et bail'],
  ['`route print -4` · `netstat -rn`', 'La route par défaut (0.0.0.0)'],
  ['`getmac` · `ifconfig en0`', 'L’adresse MAC de la carte Wi-Fi'],
  ['`ping` · `tracert` · `traceroute`', 'Joindre internet et compter les routeurs traversés'],
  ['`ping` × 20 vers la passerelle', 'La stabilité du lien Wi-Fi'],
  ['`nslookup`', 'La résolution DNS d’un nom'],
  ['`Test-NetConnection -Port 443` · `nc -vz`', 'Un service en ligne répond-il sur le port 443 ?'],
  ['`arp -a` · `ndp -a`', 'Les appareils voisins sur le réseau local'],
  ['`netsh wlan` · Option + clic sur le Wi-Fi', 'Bande, canal, signal et réseaux voisins'],
], [44, 56], { plainFirst: true }));

add(h1(3, 'Résultats relevés'));
add(kpis([['38 ms', 'latence à vide'], ['955 ms', 'latence ligne chargée'], ['10 %', 'de perte vers la passerelle'], ['0 %', 'de perte vers 1.1.1.1']]));
add(dataTable(['Mesure', 'Valeur relevée'], [
  ['Débit', '38 Mbit/s en réception, 5,1 Mbit/s en envoi (Orange)'],
  ['Latence', '38 ms à vide, 955 ms ligne chargée'],
  ['Adresse IPv4 et masque', '`192.0.0.2` · `255.255.255.255`'],
  ['Passerelle IPv4', '`192.0.0.1`, passerelle « de traduction » : le téléphone ne fournit que de l’IPv6'],
  ['Bail DHCP', '1 800 s, soit 30 minutes'],
  ['Ping vers 1.1.1.1', '0 % de perte, 47 ms en moyenne'],
  ['Traceroute', '11 sauts ; le saut n° 1 est le téléphone'],
  ['Ping × 20 vers la passerelle', '10 % de perte, de 6 à 135 ms'],
  ['DNS · www.ameli.fr', 'Réponse du téléphone ; 4 adresses IPv4 ; site servi par Cloudflare (CDN)'],
  ['Port 443 · ameli.fr', 'Ouvert'],
  ['Voisins (arp, ndp)', 'Aucune entrée en IPv4 ; en IPv6, un seul appareil : le téléphone'],
  ['Wi-Fi', '5 GHz, canal 149 (80 MHz), signal 100 % (−45 dBm), WPA2 Personnel, 20 réseaux visibles'],
], [30, 70]));
add(callout('note', 'Données personnelles', 'Les adresses MAC, le préfixe IPv6 et le nom de mes appareils relevés pendant l’audit ne figurent pas dans ce dossier.'));

add(h1(4, 'Ce que l’audit apprend pour le cabinet'));
add(h2('4.1', 'Latence et coupures du soir'));
add(P('Quand la ligne est chargée, la latence augmente fortement : de 6 à 44 ms sur la capture du livret, et de 38 à 955 ms sur ma propre mesure. Au cabinet, entre 17 h et 19 h, les téléphones des patients occupent la connexion (vidéos, mises à jour), ce qui charge la ligne. Chaque échange avec le logiciel de dossiers patients devient alors très lent, et au-delà d’un certain délai le logiciel considère la connexion perdue : c’est ce qui provoque les déconnexions en pleine séance.'));
add(h2('4.2', 'Bail DHCP et imprimante qui disparaît'));
add(P('L’imprimante reçoit son adresse IP en DHCP, pour une durée limitée : le bail. Quand le bail expire ou que la box redémarre, l’imprimante peut recevoir une autre adresse. Le PC de l’accueil continue de la chercher à l’ancienne adresse et ne la trouve plus : elle « disparaît ». Il faut lui réserver une adresse fixe (réservation DHCP).'));
add(h2('4.3', 'Le premier saut'));
add(P('Le saut n° 1 correspond à ma passerelle, c’est-à-dire mon téléphone : c’est logique, car c’est le premier appareil par lequel passe tout le trafic qui sort vers internet. Sur mon réseau, le téléphone ne fournit que de l’IPv6 : mon Mac affiche donc une passerelle IPv4 « de traduction » (`192.0.0.1`), mais `traceroute6` montre la vraie passerelle, qui partage le même préfixe IPv6 que mon Mac.'));
add(h2('4.4', 'Wi-Fi : bande et emplacement de la borne'));
add(P('C’est le 5 GHz qui risque de mal passer : il est plus rapide mais porte moins loin et traverse mal les murs, or la box est enfermée dans un placard et les murs sont en béton. Je propose de sortir le Wi-Fi du placard en posant une borne au plafond du couloir, reliée par câble et alimentée par le câble (PoE), au plus près des salles de soin. Le 2,4 GHz reste disponible en secours pour les appareils plus éloignés.'));
add(callout('ok', 'Synthèse de l’audit', 'Le signal Wi-Fi est excellent (−45 dBm) et internet est joignable (ping vers 1.1.1.1 : 0 % de perte, 47 ms ; port 443 d’ameli.fr ouvert). En revanche, la connexion est instable : 10 % de perte vers ma passerelle, des temps de 6 à 135 ms, et une latence qui monte de 38 à 955 ms quand la ligne est chargée. Le problème ne vient donc pas de la radio mais de la connexion quand elle est sollicitée, comme au cabinet entre 17 h et 19 h.'));

// PARTIE C
add(partOpener('C', 'Concevoir', 'Deux réseaux séparés sur le même matériel.'));
add(h1(5, 'Le futur réseau'));
add(P('La proposition : un routeur qui remplace la box pour le réseau interne, un switch qui alimente la borne Wi-Fi par le câble (PoE), et deux réseaux séparés (VLAN) sur le même matériel. La box SFR ne sert plus qu’à amener internet : elle est passée en DMZ vers le routeur.', { keepNext: true }));
add(figure('apres.png', 2700 / 3000, 'Schéma du futur réseau, redessiné d’après mon schéma diagrams.net'));
add(h2('5.1', 'Plan d’adressage'));
add(dataTable(['', 'VLAN 10 · Cabinet', 'VLAN 20 · Patients'], [
  ['Adresse du réseau', '`192.168.10.0/24`', '`192.168.20.0/24`'],
  ['Masque', '`255.255.255.0`', '`255.255.255.0`'],
  ['Passerelle (le routeur)', '`192.168.10.1`', '`192.168.20.1`'],
  ['Plage DHCP', '.100 à .199', '.100 à .199'],
  ['Nom du Wi-Fi (SSID)', 'Kine-Cabinet', 'Kine-Patients'],
  ['Peut joindre l’autre VLAN ?', 'Non (pas nécessaire)', 'Non'],
], [34, 33, 33]));
add(h2('5.2', 'Adresses fixes'));
add(dataTable(['Équipement', 'VLAN', 'Adresse', 'Obtenue par'], [
  ['Switch', '10', '`192.168.10.2`', 'Adresse fixe réglée sur l’appareil'],
  ['Borne Wi-Fi', '10', '`192.168.10.3`', 'Adresse fixe réglée sur l’appareil'],
  ['Imprimante Brother', '10', '`192.168.10.20`', 'Réservation DHCP'],
  ['PC de l’accueil', '10', '`192.168.10.10`', 'Réservation DHCP'],
], [28, 12, 24, 36]));
add(h2('5.3', 'Règle d’isolation'));
add(P('Le VLAN 20 (patients) ne peut pas joindre le VLAN 10 (cabinet) : un patient a accès à internet, mais ne voit ni l’imprimante, ni le PC de l’accueil, ni les bilans scannés. Sur le schéma, la règle est matérialisée par une barrière rouge entre les deux zones, pour qu’on puisse répondre d’un coup d’œil à la question « un patient peut-il imprimer ? ».'));

// PARTIE D
add(partOpener('D', 'Chiffrer et rendre compte', 'Un devis juste, puis un compte rendu lisible en deux minutes.'));
add(h1(6, 'Le matériel'));
add(P('Le catalogue de l’exercice propose deux gammes, TP-Link Omada et Ubiquiti UniFi, à ne pas mélanger dans un même devis. Le devis s’appuie sur la gamme TP-Link Omada.'));
add(h2('6.1', 'Vérification des prix chez un revendeur'));
add(P('Un devis réel se fait avec les prix du jour. Les sites grand public affichent des prix TTC : on divise par 1,2 pour comparer au catalogue HT.', { keepNext: true }));
add(dataTable(['Référence', 'Site', 'Prix trouvé', 'Écart avec le catalogue'], [
  ['TP-Link ER605', 'LDLC', '79,95 € TTC', '+1,63 € HT'],
  ['TP-Link EAP650', 'LDLC', '139,95 € TTC', '+6,63 € HT'],
], [30, 18, 24, 28]));
add(h2('6.2', 'Pourquoi pas le switch à 20 € ?'));
add(P('Le LS108G est un switch non administrable : il ne sait pas gérer les VLAN. Or tout le plan repose sur deux réseaux séparés sur le même câble. En plus, il ne fournit pas le PoE nécessaire pour alimenter la borne au plafond. L’économie de 85 € rendrait la séparation patients / cabinet impossible.'));

add(h1(7, 'Le devis'));
add(ligneRef('DEVIS N° 2026-001', 'du 23/09/2026', 'Cabinet de kinésithérapie des Prés · M. Julien Marchal'));
add(dataTable(['Désignation', 'Qté', 'Prix unitaire HT', 'Total HT'], [
  ['Routeur TP-Link ER605 (VLAN + isolation)', '1', '65 €', '65 €'],
  ['Switch administrable PoE+ TP-Link TL-SG2210P', '1', '105 €', '105 €'],
  ['Borne Wi-Fi 6 plafond TP-Link EAP650 (PoE)', '1', '110 €', '110 €'],
  ['Câble Cat6, 50 m', '2', '35 €', '70 €'],
  ['Main-d’œuvre : pose, réglage, tests', '4 h', '55 €', '220 €'],
  ['Déplacement (forfait)', '1', '30 €', '30 €'],
  ['**Total HT**', '', '', '**600 €**'],
  ['TVA', '', '', 'non applicable'],
  ['**Total à payer**', '', '', '**600 €**'],
], [52, 10, 20, 18], { plainFirst: true }));
add(P('TVA non applicable, article 293 B du CGI. Devis valable 30 jours.', { size: 17, color: C.mut }));
add(h2('7.1', 'Budget et option'));
add(P('Le total de 600 € tient dans le budget d’environ 1 000 € : il reste une marge de 400 €. Je ne propose pas de la dépenser entièrement, mais une option à accepter ou non : une deuxième borne EAP650 dans les salles de soin du fond (110 € + câble 35 € + prise 15 € + 1 h de pose 55 €, soit 215 €, total 815 €), car les murs en béton risquent d’affaiblir le Wi-Fi de la borne du couloir. Je garde le reste en réserve, car les prix réels relevés chez LDLC sont un peu plus élevés que le catalogue.'));
add(h2('7.2', '« Et si je garde juste ma box avec un Wi-Fi invité ? »'));
add(P('Un Wi-Fi invité sur votre box règle en grande partie le problème de sécurité : les patients ne seraient plus sur le même réseau que le PC de l’accueil et les bilans scannés, et ça ne coûte rien. En revanche, il ne règle ni les coupures (les téléphones des patients partageraient toujours la même box et la même ligne entre 17 h et 19 h), ni la couverture des salles du fond (la box reste dans le placard, derrière les murs en béton).'));

add(h1(8, 'Le compte rendu au client'));
add(h2('8.1', 'Traduire pour le client'));
add(dataTable(['Phrase technique', 'Pour M. Marchal'], [
  ['Création de deux VLAN, le VLAN 20 est isolé du VLAN 10.', 'Votre cabinet a maintenant deux Wi-Fi séparés : un pour vous et votre équipe, un pour les patients. Un patient connecté ne peut voir ni vos ordinateurs, ni l’imprimante, ni vos dossiers.'],
  ['Réservation DHCP de l’imprimante sur 192.168.10.20.', 'L’imprimante garde toujours la même place sur le réseau : elle ne « disparaîtra » plus de l’ordinateur de l’accueil.'],
  ['Borne EAP650 alimentée en PoE, posée au plafond du couloir.', 'Un petit boîtier Wi-Fi a été fixé au plafond du couloir, au plus près des salles de soin. Il fonctionne avec un seul câble, sans prise électrique.'],
  ['Box passée en DMZ vers le routeur ER605.', 'Votre box SFR sert uniquement à amener internet : c’est le nouveau boîtier qui gère le réseau du cabinet. Ne réinitialisez pas la box et ne modifiez pas ses réglages sans m’appeler.'],
], [38, 62], { plainFirst: true }));
add(h2('8.2', 'Compte rendu d’intervention'));
const letter = [
  'Bonjour Monsieur Marchal,',
  'Samedi matin, j’ai installé un nouveau boîtier réseau à côté de votre box, ainsi qu’un point Wi-Fi au plafond du couloir, plus proche des salles de soin. Tout a été testé avant mon départ : internet, le logiciel de dossiers patients et l’imprimante fonctionnent.',
  'Vous avez désormais deux Wi-Fi :',
  '–  **Kine-Cabinet**, réservé à vous et à votre équipe. Ne donnez pas son code aux patients.',
  '–  **Kine-Patients**, pour les patients. Vous pouvez afficher ce code en salle d’attente : les patients auront internet, mais ne pourront voir ni vos ordinateurs, ni l’imprimante, ni vos dossiers.',
  'Si l’imprimante ne répond plus, la secrétaire éteint l’imprimante, attend 30 secondes, la rallume et patiente 2 minutes. Il n’est plus nécessaire de la réinstaller. Si le problème continue, elle peut m’appeler.',
  '**Recommandation** : les bilans scannés sont des données de santé. Je vous conseille de les enregistrer directement dans votre logiciel de dossiers patients, hébergé chez un hébergeur agréé, plutôt que dans le dossier partagé du PC de l’accueil. Je peux vous aider à organiser ce transfert.',
  'Eliel Mukwanga',
];
add(lettre(letter));

add(h1(9, 'Compétences mobilisées'));
add(P('Compétences du bloc 1 du BTS SIO mobilisées pendant la mission :', { keepNext: true }));
add(dataTable(['Compétence', 'Où dans la mission'], [
  ['Gérer le patrimoine informatique', 'Inventaire des équipements, plan d’adressage, choix du matériel'],
  ['Répondre aux incidents et aux demandes d’assistance et d’évolution', 'Coupures du soir, imprimante qui disparaît, qualification de la demande'],
  ['Travailler en mode projet', 'Étapes, livrables, devis, créneau d’intervention du samedi'],
  ['Mettre à disposition des utilisateurs un service informatique', 'Wi-Fi patients séparé, compte rendu écrit pour l’utilisateur'],
], [45, 55]));

d.render();
