import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfigEditor } from './ConfigEditorScreen.tsx';
import { mockConfig } from '../../test/fixtures.ts';

describe('ConfigEditorScreen', () => {
  const defaultProps = {
    config: mockConfig,
    onSave: vi.fn(),
    onClose: vi.fn(),
    onPreview: vi.fn(),
  };

  it('renders with General tab active by default', () => {
    render(<ConfigEditor {...defaultProps} />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
    const generalTab = screen.getByRole('button', { name: 'General' });
    expect(generalTab).toHaveClass('active');
  });

  it('switches between General and Links tabs', async () => {
    const user = userEvent.setup();
    render(<ConfigEditor {...defaultProps} />);

    const linksTab = screen.getByRole('button', { name: 'Links' });
    await user.click(linksTab);
    expect(linksTab).toHaveClass('active');

    const generalTab = screen.getByRole('button', { name: 'General' });
    expect(generalTab).not.toHaveClass('active');
  });

  it('shows export modal with base64 string', async () => {
    const user = userEvent.setup();
    localStorage.setItem('newtab-config', JSON.stringify(mockConfig));
    render(<ConfigEditor {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Export' }));
    expect(screen.getByText('Export Config')).toBeInTheDocument();

    const modal = screen.getByText('Export Config').closest('.config-editor-modal')!;
    const textarea = within(modal as HTMLElement).getByRole('textbox');
    expect((textarea as HTMLTextAreaElement).value.length).toBeGreaterThan(0);

    localStorage.removeItem('newtab-config');
  });

  it('shows import error on invalid base64 input', async () => {
    const user = userEvent.setup();
    render(<ConfigEditor {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Import' }));
    expect(screen.getByText('Import Config')).toBeInTheDocument();

    const modal = screen.getByText('Import Config').closest('.config-editor-modal')!;
    const textarea = within(modal as HTMLElement).getByPlaceholderText('Paste exported base64 string here...');
    await user.type(textarea, 'not-valid-base64!!!');

    const applyButton = within(modal as HTMLElement).getByRole('button', { name: 'Apply' });
    await user.click(applyButton);

    expect(screen.getByText('Invalid base64 string.')).toBeInTheDocument();
  });
});
