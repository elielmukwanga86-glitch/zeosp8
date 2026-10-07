'use strict';
/** Réalisation : réseau Wi-Fi à deux VLAN pour un cabinet de kinésithérapie (cas d’école ENSITECH, septembre 2026). */
module.exports = {
  slug: 'projet-cloison',
  ordre: 2,
  page: true,

  nom: 'Projet Cloison',
  titre: 'Deux Wi-Fi pour un cabinet de kinésithérapie',
  accroche: 'Un Wi-Fi pour le cabinet, un autre pour les patients : audit, VLAN, devis et compte rendu.',
  resume: 'Un cabinet de kinésithérapie (fictif) subit des coupures et partage son Wi-Fi avec ses patients. Je qualifie la demande, je fais les mesures, je conçois un réseau à deux VLAN isolés et je chiffre la solution.',
  intro: 'Cas d’école ENSITECH : un kinésithérapeute demande un audit de son réseau. Il subit des coupures en fin de journée, son imprimante disparaît et ses patients utilisent le même Wi-Fi que le cabinet. J’ai qualifié la demande, fait les mesures, conçu un réseau à deux VLAN, chiffré la solution, puis rédigé un compte rendu simple pour le client.',
  description: 'Étude de cas : audit réseau, conception d’un réseau à deux VLAN, devis et compte rendu pour un cabinet de kinésithérapie (cas d’école ENSITECH).',

  milieu: 'formation',
  cadre: { type: 'Atelier', organisation: 'Cas d’école · ENSITECH', periode: 'Septembre 2026', court: 'Sept. 2026', annee: '2026' },
  filtre: 'Projet Cloison',

  visuel: {
    src: 'img/cloison-visuel.webp', largeur: 1600, hauteur: 999,
    alt: 'Illustration : une borne Wi-Fi diffuse deux réseaux séparés par une règle d’isolation, le cabinet en vert et les patients en orange.',
  },
  chiffres: [
    ['2', 'VLAN isolés'],
    ['4', 'problèmes qualifiés'],
    ['600 €', 'HT, pour un budget ≈ 1 000 €'],
  ],
  technologies: ['Audit réseau', 'VLAN', 'DHCP', 'Wi-Fi', 'TP-Link Omada', 'Devis'],
  fiche: [['Réseaux', 'VLAN 10 · VLAN 20'], ['Matériel', 'TP-Link Omada'], ['Schéma', 'diagrams.net'], ['Devis', '600 € HT']],

  // Compétences indiquées dans le livret de l’atelier.
  competencesBts: ['b1-patrimoine', 'b1-incidents', 'b1-projet', 'b1-service'],

  documents: [{
    titre: 'Dossier de réalisation',
    fichier: 'docs/Projet-Cloison_Reseau-cabinet-kine.pdf',
    pages: 13,
    phrase: 'La mission complète, de la demande au compte rendu.',
    description: 'Reformulation, audit détaillé, plan d’adressage, devis complet et compte rendu d’intervention.',
  }],

  sections: [
    {
      id: 'demande', label: 'La demande', titre: 'Ce que le client voit, et ce qui se passe vraiment',
      blocs: [
        { p: 'Le cabinet (inventé pour le cours) a une box fibre dans un placard, des murs en béton et un seul Wi-Fi, dont le code est affiché en salle d’attente. Les bilans des patients sont scannés dans un dossier partagé du PC de l’accueil. Le budget est d’environ 1 000 € et l’intervention peut avoir lieu un samedi matin.' },
        { figure: {
          src: 'img/cloison-avant.webp', largeur: 2000, hauteur: 940,
          legende: 'Le réseau actuel du cabinet et ses quatre problèmes',
          alt: 'Schéma du réseau actuel : une box SFR avec un seul Wi-Fi ; PC de l’accueil, imprimante, postes des salles et téléphones des patients sont tous sur le même réseau. Quatre problèmes sont numérotés.',
        } },
        { tableau: {
          entetes: ['Problème relevé', 'Type'],
          lignes: [
            ['Coupures entre 17 h et 19 h', 'Panne'],
            ['L’imprimante disparaît du PC de l’accueil', 'Confort'],
            ['Les patients ont le même Wi-Fi que le cabinet', 'Sécurité'],
            ['Bilans scannés sur un dossier partagé du PC de l’accueil', 'Sécurité'],
          ],
        } },
        { encadre: { type: 'warn', titre: 'Données de santé', texte: 'Un bilan scanné est une donnée de santé, protégée par le RGPD (article 9). Comme le code Wi-Fi est affiché en salle d’attente, n’importe quel téléphone de patient se retrouve sur le même réseau que ce dossier partagé.' } },
      ],
    },
    {
      id: 'audit', label: 'L’audit', titre: 'Mesurer avant de proposer',
      blocs: [
        { p: 'Pour l’atelier, j’ai fait les mêmes mesures que chez un client, mais sur mon propre réseau : le partage de connexion de mon téléphone, depuis un Mac. On ne scanne jamais un réseau qui n’est pas le sien sans autorisation écrite.' },
        { code: { type: 'shell', label: 'Les commandes de l’audit (version Mac)', lignes: [
          'ipconfig getpacket en0     # adresse, masque, passerelle, bail DHCP',
          'netstat -rn                # la route par défaut',
          'ping -c 20 <passerelle>    # la stabilité du lien',
          'traceroute 1.1.1.1         # les routeurs traversés (11 sauts relevés)',
          'nslookup www.ameli.fr      # la résolution DNS',
          'nc -vz www.ameli.fr 443    # le port HTTPS répond-il ?',
        ] } },
        { chiffres: [['38 ms', 'latence à vide'], ['955 ms', 'latence, ligne chargée'], ['10 %', 'de perte vers la passerelle'], ['0 %', 'de perte vers 1.1.1.1']] },
        { titre: 'Ce que l’audit apprend pour le cabinet' },
        { liste: [
          '**Les coupures du soir** : quand la ligne est chargée, la latence augmente fortement. Entre 17 h et 19 h, les téléphones des patients occupent la connexion et le logiciel de dossiers patients finit par décrocher.',
          '**L’imprimante qui disparaît** : elle reçoit son adresse en DHCP pour une durée limitée (le bail). Quand le bail expire, l’adresse peut changer : il faut donc lui réserver une adresse fixe.',
          '**Le Wi-Fi des salles du fond** : le 5 GHz traverse mal le béton. Il faut sortir le Wi-Fi du placard en posant une borne au plafond du couloir, alimentée par le câble (PoE).',
        ] },
        { encadre: { type: 'ok', titre: 'Synthèse de l’audit', texte: 'Le signal Wi-Fi est excellent (−45 dBm) et internet répond (0 % de perte vers 1.1.1.1, port 443 d’ameli.fr ouvert). En revanche, on relève 10 % de perte vers la passerelle et une latence qui monte de 38 à 955 ms quand la ligne est chargée : c’est la connexion sollicitée qui pose problème, comme au cabinet entre 17 h et 19 h.' } },
      ],
    },
    {
      id: 'conception', label: 'La conception', titre: 'Deux réseaux sur le même matériel',
      blocs: [
        { p: 'Un routeur remplace la box pour le réseau interne, un switch alimente la borne Wi-Fi par le câble (PoE) et deux VLAN séparent le cabinet des patients. La box SFR ne sert plus qu’à amener internet : elle est passée en DMZ vers le routeur.' },
        { figure: {
          src: 'img/cloison-schema.webp', largeur: 2000, hauteur: 1800,
          legende: 'Le futur réseau, redessiné d’après mon schéma diagrams.net',
          alt: 'Schéma du futur réseau : Internet, box SFR (DMZ vers le routeur), routeur TP-Link ER605, switch TL-SG2210P et borne Wi-Fi EAP650. Le VLAN 10 Cabinet (192.168.10.0/24) regroupe le PC de l’accueil, l’imprimante et les postes des salles ; le VLAN 20 Patients (192.168.20.0/24) a internet uniquement. Une règle d’isolation bloque le VLAN 20 vers le VLAN 10.',
        } },
        { tableau: {
          entetes: ['', 'VLAN 10 · Cabinet', 'VLAN 20 · Patients'],
          mono: [1, 2],
          lignes: [
            ['Réseau', '192.168.10.0/24', '192.168.20.0/24'],
            ['Passerelle', '192.168.10.1', '192.168.20.1'],
            ['Plage DHCP', '.100 à .199', '.100 à .199'],
            ['Wi-Fi (SSID)', 'Kine-Cabinet', 'Kine-Patients'],
            ['Peut joindre l’autre VLAN ?', 'Non (pas nécessaire)', 'Non'],
          ],
        } },
        { p: 'L’imprimante (`192.168.10.20`) et le PC de l’accueil (`192.168.10.10`) ont une **réservation DHCP** ; le switch et la borne ont une adresse fixe.' },
      ],
    },
    {
      id: 'devis', label: 'Le devis', titre: '600 € HT pour un budget d’environ 1 000 €',
      blocs: [
        { p: 'J’ai choisi du matériel de la gamme TP-Link Omada, avec les prix du catalogue de l’exercice vérifiés chez un revendeur. J’ai écarté le switch non administrable, moins cher : il ne gère ni les VLAN ni le PoE.' },
        { tableau: {
          entetes: ['Désignation', 'Qté', 'Total HT'],
          droite: [1, 2], mono: [1, 2],
          lignes: [
            ['Routeur TP-Link ER605', '1', '65 €'],
            ['Switch administrable PoE+ TP-Link TL-SG2210P', '1', '105 €'],
            ['Borne Wi-Fi 6 TP-Link EAP650', '1', '110 €'],
            ['Câble Cat6, 50 m', '2', '70 €'],
            ['Main-d’œuvre : pose, réglage, tests', '4 h', '220 €'],
            ['Déplacement', '1', '30 €'],
          ],
          pied: ['Total à payer (TVA non applicable, art. 293 B du CGI)', '', '600 €'],
        } },
        { p: 'Avec la marge restante, je propose une option plutôt que de tout dépenser : une deuxième borne pour les salles du fond (215 €), car le béton risque d’affaiblir le Wi-Fi.' },
      ],
    },
    {
      id: 'compte-rendu', label: 'Le compte rendu', titre: 'Écrire pour quelqu’un qui n’est pas du métier',
      blocs: [
        { p: 'Le client est kinésithérapeute : il veut savoir ce qui change pour lui, pas comment fonctionne un VLAN. Extrait du compte rendu d’intervention :' },
        { lettre: [
          'Bonjour Monsieur Marchal,',
          'Vous avez désormais deux Wi-Fi :',
          '– **Kine-Cabinet**, réservé à vous et à votre équipe. Ne donnez pas son code aux patients.',
          '– **Kine-Patients**, pour les patients. Vous pouvez afficher ce code en salle d’attente : les patients auront internet, mais ne pourront voir ni vos ordinateurs, ni l’imprimante, ni vos dossiers.',
          'Si l’imprimante ne répond plus, la secrétaire éteint l’imprimante, attend 30 secondes, la rallume et patiente 2 minutes. Il n’est plus nécessaire de la réinstaller. Si le problème continue, elle peut m’appeler.',
        ] },
      ],
    },
    {
      id: 'competences', label: 'Compétences', titre: 'Bloc 1 du BTS SIO',
      blocs: [
        { tableau: {
          entetes: ['Compétence', 'Où dans la mission'],
          lignes: [
            ['Gérer le patrimoine informatique', 'Inventaire des équipements, plan d’adressage, choix du matériel'],
            ['Répondre aux incidents et aux demandes d’assistance et d’évolution', 'Coupures du soir, imprimante qui disparaît, qualification de la demande'],
            ['Travailler en mode projet', 'Étapes, livrables, devis, créneau d’intervention du samedi'],
            ['Mettre à disposition des utilisateurs un service informatique', 'Wi-Fi patients séparé, compte rendu écrit pour l’utilisateur'],
          ],
        } },
      ],
    },
  ],
};
