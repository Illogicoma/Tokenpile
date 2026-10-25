import React, { useState, useEffect } from 'react';
import { X, Trash2, Check, Sparkles, UserPlus, ListPlus } from 'lucide-react';
import type { BetOutcome, OddsMode } from '../types/betting';
import { soundEffects } from '../services/soundEffects';
import { IconPicker } from './IconPicker';
import { IconDisplay } from './IconDisplay';

export interface HorseEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  horse: BetOutcome | null; // null when adding new
  nextNumber: number;
  currentHorseCount?: number;
  onSave: (horseData: { id?: string; name: string; number: number; color: string; icon: string; manualOdds?: number; odds?: number }) => void;
  onDelete?: (horseId: string) => void;
  onBulkImport?: (names: string[], mode: 'replace' | 'append') => void;
  initialMode?: 'single' | 'bulk';
  entrantLabel?: string;
  defaultIcon?: string;
  oddsMode?: OddsMode;
  onToggleOddsMode?: (mode: OddsMode) => void;
}

const PRESET_COLORS = [
  '#ef4444', // Red / Crimson
  '#f97316', // Orange
  '#eab308', // Amber Gold
  '#10b981', // Emerald
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#3b82f6', // Royal Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Hot Pink
  '#f43f5e', // Rose
  '#94a3b8', // Silver
  '#e2e8f0', // Platinum
  '#334155', // Charcoal
];

const isLightColor = (hexColor: string): boolean => {
  const hex = hexColor.replace('#', '');
  if (hex.length < 6) return false;
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 155;
};

export const HorseEditorModal: React.FC<HorseEditorModalProps> = ({
  isOpen,
  onClose,
  horse,
  nextNumber,
  currentHorseCount = 0,
  onSave,
  onDelete,
  onBulkImport,
  initialMode = 'single',
  entrantLabel = 'Entrant',
  defaultIcon = '🏇',
  oddsMode = 'auto',
  onToggleOddsMode
}) => {
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>(horse ? 'single' : initialMode);

  // Single Horse Form State
  const [name, setName] = useState(horse?.name || '');
  const [number, setNumber] = useState(horse?.number ?? nextNumber);
  const [color, setColor] = useState(
    horse?.color || PRESET_COLORS[(nextNumber - 1) % PRESET_COLORS.length]
  );
  const [icon, setIcon] = useState(horse?.icon || defaultIcon);
  const [manualOdds, setManualOdds] = useState<number>(horse?.manualOdds || horse?.odds || 2.0);

  // Bulk Paste State
  const [bulkInput, setBulkInput] = useState('');
  const [bulkMode, setBulkMode] = useState<'replace' | 'append'>('replace');

  // Sync state when props change
  useEffect(() => {
    if (horse) {
      setName(horse.name);
      setNumber(horse.number);
      setColor(horse.color);
      setIcon(horse.icon);
      setManualOdds(horse.manualOdds ?? horse.odds ?? 2.0);
      setActiveTab('single');
    } else {
      setName('');
      setNumber(nextNumber);
      setColor(PRESET_COLORS[(nextNumber - 1) % PRESET_COLORS.length]);
      setIcon(defaultIcon || '🏇');
      setManualOdds(2.0);
      setActiveTab(initialMode);
    }
  }, [horse, nextNumber, initialMode, isOpen, defaultIcon]);

  if (!isOpen) return null;

  const isEditing = Boolean(horse);

  const handleSingleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) return;

    onSave({
      id: horse?.id,
      name: name.trim(),
      number: Number(number) || nextNumber,
      color,
      icon: icon || defaultIcon || '🏇',
      manualOdds,
      odds: manualOdds,
    });

    soundEffects.playTokenClink();
    onClose();
  };

  const handleBulkSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const lines = bulkInput
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    if (lines.length === 0) return;

    if (onBulkImport) {
      onBulkImport(lines, bulkMode);
    }

    soundEffects.playTokenClink();
    onClose();
  };

  const handleDelete = () => {
    if (horse && onDelete) {
      onDelete(horse.id);
      soundEffects.playTokenClink();
      onClose();
    }
  };

  const detectedLinesCount = bulkInput
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0).length;

  return (
    <div
      className="horse-editor-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="horse-editor-modal cosmos-panel">
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.25rem' }}>{defaultIcon}</span>
            <div>
              <h3 className="modal-title">
                {isEditing ? `Edit ${entrantLabel} #${horse?.number}` : `Add ${entrantLabel}s`}
              </h3>
              <p className="modal-subtitle">
                {isEditing
                  ? `Customize name, color, and icon for #${horse?.number}`
                  : `Add an individual ${entrantLabel.toLowerCase()} or bulk paste a list of names`}
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} title="Close window">
            <X size={18} />
          </button>
        </div>

        {/* Tab Selector (When creating new entrants) */}
        {!isEditing && (
          <div className="horse-modal-tab-group">
            <button
              type="button"
              className={`horse-modal-tab-btn ${activeTab === 'single' ? 'active' : ''}`}
              onClick={() => setActiveTab('single')}
            >
              <UserPlus size={13} />
              <span>Single {entrantLabel}</span>
            </button>
            <button
              type="button"
              className={`horse-modal-tab-btn ${activeTab === 'bulk' ? 'active' : ''}`}
              onClick={() => setActiveTab('bulk')}
            >
              <ListPlus size={13} />
              <span>Bulk Paste Roster</span>
            </button>
          </div>
        )}

        {/* =========================================================================
            TAB 1: SINGLE ENTRANT FORM
            ========================================================================= */}
        {activeTab === 'single' && (
          <div className="horse-editor-form">
            {/* Live Preview Card */}
            <div className="horse-preview-box">
              <span className="preview-label">
                <Sparkles size={11} color="#d97706" /> Live Card Preview
              </span>
              <div
                className="card"
                style={{
                  '--horse-accent-color': color,
                  pointerEvents: 'none',
                  transform: 'none',
                  margin: '0.35rem auto 0'
                } as React.CSSProperties}
              >
                <div className="card_base">
                  <div className="card_base_gradient" />
                  <div className="card_base_glass" />
                </div>

                <div className="accent_base_color_group">
                  <div className="accent_base_color" />
                  <div className="accent_base_color_gradient" />
                  <div className="accent_slice_mask_a_group">
                    <div className="accent_slice_mask_a" />
                    <div className="accent_slice_mask_a_gradient" />
                  </div>
                  <div className="accent_slice_mask_b_group">
                    <div className="accent_slice_mask_b" />
                    <div className="accent_slice_mask_b_gradient" />
                  </div>
                  <div className="accent_number_text_container">
                    <span className="card_number">{number}</span>
                  </div>
                  <div className="entrant_icon_box" style={{ cursor: 'default' }}>
                    <IconDisplay icon={icon || '⚡'} className="entrant_icon_emoji" />
                  </div>
                </div>

                <div className="card_center_area">
                  <div className="name_text_container">
                    <span className="card_name">{name.trim() || `${entrantLabel} Name`}</span>
                  </div>
                  <div className="stats_row">
                    <div className="points_number_container">
                      <span className="stat_value">0 pts</span>
                    </div>
                    <div className="pool_number_container">
                      <span className="stat_value">0%</span>
                    </div>
                    <div className="odds_number_container">
                      <span className="odds_value">{manualOdds.toFixed(1)}x</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Name & Number row */}
            <div className="form-row-duo">
              <div className="form-field-group" style={{ flex: 1 }}>
                <label className="form-field-label">{entrantLabel} Name</label>
                <input
                  type="text"
                  className="cyber-input"
                  placeholder="e.g. Special Week, Silence Suzuka..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSingleSubmit();
                    }
                  }}
                  autoFocus
                  required
                />
              </div>

              <div className="form-field-group" style={{ width: '90px' }}>
                <label className="form-field-label">Number</label>
                <input
                  type="number"
                  min="1"
                  max="99"
                  className="cyber-input"
                  style={{ textAlign: 'center' }}
                  value={number}
                  onChange={(e) => setNumber(parseInt(e.target.value, 10) || 1)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSingleSubmit();
                    }
                  }}
                />
              </div>
            </div>

            {/* Odds Setting: Starting Odds / Fixed Odds */}
            <div className="odds-editor-container">
              <div className="odds-editor-header">
                <div className="odds-title-block">
                  <label className="form-field-label" style={{ marginBottom: 0 }}>
                    {oddsMode === 'manual' ? 'Fixed Odds Multiplier' : 'Starting Odds (Morning Line)'}
                  </label>
                  <span className="odds-ratio-tag">
                    {manualOdds === 2
                      ? 'Evens (1:1)'
                      : manualOdds > 1
                        ? `${(manualOdds - 1).toFixed(1)}:1`
                        : `1:${(1 / Math.max(0.01, manualOdds - 1)).toFixed(1)}`}
                    {' '}• 100 pts pays {Math.round(100 * manualOdds)} pts
                  </span>
                </div>

                {onToggleOddsMode && (
                  <div className="odds-mode-switch-group" title="Toggle how odds are calculated for this contest">
                    <button
                      type="button"
                      className={`odds-mode-pill ${oddsMode !== 'manual' ? 'active-pill' : ''}`}
                      onClick={() => onToggleOddsMode('auto')}
                    >
                      ⚡ Auto (Pool)
                    </button>
                    <button
                      type="button"
                      className={`odds-mode-pill ${oddsMode === 'manual' ? 'active-pill' : ''}`}
                      onClick={() => onToggleOddsMode('manual')}
                    >
                      🎯 Fixed (Manual)
                    </button>
                  </div>
                )}
              </div>

              <div className="odds-input-row">
                <div className="odds-numeric-input-wrap">
                  <span className="odds-input-prefix">✕</span>
                  <input
                    type="number"
                    min={1.05}
                    max={999}
                    step={0.1}
                    className="cyber-input odds-number-input"
                    value={manualOdds}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setManualOdds(isNaN(val) ? 1.05 : Math.max(1.05, Math.min(999, Math.round(val * 100) / 100)));
                    }}
                  />
                  <span className="odds-input-suffix">odds</span>
                </div>

                <div className="odds-preset-pills">
                  {[
                    { label: '1.5x (1:2)', val: 1.5 },
                    { label: '2.0x (Evens)', val: 2.0 },
                    { label: '3.0x (2:1)', val: 3.0 },
                    { label: '4.0x (3:1)', val: 4.0 },
                    { label: '5.0x (4:1)', val: 5.0 },
                    { label: '10x (9:1)', val: 10.0 },
                    { label: '20x', val: 20.0 },
                    { label: '50x', val: 50.0 },
                  ].map(preset => (
                    <button
                      key={preset.val}
                      type="button"
                      className={`odds-preset-chip ${manualOdds === preset.val ? 'is-selected' : ''}`}
                      onClick={() => setManualOdds(preset.val)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <p className="odds-mode-explanation">
                {oddsMode === 'manual'
                  ? '🎯 Fixed Odds Mode: Payouts are strictly locked to this multiplier, regardless of total bets placed.'
                  : '⚡ Auto Pool Mode: This starting line displays before bets arrive. Once viewers bet, odds dynamically recalculate from the prize pool.'}
              </p>
            </div>

            {/* Color Selection with Quick Swatches */}
            <div className="form-field-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-field-label">Saddle Silk / Accent Color</label>
                <span className="color-hex-label mono-val">{color.toUpperCase()}</span>
              </div>

              <div className="color-swatches-grid">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`color-swatch-btn ${color.toLowerCase() === c.toLowerCase() ? 'is-selected' : ''}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                    title={c}
                  >
                    {color.toLowerCase() === c.toLowerCase() && <Check size={12} color="#ffffff" />}
                  </button>
                ))}

                {/* Custom Color Input */}
                <div className="custom-color-picker-wrap" title="Pick any custom color">
                  <input
                    type="color"
                    className="native-color-input"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                  />
                  <span className="custom-color-indicator" style={{ backgroundColor: color }}>
                    +
                  </span>
                </div>
              </div>
            </div>

            {/* Icon / Emoji / Image Selection via IconPicker */}
            <div className="form-field-group">
              <label className="form-field-label" style={{ marginBottom: '0.45rem' }}>
                Representative Icon (Emoji, Local File or Web Link)
              </label>
              <IconPicker
                value={icon}
                onChange={setIcon}
              />
            </div>

            {/* Actions Footer */}
            <div className="modal-actions-space-between">
              {isEditing ? (
                <button
                  type="button"
                  className="cyber-btn-ghost text-danger"
                  onClick={handleDelete}
                  title={`Remove this ${entrantLabel.toLowerCase()} from contest`}
                >
                  <Trash2 size={13} /> Delete {entrantLabel}
                </button>
              ) : (
                <div />
              )}

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" className="cyber-btn-ghost" onClick={onClose}>
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSingleSubmit()}
                  className="cyber-btn-primary"
                  style={{
                    backgroundColor: color,
                    borderColor: color,
                    color: isLightColor(color) ? '#18181b' : '#ffffff'
                  }}
                >
                  {isEditing ? 'Save Changes' : `Add ${entrantLabel}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 2: BULK PASTE ROSTER FORM
            ========================================================================= */}
        {activeTab === 'bulk' && !isEditing && (
          <div className="bulk-paste-form">
            <div className="bulk-paste-intro">
              <span className="bulk-paste-label">Paste {entrantLabel} Names (One per line):</span>
              <span className="bulk-detected-badge mono-val">
                {detectedLinesCount} {detectedLinesCount === 1 ? entrantLabel.toLowerCase() : `${entrantLabel.toLowerCase()}s`} detected
              </span>
            </div>

            <textarea
              className="bulk-paste-textarea cyber-input"
              rows={7}
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              placeholder="Thunderbolt&#10;Silver Star&#10;Blazing Comet&#10;Shadow Runner&#10;Golden Hoof&#10;Luna Star"
              autoFocus
            />

            {/* Replace vs Append Mode Radio / Chips */}
            <div className="bulk-options-block">
              <span className="form-field-label">Import Mode:</span>
              <div className="segmented-button-group">
                <button
                  type="button"
                  className={`segment-btn ${bulkMode === 'replace' ? 'active-amber' : ''}`}
                  onClick={() => setBulkMode('replace')}
                  title={`Clears current ${entrantLabel.toLowerCase()}s and resets bets for a fresh contest`}
                >
                  🔄 Replace Entire Contest
                </button>
                <button
                  type="button"
                  className={`segment-btn ${bulkMode === 'append' ? 'active' : ''}`}
                  onClick={() => setBulkMode('append')}
                  title={`Adds onto existing ${currentHorseCount} ${entrantLabel.toLowerCase()}s, numbering them sequentially`}
                >
                  ➕ Append to Current ({currentHorseCount})
                </button>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="modal-actions-space-between" style={{ marginTop: '0.85rem' }}>
              <div />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" className="cyber-btn-ghost" onClick={onClose}>
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkSubmit()}
                  className="cyber-btn-primary"
                  disabled={detectedLinesCount === 0}
                >
                  {bulkMode === 'replace' ? `Create ${entrantLabel} Roster` : `Append ${detectedLinesCount} ${detectedLinesCount === 1 ? entrantLabel : `${entrantLabel}s`}`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
