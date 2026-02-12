import type { BackgroundConfig } from '../types/config.ts';

interface BackgroundLayerProps {
  background?: BackgroundConfig;
}

export function BackgroundLayer({ background }: BackgroundLayerProps) {
  const color = background?.color ?? '#1a1a2e';
  const opacity = background?.opacity ?? 0.4;
  const imageUrl = background?.imageUrl;

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
            style={{ backgroundColor: color, opacity }}
          />
        </>
      ) : (
        <div
          className="background-solid"
          style={{ backgroundColor: color }}
        />
      )}
    </div>
  );
}
