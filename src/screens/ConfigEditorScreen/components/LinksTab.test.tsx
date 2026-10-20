import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LinksTab } from './LinksTab.tsx';
import { mockConfig } from '../../../test/fixtures.ts';
import type { AppConfig } from '../../../types/config.ts';

describe('LinksTab', () => {
  const defaultProps = {
    config: mockConfig,
    onSave: vi.fn(),
    onClose: vi.fn(),
    onConfigChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows Clear All Links button when sections exist', () => {
    render(<LinksTab {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Clear All Links' })).toBeInTheDocument();
  });

  it('does not show Clear All Links button when no sections exist', () => {
    const emptyConfig = { ...mockConfig, modules: [] };
    render(<LinksTab {...defaultProps} config={emptyConfig} />);
    expect(screen.queryByRole('button', { name: 'Clear All Links' })).not.toBeInTheDocument();
  });

  it('opens confirmation modal when Clear All Links is clicked', async () => {
    const user = userEvent.setup();
    render(<LinksTab {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Clear All Links' }));

    expect(screen.getByText('Clear All Links', { selector: 'h2' })).toBeInTheDocument();
    expect(screen.getByText(/This will remove all/)).toBeInTheDocument();
    expect(screen.getByText(/2 sections/)).toBeInTheDocument();
    expect(screen.getByText(/5 links/)).toBeInTheDocument();
    expect(screen.getByText(/This action cannot be undone/)).toBeInTheDocument();
  });

  it('shows correct singular form for 1 section and 1 link', async () => {
    const user = userEvent.setup();
    const singleConfig = {
      ...mockConfig,
      modules: [{ type: 'links' as const, title: 'Solo', links: [{ url: 'https://a.com', label: 'A' }] }],
    };
    render(<LinksTab {...defaultProps} config={singleConfig} />);

    await user.click(screen.getByRole('button', { name: 'Clear All Links' }));

    const warning = screen.getByText(/This will remove all/);
    expect(warning).toHaveTextContent(/1 section\b/);
    expect(warning).toHaveTextContent(/1 link\b/);
  });

  it('closes confirmation modal when Cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<LinksTab {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Clear All Links' }));
    expect(screen.getByText('Clear All Links', { selector: 'h2' })).toBeInTheDocument();

    const modal = screen.getByText('Clear All Links', { selector: 'h2' }).closest('.config-editor-modal')!;
    const cancelButton = within(modal as HTMLElement).getByRole('button', { name: 'Cancel' });
    await user.click(cancelButton);

    expect(screen.queryByText('Clear All Links', { selector: 'h2' })).not.toBeInTheDocument();
  });

  it('closes confirmation modal when overlay is clicked', async () => {
    const user = userEvent.setup();
    render(<LinksTab {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Clear All Links' }));
    expect(screen.getByText('Clear All Links', { selector: 'h2' })).toBeInTheDocument();

    const overlay = screen.getByText('Clear All Links', { selector: 'h2' }).closest('.config-editor-modal-overlay')!;
    await user.click(overlay);

    expect(screen.queryByText('Clear All Links', { selector: 'h2' })).not.toBeInTheDocument();
  });

  it('removes all sections when Remove is confirmed', async () => {
    const user = userEvent.setup();
    render(<LinksTab {...defaultProps} />);

    // Verify sections exist
    expect(screen.getByRole('button', { name: 'Favorites' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tools' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear All Links' }));

    const modal = screen.getByText('Clear All Links', { selector: 'h2' }).closest('.config-editor-modal')!;
    const removeButton = within(modal as HTMLElement).getByRole('button', { name: 'Remove' });
    await user.click(removeButton);

    // Modal should close
    expect(screen.queryByText('Clear All Links', { selector: 'h2' })).not.toBeInTheDocument();

    // Sections should be gone
    expect(screen.queryByRole('button', { name: 'Favorites' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tools' })).not.toBeInTheDocument();

    // Empty state should show
    expect(screen.getByText('No sections yet. Add one to get started.')).toBeInTheDocument();

    // Clear All Links button should be hidden
    expect(screen.queryByRole('button', { name: 'Clear All Links' })).not.toBeInTheDocument();
  });

  it('closes confirmation modal when X button is clicked', async () => {
    const user = userEvent.setup();
    render(<LinksTab {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Clear All Links' }));
    expect(screen.getByText('Clear All Links', { selector: 'h2' })).toBeInTheDocument();

    const modal = screen.getByText('Clear All Links', { selector: 'h2' }).closest('.config-editor-modal')!;
    const header = within(modal as HTMLElement).getByText('Clear All Links', { selector: 'h2' }).closest('.config-editor-modal-header')!;
    const closeButton = within(header as HTMLElement).getByRole('button');
    await user.click(closeButton);

    expect(screen.queryByText('Clear All Links', { selector: 'h2' })).not.toBeInTheDocument();
  });

  const lastSavedModules = () => {
    const calls = defaultProps.onConfigChange.mock.calls;
    return (calls[calls.length - 1][0] as AppConfig).modules;
  };

  it('renders sections collapsed with a link count', () => {
    render(<LinksTab {...defaultProps} />);

    expect(screen.getByRole('button', { name: 'Favorites' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('3 links')).toBeInTheDocument();
    expect(screen.getByText('2 links')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Label')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Section name')).not.toBeInTheDocument();
  });

  it('expands and collapses a section', async () => {
    const user = userEvent.setup();
    render(<LinksTab {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Favorites' }));

    expect(screen.getByDisplayValue('Favorites')).toBeInTheDocument();
    expect(screen.getByDisplayValue('GitHub')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Google')).not.toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: 'Collapse section' })[0]);

    expect(screen.queryByDisplayValue('GitHub')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Favorites' })).toBeInTheDocument();
  });

  it('expands and collapses all sections from the toolbar', async () => {
    const user = userEvent.setup();
    render(<LinksTab {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Expand All' }));
    expect(screen.getByDisplayValue('GitHub')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Google')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Collapse All' }));
    expect(screen.queryByPlaceholderText('Label')).not.toBeInTheDocument();
  });

  it('starts a newly added section expanded', async () => {
    const user = userEvent.setup();
    render(<LinksTab {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Add Section' }));

    expect(screen.getByPlaceholderText('Section name')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Favorites' })).toBeInTheDocument();
  });

  it('keeps a section expanded when it is reordered', async () => {
    const user = userEvent.setup();
    render(<LinksTab {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Tools' }));
    await user.click(screen.getAllByRole('button', { name: 'Move section up' })[1]);

    expect(lastSavedModules().map((m) => m.title)).toEqual(['Tools', 'Favorites']);
    expect(screen.getByDisplayValue('Tools')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Favorites' })).toBeInTheDocument();
  });

  it('reorders and removes links', async () => {
    const user = userEvent.setup();
    render(<LinksTab {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Favorites' }));
    await user.click(screen.getAllByRole('button', { name: 'Move link down' })[0]);
    expect(lastSavedModules()[0].links.map((l) => l.label)).toEqual(['Hacker News', 'GitHub', 'YouTube']);

    await user.click(screen.getAllByRole('button', { name: 'Remove link' })[2]);
    expect(lastSavedModules()[0].links.map((l) => l.label)).toEqual(['Hacker News', 'GitHub']);
  });

  it('moves a link to another section from the actions menu', async () => {
    const user = userEvent.setup();
    render(<LinksTab {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Favorites' }));
    await user.click(screen.getAllByRole('button', { name: 'More actions' })[0]);
    await user.click(screen.getByRole('menuitem', { name: 'Move to section…' }));

    const dialog = screen.getByRole('dialog', { name: /Move .GitHub./ });
    expect(within(dialog).getAllByRole('option').map((o) => o.textContent)).toEqual(['Tools2 links']);

    await user.click(within(dialog).getByRole('button', { name: 'Move' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const modules = lastSavedModules();
    expect(modules[0].links.map((l) => l.label)).toEqual(['Hacker News', 'YouTube']);
    expect(modules[1].links.map((l) => l.label)).toEqual(['Google', 'Hidden', 'GitHub']);
  });

  it('disables moving a link when there is only one section', async () => {
    const user = userEvent.setup();
    render(<LinksTab {...defaultProps} config={{ ...mockConfig, modules: [mockConfig.modules[0]] }} />);

    await user.click(screen.getByRole('button', { name: 'Favorites' }));
    await user.click(screen.getAllByRole('button', { name: 'More actions' })[0]);

    expect(screen.getByRole('menuitem', { name: 'Move to section…' })).toBeDisabled();
  });

  it('expands sections with errors on save', async () => {
    const user = userEvent.setup();
    const config = {
      ...mockConfig,
      modules: [
        mockConfig.modules[0],
        { type: 'links' as const, title: 'Broken', links: [{ url: '', label: 'No URL' }] },
      ],
    };
    render(<LinksTab {...defaultProps} config={config} />);

    await user.click(screen.getAllByRole('button', { name: 'Save' })[0]);

    expect(defaultProps.onSave).not.toHaveBeenCalled();
    expect(screen.getByText('URL is required')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Broken')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Favorites' })).toBeInTheDocument();
  });

  it('renders a top Save button that calls onSave', async () => {
    const user = userEvent.setup();
    render(<LinksTab {...defaultProps} />);

    const saveButtons = screen.getAllByRole('button', { name: 'Save' });
    expect(saveButtons.length).toBe(2);

    // Click the top Save button (first one in DOM order)
    await user.click(saveButtons[0]);

    expect(defaultProps.onSave).toHaveBeenCalledTimes(1);
  });
});
