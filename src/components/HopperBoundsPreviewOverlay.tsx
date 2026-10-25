import React, { useState, useEffect, useRef } from 'react';
import type { BucketConfig, PileLayout } from '../types/betting';
import { getContainerGeometry, REF_WIDTH, REF_HEIGHT } from '../utils/bucketGeometry';

export interface HopperBoundsPreviewOverlayProps {
  isVisible: boolean;
  bucketConfig: BucketConfig;
  pileLayout?: PileLayout;
  renderEngine?: '2d' | '3d';
  isAdjusting?: boolean;
  onUpdateBucketConfig?: (config: BucketConfig) => void;
  onAdjusting?: (isAdjusting: boolean) => void;
}

type DragHandleType = 'left' | 'right' | 'top' | 'bottom' | 'tl' | 'tr' | 'bl' | 'br' | 'move';

export const HopperBoundsPreviewOverlay: React.FC<HopperBoundsPreviewOverlayProps> = ({
  isVisible,
  bucketConfig,
  pileLayout = 'bottom-center',
  renderEngine = '2d',
  isAdjusting = false,
  onUpdateBucketConfig,
  onAdjusting,
}) => {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  const [activeHandle, setActiveHandle] = useState<DragHandleType | null>(null);

  const dragStateRef = useRef<{
    handle: DragHandleType;
    pointerId: number;
    startX: number;
    startY: number;
    initLeft: number;
    initRight: number;
    initBottom: number;
    initHeight: number;
    scaleX: number;
    scaleY: number;
  } | null>(null);

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isVisible) return null;

  const geom = getContainerGeometry(
    windowSize.width,
    windowSize.height,
    bucketConfig,
    pileLayout
  );

  const scalePct = Math.round((windowSize.width / REF_WIDTH) * 100);
  const refLeft = bucketConfig.leftOffset;
  const refRight = bucketConfig.rightOffset;
  const refFloor = bucketConfig.bottomMargin;
  const refHeight = bucketConfig.height;

  const screenLeftPx = Math.round(geom.x);
  const screenRightPx = Math.round(windowSize.width - (geom.x + geom.width));
  const screenFloorPx = Math.round(windowSize.height - (geom.y + geom.height));
  const screenHeightPx = Math.round(geom.height);
  const screenWidthPx = Math.round(geom.width);

  const handlePointerDown = (handle: DragHandleType, e: React.PointerEvent) => {
    if (!onUpdateBucketConfig) return;
    e.preventDefault();
    e.stopPropagation();

    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}

    const scaleX = windowSize.width / REF_WIDTH;
    const scaleY = windowSize.height / REF_HEIGHT;

    dragStateRef.current = {
      handle,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      initLeft: bucketConfig.leftOffset,
      initRight: bucketConfig.rightOffset,
      initBottom: bucketConfig.bottomMargin,
      initHeight: bucketConfig.height,
      scaleX,
      scaleY,
    };

    setActiveHandle(handle);
    onAdjusting?.(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStateRef.current || dragStateRef.current.pointerId !== e.pointerId) return;

    const { handle, startX, startY, initLeft, initRight, initBottom, initHeight, scaleX, scaleY } = dragStateRef.current;

    const dx = (e.clientX - startX) / scaleX;
    const dy = (e.clientY - startY) / scaleY;

    const updated: BucketConfig = { ...bucketConfig };

    if (handle === 'left' || handle === 'tl' || handle === 'bl') {
      const maxLeft = REF_WIDTH - initRight - 140;
      updated.leftOffset = Math.max(0, Math.min(maxLeft, Math.round(initLeft + dx)));
    }

    if (handle === 'right' || handle === 'tr' || handle === 'br') {
      const maxRight = REF_WIDTH - initLeft - 140;
      updated.rightOffset = Math.max(0, Math.min(maxRight, Math.round(initRight - dx)));
    }

    if (handle === 'top' || handle === 'tl' || handle === 'tr') {
      const maxHeight = REF_HEIGHT - initBottom - 50;
      updated.height = Math.max(60, Math.min(maxHeight, Math.round(initHeight - dy)));
    }

    if (handle === 'bottom' || handle === 'bl' || handle === 'br') {
      const maxBottom = REF_HEIGHT - initHeight - 30;
      updated.bottomMargin = Math.max(0, Math.min(maxBottom, Math.round(initBottom - dy)));
    }

    if (handle === 'move') {
      const boxRefWidth = REF_WIDTH - initLeft - initRight;
      const maxLeft = REF_WIDTH - boxRefWidth;
      const newLeft = Math.max(0, Math.min(maxLeft, Math.round(initLeft + dx)));
      const newRight = REF_WIDTH - boxRefWidth - newLeft;
      const maxBottom = REF_HEIGHT - initHeight - 30;
      const newBottom = Math.max(0, Math.min(maxBottom, Math.round(initBottom - dy)));

      updated.leftOffset = newLeft;
      updated.rightOffset = newRight;
      updated.bottomMargin = newBottom;
    }

    onUpdateBucketConfig?.(updated);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragStateRef.current && dragStateRef.current.pointerId === e.pointerId) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      dragStateRef.current = null;
      setActiveHandle(null);
      onAdjusting?.(false);
    }
  };

  const isInteracting = activeHandle !== null || isAdjusting;

  return (
    <div
      className={`hopper-preview-overlay ${isInteracting ? 'is-adjusting' : ''}`}
      aria-hidden="true"
    >
      <div
        className={`hopper-preview-box ${isInteracting ? 'is-adjusting' : ''}`}
        style={{
          left: `${geom.x}px`,
          top: `${geom.y}px`,
          width: `${geom.width}px`,
          height: `${geom.height}px`,
        }}
      >
        {/* Interactive Drag Edge Hit-Areas */}
        {onUpdateBucketConfig && (
          <>
            {/* Top Edge */}
            <div
              className={`hopper-drag-edge hopper-drag-edge-top ${activeHandle === 'top' ? 'is-dragging' : ''}`}
              onPointerDown={(e) => handlePointerDown('top', e)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              title="Drag top edge to adjust hopper height"
            >
              <div className="hopper-drag-edge-pill" />
            </div>

            {/* Bottom Edge */}
            <div
              className={`hopper-drag-edge hopper-drag-edge-bottom ${activeHandle === 'bottom' ? 'is-dragging' : ''}`}
              onPointerDown={(e) => handlePointerDown('bottom', e)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              title="Drag bottom edge to adjust floor margin"
            >
              <div className="hopper-drag-edge-pill" />
            </div>

            {/* Left Edge */}
            <div
              className={`hopper-drag-edge hopper-drag-edge-left ${activeHandle === 'left' ? 'is-dragging' : ''}`}
              onPointerDown={(e) => handlePointerDown('left', e)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              title="Drag left edge to adjust left offset"
            >
              <div className="hopper-drag-edge-pill" />
            </div>

            {/* Right Edge */}
            <div
              className={`hopper-drag-edge hopper-drag-edge-right ${activeHandle === 'right' ? 'is-dragging' : ''}`}
              onPointerDown={(e) => handlePointerDown('right', e)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              title="Drag right edge to adjust right offset"
            >
              <div className="hopper-drag-edge-pill" />
            </div>

            {/* 4 Interactive Corner Nodes (Replaces clashing pseudo-borders) */}
            <div
              className={`hopper-drag-corner hopper-drag-corner-tl ${activeHandle === 'tl' ? 'is-dragging' : ''}`}
              onPointerDown={(e) => handlePointerDown('tl', e)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              title="Drag Top-Left corner to adjust width & height"
            />
            <div
              className={`hopper-drag-corner hopper-drag-corner-tr ${activeHandle === 'tr' ? 'is-dragging' : ''}`}
              onPointerDown={(e) => handlePointerDown('tr', e)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              title="Drag Top-Right corner to adjust width & height"
            />
            <div
              className={`hopper-drag-corner hopper-drag-corner-bl ${activeHandle === 'bl' ? 'is-dragging' : ''}`}
              onPointerDown={(e) => handlePointerDown('bl', e)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              title="Drag Bottom-Left corner to adjust width & floor"
            />
            <div
              className={`hopper-drag-corner hopper-drag-corner-br ${activeHandle === 'br' ? 'is-dragging' : ''}`}
              onPointerDown={(e) => handlePointerDown('br', e)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              title="Drag Bottom-Right corner to adjust width & floor"
            />
          </>
        )}

        {/* Top Intake Zone */}
        <div className="hopper-intake-bar">
          <div className="hopper-intake-label">
            📥 Token Intake Zone ({screenWidthPx}px)
          </div>
        </div>

        {/* Left Margin Readout */}
        <div className="hopper-guide-badge hopper-guide-left">
          ⯇ Left: {refLeft}px 1080p ({screenLeftPx}px screen)
        </div>

        {/* Right Margin Readout */}
        <div className="hopper-guide-badge hopper-guide-right">
          Right: {refRight}px 1080p ({screenRightPx}px screen) ⯈
        </div>

        {/* Height Readout */}
        <div className="hopper-guide-badge hopper-guide-height">
          Height: {refHeight}px 1080p ({screenHeightPx}px) ⯅
        </div>

        {/* Center Target & Calibration Dimensions (Also draggable to move the whole hopper) */}
        <div
          className={`hopper-center-target ${onUpdateBucketConfig ? 'is-moveable' : ''} ${activeHandle === 'move' ? 'is-moving' : ''}`}
          onPointerDown={onUpdateBucketConfig ? (e) => handlePointerDown('move', e) : undefined}
          onPointerMove={onUpdateBucketConfig ? handlePointerMove : undefined}
          onPointerUp={onUpdateBucketConfig ? handlePointerUp : undefined}
          onPointerCancel={onUpdateBucketConfig ? handlePointerUp : undefined}
          title={onUpdateBucketConfig ? 'Click and drag center target to reposition hopper' : undefined}
        >
          <div className="hopper-crosshair-icon">
            <div className="hopper-crosshair-ring" />
            <div className="hopper-crosshair-dot" />
          </div>
          <div className="hopper-center-meta">
            <span className="hopper-center-title">
              🪣 TOKEN HOPPER BOUNDS ({renderEngine.toUpperCase()})
            </span>
            <span className="hopper-center-sub">
              {screenWidthPx} × {screenHeightPx} px • Floor: {refFloor}px
            </span>
            <span className="hopper-center-sub" style={{ color: '#fbbf24', fontSize: '9px' }}>
              📺 1080p Ref Broadcast Canvas • Scale: {scalePct}%
              {onUpdateBucketConfig ? ' • Drag edges/corners to resize' : ''}
            </span>
          </div>
        </div>

        {/* Bottom Landing Payout Floor */}
        <div className="hopper-floor-bar">
          <div className="hopper-floor-label">
            ⯆ Floor: {refFloor}px 1080p ({screenFloorPx}px screen)
          </div>
        </div>
      </div>
    </div>
  );
};
