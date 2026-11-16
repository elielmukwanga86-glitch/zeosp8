import type { Metadata } from "next";
import { isSupabaseConfigured, publicEnv } from "@/lib/env";

export const metadata: Metadata = { title: "État de l'installation", robots: { index: false } };
export const dynamic = "force-dynamic";

type Check = { label: string; ok: boolean; detail: string };

async function checkDatabase(): Promise<Check> {
  if (!process.env.SUPABASE_SECRET_KEY || !isSupabaseConfigured()) {
    return { label: "Base de données", ok: false, detail: "Clés Supabase absentes" };
  }
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const { error } = await createAdminClient().from("companies").select("id", { head: true, count: "exact" });
    if (error) return { label: "Base de données", ok: false, detail: `Supabase répond, mais : ${error.message}` };
    return { label: "Base de données", ok: true, detail: "Tables accessibles" };
  } catch (e) {
    return { label: "Base de données", ok: false, detail: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}

export default async function Sante() {
  const checks: Check[] = [
    {
      label: "Adresse Supabase",
      ok: Boolean(publicEnv.supabaseUrl),
      detail: publicEnv.supabaseUrl ? "Renseignée" : "NEXT_PUBLIC_SUPABASE_URL manquante",
    },
    {
      label: "Clé publique Supabase",
      ok: Boolean(publicEnv.supabasePublishableKey),
      detail: publicEnv.supabasePublishableKey ? "Renseignée" : "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY manquante",
    },
    {
      label: "Clé secrète Supabase",
      ok: Boolean(process.env.SUPABASE_SECRET_KEY),
      detail: process.env.SUPABASE_SECRET_KEY ? "Renseignée (jamais affichée)" : "SUPABASE_SECRET_KEY manquante",
    },
    {
      label: "Secret de session agent",
      ok: (process.env.AGENT_SESSION_SECRET ?? "").length >= 32,
      detail: (process.env.AGENT_SESSION_SECRET ?? "").length >= 32 ? "Renseigné" : "AGENT_SESSION_SECRET manquant ou trop court (32 caractères minimum)",
    },
    await checkDatabase(),
  ];

  return (
    <main className="mx-auto w-full max-w-xl px-5 py-10">
      <h1 className="mb-6 text-2xl font-bold">État de l&rsquo;installation</h1>
      <ul className="flex flex-col gap-3">
        {checks.map((c) => (
          <li
            key={c.label}
            className={`rounded-xl border p-4 ${c.ok ? "border-marque bg-marque-clair" : "border-alerte bg-alerte-clair"}`}
          >
            <p className="font-semibold">
              <span aria-hidden="true">{c.ok ? "✓ " : "✗ "}</span>
              {c.label}
              <span className="sr-only">{c.ok ? " : OK" : " : à corriger"}</span>
            </p>
            <p className="text-sm text-sourd">{c.detail}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
