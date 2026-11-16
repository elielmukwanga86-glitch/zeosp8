import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Mentions légales" };

export default function MentionsLegales() {
  return (
    <LegalPage title="Mentions légales">
      <h2>Éditeur du service</h2>
      <p>[Raison sociale], [forme juridique], [capital], [RCS / SIREN], [adresse du siège], [e-mail de contact].</p>
      <p>Directeur de la publication : [nom].</p>
      <h2>Hébergement</h2>
      <p>Application : Vercel Inc. — [adresse à vérifier sur vercel.com].</p>
      <p>Base de données et fichiers : Supabase — [région du projet, adresse à vérifier sur supabase.com].</p>
    </LegalPage>
  );
}
