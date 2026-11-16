import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Conditions générales d'utilisation" };

export default function Cgu() {
  return (
    <LegalPage title="Conditions générales d’utilisation">
      <h2>Objet</h2>
      <p>[À compléter : description du service, accès, obligations de chaque partie.]</p>
      <h2>Règle de prise de vue</h2>
      <p>Les photos servent uniquement à montrer l&rsquo;état des lieux. Il est interdit de photographier des personnes.</p>
      <h2>Responsabilité, durée, résiliation</h2>
      <p>[À compléter.]</p>
    </LegalPage>
  );
}
