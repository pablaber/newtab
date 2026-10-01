import { useEffect, useState } from 'react';
import type { AdminActions } from '../../../hooks/useAdmin.ts';
import type { BetaInvite } from '../../../services/syncBackend.ts';

interface AdminModalProps {
  admin: AdminActions;
  onClose: () => void;
}

function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

function formatInviteDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString();
}

export function AdminModal({ admin, onClose }: AdminModalProps) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');
  const [invites, setInvites] = useState<BetaInvite[] | null>(null);
  const [listError, setListError] = useState('');

  const { listInvites } = admin;

  useEffect(() => {
    let cancelled = false;
    listInvites()
      .then((result) => {
        if (!cancelled) setInvites(result);
      })
      .catch((error: unknown) => {
        if (!cancelled) setListError(messageFrom(error));
      });
    return () => {
      cancelled = true;
    };
  }, [listInvites]);

  const handleInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setFormError('Enter a valid email address.');
      setSuccess('');
      return;
    }

    setBusy(true);
    setFormError('');
    setSuccess('');
    try {
      const invite = await admin.inviteUser(normalizedEmail);
      setInvites((current) => [
        invite,
        ...(current ?? []).filter((existing) => existing.email !== invite.email),
      ]);
      setEmail('');
      setSuccess(`${invite.email} can now sign in.`);
    } catch (error) {
      setFormError(messageFrom(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="about-modal-overlay" onClick={onClose}>
      <div className="about-modal admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="about-modal-header">
          <h2 className="about-modal-title">Invite users</h2>
          <button className="config-editor-back" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <form className="admin-modal-form" onSubmit={(event) => void handleInvite(event)} noValidate>
          <input
            className="config-editor-input"
            type="email"
            aria-label="Email address"
            autoComplete="off"
            value={email}
            onChange={(event) => { setEmail(event.target.value); setFormError(''); }}
            placeholder="person@example.com"
            disabled={busy}
            autoFocus
          />
          <button
            type="submit"
            className="config-editor-btn config-editor-btn-save"
            disabled={busy}
          >
            {busy ? 'Inviting…' : 'Invite'}
          </button>
        </form>
        {formError && <div className="config-editor-ie-error">{formError}</div>}
        {success && <p className="admin-modal-success">{success}</p>}
        <h3 className="admin-modal-subtitle">Invited emails</h3>
        {listError ? (
          <div className="config-editor-ie-error">{listError}</div>
        ) : invites === null ? (
          <p className="admin-modal-empty">Loading…</p>
        ) : invites.length === 0 ? (
          <p className="admin-modal-empty">No invites yet.</p>
        ) : (
          <ul className="admin-modal-list">
            {invites.map((invite) => (
              <li key={invite.email} className="admin-modal-item">
                <span className="admin-modal-email">{invite.email}</span>
                <span className="admin-modal-date">{formatInviteDate(invite.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
