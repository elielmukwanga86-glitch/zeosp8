'use client';
import { ActionForm } from '@/components/action-form';
import { createClientAction } from './actions';
import { ClientFields } from './client-fields';

export function NewClientForm() {
  return (
    <ActionForm action={createClientAction} submitLabel="Créer le client" className="grid gap-4 sm:grid-cols-2">
      {(e) => <ClientFields e={e} />}
    </ActionForm>
  );
}
