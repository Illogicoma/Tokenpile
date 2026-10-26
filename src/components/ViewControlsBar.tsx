import { useState, useEffect, useRef } from 'react';
import {
  Layers,
  Camera,
  Box,
  Sparkles,
  Layout,
  Eye,
  EyeOff,
  Sliders,
  Zap,
  X,
  ArrowLeftRight,
  Users,
  Columns,
  Compass,
  RotateCcw,
  Palette,
  Target,
  RefreshCw,
  Coins
} from 'lucide-react';
import type {
  RenderEngine,
  PileLayout,
  CameraAngle3D,
  UiDisplayMode,
  ScreenLayoutConfig,
  BucketConfig,
  ThemeCustomizationConfig
} from '../types/betting';
import { DEFAULT_BUCKET_CONFIG } from '../services/storageService';
import { ThemeColorControls } from './ThemeColorControls';

interface ViewControlsBarProps {
  renderEngine: RenderEngine;
  onToggleRenderEngine: (engine: RenderEngine) => void;
  pileLayout: PileLayout;
  onChangePileLayout: (layout: PileLayout) => void;
  cameraAngle: CameraAngle3D;
  onChangeCameraAngle: (angle: CameraAngle3D) => void;
  uiMode: UiDisplayMode;
  onChangeUiMode: (mode: UiDisplayMode) => void;
  pileOffset: { x: number; y: number };
  onChangePileOffset: (offset: { x: number; y: number }) => void;
  onClearArena: () => void;
  onCondensePile?: () => void;
  onJostleTokens?: () => void;
  onOpenBucketCalibration?: () => void;
  onClose?: () => void;
  layoutConfig?: ScreenLayoutConfig;
  onUpdateLayoutConfig?: (updater: (prev: ScreenLayoutConfig) => ScreenLayoutConfig) => void;
  bucketConfig?: BucketConfig;
  onUpdateBucketConfig?: (config: BucketConfig) => void;
  themeConfig?: ThemeCustomizationConfig;
  onUpdateThemeConfig?: (updater: ThemeCustomizationConfig | ((prev: ThemeCustomizationConfig) => ThemeCustomizationConfig)) => void;
  defaultTab?: 'bucket' | 'layout' | 'arena' | 'theme';
  onActiveTabChange?: (tab: 'bucket' | 'layout' | 'arena' | 'theme') => void;
  onAdjustingBounds?: (isAdjusting: boolean) => void;
}

export const ViewControlsBar = ({
  renderEngine,
  onToggleRenderEngine,
  pileLayout,
  onChangePileLayout,
  cameraAngle,
  onChangeCameraAngle,
  uiMode,
  onChangeUiMode,
  pileOffset,
  onChangePileOffset,
  onClearArena,
  onCondensePile,
  onJostleTokens,
  onClose,
  layoutConfig,
  onUpdateLayoutConfig,
  bucketConfig,
  onUpdateBucketConfig,
  themeConfig,
  onUpdateThemeConfig,
  defaultTab = 'bucket',
  onActiveTabChange,
  onAdjustingBounds
}: ViewControlsBarProps) => {
  const [activeTab, setActiveTab] = useState<'bucket' | 'layout' | 'arena' | 'theme'>(defaultTab);

  // Synchronize activeTab notifications to parent
  useEffect(() => {
    onActiveTabChange?.(activeTab);
  }, [activeTab, onActiveTabChange]);

  const handleSelectTab = (tab: 'bucket' | 'layout' | 'arena' | 'theme') => {
    setActiveTab(tab);
    onActiveTabChange?.(tab);
  };

  // Local bucket config to guarantee instant 120 FPS slider response
  const [localBucket, setLocalBucket] = useState<BucketConfig>(() => bucketConfig || DEFAULT_BUCKET_CONFIG);
  const isDraggingRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);
  const pendingConfigRef = useRef<BucketConfig | null>(null);

  useEffect(() => {
    if (!isDraggingRef.current && bucketConfig) {
      setLocalBucket(bucketConfig);
    }
  }, [bucketConfig]);

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  const dispatchThrottledUpdate = (newConfig: BucketConfig) => {
    pendingConfigRef.current = newConfig;
    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        if (pendingConfigRef.current && onUpdateBucketConfig) {
          onUpdateBucketConfig(pendingConfigRef.current);
        }
      });
    }
  };

  const handleSliderStart = () => {
    isDraggingRef.current = true;
    onAdjustingBounds?.(true);
  };

  const handleSliderChange = (field: keyof BucketConfig, value: number) => {
    isDraggingRef.current = true;
    onAdjustingBounds?.(true);
    const updated: BucketConfig = {
      ...(localBucket || DEFAULT_BUCKET_CONFIG),
      [field]: value
    };
    setLocalBucket(updated);
    dispatchThrottledUpdate(updated);
  };

  const handleSliderCommit = () => {
    isDraggingRef.current = false;
    onAdjustingBounds?.(false);
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (onUpdateBucketConfig && localBucket) {
      onUpdateBucketConfig(localBucket);
    }
  };

  const handleInstantBucketUpdate = (updated: BucketConfig) => {
    setLocalBucket(updated);
    if (onUpdateBucketConfig) {
      onUpdateBucketConfig(updated);
    }
  };

  const handleUpdateBucketToggle = (field: keyof BucketConfig, value: boolean) => {
    const updated = {
      ...(localBucket || DEFAULT_BUCKET_CONFIG),
      [field]: value
    };
    handleInstantBucketUpdate(updated);
  };

  const handleUpdateBucket = (field: keyof BucketConfig, value: number | boolean) => {
    if (typeof value === 'boolean') {
      handleUpdateBucketToggle(field, value);
    } else {
      handleSliderChange(field, value);
    }
  };

  const handleApplyBucketPreset = (preset: Partial<BucketConfig>) => {
    const updated = {
      ...(localBucket || DEFAULT_BUCKET_CONFIG),
      ...preset
    };
    handleInstantBucketUpdate(updated);
  };

  const handleSnapToStage = () => {
    const stageEl = document.querySelector('.race-visual-center-stage');
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (stageEl) {
      const rect = stageEl.getBoundingClientRect();
      const leftRef = Math.max(0, Math.round((rect.left / w) * 1920));
      const rightRef = Math.max(0, Math.round(((w - rect.right) / w) * 1920));
      const bottomRef = Math.max(10, Math.round(((h - rect.bottom + 16) / h) * 1080));
      const heightRef = Math.max(120, Math.round((rect.height * 0.44 / h) * 1080));
      handleInstantBucketUpdate({
        ...(localBucket || DEFAULT_BUCKET_CONFIG),
        leftOffset: leftRef,
        rightOffset: rightRef,
        bottomMargin: bottomRef,
        height: heightRef,
      });
    } else {
      handleApplyBucketPreset({ leftOffset: 340, rightOffset: 340, bottomMargin: 24, height: 240 });
    }
  };

  return (
    <div className="view-controls-tray-panel cosmos-panel">
      {/* Top Navigation Row: Sub-Tabs + Quick Actions */}
      <div className="tray-top-header">
        <div className="tray-tabs-group">
          <button
            type="button"
            className={`tray-tab-btn ${activeTab === 'bucket' ? 'active' : ''}`}
            onClick={() => handleSelectTab('bucket')}
            title="Configure token bucket boundaries, margins, and landing zone"
          >
            <Sliders size={13} />
            <span>🪣 Bucket Alignment</span>
            {localBucket && (
              <span className={`tray-tab-badge ${localBucket.showCalibrationGuide ? 'badge-amber' : ''}`}>
                {localBucket.showCalibrationGuide ? 'Guides ON' : `${localBucket.leftOffset}px`}
              </span>
            )}
          </button>

          <button
            type="button"
            className={`tray-tab-btn ${activeTab === 'layout' ? 'active' : ''}`}
            onClick={() => handleSelectTab('layout')}
            title="Configure screen panels, column arrangement, and odds bar placement"
          >
            <Columns size={13} />
            <span>📐 Layout & Positions</span>
            {layoutConfig && layoutConfig.columnArrangement === 'swapped' && (
              <span className="tray-tab-badge badge-blue">Swapped</span>
            )}
          </button>

          <button
            type="button"
            className={`tray-tab-btn ${activeTab === 'arena' ? 'active' : ''}`}
            onClick={() => handleSelectTab('arena')}
            title="Switch physics engine (2D/3D), camera angles, and token pile position"
          >
            <Sparkles size={13} />
            <span>🕹️ Arena & Physics</span>
            <span className="tray-tab-badge badge-green">{renderEngine.toUpperCase()}</span>
          </button>

          <button
            type="button"
            className={`tray-tab-btn ${activeTab === 'theme' ? 'active' : ''}`}
            onClick={() => handleSelectTab('theme')}
            title="Recolor the app, adjust HSL hue, accents, transparency, and corners"
          >
            <Palette size={13} />
            <span>🎨 Colors & Theme</span>
            {themeConfig && (
              <span className="tray-tab-badge badge-amber">{themeConfig.baseHue}°</span>
            )}
          </button>
        </div>

        {/* Quick Action Tray Header Buttons */}
        <div className="tray-quick-actions">
          {onCondensePile && (
            <button
              type="button"
              className="tray-action-btn tray-condense-btn"
              onClick={onCondensePile}
              title="Instantly condense all loose tokens in the bucket into compact high-tier coins per viewer"
            >
              <Zap size={12} color="#b45309" />
              <span>Condense Pile</span>
            </button>
          )}

          {onJostleTokens && (
            <button
              type="button"
              className="tray-action-btn tray-jostle-btn"
              onClick={onJostleTokens}
              title="Trip physics switch & wake up resting/frozen tokens in the hopper"
            >
              <RefreshCw size={12} color="#059669" />
              <span>Jostle Tokens</span>
            </button>
          )}

          <button
            type="button"
            className="tray-action-btn"
            onClick={onClearArena}
            title="Clear and reset all dropped tokens in the arena"
          >
            Clear Arena
          </button>

          {onClose && (
            <button
              type="button"
              className="tray-close-btn"
              onClick={onClose}
              title="Collapse controls menu"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* =========================================================================
          TAB 1: TOKEN BUCKET ALIGNMENT & CALIBRATION (LIVE STREAM OVERLAY EDITING)
          ========================================================================= */}
      {activeTab === 'bucket' && bucketConfig && onUpdateBucketConfig && (
        <div className="tray-tab-content tray-bucket-section">
          {/* Subbar: Helper note + Resolution scale readout + Toggles & Reset */}
          <div className="tray-bucket-subbar">
            <div className="tray-bucket-helper">
              <span className="tray-resolution-pill">
                📺 1080p Ref Broadcast Canvas • Current: {window.innerWidth}×{window.innerHeight} ({Math.round((window.innerWidth / 1920) * 100)}% scale)
              </span>
              <span className="tray-helper-text">
                Bucket automatically scales to fit OBS and any screen resolution.
              </span>
            </div>

            <div className="tray-bucket-toggles">
              {/* Snap to Track Stage Button */}
              <button
                type="button"
                className="tray-toggle-btn active-amber stage-snap-btn"
                onClick={handleSnapToStage}
                title="Automatically snap bucket margins to match the visible race track column between sidebars"
              >
                <Target size={12} color="#b45309" />
                <span>Snap to Track Stage</span>
              </button>

              {/* Toggle Background Visibility */}
              <button
                type="button"
                className={`tray-toggle-btn ${(localBucket.backgroundVisible !== undefined ? localBucket.backgroundVisible : !localBucket.hideWalls) ? 'active-amber' : ''}`}
                onClick={() => {
                  const current = localBucket.backgroundVisible !== undefined ? localBucket.backgroundVisible : !localBucket.hideWalls;
                  const next = !current;
                  handleInstantBucketUpdate({
                    ...localBucket,
                    backgroundVisible: next,
                    hideWalls: !next,
                  });
                }}
                title={(localBucket.backgroundVisible !== undefined ? localBucket.backgroundVisible : !localBucket.hideWalls) ? "Hopper panel background is visible using theme styling" : "Hopper panel background is hidden (transparent overlay ready)"}
              >
                {(localBucket.backgroundVisible !== undefined ? localBucket.backgroundVisible : !localBucket.hideWalls) ? <Eye size={12} /> : <EyeOff size={12} />}
                <span>{(localBucket.backgroundVisible !== undefined ? localBucket.backgroundVisible : !localBucket.hideWalls) ? 'Background: Visible' : 'Background: Hidden'}</span>
              </button>

              {/* Toggle Physical Tokens Entirely */}
              <button
                type="button"
                className={`tray-toggle-btn ${localBucket.enableTokens !== false ? 'active-amber' : ''}`}
                onClick={() => handleUpdateBucketToggle('enableTokens', localBucket.enableTokens === false)}
                title={localBucket.enableTokens !== false ? "Tokens are enabled in the hopper" : "Tokens are disabled entirely"}
              >
                <Coins size={12} color={localBucket.enableTokens !== false ? '#b45309' : '#7D6B42'} />
                <span>{localBucket.enableTokens !== false ? 'Tokens: Enabled' : 'Tokens: Disabled'}</span>
              </button>

              {/* Toggle Live Boundary Guides */}
              <button
                type="button"
                className={`tray-toggle-btn ${localBucket.showCalibrationGuide ? 'active-amber' : ''}`}
                onClick={() => handleUpdateBucketToggle('showCalibrationGuide', !localBucket.showCalibrationGuide)}
                title="Toggle live amber dashed guide lines on the arena floor"
              >
                <Compass size={12} color={localBucket.showCalibrationGuide ? '#b45309' : '#7D6B42'} />
                <span>{localBucket.showCalibrationGuide ? 'Guides: Visible ON' : 'Show Boundary Guides'}</span>
              </button>

              {/* Reset to Factory Defaults */}
              <button
                type="button"
                className="tray-toggle-btn"
                onClick={() => handleInstantBucketUpdate(DEFAULT_BUCKET_CONFIG)}
                title="Reset bucket margins to factory defaults (290px L/R, 24px floor, 240px height)"
              >
                <RotateCcw size={11} />
                <span>Reset Defaults</span>
              </button>
            </div>
          </div>

          {/* 4 Boundary Sliders Grid with 1080p ref and percentage readouts */}
          <div className="tray-bucket-sliders-grid">
            <div className="tray-slider-card">
              <div className="tray-slider-header">
                <span className="tray-slider-title">Left Edge Margin</span>
                <span className="tray-slider-val mono-val">
                  {localBucket.leftOffset}px <span className="val-pct">({((localBucket.leftOffset / 1920) * 100).toFixed(1)}%)</span>
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={960}
                step={5}
                value={localBucket.leftOffset}
                onChange={(e) => handleSliderChange('leftOffset', Number(e.target.value))}
                onPointerDown={handleSliderStart}
                onPointerUp={handleSliderCommit}
                onTouchStart={handleSliderStart}
                onTouchEnd={handleSliderCommit}
                onKeyUp={handleSliderCommit}
                className="cyber-range"
              />
            </div>

            <div className="tray-slider-card">
              <div className="tray-slider-header">
                <span className="tray-slider-title">Right Edge Margin</span>
                <span className="tray-slider-val mono-val">
                  {localBucket.rightOffset}px <span className="val-pct">({((localBucket.rightOffset / 1920) * 100).toFixed(1)}%)</span>
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={960}
                step={5}
                value={localBucket.rightOffset}
                onChange={(e) => handleSliderChange('rightOffset', Number(e.target.value))}
                onPointerDown={handleSliderStart}
                onPointerUp={handleSliderCommit}
                onTouchStart={handleSliderStart}
                onTouchEnd={handleSliderCommit}
                onKeyUp={handleSliderCommit}
                className="cyber-range"
              />
            </div>

            <div className="tray-slider-card">
              <div className="tray-slider-header">
                <span className="tray-slider-title">Floor Bottom Margin</span>
                <span className="tray-slider-val mono-val">
                  {localBucket.bottomMargin}px <span className="val-pct">({((localBucket.bottomMargin / 1080) * 100).toFixed(1)}%)</span>
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={500}
                step={5}
                value={localBucket.bottomMargin}
                onChange={(e) => handleSliderChange('bottomMargin', Number(e.target.value))}
                onPointerDown={handleSliderStart}
                onPointerUp={handleSliderCommit}
                onTouchStart={handleSliderStart}
                onTouchEnd={handleSliderCommit}
                onKeyUp={handleSliderCommit}
                className="cyber-range"
              />
            </div>

            <div className="tray-slider-card">
              <div className="tray-slider-header">
                <span className="tray-slider-title">Bucket Height</span>
                <span className="tray-slider-val mono-val">
                  {localBucket.height}px <span className="val-pct">({((localBucket.height / 1080) * 100).toFixed(1)}%)</span>
                </span>
              </div>
              <input
                type="range"
                min={100}
                max={1080}
                step={10}
                value={localBucket.height}
                onChange={(e) => handleSliderChange('height', Number(e.target.value))}
                onPointerDown={handleSliderStart}
                onPointerUp={handleSliderCommit}
                onTouchStart={handleSliderStart}
                onTouchEnd={handleSliderCommit}
                onKeyUp={handleSliderCommit}
                className="cyber-range"
              />
            </div>
          </div>

          {/* Alignment Presets Row */}
          <div className="tray-bucket-presets-row">
            <span className="tray-presets-label">Alignment Presets:</span>
            <div className="tray-presets-buttons">
              <button
                type="button"
                className="preset-chip preset-chip-highlight"
                onClick={handleSnapToStage}
                title="Automatically snap bucket to match the visible race track column"
              >
                <Target size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                Snap Track Stage
              </button>
              <button
                type="button"
                className="preset-chip"
                onClick={() => handleApplyBucketPreset({ leftOffset: 290, rightOffset: 290, bottomMargin: 24, height: 240 })}
              >
                📺 Full Track (1080p)
              </button>
              <button
                type="button"
                className="preset-chip"
                onClick={() => handleApplyBucketPreset({ leftOffset: 340, rightOffset: 340, bottomMargin: 60, height: 260 })}
              >
                🌱 Track Dirt Inset
              </button>
              <button
                type="button"
                className="preset-chip"
                onClick={() => handleApplyBucketPreset({ leftOffset: 520, rightOffset: 520, bottomMargin: 30, height: 280 })}
              >
                📦 Center Tray
              </button>
              <button
                type="button"
                className="preset-chip"
                onClick={() => handleApplyBucketPreset({ leftOffset: 850, rightOffset: 300, bottomMargin: 20, height: 260 })}
              >
                📐 Right Half
              </button>
            </div>
          </div>

          {/* Smart Token Pile Density & Combining Governor */}
          <div className="tray-density-section">
            <div className="tray-density-header">
              <div className="tray-density-title-row">
                <Layers size={13} color="#f59e0b" />
                <span className="tray-density-title">🪙 Token Pile Density & Combining Governor</span>
              </div>
              <div className="tray-density-toggles">
                <button
                  type="button"
                  className={`tray-toggle-btn ${bucketConfig.enableAutoCombine !== false ? 'active-amber' : ''}`}
                  onClick={() => handleUpdateBucket('enableAutoCombine', bucketConfig.enableAutoCombine === false)}
                  title="Toggle automatic token fusion on or off"
                >
                  <Zap size={11} color={bucketConfig.enableAutoCombine !== false ? '#b45309' : '#7D6B42'} />
                  <span>{bucketConfig.enableAutoCombine !== false ? 'Auto-Combining: Active ON' : 'Auto-Combining: OFF (Max Coins)'}</span>
                </button>
              </div>
            </div>

            <div className="tray-density-sliders-grid">
              <div className="tray-slider-card">
                <div className="tray-slider-header">
                  <span className="tray-slider-title">Viewer Token Threshold</span>
                  <span className="tray-slider-val mono-val">{bucketConfig.combineThresholdPerUser ?? 40} coins/user</span>
                </div>
                <input
                  type="range"
                  min={3}
                  max={60}
                  step={1}
                  value={bucketConfig.combineThresholdPerUser ?? 40}
                  onChange={(e) => handleUpdateBucket('combineThresholdPerUser', Number(e.target.value))}
                  className="cyber-range"
                  disabled={bucketConfig.enableAutoCombine === false}
                />
                <span className="tray-slider-hint">Tokens only merge after a viewer exceeds this count in the hopper</span>
              </div>

              <div className="tray-slider-card">
                <div className="tray-slider-header">
                  <span className="tray-slider-title">Arena Safety Capacity</span>
                  <span className="tray-slider-val mono-val">{bucketConfig.maxArenaTokens ?? 800} max coins</span>
                </div>
                <input
                  type="range"
                  min={60}
                  max={1200}
                  step={20}
                  value={bucketConfig.maxArenaTokens ?? 800}
                  onChange={(e) => handleUpdateBucket('maxArenaTokens', Number(e.target.value))}
                  className="cyber-range"
                  disabled={bucketConfig.enableAutoCombine === false}
                />
                <span className="tray-slider-hint">GPU-instanced 60 FPS physics ceiling for massive stream drops</span>
              </div>
            </div>

            {/* Density Presets */}
            <div className="tray-bucket-presets-row" style={{ marginTop: '0.2rem' }}>
              <span className="tray-presets-label">Density Presets:</span>
              <div className="tray-presets-buttons">
                <button
                  type="button"
                  className="preset-chip"
                  onClick={() => handleApplyBucketPreset({ combineThresholdPerUser: 50, maxArenaTokens: 800, enableAutoCombine: true })}
                  title="Massive towering mountain heaps with GPU Instancing (up to 800 coins)"
                >
                  🌋 Mountain (50/user • 800 max)
                </button>
                <button
                  type="button"
                  className="preset-chip"
                  onClick={() => handleApplyBucketPreset({ combineThresholdPerUser: 30, maxArenaTokens: 400, enableAutoCombine: true })}
                  title="Lush heaps of coins, ideal for 1-15 viewers"
                >
                  🎆 Lush Piles (30/user • 400 max)
                </button>
                <button
                  type="button"
                  className="preset-chip"
                  onClick={() => handleApplyBucketPreset({ combineThresholdPerUser: 15, maxArenaTokens: 200, enableAutoCombine: true })}
                  title="Balanced pile size and physics performance"
                >
                  ⚖️ Balanced (15/user • 200 max)
                </button>
                <button
                  type="button"
                  className="preset-chip"
                  onClick={() => handleApplyBucketPreset({ combineThresholdPerUser: 8, maxArenaTokens: 100, enableAutoCombine: true })}
                  title="Crisp compact arcade tokens, great for 50+ viewers"
                >
                  ⚡ Compact (8/user • 100 max)
                </button>
                <button
                  type="button"
                  className="preset-chip"
                  onClick={() => handleApplyBucketPreset({ enableAutoCombine: false })}
                  title="Never combine automatically; tokens only fuse when clicking Condense Coins"
                >
                  🛑 Pure Coins (No Auto-Fusion)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: SCREEN LAYOUT & POSITIONAL SETTINGS
          ========================================================================= */}
      {activeTab === 'layout' && (
        <div className="tray-tab-content tray-layout-section">
          <div className="tray-layout-segments-grid">
            {/* Column Order Swap */}
            {layoutConfig && onUpdateLayoutConfig && (
              <div className="control-segment">
                <span className="control-segment-label">
                  <Columns size={13} color="#0284c7" /> Columns Arrangement:
                </span>
                <div className="segmented-button-group">
                  <button
                    type="button"
                    className={`segment-btn ${layoutConfig.columnArrangement === 'default' ? 'active' : ''}`}
                    onClick={() => onUpdateLayoutConfig(p => ({ ...p, columnArrangement: 'default' }))}
                    title="Viewers on Left, Horses on Right"
                  >
                    Viewers Left (Default)
                  </button>
                  <button
                    type="button"
                    className={`segment-btn ${layoutConfig.columnArrangement === 'swapped' ? 'active-amber' : ''}`}
                    onClick={() => onUpdateLayoutConfig(p => ({ ...p, columnArrangement: 'swapped' }))}
                    title="Horses on Left, Viewers on Right"
                  >
                    <ArrowLeftRight size={11} /> Horses Left (Swapped)
                  </button>
                </div>
              </div>
            )}

            {/* Panel Visibility Switches */}
            {layoutConfig && onUpdateLayoutConfig && (
              <div className="control-segment">
                <span className="control-segment-label">
                  <Eye size={13} color="#10b981" /> Visible Panels:
                </span>
                <div className="segmented-button-group">
                  <button
                    type="button"
                    className={`segment-btn ${layoutConfig.showViewersPanel ? 'active' : ''}`}
                    onClick={() => onUpdateLayoutConfig(p => ({ ...p, showViewersPanel: !p.showViewersPanel }))}
                    title="Toggle Viewers & Chat Simulation Panel"
                  >
                    <Users size={11} /> Viewers
                  </button>
                  <button
                    type="button"
                    className={`segment-btn ${layoutConfig.showEntrantsSidebar ? 'active' : ''}`}
                    onClick={() => onUpdateLayoutConfig(p => ({ ...p, showEntrantsSidebar: !p.showEntrantsSidebar }))}
                    title="Toggle Entrants & Horses Sidebar"
                  >
                    🏇 Horses
                  </button>
                  <button
                    type="button"
                    className={`segment-btn ${layoutConfig.showOddsBar ? 'active' : ''}`}
                    onClick={() => onUpdateLayoutConfig(p => ({ ...p, showOddsBar: !p.showOddsBar }))}
                    title="Toggle Center Live Odds Bar"
                  >
                    📊 Odds Bar
                  </button>
                </div>
              </div>
            )}

            {/* Odds Bar Placement: Top vs Bottom */}
            {layoutConfig && onUpdateLayoutConfig && layoutConfig.showOddsBar && (
              <div className="control-segment">
                <span className="control-segment-label">
                  <Layout size={13} color="#f59e0b" /> Odds Bar Position:
                </span>
                <div className="segmented-button-group">
                  <button
                    type="button"
                    className={`segment-btn ${layoutConfig.oddsPlacement === 'top' ? 'active' : ''}`}
                    onClick={() => onUpdateLayoutConfig(p => ({ ...p, oddsPlacement: 'top' }))}
                    title="Place Odds Bar above the race stage"
                  >
                    ⬆️ Top (Above Track)
                  </button>
                  <button
                    type="button"
                    className={`segment-btn ${layoutConfig.oddsPlacement === 'bottom' ? 'active-amber' : ''}`}
                    onClick={() => onUpdateLayoutConfig(p => ({ ...p, oddsPlacement: 'bottom' }))}
                    title="Place Odds Bar below the race stage"
                  >
                    ⬇️ Bottom (Below Track)
                  </button>
                </div>
              </div>
            )}

            {/* UI Display Mode */}
            <div className="control-segment">
              <span className="control-segment-label">
                <Eye size={13} color="#0284c7" /> Display Mode:
              </span>
              <div className="segmented-button-group">
                <button
                  type="button"
                  className={`segment-btn ${uiMode === 'full' ? 'active' : ''}`}
                  onClick={() => onChangeUiMode('full')}
                  title="Full Streamer Management Dashboard"
                >
                  Full UI
                </button>
                <button
                  type="button"
                  className={`segment-btn ${uiMode === 'compact' ? 'active' : ''}`}
                  onClick={() => onChangeUiMode('compact')}
                  title="Compact Mode: Open center window for races with sleek floating tools"
                >
                  Compact Race
                </button>
                <button
                  type="button"
                  className={`segment-btn ${uiMode === 'minimal' ? 'active' : ''}`}
                  onClick={() => onChangeUiMode('minimal')}
                  title="Minimal Corner Mode: Clears almost entire screen, leaves only token pile & odds"
                >
                  Minimal Corner
                </button>
              </div>
            </div>

            {/* Pile Placement Presets */}
            <div className="control-segment">
              <span className="control-segment-label">
                <Layout size={13} color="#fbbf24" /> Pile Position:
              </span>
              <div className="segmented-button-group">
                <button
                  type="button"
                  className={`segment-btn ${pileLayout === 'corner-br' ? 'active' : ''}`}
                  onClick={() => {
                    onChangePileLayout('corner-br');
                    onChangePileOffset({ x: 8, y: 0 });
                  }}
                  title="Bottom Right Corner"
                >
                  ↘️ Corner R
                </button>
                <button
                  type="button"
                  className={`segment-btn ${pileLayout === 'corner-bl' ? 'active' : ''}`}
                  onClick={() => {
                    onChangePileLayout('corner-bl');
                    onChangePileOffset({ x: -8, y: 0 });
                  }}
                  title="Bottom Left Corner"
                >
                  ↙️ Corner L
                </button>
                <button
                  type="button"
                  className={`segment-btn ${pileLayout === 'bottom-center' ? 'active' : ''}`}
                  onClick={() => {
                    onChangePileLayout('bottom-center');
                    onChangePileOffset({ x: 0, y: 0 });
                  }}
                  title="Bottom Center"
                >
                  ⬇️ Center
                </button>
                <button
                  type="button"
                  className={`segment-btn ${pileLayout === 'side-right' ? 'active' : ''}`}
                  onClick={() => {
                    onChangePileLayout('side-right');
                    onChangePileOffset({ x: 10, y: 0 });
                  }}
                  title="Side Wall Profile"
                >
                  ➡️ Side
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: ARENA PHYSICS & 3D CAMERA CONTROLS
          ========================================================================= */}
      {activeTab === 'arena' && (
        <div className="tray-tab-content tray-arena-section">
          <div className="tray-arena-segments-grid">
            {/* Physics Engine (2D vs 3D) */}
            <div className="control-segment">
              <span className="control-segment-label">
                <Layers size={13} color="#38bdf8" /> Physics Mode:
              </span>
              <div className="segmented-button-group">
                <button
                  type="button"
                  className={`segment-btn ${renderEngine === '2d' ? 'active' : ''}`}
                  onClick={() => onToggleRenderEngine('2d')}
                  title="Fast 2D Sprite Arcade Physics (Matter.js) - zero lag, corner hopper"
                >
                  <Sparkles size={11} /> 2D Sprites
                </button>
                <button
                  type="button"
                  className={`segment-btn ${renderEngine === '3d' ? 'active' : ''}`}
                  onClick={() => onToggleRenderEngine('3d')}
                  title="3D Voxel Token Arena (Three.js & Rapier 3D)"
                >
                  <Box size={11} /> 3D Voxels
                </button>
              </div>
            </div>

            {/* 3D Camera Angles (only when 3D active) */}
            {renderEngine === '3d' && (
              <div className="control-segment">
                <span className="control-segment-label">
                  <Camera size={13} color="#a855f7" /> 3D Cam:
                </span>
                <div className="segmented-button-group">
                  <button
                    type="button"
                    className={`segment-btn ${cameraAngle === 'perspective' ? 'active' : ''}`}
                    onClick={() => onChangeCameraAngle('perspective')}
                    title="Isometric Perspective View"
                  >
                    Perspective
                  </button>
                  <button
                    type="button"
                    className={`segment-btn ${cameraAngle === 'side-profile' ? 'active' : ''}`}
                    onClick={() => onChangeCameraAngle('side-profile')}
                    title="Side Profile View (look at pile from side)"
                  >
                    Side View
                  </button>
                  <button
                    type="button"
                    className={`segment-btn ${cameraAngle === 'top-down' ? 'active' : ''}`}
                    onClick={() => onChangeCameraAngle('top-down')}
                    title="Top Down Birds Eye"
                  >
                    Top Down
                  </button>
                  <button
                    type="button"
                    className={`segment-btn ${cameraAngle === 'corner-isometric' ? 'active' : ''}`}
                    onClick={() => onChangeCameraAngle('corner-isometric')}
                    title="Corner Angle"
                  >
                    Corner
                  </button>
                </div>
              </div>
            )}

            {/* Manual Fine-Tune Sliders */}
            <div className="control-segment">
              <span className="control-segment-label">
                <Sliders size={13} color="#f59e0b" /> Arena Pile Offset:
              </span>
              <div className="control-segment-sliders">
                <div className="slider-pack">
                  <span className="slider-pack-label">Arena X: {pileOffset.x.toFixed(1)}</span>
                  <input
                    type="range" min="-12" max="12" step="0.5"
                    value={pileOffset.x}
                    onChange={e => onChangePileOffset({ ...pileOffset, x: parseFloat(e.target.value) })}
                    className="cyber-range-mini"
                  />
                </div>

                <div className="slider-pack">
                  <span className="slider-pack-label">Arena Z: {pileOffset.y.toFixed(1)}</span>
                  <input
                    type="range" min="-12" max="12" step="0.5"
                    value={pileOffset.y}
                    onChange={e => onChangePileOffset({ ...pileOffset, y: parseFloat(e.target.value) })}
                    className="cyber-range-mini"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: COLORS & THEME CUSTOMIZATION
          ========================================================================= */}
      {activeTab === 'theme' && themeConfig && onUpdateThemeConfig && (
        <div className="tray-tab-content tray-theme-section">
          <ThemeColorControls
            themeConfig={themeConfig}
            onChangeThemeConfig={onUpdateThemeConfig}
            compact={true}
          />
        </div>
      )}
    </div>
  );
};
