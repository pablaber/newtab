import { renderHook, waitFor } from '@testing-library/react';
import { useAdmin } from './useAdmin.ts';
import type { AccountState } from './useConfig.ts';
import type { SyncBackend } from '../services/syncBackend.ts';
import { mockInvites } from '../test/fixtures.ts';

const SIGNED_IN: AccountState = { status: 'signed-in', userId: 'user-1', email: 'admin@example.com' };

function createBackend(overrides: Partial<SyncBackend> = {}): SyncBackend {
  return {
    getCurrentUser: vi.fn().mockResolvedValue(null),
    onAuthStateChange: vi.fn().mockReturnValue(() => undefined),
    requestEmailCode: vi.fn().mockResolvedValue(undefined),
    verifyEmailCode: vi.fn(),
    signOut: vi.fn().mockResolvedValue(undefined),
    getConfig: vi.fn().mockResolvedValue(null),
    saveConfig: vi.fn(),
    isSuperAdmin: vi.fn().mockResolvedValue(true),
    listInvites: vi.fn().mockResolvedValue(mockInvites),
    inviteUser: vi.fn().mockResolvedValue(mockInvites[0]),
    ...overrides,
  };
}

describe('useAdmin', () => {
  it('is not an admin when signed out or disabled', () => {
    const backend = createBackend();
    const { result: signedOut } = renderHook(() => useAdmin({ status: 'signed-out' }, { backend }));
    const { result: disabled } = renderHook(() => useAdmin({ status: 'disabled' }, { backend }));

    expect(signedOut.current.isSuperAdmin).toBe(false);
    expect(disabled.current.isSuperAdmin).toBe(false);
    expect(backend.isSuperAdmin).not.toHaveBeenCalled();
  });

  it('is not an admin without a backend', async () => {
    const { result } = renderHook(() => useAdmin(SIGNED_IN, { backend: null }));
    await expect(result.current.listInvites()).rejects.toThrow('Account sync is not available.');
    expect(result.current.isSuperAdmin).toBe(false);
  });

  it('reports admin status from the backend', async () => {
    const { result } = renderHook(() => useAdmin(SIGNED_IN, { backend: createBackend() }));
    await waitFor(() => expect(result.current.isSuperAdmin).toBe(true));
  });

  it('is not an admin when the backend says no', async () => {
    const backend = createBackend({ isSuperAdmin: vi.fn().mockResolvedValue(false) });
    const { result } = renderHook(() => useAdmin(SIGNED_IN, { backend }));
    await waitFor(() => expect(backend.isSuperAdmin).toHaveBeenCalled());
    expect(result.current.isSuperAdmin).toBe(false);
  });

  it('is not an admin when the check fails', async () => {
    const backend = createBackend({ isSuperAdmin: vi.fn().mockRejectedValue(new Error('offline')) });
    const { result } = renderHook(() => useAdmin(SIGNED_IN, { backend }));
    await waitFor(() => expect(backend.isSuperAdmin).toHaveBeenCalled());
    expect(result.current.isSuperAdmin).toBe(false);
  });

  it('drops admin status after signing out', async () => {
    const backend = createBackend();
    const { result, rerender } = renderHook(
      ({ account }) => useAdmin(account, { backend }),
      { initialProps: { account: SIGNED_IN } },
    );
    await waitFor(() => expect(result.current.isSuperAdmin).toBe(true));

    rerender({ account: { status: 'signed-out' } });
    expect(result.current.isSuperAdmin).toBe(false);
  });

  it('delegates invite actions to the backend', async () => {
    const backend = createBackend();
    const { result } = renderHook(() => useAdmin(SIGNED_IN, { backend }));

    await expect(result.current.listInvites()).resolves.toEqual(mockInvites);
    await expect(result.current.inviteUser('newest@example.com')).resolves.toEqual(mockInvites[0]);
    expect(backend.inviteUser).toHaveBeenCalledWith('newest@example.com');
  });
});
