import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AccountState } from '../../../hooks/useConfig.ts';
import type { AppConfig } from '../../../types/config.ts';
import { mockConfig, mockHiddenModule } from '../../../test/fixtures.ts';
import { CommandPalette } from './CommandPalette.tsx';

function renderPalette(
  config: AppConfig = mockConfig,
  onSave = vi.fn(),
  onClose = vi.fn(),
  onOpenSettings = vi.fn(),
  onOpenAbout = vi.fn(),
  account?: AccountState,
  onOpenAccount = vi.fn(),
  onSignOut = vi.fn(),
  onOpenSubcommands = vi.fn(),
) {
  render(
    <CommandPalette
      config={config}
      onSave={onSave}
      onClose={onClose}
      onOpenSettings={onOpenSettings}
      onOpenSubcommands={onOpenSubcommands}
      onOpenAbout={onOpenAbout}
      account={account}
      onOpenAccount={onOpenAccount}
      onSignOut={onSignOut}
    />,
  );
  return { onSave, onClose, onOpenSettings, onOpenAbout, onOpenAccount, onSignOut, onOpenSubcommands };
}

async function openAddLinkForm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('option', { name: /Add Link/ }));
}

async function openRemoveLinks(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('option', { name: /Remove Links/ }));
}

describe('CommandPalette', () => {
  it('autofocuses and filters the declarative command list', async () => {
    const user = userEvent.setup();
    renderPalette();

    const input = screen.getByPlaceholderText('Type a command...');
    expect(input).toHaveFocus();

    await user.type(input, 'bookmark');
    expect(screen.getByRole('option', { name: /Add Link/ })).toBeInTheDocument();

    await user.clear(input);
    await user.type(input, 'unknown');
    expect(screen.getByText('No commands found.')).toBeInTheDocument();
  });

  it('opens the selected command with Enter', async () => {
    const user = userEvent.setup();
    renderPalette();

    await user.keyboard('{Enter}');
    expect(screen.getByRole('heading', { name: 'Add Link' })).toBeInTheDocument();
    expect(screen.getByLabelText('Link URL')).toHaveFocus();
  });

  it('opens settings and closes the command palette', async () => {
    const user = userEvent.setup();
    const { onClose, onOpenSettings } = renderPalette();

    await user.click(screen.getByRole('option', { name: /Open Settings/ }));

    expect(onClose).toHaveBeenCalledOnce();
    expect(onOpenSettings).toHaveBeenCalledOnce();
  });

  it('searches links without including subcommands and asks for confirmation on Enter', async () => {
    const user = userEvent.setup();
    const config: AppConfig = {
      ...mockConfig,
      subcommands: [{ name: 'GitHub Command', trigger: 'github', items: [] }],
    };
    renderPalette(config);
    await openRemoveLinks(user);

    const input = screen.getByPlaceholderText('Search links to remove...');
    expect(input).toHaveFocus();
    await user.type(input, 'github');

    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByRole('option', { name: /GitHub.*Favorites/ })).toBeInTheDocument();
    expect(screen.queryByText('GitHub Command')).not.toBeInTheDocument();

    await user.keyboard('{Enter}');
    expect(screen.getByText(/Are you sure you want to remove/)).toHaveTextContent(
      'Are you sure you want to remove GitHub?',
    );
  });

  it('removes the confirmed link without mutating the input config', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const originalLinks = [...mockConfig.modules[0].links];
    renderPalette(mockConfig, onSave);
    await openRemoveLinks(user);

    await user.type(screen.getByPlaceholderText('Search links to remove...'), 'hacker');
    await user.keyboard('{Enter}');
    await user.click(screen.getByRole('button', { name: 'Remove Link' }));

    expect(onSave).toHaveBeenCalledOnce();
    const saved = onSave.mock.calls[0][0] as AppConfig;
    expect(saved.modules[0].links.map((link) => link.label)).toEqual(['GitHub', 'YouTube']);
    expect(saved.modules[1]).toBe(mockConfig.modules[1]);
    expect(mockConfig.modules[0].links).toEqual(originalLinks);
  });

  it('keeps the link when removal confirmation is cancelled', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    renderPalette(mockConfig, onSave);
    await openRemoveLinks(user);

    await user.type(screen.getByPlaceholderText('Search links to remove...'), 'youtube');
    await user.keyboard('{Enter}');
    await user.click(screen.getByRole('button', { name: 'Keep Link' }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText('Search links to remove...')).toHaveFocus();
    expect(screen.getByRole('option', { name: /YouTube.*Favorites/ })).toBeInTheDocument();
  });

  it('opens a staged Subcommands settings card', async () => {
    const user = userEvent.setup();
    const { onClose, onOpenSubcommands } = renderPalette();

    await user.click(screen.getByRole('option', { name: /Add Subcommand/ }));

    expect(onClose).toHaveBeenCalledOnce();
    expect(onOpenSubcommands).toHaveBeenCalledOnce();
  });

  it('opens About and closes the command palette', async () => {
    const user = userEvent.setup();
    const { onClose, onOpenAbout } = renderPalette();

    await user.click(screen.getByRole('option', { name: /About/ }));

    expect(onClose).toHaveBeenCalledOnce();
    expect(onOpenAbout).toHaveBeenCalledOnce();
  });

  it('shows Account and Sign In only while signed out, with both opening Account', async () => {
    const user = userEvent.setup();
    const { onClose, onOpenAccount, onSignOut } = renderPalette(
      mockConfig,
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn(),
      { status: 'signed-out' },
    );

    expect(screen.getByRole('option', { name: /^Account/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /^Sign In/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /^Sign Out/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('option', { name: /^Sign In/ }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onOpenAccount).toHaveBeenCalledOnce();
    expect(onSignOut).not.toHaveBeenCalled();
  });

  it('shows Account and Sign Out only while signed in, and signs out immediately', async () => {
    const user = userEvent.setup();
    const { onClose, onOpenAccount, onSignOut } = renderPalette(
      mockConfig,
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn(),
      { status: 'signed-in', userId: 'user-1', email: 'person@example.com' },
    );

    expect(screen.getByRole('option', { name: /^Account/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /^Sign Out/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /^Sign In/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('option', { name: /^Sign Out/ }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onSignOut).toHaveBeenCalledOnce();
    expect(onOpenAccount).not.toHaveBeenCalled();
  });

  it('hides account commands when account sync is disabled', () => {
    renderPalette(mockConfig, vi.fn(), vi.fn(), vi.fn(), vi.fn(), { status: 'disabled' });

    expect(screen.queryByRole('option', { name: /^Account/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /^Sign In/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /^Sign Out/ })).not.toBeInTheDocument();
  });

  it('closes on Escape and backdrop click', async () => {
    const user = userEvent.setup();
    const { onClose } = renderPalette();

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();

    const overlay = screen.getByRole('dialog').parentElement!;
    await user.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('does not close when dialog content is clicked', async () => {
    const user = userEvent.setup();
    const { onClose } = renderPalette();

    await user.click(screen.getByRole('heading', { name: 'Commands' }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows validation errors for every required add-link field', async () => {
    const user = userEvent.setup();
    const { onSave, onClose } = renderPalette();
    await openAddLinkForm(user);

    await user.click(screen.getByRole('button', { name: 'Add Link' }));

    expect(screen.getByText('URL is required')).toBeInTheDocument();
    expect(screen.getByText('Label is required')).toBeInTheDocument();
    expect(screen.getByText('Category is required')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('appends a normalized link to the selected category without mutating the input config', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const originalLinkCount = mockConfig.modules[0].links.length;
    renderPalette(mockConfig, onSave);
    await openAddLinkForm(user);

    await user.type(screen.getByLabelText('Link URL'), '  github.example/path  ');
    await user.type(screen.getByLabelText('Link label'), '  Work GitHub  ');
    const categoryInput = screen.getByLabelText('Folder / category');
    await user.click(categoryInput);
    await user.click(screen.getByRole('option', { name: 'Favorites' }));
    await user.click(screen.getByRole('button', { name: 'Add Link' }));

    expect(onSave).toHaveBeenCalledOnce();
    const saved = onSave.mock.calls[0][0] as AppConfig;
    expect(saved.modules[0].links).toHaveLength(originalLinkCount + 1);
    expect(saved.modules[0].links.at(-1)).toEqual({
      url: 'https://github.example/path',
      label: 'Work GitHub',
    });
    expect(saved.modules[1]).toBe(mockConfig.modules[1]);
    expect(mockConfig.modules[0].links).toHaveLength(originalLinkCount);
  });

  it('includes hidden categories and marks them as hidden', async () => {
    const user = userEvent.setup();
    const config = { ...mockConfig, modules: [...mockConfig.modules, mockHiddenModule] };
    renderPalette(config);
    await openAddLinkForm(user);

    await user.click(screen.getByLabelText('Folder / category'));
    const option = screen.getByRole('option', { name: /Hidden Section.*Hidden/ });
    expect(within(option).getByText('Hidden')).toBeInTheDocument();
  });

  it('creates a visible category at the beginning when no category matches', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const emptyConfig = { ...mockConfig, modules: [] };
    renderPalette(emptyConfig, onSave);
    await openAddLinkForm(user);

    await user.type(screen.getByLabelText('Link URL'), 'example.com');
    await user.type(screen.getByLabelText('Link label'), 'Example');
    await user.type(screen.getByLabelText('Folder / category'), 'New Category');
    await user.click(screen.getByRole('option', { name: /Create new category.*New Category/ }));
    await user.click(screen.getByRole('button', { name: 'Add Link' }));

    const saved = onSave.mock.calls[0][0] as AppConfig;
    expect(saved.modules).toEqual([
      {
        type: 'links',
        title: 'New Category',
        links: [{ url: 'https://example.com', label: 'Example' }],
      },
    ]);
    expect(saved.modules[0].hidden).toBeUndefined();
  });

  it('shows the top three matching categories followed by an explicit create option', async () => {
    const user = userEvent.setup();
    const config: AppConfig = {
      ...mockConfig,
      modules: ['Work', 'Workshop', 'Homework', 'Wow', 'Personal'].map((title) => ({
        type: 'links',
        title,
        links: [],
      })),
    };
    renderPalette(config);
    await openAddLinkForm(user);

    await user.type(screen.getByLabelText('Folder / category'), 'wo');
    const options = screen.getAllByRole('option');

    expect(options).toHaveLength(4);
    expect(options.slice(0, 3).map((option) => option.textContent)).toEqual([
      'Work',
      'Workshop',
      'Wow',
    ]);
    expect(options[3]).toHaveTextContent('Create new category “wo”');
    expect(screen.queryByRole('option', { name: 'Homework' })).not.toBeInTheDocument();
  });

  it('requires choosing the create option for an unmatched category', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    renderPalette(mockConfig, onSave);
    await openAddLinkForm(user);

    await user.type(screen.getByLabelText('Link URL'), 'example.com');
    await user.type(screen.getByLabelText('Link label'), 'Example');
    await user.type(screen.getByLabelText('Folder / category'), 'New Category');
    await user.click(screen.getByRole('button', { name: 'Add Link' }));

    expect(screen.getByText('Choose a category or select the create option')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('reuses an exact category name instead of creating a duplicate', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    renderPalette(mockConfig, onSave);
    await openAddLinkForm(user);

    await user.type(screen.getByLabelText('Link URL'), 'example.com');
    await user.type(screen.getByLabelText('Link label'), 'Example');
    await user.type(screen.getByLabelText('Folder / category'), 'favorites');
    await user.click(screen.getByRole('button', { name: 'Add Link' }));

    const saved = onSave.mock.calls[0][0] as AppConfig;
    expect(saved.modules).toHaveLength(mockConfig.modules.length);
    expect(saved.modules[0].links.at(-1)?.label).toBe('Example');
  });

  it('supports keyboard selection in the category combobox', async () => {
    const user = userEvent.setup();
    renderPalette();
    await openAddLinkForm(user);

    const categoryInput = screen.getByLabelText('Folder / category');
    await user.click(categoryInput);
    expect(screen.getByRole('option', { name: 'Favorites' })).toHaveClass('selected');
    await user.keyboard('{Enter}');
    expect(categoryInput).toHaveValue('Favorites');
    expect(categoryInput).toHaveAttribute('aria-expanded', 'false');
  });

  it('automatically activates the create option when no categories match', async () => {
    const user = userEvent.setup();
    renderPalette();
    await openAddLinkForm(user);

    const categoryInput = screen.getByLabelText('Folder / category');
    await user.type(categoryInput, 'Brand New');
    const createOption = screen.getByRole('option', { name: /Create new category.*Brand New/ });

    expect(createOption).toHaveClass('selected');
    expect(categoryInput).toHaveAttribute('aria-activedescendant', createOption.id);

    await user.keyboard('{Enter}');
    expect(categoryInput).toHaveValue('Brand New');
    expect(categoryInput).toHaveAttribute('aria-expanded', 'false');
    expect(createOption).not.toBeInTheDocument();
  });

  it('traps focus within the dialog', () => {
    renderPalette();

    const close = screen.getByRole('button', { name: 'Close commands' });
    const lastOption = screen.getByRole('option', { name: /About/ });
    close.focus();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Tab', shiftKey: true });
    expect(lastOption).toHaveFocus();

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Tab' });
    expect(close).toHaveFocus();
  });
});
