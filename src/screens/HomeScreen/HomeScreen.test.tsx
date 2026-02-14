import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HomeScreen } from './HomeScreen.tsx';
import { mockConfig, mockHiddenModule } from '../../test/fixtures.ts';

vi.mock('../../env.ts', () => ({ isHosted: false }));

describe('HomeScreen', () => {
  it('renders settings button, search bar, and module grid', () => {
    render(<HomeScreen config={mockConfig} onOpenSettings={vi.fn()} />);
    expect(screen.getByLabelText('Settings')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Filter links...')).toBeInTheDocument();
    expect(screen.getByText('Favorites')).toBeInTheDocument();
  });

  it('calls onOpenSettings when settings button is clicked', async () => {
    const user = userEvent.setup();
    const onOpenSettings = vi.fn();
    render(<HomeScreen config={mockConfig} onOpenSettings={onOpenSettings} />);

    await user.click(screen.getByLabelText('Settings'));
    expect(onOpenSettings).toHaveBeenCalledOnce();
  });

  it('shows navigating state after a link is clicked', async () => {
    const user = userEvent.setup();

    // Prevent actual navigation
    const originalLocation = window.location.href;
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, href: originalLocation },
    });

    render(<HomeScreen config={mockConfig} onOpenSettings={vi.fn()} />);

    await user.click(screen.getByText('GitHub'));
    expect(screen.getByText('Navigating to GitHub')).toBeInTheDocument();
  });

  it('shows empty state with search bar when no modules exist', () => {
    const emptyConfig = { ...mockConfig, modules: [] };
    render(<HomeScreen config={emptyConfig} onOpenSettings={vi.fn()} />);

    expect(screen.getByPlaceholderText('Filter links...')).toBeInTheDocument();
    expect(screen.getByText('No links to show yet.')).toBeInTheDocument();
    expect(screen.getByText('Add sections and links in settings to get started.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open Settings' })).toBeInTheDocument();
  });

  it('shows empty state with search bar when all modules are hidden', () => {
    const hiddenConfig = { ...mockConfig, modules: [mockHiddenModule] };
    render(<HomeScreen config={hiddenConfig} onOpenSettings={vi.fn()} />);

    expect(screen.getByPlaceholderText('Filter links...')).toBeInTheDocument();
    expect(screen.getByText('No links to show yet.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open Settings' })).toBeInTheDocument();
  });

  it('opens settings when empty state button is clicked', async () => {
    const user = userEvent.setup();
    const onOpenSettings = vi.fn();
    const emptyConfig = { ...mockConfig, modules: [] };
    render(<HomeScreen config={emptyConfig} onOpenSettings={onOpenSettings} />);

    await user.click(screen.getByRole('button', { name: 'Open Settings' }));
    expect(onOpenSettings).toHaveBeenCalledOnce();
  });

  it('does not render footer when not hosted', () => {
    render(<HomeScreen config={mockConfig} onOpenSettings={vi.fn()} />);
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
      render(<HomeScreen config={mockConfig} onOpenSettings={vi.fn()} />);
      expect(screen.getByText('A website by Patrick Bacon-Blaber')).toBeInTheDocument();
      const link = screen.getByRole('link', { name: /Buy Me A Coffee/ });
      expect(link).toHaveAttribute('href', 'https://buymeacoffee.com/pablaber');
      expect(link).toHaveAttribute('target', '_blank');
    });
  });
});
