"""Post-traitement du .docx brut produit par doc-lib.js.

Usage : python3 embed_fonts.py <brut.docx> <final.docx> [dossier_polices]
        (dossier_polices par défaut : ../fonts à côté de ce script)

- embarque les polices IBM Plex (TTF obfusqués, norme OOXML) pour un rendu identique
  sur toutes les machines, même sans les polices installées ;
- renumérote les identifiants docPr et de signets (docx-js réutilise le même id) ;
- remplace les marqueurs « §PG:ancre:page§ » du sommaire par des champs PAGEREF
  dont le résultat en cache est le numéro calculé par pages.py ;
- supprime les définitions de styles en double (Title, Heading1…).
"""
import sys, zipfile, uuid, re, os

if len(sys.argv) < 3:
    raise SystemExit(__doc__)
src, dst = sys.argv[1], sys.argv[2]
fontdir = sys.argv[3] if len(sys.argv) > 3 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'fonts')
FONTS = {
    'IBM Plex Sans': {'Regular': 'IBMPlexSans-Regular.ttf', 'Bold': 'IBMPlexSans-Bold.ttf',
                      'Italic': 'IBMPlexSans-Italic.ttf', 'BoldItalic': 'IBMPlexSans-BoldItalic.ttf'},
    'IBM Plex Sans SmBld': {'Regular': 'IBMPlexSans-SemiBold.ttf'},
    'IBM Plex Sans Cond': {'Bold': 'IBMPlexSansCondensed-Bold.ttf'},
    'IBM Plex Mono': {'Regular': 'IBMPlexMono-Regular.ttf', 'Bold': 'IBMPlexMono-Bold.ttf'},
}
PITCH = {'IBM Plex Mono': 'fixed'}
FAMILY = {'IBM Plex Mono': 'modern'}

def obfuscate(data, guid):
    key = bytes.fromhex(guid.replace('-', ''))[::-1]
    head = bytes(b ^ key[i % 16] for i, b in enumerate(data[:32]))
    return head + data[32:]

zin = zipfile.ZipFile(src)
files = {n: zin.read(n) for n in zin.namelist()}

rels, font_xml, n = [], [], 0
for name, styles in FONTS.items():
    embeds = []
    for style in ['Regular', 'Bold', 'Italic', 'BoldItalic']:
        if style not in styles:
            continue
        n += 1
        guid = str(uuid.uuid4()).upper()
        data = open(os.path.join(fontdir, styles[style]), 'rb').read()
        files[f'word/fonts/font{n}.odttf'] = obfuscate(data, guid)
        rid = f'rIdFont{n}'
        rels.append(f'<Relationship Id="{rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/font" Target="fonts/font{n}.odttf"/>')
        embeds.append(f'<w:embed{style} r:id="{rid}" w:fontKey="{{{guid}}}"/>')
    font_xml.append(
        f'<w:font w:name="{name}"><w:charset w:val="00"/><w:family w:val="{FAMILY.get(name, "swiss")}"/>'
        f'<w:pitch w:val="{PITCH.get(name, "variable")}"/>' + ''.join(embeds) + '</w:font>')

doc = files['word/document.xml'].decode('utf8')
counter = iter(range(1, 10000))
doc = re.sub(r'<wp:docPr id="\d+"', lambda m: f'<wp:docPr id="{next(counter)}"', doc)
# docx-js gives every bookmark the same w:id; renumber start/end pairs (they are not nested)
bm = iter(range(1, 10000)); cur = [0]
def _bm(m):
    if m.group(1) == 'Start':
        cur[0] = next(bm)
    return f'<w:bookmark{m.group(1)}{m.group(2)}w:id="{cur[0]}"'
doc = re.sub(r'<w:bookmark(Start|End)(\b[^>]*?)w:id="\d+"', _bm, doc)
# TOC page numbers: turn the "§PG:anchor:page§" marker runs into PAGEREF fields
# whose cached result is the page computed from the LibreOffice render.
def _pageref(m):
    rp = re.search(r'<w:rPr>.*</w:rPr>', m.group(1), flags=re.S)
    rpr, anchor, page = rp.group(0) if rp else '', m.group(2), m.group(3)
    r = lambda inner: f'<w:r>{rpr}{inner}</w:r>'
    return (r('<w:fldChar w:fldCharType="begin"/>')
            + r(f'<w:instrText xml:space="preserve"> PAGEREF {anchor} \\h </w:instrText>')
            + r('<w:fldChar w:fldCharType="separate"/>')
            + r(f'<w:t>{page}</w:t>')
            + r('<w:fldChar w:fldCharType="end"/>'))
doc = re.sub(r'<w:r>((?:(?!<w:r>).)*?)<w:t(?: xml:space="preserve")?>§PG:([^:§]+):([^§]*)§</w:t></w:r>', _pageref, doc, flags=re.S)
files['word/document.xml'] = doc.encode('utf8')

# docx-js writes its own Title/Heading styles before ours: keep only the last definition of each styleId
st_xml = files['word/styles.xml'].decode('utf8')
for sid in set(re.findall(r'<w:style [^>]*w:styleId="([^"]+)"', st_xml)):
    blocks = list(re.finditer(r'<w:style [^>]*w:styleId="%s"[^>]*>.*?</w:style>' % re.escape(sid), st_xml, flags=re.S))
    for b in blocks[:-1][::-1]:
        st_xml = st_xml[:b.start()] + st_xml[b.end():]
files['word/styles.xml'] = st_xml.encode('utf8')
ft = files.get('word/fontTable.xml', b'').decode('utf8')
if '<w:fonts' not in ft:
    raise SystemExit('no fontTable.xml produced by docx')
# drop any existing definitions of our families, then append ours
for name in FONTS:
    ft = re.sub(r'<w:font w:name="%s">.*?</w:font>' % re.escape(name), '', ft, flags=re.S)
if 'xmlns:r=' not in ft.split('>', 2)[1] and 'xmlns:r=' not in ft[:2000]:
    ft = ft.replace('<w:fonts ', '<w:fonts xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ', 1)
if re.search(r'<w:fonts[^>]*/>', ft):
    ft = re.sub(r'<w:fonts([^>]*)/>', lambda m: f'<w:fonts{m.group(1)}>' + ''.join(font_xml) + '</w:fonts>', ft)
else:
    ft = ft.replace('</w:fonts>', ''.join(font_xml) + '</w:fonts>')
files['word/fontTable.xml'] = ft.encode('utf8')

files['word/_rels/fontTable.xml.rels'] = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + ''.join(rels) + '</Relationships>').encode('utf8')

ct = files['[Content_Types].xml'].decode('utf8')
if 'Extension="odttf"' not in ct:
    ct = ct.replace('<Default ', '<Default Extension="odttf" ContentType="application/vnd.openxmlformats-officedocument.obfuscatedFont"/><Default ', 1)
files['[Content_Types].xml'] = ct.encode('utf8')

st = files['word/settings.xml'].decode('utf8')
if 'embedTrueTypeFonts' not in st:
    before = ['writeProtection', 'view', 'zoom', 'removePersonalInformation', 'removeDateAndTime', 'doNotDisplayPageBoundaries',
              'displayBackgroundShape', 'printPostScriptOverText', 'printFractionalCharacterWidth', 'printFormsData']
    pos = None
    for tag in before:
        for m in re.finditer(r'<w:%s\b[^>]*?(/>|>.*?</w:%s>)' % (tag, tag), st, flags=re.S):
            pos = m.end()
    if pos is None:
        m = re.search(r'<w:settings\b[^>]*>', st); pos = m.end()
    st = st[:pos] + '<w:embedTrueTypeFonts/>' + st[pos:]
files['word/settings.xml'] = st.encode('utf8')

docrels = files['word/_rels/document.xml.rels'].decode('utf8')
if 'fontTable.xml' not in docrels:
    docrels = docrels.replace('</Relationships>', '<Relationship Id="rIdFontTable" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/></Relationships>')
    files['word/_rels/document.xml.rels'] = docrels.encode('utf8')
    if 'fontTable+xml' not in ct:
        ct = files['[Content_Types].xml'].decode('utf8').replace('</Types>', '<Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/></Types>')
        files['[Content_Types].xml'] = ct.encode('utf8')

with zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED) as z:
    order = ['[Content_Types].xml'] + [k for k in files if k != '[Content_Types].xml']
    for k in order:
        z.writestr(k, files[k])
print('embedded', n, 'font files ->', dst)
