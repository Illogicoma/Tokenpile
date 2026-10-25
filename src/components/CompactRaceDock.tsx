import React, { useState, useMemo, useEffect } from 'react';
import {
  Trophy,
  Coins,
  Lock,
  Play,
  Users,
  ChevronUp,
  ChevronDown,
  Maximize2,
  Bot,
  Flame,
  BarChart2
} from 'lucide-react';
import type { Contest, HouseConfig } from '../types/betting';
import { IconDisplay } from './IconDisplay';

interface CompactRaceDockProps {
  contest: Contest;
  onSelectWinner: (outcomeId: string, customPodiumIds?: string[]) => void;
  onQuickBetOnOutcome: (outcomeId: string) => void;
  onToggleStatus: () => void;
  onExpandToFullUi: () => void;
  onOpenViewerDrawer: () => void;
  onSimulateBet: () => void;
  houseConfig?: HouseConfig;
}

const formatCompactPts = (pts: number): string => {
  if (pts >= 1000000) return `${(pts / 1000000).toFixed(1)}M`;
  if (pts >= 10000) return `${Math.round(pts / 1000)}k`;
  if (pts >= 1000) return `${(pts / 1000).toFixed(1)}k`;
  return String(pts);
};

export const CompactRaceDock: React.FC<CompactRaceDockProps> = ({
  contest,
  onSelectWinner,
  onQuickBetOnOutcome,
  onToggleStatus,
  onExpandToFullUi,
  onOpenViewerDrawer,
  onSimulateBet,
  houseConfig
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showOddsRibbon, setShowOddsRibbon] = useState(true);

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

  // Total bets placed on runners
  const runnerBetsTotal = useMemo(
    () => contest.outcomes.reduce((acc, o) => acc + o.totalBet, 0),
    [contest.outcomes]
  );

  // Find leading favorite (lowest odds with bets > 0 and unlocked)
  const outcomesWithBets = contest.outcomes.filter(o => o.totalBet > 0 && !o.isLocked);
  const favorite = outcomesWithBets.length > 0
    ? [...outcomesWithBets].sort((a, b) => a.odds - b.odds || b.totalBet - a.totalBet)[0]
    : null;

  const favSharePct = favorite && runnerBetsTotal > 0
    ? (favorite.totalBet / runnerBetsTotal) * 100
    : null;

  // Podium resolution
  const getPodiumBadge = (outcomeId: string) => {
    const podiumIdx = contest.podiumOutcomeIds
      ? contest.podiumOutcomeIds.indexOf(outcomeId)
      : (contest.winningOutcomeId === outcomeId ? 0 : -1);
    if (podiumIdx === -1) return null;
    const place = podiumIdx + 1;
    return {
      place,
      badge: place === 1 ? '🥇 1st' : place === 2 ? '🥈 2nd' : place === 3 ? '🥉 3rd' : `#${place}`,
      className: place === 1 ? 'chip-podium-1st' : place === 2 ? 'chip-podium-2nd' : place === 3 ? 'chip-podium-3rd' : ''
    };
  };

  const quickBetAmount = houseConfig?.betAmount || 200;

  // Render individual entrant card - aligned with the full mode cards and odds bar runner chips
  const renderRunnerCard = (outcome: typeof contest.outcomes[0], isGridMode = false) => {
    const isFav = favorite?.id === outcome.id;
    const isLocked = outcome.isLocked;
    const podium = getPodiumBadge(outcome.id);
    const runnerShare = runnerBetsTotal > 0 ? (outcome.totalBet / runnerBetsTotal) * 100 : 0;
    const isWinner = contest.winningOutcomeId === outcome.id || podium?.place === 1;
    const isHorseRainbow = Boolean(podium && contest.status === 'resolved' && rainbowActive);

    return (
      <div
        key={outcome.id}
        className={`dock-runner-card ${isGridMode ? 'is-grid-card' : ''} ${isFav ? 'is-favorite' : ''} ${isWinner ? 'is-winner' : ''} ${podium ? podium.className : ''} ${isHorseRainbow ? 'rainbow-card-shine' : ''} ${isLocked ? 'is-locked' : ''}`}
        style={{
          '--runner-color': outcome.color,
        } as React.CSSProperties}
      >
        {/* Card Header: Number Badge, Icon, Name, and Status Badges */}
        <div className="dock-card-header">
          <div className="dock-card-identity">
            <div
              className="chip-number-badge"
              style={{ backgroundColor: outcome.color }}
              title={`Runner #${outcome.number}`}
            >
              #{outcome.number}
            </div>

            <span className="chip-icon-thumb">
              <IconDisplay icon={outcome.icon} className="chip-icon-img" />
            </span>

            <span className="chip-horse-name" title={outcome.name}>
              {outcome.name}
            </span>
          </div>

          <div className="dock-card-badges">
            {podium && (
              <span className={`chip-podium-badge badge-place-${podium.place}`} title={`Position #${podium.place}`}>
                {podium.badge}
              </span>
            )}
            {isFav && !podium && (
              <span className="chip-fav-badge" title="Current Favorite">
                ⚡ FAV
              </span>
            )}
            {isLocked && (
              <span title="Runner Locked">
                <Lock size={10} color="#ef4444" className="chip-locked-icon" />
              </span>
            )}
          </div>
        </div>

        {/* Card Stats: Multiplier and Pool Share */}
        <div className="dock-card-stats-row">
          <div className="dock-card-odds-box" title={outcome.totalBet > 0 ? `${outcome.odds.toFixed(2)}x payout multiplier` : 'No bets yet'}>
            <span className="dock-card-odds-val">
              {outcome.totalBet > 0 ? `${outcome.odds.toFixed(2)}x` : '--'}
            </span>
            <span className="dock-card-odds-label">odds</span>
          </div>

          <div
            className="dock-card-pool-box"
            title={`${outcome.totalBet.toLocaleString()} pts • ${outcome.bettorCount || 0} bets (${runnerShare.toFixed(1)}% of runner bets)`}
          >
            <span className="dock-card-pts-val">{formatCompactPts(outcome.totalBet)} pts</span>
            <span className="dock-card-pct-val">{runnerShare.toFixed(0)}%</span>
          </div>
        </div>

        {/* Card Bottom Quick Actions: Bet & Crown */}
        <div className="dock-card-actions">
          <button
            type="button"
            className="dock-card-btn-bet"
            onClick={() => onQuickBetOnOutcome(outcome.id)}
            title={`Quick bet +${quickBetAmount.toLocaleString()} pts on #${outcome.number} ${outcome.name}`}
            disabled={contest.status !== 'open' || isLocked}
          >
            <Coins size={11} color="#f59e0b" />
            <span>+{quickBetAmount >= 1000 ? `${quickBetAmount / 1000}k` : quickBetAmount}</span>
          </button>

          <button
            type="button"
            className={`dock-card-btn-crown ${isWinner ? 'is-active-winner' : ''}`}
            onClick={() => onSelectWinner(outcome.id)}
            title={isWinner ? `Winner: #${outcome.number} ${outcome.name}` : `Crown #${outcome.number} ${outcome.name} as Winner`}
          >
            <Trophy size={11} />
            <span>{isWinner ? 'Winner' : 'Crown'}</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="compact-race-dock cosmos-panel">
      {/* Primary Dock Header Bar */}
      <div className="dock-main-row">
        {/* Left: Contest Title, State Pill, Pot tag & Favorite Pill */}
        <div className="dock-left-group">
          <button
            className={`dock-status-pill status-${contest.status}`}
            onClick={onToggleStatus}
            title={contest.status === 'open' ? 'Click to lock bets' : 'Click to reopen bets'}
          >
            {contest.status === 'open' ? <Play size={11} /> : <Lock size={11} />}
            <span>{contest.status.toUpperCase()}</span>
          </button>

          <span className="dock-title">{contest.title}</span>

          <span className="dock-pot-tag" title={`Total Prize Pool: ${contest.totalPool.toLocaleString()} pts`}>
            <Coins size={12} color="#fbbf24" />
            <strong>{contest.totalPool.toLocaleString()} pts</strong>
          </span>

          {favorite && (
            <span
              className="dock-fav-tag"
              title={`Leading Favorite: #${favorite.number} ${favorite.name} at ${favorite.odds.toFixed(2)}x odds (${(favSharePct ?? favorite.percentage).toFixed(0)}% pool)`}
            >
              <Flame size={12} color="#f59e0b" />
              <span className="dock-fav-label">Fav:</span>
              <strong className="dock-fav-name">#{favorite.number} {favorite.name}</strong>
              <span className="dock-fav-odds">{favorite.odds.toFixed(2)}x</span>
            </span>
          )}
        </div>

        {/* Right: Quick Tools */}
        <div className="dock-right-group">
          <button
            className={`dock-tool-btn ${showOddsRibbon ? 'is-active' : ''}`}
            onClick={() => setShowOddsRibbon(prev => !prev)}
            title="Toggle mini proportional odds ribbon bar"
          >
            <BarChart2 size={12} />
            <span>Odds Bar</span>
          </button>

          <button
            className="dock-tool-btn"
            onClick={onSimulateBet}
            title="Simulate quick chat bet"
          >
            <Bot size={12} /> +Bet
          </button>

          <button
            className="dock-tool-btn"
            onClick={onOpenViewerDrawer}
            title="Open Viewers Drawer"
          >
            <Users size={12} /> Viewers
          </button>

          <button
            className="dock-tool-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            title="Toggle All Entrants Grid"
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            {isExpanded ? 'Hide Grid' : `Entrants (${contest.outcomes.length})`}
          </button>

          <button
            className="dock-tool-btn-highlight"
            onClick={onExpandToFullUi}
            title="Return to Full Dashboard"
          >
            <Maximize2 size={13} /> Full Dashboard
          </button>
        </div>
      </div>

      {/* Proportional Colored Odds Ribbon Bar (Smaller Odds Bar) */}
      {showOddsRibbon && (
        <div className="compact-odds-ribbon-wrap">
          <div className="compact-odds-ribbon-bar">
            {runnerBetsTotal > 0 ? (
              contest.outcomes.map((o) => {
                if (o.totalBet <= 0) return null;
                const runnerSharePct = (o.totalBet / runnerBetsTotal) * 100;
                return (
                  <div
                    key={o.id}
                    className={`compact-ribbon-slice ${o.id === favorite?.id ? 'is-slice-fav' : ''}`}
                    style={{
                      width: `${runnerSharePct}%`,
                      backgroundColor: o.color,
                    }}
                    title={`#${o.number} ${o.name}: ${runnerSharePct.toFixed(1)}% (${o.totalBet.toLocaleString()} pts) | ${o.odds.toFixed(2)}x payout • Click to bet`}
                    onClick={() => onQuickBetOnOutcome(o.id)}
                  >
                    {runnerSharePct >= 5 && (
                      <span className="slice-number">#{o.number}</span>
                    )}
                    {runnerSharePct >= 12 && (
                      <span className="slice-pct">{runnerSharePct.toFixed(0)}%</span>
                    )}
                  </div>
                );
              })
            ) : (
              /* When total horse bets is 0, render equal translucent slices */
              contest.outcomes.map((o) => (
                <div
                  key={o.id}
                  className="compact-ribbon-slice slice-unfunded"
                  style={{
                    width: `${100 / (contest.outcomes.length || 1)}%`,
                    backgroundColor: o.color,
                  }}
                  title={`#${o.number} ${o.name}: 0 pts (Even Starting Distribution)`}
                  onClick={() => onQuickBetOnOutcome(o.id)}
                >
                  {contest.outcomes.length <= 12 && (
                    <span className="slice-number slice-number-dim">#{o.number}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Horizontal Entrant Cards Strip (Aligned with Full Mode / Odds Bar) */}
      <div className="dock-entrants-horizontal-strip">
        {contest.outcomes.map((outcome) => renderRunnerCard(outcome, false))}
      </div>

      {/* Expanded Grid (when user clicks 'Entrants') */}
      {isExpanded && (
        <div className="dock-expanded-grid">
          {contest.outcomes.map((outcome) => renderRunnerCard(outcome, true))}
        </div>
      )}
    </div>
  );
};
