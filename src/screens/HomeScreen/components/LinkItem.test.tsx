import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LinkItem } from './LinkItem.tsx';
import { mockLink, mockLinkWithIcon } from '../../../test/fixtures.ts';

describe('LinkItem', () => {
  it('renders the link label', () => {
    render(<LinkItem link={mockLink} onNavigate={vi.fn()} />);
    expect(screen.getByText('GitHub')).toBeInTheDocument();
  });

  it('renders a google favicon when no custom icon is provided', () => {
    const { container } = render(<LinkItem link={mockLink} onNavigate={vi.fn()} />);
    const img = container.querySelector('.link-item-icon');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute(
      'src',
      'https://www.google.com/s2/favicons?domain_url=https%3A%2F%2Fgithub.com%2F&sz=32',
    );
  });

  it('renders a custom icon when link.icon is set', () => {
    const { container } = render(<LinkItem link={mockLinkWithIcon} onNavigate={vi.fn()} />);
    const img = container.querySelector('.link-item-icon');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/icon.png');
  });

  it('calls onNavigate with url and label on click', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<LinkItem link={mockLink} onNavigate={onNavigate} />);

    await user.click(screen.getByText('GitHub'));
    expect(onNavigate).toHaveBeenCalledWith('https://github.com', 'GitHub');
  });
});
