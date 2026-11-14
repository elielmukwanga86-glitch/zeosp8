'use client';
import { useActionState } from 'react';
import { ActionForm } from '@/components/action-form';
import { Field } from '@/components/ui/field';
import { Select, Textarea } from '@/components/ui/form-controls';
import { SubmitButton } from '@/components/ui/submit-button';
import { Alert } from '@/components/ui/alert';
import { DAYS, FREQUENCIES } from '@/lib/validation/operations';
import {
  addAccessCodeAction, addAreaAction, addContractAction, addScheduleAction, addSharedDeviceAction, addTaskAction, updateSiteAction,
} from '../actions';

export interface SiteValues {
  id: string; client_id: string; name: string; address_line1: string | null; postal_code: string | null; city: string | null;
  zone_id: string | null; instructions: string | null; geofence_radius_m: number; surface_m2: number | null;
}

export function SiteInfoForm({ site, zones, canChangeZone }: { site: SiteValues; zones: { id: string; name: string }[]; canChangeZone: boolean }) {
  return (
    <ActionForm action={updateSiteAction} submitLabel="Enregistrer" className="grid gap-4 sm:grid-cols-2">
      {(e) => (
        <>
          <input type="hidden" name="id" value={site.id} />
          <input type="hidden" name="client_id" value={site.client_id} />
          <Field label="Nom" name="name" required defaultValue={site.name} error={e.name} />
          <Select label="Zone" name="zone_id" defaultValue={site.zone_id ?? ''} disabled={!canChangeZone}>
            <option value="">Aucune</option>
            {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
          </Select>
          <Field label="Adresse" name="address_line1" defaultValue={site.address_line1 ?? ''} error={e.address_line1} />
          <div className="grid grid-cols-[8rem_1fr] gap-3">
            <Field label="Code postal" name="postal_code" defaultValue={site.postal_code ?? ''} error={e.postal_code} />
            <Field label="Ville" name="city" defaultValue={site.city ?? ''} error={e.city} />
          </div>
          <Field label="Rayon de pointage (m)" name="geofence_radius_m" inputMode="numeric" defaultValue={site.geofence_radius_m}
            hint="Distance au-delà de laquelle un pointage est signalé." error={e.geofence_radius_m} />
          <Field label="Surface (m²)" name="surface_m2" inputMode="decimal" defaultValue={site.surface_m2 ?? ''} error={e.surface_m2} />
          <Textarea label="Consignes pour les agents" name="instructions" defaultValue={site.instructions ?? ''} className="sm:col-span-2" rows={5} />
        </>
      )}
    </ActionForm>
  );
}

export function AccessCodeForm({ siteId }: { siteId: string }) {
  return (
    <ActionForm action={addAccessCodeAction} submitLabel="Ajouter" resetOnSuccess className="grid gap-3 sm:grid-cols-2">
      {(e) => (<><input type="hidden" name="site_id" value={siteId} />
        <Field label="Libellé" name="label" placeholder="Alarme, boîte à clés…" error={e.label} />
        <Field label="Code" name="secret" autoComplete="off" error={e.secret} /></>)}
    </ActionForm>
  );
}

export function AreaForm({ siteId }: { siteId: string }) {
  return (
    <ActionForm action={addAreaAction} submitLabel="Ajouter la zone" resetOnSuccess className="flex flex-wrap items-end gap-3">
      {(e) => (<><input type="hidden" name="site_id" value={siteId} /><Field label="Zone du site" name="name" placeholder="Bureaux, sanitaires…" error={e.name} /></>)}
    </ActionForm>
  );
}

export function TaskForm({ siteId, areas }: { siteId: string; areas: { id: string; name: string }[] }) {
  return (
    <ActionForm action={addTaskAction} submitLabel="Ajouter la tâche" resetOnSuccess className="grid gap-3 sm:grid-cols-3">
      {(e) => (<><input type="hidden" name="site_id" value={siteId} />
        <Select label="Zone" name="area_id" defaultValue=""><option value="">Tout le site</option>{areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select>
        <Field label="Tâche" name="label" placeholder="Vider les corbeilles" error={e.label} />
        <Select label="Fréquence" name="frequency" defaultValue="quotidienne">{FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}</Select></>)}
    </ActionForm>
  );
}

export function ContractForm({ siteId }: { siteId: string }) {
  return (
    <ActionForm action={addContractAction} submitLabel="Créer le contrat" resetOnSuccess className="grid gap-3 sm:grid-cols-3">
      {(e) => (<><input type="hidden" name="site_id" value={siteId} />
        <Field label="Référence" name="reference" />
        <Field label="Début" name="starts_on" type="date" required error={e.starts_on} />
        <Field label="Fin (facultatif)" name="ends_on" type="date" error={e.ends_on} />
        <Field label="Heures vendues / mois" name="hours_sold_per_month" inputMode="decimal" error={e.hours_sold_per_month} />
        <Select label="Tarification" name="pricing_mode" defaultValue="hourly"><option value="hourly">Au taux horaire</option><option value="flat_monthly">Forfait mensuel</option></Select>
        <Field label="Prix horaire HT (€)" name="hourly_price" inputMode="decimal" error={e.hourly_price} />
        <Field label="Forfait mensuel HT (€)" name="monthly_price" inputMode="decimal" error={e.monthly_price} />
        <Field label="TVA (%)" name="vat_rate" inputMode="decimal" defaultValue="20" error={e.vat_rate} /></>)}
    </ActionForm>
  );
}

export function ScheduleForm({ siteId, contractId, agents }: { siteId: string; contractId: string; agents: { id: string; name: string }[] }) {
  return (
    <ActionForm action={addScheduleAction} submitLabel="Ajouter le créneau" resetOnSuccess className="grid gap-3 sm:grid-cols-4">
      {(e) => (<><input type="hidden" name="site_id" value={siteId} /><input type="hidden" name="contract_id" value={contractId} />
        <fieldset className="grid gap-1.5 sm:col-span-4">
          <legend className="text-sm font-medium">Jours</legend>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d) => (
              <label key={d.v} className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/10">
                <input type="checkbox" name="days[]" value={d.v} className="accent-[--color-primary]" />{d.l}
              </label>
            ))}
          </div>
          {e.days && <p className="text-xs font-medium text-destructive">{e.days}</p>}
        </fieldset>
        <Field label="Début" name="start_time" type="time" required error={e.start_time} />
        <Field label="Fin" name="end_time" type="time" required error={e.end_time} hint="Si la fin est avant le début, la vacation finit le lendemain." />
        <Field label="Nombre d’agents" name="agents_needed" inputMode="numeric" defaultValue="1" error={e.agents_needed} />
        <Select label="Semaines" name="week_parity" defaultValue="all"><option value="all">Toutes</option><option value="even">Paires</option><option value="odd">Impaires</option></Select>
        <Select label="Agent habituel" name="default_agent_id" defaultValue="" className="sm:col-span-2">
          <option value="">À pourvoir</option>{agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Select></>)}
    </ActionForm>
  );
}

export function SharedDeviceForm({ siteId }: { siteId: string }) {
  const [state, action] = useActionState(addSharedDeviceAction, {});
  if (state.ok && state.message) {
    const url = `${typeof window === 'undefined' ? '' : window.location.origin}${state.message}`;
    return (
      <Alert variant="success" className="grid gap-2">
        <p>Ouvrez ce lien sur le téléphone laissé sur le site et ajoutez-le à l’écran d’accueil. Il ne sera plus affiché :</p>
        <code className="break-all rounded bg-white p-2 text-xs text-foreground">{url}</code>
      </Alert>
    );
  }
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="site_id" value={siteId} />
      <Field label="Nom de l’appareil" name="label" placeholder="Téléphone de l’accueil" error={state.fieldErrors?.label} />
      <SubmitButton variant="outline">Créer une borne de pointage</SubmitButton>
      {state.error && <Alert variant="error">{state.error}</Alert>}
    </form>
  );
}
