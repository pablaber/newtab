import { render } from '@testing-library/react';
import { BackgroundLayer } from './BackgroundLayer.tsx';
import {
  mockBackground,
  mockBackgroundWithGradient,
  mockBackgroundWithImage,
} from '../test/fixtures.ts';

describe('BackgroundLayer', () => {
  it('renders solid color when no image or gradient', () => {
    const { container } = render(<BackgroundLayer background={mockBackground} />);
    const solid = container.querySelector('.background-solid');
    expect(solid).toBeInTheDocument();
    expect(solid).toHaveStyle({ backgroundColor: '#1a1a2e' });
  });

  it('renders gradient when gradient is enabled', () => {
    const { container } = render(<BackgroundLayer background={mockBackgroundWithGradient} />);
    const solid = container.querySelector('.background-solid');
    expect(solid).toBeInTheDocument();
    expect(solid).toHaveStyle({
      backgroundImage: 'linear-gradient(to bottom, #1a1a2e, #2b82fb)',
    });
  });

  it('renders image with overlay when imageUrl is set', () => {
    const { container } = render(<BackgroundLayer background={mockBackgroundWithImage} />);
    const image = container.querySelector('.background-image');
    const overlay = container.querySelector('.background-overlay');
    expect(image).toBeInTheDocument();
    expect(image).toHaveStyle({
      backgroundImage: 'url(https://example.com/bg.jpg)',
    });
    expect(overlay).toBeInTheDocument();
  });

  it('uses default color when no background config provided', () => {
    const { container } = render(<BackgroundLayer />);
    const solid = container.querySelector('.background-solid');
    expect(solid).toBeInTheDocument();
    expect(solid).toHaveStyle({ backgroundColor: '#1a1a2e' });
  });
});
