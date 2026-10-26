import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Lock,
  Sparkles,
  Flame,
  Coins,
  Repeat,
  Grid,
  Columns,
  Gift,
  Building2,
  Eye,
  EyeOff
} from 'lucide-react';
import type { Contest, HouseConfig } from '../types/betting';
import { IconDisplay } from './IconDisplay';
import { useAutoScroll } from '../hooks/useAutoScroll';

interface ContestOddsBarProps {
  contest: Contest;
  filterText: string;
  onFilterTextChange: (text: string) => void;
  shineActive?: boolean;
  onSelectOutcome?: (outcomeId: string) => void;
  onUpdateTitle?: (title: string) => void;
  entrantsLabel?: string;
  icon?: string;
  onOpenIconEditor?: () => void;
  houseConfig?: HouseConfig;
  onAddDirectPot?: (amount: number) => void;
  onUpdateHouseConfig?: (config: HouseConfig) => void;
}

export const ContestOddsBar: React.FC<ContestOddsBarProps> = ({
  contest,
  filterText,
  onFilterTextChange,
  shineActive = false,
  onSelectOutcome,
  onUpdateTitle,
  entrantsLabel = 'Entrants',
  icon = '🏆',
  onOpenIconEditor,
  houseConfig,
  onAddDirectPot,
  onUpdateHouseConfig
}) => {
  // Persistent layout and size states
  const [isWrapped, setIsWrapped] = useState<boolean>(() => {
    try {
      return localStorage.getItem('TokenPile_odds_bar_wrapped') === 'true';
    } catch {
      return false;
    }
  });

  const [customHeight, setCustomHeight] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem('TokenPile_odds_bar_height');
      return saved ? parseInt(saved, 10) : null;
    } catch {
      return null;
    }
  });

  const [isAutoScroll, setIsAutoScroll] = useState<boolean>(() => {
    try {
      return localStorage.getItem('TokenPile_odds_auto_scroll') === 'true';
    } catch {
      return false;
    }
  });

  const [isDraggingHandle, setIsDraggingHandle] = useState(false);
  const [isSeedPopoverOpen, setIsSeedPopoverOpen] = useState(false);
  const [isHousePopoverOpen, setIsHousePopoverOpen] = useState(false);
  const [customSeedInput, setCustomSeedInput] = useState<number>(5000);
  const startDragYRef = useRef(0);
  const startHeightRef = useRef(0);

  // Close popovers on click outside
  useEffect(() => {
    if (!isSeedPopoverOpen && !isHousePopoverOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.odds-popover-anchor')) {
        setIsSeedPopoverOpen(false);
        setIsHousePopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSeedPopoverOpen, isHousePopoverOpen]);

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

  // Hook up continuous auto-scroll (horizontal strip or vertical grid)
  const { containerRef: runnersScrollRef } = useAutoScroll<HTMLDivElement>({
    enabled: isAutoScroll,
    direction: isWrapped ? 'vertical' : 'horizontal',
    speed: isWrapped ? 0.4 : 0.75,
    pauseOnHover: true,
    edgePauseMs: 1400,
  });

  // Total bets placed on runners (excluding initial seed pot / prize pool)
  const runnerBetsTotal = useMemo(
    () => contest.outcomes.reduce((acc, o) => acc + o.totalBet, 0),
    [contest.outcomes]
  );

  // Racer counts (unlocked/active vs total racers)
  const totalRacers = contest.outcomes.length;
  const unlockedRacers = useMemo(
    () => contest.outcomes.filter(o => !o.isLocked).length,
    [contest.outcomes]
  );

  // Find leading favorite (lowest odds with bets > 0)
  const outcomesWithBets = contest.outcomes.filter(o => o.totalBet > 0 && !o.isLocked);
  const favorite = outcomesWithBets.length > 0
    ? [...outcomesWithBets].sort((a, b) => a.odds - b.odds || b.totalBet - a.totalBet)[0]
    : null;

  const favSharePct = useMemo(() => {
    if (!favorite || runnerBetsTotal <= 0) return null;
    return (favorite.totalBet / runnerBetsTotal) * 100;
  }, [favorite, runnerBetsTotal]);

  const totalPoolFormatted = contest.totalPool.toLocaleString();

  // Filtered outcomes according to search filter
  const filteredOutcomes = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    if (!q) return contest.outcomes;
    return contest.outcomes.filter(o =>
      o.name.toLowerCase().includes(q) ||
      String(o.number) === q
    );
  }, [contest.outcomes, filterText]);

  // Drag-down resizer logic
  const handleStartResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingHandle(true);
    startDragYRef.current = e.clientY;
    startHeightRef.current = customHeight || (runnersScrollRef.current?.clientHeight || 48);

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startDragYRef.current;
      const nextHeight = Math.max(42, Math.min(480, startHeightRef.current + deltaY));
      setCustomHeight(nextHeight);
      if (nextHeight > 62) {
        setIsWrapped(true);
      } else {
        setIsWrapped(false);
      }
    };

    const onMouseUp = (upEvent: MouseEvent) => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      setIsDraggingHandle(false);

      const deltaY = upEvent.clientY - startDragYRef.current;
      const finalHeight = Math.max(42, Math.min(480, startHeightRef.current + deltaY));
      if (finalHeight > 62) {
        setIsWrapped(true);
        setCustomHeight(finalHeight);
        try {
          localStorage.setItem('TokenPile_odds_bar_height', String(finalHeight));
          localStorage.setItem('TokenPile_odds_bar_wrapped', 'true');
        } catch { }
      } else {
        setIsWrapped(false);
        setCustomHeight(null);
        try {
          localStorage.removeItem('TokenPile_odds_bar_height');
          localStorage.setItem('TokenPile_odds_bar_wrapped', 'false');
        } catch { }
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleDoubleClickHandle = () => {
    if (isWrapped) {
      setIsWrapped(false);
      setCustomHeight(null);
      try {
        localStorage.removeItem('TokenPile_odds_bar_height');
        localStorage.setItem('TokenPile_odds_bar_wrapped', 'false');
      } catch { }
    } else {
      setIsWrapped(true);
      setCustomHeight(160);
      try {
        localStorage.setItem('TokenPile_odds_bar_height', '160');
        localStorage.setItem('TokenPile_odds_bar_wrapped', 'true');
      } catch { }
    }
  };

  const handleToggleWrap = () => {
    const next = !isWrapped;
    setIsWrapped(next);
    if (!next) {
      setCustomHeight(null);
      try {
        localStorage.removeItem('TokenPile_odds_bar_height');
        localStorage.setItem('TokenPile_odds_bar_wrapped', 'false');
      } catch { }
    } else {
      const targetH = customHeight || 160;
      setCustomHeight(targetH);
      try {
        localStorage.setItem('TokenPile_odds_bar_height', String(targetH));
        localStorage.setItem('TokenPile_odds_bar_wrapped', 'true');
      } catch { }
    }
  };

  const [isCardsHidden, setIsCardsHidden] = useState<boolean>(() => {
    try {
      return localStorage.getItem('TokenPile_odds_hide_cards') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleHideCards = () => {
    setIsCardsHidden(prev => {
      const next = !prev;
      try {
        localStorage.setItem('TokenPile_odds_hide_cards', String(next));
      } catch { }
      return next;
    });
  };

  const handleToggleAutoScroll = () => {
    const next = !isAutoScroll;
    setIsAutoScroll(next);
    try {
      localStorage.setItem('TokenPile_odds_auto_scroll', String(next));
    } catch { }
  };

  return (
    <div className={`contest-odds-bar cosmos-panel ${isCardsHidden ? 'is-cards-hidden' : ''} ${shineActive ? 'has-shine-sweep' : ''}`}>
      {/* Top Header / Meta Container */}
      <div className="odds-header-container">
        {/* Row 1: Expanded Race Title Bar + Search */}
        <div className="odds-top-title-row">
          <div className="odds-title-input-group">
            <button
              type="button"
              className="cyber-nav-btn btn-icon-only odds-icon-btn"
              onClick={onOpenIconEditor}
              title="Click to customize race icon & 3D token"
            >
              <span className="panel-icon-emoji">
                <IconDisplay icon={icon} fallback="🏆" />
              </span>
            </button>
            <input
              type="text"
              className="odds-editable-title-input"
              value={contest.title}
              onChange={(e) => onUpdateTitle?.(e.target.value)}
              placeholder="Race Title (e.g. Grand Prix Derby)..."
              title="Click to rename race title"
            />
          </div>

          {/* Compact Search & Entrant Counter */}
          <div className="odds-filter-wrapper">
            <Search size={13} className="odds-search-icon" />
            <input
              type="text"
              className="odds-search-input"
              placeholder={`Filter ${contest.outcomes.length} ${entrantsLabel.toLowerCase()}...`}
              value={filterText}
              onChange={(e) => onFilterTextChange(e.target.value)}
            />
            {filterText && (
              <button
                type="button"
                className="odds-filter-clear-btn"
                onClick={() => onFilterTextChange('')}
                title="Clear search"
              >
                &times;
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Pot Readout next to Favourite Bar & Toolbar Buttons */}
        <div className="odds-meta-subrow">
          <div className="odds-meta-left-group">
            {/* 1. Number of Racers Badge (x/y active/total racers with contest icon) */}
            <span
              className="odds-runners-count-badge"
              title={`${unlockedRacers} of ${totalRacers} racers active/unlocked${unlockedRacers < totalRacers ? ` (${totalRacers - unlockedRacers} locked)` : ''}`}
            >
              <span className="odds-runners-count-icon">
                <IconDisplay icon={icon} fallback="🏆" />
              </span>
              <span>{unlockedRacers}/{totalRacers}</span>
            </span>

            {/* 2. Total Pot Readout */}
            <div
              className="odds-pot-capsule"
              onClick={() => {
                setIsSeedPopoverOpen(prev => !prev);
                setIsHousePopoverOpen(false);
              }}
              title="Click to add points directly to the overall pot (Prize Pool)"
            >
              <Coins size={12} color="#38bdf8" />
              <span className="pot-capsule-label">Total Pot:</span>
              <strong className="pot-capsule-val">{totalPoolFormatted} pts</strong>
              {contest.initialPrizePool && contest.initialPrizePool > 0 ? (
                <span className="pot-seeded-tag" title={`Includes ${contest.initialPrizePool.toLocaleString()} pts seeded prize pool`}>
                  🎁 +{contest.initialPrizePool.toLocaleString()}
                </span>
              ) : null}
            </div>

            {/* 3. Seed Pot Action Button & Popover */}
            <div className="odds-popover-anchor">
              <button
                type="button"
                className={`odds-seed-pot-btn ${isSeedPopoverOpen ? 'is-active' : ''}`}
                onClick={() => {
                  setIsSeedPopoverOpen(prev => !prev);
                  setIsHousePopoverOpen(false);
                }}
                title="Add prize pool points directly to the overall pot"
              >
                <Gift size={12} />
                <span>+ Seed Pot</span>
              </button>

              {/* Popover to inject prize pool points */}
              {isSeedPopoverOpen && (
                <div className="odds-seed-popover">
                  <div className="seed-popover-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Gift size={13} color="#f59e0b" />
                      <strong style={{ fontSize: '0.78rem', color: '#92400e' }}>Add to Prize Pool</strong>
                    </div>
                    <button
                      type="button"
                      className="seed-popover-close"
                      onClick={() => setIsSeedPopoverOpen(false)}
                      title="Close"
                    >
                      &times;
                    </button>
                  </div>
                  <div className="seed-popover-desc">
                    Directly adds points to the overall pot ahead of time, boosting odds and payouts for winning viewers.
                  </div>
                  <div className="seed-popover-chips">
                    {[500, 1000, 5000, 10000, 50000].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        className="seed-chip-btn"
                        onClick={() => {
                          onAddDirectPot?.(amt);
                          setIsSeedPopoverOpen(false);
                        }}
                      >
                        +{amt >= 1000 ? `${amt / 1000}k` : amt}
                      </button>
                    ))}
                  </div>
                  <div className="seed-popover-custom-row">
                    <input
                      type="number"
                      min={100}
                      step={500}
                      className="seed-custom-input"
                      value={customSeedInput}
                      onChange={(e) => setCustomSeedInput(Number(e.target.value))}
                      placeholder="Amount..."
                    />
                    <button
                      type="button"
                      className="seed-custom-submit"
                      onClick={() => {
                        if (customSeedInput > 0) {
                          onAddDirectPot?.(customSeedInput);
                          setIsSeedPopoverOpen(false);
                        }
                      }}
                      disabled={customSeedInput <= 0}
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 4. House Settings Action Button & Top Popover */}
            <div className="odds-popover-anchor">
              <button
                type="button"
                className={`odds-house-btn ${isHousePopoverOpen ? 'is-active' : ''}`}
                onClick={() => {
                  setIsHousePopoverOpen(prev => !prev);
                  setIsSeedPopoverOpen(false);
                }}
                title="House Settings: Click to customize house name, emoji, or bet amount"
              >
                <span className="house-btn-emoji">{houseConfig?.emoji || '🏛️'}</span>
                <span className="house-btn-name">{houseConfig?.name || 'The House'}:</span>
                <span className="house-btn-amount">+{houseConfig?.betAmount || 500}</span>
              </button>

              {/* Popover to configure House settings */}
              {isHousePopoverOpen && (
                <div className="odds-house-popover">
                  <div className="seed-popover-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Building2 size={13} color="#d97706" />
                      <strong style={{ fontSize: '0.78rem', color: '#92400e' }}>House Bet Settings</strong>
                    </div>
                    <button
                      type="button"
                      className="seed-popover-close"
                      onClick={() => setIsHousePopoverOpen(false)}
                      title="Close"
                    >
                      &times;
                    </button>
                  </div>
                  <div className="seed-popover-desc">
                    Bets placed on horses when clicking chips in the odds bar as streamer / GM.
                  </div>

                  <div className="house-popover-row">
                    <div className="house-popover-field" style={{ width: '48px' }}>
                      <label className="house-popover-label">Icon</label>
                      <input
                        type="text"
                        className="house-popover-input text-center"
                        value={houseConfig?.emoji || '🏛️'}
                        onChange={(e) => onUpdateHouseConfig?.({
                          name: houseConfig?.name || 'The House',
                          betAmount: houseConfig?.betAmount || 500,
                          emoji: e.target.value,
                          defaultPrizePool: houseConfig?.defaultPrizePool
                        })}
                        maxLength={4}
                      />
                    </div>
                    <div className="house-popover-field" style={{ flex: 1 }}>
                      <label className="house-popover-label">House / GM Name</label>
                      <input
                        type="text"
                        className="house-popover-input"
                        value={houseConfig?.name || 'The House'}
                        onChange={(e) => onUpdateHouseConfig?.({
                          name: e.target.value,
                          betAmount: houseConfig?.betAmount || 500,
                          emoji: houseConfig?.emoji || '🏛️',
                          defaultPrizePool: houseConfig?.defaultPrizePool
                        })}
                        placeholder="The House"
                      />
                    </div>
                  </div>

                  <div className="house-popover-field">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="house-popover-label">Quick Bet Amount (pts)</label>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#92400e' }}>
                        +{houseConfig?.betAmount || 500} pts
                      </span>
                    </div>
                    <div className="seed-popover-chips">
                      {[100, 200, 500, 1000, 5000].map(amt => (
                        <button
                          key={amt}
                          type="button"
                          className={`seed-chip-btn ${houseConfig?.betAmount === amt ? 'is-active' : ''}`}
                          onClick={() => onUpdateHouseConfig?.({
                            name: houseConfig?.name || 'The House',
                            betAmount: amt,
                            emoji: houseConfig?.emoji || '🏛️',
                            defaultPrizePool: houseConfig?.defaultPrizePool
                          })}
                        >
                          {amt >= 1000 ? `${amt / 1000}k` : amt}
                        </button>
                      ))}
                    </div>
                    <div className="seed-popover-custom-row" style={{ marginTop: '4px' }}>
                      <input
                        type="number"
                        min={10}
                        step={50}
                        className="seed-custom-input"
                        value={houseConfig?.betAmount || 500}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (val > 0) {
                            onUpdateHouseConfig?.({
                              name: houseConfig?.name || 'The House',
                              betAmount: val,
                              emoji: houseConfig?.emoji || '🏛️',
                              defaultPrizePool: houseConfig?.defaultPrizePool
                            });
                          }
                        }}
                        placeholder="Custom amount..."
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <span className="odds-meta-separator">•</span>

            {/* Favorite Indicator */}
            {favorite ? (
              <div className="odds-fav-indicator">
                <Flame size={12} color="#f59e0b" />
                <span className="fav-label">Favorite:</span>
                <strong className="fav-name">#{favorite.number} {favorite.name}</strong>
                <span className="fav-odds-pill">{favorite.odds.toFixed(2)}x</span>
                <span className="fav-pct-pill">
                  {favSharePct !== null ? `${favSharePct.toFixed(0)}%` : `${favorite.percentage.toFixed(0)}%`}
                </span>
              </div>
            ) : (
              <div className="odds-awaiting-bets">
                <Sparkles size={11} color="#94a3b8" />
                <span>Even starting odds &bull; Place bets to shift pool distribution</span>
              </div>
            )}
          </div>

          <div className="odds-meta-right-group">
            {/* Auto-Scroll Toggle Button */}
            {!isCardsHidden && (
              <button
                type="button"
                className={`odds-toolbar-btn ${isAutoScroll ? 'is-active' : ''}`}
                onClick={handleToggleAutoScroll}
                title={isAutoScroll ? "Pause horse auto-scrolling" : "Enable continuous auto-scrolling across horses"}
              >
                <Repeat size={12} className={isAutoScroll ? 'spin-slow' : ''} />
              </button>
            )}

            {/* Hide/Show Horse Cards Toggle Button */}
            <button
              type="button"
              className={`odds-toolbar-btn ${isCardsHidden ? 'is-active' : ''}`}
              onClick={handleToggleHideCards}
              title={isCardsHidden ? "Show entrant cards in odds bar" : "Hide entrant cards (Super-compact odds ribbon)"}
            >
              {isCardsHidden ? <EyeOff size={12} /> : <Eye size={12} />}
              <span>{isCardsHidden ? 'Show Cards' : 'Hide Cards'}</span>
            </button>

            {/* Grid / Strip Toggle Button */}
            {!isCardsHidden && (
              <button
                type="button"
                className={`odds-toolbar-btn ${isWrapped ? 'is-active' : ''}`}
                onClick={handleToggleWrap}
                title={isWrapped ? "Switch to single horizontal strip" : "Wrap horses into a multi-row grid"}
              >
                {isWrapped ? <Columns size={12} /> : <Grid size={12} />}
                <span>{isWrapped ? 'Grid' : 'Strip'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Proportional Colored Odds Ribbon Bar */}
      <div className="odds-ribbon-bar-container">
        <div className="odds-ribbon-bar">
          {runnerBetsTotal > 0 ? (
            contest.outcomes.map((o) => {
              if (o.totalBet <= 0) return null;
              const runnerSharePct = (o.totalBet / runnerBetsTotal) * 100;
              const houseBetTip = ` • Click to place House Bet (+${houseConfig?.betAmount || 500} pts as ${houseConfig?.name || 'The House'})`;
              return (
                <div
                  key={o.id}
                  className={`odds-ribbon-slice ${o.id === favorite?.id ? 'is-slice-favorite' : ''}`}
                  style={{
                    width: `${runnerSharePct}%`,
                    backgroundColor: o.color,
                  }}
                  title={`#${o.number} ${o.name}: ${runnerSharePct.toFixed(1)}% (${o.totalBet.toLocaleString()} pts) | ${o.odds.toFixed(2)}x payout${houseBetTip}`}
                  onClick={() => onSelectOutcome && onSelectOutcome(o.id)}
                >
                  {runnerSharePct >= 4 && (
                    <span className="slice-number">#{o.number}</span>
                  )}
                  {runnerSharePct >= 11 && (
                    <span className="slice-pct">{runnerSharePct.toFixed(0)}%</span>
                  )}
                </div>
              );
            })
          ) : (
            /* When total horse bets is 0, render equal translucent slices for each entrant */
            contest.outcomes.map((o) => (
              <div
                key={o.id}
                className="odds-ribbon-slice slice-unfunded"
                style={{
                  width: `${100 / (contest.outcomes.length || 1)}%`,
                  backgroundColor: o.color,
                }}
                title={`#${o.number} ${o.name}: 0 pts (Even Starting Distribution)`}
              >
                {contest.outcomes.length <= 12 && (
                  <span className="slice-number slice-number-dim">#{o.number}</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Runner Odds Chips Container - Strip Mode or Wrapped Grid Mode */}
      {!isCardsHidden && (
        <>
          <div
            className="odds-runners-container"
            style={{
              maxHeight: isWrapped && customHeight ? `${customHeight}px` : undefined,
            }}
          >
            <div
              ref={runnersScrollRef}
              className={isWrapped ? "odds-runners-grid-wrap" : "odds-runners-strip"}
              style={{
                maxHeight: isWrapped && customHeight ? `${customHeight}px` : undefined,
              }}
            >
              {filteredOutcomes.map((o) => {
                const isFav = favorite?.id === o.id;
                const isLocked = o.isLocked;

                const podiumIdx = contest.podiumOutcomeIds
                  ? contest.podiumOutcomeIds.indexOf(o.id)
                  : (contest.winningOutcomeId === o.id ? 0 : -1);
                const isPodiumWin = podiumIdx !== -1;
                const podiumPlace = isPodiumWin ? (podiumIdx + 1) : null;
                const podiumBadge = podiumPlace === 1 ? '🥇 1st' : podiumPlace === 2 ? '🥈 2nd' : podiumPlace === 3 ? '🥉 3rd' : null;
                const podiumClass = podiumPlace === 1 ? 'chip-podium-1st' : podiumPlace === 2 ? 'chip-podium-2nd' : podiumPlace === 3 ? 'chip-podium-3rd' : '';

                const runnerShare = runnerBetsTotal > 0 ? (o.totalBet / runnerBetsTotal) * 100 : 0;
                const isHorseRainbow = Boolean(isPodiumWin && contest.status === 'resolved' && rainbowActive);

                return (
                  <div
                    key={o.id}
                    className={`odds-runner-chip ${isFav ? 'chip-favorite' : ''} ${isLocked ? 'chip-locked' : ''} ${podiumClass} ${isHorseRainbow ? 'rainbow-card-shine' : ''} ${isWrapped ? 'is-grid-cell' : ''}`}
                    onClick={() => onSelectOutcome && onSelectOutcome(o.id)}
                    title={`#${o.number} ${o.name} - Odds: ${o.odds.toFixed(2)}x - Bets: ${runnerBetsTotal > 0 ? runnerShare.toFixed(1) : '0'}% (${o.totalBet.toLocaleString()} pts)${podiumBadge ? ` [${podiumBadge}]` : ''} • Click to place House Bet (+${houseConfig?.betAmount || 500} pts as ${houseConfig?.name || 'The House'})`}
                  >
                    {/* Entrant Info (Number, Icon, Full Name) */}
                    <div className="chip-entrant-info">
                      <div
                        className="chip-number-badge"
                        style={{ backgroundColor: o.color }}
                      >
                        #{o.number}
                      </div>

                      <span className="chip-icon-thumb">
                        <IconDisplay icon={o.icon} className="chip-icon-img" />
                      </span>

                      <span className="chip-horse-name" title={o.name}>{o.name}</span>
                    </div>

                    {/* Odds & Status Info (Multiplier, Pool %, Badges) */}
                    <div className="chip-odds-info">
                      {podiumBadge && (
                        <span className={`chip-podium-badge badge-place-${podiumPlace}`} title={`${podiumBadge} Place`}>
                          {podiumBadge}
                        </span>
                      )}

                      <span className="chip-odds-multiplier">
                        {o.odds.toFixed(2)}x
                      </span>

                      {runnerBetsTotal > 0 && o.totalBet > 0 && (
                        <span className="chip-pool-percentage">
                          {runnerShare.toFixed(0)}%
                        </span>
                      )}

                      {isLocked && (
                        <Lock size={10} className="chip-locked-icon" color="#ef4444" />
                      )}

                      {isFav && !isPodiumWin && (
                        <span className="chip-fav-badge" title="Current Favorite">
                          ⚡ FAV
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Drag Resizer Handle */}
          <div
            className={`odds-bar-resize-handle ${isDraggingHandle ? 'is-dragging' : ''}`}
            onMouseDown={handleStartResize}
            onDoubleClick={handleDoubleClickHandle}
            title="Drag down to expand odds window & wrap horses into grid (double-click to toggle)"
          >
            <div className="odds-resize-grip-line" />
          </div>
        </>
      )}
    </div>
  );
};
