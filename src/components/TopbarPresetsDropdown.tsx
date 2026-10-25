import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Bookmark, ChevronDown, Check, Trash2, Plus, Download, Upload, Loader2 } from 'lucide-react';
import type { Contest, SavedPreset, PanelsConfig } from '../types/betting';
import { storageService } from '../services/storageService';
import { BUILTIN_PRESETS, createOutcomesFromPreset, createOutcomesFromSaved } from '../services/presetService';
import { presetZipService } from '../services/presetZipService';
import { soundEffects } from '../services/soundEffects';

interface TopbarPresetsDropdownProps {
  contest: Contest;
  panelsConfig?: PanelsConfig;
  onApplyPreset: (title: string, outcomes: Contest['outcomes'], presetPanelsConfig?: Partial<PanelsConfig>) => void;
}

export const TopbarPresetsDropdown: React.FC<TopbarPresetsDropdownProps> = ({
  contest,
  panelsConfig,
  onApplyPreset,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [savedPresets, setSavedPresets] = useState<SavedPreset[]>(() => storageService.getSavedPresets());
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [includeLocalImages, setIncludeLocalImages] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dropdownCoords, setDropdownCoords] = useState<{ top: number; right: number } | null>(null);

  const updatePosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownCoords({
        top: rect.bottom + 6,
        right: Math.max(12, window.innerWidth - rect.right),
      });
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
      };
    }
  }, [isOpen, updatePosition]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
        setIsSavingPreset(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelectBuiltin = (p: typeof BUILTIN_PRESETS[0]) => {
    const outcomes = createOutcomesFromPreset(p);
    onApplyPreset(p.title, outcomes, p.panelsConfig);
    soundEffects.playTokenClink();
    setIsOpen(false);
  };

  const handleSelectSaved = (sp: SavedPreset) => {
    const outcomes = createOutcomesFromSaved(sp);
    onApplyPreset(sp.title, outcomes, sp.panelsConfig);
    soundEffects.playTokenClink();
    setIsOpen(false);
  };

  const handleSaveCurrent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim() || contest.outcomes.length === 0) return;

    const saved: SavedPreset = {
      id: `preset_${Date.now()}`,
      name: newPresetName.trim(),
      title: contest.title,
      outcomes: contest.outcomes.map(o => ({
        ...o,
        totalBet: 0,
        bettorCount: 0,
        odds: 1.0,
        percentage: 0,
        isLocked: false,
      })),
      createdAt: Date.now(),
      panelsConfig: panelsConfig ? { ...panelsConfig } : undefined,
    };

    const updated = storageService.savePreset(saved);
    setSavedPresets(updated);
    setNewPresetName('');
    setIsSavingPreset(false);
    soundEffects.playCashout();
  };

  const handleExportZip = async (sp: SavedPreset, e: React.MouseEvent, withImages: boolean = true) => {
    e.stopPropagation();
    try {
      setIsExporting(true);
      const blob = await presetZipService.exportPresetAsZip(sp, withImages);
      presetZipService.downloadZip(blob, `${sp.name || 'race_preset'}.zip`);
      soundEffects.playTokenClink();
    } catch (err) {
      console.error('Failed to export preset ZIP:', err);
      alert('Failed to package preset ZIP.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveAndExport = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newPresetName.trim() || contest.outcomes.length === 0) return;

    const saved: SavedPreset = {
      id: `preset_${Date.now()}`,
      name: newPresetName.trim(),
      title: contest.title,
      outcomes: contest.outcomes.map(o => ({
        ...o,
        totalBet: 0,
        bettorCount: 0,
        odds: 1.0,
        percentage: 0,
        isLocked: false,
      })),
      createdAt: Date.now(),
      panelsConfig: panelsConfig ? { ...panelsConfig } : undefined,
    };

    const updated = storageService.savePreset(saved);
    setSavedPresets(updated);

    try {
      setIsExporting(true);
      const blob = await presetZipService.exportPresetAsZip(saved, includeLocalImages);
      presetZipService.downloadZip(blob, `${saved.name}.zip`);
      soundEffects.playCashout();
    } catch (err) {
      console.error('Failed to export ZIP:', err);
    } finally {
      setIsExporting(false);
      setNewPresetName('');
      setIsSavingPreset(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const imported = await presetZipService.importPresetFromZip(file);
      const updated = storageService.getSavedPresets();
      setSavedPresets(updated);
      soundEffects.playCashout();
      // Apply imported preset to active contest
      const outcomes = createOutcomesFromSaved(imported);
      onApplyPreset(imported.title, outcomes, imported.panelsConfig);
      setIsOpen(false);
    } catch (err: any) {
      console.error('Failed to import preset ZIP:', err);
      alert(err.message || 'Failed to import preset archive.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteSaved = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = storageService.deletePreset(id);
    setSavedPresets(updated);
    soundEffects.playTokenClink();
  };

  return (
    <div className="topbar-presets-container">
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip,.json"
        style={{ display: 'none' }}
        onChange={handleImportFile}
      />

      <button 
        ref={buttonRef}
        className={`cyber-nav-btn ${isOpen ? 'active-gold' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Browse race presets & templates"
      >
        <Bookmark size={14} color="#fbbf24" />
        <span>Presets</span>
        <ChevronDown size={11} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }} />
      </button>

      {isOpen && dropdownCoords && createPortal(
        <div 
          ref={dropdownRef}
          className="topbar-presets-dropdown cosmos-panel"
          style={{
            position: 'fixed',
            top: `${dropdownCoords.top}px`,
            right: `${dropdownCoords.right}px`,
            zIndex: 99999,
          }}
        >
          <div className="dropdown-section-header">
            <span className="dropdown-section-title">Built-in Race Presets</span>
          </div>
          
          <div className="presets-list">
            {BUILTIN_PRESETS.map(p => (
              <button
                key={p.id}
                className="topbar-preset-item"
                onClick={() => handleSelectBuiltin(p)}
              >
                <span className="preset-item-name">{p.name}</span>
                <span className="preset-item-count">{p.items.length} racers</span>
              </button>
            ))}
          </div>

          {/* Custom Saved Presets */}
          {savedPresets.length > 0 && (
            <>
              <div className="dropdown-section-header" style={{ marginTop: '0.4rem' }}>
                <span className="dropdown-section-title">Saved Templates</span>
              </div>
              <div className="presets-list">
                {savedPresets.map(sp => {
                  const displayIcon = sp.panelsConfig?.raceEmoji || sp.panelsConfig?.entrantsEmoji || '🔖';
                  const entrantLabel = sp.panelsConfig?.entrantsTitle ? sp.panelsConfig.entrantsTitle.toLowerCase() : 'entrants';
                  return (
                    <div key={sp.id} className="topbar-saved-preset-row" onClick={() => handleSelectSaved(sp)}>
                      <span className="preset-item-emoji" style={{ fontSize: '0.95rem', marginRight: '0.35rem', flexShrink: 0 }}>{displayIcon}</span>
                      <span className="preset-item-name">{sp.name}</span>
                      <span className="preset-item-count">{sp.outcomes.length} {entrantLabel}</span>
                      <button 
                        type="button"
                        className="preset-item-export-btn" 
                        onClick={(e) => handleExportZip(sp, e, true)}
                        title="Export & download preset as ZIP with local runner icon images"
                        disabled={isExporting}
                      >
                        <Download size={11} />
                      </button>
                      <button 
                        type="button"
                        className="preset-item-del-btn" 
                        onClick={(e) => handleDeleteSaved(sp.id, e)}
                        title="Delete preset"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Save Current Lineup & Import Actions */}
          <div className="dropdown-footer-actions">
            {!isSavingPreset ? (
              <div style={{ display: 'flex', gap: '0.35rem', width: '100%' }}>
                <button 
                  className="cyber-btn-ghost mini-btn" 
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => setIsSavingPreset(true)}
                  title="Save current race lineup as preset"
                >
                  <Plus size={11} /> Save Current
                </button>
                <button 
                  className="cyber-btn-ghost mini-btn" 
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                  title="Import preset archive (.zip or .json) with images"
                >
                  {isImporting ? <Loader2 size={11} className="spin-slow" /> : <Upload size={11} />}
                  <span>{isImporting ? 'Importing...' : 'Import ZIP'}</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleSaveCurrent} className="save-preset-inline-form" style={{ flexDirection: 'column', gap: '0.35rem', width: '100%' }}>
                <div style={{ display: 'flex', gap: '0.3rem', width: '100%', alignItems: 'center' }}>
                  <input 
                    type="text"
                    placeholder="Preset Name..."
                    value={newPresetName}
                    onChange={e => setNewPresetName(e.target.value)}
                    className="cyber-input-mini"
                    style={{ flex: 1 }}
                    autoFocus
                  />
                  <button type="submit" className="cyber-btn-primary mini-btn" title="Save preset locally">
                    <Check size={11} />
                  </button>
                  <button 
                    type="button" 
                    className="cyber-btn-secondary mini-btn"
                    onClick={handleSaveAndExport}
                    title="Save & Download as ZIP with local icons"
                    style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.7rem' }}
                    disabled={isExporting}
                  >
                    <Download size={11} /> ZIP
                  </button>
                  <button type="button" className="cyber-btn-ghost mini-btn" onClick={() => setIsSavingPreset(false)}>
                    ✕
                  </button>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.68rem', color: 'var(--text-muted, #8E7D53)', cursor: 'pointer', userSelect: 'none' }}>
                  <input 
                    type="checkbox"
                    checked={includeLocalImages}
                    onChange={e => setIncludeLocalImages(e.target.checked)}
                    style={{ accentColor: 'var(--accent-gold, #d97706)' }}
                  />
                  <span>Include local runner icons in ZIP</span>
                </label>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
