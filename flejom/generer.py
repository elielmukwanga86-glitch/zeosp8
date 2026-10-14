#!/usr/bin/env python3
"""Génère les pages HTML du site de la Fondation FLEJOM.

Usage : python3 flejom/generer.py
- Les textes sont dans ce fichier (une fonction par page).
- Pour ajouter des photos à la galerie : déposer des fichiers .webp/.jpg dans
  flejom/galerie/ (et leur vignette dans flejom/galerie/thumbs/), puis relancer.
"""
import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent

SITE = {
    "nom": "Fondation FLEJOM",
    "complet": "FLEJOM – Fondation Léon Joséphine Mukwanga",
    "slogan": "Ensemble, construisons un avenir plus solidaire",
    "email": "contact@flejom.org",
    "tel": "+243 81 984 1553",
    "tel_lien": "+243819841553",
    "mpesa": "081 984 1553",
    "mpesa_titulaire": "Coordonnateur, M. Jules",
    "adresse": "Ave Caniveau n°4286B, Q. Beau Marché, Com. Barumbu, Kinshasa, RDC",
    "instagram": "https://www.instagram.com/f.flejom/",
    "tiktok": "https://www.tiktok.com/@flejom243",
    "description": "La Fondation FLEJOM vient en aide aux personnes vulnérables : veuves, orphelins et familles en difficulté. Ensemble, construisons un avenir plus solidaire.",
}

NAV = [
    ("index.html", "Accueil"),
    ("a-propos.html", "À propos"),
    ("actions.html", "Nos actions"),
    ("galerie.html", "Galerie"),
    ("partenaires.html", "Partenaires"),
    ("contact.html", "Contact"),
]

VIDEOS = [
    ("dlZbV8fdt54", "Nos actions sur le terrain"),
    ("r85q1MfeS48", "Témoignages des bénéficiaires"),
    ("v4rZ73rrwjw", "Impact de FLEJOM dans la communauté"),
]

# ---------- Icônes (SVG en ligne) ----------
def icon(name):
    paths = {
        "heart": '<path d="M12 21s-7.5-4.6-9.5-9.2C1 8.3 3.2 5 6.6 5c2 0 3.4 1.1 4.4 2.5C12 6.1 13.4 5 15.4 5 18.8 5 21 8.3 19.5 11.8 17.5 16.4 12 21 12 21z"/>',
        "child": '<circle cx="12" cy="5" r="2.5"/><path d="M8 22v-6H6l2-7h8l2 7h-2v6M10 22v-4M14 22v-4"/>',
        "rise": '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
        "hands": '<path d="M7 11V6a2 2 0 0 1 4 0v4M11 10V4a2 2 0 0 1 4 0v6M15 10V6a2 2 0 0 1 4 0v8a7 7 0 0 1-7 7h-1a7 7 0 0 1-6-3.4L3 15a2 2 0 0 1 3.4-2L7 14"/>',
        "shield": '<path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
        "eye": '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
        "flag": '<path d="M5 22V4M5 4h11l-2 4 2 4H5"/>',
        "box": '<path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7M12 11v10"/>',
        "coins": '<ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v5c0 1.7 2.7 3 6 3s6-1.3 6-3V7"/><path d="M9 15v2c0 1.7 2.7 3 6 3s6-1.3 6-3v-5c0-1.7-2.7-3-6-3"/>',
        "chat": '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
        "home": '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
        "food": '<path d="M4 3v8a3 3 0 0 0 6 0V3M7 3v18M17 3c-2 0-3 2-3 5v5h3v8"/>',
        "book": '<path d="M4 4h6a3 3 0 0 1 3 3v14a2 2 0 0 0-2-2H4zM20 4h-6a3 3 0 0 0-3 3v14a2 2 0 0 1 2-2h7z"/>',
        "phone": '<path d="M5 3h4l2 5-3 2a12 12 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A18 18 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
        "mail": '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
        "pin": '<path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
        "left": '<path d="M15 5l-7 7 7 7"/>',
        "right": '<path d="M9 5l7 7-7 7"/>',
        "close": '<path d="M6 6l12 12M18 6L6 18"/>',
        "expand": '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
        "menu": '<path d="M4 7h16M4 12h16M4 17h16"/>',
        "star": '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
        "handshake": '<path d="M2 12l4-4 4 2 4-3 4 3 4 2"/><path d="M6 8l-4 4 6 6 2-2M18 10l4 2-6 6-2-2M10 16l2 2M12 14l2 2"/>',
    }
    return ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
            'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths[name] + "</svg>")


SOCIAL_SVG = {
    "instagram": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>',
    "tiktok": '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.5 3c.4 2.3 1.9 3.8 4 4v3.2a7.6 7.6 0 0 1-4-1.2v6.6A5.6 5.6 0 1 1 11 10v3.3a2.4 2.4 0 1 0 2.3 2.4V3z"/></svg>',
}

e = html.escape


def socials():
    return ('<div class="socials">'
            f'<a href="{SITE["instagram"]}" target="_blank" rel="noopener" aria-label="Instagram">{SOCIAL_SVG["instagram"]}</a>'
            f'<a href="{SITE["tiktok"]}" target="_blank" rel="noopener" aria-label="TikTok">{SOCIAL_SVG["tiktok"]}</a>'
            "</div>")


def layout(page, title, description, body, extra_scripts=""):
    nav = "".join(
        f'<a href="{href}"{" aria-current=\"page\"" if href == page else ""}>{label}</a>'
        for href, label in NAV
    )
    full_title = f"{title} | {SITE['nom']}" if page != "index.html" else f"{SITE['nom']} – Soutien aux veuves, orphelins et personnes vulnérables"
    return f"""<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(full_title)}</title>
<meta name="description" content="{e(description)}">
<meta name="theme-color" content="#16325c">
<meta property="og:type" content="website">
<meta property="og:title" content="{e(full_title)}">
<meta property="og:description" content="{e(description)}">
<meta property="og:image" content="assets/img/logo.jpg">
<link rel="icon" href="assets/img/logo.webp" type="image/webp">
<link rel="apple-touch-icon" href="assets/img/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700&family=Source+Sans+3:wght@400;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
<a class="sr-only" href="#contenu">Aller au contenu</a>
<header class="site-header">
  <div class="wrap">
    <a class="brand" href="index.html"><img src="assets/img/logo.webp" alt="" width="46" height="46">Fondation FLEJOM</a>
    <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="nav" aria-label="Menu">{icon("menu")}</button>
    <nav class="nav" id="nav" aria-label="Navigation principale">{nav}<a class="btn btn-orange" href="don.html"{" aria-current=\"page\"" if page == "don.html" else ""}>Faire un don</a></nav>
  </div>
</header>
<main id="contenu">
{body}
</main>
<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div>
        <div class="footer-brand"><img src="assets/img/logo.webp" alt="" width="52" height="52"><h3 style="margin:0">Fondation FLEJOM</h3></div>
        <p>Ensemble, construisons un avenir plus solidaire et agissons pour les plus vulnérables.</p>
        {socials()}
      </div>
      <div>
        <h4>Navigation</h4>
        <ul>
          <li><a href="a-propos.html">À propos</a></li>
          <li><a href="actions.html">Nos actions</a></li>
          <li><a href="galerie.html">Galerie photos</a></li>
          <li><a href="partenaires.html">Partenaires</a></li>
        </ul>
      </div>
      <div>
        <h4>S’impliquer</h4>
        <ul>
          <li><a href="don.html">Faire un don</a></li>
          <li><a href="contact.html?sujet=benevolat">Devenir bénévole</a></li>
          <li><a href="contact.html?sujet=partenariat">Partenariats</a></li>
          <li><a href="contact.html">Nous contacter</a></li>
        </ul>
      </div>
      <div>
        <h4>Contact</h4>
        <ul>
          <li><a href="mailto:{SITE["email"]}">{SITE["email"]}</a></li>
          <li><a href="tel:{SITE["tel_lien"]}">{SITE["tel"]}</a></li>
          <li>{e(SITE["adresse"])}</li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© <span id="year">2026</span> Fondation FLEJOM. Tous droits réservés.</span>
      <span>FLEJOM – Agir pour les plus vulnérables.</span>
    </div>
  </div>
</footer>
<div class="lightbox" role="dialog" aria-modal="true" aria-label="Visionneuse de photos">
  <span class="lb-count"></span>
  <button class="ss-btn lb-close" type="button" aria-label="Fermer">{icon("close")}</button>
  <button class="ss-btn ss-prev" type="button" aria-label="Photo précédente">{icon("left")}</button>
  <img alt="">
  <button class="ss-btn ss-next" type="button" aria-label="Photo suivante">{icon("right")}</button>
</div>
<script src="galerie/galerie-photos.js"></script>
<script src="assets/js/main.js"></script>
{extra_scripts}
</body>
</html>
"""


def page_hero(title, subtitle, img=None):
    cls = "page-hero has-img" if img else "page-hero"
    im = f'<img src="assets/img/{img}.webp" alt="">' if img else ""
    return f'<section class="{cls}">{im}<div class="wrap"><h1>{e(title)}</h1><p>{e(subtitle)}</p></div></section>'


def cta_band():
    return f"""<section class="cta">
  <div class="wrap reveal">
    <h2>Rejoignez notre mission</h2>
    <p>Ensemble, nous pouvons offrir un avenir meilleur aux veuves et orphelins. Chaque contribution compte.</p>
    <div class="actions-row"><a class="btn btn-blue" href="don.html">Faire un don</a><a class="btn btn-ghost" href="contact.html">Nous contacter</a></div>
  </div>
</section>"""


def gallery_teaser():
    return f"""<section class="section-alt" id="galerie">
  <div class="wrap section-head reveal">
    <span class="eyebrow">Galerie photos</span>
    <h2>Notre action en images</h2>
    <p>Découvrez le quotidien de notre fondation et l’impact de nos programmes sur les communautés.</p>
  </div>
  <div class="marquee" aria-label="Photos de la fondation (défilement)"><div class="marquee-track"></div></div>
  <div class="marquee" aria-label="Photos de la fondation (défilement)"><div class="marquee-track"></div></div>
  <div class="wrap" style="text-align:center;margin-top:36px"><a class="btn btn-blue" href="galerie.html">Voir toute la galerie</a></div>
</section>"""


# ---------- Pages ----------
def accueil():
    slides = [
        ("enfants", "FLEJOM – Fondation Léon Joséphine Mukwanga", "Ensemble, construisons un avenir plus solidaire"),
        ("maraichage", "Les Mamans Maraîchères", "Autonomisation des mères vulnérables par le maraîchage"),
        ("veuves", "Construire un avenir solidaire", "Autonomisation des veuves par l’entraide et l’accompagnement"),
        ("education", "Ensemble pour l’éducation", "Unissons-nous pour offrir un avenir meilleur aux enfants"),
        ("solidarite", "Unis dans la solidarité", "Chaque geste compte pour soutenir les plus fragiles"),
        ("orphelinat", "Orphelinat Cité de Victoire", "Accompagnement et soutien aux enfants orphelins"),
        ("famille", "Une grande famille solidaire", "Ensemble pour protéger et éduquer nos enfants"),
    ]
    imgs = "".join(
        f'<div class="hero-slide"><img src="assets/img/{img}.webp" alt="" {"fetchpriority=\"high\"" if i == 0 else "loading=\"lazy\""}></div>'
        for i, (img, _, _) in enumerate(slides)
    )
    caps = "".join(
        f'<div{" hidden" if i else ""}>{"<h1>" if i == 0 else "<h2>"}{e(t)}{"</h1>" if i == 0 else "</h2>"}<p>{e(s)}</p></div>'
        for i, (_, t, s) in enumerate(slides)
    )
    testis = [
        ("Grâce à FLEJOM, notre centre a pu nourrir 50 enfants pendant un mois. Les dons ont permis d’acheter de la nourriture et des fournitures essentielles. Nous sommes profondément reconnaissants.", "Responsable d’un orphelinat"),
        ("Après la perte de mon mari, je ne savais pas comment nourrir mes enfants. La Fondation FLEJOM m’a aidée à démarrer une petite activité commerciale. Aujourd’hui, je peux subvenir aux besoins de ma famille.", "Veuve et bénéficiaire"),
        ("J’ai reçu une formation en couture grâce à FLEJOM. Maintenant, j’ai mon propre atelier et je forme d’autres jeunes filles. C’est un nouveau départ pour moi et ma famille.", "Bénéficiaire, formation professionnelle"),
        ("En tant que partenaire local, nous avons vu l’impact direct de FLEJOM sur nos communautés. Leur engagement est réel et leurs actions concrètes changent des vies.", "Partenaire communautaire"),
        ("Les enfants de notre centre reçoivent maintenant des repas réguliers et peuvent aller à l’école grâce au soutien de FLEJOM. Leur avenir s’annonce plus prometteur.", "Directrice de centre d’accueil"),
    ]
    testi_html = "".join(
        f'<figure class="testi"><blockquote>{e(t)}</blockquote><figcaption><div class="who">{e(r)}</div><div class="where">Kinshasa, RD Congo</div></figcaption></figure>'
        for t, r in testis
    )
    body = f"""
<section class="hero" aria-label="Présentation">
  {imgs}
  <div class="hero-content wrap">
    <div class="hero-text">
      <span class="kicker">Kinshasa · RD Congo</span>
      <div class="hero-caption">{caps}</div>
      <div class="actions-row">
        <a class="btn btn-orange" href="don.html">Faire un don</a>
        <a class="btn btn-ghost" href="a-propos.html">Découvrir notre mission</a>
        <a class="btn btn-ghost" href="contact.html">Nous contacter</a>
      </div>
    </div>
  </div>
  <div class="hero-dots"></div>
</section>

<section>
  <div class="wrap welcome reveal">
    <span class="eyebrow">Bienvenue</span>
    <h2>Bienvenue sur le site officiel de la Fondation FLEJOM</h2>
    <p>Nous sommes une organisation humanitaire engagée dans le soutien aux plus vulnérables : veuves, orphelins, personnes vulnérables. À travers des dons en nature et en espèces, nous renforçons les actions de structures existantes tout en préparant la création de notre propre espace d’accueil.</p>
    <p>Explorez nos projets, découvrez notre mission, et rejoignez-nous dans cette aventure humaine où chaque geste compte.</p>
  </div>
</section>

<section class="section-alt">
  <div class="wrap">
    <div class="section-head reveal">
      <span class="eyebrow">Notre mission</span>
      <h2>Transformer la vie des plus vulnérables</h2>
      <p>La Fondation FLEJOM s’engage à transformer la vie des plus vulnérables à travers des actions concrètes et durables.</p>
    </div>
    <div class="grid grid-3">
      <div class="card reveal"><div class="icon">{icon("heart")}</div><h3>Soutien aux veuves</h3><p>Accompagnement et aide matérielle pour les veuves en situation de vulnérabilité.</p></div>
      <div class="card reveal"><div class="icon o">{icon("child")}</div><h3>Protection des orphelins</h3><p>Éducation, santé et hébergement pour offrir un avenir meilleur aux enfants.</p></div>
      <div class="card reveal"><div class="icon">{icon("rise")}</div><h3>Autonomisation</h3><p>Formations professionnelles et micro-crédits pour favoriser l’indépendance.</p></div>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="section-head reveal">
      <span class="eyebrow">Notre impact</span>
      <h2>Chaque jour, nous changeons des vies</h2>
      <p>Chaque jour, nous changeons des vies grâce à votre générosité.</p>
    </div>
    <div class="split reveal" style="margin-bottom:64px">
      <div class="split-img"><img src="assets/img/veuves.webp" alt="Rencontre avec des veuves accompagnées par la fondation" loading="lazy"></div>
      <div>
        <h3 style="font-size:1.6rem">Soutien aux veuves</h3>
        <p class="lead">Nous accompagnons les veuves dans leur reconstruction, en leur offrant un soutien psychologique, matériel et financier pour retrouver dignité et autonomie.</p>
        <div class="impact-figs"><div><div class="stat-num">500+</div><div class="stat-label">Veuves aidées</div></div><div><div class="stat-num">250+</div><div class="stat-label">Formations données</div></div></div>
      </div>
    </div>
    <div class="split rev reveal">
      <div class="split-img"><img src="assets/img/enfants.webp" alt="Enfants soutenus par la fondation" loading="lazy"></div>
      <div>
        <h3 style="font-size:1.6rem">Protection des orphelins</h3>
        <p class="lead">Nous garantissons l’accès à l’éducation, aux soins de santé et à un environnement sécurisé pour tous les orphelins sous notre protection.</p>
        <div class="impact-figs"><div><div class="stat-num">800+</div><div class="stat-label">Enfants scolarisés</div></div><div><div class="stat-num">1000+</div><div class="stat-label">Repas servis par jour</div></div></div>
      </div>
    </div>
  </div>
</section>

{gallery_teaser()}

<section>
  <div class="wrap">
    <div class="section-head reveal">
      <span class="eyebrow">Témoignages</span>
      <h2>Ils racontent</h2>
      <p>Découvrez les histoires inspirantes de ceux dont la vie a été transformée grâce à votre soutien.</p>
    </div>
    <div class="testis reveal" aria-live="polite">
      {testi_html}
      <div class="testi-nav">
        <button class="round-btn" type="button" data-prev aria-label="Témoignage précédent">{icon("left")}</button>
        <button class="round-btn" type="button" data-next aria-label="Témoignage suivant">{icon("right")}</button>
      </div>
    </div>
  </div>
</section>

<section class="founder">
  <div class="wrap founder-box reveal">
    <span class="eyebrow">Mot du fondateur</span>
    <p class="founder-quote">« La souffrance des autres ne doit jamais nous laisser indifférents. »</p>
    <p>La Fondation FLEJOM est née d’un appel intérieur : celui de répondre aux cris silencieux des oubliés. En visitant des orphelinats, en écoutant les récits de veuves abandonnées, j’ai compris que l’action ne pouvait plus attendre.</p>
    <p>Notre mission est simple mais profonde : tendre la main là où l’espoir vacille. Nous ne prétendons pas tout résoudre, mais nous croyons que chaque acte de solidarité est une victoire sur l’indifférence.</p>
    <p>Je vous invite à marcher avec nous. À donner, à partager, à croire. Ensemble, nous pouvons bâtir un avenir plus juste.</p>
    <p class="founder-sign">— KM, fondateur de la Fondation FLEJOM</p>
  </div>
</section>

<section class="stats">
  <div class="wrap grid grid-3">
    <div><div class="stat-num">2000+</div><div class="stat-label">Personnes aidées</div></div>
    <div><div class="stat-num">15+</div><div class="stat-label">Années d’expérience</div></div>
    <div><div class="stat-num">50+</div><div class="stat-label">Bénévoles actifs</div></div>
  </div>
</section>

{cta_band()}
"""
    return layout("index.html", "Accueil", SITE["description"], body)


def a_propos():
    body = f"""
{page_hero("À propos de FLEJOM", "Une fondation dédiée à l’amélioration de la vie des veuves et orphelins depuis plus de 15 ans.", "famille")}
<section>
  <div class="wrap split reveal">
    <div>
      <span class="eyebrow">Notre histoire</span>
      <h2>Agir avec compassion, rigueur et engagement</h2>
      <p class="lead">La Fondation FLEJOM est née d’un profond désir de venir en aide aux plus vulnérables de notre société — en particulier les veuves, les orphelins et les personnes en situation de précarité. Face aux réalités du terrain, nous avons choisi d’agir avec compassion, rigueur et engagement.</p>
    </div>
    <div class="split-img"><img src="assets/img/orphelinat.webp" alt="Visite d’un orphelinat soutenu par la fondation" loading="lazy"></div>
  </div>
</section>
<section class="section-alt">
  <div class="wrap grid grid-2">
    <div class="card reveal"><div class="icon">{icon("flag")}</div><h3>Notre mission</h3><p>Nous soutenons des structures existantes (orphelinats, centres d’accueil, foyers) en leur apportant des dons en nature et en espèces. Ces appuis permettent de renforcer leurs actions et d’améliorer les conditions de vie des bénéficiaires.</p></div>
    <div class="card reveal"><div class="icon o">{icon("eye")}</div><h3>Notre vision</h3><p>Nous aspirons à créer, dans un avenir proche, notre propre espace d’accueil et d’accompagnement. Un lieu de dignité, de sécurité et d’espoir, où chaque personne accueillie pourra retrouver un chemin vers l’autonomie et la sérénité.</p></div>
  </div>
</section>
<section>
  <div class="wrap">
    <div class="section-head reveal"><span class="eyebrow">Nos valeurs</span><h2>Les principes qui guident notre action au quotidien</h2></div>
    <div class="grid grid-4">
      <div class="card reveal"><div class="icon">{icon("hands")}</div><h3>Solidarité</h3><p>Chaque geste compte. Ensemble, nous pouvons alléger les souffrances.</p></div>
      <div class="card reveal"><div class="icon o">{icon("heart")}</div><h3>Respect de la dignité humaine</h3><p>Chaque bénéficiaire est accueilli avec bienveillance et considération.</p></div>
      <div class="card reveal"><div class="icon">{icon("shield")}</div><h3>Transparence</h3><p>Nous veillons à une gestion rigoureuse et responsable des ressources confiées.</p></div>
      <div class="card reveal"><div class="icon o">{icon("star")}</div><h3>Engagement</h3><p>Notre action est constante, portée par la foi en un avenir meilleur pour tous.</p></div>
    </div>
  </div>
</section>
<section class="stats">
  <div class="wrap">
    <h2 style="color:#fff;text-align:center;margin-bottom:36px">Notre impact</h2>
    <div class="grid grid-4" style="text-align:center">
      <div><div class="stat-num">2000+</div><div class="stat-label">Personnes aidées</div></div>
      <div><div class="stat-num">500+</div><div class="stat-label">Veuves accompagnées</div></div>
      <div><div class="stat-num">800+</div><div class="stat-label">Enfants scolarisés</div></div>
      <div><div class="stat-num">15+</div><div class="stat-label">Années d’expérience</div></div>
    </div>
  </div>
</section>
{cta_band()}
"""
    return layout("a-propos.html", "À propos", "Histoire, mission, vision et valeurs de la Fondation FLEJOM.", body)


def actions():
    body = f"""
{page_hero("Nos actions", "Soutenir les structures existantes pour transformer des vies", "solidarite")}
<section>
  <div class="wrap split reveal">
    <div>
      <span class="eyebrow">Notre approche</span>
      <h2>Soutenir les structures existantes</h2>
      <p class="lead">Depuis sa création, la Fondation FLEJOM concentre ses efforts sur le soutien direct aux structures déjà engagées auprès des veuves, orphelins et personnes vulnérables. Nous collaborons avec des orphelinats, des centres d’accueil et des foyers communautaires pour renforcer leur impact sur le terrain.</p>
    </div>
    <div class="split-img"><img src="assets/img/education.webp" alt="Distribution de matériel par la fondation" loading="lazy"></div>
  </div>
</section>
<section class="section-alt">
  <div class="wrap grid grid-3">
    <div class="card reveal"><div class="icon">{icon("box")}</div><h3>Dons en nature</h3><p>Vivres, vêtements, matériel scolaire, produits d’hygiène pour répondre aux besoins essentiels.</p></div>
    <div class="card reveal"><div class="icon o">{icon("coins")}</div><h3>Dons en espèces</h3><p>Appuis financiers ponctuels pour les besoins urgents des structures partenaires.</p></div>
    <div class="card reveal"><div class="icon">{icon("chat")}</div><h3>Accompagnement</h3><p>Visites régulières, écoute attentive et conseils pour un soutien moral et logistique.</p></div>
  </div>
</section>
<section>
  <div class="wrap grid grid-2" style="gap:48px">
    <div class="reveal">
      <h2>Cibles prioritaires</h2>
      <ul class="checks">
        <li>Veuves en situation de vulnérabilité</li>
        <li>Orphelins nécessitant un soutien</li>
        <li>Personnes en situation de précarité</li>
        <li>Structures d’accueil existantes</li>
      </ul>
    </div>
    <div class="reveal">
      <h2>Nos interventions</h2>
      <p class="lead">Chaque action est pensée pour répondre à un besoin concret. Nous intervenons dans les quartiers les plus touchés, en partenariat avec des acteurs locaux de confiance. Nos distributions sont organisées avec rigueur et transparence, dans le respect de la dignité des bénéficiaires.</p>
    </div>
  </div>
</section>
<section class="founder">
  <div class="wrap split reveal">
    <div>
      <span class="eyebrow">Objectif 2026</span>
      <h2>Notre propre espace</h2>
      <p class="lead">Notre vision est claire : disposer d’un espace dédié à l’accueil, à l’écoute et à l’accompagnement des personnes en détresse. Ce lieu permettra d’organiser des activités éducatives et sociales, d’offrir un hébergement temporaire aux plus fragiles, et de centraliser nos opérations pour plus d’efficacité.</p>
      <a class="btn btn-orange" href="don.html">Soutenir ce projet</a>
    </div>
    <div class="split-img"><img src="assets/img/maraichage.webp" alt="Les Mamans Maraîchères" loading="lazy"></div>
  </div>
</section>
{gallery_teaser()}
{cta_band()}
"""
    return layout("actions.html", "Nos actions", "Dons en nature, dons en espèces et accompagnement : les actions de la Fondation FLEJOM à Kinshasa.", body)


def galerie():
    videos = "".join(
        f'<div class="reveal"><div class="video"><iframe src="https://www.youtube-nocookie.com/embed/{vid}" title="{e(t)}" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div><div class="video-title">{e(t)}</div></div>'
        for vid, t in VIDEOS
    )
    body = f"""
{page_hero("Galerie photos", "Découvrez le quotidien de notre fondation et l’impact de nos programmes sur les communautés.")}
<section>
  <div class="wrap">
    <div class="slideshow" tabindex="0" aria-roledescription="carrousel" aria-label="Diaporama des photos de la fondation">
      <div class="ss-stage"></div>
      <button class="ss-btn ss-prev" type="button" aria-label="Photo précédente">{icon("left")}</button>
      <button class="ss-btn ss-next" type="button" aria-label="Photo suivante">{icon("right")}</button>
      <div class="ss-bar">
        <button type="button" data-play></button>
        <button type="button" data-full>{icon("expand")}Plein écran</button>
        <span class="ss-count" aria-live="polite"></span>
      </div>
      <div class="ss-progress"></div>
    </div>
    <div class="thumbs" aria-label="Miniatures"></div>
  </div>
</section>
<section class="section-alt">
  <div class="wrap">
    <div class="section-head reveal"><span class="eyebrow">Toutes les photos</span><h2>FLEJOM sur le terrain</h2><p>Cliquez sur une photo pour l’agrandir.</p></div>
    <div class="photo-grid"></div>
  </div>
</section>
<section>
  <div class="wrap">
    <div class="section-head reveal"><span class="eyebrow">Vidéos</span><h2>Nos actions en vidéo</h2></div>
    <div class="grid grid-3">{videos}</div>
  </div>
</section>
{cta_band()}
"""
    return layout("galerie.html", "Galerie photos", "Les photos et vidéos des actions de la Fondation FLEJOM auprès des veuves et des orphelins à Kinshasa.", body)


def partenaires():
    body = f"""
{page_hero("Nos partenaires", "Ensemble, nous allons plus loin", "orphelinat")}
<section>
  <div class="wrap welcome reveal">
    <p>La Fondation FLEJOM agit en collaboration avec des structures locales, des donateurs engagés et des institutions sensibles à notre mission. Ces partenariats sont le socle de notre impact.</p>
  </div>
</section>
<section class="section-alt">
  <div class="wrap">
    <div class="section-head reveal"><span class="eyebrow">Partenariat</span><h2>Pourquoi devenir partenaire ?</h2></div>
    <div class="grid grid-3">
      <div class="card reveal"><div class="icon">{icon("rise")}</div><h3>Renforcer l’impact social</h3><p>Amplifiez vos actions en rejoignant un réseau de solidarité éprouvé.</p></div>
      <div class="card reveal"><div class="icon o">{icon("shield")}</div><h3>Projets concrets et transparents</h3><p>Participez à des initiatives mesurables avec une gestion rigoureuse.</p></div>
      <div class="card reveal"><div class="icon">{icon("handshake")}</div><h3>Valoriser votre engagement</h3><p>Faites reconnaître votre contribution auprès des communautés locales.</p></div>
    </div>
  </div>
</section>
<section class="cta">
  <div class="wrap reveal">
    <h2>Vous souhaitez collaborer avec nous ?</h2>
    <p>FLEJOM – Agir pour les plus vulnérables.</p>
    <div class="actions-row"><a class="btn btn-blue" href="contact.html?sujet=partenariat">Nous contacter</a></div>
  </div>
</section>
"""
    return layout("partenaires.html", "Partenaires", "Devenir partenaire de la Fondation FLEJOM : structures locales, donateurs et institutions.", body)


def don():
    body = f"""
{page_hero("Faire un don", "Chaque don, qu’il soit petit ou grand, contribue à transformer des vies", "enfants")}
<section>
  <div class="wrap split reveal">
    <div>
      <span class="eyebrow">Pourquoi donner ?</span>
      <h2>Une chaîne de solidarité</h2>
      <p class="lead">En soutenant la Fondation FLEJOM, vous participez à une chaîne de solidarité qui apporte réconfort, dignité et espoir aux veuves, orphelins et personnes vulnérables.</p>
    </div>
    <div class="grid grid-2">
      <div class="card"><div class="icon">{icon("food")}</div><h3>Nourrir et vêtir</h3><p>Offrir des repas et des vêtements à ceux qui en ont besoin.</p></div>
      <div class="card"><div class="icon o">{icon("hands")}</div><h3>Soutenir les structures</h3><p>Renforcer les structures d’accueil existantes pour plus d’impact.</p></div>
      <div class="card"><div class="icon o">{icon("home")}</div><h3>Préparer notre espace</h3><p>Contribuer à la création de notre propre espace d’accueil (objectif 2026).</p></div>
      <div class="card"><div class="icon">{icon("book")}</div><h3>Activités éducatives</h3><p>Organiser des activités éducatives et sociales pour les bénéficiaires.</p></div>
    </div>
  </div>
</section>
<section class="section-alt">
  <div class="wrap">
    <div class="section-head reveal"><span class="eyebrow">Comment donner ?</span><h2>Des moyens simples</h2></div>
    <div class="grid grid-2" style="max-width:900px;margin-inline:auto">
      <div class="card pay featured reveal">
        <span class="badge">Moyen actuel</span>
        <h3>M-Pesa</h3>
        <p>Faites votre don via M-Pesa au numéro ci-dessous, au nom de notre coordonnateur.</p>
        <dl><div><dt>Numéro M-Pesa</dt><dd>{SITE["mpesa"]}</dd></div><div><dt>Titulaire du compte</dt><dd>{SITE["mpesa_titulaire"]}</dd></div></dl>
        <button class="btn btn-orange copy-btn" type="button" data-copy="{SITE["mpesa"].replace(" ", "")}">Copier le numéro</button>
      </div>
      <div class="card pay reveal">
        <span class="badge grey">Bientôt disponible</span>
        <h3>Virement bancaire</h3>
        <p>Notre compte bancaire arrive bientôt — les coordonnées seront communiquées ici prochainement. En attendant, vous pouvez nous soutenir dès maintenant via M-Pesa.</p>
      </div>
    </div>
    <div class="note reveal" style="max-width:900px;margin:32px auto 0">
      <h3>Transparence</h3>
      <p>Tous les dons sont traités avec transparence. La Fondation FLEJOM est une organisation à but non lucratif ; vos dons sont utilisés directement pour nos programmes d’aide.</p>
      <p style="margin:0">Pour toute question concernant les dons, contactez-nous à <a href="mailto:{SITE["email"]}">{SITE["email"]}</a>.</p>
    </div>
  </div>
</section>
"""
    return layout("don.html", "Faire un don", "Soutenez la Fondation FLEJOM par M-Pesa : chaque don aide les veuves, les orphelins et les personnes vulnérables.", body)


def contact():
    adresse_map = "Barumbu, Kinshasa, République démocratique du Congo"
    body = f"""
{page_hero("Contactez-nous", "Une question, une proposition, un besoin ? Nous sommes à votre écoute.")}
<section>
  <div class="wrap grid grid-2" style="gap:56px">
    <div class="reveal">
      <h2>Nos coordonnées</h2>
      <p class="lead">Que vous soyez une structure partenaire, un donateur potentiel ou simplement curieux de notre mission, n’hésitez pas à nous contacter.</p>
      <ul class="contact-list">
        <li><span class="icon">{icon("pin")}</span><span><strong>Adresse</strong>{e(SITE["adresse"])}</span></li>
        <li><span class="icon">{icon("phone")}</span><span><strong>Téléphone</strong><a href="tel:{SITE["tel_lien"]}">{SITE["tel"]}</a></span></li>
        <li><span class="icon">{icon("mail")}</span><span><strong>E-mail</strong><a href="mailto:{SITE["email"]}">{SITE["email"]}</a></span></li>
      </ul>
      <h3>Réseaux sociaux</h3>
      {socials()}
    </div>
    <div class="card reveal">
      <h2 style="font-size:1.6rem">Envoyez-nous un message</h2>
      <form id="contact-form">
        <div class="field"><label for="sujet">Sujet</label>
          <select id="sujet" name="sujet">
            <option value="Demande d’information">Demande d’information</option>
            <option value="Devenir bénévole">Devenir bénévole</option>
            <option value="Partenariat">Partenariat</option>
            <option value="Don">Don</option>
          </select></div>
        <div class="field"><label for="nom">Nom complet</label><input id="nom" name="nom" required minlength="2" maxlength="100" autocomplete="name" placeholder="Votre nom"></div>
        <div class="field"><label for="email">E-mail</label><input id="email" name="email" type="email" required maxlength="255" autocomplete="email" placeholder="votre@email.com"></div>
        <div class="field"><label for="tel">Téléphone (facultatif)</label><input id="tel" name="tel" type="tel" maxlength="20" autocomplete="tel" placeholder="+243 …"></div>
        <div class="field"><label for="message">Message</label><textarea id="message" name="message" required minlength="10" maxlength="2000" placeholder="Votre message…"></textarea></div>
        <button class="btn btn-orange" type="submit">Envoyer le message</button>
        <p class="form-hint">Le bouton ouvre votre messagerie avec le message déjà rempli.</p>
      </form>
    </div>
  </div>
</section>
<section class="section-alt" style="padding-top:0;background:none">
  <div class="wrap map reveal"><iframe title="Carte : Barumbu, Kinshasa" loading="lazy" src="https://www.google.com/maps?q={adresse_map.replace(" ", "+")}&output=embed"></iframe></div>
</section>
"""
    script = """<script>
(function(){var s=new URLSearchParams(location.search).get("sujet");var m={benevolat:"Devenir bénévole",partenariat:"Partenariat",don:"Don"};if(s&&m[s])document.getElementById("sujet").value=m[s];})();
</script>"""
    return layout("contact.html", "Contact", "Contacter la Fondation FLEJOM à Kinshasa : adresse, téléphone, e-mail et formulaire.", body, script)


def page_404():
    body = f"""{page_hero("Page introuvable", "La page demandée n’existe pas ou a été déplacée.")}
<section><div class="wrap" style="text-align:center"><a class="btn btn-blue" href="index.html">Retour à l’accueil</a></div></section>"""
    return layout("404.html", "Page introuvable", SITE["description"], body)


def main():
    photos = sorted(p.name for p in (ROOT / "galerie").iterdir()
                    if p.suffix.lower() in {".webp", ".jpg", ".jpeg", ".png"})
    (ROOT / "galerie" / "galerie-photos.js").write_text(
        "/* Généré par generer.py — liste des photos de la galerie */\nwindow.FLEJOM_PHOTOS = "
        + json.dumps(photos, indent=1) + ";\n", encoding="utf-8")
    pages = {
        "index.html": accueil, "a-propos.html": a_propos, "actions.html": actions,
        "galerie.html": galerie, "partenaires.html": partenaires, "don.html": don,
        "contact.html": contact, "404.html": page_404,
    }
    for name, fn in pages.items():
        (ROOT / name).write_text(fn(), encoding="utf-8")
    print(f"{len(pages)} pages générées, {len(photos)} photos dans la galerie.")


if __name__ == "__main__":
    main()
