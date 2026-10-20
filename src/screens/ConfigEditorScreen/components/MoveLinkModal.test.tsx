import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MoveLinkModal } from './MoveLinkModal.tsx';

describe('MoveLinkModal', () => {
  const sections = [
    { index: 0, title: 'Work', linkCount: 3 },
    { index: 2, title: 'News', linkCount: 1 },
    { index: 3, title: 'Social Networks', linkCount: 4, hidden: true },
    { index: 4, title: '', linkCount: 0 },
  ];

  const defaultProps = {
    linkLabel: 'GitHub',
    sections,
    onMove: vi.fn(),
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const optionLabels = () => screen.getAllByRole('option').map((option) => option.textContent);

  it('lists all target sections with link counts and focuses the input', () => {
    render(<MoveLinkModal {...defaultProps} />);

    expect(screen.getByRole('heading', { name: /Move .GitHub./ })).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveFocus();
    expect(optionLabels()).toEqual([
      'Work3 links',
      'News1 link',
      'Social NetworksHidden4 links',
      'Untitled section0 links',
    ]);
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('filters sections, ranking prefix matches before substring matches', async () => {
    const user = userEvent.setup();
    render(<MoveLinkModal {...defaultProps} />);

    await user.type(screen.getByRole('combobox'), 'n');

    expect(optionLabels()).toEqual(['News1 link', 'Social NetworksHidden4 links']);
  });

  it('shows an empty state and disables Move when nothing matches', async () => {
    const user = userEvent.setup();
    render(<MoveLinkModal {...defaultProps} />);

    await user.type(screen.getByRole('combobox'), 'zzz');

    expect(screen.getByText('No matching sections')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Move' })).toBeDisabled();
  });

  it('moves to the highlighted section with arrow keys and Enter', async () => {
    const user = userEvent.setup();
    render(<MoveLinkModal {...defaultProps} />);

    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowUp}{Enter}');

    expect(defaultProps.onMove).toHaveBeenCalledWith(2);
  });

  it('moves to a clicked section when Move is pressed', async () => {
    const user = userEvent.setup();
    render(<MoveLinkModal {...defaultProps} />);

    await user.click(screen.getByRole('option', { name: /Social Networks/ }));
    expect(screen.getByRole('option', { name: /Social Networks/ })).toHaveAttribute('aria-selected', 'true');
    expect(defaultProps.onMove).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Move' }));
    expect(defaultProps.onMove).toHaveBeenCalledWith(3);
  });

  it('closes on Escape, Cancel, and overlay click', async () => {
    const user = userEvent.setup();
    const { container } = render(<MoveLinkModal {...defaultProps} />);

    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await user.click(container.querySelector('.config-editor-modal-overlay')!);

    expect(defaultProps.onClose).toHaveBeenCalledTimes(3);
    expect(defaultProps.onMove).not.toHaveBeenCalled();
  });
});
