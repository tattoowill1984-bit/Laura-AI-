/**
 * Layer 5: Governance Kernel Action Gate (`confirmation.ts`)
 * Clean, single gate: requiresConfirmation(action) -> boolean
 * Returns true ONLY for destructive side-effects or external state mutations.
 */

export function requiresConfirmation(action: string): boolean {
  if (!action || typeof action !== 'string') return false;
  const act = action.toUpperCase().trim();

  // Destructive actions requiring explicit human confirmation
  const confirmationActions = [
    'DELETE_DATABASE',
    'PURGE_ALL_MEMORIES',
    'HARD_SYSTEM_RESET',
    'MUTATE_PRODUCTION_CREDENTIALS',
    'EXTERNAL_PAYMENT_MUTATION',
    'MUTATE_PERMISSIONS',
  ];

  return confirmationActions.includes(act);
}
