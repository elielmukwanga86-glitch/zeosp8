import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Politique de confidentialité" };

export default function Confidentialite() {
  return (
    <LegalPage title="Politique de confidentialité">
      <h2>Qui est responsable des données ?</h2>
      <p>
        Chaque société de nettoyage qui utilise PassageVu est responsable des données de ses agents et de
        ses clients. [Éditeur] agit en tant que sous-traitant. [À compléter.]
      </p>
      <h2>Quelles données ?</h2>
      <ul className="list-disc pl-5">
        <li>Agents : nom affiché, code PIN (stocké sous forme chiffrée), date et heure des passages, tâches cochées, photos du lieu, commentaire, et — si le gérant l&rsquo;a activé — l&rsquo;indication « sur place : oui / non » (les coordonnées GPS ne sont pas conservées).</li>
        <li>Gérants : nom, adresse e-mail, mot de passe (géré par Supabase Auth).</li>
        <li>Contacts clients : nom et adresse e-mail, pour l&rsquo;envoi des récapitulatifs.</li>
        <li>Signalements : message et photo facultative. Aucun compte n&rsquo;est demandé.</li>
      </ul>
      <h2>Pourquoi ?</h2>
      <p>Prouver la réalisation des prestations de nettoyage et informer le client. [Base légale à préciser.]</p>
      <h2>Combien de temps ?</h2>
      <p>12 mois par défaut (réglable par la société), puis suppression automatique.</p>
      <h2>Vos droits</h2>
      <p>Accès, rectification, effacement, opposition : [contact]. Réclamation possible auprès de la CNIL (cnil.fr).</p>
    </LegalPage>
  );
}
