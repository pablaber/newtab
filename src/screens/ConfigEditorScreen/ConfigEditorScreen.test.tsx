import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfigEditor } from './ConfigEditorScreen.tsx';
import { mockConfig } from '../../test/fixtures.ts';
import type { AppConfig } from '../../types/config.ts';

describe('ConfigEditorScreen', () => {
  const defaultProps = {
    config: mockConfig,
    onSave: vi.fn(),
    onClose: vi.fn(),
    onPreview: vi.fn(),
  };

  it('renders with General tab active by default', () => {
    render(<ConfigEditor {...defaultProps} />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
    const generalTab = screen.getByRole('button', { name: 'General' });
    expect(generalTab).toHaveClass('active');
  });

  it('switches between General and Links tabs', async () => {
    const user = userEvent.setup();
    render(<ConfigEditor {...defaultProps} />);

    const linksTab = screen.getByRole('button', { name: 'Links' });
    await user.click(linksTab);
    expect(linksTab).toHaveClass('active');

    const generalTab = screen.getByRole('button', { name: 'General' });
    expect(generalTab).not.toHaveClass('active');
  });

  it('opens the Subcommands tab with a staged unsaved card', () => {
    render(<ConfigEditor {...defaultProps} initialTab="subcommands" stageNewSubcommand />);

    expect(screen.getByRole('button', { name: 'Subcommands' })).toHaveClass('active');
    expect(screen.getByLabelText('Subcommand 1 name')).toHaveValue('');
  });

  it('preserves a subcommand draft across settings tabs', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<ConfigEditor {...defaultProps} onSave={onSave} initialTab="subcommands" stageNewSubcommand />);

    await user.type(screen.getByLabelText('Subcommand 1 name'), 'Docs');
    await user.type(screen.getByLabelText('Subcommand 1 trigger'), 'docs');
    await user.click(screen.getByRole('button', { name: 'Add Item' }));
    await user.type(screen.getByLabelText('Docs item 1 label'), 'Guide');
    await user.type(screen.getByLabelText('Docs item 1 URL'), 'https://example.com');
    await user.click(screen.getByRole('button', { name: 'General' }));
    await user.click(screen.getByRole('button', { name: 'Subcommands' }));
    await user.click(screen.getAllByRole('button', { name: 'Save' })[0]);

    expect((onSave.mock.calls[0][0] as AppConfig).subcommands?.[0].trigger).toBe('docs');
  });

  it('shows export modal with base64 string', async () => {
    const user = userEvent.setup();
    render(<ConfigEditor {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Export' }));
    expect(screen.getByText('Export Config')).toBeInTheDocument();

    const modal = screen.getByText('Export Config').closest('.config-editor-modal')!;
    const textarea = within(modal as HTMLElement).getByRole('textbox');
    expect(atob((textarea as HTMLTextAreaElement).value)).toBe(JSON.stringify(mockConfig));
  });

  it('saves and closes on successful import', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onClose = vi.fn();
    render(<ConfigEditor {...defaultProps} onSave={onSave} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Import' }));

    const modal = screen.getByText('Import Config').closest('.config-editor-modal')!;
    const textarea = within(modal as HTMLElement).getByPlaceholderText('Paste exported base64 string here...');

    const validConfig = JSON.stringify(mockConfig);
    const encoded = btoa(validConfig);
    await user.type(textarea, encoded);

    const applyButton = within(modal as HTMLElement).getByRole('button', { name: 'Apply' });
    await user.click(applyButton);

    expect(onSave).toHaveBeenCalledWith(mockConfig);
    expect(onClose).toHaveBeenCalled();
  });

  it('migrates removed fields out of an imported config', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<ConfigEditor {...defaultProps} onSave={onSave} />);

    await user.click(screen.getByRole('button', { name: 'Import' }));

    const modal = screen.getByText('Import Config').closest('.config-editor-modal')!;
    const textarea = within(modal as HTMLElement).getByPlaceholderText('Paste exported base64 string here...');

    const legacyConfig = {
      ...mockConfig,
      modules: mockConfig.modules.map((module) => ({ ...module, columns: 3 })),
    };
    await user.type(textarea, btoa(JSON.stringify(legacyConfig)));
    await user.click(within(modal as HTMLElement).getByRole('button', { name: 'Apply' }));

    expect(onSave).toHaveBeenCalledWith(mockConfig);
  });

  it('shows import error on invalid base64 input', async () => {
    const user = userEvent.setup();
    render(<ConfigEditor {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Import' }));
    expect(screen.getByText('Import Config')).toBeInTheDocument();

    const modal = screen.getByText('Import Config').closest('.config-editor-modal')!;
    const textarea = within(modal as HTMLElement).getByPlaceholderText('Paste exported base64 string here...');
    await user.type(textarea, 'not-valid-base64!!!');

    const applyButton = within(modal as HTMLElement).getByRole('button', { name: 'Apply' });
    await user.click(applyButton);

    expect(screen.getByText('Invalid base64 string.')).toBeInTheDocument();
  });

  it('preserves link changes when saving from the General tab', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<ConfigEditor {...defaultProps} onSave={onSave} />);

    // Switch to Links tab and add a new section
    await user.click(screen.getByRole('button', { name: 'Links' }));
    await user.click(screen.getByRole('button', { name: 'Add Section' }));

    // Fill in the new section name
    const sectionInputs = screen.getAllByPlaceholderText('Section name');
    await user.type(sectionInputs[0], 'New Section');

    // Switch back to General tab and save
    await user.click(screen.getByRole('button', { name: 'General' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const savedConfig = onSave.mock.calls[0][0] as AppConfig;
    // Should have 3 modules: the new one + the 2 original ones
    expect(savedConfig.modules).toHaveLength(3);
    expect(savedConfig.modules[0].title).toBe('New Section');
  });

  it('preserves general changes when saving from the Links tab', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<ConfigEditor {...defaultProps} onSave={onSave} />);

    // Edit placeholder on General tab
    const placeholderInput = screen.getByPlaceholderText('Filter links...');
    await user.clear(placeholderInput);
    await user.type(placeholderInput, 'Search...');

    // Switch to Links tab and save
    await user.click(screen.getByRole('button', { name: 'Links' }));
    const saveButtons = screen.getAllByRole('button', { name: 'Save' });
    await user.click(saveButtons[0]);

    expect(onSave).toHaveBeenCalledTimes(1);
    const savedConfig = onSave.mock.calls[0][0] as AppConfig;
    expect(savedConfig.search?.placeholder).toBe('Search...');
    // Original modules should still be there
    expect(savedConfig.modules).toHaveLength(2);
  });

  it('requests and verifies an email code from the Account tab', async () => {
    const user = userEvent.setup();
    const onRequestEmailCode = vi.fn().mockResolvedValue(undefined);
    const onVerifyEmailCode = vi.fn().mockResolvedValue(undefined);

    render(
      <ConfigEditor
        {...defaultProps}
        initialTab="account"
        accountControls={{
          account: { status: 'signed-out' },
          syncStatus: 'local',
          syncError: null,
          lastSyncedAt: null,
          onRequestEmailCode,
          onVerifyEmailCode,
          onSignOut: vi.fn(),
          onRetrySync: vi.fn(),
        }}
      />,
    );

    await user.type(screen.getByLabelText('Email address'), 'Person@Example.com');
    await user.click(screen.getByRole('button', { name: 'Send login code' }));
    await waitFor(() => expect(onRequestEmailCode).toHaveBeenCalledWith('person@example.com'));

    await user.type(screen.getByLabelText('6-digit code'), '123456');
    await user.click(screen.getByRole('button', { name: 'Verify code' }));
    await waitFor(() => {
      expect(onVerifyEmailCode).toHaveBeenCalledWith('person@example.com', '123456');
    });
  });

  it('shows signed-in sync state and account controls', () => {
    render(
      <ConfigEditor
        {...defaultProps}
        initialTab="account"
        accountControls={{
          account: { status: 'signed-in', userId: 'user-1', email: 'person@example.com' },
          syncStatus: 'error',
          syncError: 'Network unavailable',
          lastSyncedAt: null,
          onRequestEmailCode: vi.fn(),
          onVerifyEmailCode: vi.fn(),
          onSignOut: vi.fn(),
          onRetrySync: vi.fn(),
        }}
      />,
    );

    expect(screen.getByText('person@example.com')).toBeInTheDocument();
    expect(screen.getByText('Sync needs attention')).toBeInTheDocument();
    expect(screen.getByText('Network unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry sync' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Contact support' })).toHaveAttribute(
      'href',
      expect.stringContaining('support@thenewtab.app'),
    );
  });
});
