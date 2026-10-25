import React, { useState, useEffect, useRef } from 'react';
import { Palette, RotateCcw, Droplets, Sparkles, Plus, Check, Trash2 } from 'lucide-react';
import type { ThemeCustomizationConfig, ThemePreset } from '../types/betting';
import { DEFAULT_THEME_CONFIG, storageService } from '../services/storageService';
import { soundEffects } from '../services/soundEffects';

interface ThemeColorControlsProps {
  themeConfig: ThemeCustomizationConfig;
  onChangeThemeConfig: (updater: ThemeCustomizationConfig | ((prev: ThemeCustomizationConfig) => ThemeCustomizationConfig)) => void;
  compact?: boolean;
}

const GREEN_QUICK_SWATCHES = [
  { name: 'Turf', hex: '#3cae02' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Sky Cyan', hex: '#0284c7' },
  { name: 'Violet', hex: '#8b5cf6' },
  { name: 'Hot Pink', hex: '#ec4899' },
];

const YELLOW_QUICK_SWATCHES = [
  { name: 'Burnished Gold', hex: '#d97706' },
  { name: 'Bright Amber', hex: '#f59e0b' },
  { name: 'Sunset Orange', hex: '#f97316' },
  { name: 'Ruby Crimson', hex: '#ef4444' },
];

const TEXT_QUICK_SWATCHES = [
  { name: 'Espresso', hex: '#5A4A28' },
  { name: 'Slate Gray', hex: '#1e293b' },
  { name: 'Pure Obsidian', hex: '#0f172a' },
  { name: 'Crisp White', hex: '#f8fafc' },
];

export const ThemeColorControls: React.FC<ThemeColorControlsProps> = ({
  themeConfig,
  onChangeThemeConfig,
  compact = false
}) => {
  const [localConfig, setLocalConfig] = useState<ThemeCustomizationConfig>(themeConfig);
  const [presets, setPresets] = useState<ThemePreset[]>(() => storageService.getAllThemePresets());
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetIcon, setNewPresetIcon] = useState('🎨');
  const rafIdRef = useRef<number | null>(null);
  const latestConfigRef = useRef<ThemeCustomizationConfig>(themeConfig);

  const handleSavePreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;

    const newPreset: ThemePreset = {
      id: `custom_theme_${Date.now()}`,
      name: newPresetName.trim(),
      icon: newPresetIcon.trim() || '🎨',
      previewBg: `hsl(${localConfig.baseHue}, ${localConfig.baseSaturation}%, ${localConfig.baseLightness}%)`,
      config: { ...localConfig },
      isCustom: true,
    };

    storageService.saveCustomThemePreset(newPreset);
    setPresets(storageService.getAllThemePresets());
    setNewPresetName('');
    setIsSavingPreset(false);
    soundEffects.playCashout();
  };

  const handleDeletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    storageService.deleteCustomThemePreset(id);
    setPresets(storageService.getAllThemePresets());
    soundEffects.playTokenClink();
  };

  // Sync with incoming prop changes (such as from outside reset or preset load)
  useEffect(() => {
    setLocalConfig(themeConfig);
    latestConfigRef.current = themeConfig;
  }, [themeConfig]);

  // Clean up any pending RAF on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  const updateField = <K extends keyof ThemeCustomizationConfig>(field: K, val: ThemeCustomizationConfig[K]) => {
    const next = { ...latestConfigRef.current, [field]: val };
    latestConfigRef.current = next;
    setLocalConfig(next);

    // Apply CSS variables immediately to document root for real-time fluid preview
    storageService.applyThemeToDocument(next);

    // Throttle React state update in parent (App) using requestAnimationFrame to eliminate render thrashing
    if (!rafIdRef.current) {
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        onChangeThemeConfig(latestConfigRef.current);
      });
    }
  };

  const applyPreset = (preset: ThemePreset) => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    latestConfigRef.current = preset.config;
    setLocalConfig(preset.config);
    storageService.applyThemeToDocument(preset.config);
    onChangeThemeConfig(preset.config);
  };

  const handleResetDefaults = () => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    latestConfigRef.current = DEFAULT_THEME_CONFIG;
    setLocalConfig(DEFAULT_THEME_CONFIG);
    storageService.applyThemeToDocument(DEFAULT_THEME_CONFIG);
    onChangeThemeConfig(DEFAULT_THEME_CONFIG);
  };

  return (
    <div className={`theme-controls-container ${compact ? 'compact-theme' : ''}`}>
      {/* COLUMN 1: Base Tonal Recolor & Geometry Foundations */}
      <div className="theme-controls-col">
        {/* HSL Full App Recolor Sliders */}
        <div className="theme-section-block">
          <div className="theme-section-header">
            <div className="theme-section-title-wrap">
              <Palette size={14} color="#0284c7" />
              <span className="theme-section-title">Base Theme HSL Recolor (Tints All Panels)</span>
            </div>
            <span className="theme-section-subtitle">Hue shift changes the app background and card undertones</span>
          </div>

          <div className="theme-sliders-3col">
            {/* Hue Rainbow Slider */}
            <div className="theme-slider-card">
              <div className="theme-slider-header">
                <span className="slider-label">Base Color Hue</span>
                <span className="slider-val mono-val">{localConfig.baseHue}°</span>
              </div>
              <input
                type="range"
                min={0}
                max={360}
                step={2}
                value={localConfig.baseHue}
                onChange={(e) => updateField('baseHue', Number(e.target.value))}
                className="cyber-range rainbow-track"
                title="Drag to shift base theme hue across the entire spectrum"
              />
            </div>

            {/* Saturation Slider */}
            <div className="theme-slider-card">
              <div className="theme-slider-header">
                <span className="slider-label">Saturation</span>
                <span className="slider-val mono-val">{localConfig.baseSaturation}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={2}
                value={localConfig.baseSaturation}
                onChange={(e) => updateField('baseSaturation', Number(e.target.value))}
                className="cyber-range"
                title="0% is pure monochrome/neutral gray, 100% is high saturation"
              />
            </div>

            {/* Lightness Slider */}
            <div className="theme-slider-card">
              <div className="theme-slider-header">
                <span className="slider-label">Lightness</span>
                <span className="slider-val mono-val">
                  {localConfig.baseLightness}% {localConfig.baseLightness < 45 ? '(Dark)' : '(Light)'}
                </span>
              </div>
              <input
                type="range"
                min={10}
                max={98}
                step={2}
                value={localConfig.baseLightness}
                onChange={(e) => updateField('baseLightness', Number(e.target.value))}
                className="cyber-range"
                title="Slide right for ultra-bright white, or slide left for sleek dark mode"
              />
            </div>
          </div>
        </div>

        {/* Transparency & Sharp/Rounded Corners */}
        <div className="theme-section-block">
          <div className="theme-section-header">
            <div className="theme-section-title-wrap">
              <Droplets size={14} color="#0284c7" />
              <span className="theme-section-title">Surface Transparency & Corner Shape</span>
            </div>
            <span className="theme-section-subtitle">Adjust overlay visibility and card border curvature</span>
          </div>

          <div className="theme-sliders-2col">
            {/* General Transparency Slider */}
            <div className="theme-slider-card">
              <div className="theme-slider-header">
                <span className="slider-label">Panel Transparency</span>
                <span className="slider-val mono-val">
                  {Math.round(localConfig.surfaceOpacity * 100)}% {localConfig.surfaceOpacity < 1.0 ? '(OBS Glass)' : '(Solid)'}
                </span>
              </div>
              <input
                type="range"
                min={0.25}
                max={1.0}
                step={0.05}
                value={localConfig.surfaceOpacity}
                onChange={(e) => updateField('surfaceOpacity', Number(e.target.value))}
                className="cyber-range"
                title="Lower opacity creates translucent glass panels for broadcast stream overlays"
              />
            </div>

            {/* Sharp vs Rounded Corners Slider */}
            <div className="theme-slider-card">
              <div className="theme-slider-header">
                <span className="slider-label">Sharp / Rounded Corners</span>
                <span className="slider-val mono-val">
                  {localConfig.borderRadius}px {localConfig.borderRadius === 0 ? '(Sharp Retro)' : localConfig.borderRadius >= 20 ? '(Pill Round)' : ''}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={24}
                step={1}
                value={localConfig.borderRadius}
                onChange={(e) => updateField('borderRadius', Number(e.target.value))}
                className="cyber-range"
                title="0px is crisp 90s retro sharp, 24px is ultra-round pill style"
              />
            </div>
          </div>
        </div>
      </div>

      {/* COLUMN 2: Color Presets & Accents */}
      <div className="theme-controls-col">
        {/* Light Color Presets Gallery */}
        <div className="theme-section-block">
          <div className="theme-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="theme-section-title-wrap">
              <Sparkles size={14} color="#d97706" />
              <span className="theme-section-title">Color Presets (Gallery)</span>
            </div>
            {!isSavingPreset ? (
              <button
                type="button"
                className="cyber-btn-ghost mini-btn"
                onClick={() => setIsSavingPreset(true)}
                title="Save current theme as custom preset"
                style={{ padding: '0.15rem 0.5rem', fontSize: '0.72rem', height: 'auto', display: 'flex', alignItems: 'center', gap: '3px' }}
              >
                <Plus size={11} />
                <span>Save Theme</span>
              </button>
            ) : null}
          </div>

          {/* Inline Preset Creator Form */}
          {isSavingPreset && (
            <form onSubmit={handleSavePreset} className="save-theme-preset-form" style={{ marginBottom: '0.6rem', padding: '0.5rem', background: 'var(--well-bg, rgba(0,0,0,0.06))', borderRadius: '6px', border: '1px solid var(--accent-gold, #d97706)' }}>
              <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', width: '100%' }}>
                <input
                  type="text"
                  value={newPresetIcon}
                  onChange={(e) => setNewPresetIcon(e.target.value)}
                  className="cyber-input-mini"
                  style={{ width: '38px', textAlign: 'center', fontSize: '1rem', padding: '0.2rem' }}
                  title="Emoji / Icon for preset"
                  placeholder="🎨"
                  maxLength={4}
                />
                <input
                  type="text"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  className="cyber-input-mini"
                  style={{ flex: 1, fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                  placeholder="Theme Preset Name..."
                  autoFocus
                />
                <button type="submit" className="cyber-btn-primary mini-btn" title="Confirm Save Preset" disabled={!newPresetName.trim()} style={{ padding: '0.25rem 0.5rem' }}>
                  <Check size={11} />
                </button>
                <button type="button" className="cyber-btn-ghost mini-btn" onClick={() => setIsSavingPreset(false)} title="Cancel" style={{ padding: '0.25rem 0.4rem' }}>
                  ✕
                </button>
              </div>
              <div className="quick-emoji-picks" style={{ display: 'flex', gap: '0.35rem', marginTop: '0.35rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted, #8E7D53)' }}>Icon:</span>
                {['🎨', '🏇', '🌟', '🍀', '☕', '⚡', '💎', '🌸', '🌌'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setNewPresetIcon(emoji)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.88rem',
                      padding: '1px 3px',
                      opacity: newPresetIcon === emoji ? 1 : 0.6,
                      transform: newPresetIcon === emoji ? 'scale(1.2)' : 'none',
                      transition: 'transform 0.1s ease',
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </form>
          )}

          <div className="theme-presets-scroll-grid">
            {presets.map((preset) => {
              const isSelected =
                Math.abs(localConfig.baseHue - preset.config.baseHue) <= 5 &&
                localConfig.greenAccent.toLowerCase() === preset.config.greenAccent.toLowerCase();

              return (
                <div
                  key={preset.id}
                  className={`theme-preset-card ${isSelected ? 'active-preset' : ''}`}
                  onClick={() => applyPreset(preset)}
                  title={`Apply ${preset.name} theme`}
                  style={{ position: 'relative' }}
                >
                  <div
                    className="preset-preview-swatch"
                    style={{
                      backgroundColor: preset.previewBg,
                      borderLeft: `4px solid ${preset.config.greenAccent}`,
                      borderRight: `4px solid ${preset.config.yellowAccent}`
                    }}
                  >
                    <span className="preset-icon">{preset.icon}</span>
                  </div>
                  <span className="preset-name" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{preset.name}</span>
                  {preset.isCustom && (
                    <button
                      type="button"
                      className="preset-del-btn"
                      onClick={(e) => handleDeletePreset(preset.id, e)}
                      title={`Delete "${preset.name}" preset`}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0.7,
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.7'; }}
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* The 3 Key Accent & Typography Controls */}
        <div className="theme-section-block">
          <div className="theme-section-header">
            <div className="theme-section-title-wrap">
              <Palette size={14} color="#16a34a" />
              <span className="theme-section-title">Accent Colors & Typography</span>
            </div>
            <span className="theme-section-subtitle">Pick custom colors or select quick swatches</span>
          </div>

          <div className="theme-accents-grid">
            {/* Green Accent */}
            <div className="accent-picker-card">
              <div className="accent-card-header">
                <span className="accent-card-label">Green Accents</span>
                <div className="accent-swatch-picker-wrap">
                  <input
                    type="color"
                    value={localConfig.greenAccent}
                    onChange={(e) => updateField('greenAccent', e.target.value)}
                    className="native-color-picker"
                    title="Pick custom accent color"
                  />
                  <span className="accent-hex-tag mono-val">{localConfig.greenAccent.toUpperCase()}</span>
                </div>
              </div>
              <div className="quick-swatches-row">
                {GREEN_QUICK_SWATCHES.map((swatch) => (
                  <button
                    key={swatch.hex}
                    type="button"
                    className={`color-dot-btn ${localConfig.greenAccent.toLowerCase() === swatch.hex.toLowerCase() ? 'active' : ''}`}
                    style={{ backgroundColor: swatch.hex }}
                    onClick={() => updateField('greenAccent', swatch.hex)}
                    title={swatch.name}
                  />
                ))}
              </div>
            </div>

            {/* Yellow / Amber Accent */}
            <div className="accent-picker-card">
              <div className="accent-card-header">
                <span className="accent-card-label">Gold Accents</span>
                <div className="accent-swatch-picker-wrap">
                  <input
                    type="color"
                    value={localConfig.yellowAccent}
                    onChange={(e) => updateField('yellowAccent', e.target.value)}
                    className="native-color-picker"
                    title="Pick custom gold / amber accent color"
                  />
                  <span className="accent-hex-tag mono-val">{localConfig.yellowAccent.toUpperCase()}</span>
                </div>
              </div>
              <div className="quick-swatches-row">
                {YELLOW_QUICK_SWATCHES.map((swatch) => (
                  <button
                    key={swatch.hex}
                    type="button"
                    className={`color-dot-btn ${localConfig.yellowAccent.toLowerCase() === swatch.hex.toLowerCase() ? 'active' : ''}`}
                    style={{ backgroundColor: swatch.hex }}
                    onClick={() => updateField('yellowAccent', swatch.hex)}
                    title={swatch.name}
                  />
                ))}
              </div>
            </div>

            {/* Text Color */}
            <div className="accent-picker-card">
              <div className="accent-card-header">
                <span className="accent-card-label">Text & Headings</span>
                <div className="accent-swatch-picker-wrap">
                  <input
                    type="color"
                    value={localConfig.textColor}
                    onChange={(e) => updateField('textColor', e.target.value)}
                    className="native-color-picker"
                    title="Pick custom text color"
                  />
                  <span className="accent-hex-tag mono-val">{localConfig.textColor.toUpperCase()}</span>
                </div>
              </div>
              <div className="quick-swatches-row">
                {TEXT_QUICK_SWATCHES.map((swatch) => (
                  <button
                    key={swatch.hex}
                    type="button"
                    className={`color-dot-btn ${localConfig.textColor.toLowerCase() === swatch.hex.toLowerCase() ? 'active' : ''}`}
                    style={{ backgroundColor: swatch.hex }}
                    onClick={() => updateField('textColor', swatch.hex)}
                    title={swatch.name}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER: Reset */}
      <div className="theme-footer-row">
        <button
          type="button"
          className="cyber-btn-ghost mini-btn"
          onClick={handleResetDefaults}
          title="Reset theme and colors to default styling"
        >
          <RotateCcw size={12} />
          <span>Reset to Defaults</span>
        </button>
      </div>
    </div>
  );
};
