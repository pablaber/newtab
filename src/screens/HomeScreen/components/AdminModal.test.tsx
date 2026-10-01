import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminModal } from './AdminModal.tsx';
import { mockInvites } from '../../../test/fixtures.ts';

function createAdmin(overrides: Partial<Parameters<typeof AdminModal>[0]['admin']> = {}) {
  return {
    listInvites: vi.fn().mockResolvedValue(mockInvites),
    inviteUser: vi.fn().mockImplementation(async (email: string) => ({
      email,
      createdAt: '2026-10-01T12:00:00.000Z',
    })),
    ...overrides,
  };
}

describe('AdminModal', () => {
  it('lists existing invites', async () => {
    render(<AdminModal admin={createAdmin()} onClose={vi.fn()} />);

    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(await screen.findByText('newest@example.com')).toBeInTheDocument();
    expect(screen.getByText('older@example.com')).toBeInTheDocument();
  });

  it('shows an empty state when there are no invites', async () => {
    const admin = createAdmin({ listInvites: vi.fn().mockResolvedValue([]) });
    render(<AdminModal admin={admin} onClose={vi.fn()} />);

    expect(await screen.findByText('No invites yet.')).toBeInTheDocument();
  });

  it('shows an error when invites cannot be loaded', async () => {
    const admin = createAdmin({
      listInvites: vi.fn().mockRejectedValue(new Error('Only super admins can view invites.')),
    });
    render(<AdminModal admin={admin} onClose={vi.fn()} />);

    expect(await screen.findByText('Only super admins can view invites.')).toBeInTheDocument();
  });

  it('rejects invalid emails without calling the backend', async () => {
    const user = userEvent.setup();
    const admin = createAdmin();
    render(<AdminModal admin={admin} onClose={vi.fn()} />);

    await user.type(screen.getByLabelText('Email address'), 'not-an-email');
    await user.click(screen.getByRole('button', { name: 'Invite' }));

    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
    expect(admin.inviteUser).not.toHaveBeenCalled();
  });

  it('invites a normalized email and prepends it to the list', async () => {
    const user = userEvent.setup();
    const admin = createAdmin();
    render(<AdminModal admin={admin} onClose={vi.fn()} />);
    await screen.findByText('newest@example.com');

    await user.type(screen.getByLabelText('Email address'), '  New.Person@Example.com ');
    await user.click(screen.getByRole('button', { name: 'Invite' }));

    expect(admin.inviteUser).toHaveBeenCalledWith('new.person@example.com');
    expect(await screen.findByText('new.person@example.com can now sign in.')).toBeInTheDocument();
    const emails = screen.getAllByRole('listitem').map((item) => item.firstChild?.textContent);
    expect(emails).toEqual(['new.person@example.com', 'newest@example.com', 'older@example.com']);
    expect(screen.getByLabelText('Email address')).toHaveValue('');
  });

  it('does not duplicate an email that was already invited', async () => {
    const user = userEvent.setup();
    render(<AdminModal admin={createAdmin()} onClose={vi.fn()} />);
    await screen.findByText('older@example.com');

    await user.type(screen.getByLabelText('Email address'), 'older@example.com');
    await user.click(screen.getByRole('button', { name: 'Invite' }));

    await screen.findByText('older@example.com can now sign in.');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('shows invite errors from the backend', async () => {
    const user = userEvent.setup();
    const admin = createAdmin({
      inviteUser: vi.fn().mockRejectedValue(new Error('Only super admins can invite users.')),
    });
    render(<AdminModal admin={admin} onClose={vi.fn()} />);

    await user.type(screen.getByLabelText('Email address'), 'person@example.com');
    await user.click(screen.getByRole('button', { name: 'Invite' }));

    expect(await screen.findByText('Only super admins can invite users.')).toBeInTheDocument();
  });

  it('closes from the close button and the overlay', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = render(<AdminModal admin={createAdmin()} onClose={onClose} />);
    await screen.findByText('newest@example.com');

    await user.click(screen.getByLabelText('Close'));
    await user.click(container.querySelector('.about-modal-overlay')!);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
