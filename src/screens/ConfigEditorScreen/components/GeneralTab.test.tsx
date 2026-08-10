import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GeneralTab } from './GeneralTab.tsx';
import { mockConfig, mockBackgroundWithImage } from '../../../test/fixtures.ts';
import type { AppConfig, BackgroundConfig } from '../../../types/config.ts';

describe('GeneralTab', () => {
  const defaultProps = {
    config: mockConfig,
    onSave: vi.fn(),
    onClose: vi.fn(),
    onPreview: vi.fn(),
    onConfigChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Background and Search section headings', () => {
    render(<GeneralTab {...defaultProps} />);
    expect(screen.getByText('Background')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
  });

  it('renders the placeholder input with the current config value', () => {
    render(<GeneralTab {...defaultProps} />);
    const input = screen.getByPlaceholderText('Filter links...');
    expect(input).toHaveValue('Filter links...');
  });

  it('renders the placeholder input empty when config has no placeholder', () => {
    const configNoPlaceholder: AppConfig = {
      ...mockConfig,
      search: { enabled: true },
    };
    render(<GeneralTab {...defaultProps} config={configNoPlaceholder} />);
    const input = screen.getByPlaceholderText('Filter links...');
    expect(input).toHaveValue('');
  });

  it('allows editing the placeholder text', async () => {
    const user = userEvent.setup();
    render(<GeneralTab {...defaultProps} />);

    const input = screen.getByPlaceholderText('Filter links...');
    await user.clear(input);
    await user.type(input, 'Search here...');
    expect(input).toHaveValue('Search here...');
  });

  it('saves the placeholder value when Save is clicked', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<GeneralTab {...defaultProps} onSave={onSave} />);

    const input = screen.getByPlaceholderText('Filter links...');
    await user.clear(input);
    await user.type(input, 'Type to search...');

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const savedConfig = onSave.mock.calls[0][0] as AppConfig;
    expect(savedConfig.search?.placeholder).toBe('Type to search...');
  });

  it('saves placeholder as undefined when input is empty', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<GeneralTab {...defaultProps} onSave={onSave} />);

    const input = screen.getByPlaceholderText('Filter links...');
    await user.clear(input);

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const savedConfig = onSave.mock.calls[0][0] as AppConfig;
    expect(savedConfig.search?.placeholder).toBeUndefined();
  });

  it('preserves the search enabled state when saving', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const configWithSearch: AppConfig = {
      ...mockConfig,
      search: { enabled: true, placeholder: 'old' },
    };
    render(<GeneralTab {...defaultProps} config={configWithSearch} onSave={onSave} />);

    await user.click(screen.getByRole('button', { name: 'Save' }));

    const savedConfig = onSave.mock.calls[0][0] as AppConfig;
    expect(savedConfig.search?.enabled).toBe(true);
  });

  it('renders background color input', () => {
    render(<GeneralTab {...defaultProps} />);
    expect(screen.getByText('Color')).toBeInTheDocument();
  });

  it('shows image URL field', () => {
    render(<GeneralTab {...defaultProps} />);
    expect(screen.getByText('Image URL')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('https://example.com/image.jpg')).toBeInTheDocument();
  });

  it('shows overlay opacity when image is applied', () => {
    const configWithImage: AppConfig = {
      ...mockConfig,
      background: mockBackgroundWithImage,
    };
    render(<GeneralTab {...defaultProps} config={configWithImage} />);
    expect(screen.getByText(/Overlay Opacity/)).toBeInTheDocument();
  });

  it('defaults the foreground control to Auto', () => {
    render(<GeneralTab {...defaultProps} />);
    expect(screen.getByText('Foreground')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Auto' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('reflects the saved foreground setting', () => {
    const configWithForeground: AppConfig = {
      ...mockConfig,
      background: { ...mockConfig.background, foreground: 'dark' },
    };
    render(<GeneralTab {...defaultProps} config={configWithForeground} />);
    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('previews the foreground override immediately', async () => {
    const user = userEvent.setup();
    const onPreview = vi.fn();
    render(<GeneralTab {...defaultProps} onPreview={onPreview} />);

    await user.click(screen.getByRole('button', { name: 'Light' }));

    const previewed = onPreview.mock.calls.at(-1)?.[0] as BackgroundConfig;
    expect(previewed.foreground).toBe('light');
  });

  it('saves the selected foreground setting', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<GeneralTab {...defaultProps} onSave={onSave} />);

    await user.click(screen.getByRole('button', { name: 'Dark' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    const savedConfig = onSave.mock.calls[0][0] as AppConfig;
    expect(savedConfig.background?.foreground).toBe('dark');
  });

  it('keeps the foreground setting in the shared draft', async () => {
    const user = userEvent.setup();
    const onConfigChange = vi.fn();
    render(<GeneralTab {...defaultProps} onConfigChange={onConfigChange} />);

    await user.click(screen.getByRole('button', { name: 'Light' }));

    const draft = onConfigChange.mock.calls.at(-1)?.[0] as AppConfig;
    expect(draft.background?.foreground).toBe('light');
  });

  it('calls onClose when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<GeneralTab {...defaultProps} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
