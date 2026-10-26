import React, { useState, useEffect } from 'react';
import type { BucketConfig, PileLayout } from '../types/betting';
import { getContainerGeometry } from '../utils/bucketGeometry';

export interface HopperBackdropPanelProps {
  bucketConfig: BucketConfig;
  pileLayout?: PileLayout;
  isVisible?: boolean;
}

export const HopperBackdropPanel: React.FC<HopperBackdropPanelProps> = ({
  bucketConfig,
  pileLayout = 'bottom-center',
  isVisible = true,
}) => {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight : 1080,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isBgVisible = bucketConfig.backgroundVisible !== undefined
    ? bucketConfig.backgroundVisible
    : !bucketConfig.hideWalls;

  if (!isVisible || !isBgVisible) return null;

  const geom = getContainerGeometry(windowSize.width, windowSize.height, bucketConfig, pileLayout);

  return (
    <div
      className="hopper-backdrop-panel cosmos-panel"
      style={{
        position: 'absolute',
        left: `${geom.x}px`,
        top: `${geom.y}px`,
        width: `${geom.width}px`,
        height: `${geom.height}px`,
        zIndex: 5,
        pointerEvents: 'none',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    />
  );
};
