import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AboutModal } from './AboutModal.tsx';

describe('AboutModal', () => {
  it('renders title, description text, close button, and back button', () => {
    render(<AboutModal onClose={vi.fn()} />);
    expect(screen.getByText('About')).toBeInTheDocument();
    expect(screen.getByText(/clean, customizable new tab page/)).toBeInTheDocument();
    expect(screen.getByLabelText('Close')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<AboutModal onClose={onClose} />);

    await user.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when back button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<AboutModal onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when overlay is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<AboutModal onClose={onClose} />);

    const overlay = document.querySelector('.about-modal-overlay')!;
    await user.click(overlay);
    expect(onClose).toHaveBeenCalled();
  });

  it('does not call onClose when modal content is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<AboutModal onClose={onClose} />);

    await user.click(screen.getByText(/clean, customizable new tab page/));
    expect(onClose).not.toHaveBeenCalled();
  });
});
