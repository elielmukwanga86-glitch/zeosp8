import type { AppRole } from '@/config/roles';
import type { PlanCode } from '@/config/plans';

/**
 * Types métier utilisés par l'application. Les types exhaustifs de la base se
 * génèrent avec `npm run db:types` (src/types/database.ts) une fois le projet lié.
 */
export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: PlanCode;
  subscription_status: string;
  trial_ends_at: string | null;
  is_demo: boolean;
  onboarding: Record<string, boolean>;
}

export interface MembershipWithOrg {
  id: string;
  role: AppRole;
  is_owner: boolean;
  organization: Organization;
}
