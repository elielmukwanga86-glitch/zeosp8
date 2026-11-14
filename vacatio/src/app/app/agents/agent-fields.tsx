import { Field } from '@/components/ui/field';
import { Checkbox, Select, Textarea } from '@/components/ui/form-controls';
import { CONTRACT_TYPES } from '@/lib/validation/operations';
import { LOCALE_NAMES, AGENT_LOCALES } from '@/i18n/agent';

export interface AgentValues {
  first_name?: string; last_name?: string; phone?: string | null; email?: string | null; language?: string; employee_number?: string | null;
  contract_type?: string; contract_start?: string | null; contract_end?: string | null; weekly_contract_hours?: number;
  seniority_date?: string | null; qualification?: string | null; hourly_rate_cents?: number | null; home_postal_code?: string | null;
  has_driving_licence?: boolean; transferred_from?: string | null; notes?: string | null;
}

export function AgentFields({ e, v = {} }: { e: Record<string, string | undefined>; v?: AgentValues }) {
  return (
    <>
      <Field label="Prénom" name="first_name" required defaultValue={v.first_name} error={e.first_name} />
      <Field label="Nom" name="last_name" required defaultValue={v.last_name} error={e.last_name} />
      <Field label="Mobile" name="phone" type="tel" defaultValue={v.phone ?? ''} error={e.phone} hint="Pour la connexion par SMS." />
      <Select label="Langue de l’application" name="language" defaultValue={v.language ?? 'fr'}>
        {AGENT_LOCALES.map((l) => <option key={l} value={l}>{LOCALE_NAMES[l]}</option>)}
      </Select>
      <Field label="E-mail (facultatif)" name="email" type="email" defaultValue={v.email ?? ''} error={e.email} />
      <Field label="Matricule" name="employee_number" defaultValue={v.employee_number ?? ''} />
      <Select label="Contrat" name="contract_type" defaultValue={v.contract_type ?? 'cdi'}>
        {Object.entries(CONTRACT_TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </Select>
      <Field label="Heures par semaine au contrat" name="weekly_contract_hours" inputMode="decimal" required defaultValue={v.weekly_contract_hours ?? ''} error={e.weekly_contract_hours} />
      <Field label="Début du contrat" name="contract_start" type="date" defaultValue={v.contract_start ?? ''} error={e.contract_start} />
      <Field label="Fin du contrat (CDD)" name="contract_end" type="date" defaultValue={v.contract_end ?? ''} error={e.contract_end} />
      <Field label="Date d’ancienneté" name="seniority_date" type="date" defaultValue={v.seniority_date ?? ''} hint="Reprise d’ancienneté incluse (article 7)." />
      <Field label="Qualification" name="qualification" defaultValue={v.qualification ?? ''} placeholder="AS1, AS2, AQS1…" />
      <Field label="Taux horaire brut (€)" name="hourly_rate" inputMode="decimal" defaultValue={v.hourly_rate_cents != null ? (v.hourly_rate_cents / 100).toFixed(2).replace('.', ',') : ''} error={e.hourly_rate} />
      <Field label="Code postal du domicile" name="home_postal_code" inputMode="numeric" defaultValue={v.home_postal_code ?? ''} error={e.home_postal_code} hint="Sert à proposer les remplaçants les plus proches." />
      <Field label="Repris d’une autre entreprise (article 7)" name="transferred_from" defaultValue={v.transferred_from ?? ''} />
      <div className="flex items-end pb-2"><Checkbox label="Permis de conduire" name="has_driving_licence" defaultChecked={v.has_driving_licence} /></div>
      <Textarea label="Notes" name="notes" defaultValue={v.notes ?? ''} className="sm:col-span-2" />
    </>
  );
}
