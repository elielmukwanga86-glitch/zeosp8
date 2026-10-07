'use strict';
/** Réalisation courte (sans page dédiée) : administration réseau sous Cisco Packet Tracer. */
module.exports = {
  slug: 'cisco-packet-tracer',
  ordre: 3,
  page: false,

  nom: 'Cisco Packet Tracer',
  titre: 'Administration réseau sous Cisco Packet Tracer',
  milieu: 'formation',
  cadre: { type: 'Projet de formation', organisation: 'BTS SIO', periode: '', court: '' },
  filtre: 'Cisco Packet Tracer',

  details: [
    'Conception d’une topologie réseau et configuration de routeurs et de switches Cisco.',
    'Mise en œuvre de l’adressage IPv4.',
    'Configuration du routage statique et du protocole RIP.',
    'Analyse des trames Ethernet, ARP et de la table MAC.',
    'Validation de la connectivité entre les équipements.',
  ],

  // Schéma de principe (illustration) affiché sous la liste.
  schema: `<svg viewBox="0 0 640 210" role="img" aria-label="Schéma de principe : deux réseaux locaux reliés par deux routeurs">
  <g fill="none" stroke="currentColor" stroke-width="1.6">
    <path d="M150 70H490"/><path d="M110 92v40M530 92v40M110 160l-50 30M110 160l50 30M530 160l-50 30M530 160l50 30"/>
  </g>
  <g font-family="IBM Plex Mono, monospace" font-size="11" fill="currentColor">
    <rect x="70" y="48" width="80" height="44" rx="6" fill="#12161C"/><text x="110" y="75" text-anchor="middle" fill="#E8EBEE" font-weight="600">Routeur</text>
    <rect x="490" y="48" width="80" height="44" rx="6" fill="#12161C"/><text x="530" y="75" text-anchor="middle" fill="#E8EBEE" font-weight="600">Routeur</text>
    <rect x="76" y="132" width="68" height="28" rx="5" fill="#FBFBF9" stroke="#12161C"/><text x="110" y="150" text-anchor="middle">Switch</text>
    <rect x="496" y="132" width="68" height="28" rx="5" fill="#FBFBF9" stroke="#12161C"/><text x="530" y="150" text-anchor="middle">Switch</text>
    <g fill="#E8572A"><circle cx="60" cy="190" r="6"/><circle cx="160" cy="190" r="6"/><circle cx="480" cy="190" r="6"/><circle cx="580" cy="190" r="6"/></g>
    <text x="320" y="60" text-anchor="middle">liaison entre routeurs · routage statique / RIP</text>
    <text x="110" y="30" text-anchor="middle">LAN A · IPv4</text><text x="530" y="30" text-anchor="middle">LAN B · IPv4</text>
  </g>
</svg>`,
  legendeSchema: 'Schéma de principe, à titre d’illustration.',

  competencesBts: ['b2-concevoir', 'b2-installer'],
};
