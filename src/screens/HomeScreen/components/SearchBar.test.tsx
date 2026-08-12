import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HotkeysProvider } from '@tanstack/react-hotkeys';
import { SearchBar } from './SearchBar.tsx';
import { scoreMatch, scoreLinkMatch } from './searchScoring.ts';
import { mockModule, mockModuleWithHiddenLinks, mockSubcommands } from '../../../test/fixtures.ts';
import type { ModuleConfig } from '../../../types/config.ts';

function renderWithHotkeys(ui: React.ReactElement) {
  return render(<HotkeysProvider>{ui}</HotkeysProvider>);
}

const modules = [mockModule, mockModuleWithHiddenLinks];

describe('scoreMatch', () => {
  it('returns 1.0 for an exact match (case-insensitive)', () => {
    expect(scoreMatch('GitHub', 'github')).toBe(1.0);
    expect(scoreMatch('hello', 'HELLO')).toBe(1.0);
  });

  it('scores prefix matches higher than contains matches', () => {
    const prefix = scoreMatch('git', 'GitHub');
    const contains = scoreMatch('git', 'aaGitHub');
    expect(prefix).toBeGreaterThan(contains);
  });

  it('scores earlier contains matches higher than later ones', () => {
    const early = scoreMatch('hub', 'xhub-long-string');
    const late = scoreMatch('hub', 'xxxxxxxxxxhub-long-string');
    expect(early).toBeGreaterThan(late);
  });

  it('returns 0 for no match', () => {
    expect(scoreMatch('xyz', 'GitHub')).toBe(0);
  });

  it('scores exact match higher than prefix match', () => {
    const exact = scoreMatch('git', 'git');
    const prefix = scoreMatch('git', 'github');
    expect(exact).toBeGreaterThan(prefix);
  });

  it('matches when spaces differ between query and text', () => {
    expect(scoreMatch('zwift power', 'zwiftpower')).toBeGreaterThan(0);
    expect(scoreMatch('zwiftpower', 'zwift power')).toBeGreaterThan(0);
  });

  it('matches when non-alphanumeric characters differ', () => {
    expect(scoreMatch('hacker-news', 'hackernews')).toBeGreaterThan(0);
    expect(scoreMatch('hackernews', 'hacker news')).toBeGreaterThan(0);
  });
});

describe('scoreLinkMatch', () => {
  it('returns 0 when nothing matches', () => {
    expect(scoreLinkMatch('xyz', 'GitHub', 'Favorites', 'https://github.com')).toBe(0);
  });

  it('gives highest score when label matches', () => {
    const labelScore = scoreLinkMatch('git', 'GitHub', 'Tools', 'https://example.com');
    const sectionScore = scoreLinkMatch('tool', 'Example', 'Tools', 'https://example.com');
    const urlScore = scoreLinkMatch('example', 'Link', 'Tools', 'https://example.com');
    expect(labelScore).toBeGreaterThan(sectionScore);
    expect(sectionScore).toBeGreaterThan(urlScore);
  });

  it('combines scores from multiple matching fields', () => {
    const singleMatch = scoreLinkMatch('git', 'GitHub', 'Tools', 'https://example.com');
    const multiMatch = scoreLinkMatch('git', 'GitHub', 'Git Tools', 'https://github.com');
    expect(multiMatch).toBeGreaterThan(singleMatch);
  });

  it('matches multi-word queries across different fields', () => {
    const score = scoreLinkMatch('Fitness strava', 'Strava', 'Fitness', 'https://strava.com');
    expect(score).toBeGreaterThan(0);
  });

  it('returns 0 when not all words in a multi-word query match', () => {
    const score = scoreLinkMatch('Fitness xyz', 'Strava', 'Fitness', 'https://strava.com');
    expect(score).toBe(0);
  });

  it('matches when query has spaces the label does not', () => {
    const score = scoreLinkMatch('zwift power', 'ZwiftPower', 'Cycling', 'https://zwiftpower.com');
    expect(score).toBeGreaterThan(0);
  });
});

describe('SearchBar', () => {
  it('returns null when enabled is false', () => {
    const { container } = render(
      <SearchBar enabled={false} placeholder="Filter..." modules={modules} onNavigate={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('still renders subcommands when ordinary link search is disabled', async () => {
    const user = userEvent.setup();
    render(<SearchBar enabled={false} placeholder="Filter..." modules={modules} subcommands={mockSubcommands} onNavigate={vi.fn()} />);

    const input = screen.getByPlaceholderText('Run a subcommand...');
    await user.type(input, 'ghp');
    expect(screen.getByText('GitHub Project')).toBeInTheDocument();
    expect(screen.queryByText('GitHub')).not.toBeInTheDocument();
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
    expect(screen.queryByText('Hacker News')).not.toBeInTheDocument();
  });

  it('matches on section title', async () => {
    const user = userEvent.setup();
    render(
      <SearchBar enabled={true} placeholder="Filter..." modules={modules} onNavigate={vi.fn()} />,
    );

    await user.type(screen.getByPlaceholderText('Filter...'), 'favorites');
    expect(screen.getByText('GitHub')).toBeInTheDocument();
    expect(screen.getByText('Hacker News')).toBeInTheDocument();
    expect(screen.getByText('YouTube')).toBeInTheDocument();
  });

  it('matches on url', async () => {
    const user = userEvent.setup();
    render(
      <SearchBar enabled={true} placeholder="Filter..." modules={modules} onNavigate={vi.fn()} />,
    );

    await user.type(screen.getByPlaceholderText('Filter...'), 'ycombinator');
    expect(screen.getByText('Hacker News')).toBeInTheDocument();
  });

  it('ranks label matches above section title matches', async () => {
    const user = userEvent.setup();
    const testModules: ModuleConfig[] = [
      {
        type: 'links',
        title: 'Alpha',
        links: [{ url: 'https://alpha.com', label: 'Alpha Link' }],
      },
      {
        type: 'links',
        title: 'Beta',
        links: [{ url: 'https://beta.com', label: 'Beta Link' }],
      },
    ];

    render(
      <SearchBar enabled={true} placeholder="Filter..." modules={testModules} onNavigate={vi.fn()} />,
    );

    await user.type(screen.getByPlaceholderText('Filter...'), 'alpha');
    const items = screen.getAllByRole('link');
    expect(items[0]).toHaveTextContent('Alpha Link');
  });

  it('never displays more than 5 results', async () => {
    const user = userEvent.setup();
    const manyLinksModule: ModuleConfig = {
      type: 'links',
      title: 'Links',
      links: Array.from({ length: 10 }, (_, i) => ({
        url: `https://test${i}.com`,
        label: `Test Link ${i}`,
      })),
    };

    render(
      <SearchBar enabled={true} placeholder="Filter..." modules={[manyLinksModule]} onNavigate={vi.fn()} />,
    );

    await user.type(screen.getByPlaceholderText('Filter...'), 'test');
    const items = screen.getAllByRole('link');
    expect(items).toHaveLength(5);
  });

  it('matches multi-word query across label and section title', async () => {
    const user = userEvent.setup();
    const testModules: ModuleConfig[] = [
      {
        type: 'links',
        title: 'Fitness',
        links: [
          { url: 'https://strava.com', label: 'Strava' },
          { url: 'https://garmin.com', label: 'Garmin' },
        ],
      },
      {
        type: 'links',
        title: 'Social',
        links: [{ url: 'https://twitter.com', label: 'Twitter' }],
      },
    ];

    render(
      <SearchBar enabled={true} placeholder="Filter..." modules={testModules} onNavigate={vi.fn()} />,
    );

    await user.type(screen.getByPlaceholderText('Filter...'), 'fitness strava');
    expect(screen.getByText('Strava')).toBeInTheDocument();
    expect(screen.queryByText('Garmin')).not.toBeInTheDocument();
    expect(screen.queryByText('Twitter')).not.toBeInTheDocument();
  });

  it('matches when query spaces differ from label', async () => {
    const user = userEvent.setup();
    const testModules: ModuleConfig[] = [
      {
        type: 'links',
        title: 'Cycling',
        links: [{ url: 'https://zwiftpower.com', label: 'ZwiftPower' }],
      },
    ];

    render(
      <SearchBar enabled={true} placeholder="Filter..." modules={testModules} onNavigate={vi.fn()} />,
    );

    await user.type(screen.getByPlaceholderText('Filter...'), 'zwift power');
    expect(screen.getByText('ZwiftPower')).toBeInTheDocument();
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

  it('renders the kbd badge when enabled', () => {
    renderWithHotkeys(
      <SearchBar enabled={true} placeholder="Filter..." modules={modules} onNavigate={vi.fn()} />,
    );
    // kbd is aria-hidden, so query by element tag
    const kbd = document.querySelector('kbd');
    expect(kbd).toBeInTheDocument();
  });

  it('kbd badge has hidden class when input is focused', () => {
    renderWithHotkeys(
      <SearchBar enabled={true} placeholder="Filter..." modules={modules} onNavigate={vi.fn()} />,
    );
    const input = screen.getByPlaceholderText('Filter...');
    const kbd = document.querySelector('kbd')!;

    // Initially the input has autoFocus, so it starts focused — badge is hidden
    fireEvent.focus(input);
    expect(kbd).toHaveClass('search-bar-kbd--hidden');
  });

  it('kbd badge has hidden class when query is non-empty', async () => {
    const user = userEvent.setup();
    renderWithHotkeys(
      <SearchBar enabled={true} placeholder="Filter..." modules={modules} onNavigate={vi.fn()} />,
    );
    const input = screen.getByPlaceholderText('Filter...');
    const kbd = document.querySelector('kbd')!;

    fireEvent.blur(input);
    await user.type(input, 'g');
    expect(kbd).toHaveClass('search-bar-kbd--hidden');
  });

  it('kbd badge does not have hidden class when input is blurred and query is empty', () => {
    renderWithHotkeys(
      <SearchBar enabled={true} placeholder="Filter..." modules={modules} onNavigate={vi.fn()} />,
    );
    const input = screen.getByPlaceholderText('Filter...');
    const kbd = document.querySelector('kbd')!;

    fireEvent.blur(input);
    expect(kbd).not.toHaveClass('search-bar-kbd--hidden');
  });

  it('Mod+K focuses the search input', async () => {
    const user = userEvent.setup();
    renderWithHotkeys(
      <>
        <button>other</button>
        <SearchBar enabled={true} placeholder="Filter..." modules={modules} onNavigate={vi.fn()} />
      </>,
    );
    const input = screen.getByPlaceholderText('Filter...');

    // Move focus to the other button so the input is not focused
    await user.click(screen.getByRole('button', { name: 'other' }));
    expect(document.activeElement).not.toBe(input);

    // In jsdom (Linux), Mod resolves to Control; fire Ctrl+K
    await user.keyboard('{Control>}k{/Control}');
    expect(document.activeElement).toBe(input);
  });

  it('activates an exact trigger with Tab and shows scoped items', async () => {
    const user = userEvent.setup();
    render(<SearchBar enabled placeholder="Filter..." modules={modules} subcommands={mockSubcommands} onNavigate={vi.fn()} />);

    await user.type(screen.getByPlaceholderText('Filter...'), 'ghp');
    await user.keyboard('{Tab}');

    expect(screen.getByRole('button', { name: 'Exit GitHub Project subcommand' })).toBeInTheDocument();
    expect(screen.getByText('newtab')).toBeInTheDocument();
    expect(screen.getByText('<repo>')).toBeInTheDocument();
  });

  it('activates a suggested subcommand with Enter or click', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<SearchBar enabled placeholder="Filter..." modules={[]} subcommands={mockSubcommands} onNavigate={vi.fn()} />);

    await user.type(screen.getByPlaceholderText('Filter...'), 'GitHub Project');
    await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Exit GitHub Project subcommand' })).toBeInTheDocument();

    rerender(<SearchBar enabled placeholder="Filter..." modules={[]} subcommands={mockSubcommands} onNavigate={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Exit GitHub Project subcommand' }));
    await user.type(screen.getByPlaceholderText('Filter...'), 'gh');
    await user.click(screen.getByText('GitHub Project'));
    expect(screen.getByRole('button', { name: 'Exit GitHub Project subcommand' })).toBeInTheDocument();
  });

  it('gives predefined items Enter priority while Tab chooses freeform', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<SearchBar enabled placeholder="Filter..." modules={[]} subcommands={mockSubcommands} onNavigate={onNavigate} />);

    const input = screen.getByPlaceholderText('Filter...');
    await user.type(input, 'ghp');
    await user.keyboard('{Tab}');
    await user.type(screen.getByPlaceholderText('<repo>'), 'newtab');
    await user.keyboard('{Enter}');
    expect(onNavigate).toHaveBeenCalledWith('https://github.com/pablaber/newtab', 'newtab');

    onNavigate.mockClear();
    await user.keyboard('{Tab}');
    expect(screen.getByText('Open generated destination')).toBeInTheDocument();
    expect(screen.getByText('https://github.com/pablaber/newtab')).toBeInTheDocument();
    await user.keyboard('{Enter}');
    expect(onNavigate).toHaveBeenCalledWith('https://github.com/pablaber/newtab', 'GitHub Project');
  });

  it('shows a live freeform destination below predefined items', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<SearchBar enabled placeholder="Filter..." modules={[]} subcommands={mockSubcommands} onNavigate={onNavigate} />);

    await user.type(screen.getByPlaceholderText('Filter...'), 'ghp');
    await user.keyboard('{Tab}');
    await user.type(screen.getByPlaceholderText('<repo>'), 'new');

    const results = screen.getAllByRole('link');
    expect(results[0]).toHaveTextContent('newtab');
    expect(results[1]).toHaveTextContent('Open generated destination');
    expect(results[1]).toHaveTextContent('https://github.com/pablaber/new');

    await user.keyboard('{ArrowDown}{Enter}');
    expect(onNavigate).toHaveBeenCalledWith('https://github.com/pablaber/new', 'GitHub Project');
  });

  it('opens the only live freeform destination with Enter without requiring Tab', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<SearchBar enabled placeholder="Filter..." modules={[]} subcommands={mockSubcommands} onNavigate={onNavigate} />);

    await user.type(screen.getByPlaceholderText('Filter...'), 'ghp');
    await user.keyboard('{Tab}');
    await user.type(screen.getByPlaceholderText('<repo>'), 'brand new');

    expect(screen.getByRole('link')).toHaveTextContent('Open generated destination');
    expect(screen.getByRole('link')).toHaveTextContent('https://github.com/pablaber/brand%20new');
    await user.keyboard('{Enter}');
    expect(onNavigate).toHaveBeenCalledWith(
      'https://github.com/pablaber/brand%20new',
      'GitHub Project',
    );
  });

  it('commits multi-field values with spaces and URL-encodes spaces and slashes', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<SearchBar enabled placeholder="Filter..." modules={[]} subcommands={mockSubcommands} onNavigate={onNavigate} />);

    await user.type(screen.getByPlaceholderText('Filter...'), 'gh');
    await user.keyboard('{Tab}');
    await user.type(screen.getByPlaceholderText('<account>'), 'Patrick Bacon');
    await user.keyboard('{Tab}');
    expect(screen.getByText('Patrick Bacon')).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText('<repo>'), 'tools/new tab');
    await user.keyboard('{Tab}');

    expect(screen.getByText('https://github.com/Patrick%20Bacon/tools%2Fnew%20tab')).toBeInTheDocument();
    await user.keyboard('{Enter}');
    expect(onNavigate).toHaveBeenCalledWith(
      'https://github.com/Patrick%20Bacon/tools%2Fnew%20tab',
      'GitHub',
    );
  });

  it('supports Backspace, Shift+Tab, Escape, and removing the scope chip', async () => {
    const user = userEvent.setup();
    render(<SearchBar enabled placeholder="Filter..." modules={[]} subcommands={mockSubcommands} onNavigate={vi.fn()} />);

    await user.type(screen.getByPlaceholderText('Filter...'), 'gh');
    await user.keyboard('{Tab}');
    const accountInput = screen.getByPlaceholderText('<account>');
    await user.type(accountInput, 'pablaber');
    await user.keyboard('{Tab}');
    await user.keyboard('{Backspace}');
    expect(accountInput).toHaveValue('pablaber');

    await user.keyboard('{Tab}');
    await user.type(screen.getByPlaceholderText('<repo>'), 'draft');
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(accountInput).toHaveValue('pablaber');
    expect(accountInput.selectionStart).toBe(0);
    expect(accountInput.selectionEnd).toBe('pablaber'.length);

    await user.keyboard('{Escape}');
    expect(accountInput).toHaveValue('');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('button', { name: 'Exit GitHub subcommand' })).not.toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Filter...'), 'gh');
    await user.keyboard('{Tab}');
    await user.click(screen.getByRole('button', { name: 'Exit GitHub subcommand' }));
    expect(screen.getByPlaceholderText('Filter...')).toHaveValue('');
  });
});
