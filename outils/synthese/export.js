'use strict';
// Exporte en JSON les données du tableau de synthèse (lues par remplir.py).
// Usage : node outils/synthese/export.js
const path = require('path');
const fs = require('fs');
const SRC = path.join(__dirname, '..', '..', 'src', 'contenu');
const site = require(path.join(SRC, 'site'));
const referentiel = require(path.join(SRC, 'referentiel'));
const projets = fs.readdirSync(path.join(SRC, 'projets'))
  .filter((f) => f.endsWith('.js') && !f.startsWith('_'))
  .map((f) => require(path.join(SRC, 'projets', f)))
  .sort((a, b) => a.ordre - b.ordre);
const bloc1 = referentiel.find((b) => b.id === 'bloc1').competences.map((c) => c.id);
console.log(JSON.stringify({
  nom: `${site.nomFamille.toUpperCase()} ${site.prenom}`,
  centre: `${site.formation.ecole}, ${site.formation.ville}`,
  option: site.formation.option,
  url: site.url || '',
  competences: bloc1,
  realisations: projets.filter((p) => (p.competencesBts || []).some((c) => bloc1.includes(c))).map((p) => ({
    titre: p.titre,
    rubrique: p.milieu === 'formation' ? 'formation' : (p.anneeBts === 2 ? 'pro2' : 'pro1'),
    periode: (p.synthese && p.synthese.periode) || p.cadre.periode || '',
    documents: [
      ...(p.page ? [`Étude de cas (portfolio, page « ${p.nom} »)`] : []),
      ...(p.documents || []).map((d) => `${d.titre} (PDF, ${d.pages} pages)`),
      ...(p.productions || []),
    ],
    competences: p.competencesBts || [],
  })),
}, null, 2));
