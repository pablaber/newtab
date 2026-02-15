import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LinkItem } from './LinkItem.tsx';
import { mockLink, mockLinkWithIcon, mockLinkWithIconUrl, mockLinkWithEmoji } from '../../../test/fixtures.ts';

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
      'https://www.google.com/s2/favicons?domain=github.com&sz=32',
    );
  });

  it('renders a custom icon when link.icon is set', () => {
    const { container } = render(<LinkItem link={mockLinkWithIcon} onNavigate={vi.fn()} />);
    const img = container.querySelector('.link-item-icon');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/icon.png');
  });

  it('renders a custom icon when link.iconUrl is set', () => {
    const { container } = render(<LinkItem link={mockLinkWithIconUrl} onNavigate={vi.fn()} />);
    const img = container.querySelector('.link-item-icon');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/custom-icon.png');
  });

  it('renders an emoji icon when link.iconEmoji is set', () => {
    const { container } = render(<LinkItem link={mockLinkWithEmoji} onNavigate={vi.fn()} />);
    const emoji = container.querySelector('.link-item-emoji');
    expect(emoji).toBeInTheDocument();
    expect(emoji).toHaveTextContent('🚀');
    // Should not render an img icon
    expect(container.querySelector('.link-item-icon')).not.toBeInTheDocument();
  });

  it('prefers iconEmoji over iconUrl', () => {
    const link = { url: 'https://example.com', label: 'Both', iconUrl: 'https://example.com/icon.png', iconEmoji: '🎯' };
    const { container } = render(<LinkItem link={link} onNavigate={vi.fn()} />);
    const emoji = container.querySelector('.link-item-emoji');
    expect(emoji).toBeInTheDocument();
    expect(emoji).toHaveTextContent('🎯');
    expect(container.querySelector('.link-item-icon')).not.toBeInTheDocument();
  });

  it('calls onNavigate with url and label on click', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<LinkItem link={mockLink} onNavigate={onNavigate} />);

    await user.click(screen.getByText('GitHub'));
    expect(onNavigate).toHaveBeenCalledWith('https://github.com', 'GitHub');
  });
});
