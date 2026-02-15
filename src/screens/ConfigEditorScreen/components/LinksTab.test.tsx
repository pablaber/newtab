import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LinksTab } from './LinksTab.tsx';
import { mockConfig } from '../../../test/fixtures.ts';

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

    expect(screen.getByText(/1 section/)).toBeInTheDocument();
    expect(screen.getByText(/1 link\b/)).toBeInTheDocument();
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
    expect(screen.getByDisplayValue('Favorites')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Tools')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear All Links' }));

    const modal = screen.getByText('Clear All Links', { selector: 'h2' }).closest('.config-editor-modal')!;
    const removeButton = within(modal as HTMLElement).getByRole('button', { name: 'Remove' });
    await user.click(removeButton);

    // Modal should close
    expect(screen.queryByText('Clear All Links', { selector: 'h2' })).not.toBeInTheDocument();

    // Sections should be gone
    expect(screen.queryByDisplayValue('Favorites')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('Tools')).not.toBeInTheDocument();

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
