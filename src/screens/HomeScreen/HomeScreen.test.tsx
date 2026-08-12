import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HomeScreen } from './HomeScreen.tsx';
import { mockConfig, mockHiddenModule } from '../../test/fixtures.ts';

vi.mock('../../env.ts', () => ({ isHosted: false }));

describe('HomeScreen', () => {
  it('renders about button, settings button, search bar, and module grid', () => {
    render(<HomeScreen config={mockConfig} onSaveConfig={vi.fn()} onOpenSettings={vi.fn()} />);
    expect(screen.getByLabelText('About')).toBeInTheDocument();
    expect(screen.getByLabelText('Settings')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Filter links...')).toBeInTheDocument();
    expect(screen.getByText('Favorites')).toBeInTheDocument();
  });

  it('opens about modal when about button is clicked', async () => {
    const user = userEvent.setup();
    render(<HomeScreen config={mockConfig} onSaveConfig={vi.fn()} onOpenSettings={vi.fn()} />);

    await user.click(screen.getByLabelText('About'));
    expect(screen.getByText('About')).toBeInTheDocument();
    expect(screen.getByText(/clean, customizable new tab page/)).toBeInTheDocument();
  });

  it('closes about modal when back button is clicked', async () => {
    const user = userEvent.setup();
    render(<HomeScreen config={mockConfig} onSaveConfig={vi.fn()} onOpenSettings={vi.fn()} />);

    await user.click(screen.getByLabelText('About'));
    expect(screen.getByText(/clean, customizable new tab page/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.queryByText(/clean, customizable new tab page/)).not.toBeInTheDocument();
  });

  it('calls onOpenSettings when settings button is clicked', async () => {
    const user = userEvent.setup();
    const onOpenSettings = vi.fn();
    render(<HomeScreen config={mockConfig} onSaveConfig={vi.fn()} onOpenSettings={onOpenSettings} />);

    await user.click(screen.getByLabelText('Settings'));
    expect(onOpenSettings).toHaveBeenCalledOnce();
  });

  it('shows account sync status and opens the account screen when enabled', async () => {
    const user = userEvent.setup();
    const onOpenAccount = vi.fn();
    render(
      <HomeScreen
        config={mockConfig}
        onSaveConfig={vi.fn()}
        onOpenSettings={vi.fn()}
        account={{ status: 'signed-in', userId: 'user-1', email: 'person@example.com' }}
        syncStatus="error"
        onOpenAccount={onOpenAccount}
      />,
    );

    await user.click(screen.getByLabelText('Account – sync needs attention'));
    expect(onOpenAccount).toHaveBeenCalledOnce();
  });

  it('opens commands with Mod+P and closes the About modal', async () => {
    const user = userEvent.setup();
    render(<HomeScreen config={mockConfig} onSaveConfig={vi.fn()} onOpenSettings={vi.fn()} />);

    await user.click(screen.getByLabelText('About'));
    expect(screen.getByText(/clean, customizable new tab page/)).toBeInTheDocument();

    // In jsdom (Linux), Mod resolves to Control.
    await user.keyboard('{Control>}p{/Control}');
    expect(screen.queryByText(/clean, customizable new tab page/)).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Commands' })).toBeInTheDocument();
  });

  it('opens settings from the command palette', async () => {
    const user = userEvent.setup();
    const onOpenSettings = vi.fn();
    render(<HomeScreen config={mockConfig} onSaveConfig={vi.fn()} onOpenSettings={onOpenSettings} />);

    await user.keyboard('{Control>}p{/Control}');
    await user.click(screen.getByRole('option', { name: /Open Settings/ }));

    expect(onOpenSettings).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog', { name: 'Commands' })).not.toBeInTheDocument();
  });

  it('opens the account screen from the command palette', async () => {
    const user = userEvent.setup();
    const onOpenAccount = vi.fn();
    render(
      <HomeScreen
        config={mockConfig}
        onSaveConfig={vi.fn()}
        onOpenSettings={vi.fn()}
        account={{ status: 'signed-out' }}
        onOpenAccount={onOpenAccount}
      />,
    );

    await user.keyboard('{Control>}p{/Control}');
    await user.click(screen.getByRole('option', { name: /^Account/ }));

    expect(onOpenAccount).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog', { name: 'Commands' })).not.toBeInTheDocument();
  });

  it('signs out from the command palette when signed in', async () => {
    const user = userEvent.setup();
    const onSignOut = vi.fn().mockResolvedValue(undefined);
    render(
      <HomeScreen
        config={mockConfig}
        onSaveConfig={vi.fn()}
        onOpenSettings={vi.fn()}
        account={{ status: 'signed-in', userId: 'user-1', email: 'person@example.com' }}
        onOpenAccount={vi.fn()}
        onSignOut={onSignOut}
      />,
    );

    await user.keyboard('{Control>}p{/Control}');
    await user.click(screen.getByRole('option', { name: /^Sign Out/ }));

    expect(onSignOut).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog', { name: 'Commands' })).not.toBeInTheDocument();
  });

  it('opens About from the command palette', async () => {
    const user = userEvent.setup();
    render(<HomeScreen config={mockConfig} onSaveConfig={vi.fn()} onOpenSettings={vi.fn()} />);

    await user.keyboard('{Control>}p{/Control}');
    await user.click(screen.getByRole('option', { name: /About/ }));

    expect(screen.getByText(/clean, customizable new tab page/)).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Commands' })).not.toBeInTheDocument();
  });

  it('restores the search hotkey after the command palette closes', async () => {
    const user = userEvent.setup();
    render(<HomeScreen config={mockConfig} onSaveConfig={vi.fn()} onOpenSettings={vi.fn()} />);
    const search = screen.getByPlaceholderText('Filter links...');

    await user.keyboard('{Control>}p{/Control}');
    await user.keyboard('{Escape}');
    await user.click(screen.getByLabelText('Settings'));
    expect(search).not.toHaveFocus();

    await user.keyboard('{Control>}k{/Control}');
    expect(search).toHaveFocus();
  });

  it('shows navigating state after a link is clicked', async () => {
    const user = userEvent.setup();

    // Prevent actual navigation
    const originalLocation = window.location.href;
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, href: originalLocation },
    });

    render(<HomeScreen config={mockConfig} onSaveConfig={vi.fn()} onOpenSettings={vi.fn()} />);

    await user.click(screen.getByText('GitHub'));
    expect(screen.getByText('Navigating to GitHub')).toBeInTheDocument();
  });

  it('shows empty state with search bar when no modules exist', () => {
    const emptyConfig = { ...mockConfig, modules: [] };
    render(<HomeScreen config={emptyConfig} onSaveConfig={vi.fn()} onOpenSettings={vi.fn()} />);

    expect(screen.getByPlaceholderText('Filter links...')).toBeInTheDocument();
    expect(screen.getByText('No links to show yet.')).toBeInTheDocument();
    expect(screen.getByText('Add sections and links in settings to get started.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open Settings' })).toBeInTheDocument();
  });

  it('shows empty state with search bar when all modules are hidden', () => {
    const hiddenConfig = { ...mockConfig, modules: [mockHiddenModule] };
    render(<HomeScreen config={hiddenConfig} onSaveConfig={vi.fn()} onOpenSettings={vi.fn()} />);

    expect(screen.getByPlaceholderText('Filter links...')).toBeInTheDocument();
    expect(screen.getByText('No links to show yet.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open Settings' })).toBeInTheDocument();
  });

  it('opens settings when empty state button is clicked', async () => {
    const user = userEvent.setup();
    const onOpenSettings = vi.fn();
    const emptyConfig = { ...mockConfig, modules: [] };
    render(<HomeScreen config={emptyConfig} onSaveConfig={vi.fn()} onOpenSettings={onOpenSettings} />);

    await user.click(screen.getByRole('button', { name: 'Open Settings' }));
    expect(onOpenSettings).toHaveBeenCalledOnce();
  });

  it('does not render footer when not hosted', () => {
    render(<HomeScreen config={mockConfig} onSaveConfig={vi.fn()} onOpenSettings={vi.fn()} />);
    expect(screen.queryByText('A website by Patrick Bacon-Blaber')).not.toBeInTheDocument();
  });

  describe('when hosted', () => {
    beforeEach(async () => {
      const env = await import('../../env.ts');
      vi.mocked(env).isHosted = true as never;
    });

    afterEach(async () => {
      const env = await import('../../env.ts');
      vi.mocked(env).isHosted = false as never;
    });

    it('renders footer with attribution and coffee link', () => {
      render(<HomeScreen config={mockConfig} onSaveConfig={vi.fn()} onOpenSettings={vi.fn()} />);
      expect(screen.getByText('A website by Patrick Bacon-Blaber')).toBeInTheDocument();
      const link = screen.getByRole('link', { name: /Buy Me A Coffee/ });
      expect(link).toHaveAttribute('href', 'https://buymeacoffee.com/pablaber');
      expect(link).toHaveAttribute('target', '_blank');
    });
  });
});
