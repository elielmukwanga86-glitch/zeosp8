export type AppRole = 'gerant' | 'chef_equipe' | 'agent';

export const ROLE_LABELS: Record<AppRole, string> = {
  gerant: 'Gérant',
  chef_equipe: "Chef d'équipe",
  agent: 'Agent',
};

/** Espace d'arrivée après connexion selon le rôle. */
export function homeForRole(role: AppRole) {
  return role === 'agent' ? '/agent' : '/app';
}
