#!/usr/bin/env python3
"""Génère les pages HTML du site de la Fondation FLEJOM.

Usage : python3 flejom/generer.py

- Tous les textes sont dans ce fichier. Ils viennent du site flejom.org et des
  comptes rendus d'activités de la fondation : ne rien y ajouter qui ne soit pas vrai.
- Galerie : déposer la photo dans flejom/galerie/ et sa vignette dans
  flejom/galerie/thumbs/ (même nom), ajouter une légende dans LEGENDES si on la connaît,
  puis relancer ce script.
"""
import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
e = html.escape

SITE = {
    "nom": "Fondation FLEJOM",
    "email": "contact@flejom.org",
    "tel": "+243 81 984 1553",
    "tel_lien": "+243819841553",
    "mpesa": "081 984 1553",
    "mpesa_titulaire": "Coordonnateur, M. Jules",
    "adresse": "Ave Caniveau n°4286B, Q. Beau Marché, Com. Barumbu, Kinshasa, RDC",
    "instagram": "https://www.instagram.com/f.flejom/",
    "tiktok": "https://www.tiktok.com/@flejom243",
    "description": "La Fondation FLEJOM vient en aide aux personnes vulnérables : veuves, orphelins et familles en difficulté à Kinshasa.",
}

NAV = [
    ("index.html", "Accueil"),
    ("a-propos.html", "À propos"),
    ("actions.html", "Nos actions"),
    ("activites.html", "Activités récentes"),
    ("galerie.html", "Galerie"),
    ("contact.html", "Contact"),
]

# Légendes connues (photos reprises de l'ancien site). Les autres photos n'ont pas de légende.
LEGENDES = {
    "fl-cite-victoire-1.webp": "Visite à l’orphelinat Cité de Victoire",
    "fl-cite-victoire-2.webp": "Visite à l’orphelinat Cité de Victoire",
    "fl-mamans-maraicheres.webp": "Photo de groupe avec les mamans maraîchères",
    "fl-veuves-bassines-1.webp": "Distribution de bassines et matériel aux veuves",
    "fl-veuves-bassines-2.webp": "Distribution de bassines et matériel aux veuves",
    "fl-cadeaux-enfants.webp": "Distribution de cadeaux et fournitures aux enfants",
}

VIDEOS = [
    ("dlZbV8fdt54", "Nos actions sur le terrain"),
    ("r85q1MfeS48", "Activité FLEJOM 2e trimestre"),
    ("v4rZ73rrwjw", "Impact de FLEJOM dans la communauté"),
]

# Comptes rendus d'activités (textes de la fondation)
ACTIVITES = [
    {
        "id": "mamans-maraicheres",
        "titre": "Mamans maraîchères : de l’aide à l’autonomie",
        "lieu": "Association Mbongwana des Mamans Maraîchères",
        "chapo": "La Fondation FLEJOM est allée à la rencontre des mamans maraîchères qu’elle accompagne, pour les écouter et réfléchir avec elles à une activité plus rentable.",
        "photo": ("fl-mamans-maraicheres.webp", "Photo de groupe avec les mamans maraîchères"),
        "corps": [
            "Depuis un certain temps, la fondation soutient ces mamans, piliers de leurs familles, notamment par des semences. Cette fois, la rencontre a pris la forme d’un dialogue franc : qu’est-ce qui freine l’évolution de l’activité ? La terre, l’eau, la technique, la vente, la gestion de l’argent ? Le Coordonnateur, Mr Jules, a invité chaque maman à dire sincèrement ce qui manque et ce qu’elle est prête à changer.",
            "Les mamans ont partagé leurs réalités de terrain : une terre souvent difficile, des insectes qui abîment les récoltes et une irrigation compliquée. Le Dr Serge, expert en maraîchage, a salué leur travail et s’est engagé à les accompagner de conseils pratiques pour rendre la production plus rentable.",
            "Maman Maguy a ensuite remis les dons de la fondation : pagnes, graines à semer, arrosoirs, bassines et une enveloppe de soutien. La rencontre s’est achevée dans une ambiance familiale, par une photo d’ensemble et une prière de clôture.",
        ],
        "citation": ("L’aide que nous apportons doit être considérée comme un tremplin, et non comme une dépendance.", "Mr Jules, Coordonnateur"),
        "beneficiaires": "Les mamans maraîchères accompagnées par la fondation",
        "appuis": "Pagnes, graines, arrosoirs, bassines, enveloppe de soutien",
    },
    {
        "id": "chero-valeur",
        "titre": "Orphelinat CHERO : « Vous avez de la valeur »",
        "lieu": "Orphelinat CHERO",
        "chapo": "Le même jour, la délégation a rendu visite aux enfants de l’orphelinat CHERO, accueillie par la responsable, Maman Laurentine.",
        "corps": [
            "Les enfants ont accueilli la fondation avec chaleur : elle avait promis de revenir après sa visite de décembre, et elle est revenue. Mr Jules les a remerciés, ainsi que Maman Laurentine pour sa mission auprès d’eux, et leur a transmis un message : les circonstances de la vie ne décident pas de ce que l’on devient. Le passé n’est pas une prison, et l’on grandit en étant sérieux dans les petites choses : apprendre, travailler, respecter, rester discipliné et ne jamais abandonner.",
            "Il leur a aussi rappelé que l’aide reçue ne les rend pas inférieurs : elle témoigne de leur valeur. Devenus grands, ils pourront à leur tour aider d’autres personnes. Maman Maguy, épouse du Président de la fondation, leur a adressé un mot d’encouragement.",
            "La fondation a remis un lot de lits, des objets de première nécessité et une enveloppe d’accompagnement. Deux jeunes enfants ont récité un texte de remerciement, dans un moment d’émotion partagée.",
        ],
        "citation": ("Vous avez de la valeur.", "Mr Jules, Coordonnateur"),
        "beneficiaires": "Les enfants de l’orphelinat CHERO",
        "appuis": "Lot de lits, objets de première nécessité, enveloppe d’accompagnement, assistance pour la rentrée scolaire",
    },
    {
        "id": "dieu-mon-refuge",
        "titre": "Dieu mon refuge : rentrée scolaire et espérance",
        "lieu": "Orphelinat Dieu mon refuge",
        "chapo": "La fondation est revenue auprès des enfants de l’orphelinat Dieu mon refuge pour les aider à bien démarrer l’année scolaire.",
        "corps": [
            "La délégation a apporté une assistance pour la rentrée scolaire, des denrées alimentaires et des vêtements pour les plus jeunes. Arrivée en fin de matinée alors que les enfants étaient encore à l’école, elle a attendu le retour du groupe du matin pour commencer, car cette visite était d’abord pour eux.",
            "Mr Jules s’est dit heureux de revenir parmi eux et leur a redit qu’ils sont précieux, aimés et qu’ils ont de la valeur. Il les a encouragés à garder l’espérance, à rêver grand, à travailler avec courage et à aimer Dieu et leur prochain, pour devenir un jour une source de bénédiction pour d’autres : « Nous croyons en vous. Nous prions pour vous. »",
            "La délégation a constaté avec joie l’évolution positive de plusieurs enfants, retrouvés en bonne santé, joyeux et en interaction avec les autres. La visite s’est conclue par un moment d’échange vécu dans la joie.",
        ],
        "citation": ("Car moi, je connais les projets que j’ai formés sur vous, dit l’Éternel, projets de paix et non de malheur, afin de vous donner un avenir et de l’espérance.", "Jérémie 29:11, cité par le Coordonnateur"),
        "beneficiaires": "Les enfants de l’orphelinat Dieu mon refuge",
        "appuis": "Assistance pour la rentrée scolaire, denrées alimentaires, vêtements pour les plus jeunes",
    },
    {
        "id": "chero-partage",
        "titre": "Orphelinat CHERO : une journée de partage",
        "lieu": "Quartier Congo, Camp Luka · décembre 2025",
        "chapo": "Dernière activité officielle de l’année 2025, au quartier Congo, Camp Luka : un moment de communion fraternelle et de solidarité avec les enfants de l’orphelinat.",
        "corps": [
            "Tôt le matin, les membres de la fondation se sont retrouvés chez le Président pour préparer la journée : équipes, jeux, repas. Un temps d’intercession, conduit par le Président, puis la prière du Pasteur Diamant, venu avec sa famille, ont placé l’activité sous la guidance divine. À l’orphelinat, les enfants, les encadreurs et les mamans maraîchères ont accueilli la délégation par des chants et des danses.",
            "Mr Jules, Coordonnateur, a ouvert la rencontre. Le Président a rappelé que la fondation agit par amour du prochain, par partage et par solidarité envers les plus vulnérables, avant d’adresser aux enfants un message accueilli avec joie et acclamations.",
            "La journée s’est déroulée en petits ateliers : lecture encadrée, coloriage, jeux éducatifs et montage d’un trampoline. Le repas a été partagé, le Président allant de table en table avec les enfants et les mamans. Puis sont venus un match de football et un sketch de l’humoriste Felix Kisabaka, applaudi par tous.",
            "Avant la clôture, les enfants ont reçu des cadeaux pour Noël et le Nouvel An. Des dons en nature ont été remis à l’orphelinat et aux mamans maraîchères, ainsi que des enveloppes de soutien à Maman Laurentine, responsable de l’orphelinat, et à la Présidente de l’Association Mbongwana des Mamans Maraîchères. La prière de clôture du Pasteur Diamant a béni cette journée, vécue dans l’ordre et la bonne humeur.",
        ],
        "citation": ("Chers enfants, vous avez une valeur inestimable. Vous êtes porteurs de talents et de potentialités uniques.", "Le Président de la Fondation FLEJOM"),
        "beneficiaires": "Les enfants de l’orphelinat, les encadreurs et les mamans maraîchères",
        "appuis": "Riz, poissons, cuisses de poulet, sucre, huile, savon, habits, vélos pour enfants, trampoline, cadeaux de fin d’année, enveloppes de soutien",
    },
]


def layout(page, title, description, body):
    nav = "".join(
        f'<a href="{href}"{" aria-current=\"page\"" if href == page else ""}>{label}</a>'
        for href, label in NAV
    )
    titre = (f"{title} – {SITE['nom']}" if page != "index.html"
             else "Fondation FLEJOM – Veuves, orphelins et personnes vulnérables à Kinshasa")
    jsonld = json.dumps({
        "@context": "https://schema.org", "@type": "NGO", "name": SITE["nom"],
        "alternateName": "Fondation Léon Joséphine Mukwanga", "url": "https://flejom.org/",
        "email": SITE["email"], "telephone": SITE["tel"],
        "address": {"@type": "PostalAddress", "streetAddress": "Ave Caniveau n°4286B, Q. Beau Marché, Com. Barumbu",
                    "addressLocality": "Kinshasa", "addressCountry": "CD"},
        "sameAs": [SITE["instagram"], SITE["tiktok"]],
    }, ensure_ascii=False)
    don_courant = ' aria-current="page"' if page == "don.html" else ""
    return f"""<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(titre)}</title>
<meta name="description" content="{e(description)}">
<meta name="theme-color" content="#1b3560">
<meta property="og:type" content="website">
<meta property="og:title" content="{e(titre)}">
<meta property="og:description" content="{e(description)}">
<meta property="og:image" content="assets/img/logo.jpg">
<link rel="icon" href="assets/img/logo.webp" type="image/webp">
<link rel="apple-touch-icon" href="assets/img/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Source+Sans+3:wght@400;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/css/style.css">
<script type="application/ld+json">{jsonld}</script>
</head>
<body>
<div class="drapeau" aria-hidden="true"></div>
<a class="sr-only" href="#contenu">Aller au contenu</a>
<header class="site-header">
  <div class="wrap">
    <a class="brand" href="index.html"><img src="assets/img/logo.webp" alt="" width="50" height="50"><span><strong>Fondation FLEJOM</strong><small>Léon Joséphine Mukwanga</small></span></a>
    <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="nav">Menu</button>
    <nav class="nav" id="nav" aria-label="Navigation principale">{nav}<a class="btn btn-don" href="don.html"{don_courant}>Faire un don</a></nav>
  </div>
</header>
<main id="contenu">
{body}
</main>
<div class="motif" aria-hidden="true"></div>
<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div>
        <h2>Fondation FLEJOM</h2>
        <p>Fondation Léon Joséphine Mukwanga.<br>Agir pour les plus vulnérables.</p>
        <p><a href="{SITE["instagram"]}" target="_blank" rel="noopener">Instagram</a> · <a href="{SITE["tiktok"]}" target="_blank" rel="noopener">TikTok</a></p>
      </div>
      <div>
        <h2>S’impliquer</h2>
        <ul>
          <li><a href="don.html">Faire un don</a></li>
          <li><a href="contact.html?sujet=benevolat">Devenir bénévole</a></li>
          <li><a href="actions.html#partenaires">Nos partenaires</a></li>
          <li><a href="contact.html?sujet=partenariat">Proposer un partenariat</a></li>
        </ul>
      </div>
      <div>
        <h2>Nous joindre</h2>
        <ul>
          <li>{e(SITE["adresse"])}</li>
          <li><a href="tel:{SITE["tel_lien"]}">{SITE["tel"]}</a></li>
          <li><a href="mailto:{SITE["email"]}">{SITE["email"]}</a></li>
        </ul>
      </div>
    </div>
    <p class="mot-logo" aria-hidden="true">FLEJOM</p>
    <p class="footer-bas">© Fondation FLEJOM. Tous droits réservés.</p>
  </div>
</footer>
<div class="lightbox" role="dialog" aria-modal="true" aria-label="Photo agrandie">
  <span class="lb-count"></span>
  <button class="lb-close" type="button">Fermer</button>
  <button class="ss-btn ss-prev" type="button" aria-label="Photo précédente">‹</button>
  <img alt="">
  <p class="lb-legende"></p>
  <button class="ss-btn ss-next" type="button" aria-label="Photo suivante">›</button>
</div>
<script src="galerie/galerie-photos.js"></script>
<script src="assets/js/main.js"></script>
</body>
</html>
"""


def page_title(titre, sous_titre):
    return f'<div class="page-title"><div class="wrap"><h1>{e(titre)}</h1><p>{e(sous_titre)}</p></div></div><div class="motif" aria-hidden="true"></div>'


def carrousel_3d():
    return """<div class="c3d" role="region" aria-roledescription="carrousel" aria-label="Photos de la fondation en 3D">
  <div class="c3d-scene" tabindex="0"><div class="c3d-ring"></div></div>
  <div class="c3d-controls">
    <button type="button" data-prev aria-label="Tourner vers la gauche">‹</button>
    <span class="c3d-aide">Faites glisser pour tourner, cliquez sur une photo pour l’agrandir</span>
    <button type="button" data-next aria-label="Tourner vers la droite">›</button>
  </div>
</div>"""


def bloc_mpesa(titre_niveau="h3"):
    return f"""<div class="mpesa">
  <{titre_niveau}>Don par M-Pesa</{titre_niveau}>
  <p>Faites votre don via M-Pesa au numéro ci-dessous, au nom de notre Coordonnateur.</p>
  <p class="numero">{SITE["mpesa"]}</p>
  <p>{SITE["mpesa_titulaire"]}</p>
  <button class="btn btn-blanc" type="button" data-copy="{SITE["mpesa"].replace(" ", "")}">Copier le numéro</button>
</div>"""


# ---------- Pages ----------
def accueil():
    slides = [
        ("enfants", "FLEJOM – Fondation Léon Joséphine Mukwanga", "Ensemble, construisons un avenir plus solidaire"),
        ("maraichage", "Les Mamans Maraîchères", "Autonomisation des mères vulnérables par le maraîchage"),
        ("veuves", "Construire un avenir solidaire", "Autonomisation des veuves par l’entraide et l’accompagnement"),
        ("solidarite", "Ensemble pour l’éducation", "Unissons-nous pour offrir un avenir meilleur aux enfants"),
        ("education", "Unis dans la solidarité", "Chaque geste compte pour soutenir les plus fragiles"),
        ("orphelinat", "Orphelinat Cité de Victoire", "Accompagnement et soutien aux enfants orphelins"),
        ("famille", "Une grande famille solidaire", "Ensemble pour protéger et éduquer nos enfants"),
    ]
    imgs = "".join(
        f'<div class="hero-slide"><img src="assets/img/{img}.webp" alt="" {"fetchpriority=\"high\"" if i == 0 else "loading=\"lazy\""}></div>'
        for i, (img, _, _) in enumerate(slides)
    )
    legendes = "".join(
        f'<div class="hero-legende"{" hidden" if i else ""}>'
        + (f"<h1>{e(t)}</h1>" if i == 0 else f'<p class="sr-only">Diapositive {i + 1}</p><h2>{e(t)}</h2>')
        + f"<p>{e(s)}</p></div>"
        for i, (_, t, s) in enumerate(slides)
    )
    une = ACTIVITES[0]
    autres = "".join(
        f"""<article class="act-num">
  <span class="num" aria-hidden="true">0{i + 2}</span>
  <div>
    <p class="lieu">{e(a["lieu"])}</p>
    <h3><a href="activites.html#{a["id"]}">{e(a["titre"])}</a></h3>
    <p>{e(a["chapo"])}</p>
  </div>
</article>"""
        for i, a in enumerate(ACTIVITES[1:])
    )
    valeurs = " ".join(f"<span>{v}</span><i aria-hidden=\"true\">★</i>" for v in ["Solidarité", "Dignité humaine", "Transparence", "Engagement"])
    body = f"""
<section class="hero" aria-label="Présentation de la fondation">
  {imgs}
  <div class="hero-content">
    <div class="wrap">
      <p class="hero-sur">Kinshasa · RD Congo</p>
      {legendes}
      <div class="boutons">
        <a class="btn btn-don" href="don.html">Faire un don</a>
        <a class="btn btn-blanc" href="a-propos.html">Découvrir notre mission</a>
      </div>
    </div>
  </div>
  <div class="hero-nav">
    <span class="hero-count"></span>
    <button type="button" data-prev aria-label="Photo précédente">‹</button>
    <button type="button" data-next aria-label="Photo suivante">›</button>
  </div>
</section>
<div class="motif" aria-hidden="true"></div>

<section class="accueil-intro">
  <div class="wrap mosaique-grid">
    <div class="mosaique" aria-hidden="true">
      <img class="m1" src="assets/img/famille.webp" alt="" loading="lazy">
      <img class="m2" src="assets/img/veuves.webp" alt="" loading="lazy">
      <img class="m3" src="assets/img/solidarite.webp" alt="" loading="lazy">
    </div>
    <div>
      <p class="sur-titre">Bienvenue</p>
      <h2 class="grand">Agir pour les plus vulnérables</h2>
      <p class="intro">Nous sommes une organisation humanitaire engagée dans le soutien aux plus vulnérables : veuves, orphelins, personnes vulnérables. À travers des dons en nature et en espèces, nous renforçons les actions de structures existantes tout en préparant la création de notre propre espace d’accueil.</p>
      <p>Explorez nos projets, découvrez notre mission, et rejoignez-nous dans cette aventure humaine où chaque geste compte.</p>
      <div class="boutons"><a class="btn btn-plein" href="actions.html">Nos actions</a><a class="btn btn-contour" href="contact.html">Nous contacter</a></div>
    </div>
  </div>
</section>

<div class="ruban" aria-label="Nos valeurs : solidarité, dignité humaine, transparence, engagement"><div class="ruban-piste" aria-hidden="true">{valeurs} {valeurs} {valeurs} {valeurs}</div></div>

<section class="bg-creme">
  <div class="wrap">
    <div class="titre-section"><h2>Nos activités récentes</h2><a href="activites.html">Tous les récits →</a></div>
    <article class="une">
      <figure class="une-photo"><img src="galerie/{une["photo"][0]}" alt="{e(une["photo"][1])}" loading="lazy"><span class="num" aria-hidden="true">01</span></figure>
      <div class="une-texte">
        <p class="lieu">{e(une["lieu"])}</p>
        <h3><a href="activites.html#{une["id"]}">{e(une["titre"])}</a></h3>
        <p>{e(une["chapo"])}</p>
        <blockquote class="citation"><p>« {e(une["citation"][0])} »</p><footer>— {e(une["citation"][1])}</footer></blockquote>
        <a class="lire" href="activites.html#{une["id"]}">Lire le récit →</a>
      </div>
    </article>
    <div class="act-liste">{autres}</div>
  </div>
</section>

<section class="sombre">
  <div class="wrap">
    <div class="titre-section"><h2>Notre action en images</h2><a href="galerie.html">Voir toute la galerie →</a></div>
    {carrousel_3d()}
  </div>
</section>
<div class="motif" aria-hidden="true"></div>

<section class="fondateur">
  <div class="wrap">
    <p class="sur-titre">Mot du fondateur</p>
    <blockquote class="grande-citation"><p>« La souffrance des autres ne doit jamais nous laisser indifférents. »</p></blockquote>
    <div class="deux-col">
      <div>
        <p>La Fondation FLEJOM est née d’un appel intérieur : celui de répondre aux cris silencieux des oubliés. En visitant des orphelinats, en écoutant les récits de veuves abandonnées, j’ai compris que l’action ne pouvait plus attendre.</p>
        <p>Notre mission est simple mais profonde : tendre la main là où l’espoir vacille. Nous ne prétendons pas tout résoudre, mais nous croyons que chaque acte de solidarité est une victoire sur l’indifférence.</p>
        <p>Je vous invite à marcher avec nous. À donner, à partager, à croire. Ensemble, nous pouvons bâtir un avenir plus juste.</p>
        <p class="signature">— KM, Fondateur de la Fondation FLEJOM</p>
      </div>
      <div>
        {bloc_mpesa()}
        <p style="margin-top:18px">Notre compte bancaire arrive bientôt. <a href="don.html">Plus d’informations sur les dons</a></p>
      </div>
    </div>
  </div>
</section>
"""
    return layout("index.html", "Accueil", SITE["description"], body)


def a_propos():
    body = f"""
{page_title("À propos de FLEJOM", "Fondation Léon Joséphine Mukwanga")}
<section>
  <div class="wrap deux-col">
    <div class="narrow">
      <h2>Notre histoire</h2>
      <p class="intro">La Fondation FLEJOM est née d’un profond désir de venir en aide aux plus vulnérables de notre société — en particulier les veuves, les orphelins et les personnes en situation de précarité. Face aux réalités du terrain, nous avons choisi d’agir avec compassion, rigueur et engagement.</p>
      <h2 style="margin-top:1.4em">Notre mission</h2>
      <p>Nous soutenons des structures existantes (orphelinats, centres d’accueil, foyers) en leur apportant des dons en nature et en espèces. Ces appuis permettent de renforcer leurs actions et d’améliorer les conditions de vie des bénéficiaires.</p>
      <h2 style="margin-top:1.4em">Notre vision</h2>
      <p>Nous aspirons à créer, dans un avenir proche, notre propre espace d’accueil et d’accompagnement. Un lieu de dignité, de sécurité et d’espoir, où chaque personne accueillie pourra retrouver un chemin vers l’autonomie et la sérénité.</p>
    </div>
    <figure class="photo"><img src="assets/img/orphelinat.webp" alt="Membres de la fondation et enfants devant l’orphelinat Cité de Victoire" loading="lazy"><figcaption>Visite à l’orphelinat Cité de Victoire</figcaption></figure>
  </div>
</section>
<section class="bg-creme">
  <div class="wrap">
    <div class="titre-section"><h2>Nos valeurs</h2></div>
    <dl class="valeurs">
      <div><dt>Solidarité</dt><dd>Chaque geste compte. Ensemble, nous pouvons alléger les souffrances.</dd></div>
      <div><dt>Respect de la dignité humaine</dt><dd>Chaque bénéficiaire est accueilli avec bienveillance et considération.</dd></div>
      <div><dt>Transparence</dt><dd>Nous veillons à une gestion rigoureuse et responsable des ressources confiées.</dd></div>
      <div><dt>Engagement</dt><dd>Notre action est constante, portée par la foi en un avenir meilleur pour tous.</dd></div>
    </dl>
  </div>
</section>
<section>
  <div class="wrap narrow">
    <h2>Sur le terrain</h2>
    <p>Lors des visites, la délégation de la fondation est conduite par le Président de la fondation et par Mr Jules, Coordonnateur, avec Maman Maguy, épouse du Président.</p>
    <p><a href="activites.html">Lire les comptes rendus de nos activités récentes</a></p>
  </div>
</section>
"""
    return layout("a-propos.html", "À propos", "Histoire, mission, vision et valeurs de la Fondation FLEJOM.", body)


def actions():
    body = f"""
{page_title("Nos actions", "Soutenir les structures existantes pour transformer des vies")}
<section>
  <div class="wrap deux-col">
    <div>
      <h2>Soutenir les structures existantes</h2>
      <p class="intro">Depuis sa création, la Fondation FLEJOM concentre ses efforts sur le soutien direct aux structures déjà engagées auprès des veuves, orphelins et personnes vulnérables. Nous collaborons avec des orphelinats, des centres d’accueil et des foyers communautaires pour renforcer leur impact sur le terrain.</p>
      <dl class="coord">
        <dt>Dons en nature</dt><dd>Vivres, vêtements, matériel scolaire, produits d’hygiène pour répondre aux besoins essentiels.</dd>
        <dt>Dons en espèces</dt><dd>Appuis financiers ponctuels pour les besoins urgents des structures partenaires.</dd>
        <dt>Accompagnement</dt><dd>Visites régulières, écoute attentive et conseils pour un soutien moral et logistique.</dd>
      </dl>
    </div>
    <div>
      <figure class="photo"><img src="assets/img/veuves.webp" alt="Distribution de bassines et de matériel aux veuves" loading="lazy"><figcaption>Distribution de bassines et matériel aux veuves</figcaption></figure>
      <h3 style="margin-top:28px">Cibles prioritaires</h3>
      <ul class="liste">
        <li>Veuves en situation de vulnérabilité</li>
        <li>Orphelins nécessitant un soutien</li>
        <li>Personnes en situation de précarité</li>
        <li>Structures d’accueil existantes</li>
      </ul>
    </div>
  </div>
</section>
<section class="bg-creme" id="partenaires">
  <div class="wrap">
    <div class="titre-section"><h2>Nos partenaires actuels</h2><a href="activites.html">Comptes rendus des visites</a></div>
    <p class="narrow intro">La Fondation FLEJOM agit en collaboration avec des structures locales, des donateurs engagés et des institutions sensibles à notre mission. Ces partenariats sont le socle de notre impact.</p>
    <p class="narrow" style="margin-bottom:30px">Chaque action est pensée pour répondre à un besoin concret. Nous intervenons dans les quartiers les plus touchés, en partenariat avec des acteurs locaux de confiance. Nos distributions sont organisées avec rigueur et transparence, dans le respect de la dignité des bénéficiaires.</p>
    <div class="structures">
      <article class="structure"><img src="assets/img/maraichage.webp" alt="Les mamans maraîchères" loading="lazy"><div>
        <h3>Association MBONGWANA</h3>
        <p class="lieu">Soutien aux veuves · Kinshasa</p>
        <p>Association des mamans maraîchères. La fondation soutient ces mamans, piliers de leurs familles, notamment par des semences. Dernier appui : pagnes, graines, arrosoirs, bassines et une enveloppe de soutien.</p>
        <p><a href="activites.html#mamans-maraicheres">Lire le récit</a></p></div></article>
      <article class="structure"><img src="assets/img/orphelinat.webp" alt="Orphelinat Cité de Victoire" loading="lazy"><div>
        <h3>Cité de Victoire</h3>
        <p class="lieu">Orphelinat à Kinshasa</p>
        <p>Accompagnement et soutien aux enfants orphelins.</p>
        <p><a href="galerie.html">Voir les photos</a></p></div></article>
      <article class="structure"><div>
        <h3>CHERO</h3>
        <p class="lieu">Orphelinat à Kinshasa</p>
        <p>Quartier Congo, Camp Luka. Responsable : Maman Laurentine.</p>
        <p>Journée de partage à la fin de l’année 2025, puis nouvelle visite avec un lot de lits, des objets de première nécessité et une assistance pour la rentrée scolaire.</p>
        <p><a href="activites.html#chero-partage">La journée de partage</a> · <a href="activites.html#chero-valeur">La seconde visite</a></p></div></article>
      <article class="structure"><div>
        <h3>Dieu Mon Refuge</h3>
        <p class="lieu">Orphelinat à Kinshasa</p>
        <p>Remise de dons, puis assistance pour la rentrée scolaire, denrées alimentaires et vêtements pour les plus jeunes.</p>
        <p><a href="activites.html#dieu-mon-refuge">Lire le récit</a></p></div></article>
    </div>
    <p style="margin-top:30px">Vous souhaitez collaborer avec nous ? <a href="contact.html?sujet=partenariat">Écrivez-nous</a>.</p>
  </div>
</section>
<section>
  <div class="wrap deux-col centre">
    <div>
      <h2>Objectif 2026 : notre propre espace</h2>
      <p class="intro">Notre vision est claire : disposer d’un espace dédié à l’accueil, à l’écoute et à l’accompagnement des personnes en détresse. Ce lieu permettra d’organiser des activités éducatives et sociales, d’offrir un hébergement temporaire aux plus fragiles, et de centraliser nos opérations pour plus d’efficacité.</p>
      <a class="btn btn-don" href="don.html">Soutenir ce projet</a>
    </div>
    <figure class="photo"><img src="assets/img/solidarite.webp" alt="Distribution de cadeaux et de fournitures aux enfants" loading="lazy"><figcaption>Distribution de cadeaux et fournitures aux enfants</figcaption></figure>
  </div>
</section>
"""
    return layout("actions.html", "Nos actions", "Dons en nature, dons en espèces et accompagnement : les actions de la Fondation FLEJOM à Kinshasa.", body)


def activites():
    sommaire = "".join(f'<li><a href="#{a["id"]}">{e(a["titre"])}</a></li>' for a in ACTIVITES)
    recits = []
    for a in ACTIVITES:
        photo = ""
        if a.get("photo"):
            photo = f'<figure class="recit-photo"><img src="galerie/{a["photo"][0]}" alt="{e(a["photo"][1])}" loading="lazy"><figcaption>{e(a["photo"][1])}</figcaption></figure>'
        corps = "".join(f"<p>{e(p)}</p>" for p in a["corps"])
        recits.append(f"""<article class="recit" id="{a["id"]}">
  <div class="wrap">
    <p class="lieu">{e(a["lieu"])}</p>
    <h2>{e(a["titre"])}</h2>
    <p class="chapo narrow">{e(a["chapo"])}</p>
    {photo}
    <div class="recit-corps">
      <div>{corps}<blockquote class="citation"><p>« {e(a["citation"][0])} »</p><footer>— {e(a["citation"][1])}</footer></blockquote></div>
      <dl class="encadre"><dt>Bénéficiaires</dt><dd>{e(a["beneficiaires"])}</dd><dt>Appuis remis</dt><dd>{e(a["appuis"])}</dd></dl>
    </div>
  </div>
</article>""")
    body = f"""
<div class="page-title"><div class="wrap"><h1>Nos activités récentes</h1><p>Retour sur les actions menées dernièrement par la Fondation FLEJOM.</p><ul class="sommaire">{sommaire}</ul></div></div><div class="motif" aria-hidden="true"></div>
{"".join(recits)}
<section class="bg-creme">
  <div class="wrap deux-col centre">
    <div><h2>Soutenir les prochaines visites</h2><p class="intro">Les appuis remis lors de ces visites viennent des dons reçus par la fondation.</p><a class="btn btn-plein" href="galerie.html">Voir les photos</a></div>
    {bloc_mpesa()}
  </div>
</section>
"""
    return layout("activites.html", "Activités récentes", "Comptes rendus des dernières visites de la Fondation FLEJOM : mamans maraîchères, orphelinats CHERO et Dieu mon refuge.", body)


def galerie():
    videos = "".join(
        f'<div><div class="video"><iframe src="https://www.youtube-nocookie.com/embed/{vid}" title="{e(t)}" loading="lazy" allow="encrypted-media; picture-in-picture" allowfullscreen></iframe></div><h3>{e(t)}</h3></div>'
        for vid, t in VIDEOS
    )
    body = f"""
{page_title("Notre action en images", "Découvrez le quotidien de notre fondation et l’impact de nos programmes sur les communautés.")}
<section class="sombre">
  <div class="wrap">
    {carrousel_3d()}
  </div>
</section>
<section class="bg-creme">
  <div class="wrap">
    <div class="titre-section"><h2>Diaporama</h2></div>
    <div class="slideshow" tabindex="0" aria-roledescription="carrousel" aria-label="Diaporama des photos">
      <div class="ss-stage"></div>
      <button class="ss-btn ss-prev" type="button" aria-label="Photo précédente">‹</button>
      <button class="ss-btn ss-next" type="button" aria-label="Photo suivante">›</button>
    </div>
    <div class="ss-bar"><button type="button" data-play>Pause</button><span class="ss-legende" aria-live="polite"></span><span class="ss-count"></span></div>
    <div class="thumbs" aria-label="Miniatures"></div>
  </div>
</section>
<section>
  <div class="wrap">
    <div class="titre-section"><h2>Toutes les photos</h2><span class="muted">Cliquez sur une photo pour l’agrandir</span></div>
    <div class="photo-grid"></div>
  </div>
</section>
<section class="bg-creme">
  <div class="wrap">
    <div class="titre-section"><h2>Vidéos</h2></div>
    <div class="videos">{videos}</div>
  </div>
</section>
"""
    return layout("galerie.html", "Galerie", "Photos et vidéos des actions de la Fondation FLEJOM auprès des veuves, des orphelins et des mamans maraîchères à Kinshasa.", body)


def don():
    recents = "".join(
        f'<li><a href="activites.html#{a["id"]}">{e(a["lieu"])}</a> : {e(a["appuis"][0].lower() + a["appuis"][1:])}</li>'
        for a in ACTIVITES
    )
    body = f"""
{page_title("Faire un don", "Chaque don, qu’il soit petit ou grand, contribue à transformer des vies")}
<section>
  <div class="wrap deux-col">
    <div>
      <h2>Pourquoi donner ?</h2>
      <p class="intro">En soutenant la Fondation FLEJOM, vous participez à une chaîne de solidarité qui apporte réconfort, dignité et espoir aux veuves, orphelins et personnes vulnérables.</p>
      <h3>Ce que votre don permet</h3>
      <ul class="liste">
        <li>Offrir des repas et des vêtements à ceux qui en ont besoin</li>
        <li>Renforcer les structures d’accueil existantes pour plus d’impact</li>
        <li>Contribuer à la création de notre propre espace d’accueil (objectif 2026)</li>
        <li>Organiser des activités éducatives et sociales pour les bénéficiaires</li>
      </ul>
      <h3 style="margin-top:1.4em">Ce qui a été remis lors des dernières visites</h3>
      <ul class="liste">{recents}</ul>
    </div>
    <div>
      {bloc_mpesa("h2")}
      <h3 style="margin-top:30px">Virement bancaire</h3>
      <p>Bientôt disponible. Nos coordonnées bancaires seront publiées ici très prochainement. En attendant, vous pouvez nous soutenir dès maintenant via M-Pesa.</p>
      <h3 style="margin-top:24px">Transparence</h3>
      <p>Tous les dons sont traités avec transparence. La Fondation FLEJOM est une organisation à but non lucratif : vos dons sont utilisés directement pour nos programmes d’aide.</p>
      <p>Pour toute question concernant les dons : <a href="mailto:{SITE["email"]}">{SITE["email"]}</a></p>
    </div>
  </div>
</section>
"""
    return layout("don.html", "Faire un don", "Soutenir la Fondation FLEJOM par M-Pesa au 081 984 1553.", body)


def contact():
    body = f"""
{page_title("Contactez-nous", "Une question, une proposition, un besoin ? Nous sommes à votre écoute.")}
<section>
  <div class="wrap deux-col">
    <div>
      <p class="intro">Que vous soyez une structure partenaire, un donateur potentiel ou simplement curieux de notre mission, n’hésitez pas à nous contacter.</p>
      <dl class="coord">
        <dt>Adresse</dt><dd>{e(SITE["adresse"])}</dd>
        <dt>Téléphone</dt><dd><a href="tel:{SITE["tel_lien"]}">{SITE["tel"]}</a></dd>
        <dt>E-mail</dt><dd><a href="mailto:{SITE["email"]}">{SITE["email"]}</a></dd>
        <dt>Réseaux sociaux</dt><dd><a href="{SITE["instagram"]}" target="_blank" rel="noopener">Instagram</a> · <a href="{SITE["tiktok"]}" target="_blank" rel="noopener">TikTok</a></dd>
      </dl>
    </div>
    <div>
      <h2>Envoyez-nous un message</h2>
      <form id="contact-form">
        <div class="champ"><label for="sujet">Sujet</label>
          <select id="sujet" name="sujet">
            <option>Demande d’information</option>
            <option>Devenir bénévole</option>
            <option>Partenariat</option>
            <option>Don</option>
          </select></div>
        <div class="champ"><label for="nom">Nom complet</label><input id="nom" name="nom" required minlength="2" maxlength="100" autocomplete="name"></div>
        <div class="champ"><label for="email">E-mail</label><input id="email" name="email" type="email" required maxlength="255" autocomplete="email"></div>
        <div class="champ"><label for="tel">Téléphone (facultatif)</label><input id="tel" name="tel" type="tel" maxlength="20" autocomplete="tel"></div>
        <div class="champ"><label for="message">Message</label><textarea id="message" name="message" required minlength="10" maxlength="2000"></textarea></div>
        <button class="btn btn-plein" type="submit">Envoyer le message</button>
        <p class="aide-form">Le bouton ouvre votre messagerie avec le message déjà rempli, adressé à {SITE["email"]}.</p>
      </form>
    </div>
  </div>
</section>
<div class="wrap" style="padding-bottom:72px"><div class="carte"><iframe title="Carte : Barumbu, Kinshasa" loading="lazy" src="https://www.google.com/maps?q=Barumbu,+Kinshasa&amp;output=embed"></iframe></div></div>
"""
    return layout("contact.html", "Contact", "Adresse, téléphone et e-mail de la Fondation FLEJOM à Kinshasa.", body)


def page_404():
    body = f"""{page_title("Page introuvable", "Cette page n’existe pas ou a été déplacée.")}
<section><div class="wrap"><a class="btn btn-plein" href="index.html">Retour à l’accueil</a></div></section>"""
    return layout("404.html", "Page introuvable", SITE["description"], body)


def main():
    noms = sorted(p.name for p in (ROOT / "galerie").iterdir()
                  if p.suffix.lower() in {".webp", ".jpg", ".jpeg", ".png"})
    # Les photos légendées d'abord, puis les autres
    noms.sort(key=lambda n: (n not in LEGENDES, n))
    photos = []
    for n in noms:
        item = {"f": n}
        if n in LEGENDES:
            item["c"] = LEGENDES[n]
        try:
            from PIL import Image
            with Image.open(ROOT / "galerie" / n) as im:
                if im.height > im.width:
                    item["v"] = 1  # photo en hauteur
        except ImportError:
            pass
        photos.append(item)
    (ROOT / "galerie" / "galerie-photos.js").write_text(
        "/* Généré par generer.py — photos de la galerie (f : fichier, c : légende, v : en hauteur) */\n"
        "window.FLEJOM_PHOTOS = " + json.dumps(photos, ensure_ascii=False, indent=1) + ";\n",
        encoding="utf-8")
    pages = {
        "index.html": accueil, "a-propos.html": a_propos, "actions.html": actions,
        "activites.html": activites, "galerie.html": galerie, "don.html": don,
        "contact.html": contact, "404.html": page_404,
    }
    for name, fn in pages.items():
        (ROOT / name).write_text(fn(), encoding="utf-8")
    print(f"{len(pages)} pages générées, {len(photos)} photos dans la galerie.")


if __name__ == "__main__":
    main()
