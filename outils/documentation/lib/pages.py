"""Numéros de page du sommaire, lus dans le PDF rendu par LibreOffice.

Usage : python3 pages.py <document.pdf> <brut.docx.toc.json> <pages.json>

Le PDF exporté par LibreOffice contient un signet (outline) par titre. Pour chaque
entrée du sommaire (toc.json écrit par doc-lib.js), on cherche le signet dont le texte
se termine par le titre et on note sa page. Le résultat (pages.json) est relu au passage
suivant de la construction : c'est pourquoi generer.sh construit le document deux fois.
Nécessite pypdf (pip install pypdf).
"""
import sys, json, re

if len(sys.argv) != 4:
    raise SystemExit(__doc__)
try:
    from pypdf import PdfReader
except ImportError:
    raise SystemExit('pages.py : le module Python « pypdf » est requis (pip install pypdf)')

pdf, tocf, out = sys.argv[1], sys.argv[2], sys.argv[3]
r = PdfReader(pdf)
items = []
def walk(o):
    for it in o:
        if isinstance(it, list): walk(it)
        else: items.append((re.sub(r'\s+', ' ', it.title).strip(), r.get_destination_page_number(it) + 1))
walk(r.outline)
toc = json.load(open(tocf, encoding='utf8'))
res = {}
for e in toc:
    for t, p in items:
        if t.endswith(e['title']):
            res[e['anchor']] = p; break
missing = [e['title'] for e in toc if e['anchor'] not in res]
json.dump(res, open(out, 'w'))
print('pages', len(res), 'missing', missing, 'total', len(r.pages))
