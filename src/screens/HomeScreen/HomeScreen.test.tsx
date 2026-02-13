import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HomeScreen } from './HomeScreen.tsx';
import { mockConfig } from '../../test/fixtures.ts';

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
});
