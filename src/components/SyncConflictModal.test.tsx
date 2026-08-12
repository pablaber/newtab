import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SyncConflictModal } from './SyncConflictModal.tsx';
import { mockConfig } from '../test/fixtures.ts';

describe('SyncConflictModal', () => {
  it('summarizes both configs and returns the selected source', async () => {
    const user = userEvent.setup();
    const onResolve = vi.fn();
    render(
      <SyncConflictModal
        conflict={{
          browserConfig: { ...mockConfig, modules: [] },
          syncedConfig: mockConfig,
          syncedUpdatedAt: '2026-08-12T12:00:00.000Z',
        }}
        onResolve={onResolve}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'Choose your starting config' })).toBeInTheDocument();
    expect(screen.getByText('0 sections · 0 links')).toBeInTheDocument();
    expect(screen.getByText('2 sections · 5 links')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Use this browser' }));
    expect(onResolve).toHaveBeenCalledWith('browser');
  });
});
