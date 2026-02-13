import { render, screen } from '@testing-library/react';
import { LinkModule } from './LinkModule.tsx';
import { mockModule, mockModuleWithHiddenLinks } from '../../../test/fixtures.ts';

describe('LinkModule', () => {
  it('renders the module title', () => {
    render(<LinkModule module={mockModule} onNavigate={vi.fn()} />);
    expect(screen.getByText('Favorites')).toBeInTheDocument();
  });

  it('renders all visible links', () => {
    render(<LinkModule module={mockModule} onNavigate={vi.fn()} />);
    expect(screen.getByText('GitHub')).toBeInTheDocument();
    expect(screen.getByText('Hacker News')).toBeInTheDocument();
    expect(screen.getByText('YouTube')).toBeInTheDocument();
  });

  it('filters out links with hidden: true', () => {
    render(<LinkModule module={mockModuleWithHiddenLinks} onNavigate={vi.fn()} />);
    expect(screen.getByText('Google')).toBeInTheDocument();
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
  });
});
