import type { Metadata } from "next";

export const metadata: Metadata = { title: "Connexion gérant" };

// Remplacée à l'étape 3 par le vrai formulaire de connexion.
export default function Connexion() {
  return (
    <main className="mx-auto w-full max-w-md px-5 py-12">
      <h1 className="text-2xl font-bold">Connexion gérant</h1>
      <p className="mt-2 text-sourd">Bientôt disponible (étape 3).</p>
    </main>
  );
}
