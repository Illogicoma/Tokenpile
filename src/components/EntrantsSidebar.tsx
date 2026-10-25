import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Coins,
  Trash2,
  Lock,
  Unlock,
  Plus,
  LayoutList,
  Tag,
  Repeat,
  X
} from 'lucide-react';
import type { Contest, BetOutcome, ContestStatus, OddsMode } from '../types/betting';
import { soundEffects } from '../services/soundEffects';
import { HorseEditorModal } from './HorseEditorModal';
import { IconDisplay } from './IconDisplay';
import { useAutoScroll } from '../hooks/useAutoScroll';
import { getPodiumColor } from '../utils/podiumColors';

interface EntrantsSidebarProps {
  contest: Contest;
  onUpdateContest: (updated: Contest) => void;
  onSelectWinner: (outcomeId: string, podiumOutcomeIds?: string[]) => void;
  onQuickBetOnOutcome?: (outcomeId: string) => void;
  onStatusChange?: (status: ContestStatus) => void;
  onResetContest?: () => void;
  filterText?: string;
  cascadeKey?: number;
  onOpenAddHorse?: () => void;
  onEditHorse?: (horse: BetOutcome) => void;
  title?: string;
  emoji?: string;
  onUpdateTitle?: (title: string) => void;
  onOpenIconEditor?: () => void;
  isCompactMode?: boolean;
  onToggleCompactMode?: (compact: boolean) => void;
  showNameIcons?: boolean;
  onToggleShowNameIcons?: (show: boolean) => void;
  oddsMode?: OddsMode;
  onToggleOddsMode?: (mode?: OddsMode) => void;
  isAdmin?: boolean;
}

const renderEntrantIcon = (icon?: string, isNameIcon = false) => {
  const val = icon?.trim() || '⚡';
  return (
    <IconDisplay
      icon={val}
      className={isNameIcon ? "name_icon_emoji" : "entrant_icon_emoji"}
    />
  );
};

const formatCompactPts = (pts: number): string => {
  if (pts >= 1000000) return `${(pts / 1000000).toFixed(1)}M`;
  if (pts >= 10000) return `${Math.round(pts / 1000)}k`;
  if (pts >= 1000) return `${(pts / 1000).toFixed(1)}k`;
  return String(pts);
};

export const EntrantsSidebar = ({
  contest,
  onUpdateContest,
  onSelectWinner,
  onStatusChange: _onStatusChange,
  onResetContest: _onResetContest,
  filterText = '',
  cascadeKey,
  onOpenAddHorse,
  onEditHorse,
  title = 'Entrants',
  emoji = '🏇',
  onUpdateTitle,
  onOpenIconEditor,
  isCompactMode,
  onToggleCompactMode,
  showNameIcons: propsShowNameIcons,
  onToggleShowNameIcons,
  oddsMode = 'auto',
  onToggleOddsMode,
  isAdmin = true
}: EntrantsSidebarProps) => {
  const effectiveOddsMode = contest.oddsMode || oddsMode || 'auto';
  const [sortMode, setSortMode] = useState<'number' | 'odds'>('number');
  const [isHorseEditorOpen, setIsHorseEditorOpen] = useState(false);
  const [editingHorse, setEditingHorse] = useState<BetOutcome | null>(null);

  const [expectedWinners, setExpectedWinners] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('anytoken_expected_winners');
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (parsed >= 1 && parsed <= 12) return parsed;
      }
    } catch { }
    return contest.expectedWinnersCount || 3;
  });

  const [stagedPodiumIds, setStagedPodiumIds] = useState<string[]>([]);

  // Automatically clear staged winners whenever the contest is reset to open
  useEffect(() => {
    if (contest.status === 'open' && !contest.winningOutcomeId && (!contest.podiumOutcomeIds || contest.podiumOutcomeIds.length === 0)) {
      setStagedPodiumIds([]);
    }
  }, [contest.status, contest.winningOutcomeId, contest.podiumOutcomeIds]);

  // Rainbow card shine active for 12 seconds after race resolution
  const [rainbowActive, setRainbowActive] = useState<boolean>(() => {
    if (contest.status !== 'resolved' || !contest.resolvedAt) return false;
    return (Date.now() - contest.resolvedAt) < 12000;
  });

  useEffect(() => {
    if (contest.status === 'resolved') {
      const resolvedAt = contest.resolvedAt || Date.now();
      const elapsed = Date.now() - resolvedAt;
      if (elapsed < 12000) {
        setRainbowActive(true);
        const timer = setTimeout(() => {
          setRainbowActive(false);
        }, 12000 - elapsed);
        return () => clearTimeout(timer);
      } else {
        setRainbowActive(false);
      }
    } else {
      setRainbowActive(false);
    }
  }, [contest.status, contest.resolvedAt]);

  const handleSetExpectedWinners = (count: number) => {
    setExpectedWinners(count);
    try {
      localStorage.setItem('anytoken_expected_winners', String(count));
    } catch { }
    setStagedPodiumIds(prev => prev.slice(0, count));
  };

  const handleClearStagedPodium = () => {
    setStagedPodiumIds([]);
    soundEffects.playTokenClink();
  };

  const handleCommitPodium = () => {
    if (stagedPodiumIds.length === 0) return;
    onSelectWinner(stagedPodiumIds[0], stagedPodiumIds);
    setStagedPodiumIds([]);
  };

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    try {
      return localStorage.getItem('anytoken_entrants_compact') === 'true';
    } catch {
      return false;
    }
  });

  const [showNameIcons, setShowNameIcons] = useState<boolean>(() => {
    try {
      return localStorage.getItem('anytoken_show_name_icons') === 'true';
    } catch {
      return false;
    }
  });

  const [isAutoScroll, setIsAutoScroll] = useState<boolean>(() => {
    try {
      return localStorage.getItem('anytoken_entrants_auto_scroll') === 'true';
    } catch {
      return false;
    }
  });

  const { containerRef: listScrollRef } = useAutoScroll<HTMLDivElement>({
    enabled: isAutoScroll,
    direction: 'vertical',
    speed: 0.75,
    pauseOnHover: true,
    edgePauseMs: 1400,
  });

  const handleToggleAutoScroll = () => {
    const next = !isAutoScroll;
    setIsAutoScroll(next);
    try {
      localStorage.setItem('anytoken_entrants_auto_scroll', String(next));
    } catch { }
  };

  const effectiveCompact = isCompactMode !== undefined ? isCompactMode : isCompact;
  const effectiveShowNameIcons = propsShowNameIcons !== undefined ? propsShowNameIcons : showNameIcons;

  const handleToggleCompact = () => {
    const next = !effectiveCompact;
    setIsCompact(next);
    if (onToggleCompactMode) {
      onToggleCompactMode(next);
    }
    try {
      localStorage.setItem('anytoken_entrants_compact', String(next));
    } catch { }
  };

  const handleToggleShowNameIcons = () => {
    const next = !effectiveShowNameIcons;
    setShowNameIcons(next);
    if (onToggleShowNameIcons) {
      onToggleShowNameIcons(next);
    }
    try {
      localStorage.setItem('anytoken_show_name_icons', String(next));
    } catch { }
  };

  const handleToggleLock = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated: BetOutcome[] = contest.outcomes.map(o => {
      if (o.id === id) {
        return {
          ...o,
          isLocked: !o.isLocked
        };
      }
      return o;
    });

    onUpdateContest({
      ...contest,
      outcomes: updated
    });
    soundEffects.playTokenClink();
  };

  const handleRemoveEntrantById = (id: string) => {
    const updated: BetOutcome[] = contest.outcomes
      .filter(o => o.id !== id)
      .map((o, idx) => ({
        ...o,
        number: idx + 1
      }));

    onUpdateContest({
      ...contest,
      outcomes: updated
    });
  };

  const handleRemoveEntrant = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    handleRemoveEntrantById(id);
  };

  const handleSaveHorse = (horseData: { id?: string; name: string; number: number; color: string; icon: string; manualOdds?: number; odds?: number }) => {
    if (horseData.id) {
      // Update existing horse
      const updated = contest.outcomes.map(o => {
        if (o.id === horseData.id) {
          const mOdds = horseData.manualOdds ?? o.manualOdds ?? 2.0;
          return {
            ...o,
            name: horseData.name,
            number: horseData.number,
            color: horseData.color,
            icon: horseData.icon,
            manualOdds: mOdds,
            odds: contest.oddsMode === 'manual' ? mOdds : (o.totalBet > 0 ? o.odds : mOdds)
          };
        }
        return o;
      });
      onUpdateContest({
        ...contest,
        outcomes: updated
      });
    } else {
      // Create new horse
      const initialOdds = horseData.manualOdds ?? 2.0;
      const newOutcome: BetOutcome = {
        id: String(Date.now()),
        number: horseData.number,
        name: horseData.name,
        color: horseData.color,
        icon: horseData.icon,
        totalBet: 0,
        bettorCount: 0,
        odds: initialOdds,
        manualOdds: initialOdds,
        percentage: 0,
        isLocked: false
      };
      onUpdateContest({
        ...contest,
        outcomes: [...contest.outcomes, newOutcome]
      });
    }
  };

  const handleCrownClick = (outcomeId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    setStagedPodiumIds(prev => {
      const existingIdx = prev.indexOf(outcomeId);
      if (existingIdx !== -1) {
        // Toggle off if already selected
        soundEffects.playTokenClink();
        return prev.filter(id => id !== outcomeId);
      }

      if (prev.length >= expectedWinners) {
        // Reached limit: replace the last place
        soundEffects.playTokenClink();
        return [...prev.slice(0, expectedWinners - 1), outcomeId];
      }

      soundEffects.playTokenClink();
      return [...prev, outcomeId];
    });
  };

  const getOutcomePodiumInfo = (outcomeId: string) => {
    // If staged right now:
    const stagedIdx = stagedPodiumIds.indexOf(outcomeId);
    if (stagedIdx !== -1) {
      const place = stagedIdx + 1;
      const total = Math.max(expectedWinners, stagedPodiumIds.length);
      const color = getPodiumColor(place, total);
      return {
        isStaged: true,
        place,
        color,
      };
    }

    // If contest resolved and has podiumOutcomeIds:
    if (contest.status === 'resolved') {
      const resolvedList = contest.podiumOutcomeIds && contest.podiumOutcomeIds.length > 0
        ? contest.podiumOutcomeIds
        : (contest.winningOutcomeId ? [contest.winningOutcomeId] : []);
      const resolvedIdx = resolvedList.indexOf(outcomeId);
      if (resolvedIdx !== -1) {
        const place = resolvedIdx + 1;
        const total = resolvedList.length;
        const color = getPodiumColor(place, total);
        return {
          isStaged: false,
          place,
          color,
        };
      }
    }

    return null;
  };

  const filteredOutcomes = contest.outcomes.filter(o =>
    o.name.toLowerCase().includes(filterText.toLowerCase()) ||
    String(o.number).includes(filterText)
  );

  // Dynamic sorting (By Number vs By Odds/Favorites)
  const sortedOutcomes = [...filteredOutcomes].sort((a, b) => {
    if (sortMode === 'odds') {
      // Locked horses always sort to the bottom
      if (a.isLocked && !b.isLocked) return 1;
      if (!a.isLocked && b.isLocked) return -1;

      // Both have bets: lower odds (highest pool / favorite) first
      if (a.totalBet > 0 && b.totalBet > 0) {
        if (a.odds !== b.odds) return a.odds - b.odds;
        return b.totalBet - a.totalBet;
      }
      if (a.totalBet > 0 && b.totalBet === 0) return -1;
      if (b.totalBet > 0 && a.totalBet === 0) return 1;

      return a.number - b.number;
    }
    return a.number - b.number;
  });

  return (
    <aside className="entrants-sidebar cosmos-panel">
      {/* Top Header: Standalone Editable Title & Icon */}
      <div className="entrants-header-top">
        <button
          type="button"
          className="cyber-nav-btn btn-icon-only panel-icon-btn"
          onClick={onOpenIconEditor}
          title={`Click to customize ${title} icon & 3D token`}
        >
          <span className="panel-icon-emoji">
            <IconDisplay icon={emoji} fallback="🏇" />
          </span>
        </button>

        <input
          type="text"
          className="panel-editable-title-input"
          value={title}
          onChange={(e) => onUpdateTitle?.(e.target.value)}
          placeholder="Entrants..."
          title="Click to rename Entrants section"
        />

        <span className="panel-count-pill">
          ({contest.outcomes.length})
        </span>
      </div>

      {/* Separator Divider */}
      <div className="panel-header-divider" />

      {/* Action Strip: Buttons and Places selector */}
      <div className="entrants-action-strip">
        {/* Add Entrant Button (Admin Only) */}
        {isAdmin && (
          <button
            type="button"
            className="cyber-btn-secondary mini-btn"
            onClick={() => {
              if (onOpenAddHorse) {
                onOpenAddHorse();
              } else {
                setEditingHorse(null);
                setIsHorseEditorOpen(true);
              }
            }}
            title={`Add a new individual ${title.toLowerCase().replace(/s$/, '') || 'entrant'} or bulk paste roster`}
          >
            <Plus size={11} /> Add
          </button>
        )}

        {/* Expected Winners / Places Selector: Single count stepper */}
        <div className="places-selector-group" title={`Expected victors: currently ${expectedWinners} places`}>
          <span className="places-label">Places:</span>
          {isAdmin && (
            <button
              type="button"
              className="places-stepper-btn"
              onClick={() => handleSetExpectedWinners(Math.max(1, expectedWinners - 1))}
              title="Decrease expected victors"
            >
              -
            </button>
          )}
          <span
            className="places-val-badge"
            style={{
              background: `linear-gradient(180deg, ${getPodiumColor(expectedWinners, Math.max(expectedWinners, 3)).lightHex} 0%, ${getPodiumColor(expectedWinners, Math.max(expectedWinners, 3)).hex} 100%)`,
              color: getPodiumColor(expectedWinners, Math.max(expectedWinners, 3)).textContrast,
              borderColor: getPodiumColor(expectedWinners, Math.max(expectedWinners, 3)).darkHex,
            }}
          >
            {expectedWinners}
          </span>
          {isAdmin && (
            <button
              type="button"
              className="places-stepper-btn"
              onClick={() => handleSetExpectedWinners(Math.min(contest.outcomes.length || 12, expectedWinners + 1))}
              title="Increase expected victors"
            >
              +
            </button>
          )}
        </div>

        {/* Odds vs Number Sort Toggle */}
        <button
          className={`cyber-btn-ghost mini-btn ${sortMode === 'odds' ? 'active-amber' : ''}`}
          onClick={() => setSortMode(s => s === 'number' ? 'odds' : 'number')}
          title={sortMode === 'odds' ? "Sorting by Odds (Favorites First). Click for #Number order" : "Sorting by #Number. Click for Odds / Favorites order"}
        >
          {sortMode === 'odds' ? '⚡ By Odds' : '# By Num'}
        </button>

        {/* Odds Mode Toggle: Auto (Pool) vs Fixed (Manual) (Admin Only) */}
        {isAdmin && (
          <button
            type="button"
            className={`cyber-btn-ghost mini-btn ${effectiveOddsMode === 'manual' ? 'active-amber' : ''}`}
            onClick={() => onToggleOddsMode ? onToggleOddsMode() : undefined}
            title={effectiveOddsMode === 'manual'
              ? "Odds Mode: Fixed / Manual (streamer sets odds). Click to switch to Auto (Pool-based)."
              : "Odds Mode: Auto (Pool-based). Click to switch to Fixed / Manual odds."
            }
          >
            {effectiveOddsMode === 'manual' ? '🎯 Fixed' : '⚡ Auto'}
          </button>
        )}

        {/* Compact Mode Toggle */}
        <button
          type="button"
          className={`cyber-btn-ghost mini-btn ${effectiveCompact ? 'active-amber' : ''}`}
          onClick={handleToggleCompact}
          title={effectiveCompact ? "Switch to standard card layout" : "Switch to compact card layout"}
        >
          <LayoutList size={11} />
          <span>Compact</span>
        </button>

        {/* Name Icons Toggle */}
        <button
          type="button"
          className={`cyber-btn-ghost mini-btn ${effectiveShowNameIcons ? 'active-amber' : ''}`}
          onClick={handleToggleShowNameIcons}
          title={effectiveShowNameIcons
            ? "Name icons are ON (shown in name bar). Click to hide."
            : "Name icons are OFF (shown only in left icon box). Click to show."
          }
        >
          <Tag size={11} />
          <span>Name Icons</span>
        </button>

        {/* Auto Scroll Toggle */}
        <button
          type="button"
          className={`cyber-btn-ghost mini-btn ${isAutoScroll ? 'active-amber' : ''}`}
          onClick={handleToggleAutoScroll}
          title={isAutoScroll ? "Pause entrant auto-scrolling" : "Enable continuous auto-scrolling across all entrants"}
        >
          <Repeat size={11} className={isAutoScroll ? 'spin-slow' : ''} />
          <span>Auto</span>
        </button>
      </div>

      {/* Staged Podium Dock: Displays while marking victors (Admin Only) */}
      {isAdmin && stagedPodiumIds.length > 0 && (
        <div className="podium-staging-dock">
          <div className="staging-dock-header">
            <div className="staging-dock-title">
              <Trophy size={13} color="#f59e0b" />
              <span>Podium Selection ({stagedPodiumIds.length}/{expectedWinners})</span>
            </div>
            <div className="staging-dock-actions">
              <button
                type="button"
                className="staging-clear-btn"
                onClick={handleClearStagedPodium}
                title="Clear all staged picks"
              >
                Clear
              </button>
              <button
                type="button"
                className={`staging-commit-btn ${stagedPodiumIds.length === expectedWinners ? 'is-ready' : ''}`}
                onClick={handleCommitPodium}
                title="Commit winners and calculate points distribution"
              >
                <Trophy size={11} />
                <span>Commit Win 🏆</span>
              </button>
            </div>
          </div>

          <div className="staging-chips-strip">
            {stagedPodiumIds.map((id, idx) => {
              const outcome = contest.outcomes.find(o => o.id === id);
              const place = idx + 1;
              const color = getPodiumColor(place, Math.max(expectedWinners, stagedPodiumIds.length));

              return (
                <div
                  key={id}
                  className="staging-entrant-chip"
                  style={{
                    background: `linear-gradient(135deg, ${color.lightHex} 0%, ${color.hex} 50%, ${color.darkHex} 100%)`,
                    color: color.textContrast,
                    borderColor: color.darkHex,
                  }}
                  onClick={() => {
                    setStagedPodiumIds(prev => prev.filter(pId => pId !== id));
                    soundEffects.playTokenClink();
                  }}
                  title={`Click to remove #${outcome?.number} ${outcome?.name} from #${place} place`}
                >
                  <span className="staging-chip-num-badge">#{place}</span>
                  <span className="staging-chip-num">#{outcome?.number}</span>
                  <span className="staging-chip-name">{outcome?.name}</span>
                  <X size={11} className="staging-chip-x" />
                </div>
              );
            })}

            {stagedPodiumIds.length < expectedWinners && (
              <div className="staging-pick-hint">
                Pick #{stagedPodiumIds.length + 1} place...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Vertical Scrolling List of Compact Styled Entrants */}
      <div
        ref={listScrollRef}
        className="entrants-vertical-list"
        key={cascadeKey || 'default'}
      >
        {sortedOutcomes.length === 0 ? (
          <div className="entrants-empty-state">
            <p>No {title.toLowerCase()} found matching &ldquo;{filterText}&rdquo;</p>
          </div>
        ) : (
          sortedOutcomes.map((outcome, idx) => {
            const podiumInfo = getOutcomePodiumInfo(outcome.id);
            const isRainbowHorse = Boolean(podiumInfo && contest.status === 'resolved' && rainbowActive);

            return (
              <div
                key={outcome.id}
                className={`card ${effectiveCompact ? 'is-compact' : ''} ${outcome.isLocked ? 'is-locked' : ''} ${podiumInfo ? 'is-podium-placed' : ''} ${isRainbowHorse ? 'rainbow-card-shine' : ''} ${cascadeKey ? 'filing-in' : ''}`}
                style={{
                  '--horse-accent-color': outcome.color,
                  '--podium-color': podiumInfo?.color.hex,
                  '--podium-color-light': podiumInfo?.color.lightHex,
                  '--podium-color-dark': podiumInfo?.color.darkHex,
                  animationDelay: cascadeKey ? `${idx * 35}ms` : undefined
                } as React.CSSProperties}
              >
                {/* 1. card_base & gradients */}
                <div className="card_base">
                  <div className="card_base_gradient" />
                  <div className="card_base_glass" />
                </div>

                {/* 2. accent_base_color_group with number on left and horse avatar icon on right */}
                <div className="accent_base_color_group">
                  {/* Left-edge Metallic Position Wedge (cuts into horse color to denote position) */}
                  {podiumInfo && (
                    <div
                      className="podium-edge-wedge"
                      style={{
                        '--wedge-color': podiumInfo.color.hex,
                        '--wedge-light': podiumInfo.color.lightHex,
                        '--wedge-dark': podiumInfo.color.darkHex,
                      } as React.CSSProperties}
                      title={`#${podiumInfo.place} Position Accent`}
                    >
                      <div className="metallic-sheen" />
                      <span
                        className="podium-edge-number"
                        style={{ color: podiumInfo.color.textContrast }}
                      >
                        {podiumInfo.place}
                      </span>
                    </div>
                  )}

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

                  {/* accent_number_text_container: Number on left */}
                  <div className="accent_number_text_container">
                    <span className="card_number">{outcome.number}</span>
                  </div>

                  {/* Representative Horse Icon Button (Click to edit this horse) */}
                  <button
                    type="button"
                    className="entrant_icon_box"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isAdmin) return;
                      if (onEditHorse) {
                        onEditHorse(outcome);
                      } else {
                        setEditingHorse(outcome);
                        setIsHorseEditorOpen(true);
                      }
                    }}
                    title={isAdmin ? `Click to edit #${outcome.number} ${outcome.name} (icon, color, name)` : `#${outcome.number} ${outcome.name}`}
                    style={{ cursor: isAdmin ? 'pointer' : 'default' }}
                  >
                    {renderEntrantIcon(outcome.icon)}
                  </button>
                </div>

                {effectiveCompact ? (
                  /* Compact Mode: Single Horizontal Row */
                  <div className="card_compact_row">
                    {/* name_text_container */}
                    <div className="name_text_container" title={outcome.name}>
                      {effectiveShowNameIcons && (
                        <span className="card_icon">{renderEntrantIcon(outcome.icon, true)}</span>
                      )}
                      <span className="card_name">{outcome.name}</span>
                    </div>

                    {/* pool_number_container (Percentage or Odds) */}
                    <div
                      className="pool_number_container"
                      title={`${outcome.percentage.toFixed(0)}% of total pool (${formatCompactPts(outcome.totalBet)} pts / ${outcome.bettorCount} bets) • Odds: ${outcome.odds.toFixed(2)}x`}
                    >
                      <span className="stat_value">
                        {effectiveOddsMode === 'manual'
                          ? `${(outcome.manualOdds ?? outcome.odds ?? 2.0).toFixed(1)}x`
                          : (outcome.totalBet > 0
                              ? `${outcome.percentage.toFixed(0)}%`
                              : (outcome.manualOdds ? `${outcome.manualOdds.toFixed(1)}x` : '0%')
                            )
                        }
                      </span>
                    </div>

                    {/* crown_icon_container */}
                    {(isAdmin || podiumInfo) && (
                      <button
                        type="button"
                        className={`crown_icon_container ${podiumInfo ? 'is-crowned is-podium-crowned' : ''}`}
                        style={podiumInfo ? {
                          '--podium-btn-color': podiumInfo.color.hex,
                          '--podium-btn-light': podiumInfo.color.lightHex,
                          '--podium-btn-dark': podiumInfo.color.darkHex,
                          cursor: isAdmin ? 'pointer' : 'default'
                        } as React.CSSProperties : { cursor: isAdmin ? 'pointer' : 'default' }}
                        onClick={(e) => {
                          if (!isAdmin) return;
                          handleCrownClick(outcome.id, e);
                        }}
                        title={
                          podiumInfo
                            ? `Position #${podiumInfo.place}: #${outcome.number} ${outcome.name}${isAdmin ? ' (Click to unselect)' : ''}`
                            : `Mark #${outcome.number} ${outcome.name} as Position #${stagedPodiumIds.length + 1}`
                        }
                      >
                        {podiumInfo ? (
                          <div className="crown-podium-content">
                            <div className="metallic-sheen" />
                            <Trophy size={10} className="crown-podium-trophy" style={{ color: podiumInfo.color.textContrast }} />
                            <span
                              className="crown-podium-number"
                              style={{ color: podiumInfo.color.textContrast }}
                            >
                              {podiumInfo.place}
                            </span>
                          </div>
                        ) : (
                          <Trophy size={13} />
                        )}
                      </button>
                    )}

                    {/* lock_icon_container & delete_icon_container (Admin Only) */}
                    {isAdmin && (
                      <>
                        <button
                          type="button"
                          className={`lock_icon_container ${outcome.isLocked ? 'is-locked-btn' : ''}`}
                          onClick={(e) => handleToggleLock(outcome.id, e)}
                          title={outcome.isLocked ? `Unlock #${outcome.number} ${outcome.name}` : `Lock #${outcome.number} ${outcome.name}`}
                        >
                          {outcome.isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                        </button>

                        <button
                          type="button"
                          className="delete_icon_container"
                          onClick={(e) => handleRemoveEntrant(outcome.id, e)}
                          title={`Remove #${outcome.number} ${outcome.name}`}
                        >
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  /* Standard Mode: Multi-Row Layout */
                  <>
                    {/* 3. Center: Name & Metric Capsules */}
                    <div className="card_center_area">
                      {/* name_text_container */}
                      <div className="name_text_container">
                        {effectiveShowNameIcons && (
                          <span className="card_icon">{renderEntrantIcon(outcome.icon, true)}</span>
                        )}
                        <span className="card_name" title={outcome.name}>
                          {outcome.name}
                        </span>
                      </div>

                      {/* stats_row */}
                      <div className="stats_row">
                        {/* points_number_container */}
                        <div className="points_number_container" title={`${outcome.totalBet.toLocaleString()} points bet`}>
                          <Coins size={10} />
                          <span className="stat_value">{formatCompactPts(outcome.totalBet)}</span>
                        </div>

                        {/* pool_number_container */}
                        <div className="pool_number_container" title={`${outcome.percentage.toFixed(0)}% of total pool`}>
                          <span className="stat_value">{outcome.percentage.toFixed(0)}%</span>
                        </div>

                        {/* bets_number_container */}
                        <div className="bets_number_container" title={`${outcome.bettorCount} bets placed`}>
                          <span className="stat_value">{outcome.bettorCount}b</span>
                        </div>

                        {/* odds_number_container */}
                        <div
                          className="odds_number_container"
                          title={
                            effectiveOddsMode === 'manual'
                              ? `Fixed Odds: ${(outcome.manualOdds ?? outcome.odds ?? 2.0).toFixed(2)}x`
                              : (outcome.totalBet > 0
                                  ? `${outcome.odds.toFixed(2)}x odds multiplier`
                                  : (outcome.manualOdds ? `Starting Odds: ${outcome.manualOdds.toFixed(2)}x` : 'No bets yet')
                                )
                          }
                        >
                          <span className="odds_value">
                            {effectiveOddsMode === 'manual'
                              ? `${(outcome.manualOdds ?? outcome.odds ?? 2.0).toFixed(1)}x`
                              : (outcome.totalBet > 0
                                  ? `${outcome.odds.toFixed(2)}x`
                                  : (outcome.manualOdds ? `${outcome.manualOdds.toFixed(1)}x` : '--')
                                )
                            }
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 4. crown_icon_container */}
                    {(isAdmin || podiumInfo) && (
                      <button
                        type="button"
                        className={`crown_icon_container ${podiumInfo ? 'is-crowned is-podium-crowned' : ''}`}
                        style={podiumInfo ? {
                          '--podium-btn-color': podiumInfo.color.hex,
                          '--podium-btn-light': podiumInfo.color.lightHex,
                          '--podium-btn-dark': podiumInfo.color.darkHex,
                          cursor: isAdmin ? 'pointer' : 'default'
                        } as React.CSSProperties : { cursor: isAdmin ? 'pointer' : 'default' }}
                        onClick={(e) => {
                          if (!isAdmin) return;
                          handleCrownClick(outcome.id, e);
                        }}
                        title={
                          podiumInfo
                            ? `Position #${podiumInfo.place}: #${outcome.number} ${outcome.name}${isAdmin ? ' (Click to unselect)' : ''}`
                            : `Mark #${outcome.number} ${outcome.name} as Position #${stagedPodiumIds.length + 1}`
                        }
                      >
                        {podiumInfo ? (
                          <div className="crown-podium-content">
                            <div className="metallic-sheen" />
                            <Trophy size={12} className="crown-podium-trophy" style={{ color: podiumInfo.color.textContrast }} />
                            <span
                              className="crown-podium-number"
                              style={{ color: podiumInfo.color.textContrast }}
                            >
                              {podiumInfo.place}
                            </span>
                          </div>
                        ) : (
                          <Trophy size={16} />
                        )}
                      </button>
                    )}

                    {/* 5. card_action_column (Lock & Delete - Admin Only) */}
                    {isAdmin && (
                      <div className="card_action_column">
                        <button
                          type="button"
                          className={`lock_icon_container ${outcome.isLocked ? 'is-locked-btn' : ''}`}
                          onClick={(e) => handleToggleLock(outcome.id, e)}
                          title={outcome.isLocked ? `Unlock #${outcome.number} ${outcome.name} (re-enable for race)` : `Lock #${outcome.number} ${outcome.name} (disable from race)`}
                        >
                          {outcome.isLocked ? <Lock size={11} /> : <Unlock size={11} />}
                        </button>

                        <button
                          type="button"
                          className="delete_icon_container"
                          onClick={(e) => handleRemoveEntrant(outcome.id, e)}
                          title={`Remove #${outcome.number} ${outcome.name}`}
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Individual Horse Modal (Fallback when rendered standalone) */}
      {!onOpenAddHorse && (
        <HorseEditorModal
          isOpen={isHorseEditorOpen}
          onClose={() => setIsHorseEditorOpen(false)}
          horse={editingHorse}
          nextNumber={contest.outcomes.length + 1}
          onSave={handleSaveHorse}
          onDelete={handleRemoveEntrantById}
          oddsMode={effectiveOddsMode}
          onToggleOddsMode={onToggleOddsMode}
        />
      )}
    </aside>
  );
};
