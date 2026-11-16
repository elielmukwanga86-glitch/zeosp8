import Link from "next/link";

export default function Accueil() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-8 px-5 py-12">
      <header className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-marque">PassageVu</p>
        <h1 className="text-3xl font-bold leading-tight text-balance">
          La preuve que le ménage est fait, sans appli à installer.
        </h1>
        <p className="text-lg text-sourd text-pretty">
          Un QR code sur chaque site. L&rsquo;agent le scanne, coche ses tâches, photographie le
          lieu et valide. Le client reçoit la preuve.
        </p>
      </header>

      <ol className="flex flex-col gap-3 text-base">
        <li className="rounded-xl border border-trait bg-carte p-4">
          <strong>1. Scanner</strong> le QR affiché sur le site.
        </li>
        <li className="rounded-xl border border-trait bg-carte p-4">
          <strong>2. Cocher</strong> les tâches et prendre une photo du lieu.
        </li>
        <li className="rounded-xl border border-trait bg-carte p-4">
          <strong>3. Valider</strong> : le client est informé.
        </li>
      </ol>

      <Link
        href="/connexion"
        className="flex min-h-14 items-center justify-center rounded-xl bg-marque px-6 text-lg font-semibold text-white active:bg-marque-fonce"
      >
        Espace gérant
      </Link>

      <footer className="mt-auto flex flex-wrap gap-x-4 gap-y-2 text-sm text-sourd">
        <Link href="/mentions-legales" className="underline">Mentions légales</Link>
        <Link href="/confidentialite" className="underline">Confidentialité</Link>
        <Link href="/cgu" className="underline">CGU</Link>
      </footer>
    </main>
  );
}
