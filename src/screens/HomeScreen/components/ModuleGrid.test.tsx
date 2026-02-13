import { render, screen } from '@testing-library/react';
import { ModuleGrid } from './ModuleGrid.tsx';
import { mockModule, mockModuleWithHiddenLinks, mockHiddenModule } from '../../../test/fixtures.ts';

describe('ModuleGrid', () => {
  it('renders all visible modules', () => {
    const modules = [mockModule, mockModuleWithHiddenLinks];
    render(<ModuleGrid modules={modules} onNavigate={vi.fn()} />);
    expect(screen.getByText('Favorites')).toBeInTheDocument();
    expect(screen.getByText('Tools')).toBeInTheDocument();
  });

  it('filters out modules with hidden: true', () => {
    const modules = [mockModule, mockHiddenModule];
    render(<ModuleGrid modules={modules} onNavigate={vi.fn()} />);
    expect(screen.getByText('Favorites')).toBeInTheDocument();
    expect(screen.queryByText('Hidden Section')).not.toBeInTheDocument();
  });

  it('renders nothing when all modules are hidden', () => {
    const modules = [mockHiddenModule];
    const { container } = render(<ModuleGrid modules={modules} onNavigate={vi.fn()} />);
    const grid = container.querySelector('.module-grid');
    expect(grid).toBeEmptyDOMElement();
  });
});
