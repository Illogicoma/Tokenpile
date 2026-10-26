import {
  Sliders,
  Eye,
  EyeOff,
  RotateCcw,
  X,
  Compass,
  Zap,
  Target,
  Layers,
  RefreshCw,
  Coins
} from 'lucide-react';
import type { BucketConfig } from '../types/betting';
import { DEFAULT_BUCKET_CONFIG } from '../services/storageService';

interface BucketCalibrationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  config: BucketConfig;
  onChangeConfig: (newConfig: BucketConfig) => void;
  onCondensePile?: () => void;
  onJostleTokens?: () => void;
}

export const BucketCalibrationDrawer = ({
  isOpen,
  onClose,
  config,
  onChangeConfig,
  onCondensePile,
  onJostleTokens
}: BucketCalibrationDrawerProps) => {
  if (!isOpen) return null;

  const handleUpdate = (field: keyof BucketConfig, value: number | boolean) => {
    onChangeConfig({
      ...config,
      [field]: value
    });
  };

  const handleApplyPreset = (preset: Partial<BucketConfig>) => {
    onChangeConfig({
      ...config,
      ...preset
    });
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
      onChangeConfig({
        ...config,
        leftOffset: leftRef,
        rightOffset: rightRef,
        bottomMargin: bottomRef,
        height: heightRef,
      });
    } else {
      handleApplyPreset({ leftOffset: 340, rightOffset: 340, bottomMargin: 24, height: 240 });
    }
  };

  const scalePct = Math.round((window.innerWidth / 1920) * 100);

  return (
    <div className="bucket-calibration-floating cosmos-panel">
      <div className="calibration-header">
        <div className="calibration-title-row">
          <Sliders size={16} color="#fbbf24" />
          <h3 className="calibration-title">Token Bucket Alignment & Calibration</h3>
        </div>
        <button className="calibration-close-btn" onClick={onClose} title="Close calibration">
          <X size={15} />
        </button>
      </div>

      <div className="calibration-resolution-badge">
        <span>📺 1080p Reference Broadcast Canvas • Current: {window.innerWidth}×{window.innerHeight} ({scalePct}% scale)</span>
      </div>

      <p className="calibration-description">
        Position the bucket boundaries over your broadcast race visual. Automatically scaled for OBS and your monitor.
      </p>

      {/* Main Alignment Sliders */}
      <div className="calibration-controls-grid">
        {/* Left Edge Offset */}
        <div className="calibration-field">
          <div className="field-label-row">
            <span className="field-label">Left Edge Margin:</span>
            <span className="field-val mono-val">
              {config.leftOffset}px <span className="val-pct">({((config.leftOffset / 1920) * 100).toFixed(1)}%)</span>
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={960}
            step={5}
            value={config.leftOffset}
            onChange={(e) => handleUpdate('leftOffset', Number(e.target.value))}
            className="cyber-range"
          />
        </div>

        {/* Right Edge Offset */}
        <div className="calibration-field">
          <div className="field-label-row">
            <span className="field-label">Right Edge Margin:</span>
            <span className="field-val mono-val">
              {config.rightOffset}px <span className="val-pct">({((config.rightOffset / 1920) * 100).toFixed(1)}%)</span>
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={960}
            step={5}
            value={config.rightOffset}
            onChange={(e) => handleUpdate('rightOffset', Number(e.target.value))}
            className="cyber-range"
          />
        </div>

        {/* Bottom / Floor Margin */}
        <div className="calibration-field">
          <div className="field-label-row">
            <span className="field-label">Floor Bottom Margin:</span>
            <span className="field-val mono-val">
              {config.bottomMargin}px <span className="val-pct">({((config.bottomMargin / 1080) * 100).toFixed(1)}%)</span>
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={500}
            step={5}
            value={config.bottomMargin}
            onChange={(e) => handleUpdate('bottomMargin', Number(e.target.value))}
            className="cyber-range"
          />
        </div>

        {/* Bucket Height */}
        <div className="calibration-field">
          <div className="field-label-row">
            <span className="field-label">Bucket Height:</span>
            <span className="field-val mono-val">
              {config.height}px <span className="val-pct">({((config.height / 1080) * 100).toFixed(1)}%)</span>
            </span>
          </div>
          <input
            type="range"
            min={100}
            max={1080}
            step={10}
            value={config.height}
            onChange={(e) => handleUpdate('height', Number(e.target.value))}
            className="cyber-range"
          />
        </div>
      </div>

      {/* Toggles Row */}
      <div className="calibration-toggles-row">
        {/* Snap to Track Stage Button */}
        <button
          className="cyber-toggle-btn active-amber stage-snap-btn"
          onClick={handleSnapToStage}
          title="Automatically snap bucket boundaries to fit the visible center race track stage"
        >
          <Target size={14} color="#b45309" />
          <span>Snap Track Stage</span>
        </button>

        {/* Background Visible Toggle */}
        <button
          className={`cyber-toggle-btn ${(config.backgroundVisible !== undefined ? config.backgroundVisible : !config.hideWalls) ? 'active' : ''}`}
          onClick={() => {
            const current = config.backgroundVisible !== undefined ? config.backgroundVisible : !config.hideWalls;
            handleUpdate('backgroundVisible', !current);
            handleUpdate('hideWalls', current);
          }}
          title={(config.backgroundVisible !== undefined ? config.backgroundVisible : !config.hideWalls) ? "Hopper panel background is visible using theme styling" : "Hopper panel background is hidden"}
        >
          {(config.backgroundVisible !== undefined ? config.backgroundVisible : !config.hideWalls) ? <Eye size={14} color="#38bdf8" /> : <EyeOff size={14} />}
          <span>{(config.backgroundVisible !== undefined ? config.backgroundVisible : !config.hideWalls) ? 'Background: Visible' : 'Background: Hidden'}</span>
        </button>

        {/* Tokens Enabled Toggle */}
        <button
          className={`cyber-toggle-btn ${config.enableTokens !== false ? 'active-amber' : ''}`}
          onClick={() => handleUpdate('enableTokens', config.enableTokens === false)}
          title={config.enableTokens !== false ? "Tokens are enabled in the hopper" : "Tokens are disabled entirely"}
        >
          <Coins size={14} color={config.enableTokens !== false ? '#fbbf24' : '#94a3b8'} />
          <span>{config.enableTokens !== false ? 'Tokens: Enabled' : 'Tokens: Disabled'}</span>
        </button>

        {/* Show Guides Toggle */}
        <button
          className={`cyber-toggle-btn ${config.showCalibrationGuide ? 'active-amber' : ''}`}
          onClick={() => handleUpdate('showCalibrationGuide', !config.showCalibrationGuide)}
        >
          <Compass size={14} color={config.showCalibrationGuide ? '#fbbf24' : '#94a3b8'} />
          <span>{config.showCalibrationGuide ? 'Boundary Guides: ON' : 'Show Guides'}</span>
        </button>
      </div>

      {/* Quick Boundary Presets */}
      <div className="calibration-presets-section">
        <span className="calibration-presets-label">Alignment Presets:</span>
        <div className="calibration-presets-buttons">
          <button
            className="preset-chip preset-chip-highlight"
            onClick={handleSnapToStage}
          >
            <Target size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
            Snap Track Stage
          </button>
          <button
            className="preset-chip"
            onClick={() => handleApplyPreset({ leftOffset: 290, rightOffset: 290, bottomMargin: 24, height: 240 })}
          >
            📺 Full Track (1080p)
          </button>
          <button
            className="preset-chip"
            onClick={() => handleApplyPreset({ leftOffset: 340, rightOffset: 340, bottomMargin: 60, height: 260 })}
          >
            🌱 Track Dirt Inset
          </button>
          <button
            className="preset-chip"
            onClick={() => handleApplyPreset({ leftOffset: 520, rightOffset: 520, bottomMargin: 30, height: 280 })}
          >
            📦 Center Tray
          </button>
          <button
            className="preset-chip"
            onClick={() => handleApplyPreset({ leftOffset: 850, rightOffset: 300, bottomMargin: 20, height: 260 })}
          >
            📐 Right Half
          </button>
        </div>
      </div>

      {/* Token Density & Combining Governor Section */}
      <div className="calibration-density-section">
        <div className="calibration-density-header">
          <div className="tray-density-title-row">
            <Layers size={14} color="#f59e0b" />
            <span className="tray-density-title">🪙 Token Pile Density & Combining Governor</span>
          </div>
          <button
            type="button"
            className={`cyber-toggle-btn ${config.enableAutoCombine !== false ? 'active-amber' : ''}`}
            onClick={() => handleUpdate('enableAutoCombine', config.enableAutoCombine === false)}
            style={{ padding: '0.25rem 0.65rem', fontSize: '0.72rem' }}
          >
            <Zap size={12} color={config.enableAutoCombine !== false ? '#b45309' : '#94a3b8'} />
            <span>{config.enableAutoCombine !== false ? 'Auto-Combining: ON' : 'Auto-Combining: OFF'}</span>
          </button>
        </div>

        <div className="calibration-controls-grid">
          <div className="calibration-field">
            <div className="field-label-row">
              <span className="field-label">Viewer Token Threshold:</span>
              <span className="field-val mono-val">{config.combineThresholdPerUser ?? 40} coins/user</span>
            </div>
            <input
              type="range"
              min={3}
              max={60}
              step={1}
              value={config.combineThresholdPerUser ?? 40}
              onChange={(e) => handleUpdate('combineThresholdPerUser', Number(e.target.value))}
              className="cyber-range"
              disabled={config.enableAutoCombine === false}
            />
          </div>

          <div className="calibration-field">
            <div className="field-label-row">
              <span className="field-label">Arena Safety Capacity:</span>
              <span className="field-val mono-val">{config.maxArenaTokens ?? 800} max coins</span>
            </div>
            <input
              type="range"
              min={60}
              max={1200}
              step={20}
              value={config.maxArenaTokens ?? 800}
              onChange={(e) => handleUpdate('maxArenaTokens', Number(e.target.value))}
              className="cyber-range"
              disabled={config.enableAutoCombine === false}
            />
          </div>
        </div>

        <div className="calibration-presets-section" style={{ marginTop: '0.35rem' }}>
          <span className="calibration-presets-label">Density Presets:</span>
          <div className="calibration-presets-buttons">
            <button
              className="preset-chip"
              onClick={() => handleApplyPreset({ combineThresholdPerUser: 50, maxArenaTokens: 800, enableAutoCombine: true })}
            >
              🌋 Mountain (50/user • 800 max)
            </button>
            <button
              className="preset-chip"
              onClick={() => handleApplyPreset({ combineThresholdPerUser: 30, maxArenaTokens: 400, enableAutoCombine: true })}
            >
              🎆 Lush Piles (30/user • 400 max)
            </button>
            <button
              className="preset-chip"
              onClick={() => handleApplyPreset({ combineThresholdPerUser: 15, maxArenaTokens: 200, enableAutoCombine: true })}
            >
              ⚖️ Balanced (15/user • 200 max)
            </button>
            <button
              className="preset-chip"
              onClick={() => handleApplyPreset({ combineThresholdPerUser: 8, maxArenaTokens: 100, enableAutoCombine: true })}
            >
              ⚡ Compact (8/user • 100 max)
            </button>
            <button
              className="preset-chip"
              onClick={() => handleApplyPreset({ enableAutoCombine: false })}
            >
              🛑 Pure Coins (No Fusion)
            </button>
          </div>
        </div>
      </div>

      {/* Footer Reset */}
      <div className="calibration-footer">
        <button
          className="cyber-btn-ghost mini-btn"
          onClick={() => onChangeConfig(DEFAULT_BUCKET_CONFIG)}
          title="Reset bucket alignment to defaults"
        >
          <RotateCcw size={12} /> Reset to Defaults
        </button>
        {onCondensePile && (
          <button
            className="cyber-btn-warning mini-btn"
            style={{ background: 'var(--accent-gold-grad)', borderColor: 'var(--accent-gold)', borderBottomColor: 'var(--accent-gold-dark)', color: '#78350f', fontWeight: 700 }}
            onClick={onCondensePile}
            title="Instantly condense all loose tokens in the bucket into compact high-tier coins per viewer"
          >
            <Zap size={12} /> Condense Pile
          </button>
        )}
        {onJostleTokens && (
          <button
            className="cyber-btn-ghost mini-btn"
            onClick={onJostleTokens}
            title="Trip physics switch & rejostle resting tokens in the hopper"
          >
            <RefreshCw size={12} color="#059669" /> Jostle Tokens
          </button>
        )}
        <button
          className="cyber-btn-primary mini-btn"
          onClick={onClose}
        >
          Done
        </button>
      </div>
    </div>
  );
};
