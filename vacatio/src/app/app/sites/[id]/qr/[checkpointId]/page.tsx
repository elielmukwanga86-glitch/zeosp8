import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { ArrowRight, Camera, CircleCheck } from 'lucide-react';
import { requireRole } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import { publicEnv } from '@/lib/env';
import { PrintButton } from './print-button';

export const metadata: Metadata = { title: 'QR code de pointage', robots: { index: false } };

/** Affiche imprimable (A4) : QR code de pointage + consignes courtes en pictogrammes. */
export default async function QrPage({ params }: { params: Promise<{ id: string; checkpointId: string }> }) {
  const { id, checkpointId } = await params;
  const ctx = await requireRole('gerant', 'chef_equipe');
  const supabase = await createClient();
  const { data: cp } = await supabase.from('site_checkpoints').select('label, qr_token, site:sites(name)')
    .eq('id', checkpointId).eq('site_id', id).eq('org_id', ctx.org.id).maybeSingle();
  if (!cp) notFound();
  const url = `${publicEnv.NEXT_PUBLIC_APP_URL}/agent/pointer?qr=${cp.qr_token}`;
  // Image PNG en data URL (pas d'injection de HTML dans la page).
  const qr = await QRCode.toDataURL(url, { margin: 1, width: 576, errorCorrectionLevel: 'M', color: { dark: '#0f2f57', light: '#ffffff' } });
  const site = cp.site as unknown as { name: string };

  return (
    <div className="mx-auto grid max-w-xl justify-items-center gap-6 bg-white p-8 text-center print:p-0">
      <p className="text-sm font-semibold text-muted-foreground">{ctx.org.name}</p>
      <h1 className="text-3xl font-bold">{site.name}</h1>
      <p className="text-lg">{cp.label}</p>
      {/* eslint-disable-next-line @next/next/no-img-element -- data URL générée côté serveur */}
      <img src={qr} alt={`QR code de pointage — ${site.name}`} width={288} height={288} />
      <p className="flex items-center gap-3 text-primary" aria-hidden><Camera className="size-10" /><ArrowRight className="size-6" /><CircleCheck className="size-10 text-accent" /></p>
      <p className="text-lg">Scannez ce code avec l’appareil photo de votre téléphone à l’arrivée et au départ.</p>
      <p className="text-sm text-muted-foreground" lang="en">Scan at arrival and departure · Escaneie na chegada e na saída · Escanee al llegar y al salir</p>
      <p className="break-all text-xs text-muted-foreground">Étiquette NFC : programmer ce lien → {url}</p>
      <PrintButton />
    </div>
  );
}
