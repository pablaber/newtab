import { useEffect, useState } from 'react';
import type { AccountState, SyncStatus } from '../../../hooks/useConfig.ts';

const RESEND_SECONDS = 60;

export interface AccountTabProps {
  account: AccountState;
  syncStatus: SyncStatus;
  syncError: string | null;
  lastSyncedAt: string | null;
  onRequestEmailCode: (email: string) => Promise<void>;
  onVerifyEmailCode: (email: string, code: string) => Promise<void>;
  onSignOut: () => Promise<void>;
  onRetrySync: () => Promise<void>;
}

function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

function formatLastSynced(value: string | null): string {
  if (!value) return 'Not synced yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently synced';
  return date.toLocaleString();
}

export function AccountTab({
  account,
  syncStatus,
  syncError,
  lastSyncedAt,
  onRequestEmailCode,
  onVerifyEmailCode,
  onSignOut,
  onRetrySync,
}: AccountTabProps) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setResendSeconds((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  const sendCode = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setFormError('Enter a valid email address.');
      return;
    }

    setBusy(true);
    setFormError('');
    try {
      await onRequestEmailCode(normalizedEmail);
      setEmail(normalizedEmail);
      setCodeSent(true);
      setCode('');
      setResendSeconds(RESEND_SECONDS);
    } catch (error) {
      setFormError(messageFrom(error));
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setFormError('Enter the 6-digit code from your email.');
      return;
    }

    setBusy(true);
    setFormError('');
    try {
      await onVerifyEmailCode(email, code);
    } catch (error) {
      setFormError(messageFrom(error));
    } finally {
      setBusy(false);
    }
  };

  if (account.status === 'signed-in') {
    const statusLabel = {
      local: 'Local only',
      syncing: 'Syncing…',
      synced: 'Synced',
      error: 'Sync needs attention',
    }[syncStatus];

    const handleSignOut = async () => {
      setBusy(true);
      setFormError('');
      try {
        await onSignOut();
      } catch (error) {
        setFormError(messageFrom(error));
      } finally {
        setBusy(false);
      }
    };

    const handleRetry = async () => {
      setBusy(true);
      setFormError('');
      try {
        await onRetrySync();
      } catch (error) {
        setFormError(messageFrom(error));
      } finally {
        setBusy(false);
      }
    };

    return (
      <div className="config-editor-section account-section">
        <h2 className="config-editor-section-title">Synced account</h2>
        <div className="account-identity">
          <span className="account-email">{account.email}</span>
          <span className={`account-status account-status-${syncStatus}`}>{statusLabel}</span>
        </div>
        <p className="account-help">Last synced: {formatLastSynced(lastSyncedAt)}</p>
        {syncError && <div className="config-editor-ie-error">{syncError}</div>}
        {formError && <div className="config-editor-ie-error">{formError}</div>}
        <div className="account-actions">
          {syncStatus === 'error' && (
            <button
              type="button"
              className="config-editor-btn config-editor-btn-save"
              onClick={() => void handleRetry()}
              disabled={busy}
            >
              Retry sync
            </button>
          )}
          <button
            type="button"
            className="config-editor-btn config-editor-btn-cancel"
            onClick={() => void handleSignOut()}
            disabled={busy}
          >
            Sign out
          </button>
        </div>
        <p className="account-deletion">
          Need to permanently delete your account?{' '}
          <a href="mailto:support@thenewtab.app?subject=Delete%20my%20newtab%20account">
            Contact support
          </a>.
        </p>
      </div>
    );
  }

  return (
    <div className="config-editor-section account-section">
      <h2 className="config-editor-section-title">Sync your config</h2>
      <p className="account-intro">
        Sign in with an approved beta email to use the same links and appearance across browsers.
        Guest configs remain stored only in this browser.
      </p>

      {!codeSent ? (
        <form className="account-form" onSubmit={(event) => void sendCode(event)} noValidate>
          <label className="config-editor-field">
            <span className="config-editor-label">Email address</span>
            <input
              className="config-editor-input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => { setEmail(event.target.value); setFormError(''); }}
              placeholder="you@example.com"
              disabled={busy}
            />
          </label>
          {formError && <div className="config-editor-ie-error">{formError}</div>}
          <button
            type="submit"
            className="config-editor-btn config-editor-btn-save"
            disabled={busy}
          >
            {busy ? 'Sending…' : 'Send login code'}
          </button>
        </form>
      ) : (
        <form className="account-form" onSubmit={(event) => void verifyCode(event)} noValidate>
          <p className="account-help">We sent a login code to <strong>{email}</strong>.</p>
          <label className="config-editor-field">
            <span className="config-editor-label">6-digit code</span>
            <input
              className="config-editor-input account-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(event) => {
                setCode(event.target.value.replace(/\D/g, '').slice(0, 6));
                setFormError('');
              }}
              placeholder="123456"
              disabled={busy}
              autoFocus
            />
          </label>
          {formError && <div className="config-editor-ie-error">{formError}</div>}
          <div className="account-actions">
            <button
              type="submit"
              className="config-editor-btn config-editor-btn-save"
              disabled={busy}
            >
              {busy ? 'Verifying…' : 'Verify code'}
            </button>
            <button
              type="button"
              className="config-editor-btn config-editor-btn-cancel"
              disabled={busy || resendSeconds > 0}
              onClick={() => void sendCode()}
            >
              {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : 'Resend code'}
            </button>
            <button
              type="button"
              className="account-text-button"
              disabled={busy}
              onClick={() => { setCodeSent(false); setCode(''); setFormError(''); }}
            >
              Use another email
            </button>
          </div>
        </form>
      )}

      <p className="account-beta-help">
        Sync is currently invite-only. To request access, email{' '}
        <a href="mailto:support@thenewtab.app?subject=newtab%20sync%20beta">support@thenewtab.app</a>.
      </p>
    </div>
  );
}
