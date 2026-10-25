import type { BucketConfig, PileLayout } from '../types/betting';

export interface ContainerGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
}

export const REF_WIDTH = 1920;
export const REF_HEIGHT = 1080;

/**
 * Computes exact container bounds on screen based on the 1080p reference broadcast canvas
 * or fallback pile layout presets. Shared between 2D Matter.js and 3D Three.js engines.
 */
export function getContainerGeometry(
  width: number,
  height: number,
  config?: BucketConfig,
  layout?: PileLayout
): ContainerGeometry {
  const scaleX = width / REF_WIDTH;
  const scaleY = height / REF_HEIGHT;

  if (config) {
    const scaledLeft = config.leftOffset * scaleX;
    const scaledRight = config.rightOffset * scaleX;
    const scaledBottom = config.bottomMargin * scaleY;
    const scaledHeight = config.height * scaleY;

    const left = Math.max(0, Math.min(scaledLeft, width - 120));
    const right = Math.max(0, Math.min(scaledRight, width - left - 80));
    const boxWidth = Math.max(120, width - left - right);
    const boxHeight = Math.max(50, Math.min(scaledHeight, height - 60));
    const x = left;
    const y = Math.max(0, height - scaledBottom - boxHeight);
    return { x, y, width: boxWidth, height: boxHeight, scaleX, scaleY };
  }

  const boxWidth = layout === 'center' ? Math.min(560 * scaleX, width * 0.65) : Math.min(300 * scaleX, width * 0.35);
  const boxHeight = Math.min(400 * scaleY, height * 0.52);

  let x = width - boxWidth - 30 * scaleX;
  let y = height - boxHeight - 20 * scaleY;

  if (layout === 'corner-bl') {
    x = 30 * scaleX;
  } else if (layout === 'bottom-center') {
    x = (width - boxWidth) / 2;
  } else if (layout === 'side-right') {
    x = width - boxWidth - 20 * scaleX;
    y = (height - boxHeight) / 2;
  } else if (layout === 'center') {
    x = (width - boxWidth) / 2;
    y = height - boxHeight - 40 * scaleY;
  }

  return { x, y, width: boxWidth, height: boxHeight, scaleX, scaleY };
}
