import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBar } from './SearchBar.tsx';
import { mockModule, mockModuleWithHiddenLinks } from '../../../test/fixtures.ts';

const modules = [mockModule, mockModuleWithHiddenLinks];

describe('SearchBar', () => {
  it('returns null when enabled is false', () => {
    const { container } = render(
      <SearchBar enabled={false} placeholder="Filter..." modules={modules} onNavigate={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows dropdown matches when typing a query', async () => {
    const user = userEvent.setup();
    render(
      <SearchBar enabled={true} placeholder="Filter links..." modules={modules} onNavigate={vi.fn()} />,
    );

    const input = screen.getByPlaceholderText('Filter links...');
    await user.type(input, 'git');

    expect(screen.getByText('GitHub')).toBeInTheDocument();
  });

  it('filters links case-insensitively across modules', async () => {
    const user = userEvent.setup();
    render(
      <SearchBar enabled={true} placeholder="Filter..." modules={modules} onNavigate={vi.fn()} />,
    );

    await user.type(screen.getByPlaceholderText('Filter...'), 'goo');
    expect(screen.getByText('Google')).toBeInTheDocument();
    expect(screen.queryByText('GitHub')).not.toBeInTheDocument();
  });

  it('calls onNavigate on Enter when a match is selected', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(
      <SearchBar enabled={true} placeholder="Filter..." modules={modules} onNavigate={onNavigate} />,
    );

    await user.type(screen.getByPlaceholderText('Filter...'), 'GitHub');
    await user.keyboard('{Enter}');

    expect(onNavigate).toHaveBeenCalledWith('https://github.com', 'GitHub');
  });

  it('clears query on Escape', async () => {
    const user = userEvent.setup();
    render(
      <SearchBar enabled={true} placeholder="Filter..." modules={modules} onNavigate={vi.fn()} />,
    );

    const input = screen.getByPlaceholderText('Filter...');
    await user.type(input, 'git');
    expect(screen.getByText('GitHub')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByText('GitHub')).not.toBeInTheDocument();
    expect(input).toHaveValue('');
  });
});
