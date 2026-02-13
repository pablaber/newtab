import type { BackgroundConfig, GradientDirection } from '../types/config.ts';

const GRADIENT_CSS_DIRECTION: Record<GradientDirection, string> = {
  up: 'to top',
  down: 'to bottom',
  left: 'to left',
  right: 'to right',
};

interface BackgroundLayerProps {
  background?: BackgroundConfig;
}

export function BackgroundLayer({ background }: BackgroundLayerProps) {
  const color = background?.color ?? '#1a1a2e';
  const opacity = background?.opacity ?? 0.4;
  const imageUrl = background?.imageUrl;
  const gradient = background?.gradient;

  const useGradient = gradient?.enabled === true;
  const gradientCss = useGradient
    ? `linear-gradient(${GRADIENT_CSS_DIRECTION[gradient.direction]}, ${color}, ${gradient.color2})`
    : undefined;

  return (
    <div className="background-layer">
      {imageUrl ? (
        <>
          <div
            className="background-image"
            style={{ backgroundImage: `url(${imageUrl})` }}
          />
          <div
            className="background-overlay"
            style={
              gradientCss
                ? { backgroundImage: gradientCss, opacity }
                : { backgroundColor: color, opacity }
            }
          />
        </>
      ) : (
        <div
          className="background-solid"
          style={
            gradientCss
              ? { backgroundImage: gradientCss }
              : { backgroundColor: color }
          }
        />
      )}
    </div>
  );
}
