import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LinkActionsMenu } from './LinkActionsMenu.tsx';

describe('LinkActionsMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens the menu and calls onMoveToSection', async () => {
    const user = userEvent.setup();
    const onMoveToSection = vi.fn();
    render(<LinkActionsMenu canMove onMoveToSection={onMoveToSection} />);

    const trigger = screen.getByRole('button', { name: 'More actions' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menuitem', { name: 'Move to section…' })).toHaveFocus();

    await user.click(screen.getByRole('menuitem', { name: 'Move to section…' }));
    expect(onMoveToSection).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes on Escape and on outside click', async () => {
    const user = userEvent.setup();
    render(
      <>
        <button>Outside</button>
        <LinkActionsMenu canMove onMoveToSection={vi.fn()} />
      </>,
    );

    await user.click(screen.getByRole('button', { name: 'More actions' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'More actions' }));
    await user.click(screen.getByRole('button', { name: 'Outside' }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('disables the move item when moving is not possible', async () => {
    const user = userEvent.setup();
    const onMoveToSection = vi.fn();
    render(<LinkActionsMenu canMove={false} onMoveToSection={onMoveToSection} />);

    await user.click(screen.getByRole('button', { name: 'More actions' }));

    expect(screen.getByRole('menuitem', { name: 'Move to section…' })).toBeDisabled();
  });
});
