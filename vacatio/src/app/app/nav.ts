import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, CalendarDays, Users, Building2, Clock, UserX, ShieldCheck, ClipboardCheck, MessageSquareWarning,
  Receipt, TrendingUp, FileSpreadsheet, ArrowRightLeft, Package, Megaphone, Settings, UsersRound,
} from 'lucide-react';
import type { AppRole } from '@/config/roles';
import type { Feature } from '@/config/plans';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: AppRole[];
  feature?: Feature;
  /** Phase de livraison : tant qu'elle n'est pas livrée, l'entrée est affichée « bientôt ». */
  phase: number;
}

export const DELIVERED_PHASE = 1;

export const NAV: { title: string; items: NavItem[] }[] = [
  { title: 'Pilotage', items: [
    { href: '/app', label: 'Tableau de bord', icon: LayoutDashboard, roles: ['gerant', 'chef_equipe'], phase: 1 },
  ] },
  { title: 'Opérations', items: [
    { href: '/app/planning', label: 'Planning', icon: CalendarDays, roles: ['gerant', 'chef_equipe'], feature: 'planning', phase: 2 },
    { href: '/app/pointages', label: 'Pointages', icon: Clock, roles: ['gerant', 'chef_equipe'], feature: 'pointage', phase: 2 },
    { href: '/app/absences', label: 'Absences', icon: UserX, roles: ['gerant', 'chef_equipe'], feature: 'absences', phase: 2 },
    { href: '/app/agents', label: 'Agents', icon: Users, roles: ['gerant', 'chef_equipe'], feature: 'agents', phase: 2 },
    { href: '/app/clients', label: 'Clients et sites', icon: Building2, roles: ['gerant', 'chef_equipe'], feature: 'clients_sites', phase: 2 },
    { href: '/app/conformite', label: 'Conformité', icon: ShieldCheck, roles: ['gerant'], feature: 'conformite', phase: 2 },
  ] },
  { title: 'Qualité', items: [
    { href: '/app/controles', label: 'Contrôles qualité', icon: ClipboardCheck, roles: ['gerant', 'chef_equipe'], feature: 'qualite', phase: 3 },
    { href: '/app/reclamations', label: 'Réclamations', icon: MessageSquareWarning, roles: ['gerant', 'chef_equipe'], feature: 'reclamations', phase: 3 },
  ] },
  { title: 'Finance', items: [
    { href: '/app/factures', label: 'Devis et factures', icon: Receipt, roles: ['gerant'], feature: 'facturation', phase: 4 },
    { href: '/app/rentabilite', label: 'Rentabilité', icon: TrendingUp, roles: ['gerant'], feature: 'rentabilite', phase: 4 },
    { href: '/app/paie', label: 'Export paie', icon: FileSpreadsheet, roles: ['gerant'], feature: 'export_paie', phase: 4 },
  ] },
  { title: 'RH et logistique', items: [
    { href: '/app/article-7', label: 'Article 7', icon: ArrowRightLeft, roles: ['gerant'], feature: 'article7', phase: 4 },
    { href: '/app/stocks', label: 'Stocks', icon: Package, roles: ['gerant', 'chef_equipe'], feature: 'stocks', phase: 4 },
    { href: '/app/messages', label: 'Messagerie', icon: Megaphone, roles: ['gerant', 'chef_equipe'], feature: 'messagerie', phase: 4 },
  ] },
  { title: 'Compte', items: [
    { href: '/app/equipe', label: 'Équipe et accès', icon: UsersRound, roles: ['gerant', 'chef_equipe'], phase: 1 },
    { href: '/app/entreprise', label: 'Entreprise', icon: Settings, roles: ['gerant'], phase: 1 },
  ] },
];
