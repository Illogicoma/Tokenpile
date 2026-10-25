import { useState } from 'react';
import { 
  Trophy, 
  Lock, 
  Play, 
  Plus, 
  Trash2, 
  RotateCcw, 
  Coins, 
  ChevronDown, 
  ChevronUp,
  Bookmark,
  Check
} from 'lucide-react';
import type { Contest, BetOutcome, ContestStatus, SavedPreset } from '../types/betting';
import { soundEffects } from '../services/soundEffects';
import { storageService } from '../services/storageService';
import { IconDisplay } from './IconDisplay';

interface ContestManagerProps {
  contest: Contest;
  onUpdateContest: (updated: Contest) => void;
  onSelectWinner: (outcomeId: string) => void;
  onQuickBetOnOutcome: (outcomeId: string) => void;
  onStatusChange: (status: ContestStatus) => void;
  onResetContest: () => void;
  isDebugMode?: boolean;
}

const BUILTIN_PRESETS = [
  {
    name: '🐎 20-Horse Derby Race',
    title: 'The Royal Grand Derby (20 Entrants)',
    items: [
      { name: 'Thunderbolt', icon: '⚡', color: '#ef4444' },
      { name: 'Silver Star', icon: '⭐', color: '#94a3b8' },
      { name: 'Blazing Comet', icon: '☄️', color: '#f97316' },
      { name: 'Shadow Runner', icon: '🌑', color: '#64748b' },
      { name: 'Golden Hoof', icon: '🏆', color: '#eab308' },
      { name: 'Midnight Storm', icon: '🌪️', color: '#3b82f6' },
      { name: 'Emerald Breeze', icon: '🍃', color: '#10b981' },
      { name: 'Crimson Fury', icon: '🔥', color: '#dc2626' },
      { name: 'Iron Will', icon: '🛡️', color: '#71717a' },
      { name: 'Solar Flare', icon: '☀️', color: '#f59e0b' },
      { name: 'Mystic Dream', icon: '🔮', color: '#8b5cf6' },
      { name: 'Neon Dash', icon: '⚡', color: '#06b6d4' },
      { name: 'Wild Mustang', icon: '🐎', color: '#d97706' },
      { name: 'Phantom Ghost', icon: '👻', color: '#a855f7' },
      { name: 'Vortex Jet', icon: '🌀', color: '#0284c7' },
      { name: 'Frost Bite', icon: '❄️', color: '#38bdf8' },
      { name: 'Ruby Rocket', icon: '🚀', color: '#e11d48' },
      { name: 'Thunder Clap', icon: '🌩️', color: '#6366f1' },
      { name: 'Desert Mirage', icon: '🏜️', color: '#ca8a04' },
      { name: 'Apex Predator', icon: '🦁', color: '#f43f5e' }
    ]
  },
  {
    name: '⚔️ 8-Fighter Arena',
    title: 'Gladiator Champions Arena',
    items: [
      { name: 'Valkyrie', icon: '⚔️', color: '#ef4444' },
      { name: 'Warlock', icon: '🔮', color: '#8b5cf6' },
      { name: 'Berserker', icon: '🪓', color: '#f97316' },
      { name: 'Paladin', icon: '🛡️', color: '#eab308' },
      { name: 'Shadow Assassin', icon: '🗡️', color: '#64748b' },
      { name: 'Archmage', icon: '✨', color: '#3b82f6' },
      { name: 'Beastmaster', icon: '🐺', color: '#10b981' },
      { name: 'Cyber Ninja', icon: '⚡', color: '#06b6d4' }
    ]
  },
  {
    name: '🔴 Red vs Blue Duel',
    title: 'The Great Faction Showdown',
    items: [
      { name: 'Team Crimson', icon: '🔴', color: '#ef4444' },
      { name: 'Team Cobalt', icon: '🔵', color: '#3b82f6' }
    ]
  }
];

export const ContestManager = ({
  contest,
  onUpdateContest,
  onSelectWinner,
  onQuickBetOnOutcome,
  onStatusChange,
  onResetContest,
  isDebugMode = false
}: ContestManagerProps) => {
  const [isAddingEntrant, setIsAddingEntrant] = useState(false);
  const [newEntrantName, setNewEntrantName] = useState('');
  const [newEntrantIcon, setNewEntrantIcon] = useState('🎯');
  const [newEntrantColor, setNewEntrantColor] = useState('#3b82f6');
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkInput, setBulkInput] = useState('');
  const [filterText, setFilterText] = useState('');

  // Custom Presets State
  const [savedPresets, setSavedPresets] = useState<SavedPreset[]>(() => storageService.getSavedPresets());
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  const handleApplyBuiltinPreset = (preset: typeof BUILTIN_PRESETS[0]) => {
    const outcomes: BetOutcome[] = preset.items.map((item, idx) => ({
      id: String(idx + 1),
      number: idx + 1,
      name: item.name,
      color: item.color,
      icon: item.icon,
      totalBet: 0,
      bettorCount: 0,
      odds: 1.0,
      percentage: 0,
    }));

    onUpdateContest({
      ...contest,
      title: preset.title,
      outcomes,
      totalPool: 0,
      status: 'open',
      winningOutcomeId: undefined,
      bets: []
    });

    soundEffects.playTokenClink();
  };

  const handleApplySavedPreset = (preset: SavedPreset) => {
    const resetOutcomes: BetOutcome[] = preset.outcomes.map((o, idx) => ({
      ...o,
      number: idx + 1,
      totalBet: 0,
      bettorCount: 0,
      odds: 1.0,
      percentage: 0,
    }));

    onUpdateContest({
      ...contest,
      title: preset.title,
      outcomes: resetOutcomes,
      totalPool: 0,
      status: 'open',
      winningOutcomeId: undefined,
      bets: []
    });

    soundEffects.playTokenClink();
  };

  const handleSaveCurrentAsPreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;

    const newPreset: SavedPreset = {
      id: `preset_${Date.now()}`,
      name: newPresetName.trim(),
      title: contest.title,
      outcomes: contest.outcomes,
      createdAt: Date.now(),
      panelsConfig: storageService.getPanelsConfig(),
    };

    const updated = storageService.savePreset(newPreset);
    setSavedPresets(updated);
    setNewPresetName('');
    setIsSavingPreset(false);
    soundEffects.playCashout();
  };

  const handleDeleteSavedPreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = storageService.deletePreset(id);
    setSavedPresets(updated);
  };

  const handleAddEntrant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntrantName.trim()) return;

    const nextNumber = contest.outcomes.length + 1;
    const newOutcome: BetOutcome = {
      id: `custom_${Date.now()}_${nextNumber}`,
      number: nextNumber,
      name: newEntrantName.trim(),
      icon: newEntrantIcon || '🎯',
      color: newEntrantColor,
      totalBet: 0,
      bettorCount: 0,
      odds: 1.0,
      percentage: 0
    };

    onUpdateContest({
      ...contest,
      outcomes: [...contest.outcomes, newOutcome]
    });

    setNewEntrantName('');
    setIsAddingEntrant(false);
    soundEffects.playTokenClink();
  };

  const handleBulkImport = () => {
    const lines = bulkInput.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return;

    const colorPalette = [
      '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6',
      '#ec4899', '#06b6d4', '#84cc16', '#d97706', '#6366f1'
    ];

    const outcomes: BetOutcome[] = lines.map((line, idx) => ({
      id: `bulk_${idx + 1}`,
      number: idx + 1,
      name: line,
      icon: '🏁',
      color: colorPalette[idx % colorPalette.length],
      totalBet: 0,
      bettorCount: 0,
      odds: 1.0,
      percentage: 0
    }));

    onUpdateContest({
      ...contest,
      outcomes,
      totalPool: 0,
      bets: []
    });

    setIsBulkOpen(false);
    setBulkInput('');
    soundEffects.playCashout();
  };

  const handleRemoveEntrant = (id: string) => {
    const updated = contest.outcomes.filter(o => o.id !== id).map((o, idx) => ({
      ...o,
      number: idx + 1
    }));
    onUpdateContest({
      ...contest,
      outcomes: updated
    });
  };

  const filteredOutcomes = contest.outcomes.filter(o => 
    o.name.toLowerCase().includes(filterText.toLowerCase()) || 
    String(o.number).includes(filterText)
  );

  return (
    <div className="contest-manager-card cosmos-panel">
      {/* Top Banner & Title */}
      <div className="contest-header-bar">
        <div>
          <div className="contest-status-line">
            <span className={`status-badge status-${contest.status}`}>
              {contest.status === 'open' && <Play size={12} />}
              {contest.status === 'locked' && <Lock size={12} />}
              {contest.status === 'resolved' && <Trophy size={12} />}
              {contest.status.toUpperCase()}
            </span>
            <span className="contest-meta-pill">
              <Coins size={12} /> Total Pot: <strong>{contest.totalPool.toLocaleString()} pts</strong>
            </span>
            <span className="contest-meta-pill">
              Entrants: <strong>{contest.outcomes.length}</strong>
            </span>
          </div>

          <input 
            type="text" 
            value={contest.title}
            onChange={e => onUpdateContest({ ...contest, title: e.target.value })}
            className="contest-title-input"
            placeholder="Betting Pool Question / Contest Title..."
          />
        </div>

        {/* State Controls */}
        <div className="contest-action-buttons">
          {contest.status === 'open' ? (
            <button 
              className="cyber-btn-warning"
              onClick={() => {
                onStatusChange('locked');
                soundEffects.playLockBuzzer();
              }}
              title="Lock bets: No more incoming bets allowed"
            >
              <Lock size={14} /> Lock Bets
            </button>
          ) : contest.status === 'locked' ? (
            <button 
              className="cyber-btn-success"
              onClick={() => {
                onStatusChange('open');
                soundEffects.playTokenClink();
              }}
              title="Re-open bets"
            >
              <Play size={14} /> Reopen Bets
            </button>
          ) : null}

          <button 
            className="cyber-btn-ghost"
            onClick={onResetContest}
            title="Reset contest"
          >
            <RotateCcw size={14} /> Reset
          </button>
        </div>
      </div>

      {/* Presets & Custom Saved Presets Ribbon */}
      <div className="presets-ribbon">
        <span className="presets-label">Presets:</span>
        
        {/* Built-in Presets */}
        {BUILTIN_PRESETS.map(p => (
          <button 
            key={p.name}
            className="preset-btn"
            onClick={() => handleApplyBuiltinPreset(p)}
          >
            {p.name}
          </button>
        ))}

        {/* Custom Saved Presets */}
        {savedPresets.map(sp => (
          <div key={sp.id} className="custom-preset-chip" onClick={() => handleApplySavedPreset(sp)}>
            <Bookmark size={10} color="#fbbf24" />
            <span className="custom-preset-name">{sp.name}</span>
            <button 
              className="custom-preset-del" 
              onClick={(e) => handleDeleteSavedPreset(sp.id, e)}
              title="Delete custom preset"
            >
              ×
            </button>
          </div>
        ))}

        {/* Save Current as Preset Button */}
        <button 
          className="preset-btn-accent"
          onClick={() => setIsSavingPreset(!isSavingPreset)}
          title="Save current entrant list as a reusable preset"
        >
          <Bookmark size={11} /> Save Current Preset
        </button>

        {/* Bulk Text Import (visible in Debug Mode or when clicked) */}
        {(isDebugMode || isBulkOpen) && (
          <button 
            className="preset-btn-outline"
            onClick={() => setIsBulkOpen(!isBulkOpen)}
          >
            {isBulkOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />} Bulk Paste
          </button>
        )}
      </div>

      {/* Save Preset Drawer */}
      {isSavingPreset && (
        <form onSubmit={handleSaveCurrentAsPreset} className="save-preset-drawer">
          <input 
            type="text" 
            placeholder="Preset Name (e.g. Mario Kart Cup)..."
            value={newPresetName}
            onChange={e => setNewPresetName(e.target.value)}
            className="cyber-input"
            style={{ flex: 1 }}
            autoFocus
          />
          <button type="submit" className="cyber-btn-primary" style={{ padding: '0.35rem 0.8rem' }}>
            <Check size={14} /> Save
          </button>
          <button type="button" className="cyber-btn-ghost" onClick={() => setIsSavingPreset(false)}>
            Cancel
          </button>
        </form>
      )}

      {/* Bulk Import Drawer */}
      {isBulkOpen && (
        <div className="bulk-import-drawer">
          <label className="section-label">Paste List of Entrant Names (one per line):</label>
          <textarea 
            rows={4}
            value={bulkInput}
            onChange={e => setBulkInput(e.target.value)}
            placeholder={"Horse #1\nHorse #2\nHorse #3\n..."}
            className="cyber-textarea"
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button className="cyber-btn-secondary" onClick={() => setIsBulkOpen(false)}>Cancel</button>
            <button className="cyber-btn-primary" onClick={handleBulkImport}>Create Entrants List</button>
          </div>
        </div>
      )}

      {/* Visual Multi-Color Stacked Pool Distribution Bar */}
      {contest.totalPool > 0 && (
        <div className="pool-distribution-section">
          <div className="pool-dist-bar">
            {contest.outcomes.filter(o => o.percentage > 0).map(o => (
              <div 
                key={o.id}
                className="pool-dist-segment"
                style={{ 
                  width: `${o.percentage}%`, 
                  backgroundColor: o.color 
                }}
                title={`${o.name}: ${o.totalBet} pts (${o.percentage.toFixed(1)}%)`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Entrant Filter & Add Bar */}
      <div className="entrants-control-bar">
        <input 
          type="text" 
          placeholder={`Search ${contest.outcomes.length} entrants...`}
          value={filterText}
          onChange={e => setFilterText(e.target.value)}
          className="cyber-search-input"
        />

        <button 
          className="cyber-btn-secondary"
          onClick={() => setIsAddingEntrant(!isAddingEntrant)}
        >
          <Plus size={14} /> Add Entrant
        </button>
      </div>

      {/* Add Entrant Form */}
      {isAddingEntrant && (
        <form onSubmit={handleAddEntrant} className="add-entrant-form">
          <input 
            type="text" 
            placeholder="Entrant name (e.g. Pegasus)"
            value={newEntrantName}
            onChange={e => setNewEntrantName(e.target.value)}
            className="cyber-input"
            style={{ flex: 2 }}
            autoFocus
          />
          <input 
            type="text" 
            placeholder="Icon (🏇)"
            value={newEntrantIcon}
            onChange={e => setNewEntrantIcon(e.target.value)}
            className="cyber-input"
            style={{ width: '60px', textAlign: 'center' }}
            maxLength={2}
          />
          <input 
            type="color" 
            value={newEntrantColor}
            onChange={e => setNewEntrantColor(e.target.value)}
            style={{ width: '40px', height: '36px', border: 'none', cursor: 'pointer', background: 'transparent' }}
          />
          <button type="submit" className="cyber-btn-primary">Add</button>
          <button type="button" className="cyber-btn-ghost" onClick={() => setIsAddingEntrant(false)}>Cancel</button>
        </form>
      )}

      {/* Entrants Grid / List (Supports 20+ cleanly) */}
      <div className="outcomes-grid-container">
        {filteredOutcomes.map(outcome => {
          const isWinner = contest.winningOutcomeId === outcome.id;

          return (
            <div 
              key={outcome.id} 
              className={`outcome-card ${isWinner ? 'outcome-winner-card' : ''}`}
              style={{ borderLeftColor: outcome.color }}
            >
              <div className="outcome-top-row">
                <div className="outcome-identity">
                  <span className="outcome-number-badge" style={{ backgroundColor: outcome.color }}>
                    #{outcome.number}
                  </span>
                  <span className="outcome-icon"><IconDisplay icon={outcome.icon} className="entrant_icon_emoji" /></span>
                  <span className="outcome-name">{outcome.name}</span>
                </div>

                <div className="outcome-odds-tag">
                  {outcome.totalBet > 0 ? (
                    <span className="odds-multiplier">{outcome.odds.toFixed(2)}x</span>
                  ) : (
                    <span className="odds-none">--</span>
                  )}
                </div>
              </div>

              <div className="outcome-metrics-row">
                <span className="outcome-total-pts">
                  <Coins size={11} /> {outcome.totalBet.toLocaleString()} pts
                </span>
                <span className="outcome-share-pct">
                  {outcome.percentage.toFixed(0)}% pool
                </span>
                <span className="outcome-bettor-count">
                  {outcome.bettorCount} bets
                </span>
              </div>

              {/* Action Buttons */}
              <div className="outcome-actions">
                <button 
                  className="action-btn-bet"
                  onClick={() => onQuickBetOnOutcome(outcome.id)}
                  title={`Drop quick bet on #${outcome.number}`}
                  disabled={contest.status !== 'open'}
                >
                  <Coins size={12} /> Bet
                </button>

                <button 
                  className={`action-btn-crown ${isWinner ? 'crowned' : ''}`}
                  onClick={() => onSelectWinner(outcome.id)}
                  title={`Crown #${outcome.number} ${outcome.name} as Winner!`}
                >
                  <Trophy size={13} /> Crown
                </button>

                <button 
                  className="action-btn-remove"
                  onClick={() => handleRemoveEntrant(outcome.id)}
                  title="Remove entrant"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
