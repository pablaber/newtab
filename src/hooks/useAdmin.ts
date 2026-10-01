import { useCallback, useEffect, useState } from 'react';
import { getSyncBackend, type BetaInvite, type SyncBackend } from '../services/syncBackend.ts';
import type { AccountState } from './useConfig.ts';

export interface AdminActions {
  listInvites: () => Promise<BetaInvite[]>;
  inviteUser: (email: string) => Promise<BetaInvite>;
}

export interface UseAdminResult extends AdminActions {
  isSuperAdmin: boolean;
}

interface UseAdminOptions {
  backend?: SyncBackend | null;
}

export function useAdmin(account: AccountState, options?: UseAdminOptions): UseAdminResult {
  const hasBackendOverride = options !== undefined
    && Object.prototype.hasOwnProperty.call(options, 'backend');
  const backendOverride = options?.backend ?? null;
  const userId = account.status === 'signed-in' ? account.userId : null;
  const [adminUserId, setAdminUserId] = useState<string | null>(null);

  const resolveBackend = useCallback(async (): Promise<SyncBackend> => {
    const backend = hasBackendOverride ? backendOverride : await getSyncBackend();
    if (!backend) throw new Error('Account sync is not available.');
    return backend;
  }, [backendOverride, hasBackendOverride]);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    resolveBackend()
      .then((backend) => backend.isSuperAdmin())
      .then((isAdmin) => {
        if (!cancelled) setAdminUserId(isAdmin ? userId : null);
      })
      .catch(() => {
        if (!cancelled) setAdminUserId(null);
      });

    return () => {
      cancelled = true;
    };
  }, [resolveBackend, userId]);

  const listInvites = useCallback(
    async () => (await resolveBackend()).listInvites(),
    [resolveBackend],
  );

  const inviteUser = useCallback(
    async (email: string) => (await resolveBackend()).inviteUser(email),
    [resolveBackend],
  );

  return {
    isSuperAdmin: userId !== null && adminUserId === userId,
    listInvites,
    inviteUser,
  };
}
