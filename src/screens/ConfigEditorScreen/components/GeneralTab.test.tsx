import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GeneralTab } from './GeneralTab.tsx';
import { mockConfig, mockBackgroundWithImage } from '../../../test/fixtures.ts';
import type { AppConfig } from '../../../types/config.ts';

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

  it('calls onClose when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<GeneralTab {...defaultProps} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
